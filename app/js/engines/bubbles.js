/**
 * Bubbles Engine v2 — vivid living neon bubbles + full celebration particle system.
 *
 * Why v1 felt "dead": additive 'lighter' compositing on a dark bg with 0.35→0 alpha and a 1.4px rim
 * rendered as faint wisps; drift was 0.25–0.7px/frame; no reaction to answers.
 *
 * v2:
 *  • Bubbles are bigger, brighter (saturated fill + thick glossy rim + twin highlights + soft outer glow),
 *    with lively wobble, spin of highlight, and a gentle "breathing" scale.
 *  • celebrate(x, y, intensity): multi-shape particle burst (stars ★, hearts ♥, circles, sparkles ✦, rings)
 *    from the tap point, shockwave ring, floating reward bubbles that auto-pop in sequence with sound,
 *    and rising glow embers. Scales with combo/intensity.
 *  • sad(x, y): soft "deflate" puff on wrong answers (small, non-punishing).
 *  • Pointer: tap pops bubbles (generous hit radius); hovering attracts.
 *  • DPR-aware, pauses when tab hidden, adapts count to viewport & deviceMemory.
 */
import bus from '../core/bus.js';
import sound from './sound.js';
import store from '../core/store.js';

const PALETTE = ['#22e39b', '#19e6ff', '#ffc233', '#b56cff', '#ff5c8a', '#4f8cff', '#ff8a3d', '#7cf7ff', '#ffe066'];
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];

export class Bubbles {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.bubbles = []; this.parts = []; this.rings = []; this.embers = []; this.rewards = [];
    this.pointer = { x: -1e9, y: -1e9, active: false };
    this.t = 0; this.running = false; this.intensity = 1;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this._frame = this.frame.bind(this);
    this.bind(); this.resize(); this.spawnInitial();
  }

  get count() {
    const area = innerWidth * innerHeight, mem = navigator.deviceMemory || 4;
    const base = Math.round(area / 38000) * this.intensity;
    const cap = mem <= 2 ? 14 : mem <= 4 ? 24 : 34;
    return Math.max(9, Math.min(cap, base));
  }
  bind() {
    window.addEventListener('resize', () => this.resize(), { passive: true });
    this.c.addEventListener('pointerdown', (e) => this.onDown(e), { passive: true });
    this.c.addEventListener('pointermove', (e) => { const p = this.toLocal(e); this.pointer.x = p.x; this.pointer.y = p.y; }, { passive: true });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => this.c.addEventListener(ev, () => { this.pointer.active = false; }, { passive: true }));
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
  }
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.w = innerWidth; this.h = innerHeight;
    this.c.width = this.w * this.dpr; this.c.height = this.h * this.dpr;
    this.c.style.width = this.w + 'px'; this.c.style.height = this.h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  make(fromBottom = true) {
    const small = Math.min(this.w, this.h) < 500;
    const r = rnd(small ? 18 : 22, small ? 46 : 60);
    return { x: rnd(0, this.w), y: fromBottom ? this.h + r + rnd(0, this.h * 0.4) : rnd(0, this.h), r, baseR: r,
      vx: rnd(-0.4, 0.4), vy: -rnd(0.45, 0.95) * (46 / r), color: pick(PALETTE), phase: rnd(0, TAU), wob: rnd(0.7, 1.4), alpha: rnd(0.75, 1), spin: rnd(-0.01, 0.01) };
  }
  spawnInitial() { this.bubbles = Array.from({ length: this.count }, () => this.make(false)); }
  toLocal(e) { const r = this.c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

  /* ---------- input ---------- */
  onDown(e) {
    const p = this.toLocal(e); this.pointer = { ...p, active: true };
    let hit = -1, best = 1e9;
    this.bubbles.forEach((b, i) => { const d = Math.hypot(b.x - p.x, b.y - p.y); if (d < b.r + 18 && d < best) { best = d; hit = i; } });
    if (hit >= 0) this.pop(hit); else this.ripple(p);
  }
  ripple(p) {
    for (const b of this.bubbles) { const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1; if (d < 180) { const f = (180 - d) / 180 * 4; b.vx += (dx / d) * f; b.vy += (dy / d) * f; } }
    this.rings.push({ x: p.x, y: p.y, r: 6, max: 90, life: 1, color: '#ffffff', w: 2 });
    sound.play('tap');
  }
  pop(i, silent = false) {
    const b = this.bubbles[i];
    this.shatter(b.x, b.y, b.r, b.color);
    this.bubbles[i] = this.make(true);
    if (!silent) { sound.play('pop', Math.min(1, b.r / 60)); sound.haptic(10); }
    if (store.profile) { store.profile.counters.bubblesPopped++; store.save(); }
    bus.emit('bubble:pop', { x: b.x, y: b.y, r: b.r, color: b.color, total: store.profile?.counters.bubblesPopped || 0 });
  }
  shatter(x, y, r, color) {
    const n = 10 + ((r / 5) | 0);
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU + rnd(0, 0.5), sp = rnd(1.8, 4.6); this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.8, r: rnd(2, 5), life: 1, decay: rnd(0.02, 0.035), color, shape: 'c', rot: 0, vr: 0, g: 0.05 }); }
    this.rings.push({ x, y, r: r * 0.7, max: r * 2.6, life: 1, color, w: 3 });
  }

  /* ---------- celebrations ---------- */
  /** big joyful burst at (x,y). intensity 1..3 */
  celebrate(x = this.w / 2, y = this.h * 0.45, intensity = 1) {
    const I = Math.max(1, Math.min(3, intensity));
    const n = Math.round((this.w < 500 ? 42 : 60) * I);
    const shapes = ['star', 'heart', 'c', 'spark', 'star', 'c'];
    for (let k = 0; k < n; k++) {
      const a = rnd(0, TAU), sp = rnd(3, 9 + I * 2);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(2, 6), r: rnd(4, 9 + I), life: 1, decay: rnd(0.008, 0.016), color: pick(PALETTE), shape: pick(shapes), rot: rnd(0, TAU), vr: rnd(-0.25, 0.25), g: 0.16, drag: 0.975 });
    }
    // shockwave rings
    for (let k = 0; k < 2 + I; k++) this.rings.push({ x, y, r: 10, max: 120 + k * 60 + I * 40, life: 1, color: pick(PALETTE), w: 5, delay: k * 4 });
    // reward bubbles that float up then auto-pop in sequence
    const rb = 4 + I * 3;
    for (let k = 0; k < rb; k++) {
      const b = this.make(true); b.x = x + rnd(-90, 90); b.y = y + rnd(-30, 50); b.r = b.baseR = rnd(20, 40); b.vy = -rnd(2, 4); b.vx = rnd(-2.5, 2.5); b.alpha = 1;
      this.rewards.push({ b, popAt: this.t + 380 + k * 110 });
    }
    // rising glow embers
    for (let k = 0; k < 14 * I; k++) this.embers.push({ x: x + rnd(-40, 40), y: y + rnd(-10, 10), vx: rnd(-0.6, 0.6), vy: -rnd(1, 2.6), r: rnd(1.5, 3.5), life: 1, decay: rnd(0.006, 0.012), color: pick(['#ffe066', '#ffffff', '#7cf7ff', '#ffd97a']) });
    if (I >= 2) { this.flash = 0.35; }
  }
  /** gentle deflate puff — never punishing */
  sad(x = this.w / 2, y = this.h * 0.5) {
    for (let k = 0; k < 10; k++) { const a = rnd(Math.PI * 0.9, Math.PI * 2.1), sp = rnd(0.6, 1.8); this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rnd(3, 6), life: 0.8, decay: 0.03, color: '#9fb0c8', shape: 'c', g: 0.03 }); }
    this.rings.push({ x, y, r: 20, max: 50, life: 0.7, color: '#9fb0c8', w: 2 });
  }
  burst(x, y, n = 10) { for (let k = 0; k < n; k++) { const b = this.make(true); b.x = x + rnd(-80, 80); b.y = y + rnd(-60, 60); b.vy = -rnd(1.5, 3.5); b.vx = rnd(-2, 2); this.bubbles.push(b); } }

  /* ---------- simulation ---------- */
  step(dt) {
    const t = this.t, bs = this.bubbles, wind = Math.sin(t * 0.0004) * 0.25 + Math.sin(t * 0.0013) * 0.08;
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      b.vx += wind * 0.012 + Math.sin(t * 0.0012 * b.wob + b.phase) * 0.02;
      b.vy += -0.0025 * (46 / b.r);
      if (this.pointer.x > -1e8) { const dx = this.pointer.x - b.x, dy = this.pointer.y - b.y, d = Math.hypot(dx, dy) || 1; if (d < 150 && d > b.r) { const f = 0.016 * (1 - d / 150); b.vx += (dx / d) * f; b.vy += (dy / d) * f; } }
      for (let j = i + 1; j < bs.length; j++) { const o = bs[j], dx = o.x - b.x, dy = o.y - b.y, d = Math.hypot(dx, dy) || 1, min = b.r + o.r; if (d < min) { const f = (min - d) / min * 0.06, nx = dx / d, ny = dy / d; b.vx -= nx * f; b.vy -= ny * f; o.vx += nx * f; o.vy += ny * f; } }
      b.vx *= 0.985; b.vy *= 0.993;
      const sp = Math.hypot(b.vx, b.vy); if (sp > 4) { b.vx *= 4 / sp; b.vy *= 4 / sp; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.phase += b.spin * dt;
      b.r = b.baseR * (1 + Math.sin(t * 0.0025 + b.phase) * 0.06);
      if (b.y < -b.r * 2) Object.assign(b, this.make(true));
      if (b.x < -b.r) b.x = this.w + b.r; else if (b.x > this.w + b.r) b.x = -b.r;
    }
    // reward bubbles (in main list w/ timers)
    for (let i = this.rewards.length - 1; i >= 0; i--) {
      const rw = this.rewards[i];
      if (!bs.includes(rw.b)) bs.push(rw.b);
      if (t >= rw.popAt) { const idx = bs.indexOf(rw.b); if (idx >= 0) { this.shatter(rw.b.x, rw.b.y, rw.b.r, rw.b.color); bs.splice(idx, 1); sound.play('pop', 0.4); } this.rewards.splice(i, 1); }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) { const p = this.parts[i]; p.vx *= p.drag || 0.985; p.vy = p.vy * (p.drag || 0.985) + (p.g ?? 0.06) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += (p.vr || 0) * dt; p.life -= p.decay * dt; if (p.life <= 0 || p.y > this.h + 40) this.parts.splice(i, 1); }
    for (let i = this.rings.length - 1; i >= 0; i--) { const r = this.rings[i]; if (r.delay > 0) { r.delay -= dt; continue; } r.r += (r.max - r.r) * 0.16 * dt; r.life -= 0.045 * dt; if (r.life <= 0) this.rings.splice(i, 1); }
    for (let i = this.embers.length - 1; i >= 0; i--) { const e = this.embers[i]; e.x += (e.vx + Math.sin(t * 0.005 + i) * 0.4) * dt; e.y += e.vy * dt; e.life -= e.decay * dt; if (e.life <= 0) this.embers.splice(i, 1); }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - 0.03 * dt);
  }

  /* ---------- drawing ---------- */
  rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`; }
  drawBubble(g, b) {
    const { x, y, r, color: c, alpha: A } = b;
    // outer glow
    g.globalCompositeOperation = 'lighter';
    const glow = g.createRadialGradient(x, y, r * 0.8, x, y, r * 1.6);
    glow.addColorStop(0, this.rgba(c, 0.22 * A)); glow.addColorStop(1, this.rgba(c, 0));
    g.fillStyle = glow; g.beginPath(); g.arc(x, y, r * 1.6, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over';
    // body: saturated toward rim, translucent center (soap-bubble look)
    const body = g.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.15, x, y, r);
    body.addColorStop(0, this.rgba('#ffffff', 0.10 * A)); body.addColorStop(0.55, this.rgba(c, 0.16 * A)); body.addColorStop(0.88, this.rgba(c, 0.55 * A)); body.addColorStop(1, this.rgba(c, 0.85 * A));
    g.fillStyle = body; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    // thick glossy rim
    g.strokeStyle = this.rgba(c, 0.95 * A); g.lineWidth = Math.max(2.2, r * 0.09); g.beginPath(); g.arc(x, y, r - g.lineWidth / 2, 0, TAU); g.stroke();
    // inner light rim arc (bottom-right refraction)
    g.strokeStyle = this.rgba('#ffffff', 0.35 * A); g.lineWidth = Math.max(1.5, r * 0.05); g.beginPath(); g.arc(x, y, r * 0.78, Math.PI * 0.15, Math.PI * 0.75); g.stroke();
    // twin highlights (rotate slowly)
    const hx = x + Math.cos(-2.2 + b.phase * 0.2) * r * 0.5, hy = y + Math.sin(-2.2 + b.phase * 0.2) * r * 0.5;
    g.fillStyle = this.rgba('#ffffff', 0.9 * A); g.beginPath(); g.ellipse(hx, hy, r * 0.22, r * 0.13, -0.75, 0, TAU); g.fill();
    g.fillStyle = this.rgba('#ffffff', 0.55 * A); g.beginPath(); g.arc(x + r * 0.35, y - r * 0.05, r * 0.07, 0, TAU); g.fill();
  }
  drawShape(g, p) {
    g.save(); g.translate(p.x, p.y); g.rotate(p.rot || 0); g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.color;
    const r = p.r * (0.6 + p.life * 0.4);
    if (p.shape === 'star') { g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); }
    else if (p.shape === 'heart') { g.beginPath(); g.moveTo(0, r * 0.9); g.bezierCurveTo(-r * 1.3, -r * 0.1, -r * 0.6, -r * 1.1, 0, -r * 0.35); g.bezierCurveTo(r * 0.6, -r * 1.1, r * 1.3, -r * 0.1, 0, r * 0.9); g.fill(); }
    else if (p.shape === 'spark') { g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rr = i % 2 ? r * 0.25 : r * 1.2; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); }
    else { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); }
    g.restore();
  }
  draw() {
    const g = this.ctx; g.clearRect(0, 0, this.w, this.h);
    if (this.flash > 0) { g.fillStyle = `rgba(255,255,255,${this.flash * 0.35})`; g.fillRect(0, 0, this.w, this.h); }
    for (const b of this.bubbles) this.drawBubble(g, b);
    g.globalCompositeOperation = 'lighter';
    for (const e of this.embers) { g.globalAlpha = e.life; g.fillStyle = e.color; g.beginPath(); g.arc(e.x, e.y, e.r, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
    for (const r of this.rings) { if (r.delay > 0) continue; g.strokeStyle = this.rgba(r.color, r.life * 0.9); g.lineWidth = r.w * r.life + 0.5; g.beginPath(); g.arc(r.x, r.y, r.r, 0, TAU); g.stroke(); }
    g.globalCompositeOperation = 'source-over';
    for (const p of this.parts) this.drawShape(g, p);
    g.globalAlpha = 1;
  }
  frame(now) {
    if (!this.running) return;
    const dt = Math.min(2.5, (now - (this.last || now)) / 16.667); this.last = now; this.t += dt * 16.667;
    const want = this.count + this.rewards.length;
    while (this.bubbles.length < want) this.bubbles.push(this.make(true));
    if (this.bubbles.length > want + 6) this.bubbles.length = want;
    this.step(dt); this.draw();
    this.raf = requestAnimationFrame(this._frame);
  }
  start() { if (this.running) return; this.running = true; this.last = 0; this.raf = requestAnimationFrame(this._frame); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  setIntensity(v) { this.intensity = v; }
}

export function initBubbles(canvasId = 'bubbles') {
  const c = document.getElementById(canvasId); if (!c) return null;
  const eng = new Bubbles(c);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || store.meta.reduceBubbles) eng.setIntensity(0.45);
  eng.start(); window.__bubbles = eng; return eng;
}
export default initBubbles;
