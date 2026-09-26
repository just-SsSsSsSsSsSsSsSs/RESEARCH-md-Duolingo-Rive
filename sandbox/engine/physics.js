/*
 * sandbox/engine/physics.js - ADR-001 K2
 * Tiny spring-damper toolkit for secondary motion. Zero dependencies.
 *
 * Design rules (constitution article 7): the solver runs ONLY while something
 * moves (a primary motion is active or a group is still settling). When every
 * group is at rest the rAF loop stops. No idle render loop.
 *
 * Integration: semi-implicit (symplectic) Euler at a fixed 120 Hz sub-step,
 * which is stable for k up to about 2000 with c >= 2 at these amplitudes.
 */

const SUB_DT = 1 / 120; // seconds

export class Spring {
  /** @param {{k:number,c:number,limit?:number}} p */
  constructor(p) {
    this.k = p.k; this.c = p.c; this.limit = p.limit ?? Infinity;
    this.x = 0; this.v = 0; this.target = 0;
  }
  step(dt) {
    // dt seconds; sub-step for stability
    let t = dt;
    while (t > 0) {
      const h = Math.min(SUB_DT, t); t -= h;
      const a = -this.k * (this.x - this.target) - this.c * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
    if (this.x > this.limit) { this.x = this.limit; this.v = Math.min(0, this.v); }
    if (this.x < -this.limit) { this.x = -this.limit; this.v = Math.max(0, this.v); }
    return this.x;
  }
  kick(dv) { this.v += dv; }
  get atRest() { return Math.abs(this.x - this.target) < 0.05 && Math.abs(this.v) < 0.5; }
  reset() { this.x = 0; this.v = 0; this.target = 0; }
}

/**
 * SecondaryRig: one Spring per group defined in the spec, driven by the
 * primary body velocity/acceleration (px/ms, px/ms^2) each frame.
 * apply(name, deg) is the caller's writer (keeps DOM writes out of physics).
 */
export class SecondaryRig {
  /** @param {Record<string,{k:number,c:number,gainV:number,gainA:number,axis:'x'|'y',limit:number,settleMs:number}>} spec */
  constructor(spec, apply) {
    this.spec = spec; this.apply = apply;
    this.springs = {};
    for (const n in spec) this.springs[n] = new Spring(spec[n]);
    this.raf = 0; this.last = 0; this.settleUntil = 0; this.driving = false;
    this.prevV = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };  // set by the primary motion each frame
    this.samples = 0;                // instrumentation: frames solved this session
  }

  /** Primary motion reports its analytic velocity (px/ms). Keeps the loop alive. */
  drive(vx, vy) {
    this.velocity.x = vx; this.velocity.y = vy;
    this.driving = true;
    this._ensureLoop();
  }

  /** Primary motion ended: keep solving for the longest settleMs, then stop. */
  release() {
    this.driving = false;
    this.velocity.x = 0; this.velocity.y = 0;
    const maxSettle = Math.max(...Object.values(this.spec).map((s) => s.settleMs || 600));
    this.settleUntil = performance.now() + maxSettle;
    this._ensureLoop();
  }

  /** Impulse on a group (e.g. landing thump). */
  impulse(name, dv) { if (this.springs[name]) { this.springs[name].kick(dv); this._ensureLoop(); } }

  _ensureLoop() {
    if (this.raf) return;
    this.last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      const ax = (this.velocity.x - this.prevV.x) / Math.max(1e-3, dt * 1000);   // px/ms^2
      const ay = (this.velocity.y - this.prevV.y) / Math.max(1e-3, dt * 1000);
      this.prevV.x = this.velocity.x; this.prevV.y = this.velocity.y;
      let anyMoving = false;
      for (const n in this.springs) {
        const s = this.springs[n], p = this.spec[n];
        const v = p.axis === 'x' ? this.velocity.x : this.velocity.y;
        const a = p.axis === 'x' ? ax : ay;
        // velocity sets where the group wants to hang; acceleration kicks it
        s.target = this.driving ? Math.max(-p.limit, Math.min(p.limit, v * p.gainV)) : 0;
        if (this.driving) s.kick(a * p.gainA * dt);
        this.apply(n, s.step(dt));
        if (!s.atRest) anyMoving = true;
      }
      this.samples++;
      const keepAlive = this.driving || now < this.settleUntil || anyMoving;
      if (keepAlive) this.raf = requestAnimationFrame(tick);
      else { this.raf = 0; for (const n in this.springs) { this.springs[n].reset(); this.apply(n, 0); } }
    };
    this.raf = requestAnimationFrame(tick);
  }

  get running() { return this.raf !== 0; }

  dispose() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
}

/**
 * Volume-preserving squash spring: returns {sx, sy} with sx = 1/sy.
 * Used for landing rebound: set impact (e.g. 0.8) then it springs back to 1.
 */
export class SquashSpring {
  constructor({ k = 320, c = 14 } = {}) { this.s = new Spring({ k, c }); this.s.target = 0; }
  impact(scaleY) { this.s.x = scaleY - 1; this.s.v = 0; }
  step(dt) { const sy = 1 + this.s.step(dt); return { sy, sx: 1 / sy }; }
  get atRest() { return this.s.atRest; }
}

/** Cubic Bezier helpers for arcs (G4). */
export const bezier = {
  point(p0, p1, p2, p3, t) {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
  },
  /** derivative (dx/dt, dy/dt) */
  tangent(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return {
      x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
      y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y)
    };
  },
  /**
   * Arc-length parameterisation: returns an array of N points equally spaced
   * along the curve, so that speed is governed by easing, not by segment length.
   */
  sampleEven(p0, p1, p2, p3, n = 32) {
    const M = 200, pts = [bezier.point(p0, p1, p2, p3, 0)], len = [0];
    for (let i = 1; i <= M; i++) {
      const p = bezier.point(p0, p1, p2, p3, i / M); const q = pts[i - 1];
      len.push(len[i - 1] + Math.hypot(p.x - q.x, p.y - q.y)); pts.push(p);
    }
    const total = len[M], out = [];
    for (let k = 0; k <= n; k++) {
      const target = (k / n) * total;
      let i = 0; while (i < M && len[i + 1] < target) i++;
      const seg = len[i + 1] - len[i] || 1, f = (target - len[i]) / seg;
      const t = (i + f) / M;
      out.push({ ...bezier.point(p0, p1, p2, p3, t), t });
    }
    return { points: out, length: total };
  }
};

export const lerp = (a, b, t) => a + (b - a) * t;
export const randIn = ([a, b]) => a + Math.random() * (b - a);
