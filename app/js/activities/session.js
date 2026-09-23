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
import telemetry, { stopwatch } from '../engines/telemetry.js';

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
    this.explained = 0;      // explanations requested during this session
    this._sw = null;         // stopwatch of the current question
    // Phase 11 K3 - mistake learning loop
    this.review = !!activity.review;   // review round ("تحدي أبطال الماث"): no plays/mastery/streak, light XP
    this.missed = new Set();           // indices answered wrong on the first try (feeds the review round)
    this.retried = 0;                  // second attempts taken
    this.recovered = 0;                // second attempts that were correct ("learned from the mistake")
  }
  get current() { return this.questions[this.i]; }
  /** mark the current question as shown (starts its stopwatch + logs question_shown) - idempotent per question */
  shown() {
    if (this._sw && this._sw.i === this.i) return this._sw;
    const q = this.current; this._sw = Object.assign(stopwatch(), { i: this.i, explained: 0, strategies: [] });
    telemetry.log('question_shown', { act: this.a.id, subject: this.a.subject, key: q?.key || q?.q, skill: this.skillOf(q), qtype: q?.type });
    return this._sw;
  }
  /** child interacted with the question (first tap) */
  touch() { this.shown().touch(); }
  /** child asked "what does it mean?" - remember the strategy for explanation_result */
  explained_with(strategy) { const sw = this.shown(); sw.explained++; sw.strategies.push(strategy); this.explained++; telemetry.log('explanation_requested', { act: this.a.id, subject: this.a.subject, key: this.current?.key || this.current?.q, skill: this.skillOf(this.current), strategy, nth: sw.explained }); }
  skillOf(q) { return q?.skill || (q?.phase?.title ? `${this.a.title}: ${q.phase.title}` : null) || this.a.skill || this.a.title || this.a.id; }
  get total() { return this.questions.length; }
  get progress() { return Math.round((this.i / this.total) * 100); }

  /**
   * Phase 11 K3: first wrong answer on the current question - nothing is scored yet, the child gets one more try.
   * The heart is taken here (once), `question_retry` is logged and the question is marked as missed.
   * Returns true when the session must stop (out of hearts); the caller then records the answer for real.
   */
  retry(meta = {}) {
    const q = this.current, sw = this.shown(); sw.attempt();
    this.missed.add(this.i); this.retried++; sw.retried = true;
    if (!this.practice) hearts.lose();
    telemetry.log('question_retry', { act: this.a.id, subject: this.a.subject, key: q?.key || q?.q, skill: this.skillOf(q), qtype: q?.type,
      wrong_value: meta.picked != null ? String(meta.picked).slice(0, 24) : undefined, pos: this.i, explained_before: sw.explained });
    return this.outOfHearts;
  }
  /** is the current question on its second try? */
  get isRetry() { return !!(this._sw && this._sw.i === this.i && this._sw.retried); }

  /** record an answer for the current question */
  answer(ok, meta = {}) {
    const p = store.profile;
    const q = this.current, sw = this.shown(); sw.attempt();
    const snap = sw.snapshot(); const retried = !!sw.retried;
    if (retried && ok) this.recovered++;
    if (!ok) this.missed.add(this.i);
    this.answers.push({ i: this.i, ok, retried, ...meta, ...snap, skill: this.skillOf(q) });
    telemetry.log('question_attempted', { act: this.a.id, subject: this.a.subject, key: q?.key || q?.q, skill: this.skillOf(q), qtype: q?.type, correct: !!ok, ...snap, retried, review: this.review || undefined,
      wrong_value: ok ? undefined : (meta.picked != null ? String(meta.picked).slice(0, 24) : undefined), expected: q?.answer != null && typeof q.answer !== 'object' ? String(q.answer).slice(0, 24) : undefined,
      pos: this.i, total: this.total, session_ms: Date.now() - this.startedAt, hour: new Date().getHours(), after_explain: sw.explained ? sw.strategies[sw.strategies.length - 1] : undefined });
    if (sw.explained) sw.strategies.forEach((st) => telemetry.log('explanation_result', { act: this.a.id, subject: this.a.subject, key: q?.key || q?.q, skill: this.skillOf(q), strategy: st, solved: !!ok }));
    p.counters.answers++;
    if (ok) { this.correct++; p.counters.correct++; }
    else { this.wrong++; if (!this.practice && !retried) hearts.lose(); } // a retried question already cost its heart in retry()
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
    // a question solved on the second try counts in the score, but "perfect" means first-try everywhere
    const perfect = this.correct === this.total && !aborted && this.recovered === 0;
    if (this.review) {
      // review round: light-weight - no plays/mastery/streak/badges, +2 XP per fixed question
      const secs = Math.round((Date.now() - this.startedAt) / 1000);
      const gain = aborted ? 0 : this.correct * 2;
      const xpRes = gain > 0 ? xp.add(gain, 'تحدي الأبطال: ' + this.a.title) : { gained: 0 };
      store.save();
      telemetry.log('review_completed', { act: this.a.id, subject: this.a.subject, score, aborted, total: this.total, correct: this.correct, duration_ms: Date.now() - this.startedAt });
      this.result = { review: true, score, perfect: this.correct === this.total && !aborted, correct: this.correct, wrong: this.wrong, total: this.total, secs, xp: xpRes.gained, levelUp: xpRes.levelUp, aborted, recovered: this.recovered, newBadges: [] };
      return this.result;
    }
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
    telemetry.log(aborted ? 'session_quit' : 'stage_completed', { act: this.a.id, subject: this.a.subject, score, perfect, aborted, duration_ms: Date.now() - this.startedAt, total: this.total, correct: this.correct, pos: this.i, explained: this.explained });
    bus.emit('activity:complete', { id: this.a.id, subject: this.a.subject, score, perfect, aborted, secs, total: this.total, correct: this.correct });
    const newBadges = badges.evaluate(registry.items());
    this.result = { score, perfect, correct: this.correct, wrong: this.wrong, total: this.total, secs, xp: xpRes.gained, levelUp: xpRes.levelUp, mastery: st.mastery, masteryBefore: before, streakUp, certificate, newBadges, aborted,
      recovered: this.recovered, missed: [...this.missed] };
    return this.result;
  }
  /** questions missed on the first try, in order - material for the review round */
  get missedQuestions() { return [...this.missed].sort((a, b) => a - b).map((i) => this.questions[i]).filter(Boolean); }
}
export default Session;
