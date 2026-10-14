/* KasHar Service Worker — stale-while-revalidate, relative paths, GitHub Pages friendly */
const CACHE_NAME = 'kashar-v2';
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

  // Navigasi: network-first, fallback ke cache agar offline tetap jalan
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

  // Asset: stale-while-revalidate.
  // Tampilkan versi cache dulu (instan + offline), tapi SELALU ambil versi
  // terbaru dari network di background dan perbarui cache. Dengan cara ini,
  // setelah user update file di GitHub: kunjungan pertama memperbarui cache,
  // kunjungan/refresh berikutnya langsung memakai file baru.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok && new URL(request.url).origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
