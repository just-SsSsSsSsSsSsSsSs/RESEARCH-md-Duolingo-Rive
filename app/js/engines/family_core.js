/**
 * Family Challenge Board - pure core (Phase 19).
 * No store, no DOM, no network: every function here takes plain data and returns plain data,
 * so the maths can be unit-checked under node and the UI stays a thin layer.
 *
 * Fairness contract (frozen in PROGRESS.md / RESEARCH.md appendix):
 *  - nobody is ranked numerically and nobody is «last»;
 *  - the headline metric is ipsative: growth of THIS week's correct answers vs the child's own
 *    trailing 4-week average (min baseline 5), so the youngest can lead by improving more;
 *  - four categories (growth / streak / recovered / minutes) each crown their own winner(s);
 *    the headline category rotates with the ISO week so a different strength is celebrated weekly;
 *  - one cooperative family quest (correct answers together) whose target scales with the family.
 */

export const CATEGORIES = [
  { id: 'growth', name: 'نمو', title: 'اكبر تقدم على رقمه القديم', unit: '%', icon: 'chart' },
  { id: 'streak', name: 'مثابرة', title: 'اطول سلسلة ايام', unit: 'يوم', icon: 'flame' },
  { id: 'recovered', name: 'تصحيح', title: 'اكثر اخطاء صححها بنفسه', unit: 'سؤال', icon: 'refresh' },
  { id: 'minutes', name: 'وقت', title: 'اكثر دقائق تعلم', unit: 'دقيقة', icon: 'clock' },
];

export const MIN_BASELINE = 5;
export const QUEST_PER_HERO = 100;
export const QUEST_MIN = 150;
export const CARD_KIND = 'abtal-family-card';
export const CARD_DAYS = 35; // 5 weeks: current + 4 baseline weeks
const DAY = 86400000;

/* ------------------------------------------------------------------ dates */
export function dayKey(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
/** Saturday 00:00 local that starts the school week containing `d` (Egypt: Sat..Fri). */
export function weekStart(d = new Date()) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 1) % 7));
  return s;
}
export function weekKeys(start) { const out = []; for (let i = 0; i < 7; i++) { const x = new Date(start); x.setDate(start.getDate() + i); out.push(dayKey(x)); } return out; }
/** ISO-8601 week number (used only to rotate the headline category). */
export function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / DAY + 1) / 7);
}
export function headlineCategory(d = new Date()) { return CATEGORIES[isoWeek(d) % CATEGORIES.length]; }

/* ---------------------------------------------------------------- buckets */
const EMPTY = () => ({ answers: 0, correct: 0, xp: 0, minutes: 0, recovered: 0 });
/** Normalise a daily map ({date: {xp,minutes,answers,correct,recovered}} or card short form {a,c,x,m,r}). */
export function normDaily(daily = {}) {
  const out = {};
  for (const [k, v] of Object.entries(daily || {})) {
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    out[k] = {
      answers: +(v.answers ?? v.a ?? 0) || 0, correct: +(v.correct ?? v.c ?? 0) || 0,
      xp: +(v.xp ?? v.x ?? 0) || 0, minutes: +(v.minutes ?? v.m ?? 0) || 0, recovered: +(v.recovered ?? v.r ?? 0) || 0,
    };
  }
  return out;
}
export function sumDays(daily, keys) {
  const t = EMPTY(); let active = 0;
  for (const k of keys) { const b = daily[k]; if (!b) continue; if (b.answers > 0 || b.minutes > 0) active++; for (const f of Object.keys(t)) t[f] += b[f] || 0; }
  return { ...t, activeDays: active };
}
/** consecutive active days ending today or yesterday (guests have no streak object). */
export function streakFrom(daily, now = new Date()) {
  let n = 0; const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!(daily[dayKey(d)]?.answers > 0)) d.setDate(d.getDate() - 1);
  while (daily[dayKey(d)]?.answers > 0) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------------------------------------------------------------- metrics */
/**
 * member = { id, name, hex, daily, streak? , guest? }
 * returns per-member metrics for the week that contains `now`.
 */
export function memberMetrics(member, now = new Date()) {
  const daily = normDaily(member.daily);
  const start = weekStart(now);
  const week = sumDays(daily, weekKeys(start));
  const prev = [];
  for (let w = 1; w <= 4; w++) { const s = new Date(start); s.setDate(start.getDate() - 7 * w); prev.push(sumDays(daily, weekKeys(s)).correct); }
  const activePrev = prev.filter((c) => c > 0);
  const firstWeek = activePrev.length === 0;
  const baseline = firstWeek ? 0 : Math.max(MIN_BASELINE, activePrev.reduce((a, b) => a + b, 0) / activePrev.length);
  const growth = firstWeek ? null : Math.round(((week.correct - baseline) / baseline) * 100);
  const streak = typeof member.streak === 'number' ? member.streak : (member.streak?.count ?? streakFrom(daily, now));
  const accuracy = week.answers ? Math.round((week.correct / week.answers) * 100) : 0;
  // personal best day (by correct) this week - the «beat your own record» line
  let bestDay = null;
  for (const k of weekKeys(start)) { const b = daily[k]; if (b && b.correct > (bestDay?.correct || 0)) bestDay = { key: k, correct: b.correct }; }
  return {
    id: member.id, name: member.name, hex: member.hex, guest: !!member.guest,
    week, prevCorrect: prev, baseline: Math.round(baseline), firstWeek, growth, streak, accuracy, bestDay,
    active: week.answers > 0 || week.minutes > 0,
    values: { growth: growth == null ? 0 : Math.max(0, growth), streak, recovered: week.recovered, minutes: week.minutes },
  };
}

/** winners per category: every member sharing the max positive value wears the crown (ties = co-winners). */
export function crowns(metrics) {
  const out = {};
  for (const c of CATEGORIES) {
    const max = Math.max(0, ...metrics.map((m) => m.values[c.id] || 0));
    out[c.id] = max > 0 ? metrics.filter((m) => (m.values[c.id] || 0) === max).map((m) => m.id) : [];
  }
  return out;
}

/** cooperative family quest for the week (correct answers together). */
export function familyQuest(metrics) {
  const activeHeroes = metrics.filter((m) => m.active).length;
  const target = Math.max(QUEST_MIN, QUEST_PER_HERO * activeHeroes);
  const progress = metrics.reduce((a, m) => a + m.week.correct, 0);
  return { target, progress, pct: Math.min(100, Math.round((progress / target) * 100)), done: progress >= target, contributors: metrics.filter((m) => m.week.correct > 0).length };
}

/** one honest, positive line per member - never a comparison with a sibling. */
export function personalLine(m) {
  if (!m.active) return 'الاسبوع لسه في اوله، اول درس يفتح اللوحة';
  if (m.firstWeek) return `اول اسبوع: ${m.week.correct} اجابة صحيحة، ده رقمك اللي هتكسره الاسبوع الجاي`;
  if (m.growth > 0) return `كسرت رقمك القديم بنسبة ${m.growth}% (كان ${m.baseline} وبقى ${m.week.correct})`;
  if (m.growth === 0) return `عدلت رقمك القديم بالظبط: ${m.week.correct} اجابة صحيحة`;
  const left = Math.max(1, m.baseline - m.week.correct);
  return `باقي ${left} اجابة صحيحة وتوصل لرقمك القديم (${m.baseline})`;
}

/**
 * Board snapshot. `members` = heroes + guests as {id,name,hex,daily,streak,guest}.
 * Tile order: the headline-category winner(s) first (they «lead» this week), then the others in the
 * order given (fixed family order), so there is never a computed «last» position.
 */
export function board(members, now = new Date()) {
  const metrics = members.map((m) => memberMetrics(m, now));
  const cr = crowns(metrics);
  const headline = headlineCategory(now);
  const lead = new Set(cr[headline.id]);
  const order = [...metrics.filter((m) => lead.has(m.id)), ...metrics.filter((m) => !lead.has(m.id))];
  return {
    weekStart: dayKey(weekStart(now)), isoWeek: isoWeek(now), headline, crowns: cr, quest: familyQuest(metrics),
    tiles: order.map((m) => ({ ...m, crowns: CATEGORIES.filter((c) => cr[c.id].includes(m.id)).map((c) => c.id), line: personalLine(m), leads: lead.has(m.id) })),
  };
}

/* ------------------------------------------------------------ family card */
/** Random 6-hex family token (not a device id; regenerated on demand) so re-imports merge into the same guests. */
export function newToken(rnd = Math.random) { return Array.from({ length: 6 }, () => Math.floor(rnd() * 16).toString(16)).join(''); }

/**
 * Build the share payload: hero ids + day-level buckets only (short keys), last CARD_DAYS days.
 * No names, no free text, no device information.
 */
export function makeCard(src, heroes, now = new Date()) {
  const min = dayKey(new Date(now.getTime() - CARD_DAYS * DAY));
  const members = [];
  for (const h of heroes) {
    const daily = normDaily(h.daily); const days = {};
    for (const [k, b] of Object.entries(daily)) if (k >= min && (b.answers || b.minutes)) days[k] = { a: b.answers, c: b.correct, x: b.xp, m: b.minutes, r: b.recovered };
    if (Object.keys(days).length) members.push({ k: String(h.id).slice(0, 16), days });
  }
  return { v: 1, kind: CARD_KIND, src: String(src).slice(0, 12), week: dayKey(weekStart(now)), heroes: members };
}

export function validCard(c) {
  return !!c && c.kind === CARD_KIND && c.v === 1 && typeof c.src === 'string' && /^[0-9a-f]{4,12}$/.test(c.src)
    && Array.isArray(c.heroes) && c.heroes.every((h) => h && typeof h.k === 'string' && /^[a-z0-9_-]{1,16}$/i.test(h.k) && h.days && typeof h.days === 'object');
}

/** monotonic merge: per day, per field, keep the max (import can only add, never erase). */
export function mergeDaily(base = {}, incoming = {}) {
  const out = { ...normDaily(base) }; const inc = normDaily(incoming);
  for (const [k, b] of Object.entries(inc)) {
    const cur = out[k] || EMPTY();
    out[k] = { answers: Math.max(cur.answers, b.answers), correct: Math.max(cur.correct, b.correct), xp: Math.max(cur.xp, b.xp), minutes: Math.max(cur.minutes, b.minutes), recovered: Math.max(cur.recovered, b.recovered) };
  }
  return out;
}

/**
 * Apply a card to a guest list: guests are keyed by src+k; a new guest gets a neutral local label
 * («ضيف N») that the parent may rename locally (the label never travels in a card).
 * Returns { guests, added, updated } - pure, no mutation of the input.
 */
export function applyCard(card, guests = [], palette = ['#a78bfa', '#f59e0b', '#34d399', '#f472b6', '#60a5fa', '#fb7185']) {
  if (!validCard(card)) throw new Error('invalid card');
  const next = guests.map((g) => ({ ...g, daily: { ...(g.daily || {}) } }));
  let added = 0, updated = 0;
  for (const h of card.heroes) {
    const gid = `g_${card.src}_${h.k}`.toLowerCase();
    let g = next.find((x) => x.id === gid);
    if (!g) { g = { id: gid, name: `ضيف ${next.length + 1}`, hex: palette[next.length % palette.length], src: card.src, k: h.k, guest: true, daily: {} }; next.push(g); added++; }
    else updated++;
    g.daily = mergeDaily(g.daily, h.days);
    // keep guests light: at most CARD_DAYS*2 days
    const keys = Object.keys(g.daily).sort(); while (keys.length > CARD_DAYS * 2) delete g.daily[keys.shift()];
  }
  return { guests: next, added, updated };
}

/** Does a serialised card leak anything beyond the whitelist? (used by tests and before sharing) */
export function cardIsClean(json) {
  const allowed = new Set(['v', 'kind', 'src', 'week', 'heroes', 'k', 'days', 'a', 'c', 'x', 'm', 'r']);
  const walk = (o) => {
    if (Array.isArray(o)) return o.every(walk);
    if (o && typeof o === 'object') return Object.entries(o).every(([key, v]) => (allowed.has(key) || /^\d{4}-\d{2}-\d{2}$/.test(key)) && walk(v));
    return typeof o === 'number' || typeof o === 'string';
  };
  try { return walk(typeof json === 'string' ? JSON.parse(json) : json); } catch { return false; }
}
