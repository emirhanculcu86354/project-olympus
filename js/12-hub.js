// Merkez Üs (Hub): karusel, widget, modül geçişleri, geri tuşu, karşılama
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 🌟 MERKEZ ÜS (HUB) MOTORU
// ==========================================
let hubSlideIndex = 0;
let hubCarouselInterval;

function initHubCarousel() {
    updateHubGreeting();
    loadHubPhotos();
    initHubTouchSwipe();
    updateHubWidget();
    clearInterval(hubCarouselInterval);

    // 3 Saniye logoda bekledikten sonra fotoğrafları döndürmeye başla
    setTimeout(() => {
        hubCarouselInterval = setInterval(nextHubSlide, 4000); // Her 4 saniyede bir değişir
    }, 3000);
}

function nextHubSlide() {
    const track = document.getElementById('hub-carousel-track');
    if (!track) return;
    const slides = track.children;
    if (slides.length <= 1) return;

    hubSlideIndex = (hubSlideIndex + 1) % slides.length;
    track.scrollTo({
        left: hubSlideIndex * track.clientWidth,
        behavior: 'smooth'
    });
}
function initHubTouchSwipe() {
    const track = document.getElementById('hub-carousel-track');
    if (!track) return;

    track.addEventListener('scroll', () => {
        if (!track.clientWidth) return;
        // Kullanıcı elle kaydırdığında index'i güncelle ki otomatik geçiş şaşırmasın
        hubSlideIndex = Math.round(track.scrollLeft / track.clientWidth);
    }, { passive: true });
}
// ==========================================
// 🌟 PROFESYONEL KARARGAH WIDGET MOTORU (6'LI MODÜL)
// ==========================================
let widgetMode = 0;
// 0: Hedef / Motivasyon
// 1: Su Takibi
// 2: Haftalık Streak (Seri)
// 3: KPSS Geri Sayımı
// 4: FYT (Parkur) Hedef Süresi
// 5: Mülakat / Sözlü Sınav Durumu

window.rotateHubWidget = function () {
    widgetMode = (widgetMode + 1) % 6; // 6 farklı mod arasında döner
    updateHubWidget();
    if (navigator.vibrate) navigator.vibrate(20);
};

function updateHubWidget() {
    const titleEl = document.getElementById('hub-widget-title');
    if (!titleEl) return;

    if (widgetMode === 0) {
        titleEl.innerText = "🚀 Hedef POMEM / JASEM / KPSS - Asla Durma!";
    }
    else if (widgetMode === 1) {
        let wData = JSON.parse(localStorage.getItem('olympus_water_obj')) || { amount: 0 };
        let goal = parseInt(localStorage.getItem('olympus_water_goal') || 3000);
        titleEl.innerText = `💧 Su Takibi: ${wData.amount} / ${goal} ml`;
    }
    else if (widgetMode === 2) {
        let streak = JSON.parse(localStorage.getItem('olympus_streak_data')) || [false, false, false, false, false, false, false];
        let activeCount = streak.filter(Boolean).length;
        titleEl.innerText = `🔥 Haftalık Seri: ${activeCount} / 7 Gün Aktif`;
    }
    else if (widgetMode === 3) {
        // KPSS Ön Lisans Sınav Tarihi: 4 Ekim 2026
        const kpssDate = new Date('2026-10-04T00:00:00');
        const now = new Date();
        const diffDays = Math.ceil((kpssDate - now) / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
            titleEl.innerText = `⏳ KPSS Ön Lisans'a Kalan: ${diffDays} Gün`;
        } else {
            titleEl.innerText = `📚 Sınav Vakti Geldi! Başarılar!`;
        }
    }
    else if (widgetMode === 4) {
        // FYT (Parkur) Hedef Bilgisi
        let secData = JSON.parse(localStorage.getItem('olympus_sec_data_polis')) || {};
        let targetTime = secData.parkourTime || "40 sn";
        titleEl.innerText = `🏃‍♂️ FYT Parkur Hedefi: ${targetTime} (Sıkı Çalış!)`;
    }
    else if (widgetMode === 5) {
        // Mülakat / Sözlü Sınav Hatırlatması
        let secData = JSON.parse(localStorage.getItem('olympus_sec_data_polis')) || {};
        let interviewName = secData.interviewTitle || "Komisyon Mülakatı";
        titleEl.innerText = `🎯 Sonraki Aşama: ${interviewName}`;
    }
}
window.addHubPhoto = function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            let photos = JSON.parse(localStorage.getItem('olympus_hub_photos')) || [];
            photos.push(e.target.result); // Fotoğrafı tarayıcı hafızasına (Base64) kaydet
            localStorage.setItem('olympus_hub_photos', JSON.stringify(photos));
            loadHubPhotos();
            alert("Fotoğraf başarıyla eklendi! Döngüye alındı.");
        };
        reader.readAsDataURL(file);
    }
};

function loadHubPhotos() {
    const track = document.getElementById('hub-carousel-track');

    // 1. Sabit Logo Slaytı
    track.innerHTML = `
        <div class="hub-slide" style="min-width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: #000;">
            <img src="icon.png" style="width: 120px; height: 120px; object-fit: contain; filter: drop-shadow(0 0 30px var(--goldnova));">
        </div>
    `;

    // 2. Şanlı Türk Bayrağı Slaytı 🇹🇷 (Akıcı Dalgalanan GIF Modu)
    track.innerHTML += `
        <div class="hub-slide" style="min-width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: #000;">
            <img src="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3RnbDF3YmdmcDVudnM3NDA2dm1wMDM4MDZoeWFlNGw3dnM3d3JiNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/axUE5IV9YoJ9ObTydP/giphy.gif" style="width: 100%; height: 100%; object-fit: cover;" alt="Türk Bayrağı">
        </div>
    `;
    // 3. Kullanıcının Yüklediği Özel Fotoğraflar
    const photos = JSON.parse(localStorage.getItem('olympus_hub_photos')) || [];
    photos.forEach(p => {
        track.innerHTML += `
            <div class="hub-slide" style="min-width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: #000;">
                <img src="${p}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
        `;
    });
}

// 🚀 SİNEMATİK GEÇİŞ MOTORU
// Tek giriş noktası: tüm hub kartları buradan geçer (Garaj kendi sinematiğini aşağıda sarmalar).
window.enterAppFromHub = function (targetId, textString) {
    const overlay = document.getElementById('hub-zoom-overlay');
    const zoomText = document.getElementById('hub-zoom-text');
    const hubScreen = document.getElementById('hub-screen');

    // Finans kendi banka giriş animasyonuna sahip; harf geçişi olmadan direkt açılır
    if (targetId === 'finance-screen') {
        hubScreen.classList.add('hidden');
        openFinanceScreen();
        return;
    }

    // Rengine göre metin ve parlama ayarla
    let textColor = "var(--goldnova)";
    if (targetId === 'arcade-screen') textColor = "#d1a3ff";
    if (targetId === 'business-screen') textColor = "#00d2ff";
    if (targetId === 'olyos-screen') textColor = "#00d2ff";

    zoomText.style.color = textColor;
    zoomText.style.textShadow = `0 0 30px ${textColor}`;
    zoomText.innerText = textString;

    // Animasyonu sıfırla
    zoomText.style.transform = 'scale(1)';
    zoomText.style.opacity = '1';
    zoomText.classList.remove('zoom-fly-animation');

    overlay.classList.remove('hidden'); // Siyah ekranı ve metni göster

    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);

    // 50ms sonra CSS Animasyonunu (Büyüme) tetikle
    setTimeout(() => {
        zoomText.classList.add('zoom-fly-animation');
    }, 50);

    // Animasyon (1.2 saniye) bittiğinde asıl ekrana geç
    setTimeout(() => {
        hubScreen.classList.add('hidden'); // Hub'ı kapat
        overlay.classList.add('hidden'); // Siyah geçişi kapat

        // Hedef uygulamayı aç
        const target = document.getElementById(targetId);
        if (target) {
            target.classList.remove('hidden');
            if (targetId === 'app-content') {
                target.style.display = 'flex';

                // YENİ: Olympus'a giriş yapıldığı an Spotify'ı sahneye al!
                const player = document.getElementById('spotify-floating-player');
                if (player) player.classList.remove('hidden');
            }
            // Modüle özel açılış kancası (Oly avatarını gizleme vb.)
            if (targetId === 'arcade-screen') openArcadeTerminal();
            window.scrollTo(0, 0);
        }
    }, 1200);
};
// ==========================================
// 🚀 HUB'A (MERKEZ ÜSSE) GERİ DÖNÜŞ MOTORU
// ==========================================
const HUB_MODULE_SCREENS = [
    'app-content', 'arcade-screen', 'business-screen', 'finance-screen', 'garage-screen',
    'racer-screen', 'kpss-screen', 'security-screen', 'olyscore-screen', 'olysocial-screen',
    'olyos-screen', 'maintain-screen'
];

window.returnToHub = function () {
    updateHubGreeting();
    // 1. Müzik çaları gizle
    const player = document.getElementById('spotify-floating-player');
    if (player) player.classList.add('hidden');

    // 2. Arkada ses/işlemci tüketmeye devam edecek motorları durdur
    const racer = document.getElementById('racer-screen');
    if (racer && !racer.classList.contains('hidden') && typeof quitRacerGame === 'function') quitRacerGame();
    if (window.dosCommandInterface) {
        try { window.dosCommandInterface.exit(); } catch (e) { }
        window.dosCommandInterface = null;
    }

    // 3. Tüm açık olabilecek modülleri (Odaları) gizle
    HUB_MODULE_SCREENS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('hidden');
        el.style.display = ''; // Modüllerin bıraktığı inline display:flex/block kalıntısını temizle
    });

    // 4. Hub ekranını tekrar göster
    const hubScreen = document.getElementById('hub-screen');
    if (hubScreen) {
        hubScreen.classList.remove('hidden');
        hubScreen.style.display = 'flex';
    }

    // Uygulama içi "geri" butonuyla dönüldüyse artık gereksiz kalan geçmiş kaydını tüket
    if (history.state && history.state.olyModule) history.back();

    if (navigator.vibrate) navigator.vibrate(30);
};
// ==========================================
// ↩️ DONANIM GERİ TUŞU (ANDROID) & TARAYICI GERİ
// ==========================================
// Tek sayfalık uygulamada geri tuşu normalde uygulamayı kapatır. Hub gizlendiğinde (bir modüle girildiğinde)
// tarayıcı geçmişine bir kayıt eklenir; geri tuşu bu kaydı tüketip en üstteki ekranı kapatır.
// Capacitor, WebView'de geri gidilebiliyorsa geri tuşunu otomatik olarak buraya yönlendirir.
const BACK_CLOSERS = [
    ['racer-screen', () => quitRacerGame()],
    ['security-screen', () => closeSecurityMode()],
    ['kpss-screen', () => closeKPSSCenter()],
    ['arcade-screen', () => closeArcadeTerminal()],
    ['olyscore-screen', () => closeOlyScore()],
    ['olysocial-screen', () => closeOlySocial()],
    ['maintain-screen', () => closeMaintainScreen()],
    ['finance-screen', () => closeWealthApp()],
    ['garage-screen', () => closeGarageScreen()]
];

function isScreenOpen(id) {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none';
}

function isInsideModule() {
    return !isScreenOpen('hub-screen') && !isScreenOpen('login-screen') && !!auth.currentUser;
}

function pushModuleHistory() {
    if (!(history.state && history.state.olyModule)) history.pushState({ olyModule: true }, '');
}

window.addEventListener('popstate', () => {
    if (!isInsideModule()) return;
    const closer = BACK_CLOSERS.find(([id]) => isScreenOpen(id));
    if (closer) closer[1]();
    else returnToHub();
    // Hâlâ bir modülün içindeysek (ör. Akademi'den Olympus'a dönüldü) bir sonraki geri tuşu için kaydı yenile
    if (isInsideModule()) pushModuleHistory();
});

// Hub her gizlendiğinde (hangi modül açarsa açsın) geçmiş kaydını ekle
document.addEventListener('DOMContentLoaded', () => {
    const hub = document.getElementById('hub-screen');
    if (!hub) return;
    new MutationObserver(() => {
        if (isInsideModule()) pushModuleHistory();
    }).observe(hub, { attributes: true, attributeFilter: ['class', 'style'] });
});

// ==========================================
// 🌟 HUB KARŞILAMA MOTORU (DİNAMİK SAAT VE İSİM)
// ==========================================
window.updateHubGreeting = function () {
    // 1. Saate Göre Selamlama
    const hour = new Date().getHours();
    let greeting = "İyi Geceler";

    if (hour >= 5 && hour < 12) {
        greeting = "Günaydın";
    } else if (hour >= 12 && hour < 18) {
        greeting = "İyi Günler";
    } else if (hour >= 18 && hour < 22) {
        greeting = "İyi Akşamlar";
    }

    const greetingEl = document.getElementById('hub-greeting-text');
    if (greetingEl) greetingEl.innerText = greeting + ",";

    // 2. Kullanıcı Profil Verisini Çek
    const user = firebase.auth().currentUser;
    let name = "Şampiyon";
    let photo = "icon.png";

    if (user && user.displayName) {
        name = user.displayName;
        photo = user.photoURL || "icon.png";
    } else {
        // Yedek: Eğer henüz yüklenmediyse localStorage'dan al
        const localName = document.getElementById('profile-name-display');
        if (localName && localName.innerText !== "Yükleniyor...") {
            name = localName.innerText;
        }
        const localImg = document.getElementById('header-profile-img');
        if (localImg && localImg.src) {
            photo = localImg.src;
        }
    }

    const nameEl = document.getElementById('hub-greeting-name');
    if (nameEl) nameEl.innerText = name;

    const imgEl = document.getElementById('hub-header-img');
    if (imgEl) imgEl.src = photo;
};
// ==========================================
