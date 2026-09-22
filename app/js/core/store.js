/**
 * Store — multi-profile persistent state with schema versioning,
 * debounced save, export/import (JSON), and safe migrations.
 *
 * Layout in localStorage:
 *   abtal:v1:meta      -> { activeId, theme, sound, parentPin, createdAt }
 *   abtal:v1:profile:<id> -> ProfileState
 */
import bus from './bus.js';

const NS = 'abtal';
const VERSION = 1;
const KEY_META = `${NS}:v${VERSION}:meta`;
const keyProfile = (id) => `${NS}:v${VERSION}:profile:${id}`;

export const HEROES = [
  { id: 'selim', name: 'سليم', emoji: 'hero', color: 'var(--hero-selim)', hex: '#22e39b', grade: 'الصف الثالث' },
  { id: 'karma', name: 'كارما', emoji: 'blossom', color: 'var(--hero-karma)', hex: '#ff5c8a', grade: '' },
  { id: 'kenda', name: 'كندة', emoji: 'star', color: 'var(--hero-kenda)', hex: '#19e6ff', grade: '' },
];

export function todayKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultProfile(hero) {
  return {
    schema: VERSION,
    id: hero.id,
    name: hero.name,
    emoji: hero.emoji,
    createdAt: Date.now(),
    xp: 0,
    gems: 0,
    hearts: 5,
    heartsLostAt: null,          // timestamp for regen
    streak: { count: 0, best: 0, lastDay: null, freezes: 1, frozenDays: [] },
    badges: {},                  // { badgeId: earnedTimestamp }
    activities: {},              // { activityId: { plays, best, mastery(0-5), lastPlayed, correct, total } }
    daily: {},                   // { 'YYYY-MM-DD': { xp, minutes, answers, correct, activities:[] } }
    quests: { day: null, list: [] },
    certificates: [],            // [{ id, title, date, xp }]
    counters: { answers: 0, correct: 0, perfect: 0, sessions: 0, bubblesPopped: 0, minutes: 0 },
    settings: { fontScale: 1, difficulty: 'auto' },
  };
}

function safeParse(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function migrate(p) {
  // Future: if (p.schema < 2) {...}
  const base = defaultProfile(HEROES.find((h) => h.id === p.id) || HEROES[0]);
  return deepMerge(base, p);
}

function deepMerge(base, over) {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return over ?? base;
  const out = { ...base };
  for (const k of Object.keys(over || {})) {
    out[k] = (typeof base[k] === 'object' && base[k] && !Array.isArray(base[k])) ? deepMerge(base[k], over[k]) : over[k];
  }
  return out;
}

class Store {
  constructor() {
    this.meta = safeParse(localStorage.getItem(KEY_META), null) || {
      activeId: null, theme: 'dark', sound: true, music: false, parentPin: null, createdAt: Date.now(), reduceBubbles: false,
    };
    this.profile = null;
    this._timer = null;
    if (this.meta.activeId) this.load(this.meta.activeId);
  }

  /* ---- meta ---- */
  saveMeta() { localStorage.setItem(KEY_META, JSON.stringify(this.meta)); }
  setMeta(patch) { Object.assign(this.meta, patch); this.saveMeta(); bus.emit('meta:change', this.meta); }

  /* ---- profiles ---- */
  listProfiles() {
    return HEROES.map((h) => ({ hero: h, state: safeParse(localStorage.getItem(keyProfile(h.id)), null) }));
  }
  load(id) {
    const hero = HEROES.find((h) => h.id === id);
    if (!hero) return null;
    const raw = safeParse(localStorage.getItem(keyProfile(id)), null);
    this.profile = raw ? migrate(raw) : defaultProfile(hero);
    this.meta.activeId = id;
    this.saveMeta();
    this.save(true);
    bus.emit('profile:change', this.profile);
    return this.profile;
  }
  logout() { this.flush(); this.profile = null; this.meta.activeId = null; this.saveMeta(); bus.emit('profile:change', null); }
  get hero() { return HEROES.find((h) => h.id === this.profile?.id) || HEROES[0]; }

  /* ---- persistence (debounced) ---- */
  save(immediate = false) {
    if (!this.profile) return;
    clearTimeout(this._timer);
    const doSave = () => {
      localStorage.setItem(keyProfile(this.profile.id), JSON.stringify(this.profile));
      bus.emit('store:save', this.profile);
    };
    if (immediate) doSave(); else this._timer = setTimeout(doSave, 150);
  }
  flush() { if (this._timer) { clearTimeout(this._timer); this._timer = null; this.save(true); } }

  /* ---- daily bucket ---- */
  today() {
    const k = todayKey();
    const d = this.profile.daily;
    if (!d[k]) d[k] = { xp: 0, minutes: 0, answers: 0, correct: 0, activities: [] };
    // prune > 120 days
    const keys = Object.keys(d).sort();
    while (keys.length > 120) delete d[keys.shift()];
    return d[k];
  }
  lastDays(n = 7) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      const k = todayKey(dt);
      out.push({ key: k, date: dt, ...(this.profile?.daily[k] || { xp: 0, minutes: 0, answers: 0, correct: 0, activities: [] }) });
    }
    return out;
  }

  /* ---- export / import ---- */
  exportAll() {
    const data = { ns: NS, version: VERSION, exportedAt: new Date().toISOString(), meta: this.meta, profiles: {} };
    for (const { hero, state } of this.listProfiles()) if (state) data.profiles[hero.id] = state;
    return JSON.stringify(data, null, 2);
  }
  importAll(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    if (data?.ns !== NS) throw new Error('ملف غير صالح');
    for (const [id, st] of Object.entries(data.profiles || {})) {
      if (HEROES.some((h) => h.id === id)) localStorage.setItem(keyProfile(id), JSON.stringify(migrate(st)));
    }
    if (data.meta) { this.meta = { ...this.meta, ...data.meta }; this.saveMeta(); }
    if (this.meta.activeId) this.load(this.meta.activeId);
    bus.emit('store:import');
  }
  resetProfile(id) {
    localStorage.removeItem(keyProfile(id));
    if (this.profile?.id === id) this.load(id);
  }
  wipeAll() {
    Object.keys(localStorage).filter((k) => k.startsWith(`${NS}:`)).forEach((k) => localStorage.removeItem(k));
    location.reload();
  }
}

export const store = new Store();
export default store;
