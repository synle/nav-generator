// 1770399909232 will be replaced during build
const CACHE_VERSION = '1770399909232';
const CACHE_NAME = `nav-generator-cache-${CACHE_VERSION}`;
const urlsToCache = [
  './',
  './index.html',
  './index.js',
  './fav.js',
  './index.css',
  '//synle.github.io/nav-generator/index.js',
  '//synle.github.io/nav-generator/index.css',
];

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching files');
      return cache.addAll(urlsToCache).catch((err) => {
        console.log('Service Worker: Cache failed for some resources', err);
      });
    }),
  );
  // Don't auto skip waiting - let the page control it
});

// Activate event - clean up old caches
              self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // Clone the request
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        // Check if this is a favicon request
        const url = event.request.url;
        const isFavicon = url.includes('favicon') || url.endsWith('.ico') || url.includes('/icon');

        // For favicons, cache if response exists (even cross-origin/opaque responses)
        // For other resources, only cache successful same-origin responses
        const shouldCache = isFavicon
          ? response && response.status === 200
          : response && response.status === 200 && response.type === 'basic';

        if (!shouldCache) {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache the new response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    }),
  );
});
