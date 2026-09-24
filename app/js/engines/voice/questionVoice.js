/**
 * Phase 15.1 - the math question is read aloud when it appears (owner decision, gist c5203c99):
 * Karma (5) and younger children hear the question they cannot read yet.
 *
 * Only the pre-recorded Egyptian clips are used (Phase 13 library, app/content/audio/explain) - no new recording,
 * no API key. Every sentence built here was measured to be 100% covered by the manifest for every question the
 * generators can produce (app/tests/phase15_1_question_voice.py checks it on thousands of generated questions).
 * If a sentence is ever not covered, the question simply stays silent (no robotic OS voice for questions).
 *
 *   sentence(q)  -> string | ''   PURE: built from q.meta (numbers), never from the display text, so "×" is read
 *                                 "في" and the answer is never spoken.
 *   say(q)       -> plays it (after a running cheer, never over it), logs it for the parent, returns the text
 *   stop()
 *   enabled()    -> parent switch settings.explain.readQuestion (default on)
 */
import store from '../../core/store.js';
import clips from './clipsProvider.js';
import log from './log.js';
import cheers from './cheers.js';

const AR = (n) => new Intl.NumberFormat('ar-EG').format(n);

/** spoken form of every generated math question kind (a x b = a groups of b; the answer is never included) */
export function sentence(q) {
  const m = q?.meta; if (!m) return '';
  const { a, b } = m;
  switch (m.kind) {
    case 'mult': return `${AR(a)} في ${AR(b)} يساوي كام؟`;
    case 'missing': return `${AR(a)} في كام يساوي ${AR(m.product)}؟`;
    case 'commutative': return `${AR(a)} في ${AR(b)} يساوي ${AR(b)} في كام؟`;
    case 'commutative_tf': return m.ans ? `${AR(a)} في ${AR(b)} يساوي ${AR(b)} في ${AR(a)}. صح ولا غلط؟` : `${AR(b)} في ${AR(a)} يساوي ${AR(m.wrong)}. صح ولا غلط؟`;
    case 'distributive':
      if (q.type === 'branch') return `${AR(a)} في ${AR(b)} يساوي كام؟`;
      return `${AR(a)} في ${AR(b)} يساوي ${AR(a)} في ${AR(m.s1)}، زائد ${AR(a)} في كام؟`;
    case 'distributive_sum': return `${AR(a)} في ${AR(m.s1)}، زائد ${AR(a)} في ${AR(m.s2)}، يساوي كام؟`;
    case 'grid': return `السؤال بيقول: كام نقطة في الشبكة؟ ${AR(a)} صفوف، وكل صف فيه ${AR(b)}.`;
    case 'pick': return `السؤال بيقول: اختار كل الأعداد اللي من مضاعفات ${AR(a)}.`;
    default: return '';
  }
}

const settings = () => store.profile?.settings?.explain || {};
export const enabled = () => settings().readQuestion !== false;

let token = 0;       // a newer say()/stop() cancels a pending one
let last = null;     // E2E hook


export async function say(q, { force = false } = {}) {
  const me = ++token;
  const text = sentence(q); if (!text) return null;
  if (!force && !enabled()) { last = { text, played: false, reason: 'off' }; window.__lastQuestionVoice = last; return null; }
  await clips.ready();
  if (me !== token) return null;
  if (!clips.canSpeak(text)) { last = { text, played: false, reason: 'no-clips' }; window.__lastQuestionVoice = last; return null; }
  // a Phase 14 cheer may still be speaking (max ~6s wait): never cut a verse/hadith, speak right after it
  for (let i = 0; i < 30 && cheers.playing(); i++) { await new Promise((r) => setTimeout(r, 200)); if (me !== token) return null; }
  log.add({ kind: 'question', text });
  last = { text, played: true, at: Date.now() }; window.__lastQuestionVoice = last; // E2E hook (read-only)
  clips.speak(text, { rate: settings().rate || 0.9, onBlocked: () => { if (last) last.blocked = true; } });
  return text;
}

export function stop() { token++; clips.stop(); }

const questionVoice = { sentence, say, stop, enabled };
if (typeof window !== 'undefined') window.__questionVoice = questionVoice;
export default questionVoice;
