/**
 * Phase 13 - unified voice provider for the explain sheet (owner-approved chain, gist 5e7813f5):
 *
 *   1. clips   - pre-recorded Egyptian clips on one <audio> (works without an OS Arabic voice, and on iOS in
 *                silent mode). Used whenever EVERY segment of the text has a clip.
 *   2. speech  - speech.js (Web Speech API, Egyptian phonetic layer, 12.2 pacing guard) for text without clips
 *                (e.g. free-text questions of other subjects) or when <audio> playback is refused.
 *   3. visual  - speech.js already degrades to the paced karaoke when no voice speaks (12.2).
 *
 * Same call shape as speech.speak(text, { rate, onWord(i), onEnd, onStart }) so callers switch with one import.
 * `last` exposes which provider handled the latest call (E2E + parent diagnostics).
 */
import speech from '../speech.js';
import clips from './clipsProvider.js';
import log from './log.js';

const state = { last: null, pref: 'auto' };
clips.ready(); // fetch the small manifest early (HTTP cache afterwards)

/** words of `text` from index `from` (whitespace tokens, same as the karaoke) */
const tail = (text, from) => { const re = /\S+/g; let m, i = 0; while ((m = re.exec(text))) { if (i === from) return text.slice(m.index); i++; } return ''; };

function viaSpeech(text, opts, offset = 0) {
  state.last = 'speech';
  const { onWord } = opts;
  return speech.speak(text, { ...opts, onWord: onWord ? (i, w) => onWord(i + offset, w) : undefined });
}

export function speak(text, opts = {}) {
  stop();
  if (!opts.noLog) log.add({ kind: 'explain', text }); // Phase 14: parent can read/copy every spoken line
  const useClips = state.pref !== 'speech' && clips.canSpeak(text);
  if (useClips) {
    state.last = 'clips';
    const p = clips.speak(text, {
      ...opts,
      // <audio> refused (policy/decoding): continue with speech.js from the word we reached - never flash to the end
      onBlocked: (from) => { const rest = tail(text, from); if (rest) viaSpeech(rest, opts, from); else opts.onEnd?.(); },
    });
    if (p) return p;
  }
  return viaSpeech(text, opts);
}

export function stop() { clips.stop(); speech.stop(); }
export const preload = (texts) => clips.preload(texts);
export const ready = () => clips.ready();

/** called inside the first user gesture (explainSheet button): unlock BOTH engines in the same gesture */
export function unlock() { clips.unlock(); speech.warm?.(); }

/** parent diagnostics: what can this device actually do right now? */
export async function diagnose() {
  const ok = await clips.ready();
  let vs = []; try { vs = speech.available ? speech.voices() : []; } catch { vs = []; }
  return { clips: ok, clipCount: clips.count(), tts: speech.available, arabicVoices: vs.map((v) => `${v.name} (${v.lang})`), provider: ok ? 'clips' : vs.length ? 'speech' : 'visual' };
}

const voice = { speak, stop, preload, ready, unlock, diagnose, get last() { return state.last; }, set pref(v) { state.pref = v; }, get pref() { return state.pref; } };
if (typeof window !== 'undefined') window.__voice = voice; // E2E hook (read-only)
export default voice;
