/**
 * UI primitives: h(), toast, modal, confetti, HUD bar, level pill, number formatting.
 */
import store, { HEROES } from '../core/store.js';
import bus from '../core/bus.js';
import sound from '../engines/sound.js';
import { levelInfo } from '../engines/xp.js';
import hearts, { MAX_HEARTS } from '../engines/hearts.js';
import { ico } from './icons.js';
import { ico3d } from './icons3d.js';

/* ---- helpers ---- */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n) => new Intl.NumberFormat('ar-EG').format(n);
export const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.children.length > 1 ? t.content : t.content.firstElementChild; }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---- toast ---- */
let toastRoot;
export function toast(msg, { type = 'info', icon = '', ms = 2600 } = {}) {
  if (!toastRoot) { toastRoot = el('<div class="toasts" role="status" aria-live="polite"></div>'); document.body.appendChild(toastRoot); }
  const t = el(`<div class="toast ${type}">${icon ? `<span class="t-icon">${icon}</span>` : ''}<span>${msg}</span></div>`);
  toastRoot.appendChild(t);
  while (toastRoot.children.length > 3) toastRoot.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, ms);
  return t;
}

/* ---- modal ---- */
export function modal({ title = '', body = '', actions = [], dismissible = true, cls = '' }) {
  return new Promise((resolve) => {
    const bd = el(`<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal ${cls}">${title ? `<h2>${title}</h2>` : ''}<div class="m-body">${body}</div><div class="actions"></div></div></div>`);
    const acts = bd.querySelector('.actions');
    const close = (v) => { bd.remove(); document.body.style.overflow = ''; resolve(v); };
    actions.forEach((a) => {
      const b = el(`<button class="btn ${a.cls || ''}">${a.icon ? ico(a.icon) : ''}<span>${a.label}</span></button>`);
      b.onclick = () => { sound.play('tap'); if (a.onClick) { const r = a.onClick(bd); if (r === false) return; } close(a.value ?? a.label); };
      acts.appendChild(b);
    });
    if (!actions.length) acts.remove();
    if (dismissible) bd.addEventListener('click', (e) => { if (e.target === bd) close(null); });
    document.body.style.overflow = 'hidden';
    document.body.appendChild(bd);
    bd.__close = close;
  });
}
export const confirm = (title, body, ok = 'تأكيد', cancel = 'إلغاء') => modal({ title, body, actions: [{ label: cancel, cls: 'btn-ghost', value: false }, { label: ok, cls: 'btn-primary', value: true }] }).then((v) => v === true);

/* ---- confetti ---- */
let cCanvas, cCtx, cParts = [], cRaf;
export function confetti({ count = 120, x, y, spread = 1 } = {}) {
  if (!cCanvas) { cCanvas = el('<canvas id="confetti"></canvas>'); document.body.appendChild(cCanvas); cCtx = cCanvas.getContext('2d'); }
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cCanvas.width = innerWidth * dpr; cCanvas.height = innerHeight * dpr; cCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cx = x ?? innerWidth / 2, cy = y ?? innerHeight * 0.35;
  const colors = ['#22e39b', '#19e6ff', '#ffc233', '#b56cff', '#ff5c8a', '#ff8a3d', '#ffffff'];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, sp = (5 + Math.random() * 9) * spread;
    cParts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, w: 6 + Math.random() * 6, h: 4 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, color: colors[i % colors.length], life: 1, shape: Math.random() < .3 ? 'c' : 'r' });
  }
  if (!cRaf) loop();
  function loop() {
    cCtx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = cParts.length - 1; i >= 0; i--) {
      const p = cParts[i];
      p.vy += 0.28; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.011;
      if (p.life <= 0 || p.y > innerHeight + 30) { cParts.splice(i, 1); continue; }
      cCtx.save(); cCtx.globalAlpha = Math.max(0, p.life); cCtx.translate(p.x, p.y); cCtx.rotate(p.rot); cCtx.fillStyle = p.color;
      if (p.shape === 'c') { cCtx.beginPath(); cCtx.arc(0, 0, p.w / 2, 0, 7); cCtx.fill(); } else cCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cCtx.restore();
    }
    cRaf = cParts.length ? requestAnimationFrame(loop) : (cCtx.clearRect(0, 0, innerWidth, innerHeight), null);
  }
}

/* ---- HUD topbar ---- */
export function hud({ back = false, title = '', icon = '' } = {}) {
  // HOTFIX: icon is a trusted icons3d name rendered as HTML; title is ALWAYS escaped plain text (no SVG leakage)
  const iconHtml = icon ? `<span class="hud-ico">${ico3d(icon, 22)}</span>` : '';
  const p = store.profile; const hero = store.hero; const li = levelInfo();
  hearts.regen();
  const heartsHtml = Array.from({ length: MAX_HEARTS }, (_, i) => `<span class="hb ${i < p.hearts ? '' : 'off'}">${ico3d('heart', 18)}</span>`).join('');
  const node = el(`
    <div class="topbar ${title ? 'has-title' : ''}">
      ${back ? `<button class="btn btn-icon btn-ghost" data-act="back" aria-label="رجوع">${ico('back')}</button>` : `<a href="#/profile" class="avatar" style="--hero:${hero.hex}" title="${esc(p.name)}">${ico3d(p.emoji, 26)}</a>`}
      ${title ? `<b class="grow" style="font-size:15px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:8px">${iconHtml}<span class="hud-title-text">${esc(title)}</span></b>` : `<div class="grow" style="min-width:90px"><div class="row" style="gap:6px;font-size:13px;font-weight:800"><span>${esc(p.name)}</span><span class="tag tag-gold">مستوى ${fmt(li.level)}</span></div><div class="level-bar" style="height:8px;margin-top:3px"><span style="width:${li.pct}%"></span></div></div>`}
      <span class="hud fire" data-hud="streak">${ico3d('flame', 20)}<span>${fmt(p.streak.count)}</span></span>
      <span class="hud xp" data-hud="xp">${ico3d('bolt', 20)}<span>${fmt(p.xp)}</span></span>
      <span class="hud gems" data-hud="gems">${ico3d('gem', 20)}<span>${fmt(p.gems)}</span></span>
      <span class="hud hearts" data-hud="hearts" title="القلوب">${heartsHtml}</span>
      <button class="btn btn-icon btn-ghost no-print" data-act="sound" aria-label="الصوت">${ico(sound.enabled ? 'volume' : 'volumeOff')}</button>
    </div>`);
  node.querySelector('[data-act="back"]')?.addEventListener('click', () => { sound.play('tap'); history.length > 1 ? history.back() : (location.hash = '#/home'); });
  node.querySelector('[data-act="sound"]').addEventListener('click', (e) => { const on = sound.toggle(); e.currentTarget.innerHTML = ico(on ? 'volume' : 'volumeOff'); });
  const offs = [
    bus.on('xp:gain', ({ total }) => bumpSet(node, 'xp', fmt(total))),
    bus.on('gems:change', ({ total }) => bumpSet(node, 'gems', fmt(total))),
    bus.on('streak:update', ({ count }) => bumpSet(node, 'streak', fmt(count))),
    bus.on('hearts:change', ({ hearts: h }) => { const n = node.querySelector('[data-hud="hearts"]'); if (n) { n.innerHTML = Array.from({ length: MAX_HEARTS }, (_, i) => `<span class="hb ${i < h ? '' : 'off'}">${ico3d('heart', 18)}</span>`).join(''); n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); } }),
    bus.on('level:up', () => { const li2 = levelInfo(); node.querySelector('.tag-gold') && (node.querySelector('.tag-gold').textContent = `مستوى ${fmt(li2.level)}`); }),
  ];
  node.__cleanup = () => offs.forEach((f) => f());
  return node;
}
function bumpSet(node, key, val) { const n = node.querySelector(`[data-hud="${key}"]`); if (!n) return; n.querySelector('span:last-child').textContent = val; n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); }

/* ---- bottom nav ---- */
export function nav(active) {
  const items = [['home', 'الرئيسية', 'home'], ['quests', 'المهام', 'target'], ['badges', 'الشارات', 'trophy'], ['profile', 'بطلي', 'user'], ['parent', 'الأهل', 'shield']];
  const n = el(`<nav class="nav no-print">${items.map(([r, l, i]) => `<a href="#/${r}" class="${active === r ? 'active' : ''}">${ico(i)}<span>${l}</span></a>`).join('')}</nav>`);
  n.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => sound.play('swipe')));
  return n;
}

/* ---- global celebration listeners (attach once) ---- */
let attached = false;
export function attachGlobalFeedback() {
  if (attached) return; attached = true;
  bus.on('level:up', ({ to, title }) => { confetti({ count: 160 }); sound.play('fanfare'); toast(`${ico3d('party')} مستوى جديد ${fmt(to)} — ${title}!`, { type: 'gold', ms: 4000 }); window.__bubbles?.burst(innerWidth / 2, innerHeight / 2, 12); });
  bus.on('badge:earned', (b) => { confetti({ count: 90 }); toast(`شارة جديدة: ${b.name}`, { icon: ico3d(b.icon, 22), type: 'gold', ms: 3800 }); });
  bus.on('quest:done', (q) => toast(`مهمة مكتملة: ${q.name}`, { icon: ico3d(q.icon, 22), type: 'success', ms: 3000 }));
  bus.on('streak:frozen', ({ used }) => toast(`${ico3d('snow')} تم استخدام ${fmt(used)} تجميد لحماية شعلتك!`, { type: 'info', ms: 3600 }));
  bus.on('streak:lost', ({ lost }) => lost > 1 && toast(`${ico3d('heartBroken')} انقطعت شعلة ${fmt(lost)} يوم.. نبدأ من جديد!`, { type: 'error', ms: 3600 }));
  bus.on('streak:update', ({ count }) => count > 1 && toast(`${ico3d('flame')} ${fmt(count)} يوم متتالي!`, { type: 'gold' }));
}
