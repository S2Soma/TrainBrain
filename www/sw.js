/* Service worker: ưu tiên mạng, rơi về cache khi offline. Chỉ xử lý tài nguyên cùng nguồn. */
const CACHE = 'tinh-nhanh-v12';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/styles.css',
  './fonts/bricolage-latin.woff2', './fonts/bricolage-latin-ext.woff2', './fonts/bricolage-vietnamese.woff2',
  './js/app.js', './js/dom.js', './js/store.js', './js/sound.js', './js/math.js',
  './js/words.js', './js/background.js', './js/charts.js', './js/tour.js',
  './img/bg/divide.png',
  './img/bg/equals.png',
  './img/bg/k0.png',
  './img/bg/k1.png',
  './img/bg/k2.png',
  './img/bg/k3.png',
  './img/bg/k4.png',
  './img/bg/k5.png',
  './img/bg/k6.png',
  './img/bg/k7.png',
  './img/bg/k8.png',
  './img/bg/k9.png',
  './img/bg/minus.png',
  './img/bg/multiply.png',
  './img/bg/plus.png',
  './img/npc/owl.png',
  './img/obj/apple.png',
  './img/obj/ball.png',
  './img/obj/balloon.png',
  './img/obj/banana.png',
  './img/obj/butterfly.png',
  './img/obj/carrot.png',
  './img/obj/chick.png',
  './img/obj/cupcake.png',
  './img/obj/duck.png',
  './img/obj/fish.png',
  './img/obj/ladybug.png',
  './img/obj/orange.png',
  './img/obj/star.png',
  './img/obj/strawberry.png',
  './img/ui/abacus.png',
  './img/ui/backspace.png',
  './img/ui/bolt.png',
  './img/ui/brain.png',
  './img/ui/chart.png',
  './img/ui/check.png',
  './img/ui/cross.png',
  './img/ui/crown.png',
  './img/ui/fire.png',
  './img/ui/gear.png',
  './img/ui/help.png',
  './img/ui/house.png',
  './img/ui/keyboard.png',
  './img/ui/mute.png',
  './img/ui/numbers.png',
  './img/ui/shuffle.png',
  './img/ui/skip.png',
  './img/ui/speaker.png',
  './img/ui/stopwatch.png',
  './img/ui/trash.png',
  './vendor/gsap-3.12.5.min.js', './vendor/chart-4.4.7.umd.js',
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
