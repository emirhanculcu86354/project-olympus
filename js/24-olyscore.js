// OlyScore: Galatasaray canlı merkezi
// (script.js'ten bölündü; dosyalar olympus.html'deki sırayla yüklenir ve ortak global kapsamı paylaşır)

/// ==========================================
// 🦁 OLYSCORE: SOFASCORE GERÇEK ZAMANLI VERİ & PUAN DURUMU MOTORU
// ==========================================

const OLYSCORE_API_KEY = "b74d702108mshf7146018499d41fp1ffc70jsnfbae0f23777e"; // Sofascore API Şifren
const GS_TEAM_ID = "3061"; // Galatasaray'ın Sofascore ID'si

// --- SÜPER LİG MANUEL LOGO SÖZLÜĞÜ ---
// Ekranda takımın adı nasıl yazıyorsa, buraya BÜYÜK HARFLERLE adını ve karşısına linkini yapıştır.
const customTeamLogos = {
    "GALATASARAY": "https://assets.football-logos.cc/logos/turkey/512x512/galatasaray.beadfca5.png",
    "FENERBAHÇE": "https://assets.football-logos.cc/logos/turkey/512x512/fenerbahce.145fa73f.png",
    "BEŞIKTAŞ JK": "https://assets.football-logos.cc/logos/turkey/512x512/besiktas.0ec1a299.png",
    "TRABZONSPOR": "https://assets.football-logos.cc/logos/turkey/512x512/trabzonspor.32812ba8.png",
    "BAŞAKŞEHIR FK": "https://assets.football-logos.cc/logos/turkey/512x512/basaksehir.49a7c330.png",
    "KASIMPAŞA": "https://assets.football-logos.cc/logos/turkey/512x512/kasimpasa.af12d95a.png", // Örnek olarak ekledim, linki değiştirebilirsin
    "GÖZTEPE": "https://assets.football-logos.cc/logos/turkey/512x512/goztepe-izmir.d56025de.png",
    "KOCAELISPOR": "https://assets.football-logos.cc/logos/turkey/512x512/kocaelispor.67438278.png",
    "GENÇLERBIRLIĞI": "https://assets.football-logos.cc/logos/turkey/512x512/genclerbirligi.5f34f7a5.png",
    "SAMSUNSPOR": "https://assets.football-logos.cc/logos/turkey/512x512/samsunspor.d9c02d9f.png",
    "ALANYASPOR": "https://assets.football-logos.cc/logos/turkey/512x512/alanyaspor.c7dab604.png",
    "GAZIANTEP FK": "https://assets.football-logos.cc/logos/turkey/512x512/gaziantep.46eb63e9.png",
    "ÇAYKUR RIZESPOR": "https://assets.football-logos.cc/logos/turkey/512x512/rizespor.91844f4d.png",
    "ÇORUM FK": "https://assets.football-logos.cc/logos/turkey/512x512/corum.48e6a97a.png",
    "EYÜPSPOR": "https://assets.football-logos.cc/logos/turkey/512x512/eyupspor.a6f59ece.png",
    "KONYASPOR": "https://assets.football-logos.cc/logos/turkey/512x512/konyaspor.7fb1c091.png",
    "ERZURUMSPOR FK": "https://assets.football-logos.cc/logos/turkey/512x512/erzurumspor.1de456f6.png"
    
};

// --- GÜVENLİ LOGO JENERATÖRÜ (Manuel Liste Destekli) ---
function getSafeLogo(teamId, teamName) {
    // Gelen ismi BÜYÜK harfe çevirip sağındaki solundaki boşlukları temizliyoruz
    const nameUpper = teamName.toUpperCase().trim(); 

    // 1. Önce bizim manuel "customTeamLogos" sözlüğümüze bak
    if (customTeamLogos[nameUpper]) {
        return customTeamLogos[nameUpper]; // Eğer varsa bizim koyduğumuz linki ver
    }
    
    // 2. Eğer bizim listede yoksa harfli logoyu yapıştır
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=random&color=fff&bold=true&rounded=true`;
}

// --- SAYFA GEÇİŞ MOTORU ---
window.switchOlyNav = function(pageId, btnElement) {
    document.querySelectorAll('.oly-nav-item').forEach(b => {
        b.classList.remove('active');
        b.style.transform = 'translateY(0)';
    });
    
    if (btnElement) {
        btnElement.classList.add('active');
        btnElement.style.transform = 'translateY(-3px)';
    }
    
    document.querySelectorAll('.oly-page-content').forEach(page => {
        page.style.display = 'none';
        page.classList.add('hidden');
    });
    
    const targetPage = document.getElementById('oly-page-' + pageId);
    if (targetPage) {
        targetPage.style.display = 'flex';
        targetPage.classList.remove('hidden');
    }

    const headerTitle = document.getElementById('oly-header-title');
    if(pageId === 'home') headerTitle.innerText = "Ana Sayfa";
    else if(pageId === 'stats') headerTitle.innerText = "İstatistik & Puan Durumu";
    else if(pageId === 'news') headerTitle.innerText = "Takım Haberleri";
    else if(pageId === 'lineup') headerTitle.innerText = "Kadro & Diziliş";
    
    if (navigator.vibrate) navigator.vibrate(20);
};

window.switchOlyTab = function(tabName, btnElement) {
    document.querySelectorAll('.oly-tab').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    if (navigator.vibrate) navigator.vibrate(15);
};
// --- AÇMA VE VERİ ÇEKME MOTORU (YENİ SİSTEM) ---
window.openOlyScore = function() {
    const hub = document.getElementById('hub-screen');
    if (hub) { hub.classList.add('hidden'); hub.style.display = 'none'; }
    
    const olyScreen = document.getElementById('olyscore-screen');
    olyScreen.classList.remove('hidden');
    olyScreen.style.display = 'flex';
    
    // 1. Splash Ekranını (Animasyonu) Aç
    const splash = document.getElementById('olyscore-splash');
    splash.style.opacity = '1';
    splash.style.pointerEvents = 'auto';

    // 2. Ana Sayfaya (Home) ayarla
    const firstNavBtn = document.querySelector('.oly-bottom-nav .oly-nav-item');
    switchOlyNav('home', firstNavBtn);

    // 3. Verileri çekmeye başla
    fetchGalatasarayData(); 
    
    if (navigator.vibrate) navigator.vibrate(30);
};

window.closeOlyScore = function() {
    document.getElementById('olyscore-screen').classList.add('hidden');
    document.getElementById('olyscore-screen').style.display = 'none';
    if (typeof returnToHub === 'function') returnToHub();
};

// --- SOFASCORE API BAĞLANTISI (AKILLI GECİKMELİ) ---
async function fetchGalatasarayData() {
    const listContainer = document.getElementById('oly-match-list-container');
    const standingsContainer = document.getElementById('oly-standings-table');
    
    listContainer.innerHTML = '<p style="color:var(--goldnova); text-align:center; font-size:12px;">Maçlar çekiliyor (1/3)...</p>';
    standingsContainer.innerHTML = '<p style="color:var(--goldnova); text-align:center; font-size:12px;">Sistem bekleniyor...</p>';

    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': OLYSCORE_API_KEY,
            'x-rapidapi-host': 'sofascore.p.rapidapi.com'
        }
    };

    let allEvents = [];
    let tournamentId = 52; // Varsayılan Süper Lig ID
    let seasonId = 61764; // Varsayılan Sezon

    try {
        // 1. İSTEK: GELECEK MAÇLAR
        const nextRes = await fetch(`https://sofascore.p.rapidapi.com/teams/get-next-matches?teamId=${GS_TEAM_ID}`, options);
        const nextData = await nextRes.json();
        
        if (nextData && nextData.events) {
            allEvents = allEvents.concat(nextData.events);
            // Puan durumu için ligin evrensel ID'sini güncel maçtan çalıyoruz (Ekstra API isteği atmamak için!)
            if(nextData.events[0]) {
                tournamentId = nextData.events[0].tournament.uniqueTournament.id;
                seasonId = nextData.events[0].season.id;
            }
        }

        // 🛑 MUCİZE KORUMA: Saniyede 1 istek kuralını ihlal etmemek için 1.5 saniye mola ver!
        listContainer.innerHTML = '<p style="color:var(--goldnova); text-align:center; font-size:12px;">Geçmiş maçlar çekiliyor (2/3)...</p>';
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 2. İSTEK: GEÇMİŞ MAÇLAR
        const lastRes = await fetch(`https://sofascore.p.rapidapi.com/teams/get-last-matches?teamId=${GS_TEAM_ID}`, options);
        const lastData = await lastRes.json();
        
        if (lastData && lastData.events) allEvents = allEvents.concat(lastData.events);

        if(allEvents.length > 0) {
            processAndRenderOlyMatches(allEvents);
        } else {
            listContainer.innerHTML = '<p style="color:#888; text-align:center;">Maç verisi bulunamadı.</p>';
        }

        // 🛑 YİNE MOLA: Puan durumunu çekmeden önce 1.5 saniye bekle
        standingsContainer.innerHTML = '<p style="color:var(--goldnova); text-align:center; font-size:12px;">Canlı Puan Durumu Çekiliyor (3/3)...</p>';
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 3. İSTEK: SÜPER LİG CANLI PUAN DURUMU
        const stRes = await fetch(`https://sofascore.p.rapidapi.com/tournaments/get-standings?tournamentId=${tournamentId}&seasonId=${seasonId}&type=total`, options);
        const stData = await stRes.json();

        if (stData && stData.standings && stData.standings[0]) {
            renderStandings(stData.standings[0].rows);
        } else {
            standingsContainer.innerHTML = '<p style="color:#ff4444; text-align:center;">Puan durumu verisi alınamadı.</p>';
        }

    } catch (err) {
        console.error("Sofascore Ağ Hatası:", err);
        listContainer.innerHTML = '<p style="color:#ff4444; text-align:center;">API Kotası doldu veya ağ hatası oluştu.</p>';
        standingsContainer.innerHTML = '<p style="color:#ff4444; text-align:center;">API Kotası doldu.</p>';
    }
}

// Çekilen Maç Verisini OlyScore Arayüzüne Giydirme Fonksiyonu
function processAndRenderOlyMatches(allMatches) {
    const listContainer = document.getElementById('oly-match-list-container');
    listContainer.innerHTML = '';
    
    const nowSec = Math.floor(Date.now() / 1000);

    let pastMatches = allMatches.filter(m => m.startTimestamp <= nowSec);
    let upcomingMatches = allMatches.filter(m => m.startTimestamp > nowSec);

    upcomingMatches.sort((a, b) => a.startTimestamp - b.startTimestamp);
    pastMatches.sort((a, b) => b.startTimestamp - a.startTimestamp);

    let displayMatches = [];
    displayMatches.push(...upcomingMatches.slice(0, 3).reverse()); 
    displayMatches.push(...pastMatches.slice(0, 7)); 
    displayMatches.sort((a, b) => b.startTimestamp - a.startTimestamp);

    const heroMatch = upcomingMatches.length > 0 ? upcomingMatches[0] : pastMatches[0];

    if(heroMatch) {
        document.getElementById('oly-hero-league').innerText = heroMatch.tournament.name;
        
        document.getElementById('oly-hero-home-img').src = getSafeLogo(heroMatch.homeTeam.id, heroMatch.homeTeam.name);
        document.getElementById('oly-hero-away-img').src = getSafeLogo(heroMatch.awayTeam.id, heroMatch.awayTeam.name);
        
        const mDate = new Date(heroMatch.startTimestamp * 1000);
        document.getElementById('oly-hero-date').innerText = mDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        document.getElementById('oly-hero-time').innerHTML = `${mDate.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})} <span style="font-size: 9px; font-weight: normal; color: rgba(255,255,255,0.5);">LOKAL</span>`;
    }

    displayMatches.forEach(m => {
        const isLive = m.status.type === 'inprogress';
        const mDate = new Date(m.startTimestamp * 1000);
        
        const homeScore = m.homeScore && m.homeScore.display !== undefined ? m.homeScore.display : '-';
        const awayScore = m.awayScore && m.awayScore.display !== undefined ? m.awayScore.display : '-';

        listContainer.innerHTML += `
            <div class="oly-match-item">
                <div class="oly-team-row">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${getSafeLogo(m.homeTeam.id, m.homeTeam.name)}" style="width:22px; height:22px; object-fit:contain; border-radius:50%;">
                        <span style="color: #fff; font-size: 15px; font-weight: 900;">${m.homeTeam.name.toUpperCase()}</span>
                    </div>
                    <span style="color: #fff; font-size: 18px; font-weight: 900;">${homeScore}</span>
                </div>
                
                <div class="oly-team-row" style="margin-top: 15px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${getSafeLogo(m.awayTeam.id, m.awayTeam.name)}" style="width:22px; height:22px; object-fit:contain; border-radius:50%;">
                        <span style="color: #888; font-size: 15px; font-weight: 900;">${m.awayTeam.name.toUpperCase()}</span>
                    </div>
                    <span style="color: #888; font-size: 18px; font-weight: 900;">${awayScore}</span>
                </div>
                
                <div class="oly-match-footer">
                    <span style="color: #888;">${mDate.toLocaleDateString('tr-TR')}</span>
                    <span style="color: #555;">|</span>
                    <span style="color: #888;">${m.status.description}</span>
                    <span style="color: #555;">|</span>
                    <span style="color: ${isLive ? '#ff4444' : '#888'}; font-weight: bold; display: flex; align-items: center; gap: 6px;">
                        ${isLive ? '<span class="live-dot"></span> Canlı' : m.tournament.name}
                    </span>
                </div>
            </div>
        `;
    });
}

// Çekilen Puan Durumu Verisini OlyScore Arayüzüne Giydirme Fonksiyonu
function renderStandings(rows) {
    const tableContainer = document.getElementById('oly-standings-table');
    
    let html = `
        <table style="width: 100%; border-collapse: collapse; color: #fff; text-align: left;">
            <thead>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: #888; font-size: 10px;">
                    <th style="padding: 10px 4px;">#</th>
                    <th style="padding: 10px 4px;">TAKIM</th>
                    <th style="padding: 10px 4px; text-align: center;">O</th>
                    <th style="padding: 10px 4px; text-align: center;">G</th>
                    <th style="padding: 10px 4px; text-align: center;">B</th>
                    <th style="padding: 10px 4px; text-align: center;">M</th>
                    <th style="padding: 10px 4px; text-align: center; color: var(--goldnova);">P</th>
                </tr>
            </thead>
            <tbody>
    `;

    rows.forEach(row => {
        const t = row.team;
        const isGS = t.id.toString() === "3061";
        
        const rowStyle = isGS ? 'background: rgba(246, 192, 0, 0.1); border-left: 3px solid var(--goldnova);' : 'border-bottom: 1px solid rgba(255,255,255,0.05);';
        const nameColor = isGS ? 'var(--goldnova)' : '#fff';
        const rankColor = row.position <= 4 ? '#27ae60' : (row.position >= 16 ? '#ff4444' : '#888'); 
        
        const logoUrl = getSafeLogo(t.id, t.name);

        // Tabloyu daralttık (AV sütununu silip G, B, M koyduk)
        html += `
            <tr style="${rowStyle}">
                <td style="padding: 12px 4px; font-weight: bold; color: ${rankColor};">${row.position}</td>
                <td style="padding: 12px 4px; display: flex; align-items: center; gap: 6px;">
                    <img src="${logoUrl}" style="width: 18px; height: 18px; object-fit: contain; border-radius:50%; background:#fff; padding:1px;">
                    <span class="standings-team-name" style="color: ${nameColor}; font-weight: bold;">${t.name}</span>
                </td>
                <td style="padding: 12px 4px; text-align: center; color: #aaa;">${row.matches}</td>
                <td style="padding: 12px 4px; text-align: center; color: #aaa;">${row.wins}</td>
                <td style="padding: 12px 4px; text-align: center; color: #aaa;">${row.draws}</td>
                <td style="padding: 12px 4px; text-align: center; color: #aaa;">${row.losses}</td>
                <td style="padding: 12px 4px; text-align: center; font-weight: 900; font-size: 14px; color: ${isGS ? 'var(--goldnova)' : '#fff'};">${row.points}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    tableContainer.innerHTML = html;

    // 🛑 MUCİZE DOKUNUŞ: Veriler çekilip tablo basıldıktan sonra Splash Ekranını (Animasyonu) gizle!
    const splash = document.getElementById('olyscore-splash');
    if(splash) {
        splash.style.opacity = '0';
        setTimeout(() => { splash.style.pointerEvents = 'none'; }, 500); // Tıklamaları alta geçir
    }
}
// ==========================================
