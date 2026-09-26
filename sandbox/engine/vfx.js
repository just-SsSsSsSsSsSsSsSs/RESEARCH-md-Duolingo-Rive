/**
 * vfx.js - cartoon micro-VFX for the owl (K8.3).
 *
 * One shared <svg> layer per stage (pointer-events: none). Every effect is a few
 * pooled SVG nodes animated with WAAPI on transform/opacity only (compositor),
 * returned to the pool on finish. Parameters come from spec.vfx (data).
 * prefers-reduced-motion: effects are skipped (sound stays, per K8 directive).
 * Slow-motion: durations follow the engine clock rate.
 */
import { clock } from './physics.js';
import { REDUCED } from '../rig.js?v=g4';

const NS = 'http://www.w3.org/2000/svg';
const randIn = ([a, b]) => a + Math.random() * (b - a);

export class VfxLayer {
  /** @param {HTMLElement} stage positioned container @param {object} catalogue spec.vfx */
  constructor(stage, catalogue) {
    this.stage = stage; this.spec = catalogue;
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('aria-hidden', 'true');
    this.svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:8';
    stage.appendChild(this.svg);
    this.pool = { circle: [], line: [], text: [] };
    this.live = new Set();
    this.stats = { spawned: 0, pooled: 0, skippedReduced: 0 };
  }

  _take(kind) {
    let el = this.pool[kind].pop();
    if (!el) { el = document.createElementNS(NS, kind); el.style.willChange = 'transform, opacity'; }
    this.svg.appendChild(el); return el;
  }
  _give(kind, el) { el.getAnimations().forEach((a) => a.cancel()); el.remove(); this.pool[kind].push(el); this.stats.pooled++; }

  /** Stage-relative anchor for a rig: horizontal centre, feet line, head line. */
  anchor(rig) {
    const sr = this.stage.getBoundingClientRect(), r = rig.svg.getBoundingClientRect();
    return { x: r.left - sr.left + r.width / 2, feetY: r.top - sr.top + r.height * 0.93, headY: r.top - sr.top + r.height * 0.12, w: r.width, h: r.height };
  }

  _anim(el, kind, kf, ms, easing = 'cubic-bezier(.2,.7,.3,1)', delay = 0) {
    const a = el.animate(kf, { duration: ms / clock.rate, delay: delay / clock.rate, easing, fill: 'forwards' });
    this.live.add(a);
    a.onfinish = () => { this.live.delete(a); this._give(kind, el); };
    return a;
  }

  /** Dispatch by catalogue name. Returns true if something was drawn. */
  spawn(name, rig, ctx = {}) {
    const p = this.spec[name];
    if (!p || typeof p !== 'object') return false;
    if (REDUCED) { this.stats.skippedReduced++; return false; }
    const fn = this['_' + name];
    if (!fn) return false;
    fn.call(this, p, this.anchor(rig), ctx); this.stats.spawned++;
    return true;
  }

  _dust(p, A) {
    for (let i = 0; i < p.count; i++) {
      const c = this._take('circle');
      const r = randIn(p.radius), dir = i % 2 ? 1 : -1, dx = dir * randIn([p.spread * 0.3, p.spread]), dy = -randIn([p.rise * 0.3, p.rise]);
      c.setAttribute('r', r); c.setAttribute('cx', A.x); c.setAttribute('cy', A.feetY); c.setAttribute('fill', p.color);
      this._anim(c, 'circle', [{ transform: 'translate(0,0) scale(.4)', opacity: .85 }, { transform: `translate(${dx * 0.7}px, ${dy}px) scale(1)`, opacity: .55, offset: .45 }, { transform: `translate(${dx}px, ${dy * 0.6}px) scale(1.25)`, opacity: 0 }], p.ms);
    }
  }

  _speedLines(p, A, ctx) {
    const dir = ctx.dir || 1;   // 1 = moving right, -1 = left
    for (let i = 0; i < p.count; i++) {
      const l = this._take('line');
      const len = randIn(p.length), y = A.feetY - A.h * (0.25 + 0.5 * i / p.count), x = A.x - dir * A.w * 0.55;
      l.setAttribute('x1', x); l.setAttribute('x2', x - dir * len); l.setAttribute('y1', y); l.setAttribute('y2', y);
      l.setAttribute('stroke', p.color); l.setAttribute('stroke-width', 2); l.setAttribute('stroke-linecap', 'round');
      this._anim(l, 'line', [{ transform: 'translateX(0)', opacity: 0 }, { opacity: p.opacity, offset: .25 }, { transform: `translateX(${-dir * len * 1.4}px)`, opacity: 0 }], p.ms, 'ease-out');
    }
  }

  _stars(p, A) {
    for (let i = 0; i < p.count; i++) {
      const c = this._take('circle');
      const ang = (i / p.count) * Math.PI * 2 + Math.random() * 0.5, dist = randIn([p.spread * 0.5, p.spread]);
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * 0.6 - p.rise;
      c.setAttribute('r', randIn(p.radius)); c.setAttribute('cx', A.x); c.setAttribute('cy', A.headY + A.h * 0.3); c.setAttribute('fill', p.colors[i % p.colors.length]);
      this._anim(c, 'circle', [{ transform: 'translate(0,0) scale(0)', opacity: 1 }, { transform: `translate(${dx * 0.8}px, ${dy * 0.8}px) scale(1.2)`, opacity: 1, offset: .35 }, { transform: `translate(${dx}px, ${dy + 24}px) scale(.6)`, opacity: 0 }], p.ms, 'cubic-bezier(.15,.8,.3,1)');
    }
  }

  _question(p, A) {
    const t = this._take('text');
    t.textContent = '?'; t.setAttribute('x', A.x + A.w * 0.32); t.setAttribute('y', A.headY - 6);
    t.setAttribute('fill', p.color); t.setAttribute('font-size', Math.max(22, A.w * 0.22)); t.setAttribute('font-weight', '800'); t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-family', 'system-ui, sans-serif');
    this._anim(t, 'text', [{ transform: 'translateY(8px) scale(.6) rotate(-12deg)', opacity: 0 }, { transform: 'translateY(0) scale(1) rotate(6deg)', opacity: 1, offset: .15 }, { transform: `translateY(${-p.bob}px) rotate(-6deg)`, opacity: 1, offset: .5 }, { transform: 'translateY(0) rotate(4deg)', opacity: 1, offset: .85 }, { transform: 'translateY(-10px) scale(.8)', opacity: 0 }], p.ms, 'ease-in-out');
  }

  _zzz(p, A) {
    for (let i = 0; i < p.count; i++) {
      const t = this._take('text');
      t.textContent = 'z'; t.setAttribute('x', A.x + A.w * 0.3); t.setAttribute('y', A.headY);
      t.setAttribute('fill', p.color); t.setAttribute('font-size', 14 + i * 5); t.setAttribute('font-weight', '700'); t.setAttribute('font-family', 'system-ui, sans-serif');
      this._anim(t, 'text', [{ transform: 'translate(0,0)', opacity: 0 }, { opacity: .9, offset: .2 }, { transform: `translate(${p.drift}px, ${-p.rise}px)`, opacity: 0 }], p.ms, 'ease-out', i * (p.ms / p.count) * 0.6);
    }
  }

  _glint(p, A) {
    const c = this._take('circle');
    c.setAttribute('r', 2.2); c.setAttribute('cx', A.x - A.w * 0.12); c.setAttribute('cy', A.headY + A.h * 0.22); c.setAttribute('fill', p.color);
    this._anim(c, 'circle', [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.4)', opacity: .95, offset: .4 }, { transform: 'scale(0)', opacity: 0 }], p.ms, 'ease-out');
  }

  _sweat(p, A) {
    const c = this._take('circle');
    c.setAttribute('r', 3.2); c.setAttribute('cx', A.x + A.w * 0.34); c.setAttribute('cy', A.headY + 6); c.setAttribute('fill', p.color);
    this._anim(c, 'circle', [{ transform: 'translateY(0) scale(.6)', opacity: 0 }, { opacity: .95, offset: .2 }, { transform: 'translateY(22px) scale(1)', opacity: 0 }], p.ms, 'cubic-bezier(.4,0,.8,.4)');
  }

  dispose() { this.live.forEach((a) => a.cancel()); this.live.clear(); this.svg.remove(); }
}
