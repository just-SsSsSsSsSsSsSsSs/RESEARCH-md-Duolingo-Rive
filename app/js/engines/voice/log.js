/**
 * Phase 14 - "سجل الكلمات المنطوقة": every human line the app speaks (explanations + encouragement) is written
 * down so the parent can read, copy and ask for changes (owner request, gist 13c2784a).
 *
 * Stored separately from the child profile (key `ab:voicelog:v1`), newest first, capped at MAX entries so it can
 * never grow without bound. Each entry: { t, hero, kind: 'explain'|'cheer', event?, id?, text, src?, review? }.
 * Consecutive duplicates (e.g. "اسمع تاني" replay) are merged into one entry with a `n` counter.
 */
import store from '../../core/store.js';

const KEY = 'ab:voicelog:v1';
const MAX = 300;
const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const write = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); } catch { /* quota: keep app running */ } };

export function add(e) {
  if (!e?.text) return;
  const a = read(); const hero = store.hero?.id || null;
  const top = a[0];
  if (top && top.text === e.text && top.hero === hero) { top.n = (top.n || 1) + 1; top.t = Date.now(); write(a); return; }
  a.unshift({ t: Date.now(), hero, ...e }); write(a);
}
export const list = () => read();
export const clear = () => write([]);
/** plain text for the "نسخ" button: one line per entry, source kept for Quran/hadith lines */
export const asText = (entries = read()) => entries.map((e) => `${e.text}${e.src ? `  [${e.src}]` : ''}`).join('\n');

const log = { add, list, clear, asText, MAX };
if (typeof window !== 'undefined') window.__voiceLog = log;
export default log;
