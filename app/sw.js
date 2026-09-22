/* Service Worker — offline-first for app shell; network-first for content JSON (fallback cache). */
const VERSION = 'abtal-v1.0.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './assets/icon.svg',
  './css/tokens.css', './css/base.css', './css/components.css',
  './js/app.js', './js/core/bus.js', './js/core/store.js', './js/core/registry.js', './js/core/router.js',
  './js/engines/sound.js', './js/engines/bubbles.js', './js/engines/xp.js', './js/engines/streak.js', './js/engines/hearts.js', './js/engines/badges.js', './js/engines/quests.js',
  './js/activities/session.js', './js/activities/generators.js', './js/activities/renderers.js',
  './js/ui/icons.js', './js/ui/components.js',
  './js/ui/views/home.js', './js/ui/views/profile.js', './js/ui/views/subject.js', './js/ui/views/play.js', './js/ui/views/badges.js', './js/ui/views/quests.js', './js/ui/views/parent.js', './js/ui/views/certificate.js',
  './content/catalog.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    // fonts: cache-first
    if (/fonts\.(googleapis|gstatic)\.com/.test(url.host)) e.respondWith(caches.open(VERSION + '-fonts').then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => new Response('', { status: 504 }))));
    return;
  }
  if (url.pathname.includes('/content/')) {
    // network-first for content
    e.respondWith(fetch(req).then((r) => { if (r.ok) caches.open(VERSION).then((c) => c.put(req, r.clone())); return r; }).catch(() => caches.match(req)));
    return;
  }
  // shell: cache-first, revalidate in background
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((r) => { if (r.ok) caches.open(VERSION).then((c) => c.put(req, r.clone())); return r; }).catch(() => hit);
    return hit || net;
  }));
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });
