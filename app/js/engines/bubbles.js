/**
 * Bubbles Engine v3 — calm ambient bubbles (eye-comfort) + full celebration particle system.
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
    this.balloons = []; this.trails = []; this.rockets = []; this.lastParty = -1; // K5 party FX
    this.pointer = { x: -1e9, y: -1e9, active: false };
    this.t = 0; this.running = false; this.intensity = 1;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this._frame = this.frame.bind(this);
    this.bind(); this.resize(); this.spawnInitial();
  }

  get count() {
    const area = innerWidth * innerHeight, mem = navigator.deviceMemory || 4;
    // K2 (Calm): ~50% fewer ambient bubbles, hard cap 14, calmer while a question is on screen
    const base = Math.round(area / 90000) * this.intensity;
    const cap = mem <= 2 ? 8 : mem <= 4 ? 11 : 14;
    const focus = this.focusMode ? 0.6 : 1;
    return Math.max(5, Math.round(Math.min(cap, base) * focus));
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
      vx: rnd(-0.4, 0.4), vy: -rnd(0.28, 0.6) * (46 / r), color: pick(PALETTE), phase: rnd(0, TAU), wob: rnd(0.7, 1.4), alpha: rnd(0.20, 0.35), spin: rnd(-0.01, 0.01) };
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

  /* ---------- K5: surprise party FX (randomly varied, never the same twice in a row) ---------- */
  static get PARTIES() { return ['poppers', 'balloonParty', 'fireworks', 'sparkles', 'heartRain', 'lightRings', 'confettiCannon']; }
  /** picks a random party type (≠ last) and plays it. returns the type name for matching sound */
  party(x = this.w / 2, y = this.h * 0.45, intensity = 1) {
    const P = Bubbles.PARTIES; let i; do { i = Math.floor(Math.random() * P.length); } while (i === this.lastParty && P.length > 1);
    this.lastParty = i; const type = P[i];
    this[type](x, y, Math.max(1, Math.min(3, intensity)));
    // small chance of a bonus combo (e.g. balloons + sparkles) at high intensity
    if (intensity >= 2 && Math.random() < 0.35) { const alt = P.filter((_, k) => k !== i); const extra = pick(alt); setTimeout(() => this[extra]?.(x, y, 1), 220); }
    return type;
  }
  /** party poppers: two cones fire streamers + confetti from bottom corners toward (x,y) */
  poppers(x, y, I = 1) {
    const sides = [{ sx: 0, dir: 1 }, { sx: this.w, dir: -1 }];
    for (const { sx, dir } of sides) {
      const sy = this.h * 0.95, n = Math.round(26 * I);
      for (let k = 0; k < n; k++) {
        const ang = Math.atan2(y - sy, x - sx) + rnd(-0.35, 0.35), sp = rnd(9, 16 + I * 2);
        const isStreamer = k % 3 === 0;
        this.parts.push({ x: sx, y: sy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: isStreamer ? rnd(5, 8) : rnd(3, 6), life: 1, decay: rnd(0.006, 0.011), color: pick(PALETTE), shape: isStreamer ? 'streamer' : pick(['rect', 'rect', 'c']), rot: rnd(0, TAU), vr: rnd(-0.3, 0.3) * dir, g: 0.18, drag: 0.972, wave: rnd(0, TAU) });
      }
      this.rings.push({ x: sx, y: sy, r: 10, max: 90, life: 0.8, color: '#ffffff', w: 3 });
    }
    this.flash = 0.2;
  }
  /** balloons: 5–9 balloons rise from below the tap point and pop one after another */
  balloonParty(x, y, I = 1) {
    const n = 5 + I * 2;
    for (let k = 0; k < n; k++) {
      this.balloons.push({ x: x + rnd(-120, 120), y: this.h + rnd(20, 120), r: rnd(16, 26), vx: rnd(-0.4, 0.4), vy: -rnd(1.6, 2.6), sway: rnd(0, TAU), color: pick(PALETTE), life: 0, popAt: this.t + 700 + k * rnd(120, 220) });
    }
  }
  popBalloon(b) {
    for (let k = 0; k < 16; k++) { const a = rnd(0, TAU), sp = rnd(2, 6); this.parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rnd(3, 6), life: 1, decay: rnd(0.02, 0.035), color: b.color, shape: pick(['rect', 'c', 'spark']), rot: rnd(0, TAU), vr: rnd(-0.3, 0.3), g: 0.12, drag: 0.96 }); }
    this.rings.push({ x: b.x, y: b.y, r: b.r, max: b.r * 3.5, life: 0.7, color: b.color, w: 3 });
    sound.play('balloonPop');
  }
  /** fireworks: 2–4 rockets launch upward and explode in varied shapes */
  fireworks(x, y, I = 1) {
    const n = 1 + I;
    for (let k = 0; k < n; k++) {
      const sx = x + rnd(-this.w * 0.3, this.w * 0.3), ty = Math.max(60, y - rnd(40, 160));
      setTimeout(() => this.rockets.push({ x: sx, y: this.h + 10, vx: (x - sx) / 90 + rnd(-0.3, 0.3), vy: -rnd(9, 12), targetY: ty, color: pick(PALETTE), style: pick(['peony', 'ring', 'willow', 'crackle']) }), k * 160);
    }
  }
  explode(x, y, color, style = 'peony') {
    const n = 48, palette = [color, '#ffffff', pick(PALETTE)];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + rnd(-0.05, 0.05);
      const sp = style === 'ring' ? 6.5 : style === 'willow' ? rnd(3, 5) : rnd(3, 8);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rnd(2, 4.5), life: 1, decay: style === 'willow' ? 0.008 : rnd(0.012, 0.02), color: pick(palette), shape: style === 'crackle' ? 'spark' : 'c', g: style === 'willow' ? 0.14 : 0.05, drag: style === 'willow' ? 0.985 : 0.965 });
    }
    for (let k = 0; k < 18; k++) this.embers.push({ x, y, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1.5), r: rnd(1, 2.5), life: 1, decay: rnd(0.01, 0.02), color: pick(palette) });
    this.rings.push({ x, y, r: 6, max: 150, life: 1, color, w: 4 });
    this.flash = Math.max(this.flash, 0.22);
    sound.play('firework');
  }
  /** sparkles: glittering twinkles that spiral out and drift like fairy dust */
  sparkles(x, y, I = 1) {
    const n = Math.round(40 * I);
    for (let k = 0; k < n; k++) {
      const a = rnd(0, TAU), d = rnd(0, 26), sp = rnd(1.2, 3.8);
      this.parts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, r: rnd(2, 5), life: 1, decay: rnd(0.01, 0.018), color: pick(['#ffffff', '#ffe066', '#7cf7ff', '#fff3b0', pick(PALETTE)]), shape: 'spark', rot: rnd(0, TAU), vr: rnd(-0.4, 0.4), g: 0.02, drag: 0.98 });
    }
    for (let k = 0; k < 24 * I; k++) this.embers.push({ x: x + rnd(-60, 60), y: y + rnd(-30, 30), vx: rnd(-0.4, 0.4), vy: -rnd(0.6, 1.8), r: rnd(1, 2.5), life: 1, decay: rnd(0.006, 0.012), color: pick(['#ffe066', '#ffffff', '#7cf7ff']) });
    this.rings.push({ x, y, r: 4, max: 70, life: 0.9, color: '#ffffff', w: 2 });
  }
  /** heart rain: colourful hearts float up & drift down from the top */
  heartRain(x, y, I = 1) {
    const n = Math.round(18 * I);
    for (let k = 0; k < n; k++) {
      const up = k % 2 === 0;
      this.parts.push({ x: up ? x + rnd(-80, 80) : rnd(0, this.w), y: up ? y : -rnd(10, 120), vx: rnd(-0.8, 0.8), vy: up ? -rnd(2.5, 5) : rnd(1, 2), r: rnd(6, 12), life: 1, decay: rnd(0.005, 0.009), color: pick(['#ff5c8a', '#ff8ab0', '#ffc233', '#b56cff', '#ff6b6b']), shape: 'heart', rot: rnd(-0.4, 0.4), vr: rnd(-0.05, 0.05), g: up ? 0.06 : 0.01, drag: 0.99 });
    }
  }
  /** light rings: concentric pulsing neon rings + orbiting stars */
  lightRings(x, y, I = 1) {
    for (let k = 0; k < 3 + I * 2; k++) this.rings.push({ x, y, r: 8, max: 80 + k * 55, life: 1, color: PALETTE[k % PALETTE.length], w: 6, delay: k * 5 });
    const n = 10 + I * 4;
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU, sp = 4 + I; this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rnd(5, 8), life: 1, decay: 0.012, color: PALETTE[k % PALETTE.length], shape: 'star', rot: a, vr: 0.15, g: 0.02, drag: 0.985 }); }
    this.flash = 0.25;
  }
  /** confetti cannon: a dense burst of paper flakes shot upward that flutter down */
  confettiCannon(x, y, I = 1) {
    const n = Math.round(70 * I);
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + rnd(-0.7, 0.7), sp = rnd(7, 14 + I * 2);
      this.parts.push({ x: x + rnd(-20, 20), y: y + 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rnd(3.5, 6.5), life: 1, decay: rnd(0.005, 0.009), color: pick(PALETTE), shape: pick(['rect', 'rect', 'rect', 'c', 'streamer']), rot: rnd(0, TAU), vr: rnd(-0.35, 0.35), g: 0.14, drag: 0.968, wave: rnd(0, TAU) });
    }
    this.rings.push({ x, y, r: 10, max: 110, life: 0.8, color: '#ffffff', w: 3 });
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
    // K5: balloons rise, sway, then pop into confetti
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i]; b.sway += 0.04 * dt; b.vy -= 0.02 * dt; b.vy = Math.max(b.vy, -3.2);
      b.x += (b.vx + Math.sin(b.sway) * 0.5) * dt; b.y += b.vy * dt; b.life = Math.min(1, b.life + 0.05 * dt);
      if (t >= b.popAt || b.y < -b.r * 3) { if (b.y > -b.r * 3) this.popBalloon(b); this.balloons.splice(i, 1); }
    }
    // K5: firework rockets climb with trails, then explode
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const rk = this.rockets[i]; rk.x += rk.vx * dt; rk.y += rk.vy * dt; rk.vy += 0.05 * dt;
      this.trails.push({ x: rk.x, y: rk.y, r: rnd(1.5, 3), life: 0.8, color: rk.color });
      if (rk.vy >= -0.5 || rk.y <= rk.targetY) { this.explode(rk.x, rk.y, rk.color, rk.style); this.rockets.splice(i, 1); }
    }
    for (let i = this.trails.length - 1; i >= 0; i--) { const tr = this.trails[i]; tr.life -= 0.05 * dt; tr.y += 0.3 * dt; if (tr.life <= 0) this.trails.splice(i, 1); }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - 0.03 * dt);
  }

  /* ---------- drawing ---------- */
  rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`; }
  drawBubble(g, b) {
    const { x, y, r, color: c } = b;
    const A = b.alpha * (this.focusMode ? 0.7 : 1);
    // K2 (Calm): no additive halo — soft soap-bubble body, thin rim, gentle highlight
    g.globalCompositeOperation = 'source-over';
    const body = g.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.15, x, y, r);
    body.addColorStop(0, this.rgba('#ffffff', 0.06 * A)); body.addColorStop(0.6, this.rgba(c, 0.10 * A)); body.addColorStop(0.9, this.rgba(c, 0.32 * A)); body.addColorStop(1, this.rgba(c, 0.55 * A));
    g.fillStyle = body; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    // soft thin rim
    g.strokeStyle = this.rgba(c, 0.55 * A); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r - 0.75, 0, TAU); g.stroke();
    // inner light arc
    g.strokeStyle = this.rgba('#ffffff', 0.18 * A); g.lineWidth = 1; g.beginPath(); g.arc(x, y, r * 0.78, Math.PI * 0.15, Math.PI * 0.75); g.stroke();
    // single gentle highlight
    const hx = x + Math.cos(-2.2 + b.phase * 0.2) * r * 0.5, hy = y + Math.sin(-2.2 + b.phase * 0.2) * r * 0.5;
    g.fillStyle = this.rgba('#ffffff', 0.45 * A); g.beginPath(); g.ellipse(hx, hy, r * 0.2, r * 0.11, -0.75, 0, TAU); g.fill();
  }
  drawShape(g, p) {
    g.save(); g.translate(p.x, p.y); g.rotate(p.rot || 0); g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.color;
    const r = p.r * (0.6 + p.life * 0.4);
    if (p.shape === 'star') { g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); }
    else if (p.shape === 'heart') { g.beginPath(); g.moveTo(0, r * 0.9); g.bezierCurveTo(-r * 1.3, -r * 0.1, -r * 0.6, -r * 1.1, 0, -r * 0.35); g.bezierCurveTo(r * 0.6, -r * 1.1, r * 1.3, -r * 0.1, 0, r * 0.9); g.fill(); }
    else if (p.shape === 'spark') { g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rr = i % 2 ? r * 0.25 : r * 1.2; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); }
    else if (p.shape === 'streamer') { // K5: curly ribbon strip (party popper)
      g.strokeStyle = p.color; g.lineWidth = Math.max(2, r * 0.5); g.lineCap = 'round'; g.beginPath();
      const L = r * 3.2; for (let i = 0; i <= 6; i++) { const t = i / 6; g.lineTo((t - 0.5) * L, Math.sin(t * Math.PI * 2 + p.wave) * r * 0.6); } g.stroke();
    }
    else if (p.shape === 'rect') { g.fillRect(-r * 0.6, -r * 0.35, r * 1.2, r * 0.7); } // confetti flake
    else { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); }
    g.restore();
  }
  drawBalloon(g, b) {
    const { x, y, r, color: c } = b; g.save(); g.globalAlpha = Math.min(1, b.life * 2);
    // string
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y + r * 1.15); g.quadraticCurveTo(x + Math.sin(b.sway) * 10, y + r * 2, x + Math.sin(b.sway * 1.3) * 6, y + r * 2.8); g.stroke();
    // knot
    g.fillStyle = c; g.beginPath(); g.moveTo(x, y + r * 1.05); g.lineTo(x - r * 0.18, y + r * 1.3); g.lineTo(x + r * 0.18, y + r * 1.3); g.closePath(); g.fill();
    // body (pear shape)
    const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.18, c); grad.addColorStop(1, this.rgba(c, 0.85));
    g.fillStyle = grad; g.beginPath(); g.ellipse(x, y, r * 0.86, r, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(x - r * 0.35, y - r * 0.4, r * 0.18, r * 0.3, -0.5, 0, TAU); g.fill();
    g.restore();
  }
  draw() {
    const g = this.ctx; g.clearRect(0, 0, this.w, this.h);
    if (this.flash > 0) { g.fillStyle = `rgba(255,255,255,${this.flash * 0.35})`; g.fillRect(0, 0, this.w, this.h); }
    for (const b of this.bubbles) this.drawBubble(g, b);
    for (const b of this.balloons) this.drawBalloon(g, b);
    g.globalCompositeOperation = 'lighter';
    for (const e of this.embers) { g.globalAlpha = e.life; g.fillStyle = e.color; g.beginPath(); g.arc(e.x, e.y, e.r, 0, TAU); g.fill(); }
    for (const t of this.trails) { g.globalAlpha = t.life; g.fillStyle = t.color; g.beginPath(); g.arc(t.x, t.y, t.r, 0, TAU); g.fill(); }
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
    if (this.bubbles.length > want + 3) { // K2: trim surplus gently — drop the ones highest on screen first
      this.bubbles.sort((a, b) => (this.rewards.some((r) => r.b === a) ? 1 : 0) - (this.rewards.some((r) => r.b === b) ? 1 : 0) || a.y - b.y);
      this.bubbles.length = want;
    }
    this.step(dt); this.draw();
    this.raf = requestAnimationFrame(this._frame);
  }
  start() { if (this.running) return; this.running = true; this.last = 0; this.raf = requestAnimationFrame(this._frame); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  /** K2: calmer background while a question/quest card is being read */
  setFocus(on) { this.focusMode = !!on; }
  setIntensity(v) { this.intensity = v; }
}

export function initBubbles(canvasId = 'bubbles') {
  const c = document.getElementById(canvasId); if (!c) return null;
  const eng = new Bubbles(c);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || store.meta.reduceBubbles) eng.setIntensity(0.45);
  eng.start(); window.__bubbles = eng; return eng;
}
export default initBubbles;
