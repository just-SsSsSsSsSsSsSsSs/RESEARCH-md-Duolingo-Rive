/**
 * Celebration - stage-completion siren (Phase 10, feature 2).
 *
 * 100% procedural Web Audio (no files, royalty-free, 0KB):
 *   police_siren_eg  - Egyptian police "government" two-tone wail (slow sweep between two tones + horn an octave below)
 *   school_bell      - metallic bell strikes with decaying partials
 *   applause         - filtered noise bursts (crowd) + whistles
 *   victory_tune     - short major fanfare loop
 * Every sound loops until the parent-configured duration, then fades out smoothly.
 *
 * Settings live in profile.settings.celebration (parent dashboard; apply instantly, nothing hard-coded):
 *   { enabled, sound, durationSec (5..120), volume (0..100, capped for hearing safety), condition: 'perfect'|'complete'|'score',
 *     minScore, parentAlert: 'none'|'sound'|'notification'|'both', quietFrom, quietTo }
 *
 * Trigger: bus 'activity:complete' (a Session that started and finished) -> fires once per completion when
 *   !aborted AND the condition is satisfied. Stops on route change / page hide (child left the screen) or stop().
 * Autoplay: the AudioContext was already unlocked by the child's taps during the activity.
 */
import store from '../core/store.js';
import bus from '../core/bus.js';

export const SOUNDS = [
  { id: 'police_siren_eg', name: 'سارينة البوليس (مصر)', icon: 'flag' },
  { id: 'school_bell', name: 'جرس المدرسة', icon: 'clock' },
  { id: 'applause', name: 'تصقيف وتهليل', icon: 'clap' },
  { id: 'victory_tune', name: 'نغمة الفوز', icon: 'trophy' },
];
export const DEFAULTS = { enabled: true, sound: 'police_siren_eg', durationSec: 30, volume: 60, condition: 'perfect', minScore: 80, parentAlert: 'sound', quietFrom: null, quietTo: null };
export const LIMITS = { minSec: 5, maxSec: 120, maxGain: 0.55 }; // maxGain: hearing-safety cap regardless of the slider

export function settings(profile = store.profile) { return { ...DEFAULTS, ...(profile?.settings?.celebration || {}) }; }
export function saveSettings(patch, profile = store.profile) {
  if (!profile) return null;
  profile.settings = profile.settings || {};
  const next = { ...settings(profile), ...patch };
  next.durationSec = Math.max(LIMITS.minSec, Math.min(LIMITS.maxSec, Number(next.durationSec) || DEFAULTS.durationSec));
  next.volume = Math.max(0, Math.min(100, Number(next.volume) || 0));
  profile.settings.celebration = next;
  if (profile === store.profile) store.save(true);
  bus.emit('celebration:settings', next);
  return next;
}

export function inQuietHours(s, d = new Date()) {
  if (s.quietFrom == null || s.quietTo == null || s.quietFrom === '' || s.quietTo === '') return false;
  const h = d.getHours() + d.getMinutes() / 60, f = Number(s.quietFrom), t = Number(s.quietTo);
  return f < t ? (h >= f && h < t) : (h >= f || h < t);
}

/** should we fire for this completion result? (pure, testable) */
export function shouldFire(result, s = settings()) {
  if (!s.enabled || result.aborted) return false;
  if (inQuietHours(s)) return false;
  if (s.condition === 'complete') return true;
  if (s.condition === 'score') return (result.score || 0) >= (s.minScore || 0);
  return result.score === 100; // 'perfect' (default): every item of the stage correct
}

/* ---------------- synthesis ---------------- */
let ctx = null, master = null, active = null;
function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 6;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
const gainFor = (volume) => Math.min(LIMITS.maxGain, (volume / 100) * LIMITS.maxGain);

const GEN = {
  /** Egyptian police wail: ~640Hz <-> 880Hz swept slowly (1.6s per cycle) + softer horn an octave below */
  police_siren_eg(t0, dur) {
    const osc = ctx.createOscillator(), osc2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain(), lp = ctx.createBiquadFilter();
    osc.type = 'sawtooth'; osc2.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 1800; g.gain.value = 0.35; g2.gain.value = 0.10;
    const period = 1.6, lo = 640, hi = 880; let t = t0;
    while (t < t0 + dur + period) {
      osc.frequency.setValueAtTime(lo, t); osc.frequency.linearRampToValueAtTime(hi, t + period / 2); osc.frequency.linearRampToValueAtTime(lo, t + period);
      osc2.frequency.setValueAtTime(lo / 2, t); osc2.frequency.linearRampToValueAtTime(hi / 2, t + period / 2); osc2.frequency.linearRampToValueAtTime(lo / 2, t + period);
      t += period;
    }
    osc.connect(g).connect(lp).connect(master); osc2.connect(g2).connect(lp);
    osc.start(t0); osc2.start(t0); osc.stop(t0 + dur + 0.5); osc2.stop(t0 + dur + 0.5);
    return [osc, osc2];
  },
  school_bell(t0, dur) {
    const nodes = [], partials = [1, 2.0, 2.98, 4.2]; let t = t0;
    while (t < t0 + dur) {
      partials.forEach((p, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = 660 * p; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.28 / (i + 1), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9 - i * 0.12); o.connect(g).connect(master); o.start(t); o.stop(t + 1); nodes.push(o); });
      t += 0.42;
    }
    return nodes;
  },
  applause(t0, dur) {
    const len = Math.ceil(ctx.sampleRate * (dur + 0.5)), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.02 ? 1 : 0.35); // crowd = dense random clap bursts
    const src = ctx.createBufferSource(); src.buffer = buf; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.6; const g = ctx.createGain(); g.gain.value = 0.5;
    src.connect(bp).connect(g).connect(master); src.start(t0); src.stop(t0 + dur + 0.5);
    const nodes = [src]; let t = t0 + 0.6;
    while (t < t0 + dur) { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(1800, t); o.frequency.linearRampToValueAtTime(2600, t + 0.35); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.12, t + 0.05); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(og).connect(master); o.start(t); o.stop(t + 0.55); nodes.push(o); t += 1.7 + Math.random(); }
    return nodes;
  },
  victory_tune(t0, dur) {
    const seq = [[523, .18], [659, .18], [784, .18], [1047, .36], [784, .18], [1047, .54], [0, .3]], nodes = []; let t = t0;
    while (t < t0 + dur) { for (const [f, d] of seq) { if (f) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.02); nodes.push(o); } t += d; } }
    return nodes;
  },
};

export const celebration = {
  get playing() { return !!active; },
  SOUNDS, DEFAULTS, LIMITS, settings, saveSettings, shouldFire,

  /** play a sound for durationSec (with fade-out). Resolves when done. */
  play({ sound = settings().sound, durationSec = settings().durationSec, volume = settings().volume } = {}) {
    this.stop();
    const c = ensure(); if (!c || store.meta.sound === false) return Promise.resolve(false);
    const dur = Math.max(LIMITS.minSec, Math.min(LIMITS.maxSec, Number(durationSec) || DEFAULTS.durationSec)), t0 = c.currentTime + 0.05, gain = Math.max(0.0002, gainFor(volume));
    master.gain.cancelScheduledValues(t0); master.gain.setValueAtTime(0.0001, t0); master.gain.exponentialRampToValueAtTime(gain, t0 + 0.4);
    master.gain.setValueAtTime(gain, t0 + dur - 1.2); master.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); // 1.2s fade-out
    const nodes = (GEN[sound] || GEN.police_siren_eg)(t0, dur);
    const state = { nodes, sound, startedAt: Date.now(), durationSec: dur, timer: null };
    active = state; window.__celebration = { sound, durationSec: dur, volume, startedAt: state.startedAt }; // E2E hook (read-only)
    bus.emit('celebration:start', { sound, durationSec: dur });
    return new Promise((res) => { state.timer = setTimeout(() => { if (active === state) { active = null; window.__celebration = null; bus.emit('celebration:end', { sound }); } res(true); }, dur * 1000 + 100); });
  },

  stop() {
    if (!active) return;
    const s = active; active = null; clearTimeout(s.timer); window.__celebration = null;
    try { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0.0001, t + 0.25); s.nodes.forEach((n) => { try { n.stop(t + 0.3); } catch { /* already stopped */ } }); } catch { /* noop */ }
    bus.emit('celebration:end', { sound: s.sound, stopped: true });
  },

  /** parent alert: short distinct chime (separate path, not affected by the siren volume) and/or a Notification when already permitted */
  alertParent(result, s = settings()) {
    const mode = s.parentAlert || 'none'; if (mode === 'none') return;
    if (mode === 'sound' || mode === 'both') {
      const c = ensure(); if (c) { const t = c.currentTime + 0.02; [880, 1320].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + i * 0.25); g.gain.exponentialRampToValueAtTime(0.2, t + i * 0.25 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.25 + 0.5); o.connect(g).connect(c.destination); o.start(t + i * 0.25); o.stop(t + i * 0.25 + 0.55); }); }
    }
    if ((mode === 'notification' || mode === 'both') && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification(`${store.profile?.name || 'البطل'} خلّص المرحلة!`, { body: `النتيجة ${result.score}٪`, silent: true }); } catch { /* noop */ }
    }
    window.__parentAlert = { mode, at: Date.now() }; // E2E hook
    bus.emit('celebration:parentAlert', { mode });
  },

  /** wire to the app bus once (idempotent) */
  init() {
    if (this._wired) return; this._wired = true;
    bus.on('activity:complete', (r) => { const s = settings(); window.__lastComplete = { r, fired: shouldFire(r, s) }; if (!shouldFire(r, s)) return; this.play({ sound: s.sound, durationSec: s.durationSec, volume: s.volume }); this.alertParent(r, s); });
    bus.on('route:change', () => this.stop());
    window.addEventListener('pagehide', () => this.stop());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); });
  },
};

export default celebration;
