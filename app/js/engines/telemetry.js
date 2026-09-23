/**
 * Telemetry - privacy-first, on-device learning events (feeds insights.js).
 *
 * Stored in profile.events[] (ring buffer, MAX events) - never leaves the device except inside the
 * parent's own JSON backup. No free text from the child is stored; only structured fields.
 *
 * Event shapes (all carry { t: epoch_ms, type, act, subject }):
 *   question_shown        { key, skill, qtype }
 *   question_attempted    { key, skill, qtype, correct, attempts, time_ms, first_ms, wrong_value?, expected?, pos, session_ms, hour, after_explain? }
 *   explanation_requested { key, skill, strategy, nth }
 *   explanation_result    { key, skill, strategy, solved }           // did the child answer correctly after this strategy?
 *   stage_completed       { score, perfect, aborted, duration_ms, total, correct }
 *   session_quit          { pos, total }
 */
import store from '../core/store.js';
import bus from '../core/bus.js';

export const MAX_EVENTS = 3000;

function list() {
  const p = store.profile; if (!p) return null;
  if (!Array.isArray(p.events)) p.events = [];
  return p.events;
}

export const telemetry = {
  /** append an event (structured only) */
  log(type, data = {}) {
    const ev = list(); if (!ev) return null;
    const e = { t: Date.now(), type, ...data };
    ev.push(e);
    if (ev.length > MAX_EVENTS) ev.splice(0, ev.length - MAX_EVENTS);
    store.save();
    bus.emit('telemetry:event', e);
    return e;
  },
  /** all events (optionally filtered) */
  all(filter) { const ev = list() || []; return filter ? ev.filter(filter) : ev; },
  /** events of a type since ts */
  since(ts, type) { return this.all((e) => e.t >= ts && (!type || e.type === type)); },
  /** clear all events of the active profile (parent action) */
  clear() { const p = store.profile; if (p) { p.events = []; store.save(true); } },
  /** rough byte size for the parent privacy panel */
  bytes() { try { return JSON.stringify(list() || []).length; } catch { return 0; } },
};

/** per-question stopwatch helper used by Session */
export function stopwatch() {
  const shownAt = Date.now(); let firstAt = 0, attempts = 0;
  return {
    shownAt,
    touch() { if (!firstAt) firstAt = Date.now(); },
    attempt() { attempts++; this.touch(); return attempts; },
    get attempts() { return attempts; },
    snapshot() { const now = Date.now(); return { time_ms: now - shownAt, first_ms: firstAt ? firstAt - shownAt : now - shownAt, attempts: Math.max(1, attempts) }; },
  };
}

export default telemetry;
