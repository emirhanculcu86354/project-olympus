// Service Worker kaydı (çevrimdışı destek)
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// ==========================================
// 📦 ÇEVRİMDIŞI DESTEK (SERVICE WORKER)
// ==========================================
// Android (Capacitor) uygulamasında dosyalar zaten cihazdan okunuyor; SW sadece web/PWA sürümünde kaydedilir.
const isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
if ('serviceWorker' in navigator && !isNativeApp && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service Worker kaydedilemedi:', err));
    });
}
