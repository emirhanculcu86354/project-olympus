// Profil seçici, egzersiz kütüphanesi, AI sihirbaz ve manuel program oluşturucu
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

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
