// Olympus ana uygulama: başlatma, idman oynatıcı, diyet, görevler, takip modalları
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 3. SİSTEM DEĞİŞKENLERİ VE BAŞLATMA
let currentPhase = 'p1';
let calculatedDay = 1;
let viewMode = 'today';
let modalChartInstance = null;
let editMode = false;
let activeWorkout = [];
let currentExIndex = 0;
let timerInterval;
let isExpressMode = false;

let activities = JSON.parse(localStorage.getItem('olympus_acts')) || [
    { id: 1, text: "💧 Su Hedefi Tamam", done: false },
    { id: 2, text: "🚶‍♂️ 10.000 Adım", done: false },
    { id: 3, text: "🏋️ Antrenman Yapıldı", done: false }
];

document.addEventListener("DOMContentLoaded", () => {
    // --- 🌸 DİLALA MODU HATIRLAMA MOTORU (SAYFA YÜKLENDİĞİ AN ÇALIŞIR) ---
    if (localStorage.getItem('olympus_dilala_mode') === 'true') {
        document.body.classList.add('dilala-mode');
        const dCheckbox = document.getElementById('dilala-toggle-checkbox');
        if (dCheckbox) dCheckbox.checked = true;

        // ZAMAN KAPSÜLÜ YERİNE ARTIK PROFİLDEKİ BUTONU GÖSTER
        const dilalaBtn = document.getElementById('profile-dilala-btn-container');
        if (dilalaBtn) dilalaBtn.classList.remove('hidden');
        if (typeof startDilalaTimer === 'function') startDilalaTimer();
    }
    document.getElementById('save-settings-btn').addEventListener('click', () => {
        const d = document.getElementById('start-date').value;
        const n = document.getElementById('profile-name-input').value;
        localStorage.setItem('olympus_start_date', d);
        if (n) document.getElementById('profile-name-display').innerText = n;
        document.getElementById('settings-modal').style.display = 'none';
        syncDataToCloud();
        calculateCurrentDay();
        checkWaterReset();
        saveAndRenderActivities();
        loadProfileData();
        checkDeloadEngine();
        // YENİ EKLENEN KISIM: Modal yüklendiğinde tıklama olaylarını dinlemeye başla
        initMuscleInteractions();

    });

    const dateInput = document.getElementById('start-date');
    const savedDate = localStorage.getItem('olympus_start_date');
    if (savedDate) { dateInput.value = savedDate; } else { const today = new Date().toISOString().split('T')[0]; dateInput.value = today; localStorage.setItem('olympus_start_date', today); }

    document.getElementById('btn-today').addEventListener('click', () => { viewMode = 'today'; updateCalendarTabs(); });
    document.getElementById('btn-tomorrow').addEventListener('click', () => { viewMode = 'tomorrow'; updateCalendarTabs(); });
    document.getElementById('btn-all').addEventListener('click', () => { viewMode = 'all'; updateCalendarTabs(); });

    const navButtons = document.querySelectorAll('.nav-btn, .top-nav-btn');
    const screens = document.querySelectorAll('.screen');
    const dayTracker = document.getElementById('day-tracker');
    const btnAll = document.getElementById('btn-all');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (navigator.vibrate) navigator.vibrate(50);
            if (btn.classList.contains('nav-btn')) {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
            const target = btn.getAttribute('data-target');
            screens.forEach(s => s.classList.remove('active'));
            document.getElementById(target).classList.add('active');

            if (target === 'diet-sec') {
                if (btnAll) btnAll.style.display = 'none'; // Diyet sekmesinde "Tümü" sekmesini gizle
                if (viewMode === 'all') { viewMode = 'today'; updateCalendarTabs(); } // Tümü'nde kaldıysa zorla Bugüne at
                if (dayTracker) dayTracker.style.display = 'flex'; // Diyet ekranında takvim görünür

            } else if (target === 'workout-sec') {
                if (btnAll) btnAll.style.display = ''; // İdman sekmesinde "Tümü" sekmesini geri getir
                if (dayTracker) dayTracker.style.display = 'flex'; // İdman ekranında takvim görünür

            } else {
                // DİYET VE İDMAN HARİCİNDEKİ TÜM EKRANLARDA (Görev, Takip, Profil) TAKVİMİ GİZLE
                if (dayTracker) dayTracker.style.display = 'none';

            }

            if (target === 'profile-sec') {
                updateWeeklyScore();
                loadProfileData();
                // YENİ EKLENEN: Profil sekmesi her açıldığında takipçi sayılarını güncelle!
                if (typeof updateProfileFollowStats === 'function') {
                    updateProfileFollowStats();
                }
            }
        });
    });

    document.querySelectorAll('.phase-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.phase-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPhase = btn.getAttribute('data-phase');
            renderWorkouts();
        });
    });

    document.querySelector('.close-modal-btn').addEventListener('click', () => {
        document.getElementById('workout-modal').style.display = 'none';
        document.getElementById('main-header').style.display = 'block';

        const player = document.getElementById('spotify-floating-player');
        if (player) player.classList.remove('hidden');
    });

    const editBtn = document.getElementById('edit-activity-btn');
    const addContainer = document.getElementById('add-activity-container');
    editBtn.addEventListener('click', () => {
        editMode = !editMode;
        editBtn.innerText = editMode ? "Bitti" : "Düzenle";
        if (editMode) addContainer.classList.remove('hidden'); else addContainer.classList.add('hidden');
        saveAndRenderActivities();
    });

    document.getElementById('add-activity-btn').addEventListener('click', () => {
        const input = document.getElementById('new-activity-input');
        if (input.value.trim() !== '') {
            activities.push({ id: Date.now(), text: input.value, done: false });
            input.value = '';
            saveAndRenderActivities();
        }
    });

    calculateCurrentDay();
    checkWaterReset();
    saveAndRenderActivities();
    loadProfileData();
    checkDeloadEngine();
    initMuscleInteractions();
    initDraggableOly()
});

function calculateCurrentDay() {
    let isTomorrow = (viewMode === 'tomorrow');
    const startDate = new Date(document.getElementById('start-date').value);
    const today = new Date();
    startDate.setHours(0, 0, 0, 0); today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    let baseDay = diffDays >= 0 ? diffDays + 1 : 1;

    if (viewMode === 'today') {
        calculatedDay = ((baseDay - 1) % 7) + 1;
        document.getElementById('display-day-text').innerText = `GÜN ${calculatedDay}`;

        if (calculatedDay === 1) {
            let lastReset = localStorage.getItem('olympus_muscle_reset_date');
            let todayStr = new Date().toLocaleDateString('tr-TR');
            if (lastReset !== todayStr) {
                localStorage.removeItem('olympus_worked_muscles');
                localStorage.setItem('olympus_muscle_reset_date', todayStr);
                updateAnatomyView();
            }
        }

    } else if (viewMode === 'tomorrow') {
        calculatedDay = ((baseDay) % 7) + 1;
        document.getElementById('display-day-text').innerText = `GÜN ${calculatedDay}`;
    } else {
        document.getElementById('display-day-text').innerText = `TÜMÜ`;
    }

    renderWorkouts();
    renderDiet();

    // YENİ EKLENEN KISIM: GÜNLÜK BİLDİRİM MOTORUNU ÇALIŞTIR
    if (typeof sendDailyWorkoutNotification === 'function') {
        sendDailyWorkoutNotification();
    }
}


function updateCalendarTabs() {
    document.getElementById('btn-today').classList.toggle('active', viewMode === 'today');
    document.getElementById('btn-tomorrow').classList.toggle('active', viewMode === 'tomorrow');
    document.getElementById('btn-all').classList.toggle('active', viewMode === 'all');
    calculateCurrentDay();
}

window.renderWorkouts = function () {
    let isTomorrow = (viewMode === 'tomorrow');
    const container = document.getElementById('days-container');
    container.innerHTML = '';

    // AKTİF PROGRAMI SEÇ (DİLALA MODU AÇIKSA ONDAN ÇEK, DEĞİLSE NORMALDEN)
    const activeProg = document.body.classList.contains('dilala-mode') ? dilalaProgramData['p1'] : programData[currentPhase];

    if (viewMode === 'all') {
        document.getElementById('workout-day-title').innerText = "Tüm Program";
        document.getElementById('workout-day-desc').innerText = "Görmek istediğiniz güne dokunun.";
        activeProg.forEach(d => {
            const card = document.createElement('div');
            card.className = `card ${d.rest ? 'rest-day' : ''}`;
            card.innerHTML = `<h3>${d.title}</h3><p>${d.rest ? 'Dinlenme Günü' : 'Detayları görmek için dokun.'}</p>`;
            if (!d.rest) card.addEventListener('click', () => showWorkoutModal(d));
            container.appendChild(card);
        });
    } else {
        // BUGÜN VE YARIN SEKMELERİ İÇİN DÜZELTİLMİŞ KISIM
        const d = activeProg.find(x => x.day == calculatedDay);
        if (d) {
            document.getElementById('workout-day-title').innerText = d.title;
            document.getElementById('workout-day-desc').innerText = viewMode === 'tomorrow' ? "Yarının Planı" : "Bugünün Planı";
            const card = document.createElement('div');
            card.className = `card ${d.rest ? 'rest-day' : ''}`;
            card.innerHTML = `<h3>${d.title}</h3><p>${d.rest ? 'Dinlenme Günü.' : 'İçeriği görmek için dokun.'}</p>`;
            if (!d.rest) card.addEventListener('click', () => showWorkoutModal(d));
            container.appendChild(card);
        }
    }
};

function showWorkoutModal(dayData) {
    document.getElementById('main-header').style.display = 'none';
    document.getElementById('modal-title').innerText = dayData.title;

    const player = document.getElementById('spotify-floating-player');
    if (player) player.classList.add('hidden');

    isExpressMode = false; // Her açılışta sıfırla

    const startBtn = document.getElementById('start-workout-btn');
    const panicBtn = document.getElementById('save-the-day-btn');

    // Butonları resetle
    startBtn.innerText = "🚀 İdmanı Başlat";
    startBtn.style.background = "var(--goldnova)";
    startBtn.style.color = "#000";
    panicBtn.style.display = 'block';

    const newStartBtn = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newStartBtn, startBtn);
    newStartBtn.addEventListener('click', () => { startActiveWorkout(dayData); });

    const newPanicBtn = panicBtn.cloneNode(true);
    panicBtn.parentNode.replaceChild(newPanicBtn, panicBtn);
    newPanicBtn.addEventListener('click', () => { activateSaveTheDay(dayData, newStartBtn, newPanicBtn); });

    renderModalExercises(dayData.ex);
    document.getElementById('workout-modal').style.display = 'flex';
}

function renderModalExercises(exArray) {
    const holder = document.getElementById('modal-exercises');
    holder.innerHTML = '';
    exArray.forEach(e => {
        const videoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(e.name + " form technique")}`;
        holder.innerHTML += `<div class="exercise-row ${isExpressMode ? 'express-move' : ''}">
            <a href="${videoUrl}" target="_blank" style="color:white;"><strong style="font-size:18px; text-decoration:underline;">${isExpressMode ? '⚡ ' : ''}${e.name} 📺</strong></a>
            <span style="font-size:14px; color:var(--text-muted); margin-top:4px;">Set: <b style="color:#fff">${e.scheme}</b> | Tempo: <b style="color:#fff">${e.tempo}</b> | RPE: <b style="color:var(--goldnova)">${e.rpe}</b></span>
        </div>`;
    });
}

// --- İDMAN SİSTEMİ GLOBAL DEĞİŞKENLERİ ---
let currentSetIndex = 1;
let totalSetsForEx = 1;
let isWorkoutMinimized = false;
let totalWorkoutSeconds = 0;
let totalWorkoutInterval = null;
let isResting = false;

// Saniyeyi Dakika:Saniye formatına çevirir
function formatWorkoutTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ==========================================
// ⚡ ARKA PLAN & KİLİT EKRANI MEDYA MOTORU (YENİ)
// ==========================================
function startWorkoutBackgroundEngine(workoutTitle) {
    const audio = document.getElementById('workout-bg-audio');
    if (audio) audio.play().catch(e => console.log("Ses motoru başlatılamadı."));

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: workoutTitle,
            artist: 'Project Olympus',
            album: 'İdman Devam Ediyor',
            artwork: [
                { src: 'icon.png', sizes: '512x512', type: 'image/png' }
            ]
        });

        // Kilit ekranındaki başlat/durdur butonlarına basılınca tepki vermesi için sahte dinleyiciler
        navigator.mediaSession.setActionHandler('play', function () { });
        navigator.mediaSession.setActionHandler('pause', function () { });
    }
}

function stopWorkoutBackgroundEngine() {
    const audio = document.getElementById('workout-bg-audio');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
}

// ==========================================
// 🏋️‍♂️ GERÇEK ZAMANLI İDMAN BAŞLATMA (Ekran kapansa bile durmaz)
// ==========================================
window.startActiveWorkout = function (dayData) {
    activeWorkout = dayData.ex;
    currentExIndex = 0;
    currentSetIndex = 1;
    isWorkoutMinimized = false;
    isResting = false;

    const fab = document.querySelector('.fab-container');
    const oly = document.getElementById('oly-avatar');
    if (fab) fab.style.display = 'none';
    if (oly) oly.style.display = 'none';

    // Medya Oynatıcıyı (Kilit Ekranı) Başlat
    startWorkoutBackgroundEngine(dayData.title || "Aktif İdman");

    // ++ Sayacı yerine GERÇEK ZAMAN DAMGASI (Date.now) kullanıyoruz!
    let workoutStartTime = Date.now();
    totalWorkoutSeconds = 0;

    if (totalWorkoutInterval) clearInterval(totalWorkoutInterval);
    document.getElementById('workout-total-time').innerText = "00:00";

    totalWorkoutInterval = setInterval(() => {
        // Ekran kapalıyken tarayıcı uyusa bile, açıldığı an aradaki farkı otomatik hesaplar!
        let now = Date.now();
        totalWorkoutSeconds = Math.floor((now - workoutStartTime) / 1000);

        let timeFormatted = formatWorkoutTime(totalWorkoutSeconds);
        document.getElementById('workout-total-time').innerText = timeFormatted;

        if (isWorkoutMinimized && !isResting && activeWorkout[currentExIndex]) {
            updateWorkoutIsland(activeWorkout[currentExIndex].name, `Set ${currentSetIndex}/${totalSetsForEx}`, timeFormatted);
        }
    }, 1000);

    document.getElementById('workout-modal').style.display = 'none';
    document.getElementById('active-workout-screen').classList.remove('hidden');

    if (typeof showDynamicIsland === 'function') showDynamicIsland("⚡ İdman Başlatıldı!");

    renderActiveExercise();
}

function renderActiveExercise() {
    if (currentExIndex >= activeWorkout.length) {
        finishWorkout();
        return;
    }
    const ex = activeWorkout[currentExIndex];

    let setMatch = ex.scheme.match(/^(\d+)/);
    totalSetsForEx = setMatch ? parseInt(setMatch[1]) : 1;

    if (currentSetIndex > totalSetsForEx) {
        currentExIndex++;
        currentSetIndex = 1;
        renderActiveExercise();
        return;
    }

    document.getElementById('player-progress').innerText = `${currentExIndex + 1} / ${activeWorkout.length} Hareket`;
    document.getElementById('player-ex-name').innerText = ex.name;
    document.getElementById('player-ex-details').innerText = `Set: ${currentSetIndex} / ${totalSetsForEx}`;
    document.getElementById('player-ex-subdetails').innerText = `Hedef: ${ex.scheme} | Tempo: ${ex.tempo} | RPE: ${ex.rpe}`;

    let exHistory = JSON.parse(localStorage.getItem('olympus_ex_history')) || {};
    let lastRecord = exHistory[ex.name];
    if (lastRecord) {
        document.getElementById('player-history-data').innerText = `${lastRecord.weight} kg / ${lastRecord.reps} Tekrar`;
        document.getElementById('player-history-data').style.color = "#27ae60";
    } else {
        document.getElementById('player-history-data').innerText = `Kayıt Yok`;
        document.getElementById('player-history-data').style.color = "#fff";
    }

    document.getElementById('player-weight').value = '';
    document.getElementById('player-reps').value = '';

    document.getElementById('player-timer-display').classList.add('hidden');
    document.getElementById('player-next-btn').classList.add('hidden');
    document.getElementById('player-save-btn').classList.remove('hidden');
}

// ==========================================
// ⏱️ DİNLENME SAYACI (Arka Planda Durmaz)
// ==========================================
window.saveSetAndRest = function () {
    let currentWeight = document.getElementById('player-weight').value;
    let currentReps = document.getElementById('player-reps').value;
    let currentExName = activeWorkout[currentExIndex].name;

    if (currentWeight && currentReps) {
        let exHistory = JSON.parse(localStorage.getItem('olympus_ex_history')) || {};
        let lastRecord = exHistory[currentExName];

        if (!lastRecord || parseFloat(currentWeight) >= parseFloat(lastRecord.weight)) {
            exHistory[currentExName] = {
                weight: currentWeight,
                reps: currentReps,
                date: new Date().toLocaleDateString('tr-TR')
            };
            localStorage.setItem('olympus_ex_history', JSON.stringify(exHistory));
        }
    }

    document.getElementById('player-save-btn').classList.add('hidden');
    document.getElementById('player-timer-display').classList.remove('hidden');
    document.getElementById('player-next-btn').classList.remove('hidden');

    if (currentSetIndex >= totalSetsForEx) {
        document.getElementById('player-next-btn').innerText = "Sonraki Harekete Geç ⏭";
    } else {
        document.getElementById('player-next-btn').innerText = `Sonraki Sete Geç (${currentSetIndex + 1}/${totalSetsForEx}) ⏩`;
    }

    isResting = true;
    let sec = isExpressMode ? 45 : 90;

    // Geri sayım için hedef bitiş zamanı belirliyoruz (Ekran kapansa bile şaşmaz)
    let restEndTime = Date.now() + (sec * 1000);
    document.getElementById('timer-seconds').innerText = sec;
    updateWorkoutIsland(currentExName, `Dinlenme (${currentSetIndex})`, sec);

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        let now = Date.now();
        let remaining = Math.ceil((restEndTime - now) / 1000);

        if (remaining <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer-seconds').innerText = 0;
            isResting = false;

            // Titreşim ve Bildirim Gönder! (Cihaz uyanıksa titrer)
            if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
            if (typeof showDynamicIsland === 'function') showDynamicIsland("⏰ Dinlenme Bitti! Sete Başla!");
        } else {
            document.getElementById('timer-seconds').innerText = remaining;
            if (isWorkoutMinimized) updateWorkoutIsland(currentExName, `Dinlenme (${currentSetIndex})`, remaining);
        }
    }, 1000);
}

window.nextExercise = function () {
    clearInterval(timerInterval);
    isResting = false;
    currentSetIndex++;

    if (isWorkoutMinimized) restoreWorkout();
    renderActiveExercise();
}

window.minimizeWorkout = function () {
    isWorkoutMinimized = true;
    document.getElementById('active-workout-screen').classList.add('hidden');
    document.getElementById('app-content').classList.remove('hidden');
    document.getElementById('main-header').style.display = 'block';

    const island = document.getElementById('dynamic-island');
    island.classList.add('active');
    island.classList.add('workout-mode');
    island.onclick = restoreWorkout;
};

window.restoreWorkout = function () {
    isWorkoutMinimized = false;
    document.getElementById('active-workout-screen').classList.remove('hidden');

    const island = document.getElementById('dynamic-island');
    island.classList.remove('active');
    island.classList.remove('workout-mode');
    island.onclick = function () { this.classList.remove('active'); };
};

function updateWorkoutIsland(exName, setInfo, timeVal) {
    const island = document.getElementById('dynamic-island');
    const textEl = document.getElementById('di-text');

    if (island && island.classList.contains('active')) {
        if (island.classList.contains('workout-mode')) {
            // İDMAN MODU: 2 Satırlı, Şık, Kalın Ada Görünümü (İkonlara çarpmasın diye padding eklendi)
            textEl.innerHTML = `
                <div style="text-align: center; color:var(--goldnova); font-weight:900; font-size: 15px; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 15px;">${exName}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span style="color:#aaa; font-weight:bold; font-size: 12px;">${setInfo}</span>
                    <span style="font-family:'Courier New', monospace; font-weight:bold; color:#fff; font-size: 14px;">⏱️ ${timeVal}</span>
                </div>
            `;
        } else {
            // NORMAL BİLDİRİM MODU
            textEl.innerText = exName;
        }
    }
}

window.finishWorkout = function () {
    clearInterval(timerInterval);
    clearInterval(totalWorkoutInterval);
    stopWorkoutBackgroundEngine(); // Arka plan müzik çaları kapat!

    const fab = document.querySelector('.fab-container');
    const oly = document.getElementById('oly-avatar');
    if (fab) fab.style.display = 'flex';
    if (oly) oly.style.display = 'flex';

    document.getElementById('active-workout-screen').classList.add('hidden');
    document.getElementById('main-header').style.display = 'block';
    if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 80, colors: ['#f6c000', '#fff'] });

    const activeProg = document.body.classList.contains('dilala-mode') ? dilalaProgramData['p1'] : programData[currentPhase];
    const activeDayData = activeProg.find(x => x.day == calculatedDay);

    let pastWorkouts = JSON.parse(localStorage.getItem('olympus_past_workouts')) || [];
    pastWorkouts.push({
        id: Date.now(),
        date: new Date().toLocaleDateString('tr-TR'),
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        title: activeDayData ? activeDayData.title : "Serbest İdman",
        duration: formatWorkoutTime(totalWorkoutSeconds)
    });
    localStorage.setItem('olympus_past_workouts', JSON.stringify(pastWorkouts));

    if (activeDayData && activeDayData.muscles) {
        let worked = JSON.parse(localStorage.getItem('olympus_worked_muscles')) || [];
        activeDayData.muscles.forEach(m => { if (!worked.includes(m)) worked.push(m); });
        localStorage.setItem('olympus_worked_muscles', JSON.stringify(worked));

        let workedV2 = JSON.parse(localStorage.getItem('olympus_worked_muscles_v2')) || {};
        const now = Date.now();
        activeDayData.muscles.forEach(m => { workedV2[m] = now; });
        localStorage.setItem('olympus_worked_muscles_v2', JSON.stringify(workedV2));
    }

    if (window.addOlympusPoints) window.addOlympusPoints(150, "İdman Tamamlandı");

    alert(`🔥 İDMAN TAMAMLANDI!\n⏱️ Toplam Süre: ${formatWorkoutTime(totalWorkoutSeconds)}\n🏆 150 Olympus Puanı Kazandın!`);
    toggleAct(3, true);
}

window.exitWorkoutPlayer = function () {
    if (confirm("🛑 DİKKAT!\nİdmanı yarıda kesip çıkmak istediğine emin misin? Bu işlem idmanı sonlandırır.")) {
        clearInterval(timerInterval);
        clearInterval(totalWorkoutInterval);
        stopWorkoutBackgroundEngine(); // Arka plan müzik çaları kapat!

        const fab = document.querySelector('.fab-container');
        const oly = document.getElementById('oly-avatar');
        if (fab) fab.style.display = 'flex';
        if (oly) oly.style.display = 'flex';

        document.getElementById('active-workout-screen').classList.add('hidden');
        document.getElementById('main-header').style.display = 'block';

        const island = document.getElementById('dynamic-island');
        if (island) {
            island.classList.remove('active');
            island.classList.remove('workout-mode');
            island.onclick = function () { this.classList.remove('active'); };
        }
    }
}

function renderDiet() {
    let isTomorrow = (viewMode === 'tomorrow');
    const container = document.getElementById('diet-container');
    container.innerHTML = '';

    let targetDay = viewMode === 'all' ? 1 : calculatedDay;
    const activeDiet = document.body.classList.contains('dilala-mode') ? dilalaDietData : dietData;
    const d = activeDiet[targetDay];
    document.getElementById('diet-day-desc').innerText = isTomorrow ? `Yarın: Gün ${targetDay} - ${d.title}` : `Bugün: Gün ${targetDay} - ${d.title}`;

    d.meals.forEach((m, index) => {
        const isDone = localStorage.getItem(`diet_${targetDay}_${index}`) || '';
        container.innerHTML += `
            <div class="diet-card ${isDone}" data-day="${targetDay}" data-index="${index}">
                <div class="diet-card-inner">
                    <div class="supp-icon" style="background:transparent; border:none;">${m.i}</div>
                    <div class="supp-details"><h4>${m.t}</h4><p>${m.d}</p></div>
                </div>
                <div class="meal-alt">${m.alt || 'Alternatif bulunmuyor.'}</div>
            </div>
        `;
    });
    initSwipeEngine();
}

function initSwipeEngine() {
    document.querySelectorAll('.diet-card').forEach(card => {
        let touchstartX = 0;
        let isSwiping = false;

        card.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
            card.style.transition = 'none';
            isSwiping = false;
        }, { passive: true });

        card.addEventListener('touchmove', e => {
            let currentX = e.changedTouches[0].screenX;
            let moveX = currentX - touchstartX;
            if (Math.abs(moveX) > 10) isSwiping = true;
            if (Math.abs(moveX) < 120) {
                card.style.transform = `translateX(${moveX}px)`;
                if (moveX > 30) card.style.background = 'rgba(0, 255, 0, 0.15)';
                else if (moveX < -30) card.style.background = 'rgba(255, 0, 0, 0.15)';
            }
        }, { passive: true });

        card.addEventListener('touchend', e => {
            let diff = e.changedTouches[0].screenX - touchstartX;
            if (!isSwiping || Math.abs(diff) < 10) {
                card.style.transform = 'translateX(0px)';
                card.classList.toggle('expanded');
                if (navigator.vibrate) navigator.vibrate(30);
                return;
            }
            card.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), background 0.4s ease';
            card.style.transform = 'translateX(0px)';

            const d = card.getAttribute('data-day');
            const i = card.getAttribute('data-index');

            if (diff > 60) {
                card.className = 'diet-card completed';
                localStorage.setItem(`diet_${d}_${i}`, 'completed');
                if (navigator.vibrate) navigator.vibrate(40);
            } else if (diff < -60) {
                card.className = 'diet-card skipped';
                localStorage.setItem(`diet_${d}_${i}`, 'skipped');
                if (navigator.vibrate) navigator.vibrate(40);
            } else {
                const oldStatus = localStorage.getItem(`diet_${d}_${i}`) || '';
                card.className = `diet-card ${oldStatus}`;
                card.style.background = '';
            }
        });
    });
}

window.resetDietUI = function () {
    document.querySelectorAll('.diet-card').forEach(card => {
        card.className = 'diet-card';
        card.style.background = '';
        card.style.transform = 'translateX(0px)';
        const d = card.getAttribute('data-day');
        const i = card.getAttribute('data-index');
        localStorage.removeItem(`diet_${d}_${i}`);
    });
    if (navigator.vibrate) navigator.vibrate(50);
}

function saveAndRenderActivities() {
    localStorage.setItem('olympus_acts', JSON.stringify(activities));
    const container = document.getElementById('activity-list');
    container.innerHTML = '';
    activities.forEach(act => {
        const div = document.createElement('div');
        div.className = 'checklist-item';
        div.onclick = (e) => { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') toggleAct(act.id, !act.done); };
        div.innerHTML = `
            <div class="check-left">
                <input type="checkbox" ${act.done ? 'checked' : ''} onchange="toggleAct(${act.id}, this.checked)">
                <span style="text-decoration: ${act.done ? 'line-through' : 'none'}; color: ${act.done ? 'gray' : 'white'}">${act.text}</span>
            </div>
            ${editMode ? `<button class="delete-btn" onclick="deleteAct(${act.id})">Sil</button>` : ''}
        `;
        container.appendChild(div);
    });
    checkGlobalSuccess();
}

function toggleAct(id, status) {
    const act = activities.find(a => a.id === id);
    if (act) { act.done = status; if (status && navigator.vibrate) navigator.vibrate(40); }
    saveAndRenderActivities();
}

function deleteAct(id) { activities = activities.filter(a => a.id !== id); saveAndRenderActivities(); }

function checkGlobalSuccess() {
    const completed = activities.filter(a => a.done).length;
    const banner = document.getElementById('success-banner');
    if (activities.length > 0 && completed === activities.length) {
        banner.classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#f6c000', '#ffffff', '#222222'] });
    } else {
        banner.classList.add('hidden');
    }
    updateWeeklyScore();
}

function updateWeeklyScore() {
    if (activities.length === 0) return;
    const score = Math.round((activities.filter(a => a.done).length / activities.length) * 100);
    const scoreEl = document.getElementById('weekly-score');
    if (scoreEl) scoreEl.innerText = score;
}

function checkWaterReset() {
    let wData = JSON.parse(localStorage.getItem('olympus_water_obj')) || { date: new Date().toLocaleDateString('tr-TR'), amount: 0, yesterday: 0 };
    if (wData.date !== new Date().toLocaleDateString('tr-TR')) {
        wData.yesterday = wData.amount;
        wData.amount = 0;
        wData.date = new Date().toLocaleDateString('tr-TR');
        localStorage.setItem('olympus_water_obj', JSON.stringify(wData));
    }
}

window.addWater = function (amount) {
    let wData = JSON.parse(localStorage.getItem('olympus_water_obj')) || { date: new Date().toLocaleDateString('tr-TR'), amount: 0, yesterday: 0 };
    wData.amount = Math.max(0, wData.amount + amount);
    localStorage.setItem('olympus_water_obj', JSON.stringify(wData));
    openTrackingModal('water');
}

window.resetWater = function () {
    let wData = JSON.parse(localStorage.getItem('olympus_water_obj')) || { date: new Date().toLocaleDateString('tr-TR'), amount: 0, yesterday: 0 };
    wData.amount = 0;
    localStorage.setItem('olympus_water_obj', JSON.stringify(wData));
    if (navigator.vibrate) navigator.vibrate(50);
    openTrackingModal('water');
}

window.editWaterGoal = function () {
    let currentGoal = localStorage.getItem('olympus_water_goal') || 3000;
    let newGoal = prompt("Günlük Hedef (ml):", currentGoal);
    if (newGoal && !isNaN(newGoal)) { localStorage.setItem('olympus_water_goal', newGoal); openTrackingModal('water'); }
}

function checkDeloadEngine() {
    let volHistory = JSON.parse(localStorage.getItem('olympus_vol_history')) || [];
    if (volHistory.length >= 3) {
        const last1 = parseFloat(volHistory[volHistory.length - 1].bench) || 0;
        const last2 = parseFloat(volHistory[volHistory.length - 2].bench) || 0;
        const last3 = parseFloat(volHistory[volHistory.length - 3].bench) || 0;
        if (last1 > 0 && last1 <= last2 && last2 <= last3) {
            const lastWarn = localStorage.getItem('olympus_deload_warn');
            const today = new Date().toLocaleDateString('tr-TR');
            if (lastWarn !== today) {
                alert("⚠️ AKILLI KOÇ UYARISI:\nBench Press ağırlıklarında plato tespit edildi. Bu hafta %10-15 'Deload' yapmanı öneririm.");
                localStorage.setItem('olympus_deload_warn', today);
            }
        }
    }
}

window.openTrackingModal = function (type) {
    const title = document.getElementById('track-modal-title');
    const body = document.getElementById('track-modal-body');
    const p = JSON.parse(localStorage.getItem('olympus_profile')) || {};

    if (type === 'measurements') {
        title.innerText = "Ölçülerim";
        body.innerHTML = `
            <div class="form-grid">
                <div class="input-group"><label>Kilo (kg)</label><input type="number" id="m-w" value="${p.w || ''}"></div>
                <div class="input-group"><label>Boy (cm)</label><input type="number" id="m-height" value="${p.height || ''}"></div>
                <div class="input-group"><label>Boyun (cm)</label><input type="number" id="m-neck" value="${p.neck || ''}"></div>
                <div class="input-group"><label>Omuz (cm)</label><input type="number" id="m-shoulder" value="${p.shoulder || ''}"></div>
                <div class="input-group"><label>Göğüs (cm)</label><input type="number" id="m-chest" value="${p.chest || ''}"></div>
                <div class="input-group"><label>Bel (cm)</label><input type="number" id="m-waist" value="${p.waist || ''}"></div>
                <div class="input-group"><label>Basen (cm)</label><input type="number" id="m-hips" value="${p.hips || ''}"></div>
                <div class="input-group"><label>Kol (cm)</label><input type="number" id="m-arm" value="${p.arm || ''}"></div>
                <div class="input-group"><label>İç Bacak (cm)</label><input type="number" id="m-thigh" value="${p.thigh || ''}"></div>
                <div class="input-group"><label>Kalf (cm)</label><input type="number" id="m-calf" value="${p.calf || ''}"></div>
            </div>
            <button class="save-btn" onclick="saveMeasurements()">Kaydet</button>
        `;
    }
    else if (type === 'fat') {
        title.innerText = "Yağ Oranı (US Navy)";
        let fatHistory = JSON.parse(localStorage.getItem('olympus_fat_history')) || [];
        if (p.w && p.waist && p.neck && p.height) {
            const wst = parseFloat(p.waist); const nck = parseFloat(p.neck); const hgt = parseFloat(p.height);
            const bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(wst - nck) + 0.15456 * Math.log10(hgt)) - 450;
            body.innerHTML = `
                <div class="card" style="text-align:center; margin-bottom:15px; border:none;"><h3>Oran: <span style="color:var(--goldnova);">%${Math.max(bodyFat, 4).toFixed(1)}</span></h3></div>
                <button class="edit-btn" style="width:100%; margin-bottom:15px;" onclick="saveFatData(${bodyFat.toFixed(1)})">Grafiğe Kaydet</button>
                <div style="background:#151515; padding:5px; border-radius:10px;"><canvas id="modalChart"></canvas></div>
            `;
            setTimeout(() => drawModalChart(fatHistory, 'Yağ Oranı %', '#00d2ff'), 100);
        } else { body.innerHTML = `<p style="color:#ff4444; text-align:center;">Lütfen önce Ölçülerim alanından Kilo, Boy, Bel ve Boyun girin.</p>`; }
    }
    else if (type === 'weight') {
        title.innerText = "Ağırlık Takibi";
        let wHistory = JSON.parse(localStorage.getItem('olympus_history')) || [];
        body.innerHTML = `<div style="background:#151515; padding:5px; border-radius:10px;"><canvas id="modalChart"></canvas></div>`;
        setTimeout(() => drawModalChart(wHistory.map(h => ({ date: h.date, val: h.weight })), 'Kilo (kg)', '#f6c000'), 100);
    }
    else if (type === 'volume') {
        title.innerText = "İdman Hacmi (1RM)";
        let volHistory = JSON.parse(localStorage.getItem('olympus_vol_history')) || [];
        body.innerHTML = `
            <div class="form-grid">
                <div class="input-group"><label>Bench Press</label><input type="number" id="m-bench" value="${p.bench || ''}"></div>
                <div class="input-group"><label>Squat</label><input type="number" id="m-squat" value="${p.squat || ''}"></div>
                <div class="input-group"><label>Deadlift</label><input type="number" id="m-dl" value="${p.dl || ''}"></div>
            </div>
            <button class="save-btn" onclick="save1RM()">Kaydet</button>
            <div style="background:#151515; padding:5px; border-radius:10px; margin-top:10px;"><canvas id="modalChart"></canvas></div>
        `;
        setTimeout(() => {
            const ctx = document.getElementById('modalChart'); if (!ctx) return;
            if (modalChartInstance) modalChartInstance.destroy();
            modalChartInstance = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: volHistory.map(h => h.date),
                    datasets: [
                        { label: 'Bench', data: volHistory.map(h => h.bench), borderColor: '#00d2ff', backgroundColor: 'transparent' },
                        { label: 'Squat', data: volHistory.map(h => h.squat), borderColor: '#f6c000', backgroundColor: 'transparent' }
                    ]
                },
                options: { responsive: true }
            });
        }, 100);
    }
    else if (type === 'water') {
        let wData = JSON.parse(localStorage.getItem('olympus_water_obj')) || { amount: 0, yesterday: 0 };
        let goal = parseInt(localStorage.getItem('olympus_water_goal') || 3000);
        title.innerText = "Su Tüketimi";
        body.innerHTML = `
            <div class="water-stats"><p>Hedef: ${goal} ml</p><p>Dün: ${wData.yesterday} ml</p><p>Kalan: ${Math.max(goal - wData.amount, 0)} ml</p></div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${Math.min((wData.amount / goal) * 100, 100)}%"></div></div>
            <h3 style="text-align:center; color:#00d2ff; font-size:28px; margin-bottom:15px;">${wData.amount} ml</h3>
            <div style="display:flex; justify-content:center; gap:8px;">
                <button class="edit-btn" onclick="addWater(250)">+250ml</button>
                <button class="edit-btn" onclick="addWater(500)">+500ml</button>
                <button class="delete-btn" onclick="resetWater()">Sıfırla</button>
                <button class="edit-btn" style="border-color:#aaa; color:#aaa;" onclick="editWaterGoal()">Hedef</button>
            </div>
        `;
    }
    else if (type === 'macros') {
        title.innerText = "Öğün Takibi";
        let calHistory = JSON.parse(localStorage.getItem('olympus_cal_history')) || [];
        body.innerHTML = `
            <div class="input-group"><label>Bugün Alınan Kalori (kcal)</label><input type="number" id="m-cal" placeholder="Örn: 2500"></div>
            <button class="save-btn" onclick="saveMacros()">Kaydet</button>
            <div style="background:#151515; padding:5px; border-radius:10px; margin-top:10px; margin-bottom:15px;"><canvas id="modalChart"></canvas></div>
            
            <!-- YENİ: FATSECRET AKILLI BUTONU -->
            <button onclick="openFatSecretApp()" style="background: #27ae60; color: #fff; border: none; padding: 12px; border-radius: 8px; font-size: 13px; width: 100%; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(39, 174, 96, 0.3);">
                🍏 FatSecret Uygulamasını Aç
            </button>
        `;
        // Hatanın olduğu satır burasıydı, "setTimeout" olarak düzeltildi:
        setTimeout(() => drawModalChart(calHistory, 'Kalori (kcal)', '#44ff44'), 100);
    }
    else if (type === 'sleep') {
        title.innerText = "Uyku & Toparlanma";
        let sleepHistory = JSON.parse(localStorage.getItem('olympus_sleep_history')) || [];
        body.innerHTML = `
            <div class="input-group"><label>Dün Geceki Uyku (Saat)</label><input type="number" step="0.5" id="m-sleep" placeholder="Örn: 7.5"></div>
            <button class="save-btn" onclick="saveSleep()">Kaydet</button>
            <div style="background:#151515; padding:5px; border-radius:10px; margin-top:10px;"><canvas id="modalChart"></canvas></div>
        `;
        setTimeout(() => drawModalChart(sleepHistory, 'Uyku (Saat)', '#8a2be2'), 100);
    }
    else if (type === 'cardio') {
        title.innerText = "Adım & Kardiyo";
        let cardioHistory = JSON.parse(localStorage.getItem('olympus_cardio_history')) || [];
        body.innerHTML = `
            <div class="input-group"><label>Bugünkü Adım Sayısı</label><input type="number" id="m-steps" placeholder="Örn: 10000"></div>
            <button class="save-btn" onclick="saveCardio()">Kaydet</button>
            <div style="background:#151515; padding:5px; border-radius:10px; margin-top:10px;"><canvas id="modalChart"></canvas></div>
        `;
        setTimeout(() => drawModalChart(cardioHistory, 'Adım', '#27ae60'), 100);
    }
    else if (type === 'calculator_1rm') {
        title.innerText = "1RM (Maks. Güç) Hesaplayıcı";
        body.innerHTML = `
            <p style="color:#888; font-size:12px; margin-bottom:15px; text-align:center;">Kaldırdığın ağırlığı ve tekrarı gir, teorik 1 tekrar maksimumunu (1RM) bul.</p>
            <div class="form-grid">
                <div class="input-group"><label>Ağırlık (kg)</label><input type="number" id="calc-w" placeholder="Örn: 100"></div>
                <div class="input-group"><label>Tekrar</label><input type="number" id="calc-r" placeholder="Örn: 8"></div>
            </div>
            <button class="save-btn" onclick="calculate1RM()" style="background:#00d2ff; color:#000;">Hesapla</button>
            <div id="calc-result" style="margin-top:20px; text-align:center; font-size:32px; color:var(--goldnova); font-weight:900;">-- kg</div>
        `;
    }
    else if (type === 'supplements') {
        title.innerText = "Yakıt & Supplement Stoku";
        let supps = JSON.parse(localStorage.getItem('olympus_supp_stock')) || { whey: 0, creatine: 0, carnitine: 0, electro: 0 };
        body.innerHTML = `
            <p style="color:#888; font-size:12px; margin-bottom:15px; text-align:center;">Elindeki ürünlerin kalan servis sayılarını takip et.</p>
            <div class="form-grid">
                <div class="input-group"><label>Whey Protein (Servis)</label><input type="number" id="sup-whey" value="${supps.whey}"></div>
                <div class="input-group"><label>Kreatin (Servis)</label><input type="number" id="sup-creatine" value="${supps.creatine}"></div>
                <div class="input-group"><label>L-Karnitin (Servis)</label><input type="number" id="sup-carnitine" value="${supps.carnitine}"></div>
                <div class="input-group"><label>Elektrolit (Servis)</label><input type="number" id="sup-electro" value="${supps.electro}"></div>
            </div>
            <button class="save-btn" onclick="saveSupplements()">Stoku Güncelle</button>
        `;
    }
    else if (type === 'active_kcal') {
        title.innerText = "Aktif Yakılan Kalori";
        let kcalHistory = JSON.parse(localStorage.getItem('olympus_active_kcal_history')) || [];
        body.innerHTML = `
            <div class="input-group"><label>Bugün Yakılan Enerji (kcal)</label><input type="number" id="m-active-kcal" placeholder="Örn: 650"></div>
            <button class="save-btn" onclick="saveActiveKcal()" style="background:#ea580c; color:#fff;">Kaydet</button>
            <div style="background:#151515; padding:5px; border-radius:10px; margin-top:10px;"><canvas id="modalChart"></canvas></div>
        `;
        setTimeout(() => drawModalChart(kcalHistory, 'Yakılan (kcal)', '#ea580c'), 100);
    }
    else if (type === 'heart_rate') {
        title.innerText = "Dinlenik Nabız (BPM)";
        let bpmHistory = JSON.parse(localStorage.getItem('olympus_bpm_history')) || [];
        body.innerHTML = `
            <div class="input-group"><label>Dinlenik Nabız (BPM)</label><input type="number" id="m-bpm" placeholder="Örn: 62"></div>
            <button class="save-btn" onclick="saveBPM()" style="background:#ef4444; color:#fff;">Kaydet</button>
            <div style="background:#151515; padding:5px; border-radius:10px; margin-top:10px;"><canvas id="modalChart"></canvas></div>
        `;
        setTimeout(() => drawModalChart(bpmHistory, 'Nabız (BPM)', '#ef4444'), 100);
    }
    else if (type === 'deload_info') {
        title.innerText = "Deload Motoru Yapısı";
        body.innerHTML = `<p style="color:var(--text-muted); font-size:14px; line-height:1.5;"><strong>Çalışma Prensibi:</strong> Sistem, İdman Hacmi alanına girdiğin Bench Press ve Squat 1RM verilerini analiz eder.<br><br>Eğer 3 ardışık kayıt boyunca güç artışı yaşanmadıysa veya gerileme varsa, sinir sisteminin aşırı zorlandığını fark ederek profil ekranında sana otomatik bir <strong>Deload (Aktif Dinlenme Haftası)</strong> uyarısı fırlatır.</p>`;
    }
    else if (type === 'macro_info') {
        title.innerText = "Makro Manipülasyonu";
        body.innerHTML = `<p style="color:var(--text-muted); font-size:14px; line-height:1.5;"><strong>Strateji Mantığı:</strong> US Navy formülüyle hesaplanan yağ oranındaki değişim trendine göre kalori hedefini dinamik yönetir.<br><br>Yağ oranının %12'nin altına düşmesi durumunda kas kütlesini korumak için karbonhidrat kaynaklarını otomatik artırmanı tavsiye ederken, platolarda temiz definisyon için makroları manipüle etmeni sağlar.</p>`;
    }
    else if (type === 'past_workouts') {
        title.innerText = "Geçmiş İdmanlar";
        let pastWorkouts = JSON.parse(localStorage.getItem('olympus_past_workouts')) || [];
        if (pastWorkouts.length === 0) {
            body.innerHTML = `<p style="color:#888; text-align:center;">Henüz tamamlanmış bir idman kaydı yok.</p>`;
        } else {
            let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
            // Yeni idmanlar en üstte görünsün diye tersine çeviriyoruz
            pastWorkouts.slice().reverse().forEach(w => {
                html += `
                    <div style="background:#151515; border:1px solid #333; border-left:3px solid var(--goldnova); padding:10px; border-radius:8px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                            <strong style="color:#fff;">${w.title}</strong>
                            <span style="color:#888; font-size:11px;">${w.date} - ${w.time}</span>
                        </div>
                        <span style="color:var(--goldnova); font-size:12px; font-weight:bold;">⏱️ Toplam Süre: ${w.duration}</span>
                    </div>
                `;
            });
            html += '</div>';
            body.innerHTML = html;
        }
    }
    document.getElementById('tracking-modal').style.display = 'flex';
}

function drawModalChart(dataArray, labelText, colorStr) {
    const ctx = document.getElementById('modalChart'); if (!ctx) return;
    if (modalChartInstance) modalChartInstance.destroy();
    modalChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: dataArray.map(h => h.date),
            datasets: [{ label: labelText, data: dataArray.map(h => h.val), borderColor: colorStr, backgroundColor: 'transparent', tension: 0.2 }]
        },
        options: { responsive: true }
    });
}

window.saveFatData = function (fatVal) {
    let fatHistory = JSON.parse(localStorage.getItem('olympus_fat_history')) || [];
    fatHistory.push({ date: new Date().toLocaleDateString('tr-TR'), val: fatVal });
    localStorage.setItem('olympus_fat_history', JSON.stringify(fatHistory));

    syncDataToCloud();
    openTrackingModal('fat');
    if (typeof showDynamicIsland === 'function') showDynamicIsland("✅ Ölçüler Kaydedildi!");
}

window.saveMeasurements = function () {
    // 1. Yeni veriyi kaydetmeden önce eskini 'old' olarak yedekle (Trend oku için)
    const old_p = JSON.parse(localStorage.getItem('olympus_profile')) || {};
    localStorage.setItem('olympus_profile_old', JSON.stringify(old_p));

    // 2. Yeni Verileri Al
    const p = { ...old_p }; // Mevcutları koru
    p.w = document.getElementById('m-w').value; p.height = document.getElementById('m-height').value;
    p.waist = document.getElementById('m-waist').value; p.neck = document.getElementById('m-neck').value;
    p.chest = document.getElementById('m-chest').value; p.shoulder = document.getElementById('m-shoulder').value;
    p.hips = document.getElementById('m-hips').value; p.arm = document.getElementById('m-arm').value;
    p.thigh = document.getElementById('m-thigh').value; p.calf = document.getElementById('m-calf').value;
    localStorage.setItem('olympus_profile', JSON.stringify(p));

    if (p.w) {
        let history = JSON.parse(localStorage.getItem('olympus_history')) || [];
        history.push({ date: new Date().toLocaleDateString('tr-TR'), weight: p.w });
        localStorage.setItem('olympus_history', JSON.stringify(history));
    }

    if (typeof syncDataToCloud === 'function') syncDataToCloud();
    document.getElementById('tracking-modal').style.display = 'none';
    loadProfileData(); // Okların hesaplanması için yeniden yükle

    if (typeof showDynamicIsland === 'function') showDynamicIsland("✅ Ölçüler Kaydedildi!");
};

// ==========================================
