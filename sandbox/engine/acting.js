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
import { blinkRng } from './rng.js';   // K9.5-1: the idle moving-hold scheduler also fires blinkDouble; when a recording is seeded it draws from the same source
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
  const asymMin = (I.budget && I.budget.asymMinPx) || 0;
  const jL = [rand(-asym, asym), rand(-asym, asym) * 0.5];                                   // left eye jitter
  const sgn = Math.random() < 0.5 ? -1 : 1, gap = rand(Math.max(asymMin, 0.05), Math.max(asym, asymMin + 0.05));
  const jR = [jL[0] + sgn * gap, jL[1] + sgn * gap * 0.35];                                    // right eye = left + a guaranteed gap (never a mirror)
  for (const p of ['pupilL', 'pupilR']) {
    const [jx, jy] = p === 'pupilL' ? jL : jR;
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
  // bodyLag is counted from the moment the eyes actually start (WAAPI resolves startTime at the next
  // rendering frame, 1-3 frames after this call); otherwise the body lead shrinks by that frame gap.
  await Promise.all(this._intentLayers.map(a => (a.ready || Promise.resolve()).catch(() => {})));
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

// ---------------------------------------------------------------------------------------------
// K9.4 owner-vision performances (spec.acting.performances). Structure per Webster 2005 (P6):
// anticipation (squash) -> extreme (stretch) -> settle; escalation tier = the exaggeration dial.
// Every performance: cue('perf', {name, tier}) at start, cue('fx', {vfx}) per tier VFX, cue('settle') at the end.
// `?perf=0` or performances.enabled false -> callers fall back to the pre-K9.4 clips (celebrate/sad/think).
// ---------------------------------------------------------------------------------------------
const PERF_OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('perf') === '0';

P.perfSpec = function (name) {
  const Pf = this.spec.acting && this.spec.acting.performances;
  if (!Pf || Pf.enabled === false || PERF_OFF || !Pf[name]) return null;
  return Pf[name];
};
P._tierOf = function (spec, tier) { return spec.tiers[tier] || spec.tiers.small; };
P._fx = function (list) { for (const v of list || []) this.cue('fx', { vfx: v }); };
/** A reduced-motion performance: face only (mouth + blink), no root/body transforms, no VFX (WCAG 2.3.3). */
P._reducedFace = function (mouth, ms) {
  this.setMouth(mouth); this.blink(true);
  this.later(() => { this.setMouth('closed'); this.busy = false; this.cue('settle'); }, ms);
};

// ---------------------------------------------------------------------------------------------
// K9.6-3 generic choreography player (owner decision a3e73842 / cf3d3a8a: "carry the winner" = the v1 hand-written
// performances become DATA under performances.<name>.choreo and are played back by ONE engine path).
// A choreo block (validated by validateActing) is: totalMs, reduced{mouth, blinkDouble, closeAtMs}, channels[], events[].
//   channel: {id, joints[], keyframes[], ms, delayMs?, atMs?, iterations?, easing, composite?, fill?, keep?}
//            -> this.anim(this.j(joint), keyframes, {duration, delay, iterations, easing, composite, fill}, keep)
//            The option object carries ONLY the keys present in the data, so getTiming() of the produced Animation is
//            byte-for-byte what the v1 method produced (delay stays a WAAPI delay; atMs stays a later() timer - both
//            mechanisms are kept because v1 used both, and the proof compares startTime within one frame).
//   event:   {atMs, mouth} | {atMs, blink} | {atMs, release:[joints]} | {atMs, cue}
// Scheduling: everything sharing one atMs runs from ONE timer, in the fixed order release -> channels -> mouth -> blink
// -> cue (v1 released the held layers before starting the aha trio). atMs 0 runs synchronously, exactly like the inline
// statements at the top of v1 think()/sad(). REDUCED (WCAG 2.3.3): face only, from `reduced` = {mouth, blinkDouble?,
// events?[{atMs, mouth|blink}], closeAtMs} (think: mid + double blink at 0, close 1400; sad: sad at 0, smile + double blink at
// 900, close 1600 - both copied from the v1 REDUCED lines), no channels, no VFX.
// Cues: perf at start, fx per tier, settle at totalMs - the K9.4 convention Foley/state layer already listen to.
// ---------------------------------------------------------------------------------------------
P._choreoSchedule = function (C) {
  const at = new Map();
  const add = (ms, order, run) => { const k = Math.max(0, ms | 0); if (!at.has(k)) at.set(k, []); at.get(k).push({ order, run }); };
  for (const ch of C.channels) {
    const opts = { duration: ch.ms };
    if (ch.delayMs) opts.delay = ch.delayMs;
    if (ch.iterations != null) opts.iterations = ch.iterations;
    opts.easing = EASE[ch.easing] || ch.easing;
    if (ch.composite) opts.composite = ch.composite;
    if (ch.fill) opts.fill = ch.fill;
    add(ch.atMs || 0, 1, () => { for (const jn of ch.joints) this.anim(this.j(jn), ch.keyframes, opts, ch.keep === true); });
  }
  for (const ev of C.events) {
    if (ev.release) add(ev.atMs, 0, () => this.release(new RegExp('^(' + ev.release.join('|') + ')$')));
    else if (ev.mouth) add(ev.atMs, 2, () => this.setMouth(ev.mouth));
    else if (typeof ev.blink === 'boolean') add(ev.atMs, 3, () => this.blink(ev.blink));
    else if (ev.cue) add(ev.atMs, 4, () => this.cue(ev.cue, { perf: this._lastPerf && this._lastPerf.name }));
  }
  const times = [...at.keys()].sort((a, b) => a - b);
  for (const t of times) at.get(t).sort((a, b) => a.order - b.order);
  return { times, at };
};

/** Play performances.<name>.choreo. Resolves true at totalMs (false when busy). Falls back to nothing when absent. */
P.perform = function (name, tier = 'small') {
  const S = this.perfSpec(name); if (!S || !S.choreo) return Promise.resolve(false);
  if (this.busy) return Promise.resolve(false); this.busy = true;
  const C = S.choreo, t = S.tiers ? this._tierOf(S, tier) : { vfx: [] };
  this._lastPerf = { name, tier, plan: { totalMs: C.totalMs, channels: C.channels.length, events: C.events.length, reduced: !!REDUCED } };
  this.stats.performances = (this.stats.performances || 0) + 1;
  this.cue('perf', { name, tier });
  if (REDUCED) {   // face only: reduced.mouth at 0 (+ blink(blinkDouble) at 0 when declared), optional mid-way face events (mouth | blink), closed at closeAtMs
    const R = C.reduced; this.setMouth(R.mouth); if (R.blinkDouble !== undefined) this.blink(!!R.blinkDouble);
    for (const ev of R.events || []) this.later(() => { if (ev.mouth) this.setMouth(ev.mouth); else if (typeof ev.blink === 'boolean') this.blink(ev.blink); }, ev.atMs);
    this.later(() => { this.setMouth('closed'); this.busy = false; this.cue('settle'); }, R.closeAtMs); return this._sleep(R.closeAtMs).then(() => true);
  }
  const { times, at } = this._choreoSchedule(C);
  const fire = (ms) => { for (const a of at.get(ms)) a.run(); };
  for (const ms of times) { if (ms === 0) fire(0); else this.later(() => fire(ms), ms); }
  this._fx(t.vfx);
  this._lastPerf.plan.schedule = times.map((ms) => ({ atMs: ms, actions: at.get(ms).length }));
  this.later(() => { this.busy = false; this.cue('settle'); }, C.totalMs);   // the closing mouth event is part of the data (validated: exactly one at totalMs)
  return this._sleep(C.totalMs).then(() => true);
};

/**
 * Triumph: crouch -> jump (apex scaled by tier) -> [large: 360 root roll around the apex, level before landing]
 * -> volume-preserving landing -> wink; VFX per tier. Returns a promise resolved at settle.
 */
P.triumph = function (tier = 'small') {
  const T = this.perfSpec('triumph'); if (!T) return this.celebrate();
  if (this.busy) return Promise.resolve(false); this.busy = true;
  const t = this._tierOf(T, tier);
  this._lastPerf = { name: 'triumph', tier };
  this.stats.performances = (this.stats.performances || 0) + 1;
  this.cue('perf', { name: 'triumph', tier });
  if (REDUCED) { this._reducedFace('smile', 1200); return this._sleep(1200); }
  const S = this.spec.squash.jump, hold = randIn(T.anticipateMs), air = T.airMs, jump = T.jumpPx * t.apexScale;
  return new Promise((resolve) => {
    this._writeSquash(1 / S.scaleY, S.scaleY);
    this.cue('anticipate', { holdMs: hold });
    this.later(() => {
      this._writeSquash(1 / S.stretch, S.stretch);
      this.cue('jump');
      this.anim(this.j('root'), [{ transform: 'translateY(0)' }, { transform: `translateY(${-jump}px)`, offset: 0.45 }, { transform: `translateY(${-jump}px)`, offset: 0.52 }, { transform: 'translateY(0)' }],
        { duration: air, easing: EASE.soft, composite: 'add' });
      [['armL', 125], ['armR', -125]].forEach(([n, d]) => this.anim(this.j(n), [{ transform: 'rotate(0)' }, { transform: `rotate(${d}deg)` }], { duration: 480, easing: EASE.pop, composite: 'add', fill: 'forwards' }, true));
      this.anim(this.j('head'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg) translateY(-3px)' }, { transform: 'rotate(0)' }], { duration: air, easing: EASE.soft, composite: 'add' });
      if (t.roll) {
        // 360 roll centred on the apex; the layer ends before touchdown so the owl lands level (proof: |root rot| < 2 deg at 'land')
        const rollMs = Math.min(T.rollMs, air * 0.7), start = air * 0.5 - rollMs / 2;
        this.later(() => { this.anim(this.j('root'), [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: rollMs, easing: EASE.soft, composite: 'add' }); this.cue('roll', { tier, perf: 'triumph' }); }, start);
      }
      this._fx(t.vfx);
      this.setMouth('open'); this.later(() => this.setMouth('smile'), 400);
      this.later(() => this._writeSquash(1, 1), 200);
      this.later(async () => {
        this.squash.impact(this.spec.squash.landing.scaleY);
        this.cue('land', { jump: true, perf: 'triumph', tier });
        this.secondary.impulse('head', -30); this.secondary.impulse('legL', 120); this.secondary.impulse('legR', 120); this.secondary.release();
        await this._runSquash();
        this.release(/^arm/);
        [['armL', 125], ['armR', -125]].forEach(([n, d]) => this.anim(this.j(n), [{ transform: `rotate(${d}deg)` }, { transform: 'rotate(0)' }], { duration: 620, easing: EASE.soft, composite: 'add' }));
        if (t.wink && this.wink) this.later(() => this.wink(), 120); else this.blink(true);
        this.setMouth('closed'); this.busy = false; this.cue('settle');
        resolve(true);
      }, air);
    }, hold);
  });
};

/**
 * Oops: the take (P6). rest -> squash anticipation -> stretch extreme (held) -> recoil -> settle.
 * medium = double take (second anticipation before the extreme); large = + jiggle (damped body oscillation).
 */
P.oops = function (tier = 'small') {
  const S = this.perfSpec('sad'); if (S && S.choreo) return this.perform('sad', tier);   // K9.6-5: the v1 sad() choreography as data (owner decision a3e73842); the K9.4 take below stays for legacy specs
  const O = this.perfSpec('oops'); if (!O) return this.sad();
  if (this.busy) return Promise.resolve(false); this.busy = true;
  const t = this._tierOf(O, tier);
  this._lastPerf = { name: 'oops', tier };
  this.stats.performances = (this.stats.performances || 0) + 1;
  this.cue('perf', { name: 'oops', tier });
  if (REDUCED) { this._reducedFace('sad', 1400); return this._sleep(1400); }
  const ant = randIn(O.anticipateMs), stretch = randIn(O.stretchScaleY), holdMs = randIn(O.holdMs);
  const squashY = 1 / stretch;           // volume-preserving pair: the anticipation squash mirrors the extreme stretch
  const takes = t.doubleTake ? 2 : 1;
  const beats = [];                       // [{at, fn}] assembled on the engine clock; the proof reads the squash layer keyframes
  let at = 0;
  for (let k = 0; k < takes; k++) {
    beats.push({ at, fn: () => { this._writeSquash(1 / squashY, squashY); this.cue('anticipate', { holdMs: ant, take: k + 1 }); this.setMouth(k ? 'mid' : 'closed'); if (k) this.anim(this.j('head'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(0)' }], { duration: ant, easing: EASE.soft, composite: 'add' }); } });
    at += ant;
    if (k < takes - 1) { beats.push({ at, fn: () => { this._writeSquash(1, 1); } }); at += Math.max(80, ant * 0.6); }
  }
  const extremeAt = at;
  beats.push({ at, fn: () => {
    this._writeSquash(1 / stretch, stretch);                                   // the extreme: eyes wide, wings up, mouth open
    this.cue('take', { stretch, holdMs, tier });
    this.setMouth('open'); this.blink(false);
    ['pupilL', 'pupilR'].forEach((p) => this.anim(this.j(p), [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }], { duration: 120, easing: EASE.pop, composite: 'add', fill: 'forwards' }, true));
    [['armL', 1], ['armR', -1]].forEach(([n, s]) => this.anim(this.j(n), [{ transform: 'rotate(0)' }, { transform: `rotate(${95 * s}deg)` }], { duration: 140, easing: EASE.pop, composite: 'add', fill: 'forwards' }, true));
    this.anim(this.j('root'), [{ transform: 'translate(0,0)' }, { transform: 'translate(-4px,-10px)' }], { duration: 140, easing: EASE.pop, composite: 'add', fill: 'forwards' }, true);
  } });
  at += holdMs;
  beats.push({ at, fn: () => {                                                 // recoil back and down, dizzy head, mouth sad
    this.cue('recoil', { tier });
    this.release(/^(pupil|arm|root)/);
    this.anim(this.j('root'), [{ transform: 'translate(-4px,-10px) rotate(0)' }, { transform: 'translate(-14px,0) rotate(-5deg)', offset: 0.35 }, { transform: 'translate(-10px,0) rotate(0)', offset: 0.7 }, { transform: 'translate(0,0) rotate(0)' }], { duration: 900, easing: EASE.soft, composite: 'add' });
    [['armL', 1], ['armR', -1]].forEach(([n, s]) => this.anim(this.j(n), [{ transform: `rotate(${95 * s}deg)` }, { transform: `rotate(${75 * s}deg)`, offset: 0.3 }, { transform: 'rotate(0)' }], { duration: 700, easing: EASE.soft, composite: 'add' }));
    this.anim(this.j('head'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg) translate(-3px,2px)' }, { transform: 'rotate(10deg) translate(3px,2px)' }, { transform: 'rotate(0)' }], { duration: 480, iterations: 2, easing: EASE.sine, composite: 'add' });
    this.setMouth('sad');
    // settle with jiggle (large): damped body oscillation about rest, amplitude *= jiggleDecay per cycle
    this.squash.impact(1 - O.jiggleAmpScale * (t.jiggle ? 1 : 0.4));
    this._runSquash();
    if (t.jiggle) {
      const amp0 = O.jiggleAmpScale, n = t.jiggle, per = O.jiggleMs, kf = [{ transform: 'scale(1,1)', offset: 0 }];
      for (let i = 0; i < n; i++) { const a = amp0 * Math.pow(O.jiggleDecay, i); kf.push({ transform: `scale(${(1 - a).toFixed(3)},${(1 + a).toFixed(3)})`, offset: (i + 0.5) / n }); kf.push({ transform: `scale(${(1 + a * 0.6).toFixed(3)},${(1 - a * 0.6).toFixed(3)})`, offset: (i + 1) / n - 0.001 }); }
      kf.push({ transform: 'scale(1,1)', offset: 1 });
      this.anim(this.j('body'), kf, { duration: per * n, easing: EASE.sine, composite: 'add' });
      this.cue('jiggle', { cycles: n, ms: per * n });
    }
  } });
  at += 900;
  beats.push({ at, fn: () => {                                                 // recovery: shrug + oops smile (encourage retry)
    this.setMouth('smile');
    [['armL', 1], ['armR', -1]].forEach(([n, s]) => this.anim(this.j(n), [{ transform: 'rotate(0)' }, { transform: `rotate(${35 * s}deg)` }, { transform: 'rotate(0)' }], { duration: 500, easing: EASE.pop, composite: 'add' }));
    this.blink(true);
  } });
  const total = Math.min(O.totalMaxMs, at + 600);
  beats.push({ at: total, fn: () => { this.setMouth('closed'); this.busy = false; this.cue('settle'); } });
  this._lastPerf.plan = { anticipateMs: ant, stretch, holdMs, extremeAt, totalMs: total, takes, jiggle: t.jiggle };
  for (const b of beats) this.later(b.fn, b.at);
  return this._sleep(total).then(() => true);
};

/**
 * Puzzled: spiral gaze (pupils trace an outward spiral, radius spiralRadiusPx[0] -> [1] over spiralMs), dramatic head tilt
 * by tier, wing-to-chin, thought bubble (medium+), shrug (large); pupils re-centre within recentreMs at the end.
 */
/**
 * K9.5-2 (owner decision 2026-09-27, item a): the think state's OWN calm performance, from spec.acting.performances.think.
 * Read from the G12 record (think 0/7 while the v2 state borrowed the puzzled spiral): eyes lead (gaze lifts up-and-away and
 * HOLDS), head follows with a small tilt (<= 9 deg), optional wing to chin, one soft blink mid-hold, micro-drift so the hold
 * is alive, then a clean settle. No spiral, no bubble, no shrug. Falls back to the legacy think() when the block is absent.
 */
P.ponder = function (tier = 'small') {
  const K = this.perfSpec('think'); if (!K) return this.think();
  if (K.choreo) return this.perform('think', tier);   // K9.6-3: the v1 think() choreography as data (owner decision a3e73842); the K9.5-2 calm block below stays for legacy specs
  if (this.busy) return Promise.resolve(false); this.busy = true;
  const t = this._tierOf(K, tier);
  this._lastPerf = { name: 'think', tier };
  this.stats.performances = (this.stats.performances || 0) + 1;
  this.cue('perf', { name: 'think', tier });
  if (REDUCED) { this._reducedFace('mid', 1400); return this._sleep(1400); }
  const [gx, gy] = K.gazePx, hold = randIn(K.holdMs), total = Math.min(K.totalMaxMs, K.liftMs + hold + K.settleMs);
  const drift = K.driftPx, driftMs = K.driftMs / clock.rate;
  this.setMouth('mid');
  for (const p of ['pupilL', 'pupilR']) this.anim(this.j(p), [{ transform: 'translate(0,0)' }, { transform: `translate(${gx}px, ${gy}px)` }], { duration: K.liftMs, easing: EASE.soft, fill: 'forwards' }, true);   // eyes lead
  this.later(() => this.anim(this.j('head'), [{ transform: 'rotate(0)' }, { transform: `rotate(${-t.headDeg}deg) translate(${(gx * 0.5).toFixed(1)}px, -1px)` }], { duration: K.liftMs, easing: EASE.soft, composite: 'add', fill: 'forwards' }, true), K.headFollowMs);   // head follows
  if (t.wing) this.anim(this.j('armR'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-128deg) translate(2px,-14px)' }], { duration: 550, easing: EASE.pop, composite: 'add', fill: 'forwards', delay: K.headFollowMs + 120 }, true);
  this.later(() => this.blink(false), K.blinkAtMs);                   // one soft blink mid-hold
  this.later(() => {                                                  // micro-drift: the hold is alive, not frozen (<= driftPx, validated)
    for (const [p, s] of [['pupilL', 1], ['pupilR', -1]]) this.anim(this.j(p), [{ transform: 'translate(0,0)' }, { transform: `translate(${(drift * s).toFixed(2)}px, ${(-drift * 0.5).toFixed(2)}px)` }, { transform: 'translate(0,0)' }], { duration: driftMs, easing: EASE.sine, composite: 'add', iterations: Math.max(1, Math.floor((hold - K.blinkAtMs) / K.driftMs)) });
    this.cue('hold', { impulse: 'thinkDrift', joints: ['pupilL', 'pupilR'], ms: K.driftMs });
  }, K.blinkAtMs + 150);
  this._fx(t.vfx);
  this.later(() => { this.release(/^(pupilL|pupilR|head|armR)$/); this.cue('recentre', { withinMs: K.settleMs }); }, K.liftMs + hold);   // clean settle
  this.later(() => { this.setMouth('closed'); this.busy = false; this.cue('settle'); }, total);
  this._lastPerf.plan = { liftMs: K.liftMs, holdMs: hold, settleMs: K.settleMs, totalMs: total, headDeg: t.headDeg, wing: !!t.wing };
  return this._sleep(total).then(() => true);
};

P.puzzled = function (tier = 'small') {
  const Z = this.perfSpec('puzzled'); if (!Z) return this.think();
  if (this.busy) return Promise.resolve(false); this.busy = true;
  const t = this._tierOf(Z, tier);
  this._lastPerf = { name: 'puzzled', tier };
  this.stats.performances = (this.stats.performances || 0) + 1;
  this.cue('perf', { name: 'puzzled', tier });
  if (REDUCED) { this._reducedFace('mid', 1400); return this._sleep(1400); }
  const [r0, r1] = Z.spiralRadiusPx, turns = Z.spiralTurns, N = Math.max(12, Math.round(turns * 12));
  const kf = []; for (let i = 0; i <= N; i++) { const u = i / N, a = u * turns * Math.PI * 2, r = r0 + (r1 - r0) * u; kf.push({ transform: `translate(${(Math.cos(a) * r).toFixed(2)}px, ${(Math.sin(a) * r * 0.7 - 1.5).toFixed(2)}px)`, offset: u }); }
  const hold = randIn(Z.holdMs), spiralMs = Z.spiralMs, total = Math.min(Z.totalMaxMs, spiralMs + hold + 700);
  this.setMouth('mid');
  for (const p of ['pupilL', 'pupilR']) this.anim(this.j(p), kf, { duration: spiralMs, easing: 'linear', fill: 'forwards' }, true);   // spiral ends at the outer radius and holds there (thinking)
  this.anim(this.j('head'), [{ transform: 'rotate(0)' }, { transform: `rotate(${t.headDeg}deg) translate(3px,-2px)` }], { duration: 700, easing: EASE.soft, composite: 'add', fill: 'forwards' }, true);
  this.anim(this.j('armR'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-128deg) translate(2px,-14px)' }], { duration: 550, easing: EASE.pop, composite: 'add', fill: 'forwards', delay: 200 }, true);
  this.anim(this.j('armR'), [{ transform: 'translate(0,0)' }, { transform: 'translate(0,-3px)' }, { transform: 'translate(0,0)' }], { duration: 380, iterations: 3, easing: EASE.sine, composite: 'add', delay: 800 });
  this.cue('spiral', { tier, r0, r1, ms: spiralMs });
  this.later(() => this._fx(t.vfx), spiralMs * 0.6);
  this.later(() => this.setMouth('closed'), 900);
  this.later(() => {                                                  // resolve: pupils snap back to centre (recentre), head pops, optional shrug
    this.release(/^(pupilL|pupilR|head|armR)$/);
    this.cue('recentre', { withinMs: Z.recentreMs });
    this.anim(this.j('head'), [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-6px) scale(1.06)' }, { transform: 'translateY(0) scale(1)' }], { duration: 450, easing: EASE.pop, composite: 'add' });
    if (t.shrug) [['armL', 1], ['armR', -1]].forEach(([n, s]) => this.anim(this.j(n), [{ transform: 'rotate(0)' }, { transform: `rotate(${40 * s}deg) translateY(-4px)` }, { transform: 'rotate(0)' }], { duration: 520, easing: EASE.pop, composite: 'add' }));
    this.setMouth('smile'); this.blink(true);
  }, spiralMs + hold);
  this.later(() => { this.setMouth('closed'); this.busy = false; this.cue('settle'); }, total);
  this._lastPerf.plan = { spiralMs, holdMs: hold, totalMs: total, headDeg: t.headDeg };
  return this._sleep(total).then(() => true);
};

/**
 * Moving hold (P4/P5): named, distributed idle impulses from spec.acting.performances.movingHold. One impulse every
 * intervalMs while idle (never busy/flying), never the same joint twice within minGapSameJointMs, each <= maxMs and
 * within maxPx/maxDeg (validated). Emits cue('hold', {impulse, joints}). Returns a stop function.
 */
P.startMovingHold = function () {
  const M = this.spec.acting && this.spec.acting.performances && this.spec.acting.performances.movingHold;
  if (!M || M.enabled === false || REDUCED || PERF_OFF) return () => {};
  const names = Object.keys(M.impulses); let on = true; const lastJoint = {}; let bag = [];
  this.stats.holdImpulses = this.stats.holdImpulses || {};
  const fire = (name) => {
    const im = M.impulses[name], now = performance.now();
    if (im.joints.some((j) => lastJoint[j] && now - lastJoint[j] < M.minGapSameJointMs)) return false;
    const ms = im.ms / clock.rate, sgn = blinkRng.random() < 0.5 ? -1 : 1;   // K9.5-1: blinkRng == Math.random unless ?seed=
    if (name === 'blinkDouble') { this.blink(true); }
    else im.joints.forEach((j, k) => {
      const el = this.j(j); if (!el) return;
      const s = (k % 2 ? -1 : 1) * sgn, amp = im.px ? `translate(${(im.px * s).toFixed(2)}px, ${(-im.px * 0.4).toFixed(2)}px)` : `rotate(${(im.deg * s).toFixed(2)}deg)`;
      this.anim(el, [{ transform: im.px ? 'translate(0,0)' : 'rotate(0)' }, { transform: amp, offset: 0.45 }, { transform: im.px ? 'translate(0,0)' : 'rotate(0)' }], { duration: ms, easing: EASE.soft, composite: 'add' });
    });
    im.joints.forEach((j) => { lastJoint[j] = now; });
    this.stats.holdImpulses[name] = (this.stats.holdImpulses[name] || 0) + 1;
    this.cue('hold', { impulse: name, joints: im.joints, ms: im.ms });
    return true;
  };
  const tick = () => {
    if (!on || this.disposed) return;
    if (!this.busy && !this.flying) {
      // shuffled bag: every impulse name is used once before any repeats (declared budget: >= 3 distinct names in 20 s),
      // then the bag is reshuffled - random order, guaranteed variety (P4: no favourite tic)
      if (!bag.length) bag = names.slice().sort(() => blinkRng.random() - 0.5);
      for (let i = 0; i < bag.length; i++) { if (fire(bag[i])) { bag.splice(i, 1); break; } }
    }
    this.later(tick, blinkRng.between(M.intervalMs[0], M.intervalMs[1]));
  };
  this.later(tick, blinkRng.between(M.intervalMs[0], M.intervalMs[1]));
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
  const Pf = A.performances;
  if (Pf && Pf.enabled !== false) {                                    // K9.4 performances: declared budgets must be well-formed
    const range = (o, k, path) => { if (!Array.isArray(o[k]) || o[k].length !== 2 || !(o[k][0] > 0 && o[k][0] <= o[k][1])) problems.push(`${path}.${k} must be [min,max] > 0`); };
    const num = (o, k, path) => { if (!(typeof o[k] === 'number' && o[k] > 0)) problems.push(`${path}.${k} must be a number > 0`); };
    const tiers = (o, path, check) => { if (!o.tiers) return problems.push(`${path}.tiers missing`); for (const t of ['small', 'medium', 'large']) { if (!o.tiers[t]) problems.push(`${path}.tiers.${t} missing`); else check(o.tiers[t], `${path}.tiers.${t}`); } };
    const vfxNames = (o, path) => { if (o.vfx !== undefined) { if (!Array.isArray(o.vfx)) problems.push(`${path}.vfx must be a list`); else for (const v of o.vfx) if (!(spec.vfx && spec.vfx[v])) problems.push(`${path}.vfx '${v}' not in the vfx catalogue`); } };
    if (Pf.triumph) { const T = Pf.triumph, p = 'acting.performances.triumph'; num(T, 'jumpPx', p); range(T, 'anticipateMs', p); num(T, 'airMs', p); num(T, 'settleWithinMs', p); num(T, 'rollMs', p);
      tiers(T, p, (t, tp) => { num(t, 'apexScale', tp); vfxNames(t, tp); }); }
    const oopsTake = Pf.oops || Pf.oops_take_k94;   // K9.6-5: the K9.4 take is kept as a record (oops_take_k94) and still validated by its own rules
    if (oopsTake) { const O = oopsTake, p = Pf.oops ? 'acting.performances.oops' : 'acting.performances.oops_take_k94'; range(O, 'anticipateMs', p); range(O, 'stretchScaleY', p); range(O, 'holdMs', p); num(O, 'totalMaxMs', p); num(O, 'jiggleMs', p);
      if (!(O.jiggleDecay > 0 && O.jiggleDecay < 1)) problems.push(`${p}.jiggleDecay must be in (0,1)`);
      if (O.stretchScaleY && !(O.stretchScaleY[0] > 1)) problems.push(`${p}.stretchScaleY must stretch (> 1)`);
      tiers(O, p, (t, tp) => { if (!(Number.isInteger(t.jiggle) && t.jiggle >= 0)) problems.push(`${tp}.jiggle must be an integer >= 0`); }); }
    // K9.6-2 choreo schema (owner decision a3e73842 'carry the winner'): a performance may carry `choreo` = the v1 rig
    // choreography as data. Rules: joints must exist in the rig (JOINTS), easing must be an EASE name or 'linear',
    // ms > 0, iterations integer >= 1, composite add|replace, fill forwards requires keep true, atMs/delayMs >= 0,
    // channel end <= totalMs, events sorted by atMs with one action each, mouth shapes known, totalMs <= 4000.
    const JOINTS = ['root', 'body', 'head', 'armL', 'armR', 'legL', 'legR', 'pupilL', 'pupilR', 'lidL', 'lidR', 'browL', 'browR', 'eyeL', 'eyeR', 'mouth', 'shadow'];
    const MOUTHS = ['closed', 'mid', 'open', 'smile', 'sad'];
    const EASINGS = ['soft', 'inOut', 'pop', 'land', 'sine', 'linear'];   // = Object.keys(EASE) + 'linear'; listed here so validateActing stays self-contained (tests lift it as text)
    const choreo = (C, p) => {
      if (!C || typeof C !== 'object') return problems.push(`${p} must be an object`);
      if (!(typeof C.totalMs === 'number' && C.totalMs > 0 && C.totalMs <= 4000)) problems.push(`${p}.totalMs must be in (0, 4000]`);
      if (!Array.isArray(C.channels) || !C.channels.length) problems.push(`${p}.channels must be a non-empty list`);
      else C.channels.forEach((c, i) => { const cp = `${p}.channels[${c.id || i}]`;
        if (!Array.isArray(c.joints) || !c.joints.length || c.joints.some((jn) => !JOINTS.includes(jn))) problems.push(`${cp}.joints must name rig joints (${JOINTS.join('|')})`);
        if (!Array.isArray(c.keyframes) || c.keyframes.length < 2 || c.keyframes.some((k) => typeof k.transform !== 'string' || (k.offset !== undefined && !(k.offset >= 0 && k.offset <= 1)))) problems.push(`${cp}.keyframes must be >= 2 frames of {transform, offset?}`);
        if (!(typeof c.ms === 'number' && c.ms > 0)) problems.push(`${cp}.ms must be > 0`);
        if (!EASINGS.includes(c.easing)) problems.push(`${cp}.easing must be one of ${EASINGS.join('|')}`);
        if (c.iterations !== undefined && !(Number.isInteger(c.iterations) && c.iterations >= 1)) problems.push(`${cp}.iterations must be an integer >= 1`);
        if (c.composite !== undefined && !['add', 'replace'].includes(c.composite)) problems.push(`${cp}.composite must be add | replace`);
        if (c.fill === 'forwards' && c.keep !== true) problems.push(`${cp}: fill forwards requires keep true (a held layer must be releasable)`);
        for (const k of ['atMs', 'delayMs']) if (c[k] !== undefined && !(typeof c[k] === 'number' && c[k] >= 0)) problems.push(`${cp}.${k} must be >= 0`);
        const end = (c.atMs || 0) + (c.delayMs || 0) + c.ms * (c.iterations || 1);
        if (C.totalMs && end > C.totalMs + 0.5) problems.push(`${cp} ends at ${end} ms > totalMs ${C.totalMs}`); });
      if (!Array.isArray(C.events)) problems.push(`${p}.events must be a list`);
      else { let last = -1; C.events.forEach((e, i) => { const ep = `${p}.events[${i}]`;
        if (!(typeof e.atMs === 'number' && e.atMs >= 0 && e.atMs <= (C.totalMs || Infinity))) problems.push(`${ep}.atMs must be in [0, totalMs]`);
        if (e.atMs < last) problems.push(`${ep} out of order (events must be sorted by atMs)`); last = e.atMs;
        const acts = ['mouth', 'blink', 'release', 'cue'].filter((k) => e[k] !== undefined);
        if (acts.length !== 1) problems.push(`${ep} must carry exactly one action (mouth | blink | release | cue)`);
        if (e.mouth !== undefined && !MOUTHS.includes(e.mouth)) problems.push(`${ep}.mouth must be ${MOUTHS.join('|')}`);
        if (e.blink !== undefined && typeof e.blink !== 'boolean') problems.push(`${ep}.blink must be a boolean (double)`);
        if (e.release !== undefined && (!Array.isArray(e.release) || e.release.some((jn) => !JOINTS.includes(jn)))) problems.push(`${ep}.release must list rig joints`);
        if (e.cue !== undefined && typeof e.cue !== 'string') problems.push(`${ep}.cue must be a string`); });
        const closes = C.events.filter((e) => e.mouth === 'closed' && e.atMs === C.totalMs).length;
        if (closes !== 1) problems.push(`${p}.events must end with exactly one {atMs: totalMs, mouth: 'closed'} (clean end state)`); }
      if (C.reduced) { const R = C.reduced, rp = `${p}.reduced`; if (!MOUTHS.includes(R.mouth)) problems.push(`${rp}.mouth must be ${MOUTHS.join('|')}`); if (R.blinkDouble !== undefined && typeof R.blinkDouble !== 'boolean') problems.push(`${rp}.blinkDouble must be a boolean`); if (!(typeof R.closeAtMs === 'number' && R.closeAtMs > 0 && R.closeAtMs <= C.totalMs)) problems.push(`${rp}.closeAtMs must be in (0, totalMs]`);
        if (R.events !== undefined) { if (!Array.isArray(R.events)) problems.push(`${rp}.events must be a list`); else R.events.forEach((e, i) => { const ep = `${rp}.events[${i}]`;
          if (!(typeof e.atMs === 'number' && e.atMs >= 0 && e.atMs <= R.closeAtMs)) problems.push(`${ep}.atMs must be in [0, closeAtMs]`);
          const acts = ['mouth', 'blink'].filter((k) => e[k] !== undefined); if (acts.length !== 1) problems.push(`${ep} must carry exactly one of mouth | blink (face only under reduced motion)`);
          if (e.mouth !== undefined && !MOUTHS.includes(e.mouth)) problems.push(`${ep}.mouth must be ${MOUTHS.join('|')}`);
          if (e.blink !== undefined && typeof e.blink !== 'boolean') problems.push(`${ep}.blink must be a boolean (double)`); }); } }
    };
    for (const name of Object.keys(Pf)) if (Pf[name] && Pf[name].choreo && name !== 'think') choreo(Pf[name].choreo, `acting.performances.${name}.choreo`);   // any performance may carry choreo (K9.6-5 sad)
    if (Pf.think && Pf.think.choreo) { choreo(Pf.think.choreo, 'acting.performances.think.choreo'); tiers(Pf.think, 'acting.performances.think', (t, tp) => vfxNames(t, tp)); }
    else if (Pf.think) { const K = Pf.think, p = 'acting.performances.think'; num(K, 'liftMs', p); num(K, 'headFollowMs', p); range(K, 'holdMs', p); num(K, 'driftPx', p); num(K, 'driftMs', p); num(K, 'blinkAtMs', p); num(K, 'settleMs', p); num(K, 'totalMaxMs', p);   // K9.5-2
      if (!Array.isArray(K.gazePx) || K.gazePx.length !== 2 || !(Math.hypot(K.gazePx[0], K.gazePx[1]) + (K.driftPx || 0) <= 6)) problems.push(`${p}.gazePx must be [dx,dy] with |gaze| + driftPx <= 6 px (K9.5 budget: pupil max offset)`);
      if (!(K.driftPx <= 2)) problems.push(`${p}.driftPx must be <= 2 (a hold, not a saccade)`);
      if (Array.isArray(K.holdMs) && K.liftMs && K.settleMs && K.totalMaxMs && K.liftMs + K.holdMs[1] + K.settleMs > K.totalMaxMs + 500) problems.push(`${p}: liftMs + holdMs[1] + settleMs exceeds totalMaxMs by more than 500 ms`);
      tiers(K, p, (t, tp) => { num(t, 'headDeg', tp); if (!(t.headDeg <= 9)) problems.push(`${tp}.headDeg must be <= 9 (K9.5 budget: calm think)`); if (typeof t.wing !== 'boolean') problems.push(`${tp}.wing must be a boolean`); vfxNames(t, tp); }); }
    if (Pf.puzzled) { const Z = Pf.puzzled, p = 'acting.performances.puzzled'; range(Z, 'spiralRadiusPx', p); num(Z, 'spiralMs', p); num(Z, 'spiralTurns', p); range(Z, 'holdMs', p); num(Z, 'recentreMs', p); num(Z, 'totalMaxMs', p);
      tiers(Z, p, (t, tp) => { num(t, 'headDeg', tp); vfxNames(t, tp); }); }
    if (Pf.movingHold && Pf.movingHold.enabled !== false) { const M = Pf.movingHold, p = 'acting.performances.movingHold'; range(M, 'intervalMs', p); num(M, 'maxMs', p); num(M, 'maxPx', p); num(M, 'maxDeg', p); num(M, 'minGapSameJointMs', p);
      if (!M.impulses || Object.keys(M.impulses).length < 3) problems.push(`${p}.impulses needs >= 3 named impulses (distributed life)`);
      else for (const [name, im] of Object.entries(M.impulses)) { const ip = `${p}.impulses.${name}`;
        if (!Array.isArray(im.joints) || !im.joints.length) problems.push(`${ip}.joints must be a non-empty list`);
        if (!(im.ms > 0 && im.ms <= M.maxMs)) problems.push(`${ip}.ms must be in (0, maxMs ${M.maxMs}]`);
        if (im.px !== undefined && !(im.px > 0 && im.px <= M.maxPx)) problems.push(`${ip}.px must be in (0, maxPx ${M.maxPx}]`);
        if (im.deg !== undefined && !(im.deg > 0 && im.deg <= M.maxDeg)) problems.push(`${ip}.deg must be in (0, maxDeg ${M.maxDeg}]`); } }
  }
  return problems;
}
