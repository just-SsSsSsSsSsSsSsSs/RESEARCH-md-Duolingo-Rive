/**
 * foley.js - the director between motion cues and the Sound/VFX layers (K8.4).
 *
 * Reads spec.states.list[state].sfx / .vfx (data) and dispatches:
 *   rig.cue('enter', {state})    -> sfx.enter / vfx.enter
 *   rig.cue('land', ...)         -> sfx.land / vfx.land of the CURRENT state, etc.
 *   rig.cue('beat' | 'loop')     -> sfx.beat / sfx.enter+vfx.enter loops (think ticks, rest Zzz)
 *   rig.cue('blink')             -> idle sfx.blink / vfx.blink (only while idle or rest)
 * Speech ducking: talk state (sfx.duck) ducks the bus on enter and releases on exit.
 * Nothing here touches the rig's motion - remove this file and the owl still moves.
 */
import { SoundBus } from './sound.js';
import { VfxLayer } from './vfx.js';

export class Foley {
  /**
   * @param {object} spec Character Spec (needs sound, vfx, states)
   * @param {HTMLElement} stage container for the shared VFX layer
   * @param {SoundBus} [bus] shared bus (one per page - many owls, one AudioContext)
   */
  constructor(spec, stage, bus) {
    this.spec = spec;
    this.bus = bus || new SoundBus(spec.sound);
    this.vfx = new VfxLayer(stage, spec.vfx);
    this.rigs = new Map();     // rig -> { states }
    this.trace = [];           // { t, rig, phase, state, sfx, vfx }
  }

  /** Attach a rig + its CharacterStates. */
  attach(rig, states) {
    this.rigs.set(rig, { states });
    rig.onCue = (phase, ctx) => this._onCue(rig, states, phase, ctx);
    states.on((ev) => { if (ev.type === 'enter' && ev.from === 'talk' && this.bus) this.bus.duck(false); });
  }
  detach(rig) { rig.onCue = null; this.rigs.delete(rig); }

  _onCue(rig, states, phase, ctx) {
    // 'after' and 'settle' belong to the motion that just ended, even if the machine already moved on
    const prevSt = states.history.length ? [...states.history].reverse().find((h) => h.type === 'enter' && h.to !== states.state) : null;
    const stName = ctx.state || ((phase === 'after' || phase === 'settle') && prevSt ? prevSt.to : states.state);
    const st = this.spec.states.list[stName] || {};
    const sfx = st.sfx || {}, vfx = st.vfx || {};
    let cue = null, fx = null;
    switch (phase) {
      case 'enter': cue = sfx.enter; fx = vfx.enter; if (sfx.duck) this.bus.duck(true); break;
      case 'beat': cue = sfx.beat; break;
      case 'loop': cue = sfx.enter; fx = vfx.enter; break;
      case 'wake': cue = 'gulp'; break;
      case 'blink': if (stName === 'idle' || stName === 'rest') { cue = sfx.blink; fx = vfx.blink; } break;
      case 'jump': cue = 'boing'; break;
      default: cue = sfx[phase]; fx = vfx[phase];
    }
    let tAudio = null;
    if (cue) tAudio = this.bus.play(cue, { tVisual: ctx.tVisual, vy: ctx.vy });
    if (fx) this.vfx.spawn(fx, rig, { dir: ctx.dir });
    this.trace.push({ t: +ctx.tVisual.toFixed(1), rig: rig.svg.id || 'owl', phase, state: stName, sfx: cue || null, vfx: fx || null, scheduled: tAudio !== null });
    if (this.trace.length > 600) this.trace.shift();
  }

  dispose() { this.rigs.forEach((_, rig) => (rig.onCue = null)); this.rigs.clear(); this.vfx.dispose(); }
}
