/*
 * sandbox/engine/motion.js - ADR-001 K3: cinematic v2 engine.
 *
 * Same SVG skeleton contract as rig.js (data-joint / data-pivot / data-mouth).
 * Every number that used to live inside a method now comes from the Character
 * Spec (owl.motion.json). rig.js (v1) stays untouched for side-by-side
 * comparison and rollback (?engine=v1).
 *
 * Layers stacked on each joint (all WAAPI, composite:'add', transform only):
 *   base pose  <- authored clips (breathe, jump ...)
 *   hierarchy  <- overlapping action: children replay the parent's motion later
 *   secondary  <- physics.js springs driven by the character's own velocity
 *   squash     <- volume-preserving spring on landing / takeoff
 *   gaze/head  <- audio envelope (secondary action while talking)
 */
import { SvgRig, EASE, REDUCED, loadSvg } from '../rig.js?v=g4';
import { SecondaryRig, SquashSpring, bezier, randIn, clock } from './physics.js';

const KF2 = (t) => [{ transform: t }, { transform: t }];

export class CinematicRig extends SvgRig {
  /** @param {SVGSVGElement} svg @param {object} spec */
  constructor(svg, spec) {
    super(svg);
    this.spec = spec;
    this._perch = { x: 0, y: 0 };
    this.trace = null;   // optional path-trace sink (G4 proof): fn(points[])
    this.stats = { flights: 0, physicsWrites: 0, physicsSkipped: 0 };
    this.onCue = null;   // K8: fn(phase, ctx) - set by the state/Foley layer; engine stays audio-agnostic
    this._lastDeg = {}; this._lastSquash = null;

    // one persistent, paused, additive animation per secondary group; physics
    // writes rotate() into it via setKeyframes (compositor-only, no layout)
    this.secLayers = {};
    for (const n in spec.secondary) {
      if (!spec.secondary[n] || typeof spec.secondary[n] !== 'object') continue; // skip comment strings
      const el = this.j(n); if (!el) continue;
      const a = el.animate(KF2('rotate(0deg)'), { duration: 1000, fill: 'both', composite: 'add' });
      a.pause(); this.live.add(a); this.secLayers[n] = a;
    }
    this.secondary = new SecondaryRig(spec.secondary, (n, deg) => this._writeSecondary(n, deg));

    this.squashLayer = this.j('body').animate(KF2('scale(1,1)'), { duration: 1000, fill: 'both', composite: 'add' });
    this.squashLayer.pause(); this.live.add(this.squashLayer);
    this.squash = new SquashSpring(spec.squash.landing);
  }

  // Write coalescing: skip sub-visual deltas (0.05 deg / 0.002 scale) so settling springs
  // stop touching the compositor long before they are numerically at rest (G9 jank budget).
  _writeSecondary(name, deg) {
    const a = this.secLayers[name]; if (!a) return;
    const prev = this._lastDeg[name];
    if (prev !== undefined && Math.abs(prev - deg) < 0.05 && deg !== 0) { this.stats.physicsSkipped++; return; }
    this._lastDeg[name] = deg;
    a.effect.setKeyframes(KF2(`rotate(${deg.toFixed(2)}deg)`));
    this.stats.physicsWrites++;
  }
  _writeSquash(sx, sy) {
    const p = this._lastSquash;
    if (p && Math.abs(p.sy - sy) < 0.002 && sy !== 1) { this.stats.physicsSkipped++; return; }
    this._lastSquash = { sx, sy };
    this.squashLayer.effect.setKeyframes(KF2(`scale(${sx.toFixed(3)},${sy.toFixed(3)})`));
    this.stats.physicsWrites++;
  }
  later(fn, ms) { return super.later(fn, ms / clock.rate); }   // timers follow the engine clock (slow-mo proofs)
  _sleep(ms) { return new Promise((r) => this.later(r, ms)); }
  /** Emit a motion phase cue with the visual onset timestamp (performance.now()). */
  cue(phase, ctx = {}) { if (this.onCue) { try { this.onCue(phase, { tVisual: performance.now(), ...ctx }); } catch (e) { /* Foley must never break motion */ } } }
  blink(double = false) { super.blink(double); this.cue('blink'); }

  // ---- idle from spec ranges (never identical twice) -------------------------
  idle() {
    const T = this.spec.timing, H = this.spec.hierarchy;
    const breath = randIn(T.breath);
    this.anim(this.j('body'), [{ transform: 'scale(1,1)' }, { transform: 'scale(1.015,0.975)' }],
      { duration: breath, iterations: Infinity, direction: 'alternate', easing: EASE.sine }, true);
    this.anim(this.j('head'), [{ transform: 'translateY(0) rotate(-1deg)' }, { transform: `translateY(${(2.5 * H.head.gain).toFixed(2)}px) rotate(1deg)` }],
      { duration: breath, iterations: Infinity, direction: 'alternate', easing: EASE.sine, delay: H.head.delayMs }, true);
    this.anim(this.j('armL'), [{ transform: 'rotate(0)' }, { transform: 'rotate(3deg)' }],
      { duration: breath, iterations: Infinity, direction: 'alternate', easing: EASE.sine, delay: H.body.delayMs }, true);
    this.anim(this.j('armR'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-3deg)' }],
      { duration: breath, iterations: Infinity, direction: 'alternate', easing: EASE.sine, delay: H.body.delayMs }, true);
    this.scheduleBlink(); this.scheduleLook();
    return this;
  }
  scheduleBlink() {
    const T = this.spec.timing;
    this.later(() => { if (this.disposed) return; this.blink(Math.random() < T.doubleBlinkChance); this.scheduleBlink(); }, randIn(T.blinkGap));
  }
  scheduleLook() {
    const T = this.spec.timing;
    this.later(() => {
      if (this.disposed) return;
      if (!this.busy) { this.look(); this.later(() => this.lookCenter(), randIn(T.lookHold)); }
      this.scheduleLook();
    }, randIn(T.lookGap));
  }

  // ---- talk: secondary action driven by the envelope (G6) --------------------
  talk(envelope, durationMs) {
    const G = this.spec.gaze, M = this.spec.mouth.levels;
    const start = clock.now();
    let last = 'closed', prevE = 0, quietMs = 0, lastT = start, tilt = 0, tiltV = 0;
    const headLayer = this.j('head').animate(KF2('rotate(0)'), { duration: 1000, fill: 'both', composite: 'add' });
    headLayer.pause(); this.live.add(headLayer);
    const step = () => {
      if (this.disposed) return;
      const now = clock.now();
      const t = now - start, dt = Math.min(50, now - lastT) / 1000; lastT = now;
      if (t >= durationMs) {
        this.setMouth('closed'); headLayer.cancel(); this.live.delete(headLayer); this._talkRaf = 0;
        this.release(/pupil/);
        if (Math.random() < G.phraseEndNodChance) this.nod();
        return;
      }
      const e = envelope(t / durationMs, t);
      let shape = last;
      if (e > M.open) shape = 'open'; else if (e > M.mid) shape = 'mid'; else if (e < M.closed) shape = 'closed';
      if (shape !== last) { this.setMouth(shape); last = shape; }
      // head follows loudness through a spring (no flicker), side chosen at each onset
      const target = e * G.envelopeToHeadTilt * (this._tiltSign || 1);
      const acc = 140 * (target - tilt) - 18 * tiltV; tiltV += acc * dt; tilt += tiltV * dt;
      headLayer.effect.setKeyframes(KF2(`rotate(${tilt.toFixed(2)}deg) translateY(${(e * G.envelopeToHeadLift).toFixed(2)}px)`));
      if (e > G.onsetThreshold && prevE <= G.onsetThreshold && quietMs > 180) {
        const dx = randIn(G.onsetGazeShift) * (Math.random() < 0.5 ? -1 : 1);
        ['pupilL', 'pupilR'].forEach((p) => this.anim(this.j(p), [{ transform: `translate(${dx.toFixed(1)}px,-1px)` }], { duration: 380, easing: EASE.soft, fill: 'forwards' }, true));
        this._tiltSign = Math.sign(dx) || 1;
        if (Math.random() < G.onsetBlinkChance) this.blink(false);
      }
      quietMs = e < M.closed ? quietMs + dt * 1000 : 0;
      prevE = e;
      this._talkRaf = requestAnimationFrame(step);
    };
    this._talkRaf = requestAnimationFrame(step);
  }

  // ---- landing squash runner (G2): volume-preserving spring to rest ----------
  _runSquash() {
    return new Promise((res) => {
      let last = clock.now();
      const tick = () => {
        const now = clock.now();
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        const { sx, sy } = this.squash.step(dt);
        this._writeSquash(sx, sy);
        if (this.squash.atRest || this.disposed) { this._writeSquash(1, 1); res(); } else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  dispose() { this.secondary.dispose(); cancelAnimationFrame(this._driveRaf || 0); super.dispose(); }
}

/** CSS cubic-bezier(x1,y1,x2,y2) as a JS function (for analytic path velocity). */
export function cssEase(str) {
  const m = /cubic-bezier\(([^)]+)\)/.exec(str || '');
  if (!m) return (u) => u;
  const [x1, y1, x2, y2] = m[1].split(',').map(Number);
  const bx = (t) => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
  const by = (t) => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
  return (u) => { let lo = 0, hi = 1; for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if (bx(mid) < u) lo = mid; else hi = mid; } return by((lo + hi) / 2); };
}

/** Mount with a spec: loads the SVG named in the spec, unique ids per instance. */
export async function mountCinematic(host, spec, instanceId) {
  const svg = await loadSvg(spec.art);
  let el = svg;
  if (instanceId) {
    const ids = [...svg.querySelectorAll('[id]')].map((n) => n.id);
    let html = svg.outerHTML;
    for (const id of ids) html = html.split(`#${id}`).join(`#${id}-${instanceId}`).split(`id="${id}"`).join(`id="${id}-${instanceId}"`);
    el = document.importNode(new DOMParser().parseFromString(html, 'image/svg+xml').documentElement, true);
  }
  host.appendChild(el);
  return new CinematicRig(host.lastElementChild, spec).idle();
}

export { bezier, randIn, clock };
