// Oly-Maintain: arıza, bakım ve envanter takibi
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 🛠️ OLY-MAINTAIN V2 (REACT KLON) MOTORU
// ==========================================

// React App.jsx'ten alınan orijinal veriler
const maintWorkOrders = [
    { id: "İE-2451", ekipman: "VRV-3 Dış Ünite", konum: "Blok B Çatı", tur: "Planlı Bakım", oncelik: "orta", durum: "atandı", teknisyen: "Emirhan Ç.", tarih: "15 Eyl" },
    { id: "İE-2452", ekipman: "Chiller-1", konum: "Makine Dairesi", tur: "Arıza", oncelik: "kritik", durum: "devam ediyor", teknisyen: "Emirhan Ç.", tarih: "15 Eyl" },
    { id: "İE-2453", ekipman: "Salon Klima 204", konum: "2. Kat", tur: "Arıza", oncelik: "düşük", durum: "bekliyor", teknisyen: "Atanmadı", tarih: "14 Eyl" }
];

const maintParts = [
    { ad: "Gaz R410A (kg)", stok: 12, kritik: 5 },
    { ad: "Filtre Seti (VRV)", stok: 3, kritik: 5 },
    { ad: "Kompresör Rölesi", stok: 1, kritik: 2 }
];

window.openMaintainScreen = function() {
    const hub = document.getElementById('hub-screen');
    if (hub) { hub.classList.add('hidden'); hub.style.display = 'none'; }
    document.getElementById('maintain-screen').classList.remove('hidden');
    document.getElementById('maintain-screen').style.display = 'flex';
    
    // Varsayılan olarak Ana Sayfayı aç
    renderMaintTab('home');
    if (navigator.vibrate) navigator.vibrate(15);
};

window.closeMaintainScreen = function() {
    document.getElementById('maintain-screen').classList.add('hidden');
    document.getElementById('maintain-screen').style.display = 'none';
    if (typeof returnToHub === 'function') returnToHub();
};

window.switchMaintTab = function(tabName, btnElement) {
    document.querySelectorAll('.maint-nav-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    renderMaintTab(tabName);
    if (navigator.vibrate) navigator.vibrate(10);
};

// Sayfaları Render Eden Ana Fonksiyon
function renderMaintTab(tab) {
    const content = document.getElementById('maint-content');
    let html = '';

    const getPrioColor = (p) => p === 'kritik' ? 'var(--m-red)' : (p === 'orta' ? 'var(--m-amber)' : 'var(--m-muted)');
    const getStatusColor = (s) => s === 'tamamlandı' ? 'var(--m-green)' : (s === 'devam ediyor' ? 'var(--m-blue)' : '#6B4FA0');

    if (tab === 'home') {
        html += `
            <div style="padding: 16px; background: var(--m-ink); color: #fff; width: 100%; box-sizing: border-box;">
                <div style="font-size: 22px; font-weight: 700;">2 açık iş emrin var</div>
            </div>
            <div class="maint-section-title">ÖNCELİKLİ İŞLER</div>
        `;
        maintWorkOrders.forEach(wo => {
            html += `
                <div class="maint-wo-row" onclick="alert('${wo.id} detaylarına gidiliyor...')">
                    <div class="maint-wo-prio-bar" style="background: ${getPrioColor(wo.oncelik)}"></div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span style="font-family: monospace; font-size: 11.5px; color: var(--m-muted);">${wo.id}</span>
                            <span class="maint-pill" style="background: ${getStatusColor(wo.durum)}">${wo.durum}</span>
                        </div>
                        <div style="font-size: 14.5px; font-weight: 600; color: var(--m-ink);">${wo.ekipman}</div>
                        <div style="font-size: 12px; color: var(--m-muted); margin-top: 2px;">📍 ${wo.konum} · ${wo.tur}</div>
                    </div>
                    <div style="color: #B7C2CB; font-weight: bold; font-size: 18px;">›</div>
                </div>
            `;
        });
    }
    else if (tab === 'bildir') {
        html += `
            <div style="padding: 16px;">
                <div class="maint-section-title" style="padding: 0 0 8px 0;">EKİPMAN</div>
                <select style="width: 100%; border: 1px solid var(--m-line); border-radius: 8px; padding: 12px; margin-bottom: 16px; background: #fff; font-size: 15px; color: var(--m-ink); outline: none;">
                    <option>Ekipman seçin...</option>
                    <option>Chiller-1</option>
                    <option>VRV-3 Dış Ünite</option>
                </select>

                <div class="maint-section-title" style="padding: 0 0 8px 0;">ÖNCELİK</div>
                <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                    <button style="flex: 1; border: 1.5px solid var(--m-line); background: #fff; color: var(--m-ink); border-radius: 8px; padding: 10px 0; font-weight: 700;">Düşük</button>
                    <button style="flex: 1; border: 1.5px solid var(--m-amber); background: var(--m-amber); color: #fff; border-radius: 8px; padding: 10px 0; font-weight: 700;">Orta</button>
                    <button style="flex: 1; border: 1.5px solid var(--m-line); background: #fff; color: var(--m-ink); border-radius: 8px; padding: 10px 0; font-weight: 700;">Kritik</button>
                </div>

                <div class="maint-section-title" style="padding: 0 0 8px 0;">AÇIKLAMA</div>
                <textarea placeholder="Arızayı tarif edin..." style="width: 100%; min-height: 100px; border: 1px solid var(--m-line); border-radius: 8px; padding: 12px; background: #fff; font-size: 15px; color: var(--m-ink); outline: none; resize: vertical; margin-bottom: 20px; box-sizing: border-box;"></textarea>

                <button style="width: 100%; background: var(--m-red); color: #fff; border: none; border-radius: 8px; padding: 14px 0; font-size: 14.5px; font-weight: 700; cursor: pointer;">Arızayı Bildir</button>
            </div>
        `;
    }
    else if (tab === 'stok') {
        html += `<div style="padding-top: 8px;">`;
        maintParts.forEach(p => {
            let isLow = p.stok <= p.kritik;
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--m-line); background: var(--m-surface);">
                    <div>
                        <div style="font-size: 14.5px; font-weight: 600; color: var(--m-ink);">${p.ad}</div>
                        <div style="font-size: 12px; color: ${isLow ? 'var(--m-red)' : 'var(--m-muted)'}; margin-top: 4px; font-weight: ${isLow ? '700' : '400'};">${p.stok} adet stokta ${isLow ? '— kritik!' : ''}</div>
                    </div>
                    <button style="border: 1px solid var(--m-blue); color: var(--m-blue); background: #fff; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer;">+ Talep</button>
                </div>
            `;
        });
        html += `</div>`;
    }

    content.innerHTML = html;
}
