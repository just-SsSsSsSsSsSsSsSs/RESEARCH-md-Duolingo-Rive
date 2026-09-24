/**
 * Phase 13 - concatenative voice: split an explanation text into recorded clips.
 *
 * PURE module (no DOM, no store) - the SAME code runs at build time (tools/explain_segments.mjs, Node) and at
 * runtime (clipsProvider.js, browser), so a clip key produced while recording is exactly the key looked up
 * while speaking.
 *
 *   segment(text) -> [{ k, s, e }]   k = 'f:<fragment text>' | 'n:<integer>' ; [s,e) = char range in `text`
 *
 * Rules (measured on explain.js output: 4,813 distinct sentences = 190 static fragments + numbers):
 *  - sentences are split exactly like speech.js `sentences()` (terminator . ! ? ؟ … followed by spaces);
 *  - inside a sentence, every digit run (Arabic-Indic or Latin) is a number clip 'n:<value>';
 *  - the text between numbers (trimmed, inner whitespace collapsed) is a fragment clip 'f:<text>' when it is
 *    speakable (contains an Arabic letter or a math symbol that is read aloud); pure punctuation/brackets are
 *    skipped (no audio, the karaoke still highlights their word).
 */
const DIGITS = /[\u0660-\u0669\u06F0-\u06F90-9]+/g;
const SPEAKABLE = /[\u0621-\u064A]|[×=+−]/;
const SENT_END = /[.!?؟…]\s+/g;

/** Arabic-Indic / Persian / Latin digits -> integer */
export function toInt(d) { let n = 0; for (const ch of d) { const c = ch.charCodeAt(0); n = n * 10 + (c >= 0x6F0 ? c - 0x6F0 : c >= 0x660 ? c - 0x660 : c - 48); } return n; }

/** canonical fragment key text: trimmed, whitespace collapsed */
export const normFrag = (t) => String(t).replace(/\s+/g, ' ').trim();

/** [start, end) offsets of each sentence (same boundaries as speech.js sentences()) */
export function sentenceRanges(text) {
  const out = []; let s = 0; let m; SENT_END.lastIndex = 0;
  while ((m = SENT_END.exec(text))) { const e = m.index + 1; if (text.slice(s, e).trim()) out.push([s, e]); s = m.index + m[0].length; }
  if (text.slice(s).trim()) out.push([s, text.length]);
  return out;
}

export function segment(text) {
  text = String(text ?? ''); const segs = [];
  const frag = (a, b) => {
    const raw = text.slice(a, b); const t = normFrag(raw); if (!t || !SPEAKABLE.test(t)) return;
    const lead = raw.length - raw.trimStart().length, trail = raw.length - raw.trimEnd().length;
    segs.push({ k: 'f:' + t, s: a + lead, e: b - trail });
  };
  for (const [s, e] of sentenceRanges(text)) {
    const sent = text.slice(s, e); let last = 0, m; DIGITS.lastIndex = 0;
    while ((m = DIGITS.exec(sent))) {
      frag(s + last, s + m.index);
      segs.push({ k: 'n:' + toInt(m[0]), s: s + m.index, e: s + m.index + m[0].length });
      last = m.index + m[0].length;
    }
    frag(s + last, e);
  }
  return segs;
}

/** word index (as /\S+/ tokens, same as speech.js tokenize + explainSheet karaoke) -> owning segment index.
 *  A word belongs to the segment that contains its first *speakable* char; words with none (e.g. "(") inherit
 *  the next segment so the highlight never runs ahead of the voice. Returns per-segment arrays of word indices. */
export function wordsBySegment(text, segs) {
  const words = []; const re = /\S+/g; let m; while ((m = re.exec(text))) words.push([m.index, m.index + m[0].length]);
  const per = segs.map(() => []); let j = 0;
  words.forEach(([a, b], i) => {
    while (j < segs.length && segs[j].e <= a) j++;
    let owner = -1;
    for (let k = j; k < segs.length && segs[k].s < b; k++) { if (segs[k].e > a) { owner = k; break; } }
    if (owner < 0) owner = Math.min(j, segs.length - 1);
    if (owner >= 0) per[owner].push(i);
  });
  return { per, count: words.length };
}

export default { segment, wordsBySegment, sentenceRanges, toInt, normFrag };
