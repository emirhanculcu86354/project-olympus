// OlyOS kronometre ve geri sayım
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// ⏱️ ZAMANLAYICI SEKME DEĞİŞTİRME MOTORU
// ==========================================
window.switchTimerMode = function(mode) {
    const swView = document.getElementById('stopwatch-view');
    const cdView = document.getElementById('countdown-view');
    const tabSw = document.getElementById('tab-sw');
    const tabCd = document.getElementById('tab-cd');

    if (mode === 'sw') {
        swView.style.display = 'flex';
        cdView.style.display = 'none';
        tabSw.style.background = '#333'; tabSw.style.color = '#fff';
        tabCd.style.background = 'transparent'; tabCd.style.color = '#888';
    } else {
        swView.style.display = 'none';
        cdView.style.display = 'flex';
        tabCd.style.background = '#333'; tabCd.style.color = '#fff';
        tabSw.style.background = 'transparent'; tabSw.style.color = '#888';
    }
    if (navigator.vibrate) navigator.vibrate(10);
};

// ==========================================
// ⏳ GERİ SAYIM (COUNTDOWN) MOTORU
// ==========================================
let olyOsCountdownTimer = null;
let olyOsCountdownTime = 0; // Toplam saniye
let isOlyOsCountdownRunning = false;

window.toggleOlyOsCountdown = function() {
    const btn = document.getElementById('olyos-cd-start');
    const setupDiv = document.getElementById('countdown-setup');
    const displayDiv = document.getElementById('olyos-countdown-display');
    
    if (isOlyOsCountdownRunning) {
        // Duraklat
        clearInterval(olyOsCountdownTimer);
        btn.innerText = "Devam";
        btn.style.color = "#27ae60";
        btn.style.borderColor = "#27ae60";
        btn.style.background = "rgba(39, 174, 96, 0.15)";
    } else {
        // İlk kez başlatılıyorsa girdileri oku
        if (olyOsCountdownTime === 0) {
            let m = parseInt(document.getElementById('cd-m').value) || 0;
            let s = parseInt(document.getElementById('cd-s').value) || 0;
            olyOsCountdownTime = (m * 60) + s;
            
            if (olyOsCountdownTime <= 0) return; // Süre yoksa başlama
            
            setupDiv.style.display = 'none';
            displayDiv.style.display = 'block';
            updateCountdownDisplay();
        }

        // Başlat
        olyOsCountdownTimer = setInterval(() => {
            olyOsCountdownTime--;
            updateCountdownDisplay();
            
            if (olyOsCountdownTime <= 0) {
                clearInterval(olyOsCountdownTimer);
                isOlyOsCountdownRunning = false;
                displayDiv.innerText = "00:00";
                
                // Güçlü alarm titreşimi
                if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
                alert("⏰ Süre Doldu!");
                resetOlyOsCountdown();
            }
        }, 1000);
        
        btn.innerText = "Durdur";
        btn.style.color = "#f39c12";
        btn.style.borderColor = "#f39c12";
        btn.style.background = "rgba(243, 156, 18, 0.15)";
    }
    isOlyOsCountdownRunning = !isOlyOsCountdownRunning;
    if (navigator.vibrate) navigator.vibrate(15);
};

window.resetOlyOsCountdown = function() {
    clearInterval(olyOsCountdownTimer);
    isOlyOsCountdownRunning = false;
    olyOsCountdownTime = 0;
    
    // Ekranı kurulum moduna döndür
    document.getElementById('countdown-setup').style.display = 'flex';
    document.getElementById('olyos-countdown-display').style.display = 'none';
    
    const btn = document.getElementById('olyos-cd-start');
    btn.innerText = "Başlat";
    btn.style.color = "#f39c12";
    btn.style.borderColor = "#f39c12";
    btn.style.background = "rgba(243, 156, 18, 0.15)";
    if (navigator.vibrate) navigator.vibrate(15);
};

function updateCountdownDisplay() {
    let m = Math.floor(olyOsCountdownTime / 60);
    let s = olyOsCountdownTime % 60;
    document.getElementById('olyos-countdown-display').innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
// ==========================================
