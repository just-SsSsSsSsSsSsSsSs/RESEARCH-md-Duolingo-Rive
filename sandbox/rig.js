/*
 * sandbox/rig.js - Gate 4 prototype (R1-A1, decision D1).
 * Native SVG parts + Web Animations API. Zero imports, zero libraries.
 * Isolated from app/ on purpose: nothing here is imported by the app.
 *
 * Skeleton contract (shared by P1 geometric art and the future P2 AI parts):
 *   <g data-joint="NAME" data-pivot="X Y">  - a joint; pivot in SVG user units
 *   <g data-mouth="closed|mid|open|smile|sad"> - mouth shapes inside joint "mouth"
 *   data-hover="1" on the <svg> - flying companion (wings flap, body hovers)
 */

const PIVOT_ATTR = 'data-pivot';

// ---------- easing ----------------------------------------------------------

// Damped spring sampled into a CSS linear() easing. Same idea as the current
// app rig (copied as a concept, not as a module).
export function spring(stiffness = 170, damping = 14, mass = 1, samples = 40) {
  const pts = [];
  let x = 1, v = 0;
  const dt = 1 / 60;
  const steps = samples * 3;
  const out = [];
  for (let i = 0; i <= steps; i++) {
    out.push(1 - x);
    const a = (-stiffness * x - damping * v) / mass;
    v += a * dt;
    x += v * dt;
  }
  for (let i = 0; i <= samples; i++) {
    const idx = Math.round((i / samples) * steps);
    pts.push(out[idx].toFixed(4));
  }
  pts[pts.length - 1] = '1';
  return `linear(${pts.join(', ')})`;
}

export const EASE = {
  soft: 'cubic-bezier(.4,0,.2,1)',
  inOut: 'ease-in-out',
  pop: spring(220, 12, 1),
  land: spring(300, 20, 1),
  sine: 'cubic-bezier(.45,.05,.55,.95)'
};

const rand = (a, b) => a + Math.random() * (b - a);

// ---------- rig ----------------------------------------------------------------

export class SvgRig {
  /** @param {SVGSVGElement} svg */
  constructor(svg) {
    this.svg = svg;
    this.joints = {};
    this.live = new Set();      // long-running animations (breath, hover, blink loop)
    this.timers = new Set();
    this.disposed = false;
    this.hover = svg.dataset.hover === '1';
    this.busy = false; this.flying = false;

    svg.querySelectorAll(`[data-joint]`).forEach((g) => {
      const name = g.dataset.joint;
      const [px, py] = (g.getAttribute(PIVOT_ATTR) || '0 0').split(/\s+/).map(Number);
      g.style.transformOrigin = `${px}px ${py}px`;
      g.style.transformBox = 'view-box';
      this.joints[name] = g;
    });

    this.mouthShapes = {};
    svg.querySelectorAll('[data-mouth]').forEach((g) => {
      this.mouthShapes[g.dataset.mouth] = g;
      g.style.display = 'none';
    });
    this.setMouth('closed');
  }

  j(name) { return this.joints[name]; }

  // Keep references so dispose() can cancel everything (no leaks on unmount).
  anim(el, keyframes, opts, keep = false) {
    if (!el || this.disposed) return null;
    const a = el.animate(keyframes, opts);
    if (keep) { this.live.add(a); a.onremove = () => this.live.delete(a); }
    else a.finished.then(() => a.cancel()).catch(() => {});
    return a;
  }

  // ---- idle: breath + hover + blink + look ---------------------------------

  idle() {
    const breath = rand(2600, 3400);
    // body: squash-stretch breath around the base pivot
    this.anim(this.j('body'), [
      { transform: 'scale(1,1)' }, { transform: 'scale(1.015,0.975)' }
    ], { duration: breath, iterations: Infinity, direction: 'alternate', easing: EASE.sine }, true);
    // head follows with a slight delay and 1-2 degrees tilt (overlapping action)
    this.anim(this.j('head'), [
      { transform: 'translateY(0) rotate(-1deg)' }, { transform: 'translateY(2.5px) rotate(1deg)' }
    ], { duration: breath, iterations: Infinity, direction: 'alternate', easing: EASE.sine, delay: 120 }, true);

    if (this.hover) {
      // wings flap fast; whole body floats
      this.anim(this.j('armL'), [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-24deg)' }],
        { duration: 110, iterations: Infinity, direction: 'alternate', easing: EASE.sine }, true);
      this.anim(this.j('armR'), [{ transform: 'rotate(0deg)' }, { transform: 'rotate(24deg)' }],
        { duration: 110, iterations: Infinity, direction: 'alternate', easing: EASE.sine }, true);
      this.anim(this.j('root'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-9px)' }],
        { duration: 1500, iterations: Infinity, direction: 'alternate', easing: EASE.sine }, true);
      this.anim(this.j('shadow'), [{ transform: 'scale(1)', opacity: 0.16 }, { transform: 'scale(0.85)', opacity: 0.1 }],
        { duration: 1500, iterations: Infinity, direction: 'alternate', easing: EASE.sine }, true);
      this.anim(this.j('antL'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-8deg)' }],
        { duration: 900, iterations: Infinity, direction: 'alternate', easing: EASE.sine }, true);
      this.anim(this.j('antR'), [{ transform: 'rotate(0)' }, { transform: 'rotate(8deg)' }],
        { duration: 900, iterations: Infinity, direction: 'alternate', easing: EASE.sine, delay: 200 }, true);
    } else {
      // grounded: wings sway gently with the breath
      this.anim(this.j('armL'), [{ transform: 'rotate(0)' }, { transform: 'rotate(3deg)' }],
        { duration: breath, iterations: Infinity, direction: 'alternate', easing: EASE.sine }, true);
      this.anim(this.j('armR'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-3deg)' }],
        { duration: breath, iterations: Infinity, direction: 'alternate', easing: EASE.sine }, true);
    }

    this.scheduleBlink();
    this.scheduleLook();
    return this;
  }

  blink(double = false) {
    const lids = [this.j('lidL'), this.j('lidR')];
    const frames = [
      { transform: 'scaleY(0)', offset: 0 },
      { transform: 'scaleY(1)', offset: 0.35 },
      { transform: 'scaleY(1)', offset: 0.5 },
      { transform: 'scaleY(0)', offset: 1 }
    ];
    lids.forEach((l) => this.anim(l, frames, { duration: 150, easing: EASE.soft, fill: 'none' }));
    if (double) this.later(() => this.blink(false), 200);
  }

  scheduleBlink() {
    this.later(() => {
      if (this.disposed) return;
      this.blink(Math.random() < 0.2);
      this.scheduleBlink();
    }, rand(1800, 4200));
  }

  // pupils drift together; head follows a little (overlapping action)
  look() {
    const dx = rand(-4, 4), dy = rand(-2, 3);
    const opts = { duration: 420, easing: EASE.soft, fill: 'forwards', composite: 'replace' };
    ['pupilL', 'pupilR'].forEach((p) => this.anim(this.j(p), [{ transform: `translate(${dx}px, ${dy}px)` }], { ...opts, fill: 'forwards' }, true));
    this.anim(this.j('head'), [{ transform: `rotate(${dx * 0.6}deg)` }],
      { duration: 600, easing: EASE.soft, fill: 'forwards', composite: 'add', delay: 80 }, true);
  }

  lookCenter() {
    // cancel previous look layers (fill:forwards) by removing them
    for (const a of [...this.live]) {
      if (a.effect && a.effect.target && /pupil/.test(a.effect.target.dataset.joint || '') && a.effect.getTiming().fill === 'forwards') {
        a.cancel(); this.live.delete(a);
      }
    }
  }

  scheduleLook() {
    this.later(() => {
      if (this.disposed) return;
      this.look();
      this.later(() => this.lookCenter(), rand(900, 1800));
      this.scheduleLook();
    }, rand(2500, 6000));
  }

  // ---- mouth: expressive talking loop (no visemes) -------------------------

  setMouth(shape) {
    for (const k in this.mouthShapes) this.mouthShapes[k].style.display = k === shape ? '' : 'none';
    this._mouth = shape;
  }

  /**
   * Drive the mouth from a 0..1 envelope function sampled each frame.
   * Three levels only (closed / mid / open) with hysteresis so it never flickers.
   */
  talk(envelope, durationMs) {
    const start = performance.now();
    let last = 'closed';
    const step = (now) => {
      if (this.disposed) return;
      const t = now - start;
      if (t >= durationMs) { this.setMouth('closed'); this._talkRaf = 0; return; }
      const e = envelope(t / durationMs, t);
      let shape = last;
      if (e > 0.62) shape = 'open';
      else if (e > 0.28) shape = 'mid';
      else if (e < 0.18) shape = 'closed';
      if (shape !== last) { this.setMouth(shape); last = shape; }
      this._talkRaf = requestAnimationFrame(step);
    };
    // head bobs softly while talking
    this.anim(this.j('head'), [
      { transform: 'rotate(0deg) translateY(0)' },
      { transform: 'rotate(1.5deg) translateY(-1px)' },
      { transform: 'rotate(-1.5deg) translateY(0)' },
      { transform: 'rotate(0deg) translateY(0)' }
    ], { duration: 900, iterations: Math.ceil(durationMs / 900), easing: EASE.sine, composite: 'add' });
    this._talkRaf = requestAnimationFrame(step);
  }

  // Synthetic speech-like envelope: syllable bursts 3-5 per second with pauses.
  static syntheticEnvelope() {
    const seed = Math.random() * 1000;
    return (p, tMs) => {
      const t = tMs / 1000 + seed;
      const syl = Math.max(0, Math.sin(t * Math.PI * 4.2)) ** 1.4;   // ~4 syllables/s
      const phrase = 0.55 + 0.45 * Math.sin(t * 1.3);                // phrase energy
      const pause = Math.sin(t * 0.9 + 1) > 0.75 ? 0 : 1;            // short pauses
      return Math.min(1, syl * phrase * pause * 1.3);
    };
  }

  // ---- reactions -----------------------------------------------------------

  nod() {
    this.anim(this.j('head'), [
      { transform: 'rotate(0)' }, { transform: 'translateY(4px) rotate(2deg)' },
      { transform: 'translateY(-1px)' }, { transform: 'translateY(4px) rotate(-2deg)' }, { transform: 'rotate(0)' }
    ], { duration: 700, easing: EASE.inOut, composite: 'add' });
    this.setMouth('smile');
    this.later(() => this.setMouth('closed'), 900);
  }

  celebrate() {
    const root = this.j('root');
    const dur = 900;
    // anticipation squash -> jump (spring) -> land squash -> settle
    this.anim(this.j('body'), [
      { transform: 'scale(1,1)', offset: 0 },
      { transform: 'scale(1.12,0.86)', offset: 0.12 },
      { transform: 'scale(0.94,1.1)', offset: 0.3 },
      { transform: 'scale(1,1)', offset: 0.55 },
      { transform: 'scale(1.1,0.9)', offset: 0.75 },
      { transform: 'scale(1,1)', offset: 1 }
    ], { duration: dur, easing: EASE.soft, composite: 'add' });
    this.anim(root, [
      { transform: 'translateY(0)', offset: 0 },
      { transform: 'translateY(6px)', offset: 0.12 },
      { transform: 'translateY(-46px)', offset: 0.42 },
      { transform: 'translateY(-46px)', offset: 0.5 },
      { transform: 'translateY(0)', offset: 0.75 },
      { transform: 'translateY(0)', offset: 1 }
    ], { duration: dur, easing: EASE.soft, composite: 'add' });
    this.anim(this.j('shadow'), [
      { transform: 'scale(1)', opacity: 0.18 }, { transform: 'scale(0.6)', opacity: 0.08, offset: 0.45 }, { transform: 'scale(1)', opacity: 0.18 }
    ], { duration: dur, easing: EASE.soft, composite: 'add' });
    // arms up with spring overshoot; head tilts back a touch (follow-through)
    this.anim(this.j('armL'), [{ transform: 'rotate(0)' }, { transform: 'rotate(120deg)' }],
      { duration: 500, easing: EASE.pop, composite: 'add', fill: 'forwards' }, true);
    this.anim(this.j('armR'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-120deg)' }],
      { duration: 500, easing: EASE.pop, composite: 'add', fill: 'forwards' }, true);
    this.anim(this.j('head'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg) translateY(-3px)' }, { transform: 'rotate(0)' }],
      { duration: dur, easing: EASE.soft, composite: 'add', delay: 60 });
    this.setMouth('smile');
    this.later(() => this.setMouth('open'), 350);
    this.later(() => this.setMouth('smile'), 700);
    this.later(() => {
      // arms come back down with a soft spring
      for (const a of [...this.live]) {
        const tgt = a.effect && a.effect.target;
        if (tgt && /arm/.test(tgt.dataset.joint || '') && a.effect.getTiming().fill === 'forwards') { a.cancel(); this.live.delete(a); }
      }
      ['armL', 'armR'].forEach((n, i) => this.anim(this.j(n),
        [{ transform: `rotate(${i ? -120 : 120}deg)` }, { transform: 'rotate(0)' }],
        { duration: 600, easing: EASE.land, composite: 'add' }));
      this.setMouth('closed');
    }, 1300);
    this.blink(true);
  }

  // Helper: drop every fill:forwards layer on the given joints (returns to base pose)
  release(re) {
    for (const a of [...this.live]) {
      const tgt = a.effect && a.effect.target;
      if (tgt && re.test(tgt.dataset.joint || '') && a.effect.getTiming().fill === 'forwards') { a.cancel(); this.live.delete(a); }
    }
  }

  // Wrong answer: cartoon recoil - startled hop back, wings flail, a dizzy 360 head-spin
  // wobble, then a cheeky shrug. Playful, never punishing (owner note 3).
  sad() {
    if (this.busy) return; this.busy = true;
    const root = this.j('root');
    this.setMouth('open');
    this.blink(false);
    // startle: eyes wide -> body recoils backwards with squash
    ['pupilL', 'pupilR'].forEach((p) => this.anim(this.j(p), [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
      { duration: 700, easing: EASE.soft, composite: 'add' }));
    this.anim(root, [
      { transform: 'translate(0,0) rotate(0)', offset: 0 },
      { transform: 'translate(-6px,-14px) rotate(-8deg)', offset: 0.18 },
      { transform: 'translate(-14px,0) rotate(-4deg)', offset: 0.34 },
      { transform: 'translate(-12px,-8px) rotate(3deg)', offset: 0.5 },
      { transform: 'translate(-10px,0) rotate(0)', offset: 0.64 },
      { transform: 'translate(0,0) rotate(0)', offset: 1 }
    ], { duration: 1600, easing: EASE.soft, composite: 'add' });
    this.anim(this.j('body'), [
      { transform: 'scale(1,1)' }, { transform: 'scale(0.9,1.14)', offset: 0.18 }, { transform: 'scale(1.12,0.88)', offset: 0.34 },
      { transform: 'scale(1,1)', offset: 0.55 }, { transform: 'scale(1,1)' }
    ], { duration: 1600, easing: EASE.soft, composite: 'add' });
    // wings flail up and shake
    [['armL', 1], ['armR', -1]].forEach(([n, s]) => this.anim(this.j(n), [
      { transform: 'rotate(0)' }, { transform: `rotate(${95 * s}deg)`, offset: 0.2 }, { transform: `rotate(${75 * s}deg)`, offset: 0.3 },
      { transform: `rotate(${100 * s}deg)`, offset: 0.4 }, { transform: `rotate(${80 * s}deg)`, offset: 0.5 }, { transform: 'rotate(0)', offset: 0.8 }, { transform: 'rotate(0)' }
    ], { duration: 1600, easing: EASE.soft, composite: 'add' }));
    // dizzy: head wobbles in a circle while pupils orbit (cartoon "seeing stars")
    this.anim(this.j('head'), [
      { transform: 'rotate(0) translate(0,0)' }, { transform: 'rotate(-10deg) translate(-3px,2px)' }, { transform: 'rotate(0) translate(0,4px)' },
      { transform: 'rotate(10deg) translate(3px,2px)' }, { transform: 'rotate(0) translate(0,0)' }
    ], { duration: 520, iterations: 3, easing: EASE.sine, composite: 'add', delay: 250 });
    ['pupilL', 'pupilR'].forEach((p) => this.anim(this.j(p), [
      { transform: 'translate(0,-4px)' }, { transform: 'translate(4px,0)' }, { transform: 'translate(0,4px)' }, { transform: 'translate(-4px,0)' }, { transform: 'translate(0,-4px)' }
    ], { duration: 420, iterations: 4, easing: 'linear', composite: 'add', delay: 250 }));
    this.later(() => this.setMouth('sad'), 700);
    // recovery: shrug + "oops" smile, encourage retry
    this.later(() => {
      this.setMouth('smile');
      [['armL', 1], ['armR', -1]].forEach(([n, s]) => this.anim(this.j(n), [{ transform: 'rotate(0)' }, { transform: `rotate(${35 * s}deg)` }, { transform: 'rotate(0)' }],
        { duration: 600, easing: EASE.pop, composite: 'add' }));
      this.anim(this.j('head'), [{ transform: 'rotate(0)' }, { transform: 'rotate(8deg) translateY(2px)' }, { transform: 'rotate(0)' }], { duration: 600, easing: EASE.soft, composite: 'add' });
      this.blink(true);
    }, 1700);
    this.later(() => { this.setMouth('closed'); this.busy = false; }, 2500);
  }

  // Thinking: eyes roll up and around, head tilts, wing taps the beak like a finger on a chin,
  // a small foot tap, then a light-bulb "aha" pop (owner note 3).
  think() {
    if (this.busy) return; this.busy = true;
    this.setMouth('mid');
    // eyes roll: up, sweep left, right, then settle looking up-right
    ['pupilL', 'pupilR'].forEach((p) => this.anim(this.j(p), [
      { transform: 'translate(0,0)' }, { transform: 'translate(0,-5px)', offset: 0.2 }, { transform: 'translate(-5px,-3px)', offset: 0.45 },
      { transform: 'translate(5px,-3px)', offset: 0.7 }, { transform: 'translate(3px,-4px)', offset: 1 }
    ], { duration: 1500, easing: EASE.soft, fill: 'forwards' }, true));
    this.anim(this.j('head'), [{ transform: 'rotate(0)' }, { transform: 'rotate(9deg) translate(3px,-2px)' }],
      { duration: 700, easing: EASE.soft, composite: 'add', fill: 'forwards' }, true);
    // wing to chin, then small taps
    this.anim(this.j('armR'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-118deg) translate(6px,-4px)' }],
      { duration: 550, easing: EASE.pop, composite: 'add', fill: 'forwards', delay: 200 }, true);
    this.anim(this.j('armR'), [{ transform: 'translate(0,0)' }, { transform: 'translate(0,-3px)' }, { transform: 'translate(0,0)' }],
      { duration: 380, iterations: 4, easing: EASE.sine, composite: 'add', delay: 800 });
    // foot tap
    this.anim(this.j('legL'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-3px) rotate(-6deg)' }, { transform: 'translateY(0)' }],
      { duration: 340, iterations: 5, easing: EASE.sine, composite: 'add', delay: 700 });
    // "hmm" mouth alternates
    this.later(() => this.setMouth('closed'), 900); this.later(() => this.setMouth('mid'), 1500);
    // aha: eyebrows up (head pops), eyes centre wide, wing flicks up, smile
    this.later(() => {
      this.release(/^(pupilL|pupilR|head|armR)$/);
      this.anim(this.j('head'), [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-6px) scale(1.06)' }, { transform: 'translateY(0) scale(1)' }],
        { duration: 450, easing: EASE.pop, composite: 'add' });
      ['pupilL', 'pupilR'].forEach((p) => this.anim(this.j(p), [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 500, easing: EASE.pop, composite: 'add' }));
      this.anim(this.j('armR'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-140deg)' }, { transform: 'rotate(0)' }], { duration: 700, easing: EASE.pop, composite: 'add' });
      this.setMouth('open'); this.later(() => this.setMouth('smile'), 300);
      this.blink(false);
    }, 2600);
    this.later(() => { this.setMouth('closed'); this.busy = false; }, 3500);
  }

  // ---- flight: free movement across the stage (owner note 1) --------------
  // The stage moves the WHOLE svg (its host element) along a path while the
  // rig flaps real wings, banks into turns and rolls 360 in the air.

  flap(on) {
    if (on && !this._flap) {
      this._flap = [
        this.anim(this.j('armL'), [{ transform: 'rotate(10deg)' }, { transform: 'rotate(-75deg)' }],
          { duration: 170, iterations: Infinity, direction: 'alternate', easing: EASE.sine, composite: 'add' }, true),
        this.anim(this.j('armR'), [{ transform: 'rotate(-10deg)' }, { transform: 'rotate(75deg)' }],
          { duration: 170, iterations: Infinity, direction: 'alternate', easing: EASE.sine, composite: 'add' }, true),
        // legs tuck up, body leans forward, head looks ahead
        this.anim(this.j('legL'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-35deg) translateY(-6px)' }], { duration: 300, fill: 'forwards', easing: EASE.soft, composite: 'add' }, true),
        this.anim(this.j('legR'), [{ transform: 'rotate(0)' }, { transform: 'rotate(35deg) translateY(-6px)' }], { duration: 300, fill: 'forwards', easing: EASE.soft, composite: 'add' }, true),
        this.anim(this.j('body'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' }], { duration: 300, fill: 'forwards', easing: EASE.soft, composite: 'add' }, true),
        this.anim(this.j('shadow'), [{ opacity: 0.2, transform: 'scale(1)' }, { opacity: 0.04, transform: 'scale(0.5)' }], { duration: 400, fill: 'forwards', easing: EASE.soft }, true)
      ];
    } else if (!on && this._flap) {
      this._flap.forEach((a) => { if (a) { a.cancel(); this.live.delete(a); } });
      this._flap = null;
      // landing: wings settle with a spring, small squash on touch-down
      [['armL', -40], ['armR', 40]].forEach(([n, d]) => this.anim(this.j(n), [{ transform: `rotate(${d}deg)` }, { transform: 'rotate(0)' }], { duration: 650, easing: EASE.land, composite: 'add' }));
      this.anim(this.j('body'), [{ transform: 'scale(1,1)' }, { transform: 'scale(1.1,0.9)' }, { transform: 'scale(1,1)' }], { duration: 420, easing: EASE.soft, composite: 'add' });
    }
  }

  /**
   * Fly along waypoints relative to the current position. Each point: {x, y, t}
   * (px offsets, ms since start). Banking follows the horizontal velocity; optional
   * rolls (360) and flips (180 heading change) are inserted at the given points.
   * Returns a promise that resolves on landing.
   */
  fly(points, { roll = null, flipAt = null } = {}) {
    if (this.busy || this.flying) return Promise.resolve(); this.busy = true; this.flying = true;
    const host = this.svg.parentElement;
    const total = points[points.length - 1].t;
    this.setMouth('smile');
    // take-off crouch then launch
    this.anim(this.j('body'), [{ transform: 'scale(1,1)' }, { transform: 'scale(1.12,0.85)' }, { transform: 'scale(0.95,1.08)' }, { transform: 'scale(1,1)' }],
      { duration: 380, easing: EASE.soft, composite: 'add' });
    this.later(() => this.flap(true), 200);

    // path keyframes on the host: translate + bank rotation + facing flip
    const kf = []; let facing = 1;
    points.forEach((p, i) => {
      const prev = points[i - 1] || { x: 0, y: 0, t: 0 };
      const vx = p.x - prev.x, dt = Math.max(1, p.t - prev.t);
      const bank = Math.max(-22, Math.min(22, (vx / dt) * 60));      // degrees, from horizontal speed
      if (flipAt !== null && i === flipAt) facing = -facing;           // 180: turn around mid-air
      kf.push({ transform: `translate(${p.x}px, ${p.y}px) rotate(${bank}deg) scaleX(${facing})`, offset: p.t / total, easing: EASE.sine });
    });
    const path = host.animate(kf, { duration: total, fill: 'forwards', composite: 'replace' });
    this.live.add(path);

    // 360 roll on the rig root at the requested moment
    if (roll !== null) {
      this.later(() => {
        this.anim(this.j('root'), [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 650, easing: EASE.soft, composite: 'add' });
        this.setMouth('open'); this.later(() => this.setMouth('smile'), 500);
      }, roll);
    }
    // eyes track the direction of travel
    const dir = Math.sign(points[Math.min(1, points.length - 1)].x || 1);
    ['pupilL', 'pupilR'].forEach((p) => this.anim(this.j(p), [{ transform: 'translate(0,0)' }, { transform: `translate(${4 * dir}px,-2px)` }], { duration: 400, fill: 'forwards', easing: EASE.soft }, true));

    return new Promise((res) => this.later(() => {
      this.flap(false);
      this.release(/pupil/);
      // settle host back to base with a spring so the character ends where the path ended
      path.commitStyles && path.commitStyles();
      path.cancel(); this.live.delete(path);
      host.style.transform = `translate(${points[points.length - 1].x}px, ${points[points.length - 1].y}px) scaleX(${facing})`;
      this.setMouth('closed');
      this.flying = false; this.busy = false;
      res();
    }, total + 60));
  }

  // Curated flight paths (relative). Stage picks one; each uses real turns.
  static flightPlans(w, h) {
    const W = w * 0.42, H = h * 0.45;
    return [
      // loop: up-right, across, roll at the top, swoop back and land at start
      { pts: [{ x: 0, y: 0, t: 0 }, { x: W * 0.5, y: -H * 0.8, t: 900 }, { x: W, y: -H * 0.5, t: 1600 }, { x: W * 0.6, y: -H * 1.1, t: 2300 }, { x: -W * 0.2, y: -H * 0.6, t: 3200 }, { x: 0, y: 0, t: 4000 }], roll: 1600 },
      // out-and-back with a 180 turn at the far end
      { pts: [{ x: 0, y: 0, t: 0 }, { x: -W * 0.7, y: -H * 0.5, t: 900 }, { x: -W, y: -H * 0.9, t: 1500 }, { x: -W * 0.8, y: -H * 0.4, t: 2100 }, { x: -W * 0.2, y: -H * 0.7, t: 3000 }, { x: 0, y: 0, t: 3800 }], flipAt: 3 },
      // figure-eight with a roll on the crossing
      { pts: [{ x: 0, y: 0, t: 0 }, { x: W * 0.6, y: -H, t: 800 }, { x: W, y: -H * 0.3, t: 1500 }, { x: 0, y: -H * 0.6, t: 2200 }, { x: -W, y: -H * 0.2, t: 2900 }, { x: -W * 0.5, y: -H * 0.9, t: 3500 }, { x: 0, y: 0, t: 4300 }], roll: 2200 },
    ];
  }

  // ---- lifecycle -----------------------------------------------------------

  later(fn, ms) {
    const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms);
    this.timers.add(id);
    return id;
  }

  dispose() {
    this.disposed = true;
    if (this._talkRaf) cancelAnimationFrame(this._talkRaf);
    this.timers.forEach(clearTimeout); this.timers.clear();
    for (const a of this.live) a.cancel();
    this.live.clear();
    // any remaining short animations on descendants
    this.svg.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  }
}

// ---------- loader ------------------------------------------------------------

const cache = new Map();

export async function loadSvg(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(`${url} ${r.status}`); return r.text(); }));
  }
  const text = await cache.get(url);
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.nodeName !== 'svg') throw new Error('not an svg: ' + url);
  return document.importNode(svg, true);
}

/**
 * Mount a companion inside `host`. Gradient/filter ids are made unique per
 * instance so several copies of the same file can coexist in one document.
 */
export async function mount(host, url, instanceId) {
  const svg = await loadSvg(url);
  if (instanceId) {
    const ids = [...svg.querySelectorAll('[id]')].map((n) => n.id);
    let html = svg.outerHTML;
    for (const id of ids) html = html.split(`#${id}`).join(`#${id}-${instanceId}`).split(`id="${id}"`).join(`id="${id}-${instanceId}"`);
    const doc = new DOMParser().parseFromString(html, 'image/svg+xml');
    host.appendChild(document.importNode(doc.documentElement, true));
  } else host.appendChild(svg);
  const el = host.lastElementChild;
  return new SvgRig(el).idle();
}
