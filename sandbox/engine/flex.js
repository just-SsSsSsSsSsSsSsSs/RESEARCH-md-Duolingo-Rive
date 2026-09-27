/*
 * sandbox/engine/flex.js - K9.5 limited flex for the 3-band wing.
 *
 * The wing plate is sliced into shoulder / mid / tip bands (tools/slice_wing.py) under nested
 * joints  armX > armX_mid > armX_tip  (owl_p2.svg, K9.5-2). No caller addresses the children:
 * this module wraps CinematicRig.prototype.anim ONCE and, whenever a caller animates armL or
 * armR with pure rotate() keyframes, derives follower layers for the children:
 *
 *   mid = rotate * segments.mid.ratio, delayed segments.mid.lagMs
 *   tip = rotate * segments.tip.ratio, delayed segments.tip.lagMs
 *         + follow-through tail: after the parent's last keyframe the tip overshoots by
 *           tail.overshoot of its last delta and settles over tail.ms   [P9 Lasseter 1987 sec 2.5:
 *           "appendages ... drag behind the leading part ... and will take longer to settle down"]
 *
 * Same duration, easing, iterations, direction, fill and composite as the parent layer, so the
 * arm reads as ONE motion with drag - never a second animation on top. Only pure rotate() layers
 * are followed (translate/scale on the parent already move the whole wing). Followers inherit
 * keep from the parent, so rig.release(/^arm/) cancels parent and children together.
 *
 * Kill switches: ?flex=0, prefers-reduced-motion, spec.acting.flex.enabled false, activeOnly
 * without data-active, or an SVG without armX_mid (single-plate art) -> pure pass-through.
 * Every number comes from spec.acting.flex (validateFlex). Compositor-only transforms.
 */
import { CinematicRig } from './motion.js';
import { EASE, REDUCED } from '../rig.js?v=g4';

const P = CinematicRig.prototype;
const FLEX_OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('flex') === '0';
const ROT = /^\s*rotate\(\s*(-?[\d.]+)\s*(deg)?\s*\)\s*$/;

/** spec.acting.flex or null when flex is off for this rig. */
P.flexSpec = function () {
  const F = this.spec && this.spec.acting && this.spec.acting.flex;
  if (!F || F.enabled === false || FLEX_OFF || REDUCED) return null;
  if (F.activeOnly && !(this.svg && this.svg.dataset.active === '1')) return null;
  return F;
};

/** rotate() angle (deg) of one keyframe, 0 for 'rotate(0)', null when the transform is not a pure rotate. */
function rotOf(kf) {
  const t = kf && kf.transform;
  if (typeof t !== 'string') return null;
  const m = ROT.exec(t);
  return m ? parseFloat(m[1]) : null;
}

const clamp = (v, m) => Math.max(-m, Math.min(m, v));

function followerKeyframes(keyframes, rots, ratio, maxDeg) {
  return keyframes.map((kf, i) => {
    const o = { transform: `rotate(${clamp(rots[i] * ratio, maxDeg).toFixed(3)}deg)` };
    if (kf.offset !== undefined) o.offset = kf.offset;
    if (kf.easing !== undefined) o.easing = kf.easing;
    return o;
  });
}

const origAnim = P.anim;

P.anim = function (el, keyframes, opts, keep = false) {
  const a = origAnim.call(this, el, keyframes, opts, keep);
  if (!a || !el || !el.dataset) return a;
  const joint = el.dataset.joint;
  if (joint !== 'armL' && joint !== 'armR') return a;
  const F = this.flexSpec();
  if (!F || !Array.isArray(keyframes) || keyframes.length < 2) return a;
  const mid = this.j(joint + '_mid'), tip = this.j(joint + '_tip');
  if (!mid || !tip) return a;
  const rots = keyframes.map(rotOf);
  if (rots.some((r) => r === null)) return a;
  if (Math.max(...rots) - Math.min(...rots) < F.minParentDeg) return a;   // breath-level wobble moves as one
  const o = Object.assign({}, opts);
  const baseDelay = o.delay || 0;
  const looping = o.iterations !== undefined && o.iterations !== 1;
  const stats = (this.stats = this.stats || {});
  for (const [name, seg, child] of [['mid', F.segments.mid, mid], ['tip', F.segments.tip, tip]]) {
    const kf = followerKeyframes(keyframes, rots, seg.ratio, F.maxDeg);
    origAnim.call(this, child, kf, Object.assign({}, o, { delay: baseDelay + seg.lagMs }), keep);
    stats.flexFollowers = (stats.flexFollowers || 0) + 1;
    if (name !== 'tip' || !F.tail || looping || o.fill === 'forwards' || o.fill === 'both') continue;
    // follow-through tail: finite, non-filling layers that end on a move
    const last = clamp(rots[rots.length - 1] * seg.ratio, F.maxDeg), prev = clamp(rots[rots.length - 2] * seg.ratio, F.maxDeg);
    const delta = last - prev;
    if (Math.abs(delta) < 1) continue;
    const over = clamp(last + delta * F.tail.overshoot, F.maxDeg);
    const dur = (typeof o.duration === 'number' ? o.duration : 0) + seg.lagMs;
    origAnim.call(this, child, [
      { transform: `rotate(${last.toFixed(3)}deg)` }, { transform: `rotate(${over.toFixed(3)}deg)`, offset: 0.45 }, { transform: `rotate(${last.toFixed(3)}deg)` }
    ], { duration: F.tail.ms, delay: baseDelay + dur, easing: EASE[F.tail.easing] || EASE.land, composite: 'add' }, false);
    stats.flexTails = (stats.flexTails || 0) + 1;
    if (this.cue) this.cue('flex', { joint, tailMs: F.tail.ms, overshootDeg: +(over - last).toFixed(2) });
  }
  return a;
};

/** Spec validation, same contract as validateActing: list of problems (empty = ok). */
export function validateFlex(spec) {
  const problems = [];
  const F = spec.acting && spec.acting.flex;
  if (!F || F.enabled === false) return problems;
  const p = 'acting.flex';
  if (!F.segments || !F.segments.mid || !F.segments.tip) { problems.push(`${p}.segments must have mid and tip`); return problems; }
  for (const k of ['mid', 'tip']) {
    const s = F.segments[k];
    if (!(typeof s.ratio === 'number' && s.ratio > 0 && s.ratio <= 1.5)) problems.push(`${p}.segments.${k}.ratio must be in (0, 1.5]`);
    if (!(typeof s.lagMs === 'number' && s.lagMs >= 0 && s.lagMs <= 250)) problems.push(`${p}.segments.${k}.lagMs must be in [0, 250]`);
  }
  if (!(F.segments.mid.lagMs <= F.segments.tip.lagMs)) problems.push(`${p}: the tip must lag at least as much as the mid (drag order)`);
  if (!(typeof F.maxDeg === 'number' && F.maxDeg > 0 && F.maxDeg <= 60)) problems.push(`${p}.maxDeg must be in (0, 60]`);
  if (!(typeof F.minParentDeg === 'number' && F.minParentDeg >= 0)) problems.push(`${p}.minParentDeg must be a number >= 0`);
  if (F.tail) {
    if (!(F.tail.ms > 0 && F.tail.ms <= 800)) problems.push(`${p}.tail.ms must be in (0, 800]`);
    if (!(F.tail.overshoot >= 0 && F.tail.overshoot <= 0.5)) problems.push(`${p}.tail.overshoot must be in [0, 0.5]`);
    if (F.tail.easing !== undefined && !(F.tail.easing in EASE)) problems.push(`${p}.tail.easing must name an EASE entry`);
  }
  if (F.activeOnly !== undefined && typeof F.activeOnly !== 'boolean') problems.push(`${p}.activeOnly must be a boolean`);
  return problems;
}
