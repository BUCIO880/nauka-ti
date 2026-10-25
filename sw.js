/* Service worker: aplikacja działa offline. Przy każdej zmianie plików podbij VERSION. */
const VERSION = 'nauka-ti-v2';
const FILES = [
  './',
  './index.html',
  './style.css?v=2',
  './app.js?v=2',
  './data/test1.js?v=1',
  './data/test2.js?v=1',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      // otwarte karty od razu przeładowują się na nową wersję
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((list) => list.forEach((c) => c.navigate(c.url).catch(() => {})))
  );
});

// Najpierw z pamięci podręcznej (szybko i offline), w tle pobieramy świeżą wersję.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(VERSION).then((cache) =>
      cache.match(req, { ignoreSearch: req.mode === 'navigate' }).then((hit) => {
        const fresh = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit || (req.mode === 'navigate' ? cache.match('./index.html') : undefined));
        return hit || fresh;
      })
    )
  );
});
