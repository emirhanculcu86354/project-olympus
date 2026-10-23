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

// EmailJS Başlatma (Kendi Public Key'ini Emailjs.com'dan alıp buraya yazacaksın)
emailjs.init("Id219wUMMGoBxc3Jh");
const EMAILJS_SERVICE_ID = "service_8a342ow";
// Güvenlik (yeni giriş) maili için EmailJS'te şablon oluşturup ID'sini buraya yaz; boşken mail atılmaz.
const EMAILJS_SECURITY_TEMPLATE_ID = "";

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
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // 🌍 Konumu bul ve Mail at (şablon tanımlıysa)
        if (!EMAILJS_SECURITY_TEMPLATE_ID) return;
        const location = await getUserLocation();
        const time = new Date().toLocaleString('tr-TR');

        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_SECURITY_TEMPLATE_ID, {
            to_name: user.displayName,
            to_email: user.email,
            login_time: time,
            login_location: location,
            message: `Hesabınıza ${time} tarihinde ${location} konumundan yeni bir giriş yapıldı. Eğer bu siz değilseniz hemen şifrenizi değiştirin.`
        });
        
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
