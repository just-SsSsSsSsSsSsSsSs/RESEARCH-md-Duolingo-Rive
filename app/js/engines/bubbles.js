/**
 * Bubbles Engine — live neon bubble physics on <canvas>.
 *  • Buoyancy + gentle wind (Perlin-ish noise) + soft bubble-bubble repulsion
 *  • Pointer attraction/repulsion, tap/click to POP (burst into shards + procedural pop sound)
 *  • DPR-aware, pauses when tab hidden, adapts count to viewport & device memory
 *  • Emits bus 'bubble:pop' for gamification (counters/badges)
 */
import bus from '../core/bus.js';
import sound from './sound.js';
import store from '../core/store.js';

const PALETTE = ['#22e39b', '#19e6ff', '#ffc233', '#b56cff', '#ff5c8a', '#4f8cff', '#ff8a3d'];
const TAU = Math.PI * 2;

export class Bubbles {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.bubbles = [];
    this.shards = [];
    this.pointer = { x: -1e9, y: -1e9, active: false, t: 0 };
    this.t = 0;
    this.running = false;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.intensity = 1;
    this._resize = this.resize.bind(this);
    this._frame = this.frame.bind(this);
    this._onDown = this.onDown.bind(this);
    this._onMove = this.onMove.bind(this);
    this._onUp = () => { this.pointer.active = false; };
    this.bind();
    this.resize();
    this.spawnInitial();
  }

  get count() {
    const area = innerWidth * innerHeight;
    const mem = navigator.deviceMemory || 4;
    const base = Math.round(area / 42000) * this.intensity;
    const cap = mem <= 2 ? 14 : mem <= 4 ? 22 : 32;
    return Math.max(8, Math.min(cap, base));
  }

  bind() {
    window.addEventListener('resize', this._resize, { passive: true });
    this.c.addEventListener('pointerdown', this._onDown, { passive: true });
    this.c.addEventListener('pointermove', this._onMove, { passive: true });
    this.c.addEventListener('pointerup', this._onUp, { passive: true });
    this.c.addEventListener('pointercancel', this._onUp, { passive: true });
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = innerWidth; this.h = innerHeight;
    this.c.width = this.w * this.dpr; this.c.height = this.h * this.dpr;
    this.c.style.width = this.w + 'px'; this.c.style.height = this.h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  make(fromBottom = true) {
    const r = 14 + Math.random() * 34;
    return {
      x: Math.random() * this.w,
      y: fromBottom ? this.h + r + Math.random() * this.h * 0.5 : Math.random() * this.h,
      r, baseR: r,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(0.25 + Math.random() * 0.45) * (40 / r),
      color: PALETTE[(Math.random() * PALETTE.length) | 0],
      phase: Math.random() * TAU,
      wob: 0.6 + Math.random() * 0.8,
      alpha: 0.55 + Math.random() * 0.35,
      hue: Math.random(),
    };
  }
  spawnInitial() { this.bubbles = Array.from({ length: this.count }, () => this.make(false)); }

  /* ---- input ---- */
  toLocal(e) { const r = this.c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  onDown(e) {
    const p = this.toLocal(e);
    this.pointer = { ...p, active: true, t: this.t };
    // pop nearest hit (generous hit radius for kids' fingers)
    let hit = -1, best = 1e9;
    for (let i = 0; i < this.bubbles.length; i++) {
      const b = this.bubbles[i];
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < b.r + 14 && d < best) { best = d; hit = i; }
    }
    if (hit >= 0) this.pop(hit, p);
    else this.ripple(p);
  }
  onMove(e) { const p = this.toLocal(e); this.pointer.x = p.x; this.pointer.y = p.y; }

  ripple(p) {
    // push bubbles away from tap
    for (const b of this.bubbles) {
      const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d < 160) { const f = (160 - d) / 160 * 3.2; b.vx += (dx / d) * f; b.vy += (dy / d) * f; }
    }
    sound.play('tap');
  }

  pop(i, p) {
    const b = this.bubbles[i];
    const n = 8 + ((b.r / 6) | 0);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + Math.random() * 0.4;
      const sp = 1.6 + Math.random() * 2.6;
      this.shards.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6, r: 2 + Math.random() * 3.5, life: 1, color: b.color });
    }
    this.rings = this.rings || [];
    this.rings.push({ x: b.x, y: b.y, r: b.r * 0.6, max: b.r * 2.4, life: 1, color: b.color });
    this.bubbles[i] = this.make(true);
    sound.play('pop', Math.min(1, b.r / 48));
    sound.haptic(10);
    if (store.profile) {
      store.profile.counters.bubblesPopped++;
      store.save();
    }
    bus.emit('bubble:pop', { x: b.x, y: b.y, r: b.r, color: b.color, total: store.profile?.counters.bubblesPopped || 0 });
  }

  /* ---- sim ---- */
  step(dt) {
    const t = this.t;
    const bs = this.bubbles;
    const wind = Math.sin(t * 0.00035) * 0.18 + Math.sin(t * 0.0011) * 0.06;
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      // buoyancy & wind & wobble
      b.vx += wind * 0.01 + Math.sin(t * 0.001 * b.wob + b.phase) * 0.012;
      b.vy += -0.002 * (44 / b.r);
      // pointer influence (attract slightly when hovering)
      if (this.pointer.active || this.pointer.x > -1e8) {
        const dx = this.pointer.x - b.x, dy = this.pointer.y - b.y, d = Math.hypot(dx, dy) || 1;
        if (d < 140 && d > b.r) { const f = 0.012 * (1 - d / 140); b.vx += (dx / d) * f; b.vy += (dy / d) * f; }
      }
      // soft repulsion between bubbles (O(n²) fine for ≤32)
      for (let j = i + 1; j < bs.length; j++) {
        const o = bs[j];
        const dx = o.x - b.x, dy = o.y - b.y, d = Math.hypot(dx, dy) || 1, min = b.r + o.r;
        if (d < min) { const f = (min - d) / min * 0.05; const nx = dx / d, ny = dy / d; b.vx -= nx * f; b.vy -= ny * f; o.vx += nx * f; o.vy += ny * f; }
      }
      // damping & clamp
      b.vx *= 0.985; b.vy *= 0.992;
      const sp = Math.hypot(b.vx, b.vy); if (sp > 3.5) { b.vx *= 3.5 / sp; b.vy *= 3.5 / sp; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      // breathing radius
      b.r = b.baseR * (1 + Math.sin(t * 0.002 + b.phase) * 0.04);
      // wrap/reset
      if (b.y < -b.r * 2) Object.assign(b, this.make(true));
      if (b.x < -b.r) b.x = this.w + b.r; else if (b.x > this.w + b.r) b.x = -b.r;
    }
    // shards
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 0.06 * dt; s.vx *= 0.98; s.life -= 0.028 * dt;
      if (s.life <= 0) this.shards.splice(i, 1);
    }
    if (this.rings) for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.r += (r.max - r.r) * 0.18 * dt; r.life -= 0.06 * dt; if (r.life <= 0) this.rings.splice(i, 1);
    }
  }

  draw() {
    const g = this.ctx;
    g.clearRect(0, 0, this.w, this.h);
    g.globalCompositeOperation = 'lighter';
    for (const b of this.bubbles) {
      const grad = g.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.1, b.x, b.y, b.r);
      grad.addColorStop(0, this.rgba(b.color, 0.35 * b.alpha));
      grad.addColorStop(0.7, this.rgba(b.color, 0.10 * b.alpha));
      grad.addColorStop(1, this.rgba(b.color, 0.0));
      g.fillStyle = grad;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill();
      // rim
      g.strokeStyle = this.rgba(b.color, 0.55 * b.alpha); g.lineWidth = 1.4;
      g.beginPath(); g.arc(b.x, b.y, b.r - 0.7, 0, TAU); g.stroke();
      // highlight
      g.fillStyle = this.rgba('#ffffff', 0.5 * b.alpha);
      g.beginPath(); g.ellipse(b.x - b.r * 0.38, b.y - b.r * 0.42, b.r * 0.22, b.r * 0.13, -0.7, 0, TAU); g.fill();
    }
    for (const s of this.shards) {
      g.fillStyle = this.rgba(s.color, s.life * 0.9);
      g.beginPath(); g.arc(s.x, s.y, s.r * s.life, 0, TAU); g.fill();
    }
    if (this.rings) for (const r of this.rings) {
      g.strokeStyle = this.rgba(r.color, r.life * 0.8); g.lineWidth = 2.5 * r.life;
      g.beginPath(); g.arc(r.x, r.y, r.r, 0, TAU); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
  }

  rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(2.5, (now - (this.last || now)) / 16.667);
    this.last = now; this.t += dt * 16.667;
    // keep count in sync with viewport
    const want = this.count;
    while (this.bubbles.length < want) this.bubbles.push(this.make(true));
    if (this.bubbles.length > want) this.bubbles.length = want;
    this.step(dt);
    this.draw();
    this.raf = requestAnimationFrame(this._frame);
  }
  start() { if (this.running) return; this.running = true; this.last = 0; this.raf = requestAnimationFrame(this._frame); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  setIntensity(v) { this.intensity = v; }
  /** celebratory burst from a point (used by confetti moments) */
  burst(x = this.w / 2, y = this.h / 2, n = 10) {
    for (let k = 0; k < n; k++) { const b = this.make(true); b.x = x + (Math.random() - 0.5) * 80; b.y = y + (Math.random() - 0.5) * 80; b.vy = -1.5 - Math.random() * 2; b.vx = (Math.random() - 0.5) * 3; this.bubbles.push(b); }
  }
}

export function initBubbles(canvasId = 'bubbles') {
  const c = document.getElementById(canvasId);
  if (!c) return null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eng = new Bubbles(c);
  if (reduce || store.meta.reduceBubbles) eng.setIntensity(0.4);
  eng.start();
  window.__bubbles = eng;
  return eng;
}
export default initBubbles;
