// Olympus bankacılık (Finans) uygulaması
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 💳 OLYMPUS BANKACILIK MOTORU (PRO FİX, GOOGLE SYNC & CÜZDAN DETAY)
// ==========================================

let bankFilterType = 'all'; 
let showAllBankTrans = false; 

// 1. Google Hesabındaki Resim ve İsmi Bankaya Çekme (Senkronizasyon)
function syncBankUserProfile() {
    const mainProfileImg = document.getElementById('header-profile-img'); // Ana sistemdeki resim
    const mainProfileName = document.getElementById('profile-name-display'); // Ana sistemdeki isim
    
    if(mainProfileImg && mainProfileImg.src) {
        document.querySelectorAll('.dynamic-user-avatar').forEach(img => img.src = mainProfileImg.src);
    }
    
    if(mainProfileName && mainProfileName.innerText && mainProfileName.innerText !== 'Yükleniyor...') {
        document.querySelectorAll('.dynamic-user-name').forEach(el => el.innerText = mainProfileName.innerText);
    }
}

// Hub'daki Finans kartı enterAppFromHub üzerinden burayı çağırır
window.openFinanceScreen = function() {
    const target = document.getElementById('finance-screen');
    if(target) target.classList.remove('hidden');

    syncBankUserProfile(); // Profil bilgilerini eşitle

    const logo = document.getElementById('bank-login-logo');
    const content = document.getElementById('bank-login-content');
    const footer = document.getElementById('bank-login-footer');
    const overlay = document.getElementById('bank-login-overlay');

    if(logo && content && footer && overlay) {
        logo.style.top = '0';
        logo.style.transform = 'none';
        logo.style.opacity = '1';
        content.style.opacity = '1';
        footer.style.opacity = '1';
        overlay.style.display = 'flex';
    }
    initBankApp();
    window.scrollTo(0, 0);
};

window.closeWealthApp = function() {
    returnToHub();
};

window.performBankLogin = function() {
    const logo = document.getElementById('bank-login-logo');
    const content = document.getElementById('bank-login-content');
    const footer = document.getElementById('bank-login-footer');
    const overlay = document.getElementById('bank-login-overlay');
    
    if(content) content.style.opacity = '0';
    if(footer) footer.style.opacity = '0';
    
    if(logo) {
        logo.style.top = '40vh';
        logo.style.transform = 'scale(50)';
        logo.style.opacity = '0';
    }
    
    if(navigator.vibrate) navigator.vibrate([20, 50, 20]);
    
    setTimeout(() => {
        if(overlay) overlay.style.display = 'none';
        switchBankTab('home');
    }, 1000); 
};

window.switchBankTab = function(tabId, btnEl) {
    document.querySelectorAll('.bank-tab').forEach(tab => tab.classList.remove('active-tab'));
    document.querySelectorAll('.bank-nav-btn').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById('bank-tab-' + tabId);
    if(targetTab) targetTab.classList.add('active-tab');
    if(btnEl) btnEl.classList.add('active');
    
    if(tabId === 'stats') renderBankStats();
    if(tabId === 'cards') renderBankCards();
    if(tabId === 'profile') syncBankUserProfile(); // Profil sekmesine girince tazele
    
    if(navigator.vibrate) navigator.vibrate(20);
};

// 2. Profil Ayarları İçin Basit Modal
window.openBankGenericModal = function(title, desc) {
    const tEl = document.getElementById('bank-generic-title');
    const dEl = document.getElementById('bank-generic-desc');
    const mEl = document.getElementById('bank-generic-modal');
    if(tEl) tEl.innerText = title;
    if(dEl) dEl.innerText = desc;
    if(mEl) mEl.style.display = 'flex';
};

// Console Hatasını Önlemek İçin Yardımcı Fonksiyon (Güvenli ID Çağrısı)
function safeSetVal(id, value) {
    const el = document.getElementById(id);
    if(el) el.value = value;
}
function safeSetCheck(id, isChecked) {
    const el = document.getElementById(id);
    if(el) el.checked = isChecked;
}

window.closeBankActionModal = function() {
    const m = document.getElementById('bank-action-modal');
    if(m) m.style.display = 'none';
};

window.openBankFilterModal = function() {
    const m = document.getElementById('bank-filter-modal');
    if(m) m.style.display = 'flex';
};

window.applyBankFilter = function(type) {
    bankFilterType = type;
    const m = document.getElementById('bank-filter-modal');
    if(m) m.style.display = 'none';
    showAllBankTrans = true; 
    renderBankTransactions();
};

window.toggleAllBankTransactions = function() {
    showAllBankTrans = true;
    renderBankTransactions();
};

function initBankApp() {
    let history = JSON.parse(localStorage.getItem('bank_history'));
    let cards = JSON.parse(localStorage.getItem('bank_cards'));
    
    if (!history) {
        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const formatDt = (d) => d.toISOString().split('T')[0];

        history = [
            { id: 1, name: "Market", icon: "🛒", amount: -450.00, date: formatDt(today), pending: false },
            { id: 2, name: "Maaş", icon: "💼", amount: 25000.00, date: formatDt(today), pending: false },
            { id: 3, name: "Kahve", icon: "☕", amount: -120.00, date: formatDt(yesterday), pending: false },
            { id: 4, name: "Kira", icon: "🏠", amount: -8500.00, date: formatDt(today), pending: true }
        ];
        localStorage.setItem('bank_history', JSON.stringify(history));
    }
    if (!cards) {
        cards = [{ id: 101, bankName: "Olympus Bank", number: "1234", color: "#125e5e", exp: "12/28" }];
        localStorage.setItem('bank_cards', JSON.stringify(cards));
    }

    renderBankTransactions();
}

let pressTimer;
window.startLongPress = function(id, name, amountText, isPending) {
    pressTimer = window.setTimeout(() => {
        safeSetVal('action-trans-id', id);
        
        const titleEl = document.getElementById('action-trans-title');
        const amountEl = document.getElementById('action-trans-amount');
        if(titleEl) titleEl.innerText = name;
        if(amountEl) amountEl.innerText = amountText;
        
        const completeBtn = document.getElementById('btn-mark-complete');
        if(completeBtn) completeBtn.style.display = isPending ? 'block' : 'none';
        
        const m = document.getElementById('bank-action-modal');
        if(m) m.style.display = 'flex';
        
        if(navigator.vibrate) navigator.vibrate([30, 50]); 
    }, 600);
};
window.cancelLongPress = function() { clearTimeout(pressTimer); };

window.renderBankTransactions = function() {
    const listEl = document.getElementById('bank-transactions-list');
    const pendingListEl = document.getElementById('bank-pending-list');
    const showAllBtn = document.getElementById('bank-show-all-btn');
    if (!listEl || !pendingListEl) return;
    
    let history = JSON.parse(localStorage.getItem('bank_history')) || [];
    let totalBalance = 0; 
    
    listEl.innerHTML = '';
    pendingListEl.innerHTML = '';
    
    if(bankFilterType === 'income') history = history.filter(t => t.amount > 0);
    if(bankFilterType === 'expense') history = history.filter(t => t.amount < 0);

    history.sort((a,b) => new Date(b.date) - new Date(a.date));

    let completedTrans = history.filter(t => !t.pending);
    let pendingTrans = history.filter(t => t.pending);

    let fullHistory = JSON.parse(localStorage.getItem('bank_history')) || [];
    fullHistory.forEach(t => { if(!t.pending) totalBalance += t.amount; });

    let displayLimit = showAllBankTrans ? completedTrans.length : 5;
    let itemsToDisplay = completedTrans.slice(0, displayLimit);

    if(showAllBtn) {
        showAllBtn.style.display = (!showAllBankTrans && completedTrans.length > 5) ? 'block' : 'none';
    }

    itemsToDisplay.forEach(t => {
        const isInc = t.amount > 0;
        const amountClass = isInc ? "positive" : "negative";
        let amtVal = Math.abs(t.amount).toLocaleString('tr-TR', {minimumFractionDigits: 2});
        const amountText = isInc ? `+ ₺${amtVal}` : `- ₺${amtVal}`;
        let displayDate = new Date(t.date).toLocaleDateString('tr-TR');

        listEl.innerHTML += `
            <div class="bank-trans-item" 
                onmousedown="startLongPress(${t.id}, '${t.name}', '${amountText}', false)" 
                onmouseup="cancelLongPress()" onmouseleave="cancelLongPress()"
                ontouchstart="startLongPress(${t.id}, '${t.name}', '${amountText}', false)" 
                ontouchend="cancelLongPress()">
                <div style="display:flex; align-items:center;">
                    <div class="bank-trans-icon">${t.icon}</div>
                    <div class="bank-trans-details">
                        <div class="bank-trans-name">${t.name}</div>
                        <div class="bank-trans-date">${displayDate}</div>
                    </div>
                </div>
                <div class="bank-trans-amount ${amountClass}">${amountText}</div>
            </div>
        `;
    });

    pendingTrans.forEach(t => {
        let amtVal = Math.abs(t.amount).toLocaleString('tr-TR', {minimumFractionDigits: 2});
        const amountText = t.amount > 0 ? `+ ₺${amtVal}` : `- ₺${amtVal}`;
        let displayDate = new Date(t.date).toLocaleDateString('tr-TR');

        pendingListEl.innerHTML += `
            <div class="bank-trans-item pending" 
                onmousedown="startLongPress(${t.id}, '${t.name}', '${amountText}', true)" 
                onmouseup="cancelLongPress()" onmouseleave="cancelLongPress()"
                ontouchstart="startLongPress(${t.id}, '${t.name}', '${amountText}', true)" 
                ontouchend="cancelLongPress()">
                <div style="display:flex; align-items:center;">
                    <div class="bank-trans-icon">${t.icon}</div>
                    <div class="bank-trans-details">
                        <div class="bank-trans-name">${t.name}</div>
                        <div class="bank-trans-date">${displayDate} (Bekliyor)</div>
                    </div>
                </div>
                <div class="bank-trans-amount negative">${amountText}</div>
            </div>
        `;
    });

    if(listEl.innerHTML === '') listEl.innerHTML = '<p style="color:#aaa; font-size:12px; padding:10px;">Son hareket bulunmuyor.</p>';
    if(pendingListEl.innerHTML === '') pendingListEl.innerHTML = '<p style="color:#aaa; font-size:12px; padding:10px;">Bekleyen işlem yok.</p>';

    const balEl = document.getElementById('bank-total-balance');
    if(balEl) balEl.innerText = `₺${totalBalance.toLocaleString('tr-TR', {minimumFractionDigits: 2})}`;
};

window.openTransactionModal = function() {
    const titleEl = document.getElementById('trans-modal-title');
    if(titleEl) titleEl.innerText = "Yeni İşlem Ekle";
    
    safeSetVal('trans-edit-id', '');
    safeSetVal('trans-title', '');
    safeSetVal('trans-amount', '');
    safeSetVal('trans-date', new Date().toISOString().split('T')[0]);
    safeSetCheck('trans-pending', false);
    
    const m = document.getElementById('bank-transaction-modal');
    if(m) m.style.display = 'flex';
};

window.openEditTransaction = function() {
    const idEl = document.getElementById('action-trans-id');
    if(!idEl) return;
    
    const id = parseInt(idEl.value);
    let history = JSON.parse(localStorage.getItem('bank_history')) || [];
    const t = history.find(x => x.id === id);
    
    if(t) {
        safeSetVal('trans-edit-id', t.id);
        const titleEl = document.getElementById('trans-modal-title');
        if(titleEl) titleEl.innerText = "İşlemi Düzenle";
        
        safeSetVal('trans-title', t.name);
        safeSetVal('trans-amount', Math.abs(t.amount));
        safeSetVal('trans-type', t.amount >= 0 ? 'income' : 'expense');
        safeSetVal('trans-date', t.date); 
        safeSetCheck('trans-pending', t.pending || false);

        closeBankActionModal(); 
        const m = document.getElementById('bank-transaction-modal');
        if(m) m.style.display = 'flex';
    }
};

window.saveBankTransaction = function() {
    let editId = document.getElementById('trans-edit-id')?.value;
    let title = document.getElementById('trans-title')?.value || "İşlem";
    let amt = parseFloat(document.getElementById('trans-amount')?.value);
    let type = document.getElementById('trans-type')?.value;
    let dateVal = document.getElementById('trans-date')?.value || new Date().toISOString().split('T')[0];
    let isPending = document.getElementById('trans-pending')?.checked || false;
    
    if (!amt || isNaN(amt)) { alert("Geçerli bir tutar girin."); return; }

    if(type === 'expense') amt = -Math.abs(amt);
    else amt = Math.abs(amt);

    let history = JSON.parse(localStorage.getItem('bank_history')) || [];

    if(editId) {
        const index = history.findIndex(t => t.id === parseInt(editId));
        if(index !== -1) {
            history[index].name = title;
            history[index].amount = amt;
            history[index].date = dateVal;
            history[index].pending = isPending;
            history[index].icon = amt >= 0 ? "💰" : "💳";
        }
    } else {
        history.push({
            id: Date.now(),
            name: title,
            icon: amt >= 0 ? "💰" : "💳",
            amount: amt,
            date: dateVal,
            pending: isPending
        });
    }

    localStorage.setItem('bank_history', JSON.stringify(history));
    const m = document.getElementById('bank-transaction-modal');
    if(m) m.style.display = 'none';
    renderBankTransactions();
    if(navigator.vibrate) navigator.vibrate(30);
};

window.deleteBankTransaction = function() {
    if(confirm("İşlemi silmek istiyor musunuz?")) {
        const idEl = document.getElementById('action-trans-id');
        if(idEl) {
            const id = parseInt(idEl.value);
            let history = JSON.parse(localStorage.getItem('bank_history')) || [];
            history = history.filter(t => t.id !== id);
            localStorage.setItem('bank_history', JSON.stringify(history));
            
            closeBankActionModal();
            renderBankTransactions();
        }
    }
};

window.markTransactionCompleted = function() {
    const idEl = document.getElementById('action-trans-id');
    if(idEl) {
        const id = parseInt(idEl.value);
        let history = JSON.parse(localStorage.getItem('bank_history')) || [];
        const index = history.findIndex(t => t.id === id);
        
        if(index !== -1) {
            history[index].pending = false;
            history[index].date = new Date().toISOString().split('T')[0];
            localStorage.setItem('bank_history', JSON.stringify(history));
        }
        
        closeBankActionModal();
        renderBankTransactions();
    }
};

// 3. KART YÖNETİMİ & CÜZDAN LİSTESİ
window.openAddCardModal = function() {
    safeSetVal('card-bank-name', '');
    safeSetVal('card-number', '');
    safeSetVal('card-exp-date', '');
    const m = document.getElementById('bank-add-card-modal');
    if(m) m.style.display = 'flex';
};

window.saveBankCard = function() {
    let name = document.getElementById('card-bank-name')?.value || "Banka Kartı";
    let num = document.getElementById('card-number')?.value || "0000";
    let exp = document.getElementById('card-exp-date')?.value || "12/30";
    let color = document.getElementById('card-color')?.value || "#125e5e";

    let cards = JSON.parse(localStorage.getItem('bank_cards')) || [];
    cards.push({ id: Date.now(), bankName: name, number: num, exp: exp, color: color });
    
    localStorage.setItem('bank_cards', JSON.stringify(cards));
    const m = document.getElementById('bank-add-card-modal');
    if(m) m.style.display = 'none';
    renderBankCards();
};

window.deleteBankCard = function(id) {
    if(confirm("Bu kartı cüzdandan silmek istediğine emin misin?")) {
        let cards = JSON.parse(localStorage.getItem('bank_cards')) || [];
        cards = cards.filter(c => c.id !== id);
        localStorage.setItem('bank_cards', JSON.stringify(cards));
        renderBankCards();
    }
};

window.renderBankCards = function() {
    const carousel = document.getElementById('bank-cards-carousel');
    const detailsList = document.getElementById('bank-all-cards-detailed-list');
    if(!carousel || !detailsList) return;
    
    let cards = JSON.parse(localStorage.getItem('bank_cards')) || [];
    carousel.innerHTML = '';
    detailsList.innerHTML = '';

    if(cards.length === 0) {
        carousel.innerHTML = '<p style="text-align:center; width:100%; color:#888; font-size:12px;">Kayıtlı kartınız bulunmuyor.</p>';
        detailsList.innerHTML = '<p style="text-align:center; color:#888; font-size:12px;">Kart bulunmuyor.</p>';
        return;
    }

    cards.forEach(c => {
        // Karuseldeki Kart (Silme butonu YOK)
        carousel.innerHTML += `
            <div class="bank-card-slide" style="background: linear-gradient(135deg, ${c.color}, #111);">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <span style="font-weight:600; font-size:16px;">${c.bankName}</span>
                    <span style="font-size:22px; font-weight:900; font-style:italic;">VISA</span>
                </div>
                <div class="bank-card-chip"></div>
                <div style="display:flex; justify-content:space-between; align-items:flex-end; width:100%;">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-size:10px; opacity:0.8; margin-bottom:4px;">Kart Numarası</span>
                        <span style="font-family:monospace; font-size:18px; letter-spacing:2px;">**** **** **** ${c.number}</span>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                        <span style="font-size:10px; opacity:0.8; margin-bottom:4px;">Son Kul.</span>
                        <span style="font-family:monospace; font-size:12px;">${c.exp || '12/28'}</span>
                    </div>
                </div>
            </div>
        `;

        // Detaylı Liste (Silme butonu VAR)
        detailsList.innerHTML += `
            <div class="bank-card-detail-item">
                <div class="bank-card-detail-left">
                    <div class="bank-mini-card" style="width: 45px; height: 30px; border-radius: 6px; background: ${c.color};"></div>
                    <div class="bank-card-detail-info">
                        <h4>${c.bankName}</h4>
                        <p>**** **** **** ${c.number}</p>
                    </div>
                </div>
                <div class="bank-card-detail-right" style="display:flex; align-items:center; gap:15px;">
                    <div style="text-align: right;">
                        <span>Son Kul.</span>
                        <strong>${c.exp || '12/28'}</strong>
                    </div>
                    <button onclick="deleteBankCard(${c.id})" style="background:rgba(231,76,60,0.1); border:none; color:#e74c3c; width:30px; height:30px; border-radius:8px; display:flex; justify-content:center; align-items:center; cursor:pointer;">🗑️</button>
                </div>
            </div>
        `;
    });
};

// Bildirimleri Açma Fonksiyonu (JS Dosyasında Herhangi Bir Yere Ekle)
window.openBankNotifications = function() {
    const modal = document.getElementById('bank-notifications-modal');
    if(modal) modal.style.display = 'flex';
};

// ================= GERÇEK ZAMANLI İSTATİSTİKLER =================
window.renderBankStats = function() {
    let history = JSON.parse(localStorage.getItem('bank_history')) || [];
    
    let curr = new Date();
    let first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1); 
    let firstDay = new Date(curr.setDate(first));
    firstDay.setHours(0,0,0,0);
    
    let lastDay = new Date(firstDay);
    lastDay.setDate(lastDay.getDate() + 6);
    lastDay.setHours(23,59,59,999);

    let weeklyExpenses = [0, 0, 0, 0, 0, 0, 0]; 
    let totalWeeklyExpense = 0;
    let totalIncome = 0;
    let totalExpenseAllTime = 0;

    history.forEach(t => {
        if(!t.pending) { 
            let tDate = new Date(t.date);
            
            if(t.amount > 0) totalIncome += t.amount;
            else totalExpenseAllTime += Math.abs(t.amount);

            if(t.amount < 0 && tDate >= firstDay && tDate <= lastDay) {
                let dayIndex = tDate.getDay() - 1; 
                if(dayIndex === -1) dayIndex = 6; 
                weeklyExpenses[dayIndex] += Math.abs(t.amount);
                totalWeeklyExpense += Math.abs(t.amount);
            }
        }
    });

    const weeklyTotalEl = document.getElementById('stat-weekly-total');
    if(weeklyTotalEl) weeklyTotalEl.innerText = `₺${totalWeeklyExpense.toLocaleString('tr-TR', {minimumFractionDigits: 2})}`;

    const barContainer = document.getElementById('bank-dynamic-bars');
    if(barContainer) {
        barContainer.innerHTML = '';
        const days = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
        let maxExpense = Math.max(...weeklyExpenses);
        if(maxExpense === 0) maxExpense = 1; 

        for(let i=0; i<7; i++) {
            let hPct = (weeklyExpenses[i] / maxExpense) * 100;
            if(weeklyExpenses[i] > 0 && hPct < 10) hPct = 10; 

            let valText = weeklyExpenses[i] > 0 ? Math.round(weeklyExpenses[i]) : '';

            barContainer.innerHTML += `
                <div class="bank-bar-wrapper">
                    <span class="bar-value">${valText}</span>
                    <div class="bank-bar" style="height: ${hPct}%;"></div>
                    <span class="bar-lbl">${days[i]}</span>
                </div>
            `;
        }
    }

    let totalMovements = totalIncome + totalExpenseAllTime;
    let expensePct = totalMovements > 0 ? Math.round((totalExpenseAllTime / totalMovements) * 100) : 0;
    let incomePct = totalMovements > 0 ? Math.round((totalIncome / totalMovements) * 100) : 0;

    const donutExp = document.getElementById('donut-expense');
    const donutInc = document.getElementById('donut-income');
    const donutExpText = document.getElementById('donut-expense-text');
    const donutIncText = document.getElementById('donut-income-text');
    
    if(donutExp && donutExpText) {
        donutExp.style.background = `conic-gradient(#e74c3c ${expensePct}%, #f4f6f6 0)`;
        donutExpText.innerText = `%${expensePct}`;
    }
    if(donutInc && donutIncText) {
        donutInc.style.background = `conic-gradient(#27ae60 ${incomePct}%, #f4f6f6 0)`;
        donutIncText.innerText = `%${incomePct}`;
    }
};
// ==========================================
