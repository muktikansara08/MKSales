// mksales.co.nz: offline support for the agent calculators.
// Change VERSION whenever you upload new files so phones pick them up cleanly.
const VERSION = 'mk-v9';
const PRECACHE = ['/calculator', '/cis-template.pdf', '/pdf-lib.min.js', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png', '/favicon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req, fallback) {
  return fetch(req)
    .then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })
    .catch(() => caches.match(req)
      .then((r) => r || (fallback ? caches.match(fallback) : null))
      .then((r) => r || Response.error()));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pages: network first so updates show straight away; saved copy when offline.
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, '/calculator')); return; }

  // The blank CIS form: always the latest version when online, saved copy when offline.
  if (url.origin === self.location.origin && url.pathname.endsWith('.pdf')) { e.respondWith(networkFirst(req)); return; }

  // Icons, fonts and other files: saved copy first, then network.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
