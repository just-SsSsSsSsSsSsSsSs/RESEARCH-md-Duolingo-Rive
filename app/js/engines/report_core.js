/**
 * Parent Weekly Report - pure core (Phase 20). No store, no DOM, no network.
 * Input: a family_core member ({id, name, hex, daily}) + that child's raw telemetry events + the family board.
 * Output: one improvement-framed report per child (Kraft & Rogers 2015: one individualised sentence a week,
 * about what to improve next) with data-driven conversation starters (Kraft & Bolves 2022), plus a family
 * summary that never ranks the siblings, an 8-week archive merge (aggregates only) and a plain-text renderer.
 */
import { CATEGORIES, dayKey, weekStart, weekKeys, normDaily, sumDays } from './family_core.js';

export const ARCHIVE_MAX = 8;
export const MIN_SKILL_N = 3;
const AR = (n) => new Intl.NumberFormat('ar-EG').format(n);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export const SLOTS = [
  { id: 'morning', name: 'الصبح', test: (h) => h >= 5 && h < 12 },
  { id: 'afternoon', name: 'بعد المدرسة', test: (h) => h >= 12 && h < 17 },
  { id: 'evening', name: 'بالليل', test: (h) => h >= 17 || h < 5 },
];

/* ------------------------------------------------------------------ week */
export function weekWindow(now = new Date()) {
  const start = weekStart(now); const end = new Date(start); end.setDate(start.getDate() + 7);
  const prevStart = new Date(start); prevStart.setDate(start.getDate() - 7);
  return { start, end, prevStart, keys: weekKeys(start), prevKeys: weekKeys(prevStart), startKey: dayKey(start) };
}
const inRange = (e, a, b) => e && typeof e.t === 'number' && e.t >= a.getTime() && e.t < b.getTime();

/* ---------------------------------------------------------------- skills */
/** per-skill stats from question_attempted events of one window */
export function skillStats(events) {
  const m = new Map();
  for (const e of events) {
    if (e.type !== 'question_attempted') continue;
    const k = e.skill || 'عام'; const s = m.get(k) || { skill: k, n: 0, correct: 0, recovered: 0, subject: e.subject || '' };
    s.n++; if (e.correct) s.correct++; if (e.correct && e.retried) s.recovered++; m.set(k, s);
  }
  return [...m.values()].map((s) => ({ ...s, rate: s.n ? s.correct / s.n : 0 })).sort((a, b) => a.rate - b.rate || b.n - a.n);
}

/** hour histogram -> the slot where the child answered most accurately (min 4 attempts) */
export function bestSlot(events) {
  const att = events.filter((e) => e.type === 'question_attempted' && typeof e.hour === 'number');
  const rows = SLOTS.map((s) => { const l = att.filter((e) => s.test(e.hour)); return { ...s, n: l.length, rate: l.length ? l.filter((e) => e.correct).length / l.length : 0 }; });
  const ok = rows.filter((r) => r.n >= 4).sort((a, b) => b.rate - a.rate || b.n - a.n);
  return ok[0] ? { id: ok[0].id, name: ok[0].name, n: ok[0].n, rate: Math.round(ok[0].rate * 100) } : null;
}

/* --------------------------------------------------------------- headline */
/**
 * One sentence, improvement-framed, always ending with the next step.
 * kind: first | improved | steady | dipped | quiet
 */
export function headline(name, week, prev, weak) {
  const next = weak ? `الخطوة الجاية: ${weak.skill}` : 'الخطوة الجاية: يكمّل على نفس الوتيرة';
  if (!week.answers && !week.minutes) return { kind: 'quiet', text: `${name} ما لعبش الاسبوع ده. ابدأوا بدرس واحد قصير سوا، ${next.toLowerCase()}` };
  if (!prev.answers) return { kind: 'first', text: `اول اسبوع لـ${name}: ${AR(week.correct)} اجابة صحيحة في ${AR(week.activeDays)} ايام. ${next}` };
  const d = week.correct - prev.correct;
  if (d > 0 && d >= Math.max(2, Math.round(prev.correct * 0.1))) return { kind: 'improved', text: `${name} زاد ${AR(d)} اجابة صحيحة عن الاسبوع اللي فات (${AR(prev.correct)} -> ${AR(week.correct)}). ${next}` };
  if (d < 0 && -d >= Math.max(2, Math.round(prev.correct * 0.1))) return { kind: 'dipped', text: `${name} حل اقل من الاسبوع اللي فات (${AR(prev.correct)} -> ${AR(week.correct)})، ده طبيعي في اسبوع مشغول. ${next}` };
  return { kind: 'steady', text: `${name} ثابت على مستواه (${AR(week.correct)} اجابة صحيحة). ${next}` };
}

/* --------------------------------------------------------- starters/tips */
const TIPS = {
  default: 'خمس دقايق قبل النوم على نفس النوع من الاسئلة، بصوت عالي، من غير عجلة',
  math: 'استخدموا حاجات البيت (ملاعق، اكواب) وحلوا ٣ امثلة سوا بصوت عالي',
  arabic: 'اقرؤوا سطرين بصوت عالي واسأله يعيدهم بكلامه',
  quran: 'اسمعوا الآية مرتين ورددها معه قبل ما يحلها',
  science: 'اسأله «ليه بتفتكر؟» قبل ما يجاوب، وخلّيه يشرح لك',
};
export function tipFor(skill) { return TIPS[skill?.subject] || TIPS.default; }

/** three questions for the dinner table, each grounded in a real number from this week */
export function starters(name, week, skills, board, heroId) {
  const out = [];
  const rec = skills.filter((s) => s.recovered > 0).sort((a, b) => b.recovered - a.recovered)[0];
  if (rec) out.push({ id: 'recovered', text: `اسأل ${name} يشرح لك ازاي صحّح غلطته في «${rec.skill}»، غلط مرة ورجع حلّها صح ${AR(rec.recovered)} ${rec.recovered === 1 ? 'مرة' : 'مرات'}` });
  const strong = skills.filter((s) => s.n >= MIN_SKILL_N && s.rate >= 0.85).sort((a, b) => b.rate - a.rate || b.n - a.n)[0];
  if (strong) out.push({ id: 'strong', text: `قول لـ${name}: «سمعت انك بقيت شاطر في ${strong.skill}، علّمني واحدة» (${AR(strong.correct)} من ${AR(strong.n)} صح)` });
  if (week.bestDay) out.push({ id: 'bestday', text: `يوم ${week.bestDay.label} كان احسن يوم لـ${name} (${AR(week.bestDay.correct)} اجابة صحيحة). اسأله ايه اللي كان مختلف في اليوم ده` });
  const tile = board?.tiles?.find((t) => t.id === heroId);
  if (tile?.crowns?.length) { const c = CATEGORIES.find((x) => x.id === tile.crowns[0]); out.push({ id: 'crown', text: `${name} خد تاج «${c.name}» في لوحة العيلة الاسبوع ده. اسأله يحكي لك ايه معناه` }); }
  if (board?.quest) out.push({ id: 'quest', text: board.quest.done ? `العيلة وصلت لهدف الاسبوع سوا (${AR(board.quest.target)} اجابة صحيحة). احكوا مع بعض مين ضاف ايه` : `تحدي العيلة على ${AR(board.quest.progress)} من ${AR(board.quest.target)}. اسأل ${name}: «هنكمّل الباقي ازاي سوا؟»` });
  if (week.activeDays) out.push({ id: 'days', text: `${name} فتح التطبيق ${AR(week.activeDays)} ${week.activeDays === 1 ? 'يوم' : 'ايام'} الاسبوع ده. اسأله ايه اللي عجبه اكتر` });
  return out.slice(0, 3);
}

/* --------------------------------------------------------------- report */
const DAY_NAMES = ['الاحد', 'الاتنين', 'التلات', 'الاربع', 'الخميس', 'الجمعة', 'السبت'];
function weekSummary(daily, keys) {
  const s = sumDays(daily, keys); let best = null;
  for (const k of keys) { const b = daily[k]; if (b && b.correct > (best?.correct || 0)) { const [y, m, d] = k.split('-').map(Number); best = { key: k, correct: b.correct, label: DAY_NAMES[new Date(y, m - 1, d).getDay()] }; } }
  return { ...s, accuracy: pct(s.correct, s.answers), bestDay: best };
}

/**
 * weekReport(member, events, board, now) -> report for the week containing `now`.
 * events: that child's raw telemetry (any range; filtered here).
 */
export function weekReport(member, events = [], board = null, now = new Date()) {
  const w = weekWindow(now);
  const daily = normDaily(member.daily);
  const week = weekSummary(daily, w.keys), prev = weekSummary(daily, w.prevKeys);
  const evWeek = (events || []).filter((e) => inRange(e, w.start, w.end));
  const skills = skillStats(evWeek);
  const weak = skills.find((s) => s.n >= MIN_SKILL_N && s.rate < 0.8) || null;
  const strong = [...skills].filter((s) => s.n >= MIN_SKILL_N && s.rate >= 0.85).sort((a, b) => b.rate - a.rate || b.n - a.n)[0] || null;
  const deltas = {
    correct: week.correct - prev.correct, answers: week.answers - prev.answers, minutes: week.minutes - prev.minutes,
    activeDays: week.activeDays - prev.activeDays, accuracy: week.accuracy - prev.accuracy, recovered: week.recovered - prev.recovered,
  };
  const tile = board?.tiles?.find((t) => t.id === member.id) || null;
  return {
    id: member.id, name: member.name, hex: member.hex, weekStart: w.startKey,
    week, prev, deltas, headline: headline(member.name, week, prev, weak),
    slot: bestSlot(evWeek), weak, strong, tip: weak ? tipFor(weak) : null,
    starters: starters(member.name, week, skills, board, member.id),
    nextFocus: weak ? weak.skill : strong ? `يثبّت ${strong.skill} ويجرّب مستوى اعلى` : 'درس قصير كل يوم',
    crowns: tile?.crowns || [], questShare: board?.quest?.progress ? pct(week.correct, board.quest.progress) : 0,
    skillsN: skills.length,
  };
}

/** the three (or more) children together: totals, quest, crown of the week - no ordering by score */
export function familySummary(reports, board) {
  const tot = reports.reduce((a, r) => ({ correct: a.correct + r.week.correct, minutes: a.minutes + r.week.minutes, recovered: a.recovered + r.week.recovered, active: a.active + (r.week.answers ? 1 : 0) }), { correct: 0, minutes: 0, recovered: 0, active: 0 });
  const headlineCat = board?.headline || null;
  const leaders = board ? board.tiles.filter((t) => t.leads).map((t) => t.name) : [];
  const line = !tot.correct ? 'اسبوع هادي للعيلة كلها، درس واحد سوا يفتح الاسبوع الجاي'
    : board?.quest?.done ? `العيلة حققت تحدي الاسبوع سوا: ${AR(tot.correct)} اجابة صحيحة و${AR(tot.recovered)} غلطة اتصلحت بايديهم`
    : `العيلة حلّت ${AR(tot.correct)} اجابة صحيحة سوا في ${AR(tot.minutes)} دقيقة، وصلّحت ${AR(tot.recovered)} غلطة`;
  return { weekStart: reports[0]?.weekStart || (board?.weekStart ?? ''), totals: tot, quest: board?.quest || null, headline: headlineCat, leaders, line, members: reports.map((r) => ({ id: r.id, name: r.name, hex: r.hex, correct: r.week.correct, minutes: r.week.minutes, kind: r.headline.kind, crowns: r.crowns })) };
}

/* -------------------------------------------------------------- archive */
/** aggregates only - never question keys or event payloads */
export function snapshot(report) {
  return { w: report.weekStart, id: report.id, c: report.week.correct, a: report.week.answers, m: report.week.minutes, d: report.week.activeDays, r: report.week.recovered, k: report.headline.kind };
}
/** idempotent by (week, id); newest last; capped at ARCHIVE_MAX weeks per child */
export function archiveMerge(list = [], snap, max = ARCHIVE_MAX) {
  const out = (list || []).filter((s) => !(s.w === snap.w && s.id === snap.id)); out.push(snap);
  out.sort((x, y) => (x.w < y.w ? -1 : x.w > y.w ? 1 : 0));
  const mine = out.filter((s) => s.id === snap.id); while (mine.length > max) { const drop = mine.shift(); out.splice(out.indexOf(drop), 1); }
  return out;
}
export function archiveClean(list) {
  const allowed = new Set(['w', 'id', 'c', 'a', 'm', 'd', 'r', 'k']);
  return Array.isArray(list) && list.every((s) => s && typeof s === 'object' && Object.keys(s).every((k) => allowed.has(k)) && /^\d{4}-\d{2}-\d{2}$/.test(s.w));
}

/* ----------------------------------------------------------------- text */
const arrow = (d) => (d > 0 ? `+${AR(d)}` : d < 0 ? `-${AR(-d)}` : 'زي ما هو');
export function reportText(r) {
  const L = [
    `تقرير ${r.name} - اسبوع ${r.weekStart}`, r.headline.text, '',
    `اجابات صحيحة: ${AR(r.week.correct)} (${arrow(r.deltas.correct)} عن الاسبوع اللي فات)`,
    `دقائق تعلم: ${AR(r.week.minutes)} (${arrow(r.deltas.minutes)})`,
    `ايام نشطة: ${AR(r.week.activeDays)} من ٧ (${arrow(r.deltas.activeDays)})`,
    `الدقة: ${AR(r.week.accuracy)}٪ (${arrow(r.deltas.accuracy)})`,
    `غلطات صحّحها بنفسه: ${AR(r.week.recovered)}`,
  ];
  if (r.slot) L.push(`احسن وقت له: ${r.slot.name} (دقة ${AR(r.slot.rate)}٪)`);
  if (r.strong) L.push(`نقطة قوة: ${r.strong.skill}`);
  if (r.weak) L.push(`محتاج تركيز: ${r.weak.skill} - ${r.tip}`);
  L.push(`التركيز الجاي: ${r.nextFocus}`);
  if (r.starters.length) { L.push('', 'اسئلة على السفرة:'); r.starters.forEach((s, i) => L.push(`${AR(i + 1)}. ${s.text}`)); }
  return L.join('\n');
}
