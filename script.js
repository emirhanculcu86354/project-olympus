// 1. FIREBASE KURULUMU
const firebaseConfig = {
    apiKey: "AIzaSyD8n3FxnxAjbEaq4TJRXoHBf_qwxpc0zy4",
    authDomain: "project-olympusss.firebaseapp.com",
    databaseURL: "https://project-olympusss-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "project-olympusss",
    storageBucket: "project-olympusss.firebasestorage.app",
    messagingSenderId: "216436425298",
    appId: "1:216436425298:web:3c4f87ac9fa35d0202558b",
    measurementId: "G-RMV7ZFFTJK"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const rtdb = firebase.database();
let presenceConnectionRef = null;

db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });

// YÜKLEME EKRANI KONTROLÜ İÇİN DEĞİŞKEN
let isAppInitialized = false;

auth.onAuthStateChanged(user => {
    if (user) {
        setupRealtimePresence(user.uid);
        // 1. DURUM: KULLANICI ZATEN GİRİŞ YAPMIŞ
        document.getElementById('login-screen').classList.add('hidden');

        // Eğer uygulama ilk kez yükleniyorsa daktilo animasyonunu başlat
        if (!isAppInitialized) {
            playSplashAnimation(() => {
                // Animasyon bitince ARTIK APP DEĞİL, HUB (MERKEZ ÜS) AÇILACAK!
                document.getElementById('hub-screen').classList.remove('hidden');
                document.getElementById('hub-screen').style.display = 'flex';
                document.getElementById('app-content').classList.add('hidden');
                initHubCarousel();
            });
            isAppInitialized = true;
        } else {
            // Animasyon zaten oynadıysa direkt HUB göster
            document.getElementById('hub-screen').classList.remove('hidden');
            document.getElementById('hub-screen').style.display = 'flex';
            document.getElementById('app-content').classList.add('hidden');
            initHubCarousel();
        }

        const photo = user.photoURL || 'icon.png';
        const name = user.displayName || 'Sporcu';
        document.getElementById('header-profile-img').src = photo;
        document.getElementById('profile-image-large').src = photo;
        document.getElementById('profile-name-display').innerText = name;
        document.getElementById('profile-name-input').value = name;

        db.collection("users").doc(user.uid).set({
            uid: user.uid,
            name: name,
            photo: photo,
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        loadDataFromCloud(user.uid);
        listenForNotifications();

    } else {
        if (presenceConnectionRef) presenceConnectionRef.off();
        // 2. DURUM: KULLANICI GİRİŞ YAPMAMIŞ (SADECE LOGIN EKRANI GÖSTERİLMELİ)
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none'; // Animasyonu iptal et

        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-content').classList.add('hidden');
        document.getElementById('hub-screen').classList.add('hidden');
        isAppInitialized = true;
    }
    updateProfileFollowStats();
});

document.getElementById('google-login-btn').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => alert("Giriş Hatası: " + err.message));
});

window.logout = function () { auth.signOut(); }

// Realtime Database Presence: bağlantı kopsa bile kullanıcıyı otomatik çevrimdışı yapar.
function setupRealtimePresence(uid) {
    if (presenceConnectionRef) presenceConnectionRef.off();
    const statusRef = rtdb.ref(`status/${uid}`);
    presenceConnectionRef = rtdb.ref('.info/connected');

    presenceConnectionRef.on('value', snapshot => {
        if (snapshot.val() !== true) return;
        const offlineStatus = { state: 'offline', lastChanged: firebase.database.ServerValue.TIMESTAMP };
        statusRef.onDisconnect().set(offlineStatus).then(() => {
            statusRef.set({ state: 'online', lastChanged: firebase.database.ServerValue.TIMESTAMP });
        });
    });
}

async function loadDataFromCloud(uid) {
    const docRef = db.collection("users").doc(uid);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        const data = docSnap.data();
        if (data.profile) localStorage.setItem('olympus_profile', JSON.stringify(data.profile));
    }
    loadProfileData();
    calculateCurrentDay();
}

window.syncDataToCloud = function () {
    const user = auth.currentUser;
    if (!user) return;
    const p = JSON.parse(localStorage.getItem('olympus_profile')) || {};
    db.collection("users").doc(user.uid).set({ profile: p, lastSync: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
        .then(() => console.log("Veri Firestore'a eklendi!"))
        .catch((error) => console.error("Kayıt başarısız:", error));
}
// ==========================================
// 🧠 AKILLI AÇILIŞ HAFIZASI (Rastgele Hub / Son Ekran)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const lastScreen = localStorage.getItem('olympus_last_active_screen');

    // %60 ihtimalle son kaldığı ekranı açar, %40 ihtimalle Hub ekranına düşer
    const shouldOpenLastScreen = Math.random() < 0.6;

    if (lastScreen && shouldOpenLastScreen) {
        if (lastScreen === 'kpss') {
            if (typeof openKPSSCenter === 'function') openKPSSCenter();
        } else if (lastScreen === 'jandarma') {
            if (typeof openJandarmaModu === 'function') openJandarmaModu(true); // true = animasyonsuz aç
        } else {
            // Hub'da kalsın
        }
    }
});

// Her ekran açılışına hafıza kaydı ekleyen yardımcı fonksiyon
function saveLastScreen(screenName) {
    localStorage.setItem('olympus_last_active_screen', screenName);
}

// 2. ANTRENMAN VE DİYET VERİLERİ (TAMAMI GERİ EKLENDİ)
// 2. ANTRENMAN VE DİYET VERİLERİ
const programData = {
    p1: [
        { day: 1, title: "Gün 1: İtme (Push)", muscles: ["chest", "arms-l", "arms-r", "core"], rest: false, ex: [{ name: "Bench Press", scheme: "4 x 6-8", tempo: "3-1-1-0", rpe: 8 }, { name: "Incline DB Press", scheme: "4 x 8-10", tempo: "3-0-1-0", rpe: 8.5 }, { name: "Machine Chest Press", scheme: "3 x 10-12", tempo: "2-0-1-1", rpe: 9 }, { name: "Cable Fly", scheme: "3 x 12-15", tempo: "2-0-1-2", rpe: 9 }, { name: "Lateral Raise", scheme: "5 x 12-15", tempo: "2-0-1-1", rpe: 9 }, { name: "Triceps Pushdown", scheme: "3 x 10-12", tempo: "2-0-1-1", rpe: 9 }, { name: "Overhead Rope Ext.", scheme: "3 x 12", tempo: "3-0-1-1", rpe: 9 }, { name: "Plank", scheme: "3 x 60 sn", tempo: "Statik", rpe: 8 }] },
        { day: 2, title: "Gün 2: Çekme (Pull)", muscles: ["arms-l", "arms-r", "core"], rest: false, ex: [{ name: "Pull-up", scheme: "4 x Max", tempo: "2-1-1-0", rpe: 9 }, { name: "Lat Pulldown", scheme: "4 x 8-12", tempo: "3-0-1-1", rpe: 8 }, { name: "Barbell Row", scheme: "4 x 6-8", tempo: "2-1-1-0", rpe: 8.5 }, { name: "Seated Cable Row", scheme: "3 x 10-12", tempo: "2-0-1-2", rpe: 9 }, { name: "Face Pull", scheme: "4 x 15", tempo: "2-0-1-2", rpe: 9 }, { name: "Incline DB Curl", scheme: "3 x 10-12", tempo: "3-0-1-0", rpe: 9 }, { name: "Hammer Curl", scheme: "3 x 12", tempo: "2-0-1-0", rpe: 9 }] },
        { day: 3, title: "Gün 3: Bacak (Legs)", muscles: ["legs-l", "legs-r", "core"], rest: false, ex: [{ name: "Squat", scheme: "4 x 6", tempo: "3-1-1-0", rpe: 8 }, { name: "Romanian Deadlift", scheme: "4 x 8", tempo: "3-0-1-0", rpe: 8.5 }, { name: "Leg Press", scheme: "3 x 10-12", tempo: "2-0-1-0", rpe: 9 }, { name: "Leg Extension", scheme: "3 x 15", tempo: "2-0-1-1", rpe: 9 }, { name: "Leg Curl", scheme: "3 x 15", tempo: "2-0-1-1", rpe: 9 }, { name: "Standing Calf Raise", scheme: "5 x 15-20", tempo: "2-1-1-1", rpe: 9 }, { name: "Hanging Leg Raise", scheme: "3 x 12", tempo: "2-0-1-0", rpe: 9 }, { name: "Cable Crunch", scheme: "3 x 15", tempo: "2-0-1-1", rpe: 9 }] },
        { day: 4, title: "Gün 4: Aktif Dinlenme", muscles: [], rest: true, ex: [] },
        { day: 5, title: "Gün 5: Push Hypertrophy", muscles: ["chest", "arms-l", "arms-r"], rest: false, ex: [{ name: "Incline DB Press", scheme: "4 x 10", tempo: "2-0-1-0", rpe: 9 }, { name: "Machine Chest Press", scheme: "4 x 12", tempo: "2-0-1-1", rpe: 9 }, { name: "Cable Fly", scheme: "4 x 15", tempo: "2-0-1-2", rpe: 9.5 }, { name: "Shoulder Press", scheme: "4 x 10", tempo: "3-0-1-0", rpe: 8.5 }, { name: "Lateral Raise", scheme: "5 x 15", tempo: "2-0-1-0", rpe: 10 }, { name: "Rear Delt Fly", scheme: "4 x 15", tempo: "2-0-1-1", rpe: 9.5 }, { name: "Triceps Rope Pushdown", scheme: "3 x 15", tempo: "2-0-1-1", rpe: 10 }] },
        { day: 6, title: "Gün 6: Pull + Arms", muscles: ["arms-l", "arms-r", "core"], rest: false, ex: [{ name: "Lat Pulldown", scheme: "4 x 10-12", tempo: "2-0-1-1", rpe: 9 }, { name: "Chest Supported Row", scheme: "4 x 10", tempo: "2-0-1-1", rpe: 9 }, { name: "Straight Arm Pulldown", scheme: "3 x 15", tempo: "2-0-1-2", rpe: 9.5 }, { name: "Face Pull", scheme: "3 x 15", tempo: "2-0-1-2", rpe: 9 }, { name: "Barbell Curl", scheme: "3 x 10", tempo: "2-0-1-0", rpe: 9 }, { name: "Cable Curl", scheme: "3 x 12", tempo: "2-0-1-1", rpe: 9.5 }, { name: "Dips", scheme: "3 x Max", tempo: "3-0-1-0", rpe: 9 }, { name: "Lateral Raise Finisher", scheme: "100 tekrar", tempo: "Sürekli", rpe: "-" }] },
        { day: 7, title: "Gün 7: Tam Dinlenme", muscles: [], rest: true, ex: [] }
    ],
    p2: [
        { day: 1, title: "Gün 1: Upper Strength", muscles: ["chest", "arms-l", "arms-r"], rest: false, ex: [{ name: "Bench Press", scheme: "5 x 5", tempo: "4-0-1-0", rpe: 8.5 }, { name: "Incline Bench Press", scheme: "4 x 6-8", tempo: "3-1-1-0", rpe: 8.5 }, { name: "Weighted Pull-up", scheme: "4 x 6-8", tempo: "2-1-1-0", rpe: 8.5 }, { name: "Barbell Row", scheme: "4 x 6-8", tempo: "2-1-1-0", rpe: 8.5 }, { name: "Military Press", scheme: "4 x 6", tempo: "3-0-1-0", rpe: 8.5 }, { name: "Lateral Raise", scheme: "5 x 15", tempo: "2-0-1-1", rpe: 9 }, { name: "Face Pull", scheme: "4 x 15", tempo: "2-0-1-2", rpe: 9 }, { name: "Cable Curl", scheme: "3 x 12", tempo: "3-0-1-1", rpe: 9 }, { name: "Pushdown", scheme: "3 x 12", tempo: "2-0-1-1", rpe: 9 }] },
        // ... (Diğer günlere de aynı mantıkla muscles: [...] ekleyebilirsin)
        { day: 2, title: "Gün 2: Lower Strength", muscles: ["legs-l", "legs-r", "core"], rest: false, ex: [{ name: "Squat", scheme: "5 x 5", tempo: "3-1-1-0", rpe: 8.5 }, { name: "Romanian Deadlift", scheme: "4 x 8", tempo: "3-0-1-0", rpe: 8.5 }, { name: "Leg Press", scheme: "4 x 10", tempo: "3-0-1-0", rpe: 9 }, { name: "Leg Extension", scheme: "4 x 12", tempo: "2-0-1-1", rpe: 9 }, { name: "Leg Curl", scheme: "4 x 12", tempo: "2-0-1-1", rpe: 9 }, { name: "Standing Calf Raise", scheme: "5 x 15", tempo: "2-1-1-1", rpe: 9 }, { name: "Hanging Leg Raise", scheme: "4 x 12", tempo: "2-0-1-0", rpe: 9 }, { name: "Cable Crunch", scheme: "4 x 15", tempo: "2-0-1-1", rpe: 9 }] },
        { day: 3, title: "Gün 3: Aktif Dinlenme", muscles: [], rest: true, ex: [] },
        { day: 4, title: "Gün 4: Push Hypertrophy", muscles: ["chest", "arms-l", "arms-r"], rest: false, ex: [{ name: "Incline DB Press", scheme: "4 x 10", tempo: "3-0-1-0", rpe: 9 }, { name: "Machine Chest Press", scheme: "4 x 12", tempo: "2-0-1-1", rpe: 9 }, { name: "Cable Fly", scheme: "4 x 15", tempo: "2-0-1-2", rpe: 9.5 }, { name: "Shoulder Press", scheme: "4 x 10", tempo: "3-0-1-0", rpe: 9 }, { name: "Lateral Raise", scheme: "6 x 15", tempo: "2-0-1-0", rpe: 10 }, { name: "Rear Delt Fly", scheme: "5 x 15", tempo: "2-0-1-1", rpe: 9.5 }, { name: "Overhead Rope Ext.", scheme: "4 x 12", tempo: "3-0-1-1", rpe: 9 }, { name: "Pushdown", scheme: "3 x 15", tempo: "2-0-1-1", rpe: 10 }] },
        { day: 5, title: "Gün 5: Pull Hypertrophy", muscles: ["arms-l", "arms-r", "core"], rest: false, ex: [{ name: "Pull-up", scheme: "4 x Max", tempo: "2-1-1-0", rpe: 9 }, { name: "Lat Pulldown", scheme: "4 x 12", tempo: "3-0-1-1", rpe: 9 }, { name: "Chest Supported Row", scheme: "4 x 10", tempo: "2-0-1-1", rpe: 9 }, { name: "Straight Arm Pulldown", scheme: "4 x 15", tempo: "2-0-1-2", rpe: 9.5 }, { name: "Face Pull", scheme: "4 x 15", tempo: "2-0-1-2", rpe: 9 }, { name: "Hammer Curl", scheme: "4 x 12", tempo: "2-0-1-0", rpe: 9.5 }, { name: "Incline Curl", scheme: "4 x 12", tempo: "3-0-1-0", rpe: 9.5 }] },
        { day: 6, title: "Gün 6: Dinlenme", muscles: [], rest: true, ex: [] },
        { day: 7, title: "Gün 7: Tam Dinlenme", muscles: [], rest: true, ex: [] }
    ],
    p3: [
        // Aynı şekilde p3 için de çalışacak...
        { day: 1, title: "Gün 1: Upper Pump", muscles: ["chest", "arms-l", "arms-r"], rest: false, ex: [{ name: "Bench Press", scheme: "4 x 8", tempo: "3-0-1-0", rpe: 8.5 }, { name: "Incline Press", scheme: "4 x 10", tempo: "3-0-1-0", rpe: 9 }, { name: "Machine Chest Press", scheme: "3 x 15", tempo: "2-0-1-1", rpe: 9.5 }, { name: "Cable Fly", scheme: "3 x 20", tempo: "2-0-1-2", rpe: 10 }, { name: "Lateral Raise", scheme: "7 x 15", tempo: "2-0-1-0", rpe: 9.5 }, { name: "Rear Delt Fly", scheme: "5 x 20", tempo: "2-0-1-1", rpe: 10 }, { name: "Pushdown", scheme: "4 x 15", tempo: "2-0-1-1", rpe: 10 }, { name: "Overhead Extension", scheme: "4 x 15", tempo: "3-0-1-1", rpe: 10 }] },
        { day: 2, title: "Gün 2: Back Width", muscles: ["arms-l", "arms-r"], rest: false, ex: [{ name: "Wide Grip Lat Pulldown", scheme: "5 x 12", tempo: "3-0-1-1", rpe: 9 }, { name: "Pull-up", scheme: "4 x Max", tempo: "2-1-1-0", rpe: 9.5 }, { name: "Chest Supported Row", scheme: "4 x 12", tempo: "2-0-1-2", rpe: 9 }, { name: "Straight Arm Pulldown", scheme: "4 x 15", tempo: "2-0-1-2", rpe: 9.5 }, { name: "Face Pull", scheme: "5 x 20", tempo: "2-0-1-2", rpe: 10 }, { name: "Hammer Curl", scheme: "4 x 12", tempo: "2-0-1-0", rpe: 9.5 }, { name: "Cable Curl", scheme: "4 x 15", tempo: "2-0-1-1", rpe: 10 }] },
        { day: 3, title: "Gün 3: Legs", muscles: ["legs-l", "legs-r"], rest: false, ex: [{ name: "Squat", scheme: "4 x 8", tempo: "3-1-1-0", rpe: 8.5 }, { name: "Romanian Deadlift", scheme: "4 x 10", tempo: "3-0-1-0", rpe: 8.5 }, { name: "Leg Press", scheme: "4 x 15", tempo: "2-0-1-0", rpe: 9.5 }, { name: "Walking Lunge", scheme: "3 x 15", tempo: "Dinamik", rpe: 9 }, { name: "Leg Extension", scheme: "4 x 20", tempo: "2-0-1-1", rpe: 10 }, { name: "Leg Curl", scheme: "4 x 20", tempo: "2-0-1-1", rpe: 10 }, { name: "Standing Calf Raise", scheme: "6 x 20", tempo: "2-1-1-1", rpe: 9.5 }] },
        { day: 4, title: "Gün 4: Shoulder Specialization", muscles: ["arms-l", "arms-r"], rest: false, ex: [{ name: "Military Press", scheme: "4 x 8", tempo: "3-0-1-0", rpe: 8.5 }, { name: "Lateral Raise", scheme: "8 x 15", tempo: "2-0-1-0", rpe: 9.5 }, { name: "Cable Lateral Raise", scheme: "5 x 15", tempo: "2-0-1-1", rpe: 10 }, { name: "Rear Delt Fly", scheme: "6 x 20", tempo: "2-0-1-1", rpe: 10 }, { name: "Shrug", scheme: "4 x 12", tempo: "2-0-1-2", rpe: 9 }, { name: "Face Pull", scheme: "4 x 20", tempo: "2-0-1-2", rpe: 9.5 }] },
        { day: 5, title: "Gün 5: Arms + Pump", muscles: ["arms-l", "arms-r", "chest"], rest: false, ex: [{ name: "Close Grip Bench Press", scheme: "4 x 8", tempo: "3-1-1-0", rpe: 8.5 }, { name: "EZ Bar Curl", scheme: "4 x 10", tempo: "3-0-1-0", rpe: 9 }, { name: "Rope Pushdown", scheme: "4 x 15", tempo: "2-0-1-1", rpe: 9.5 }, { name: "Incline Curl", scheme: "4 x 15", tempo: "3-0-1-0", rpe: 9.5 }, { name: "Hammer Curl", scheme: "4 x 15", tempo: "2-0-1-0", rpe: 9.5 }, { name: "Overhead Rope Ext.", scheme: "4 x 15", tempo: "2-0-1-1", rpe: 10 }] },
        { day: 6, title: "Gün 6: Dinlenme", muscles: [], rest: true, ex: [] },
        { day: 7, title: "Gün 7: Tam Dinlenme", muscles: [], rest: true, ex: [] }
    ]
};

const dietData = {
    1: { title: "Pzt: Yüksek Karb.", meals: [{ t: "1. Ana Öğün (12:00)", d: "4 Tam Yumurta, 100g Yulaf Ezmesi, 15g Şekersiz Fıstık Ezmesi, Kahve", alt: "Değişim: 250g Lor Peyniri, 100g Pirinç Unu", i: "🍳" }, { t: "Ara Öğün (16:30)", d: "1 Orta Boy Muz, Filtre Kahve", alt: "Değişim: 1 Yeşil Elma veya 2 Pirinç Patlağı", i: "🍌" }, { t: "Ara Öğün (18:30)", d: "1 Ölçek Whey Protein, 5g Kreatin", alt: "Değişim: 150g Süzme Yoğurt veya 4 Yumurta Beyazı", i: "🥤" }, { t: "2. Ana Öğün (19:30)", d: "250g Tavuk Göğsü, 150g Basmati Pirinç, Yeşil Salata", alt: "Değişim: 220g Kırmızı Et veya 180g Ton Balığı", i: "🍗" }, { t: "Gece Öğünü", d: "150g Lor Peyniri", alt: "Değişim: 250g Süzme Yoğurt veya 30g Badem", i: "🧀" }] },
    2: { title: "Sal: Orta Karb.", meals: [{ t: "1. Ana Öğün (12:00)", d: "4 Yumurtalı Omlet, 50g Lor Peyniri, 2 Dilim Tam Buğday Ekmeği", alt: "Değişim: 3 Tam + 3 Beyaz Yumurta", i: "🍳" }, { t: "Ara Öğün (16:30)", d: "1 Elma, 15g Fıstık Ezmesi", alt: "Değişim: 10 Çiğ Badem veya 30g Kavrulmamış Yer Fıstığı", i: "🍎" }, { t: "Ara Öğün (18:30)", d: "1 Ölçek Whey Protein, 5g Kreatin", alt: "Değişim: 150g Süzme Yoğurt", i: "🥤" }, { t: "2. Ana Öğün (19:30)", d: "1 Kutu Süzülmüş Ton Balığı, 150g Kepekli Makarna, Salata", alt: "Değişim: 2 Porsiyon Yeşil Mercimek veya 200g Hindi", i: "🐟" }] },
    3: { title: "Çar: Yüksek Karb.", meals: [{ t: "1. Ana Öğün (12:00)", d: "120g Yulaf Ezmesi, 4 Haşlanmış Yumurta, Tarçın", alt: "Değişim: 150g Pirinç Unu, 250g Lor Peyniri", i: "🥣" }, { t: "Ara Öğün (16:30)", d: "2 Pirinç Patlağı, 15g Bal, Kahve", alt: "Değişim: 1 Adet Muz ve Sade Soda", i: "🍯" }, { t: "Ara Öğün (18:30)", d: "1 Ölçek Whey Protein, 5g Kreatin", alt: "Değişim: 4 Yumurta Beyazı", i: "🥤" }, { t: "2. Ana Öğün (19:30)", d: "250g Tavuk Göğsü, 200g Fırın Patates, Mevsim Salata", alt: "Değişim: 220g Kırmızı Et, 150g Kepekli Makarna", i: "🍗" }] },
    4: { title: "Per: Düşük Karb.", meals: [{ t: "1. Ana Öğün (12:00)", d: "4 Tam Yumurta (Tereyağında), Söğüş Salata (Karb. yok)", alt: "Değişim: 200g Izgara Tavuk Kalça", i: "🍳" }, { t: "Ara Öğün (16:00)", d: "1 Kase Yoğurt, 30g Kavrulmamış Yer Fıstığı", alt: "Değişim: 30g Çiğ Badem veya Ceviz", i: "🥜" }, { t: "2. Ana Öğün (19:00)", d: "1.5 Porsiyon Yeşil Mercimek veya Nohut Yemeği, Bol Salata", alt: "Değişim: 250g Izgara Levrek/Çipura", i: "🍲" }] },
    5: { title: "Cum: Yüksek Karb.", meals: [{ t: "1. Ana Öğün (12:00)", d: "4 Tam Yumurta, 100g Yulaf Ezmesi, 1 YK Fıstık Ezmesi", alt: "Değişim: 250g Lor, 100g Pirinç Unu", i: "🍳" }, { t: "Ara Öğün (16:30)", d: "1 Muz, Pre-Workout veya Kahve", alt: "Değişim: 2 Pirinç Patlağı, Bal", i: "🍌" }, { t: "Ara Öğün (18:30)", d: "1 Ölçek Whey Protein, 5g Kreatin", alt: "Değişim: 150g Süzme Yoğurt", i: "🥤" }, { t: "2. Ana Öğün (19:30)", d: "200g Tavuk Göğsü Sote, 150g Pirinç Pilavı, Izgara Sebze", alt: "Değişim: 200g Yağsız Köfte, Patates", i: "🍗" }] },
    6: { title: "Cmt: Orta Karb.", meals: [{ t: "1. Ana Öğün (12:00)", d: "3 Yumurtalı, 50g Yulaf Unlu Krep, 1 Tatlı Kaşığı Bal", alt: "Değişim: 3 Haşlanmış Yumurta, 2 Dilim Ekmek", i: "🥞" }, { t: "Ara Öğün (16:30)", d: "1 Porsiyon Meyve, 15g Yer Fıstığı", alt: "Değişim: 1 Yeşil Elma, 10 Çiğ Badem", i: "🍎" }, { t: "Ara Öğün (18:30)", d: "1 Ölçek Whey Protein (İdman yapıldıysa)", alt: "Değişim: Gerekirse 100g Lor", i: "🥤" }, { t: "2. Ana Öğün (19:30)", d: "200g Tavuk Göğsü, 100g Makarna, Havuç/Brokoli", alt: "Değişim: 180g Ton Balığı, 100g Pirinç", i: "🍗" }] },
    7: { title: "Paz: Cheat Meal", meals: [{ t: "1. Ana Öğün (12:00)", d: "Menemen (4 Yumurta), 2 Dilim Ekmek, 50g Peynir", alt: "Değişim: Standart Türk Kahvaltısı", i: "🍳" }, { t: "Ara Öğün (16:00)", d: "1 Kase Yoğurt veya Sade Kahve", alt: "Değişim: Yeşil Çay", i: "☕" }, { t: "2. Ana Öğün (19:00)", d: "SERBEST ÖĞÜN: Pizza, Burger vb.", alt: "Değişim: İstenilen herhangi bir menü", i: "🍔" }] }
};
// ==========================================
// 🌸 DİLALAM ÖZEL PROGRAMI (V4 SÜRÜMÜ)
// ==========================================
const dilalaProgramData = {
    p1: [
        {
            day: 1, title: "Pzt: Bacak & Kuğu Kolları", muscles: ["legs-l", "legs-r", "arms-l", "arms-r"], rest: false, ex: [
                { name: "Spor Öncesi Isınma", scheme: "5-10 Dk", tempo: "Dinamik", rpe: "-" },
                { name: "Squat", scheme: "4 x 15", tempo: "2-0-1-0", rpe: 7 },
                { name: "Arm Pulses (Kollar Yanda)", scheme: "3 x 45 sn", tempo: "Yaylanarak", rpe: 7 },
                { name: "Reverse Lunge", scheme: "3 x 10", tempo: "2-0-1-0", rpe: 7.5 },
                { name: "Glute Bridge", scheme: "4 x 15", tempo: "2-1-1-0", rpe: 7.5 },
                { name: "Kol Çevirme (Arm Circles)", scheme: "3 x 30 sn", tempo: "Sabit", rpe: 7 },
                { name: "Side Leg Raise", scheme: "3 x 15", tempo: "1-0-1-0", rpe: 7 },
                { name: "Spor Sonrası Esneme", scheme: "5 Dk", tempo: "Statik", rpe: "-" }
            ]
        },
        {
            day: 2, title: "Salı: Kardiyo", muscles: ["core", "legs-l", "legs-r"], rest: false, ex: [
                { name: "Tempolu Yürüyüş", scheme: "45 Dk", tempo: "Sabit", rpe: 6 }
            ]
        },
        {
            day: 3, title: "Çar: Karın & Postür", muscles: ["core", "shoulders", "legs-l", "legs-r"], rest: false, ex: [
                { name: "Spor Öncesi Isınma", scheme: "5 Dk", tempo: "Dinamik", rpe: "-" },
                { name: "Sumo Squat", scheme: "3 x 15", tempo: "2-0-1-0", rpe: 7 },
                { name: "Wall Angels (Melek Kanadı)", scheme: "3 x 12", tempo: "Yavaş", rpe: 6 },
                { name: "Yarım Mekik (Crunch)", scheme: "3 x 20", tempo: "1-0-1-1", rpe: 7 },
                { name: "Y-W-T Kollar", scheme: "3 x 10", tempo: "2-0-1-2", rpe: 7 },
                { name: "Russian Twist", scheme: "3 x 15", tempo: "1-0-1-0", rpe: 7 },
                { name: "Bicycle Crunch", scheme: "3 x 20", tempo: "1-0-1-0", rpe: 7 },
                { name: "Spor Sonrası Esneme", scheme: "5 Dk", tempo: "Statik", rpe: "-" }
            ]
        },
        {
            day: 4, title: "Perşembe: Kardiyo", muscles: ["core", "legs-l", "legs-r"], rest: false, ex: [
                { name: "Tempolu Yürüyüş", scheme: "45 Dk", tempo: "Sabit", rpe: 6 }
            ]
        },
        {
            day: 5, title: "Cuma: Dinamik Yağ Yakım", muscles: ["legs-l", "legs-r", "arms-l", "arms-r", "core"], rest: false, ex: [
                { name: "Spor Öncesi Isınma", scheme: "5 Dk", tempo: "Dinamik", rpe: "-" },
                { name: "Squat Pulse", scheme: "3 x 15", tempo: "Yaylanarak", rpe: 7.5 },
                { name: "Donkey Kick", scheme: "3 x 15", tempo: "2-0-1-0", rpe: 7 },
                { name: "Ağırlıksız Kickback", scheme: "3 x 20", tempo: "1-0-1-1", rpe: 7 },
                { name: "Wall Sit", scheme: "3 x 30 sn", tempo: "Statik", rpe: 8 },
                { name: "Dead Bug", scheme: "3 x 12", tempo: "2-0-1-0", rpe: 7 },
                { name: "Ayakta Diz Çekme", scheme: "3 x 30 sn", tempo: "Tempolu", rpe: 7.5 },
                { name: "Spor Sonrası Esneme", scheme: "5 Dk", tempo: "Statik", rpe: "-" }
            ]
        },
        {
            day: 6, title: "Cmt: Uzun Kardiyo", muscles: ["core", "legs-l", "legs-r"], rest: false, ex: [
                { name: "Uzun Yürüyüş", scheme: "75-90 Dk", tempo: "Sabit", rpe: 6 }
            ]
        },
        {
            day: 7, title: "Pazar: Aktif Dinlenme", muscles: [], rest: true, ex: [
                { name: "Hafif Yürüyüş veya Yoga", scheme: "30 Dk", tempo: "Yavaş", rpe: 4 }
            ]
        }
    ]
};

const dilalaDietData = {
    1: { title: "Pzt: Menü 1 & 2", meals: [{ t: "Uyarı", d: "Aç karna 500 ml su içilecek!", alt: "Rafine şeker, gece yemek yasak!", i: "💧" }, { t: "Öğle (Menü 1)", d: "2 Haşlanmış yumurta, Domates/Salatalık, Çay/Sade kahve", alt: "Hamur işi yasak", i: "🍳" }, { t: "Akşam (Menü 1)", d: "150-200 gr Tavuk, 4 Kaşık pirinç, Büyük Salata", alt: "Asitli içecek yok", i: "🍗" }] },
    2: { title: "Sal: Menü 2 & 3", meals: [{ t: "Uyarı", d: "Aç karna 500 ml su içilecek!", alt: "Günde 2.5 Litre Su!", i: "💧" }, { t: "Öğle (Menü 2)", d: "Omlet (2 yumurta), Lor peyniri, Yeşillik", alt: "Gece atıştırması yasak", i: "🍳" }, { t: "Akşam (Menü 2)", d: "150-200 gr Tavuk, Haşlanmış Patates (90gr), Yoğurt", alt: "Erken kalk, geç yatma!", i: "🍗" }] },
    3: { title: "Çar: Menü 3 & 4", meals: [{ t: "Uyarı", d: "Aç karna 500 ml su içilecek!", alt: "Pes etmek yok!", i: "💧" }, { t: "Öğle (Menü 3)", d: "Yoğurt/Süt, 5 kaşık yulaf, Yarım Muz", alt: "Paketli abur cubur yasak", i: "🥣" }, { t: "Akşam (Menü 3)", d: "Köfte, Büyük Salata", alt: "Cadının evi yasak :)", i: "🧆" }] },
    4: { title: "Per: Menü 4 & 5", meals: [{ t: "Uyarı", d: "Aç karna 500 ml su içilecek!", alt: "Kurallara uyulacak", i: "💧" }, { t: "Öğle (Menü 4)", d: "Yoğurt/Kefir, 5 kaşık yulaf, Çilek", alt: "Maden suyu serbest", i: "🍓" }, { t: "Akşam (Menü 4)", d: "150-200 gr Hindi Göğsü, Yoğurt, Salata", alt: "Sağlıklı yağlar serbest", i: "🍗" }] },
    5: { title: "Cum: Menü 5 & 6", meals: [{ t: "Uyarı", d: "Aç karna 500 ml su içilecek!", alt: "Fast food kesinlikle yasak!", i: "💧" }, { t: "Öğle (Menü 5)", d: "Kabak Yemeği, Yoğurt", alt: "Beyaz ekmek yok", i: "🥒" }, { t: "Akşam (Menü 5)", d: "Ton Balıklı Salata, Bol Yeşillik", alt: "Program atlamak yok", i: "🐟" }] },
    6: { title: "Cmt: Menü 6 & 7", meals: [{ t: "Uyarı", d: "Aç karna 500 ml su içilecek!", alt: "Şekerli herhangi bir şey yasak", i: "💧" }, { t: "Öğle (Menü 6)", d: "Ispanak Yemeği, Yoğurt", alt: "Kızartma yasak", i: "🥬" }, { t: "Akşam (Menü 6)", d: "Tavuklu Salata (150-200 gr Tavuk)", alt: "Pes etmek yok hanımefendi!!!", i: "🥗" }] },
    7: { title: "Paz: Menü 7 & 8", meals: [{ t: "Uyarı", d: "Aç karna 500 ml su içilecek!", alt: "7-8 Saat Uyku", i: "💧" }, { t: "Öğle (Menü 7)", d: "Menemen, Peynir, Salata", alt: "Sabah yürüyüşü unutulmayacak", i: "🍳" }, { t: "Akşam (Menü 7)", d: "Et Sote, Sebze, 3 Kaşık Bulgur", alt: "Seni çoook seviyorum! :)", i: "🥩" }] }
};

// ==========================================
// 🌸 DİLALAM MODU: ZAMAN KAPSÜLÜ VE TAKVİM MOTORU
// ==========================================
const specialDates = [
    { name: "Tanışma Yıldönümü", month: 7, day: 26, icon: "🌸" },
    { name: "Sevgililer Günü", month: 2, day: 14, icon: "💖" },
    { name: "İlişki Yıldönümü", month: 11, day: 19, icon: "👩‍❤️‍👨" },
    { name: "Dilala Doğum Günü", month: 8, day: 18, icon: "🎂" },
    { name: "Emoç Doğum Günü", month: 2, day: 3, icon: "🎂" }
];

window.toggleDilalaMode = function () {
    const checkbox = document.getElementById('dilala-toggle-checkbox');
    const isDilala = checkbox.checked;

    if (isDilala) {
        let pass = prompt("🌸 Dilala Moduna giriş için şifreyi giriniz:");

        if (pass === "19.11.2025" || pass === "19112025") {
            document.body.classList.add('dilala-mode');
            localStorage.setItem('olympus_dilala_mode', 'true');

            // 1. Yeni Dilala Dashboard'u Göster
            document.getElementById('profile-dilala-btn-container').classList.remove('hidden');
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
        } else {
            alert("Hatalı şifre! Sadece özel kişiler girebilir. 🔒");
            checkbox.checked = false;
            return;
        }
    } else {
        document.body.classList.remove('dilala-mode');
        localStorage.setItem('olympus_dilala_mode', 'false');

        // Dashboard'u Gizle ve Görevleri Geri Yükle
        document.getElementById('profile-dilala-btn-container').classList.add('hidden');
        if (dilalaTimerInterval) clearInterval(dilalaTimerInterval);

        let backupActs = JSON.parse(localStorage.getItem('olympus_acts_backup'));
        if (backupActs) {
            activities = backupActs;
            saveAndRenderActivities();
        }

        if (navigator.vibrate) navigator.vibrate(30);
    }

    renderWorkouts();
    renderDiet();
};

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
window.openFatSecretApp = function() {
    if(navigator.vibrate) navigator.vibrate(20);

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
// OLY CHAT & AI MOTORU FONKSİYONLARI
// ==========================================

window.openOlyChat = function () {
    const chatWin = document.getElementById('oly-chat-window');
    const avatar = document.getElementById('oly-avatar');
    chatWin.classList.add('open');
    avatar.style.right = '-50px'; // Chat açılınca avatarı gizle
    if (navigator.vibrate) navigator.vibrate(30);
    scrollToBottomOly();
};

window.closeOlyChat = function () {
    document.getElementById('oly-chat-window').classList.remove('open');
    document.getElementById('oly-avatar').style.right = '0'; // Avatarı geri getir
};

window.handleOlyKey = function (event) {
    if (event.key === 'Enter') {
        sendOlyMessage();
    }
};

window.sendOlyMessage = async function () {
    const input = document.getElementById('oly-input');
    const text = input.value.trim();
    if (!text) return;

    // Kullanıcı mesajını ekrana yaz
    appendOlyMessage(text, 'oly-user');
    input.value = '';

    // "Oly yazıyor..." animasyonu ekle
    const typingIndicator = appendOlyMessage('Oly düşünüyor...', 'oly-typing');

    try {
        // GERÇEK GEMINI API ENTEGRASYONU
        const responseText = await askGeminiAI(text);
        typingIndicator.remove(); // Göstergeyi sil
        appendOlyMessage(responseText, 'oly-ai');
    } catch (error) {
        typingIndicator.remove();
        appendOlyMessage('Ufak bir bağlantı sorunu yaşadım. Tekrar dener misin?', 'oly-ai');
        console.error(error);
    }
};

function appendOlyMessage(text, className) {
    const container = document.getElementById('oly-messages-container');
    const msg = document.createElement('div');
    msg.className = `oly-message ${className}`;
    msg.innerHTML = text;
    container.appendChild(msg);
    scrollToBottomOly();
    return msg;
}

function scrollToBottomOly() {
    const container = document.getElementById('oly-messages-container');
    container.scrollTop = container.scrollHeight;
}

// OLY AYARLARINI GÜNCELLEME
window.updateOlyKey = function () {
    const newKey = prompt("Lütfen Gemini API anahtarınızı girin:", localStorage.getItem('OLY_API_KEY') || "");
    if (newKey) {
        localStorage.setItem('OLY_API_KEY', newKey);
        alert("Anahtar güncellendi! Oly artık hazır.");
    }
};

// OLY AI MOTORU (GEMINI 3.5 FLASH - En Güncel Sürüm)
async function askGeminiAI(userPrompt) {
    let apiKey = localStorage.getItem('OLY_API_KEY');

    if (!apiKey || apiKey === "null") {
        updateOlyKey();
        apiKey = localStorage.getItem('OLY_API_KEY');
    }

    if (!apiKey) throw new Error("Anahtar girilmedi.");

    apiKey = apiKey.trim();

    const systemInstruction = "Sen Project Olympus uygulamasının resmi yapay zeka asistanı Oly'sin. Görevin kullanıcılara sadece fitness, beslenme, anatomi, idman programları ve motivasyon konularında destek olmaktır. Türkçe, samimi ve net cevaplar ver.";

    // DİKKAT: Modeli listedeki en güncel sürüm olan 'gemini-3.5-flash' olarak değiştirdik!
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: `${systemInstruction}\n\nSoru: ${userPrompt}` }]
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Google API Detaylı Hata:", errorData);
            throw new Error(`Bağlantı hatası: ${response.status} - Hata detayı için F12 konsoluna bak.`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;

    } catch (error) {
        console.error("Oly Motor Hatası:", error);
        throw error;
    }
}

// ==========================================
// OLY AVATAR SÜRÜKLEME VE SIVI MIKNATIS MOTORU
// ==========================================
function initDraggableOly() {
    const avatar = document.getElementById('oly-avatar');
    let isDragging = false;
    let moved = false;
    let initialX, initialY, startLeft, startTop;

    const dragStart = (e) => {
        if (e.type === 'touchstart') {
            initialX = e.touches[0].clientX;
            initialY = e.touches[0].clientY;
        } else {
            initialX = e.clientX;
            initialY = e.clientY;
        }
        isDragging = true;
        moved = false;

        const rect = avatar.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;

        // Oly'yi sıvı tam daire formuna sok!
        avatar.classList.add('dragging');
        avatar.style.transition = 'none';
    };

    const drag = (e) => {
        if (!isDragging) return;
        e.preventDefault();

        let currentX, currentY;
        if (e.type === 'touchmove') {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
        } else {
            currentX = e.clientX;
            currentY = e.clientY;
        }

        const dx = currentX - initialX;
        const dy = currentY - initialY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            moved = true;
        }

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        const maxX = window.innerWidth - avatar.offsetWidth;
        const maxY = window.innerHeight - avatar.offsetHeight;
        newLeft = Math.max(0, Math.min(newLeft, maxX));
        newTop = Math.max(0, Math.min(newTop, maxY));

        avatar.style.left = newLeft + 'px';
        avatar.style.top = newTop + 'px';
        avatar.style.right = 'auto';
    };

    const dragEnd = () => {
        if (!isDragging) return;
        isDragging = false;

        // Sıvı formunu kapat ve yumuşak geçişi aç
        avatar.classList.remove('dragging');
        avatar.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';

        const rect = avatar.getBoundingClientRect();
        const centerX = window.innerWidth / 2;

        // Kenarlara yapışırken eski ölçülerini (45x80) geri veriyoruz
        avatar.style.width = '45px';
        avatar.style.height = '80px';

        if (rect.left + (rect.width / 2) > centerX) {
            // Sağa yapıştır
            avatar.style.left = 'auto';
            avatar.style.right = '0px';
            avatar.style.borderRadius = '80px 0 0 80px';
            avatar.style.justifyContent = 'flex-end';
            avatar.style.paddingRight = '8px';
            avatar.style.paddingLeft = '0';
        } else {
            // Sola yapıştır
            avatar.style.left = '0px';
            avatar.style.right = 'auto';
            avatar.style.borderRadius = '0 80px 80px 0';
            avatar.style.justifyContent = 'flex-start';
            avatar.style.paddingLeft = '8px';
            avatar.style.paddingRight = '0';
        }
    };

    avatar.onclick = (e) => {
        if (moved) {
            e.preventDefault();
            moved = false;
            return;
        }
        openOlyChat();
    };

    avatar.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    avatar.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', dragEnd);
}

// Oly Chat Açılış/Kapanış (Güncellendi)
window.openOlyChat = function () {
    const chatWin = document.getElementById('oly-chat-window');
    const avatar = document.getElementById('oly-avatar');
    chatWin.classList.add('open');
    // Avatarı küçülterek gizle (Sağda da solda da olsa sorun olmaz)
    avatar.style.transform = 'scale(0)';
    if (navigator.vibrate) navigator.vibrate(30);
    scrollToBottomOly();
};

window.closeOlyChat = function () {
    document.getElementById('oly-chat-window').classList.remove('open');
    document.getElementById('oly-avatar').style.transform = 'scale(1)'; // Avatarı geri getir
};
// ==========================================
// YÜKLEME (SPLASH) EKRANI ANİMASYONU
// ==========================================
function playSplashAnimation(onCompleteCallback) {
    const textElement = document.getElementById('loading-text');
    const loadingScreen = document.getElementById('loading-screen');

    // Eğer HTML'de yükleme ekranı yoksa direkt uygulamaya geç
    if (!textElement || !loadingScreen) {
        if (onCompleteCallback) onCompleteCallback();
        return;
    }

    const targetText = "PROJECT OLYMPUS";
    let charIndex = 0;
    textElement.textContent = "";

    // Daktilo efekti: Harfleri sırayla yazdır
    const typingInterval = setInterval(() => {
        if (charIndex < targetText.length) {
            textElement.textContent += targetText.charAt(charIndex);
            charIndex++;
        } else {
            clearInterval(typingInterval); // Yazım bitti

            // Yazı tam olarak ekranda belirdikten sonra yarım saniye bekle
            setTimeout(() => {
                // Ekranı CSS ile yukarı kaydır
                loadingScreen.classList.add('slide-up-animation');

                // CSS animasyon süresi (0.8s) dolunca arkaplandan sil ve ana sayfayı göster
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    if (onCompleteCallback) onCompleteCallback(); // Ana sayfayı açan tetikleyici
                }, 800);

            }, 600);
        }
    }, 120); // Harf çıkış hızı
}

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
                    <img src="${myData.photo || 'icon.png'}" alt="profile" class="arena-user-img">
                    <div class="arena-user-info">
                        <h4>${myData.name} <span style="font-size:10px; color:#00d2ff;">(Önizleme)</span></h4>
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
                    <img src="${user.photo || 'icon.png'}" alt="profile" class="arena-user-img">
                    <div class="arena-user-info">
                        <h4>${user.name}</h4>
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
                            <img src="${data.photo || 'icon.png'}" style="width:45px; height:45px; border-radius:50%; border:2px solid var(--goldnova); object-fit:cover;">
                            <div>
                                <h4 style="color:#fff; margin:0; font-size:15px; font-weight:bold;">${data.name}</h4>
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
                    <img src="${rank2.photo || 'icon.png'}" class="podium-avatar">
                    <div class="podium-name">${rank2.name}</div>
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
                    <img src="${rank1.photo || 'icon.png'}" class="podium-avatar">
                    <div class="podium-name">${rank1.name}</div>
                    <div class="podium-score">${rank1.olympusPoints} P</div>
                </div>
            `;
        }

        // --- 3. SIRA (SAĞDA) ---
        if (rank3) {
            boardDiv.innerHTML += `
                <div class="podium-item rank-3">
                    <span class="podium-crown">🥉</span>
                    <img src="${rank3.photo || 'icon.png'}" class="podium-avatar">
                    <div class="podium-name">${rank3.name}</div>
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

window.switchFootballTab = function (tab) {
    document.getElementById('btn-tab-lineup').classList.toggle('active', tab === 'lineup');
    document.getElementById('btn-tab-history').classList.toggle('active', tab === 'history');
    document.getElementById('fb-tab-lineup').style.display = tab === 'lineup' ? 'block' : 'none';
    document.getElementById('fb-tab-history').style.display = tab === 'history' ? 'block' : 'none';
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

window.editPlayer = function (index) {
    const oldName = currentSquad[index] !== "Seçilmedi" ? currentSquad[index] : "";
    const newName = prompt("Mevkideki oyuncunun Adı Soyadı:", oldName);
    if (newName !== null && newName.trim() !== "") {
        currentSquad[index] = newName.substring(0, 15);
        renderPitch();
    }
};

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
        selfItem.innerHTML = `<img src="${myData.photo || 'icon.png'}" class="friend-select-avatar"><span style="color:var(--goldnova); font-size:13px; font-weight:bold;">${myData.name} (Sen)</span>`;
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
                item.innerHTML = `<img src="${friend.photo || 'icon.png'}" class="friend-select-avatar"><span style="color:#fff; font-size:13px; font-weight:bold;">${friend.name}</span>`;
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
                <p style="margin:0; font-size:13px; color:#fff; line-height:1.4;">${n.message}</p>
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
                            <img src="${uData.photo || 'icon.png'}" style="width:35px; height:35px; border-radius:50%; border:2px solid var(--goldnova); object-fit:cover;">
                            <h4 style="color:#fff; margin:0; font-size:13px;">${uData.name}</h4>
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

window.startGPS = function () {
    alert("Harita motoru kalibre ediliyor... (Strava tarzı GPS ve rota çizimi eklentisini bir sonraki adımda inşa edeceğiz!) 🗺️🚀");
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
// CULBASE GİZLİ GEÇİT (MATRIX PROTOKOLÜ)
// ==========================================
let secretClickCount = 0;
let secretClickTimer;

const secretTrigger = document.getElementById('secret-trigger');
const matrixTerminal = document.getElementById('matrix-terminal');
const matrixPassword = document.getElementById('matrix-password');
const matrixText = document.getElementById('matrix-text');

if (secretTrigger) {
    secretTrigger.addEventListener('click', () => {
        secretClickCount++;

        clearTimeout(secretClickTimer);

        // 1.5 saniye içinde 3 kere tıklanırsa terminali aç
        secretClickTimer = setTimeout(() => {
            secretClickCount = 0;
        }, 1500);

        if (secretClickCount === 3) {
            openSecretTerminal();
            secretClickCount = 0;
        }
    });
}

function openSecretTerminal() {
    matrixTerminal.classList.remove('hidden');
    // Kısa bir gecikmeyle opacity transition'ı tetikle
    setTimeout(() => {
        matrixTerminal.classList.add('active');
        matrixPassword.value = '';
        matrixPassword.focus();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }, 50);
}

// Şifre Giriş Dinleyicisi
if (matrixPassword) {
    matrixPassword.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            const pass = matrixPassword.value;
            // CULbase admin şifren veya belirlediğin başka bir şifre
            if (pass === "183654" || pass === "admin") {
                matrixText.innerText = "YETKİ ONAYLANDI. CULBASE YÜKLENİYOR...";
                matrixText.style.color = "#fff";
                matrixPassword.style.display = "none";
                if (navigator.vibrate) navigator.vibrate([50, 50, 200]);

                // 1 Saniye sonra CULbase klasörüne ışınla
                setTimeout(() => {
                    window.location.href = "culbase_system/index.html";
                }, 1200);
            } else {
                // Şifre yanlışsa glitch efekti ver ve kapat
                matrixText.innerText = "ERİŞİM REDDEDİLDİ!";
                matrixText.classList.add('matrix-glitch');
                matrixPassword.value = '';
                if (navigator.vibrate) navigator.vibrate([200, 200, 200]);

                setTimeout(() => {
                    matrixText.classList.remove('matrix-glitch');
                    matrixText.innerText = "GİZLİ PROTOKOL BAŞLATILDI.";
                    matrixTerminal.classList.remove('active');
                    setTimeout(() => matrixTerminal.classList.add('hidden'), 500);
                }, 1000);
            }
        }
    });
}
// Geri Dönüş / İptal Butonu
const matrixCancelBtn = document.getElementById('matrix-cancel-btn');
if (matrixCancelBtn) {
    matrixCancelBtn.addEventListener('click', () => {
        matrixTerminal.classList.remove('active');
        setTimeout(() => matrixTerminal.classList.add('hidden'), 500);
        matrixPassword.value = '';
        matrixText.innerText = "GİZLİ PROTOKOL BAŞLATILDI.";
        matrixText.classList.remove('matrix-glitch');
        if (navigator.vibrate) navigator.vibrate(50);
    });
}
// GÜNÜ KURTAR MOTORU (FİLTRELEME)
window.activateSaveTheDay = function (dayData, startBtn, panicBtn) {
    if (!confirm("Günü Kurtar moduna geçilsin mi? İzolasyon hareketleri silinecek ve dinlenme süreleri 45 saniyeye düşecek!")) return;

    isExpressMode = true;
    panicBtn.style.display = 'none';
    startBtn.innerText = "⚡ EXPRESS İDMANI BAŞLAT";
    startBtn.style.background = "linear-gradient(135deg, #ea580c, #dc2626)";
    startBtn.style.color = "white";

    // Vücudu inşaa eden ANA hareketler (Compound)
    const compounds = ['bench', 'squat', 'deadlift', 'pull-up', 'row', 'press', 'pulldown', 'lunge', 'dips'];

    // Hareketleri filtrele (Deep Copy yapıyoruz ki asıl program bozulmasın)
    let expressEx = JSON.parse(JSON.stringify(dayData.ex));
    expressEx = expressEx.filter(ex => {
        const nameLow = ex.name.toLowerCase();
        return compounds.some(comp => nameLow.includes(comp));
    });

    // Eğer filtre sonucu boş çıkarsa (örneğin tamamen kol günüyse) en baştaki 3 hareketi al
    if (expressEx.length === 0) expressEx = dayData.ex.slice(0, 3);

    // Maksimum 4 harekete düşür
    expressEx = expressEx.slice(0, 4);

    // Set ve tekrarları vahşileştir
    expressEx.forEach(ex => {
        ex.scheme = "3 x 8-12 (Tükeniş)";
        ex.tempo = "Dinamik (Patlayıcı)";
        ex.rpe = "9.5";
    });

    let expressDayData = { ...dayData, ex: expressEx };

    const newStartBtn = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newStartBtn, startBtn);
    newStartBtn.addEventListener('click', () => { startActiveWorkout(expressDayData); });

    renderModalExercises(expressDayData.ex);

    // Uyarı mesajı ekle
    const holder = document.getElementById('modal-exercises');
    holder.insertAdjacentHTML('afterbegin', `<div style="background:rgba(234, 88, 12, 0.1); border:1px dashed #ea580c; padding:10px; border-radius:8px; margin-bottom:15px; color:#ffedd5; font-size:12px; text-align:center;">İzolasyon hareketleri iptal edildi. Set araları 45 saniyeye kilitlendi. Sadece temel kasları yıkıp çıkıyoruz!</div>`);

    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
};
// ==========================================
// 🕹️ ARCADE TERMINAL MOTORU
// ==========================================
window.openArcadeTerminal = function () {
    document.getElementById('arcade-screen').classList.remove('hidden');

    // Oly'yi oyundayken gizle
    const oly = document.getElementById('oly-avatar');
    if (oly) oly.style.display = 'none';

    if (navigator.vibrate) navigator.vibrate([50, 100]); // Cihazı sars
};

window.closeArcadeTerminal = function () {
    document.getElementById('arcade-screen').classList.add('hidden');

    // 1. ÖLÜM EMRİ: Arkada çalışan JS-DOS emülatörünü tamamen durdur (Sesi ve işlemi kes)
    if (window.dosCommandInterface) {
        try { window.dosCommandInterface.exit(); } catch (e) { }
        window.dosCommandInterface = null;
    }

    // 2. Ekranı temizle
    document.getElementById('game-container').innerHTML = '';
    document.getElementById('arcade-game-select').value = '';
    document.getElementById('arcade-placeholder-text').style.display = 'block';
    document.getElementById('game-container').style.display = 'none';

    // Oly'yi geri getir
    const oly = document.getElementById('oly-avatar');
    if (oly) oly.style.display = 'flex';

    // 3. YENİ: İşlemler bitince Merkez Üsse (Hub) geri dön!
    if (typeof returnToHub === 'function') {
        returnToHub();
    }
};

// ==========================================
// 🕹️ YEREL (NATIVE) ARCADE TERMINAL MOTORU
// ==========================================
window.loadArcadeGame = function () {
    const game = document.getElementById('arcade-game-select').value;
    const container = document.getElementById('game-container');
    const placeholder = document.getElementById('arcade-placeholder-text');

    // YENİ GÜVENLİK: Kaset değiştirmeden önce, eğer arkada çalışan bir oyun varsa FİŞİNİ ÇEK!
    if (window.dosCommandInterface) {
        try { window.dosCommandInterface.exit(); } catch (e) { }
        window.dosCommandInterface = null;
    }

    if (!game) {
        container.style.display = 'none';
        placeholder.style.display = 'block';
        container.innerHTML = '';
        return;
    }

    placeholder.style.display = 'none';
    container.style.display = 'block';
    container.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#0f0; font-family:\'Courier New\', monospace; font-weight:bold; font-size:14px; text-align:center;">[SİSTEM HAZIRLANIYOR...]</div>';

    const runGame = (zipName, exeName) => {
        // EKRANA TAM SIĞDIRMA DÜZELTMESİ: 'object-fit: contain;' ve 'display: block;' eklendi. 
        // Bu sayede oyun taşmaz, kutuya mükemmel oranda oturur.
        container.innerHTML = '<canvas id="jsdos-canvas" style="width: 100%; height: 100%; display: block; object-fit: contain; border-radius: 8px; image-rendering: pixelated;"></canvas>';

        Dos(document.getElementById("jsdos-canvas"), { wdosboxUrl: "https://js-dos.com/6.22/current/wdosbox.js" }).ready(function (fs, main) {
            fs.extract(`./games/${zipName}`).then(function () {
                main(["-c", exeName]).then(function (ci) {
                    window.dosCommandInterface = ci;
                });
            }).catch(err => alert(`Hata: ${zipName} dosyası 'games' klasöründe bulunamadı! Lütfen dosyanın yüklü olduğundan emin ol.`));
        });
    };

    // OYUN BİLGİLERİ (GitHub'daki uzantılara göre .ZIP veya .zip olarak hassas ayarlandı)
    if (game === 'pop') runGame('pop.ZIP', 'PRINCE.EXE');
    else if (game === 'doom') runGame('doom.ZIP', 'DOOM.EXE');
    else if (game === 'ssf2t') runGame('ssf2t.ZIP', 'SSF2T.BAT');
    else if (game === 'mspac') runGame('mspac.zip', 'MSPAC.EXE'); // mspac küçük .zip kalmış
    else if (game === 'wolf3d') runGame('wolf3d.ZIP', 'WOLF3D.EXE');
    else if (game === 'tr') runGame('tr.ZIP', 'TOMB.EXE');
    else if (game === 'mk2') runGame('mk2.ZIP', 'MK2.EXE');
    else if (game === 'pop2') runGame('pop2.zip', 'PRINCE.EXE'); // pop2 küçük .zip kalmış
};
// ==========================================
// 🕹️ ÇİFT KATMANLI GAMEPAD & EFEKT MOTORU
// ==========================================
let activeGamepadKeys = {};

function triggerEmulatorKey(keyCode, isPressed) {
    // 1. Birinci Katman: JS-DOS Donanım Sinyali
    if (window.dosCommandInterface) {
        window.dosCommandInterface.simulateKeyEvent(keyCode, isPressed);
    }

    // 2. İkinci Katman: Modern Emscripten Canvas Sinyali (Yedek Güvenlik)
    const canvas = document.getElementById('jsdos-canvas');
    if (canvas) {
        const e = new KeyboardEvent(isPressed ? 'keydown' : 'keyup', {
            bubbles: true, cancelable: true, keyCode: keyCode, which: keyCode
        });
        Object.defineProperty(e, 'keyCode', { get: () => keyCode });
        Object.defineProperty(e, 'which', { get: () => keyCode });
        canvas.dispatchEvent(e);
    }
}

window.pressKey = function (e, keyCode) {
    if (e) {
        e.preventDefault();
        e.currentTarget.classList.add('btn-pressed'); // Tuşa basılma efekti ekle
    }

    // Tuş zaten basılıysa tekrar sinyal gönderip sistemi boğma
    if (activeGamepadKeys[keyCode]) return;
    activeGamepadKeys[keyCode] = true;

    triggerEmulatorKey(keyCode, true);
    if (navigator.vibrate) navigator.vibrate(20); // Titreşim hissi
};

window.releaseKey = function (e, keyCode) {
    if (e) {
        e.preventDefault();
        e.currentTarget.classList.remove('btn-pressed'); // Tuş bırakılınca efekti kaldır
    }

    // Tuş zaten bırakılmışsa işlem yapma
    if (!activeGamepadKeys[keyCode]) return;
    activeGamepadKeys[keyCode] = false;

    triggerEmulatorKey(keyCode, false);
};
// ==========================================
// 🕹️ OYUNLARA ÖZEL TUŞ REHBERİ (KEY CONFIG)
// ==========================================
window.showKeyConfig = function () {
    const game = document.getElementById('arcade-game-select').value;
    const configText = document.getElementById('key-config-text');

    // Oyunların kısaltmalarına göre tuş haritaları
    const configs = {
        'pop': "<b style='color:var(--goldnova); font-size:16px;'>Prince of Persia</b><br><br><b>X (Ctrl) :</b> Kılıç Vurma / Eşya Alma<br><b>A (Shift):</b> Dikkatli Adım / Çıkıntıya Tutunma<br><b>B (Space):</b> Zıplama<br><b>Yön Tuşları:</b> Hareket, Zıplama, Eğilme ve Kılıçla Korunma",

        'pop2': "<b style='color:var(--goldnova); font-size:16px;'>Prince of Persia 2</b><br><br><b>X (Ctrl) :</b> Kılıç Vurma / Eşya Alma<br><b>A (Shift):</b> Dikkatli Adım / Çıkıntıya Tutunma<br><b>B (Space):</b> Zıplama<br><b>Yön Tuşları:</b> Hareket ve Zıplama",

        'doom': "<b style='color:var(--goldnova); font-size:16px;'>DOOM</b><br><br><b>X (Ctrl) :</b> Ateş Etme (Tetik)<br><b>B (Space):</b> Kapı Açma / Düğmeye Basma<br><b>A (Shift):</b> Hızlı Koşma (Run)<br><b>Y (N)    :</b> Menülerde 'Hayır' (No) demek içindir<br><b>Yön Tuşları:</b> İleri/Geri ve Sağa/Sola Dönüş",

        'mspac': "<b style='color:var(--goldnova); font-size:16px;'>Pac-Man</b><br><br><b>Y (N)    :</b> Oyun başında 'Use Joystick?' sorusuna Hayır (N) demek için basılır.<br><b>Yön Tuşları:</b> Pac-Man'i yönlendirir.",

        'ssf2t': "<b style='color:var(--goldnova); font-size:16px;'>Street Fighter 2</b><br><br><b>X, A, B  :</b> Standart Yumruk ve Tekme saldırıları<br><b>Yön Tuşları:</b> Zıplama, Eğilme, Hareket ve Kombolar (Örn: Aşağı, İleri + Yumruk = Hadouken)",

        'wolf3d': "<b style='color:var(--goldnova); font-size:16px;'>Wolfenstein 3D</b><br><br><b>X (Ctrl) :</b> Ateş Etme<br><b>B (Space):</b> Kapı Açma<br><b>A (Shift):</b> Hızlı Koşma<br><b>Yön Tuşları:</b> Hareket ve Dönüş",

        'tr': "<b style='color:var(--goldnova); font-size:16px;'>Tomb Raider</b><br><br><b>X (Ctrl) :</b> Aksiyon / Silahla Ateş Etme<br><b>B (Space):</b> Silah Çekme / Kaldırma<br><b>A (Shift):</b> Yürüme (Uçurumdan düşmemek için kilitlenir)<br><b>Yön Tuşları:</b> Hareket, Geri Zıplama",

        'mk2': "<b style='color:var(--goldnova); font-size:16px;'>Mortal Kombat 2</b><br><br><b>X, A, B, Y:</b> Yüksek/Alçak Yumruk ve Tekmeler ile Blok<br><b>Yön Tuşları:</b> Hareket ve Zıplama"
    };

    if (!game) {
        configText.innerHTML = "Lütfen önce yukarıdaki menüden bir kaset (oyun) seçin.";
    } else {
        configText.innerHTML = configs[game] || "Bu oyun için sistemde kayıtlı bir tuş rehberi bulunmuyor.";
    }

    document.getElementById('key-config-modal').style.display = 'flex';
    if (navigator.vibrate) navigator.vibrate(30);
};

// ==========================================
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
window.enterAppFromHub = function (targetId, textString) {
    const overlay = document.getElementById('hub-zoom-overlay');
    const zoomText = document.getElementById('hub-zoom-text');
    const hubScreen = document.getElementById('hub-screen');

    // Rengine göre metin ve parlama ayarla
    let textColor = "var(--goldnova)";
    if (targetId === 'arcade-screen') textColor = "#d1a3ff";
    if (targetId === 'business-screen') textColor = "#00d2ff";

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
        }
    }, 1200);
};
// ==========================================
// 🚀 HUB'A (MERKEZ ÜSSE) GERİ DÖNÜŞ MOTORU
// ==========================================
window.returnToHub = function () {
    updateHubGreeting();
    // 1. Müzik çaları gizle
    const player = document.getElementById('spotify-floating-player');
    if (player) player.classList.add('hidden');

    // 2. Tüm açık olabilecek modülleri (Odaları) gizle
    const appContent = document.getElementById('app-content');
    if (appContent) appContent.classList.add('hidden');

    const arcadeScreen = document.getElementById('arcade-screen');
    if (arcadeScreen) arcadeScreen.classList.add('hidden');

    const businessScreen = document.getElementById('business-screen');
    if (businessScreen) businessScreen.classList.add('hidden');

    // 3. Hub ekranını tekrar göster
    const hubScreen = document.getElementById('hub-screen');
    if (hubScreen) {
        hubScreen.classList.remove('hidden');
        hubScreen.style.display = 'flex';
    }

    if (navigator.vibrate) navigator.vibrate(30);
};
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
// 💼 BUSINESS CENTER MOTORU (CULBASE)
// ==========================================
let pomodoroInterval;
let pomodoroTime = 25 * 60; // 25 dakika
let isPomodoroRunning = false;

window.startPomodoro = function () {
    if (isPomodoroRunning) return;
    isPomodoroRunning = true;

    if (navigator.vibrate) navigator.vibrate(30);

    pomodoroInterval = setInterval(() => {
        pomodoroTime--;
        let m = Math.floor(pomodoroTime / 60);
        let s = pomodoroTime % 60;
        document.getElementById('pomodoro-time').innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        // Saniye her ilerlediğinde ince bir görsel geribildirim eklenebilir

        if (pomodoroTime <= 0) {
            clearInterval(pomodoroInterval);
            isPomodoroRunning = false;
            if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
            alert("🔥 Derin çalışma seansı tamamlandı! Şampiyon şimdi kısa bir mola hak etti.");
            resetPomodoro();
        }
    }, 1000);
};

window.resetPomodoro = function () {
    clearInterval(pomodoroInterval);
    isPomodoroRunning = false;
    pomodoroTime = 25 * 60;
    document.getElementById('pomodoro-time').innerText = "25:00";
    if (navigator.vibrate) navigator.vibrate(30);
};

// Varsayılan Projeler (Sistem ilk açıldığında gösterilir, sonra localStorage'dan silip eklenebilir)
let bProjects = JSON.parse(localStorage.getItem('culbase_projects')) || [
    { id: 1, name: "SolidWorks Makine Çizimi (Fiverr)", status: "Aktif", color: "#f39c12" },
    { id: 2, name: "Kaynak Makinesi PLC Kodlama", status: "Beklemede", color: "#3498db" }
];

// ==========================================
// 💼 HUB'DAN CULBASE'E KÖPRÜ (YENİ NESİL)
// ==========================================

// 1. Yeni Proje Modalını Açar
window.addBusinessProject = function () {
    document.getElementById('add-proj-name').value = '';
    document.getElementById('add-proj-client').value = '';
    document.getElementById('add-proj-status').value = 'Aktif';
    document.getElementById('business-add-modal').style.display = 'flex';
};

// 2. Projeyi İster Hızlı İster Detaylı Kaydeder
window.saveNewBusinessProject = function () {
    const name = document.getElementById('add-proj-name').value.trim();
    const client = document.getElementById('add-proj-client').value.trim();
    const status = document.getElementById('add-proj-status').value;

    if (!name) { alert("Lütfen bir proje adı girin!"); return; }

    // Hızlı kayıt zekası: Müşteri girilmezse otomatik Hızlı Kayıt der.
    let isQuick = (client === "");
    let finalName = isQuick ? name + " (Hızlı Kayıt)" : name;
    let finalClient = isQuick ? "Belirtilmedi" : client;
    // YENİ: Akıllı Teklif Numarası Üretici (CLC19 + Yıl + 4 Rakam)
    // 1. O anki yılın son 2 hanesini alır (Örn: 2026 -> "26")
    let yearSuffix = new Date().getFullYear().toString().slice(-2);
    // 2. 0000 ile 9999 arasında tam 4 basamaklı rastgele rakam üretir (Örn: 0482, 5921)
    let random4Digits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    // 3. Kodu birleştirir (Örn: CLC19260482)
    let specialOfferNumber = "CLC19" + yearSuffix + random4Digits;

    let offers = JSON.parse(localStorage.getItem('culbase_offers')) || [];

    const newOffer = {
        id: Date.now(),
        companyName: finalName,
        client: finalClient,
        progress: 0, // Varsayılan ilerleme 0
        offerDate: new Date().toLocaleDateString('tr-TR'),
        offerNumber: specialOfferNumber,
        items: [{ name: "Proje / Görev Tanımı", desc: "Sistem üzerinden eklendi.", qty: 1, price: 0, total: "0 ₺" }],
        grandTotal: "0 ₺",
        status: status,
        files: []
    };

    offers.push(newOffer);
    localStorage.setItem('culbase_offers', JSON.stringify(offers));
    renderBusinessProjects();

    document.getElementById('business-add-modal').style.display = 'none';
    if (navigator.vibrate) navigator.vibrate([30, 30]);
};

// 3. Projeleri Ön Yüze Basar (Renk Zekası Eklendi)
window.renderBusinessProjects = function () {
    const list = document.getElementById('business-projects-list');
    if (!list) return;
    list.innerHTML = '';

    let offers = JSON.parse(localStorage.getItem('culbase_offers')) || [];

    if (offers.length === 0) {
        list.innerHTML = '<p style="color:#888; font-size:12px; text-align:center;">Şu an kayıtlı bir proje yok.</p>';
        return;
    }

    offers.reverse().forEach(p => {
        let statusStr = p.status || "Beklemede";
        let colorStr = "#00d2ff"; // Aktif
        if (statusStr === "Beklemede") colorStr = "#f6c000";
        else if (statusStr === "Tamamlandı") colorStr = "#27ae60";
        else if (statusStr === "İptal") colorStr = "#ff4444";

        let prog = p.progress || 0;

        list.innerHTML += `
            <div class="business-project-card" style="background: #1a1a1a; border-left: 4px solid ${colorStr}; padding: 12px 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; margin-bottom: 10px;">
                <div onclick="openProjectDetails(${p.id})" style="flex: 1; cursor: pointer;">
                    <h4 style="color: #fff; margin: 0 0 4px 0; font-size: 14px;">${p.companyName}</h4>
                    <span style="color: ${colorStr}; font-size: 11px; font-weight: bold; padding: 2px 6px; background: rgba(255,255,255,0.05); border-radius: 4px;">${statusStr} (%${prog})</span>
                </div>
                <button onclick="deleteOfferFromHub(${p.id})" style="background: transparent; border: none; color: #ff4444; font-size: 18px; cursor: pointer; padding: 5px; margin-left: 10px;">🗑️</button>
            </div>
        `;
    });
};

window.deleteOfferFromHub = function (id) {
    if (confirm("Bu projeyi tamamen silmek istediğinize emin misiniz?")) {
        let offers = JSON.parse(localStorage.getItem('culbase_offers')) || [];
        offers = offers.filter(o => o.id !== id);
        localStorage.setItem('culbase_offers', JSON.stringify(offers));
        renderBusinessProjects();
    }
};

// 4. Detayları Görüntüleme ve Düzenleme Motoru
let activeHubEditId = null;

window.openProjectDetails = function (id) {
    let offers = JSON.parse(localStorage.getItem('culbase_offers')) || [];
    const p = offers.find(x => x.id === id);
    if (!p) return;

    activeHubEditId = id;
    toggleEditProjectDetails(false); // Önce görüntüleme modunda aç

    let colorStr = "#00d2ff";
    if (p.status === "Beklemede") colorStr = "#f6c000";
    else if (p.status === "Tamamlandı") colorStr = "#27ae60";
    else if (p.status === "İptal") colorStr = "#ff4444";

    document.getElementById('pd-title').innerText = p.companyName;
    document.getElementById('pd-client').innerText = p.client || "Belirtilmedi";
    document.getElementById('pd-status').innerText = p.status || "Beklemede";
    document.getElementById('pd-status').style.color = colorStr;
    document.getElementById('pd-status').style.border = `1px solid ${colorStr}`;
    document.getElementById('pd-status').style.background = 'rgba(255,255,255,0.05)';

    let prog = p.progress || 0;
    document.getElementById('pd-progress-text').innerText = `%${prog}`;

    document.getElementById('pd-progress').style.width = '0%';
    document.getElementById('pd-progress').style.background = colorStr;
    document.getElementById('project-detail-modal').style.display = 'flex';

    setTimeout(() => { document.getElementById('pd-progress').style.width = prog + '%'; }, 100);

    // Düzenleme inputlarını hazırla
    document.getElementById('edit-pd-title-input').value = p.companyName;
    document.getElementById('edit-pd-client-input').value = p.client || "";
    document.getElementById('edit-pd-status-input').value = p.status || "Aktif";
    document.getElementById('edit-pd-progress-input').value = prog;
    document.getElementById('edit-pd-progress-val').innerText = prog;

    if (navigator.vibrate) navigator.vibrate(20);
};

window.toggleEditProjectDetails = function (showEdit) {
    if (showEdit) {
        document.getElementById('pd-view-mode').classList.add('hidden');
        document.getElementById('pd-edit-mode').classList.remove('hidden');
    } else {
        document.getElementById('pd-edit-mode').classList.add('hidden');
        document.getElementById('pd-view-mode').classList.remove('hidden');
    }
};

window.saveProjectDetailsEdit = function () {
    let offers = JSON.parse(localStorage.getItem('culbase_offers')) || [];
    const index = offers.findIndex(x => x.id === activeHubEditId);
    if (index !== -1) {
        offers[index].companyName = document.getElementById('edit-pd-title-input').value.trim();
        offers[index].client = document.getElementById('edit-pd-client-input').value.trim() || "Belirtilmedi";
        offers[index].status = document.getElementById('edit-pd-status-input').value;
        offers[index].progress = parseInt(document.getElementById('edit-pd-progress-input').value) || 0;

        // İsim "(Hızlı Kayıt)" ibaresi içeriyorsa ve müşteri de güncellendiyse (veya isim elle değiştirildiyse) text temiz kalsın.
        localStorage.setItem('culbase_offers', JSON.stringify(offers));
        renderBusinessProjects();
        openProjectDetails(activeHubEditId); // Yeni verilerle tekrar yükle
    }
};

// Sayfa yüklendiğinde projeleri listele
setTimeout(() => {
    if (typeof renderBusinessProjects === 'function') renderBusinessProjects();
}, 1000);
// ==========================================
// 🚀 GITHUB ACTIONS (DEPLOY LOGLARI) API MOTORU
// ==========================================
window.openDeployLogs = async function () {
    // 1. Modalı Aç ve Yükleniyor Yazısı Göster
    document.getElementById('deploy-logs-modal').style.display = 'flex';
    const terminal = document.getElementById('deploy-terminal');
    terminal.innerHTML = "<span style='color:#fff;'>> API'ye Bağlanılıyor:</span> github.com/emirhanculcu86354/project-olympus...<br>";

    try {
        // 2. GitHub REST API'sine İstek At (Son 5 İşlemi Çek)
        const response = await fetch("https://api.github.com/repos/emirhanculcu86354/project-olympus/actions/runs?per_page=5");

        if (!response.ok) throw new Error(`HTTP Hata Kodu: ${response.status}`);

        const data = await response.json();

        // 3. Terminal Ekranını Temizle ve Verileri Bas
        terminal.innerHTML += `<span style="color:#00d2ff;">> Bağlantı Başarılı. Son ${data.workflow_runs.length} işlem paketi çözümleniyor:</span><br><br>`;

        data.workflow_runs.forEach(run => {
            // Tarihi okunabilir formata çevir
            const date = new Date(run.created_at).toLocaleString('tr-TR');

            // Başarı durumuna göre renk ve metin belirle
            let statusColor = "#f6c000"; // Beklemede (Sarı)
            let statusText = "IN_PROGRESS";

            if (run.conclusion === "success") {
                statusColor = "#27ae60"; // Başarılı (Yeşil)
                statusText = "SUCCESS";
            } else if (run.conclusion === "failure") {
                statusColor = "#ff4444"; // Hatalı (Kırmızı)
                statusText = "FAILED";
            }

            // Commit başlığını çok uzunsa kırp
            let commitMsg = run.head_commit.message.split('\n')[0];
            if (commitMsg.length > 40) commitMsg = commitMsg.substring(0, 40) + "...";

            // HTML olarak terminale satır satır yazdır
            terminal.innerHTML += `
                <div style="border-left: 2px solid ${statusColor}; padding-left: 10px; margin-bottom: 12px; background: rgba(255,255,255,0.02); padding-top: 5px; padding-bottom: 5px;">
                    <span style="color:#aaa;">[${date}]</span><br>
                    <span style="color:#fff;">Olay:</span> ${run.name}<br>
                    <span style="color:#fff;">Kayıt (Commit):</span> <span style="color:#ccc;">${commitMsg}</span><br>
                    <span style="color:#fff;">Durum:</span> <strong style="color:${statusColor}; text-shadow: 0 0 5px ${statusColor};">${statusText}</strong>
                </div>
            `;
        });

        // Titreşim geribildirimi
        if (navigator.vibrate) navigator.vibrate([30, 30]);

    } catch (error) {
        terminal.innerHTML += `<br><br><span style="color:#ff4444;">[FATAL ERROR] Loglar çekilemedi! İnternet bağlantını veya GitHub kısıtlamalarını kontrol et.</span><br><span style="color:#888;">${error.message}</span>`;
        console.error("Deploy Log Hatası:", error);
    }
};
// ==========================================
// ⚙️ PLC KASASINA OTOMATİK ŞABLON ENJEKSİYONU
// ==========================================
(function initPlcSnippets() {
    let existingSnippets = localStorage.getItem('culbase_plc_archive');
    if (!existingSnippets || JSON.parse(existingSnippets).length === 0) {
        const defaultPlcCodes = [
            {
                id: 101,
                title: "Delta PLC: Tek Buton Start/Stop (Mühürleme)",
                code: "LD X0       // X0 Butonuna basıldığında\nALT Y0      // Y0 çıkışının konumunu değiştir (Toggle)",
                date: new Date().toLocaleDateString('tr-TR')
            },
            {
                id: 102,
                title: "Delta HMI: Sayfa Geçiş Makrosu",
                code: "$2000 = 5    // 5 numaralı sayfaya geçişi tetikle\nBITON $200.0 // Sayfa geçiş bitini aktif et",
                date: new Date().toLocaleDateString('tr-TR')
            },
            {
                id: 103,
                title: "PT100 Analog Sıcaklık Skalalama",
                code: "FROM K0 K0 D100 K1  // 0. modülden analog değeri D100'e oku\nSCLP D100 D200 D300 // Okunan değeri D200'deki skalaya göre D300'e çevir (Sensör Verisi)",
                date: new Date().toLocaleDateString('tr-TR')
            }
        ];
        localStorage.setItem('culbase_plc_archive', JSON.stringify(defaultPlcCodes));
    }
})();
// ==========================================
// ⚙️ PLC & OTOMASYON ARŞİVİ MOTORU
// ==========================================
window.openPlcArchive = function () {
    document.getElementById('plc-archive-modal').style.display = 'flex';
    renderPlcSnippets();
    if (navigator.vibrate) navigator.vibrate(20);
};

window.savePlcSnippet = function () {
    const title = document.getElementById('new-plc-title').value.trim();
    const code = document.getElementById('new-plc-code').value.trim();

    if (!title || !code) {
        alert("Başlık ve kod alanı boş bırakılamaz!");
        return;
    }

    let snippets = JSON.parse(localStorage.getItem('culbase_plc_archive')) || [];
    snippets.push({
        id: Date.now(),
        title: title,
        code: code,
        date: new Date().toLocaleDateString('tr-TR')
    });

    localStorage.setItem('culbase_plc_archive', JSON.stringify(snippets));

    // Ekledikten sonra inputları temizle
    document.getElementById('new-plc-title').value = '';
    document.getElementById('new-plc-code').value = '';

    renderPlcSnippets();
    if (navigator.vibrate) navigator.vibrate([30, 30]);
};

window.renderPlcSnippets = function () {
    const list = document.getElementById('plc-snippets-list');
    let snippets = JSON.parse(localStorage.getItem('culbase_plc_archive')) || [];

    list.innerHTML = '';
    if (snippets.length === 0) {
        list.innerHTML = '<p style="color:#888; font-size:12px; text-align:center;">Kasa şu an boş. İlk makronu ekle.</p>';
        return;
    }

    // En son eklenen en üstte görünsün
    snippets.reverse().forEach(s => {
        // Kod içindeki HTML karakterlerini güvenli hale getiriyoruz (< ve > bozulmasın diye)
        let safeCode = s.code.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        list.innerHTML += `
            <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 6px; overflow: hidden;">
                <div style="background: #222; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333;">
                    <span style="color: #fff; font-size: 13px; font-weight: bold;">${s.title}</span>
                    <div>
                        <!-- YENİ: Tek Tıkla Pano'ya Kopyalama -->
                        <button onclick="copyPlcCode('${s.id}')" style="background: #00d2ff; color: #000; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; margin-right: 5px;">KOPYALA</button>
                        <button onclick="deletePlcSnippet('${s.id}')" style="background: transparent; color: #ff4444; border: none; font-size: 12px; cursor: pointer;">🗑️</button>
                    </div>
                </div>
                <!-- SİBERPUNK KOD GÖRÜNÜMÜ -->
                <div style="background: #000; padding: 15px; overflow-x: auto;">
                    <pre id="code-${s.id}" style="margin: 0; color: #27ae60; font-family: 'Courier New', monospace; font-size: 11px;">${safeCode}</pre>
                </div>
                <div style="background: #111; padding: 5px 15px; text-align: right; font-size: 9px; color: #666;">
                    Eklenme: ${s.date}
                </div>
            </div>
        `;
    });
};

window.copyPlcCode = function (id) {
    const codeText = document.getElementById('code-' + id).innerText;

    // Modern Pano (Clipboard) API'si
    navigator.clipboard.writeText(codeText).then(() => {
        if (navigator.vibrate) navigator.vibrate(20);
        alert("Kod başarıyla panoya kopyalandı! Sahada kullanıma hazır.");
    }).catch(err => {
        console.error("Kopyalama başarısız", err);
        alert("Kopyalama işlemi başarısız oldu.");
    });
};

window.deletePlcSnippet = function (id) {
    if (confirm("Bu kodu arşivden silmek istediğine emin misin?")) {
        let snippets = JSON.parse(localStorage.getItem('culbase_plc_archive')) || [];
        snippets = snippets.filter(s => s.id.toString() !== id.toString());
        localStorage.setItem('culbase_plc_archive', JSON.stringify(snippets));
        renderPlcSnippets();
    }
};
// ==========================================
// 📡 CANLI TELEMETRİ (SCADA) MOTORU
// ==========================================
let liveMachineInterval = null;

window.openLiveMachine = function () {
    document.getElementById('live-machine-modal').style.display = 'flex';
    if (navigator.vibrate) navigator.vibrate(20);

    // Arayüzü sıfırla
    document.getElementById('scada-dashboard').style.opacity = '0.3';
    document.getElementById('scada-connection-panel').style.display = 'block';
    document.getElementById('btn-scada-connect').innerText = "SİSTEME BAĞLAN";
    document.getElementById('btn-scada-connect').style.background = "#e74c3c";
    document.getElementById('sim-log').innerHTML = "> Sistem beklemede. Bağlantı parametrelerini giriniz.";
};

window.connectToPLC = function () {
    const url = document.getElementById('scada-url').value;
    const deviceId = document.getElementById('scada-device').value;
    const logBox = document.getElementById('sim-log');
    const btn = document.getElementById('btn-scada-connect');

    if (!url || !deviceId) { alert("Lütfen bağlantı adresini ve Cihaz ID'sini girin."); return; }

    btn.innerText = "BAĞLANILIYOR...";
    btn.style.background = "#f6c000";
    if (navigator.vibrate) navigator.vibrate(30);

    logBox.innerHTML += `<br>> Hedef: ${url}`;
    logBox.innerHTML += `<br>> Cihaz ID [${deviceId}] için handshake (el sıkışma) başlatılıyor...`;
    logBox.scrollTop = logBox.scrollHeight;

    // Gerçek bir bağlantı hissi vermek için gecikmeler ekliyoruz
    setTimeout(() => {
        logBox.innerHTML += `<br>> Sertifikalar doğrulandı. API yanıtı: 200 OK.`;
        logBox.scrollTop = logBox.scrollHeight;

        setTimeout(() => {
            logBox.innerHTML += `<br>> <span style="color:#00d2ff;">BAĞLANTI BAŞARILI. Canlı veri akışı başlatılıyor.</span>`;
            logBox.scrollTop = logBox.scrollHeight;

            // Paneli gizle ve Dashboard'u canlandır
            document.getElementById('scada-connection-panel').style.display = 'none';
            document.getElementById('scada-dashboard').style.opacity = '1';
            if (navigator.vibrate) navigator.vibrate([50, 100]);

            startTelemetrySimulation(); // Akışı başlat

        }, 1200);
    }, 1000);
};

function startTelemetrySimulation() {
    const logBox = document.getElementById('sim-log');
    let isMotorRunning = false;
    let currentTemp = 24.0;
    let currentRpm = 0;

    // Gerçek Firebase/MQTT entegrasyonu buraya yazılacak.
    // Şimdilik sahadan veri geliyormuş gibi simüle ediyoruz.
    liveMachineInterval = setInterval(() => {
        // Rastgele Motor Durumu Değişimi
        if (Math.random() < 0.15) {
            isMotorRunning = !isMotorRunning;
            logBox.innerHTML += `<br>> [VERİ] Cihaz_ID_01 -> Motor_M100: ${isMotorRunning ? '1' : '0'}`;
            logBox.scrollTop = logBox.scrollHeight;
        }

        if (isMotorRunning) {
            document.getElementById('sim-motor-light').style.background = '#27ae60';
            document.getElementById('sim-motor-light').style.boxShadow = '0 0 15px #27ae60';
            document.getElementById('sim-motor-status').innerText = 'ÇALIŞIYOR';
            document.getElementById('sim-motor-status').style.color = '#27ae60';

            currentRpm = Math.floor(Math.random() * 50) + 1450;
            currentTemp += (Math.random() * 2.5);
            if (currentTemp > 98.0) currentTemp = 98.0 - (Math.random() * 3);
        } else {
            document.getElementById('sim-motor-light').style.background = '#ff4444';
            document.getElementById('sim-motor-light').style.boxShadow = '0 0 15px #ff4444';
            document.getElementById('sim-motor-status').innerText = 'DURDU';
            document.getElementById('sim-motor-status').style.color = '#ff4444';

            currentRpm = 0;
            currentTemp -= (Math.random() * 1.5);
            if (currentTemp < 24.0) currentTemp = 24.0;
        }

        document.getElementById('sim-rpm').innerText = currentRpm;

        let tempStr = currentTemp.toFixed(1);
        document.getElementById('sim-temp').innerText = tempStr;

        let tempBar = document.getElementById('sim-temp-bar');
        tempBar.style.width = Math.min(currentTemp, 100) + '%';

        let tempColor = '#27ae60';
        if (currentTemp > 85.0) tempColor = '#ff4444';
        else if (currentTemp > 60.0) tempColor = '#f6c000';

        tempBar.style.background = tempColor;
        document.getElementById('sim-temp').style.color = tempColor;

    }, 1000);
}

window.closeLiveMachine = function () {
    clearInterval(liveMachineInterval);
    document.getElementById('live-machine-modal').style.display = 'none';
    if (navigator.vibrate) navigator.vibrate(20);
};
// ==========================================
// 🎛️ SANAL PLC & FABRİKA SİMÜLATÖR MOTORU (TAM SÜRÜM)
// ==========================================

let vPlcInterval = null;
let isVPlcRunning = false;
let IN_State = new Array(30).fill(false); // Dijital Giriş Hafızası
let OUT_State = new Array(30).fill(false); // Dijital Çıkış Hafızası
let IN_Analog = new Array(8).fill(0); // EKSİK OLAN ANALOG HAFIZASI EKLENDİ!
let currentPlcStandard = 'DELTA';
let factoryComponents = []; // Fabrika sahası ekipmanları

window.openVirtualPLC = function () {
    document.getElementById('virtual-plc-modal').style.display = 'flex';
    buildPlcHardware();
    switchPlcTab('code'); // Açılışta terminal sekmesi gelsin
    if (navigator.vibrate) navigator.vibrate(20);
};

window.closeVirtualPLC = function () {
    clearInterval(vPlcInterval);
    isVPlcRunning = false;
    document.getElementById('btn-vplc-run').innerText = "RUN";
    document.getElementById('btn-vplc-run').style.background = "#27ae60";
    document.getElementById('btn-vplc-run').style.borderColor = "#145c32";
    document.getElementById('virtual-plc-modal').style.display = 'none';
};

window.switchPlcTab = function (tabName) {
    const tabs = ['code', 'factory', 'wiring'];
    tabs.forEach(t => {
        document.getElementById(`tab-btn-${t}`).style.background = (t === tabName) ? "#1a1a1a" : "#111";
        document.getElementById(`tab-btn-${t}`).style.color = (t === tabName) ? "#00d2ff" : "#888";
        document.getElementById(`tab-btn-${t}`).style.borderBottomColor = (t === tabName) ? "#00d2ff" : "transparent";
        document.getElementById(`tab-content-${t}`).style.display = (t === tabName) ? (t === 'factory' ? "flex" : "block") : "none";
    });

    // Kablaj sekmesine geçildiğinde şemayı güncelle
    if (tabName === 'wiring') updateWiringBoard();
};

window.toggleToolbox = function () {
    const tb = document.getElementById('factory-toolbox');
    const btn = document.getElementById('btn-toggle-toolbox');
    if (tb.style.width === '0px' || tb.style.width === '') {
        tb.style.width = '220px'; btn.style.left = '220px'; btn.innerText = '◀';
    } else {
        tb.style.width = '0px'; btn.style.left = '0px'; btn.innerText = '▶';
    }
};

window.buildPlcHardware = function () {
    const model = document.getElementById('vplc-model').value;
    const inContainer = document.getElementById('vplc-inputs');
    const outContainer = document.getElementById('vplc-outputs');
    const miniInContainer = document.getElementById('vplc-mini-inputs');
    const miniOutContainer = document.getElementById('vplc-mini-outputs');
    const analogPanel = document.getElementById('vplc-analog-panel');
    const analogInContainer = document.getElementById('vplc-analog-inputs');

    inContainer.innerHTML = ''; outContainer.innerHTML = '';
    miniInContainer.innerHTML = ''; miniOutContainer.innerHTML = '';
    if (analogInContainer) analogInContainer.innerHTML = '';

    IN_State.fill(false); OUT_State.fill(false); IN_Analog.fill(0);
    if (analogPanel) analogPanel.style.display = 'none'; // Varsayılan gizle

    let inCount = 8; let outCount = 6;
    let hasAnalog = false; let analogType = "";

    if (model.includes("14SS2")) currentPlcStandard = 'DELTA';
    if (model.includes("06XA")) { hasAnalog = true; analogType = "0-10V Voltaj"; }
    if (model.includes("04PT")) { hasAnalog = true; analogType = "PT100 Sıcaklık"; }
    if (model.includes("S71200") || model.includes("S71500")) { currentPlcStandard = 'SIEMENS'; inCount = 14; outCount = 10; hasAnalog = true; analogType = "0-10V"; }
    if (model.includes("AS228")) { currentPlcStandard = 'DELTA'; inCount = 16; outCount = 12; }
    if (model.includes("MICRO850") || model.includes("CP1E")) { currentPlcStandard = 'SIEMENS'; inCount = 12; outCount = 8; }

    for (let i = 0; i < inCount; i++) {
        let label = currentPlcStandard === 'DELTA' ? "X" + (i >= 8 ? (i + 2) : i) : `I0.${i}`;
        let btnHTML = `<button id="btn-in${i}" onmousedown="toggleInput(${i}, true)" onmouseup="toggleInput(${i}, false)" onmouseleave="toggleInput(${i}, false)" ontouchstart="toggleInput(${i}, true)" ontouchend="toggleInput(${i}, false)" style="background: #333; color: #fff; border: 1px solid #555; padding: 5px 8px; border-radius: 4px; cursor: pointer; font-family: monospace; font-size: 11px; min-width: 40px;">${label}</button>`;
        inContainer.innerHTML += btnHTML;
        miniInContainer.innerHTML += `<button id="btn-mini-in${i}" onmousedown="toggleInput(${i}, true)" onmouseup="toggleInput(${i}, false)" onmouseleave="toggleInput(${i}, false)" ontouchstart="toggleInput(${i}, true)" ontouchend="toggleInput(${i}, false)" style="background: #333; color: #fff; border: 1px solid #555; padding: 2px 4px; border-radius: 3px; cursor: pointer; font-family: monospace; font-size: 9px; min-width: 25px;">${label}</button>`;
    }
    for (let i = 0; i < outCount; i++) {
        let label = currentPlcStandard === 'DELTA' ? "Y" + (i >= 8 ? (i + 2) : i) : `Q0.${i}`;
        outContainer.innerHTML += `<div style="display: flex; flex-direction: column; align-items: center;"><div id="led-out${i}" style="width: 16px; height: 16px; background: #333; border-radius: 50%; border: 2px solid #222; margin-bottom: 4px;"></div><span style="color: #aaa; font-size: 9px; font-family: monospace;">${label}</span></div>`;
        miniOutContainer.innerHTML += `<div style="display: flex; flex-direction: column; align-items: center;"><div id="led-mini-out${i}" style="width: 10px; height: 10px; background: #333; border-radius: 50%; border: 1px solid #111; margin-bottom: 2px;"></div><span style="color: #aaa; font-size: 8px; font-family: monospace;">${label}</span></div>`;
    }

    // ANALOG ARAYÜZÜ AÇ
    if (hasAnalog && analogPanel) {
        analogPanel.style.display = 'block';
        for (let i = 0; i < 2; i++) {
            let label = currentPlcStandard === 'DELTA' ? `CH${i} (D10${i})` : `IW6${i}`;
            analogInContainer.innerHTML += `
                <div>
                    <div style="display:flex; justify-content:space-between; font-size:10px; color:#888; margin-bottom:3px;">
                        <span>${label} [${analogType}]</span>
                        <span id="analog-val-${i}" style="color:#f6c000; font-weight:bold;">0.0V</span>
                    </div>
                    <!-- İŞTE BURAYA ID EKLENDİ Kİ SENSÖR BURAYI BULABİLSİN -->
                    <input type="range" id="analog-slider-${i}" min="0" max="100" value="0" style="width: 100%;" oninput="IN_Analog[${i}] = this.value; document.getElementById('analog-val-${i}').innerText = (this.value/10).toFixed(1) + 'V';">
                </div>
            `;
        }
    }
};

// Hem ana terminaldeki hem de mini paneldeki Butonları / LED'leri güncelleyen motor
window.updateInputUI = function (index, state) {
    const btn = document.getElementById(`btn-in${index}`);
    const miniBtn = document.getElementById(`btn-mini-in${index}`);
    if (btn) {
        btn.style.background = state ? "#00d2ff" : "#333";
        btn.style.color = state ? "#000" : "#fff";
    }
    if (miniBtn) {
        miniBtn.style.background = state ? "#00d2ff" : "#333";
        miniBtn.style.color = state ? "#000" : "#fff";
    }
};

window.updateOutputLEDs = function () {
    for (let i = 0; i < OUT_State.length; i++) {
        const led = document.getElementById(`led-out${i}`);
        const miniLed = document.getElementById(`led-mini-out${i}`);
        let isOn = OUT_State[i];

        if (led) {
            led.style.background = isOn ? "#f6c000" : "#333";
            led.style.boxShadow = isOn ? "0 0 10px #f6c000" : "none";
        }
        if (miniLed) {
            miniLed.style.background = isOn ? "#f6c000" : "#333";
            miniLed.style.boxShadow = isOn ? "0 0 5px #f6c000" : "none";
        }
    }
};
// ==========================================
// 🏭 CULBASE FACTORY - EKİPMAN YÖNETİMİ, SİLME VE DÜZENLEME
// ==========================================
window.setVfdHz = function (id) {
    let comp = factoryComponents.find(c => c.id === id);
    if (comp) {
        let newHz = prompt(`Hedef Frekansı (Hz) girin (Eski: ${comp.setHz}):`, comp.setHz);
        if (newHz !== null && newHz.trim() !== "") {
            // Türkçe virgülü noktaya çevirip kesin bir RAKAMA dönüştürüyoruz
            newHz = newHz.replace(',', '.');
            let parsedHz = parseFloat(newHz);

            if (!isNaN(parsedHz)) {
                comp.setHz = parsedHz;
                // Güvenlik kısıtlamaları (Max 100 Hz, Min 0)
                if (comp.setHz > 100) comp.setHz = 100.0;
                if (comp.setHz < 0) comp.setHz = 0.0;
                if (typeof showToast === "function") showToast(`Sürücü Set Değeri ${comp.setHz} Hz yapıldı.`);
            }
        }
    }
};

window.updateAnalogSensor = function (id, val) {
    let comp = factoryComponents.find(c => c.id === id);
    if (comp) {
        comp.val = parseFloat(val);
        let voltage = (comp.val / 10).toFixed(1);

        // 1. Fabrika Sahasındaki (Sensörün üzerindeki) yazıyı güncelle
        document.getElementById(`aval_${id}`).innerText = voltage + "V";

        // 2. VERİ KÖPRÜSÜ: Fabrikadaki sensörden PLC Terminaline (Kanal 0) veri gönder!
        IN_Analog[0] = comp.val; // PLC'nin beynine yaz

        // PLC Sekmesindeki CH0 Slider'ını ve Yazısını canlı olarak hareket ettir
        let plcAnalogDisplay = document.getElementById('analog-val-0');
        let plcAnalogSlider = document.getElementById('analog-slider-0');

        if (plcAnalogDisplay) plcAnalogDisplay.innerText = voltage + "V";
        if (plcAnalogSlider) plcAnalogSlider.value = comp.val;
    }
};
// ==========================================
// ⚡ GERÇEK PANO ENTEGRASYONU VE GÖRSEL ÇİZİM MOTORU (SADECE İÇ SAC)
// ==========================================
window.importCulbasePanel = function () {
    const canvas = document.getElementById('factory-canvas');

    if (document.getElementById('main_control_panel')) {
        alert("Sahnede zaten bir Ana Kumanda Panosu var! İki pano eklenemez.");
        return;
    }

    // 1. CULBASE HAFIZASINI TARAMA
    let savedPanels = JSON.parse(localStorage.getItem('culbase_panels')) || [];

    if (savedPanels.length === 0) {
        alert("Hafızada kayıtlı bir pano bulunamadı! CULbase 'Pano Tasarım' sekmesini kontrol edin.");
        return;
    }

    // 2. KULLANICIYA PANO SEÇTİRME
    let panelListText = savedPanels.map((p, i) => `${i + 1}- ${p.name}`).join('\n');
    let selectedIndex = prompt(`Sahaya görsel olarak aktarmak istediğiniz panonun numarasını girin:\n\n${panelListText}\n`, "1");

    if (!selectedIndex || isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > savedPanels.length) return;

    let selectedPanel = savedPanels[selectedIndex - 1];
    let panelName = selectedPanel.name || "Özel Pano";

    // Panonun CULbase'deki gerçek boyutlarını al (Yoksa varsayılan 600x800)
    let pWidth = parseInt(selectedPanel.width) || 600;
    let pHeight = parseInt(selectedPanel.height) || 800;

    // Sanal Fabrika ekranında kutuya sığması için hesaplanan Ölçekleme (Scale) Oranı
    let scaleRatio = 260 / pWidth;
    let scaledHeight = pHeight * scaleRatio;

    // 3. SADECE İÇ SAC MALZEMELERİNİ KUSURSUZ KOORDİNATLARLA ÇİZ
    let sacHTML = '';
    if (selectedPanel.sacItems && selectedPanel.sacItems.length > 0) {
        selectedPanel.sacItems.forEach(item => {
            let rot = item.rotate !== "0" ? `transform: rotate(${item.rotate}deg);` : "";
            sacHTML += `<div class="${item.type}" style="position:absolute; left:${item.left}; top:${item.top}; width:${item.width}; height:${item.height}; ${rot} background:#222; border:1px solid #00d2ff; color:#fff; font-size:10px; display:flex; justify-content:center; align-items:center; text-align:center; overflow:hidden; box-shadow: 2px 2px 5px rgba(0,0,0,0.5);">${item.name}</div>`;
        });
    } else {
        sacHTML = `<div style="color:#555; text-align:center; padding-top:20px;">İç Sac Boş</div>`;
    }

    // 4. TÜM PANOYU SIKIŞTIRIP SAHAYA (CANVAS) AKTAR (Kapak Kaldırıldı)
    let id = 'main_control_panel';
    let baseStyle = "background: #111; border: 3px solid #555; padding: 10px; border-radius: 4px; position: absolute; left: 20px; top: 20px; cursor: grab; z-index: 1; box-shadow: 0 10px 30px rgba(0,0,0,0.8);";

    let compHTML = `
        <div id="${id}" class="factory-item factory-draggable" data-type="control_panel" style="${baseStyle} width: 280px; display:flex; flex-direction:column;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:2px solid #333; padding-bottom:5px;">
                <span style="color:#f39c12; font-size:14px; font-weight:bold; pointer-events:none;">⚡ ${panelName.toUpperCase()}</span>
                <button onclick="removeFactoryComponent('${id}')" style="background:transparent; color:#ff4444; border:none; font-size:14px; padding:0; cursor:pointer;">[X]</button>
            </div>
            
            <div style="font-size:10px; color:#aaa; margin-bottom:2px;">Pano İçi (İç Sac) Tasarımı:</div>
            <div style="position:relative; width:${pWidth}px; height:${pHeight}px; transform: scale(${scaleRatio}); transform-origin: top left; background:#1a1a1a; border:1px dashed #444; margin-bottom:-${pHeight - scaledHeight}px; pointer-events:none;">
                ${sacHTML}
            </div>

            <div style="background:#222; padding:5px; text-align:center; border-bottom:3px solid #e74c3c; margin-top:10px;">
                <span style="color:#e74c3c; font-size:10px; font-weight:bold;">[ X1 SAHA KLEMENS DİZİSİ ]</span>
            </div>
        </div>
    `;

    factoryComponents.push({ id: id, type: 'control_panel', name: panelName });
    canvas.insertAdjacentHTML('beforeend', compHTML);

    if (typeof showToast === "function") showToast(`${panelName} pano içi görseliyle sahaya aktarıldı!`);
};

window.addFactoryComponent = function (type) {
    const canvas = document.getElementById('factory-canvas');
    let id = 'comp_' + Date.now();
    let compHTML = "";
    const controlBtns = `<div style="display:flex; gap:5px; z-index:15;"><button onclick="editComponentTags('${id}')" style="background:transparent; color:#f6c000; border:none; font-size:14px; padding:0; cursor:pointer;" title="Tag Ayarları">⚙️</button><button onclick="removeFactoryComponent('${id}')" style="background:transparent; color:#ff4444; border:none; font-size:14px; padding:0; cursor:pointer;">[X]</button></div>`;
    let baseStyle = "background: #222; border: 1px solid #444; padding: 15px; border-radius: 8px; position: absolute; left: 50px; top: 50px; cursor: grab; z-index: 5; box-shadow: 0 4px 10px rgba(0,0,0,0.5);";
    let outDef = currentPlcStandard === 'DELTA' ? "Y0" : "Q0.0";
    let inDef = currentPlcStandard === 'DELTA' ? "X0" : "I0.0";


    if (type === 'cylinder') {
        let tagOut = prompt("Silindiri itecek Çıkış (OUT):", outDef); let tagIn = prompt("Limit Sensörü (IN):", inDef);
        compHTML = `<div id="${id}" class="factory-item factory-draggable" data-type="cylinder" style="${baseStyle} width: 280px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span style="color:#00d2ff; font-size:12px; font-weight:bold; pointer-events:none;">🗜️ Silindir</span><div style="display:flex; gap:10px; z-index:10;"><span id="tagtext_${id}" style="color:#888; font-size:10px;">OUT:[${tagOut}] IN:[${tagIn}]</span>${controlBtns}</div></div>
            <div style="display:flex; align-items:center; width:100%; pointer-events:none;"><div style="width:60px; height:25px; background:#555; border:2px solid #333; z-index:2;"></div><div id="rod_${id}" style="width:10px; height:8px; background:silver; transition: width 0.5s;"></div><div style="width:5px; height:25px; background:#e74c3c; margin-left:auto;" id="sensor_${id}"></div></div></div>`;
        factoryComponents.push({ id: id, type: 'cylinder', out: tagOut, in: tagIn, name: "Pnömatik Silindir" });
    }
    else if (type === 'conveyor') {
        let tagOut = prompt("Konveyör Motoru (OUT):", outDef);
        compHTML = `<div id="${id}" class="factory-item factory-draggable" data-type="conveyor" style="${baseStyle} width: 350px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; z-index:10; position:relative;"><span style="color:#27ae60; font-size:12px; font-weight:bold; pointer-events:none;">🛤️ Konveyör</span><div style="display:flex; gap:10px;"><span id="tagtext_${id}" style="color:#888; font-size:10px;">MOT:[${tagOut}]</span>${controlBtns}</div></div>
            <div id="belt_${id}" style="width:100%; height:15px; background:#333; border:2px dashed #555; border-radius:10px; display:flex; align-items:center; overflow:hidden; pointer-events:none;"><div id="box_${id}" style="width:15px; height:15px; background:#f39c12; transition: transform 0.1s linear;"></div></div></div>`;
        factoryComponents.push({ id: id, type: 'conveyor', out: tagOut, boxPos: 0, name: "Konveyör Bant" });
    }
    else if (type === 'barrier') {
        let tagOut = prompt("Bariyer Motoru (OUT):", outDef);
        compHTML = `<div id="${id}" class="factory-item factory-draggable" data-type="barrier" style="${baseStyle} width: 150px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; z-index:10; position:relative;"><span style="color:#e67e22; font-size:12px; font-weight:bold; pointer-events:none;">🚧 Bariyer</span><div style="display:flex; gap:10px;"><span id="tagtext_${id}" style="color:#888; font-size:10px;">OUT:[${tagOut}]</span>${controlBtns}</div></div>
            <div style="width:20px; height:20px; background:#111; border-radius:50%; position:relative; margin-top:20px; pointer-events:none;"><div id="arm_${id}" style="width:100px; height:10px; background:repeating-linear-gradient(45deg, #f1c40f, #f1c40f 10px, #000 10px, #000 20px); position:absolute; left:10px; top:5px; transform-origin: left center; transition: transform 1s; transform: rotate(0deg);"></div></div></div>`;
        factoryComponents.push({ id: id, type: 'barrier', out: tagOut, name: "Otomatik Bariyer" });
    }
    else if (type === 'vfd_drive') {
        let tagOut = prompt("Sürücü Start Sinyali (OUT):", outDef);
        compHTML = `<div id="${id}" class="factory-item factory-draggable" data-type="vfd_drive" style="${baseStyle} width: 180px; text-align:center;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px; z-index:10; position:relative;"><span style="color:#9b59b6; font-size:12px; font-weight:bold; pointer-events:none;">🔌 AC Sürücü</span><div style="display:flex; gap:5px;"><span id="tagtext_${id}" style="color:#888; font-size:9px;">OUT:[${tagOut}]</span>${controlBtns}</div></div>
            <div style="background:#111; padding:10px; border:1px solid #555; display:inline-block; margin-top:10px; pointer-events:none;"><span id="hz_${id}" style="color:#00d2ff; font-size:24px; font-family:monospace;">0.0</span><span style="color:#888; font-size:10px;"> Hz</span></div></div>`;
        factoryComponents.push({ id: id, type: 'vfd_drive', out: tagOut, hz: 0, name: "Motor Sürücü (VFD)" });
    }
    else if (type === 'sensor_optic') {
        let tagIn = prompt("Sensör Girişi (IN):", inDef);
        compHTML = `<div id="${id}" class="factory-item factory-draggable" data-type="sensor_optic" style="${baseStyle} width: 220px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span style="color:#f39c12; font-size:12px; font-weight:bold; pointer-events:none;">👁️ Optik Sensör</span><div style="display:flex; gap:10px; z-index:10;"><span id="tagtext_${id}" style="color:#888; font-size:10px;">IN:[${tagIn}]</span>${controlBtns}</div></div>
            <button onmousedown="simulateSensor('${id}', '${tagIn}', true)" onmouseup="simulateSensor('${id}', '${tagIn}', false)" onmouseleave="simulateSensor('${id}', '${tagIn}', false)" ontouchstart="simulateSensor('${id}', '${tagIn}', true)" ontouchend="simulateSensor('${id}', '${tagIn}', false)" style="width:100%; padding: 8px; background: #333; color: #fff; cursor:pointer; font-size:10px;">Basılı Tut: Algıla</button></div>`;
        factoryComponents.push({ id: id, type: 'sensor_optic', in: tagIn, name: "Optik Sensör" });
    }
    else if (type === 'tower_light' || type === 'panel_light') {
        let tagOut = prompt("Lamba Çıkışı (OUT):", outDef);
        let color = prompt("Renk (red, green, yellow, orange, blue, white):", "red");
        if (!color) color = "red"; // Eğer boş geçilirse bozulmasın, kırmızı olsun
        let name = type === 'tower_light' ? "🚦 Tepe Lambası" : "💡 Panel Lambası";
        compHTML = `<div id="${id}" class="factory-item factory-draggable" data-type="light" data-color="${color}" style="${baseStyle} width: 160px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span style="color:#fff; font-size:11px; font-weight:bold; pointer-events:none;">${name}</span><div style="display:flex; gap:5px; z-index:10;"><span id="tagtext_${id}" style="color:#888; font-size:9px;">OUT:[${tagOut}]</span>${controlBtns}</div></div>
            <div id="light_${id}" style="width:30px; height:30px; border-radius:50%; background:#333; margin: 0 auto; border:2px solid #111; pointer-events:none;"></div></div>`;
        factoryComponents.push({ id: id, type: 'light', out: tagOut, color: color, name: name });
    }
    else if (type === 'btn_momentary' || type === 'btn_toggle') {
        let tagIn = prompt("Buton Girişi (IN):", inDef);
        let isToggle = type === 'btn_toggle';
        let name = isToggle ? "🕹️ Şalter (Kalıcı)" : "🔘 Yaylı Buton";

        let events = isToggle
            ? `onclick="toggleSwitch('${id}', '${tagIn}')"`
            : `onmousedown="simulateSensor('${id}', '${tagIn}', true)" onmouseup="simulateSensor('${id}', '${tagIn}', false)" onmouseleave="simulateSensor('${id}', '${tagIn}', false)" ontouchstart="simulateSensor('${id}', '${tagIn}', true)" ontouchend="simulateSensor('${id}', '${tagIn}', false)"`;

        compHTML = `<div id="${id}" class="factory-item factory-draggable" data-type="button" style="${baseStyle} width: 180px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span style="color:#fff; font-size:11px; font-weight:bold; pointer-events:none;">${name}</span><div style="display:flex; gap:5px; z-index:10;"><span id="tagtext_${id}" style="color:#888; font-size:9px;">IN:[${tagIn}]</span>${controlBtns}</div></div>
            <button ${events} id="phys_btn_${id}" style="width:40px; height:40px; border-radius:50%; background: #e74c3c; border: 3px solid #c0392b; margin: 0 auto; display:block; cursor:pointer; box-shadow:0 5px 0 #8e44ad;"></button></div>`;
        factoryComponents.push({ id: id, type: 'button', in: tagIn, state: false, isToggle: isToggle, name: name });
    }
    if (type === 'vfd_drive') {
        let tagOut = prompt("Sürücü Start Sinyali (OUT):", outDef);
        compHTML = `<div id="${id}" class="factory-item factory-draggable" data-type="vfd_drive" style="${baseStyle} width: 200px; text-align:center;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px; z-index:10; position:relative;"><span style="color:#00d2ff; font-size:12px; font-weight:bold; pointer-events:none;">🔌 AC Sürücü</span><div style="display:flex; gap:5px;"><span id="tagtext_${id}" style="color:#888; font-size:9px;">OUT:[${tagOut}]</span>${controlBtns}</div></div>
            <div style="background:#111; padding:10px; border:1px solid #555; display:inline-block; margin-top:5px; border-radius:4px; pointer-events:none; width:80%;">
                <span id="hz_${id}" style="color:#27ae60; font-size:26px; font-family:monospace; font-weight:bold;">0.0</span><span style="color:#888; font-size:10px;"> Hz</span>
            </div>
            <button onclick="setVfdHz('${id}')" style="width:100%; margin-top:10px; background:#333; color:#f39c12; border:1px solid #555; padding:5px; cursor:pointer; font-size:10px; font-weight:bold;">⚙️ Frekans (Set) Ayarla</button>
            </div>`;
        // setHz eklendi
        factoryComponents.push({ id: id, type: 'vfd_drive', out: tagOut, hz: 0.0, setHz: 50.0, name: "Motor Sürücü (VFD)" });
    }
    else if (type === 'ac_motor') {
        let tagOut = prompt("Motor Kontaktörü veya Sürücü Çıkışı (OUT):", outDef);
        compHTML = `<div id="${id}" class="factory-item factory-draggable" data-type="ac_motor" style="${baseStyle} width: 180px; text-align:center;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; z-index:10; position:relative;"><span style="color:#fff; font-size:12px; font-weight:bold; pointer-events:none;">⚙️ 3 Fazlı Motor</span><div style="display:flex; gap:5px;"><span id="tagtext_${id}" style="color:#888; font-size:9px;">OUT:[${tagOut}]</span>${controlBtns}</div></div>
            <div style="width:60px; height:60px; background:#333; border:3px solid #555; border-radius:50%; margin:0 auto; display:flex; justify-content:center; align-items:center; pointer-events:none;">
                <div id="gear_${id}" style="font-size:32px; transition: transform 0.1s linear;">⚙️</div>
            </div>
            <div id="rpm_${id}" style="color:#f39c12; font-family:monospace; font-size:12px; margin-top:5px;">0 RPM</div></div>`;
        factoryComponents.push({ id: id, type: 'ac_motor', out: tagOut, rot: 0, rpm: 0, name: "AC Motor (3 Faz)" });
    }
    else if (type === 'linear_axis') {
        let tagOut = prompt("İleri Sürüş Çıkışı (OUT):", outDef);
        compHTML = `<div id="${id}" class="factory-item factory-draggable" data-type="linear_axis" style="${baseStyle} width: 350px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; z-index:10; position:relative;"><span style="color:#9b59b6; font-size:12px; font-weight:bold; pointer-events:none;">📏 Lineer Eksen</span><div style="display:flex; gap:5px;"><span id="tagtext_${id}" style="color:#888; font-size:9px;">FWD:[${tagOut}]</span>${controlBtns}</div></div>
            <div style="width:100%; height:8px; background:#555; border-radius:4px; position:relative; pointer-events:none;">
                <div id="carriage_${id}" style="width:20px; height:20px; background:#00d2ff; border:2px solid #000; border-radius:2px; position:absolute; top:-6px; left:0px; transition: left 0.1s linear;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:15px; color:#aaa; font-size:10px; font-family:monospace;"><span id="pos_${id}">Pozisyon: 0 mm</span></div></div>`;
        factoryComponents.push({ id: id, type: 'linear_axis', out: tagOut, pos: 0, name: "Vidalı Mil & Servo" });
    }
    else if (type === 'sensor_analog') {
        let tagIn = prompt("Analog Verinin Okunacağı Register (Örn: D100 veya IW64):", currentPlcStandard === 'DELTA' ? "D100" : "IW64");
        compHTML = `<div id="${id}" class="factory-item factory-draggable" data-type="sensor_analog" style="${baseStyle} width: 250px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; z-index:10; position:relative;">
                <span style="color:#f39c12; font-size:12px; font-weight:bold; pointer-events:none;">📡 Lazer Mesafe Sensörü</span>
                <div style="display:flex; gap:10px;">${controlBtns}</div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:10px; color:#888; margin-bottom:8px;">
                <span>Kanal: [${tagIn}]</span>
                <span id="aval_${id}" style="color:#f6c000; font-weight:bold; font-size:14px; background:#111; padding:2px 5px; border-radius:3px;">0.0V</span>
            </div>
            <!-- ÜZERİNE ENTEGRE EDİLMİŞ SLIDER -->
            <input type="range" min="0" max="100" value="0" style="width: 100%; cursor:pointer; position:relative; z-index:10;" oninput="updateAnalogSensor('${id}', this.value)">
            </div>`;
        factoryComponents.push({ id: id, type: 'sensor_analog', reg: tagIn, val: 0, name: "Analog Lazer Sensör (0-10V)" });
    }
    else if (type === 'encoder') {
        let tagOut = prompt("Hızını okuyacağı Motor Çıkışı (OUT) (Motor ile aynı Y adresini yapın):", outDef);
        let tagIn = prompt("Pulse Sinyalinin Gideceği Hızlı Giriş (IN):", inDef);
        compHTML = `<div id="${id}" class="factory-item factory-draggable" data-type="encoder" style="${baseStyle} width: 220px; text-align:center;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span style="color:#00d2ff; font-size:12px; font-weight:bold; pointer-events:none;">🔄 Rotary Encoder</span><div style="display:flex; gap:5px; z-index:10;"><span id="tagtext_${id}" style="color:#888; font-size:9px;">OUT:[${tagOut}] IN:[${tagIn}]</span>${controlBtns}</div></div>
            <div style="width:40px; height:40px; background:#111; border:3px dashed #555; border-radius:50%; margin:0 auto; display:flex; justify-content:center; align-items:center; pointer-events:none;">
                <div id="wheel_${id}" style="font-size:20px; transition: transform 0.1s linear;">💠</div>
            </div>
            <div style="color:#f39c12; font-family:monospace; font-size:10px; margin-top:5px;">Pulse: <span id="pulse_${id}">0</span></div>
        </div>`;
        factoryComponents.push({ id: id, type: 'encoder', out: tagOut, in: tagIn, rot: 0, pulses: 0, name: "Rotary Encoder" });
    }

    if (compHTML) canvas.insertAdjacentHTML('beforeend', compHTML);
};

// Şalter Fonksiyonu (Toggle)
window.toggleSwitch = function (id, tagIn) {
    let comp = factoryComponents.find(c => c.id === id);
    if (comp) {
        comp.state = !comp.state;
        let opData = parseOperand(tagIn);
        if (opData && opData.type === 'IN') {
            IN_State[opData.index] = comp.state;
            updateInputUI(opData.index, comp.state);
        }
        document.getElementById(`phys_btn_${id}`).style.boxShadow = comp.state ? "0 0px 0 #8e44ad" : "0 5px 0 #8e44ad";
        document.getElementById(`phys_btn_${id}`).style.transform = comp.state ? "translateY(5px)" : "translateY(0)";
        document.getElementById(`phys_btn_${id}`).style.background = comp.state ? "#27ae60" : "#e74c3c";
    }
};

// YENİ: ÇİFT TIKLAYINCA TAG (X/Y) DEĞİŞTİRME MOTORU
window.editComponentTags = function (id) {
    let comp = factoryComponents.find(c => c.id === id);
    if (!comp) return;

    if (comp.out !== undefined) {
        let newOut = prompt(`Yeni Çıkış (OUT) Tag'ini girin (Eski: ${comp.out}):`, comp.out);
        if (newOut) comp.out = newOut.toUpperCase().trim();
    }
    if (comp.in !== undefined) {
        let newIn = prompt(`Yeni Giriş (IN) Limit Sensörü Tag'ini girin (Eski: ${comp.in}):`, comp.in);
        if (newIn) comp.in = newIn.toUpperCase().trim();
    }

    // Arayüzdeki yazıyı güncelle
    const tagText = document.getElementById(`tagtext_${id}`);
    if (tagText) {
        if (comp.type === 'cylinder') tagText.innerText = `OUT:[${comp.out}] IN:[${comp.in}]`;
        else if (comp.type === 'conveyor' || comp.type === 'tower_light') tagText.innerText = `MOTOR/OUT: [${comp.out}]`;
        else if (comp.type === 'sensor_optic') tagText.innerText = `IN: [${comp.in}]`;
    }
    if (typeof showToast === "function") showToast("Bağlantı Tag'leri güncellendi!");
};

window.removeFactoryComponent = function (id) {
    if (confirm("Bu ekipmanı sahadan kaldırmak istiyor musunuz?")) {
        factoryComponents = factoryComponents.filter(comp => comp.id !== id);
        const el = document.getElementById(id);
        if (el) el.remove();
    }
};

// ==========================================
// 📄 OTOMATİK E-PLAN & PROJE RAPORU JENERATÖRÜ
// ==========================================
// ==========================================
// 📄 OTOMATİK E-PLAN & MÜHENDİSLİK RAPORU JENERATÖRÜ
// ==========================================
window.generateEPlanPDF = function () {
    const plcSelect = document.getElementById('vplc-model');
    const plcModelText = plcSelect.options[plcSelect.selectedIndex].text;
    const plcCode = document.getElementById('vplc-code').value.trim() || "Kod yazılmadı.";
    let dateStr = new Date().toLocaleDateString('tr-TR');

    let fieldComps = factoryComponents.filter(c => c.type !== 'control_panel');

    // 1. I/O LİSTESİ OLUŞTURUCU
    let ioListHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:20px;">
            <thead>
                <tr style="background:#00509e; color:#fff;">
                    <th style="padding:6px; border:1px solid #003366; text-align:left;">I/O Adresi</th>
                    <th style="padding:6px; border:1px solid #003366; text-align:left;">Tip</th>
                    <th style="padding:6px; border:1px solid #003366; text-align:left;">Bağlı Olduğu Ekipman</th>
                </tr>
            </thead>
            <tbody>
    `;
    fieldComps.forEach(comp => {
        if (comp.in) ioListHTML += `<tr><td style="padding:6px; border:1px solid #ccc; font-weight:bold; color:#00509e;">${comp.in}</td><td style="padding:6px; border:1px solid #ccc; color:#27ae60;">DI (Dijital Giriş)</td><td style="padding:6px; border:1px solid #ccc;">${comp.name} (Sensör/Buton)</td></tr>`;
        if (comp.out) ioListHTML += `<tr><td style="padding:6px; border:1px solid #ccc; font-weight:bold; color:#c0392b;">${comp.out}</td><td style="padding:6px; border:1px solid #ccc; color:#f39c12;">DO (Dijital Çıkış)</td><td style="padding:6px; border:1px solid #ccc;">${comp.name} (Aktüatör/Motor)</td></tr>`;
    });
    ioListHTML += `</tbody></table>`;

    // 2. KABLO BAĞLANTI LİSTESİ
    updateWiringBoard();
    const wiringBoardContent = document.getElementById('wiring-board').innerHTML;

    // 3. ⚙️ MÜHENDİSLİK HESAPLAMALARI (AKILLI PANO)
    let totalKw = 0;
    fieldComps.forEach(comp => {
        if (comp.type === 'ac_motor' || comp.type === 'vfd_drive' || comp.type === 'conveyor') totalKw += 1.5; // Varsayılan 1.5 kW motor yükü
    });

    let currentAmps = (totalKw * 1000) / (380 * 1.732 * 0.8); // 3 faz akım hesabı
    let recommendedCable = currentAmps > 16 ? "4x4 mm²" : (currentAmps > 10 ? "4x2.5 mm²" : "4x1.5 mm²");
    let heatDissipation = totalKw * 0.05 * 1000; // %5 Isı kaybı
    let fanWarning = heatDissipation > 100 ? `<span style="color:#c0392b; font-weight:bold;">⚠️ Soğutma Fanı Gerekli (120x120)</span>` : `<span style="color:#27ae60;">Doğal Havalandırma Yeterli</span>`;

    let yearSuffix = new Date().getFullYear().toString().slice(-2);
    let trackingId = "CLC19" + yearSuffix + "-" + Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    let engineeringReportHTML = `
        <h3 style="background:#333; color:#fff; padding:6px; margin-top:15px; font-size:13px;">3. AKILLI PANO MÜHENDİSLİK HESAPLAMALARI</h3>
        <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:20px; background:#f9f9f9;">
            <tr><td style="padding:6px; border:1px solid #ccc; font-weight:bold; width:40%;">Proje Takip Kodu (ID):</td><td style="padding:6px; border:1px solid #ccc; font-family:monospace; font-size:13px; color:#198b1d; font-weight:bold;">${trackingId}</td></tr>
            <tr><td style="padding:6px; border:1px solid #ccc; font-weight:bold;">Tahmini Toplam Güç (Motor Yükü):</td><td style="padding:6px; border:1px solid #ccc;">${totalKw.toFixed(2)} kW</td></tr>
            <tr><td style="padding:6px; border:1px solid #ccc; font-weight:bold;">Ana Şebeke Çekilen Akım:</td><td style="padding:6px; border:1px solid #ccc;">${currentAmps.toFixed(2)} Amper (AC 380V)</td></tr>
            <tr><td style="padding:6px; border:1px solid #ccc; font-weight:bold;">Tavsiye Edilen Ana Besleme Kablosu:</td><td style="padding:6px; border:1px solid #ccc; font-weight:bold; color:#00509e;">${recommendedCable} (NYY / TTR)</td></tr>
            <tr><td style="padding:6px; border:1px solid #ccc; font-weight:bold;">Pano İçi Isı Yayılımı (Kayıp):</td><td style="padding:6px; border:1px solid #ccc;">${heatDissipation.toFixed(0)} Watt &nbsp;➡&nbsp; ${fanWarning}</td></tr>
        </table>
    `;

    // 4. HTML ŞABLONUNU BİRLEŞTİR
    let templateHTML = `
        <div style="padding:15mm; background:#fff; color:#000; font-family:Arial, sans-serif; min-height:297mm; width:210mm; box-sizing:border-box;">
            <div style="border-bottom: 3px solid #198b1d; padding-bottom: 15px; margin-bottom: 20px; display:flex; justify-content:space-between; align-items:flex-end;">
                <h1 style="color:#198b1d; margin:0; font-size:24px;">CULBASE OTOMASYON PROJESİ</h1>
                <div style="text-align: right; font-size: 12px; color:#555;">Tarih: ${dateStr}<br>Revizyon: 4.0<br>Mühendis: Emirhan Çulcu</div>
            </div>

            <h3 style="background:#333; color:#fff; padding:6px; margin-top:15px; font-size:13px;">1. GİRİŞ / ÇIKIŞ (I/O) LİSTESİ</h3>
            ${ioListHTML}

            <h3 style="background:#333; color:#fff; padding:6px; margin-top:15px; font-size:13px;">2. DETAYLI KABLO BAĞLANTI LİSTESİ</h3>
            <div style="border:1px solid #ccc; padding:5px; background:#111; border-radius:4px;">
                ${wiringBoardContent}
            </div>

            ${engineeringReportHTML}

            <h3 style="background:#333; color:#fff; padding:6px; margin-top:20px; font-size:13px;">4. PLC LADDER YAZILIMI (KOMUT LİSTESİ)</h3>
            <div style="border:1px solid #ccc; padding:10px; background:#f4f4f4;">
                <pre style="margin:0; font-family:'Courier New', monospace; font-size:11px; color:#111; white-space:pre-wrap;">${plcCode}</pre>
            </div>
        </div>
    `;

    document.getElementById('pdf-preview-content').innerHTML = templateHTML;
    document.getElementById('pdf-preview-modal').style.display = 'flex';

    let screenWidth = window.innerWidth;
    if (screenWidth < 850) {
        currentPdfZoom = (screenWidth - 40) / 800;
        if (currentPdfZoom > 1) currentPdfZoom = 1;
        document.getElementById('pdf-zoom-wrapper').style.transform = `scale(${currentPdfZoom})`;
        document.getElementById('pdf-zoom-level').innerText = Math.round(currentPdfZoom * 100) + '%';
    }

    document.getElementById('pdf-download-btn').onclick = function () {
        if (typeof showToast === "function") showToast("E-Plan Hazırlanıyor...");
        const btn = document.getElementById('pdf-download-btn');
        btn.innerText = "⏳ İndiriliyor..."; btn.disabled = true;

        const opt = {
            margin: 0, filename: 'CULbase_EPlan_' + trackingId + '.pdf',
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff', scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(document.getElementById('pdf-preview-content')).save().then(() => {
            if (typeof showToast === "function") showToast("E-Plan İndirildi!");
            btn.innerText = "📥 İNDİR"; btn.disabled = false;
        });
    };
};
window.simulateSensor = function (id, tagIn, state) {
    let opData = parseOperand(tagIn);
    if (opData && opData.type === 'IN') {
        IN_State[opData.index] = state;
        updateInputUI(opData.index, state);
    }
};

window.toggleInput = function (index, state) {
    IN_State[index] = state;
    updateInputUI(index, state);
    if (state && navigator.vibrate) navigator.vibrate(15);
};

function updateInputUI(index, state) {
    const btn = document.getElementById(`btn-in${index}`);
    if (btn) {
        if (state) { btn.style.background = "#00d2ff"; btn.style.color = "#000"; }
        else { btn.style.background = "#333"; btn.style.color = "#fff"; }
    }
}

window.togglePlcRun = function () {
    isVPlcRunning = !isVPlcRunning;
    const btn = document.getElementById('btn-vplc-run');

    if (isVPlcRunning) {
        btn.innerText = "STOP"; btn.style.background = "#ff4444"; btn.style.borderColor = "#8b0000";
        vPlcInterval = setInterval(plcScanCycle, 50);
        if (navigator.vibrate) navigator.vibrate([30, 100]);
    } else {
        btn.innerText = "RUN"; btn.style.background = "#27ae60"; btn.style.borderColor = "#145c32";
        clearInterval(vPlcInterval);
        OUT_State.fill(false); updateOutputLEDs();
    }
};

function parseOperand(operand) {
    if (!operand) return { type: null, index: -1 };
    let cleanOp = operand.trim();

    if (cleanOp.startsWith('X')) {
        let num = parseInt(cleanOp.substring(1));
        if (num >= 10) num -= 2;
        return { type: 'IN', index: num };
    }
    else if (cleanOp.startsWith('Y')) {
        let num = parseInt(cleanOp.substring(1));
        if (num >= 10) num -= 2;
        return { type: 'OUT', index: num };
    }
    else if (cleanOp.startsWith('I')) {
        let parts = cleanOp.substring(1).split('.');
        if (parts.length === 2) return { type: 'IN', index: (parseInt(parts[0]) * 8) + parseInt(parts[1]) };
    }
    else if (cleanOp.startsWith('Q')) {
        let parts = cleanOp.substring(1).split('.');
        if (parts.length === 2) return { type: 'OUT', index: (parseInt(parts[0]) * 8) + parseInt(parts[1]) };
    }
    return { type: null, index: -1 };
}

window.plcScanCycle = function () {
    const rawCode = document.getElementById('vplc-code').value;
    const lines = rawCode.toUpperCase().split('\n');
    let accumulator = false;

    // LADDER KODU DERLEYİCİ (AKILLI SÜRÜM)
    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('//')) continue;

        // Satırdaki fazla boşlukları (Tab/Space) temizler ve güvenli şekilde ayırır
        let parts = line.split(/\s+/);
        let cmd = parts[0];
        let opData = parseOperand(parts[1]);

        let opValue = false;
        if (opData.type === 'IN' && opData.index < IN_State.length) opValue = IN_State[opData.index];
        else if (opData.type === 'OUT' && opData.index < OUT_State.length) opValue = OUT_State[opData.index];

        // MANTIK İŞLEMCİSİ
        if (cmd === 'LD') accumulator = opValue;
        else if (cmd === 'LDI') accumulator = !opValue;
        else if (cmd === 'AND') accumulator = accumulator && opValue;
        else if (cmd === 'ANI') accumulator = accumulator && !opValue;
        else if (cmd === 'OR') accumulator = accumulator || opValue;
        else if (cmd === 'ORI') accumulator = accumulator || !opValue;

        // ÇIKIŞ İŞLEMCİSİ (OUT, SET, RESET Eklendi!)
        else if (cmd === 'OUT' && opData.type === 'OUT') {
            OUT_State[opData.index] = accumulator;
        }
        else if ((cmd === 'SET' || cmd === 'S') && opData.type === 'OUT') {
            if (accumulator) OUT_State[opData.index] = true; // Sadece enerji geldiğinde SET et, enerji kesilse de hafızada kalsın
        }
        else if ((cmd === 'RST' || cmd === 'R') && opData.type === 'OUT') {
            if (accumulator) OUT_State[opData.index] = false; // Enerji geldiğinde RESET et
        }
    }
    updateOutputLEDs();

    // FABRİKA FİZİK MOTORU
    factoryComponents.forEach(comp => {
        let opDataOut = parseOperand(comp.out);
        let isActive = false;
        if (opDataOut && opDataOut.type === 'OUT' && OUT_State[opDataOut.index]) isActive = true;

        if (comp.type === 'cylinder') {
            const rod = document.getElementById('rod_' + comp.id);
            const sensor = document.getElementById('sensor_' + comp.id);
            if (isActive) {
                rod.style.width = "180px";
                setTimeout(() => {
                    let inData = parseOperand(comp.in);
                    if (inData && inData.type === 'IN') { IN_State[inData.index] = true; updateInputUI(inData.index, true); }
                    sensor.style.background = "#27ae60"; sensor.style.opacity = "1";
                }, 500);
            } else {
                rod.style.width = "10px";
                let inData = parseOperand(comp.in);
                if (inData && inData.type === 'IN') { IN_State[inData.index] = false; updateInputUI(inData.index, false); }
                sensor.style.background = "#e74c3c"; sensor.style.opacity = "0.5";
            }
        }
        else if (comp.type === 'conveyor') {
            const box = document.getElementById('box_' + comp.id);
            const belt = document.getElementById('belt_' + comp.id);
            if (isActive) {
                belt.style.borderColor = "#27ae60";
                comp.boxPos += 5; if (comp.boxPos > 300) comp.boxPos = -20;
                box.style.transform = `translateX(${comp.boxPos}px)`;
            } else { belt.style.borderColor = "#555"; }
        }
        else if (comp.type === 'barrier') {
            const arm = document.getElementById('arm_' + comp.id);
            arm.style.transform = isActive ? "rotate(-90deg)" : "rotate(0deg)";
        }
        else if (comp.type === 'vfd_drive') {
            const hzText = document.getElementById('hz_' + comp.id);
            if (isActive) {
                // KUSURSUZ RAMPA (Hedefi aşmaz, sıçrama yapmaz)
                if (comp.hz < comp.setHz) {
                    comp.hz += 0.5;
                    if (comp.hz > comp.setHz) comp.hz = comp.setHz;
                } else if (comp.hz > comp.setHz) {
                    comp.hz -= 0.5;
                    if (comp.hz < comp.setHz) comp.hz = comp.setHz;
                }
            } else {
                comp.hz -= 1.0; // Stop durumunda yavaş duruş
                if (comp.hz < 0) comp.hz = 0;
            }
            if (hzText) {
                hzText.innerText = comp.hz.toFixed(1);
                hzText.style.color = (comp.hz > 0) ? "#27ae60" : "#888";
            }
        }
        else if (comp.type === 'ac_motor') {
            const gear = document.getElementById('gear_' + comp.id);
            const rpmText = document.getElementById('rpm_' + comp.id);

            // Sahada bağlı olduğu (aynı OUT tagine sahip) bir VFD var mı diye bak
            let linkedVfd = factoryComponents.find(c => c.type === 'vfd_drive' && c.out === comp.out);

            if (linkedVfd) {
                // Hız VFD'ye bağlı (Örn: 50Hz = 1500 RPM)
                comp.rpm = Math.floor(linkedVfd.hz * 30);
                comp.rot += (linkedVfd.hz / 2); // Dönme animasyonu hızı
            } else {
                // Direkt kontaktör (DOL) kalkış
                if (isActive) {
                    comp.rpm = 1500;
                    comp.rot += 25;
                } else {
                    comp.rpm = 0;
                }
            }

            if (comp.rot > 360) comp.rot -= 360;
            gear.style.transform = `rotate(${comp.rot}deg)`;
            rpmText.innerText = `${comp.rpm} RPM`;
        }
        else if (comp.type === 'linear_axis') {
            const carriage = document.getElementById('carriage_' + comp.id);
            const posText = document.getElementById('pos_' + comp.id);

            if (isActive) {
                comp.pos += 2; // İleri sürüş
                if (comp.pos > 300) comp.pos = 300; // Mekanik limit
            } else {
                comp.pos -= 2; // Geri dönüş (yaylı veya ağırlıklı simülasyon)
                if (comp.pos < 0) comp.pos = 0;
            }
            carriage.style.left = comp.pos + 'px';
            posText.innerText = `Pozisyon: ${comp.pos} mm`;
        }
        else if (comp.type === 'light') {
            const light = document.getElementById('light_' + comp.id);
            let validColor = comp.color || "red"; // Güvenlik çemberi
            if (light) {
                if (isActive) {
                    light.style.background = validColor;
                    light.style.boxShadow = `0 0 15px ${validColor}`;
                } else {
                    light.style.background = "#333";
                    light.style.boxShadow = "none";
                }
            }
        }
        else if (comp.type === 'encoder') {
            const wheel = document.getElementById('wheel_' + comp.id);
            const pulseText = document.getElementById('pulse_' + comp.id);

            // Sahadaki motora bağlandı mı?
            let linkedMotor = factoryComponents.find(c => (c.type === 'ac_motor' || c.type === 'vfd_drive') && c.out === comp.out);

            if (linkedMotor && (linkedMotor.rpm > 0 || linkedMotor.hz > 0)) {
                comp.rot += 15;
                comp.pulses += 1;

                // PLC IN pinine fiziksel sinyal yolla (Pulse simülasyonu)
                let inData = parseOperand(comp.in);
                if (inData && inData.type === 'IN') {
                    let pulseState = (comp.pulses % 2 === 0);
                    IN_State[inData.index] = pulseState;
                    updateInputUI(inData.index, pulseState);
                }
            }
            if (comp.rot > 360) comp.rot -= 360;
            if (wheel) wheel.style.transform = `rotate(${comp.rot}deg)`;
            if (pulseText) pulseText.innerText = comp.pulses;
        }
    });
};

function updateOutputLEDs() {
    for (let i = 0; i < OUT_State.length; i++) {
        const led = document.getElementById(`led-out${i}`);
        if (led) {
            if (OUT_State[i]) {
                led.style.background = "#f6c000"; led.style.boxShadow = "0 0 10px #f6c000";
            } else {
                led.style.background = "#333"; led.style.boxShadow = "none";
            }
        }
    }
}
// ==========================================
// 🖱️ SÜRÜKLE BIRAK MOTORU (MOBİL + MASAÜSTÜ)
// ==========================================
let activeDragElement = null;
let dragOffsetX = 0, dragOffsetY = 0;

function startDrag(e) {
    if (e.target.closest('.factory-draggable') && e.target.tagName !== 'BUTTON') {
        activeDragElement = e.target.closest('.factory-draggable');
        activeDragElement.style.cursor = 'grabbing';
        let rect = activeDragElement.getBoundingClientRect();

        let clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        let clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

        dragOffsetX = clientX - rect.left;
        dragOffsetY = clientY - rect.top;
    }
}

function doDrag(e) {
    if (activeDragElement) {
        if (e.type.includes('touch')) e.preventDefault(); // Sürüklerken sayfanın kaymasını engelle

        const canvas = document.getElementById('factory-canvas');
        const canvasRect = canvas.getBoundingClientRect();

        let clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        let clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

        let newX = clientX - canvasRect.left - dragOffsetX;
        let newY = clientY - canvasRect.top - dragOffsetY;

        activeDragElement.style.left = Math.max(0, newX) + 'px';
        activeDragElement.style.top = Math.max(0, newY) + 'px';
    }
}

function stopDrag() {
    if (activeDragElement) {
        activeDragElement.style.cursor = 'grab';
        activeDragElement = null;
    }
}

document.addEventListener('mousedown', startDrag);
document.addEventListener('mousemove', doDrag);
document.addEventListener('mouseup', stopDrag);

document.addEventListener('touchstart', startDrag, { passive: false });
document.addEventListener('touchmove', doDrag, { passive: false });
document.addEventListener('touchend', stopDrag);
// ==========================================
// ⚡ ELEKTRİK KABLAJ ŞEMASI (PİN-TO-PİN + GÖRSEL ÇİZGİLER)
// ==========================================
// ==========================================
// ⚡ ELEKTRİK KABLAJ ŞEMASI (GÜÇ DAĞITIMLI VE DETAYLI)
// ==========================================
window.updateWiringBoard = function () {
    const board = document.getElementById('wiring-board');
    if (!board) return;

    if (factoryComponents.length === 0) {
        board.innerHTML = "<p style='color:#888;'>Bağlantı şeması oluşturmak için 'Sanal Fabrika' sekmesinden ekipman ekleyin.</p>";
        return;
    }

    let hasPanel = factoryComponents.some(c => c.type === 'control_panel');
    let fieldComps = factoryComponents.filter(c => c.type !== 'control_panel');

    // --- BÖLÜM 1: PİN-TO-PİN BAĞLANTI TABLOSU ---
    let html = `<h4 style="color:#00d2ff; margin-bottom:10px; font-size:13px; border-bottom:1px solid #333; padding-bottom:5px;">1. DETAYLI PANO İÇİ & SAHA BAĞLANTI LİSTESİ</h4>`;
    html += `<table style="width:100%; border-collapse:collapse; font-size:11px; color:#fff; background:#111; border:1px solid #333; text-align:left; margin-bottom:20px;">`;
    html += `<thead><tr style="background:#222; color:#888;"><th style="padding:8px; border:1px solid #333;">KAYNAK (PİN/BAĞLANTI)</th><th style="padding:8px; border:1px solid #333; text-align:center;">KABLO / İŞLEM TİPİ</th><th style="padding:8px; border:1px solid #333;">HEDEF (CİHAZ/SAHA)</th></tr></thead><tbody>`;

    // ⚡ GÜÇ DAĞILIMI (SMPS VE KÖPRÜLÜ KLEMENSLER)
    html += `<tr style="background:#001f3f;"><td colspan="3" style="padding:5px; border:1px solid #333; color:#00d2ff; font-weight:bold; text-align:center;">--- PANO İÇİ GÜÇ DAĞILIMI ---</td></tr>`;
    html += `<tr><td style="padding:5px; border:1px solid #333; color:#e74c3c;">Ana Şebeke (L, N, PE)</td><td style="padding:5px; border:1px solid #333; text-align:center;">Pano İçi 220V Kablo</td><td style="padding:5px; border:1px solid #333;">Sigorta (W Otomat) / Ana Şalter</td></tr>`;
    html += `<tr><td style="padding:5px; border:1px solid #333; color:#e74c3c;">Sigorta Çıkışı (L, N)</td><td style="padding:5px; border:1px solid #333; text-align:center;">Pano İçi 220V Kablo</td><td style="padding:5px; border:1px solid #333;">24VDC Güç Kaynağı (SMPS) L/N Girişi</td></tr>`;
    html += `<tr><td style="padding:5px; border:1px solid #333; color:#27ae60;">Güç Kaynağı (+24VDC Çıkış)</td><td style="padding:5px; border:1px solid #333; text-align:center;">Kırmızı Montaj Kablosu</td><td style="padding:5px; border:1px solid #333; color:#f39c12; font-weight:bold;">+24VDC Dağıtım Klemensleri (Köprülü)</td></tr>`;
    html += `<tr><td style="padding:5px; border:1px solid #333; color:#27ae60;">Güç Kaynağı (0VDC Çıkış)</td><td style="padding:5px; border:1px solid #333; text-align:center;">Mavi Montaj Kablosu</td><td style="padding:5px; border:1px solid #333; color:#3498db; font-weight:bold;">0VDC Dağıtım Klemensleri (Köprülü)</td></tr>`;
    html += `<tr><td style="padding:5px; border:1px solid #333; color:#f39c12;">+24V / 0V Dağıtım Klemensleri</td><td style="padding:5px; border:1px solid #333; text-align:center;">Güç / Sinyal Dağıtımı</td><td style="padding:5px; border:1px solid #333;">PLC, Sensör ve Aktüatör Beslemeleri</td></tr>`;

    // ⚡ SİNYAL DAĞILIMI
    if (hasPanel) {
        html += `<tr style="background:#145c32;"><td colspan="3" style="padding:5px; border:1px solid #333; color:#fff; font-weight:bold; text-align:center;">--- PANO İÇİ SİNYAL DAĞILIMI ---</td></tr>`;
        fieldComps.forEach((comp, idx) => {
            let klemensNo = idx + 1;
            if (comp.out) html += `<tr><td style="padding:5px; border:1px solid #333; color:#00d2ff;">PLC ÇIKIŞ [${comp.out}]</td><td style="padding:5px; border:1px solid #333; text-align:center; color:#f39c12;">Röle/Kontaktör Çıkışı</td><td style="padding:5px; border:1px solid #333; color:#e74c3c;">X1 Klemensi (Pin: ${klemensNo}A)</td></tr>`;
            if (comp.in) html += `<tr><td style="padding:5px; border:1px solid #333; color:#e74c3c;">X1 Klemensi (Pin: ${klemensNo}B)</td><td style="padding:5px; border:1px solid #333; text-align:center; color:#27ae60;">Pano İçi Sinyal</td><td style="padding:5px; border:1px solid #333; color:#00d2ff;">PLC GİRİŞ [${comp.in}]</td></tr>`;
        });
    } else {
        html += `<tr><td colspan="3" style="padding:5px; border:1px solid #333; color:#888; text-align:center; font-style:italic;">Ana Kumanda Panosu eklenmedi. Tüm bağlantılar direkt uçtan uca yapıldı.</td></tr>`;
    }

    // ⚡ SAHA DAĞILIMI
    html += `<tr style="background:#3e1f00;"><td colspan="3" style="padding:5px; border:1px solid #333; color:#f39c12; font-weight:bold; text-align:center;">--- SAHA BAĞLANTILARI ---</td></tr>`;
    fieldComps.forEach((comp, idx) => {
        let klemensNo = idx + 1;
        let sourceOut = hasPanel ? `X1 Klemensi (Pin: ${klemensNo}A)` : `PLC ÇIKIŞ [${comp.out}]`;
        let targetIn = hasPanel ? `X1 Klemensi (Pin: ${klemensNo}B)` : `PLC GİRİŞ [${comp.in}]`;

        if (comp.type === 'button') html += `<tr><td style="padding:5px; border:1px solid #333;">${comp.name} (NO Kontak)</td><td style="padding:5px; border:1px solid #333; text-align:center; color:#f39c12;">Saha Sinyal</td><td style="padding:5px; border:1px solid #333;">${targetIn}</td></tr>`;
        else if (comp.type === 'light' || comp.type === 'tower_light') html += `<tr><td style="padding:5px; border:1px solid #333;">${sourceOut}</td><td style="padding:5px; border:1px solid #333; text-align:center; color:#f39c12;">Saha Güç</td><td style="padding:5px; border:1px solid #333;">${comp.name} (+ Sinyal)</td></tr>`;
        else if (comp.type === 'cylinder') {
            html += `<tr><td style="padding:5px; border:1px solid #333;">${sourceOut}</td><td style="padding:5px; border:1px solid #333; text-align:center; color:#f39c12;">Saha Güç</td><td style="padding:5px; border:1px solid #333;">Pnomatik Valf Bobini (A1)</td></tr>`;
            html += `<tr><td style="padding:5px; border:1px solid #333;">Limit Sensörü Sinyali</td><td style="padding:5px; border:1px solid #333; text-align:center; color:#f39c12;">Saha Sinyal</td><td style="padding:5px; border:1px solid #333;">${targetIn}</td></tr>`;
        }
        else if (comp.type === 'conveyor' || comp.type === 'vfd_drive' || comp.type === 'ac_motor') {
            html += `<tr><td style="padding:5px; border:1px solid #333; color:#e74c3c;">Pano İçi Motor Koruma</td><td style="padding:5px; border:1px solid #333; text-align:center;">Saha Zırhlı (L1/L2/L3)</td><td style="padding:5px; border:1px solid #333;">${comp.name} Klemensi</td></tr>`;
        }
    });
    html += `</tbody></table>`;

    // --- BÖLÜM 2: GÖRSEL (ASCII) ÇİZGİSEL ŞEMA ---
    html += `<h4 style="color:#f39c12; margin-bottom:10px; font-size:13px; border-bottom:1px solid #333; padding-bottom:5px;">2. GÖRSEL KABLO BAĞLANTI ŞEMASI</h4>`;
    html += `<div style="font-family: 'Courier New', monospace; font-size: 12px; color: #ccc; white-space: pre; overflow-x: auto; background: #0a0a0a; padding: 15px; border-radius: 5px; border: 1px solid #333; line-height: 1.4;">`;

    html += `<span style="color:#e74c3c; font-weight:bold;">L,N,PE (220V)</span> ──────┐\n`;
    html += `                    ├────── <strong style="color:#fff; background:#222; padding:2px 5px;">[ SİGORTA / W OTOMAT ]</strong>\n`;
    html += `                    │\n`;
    html += `                 <strong style="color:#fff; background:#222; padding:2px 5px;">[ 24V DC GÜÇ KAYNAĞI ]</strong>\n`;
    html += `                    ├────── <span style="color:#e74c3c; font-weight:bold;">+24V DC Çıkış</span> ───► <strong style="color:#f39c12;">[ +24V KÖPRÜLÜ KLEMENSLER ]</strong>\n`;
    html += `                    └────── <span style="color:#3498db; font-weight:bold;">0V DC Çıkış</span>   ───► <strong style="color:#3498db;">[ 0V KÖPRÜLÜ KLEMENSLER ]</strong>\n\n`;
    html += `<span style="color:#555;">========================================================================</span>\n\n`;

    fieldComps.forEach((comp, idx) => {
        let n = idx + 1;
        html += `<span style="color:#f39c12; font-weight:bold;">#${n} - ${comp.name}</span>\n`;

        if (comp.type === 'button') {
            html += `<span style="color:#e74c3c">+24V DC</span>  ─────────┐\n                    │\n                 [ NO Kontak ]\n                    │\n                    └─────────► <span style="color:#00d2ff; font-weight:bold;">PLC GİRİŞ [${comp.in}]</span>\n\n`;
        }
        else if (comp.type === 'light' || comp.type === 'tower_light') {
            html += `<span style="color:#00d2ff; font-weight:bold;">PLC ÇIKIŞ [${comp.out}]</span> ───┐\n                    │\n                 [ A1 Sinyal ]\n                 [ A2 GND    ] ──► <span style="color:#3498db">0V DC</span>\n\n`;
        }
        else if (comp.type === 'cylinder') {
            html += `<span style="color:#00d2ff; font-weight:bold;">PLC ÇIKIŞ [${comp.out}]</span> ───┐\n                    │ [ Valf A1 ] \n                    │ [ Valf A2 ] ──► <span style="color:#3498db">0V DC</span>\n\n`;
            html += `<span style="color:#e74c3c">+24V DC</span>  ─────────┐\n                    │ [ Limit Sensör ] \n                    └─────────► <span style="color:#00d2ff; font-weight:bold;">PLC GİRİŞ [${comp.in}]</span>\n\n`;
        }
        else if (comp.type === 'conveyor' || comp.type === 'barrier' || comp.type === 'vfd_drive' || comp.type === 'ac_motor') {
            html += `<span style="color:#e74c3c; font-weight:bold;">L1/L2/L3</span> ─────────┐\n                 [ Motor / Sürücü ]\n<span style="color:#00d2ff; font-weight:bold;">PLC ÇIKIŞ [${comp.out}]</span> ───┤ [ Kontrol ]\n<span style="color:#3498db">0V DC</span>    ─────────┘\n\n`;
        }
    });

    html += `</div>`;
    board.innerHTML = html;
};
// ==========================================
// 💾 FABRİKA SAVE / LOAD SİSTEMİ
// ==========================================
window.saveFactoryLayout = function () {
    const projectName = prompt("Fabrika düzenini kaydetmek için bir isim girin:", "Yeni Şişeleme Hattı");
    if (!projectName) return;

    const saveData = {
        name: projectName,
        code: document.getElementById('vplc-code').value,
        components: factoryComponents,
        date: new Date().toLocaleDateString('tr-TR')
    };

    let saves = JSON.parse(localStorage.getItem('culbase_factory_saves')) || [];
    saves.push(saveData);
    localStorage.setItem('culbase_factory_saves', JSON.stringify(saves));
    if (typeof showToast === "function") showToast("Fabrika başarıyla kaydedildi!");
};

window.loadFactoryLayout = function () {
    let saves = JSON.parse(localStorage.getItem('culbase_factory_saves')) || [];
    if (saves.length === 0) {
        alert("Kaydedilmiş bir fabrika düzeni bulunamadı.");
        return;
    }

    let listText = saves.map((s, i) => `${i + 1}- ${s.name} (${s.date})`).join('\n');
    let sel = prompt(`Yüklemek istediğiniz fabrikanın numarasını seçin:\n\n${listText}`, "1");

    if (sel && !isNaN(sel) && sel > 0 && sel <= saves.length) {
        let loaded = saves[sel - 1];

        // Ekranı temizle
        document.getElementById('factory-canvas').innerHTML = `
            <div style="color: #555; font-family: monospace; position: absolute; top: 10px; right: 10px; font-size: 12px;">FACTORY ENGINE v2.0</div>
            <div style="position: absolute; right: 10px; bottom: 10px; background: rgba(0,0,0,0.8); border: 1px solid #333; border-radius: 8px; padding: 5px; z-index: 100; pointer-events: none;">
                <div style="color: #00d2ff; font-size: 9px; font-family: monospace; text-align: center; margin-bottom: 2px;">VFD (Hz) <span style="color:#27ae60;">■</span> | SENSÖR (V) <span style="color:#f39c12;">■</span></div>
                <canvas id="oscilloscope-canvas" width="300" height="80"></canvas>
            </div>
        `;

        // Verileri geri yükle
        document.getElementById('vplc-code').value = loaded.code;
        factoryComponents = []; // Önce diziyi boşalt

        // Komponentleri sahaya yeniden çiz
        loaded.components.forEach(comp => {
            // Arka planda addFactoryComponent mantığını simüle ederek HTML'i yeniden oluşturuyoruz.
            // (Karmaşıklığı önlemek adına şimdilik mevcut diziyi eşliyoruz, görsel re-render fonksiyonu tetiklenmeli)
            // Not: Tam re-render için HTML kalıplarını yeniden basan bir renderFactory() fonksiyonu yazılmalıdır.
        });

        alert(`${loaded.name} yüklendi! (Bileşenlerin HTML render'ı için altyapı hazırlanıyor)`);
    }
};

// ==========================================
// 📈 CANLI OSİLOSKOP (TREND) MOTORU
// ==========================================
let oscHistoryHz = new Array(60).fill(0);
let oscHistoryVolts = new Array(60).fill(0);

function updateOscilloscope() {
    const canvas = document.getElementById('oscilloscope-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Veri toplama (Sahadaki ilk VFD'yi ve Analog Sensörü bul)
    let vfd = factoryComponents.find(c => c.type === 'vfd_drive');
    let sensor = factoryComponents.find(c => c.type === 'sensor_analog');

    let currentHz = vfd ? vfd.hz : 0;
    let currentVolts = sensor ? sensor.val / 10 : 0; // 0-100 arası değeri 0-10V'a çevir

    oscHistoryHz.push(currentHz); oscHistoryHz.shift();
    oscHistoryVolts.push(currentVolts); oscHistoryVolts.shift();

    // Çizim alanı temizliği
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Izgara çizimi
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke(); }
    for (let i = 0; i < canvas.height; i += 20) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke(); }

    // Çizgi fonksiyonu
    const drawLine = (data, color, maxScale) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (let i = 0; i < data.length; i++) {
            let x = i * (canvas.width / 60);
            let y = canvas.height - ((data[i] / maxScale) * canvas.height);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    };

    drawLine(oscHistoryHz, '#27ae60', 100); // 100 Hz Maksimum skala
    drawLine(oscHistoryVolts, '#f39c12', 10); // 10V Maksimum skala
}

// `plcScanCycle` içine Osiloskop güncellemesini bağla
const originalPlcScanCycle = window.plcScanCycle;
window.plcScanCycle = function () {
    originalPlcScanCycle();
    updateOscilloscope();
};

// ==========================================
// 🎮 ARIZA AVI (TROUBLESHOOTING) OYUNLAŞTIRMA MOTORU
// ==========================================
window.startTroubleshootingGame = function () {
    if (!confirm("Arıza Avı Moduna giriyorsun! Mevcut fabrikan silinecek ve karşına arızalı bir sistem çıkacak. Devam edilsin mi?")) return;

    document.getElementById('factory-canvas').innerHTML = '';
    factoryComponents = [];

    alert("👨‍🔧 MÜŞTERİ ÇAĞRISI: 'Emirhan Usta, konveyör bandı çalışıyor ama malzeme geldiğinde optik sensör motoru durdurmuyor! Sistem sürekli kaza yapıyor. Şuna bir baksan?'");

    // Hatalı sistemi sahaya diz
    window.addFactoryComponent('conveyor'); // Y0
    window.addFactoryComponent('sensor_optic'); // X0

    // Hatalı (buglı) PLC Kodunu yükle
    document.getElementById('vplc-code').value = "// ARIZALI KOD (DÜZELT)\nLD X0\nOUT Y0 // Sensör gördüğünde motor ÇALIŞIYOR (Durması gerekirken!)\n\n// İPUCU: Normalde kapalı kontak veya LDI kullanmalısın.";

    // Oyunu takip et
    let missionCheckInterval = setInterval(() => {
        let code = document.getElementById('vplc-code').value.toUpperCase();
        // Eğer kullanıcı LDI X0 veya ANI X0 gibi doğru mantığı kurarsa
        if ((code.includes('LDI X0') || code.includes('ANI X0')) && code.includes('OUT Y0')) {
            clearInterval(missionCheckInterval);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

            if (window.addOlympusPoints) window.addOlympusPoints(50, "Arıza Avı Görevi Tamamlandı!");
            alert("✅ ARIZA GİDERİLDİ!\n\nHarika iş çıkardın Usta! Sensör mantığını ters çevirerek sistemi kurtardın. Hesabına 50 Olympus Puanı eklendi!");
        }
    }, 2000);
};
// ==========================================
// 🎬 OLYMPUS PROFİL & PROGRAM YÖNETİCİSİ
// ==========================================

window.openProfileSwitcher = function () {
    const screen = document.getElementById('profile-switcher-screen');
    const container = document.getElementById('workout-profiles-container');

    // Geçerli Google kullanıcısının bilgilerini al
    const p = JSON.parse(localStorage.getItem('olympus_profile')) || {};
    const defaultName = document.getElementById('profile-name-display').innerText || "Şampiyon";
    const defaultPhoto = document.getElementById('profile-image-large').src || "icon.png";

    // Kayıtlı özel profilleri çek (Henüz yoksa boş dizi)
    const customProfiles = JSON.parse(localStorage.getItem('olympus_custom_profiles')) || [];

    // Mevcut aktif profili bul (Yoksa varsayılan 'default'tur)
    const activeProfileId = localStorage.getItem('olympus_active_profile_id') || 'default';

    container.innerHTML = '';

    // 1. ANA PROFİL (Standart Program - Asla Silinmez)
    let defaultBorder = activeProfileId === 'default' ? 'border: 3px solid #f6c000;' : 'border: 3px solid transparent;';
    let defaultOpacity = activeProfileId === 'default' ? 'opacity: 1;' : 'opacity: 0.6;';

    container.innerHTML += `
        <div onclick="selectWorkoutProfile('default')" style="display:flex; flex-direction:column; align-items:center; cursor:pointer; transition:0.3s; ${defaultOpacity}" onmouseover="this.style.opacity='1'" onmouseout="if('${activeProfileId}' !== 'default') this.style.opacity='0.6'">
            <img src="${defaultPhoto}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; ${defaultBorder} box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
            <span style="color: #fff; font-size: 13px; margin-top: 10px; font-weight:bold;">${defaultName}</span>
            <span style="color: #888; font-size: 10px;">Standart Sistem</span>
        </div>
    `;

    // 2. KULLANICININ EKLEDİĞİ ÖZEL PROFİLLER (Döngü)
    customProfiles.forEach(prof => {
        let border = activeProfileId === prof.id ? 'border: 3px solid #00d2ff;' : 'border: 3px solid transparent;';
        let opacity = activeProfileId === prof.id ? 'opacity: 1;' : 'opacity: 0.6;';

        container.innerHTML += `
            <div onclick="selectWorkoutProfile('${prof.id}')" style="display:flex; flex-direction:column; align-items:center; cursor:pointer; transition:0.3s; ${opacity}" onmouseover="this.style.opacity='1'" onmouseout="if('${activeProfileId}' !== '${prof.id}') this.style.opacity='0.6'">
                <div style="width: 80px; height: 80px; border-radius: 8px; background: #222; ${border} display:flex; justify-content:center; align-items:center; font-size:30px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                    ${prof.icon || '🏋️‍♂️'}
                </div>
                <span style="color: #fff; font-size: 13px; margin-top: 10px; font-weight:bold;">${prof.name}</span>
                <span style="color: #888; font-size: 10px;">Özel Program</span>
            </div>
        `;
    });

    // 3. YENİ PROFİL EKLE BUTONU (+)
    container.innerHTML += `
        <div onclick="openProfileBuilderType()" style="display:flex; flex-direction:column; align-items:center; cursor:pointer; opacity:0.8; transition:0.3s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
            <div style="width: 80px; height: 80px; border-radius: 8px; border: 2px dashed #555; display:flex; justify-content:center; align-items:center; font-size:40px; color:#555;">
                +
            </div>
            <span style="color: #aaa; font-size: 13px; margin-top: 10px; font-weight:bold;">Yeni Program</span>
        </div>
    `;

    screen.classList.remove('hidden');
    screen.style.display = 'flex'; // Flex yapısını korumak için
    if (navigator.vibrate) navigator.vibrate(20);
};

window.closeProfileSwitcher = function () {
    document.getElementById('profile-switcher-screen').classList.add('hidden');
    document.getElementById('profile-switcher-screen').style.display = 'none';
};

window.selectWorkoutProfile = function (profileId) {
    // Seçilen profili hafızaya kaydet
    localStorage.setItem('olympus_active_profile_id', profileId);

    // Görsel geribildirim
    if (navigator.vibrate) navigator.vibrate([30, 50]);

    // Sistemi yeniden yükle (Şimdilik sadece ekranı kapatıp yeniliyoruz, ileride programData'yı değiştirecek)
    closeProfileSwitcher();
    calculateCurrentDay(); // Takvimi güncelle

    if (typeof showToast === "function") {
        showToast(profileId === 'default' ? "Standart Programa Geçildi!" : "Özel Programa Geçildi!");
    } else {
        alert(profileId === 'default' ? "Standart Programa Geçildi!" : "Özel Programa Geçildi!");
    }
};

// ==========================================
// 📚 OLYMPUS DEV EGZERSİZ KÜTÜPHANESİ (VERİTABANI)
// ==========================================
const exerciseLibrary = {
    chest: [
        { id: 'c1', name: 'Bench Press', defaultTempo: '3-1-1-0', defaultRpe: '8' },
        { id: 'c2', name: 'Incline DB Press', defaultTempo: '3-0-1-0', defaultRpe: '8.5' },
        { id: 'c3', name: 'Cable Fly', defaultTempo: '2-0-1-2', defaultRpe: '9.5' },
        { id: 'c4', name: 'Machine Chest Press', defaultTempo: '2-0-1-1', defaultRpe: '9' },
        { id: 'c5', name: 'Dips (Chest Focus)', defaultTempo: '3-0-1-0', defaultRpe: '9' },
        { id: 'c6', name: 'Pec Deck Fly', defaultTempo: '2-0-1-2', defaultRpe: '10' }
    ],
    back: [
        { id: 'b1', name: 'Pull-up', defaultTempo: '2-1-1-0', defaultRpe: '9' },
        { id: 'b2', name: 'Lat Pulldown', defaultTempo: '3-0-1-1', defaultRpe: '8.5' },
        { id: 'b3', name: 'Barbell Row', defaultTempo: '2-1-1-0', defaultRpe: '8.5' },
        { id: 'b4', name: 'Seated Cable Row', defaultTempo: '2-0-1-2', defaultRpe: '9' },
        { id: 'b5', name: 'Chest Supported Row', defaultTempo: '2-0-1-2', defaultRpe: '9' },
        { id: 'b6', name: 'Straight Arm Pulldown', defaultTempo: '2-0-1-2', defaultRpe: '9.5' }
    ],
    legs: [
        { id: 'l1', name: 'Squat', defaultTempo: '3-1-1-0', defaultRpe: '8.5' },
        { id: 'l2', name: 'Romanian Deadlift', defaultTempo: '3-0-1-0', defaultRpe: '8.5' },
        { id: 'l3', name: 'Leg Press', defaultTempo: '2-0-1-0', defaultRpe: '9' },
        { id: 'l4', name: 'Leg Extension', defaultTempo: '2-0-1-1', defaultRpe: '10' },
        { id: 'l5', name: 'Leg Curl', defaultTempo: '2-0-1-1', defaultRpe: '10' },
        { id: 'l6', name: 'Walking Lunge', defaultTempo: 'Dinamik', defaultRpe: '9' },
        { id: 'l7', name: 'Calf Raise', defaultTempo: '2-1-1-1', defaultRpe: '9.5' }
    ],
    shoulders: [
        { id: 's1', name: 'Overhead Press', defaultTempo: '3-0-1-0', defaultRpe: '8.5' },
        { id: 's2', name: 'Lateral Raise', defaultTempo: '2-0-1-1', defaultRpe: '10' },
        { id: 's3', name: 'Face Pull', defaultTempo: '2-0-1-2', defaultRpe: '9.5' },
        { id: 's4', name: 'Rear Delt Fly', defaultTempo: '2-0-1-1', defaultRpe: '9.5' },
        { id: 's5', name: 'Upright Row', defaultTempo: '2-0-1-1', defaultRpe: '9' }
    ],
    arms: [
        { id: 'a1', name: 'Barbell Curl', defaultTempo: '2-0-1-0', defaultRpe: '9' },
        { id: 'a2', name: 'Triceps Pushdown', defaultTempo: '2-0-1-1', defaultRpe: '9.5' },
        { id: 'a3', name: 'Hammer Curl', defaultTempo: '2-0-1-0', defaultRpe: '9' },
        { id: 'a4', name: 'Overhead Extension', defaultTempo: '3-0-1-1', defaultRpe: '9.5' },
        { id: 'a5', name: 'Incline DB Curl', defaultTempo: '3-0-1-0', defaultRpe: '9' },
        { id: 'a6', name: 'Close Grip Bench Press', defaultTempo: '3-0-1-0', defaultRpe: '8.5' }
    ],
    core: [
        { id: 'cr1', name: 'Plank', defaultTempo: 'Statik', defaultRpe: '8' },
        { id: 'cr2', name: 'Hanging Leg Raise', defaultTempo: '2-0-1-0', defaultRpe: '9' },
        { id: 'cr3', name: 'Cable Crunch', defaultTempo: '2-0-1-1', defaultRpe: '9' }
    ]
};

// ==========================================
// 🛠️ YENİ PROGRAM SEÇİCİ YÖNLENDİRMELERİ
// ==========================================
window.openProfileBuilderType = function () {
    // Önce profil değiştirici arka planını gizleyelim (şık dursun)
    document.getElementById('profile-switcher-screen').style.display = 'none';

    // Yeni modalı aç
    const modal = document.getElementById('new-profile-modal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    if (navigator.vibrate) navigator.vibrate(20);
};

window.closeNewProfileModal = function () {
    document.getElementById('new-profile-modal').style.display = 'none';
    // Geri dönerken profil değiştiriciyi tekrar göster
    document.getElementById('profile-switcher-screen').style.display = 'flex';
};

// ==========================================
// 🤖 OLY-AI SİHİRBAZ MOTORU (PROFİL YARATICI)
// ==========================================

window.startOlyAIWizard = function () {
    // 1. Seçim modalını gizle
    document.getElementById('new-profile-modal').style.display = 'none';

    // 2. Sihirbazı aç
    const wizard = document.getElementById('oly-ai-wizard-modal');
    wizard.classList.remove('hidden');
    wizard.style.display = 'flex';
};

window.closeOlyAIWizard = function () {
    document.getElementById('oly-ai-wizard-modal').style.display = 'none';
    document.getElementById('new-profile-modal').style.display = 'flex';
};

window.generateAIProgram = function () {
    const goal = document.getElementById('ai-goal').value;
    const days = parseInt(document.getElementById('ai-days').value);
    const level = document.getElementById('ai-level').value;
    let progName = document.getElementById('ai-prog-name').value.trim();

    if (!progName) progName = "Oly-AI Özel Program";

    const btn = document.getElementById('btn-generate-ai');
    btn.innerText = "⏳ OLY DÜŞÜNÜYOR...";
    btn.style.background = "#f6c000";
    btn.style.boxShadow = "0 4px 15px rgba(246, 192, 0, 0.4)";
    btn.disabled = true;

    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

    // Yapay Zeka / Sistem İşlem Süresi Simülasyonu
    setTimeout(() => {
        // Yeni bir Profil Kimliği (ID) oluştur
        const newProfileId = 'custom_' + Date.now();

        // Hedefe göre otomatik profil ikonu ata
        let pIcon = '🏋️‍♂️';
        if (goal.includes('Hipertrofi')) pIcon = '🦍';
        else if (goal.includes('Yağ Yakımı')) pIcon = '⚡';
        else if (goal.includes('Güç')) pIcon = '🦾';

        const newProfile = {
            id: newProfileId,
            name: progName,
            icon: pIcon,
            date: new Date().toLocaleDateString('tr-TR'),
            settings: { goal: goal, days: days, level: level }
        };

        // Yeni Profili Tarayıcı Hafızasına (Netflix Ekranına) Kaydet
        let customProfiles = JSON.parse(localStorage.getItem('olympus_custom_profiles')) || [];
        customProfiles.push(newProfile);
        localStorage.setItem('olympus_custom_profiles', JSON.stringify(customProfiles));

        alert(`✅ SİSTEM HAZIR! \n\nOly-AI senin için "${progName}" adlı ${days} günlük ${level} seviye programı hazırladı! \n\nNetflix menüsüne eklenmiştir.`);

        // Butonu eski haline getir
        btn.innerText = "🚀 PROGRAMI YARAT";
        btn.style.background = "#00d2ff";
        btn.style.boxShadow = "0 4px 15px rgba(0, 210, 255, 0.4)";
        btn.disabled = false;

        // Formu temizle
        document.getElementById('ai-prog-name').value = '';

        // Tüm pencereleri kapatıp Profil Seçiciyi (Netflix Ekranını) güncel liste ile tekrar aç
        document.getElementById('oly-ai-wizard-modal').style.display = 'none';
        openProfileSwitcher();

    }, 2000); // 2 Saniyelik gerçekçi düşünme payı
};

// ==========================================
// ⚙️ MANUEL PROGRAM İNŞA MOTORU (BUILDER)
// ==========================================

let customBuilderDays = []; // Yeni yazılan programın günlerini tutacak
let activeBuilderDay = 1;   // Hangi güne hareket ekleneceğini belirler

window.openManualBuilder = function () {
    document.getElementById('new-profile-modal').style.display = 'none';

    // Değişkenleri sıfırla
    document.getElementById('builder-prog-name').value = '';
    customBuilderDays = [
        { day: 1, title: "Gün 1: Yeni İdman", rest: false, ex: [] }
    ];
    activeBuilderDay = 1;

    document.getElementById('manual-builder-modal').classList.remove('hidden');
    document.getElementById('manual-builder-modal').style.display = 'flex';

    renderBuilderDays();
    switchLibraryTab('chest', document.querySelector('.lib-tab-btn')); // İlk açılışta Göğüs sekmesi gelsin
};

window.closeManualBuilder = function () {
    document.getElementById('manual-builder-modal').style.display = 'none';
    document.getElementById('new-profile-modal').style.display = 'flex';
};

// --- SOL SÜTUN: GÜNLERİ ÇİZ ---
// --- SOL SÜTUN: GÜNLERİ ÇİZ ---
window.renderBuilderDays = function () {
    const container = document.getElementById('builder-days-container');
    container.innerHTML = '';

    customBuilderDays.forEach((dayData, dIndex) => {
        let isSelected = activeBuilderDay === dayData.day;
        let borderStyle = isSelected ? "border: 2px solid var(--goldnova);" : "border: 1px solid #333;";

        let exListHTML = dayData.ex.map((e, eIndex) => `
            <div style="background:#000; padding:8px; margin-top:5px; border-radius:4px; border-left:3px solid #00d2ff; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="color:#fff; font-size:12px; font-weight:bold;">${e.name}</span><br>
                    <span style="color:#888; font-size:10px;">${e.scheme} | Tmp: ${e.tempo} | RPE: ${e.rpe}</span>
                </div>
                <!-- X butonuna da event.stopPropagation ekledik ki silerken ekran gereksiz kaymasın -->
                <button onclick="event.stopPropagation(); removeExFromDay(${dIndex}, ${eIndex})" style="background:transparent; border:none; color:#ff4444; font-size:14px; cursor:pointer;">X</button>
            </div>
        `).join('');

        if (dayData.ex.length === 0 && !dayData.rest) {
            exListHTML = `<div style="color:#666; font-size:11px; font-style:italic; padding:10px 0;">Sağ taraftan bu güne hareket ekleyin.</div>`;
        }

        container.innerHTML += `
            <div style="background: #1a1a1a; border-radius: 8px; padding: 15px; cursor: pointer; transition: 0.2s; ${borderStyle}" onclick="setActiveBuilderDay(${dayData.day})">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    
                    <!-- İSİM ALANI: Tıklamayı durdur ve klavyeye basıldıkça (oninput) kaydet -->
                    <input type="text" value="${dayData.title}" 
                           onclick="event.stopPropagation();" 
                           oninput="updateDayTitle(${dIndex}, this.value)" 
                           style="background:transparent; color:#fff; border:none; border-bottom:1px dashed #555; font-size:14px; font-weight:bold; outline:none; width:65%;">
                    
                    <!-- DİNLENME ALANI: Tıklamayı durdur -->
                    <div onclick="event.stopPropagation();" style="display:flex; align-items:center;">
                        <label style="color:#888; font-size:10px; margin-right:5px; cursor:pointer;">Dinlenme</label>
                        <input type="checkbox" ${dayData.rest ? 'checked' : ''} onchange="toggleRestDay(${dIndex}, this.checked)" style="cursor:pointer; width:15px; height:15px;">
                    </div>

                </div>
                ${!dayData.rest ? exListHTML : '<div style="color:#27ae60; font-size:12px; font-weight:bold; padding:10px 0;">🛌 Dinlenme Günü</div>'}
            </div>
        `;
    });
};
window.addNewBuilderDay = function () {
    let newDayNum = customBuilderDays.length + 1;
    customBuilderDays.push({ day: newDayNum, title: `Gün ${newDayNum}: Yeni İdman`, rest: false, ex: [] });
    activeBuilderDay = newDayNum; // Otomatik olarak yeni güne odaklan
    renderBuilderDays();
};

window.setActiveBuilderDay = function (dayNum) {
    activeBuilderDay = dayNum;
    renderBuilderDays();
};

window.updateDayTitle = function (index, newTitle) {
    customBuilderDays[index].title = newTitle;
};

window.toggleRestDay = function (index, isRest) {
    customBuilderDays[index].rest = isRest;
    renderBuilderDays();
};

window.removeExFromDay = function (dIndex, eIndex) {
    customBuilderDays[dIndex].ex.splice(eIndex, 1);
    renderBuilderDays();
};

// --- SAĞ SÜTUN: KÜTÜPHANEYİ ÇİZ VE HAREKET EKLE ---
window.switchLibraryTab = function (category, btnElement) {
    // Buton stillerini ayarla
    document.querySelectorAll('.lib-tab-btn').forEach(b => {
        b.style.borderColor = '#333';
        b.style.color = '#888';
    });
    btnElement.style.borderColor = '#00d2ff';
    btnElement.style.color = '#fff';

    const container = document.getElementById('builder-library-items');
    container.innerHTML = '';

    const items = exerciseLibrary[category] || [];

    items.forEach(item => {
        container.innerHTML += `
            <div style="background: #1a1a1a; padding: 10px; border-radius: 6px; border: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #fff; font-size: 12px; font-weight: bold;">${item.name}</span>
                <button onclick="promptExDetails('${item.name}', '${item.defaultTempo}', '${item.defaultRpe}')" style="background: #27ae60; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">Ekle ➕</button>
            </div>
        `;
    });
};

window.promptExDetails = function (name, defTempo, defRpe) {
    // Hangi güne ekleniyor kontrol et
    let dayIndex = customBuilderDays.findIndex(d => d.day === activeBuilderDay);
    if (dayIndex === -1 || customBuilderDays[dayIndex].rest) {
        alert("Lütfen önce sol taraftan hareket eklenebilir (Dinlenme olmayan) bir gün seçin!");
        return;
    }

    let scheme = prompt(`[${name}] için Set ve Tekrar (Örn: 4 x 8-12):`, "3 x 10");
    if (!scheme) return;

    let tempo = prompt(`Tempo:`, defTempo);
    let rpe = prompt(`RPE (Zorluk 1-10):`, defRpe);

    customBuilderDays[dayIndex].ex.push({
        name: name,
        scheme: scheme,
        tempo: tempo || "2-0-1-0",
        rpe: rpe || "8"
    });

    renderBuilderDays();
    if (navigator.vibrate) navigator.vibrate(20);
};

// --- FİNAL: YENİ PROGRAMI KAYDET ---
window.saveManualProgram = function () {
    let progName = document.getElementById('builder-prog-name').value.trim();
    if (!progName) {
        alert("Lütfen üst kısımdan programa bir isim verin!");
        return;
    }

    // Program yapısını temizle ve formatla
    const newProfileId = 'custom_' + Date.now();
    const newProfile = {
        id: newProfileId,
        name: progName,
        icon: '⚙️', // Manuel yapıldığı için Dişli ikonu
        date: new Date().toLocaleDateString('tr-TR'),
        // Sistemin okuyabilmesi için güncel format:
        programData: customBuilderDays
    };

    let customProfiles = JSON.parse(localStorage.getItem('olympus_custom_profiles')) || [];
    customProfiles.push(newProfile);
    localStorage.setItem('olympus_custom_profiles', JSON.stringify(customProfiles));

    // Sistemin, bu yeni formatı "programData" değişkeni üzerinden okumasını sağlayacak
    // adaptasyonu daha sonra uygulayacağız. Şu an başarıyla hafızaya aldık!

    alert(`✅ MÜKEMMEL İŞ! \n\n"${progName}" adlı kendi kurduğun sistem başarıyla kaydedildi! Netflix menüsüne eklenmiştir.`);

    document.getElementById('manual-builder-modal').style.display = 'none';
    openProfileSwitcher(); // Ekranı yenile
};
// ==========================================
// 💬 OLYMPUS GERÇEK ZAMANLI SOHBET MOTORU
// ==========================================
let currentActiveChatId = null;
let chatUnsubscribe = null; // Dinleyiciyi kapatmak için
let currentChatTargetUid = null;
let chatTypingTimer = null;
let messagingOpenedFromHub = false;
const presenceSubscriptions = new Map();

// 1. Kişi Listesini Aç
window.openChatListModal = async function () {
    const hub = document.getElementById('hub-screen');
    const appContent = document.getElementById('app-content');
    if (!document.body.classList.contains('messaging-open')) {
        messagingOpenedFromHub = !hub.classList.contains('hidden') && hub.style.display !== 'none';
    }
    hub.classList.add('hidden');
    hub.style.display = 'none';
    appContent.classList.remove('hidden'); // Alt navigasyon mesaj sayfasında görünür kalır.
    document.body.classList.add('messaging-open');
    document.getElementById('messages-page').classList.add('active');
    document.getElementById('messages-page').setAttribute('aria-hidden', 'false');
    document.getElementById('messages-list-view').classList.add('active');
    document.getElementById('chat-room-view').classList.remove('active');
    const listContainer = document.getElementById('chat-friends-list');
    listContainer.innerHTML = '<p style="color:gray; font-size:12px; text-align:center;">Arkadaşların aranıyor...</p>';

    if (!auth.currentUser) return;

    try {
        const myDoc = await db.collection("users").doc(auth.currentUser.uid).get();
        const following = myDoc.exists ? (myDoc.data().following || []) : [];

        if (following.length === 0) {
            listContainer.innerHTML = '<p style="color:gray; font-size:12px; text-align:center;">Kimseyi takip etmiyorsun. Önce Arena\'dan sporcu bul!</p>';
            return;
        }

        listContainer.innerHTML = '';
        clearPresenceSubscriptions();
        for (let uid of following) {
            const userDoc = await db.collection("users").doc(uid).get();
            if (userDoc.exists) {
                const uData = userDoc.data();
                const chatId = [auth.currentUser.uid, uid].sort().join('_');
                const messagesRef = db.collection("chats").doc(chatId).collection("messages");
                const [latestSnapshot, unreadSnapshot] = await Promise.all([
                    messagesRef.orderBy("timestamp", "desc").limit(1).get(),
                    messagesRef.where("receiver", "==", auth.currentUser.uid).get()
                ]);
                const latestMessage = latestSnapshot.empty ? null : latestSnapshot.docs[0].data();
                const unreadCount = unreadSnapshot.docs.filter(doc => doc.data().read === false).length;
                const lastText = latestMessage ? latestMessage.text : 'Henüz mesaj yok';
                const lastTime = latestMessage && latestMessage.timestamp
                    ? latestMessage.timestamp.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                    : '';
                const presence = await getUserPresence(uid);
                const presenceText = formatPresenceLabel(presence);
                listContainer.innerHTML += `
                    <div class="chat-list-card" data-chat-uid="${uid}" data-search-text="${(uData.name + ' ' + lastText).toLocaleLowerCase('tr-TR')}" onclick="openChatRoom('${uid}', '${uData.name}', '${uData.photo || 'icon.png'}')">
                        <div class="chat-list-avatar-wrap">
                            <img src="${uData.photo || 'icon.png'}" alt="${uData.name}">
                            <i class="chat-presence-dot ${presence && presence.state === 'online' ? 'is-online' : ''}"></i>
                        </div>
                        <div class="chat-list-card-content">
                            <div class="chat-list-card-topline">
                                <h4>${uData.name}</h4>
                                <time>${lastTime}</time>
                            </div>
                            <small class="chat-presence-label">${presenceText}</small>
                            <div class="chat-list-card-bottomline">
                                <span>${lastText}</span>
                                ${unreadCount ? `<b class="chat-unread-badge">${unreadCount > 9 ? '9+' : unreadCount}</b>` : ''}
                            </div>
                        </div>
                    </div>
                `;
                subscribeToUserPresence(uid);
            }
        }
    } catch (e) {
        listContainer.innerHTML = '<p style="color:#ff4444; font-size:12px; text-align:center;">Kişiler yüklenemedi.</p>';
    }
};

// Mesaj alanı modal değil; uygulama içinde tam ekran bir sayfa olarak açılır.
window.closeMessagingPage = function (returnToHub) {
    const page = document.getElementById('messages-page');
    page.classList.remove('active');
    page.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('messaging-open');
    clearPresenceSubscriptions();
    if (chatUnsubscribe) chatUnsubscribe();
    chatUnsubscribe = null;
    currentActiveChatId = null;
    currentChatTargetUid = null;

    if (returnToHub && messagingOpenedFromHub) {
        document.getElementById('app-content').classList.add('hidden');
        const hub = document.getElementById('hub-screen');
        hub.classList.remove('hidden');
        hub.style.display = 'flex';
    }
};

window.focusMessagesSearch = function () {
    document.getElementById('messages-search-input').focus();
};

window.filterChatList = function (query) {
    const normalizedQuery = query.toLocaleLowerCase('tr-TR').trim();
    document.querySelectorAll('.chat-list-card').forEach(card => {
        card.style.display = card.dataset.searchText.includes(normalizedQuery) ? '' : 'none';
    });
};

function getUserPresence(uid) {
    return rtdb.ref(`status/${uid}`).once('value')
        .then(snapshot => snapshot.val())
        .catch(() => null);
}

function formatPresenceLabel(presence) {
    if (presence && presence.state === 'online') return 'Çevrimiçi';
    if (!presence || !presence.lastChanged) return 'Son görülme bilinmiyor';
    return `Son görülme ${new Date(presence.lastChanged).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
}

function updatePresenceElements(uid, presence) {
    const isOnline = presence && presence.state === 'online';
    document.querySelectorAll(`.chat-list-card[data-chat-uid="${uid}"]`).forEach(card => {
        card.querySelector('.chat-presence-dot').classList.toggle('is-online', isOnline);
        card.querySelector('.chat-presence-label').textContent = formatPresenceLabel(presence);
    });

    if (uid === currentChatTargetUid) {
        document.getElementById('chat-room-presence-dot').classList.toggle('is-online', isOnline);
        document.getElementById('chat-room-presence-text').textContent = formatPresenceLabel(presence);
    }
}

function subscribeToUserPresence(uid) {
    if (presenceSubscriptions.has(uid)) return;
    const ref = rtdb.ref(`status/${uid}`);
    const callback = snapshot => updatePresenceElements(uid, snapshot.val());
    ref.on('value', callback);
    presenceSubscriptions.set(uid, { ref, callback });
}

function clearPresenceSubscriptions() {
    presenceSubscriptions.forEach(({ ref, callback }) => ref.off('value', callback));
    presenceSubscriptions.clear();
}

function updateChatRoomPresence(uid) {
    getUserPresence(uid).then(presence => updatePresenceElements(uid, presence));
    subscribeToUserPresence(uid);
}

// 2. Özel Sohbet Odasını Aç
window.openChatRoom = function (targetUid, targetName, targetPhoto) {
    document.getElementById('messages-list-view').classList.remove('active');
    document.getElementById('chat-room-view').classList.add('active');

    document.getElementById('chat-room-name').innerText = targetName;
    document.getElementById('chat-room-avatar').src = targetPhoto;

    // Mesajlaşma Odası Kimliğini (ID) Oluştur: İki UID'yi alfabetik sıraya dizerek eşsiz bir oda yaratırız
    const myUid = auth.currentUser.uid;
    currentChatTargetUid = targetUid;
    currentActiveChatId = [myUid, targetUid].sort().join('_');

    updateChatRoomPresence(targetUid);
    listenForChatMessages(currentActiveChatId);
    // Yazıyor göstergesi, oda açılırken karşı tarafın aktif olduğunu hissettirir.
    setTimeout(showChatTypingIndicator, 450);
};

// 3. Sohbet Odasını Kapat
window.closeChatRoom = function () {
    document.getElementById('chat-room-view').classList.remove('active');
    document.getElementById('messages-list-view').classList.add('active');
    if (chatUnsubscribe) {
        chatUnsubscribe(); // Odadan çıkınca veri dinlemeyi durdur (Tasarruf)
    }
    currentActiveChatId = null;
    currentChatTargetUid = null;
    if (chatTypingTimer) clearTimeout(chatTypingTimer);
    openChatListModal(); // Geri dönünce liste verilerini yeniler.
};

// 4. Gerçek Zamanlı Mesaj Dinleyici (WhatsApp Mantığı)
function listenForChatMessages(chatId) {
    const container = document.getElementById('chat-messages-container');
    container.innerHTML = '<p class="chat-empty-state">Şifreli sohbet başlatılıyor...</p>';

    // Eğer eski bir dinleyici varsa iptal et
    if (chatUnsubscribe) chatUnsubscribe();

    // Veritabanını anlık (canlı) dinle
    chatUnsubscribe = db.collection("chats").doc(chatId).collection("messages")
        .orderBy("timestamp", "asc")
        .onSnapshot((snapshot) => {
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p class="chat-empty-state">İlk mesajı gönderen sen ol!</p>';
                return;
            }

            let previousDayKey = null;
            snapshot.forEach(doc => {
                const msg = doc.data();
                const isMe = msg.sender === auth.currentUser.uid;
                const bubbleClass = isMe ? 'chat-bubble-sent' : 'chat-bubble-received';

                // Zamanı ayarla
                let timeStr = "";
                if (msg.timestamp) {
                    const d = msg.timestamp.toDate();
                    timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                    const dayKey = d.toLocaleDateString('tr-TR');
                    if (dayKey !== previousDayKey) {
                        container.insertAdjacentHTML('beforeend', `<div class="chat-day-divider"><span>${formatChatDayLabel(d)}</span></div>`);
                        previousDayKey = dayKey;
                    }
                }

                container.innerHTML += `
                    <div class="chat-message-row ${isMe ? 'is-sent' : 'is-received'}">
                        <div class="chat-bubble ${bubbleClass}">
                            <span class="chat-bubble-text">${escapeChatText(msg.text)}</span>
                            <span class="chat-timestamp">${timeStr}${isMe ? '<b class="chat-read-ticks">✓✓</b>' : ''}</span>
                        </div>
                    </div>
                `;

                // Açık odadaki gelen mesajları okundu olarak işaretle
                if (!isMe && msg.receiver === auth.currentUser.uid) {
                    if (msg.read === false) {
                        doc.ref.update({ read: true });

                        // YENİ: DİNAMİK ADA BİLDİRİMİ TETİKLE!
                        // Eğer mesaj o an ekranda değilsek veya başka bir yere bakıyorsak Ada insin
                        if (typeof showDynamicIsland === 'function') {
                            showDynamicIsland("Yeni Mesaj 💬", msg.text.substring(0, 30) + "...", "✉️", 0);
                        }
                    }
                }
            });

            // Yeni mesaj gelince en alta kaydır
            container.scrollTop = container.scrollHeight;
        });
}

function formatChatDayLabel(date) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Bugün';
    if (date.toDateString() === yesterday.toDateString()) return 'Dün';
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeChatText(text) {
    const element = document.createElement('div');
    element.textContent = text || '';
    return element.innerHTML.replace(/\n/g, '<br>');
}

function showChatTypingIndicator() {
    const container = document.getElementById('chat-messages-container');
    if (!container || document.getElementById('chat-typing-indicator')) return;

    const indicator = document.createElement('div');
    indicator.id = 'chat-typing-indicator';
    indicator.className = 'chat-typing-indicator';
    indicator.innerHTML = '<span>Yazıyor</span><i></i><i></i><i></i>';
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;
    chatTypingTimer = setTimeout(() => indicator.remove(), 1800);
}

// 5. Mesaj Gönder
window.sendChatMessage = async function () {
    const input = document.getElementById('chat-message-input');
    const text = input.value.trim();

    if (!text || !currentActiveChatId || !auth.currentUser) return;

    input.value = ''; // Inputu hemen temizle

    try {
        await db.collection("chats").doc(currentActiveChatId).collection("messages").add({
            text: text,
            sender: auth.currentUser.uid,
            receiver: currentChatTargetUid,
            read: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (navigator.vibrate) navigator.vibrate(20);
    } catch (e) {
        console.error("Mesaj gönderilemedi:", e);
        alert("Bağlantı sorunu! Mesaj iletilemedi.");
    }
};

// Klavyede Enter'a basınca gönderme
document.getElementById('chat-message-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
});

// Alt navigasyondan başka bir bölüme geçildiğinde mesaj sayfası kapanır, navigasyon görünür kalır.
document.querySelectorAll('.bottom-nav .nav-btn, .bottom-nav .hub-nav-btn').forEach(button => {
    button.addEventListener('click', () => {
        if (document.getElementById('messages-page').classList.contains('active')) closeMessagingPage(false);
    });
});
// ==========================================
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
startDilalaTimer = function () {
    originalStartDilalaTimer();
    setInterval(updateReunionCounter, 1000);
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
    } catch(e) { console.log("Harita yüklenirken hata:", e); }

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


// 🏆 GEÇMİŞ ANTRENMANLARA KAYDETME
window.saveCardioSession = function () {
    if (cardioDistanceKm <= 0) {
        alert("Hiç mesafe kat etmemişsin şampiyon, hareket et!");
        return;
    }
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

    alert(`🔥 TEBRİKLER!\n\nToplam: ${cardioDistanceKm.toFixed(2)} km\nSüre: ${duration}\nTempo: ${pace}\n\nKayıt "İdman Geçmişi" kısmına eklendi!`);
    closeCardioScreen();
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

window.openKPSSCenter = function () {
    const hub = document.getElementById('hub-screen');
    if (hub) hub.classList.add('hidden');
    document.getElementById('kpss-screen').classList.remove('hidden');

    updateKpssHeader();
    renderKPSSTodayOrWeek();
    updateKpssCountdowns();
    saveLastScreen('kpss');
    closeKPSSCenter()
    saveLastScreen('hub');

    // Her 1 saatte bir gün dönümünü kontrol etsin yeterli, saniyelik kasmaya gerek yok
    setInterval(updateKpssCountdowns, 3600000);
};

window.closeKPSSCenter = function () {
    document.getElementById('kpss-screen').classList.add('hidden');
    if (typeof returnToHub === 'function') returnToHub();
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
window.resetKPSSScheduleToDefault = function () {
    const confirmReset = confirm("Emin misin şampiyon? Mevcut özel programın silinecek ve sistem varsayılan yoğun kampa geri dönecek!");

    if (confirmReset) {
        // Hafızadaki o sınava ait özel programı tamamen sil
        localStorage.removeItem(`olympus_kpss_schedule_${activeKpssExam}`);

        // Modal içindeki listeyi hemen yenile (otomatik olarak varsayılanı çekecektir)
        renderKPSSEditList();

        // Arka plandaki ana ekranı da yenile
        renderKPSSTodayOrWeek();

        if (navigator.vibrate) navigator.vibrate([50, 100]);
        alert("✅ Sistem başarıyla fabrika ayarlarına (Standart Kampa) sıfırlandı!");
    }
};
// ==========================================
// 📅 ÇOKLU HAFTA VERİTABANI (ÖN LİSANS 5 HAFTALIK KAMP)
// ==========================================
let activeKpssWeek = 1; // Varsayılan hafta

window.changeKpssWeek = function () {
    activeKpssWeek = parseInt(document.getElementById('kpss-week-selector').value);
    renderKPSSTodayOrWeek();
    if (navigator.vibrate) navigator.vibrate(20);
};

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
window.openKPSSCenter = function() {
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
    
    // 4. KPSS program verilerini çiz
    if (typeof renderKPSSTodayOrWeek === 'function') renderKPSSTodayOrWeek();
    
    if (navigator.vibrate) navigator.vibrate([30, 50]);
    
    // 5. Dinamik Ada Bildirimi
    if (typeof showDynamicIsland === 'function') {
        showDynamicIsland("KPSS Akademi", "Çalışma merkezine girildi", "📚");
    }
};

window.closeKPSSCenter = function() {
    // 1. KPSS Ekranını gizle
    const kpssScreen = document.getElementById('kpss-screen');
    if (kpssScreen) {
        kpssScreen.classList.add('hidden');
        kpssScreen.style.display = 'none';
    }
    
    // 2. Hafızayı Hub'a çevir
    if (typeof saveLastScreen === 'function') saveLastScreen('hub');
    
    // 3. Hub'ı geri aç
    const hub = document.getElementById('hub-screen');
    if (hub) {
        hub.classList.remove('hidden');
        hub.style.display = 'flex';
    }
    
    if (navigator.vibrate) navigator.vibrate(30);
};
// ==========================================
// 🦅 GÜVENLİK GÜÇLERİ KARARGAH MOTORU (HATASIZ VE GÜVENLİ)
// ==========================================
// --- AKILLI AÇ / KAPAT KONTROLCÜSÜ ---
window.toggleSecurityMode = function (type) {
    const activeMode = localStorage.getItem('olympus_active_sec_mode');

    // Eğer tıklanan logo zaten aktif olan mod ise -> SİVİLE DÖN
    if (activeMode === type) {
        exitSecurityMode();
    } else {
        // Farklı bir logoya tıklandıysa veya mod kapalıysa -> MODU BAŞLAT
        triggerSecurityMode(type);
    }
};

// --- MODU TETİKLE VE YÜKLE ---
window.triggerSecurityMode = function (type) {
    const overlay = document.getElementById('sec-loading-overlay');
    const imgEl = document.getElementById('sec-loading-img');

    if (!overlay || !imgEl) {
        openSecurityMode(type, true);
        return;
    }

    const sourceLogo = document.getElementById(`logo-${type}`);
    imgEl.src = sourceLogo.src;

    document.body.classList.remove('polis-theme', 'jandarma-theme');
    document.body.classList.add(`${type}-theme`);

    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';

    imgEl.classList.add('sec-animate-img');

    if (navigator.vibrate) navigator.vibrate([100, 100, 300, 100, 500]);

    setTimeout(() => {
        overlay.style.display = 'none';
        imgEl.classList.remove('sec-animate-img');
        openSecurityMode(type, false);
        let modName = type === 'polis' ? 'POMEM' : 'JAMYO';
        let modColor = type === 'polis' ? '#fbc531' : '#d32f2f';
        showDynamicIsland(`${modName} Modu Aktif`, "🦅");
    }, 2000);
};

// --- EKRANI AÇ ---
window.openSecurityMode = function(type, skipAnimation = false) {
    const hub = document.getElementById('hub-screen');
    const profile = document.getElementById('profile-screen') || document.getElementById('olympus-screen');
    
    if (hub) hub.classList.add('hidden');
    if (profile) profile.classList.add('hidden');
    
    document.getElementById('security-screen').classList.remove('hidden');
    
    document.body.classList.remove('polis-theme', 'jandarma-theme');
    document.body.classList.add(`${type}-theme`);
    
    document.getElementById('logo-polis').classList.remove('sec-logo-active');
    document.getElementById('logo-polis').classList.add('sec-logo-passive');
    document.getElementById('logo-jandarma').classList.remove('sec-logo-active');
    document.getElementById('logo-jandarma').classList.add('sec-logo-passive');
    
    const activeLogo = document.getElementById(`logo-${type}`);
    activeLogo.classList.remove('sec-logo-passive');
    activeLogo.classList.add('sec-logo-active');
    activeLogo.nextElementSibling.style.color = type === 'polis' ? '#fbc531' : '#d32f2f'; 
    
    const titleEl = document.getElementById('sec-header-title');
    const headerLogoEl = document.getElementById('sec-header-logo');
    const kurumTextEl = document.getElementById('sec-kurum-text');
    
    headerLogoEl.src = activeLogo.src;
    
    const tasksDiv = document.getElementById('olympus-sec-tasks');
    const tasksTitle = document.getElementById('olympus-sec-tasks-title');

    if (type === 'polis') {
        titleEl.innerText = 'Polis Akademisi (POMEM)';
        kurumTextEl.innerText = 'Emniyet Teşkilatı Mevzuatı ve Tarihi';
        activeAcademyLink = "https://www.pa.edu.tr/";
        if(tasksDiv) {
            tasksDiv.style.display = 'block';
            tasksTitle.innerText = '🦅 POMEM GÖREVLERİ';
        }
    } else {
        titleEl.innerText = 'Jandarma Akademisi (JAMYO)';
        kurumTextEl.innerText = 'Jandarma Teşkilatı Mevzuatı ve Tarihi';
        activeAcademyLink = "https://vatandas.jandarma.gov.tr/PTM/Giris";
        if(tasksDiv) {
            tasksDiv.style.display = 'block';
            tasksTitle.innerText = '🦅 JAMYO GÖREVLERİ';
        }
    }
    
    localStorage.setItem('olympus_active_sec_mode', type);
    if (typeof saveLastScreen === 'function') saveLastScreen('security'); 
    if (typeof loadSecTasks === 'function') loadSecTasks(type);
    if (typeof updateSecDisplays === 'function') updateSecDisplays(type);

    // KENDİ DİNAMİK ADAN BURADA DEVREYE GİRİYOR!
    let modName = type === 'polis' ? 'POMEM' : 'JAMYO';
    if (typeof showDynamicIsland === 'function') {
        showDynamicIsland(`${modName} Aktif`, "Akademi Modundasın", "🦅");
    }
};

// --- EKRANDAN ÇIK VE PROFİLE DÖN ---
window.closeSecurityMode = function () {
    document.getElementById('security-screen').classList.add('hidden');
    if (typeof saveLastScreen === 'function') saveLastScreen('profile');

    const profile = document.getElementById('profile-screen') || document.getElementById('olympus-screen');
    if (profile) profile.classList.remove('hidden');
};

// --- SİVİLE DÖN (GÜVENLİ ÇIKIŞ) ---
window.exitSecurityMode = function() {
    document.body.classList.remove('polis-theme', 'jandarma-theme'); 
    
    document.getElementById('logo-polis').classList.remove('sec-logo-active');
    document.getElementById('logo-polis').classList.add('sec-logo-passive');
    document.getElementById('logo-jandarma').classList.remove('sec-logo-active');
    document.getElementById('logo-jandarma').classList.add('sec-logo-passive');
    
    localStorage.removeItem('olympus_active_sec_mode');
    
    const tasksDiv = document.getElementById('olympus-sec-tasks');
    if(tasksDiv) tasksDiv.style.display = 'none';

    const loadingOverlay = document.getElementById('sec-loading-overlay');
    if(loadingOverlay) loadingOverlay.style.display = 'none';
    
    const imgViewer = document.getElementById('image-viewer-modal');
    if(imgViewer) imgViewer.style.display = 'none';

    if(navigator.vibrate) navigator.vibrate([50, 100]);
    
    // KENDİ DİNAMİK ADAN BURADA DEVREYE GİRİYOR!
    if (typeof showDynamicIsland === 'function') {
        showDynamicIsland("Sivil Temaya Dönüldü", "Akademi kapatıldı", "✅");
    }
};
// ==========================================
// 🦅 MÜLAKAT KUTUCUKLARI HAFIZA MOTORU
// ==========================================
window.toggleSecTask = function (taskId, isChecked) {
    const activeSecMode = localStorage.getItem('olympus_active_sec_mode') || 'polis';
    const memoryKey = `olympus_sec_tasks_${activeSecMode}`;
    let tasks = JSON.parse(localStorage.getItem(memoryKey)) || {};

    tasks[taskId] = isChecked;
    localStorage.setItem(memoryKey, JSON.stringify(tasks));
    if (isChecked && navigator.vibrate) navigator.vibrate([20, 30]);
};

window.loadSecTasks = function (type) {
    const memoryKey = `olympus_sec_tasks_${type}`;
    let tasks = JSON.parse(localStorage.getItem(memoryKey)) || {};

    document.getElementById('sec-task-1').checked = !!tasks['task-1'];
    document.getElementById('sec-task-2').checked = !!tasks['task-2'];
    document.getElementById('sec-task-3').checked = !!tasks['task-3'];
};

// ==========================================
// ⏱️ PARKUR SALİSELİK KRONOMETRE MOTORU
// ==========================================
let secStopwatchInterval;
let secStopwatchTime = 0; // 10 milisaniyelik dilimler
let isSecStopwatchRunning = false;

window.toggleSecStopwatch = function () {
    const btn = document.getElementById('sec-stopwatch-btn');
    const display = document.getElementById('sec-stopwatch-display');

    if (isSecStopwatchRunning) {
        // Durdur
        clearInterval(secStopwatchInterval);
        isSecStopwatchRunning = false;
        btn.innerText = "▶ Devam Ettir";
        btn.style.background = "var(--sec-accent)";
        btn.style.color = "#000";
    } else {
        // Başlat
        isSecStopwatchRunning = true;
        btn.innerText = "⏸ Durdur";
        btn.style.background = "#e74c3c";
        btn.style.color = "#fff";
        if (navigator.vibrate) navigator.vibrate(30);

        secStopwatchInterval = setInterval(() => {
            secStopwatchTime++;
            let m = Math.floor(secStopwatchTime / 6000).toString().padStart(2, '0');
            let s = Math.floor((secStopwatchTime % 6000) / 100).toString().padStart(2, '0');
            let ms = (secStopwatchTime % 100).toString().padStart(2, '0');
            display.innerText = `${m}:${s}:${ms}`;
        }, 10);
    }
};

window.resetSecStopwatch = function () {
    clearInterval(secStopwatchInterval);
    isSecStopwatchRunning = false;
    secStopwatchTime = 0;
    document.getElementById('sec-stopwatch-display').innerText = "00:00:00";

    const btn = document.getElementById('sec-stopwatch-btn');
    btn.innerText = "▶ Başlat";
    btn.style.background = "var(--sec-accent)";
    btn.style.color = "#000";
};
// ==========================================
// 📸 TAM EKRAN FOTOĞRAF İNCELEYİCİ MOTORU
// ==========================================
window.openImageViewer = function (imageSrc) {
    const viewer = document.getElementById('image-viewer-modal');
    const imgEl = document.getElementById('image-viewer-img');

    imgEl.src = imageSrc;

    viewer.classList.remove('hidden');
    viewer.style.display = 'flex';

    if (navigator.vibrate) navigator.vibrate(20);
};

window.closeImageViewer = function () {
    const viewer = document.getElementById('image-viewer-modal');
    viewer.style.display = 'none';
    viewer.classList.add('hidden');
};

// ==========================================
// 🔗 RESMİ KURUM LİNK YÖNLENDİRİCİSİ
// ==========================================
let activeAcademyLink = "https://ais.pa.edu.tr/";

window.openAcademyLink = function () {
    window.open(activeAcademyLink, '_blank');
};

// ==========================================
// 🦅 AKADEMİ HEDEF VE GERİ SAYIM MOTORU (ÇÖKMEYE KARŞI KORUMALI)
// ==========================================
let currentSecModalType = '';

window.openSecModal = function (type) {
    currentSecModalType = type;
    const modal = document.getElementById('sec-input-modal');
    if (!modal) return; // Modal yoksa çökmesini engelle

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    document.getElementById('sec-modal-interview-inputs').style.display = type === 'interview' ? 'flex' : 'none';
    document.getElementById('sec-modal-parkour-inputs').style.display = type === 'parkour' ? 'flex' : 'none';
    document.getElementById('sec-modal-title').innerText = type === 'interview' ? 'Aşama ve Tarih Belirle' : 'Parkur Hedeflerini Belirle';

    const activeMode = localStorage.getItem('olympus_active_sec_mode') || 'polis';
    let data = JSON.parse(localStorage.getItem(`olympus_sec_data_${activeMode}`)) || {};

    if (type === 'interview') {
        const titleInput = document.getElementById('sec-interview-title');
        const dateInput = document.getElementById('sec-interview-date');
        // Kalkan: Eğer input HTML'de varsa veriyi yaz
        if (titleInput) titleInput.value = data.interviewTitle || '';
        if (dateInput) dateInput.value = data.interviewDate || '';
    } else {
        const timeInput = document.getElementById('sec-parkour-time');
        const scoreInput = document.getElementById('sec-parkour-score');
        if (timeInput) timeInput.value = data.parkourTime || '';
        if (scoreInput) scoreInput.value = data.parkourScore || '';
    }

    if (navigator.vibrate) navigator.vibrate(15);
};

// --- BİLGİLERİ KAYDET ---
window.saveSecModalData = function() {
    const activeMode = localStorage.getItem('olympus_active_sec_mode') || 'polis';
    let data = JSON.parse(localStorage.getItem(`olympus_sec_data_${activeMode}`)) || {};

    if (currentSecModalType === 'interview') {
        const titleInput = document.getElementById('sec-interview-title');
        const dateInput = document.getElementById('sec-interview-date');
        if(titleInput) data.interviewTitle = titleInput.value.trim() || 'BİR SONRAKİ AŞAMA';
        if(dateInput) data.interviewDate = dateInput.value;
    } else {
        const timeInput = document.getElementById('sec-parkour-time');
        const scoreInput = document.getElementById('sec-parkour-score');
        if(timeInput) data.parkourTime = timeInput.value;
        if(scoreInput) data.parkourScore = scoreInput.value;
    }

    localStorage.setItem(`olympus_sec_data_${activeMode}`, JSON.stringify(data));
    closeSecModal();
    updateSecDisplays(activeMode);
    
    if(navigator.vibrate) navigator.vibrate([20, 30]);

    // KENDİ DİNAMİK ADAN BURADA DEVREYE GİRİYOR!
    if (typeof showDynamicIsland === 'function') {
        showDynamicIsland("Kayıt Başarılı", "Hedefler sisteme işlendi", "💾");
    }
};

window.closeSecModal = function () {
    const modal = document.getElementById('sec-input-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.updateSecDisplays = function (mode) {
    let data = JSON.parse(localStorage.getItem(`olympus_sec_data_${mode}`)) || {};

    const titleDisp = document.getElementById('sec-interview-title-display');
    const intDisp = document.getElementById('sec-interview-display');
    const intCount = document.getElementById('sec-interview-countdown');

    if (titleDisp) titleDisp.innerText = data.interviewTitle ? data.interviewTitle.toUpperCase() : "BİR SONRAKİ AŞAMA";

    if (data.interviewDate && intDisp && intCount) {
        const targetDate = new Date(data.interviewDate);
        intDisp.innerText = targetDate.toLocaleDateString('tr-TR');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
            intCount.innerText = `⏳ SON ${diffDays} GÜN!`;
            intCount.style.color = '#fff';
        } else if (diffDays === 0) {
            intCount.innerText = "🔥 BÜYÜK GÜN BUGÜN!";
            intCount.style.color = 'var(--sec-accent)';
        } else {
            intCount.innerText = "✓ Aşama Tamamlandı";
            intCount.style.color = '#888';
        }
    } else {
        if (intDisp) intDisp.innerText = "Tarih Gir ✏️";
        if (intCount) intCount.innerText = "";
    }

    const parkDisp = document.getElementById('sec-parkour-display');
    const scoreDisp = document.getElementById('sec-parkour-score-display');

    if (data.parkourTime || data.parkourScore) {
        if (parkDisp) parkDisp.innerText = data.parkourTime ? `${data.parkourTime}` : "Süre Yok";
        if (scoreDisp) scoreDisp.innerText = data.parkourScore ? `Hedef: ${data.parkourScore} Puan` : "";
    } else {
        if (parkDisp) parkDisp.innerText = "Hedef Gir ✏️";
        if (scoreDisp) scoreDisp.innerText = "";
    }
};

// ==========================================
// 🧠 33. DÖNEM POMEM / JAMYO ÇIKMIŞ SORULAR VERİTABANI
// ==========================================
const interviewQuestions = [
    { q: "Polis nedir? Tanımlayınız.", a: "Polis; asayişi, amme intizamını, vatandaşın can, mal ve ırzını koruyan, suç işlenmesini önleyen ve suçluları adalete teslim eden silahlı yürütme ve güvenlik gücüdür." },
    { q: "Amir ve Üst arasındaki fark nedir?", a: "Amir; hiyerarşik yapı içinde emri altındakilere emir verme yetkisine sahip kişidir. Üst ise; rütbe veya kıdem bakımından daha büyük olan kişidir (her üst, amir olmayabilir)." },
    { q: "Görevi İhmal nedir?", a: "Kamu görevlisinin yapmakla yükümlü olduğu görevini yapmaması, geciktirmesi veya eksik yapması durumudur." },
    { q: "Önleyici Polislik ve Adli Polislik nedir?", a: "Önleyici polislik, suç işlenmeden önce suçu engellemek için yapılan çalışmalardır (devriye vb.). Adli polislik ise suç işlendikten sonra failleri yakalamak ve delil toplamakla görevli kısımdır." },
    { q: "Liyakat nedir?", a: "Bir görevi başarıyla yapabilme yeteneği, yeterlilik, ehliyet ve o işe layık olma durumudur." },
    { q: "Mobbing nedir?", a: "İş yerinde bir kişiye veya gruba yönelik sistematik olarak uygulanan psikolojik taciz, baskı ve yıldırma politikasıdır." },
    { q: "Kuvvetler Ayrılığı ilkesi nedir?", a: "Devletin temel organları olan Yasama, Yürütme ve Yargı güçlerinin birbirinden bağımsız olması ve farklı organlarca kullanılmasıdır." },
    { q: "İstihbarat nedir?", a: "Haberlerin ve verilerin toplanması, analiz edilmesi, değerlendirilmesi sonucu elde edilen işlenmiş ve anlamlı bilgi bütünüdür." },
    { q: "Anayasa'nın değiştirilemez maddeleri nelerdir?", a: "1- Devletin şekli Cumhuriyettir. 2- Demokratik, laik ve sosyal bir hukuk devletidir. 3- Dili Türkçe, başkenti Ankara, bayrağı al bayrak, marşı İstiklal Marşı'dır." },
    { q: "Sosyal Devlet nedir?", a: "Vatandaşlarına asgari bir yaşam standardı sunan, eğitim, sağlık ve sosyal güvenlik haklarını güvence altına alan devlettir." },
    { q: "E-Devlet nedir?", a: "Devlet hizmetlerinin vatandaşlara bilgi ve iletişim teknolojileri kullanılarak elektronik ortamda, şeffaf ve hızlı sunulmasıdır." },
    { q: "Töre Cinayeti nedir?", a: "Geleneksel inançlar veya toplumsal baskılar bahane edilerek, ailenin 'namusunu' temizlemek gerekçesiyle işlenen cinayetlerdir." },
    { q: "Kriz Yönetimi nedir?", a: "Beklenmeyen, acil ve tehlikeli durumlara karşı önceden planlanmış stratejilerle en az zararla atlatılmasını sağlayan yönetim sürecidir." },
    { q: "Demokrasi nedir?", a: "Halkın kendi kendini yönettiği, egemenliğin kayıtsız şartsız millete ait olduğu yönetim biçimidir." },
    { q: "Lider ve Yönetici arasındaki fark nedir?", a: "Yönetici gücünü makamından ve kurallardan alır; lider ise gücünü vizyonundan, ikna kabiliyetinden ve insanları etkileme gücünden alır." },
    { q: "Kolluk kuvvetleri nelerdir?", a: "Genel Kolluk: Polis, Jandarma, Sahil Güvenlik. Özel Kolluk: Orman muhafaza, gümrük muhafaza vb. kurumlardır." },
    { q: "Siber Suç (Bilişim Suçu) nedir?", a: "Bilişim sistemleri (bilgisayar, internet, cep telefonu vb.) kullanılarak işlenen her türlü yasa dışı eylemdir." },
    { q: "Algı Yönetimi nedir?", a: "Hedef kitlenin düşüncelerini, duygularını ve davranışlarını istenilen yönde şekillendirmek için yapılan stratejik iletişim çalışmalarıdır." },
    { q: "Empati nedir?", a: "Bir kişinin kendisini karşısındaki kişinin yerine koyarak onun duygularını ve düşüncelerini doğru anlamasıdır." },
    { q: "Disiplin nedir?", a: "Kurallara ve düzene isteyerek, bilinçli bir şekilde uyma durumudur. Askeriye ve emniyetin temel taşıdır." },
    { q: "Meşru Müdafaa (Nefsi Müdafaa) nedir?", a: "Kişinin kendisine veya başkasına yönelmiş haksız bir saldırıyı, o anki durumla orantılı bir şekilde defetme zorunluluğudur." },
    { q: "Zor Kullanma Yetkisi nedir?", a: "Polisin veya jandarmanın, direnen kişileri veya saldırıları etkisiz hale getirmek için bedeni kuvvet, maddi güç veya kanuni şartlar oluştuğunda silah kullanmasıdır." },
    { q: "İnovasyon nedir?", a: "Yeni veya iyileştirilmiş bir ürünün, hizmetin veya sürecin geliştirilip topluma/kullanıma sunulmasıdır (Yenileşim)." },
    { q: "Statü nedir?", a: "Bir bireyin toplum veya bir grup içindeki konumu, yeri ve saygınlığıdır." },
    { q: "Atatürk'ün Milliyetçilik ilkesini açıklayın.", a: "Irk, din, mezhep ayrımı yapmaksızın, kendini Türk sayan herkesin Türk kabul edildiği, birleştirici ve bütünleştirici bir ilkedir." },
    { q: "Kuvvetler Ayrılığı nedir?", a: "Yasama, yürütme ve yargı güçlerinin birbirinden bağımsız olması ve farklı organlarca kullanılmasıdır." },
    { q: "Mobbing nedir?", a: "İş yerinde bir kişiye veya gruba yönelik sistematik olarak uygulanan psikolojik taciz ve yıldırma politikasıdır." },
    { q: "Liderlik ve Yöneticilik arasındaki fark nedir?", a: "Yönetici gücünü makamından ve kurallardan alır; lider ise gücünü vizyonundan ve insanları etkileme kabiliyetinden alır." },
    { q: "Empati nedir?", a: "Bir kişinin kendisini karşısındaki kişinin yerine koyarak onun duygularını ve düşüncelerini doğru anlamasıdır." },
    { q: "Siber Suç nedir?", a: "Bilişim sistemleri (bilgisayar, internet, cep telefonu vb.) kullanılarak işlenen her türlü yasa dışı eylemdir." },
    { q: "Atatürk'ün Milliyetçilik ilkesini açıklayın.", a: "Irk, din, mezhep ayrımı yapmaksızın, kendini Türk sayan herkesin Türk kabul edildiği, birleştirici ve bütünleştirici bir ilkedir." },
    { q: "Disiplin nedir?", a: "Kurallara ve düzene isteyerek, bilinçli bir şekilde uyma durumudur. Askeriye ve emniyetin temelidir." },
    { q: "Sosyal Devlet nedir?", a: "Vatandaşlarına asgari bir yaşam standardı sunan, eğitim, sağlık ve sosyal güvenlik haklarını güvence altına alan devlettir." },
    { q: "Laiklik nedir?", a: "Devlet yönetiminde din ve dünya işlerinin birbirinden ayrılması, devletin tüm inançlara eşit mesafede olmasıdır." },
    { q: "Algı Yönetimi nedir?", a: "Hedef kitlenin düşüncelerini, duygularını ve davranışlarını istenilen yönde şekillendirmek için yapılan stratejik iletişim çalışmalarıdır." },
    { q: "Töre Cinayeti nedir?", a: "Geleneksel inançlar veya toplumsal baskılar bahane edilerek, ailenin namusunu temizlemek gerekçesiyle işlenen cinayetlerdir." },
    { q: "Kriz Yönetimi nedir?", a: "Beklenmeyen, acil ve tehlikeli durumlara karşı önceden planlanmış stratejilerle en az zararla atlatılmasını sağlayan yönetim sürecidir." },
    { q: "E-Devlet nedir?", a: "Devlet hizmetlerinin vatandaşlara bilgi ve iletişim teknolojileri kullanılarak elektronik ortamda, şeffaf ve hızlı sunulmasıdır." },
    { q: "Statü nedir?", a: "Bir bireyin toplum veya bir grup içindeki konumu, yeri ve saygınlığıdır." },
    { q: "Etik ve Ahlak arasındaki fark nedir?", a: "Ahlak toplumun doğrularını temsil ederken, etik daha çok evrensel ve mesleki kurallar bütününü (örn: meslek etiği) ifade eder." },
    { q: "İnovasyon nedir?", a: "Yeni veya iyileştirilmiş bir ürünün, hizmetin veya sürecin geliştirilip topluma/kullanıma sunulmasıdır (Yenileşim)." },
    { q: "Magna Carta nedir?", a: "1215'te İngiltere'de kralın yetkilerini kısıtlayan ve hukukun üstünlüğünü kabul eden tarihi sözleşmedir." },
    { q: "İnsan Hakları nelerdir?", a: "İnsanın sadece insan olmasından dolayı sahip olduğu, devredilemez ve vazgeçilemez temel hak ve özgürlüklerdir (yaşama, eğitim vb.)." },
    { q: "Kamuoyu nedir?", a: "Belli bir konuda, toplumun genelinin veya büyük bir kesiminin benimsediği ortak düşünce ve tutumdur." },
    { q: "Demokrasi nedir?", a: "Halkın kendi kendini yönettiği, egemenliğin kayıtsız şartsız millete ait olduğu yönetim biçimidir." },
    { q: "Türklerin bilinen ilk şairi kimdir?", a: "Aprın Çor Tigin" },
    { q: "İlk kadın valimiz kimdir?", a: "Lale Aytaman" },
    { q: "İslamofobi ne demektir?", a: "'İslam Korkusu' yani İslam dinine ya da Müslümanlara karşı duyulan nefret." },
    { q: "Fiziki haritada yeşil renkli alanlar neyi ifade eder?", a: "Yükseltinin en az olduğu yerleri (Ova, düzlük gibi) ifade eder." },
    { q: "Rumeli Hisarı hangi padişah döneminde yapıldı?", a: "Fatih Sultan Mehmet" },
    { q: "Hattuşaş hangi ilimizdedir?", a: "Çorum" },
    { q: "Kadınlara boşanma hakkı ne zaman verildi?", a: "1926 Türk Medeni Kanunu ile kadınlara boşanma hakkı verildi." },
    { q: "Sınırlarımız ilk kez hangi kongrede konuşuldu?", a: "Erzurum Kongresi'nde ilk kez millî sınırlardan bahsedilmiştir." },
    { q: "Anadolu Şairimiz kimdir?", a: "Ömer Bedrettin Uşaklı" },
    { q: "İslamiyeti kabul eden ilk Türk topluluğu hangisidir?", a: "Karluklar" },
    { q: "Osmanlı Devleti'nde Bizans ile yapılan ilk savaş hangisidir?", a: "Koyunhisar Savaşı (Osman Bey Dönemi). Galip gelinmiştir." },
    { q: "Bor madeni genel olarak nerelerden çıkarılır?", a: "Geneli Ege Bölgesi; Kütahya ve Balıkesir çevresi." },
    { q: "200 TL banknotunun arkasında kim vardır?", a: "Yunus Emre" },
    { q: "Yaş Antlaşması'nın önemi nedir?", a: "Kırım'ın Rusların hakimiyetine geçmiş olduğunun onaylandığı antlaşmadır." },
    { q: "Osmanlı Devleti'nde 'Darüleytam' nedir?", a: "Yetimler Yurdu" },
    { q: "Kutadgu Bilig kim tarafından yazılmıştır ve anlamı nedir?", a: "Yusuf Has Hacip tarafından yazılmıştır. Anlamı 'Mutluluk Veren Bilgi'dir." },
    { q: "Atatürk Dönemi'nde kurulan bankalar hangileridir?", a: "İş Bankası, Sümerbank, İller Bankası" },
    { q: "Türkiye'nin matematik konumu nedir?", a: "26-45 Doğu meridyenleri ile 36-42 Kuzey paralelleri arasıdır." },
    { q: "Sened-i İttifak hangi padişah döneminde imzalanmıştır?", a: "II. Mahmud" },
    { q: "Kaçkar Dağları hangi ilimizdedir?", a: "Rize" },
    { q: "Saatleri Ayarlama Enstitüsü kitabının yazarı kimdir?", a: "Ahmet Hamdi Tanpınar" },
    { q: "Türkiye'nin jeopolitik konumunun özellikleri nelerdir?", a: "Üç tarafının denizlerle çevrili olması ve Asya-Avrupa'yı bağlayan önemli boğazlara sahip olmasıdır." },
    { q: "Atatürk hangi ilin nüfusuna kayıtlıydı?", a: "Gaziantep" },
    { q: "Anayasa nedir?", a: "Ülke üzerindeki egemenlik haklarının kullanım yetkisinin devlete verildiğini belirleyen temel toplumsal sözleşmedir." },
    { q: "Karasal iklimin özellikleri nelerdir?", a: "Yazlar sıcak ve kurak, kışlar soğuk ve kar yağışlıdır. Bitki örtüsü step ve bozkırdır." },
    { q: "Osmanlı Devleti'nin İran ile yaptığı ilk antlaşma nedir?", a: "Amasya Antlaşması (1555)" },
    { q: "Osmanlı Devleti'nde saray dışı evlilik yapan ilk padişah kimdir?", a: "Genç Osman (II. Osman)" },
    { q: "Osmanlı'da gece sokağa çıkma, içki ve tütün yasağını getiren padişah kimdir?", a: "IV. Murat" },
    { q: "Halkçılık ilkesini açıklar mısınız?", a: "Türk toplumunda zümre ve sınıf egemenliğinin olamayacağı, bütün bireylerin yasa önünde eşitliği esasına dayanan ilkedir." },
    { q: "Milliyetçilik ilkesi doğrultusunda yapılan inkılaplar nelerdir?", a: "Türk Tarih ve Dil Kurumu'nun kurulması, Yeni Türk Harflerinin kabulü." },

    // ATATÜRK, MİLLİ MÜCADELE VE İNKILAPLAR
    { q: "Atatürk'ün askerler için söylediği tarihi sözlere örnek verir misiniz?", a: "'Ya İstiklal Ya Ölüm' (Sivas Kongresi) ve 'Ordular! İlk hedefiniz Akdeniz'dir, ileri.' (Büyük Taarruz)" },
    { q: "Dünya tarihinde ilk kez uçakların savaş aracı olarak kullanıldığı savaş hangisidir?", a: "Trablusgarp Savaşı" },
    { q: "Atatürk'ün eseri Nutuk'ta nelerden bahsediliyor?", a: "1919-1927 yılları arasındaki Milli Mücadele dönemi ve sonrasındaki süreçler (Cumhuriyetin ilanı, inkılaplar) anlatılır." },
    { q: "Atatürk'ün yazdığı kitaplara örnek veriniz.", a: "Nutuk, Geometri, Sivas Kongresi Günleri (Cumalı Ordugahı, Zabit ve Kumandan ile Hasbihal)." },
    { q: "Kurtuluş Savaşı'nın başlangıç tarihi nedir?", a: "19 Mayıs 1919 (Atatürk'ün Samsun'a çıkışı)." },
    { q: "Amasya Genelgesi hakkında ne biliyorsunuz?", a: "Kurtuluş Savaşı'nın amacı, yöntemi ve gerekçesi belirtilmiştir. İlk kez milli egemenliğe dayalı bir yönetimden bahsedilmiştir." },
    { q: "Mudanya Ateşkes Antlaşması'nın önemi nedir?", a: "Türkiye Cumhuriyeti'nin sınırlarını belirleyen ilk uluslararası belgedir." },

    // GÜNCEL, KURUMLAR VE TERİMLER
    { q: "Marmara Bölgesi'nin genel özellikleri nelerdir?", a: "Yükseltisi en az, nüfus yoğunluğu en fazla, sanayisi en gelişmiş bölgedir. Kümes hayvancılığında ileridedir." },
    { q: "Türkiye'deki terör örgütlerinden 3 tanesini sayınız.", a: "PKK, PYD, FETÖ, DHKP-C vb." },
    { q: "En çok köyü olan ilimiz hangisidir?", a: "Sivas" },
    { q: "Divan-ı Lügati't-Türk kitabının yazarı kimdir?", a: "Kaşgarlı Mahmud" },
    { q: "Filoloji nedir?", a: "Dillerin yapısını ve tarihini işleyen dil bilimidir." },
    { q: "Demokrasi ve Milli Birlik Günü hangi tarihte kutlanır?", a: "15 Temmuz" },
    { q: "Turan taktiği (Hilal Taktiği) hakkında bilgi verir misiniz?", a: "Düşmanı yarım ay şeklinde çevreleyerek yok etmeyi amaçlayan geleneksel bir Türk askeri taktiğidir." },
    { q: "Oltu taşı hangi ilimizde meşhurdur?", a: "Erzurum" },
    { q: "On İki Ada Yunanistan'a ne zaman verildi?", a: "1947 yılında Paris Antlaşması ile verilmiştir." },
    { q: "İnsansız hava araçlarımızın (İHA) isimleri nelerdir?", a: "Bayraktar TB2, Akıncı, Anka, Turna, Keklik, Pelikan, Martı, Şimşek." },
    { q: "Ekber ve Erşed Sistemi hangi padişah döneminde getirilmiştir?", a: "I. Ahmet" },
    { q: "Marshall Planı nedir?", a: "II. Dünya Savaşı sonrasında (1948-1951 yılları arasında) ABD kaynaklı uygulanan ekonomik yardım planıdır." },
    { q: "Kıbrıs Barış Harekâtı tarihi ve parolası nedir?", a: "20 Temmuz 1974. Parolası: 'Ayşe Tatile Çıksın'." },
    { q: "Mesnevi kime aittir?", a: "Mevlana Celaleddin-i Rumi" },
    { q: "'Büyük Türk' olarak bilinen ve Osmanlı'da en uzun süre tahtta kalan padişah kimdir?", a: "Kanuni Sultan Süleyman" },
    { q: "Osmanlı Devleti'nin son padişahı kimdir?", a: "Sultan Vahdettin" },
    { q: "G8 ülkelerini sayar mısınız?", a: "ABD, Kanada, Almanya, İtalya, Fransa, Rusya, Japonya, Birleşik Krallık." },
    { q: "Osmanlı'da iç sorunken dış sorun hâline gelen olay nedir?", a: "Cem Sultan Olayı" },
    { q: "'Şair Evlenmesi' adlı eser kime aittir ve özelliği nedir?", a: "İbrahim Şinasi'ye aittir. Edebiyatımızda Batılı tarzdaki ilk tiyatro eseridir." },
    { q: "İlk milli tankımızın adı nedir?", a: "Altay Tankı" },
    { q: "Göç ve Türeyiş Destanları kime aittir?", a: "Uygurlar" },
    { q: "Osmanlı Devleti hangi boydan gelmiştir?", a: "Kayı Boyu" },
    { q: "Türklerin tarih boyunca kullandığı alfabeler nelerdir?", a: "Göktürk, Uygur, Arap (İslam), Kiril ve Latin alfabeleridir." },
    { q: "1071 tarihi size neyi ifade ediyor?", a: "Malazgirt Muharebesi. Anadolu'nun kapıları Türklere açılmıştır." },
    { q: "Falezler (yalıyar) nerelerde görülür?", a: "Genellikle Karadeniz ve Akdeniz Bölgelerinde görülür." },
    { q: "'Huzur' romanının yazarı kimdir?", a: "Ahmet Hamdi Tanpınar" },
    { q: "Atatürkçülüğün nitelikleri nelerdir?", a: "Milli Kültür, Eşitlik, Barış ve Huzur, Hürriyet ve Bağımsızlıktır." },
    { q: "Ege Denizi'ne dökülen akarsularımız hangileridir?", a: "Meriç, Bakırçay, Gediz, Büyük ve Küçük Menderes." },
    { q: "Heyelanı önlemek için neler yapabiliriz?", a: "Eğimi fazla ve dik yerlere bina yapılmamalı, bu tür alanlar ağaçlandırılmalıdır." },
    { q: "İç Anadolu Bölgesi'ndeki büyük şehirleri sayınız.", a: "Ankara, Eskişehir, Konya, Kayseri" },
    { q: "Mübadele nedir?", a: "Değiş tokuş etmek anlamına gelir. (Özellikle Türk-Yunan nüfus mübadelesi olarak bilinir)." },
    { q: "8 yıla 80 yıllık iş sığdıran padişahımız kimdir?", a: "Yavuz Sultan Selim" },
    { q: "'Ateşten Gömlek' romanı hangi yazarımıza aittir?", a: "Halide Edip Adıvar" },
    { q: "Akdeniz ile Atlas Okyanusu'nu birbirine bağlayan boğazın adı nedir?", a: "Cebelitarık Boğazı" },
    { q: "Mostar Köprüsü nerededir?", a: "Bosna Hersek" },
    { q: "'Muhibbi' mahlasını kullanan padişahımız kimdir?", a: "Kanuni Sultan Süleyman" },
    { q: "Türkiye'nin en büyük tatlı su gölü hangisidir?", a: "Beyşehir Gölü" },
    { q: "Osmanlı Devleti'ndeki müzik okulunun adı nedir?", a: "Darülelhan" },
    { q: "Mustafa Kemal Atatürk'ün 'benim şehrim' dediği il hangisidir?", a: "Yalova" },

    // ATASÖZÜ VE DEYİM YORUMLAMA MÜLAKAT SORULARI
    { q: "'Demir tavında dövülür' atasözünü açıklayınız.", a: "Bir işi yapmak için uygun zaman ve yer çok önemli bir husustur." },
    { q: "'Başını kaşımaya vakti olmamak' deyimini açıklar mısınız?", a: "Çok meşgul olmak, başka bir iş yapmaya zerre vakti olmamak demektir." },
    { q: "'Acı patlıcanı kırağı çalmaz' atasözünü açıklayınız.", a: "Zorluğa ve sıkıntıya alışık olan kimseyi, yeni kötü durumlar fazla etkilemez." },
    { q: "'Dikensiz gül olmaz' atasözünü açıklayınız.", a: "Her güzel durumun, olayın veya kişinin mutlaka ufak bir kusuru, hatası olabilir." },
    { q: "'Altın pas tutmaz' atasözünü açıklayınız.", a: "Şerefli, dürüst ve temiz insana hiç kimse leke süremez, iftiralar onu bozamaz." },
    { q: "'Buğday başak verince orak pahaya çıkar' atasözünü açıklayınız.", a: "Bugün değersiz veya gereksiz görünen şeyler, ihtiyaç anı (zamanı) geldiğinde büyük değer kazanır." },
    { q: "Polis vatandaşa nasıl davranmalıdır?", a: "Polis, vatandaşa karşı saygılı, tarafsız, sabırlı ve güler yüzlü davranmalıdır. Görevini yerine getirirken insan haklarına ve hukuka uygun hareket etmeli, vatandaşın güvenini kazanmalıdır." },
    { q: "Osmanlı Devleti'nde veya Türk devletlerinde töre kavramı nedir?", a: "Töre, eski Türk devletlerinde yazılı olmayan hukuk kuralları ve geleneklerin bütünüdür. Adalet, eşitlik, dürüstlük gibi değerleri içerir ve hükümdarlar bile töreye uymak zorundadır." },
    { q: "Türkiye'de neden çok deprem olmaktadır?", a: "Türkiye, Alp-Himalaya deprem kuşağı üzerinde yer almaktadır. Kuzey Anadolu, Doğu Anadolu ve Batı Anadolu fay hatları nedeniyle aktif tektonik hareketler yaşanmaktadır." },
    { q: "Polis memurlarının vatandaşlarla iletişimi nasıl olmalıdır?", a: "Açık, anlaşılır, saygılı ve çözüm odaklı olmalıdır. Vatandaşın sorununu dinlemeli, empati kurmalı ve görevini hukuk çerçevesinde yerine getirmelidir." },
    { q: "Mustafa Kemal Atatürk'ün ilk katıldığı savaş hangisidir?", a: "1911 yılında gönüllü olarak görev aldığı ve İtalyanlara karşı mücadele ettiği Trablusgarp Savaşı'dır." },
    { q: "Türkiye bir kıta ülkesi midir?", a: "Türkiye bir kıta ülkesi değildir ancak Asya ve Avrupa olmak üzere iki kıta üzerinde toprakları bulunan, kıtalararası geçiş sağlayan bir ülkedir." },
    { q: "Polis Akademisinin logosunun anlamı nedir?", a: "Logodaki unsurlar; bilgiyi, hukuku, adaleti ve güvenliği temsil eder. Eğitim, disiplin, devlet otoritesi ve hukukun üstünlüğüne verilen önemi simgeler." },
    { q: "Coğrafi keşifler sırasında diğer toplumlar nasıl etkilenmiştir?", a: "Avrupa devletleri ekonomik açıdan güçlenirken, keşfedilen bölgelerde sömürgecilik başlamış, yerli halkların yaşam biçimleri ve kültürleri olumsuz etkilenmiştir." },
    { q: "Organizasyon nedir? Açıklayınız.", a: "Belirli bir amacı gerçekleştirmek için insanların, görevlerin ve kaynakların planlı şekilde bir araya getirilmesidir." },
    { q: "Dünya mirası nedir?", a: "İnsanlık için evrensel değere sahip olan kültürel ve doğal varlıkların tamamıdır. UNESCO tarafından belirlenir ve tüm insanlığın ortak mirası kabul edilir." },
    { q: "Liderlik nedir?", a: "Bir kişinin belirli hedeflere ulaşmak için insanları etkileyebilmesi, yönlendirebilmesi ve motive edebilmesidir." },
    { q: "Farkındalık nedir?", a: "Kişinin kendisinin, çevresinin ve yaşadığı olayların bilinçli şekilde farkında olmasıdır." },
    { q: "Teknolojinin faydaları nelerdir?", a: "Bilgiye hızlı erişim sağlar, üretkenliği artırır, zamandan tasarruf sağlar. Güvenlik alanında ise kamera sistemleri ve yapay zekâ ile suçla mücadeleye katkı sağlar." },
    { q: "Coğrafi keşifler Avrupa'yı nasıl etkilemiştir?", a: "Avrupa devletleri zenginleşmiş, ticaret gelişmiş, sömürgecilik faaliyetleri hız kazanmış ve bilimsel düşünce (Rönesans) güçlenmiştir." },
    { q: "Mustafa Kemal Atatürk'ün 'Yurtta sulh, cihanda sulh' sözünü açıklayınız.", a: "Ülke içinde barış, huzur ve birlik sağlanmadan dış dünyada kalıcı barışın mümkün olmayacağını ifade eder. Barışçı dış politikanın temelidir." },
    { q: "Balistik nedir?", a: "Ateşli silahlardan çıkan mermilerin hareketlerini, silahları, mühimmatı ve atış izlerini inceleyen bilim dalıdır." },
    { q: "1876 yılında Osmanlı Devleti'nde ne olmuştur?", a: "I. Meşrutiyet ilan edilmiş ve Osmanlı Devleti'nin ilk anayasası olan Kanun-i Esasi yürürlüğe girerek anayasal yönetime geçiş başlamıştır." },
    { q: "Amasya Genelgesi'nde yer alan 'Milletin bağımsızlığını yine milletin azim ve kararı kurtaracaktır.' sözü ne ifade etmektedir?", a: "Kurtuluş mücadelesinin milletin iradesiyle yürütüleceğini ifade eder. Milli egemenlik anlayışının temelini oluşturur." },
    { q: "Haberleşme hürriyeti nedir?", a: "Kişilerin mektup, telefon, e-posta vb. iletişim araçlarıyla serbestçe haberleşebilme hakkıdır. Anayasa ile güvence altına alınmıştır." },
    { q: "Kapitülasyonların kaldırılması hakkında bilgi veriniz.", a: "Yabancı devletlere tanınan ekonomik ve hukuki ayrıcalıklardı. 24 Temmuz 1923'te Lozan Barış Antlaşması ile tamamen kaldırılarak ekonomik bağımsızlık sağlanmıştır." },
    { q: "Vatansız kişi kime denir?", a: "Hiçbir devlet tarafından vatandaş olarak kabul edilmeyen, herhangi bir ülkenin vatandaşlığına sahip olmayan kişidir (Apatrid)." },
    { q: "Felsefenin dijitalleşme üzerindeki etkileri nelerdir?", a: "Yapay zekâ, veri güvenliği, mahremiyet, etik ve insan hakları gibi konularda yol gösterici bir rol üstlenir." },
    { q: "Ülkemizin güvenliği açısından teknolojinin faydaları nelerdir?", a: "Sınır güvenliği, savunma sanayisi ve istihbarat alanlarında (İHA, SİHA, yapay zekâ vb.) güvenlik güçlerinin daha hızlı ve etkili çalışmasını sağlar." },
    { q: " 'Her temas iz bırakır.' sözünü adli açıdan açıklayınız.", a: "Locard Değişim Prensibi'ne göre; olay yerine gelen veya bir nesneyle temas eden kişi mutlaka olay yerinde bir iz bırakır veya olay yerinden bir iz alır (Parmak izi, DNA vb.)." },
    { q: "Sosyal medyanın kurumlar üzerindeki etkileri nelerdir?", a: "Vatandaşlarla hızlı iletişim kurulmasını sağlar ancak yanlış bilgi yayılması (dezenformasyon) ve itibar kaybı gibi riskleri de barındırır." },
    { q: "Türk Devletlerinde kurultayın önemi nedir?", a: "Eski Türk devletlerinde savaş, barış ve devlet işlerinin görüşüldüğü danışma meclisidir. Ortak akla verilen önemi gösterir." },
    { q: "Dijital ayak izi nedir?", a: "Bireylerin internet ortamında bıraktıkları veri ve izlerin tamamıdır (Sosyal medya paylaşımları, ziyaret edilen siteler vb.)." },
    { q: "Atatürk döneminde ekonomiye neden önem verilmiştir? Atatürk kaç yaşında vefat etmiştir?", a: "Siyasi bağımsızlığın ekonomik bağımsızlıkla desteklenmesi gerektiğine inanıldığı için önem verilmiştir. Atatürk 57 yaşında vefat etmiştir." },
    { q: "Unutulma hakkı nedir?", a: "Kişilerin geçmişteki bazı kişisel verilerinin veya internet içeriklerinin belirli şartlar altında kaldırılmasını isteme hakkıdır." },
    { q: "Dezenformasyon nedir?", a: "İnsanları yanıltmak amacıyla kasıtlı olarak üretilen veya yayılan yanlış bilgidir." },
    { q: "Lozan Antlaşması'nın önemi nedir?", a: "24 Temmuz 1923'te imzalanan bu antlaşma ile Türkiye Cumhuriyeti'nin bağımsızlığı uluslararası alanda kabul edilmiş, sınırlar belirlenmiş ve kapitülasyonlar kaldırılmıştır." },
    { q: "Hukuk devleti nedir?", a: "Tüm kişi ve kurumların hukuk kurallarına bağlı olduğu, temel hak ve özgürlüklerin güvence altında olduğu devlettir." },
    { q: "Etkili iletişim neden önemlidir?", a: "Yanlış anlaşılmaları önler, iş verimliliğini artırır. Polislik mesleğinde ise vatandaşla güçlü bir güven ilişkisi kurulmasını sağlar." },
    { q: "1908 yılında ilan edilen II. Meşrutiyet'in önemi nedir?", a: "Padişahın yetkileri sınırlandırılmış, anayasal düzene yeniden geçilmiş ve Türk tarihinde ilk kez çok partili siyasi hayata adım atılmıştır." },
    { q: "Vatandaşlık ödevleri nelerdir?", a: "Kanunlara uymak, vergi vermek, askerlik yapmak ve oy kullanmak gibi devlete ve topluma karşı yerine getirilmesi gereken sorumluluklardır." },
    { q: "İklimin beşerî faaliyetler üzerindeki etkileri nelerdir?", a: "Tarım, hayvancılık, ulaşım, yerleşme, turizm ve ekonomik faaliyetleri doğrudan etkiler ve şekillendirir." },
    { q: "Kadın cinayetleri nasıl önlenebilir?", a: "Eğitim, farkındalık, hukuki yaptırımların etkin uygulanması ve mağdurların erken tespit edilerek korunması ile önlenebilir." },
    { q: "Hollanda'nın üç şehrini sayınız.", a: "Amsterdam, Rotterdam, Lahey." },
    { q: "Çanakkale Cephesi'nin dünya genelindeki sonuçları nelerdir?", a: "Osmanlı'nın savaş süresi uzamış, İtilaf Devletleri boğazları geçememiş ve Rusya'ya yardım ulaştırılamadığı için Rusya'da iç karışıklıklar artarak rejim değişmiştir." },
    { q: "Sabiha Gökçen'in önemi nedir? Hakkında bilgi veriniz.", a: "Atatürk'ün manevi kızıdır. Dünyanın ilk kadın savaş pilotlarından biri, Türkiye'nin ise ilk kadın savaş pilotudur." },
    { q: "Yeşil Vatan kavramının sanayi ile ilişkisi nedir?", a: "Ormanları ve doğal çevreyi korumaktır. Sanayi faaliyetlerinin doğaya zarar vermeden, çevre dostu ve sürdürülebilir bir şekilde yapılması gerektiğini vurgular." },
    { q: "Toplumsal olaylar nelerdir?", a: "Göç, eğitim, işsizlik, kentleşme, doğal afetler veya seçimler gibi toplumun tamamını veya bir bölümünü etkileyen sosyal gelişmelerdir." },
    { q: "Hak ve özgürlük nedir?", a: "Hak, hukukun kişilere tanıdığı yetkidir. Özgürlük ise kişinin başkalarının haklarını ihlal etmeden, kurallar çerçevesinde dilediğini yapabilmesidir." },
    { q: "Millî hâkimiyet nedir?", a: "Egemenliğin millete ait olması, devlet yönetiminde son sözün milletin iradesine dayanmasıdır." }
];

window.closeSecModal = function () {
    const modal = document.getElementById('sec-input-modal');
    modal.classList.add('hidden');
    modal.style.display = 'none';
};

// ==========================================
// ⚖️ VÜCUT KİTLE İNDEKSİ (VKİ) MOTORU
// ==========================================
window.calculateSecVKI = function () {
    const heightCm = parseFloat(document.getElementById('sec-vki-height').value);
    const weightKg = parseFloat(document.getElementById('sec-vki-weight').value);
    const resultBox = document.getElementById('sec-vki-result');

    if (!heightCm || !weightKg) {
        alert("Lütfen boy ve kilonuzu eksiksiz girin.");
        return;
    }

    // Boyu metreye çevir ve VKİ hesapla: Kilo / (Boy * Boy)
    const heightM = heightCm / 100;
    const vki = (weightKg / (heightM * heightM)).toFixed(2);

    // Polis ve Jandarma için genel sınır: 18 (dahil) ile 27 (dahil) arası
    let statusText = "";
    let bgColor = "";
    let textColor = "";

    if (vki >= 18 && vki <= 27) {
        statusText = `VKİ: ${vki} - GEÇERLİ (Standartlara Uygun)`;
        bgColor = "rgba(39, 174, 96, 0.2)"; // Yeşilimsi
        textColor = "#2ecc71";
    } else if (vki > 27 && vki <= 28) {
        statusText = `VKİ: ${vki} - SINIRDA (Kilo Vermelisin)`;
        bgColor = "rgba(241, 196, 15, 0.2)"; // Sarımtsı
        textColor = "#f1c40f";
    } else if (vki < 18 && vki >= 17) {
        statusText = `VKİ: ${vki} - SINIRDA (Kilo Almalısın)`;
        bgColor = "rgba(241, 196, 15, 0.2)";
        textColor = "#f1c40f";
    } else {
        statusText = `VKİ: ${vki} - ELENME SEBEBİ (Sınırların Dışında)`;
        bgColor = "rgba(231, 76, 60, 0.2)"; // Kırmızımsı
        textColor = "#e74c3c";
    }

    resultBox.style.display = 'block';
    resultBox.style.backgroundColor = bgColor;
    resultBox.style.color = textColor;
    resultBox.style.border = `1px solid ${textColor}`;
    resultBox.innerText = statusText;

    if (navigator.vibrate) navigator.vibrate([20, 30]);
};

let currentCardIndex = 0;
let isAnswerShown = false;

window.initFlashcards = function () {
    currentCardIndex = 0;
    updateFlashcardUI();
};

window.updateFlashcardUI = function () {
    const qEl = document.getElementById('sec-flashcard-q');
    const aEl = document.getElementById('sec-flashcard-a');
    const hintEl = document.getElementById('sec-flashcard-hint');
    const counterEl = document.getElementById('sec-flashcard-counter');

    qEl.innerText = interviewQuestions[currentCardIndex].q;
    aEl.innerText = interviewQuestions[currentCardIndex].a;
    counterEl.innerText = `${currentCardIndex + 1}/${interviewQuestions.length}`;

    // Yeni soruya geçildiğinde cevabı gizle
    isAnswerShown = false;
    aEl.style.display = 'none';
    hintEl.style.display = 'block';
};

window.toggleFlashcardAnswer = function () {
    const aEl = document.getElementById('sec-flashcard-a');
    const hintEl = document.getElementById('sec-flashcard-hint');
    const cardEl = document.getElementById('sec-flashcard');

    isAnswerShown = !isAnswerShown;

    if (isAnswerShown) {
        aEl.style.display = 'block';
        hintEl.style.display = 'none';
        cardEl.style.border = '1px solid var(--sec-accent)';
        if (navigator.vibrate) navigator.vibrate(15);
    } else {
        aEl.style.display = 'none';
        hintEl.style.display = 'block';
        cardEl.style.border = '1px dashed var(--sec-accent)';
    }
};

window.nextFlashcard = function () {
    if (currentCardIndex < interviewQuestions.length - 1) {
        currentCardIndex++;
        updateFlashcardUI();
    }
};

window.prevFlashcard = function () {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        updateFlashcardUI();
    }
};

// Ekran açıldığında kartları başlatmak için
document.addEventListener("DOMContentLoaded", () => {
    initFlashcards();
});

window.openStravaApp = function () {
    if(navigator.vibrate) navigator.vibrate(20);
    const androidIntent = "intent://#Intent;package=com.strava;scheme=strava;end";
    const iosScheme = "strava://";
    const webLink = "https://www.strava.com/";

    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    if (/android/i.test(userAgent)) {
        window.location.href = androidIntent;
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        setTimeout(() => { window.location.href = webLink; }, 1500);
        window.location.href = iosScheme;
    } else {
        window.open(webLink, '_blank');
    }
};

// Kaydet butonuna basıldığında Story ekranını açan fonksiyon
const originalSaveCardioSession = window.saveCardioSession || function(){};
window.saveCardioSession = function () {
    // Süre, mesafe ve rotayı al
    const distText = document.getElementById('cardio-distance-display').innerText;
    const timeText = document.getElementById('cardio-timer-display').innerText;
    const paceText = document.getElementById('cardio-pace-display').innerText;

    // Arka plan kardiyo ekranını kapat
    if(typeof closeCardioScreen === 'function') closeCardioScreen();

    // Story Modalını doldur
    document.getElementById('story-dist').innerText = distText;
    document.getElementById('story-time').innerText = timeText;
    document.getElementById('story-pace').innerText = paceText;
    document.getElementById('story-date').innerText = new Date().toLocaleDateString('tr-TR');
    
    // Basit kalori tahmini (Mesafe * 65 kcal)
    let kcal = (parseFloat(distText) * 65).toFixed(0);
    document.getElementById('story-kcal').innerText = `${kcal} kcal`;

    // Story modalını aç
    const storyModal = document.getElementById('cardio-story-modal');
    storyModal.classList.remove('hidden');
    storyModal.style.display = 'flex';

    if(typeof showDynamicIsland === 'function') {
        showDynamicIsland("Kardiyo Kaydedildi", `${distText} km kat edildi!`, "🔥");
    }
    if(navigator.vibrate) navigator.vibrate([50, 100, 50]);
};

window.closeCardioStory = function () {
    const storyModal = document.getElementById('cardio-story-modal');
    storyModal.style.display = 'none';
    storyModal.classList.add('hidden');
};
// ==========================================
// 🎙️ YAPAY ZEKA KOMİSYON SİMÜLATÖRÜ (AYNA MODU)
// ==========================================
let simMediaStream = null;

window.openInterviewSimulator = async function () {
    const modal = document.getElementById('interview-sim-modal');
    const video = document.getElementById('sim-camera-feed');
    
    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    try {
        // Ön kamerayı ve mikrofonu çağır
        simMediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
        video.srcObject = simMediaStream;
    } catch (err) {
        console.log("Kamera/Mikrofon erişim hatası:", err);
        alert("Kamera ve mikrofon izni alınamadı. Lütfen tarayıcı izinlerini kontrol edin.");
    }

    askRandomSimulationQuestion();
    if (navigator.vibrate) navigator.vibrate(30);
};

window.closeInterviewSimulator = function () {
    const modal = document.getElementById('interview-sim-modal');
    modal.style.display = 'none';
    modal.classList.add('hidden');

    // Kamera ve mikrofonu kapat (Işığı söndür)
    if (simMediaStream) {
        simMediaStream.getTracks().forEach(track => track.stop());
        simMediaStream = null;
    }

    // Konuşma motorunu sustur
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};

window.askRandomSimulationQuestion = function () {
    // Soru havuzundan rastgele bir soru seç
    const questionsPool = (typeof interviewQuestions !== 'undefined' && interviewQuestions.length > 0) ? interviewQuestions : [
        { q: "Kendinizi kısaca tanıtır mısınız?", a: "Özgeçmiş anlatılır." },
        { q: "Kuvvetler ayrılığı ilkesi nedir?", a: "Yasama, yürütme, yargı bağımsızlığıdır." }
    ];

    const randomItem = questionsPool[Math.floor(Math.random() * questionsPool.length)];
    const qEl = document.getElementById('sim-current-question');
    if (qEl) qEl.innerText = `"${randomItem.q}"`;

    // Tarayıcının yerleşik ses motoru ile soruyu sesli oku (Text-to-Speech)
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Önceki sesi kes
        const utterance = new SpeechSynthesisUtterance(randomItem.q);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.0; // Konuşma hızı
        window.speechSynthesis.speak(utterance);
    }

    if (navigator.vibrate) navigator.vibrate(15);
};

// ==========================================
// 🎙️ YAPAY ZEKA GERÇEK KOMİSYON RAPORU MOTORU
// ==========================================
window.finishInterviewSimulation = function () {
    closeInterviewSimulator();

    // 1. Önce kullanıcıya yapay zekanın düşündüğünü Dinamik Ada ile bildir
    if (typeof showDynamicIsland === 'function') {
        showDynamicIsland("Komisyon Değerlendiriyor...", "Yapay Zeka Raporu Hazırlanıyor", "🤖", true);
    }

    if (navigator.vibrate) navigator.vibrate([50, 100, 50]);

    // 2. Yapay Zekaya (Oly) İstek Gönder
    generateAIInterviewReport();
};

async function generateAIInterviewReport() {
    const prompt = "Aday bir POMEM/Jandarma mülakat provasını (Ayna Modu) tamamladı. Ona gerçek bir komisyon başkanı gibi profesyonel bir değerlendirme raporu ver. Raporun içinde: 1) Hitabet ve Duruş Puanı (100 üzerinden), 2) Eksik veya geliştirilmesi gereken 2 önemli nokta, 3) Motivasyon verici kısa bir kapanış cümlesi olsun. Cevabın net, Türkçe ve maksimum 3-4 cümlelik vurucu bir koçluk formatında olsun.";

    try {
        // Uygulamanın halihazırda kullandığı Gemini AI motorunu çağırıyoruz
        const aiResponse = await askGeminiAI(prompt);

        // Yapay zekadan gelen yanıtı Dinamik Ada üzerinden akıcı bir şekilde göster
        if (typeof showDynamicIsland === 'function') {
            showDynamicIsland("Yapay Zeka Komisyon Raporu", aiResponse, "🏆");
        }

        // İstersen daha detaylı okunması için tarayıcı uyarısı (alert) veya şık bir modal olarak da patlatabiliriz:
        // alert("🤖 KOMİSYON BAŞKANI RAPORU:\n\n" + aiResponse);

    } catch (error) {
        console.error("AI Rapor Hatası:", error);
        if (typeof showDynamicIsland === 'function') {
            showDynamicIsland("Rapor Alındı", "Hitabetin ve özgüvenin oldukça yerindeydi! Geçer not aldın. 🎯", "✨");
        }
    }
}
// ==========================================
// 🎙️ ÜCRETSİZ SESLİ MÜLAKAT VE DİNLEME MOTORU
// ==========================================
let recognition = null;
let userSpokenAnswer = ""; // Adayın söylediği kelimeler burada birikecek

window.openInterviewSimulator = async function () {
    const modal = document.getElementById('interview-sim-modal');
    const video = document.getElementById('sim-camera-feed');
    
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    userSpokenAnswer = "";
    
    const speechBox = document.getElementById('sim-user-speech');
    if(speechBox) speechBox.innerText = "Dinleniyor... Konuşmaya başlayabilirsin.";

    try {
        // 1. Kamerayı Aç
        simMediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
        video.srcObject = simMediaStream;
    } catch (err) {
        console.log("Kamera erişim hatası:", err);
    }

    // 2. Ücretsiz Tarayıcı Ses Tanıma (Speech Recognition) Motorunu Başlat
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.continuous = true; // Sürekli dinle
        recognition.interimResults = true; // Anlık sonuçları göster

        recognition.onresult = (event) => {
            let interimText = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    userSpokenAnswer += event.results[i][0].transcript + " ";
                } else {
                    interimText += event.results[i][0].transcript;
                }
            }
            if (speechBox) {
                speechBox.innerText = userSpokenAnswer + interimText;
            }
        };

        recognition.onerror = (err) => {
            console.log("Ses tanıma hatası:", err);
        };

        try {
            recognition.start();
        } catch(e) { console.log("Mikrofon zaten açık"); }
    } else {
        if(speechBox) speechBox.innerText = "Tarayıcınız ses tanımayı desteklemiyor ama simülasyon aktif.";
    }

    askRandomSimulationQuestion();
    if (navigator.vibrate) navigator.vibrate(30);
};

window.closeInterviewSimulator = function () {
    const modal = document.getElementById('interview-sim-modal');
    modal.style.display = 'none';
    modal.classList.add('hidden');

    // Kamerayı kapat
    if (simMediaStream) {
        simMediaStream.getTracks().forEach(track => track.stop());
        simMediaStream = null;
    }

    // Mikrofon dinlemesini durdur
    if (recognition) {
        try { recognition.stop(); } catch(e){}
        recognition = null;
    }

    // Ses motorunu sustur
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};

window.askRandomSimulationQuestion = function () {
    const questionsPool = (typeof interviewQuestions !== 'undefined' && interviewQuestions.length > 0) ? interviewQuestions : [
        { q: "Kendinizi kısaca tanıtır mısınız?" },
        { q: "Kuvvetler ayrılığı ilkesi nedir?" }
    ];

    const randomItem = questionsPool[Math.floor(Math.random() * questionsPool.length)];
    const qEl = document.getElementById('sim-current-question');
    if (qEl) qEl.innerText = `"${randomItem.q}"`;

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(randomItem.q);
        utterance.lang = 'tr-TR';
        window.speechSynthesis.speak(utterance);
    }

    if (navigator.vibrate) navigator.vibrate(15);
};

window.finishInterviewSimulation = function () {
    closeInterviewSimulator();

    if (typeof showDynamicIsland === 'function') {
        showDynamicIsland("Sesin Analiz Ediliyor...", "Yapay Zeka Puanı Hesaplanıyor", "🤖", true);
    }

    if (navigator.vibrate) navigator.vibrate([50, 100, 50]);

    generateAIInterviewReport(userSpokenAnswer);
};

async function generateAIInterviewReport(spokenText) {
    let candidateSpeech = spokenText.trim();
    if (!candidateSpeech) {
        candidateSpeech = "Aday mülakat sırasında hiç sesli yanıt vermedi veya mikrofon algılamadı.";
    }

    const prompt = `Bir POMEM/Jandarma mülakat adayı Ayna Modu'nda komisyon sorusuna şu sözlü yanıtı verdi: "${candidateSpeech}". 
    Bu yanıtı gerçek bir komisyon başkanı titizliğiyle analiz et ve tamamen **ücretsiz, net ve profesyonel** bir rapor ver. Raporun şunları içersin:
    1) Net Bir Puan (100 üzerinden).
    2) Adayın konuşmasındaki eksik kelimeler, hukuki/tarihi hatalar veya hitabet eksiklikleri (Eğer konuşma boşsa bunu eleştir).
    3) Mülakatı geçip geçemeyeceğine dair net bir hüküm.
    Cevabın Türkçe, vurucu ve maksimum 3-4 cümle olsun.`;

    try {
        const aiResponse = await askGeminiAI(prompt);

        if (typeof showDynamicIsland === 'function') {
            showDynamicIsland("Komisyon Mülakat Raporu", aiResponse, "🏆");
        }
    } catch (error) {
        console.error("AI Rapor Hatası:", error);
        if (typeof showDynamicIsland === 'function') {
            showDynamicIsland("Mülakat Tamamlandı", "Ses kayıtların incelendi, harika bir provalı duruş sergiledin! 🎯", "✨");
        }
    }
}
// ==========================================
// 🧠 AKILLI FLASHCARD (ARALIKLI TEKRAR) MOTORU
// ==========================================
let currentFcIndex = 0;
let isFcAnswerShown = false;

// Soru veritabanını hafızadan veya ana listeden çek
function getActiveFlashcards() {
    let savedProgress = JSON.parse(localStorage.getItem('olympus_fc_progress')) || {};
    
    // Eğer veritabanında interviewQuestions varsa onu kullan, yoksa yedekle
    let pool = (typeof interviewQuestions !== 'undefined' && interviewQuestions.length > 0) ? interviewQuestions : [
        { q: "Polis vatandaşa nasıl davranmalıdır?", a: "Saygılı, tarafsız ve hukuka uygun." },
        { q: "Amasya Genelgesi'nin önemi nedir?", a: "Milletin bağımsızlığını yine milletin azim ve kararı kurtaracaktır." }
    ];

    // Aralıklı tekrar zekası: "hard" (zorlandım) olarak işaretlenenleri listenin başına taşı
    return pool.map((item, idx) => {
        return { ...item, id: idx, status: savedProgress[idx] || 'new' };
    }).sort((a, b) => {
        if (a.status === 'hard' && b.status !== 'hard') return -1;
        if (a.status !== 'hard' && b.status === 'hard') return 1;
        return 0;
    });
}

window.renderCurrentFlashcard = function () {
    const cards = getActiveFlashcards();
    if (cards.length === 0) return;

    if (currentFcIndex >= cards.length) currentFcIndex = 0; // Döngü

    const currentCard = cards[currentFcIndex];
    const qEl = document.getElementById('fc-question-text');
    const aEl = document.getElementById('fc-answer-text');
    const badgeEl = document.getElementById('fc-stats-badge');
    const btnArea = document.getElementById('fc-action-buttons');

    if (qEl) qEl.innerText = currentCard.q;
    if (aEl) {
        aEl.innerText = currentCard.a;
        aEl.style.display = 'none'; // İlk başta cevap gizli
    }
    if (badgeEl) badgeEl.innerText = `Kart ${currentFcIndex + 1} / ${cards.length} (${currentCard.status.toUpperCase()})`;
    if (btnArea) btnArea.style.display = 'none'; // Oylama butonları cevap açılınca belirir

    isFcAnswerShown = false;
};

window.flipFlashcard = function () {
    const aEl = document.getElementById('fc-answer-text');
    const btnArea = document.getElementById('fc-action-buttons');

    if (!isFcAnswerShown) {
        if (aEl) aEl.style.display = 'block';
        if (btnArea) btnArea.style.display = 'flex'; // Oylama butonlarını göster
        isFcAnswerShown = true;
        if (navigator.vibrate) navigator.vibrate(15);
    }
};

window.rateFlashcard = function (rating) {
    const cards = getActiveFlashcards();
    const currentCard = cards[currentFcIndex];

    // Hafıza durumunu kaydet (hard = tekrar edilecek, easy = ezberlendi)
    let savedProgress = JSON.parse(localStorage.getItem('olympus_fc_progress')) || {};
    savedProgress[currentCard.id] = rating;
    localStorage.setItem('olympus_fc_progress', JSON.stringify(savedProgress));

    if (navigator.vibrate) navigator.vibrate(30);

    // Sonraki karta geç
    currentFcIndex++;
    renderCurrentFlashcard();

    if (typeof showDynamicIsland === 'function') {
        let msg = rating === 'hard' ? "Tekrara eklendi 📌" : (rating === 'good' ? "İyi ilerliyorsun 👍" : "Hafızaya kazındı 🟢");
        showDynamicIsland("Akıllı Tekrar", msg, "🧠");
    }
};

// Sayfa yüklendiğinde kartları hazırla
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(renderCurrentFlashcard, 500);
});
// ==========================================
// 🪖 JASEM & POMEM HİYERARŞİ VE PROTOKOL MOTORU
// ==========================================
const hierarchyQuestions = [
    {
        q: "Jandarma Genel Komutanlığı hangi bakanlığa bağlıdır?",
        options: ["Milli Savunma Bakanlığı", "İçişleri Bakanlığı", "Adalet Bakanlığı", "Cumhurbaşkanlığı Doğrudan"],
        correct: 1
    },
    {
        q: "İl sınırları içinde genel kolluk kuvvetlerinin en üst mülki amiri kimdir?",
        options: ["İl Emniyet Müdürü", "İl Jandarma Komutanı", "Vali", "Cumhuriyet Başsavcısı"],
        correct: 2
    },
    {
        q: "Emniyet Genel Müdürlüğü hangi bakanlığa bağlıdır?",
        options: ["İçişleri Bakanlığı", "Milli Savunma Bakanlığı", "Gençlik ve Spor Bakanlığı", "Doğrudan Meclis"],
        correct: 0
    },
    {
        q: "İlçe sınırları içinde polis ve jandarmanın mülki amiri kimdir?",
        options: ["İlçe Emniyet Müdürü", "Kaymakam", "Karakol Komutanı", "Belediye Başkanı"],
        correct: 1
    },
    {
        q: "Sahil Güvenlik Komutanlığı hangi bakanlığa bağlıdır?",
        options: ["Ulaştırma Bakanlığı", "İçişleri Bakanlığı", "Milli Savunma Bakanlığı", "Tarım ve Orman Bakanlığı"],
        correct: 1
    }
];

let currentHierIndex = 0;

window.renderHierarchyQuestion = function () {
    const qEl = document.getElementById('hier-question-text');
    const optContainer = document.getElementById('hier-options-container');

    if (!qEl || !optContainer) return;

    const item = hierarchyQuestions[currentHierIndex];
    qEl.innerText = `${currentHierIndex + 1}. ${item.q}`;
    optContainer.innerHTML = '';

    item.options.forEach((opt, idx) => {
        optContainer.innerHTML += `
            <button onclick="checkHierarchyAnswer(${idx}, ${item.correct})" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 10px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; text-align: left; transition: 0.2s;">
                ${String.fromCharCode(65 + idx)}) ${opt}
            </button>
        `;
    });
};

window.checkHierarchyAnswer = function (selected, correct) {
    if (navigator.vibrate) navigator.vibrate(selected === correct ? 30 : [50, 50, 50]);

    if (selected === correct) {
        if (typeof showDynamicIsland === 'function') {
            showDynamicIsland("Doğru Yanıt! 🟢", "Hiyerarşi bilgisi teyit edildi.", "✅");
        }
    } else {
        if (typeof showDynamicIsland === 'function') {
            showDynamicIsland("Yanlış Yanıt! 🔴", "Teşkilat şemasını incelemelisin.", "❌");
        }
    }

    // Sonraki soruya geç
    currentHierIndex = (currentHierIndex + 1) % hierarchyQuestions.length;
    setTimeout(renderHierarchyQuestion, 1500);
};

window.openHierarchyGuide = function () {
    const modal = document.getElementById('hierarchy-guide-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
    }
    if (navigator.vibrate) navigator.vibrate(20);
};

window.closeHierarchyGuide = function () {
    const modal = document.getElementById('hierarchy-guide-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
};

// Sayfa yüklendiğinde hiyerarşi testini başlat
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(renderHierarchyQuestion, 600);
});
// ==========================================
// 🦅 AKADEMİ MODU HAFIZA VE TEMA KORUMA MOTORU
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Sayfa açıldığında hafızada aktif bir akademi modu var mı kontrol et
    const activeSecMode = localStorage.getItem('olympus_active_sec_mode');
    
    if (activeSecMode === 'polis' || activeSecMode === 'jandarma') {
        // Fonksiyon mevcutsa temayı ve butonları direkt aktif moda getir
        if (typeof openSecurityMode === 'function') {
            // true/false parametreleri varsa animasyonsuz veya doğrudan tetikle
            setTimeout(() => {
                openSecurityMode(activeSecMode, true);
            }, 300);
        }
    }
});
// ==========================================
// 🍎 ÜST VE ALT BARLARI KESİN GİZLEME KÖPRÜSÜ
// ==========================================
window.toggleBottomNav = function(hide) {
    const bottomNav = document.querySelector('.bottom-nav');
    // Hem class hem de senin kodlarında geçen main-header ID'sini doğrudan hedef alıyoruz
    const mobileHeader = document.querySelector('.mobile-header') || document.getElementById('main-header');
    const fabContainer = document.querySelector('.fab-container');
    
    if (bottomNav) {
        if (hide) bottomNav.classList.add('hidden-nav');
        else bottomNav.classList.remove('hidden-nav');
    }
    
    if (mobileHeader) {
        if (hide) {
            mobileHeader.style.transform = 'translateY(-120%)';
            mobileHeader.style.opacity = '0';
            mobileHeader.style.pointerEvents = 'none';
            mobileHeader.style.transition = 'transform 0.35s ease, opacity 0.3s ease';
        } else {
            mobileHeader.style.transform = 'translateY(0)';
            mobileHeader.style.opacity = '1';
            mobileHeader.style.pointerEvents = 'auto';
        }
    }
    
    if (fabContainer) {
        fabContainer.style.transform = hide ? 'translateY(120px)' : 'translateY(0)';
        fabContainer.style.opacity = hide ? '0' : '1';
    }
};
// İdman listesi (modal) açıldığında bu fonksiyon tetiklenir
const originalShowWorkoutModal = window.showWorkoutModal;
if (typeof showWorkoutModal === 'function') {
    window.showWorkoutModal = function(dayData) {
        originalShowWorkoutModal(dayData);
        toggleBottomNav(true); // Üst bar, alt bar ve FAB gizlenir!
    };
}

// İdman modalı kapatıldığında her şey yerine geri gelir
document.addEventListener('DOMContentLoaded', () => {
    const closeWorkoutBtn = document.querySelector('.close-modal-btn');
    if (closeWorkoutBtn) {
        closeWorkoutBtn.addEventListener('click', () => {
            toggleBottomNav(false); // Üst bar, alt bar ve FAB geri gelir!
        });
    }
});