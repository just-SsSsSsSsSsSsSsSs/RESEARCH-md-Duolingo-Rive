/**
 * Family Challenge Board engine (Phase 19) - the thin store-bound layer over family_core.js.
 * Local-first: reads the three hero profiles from localStorage, keeps relatives («guests») in
 * store.meta.familyGuests, and never talks to a network. Everything comparative is computed by the
 * pure core so it stays unit-checkable.
 */
import store, { HEROES } from '../core/store.js';
import bus from '../core/bus.js';
import * as core from './family_core.js';

export { core };
export const CATEGORIES = core.CATEGORIES;

/** members = heroes (with their saved state) + guests from meta */
export function members() {
  const heroes = store.listProfiles().map(({ hero, state }) => ({
    id: hero.id, name: hero.name, hex: hero.hex, daily: state?.daily || {}, streak: state?.streak?.count ?? 0, guest: false,
  }));
  const guests = (store.meta.familyGuests || []).map((g) => ({ ...g, guest: true }));
  return [...heroes, ...guests];
}

export function board(now = new Date()) { return core.board(members(), now); }

/** family token identifies THIS device's card across re-imports (not a device id, regenerable). */
export function token() {
  if (!store.meta.familyToken) store.setMeta({ familyToken: core.newToken() });
  return store.meta.familyToken;
}

/** export payload for the three heroes of this device only (guests never re-travel). */
export function card(now = new Date()) {
  const heroes = store.listProfiles().filter(({ state }) => state).map(({ hero, state }) => ({ id: hero.id, daily: state.daily }));
  return core.makeCard(token(), heroes, now);
}
export function cardJSON(now = new Date()) { return JSON.stringify(card(now)); }

/** import a card (object or JSON string). Own cards are ignored. Returns {added, updated} or throws. */
export function importCard(input) {
  const c = typeof input === 'string' ? JSON.parse(input) : input;
  if (!core.validCard(c)) throw new Error('invalid');
  if (!core.cardIsClean(c)) throw new Error('unclean');
  if (c.src === store.meta.familyToken) return { added: 0, updated: 0, own: true };
  const res = core.applyCard(c, store.meta.familyGuests || []);
  store.setMeta({ familyGuests: res.guests });
  bus.emit('family:change', { reason: 'import', ...res });
  return res;
}

export function renameGuest(id, name) {
  const list = (store.meta.familyGuests || []).map((g) => (g.id === id ? { ...g, name: String(name || '').slice(0, 24) || g.name } : g));
  store.setMeta({ familyGuests: list }); bus.emit('family:change', { reason: 'rename' });
}
export function removeGuest(id) {
  store.setMeta({ familyGuests: (store.meta.familyGuests || []).filter((g) => g.id !== id) }); bus.emit('family:change', { reason: 'remove' });
}
export function clearGuests() { store.setMeta({ familyGuests: [] }); bus.emit('family:change', { reason: 'clear' }); }

/** weekly celebration flag: fires once per week when the shared quest is reached. */
export function questJustReached(b = board()) {
  if (!b.quest.done) return false;
  if (store.meta.familyQuestWeek === b.weekStart) return false;
  store.setMeta({ familyQuestWeek: b.weekStart });
  return true;
}

/** hero ids known to the store (used by views to load sprites) */
export const heroIds = () => HEROES.map((h) => h.id);

export const familyEngine = { members, board, token, card, cardJSON, importCard, renameGuest, removeGuest, clearGuests, questJustReached, heroIds, core };
export default familyEngine;
