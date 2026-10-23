// Arena: akış, kullanıcı arama/takip, mini oyun, liderlik, rozetler
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

window.cameFromSocialToArena = false; // Hafıza Değişkeni
// ==========================================
// ARENA EKRANI GEÇİŞ KONTROLLERİ (GÜNCELLENDİ)
// ==========================================
// 2. ANA ARENA EKRANI MOTORU (Sonsuz döngüden arındırıldı)
window.openArenaScreen = function () {
    // Hub ekranını gizle
    const hub = document.getElementById('hub-screen');
    if (hub) {
        hub.classList.add('hidden');
        hub.style.display = 'none';
    }

    // Tüm sekmeleri gizle ve sadece Arena'yı aktif et
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    const arenaSec = document.getElementById('arena-sec');
    if (arenaSec) arenaSec.classList.add('active');

    // Takvim/gün izleyiciyi Arena'da gizle
    const dayTracker = document.getElementById('day-tracker');
    if (dayTracker) dayTracker.style.display = 'none';

    // Verileri yükle
    if (typeof loadGlobalFeed === 'function') loadGlobalFeed();
    if (typeof loadLeaderboard === 'function') loadLeaderboard();

    if (navigator.vibrate) navigator.vibrate(50);
};
// GÜNCELLENMİŞ Arena Kapatma Motoru
window.closeArenaScreen = function () {
    // 1. Tüm uygulama ekranlarını (Arena dahil) gizle
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    // 2. HAFIZA KONTROLÜ
    if (window.cameFromSocialToArena) {
        // OLYSOCIAL'dan gelmişiz, oraya dönüyoruz!
        window.cameFromSocialToArena = false; // Hafızayı sıfırla

        const appContent = document.getElementById('app-content');
        if (appContent) appContent.classList.add('hidden'); // Ana uygulamayı gizle

        if (typeof openOlympusDashboard === 'function') openOlympusDashboard('feed'); // OLYSOCIAL'ı geri aç

    } else {
        // Normal yoldan (Profil'den) gelmişsek Profil'e dönüyoruz!
        const profileSec = document.getElementById('profile-sec');
        if (profileSec) profileSec.classList.add('active');

        // Oly (Avatar) karakterini geri getir
        const oly = document.getElementById('oly-avatar');
        if (oly) oly.style.display = 'flex';
    }

    if (navigator.vibrate) navigator.vibrate(30);
};
// ==========================================
// CANLI AKIŞ (GLOBAL FEED) YÜKLEME MOTORU
// ==========================================
async function loadGlobalFeed() {
    const feedDiv = document.getElementById('arena-feed');
    if (!feedDiv) return;

    feedDiv.innerHTML = '<p style="color:var(--goldnova); text-align:center;">Akış yükleniyor...</p>';

    try {
        // 1. ÖNCE KENDİ VERİMİZİ VE TAKİP LİSTEMİZİ ÇEKİYORUZ
        const myDoc = await db.collection("users").doc(auth.currentUser.uid).get();
        const myData = myDoc.exists ? myDoc.data() : null;
        const myFollowing = myData ? (myData.following || []) : []; // HATA BURADAYDI, EKLENDİ

        // 2. SONRA DİĞER KULLANICILARI ÇEKİYORUZ
        const snapshot = await db.collection("users").limit(15).get();
        let users = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.uid !== auth.currentUser.uid && data.name) {
                users.push(data);
            }
        });

        // Diğerlerini rastgele karıştır
        users = users.sort(() => 0.5 - Math.random()).slice(0, 10);
        feedDiv.innerHTML = '';

        const actions = [
            "bugün idmanını tamamladı! 🔥", "arenaya katıldı! ⚔️",
            "su hedefine ulaştı! 💧", "yeni bir rekor peşinde! 🎯",
            "diyetine tam uyum sağladı! 🥗"
        ];

        // 3. VİTRİN: KENDİ PROFİLİMİZ
        if (myData && myData.name) {
            const myAction = actions[Math.floor(Math.random() * actions.length)];
            feedDiv.innerHTML += `
                <div class="arena-user-card" style="border-left: 3px solid #00d2ff; background: rgba(0, 210, 255, 0.05);">
                    <img src="${escapeHTML(myData.photo || 'icon.png')}" alt="profile" class="arena-user-img">
                    <div class="arena-user-info">
                        <h4>${escapeHTML(myData.name)} <span style="font-size:10px; color:#00d2ff;">(Önizleme)</span></h4>
                        <p style="font-size: 13px; color: #aaa; margin: 0;">${myAction}</p>
                    </div>
                </div>
            `;
        }

        // 4. DİĞER KULLANICILAR VE TAKİP BUTONLARI (DÜZELTİLDİ)
        users.forEach(user => {
            const randomAction = actions[Math.floor(Math.random() * actions.length)];

            // TAKİP DURUMU KONTROLÜ BURAYA ALINDI
            const isFollowed = myFollowing.includes(user.uid);
            const btnClass = isFollowed ? "follow-btn following" : "follow-btn";
            const btnText = isFollowed ? "Takip Ediliyor" : "Takip Et";
            const btnStyle = isFollowed ? "border-color: var(--goldnova); color: var(--goldnova);" : "border-color: #00d2ff; color: #00d2ff;";

            feedDiv.innerHTML += `
                <div class="arena-user-card" style="border-left: 3px solid var(--goldnova);">
                    <img src="${escapeHTML(user.photo || 'icon.png')}" alt="profile" class="arena-user-img">
                    <div class="arena-user-info">
                        <h4>${escapeHTML(user.name)}</h4>
                        <p style="font-size: 13px; color: #aaa; margin: 0;">${randomAction}</p>
                    </div>
                    <button class="${btnClass}" id="btn-${user.uid}" onclick="followUser('${user.uid}')" style="${btnStyle}">${btnText}</button>
                </div>
            `;
        });

        if (users.length === 0 && !myData) {
            feedDiv.innerHTML = '<p style="color:gray; text-align:center;">Arenada şu an kimse yok.</p>';
        }

    } catch (error) {
        console.error("Akış yükleme hatası:", error);
        feedDiv.innerHTML = '<p style="color:#ff4444; text-align:center;">Akış çekilemedi.</p>';
    }
}
window.followUser = async function (targetUid) {
    const btn = document.getElementById(`btn-${targetUid}`);
    if (!btn || !auth.currentUser) return;

    const isFollowing = btn.classList.contains('following');
    const myRef = db.collection("users").doc(auth.currentUser.uid);
    const targetRef = db.collection("users").doc(targetUid);

    try {
        if (isFollowing) {
            await myRef.update({ following: firebase.firestore.FieldValue.arrayRemove(targetUid) });
            await targetRef.update({ followers: firebase.firestore.FieldValue.arrayRemove(auth.currentUser.uid) });
            btn.classList.remove('following');
            btn.innerText = "Takip Et";
        } else {
            await myRef.update({ following: firebase.firestore.FieldValue.arrayUnion(targetUid) });
            await targetRef.update({ followers: firebase.firestore.FieldValue.arrayUnion(auth.currentUser.uid) });
            btn.classList.add('following');
            btn.innerText = "Takip Ediliyor";

            await targetRef.update({
                notifications: firebase.firestore.FieldValue.arrayUnion({
                    message: `👤 ${auth.currentUser.displayName || 'Bir sporcu'} seni takip etmeye başladı!`,
                    timestamp: Date.now(),
                    read: false
                })
            });
        }
        updateProfileFollowStats();
        if (navigator.vibrate) navigator.vibrate(30);
    } catch (error) { console.error("Takip hatası:", error); }
};

window.updateProfileFollowStats = function () {
    if (!auth.currentUser) return;

    // YENİ: get() yerine onSnapshot kullanarak profili "canlı" dinliyoruz!
    db.collection("users").doc(auth.currentUser.uid).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const followingCount = data.following ? data.following.length : 0;
            const followersCount = data.followers ? data.followers.length : 0;

            const elFollowing = document.getElementById('profile-following');
            const elFollowers = document.getElementById('profile-followers');

            if (elFollowing) elFollowing.innerText = followingCount;
            if (elFollowers) elFollowers.innerText = followersCount;
        }
    });
};
// ==========================================
// ARENA: KULLANICI ARAMA VE TAKİP HAFIZASI
// ==========================================
window.searchUsers = async function () {
    const searchInput = document.getElementById('user-search-input').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('search-results');

    if (!searchInput) {
        resultsContainer.innerHTML = '<p style="color:gray; font-size:12px; text-align:center;">Lütfen aramak için bir isim gir.</p>';
        return;
    }

    resultsContainer.innerHTML = '<p style="color:var(--goldnova); font-size:12px; text-align:center;">Sporcular aranıyor...</p>';

    try {
        let myFollowing = [];
        if (auth.currentUser) {
            const myDoc = await db.collection("users").doc(auth.currentUser.uid).get();
            myFollowing = myDoc.exists ? (myDoc.data().following || []) : [];
        }

        const snapshot = await db.collection("users").get();
        resultsContainer.innerHTML = '';
        let found = false;

        snapshot.forEach(doc => {
            const data = doc.data();

            // KENDİMİZ DAHİL HERKESİ ARAMADA GÖSTER
            if (data.name && data.name.toLowerCase().includes(searchInput)) {
                found = true;

                let buttonHTML = '';

                // Eğer aranan kişi bizsek "Sen" yaz ve butonu pasif yap
                if (auth.currentUser && data.uid === auth.currentUser.uid) {
                    buttonHTML = `<button class="edit-btn" style="border-color: var(--goldnova); color: var(--goldnova); cursor:default; padding:6px 12px; font-size:12px; font-weight:bold;" disabled>Sen</button>`;
                } else {
                    // Başkasıysa takip etme durumuna bak
                    const isFollowed = myFollowing.includes(data.uid);
                    const btnClass = isFollowed ? "edit-btn following" : "edit-btn";
                    const btnText = isFollowed ? "Takip Ediliyor" : "Takip Et";
                    const btnStyle = isFollowed ? "border-color: var(--goldnova); color: var(--goldnova);" : "border-color: #00d2ff; color: #00d2ff;";
                    buttonHTML = `<button class="${btnClass}" id="btn-${data.uid}" onclick="followUser('${data.uid}')" style="padding:6px 12px; font-size:12px; font-weight:bold; ${btnStyle}">${btnText}</button>`;
                }

                resultsContainer.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#151515; padding:12px; border-radius:12px; margin-bottom:10px; border:1px solid #333;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <img src="${escapeHTML(data.photo || 'icon.png')}" style="width:45px; height:45px; border-radius:50%; border:2px solid var(--goldnova); object-fit:cover;">
                            <div>
                                <h4 style="color:#fff; margin:0; font-size:15px; font-weight:bold;">${escapeHTML(data.name)}</h4>
                                <span style="color:gray; font-size:11px;">Skor: ${data.weeklyScore || 0}</span>
                            </div>
                        </div>
                        ${buttonHTML}
                    </div>
                `;
            }
        });

        if (!found) {
            resultsContainer.innerHTML = '<p style="color:gray; font-size:12px; text-align:center;">Bu isimde bir sporcu bulunamadı.</p>';
        }

    } catch (e) {
        console.error("Arama sırasında hata:", e);
        resultsContainer.innerHTML = '<p style="color:#ff4444; font-size:12px; text-align:center;">Bağlantı hatası oluştu.</p>';
    }
};
// ==========================================
// OLYMPUS PUAN VE MİNİ OYUN MOTORU
// ==========================================

// Puan Ekleme Fonksiyonu (İdman veya Oyun bitince çağrılır)
window.addOlympusPoints = async function (amount, reason) {
    let currentPoints = parseInt(localStorage.getItem('olympus_total_points')) || 0;
    currentPoints += amount;
    localStorage.setItem('olympus_total_points', currentPoints);

    // Firebase'e kaydet
    try {
        await db.collection("users").doc(auth.currentUser.uid).set({
            olympusPoints: currentPoints
        }, { merge: true });
        console.log(`${amount} Puan eklendi. Sebep: ${reason}`);
    } catch (e) {
        console.error("Puan kaydedilemedi", e);
    }
};

// Oyun Değişkenleri
let gameTimerInterval;
let gameSpawnInterval;
let gameScore = 0;
let gameTime = 60;
let isGameRunning = false;

window.openMiniGame = function () {
    document.getElementById('minigame-screen').classList.remove('hidden');

    const olyAvatar = document.getElementById('oly-avatar');
    if (olyAvatar) olyAvatar.style.display = 'none';
}

window.closeMiniGame = function () {
    document.getElementById('minigame-screen').classList.add('hidden');
    endMiniGame(true); // Zorla kapatılırsa bitir

    // Oly'yi geri getir (Oyun bitti, asistan dönebilir)
    const olyAvatar = document.getElementById('oly-avatar');
    // Avatarın normal CSS flex yapısını bozmamak için 'flex' yapıyoruz
    if (olyAvatar) olyAvatar.style.display = 'flex';
}

window.startMiniGame = function () {
    // Bugün oynadı mı kontrolü
    const today = new Date().toLocaleDateString('tr-TR');
    const lastPlayed = localStorage.getItem('olympus_game_last_played');
    if (lastPlayed === today) {
        alert("Bugünlük hakkını doldurdun şampiyon! Yarın tekrar gel.");
        return;
    }

    document.getElementById('start-game-btn').style.display = 'none';
    document.getElementById('game-info').style.display = 'none';

    gameScore = 0;
    gameTime = 60;
    isGameRunning = true;
    document.getElementById('game-score').innerText = gameScore;
    document.getElementById('game-time').innerText = gameTime;

    // Süre sayacı
    gameTimerInterval = setInterval(() => {
        gameTime--;
        document.getElementById('game-time').innerText = gameTime;
        if (gameTime <= 0) endMiniGame(false);
    }, 1000);

    // Eşya Düşürme Sayacı (Her 600ms'de bir eşya atar)
    gameSpawnInterval = setInterval(spawnItem, 600);
}

function spawnItem() {
    if (!isGameRunning) return;

    const goodItems = ['🍎', '🥦', '🥩', '🏋️‍♂️', '💧', '🍗', '🥚', '🍌'];
    const badItems = ['🍔', '🍕', '🍩', '🍺', '🍟', '🍫', '🍦'];

    // %70 İhtimalle iyi, %30 ihtimalle kötü eşya gelir
    const isGood = Math.random() > 0.3;
    const itemArray = isGood ? goodItems : badItems;
    const itemEmoji = itemArray[Math.floor(Math.random() * itemArray.length)];

    const itemEl = document.createElement('div');
    itemEl.className = 'falling-item';
    itemEl.innerText = itemEmoji;

    // Rastgele yatay konum (ekrandan taşmasın diye %5 ile %85 arası)
    const randomX = Math.floor(Math.random() * 80) + 5;
    itemEl.style.left = randomX + '%';

    // Rastgele düşme hızı (2.5 saniye ile 4 saniye arası)
    const duration = Math.random() * 1.5 + 2.5;
    itemEl.style.animationDuration = duration + 's';

    // Tıklama Olayı (Mobil için touchstart, PC için mousedown)
    itemEl.addEventListener('pointerdown', (e) => {
        if (!isGameRunning) return;

        // Puan hesapla
        const pointChange = isGood ? 15 : -15;
        gameScore += pointChange;
        document.getElementById('game-score').innerText = gameScore;

        // Ekrana anlık +15 / -15 yazısı çıkar
        showPopupText(e.clientX, e.clientY, isGood ? '+15' : '-15', isGood ? '#00ff00' : '#ff4444');

        // Eşyayı yok et ve titreşim ver
        itemEl.remove();
        if (navigator.vibrate) navigator.vibrate(isGood ? 15 : 40);
    });

    document.getElementById('game-area').appendChild(itemEl);

    // Düşen eşyayı animasyon bitince DOM'dan sil (bellek şişmesin)
    setTimeout(() => { if (itemEl.parentElement) itemEl.remove(); }, duration * 1000);
}

function showPopupText(x, y, text, color) {
    const popup = document.createElement('div');
    popup.className = 'game-popup';
    popup.style.left = (x - 10) + 'px';
    popup.style.top = (y - 20) + 'px';
    popup.style.color = color;
    popup.innerText = text;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 800);
}

function endMiniGame(forceClose) {
    isGameRunning = false;
    clearInterval(gameTimerInterval);
    clearInterval(gameSpawnInterval);
    document.getElementById('game-area').innerHTML = `
        <button id="start-game-btn" class="save-btn" style="position:absolute; top:40%; left:50%; transform:translate(-50%, -50%); width:250px; background:#00d2ff; color:#000;" onclick="startMiniGame()">
            ▶ OYUNU BAŞLAT (1 DK)
        </button>
    `; // Temizle

    if (forceClose) return;

    const today = new Date().toLocaleDateString('tr-TR');

    if (gameScore >= 200) {
        addOlympusPoints(30, "Günün Oyunu Kazanıldı");
        localStorage.setItem('olympus_game_last_played', today); // Oynadı işaretle

        confetti({ particleCount: 200, spread: 90, colors: ['#00d2ff', '#fff'] });
        alert(`Tebrikler! ${gameScore} puan topladın.\n\n🏆 HESABINA 30 OLYMPUS EKLENDİ!`);
        closeMiniGame();
    } else {
        localStorage.setItem('olympus_game_last_played', today); // Kaybetse de hakkı yanar
        alert(`Süre bitti! Sadece ${gameScore} puan toplayabildin. 200 puana ulaşamadığın için ödül alamadın.\n\nYarın tekrar dene!`);
        closeMiniGame();
    }
}
// ==========================================
// PODYUM VE LİDERLİK TABLOSU YÜKLEME MOTORU
// ==========================================
async function loadLeaderboard() {
    const boardDiv = document.getElementById('arena-leaderboard');
    if (!boardDiv) return;

    try {
        // En yüksek Olympus puanına sahip 3 sporcuyu çek
        const snapshot = await db.collection("users").orderBy("olympusPoints", "desc").limit(3).get();
        let topUsers = [];
        snapshot.forEach(doc => topUsers.push(doc.data()));

        if (topUsers.length === 0) {
            boardDiv.innerHTML = '<p style="color:gray; font-size:12px; text-align:center;">Henüz kimse puan kazanmadı. Oynayan ilk sen ol!</p>';
            return;
        }

        // Podyum sıralaması (0. indeks = 1. olan vb.)
        const rank1 = topUsers[0] || null;
        const rank2 = topUsers[1] || null;
        const rank3 = topUsers[2] || null;

        boardDiv.innerHTML = '';

        // --- 2. SIRA (SOLDA) ---
        if (rank2) {
            boardDiv.innerHTML += `
                <div class="podium-item rank-2">
                    <span class="podium-crown">🥈</span>
                    <img src="${escapeHTML(rank2.photo || 'icon.png')}" class="podium-avatar">
                    <div class="podium-name">${escapeHTML(rank2.name)}</div>
                    <div class="podium-score">${rank2.olympusPoints} P</div>
                </div>
            `;
        } else {
            boardDiv.innerHTML += `<div class="podium-item rank-2" style="visibility:hidden;"></div>`;
        }

        // --- 1. SIRA (ORTADA - EN YÜKSEKTE) ---
        if (rank1) {
            boardDiv.innerHTML += `
                <div class="podium-item rank-1">
                    <span class="podium-crown">👑</span>
                    <img src="${escapeHTML(rank1.photo || 'icon.png')}" class="podium-avatar">
                    <div class="podium-name">${escapeHTML(rank1.name)}</div>
                    <div class="podium-score">${rank1.olympusPoints} P</div>
                </div>
            `;
        }

        // --- 3. SIRA (SAĞDA) ---
        if (rank3) {
            boardDiv.innerHTML += `
                <div class="podium-item rank-3">
                    <span class="podium-crown">🥉</span>
                    <img src="${escapeHTML(rank3.photo || 'icon.png')}" class="podium-avatar">
                    <div class="podium-name">${escapeHTML(rank3.name)}</div>
                    <div class="podium-score">${rank3.olympusPoints} P</div>
                </div>
            `;
        } else {
            boardDiv.innerHTML += `<div class="podium-item rank-3" style="visibility:hidden;"></div>`;
        }

    } catch (e) {
        console.error("Liderlik tablosu yüklenemedi:", e);
        boardDiv.innerHTML = '<p style="color:#ff4444; font-size:12px; text-align:center;">Sıralama alınamadı.</p>';
    }
}
// ==========================================
// BAŞARI ROZETLERİ (ACHIEVEMENTS) MOTORU
// ==========================================

const badgesData = [
    { id: 'b1', icon: '🔥', title: 'İlk Kan', desc: 'İlk idmanını başarıyla tamamla.', req: () => (JSON.parse(localStorage.getItem('olympus_worked_muscles')) || []).length > 0 },
    { id: 'b2', icon: '💧', title: 'Poseidon', desc: 'Su içme hedefine ulaş.', req: () => { const w = JSON.parse(localStorage.getItem('olympus_water_obj')); return w && w.yesterday >= (localStorage.getItem('olympus_water_goal') || 3000); } },
    { id: 'b3', icon: '🎮', title: 'Oyunbaz', desc: 'Olympus Catch oyununu oyna.', req: () => localStorage.getItem('olympus_game_last_played') !== null },
    { id: 'b4', icon: '🥉', title: 'Bronz Hırs', desc: '100 Olympus Puanı topla.', req: () => (parseInt(localStorage.getItem('olympus_total_points')) || 0) >= 100 },
    { id: 'b5', icon: '🥈', title: 'Gümüş Disiplin', desc: '500 Olympus Puanı topla.', req: () => (parseInt(localStorage.getItem('olympus_total_points')) || 0) >= 500 },
    { id: 'b6', icon: '🥇', title: 'Altın İrade', desc: '1000 Olympus Puanı topla.', req: () => (parseInt(localStorage.getItem('olympus_total_points')) || 0) >= 1000 },
    { id: 'b7', icon: '⚖️', title: 'Mimar', desc: 'Vücut ölçülerini sisteme kaydet.', req: () => { const p = JSON.parse(localStorage.getItem('olympus_profile')); return p && p.w; } },
    { id: 'b8', icon: '📈', title: 'Güç Tutkunu', desc: 'İdman hacmi (1RM) değerini kaydet.', req: () => { const p = JSON.parse(localStorage.getItem('olympus_profile')); return p && p.bench; } },
    { id: 'b9', icon: '🍱', title: 'Makro Ustası', desc: 'Kalori takibini grafiğe yansıt.', req: () => (JSON.parse(localStorage.getItem('olympus_cal_history')) || []).length > 0 },
    { id: 'b10', icon: '👑', title: 'Kusursuz Gün', desc: 'Tüm günlük görevleri işaretle.', req: () => { const acts = JSON.parse(localStorage.getItem('olympus_acts')) || []; return acts.length > 0 && acts.every(a => a.done); } }
];

window.openBadgesModal = function () {
    const container = document.getElementById('badge-grid-container');
    container.innerHTML = '';

    // Kazanılan rozet sayısını bul
    let earnedCount = 0;

    badgesData.forEach(badge => {
        // Fonksiyon çalışıp şart sağlanıyor mu kontrol ediliyor
        const isEarned = badge.req();
        if (isEarned) earnedCount++;

        container.innerHTML += `
            <div class="badge-card ${isEarned ? 'earned' : ''}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-title">${badge.title}</div>
                <div class="badge-desc">${badge.desc}</div>
            </div>
        `;
    });

    // Rozet başarı oranını konsola yazdır (geliştirici için)
    console.log(`Toplam ${earnedCount}/${badgesData.length} rozet kazanıldı.`);

    // Modalı aç
    document.getElementById('badges-modal').style.display = 'flex';
    if (navigator.vibrate) navigator.vibrate(50);
};
// ==========================================
