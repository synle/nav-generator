// 1770399909232 will be replaced during build
const CACHE_VERSION = '1770399909232';
const CACHE_NAME = `nav-generator-cache-${CACHE_VERSION}`;
const CACHE_TTL = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  // Don't auto skip waiting - let the page control it
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Delete old cache versions
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
      // Clean up expired entries from current cache
      caches.open(CACHE_NAME).then(async (cache) => {
        const requests = await cache.keys();
        const deletionPromises = [];

        for (const request of requests) {
          const response = await cache.match(request);
          if (isCacheExpired(response)) {
            console.log('Service Worker: Removing expired cache entry:', request.url);
            deletionPromises.push(cache.delete(request));
          }
        }

        return Promise.all(deletionPromises);
      }),
    ]),
  );
  self.clients.claim();
});

// Helper function to check if URL should be cached
function shouldCacheUrl(url) {
  // Parse the URL
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;

  // Cache root paths
  if (pathname === '/' || pathname === './' || pathname === '/index.html' || pathname === './index.html') {
    return true;
  }

  // Cache ./fav
  if (pathname === '/fav' || pathname === './fav' || pathname.endsWith('/fav')) {
    return true;
  }

  // Check file extensions
  const cachableExtensions = [
    // Images
    '.ico', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.avif',
    // Code/Styles
    '.js', '.jsx', '.css',
    // Data/Text
    '.txt', '.json', '.md'
  ];
  return cachableExtensions.some(ext => pathname.endsWith(ext));
}

// Helper function to check if cached response is expired
function isCacheExpired(response) {
  if (!response) return true;

  const cachedTime = response.headers.get('sw-cache-time');
  if (!cachedTime) return true;

  const age = Date.now() - parseInt(cachedTime, 10);
  return age > CACHE_TTL;
}

// Helper function to add timestamp to response
async function addTimestampToResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cache-time', Date.now().toString());

  const blob = await response.blob();
  return new Response(blob, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Only intercept requests we want to cache
  if (!shouldCacheUrl(event.request.url)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      // Check if cache exists and is still valid
      if (cachedResponse && !isCacheExpired(cachedResponse)) {
        // Cache hit and still valid - refresh TTL and return
        console.log('Service Worker: Serving from cache and refreshing TTL:', event.request.url);

        // Update timestamp to extend TTL (sliding window)
        const refreshedResponse = await addTimestampToResponse(cachedResponse.clone());
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, refreshedResponse.clone());
        });

        return cachedResponse;
      }

      // Cache miss or expired - fetch from network
      console.log('Service Worker: Fetching from network:', event.request.url);

      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then(async (response) => {
        // Only cache successful responses
        if (!response || response.status !== 200) {
          return response;
        }

        // Add timestamp and cache the response
        const responseWithTimestamp = await addTimestampToResponse(response.clone());

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseWithTimestamp);
        });

        return response;
      }).catch((error) => {
        console.log('Service Worker: Fetch failed', error);

        // If fetch fails but we have expired cache, return it anyway
        if (cachedResponse) {
          console.log('Service Worker: Returning expired cache as fallback');
          return cachedResponse;
        }

        throw error;
      });
    }),
  );
});
