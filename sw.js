/* Color Time service worker — bump CACHE_VERSION when adding assets */
const CACHE_VERSION = 'color-v7';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/pages.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './custom/pages.json'
];

// Built-in page art (base64 PNG text, ~13 KB each). Cached at install but non-fatal, so a flaky
// download never blocks the app shell; anything missed is cached the first time it is opened.
const PAGE_ASSETS = [
  './assets-b64/pages__animals__cat.png.b64',
  './assets-b64/pages__animals__dog.png.b64',
  './assets-b64/pages__animals__bunny.png.b64',
  './assets-b64/pages__animals__lion.png.b64',
  './assets-b64/pages__animals__elephant.png.b64',
  './assets-b64/pages__animals__fish.png.b64',
  './assets-b64/pages__animals__owl.png.b64',
  './assets-b64/pages__animals__turtle.png.b64',
  './assets-b64/pages__food__apple.png.b64',
  './assets-b64/pages__food__banana.png.b64',
  './assets-b64/pages__food__strawberry.png.b64',
  './assets-b64/pages__food__icecream.png.b64',
  './assets-b64/pages__food__cupcake.png.b64',
  './assets-b64/pages__food__donut.png.b64',
  './assets-b64/pages__food__pizza.png.b64',
  './assets-b64/pages__food__watermelon.png.b64',
  './assets-b64/pages__princess__princess.png.b64',
  './assets-b64/pages__princess__castle.png.b64',
  './assets-b64/pages__princess__crown.png.b64',
  './assets-b64/pages__princess__wand.png.b64',
  './assets-b64/pages__princess__unicorn.png.b64',
  './assets-b64/pages__princess__fairy.png.b64',
  './assets-b64/pages__princess__carriage.png.b64',
  './assets-b64/pages__princess__dragon.png.b64',
  './assets-b64/pages__objects__house.png.b64',
  './assets-b64/pages__objects__ball.png.b64',
  './assets-b64/pages__objects__rocket.png.b64',
  './assets-b64/pages__objects__teddy.png.b64',
  './assets-b64/pages__objects__kite.png.b64',
  './assets-b64/pages__objects__umbrella.png.b64',
  './assets-b64/pages__objects__balloons.png.b64',
  './assets-b64/pages__objects__gift.png.b64',
  './assets-b64/pages__vehicles__car.png.b64',
  './assets-b64/pages__vehicles__firetruck.png.b64',
  './assets-b64/pages__vehicles__bus.png.b64',
  './assets-b64/pages__vehicles__train.png.b64',
  './assets-b64/pages__vehicles__airplane.png.b64',
  './assets-b64/pages__vehicles__helicopter.png.b64',
  './assets-b64/pages__vehicles__tractor.png.b64',
  './assets-b64/pages__vehicles__sailboat.png.b64'
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
        .then(() => Promise.all(PAGE_ASSETS.map((u) => cache.add(u).catch(() => {}))))
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
