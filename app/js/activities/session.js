/**
 * Session — builds a question list from an activity descriptor (static items and/or generators),
 * tracks answers, hearts, timing, and computes results/mastery/XP.
 *
 * Activity JSON:
 *  { questions: [Q...], generator?: { kind: 'mult', tables: [3], count: 10 }, count?: 10, practice?: false, font?: 'quran' }
 * Q types:
 *  quiz      { type:'quiz', q, choices:[...], answer: idx, explain? }
 *  truefalse { type:'truefalse', q, answer: true|false, explain? }
 *  fillblank { type:'fillblank', q: 'text with ___', choices:[...], answer: idx }
 *  numpad    { type:'numpad', q, answer: number }
 *  match     { type:'match', pairs:[[a,b],...] }
 *  order     { type:'order', items:[...in correct order], prompt? }
 */
import store from '../core/store.js';
import bus from '../core/bus.js';
import xp from '../engines/xp.js';
import hearts from '../engines/hearts.js';
import streak from '../engines/streak.js';
import badges from '../engines/badges.js';
import registry from '../core/registry.js';
import { shuffle } from '../ui/components.js';
import { generate } from './generators.js';

export class Session {
  constructor(activity) {
    this.a = activity;
    this.practice = !!activity.practice;
    const staticQ = (activity.questions || []).map((q) => ({ ...q }));
    const genQ = activity.generator ? generate(activity.generator, store.profile) : [];
    let all = [...staticQ, ...genQ];
    if (activity.shuffle !== false) all = shuffle(all);
    const n = activity.count || all.length;
    this.questions = all.slice(0, Math.max(1, n));
    this.i = 0;
    this.correct = 0;
    this.wrong = 0;
    this.answers = [];
    this.startedAt = Date.now();
    this.ended = false;
  }
  get current() { return this.questions[this.i]; }
  get total() { return this.questions.length; }
  get progress() { return Math.round((this.i / this.total) * 100); }

  /** record an answer for the current question */
  answer(ok, meta = {}) {
    const p = store.profile;
    this.answers.push({ i: this.i, ok, ...meta });
    p.counters.answers++;
    if (ok) { this.correct++; p.counters.correct++; }
    else { this.wrong++; if (!this.practice) hearts.lose(); }
    const d = store.today(); d.answers++; if (ok) d.correct++;
    store.save();
    bus.emit('activity:answer', { id: this.a.id, correct: ok, subject: this.a.subject });
    return ok;
  }
  next() { this.i++; return this.i < this.total; }
  get outOfHearts() { return !this.practice && hearts.count <= 0; }

  /** finish: compute score, mastery, XP, streak, badges, certificate eligibility */
  finish(aborted = false) {
    if (this.ended) return this.result; this.ended = true;
    const p = store.profile;
    const answered = this.answers.length || 1;
    const score = Math.round((this.correct / this.total) * 100);
    const perfect = this.correct === this.total && !aborted;
    const secs = Math.round((Date.now() - this.startedAt) / 1000);
    const st = p.activities[this.a.id] || { plays: 0, best: 0, mastery: 0, lastPlayed: 0, correct: 0, total: 0 };
    st.plays++; st.lastPlayed = Date.now(); st.correct += this.correct; st.total += this.total;
    if (score > st.best) st.best = score;
    // mastery: +1 crown for >=80%, +2 for perfect, -1 if <50% (min 0, max 5)
    const before = st.mastery;
    if (!aborted) st.mastery = Math.max(0, Math.min(5, st.mastery + (perfect ? 2 : score >= 80 ? 1 : score < 50 ? -1 : 0)));
    p.activities[this.a.id] = st;
    p.counters.sessions++;
    if (perfect) p.counters.perfect++;
    const hour = new Date().getHours();
    if (hour < 9) p.counters.earlyBird = (p.counters.earlyBird || 0) + 1;
    if (hour >= 20) p.counters.nightOwl = (p.counters.nightOwl || 0) + 1;
    const d = store.today(); d.minutes += Math.max(1, Math.round(secs / 60)); if (!d.activities.includes(this.a.id)) d.activities.push(this.a.id);
    p.counters.minutes += Math.max(1, Math.round(secs / 60));
    store.save();

    // XP: base * score ratio + perfect bonus + speed bonus
    const base = this.a.xp || 20;
    let gain = Math.round(base * (this.correct / this.total));
    if (perfect) gain += Math.round(base * 0.5);
    if (secs < this.total * 6 && score >= 80) gain += 5;
    if (aborted) gain = Math.round(gain * 0.5);
    const xpRes = gain > 0 ? xp.add(gain, this.a.title) : { gained: 0 };
    if (perfect) xp.addGems(3, 'إجابات كاملة');
    const streakUp = !aborted && score >= 50 ? streak.touch() : false;

    // certificate when reaching 5 crowns first time
    let certificate = null;
    if (st.mastery >= 5 && before < 5) {
      certificate = { id: `${this.a.id}_${Date.now().toString(36)}`, activityId: this.a.id, title: this.a.title, subject: this.a.subject, date: Date.now(), xp: p.xp, name: p.name };
      p.certificates.push(certificate); store.save();
    }
    bus.emit('activity:complete', { id: this.a.id, subject: this.a.subject, score, perfect, aborted });
    const newBadges = badges.evaluate(registry.items());
    this.result = { score, perfect, correct: this.correct, wrong: this.wrong, total: this.total, secs, xp: xpRes.gained, levelUp: xpRes.levelUp, mastery: st.mastery, masteryBefore: before, streakUp, certificate, newBadges, aborted };
    return this.result;
  }
}
export default Session;
