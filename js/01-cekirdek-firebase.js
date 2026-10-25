// Firebase kurulumu, kimlik doğrulama durumu, bulut senkronu, güvenli HTML yardımcıları
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

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
const rtdb = firebase.database();
let presenceConnectionRef = null;

db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED, merge: true });

// ==========================================
// ✉️ EMAILJS E-POSTA MOTORU
// ==========================================
// Panel: dashboard.emailjs.com — CULBASE Google Workspace servisi (emirhan@culbase.com) + "Olympus Bildirim" şablonu.
// Şablon değişkenleri: to_email, to_name, subject, preheader, eyebrow, headline, message, {{{content_html}}}
// Ücretsiz planda ayda 200 gönderim hakkı var; bu yüzden e-postalar sadece anlamlı anlarda atılır.
emailjs.init("Id219wUMMGoBxc3Jh");
const EMAILJS_SERVICE_ID = "service_culbase";        // emirhan@culbase.com
const EMAILJS_FALLBACK_SERVICE_ID = "service_8a342ow"; // eski kişisel Gmail; ana servis hata verirse kullanılır
const EMAILJS_NOTIFY_TEMPLATE_ID = "template_s3u8pzd";

function sendOlympusMail({ to_email, to_name, subject, preheader = '', eyebrow = '', headline, message = '', content_html = '' }) {
    if (!to_email) return Promise.resolve(null);
    const params = {
        to_email, to_name: to_name || 'Sporcu', subject, preheader: preheader || subject,
        eyebrow, headline, message, content_html
    };
    return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_NOTIFY_TEMPLATE_ID, params)
        .catch(err => {
            console.warn('Ana e-posta servisi başarısız, yedek servis deneniyor:', err);
            return emailjs.send(EMAILJS_FALLBACK_SERVICE_ID, EMAILJS_NOTIFY_TEMPLATE_ID, params);
        })
        .catch(err => {
            console.warn('E-posta gönderilemedi:', err);
            return null;
        });
}

// E-posta içi bilgi tablosu (etiket / değer satırları) — e-posta istemcileri için inline stil
function mailInfoRows(rows) {
    const tr = rows.map(([label, value]) => `
        <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #23232a;font-size:12px;color:#7d7d88;letter-spacing:.5px;">${escapeHTML(label)}</td>
            <td style="padding:12px 16px;border-bottom:1px solid #23232a;font-size:14px;color:#ffffff;font-weight:700;text-align:right;">${escapeHTML(value)}</td>
        </tr>`).join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#17171b;border:1px solid #23232a;border-radius:14px;border-collapse:separate;overflow:hidden;">${tr}</table>`;
}

// 🛡️ Yeni cihazdan giriş uyarısı: aynı cihazda aynı hesaba ikinci kez mail atmaz (kotayı korur)
async function sendNewDeviceLoginAlert(user) {
    if (!user || user.isAnonymous || !user.email) return;
    const deviceKey = `olympus_known_device_${user.uid}`;
    if (localStorage.getItem(deviceKey)) return;
    localStorage.setItem(deviceKey, new Date().toISOString());
    if (window.isRegisteringNewAccount) { window.isRegisteringNewAccount = false; return; }

    const location = await getUserLocation();
    const time = new Date().toLocaleString('tr-TR');
    const device = /Android/i.test(navigator.userAgent) ? 'Android' : /iPhone|iPad/i.test(navigator.userAgent) ? 'iOS' : 'Tarayıcı';

    sendOlympusMail({
        to_email: user.email,
        to_name: user.displayName,
        subject: '🛡️ Olympus hesabına yeni bir cihazdan giriş yapıldı',
        eyebrow: 'GÜVENLİK BİLDİRİMİ',
        headline: 'Yeni cihaz girişi',
        message: 'Hesabına daha önce görmediğimiz bir cihazdan giriş yapıldı. Bu sen değilsen şifreni hemen değiştir.',
        content_html: mailInfoRows([['Zaman', time], ['Konum', location], ['Cihaz', device]])
    });
}

// 🌍 Kullanıcının IP Adresinden Konumunu Bulan Fonksiyon
async function getUserLocation() {
    try {
        let response = await fetch('https://ipapi.co/json/');
        let data = await response.json();
        return `${data.city}, ${data.country_name} (IP: ${data.ip})`;
    } catch (error) {
        return "Bilinmeyen Konum";
    }
}

// 🛡️ Diğer kullanıcılardan gelen metinleri (isim, mesaj, yorum) HTML'e güvenle basmak için
function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
// onclick="fn(...)" içine güvenli string argümanı üretir
function jsArg(value) {
    return escapeHTML(JSON.stringify(String(value ?? '')));
}

// YÜKLEME EKRANI KONTROLÜ İÇİN DEĞİŞKEN
let isAppInitialized = false;

auth.onAuthStateChanged(user => {
    if (user) {
        setupRealtimePresence(user.uid);
        
        // Arka planda login ekranını gizle ki animasyon bitince Hub çıksın
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('login-screen').classList.add('hidden');

        if (!isAppInitialized) {
            isAppInitialized = true; // Bayrağı hemen çek
            playSplashAnimation(() => {
                document.getElementById('hub-screen').classList.remove('hidden');
                document.getElementById('hub-screen').style.display = 'flex';
                document.getElementById('app-content').classList.add('hidden');
                initHubCarousel();
                restoreLastSession();
            });
        } else {
            // Zaten çalışıyorsa (sayfa yenilenmediyse) direkt Hub'a geç
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
        sendNewDeviceLoginAlert(user);
        listenForNotifications();
        updateProfileFollowStats();

    } else {
        if (presenceConnectionRef) presenceConnectionRef.off();
        
        // Arka planda Hub'ı gizle
        document.getElementById('hub-screen').classList.add('hidden');
        document.getElementById('app-content').classList.add('hidden');

        if (!isAppInitialized) {
            isAppInitialized = true; // Bayrağı hemen çek
            // Eskiden burada animasyonu iptal edip login ekranını açıyordu. ŞİMDİ ÖNCE ANİMASYON OYNAYACAK!
            playSplashAnimation(() => {
                document.getElementById('login-screen').classList.remove('hidden');
                document.getElementById('login-screen').style.display = 'flex';
            });
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
            document.getElementById('login-screen').style.display = 'flex';
        }
    }
});

document.getElementById('google-login-btn').addEventListener('click', async () => {
    if (navigator.vibrate) navigator.vibrate(20);
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        // Yeni cihaz uyarısı onAuthStateChanged içinde tüm giriş yöntemleri için gönderilir
        await auth.signInWithPopup(provider);
    } catch (err) {
        alert("Giriş Hatası: " + err.message);
    }
});

window.logout = function () { auth.signOut(); }

// Realtime Database Presence: bağlantı kopsa bile kullanıcıyı otomatik çevrimdışı yapar.
function setupRealtimePresence(uid) {
    if (presenceConnectionRef) presenceConnectionRef.off();
    const statusRef = rtdb.ref(`status/${uid}`);
    presenceConnectionRef = rtdb.ref('.info/connected');

    presenceConnectionRef.on('value', snapshot => {
        if (snapshot.val() !== true) return;
        const offlineStatus = { state: 'offline', lastChanged: firebase.database.ServerValue.TIMESTAMP };
        statusRef.onDisconnect().set(offlineStatus).then(() => {
            statusRef.set({ state: 'online', lastChanged: firebase.database.ServerValue.TIMESTAMP });
        });
    });
}

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
