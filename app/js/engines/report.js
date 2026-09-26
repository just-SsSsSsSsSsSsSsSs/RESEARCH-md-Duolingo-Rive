/**
 * Parent Weekly Report engine (Phase 20) - store-bound layer over report_core.js.
 * Reads the three hero profiles (daily buckets + raw telemetry events) and the Phase 19 family board,
 * computes each child's weekly report at read time, keeps an aggregates-only archive of the last 8 weeks
 * in store.meta.parentReports, and tracks whether the parent has opened this week's report.
 * Local-first: nothing leaves the device unless the parent explicitly shares.
 */
import store from '../core/store.js';
import bus from '../core/bus.js';
import { members, board as familyBoard } from './family.js';
import * as core from './report_core.js';

export { core };

const profileOf = (id) => store.listProfiles().find((p) => p.hero.id === id)?.state || null;

/** report for one hero (or guest: guests have no events, so skills/slots are empty) */
export function report(heroId, now = new Date()) {
  const b = familyBoard(now);
  const m = members().find((x) => x.id === heroId); if (!m) return null;
  const events = m.guest ? [] : (profileOf(heroId)?.events || []);
  return core.weekReport(m, events, b, now);
}

/** reports for the three heroes that exist on this device (guests excluded from the parent report) */
export function reports(now = new Date()) {
  const b = familyBoard(now);
  return members().filter((m) => !m.guest && profileOf(m.id)).map((m) => core.weekReport(m, profileOf(m.id)?.events || [], b, now));
}

export function summary(now = new Date()) { return core.familySummary(reports(now), familyBoard(now)); }

/* ---- archive (aggregates only) ---- */
export function archive() { const a = store.meta.parentReports; return core.archiveClean(a) ? a : []; }
export function archiveWeek(now = new Date()) {
  let list = archive();
  for (const r of reports(now)) if (r.week.answers || r.week.minutes) list = core.archiveMerge(list, core.snapshot(r));
  if (JSON.stringify(list) !== JSON.stringify(store.meta.parentReports || [])) store.setMeta({ parentReports: list });
  return list;
}
export const history = (heroId) => archive().filter((s) => s.id === heroId);

/* ---- freshness: a new week started and the parent has not opened the report yet ---- */
export const weekKey = (now = new Date()) => core.weekWindow(now).startKey;
export function isFresh(now = new Date()) {
  const any = reports(now).some((r) => r.week.answers || r.prev.answers);
  return any && store.meta.reportSeenWeek !== weekKey(now);
}
export function markSeen(now = new Date()) {
  if (store.meta.reportSeenWeek === weekKey(now)) return;
  store.setMeta({ reportSeenWeek: weekKey(now) }); bus.emit('report:seen', { week: weekKey(now) });
}

export const text = (heroId, now = new Date()) => { const r = report(heroId, now); return r ? core.reportText(r) : ''; };

export const reportEngine = { report, reports, summary, archive, archiveWeek, history, weekKey, isFresh, markSeen, text, core };
export default reportEngine;
