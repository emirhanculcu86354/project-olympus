# Düzenleme Notları — 2026-10-23

Değişiklik öncesi dosyaların yedeği: `_yedek_2026-10-23/` (eski `www/` dahil).

## Düzeltilen hatalar
- **Hub → modül geçişi:** `enterAppFromHub` üç kez tanımlıydı; sonraki sürüm sinematik harf geçişini ve Olympus'un `display:flex` ayarını eziyordu. Tek fonksiyonda birleştirildi; Finans kendi banka animasyonuyla `openFinanceScreen()` üzerinden açılıyor.
- **Hub'a dönüş:** `returnToHub` sadece 4 ekranı kapatıyordu. Artık tüm modülleri kapatıyor, arkada çalışan yarış oyunu/DOS emülatörünü de durduruyor. Garaj, Finans ve KPSS kapanışları buradan geçiyor.
- **Kardiyo kaydı:** Story ekranı eklenince koşu/bisiklet kayıtları İdman Geçmişi'ne hiç yazılmıyordu. Düzeltildi (0 km kaydı da engelleniyor).
- **OlySocial:** İkinci açılışta ekran boş kalıyordu; ayrıca zaten giriş yapmış kullanıcıdan sahte bir "Log in" istiyordu ve uygulama içinden Hub'a dönüş yoktu. Doğrudan akışa açılıyor, başlıkta geri butonu var.
- **Akademi (Polis/Jandarma) modu:** Kapatınca var olmayan `profile-screen`'e dönmeye çalışıp boş ekran bırakıyordu. Artık Olympus'a dönüyor.
- **Açılışta son ekran:** Giriş yapılmadan, splash'in üstünde, %60 rastgele çalışıyor ve hiç kaydedilmeyen `jandarma` anahtarını arıyordu. Artık girişten sonra `restoreLastSession()` ile tutarlı çalışıyor.
- **KPSS:** Ölü kopya, ekranı açtığı anda kapatıyordu; geçerli sürümde başlık/geri sayım güncellenmiyordu ve her açılışta yeni interval birikiyordu.
- **E-Plan PDF:** `zoomPDF` tanımsızdı, `html2pdf` kütüphanesi hiç yüklenmemişti (İNDİR çöküyordu). İkisi de düzeltildi; kütüphane sadece indirme anında yükleniyor.
- **Giriş ekranı:** Apple butonunda "GitHub" yazıyordu. Google girişinde yer tutucu EmailJS ID'leri (`SENIN_SERVICE_ID`) hata veriyordu; artık `EMAILJS_SECURITY_TEMPLATE_ID` doldurulunca çalışıyor.
- **Dilala sayacı:** Mod her açıldığında yeni bir 1 sn'lik zamanlayıcı ekleniyordu (sızıntı).
- **CSS:** `padding: … max(18px, )` gibi bozuk değerler yüzünden Hub kartları ekran kenarına yapışıyordu.
- Aynı ID'li ikinci (gizli) FAB menüsü, iki kez yüklenen Leaflet ve sürümsüz Chart.js temizlendi.
- 20+ çift tanımlı fonksiyonun ölü (ezilen) kopyaları silindi; kalan 3 tanesi bilinçli sarmalayıcı.

## Güvenlik
- Diğer kullanıcılardan gelen isim, fotoğraf URL'si, bildirim ve OlySocial mesajları artık `escapeHTML()` / `jsArg()` ile basılıyor (önceden bir kullanıcı adına HTML/JS gömüp başkasının cihazında çalıştırabilirdi).
- ⚠️ `OLYSCORE_API_KEY` (RapidAPI) istemci kodunda açık duruyor; herkes görebilir. Kotanın sömürülmemesi için anahtarı yenileyip bir sunucu/Cloud Function arkasına almak önerilir.

## Yeni
- **Android geri tuşu:** Önceden herhangi bir modülde geri tuşu uygulamayı kapatıyordu. Artık en üstteki ekranı kapatıp Hub'a (Akademi'den Olympus'a) dönüyor.
- **Service Worker:** `sw.js` hiç kayıtlı değildi. Kaydedildi; HTML/JS/CSS için önce-ağ (güncellemeler hemen gelir), medya için önce-önbellek stratejisi.
- **Android build:** `www/` ana koddan çok eskiydi. `npm run build` artık `www/`'yu güncel dosyalarla yeniden oluşturuyor; `npm run android` build + `cap sync` + Android Studio.

## Tasarım
- Hub'daki 2. ve 3. sayfa kartları (Finans, Garaj, OlyScore, OlySocial, OlyOS, Maintain) inline stillerden ortak kart sistemine taşındı; beyaz OlySocial kartı karanlık temaya uyarlandı.
- Oly asistanı daha ince bir kenar sekmesi oldu ve kendi arayüzü olan modüllerde (Arcade, Finans, Garaj, OlyScore, OlySocial, OlyOS, Maintain, aktif idman) gizleniyor.

## script.js modüllere bölündü
13 bin satırlık `script.js`, `js/` klasöründe 29 dosyaya bölündü (davranış değişmedi). Her dosyanın başında ne içerdiği yazıyor.

- Dosyalar klasik `<script>` olarak **olympus.html'deki sırayla** yüklenir ve aynı global kapsamı paylaşır; `window.x = …` ile tanımlı fonksiyonlar ve `onclick="…"` bağlantıları olduğu gibi çalışır.
- Sıra önemlidir: yeni dosya eklersen `olympus.html`, `sw.js` (APP_SHELL) ve `scripts/js-order.json` listelerine aynı sırayla ekle.
- Bölme sırasında AST ile kontrol edildi: hiçbir dosya, yüklenirken kendisinden sonra gelen bir dosyadaki fonksiyonu çağırmıyor; birleştirilmiş içerik orijinalle satır satır aynı.
- Orijinal tek dosya: `_yedek_2026-10-23/script_bolunmeden_once.js`.
