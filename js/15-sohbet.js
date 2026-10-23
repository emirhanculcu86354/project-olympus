// Olympus gerçek zamanlı sohbet
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 💬 OLYMPUS GERÇEK ZAMANLI SOHBET MOTORU
// ==========================================
let currentActiveChatId = null;
let chatUnsubscribe = null; // Dinleyiciyi kapatmak için
let currentChatTargetUid = null;
let chatTypingTimer = null;
let messagingOpenedFromHub = false;
const presenceSubscriptions = new Map();

// 1. Kişi Listesini Aç
window.openChatListModal = async function () {
    const hub = document.getElementById('hub-screen');
    const appContent = document.getElementById('app-content');
    if (!document.body.classList.contains('messaging-open')) {
        messagingOpenedFromHub = !hub.classList.contains('hidden') && hub.style.display !== 'none';
    }
    hub.classList.add('hidden');
    hub.style.display = 'none';
    appContent.classList.remove('hidden'); // Alt navigasyon mesaj sayfasında görünür kalır.
    document.body.classList.add('messaging-open');
    document.getElementById('messages-page').classList.add('active');
    document.getElementById('messages-page').setAttribute('aria-hidden', 'false');
    document.getElementById('messages-list-view').classList.add('active');
    document.getElementById('chat-room-view').classList.remove('active');
    const listContainer = document.getElementById('chat-friends-list');
    listContainer.innerHTML = '<p style="color:gray; font-size:12px; text-align:center;">Arkadaşların aranıyor...</p>';

    if (!auth.currentUser) return;

    try {
        const myDoc = await db.collection("users").doc(auth.currentUser.uid).get();
        const following = myDoc.exists ? (myDoc.data().following || []) : [];

        if (following.length === 0) {
            listContainer.innerHTML = '<p style="color:gray; font-size:12px; text-align:center;">Kimseyi takip etmiyorsun. Önce Arena\'dan sporcu bul!</p>';
            return;
        }

        listContainer.innerHTML = '';
        clearPresenceSubscriptions();
        for (let uid of following) {
            const userDoc = await db.collection("users").doc(uid).get();
            if (userDoc.exists) {
                const uData = userDoc.data();
                const chatId = [auth.currentUser.uid, uid].sort().join('_');
                const messagesRef = db.collection("chats").doc(chatId).collection("messages");
                const [latestSnapshot, unreadSnapshot] = await Promise.all([
                    messagesRef.orderBy("timestamp", "desc").limit(1).get(),
                    messagesRef.where("receiver", "==", auth.currentUser.uid).get()
                ]);
                const latestMessage = latestSnapshot.empty ? null : latestSnapshot.docs[0].data();
                const unreadCount = unreadSnapshot.docs.filter(doc => doc.data().read === false).length;
                const lastText = latestMessage ? latestMessage.text : 'Henüz mesaj yok';
                const lastTime = latestMessage && latestMessage.timestamp
                    ? latestMessage.timestamp.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                    : '';
                const presence = await getUserPresence(uid);
                const presenceText = formatPresenceLabel(presence);
                listContainer.innerHTML += `
                    <div class="chat-list-card" data-chat-uid="${uid}" data-search-text="${escapeHTML((uData.name + ' ' + lastText).toLocaleLowerCase('tr-TR'))}" onclick="openChatRoom('${uid}', ${jsArg(uData.name)}, ${jsArg(uData.photo || 'icon.png')})">
                        <div class="chat-list-avatar-wrap">
                            <img src="${escapeHTML(uData.photo || 'icon.png')}" alt="${escapeHTML(uData.name)}">
                            <i class="chat-presence-dot ${presence && presence.state === 'online' ? 'is-online' : ''}"></i>
                        </div>
                        <div class="chat-list-card-content">
                            <div class="chat-list-card-topline">
                                <h4>${escapeHTML(uData.name)}</h4>
                                <time>${lastTime}</time>
                            </div>
                            <small class="chat-presence-label">${presenceText}</small>
                            <div class="chat-list-card-bottomline">
                                <span>${escapeHTML(lastText)}</span>
                                ${unreadCount ? `<b class="chat-unread-badge">${unreadCount > 9 ? '9+' : unreadCount}</b>` : ''}
                            </div>
                        </div>
                    </div>
                `;
                subscribeToUserPresence(uid);
            }
        }
    } catch (e) {
        listContainer.innerHTML = '<p style="color:#ff4444; font-size:12px; text-align:center;">Kişiler yüklenemedi.</p>';
    }
};

// Mesaj alanı modal değil; uygulama içinde tam ekran bir sayfa olarak açılır.
window.closeMessagingPage = function (returnToHub) {
    const page = document.getElementById('messages-page');
    page.classList.remove('active');
    page.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('messaging-open');
    clearPresenceSubscriptions();
    if (chatUnsubscribe) chatUnsubscribe();
    chatUnsubscribe = null;
    currentActiveChatId = null;
    currentChatTargetUid = null;

    if (returnToHub && messagingOpenedFromHub) {
        document.getElementById('app-content').classList.add('hidden');
        const hub = document.getElementById('hub-screen');
        hub.classList.remove('hidden');
        hub.style.display = 'flex';
    }
};

window.focusMessagesSearch = function () {
    document.getElementById('messages-search-input').focus();
};

window.filterChatList = function (query) {
    const normalizedQuery = query.toLocaleLowerCase('tr-TR').trim();
    document.querySelectorAll('.chat-list-card').forEach(card => {
        card.style.display = card.dataset.searchText.includes(normalizedQuery) ? '' : 'none';
    });
};

function getUserPresence(uid) {
    return rtdb.ref(`status/${uid}`).once('value')
        .then(snapshot => snapshot.val())
        .catch(() => null);
}

function formatPresenceLabel(presence) {
    if (presence && presence.state === 'online') return 'Çevrimiçi';
    if (!presence || !presence.lastChanged) return 'Son görülme bilinmiyor';
    return `Son görülme ${new Date(presence.lastChanged).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
}

function updatePresenceElements(uid, presence) {
    const isOnline = presence && presence.state === 'online';
    document.querySelectorAll(`.chat-list-card[data-chat-uid="${uid}"]`).forEach(card => {
        card.querySelector('.chat-presence-dot').classList.toggle('is-online', isOnline);
        card.querySelector('.chat-presence-label').textContent = formatPresenceLabel(presence);
    });

    if (uid === currentChatTargetUid) {
        document.getElementById('chat-room-presence-dot').classList.toggle('is-online', isOnline);
        document.getElementById('chat-room-presence-text').textContent = formatPresenceLabel(presence);
    }
}

function subscribeToUserPresence(uid) {
    if (presenceSubscriptions.has(uid)) return;
    const ref = rtdb.ref(`status/${uid}`);
    const callback = snapshot => updatePresenceElements(uid, snapshot.val());
    ref.on('value', callback);
    presenceSubscriptions.set(uid, { ref, callback });
}

function clearPresenceSubscriptions() {
    presenceSubscriptions.forEach(({ ref, callback }) => ref.off('value', callback));
    presenceSubscriptions.clear();
}

function updateChatRoomPresence(uid) {
    getUserPresence(uid).then(presence => updatePresenceElements(uid, presence));
    subscribeToUserPresence(uid);
}

// 2. Özel Sohbet Odasını Aç
window.openChatRoom = function (targetUid, targetName, targetPhoto) {
    document.getElementById('messages-list-view').classList.remove('active');
    document.getElementById('chat-room-view').classList.add('active');

    document.getElementById('chat-room-name').innerText = targetName;
    document.getElementById('chat-room-avatar').src = targetPhoto;

    // Mesajlaşma Odası Kimliğini (ID) Oluştur: İki UID'yi alfabetik sıraya dizerek eşsiz bir oda yaratırız
    const myUid = auth.currentUser.uid;
    currentChatTargetUid = targetUid;
    currentActiveChatId = [myUid, targetUid].sort().join('_');

    updateChatRoomPresence(targetUid);
    listenForChatMessages(currentActiveChatId);
    // Yazıyor göstergesi, oda açılırken karşı tarafın aktif olduğunu hissettirir.
    setTimeout(showChatTypingIndicator, 450);
};

// 3. Sohbet Odasını Kapat
window.closeChatRoom = function () {
    document.getElementById('chat-room-view').classList.remove('active');
    document.getElementById('messages-list-view').classList.add('active');
    if (chatUnsubscribe) {
        chatUnsubscribe(); // Odadan çıkınca veri dinlemeyi durdur (Tasarruf)
    }
    currentActiveChatId = null;
    currentChatTargetUid = null;
    if (chatTypingTimer) clearTimeout(chatTypingTimer);
    openChatListModal(); // Geri dönünce liste verilerini yeniler.
};

// 4. Gerçek Zamanlı Mesaj Dinleyici (WhatsApp Mantığı)
function listenForChatMessages(chatId) {
    const container = document.getElementById('chat-messages-container');
    container.innerHTML = '<p class="chat-empty-state">Şifreli sohbet başlatılıyor...</p>';

    // Eğer eski bir dinleyici varsa iptal et
    if (chatUnsubscribe) chatUnsubscribe();

    // Veritabanını anlık (canlı) dinle
    chatUnsubscribe = db.collection("chats").doc(chatId).collection("messages")
        .orderBy("timestamp", "asc")
        .onSnapshot((snapshot) => {
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p class="chat-empty-state">İlk mesajı gönderen sen ol!</p>';
                return;
            }

            let previousDayKey = null;
            snapshot.forEach(doc => {
                const msg = doc.data();
                const isMe = msg.sender === auth.currentUser.uid;
                const bubbleClass = isMe ? 'chat-bubble-sent' : 'chat-bubble-received';

                // Zamanı ayarla
                let timeStr = "";
                if (msg.timestamp) {
                    const d = msg.timestamp.toDate();
                    timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                    const dayKey = d.toLocaleDateString('tr-TR');
                    if (dayKey !== previousDayKey) {
                        container.insertAdjacentHTML('beforeend', `<div class="chat-day-divider"><span>${formatChatDayLabel(d)}</span></div>`);
                        previousDayKey = dayKey;
                    }
                }

                container.innerHTML += `
                    <div class="chat-message-row ${isMe ? 'is-sent' : 'is-received'}">
                        <div class="chat-bubble ${bubbleClass}">
                            <span class="chat-bubble-text">${escapeChatText(msg.text)}</span>
                            <span class="chat-timestamp">${timeStr}${isMe ? '<b class="chat-read-ticks">✓✓</b>' : ''}</span>
                        </div>
                    </div>
                `;

                // Açık odadaki gelen mesajları okundu olarak işaretle
                if (!isMe && msg.receiver === auth.currentUser.uid) {
                    if (msg.read === false) {
                        doc.ref.update({ read: true });

                        // YENİ: DİNAMİK ADA BİLDİRİMİ TETİKLE!
                        // Eğer mesaj o an ekranda değilsek veya başka bir yere bakıyorsak Ada insin
                        if (typeof showDynamicIsland === 'function') {
                            showDynamicIsland("Yeni Mesaj 💬", msg.text.substring(0, 30) + "...", "✉️", 0);
                        }
                    }
                }
            });

            // Yeni mesaj gelince en alta kaydır
            container.scrollTop = container.scrollHeight;
        });
}

function formatChatDayLabel(date) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Bugün';
    if (date.toDateString() === yesterday.toDateString()) return 'Dün';
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeChatText(text) {
    const element = document.createElement('div');
    element.textContent = text || '';
    return element.innerHTML.replace(/\n/g, '<br>');
}

function showChatTypingIndicator() {
    const container = document.getElementById('chat-messages-container');
    if (!container || document.getElementById('chat-typing-indicator')) return;

    const indicator = document.createElement('div');
    indicator.id = 'chat-typing-indicator';
    indicator.className = 'chat-typing-indicator';
    indicator.innerHTML = '<span>Yazıyor</span><i></i><i></i><i></i>';
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;
    chatTypingTimer = setTimeout(() => indicator.remove(), 1800);
}

// 5. Mesaj Gönder
window.sendChatMessage = async function () {
    const input = document.getElementById('chat-message-input');
    const text = input.value.trim();

    if (!text || !currentActiveChatId || !auth.currentUser) return;

    input.value = ''; // Inputu hemen temizle

    try {
        await db.collection("chats").doc(currentActiveChatId).collection("messages").add({
            text: text,
            sender: auth.currentUser.uid,
            receiver: currentChatTargetUid,
            read: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (navigator.vibrate) navigator.vibrate(20);
    } catch (e) {
        console.error("Mesaj gönderilemedi:", e);
        alert("Bağlantı sorunu! Mesaj iletilemedi.");
    }
};

// Klavyede Enter'a basınca gönderme
document.getElementById('chat-message-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
});

// Alt navigasyondan başka bir bölüme geçildiğinde mesaj sayfası kapanır, navigasyon görünür kalır.
document.querySelectorAll('.bottom-nav .nav-btn, .bottom-nav .hub-nav-btn').forEach(button => {
    button.addEventListener('click', () => {
        if (document.getElementById('messages-page').classList.contains('active')) closeMessagingPage(false);
    });
});
// ==========================================
