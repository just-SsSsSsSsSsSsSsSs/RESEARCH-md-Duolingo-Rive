/**
 * Sound Engine — 100% procedural Web Audio (no files, zero latency, works offline).
 * Sounds: pop, tap, correct, wrong, levelup, fanfare, coin, streak, heart, whoosh, badge, tick
 */
import store from '../core/store.js';
import bus from '../core/bus.js';

let ctx = null;
let master = null;
let unlocked = false;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    // gentle compressor to avoid clipping on layered sounds
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// unlock on first gesture (iOS)
['pointerdown', 'touchstart', 'keydown'].forEach((ev) =>
  window.addEventListener(ev, () => { if (!unlocked) { unlocked = true; ensure(); } }, { once: true, passive: true }));

const enabled = () => store.meta.sound !== false;

/* ---- primitives ---- */
function tone({ freq = 440, type = 'sine', dur = 0.15, vol = 0.5, at = 0, attack = 0.005, decay, slideTo, detune = 0, pan = 0 }) {
  const c = ensure(); if (!c) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t0); osc.detune.value = detune;
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + (decay ?? dur));
  let node = osc;
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; osc.connect(p); node = p; }
  node.connect(g).connect(master);
  osc.start(t0); osc.stop(t0 + (decay ?? dur) + 0.05);
}

function noise({ dur = 0.08, vol = 0.25, at = 0, hp = 800, lp = 6000 }) {
  const c = ensure(); if (!c) return;
  const t0 = c.currentTime + at;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const f1 = c.createBiquadFilter(); f1.type = 'highpass'; f1.frequency.value = hp;
  const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f1).connect(f2).connect(g).connect(master);
  src.start(t0);
}

/* ---- named sounds ---- */
const S = {
  pop(size = 1) {
    // size 0..1 → bigger bubble = lower pitch
    const f = 900 - size * 500 + Math.random() * 120;
    tone({ freq: f, slideTo: f * 0.45, type: 'sine', dur: 0.12, vol: 0.35, pan: (Math.random() - 0.5) * 0.8 });
    noise({ dur: 0.05, vol: 0.12, hp: 1500, lp: 9000 });
  },
  tap() { tone({ freq: 620, slideTo: 420, type: 'triangle', dur: 0.06, vol: 0.2 }); },
  tick() { tone({ freq: 1200, type: 'square', dur: 0.03, vol: 0.08 }); },
  correct() {
    [523.25, 659.25, 783.99].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.32, at: i * 0.07 }));
    tone({ freq: 1046.5, type: 'sine', dur: 0.35, vol: 0.22, at: 0.2 });
  },
  wrong() {
    tone({ freq: 220, slideTo: 140, type: 'sawtooth', dur: 0.25, vol: 0.18 });
    tone({ freq: 180, slideTo: 110, type: 'square', dur: 0.3, vol: 0.1, at: 0.05 });
  },
  coin() { tone({ freq: 987.77, type: 'square', dur: 0.08, vol: 0.18 }); tone({ freq: 1318.5, type: 'square', dur: 0.25, vol: 0.18, at: 0.08 }); },
  levelup() {
    const seq = [392, 523.25, 659.25, 783.99, 1046.5];
    seq.forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.22, vol: 0.3, at: i * 0.09 }));
    seq.forEach((f, i) => tone({ freq: f * 2, type: 'sine', dur: 0.2, vol: 0.12, at: i * 0.09 + 0.02 }));
    tone({ freq: 1568, type: 'sine', dur: 0.8, vol: 0.2, at: 0.5 });
  },
  fanfare() {
    const notes = [[523.25, 0], [523.25, .12], [523.25, .24], [659.25, .36], [783.99, .6], [659.25, .78], [783.99, .92]];
    notes.forEach(([f, t]) => { tone({ freq: f, type: 'square', dur: 0.2, vol: 0.16, at: t }); tone({ freq: f / 2, type: 'triangle', dur: 0.2, vol: 0.14, at: t }); });
    tone({ freq: 1046.5, type: 'sine', dur: 1.1, vol: 0.22, at: 1.1 });
    tone({ freq: 1318.5, type: 'sine', dur: 1.1, vol: 0.14, at: 1.1 });
    noise({ dur: 0.4, vol: 0.12, at: 1.1, hp: 3000, lp: 10000 });
  },
  badge() {
    [659.25, 830.61, 987.77, 1318.5].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.4, vol: 0.26, at: i * 0.1 }));
    noise({ dur: 0.3, vol: 0.08, at: 0.3, hp: 4000, lp: 12000 });
  },
  streak() { [440, 554.37, 659.25].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.15, vol: 0.28, at: i * 0.06 })); noise({ dur: 0.2, vol: 0.1, hp: 2000 }); },
  heart() { tone({ freq: 330, slideTo: 200, type: 'sine', dur: 0.3, vol: 0.3 }); tone({ freq: 165, slideTo: 100, type: 'sine', dur: 0.4, vol: 0.2, at: 0.1 }); },
  whoosh() { noise({ dur: 0.25, vol: 0.18, hp: 400, lp: 4000 }); },
  swipe() { tone({ freq: 300, slideTo: 900, type: 'sine', dur: 0.12, vol: 0.12 }); },
};

export const sound = {
  play(name, ...args) {
    if (!enabled()) return;
    try { S[name]?.(...args); } catch (e) { /* ignore */ }
  },
  toggle() { store.setMeta({ sound: !enabled() }); bus.emit('sound:toggle', enabled()); if (enabled()) this.play('tap'); return enabled(); },
  get enabled() { return enabled(); },
  /** speak Arabic text via SpeechSynthesis if available */
  speak(text, { rate = 0.95, pitch = 1.05 } = {}) {
    if (!enabled() || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ar-EG'; u.rate = rate; u.pitch = pitch;
      const v = speechSynthesis.getVoices().find((v) => v.lang.startsWith('ar'));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch { /* noop */ }
  },
  haptic(pattern = 12) { try { navigator.vibrate?.(pattern); } catch { /* noop */ } },
};
export default sound;
