// Arcade terminali: JS-DOS oyunları ve sanal gamepad
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

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

        loadExternalScript('https://js-dos.com/6.22/current/js-dos.js').then(() => Dos(document.getElementById("jsdos-canvas"), { wdosboxUrl: "https://js-dos.com/6.22/current/wdosbox.js" }).ready(function (fs, main) {
            fs.extract(`./games/${zipName}`).then(function () {
                main(["-c", exeName]).then(function (ci) {
                    window.dosCommandInterface = ci;
                });
            }).catch(err => alert(`Hata: ${zipName} dosyası 'games' klasöründe bulunamadı! Lütfen dosyanın yüklü olduğundan emin ol.`));
        })).catch(() => alert('Oyun motoru yüklenemedi. İnternet bağlantını kontrol et.'));
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
