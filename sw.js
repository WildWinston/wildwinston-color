/* Color Time service worker — bump CACHE_VERSION when adding assets */
const CACHE_VERSION = 'color-v5';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/pages.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
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
  './custom/pages.json'
];

// Files a custom/pages.json list needs offline: plain 'file' images or base64 text chunks ('b64').
function customAssetUrls(list) {
  const urls = [];
  (list || []).forEach((p) => {
    if (!p) return;
    if (p.file) urls.push('./custom/' + p.file);
    if (Array.isArray(p.b64)) p.b64.forEach((u) => urls.push('./' + u));
    else if (p.b64 && p.parts > 0) for (let i = 0; i < p.parts; i++) urls.push('./' + p.b64 + '.' + String(i).padStart(2, '0'));
    else if (p.b64) urls.push('./' + p.b64);
  });
  return urls;
}
function cacheCustomAssets(cache, list) {
  return Promise.all(customAssetUrls(list).map((u) =>
    cache.match(u).then((hit) => hit || cache.add(u)).catch(() => {})));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(ASSETS)
        .then(() => cache.match('./custom/pages.json'))
        .then((r) => (r ? r.json() : []))
        .then((list) => cacheCustomAssets(cache, list))
    ).then(() => self.skipWaiting())
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
  const isPagesJson = url.pathname.endsWith('/custom/pages.json');
  const networkFirst = req.mode === 'navigate' || isPagesJson;

  const fromNetwork = () => fetch(req).then((res) => {
    if (res && res.ok) {
      const clone = res.clone();
      const json = isPagesJson ? res.clone().json().catch(() => []) : null;
      event.waitUntil(caches.open(CACHE_VERSION).then((c) =>
        c.put(req, clone).then(() => json && json.then((list) => cacheCustomAssets(c, list)))));
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
