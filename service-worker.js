const CACHE_NAME = 'Rizan Oesvan';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'contact.html',
  'about.html',
  'offline.html',
  'style.css',
  './icons/icon-192.png-192.png',
  './icons/icon-192.png-192.png'
];

// Install event - cache aset statis
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache dibuka');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// Activate event - hapus cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - strategi Cache First dengan Fallback ke Offline
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    // if user minta halaman baru, fallback ke offline.html saat offline
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match("./offline.html"))
    );
  } else {
    // asset load dari cache atau fetch
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
  }
});