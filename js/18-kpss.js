// KPSS Akademi: program, pomodoro, müfredat, haftalar
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 📚 KPSS AKADEMİ V3.0 (SWIPE, AI, SYLLABUS, HAFIZA)
// ==========================================

let kpssViewMode = 'today';
let activeKpssExam = localStorage.getItem('olympus_kpss_exam') || 'onlisans';

// Müfredat Veritabanı (İki sınav için ayrıştırılmış, ortak kullanılabilir)
const kpssSyllabusDB = {
    "onlisans": {
        "Türkçe": ["Sözcükte Anlam", "Cümlede Anlam", "Paragraf", "Ses Bilgisi", "Yapı Bilgisi", "Sözcük Türleri", "Cümle Öğeleri", "Yazım Kuralları", "Noktalama", "Sözel Mantık"],
        "Matematik": ["Temel Kavramlar", "Rasyonel Sayılar", "Üslü ve Köklü", "Çarpanlara Ayırma", "Denklem Çözme", "Problemler", "Kümeler", "Fonksiyonlar", "Geometri", "Sayısal Mantık"],
        "Tarih": ["İslamiyet Öncesi Türk Tarihi", "İlk Türk-İslam Devletleri", "Osmanlı Kuruluş/Yükseliş", "Osmanlı Kültür ve Medeniyet", "20. Yüzyıl Başlarında Osmanlı", "Kurtuluş Savaşı", "Çağdaş Türk ve Dünya Tarihi"],
        "Coğrafya": ["Türkiye'nin Coğrafi Konumu", "Yeryüzü Şekilleri", "İklim ve Bitki Örtüsü", "Nüfus ve Yerleşme", "Tarım ve Hayvancılık", "Madenler ve Enerji", "Sanayi, Ulaşım ve Ticaret"],
        "Vatandaşlık": ["Hukuka Giriş", "Anayasa Tarihi", "Temel Hak ve Hürriyetler", "Yasama", "Yürütme", "Yargı", "İdare Hukuku", "Güncel Bilgiler"]
    },
    "ortaogretim": {
        // Ortaöğretim için benzer ama isimleri farklılaştırılabilir, şimdilik kopyası
        "Türkçe": ["Sözcükte Anlam", "Cümlede Anlam", "Paragraf", "Dil Bilgisi Temelleri", "Yazım ve Noktalama", "Sözel Mantık"],
        "Matematik": ["Temel Kavramlar", "Rasyonel Sayılar", "Üslü Köklü", "Problemler", "Geometri Temelleri"],
        "Tarih": ["İslamiyet Öncesi", "Türk-İslam", "Osmanlı Siyasi Tarihi", "Osmanlı Kültür", "İnkılap Tarihi", "Çağdaş"],
        "Coğrafya": ["Konum", "Yeryüzü Şekilleri", "İklim", "Nüfus", "Ekonomi"],
        "Vatandaşlık": ["Hukuk Temelleri", "1982 Anayasası", "Yasama, Yürütme, Yargı", "İdare"]
    }
};

// --- 1. SINAV SEÇİMİ VE ÜST KISIM ---
window.openKPSSExamSelector = function () {
    document.getElementById('kpss-exam-selector-modal').style.display = 'flex';
};

window.selectKPSSExam = function (type) {
    activeKpssExam = type;
    localStorage.setItem('olympus_kpss_exam', type);
    document.getElementById('kpss-exam-selector-modal').style.display = 'none';

    updateKpssHeader();
    updateKpssCountdowns();
    renderKPSSTodayOrWeek(); // Müfredat değiştiği için listeyi yenile
    if (navigator.vibrate) navigator.vibrate(20);
};

function updateKpssHeader() {
    const title = document.getElementById('kpss-header-title');
    if (activeKpssExam === 'onlisans') title.innerText = "KPSS Ön Lisans";
    else title.innerText = "KPSS Ortaöğretim";
}

function updateKpssCountdowns() {
    const mainEl = document.getElementById('kpss-main-countdown');
    const now = new Date().getTime();

    // Sınav Tarihleri
    const examDateStr = activeKpssExam === 'onlisans' ? "2026-10-04T10:15:00" : "2026-10-25T10:15:00";
    const examTime = new Date(examDateStr).getTime();

    if (mainEl) {
        const diff = examTime - now;
        if (diff > 0) {
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            mainEl.innerText = `${d} Gün Kaldı`;
        } else {
            mainEl.innerText = "SINAV VAKTİ!";
        }
    }
}

// ==========================================
// 👁️ GÖRÜNÜM MODU DEĞİŞTİRİCİ (GÜNCELLENDİ)
// ==========================================
window.switchKPSSView = function (mode) {
    kpssViewMode = mode; // 'today', 'week', veya 'overview'

    document.getElementById('btn-kpss-today').classList.toggle('active', mode === 'today');
    document.getElementById('btn-kpss-week').classList.toggle('active', mode === 'week');
    document.getElementById('btn-kpss-overview').classList.toggle('active', mode === 'overview');

    const hint = document.getElementById('kpss-swipe-hint');
    if (hint) hint.style.display = mode === 'today' ? 'block' : 'none';

    renderKPSSTodayOrWeek();
};
// ==========================================
// 📌 GÜNLÜK HEDEF PARÇALAYICI MOTORU (YENİ)
// ==========================================
window.openKPSSDailyTopics = function (subject, topicStr, lessonIndex) {
    const modal = document.getElementById('kpss-syllabus-modal');
    const list = document.getElementById('syllabus-topics-list');
    const bar = document.getElementById('syllabus-progress-bar');
    const pctText = document.getElementById('syllabus-pct-text');
    const title = document.getElementById('syllabus-title');

    title.innerText = subject + " (Bugünkü Görevler)";

    // Senin yazdığın programdaki "+" veya "&" veya "," işaretlerinden konuları otomatik alt alta böler
    let topics = topicStr.split(/\+|&|,/).map(t => t.trim()).filter(t => t.length > 0);
    if (topics.length === 0) topics = [topicStr];

    const todayStr = new Date().toLocaleDateString('tr-TR');
    const memoryKey = `kpss_daily_topics_${activeKpssExam}_${todayStr}_${subject}_${lessonIndex}`;
    const savedProgress = JSON.parse(localStorage.getItem(memoryKey)) || [];

    list.innerHTML = '';
    topics.forEach((topic, idx) => {
        const isCompleted = savedProgress.includes(idx);
        list.innerHTML += `
            <div style="display:flex; align-items:center; gap:10px; background:#1a1a1a; padding:12px; border-radius:8px; border:1px solid #333;" onclick="toggleDailyTopic('${memoryKey}', ${idx}, ${!isCompleted}, '${subject}', '${topicStr}', ${lessonIndex})">
                <div style="width:18px; height:18px; border:2px solid var(--goldnova); border-radius:4px; display:flex; justify-content:center; align-items:center; background:${isCompleted ? 'var(--goldnova)' : 'transparent'};">
                    ${isCompleted ? '<span style="color:#000; font-size:12px; font-weight:bold;">✓</span>' : ''}
                </div>
                <span style="color: ${isCompleted ? '#888' : '#fff'}; font-size: 13px; text-decoration: ${isCompleted ? 'line-through' : 'none'};">${topic}</span>
            </div>
        `;
    });

    const pct = topics.length > 0 ? Math.round((savedProgress.length / topics.length) * 100) : 0;
    bar.style.width = pct + '%';
    pctText.innerText = `%${pct}`;

    modal.style.display = 'flex';
};

window.toggleDailyTopic = function (memoryKey, idx, isDone, subject, topicStr, lessonIndex) {
    let savedProgress = JSON.parse(localStorage.getItem(memoryKey)) || [];
    if (isDone) {
        if (!savedProgress.includes(idx)) savedProgress.push(idx);
        if (navigator.vibrate) navigator.vibrate([20, 30]);
    } else {
        savedProgress = savedProgress.filter(i => i !== idx);
    }
    localStorage.setItem(memoryKey, JSON.stringify(savedProgress));

    // Tıklandığında ekranı anlık yenile
    openKPSSDailyTopics(subject, topicStr, lessonIndex);
};

// --- 3. SWIPE (SAĞA KAYDIRIP TAMAMLAMA) MOTORU ---
function initKpssSwipeEngine() {
    document.querySelectorAll('.kpss-card').forEach(card => {
        let startX = 0;
        let isSwiping = false;

        card.addEventListener('touchstart', e => {
            startX = e.changedTouches[0].screenX;
            card.style.transition = 'none';
            isSwiping = false;
        }, { passive: true });

        card.addEventListener('touchmove', e => {
            let moveX = e.changedTouches[0].screenX - startX;
            if (Math.abs(moveX) > 10) isSwiping = true;
            if (moveX > 0 && moveX < 100) { // Sadece sağa kaydırma
                card.style.transform = `translateX(${moveX}px)`;
                card.style.background = 'rgba(39, 174, 96, 0.1)';
            }
        }, { passive: true });

        card.addEventListener('touchend', e => {
            let diff = e.changedTouches[0].screenX - startX;
            if (!isSwiping || diff < 10) {
                card.style.transform = 'translateX(0px)';
                return;
            }

            card.style.transition = 'transform 0.4s ease, background 0.4s ease';
            card.style.transform = 'translateX(0px)';

            if (diff > 50) { // Yeterince sağa kaydırıldıysa
                const index = parseInt(card.getAttribute('data-index'));
                const todayStr = new Date().toLocaleDateString('tr-TR');
                let completed = JSON.parse(localStorage.getItem(`kpss_done_${activeKpssExam}_${todayStr}`)) || [];

                if (!completed.includes(index)) {
                    completed.push(index);
                    card.classList.add('completed');
                    if (navigator.vibrate) navigator.vibrate(40);
                } else {
                    // Zaten tamamsa geri al
                    completed = completed.filter(i => i !== index);
                    card.classList.remove('completed');
                    card.style.background = '#151515';
                    if (navigator.vibrate) navigator.vibrate(20);
                }
                localStorage.setItem(`kpss_done_${activeKpssExam}_${todayStr}`, JSON.stringify(completed));
            } else {
                if (!card.classList.contains('completed')) card.style.background = '#151515';
            }
        });
    });
}

// --- 4. KONU AĞACI (SYLLABUS) MOTORU VE HAFIZASI ---
window.openKPSSSyllabus = function (subject) {
    if (kpssViewMode !== 'today') return; // Sadece bugün modunda tıklanabilsin
    if (subject === "Deneme Sınavı" || subject === "Dinlenme") return;

    const modal = document.getElementById('kpss-syllabus-modal');
    const list = document.getElementById('syllabus-topics-list');
    const bar = document.getElementById('syllabus-progress-bar');
    const pctText = document.getElementById('syllabus-pct-text');

    // Seçili sınava göre müfredatı çek
    const topics = kpssSyllabusDB[activeKpssExam][subject];
    if (!topics) return;

    document.getElementById('syllabus-title').innerText = subject;

    const memoryKey = `kpss_syl_${activeKpssExam}_${subject}`;
    const savedProgress = JSON.parse(localStorage.getItem(memoryKey)) || [];

    list.innerHTML = '';
    topics.forEach((topic, index) => {
        const isCompleted = savedProgress.includes(index);
        list.innerHTML += `
            <div style="display:flex; align-items:center; gap:10px; background:#1a1a1a; padding:12px; border-radius:8px; border:1px solid #333;" onclick="toggleSyllabusTopic('${subject}', ${index}, ${!isCompleted})">
                <div style="width:18px; height:18px; border:2px solid var(--goldnova); border-radius:4px; display:flex; justify-content:center; align-items:center; background:${isCompleted ? 'var(--goldnova)' : 'transparent'};">
                    ${isCompleted ? '<span style="color:#000; font-size:12px; font-weight:bold;">✓</span>' : ''}
                </div>
                <span style="color: ${isCompleted ? '#888' : '#fff'}; font-size: 13px; text-decoration: ${isCompleted ? 'line-through' : 'none'};">${topic}</span>
            </div>
        `;
    });

    const pct = topics.length > 0 ? Math.round((savedProgress.length / topics.length) * 100) : 0;
    bar.style.width = pct + '%';
    pctText.innerText = `%${pct}`;

    modal.style.display = 'flex';
};

window.toggleSyllabusTopic = function (subject, index, isDone) {
    const memoryKey = `kpss_syl_${activeKpssExam}_${subject}`;
    let savedProgress = JSON.parse(localStorage.getItem(memoryKey)) || [];

    if (isDone) {
        if (!savedProgress.includes(index)) savedProgress.push(index);
        if (navigator.vibrate) navigator.vibrate([20, 30]);
    } else {
        savedProgress = savedProgress.filter(i => i !== index);
    }

    localStorage.setItem(memoryKey, JSON.stringify(savedProgress));
    openKPSSSyllabus(subject); // Arayüzü yenile
};

// --- 5. OLY-AI SOHBET VE PROGRAM YARATICI ---
let aiChatStep = 0;
let aiTempData = { weak: "", restDay: "" };

window.openKPSSCreatorSelector = function () {
    document.getElementById('kpss-creator-selector-modal').style.display = 'flex';
};

window.startKpssAiChat = function () {
    document.getElementById('kpss-creator-selector-modal').style.display = 'none';
    const chatModal = document.getElementById('kpss-ai-chat-modal');
    const msgBox = document.getElementById('kpss-ai-messages');

    aiChatStep = 0;
    aiTempData = { weak: "", restDay: "" };

    msgBox.innerHTML = ''; // Temizle
    document.getElementById('kpss-ai-input').value = '';
    document.getElementById('kpss-ai-approve-area').style.display = 'none';
    document.getElementById('kpss-ai-input-area').style.display = 'flex';

    chatModal.style.display = 'flex';

    // Oly İlk Soruyu Sorar
    appendKpssAiMsg("Merhaba şampiyon! Sana özel bir program yapmam için en çok zorlandığın dersi yazar mısın? (Örn: Matematik, Tarih)", 'ai');
};

window.handleKpssAiResponse = function () {
    const inputEl = document.getElementById('kpss-ai-input');
    const text = inputEl.value.trim();
    if (!text) return;

    appendKpssAiMsg(text, 'user');
    inputEl.value = '';

    if (aiChatStep === 0) {
        aiTempData.weak = text;
        aiChatStep++;
        setTimeout(() => {
            appendKpssAiMsg(`Anladım, ağırlığı ${text} dersine vereceğiz. Peki haftada hangi gün "Deneme Sınavı" günü olsun? (1-Pazartesi, 7-Pazar gibi gün yazabilirsin)`, 'ai');
        }, 800);
    } else if (aiChatStep === 1) {
        aiTempData.restDay = text;
        aiChatStep++;
        setTimeout(() => {
            appendKpssAiMsg(`Harika. ${activeKpssExam === 'onlisans' ? 'Ön Lisans' : 'Ortaöğretim'} müfredatına ve ${aiTempData.weak} eksiğine göre muazzam bir program inşa ettim! \n\nHer haftaya 1 gün Deneme Sınavı otomatik eklendi. Aşağıdan onaylayıp sisteme entegre edebilirsin.`, 'ai');
            document.getElementById('kpss-ai-input-area').style.display = 'none';
            document.getElementById('kpss-ai-approve-area').style.display = 'flex';
        }, 1200);
    }
};

function appendKpssAiMsg(text, sender) {
    const box = document.getElementById('kpss-ai-messages');
    const bg = sender === 'ai' ? '#222' : 'var(--goldnova)';
    const color = sender === 'ai' ? '#fff' : '#000';
    const align = sender === 'ai' ? 'flex-start' : 'flex-end';

    box.innerHTML += `
        <div style="align-self: ${align}; background: ${bg}; color: ${color}; padding: 10px 14px; border-radius: 12px; font-size: 13px; max-width: 80%; line-height: 1.4;">
            ${text}
        </div>
    `;
    box.scrollTop = box.scrollHeight;
}

window.approveKpssAiProgram = function () {
    // Yapay Zekanın Yarattığı Program Mantığı
    const weak = aiTempData.weak || "Matematik";
    let generatedSchedule = {
        1: [{ sub: "Türkçe", topic: "Soru Çözümü" }, { sub: weak, topic: "Konu Çalışması" }],
        2: [{ sub: "Tarih", topic: "Konu Çalışması" }, { sub: "Coğrafya", topic: "Harita" }],
        3: [{ sub: weak, topic: "Soru Kampı" }, { sub: "Vatandaşlık", topic: "Konu Çalışması" }],
        4: [{ sub: "Matematik", topic: "Genel Tekrar" }, { sub: "Türkçe", topic: "Dil Bilgisi" }],
        5: [{ sub: "Tarih", topic: "Soru Çözümü" }, { sub: weak, topic: "Deneme Analizi" }],
        6: [{ sub: "Deneme Sınavı", topic: "Genel Yetenek - Genel Kültür" }],
        0: [{ sub: "Genel Tekrar", topic: "Haftalık Kapanış" }]
    };

    localStorage.setItem(`olympus_kpss_schedule_${activeKpssExam}`, JSON.stringify(generatedSchedule));

    document.getElementById('kpss-ai-chat-modal').style.display = 'none';
    renderKPSSTodayOrWeek();
    alert("✅ Sistem başarıyla güncellendi! Yeni programın devrede.");
    if (navigator.vibrate) navigator.vibrate([50, 100]);
};

window.openKPSSManualBuilder = function () {
    document.getElementById('kpss-creator-selector-modal').style.display = 'none';
    document.getElementById('kpss-edit-modal').style.display = 'flex';
    // Otomatik olarak bugünü seç
    document.getElementById('kpss-edit-day').value = new Date().getDay().toString();
    if (typeof renderKPSSEditList === 'function') renderKPSSEditList();
};

// ==========================================
// ⏳ GELİŞMİŞ POMODORO MOTORU (GHOST CLICK KORUMALI)
// ==========================================
let kpssPomodoroInterval;
let kpssTime = 45 * 60;
let isKPSSRunning = false;
let pomodoroPressTimer;
let isPomodoroLongPress = false;
let lastPomodoroAction = 0; // Çift tıklama kalkanı

window.startPomodoroPress = function () {
    isPomodoroLongPress = false;
    pomodoroPressTimer = setTimeout(() => {
        isPomodoroLongPress = true;
        resetKPSSPomodoro(); // 600ms basılı tutarsan sıfırlar
    }, 600);
};

window.endPomodoroPress = function () {
    clearTimeout(pomodoroPressTimer);

    // Aynı anda gelen hayalet çift tıklamaları (simülatör hatası) engelle
    const now = Date.now();
    if (now - lastPomodoroAction < 300) return;
    lastPomodoroAction = now;

    if (!isPomodoroLongPress) {
        toggleKPSSPomodoro();
    }
};

window.cancelPomodoroPress = function () {
    clearTimeout(pomodoroPressTimer);
};

window.toggleKPSSPomodoro = function () {
    const btn = document.getElementById('kpss-pomodoro-time');

    if (isKPSSRunning) {
        // DURAKLAT
        clearInterval(kpssPomodoroInterval);
        isKPSSRunning = false;
        btn.innerText = formatKpssTime() + " ▶";
        hideKpssIsland();
        if (navigator.vibrate) navigator.vibrate(20);
    } else {
        // BAŞLAT
        isKPSSRunning = true;
        if (navigator.vibrate) navigator.vibrate(30);

        kpssPomodoroInterval = setInterval(() => {
            kpssTime--;
            btn.innerText = formatKpssTime() + " ⏸";
            updateKpssIsland(); // Adayı Canlandır

            if (kpssTime <= 0) {
                clearInterval(kpssPomodoroInterval);
                isKPSSRunning = false;
                hideKpssIsland();
                resetKPSSPomodoro();
                alert("⏰ 45 Dakikalık odaklanma seansı bitti! 10 dakika zihni boşalt.");
                if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
            }
        }, 1000);
    }
};

window.resetKPSSPomodoro = function () {
    clearInterval(kpssPomodoroInterval);
    isKPSSRunning = false;
    kpssTime = 45 * 60;
    document.getElementById('kpss-pomodoro-time').innerText = "45:00 ▶";
    hideKpssIsland();
    if (navigator.vibrate) navigator.vibrate([50, 50]);
};

function formatKpssTime() {
    let m = Math.floor(kpssTime / 60).toString().padStart(2, '0');
    let s = (kpssTime % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// 🏝️ DİNAMİK ADA ENTEGRASYONU
function updateKpssIsland() {
    const island = document.getElementById('dynamic-island');
    if (!island) return;
    if (!island.classList.contains('active')) island.classList.add('active');

    const textEl = document.getElementById('di-text');
    if (textEl) {
        textEl.innerHTML = `<span style="color:#8e44ad; font-weight:900;">📚 Odak:</span> <span style="font-family:monospace; color:#fff; font-size:14px;">${formatKpssTime()}</span>`;
        textEl.style.display = 'inline-block';
    }
    const coinDisplay = document.getElementById('island-coin-display');
    if (coinDisplay) coinDisplay.style.display = 'none';
}

function hideKpssIsland() {
    const island = document.getElementById('dynamic-island');
    if (island) island.classList.remove('active');
}
// ==========================================
// ✏️ GÜVENLİ MANUEL DÜZENLEME (EDİTÖR) MOTORU
// ==========================================
window.renderKPSSEditList = function () {
    const day = document.getElementById('kpss-edit-day').value;

    // Hafızadan çek, yoksa o haftanın varsayılan kamp programını güvenle al
    const memoryKey = `olympus_kpss_schedule_${activeKpssExam}_w${activeKpssWeek}`;
    let savedSchedule = JSON.parse(localStorage.getItem(memoryKey));

    if (!savedSchedule) {
        savedSchedule = getBaseKPSSSchedule(activeKpssExam, activeKpssWeek);
    }

    const lessons = savedSchedule[day] || [];
    const listEl = document.getElementById('kpss-edit-list');

    listEl.innerHTML = '';
    if (lessons.length === 0) {
        listEl.innerHTML = '<p style="color:#888; font-size:12px; text-align:center;">Bu güne ait ders yok.</p>';
        return;
    }

    lessons.forEach((l, index) => {
        listEl.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#1a1a1a; padding:10px 15px; border-radius:8px; border:1px solid #333;">
                <div>
                    <span style="color:#fff; font-size:13px; font-weight:bold;">${l.sub}</span><br>
                    <span style="color:#888; font-size:11px;">${l.topic}</span>
                </div>
                <button onclick="deleteKPSSLesson('${day}', ${index})" style="background:transparent; border:none; color:#ff4444; cursor:pointer; font-size: 18px;">🗑️</button>
            </div>
        `;
    });
};

window.addKPSSLesson = function () {
    const day = document.getElementById('kpss-edit-day').value;
    const sub = document.getElementById('kpss-new-sub').value.trim();
    const topic = document.getElementById('kpss-new-topic').value.trim();

    if (!sub || !topic) { alert("Lütfen ders ve konu adı girin."); return; }

    const memoryKey = `olympus_kpss_schedule_${activeKpssExam}_w${activeKpssWeek}`;
    let savedSchedule = JSON.parse(localStorage.getItem(memoryKey)) || getBaseKPSSSchedule(activeKpssExam, activeKpssWeek);

    if (!savedSchedule[day]) savedSchedule[day] = [];

    savedSchedule[day].push({ sub: sub, topic: topic });
    localStorage.setItem(memoryKey, JSON.stringify(savedSchedule));

    document.getElementById('kpss-new-sub').value = '';
    document.getElementById('kpss-new-topic').value = '';
    renderKPSSEditList(); // Listeyi yenile
    if (navigator.vibrate) navigator.vibrate(20);
};

window.deleteKPSSLesson = function (day, index) {
    const memoryKey = `olympus_kpss_schedule_${activeKpssExam}_w${activeKpssWeek}`;
    let savedSchedule = JSON.parse(localStorage.getItem(memoryKey)) || getBaseKPSSSchedule(activeKpssExam, activeKpssWeek);

    savedSchedule[day].splice(index, 1);
    localStorage.setItem(memoryKey, JSON.stringify(savedSchedule));
    renderKPSSEditList(); // Listeyi yenile
    if (navigator.vibrate) navigator.vibrate(20);
};


// ==========================================
// 🔄 PROGRAMI VARSAYILAN KAMP AYARLARINA SIFIRLA
// ==========================================
// (Sıfırlama motoru çoklu hafta desteğiyle aşağıda tanımlı)
// ==========================================
// 📅 ÇOKLU HAFTA VERİTABANI (ÖN LİSANS 5 HAFTALIK KAMP)
// ==========================================
let activeKpssWeek = 1; // Varsayılan hafta

function getBaseKPSSSchedule(examType, weekNum) {
    if (examType === 'onlisans') {
        // ==========================================
        // 🔥 ÖN LİSANS 7 HAFTALIK NOKTA ATIŞI KAMP
        // ==========================================
        if (weekNum === 1) return {
            4: [{ sub: "Türkçe", topic: "Sözcükte Anlam + Gerçek/Mecaz/Terim + Anlam İlişkileri" }, { sub: "Matematik", topic: "Temel Kavramlar + Sayı Kümeleri + Tek/Çift + Poz/Neg" }, { sub: "Tarih", topic: "İslamiyet Öncesi + İlk Türk Devletleri" }],
            5: [{ sub: "Türkçe", topic: "Cümlede Anlam + Kesinlik/Olasılık/Varsayım + Neden/Amaç-Sonuç" }, { sub: "Matematik", topic: "Basamak Kavramı + Çözümleme + Sayı Sistemleri" }, { sub: "Tarih", topic: "İlk Türk-İslam + Karahanlılar + Gazneliler + Büyük Selçuklu" }],
            6: [{ sub: "Türkçe", topic: "Paragraf + Ana/Yardımcı Düşünce" }, { sub: "Matematik", topic: "Bölme-Bölünebilme + Asal Sayılar/Çarpanlar" }, { sub: "Coğrafya", topic: "Coğrafi Konum + Matematik/Özel Konum" }],
            0: [{ sub: "Türkçe", topic: "30 Paragraf" }, { sub: "Matematik", topic: "EBOB + EKOK" }, { sub: "Tarih", topic: "TR Selçuklu + Beylikler" }, { sub: "Genel Tekrar", topic: "İlk 3 Gün Yanlışları" }],
            1: [{ sub: "Türkçe", topic: "Paragrafta Yapı + Giriş-Gelişme-Sonuç + Akış Bozan" }, { sub: "Matematik", topic: "Rasyonel Sayılar" }, { sub: "Tarih", topic: "Osmanlı Kuruluş (Osman/Orhan/I.Murat)" }],
            2: [{ sub: "Türkçe", topic: "Paragraf (30-40 Soru)" }, { sub: "Matematik", topic: "Ondalık Sayılar + Basit Denklemler" }, { sub: "Tarih", topic: "Osmanlı Yükselme (Fatih/Yavuz/Kanuni)" }],
            3: [{ sub: "Hafta Tekrarı", topic: "Türkçe: 30 Paragraf + Mat: 30-40 Karma + Tarih: Kuruluş/Yükselme + Coğrafya: Konum" }]
        };
        if (weekNum === 2) return {
            4: [{ sub: "Türkçe", topic: "Sözcük Türleri + İsim + Sıfat" }, { sub: "Matematik", topic: "Üslü Sayılar" }, { sub: "Tarih", topic: "Osmanlı Kültür ve Medeniyeti" }],
            5: [{ sub: "Türkçe", topic: "Zamir + Zarf + Edat + Bağlaç + Ünlem" }, { sub: "Matematik", topic: "Köklü Sayılar" }, { sub: "Coğrafya", topic: "Yer Şekilleri + Dağlar/Ovalar/Platolar" }],
            6: [{ sub: "Türkçe", topic: "Fiiller" }, { sub: "Matematik", topic: "Mutlak Değer" }, { sub: "Tarih", topic: "Osmanlı Duraklama + 17.yy Islahatları" }],
            0: [{ sub: "Türkçe", topic: "Fiil Çekimleri + Fiilimsiye Giriş" }, { sub: "Matematik", topic: "Oran-Orantı" }, { sub: "Coğrafya", topic: "İklim Tipleri + Sıcaklık/Yağış" }],
            1: [{ sub: "Türkçe", topic: "Fiilimsiler" }, { sub: "Matematik", topic: "Birinci Derece Denklemler" }, { sub: "Tarih", topic: "Osmanlı Gerileme + 18.yy Islahatları" }],
            2: [{ sub: "Türkçe", topic: "Cümlenin Ögeleri" }, { sub: "Matematik", topic: "Basit Eşitsizlik" }, { sub: "Coğrafya", topic: "Bitki Örtüsü + Toprak Tipleri" }],
            3: [{ sub: "2. Hafta Tekrarı", topic: "30 Paragraf + 40 Mat + 30 Tarih + 20 Coğrafya + Yanlış Analizi" }]
        };
        if (weekNum === 3) return {
            4: [{ sub: "Türkçe", topic: "Cümle Türleri" }, { sub: "Matematik", topic: "Sayı Problemleri" }, { sub: "Tarih", topic: "Osmanlı Dağılma Dönemi" }],
            5: [{ sub: "Türkçe", topic: "Yazım Kuralları" }, { sub: "Matematik", topic: "Yaş Problemleri" }, { sub: "Coğrafya", topic: "Nüfus" }],
            6: [{ sub: "Türkçe", topic: "Noktalama İşaretleri" }, { sub: "Matematik", topic: "Yüzde Problemleri" }, { sub: "Tarih", topic: "19.yy Osmanlı + Tanzimat/Islahat/Meşrutiyet" }],
            0: [{ sub: "Türkçe", topic: "40 Paragraf" }, { sub: "Matematik", topic: "Kâr-Zarar Problemleri" }, { sub: "Coğrafya", topic: "Göç + Yerleşme" }],
            1: [{ sub: "Türkçe", topic: "Anlatım Bozukluğu" }, { sub: "Matematik", topic: "Karışım Problemleri" }, { sub: "Tarih", topic: "Trablusgarp + Balkan Savaşları" }],
            2: [{ sub: "Türkçe", topic: "Sözel Mantığa Giriş" }, { sub: "Matematik", topic: "İşçi Problemleri" }, { sub: "Coğrafya", topic: "Tarım + Tarım Ürünleri" }],
            3: [{ sub: "Hafta Tekrarı", topic: "40 Paragraf + 40 Mat + 30 Tarih + 20 Coğrafya" }]
        };
        if (weekNum === 4) return {
            4: [{ sub: "Türkçe", topic: "Sözel Mantık" }, { sub: "Matematik", topic: "Havuz Problemleri" }, { sub: "Tarih", topic: "I. Dünya Savaşı" }],
            5: [{ sub: "Türkçe", topic: "Paragraf" }, { sub: "Matematik", topic: "Hız Problemleri" }, { sub: "Tarih", topic: "Mondros Ateşkesi" }],
            6: [{ sub: "Türkçe", topic: "Dil Bilgisi Tekrar" }, { sub: "Matematik", topic: "Grafik ve Tablo" }, { sub: "Coğrafya", topic: "Hayvancılık" }],
            0: [{ sub: "Türkçe", topic: "40 Paragraf" }, { sub: "Matematik", topic: "Problemler Karma" }, { sub: "Tarih", topic: "Kuvayımilliye" }],
            1: [{ sub: "Türkçe", topic: "Anlatım Bozukluğu" }, { sub: "Matematik", topic: "Karışık Problemler" }, { sub: "Tarih", topic: "Amasya Genelgesi" }],
            2: [{ sub: "Türkçe", topic: "Sözel Mantık" }, { sub: "Matematik", topic: "Geometriye Giriş" }, { sub: "Tarih", topic: "Erzurum ve Sivas Kongreleri" }],
            3: [{ sub: "Mini Deneme", topic: "100 Soru (30 Tür + 30 Mat + 20 Tar + 10 Coğ + 10 Vat) - Süreli" }]
        };
        if (weekNum === 5) return {
            4: [{ sub: "Tarih", topic: "TBMM'nin Açılması + I. TBMM" }, { sub: "Matematik", topic: "Açılar" }, { sub: "Türkçe", topic: "30 Paragraf" }],
            5: [{ sub: "Tarih", topic: "Kurtuluş Savaşı Cepheleri" }, { sub: "Matematik", topic: "Üçgenler" }, { sub: "Coğrafya", topic: "Madenler + Enerji Kaynakları" }],
            6: [{ sub: "Tarih", topic: "Sakarya Savaşı + Büyük Taarruz" }, { sub: "Matematik", topic: "Dörtgenler" }, { sub: "Türkçe", topic: "Sözel Mantık" }],
            0: [{ sub: "Tarih", topic: "Mudanya + Lozan" }, { sub: "Matematik", topic: "Alan" }, { sub: "Vatandaşlık", topic: "Hukukun Temel Kavramları" }],
            1: [{ sub: "Tarih", topic: "Cumhuriyet'in İlanı + Halifeliğin Kaldırılması" }, { sub: "Matematik", topic: "Çember" }, { sub: "Coğrafya", topic: "Sanayi" }],
            2: [{ sub: "Tarih", topic: "Atatürk İlkeleri" }, { sub: "Matematik", topic: "Geometri Karma" }, { sub: "Vatandaşlık", topic: "Anayasa" }],
            3: [{ sub: "1. TAM DENEME", topic: "120 Soru - Gerçek Sınav Düzeni + Detaylı Analiz" }]
        };
        if (weekNum === 6) return {
            4: [{ sub: "Tarih", topic: "Atatürk İnkılapları" }, { sub: "Matematik", topic: "Problemler Karma" }, { sub: "Türkçe", topic: "Paragraf" }],
            5: [{ sub: "Tarih", topic: "Atatürk Dönemi İç Politika" }, { sub: "Coğrafya", topic: "Ulaşım + Ticaret" }, { sub: "Vatandaşlık", topic: "Temel Haklar" }],
            6: [{ sub: "Tarih", topic: "Atatürk Dönemi Dış Politika" }, { sub: "Matematik", topic: "Sayılar + Problemler" }, { sub: "Türkçe", topic: "Dil Bilgisi Karma" }],
            0: [{ sub: "2. TAM DENEME", topic: "120 Soru (Min. 2.5 Saat) + Yanlış Analizi" }],
            1: [{ sub: "Eksik Kapatma", topic: "Sadece Kötü Yapılan Konulara Odaklanma" }],
            2: [{ sub: "3. TAM DENEME", topic: "120 Soru + Kapsamlı Yanlış Analizi" }],
            3: [{ sub: "GENEL TEKRAR", topic: "Tarih Kronoloji + Coğrafya Bilgileri + Vatandaşlık + Mat Formüller + Türk Kuralları" }]
        };
        if (weekNum >= 7) return {
            4: [{ sub: "SON TAM DENEME", topic: "Sınav Stratejisi Oturtma + Boş/Yanlış ve Süre İncelemesi" }],
            5: [{ sub: "Tarih", topic: "Osmanlı Kronoloji + Kurtuluş + İnkılap/İlkeler" }, { sub: "Coğrafya", topic: "İklim + Nüfus + Tarım + Maden + Sanayi + Bölgeler" }, { sub: "Vatandaşlık", topic: "Anayasa + Yasama + Yürütme + Yargı" }],
            6: [{ sub: "Son Tekrar", topic: "30 Paragraf + 20-30 Mat + Kısa Tarih Tekrarı + Yanlış Defteri (Maks 2-3 Saat)" }],
            0: [{ sub: "SINAV GÜNÜ", topic: "Zihni Boşaltma + Sadece Formül/Kronoloji Gözden Geçirme" }],
            1: [{ sub: "ŞAMPİYONLUK", topic: "Sınav Bitti, Zafer Senin!" }],
            2: [{ sub: "ŞAMPİYONLUK", topic: "Sınav Bitti, Zafer Senin!" }],
            3: [{ sub: "ŞAMPİYONLUK", topic: "Sınav Bitti, Zafer Senin!" }]
        };
        return { 1: [{ sub: "Ön Lisans", topic: "Kamp Programı" }] };
    } else {
        // ==========================================
        // 🔥 ORTAÖĞRETİM 10 HAFTALIK NOKTA ATIŞI KAMP
        // ==========================================
        if (weekNum === 1) return {
            4: [{ sub: "Türkçe", topic: "Sözcükte Anlam + Gerçek/Mecaz/Terim + Eş/Zıt/Eş Sesli" }, { sub: "Matematik", topic: "Temel Kavramlar + Sayı Kümeleri + Tek-Çift" }, { sub: "Tarih", topic: "İslamiyet Öncesi + İlk Türk Devletleri" }],
            5: [{ sub: "Türkçe", topic: "Cümlede Anlam + Neden-Sonuç/Amaç-Sonuç/Koşul/Varsayım" }, { sub: "Matematik", topic: "Basamak Kavramı + Sayı Çözümleme" }, { sub: "Tarih", topic: "İlk Türk-İslam + Karahanlılar + Gazneliler + B.Selçuklu" }],
            6: [{ sub: "Türkçe", topic: "Paragrafta Ana Düşünce + Yardımcı Düşünce" }, { sub: "Matematik", topic: "Bölme-Bölünebilme + Asal Sayılar" }, { sub: "Coğrafya", topic: "Coğrafi Konum + Matematik/Özel Konum" }],
            0: [{ sub: "Türkçe", topic: "30 Paragraf" }, { sub: "Matematik", topic: "EBOB-EKOK" }, { sub: "Tarih", topic: "Türkiye Selçuklu + Anadolu Beylikleri" }, { sub: "Tekrar", topic: "İlk 3 Günün Yanlışları" }],
            1: [{ sub: "Türkçe", topic: "Paragrafta Yapı + Akış Bozan + Tamamlama" }, { sub: "Matematik", topic: "Rasyonel Sayılar" }, { sub: "Tarih", topic: "Osmanlı Kuruluş Dönemi" }],
            2: [{ sub: "Türkçe", topic: "30-40 Paragraf" }, { sub: "Matematik", topic: "Ondalık Sayılar + Basit Denklemler" }, { sub: "Tarih", topic: "Osmanlı Yükselme (Fatih/Yavuz/Kanuni)" }],
            3: [{ sub: "Hafta Tekrarı", topic: "30 Paragraf + 30 Mat + 30 Tarih + 20 Coğ + Yanlış Defteri" }]
        };
        if (weekNum === 2) return {
            4: [{ sub: "Türkçe", topic: "Sözcük Türleri (İsim, Sıfat)" }, { sub: "Matematik", topic: "Üslü Sayılar" }, { sub: "Tarih", topic: "Osmanlı Kültür ve Medeniyeti" }],
            5: [{ sub: "Türkçe", topic: "Zamir + Zarf + Edat + Bağlaç + Ünlem" }, { sub: "Matematik", topic: "Köklü Sayılar" }, { sub: "Coğrafya", topic: "Türkiye'nin Yer Şekilleri" }],
            6: [{ sub: "Türkçe", topic: "Fiiller" }, { sub: "Matematik", topic: "Mutlak Değer" }, { sub: "Tarih", topic: "Osmanlı Duraklama Dönemi" }],
            0: [{ sub: "Türkçe", topic: "Fiil Çekimleri" }, { sub: "Matematik", topic: "Oran-Orantı" }, { sub: "Coğrafya", topic: "Türkiye'de İklim" }],
            1: [{ sub: "Türkçe", topic: "Fiilimsiler" }, { sub: "Matematik", topic: "Birinci Derece Denklemler" }, { sub: "Tarih", topic: "XVII. Yüzyıl Islahatları" }],
            2: [{ sub: "Türkçe", topic: "Cümlenin Ögeleri" }, { sub: "Matematik", topic: "Basit Eşitsizlik" }, { sub: "Coğrafya", topic: "Bitki Örtüsü + Toprak" }],
            3: [{ sub: "Hafta Tekrarı", topic: "40 Türkçe + 40 Mat + 30 Tarih + 20 Coğrafya" }]
        };
        if (weekNum === 3) return {
            4: [{ sub: "Türkçe", topic: "Cümle Türleri" }, { sub: "Matematik", topic: "Sayı Problemleri" }, { sub: "Tarih", topic: "Osmanlı Gerileme Dönemi" }],
            5: [{ sub: "Türkçe", topic: "Yazım Kuralları" }, { sub: "Matematik", topic: "Yaş Problemleri" }, { sub: "Coğrafya", topic: "Nüfus" }],
            6: [{ sub: "Türkçe", topic: "Noktalama İşaretleri" }, { sub: "Matematik", topic: "Yüzde Problemleri" }, { sub: "Tarih", topic: "XVIII-XIX. Yüzyıl Islahatları" }],
            0: [{ sub: "Türkçe", topic: "40 Paragraf" }, { sub: "Matematik", topic: "Kâr-Zarar Problemleri" }, { sub: "Coğrafya", topic: "Göç ve Yerleşme" }],
            1: [{ sub: "Türkçe", topic: "Anlatım Bozukluğu" }, { sub: "Matematik", topic: "Karışım Problemleri" }, { sub: "Tarih", topic: "Trablusgarp + Balkan Savaşları" }],
            2: [{ sub: "Türkçe", topic: "Sözel Mantığa Giriş" }, { sub: "Matematik", topic: "İşçi Problemleri" }, { sub: "Coğrafya", topic: "Tarım" }],
            3: [{ sub: "Hafta Tekrarı", topic: "40 Paragraf + 40 Mat + 30 Tarih + 20 Coğrafya" }]
        };
        if (weekNum === 4) return {
            4: [{ sub: "Türkçe", topic: "Sözel Mantık" }, { sub: "Matematik", topic: "Havuz Problemleri" }, { sub: "Tarih", topic: "I. Dünya Savaşı" }],
            5: [{ sub: "Türkçe", topic: "Paragraf" }, { sub: "Matematik", topic: "Hız Problemleri" }, { sub: "Tarih", topic: "Mondros Ateşkesi" }],
            6: [{ sub: "Türkçe", topic: "Dil Bilgisi Karma" }, { sub: "Matematik", topic: "Grafik ve Tablo" }, { sub: "Coğrafya", topic: "Hayvancılık" }],
            0: [{ sub: "Türkçe", topic: "40 Paragraf" }, { sub: "Matematik", topic: "Karma Problemler" }, { sub: "Tarih", topic: "Kuvayımilliye" }],
            1: [{ sub: "Türkçe", topic: "Anlatım Bozukluğu" }, { sub: "Matematik", topic: "Karma Problemler" }, { sub: "Tarih", topic: "Amasya Genelgesi" }],
            2: [{ sub: "Türkçe", topic: "Sözel Mantık" }, { sub: "Matematik", topic: "Geometriye Giriş" }, { sub: "Tarih", topic: "Erzurum + Sivas Kongreleri" }],
            3: [{ sub: "İLK MİNİ DENEME", topic: "100 Soru (30 Tür + 30 Mat + 20 Tar + 10 Coğ + 10 Vat) Süreli + Analiz" }]
        };
        if (weekNum === 5) return {
            4: [{ sub: "Tarih", topic: "TBMM'nin Açılması" }, { sub: "Matematik", topic: "Açılar" }, { sub: "Türkçe", topic: "30 Paragraf" }],
            5: [{ sub: "Tarih", topic: "Kurtuluş Savaşı Cepheleri" }, { sub: "Matematik", topic: "Üçgenler" }, { sub: "Coğrafya", topic: "Madenler + Enerji" }],
            6: [{ sub: "Tarih", topic: "Sakarya + Büyük Taarruz" }, { sub: "Matematik", topic: "Dörtgenler" }, { sub: "Türkçe", topic: "Sözel Mantık" }],
            0: [{ sub: "Tarih", topic: "Mudanya + Lozan" }, { sub: "Matematik", topic: "Alan" }, { sub: "Vatandaşlık", topic: "Hukukun Temel Kavramları" }],
            1: [{ sub: "Tarih", topic: "Cumhuriyet'in İlanı + Halifeliğin Kaldırılması" }, { sub: "Matematik", topic: "Çember" }, { sub: "Coğrafya", topic: "Sanayi" }],
            2: [{ sub: "Tarih", topic: "Atatürk İlkeleri" }, { sub: "Matematik", topic: "Geometri Karma" }, { sub: "Vatandaşlık", topic: "Anayasa" }],
            3: [{ sub: "1. TAM DENEME", topic: "120 Soru - Gerçek Sınav Ortamı + Konu Bazlı Hata Analizi" }]
        };
        if (weekNum === 6) return {
            4: [{ sub: "Tarih", topic: "Atatürk İnkılapları" }, { sub: "Matematik", topic: "Problemler Karma" }, { sub: "Türkçe", topic: "Paragraf" }],
            5: [{ sub: "Tarih", topic: "Atatürk Dönemi İç Politika" }, { sub: "Coğrafya", topic: "Ulaşım + Ticaret" }, { sub: "Vatandaşlık", topic: "Temel Haklar" }],
            6: [{ sub: "Tarih", topic: "Atatürk Dönemi Dış Politika" }, { sub: "Matematik", topic: "Sayılar + Problemler" }, { sub: "Türkçe", topic: "Dil Bilgisi Karma" }],
            0: [{ sub: "2. TAM DENEME", topic: "120 Soru + Zorunlu Yanlış Analizi" }],
            1: [{ sub: "🎯 EKSİK KAPATMA", topic: "Denemede En Çok Yanlış Yapılan 3 Konuyu Çalış" }],
            2: [{ sub: "3. TAM DENEME", topic: "120 Soru Çözümü" }],
            3: [{ sub: "GENEL TEKRAR", topic: "Tarih Kronoloji + Coğrafya Bilgileri + Vatandaşlık + Mat Formüller + Türk Kuralları" }]
        };
        if (weekNum === 7) return {
            4: [{ sub: "TAM DENEME", topic: "120 Soru Çözümü" }],
            5: [{ sub: "Tarih", topic: "Osmanlı + Kurtuluş Savaşı + Atatürk" }, { sub: "Coğrafya", topic: "İklim + Nüfus + Tarım + Sanayi" }],
            6: [{ sub: "Matematik", topic: "Problemler + Geometri + Sayılar" }, { sub: "Türkçe", topic: "40 Paragraf + Dil Bilgisi" }],
            0: [{ sub: "TAM DENEME", topic: "120 Soru Çözümü" }],
            1: [{ sub: "Deneme Analizi", topic: "Sadece Yanlış Çıkan Konular" }],
            2: [{ sub: "Vatandaşlık", topic: "Anayasa + Yasama + Yürütme + Yargı" }, { sub: "Tarih", topic: "30 Soru Pratiği" }],
            3: [{ sub: "TAM DENEME", topic: "120 Soru Çözümü" }]
        };
        if (weekNum === 8) return {
            4: [{ sub: "Tarih", topic: "Genel Tekrar + 50 Soru" }],
            5: [{ sub: "Coğrafya", topic: "Genel Tekrar + 40 Soru" }],
            6: [{ sub: "Matematik", topic: "Problemler + Geometri + Grafik + 60 Soru" }],
            0: [{ sub: "TAM DENEME", topic: "120 Soru Çözümü" }],
            1: [{ sub: "Analiz", topic: "Deneme Analizi + Yanlış Defteri Güncelleme" }],
            2: [{ sub: "Türkçe", topic: "40 Paragraf + Sözel Mantık + Dil Bilgisi" }],
            3: [{ sub: "TAM DENEME", topic: "120 Soru Çözümü" }]
        };
        if (weekNum === 9) return {
            4: [{ sub: "Tarih", topic: "Osmanlı Kronolojisi + Milli Mücadele + Atatürk" }],
            5: [{ sub: "Coğrafya", topic: "Türkiye Fiziki + Nüfus + Tarım + Ekonomi + Bölgeler" }],
            6: [{ sub: "Vatandaşlık", topic: "Anayasa + Temel Haklar + Yasama + Yürütme + Yargı" }],
            0: [{ sub: "TAM DENEME", topic: "120 Soru - Gerçek Sınav Süresi ve Ortamı" }],
            1: [{ sub: "Analiz", topic: "Deneme Analizi - Sadece Eksiklere Bakış (Yeni Konu Yok)" }],
            2: [{ sub: "SON CİDDİ DENEME", topic: "120 Soru Çözümü" }],
            3: [{ sub: "SON BÜYÜK TEKRAR", topic: "Yanlış Defteri + Kronoloji + Kısa Notlar + Formüller" }]
        };
        if (weekNum >= 10) return {
            4: [{ sub: "Tarih", topic: "İlk Türk + Osmanlı + Milli Müc + Atatürk" }, { sub: "Coğrafya", topic: "İklim/Nüfus/Tarım/Maden/Sanayi/Bölgeler" }],
            5: [{ sub: "Türkçe", topic: "Paragraf/Yazım/Noktalama/Dil Bilgisi" }, { sub: "Matematik", topic: "Problemler + Geometri + Formüller" }, { sub: "Vatandaşlık", topic: "Anayasa/Yasama/Yürütme/Yargı" }],
            6: [{ sub: "🛑 ARTIK DERSİ BIRAKIYORUZ", topic: "Deneme Yok / Sadece 1-2 Saat Yanlış Defteri ve Kısa Notlar" }, { sub: "Dinlenme", topic: "Akşam Erkenden Dinlen" }],
            0: [{ sub: "🏆 SINAV GÜNÜ", topic: "10 Paragraf + Mat Formüllerine Göz At ve Bırak." }, { sub: "ZAFER!", topic: "Şampiyonluk Seni Bekliyor!" }],
            1: [{ sub: "ŞAMPİYONLUK", topic: "Sınav Bitti, Zafer Senin!" }],
            2: [{ sub: "ŞAMPİYONLUK", topic: "Sınav Bitti, Zafer Senin!" }],
            3: [{ sub: "ŞAMPİYONLUK", topic: "Sınav Bitti, Zafer Senin!" }]
        };
    }
}

// ==========================================
// 📅 20 AĞUSTOS BAŞLANGIÇLI OTOMATİK HAFTA HESAPLAYICI
// ==========================================
function updateKpssDateAndWeek() {
    const dateEl = document.getElementById('kpss-current-date');
    const weekSelector = document.getElementById('kpss-week-selector');
    if (!dateEl || !weekSelector) return;

    const now = new Date(); // 20 Ağustos 2026
    const options = { month: 'long', day: 'numeric', weekday: 'long' };
    dateEl.innerText = now.toLocaleDateString('tr-TR', options);

    // Kamp Başlangıcı: 20 Ağustos 2026
    const campStart = new Date("2026-08-20T00:00:00").getTime();
    const diffTime = now.getTime() - campStart;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // 7 günde bir hafta atlar (0-6 gün: 1. Hafta, 7-13 gün: 2. Hafta...)
    let calculatedWeek = Math.floor(diffDays / 7) + 1;
    if (calculatedWeek < 1) calculatedWeek = 1;

    let maxWeek = (activeKpssExam === 'onlisans') ? 7 : 10;
    if (calculatedWeek > maxWeek) calculatedWeek = maxWeek;

    // Eğer kullanıcı manuel olarak değiştirmediyse otomatik haftayı seç
    if (!window.userManuallySelectedWeek) {
        activeKpssWeek = calculatedWeek;
        weekSelector.value = activeKpssWeek.toString();
    }
}
window.changeKpssWeek = function () {
    window.userManuallySelectedWeek = true; // Kullanıcı elle seçti
    activeKpssWeek = parseInt(document.getElementById('kpss-week-selector').value);
    renderKPSSTodayOrWeek();
    if (navigator.vibrate) navigator.vibrate(20);
};

// ==========================================
// 👁️ İNTERAKTİF GÖRÜNÜM MOTORU (MÜFREDAT VE HAFTA DESTEKLİ)
// ==========================================
window.renderKPSSTodayOrWeek = function () {
    updateKpssDateAndWeek();

    const container = document.getElementById('kpss-schedule-container');
    container.innerHTML = '';

    const memoryKey = `olympus_kpss_schedule_${activeKpssExam}_w${activeKpssWeek}`;
    const schedule = JSON.parse(localStorage.getItem(memoryKey)) || getBaseKPSSSchedule(activeKpssExam, activeKpssWeek);

    if (kpssViewMode === 'today') {
        // --- 1. BUGÜN GÖRÜNÜMÜ ---
        const todayIndex = new Date().getDay();
        const todayLessons = schedule[todayIndex] || [];

        if (todayLessons.length === 0) {
            container.innerHTML = `<div style="padding:20px; text-align:center; background:#111; border-radius:12px; border:1px dashed #333;"><p style="color:#888; font-size:12px;">Bugün için planlanmış ders yok.</p></div>`;
            return;
        }

        const todayStr = new Date().toLocaleDateString('tr-TR');
        const completed = JSON.parse(localStorage.getItem(`kpss_done_${activeKpssExam}_w${activeKpssWeek}_${todayStr}`)) || [];

        todayLessons.forEach((l, index) => {
            const isDone = completed.includes(index);
            const isExam = l.sub.includes("Deneme");
            let bgIcon = isExam ? "📝" : "📚";

            let ytBtnHTML = (isExam || l.sub === "Dinlenme" || l.sub.includes("Günlük") || l.sub.includes("Tekrar")) ? '' :
                `<button class="kpss-youtube-btn" onclick="openKPSSYoutubeSafely('${l.sub}', event)" style="font-size:10px; padding:5px 10px; margin-top:5px; background:rgba(231,76,60,0.2); border:1px solid #e74c3c; color:#fff;">▶ YouTube'da Aç</button>`;

            container.innerHTML += `
                <div class="kpss-card ${isDone ? 'completed' : ''}" data-index="${index}" onclick="openKPSSDailyTopics('${l.sub}', '${l.topic}', ${index})">
                    <div style="z-index:2; display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <div>
                            <h4 class="kpss-card-title">${l.sub}</h4>
                            <span class="kpss-card-subtitle">${l.topic}</span>
                        </div>
                        <div>${ytBtnHTML}</div>
                    </div>
                    <div class="kpss-card-bg-icon">${bgIcon}</div>
                </div>
            `;
        });

        initKpssSwipeEngine();

    } else if (kpssViewMode === 'week') {
        // --- 2. PROGRAM GÖRÜNÜMÜ (HAFTANIN KONULARI AÇIKÇA LİSTELENİR) ---
        container.innerHTML = `<h3 style="color:var(--goldnova); font-size:14px; margin-bottom:10px; text-align:center;">📅 ${activeKpssWeek}. Hafta Planı</h3>`;

        const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
        const sortedDays = [1, 2, 3, 4, 5, 6, 0];

        sortedDays.forEach(dayNum => {
            const lessons = schedule[dayNum] || [];
            let lessonsHTML = '';

            if (lessons.length === 0) {
                lessonsHTML = '<p style="color:#555; font-size:11px; margin:5px 0;">Bu gün için ders planlanmamış.</p>';
            } else {
                lessons.forEach(l => {
                    lessonsHTML += `
                        <div style="background:#151515; border:1px solid #333; padding:8px 10px; border-radius:6px; margin-bottom:6px;">
                            <strong style="color:var(--goldnova); font-size:12px;">📚 ${l.sub}</strong>
                            <p style="color:#ddd; font-size:11px; margin:4px 0 0 0;">Hedef: <span style="color:#fff;">${l.topic}</span></p>
                        </div>
                    `;
                });
            }

            container.innerHTML += `
                <div style="background:#111; border:1px solid #222; border-left:3px solid var(--goldnova); border-radius:8px; margin-bottom:10px; padding:12px;">
                    <strong style="color:#fff; font-size:13px; display:block; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">🗓️ ${dayNames[dayNum]}</strong>
                    <div>${lessonsHTML}</div>
                </div>
            `;
        });

    } else {
        // --- 3. TÜM MÜFREDAT PANORAMASI (TÜM KONULAR + TİKLENEBİLİR) ---
        container.innerHTML = `<h3 style="color:var(--goldnova); font-size:14px; margin-bottom:10px; text-align:center;">📌 Tüm Müfredat Panoraması</h3>`;

        // Aktif sınava göre (Ön Lisans veya Ortaöğretim) tüm müfredatı çekiyoruz
        const syllabus = kpssSyllabusDB[activeKpssExam];

        if (!syllabus) {
            container.innerHTML += `<p style="color:#888; font-size:12px; text-align:center;">Bu sınav için müfredat bulunamadı.</p>`;
            return;
        }

        Object.keys(syllabus).forEach(sub => {
            let topicsArray = syllabus[sub];

            // Konuları tiklenebilir listeye çevir
            let topicCheckboxes = topicsArray.map((t, index) => {
                const sylMemoryKey = `kpss_syl_${activeKpssExam}_${sub}`;
                const savedProgress = JSON.parse(localStorage.getItem(sylMemoryKey)) || [];
                const isCompleted = savedProgress.includes(index);

                return `
                <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #222; cursor:pointer;" onclick="toggleSyllabusTopicGlobal('${sub}', ${index}, ${!isCompleted})">
                    <div style="width:16px; height:16px; border:1px solid var(--goldnova); border-radius:4px; display:flex; justify-content:center; align-items:center; background:${isCompleted ? 'var(--goldnova)' : 'transparent'};">
                        ${isCompleted ? '<span style="color:#000; font-size:12px; font-weight:bold;">✓</span>' : ''}
                    </div>
                    <span style="color:${isCompleted ? '#888' : '#ddd'}; font-size:12px; text-decoration:${isCompleted ? 'line-through' : 'none'};">${t}</span>
                </div>
                `;
            }).join('');

            container.innerHTML += `
                <div style="background:#111; border:1px solid #333; border-radius:10px; padding:15px; margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #222; padding-bottom:8px;">
                        <h4 style="color:#fff; font-size:15px; margin:0;">📖 ${sub}</h4>
                        <button class="kpss-youtube-btn" onclick="openKPSSYoutubeSafely('${sub}', event)" style="font-size:10px; padding:4px 8px;">▶ YouTube</button>
                    </div>
                    <div style="display:flex; flex-direction:column;">
                        ${topicCheckboxes}
                    </div>
                </div>
            `;
        });
    }
};

// Gün Akordeon Açma/Kapama Fonksiyonu
window.toggleKpssDayAccordion = function (dayNum) {
    const content = document.getElementById(`day-content-${dayNum}`);
    const arrow = document.getElementById(`arrow-${dayNum}`);

    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.innerText = '▲ Kapat';
        if (navigator.vibrate) navigator.vibrate(15);
    } else {
        content.style.display = 'none';
        arrow.innerText = '▼ Aç';
    }
};

// Sıfırlama Butonunun Hafızasını Çoklu Haftaya Uyarladık
window.resetKPSSScheduleToDefault = function () {
    if (confirm("Emin misin şampiyon? Mevcut özel programın silinecek ve seçili hafta standart kampa dönecek!")) {
        localStorage.removeItem(`olympus_kpss_schedule_${activeKpssExam}_w${activeKpssWeek}`);
        if (typeof renderKPSSEditList === 'function') renderKPSSEditList();
        renderKPSSTodayOrWeek();
        alert("✅ Sistem başarıyla fabrika ayarlarına sıfırlandı!");
    }
};
// ==========================================
// 📺 GÜVENLİ YOUTUBE IŞINLANMA MOTORU
// ==========================================
window.openKPSSYoutubeSafely = function (subject, event) {
    if (event) event.stopPropagation();
    const query = encodeURIComponent(`${subject} KPSS konu anlatımı`);
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
};
// ==========================================
// 📌 PANOROMA (TÜM MÜFREDAT) TİKLEME MOTORU
// ==========================================
window.toggleSyllabusTopicGlobal = function (subject, index, isDone) {
    const memoryKey = `kpss_syl_${activeKpssExam}_${subject}`;
    let savedProgress = JSON.parse(localStorage.getItem(memoryKey)) || [];

    if (isDone) {
        if (!savedProgress.includes(index)) savedProgress.push(index);
        if (navigator.vibrate) navigator.vibrate([20, 30]);
    } else {
        savedProgress = savedProgress.filter(i => i !== index);
    }

    localStorage.setItem(memoryKey, JSON.stringify(savedProgress));
    renderKPSSTodayOrWeek(); // Ekranı hemen yenileyip tiki göster
};
// ==========================================
// 📚 KPSS AKADEMİ GEÇİŞ MOTORU
// ==========================================
window.openKPSSCenter = function () {
    // 1. Hub'ı ve ana uygulamayı gizle
    const hub = document.getElementById('hub-screen');
    if (hub) hub.classList.add('hidden');

    const appContent = document.getElementById('app-content');
    if (appContent) appContent.classList.add('hidden');

    // 2. KPSS Ekranını görünür yap
    const kpssScreen = document.getElementById('kpss-screen');
    if (kpssScreen) {
        kpssScreen.classList.remove('hidden');
        // Eğer CSS display flex gerektiriyorsa:
        kpssScreen.style.display = 'flex';
    }

    // 3. Hafızaya kaydet (uygulama kapanırsa burada uyanmak için)
    if (typeof saveLastScreen === 'function') saveLastScreen('kpss');

    // 4. KPSS başlığı, geri sayımlar ve program verilerini çiz
    if (typeof updateKpssHeader === 'function') updateKpssHeader();
    if (typeof updateKpssCountdowns === 'function') updateKpssCountdowns();
    if (typeof renderKPSSTodayOrWeek === 'function') renderKPSSTodayOrWeek();

    // Gün dönümü kontrolü saatte bir yeterli; her açılışta yeni interval biriktirme
    if (!window.kpssCountdownInterval && typeof updateKpssCountdowns === 'function') {
        window.kpssCountdownInterval = setInterval(updateKpssCountdowns, 3600000);
    }

    if (navigator.vibrate) navigator.vibrate([30, 50]);

    // 5. Dinamik Ada Bildirimi
    if (typeof showDynamicIsland === 'function') {
        showDynamicIsland("KPSS Akademi", "Çalışma merkezine girildi", "📚");
    }
};

window.closeKPSSCenter = function () {
    // 1. KPSS Ekranını gizle
    const kpssScreen = document.getElementById('kpss-screen');
    if (kpssScreen) {
        kpssScreen.classList.add('hidden');
        kpssScreen.style.display = 'none';
    }

    // 2. Hafızayı Hub'a çevir
    if (typeof saveLastScreen === 'function') saveLastScreen('hub');

    // 3. Hub'ı geri aç (selamlama ve titreşim returnToHub içinde)
    returnToHub();
};
// ==========================================
