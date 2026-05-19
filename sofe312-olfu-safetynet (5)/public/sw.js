
const CACHE_NAME = 'safetynet-offline-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Use {cache: 'reload'} to ensure we get fresh files
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
    ))
  );
});

self.addEventListener('fetch', event => {
  // Don't cache AI requests
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(event.request).then(response => {
        // Cache external scripts like Tailwind and ESM.sh for offline use
        if (event.request.url.includes('cdn.tailwindcss.com') || event.request.url.includes('esm.sh')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
