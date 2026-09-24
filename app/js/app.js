/**
 * Bootstrap — wires engines, registry, router, views.
 */
import store from './core/store.js';
import bus from './core/bus.js';
import registry from './core/registry.js';
import router from './core/router.js';
import initBubbles from './engines/bubbles.js';
import streak from './engines/streak.js';
import hearts from './engines/hearts.js';
import quests from './engines/quests.js';
import badges from './engines/badges.js';
import celebration from './engines/celebration.js';
import companion from './engines/companion.js'; // Phase 17: companion cast data (preloaded below)
import { attachGlobalFeedback, toast } from './ui/components.js';

import * as Home from './ui/views/home.js';
import * as Profile from './ui/views/profile.js';
import * as Play from './ui/views/play.js';
import * as Badges from './ui/views/badges.js';
import * as Quests from './ui/views/quests.js';
import * as Parent from './ui/views/parent.js';
import * as Subject from './ui/views/subject.js';
import * as Certificate from './ui/views/certificate.js';

document.documentElement.setAttribute('data-theme', store.meta.theme || 'light');
bus.on('meta:change', (m) => document.documentElement.setAttribute('data-theme', m.theme || 'light'));

initBubbles('bubbles');

const requireProfile = (view) => ({
  async render(root, params) {
    if (!store.profile) { router.go('/profile', true); return; }
    return view.render(root, params);
  },
});

router
  .add('/home', requireProfile(Home))
  .add('/subject/:id', requireProfile(Subject))
  .add('/play/:id', requireProfile(Play))
  .add('/badges', requireProfile(Badges))
  .add('/quests', requireProfile(Quests))
  .add('/certificate/:id', requireProfile(Certificate))
  .add('/parent', Parent)
  .add('/profile', Profile);

async function boot() {
  try { await registry.load(); } catch (e) { console.error(e); toast('تعذر تحميل المحتوى — تأكد من الاتصال', { type: 'error' }); }
  attachGlobalFeedback();
  quests.init();
  celebration.init(); // Phase 10: stage-completion siren (parent-controlled)
  companion.ready(); // Phase 17: fetch the companion cast once (play mounts synchronously from the cached data)
  bus.on('profile:change', (p) => { if (p) { streak.check(); hearts.regen(); badges.evaluate(registry.items()); } });
  if (store.profile) { streak.check(); hearts.regen(); }
  setInterval(() => hearts.regen(), 30000);
  addEventListener('pagehide', () => store.flush());
  router.start();
  // Phase 6 (Pure-Web): the platform is 100% online on GitHub Pages — no PWA, no offline cache.
  // Forcefully unregister any legacy Service Worker and purge every cache so updates always arrive live.
  purgeLegacyPWA();
}

function purgeLegacyPWA() {
  if (!('serviceWorker' in navigator)) return;
  try {
    let hadSW = false;
    navigator.serviceWorker.getRegistrations().then((regs) => {
      hadSW = regs.length > 0;
      return Promise.all(regs.map((r) => r.unregister()));
    }).then(() => ('caches' in window ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))) : null))
      .then(() => { if (hadSW && !sessionStorage.getItem('pwa-purged')) { sessionStorage.setItem('pwa-purged', '1'); location.reload(); } })
      .catch(() => {});
  } catch { /* ignore */ }
}
boot();
