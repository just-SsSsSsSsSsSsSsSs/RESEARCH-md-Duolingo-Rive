/**
 * Badges Engine — data-driven achievements. Each badge = { id, name, desc, icon, tier, check(profile) -> {done, prog, target} }
 * Extend by pushing to BADGES (or loading from content/badges.json in future).
 */
import store from '../core/store.js';
import bus from '../core/bus.js';
import sound from './sound.js';
import { levelFromXp } from './xp.js';

const count = (p, fn) => Object.values(p.activities).filter(fn).length;
const bySubject = (p, subj, registryItems) => Object.keys(p.activities).filter((id) => registryItems?.find((i) => i.id === id)?.subject === subj);

export const BADGES = [
  { id: 'first_step', name: 'أول خطوة', desc: 'أكمل أول نشاط', icon: 'rocket', tier: 1, check: (p) => ({ prog: Math.min(1, p.counters.sessions), target: 1 }) },
  { id: 'streak_3', name: 'شعلة صغيرة', desc: '3 أيام متتالية', icon: 'flame', tier: 1, check: (p) => ({ prog: p.streak.best, target: 3 }) },
  { id: 'streak_7', name: 'أسبوع من نار', desc: '7 أيام متتالية', icon: 'volcano', tier: 2, check: (p) => ({ prog: p.streak.best, target: 7 }) },
  { id: 'streak_30', name: 'شعلة أسطورية', desc: '30 يوماً متتالياً', icon: 'comet', tier: 3, check: (p) => ({ prog: p.streak.best, target: 30 }) },
  { id: 'perfect_1', name: 'إجابات كاملة', desc: 'نشاط كامل بدون خطأ', icon: 'hundred', tier: 1, check: (p) => ({ prog: p.counters.perfect, target: 1 }) },
  { id: 'perfect_10', name: 'دقة الصياد', desc: '10 أنشطة كاملة بدون خطأ', icon: 'target', tier: 2, check: (p) => ({ prog: p.counters.perfect, target: 10 }) },
  { id: 'answers_100', name: 'مئة إجابة', desc: 'أجب على 100 سؤال', icon: 'brain', tier: 1, check: (p) => ({ prog: p.counters.answers, target: 100 }) },
  { id: 'answers_500', name: 'عقل جبار', desc: 'أجب على 500 سؤال', icon: 'dna', tier: 2, check: (p) => ({ prog: p.counters.answers, target: 500 }) },
  { id: 'answers_2000', name: 'موسوعة', desc: 'أجب على 2000 سؤال', icon: 'book', tier: 3, check: (p) => ({ prog: p.counters.answers, target: 2000 }) },
  { id: 'level_5', name: 'مستوى 5', desc: 'اصعد للمستوى الخامس', icon: 'star', tier: 1, check: (p) => ({ prog: levelFromXp(p.xp), target: 5 }) },
  { id: 'level_10', name: 'مستوى 10', desc: 'اصعد للمستوى العاشر', icon: 'star', tier: 2, check: (p) => ({ prog: levelFromXp(p.xp), target: 10 }) },
  { id: 'level_25', name: 'مستوى 25', desc: 'اصعد للمستوى 25', icon: 'sparkle', tier: 3, check: (p) => ({ prog: levelFromXp(p.xp), target: 25 }) },
  { id: 'mastery_1', name: 'تاج الإتقان', desc: 'أتقن نشاطاً (5 تيجان)', icon: 'crown', tier: 2, check: (p) => ({ prog: count(p, (a) => a.mastery >= 5), target: 1 }) },
  { id: 'mastery_5', name: 'خمسة تيجان', desc: 'أتقن 5 أنشطة', icon: 'castle', tier: 3, check: (p) => ({ prog: count(p, (a) => a.mastery >= 5), target: 5 }) },
  { id: 'explorer', name: 'مستكشف', desc: 'جرّب 5 أنشطة مختلفة', icon: 'compass', tier: 1, check: (p) => ({ prog: Object.keys(p.activities).length, target: 5 }) },
  { id: 'explorer_15', name: 'رحّالة', desc: 'جرّب 15 نشاطاً مختلفاً', icon: 'map', tier: 2, check: (p) => ({ prog: Object.keys(p.activities).length, target: 15 }) },
  { id: 'bubbles_50', name: 'فرقّاع الفقاعات', desc: 'فرقع 50 فقاعة', icon: 'bubble', tier: 1, check: (p) => ({ prog: p.counters.bubblesPopped, target: 50 }) },
  { id: 'bubbles_500', name: 'ملك الفقاعات', desc: 'فرقع 500 فقاعة', icon: 'waves', tier: 2, check: (p) => ({ prog: p.counters.bubblesPopped, target: 500 }) },
  { id: 'quran_3', name: 'حافظ صغير', desc: 'أكمل 3 أنشطة قرآن', icon: 'quran', tier: 1, check: (p, items) => ({ prog: bySubject(p, 'quran', items).length, target: 3 }) },
  { id: 'math_5', name: 'عبقري الأرقام', desc: 'أكمل 5 أنشطة رياضيات', icon: 'numbers', tier: 1, check: (p, items) => ({ prog: bySubject(p, 'math', items).length, target: 5 }) },
  { id: 'arabic_3', name: 'أديب صغير', desc: 'أكمل 3 أنشطة لغة عربية', icon: 'pen', tier: 1, check: (p, items) => ({ prog: bySubject(p, 'arabic', items).length, target: 3 }) },
  { id: 'gems_100', name: 'كنز الجواهر', desc: 'اجمع 100 جوهرة', icon: 'gem', tier: 2, check: (p) => ({ prog: p.gems, target: 100 }) },
  { id: 'early_bird', name: 'عصفور الصباح', desc: 'تعلّم قبل 9 صباحاً', icon: 'sunrise', tier: 1, check: (p) => ({ prog: p.counters.earlyBird || 0, target: 1 }) },
  { id: 'night_owl', name: 'بومة الليل', desc: 'تعلّم بعد 8 مساءً', icon: 'owl', tier: 1, check: (p) => ({ prog: p.counters.nightOwl || 0, target: 1 }) },
  { id: 'quests_10', name: 'صائد المهام', desc: 'أكمل 10 مهام يومية', icon: 'scroll', tier: 2, check: (p) => ({ prog: p.counters.questsDone || 0, target: 10 }) },
  { id: 'certificate_1', name: 'أول شهادة', desc: 'احصل على شهادة تقدير', icon: 'gradCap', tier: 2, check: (p) => ({ prog: p.certificates.length, target: 1 }) },
];

export const badgesEngine = {
  list(items) {
    const p = store.profile; if (!p) return [];
    return BADGES.map((b) => { const r = b.check(p, items); const earned = !!p.badges[b.id]; return { ...b, ...r, pct: Math.min(100, Math.round((r.prog / r.target) * 100)), earned, at: p.badges[b.id] }; });
  },
  /** evaluate all, award newly completed; returns array of newly earned */
  evaluate(items) {
    const p = store.profile; if (!p) return [];
    const fresh = [];
    for (const b of BADGES) {
      if (p.badges[b.id]) continue;
      const r = b.check(p, items);
      if (r.prog >= r.target) { p.badges[b.id] = Date.now(); fresh.push(b); }
    }
    if (fresh.length) {
      p.gems += fresh.reduce((s, b) => s + b.tier * 10, 0);
      store.save(); sound.play('badge');
      fresh.forEach((b) => bus.emit('badge:earned', b));
    }
    return fresh;
  },
  earnedCount() { return Object.keys(store.profile?.badges || {}).length; },
  total() { return BADGES.length; },
};
export default badgesEngine;
