/**
 * FX — DOM-level celebration layer (works with the canvas bubbles engine).
 *  • floater(text, x, y, cls): rising, fading text ("+25 XP", "برافو!", emoji)
 *  • comboBadge(n): big animated combo counter that grows with streak
 *  • react(el, 'good'|'bad'): card bounce / gentle wiggle
 *  • celebrate({x, y, xp, combo}): orchestrates bubbles.celebrate + a RANDOM surprise party (poppers/balloons/fireworks/
 *    sparkles/heart-rain/light-rings/confetti-cannon — never the same twice in a row) + floaters + sound + haptics
 *  • encourage({x, y}): friendly wrong-answer feedback (soft puff + hint floater)
 * Respects prefers-reduced-motion and the parent's "celebration intensity" setting (meta.celebration 0..3).
 */
import store from '../core/store.js';
import sound from './sound.js';
import { ico3d } from '../ui/icons3d.js';

const CHEERS = ['برافو! ' + ico3d('clap'), 'ممتاز! ' + ico3d('star'), 'عبقري! ' + ico3d('brain'), 'رهيب! ' + ico3d('rocket'), 'صح ١٠٠٪ ' + ico3d('hundred'), 'أنت بطل! ' + ico3d('hero'), 'واو! ' + ico3d('sparkle'), 'هايل! ' + ico3d('party'), 'استمر! ' + ico3d('flame'), 'شاطر! ' + ico3d('medal'), 'خارق! ' + ico3d('bolt'), 'يا سلام! ' + ico3d('balloon')];
const COMBO_WORDS = { 3: 'ثلاثية! ' + ico3d('flame'), 5: 'خماسية!! ' + ico3d('volcano'), 7: 'لا يُوقَف!!! ' + ico3d('comet'), 10: 'أسطوري!!!! ' + ico3d('crown') };
const SOFT = ['قريب جداً! ' + ico3d('pinch'), 'مش مشكلة ' + ico3d('muscle'), 'حاول تاني ' + ico3d('seedling'), 'أنت قادر! ' + ico3d('sparkle'), 'ركّز شوية ' + ico3d('target'), 'كلنا نغلط ' + ico3d('smile')];
const AR = (n) => new Intl.NumberFormat('ar-EG').format(n);

let layer;
function root() { if (!layer) { layer = document.createElement('div'); layer.id = 'fx-layer'; layer.setAttribute('aria-hidden', 'true'); document.body.appendChild(layer); } return layer; }
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const intensity = () => (store.meta.celebration ?? 2); // 0 calm, 1 normal, 2 party, 3 max

export function floater(text, x = innerWidth / 2, y = innerHeight / 2, cls = '') {
  const el = document.createElement('div');
  el.className = `fx-float ${cls}`; el.innerHTML = text;
  el.style.left = `${x}px`; el.style.top = `${y}px`;
  el.style.setProperty('--dx', `${(Math.random() - 0.5) * 60}px`);
  el.style.setProperty('--rot', `${(Math.random() - 0.5) * 16}deg`);
  root().appendChild(el);
  setTimeout(() => el.remove(), 1500);
  return el;
}
export function comboBadge(n) {
  root().querySelector('.fx-combo')?.remove();
  if (n < 2) return;
  const el = document.createElement('div');
  el.className = 'fx-combo'; el.style.setProperty('--n', Math.min(n, 12));
  el.innerHTML = `<b>×${AR(n)}</b><span>${COMBO_WORDS[n] || 'متتالية!'}</span>`;
  root().appendChild(el);
  setTimeout(() => el.classList.add('out'), 1100); setTimeout(() => el.remove(), 1500);
}
export function react(el, kind = 'good') {
  if (!el || reduce()) return;
  el.classList.remove('fx-good', 'fx-bad'); void el.offsetWidth;
  el.classList.add(kind === 'good' ? 'fx-good' : 'fx-bad');
  setTimeout(() => el.classList.remove('fx-good', 'fx-bad'), 700);
}
/* ---------- Phase 17: fx v3 - DOM + Web Animations layer (compositor-only transforms/opacity) ----------
 * Every subject reaches these through celebrate()/encourage() (play, phaseRunner, story, mistakeLoop), so new subjects
 * get them for free. Variety: each call draws a different mix (ring + burst shape + optional ribbons/rays). */
const SHAPES = ['star', 'heart', 'spark', 'dot'];
const COLORS = ['#ffd166', '#06d6a0', '#ff6b8a', '#4cc9f0', '#b388ff', '#ff9f1c'];
const SPRING = 'cubic-bezier(.34,1.56,.64,1)';
let lastShape = '';
function pulseRing(x, y, color = '#ffd166', size = 140, ms = 650) {
  const r = document.createElement('i'); r.className = 'fx-ring'; r.style.cssText = `left:${x}px;top:${y}px;--c:${color};width:${size}px;height:${size}px`;
  root().appendChild(r);
  r.animate([{ transform: 'translate(-50%,-50%) scale(.15)', opacity: .95 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => r.remove();
}
function starburst(x, y, n = 14, dist = 120, shape = null) {
  const pool = SHAPES.filter((k) => k !== lastShape); shape = shape || pool[Math.floor(Math.random() * pool.length)]; lastShape = shape;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'); p.className = `fx-p fx-${shape}`; p.style.cssText = `left:${x}px;top:${y}px;--c:${COLORS[i % COLORS.length]}`;
    root().appendChild(p);
    const a = (i / n) * Math.PI * 2 + Math.random() * .4, d = dist * (.7 + Math.random() * .6), sc = .7 + Math.random() * .8;
    const dx = Math.cos(a) * d, dy = Math.sin(a) * d;
    p.animate([{ transform: 'translate(-50%,-50%) scale(0) rotate(0)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx * .7}px),calc(-50% + ${dy * .7}px)) scale(${sc}) rotate(${(Math.random() - .5) * 240}deg)`, opacity: 1, offset: .55 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy + 40}px)) scale(${sc * .5}) rotate(${(Math.random() - .5) * 400}deg)`, opacity: 0 }], { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => p.remove();
  }
  return shape;
}
function ribbons(x, y, n = 10) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'); p.className = 'fx-ribbon'; p.style.cssText = `left:${x}px;top:${y}px;--c:${COLORS[(i * 5) % COLORS.length]}`;
    root().appendChild(p);
    const dx = (Math.random() - .5) * 320, up = -(120 + Math.random() * 160), fall = 260 + Math.random() * 200;
    p.animate([{ transform: 'translate(-50%,-50%) rotate(0) scaleY(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx * .6}px),calc(-50% + ${up}px)) rotate(${Math.random() * 360}deg) scaleY(.6)`, opacity: 1, offset: .35 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${up + fall}px)) rotate(${360 + Math.random() * 720}deg) scaleY(1)`, opacity: 0 }], { duration: 1500 + Math.random() * 600, easing: 'cubic-bezier(.3,.6,.4,1)' }).onfinish = () => p.remove();
  }
}
function rays(x, y) {
  const r = document.createElement('i'); r.className = 'fx-rays'; r.style.cssText = `left:${x}px;top:${y}px`;
  root().appendChild(r);
  r.animate([{ transform: 'translate(-50%,-50%) scale(.2) rotate(0)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.1) rotate(25deg)', opacity: .9, offset: .35 }, { transform: 'translate(-50%,-50%) scale(1.6) rotate(60deg)', opacity: 0 }], { duration: 1100, easing: 'ease-out' }).onfinish = () => r.remove();
}
/** v3 composite: level 1 ring+burst, 2 + ribbons, 3 + rays (recovered / perfect). Returns what was drawn (tests). */
export function burstAt(x, y, level = 1, { color } = {}) {
  if (reduce() || intensity() === 0) return null;
  const c = color || COLORS[Math.floor(Math.random() * COLORS.length)];
  pulseRing(x, y, c, 120 + level * 40);
  const shape = starburst(x, y, 10 + level * 4, 100 + level * 30);
  if (level >= 2 && intensity() >= 2) ribbons(x, y, 8 + level * 2);
  if (level >= 3 && intensity() >= 2) rays(x, y);
  const drawn = { ring: true, shape, ribbons: level >= 2 && intensity() >= 2, rays: level >= 3 && intensity() >= 2 };
  window.__fxLast = { ...drawn, at: Date.now(), x, y, level }; return drawn;
}
export function celebrate({ x = innerWidth / 2, y = innerHeight * 0.45, xp = 0, combo = 1, el = null, big = false, recovered = false } = {}) {
  burstAt(x, y, big || recovered ? 3 : combo >= 3 ? 2 : 1);
  const I = intensity(); const B = window.__bubbles;
  const level = big ? 3 : combo >= 7 ? 3 : combo >= 3 ? 2 : 1;
  if (I > 0 && B && !reduce()) {
    const lvl = I === 1 ? 1 : Math.min(level, 3);
    B.celebrate(x, y, Math.max(1, lvl - 1));                       // base burst at the finger
    if (I >= 2 && B.party) { const type = B.party(x, y, lvl); sound.play('party', type); }  // K5: surprise party (random each time)
  }
  floater(CHEERS[Math.floor(Math.random() * CHEERS.length)], x, y - 40, 'cheer');
  if (xp) setTimeout(() => floater(`+${AR(xp)} XP`, x + 30, y - 10, 'xp'), 120);
  if (combo >= 2 && I >= 1) comboBadge(combo);
  react(el, 'good');
  sound.haptic(combo >= 5 ? [20, 40, 20, 40, 30] : [15, 30, 15]);
  if (I >= 2 && level >= 2 && !reduce()) { document.body.classList.add('fx-shake'); setTimeout(() => document.body.classList.remove('fx-shake'), 380); }
}
export function encourage({ x = innerWidth / 2, y = innerHeight * 0.5, el = null } = {}) {
  const B = window.__bubbles; if (B && !reduce()) B.sad(x, y);
  if (!reduce() && intensity() > 0) pulseRing(x, y, '#ffb347', 110, 520); // Phase 17: a warm soft ring, never a harsh red flash
  floater(SOFT[Math.floor(Math.random() * SOFT.length)], x, y - 30, 'soft');
  react(el, 'bad'); sound.haptic(40);
}
/** resolve a screen point from a pointer/click event, falling back to an element's center */
export function pointOf(e, fallbackEl) {
  if (e && typeof e.clientX === 'number' && (e.clientX || e.clientY)) return { x: e.clientX, y: e.clientY };
  const r = fallbackEl?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
}
export default { floater, comboBadge, react, celebrate, encourage, pointOf, intensity, burstAt };
