/**
 * Phase 17 - Companion Cast: many characters, one small state machine (the Duolingo/Rive idea, implemented on the
 * Web Animations API with rendered sprites - no runtime dependency).
 *
 *   mount(card, { subject })  -> element (compatible with mascot.mount)
 *   mood(card, name)          -> 'idle' | 'think' | 'happy' | 'encourage' | 'celebrate' (compatible with mascot.mood)
 *   pick(subject)             -> companion entry chosen for this session (cast rotation, child's favourite wins)
 *   list() / setFavourite(id) -> for the profile picker
 *
 * Phase 18 - fluid motion (the "always alive" rig, still zero dependencies):
 *   - the same sprite is drawn twice as two CSS-mask layers (.cp-layer.body / .cp-layer.head) so the head can
 *     turn, peek and blink independently of the body (single-layer fallback when mask-image is unsupported);
 *   - a damped spring is sampled into a CSS linear() easing (spring()), with a cubic-bezier fallback;
 *   - breathing is an infinite alternating WAAPI loop on both layers (head phase-shifted by 120ms), and random
 *     micro-actions (blink, glance, peek, wiggle, hop, lean) are composed ON TOP with composite:'add' - the
 *     character is never frozen between actions; pose swaps get squash/stretch instead of a hard cut;
 *   - interaction: tickle (tap the companion -> giggle + hearts), lookAt(x,y) (head turns toward the tapped
 *     choice), anticipate() (leans in while the child types). A tap on the companion NEVER answers a question.
 * Everything is transform/opacity (compositor-only), pauses when the tab is hidden and stops under
 * prefers-reduced-motion. The element is decorative (aria-hidden) and never covers text or buttons.
 */
import { el } from '../ui/components.js';
import legacy from '../ui/mascot.js'; // Phase 16 inline-SVG monkey: the fallback when a sprite fails (the corner is never empty)
import store from '../core/store.js';
import { APP_VERSION } from '../core/version.js';
import fx from './fx.js';

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

/* ---------- spring -> CSS linear() easing (Phase 18) ---------- */
const LINEAR_OK = typeof CSS !== 'undefined' && CSS.supports?.('animation-timing-function', 'linear(0, 1)');
const MASK_OK = typeof CSS !== 'undefined' && (CSS.supports?.('mask-image', 'linear-gradient(#000, transparent)') || CSS.supports?.('-webkit-mask-image', 'linear-gradient(#000, transparent)'));
const BEZIER = 'cubic-bezier(.34,1.56,.64,1)';
/** damped spring sampled into linear(...) - the Rive/Duolingo feel without a runtime; bezier fallback */
export function spring(stiffness = 170, damping = 14, mass = 1, samples = 40) {
  if (!LINEAR_OK) return BEZIER;
  const w0 = Math.sqrt(stiffness / mass), zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const dur = 1; const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * dur * 1.0;
    let x;
    if (zeta < 1) { const wd = w0 * Math.sqrt(1 - zeta * zeta); x = 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t)); }
    else x = 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    pts.push(+x.toFixed(4));
  }
  pts[pts.length - 1] = 1;
  return `linear(${pts.join(', ')})`;
}
const EASE_SOFT = spring(120, 16);   // settles gently (breath shifts, lean, look)
const EASE_POP = spring(220, 11);    // overshoots (hop, tickle, celebrate)
export const easing = () => ({ linear: LINEAR_OK, soft: EASE_SOFT, pop: EASE_POP });

/* ---------- idle micro-actions (composed ON TOP of the breathing loop; layer = which part moves) ---------- */
const IDLE = {
  blink: { layer: 'head', ms: 240, frames: [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.9) translateY(2px)', offset: .5 }, { transform: 'scaleY(1)' }] },
  glance: { layer: 'head', ms: 1700, frames: [{ transform: 'rotate(0)' }, { transform: 'rotate(-9deg) translateX(-2px)', offset: .3 }, { transform: 'rotate(-9deg) translateX(-2px)', offset: .7 }, { transform: 'rotate(0)' }] },
  peek: { layer: 'head', ms: 1400, frames: [{ transform: 'translateX(0) rotate(0)' }, { transform: 'translateX(4px) rotate(7deg)', offset: .4 }, { transform: 'translateX(4px) rotate(7deg)', offset: .75 }, { transform: 'translateX(0) rotate(0)' }] },
  wiggle: { layer: 'head', ms: 700, frames: [{ transform: 'rotate(0)' }, { transform: 'rotate(5deg)', offset: .25 }, { transform: 'rotate(-5deg)', offset: .75 }, { transform: 'rotate(0)' }] },
  hop: { layer: 'stage', ms: 640, frames: [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px) scaleY(1.05) scaleX(.97)', offset: .45 }, { transform: 'translateY(0) scaleY(.95) scaleX(1.04)', offset: .8 }, { transform: 'translateY(0)' }] },
  lean: { layer: 'stage', ms: 1500, frames: [{ transform: 'rotate(0) translateX(0)' }, { transform: 'rotate(6deg) translateX(3px)', offset: .5 }, { transform: 'rotate(0) translateX(0)' }] },
};
const BREATH_MS = 3200;
const BREATH = {
  body: [{ transform: 'scaleY(1) scaleX(1)' }, { transform: 'scaleY(1.035) scaleX(.99) translateY(-.5px)' }],
  head: [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-1.6px) rotate(-1.2deg)' }],
};
const REACT = {
  happy: [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-16px) rotate(-6deg) scale(1.08)', offset: .3 }, { transform: 'translateY(0) rotate(4deg)', offset: .55 }, { transform: 'translateY(-10px) rotate(-3deg) scale(1.05)', offset: .75 }, { transform: 'translateY(0) rotate(0)' }],
  encourage: [{ transform: 'rotate(0)' }, { transform: 'rotate(-9deg) translateY(2px)', offset: .25 }, { transform: 'rotate(7deg)', offset: .5 }, { transform: 'rotate(-6deg)', offset: .75 }, { transform: 'rotate(0)' }],
  celebrate: [{ transform: 'translateY(0) scale(1) rotate(0)' }, { transform: 'translateY(-22px) scale(1.15) rotate(-10deg)', offset: .35 }, { transform: 'translateY(-6px) scale(1.1) rotate(10deg)', offset: .6 }, { transform: 'translateY(0) scale(1) rotate(0)' }],
  think: [{ transform: 'rotate(0)' }, { transform: 'rotate(8deg) translateX(-2px)', offset: .6 }, { transform: 'rotate(8deg) translateX(-2px)' }],
  tickle: [{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(-8deg) scale(1.08, .94)', offset: .2 }, { transform: 'rotate(8deg) scale(.95, 1.06)', offset: .45 }, { transform: 'rotate(-5deg) scale(1.04, .97)', offset: .7 }, { transform: 'rotate(0) scale(1)' }],
};
const REACT_POSE = { tickle: 'happy' };
const REACT_MS = { happy: 1300, encourage: 1400, celebrate: 1500, think: 900, tickle: 900 };
const HOLD_MS = { happy: 2400, encourage: 2600, celebrate: 3200, think: 4000, tickle: 1400 };

function bag(keys) { let b = []; let last = null; return () => { if (!b.length) { b = keys.slice().sort(() => Math.random() - .5); if (b[b.length - 1] === last && b.length > 1) b.unshift(b.pop()); } last = b.pop(); return last; }; }

class Rig {
  constructor(root, c) {
    this.root = root; this.c = c; this.stage = root.querySelector('.cp-stage'); this.mood = 'idle';
    this.body = root.querySelector('.cp-layer.body') || this.stage; this.head = root.querySelector('.cp-layer.head') || this.stage;
    this.layered = this.head !== this.body;
    this.next = bag(Object.keys(IDLE)); this.timer = 0; this.anim = null; this.hold = 0; this.look = 0; this.antic = 0; this.log = []; this.loops = [];
    this.onVis = () => { if (!this.alive()) return; this.loops.forEach((a) => (document.hidden ? a.pause() : a.play())); };
    document.addEventListener('visibilitychange', this.onVis);
    this.breathe(); this.schedule(500);
  }
  alive() { return this.root.isConnected; }
  /** infinite alternating breath on both layers (head phase-shifted) - the character is never still */
  breathe() {
    this.loops.forEach((a) => a.cancel()); this.loops = [];
    if (reduce()) return;
    const opts = { duration: BREATH_MS, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', fill: 'none' };
    this.loops.push(this.body.animate(BREATH.body, opts));
    if (this.layered) this.loops.push(this.head.animate(BREATH.head, { ...opts, delay: 120 }));
  }
  schedule(ms) { clearTimeout(this.timer); this.timer = setTimeout(() => this.tick(), ms); }
  tick() {
    if (!this.alive()) return this.stop();
    if (this.mood !== 'idle' || reduce() || document.hidden || this.root.dataset.anticipating) return this.schedule(900);
    const k = this.next(); this.log.push(k); if (this.log.length > 40) this.log.shift();
    const a = IDLE[k]; this.root.dataset.action = k;
    const target = a.layer === 'head' ? this.head : this.stage;
    // composed on top of the breathing loop (composite add) so breath never stops during a micro-action
    target.animate(a.frames, { duration: a.ms, easing: a.layer === 'head' ? EASE_SOFT : EASE_POP, fill: 'none', composite: 'add' });
    this.schedule(a.ms + 500 + Math.random() * 1600);
  }
  play(frames, ms, opts = {}) {
    this.anim?.cancel();
    this.anim = this.stage.animate(frames, { duration: ms, easing: EASE_POP, fill: 'none', ...opts });
    return this.anim;
  }
  show(pose) {
    const prev = this.root.dataset.pose || 'idle';
    this.mood = pose; this.root.dataset.mood = pose; this.root.dataset.pose = pose;
    this.root.querySelectorAll('.cp-pose').forEach((im) => { im.style.opacity = im.dataset.pose === pose ? '1' : '0'; });
    // squash & stretch on the swap: the pose change reads as a movement, not a cut
    if (prev !== pose && !reduce()) this.body.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.06,.94)', offset: .4 }, { transform: 'scale(.98,1.03)', offset: .7 }, { transform: 'scale(1,1)' }], { duration: 380, easing: EASE_SOFT, fill: 'none', composite: 'add' });
  }
  setMood(name) { this.react(name); }
  react(name) {
    if (!REACT[name]) name = 'idle';
    clearTimeout(this.hold);
    if (name === 'idle') { this.show('idle'); return; }
    this.show(REACT_POSE[name] || name);
    this.mood = name; this.root.dataset.mood = name;
    if (!reduce()) this.play(REACT[name], REACT_MS[name]);
    this.hold = setTimeout(() => { if (this.alive()) { this.show('idle'); this.schedule(300); } }, HOLD_MS[name]);
  }
  /** head turns toward a viewport point (a tapped choice / key); eases back after a moment */
  lookAt(x, y) {
    if (!this.alive()) return;
    const r = this.root.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height * .4;
    const dx = Math.max(-1, Math.min(1, (x - cx) / Math.max(120, innerWidth / 2))), dy = Math.max(-1, Math.min(1, (y - cy) / Math.max(120, innerHeight / 2)));
    const rot = (dx * 10).toFixed(1), tx = (dx * 4).toFixed(1), ty = (dy * 3).toFixed(1);
    this.root.dataset.look = `${dx > .15 ? 'right' : dx < -.15 ? 'left' : 'center'}`;
    window.__companionLook = { dx: +dx.toFixed(2), dy: +dy.toFixed(2), at: Date.now() };
    if (reduce()) return;
    clearTimeout(this.look);
    this.head.animate([{ transform: 'rotate(0) translate(0,0)' }, { transform: `rotate(${rot}deg) translate(${tx}px, ${ty}px)`, offset: .25 }, { transform: `rotate(${rot}deg) translate(${tx}px, ${ty}px)`, offset: .7 }, { transform: 'rotate(0) translate(0,0)' }], { duration: 1400, easing: EASE_SOFT, fill: 'none', composite: 'add' });
    this.look = setTimeout(() => { if (this.alive()) delete this.root.dataset.look; }, 1500);
  }
  /** leans in while the child is working (first numpad digit); auto-clears */
  anticipate() {
    if (!this.alive() || this.root.dataset.anticipating) return;
    this.root.dataset.anticipating = '1';
    if (!reduce()) this.anim = this.stage.animate([{ transform: 'rotate(0) translateX(0) scale(1)' }, { transform: 'rotate(5deg) translateX(3px) scale(1.03)' }], { duration: 700, easing: EASE_SOFT, fill: 'forwards' });
    clearTimeout(this.antic);
    this.antic = setTimeout(() => this.relax(), 12000);
  }
  relax() {
    clearTimeout(this.antic);
    if (!this.root.dataset.anticipating) return;
    delete this.root.dataset.anticipating;
    if (!reduce()) this.play([{ transform: 'rotate(5deg) translateX(3px) scale(1.03)' }, { transform: 'rotate(0) translateX(0) scale(1)' }], 600, { easing: EASE_SOFT }); else this.anim?.cancel();
    this.schedule(400);
  }
  stop() { clearTimeout(this.timer); clearTimeout(this.hold); clearTimeout(this.look); clearTimeout(this.antic); this.anim?.cancel(); this.loops.forEach((a) => a.cancel()); this.loops = []; document.removeEventListener('visibilitychange', this.onVis); }
}

const rigs = new WeakMap();
const LOOK_SEL = '.choice, .numpad .btn, .slot, .grid-dot';

export function mount(card, { subject = '' } = {}) {
  if (!card) return null;
  card.querySelector(':scope > .mascot')?.remove();
  const c = pick(subject) || { id: 'none', name: '', dir: '.', files: {}, subjects: [] };
  const poses = (data?.poses?.length ? data.poses : ['idle', 'happy', 'encourage']);
  const imgs = poses.map((p) => `<img class="cp-pose" data-pose="${p}" alt="" decoding="async" src="${spriteUrl(c, p)}" style="opacity:${p === 'idle' ? 1 : 0}">`).join('');
  const inner = MASK_OK ? `<span class="cp-layer body">${imgs}</span><span class="cp-layer head">${imgs}</span>` : imgs;
  const m = el(`<div class="mascot companion is-3d${MASK_OK ? ' is-layered' : ''}" data-companion="${c.id}" data-mood="idle" data-pose="idle" aria-hidden="true" title="${c.name}"><span class="cp-stage m-3d" style="display:block">${inner}</span></div>`);
  card.appendChild(m);
  const rig = new Rig(m, c); rigs.set(m, rig);
  // sprite failure (offline / blocked): drop the companion and mount the code-drawn monkey instead
  const idle = m.querySelector('.cp-pose[data-pose="idle"]');
  idle.addEventListener('error', () => { if (!m.isConnected) return; rig.stop(); rigs.delete(m); m.remove(); legacy.mount(card); window.__companion = { id: 'fallback', name: '', el: card.querySelector(':scope > .mascot'), rig: null }; }, { once: true });
  // Phase 18 interaction. Tickle: the tap is swallowed here - it never reaches the card / a choice / a key.
  m.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); e.preventDefault();
    rig.react('tickle');
    if (fx.intensity() > 0 && !reduce()) fx.burstAt(e.clientX, e.clientY, 1, { color: '#ff6b8a' });
    window.__companionTickle = { at: Date.now(), id: c.id };
  });
  // lookAt: the head turns toward the tapped choice / key; anticipate: leans in on the first digit
  const onTap = (e) => {
    if (!m.isConnected) { card.removeEventListener('pointerdown', onTap, true); return; }
    const t = e.target.closest?.(LOOK_SEL); if (!t) return;
    rig.lookAt(e.clientX, e.clientY);
    if (t.matches('.numpad .btn') && !t.classList.contains('btn-primary') && !t.classList.contains('btn-rose')) rig.anticipate();
    else if (t.matches('.btn-primary')) rig.relax();
  };
  card.addEventListener('pointerdown', onTap, true);
  window.__companion = { id: c.id, name: c.name, el: m, rig, layered: rig.layered, linear: LINEAR_OK };
  // entrance: slide in from the card edge
  if (!reduce()) m.animate([{ transform: 'translateY(18px) scale(.6)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 520, easing: EASE_POP });
  return m;
}

export function mood(card, name = 'idle') {
  const m = card?.querySelector(':scope > .mascot');
  const rig = m && rigs.get(m);
  if (!rig) { if (m) legacy.mood(card, name); return; }
  rig.relax?.();
  rig.react(name);
  window.__lastMascot = { mood: name, at: Date.now(), companion: rig.c.id };
}

export default { ready, list, pick, mount, mood, favourite, setFavourite, spriteUrl, spring, easing };
