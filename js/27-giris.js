// Giriş, kayıt, misafir, şifre sıfırlama
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 🔐 PREMIUM GİRİŞ, KAYIT VE MİSAFİR MOTORU
// ==========================================

let guestTimeoutTimer = null;

// Ekranlar arası geçiş (Giriş <-> Kayıt)
window.toggleAuthView = function(view) {
    if (navigator.vibrate) navigator.vibrate(15);
    if (view === 'register') {
        document.getElementById('login-form-view').style.display = 'none';
        document.getElementById('register-form-view').style.display = 'block';
    } else {
        document.getElementById('register-form-view').style.display = 'none';
        document.getElementById('login-form-view').style.display = 'block';
    }
};

// 1. E-Posta ile Normal Giriş
window.loginWithEmail = function() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    if(!email || !pass) {
        alert("Lütfen e-posta ve şifrenizi girin.");
        return;
    }
    
    if (navigator.vibrate) navigator.vibrate(20);
    auth.signInWithEmailAndPassword(email, pass).catch(err => {
        alert("Giriş başarısız. Lütfen bilgilerinizi kontrol edin.\n(" + err.message + ")");
    });
};

// 2. Yeni Hesap Oluşturma
window.registerWithEmail = function() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    
    if(!name || !email || !pass) {
        alert("Lütfen tüm alanları doldurun.");
        return;
    }
    
    if(pass.length < 6) {
        alert("Şifre en az 6 karakter olmalıdır.");
        return;
    }

    if (navigator.vibrate) navigator.vibrate(20);

    // Yeni kayıtta "yeni cihaz" uyarısı yerine sadece hoş geldin maili gitsin
    window.isRegisteringNewAccount = true;
    auth.createUserWithEmailAndPassword(email, pass).then((userCredential) => {
        // Kayıt başarılı olduğunda kullanıcının ismini Firebase'e kaydet
        return userCredential.user.updateProfile({
            displayName: name
        });
    }).then(() => {
        // 🔥 YENİ: HOŞ GELDİN MAİLİ GÖNDER!
        sendOlympusMail({
            to_email: email,
            to_name: name,
            subject: `⚡ Olympus'a hoş geldin, ${name}`,
            eyebrow: 'HESAP OLUŞTURULDU',
            headline: 'Zirveye ilk adım atıldı.',
            message: 'Project Olympus hesabın hazır. Antrenmanların, beslenmen ve ilerlemen artık tek bir yerde. Her hafta sonunda sana kısa bir performans raporu göndereceğiz.',
            content_html: mailInfoRows([['Hesap', email], ['Başlangıç', new Date().toLocaleDateString('tr-TR')]])
        });
    }).catch(err => {
        window.isRegisteringNewAccount = false;
        alert("Kayıt oluşturulamadı.\n(" + err.message + ")");
    });
};

// 3. Misafir Girişi (2 Dakika Zaman Sınırlı)
window.guestLogin = function() {
    if (navigator.vibrate) navigator.vibrate([30, 50]);
    
    // Firebase "Anonymous" girişini kullanır (Veritabanını güvenle inceleyebilir)
    auth.signInAnonymously().then(() => {
        alert("👋 Misafir girişi yapıldı!\n\nUygulamayı incelemeniz için 2 dakikalık süreniz başlamıştır.");
        
        // Mevcut bir zamanlayıcı varsa sıfırla
        if (guestTimeoutTimer) clearTimeout(guestTimeoutTimer);
        
        // 120.000 ms (2 Dakika) sonra sistemi zorla kapatan motor
        guestTimeoutTimer = setTimeout(() => {
            auth.signOut().then(() => {
                if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
                alert("⏱️ Misafir süreniz doldu!\nUygulamayı kullanmaya devam etmek için lütfen ücretsiz kayıt olun.");
                window.location.reload(); // Sayfayı tamamen yenileyerek giriş ekranına zorla
            });
        }, 120000);

    }).catch((error) => {
        alert("Misafir girişi başarısız oldu. Lütfen Firebase konsolundan 'Anonymous' girişini aktif edin.");
        console.error(error);
    });
};
// 4. Şifre Sıfırlama E-postası Gönderme Motoru
window.sendPasswordResetEmail = function() {
    const email = document.getElementById('login-email').value.trim();
    
    if (!email) {
        alert("Lütfen şifresini sıfırlamak istediğiniz e-posta adresini üstteki kutuya yazın ve 'Şifremi Unuttum' yazısına tekrar tıklayın.");
        return;
    }

    if (navigator.vibrate) navigator.vibrate(20);
    
    // Firebase üzerinden şifre sıfırlama mailini ateşle
    auth.sendPasswordResetEmail(email)
        .then(() => {
            alert("📬 Şifre sıfırlama bağlantısı gönderildi!\n\nLütfen e-posta kutunuzu (ve Spam klasörünü) kontrol edin.");
        })
        .catch((error) => {
            // Eğer kullanıcı kayıtlı değilse Firebase uyarı verir
            if(error.code === 'auth/user-not-found') {
                alert("Bu e-posta adresiyle kayıtlı bir sporcu bulunamadı.");
            } else {
                alert("Hata: " + error.message);
            }
        });
};

// 5. Apple Girişi (Premium)
window.appleLogin = function() {
    if (navigator.vibrate) navigator.vibrate(15);
    const provider = new firebase.auth.OAuthProvider('apple.com');
    auth.signInWithPopup(provider).catch(err => {
        alert("Apple Girişi şu an aktif değil. Lütfen Firebase konsolundan Apple'ı etkinleştirin.");
    });
};

// 6. GitHub Girişi (Geliştiriciler İçin)
window.githubLogin = function() {
    if (navigator.vibrate) navigator.vibrate(15);
    const provider = new firebase.auth.GithubAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        alert("GitHub Girişi şu an aktif değil. Lütfen Firebase konsolundan GitHub'ı etkinleştirin.");
    });
};

// GÜVENLİK DÜZELTMESİ: Çıkış yapıldığında veya normal hesaba girildiğinde misafir sayacını iptal et
auth.onAuthStateChanged(user => {
    if (user) {
        // Eğer giren kişi misafir DEĞİLSE sayacı iptal et (gerçek hesaptaysa atmasın)
        if (!user.isAnonymous && guestTimeoutTimer) {
            clearTimeout(guestTimeoutTimer);
            guestTimeoutTimer = null;
        }
    } else {
        // Biri çıkış yaptıysa sayacı iptal et
        if (guestTimeoutTimer) clearTimeout(guestTimeoutTimer);
    }
});
// ==========================================
