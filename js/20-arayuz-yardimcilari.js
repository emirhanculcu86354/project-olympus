// Alt menü gizleme köprüsü, hub sayfa noktaları
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

// 🍎 LİSTE AÇILINCA ÜST ALANI VE ALT BARI GİZLEME KÖPRÜSÜ
// ==========================================
window.toggleBottomNav = function (hide) {
    const bottomNav = document.querySelector('.bottom-nav');
    // Sayfanın en üstündeki ana header ve o görselde görünen başlık alanı
    const mainHeader = document.getElementById('main-header');
    const fabContainer = document.querySelector('.fab-container');

    if (bottomNav) {
        if (hide) bottomNav.classList.add('hidden-nav');
        else bottomNav.classList.remove('hidden-nav');
    }

    if (mainHeader) {
        if (hide) {
            mainHeader.style.transform = 'translateY(-120%)';
            mainHeader.style.opacity = '0';
            mainHeader.style.pointerEvents = 'none';
            mainHeader.style.transition = 'transform 0.35s ease, opacity 0.3s ease';
        } else {
            mainHeader.style.transform = 'translateY(0)';
            mainHeader.style.opacity = '1';
            mainHeader.style.pointerEvents = 'auto';
        }
    }

    if (fabContainer) {
        fabContainer.style.transform = hide ? 'translateY(120px)' : 'translateY(0)';
        fabContainer.style.opacity = hide ? '0' : '1';
    }
};

// İdman detay listesi (modal) açıldığında tetiklenir
const originalShowWorkoutModal = window.showWorkoutModal;
if (typeof showWorkoutModal === 'function') {
    window.showWorkoutModal = function (dayData) {
        originalShowWorkoutModal(dayData);
        toggleBottomNav(true); // Üst kısım ve alt bar gizlenir
    };
}

// Kapat butonuna basıldığında her şey geri gelir
document.addEventListener('DOMContentLoaded', () => {
    const closeWorkoutBtn = document.querySelector('.close-modal-btn');
    if (closeWorkoutBtn) {
        closeWorkoutBtn.addEventListener('click', () => {
            toggleBottomNav(false); // Üst kısım ve alt bar geri gelir
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const hubSlider = document.getElementById('hub-pages-slider');
    if (hubSlider) {
        hubSlider.addEventListener('scroll', () => {
            let pageIndex = Math.round(hubSlider.scrollLeft / hubSlider.clientWidth);
            document.querySelectorAll('.hub-dot').forEach((dot, index) => {
                dot.classList.toggle('active', index === pageIndex);
            });
        }, { passive: true });
    }
});
// ==========================================
