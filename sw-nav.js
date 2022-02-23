const CACHE_NAME = 'synle-nav-generator-1.1.1649107045432';

const dynamicUrlsToCache = [];

const staticUrlsToCache = [
  'index.jsx',
  'index.css',
  'index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/less.js/4.1.1/less.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.skypack.dev/react',
  'https://cdn.skypack.dev/react-dom',
];

const cacheKeys = [...staticUrlsToCache, ...dynamicUrlsToCache];

self.addEventListener('install', function (event) {
  // Perform install steps
  console.log('sw.install', CACHE_NAME, event);

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(cacheKeys))
      .catch((err) => console.log('sw.install failed', CACHE_NAME, err)),
  );
});

self.addEventListener('activate', (event) => {
  // delete any caches that aren't in cacheKeys
  console.log('sw.activate', CACHE_NAME, event);
  event.waitUntil(
    Promise.allSettled([
      caches.keys().then((keys) =>
        Promise.allSettled(
          keys.map((key) => {
            // now deletes all the caches
            return caches.delete(key);
          }),
        ),
      ),
      clients.claim(), // https://stackoverflow.com/questions/39567642/service-worker-fetch-event-on-first-load
    ]),
  );
});

let queueFetchUrls = {};
self.addEventListener('fetch', function (event) {
  const request = event.request;

  event.respondWith(
    caches.match(event.request).then(function (response) {
      // Cache hit - return response
      if (response) {
        // special tweaks to refetch these special dynamic url
        const url = response.url || '';
        for (const dynamicUrl of dynamicUrlsToCache) {
          if (url.includes(dynamicUrl)) {
            if (!queueFetchUrls[url]) {
              queueFetchUrls[url] = true;
              fetch(request)
                .then(function (response2) {
                  const responseToCache = response2.clone(); // need to clone before used

                  caches.open(CACHE_NAME).then(function (cache) {
                    cache.put(request, responseToCache);
                  });
                  queueFetchUrls[url] = false;
                })
                .catch((err) => {
                  console.log('sw.fetch - failed to refetch new data in background', request);
                  queueFetchUrls[url] = false;
                });
            }
            console.log('sw.fetch - from cache - and fetch new in background', request);
            return response;
          }
        }

        console.log('sw.fetch - from cache', request);
        return response;
      }

      console.log('sw.fetch - from url', request);

      return fetch(request).then(function (response) {
        // Check if we received a valid response
        const url = request.url || '';
        const method = (request.method || 'GET').toUpperCase();
        if (!_shouldCacheThisUrl(url) || method !== 'GET') {
          // not caching this
          return response;
        }

        const responseToCache = response.clone(); // need to clone before used

        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, responseToCache);
        });

        return response;
      });
    }),
  );
});

function _shouldCacheThisUrl(url) {
  if (url.includes('chrome-extension://')) {
    return false;
  }

  if (
    url.includes('cdn.skypack.dev') ||
    url.includes('cloudflare.com') ||
    url.includes('unpkg.com')
  ) {
    return true;
  }

  for (const dynamicUrl of cacheKeys) {
    if (url.includes(dynamicUrl)) {
      return true;
    }
  }

  return false;
}
