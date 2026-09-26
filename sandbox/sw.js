/*
 * sandbox/sw.js - path C step (a): Service Worker prototype, scope = /sandbox/ only.
 * It never controls the app (app/ has its own purgeLegacyPWA boot step, which is
 * out of scope here and recorded as a Gate 5 decision in RESEARCH.md D4).
 *
 * Strategy (D4):
 *   - versioned cache name; old caches deleted on activate
 *   - cache-first for static assets (svg, js, css, mp3, webp) under this scope
 *   - network-first with cache fallback for the shell (index.html) so a new
 *     deploy is picked up on the next online visit while offline still works
 */

const VERSION = 'g5-4';
const CACHE = `sandbox-a1-${VERSION}`;
const SHELL = ['./', './index.html', './rig.js?v=g4', './engine/physics.js', './engine/motion.js', './engine/flight.js', './engine/states.js', './companions/owl.motion.json?v=k5', './companions/owl.svg', './companions/bee.svg', './companions/owl_p2.svg',
  './art/parts/owl/head.webp', './art/parts/owl/body.webp', './art/parts/owl/wingL.webp', './art/parts/owl/wingR.webp',
  './art/parts/owl/eyes.webp', './art/parts/owl/lids.webp', './art/parts/owl/beak_closed.webp', './art/parts/owl/beak_open.webp', './art/parts/owl/legs.webp',
  './audio/owl_cheer.mp3', './audio/owl_laugh.mp3', './audio/explain_sample.mp3'];
const STATIC = /\.(svg|js|css|mp3|webp|png|woff2)(\?.*)?$/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('sandbox-a1-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith(networkFirst(req));
  } else if (STATIC.test(url.pathname + url.search)) {
    e.respondWith(cacheFirst(req));
  }
});

async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) c.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const c = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) c.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await c.match(req) || await c.match('./index.html');
    if (hit) return hit;
    throw err;
  }
}
