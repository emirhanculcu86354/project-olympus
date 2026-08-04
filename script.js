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

db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });

// YÜKLEME EKRANI KONTROLÜ İÇİN DEĞİŞKEN
let isAppInitialized = false;

auth.onAuthStateChanged(user => {
    if (user) {
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
                btnAll.style.display = 'none';
                if (viewMode === 'all') { viewMode = 'today'; updateCalendarTabs(); }
                dayTracker.style.display = 'flex';
                document.getElementById('spotify-floating-player').classList.add('hidden'); // Müziği Gizle
            } else if (target === 'workout-sec') {
                btnAll.style.display = 'block';
                dayTracker.style.display = 'flex';
                document.getElementById('spotify-floating-player').classList.remove('hidden'); // Müziği Göster
            } else {
                dayTracker.style.display = 'none';
                document.getElementById('spotify-floating-player').classList.add('hidden'); // Müziği Gizle
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

function renderWorkouts() {
    let isTomorrow = (viewMode === 'tomorrow');
    const container = document.getElementById('days-container');
    container.innerHTML = '';

    if (viewMode === 'all') {
        document.getElementById('workout-day-title').innerText = "Tüm Program";
        document.getElementById('workout-day-desc').innerText = "Görmek istediğiniz güne dokunun.";
        programData[currentPhase].forEach(d => {
            const card = document.createElement('div');
            card.className = `card ${d.rest ? 'rest-day' : ''}`;
            card.innerHTML = `<h3>${d.title}</h3><p>${d.rest ? 'Dinlenme Günü' : 'Detayları görmek için dokun.'}</p>`;
            if (!d.rest) card.addEventListener('click', () => showWorkoutModal(d));
            container.appendChild(card);
        });
    } else {
        const d = programData[currentPhase].find(x => x.day == calculatedDay);
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
}

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

window.startActiveWorkout = function (dayData) {
    activeWorkout = dayData.ex;
    currentExIndex = 0;
    document.getElementById('workout-modal').style.display = 'none';
    document.getElementById('active-workout-screen').classList.remove('hidden');
    const player = document.getElementById('spotify-floating-player');
    if (player) player.classList.remove('hidden');

    renderActiveExercise();
}

function renderActiveExercise() {
    if (currentExIndex >= activeWorkout.length) {
        finishWorkout();
        return;
    }
    const ex = activeWorkout[currentExIndex];
    document.getElementById('player-progress').innerText = `${currentExIndex + 1} / ${activeWorkout.length} Hareket`;
    document.getElementById('player-ex-name').innerText = ex.name;
    document.getElementById('player-ex-details').innerText = `Set: ${ex.scheme} | Tempo: ${ex.tempo} | RPE: ${ex.rpe}`;

    document.getElementById('player-weight').value = '';
    document.getElementById('player-reps').value = '';

    document.getElementById('player-timer-display').classList.add('hidden');
    document.getElementById('player-next-btn').classList.add('hidden');
    document.getElementById('player-save-btn').classList.remove('hidden');
}

window.saveSetAndRest = function () {
    document.getElementById('player-save-btn').classList.add('hidden');
    document.getElementById('player-timer-display').classList.remove('hidden');
    document.getElementById('player-next-btn').classList.remove('hidden');

    let sec = isExpressMode ? 45 : 90;
    document.getElementById('timer-seconds').innerText = sec;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        sec--;
        document.getElementById('timer-seconds').innerText = sec;
        if (sec <= 0) {
            clearInterval(timerInterval);
            if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
            alert("Dinlenme Bitti! Sete Başla!");
        }
    }, 1000);
}

window.nextExercise = function () {
    clearInterval(timerInterval);
    currentExIndex++;
    renderActiveExercise();
}

window.finishWorkout = function () {
    clearInterval(timerInterval);
    document.getElementById('active-workout-screen').classList.add('hidden');
    document.getElementById('main-header').style.display = 'block';
    confetti({ particleCount: 150, spread: 80, colors: ['#f6c000', '#fff'] });

    const activeDayData = programData[currentPhase].find(x => x.day == calculatedDay);
    if (activeDayData && activeDayData.muscles) {
        // Eski Sistem
        let worked = JSON.parse(localStorage.getItem('olympus_worked_muscles')) || [];
        activeDayData.muscles.forEach(m => { if (!worked.includes(m)) worked.push(m); });
        localStorage.setItem('olympus_worked_muscles', JSON.stringify(worked));
        
        // YENİ SİSTEM: Saatli ve Sayaçlı Toparlanma Hafızası
        let workedV2 = JSON.parse(localStorage.getItem('olympus_worked_muscles_v2')) || {};
        const now = Date.now();
        activeDayData.muscles.forEach(m => { workedV2[m] = now; });
        localStorage.setItem('olympus_worked_muscles_v2', JSON.stringify(workedV2));
    }

    // YENİ: İdman bitince 150 Puan Ekle
    if (window.addOlympusPoints) window.addOlympusPoints(150, "İdman Tamamlandı");
    // --- YENİ: OTOMATİK SUPPLEMENT STOK DÜŞME MOTORU ---
    let supps = JSON.parse(localStorage.getItem('olympus_supp_stock'));
    if (supps) {
        // İdman bittiği için stoklardan 1'er servis düş (Sıfırın altına inmesin)
        if (supps.whey > 0) supps.whey--;
        if (supps.creatine > 0) supps.creatine--;
        if (supps.carnitine > 0) supps.carnitine--;
        localStorage.setItem('olympus_supp_stock', JSON.stringify(supps));

        // Kritik Stok Kontrolü (5 servisin altına inenleri bul)
        let warnings = [];
        if(supps.whey <= 5 && supps.whey > 0) warnings.push("Whey Protein");
        if(supps.creatine <= 5 && supps.creatine > 0) warnings.push("Kreatin");
        if(supps.carnitine <= 5 && supps.carnitine > 0) warnings.push("L-Karnitin");
        if(supps.electro <= 5 && supps.electro > 0) warnings.push("Elektrolit");

        if(warnings.length > 0) {
            setTimeout(() => {
                alert(`⚠️ YAKIT KRİTİK SEVİYEDE:\n\n${warnings.join(", ")} stokların 5 servisin altına düştü. Yeni sipariş verme vakti yaklaşıyor şampiyon!`);
            }, 1500); // Ana tebrik mesajından 1.5 saniye sonra uyarır
        }
    }

    alert("🔥 İDMAN TAMAMLANDI!\n🏆 KAS HARİTAN GÜNCELLENDİ VE 150 OLYMPUS KAZANDIN!");
    toggleAct(3, true);
}

window.exitWorkoutPlayer = function () {
    clearInterval(timerInterval);
    document.getElementById('active-workout-screen').classList.add('hidden');
    document.getElementById('main-header').style.display = 'block';
}

function renderDiet() {
    let isTomorrow = (viewMode === 'tomorrow');
    const container = document.getElementById('diet-container');
    container.innerHTML = '';

    let targetDay = viewMode === 'all' ? 1 : calculatedDay;
    const d = dietData[targetDay];
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
            <div class="input-group"><label>Bugün Alınan Kalori (kcal)</label><input type="number" id="m-cal" placeholder="2500"></div>
            <button class="save-btn" onclick="saveMacros()">Kaydet</button>
            <div style="background:#151515; padding:5px; border-radius:10px; margin-top:10px;"><canvas id="modalChart"></canvas></div>
        `;
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

    if(typeof syncDataToCloud === 'function') syncDataToCloud();
    document.getElementById('tracking-modal').style.display = 'none'; 
    loadProfileData(); // Okların hesaplanması için yeniden yükle
};

// ==========================================
// 📅 STREAK TAKVİMİ VE FOTOĞRAF GALERİSİ
// ==========================================
window.renderStreakCalendar = function() {
    const container = document.getElementById('streak-days');
    if(!container) return;

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
            let photos = JSON.parse(localStorage.getItem('olympus_progress_photos')) || [];
            
            // Cihaz hafızasını şişirmemek için maks 10 fotoğraf (Eski olanı silmez, uyarır)
            if(photos.length >= 10) {
                alert("Maksimum 10 fotoğraf yükleyebilirsin. Yenisini eklemek için lütfen eskilerden birini sil!");
                return;
            }
            
            photos.push({
                id: Date.now(),
                date: new Date().toLocaleDateString('tr-TR'),
                img: e.target.result // Base64 Olarak Cihaza (LocalStorage) Kaydediliyor
            });
            localStorage.setItem('olympus_progress_photos', JSON.stringify(photos));
            renderProgressGallery();
            if (navigator.vibrate) navigator.vibrate(20);
        };
        reader.readAsDataURL(file); // Resmi metne çevirir
    }
};

window.renderProgressGallery = function() {
    const container = document.getElementById('progress-gallery');
    if(!container) return;

    let photos = JSON.parse(localStorage.getItem('olympus_progress_photos')) || [];
    
    container.innerHTML = '';
    if(photos.length === 0) {
        container.innerHTML = '<p style="color:#888; font-size:12px; margin:auto; padding:20px 0; font-style:italic;">Formunu belgelemek için bir fotoğraf ekle.</p>';
        return;
    }

    // En yeni fotoğraf en solda (başta) gözüksün diye reverse atıyoruz
    photos.slice().reverse().forEach(p => {
        container.innerHTML += `
            <div class="progress-item">
                <img src="${p.img}">
                <button class="progress-delete" onclick="deleteProgressPhoto(${p.id})">✖</button>
                <div class="progress-date">${p.date}</div>
            </div>
        `;
    });
};

window.deleteProgressPhoto = function(id) {
    if(confirm("Bu gelişim fotoğrafını silmek istediğine emin misin?")) {
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
}

// GÜNCELLENMİŞ: Akıllı Ölçüler ve Trend Okları
window.loadProfileData = function() {
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
                        trendHTML = `<span style="color:${color}; font-size:11px; font-weight:bold; margin-top:4px;">📈 +${diff}</span>`;
                    } else {
                        // Azalış: Kilo/bel ise Yeşil, Kas kaybediyorsa Kırmızı
                        let color = (m.key === 'w' || m.key === 'waist') ? '#27ae60' : '#ff4444';
                        trendHTML = `<span style="color:${color}; font-size:11px; font-weight:bold; margin-top:4px;">📉 ${diff}</span>`;
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
    if(typeof initMuscleInteractions === 'function') initMuscleInteractions();

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

window.updateAnatomyView = function() {
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
            if(m === 'chest') trName = "Göğüs";
            if(m.includes('arms')) trName = "Kol";
            if(m === 'core') trName = "Karın (Core)";
            if(m.includes('legs')) trName = "Bacak";
            if(m === 'shoulders') trName = "Omuz";
            
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
                if(state !== 'green' && pos && timerContainer) {
                    if(!document.getElementById('badge-' + targetMuscle)) {
                        
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
                if(uniqueNames.includes(item.name)) return false;
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
window.initMuscleInteractions = function() {
    const display = document.getElementById('muscle-name-display');
    const groups = document.querySelectorAll('.muscle-group');

    groups.forEach(group => {
        const name = group.getAttribute('data-name');
        
        const showLabel = () => {
            if(display) {
                display.innerText = name;
                display.style.opacity = '1';
            }
            group.classList.add('active-touch');
        };
        const hideLabel = () => {
            if(display) display.style.opacity = '0';
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
// ==========================================
// ARENA EKRANI GEÇİŞ KONTROLLERİ
// ==========================================
window.openArenaScreen = function () {
    // Tüm ekranları gizle
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    // Sadece Arena'yı göster
    document.getElementById('arena-sec').classList.add('active');

    // Üstteki takvim/gün barını gizle (Arena'da görünmemesi için)
    const dayTracker = document.getElementById('day-tracker');
    if (dayTracker) dayTracker.style.display = 'none';

    loadGlobalFeed();
    loadLeaderboard();


    if (navigator.vibrate) navigator.vibrate(50);
}

window.closeArenaScreen = function () {
    // Arena'yı kapatıp Profil'e geri dön
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('profile-sec').classList.add('active');

    if (navigator.vibrate) navigator.vibrate(30);
}
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
let widgetMode = 0; // 0: Günün Sözü/Hedefi, 1: Su Durumu, 2: Streak

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
window.rotateHubWidget = function() {
    widgetMode = (widgetMode + 1) % 3;
    updateHubWidget();
    if (navigator.vibrate) navigator.vibrate(20);
};
function updateHubWidget() {
    const titleEl = document.getElementById('hub-widget-title');
    if (!titleEl) return;

    if (widgetMode === 0) {
        titleEl.innerText = "🚀 Limitlerini Zorla, Asla Durma!";
    } else if (widgetMode === 1) {
        let wData = JSON.parse(localStorage.getItem('olympus_water_obj')) || { amount: 0 };
        let goal = parseInt(localStorage.getItem('olympus_water_goal') || 3000);
        titleEl.innerText = `💧 Su Durumu: ${wData.amount} / ${goal} ml`;
    } else if (widgetMode === 2) {
        let streak = JSON.parse(localStorage.getItem('olympus_streak_data')) || [false];
        let activeCount = streak.filter(Boolean).length;
        titleEl.innerText = `🔥 Bu Hafta ${activeCount} Gün Aktif`;
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

// 1. Kişi Listesini Aç
window.openChatListModal = async function () {
    document.getElementById('chat-list-modal').style.display = 'flex';
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
        for (let uid of following) {
            const userDoc = await db.collection("users").doc(uid).get();
            if (userDoc.exists) {
                const uData = userDoc.data();
                listContainer.innerHTML += `
                    <div onclick="openChatRoom('${uid}', '${uData.name}', '${uData.photo || 'icon.png'}')" style="display:flex; align-items:center; gap:12px; background:#151515; padding:12px; border-radius:12px; border:1px solid #333; cursor:pointer; transition:0.2s;">
                        <img src="${uData.photo || 'icon.png'}" style="width:45px; height:45px; border-radius:50%; object-fit:cover; border:2px solid #00d2ff;">
                        <div style="flex:1;">
                            <h4 style="color:#fff; margin:0; font-size:14px;">${uData.name}</h4>
                            <span style="color:#888; font-size:11px;">Mesaj göndermek için dokun</span>
                        </div>
                        <span style="color:#00d2ff;">💬</span>
                    </div>
                `;
            }
        }
    } catch (e) {
        listContainer.innerHTML = '<p style="color:#ff4444; font-size:12px; text-align:center;">Kişiler yüklenemedi.</p>';
    }
};

// 2. Özel Sohbet Odasını Aç
window.openChatRoom = function (targetUid, targetName, targetPhoto) {
    document.getElementById('chat-list-modal').style.display = 'none';
    document.getElementById('chat-room-modal').style.display = 'flex';

    document.getElementById('chat-room-name').innerText = targetName;
    document.getElementById('chat-room-avatar').src = targetPhoto;

    // Mesajlaşma Odası Kimliğini (ID) Oluştur: İki UID'yi alfabetik sıraya dizerek eşsiz bir oda yaratırız
    const myUid = auth.currentUser.uid;
    currentActiveChatId = [myUid, targetUid].sort().join('_');

    listenForChatMessages(currentActiveChatId);
};

// 3. Sohbet Odasını Kapat
window.closeChatRoom = function () {
    document.getElementById('chat-room-modal').style.display = 'none';
    if (chatUnsubscribe) {
        chatUnsubscribe(); // Odadan çıkınca veri dinlemeyi durdur (Tasarruf)
    }
    currentActiveChatId = null;
    openChatListModal(); // Geri dönünce kişi listesini aç
};

// 4. Gerçek Zamanlı Mesaj Dinleyici (WhatsApp Mantığı)
function listenForChatMessages(chatId) {
    const container = document.getElementById('chat-messages-container');
    container.innerHTML = '<p style="color:gray; font-size:12px; text-align:center;">Şifreli sohbet başlatılıyor...</p>';

    // Eğer eski bir dinleyici varsa iptal et
    if (chatUnsubscribe) chatUnsubscribe();

    // Veritabanını anlık (canlı) dinle
    chatUnsubscribe = db.collection("chats").doc(chatId).collection("messages")
        .orderBy("timestamp", "asc")
        .onSnapshot((snapshot) => {
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p style="color:#555; font-size:12px; text-align:center; margin-top:20px;">İlk mesajı gönderen sen ol!</p>';
                return;
            }

            snapshot.forEach(doc => {
                const msg = doc.data();
                const isMe = msg.sender === auth.currentUser.uid;
                const bubbleClass = isMe ? 'chat-bubble-sent' : 'chat-bubble-received';

                // Zamanı ayarla
                let timeStr = "";
                if (msg.timestamp) {
                    const d = msg.timestamp.toDate();
                    timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                }

                container.innerHTML += `
                    <div class="chat-bubble ${bubbleClass}">
                        ${msg.text}
                        <span class="chat-timestamp">${timeStr}</span>
                    </div>
                `;
            });

            // Yeni mesaj gelince en alta kaydır
            container.scrollTop = container.scrollHeight;
        });
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
// ==========================================
// 🎯 YENİ TAKİP MERKEZİ FONKSİYONLARI
// ==========================================
window.saveSleep = function() {
    const val = document.getElementById('m-sleep').value;
    if(val) {
        let history = JSON.parse(localStorage.getItem('olympus_sleep_history')) || [];
        history.push({ date: new Date().toLocaleDateString('tr-TR'), val: val });
        localStorage.setItem('olympus_sleep_history', JSON.stringify(history));
        openTrackingModal('sleep'); // Ekranı ve grafiği yenile
        if(navigator.vibrate) navigator.vibrate(20);
    }
};

window.saveCardio = function() {
    const val = document.getElementById('m-steps').value;
    if(val) {
        let history = JSON.parse(localStorage.getItem('olympus_cardio_history')) || [];
        history.push({ date: new Date().toLocaleDateString('tr-TR'), val: val });
        localStorage.setItem('olympus_cardio_history', JSON.stringify(history));
        openTrackingModal('cardio');
        if(navigator.vibrate) navigator.vibrate(20);
    }
};

window.calculate1RM = function() {
    const w = parseFloat(document.getElementById('calc-w').value);
    const r = parseFloat(document.getElementById('calc-r').value);
    if(w > 0 && r > 0) {
        // Epley Formülü: 1RM = Ağırlık * (1 + (Tekrar / 30))
        const orm = w * (1 + (r / 30));
        document.getElementById('calc-result').innerText = orm.toFixed(1) + " kg";
        if(navigator.vibrate) navigator.vibrate([20, 40]);
    } else {
        alert("Lütfen geçerli bir ağırlık ve tekrar girin.");
    }
};

window.saveSupplements = function() {
    const s = {
        whey: document.getElementById('sup-whey').value || 0,
        creatine: document.getElementById('sup-creatine').value || 0,
        carnitine: document.getElementById('sup-carnitine').value || 0,
        electro: document.getElementById('sup-electro').value || 0
    };
    localStorage.setItem('olympus_supp_stock', JSON.stringify(s));
    
    document.getElementById('tracking-modal').style.display='none';
    if(navigator.vibrate) navigator.vibrate(50);
    alert("Yakıt stoku başarıyla güncellendi! ⚡");
};
window.saveActiveKcal = function() {
    const val = document.getElementById('m-active-kcal').value;
    if(val) {
        let history = JSON.parse(localStorage.getItem('olympus_active_kcal_history')) || [];
        history.push({ date: new Date().toLocaleDateString('tr-TR'), val: val });
        localStorage.setItem('olympus_active_kcal_history', JSON.stringify(history));
        openTrackingModal('active_kcal');
        if(navigator.vibrate) navigator.vibrate(20);
    }
};

window.saveBPM = function() {
    const val = document.getElementById('m-bpm').value;
    if(val) {
        let history = JSON.parse(localStorage.getItem('olympus_bpm_history')) || [];
        history.push({ date: new Date().toLocaleDateString('tr-TR'), val: val });
        localStorage.setItem('olympus_bpm_history', JSON.stringify(history));
        openTrackingModal('heart_rate');
        if(navigator.vibrate) navigator.vibrate(20);
    }
};
// Termal Anatomi Kartını Döndürme Motoru
window.toggleAnatomyCard = function(event) {
    if (event) event.stopPropagation(); // Tıklamanın arkaya geçip başka şeyleri bozmasını engeller
    const card = document.getElementById('anatomy-card-wrapper');
    if (card) {
        card.classList.toggle('flipped');
        if (navigator.vibrate) navigator.vibrate(20);
    }
};