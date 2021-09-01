const version = 13;
const CACHE_NAME = `synle-github-io-caches`;

function _shouldCacheThisUrl(url) {
  if (url.includes('cdn.skypack.dev') || url.includes('cloudflare.com') || url.includes('unpkg.com')) {
    return true;
  }

  for (const dynamicUrl of cacheKeys) {
    if (url.includes(dynamicUrl)) {
      return true;
    }
  }

  return false;
}

function _formatUrl(urlList) {
  const newUrlList = [];

  for (url of urlList) {
    if (url.indexOf('//') === 0) {
      newUrlList.push(`http://${url}`);
      newUrlList.push(`https://${url}`);
    } else {
      newUrlList.push(url);
    }
  }

  return newUrlList;
}

const staticUrlsToCache = _formatUrl([
  '/fav/index.html',
  '/fav/manifest.json',
  '/app/nav-generator/core.css',
  '/app/fix-link.html',
  '/app/port-forwarding.html',
  '/app/setup-bash-profile.html',
  '/app/stock-calculator.html',
  '/app/time-converter.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/less.js/4.1.1/less.min.js',
  'https://cdn.skypack.dev/react',
  'https://cdn.skypack.dev/react-dom',
]);

const dynamicUrlsToCache = _formatUrl([
  '/fav/index.js',
  'https://raw.githubusercontent.com/synle/bashrc/master/software/metadata/ip-address.config',
]);

const cacheKeys = [...staticUrlsToCache, ...dynamicUrlsToCache];

self.addEventListener('install', function (event) {
  // Perform install steps
  console.log('sw.install', version, event);

  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(cacheKeys);
    }),
  );
});

self.addEventListener('activate', (event) => {
  // delete any caches that aren't in cacheKeys
  console.log('sw.activate', version, event);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (!cacheKeys.includes(key)) {
              return caches.delete(key);
            }
          }),
        ),
      )
      .catch((err) => {
        console.log('New sw is now ready to handle fetches!', err);
      }),
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
        if (!response || response.status !== 200 || response.type !== 'basic') {
          if (!_shouldCacheThisUrl(url)) {
            // not caching this
            return response;
          }
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
