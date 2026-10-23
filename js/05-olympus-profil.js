// Streak takvimi, gelişim galerisi, profil, anatomi kartı
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 📅 STREAK TAKVİMİ VE FOTOĞRAF GALERİSİ
// ==========================================
window.renderStreakCalendar = function () {
    const container = document.getElementById('streak-days');
    if (!container) return;

    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    // JavaScript'te 0 = Pazar'dır. Bizim dizimizde 6 = Pazar, 0 = Pazartesi olacak.
    let todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    // Gerçek bir sistemde idman veya görev tamamlanınca buralar true yapılır.
    // Şimdilik motivasyon için kullanıcının uygulamaya girdiği anı (bugünü) yeşil yakıyoruz!
    let streakData = JSON.parse(localStorage.getItem('olympus_streak_data')) || [false, false, false, false, false, false, false];

    // Hafta başındaysak takvimi sıfırla
    if (todayIndex === 0 && new Date().getHours() < 2) streakData = [false, false, false, false, false, false, false];

    streakData[todayIndex] = true;
    localStorage.setItem('olympus_streak_data', JSON.stringify(streakData));

    container.innerHTML = '';
    days.forEach((day, index) => {
        let isActive = streakData[index];
        let activeClass = isActive ? 'active' : '';
        container.innerHTML += `
            <div class="streak-day ${activeClass}">
                <div class="streak-circle">${day.charAt(0)}</div>
                <span class="streak-day-label">${day}</span>
            </div>
        `;
    });
};

window.addProgressPhoto = function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                // Canvas ile resmi küçültme (Kompresyon)
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // Telefon kameraları çok büyük çeker, 800px'e sınırla
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Küçültülmüş resmi Base64'e çevir (Kalite %70)
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

                let photos = JSON.parse(localStorage.getItem('olympus_progress_photos')) || [];
                if (photos.length >= 10) {
                    alert("Maksimum 10 fotoğraf yükleyebilirsin. Yenisini eklemek için lütfen eskilerden birini sil!");
                    return;
                }

                photos.push({
                    id: Date.now(),
                    date: new Date().toLocaleDateString('tr-TR'),
                    img: compressedBase64, // Sıkıştırılmış veriyi kaydet
                    measurements: typeof getProgressPhotoMeasurements === 'function' ? getProgressPhotoMeasurements() : {}
                });

                localStorage.setItem('olympus_progress_photos', JSON.stringify(photos));
                renderProgressGallery();
                if (navigator.vibrate) navigator.vibrate(20);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
};

window.renderProgressGallery = function () {
    const container = document.getElementById('progress-gallery');
    if (!container) return;

    let photos = JSON.parse(localStorage.getItem('olympus_progress_photos')) || [];

    container.innerHTML = '';
    if (photos.length === 0) {
        container.innerHTML = '<p style="color:#888; font-size:12px; margin:auto; padding:20px 0; font-style:italic;">Formunu belgelemek için bir fotoğraf ekle.</p>';
        return;
    }

    // En yeni fotoğraf en solda (başta) gözüksün diye reverse atıyoruz
    photos.slice().reverse().forEach(p => {
        container.innerHTML += `
            <div class="progress-item">
                <img src="${p.img}" alt="${p.date} gelişim fotoğrafı" onclick="openProgressPhoto(${p.id}, event)">
                <button class="progress-delete" onclick="deleteProgressPhoto(${p.id}, event)">✖</button>
                <div class="progress-date">${p.date}</div>
            </div>
        `;
    });
};
// Görüntüleyicide gösterilen fotoğrafın sırasını takip ederiz.
let activeProgressPhotoId = null;
let progressViewerDidSwipe = false;

function getProgressPhotoMeasurements() {
    const profile = JSON.parse(localStorage.getItem('olympus_profile')) || {};
    return { w: profile.w, chest: profile.chest, waist: profile.waist, arm: profile.arm };
}

function formatProgressPhotoMeasurements(photo) {
    // Eski kayıtlarda anlık ölçü yoksa mevcut profil ölçülerini kullanarak geriye dönük uyumluluk sağlarız.
    const measurements = photo.measurements || getProgressPhotoMeasurements();
    const values = [
        measurements.w && `Kilo ${measurements.w} kg`,
        measurements.chest && `Göğüs ${measurements.chest} cm`,
        measurements.waist && `Bel ${measurements.waist} cm`,
        measurements.arm && `Kol ${measurements.arm} cm`
    ].filter(Boolean);
    return values.length ? values.join(' · ') : 'Bu güne ait ölçü kaydı bulunmuyor';
}

window.openProgressPhoto = function (id, event) {
    if (event) event.stopPropagation();
    activeProgressPhotoId = id;
    updateFullscreenPhoto();
    const viewer = document.getElementById('fullscreen-image-viewer');
    // Görüntüleyiciyi tüm uygulama katmanlarının (mesaj sayfası dahil) üstünde tutarız.
    document.body.appendChild(viewer);
    viewer.classList.add('active');
    viewer.setAttribute('aria-hidden', 'false');
    if (navigator.vibrate) navigator.vibrate(10);
};

function updateFullscreenPhoto() {
    const photos = JSON.parse(localStorage.getItem('olympus_progress_photos')) || [];
    const photo = photos.find(p => p.id === activeProgressPhotoId);
    if (!photo) return closeFullscreenPhoto();

    document.getElementById('fullscreen-image-element').src = photo.img;
    document.getElementById('fullscreen-photo-date').textContent = photo.date;
    document.getElementById('fullscreen-photo-measurements').textContent = formatProgressPhotoMeasurements(photo);
}

window.changeFullscreenPhoto = function (direction, event) {
    if (event) event.stopPropagation();
    const photos = JSON.parse(localStorage.getItem('olympus_progress_photos')) || [];
    const currentIndex = photos.findIndex(p => p.id === activeProgressPhotoId);
    if (currentIndex === -1 || photos.length < 2) return;

    // Liste sınırlarında başa/sona dönerek akıcı bir galeri deneyimi sunarız.
    activeProgressPhotoId = photos[(currentIndex + direction + photos.length) % photos.length].id;
    updateFullscreenPhoto();
};

// Eski çağrıları desteklemek için bu yardımcı fonksiyon korunur.
window.openFullscreenPhoto = function (src) {
    const photos = JSON.parse(localStorage.getItem('olympus_progress_photos')) || [];
    const photo = photos.find(p => p.img === src);
    if (photo) openProgressPhoto(photo.id);
};

window.closeFullscreenPhoto = function () {
    const viewer = document.getElementById('fullscreen-image-viewer');
    viewer.classList.remove('active');
    viewer.setAttribute('aria-hidden', 'true');
};

// Kaydırma sonrasındaki sentetik tıklamayı kapatma tıklaması olarak değerlendirmeyiz.
window.handleProgressViewerClick = function (event) {
    if (progressViewerDidSwipe) {
        progressViewerDidSwipe = false;
        event.stopPropagation();
        return;
    }
    closeFullscreenPhoto();
    event.stopPropagation();
};

// Mobilde yatay kaydırma ile önceki/sonraki gelişim fotoğrafına geçiş yapılır.
document.getElementById('fullscreen-image-viewer').addEventListener('touchstart', function (event) {
    progressViewerTouchStartX = event.changedTouches[0].clientX;
}, { passive: true });

document.getElementById('fullscreen-image-viewer').addEventListener('touchend', function (event) {
    if (progressViewerTouchStartX === null) return;
    const distance = event.changedTouches[0].clientX - progressViewerTouchStartX;
    progressViewerTouchStartX = null;
    if (Math.abs(distance) > 50) {
        // Kaydırma sonrası oluşabilecek tıklamanın görüntüleyiciyi kapatmasını önleriz.
        progressViewerDidSwipe = true;
        changeFullscreenPhoto(distance < 0 ? 1 : -1);
    }
});

window.deleteProgressPhoto = function (id, event) {
    if (event) event.stopPropagation();
    if (confirm("Bu gelişim fotoğrafını silmek istediğine emin misin?")) {
        let photos = JSON.parse(localStorage.getItem('olympus_progress_photos')) || [];
        photos = photos.filter(p => p.id !== id);
        localStorage.setItem('olympus_progress_photos', JSON.stringify(photos));
        renderProgressGallery();
        if (navigator.vibrate) navigator.vibrate(30);
    }
}

window.save1RM = function () {
    const p = JSON.parse(localStorage.getItem('olympus_profile')) || {};
    const b = document.getElementById('m-bench').value; const s = document.getElementById('m-squat').value; const dl = document.getElementById('m-dl').value;
    p.bench = b; p.squat = s; p.dl = dl; localStorage.setItem('olympus_profile', JSON.stringify(p));
    let volHistory = JSON.parse(localStorage.getItem('olympus_vol_history')) || [];
    volHistory.push({ date: new Date().toLocaleDateString('tr-TR'), bench: b, squat: s, dl: dl });
    localStorage.setItem('olympus_vol_history', JSON.stringify(volHistory));
    if (typeof showDynamicIsland === 'function') showDynamicIsland("✅ Ölçüler Kaydedildi!");

    syncDataToCloud();
    openTrackingModal('volume');
}

window.saveMacros = function () {
    const cal = document.getElementById('m-cal').value;
    if (cal) {
        let calHistory = JSON.parse(localStorage.getItem('olympus_cal_history')) || [];
        calHistory.push({ date: new Date().toLocaleDateString('tr-TR'), val: cal }); localStorage.setItem('olympus_cal_history', JSON.stringify(calHistory));
        syncDataToCloud();
        openTrackingModal('macros');
    }
    if (typeof showDynamicIsland === 'function') showDynamicIsland("✅ Ölçüler Kaydedildi!");
}
// ==========================================
// 🍏 FATSECRET DEEP LINK (UYGULAMA AÇICI) MOTORU
// ==========================================
window.openFatSecretApp = function () {
    if (navigator.vibrate) navigator.vibrate(20);

    // Android için doğrudan uygulamayı tetikleyen, yoksa Google Play'e atan kod
    const androidIntent = "intent://#Intent;package=com.fatsecret.android;scheme=fatsecret;end";
    // iOS için özel şema
    const iosScheme = "fatsecret://";
    // Uygulama yoksa veya bilgisayardaysan gidilecek yedek web linki
    const webLink = "https://www.fatsecret.com.tr/";

    // Kullanıcının hangi cihazda olduğunu tespit et
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    if (/android/i.test(userAgent)) {
        // Android cihazsa Intent ile uygulamaya fırlat
        window.location.href = androidIntent;
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        // iOS cihazsa uygulamayı açmayı dene, 1.5 saniye içinde açılmazsa App Store/Web'e at
        setTimeout(() => {
            window.location.href = webLink;
        }, 1500);
        window.location.href = iosScheme;
    } else {
        // Bilgisayardaysa (veya tablet web görünümündeyse) direkt yeni sekmede web sitesini aç
        window.open(webLink, '_blank');
    }
};

// GÜNCELLENMİŞ: Akıllı Ölçüler ve Trend Okları
window.loadProfileData = function () {
    const p = JSON.parse(localStorage.getItem('olympus_profile'));
    // Bir önceki (eski) ölçüleri de çekiyoruz ki kıyaslama yapabilelim
    const p_old = JSON.parse(localStorage.getItem('olympus_profile_old')) || {};
    const grid = document.getElementById('profile-stats-grid');

    if (!grid) return;
    grid.innerHTML = '';

    if (!p) {
        grid.innerHTML = '<p style="color:#888; font-size:12px; grid-column:span 2; text-align:center;">Ölçüm verisi yok. Takip merkezinden girin.</p>';
    } else {
        const metrics = [
            { key: 'w', label: 'Kilo', unit: 'kg' },
            { key: 'height', label: 'Boy', unit: 'cm' },
            { key: 'waist', label: 'Bel', unit: 'cm' },
            { key: 'chest', label: 'Göğüs', unit: 'cm' },
            { key: 'shoulder', label: 'Omuz', unit: 'cm' },
            { key: 'arm', label: 'Kol', unit: 'cm' },
            { key: 'hips', label: 'Basen', unit: 'cm' },
            { key: 'calf', label: 'Kalf', unit: 'cm' },
            { key: 'thigh', label: 'İç Bacak', unit: 'cm' }
        ];

        metrics.forEach(m => {
            if (p[m.key]) {
                let currentVal = parseFloat(p[m.key]);
                let oldVal = parseFloat(p_old[m.key]);
                let trendHTML = '';

                // Eski değer varsa ve yeni değerden farklıysa trend okunu hesapla
                if (!isNaN(oldVal) && oldVal !== currentVal) {
                    let diff = (currentVal - oldVal).toFixed(1);
                    if (diff > 0) {
                        // Kilo ve Bel artışı uyarı (Kırmızı), Kas (Omuz, Kol vs) artışı başarıdır (Yeşil)
                        let color = (m.key === 'w' || m.key === 'waist') ? '#ff4444' : '#27ae60';
                        trendHTML = `<span style="color:${color}; font-size:14px; font-weight:bold; display:block; margin-top:5px; background:rgba(0,0,0,0.2); padding:3px 8px; border-radius:5px;">📈 +${diff}</span>`;
                    } else {
                        // Azalış: Kilo/bel ise Yeşil, Kas kaybediyorsa Kırmızı
                        let color = (m.key === 'w' || m.key === 'waist') ? '#27ae60' : '#ff4444';
                        trendHTML = `<span style="color:${color}; font-size:14px; font-weight:bold; display:block; margin-top:5px; background:rgba(0,0,0,0.2); padding:3px 8px; border-radius:5px;">📉 ${diff}</span>`;
                    }
                }

                grid.innerHTML += `
                    <div class="read-only-stat">
                        <span>${m.label}</span> 
                        <strong style="color:var(--goldnova); font-size:18px;">${currentVal} <small style="font-size:11px; color:#888;">${m.unit}</small></strong>
                        ${trendHTML}
                    </div>
                `;
            }
        });
    }

    // Profil her açıldığında Streak Takvimini ve Galeriyi de yükle
    if (typeof renderStreakCalendar === 'function') renderStreakCalendar();
    if (typeof renderProgressGallery === 'function') renderProgressGallery();
};

window.openAnatomy = function () {
    const modal = document.getElementById('anatomy-modal');
    modal.style.display = 'flex';
    setTimeout(() => { modal.classList.add('open'); }, 10);

    updateAnatomyView();
    // Modal açıldığında kaslara dokunma dinleyicilerini tekrar aktif et
    if (typeof initMuscleInteractions === 'function') initMuscleInteractions();

    const container = document.getElementById('all-charts-container');
    container.innerHTML = `
        <div style="margin-bottom: 25px;">
            <h4 style="color:var(--goldnova); font-size:12px; margin-bottom:5px;">AĞIRLIK DEĞİŞİMİ (KG)</h4>
            <div style="position: relative; height: 160px; background:#151515; padding:10px; border-radius:10px;"><canvas id="chart-weight"></canvas></div>
        </div>
        <div style="margin-bottom: 25px;">
            <h4 style="color:var(--goldnova); font-size:12px; margin-bottom:5px;">ADIM & KARDİYO (GÜNLÜK)</h4>
            <div style="position: relative; height: 160px; background:#151515; padding:10px; border-radius:10px;"><canvas id="chart-cardio"></canvas></div>
        </div>
        <div style="margin-bottom: 25px;">
            <h4 style="color:var(--goldnova); font-size:12px; margin-bottom:5px;">UYKU & TOPARLANMA (SAAT)</h4>
            <div style="position: relative; height: 160px; background:#151515; padding:10px; border-radius:10px;"><canvas id="chart-sleep"></canvas></div>
        </div>
        <div style="margin-bottom: 25px;">
            <h4 style="color:var(--goldnova); font-size:12px; margin-bottom:5px;">GÜNLÜK KALORİ (KCAL)</h4>
            <div style="position: relative; height: 160px; background:#151515; padding:10px; border-radius:10px;"><canvas id="chart-cal"></canvas></div>
        </div>
        <div style="margin-bottom: 25px;">
            <h4 style="color:var(--goldnova); font-size:12px; margin-bottom:5px;">YAĞ ORANI (%)</h4>
            <div style="position: relative; height: 160px; background:#151515; padding:10px; border-radius:10px;"><canvas id="chart-fat"></canvas></div>
        </div>
        <div style="margin-bottom: 25px;">
            <h4 style="color:var(--goldnova); font-size:12px; margin-bottom:5px;">İDMAN HACMİ (1RM)</h4>
            <div style="position: relative; height: 160px; background:#151515; padding:10px; border-radius:10px;"><canvas id="chart-volume"></canvas></div>
        </div>
    `;

    drawSpecificChart('chart-weight', JSON.parse(localStorage.getItem('olympus_history'))?.map(h => ({ date: h.date.split('.')[0], val: h.weight })), '#f6c000');
    drawSpecificChart('chart-cardio', JSON.parse(localStorage.getItem('olympus_cardio_history')), '#27ae60');
    drawSpecificChart('chart-sleep', JSON.parse(localStorage.getItem('olympus_sleep_history')), '#8a2be2');
    drawSpecificChart('chart-cal', JSON.parse(localStorage.getItem('olympus_cal_history')), '#44ff44');
    drawSpecificChart('chart-fat', JSON.parse(localStorage.getItem('olympus_fat_history')), '#00d2ff');
    drawVolumeChart('chart-volume');
};

window.closeAnatomy = function () {
    const modal = document.getElementById('anatomy-modal');
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 400);
};

// 3. 48 SAATLİK TOPARLANMA MOTORU VE YÜZEN SAATLER
let anatomyTimerInterval = null;

window.updateAnatomyView = function () {
    document.querySelectorAll('.muscle-group').forEach(m => {
        m.classList.remove('heat-red', 'heat-orange', 'heat-green');
    });

    // İdman saatlerini çek (Eğer eski veri varsa boş obje döndürür)
    const workedV2 = JSON.parse(localStorage.getItem('olympus_worked_muscles_v2')) || {};
    const workedMuscles = JSON.parse(localStorage.getItem('olympus_worked_muscles')) || [];

    const muscleMap = {
        'chest': 'chest', 'arms-l': 'arms-upper', 'arms-r': 'arms-upper',
        'core': 'core', 'legs-l': 'legs-quads', 'legs-r': 'legs-quads', 'shoulders': 'shoulders'
    };

    // Saatlerin Çıkacağı Koordinatlar ve Kusursuz Ok Uzunlukları
    const badgePositions = {
        'chest': { top: '27%', align: 'left', lineLen: '85px' },
        'shoulders': { top: '22%', align: 'right', lineLen: '65px' },
        'arms-upper': { top: '29%', align: 'right', lineLen: '45px' },
        'core': { top: '42%', align: 'left', lineLen: '85px' },
        'legs-quads': { top: '60%', align: 'right', lineLen: '60px' },
        'legs-calves': { top: '82%', align: 'left', lineLen: '50px' }
    };

    const updateColorsAndTimers = () => {
        const now = Date.now();
        const timerContainer = document.getElementById('recovery-timers-container');
        if (timerContainer) timerContainer.innerHTML = '';

        let workedNamesTR = [];

        workedMuscles.forEach(m => {
            let targetMuscle = muscleMap[m] || m;
            const frontEl = document.getElementById('front-' + targetMuscle);
            const backEl = document.getElementById('back-' + targetMuscle);

            // Türkçe Liste İçin Veri Hazırla
            let trName = "";
            if (m === 'chest') trName = "Göğüs";
            if (m.includes('arms')) trName = "Kol";
            if (m === 'core') trName = "Karın (Core)";
            if (m.includes('legs')) trName = "Bacak";
            if (m === 'shoulders') trName = "Omuz";

            // Eğer V2 (Saatli) veri varsa, 48 saatlik zekayı devreye sok
            let state = 'green';
            let hoursLeft = 0;
            let timeColor = "#27ae60";

            if (workedV2[m]) {
                const hoursPassed = (now - workedV2[m]) / (1000 * 60 * 60);
                if (hoursPassed < 24) {
                    state = 'red';
                    hoursLeft = Math.ceil(48 - hoursPassed);
                    timeColor = "#ff4444";
                } else if (hoursPassed < 48) {
                    state = 'orange';
                    hoursLeft = Math.ceil(48 - hoursPassed);
                    timeColor = "#f39c12";
                }
            } else {
                state = 'red';
                hoursLeft = 48;
                timeColor = "#ff4444";
                workedV2[m] = now;
                localStorage.setItem('olympus_worked_muscles_v2', JSON.stringify(workedV2));
            }

            // ÖN YÜZ BOYAMA VE ÇİZGİLİ SAAT YERLEŞİMİ (UCU NOKTALI OKLAR)
            if (frontEl) {
                frontEl.classList.remove('heat-red', 'heat-orange', 'heat-green');
                frontEl.classList.add('heat-' + state);

                let pos = badgePositions[targetMuscle];
                if (state !== 'green' && pos && timerContainer) {
                    if (!document.getElementById('badge-' + targetMuscle)) {

                        // Kutunun nerede duracağı ve çizginin nereye uzayacağı
                        let posCSS = pos.align === 'left'
                            ? `top: ${pos.top}; left: 0; transform: translate(-100%, -50%);`
                            : `top: ${pos.top}; right: 0; transform: translate(100%, -50%);`;

                        let lineCSS = pos.align === 'left'
                            ? `left: 100%; width: ${pos.lineLen};`
                            : `right: 100%; width: ${pos.lineLen};`;

                        // Çizginin ucundaki şık hedef noktasının (dot) konumu
                        let dotCSS = pos.align === 'left' ? 'right: -3px;' : 'left: -3px;';

                        timerContainer.innerHTML += `
                            <div id="badge-${targetMuscle}" class="recovery-pointer" style="${posCSS} color: ${timeColor}; border-color: ${timeColor};">
                                <div class="pointer-line" style="${lineCSS} background-color: ${timeColor};">
                                    <div style="position: absolute; ${dotCSS} top: -2px; width: 6px; height: 6px; border-radius: 50%; background-color: ${timeColor};"></div>
                                </div>
                                ⏳ ${hoursLeft}s
                            </div>
                        `;
                    }
                }
            }

            // ARKA YÜZ BOYAMA
            if (backEl) backEl.classList.add('heat-green');

            if (trName) workedNamesTR.push({ name: trName, state: state, hours: hoursLeft });
        });

        // Çalışılmayan Kasları Yeşil (Hazır) Yap
        document.querySelectorAll('.anatomy-card-front .muscle-group:not(.heat-red):not(.heat-orange)').forEach(m => {
            m.classList.add('heat-green');
        });

        // ARKA YÜZ LİSTESİNİ DOLDUR
        const listEl = document.getElementById('worked-muscles-list');
        if (listEl) {
            listEl.innerHTML = '';
            const uniqueNames = [];
            const filteredList = workedNamesTR.filter(item => {
                if (uniqueNames.includes(item.name)) return false;
                uniqueNames.push(item.name); return true;
            });

            if (filteredList.length === 0) {
                listEl.innerHTML = '<li style="color:#888;">Henüz dinlenik durumdasın.</li>';
            } else {
                filteredList.forEach(item => {
                    let statusIcon = item.state === 'red' ? '🔥 Kırmızı' : (item.state === 'orange' ? '⚡ Turuncu' : '✅ Yeşil');
                    listEl.innerHTML += `<li style="border-bottom: 1px dashed #333; padding: 4px 0;"><strong>${item.name}:</strong> <span style="color:#aaa; font-size:11px;">${statusIcon}</span></li>`;
                });
            }
        }
    };

    // İŞTE BİR ÖNCEKİ KODDA EKSİK BIRAKTIĞIM KISIM:
    updateColorsAndTimers();

    // Her 1 dakikada bir saatleri canlı güncelle
    if (anatomyTimerInterval) clearInterval(anatomyTimerInterval);
    anatomyTimerInterval = setInterval(updateColorsAndTimers, 60000);
};
function drawSpecificChart(canvasId, data, color) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx || !data || data.length === 0) return;
    new Chart(ctx, { type: 'line', data: { labels: data.map(h => h.date), datasets: [{ label: 'Veri', data: data.map(h => h.val), borderColor: color, backgroundColor: 'transparent', tension: 0.2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#888' } }, y: { ticks: { color: '#888' } } } } });
}

function drawVolumeChart(canvasId) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    const volHistory = JSON.parse(localStorage.getItem('olympus_vol_history')) || [];
    if (!ctx || volHistory.length === 0) return;
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: volHistory.map(h => h.date.split('.')[0]),
            datasets: [
                { label: 'Bench', data: volHistory.map(h => h.bench), borderColor: '#00d2ff', backgroundColor: 'transparent', tension: 0.2 },
                { label: 'Squat', data: volHistory.map(h => h.squat), borderColor: '#f6c000', backgroundColor: 'transparent', tension: 0.2 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { color: '#fff', font: { size: 10 } } } }, scales: { x: { ticks: { color: '#888' } }, y: { ticks: { color: '#888' } } } }
    });
}
// KASLARA BASILI TUTMA (İNTERAKTİF) ÖZELLİĞİ
// 1. KONSOL HATASINI ÇÖZEN DOKUNMA MOTORU
window.initMuscleInteractions = function () {
    const display = document.getElementById('muscle-name-display');
    const groups = document.querySelectorAll('.muscle-group');

    groups.forEach(group => {
        const name = group.getAttribute('data-name');

        const showLabel = () => {
            if (display) {
                display.innerText = name;
                display.style.opacity = '1';
            }
            group.classList.add('active-touch');
        };
        const hideLabel = () => {
            if (display) display.style.opacity = '0';
            group.classList.remove('active-touch');
        };

        // Eski event listener'ları temizle ve güvenli bağla
        group.onmousedown = showLabel;
        group.onmouseup = hideLabel;
        group.onmouseleave = hideLabel;
        group.ontouchstart = showLabel;
        group.ontouchend = hideLabel;
        group.ontouchcancel = hideLabel;
    });
};
// ==========================================
