// CLASSPETS service worker — must be served from the same folder as index.html.
// Strategy: precache the app shell + pinned CDN dependencies, then stale-while-revalidate.
const CACHE_NAME = 'classpets-v4';
const PRECACHE = [
  './',
  './index.html',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com/3.4.5',
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.24.7/babel.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache each entry independently so one failure doesn't abort the whole install.
      await Promise.all(PRECACHE.map((url) =>
        cache.add(new Request(url, { mode: url.startsWith('http') ? 'no-cors' : 'same-origin' })).catch(() => {})
      ));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Never cache the Premium key server: answers must always be live.
  const host = new URL(req.url).hostname;
  if (host === 'script.google.com' || host.endsWith('.googleusercontent.com')) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      const network = fetch(req)
        .then((res) => {
          // Cache good same-origin responses and opaque CDN/font responses.
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
