const CACHE_NAME = 'rizan-pwa-v8';
const OFFLINE_PAGE = './offline.html';
const ASSETS = [
  './',
  './index.html',
  './about.html',
  './contact.html',
  './offline.html',
  './manifest.json',
  './style.css',
  './profile.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  console.log('[SW] install');
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(ASSETS);
        await self.skipWaiting();
        console.log('[SW] assets cached');
      } catch (err) {
        console.error('[SW] cache addAll failed:', err);
      }
    })()
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] activate');
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
      console.log('[SW] old caches cleaned');
    })()
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Handler untuk navigasi / HTML pages (app shell)
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(handleNavigation(req));
    return;
  }

  // Assets (images, css, js, fonts, etc)
  event.respondWith(handleAsset(req));
});

async function handleNavigation(req) {
  try {
    const networkResp = await fetch(req);
    // hanya cache response yang successful (200)
    if (networkResp && networkResp.ok) {
      // clone sebelum dipakai oleh cache
      const toCache = networkResp.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, toCache).catch(err => {
        // jangan gagal seluruh request jika cache.put error
        console.warn('[SW] cache.put failed for navigation:', err);
      });
    }
    return networkResp;
  } catch (err) {
    // offline -> cek cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResp = (await cache.match(req)) || (await cache.match('./index.html')) || (await cache.match('./'));
    return cachedResp || (await cache.match(OFFLINE_PAGE));
  }
}

async function handleAsset(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;

  try {
    const networkResp = await fetch(req);
    // hanya cache kalau GET dan status ok
    if (req.method === 'GET' && networkResp && networkResp.ok) {
      // clone sekali sebelum menaruh ke cache
      const toCache = networkResp.clone();
      cache.put(req, toCache).catch(err => {
        console.warn('[SW] cache.put failed for asset:', req.url, err);
      });
    }
    return networkResp;
  } catch (err) {
    // fallback: kalau request gambar, kembalikan icon; kalau bukan, offline page
    if (req.destination === 'image') {
      const fallback = await cache.match('./icons/icon-192.png');
      if (fallback) return fallback;
      // jika tidak ada fallback di cache, return a blank response image (optional)
      return new Response(null, { status: 503, statusText: 'Offline' });
    }
    const offline = (await cache.match(OFFLINE_PAGE));
    return offline || new Response('<h1>Offline</h1><p>Tidak ada koneksi internet.</p>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}
