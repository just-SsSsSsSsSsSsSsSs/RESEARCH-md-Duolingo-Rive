// node app/tests/unit/family_core.test.mjs - pure maths of the family board (Phase 19 M1)
import * as c from '../../js/engines/family_core.js';
let n = 0, fail = 0;
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.log('FAIL', msg); } else console.log('ok  ', msg); };
const NOW = new Date(2026, 8, 23); // Wed 2026-09-23 -> week starts Sat 2026-09-19
const key = (off) => { const d = new Date(NOW); d.setDate(d.getDate() + off); return c.dayKey(d); };
const days = (spec) => { const o = {}; for (const [off, cor] of spec) o[key(off)] = { answers: cor + 2, correct: cor, xp: cor * 3, minutes: 5, recovered: off === -1 ? 1 : 0 }; return o; };

ok(c.dayKey(c.weekStart(NOW)) === '2026-09-19', 'week starts Saturday (Egypt)');
ok(c.weekKeys(c.weekStart(NOW)).length === 7 && c.weekKeys(c.weekStart(NOW))[6] === '2026-09-25', 'week keys Sat..Fri');
ok(c.isoWeek(new Date(2026, 0, 1)) === 1 && c.isoWeek(new Date(2026, 11, 31)) === 53, 'iso week sane');
ok(c.CATEGORIES.includes(c.headlineCategory(NOW)), 'headline category is one of the four');
ok(new Set(Array.from({ length: 4 }, (_, i) => c.headlineCategory(new Date(2026, 8, 5 + 7 * i)).id)).size === 4, 'headline rotates over 4 weeks');

// older sibling: strong baseline (30/week for 4 weeks), this week 33 -> +10%
const big = { id: 'selim', name: 's', daily: { ...days([[-1, 15], [-2, 18]]), ...days([[-8, 15], [-9, 15], [-15, 15], [-16, 15], [-22, 15], [-23, 15], [-29, 15], [-30, 15]]) } };
// youngest: baseline 6/week, this week 12 -> +100%
const small = { id: 'kenda', name: 'k', daily: { ...days([[-1, 5], [-2, 7]]), ...days([[-8, 3], [-9, 3], [-15, 3], [-16, 3], [-22, 3], [-23, 3], [-29, 3], [-30, 3]]) } };
const fresh = { id: 'karma', name: 'm', daily: days([[0, 4]]) };
const mb = c.memberMetrics(big, NOW), ms = c.memberMetrics(small, NOW), mf = c.memberMetrics(fresh, NOW);
ok(mb.week.correct === 33 && mb.baseline === 30 && mb.growth === 10, `older sibling growth 10% (got ${mb.growth}, base ${mb.baseline})`);
ok(ms.week.correct === 12 && ms.baseline === 6 && ms.growth === 100, `youngest growth 100% (got ${ms.growth}, base ${ms.baseline})`);
ok(mf.firstWeek && mf.growth === null, 'first week has no percentage');
ok(c.memberMetrics({ id: 'x', daily: { ...days([[-8, 1]]), ...days([[0, 10]]) } }, NOW).baseline === c.MIN_BASELINE, 'baseline floored at MIN_BASELINE');
ok(mb.week.activeDays === 2 && mb.accuracy === Math.round(33 / 37 * 100), 'active days + accuracy');
ok(mb.week.recovered === 1 && mb.streak === 2, `recovered summed (${mb.week.recovered}) and streak from daily (${mb.streak})`);
ok(c.memberMetrics({ id: 'y', daily: {}, streak: { count: 7 } }, NOW).streak === 7, 'store streak object respected');

const b = c.board([big, fresh, small], NOW);
ok(b.crowns.growth.length === 1 && b.crowns.growth[0] === 'kenda', 'growth crown -> youngest with most growth');
ok(b.crowns.minutes.includes('selim') && b.crowns.minutes.includes('kenda') && !b.crowns.minutes.includes('karma'), 'ties share a crown, no single loser');
ok(b.tiles.length === 3 && b.tiles.every((t) => !('rank' in t)), 'no numeric rank on tiles');
ok(b.tiles.filter((t) => t.leads).length >= 1 && b.tiles[0].leads, 'headline winner(s) shown first');
ok(b.tiles.every((t) => typeof t.line === 'string' && t.line.length > 8 && !/اخر|آخر|last/.test(t.line)), 'every tile has a positive personal line, nobody is last');
ok(b.quest.target === Math.max(c.QUEST_MIN, 3 * c.QUEST_PER_HERO) && b.quest.progress === 33 + 12 + 4, `quest target ${b.quest.target}, progress ${b.quest.progress}`);
ok(!b.quest.done && b.quest.pct === Math.round(49 / 300 * 100), 'quest pct');
ok(c.personalLine({ active: true, firstWeek: false, growth: -20, baseline: 30, week: { correct: 24 } }).includes('باقي 6'), 'negative growth phrased as distance to own record');
ok(c.personalLine({ active: false }).length > 5, 'inactive line exists');

// family card
const card = c.makeCard('abc123', [{ id: 'selim', daily: big.daily }, { id: 'karma', daily: fresh.daily }, { id: 'kenda', daily: {} }], NOW);
const json = JSON.stringify(card);
ok(card.kind === c.CARD_KIND && card.heroes.length === 2, 'card has only heroes with data');
ok(!/selim|سليم|name|device|token|"s"/.test(json.replace(/"k":"selim"/, '')) && c.cardIsClean(json), 'card carries no names / free text (whitelist clean)');
ok(!c.validCard({ ...card, src: 'ZZ' }) && !c.validCard({ ...card, heroes: [{ k: 'a b', days: {} }] }) && c.validCard(JSON.parse(json)), 'card validation');
ok(!c.cardIsClean({ ...card, heroes: [{ k: 'selim', days: {}, name: 'x' }] }), 'extra field rejected by cleanliness check');
const m1 = c.mergeDaily({ '2026-09-20': { answers: 5, correct: 4 } }, { '2026-09-20': { a: 3, c: 6 }, '2026-09-21': { a: 1, c: 1 } });
ok(m1['2026-09-20'].answers === 5 && m1['2026-09-20'].correct === 6 && m1['2026-09-21'].correct === 1, 'monotonic merge keeps max per field');
const r1 = c.applyCard(card, []);
ok(r1.added === 2 && r1.guests.every((g) => g.guest && g.id.startsWith('g_abc123_') && /^ضيف \d$/.test(g.name)), 'guests created with neutral labels');
const r2 = c.applyCard(card, r1.guests);
ok(r2.added === 0 && r2.updated === 2 && r2.guests.length === 2, 're-import is idempotent');
ok(JSON.stringify(c.applyCard(card, r1.guests).guests) === JSON.stringify(r2.guests), 'pure: same input same output');
let threw = false; try { c.applyCard({ kind: 'x' }, []); } catch { threw = true; } ok(threw, 'invalid card throws');
ok(/^[0-9a-f]{6}$/.test(c.newToken()), 'token is 6 hex');

console.log(`\n${n - fail}/${n} passed`); process.exit(fail ? 1 : 0);
