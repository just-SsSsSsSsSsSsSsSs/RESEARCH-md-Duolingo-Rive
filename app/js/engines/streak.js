/**
 * Streak Engine — consecutive active days with Streak Freeze protection.
 * A day counts when the child completes ≥1 activity (call `touch()`).
 * On load, `check()` evaluates gaps: 1 missed day + freeze available  consumes freeze; else reset.
 */
import store, { todayKey } from '../core/store.js';
import bus from '../core/bus.js';
import sound from './sound.js';

function dayDiff(aKey, bKey) {
  const [ay, am, ad] = aKey.split('-').map(Number), [by, bm, bd] = bKey.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

export const streakEngine = {
  check() {
    const p = store.profile; if (!p) return;
    const s = p.streak; const today = todayKey();
    if (!s.lastDay) return;
    const gap = dayDiff(s.lastDay, today);
    if (gap <= 1) return; // fine
    const missed = gap - 1;
    if (missed <= s.freezes) {
      s.freezes -= missed;
      for (let i = 1; i <= missed; i++) { const d = new Date(); d.setDate(d.getDate() - (gap - i)); s.frozenDays.push(todayKey(d)); }
      s.lastDay = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return todayKey(d); })();
      store.save();
      bus.emit('streak:frozen', { used: missed, left: s.freezes });
    } else {
      const lost = s.count;
      s.count = 0; s.lastDay = null; store.save();
      bus.emit('streak:lost', { lost });
    }
  },
  /** mark today as active; returns true if streak incremented */
  touch() {
    const p = store.profile; if (!p) return false;
    const s = p.streak; const today = todayKey();
    if (s.lastDay === today) return false;
    const gap = s.lastDay ? dayDiff(s.lastDay, today) : 99;
    s.count = gap === 1 ? s.count + 1 : 1;
    s.lastDay = today;
    if (s.count > s.best) s.best = s.count;
    // earn a freeze every 7 days (max 3)
    if (s.count % 7 === 0 && s.freezes < 3) { s.freezes++; bus.emit('streak:freezeEarned', { freezes: s.freezes }); }
    store.save();
    sound.play('streak');
    bus.emit('streak:update', { count: s.count, best: s.best });
    return true;
  },
  buyFreeze(cost = 30) {
    const p = store.profile; if (!p || p.streak.freezes >= 3 || p.gems < cost) return false;
    p.gems -= cost; p.streak.freezes++; store.save(); bus.emit('streak:freezeEarned', { freezes: p.streak.freezes }); return true;
  },
  /** 7-day calendar for UI */
  week() {
    const p = store.profile; const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); const k = todayKey(d);
      const active = !!(p?.daily[k]?.activities?.length) || p?.streak.lastDay === k;
      out.push({ key: k, day: d.toLocaleDateString('ar-EG', { weekday: 'short' }), active, frozen: p?.streak.frozenDays.includes(k), today: i === 0 });
    }
    return out;
  },
};
export default streakEngine;
