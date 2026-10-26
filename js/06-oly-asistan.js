// Oly sohbet asistanı (Gemini), sürüklenebilir avatar, açılış animasyonu
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// OLY CHAT & AI MOTORU FONKSİYONLARI
// ==========================================

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
// 🎬 YÜKLEME (SPLASH) EKRANI ANİMASYONU
// ==========================================
function playSplashAnimation(onCompleteCallback) {
    const loadingScreen = document.getElementById('loading-screen');

    if (!loadingScreen) {
        if (onCompleteCallback) onCompleteCallback();
        return;
    }

    // Logo animasyonu ~1,2 sn (css/olympus2.css → .ot-splash). Sayfa açıldığından beri geçen süre düşülür;
    // giriş kontrolü geç gelirse fazladan beklenmez.
    const elapsed = performance.now();
    setTimeout(() => {
        // Ekranı CSS ile yukarı kaydır (Perde açılışı)
        loadingScreen.classList.add('slide-up-animation');

        // CSS animasyon süresi dolunca arkaplandan tamamen sil ve yönlendir
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 450);
        if (onCompleteCallback) onCompleteCallback();
    }, Math.max(0, 1300 - elapsed));
}
