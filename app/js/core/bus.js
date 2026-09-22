/**
 * Event Bus — decoupled pub/sub for all engines & views.
 * Events (non-exhaustive, engines may add more):
 *  profile:change, xp:gain, level:up, streak:update, hearts:change,
 *  badge:earned, quest:progress, quest:done, activity:answer, activity:complete,
 *  store:save, theme:change, sound:toggle
 */
const listeners = new Map();

export const bus = {
  on(evt, fn) {
    if (!listeners.has(evt)) listeners.set(evt, new Set());
    listeners.get(evt).add(fn);
    return () => bus.off(evt, fn);
  },
  once(evt, fn) {
    const off = bus.on(evt, (p) => { off(); fn(p); });
    return off;
  },
  off(evt, fn) { listeners.get(evt)?.delete(fn); },
  emit(evt, payload) {
    listeners.get(evt)?.forEach((fn) => {
      try { fn(payload); } catch (e) { console.error(`[bus:${evt}]`, e); }
    });
    listeners.get('*')?.forEach((fn) => { try { fn(evt, payload); } catch (e) { console.error(e); } });
  },
};
export default bus;
