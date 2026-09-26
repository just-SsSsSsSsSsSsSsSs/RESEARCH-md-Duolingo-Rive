/*
 * sandbox/engine/acting.js - K9.2c "flip the switches": visible life on the
 * independent eye parts produced by K9.2b-1 (eyesL/R, pupilL/R, lidsL/R).
 * Installs methods onto CinematicRig.prototype (same pattern as flight.js).
 *
 * Everything here is data-driven from spec.acting / spec.gaze:
 *   wink(side)   one lid closes (scaleY 1) while the other stays open; a glint
 *                vfx + 'chime' cue at low gain fire through the normal cue path.
 *   dart(to)     eye-dart: both pupils snap to a target inside the eye, hold,
 *                then return; the two eyes get a tiny independent offset so the
 *                gaze is alive, never mechanical. Optional head follow (overlap).
 *   saccades     idle micro-saccades: small random pupil jumps every
 *                gaze.saccade.everyMs [min,max] of amplitude ampPx, only while
 *                idle and not looking. Disabled when spec.gaze.saccade is absent.
 *   escalation   spec.acting.escalation {small, medium, largeEveryN}: a counter
 *                per rig that tells performances which tier to use (small most
 *                of the time, medium every 3rd, large every Nth). Consumers:
 *                flight roll (flight.js), celebrate wink.
 *
 * Nothing here reads layout; only transform animations (compositor-only).
 */
import { CinematicRig, randIn, clock } from './motion.js';
import { EASE, REDUCED } from '../rig.js?v=g4';

const P = CinematicRig.prototype;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Escalation tier for the next "big" moment: 'small' | 'medium' | 'large'. Counts per rig. */
P.escalate = function (channel = 'default') {
  const E = (this.spec.acting && this.spec.acting.escalation) || { small: 1, medium: 3, largeEveryN: 7 };
  this._esc = this._esc || {};
  const n = (this._esc[channel] = (this._esc[channel] || 0) + 1);
  if (E.largeEveryN && n % E.largeEveryN === 0) return 'large';
  if (E.medium && n % E.medium === 0) return 'medium';
  return 'small';
};

/**
 * Wink: side 'L' | 'R' | undefined (random). Duration from spec.acting.wink.ms (default 180),
 * the open eye's pupil nudges toward the winking side (a real wink pulls the face).
 */
P.wink = function (side, { silent = false } = {}) {
  const W = (this.spec.acting && this.spec.acting.wink) || {};
  const ms = (W.ms || 180) / clock.rate;
  const s = side || pick(['L', 'R']);
  const lid = this.j('lid' + s), other = s === 'L' ? 'R' : 'L';
  if (!lid) return false;
  const frames = [{ transform: 'scaleY(0)', offset: 0 }, { transform: 'scaleY(1)', offset: 0.3 }, { transform: 'scaleY(1)', offset: 0.72 }, { transform: 'scaleY(0)', offset: 1 }];
  this.anim(lid, frames, { duration: ms, easing: EASE.soft, fill: 'none' });
  // the open eye squints a touch and its pupil leans to the winking side (asymmetry = life)
  const otherLid = this.j('lid' + other);
  if (otherLid && W.otherSquint) this.anim(otherLid, [{ transform: 'scaleY(0)' }, { transform: `scaleY(${W.otherSquint})`, offset: 0.4 }, { transform: 'scaleY(0)' }], { duration: ms, easing: EASE.soft, fill: 'none' });
  const dx = (s === 'L' ? -1 : 1) * (W.pupilLeanPx ?? 1.5);
  this.anim(this.j('pupil' + other), [{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px, 0.5px)`, offset: 0.4 }, { transform: 'translate(0,0)' }], { duration: ms * 1.4, easing: EASE.soft, composite: 'add', fill: 'none' });
  // head tilts toward the wink a few degrees (overlapping action)
  this.anim(this.j('head'), [{ transform: 'rotate(0)' }, { transform: `rotate(${(s === 'L' ? -1 : 1) * (W.headTiltDeg ?? 4)}deg)`, offset: 0.35 }, { transform: 'rotate(0)' }], { duration: ms * 2.2, easing: EASE.soft, composite: 'add', fill: 'none' });
  if (!silent) this.cue('wink', { side: s, dir: s === 'L' ? -1 : 1 });
  this.stats.winks = (this.stats.winks || 0) + 1;
  return true;
};

/**
 * Eye-dart: snap the gaze to a target (px inside the eye, from spec.gaze.dart.ampPx or given),
 * hold spec.gaze.dart.holdMs, return. L/R receive an independent jitter <= gaze.dart.asymPx.
 * Returns a promise resolved after the return.
 */
P.dart = function (to) {
  const D = (this.spec.gaze && this.spec.gaze.dart) || {};
  const amp = D.ampPx || [3, 5], hold = randIn(D.holdMs || [350, 800]), asym = D.asymPx ?? 0.8;
  const snap = (D.snapMs || 70) / clock.rate;
  const ang = rand(0, Math.PI * 2), r = randIn(amp);
  const tx = to ? to.x : Math.cos(ang) * r, ty = to ? to.y : Math.sin(ang) * r * 0.6;
  this.release(/pupil/);
  const layers = [];
  for (const p of ['pupilL', 'pupilR']) {
    const jx = rand(-asym, asym), jy = rand(-asym, asym) * 0.5;
    layers.push(this.anim(this.j(p), [{ transform: 'translate(0,0)' }, { transform: `translate(${(tx + jx).toFixed(2)}px, ${(ty + jy).toFixed(2)}px)` }], { duration: snap, easing: 'cubic-bezier(.2,.9,.3,1.05)', fill: 'forwards' }, true));
  }
  if (D.headFollowDeg) this.anim(this.j('head'), [{ transform: 'rotate(0)' }, { transform: `rotate(${(tx * D.headFollowDeg).toFixed(2)}deg)` }], { duration: snap * 3, delay: 60 / clock.rate, easing: EASE.soft, composite: 'add', fill: 'none' });
  this.cue('dart', { dx: tx, dy: ty });
  this.stats.darts = (this.stats.darts || 0) + 1;
  return new Promise((res) => this.later(() => { this.release(/pupil/); res(true); }, snap + hold));
};

/**
 * K9.3 intent - "look before you leap". Runs BEFORE the take-off crouch:
 *   t0            pupils snap toward the target direction (spec.acting.intent.gazeSnapMs), L/R jitter from gaze.dart.asymPx
 *   t0 + headLag  head turns toward the target (headDeg, headMs) - eye-head latency 40-50 ms [Zangemeister & Stark 1982]
 *   t0 + bodyLag  resolves -> the caller starts the crouch (body last)
 * Layers are fill:forwards and released by releaseIntent() at take-off so the flight owns the head again.
 * Data only: nothing here is a constant; all numbers come from spec.acting.intent. Disabled by ?intent=0 or enabled:false.
 */
P.intent = async function (dx, dy) {
  const I = this.spec.acting && this.spec.acting.intent;
  if (!I || I.enabled === false || REDUCED || this.disposed) return { ran: false };
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('intent') === '0') return { ran: false };
  const D = (this.spec.gaze && this.spec.gaze.dart) || {};
  const dist = Math.hypot(dx, dy) || 1, ux = dx / dist, uy = dy / dist;
  const amp = (D.ampPx ? D.ampPx[1] : 5) * (I.gazeFractionOfDart ?? 0.85), asym = D.asymPx ?? 0.8;
  const snap = randIn(I.gazeSnapMs) / clock.rate, headLag = randIn(I.headLagMs) / clock.rate, bodyLag = randIn(I.bodyLagMs) / clock.rate;
  const t0 = performance.now();
  this.release(/pupil/);
  this._intentLayers = [];
  for (const p of ['pupilL', 'pupilR']) {
    const jx = rand(-asym, asym), jy = rand(-asym, asym) * 0.5;
    const a = this.anim(this.j(p), [{ transform: 'translate(0,0)' }, { transform: `translate(${(ux * amp + jx).toFixed(2)}px, ${(uy * amp * 0.6 + jy).toFixed(2)}px)` }],
      { duration: snap, easing: 'cubic-bezier(.2,.9,.3,1.05)', fill: 'forwards' }, true);
    if (a) this._intentLayers.push(a);
  }
  const headDeg = (ux >= 0 ? 1 : -1) * I.headDeg * (0.85 + Math.abs(ux) * 0.15) - uy * I.headDeg * 0.4;   // turn toward the side, dip a little toward a low target
  const head = this.anim(this.j('head'), [{ transform: 'rotate(0deg)' }, { transform: `rotate(${headDeg.toFixed(2)}deg)` }],
    { duration: I.headMs / clock.rate, delay: headLag, easing: EASE.soft, composite: 'add', fill: 'forwards' }, true);
  if (head) this._intentLayers.push(head);
  this.cue('intent', { dx, dy, snapMs: snap * clock.rate, headLagMs: headLag * clock.rate, bodyLagMs: bodyLag * clock.rate, headDeg });
  this.stats.intents = (this.stats.intents || 0) + 1;
  await this._sleep(bodyLag * clock.rate);
  return { ran: true, t0, snapMs: snap * clock.rate, headLagMs: headLag * clock.rate, bodyLagMs: bodyLag * clock.rate, headDeg };
};

/** Drop the intent layers (pupils + head) - called at take-off and after landing (eyes lead the settle). */
P.releaseIntent = function () {
  for (const a of this._intentLayers || []) { try { a.cancel(); } catch (e) { /* already gone */ } this.live.delete(a); }
  this._intentLayers = [];
};

/** Idle micro-saccades: tiny pupil jumps, only when idle. Returns a stop function. */
P.startSaccades = function () {
  const S = this.spec.gaze && this.spec.gaze.saccade;
  if (!S || REDUCED) return () => {};
  let on = true;
  const tick = () => {
    if (!on || this.disposed) return;
    if (!this.busy && !this.flying) {
      const dx = rand(-S.ampPx, S.ampPx), dy = rand(-S.ampPx, S.ampPx) * 0.5, ms = (S.ms || 45) / clock.rate;
      for (const p of ['pupilL', 'pupilR']) this.anim(this.j(p), [{ transform: 'translate(0,0)' }, { transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`, offset: 0.15 }, { transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`, offset: 0.85 }, { transform: 'translate(0,0)' }], { duration: ms * 8, easing: 'steps(1, end)', composite: 'add', fill: 'none' });
      this.stats.saccades = (this.stats.saccades || 0) + 1;
    }
    this.later(tick, randIn(S.everyMs));
  };
  this.later(tick, randIn(S.everyMs));
  return () => { on = false; };
};

/** Spec validation for the acting extras (called from validateSpec consumers). */
export function validateActing(spec) {
  const problems = [];
  const A = spec.acting || {}, G = spec.gaze || {};
  if (A.escalation) for (const k of ['small', 'medium', 'largeEveryN']) if (typeof A.escalation[k] !== 'number') problems.push(`acting.escalation.${k} must be a number`);
  if (A.wink && A.wink.ms !== undefined && !(A.wink.ms > 0)) problems.push('acting.wink.ms must be > 0');
  if (G.saccade) { if (!(G.saccade.ampPx > 0)) problems.push('gaze.saccade.ampPx must be > 0'); if (!Array.isArray(G.saccade.everyMs)) problems.push('gaze.saccade.everyMs must be [min,max]'); }
  if (G.dart) { if (G.dart.ampPx && !Array.isArray(G.dart.ampPx)) problems.push('gaze.dart.ampPx must be [min,max]'); }
  if (A.intent && A.intent.enabled !== false) {                        // K9.3 intent budgets must be well-formed, or the spec is rejected
    for (const k of ['gazeSnapMs', 'headLagMs', 'bodyLagMs']) if (!Array.isArray(A.intent[k]) || A.intent[k].length !== 2 || !(A.intent[k][0] <= A.intent[k][1])) problems.push(`acting.intent.${k} must be [min,max]`);
    for (const k of ['headDeg', 'headMs', 'landRecentreMs', 'settleDegTarget', 'settleWithinMs']) if (!(typeof A.intent[k] === 'number' && A.intent[k] > 0)) problems.push(`acting.intent.${k} must be a number > 0`);
    if (A.intent.headLagMs && A.intent.bodyLagMs && !(A.intent.headLagMs[1] <= A.intent.bodyLagMs[0])) problems.push('acting.intent: head must lead the body (headLagMs.max <= bodyLagMs.min)');
  }
  if (spec.flight && spec.flight.roll) for (const k of ['small', 'medium', 'large']) if (!['bank', 'roll', 'rollFlip'].includes(spec.flight.roll[k])) problems.push(`flight.roll.${k} must be bank | roll | rollFlip`);
  return problems;
}
