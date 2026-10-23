// Tema, halı saha yönetimi, FUT kartı, bildirimler, takip listesi
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// TEMA (LIGHT / DARK MODE) YÖNETİM MOTORU
// ==========================================
window.toggleTheme = function () {
    const checkbox = document.getElementById('theme-toggle-checkbox');
    const isLight = checkbox.checked;

    if (isLight) {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }

    // Tercihi tarayıcıya kaydet
    localStorage.setItem('olympus_theme', isLight ? 'light' : 'dark');

    if (navigator.vibrate) navigator.vibrate(20);
};

// Sayfa ilk yüklendiğinde kullanıcının eski tema tercihini kontrol et
// DİKKAT: Bu kısmı "document.addEventListener('DOMContentLoaded', () => {" bloğunun İÇİNE de ekleyebilirsin veya en altta ayrı durabilir.
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('olympus_theme');
    const checkbox = document.getElementById('theme-toggle-checkbox');

    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if (checkbox) checkbox.checked = true;
    }
    if (localStorage.getItem('olympus_dilala_mode') === 'true') {
        document.body.classList.add('dilala-mode');
        const dCheckbox = document.getElementById('dilala-toggle-checkbox');
        if (dCheckbox) dCheckbox.checked = true;
    }
});
// ==========================================
// HALI SAHA (FUTBOL) YÖNETİM MOTORU (GELİŞMİŞ & GOLANOVA)
// ==========================================
const formations7v7 = {
    '2-3-1': [{ t: 90, l: 50 }, { t: 70, l: 30 }, { t: 70, l: 70 }, { t: 45, l: 20 }, { t: 45, l: 50 }, { t: 45, l: 80 }, { t: 15, l: 50 }],
    '3-2-1': [{ t: 90, l: 50 }, { t: 70, l: 20 }, { t: 70, l: 50 }, { t: 70, l: 80 }, { t: 45, l: 35 }, { t: 45, l: 65 }, { t: 15, l: 50 }],
    '2-2-2': [{ t: 90, l: 50 }, { t: 70, l: 30 }, { t: 70, l: 70 }, { t: 45, l: 30 }, { t: 45, l: 70 }, { t: 15, l: 30 }, { t: 15, l: 70 }],
    '1-3-2': [{ t: 90, l: 50 }, { t: 70, l: 50 }, { t: 45, l: 20 }, { t: 45, l: 50 }, { t: 45, l: 80 }, { t: 15, l: 35 }, { t: 15, l: 65 }]
};

let currentSquad = Array(7).fill("Seçilmedi");

window.openFootballManager = function () {
    document.getElementById('sports-home').classList.add('hidden');
    document.getElementById('football-manager').classList.remove('hidden');

    const oly = document.getElementById('oly-avatar');
    if (oly) oly.style.display = 'none';

    const savedLineup = JSON.parse(localStorage.getItem('goldnova_squad_names'));
    const savedFormation = localStorage.getItem('goldnova_squad_formation');
    if (savedLineup) currentSquad = savedLineup;
    if (savedFormation) document.getElementById('formation-select').value = savedFormation;

    renderPitch();
    renderMatchHistory();
    renderFutCard();
};

window.closeFootballManager = function () {
    document.getElementById('football-manager').classList.add('hidden');
    document.getElementById('sports-home').classList.remove('hidden');

    const oly = document.getElementById('oly-avatar');
    if (oly) oly.style.display = 'flex';
};

window.changeFormation = function () { renderPitch(); };

function renderPitch() {
    const pitch = document.getElementById('pitch-container');
    const formationKey = document.getElementById('formation-select').value;
    const coords = formations7v7[formationKey];

    pitch.querySelectorAll('.player-spot').forEach(p => p.remove());

    coords.forEach((pos, index) => {
        const spot = document.createElement('div');
        spot.className = 'player-spot';
        spot.style.top = pos.t + '%';
        spot.style.left = pos.l + '%';

        const jerseyHTML = index === 0 ? '<div class="jersey">🦺</div>' : '<div class="jersey">👕</div>';
        const playerName = currentSquad[index] || "Tıkla";
        spot.innerHTML = `${jerseyHTML}<div class="player-name-plate">${playerName}</div>`;
        spot.onclick = () => editPlayer(index);
        pitch.appendChild(spot);
    });
}

window.saveLineup = function () {
    const formation = document.getElementById('formation-select').value;
    localStorage.setItem('goldnova_squad_names', JSON.stringify(currentSquad));
    localStorage.setItem('goldnova_squad_formation', formation);
    if (navigator.vibrate) navigator.vibrate(50);
    alert("Kadro ve diziliş kaydedildi! Goldnova sahaya hazır.");
};

window.addNewMatch = function () {
    document.getElementById('new-match-modal').style.display = 'flex';
};

window.saveNewMatchAdvanced = function () {
    const opp = document.getElementById('match-opp').value;
    const date = document.getElementById('match-date').value;
    const time = document.getElementById('match-time').value;
    const loc = document.getElementById('match-loc').value;
    const scoreMy = document.getElementById('match-score-my').value;
    const scoreOpp = document.getElementById('match-score-opp').value;

    if (!opp || !date || !time) {
        alert("Lütfen Rakip, Tarih ve Saat girin.");
        return;
    }

    const savedFormation = document.getElementById('formation-select').value;
    const savedSquad = [...currentSquad];

    const matchDatetime = new Date(`${date}T${time}`);
    const isFuture = matchDatetime.getTime() > new Date().getTime();

    const matchObj = {
        id: Date.now(),
        opponent: opp,
        datetime: matchDatetime.toISOString(),
        location: loc || "Belirtilmedi",
        scoreGoldnova: isFuture ? null : parseInt(scoreMy || 0),
        scoreOpponent: isFuture ? null : parseInt(scoreOpp || 0),
        formation: savedFormation,
        squad: savedSquad,
        isFuture: isFuture
    };

    let history = JSON.parse(localStorage.getItem('goldnova_match_history')) || [];
    history.push(matchObj);
    history.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    localStorage.setItem('goldnova_match_history', JSON.stringify(history));

    document.getElementById('new-match-modal').style.display = 'none';
    renderMatchHistory();

    // YENİ EKLENEN: Maçı kaydettikten sonra kadrodaki arkadaşlarına dağıt
    distributeMatchToSquad(matchObj);
};
async function syncSharedMatches() {
    if (!auth.currentUser) return;

    // Hem kendi oluşturduğun maçlar (localStorage), hem de davet edildiğin maçları (Firebase) birleştir
    const localHistory = JSON.parse(localStorage.getItem('goldnova_match_history')) || [];

    try {
        const myDoc = await db.collection("users").doc(auth.currentUser.uid).get();
        const sharedMatches = myDoc.exists ? (myDoc.data().shared_matches || []) : [];

        // ID'ye göre benzersizleştir (Çift kayıt olmasın)
        const allMatchesMap = new Map();
        localHistory.forEach(m => allMatchesMap.set(m.id, m));
        sharedMatches.forEach(m => allMatchesMap.set(m.id, m));

        const combinedHistory = Array.from(allMatchesMap.values());
        combinedHistory.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

        // Ekrana bas
        localStorage.setItem('goldnova_match_history', JSON.stringify(combinedHistory));
        renderMatchHistory();
    } catch (e) {
        console.error("Maç senkronizasyonu başarısız:", e);
        renderMatchHistory();
    }
}

// Eski saveNewMatchAdvanced içindeki kayıt kısmını güncelleyelim:
// window.saveNewMatchAdvanced = function() { ... 
//    ...
//    let history = JSON.parse(localStorage.getItem('goldnova_match_history')) || [];
//    history.push(matchObj);
//    localStorage.setItem('goldnova_match_history', JSON.stringify(history));
//
//    // YENİ: Firebase üzerinden kadrodaki oyunculara (uid bulabildiklerine) maçı yolla
//    distributeMatchToSquad(matchObj);
//    renderMatchHistory();
// };

async function distributeMatchToSquad(matchObj) {
    if (!auth.currentUser) return;
    // Takım kadrosundaki isimleri al
    const squadNames = matchObj.squad.filter(name => name !== "Seçilmedi" && name !== "Boş");
    if (squadNames.length === 0) return;

    try {
        // İsimlerden kullanıcıları bul (Gerçek bir uygulamada UID dizisi tutmak daha sağlıklıdır)
        const snapshot = await db.collection("users").get();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (squadNames.includes(data.name) && data.uid !== auth.currentUser.uid) {
                // Maçı arkadaşının hesabına kaydet
                db.collection("users").doc(data.uid).update({
                    shared_matches: firebase.firestore.FieldValue.arrayUnion(matchObj),
                    notifications: firebase.firestore.FieldValue.arrayUnion({
                        message: `⚽ Yeni Maç: ${auth.currentUser.displayName} seni ${matchObj.opponent} maçına ekledi!`,
                        timestamp: Date.now(),
                        read: false
                    })
                });
            }
        });
    } catch (e) {
        console.log("Maç dağıtımı yapılamadı:", e);
    }
}

// ==========================================
// MAÇ GEÇMİŞİ VE ANLIK GERİ SAYIM MOTORu (DÜZELTİLMİŞ)
// ==========================================
function renderMatchHistory() {
    const container = document.getElementById('match-history-container');
    const history = JSON.parse(localStorage.getItem('goldnova_match_history')) || [];

    container.innerHTML = '';
    if (history.length === 0) {
        container.innerHTML = '<p style="color:#888; text-align:center; margin-top:20px;">Henüz kaydedilmiş bir maç veya fikstür bulunmuyor.</p>';
        return;
    }

    history.forEach(match => {
        const targetTime = new Date(match.datetime).getTime();
        const now = new Date().getTime();
        const isFuture = targetTime > now;

        const dateStr = new Date(match.datetime).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        let innerCardHTML = '';
        if (isFuture) {
            innerCardHTML = `
            <div class="scoreboard-card future-match" onclick="openMatchLineup(${match.id})">
                <div class="match-countdown" data-target="${match.datetime}">Hesaplanıyor...</div>
                <div class="scoreboard-date">${dateStr}</div>
                <div class="scoreboard-teams">
                    <div class="team-name" style="color:var(--goldnova);">GOLDNOVA</div>
                    <div class="team-score" style="border-color:var(--goldnova); color:var(--goldnova); font-size:16px;">VS</div>
                    <div class="team-name">${match.opponent}</div>
                </div>
                <div class="match-location">📍 ${match.location} <span style="margin-left:auto; color:var(--goldnova); font-size:10px;">Kadro 👁️</span></div>
            </div>`;
        } else {
            let resultColor = match.scoreGoldnova > match.scoreOpponent ? '#27ae60' : (match.scoreGoldnova < match.scoreOpponent ? '#ff4444' : '#888');
            innerCardHTML = `
            <div class="scoreboard-card" style="border-left-color: ${resultColor};">
                <div class="scoreboard-date">${dateStr}</div>
                <!-- Sadece takımlara tıklayınca kadro açılır -->
                <div class="scoreboard-teams" onclick="openMatchLineup(${match.id})" style="cursor:pointer;">
                    <div class="team-name" style="color: var(--goldnova);">GOLDNOVA</div>
                    <div class="team-score">${match.scoreGoldnova} - ${match.scoreOpponent}</div>
                    <div class="team-name">${match.opponent}</div>
                </div>
                <!-- YENİ EKLENEN: Alt kısımdaki İstatistik ve Oylama butonu -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
                    <span style="color:#888; font-size:10px;" onclick="openMatchLineup(${match.id})">📍 ${match.location} <span style="color:var(--goldnova); margin-left:5px;">👁️ Kadro</span></span>
                    <button onclick="openMatchStatsModal(${match.id})" class="edit-btn" style="padding:6px 12px; font-size:11px; border-color:var(--goldnova); color:var(--goldnova); font-weight:bold;">📊 İstatistik Gir</button>
                </div>
            </div>`;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'scoreboard-wrapper';
        wrapper.innerHTML = `<div class="scoreboard-delete-bg">SİL 🗑️</div>`;

        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = innerCardHTML;
        const cardEl = tempContainer.firstElementChild;
        wrapper.appendChild(cardEl);
        container.appendChild(wrapper);

        // Kaydırma (Swipe to delete) olayları
        let startX = 0;
        cardEl.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            cardEl.style.transition = 'none';
        }, { passive: true });

        cardEl.addEventListener('touchmove', (e) => {
            let moveX = e.touches[0].clientX - startX;
            if (moveX < 0 && moveX > -110) {
                cardEl.style.transform = `translateX(${moveX}px)`;
            }
        }, { passive: true });

        cardEl.addEventListener('touchend', (e) => {
            let endX = e.changedTouches[0].clientX;
            cardEl.style.transition = 'transform 0.3s ease';
            if (startX - endX > 70) {
                if (confirm("Bu maçı silmek istiyor musun?")) {
                    deleteMatch(match.id);
                    return;
                }
            }
            cardEl.style.transform = 'translateX(0px)';
        });
    });
}

// ANLIK GERİ SAYIM MOTORU (HER SANİYE GÜNCELLENİR)
setInterval(() => {
    document.querySelectorAll('.match-countdown').forEach(el => {
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

            el.innerText = `Maça: ${d}g ${h}s ${m}d ${s}sn`;
        } else {
            el.innerText = "⚽ MAÇ SAATİ GELDİ!";
        }
    });
}, 1000);


window.deleteMatch = function (matchId) {
    let history = JSON.parse(localStorage.getItem('goldnova_match_history')) || [];
    history = history.filter(m => m.id !== matchId);
    localStorage.setItem('goldnova_match_history', JSON.stringify(history));
    renderMatchHistory();
    if (navigator.vibrate) navigator.vibrate(50);
};

// MAÇ KADROSU İZLEME
window.openMatchLineup = function (matchId) {
    const history = JSON.parse(localStorage.getItem('goldnova_match_history')) || [];
    const match = history.find(m => m.id === matchId);
    if (!match) return;

    document.getElementById('view-match-title').innerText = `Goldnova vs ${match.opponent}`;
    document.getElementById('view-match-subtitle').innerText = `${new Date(match.datetime).toLocaleDateString('tr-TR')} | Sistem: ${match.formation}`;

    const pitch = document.getElementById('view-pitch-container');
    pitch.querySelectorAll('.player-spot').forEach(p => p.remove());

    const coords = formations7v7[match.formation];

    coords.forEach((pos, index) => {
        const spot = document.createElement('div');
        spot.className = 'player-spot';
        spot.style.top = pos.t + '%';
        spot.style.left = pos.l + '%';
        spot.style.cursor = 'default';

        const jerseyHTML = index === 0 ? '<div class="jersey">🦺</div>' : '<div class="jersey">👕</div>';
        const playerName = match.squad[index] || "Boş";

        spot.innerHTML = `${jerseyHTML}<div class="player-name-plate">${playerName}</div>`;
        pitch.appendChild(spot);
    });

    document.getElementById('view-match-modal').style.display = 'flex';
};
// ==========================================
// SPORLAR ANA EKRANI GEÇİŞ MOTORU
// ==========================================
window.openSportsScreen = function () {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('sports-sec').classList.add('active');

    // İŞTE ÇÖZÜM: Direkt ana menüyü göster, futbolu gizle!
    document.getElementById('sports-home').classList.remove('hidden');
    document.getElementById('football-manager').classList.add('hidden');

    const oly = document.getElementById('oly-avatar');
    if (oly) oly.style.display = 'none';

    const dayTracker = document.getElementById('day-tracker');
    if (dayTracker) dayTracker.style.display = 'none';
};

window.closeSportsScreen = function () {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('profile-sec').classList.add('active');

    // Oly'yi geri getir
    const oly = document.getElementById('oly-avatar');
    if (oly) oly.style.display = 'flex';

    if (navigator.vibrate) navigator.vibrate(30);
};

// Sekme Değiştirme (Kadro vs Geçmiş Maçlar)
window.switchFootballTab = function (tab) {
    const lineupBtn = document.getElementById('btn-tab-lineup');
    const historyBtn = document.getElementById('btn-tab-history');
    const lineupDiv = document.getElementById('fb-tab-lineup');
    const historyDiv = document.getElementById('fb-tab-history');

    if (tab === 'lineup') {
        lineupBtn.classList.add('active');
        historyBtn.classList.remove('active');
        lineupDiv.classList.remove('hidden');
        lineupDiv.style.display = 'block';
        historyDiv.classList.add('hidden');
        historyDiv.style.display = 'none';
    } else {
        historyBtn.classList.add('active');
        lineupBtn.classList.remove('active');
        historyDiv.classList.remove('hidden');
        historyDiv.style.display = 'block';
        lineupDiv.classList.add('hidden');
        lineupDiv.style.display = 'none';

        // Geçmiş maçlar sekmesine geçildiğinde listeyi tazele
        if (typeof renderMatchHistory === 'function') renderMatchHistory();
    }
};
// ==========================================
// FUT KARTI YÖNETİM MOTORU (FOTOĞRAF DESTEKLİ & EKSİZSİZ)
// ==========================================
let tempCustomCardImg = null;
let futRadarInstance = null; // YENİ: Radar grafiği hafızası

window.renderFutCard = function () {
    const savedCard = JSON.parse(localStorage.getItem('goldnova_fut_card')) || {
        ovr: 88, pos: 'ST', jersey: 10, pace: 90, shoot: 85, pass: 82, dribble: 88, def: 70, phys: 86, img: null
    };

    // Ön Yüz Verileri
    document.getElementById('fut-rating').innerText = savedCard.ovr;
    document.getElementById('fut-position').innerText = savedCard.pos;
    document.getElementById('fut-jersey-num').innerText = savedCard.jersey || 10;
    document.getElementById('stat-pace').innerText = savedCard.pace;
    document.getElementById('stat-shoot').innerText = savedCard.shoot;
    document.getElementById('stat-pass').innerText = savedCard.pass;
    document.getElementById('stat-dribble').innerText = savedCard.dribble;
    document.getElementById('stat-def').innerText = savedCard.def;
    document.getElementById('stat-phys').innerText = savedCard.phys;

    const avatarImg = document.getElementById('fut-avatar-img');
    avatarImg.src = savedCard.img ? savedCard.img : (auth.currentUser && auth.currentUser.photoURL ? auth.currentUser.photoURL : 'icon.png');

    const profileName = document.getElementById('profile-name-display').innerText;
    document.getElementById('fut-name').innerText = profileName !== "Yükleniyor..." ? profileName.toUpperCase() : "GOLDNOVA OYUNCU";

    // Arka Yüz Kariyer Verileri
    const careerStats = JSON.parse(localStorage.getItem('goldnova_career_stats')) || { goals: 0, assists: 0, motm: 0 };
    const elGoals = document.getElementById('career-goals');
    const elAssists = document.getElementById('career-assists');
    const elMotm = document.getElementById('career-motm');

    if (elGoals) elGoals.innerText = careerStats.goals;
    if (elAssists) elAssists.innerText = careerStats.assists;
    if (elMotm) elMotm.innerText = careerStats.motm;

    // RADAR GRAFİĞİNİ ÇİZ
    drawFutRadar(savedCard);
};

function drawFutRadar(cardData) {
    const ctx = document.getElementById('fut-radar-chart');
    if (!ctx) return;

    if (futRadarInstance) futRadarInstance.destroy();

    futRadarInstance = new Chart(ctx.getContext('2d'), {
        type: 'radar',
        data: {
            labels: ['HIZ', 'ŞUT', 'PAS', 'DRİB', 'DEF', 'FİZ'],
            datasets: [{
                label: 'Yetenekler',
                data: [cardData.pace, cardData.shoot, cardData.pass, cardData.dribble, cardData.def, cardData.phys],
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderColor: '#f6c000',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#000'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255,255,255,0.2)' },
                    grid: { color: 'rgba(255,255,255,0.2)' },
                    pointLabels: { color: '#fff', font: { size: 10, weight: 'bold' } },
                    ticks: { display: false, max: 99, min: 0 }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}
window.openFutEditModal = function () {
    const savedCard = JSON.parse(localStorage.getItem('goldnova_fut_card')) || {
        ovr: 88, pos: 'ST', jersey: 10, pace: 90, shoot: 85, pass: 82, dribble: 88, def: 70, phys: 86, img: null
    };

    document.getElementById('edit-ovr').value = savedCard.ovr;
    document.getElementById('edit-pos').value = savedCard.pos;
    document.getElementById('edit-jersey').value = savedCard.jersey || 10;
    document.getElementById('edit-pace').value = savedCard.pace;
    document.getElementById('edit-shoot').value = savedCard.shoot;
    document.getElementById('edit-pass').value = savedCard.pass;
    document.getElementById('edit-dribble').value = savedCard.dribble;
    document.getElementById('edit-def').value = savedCard.def;
    document.getElementById('edit-phys').value = savedCard.phys;

    tempCustomCardImg = savedCard.img;
    document.getElementById('fut-edit-modal').style.display = 'flex';
};

window.saveFutCardData = function () {
    const existingCard = JSON.parse(localStorage.getItem('goldnova_fut_card')) || {};
    const cardData = {
        ovr: document.getElementById('edit-ovr').value,
        pos: document.getElementById('edit-pos').value.toUpperCase(),
        jersey: document.getElementById('edit-jersey').value || 10,
        pace: document.getElementById('edit-pace').value,
        shoot: document.getElementById('edit-shoot').value,
        pass: document.getElementById('edit-pass').value,
        dribble: document.getElementById('edit-dribble').value,
        def: document.getElementById('edit-def').value,
        phys: document.getElementById('edit-phys').value,
        img: tempCustomCardImg !== undefined ? tempCustomCardImg : existingCard.img
    };

    localStorage.setItem('goldnova_fut_card', JSON.stringify(cardData));
    document.getElementById('fut-edit-modal').style.display = 'none';
    renderFutCard();
    if (navigator.vibrate) navigator.vibrate(50);
    alert("FIFA kartın başarıyla güncellendi şampiyon! 🎴🔥");
};
window.previewCardImage = function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            tempCustomCardImg = e.target.result;
        };
        reader.readAsDataURL(file);
    }
};


// DÜZELTİLMİŞ: Sadece konfeti atar ve titreşim verir. Dönme işini (Flipped) CSS ve HTML yönetir.
window.triggerCardCelebration = function () {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#f6c000', '#ffffff', '#ffd700', '#ffaa00']
        });
    }

    if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
};
// ==========================================
// OYUNCU SEÇİM VE ARKADAŞ LİSTESİ MOTORU (DÜZELTİLMİŞ KESİN ÇÖZÜM)
// ==========================================
var activeEditingIndex = null; // Global ve her yerden erişilebilir

window.editPlayer = function (index) {
    activeEditingIndex = index;

    // Eğer currentSquad bir şekilde kaybolduysa güvenli şekilde geri çağır
    if (typeof currentSquad === 'undefined' || !currentSquad) {
        window.currentSquad = JSON.parse(localStorage.getItem('goldnova_squad_names')) || Array(7).fill("Seçilmedi");
    }

    const oldName = currentSquad[index] !== "Seçilmedi" ? currentSquad[index] : "";

    const inputEl = document.getElementById('manual-player-input');
    if (inputEl) inputEl.value = oldName;

    const modal = document.getElementById('player-select-modal');
    if (modal) modal.style.display = 'flex';

    loadArenaFriendsForSelection();
};

async function loadArenaFriendsForSelection() {
    const listContainer = document.getElementById('arena-friends-list');
    listContainer.innerHTML = '<p style="color:gray; font-size:11px; text-align:center; padding:10px;">Yükleniyor...</p>';

    try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const myDoc = await db.collection("users").doc(currentUser.uid).get();
        const myData = myDoc.exists ? myDoc.data() : { name: currentUser.displayName || "Ben", photo: currentUser.photoURL, uid: currentUser.uid };

        let friends = [];
        try {
            const snapshot = await db.collection("users").limit(15).get();
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.name && data.uid !== currentUser.uid) friends.push(data);
            });
        } catch (err) { }

        listContainer.innerHTML = '';

        // KENDİMİZİ EKLEYELİM
        const selfItem = document.createElement('div');
        selfItem.className = 'friend-select-item';
        selfItem.style.border = '1px solid var(--goldnova)';
        selfItem.innerHTML = `<img src="${escapeHTML(myData.photo || 'icon.png')}" class="friend-select-avatar"><span style="color:var(--goldnova); font-size:13px; font-weight:bold;">${escapeHTML(myData.name)} (Sen)</span>`;
        selfItem.onclick = () => {
            const inputEl = document.getElementById('manual-player-input');
            inputEl.value = myData.name;
            inputEl.removeAttribute('data-target-uid'); // Kendimize bildirim atmaya gerek yok
            confirmPlayerSelection();
        };
        listContainer.appendChild(selfItem);

        // ARKADAŞLARI EKLEYELİM
        if (friends.length > 0) {
            friends.forEach(friend => {
                const item = document.createElement('div');
                item.className = 'friend-select-item';
                item.innerHTML = `<img src="${escapeHTML(friend.photo || 'icon.png')}" class="friend-select-avatar"><span style="color:#fff; font-size:13px; font-weight:bold;">${escapeHTML(friend.name)}</span>`;
                item.onclick = () => {
                    const inputEl = document.getElementById('manual-player-input');
                    inputEl.value = friend.name;
                    // YENİ: Seçtiğimiz kişinin ID'sini gizlice inputa gömüyoruz ki bildirim atabilelim!
                    inputEl.setAttribute('data-target-uid', friend.uid);
                    confirmPlayerSelection();
                };
                listContainer.appendChild(item);
            });
        }
    } catch (e) {
        listContainer.innerHTML = '<p style="color:#ff4444; font-size:11px; text-align:center;">Hata oluştu.</p>';
    }
}

window.confirmPlayerSelection = async function () {
    const inputEl = document.getElementById('manual-player-input');
    if (!inputEl) return;

    const inputVal = inputEl.value.trim();
    const targetUid = inputEl.getAttribute('data-target-uid'); // Gizli ID'yi al

    if (activeEditingIndex !== null) {
        currentSquad[activeEditingIndex] = inputVal !== "" ? inputVal.substring(0, 15) : "Seçilmedi";
        if (typeof renderPitch === 'function') renderPitch();

        // EĞER LİSTEDEN BİR ARKADAŞ SEÇİLDİYSE ONA BİLDİRİM GÖNDER!
        if (targetUid && inputVal !== "") {
            const myName = document.getElementById('profile-name-display').innerText;
            const notifMsg = `⚽ ${myName}, seni Goldnova halı saha kadrosuna ekledi! Maça hazır ol.`;

            try {
                await db.collection("users").doc(targetUid).update({
                    notifications: firebase.firestore.FieldValue.arrayUnion({
                        message: notifMsg,
                        timestamp: Date.now(),
                        read: false
                    })
                });
                console.log("Bildirim başarıyla gönderildi!");
            } catch (e) {
                console.log("Bildirim gönderilemedi:", e);
            }
        }
    }

    // İşlem bitince inputun içindeki gizli UID'yi temizle (sonraki seçimler karışmasın)
    inputEl.removeAttribute('data-target-uid');

    const modal = document.getElementById('player-select-modal');
    if (modal) modal.style.display = 'none';
    if (navigator.vibrate) navigator.vibrate(30);
};

// ==========================================
// BİLDİRİM (NOTIFICATION) MOTORU
// ==========================================
window.openNotifications = function () {
    document.getElementById('notifications-modal').style.display = 'flex';
    // Modalı açtığımızda bekleyen bildirim sayısını gizleyelim (okundu varsayalım)
    const badge = document.getElementById('notif-badge');
    if (badge) badge.style.display = 'none';
};

// Bu fonksiyon Firebase'den anlık bildirimleri dinler
function listenForNotifications() {
    if (!auth.currentUser) return;

    db.collection("users").doc(auth.currentUser.uid)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                const notifs = data.notifications || [];

                // YENİ: Gelen son bildirim okunmamışsa Dinamik Adayı tetikle
                if (notifs.length > 0) {
                    const lastNotif = notifs[notifs.length - 1];
                    if (lastNotif.read === false) {
                        if (typeof showDynamicIsland === 'function') {
                            showDynamicIsland("Bildirim 🔔", lastNotif.message.substring(0, 35) + "...", "🔔", 0);
                        }
                        // Bildirimi okundu olarak işaretle ki sürekli inmesin
                        lastNotif.read = true;
                        db.collection("users").doc(auth.currentUser.uid).update({ notifications: notifs });
                    }
                }

                renderNotifications(notifs);
            }
        });
}

function renderNotifications(notifs) {
    const list = document.getElementById('notifications-list');
    const badge = document.getElementById('notif-badge');

    list.innerHTML = '';
    if (notifs.length === 0) {
        list.innerHTML = '<p style="color:gray; font-size:12px; text-align:center;">Henüz yeni bildirim yok.</p>';
        if (badge) badge.style.display = 'none';
        return;
    }

    // En yeni bildirim en üstte görünsün diye tersine çeviriyoruz
    notifs.slice().reverse().forEach(n => {
        list.innerHTML += `
            <div style="padding:12px; background:#1a1a1a; border-left:3px solid var(--goldnova); margin-bottom:8px; border-radius:8px;">
                <p style="margin:0; font-size:13px; color:#fff; line-height:1.4;">${escapeHTML(n.message)}</p>
                <span style="font-size:10px; color:#888; display:block; margin-top:5px;">${new Date(n.timestamp).toLocaleString('tr-TR')}</span>
            </div>
        `;
    });

    // Eğer bildirim varsa zildeki kırmızı rozeti (badge) göster
    if (notifs.length > 0 && document.getElementById('notifications-modal').style.display !== 'flex') {
        if (badge) {
            badge.innerText = notifs.length;
            badge.style.display = 'block';
        }
    }
}

window.clearNotifications = function () {
    if (!auth.currentUser) return;
    // Firebase'deki notifications dizisini tamamen temizle
    db.collection("users").doc(auth.currentUser.uid).update({
        notifications: []
    }).then(() => {
        if (navigator.vibrate) navigator.vibrate(30);
    });
};

// ==========================================
// GÜNLÜK ANTRENMAN BİLDİRİM MOTORU
// ==========================================
window.sendDailyWorkoutNotification = function () {
    // Sadece giriş yapılmışsa ve takvim "Bugün" modundaysa çalışsın
    if (!auth.currentUser || viewMode !== 'today') return;

    const todayStr = new Date().toLocaleDateString('tr-TR');
    const lastNotifDate = localStorage.getItem('olympus_daily_notif_date');

    // Eğer bugün zaten bildirim gönderildiyse tekrar gönderme (Spam koruması)
    if (lastNotifDate !== todayStr) {
        // Bugünün idmanını programdan bul
        const todayWorkout = programData[currentPhase].find(x => x.day == calculatedDay);

        if (todayWorkout) {
            let msg = "";
            if (todayWorkout.rest) {
                msg = `🧘 Bugün dinlenme günün: ${todayWorkout.title}. Kaslarını toparla şampiyon!`;
            } else {
                msg = `🏋️‍♂️ Oly hatırlatıyor: Bugün ${todayWorkout.title}. Limitleri zorlama vakti geldi!`;
            }

            // Firebase'deki bildirimler dizisine otomatik mesajı ateşle
            db.collection("users").doc(auth.currentUser.uid).update({
                notifications: firebase.firestore.FieldValue.arrayUnion({
                    message: msg,
                    timestamp: Date.now(),
                    read: false
                })
            }).then(() => {
                // Bugünü hafızaya yaz ki aynı gün içinde sayfayı yeniledikçe tekrar bildirim atmasın
                localStorage.setItem('olympus_daily_notif_date', todayStr);
            }).catch(e => console.log("Günlük bildirim atılamadı:", e));
        }
    }
};
window.openDirectFootball = function () {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('sports-sec').classList.add('active');
    document.getElementById('sports-home').classList.add('hidden');
    document.getElementById('football-manager').classList.remove('hidden');

    const oly = document.getElementById('oly-avatar');
    if (oly) oly.style.display = 'none';

    const dayTracker = document.getElementById('day-tracker');
    if (dayTracker) dayTracker.style.display = 'none';

    // Verileri yükle ve arayüzü çiz
    const savedLineup = JSON.parse(localStorage.getItem('goldnova_squad_names'));
    const savedFormation = localStorage.getItem('goldnova_squad_formation');
    if (savedLineup) currentSquad = savedLineup;
    if (savedFormation) document.getElementById('formation-select').value = savedFormation;

    if (typeof renderFutCard === 'function') renderFutCard();
    renderPitch();
    syncSharedMatches(); // Maçları buluttan eşitle
};
let canvas, ctx, isDrawing = false, tacticInitialized = false, isDrawMode = false;

window.openTacticBoard = function () {
    document.getElementById('tactic-board-screen').classList.remove('hidden');
    if (!tacticInitialized) { initTacticBoard(); tacticInitialized = true; }
};

window.closeTacticBoard = function () { document.getElementById('tactic-board-screen').classList.add('hidden'); };

window.toggleTacticPen = function () {
    isDrawMode = !isDrawMode;
    const btn = document.getElementById('tactic-pen-btn');
    const cvs = document.getElementById('tactic-canvas');
    if (isDrawMode) {
        btn.innerText = "✏️ Kalem: AÇIK";
        btn.style.borderColor = "var(--goldnova)";
        btn.style.color = "var(--goldnova)";
        cvs.style.pointerEvents = "auto"; // Çizim serbest
    } else {
        btn.innerText = "✏️ Kalem: KAPALI";
        btn.style.borderColor = "white";
        btn.style.color = "white";
        cvs.style.pointerEvents = "none"; // Adam taşıma serbest
    }
};

window.resetTacticPlayers = function () { spawnTacticPlayers(); clearTacticCanvas(); };

function initTacticBoard() {
    canvas = document.getElementById('tactic-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', endDraw);
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);
    spawnTacticPlayers();
}

function startDraw(e) {
    if (!isDrawMode || e.target !== canvas) return;
    e.preventDefault();
    isDrawing = true;
    ctx.beginPath();
    const { x, y } = getPointers(e);
    ctx.moveTo(x, y);
}

function draw(e) {
    if (!isDrawing || !isDrawMode) return;
    e.preventDefault();
    const { x, y } = getPointers(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#f6c000';
    ctx.lineWidth = 3;
    ctx.stroke();
}
function endDraw() { isDrawing = false; ctx.closePath(); }
window.clearTacticCanvas = function () { if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); };

function getPointers(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

window.toggleTacticMenu = function () {
    document.getElementById('tactic-tools-menu').classList.toggle('open');
};

function spawnTacticPlayers() {
    const container = document.getElementById('tactic-draggables');
    container.innerHTML = '';

    const formationKey = document.getElementById('formation-select').value || '2-3-1';
    const coords = formations7v7[formationKey];

    const futCard = JSON.parse(localStorage.getItem('goldnova_fut_card')) || {};
    const myJerseyNum = futCard.jersey || 10;
    const myName = document.getElementById('profile-name-display').innerText.trim().toLowerCase();

    // 1. Kendi Takımımız (Goldnova - Alt Yarı Saha - Altın Forma)
    coords.forEach((pos, index) => {
        let pName = (currentSquad[index] || "").toLowerCase();
        let jerseyNum = (pName === myName && myName !== "yükleniyor..." && myName !== "") ? myJerseyNum : (index === 0 ? 1 : index + 2);

        // isHome = true (Kendi takımımız altın/sarı olacak)
        createDraggableJersey(container, 'tactic-home', jerseyNum, pos.t, pos.l, true);
    });

    // 2. Rakip Takım (Üst Yarı Saha - Kırmızı Forma)
    coords.forEach((pos, index) => {
        let jerseyNum = index === 0 ? 1 : index + 2;
        // isHome = false (Rakip takım kırmızı olacak)
        createDraggableJersey(container, 'tactic-away', jerseyNum, 100 - pos.t, 100 - pos.l, false);
    });

    // 3. Futbol Topu
    createDraggableEmoji(container, '⚽', 50, 50);
}

// VEKTÖREL FORMA ÇİZEN VE NUMARAYI YAZAN MOTOR
function createDraggableJersey(container, teamClass, num, topPercent, leftPercent, isHome) {
    const el = document.createElement('div');
    el.className = `tactic-player ${teamClass}`;

    // Forma Renkleri: Ev sahibi Goldnova (Sarı-Siyah), Rakip (Kırmızı-Beyaz)
    const fillColor = isHome ? '#f6c000' : '#ff4444';
    const strokeColor = isHome ? '#000000' : '#ffffff';
    const textColor = isHome ? '#000000' : '#ffffff';

    // Kaliteli Vektörel Forma Çizimi (SVG)
    const svgIcon = `
        <svg viewBox="0 0 24 24" width="36" height="36" style="position:absolute; z-index:1; filter:drop-shadow(0 3px 3px rgba(0,0,0,0.5));">
            <path d="M15.3,2.3c-0.3,0-0.5,0.1-0.7,0.2c-0.8,0.6-1.7,0.9-2.6,0.9s-1.8-0.3-2.6-0.9C9.2,2.4,9,2.3,8.7,2.3H5.9 C5.2,2.3,4.6,2.7,4.3,3.3l-2,5.2c-0.2,0.4,0,0.8,0.3,1l2.5,1.7c0.2,0.1,0.5,0.1,0.8,0l0.7-0.5v10.5C6.7,22.3,7.6,23,8.5,23h7 c1,0,1.8-0.8,1.8-1.8V10.7l0.7,0.5c0.2,0.1,0.5,0.2,0.8,0l2.5-1.7c0.3-0.2,0.5-0.6,0.3-1l-2-5.2C19.4,2.7,18.8,2.3,18.1,2.3H15.3z" 
            fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5"/>
        </svg>
    `;

    el.innerHTML = `
        ${svgIcon}
        <span class="tactic-num-text" style="color:${textColor}; margin-top:2px; font-size:12px; z-index:2;">${num}</span>
    `;
    el.style.top = topPercent + '%';
    el.style.left = leftPercent + '%';

    bindDragEvents(el);
    container.appendChild(el);
}

// EKSİK OLAN VE EKLENEN FONKSİYONLAR:
function createDraggableEmoji(container, emoji, topPercent, leftPercent) {
    const el = document.createElement('div');
    el.className = 'tactic-player';
    el.innerHTML = `<span style="font-size:24px; filter:drop-shadow(0 2px 2px rgba(0,0,0,0.5));">${emoji}</span>`;
    el.style.top = topPercent + '%';
    el.style.left = leftPercent + '%';

    bindDragEvents(el);
    container.appendChild(el);
}

function bindDragEvents(el) {
    let isDragging = false;
    const dragStart = (e) => { if (!isDrawMode) isDragging = true; };
    const dragEnd = (e) => { isDragging = false; };
    const drag = (e) => {
        if (!isDragging || isDrawMode) return;
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        el.style.left = clientX + 'px';
        el.style.top = clientY + 'px';
    };

    el.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    el.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', dragEnd);
}
// ==========================================
// TAKİP LİSTESİ (FOLLOWERS / FOLLOWING) MODALI
// ==========================================
window.openFollowList = async function (type) {
    const modal = document.getElementById('follow-list-modal');
    const container = document.getElementById('follow-list-container');
    const title = document.getElementById('follow-modal-title');

    if (!modal || !container || !title) return;

    modal.style.display = 'flex';
    container.innerHTML = '<p style="color:gray; font-size:12px; text-align:center;">Yükleniyor...</p>';
    title.innerText = type === 'following' ? 'Takip Edilenler' : 'Takipçiler';

    if (!auth.currentUser) return;

    try {
        const myDoc = await db.collection("users").doc(auth.currentUser.uid).get();
        if (!myDoc.exists) {
            container.innerHTML = '<p style="color:gray; font-size:12px; text-align:center;">Liste boş.</p>';
            return;
        }

        const data = myDoc.data();
        const listIds = data[type] || [];

        if (listIds.length === 0) {
            container.innerHTML = '<p style="color:gray; font-size:12px; text-align:center;">Kimse bulunamadı.</p>';
            return;
        }

        container.innerHTML = '';
        // UID'leri kullanarak kullanıcıları tek tek Firestore'dan çekip listeye basıyoruz
        for (let uid of listIds) {
            const userDoc = await db.collection("users").doc(uid).get();
            if (userDoc.exists) {
                const uData = userDoc.data();
                container.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#151515; padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid #333;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${escapeHTML(uData.photo || 'icon.png')}" style="width:35px; height:35px; border-radius:50%; border:2px solid var(--goldnova); object-fit:cover;">
                            <h4 style="color:#fff; margin:0; font-size:13px;">${escapeHTML(uData.name)}</h4>
                        </div>
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error("Liste çekilemedi:", e);
        container.innerHTML = '<p style="color:#ff4444; font-size:12px; text-align:center;">Bir hata oluştu.</p>';
    }
};
// ==========================================
// MAÇ SONU İSTATİSTİK VE OYLAMA MOTORU
// ==========================================
let activeMatchIdForStats = null;

window.openMatchStatsModal = function (matchId) {
    const history = JSON.parse(localStorage.getItem('goldnova_match_history')) || [];
    const match = history.find(m => m.id === matchId);
    if (!match) return;

    activeMatchIdForStats = matchId;
    document.getElementById('match-report-subtitle').innerText = `Goldnova vs ${match.opponent} (${new Date(match.datetime).toLocaleDateString('tr-TR')})`;

    // YENİ: Varsa eski skoru doldur, yoksa (null ise) 0 yap
    document.getElementById('input-team-score-goldnova').value = (match.scoreGoldnova !== null && match.scoreGoldnova !== undefined) ? match.scoreGoldnova : 0;
    document.getElementById('input-team-score-opponent').value = (match.scoreOpponent !== null && match.scoreOpponent !== undefined) ? match.scoreOpponent : 0;

    // Bireysel alanları sıfırla
    document.getElementById('input-match-goals').value = 0;
    document.getElementById('input-match-assists').value = 0;

    // Kadrodaki oyuncuları MOTM (Maçın Adamı) seçim kutusuna doldur
    const motmSelect = document.getElementById('select-match-motm');
    motmSelect.innerHTML = '<option value="">Seçim Yap...</option>';
    if (match.squad) {
        match.squad.forEach(player => {
            if (player && player !== "Seçilmedi" && player !== "Boş") {
                motmSelect.innerHTML += `<option value="${player}">${player}</option>`;
            }
        });
    }

    document.getElementById('match-stats-modal').style.display = 'flex';
};

window.saveMatchStatsAndClose = function () {
    // 1. TAKIM SKORLARINI AL
    const scoreGoldnova = parseInt(document.getElementById('input-team-score-goldnova').value) || 0;
    const scoreOpponent = parseInt(document.getElementById('input-team-score-opponent').value) || 0;

    // 2. BİREYSEL İSTATİSTİKLERİ AL
    const goalsToAdd = parseInt(document.getElementById('input-match-goals').value) || 0;
    const assistsToAdd = parseInt(document.getElementById('input-match-assists').value) || 0;
    const selectedMotm = document.getElementById('select-match-motm').value;

    // 3. MAÇ LİSTESİNDE SKORU GÜNCELLE
    let history = JSON.parse(localStorage.getItem('goldnova_match_history')) || [];
    const matchIndex = history.findIndex(m => m.id === activeMatchIdForStats);
    if (matchIndex !== -1) {
        history[matchIndex].scoreGoldnova = scoreGoldnova;
        history[matchIndex].scoreOpponent = scoreOpponent;
        localStorage.setItem('goldnova_match_history', JSON.stringify(history));
    }

    // 4. KİŞİSEL KARİYERE (FUT KARTI) EKLE
    const myName = document.getElementById('profile-name-display').innerText.trim().toLowerCase();
    let careerStats = JSON.parse(localStorage.getItem('goldnova_career_stats')) || { goals: 0, assists: 0, motm: 0 };

    careerStats.goals += goalsToAdd;
    careerStats.assists += assistsToAdd;

    if (selectedMotm && selectedMotm.toLowerCase() === myName) {
        careerStats.motm += 1;
    }

    localStorage.setItem('goldnova_career_stats', JSON.stringify(careerStats));
    document.getElementById('match-stats-modal').style.display = 'none';

    // EKRANLARI YENİLE
    if (typeof renderFutCard === 'function') renderFutCard();
    if (typeof renderMatchHistory === 'function') renderMatchHistory(); // 'null' yazısını anında silip skoru yazdırır!

    if (navigator.vibrate) navigator.vibrate(50);
    alert("Maç skoru ve istatistikler başarıyla işlendi! 🎴🔥");
};
// ==========================================
// KARİYER İSTATİSTİKLERİNİ SIFIRLAMA MOTORU
// ==========================================
window.resetCareerStats = function () {
    // Yanlışlıkla basılmalara karşı onay isteyelim
    if (confirm("Tüm gol, asist ve MOTM istatistiklerin sıfırlanacak. Yeni bir sezona başlamaya emin misin?")) {
        // İstatistikleri sıfırla
        localStorage.setItem('goldnova_career_stats', JSON.stringify({ goals: 0, assists: 0, motm: 0 }));

        // Modalı kapat ve kartı yeniden çiz
        document.getElementById('fut-edit-modal').style.display = 'none';
        if (typeof renderFutCard === 'function') renderFutCard();

        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        alert("Kariyer istatistiklerin başarıyla sıfırlandı şampiyon!");
    }
};
// ==========================================
