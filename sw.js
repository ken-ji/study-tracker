const CACHE_VERSION = 'v1';
const CACHE_NAME = `study-tracker-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './manifest.json',
  './favicon.ico',
  './assets/css/style.css',
  './assets/js/app.js',
  './assets/js/router.js',
  './assets/js/storage.js',
  './assets/js/timer.js',
  './assets/js/charts.js',
  './assets/js/pages/dashboard.js',
  './assets/js/pages/record.js',
  './assets/js/pages/history.js',
  './assets/js/pages/subjects.js',
  './assets/js/pages/settings.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(PRECACHE_URLS);
      await Promise.all(
        CDN_URLS.map(url =>
          fetch(new Request(url, { mode: 'no-cors' }))
            .then(res => cache.put(url, res))
            .catch(e => console.warn('[sw] CDN cache failed:', e))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && (response.status === 200 || response.type === 'opaque')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
