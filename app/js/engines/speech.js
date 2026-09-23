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
 *   speech.stop(); speech.available; speech.speaking; speech.voices() (ranked); phonetic(text); numWords(n)
 * Phase 11 K4: quality-ranked voice choice, Egyptian phonetic layer for the spoken text, one utterance per sentence.
 */
import store from '../core/store.js';

const hasTTS = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

function tokenize(text) {
  const words = []; const re = /\S+/g; let m;
  while ((m = re.exec(text))) words.push({ w: m[0], start: m.index, end: m.index + m[0].length });
  return words;
}

/* ---------- Phase 11 K4: Egyptian phonetic layer (spoken text only; the displayed text is untouched) ---------- */
const ONES = ['صفر', 'واحد', 'اتنين', 'تلاتة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'تمانية', 'تسعة', 'عشرة', 'حداشر', 'اتناشر', 'تلتاشر', 'أربعتاشر', 'خمستاشر', 'ستاشر', 'سبعتاشر', 'تمنتاشر', 'تسعتاشر'];
const TENS = ['', '', 'عشرين', 'تلاتين', 'أربعين', 'خمسين', 'ستين', 'سبعين', 'تمانين', 'تسعين'];
const HUNDREDS = ['', 'مية', 'ميتين', 'تلتمية', 'ربعمية', 'خمسمية', 'ستمية', 'سبعمية', 'تمنمية', 'تسعمية'];
/** 0..999 as Egyptian Arabic words ("تلاتة", "أربعة وعشرين", "مية وخمسة") */
export function numWords(n) {
  n = Math.trunc(Math.abs(Number(n)));
  if (!Number.isFinite(n) || n > 999) return String(n);
  if (n < 20) return ONES[n];
  if (n < 100) { const o = n % 10, t = Math.floor(n / 10); return o ? `${ONES[o]} و${TENS[t]}` : TENS[t]; }
  const h = Math.floor(n / 100), r = n % 100;
  return r ? `${HUNDREDS[h]} و${numWords(r)}` : HUNDREDS[h];
}
const AR_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;
const toLatinDigits = (t) => t.replace(AR_DIGITS, (d) => String(d.charCodeAt(0) & 0xf));
/** MSA -> Egyptian spoken replacements (whole words only) */
// NOTE: JS `\b` does not work with Arabic letters (verified in Node) -> use Arabic-aware lookarounds.
const W = (w) => new RegExp(`(?<![\\u0600-\\u06FF])${w}(?![\\u0600-\\u06FF])`, 'g');
const EGY = [
  [W('ثلاثة'), 'تلاتة'], [W('ثمانية'), 'تمانية'], [W('اثنين'), 'اتنين'], [W('إثنين'), 'اتنين'], [W('ثلاث'), 'تلات'], [W('ثمان'), 'تمان'],
  [W('هذا'), 'ده'], [W('هذه'), 'دي'], [W('ماذا'), 'إيه'], [W('كيف'), 'إزاي'], [W('لماذا'), 'ليه'], [W('الآن'), 'دلوقتي'],
  [W('أيضًا'), 'كمان'], [W('أيضا'), 'كمان'], [W('جيد'), 'كويس'], [W('جداً'), 'خالص'], [W('جدًا'), 'خالص'],
  [/\s*×\s*/g, ' في '], [/\s*=\s*/g, ' يساوي '], [/\s*\+\s*/g, ' زائد '], [/\s*[-−]\s*(?=\d)/g, ' ناقص '],
];
/**
 * Text the engine should pronounce: digits -> Egyptian number words, a few MSA words -> Egyptian, symbols -> words.
 * Keeps the character length changes local so karaoke boundaries are mapped word-by-word (see speak()).
 */
export function phonetic(text) {
  let t = toLatinDigits(String(text));
  for (const [re, rep] of EGY) t = t.replace(re, rep);
  t = t.replace(/\d+/g, (d) => numWords(d));
  return t;
}
/** split into sentences on . ! ? ؟ … : (Arabic prose) keeping the terminator */
export function sentences(text) { return String(text).split(/(?<=[.!?؟…])\s+/).filter((x) => x.trim()); }

let current = null; // { cancelled, timer, utter }

export const speech = {
  get available() { return hasTTS(); },
  get speaking() { return !!current; },
  get enabled() { const s = store.profile?.settings?.explain; return s ? s.tts !== false : true; },

  /**
   * Phase 11 K4: rank the installed Arabic voices by real-world quality (evidence: readium/speech ar.json).
   * Natural/Online (Edge Salma/Shakir), Google, Android and Apple premium voices beat the stiff offline
   * "Microsoft Hoda"; ar-EG beats other Arabic locales; a preferred gender (parent setting) breaks ties.
   */
  rank(v, prefer = {}) {
    const name = (v.name || '').toLowerCase(), lang = (v.lang || '').toLowerCase().replace('_', '-');
    let sc = 0;
    if (!/^ar/.test(lang)) return -1;
    if (/natural|neural|online/.test(name)) sc += 50;
    if (/google|android|premium|enhanced|siri/.test(name)) sc += 30;
    if (/^(majed|mariam|laila|tarik|maged)\b/.test(name)) sc += 15; // Apple ar-001 voices (high/normal quality per readium/speech)
    if (/hoda|naayf/.test(name)) sc -= 12; // known robotic offline voices (Windows SAPI)
    if (/^ar-eg/.test(lang)) sc += 20; else if (/^ar-(001|sa|xa)/.test(lang)) sc += 5;
    if (prefer.gender === 'female' && /salma|hoda|mariam|laila|zariyah|female|amany|f\b/.test(name)) sc += 3;
    if (prefer.gender === 'male' && /shakir|naayf|tarik|majed|hamed|male|m\b/.test(name)) sc += 3;
    if (v.localService === false) sc += 2; // cloud voices are almost always the better ones
    return sc;
  },
  voices() { if (!hasTTS()) return []; const pref = store.profile?.settings?.explain || {}; return speechSynthesis.getVoices().map((v) => ({ v, sc: this.rank(v, pref) })).filter((x) => x.sc >= 0).sort((a, b) => b.sc - a.sc).map((x) => x.v); },
  voice() {
    if (!hasTTS()) return null;
    const pref = store.profile?.settings?.explain?.voice;
    const vs = speechSynthesis.getVoices();
    if (pref) { const pv = vs.find((v) => v.name === pref); if (pv) return pv; } // parent-chosen voice wins
    return this.voices()[0] || null;
  },
  /** is the chosen voice a high quality (neural) one? -> slightly faster natural rate */
  isNatural(v) { return !!v && /natural|neural|online|google|premium|enhanced/i.test(v.name || ''); },

  /** speak text; resolves when finished (or cancelled). Highlights words through onWord. */
  speak(text, { rate, pitch = 1.05, onWord, onEnd, onStart } = {}) {
    this.stop();
    const words = tokenize(text);
    const r = rate ?? (store.profile?.settings?.explain?.rate ?? 0.9); // karaoke fallback pacing
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

    // Phase 11 K4: one utterance per sentence (natural pauses/intonation), spoken text is the Egyptian phonetic
    // version while the karaoke indexes still refer to the displayed words (same word count per sentence is
    // not guaranteed, so boundaries are mapped proportionally inside each sentence).
    const v = this.voice();
    const rr = rate ?? (store.profile?.settings?.explain?.rate ?? (this.isNatural(v) ? 0.95 : 0.9));
    const sents = sentences(text); let wordBase = 0; const parts = sents.map((st) => { const n = tokenize(st).length; const part = { st, wordBase, n, spoken: phonetic(st) }; part.spokenWords = tokenize(part.spoken); wordBase += n; return part; });
    let usedBoundary = false, fallbackStarted = false, started = false, k = 0;
    return new Promise((resolve) => {
      const next = () => {
        if (state.cancelled) { resolve(); return; }
        if (k >= parts.length) { finish(); resolve(); return; }
        const part = parts[k++];
        try {
          const u = new SpeechSynthesisUtterance(part.spoken); state.utter = u;
          u.lang = 'ar-EG'; u.rate = rr; u.pitch = pitch; if (v) u.voice = v;
          u.onstart = () => { if (!started) { started = true; onStart?.(); onWord?.(part.wordBase, words[part.wordBase]?.w); state.timer = setTimeout(() => { if (!usedBoundary && !state.cancelled) { fallbackStarted = true; schedule(); } }, 900); } else if (!fallbackStarted) onWord?.(part.wordBase, words[part.wordBase]?.w); };
          u.onboundary = (e) => { if (fallbackStarted) return; usedBoundary = true; clearTimeout(state.timer); const si = part.spokenWords.findIndex((w) => e.charIndex >= w.start && e.charIndex < w.end); if (si < 0) return; const idx = part.wordBase + Math.min(part.n - 1, Math.round(si * (part.n / Math.max(1, part.spokenWords.length)))); onWord?.(idx, words[idx]?.w); };
          u.onend = () => { if (fallbackStarted) return; next(); };
          u.onerror = () => { if (!fallbackStarted && !state.cancelled) { fallbackStarted = true; if (!started) onStart?.(); schedule(); } resolve(); };
          if (k === 1) speechSynthesis.cancel();
          speechSynthesis.speak(u);
          if (k === 1) state.timer = setTimeout(() => { if (!state.cancelled && !usedBoundary && !fallbackStarted && !speechSynthesis.speaking) { fallbackStarted = true; onStart?.(); schedule(); } }, 1200); // Chrome may never fire onstart when no voice exists
        } catch { if (!fallbackStarted) { fallbackStarted = true; onStart?.(); schedule(); } resolve(); }
      };
      next();
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
