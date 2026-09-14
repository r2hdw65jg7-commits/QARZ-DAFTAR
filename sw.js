/* Qarz Daftar — offline service worker */
const CACHE = 'qarz-daftar-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './assets/css/styles.css',
  './assets/js/core.js', './assets/js/backup.js', './assets/js/components.js',
  './assets/js/views-debt.js', './assets/js/views-shop.js', './assets/js/views-report.js', './assets/js/app.js',
  './assets/icons/icon.svg', './assets/icons/icon-192.png', './assets/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
