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
import { attachGlobalFeedback, toast } from './ui/components.js';

import * as Home from './ui/views/home.js';
import * as Profile from './ui/views/profile.js';
import * as Play from './ui/views/play.js';
import * as Badges from './ui/views/badges.js';
import * as Quests from './ui/views/quests.js';
import * as Parent from './ui/views/parent.js';
import * as Subject from './ui/views/subject.js';
import * as Certificate from './ui/views/certificate.js';

document.documentElement.setAttribute('data-theme', store.meta.theme || 'dark');
bus.on('meta:change', (m) => document.documentElement.setAttribute('data-theme', m.theme || 'dark'));

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
  bus.on('profile:change', (p) => { if (p) { streak.check(); hearts.regen(); badges.evaluate(registry.items()); } });
  if (store.profile) { streak.check(); hearts.regen(); }
  setInterval(() => hearts.regen(), 30000);
  addEventListener('pagehide', () => store.flush());
  router.start();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch(() => {});
  }
}
boot();
