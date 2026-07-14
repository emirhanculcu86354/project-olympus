const CACHE_NAME = 'olympus-cache-v7';
const ASSETS_TO_CACHE = [
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icon.png'
];

// Uygulama yüklenirken tüm dosyaları telefon hafızasına kaydet
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// İnternet kesik olduğunda her şeyi önbellekten (cache) oku ve anında aç
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
          return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});