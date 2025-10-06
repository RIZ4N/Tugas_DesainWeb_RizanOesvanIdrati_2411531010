// /service-worker.js
const CACHE_NAME = 'rizan-pwa-v7';
const OFFLINE_PAGE = '/offline.html';
const ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/contact.html',
  '/offline.html',
  '/manifest.json',
  '/style.css?v=1.3',
  '/profile.jpg?v=20251006',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  console.log('[SW] install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] cache addAll failed:', err))
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Jika request untuk halaman navigasi (HTML)
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(req)
        .then(networkResp => {
          // Simpan ke cache jika berhasil online
          const copy = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return networkResp;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);

          // Coba ambil dari cache jika ada
          const cachedResp =
            (await cache.match(req)) ||
            (await cache.match('/index.html')) ||
            (await cache.match('/'));

          // Jika tidak ada sama sekali di cache → tampilkan offline.html
          return cachedResp || (await cache.match('/offline.html'));
        })
    );
    return;
  }

  // Untuk request asset (CSS, JS, gambar, dll)
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(networkResp => {
          if (req.method === 'GET' && networkResp && networkResp.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(req, networkResp.clone()));
          }
          return networkResp;
        })
        .catch(async () => {
          // fallback untuk gambar atau file lain
          if (req.destination === 'image') return caches.match('/icons/icon-192.png');
          // kalau bukan gambar, tampilkan offline.html
          return (await caches.match('/offline.html')) ||
                 new Response('<h1>Offline</h1><p>Tidak ada koneksi internet.</p>', {
                   headers: { 'Content-Type': 'text/html' }
                 });
        });
    })
  );
});
