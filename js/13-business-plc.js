// Business: pomodoro, projeler, deploy logları, PLC/fabrika simülatörü, E-Plan
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

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

        loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js')
            .then(() => html2pdf().set(opt).from(document.getElementById('pdf-preview-content')).save())
            .then(() => {
                if (typeof showToast === "function") showToast("E-Plan İndirildi!");
            })
            .catch(() => alert("PDF motoru yüklenemedi. İnternet bağlantını kontrol et."))
            .finally(() => {
                btn.innerText = "📥 İNDİR"; btn.disabled = false;
            });
    };
};

// 🔍 E-Plan önizleme yakınlaştırma (üst bardaki - / + butonları)
let currentPdfZoom = 1;
window.zoomPDF = function (delta) {
    currentPdfZoom = Math.min(2, Math.max(0.3, +(currentPdfZoom + delta).toFixed(2)));
    document.getElementById('pdf-zoom-wrapper').style.transform = `scale(${currentPdfZoom})`;
    document.getElementById('pdf-zoom-level').innerText = Math.round(currentPdfZoom * 100) + '%';
};

// Ağır kütüphaneleri (html2pdf vb.) sadece ihtiyaç anında bir kez yükler
const loadedExternalScripts = {};
function loadExternalScript(src, type) {
    if (!loadedExternalScripts[src]) {
        loadedExternalScripts[src] = new Promise((resolve, reject) => {
            const tag = document.createElement('script');
            if (type) tag.type = type;
            tag.src = src;
            tag.onload = resolve;
            tag.onerror = () => { delete loadedExternalScripts[src]; reject(new Error('Yüklenemedi: ' + src)); };
            document.head.appendChild(tag);
        });
    }
    return loadedExternalScripts[src];
}
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
