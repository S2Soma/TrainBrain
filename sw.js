/* Service worker: ưu tiên mạng, rơi về cache khi offline. Chỉ xử lý tài nguyên cùng nguồn. */
const CACHE = 'tinh-nhanh-v7';
const ASSETS = [
  './', './index.html', './manifest.json', './icons/icon.svg',
  './css/styles.css',
  './js/app.js', './js/dom.js', './js/store.js', './js/sound.js', './js/math.js',
  './js/words.js', './js/background.js', './js/charts.js',
  './vendor/gsap-3.12.5.min.js', './vendor/lucide-0.469.0.min.js', './vendor/chart-4.4.7.umd.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html'))),
  );
});
