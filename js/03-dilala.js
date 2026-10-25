// Dilala modu: zaman kapsülü, takvim ve sayaçlar
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 🌸 DİLALAM MODU: ZAMAN KAPSÜLÜ VE TAKVİM MOTORU
// ==========================================
const specialDates = [
    { name: "Tanışma Yıldönümü", month: 7, day: 26, icon: "🌸" },
    { name: "Sevgililer Günü", month: 2, day: 14, icon: "💖" },
    { name: "İlişki Yıldönümü", month: 11, day: 19, icon: "👩‍❤️‍👨" },
    { name: "Dilala Doğum Günü", month: 8, day: 18, icon: "🎂" },
    { name: "Emoç Doğum Günü", month: 2, day: 3, icon: "🎂" }
];

// Klasik profildeki onay kutusu bu fonksiyonu çağırır
window.toggleDilalaMode = function () {
    const checkbox = document.getElementById('dilala-toggle-checkbox');
    const ok = setDilalaMode(checkbox.checked);
    checkbox.checked = document.body.classList.contains('dilala-mode');
    return ok;
};

// Hem klasik hem Olympus 2.0 ekranından kullanılan ortak aç/kapat motoru
window.setDilalaMode = function (on) {
    const checkbox = document.getElementById('dilala-toggle-checkbox');
    const btnContainer = document.getElementById('profile-dilala-btn-container');

    if (on) {
        let pass = prompt("🌸 Dilala Moduna giriş için şifreyi giriniz:");

        if (pass === "19.11.2025" || pass === "19112025") {
            document.body.classList.add('dilala-mode');
            localStorage.setItem('olympus_dilala_mode', 'true');
            if (checkbox) checkbox.checked = true;

            // 1. Yeni Dilala Dashboard'u Göster
            if (btnContainer) btnContainer.classList.remove('hidden');
            startDilalaTimer();

            // 2. Görevleri Değiştir (Kendi görevlerini yedeğe al)
            localStorage.setItem('olympus_acts_backup', JSON.stringify(activities));
            activities = [
                { id: 101, text: "🌸 Günaydın Mesajı At", done: false },
                { id: 102, text: "💕 Seni Seviyorum De", done: false },
                { id: 103, text: "📸 Anı Fotoğrafı Çek/Bak", done: false }
            ];
            saveAndRenderActivities();

            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            alert("Hoşgeldin Aşguuuummm! 🌸💕\n\nSenin için özel kuralların ve programın yüklendi!");
            refreshDilalaViews();
            return true;
        }
        if (pass !== null) alert("Hatalı şifre! Sadece özel kişiler girebilir. 🔒");
        if (checkbox) checkbox.checked = false;
        return false;
    }

    document.body.classList.remove('dilala-mode');
    localStorage.setItem('olympus_dilala_mode', 'false');
    if (checkbox) checkbox.checked = false;

    // Dashboard'u Gizle ve Görevleri Geri Yükle
    if (btnContainer) btnContainer.classList.add('hidden');
    if (dilalaTimerInterval) clearInterval(dilalaTimerInterval);

    let backupActs = JSON.parse(localStorage.getItem('olympus_acts_backup'));
    if (backupActs) {
        activities = backupActs;
        saveAndRenderActivities();
    }

    if (navigator.vibrate) navigator.vibrate(30);
    refreshDilalaViews();
    return true;
};

// Program ve diyet Dilala moduna göre değiştiği için iki ekranı da yenile
function refreshDilalaViews() {
    renderWorkouts();
    renderDiet();
    if (window.O2 && O2.render && !document.getElementById('oly2-screen').classList.contains('hidden')) O2.render();
}

let dilalaTimerInterval;
function startDilalaTimer() {
    const relDate = new Date('2025-11-19T00:00:00');
    const meetDate = new Date('2025-07-26T00:00:00');

    if (dilalaTimerInterval) clearInterval(dilalaTimerInterval);
    renderDilalaCalendar(); // Takvimi çiz

    dilalaTimerInterval = setInterval(() => {
        const now = new Date();

        // 1. İlişki ve Tanışma Geçen Süre Sayaçları
        let diffRel = now - relDate;
        let diffMeet = now - meetDate;

        if (diffRel > 0) document.getElementById('dilala-rel-counter').innerText = formatTimeDiff(diffRel);
        if (diffMeet > 0) document.getElementById('dilala-meet-counter').innerText = formatTimeDiff(diffMeet);

        // 2. Yaklaşan Etkinliği Bulma ve Geri Sayım
        let nextEvent = null;
        let minDiff = Infinity;

        specialDates.forEach(ev => {
            let evDate = new Date(now.getFullYear(), ev.month - 1, ev.day);
            if (now > evDate) {
                evDate.setFullYear(now.getFullYear() + 1); // Bu yıl geçtiyse seneye bak
            }
            let diff = evDate - now;
            if (diff < minDiff) {
                minDiff = diff;
                nextEvent = { ...ev, dateObj: evDate, diff: diff };
            }
        });

        if (nextEvent) {
            document.getElementById('dilala-next-event').innerHTML = `
                Yaklaşan: <strong>${nextEvent.icon} ${nextEvent.name}</strong><br>
                <span id="dilala-next-countdown">${formatTimeDiff(nextEvent.diff)} Kaldı</span>
            `;
        }
    }, 1000);
}

function formatTimeDiff(ms) {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const seconds = Math.floor((ms / 1000) % 60);
    return `${days}g ${hours}s ${minutes}d ${seconds}sn`;
}

function renderDilalaCalendar() {
    const listEl = document.getElementById('dilala-events-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    // Tarihleri yıl içindeki sıraya göre dizelim
    let sortedDates = [...specialDates].sort((a, b) => (a.month * 100 + a.day) - (b.month * 100 + b.day));

    sortedDates.forEach(ev => {
        listEl.innerHTML += `
            <div class="dilala-event-item">
                <span class="event-name">${ev.icon} ${ev.name}</span>
                <span class="event-date">${String(ev.day).padStart(2, '0')}.${String(ev.month).padStart(2, '0')}</span>
            </div>
        `;
    });
}
