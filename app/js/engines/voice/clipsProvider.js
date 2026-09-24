/**
 * Phase 13 - clips provider: speaks explain text with pre-recorded Egyptian clips (Fish Audio, build time)
 * through ONE shared <audio> element.
 *
 * Why <audio> and not Web Audio: on iOS Safari Web Audio is muted by the ring/silent switch while
 * HTMLAudioElement keeps playing (feross/unmute-ios-audio); and it needs no OS voice pack, so it also works on
 * Android phones without an Arabic TTS voice (the owner's field test after Phase 12.2).
 *
 * Contract (same shape as speech.speak so explainSheet swaps providers without touching the karaoke):
 *   canSpeak(text)  -> true when EVERY segment of the text has a recorded clip (manifest loaded)
 *   speak(text, { rate, onWord(i), onEnd, onStart, onBlocked(fromWord) }) -> Promise | null
 *        null = text not fully covered by clips -> caller falls back; onBlocked = play() rejected -> caller falls back
 *   stop()
 *   ready()         -> Promise<boolean>   manifest loaded
 *   unlock()        -> call inside the first user gesture (plays a muted empty source once)
 * Karaoke: each segment owns display words (segments.wordsBySegment); inside a clip the words advance on the
 * clip's real playback position (`currentTime / duration`, weighted by word length) -> in step with the voice.
 */
import { APP_VERSION } from '../../core/version.js';
import { segment, wordsBySegment } from './segments.js';

const BASE = new URL('../../../content/audio/explain/', import.meta.url.split('?')[0]);
let manifest = null, loading = null;
let el = null;                 // the single shared <audio>
let run = null;                // current playback { cancelled, finish }
let unlocked = false;

const url = (file) => { const u = new URL(file, BASE); u.searchParams.set('v', APP_VERSION); return u.href; };
const audio = () => {
  if (el) return el;
  el = new Audio(); el.preload = 'auto'; el.setAttribute('playsinline', ''); el.setAttribute('webkit-playsinline', '');
  return el;
};

export function ready() {
  if (manifest) return Promise.resolve(true);
  if (!loading) loading = fetch(url('manifest.json')).then((r) => (r.ok ? r.json() : null)).then((m) => { manifest = m?.clips ? m : null; return !!manifest; }).catch(() => false);
  return loading;
}
export const loaded = () => !!manifest;
export const clip = (k) => manifest?.clips?.[k] || null;
export const count = () => (manifest ? Object.keys(manifest.clips).length : 0);

export function canSpeak(text) {
  if (!manifest) return false;
  const segs = segment(text);
  return segs.length > 0 && segs.every((s) => !!manifest.clips[s.k]);
}

export function unlock() {
  if (unlocked) return; unlocked = true;
  // Muted play of a tiny clip inside the gesture = the element is "activated" for later programmatic play().
  // Race guard: speak() usually replaces src in the same tick; only pause/unmute if OUR unlock src is still loaded,
  // otherwise we would pause the real explanation that started meanwhile.
  try {
    const a = audio(); const src = url('n/1.mp3'); a.muted = true; a.src = src; const p = a.play();
    const settle = () => { if (a.src === src) { a.pause(); a.currentTime = 0; } if (a.src === src || !run) a.muted = false; };
    p?.then?.(settle).catch(settle);
  } catch { /* noop */ }
}

export function stop() {
  if (run) { run.cancelled = true; run = null; }
  if (el) { try { el.pause(); el.onended = el.ontimeupdate = el.onerror = null; } catch { /* noop */ } }
}

/** warm the HTTP cache for the clips of a text (called when the sheet opens, before the tap on "replay") */
export function preload(texts) {
  if (!manifest) return;
  const seen = new Set();
  for (const t of texts) for (const s of segment(t)) { const c = manifest.clips[s.k]; if (c && !seen.has(c.file)) { seen.add(c.file); fetch(url(c.file)).catch(() => {}); } }
}

export function speak(text, { rate = 1, onWord, onEnd, onStart, onBlocked } = {}) {
  if (!canSpeak(text)) return null;
  stop();
  const segs = segment(text); const { per } = wordsBySegment(text, segs);
  const me = { cancelled: false }; run = me; const a = audio();
  a.muted = false; a.playbackRate = Math.min(1.25, Math.max(0.6, rate || 1));
  let k = 0, lastWord = -1, started = false;
  const word = (i) => { if (i > lastWord && i >= 0) { lastWord = i; onWord?.(i); } };
  const done = () => { if (me.cancelled) return; me.cancelled = true; if (run === me) run = null; a.onended = a.ontimeupdate = a.onerror = null; onEnd?.(); };
  return new Promise((resolve) => {
    const next = () => {
      if (me.cancelled) { resolve(); return; }
      if (k >= segs.length) { done(); resolve(); return; }
      const i = k++; const c = manifest.clips[segs[i].k]; const ws = per[i];
      // word weights inside the clip = character length (a long word takes longer to say)
      const lens = ws.map((w) => Math.max(1, (text.match(/\S+/g) || [])[w]?.length || 1)); const tot = lens.reduce((x, y) => x + y, 0) || 1;
      const cum = []; lens.reduce((acc, l) => { cum.push(acc / tot); return acc + l; }, 0);
      if (ws.length) word(ws[0]);
      a.ontimeupdate = () => { if (me.cancelled) return; const d = a.duration || c.ms / 1000; const p = d ? a.currentTime / d : 0; for (let j = ws.length - 1; j >= 0; j--) if (p >= cum[j]) { word(ws[j]); break; } };
      a.onended = () => { if (!me.cancelled) next(); };
      a.onerror = () => { if (!me.cancelled) next(); }; // one broken file must not stop the explanation
      a.src = url(c.file);
      a.playbackRate = Math.min(1.25, Math.max(0.6, rate || 1));
      const p = a.play();
      if (!started) { started = true; onStart?.(); }
      // play() rejected (autoplay policy / decode): NOT an end - never mark all words said (that was the 12.2 flash).
      // Hand over to the caller's fallback from the word we reached.
      p?.catch?.(() => { if (me.cancelled) return; me.cancelled = true; if (run === me) run = null; a.onended = a.ontimeupdate = a.onerror = null; onBlocked?.(Math.max(0, lastWord)); resolve(); });
    };
    next();
  });
}

const clips = { ready, loaded, clip, count, canSpeak, speak, stop, preload, unlock, get playing() { return !!run; } };
if (typeof window !== 'undefined') window.__clips = clips; // E2E hook (read-only)
export default clips;
