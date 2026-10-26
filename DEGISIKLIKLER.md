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

---

# Olympus 2.0 — Spor Modülü Yenilemesi (2026-10-25)

Hub'daki **Olympus** kartı artık yeni spor modülünü açıyor. Eski tasarım silinmedi: yeni modülde **Ayarlar → Klasik Olympus** ile açılır; iki ekran aynı verileri (olympus_* anahtarları) kullanır, hiçbir kayıt kaybolmaz.

**Dosyalar:** `css/olympus2.css` (tasarım sistemi), `js/30-olympus2-cekirdek.js` (veri & hesap motorları), `js/31-olympus2-ekranlar.js` (ekranlar), `js/32-olympus2-oynatici.js` (canlı antrenman). Tümü `window.O2` ad alanında; eski koda dokunmaz.

## Tasarım dili: "Olympus Noir"
Derin siyah zemin, ince grafit yüzeyler, sadece vurgu için şampanya-altın gradyan; fonksiyonel renkler (toparlanma yeşili, efor turuncusu, su mavisi, uyku moru). Manrope tipografi, tablo rakamları, yaylı (spring) geçişler, cam efektli yüzen sekme çubuğu ve ortada "Başlat" küresi.

## Ekranlar
- **Bugün:** Hazırlık skoru (uyku + kas toparlanması + antrenman yükünden 0-100), su / hareket / haftalık seans halkaları, günün seansı kartı (çalışacak kaslar figür üzerinde), haftalık seri, hızlı kayıt (su, kilo, uyku, kardiyo), Oly Koç önerileri + Gemini ile "Derin analiz".
- **Antrenman:** Faz 1-2-3 ve manuel oluşturucuyla kaydedilen **özel programlar artık gerçekten seçilebiliyor**; gün seçici, hareket listesi (en iyi set, tahmini 1RM, akıllı öneri, teknik videosu), 1RM hesaplayıcı, seans geçmişi.
- **Beslenme:** Vücut ağırlığına ve günün karbonhidrat tipine göre hesaplanan makro halkası, öğün zaman çizelgesi (alternatif öğün, yendi işareti), animasyonlu su şişesi, günlük takviye listesi.
- **İlerleme:** Kilo trendi, yağ oranı (US Navy), haftalık hacim grafiği (8 hafta), 12 haftalık tutarlılık ısı haritası, ön/arka kas toparlanma haritası, kişisel rekor tablosu, ölçüler, gelişim fotoğrafları, haftalık rapor e-postası.

## Canlı antrenman oynatıcısı
- Set tablosu: önceki performans, **progresif yüklenme önerisi** (tekrar aralığının tepesine ulaştıysan ağırlığı +2.5 / +5 kg artırır), ağırlık sonraki setlere taşınır.
- Dinlenme sayacı: halka animasyonu, ±15 sn, son 3 saniye titreşim, bitişte ses + titreşim; arka planda da doğru sayar (zaman damgası tabanlı).
- **Anlık kişisel rekor tespiti** (Epley 1RM) ve konfetili kutlama.
- Ekran kilitlenmez (Wake Lock); oynatıcı küçültülünce sekme çubuğunun üstünde canlı seans kapsülü; uygulama kapansa bile seans kaldığı yerden devam eder.
- Seans özeti: süre, hacim, set, rekorlar, çalışan kaslar, zorluk puanı, not, paylaş.
- Kayıt eski sisteme de yazılır (İdman geçmişi, egzersiz rekorları, kas yorgunluğu, Olympus puanı, "Antrenman Yapıldı" görevi) ve Firestore'a (`users/{uid}.training`) senkronlanır; başka cihazdaki seanslar açılışta birleştirilir.

## EmailJS (tamamlandı)
- Panelde yeni **"Olympus Bildirim"** şablonu oluşturuldu (`template_s3u8pzd`): koyu/altın premium HTML tasarım, değişkenler: `subject, preheader, eyebrow, headline, message, {{{content_html}}}, to_name, to_email`.
- `sendOlympusMail()` ortak motoru: **yeni cihazdan giriş uyarısı** (tüm giriş yöntemleri; aynı cihazda bir kez), **hoş geldin e-postası** (kayıtta), **haftalık performans raporu** (yeni haftanın ilk açılışında, ayarlardan kapatılabilir; İlerleme'den elle de gönderilebilir).
- Eski "Welcome" şablonu (`template_ec7zmcb`) yedek olarak duruyor. Ücretsiz plan: ayda 200 e-posta.

---

# Olympus 2.0 · Güncelleme 2 (2026-10-25)

## Mod geçişleri
- **Klasik ↔ 2.0:** Klasik ekranın başlığına altın **"✦ 2.0"** düğmesi eklendi; artık klasiğe geçip geri gelebiliyorsun. Arena ve Sporlar gibi klasik ekranda yaşayan bölümler 2.0'dan açıldığında, kapatınca otomatik olarak 2.0'a dönülüyor.
- **Dilala modu:** Ortak `setDilalaMode()` motoru; 2.0'da **Ayarlar → Dilala modu** anahtarıyla açılıp kapanıyor (şifre sorulur). Açıkken tüm arayüz altından gül tonlarına döner, "Bizim Alanımız" kartı görünür, Dilala programı/diyeti/görevleri yüklenir.

## Program oluşturucu (yeni)
- **Yapay zekâ ile:** Hedef, gün sayısı, seviye, süre, ekipman, öncelikli bölge ve not seçilir. Gemini anahtarı varsa gerçek 7 günlük program üretilir; yoksa ya da yanıt bozuksa Olympus akıllı şablonu (PPL / Üst-Alt / Tüm vücut, ekipmana göre hareket seçimi, hedefe göre set-tekrar-tempo-RPE) devreye girer. Eski sihirbaz sadece ayarları kaydediyordu, program üretmiyordu.
- **Manuel:** Gün ekle/sil, dinlenme günü, hareket ara/ekle (özel ad da yazılabilir), set-tempo-RPE düzenle, sırala. Taslak otomatik saklanır.
- Kaydedilen program **aktif program olur** ve Antrenman sekmesindeki "Programlarım"dan düzenlenip silinebilir.

## Eklenen özellikler
- Günlük görevler (klasikle ortak), Keşfet (Arena, Sohbet, Sporlar, Kardiyo, Kamp, Rozetler, Zen, Mini oyun), bildirim zili, rozet koleksiyonu.
- Tüm kayıtlar: nabız, adım, aktif kalori, ölçüler, takviye stoğu. Beslenme'de FatSecret kısayolu.
- **Ekspres antrenman** (ilk 4 hareket, en fazla 2'şer set), Oly Koç'ta **plato/deload uyarısı**, "Oly'ye sor" sohbeti.

## E-posta: emirhan@culbase.com
- EmailJS'e Google Workspace servisi bağlandı: `service_culbase` (emirhan@culbase.com). Tüm uygulama e-postaları buradan gider; hata olursa eski kişisel Gmail servisi (`service_8a342ow`) otomatik yedek.
- "Olympus Bildirim" şablonu: gönderen adı "Project Olympus · CULBASE", yanıt adresi emirhan@culbase.com.

---

# Olympus Training (2026-10-26)

Spor modülü artık uygulamanın kendisi: **Olympus Training**. Ayrı kurulum yok; aynı uygulama, aynı veriler.

## Marka
- Yeni logo: Olympos zirvesi + halter barı + yıldız (`assets/olympus-training-mark.svg`). Android ikonları, PWA ikonları ve uygulama adı "Olympus Training" olarak güncellendi.
- Yeni açılış: 10 saniyelik video yerine ~2,5 sn'lik logo çizim animasyonu.
- Yeni giriş/kayıt ekranı (Olympus Noir). Form kimlikleri ve giriş fonksiyonları değişmedi.

## Açılış ve gezinme
- Girişten sonra doğrudan **Olympus Training** açılır. Super App (eski hub modülleri) **Training → Ayarlar → Super App**'te.
- Ayarlar → "Uygulama açılışı" ile istersen tekrar Super App ile açılacak şekilde değiştirebilirsin.
- Hub baştan tasarlandı ve ikiye ayrıldı: **Olympus Training** (canlı özetli uygulama kartı) / **Super App** (anı karuseli, durum widget'ı, tüm modüller). Karusel, widget ve selamlama mantığı aynı.
- Geri tuşu: Training ana ekranında uygulamadan çıkar; alt sayfa/oynatıcı/sekme açıkken önce onları kapatır; Super App'ten Training'e döner.
- Dilala modu ve tüm Super App modülleri yerinde duruyor.

## Spor tarafına eklenenler
- **Kardiyo (GPS):** Koşu, yürüyüş, bisiklet. Canlı koyu harita ve rota, mesafe, süre, tempo/hız, kalori, otomatik kilometre bölümleri, duraklat/devam, ekran açık kalır. Seans detayında rota haritası ve bölüm grafiği. Haftalık rapora ve İlerleme'ye kardiyo km'si eklendi.
- **Nefes (4-7-8):** Animasyonlu, 4 turluk nefes egzersizi (Zen yerine).
- **Hareket geçmişi:** Egzersiz detayında ve rekor tablosundan 1RM gelişim grafiği + seans seans setler.
- **Haftalık seri:** Haftalık hedefe üst üste kaç hafta ulaşıldığı (Bugün ve İlerleme'de).
- Kardiyo yorgunluğu mesafeyle orantılı hesaplanıyor; günün antrenman kartı sadece ağırlık seanslarını "tamamlandı" sayıyor.

---

# Olympus Training · Güncelleme 2 (2026-10-27)

## Daha hızlı açılış
- Açılış artık sayfa açıldıktan ~1,3 sn sonra biter (önce: giriş kontrolünden sonra sabit 2,6 sn + animasyon).
- Tüm scriptler `defer`: açılış animasyonu kütüphaneler yüklenmeden hemen çizilir.
- Three.js (+GLTF/DRACO), JS-DOS ve model-viewer artık başlangıçta yüklenmiyor; sadece yarış oyunu, Arcade ve Garaj açılınca indiriliyor.
- Android'in yerel açılış görseli (eski Project Olympus) yeni logoyla değiştirildi; iki farklı açılış ekranı arka arkaya gelmiyor.

## Yeni spor özellikleri
- **Besin günlüğü:** 28 hazır Türk mutfağı besini + özel besin, porsiyon seçimi, öğünlere göre liste; alınan kalori/protein/karb/yağ hedefe karşı (Beslenme sekmesi). Son kullanılanlar üstte.
- **Isınma setleri:** Bileşik hareketlerde çalışma ağırlığına göre otomatik ısınma önerisi (bar×10, %50×5, %70×3, %85×1).
- **Plaka hesaplayıcı:** Halter hareketlerinde taraf başına plakalar, görsel bar çizimi (20/15/10 kg bar seçenekleri).
- **Profil sayfası** (sağ üstteki fotoğraf): ömür boyu istatistikler, 12 başarım (ilerleme çubuklu), aylık antrenman takvimi (günlere dokununca seans), **CSV dışa aktarma**.
- **Hareket kütüphanesi:** 59 hareket, kas/ekipman filtresi, arama, 25 temel harekete Türkçe teknik ipuçları, 1RM geçmişi.
- **Önce/Sonra:** Gelişim fotoğraflarını kaydırıcıyla karşılaştırma, kilo/bel farkıyla.

## Tasarım
- Arena, Sporlar, Sohbet ve Kardiyo merkezi Olympus Noir renk/tipografisini aldı; Training'den açıldıklarında klasik üst bar/alt menü gizlenir, geri tuşu Training'e döner.
- Antrenman ekranında açılan alt sayfalar (Hareketler listesi, Plaka) artık ekranın arkasında kalmıyor (katman hatası düzeltildi).
- Antrenman aksiyonları 2×2 ızgara; beslenme makro etiketleri dar ekrana sığıyor.
