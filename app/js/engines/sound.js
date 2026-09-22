/**
 * Sound Engine v2 — 100% procedural Web Audio (no files, zero latency, offline).
 * Design principles (kids UX):
 *  • Only sine/triangle timbres + lowpass + soft reverb tail → warm, never harsh.
 *  • "wrong" is a gentle, friendly two-note "hmm?" — encouraging, never a buzzer.
 *  • "correct" is VARIED: 6 melodic patterns, randomized key, humanized timing/detune,
 *    and escalates with combo (each streak of right answers climbs the scale).
 *  • Cheers, pops and sparkles are randomized so nothing feels repetitive.
 */
import store from '../core/store.js';
import bus from '../core/bus.js';

let ctx = null, master = null, reverb = null, dry = null, unlocked = false;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.6;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.25;
    // soft room reverb from a short decaying noise impulse
    reverb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.1), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
    reverb.buffer = buf;
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    dry = ctx.createGain(); dry.gain.value = 1;
    master.connect(dry).connect(comp);
    master.connect(reverb).connect(wet).connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
['pointerdown', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, () => { if (!unlocked) { unlocked = true; ensure(); } }, { once: true, passive: true }));

const enabled = () => store.meta.sound !== false;
const R = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// Musical helpers (equal temperament, A4 = 440)
const NOTE = (semi) => 440 * Math.pow(2, (semi - 9) / 12); // semi: 0 = C4
const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

/* ---- primitives ---- */
function tone({ freq = 440, type = 'sine', dur = 0.15, vol = 0.5, at = 0, attack = 0.006, release, slideTo, detune = 0, pan = 0, lp = 0, vib = 0 }) {
  const c = ensure(); if (!c) return;
  const t0 = c.currentTime + at, end = t0 + dur;
  const osc = c.createOscillator(); const g = c.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t0); osc.detune.value = detune + R(-4, 4);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), end);
  if (vib) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.value = vib; lfo.connect(lg).connect(osc.frequency); lfo.start(t0); lfo.stop(end + 0.1); }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.setValueAtTime(vol, Math.max(t0 + attack, end - (release ?? dur * 0.6)));
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  let node = osc;
  if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = 0.7; node.connect(f); node = f; }
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; node.connect(p); node = p; }
  node.connect(g).connect(master);
  osc.start(t0); osc.stop(end + 0.05);
}
function noise({ dur = 0.08, vol = 0.25, at = 0, hp = 800, lp = 6000, curve = 1 }) {
  const c = ensure(); if (!c) return;
  const t0 = c.currentTime + at, len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, curve);
  const src = c.createBufferSource(); src.buffer = buf;
  const f1 = c.createBiquadFilter(); f1.type = 'highpass'; f1.frequency.value = hp;
  const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f1).connect(f2).connect(g).connect(master); src.start(t0);
}
/** bell-like partial stack (glockenspiel feel) */
function bell(freq, { at = 0, vol = 0.3, dur = 0.7, pan = 0 } = {}) {
  tone({ freq, type: 'sine', dur, vol, at, pan, release: dur * 0.9 });
  tone({ freq: freq * 2.76, type: 'sine', dur: dur * 0.5, vol: vol * 0.28, at, pan, release: dur * 0.45 });
  tone({ freq: freq * 5.4, type: 'sine', dur: dur * 0.25, vol: vol * 0.12, at, pan });
}
/** soft marimba-ish pluck */
function pluck(freq, { at = 0, vol = 0.3, dur = 0.28, pan = 0 } = {}) {
  tone({ freq, type: 'triangle', dur, vol, at, pan, lp: 2200, release: dur * 0.85 });
  tone({ freq: freq * 2, type: 'sine', dur: dur * 0.6, vol: vol * 0.25, at, pan });
}

/* ---- correct-answer patterns (root = semitone offset of key) ---- */
const CORRECT_PATTERNS = [
  (r) => [0, 4, 7].forEach((s, i) => bell(NOTE(r + s), { at: i * 0.075, vol: 0.32, pan: (i - 1) * 0.3 })),                 // major arpeggio bells
  (r) => [0, 7, 12].forEach((s, i) => pluck(NOTE(r + s), { at: i * 0.09, vol: 0.34 })),                                    // open fifth run
  (r) => { [0, 2, 4, 7].forEach((s, i) => pluck(NOTE(r + s), { at: i * 0.06, vol: 0.3 })); bell(NOTE(r + 12), { at: 0.26, vol: 0.28 }); }, // scale sprint + top bell
  (r) => { bell(NOTE(r + 7), { vol: 0.3 }); bell(NOTE(r + 12), { at: 0.12, vol: 0.34 }); bell(NOTE(r + 16), { at: 0.24, vol: 0.28, dur: 1 }); }, // rising thirds
  (r) => [0, 4, 7, 12, 16].forEach((s, i) => tone({ freq: NOTE(r + s), type: 'triangle', dur: 0.22, vol: 0.22, at: i * 0.05, lp: 3000, pan: R(-0.4, 0.4) })), // sparkle cascade
  (r) => { pluck(NOTE(r), { vol: 0.34 }); pluck(NOTE(r + 4), { at: 0.1, vol: 0.34 }); bell(NOTE(r + 7), { at: 0.2, vol: 0.36, dur: 0.9 }); noise({ dur: 0.25, vol: 0.05, at: 0.2, hp: 5000, lp: 12000, curve: 3 }); }, // ta-da with shimmer
];
let combo = 0, lastKey = 0;

const S = {
  /* bubbles: soft glassy pops, pitch by size, varied */
  pop(size = 1) {
    const f = R(700, 1000) - size * 420;
    tone({ freq: f, slideTo: f * 0.5, type: 'sine', dur: 0.14, vol: 0.34, pan: R(-0.7, 0.7), attack: 0.002 });
    tone({ freq: f * 1.5, slideTo: f * 0.8, type: 'triangle', dur: 0.07, vol: 0.12, pan: R(-0.5, 0.5), attack: 0.002 });
    noise({ dur: 0.04, vol: 0.08, hp: 2500, lp: 9000, curve: 2 });
  },
  tap() { pluck(R(520, 620), { vol: 0.16, dur: 0.1 }); },
  tick() { tone({ freq: 1500, type: 'sine', dur: 0.035, vol: 0.07 }); },
  swipe() { tone({ freq: 300, slideTo: 900, type: 'sine', dur: 0.13, vol: 0.1, lp: 2500 }); },
  whoosh() { noise({ dur: 0.3, vol: 0.14, hp: 300, lp: 3500, curve: 1.5 }); tone({ freq: 200, slideTo: 600, type: 'sine', dur: 0.25, vol: 0.06 }); },

  /** varied + escalating with combo; combo resets on wrong */
  correct(c = combo) {
    combo = c + 1;
    // key rotates a bit each time; combo climbs the pentatonic scale up to +9 semitones
    lastKey = (lastKey + pick([0, 2, 3, 5])) % 7;
    const root = lastKey + PENTA[Math.min(combo - 1, 6)] * 0.5;
    pick(CORRECT_PATTERNS)(root);
    if (combo >= 3) noise({ dur: 0.3, vol: 0.04 + Math.min(combo, 8) * 0.008, at: 0.15, hp: 6000, lp: 14000, curve: 3 }); // growing shimmer
    if (combo === 5 || combo === 10) S.sparkle();
  },
  /** gentle, friendly "hmm-hm?" — two soft descending sine notes with slight vibrato, low volume */
  wrong() {
    combo = 0;
    tone({ freq: NOTE(7), type: 'sine', dur: 0.22, vol: 0.2, lp: 1500, vib: 4, release: 0.15 });
    tone({ freq: NOTE(3), type: 'sine', dur: 0.36, vol: 0.18, at: 0.17, lp: 1300, vib: 5, release: 0.28 });
    tone({ freq: NOTE(3) / 2, type: 'triangle', dur: 0.3, vol: 0.06, at: 0.18, lp: 600 });
  },
  /** soft encouraging "boop" after wrong (used with hint text) */
  encourage() { pluck(NOTE(0), { vol: 0.18 }); pluck(NOTE(4), { at: 0.13, vol: 0.2 }); },
  sparkle() { for (let i = 0; i < 7; i++) tone({ freq: NOTE(12 + MAJOR[i]), type: 'sine', dur: 0.18, vol: 0.12, at: i * 0.045, pan: R(-0.6, 0.6) }); noise({ dur: 0.35, vol: 0.05, hp: 7000, lp: 15000, curve: 3 }); },
  coin() { bell(NOTE(19), { vol: 0.18, dur: 0.25 }); bell(NOTE(24), { at: 0.08, vol: 0.2, dur: 0.5 }); },
  levelup() {
    [0, 4, 7, 12, 16, 19].forEach((s, i) => bell(NOTE(s), { at: i * 0.085, vol: 0.3, pan: (i % 2 ? 0.35 : -0.35) }));
    tone({ freq: NOTE(24), type: 'sine', dur: 1.1, vol: 0.18, at: 0.5, release: 0.9 });
    noise({ dur: 0.6, vol: 0.08, at: 0.45, hp: 4000, lp: 14000, curve: 2.5 });
  },
  fanfare() {
    const seq = [[0, 0], [0, .12], [0, .24], [4, .36], [7, .58], [4, .76], [7, .9]];
    seq.forEach(([s, t]) => { pluck(NOTE(s + 12), { at: t, vol: 0.28, dur: 0.22 }); pluck(NOTE(s), { at: t, vol: 0.22, dur: 0.22 }); });
    [12, 16, 19, 24].forEach((s, i) => bell(NOTE(s), { at: 1.1 + i * 0.03, vol: 0.26, dur: 1.4, pan: (i - 1.5) * 0.3 }));
    noise({ dur: 0.7, vol: 0.1, at: 1.1, hp: 3000, lp: 12000, curve: 2 });
  },
  badge() { [4, 8, 11, 16].forEach((s, i) => bell(NOTE(12 + s), { at: i * 0.1, vol: 0.28, dur: 0.8 })); S.sparkle(); },
  streak() { [0, 4, 7].forEach((s, i) => pluck(NOTE(s + 7), { at: i * 0.06, vol: 0.28 })); noise({ dur: 0.25, vol: 0.08, hp: 1500, lp: 8000, curve: 2 }); },
  heart() { tone({ freq: NOTE(0), slideTo: NOTE(-5), type: 'sine', dur: 0.35, vol: 0.22, lp: 1200, vib: 3 }); tone({ freq: NOTE(-12), type: 'sine', dur: 0.45, vol: 0.12, at: 0.05, lp: 500 }); },
  /** random short cheer melody for results */
  cheer() { pick([S.levelup, S.fanfare, () => { S.sparkle(); S.badge(); }])(); },
};

export const sound = {
  play(name, ...args) { if (!enabled()) return; try { S[name]?.(...args); } catch { /* ignore */ } },
  toggle() { store.setMeta({ sound: !enabled() }); bus.emit('sound:toggle', enabled()); if (enabled()) this.play('tap'); return enabled(); },
  get enabled() { return enabled(); },
  get combo() { return combo; },
  resetCombo() { combo = 0; },
  speak(text, { rate = 0.95, pitch = 1.05 } = {}) {
    if (!enabled() || !('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ar-EG'; u.rate = rate; u.pitch = pitch; const v = speechSynthesis.getVoices().find((v) => v.lang.startsWith('ar')); if (v) u.voice = v; speechSynthesis.speak(u); } catch { /* noop */ }
  },
  haptic(pattern = 12) { try { navigator.vibrate?.(pattern); } catch { /* noop */ } },
};
export default sound;
