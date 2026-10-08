/* Color Time service worker — bump CACHE_VERSION when adding assets */
const CACHE_VERSION = 'color-v3';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/pages.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './pages/animals/cat.svg',
  './pages/animals/dog.svg',
  './pages/animals/fish.svg',
  './pages/animals/elephant.svg',
  './pages/food/apple.svg',
  './pages/food/banana.svg',
  './pages/food/strawberry.svg',
  './pages/food/icecream.svg',
  './pages/princess/princess.svg',
  './pages/princess/castle.svg',
  './pages/princess/crown.svg',
  './pages/princess/wand.svg',
  './pages/objects/car.svg',
  './pages/objects/house.svg',
  './pages/objects/ball.svg',
  './pages/objects/rocket.svg',
  './custom/pages.json',
  './custom/spidey-ironman.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for the page shell and custom/pages.json (so new custom pages show up when online),
// cache-first for everything else (fast + offline). Anything fetched successfully is cached.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  const url = new URL(req.url);
  const networkFirst = req.mode === 'navigate' || url.pathname.endsWith('/custom/pages.json');

  const fromNetwork = () => fetch(req).then((res) => {
    if (res && res.ok) {
      const clone = res.clone();
      caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
    }
    return res;
  });

  if (networkFirst) {
    event.respondWith(
      fromNetwork().catch(() =>
        caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
    );
  } else {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then((cached) => cached || fromNetwork())
    );
  }
});
