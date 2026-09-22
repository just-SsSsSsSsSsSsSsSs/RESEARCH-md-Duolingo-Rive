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
export function celebrate({ x = innerWidth / 2, y = innerHeight * 0.45, xp = 0, combo = 1, el = null, big = false } = {}) {
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
  floater(SOFT[Math.floor(Math.random() * SOFT.length)], x, y - 30, 'soft');
  react(el, 'bad'); sound.haptic(40);
}
/** resolve a screen point from a pointer/click event, falling back to an element's center */
export function pointOf(e, fallbackEl) {
  if (e && typeof e.clientX === 'number' && (e.clientX || e.clientY)) return { x: e.clientX, y: e.clientY };
  const r = fallbackEl?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
}
export default { floater, comboBadge, react, celebrate, encourage, pointOf, intensity };
