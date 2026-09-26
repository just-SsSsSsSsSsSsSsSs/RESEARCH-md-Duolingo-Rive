/*
 * sandbox/engine/flight.js - ADR-001 K3b: flight and jump on real arcs.
 * Installs methods onto CinematicRig.prototype (kept in a separate file so a
 * sandbox reset cannot lose the whole engine at once).
 *
 * G3 anticipation: volume-preserving crouch held 150-250 ms (spec), then stretch.
 * G4 arcs: cubic Bezier lifted above the chord, sampled by arc length so the
 *          speed profile is the easing, not the geometry. Bank = f(horizontal v).
 * G2 landing: squash impact from spec, spring rebound with volume preservation.
 * G5 follow-through: wings/legs/head springs receive the landing impulse and the
 *          flight velocity; the solver keeps running until every group is at rest.
 */
import { CinematicRig, cssEase, bezier, randIn, clock } from './motion.js';
import { EASE, REDUCED } from '../rig.js?v=g4';

const P = CinematicRig.prototype;

/** Fly from the current perch by (dx, dy) px. Resolves after landing settles. */
P.flyBy = async function (dx, dy, { trace = false } = {}) {
  if (this.busy || this.flying) return; this.busy = true; this.flying = true;
  const F = this.spec.flight, S = this.spec.squash, T = this.spec.timing;
  const host = this.svg.parentElement;
  const base = { ...this._perch };
  const dist = Math.hypot(dx, dy);

  if (REDUCED) {
    host.style.transition = 'transform .5s ease'; host.style.transform = `translate(${base.x + dx}px, ${base.y + dy}px)`;
    this._perch = { x: base.x + dx, y: base.y + dy }; this.nod();
    this.busy = false; this.flying = false; return;
  }

  // 1) anticipation (G3)
  const crouchSy = S.takeoffCrouch.scaleY, hold = randIn(S.takeoffCrouch.holdMs);
  this._writeSquash(1 / crouchSy, crouchSy);
  this.cue('anticipate', { holdMs: hold });
  const headDip = this.anim(this.j('head'), [{ transform: 'translateY(0)' }, { transform: 'translateY(3px) rotate(-3deg)' }], { duration: hold, fill: 'forwards', easing: EASE.soft, composite: 'add' }, true);
  [['armL', 18], ['armR', -18]].forEach(([n, d]) => this.anim(this.j(n), [{ transform: 'rotate(0)' }, { transform: `rotate(${d}deg)` }], { duration: hold, easing: EASE.soft, composite: 'add' }));
  await this._sleep(hold);
  if (headDip) { headDip.cancel(); this.live.delete(headDip); }
  this._writeSquash(1 / S.takeoffStretch.scaleY, S.takeoffStretch.scaleY);
  this.later(() => this._writeSquash(1, 1), S.takeoffStretch.ms);
  this.cue('takeoff', { dir: dx < -10 ? -1 : 1, dist });

  // 2) arc (G4)
  const lift = dist * randIn(F.apexLift), skew = randIn(F.apexSkew);
  const p0 = { x: 0, y: 0 }, p3 = { x: dx, y: dy };
  const p1 = { x: dx * skew * 0.6, y: -lift + dy * skew * 0.3 };
  const p2 = { x: dx * (skew + (1 - skew) * 0.6), y: -lift * 0.9 + dy * 0.7 };
  const total = Math.max(T.flightMinMs, Math.min(T.flightMaxMs, dist * randIn(T.flightMsPerPx)));
  const { points } = bezier.sampleEven(p0, p1, p2, p3, 40);
  if (trace && this.trace) this.trace(points.map((p) => ({ x: base.x + p.x, y: base.y + p.y })));

  const facing = dx < -10 ? -1 : 1;
  const kf = points.map((p, i) => {
    const prev = points[i - 1] || p, next = points[i + 1] || p;
    const u = i / (points.length - 1);
    const levelOff = u > 0.82 ? 1 - (u - 0.82) / 0.18 : 1;   // wings level before touchdown, no residual tilt on the perch
    const bank = levelOff * Math.max(-F.bankLimit, Math.min(F.bankLimit, (next.x - prev.x) * F.bankPerVx / 60));
    return { transform: `translate(${(base.x + p.x).toFixed(1)}px, ${(base.y + p.y).toFixed(1)}px) rotate(${bank.toFixed(1)}deg) scaleX(${facing})`, offset: u };
  });
  const path = host.animate(kf, { duration: total, easing: F.easing, fill: 'forwards' });
  this.live.add(path);
  this.flap(true);
  this.setMouth('smile');
  // wingbeat cues follow the flap animation period (170 ms alternate = one beat per 340 ms);
  // cruise cue fires once near the apex with the vertical velocity sign for pitch shaping
  const beatMs = 340; let beats = 0;
  const beatTimer = () => { if (!this.flying) return; this.cue('flap', { beat: beats++ }); this.later(beatTimer, beatMs); };
  this.later(beatTimer, 60);
  this.later(() => this.flying && this.cue('cruise', { vy: -(dy) / total, dist }), total * 0.35);
  if (dist > F.rollIfDistOver) this.later(() => this.anim(this.j('root'), [{ transform: 'rotate(0)' }, { transform: `rotate(${360 * facing}deg)` }], { duration: F.rollMs, easing: EASE.soft, composite: 'add' }), total * 0.45);

  // 3) physics driven by the analytic velocity of the path (no layout reads)
  const t0 = clock.now(), ease = cssEase(F.easing), N = points.length - 1;
  const driveTick = () => {
    const u = Math.min(1, (clock.now() - t0) / total);
    const s = ease(u), s2 = ease(Math.min(1, u + 0.01));
    const i = Math.min(N - 1, Math.floor(s * N)), j = Math.min(N, Math.floor(s2 * N));
    const dtMs = 0.01 * total;
    this.secondary.drive((points[j].x - points[i].x) / dtMs, (points[j].y - points[i].y) / dtMs);
    if (u < 1 && !this.disposed) this._driveRaf = requestAnimationFrame(driveTick); else this._driveRaf = 0;
  };
  this._driveRaf = requestAnimationFrame(driveTick);
  await path.finished.catch(() => {});
  cancelAnimationFrame(this._driveRaf); this._driveRaf = 0;

  // 4) landing (G2 + G5)
  path.commitStyles(); path.cancel(); this.live.delete(path);
  this._perch = { x: base.x + dx, y: base.y + dy };
  this.flap(false);
  this.secondary.release();
  this.secondary.impulse('armL', -260); this.secondary.impulse('armR', 260); this.secondary.impulse('head', -40);
  this.squash.impact(S.landing.scaleY);
  this.cue('land', { dist });
  await this._runSquash();
  this.cue('settle');
  this.setMouth('closed');
  this.stats.flights++;
  this.flying = false; this.busy = false;
  if (dist > F.rollIfDistOver) this.later(() => !this.busy && this.cue('after', { dist }), 350);   // a long flight earns a little pant
};

/** Fly to a DOM element (perch on its top edge) or home. */
P.flyTo = function (target, { home = false, trace = false } = {}) {
  const hr = this.svg.parentElement.getBoundingClientRect();
  let dx, dy;
  if (home) { dx = -this._perch.x; dy = -this._perch.y; }
  else { const tr = target.getBoundingClientRect(); dx = (tr.left + tr.width / 2) - (hr.left + hr.width / 2); dy = (tr.top - hr.height * 0.92) - hr.top; }
  return this.flyBy(dx, dy, { trace });
};

/** Free flight inside room {left,right,up} px: one arc out, a beat, one arc home. */
P.roam = async function (room, { trace = false } = {}) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const reach = side < 0 ? room.left : room.right;
  const dx = side * randIn([reach * 0.45, reach]);
  const dy = -randIn([room.up * 0.3, room.up * 0.9]);
  await this.flyBy(dx, dy, { trace });
  await this._sleep(randIn([250, 650]));
  await this.flyBy(-this._perch.x, -this._perch.y, { trace });
};

/** Celebrate: anticipation crouch -> jump with stretch -> volume-preserving landing -> wings settle. */
P.celebrate = function () {
  if (this.busy) return; this.busy = true;
  const S = this.spec.squash.jump, hold = randIn(this.spec.squash.takeoffCrouch.holdMs), H = this.spec.hierarchy;
  this._writeSquash(1 / S.scaleY, S.scaleY);
  this.cue('anticipate', { holdMs: hold });
  this.later(() => {
    this._writeSquash(1 / S.stretch, S.stretch);
    this.cue('jump');
    this.anim(this.j('root'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-52px)', offset: 0.45 }, { transform: 'translateY(-52px)', offset: 0.52 }, { transform: 'translateY(0)' }], { duration: 760, easing: EASE.soft, composite: 'add' });
    [['armL', 125], ['armR', -125]].forEach(([n, d]) => this.anim(this.j(n), [{ transform: 'rotate(0)' }, { transform: `rotate(${d}deg)` }], { duration: 480, easing: EASE.pop, composite: 'add', fill: 'forwards' }, true));
    this.anim(this.j('head'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg) translateY(-3px)' }, { transform: 'rotate(0)' }], { duration: 760, easing: EASE.soft, composite: 'add', delay: H.head.delayMs });
    this.setMouth('open'); this.later(() => this.setMouth('smile'), 400);
    this.later(() => this._writeSquash(1, 1), 200);
    this.later(async () => {
      this.squash.impact(this.spec.squash.landing.scaleY);
      this.cue('land', { jump: true });
      this.secondary.impulse('head', -30); this.secondary.impulse('legL', 120); this.secondary.impulse('legR', 120); this.secondary.release();
      await this._runSquash();
      this.release(/^arm/);
      [['armL', 125], ['armR', -125]].forEach(([n, d]) => this.anim(this.j(n), [{ transform: `rotate(${d}deg)` }, { transform: 'rotate(0)' }], { duration: 620, easing: EASE.land, composite: 'add' }));
      this.blink(true); this.setMouth('closed'); this.busy = false;
    }, 760);
  }, hold);
};

export { CinematicRig };
