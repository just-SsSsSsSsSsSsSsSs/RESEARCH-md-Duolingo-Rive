/**
 * Phase 17 - Companion Cast: many characters, one small state machine (the Duolingo/Rive idea, implemented on the
 * Web Animations API with rendered sprites - no runtime dependency).
 *
 *   mount(card, { subject })  -> element (compatible with mascot.mount)
 *   mood(card, name)          -> 'idle' | 'think' | 'happy' | 'encourage' | 'celebrate' (compatible with mascot.mood)
 *   pick(subject)             -> companion entry chosen for this session (cast rotation, child's favourite wins)
 *   list() / setFavourite(id) -> for the profile picker
 *
 * Idle is NEVER static: a scheduler runs random micro-actions (breath, blink-squash, glance tilt, little hop,
 * curious lean) drawn from a shuffled bag with no immediate repeats, at random intervals. Reactions (happy /
 * encourage / celebrate) are short WAAPI sequences on the whole sprite; poses swap by opacity only (no layout).
 * Everything is transform/opacity (compositor-only) and stops under prefers-reduced-motion.
 * The element is decorative: aria-hidden, pointer-events none, and never covers text or buttons (CSS reserves room).
 */
import { el } from '../ui/components.js';
import legacy from '../ui/mascot.js'; // Phase 16 inline-SVG monkey: the fallback when a sprite fails (the corner is never empty)
import store from '../core/store.js';
import { APP_VERSION } from '../core/version.js';

/* every runtime asset carries ?v=APP_VERSION (cache-bust rule, see tests/cachebust.py) */
const vurl = (rel, base) => { const u = new URL(rel, base); u.searchParams.set('v', APP_VERSION); return u.href; };
const DATA_URL = vurl('../../content/companions.json', import.meta.url);
let data = null, loading = null;
export function ready() {
  if (data) return Promise.resolve(data);
  return (loading ||= fetch(DATA_URL).then((r) => r.json()).then((d) => (data = d)).catch(() => (data = { poses: [], companions: [] })));
}
export const list = () => data?.companions || [];
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const FALLBACK = { think: 'idle', celebrate: 'happy' };

/** sprite URL for a pose (missing pose -> fallback pose -> idle) */
export function spriteUrl(c, pose) {
  const dir = new URL(c.dir + '/', DATA_URL).href;
  const has = (p) => !c.files || c.files[p];
  const p = has(pose) ? pose : has(FALLBACK[pose]) ? FALLBACK[pose] : 'idle';
  return vurl(c.files?.[p] || `${p}.webp`, dir);
}

/* ---------- cast rotation ---------- */
const prefs = () => (store.profile ? (store.profile.settings ||= {}) : {});
export const favourite = () => prefs().companion || '';
export function setFavourite(id) { if (!store.profile) return; prefs().companion = id || ''; store.save(true); }

export function pick(subject) {
  const all = list(); if (!all.length) return null;
  const fav = all.find((c) => c.id === favourite()); if (fav) return fav;
  const own = all.filter((c) => c.subjects.includes(subject));
  const pool = (own.length ? own : all.filter((c) => c.subjects.includes('*'))) || all;
  const cands = pool.length ? pool : all;
  const last = store.meta.lastCompanion;
  const fresh = cands.length > 1 ? cands.filter((c) => c.id !== last) : cands;
  const c = fresh[Math.floor(Math.random() * fresh.length)];
  store.meta.lastCompanion = c.id; store.saveMeta?.();
  return c;
}

/* ---------- idle micro-actions (a shuffled bag, no immediate repeat) ---------- */
const IDLE = {
  breath: [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.035) translateY(-1px)' }, { transform: 'scaleY(1)' }],
  blink: [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.92) translateY(3px)', offset: .5 }, { transform: 'scaleY(1)' }],
  glance: [{ transform: 'rotate(0)' }, { transform: 'rotate(-7deg)', offset: .3 }, { transform: 'rotate(-7deg)', offset: .7 }, { transform: 'rotate(0)' }],
  hop: [{ transform: 'translateY(0)' }, { transform: 'translateY(-9px) scaleY(1.04)', offset: .45 }, { transform: 'translateY(0) scaleY(.96)', offset: .8 }, { transform: 'translateY(0)' }],
  lean: [{ transform: 'rotate(0) translateX(0)' }, { transform: 'rotate(6deg) translateX(3px)', offset: .5 }, { transform: 'rotate(0) translateX(0)' }],
  wiggle: [{ transform: 'rotate(0)' }, { transform: 'rotate(4deg)', offset: .25 }, { transform: 'rotate(-4deg)', offset: .75 }, { transform: 'rotate(0)' }],
};
const IDLE_MS = { breath: 2600, blink: 260, glance: 1800, hop: 620, lean: 1500, wiggle: 700 };
const REACT = {
  happy: [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-16px) rotate(-6deg) scale(1.08)', offset: .3 }, { transform: 'translateY(0) rotate(4deg)', offset: .55 }, { transform: 'translateY(-10px) rotate(-3deg) scale(1.05)', offset: .75 }, { transform: 'translateY(0) rotate(0)' }],
  encourage: [{ transform: 'rotate(0)' }, { transform: 'rotate(-9deg) translateY(2px)', offset: .25 }, { transform: 'rotate(7deg)', offset: .5 }, { transform: 'rotate(-6deg)', offset: .75 }, { transform: 'rotate(0)' }],
  celebrate: [{ transform: 'translateY(0) scale(1) rotate(0)' }, { transform: 'translateY(-22px) scale(1.15) rotate(-10deg)', offset: .35 }, { transform: 'translateY(-6px) scale(1.1) rotate(10deg)', offset: .6 }, { transform: 'translateY(0) scale(1) rotate(0)' }],
  think: [{ transform: 'rotate(0)' }, { transform: 'rotate(8deg) translateX(-2px)', offset: .6 }, { transform: 'rotate(8deg) translateX(-2px)' }],
};
const REACT_MS = { happy: 1300, encourage: 1400, celebrate: 1500, think: 900 };
const HOLD_MS = { happy: 2400, encourage: 2600, celebrate: 3200, think: 4000 };

function bag(keys) { let b = []; let last = null; return () => { if (!b.length) { b = keys.slice().sort(() => Math.random() - .5); if (b[b.length - 1] === last && b.length > 1) b.unshift(b.pop()); } last = b.pop(); return last; }; }

class Rig {
  constructor(root, c) {
    this.root = root; this.c = c; this.stage = root.querySelector('.cp-stage'); this.mood = 'idle';
    this.next = bag(Object.keys(IDLE)); this.timer = 0; this.anim = null; this.hold = 0; this.log = [];
    this.schedule(600);
  }
  alive() { return this.root.isConnected; }
  schedule(ms) { clearTimeout(this.timer); this.timer = setTimeout(() => this.tick(), ms); }
  tick() {
    if (!this.alive()) return this.stop();
    if (this.mood !== 'idle' || reduce() || document.hidden) return this.schedule(900);
    const k = this.next(); this.log.push(k); if (this.log.length > 40) this.log.shift();
    this.root.dataset.action = k;
    this.play(IDLE[k], IDLE_MS[k]);
    this.schedule(IDLE_MS[k] + 500 + Math.random() * 1800);
  }
  play(frames, ms, opts = {}) {
    this.anim?.cancel();
    this.anim = this.stage.animate(frames, { duration: ms, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'none', ...opts });
    return this.anim;
  }
  show(pose) {
    this.mood = pose; this.root.dataset.mood = pose;
    this.root.querySelectorAll('.cp-pose').forEach((im) => { im.style.opacity = im.dataset.pose === pose ? '1' : '0'; });
  }
  react(name) {
    if (!REACT[name]) name = 'idle';
    clearTimeout(this.hold);
    if (name === 'idle') { this.show('idle'); return; }
    this.show(name);
    if (!reduce()) this.play(REACT[name], REACT_MS[name], { iterations: name === 'think' ? 1 : 1 });
    this.hold = setTimeout(() => { if (this.alive()) { this.show('idle'); this.schedule(300); } }, HOLD_MS[name]);
  }
  stop() { clearTimeout(this.timer); clearTimeout(this.hold); this.anim?.cancel(); }
}

const rigs = new WeakMap();

export function mount(card, { subject = '' } = {}) {
  if (!card) return null;
  card.querySelector(':scope > .mascot')?.remove();
  const c = pick(subject) || { id: 'none', name: '', dir: '.', files: {}, subjects: [] };
  const poses = (data?.poses?.length ? data.poses : ['idle', 'happy', 'encourage']);
  const imgs = poses.map((p) => `<img class="cp-pose" data-pose="${p}" alt="" decoding="async" src="${spriteUrl(c, p)}" style="opacity:${p === 'idle' ? 1 : 0}">`).join('');
  const m = el(`<div class="mascot companion is-3d" data-companion="${c.id}" data-mood="idle" aria-hidden="true" title="${c.name}"><span class="cp-stage m-3d" style="display:block">${imgs}</span></div>`);
  card.appendChild(m);
  const rig = new Rig(m, c); rigs.set(m, rig);
  // sprite failure (offline / blocked): drop the companion and mount the code-drawn monkey instead
  const idle = m.querySelector('.cp-pose[data-pose="idle"]');
  idle.addEventListener('error', () => { if (!m.isConnected) return; rig.stop(); rigs.delete(m); m.remove(); legacy.mount(card); window.__companion = { id: 'fallback', name: '', el: card.querySelector(':scope > .mascot'), rig: null }; }, { once: true });
  window.__companion = { id: c.id, name: c.name, el: m, rig };
  // entrance: slide in from the card edge
  if (!reduce()) m.animate([{ transform: 'translateY(18px) scale(.6)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  return m;
}

export function mood(card, name = 'idle') {
  const m = card?.querySelector(':scope > .mascot');
  const rig = m && rigs.get(m);
  if (!rig) { if (m) legacy.mood(card, name); return; }
  rig.react(name);
  window.__lastMascot = { mood: name, at: Date.now(), companion: rig.c.id };
}

export default { ready, list, pick, mount, mood, favourite, setFavourite, spriteUrl };
