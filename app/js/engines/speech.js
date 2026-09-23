/**
 * Speech - audio-first TTS with word-by-word (karaoke) highlighting.
 *
 * Built on the Web Speech API (no backend, works offline once voices are installed).
 *  - picks the best Arabic voice (ar-EG preferred, then any ar-*), falls back gracefully
 *  - onboundary -> exact word highlight when the browser supports it; otherwise a timed fallback
 *    (estimated from rate x characters) so the karaoke effect always runs
 *  - when speechSynthesis is missing/disabled, highlighting still runs (silent karaoke) and `end` fires
 *  - single speaker at a time: speak() cancels any previous utterance
 *
 * Usage:
 *   speech.speak(text, { rate, onWord(i, word), onEnd, onStart })
 *   speech.stop(); speech.available; speech.speaking
 */
import store from '../core/store.js';

const hasTTS = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

function tokenize(text) {
  const words = []; const re = /\S+/g; let m;
  while ((m = re.exec(text))) words.push({ w: m[0], start: m.index, end: m.index + m[0].length });
  return words;
}

let current = null; // { cancelled, timer, utter }

export const speech = {
  get available() { return hasTTS(); },
  get speaking() { return !!current; },
  get enabled() { const s = store.profile?.settings?.explain; return s ? s.tts !== false : true; },

  voice() {
    if (!hasTTS()) return null;
    const vs = speechSynthesis.getVoices();
    return vs.find((v) => /^ar[-_]EG/i.test(v.lang)) || vs.find((v) => /^ar/i.test(v.lang)) || null;
  },

  /** speak text; resolves when finished (or cancelled). Highlights words through onWord. */
  speak(text, { rate, pitch = 1.05, onWord, onEnd, onStart } = {}) {
    this.stop();
    const words = tokenize(text);
    const r = rate ?? (store.profile?.settings?.explain?.rate ?? 0.9);
    const state = { cancelled: false, timer: null, utter: null };
    current = state;
    const finish = () => { if (state.cancelled) return; state.cancelled = true; clearTimeout(state.timer); if (current === state) current = null; onEnd?.(); };

    // timed fallback: per-word duration estimated from its length, min 260ms
    const schedule = () => {
      let i = 0;
      const step = () => { if (state.cancelled) return; if (i >= words.length) { finish(); return; } onWord?.(i, words[i].w); const ms = Math.max(260, (words[i].w.length * 95 + 180) / r); i++; state.timer = setTimeout(step, ms); };
      step();
    };

    const canSpeak = hasTTS() && this.enabled;
    if (!canSpeak) { onStart?.(); schedule(); return Promise.resolve(); }

    return new Promise((resolve) => {
      try {
        const u = new SpeechSynthesisUtterance(text); state.utter = u;
        u.lang = 'ar-EG'; u.rate = r; u.pitch = pitch; const v = this.voice(); if (v) u.voice = v;
        let usedBoundary = false, fallbackStarted = false;
        u.onstart = () => { onStart?.(); onWord?.(0, words[0]?.w); state.timer = setTimeout(() => { if (!usedBoundary && !state.cancelled) { fallbackStarted = true; schedule(); } }, 900); };
        u.onboundary = (e) => { if (fallbackStarted) return; usedBoundary = true; clearTimeout(state.timer); const idx = words.findIndex((w) => e.charIndex >= w.start && e.charIndex < w.end); if (idx >= 0) onWord?.(idx, words[idx].w); };
        u.onend = () => { finish(); resolve(); };
        u.onerror = () => { if (!fallbackStarted && !state.cancelled) schedule(); resolve(); };
        speechSynthesis.cancel(); speechSynthesis.speak(u);
        // Chrome may never fire onstart when no voice is available -> ensure the karaoke fallback still runs
        state.timer = setTimeout(() => { if (!state.cancelled && !usedBoundary && !fallbackStarted && !speechSynthesis.speaking) { fallbackStarted = true; onStart?.(); schedule(); } }, 1200);
      } catch { onStart?.(); schedule(); resolve(); }
    });
  },

  stop() {
    if (current) { current.cancelled = true; clearTimeout(current.timer); current = null; }
    if (hasTTS()) { try { speechSynthesis.cancel(); } catch { /* noop */ } }
  },
};

if (hasTTS()) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); } catch { /* noop */ } }
if (typeof window !== 'undefined') window.__speech = speech; // E2E hook (read-only)
export default speech;
