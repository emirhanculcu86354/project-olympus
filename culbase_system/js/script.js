
// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(function(registration) {
    console.log('ServiceWorker registration successful');
  }).catch(function(err) {
    console.log('ServiceWorker registration failed: ', err);
  });
}

document.addEventListener("DOMContentLoaded", function () {
    const body = document.body;
    const checkbox = document.getElementById("checkbox");

    if (checkbox) {
        if (localStorage.getItem("darkMode") === "enabled") { body.classList.add("dark-mode"); body.classList.remove("light-mode"); checkbox.checked = true; }
        else { body.classList.add("light-mode"); body.classList.remove("dark-mode"); checkbox.checked = false; }
        checkbox.addEventListener("change", function () {
            if (this.checked) { body.classList.remove("light-mode"); body.classList.add("dark-mode"); localStorage.setItem("darkMode", "enabled"); }
            else { body.classList.remove("dark-mode"); body.classList.add("light-mode"); localStorage.setItem("darkMode", "disabled"); }
        });
    }

    const globalWelcome = document.getElementById("globalWelcome");
    if(globalWelcome) {
        const user = sessionStorage.getItem("loggedInUser");
        if(user) { globalWelcome.textContent = "Hoşgeldin, " + user; }
    }

    const loginForm = document.getElementById("staticLoginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const user = document.getElementById("username").value;
            if(user) { sessionStorage.setItem("loggedInUser", user); window.location.href = "ana_sayfa.html"; }
        });
    }

    const adminForm = document.getElementById("staticAdminForm");
    if(adminForm) {
        adminForm.addEventListener("submit", function(e) {
            e.preventDefault();
            const pass = document.getElementById("admin_password").value;
            if(pass === "183654" || pass === "admin123") {
                sessionStorage.setItem("loggedInUser", "Yönetici"); window.location.href = "ana_sayfa.html";
            } else { alert("Hatalı yönetici şifresi!"); }
        });
    }

    const addRowBtn = document.getElementById("addRow");
    const offerTableBody = document.getElementById("offerTableBody");
    const saveBtn = document.getElementById("saveOffer");

    if (addRowBtn && offerTableBody) {
        addRowBtn.addEventListener("click", function (e) {
            e.preventDefault();
            let newRow = document.createElement("tr");
            newRow.innerHTML = `
                <td><input type="text" class="input-field item-name" placeholder="İsim"></td>
                <td><input type="text" class="input-field item-desc" placeholder="Tanım"></td>
                <td><input type="number" class="input-field quantity" value="1" min="1"></td>
                <td><input type="number" class="input-field price" value="0" min="0"></td>
                <td class="total-price" style="font-weight:bold; vertical-align: middle;">0.00 ₺</td>
                <td style="vertical-align: middle;"><button type="button" class="delete-btn">Sil</button></td>
            `;
            offerTableBody.appendChild(newRow);
            updateTotal();

            newRow.querySelector(".delete-btn").addEventListener("click", function () { newRow.remove(); updateTotal(); });
            newRow.querySelector(".quantity").addEventListener("input", updateTotal);
            newRow.querySelector(".price").addEventListener("input", updateTotal);
        });
    }

    function updateTotal() {
        let total = 0;
        document.querySelectorAll("#offerTableBody tr").forEach(row => {
            const q = row.querySelector(".quantity"); const p = row.querySelector(".price"); const tp = row.querySelector(".total-price");
            if (q && p && tp) {
                let rowTot = parseFloat(q.value) * parseFloat(p.value);
                total += rowTot; tp.textContent = rowTot.toFixed(2) + " ₺";
            }
        });
        let kdv = total * 0.20; let grand = total + kdv;
        let tAmt = document.getElementById("totalAmount"); if(tAmt) tAmt.textContent = total.toFixed(2) + " ₺";
        let kAmt = document.getElementById("kdvAmount"); if(kAmt) kAmt.textContent = kdv.toFixed(2) + " ₺";
        let gAmt = document.getElementById("grandTotal"); if(gAmt) gAmt.textContent = grand.toFixed(2) + " ₺";
    }

    if(saveBtn) {
        saveBtn.addEventListener("click", function(e) {
            e.preventDefault();
            const cName = document.getElementById("companyName").value;
            const oDate = document.getElementById("offerDate").value;
            const oNum = document.getElementById("offerNumber").value;

            if(!cName || !oDate || !oNum) { showToast("Lütfen firma adı, tarih ve teklif numarasını doldurun."); return; }

            let items = [];
            document.querySelectorAll("#offerTableBody tr").forEach(row => {
                const nameInp = row.querySelector(".item-name");
                if(!nameInp) return;
                items.push({
                    name: nameInp.value, desc: row.querySelector(".item-desc").value,
                    qty: row.querySelector(".quantity").value, price: row.querySelector(".price").value, total: row.querySelector(".total-price").textContent
                });
            });

            if(items.length === 0 || !items[0].name) { showToast("Lütfen teklife en az bir geçerli kalem ekleyin."); return; }

            let grandTotal = document.getElementById("grandTotal").textContent;
            let newOffer = { id: Date.now(), companyName: cName, offerDate: oDate, offerNumber: oNum, items: items, grandTotal: grandTotal };

            let offers = JSON.parse(localStorage.getItem("culbase_offers")) || [];
            offers.push(newOffer);
            localStorage.setItem("culbase_offers", JSON.stringify(offers));
            showToast("Teklif başarıyla kaydedildi!");
            setTimeout(() => { window.location.href = "offers.html"; }, 1500);
        });
    }

    const savedTable = document.getElementById("savedOffersTableBody");
    if(savedTable) {
        let offers = JSON.parse(localStorage.getItem("culbase_offers")) || [];
        if(offers.length === 0) {
            savedTable.innerHTML = "<tr><td colspan='5'>Henüz kayıtlı teklif bulunmamaktadır.</td></tr>";
        } else {
            offers.forEach(off => {
                let tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${off.offerNumber}</td><td>${off.companyName}</td><td>${off.offerDate}</td>
                    <td><strong style="color:#198b1d;">${off.grandTotal}</strong></td>
                    <td><button class="delete-btn" onclick="deleteOffer(${off.id})">Sil</button></td>
                `;
                savedTable.appendChild(tr);
            });
        }
    }

    const stokTable = document.getElementById("stokTableBody");
    const addStokBtn = document.getElementById("addStokBtn");
    if (stokTable) loadStok();

    if (addStokBtn) {
        addStokBtn.addEventListener("click", function(e) {
            e.preventDefault();
            const code = document.getElementById("stokCode").value;
            const name = document.getElementById("stokName").value;
            const cat = document.getElementById("stokCat").value;
            const qty = document.getElementById("stokQty").value;

            if(!code || !name || !qty) { showToast("Lütfen stok kodu, adı ve miktarını giriniz."); return; }

            let stoks = JSON.parse(localStorage.getItem("culbase_stok")) || [];
            stoks.push({ id: Date.now(), code: code, name: name, category: cat, qty: qty });
            localStorage.setItem("culbase_stok", JSON.stringify(stoks));
            document.getElementById("stokForm").reset();
            loadStok();
            showToast("Stok eklendi!");
        });
    }

    function loadStok() {
        let stoks = JSON.parse(localStorage.getItem("culbase_stok")) || [];
        stokTable.innerHTML = "";
        if(stoks.length === 0) {
            stokTable.innerHTML = "<tr><td colspan='5'>Sistemde kayıtlı stok bulunmuyor.</td></tr>";
        } else {
            stoks.forEach(item => {
                let tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${item.code}</td><td>${item.name}</td><td>${item.category}</td>
                    <td><strong style="color:#2f81f7;">${item.qty}</strong></td>
                    <td><button class="delete-btn" onclick="deleteStok(${item.id})">Sil</button></td>
                `;
                stokTable.appendChild(tr);
            });
        }
    }

    window.deleteStok = function(id) {
        if(confirm("Bu stoğu silmek istediğinize emin misiniz?")) {
            let stoks = JSON.parse(localStorage.getItem("culbase_stok")) || [];
            stoks = stoks.filter(s => s.id !== id);
            localStorage.setItem("culbase_stok", JSON.stringify(stoks));
            loadStok();
        }
    };

    initCanvasDrag();
});

window.showToast = function(message) {
    let toast = document.getElementById("toastMsg");
    if(!toast) {
        toast = document.createElement("div");
        toast.id = "toastMsg";
        toast.className = "toast-msg";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = "toast-msg show";
    setTimeout(function(){ toast.className = toast.className.replace("show", ""); }, 3000);
}

// ==== PWA / WEB TARAYICI İÇİN NATIVE İNDİRME ====
window.exportMaterialExcel = function(type) {
    showToast("Excel Cihazınıza İndiriliyor...");
    let excelData = [
        ["", "", "", "", "", "", ""],
        ["", "TEKLİF (KİME) ;", "", "", "", "TEKLİF (KİMDEN) ;", ""],
        ["", "", "", "", "", "CULBASE Automation", ""],
        ["", "Tarih:", "", "", "", "Tel: +905362503300", ""],
        ["", "Teklif No:", "", "", "", "Hazırlayan: Emirhan ÇULCU", ""],
        ["", "", "", "", "", "", ""],
        ["", "İSİM", "TANIM", "MİKTAR", "BİRİM FİYAT", "TOTAL", ""]
    ];
    
    let subTotal = 0, kdv = 0, grandTotal = 0;
    let offerNumber = "TKLF-" + Math.floor(Math.random()*10000);
    
    if (type === 'pano') {
        excelData[2][1] = "Pano Tasarım Projesi";
        const allItems = document.querySelectorAll(".canvas-item");
        if(allItems.length === 0) { showToast("Panoda malzeme yok!"); return;}
        
        let materialCounts = {};
        allItems.forEach(item => {
            let name = item.textContent;
            if(materialCounts[name]) { materialCounts[name]++; } else { materialCounts[name] = 1; }
        });
        for (const [name, count] of Object.entries(materialCounts)) {
            excelData.push(["", name, "Pano Çiziminden Aktarıldı", count, 0, 0, ""]);
        }
    } else {
        const companyName = document.getElementById("companyName").value || "Belirtilmedi";
        const offerDate = document.getElementById("offerDate").value || "";
        offerNumber = document.getElementById("offerNumber").value || offerNumber;
        
        excelData[2][1] = companyName;
        excelData[3][2] = offerDate;
        excelData[4][2] = offerNumber;

        const rows = document.querySelectorAll("#offerTableBody tr");
        if(rows.length === 0) { showToast("Tabloda kalem yok!"); return;}
        
        let hasItem = false;
        rows.forEach(row => {
            const nameInput = row.querySelector(".item-name");
            if(!nameInput) return;
            const name = nameInput.value;
            const desc = row.querySelector(".item-desc").value;
            const qty = parseFloat(row.querySelector(".quantity").value) || 0;
            const price = parseFloat(row.querySelector(".price").value) || 0;
            const rowTotal = qty * price;
            if(name) { 
                excelData.push(["", name, desc, qty, price, rowTotal, ""]); 
                hasItem = true;
            }
        });
        
        if(!hasItem) { showToast("Listede geçerli veri yok!"); return; }

        subTotal = parseFloat(document.getElementById("totalAmount")?.textContent) || 0;
        kdv = parseFloat(document.getElementById("kdvAmount")?.textContent) || 0;
        grandTotal = parseFloat(document.getElementById("grandTotal")?.textContent) || 0;
    }

    excelData.push(["", "", "", "", "", "", ""]);
    excelData.push(["", "", "", "", "ARA TOPLAM", subTotal, ""]);
    excelData.push(["", "", "", "", "KDV %20", kdv, ""]);
    excelData.push(["", "", "", "", "GENEL TOPLAM", grandTotal, ""]);

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    ws['!cols'] = [{wch: 2}, {wch: 25}, {wch: 45}, {wch: 10}, {wch: 15}, {wch: 15}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hesaptablosu.Net");
    
    // Doğrudan Tarayıcı İndirmesi
    XLSX.writeFile(wb, `CULbase_${offerNumber}.xlsx`);
    showToast("Excel İndirildi!");
};

// PDF MOTORU - Tarayıcı Desteği İçin Perdeyi Görünür Yaparak Beyaz Sayfayı Çözer
window.generateProfessionalPDF = function(type) {
    let companyName = "Belirtilmedi", offerDate = new Date().toISOString().split('T')[0], offerNumber = "TKLF-" + Math.floor(Math.random()*10000);
    let items = [];
    let subTotal = 0, kdv = 0, grandTotal = 0;

    if (type === 'teklif') {
        companyName = document.getElementById("companyName").value || "Belirtilmedi";
        offerDate = document.getElementById("offerDate").value || offerDate;
        offerNumber = document.getElementById("offerNumber").value || offerNumber;

        document.querySelectorAll("#offerTableBody tr").forEach(row => {
            const nameInput = row.querySelector(".item-name");
            if(!nameInput) return;
            const name = nameInput.value;
            const desc = row.querySelector(".item-desc").value;
            const qty = parseFloat(row.querySelector(".quantity").value) || 0;
            const price = parseFloat(row.querySelector(".price").value) || 0;
            const rowTotal = qty * price;
            if(name) { items.push({name, desc, qty, price, total: rowTotal}); }
        });
        subTotal = parseFloat(document.getElementById("totalAmount")?.textContent) || 0;
        kdv = parseFloat(document.getElementById("kdvAmount")?.textContent) || 0;
        grandTotal = parseFloat(document.getElementById("grandTotal")?.textContent) || 0;

    } else if (type === 'pano') {
        companyName = "Pano Tasarım Projesi";
        offerNumber = "PANO-" + Math.floor(Math.random()*10000);
        const allItems = document.querySelectorAll(".canvas-item");
        let materialCounts = {};
        allItems.forEach(item => {
            let name = item.textContent;
            if(materialCounts[name]) { materialCounts[name]++; } else { materialCounts[name] = 1; }
        });
        for (const [name, count] of Object.entries(materialCounts)) {
            items.push({name: name, desc: "Pano Montaj Ekipmanı", qty: count, price: 0, total: 0});
        }
    }

    if(items.length === 0) { showToast("Uyarı: Listede hiç malzeme/kalem bulunmuyor!"); return; }

    // 1. TAM EKRAN VE GÖRÜNÜR PERDE - iOS Safari dahi görsün diye
    let overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0"; overlay.style.left = "0";
    overlay.style.width = "100vw"; overlay.style.height = "100vh";
    overlay.style.backgroundColor = "#fff";
    overlay.style.zIndex = "999999";
    overlay.style.overflow = "auto";
    document.body.appendChild(overlay);

    let template = document.createElement("div");
    template.id = "pdfExportArea";
    template.style.width = "210mm"; 
    template.style.minHeight = "297mm";
    template.style.padding = "15mm"; 
    template.style.margin = "0 auto";
    template.style.backgroundColor = "#ffffff";
    template.style.color = "#000000"; 
    template.style.fontFamily = "Arial, sans-serif"; 
    template.style.boxSizing = "border-box";
    overlay.appendChild(template);

    let tbodyHTML = ""; let totalItemsCount = 0;
    items.forEach(item => {
        totalItemsCount += item.qty;
        tbodyHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; border-left: 1px solid #eee; border-right: 1px solid #eee;">${item.name}</td>
                <td style="padding: 10px; border-right: 1px solid #eee;">${item.desc}</td>
                <td style="padding: 10px; border-right: 1px solid #eee; text-align: center; font-weight:bold;">${item.qty}</td>
                <td style="padding: 10px; border-right: 1px solid #eee; text-align: right;">${item.price.toFixed(2)} ₺</td>
                <td style="padding: 10px; border-right: 1px solid #eee; text-align: right; font-weight:bold;">${item.total.toFixed(2)} ₺</td>
            </tr>
        `;
    });

    template.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #198b1d; padding-bottom: 15px; margin-bottom: 30px;">
            <img src="CULBASEpng.png" style="height: 70px; object-fit: contain;">
            <div style="text-align: right; font-size: 14px; line-height: 1.5;">
                <p style="margin:0;"><strong>Tarih:</strong> ${offerDate}</p>
                <p style="margin:0;"><strong>Teklif No:</strong> ${offerNumber}</p>
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; line-height: 1.5;">
            <div style="width: 48%; background: #f9f9f9; padding: 15px; border-radius: 5px;">
                <h4 style="margin:0 0 10px 0; color: #555; border-bottom: 1px solid #ccc; padding-bottom: 5px;">TEKLİF (KİME):</h4>
                <strong style="font-size:16px; color:#198b1d;">${companyName}</strong>
            </div>
            <div style="width: 48%; background: #f9f9f9; padding: 15px; border-radius: 5px; text-align: right;">
                <h4 style="margin:0 0 10px 0; color: #555; border-bottom: 1px solid #ccc; padding-bottom: 5px;">TEKLİF (KİMDEN):</h4>
                <strong style="font-size:16px; color:#198b1d;">CULBASE AUTOMATION</strong><br>
                Tel: +905362503300<br>
                Hazırlayan: Emirhan ÇULCU
            </div>
        </div>
        <h3 style="text-align:center; color:#333; margin-bottom:15px; text-transform:uppercase;">${type === 'pano' ? 'Pano Malzeme ve Ekipman Listesi' : 'Fiyat Teklifi ve Hizmet Dökümü'}</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
            <thead>
                <tr style="background-color: #198b1d; color: white;">
                    <th style="padding: 10px; border: 1px solid #147217; text-align: left;">İSİM</th>
                    <th style="padding: 10px; border: 1px solid #147217; text-align: left;">TANIM</th>
                    <th style="padding: 10px; border: 1px solid #147217; text-align: center;">MİKTAR</th>
                    <th style="padding: 10px; border: 1px solid #147217; text-align: right;">BİRİM FİYAT</th>
                    <th style="padding: 10px; border: 1px solid #147217; text-align: right;">TOPLAM</th>
                </tr>
            </thead>
            <tbody>${tbodyHTML}</tbody>
        </table>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; font-size: 14px;">
            <div style="width: 50%; padding: 15px; background: #eef7ee; border-radius: 5px; border: 1px solid #c3e6c3;">
                <p style="margin:0 0 5px 0;"><strong>Özet Bilgi:</strong></p>
                <p style="margin:0; color:#555;">Listede toplam <strong>${totalItemsCount} adet</strong> kalem/malzeme bulunmaktadır.</p>
            </div>
            <div style="width: 40%;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">ARA TOPLAM:</td><td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">${subTotal.toFixed(2)} ₺</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #333;">KDV (%20):</td><td style="padding: 8px; text-align: right; border-bottom: 1px solid #333;">${kdv.toFixed(2)} ₺</td></tr>
                    <tr><td style="padding: 10px 8px; font-weight: bold; font-size:16px;">GENEL TOPLAM:</td><td style="padding: 10px 8px; text-align: right; font-size:16px; font-weight:bold; color:#198b1d;">${grandTotal.toFixed(2)} ₺</td></tr>
                </table>
            </div>
        </div>
        <div style="margin-top: 50px; text-align: center; padding-top: 20px;">
            <img src="Emirhan ÇULCU email imza.png" style="max-width: 80%; height: auto;">
        </div>
    `;

    showToast("PDF Cihazınıza İndiriliyor...");
    const opt = {
        margin:       0, 
        filename:     'CULbase_' + (type === 'pano' ? 'Malzeme_' : 'Teklif_') + offerNumber + '.pdf',
        image:        { type: 'jpeg', quality: 1.0 }, 
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff', scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Doğrudan Tarayıcı İndirmesi
    setTimeout(() => {
        html2pdf().set(opt).from(template).save().then(() => {
            overlay.remove();
            showToast("PDF Başarıyla İndirildi!");
        });
    }, 1500);
};

function deleteOffer(id) {
    if(confirm("Bu teklifi silmek istediğinize emin misiniz?")) {
        let offers = JSON.parse(localStorage.getItem("culbase_offers")) || [];
        offers = offers.filter(o => o.id !== id);
        localStorage.setItem("culbase_offers", JSON.stringify(offers));
        window.location.reload();
    }
}

function logout() { sessionStorage.removeItem("loggedInUser"); window.location.href = "index.html"; }

// CAD MOTORU MANTIĞI VE 3D GÖRÜNÜM
let activeCanvasId = "panoCanvas_sac";
let isDoorOpen = false;

window.switchView = function(viewType) {
    const sac = document.getElementById("panoCanvas_sac");
    const kapak = document.getElementById("panoCanvas_kapak");
    const view3d = document.getElementById("panoCanvas_3d");
    
    document.querySelectorAll(".view-switch .tool-btn").forEach(btn => btn.classList.remove("active-view"));

    if(viewType === 'sac') {
        sac.style.display = "block"; kapak.style.display = "none"; view3d.style.display = "none";
        document.getElementById("viewSacBtn").classList.add("active-view");
        activeCanvasId = "panoCanvas_sac";
    } else if(viewType === 'kapak') {
        sac.style.display = "none"; kapak.style.display = "block"; view3d.style.display = "none";
        document.getElementById("viewKapakBtn").classList.add("active-view");
        activeCanvasId = "panoCanvas_kapak";
    } else if(viewType === '3d') {
        sac.style.display = "none"; kapak.style.display = "none"; view3d.style.display = "block";
        document.getElementById("view3DBtn").classList.add("active-view");
        activeCanvasId = null; 
        
        const sac3D = document.getElementById("pano3D_sac");
        const kapak3D = document.getElementById("pano3D_kapak");
        sac3D.innerHTML = ''; kapak3D.innerHTML = '<div class="door-handle"></div>';
        
        Array.from(sac.children).forEach(child => {
            if(child.classList.contains('canvas-item')) {
                let clone = child.cloneNode(true); clone.style.cursor = "default"; clone.classList.remove("selected"); sac3D.appendChild(clone);
            }
        });
        Array.from(kapak.children).forEach(child => {
            if(child.classList.contains('canvas-item')) {
                let clone = child.cloneNode(true); clone.style.cursor = "default"; clone.classList.remove("selected"); kapak3D.appendChild(clone);
            }
        });
    }
};

window.toggle3DDoor = function() {
    isDoorOpen = !isDoorOpen;
    const kapak = document.getElementById("pano3D_kapak");
    if(isDoorOpen) kapak.style.transform = "rotateY(-120deg)";
    else kapak.style.transform = "rotateY(0deg)";
};

function initCanvasDrag() {
    if (!document.getElementById("panoCanvas_sac")) return;

    var acc = document.getElementsByClassName("accordion");
    for (let i = 0; i < acc.length; i++) {
        acc[i].addEventListener("click", function() {
            this.classList.toggle("active-acc");
            var panel = this.nextElementSibling;
            if (panel.style.display === "block") { panel.style.display = "none"; } else { panel.style.display = "block"; }
        });
    }

    const wInput = document.getElementById("panoWInput");
    const hInput = document.getElementById("panoHInput");
    const sac = document.getElementById("panoCanvas_sac");
    const kapak = document.getElementById("panoCanvas_kapak");
    const box3D = document.getElementById("pano3DBox");

    function updatePanoSize() {
        const w = wInput.value + "px"; const h = hInput.value + "px";
        sac.style.width = w; sac.style.height = h; kapak.style.width = w; kapak.style.height = h;
        if(box3D) { box3D.style.width = w; box3D.style.height = h; }
    }
    if(wInput && hInput) { wInput.addEventListener("input", updatePanoSize); hInput.addEventListener("input", updatePanoSize); }

    // DOKUNMATİK DESTEĞİ İÇİN DRAG EVENTS
    let activeEl = null; let offsetX = 0, offsetY = 0;

    document.querySelectorAll(".lib-item").forEach(item => {
        item.addEventListener("dragstart", e => {
            e.dataTransfer.setData("type", item.dataset.type); e.dataTransfer.setData("name", item.textContent);
            e.dataTransfer.setData("w", item.dataset.w); e.dataTransfer.setData("h", item.dataset.h);
        });
        
        // Mobil Dokunmatik Seçim (Basılı tutunca ekrana at)
        item.addEventListener("touchstart", e => {
            if(activeCanvasId) {
                const canvas = document.getElementById(activeCanvasId);
                const type = item.dataset.type; const name = item.textContent;
                const w = item.dataset.w; const h = item.dataset.h;
                
                const el = document.createElement("div"); el.className = `canvas-item ${type}`; el.textContent = name;
                el.style.left = "50px"; el.style.top = "50px"; el.style.width = w + "px"; el.style.height = h + "px";
                canvas.appendChild(el); selectElement(el); bindElementEvents(el);
            }
        });
    });

    const dropZones = [document.getElementById("panoCanvas_sac"), document.getElementById("panoCanvas_kapak")];
    dropZones.forEach(canvas => {
        canvas.addEventListener("dragover", e => e.preventDefault());
        canvas.addEventListener("drop", e => {
            e.preventDefault();
            if(canvas.id !== activeCanvasId) return;

            const type = e.dataTransfer.getData("type"); const name = e.dataTransfer.getData("name");
            const w = e.dataTransfer.getData("w"); const h = e.dataTransfer.getData("h");
            if (!type) return;

            const rect = canvas.getBoundingClientRect();
            let x = Math.round((e.clientX - rect.left - 10) / 10) * 10; let y = Math.round((e.clientY - rect.top - 10) / 10) * 10;

            const el = document.createElement("div"); el.className = `canvas-item ${type}`; el.textContent = name;
            el.style.left = x + "px"; el.style.top = y + "px"; el.style.width = w + "px"; el.style.height = h + "px";

            canvas.appendChild(el); selectElement(el); bindElementEvents(el);
        });
    });
    
    function bindElementEvents(el) {
        el.addEventListener("mousedown", dragStart);
        el.addEventListener("touchstart", dragStartMobile, {passive: false});
        el.addEventListener("dblclick", () => { if(confirm("Bu elemanı silmek istiyor musunuz?")) { el.remove(); clearProps(); } });
    }

    function dragStart(e) {
        activeEl = e.target; selectElement(activeEl);
        const rect = activeEl.getBoundingClientRect(); offsetX = e.clientX - rect.left; offsetY = e.clientY - rect.top;
        document.addEventListener("mousemove", dragMove); document.addEventListener("mouseup", dragEnd);
    }
    
    function dragStartMobile(e) {
        activeEl = e.target; selectElement(activeEl);
        const touch = e.touches[0];
        const rect = activeEl.getBoundingClientRect(); offsetX = touch.clientX - rect.left; offsetY = touch.clientY - rect.top;
        document.addEventListener("touchmove", dragMoveMobile, {passive: false}); document.addEventListener("touchend", dragEnd);
    }
    
    function dragMove(e) {
        if (!activeEl) return;
        const activeCanvas = document.getElementById(activeCanvasId);
        const rect = activeCanvas.getBoundingClientRect();
        let rawX = e.clientX - rect.left - offsetX; let rawY = e.clientY - rect.top - offsetY;

        let x = Math.round(rawX / 10) * 10; let y = Math.round(rawY / 10) * 10;
        if(x < 0) x = 0; if(y < 0) y = 0;

        activeEl.style.left = x + "px"; activeEl.style.top = y + "px"; updateProps(activeEl);
    }
    
    function dragMoveMobile(e) {
        if (!activeEl) return;
        e.preventDefault();
        const activeCanvas = document.getElementById(activeCanvasId);
        const touch = e.touches[0];
        const rect = activeCanvas.getBoundingClientRect();
        let rawX = touch.clientX - rect.left - offsetX; let rawY = touch.clientY - rect.top - offsetY;

        let x = Math.round(rawX / 10) * 10; let y = Math.round(rawY / 10) * 10;
        if(x < 0) x = 0; if(y < 0) y = 0;

        activeEl.style.left = x + "px"; activeEl.style.top = y + "px"; updateProps(activeEl);
    }
    
    function dragEnd() { 
        activeEl = null; 
        document.removeEventListener("mousemove", dragMove); document.removeEventListener("mouseup", dragEnd);
        document.removeEventListener("touchmove", dragMoveMobile); document.removeEventListener("touchend", dragEnd);
    }

    function selectElement(el) { document.querySelectorAll(".canvas-item").forEach(i => i.classList.remove("selected")); el.classList.add("selected"); updateProps(el); }
    function updateProps(el) {
        document.getElementById("propName").textContent = el.textContent;
        document.getElementById("propX").value = parseInt(el.style.left, 10) || 0; document.getElementById("propY").value = parseInt(el.style.top, 10) || 0;
        document.getElementById("propW").value = parseInt(el.style.width, 10) || 0; document.getElementById("propH").value = parseInt(el.style.height, 10) || 0;
        window.activeElement = el;
    }
    function clearProps() {
        document.getElementById("propName").textContent = "Seçili Öğe Yok";
        document.getElementById("propX").value = 0; document.getElementById("propY").value = 0;
        document.getElementById("propW").value = 0; document.getElementById("propH").value = 0; window.activeElement = null;
    }

    document.querySelectorAll(".prop-input").forEach(inp => {
        inp.addEventListener("input", e => {
            if(window.activeElement) {
                const val = e.target.value + "px";
                if(e.target.id === "propX") window.activeElement.style.left = val; if(e.target.id === "propY") window.activeElement.style.top = val;
                if(e.target.id === "propW") window.activeElement.style.width = val; if(e.target.id === "propH") window.activeElement.style.height = val;
            }
        });
    });

    document.querySelectorAll(".canvas-plate").forEach(canvas => {
        canvas.addEventListener("mousedown", e => { if(e.target === canvas) { document.querySelectorAll(".canvas-item").forEach(i => i.classList.remove("selected")); clearProps(); } });
        canvas.addEventListener("touchstart", e => { if(e.target === canvas) { document.querySelectorAll(".canvas-item").forEach(i => i.classList.remove("selected")); clearProps(); } });
    });
}
