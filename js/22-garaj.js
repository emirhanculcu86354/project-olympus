// Garaj: araç vitrini, finansman, Sahibinden yönlendirme
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 🏎️ GARAGE: MULTI-CAR SHOWROOM VE FİNANS MOTORU
// ==========================================

const preloadBMW = new Image();
preloadBMW.src = "bmw.png";

// Her iki araç için değişecek dinamik veritabanı
const garageCarsData = {
    megane: {
        id: 'megane',
        themeColor: '#f39c12',
        title: "RENAULT MEGANE 4",
        sub: "1.3 TCe EDC Icon (2020+)",
        info: "~120.000 KM | Makyajlı Kasa",
        model: "megane.glb",
        hp: "140 HP", tork: "240 Nm", gear: "7 İleri EDC", accel: "9.7 Saniye", fuel: "5.4 Litre / 100 km",
        shb: "https://www.sahibinden.com/renault-megane?a5_min=2020",
        img1: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZjiiOCoyNeInXSWNsOtBFYZmgJ68cN7nk4zHxIIlQow&s=10",
        img2: "https://www.sixt.com.tr/storage/cache/14dcc6129b5180aa693f07b68c214bfb28dffb4a.webp",
        img3: "https://img.piri.net/piri/upload/3/2023/7/5/065a553e-exmpgkldmcswfiglnbzkn.png",
        img4: "https://boosterperformance.com/uploads/p/p/Renault-Megane-Megane-4-ph2-032021-Chip-Tuning-10-TCE-115hp_1.jpg?v=1727274165",
        defPrice: 1200000, defMonthly: 25000
    },
    bmw: {
        id: 'bmw',
        themeColor: '#00d2ff',
        title: "BMW 3 SERİSİ (G20)",
        sub: "320i First Edition M Sport (2020+)",
        info: "90.000 KM | Kazasız",
        model: "bmw_g20.glb", // İnternetten bulacağın 3D dosyanın adı bu olmalı
        hp: "170 HP", tork: "250 Nm", gear: "8 İleri Steptronic", accel: "7.1 Saniye", fuel: "6.0 Litre / 100 km",
        shb: "https://www.sahibinden.com/bmw-3-serisi-320i-m-sport?a5_min=2020",
        img1: "https://bmw.scene7.com/is/image/BMW/g20_ice_ext_kidney:3to2?fmt=webp&wid=2560&fit=wrap%2C+1",
        img2: "https://bmw.scene7.com/is/image/BMW/g20_ice_finance_leasing:3to2?fmt=webp&wid=1493&fit=wrap%2C+1",
        img3: "https://bmw.scene7.com/is/image/BMW/g20_ice_ext_m-sport-package:3to2?fmt=webp&wid=2560&fit=wrap%2C+1",
        img4: "https://carbrands.com.tr/uploads/BMW-3er-Sedan-G20.jpg",
        defPrice: 2800000, defMonthly: 45000
    }
};

let activeGarageCar = 'megane'; // Varsayılan araç

// Araç Geçiş Butonlarını ve Verileri Ayarlayan Fonksiyon
window.switchGarageCar = function(carKey) {
    activeGarageCar = carKey;
    const carData = garageCarsData[carKey];

    // Sekme Stillerini Güncelle
    const btnMegane = document.getElementById('tab-megane');
    const btnBmw = document.getElementById('tab-bmw');

    if(carKey === 'megane') {
        btnMegane.style.background = 'rgba(243, 156, 18, 0.1)';
        btnMegane.style.borderColor = '#f39c12';
        btnMegane.style.color = '#f39c12';
        
        btnBmw.style.background = '#111';
        btnBmw.style.borderColor = '#333';
        btnBmw.style.color = '#888';
    } else {
        btnBmw.style.background = 'rgba(0, 210, 255, 0.1)';
        btnBmw.style.borderColor = '#00d2ff';
        btnBmw.style.color = '#00d2ff';
        
        btnMegane.style.background = '#111';
        btnMegane.style.borderColor = '#333';
        btnMegane.style.color = '#888';
    }

    // Temaya göre ışık renklerini değiştir
    document.getElementById('gar-light-glow').style.background = `rgba(${carKey === 'megane' ? '243,156,18' : '0,210,255'}, 0.15)`;
    document.getElementById('gar-car-sub').style.color = carData.themeColor;
    document.getElementById('gar-pct').style.color = carData.themeColor;
    const payBtn = document.getElementById('gar-pay-btn');
    payBtn.style.color = carData.themeColor;
    payBtn.style.borderColor = carData.themeColor;
    payBtn.style.background = `rgba(${carKey === 'megane' ? '243,156,18' : '0,210,255'}, 0.1)`;

    const emiModal = document.getElementById('eminevim-settings-modal').querySelector('.modal-content');
    emiModal.style.borderColor = carData.themeColor;
    document.getElementById('emi-modal-title').style.color = carData.themeColor;
    document.getElementById('emi-monthly').style.color = carData.themeColor;

    const barFill = document.getElementById('gar-bar');
    if(carKey === 'megane') {
        barFill.style.background = 'linear-gradient(90deg, #f39c12, #f1c40f)';
        barFill.style.boxShadow = '0 0 10px rgba(243, 156, 18, 0.5)';
    } else {
        barFill.style.background = 'linear-gradient(90deg, #00d2ff, #3a7bd5)';
        barFill.style.boxShadow = '0 0 10px rgba(0, 210, 255, 0.5)';
    }

    // DOM Öğelerini Güncelle
    document.getElementById('gar-car-title').innerText = carData.title;
    document.getElementById('gar-car-sub').innerText = carData.sub;
    document.getElementById('gar-car-info').innerText = carData.info;
    
    // Model Viewer kaynağı değişiyor (bmw_g20.glb koymayı unutma)
    document.getElementById('gar-model-viewer').src = carData.model;

    document.getElementById('gar-spec-hp').innerText = carData.hp;
    document.getElementById('gar-spec-tork').innerText = carData.tork;
    document.getElementById('gar-spec-gear').innerText = carData.gear;
    document.getElementById('gar-spec-0100').innerText = carData.accel;
    document.getElementById('gar-spec-fuel').innerText = carData.fuel;

    document.getElementById('gar-img-1').src = carData.img1;
    document.getElementById('gar-img-2').src = carData.img2;
    document.getElementById('gar-img-3').src = carData.img3;
    document.getElementById('gar-img-4').src = carData.img4;

    // Yeni araca geçince finans panelini de onun verileriyle yenile
    renderGarageFinance();

    if (navigator.vibrate) navigator.vibrate(20);
};

window.openSahibinden = function() {
    const link = garageCarsData[activeGarageCar].shb;
    window.open(link, '_blank');
};

const originalEnterAppFromHubForGarage = window.enterAppFromHub;
window.enterAppFromHub = function(targetId, textString) {
    if(targetId === 'garage-screen') {
        const hub = document.getElementById('hub-screen');
        if(hub) {
            hub.classList.add('hidden');
            hub.style.display = 'none';
        }

        const introOverlay = document.getElementById('garage-intro-overlay');
        const headlight = document.getElementById('bmw-headlight-img');
        const glare = document.getElementById('headlight-glare');
        const flash = document.getElementById('garage-flash');

        introOverlay.classList.remove('hidden');
        introOverlay.style.display = 'flex';
        introOverlay.style.opacity = '1';

        headlight.style.transition = 'none';
        headlight.style.opacity = '0';
        headlight.style.transform = 'scale(1.1)'; 
        headlight.style.filter = 'brightness(0.3)'; 
        
        glare.style.transition = 'none';
        glare.style.transform = 'translate(-50%, -50%) scale(0)';
        glare.style.opacity = '0';

        flash.style.transition = 'none';
        flash.style.transform = 'translate(-50%, -50%) scale(0)';
        flash.style.opacity = '0';

        void introOverlay.offsetWidth;

        if (navigator.vibrate) navigator.vibrate([20, 30]);

        setTimeout(() => {
            headlight.style.transition = 'opacity 1.5s ease-out, transform 1.5s ease-out, filter 1.5s ease-in';
            headlight.style.opacity = '1';
            headlight.style.transform = 'scale(1)';
        }, 50);

        setTimeout(() => {
            glare.style.transition = 'transform 0.1s ease-out, opacity 0.1s ease-out';
            glare.style.transform = 'translate(-50%, -50%) scale(3)';
            glare.style.opacity = '1';
            if (navigator.vibrate) navigator.vibrate(30);
        }, 1100);

        setTimeout(() => {
            glare.style.transform = 'translate(-50%, -50%) scale(0)';
            glare.style.opacity = '0';
        }, 1200);

        setTimeout(() => {
            glare.style.transform = 'translate(-50%, -50%) scale(3)';
            glare.style.opacity = '1';
            if (navigator.vibrate) navigator.vibrate(30);
        }, 1350);

        setTimeout(() => {
            glare.style.transform = 'translate(-50%, -50%) scale(0)';
            glare.style.opacity = '0';
        }, 1450);

        setTimeout(() => {
            headlight.style.filter = 'brightness(2.5)';
            glare.style.transition = 'transform 0.3s ease-in, opacity 0.2s ease-out';
            glare.style.transform = 'translate(-50%, -50%) scale(15)';
            glare.style.opacity = '1';
            
            flash.style.transition = 'transform 0.4s ease-in, opacity 0.2s ease-out';
            flash.style.opacity = '1';
            flash.style.transform = 'translate(-50%, -50%) scale(150)';
            
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }, 1700);

        setTimeout(() => {
            document.getElementById('garage-screen').classList.remove('hidden');
            document.getElementById('garage-screen').style.display = 'block';
            
            // Ekran açılırken Megane'ı tetikle ki renkler, paralar kendine gelsin
            switchGarageCar('megane');

            introOverlay.style.transition = 'opacity 0.8s ease';
            introOverlay.style.opacity = '0';

            setTimeout(() => {
                introOverlay.classList.add('hidden');
                introOverlay.style.display = 'none';
            }, 800);
        }, 2200);

    } else {
        originalEnterAppFromHubForGarage(targetId, textString);
    }
};

window.closeGarageScreen = function () {
    returnToHub();
};

// Finans Fonksiyonları (Araçların ID'sine göre ayrı hafıza tutar!)
window.renderGarageFinance = function() {
    let car = garageCarsData[activeGarageCar];
    
    let price = parseFloat(localStorage.getItem(`gar_price_${car.id}`)) || car.defPrice;
    let downPayment = parseFloat(localStorage.getItem(`gar_down_${car.id}`)) || 0;
    let paidInstallments = parseFloat(localStorage.getItem(`gar_paid_${car.id}`)) || 0;
    let monthly = parseFloat(localStorage.getItem(`gar_month_${car.id}`)) || car.defMonthly;

    let totalPaid = downPayment + paidInstallments;
    let pct = (totalPaid / price) * 100;
    if(pct > 100) pct = 100;

    let remainingAmount = price - totalPaid;
    let remainingMonths = remainingAmount > 0 && monthly > 0 ? Math.ceil(remainingAmount / monthly) : 0;

    document.getElementById('gar-price').innerText = "₺" + price.toLocaleString('tr-TR');
    document.getElementById('gar-paid').innerText = "₺" + totalPaid.toLocaleString('tr-TR');
    document.getElementById('gar-month-amount').innerText = "₺" + monthly.toLocaleString('tr-TR');
    document.getElementById('gar-rem-month').innerText = `Kalan: ${remainingMonths} Ay`;
    
    setTimeout(() => {
        const barEl = document.getElementById('gar-bar');
        if(barEl) barEl.style.width = (isNaN(pct) ? 0 : pct) + "%";
        
        const pctEl = document.getElementById('gar-pct');
        if(pctEl) pctEl.innerText = "%" + (isNaN(pct) ? 0 : pct).toFixed(1) + " Tamamlandı";
    }, 100);
};

window.editEminevimSettings = function() {
    let car = garageCarsData[activeGarageCar];

    document.getElementById('emi-price').value = localStorage.getItem(`gar_price_${car.id}`) || car.defPrice;
    document.getElementById('emi-downpayment').value = localStorage.getItem(`gar_down_${car.id}`) || 0;
    document.getElementById('emi-paid-installments').value = localStorage.getItem(`gar_paid_${car.id}`) || 0;
    document.getElementById('emi-monthly').value = localStorage.getItem(`gar_month_${car.id}`) || car.defMonthly;

    document.getElementById('eminevim-settings-modal').style.display = 'flex';
    if(navigator.vibrate) navigator.vibrate(20);
};

window.saveEminevimSettings = function() {
    let car = garageCarsData[activeGarageCar];

    let newPrice = parseFloat(document.getElementById('emi-price').value) || 0;
    let newDown = parseFloat(document.getElementById('emi-downpayment').value) || 0;
    let newPaidInst = parseFloat(document.getElementById('emi-paid-installments').value) || 0;
    let newMonthly = parseFloat(document.getElementById('emi-monthly').value) || 0;

    localStorage.setItem(`gar_price_${car.id}`, newPrice);
    localStorage.setItem(`gar_down_${car.id}`, newDown);
    localStorage.setItem(`gar_paid_${car.id}`, newPaidInst);
    localStorage.setItem(`gar_month_${car.id}`, newMonthly);

    document.getElementById('eminevim-settings-modal').style.display = 'none';
    
    renderGarageFinance();
    if(navigator.vibrate) navigator.vibrate([30, 50]);
};

window.payEminevimInstallment = function() {
    let car = garageCarsData[activeGarageCar];

    let price = parseFloat(localStorage.getItem(`gar_price_${car.id}`)) || car.defPrice;
    let downPayment = parseFloat(localStorage.getItem(`gar_down_${car.id}`)) || 0;
    let paidInstallments = parseFloat(localStorage.getItem(`gar_paid_${car.id}`)) || 0;
    let monthly = parseFloat(localStorage.getItem(`gar_month_${car.id}`)) || car.defMonthly;

    let totalPaid = downPayment + paidInstallments;

    if(totalPaid >= price) {
        alert("Hedefe ulaşıldı! Araç parası tamamlandı. 🚗💨");
        return;
    }

    if(confirm(`Bu ayki ₺${monthly.toLocaleString('tr-TR')} taksiti ödediğinizi onaylıyor musunuz?`)) {
        let newPaidInst = paidInstallments + monthly;
        
        if((downPayment + newPaidInst) > price) {
            newPaidInst = price - downPayment;
        }
        
        localStorage.setItem(`gar_paid_${car.id}`, newPaidInst);
        renderGarageFinance();
        
        if(navigator.vibrate) navigator.vibrate([30, 50, 30]);
        if(typeof confetti === 'function') confetti({ particleCount: 150, spread: 80, origin: { y: 0.8 }, colors: [car.themeColor, '#ffffff'] });
    }
};
// ==========================================
// 🔎 SAHİBİNDEN AKILLI FİLTRE YÖNLENDİRİCİSİ
// ==========================================
window.openSahibindenMegane = function() {
    if(navigator.vibrate) navigator.vibrate(20);
    
    // Doğrudan Megane 4 (2020 ve üstü) filtreli arama sayfasına atar
    const sahibindenUrl = "https://www.sahibinden.com/renault-megane?a5_min=2020";
    window.open(sahibindenUrl, '_blank');
};
// ==========================================
