/**
 * K9.2 Pose layer - the performance lives in data, not in code.
 *
 * A pose is a named set of per-joint transforms (deg / px / scale) plus eye and mouth
 * state, declared in the Character Spec under "poses". PoseLayer applies a pose through
 * one persistent, paused, additive WAAPI animation per joint (the same mechanism the
 * physics uses for secondary springs), so poses stack on top of breath, springs and
 * squash instead of replacing them. Compositor-only: transform / opacity, zero layout.
 *
 * Joint channels: rot (deg), x, y (px), sx, sy (scale), skew (deg).
 * Asymmetry: pose.asym = { delayMs: [min,max], gainJitter } applies a different delay
 * and gain to the right side (armR, legR, eyeR, lidR) versus the left, per apply().
 * Eye-lead: pose.lead = ['eyes','head','body'] applies joints in that order with the
 * spec.acting.leadMs stagger, so the eyes arrive first and the body last.
 */
import { clock } from './physics.js';

const SIDE_R = /R$/;
const CH = ['rot', 'x', 'y', 'sx', 'sy', 'skew'];

function transformOf(c) {
  const t = [];
  if (c.x || c.y) t.push(`translate(${c.x || 0}px, ${c.y || 0}px)`);
  if (c.rot) t.push(`rotate(${c.rot}deg)`);
  if (c.skew) t.push(`skewX(${c.skew}deg)`);
  if (c.sx !== undefined || c.sy !== undefined) t.push(`scale(${c.sx ?? 1}, ${c.sy ?? 1})`);
  return t.length ? t.join(' ') : 'translate(0px, 0px)';
}

const randIn = (r) => Array.isArray(r) ? r[0] + Math.random() * (r[1] - r[0]) : (r || 0);

export class PoseLayer {
  constructor(rig, spec) {
    this.rig = rig; this.spec = spec; this.poses = spec.poses || {}; this.acting = spec.acting || {};
    this.layers = {};       // joint -> paused additive Animation
    this.current = null; this.timers = new Set();
    this.stats = { applied: 0, holds: 0 };
  }

  _layer(joint) {
    if (this.layers[joint]) return this.layers[joint];
    const el = this.rig.j(joint); if (!el) return null;
    const a = el.animate([{ transform: 'translate(0px, 0px)' }, { transform: 'translate(0px, 0px)' }], { duration: 1000, fill: 'both', composite: 'add' });
    a.pause(); this.rig.live.add(a); this.layers[joint] = a; return a;
  }

  /** Order joints so the lead chain (eyes -> head -> body) goes first, each group staggered by leadMs. */
  _schedule(pose) {
    const lead = pose.lead || this.acting.lead || ['eyes', 'head', 'body'];
    const groups = { eyes: ['eyeL', 'eyeR', 'pupilL', 'pupilR', 'lidL', 'lidR'], head: ['head', 'mouth'], body: ['body', 'root', 'armL', 'armR', 'legL', 'legR', 'shadow'] };
    const leadMs = this.acting.leadMs || 0;
    const out = [];
    for (const j of Object.keys(pose.joints || {})) {
      const gi = lead.findIndex((g) => (groups[g] || []).includes(j));
      out.push({ joint: j, delay: gi < 0 ? 0 : gi * leadMs });
    }
    return out;
  }

  /**
   * Apply a pose. opts.snapMs overrides the attack (1-3 frames = 17-50 ms for a snap),
   * opts.holdMs keeps it, then release() unless opts.stay. Returns a promise resolved after hold.
   */
  async apply(name, opts = {}) {
    const pose = this.poses[name]; if (!pose) return false;
    const attack = opts.snapMs ?? pose.snapMs ?? this.acting.snapMs ?? 50;
    const hold = opts.holdMs ?? pose.holdMs ?? 0;
    const asym = pose.asym || this.acting.asym || null;
    const rDelay = asym ? randIn(asym.delayMs) : 0, rGain = asym ? 1 + (Math.random() * 2 - 1) * (asym.gainJitter || 0) : 1;
    this.current = name; this.stats.applied++;
    for (const { joint, delay } of this._schedule(pose)) {
      const c = { ...pose.joints[joint] };
      const right = SIDE_R.test(joint);
      if (right && asym) { if (c.rot) c.rot *= rGain; if (c.x) c.x *= rGain; }
      const t = transformOf(c);
      const d = (delay + (right ? rDelay : 0)) / clock.rate;
      const go = () => { const a = this._layer(joint); if (!a) return; a.effect.setKeyframes([{ transform: a.effect.getKeyframes()[1].transform }, { transform: t }]); a.effect.updateTiming({ duration: Math.max(1, attack / clock.rate), easing: pose.easing || 'cubic-bezier(.2,.9,.3,1.1)' }); a.currentTime = 0; a.play(); a.finished.then(() => { a.pause(); a.currentTime = a.effect.getTiming().duration; }).catch(() => {}); };
      if (d > 0) { const id = setTimeout(() => { this.timers.delete(id); go(); }, d); this.timers.add(id); } else go();
    }
    if (pose.mouth) this.rig.setMouth(pose.mouth);
    if (pose.lids !== undefined) this._lids(pose.lids, attack);
    if (hold > 0) { this.stats.holds++; await new Promise((r) => this.rig.later(r, attack + hold)); }
    if (hold > 0 && !opts.stay) this.release(pose.releaseMs);
    return true;
  }

  /** Eyelid coverage 0..1 (0 open, 1 closed) through the lid joints' scaleY (art contract: lids are scaleY(0) when open). */
  _lids(v, ms) {
    for (const n of ['lidL', 'lidR']) { const el = this.rig.j(n); if (el) this.rig.anim(el, [{ transform: `scaleY(${v})` }], { duration: ms / clock.rate, fill: 'forwards' }, true); }
  }

  /** Return every joint to neutral with a settle curve (spring-like linear() easing from the spec or a soft bezier). */
  release(ms) {
    const dur = (ms ?? this.acting.releaseMs ?? 320) / clock.rate;
    for (const [joint, a] of Object.entries(this.layers)) {
      const from = a.effect.getKeyframes()[1].transform;
      a.effect.setKeyframes([{ transform: from }, { transform: 'translate(0px, 0px)' }]);
      a.effect.updateTiming({ duration: dur, easing: this.acting.settleEasing || 'cubic-bezier(.34,1.56,.64,1)' });
      a.currentTime = 0; a.play(); a.finished.then(() => { a.pause(); a.currentTime = dur; }).catch(() => {});
      void joint;
    }
    this._lids(0, Math.min(dur, 160));
    this.current = null;
  }

  /** Freeze the current pose for stills (pose sheet): jump every layer to its end state. */
  freeze() { for (const a of Object.values(this.layers)) { a.pause(); a.currentTime = a.effect.getTiming().duration; } }

  dispose() { for (const id of this.timers) clearTimeout(id); this.timers.clear(); for (const a of Object.values(this.layers)) { try { a.cancel(); } catch (e) { /* gone */ } this.rig.live.delete(a); } this.layers = {}; }
}

/** validateSpec extension: poses must reference known joints and channels; beats must reference known poses. */
export function validatePoses(spec, knownJoints) {
  const problems = [];
  const poses = spec.poses || {};
  for (const [name, p] of Object.entries(poses)) {
    if (!p || typeof p !== 'object') continue;
    for (const [j, c] of Object.entries(p.joints || {})) {
      if (knownJoints && !knownJoints.includes(j)) problems.push(`pose ${name}: unknown joint ${j}`);
      for (const k of Object.keys(c)) if (!CH.includes(k)) problems.push(`pose ${name}.${j}: unknown channel ${k}`);
    }
    if (p.mouth && spec.mouth && spec.mouth.shapes && !spec.mouth.shapes.includes(p.mouth)) problems.push(`pose ${name}: unknown mouth ${p.mouth}`);
  }
  const list = (spec.states && spec.states.list) || {};
  for (const [st, s] of Object.entries(list)) {
    if (!s || typeof s !== 'object') continue;
    for (const b of (s.beats || [])) if (!poses[b.pose]) problems.push(`state ${st}: beat references unknown pose ${b.pose}`);
    if (s.pose && !poses[s.pose]) problems.push(`state ${st}: unknown pose ${s.pose}`);
  }
  return problems;
}
