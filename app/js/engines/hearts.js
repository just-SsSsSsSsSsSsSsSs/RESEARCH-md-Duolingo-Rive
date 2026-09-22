/**
 * Hearts Engine — 5 hearts, lose one per wrong answer, regenerate 1 heart / 20 min,
 * refill with gems, or via "practice" (activity marked practice:true never costs hearts).
 */
import store from '../core/store.js';
import bus from '../core/bus.js';
import sound from './sound.js';

export const MAX_HEARTS = 5;
export const REGEN_MS = 20 * 60 * 1000;

export const heartsEngine = {
  /** apply time-based regeneration; call on load & before display */
  regen() {
    const p = store.profile; if (!p) return;
    if (p.hearts >= MAX_HEARTS) { p.heartsLostAt = null; return; }
    if (!p.heartsLostAt) { p.heartsLostAt = Date.now(); return; }
    const elapsed = Date.now() - p.heartsLostAt;
    const gained = Math.floor(elapsed / REGEN_MS);
    if (gained > 0) {
      p.hearts = Math.min(MAX_HEARTS, p.hearts + gained);
      p.heartsLostAt = p.hearts >= MAX_HEARTS ? null : p.heartsLostAt + gained * REGEN_MS;
      store.save();
      bus.emit('hearts:change', { hearts: p.hearts, delta: gained });
    }
  },
  lose() {
    const p = store.profile; if (!p) return p?.hearts ?? 0;
    if (p.hearts <= 0) return 0;
    p.hearts--; if (!p.heartsLostAt) p.heartsLostAt = Date.now();
    store.save(); sound.play('heart');
    bus.emit('hearts:change', { hearts: p.hearts, delta: -1 });
    return p.hearts;
  },
  gain(n = 1) {
    const p = store.profile; if (!p) return;
    p.hearts = Math.min(MAX_HEARTS, p.hearts + n); if (p.hearts >= MAX_HEARTS) p.heartsLostAt = null;
    store.save(); bus.emit('hearts:change', { hearts: p.hearts, delta: n });
  },
  refill(costGems = 20) {
    const p = store.profile; if (!p) return false;
    if (p.hearts >= MAX_HEARTS) return true;
    if (p.gems < costGems) return false;
    p.gems -= costGems; p.hearts = MAX_HEARTS; p.heartsLostAt = null; store.save(); sound.play('coin');
    bus.emit('hearts:change', { hearts: p.hearts, delta: MAX_HEARTS }); bus.emit('gems:change', { total: p.gems });
    return true;
  },
  /** ms until next heart */
  nextIn() {
    const p = store.profile; if (!p || p.hearts >= MAX_HEARTS || !p.heartsLostAt) return 0;
    return Math.max(0, REGEN_MS - ((Date.now() - p.heartsLostAt) % REGEN_MS));
  },
  get count() { return store.profile?.hearts ?? MAX_HEARTS; },
};
export default heartsEngine;
