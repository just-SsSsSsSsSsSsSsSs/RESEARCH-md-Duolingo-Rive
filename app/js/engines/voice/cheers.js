/**
 * Phase 14 - spoken encouragement (PROJECT_VISION.md): birr al-walidayn, sibling love, dhikr, effort.
 *
 *   cheers.say(event)  event: 'correct' | 'recovered' | 'wrong' | 'finish'  -> { id, text } | null
 * Picks a line for the CURRENT hero (store.hero.id, bank `for`), never the same line twice in a row and cycling
 * through the whole pool before repeating (a "bag" per hero+event), plays the recorded clip on its own <audio>
 * (the explain voice is stopped first - one human voice at a time), shows the text as a subtitle and appends it to
 * the parent log (voice/log.js). Parent switch: settings.explain.cheers === false -> silent, text still logged.
 *
 * Voice packs: app/content/audio/cheers/<voiceKey>/manifest.json; voiceKey = settings.explain.voicePack or the
 * default pack. The bank text is the source of truth; the manifest hash tells whether a clip matches it.
 */
import store from '../../core/store.js';
import { APP_VERSION } from '../../core/version.js';
import clips from './clipsProvider.js';
import log from './log.js';

const ROOT = new URL('../../../content/', import.meta.url.split('?')[0]);
export const DEFAULT_PACK = 'shab_masri';
export const PACKS = { shab_masri: 'شاب مصري حماسي' };
const u = (p) => { const x = new URL(p, ROOT); x.searchParams.set('v', APP_VERSION); return x.href; };

let bank = null, manifest = null, packKey = null, loading = null, el = null;
const bags = new Map(); let lastId = null;

const settings = () => store.profile?.settings?.explain || {};
const pack = () => (PACKS[settings().voicePack] ? settings().voicePack : DEFAULT_PACK);

export function ready() {
  const want = pack();
  if (bank && manifest && packKey === want) return Promise.resolve(true);
  if (loading && packKey === want) return loading;
  packKey = want;
  loading = Promise.all([
    bank ? bank : fetch(u('cheers/bank.json')).then((r) => r.json()),
    fetch(u(`audio/cheers/${want}/manifest.json`)).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]).then(([b, m]) => { bank = b; manifest = m; return !!bank; }).catch(() => false);
  return loading;
}

/** lines of the bank that fit this hero and event */
export function pool(event, heroId) {
  if (!bank) return [];
  return bank.lines.filter((l) => l.ev === event && (l.for.includes('all') || l.for.includes(heroId)));
}

function pick(event, heroId) {
  const all = pool(event, heroId); if (!all.length) return null;
  const k = heroId + ':' + event; let bag = bags.get(k);
  if (!bag || !bag.length) { bag = all.map((l) => l.id).sort(() => Math.random() - 0.5); if (bag.length > 1 && bag[bag.length - 1] === lastId) bag.unshift(bag.pop()); bags.set(k, bag); }
  const id = bag.pop(); lastId = id; return all.find((l) => l.id === id) || all[0];
}

const audio = () => { if (!el) { el = new Audio(); el.preload = 'auto'; el.setAttribute('playsinline', ''); } return el; };

/** subtitle: the exact words the child hears, above the bottom bar, auto-hides */
function subtitle(text, ms) {
  let s = document.querySelector('.voice-sub');
  if (!s) { s = document.createElement('div'); s.className = 'voice-sub'; s.setAttribute('role', 'status'); s.setAttribute('aria-live', 'polite'); s.dir = 'rtl'; document.body.appendChild(s); }
  s.textContent = text; s.classList.remove('out'); s.hidden = false;
  clearTimeout(s._t); s._t = setTimeout(() => { s.classList.add('out'); setTimeout(() => { s.hidden = true; }, 400); }, Math.max(2600, ms + 900));
}

let busyUntil = 0, reqId = 0;
export function stop() { busyUntil = 0; if (el) { try { el.pause(); } catch { /* noop */ } } }

export async function say(event) {
  await ready(); if (!bank) return null;
  const hero = store.hero?.id || 'selim'; const line = pick(event, hero); if (!line) return null;
  const c = manifest?.lines?.[line.id]; const on = settings().cheers !== false;
  log.add({ kind: 'cheer', event, id: line.id, text: line.text, src: line.src, review: !!line.review, voiced: !!(on && c) });
  subtitle(line.text, c?.ms || 2000);
  if (on && c) {
    clips.stop(); // one human voice at a time
    const a = audio(); a.src = u(`audio/cheers/${packKey}/${c.file}`);
    // Phase 15.1: busy from the request (play() is async), not only while !paused. Only THIS request's rejection may
    // clear it: an older play() interrupted by this new src rejects later and must not free the newer line.
    const req = ++reqId; busyUntil = Date.now() + (c.ms || 2000) + 400;
    a.play().catch(() => { if (req === reqId) busyUntil = 0; /* refused/offline: the subtitle already shows the words */ });
  }
  window.__lastCheer = { id: line.id, event, hero, text: line.text, voiced: !!(on && c) }; // E2E hook (read-only)
  return line;
}

/** Phase 15.1: the question voice waits while a cheer is still speaking (a verse/hadith is never cut) */
// true from the moment a line is requested until it ends (clip length + margin as a guard if 'ended' never fires)
export const playing = () => !!el && !el.ended && (Date.now() < busyUntil || (!el.paused && el.currentTime > 0));

const cheers = { ready, say, stop, pool, playing, PACKS, DEFAULT_PACK };
if (typeof window !== 'undefined') window.__cheers = cheers;
export default cheers;
