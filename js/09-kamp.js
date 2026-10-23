// Doğa günlüğü (kamp): sayfalar, malzeme listesi, GPS, hava durumu, planlar
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// DOĞA GÜNLÜĞÜ (KAMP) SAYFA ÇEVİRME MOTORU
// ==========================================
let currentCampPage = 0; // Artık kapaktan (0. sayfa) başlıyor
const totalCampPages = 5;

window.openCampBook = function () {
    document.getElementById('camp-book-screen').classList.remove('hidden');

    // Tüm sayfaları kapağa geri sar
    for (let i = 0; i <= totalCampPages; i++) {
        let p = document.getElementById('page-' + i);
        if (p) p.classList.remove('turned');
    }
    currentCampPage = 0;

    // Defterin zıplayarak ekrana gelme animasyonunu tetikle
    const book = document.getElementById('camp-book');
    book.classList.remove('camp-book-anim');
    void book.offsetWidth; // Animasyonu sıfırlamak için ufak bir trick
    book.classList.add('camp-book-anim');

    loadCampData();
    initCampSwipe();
    // YENİ: Hava durumunu çek ve Geçmiş rotaları yükle
    fetchCampWeatherData();
    renderSavedRoutes();
    renderCampPlans();
    renderCampDiary();
    setTimeout(() => {
        const cover = document.getElementById('page-0');
        if (cover) {
            cover.classList.add('turned');
            currentCampPage = 1;
            if (navigator.vibrate) navigator.vibrate([40, 60]);
        }
    }, 1200);

    // 1 saniye sonra deri kapağı otomatik aç!
    setTimeout(() => {
        const cover = document.getElementById('page-0');
        if (cover) {
            cover.classList.add('turned');
            currentCampPage = 1;
            if (navigator.vibrate) navigator.vibrate([40, 60]);
        }
    }, 1200); // 1.2 saniye kapağı gösterip açar
};

window.closeCampBook = function () {
    document.getElementById('camp-book-screen').classList.add('hidden');
};

function initCampSwipe() {
    const book = document.getElementById('camp-book');
    let startX = 0;

    // Önceki event listener'ları temizlemek için (üst üste binmeyi önler)
    book.ontouchstart = (e) => { startX = e.touches[0].clientX; };

    book.ontouchend = (e) => {
        let endX = e.changedTouches[0].clientX;
        let diff = startX - endX;

        // Sola kaydırma (İleri git, sayfayı çevir)
        if (diff > 50) {
            if (currentCampPage < totalCampPages) {
                document.getElementById('page-' + currentCampPage).classList.add('turned');
                currentCampPage++;
                if (navigator.vibrate) navigator.vibrate(30);
            }
        }
        // Sağa kaydırma (Geri dön, sayfayı kapat)
        else if (diff < -50) {
            if (currentCampPage > 1) {
                currentCampPage--;
                document.getElementById('page-' + currentCampPage).classList.remove('turned');
                if (navigator.vibrate) navigator.vibrate(30);
            }
        }
    };
}

// ==========================================
// KAMP VERİ VE CHECKLIST YÖNETİMİ
// ==========================================
let campItems = JSON.parse(localStorage.getItem('olympus_camp_items')) || [
    { id: 1, text: "Çadır & Uyku Tulumu", done: false },
    { id: 2, text: "Kafa Lambası & Pil", done: false },
    { id: 3, text: "Kamp Ocağı & Gaz", done: false },
    { id: 4, text: "Bıçak & Çakmak", done: false }
];

function loadCampData() {
    const notes = localStorage.getItem('olympus_camp_notes');
    if (notes) document.getElementById('camp-notes').value = notes;
    renderCampChecklist();
}

window.saveCampNotes = function () {
    const noteText = document.getElementById('camp-notes').value.trim();
    if (noteText !== '') {
        let entries = JSON.parse(localStorage.getItem('olympus_camp_diary_entries')) || [];
        // 1. Sayfadaki anlık hava durumu ve tarih metnini çekiyoruz
        const metaText = document.getElementById('camp-meta-info').innerText;

        entries.push({
            id: Date.now(),
            date: new Date().toLocaleDateString('tr-TR'),
            meta: metaText,
            text: noteText
        });

        localStorage.setItem('olympus_camp_diary_entries', JSON.stringify(entries));
        document.getElementById('camp-notes').value = ''; // Yazıyı temizle

        renderCampDiary(); // 5. Sayfayı güncelle

        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        alert("Günlük doğaya kazındı! 🌲🔥 (5. Sayfaya eklendi)");
    } else {
        alert("Sayfaya işlemek için önce kalemi eline alıp bir şeyler yazmalısın!");
    }
};
window.renderCampDiary = function () {
    const container = document.getElementById('saved-diary-list');
    const entries = JSON.parse(localStorage.getItem('olympus_camp_diary_entries')) || [];

    container.innerHTML = '';
    if (entries.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#a1887f; font-family:\'Caveat\', cursive; font-size:24px;">Henüz anı yazılmadı.</p>';
        return;
    }

    // En yeni anı en üstte
    entries.reverse().forEach(entry => {
        container.innerHTML += `
            <div class="camp-log-item" style="flex-direction:column; align-items:flex-start; margin-bottom: 20px; border-bottom: 2px dashed rgba(139, 90, 43, 0.4); padding-bottom:15px;">
                <div style="display:flex; justify-content:space-between; width:100%; margin-bottom: 5px;">
                    <strong style="font-size:22px; color:#5d4037;">📅 ${entry.date}</strong>
                    <button class="eraser-btn" onclick="deleteCampDiary(${entry.id})">🧽</button>
                </div>
                <div style="font-size:14px; color:#8b5a2b; margin-bottom: 10px; font-style: italic; font-family:sans-serif;">${entry.meta}</div>
                <div style="font-size:24px; color:#2c1a0e; white-space: pre-wrap; line-height: 1.2;">${entry.text}</div>
            </div>
        `;
    });
};
window.deleteCampDiary = function (id) {
    if (confirm("Bu anıyı defterin yapraklarından silmek istediğine emin misin?")) {
        let entries = JSON.parse(localStorage.getItem('olympus_camp_diary_entries')) || [];
        entries = entries.filter(e => e.id !== id);
        localStorage.setItem('olympus_camp_diary_entries', JSON.stringify(entries));
        renderCampDiary();
        if (navigator.vibrate) navigator.vibrate([30, 30]);
    }
};

window.renderCampChecklist = function () {
    const container = document.getElementById('camp-checklist');
    container.innerHTML = '';
    campItems.forEach(item => {
        container.innerHTML += `
            <div class="camp-item ${item.done ? 'checked' : ''}" onclick="toggleCampItem(${item.id})">
                <div class="camp-check"></div>
                <span>${item.text}</span>
            </div>
        `;
    });
    localStorage.setItem('olympus_camp_items', JSON.stringify(campItems));
};

window.toggleCampItem = function (id) {
    const item = campItems.find(i => i.id === id);
    if (item) {
        item.done = !item.done;
        if (item.done && navigator.vibrate) navigator.vibrate(20);
        renderCampChecklist();
    }
};

window.addCampItem = function () {
    const input = document.getElementById('new-camp-item');
    if (input.value.trim() !== "") {
        campItems.push({ id: Date.now(), text: input.value, done: false });
        input.value = "";
        renderCampChecklist();
        if (navigator.vibrate) navigator.vibrate(20);
    }
};

// ==========================================
// KAMP GPS & HARİTA MOTORU (NİHAİ SÜRÜM)
// ==========================================
let map = null;
let routeLine = null;
let userMarker = null; // Haritadaki mavi nokta
let routeCoords = [];
let gpsWatchId = null;
let totalDistance = 0;
let gpsStartTime = null;
let gpsTimerInterval = null;
let lastTimeStr = "00:00"; // Kaydetmek için süreyi tutuyoruz

window.startGPS = function () {
    if (!navigator.geolocation) { alert("Cihazınız GPS desteklemiyor."); return; }

    document.getElementById('btn-start-gps').classList.add('hidden');
    document.getElementById('btn-stop-gps').classList.remove('hidden');
    document.getElementById('btn-reset-gps').classList.remove('hidden');

    if (!map) {
        map = L.map('gps-map-area').setView([39.92077, 32.85411], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
        routeLine = L.polyline([], { color: '#d35400', weight: 5, opacity: 0.8 }).addTo(map);

        // Mavi konum yuvarlağını (Marker) oluştur
        userMarker = L.circleMarker([0, 0], { color: '#2980b9', fillColor: '#3498db', fillOpacity: 1, radius: 8 }).addTo(map);
    }

    gpsStartTime = Date.now();
    clearInterval(gpsTimerInterval);
    gpsTimerInterval = setInterval(() => {
        const diff = Math.floor((Date.now() - gpsStartTime) / 1000);
        const m = String(Math.floor(diff / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        lastTimeStr = `${m}:${s}`;
        document.getElementById('gps-time').innerText = lastTimeStr;
    }, 1000);

    setTimeout(() => { map.invalidateSize(); }, 300);

    gpsWatchId = navigator.geolocation.watchPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const newLatLng = new L.LatLng(lat, lng);

            // Mavi noktayı ve haritayı güncelle
            userMarker.setLatLng(newLatLng);
            map.setView(newLatLng, 17);

            if (routeCoords.length > 0) {
                totalDistance += routeCoords[routeCoords.length - 1].distanceTo(newLatLng);
                document.getElementById('gps-distance').innerText = (totalDistance / 1000).toFixed(2);
            }
            routeCoords.push(newLatLng);
            routeLine.setLatLngs(routeCoords);
        },
        (error) => { console.log("GPS hatası:", error); },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
    );
    if (navigator.vibrate) navigator.vibrate([50, 50]);
};

// YENİ: Konumuma Geri Dön Butonu
window.centerMapToUser = function () {
    if (map && routeCoords.length > 0) {
        map.setView(routeCoords[routeCoords.length - 1], 17);
        if (navigator.vibrate) navigator.vibrate(20);
    } else {
        alert("Henüz konum verisi alınamadı. Rotayı başlatmalısın.");
    }
};

// YENİ: Rotayı Sıfırlama Butonu
window.resetGPS = function () {
    if (confirm("Mevcut rota çizimini sıfırlamak istediğine emin misin?")) {
        routeCoords = [];
        totalDistance = 0;
        if (routeLine) routeLine.setLatLngs([]);
        document.getElementById('gps-distance').innerText = "0.00";
        gpsStartTime = Date.now(); // Süreyi başa sar
        if (navigator.vibrate) navigator.vibrate(30);
    }
};

window.stopGPS = function () {
    if (gpsWatchId) navigator.geolocation.clearWatch(gpsWatchId);
    clearInterval(gpsTimerInterval);

    document.getElementById('btn-stop-gps').classList.add('hidden');
    document.getElementById('btn-reset-gps').classList.add('hidden');
    document.getElementById('btn-start-gps').classList.remove('hidden');
    document.getElementById('btn-start-gps').innerText = "📍 Yeni Rota";

    // Rotayı Hafızaya (Geçmiş Keşiflere) Kaydet
    if (totalDistance > 0 || lastTimeStr !== "00:00") {
        let routes = JSON.parse(localStorage.getItem('olympus_camp_routes')) || [];
        routes.push({
            id: Date.now(),
            date: new Date().toLocaleDateString('tr-TR'),
            distance: (totalDistance / 1000).toFixed(2),
            duration: lastTimeStr
        });
        localStorage.setItem('olympus_camp_routes', JSON.stringify(routes));
        renderSavedRoutes(); // 4. Sayfayı anında güncelle
    }

    if (navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => { alert(`Keşif tamamlandı!\n\n🌲 Mesafe: ${(totalDistance / 1000).toFixed(2)} km\n⏱️ Süre: ${lastTimeStr}\n\nRota 4. Sayfaya (Geçmiş Keşifler) işlendi!`); }, 500);
};
// ==========================================
// KAMP HAVA DURUMU VE GEÇMİŞ ROTA MOTORU
// ==========================================
window.fetchCampWeatherData = function () {
    const metaInfo = document.getElementById('camp-meta-info');
    if (!navigator.geolocation) {
        metaInfo.innerHTML = "Doğa ruhu (GPS) kapalı. 🌲";
        return;
    }

    // Telefonun anlık konumunu alıyoruz
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
            // Şifresiz ve ücretsiz Open-Meteo uydusuna bağlanıyoruz
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const weatherData = await weatherRes.json();
            const temp = weatherData.current_weather.temperature;
            const wind = weatherData.current_weather.windspeed;

            const now = new Date();
            const dateStr = now.toLocaleDateString('tr-TR');
            const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

            metaInfo.innerHTML = `📅 ${dateStr} - ${timeStr} <br> ⛅ Sıcaklık: ${temp}°C | 💨 Rüzgar: ${wind} km/h`;
        } catch (err) {
            metaInfo.innerHTML = `📍 Koordinatlar: ${lat.toFixed(2)}, ${lon.toFixed(2)} (Hava durumu alınamadı)`;
        }
    }, () => {
        metaInfo.innerHTML = "Doğa ruhu (GPS) izni reddedildi. 🌲";
    });
};

// ==========================================
// KAMP PLANLARI VE GEÇMİŞ ROTA YÖNETİMİ
// ==========================================

// 1. Gelecek Planları Yükle
window.renderCampPlans = function () {
    const container = document.getElementById('camp-plans-list');
    const plans = JSON.parse(localStorage.getItem('olympus_camp_plans')) || [];

    container.innerHTML = '';
    if (plans.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#a1887f; font-family:\'Caveat\', cursive; font-size:24px;">Henüz kamp planı yok.</p>';
        return;
    }

    plans.forEach(plan => {
        container.innerHTML += `
            <div class="camp-log-item" style="flex-direction:column; align-items:flex-start;">
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <strong style="font-size:26px;">🏕️ ${plan.text}</strong>
                    <button class="eraser-btn" onclick="deleteCampPlan(${plan.id})">🧽</button>
                </div>
                <div class="camp-countdown" data-target="${plan.datetime}">Hesaplanıyor...</div>
            </div>
        `;
    });
};

// 2. Yeni Plan Ekle
window.addCampPlan = function () {
    const inputStr = document.getElementById('new-plan-item').value.trim();
    const inputDate = document.getElementById('new-plan-date').value;

    if (inputStr !== '' && inputDate !== '') {
        let plans = JSON.parse(localStorage.getItem('olympus_camp_plans')) || [];

        plans.push({
            id: Date.now(),
            text: inputStr,
            datetime: new Date(inputDate).toISOString()
        });

        // Planları tarihe göre sırala (En yakın tarih en üstte)
        plans.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

        localStorage.setItem('olympus_camp_plans', JSON.stringify(plans));

        document.getElementById('new-plan-item').value = '';
        document.getElementById('new-plan-date').value = '';

        renderCampPlans();
        if (navigator.vibrate) navigator.vibrate(20);
    } else {
        alert("Hedefi kurabilmem için lütfen hem bir rota adı yaz hem de tarih seç!");
    }
};
// ==========================================
// KAMP GERİ SAYIM ANLIK GÜNCELLEME MOTORU
// ==========================================
setInterval(() => {
    document.querySelectorAll('.camp-countdown').forEach(el => {
        const targetStr = el.getAttribute('data-target');
        if (!targetStr) return;

        const target = new Date(targetStr).getTime();
        const now = new Date().getTime();
        const diff = target - now;

        if (diff > 0) {
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            el.innerText = `⏳ Kalkışa: ${d}g ${h}s ${m}d ${s}sn`;
        } else {
            el.innerText = "🔥 KAMP VAKTİ GELDİ!";
            el.style.color = "#27ae60";
            el.style.borderColor = "#27ae60";
        }
    });
}, 1000);

// 3. Plan Sil (Silgi)
window.deleteCampPlan = function (id) {
    let plans = JSON.parse(localStorage.getItem('olympus_camp_plans')) || [];
    plans = plans.filter(p => p.id !== id);
    localStorage.setItem('olympus_camp_plans', JSON.stringify(plans));
    renderCampPlans();
    if (navigator.vibrate) navigator.vibrate(20);
};

// 4. Geçmiş Keşifleri Yükle (Değiştirildi)
window.renderSavedRoutes = function () {
    const container = document.getElementById('saved-routes-list');
    const routes = JSON.parse(localStorage.getItem('olympus_camp_routes')) || [];

    container.innerHTML = '';
    if (routes.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#a1887f; font-family:\'Caveat\', cursive; font-size:22px;">Henüz rota kaydedilmedi.</p>';
        return;
    }

    routes.reverse().forEach(r => {
        container.innerHTML += `
            <div class="camp-log-item" style="flex-direction:column; align-items:flex-start;">
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <strong>📍 ${r.date}</strong>
                    <button class="eraser-btn" onclick="deleteSavedRoute(${r.id})">🧽</button>
                </div>
                <div style="font-size: 20px; color:#5d4037; font-family:'Caveat', cursive;">Mesafe: ${r.distance} km | Süre: ${r.duration}</div>
            </div>
        `;
    });
};

// 5. Geçmiş Keşfi Sil (Silgi)
window.deleteSavedRoute = function (id) {
    if (confirm("Bu keşif kaydını defterden silmek istediğine emin misin?")) {
        let routes = JSON.parse(localStorage.getItem('olympus_camp_routes')) || [];
        routes = routes.filter(r => r.id !== id);
        localStorage.setItem('olympus_camp_routes', JSON.stringify(routes));
        renderSavedRoutes();
        if (navigator.vibrate) navigator.vibrate([30, 30]);
    }
};
// ==========================================
