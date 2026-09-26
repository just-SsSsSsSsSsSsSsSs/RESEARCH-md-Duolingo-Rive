/**
 * sound.js - procedural Foley for the owl (K8.2, ADR-001 / K8 directive).
 *
 * Zero audio assets. Every cue is synthesised from the character's Sound DNA
 * (spec.sound) with Web Audio primitives: OscillatorNode, a shared noise buffer,
 * BiquadFilterNode, GainNode envelopes. Prior art acknowledged: procedural SFX is
 * standard in games (sfxr lineage, ZzFX). What is specific here: the cue table
 * lives in the same Character Spec as the motion, is validated by validateSpec,
 * and is driven by the state machine cues - a new character ships numbers, not files.
 *
 * Autoplay policy (Chrome 71+, Safari, Firefox): the AudioContext is created or
 * resumed ONLY inside a synchronous user-gesture handler (`unlock()` from
 * pointerdown/keydown). Nothing here bypasses the policy. On iOS the mute switch
 * silences Web Audio but not <audio>; the documented kick (short silent <audio>
 * play on the same gesture) is applied.
 *
 * Budget rules: no per-frame JS; scheduling on the audio clock with a small
 * lookahead; polyphony cap; same-cue gap; priority steal; duck under speech;
 * slow-motion aware via the engine clock rate (cues stretch, or mute below 0.5x);
 * any failure -> visuals continue, `bus.status` explains.
 */
import { clock } from './physics.js';

const dbToGain = (db) => Math.pow(10, db / 20);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const randIn = ([a, b]) => a + Math.random() * (b - a);

let sharedNoise = null;   // { white, pink, brown } AudioBuffers, created once per context
function noiseBuffers(ctx) {
  if (sharedNoise && sharedNoise.ctx === ctx) return sharedNoise;
  const sr = ctx.sampleRate, n = sr * 2;
  const mk = () => ctx.createBuffer(1, n, sr);
  const white = mk(), pink = mk(), brown = mk();
  const w = white.getChannelData(0), p = pink.getChannelData(0), b = brown.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < n; i++) {
    const x = Math.random() * 2 - 1;
    w[i] = x;
    // Paul Kellet's economy pink filter
    b0 = 0.99765 * b0 + x * 0.0990460; b1 = 0.96300 * b1 + x * 0.2965164; b2 = 0.57000 * b2 + x * 1.0526913;
    p[i] = (b0 + b1 + b2 + x * 0.1848) * 0.25;
    last = (last + 0.02 * x) / 1.02; b[i] = last * 3.5;
  }
  sharedNoise = { ctx, white, pink, brown };
  return sharedNoise;
}

export class SoundBus {
  /** @param {object} sound spec.sound (Sound DNA) */
  constructor(sound) {
    this.spec = sound;
    this.ctx = null;
    this.master = null; this.duckGain = null; this.comp = null;
    this.muted = false;
    this.status = 'locked';            // locked | running | suspended | unsupported | failed
    this.active = [];                  // { end, priority, cue, nodes }
    this.lastCueAt = {};               // cue -> ctx time
    this.log = [];                     // sync telemetry: { cue, tVisual, tAudio, offsetMs }
    this.stats = { played: 0, dropped: 0, stolen: 0, muted: 0 };
    this._kick = null;
  }

  /** Call from a synchronous gesture handler (pointerdown / keydown). Idempotent. */
  unlock() {
    try {
      if (!('AudioContext' in window)) { this.status = 'unsupported'; return false; }
      if (!this.ctx) {
        this.ctx = new AudioContext({ latencyHint: 'interactive' });
        this.comp = this.ctx.createDynamicsCompressor();
        this.comp.threshold.value = -12; this.comp.knee.value = 12; this.comp.ratio.value = 4; this.comp.attack.value = 0.003; this.comp.release.value = 0.12;
        this.duckGain = this.ctx.createGain();
        this.master = this.ctx.createGain(); this.master.gain.value = this.spec.master;
        this.duckGain.connect(this.master); this.master.connect(this.comp); this.comp.connect(this.ctx.destination);
        this.ctx.onstatechange = () => { this.status = this.ctx.state; };
        noiseBuffers(this.ctx);
        // iOS mute-switch kick: a silent <audio> element started on the same gesture
        try {
          const a = document.createElement('audio'); a.setAttribute('playsinline', ''); a.muted = false; a.volume = 0.01;
          a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
          a.play().catch(() => {}); this._kick = a;
        } catch (e) { /* optional */ }
      }
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
      this.status = this.ctx.state === 'running' ? 'running' : (this.ctx.state || 'suspended');
      return true;
    } catch (e) { this.status = 'failed'; return false; }
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running' && !this.muted; }
  setMuted(m) { this.muted = !!m; if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.spec.master, this.ctx.currentTime, 0.02); }

  /** Duck everything under speech: -duckDb over 60 ms; release over 250 ms. */
  duck(on) {
    if (!this.duckGain) return;
    const t = this.ctx.currentTime;
    this.duckGain.gain.cancelScheduledValues(t);
    this.duckGain.gain.setTargetAtTime(on ? dbToGain(this.spec.duckDb) : 1, t, on ? 0.02 : 0.08);
  }

  /**
   * Play a named cue. `opts.tVisual` (performance.now() ms of the visual onset) is used
   * for sync telemetry; `opts.vy` (px/ms, negative = up) shapes pitched cues.
   * Returns the scheduled audio start (ctx seconds) or null when dropped.
   */
  play(name, opts = {}) {
    const c = this.spec.cues[name];
    if (!c || !this.ctx) return null;
    if (this.muted || this.ctx.state !== 'running') { this.stats.muted++; return null; }
    const rate = clock.rate;
    if (rate < 0.5 && !opts.ignoreSlow) { this.stats.muted++; return null; }   // slow-motion: Foley would read as detached
    const now = this.ctx.currentTime;
    const gap = (this.spec.sameCueGapMs || 120) / 1000;
    if (this.lastCueAt[name] !== undefined && now - this.lastCueAt[name] < gap) { this.stats.dropped++; return null; }
    this.active = this.active.filter((v) => v.end > now);
    if (this.active.length >= (this.spec.polyphony || 3)) {
      const weakest = this.active.reduce((m, v) => (v.priority < m.priority ? v : m), this.active[0]);
      if (weakest.priority < (c.priority || 0)) { this._stop(weakest); this.stats.stolen++; }
      else { this.stats.dropped++; return null; }
    }
    const t0 = now + 0.005;                        // 5 ms lookahead: scheduled on the audio clock, not on a timer
    const stretch = 1 / rate;                      // slow-motion between 0.5x and 1x stretches the envelope
    const count = c.count || 1, gapS = (c.gapMs || 0) / 1000 * stretch;
    let end = t0;
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const t = t0 + i * gapS;
      const e = this._voice(c, t, stretch, opts, nodes);
      end = Math.max(end, e);
    }
    const v = { end, priority: c.priority || 0, cue: name, nodes };
    this.active.push(v); this.lastCueAt[name] = now; this.stats.played++;
    if (opts.tVisual !== undefined) {
      // one-clock comparison: map the scheduled audio time into performance.now() ms
      const ts = this.ctx.getOutputTimestamp ? this.ctx.getOutputTimestamp() : null;
      const perfAtCtx = ts && ts.performanceTime !== undefined ? ts.performanceTime + (t0 - ts.contextTime) * 1000 : performance.now() + (t0 - now) * 1000;
      const baseLatency = (this.ctx.baseLatency || 0) * 1000;
      this.log.push({ cue: name, tVisual: +opts.tVisual.toFixed(1), tAudio: +perfAtCtx.toFixed(1), offsetMs: +(perfAtCtx - opts.tVisual).toFixed(1), baseLatencyMs: +baseLatency.toFixed(1), rate });
      if (this.log.length > 400) this.log.shift();
    }
    return t0;
  }

  _stop(v) { for (const n of v.nodes) { try { n.stop(); } catch (e) { /* already ended */ } } this.active = this.active.filter((x) => x !== v); }

  /** One voice of a cue at audio time t. Returns its end time. */
  _voice(c, t, stretch, opts, nodes) {
    const ctx = this.ctx, out = this.duckGain;
    const a = (c.a || 0.005) * stretch, d = c.d * stretch, dur = a + d;
    const env = ctx.createGain(); env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(c.gain, t + a);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    env.connect(out);
    const detune = 1 + (Math.random() * 2 - 1) * (this.spec.voiceDetune || 0);
    const pitchMul = detune * (c.pitchFromVy && opts.vy ? Math.pow(2, clamp(-opts.vy, -1, 1) * c.pitchFromVy) : 1) / Math.sqrt(stretch);
    const src = [];
    if (c.gen === 'tone' || c.gen === 'thud') {
      const o = ctx.createOscillator(); o.type = c.wave || (c.gen === 'thud' ? 'sine' : 'sine');
      const f0 = (c.hz || this.spec.baseHz) * pitchMul;
      o.frequency.setValueAtTime(f0, t);
      if (c.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f0 * Math.pow(2, c.slide)), t + dur);
      if (c.wobbleHz || c.vibratoHz) {
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = (c.wobbleHz || c.vibratoHz) / stretch; lg.gain.value = f0 * (c.wobbleDepth || c.vibratoDepth || 0.05);
        lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.05); nodes.push(lfo);
      }
      o.connect(env); o.start(t); o.stop(t + dur + 0.05); src.push(o);
      if (c.gen === 'thud') {   // body: low sine; add a short noise burst for the contact texture
        const nb = ctx.createBufferSource(); nb.buffer = noiseBuffers(ctx).brown;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; f.Q.value = 0.7;
        const g = ctx.createGain(); g.gain.setValueAtTime(c.gain * 0.8, t); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 0.09 * stretch));
        nb.connect(f); f.connect(g); g.connect(out); nb.start(t); nb.stop(t + 0.12 * stretch); nodes.push(nb);
      }
    } else if (c.gen === 'noise') {
      const nb = ctx.createBufferSource(); nb.buffer = noiseBuffers(ctx)[c.color || 'white']; nb.loop = true;
      nb.playbackRate.value = 1 / Math.sqrt(stretch);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = c.q || 1;
      const fz = (c.hz || 800) * pitchMul; f.frequency.setValueAtTime(fz, t);
      if (c.sweep) f.frequency.exponentialRampToValueAtTime(fz * c.sweep, t + dur * 0.7);
      nb.connect(f); f.connect(env); nb.start(t); nb.stop(t + dur + 0.05); src.push(nb);
    } else if (c.gen === 'chord') {
      const notes = c.notes || [523.25, 659.25, 783.99];
      const spread = (c.spreadMs || 0) / 1000 * stretch;
      notes.forEach((hz, i) => {
        const o = ctx.createOscillator(); o.type = c.wave || 'sine'; o.frequency.value = hz * detune;
        const g = ctx.createGain(); const ts = t + i * spread;
        g.gain.setValueAtTime(0.0001, ts); g.gain.linearRampToValueAtTime(c.gain / notes.length * 1.6, ts + a); g.gain.exponentialRampToValueAtTime(0.0001, ts + dur);
        o.connect(g); g.connect(out); o.start(ts); o.stop(ts + dur + 0.05); nodes.push(o);
      });
      return t + (notes.length - 1) * spread + dur;
    }
    // optional layered texture (feather rustle on a flap, claw click on a landing)
    const tex = c.rustle || c.click;
    if (tex) {
      const nb = ctx.createBufferSource(); nb.buffer = noiseBuffers(ctx).white;
      const f = ctx.createBiquadFilter(); f.type = c.click ? 'highpass' : 'bandpass'; f.frequency.value = tex.hz; f.Q.value = 2;
      const g = ctx.createGain(); g.gain.setValueAtTime(tex.gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + tex.d * stretch);
      nb.connect(f); f.connect(g); g.connect(out); nb.start(t); nb.stop(t + tex.d * stretch + 0.02); nodes.push(nb);
    }
    nodes.push(...src);
    return t + dur;
  }

  dispose() { this.active.forEach((v) => this._stop(v)); if (this.ctx) this.ctx.close().catch(() => {}); this.ctx = null; this.status = 'closed'; }
}

/**
 * Offline render of a cue table for the mix gate (peak dBFS, clipping) - no speakers,
 * no autoplay policy involved because OfflineAudioContext is not gated.
 */
export async function renderOffline(sound, cueNames, { overlap = false, seconds = 2 } = {}) {
  const ctx = new OfflineAudioContext(1, 48000 * seconds, 48000);
  const bus = new SoundBus(sound);
  bus.ctx = ctx; bus.status = 'running';
  bus.comp = ctx.createDynamicsCompressor(); bus.comp.threshold.value = -12; bus.comp.knee.value = 12; bus.comp.ratio.value = 4; bus.comp.attack.value = 0.003; bus.comp.release.value = 0.12;
  bus.duckGain = ctx.createGain(); bus.master = ctx.createGain(); bus.master.gain.value = sound.master;
  bus.duckGain.connect(bus.master); bus.master.connect(bus.comp); bus.comp.connect(ctx.destination);
  const saveRate = clock.rate; clock.rate = 1;
  cueNames.forEach((n, i) => {
    const c = sound.cues[n]; if (!c) return;
    const nodes = []; const t = overlap ? 0.05 + i * 0.01 : 0.05;
    bus._voice(c, t, 1, {}, nodes);
  });
  clock.rate = saveRate;
  const buf = await ctx.startRendering();
  const data = buf.getChannelData(0);
  let peak = 0, clipped = 0, sum = 0;
  for (let i = 0; i < data.length; i++) { const v = Math.abs(data[i]); if (v > peak) peak = v; if (v >= 0.999) clipped++; sum += data[i] * data[i]; }
  return { peak, peakDbfs: 20 * Math.log10(peak || 1e-9), clippedSamples: clipped, rmsDbfs: 20 * Math.log10(Math.sqrt(sum / data.length) || 1e-9) };
}
