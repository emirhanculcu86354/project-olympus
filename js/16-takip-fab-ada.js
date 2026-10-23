// Takip merkezi, FAB, dinamik ada, halkalar, zen modu, kavuşma sayacı
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 🎯 YENİ TAKİP MERKEZİ FONKSİYONLARI
// ==========================================
window.saveSleep = function () {
    const val = document.getElementById('m-sleep').value;
    if (val) {
        let history = JSON.parse(localStorage.getItem('olympus_sleep_history')) || [];
        history.push({ date: new Date().toLocaleDateString('tr-TR'), val: val });
        localStorage.setItem('olympus_sleep_history', JSON.stringify(history));
        openTrackingModal('sleep'); // Ekranı ve grafiği yenile
        if (navigator.vibrate) navigator.vibrate(20);
    }
};

window.saveCardio = function () {
    const val = document.getElementById('m-steps').value;
    if (val) {
        let history = JSON.parse(localStorage.getItem('olympus_cardio_history')) || [];
        history.push({ date: new Date().toLocaleDateString('tr-TR'), val: val });
        localStorage.setItem('olympus_cardio_history', JSON.stringify(history));
        openTrackingModal('cardio');
        if (navigator.vibrate) navigator.vibrate(20);
    }
};

window.calculate1RM = function () {
    const w = parseFloat(document.getElementById('calc-w').value);
    const r = parseFloat(document.getElementById('calc-r').value);
    if (w > 0 && r > 0) {
        // Epley Formülü: 1RM = Ağırlık * (1 + (Tekrar / 30))
        const orm = w * (1 + (r / 30));
        document.getElementById('calc-result').innerText = orm.toFixed(1) + " kg";
        if (navigator.vibrate) navigator.vibrate([20, 40]);
    } else {
        alert("Lütfen geçerli bir ağırlık ve tekrar girin.");
    }
};

window.saveSupplements = function () {
    const s = {
        whey: document.getElementById('sup-whey').value || 0,
        creatine: document.getElementById('sup-creatine').value || 0,
        carnitine: document.getElementById('sup-carnitine').value || 0,
        electro: document.getElementById('sup-electro').value || 0
    };
    localStorage.setItem('olympus_supp_stock', JSON.stringify(s));

    document.getElementById('tracking-modal').style.display = 'none';
    if (navigator.vibrate) navigator.vibrate(50);
    alert("Yakıt stoku başarıyla güncellendi! ⚡");
};
window.saveActiveKcal = function () {
    const val = document.getElementById('m-active-kcal').value;
    if (val) {
        let history = JSON.parse(localStorage.getItem('olympus_active_kcal_history')) || [];
        history.push({ date: new Date().toLocaleDateString('tr-TR'), val: val });
        localStorage.setItem('olympus_active_kcal_history', JSON.stringify(history));
        openTrackingModal('active_kcal');
        if (navigator.vibrate) navigator.vibrate(20);
    }
};

window.saveBPM = function () {
    const val = document.getElementById('m-bpm').value;
    if (val) {
        let history = JSON.parse(localStorage.getItem('olympus_bpm_history')) || [];
        history.push({ date: new Date().toLocaleDateString('tr-TR'), val: val });
        localStorage.setItem('olympus_bpm_history', JSON.stringify(history));
        openTrackingModal('heart_rate');
        if (navigator.vibrate) navigator.vibrate(20);
    }
};
// Termal Anatomi Kartını Döndürme Motoru
window.toggleAnatomyCard = function (event) {
    if (event) event.stopPropagation(); // Tıklamanın arkaya geçip başka şeyleri bozmasını engeller
    const card = document.getElementById('anatomy-card-wrapper');
    if (card) {
        card.classList.toggle('flipped');
        if (navigator.vibrate) navigator.vibrate(20);
    }
};
// ==========================================
// ⚙️ FAB BUTONU İŞLEVLERİ
// ==========================================
window.fabAddWater = function () {
    let todayStr = new Date().toLocaleDateString('tr-TR');
    let wData = JSON.parse(localStorage.getItem('olympus_water_obj')) || { amount: 0, yesterday: 0, date: todayStr };

    // Eğer gün değiştiyse veriyi sıfırla ki yanlış ekleme yapmasın
    if (wData.date !== todayStr) {
        wData.yesterday = wData.amount;
        wData.amount = 0;
        wData.date = todayStr;
    }

    wData.amount += 250;
    localStorage.setItem('olympus_water_obj', JSON.stringify(wData));

    // Su eklendiğinde tepeden inen Dynamic Island mesajı
    if (typeof showDynamicIsland === 'function') showDynamicIsland("💧 +250ml Su Eklendi!");

    // Profildeki mavi su halkasını canlı olarak doldurur
    if (typeof calculateRealDailyProgress === 'function') calculateRealDailyProgress();

    // İşlem bitince + menüsünü geri kapat
    toggleFAB();
};

window.fabOpenWorkout = function () {
    // 1. Tüm ekranları kapat, asıl idman sekmesini aktif et
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('workout-sec').classList.add('active');

    // 2. Alt menüdeki ikonun ışığını da İdman sekmesine kaydır
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-target="workout-sec"]').classList.add('active');

    toggleFAB(); // Menüyü kapat
};
// ==========================================
// 🚀 PREMIUM SİSTEM MOTORLARI (FAB & ISLAND)
// ==========================================

// FAB (+) Butonunu Açıp Kapatan Motor
window.toggleFAB = function () {
    const mainBtn = document.getElementById('fab-main');
    const menu = document.getElementById('fab-menu');
    const cardioMenu = document.getElementById('fab-cardio-menu'); // YENİ: Kardiyo Menüsü
    const container = document.querySelector('.fab-container'); // YENİ: CSS animasyonu için ana kapsayıcı

    if (mainBtn) mainBtn.classList.toggle('active');
    if (menu) menu.classList.toggle('active');
    if (cardioMenu) cardioMenu.classList.toggle('active'); // YENİ: Kardiyo menüsünü aç/kapat
    if (container) container.classList.toggle('active'); // YENİ: Sola kayma efektini tetikler

    if (navigator.vibrate) navigator.vibrate(20);
};

// ==========================================
// 🏝️ SADELEŞTİRİLMİŞ DİNAMİK ADA MOTORU (GÖRÜNÜRLÜK FİX)
// ==========================================
window.closeDynamicIsland = function () {
    const island = document.getElementById('dynamic-island');
    if (island) {
        island.classList.remove('active');
        island.classList.remove('expanded');
    }
};

window.showDynamicIsland = function (titleOrText, description = "", icon = "⚡", showWave = false) {
    const island = document.getElementById('dynamic-island');
    if (!island) return;

    const compactView = document.getElementById('island-compact');
    const expandedView = document.getElementById('island-expanded');
    const textEl = document.getElementById('di-text');
    const waveEl = document.getElementById('di-wave-container');

    // 1. DURUM: SADECE KISA METİN (Kompakt Mod)
    if (description === "") {
        // Kompaktı göster, Geniş olanı gizle
        if (compactView) compactView.style.opacity = '1';
        if (expandedView) expandedView.style.opacity = '0';

        if (textEl) {
            textEl.innerText = titleOrText;
            textEl.style.display = 'inline-block';
        }
        document.getElementById('di-icon').innerText = icon;
        if (waveEl) waveEl.style.display = showWave ? 'flex' : 'none';

        island.classList.add('active');
        island.classList.remove('expanded');
        if (navigator.vibrate) navigator.vibrate([10, 30, 10]);

        // 4 Saniye sonra gizle
        setTimeout(() => {
            island.classList.remove('active');
            if (waveEl) waveEl.style.display = 'none';
        }, 4000);
        return;
    }

    // 2. DURUM: BAŞLIK VE AÇIKLAMA (Genişletilmiş Mod - Akademi vs.)
    // Kompaktı gizle, Geniş olanı zorla görünür yap!
    if (compactView) compactView.style.opacity = '0';
    if (expandedView) expandedView.style.opacity = '1';

    document.getElementById('island-title').innerText = titleOrText;
    document.getElementById('island-desc').innerText = description;
    document.getElementById('island-icon-large').innerText = icon;

    island.classList.add('active');
    island.classList.add('expanded'); // Adayı aşağı doğru büyüt
    if (navigator.vibrate) navigator.vibrate([50, 100, 50]);

    // 4 Saniye sonra gizle ve küçült
    setTimeout(() => {
        island.classList.remove('active');
        island.classList.remove('expanded');

        // Kapanırken bir sonraki sefere bozuk çıkmasın diye opacity'leri sıfırla
        setTimeout(() => {
            if (compactView) compactView.style.opacity = '1';
            if (expandedView) expandedView.style.opacity = '0';
        }, 300);
    }, 4000);
};

// 📈 Gelişim Panosu (Social Feed) Kaydedici
function logToSocialFeed(title, description, icon, coinReward) {
    let feed = JSON.parse(localStorage.getItem('olympus_social_feed')) || [];
    feed.unshift({
        id: Date.now(),
        date: new Date().toLocaleDateString('tr-TR'),
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        title: title,
        desc: description,
        icon: icon,
        earned: coinReward
    });
    if (feed.length > 50) feed.pop();
    localStorage.setItem('olympus_social_feed', JSON.stringify(feed));
}
// ==========================================
// 🎯 APPLE WATCH HALKALARI VE GALERİ DÜZENLEMELERİ
// ==========================================

// Günlük Halkaları Canlı Verilerle Dolduran Motor
window.calculateRealDailyProgress = function () {
    // 1. Mavi Halka: Su Tüketimi
    let wData = JSON.parse(localStorage.getItem('olympus_water_obj')) || { amount: 0 };
    let wGoal = parseInt(localStorage.getItem('olympus_water_goal') || 3000);
    let waterPct = (wData.amount / wGoal) * 100;

    // 2. Kırmızı Halka: Bugün İdman Yapıldı mı? (Streak Verisi)
    let streakData = JSON.parse(localStorage.getItem('olympus_streak_data')) || [false, false, false, false, false, false, false];
    let todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    let workoutPct = streakData[todayIndex] ? 100 : 0;

    // 3. Yeşil Halka: Görev Tamamlama Oranı (Görev sekmesindeki yüzdelik)
    let acts = JSON.parse(localStorage.getItem('olympus_acts')) || [];
    let completedActs = acts.filter(a => a.done).length;
    let calPct = acts.length > 0 ? (completedActs / acts.length) * 100 : 0;

    // Apple Watch Halkalarının SVG Çevrim Hesapları
    const wRing = document.getElementById('ring-workout');
    const cRing = document.getElementById('ring-calories');
    const waRing = document.getElementById('ring-water');

    if (wRing) wRing.style.strokeDashoffset = 314 - (314 * Math.min(workoutPct, 100) / 100);
    if (cRing) cRing.style.strokeDashoffset = 238 - (238 * Math.min(calPct, 100) / 100);
    if (waRing) waRing.style.strokeDashoffset = 163 - (163 * Math.min(waterPct, 100) / 100);
};

// Sayfa her yüklendiğinde ve profil sekmesine geçildiğinde halkaları otomatik güncelle
document.addEventListener('DOMContentLoaded', () => {
    calculateRealDailyProgress();
});
// ==========================================
// 🍃 ZEN MODU MOTORU (4-7-8 TEKNİĞİ)
// ==========================================
let zenInterval;
let zenTimeout1, zenTimeout2;

window.startZenMode = function () {
    document.getElementById('zen-screen').classList.remove('hidden');
    if (typeof toggleFAB === 'function') toggleFAB(); // FAB menüsünü kapat

    // Motoru hemen başlat ve her 19 saniyede bir tekrar et (4+7+8 = 19)
    runZenCycle();
    zenInterval = setInterval(runZenCycle, 19000);
}

function runZenCycle() {
    const circle = document.getElementById('zen-circle');
    const text = document.getElementById('zen-instruction');

    // 1. NEFES AL (4 Saniye)
    circle.style.transition = 'all 4s ease-in-out';
    circle.className = 'zen-circle inhale';
    text.innerText = "Nefes Al...";
    if (navigator.vibrate) navigator.vibrate(50); // Ufak bir titreşimle uyar

    // 2. TUT (7 Saniye)
    zenTimeout1 = setTimeout(() => {
        circle.className = 'zen-circle hold';
        text.innerText = "Tut...";
    }, 4000);

    // 3. NEFES VER (8 Saniye)
    zenTimeout2 = setTimeout(() => {
        circle.style.transition = 'all 8s ease-in-out';
        circle.className = 'zen-circle exhale';
        text.innerText = "Nefes Ver...";
    }, 11000);
}

window.stopZenMode = function () {
    clearInterval(zenInterval);
    clearTimeout(zenTimeout1);
    clearTimeout(zenTimeout2);
    document.getElementById('zen-screen').classList.add('hidden');
    document.getElementById('zen-circle').className = 'zen-circle'; // Sıfırla
}
// ==========================================
// ✈️ KAVUŞMA SAYACI DİNAMİK MOTORU
// ==========================================
window.openReunionSettings = function () {
    document.getElementById('reunion-modal').classList.remove('hidden');

    // Hafızadaki eski verileri kutulara doldur (Yazmaya üşenmemen için)
    const savedFrom = localStorage.getItem('dilala_reunion_from') || 'Sakarya';
    const savedTo = localStorage.getItem('dilala_reunion_to') || 'Tarsus';
    const savedDate = localStorage.getItem('dilala_reunion_date');

    document.getElementById('reunion-input-from').value = savedFrom;
    document.getElementById('reunion-input-to').value = savedTo;
    if (savedDate) document.getElementById('reunion-input-date').value = savedDate;
}

window.closeReunionSettings = function () {
    document.getElementById('reunion-modal').classList.add('hidden');
}

window.saveReunionSettings = function () {
    const from = document.getElementById('reunion-input-from').value || 'Nereden';
    const to = document.getElementById('reunion-input-to').value || 'Nereye';
    const date = document.getElementById('reunion-input-date').value;

    if (!date) {
        alert("Lütfen kavuşacağınız tarihi seç!");
        return;
    }

    // Seçimlerini sistemin derin hafızasına kazı
    localStorage.setItem('dilala_reunion_from', from);
    localStorage.setItem('dilala_reunion_to', to);
    localStorage.setItem('dilala_reunion_date', date);

    closeReunionSettings();
    updateReunionCounter(); // Kapatır kapatmaz sayacı güncelle
}

function updateReunionCounter() {
    const counterEl = document.getElementById('reunion-countdown');
    if (!counterEl) return;

    // Şehir isimlerini hafızadan çekip ekrana bas
    const savedFrom = localStorage.getItem('dilala_reunion_from') || 'Sakarya';
    const savedTo = localStorage.getItem('dilala_reunion_to') || 'Tarsus';
    const fromEl = document.getElementById('reunion-from-city');
    const toEl = document.getElementById('reunion-to-city');
    if (fromEl) fromEl.innerText = savedFrom;
    if (toEl) toEl.innerText = savedTo;

    const savedDate = localStorage.getItem('dilala_reunion_date');

    // Eğer henüz tarih seçilmediyse kullanıcıyı uyar
    if (!savedDate) {
        counterEl.innerHTML = "<span style='font-size:16px; color:#ffb3c6;'>Hedef Seçmek İçin Dokun</span>";
        return;
    }

    const targetDate = new Date(savedDate);
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) {
        counterEl.innerHTML = "🎉 KAVUŞTUK! 🎉";
        counterEl.style.color = "#27ae60";
        return;
    }

    counterEl.style.color = "#fff"; // Yazı rengini sıfırla

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);

    counterEl.innerHTML = `${d} <span style="font-size:12px; color:#ffb3c6;">GÜN</span> ${h} <span style="font-size:12px; color:#ffb3c6;">SA</span> ${m} <span style="font-size:12px; color:#ffb3c6;">DK</span> ${s} <span style="font-size:12px; color:#ffb3c6;">SN</span>`;
}

// Bunu DilalaTimer'a entegre et
const originalStartDilalaTimer = startDilalaTimer;
let reunionCounterInterval = null;
startDilalaTimer = function () {
    originalStartDilalaTimer();
    // Mod her açıldığında yeni sayaç birikmesin
    clearInterval(reunionCounterInterval);
    reunionCounterInterval = setInterval(updateReunionCounter, 1000);
    checkLetterStatus(); // Posta kutusu durumunu kontrol et
};

// DİJİTAL POSTA KUTUSU KİLİT SİSTEMİ
function checkLetterStatus() {
    const todayStr = new Date().toLocaleDateString('tr-TR');
    const lastOpenedDate = localStorage.getItem('dilala_letter_date');
    const statusText = document.getElementById('letter-status-text');
    const statusIcon = document.getElementById('letter-status-icon');
    const lockIcon = document.querySelector('.letter-lock');

    if (lastOpenedDate === todayStr) {
        statusText.innerText = "Bugünün notu okundu. Yarına kadar bekle!";
        statusIcon.innerText = "📬";
        if (lockIcon) lockIcon.innerText = "⏳";
    } else {
        statusText.innerText = "Yeni bir not seni bekliyor, açmak için dokun!";
        statusIcon.innerText = "💌";
        if (lockIcon) lockIcon.innerText = "🔑";
    }
}
const loveLetters = [
    "Bugün ne olursa olsun gülümsemeyi unutma, çünkü gülüşün Sakarya'dan burayı aydınlatıyor.",
    "Mesafeler uzak olabilir ama kalbim tam şu an senin yanında atıyor.",
    "Bugünün görevi: Aynaya bak ve benim gözümden ne kadar kusursuz olduğunu gör.",
    "Aramızdaki kilometreler, sana olan sevgimin yanında bir hiç kalır. İyi ki varsın!",
    "Her yeni gün, sana kavuşacağım o güne bir adım daha yaklaşmak demek."
];
window.openLoveLetter = function () {
    const todayStr = new Date().toLocaleDateString('tr-TR');
    const lastOpenedDate = localStorage.getItem('dilala_letter_date');
    let currentIndex = parseInt(localStorage.getItem('dilala_letter_index')) || 0;

    if (lastOpenedDate === todayStr) {
        // Zaten açılmışsa o günkü notu tekrar göster
        alert(`📬 Bugünün Notu:\n\n"${loveLetters[currentIndex]}"`);
    } else {
        // Yeni gün, yeni not
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        let nextIndex = (currentIndex + 1) % loveLetters.length;
        if (lastOpenedDate === null) nextIndex = 0; // İlk günse sıfırdan başla

        localStorage.setItem('dilala_letter_date', todayStr);
        localStorage.setItem('dilala_letter_index', nextIndex);

        alert(`✨ Mektup Kilidi Açıldı! ✨\n\n"${loveLetters[nextIndex]}"`);
        checkLetterStatus();
    }
}
window.openDilalaScreen = function () {
    const screen = document.getElementById('dilala-special-screen');
    if (screen) {
        screen.style.display = 'flex'; // Sınıf yerine doğrudan display açıyoruz
        if (typeof startDilalaTimer === 'function') startDilalaTimer();
    } else {
        alert("Hata: Dilala ekranı bulunamadı!");
    }
}

window.closeDilalaScreen = function () {
    const screen = document.getElementById('dilala-special-screen');
    if (screen) {
        screen.style.display = 'none'; // Doğrudan kapatıyoruz
    }
}
// ==========================================
