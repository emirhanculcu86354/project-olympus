// Polis/Jandarma akademi modu, mülakat simülatörü, flashcard, hiyerarşi testi
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

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
window.openSecurityMode = function (type, skipAnimation = false) {
    // Akademi ekranı Olympus profilinden açılır; altta kalan ekranları gizle
    const hub = document.getElementById('hub-screen');
    const olympusApp = document.getElementById('app-content');

    if (hub) hub.classList.add('hidden');
    if (olympusApp) olympusApp.classList.add('hidden');

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
        if (tasksDiv) {
            tasksDiv.style.display = 'block';
            tasksTitle.innerText = '🦅 POMEM GÖREVLERİ';
        }
    } else {
        titleEl.innerText = 'Jandarma Akademisi (JAMYO)';
        kurumTextEl.innerText = 'Jandarma Teşkilatı Mevzuatı ve Tarihi';
        activeAcademyLink = "https://vatandas.jandarma.gov.tr/PTM/Giris";
        if (tasksDiv) {
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

    // Geri tuşu Olympus uygulamasına (açıldığı yere) döner
    const olympusApp = document.getElementById('app-content');
    if (olympusApp) {
        olympusApp.classList.remove('hidden');
        olympusApp.style.display = 'flex';
    }
};

// --- SİVİLE DÖN (GÜVENLİ ÇIKIŞ) ---
window.exitSecurityMode = function () {
    document.body.classList.remove('polis-theme', 'jandarma-theme');

    document.getElementById('logo-polis').classList.remove('sec-logo-active');
    document.getElementById('logo-polis').classList.add('sec-logo-passive');
    document.getElementById('logo-jandarma').classList.remove('sec-logo-active');
    document.getElementById('logo-jandarma').classList.add('sec-logo-passive');

    localStorage.removeItem('olympus_active_sec_mode');

    const tasksDiv = document.getElementById('olympus-sec-tasks');
    if (tasksDiv) tasksDiv.style.display = 'none';

    const loadingOverlay = document.getElementById('sec-loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';

    const imgViewer = document.getElementById('image-viewer-modal');
    if (imgViewer) imgViewer.style.display = 'none';

    if (navigator.vibrate) navigator.vibrate([50, 100]);

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
window.saveSecModalData = function () {
    const activeMode = localStorage.getItem('olympus_active_sec_mode') || 'polis';
    let data = JSON.parse(localStorage.getItem(`olympus_sec_data_${activeMode}`)) || {};

    if (currentSecModalType === 'interview') {
        const titleInput = document.getElementById('sec-interview-title');
        const dateInput = document.getElementById('sec-interview-date');
        if (titleInput) data.interviewTitle = titleInput.value.trim() || 'BİR SONRAKİ AŞAMA';
        if (dateInput) data.interviewDate = dateInput.value;
    } else {
        const timeInput = document.getElementById('sec-parkour-time');
        const scoreInput = document.getElementById('sec-parkour-score');
        if (timeInput) data.parkourTime = timeInput.value;
        if (scoreInput) data.parkourScore = scoreInput.value;
    }

    localStorage.setItem(`olympus_sec_data_${activeMode}`, JSON.stringify(data));
    closeSecModal();
    updateSecDisplays(activeMode);

    if (navigator.vibrate) navigator.vibrate([20, 30]);

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
    if (navigator.vibrate) navigator.vibrate(20);
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
window.saveCardioSession = function () {
    if (cardioDistanceKm <= 0) {
        alert("Hiç mesafe kat etmemişsin şampiyon, hareket et!");
        return;
    }
    // Ekran kapanmadan (sayaçlar sıfırlanmadan) önce geçmişe yaz
    recordCardioToHistory();

    // Süre, mesafe ve rotayı al
    const distText = document.getElementById('cardio-distance-display').innerText;
    const timeText = document.getElementById('cardio-timer-display').innerText;
    const paceText = document.getElementById('cardio-pace-display').innerText;

    // Arka plan kardiyo ekranını kapat
    if (typeof closeCardioScreen === 'function') closeCardioScreen();

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

    if (typeof showDynamicIsland === 'function') {
        showDynamicIsland("Kardiyo Kaydedildi", `${distText} km kat edildi!`, "🔥");
    }
    if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
};

window.closeCardioStory = function () {
    const storyModal = document.getElementById('cardio-story-modal');
    storyModal.style.display = 'none';
    storyModal.classList.add('hidden');
};
// ==========================================
// 🎙️ YAPAY ZEKA KOMİSYON SİMÜLATÖRÜ (AYNA MODU)
// ==========================================
let simMediaStream = null; // Ayna modu kamera akışı (motor aşağıda)

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
    if (speechBox) speechBox.innerText = "Dinleniyor... Konuşmaya başlayabilirsin.";

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
        } catch (e) { console.log("Mikrofon zaten açık"); }
    } else {
        if (speechBox) speechBox.innerText = "Tarayıcınız ses tanımayı desteklemiyor ama simülasyon aktif.";
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
        try { recognition.stop(); } catch (e) { }
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
// Aktif akademi modu, girişten sonra restoreLastSession() ile geri yüklenir.
// ==========================================
