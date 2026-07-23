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
                // Animasyon bitince ana ekranı göster
                document.getElementById('app-content').classList.remove('hidden');
            });
            isAppInitialized = true;
        } else {
            // Animasyon zaten oynadıysa direkt göster
            document.getElementById('app-content').classList.remove('hidden');
        }

        const photo = user.photoURL || 'icon.png';
        const name = user.displayName || 'Sporcu';
        document.getElementById('header-profile-img').src = photo;
        document.getElementById('profile-image-large').src = photo;
        document.getElementById('profile-name-display').innerText = name;
        document.getElementById('profile-name-input').value = name;
        loadDataFromCloud(user.uid);
    } else {
        // 2. DURUM: KULLANICI GİRİŞ YAPMAMIŞ (Uygulamayı ilk defa açıyor)
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none'; // Animasyonu iptal et
        
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-content').classList.add('hidden');
        isAppInitialized = true;
    }
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
        calculateCurrentDay();
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
            } else if (target === 'workout-sec') {
                btnAll.style.display = 'block';
                dayTracker.style.display = 'flex';
            } else {
                dayTracker.style.display = 'none';
            }

            if (target === 'profile-sec') { updateWeeklyScore(); loadProfileData(); }
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

// 4. UYGULAMA FONKSİYONLARI
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
        
        // YENİ: Pazartesi (Gün 1) olduğunda kasları otomatik temizle!
        if (calculatedDay === 1) {
            let lastReset = localStorage.getItem('olympus_muscle_reset_date');
            let todayStr = new Date().toLocaleDateString('tr-TR');
            if (lastReset !== todayStr) {
                localStorage.removeItem('olympus_worked_muscles');
                localStorage.setItem('olympus_muscle_reset_date', todayStr);
                updateAnatomyView(); // Ekranda da temizle
            }
        }
        
    } else if (viewMode === 'tomorrow') {
        calculatedDay = ((baseDay) % 7) + 1;
        document.getElementById('display-day-text').innerText = `GÜN ${calculatedDay}`;
    } else {
        document.getElementById('display-day-text').innerText = `TÜMÜ`;
    }
    renderWorkouts(); renderDiet();
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

    const startBtn = document.getElementById('start-workout-btn');
    const newStartBtn = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newStartBtn, startBtn);
    newStartBtn.addEventListener('click', () => {
        startActiveWorkout(dayData);
    });

    const holder = document.getElementById('modal-exercises');
    holder.innerHTML = '';
    dayData.ex.forEach(e => {
        const videoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(e.name + " form technique")}`;
        holder.innerHTML += `<div class="exercise-row">
            <a href="${videoUrl}" target="_blank" style="color:white;"><strong style="font-size:18px; text-decoration:underline;">${e.name} 📺</strong></a>
            <span style="font-size:14px; color:var(--text-muted); margin-top:4px;">Set: <b style="color:#fff">${e.scheme}</b> | Tempo: <b style="color:#fff">${e.tempo}</b> | RPE: <b style="color:var(--goldnova)">${e.rpe}</b></span>
        </div>`;
    });
    document.getElementById('workout-modal').style.display = 'flex';
}

window.startActiveWorkout = function (dayData) {
    activeWorkout = dayData.ex;
    currentExIndex = 0;
    document.getElementById('workout-modal').style.display = 'none';
    document.getElementById('active-workout-screen').classList.remove('hidden');
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

    let sec = 90;
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
    
    // YENİ: Hangi günde ve fazdaysak, o günün kaslarını al ve kaydet
    const activeDayData = programData[currentPhase].find(x => x.day == calculatedDay);
    if (activeDayData && activeDayData.muscles) {
        let worked = JSON.parse(localStorage.getItem('olympus_worked_muscles')) || [];
        activeDayData.muscles.forEach(m => {
            if (!worked.includes(m)) worked.push(m);
        });
        localStorage.setItem('olympus_worked_muscles', JSON.stringify(worked));
    }

    alert("🔥 İDMAN TAMAMLANDI! Kas haritan güncellendi.");
    toggleAct(3, true); // Görevlerden idmanı işaretle
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
    const p = JSON.parse(localStorage.getItem('olympus_profile')) || {};
    p.w = document.getElementById('m-w').value; p.height = document.getElementById('m-height').value;
    p.waist = document.getElementById('m-waist').value; p.neck = document.getElementById('m-neck').value;
    p.chest = document.getElementById('m-chest').value; p.shoulder = document.getElementById('m-shoulder').value;
    p.hips = document.getElementById('m-hips').value; p.arm = document.getElementById('m-arm').value;
    p.thigh = document.getElementById('m-thigh').value; p.calf = document.getElementById('m-calf').value;
    localStorage.setItem('olympus_profile', JSON.stringify(p));

    if (p.w) {
        let history = JSON.parse(localStorage.getItem('olympus_history')) || [];
        history.push({ date: new Date().toLocaleDateString('tr-TR'), weight: p.w }); localStorage.setItem('olympus_history', JSON.stringify(history));
    }

    syncDataToCloud();
    document.getElementById('tracking-modal').style.display = 'none'; loadProfileData();
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

function loadProfileData() {
    const p = JSON.parse(localStorage.getItem('olympus_profile'));
    if (p) {
        if (p.w) document.getElementById('ro-weight').innerText = `${p.w} kg`;
        if (p.height) document.getElementById('ro-height').innerText = `${p.height} cm`;
        if (p.waist) document.getElementById('ro-waist').innerText = `${p.waist} cm`;
        if (p.chest) document.getElementById('ro-chest').innerText = `${p.chest} cm`;
        if (p.shoulder) document.getElementById('ro-shoulder').innerText = `${p.shoulder} cm`;
        if (p.arm) document.getElementById('ro-arm').innerText = `${p.arm} cm`;
        if (p.hips) document.getElementById('ro-hips').innerText = `${p.hips} cm`;
        if (p.calf) document.getElementById('ro-calf').innerText = `${p.calf} cm`;
    }
}

// 5. ANATOMİ MODALI VE YÖNETİMİ
window.openAnatomy = function () {
    const modal = document.getElementById('anatomy-modal');
    modal.style.display = 'block';
    setTimeout(() => { modal.classList.add('open'); }, 10);
    
    updateAnatomyView();
    
    // TÜM GRAFİKLERİ BURAYA EKLİYORUZ
    const container = document.getElementById('all-charts-container');
    container.innerHTML = `
        <div style="margin-bottom: 25px;">
            <h4 style="color:var(--goldnova); font-size:12px; margin-bottom:5px;">AĞIRLIK DEĞİŞİMİ (KG)</h4>
            <div style="height: 150px; background:#151515; padding:5px; border-radius:10px;"><canvas id="chart-weight"></canvas></div>
        </div>
        <div style="margin-bottom: 25px;">
            <h4 style="color:var(--goldnova); font-size:12px; margin-bottom:5px;">GÜNLÜK KALORİ (KCAL)</h4>
            <div style="height: 150px; background:#151515; padding:5px; border-radius:10px;"><canvas id="chart-cal"></canvas></div>
        </div>
        <div style="margin-bottom: 25px;">
            <h4 style="color:var(--goldnova); font-size:12px; margin-bottom:5px;">YAĞ ORANI (%)</h4>
            <div style="height: 150px; background:#151515; padding:5px; border-radius:10px;"><canvas id="chart-fat"></canvas></div>
        </div>
        <div style="margin-bottom: 25px;">
            <h4 style="color:var(--goldnova); font-size:12px; margin-bottom:5px;">İDMAN HACMİ (1RM)</h4>
            <div style="height: 150px; background:#151515; padding:5px; border-radius:10px;"><canvas id="chart-volume"></canvas></div>
        </div>
    `;

    drawSpecificChart('chart-weight', JSON.parse(localStorage.getItem('olympus_history'))?.map(h => ({ date: h.date.split('.')[0], val: h.weight })), '#f6c000');
    drawSpecificChart('chart-cal', JSON.parse(localStorage.getItem('olympus_cal_history')), '#44ff44');
    drawSpecificChart('chart-fat', JSON.parse(localStorage.getItem('olympus_fat_history')), '#00d2ff');
    drawVolumeChart('chart-volume');
};

window.closeAnatomy = function () {
    const modal = document.getElementById('anatomy-modal');
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 400); 
};

function updateAnatomyView() {
    document.querySelectorAll('.muscle-group').forEach(m => m.classList.remove('worked'));
    const workedMuscles = JSON.parse(localStorage.getItem('olympus_worked_muscles')) || [];
    workedMuscles.forEach(m => { const el = document.getElementById('muscle-' + m); if (el) el.classList.add('worked'); });
}

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
function initMuscleInteractions() {
    const display = document.getElementById('muscle-name-display');
    const groups = document.querySelectorAll('.muscle-group');
    
    groups.forEach(group => {
        const name = group.getAttribute('data-name');
        
        const showLabel = (e) => {
            display.innerText = name;
            display.style.opacity = '1';
            group.classList.add('active-touch');
            // Telefonda küçük bir titreşim (Destekleyen cihazlarda)
            if(navigator.vibrate) navigator.vibrate(15); 
        };
        
        const hideLabel = () => {
            display.style.opacity = '0';
            group.classList.remove('active-touch');
        };
        
        // Mobil Cihazlar İçin (Dokunma)
        group.addEventListener('touchstart', showLabel, {passive: true});
        group.addEventListener('touchend', hideLabel);
        group.addEventListener('touchcancel', hideLabel);
        
        // Bilgisayarlar İçin (Mouse)
        group.addEventListener('mousedown', showLabel);
        group.addEventListener('mouseup', hideLabel);
        group.addEventListener('mouseleave', hideLabel);
    });
}
// ==========================================
// OLY CHAT & AI MOTORU FONKSİYONLARI
// ==========================================

window.openOlyChat = function() {
    const chatWin = document.getElementById('oly-chat-window');
    const avatar = document.getElementById('oly-avatar');
    chatWin.classList.add('open');
    avatar.style.right = '-50px'; // Chat açılınca avatarı gizle
    if (navigator.vibrate) navigator.vibrate(30);
    scrollToBottomOly();
};

window.closeOlyChat = function() {
    document.getElementById('oly-chat-window').classList.remove('open');
    document.getElementById('oly-avatar').style.right = '0'; // Avatarı geri getir
};

window.handleOlyKey = function(event) {
    if (event.key === 'Enter') {
        sendOlyMessage();
    }
};

window.sendOlyMessage = async function() {
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
window.updateOlyKey = function() {
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

    avatar.addEventListener('touchstart', dragStart, {passive: false});
    document.addEventListener('touchmove', drag, {passive: false});
    document.addEventListener('touchend', dragEnd);
}

// Oly Chat Açılış/Kapanış (Güncellendi)
window.openOlyChat = function() {
    const chatWin = document.getElementById('oly-chat-window');
    const avatar = document.getElementById('oly-avatar');
    chatWin.classList.add('open');
    // Avatarı küçülterek gizle (Sağda da solda da olsa sorun olmaz)
    avatar.style.transform = 'scale(0)'; 
    if (navigator.vibrate) navigator.vibrate(30);
    scrollToBottomOly();
};

window.closeOlyChat = function() {
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
window.openArenaScreen = function() {
    // Tüm ekranları gizle
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    // Sadece Arena'yı göster
    document.getElementById('arena-sec').classList.add('active');
    
    // Üstteki takvim/gün barını gizle (Arena'da görünmemesi için)
    const dayTracker = document.getElementById('day-tracker');
    if(dayTracker) dayTracker.style.display = 'none';
    
    loadGlobalFeed();
    
    if (navigator.vibrate) navigator.vibrate(50);
}

window.closeArenaScreen = function() {
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
    feedDiv.innerHTML = '<p style="color:var(--goldnova); text-align:center;">Akış yükleniyor...</p>';
    
    try {
        // Firebase'den maksimum 15 kişi çek
        const snapshot = await db.collection("users").limit(15).get();
        let users = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            // Kendimizi feed'de görmeyelim
            if (data.uid !== auth.currentUser.uid && data.name) {
                users.push(data);
            }
        });
        
        // Kullanıcıları rastgele karıştır ve en fazla 10 tanesini al
        users = users.sort(() => 0.5 - Math.random()).slice(0, 10);
        feedDiv.innerHTML = ''; 
        
        if (users.length === 0) {
            feedDiv.innerHTML = '<p style="color:gray; text-align:center;">Arenada şu an kimse yok. İlk sen ol!</p>';
            return;
        }

        // Sporcular için rastgele aksiyon listesi
        const actions = [
            "bugün idmanını tamamladı! 🔥", 
            "arenaya katıldı! ⚔️", 
            "su hedefine ulaştı! 💧", 
            "yeni bir rekor peşinde! 🎯",
            "diyetine tam uyum sağladı! 🥗"
        ];

        users.forEach(user => {
            const randomAction = actions[Math.floor(Math.random() * actions.length)];
            
            feedDiv.innerHTML += `
                <div class="arena-user-card" style="border-left: 3px solid var(--goldnova);">
                    <img src="${user.photo || 'icon.png'}" alt="profile" class="arena-user-img">
                    <div class="arena-user-info">
                        <h4>${user.name}</h4>
                        <p style="font-size: 13px; color: #aaa; margin: 0;">${randomAction}</p>
                    </div>
                    <button class="follow-btn" onclick="followUser('${user.uid}')">Takip Et</button>
                </div>
            `;
        });
        
    } catch (error) {
        console.error("Akış yükleme hatası:", error);
        feedDiv.innerHTML = '<p style="color:#ff4444; text-align:center;">Akış çekilemedi.</p>';
    }
}