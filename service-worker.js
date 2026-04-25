const CACHE_NAME = "monquota-static-v1";
const APP_SHELL_URLS = [
  "./",
  "./index.html",
  "./confidentialite.html",
  "./404.html",
  "./site.webmanifest",
  "./favicon.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-192.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/screenshots/monquota-wide.png",
  "./assets/screenshots/monquota-mobile.png",
  "./src/styles/main.css",
  "./src/lib/date-utils.js",
  "./src/data/holidays-fr.js",
  "./src/data/storage.js",
  "./src/core/calculations.js",
  "./src/ui/calendar.js",
  "./src/app.js",
];

self.addEventListener("install", function handleInstall(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function cacheAppShell(cache) {
      return cache.addAll(APP_SHELL_URLS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", function handleActivate(event) {
  event.waitUntil(
    caches
      .keys()
      .then(function removeOldCaches(cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function isOldCache(cacheName) {
              return cacheName !== CACHE_NAME;
            })
            .map(function deleteCache(cacheName) {
              return caches.delete(cacheName);
            }),
        );
      })
      .then(function claimClients() {
        return self.clients.claim();
      }),
  );
});

self.addEventListener("fetch", function handleFetch(event) {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(function serveCachedPage() {
          return caches.match("./index.html");
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function serveCachedAsset(cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then(function cacheFreshAsset(response) {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseCopy = response.clone();
        caches.open(CACHE_NAME).then(function cacheAsset(cache) {
          cache.put(request, responseCopy);
        });
        return response;
      });
    }),
  );
});
