// Gizli geçit: Matrix terminali (CULBASE)
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

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
