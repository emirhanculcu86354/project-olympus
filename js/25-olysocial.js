// OlySocial: akış, yorumlar, bildirimler, takipçiler, mesajlaşma
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 🌐 OLYSOCIAL: MENÜ VE GİRİŞ MOTORU
// ==========================================

window.openOlySocial = function() {
    // Hub'ı gizle
    const hub = document.getElementById('hub-screen');
    if (hub) { hub.classList.add('hidden'); hub.style.display = 'none'; }
    
    // OlySocial'ı aç
    const socialScreen = document.getElementById('olysocial-screen');
    socialScreen.classList.remove('hidden');
    socialScreen.style.display = 'flex';
    
    // Kullanıcı zaten Olympus hesabıyla (Firebase) giriş yaptı; ikinci bir sahte giriş istemeden akışa geç
    performSocialLogin();

    if (navigator.vibrate) navigator.vibrate(20);
};

window.closeOlySocial = function() {
    document.getElementById('olysocial-screen').classList.add('hidden');
    document.getElementById('olysocial-screen').style.display = 'none';
    if (typeof returnToHub === 'function') returnToHub();
};

window.performSocialLogin = function() {
    if (navigator.vibrate) navigator.vibrate([30, 50]);
    
    // 1. Giriş ekranını tamamen gizle
    const loginView = document.getElementById('social-login-view');
    loginView.style.display = 'none';
    loginView.classList.add('hidden');
    
    // 2. Ana uygulamayı görünür yap (GİZLİ YAPAN 'hidden' SINIFINI SİLİYORUZ!)
    const appView = document.getElementById('social-app-view');
    appView.classList.remove('hidden'); 
    appView.style.display = 'flex';
    
    // 3. Varsayılan olarak 'Home' sekmesini aktif et
    const firstNavBtn = document.querySelector('.social-white-bottom-nav .social-nav-item');
    switchSocialNav('home', firstNavBtn);
    
    // 4. Profil verilerini Olympus sisteminden çek ve yerleştir
    loadSocialProfileData();
};
// ==========================================
// 🌐 OLYSOCIAL: ETKİLEŞİM VE VERİ MOTORU
// ==========================================

let socialStoryTimeout;

// 1. HİKAYE (STORY) GÖRÜNTÜLEYİCİ MOTORU
window.openSocialStory = function(username, avatarUrl, imageUrl) {
    const viewer = document.getElementById('social-story-viewer');
    document.getElementById('story-viewer-name').innerText = username;
    document.getElementById('story-viewer-avatar').src = avatarUrl;
    document.getElementById('story-viewer-img').src = imageUrl;

    viewer.classList.remove('hidden');
    viewer.style.display = 'flex';
    if (navigator.vibrate) navigator.vibrate(15);

    // 5 Saniye sonra hikaye otomatik kapanır (Tıpkı Instagram gibi)
    clearTimeout(socialStoryTimeout);
    socialStoryTimeout = setTimeout(closeSocialStory, 5000);
};

window.closeSocialStory = function() {
    clearTimeout(socialStoryTimeout);
    const viewer = document.getElementById('social-story-viewer');
    viewer.classList.add('hidden');
    viewer.style.display = 'none';
};

// 5. YENİ GÖNDERİ PAYLAŞMA & PROFİLE EKLENMESİ
window.publishSocialPost = function() {
    const caption = document.getElementById('new-post-caption').value || "No caption";
    const feedContainer = document.getElementById('social-feed-container');
    const profileGrid = document.getElementById('social-profile-photos');
    const myName = document.getElementById('social-my-username').innerText;
    const myAvatar = document.getElementById('social-my-avatar').src;
    const postImg = document.getElementById('new-post-preview').src;

    // 5.1. Ana Sayfa (Feed) Akışına Ekle
    const newPostHTML = `
        <div class="social-post-card-light" style="animation: fadeInSocial 0.4s ease;">
            <div class="social-post-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${myAvatar}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
                    <span style="font-weight: 700; font-size: 14px; color: #111;">${myName}</span>
                </div>
                <span style="color: #888; font-weight: bold; letter-spacing: 2px;">...</span>
            </div>
            <img src="${postImg}" class="social-post-img" style="max-height:400px;">
            <div class="social-post-body">
                <p style="margin: 0 0 10px 0; font-size: 13px; color: #333; line-height: 1.5;">${caption}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #888;">
                    <span style="font-weight: 600; cursor:pointer;" onclick="openSocialComments()">💬 <span class="comment-count">0</span> comments</span>
                    <span style="font-weight: 600; display:flex; align-items:center; gap:5px; cursor:pointer;" onclick="likeSocialPost(this)"><span class="like-count">0</span> likes <span class="like-icon" style="color: #ff4069; font-size: 16px; transition: 0.2s;">🤍</span></span>
                </div>
            </div>
        </div>
    `;
    feedContainer.insertAdjacentHTML('afterbegin', newPostHTML);
    
    // 5.2. Profildeki "Photos" Izgarasına Ekle!
    if(profileGrid) {
        profileGrid.insertAdjacentHTML('afterbegin', `<img src="${postImg}" style="width:100%; height:100px; object-fit:cover; border-radius:12px; animation: fadeInSocial 0.5s ease;">`);
    }

    // Inputları temizle ve Home sekmesine dön
    document.getElementById('new-post-caption').value = '';
    
    // Post sayacını 1 artır
    let postsEl = document.getElementById('social-my-posts');
    if(postsEl) postsEl.innerText = parseInt(postsEl.innerText) + 1;

    switchSocialNav('home', document.querySelector('.social-white-bottom-nav button:nth-child(1)'));
    if (navigator.vibrate) navigator.vibrate(30);
};

// 1. BEĞENİ (LIKE) MATEMATİĞİ
window.likeSocialPost = function(element) {
    const icon = element.querySelector('.like-icon');
    const countSpan = element.querySelector('.like-count'); // Sayıyı tutan yeni span
    
    // Eğer HTML'de countSpan yoksa eski yöntemle sadece rengi değiştir, varsa matematiği işlet
    if (icon.innerText === '🤍') {
        icon.innerText = '❤️';
        icon.classList.add('liked');
        if(countSpan) countSpan.innerText = parseInt(countSpan.innerText) + 1;
        if (navigator.vibrate) navigator.vibrate(20);
        setTimeout(() => icon.classList.remove('liked'), 200);
    } else {
        icon.innerText = '🤍';
        if(countSpan) countSpan.innerText = parseInt(countSpan.innerText) - 1;
    }
};
// ==========================================
// 💬 OLYSOCIAL: YORUMLAR (COMMENTS) MOTORU
// ==========================================
window.openSocialComments = function() {
    const modal = document.getElementById('social-comments-modal');
    if(modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        if (navigator.vibrate) navigator.vibrate(15);
    } else {
        console.error("Yorum modalı HTML'de bulunamadı!");
    }
};

window.closeSocialComments = function() {
    const modal = document.getElementById('social-comments-modal');
    if(modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.sendSocialComment = function() {
    const input = document.getElementById('new-comment-input');
    const text = input.value.trim();
    if(!text) return;

    // Gerçek profil ismini ve resmini al
    const myNameEl = document.getElementById('social-my-username');
    const myAvatarEl = document.getElementById('social-my-avatar');
    const myName = myNameEl ? myNameEl.innerText : "emirhan_clc";
    const myAvatar = myAvatarEl ? myAvatarEl.src : "icon.png";

    const list = document.getElementById('social-comments-list');
    if(list) {
        list.innerHTML += `
            <div style="display:flex; gap:10px; animation: slideInRight 0.3s ease;">
                <img src="${myAvatar}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">
                <div style="background:#f0f2f5; padding:10px; border-radius:12px; border-top-left-radius:2px;">
                    <strong style="font-size:12px; color:#111;">${myName}</strong>
                    <p style="margin:2px 0 0 0; font-size:12px; color:#333;">${text}</p>
                </div>
            </div>
        `;
        
        input.value = '';
        
        // Yorum sayısını +1 artır
        const titleCount = document.getElementById('comment-count-title');
        if(titleCount) titleCount.innerText = parseInt(titleCount.innerText) + 1;
        
        // Listeyi en alta kaydır
        list.scrollTop = list.scrollHeight;
        if (navigator.vibrate) navigator.vibrate(10);
    }
};

// ==========================================
// 🔔 OLYSOCIAL: BİLDİRİMLER (NOTIFICATIONS)
// ==========================================
window.openSocialNotifications = function() {
    const modal = document.getElementById('social-notifications-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        if (navigator.vibrate) navigator.vibrate(15);
    }
};

window.closeSocialNotifications = function() {
    const modal = document.getElementById('social-notifications-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};
// ==========================================
// 👥 OLYSOCIAL: TAKİPÇİ LİSTESİ MODALI (CANLI FIREBASE)
// ==========================================
window.openSocialFollowList = async function(typeTitle) {
    const modal = document.getElementById('social-follow-list-modal');
    const titleEl = document.getElementById('social-follow-title');
    const listContainer = modal.querySelector('div[style*="overflow-y:auto"]'); // İçerik kutusunu bul

    if (!modal || !auth.currentUser) return;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    titleEl.innerText = typeTitle; // "Followers" veya "Following" yazar
    
    // Küçük harfe çevirip veritabanındaki (following / followers) anahtar kelimesini buluyoruz
    const dbKey = typeTitle.toLowerCase(); 

    listContainer.innerHTML = '<p style="color:#888; font-size:12px; text-align:center; margin-top:20px;">Yükleniyor...</p>';

    try {
        const myDoc = await db.collection("users").doc(auth.currentUser.uid).get();
        if (!myDoc.exists) {
            listContainer.innerHTML = '<p style="color:#888; font-size:12px; text-align:center;">Liste boş.</p>';
            return;
        }

        const listIds = myDoc.data()[dbKey] || [];

        if (listIds.length === 0) {
            listContainer.innerHTML = '<p style="color:#888; font-size:12px; text-align:center;">Kimse bulunamadı.</p>';
            return;
        }

        listContainer.innerHTML = '';
        
        for (let uid of listIds) {
            const userDoc = await db.collection("users").doc(uid).get();
            if (userDoc.exists) {
                const uData = userDoc.data();
                
                // Eğer "Takip Ettiklerim (Following)" açıldıysa Remove (Takipten Çık) butonu koyalım
                let actionBtn = '';
                if(dbKey === 'following') {
                    actionBtn = `<button onclick="unfollowUserFromSocial('${uid}')" style="background:#f0f2f5; border:none; color:#ff4444; padding:6px 15px; border-radius:8px; font-weight:bold; font-size:12px; cursor:pointer;">Unfollow</button>`;
                }

                listContainer.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid #f9f9f9;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${escapeHTML(uData.photo || 'icon.png')}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                            <div>
                                <h4 style="margin:0; font-size:14px; color:#111;">${escapeHTML(uData.name)}</h4>
                            </div>
                        </div>
                        ${actionBtn}
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error("Sosyal liste çekilemedi:", e);
        listContainer.innerHTML = '<p style="color:#ff4444; font-size:12px; text-align:center;">Bağlantı hatası oluştu.</p>';
    }
};

window.closeSocialFollowList = function() {
    const modal = document.getElementById('social-follow-list-modal');
    if (modal) {
        modal.classList.add('hidden');
        setTimeout(() => modal.style.display = 'none', 200); // Animasyon bitince display none
    }
};

// Takipten Çıkma Fonksiyonu (Sosyal Ekran İçin)
window.unfollowUserFromSocial = async function(targetUid) {
    if(!confirm("Takipten çıkmak istediğine emin misin?")) return;
    
    try {
        const myRef = db.collection("users").doc(auth.currentUser.uid);
        const targetRef = db.collection("users").doc(targetUid);
        
        await myRef.update({ following: firebase.firestore.FieldValue.arrayRemove(targetUid) });
        await targetRef.update({ followers: firebase.firestore.FieldValue.arrayRemove(auth.currentUser.uid) });
        
        if (navigator.vibrate) navigator.vibrate(30);
        
        // İşlem bitince listeyi tekrar yükle (Ekranda güncellensin)
        openSocialFollowList('Following');
        
        // Üst taraftaki rakamı da 1 düşür
        const followingEl = document.getElementById('social-my-following');
        if(followingEl) followingEl.innerText = parseInt(followingEl.innerText) - 1;
        
    } catch(e) {
        console.error("Takipten çıkma hatası", e);
    }
};

// 4. GALERİDEN FOTOĞRAF SEÇME VE ÖNİZLEME (MAKE A POST)
window.previewSocialPostPhoto = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('new-post-preview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
};

// 5. PROFİL DÜZENLEME MOTORU
window.openSocialEditProfile = function() {
    const modal = document.getElementById('social-edit-profile-modal');
    document.getElementById('edit-social-name').value = document.getElementById('social-my-name').innerText;
    document.getElementById('edit-social-username').value = document.getElementById('social-my-username').innerText;
    document.getElementById('edit-social-avatar-preview').src = document.getElementById('social-my-avatar').src;
    
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

window.closeSocialEditProfile = function() {
    document.getElementById('social-edit-profile-modal').style.display = 'none';
};

window.saveSocialProfile = function() {
    const newName = document.getElementById('edit-social-name').value;
    const newUsername = document.getElementById('edit-social-username').value;
    
    document.getElementById('social-my-name').innerText = newName;
    document.getElementById('social-my-username').innerText = newUsername;
    
    closeSocialEditProfile();
    if (navigator.vibrate) navigator.vibrate(30);
};

window.switchSocialNav = function(pageId, btnElement) {
    // Buton renklerini sıfırla
    document.querySelectorAll('.social-nav-item').forEach(b => {
        b.classList.remove('active');
    });
    // Ortadaki artı butonuna basılmadıysa aktif rengi ver
    if (btnElement && !btnElement.classList.contains('social-nav-add')) {
        btnElement.classList.add('active');
    }
    
    // Tüm sayfaları gizle
    document.querySelectorAll('.social-page-content').forEach(page => {
        page.style.display = 'none';
        page.classList.add('hidden');
    });
    
    // Hedef sayfayı göster
    const targetPage = document.getElementById('social-page-' + pageId);
    if (targetPage) {
        targetPage.style.display = 'flex';
        targetPage.classList.remove('hidden');
    }
    
    // İŞTE YENİ EKLENEN KISIM: Inbox sekmesine girilirse Firebase'den listeyi çek
    if (pageId === 'inbox') {
        loadSocialInboxFriends();
    }
    
    if (navigator.vibrate) navigator.vibrate(15);
};

// Profil Verilerini Olympus Ana Sisteminden Çeken Fonksiyon
async function loadSocialProfileData() {
    const user = auth.currentUser;
    if (!user) return;

    // Fotoğraf ve İsim
    document.getElementById('social-my-avatar').src = user.photoURL || 'icon.png';
    // İsmi ve kullanıcı adını kişiselleştiriyoruz (Emirhan)
    const displayName = user.displayName || 'Emirhan Çulcu';
    document.getElementById('social-my-name').innerText = displayName;

    // Firebase'den takipçi sayısını çek
    try {
        const myDoc = await db.collection("users").doc(user.uid).get();
        if (myDoc.exists) {
            const data = myDoc.data();
            const followers = data.followers ? data.followers.length : 0;
            const following = data.following ? data.following.length : 0;
            
            document.getElementById('social-my-followers').innerText = followers;
            document.getElementById('social-my-following').innerText = following;
        }
    } catch(e) {
        console.error("Sosyal veriler çekilemedi:", e);
    }
}
// ==========================================
// 📞 OLYSOCIAL: CANLI FIREBASE SOHBET VE INBOX MOTORU
// ==========================================

let socialChatUnsubscribe = null; // Eski sohbetleri kapatmak için hafıza

// 1. INBOX LİSTESİNİ FİREBASE'DEN GERÇEK KİŞİLERLE DOLDUR
window.loadSocialInboxFriends = async function() {
    if (!auth.currentUser) return;

    const activeStoriesContainer = document.querySelector('#social-page-inbox .social-stories-list');
    const chatListContainer = document.querySelector('#social-page-inbox .social-chat-list');
    
    if (!activeStoriesContainer || !chatListContainer) return;

    activeStoriesContainer.innerHTML = '<p style="color:#aaa; font-size:11px; padding:10px;">Yükleniyor...</p>';
    chatListContainer.innerHTML = '<p style="color:#aaa; font-size:11px; text-align:center; margin-top:20px;">Sohbetler yükleniyor...</p>';

    try {
        const myDoc = await db.collection("users").doc(auth.currentUser.uid).get();
        const following = myDoc.exists ? (myDoc.data().following || []) : [];

        let htmlStories = `
            <div class="social-story-node" onclick="document.getElementById('hub-photo-upload').click()">
                <div class="story-ring add"><span>+</span></div>
                <span class="story-name">New</span>
            </div>
        `;
        let htmlChats = '';

        const myUid = auth.currentUser.uid;
        const myName = auth.currentUser.displayName || "Emirhan";
        const myAvatar = auth.currentUser.photoURL || "icon.png";
        
        // 🌟 KENDİNE NOT (Saved Notes) - Hedef UID olarak kendi UID'ni veriyoruz
        htmlStories += `
            <div class="social-story-node" onclick="openSocialChat('${myUid}', 'Saved Notes', '${myAvatar}')">
                <div class="story-ring active"><img src="${myAvatar}"></div>
                <span class="story-name">You</span>
                <div class="online-dot" style="background:#27ae60;"></div>
            </div>
        `;
        
        htmlChats += `
            <div class="social-chat-item" onclick="openSocialChat('${myUid}', 'Saved Notes', '${myAvatar}')" style="background: rgba(75, 107, 251, 0.05); border-left: 3px solid #4b6bfb; cursor:pointer;">
                <img src="${myAvatar}">
                <div class="chat-info">
                    <div style="display: flex; justify-content: space-between;">
                        <h4 style="color:#4b6bfb;">Saved Notes</h4><span class="time">Şimdi</span>
                    </div>
                    <p style="color: #111; font-weight: bold;">Kendine not bırak 📝</p>
                </div>
            </div>
        `;

        // 🌟 GERÇEK ARKADAŞLARINI (TAKİP ETTİKLERİNİ) LİSTEYE ÇEK
        if (following.length > 0) {
            for (let uid of following) {
                const userDoc = await db.collection("users").doc(uid).get();
                if (userDoc.exists) {
                    const uData = userDoc.data();
                    const uName = uData.name || "User";
                    const uPhoto = uData.photo || "icon.png";
                    const safeName = escapeHTML(uName);
                    const safePhoto = escapeHTML(uPhoto);

                    htmlStories += `
                        <div class="social-story-node" onclick="openSocialChat('${uid}', ${jsArg(uName)}, ${jsArg(uPhoto)})">
                            <div class="story-ring active"><img src="${safePhoto}"></div>
                            <span class="story-name" style="width:50px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeName}</span>
                            <div class="online-dot" style="background:#27ae60;"></div>
                        </div>
                    `;

                    htmlChats += `
                        <div class="social-chat-item" onclick="openSocialChat('${uid}', ${jsArg(uName)}, ${jsArg(uPhoto)})" style="cursor:pointer;">
                            <img src="${safePhoto}">
                            <div class="chat-info">
                                <div style="display: flex; justify-content: space-between;">
                                    <h4>${safeName}</h4><span class="time">Sohbet</span>
                                </div>
                                <p style="color: #888;">Mesajlaşmak için dokun...</p>
                            </div>
                        </div>
                    `;
                }
            }
        }

        activeStoriesContainer.innerHTML = htmlStories;
        chatListContainer.innerHTML = htmlChats;

    } catch (e) {
        console.error("Inbox listesi çekilemedi:", e);
        chatListContainer.innerHTML = '<p style="color:#ff4444; font-size:11px; text-align:center;">Bağlantı hatası.</p>';
    }
};

// 2. SOHBET ODASINI AÇ
window.openSocialChat = function(targetUid, targetName, targetPhoto) {
    const chatRoom = document.getElementById('social-chat-room');
    if(!chatRoom) return;

    // Üst barı ayarla
    document.getElementById('social-active-chat-name').innerText = targetName;
    document.getElementById('social-active-chat-avatar').src = targetPhoto;
    
    // Global değişkenleri ayarla (Kimle konuşuyoruz?)
    window.currentChatTargetUid = targetUid;
    // Benzersiz Sohbet Odası ID'si (İki UID'nin alfabetik dizilimi)
    window.currentActiveChatId = [auth.currentUser.uid, targetUid].sort().join('_');

    // Ekranı aç ve animasyonu tetikle
    chatRoom.classList.remove('hidden');
    chatRoom.style.display = 'flex';
    setTimeout(() => { chatRoom.classList.add('social-chat-slide-in'); }, 10);
    
    // 🌟 MUCİZE: Gerçek zamanlı Firebase mesaj dinleyicisini başlat!
    listenForSocialChatMessages(window.currentActiveChatId);
    
    if (navigator.vibrate) navigator.vibrate(20);
};

// 3. SOHBET ODASINI KAPAT
window.closeSocialChat = function() {
    const chatRoom = document.getElementById('social-chat-room');
    if(!chatRoom) return;

    chatRoom.classList.remove('social-chat-slide-in');
    
    // Arkada boş yere veri yemesin diye dinleyiciyi kapat
    if (socialChatUnsubscribe) socialChatUnsubscribe();
    
    setTimeout(() => {
        chatRoom.classList.add('hidden');
        chatRoom.style.display = 'none';
    }, 300);
};

// 4. FIREBASE MESAJ DİNLEYİCİSİ (CANLI AKIŞ)
window.listenForSocialChatMessages = function(chatId) {
    const container = document.getElementById('social-chat-messages');
    container.innerHTML = '<p style="text-align:center; color:#888; font-size:12px; margin-top:20px;">Sohbet yükleniyor...</p>';

    // Varsa eski dinleyiciyi temizle
    if (socialChatUnsubscribe) socialChatUnsubscribe();

    // Firebase'e bağlan ve canlı veriyi dinle
    socialChatUnsubscribe = db.collection("chats").doc(chatId).collection("messages")
        .orderBy("timestamp", "asc")
        .onSnapshot((snapshot) => {
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p style="text-align:center; color:#888; font-size:12px; margin-top:20px;">İlk mesajı gönder!</p>';
                return;
            }

            snapshot.forEach(doc => {
                const msg = doc.data();
                // Mesaj benden mi çıktı? (Saved Notes ise her iki taraf da bensem sağda görünür)
                const isMe = msg.sender === auth.currentUser.uid; 
                const bubbleClass = isMe ? 'social-chat-sent' : 'social-chat-received';
                
                let timeStr = "";
                if (msg.timestamp) {
                    timeStr = msg.timestamp.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                }

                // Gelen metni satır aralıklarıyla bas
                const formattedText = escapeHTML(msg.text).replace(/\n/g, '<br>');

                container.innerHTML += `
                    <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'}; margin-bottom:10px;">
                        <div class="social-chat-bubble ${bubbleClass}">
                            ${formattedText}
                        </div>
                        <span style="font-size:10px; color:#aaa; margin-top:4px;">${timeStr} ${isMe ? '✓✓' : ''}</span>
                    </div>
                `;

                // Bana gelen mesajı okundu işaretle
                if (!isMe && msg.receiver === auth.currentUser.uid && msg.read === false) {
                    doc.ref.update({ read: true });
                }
            });

            // Yeni mesaj gelince en alta kaydır
            container.scrollTop = container.scrollHeight;
        });
};
// ==========================================
// 📞 OLYSOCIAL: KESİN ÇÖZÜM MESAJLAŞMA MOTORU
// ==========================================

// Mesaj gönderme motorunu tamamen yeniden yazıyoruz.
window.sendSocialChatMessage = async function() {
    const input = document.getElementById('social-chat-input');
    const text = input.value.trim();
    
    // Boş mesaj atılmasını veya sistemin kilitlenmesini engelle
    if(!text) return;
    
    // Eğer kullanıcı giriş yapmamışsa uyar
    if (!auth.currentUser) {
        alert("Lütfen önce Olympus sistemine giriş yap!");
        return;
    }

    // Eğer oda ID'si bir nedenden yoksa (Sistem takılmışsa) anında kendimiz oluşturalım
    if (!window.currentActiveChatId) {
        const myUid = auth.currentUser.uid;
        // Eğer hedef UID de yoksa, o an ekrandaki ismi al
        const targetName = document.getElementById('social-active-chat-name').innerText;
        window.currentChatTargetUid = targetName === "Saved Notes" ? myUid : "unknown_user";
        window.currentActiveChatId = [myUid, window.currentChatTargetUid].sort().join('_');
    }

    const msgContainer = document.getElementById('social-chat-messages');
    
    // Kullanıcının mesajını anında SAĞA ekle (Bekleme hissi olmasın)
    msgContainer.innerHTML += `
        <div style="display:flex; flex-direction:column; align-items:flex-end; margin-bottom:10px;">
            <div class="social-chat-bubble social-chat-sent" style="animation: slideInRight 0.3s ease;">
                ${text.replace(/\n/g, '<br>')}
            </div>
            <span style="font-size:10px; color:#aaa; margin-top:4px;">Şimdi ✓✓</span>
        </div>
    `;
    
    input.value = ''; // Kutuyu anında temizle
    msgContainer.scrollTop = msgContainer.scrollHeight;
    if (navigator.vibrate) navigator.vibrate(10);

    try {
        // Firebase'e kaydetmeyi dene (Hata verirse bile mesaj ekranda görünür kaldı)
        await db.collection("chats").doc(window.currentActiveChatId).collection("messages").add({
            text: text,
            sender: auth.currentUser.uid,
            receiver: window.currentChatTargetUid,
            read: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Mesaj buluta kaydedilemedi, ama arayüzde gösterildi:", e);
    }

    // 1.5 Saniye sonra karşıdan (Otomatik) bir cevap gelsin (Eğer kendimizle konuşmuyorsak)
    const username = document.getElementById('social-active-chat-name').innerText;
    
    if (username !== "Saved Notes") {
        setTimeout(() => {
            let replyMsg = "Tamamdır, anlaştık! 👍";
            if(username === "dilala.g") replyMsg = "Seni çok seviyorum! 😍";
            else if(username === "furkan_eng") replyMsg = "Aynen kanka hallederiz.";
            else if(username === "m_emin_reis") replyMsg = "Çizimler efsane olmuş.";

            msgContainer.innerHTML += `
                <div style="display:flex; flex-direction:column; align-items:flex-start; margin-bottom:10px;">
                    <div class="social-chat-bubble social-chat-received" style="animation: slideInRight 0.3s ease;">
                        ${replyMsg}
                    </div>
                    <span style="font-size:10px; color:#aaa; margin-top:4px;">Şimdi</span>
                </div>
            `;
            msgContainer.scrollTop = msgContainer.scrollHeight;
            if (navigator.vibrate) navigator.vibrate([10, 30]);
        }, 1500);
    }
};

// Klavyede Enter'a basınca mesaj göndersin
document.addEventListener("DOMContentLoaded", () => {
    const chatInput = document.getElementById('social-chat-input');
    if (chatInput) {
        // Eğer öncekinden kalan event listener varsa üst üste binmesin
        chatInput.replaceWith(chatInput.cloneNode(true));
        document.getElementById('social-chat-input').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendSocialChatMessage();
            }
        });
    }
});
window.openOlyOSModal = function(id) {
    document.getElementById(id).style.display = 'flex';
    if (navigator.vibrate) navigator.vibrate(15);
};

window.closeOlyOSModal = function(id) {
    document.getElementById(id).style.display = 'none';
    if (navigator.vibrate) navigator.vibrate(10);
};

window.closeOlyOSAndGoToTracking = function() {
    document.getElementById('olyos-screen').classList.add('hidden');
    returnToHub();
    // Go to tracking screen
    setTimeout(() => {
        document.querySelector('[data-target="tracking-sec"]').click();
    }, 300);
};

// Hesap Makinesi
let olyCalcExpression = "";
window.olyCalcInput = function(val) {
    const display = document.getElementById('olyos-calc-display');
    if (val === 'AC') {
        olyCalcExpression = "";
        display.innerText = "0";
    } else if (val === '=') {
        try {
            let cleanExpr = olyCalcExpression.replace(/[^0-9+\-*/.]/g, '');
            let result = eval(cleanExpr);
            if (result.toString().length > 8) result = parseFloat(result.toFixed(5));
            display.innerText = result;
            olyCalcExpression = result.toString();
        } catch (e) {
            display.innerText = "Hata";
            olyCalcExpression = "";
        }
    } else if (val === '+/-') {
        if (olyCalcExpression.startsWith('-')) olyCalcExpression = olyCalcExpression.substring(1);
        else olyCalcExpression = '-' + olyCalcExpression;
        display.innerText = olyCalcExpression || "0";
    } else if (val === '%') {
        try {
            let result = eval(olyCalcExpression) / 100;
            display.innerText = result;
            olyCalcExpression = result.toString();
        } catch(e) { }
    } else {
        olyCalcExpression += val;
        display.innerText = olyCalcExpression;
    }
    if (navigator.vibrate) navigator.vibrate(10);
};

// Kronometre
let olyOsStopwatchTimer = null;
let olyOsStopwatchTime = 0; 
let isOlyOsStopwatchRunning = false;

window.toggleOlyOsStopwatch = function() {
    const btn = document.getElementById('olyos-sw-start');
    if (isOlyOsStopwatchRunning) {
        clearInterval(olyOsStopwatchTimer);
        btn.innerText = "Başlat";
        btn.style.color = "#27ae60";
        btn.style.borderColor = "#27ae60";
        btn.style.background = "rgba(39, 174, 96, 0.2)";
    } else {
        olyOsStopwatchTimer = setInterval(updateOlyOsStopwatch, 10);
        btn.innerText = "Durdur";
        btn.style.color = "#ff4444";
        btn.style.borderColor = "#ff4444";
        btn.style.background = "rgba(255, 68, 68, 0.2)";
    }
    isOlyOsStopwatchRunning = !isOlyOsStopwatchRunning;
    if (navigator.vibrate) navigator.vibrate(15);
};

window.resetOlyOsStopwatch = function() {
    clearInterval(olyOsStopwatchTimer);
    olyOsStopwatchTime = 0;
    isOlyOsStopwatchRunning = false;
    document.getElementById('olyos-stopwatch-display').innerText = "00:00.00";
    const btn = document.getElementById('olyos-sw-start');
    btn.innerText = "Başlat";
    btn.style.color = "#27ae60";
    btn.style.borderColor = "#27ae60";
    btn.style.background = "rgba(39, 174, 96, 0.2)";
    if (navigator.vibrate) navigator.vibrate(15);
};

function updateOlyOsStopwatch() {
    olyOsStopwatchTime++;
    let ms = olyOsStopwatchTime % 100;
    let totalSec = Math.floor(olyOsStopwatchTime / 100);
    let s = totalSec % 60;
    let m = Math.floor(totalSec / 60);
    let displayStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    document.getElementById('olyos-stopwatch-display').innerText = displayStr;
}
// ==========================================
