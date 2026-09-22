/**
 * Quests Engine — daily generated missions (3/day), seeded by date so all devices agree.
 * Quest templates are data; progress tracked from bus events.
 */
import store, { todayKey } from '../core/store.js';
import bus from '../core/bus.js';
import xp from './xp.js';

const TEMPLATES = [
  { id: 'answers', name: 'أجب على {n} سؤالاً', icon: '❓', n: [10, 15, 20, 30], reward: (n) => n * 2, evt: 'activity:answer', inc: () => 1 },
  { id: 'correct', name: 'أجب إجابة صحيحة {n} مرة', icon: '✅', n: [8, 12, 16], reward: (n) => n * 3, evt: 'activity:answer', inc: (e) => (e.correct ? 1 : 0) },
  { id: 'complete', name: 'أكمل {n} نشاطاً', icon: '🏁', n: [1, 2, 3], reward: (n) => n * 15, evt: 'activity:complete', inc: () => 1 },
  { id: 'perfect', name: 'أكمل نشاطاً بدون أي خطأ', icon: '💯', n: [1], reward: () => 40, evt: 'activity:complete', inc: (e) => (e.perfect ? 1 : 0) },
  { id: 'xp', name: 'اجمع {n} نقطة خبرة', icon: '⭐', n: [50, 80, 120], reward: (n) => Math.round(n / 4), evt: 'xp:gain', inc: (e) => e.gained },
  { id: 'bubbles', name: 'فرقع {n} فقاعة', icon: '🫧', n: [10, 20, 30], reward: (n) => n, evt: 'bubble:pop', inc: () => 1 },
  { id: 'subject_math', name: 'أكمل نشاط رياضيات', icon: '🔢', n: [1], reward: () => 20, evt: 'activity:complete', inc: (e) => (e.subject === 'math' ? 1 : 0) },
  { id: 'subject_quran', name: 'أكمل نشاط قرآن', icon: '📖', n: [1], reward: () => 20, evt: 'activity:complete', inc: (e) => (e.subject === 'quran' ? 1 : 0) },
  { id: 'subject_arabic', name: 'أكمل نشاط لغة عربية', icon: '✍️', n: [1], reward: () => 20, evt: 'activity:complete', inc: (e) => (e.subject === 'arabic' ? 1 : 0) },
];

function seeded(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const questsEngine = {
  init() {
    bus.on('profile:change', () => this.ensure());
    for (const t of TEMPLATES) bus.on(t.evt, (e) => this.progress(t.evt, e));
    this.ensure();
  },
  ensure() {
    const p = store.profile; if (!p) return;
    const today = todayKey();
    if (p.quests.day === today && p.quests.list.length) return;
    const rnd = seeded(today + ':' + p.id);
    const pool = [...TEMPLATES];
    const list = [];
    while (list.length < 3 && pool.length) {
      const i = Math.floor(rnd() * pool.length); const t = pool.splice(i, 1)[0];
      const n = t.n[Math.floor(rnd() * t.n.length)];
      list.push({ tid: t.id, name: t.name.replace('{n}', n), icon: t.icon, target: n, prog: 0, reward: t.reward(n), done: false, claimed: false });
    }
    p.quests = { day: today, list }; store.save(); bus.emit('quest:new', list);
  },
  progress(evt, e) {
    const p = store.profile; if (!p) return; this.ensure();
    let changed = false;
    for (const q of p.quests.list) {
      if (q.done) continue;
      const t = TEMPLATES.find((x) => x.id === q.tid); if (!t || t.evt !== evt) continue;
      const inc = t.inc(e || {}); if (!inc) continue;
      q.prog = Math.min(q.target, q.prog + inc); changed = true;
      if (q.prog >= q.target) { q.done = true; p.counters.questsDone = (p.counters.questsDone || 0) + 1; bus.emit('quest:done', q); }
    }
    if (changed) { store.save(); bus.emit('quest:progress', p.quests.list); }
  },
  claim(idx) {
    const p = store.profile; const q = p?.quests.list[idx]; if (!q || !q.done || q.claimed) return false;
    q.claimed = true; store.save(); xp.add(q.reward, 'مهمة يومية'); xp.addGems(3, 'مهمة'); return true;
  },
  list() { this.ensure(); return store.profile?.quests.list || []; },
};
export default questsEngine;
