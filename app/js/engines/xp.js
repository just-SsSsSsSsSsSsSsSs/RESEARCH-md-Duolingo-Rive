/**
 * XP & Levels — infinite level curve (no hard-coded tables).
 *   xpForLevel(n) = round(60 * n^1.55)   cumulative XP required to REACH level n
 *   Titles cycle through tiers with roman-ish suffix so it never runs out.
 */
import store from '../core/store.js';
import bus from '../core/bus.js';
import sound from './sound.js';

const TIERS = ['مبتدئ', 'متعلّم', 'مجتهد', 'متألّق', 'خبير', 'محترف', 'ماهر', 'بطل', 'أسطورة', 'نجم ساطع', 'عبقري', 'قائد', 'ملك المعرفة'];
const ROMAN = ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function xpForLevel(n) { return n <= 1 ? 0 : Math.round(60 * Math.pow(n - 1, 1.55)); }
export function levelFromXp(xp) { let n = 1; while (xpForLevel(n + 1) <= xp) n++; return n; }
export function levelTitle(n) {
  const tier = TIERS[(n - 1) % TIERS.length];
  const round = Math.floor((n - 1) / TIERS.length);
  return round ? `${tier} ${ROMAN[round] || round + 1}` : tier;
}
export function levelInfo(xp = store.profile?.xp || 0) {
  const level = levelFromXp(xp);
  const cur = xpForLevel(level), next = xpForLevel(level + 1);
  return { level, title: levelTitle(level), xp, cur, next, into: xp - cur, need: next - cur, pct: Math.min(100, Math.round(((xp - cur) / (next - cur)) * 100)) };
}

export const xpEngine = {
  /** award XP with optional multiplier from streak; returns {gained, levelUp} */
  add(amount, reason = '') {
    const p = store.profile; if (!p || amount <= 0) return { gained: 0 };
    const mult = this.multiplier();
    const gained = Math.round(amount * mult);
    const before = levelFromXp(p.xp);
    p.xp += gained;
    store.today().xp += gained;
    const after = levelFromXp(p.xp);
    store.save();
    bus.emit('xp:gain', { gained, reason, mult, total: p.xp });
    if (after > before) {
      p.gems += 5 * (after - before);
      store.save();
      sound.play('levelup');
      bus.emit('level:up', { from: before, to: after, title: levelTitle(after) });
    }
    return { gained, levelUp: after > before, level: after };
  },
  multiplier() {
    const s = store.profile?.streak.count || 0;
    return s >= 30 ? 1.5 : s >= 14 ? 1.35 : s >= 7 ? 1.2 : s >= 3 ? 1.1 : 1;
  },
  addGems(n, reason = '') { const p = store.profile; if (!p) return; p.gems += n; store.save(); sound.play('coin'); bus.emit('gems:change', { n, reason, total: p.gems }); },
  spendGems(n) { const p = store.profile; if (!p || p.gems < n) return false; p.gems -= n; store.save(); bus.emit('gems:change', { n: -n, total: p.gems }); return true; },
  info: levelInfo,
};
export default xpEngine;
