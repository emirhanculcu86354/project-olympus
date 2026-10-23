// Kardiyo & canlı GPS, Strava tarzı özet, polaroid anı duvarı
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 🏃‍♂️ HATASIZ KARDİYO VE GÜVENLİ GEÇİŞ MOTORU
// ==========================================
let cardioInterval;
let cardioSeconds = 0;
let cardioType = 'run';

let cardioMap = null;
let cardioPolyline = null;
let cardioPath = [];
let cardioDistanceKm = 0;
let geoWatchId = null;
let cardioUserMarker = null;

window.openCardioHub = function () {
    const sportsHome = document.getElementById('sports-home');
    const footballMgr = document.getElementById('football-manager');
    const cardioHub = document.getElementById('cardio-hub-screen');

    if (sportsHome) sportsHome.classList.add('hidden');
    if (footballMgr) footballMgr.classList.add('hidden');
    if (cardioHub) {
        cardioHub.classList.remove('hidden');
        cardioHub.style.display = 'flex';
    }
    if (navigator.vibrate) navigator.vibrate(20);
};

window.closeCardioHub = function () {
    const cardioHub = document.getElementById('cardio-hub-screen');
    if (cardioHub) {
        cardioHub.classList.add('hidden');
        cardioHub.style.display = 'none';
    }

    const sportsHome = document.getElementById('sports-home');
    if (sportsHome) sportsHome.classList.remove('hidden');
    if (navigator.vibrate) navigator.vibrate(20);
};

window.startCardioFromHub = function (type, titleName) {
    const cardioHub = document.getElementById('cardio-hub-screen');
    if (cardioHub) {
        cardioHub.classList.add('hidden');
        cardioHub.style.display = 'none';
    }

    if (typeof openCardioScreen === 'function') {
        openCardioScreen(type);
        const titleEl = document.getElementById('cardio-title');
        if (titleEl) titleEl.innerText = `🔥 ${titleName}`;
    }
};

window.openCardioScreen = function (type) {
    cardioType = type;
    const screen = document.getElementById('cardio-screen');
    if (screen) {
        screen.style.display = 'flex';
        screen.classList.remove('hidden');
    }

    const titleEl = document.getElementById('cardio-title');
    if (titleEl) titleEl.innerText = type === 'run' ? "🏃‍♂️ Serbest Koşu" : "🚴‍♂️ Açık Hava Bisiklet";

    // FAB butonunu kardiyo ekranındayken tamamen gizle ki ortalık karışmasın
    const fabContainer = document.querySelector('.fab-container');
    if (fabContainer) fabContainer.style.display = 'none';

    clearInterval(cardioInterval);
    if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId);

    cardioSeconds = 0;
    cardioDistanceKm = 0;
    cardioPath = [];

    updateCardioDisplay();

    const distDisp = document.getElementById('cardio-distance-display');
    const paceDisp = document.getElementById('cardio-pace-display');
    if (distDisp) distDisp.innerText = "0.00";
    if (paceDisp) paceDisp.innerText = "--:--";

    const startBtn = document.getElementById('cardio-start-btn');
    const actionBtns = document.getElementById('cardio-action-btns');
    const liveDash = document.getElementById('cardio-live-dashboard');

    if (startBtn) startBtn.style.display = 'block';
    if (actionBtns) actionBtns.style.display = 'none';
    if (liveDash) liveDash.style.display = 'none';
};

window.closeCardioScreen = function () {
    clearInterval(cardioInterval);
    if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId);

    const cardioScreen = document.getElementById('cardio-screen');
    if (cardioScreen) {
        cardioScreen.style.display = 'none';
        cardioScreen.classList.add('hidden');
    }

    // FAB butonunu güvenli şekilde eski haline (gizli/kapalı) getir
    const fabContainer = document.querySelector('.fab-container');
    if (fabContainer) {
        fabContainer.style.display = 'flex';
        const menu = document.getElementById('fab-menu');
        const cardioMenu = document.getElementById('fab-cardio-menu');
        const mainBtn = document.getElementById('fab-main');
        if (menu) menu.classList.remove('active');
        if (cardioMenu) cardioMenu.classList.remove('active');
        if (mainBtn) mainBtn.classList.remove('active');
        fabContainer.classList.remove('active');
    }

    // Kullanıcıyı güvenli bir şekilde Cardio ekranına döndür
    if (typeof openCardioHub === 'function') {
        openCardioHub();
    }
};

window.startCardioTimer = function () {
    const startBtn = document.getElementById('cardio-start-btn');
    const actionBtns = document.getElementById('cardio-action-btns');
    const liveDash = document.getElementById('cardio-live-dashboard');

    if (startBtn) startBtn.style.display = 'none';
    if (actionBtns) actionBtns.style.display = 'flex';
    if (liveDash) liveDash.style.display = 'flex';

    // Harita kütüphanesi yüklüyse güvenli başlat
    try {
        if (typeof L !== 'undefined') {
            if (!cardioMap) {
                cardioMap = L.map('cardio-map', { zoomControl: false }).setView([40.77, 30.39], 15);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© OS' }).addTo(cardioMap);
                cardioPolyline = L.polyline([], { color: '#ff4a00', weight: 5, opacity: 0.8 }).addTo(cardioMap);
            }
            setTimeout(() => { if (cardioMap) cardioMap.invalidateSize(); }, 300);
        }
    } catch (e) { console.log("Harita yüklenirken hata:", e); }

    if (navigator.vibrate) navigator.vibrate([100, 100, 100]);
    if (typeof showDynamicIsland === 'function') {
        showDynamicIsland(cardioType === 'run' ? "Koşu Başlatıldı" : "Bisiklet Başlatıldı", "GPS Takibi Aktif", "🛰️");
    }

    cardioInterval = setInterval(() => {
        cardioSeconds++;
        updateCardioDisplay();
    }, 1000);
};

function updateCardioDisplay() {
    const h = Math.floor(cardioSeconds / 3600);
    const m = Math.floor((cardioSeconds % 3600) / 60);
    const s = cardioSeconds % 60;
    const timeFormatted = `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    const timerEl = document.getElementById('cardio-timer-display');
    if (timerEl) timerEl.innerText = timeFormatted;
}

window.stopCardioTimer = function () {
    clearInterval(cardioInterval);
    if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId);
    if (navigator.vibrate) navigator.vibrate(50);

    if (typeof saveCardioSession === 'function') {
        saveCardioSession();
    }
};

function initCardioMap() {
    if (!cardioMap) {
        cardioMap = L.map('cardio-map', { zoomControl: false }).setView([40.77, 30.39], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© OS' }).addTo(cardioMap);
        cardioPolyline = L.polyline([], { color: '#ff4a00', weight: 5, opacity: 0.8, shadowBlur: 10, shadowColor: '#ff4a00' }).addTo(cardioMap);
    } else {
        cardioPolyline.setLatLngs([]);
        if (cardioUserMarker) {
            cardioMap.removeLayer(cardioUserMarker);
            cardioUserMarker = null;
        }
    }
    setTimeout(() => { cardioMap.invalidateSize(); }, 300);
}

// YENİ MERKEZLEME FONKSİYONU 📍
window.recenterCardioMap = function () {
    if (lastKnownLocation && cardioMap) {
        cardioMap.flyTo(lastKnownLocation, 17, { animate: true, duration: 1 });
    }
}

function startGPSTracking() {
    if ("geolocation" in navigator) {
        geoWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const newPos = [lat, lng];
                lastKnownLocation = newPos;

                cardioPath.push(newPos);
                cardioPolyline.setLatLngs(cardioPath);

                // MAVİ NOKTAYI GÜNCELLE
                if (!cardioUserMarker) {
                    cardioUserMarker = L.circleMarker(newPos, { radius: 8, fillColor: '#00d2ff', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.9 }).addTo(cardioMap);
                } else {
                    cardioUserMarker.setLatLng(newPos);
                }

                // Sadece ilk sinyalde kamerayı zorla merkeze alır, sonra kullanıcı haritayı özgürce kaydırabilir
                if (isFirstLocation) {
                    cardioMap.setView(newPos, 16);
                    isFirstLocation = false;
                }

                if (cardioPath.length > 1) {
                    const lastPos = cardioPath[cardioPath.length - 2];
                    const d = calculateHaversineDistance(lastPos[0], lastPos[1], lat, lng);
                    cardioDistanceKm += d;
                    document.getElementById('cardio-distance-display').innerText = cardioDistanceKm.toFixed(2);
                }
            },
            (error) => {
                console.error("GPS Sinyali Alınamıyor: ", error);
                if (error.code === 1) {
                    alert("📍 GPS Hatası: Haritanın çalışması için tarayıcıdan (adres çubuğundaki kilit ikonundan) 'Konum' izni vermen gerekiyor patron!");
                }
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
    }
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}


function calculateLivePace() {
    if (cardioDistanceKm > 0 && cardioSeconds > 0) {
        let paceSecondsPerKm = cardioSeconds / cardioDistanceKm;
        let pMin = Math.floor(paceSecondsPerKm / 60);
        let pSec = Math.floor(paceSecondsPerKm % 60);
        let paceFormatted = `${pMin}:${pSec.toString().padStart(2, '0')} /km`;

        const paceEl = document.getElementById('cardio-pace-display');
        if (paceEl) paceEl.innerText = paceFormatted;
    }
}


// 🏆 GEÇMİŞ ANTRENMANLARA KAYDETME (Story ekranı aşağıdaki saveCardioSession içinde açılır)
function recordCardioToHistory() {
    const pace = document.getElementById('cardio-pace-display').innerText;
    const duration = document.getElementById('cardio-timer-display').innerText;
    const title = cardioType === 'run' ? "Açık Hava Koşusu" : "Bisiklet Sürüşü";

    let pastWorkouts = JSON.parse(localStorage.getItem('olympus_past_workouts')) || [];
    pastWorkouts.push({
        id: Date.now(),
        date: new Date().toLocaleDateString('tr-TR'),
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        title: `${cardioType === 'run' ? '🏃‍♂️' : '🚴‍♂️'} ${title}`,
        duration: `${cardioDistanceKm.toFixed(2)} km | ⏱️ ${duration} | ⚡ ${pace}`
    });
    localStorage.setItem('olympus_past_workouts', JSON.stringify(pastWorkouts));
}
// ==========================================
// 📸 POLAROID ANI DUVARI MOTORU
// ==========================================

// Kendi resimlerini eklemek için 'img' kısmına 'resim1.jpg' gibi dosya yolları verebilirsin
const dilalaMemories = [
    { img: 'memories/adana.jpeg', note: 'Kavuşacağımız o günün hayali bile, tüm bu bekleyişlere fazlasıyla değiyor.' },
    { img: 'memories/sahil.jpeg', note: 'Aynı gökyüzüne baktığımız sürece, aramızdaki o yolların hiçbir hükmü yok.' },
    { img: 'memories/eymir.jpeg', note: 'Sıradan bir günü bayrama çeviren tek şey, telefonun ucundaki o tanıdık sesin ve gülüşün.' },
    { img: 'memories/ankara.jpeg', note: 'Seninle içilen sıradan bir kahve bile, dünyanın en pahalı manzarasına bedelmiş.' },
    { img: 'memories/mangal.jpeg', note: 'Zaman dursa ve bu anın içinde sonsuza dek kalsak...' },
    { img: 'memories/kayseri.jpeg', note: 'Ellerini tuttuğum o an anladım; mesafeler sadece yolları uzatırmış, kalpleri değil.' },
    { img: 'memories/dugun.jpeg', note: 'Zamanın durması için saatleri kırmak gerekmezmiş, yanımda gülümsemen yetermiş.' },
    { img: 'memories/sinema.jpeg', note: 'Dünyanın neresinde olursam olayım, ait olduğum ve huzur bulduğum tek evim senin yanın.' },
    { img: 'memories/mersin.jpeg', note: 'Gözlerine her baktığımda, içinde kaybolmaktan korkmadığım o tek evreni buluyorum.' },
    { img: 'memories/park.jpeg', note: 'Bu karedeki mutluluk, omuz omuza kuracağımız o devasa geleceğin sadece küçücük bir fragmanı.' }
];

window.openPolaroidWall = function () {
    document.getElementById('polaroid-wall-screen').style.display = 'flex';
    renderPolaroids();
}

window.closePolaroidWall = function () {
    document.getElementById('polaroid-wall-screen').style.display = 'none';
}

function renderPolaroids() {
    const container = document.getElementById('polaroid-container');
    container.innerHTML = '';

    container.style.display = 'block';
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.overflowY = 'auto'; // Aşağı kaydırmayı açar

    const scrollArea = document.createElement('div');
    scrollArea.style.position = 'relative';
    scrollArea.style.width = '100%';

    // Duvarın boyunu 1600px'den 2600px'e çıkardık (Daha fazla fotoğraf sığsın diye)
    scrollArea.style.height = '2600px';
    container.appendChild(scrollArea);

    // İp sayısını 3'ten 6'ya çıkardık
    const wires = [
        { top: 80 },    // 1. İp
        { top: 320 },   // 2. İp
        { top: 560 },   // 3. İp
        { top: 800 },   // 4. İp
        { top: 1040 },  // 5. İp
        { top: 1280 },  // 6. İp
        { top: 1520 },  // 7. İp
        { top: 1760 },  // 8. İp
        { top: 2000 },  // 9. İp
        { top: 2240 }   // 10. İp
    ];

    function getWireSag(xPercent) {
        const ellipseX = xPercent + 10;
        const dx = (ellipseX - 60) / 60;
        return 40 * (1 + Math.sqrt(1 - dx * dx));
    }

    // 1. İpleri ve Minik Ampulleri Gerelim
    wires.forEach(wire => {
        const wireEl = document.createElement('div');
        wireEl.className = 'horizontal-led-wire';
        wireEl.style.top = `${wire.top}px`;

        // Her ipe 10 yerine 15 LED ekledik, daha ışıl ışıl olacak
        for (let i = 0; i < 15; i++) {
            const bulb = document.createElement('div');
            bulb.className = 'wire-bulb';

            const xPercent = 2 + (Math.random() * 96);
            bulb.style.left = `${xPercent}%`;
            bulb.style.top = `${getWireSag(xPercent)}px`;
            bulb.style.animationDelay = `${Math.random() * 3}s`;
            wireEl.appendChild(bulb);
        }
        scrollArea.appendChild(wireEl);
    });

    // =========================================
    // 📸 UZUN DUVAR İÇİN YENİ SLOTLAR
    // Yeni tellere fotoğraflar için kusursuz pozisyonlar eklendi
    // =========================================
    const photoSlots = [
        { wireIndex: 0, left: 15, rot: -4 },
        { wireIndex: 0, left: 65, rot: 3 },
        { wireIndex: 1, left: 40, rot: -2 },
        { wireIndex: 2, left: 20, rot: 4 },
        { wireIndex: 2, left: 68, rot: -3 },
        { wireIndex: 3, left: 35, rot: 2 },
        { wireIndex: 4, left: 12, rot: -4 },
        { wireIndex: 4, left: 62, rot: 5 },
        { wireIndex: 5, left: 45, rot: -1 }
    ];

    // 2. Fotoğrafları Özel Slotlara As
    dilalaMemories.forEach((mem, index) => {
        const slot = photoSlots[index % photoSlots.length];
        const targetWire = wires[slot.wireIndex];

        const sagY = getWireSag(slot.left);
        const topPos = targetWire.top + sagY - 12;

        const wrap = document.createElement('div');
        wrap.className = 'polaroid-wrap';
        wrap.style.top = `${topPos}px`;
        wrap.style.left = `${slot.left}%`;
        wrap.style.transform = `rotate(${slot.rot}deg)`;
        wrap.style.zIndex = index + 5;

        wrap.innerHTML = `
            <div class="wood-clip" style="transform: translateX(-50%) rotate(${Math.random() * 16 - 8}deg);"></div>
            <div class="polaroid-card" onclick="togglePolaroidFlip(this)">
                <div class="polaroid-front">
                    <img src="${mem.img}" alt="Anı">
                </div>
                <div class="polaroid-back">
                    <div class="polaroid-back-text">${mem.note}</div>
                </div>
            </div>
        `;
        scrollArea.appendChild(wrap);
    });
}
// Fotoğrafa tıklayınca öne alıp döndüren fonksiyon
window.togglePolaroidFlip = function (cardElement) {
    const wrap = cardElement.parentElement;

    // Zaten dönmüşse geri çevir
    if (cardElement.classList.contains('flipped')) {
        cardElement.classList.remove('flipped');
        setTimeout(() => { wrap.classList.remove('active-front'); }, 300);
    } else {
        // Diğer açık olanları kapat
        document.querySelectorAll('.polaroid-card.flipped').forEach(el => {
            el.classList.remove('flipped');
            el.parentElement.classList.remove('active-front');
        });

        // Tıklananı en öne getir ve çevir
        wrap.classList.add('active-front');
        cardElement.classList.add('flipped');
        if (navigator.vibrate) navigator.vibrate(50); // Hissiyat
    }
}

// ==========================================
