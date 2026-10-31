// Olympus Akademi — TSK / Jandarma / Polis sınav ve mülakat hazırlık merkezi (Training içinde "academy" sekmesi)
// Veriler: oly2_academy. Eski POMEM/JASEM verileri (olympus_sec_data_*) ilk açılışta içe aktarılır.
// Fiziki test eşikleri dönemden döneme değişir: varsayılanlar son ilanlara dayalı tahmindir, kullanıcı "Normlar"dan düzenler.
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);
    const KEY = 'oly2_academy';

    // ==========================================
    // 🏛️ BRANŞLAR & HEDEFLER
    // ==========================================
    const BRANCHES = {
        tsk: {
            name: 'TSK', full: 'Türk Silahlı Kuvvetleri', color: '#9cc46b', classic: 'jandarma',
            site: 'https://personeltemin.msb.gov.tr', siteLabel: 'MSB Personel Temin',
            tracks: [
                { id: 'msu', name: 'MSÜ', sub: 'Harp okulu · Astsubay MYO', test: 'fyt' },
                { id: 'uzman', name: 'Uzman Erbaş', sub: 'MSB dönem alımı', test: 'fyt' },
                { id: 'sozlesmeli', name: 'Sözleşmeli Er', sub: 'MSB dönem alımı', test: 'fyt' },
                { id: 'subay', name: 'Subay (lisans)', sub: 'Muvazzaf / sözleşmeli', test: 'fyt' }
            ]
        },
        jandarma: {
            name: 'Jandarma', full: 'Jandarma Genel Komutanlığı', color: '#4fc3a1', classic: 'jandarma',
            site: 'https://www.jsga.edu.tr', siteLabel: 'JSGA duyuruları',
            tracks: [
                { id: 'jamyo', name: 'JAMYO', sub: 'Astsubay', test: 'parkur' },
                { id: 'jsga', name: 'JSGA', sub: 'Subay / lisans', test: 'parkur' },
                { id: 'juzman', name: 'Uzman Erbaş', sub: 'Jandarma', test: 'fyt' }
            ]
        },
        polis: {
            name: 'Polis', full: 'Emniyet Genel Müdürlüğü', color: '#6b9cf5', classic: 'polis',
            site: 'https://www.pa.edu.tr', siteLabel: 'Polis Akademisi',
            tracks: [
                { id: 'pomem', name: 'POMEM', sub: 'Polis meslek eğitimi', test: 'parkur' },
                { id: 'pmyo', name: 'PMYO', sub: 'Lise mezunu', test: 'parkur' },
                { id: 'paem', name: 'PAEM', sub: 'Komiser yardımcısı', test: 'parkur' }
            ]
        }
    };

    // better: 'low' süre (sn) · 'high' tekrar. pass = baraj (≈60 puan), target = tam puana yakın
    const EVENTS = {
        fyt: [
            { id: 'situp', name: 'Mekik', note: '1 dakika', unit: 'tekrar', better: 'high', pass: { m: 20, f: 12 }, target: { m: 50, f: 40 } },
            { id: 'pushup', name: 'Şınav', note: '1 dakika', unit: 'tekrar', better: 'high', pass: { m: 15, f: 6 }, target: { m: 45, f: 28 } },
            { id: 'run400', name: '400 m koşu', note: 'Tek seferde', unit: 'sn', better: 'low', pass: { m: 130, f: 150 }, target: { m: 75, f: 90 } }
        ],
        parkur: [
            { id: 'parkur', name: 'Parkur', note: '7 istasyon · 70 m', unit: 'sn', better: 'low', pass: { m: 48, f: 53 }, target: { m: 40, f: 45 } },
            { id: 'pushup', name: 'Şınav', note: '1 dakika · destek', unit: 'tekrar', better: 'high', pass: { m: 20, f: 8 }, target: { m: 45, f: 28 } },
            { id: 'run400', name: '400 m koşu', note: 'Kondisyon · destek', unit: 'sn', better: 'low', pass: { m: 100, f: 120 }, target: { m: 70, f: 85 } }
        ]
    };

    const DOCS = {
        common: ['Nüfus cüzdanı', 'Diploma / mezuniyet belgesi', 'Sınav sonuç belgesi (KPSS / YKS / MSÜ)', 'Adli sicil kaydı (e-Devlet)', 'Vesikalık fotoğraflar', 'Başvuru formu çıktısı', 'Sınav giriş belgesi', 'Spor kıyafeti & ayakkabı (test günü)'],
        m: ['Askerlik durum belgesi'],
        polis: ['Sürücü belgesi (ilanda istenen sınıf)', 'Sağlık kurulu raporu (istendiğinde)'],
        jandarma: ['Sağlık kurulu raporu (istendiğinde)', 'Arşiv araştırma formu'],
        tsk: ['Sağlık kurulu raporu (istendiğinde)', 'Güvenlik soruşturması formu']
    };

    // ==========================================
    // 🎤 MÜLAKAT SORU BANKASI
    // ==========================================
    const Q = (cat, q, a) => ({ cat, q, a });
    const QBANK = {
        common: [
            Q('Kişisel', 'Kendinizi kısaca tanıtır mısınız?', '1-1,5 dakikada: ad, yaş, memleket, eğitim, spor geçmişi ve bu mesleğe neden yöneldiğin. Ezber değil, net ve dik duruşla; sonunda hedefini tek cümleyle söyle.'),
            Q('Kişisel', 'Neden bu mesleği seçtiniz?', 'Somut bir sebep anlat (aile, bir yaşanmışlık, devlete hizmet isteği). "Maaş" ya da "iş garantisi" öne çıkarılmaz; vatan, millet, hizmet ve disiplin vurgusu yap.'),
            Q('Kişisel', 'Sizi neden seçelim?', 'Fiziki hazırlığın, disiplinin, takım çalışması örneğin ve öğrenmeye açıklığın. Bir somut başarı örneği ver (spor, okul, iş).'),
            Q('Kişisel', 'Güçlü ve zayıf yönleriniz nelerdir?', 'Güçlü: mesleğe uygun 2 özellik + örnek. Zayıf: gerçek ama kritik olmayan bir yön ve onu geliştirmek için ne yaptığın.'),
            Q('Kişisel', 'Stresle nasıl başa çıkarsınız?', 'Spor, planlı çalışma, nefes ve sakin kalma. Baskı altında doğru karar verdiğin bir örnek anlat.'),
            Q('Kişisel', 'Ailenizden uzakta, zor şartlarda görev yapabilir misiniz?', 'Evet; tayin ve zorlu bölgeler mesleğin doğası. Bunu bilerek başvurduğunu ve hazır olduğunu sakin bir dille belirt.'),
            Q('Kişisel', 'Amiriniz suç teşkil eden bir emir verirse ne yaparsınız?', 'Anayasa md. 137: Konusu suç teşkil eden emir hiçbir surette yerine getirilmez; yerine getiren sorumluluktan kurtulamaz. Durumu saygı çerçevesinde hatırlatır, gerekirse üst makama bildiririm.'),
            Q('Kişisel', 'Takım arkadaşınız kural ihlali yaparsa ne yaparsınız?', 'Önce uyarırım; ihlal sürer ya da ciddi ise disiplin ve hukuk gereği amirime bildiririm. Arkadaşlık, görev ve hukukun önüne geçmez.'),
            Q('Kişisel', 'Boş zamanlarınızda ne yaparsınız?', 'Düzenli spor (koşu, ağırlık, parkur çalışması), kitap, gönüllülük. Mesleğe katkı sağlayan alışkanlıkları öne çıkar.'),
            Q('Kişisel', 'Son okuduğunuz kitap hangisi?', 'Gerçekten okuduğun bir kitabı söyle; yazarını ve sana kattığı bir fikri kısaca anlat. Takip sorusuna hazırlıklı ol.'),
            Q('Kişisel', 'Beş yıl sonra kendinizi nerede görüyorsunuz?', 'Mesleğinde tecrübe kazanmış, eğitimlerini tamamlamış, kurumuna değer katan biri olarak. Uzmanlaşmak istediğin bir alan söyleyebilirsin.'),
            Q('Kişisel', 'Hiç yalan söylediniz mi?', 'Dürüst ol: herkes hata yapabilir; önemli olan doğruluğu ilke edinmek. Mesleğin temeli güven ve dürüstlüktür.'),
            Q('Güncel', 'Türkiye\'nin güvenliğini tehdit eden başlıca unsurlar nelerdir?', 'Terör örgütleri (PKK/PYD, FETÖ, DEAŞ, DHKP-C), düzensiz göç, siber saldırılar, organize suç ve uyuşturucu, bölgesel çatışmalar.'),
            Q('Güncel', '15 Temmuz 2016\'da ne oldu?', 'FETÖ\'nün darbe girişimi; milletin ve güvenlik güçlerinin direnişiyle bastırıldı. 15 Temmuz "Demokrasi ve Milli Birlik Günü" olarak anılır.'),
            Q('Güncel', 'Kolluk kuvvetleri hangileridir?', 'Genel kolluk: Emniyet (polis), Jandarma ve Sahil Güvenlik. Özel kolluk: gümrük muhafaza, orman muhafaza, köy korucuları, özel güvenlik vb.')
        ],
        tsk: [
            Q('Kurum', 'TSK\'nın kuvvet komutanlıkları hangileridir?', 'Kara Kuvvetleri, Deniz Kuvvetleri ve Hava Kuvvetleri Komutanlığı. (Jandarma ve Sahil Güvenlik 2016\'dan beri İçişleri Bakanlığına bağlıdır.)'),
            Q('Kurum', 'Genelkurmay Başkanlığı hangi bakanlığa bağlıdır?', '2018\'den bu yana Milli Savunma Bakanlığına bağlıdır.'),
            Q('Kurum', 'Başkomutanlık kime aittir?', 'Anayasa md. 117: Başkomutanlık TBMM\'nin manevi varlığından ayrılamaz ve Cumhurbaşkanı tarafından temsil olunur.'),
            Q('Kurum', 'Türk Kara Kuvvetlerinin kuruluş yılı olarak kabul edilen tarih nedir?', 'MÖ 209 — Mete Han\'ın Büyük Hun Devleti\'nde düzenli orduyu kurması.'),
            Q('Kurum', 'Milli Savunma Üniversitesi ne zaman kuruldu, hangi okullar bağlıdır?', '2016\'da kuruldu. Kara, Deniz ve Hava Harp Okulları ile Astsubay Meslek Yüksekokulları ve enstitüler bağlıdır.'),
            Q('Kurum', 'Harp okulları nerededir?', 'Kara Harp Okulu Ankara, Deniz Harp Okulu İstanbul (Tuzla), Hava Harp Okulu İstanbul (Yeşilyurt).'),
            Q('Kurum', 'TSK İç Hizmet Kanunu kaç sayılıdır?', '211 sayılı Türk Silahlı Kuvvetleri İç Hizmet Kanunu (1961).'),
            Q('Kurum', 'Askeri Ceza Kanunu kaç sayılıdır?', '1632 sayılı Askeri Ceza Kanunu.'),
            Q('Rütbe', 'Subay rütbelerini sırayla sayınız.', 'Asteğmen, Teğmen, Üsteğmen, Yüzbaşı, Binbaşı, Yarbay, Albay, Tuğgeneral, Tümgeneral, Korgeneral, Orgeneral (Deniz\'de amiral rütbeleri: Tuğamiral, Tümamiral, Koramiral, Oramiral).'),
            Q('Rütbe', 'Astsubay rütbelerini sayınız.', 'Astsubay Çavuş, Astsubay Üstçavuş, Astsubay Kıdemli Üstçavuş, Astsubay Başçavuş, Astsubay Kıdemli Başçavuş.'),
            Q('Rütbe', 'Birlik büyüklüklerini küçükten büyüğe sıralayınız.', 'Manga, Takım, Bölük, Tabur, Alay, Tugay, Tümen, Kolordu, Ordu.'),
            Q('Tarih', '"Ordular! İlk hedefiniz Akdeniz\'dir. İleri!" emri ne zaman verildi?', 'Başkomutanlık Meydan Muharebesi\'nin ardından, 1 Eylül 1922\'de Mustafa Kemal Atatürk tarafından.'),
            Q('Tarih', '30 Ağustos neyi simgeler?', '1922 Başkomutanlık Meydan Muharebesi zaferini; 30 Ağustos Zafer Bayramı ve Türk Silahlı Kuvvetleri Günü olarak kutlanır.'),
            Q('Tarih', 'Türkiye NATO\'ya ne zaman üye oldu?', '18 Şubat 1952.'),
            Q('Tarih', 'Kıbrıs Barış Harekâtı ne zaman başladı?', '20 Temmuz 1974.'),
            Q('Güncel', 'TSK\'nın son yıllardaki sınır ötesi harekâtlarını sayınız.', 'Fırat Kalkanı (2016), Zeytin Dalı (2018), Barış Pınarı (2019), Bahar Kalkanı (2020) ve Kuzey Irak\'taki Pençe harekâtları.'),
            Q('Değer', 'Askerlik mesleğinin temel değerleri nelerdir?', 'Vatan sevgisi, disiplin, emir-komuta zinciri, fedakârlık, cesaret, dürüstlük ve silah arkadaşlığı.'),
            Q('Değer', '"Mehmetçik" kimdir?', 'Türk askerine verilen sevgi dolu addır; Çanakkale\'den bu yana kahramanlığın simgesidir.')
        ],
        jandarma: [
            Q('Kurum', 'Jandarma hangi bakanlığa bağlıdır?', 'İçişleri Bakanlığına bağlı, silahlı, genel kolluk kuvvetidir (2016\'dan beri; görev yönünden askeri karakteri sürer).'),
            Q('Kurum', 'Jandarmanın kuruluş tarihi nedir?', '14 Haziran 1839 — her yıl kuruluş yıldönümü olarak kutlanır.'),
            Q('Kurum', 'Jandarmanın teşkilat kanunu hangisidir?', '2803 sayılı Jandarma Teşkilat, Görev ve Yetkileri Kanunu (1983).'),
            Q('Kurum', 'Jandarmanın görevleri kaça ayrılır?', 'Mülki, adli, askeri ve diğer görevler.'),
            Q('Kurum', 'Jandarmanın sorumluluk alanı neresidir?', 'Polis görev alanı dışında kalan, genellikle il ve ilçe belediye sınırları dışındaki yerler; ayrıca cezaevlerinin dış güvenliği gibi görevler.'),
            Q('Kurum', 'JSGA ve JAMYO nedir?', 'JSGA: Jandarma ve Sahil Güvenlik Akademisi (2016). JAMYO: Jandarma Astsubay Meslek Yüksekokulu.'),
            Q('Kurum', 'JÖH ve JÖAK nedir?', 'JÖH: Jandarma Özel Harekât. JÖAK: Jandarma Özel Asayiş Komutanlığı — terörle mücadele ve özel asayiş görevlerinde kullanılır.'),
            Q('Kurum', 'JAK nedir?', 'Jandarma Arama Kurtarma — afet ve zor arazi şartlarında arama kurtarma birimi.'),
            Q('Kurum', 'Sahil Güvenlik Komutanlığı hangi bakanlığa bağlıdır?', 'İçişleri Bakanlığına.'),
            Q('Rütbe', 'Jandarmada kullanılan subay rütbelerini sayınız.', 'Asteğmen, Teğmen, Üsteğmen, Yüzbaşı, Binbaşı, Yarbay, Albay, Tuğgeneral, Tümgeneral, Korgeneral, Orgeneral.'),
            Q('Rütbe', 'Astsubay rütbelerini sayınız.', 'Astsubay Çavuş, Astsubay Üstçavuş, Astsubay Kıdemli Üstçavuş, Astsubay Başçavuş, Astsubay Kıdemli Başçavuş.'),
            Q('Mevzuat', 'Gözaltı süresi (bireysel suçlarda) ne kadardır?', 'Yakalama yerine en yakın hâkime gönderilme için gereken süre hariç 24 saat (CMK md. 91).'),
            Q('Mevzuat', 'Önleyici kolluk ile adli kolluk farkı nedir?', 'Önleyici kolluk suç işlenmeden önce kamu düzenini korur; adli kolluk suç işlendikten sonra savcılık emriyle delil toplar ve faili yakalar.'),
            Q('Güncel', '156 numara nedir?', 'Jandarma ihbar hattı; bugün 112 Acil Çağrı altında birleştirilmiştir.'),
            Q('Değer', 'Jandarma personelinde bulunması gereken özellikler nelerdir?', 'Disiplin, dürüstlük, halkla iyi ilişki, fiziki dayanıklılık, kırsalda zor şartlara uyum ve hukuka bağlılık.')
        ],
        polis: [
            Q('Kurum', 'Polis teşkilatının kuruluş tarihi nedir?', '10 Nisan 1845 — her yıl Türk Polis Teşkilatı\'nın kuruluş yıldönümü olarak kutlanır.'),
            Q('Kurum', 'Emniyet Teşkilatı Kanunu kaç sayılıdır?', '3201 sayılı Emniyet Teşkilatı Kanunu (1937).'),
            Q('Kurum', 'PVSK nedir?', '2559 sayılı Polis Vazife ve Salahiyet Kanunu (1934) — polisin görev ve yetkilerini düzenler.'),
            Q('Kurum', 'Polisin zor ve silah kullanma yetkisi hangi maddede düzenlenir?', 'PVSK md. 16 — kademeli zor kullanma: bedenî kuvvet, maddi güç ve son çare olarak silah.'),
            Q('Kurum', 'POMEM, PMYO ve PAEM nedir?', 'POMEM: Polis Meslek Eğitim Merkezi. PMYO: Polis Meslek Yüksekokulu. PAEM: Polis Amirleri Eğitim Merkezi. Hepsi Polis Akademisi\'ne bağlıdır.'),
            Q('Rütbe', 'Polis rütbelerini sırayla sayınız.', 'Polis Memuru, Komiser Yardımcısı, Komiser, Başkomiser, Emniyet Amiri, 4., 3., 2. ve 1. Sınıf Emniyet Müdürü, Sınıf Üstü Emniyet Müdürü.'),
            Q('Mevzuat', 'Gözaltı süresi (bireysel suçlarda) ne kadardır?', 'Yakalama yerine en yakın hâkime gönderilme için gereken süre hariç 24 saat (CMK md. 91).'),
            Q('Mevzuat', 'Önleyici kolluk ile adli kolluk farkı nedir?', 'Önleyici (idari) kolluk suç işlenmeden önce düzeni korur; adli kolluk suçtan sonra savcının emri ve gözetiminde soruşturma işlemlerini yürütür.'),
            Q('Mevzuat', 'Polisin genel görevleri nelerdir?', 'Asayişi, kamu düzenini, genel ahlakı korumak; kişilerin can, mal ve ırz güvenliğini sağlamak; suçları önlemek ve adli görevleri yürütmek (PVSK md. 1).'),
            Q('Güncel', 'KADES nedir?', 'Kadına Destek Uygulaması: şiddet tehlikesindeki kadınların tek tuşla kolluğa ihbar gönderebildiği mobil uygulama.'),
            Q('Güncel', 'PÖH nedir?', 'Polis Özel Harekât — terör, rehine ve yüksek riskli operasyonlarda görev yapan özel birim.'),
            Q('Güncel', '155 numara nedir?', 'Polis İmdat hattı; bugün 112 Acil Çağrı altında birleştirilmiştir.'),
            Q('Değer', 'Toplum destekli polislik nedir?', 'Polisin halkla iş birliği yaparak suçu önlemeye odaklandığı, güvene dayalı hizmet anlayışı.'),
            Q('Değer', 'Bir vatandaş size rüşvet teklif ederse ne yaparsınız?', 'Kesinlikle reddeder, durumu tutanakla amirime ve adli makamlara bildiririm. Rüşvet (TCK md. 252) teklif eden için de suçtur.'),
            Q('Değer', 'Polis etiği denince ne anlıyorsunuz?', 'Hukuka bağlılık, tarafsızlık, insan haklarına saygı, dürüstlük ve orantılı güç kullanımı.')
        ]
    };

    const TIPS = {
        tsk: ['Kısa ve net konuş; "Komutanım" hitabını unutma.', 'Selam ve izinle otur, dik dur, ellerini dizinde tut.', 'Bilmediğin soruda "Bilmiyorum komutanım, araştırıp öğreneceğim" de; uydurma.', 'Güncel askeri gelişmeleri (harekâtlar, savunma sanayii) takip et.'],
        jandarma: ['"Komutanım" hitabıyla, kısa ve net cevap ver.', 'Jandarmanın kırsal ve asayiş görevlerini iyi bil (2803 sayılı kanun).', 'Kılık-kıyafet: sade, ütülü, tıraşlı; göz teması kur.', 'Bilmediğin konuda dürüst ol; özgüvenini kaybetme.'],
        polis: ['Komisyona saygılı hitap et, göz teması kur, sakin konuş.', 'PVSK, 3201 ve CMK temel kavramlarını bil.', 'Güncel olaylara (KADES, terörle mücadele, siber suçlar) hâkim ol.', 'Kendini tanıtmayı 1 dakikada, net bir hikâyeyle prova et.']
    };

    const RANKS = {
        officer: ['Asteğmen', 'Teğmen', 'Üsteğmen', 'Yüzbaşı', 'Binbaşı', 'Yarbay', 'Albay', 'Tuğgeneral', 'Tümgeneral', 'Korgeneral', 'Orgeneral'],
        nco: ['Astsubay Çavuş', 'Astsubay Üstçavuş', 'Astsubay Kıdemli Üstçavuş', 'Astsubay Başçavuş', 'Astsubay Kıdemli Başçavuş'],
        unit: ['Manga', 'Takım', 'Bölük', 'Tabur', 'Alay', 'Tugay', 'Tümen', 'Kolordu', 'Ordu'],
        police: ['Polis Memuru', 'Komiser Yardımcısı', 'Komiser', 'Başkomiser', 'Emniyet Amiri', '4. Sınıf Emniyet Müdürü', '3. Sınıf Emniyet Müdürü', '2. Sınıf Emniyet Müdürü', '1. Sınıf Emniyet Müdürü', 'Sınıf Üstü Emniyet Müdürü']
    };

    // ==========================================
    // 💾 DURUM
    // ==========================================
    const defaults = () => ({ branch: 'polis', track: 'pomem', gender: 'm', dates: {}, tests: [], norms: {}, docs: {}, cards: {}, days: [], quiz: {} });
    function migrate() {
        if (localStorage.getItem(KEY)) return;
        const st = defaults();
        const mode = localStorage.getItem('olympus_active_sec_mode');
        if (mode === 'jandarma') { st.branch = 'jandarma'; st.track = 'jamyo'; }
        ['polis', 'jandarma'].forEach(m => {
            const d = LS.get(`olympus_sec_data_${m}`, null);
            if (!d) return;
            if (d.interviewDate && m === st.branch) st.dates.interview = d.interviewDate;
            const sec = parseTime(d.parkourTime);
            if (sec) st.tests.push({ id: 'legacy_' + m, d: O2.dayKey(), track: m === 'polis' ? 'pomem' : 'jamyo', res: { parkur: sec } });
        });
        LS.set(KEY, st);
    }
    const state = () => { migrate(); return { ...defaults(), ...LS.get(KEY, {}) }; };
    const save = (st) => LS.set(KEY, st);
    const markDay = (st) => { const d = O2.dayKey(); if (!st.days.includes(d)) st.days = [...st.days.slice(-90), d]; };
    const branchOf = (st) => BRANCHES[st.branch] || BRANCHES.polis;
    const trackOf = (st) => branchOf(st).tracks.find(t => t.id === st.track) || branchOf(st).tracks[0];
    const eventsOf = (st) => EVENTS[trackOf(st).test];

    // "1:25", "1.25.3", "85", "45,2" → saniye
    function parseTime(v) {
        if (v === null || v === undefined || v === '') return null;
        const s = String(v).trim().replace(',', '.');
        const m = s.match(/^(\d+):(\d+(?:\.\d+)?)$/);
        if (m) return +m[1] * 60 + parseFloat(m[2]);
        const n = parseFloat(s);
        return isNaN(n) ? null : n;
    }
    const fmtSec = (s) => s >= 60 ? `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}` : `${(+s).toFixed(1)} sn`;
    const fmtVal = (ev, v) => v === undefined || v === null ? '—' : ev.unit === 'sn' ? fmtSec(v) : `${v}`;

    const norm = (st, ev) => {
        const custom = st.norms[`${trackOf(st).test}_${ev.id}_${st.gender}`];
        return custom || { pass: ev.pass[st.gender], target: ev.target[st.gender] };
    };
    // 0-100: baraj ≈ 60, hedef = 100
    function score(ev, v, n) {
        if (v === null || v === undefined) return null;
        if (ev.better === 'low') {
            if (v <= n.target) return 100;
            if (v <= n.pass) return Math.round(60 + 40 * (n.pass - v) / Math.max(.1, n.pass - n.target));
            return Math.max(0, Math.round(60 - (v - n.pass) * 12));
        }
        if (v >= n.target) return 100;
        if (v >= n.pass) return Math.round(60 + 40 * (v - n.pass) / Math.max(1, n.target - n.pass));
        return Math.round(60 * v / Math.max(1, n.pass));
    }
    const latest = (st, evId) => {
        const t = [...st.tests].reverse().find(x => x.res && x.res[evId] !== undefined);
        return t ? { v: t.res[evId], d: t.d } : null;
    };
    const best = (st, ev) => {
        const vals = st.tests.map(t => t.res && t.res[ev.id]).filter(v => v !== undefined && v !== null);
        if (!vals.length) return null;
        return ev.better === 'low' ? Math.min(...vals) : Math.max(...vals);
    };

    // Soru kimliği (metinden kısa özet)
    const qid = (q) => { let h = 0; for (let i = 0; i < q.length; i++) h = (h * 31 + q.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
    function questions(st, includeGeneral = true) {
        const list = [...QBANK[st.branch], ...QBANK.common];
        if (includeGeneral && typeof interviewQuestions !== 'undefined') {
            const seen = new Set(list.map(x => x.q));
            interviewQuestions.forEach(x => { if (!seen.has(x.q)) { seen.add(x.q); list.push(Q('Genel kültür', x.q, x.a)); } });
        }
        return list.map(x => ({ ...x, id: qid(x.q) }));
    }
    const docList = (st) => [...DOCS.common, ...(st.gender === 'm' ? DOCS.m : []), ...(DOCS[st.branch] || [])];

    function prep(st) {
        const evs = eventsOf(st);
        const scores = evs.map(ev => { const l = latest(st, ev.id); return l ? score(ev, l.v, norm(st, ev)) : 0; });
        // Resmi test (ilk etkinlik) daha ağır basar
        const fitness = Math.round(evs.length ? (scores[0] * 2 + scores.slice(1).reduce((a, b) => a + b, 0)) / (evs.length + 1) : 0);
        const qs = questions(st, false);
        const known = qs.filter(q => st.cards[q.id] && st.cards[q.id].r === 1).length;
        const interview = Math.round(known / Math.max(1, qs.length) * 100);
        const docs = docList(st);
        const docDone = docs.filter((_, i) => (st.docs[st.track] || {})[i]).length;
        const docPct = Math.round(docDone / docs.length * 100);
        const since = O2.dayKey(O2.addDays(O2.startOfDay(), -13));
        const active = st.days.filter(d => d >= since).length;
        const consistency = Math.round(Math.min(1, active / 10) * 100);
        const total = Math.round(fitness * .4 + interview * .3 + docPct * .15 + consistency * .15);
        return { total, fitness, interview, docPct, consistency, known, qTotal: qs.length, docDone, docTotal: docs.length, active };
    }

    // Boy & VKİ: ilanlarda genelde VKİ 18-27 aralığı ve asgari boy aranır (tahmini, düzenlenebilir)
    const BODY_DEFAULT = { bmiMin: 18, bmiMax: 27, height: { m: 167, f: 160 } };
    const bodyNorm = (st) => ({ ...BODY_DEFAULT, ...(st.body || {}), height: { ...BODY_DEFAULT.height, ...((st.body || {}).height || {}) } });
    function bodyCheck(st) {
        const p = LS.get('olympus_profile', {}) || {};
        const h = parseFloat(p.height), w = parseFloat(p.w);
        const n = bodyNorm(st);
        if (!h || !w) return { ok: null, h, w, n };
        const m = h / 100, bmi = w / (m * m);
        const minW = n.bmiMin * m * m, maxW = n.bmiMax * m * m;
        const hOk = h >= n.height[st.gender];
        const bOk = bmi >= n.bmiMin && bmi <= n.bmiMax;
        return { ok: hOk && bOk, hOk, bOk, bmi, h, w, minW, maxW, n };
    }

    const daysLeft = (iso) => {
        if (!iso) return null;
        const d = O2.parseDate(iso);
        return d ? Math.round((O2.startOfDay(d) - O2.startOfDay()) / 864e5) : null;
    };

    // ==========================================
    // 🖥️ EKRAN
    // ==========================================
    O2.renderAcademy = () => {
        const st = state();
        const br = branchOf(st), tr = trackOf(st), evs = eventsOf(st);
        const p = prep(st);
        const c = br.color;
        const dates = [['written', 'Yazılı / başvuru'], ['fitness', 'Fiziki test'], ['interview', 'Mülakat']]
            .map(([k, label]) => ({ k, label, left: daysLeft(st.dates[k]) }));
        const next = dates.filter(d => d.left !== null && d.left >= 0).sort((a, b) => a.left - b.left)[0];
        const tips = TIPS[st.branch];
        const tip = tips[new Date().getDate() % tips.length];

        return `
        <div class="o2-stagger o2-acad" style="--acad:${c}">
            <button class="o2-link" style="display:inline-flex;align-items:center;gap:4px;margin:4px 0 10px" onclick="O2.go('today')">${I('back')}Training</button>
            <div class="o2-eyebrow" style="color:${c}">Olympus Akademi</div>
            <h1 class="o2-title">Hazırlık <em>merkezi</em></h1>

            <div class="o2-acad-branches">${Object.entries(BRANCHES).map(([id, b]) => `
                <button class="o2-acad-branch ${id === st.branch ? 'active' : ''}" style="--acad:${b.color}" onclick="O2.acadBranch('${id}')">
                    <i>${I('shield')}</i><b>${b.name}</b><small>${b.tracks.length} hedef</small>
                </button>`).join('')}</div>
            <div class="o2-chips" style="margin:12px 0 2px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px">${br.tracks.map(t => `
                <button class="o2-chip ${t.id === tr.id ? 'gold' : ''}" onclick="O2.acadTrack('${t.id}')">${esc(t.name)}</button>`).join('')}
                <button class="o2-chip" onclick="O2.acadGender()">${st.gender === 'm' ? 'Erkek' : 'Kadın'} ⇄</button>
            </div>

            <div class="o2-card o2-card-glow o2-readiness" style="margin-top:12px">
                ${O2.ring({ pct: p.total / 100, size: 132, stroke: 12, color: c, center: `<strong>${p.total}</strong><span>HAZIRLIK</span>` })}
                <div>
                    <div class="o2-eyebrow" style="color:${c}">● ${esc(br.name)} · ${esc(tr.name)}</div>
                    <h4>${next ? (next.left === 0 ? `${next.label} bugün!` : `${next.label}: ${next.left} gün`) : 'Tarihlerini ekle'}</h4>
                    <div class="o2-factors">
                        ${[['Fiziki', p.fitness, c], ['Mülakat', p.interview, 'var(--o2-violet)'], ['Belgeler', p.docPct, 'var(--o2-blue)'], ['İstikrar', p.consistency, 'var(--o2-green)']]
                            .map(([n, v, col]) => `<div class="o2-factor"><span>${n}</span><div class="o2-bar"><i data-w="${v}%" style="width:0;background:${col}"></i></div><b>${v}</b></div>`).join('')}
                    </div>
                </div>
            </div>

            <div class="o2-grid-3 o2-acad-dates" style="margin-top:12px">${dates.map(d => `
                <button class="o2-card is-tap" onclick="O2.acadDatesSheet()">
                    <small>${d.label}</small>
                    <strong>${d.left === null ? '—' : d.left < 0 ? 'Geçti' : d.left === 0 ? 'Bugün' : d.left}</strong>
                    <span>${d.left !== null && d.left > 0 ? 'gün kaldı' : st.dates[d.k] ? esc(O2.prettyDate(st.dates[d.k])) : 'Tarih ekle'}</span>
                </button>`).join('')}</div>

            <div class="o2-section-head"><h3>Fiziki yeterlilik</h3><button class="o2-link" onclick="O2.acadNormsSheet()">Normlar</button></div>
            <div class="o2-card" style="padding:6px 18px 16px">
                ${evs.map(ev => fitnessRow(st, ev)).join('')}
                <div class="o2-grid-2" style="margin-top:14px">
                    <button class="o2-btn o2-btn-gold" onclick="O2.acadTestSheet()">${I('plus')}Sonuç</button>
                    <button class="o2-btn o2-btn-ghost" onclick="O2.acadStopwatch('${evs[0].id}')">${I('clock')}${evs[0].unit === 'sn' ? 'Kronometre' : 'Sayaç'}</button>
                </div>
            </div>
            ${testChartHTML(st, evs)}
            ${testHistory(st, evs)}
            ${taperHTML(st)}

            <div class="o2-section-head"><h3>Boy & kilo</h3><button class="o2-link" onclick="O2.acadBodySheet()">Normlar</button></div>
            ${bodyHTML(st)}

            <div class="o2-card is-tap" style="margin-top:12px" onclick="O2.acadInstallProgram()">
                <div class="o2-coach">
                    <div class="o2-coach-orb" style="background:color-mix(in srgb, ${c} 18%, transparent);color:${c}">${I('run')}</div>
                    <div style="flex:1"><h4>${esc(br.name)} hazırlık programı</h4><p>${tr.test === 'parkur' ? 'Parkur, çeviklik, sprint ve kuvvet' : 'Şınav, mekik, 400 m ve kondisyon'} · haftada 5 gün. Training'de aktif et.</p></div>
                    ${I('chev', 'chev')}
                </div>
            </div>

            <div class="o2-section-head"><h3>Mülakat hazırlığı</h3><span class="o2-link" style="color:var(--o2-text-3)">${p.known}/${p.qTotal} biliniyor</span></div>
            <div class="o2-grid-2">
                <button class="o2-card is-tap o2-acad-tile" onclick="O2.acadPractice()"><i style="color:var(--o2-violet)">${I('chat')}</i><h4>Kartlarla çalış</h4><p>${esc(br.name)} + kişisel + genel kültür</p></button>
                <button class="o2-card is-tap o2-acad-tile" onclick="O2.acadPractice(true)"><i style="color:${c}">${I('bolt')}</i><h4>Mülakat provası</h4><p>5 soru · 60 sn süre · AI geri bildirim</p></button>
                <button class="o2-card is-tap o2-acad-tile" onclick="O2.acadQuiz()"><i style="color:var(--o2-gold)">${I('medal')}</i><h4>Rütbe & teşkilat testi</h4><p>${st.quiz[st.branch] ? `En iyi: ${st.quiz[st.branch]}/10` : '10 soruluk hızlı test'}</p></button>
                <button class="o2-card is-tap o2-acad-tile" onclick="O2.openAcademy('${br.classic}')"><i style="color:var(--o2-blue)">${I('camera')}</i><h4>Kameralı simülatör</h4><p>Ayna modu, sesli cevap, rapor</p></button>
            </div>
            <div class="o2-insight" style="margin-top:12px">${I('spark')}<span><b>Mülakat ipucu:</b> ${esc(tip)}</span></div>

            <div class="o2-section-head"><h3>Belge kontrol listesi</h3><span class="o2-link" style="color:var(--o2-text-3)">${p.docDone}/${p.docTotal}</span></div>
            <div class="o2-card" style="padding:4px 18px 10px"><div class="o2-list">${docList(st).map((d, i) => {
                const on = (st.docs[st.track] || {})[i];
                return `<div class="o2-row is-tap" onclick="O2.acadDoc(${i})">
                    <span class="o2-check ${on ? 'on' : ''}">${I('check')}</span>
                    <div class="o2-row-main"><h5 style="${on ? 'opacity:.45;text-decoration:line-through' : ''}">${esc(d)}</h5></div>
                </div>`;
            }).join('')}</div></div>

            <a class="o2-card is-tap" style="display:block;margin-top:12px;text-decoration:none;color:inherit" href="${br.site}" target="_blank" rel="noopener">
                <div class="o2-coach">
                    <div class="o2-coach-orb">${I('shield')}</div>
                    <div style="flex:1"><h4>Resmi ilanı kontrol et</h4><p>${esc(br.siteLabel)} · test eşikleri, boy-kilo ve belge şartları dönemden döneme değişir.</p></div>
                    ${I('chev', 'chev')}
                </div>
            </a>
        </div>`;
    };

    function fitnessRow(st, ev) {
        const n = norm(st, ev), l = latest(st, ev.id), b = best(st, ev);
        const sc = l ? score(ev, l.v, n) : null;
        const ok = sc !== null && sc >= 60;
        const tone = sc === null ? 'var(--o2-text-3)' : sc >= 90 ? 'var(--o2-green)' : ok ? 'var(--o2-gold)' : 'var(--o2-red)';
        return `
        <div class="o2-acad-ev">
            <div class="o2-acad-ev-head">
                <div><h5>${esc(ev.name)}</h5><p>${esc(ev.note)} · Baraj ${fmtVal(ev, n.pass)} · Hedef ${fmtVal(ev, n.target)}</p></div>
                <div class="o2-acad-ev-val" style="color:${tone}"><strong>${l ? fmtVal(ev, l.v) : '—'}</strong><small>${sc === null ? 'kayıt yok' : `${sc} puan`}</small></div>
            </div>
            <div class="o2-bar" style="margin-top:8px"><i data-w="${sc || 0}%" style="width:0;background:${tone}"></i></div>
            ${b !== null && l && b !== l.v ? `<p class="o2-acad-ev-best">En iyi: ${fmtVal(ev, b)}</p>` : ''}
        </div>`;
    }

    function bodyHTML(st) {
        const b = bodyCheck(st);
        if (b.ok === null) return `
            <div class="o2-card is-tap" onclick="O2.logSheet('measure')"><div class="o2-coach">
                <div class="o2-coach-orb">${I('ruler')}</div>
                <div style="flex:1"><h4>Boy ve kilonu gir</h4><p>VKİ ve boy şartını ilana göre kontrol edelim.</p></div>${I('chev', 'chev')}
            </div></div>`;
        const lo = 15, hi = 35, pos = (v) => O2.clamp((v - lo) / (hi - lo)) * 100;
        const tone = b.bOk ? 'var(--o2-green)' : (b.bmi > b.n.bmiMax && b.bmi <= b.n.bmiMax + 1) || (b.bmi < b.n.bmiMin && b.bmi >= b.n.bmiMin - 1) ? 'var(--o2-gold)' : 'var(--o2-red)';
        const diff = b.bmi > b.n.bmiMax ? b.w - b.maxW : b.bmi < b.n.bmiMin ? b.minW - b.w : 0;
        return `
        <div class="o2-card">
            <div class="o2-acad-ev-head">
                <div><h5>Vücut kitle indeksi</h5><p>${O2.fmtNum(b.h)} cm · ${O2.fmtNum(b.w, 1)} kg · uygun aralık ${b.n.bmiMin}-${b.n.bmiMax}</p></div>
                <div class="o2-acad-ev-val" style="color:${tone}"><strong>${O2.fmtNum(b.bmi, 1)}</strong><small>${b.bOk ? 'uygun' : 'aralık dışı'}</small></div>
            </div>
            <div class="o2-acad-bmi">
                <i class="zone" style="left:${pos(b.n.bmiMin)}%;width:${pos(b.n.bmiMax) - pos(b.n.bmiMin)}%"></i>
                <i class="dot" style="left:${pos(b.bmi)}%;background:${tone}"></i>
            </div>
            <div class="o2-grid-2" style="margin-top:12px">
                <div class="o2-acad-mini"><small>Kilo aralığın</small><b>${O2.fmtNum(b.minW, 1)}-${O2.fmtNum(b.maxW, 1)} kg</b></div>
                <div class="o2-acad-mini"><small>Asgari boy</small><b style="color:${b.hOk ? 'var(--o2-green)' : 'var(--o2-red)'}">${b.n.height[st.gender]} cm ${b.hOk ? '✓' : '✗'}</b></div>
            </div>
            <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:var(--o2-text-2)">${diff ? `${b.bmi > b.n.bmiMax ? 'Aralığa girmek için' : 'Aralığa çıkmak için'} yaklaşık <b>${O2.fmtNum(diff, 1)} kg</b> ${b.bmi > b.n.bmiMax ? 'vermelisin' : 'almalısın'}. Haftada 0,5 kg ile ~${Math.ceil(diff / .5)} hafta.` : 'Boy-kilo şartını karşılıyorsun. Sınava kadar kiloyu bu aralıkta tut.'}</p>
            <button class="o2-btn o2-btn-ghost o2-btn-sm" style="margin-top:12px" onclick="O2.logSheet('weight')">${I('scale')}Kilo kaydet</button>
        </div>`;
    }
    O2.acadBodySheet = () => {
        const st = state(), n = bodyNorm(st);
        O2.sheet('Boy & VKİ normları', `
            <p style="margin:0 0 14px;font-size:12.5px;line-height:1.55;color:var(--o2-text-3)">Varsayılanlar son dönem ilanlarındaki yaygın değerlerdir (tahmini). Başvurduğun ilandaki boy ve VKİ şartına göre düzenle.</p>
            <div class="o2-grid-2">
                <div class="o2-field"><label>VKİ alt</label><input class="o2-input" id="o2-bmi-min" inputmode="decimal" value="${n.bmiMin}"></div>
                <div class="o2-field"><label>VKİ üst</label><input class="o2-input" id="o2-bmi-max" inputmode="decimal" value="${n.bmiMax}"></div>
            </div>
            <div class="o2-field"><label>Asgari boy (${st.gender === 'm' ? 'erkek' : 'kadın'}, cm)</label><input class="o2-input" id="o2-bmi-h" inputmode="numeric" value="${n.height[st.gender]}"></div>
            <button class="o2-btn o2-btn-ghost o2-btn-block" onclick="O2.logSheet('measure')">${I('ruler')}Boyumu güncelle</button>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:10px" onclick="O2.acadSaveBody()">Kaydet</button>`);
    };
    O2.acadSaveBody = () => {
        update(st => {
            const n = bodyNorm(st);
            const min = parseFloat($('o2-bmi-min').value), max = parseFloat($('o2-bmi-max').value), h = parseFloat($('o2-bmi-h').value);
            st.body = { bmiMin: min || n.bmiMin, bmiMax: max || n.bmiMax, height: { ...n.height, [st.gender]: h || n.height[st.gender] } };
        });
        O2.closeSheet(); O2.toast('Normlar kaydedildi', 'check');
    };

    // 📈 Test grafiği: resmi etkinliğin zaman içindeki gelişimi + baraj/hedef çizgileri
    function testChartHTML(st, evs) {
        const ev = evs[0];
        const pts = st.tests.filter(t => t.res && t.res[ev.id] !== undefined);
        if (pts.length < 2) return '';
        return `
        <div class="o2-card" style="margin-top:12px">
            <div class="o2-acad-ev-head"><div><h5>${esc(ev.name)} gelişimi</h5><p>${pts.length} test · ${ev.better === 'low' ? 'düşük daha iyi' : 'yüksek daha iyi'}</p></div></div>
            <div style="position:relative;height:170px;margin-top:10px"><canvas id="o2-acad-chart"></canvas></div>
        </div>`;
    }
    O2.drawAcademyChart = () => {
        const el = $('o2-acad-chart');
        if (!el || typeof Chart === 'undefined') return;
        const st = state(), ev = eventsOf(st)[0], n = norm(st, ev), color = branchOf(st).color;
        const pts = st.tests.filter(t => t.res && t.res[ev.id] !== undefined);
        const labels = pts.map(t => { const d = O2.parseDate(t.d); return d ? d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : t.d; });
        const line = (v, c) => ({ data: pts.map(() => v), borderColor: c, borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, fill: false });
        O2.ui.charts.push(new Chart(el.getContext('2d'), {
            type: 'line',
            data: { labels, datasets: [
                { data: pts.map(t => t.res[ev.id]), borderColor: color, backgroundColor: color + '22', borderWidth: 2.5, tension: .35, fill: true, pointRadius: 4, pointBackgroundColor: color },
                line(n.pass, 'rgba(255,122,69,.7)'), line(n.target, 'rgba(61,220,151,.7)')
            ] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: '#18181c', displayColors: false, callbacks: { label: (c) => c.datasetIndex === 0 ? fmtVal(ev, c.parsed.y) : c.datasetIndex === 1 ? `Baraj ${fmtVal(ev, n.pass)}` : `Hedef ${fmtVal(ev, n.target)}` } } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#63636e', font: { size: 10, weight: 'bold' } }, border: { display: false } },
                    y: { reverse: ev.better === 'low', grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#63636e', font: { size: 10, weight: 'bold' }, maxTicksLimit: 5 }, border: { display: false } }
                }
            }
        }));
    };

    // 📉 Sınava giden yol: dönemlendirme ve son 7 günde azalan yüklenme (taper)
    const TAPER = {
        7: ['Son tam test simülasyonu', 'Gerçek test temposunda 1 tam deneme; süreni kaydet.'],
        6: ['Hafif koşu + mobilite', '25 dk rahat koşu, 10 dk esneme. Kuvvet yok.'],
        5: ['Kısa hız', '4 × 20 sn çeviklik/sprint, tam dinlenmeyle. Hacim düşük, hız yüksek.'],
        4: ['Dinlenme', 'Yürüyüş ve mobilite. Uyku 8 saat.'],
        3: ['Keskinleştirme', '%80 tempoda 2 kısa parkur/400 m denemesi; tekniğe odaklan.'],
        2: ['Aktivasyon', '15 dk hafif ısınma + 3 kısa hızlanma. Yorulmadan bitir.'],
        1: ['Tam dinlenme', 'Belgelerini, kıyafetini hazırla. Bol su, erken yat.'],
        0: ['Test günü', 'Hafif kahvaltı (test öncesi 2-3 saat), 15 dk ısınma, dinamik esneme. Başarılar!']
    };
    function taperHTML(st) {
        const left = daysLeft(st.dates.fitness);
        if (left === null) return `
            <div class="o2-card is-tap" style="margin-top:12px" onclick="O2.acadDatesSheet()"><div class="o2-coach">
                <div class="o2-coach-orb">${I('clock')}</div>
                <div style="flex:1"><h4>Sınava giden yol</h4><p>Fiziki test tarihini ekle; hafta hafta yüklenme ve son 7 günün azaltma planı çıksın.</p></div>${I('chev', 'chev')}
            </div></div>`;
        if (left < 0) return '';
        const phases = [
            { id: 'base', name: 'Temel', sub: 'Hacim & kondisyon', from: 99, to: 43 },
            { id: 'build', name: 'Yoğunlaşma', sub: 'Haftada 2 simülasyon', from: 42, to: 15 },
            { id: 'peak', name: 'Azaltma', sub: 'Hacim −%40, hız korunur', from: 14, to: 8 },
            { id: 'taper', name: 'Taper', sub: 'Son 7 gün', from: 7, to: 0 }
        ];
        const cur = phases.find(p => left <= p.from && left >= p.to) || phases[0];
        const advice = {
            base: 'Haftada 4-5 seans: kuvvet (şınav/mekik/barfiks), çeviklik ve 1 uzun koşu. Her 2 haftada bir test kaydet.',
            build: 'Haftada 2 test simülasyonu, aralara sprint ve kuvvet. Zayıf istasyonuna (tur süreleri) odaklan.',
            peak: 'Toplam hacmi %40 azalt, yoğunluğu koru. Yeni hareket deneme, sakatlık riskini sıfırla.',
            taper: ''
        }[cur.id];
        const days = cur.id === 'taper' ? Array.from({ length: Math.min(left, 7) + 1 }, (_, i) => left - i).map(d => ({ d, date: O2.addDays(O2.startOfDay(), left - d), ...{ t: TAPER[d] } })) : [];
        return `
        <div class="o2-section-head"><h3>Sınava giden yol</h3><span class="o2-link" style="color:var(--o2-text-3)">${left === 0 ? 'Bugün' : `${left} gün`}</span></div>
        <div class="o2-card">
            <div class="o2-acad-phases">${phases.map(p => `<div class="${p === cur ? 'on' : (left < p.to ? 'done' : '')}"><b>${p.name}</b><small>${p.sub}</small></div>`).join('')}</div>
            ${advice ? `<p style="margin:14px 0 0;font-size:13px;line-height:1.55;color:var(--o2-text-2)">${advice}</p>` : `
            <div class="o2-list" style="margin-top:8px">${days.map(x => `
                <div class="o2-row">
                    <div class="o2-row-idx" style="color:${x.d === 0 ? 'var(--o2-gold)' : 'var(--o2-text-3)'};font-size:11px;font-weight:800">${x.d === 0 ? 'GÜN' : `G-${x.d}`}</div>
                    <div class="o2-row-main"><h5>${esc(x.t[0])}${x.d === left ? ' · bugün' : ''}</h5><p>${esc(x.date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'short' }))} · ${esc(x.t[1])}</p></div>
                </div>`).join('')}</div>`}
        </div>`;
    }

    function testHistory(st, evs) {
        const list = st.tests.filter(t => evs.some(ev => t.res && t.res[ev.id] !== undefined)).slice(-5).reverse();
        if (!list.length) return '';
        return `
        <div class="o2-card" style="padding:4px 18px 8px;margin-top:12px"><div class="o2-list">${list.map(t => `
            <div class="o2-row">
                <div class="o2-row-main"><h5>${esc(O2.prettyDate(t.d))}</h5><p>${evs.filter(ev => t.res[ev.id] !== undefined).map(ev => `${esc(ev.name)} ${fmtVal(ev, t.res[ev.id])}`).join(' · ')}</p></div>
                <button class="o2-icon-btn" style="width:32px;height:32px;border:0;background:none" onclick="O2.acadDeleteTest('${t.id}')" aria-label="Testi sil">${I('close')}</button>
            </div>`).join('')}</div></div>`;
    }

    // ==========================================
    // ⚙️ ETKİLEŞİMLER
    // ==========================================
    const update = (fn, rerender = true) => { const st = state(); fn(st); save(st); if (rerender && O2.ui.tab === 'academy') O2.render(); };
    O2.openAcademyHub = () => { O2.closeSheet(true); O2.go('academy'); };
    O2.acadBranch = (id) => update(st => { st.branch = id; st.track = BRANCHES[id].tracks[0].id; O2.haptic(10); });
    O2.acadTrack = (id) => update(st => { st.track = id; O2.haptic(8); });
    O2.acadGender = () => update(st => { st.gender = st.gender === 'm' ? 'f' : 'm'; });
    O2.acadDoc = (i) => update(st => {
        const d = st.docs[st.track] = st.docs[st.track] || {};
        d[i] = !d[i];
        if (d[i]) { markDay(st); O2.haptic([10, 30, 10]); }
    });
    O2.acadDeleteTest = (id) => {
        if (!confirm('Bu test kaydı silinsin mi?')) return;
        update(st => { st.tests = st.tests.filter(t => t.id !== id); });
    };

    O2.acadDatesSheet = () => {
        const st = state();
        const field = (k, label) => `<div class="o2-field"><label>${label}</label><input class="o2-input" type="date" id="o2-acad-${k}" value="${esc(st.dates[k] || '')}"></div>`;
        O2.sheet('Sınav takvimi', `
            ${field('written', 'Yazılı sınav / başvuru son gün')}
            ${field('fitness', 'Fiziki yeterlilik testi')}
            ${field('interview', 'Mülakat')}
            <p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:var(--o2-text-3)">E-posta hatırlatıcıları açıksa sınavlara 30, 7 ve 1 gün kala ayrıca mail alırsın.</p>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:16px" onclick="O2.acadSaveDates()">Kaydet</button>`);
    };
    O2.acadSaveDates = () => {
        update(st => { ['written', 'fitness', 'interview'].forEach(k => { st.dates[k] = $(`o2-acad-${k}`).value || ''; }); });
        O2.closeSheet();
        O2.toast('Takvim güncellendi', 'clock');
        if (O2.syncMailReminder) O2.syncMailReminder();
    };

    O2.acadNormsSheet = () => {
        const st = state(), evs = eventsOf(st);
        O2.sheet('Test normları', `
            <p style="margin:0 0 14px;font-size:12.5px;line-height:1.55;color:var(--o2-text-3)">Varsayılanlar son dönem ilanlarından derlenmiş <b>tahmini</b> değerlerdir (${st.gender === 'm' ? 'erkek' : 'kadın'}). Başvurduğun ilandaki puan tablosuna göre düzenle.</p>
            ${evs.map(ev => { const n = norm(st, ev); return `
            <div class="o2-field"><label>${esc(ev.name)} (${ev.unit})</label>
                <div class="o2-grid-2">
                    <input class="o2-input" id="o2-norm-${ev.id}-p" inputmode="decimal" value="${n.pass}" placeholder="Baraj">
                    <input class="o2-input" id="o2-norm-${ev.id}-t" inputmode="decimal" value="${n.target}" placeholder="Tam puan">
                </div>
            </div>`; }).join('')}
            <p style="margin:0;font-size:11.5px;color:var(--o2-text-3)">Sol: baraj (≈60 puan) · Sağ: tam puan hedefi</p>
            <div class="o2-grid-2" style="margin-top:16px">
                <button class="o2-btn o2-btn-ghost" onclick="O2.acadResetNorms()">Varsayılan</button>
                <button class="o2-btn o2-btn-gold" onclick="O2.acadSaveNorms()">Kaydet</button>
            </div>`);
    };
    O2.acadSaveNorms = () => {
        update(st => {
            eventsOf(st).forEach(ev => {
                const p = parseTime($(`o2-norm-${ev.id}-p`).value), t = parseTime($(`o2-norm-${ev.id}-t`).value);
                if (p && t) st.norms[`${trackOf(st).test}_${ev.id}_${st.gender}`] = { pass: p, target: t };
            });
        });
        O2.closeSheet(); O2.toast('Normlar kaydedildi', 'check');
    };
    O2.acadResetNorms = () => {
        update(st => { eventsOf(st).forEach(ev => { delete st.norms[`${trackOf(st).test}_${ev.id}_${st.gender}`]; }); });
        O2.closeSheet(); O2.toast('Varsayılan normlar', 'check');
    };

    O2.acadTestSheet = (prefill = {}) => {
        const st = state(), evs = eventsOf(st);
        O2.sheet('Test sonucu', `
            <div class="o2-field"><label>Tarih</label><input class="o2-input" type="date" id="o2-acad-test-d" value="${O2.dayKey()}"></div>
            ${evs.map(ev => `
            <div class="o2-field"><label>${esc(ev.name)} · ${ev.unit === 'sn' ? 'süre (sn ya da dk:sn)' : 'tekrar'}</label>
                <input class="o2-input" id="o2-acad-test-${ev.id}" inputmode="decimal" placeholder="${ev.unit === 'sn' ? 'örn. 44.8 veya 1:32' : 'örn. 38'}" value="${prefill[ev.id] !== undefined ? prefill[ev.id] : ''}">
            </div>`).join('')}
            <p style="margin:0;font-size:12px;color:var(--o2-text-3)">Boş bıraktıkların kaydedilmez.</p>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:16px" onclick="O2.acadSaveTest()">Kaydet</button>`);
    };
    O2.acadSaveTest = () => {
        const st = state(), evs = eventsOf(st), res = {};
        evs.forEach(ev => {
            const raw = $(`o2-acad-test-${ev.id}`).value;
            const v = ev.unit === 'sn' ? parseTime(raw) : parseInt(raw);
            if (v && v > 0) res[ev.id] = ev.unit === 'sn' ? Math.round(v * 10) / 10 : v;
        });
        if (!Object.keys(res).length) { O2.toast('En az bir sonuç gir', 'bolt'); return; }
        const prevBest = Object.fromEntries(evs.map(ev => [ev.id, best(st, ev)]));
        st.tests.push({ id: 'at_' + Date.now(), d: $('o2-acad-test-d').value || O2.dayKey(), track: st.track, res });
        st.tests.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
        markDay(st);
        save(st);
        O2.closeSheet();
        const pr = evs.find(ev => res[ev.id] !== undefined && prevBest[ev.id] !== null && (ev.better === 'low' ? res[ev.id] < prevBest[ev.id] : res[ev.id] > prevBest[ev.id]));
        const allPass = evs.every(ev => res[ev.id] === undefined || score(ev, res[ev.id], norm(st, ev)) >= 60);
        if (pr && typeof confetti === 'function') confetti({ particleCount: 80, spread: 70, colors: ['#f6dea0', '#e6c374', '#ffffff'] });
        O2.toast(pr ? `Yeni rekor · ${pr.name}` : allPass ? 'Kaydedildi · barajın üzerindesin' : 'Kaydedildi · hedefe çalışmaya devam', pr ? 'trophy' : 'check');
        if (O2.ui.tab === 'academy') O2.render();
    };

    // ⏱️ Kronometre / tekrar sayacı (parkur istasyonları için tur kaydı)
    let swTimer = null, sw = null;
    O2.acadStopwatch = (evId) => {
        const st = state();
        const ev = eventsOf(st).find(e => e.id === evId) || eventsOf(st)[0];
        sw = { ev, start: 0, acc: 0, run: false, laps: [], reps: 0 };
        const isTime = ev.unit === 'sn';
        O2.sheet(ev.name, `
            <div class="o2-acad-sw">
                <div class="o2-acad-sw-num" id="o2-sw-num">${isTime ? '0.0' : '0'}</div>
                <small>${isTime ? esc(ev.note) : '1 dakikada tekrar · ekrana dokun'}</small>
                ${isTime ? '' : '<div class="o2-acad-sw-tap" onclick="O2.swRep()">+1</div>'}
                <div class="o2-acad-sw-laps" id="o2-sw-laps"></div>
            </div>
            <div class="o2-grid-3" style="margin-top:14px">
                <button class="o2-btn o2-btn-ghost" onclick="O2.swReset()">Sıfırla</button>
                <button class="o2-btn o2-btn-gold" id="o2-sw-main" onclick="O2.swToggle()">Başlat</button>
                <button class="o2-btn o2-btn-ghost" onclick="${isTime ? 'O2.swLap()' : 'O2.swRep(-1)'}">${isTime ? 'İstasyon' : '−1'}</button>
            </div>
            <button class="o2-btn o2-btn-ghost o2-btn-block" style="margin-top:10px" onclick="O2.swSave()">${I('check')}Sonucu teste kaydet</button>`);
    };
    const swElapsed = () => sw ? sw.acc + (sw.run ? Date.now() - sw.start : 0) : 0;
    function swPaint() {
        const el = $('o2-sw-num');
        if (!el || !sw) { clearInterval(swTimer); swTimer = null; return; }
        const s = swElapsed() / 1000;
        if (sw.ev.unit === 'sn') el.textContent = s >= 60 ? `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}` : s.toFixed(1);
        else {
            el.textContent = sw.reps;
            if (sw.run && s >= 60) { O2.swToggle(); O2.haptic([200, 100, 200]); O2.toast(`Süre doldu · ${sw.reps} tekrar`, 'trophy'); }
        }
    }
    O2.swToggle = () => {
        if (!sw) return;
        if (sw.run) { sw.acc += Date.now() - sw.start; sw.run = false; }
        else { if (sw.ev.unit !== 'sn' && swElapsed() >= 60000) return; sw.start = Date.now(); sw.run = true; }
        O2.haptic(15);
        $('o2-sw-main').textContent = sw.run ? 'Durdur' : 'Devam';
        clearInterval(swTimer);
        swTimer = setInterval(swPaint, 50);
        swPaint();
    };
    O2.swReset = () => { if (!sw) return; sw.acc = 0; sw.run = false; sw.laps = []; sw.reps = 0; $('o2-sw-main').textContent = 'Başlat'; $('o2-sw-laps').innerHTML = ''; swPaint(); };
    O2.swLap = () => {
        if (!sw || !sw.run) return;
        const t = swElapsed() / 1000;
        sw.laps.push(t);
        O2.haptic(10);
        $('o2-sw-laps').innerHTML = sw.laps.map((l, i) => `<span>${i + 1}. ${l.toFixed(1)} sn <em>+${(l - (sw.laps[i - 1] || 0)).toFixed(1)}</em></span>`).reverse().join('');
    };
    O2.swRep = (d = 1) => {
        if (!sw) return;
        if (d > 0 && !sw.run && swElapsed() === 0) O2.swToggle();
        if (d > 0 && !sw.run) return;
        sw.reps = Math.max(0, sw.reps + d);
        O2.haptic(8);
        swPaint();
    };
    O2.swSave = () => {
        if (!sw) return;
        const v = sw.ev.unit === 'sn' ? Math.round(swElapsed() / 100) / 10 : sw.reps;
        if (!v) { O2.toast('Önce ölçüm yap', 'clock'); return; }
        const id = sw.ev.id;
        if (sw.run) O2.swToggle();
        O2.closeSheet(true);
        setTimeout(() => O2.acadTestSheet({ [id]: v }), 50);
    };

    // 🗂️ Kart çalışması ve mülakat provası
    let deck = null;
    O2.acadPractice = (mock = false) => {
        const st = state();
        const all = questions(st, !mock);
        const rank = (q) => { const c = st.cards[q.id]; return !c ? 1 : c.r === 0 ? 0 : 2 + (c.t || 0) / 1e13; };
        let list;
        if (mock) {
            const personal = all.filter(q => q.cat === 'Kişisel').sort(() => Math.random() - .5).slice(0, 2);
            const branch = all.filter(q => q.cat !== 'Kişisel').sort(() => Math.random() - .5).slice(0, 3);
            list = [...personal, ...branch];
        } else {
            list = all.map(q => ({ q, k: rank(q) + Math.random() * .5 })).sort((a, b) => a.k - b.k).map(x => x.q).slice(0, 20);
        }
        deck = { list, i: 0, shown: false, mock, ok: 0, timer: null, left: 60, scores: {} };
        update(st => markDay(st), false);
        drawCard();
    };
    function drawCard() {
        clearInterval(deck.timer);
        stopMic();
        const q = deck.list[deck.i];
        if (!q) return finishDeck();
        deck.shown = false; deck.left = deck.mock ? 60 : 0;
        O2.sheet(deck.mock ? `Prova · ${deck.i + 1}/${deck.list.length}` : `Kart ${deck.i + 1}/${deck.list.length}`, `
            <div class="o2-acad-card">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
                    <span class="o2-chip">${esc(q.cat)}</span>
                    ${deck.mock ? `<span class="o2-acad-timer" id="o2-acad-timer">60</span>` : `<button class="o2-link" onclick="O2.acadSpeak()">${I('chat')} Sesli oku</button>`}
                </div>
                <h3>${esc(q.q)}</h3>
                <div id="o2-acad-answer" class="o2-acad-answer" hidden><small>Örnek cevap</small><p>${esc(q.a)}</p></div>
                ${deck.mock ? `<div class="o2-acad-mic-row">
                    <button class="o2-acad-mic" id="o2-acad-mic" onclick="O2.acadMic()" aria-label="Sesli cevap">${I('mic')}</button>
                    <span id="o2-acad-mic-hint">${SR ? 'Mikrofona dokun ve cevabını sesli söyle' : 'Bu cihazda konuşma tanıma yok; cevabını yaz'}</span>
                </div>
                <textarea class="o2-input" id="o2-acad-mine" rows="3" style="height:auto;margin-top:10px;padding:12px" placeholder="Söylediklerin burada yazıya dönüşür; süre bitince AI otomatik değerlendirir"></textarea>
                <div id="o2-acad-ai" class="o2-acad-ai" hidden></div>` : ''}
            </div>
            <div id="o2-acad-actions">${deckActions()}</div>`);
        if (deck.mock) {
            O2.acadSpeak();
            deck.timer = setInterval(() => {
                const el = $('o2-acad-timer');
                if (!el) { clearInterval(deck.timer); return; }
                deck.left--;
                el.textContent = Math.max(0, deck.left);
                el.classList.toggle('low', deck.left <= 10);
                if (deck.left <= 0) { clearInterval(deck.timer); O2.haptic([120, 60, 120]); O2.acadReveal(); }
            }, 1000);
        }
    }
    const deckActions = () => !deck.shown
        ? `<button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:16px" onclick="O2.acadReveal()">Cevabı göster</button>`
        : `${deck.mock ? `<button class="o2-btn o2-btn-ghost o2-btn-block" style="margin-top:14px" onclick="O2.acadAI()">${I('spark')}AI ile değerlendir</button>` : ''}
           <div class="o2-grid-2" style="margin-top:10px">
               <button class="o2-btn o2-btn-ghost" onclick="O2.acadRate(0)">Tekrar et</button>
               <button class="o2-btn o2-btn-gold" onclick="O2.acadRate(1)">${I('check')}Biliyorum</button>
           </div>`;
    O2.acadReveal = () => {
        if (!deck) return;
        clearInterval(deck.timer);
        stopMic();
        deck.shown = true;
        $('o2-acad-answer').hidden = false;
        $('o2-acad-actions').innerHTML = deckActions();
        // Cevap verildiyse ve Gemini anahtarı varsa komisyon notunu otomatik iste
        const mine = $('o2-acad-mine');
        if (deck.mock && mine && mine.value.trim().length > 8 && localStorage.getItem('OLY_API_KEY')) O2.acadAI();
    };

    // 🎙️ Konuşma tanıma (tr-TR): söylenenler canlı olarak yazıya döner
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = null;
    function stopMic() {
        if (rec) { try { rec.stop(); } catch (e) { } rec = null; }
        const b = $('o2-acad-mic');
        if (b) b.classList.remove('on');
    }
    O2.acadMic = () => {
        if (!SR) { O2.toast('Konuşma tanıma bu cihazda desteklenmiyor', 'chat'); return; }
        if (rec) { stopMic(); return; }
        if ('speechSynthesis' in window) speechSynthesis.cancel();
        const box = $('o2-acad-mine');
        const base = box.value ? box.value.trim() + ' ' : '';
        rec = new SR();
        rec.lang = 'tr-TR'; rec.continuous = true; rec.interimResults = true;
        rec.onresult = (e) => {
            let text = '';
            for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
            if ($('o2-acad-mine')) $('o2-acad-mine').value = base + text.trim();
        };
        rec.onerror = (e) => { if (e.error === 'not-allowed') O2.toast('Mikrofon izni verilmedi', 'chat'); stopMic(); };
        rec.onend = () => { if (rec) stopMic(); };
        try { rec.start(); } catch (e) { rec = null; return; }
        $('o2-acad-mic').classList.add('on');
        const hint = $('o2-acad-mic-hint');
        if (hint) hint.textContent = 'Dinliyorum… bitirince tekrar dokun';
        O2.haptic(15);
    };
    O2.acadSpeak = () => {
        const q = deck && deck.list[deck.i];
        if (!q || !('speechSynthesis' in window)) return;
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(q.q);
        u.lang = 'tr-TR'; u.rate = 1;
        speechSynthesis.speak(u);
    };
    O2.acadRate = (r) => {
        const q = deck.list[deck.i];
        update(st => {
            const c = st.cards[q.id] || { n: 0 };
            st.cards[q.id] = { r, n: c.n + 1, t: Date.now() };
        }, false);
        if (r) deck.ok++;
        O2.haptic(r ? [10, 30, 10] : 10);
        deck.i++;
        drawCard();
    };
    O2.acadAI = async () => {
        const q = deck.list[deck.i];
        const mine = ($('o2-acad-mine') || {}).value || '';
        if (!mine.trim()) { O2.toast('Önce cevabını yaz', 'chat'); return; }
        if (typeof askGeminiAI !== 'function') return;
        const box = $('o2-acad-ai');
        box.hidden = false;
        box.innerHTML = '<p>Komisyon değerlendiriyor…</p>';
        const st = state();
        try {
            const text = await askGeminiAI(`Sen ${branchOf(st).full} ${trackOf(st).name} mülakat komisyonu üyesisin. Adayın cevabını 0-10 arası puanla, en fazla 3 kısa madde ile güçlü yanı, eksiği ve daha iyi bir cevap önerisini Türkçe yaz. Toplam 90 kelimeyi geçme.\nSoru: ${q.q}\nÖrnek doğru bilgi: ${q.a}\nAdayın cevabı: ${mine}`);
            box.innerHTML = `<small>Komisyon notu</small><p>${esc(text || '').replace(/\*\*/g, '').replace(/\n/g, '<br>')}</p>`;
            const m = String(text || '').match(/(\d+(?:[.,]\d)?)\s*\/\s*10/);
            if (m && deck) deck.scores[deck.i] = parseFloat(m[1].replace(',', '.'));
        } catch (e) {
            box.innerHTML = `<p>${esc(e.message || 'Değerlendirme alınamadı')}</p>`;
        }
    };
    function finishDeck() {
        const { ok, list, mock } = deck;
        const sc = Object.values(deck.scores);
        const avg = sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : null;
        if (mock && avg !== null) update(st => { st.mockScores = [...(st.mockScores || []).slice(-19), { d: O2.dayKey(), avg: Math.round(avg * 10) / 10 }]; }, false);
        O2.sheet(mock ? 'Prova bitti' : 'Tur tamam', `
            <div class="o2-acad-result">
                ${O2.ring({ pct: ok / Math.max(1, list.length), size: 120, stroke: 11, center: `<strong>${ok}/${list.length}</strong><span>BİLDİN</span>` })}
                ${avg !== null ? `<p><b style="color:var(--o2-violet)">Komisyon ortalaması: ${O2.fmtNum(avg, 1)}/10</b></p>` : ''}
                <p>${ok === list.length ? 'Kusursuz! Komisyonun karşısına hazırsın.' : ok >= list.length * .6 ? 'İyi gidiyorsun. "Tekrar et" dediklerin bir sonraki turda önce gelecek.' : 'Zor sorular bir sonraki turda önce gelecek. Her gün kısa tekrar en etkilisi.'}</p>
            </div>
            <div class="o2-grid-2" style="margin-top:16px">
                <button class="o2-btn o2-btn-ghost" onclick="O2.closeSheet(); O2.ui.tab === 'academy' && O2.render()">Kapat</button>
                <button class="o2-btn o2-btn-gold" onclick="O2.acadPractice(${mock})">Yeni tur</button>
            </div>`);
        deck = null;
    }

    // 🎖️ Rütbe & teşkilat testi
    let quiz = null;
    function buildQuiz(st) {
        const sets = st.branch === 'polis' ? [RANKS.police] : [RANKS.officer, RANKS.nco, RANKS.unit];
        const pick = (a) => a[Math.floor(Math.random() * a.length)];
        const qs = [];
        for (let n = 0; n < 7; n++) {
            const arr = pick(sets);
            const i = Math.floor(Math.random() * (arr.length - 1));
            const up = Math.random() > .4;
            const ask = up ? arr[i] : arr[i + 1], correct = up ? arr[i + 1] : arr[i];
            const unit = arr === RANKS.unit;
            const opts = [correct, ...arr.filter(x => x !== correct && x !== ask).sort(() => Math.random() - .5).slice(0, 3)].sort(() => Math.random() - .5);
            qs.push({ q: unit ? `"${ask}" biriminin bir ${up ? 'büyüğü' : 'küçüğü'} hangisidir?` : `"${ask}" rütbesinin bir ${up ? 'üstü' : 'altı'} hangisidir?`, options: opts, correct: opts.indexOf(correct) });
        }
        const extra = (typeof hierarchyQuestions !== 'undefined' && st.branch !== 'tsk') ? [...hierarchyQuestions].sort(() => Math.random() - .5).slice(0, 3) : [];
        const facts = [
            { q: 'Jandarma Genel Komutanlığı hangi bakanlığa bağlıdır?', options: ['Milli Savunma Bakanlığı', 'İçişleri Bakanlığı', 'Adalet Bakanlığı', 'Genelkurmay Başkanlığı'], correct: 1 },
            { q: 'Genelkurmay Başkanlığı hangi bakanlığa bağlıdır?', options: ['İçişleri Bakanlığı', 'Cumhurbaşkanlığı', 'Milli Savunma Bakanlığı', 'Dışişleri Bakanlığı'], correct: 2 },
            { q: 'TSK İç Hizmet Kanunu kaç sayılıdır?', options: ['211', '2803', '3201', '1632'], correct: 0 },
            { q: 'Polis Vazife ve Salahiyet Kanunu kaç sayılıdır?', options: ['3201', '2559', '5271', '2803'], correct: 1 }
        ];
        while (qs.length + extra.length < 10) qs.push(facts[(qs.length + extra.length) % facts.length]);
        return [...qs, ...extra].slice(0, 10).sort(() => Math.random() - .5);
    }
    O2.acadQuiz = () => {
        const st = state();
        quiz = { qs: buildQuiz(st), i: 0, ok: 0, picked: null };
        update(s => markDay(s), false);
        drawQuiz();
    };
    function drawQuiz() {
        const q = quiz.qs[quiz.i];
        if (!q) {
            const st = state();
            const bestNow = Math.max(st.quiz[st.branch] || 0, quiz.ok);
            update(s => { s.quiz[s.branch] = bestNow; }, false);
            if (quiz.ok >= 9 && typeof confetti === 'function') confetti({ particleCount: 90, spread: 70 });
            O2.sheet('Test sonucu', `
                <div class="o2-acad-result">
                    ${O2.ring({ pct: quiz.ok / 10, size: 120, stroke: 11, center: `<strong>${quiz.ok}/10</strong><span>DOĞRU</span>` })}
                    <p>En iyi skorun: ${bestNow}/10</p>
                </div>
                <div class="o2-grid-2" style="margin-top:16px">
                    <button class="o2-btn o2-btn-ghost" onclick="O2.closeSheet(); O2.ui.tab === 'academy' && O2.render()">Kapat</button>
                    <button class="o2-btn o2-btn-gold" onclick="O2.acadQuiz()">Tekrar</button>
                </div>`);
            return;
        }
        O2.sheet(`Soru ${quiz.i + 1}/10`, `
            <div class="o2-acad-card"><h3>${esc(q.q)}</h3></div>
            <div class="o2-acad-options">${q.options.map((o, k) => `<button class="o2-btn o2-btn-ghost o2-btn-block" onclick="O2.acadAnswer(${k})">${esc(o)}</button>`).join('')}</div>`);
    }
    O2.acadAnswer = (k) => {
        const q = quiz.qs[quiz.i];
        const btns = document.querySelectorAll('.o2-acad-options button');
        if (!btns.length || btns[0].disabled) return;
        btns.forEach((b, i) => { b.disabled = true; if (i === q.correct) b.classList.add('ok'); else if (i === k) b.classList.add('bad'); });
        if (k === q.correct) { quiz.ok++; O2.haptic([10, 30, 10]); } else O2.haptic(60);
        setTimeout(() => { quiz.i++; drawQuiz(); }, 850);
    };

    // 🏋️ Branşa özel hazırlık programı (Training'de seçilebilir özel program olarak kaydedilir)
    function buildProgram(st) {
        const parkur = trackOf(st).test === 'parkur';
        const day = (title, ex) => ({ title, rest: false, ex: ex.map(([name, scheme, rpe]) => ({ name, scheme, tempo: '', rpe: rpe || '' })) });
        const rest = (title) => ({ title, rest: true, ex: [] });
        const days = [
            parkur
                ? day('Gün 1: Parkur & çeviklik', [['Shuttle Run', '6 x 20 sn', '9'], ['Box Jump', '4 x 8'], ['Farmer Walk', '4 x 40 sn', '8'], ['Burpee', '4 x 12', '8'], ['Plank', '3 x 60 sn']])
                : day('Gün 1: FYT kuvvet', [['Push Up', '5 x Max', '9'], ['Sit Up', '5 x Max', '9'], ['Pull Up', '4 x Max'], ['Bodyweight Squat', '4 x 20'], ['Plank', '3 x 60 sn']]),
            day('Gün 2: Sprint & 400 m', [['Sprint 200 m', '6 x 40 sn', '9'], ['Tempo Run 400 m', '4 x 90 sn', '8'], ['Jump Lunge', '3 x 12'], ['Russian Twist', '3 x 20']]),
            rest('Gün 3: Aktif dinlenme · mobilite'),
            parkur
                ? day('Gün 4: Kuvvet & dayanıklılık', [['Push Up', '5 x Max', '9'], ['Pull Up', '4 x Max'], ['Goblet Squat', '4 x 12'], ['Sit Up', '4 x 25'], ['Dips', '3 x 10-12']])
                : day('Gün 4: Çeviklik & kondisyon', [['Shuttle Run', '6 x 20 sn', '9'], ['Burpee', '5 x 12', '8'], ['Mountain Climber', '4 x 40 sn'], ['Box Jump', '4 x 8']]),
            day('Gün 5: Test simülasyonu', parkur
                ? [['Parkur Simülasyonu', '4 x 50 sn', '10'], ['Push Up', '2 x Max', '10'], ['Sit Up', '2 x Max', '10']]
                : [['Push Up', '2 x Max', '10'], ['Sit Up', '2 x Max', '10'], ['Sprint 400 m', '2 x 90 sn', '10']]),
            day('Gün 6: Uzun koşu', [['Easy Run', '1 x 30 dk', '6'], ['Hanging Leg Raise', '3 x 12']]),
            rest('Gün 7: Dinlenme')
        ];
        return days.map((d, i) => ({ day: i + 1, ...d }));
    }
    O2.acadInstallProgram = () => {
        const st = state(), br = branchOf(st), tr = trackOf(st);
        const id = `acad_${st.branch}`;
        if (!confirm(`"${br.name} · ${tr.name} Hazırlık" programı oluşturulup aktif program yapılacak. Devam edilsin mi?`)) return;
        const list = (LS.get('olympus_custom_profiles', []) || []).filter(p => p.id !== id);
        list.push({ id, name: `${br.name} · ${tr.name} Hazırlık`, icon: '🛡️', date: O2.trDate(), source: 'academy', programData: buildProgram(st) });
        LS.set('olympus_custom_profiles', list);
        localStorage.setItem('olympus_active_profile_id', id);
        if (!localStorage.getItem('olympus_start_date')) localStorage.setItem('olympus_start_date', O2.dayKey());
        O2.saveSettings({ program: id });
        update(s => markDay(s), false);
        O2.haptic([20, 50, 20]);
        O2.go('train');
        O2.toast('Akademi programı aktif', 'shield');
    };

    // Bugün ekranı ve e-posta hatırlatıcısı için kısa özet
    O2.academySummary = () => {
        if (!localStorage.getItem(KEY)) return null;
        const st = state(), br = branchOf(st), tr = trackOf(st), p = prep(st);
        const dates = [['written', 'Yazılı sınav'], ['fitness', 'Fiziki test'], ['interview', 'Mülakat']]
            .map(([k, label]) => ({ k, label, date: st.dates[k] || '', left: daysLeft(st.dates[k]) }))
            .filter(d => d.left !== null && d.left >= 0);
        return { branch: br.name, track: tr.name, color: br.color, score: p.total, known: p.known, qTotal: p.qTotal, dates };
    };
    O2.academyCard = () => {
        const s = O2.academySummary();
        if (!s) return '';
        const next = s.dates.sort((a, b) => a.left - b.left)[0];
        return `
        <div class="o2-card is-tap" style="margin-top:12px" onclick="O2.go('academy')">
            <div class="o2-coach">
                <div class="o2-coach-orb" style="background:color-mix(in srgb, ${s.color} 18%, transparent);color:${s.color}">${I('shield')}</div>
                <div style="flex:1"><h4>${esc(s.branch)} · ${esc(s.track)} hazırlığı · ${s.score}</h4><p>${next ? `${esc(next.label)}: ${next.left === 0 ? 'bugün' : `${next.left} gün`}` : 'Sınav tarihlerini ekle'} · ${s.known}/${s.qTotal} soru</p></div>
                ${I('chev', 'chev')}
            </div>
        </div>`;
    };
})();
