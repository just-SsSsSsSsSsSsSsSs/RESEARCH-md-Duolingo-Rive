// node app/tests/unit/report_core.test.mjs - pure maths/text of the parent weekly report (Phase 20 M1)
import * as r from '../../js/engines/report_core.js';
import { board as famBoard } from '../../js/engines/family_core.js';
let n = 0, fail = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
const NOW = new Date(2026, 8, 23, 15); // Wed 23 Sep 2026, week = Sat 19 .. Fri 25
const day = (off) => { const d = new Date(2026, 8, 19); d.setDate(d.getDate() + off); return d; };
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const bucket = (c, m = 5, r = 0) => ({ answers: c + 2, correct: c, xp: c * 3, minutes: m, recovered: r });
const ev = (off, hour, skill, correct, retried = false) => ({ type: 'question_attempted', t: day(off).getTime() + hour * 3600000, hour, skill, correct, retried, subject: 'math' });

// selim: prev week 20 correct, this week 30 -> improved; weak skill 'جدول ٧' (1/4), strong 'جدول ٢' (5/5), recovered once
const selim = { id: 'selim', name: 'سليم', hex: '#22e39b', daily: { [key(day(-7))]: bucket(10), [key(day(-6))]: bucket(10), [key(day(1))]: bucket(12, 6), [key(day(3))]: bucket(18, 9, 1) } };
const events = [
  ...Array.from({ length: 5 }, (_, i) => ev(1, 9, 'جدول ٢', true)),
  ev(3, 16, 'جدول ٧', false), ev(3, 16, 'جدول ٧', false), ev(3, 16, 'جدول ٧', false), ev(3, 16, 'جدول ٧', true, true),
  ev(3, 16, 'جدول ٣', true), ev(3, 16, 'جدول ٣', true), ev(3, 16, 'جدول ٣', true), ev(3, 16, 'جدول ٣', false),
  ev(-5, 20, 'جدول ٧', false), // previous week: must be ignored
];
const kenda = { id: 'kenda', name: 'كندة', hex: '#19e6ff', daily: { [key(day(2))]: bucket(6, 4) } };
const karma = { id: 'karma', name: 'كارما', hex: '#ff5c8a', daily: {} };
const board = famBoard([selim, karma, kenda], NOW);

const w = r.weekWindow(NOW);
ok(w.startKey === '2026-09-19' && w.keys.length === 7 && w.prevKeys[0] === '2026-09-12', 'week window Sat..Fri + previous week');

const rep = r.weekReport(selim, events, board, NOW);
ok(rep.week.correct === 30 && rep.prev.correct === 20 && rep.deltas.correct === 10, `deltas this vs previous week (${rep.prev.correct} -> ${rep.week.correct})`);
ok(rep.week.activeDays === 2 && rep.week.accuracy === Math.round(30 / 34 * 100) && rep.week.recovered === 1, 'active days, accuracy, recovered from daily');
ok(rep.headline.kind === 'improved' && rep.headline.text.includes('سليم') && rep.headline.text.includes('الخطوة الجاية'), `headline improved + next step: ${rep.headline.text}`);
ok(rep.weak?.skill === 'جدول ٧' && rep.strong?.skill === 'جدول ٢', `weak ${rep.weak?.skill} / strong ${rep.strong?.skill}`);
ok(rep.skillsN === 3, 'previous-week events excluded from skills');
ok(rep.slot?.id === 'afternoon' || rep.slot?.id === 'morning', `best slot computed (${rep.slot?.id} ${rep.slot?.rate}%)`);
ok(rep.slot?.id === 'morning' && rep.slot.rate === 100, 'morning (5/5) beats afternoon (5/8)');
ok(rep.tip === r.tipFor({ subject: 'math' }) && rep.tip.length > 10, 'math tip attached to weak skill');
ok(rep.nextFocus === 'جدول ٧', 'next focus = weak skill');
ok(rep.starters.length === 3 && rep.starters[0].id === 'recovered' && rep.starters[0].text.includes('جدول ٧'), `starters grounded in data: ${rep.starters.map((s) => s.id)}`);
ok(rep.starters.every((s) => !/اخوه|اخته|احسن من|اقل من اخ/.test(s.text)), 'starters never compare siblings');
ok(rep.week.bestDay?.correct === 18 && rep.week.bestDay.label === 'التلات', `best day label ${rep.week.bestDay?.label}`);

const first = r.weekReport(kenda, [], board, NOW);
ok(first.headline.kind === 'first' && first.weak === null && first.starters.length >= 1, 'first week: headline first, no weak skill without events');
const quiet = r.weekReport(karma, [], board, NOW);
ok(quiet.headline.kind === 'quiet' && quiet.week.correct === 0, 'quiet week handled');
const dip = r.weekReport({ id: 'x', name: 'س', daily: { [key(day(-7))]: bucket(30), [key(day(1))]: bucket(10) } }, [], null, NOW);
ok(dip.headline.kind === 'dipped' && dip.headline.text.includes('طبيعي'), 'dipped is framed kindly');
const steady = r.weekReport({ id: 'y', name: 'ص', daily: { [key(day(-7))]: bucket(30), [key(day(1))]: bucket(31) } }, [], null, NOW);
ok(steady.headline.kind === 'steady', 'small change = steady');

const fs = r.familySummary([rep, quiet, first], board);
ok(fs.totals.correct === 36 && fs.totals.active === 2 && fs.members.length === 3, 'family totals');
ok(!('rank' in fs.members[0]) && !/الاخير|الأخير/.test(fs.line) && fs.line.length > 10, 'family line: no rank, no last');
ok(fs.quest && fs.quest.progress === 36, 'quest carried from board');

const s1 = r.snapshot(rep);
ok(Object.keys(s1).sort().join() === 'a,c,d,id,k,m,r,w' && r.archiveClean([s1]), 'snapshot holds aggregates only');
let arc = []; for (let i = 0; i < 10; i++) arc = r.archiveMerge(arc, { ...s1, w: `2026-0${i < 9 ? '1' : '2'}-${String(i + 1).padStart(2, '0')}` });
ok(arc.length === r.ARCHIVE_MAX && arc[0].w === '2026-01-03', 'archive capped at 8 weeks per child, oldest dropped');
const twice = r.archiveMerge(r.archiveMerge([], s1), s1);
ok(twice.length === 1, 'archive merge idempotent by week+child');
ok(r.archiveMerge([{ ...s1, id: 'kenda' }], s1).length === 2, 'archive keeps other children');
ok(!r.archiveClean([{ ...s1, key: '7x8' }]), 'archive cleanliness rejects extra fields');

const txt = r.reportText(rep);
ok(txt.includes('تقرير سليم') && txt.includes('اسئلة على السفرة') && txt.split('\n').length >= 12, 'plain text render');
ok(!/question_attempted|"t":|\dx\d/.test(txt), 'text has no raw event keys');

console.log(`\n${n - fail}/${n} passed`); process.exit(fail ? 1 : 0);
