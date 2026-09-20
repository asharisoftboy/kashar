/* KasHar Service Worker — cache-first, relative paths, GitHub Pages friendly */
const CACHE_NAME = 'kashar-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/js/utils.js',
  './assets/js/db.js',
  './assets/js/transactions.js',
  './assets/js/wallets.js',
  './assets/js/budgets.js',
  './assets/js/goals.js',
  './assets/js/debts.js',
  './assets/js/reports.js',
  './assets/js/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // Navigasi: network-first, fallback ke cache (index.html) agar offline tetap jalan
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Asset lain: cache-first, lalu network (dan simpan ke cache)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok && new URL(request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        }
        return res;
      });
    })
  );
});
