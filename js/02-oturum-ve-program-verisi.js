// Son ekran hafızası, antrenman programları ve diyet verileri
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// ==========================================
// 🧠 AKILLI AÇILIŞ HAFIZASI (Son Ekran)
// ==========================================
// Giriş yapılıp Hub göründükten SONRA çağrılır; böylece login/splash ekranının üstüne modül açılmaz.
let isSessionRestored = false;
function restoreLastSession() {
    if (isSessionRestored) return;
    isSessionRestored = true;

    const activeSecMode = localStorage.getItem('olympus_active_sec_mode');
    const lastScreen = localStorage.getItem('olympus_last_active_screen');

    const hasSecMode = activeSecMode === 'polis' || activeSecMode === 'jandarma';
    const trainingHome = (localStorage.getItem('olympus_launch_target') || 'training') === 'training';
    if (trainingHome) {
        // Super App modülleri açılışta geri yüklenmez; sadece akademi teması korunur
        if (hasSecMode) document.body.classList.add(`${activeSecMode}-theme`);
    } else if (hasSecMode && lastScreen === 'security') {
        openSecurityMode(activeSecMode, true);
    } else if (hasSecMode) {
        // Ekranı açmadan sadece akademi temasını koru
        document.body.classList.add(`${activeSecMode}-theme`);
    } else if (lastScreen === 'kpss') {
        openKPSSCenter();
    }

    // Yarıda kalan bir antrenman varsa doğrudan Olympus'u aç; seans kapsülüyle kaldığı yerden devam edilir
    if (localStorage.getItem('oly2_active_session') && window.O2 && document.getElementById('oly2-screen').classList.contains('hidden')) {
        document.getElementById('hub-screen').classList.add('hidden');
        document.getElementById('oly2-screen').classList.remove('hidden');
        O2.open();
    }
}

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
