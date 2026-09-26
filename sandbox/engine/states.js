/**
 * states.js - data-driven layered state machine for the owl (K4, ADR-001).
 *
 * The spec (owl.motion.json -> `states`) is the single source of truth:
 *   layers  : concurrent tracks (body / mouth / gaze)
 *   list    : state -> clip name per layer (+ optional `next` auto-transition)
 *   events  : app event -> state ("@variety" picks from the pool, no repeat)
 *   blendMs : minimum dwell before the auto `next` may fire
 *
 * Clips are the ONLY place that touches the rig. Adding a character means
 * shipping a new spec (data) - not new code - as long as its clip names exist
 * in CLIPS (G10 test: validateSpec on a fake spec).
 */
import { REDUCED } from '../rig.js?v=g4';

const noop = () => null;

const CLIPS = {
  body: {
    breathe: noop,                          // idle loop already runs in rig.idle()
    wave: (rig) => rig.nod(),
    bob: noop,                              // talk() drives the head spring itself
    ponder: (rig) => rig.think(),
    jumpJoy: (rig) => rig.celebrate(),
    recoil: (rig) => rig.sad(),
    flight: (rig, ctx) => {
      const trace = !!(ctx && ctx.trace);
      if (ctx && ctx.target) return rig.flyTo(ctx.target, { trace, home: !!ctx.home });
      return rig.roam((ctx && ctx.room) || { left: 200, right: 200, up: 220 }, { trace });
    },
  },
  mouth: {
    closed: (rig) => rig.setMouth('closed'),
    smile: (rig) => rig.setMouth('smile'),
    mid: (rig) => rig.setMouth('mid'),
    smileOpen: (rig) => rig.setMouth('open'),
    oops: noop,                             // sad() owns the mouth during recoil
    envelope: (rig, ctx) => {
      if (ctx && ctx.url) return rig.say(ctx.url);
      const env = rig.constructor.syntheticEnvelope();
      return rig.talk(env, (ctx && ctx.ms) || 3000);
    },
  },
  gaze: {
    wander: noop,                           // scheduleLook() covers idle wander
    toUser: (rig) => rig.lookCenter(),
    conversational: noop,                   // talk() shifts gaze on onsets
    rollUp: noop,                           // think() acts the gaze itself
    dizzy: noop,                            // sad() acts the gaze itself
    ahead: noop,                            // flight faces travel direction
  },
};

export class CharacterStates {
  constructor(rig, spec) {
    if (!spec || !spec.states) throw new Error('states: spec.states missing');
    this.rig = rig;
    this.spec = spec.states;
    this.state = this.spec.initial || 'idle';
    this.lastVariety = null;
    this.listeners = new Set();
    this.history = [];
    this._seq = 0;
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit(ev) { this.history.push(ev); if (this.history.length > 50) this.history.shift(); this.listeners.forEach((f) => { try { f(ev); } catch (e) { /* listener error must not break the machine */ } }); }

  /** Map an app event to a state. Unknown events are ignored (and reported). */
  fire(event, ctx) {
    let target = this.spec.events[event];
    if (!target) { this._emit({ type: 'ignored', event }); return Promise.resolve(false); }
    if (target === '@variety') target = this._pickVariety();
    return this.enter(target, ctx);
  }

  _pickVariety() {
    const V = this.spec.variety || { pool: Object.keys(this.spec.list) };
    let pool = V.pool.slice();
    if (V.noRepeat && pool.length > 1) pool = pool.filter((s) => s !== this.lastVariety);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this.lastVariety = pick;
    return pick;
  }

  /** Enter a state: run every layer clip, wait until the rig is free, then chain `next`. */
  async enter(name, ctx) {
    const st = this.spec.list[name];
    if (!st) { this._emit({ type: 'unknown', state: name }); return false; }
    if (this.rig.busy && name !== 'idle') { this._emit({ type: 'rejected', state: name, reason: 'busy' }); return false; }
    const seq = ++this._seq;
    const from = this.state;
    this.state = name;
    this._emit({ type: 'enter', from, to: name, t: performance.now() });

    const runs = [];
    for (const layer of this.spec.layers) {
      const clipName = st[layer];
      const clip = clipName && CLIPS[layer] && CLIPS[layer][clipName];
      if (!clip) continue;
      try { const r = clip(this.rig, ctx); if (r && typeof r.then === 'function') runs.push(r); }
      catch (e) { this._emit({ type: 'clipError', layer, clip: clipName, error: String(e) }); }
    }
    await Promise.all(runs);
    await this._untilFree(this.spec.blendMs || 0);
    if (seq !== this._seq) return true;         // a newer transition superseded us
    if (st.next) return this.enter(st.next, ctx && ctx.carry ? ctx : undefined);
    this._emit({ type: 'settled', state: name, t: performance.now() });
    return true;
  }

  _untilFree(minMs) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => {
        if (!this.rig.busy && performance.now() - t0 >= minMs) return resolve();
        setTimeout(tick, 60);
      };
      tick();
    });
  }

  dispose() { this.listeners.clear(); this._seq++; }
}

/**
 * G10 gate helper: is this spec self-consistent and runnable by the engine?
 * Pure function - no DOM, no rig; usable from node and the browser.
 */
export function validateSpec(spec) {
  const problems = [];
  const need = ['hierarchy', 'secondary', 'squash', 'timing', 'flight', 'gaze', 'mouth', 'states'];
  for (const k of need) if (!spec || !spec[k]) problems.push(`missing top-level key: ${k}`);
  const S = spec && spec.states;
  if (S) {
    const layers = S.layers || [];
    for (const l of layers) if (!CLIPS[l]) problems.push(`unknown layer: ${l}`);
    if (!S.list || !S.list[S.initial]) problems.push(`initial state not in list: ${S.initial}`);
    for (const [name, st] of Object.entries(S.list || {})) {
      for (const l of layers) {
        const c = st[l];
        if (c && CLIPS[l] && !CLIPS[l][c]) problems.push(`state ${name}: no clip "${c}" on layer ${l}`);
      }
      if (st.next && !S.list[st.next]) problems.push(`state ${name}: next -> undefined state ${st.next}`);
    }
    for (const [ev, target] of Object.entries(S.events || {})) {
      if (target !== '@variety' && !S.list[target]) problems.push(`event ${ev} -> undefined state ${target}`);
    }
    if (S.variety) for (const p of S.variety.pool || []) if (!S.list[p]) problems.push(`variety pool has undefined state ${p}`);
  }
  if (spec && spec.secondary) {
    for (const [g, s] of Object.entries(spec.secondary)) {
      if (!s || typeof s !== 'object') continue;               // documentation strings are allowed
      if (!(s.k > 0) || !(s.c >= 0)) problems.push(`secondary ${g}: k must be > 0 and c >= 0`);
    }
  }
  if (spec && spec.squash && spec.squash.landing && !(spec.squash.landing.scaleY > 0 && spec.squash.landing.scaleY < 1)) problems.push('squash.landing.scaleY must be in (0,1)');
  return { ok: problems.length === 0, problems, reduced: REDUCED };
}

export { CLIPS };
