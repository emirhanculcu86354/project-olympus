// Project Olympus Service Worker
// Strateji:
//  - Uygulama kabuğu (HTML/JS/CSS/manifest): ÖNCE AĞ, olmazsa önbellek → güncellemeler anında gelir, çevrimdışı da açılır
//  - Ağır statik dosyalar (görsel, ses, video, 3D model, oyun ZIP): ÖNCE ÖNBELLEK → bir kez indirilir, sonra anında açılır
//  - Başka alan adları (Firebase, CDN, API'ler) hiç ellenmez
const CACHE_NAME = 'olympus-cache-v94';
// js/ altındaki dosyalar olympus.html'deki sırayla (scripts/js-order.json)
const APP_SHELL = [
  'index.html',
  'olympus.html',
  'style.css',
  'css/olympus2.css',
  'assets/olympus-training-mark.svg',
  'assets/olympus-training-icon-192.png',
  'js/01-cekirdek-firebase.js',
  'js/02-oturum-ve-program-verisi.js',
  'js/03-dilala.js',
  'js/04-olympus-antrenman.js',
  'js/05-olympus-profil.js',
  'js/06-oly-asistan.js',
  'js/07-arena.js',
  'js/08-tema-futbol-bildirim.js',
  'js/09-kamp.js',
  'js/10-culbase-gecit.js',
  'js/11-arcade.js',
  'js/12-hub.js',
  'js/13-business-plc.js',
  'js/14-profil-ve-program-olusturucu.js',
  'js/15-sohbet.js',
  'js/16-takip-fab-ada.js',
  'js/17-kardiyo-polaroid.js',
  'js/18-kpss.js',
  'js/19-akademi-guvenlik.js',
  'js/20-arayuz-yardimcilari.js',
  'js/21-finans.js',
  'js/22-garaj.js',
  'js/23-racer.js',
  'js/24-olyscore.js',
  'js/25-olysocial.js',
  'js/26-olyos-zamanlayici.js',
  'js/27-giris.js',
  'js/28-oly-maintain.js',
  'js/29-pwa.js',
  'js/30-olympus2-cekirdek.js',
  'js/31-olympus2-ekranlar.js',
  'js/32-olympus2-oynatici.js',
  'js/33-olympus2-programlar.js',
  'js/34-olympus2-kardiyo.js',
  'js/35-olympus2-ozellikler.js',
  'js/36-olympus2-gelismis.js',
  'js/37-olympus2-yedek.js',
  'js/38-olympus2-akademi.js',
  'js/39-olympus2-koc.js',
  'js/40-olympus2-saglik.js',
  'manifest.json',
  'icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// Eski sürüm önbelleklerini temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const SHELL_PATTERN = /\.(html|js|css|json)$/i;

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isShell = request.mode === 'navigate' || SHELL_PATTERN.test(url.pathname);

  if (isShell) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('olympus.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Sadece tam (200) yanıtları sakla; video/ses aralık isteklerinin (206) kısmi yanıtları önbelleğe uygun değil
        if (response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

// Bildirime dokunulunca uygulamayı öne getir ve ilgili eylemi (antrenman, su, uyku) ilet
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.notification.data && event.notification.data.action;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = all[0];
    if (client) {
      await client.focus();
      if (action) client.postMessage({ olyAction: action });
    } else {
      await self.clients.openWindow('olympus.html' + (action ? '?action=' + action : ''));
    }
  })());
});
