/**
 * Hash Router — #/home, #/play/:id, #/badges, #/parent, #/profile, #/subject/:id
 * Each view: { render(root, params) => cleanup?() }
 */
import bus from './bus.js';

const routes = new Map();
let current = { cleanup: null, path: null };

export const router = {
  add(pattern, view) { routes.set(pattern, view); return router; },
  go(path, replace = false) {
    const url = '#' + (path.startsWith('/') ? path : '/' + path);
    if (replace) history.replaceState(null, '', url); else location.hash = url;
    if (replace) router.resolve();
  },
  back() { if (history.length > 1) history.back(); else router.go('/home'); },
  parse() {
    const raw = (location.hash || '#/').slice(1) || '/';
    const [pathPart, qs] = raw.split('?');
    const segs = pathPart.split('/').filter(Boolean);
    const query = Object.fromEntries(new URLSearchParams(qs || ''));
    return { segs, query, path: '/' + segs.join('/') };
  },
  match({ segs }) {
    for (const [pattern, view] of routes) {
      const p = pattern.split('/').filter(Boolean);
      if (p.length !== segs.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < p.length; i++) {
        if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(segs[i]);
        else if (p[i] !== segs[i]) { ok = false; break; }
      }
      if (ok) return { view, params };
    }
    return null;
  },
  async resolve() {
    const root = document.getElementById('app');
    const info = router.parse();
    if (info.segs.length === 0) return router.go('/home', true);
    const m = router.match(info);
    if (!m) return router.go('/home', true);
    try { current.cleanup?.(); } catch (e) { console.error(e); }
    current = { cleanup: null, path: info.path };
    window.scrollTo({ top: 0, behavior: 'instant' });
    root.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'view container';
    root.appendChild(el);
    try {
      const cleanup = await m.view.render(el, { ...m.params, ...info.query });
      if (typeof cleanup === 'function') current.cleanup = cleanup;
      // K1: hoist the fixed bottom nav out of the animated .view (its transform animation would otherwise
      // become the nav's containing block, pinning the bar to the *content* bottom and covering the last card)
      const navEl = el.querySelector(':scope > .nav'); if (navEl) root.appendChild(navEl);
    } catch (e) {
      if (!e?.friendly) console.error(e);
      el.innerHTML = `<div class="card center"><div style="font-size:48px">😵</div><h2>حصلت مشكلة</h2><p class="muted">${e.message || e}</p><button class="btn btn-primary mt-4" onclick="location.hash='#/home'">الرئيسية</button></div>`;
    }
    bus.emit('route:change', info);
  },
  start() {
    window.addEventListener('hashchange', router.resolve);
    router.resolve();
  },
  get path() { return current.path; },
};
export default router;
