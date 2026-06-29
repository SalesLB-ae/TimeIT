/* sw.js — minimal cache-first service worker so TimeIT works offline. */
const CACHE = 'timeit-v1';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/store.js',
  './js/format.js',
  './js/timer.js',
  './js/ui.js',
  './js/reports.js',
  './js/app.js',
  './manifest.json',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        // Cache same-origin successful responses for next time.
        if (resp.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
