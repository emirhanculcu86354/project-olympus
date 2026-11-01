// Olympus Training — artı özellikler:
//   Oynatıcı: sesli set kaydı, seansa özel ısınma akışı, ağrı kaydı ve alternatif hareket
//   Beslenme: fotoğraftan kalori (Gemini görsel)
//   Akademi: AI mülakat komisyonu (takip sorulu), güncel olaylar destesi
//   Profil: aylık PDF rapor, veri & gizlilik ekranı
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const hasKey = () => !!localStorage.getItem('OLY_API_KEY');
    const needKey = () => {
        O2.toast('Bu özellik için Gemini anahtarı gerekiyor', 'spark');
        if (typeof updateOlyKey === 'function') setTimeout(updateOlyKey, 400);
    };
    const say = (t) => { try { if ('speechSynthesis' in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'tr-TR'; speechSynthesis.speak(u); } } catch (e) { } };

    // ==========================================
    // 🩹 AĞRI / SAKATLIK KAYDI
    // ==========================================
    const REGIONS = {
        'Omuz': ['shoulders', 'chest', 'triceps'], 'Dirsek': ['biceps', 'triceps'], 'Bilek': ['chest', 'biceps', 'triceps'],
        'Boyun': ['shoulders', 'back'], 'Sırt': ['back'], 'Bel': ['back', 'hamstrings', 'glutes'], 'Göğüs': ['chest'],
        'Kalça': ['glutes', 'hamstrings', 'quads'], 'Diz': ['quads', 'glutes'], 'Ayak bileği': ['calves', 'quads']
    };
    O2.pains = () => (LS.get('oly2_pain', []) || []).filter(p => p.active);
    const painFor = (muscle) => O2.pains().filter(p => (REGIONS[p.region] || []).includes(muscle));
    O2.painSheet = () => {
        const list = O2.pains();
        O2.sheet('Ağrı & sakatlık', `
            ${list.length ? `<div class="o2-card" style="padding:4px 16px;margin-bottom:14px"><div class="o2-list">${list.map(p => `
                <div class="o2-row"><div class="o2-row-idx" style="color:${p.level >= 4 ? 'var(--o2-red)' : 'var(--o2-orange)'};font-weight:800">${p.level}/5</div>
                <div class="o2-row-main"><h5>${esc(p.region)}</h5><p>${esc(O2.prettyDate(p.date))}${p.note ? ' · ' + esc(p.note) : ''}</p></div>
                <button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.painResolve('${p.id}')">İyileşti</button></div>`).join('')}</div></div>` : ''}
            <div class="o2-field"><label>Bölge</label><div class="o2-chips" id="o2-pain-region">${Object.keys(REGIONS).map(r => `<button class="o2-chip" onclick="this.parentElement.querySelectorAll('.o2-chip').forEach(b => b.classList.toggle('gold', b === this))">${r}</button>`).join('')}</div></div>
            <div class="o2-field"><label>Şiddet</label><div class="o2-rate" id="o2-pain-level">${[1, 2, 3, 4, 5].map(n => `<button onclick="this.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === this))" style="font-size:15px;font-weight:800">${n}</button>`).join('')}</div></div>
            <div class="o2-field"><label>Not (isteğe bağlı)</label><input class="o2-input" id="o2-pain-note" maxlength="60" placeholder="örn. bench press'te sağ omuz önü"></div>
            <p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:var(--o2-text-3)">Kayıt açıkken bu bölgeyi yoran hareketlerde oynatıcı uyarır ve alternatif önerir. Keskin ağrı, şişlik ya da uyuşma varsa antrenmanı bırak ve bir uzmana görün.</p>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:14px" onclick="O2.painSave()">${I('check')}Kaydet</button>`);
    };
    O2.painSave = () => {
        const r = document.querySelector('#o2-pain-region .gold');
        const l = document.querySelector('#o2-pain-level .on');
        if (!r || !l) { O2.toast('Bölge ve şiddet seç', 'bolt'); return; }
        const list = LS.get('oly2_pain', []) || [];
        list.push({ id: 'p' + Date.now(), region: r.textContent, level: +l.textContent, note: $('o2-pain-note').value.trim(), date: O2.dayKey(), active: true });
        LS.set('oly2_pain', list.slice(-50));
        O2.closeSheet(); O2.toast('Ağrı kaydedildi · ilgili hareketlerde uyaracağım', 'heart');
        if (O2.rerenderPlayer) O2.rerenderPlayer();
        if (!O2.isPlayerOpen || !O2.isPlayerOpen()) O2.render();
    };
    O2.painResolve = (id) => {
        LS.set('oly2_pain', (LS.get('oly2_pain', []) || []).map(p => p.id === id ? { ...p, active: false, healed: O2.dayKey() } : p));
        O2.painSheet();
        if (O2.rerenderPlayer) O2.rerenderPlayer();
    };
    // Aynı kası çalıştıran, ağrıyı daha az zorlayan seçenekler (vücut ağırlığı / dambıl / izole önce)
    O2.painAlternatives = (i, name, muscle) => {
        const level = Math.max(...painFor(muscle).map(p => p.level), 1);
        const rank = { bw: 0, db: 1, gym: 2 };
        const opts = O2.exercisePool().filter(e => e.muscle === muscle && e.name !== name)
            .sort((a, b) => (level >= 3 ? (a.type === 'i' ? -1 : 0) - (b.type === 'i' ? -1 : 0) : 0) || rank[a.equip] - rank[b.equip]).slice(0, 5);
        O2.sheet('Alternatif hareket', `
            <p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:var(--o2-text-2)"><b>${esc(name)}</b> yerine aynı kası (${O2.MUSCLES[muscle]}) çalıştıran, eklemi daha az zorlayan seçenekler. Ağrısız hareket aralığında, hafif başla.</p>
            <div class="o2-list">${opts.map(o => `<div class="o2-row is-tap" onclick="O2.closeSheet(true); O2.replaceExercise(${i}, ${jsArg(o.name)}); O2.toast('Hareket değiştirildi', 'swap')">
                <div class="o2-row-main"><h5>${esc(o.name)}</h5><p>${{ gym: 'Salon', db: 'Dambıl', bw: 'Vücut ağırlığı' }[o.equip]} · ${o.type === 'i' ? 'izole' : 'bileşik'}</p></div>${I('chev', 'chev')}</div>`).join('') || '<div class="o2-empty">Uygun alternatif bulunamadı; bu hareketi atla.</div>'}</div>`);
    };

    // ==========================================
    // 🔥 SEANSA ÖZEL ISINMA AKIŞI
    // ==========================================
    const DRILLS = {
        genel: [['Yerinde hafif koşu / ip atlama', 60], ['Kol çevirme (ileri-geri)', 30]],
        ust: [['Duvar meleği', 40], ['Kol açma (band pull-apart)', 30], ['Kedi-deve', 30], ['Göğüs açma (kapı esnetme)', 30]],
        sirt: [['Göğüs omurgası rotasyonu', 40], ['Asılı durma (dead hang)', 30]],
        alt: [['Bacak sallama ön-arka / yana', 40], ['Derin squat tutuş', 40], ['Dünyanın en iyi esnemesi', 45], ['Kalça köprüsü', 30], ['Ayak bileği mobilitesi', 30]],
        core: [['Dead bug', 30]]
    };
    function drillsFor(muscles) {
        const set = new Set(muscles);
        const out = [...DRILLS.genel];
        if (['chest', 'shoulders', 'triceps'].some(m => set.has(m))) out.push(...DRILLS.ust);
        if (['back', 'biceps'].some(m => set.has(m))) out.push(...DRILLS.sirt, ...(!out.some(d => d[0] === 'Kedi-deve') ? [['Kedi-deve', 30]] : []));
        if (['quads', 'hamstrings', 'glutes', 'calves'].some(m => set.has(m))) out.push(...DRILLS.alt);
        out.push(...DRILLS.core);
        return out;
    }
    let mob = null;
    O2.mobilityFlow = () => {
        const S = O2.activeSession();
        const list = drillsFor(S ? S.exercises.map(e => e.muscle) : ['chest', 'back', 'quads']);
        mob = { list, i: 0, left: list[0][1], timer: null, sid: S && S.id };
        const total = Math.round(list.reduce((a, d) => a + d[1], 0) / 60);
        O2.sheet(`Isınma · ~${total} dk`, `
            <div class="o2-acad-sw">
                <small id="o2-mob-step">1 / ${list.length}</small>
                <h3 id="o2-mob-name" style="margin:8px 0 0;font-size:22px;text-align:center">${esc(list[0][0])}</h3>
                <div class="o2-acad-sw-num" id="o2-mob-left">${list[0][1]}</div>
                <small id="o2-mob-next">Sıradaki: ${esc((list[1] || ['Antrenman'])[0])}</small>
            </div>
            <div class="o2-grid-3" style="margin-top:14px">
                <button class="o2-btn o2-btn-ghost" onclick="O2.mobStep(-1)">Geri</button>
                <button class="o2-btn o2-btn-gold" id="o2-mob-play" onclick="O2.mobToggle()">Başlat</button>
                <button class="o2-btn o2-btn-ghost" onclick="O2.mobStep(1)">Atla</button>
            </div>`);
    };
    const mobPaint = () => {
        if (!mob || !$('o2-mob-name')) { if (mob) clearInterval(mob.timer); return; }
        const d = mob.list[mob.i];
        $('o2-mob-name').textContent = d[0];
        $('o2-mob-left').textContent = mob.left;
        $('o2-mob-step').textContent = `${mob.i + 1} / ${mob.list.length}`;
        $('o2-mob-next').textContent = `Sıradaki: ${(mob.list[mob.i + 1] || ['Antrenman'])[0]}`;
    };
    O2.mobToggle = () => {
        if (!mob) return;
        if (mob.timer) { clearInterval(mob.timer); mob.timer = null; $('o2-mob-play').textContent = 'Devam'; return; }
        $('o2-mob-play').textContent = 'Duraklat';
        say(mob.list[mob.i][0]);
        mob.timer = setInterval(() => {
            if (!$('o2-mob-name')) { clearInterval(mob.timer); return; }
            mob.left--;
            if (mob.left <= 3 && mob.left > 0) O2.haptic(20);
            if (mob.left <= 0) O2.mobStep(1, true); else mobPaint();
        }, 1000);
    };
    O2.mobStep = (d, auto) => {
        if (!mob) return;
        mob.i += d;
        if (mob.i >= mob.list.length) {
            clearInterval(mob.timer);
            if (mob.sid) localStorage.setItem('oly2_warm_' + mob.sid, '1');
            mob = null;
            O2.closeSheet(); O2.haptic([30, 60, 30]); say('Isınma tamam. Hadi başlayalım.');
            O2.toast('Isınma tamam · ilk sete hazırsın', 'flame');
            if (O2.rerenderPlayer) O2.rerenderPlayer();
            return;
        }
        mob.i = Math.max(0, mob.i);
        mob.left = mob.list[mob.i][1];
        if (auto || mob.timer) say(mob.list[mob.i][0]);
        mobPaint();
    };

    // ==========================================
    // 🎙️ SESLİ SET KAYDI ("60 kilo 8 tekrar", "sekiz tekrar", "tamam")
    // ==========================================
    const NUM = { sıfır: 0, bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yirmi: 20, otuz: 30, kırk: 40, elli: 50, altmış: 60, yetmiş: 70, seksen: 80, doksan: 90, yüz: 100 };
    function wordsToDigits(t) {
        const tokens = t.toLocaleLowerCase('tr').replace(/,/g, '.').split(/\s+/);
        const out = [];
        let acc = null;
        tokens.forEach(w => {
            if (NUM[w] !== undefined) { acc = (acc || 0) + NUM[w]; return; }
            if (w === 'buçuk' && acc !== null) { acc += .5; return; }
            if (acc !== null) { out.push(String(acc)); acc = null; }
            out.push(w);
        });
        if (acc !== null) out.push(String(acc));
        return out.join(' ');
    }
    O2.parseSetSpeech = (raw) => {
        const t = wordsToDigits(raw);
        const kg = t.match(/(\d+(?:\.\d+)?)\s*(?:kilo|kg|kilogram)/);
        const reps = t.match(/(\d+)\s*(?:tekrar|kere|kez|rep)/);
        const nums = (t.match(/\d+(?:\.\d+)?/g) || []).map(Number);
        let w = kg ? +kg[1] : null, r = reps ? +reps[1] : null;
        if (w === null && r === null) {
            if (nums.length >= 2) { w = nums[0]; r = nums[1]; }
            else if (nums.length === 1) r = nums[0];
        } else if (w === null && nums.length >= 2) w = nums.find(n => n !== r) ?? null;
        else if (r === null && nums.length >= 2) r = nums.find(n => n !== w) ?? null;
        return { w, r, done: /tamam|bitti|kaydet/.test(t) || r !== null };
    };
    let rec = null;
    O2.voiceSet = (ci) => {
        if (!SR) { O2.toast('Bu cihazda konuşma tanıma yok', 'chat'); return; }
        if (rec) { try { rec.stop(); } catch (e) { } rec = null; return; }
        rec = new SR();
        rec.lang = 'tr-TR'; rec.interimResults = false; rec.maxAlternatives = 1;
        const btn = $('o2-voice-set');
        if (btn) { btn.classList.add('on'); btn.lastChild.textContent = 'Dinliyorum…'; }
        rec.onresult = (e) => {
            const text = e.results[0][0].transcript;
            const p = O2.parseSetSpeech(text);
            const row = document.querySelectorAll('.o2-set')[ci];
            if (!row) return;
            const [wIn, rIn] = row.querySelectorAll('input');
            if (p.w !== null) wIn.value = p.w;
            if (p.r !== null) rIn.value = p.r;
            O2.toast(`"${text}"`, 'chat');
            if (p.done && rIn.value) { O2.completeSet(ci); say(`${wIn.value ? wIn.value + ' kilo, ' : ''}${rIn.value} tekrar kaydedildi`); }
        };
        rec.onerror = (e) => { if (e.error === 'not-allowed') O2.toast('Mikrofon izni verilmedi', 'chat'); };
        rec.onend = () => { rec = null; const b = $('o2-voice-set'); if (b) { b.classList.remove('on'); b.lastChild.textContent = 'Sesli kaydet'; } };
        try { rec.start(); } catch (e) { rec = null; }
    };

    // Oynatıcıya eklenen kartlar
    O2.playerExtras = (S, ex, ci) => {
        let html = '';
        const fresh = S.exercises.every(e => e.sets.every(s => !s.done));
        if (fresh && S.cur === 0 && !localStorage.getItem('oly2_warm_' + S.id)) html += `
            <div class="o2-card o2-player-extra is-tap" onclick="O2.mobilityFlow()">
                <i style="color:var(--o2-orange)">${I('flame')}</i><div><h5>Seansa özel ısınma</h5><p>${drillsFor(S.exercises.map(e => e.muscle)).length} hareket · ~5 dk · bugünkü kaslara göre</p></div>${I('chev', 'chev')}
            </div>`;
        const pain = painFor(ex.muscle);
        if (pain.length) html += `
            <div class="o2-card o2-player-extra warn">
                <i style="color:var(--o2-red)">${I('heart')}</i><div><h5>${esc(pain[0].region)} ağrı kaydın var (${pain[0].level}/5)</h5><p>Bu hareket o bölgeyi zorlayabilir. Ağrısız aralıkta, hafif çalış ya da değiştir.</p></div>
                <button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.painAlternatives(${S.cur}, ${jsArg(ex.name)}, '${ex.muscle}')">Alternatif</button>
            </div>`;
        html += `<div class="o2-player-actions" style="margin-top:10px">
            ${ci >= 0 && SR ? `<button class="o2-btn o2-btn-ghost o2-btn-sm" id="o2-voice-set" onclick="O2.voiceSet(${ci})">${I('mic')}<span>Sesli kaydet</span></button>` : ''}
            <button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.painSheet()">${I('heart')}Ağrı bildir</button>
        </div>`;
        return html;
    };

    // ==========================================
    // 📷 FOTOĞRAFTAN KALORİ (Gemini görsel)
    // ==========================================
    O2.geminiVision = async (prompt, base64, mime = 'image/jpeg') => {
        const key = (localStorage.getItem('OLY_API_KEY') || '').trim();
        if (!key) throw new Error('Gemini anahtarı yok');
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: base64 } }] }] })
        });
        if (!res.ok) throw new Error('Gemini hata ' + res.status);
        const j = await res.json();
        return (((j.candidates || [])[0] || {}).content || { parts: [] }).parts.map(p => p.text || '').join('');
    };
    const shrink = (file, max = 900) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const k = Math.min(1, max / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(img.src);
            resolve(c.toDataURL('image/jpeg', .82));
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
    O2.fuelExtras = (key) => `
        <div class="o2-grid-2" style="margin-top:10px">
            <button class="o2-btn o2-btn-ghost" onclick="${hasKey() ? `document.getElementById('o2-photo-food').click()` : 'O2.needGemini()'}">${I('camera')}Fotoğrafla ekle</button>
            <button class="o2-btn o2-btn-ghost" onclick="O2.foodSheet && O2.foodSheet('${key}')">${I('plus')}Elle ekle</button>
        </div>
        <input type="file" id="o2-photo-food" accept="image/*" capture="environment" hidden onchange="this.files[0] && O2.photoFood('${key}', this.files[0]); this.value=''">`;
    O2.needGemini = needKey;
    let photoItems = [];
    O2.photoFood = async (key, file) => {
        O2.sheet('Fotoğraftan kalori', `<div class="o2-acad-ai" style="margin-top:0"><p>Tabak inceleniyor…</p></div><div id="o2-photo-out"></div>`);
        try {
            const url = await shrink(file);
            const text = await O2.geminiVision(`Bu yemek fotoğrafındaki her yiyeceği tanı ve porsiyonunu tahmin et. Türkçe ad kullan. SADECE JSON döndür: {"items":[{"name":"Pilav","grams":150,"kcal":195,"p":4,"c":42,"f":1}],"note":"kısa not"}. Emin değilsen makul bir porsiyon tahmini yap.`, url.split(',')[1]);
            const m = String(text).match(/\{[\s\S]*\}/);
            const j = m ? JSON.parse(m[0]) : null;
            photoItems = ((j && j.items) || []).map(x => ({ name: String(x.name || 'Yiyecek').slice(0, 40), grams: Math.round(+x.grams || 0), kcal: Math.round(+x.kcal || 0), p: Math.round(+x.p || 0), c: Math.round(+x.c || 0), f: Math.round(+x.f || 0) })).filter(x => x.kcal > 0);
            if (!photoItems.length) throw new Error('Yiyecek tanınamadı');
            const tot = photoItems.reduce((a, x) => a + x.kcal, 0);
            const h = new Date().getHours();
            const meal = h < 11 ? 'Kahvaltı' : h < 15 ? 'Öğle' : h < 18 ? 'Ara öğün' : 'Akşam';
            $('o2-sheet-layer').querySelector('.o2-sheet-body').innerHTML = `
                <img src="${url}" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:18px">
                <div class="o2-card" style="padding:4px 16px;margin-top:12px"><div class="o2-list">${photoItems.map((x, i) => `
                    <div class="o2-row"><button class="o2-check on" data-i="${i}" onclick="this.classList.toggle('on')">${I('check')}</button>
                    <div class="o2-row-main"><h5>${esc(x.name)}${x.grams ? ` · ${x.grams} g` : ''}</h5><p>${x.kcal} kcal · P ${x.p} · K ${x.c} · Y ${x.f}</p></div></div>`).join('')}</div></div>
                <p style="margin:10px 0 0;font-size:12px;color:var(--o2-text-3)">Toplam ~${tot} kcal${j.note ? ' · ' + esc(j.note) : ''}. Tahmindir; gerekirse sonra düzenle.</p>
                <div class="o2-field"><label>Öğün</label><div class="o2-segment" id="o2-photo-meal">${['Kahvaltı', 'Öğle', 'Ara öğün', 'Akşam'].map(x => `<button class="${x === meal ? 'active' : ''}" onclick="O2.formPick(this)">${x}</button>`).join('')}</div></div>
                <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:14px" onclick="O2.photoFoodAdd('${key}')">${I('check')}Günlüğe ekle</button>`;
        } catch (e) {
            const body = $('o2-sheet-layer').querySelector('.o2-sheet-body');
            if (body) body.innerHTML = `<div class="o2-empty">${I('camera')}<br>${esc(e.message || 'Fotoğraf okunamadı')}. Yiyeceklerin net göründüğü, üstten çekilmiş bir fotoğraf dene.</div>`;
        }
    };
    O2.photoFoodAdd = (key) => {
        const meal = document.querySelector('#o2-photo-meal .active').textContent;
        const picks = [...document.querySelectorAll('#o2-sheet-layer .o2-check.on')].map(b => photoItems[+b.dataset.i]).filter(Boolean);
        const log = O2.foodLog(key);
        picks.forEach((x, i) => log.push({ id: Date.now() + i, name: x.name, meal, amountLabel: x.grams ? `${x.grams} g · fotoğraf` : 'fotoğraf', kcal: x.kcal, p: x.p, c: x.c, f: x.f }));
        LS.set(`oly2_food_${key}`, log);
        O2.closeSheet(); O2.render();
        O2.toast(`${picks.length} yiyecek · ${picks.reduce((a, x) => a + x.kcal, 0)} kcal eklendi`, 'fuel');
    };

    // ==========================================
    // 🎤 AI MÜLAKAT KOMİSYONU (takip sorulu, puanlı)
    // ==========================================
    let panel = null;
    const acad = () => LS.get('oly2_academy', null) || {};
    O2.aiPanel = async () => {
        if (!hasKey()) return needKey();
        const s = O2.academySummary ? O2.academySummary() : null;
        panel = { log: [], done: false, who: s ? `${s.branch} ${s.track}` : 'kamu kurumu', busy: false };
        O2.sheet('AI mülakat komisyonu', `
            <div class="o2-chat" id="o2-chat"></div>
            <div id="o2-chat-input">
                <textarea class="o2-input" id="o2-chat-text" rows="3" style="height:auto;padding:12px;margin-top:12px" placeholder="Cevabını yaz ya da mikrofona söyle"></textarea>
                <div class="o2-grid-2" style="margin-top:10px">
                    ${SR ? `<button class="o2-btn o2-btn-ghost" id="o2-chat-mic" onclick="O2.aiPanelMic()">${I('mic')}Konuş</button>` : '<span></span>'}
                    <button class="o2-btn o2-btn-gold" onclick="O2.aiPanelSend()">Cevapla</button>
                </div>
            </div>`);
        await panelTurn();
    };
    const chatPaint = () => {
        const el = $('o2-chat');
        if (!el) return;
        el.innerHTML = panel.log.map(m => `<div class="o2-chat-msg ${m.role}"><small>${m.role === 'k' ? 'Komisyon' : 'Sen'}</small><p>${esc(m.text).replace(/\n/g, '<br>')}</p></div>`).join('') + (panel.busy ? '<div class="o2-chat-msg k"><p>…</p></div>' : '');
        el.scrollTop = el.scrollHeight;
    };
    async function panelTurn() {
        panel.busy = true; chatPaint();
        const transcript = panel.log.map(m => `${m.role === 'k' ? 'KOMİSYON' : 'ADAY'}: ${m.text}`).join('\n');
        const asked = panel.log.filter(m => m.role === 'k').length;
        const prompt = `Sen ${panel.who} mülakat komisyonu başkanısın. Gerçek bir mülakattaki gibi ciddi, kısa ve net konuş. Kurallar: Toplam 5 ana soru sor (kişisel, kurum bilgisi, mevzuat, güncel olay, durum sorusu karışık). Adayın cevabı eksik ya da yüzeyselse aynı konuda en fazla 1 kısa takip sorusu sor. Her mesajda yalnızca TEK soru sor, cevabı kendin verme. ${asked >= 7 ? '5 ana soru bitti: şimdi "DEĞERLENDİRME:" ile başlayan, 100 üzerinden puan ve 3 maddelik kısa geri bildirim yaz, başka soru sorma.' : ''}
Şimdiye kadarki konuşma:
${transcript || '(henüz başlamadı — adaya kısaca hoş geldin de ve ilk soruyu sor)'}
Komisyonun sıradaki mesajı:`;
        try {
            const text = String(await askGeminiAI(prompt) || '').replace(/^\s*KOMİSYON:\s*/i, '').trim();
            panel.log.push({ role: 'k', text });
            if (/DEĞERLENDİRME/i.test(text)) {
                panel.done = true;
                const score = (text.match(/(\d{1,3})\s*\/\s*100|(\d{1,3})\s*puan/i) || []).slice(1).find(Boolean);
                const list = LS.get('oly2_ai_interviews', []) || [];
                list.push({ d: O2.dayKey(), who: panel.who, score: score ? +score : null });
                LS.set('oly2_ai_interviews', list.slice(-30));
                const a = acad(); if (a.days && !a.days.includes(O2.dayKey())) { a.days.push(O2.dayKey()); LS.set('oly2_academy', a); }
                const inp = $('o2-chat-input'); if (inp) inp.innerHTML = `<button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:12px" onclick="O2.aiPanel()">Yeni mülakat</button>`;
            } else say(text);
        } catch (e) {
            panel.log.push({ role: 'k', text: 'Bağlantı sorunu: ' + (e.message || 'yanıt alınamadı') });
        }
        panel.busy = false; chatPaint();
    }
    O2.aiPanelSend = async () => {
        if (!panel || panel.busy || panel.done) return;
        const box = $('o2-chat-text');
        const text = box.value.trim();
        if (!text) { O2.toast('Cevabını yaz ya da söyle', 'chat'); return; }
        if ('speechSynthesis' in window) speechSynthesis.cancel();
        panel.log.push({ role: 'a', text: text.slice(0, 800) });
        box.value = '';
        await panelTurn();
    };
    let panelRec = null;
    O2.aiPanelMic = () => {
        if (panelRec) { try { panelRec.stop(); } catch (e) { } return; }
        if ('speechSynthesis' in window) speechSynthesis.cancel();
        panelRec = new SR();
        panelRec.lang = 'tr-TR'; panelRec.continuous = true; panelRec.interimResults = true;
        const box = $('o2-chat-text'), base = box.value ? box.value + ' ' : '';
        panelRec.onresult = (e) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; if ($('o2-chat-text')) $('o2-chat-text').value = base + t; };
        panelRec.onend = () => { panelRec = null; const b = $('o2-chat-mic'); if (b) b.classList.remove('on'); };
        try { panelRec.start(); $('o2-chat-mic').classList.add('on'); } catch (e) { panelRec = null; }
    };

    // 📰 Güncel olaylar destesi (AI üretir, Akademi kartlarına eklenir)
    O2.acadNewsDeck = async () => {
        if (!hasKey()) return needKey();
        const s = O2.academySummary ? O2.academySummary() : null;
        O2.toast('Güncel sorular hazırlanıyor…', 'spark');
        try {
            const text = await askGeminiAI(`${s ? s.branch + ' ' + s.track : 'Polis / jandarma / TSK'} mülakatlarında sorulabilecek, Türkiye ve dünyadaki önemli güncel gelişmeler ve kurumla ilgili güncel konular hakkında 10 soru-cevap kartı hazırla. Cevaplar kısa (1-2 cümle) ve doğru olsun; emin olmadığın, tarihi belirsiz ya da tartışmalı bilgileri ekleme. SADECE JSON dizi döndür: [{"q":"soru","a":"cevap"}]`);
            const m = String(text || '').match(/\[[\s\S]*\]/);
            const cards = m ? JSON.parse(m[0]).filter(x => x && x.q && x.a).slice(0, 10) : [];
            if (!cards.length) throw new Error('Kart üretilemedi');
            const a = acad();
            const seen = new Set((a.custom || []).map(x => x.q));
            a.custom = [...(a.custom || []), ...cards.filter(x => !seen.has(x.q)).map(x => ({ q: String(x.q).slice(0, 200), a: String(x.a).slice(0, 400), cat: 'Güncel (AI)', added: O2.dayKey() }))].slice(-80);
            LS.set('oly2_academy', a);
            O2.toast(`${cards.length} güncel kart eklendi · doğruluğunu kontrol et`, 'check');
            if (O2.acadPractice) setTimeout(() => O2.acadPractice(), 300);
        } catch (e) { O2.toast('Güncel kartlar alınamadı', 'bolt'); }
    };

    // ==========================================
    // 📄 AYLIK RAPOR (yazdır → PDF)
    // ==========================================
    O2.monthlyReport = (monthsAgo = 0) => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        const inM = (d) => d && d >= start && d < end;
        const sessions = O2.sessions().filter(s => inM(new Date(s.endedAt)));
        const lift = sessions.filter(s => s.type !== 'cardio');
        const cardio = sessions.filter(s => s.type === 'cardio');
        const vol = lift.reduce((a, s) => a + (s.volume || 0), 0);
        const min = Math.round(sessions.reduce((a, s) => a + (s.durationSec || 0), 0) / 60);
        const km = cardio.reduce((a, s) => a + (s.distanceKm || 0), 0);
        const prs = lift.flatMap(s => (s.prs || []).map(p => ({ ...p, d: s.dayKey })));
        const weights = (LS.get('olympus_history', []) || []).map(h => ({ d: O2.parseDate(h.date), w: parseFloat(h.weight) })).filter(x => inM(x.d) && x.w);
        const sleeps = (LS.get('olympus_sleep_history', []) || []).map(h => ({ d: O2.parseDate(h.date), v: parseFloat(h.val) })).filter(x => inM(x.d) && x.v);
        const a = LS.get('oly2_academy', null);
        const tests = a ? (a.tests || []).filter(t => inM(O2.parseDate(t.d))) : [];
        const reviews = Object.values(LS.get('oly2_reviews', {}) || {}).filter(r => inM(new Date(r.at)));
        const label = start.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
        const kpi = (l, v) => `<div class="k"><small>${l}</small><b>${v}</b></div>`;
        const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Olympus Training · ${label}</title>
        <style>
            *{box-sizing:border-box} body{margin:0;padding:36px;font:13px/1.55 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1b1b1f;background:#fff}
            h1{margin:0;font-size:28px;letter-spacing:-.5px} h2{margin:28px 0 10px;font-size:15px;letter-spacing:1.5px;text-transform:uppercase;color:#a07a2c}
            .top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #e6c374;padding-bottom:14px}
            .top span{color:#777;font-size:12px} .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
            .k{border:1px solid #eee;border-radius:12px;padding:12px} .k small{display:block;color:#888;font-size:10.5px;text-transform:uppercase;letter-spacing:1px} .k b{font-size:20px}
            table{width:100%;border-collapse:collapse} td,th{padding:7px 8px;border-bottom:1px solid #eee;text-align:left} th{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.8px}
            .muted{color:#888} @media print{body{padding:0} .noprint{display:none}}
        </style></head><body>
            <div class="top"><div><h1>Olympus Training</h1><span>Aylık rapor · ${esc(label)} · ${esc(O2.userName())}</span></div><span>${new Date().toLocaleDateString('tr-TR')}</span></div>
            <h2>Özet</h2>
            <div class="grid">${kpi('Antrenman', lift.length)}${kpi('Toplam hacim', O2.fmtNum(vol / 1000, 1) + ' ton')}${kpi('Aktif süre', Math.floor(min / 60) + ' sa ' + (min % 60) + ' dk')}${kpi('Kardiyo', O2.fmtNum(km, 1) + ' km')}
            ${kpi('Kişisel rekor', prs.length)}${kpi('Kilo', weights.length ? `${O2.fmtNum(weights[0].w, 1)} → ${O2.fmtNum(weights[weights.length - 1].w, 1)}` : '—')}${kpi('Uyku ort.', sleeps.length ? O2.fmtNum(sleeps.reduce((s, x) => s + x.v, 0) / sleeps.length, 1) + ' sa' : '—')}${kpi('Akademi testi', tests.length)}</div>
            ${prs.length ? `<h2>Kişisel rekorlar</h2><table><tr><th>Tarih</th><th>Hareket</th><th>Set</th><th>Tahmini 1RM</th></tr>${prs.map(p => `<tr><td>${esc(O2.prettyDate(p.d))}</td><td>${esc(p.ex)}</td><td>${O2.fmtNum(p.w, 1)} kg × ${p.r}</td><td>${O2.fmtNum(p.e1rm || 0, 1)} kg</td></tr>`).join('')}</table>` : ''}
            <h2>Seanslar</h2>${sessions.length ? `<table><tr><th>Tarih</th><th>Seans</th><th>Süre</th><th>Hacim / Mesafe</th></tr>${sessions.map(s => `<tr><td>${esc(O2.prettyDate(s.dayKey))}</td><td>${esc(String(s.title || '').slice(0, 40))}</td><td>${Math.round((s.durationSec || 0) / 60)} dk</td><td>${s.type === 'cardio' ? O2.fmtNum(s.distanceKm || 0, 2) + ' km' : O2.fmtNum((s.volume || 0) / 1000, 2) + ' ton'}</td></tr>`).join('')}</table>` : '<p class="muted">Bu ay seans kaydı yok.</p>'}
            ${tests.length ? `<h2>Akademi fiziki testleri</h2><table><tr><th>Tarih</th><th>Sonuçlar</th></tr>${tests.map(t => `<tr><td>${esc(O2.prettyDate(t.d))}</td><td>${Object.entries(t.res || {}).map(([k, v]) => `${esc(k)}: ${v}`).join(' · ')}</td></tr>`).join('')}</table>` : ''}
            ${reviews.length ? `<h2>Haftalık değerlendirmeler</h2><table><tr><th>Enerji</th><th>Ruh hali</th><th>Stres</th><th>Not</th></tr>${reviews.map(r => `<tr><td>${r.energy || '—'}/5</td><td>${r.mood || '—'}/5</td><td>${r.stress || '—'}/5</td><td>${esc(r.good || r.hard || '')}</td></tr>`).join('')}</table>` : ''}
            <p class="noprint" style="margin-top:30px;color:#888">PDF olarak kaydetmek için yazdırma penceresinde "PDF olarak kaydet"i seç.</p>
            <script>setTimeout(function(){window.print()},400)<\/script>
        </body></html>`;
        const w = window.open('', '_blank');
        if (w) { w.document.open(); w.document.write(html); w.document.close(); return; }
        // Açılır pencere engellendiyse dosya olarak indir
        const blob = new Blob([html], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `olympus-rapor-${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}.html`;
        document.body.appendChild(link); link.click(); link.remove();
        O2.toast('Rapor indirildi · açıp yazdır → PDF', 'list');
    };

    // ==========================================
    // 🔐 VERİ & GİZLİLİK
    // ==========================================
    const CATS = [
        ['Antrenman', /^(oly2_sessions|oly2_active_session|olympus_past_workouts|olympus_ex_history|olympus_worked_muscles|olympus_vol_history|olympus_custom_profiles|oly2_settings)/],
        ['Beslenme & diyet', /^(oly2_food_|oly2_meals_|oly2_supps_|oly2_diet|oly2_meal_|olympus_water|olympus_supp)/],
        ['Vücut & sağlık', /^(olympus_history|olympus_profile|olympus_sleep|olympus_bpm|olympus_cardio_history|olympus_active_kcal|olympus_fat|oly2_pain|oly2_health)/],
        ['Fotoğraflar', /^(olympus_progress_photos|olympus_hub_photos)/],
        ['Akademi', /^(oly2_academy|olympus_sec_|olympus_fc_|oly2_ai_interviews)/],
        ['Akış & değerlendirme', /^(oly2_flow|oly2_reviews|oly2_reminders)/],
        ['Super App modülleri', /^(kpss_|bank_|gar_|goldnova_|culbase_|olympus_kpss|olympus_camp|diet$)/],
        ['Dilala', /^dilala_|^olympus_dilala/]
    ];
    O2.privacySheet = () => {
        const sizes = CATS.map(([n, re]) => {
            let b = 0, c = 0;
            for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (re.test(k)) { b += (localStorage.getItem(k) || '').length; c++; } }
            return { n, b, c };
        });
        const fmt = (n) => n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n > 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`;
        const u = typeof auth !== 'undefined' && auth.currentUser;
        O2.sheet('Veri & gizlilik', `
            <p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:var(--o2-text-2)">Verilerin bu cihazda tutulur${u ? ' ve yalnızca senin hesabına bağlı bulut yedeğine yazılır' : ''}. Reklam ya da üçüncü taraf paylaşımı yok. Gemini kullanan özellikler (AI plan, fotoğraf, mülakat) yalnızca o istekteki metni/görseli Google'a gönderir.</p>
            <div class="o2-card" style="padding:4px 16px"><div class="o2-list">${sizes.map(x => `
                <div class="o2-row"><div class="o2-row-main"><h5>${x.n}</h5><p>${x.c} kayıt</p></div><div class="o2-row-end"><strong>${x.c ? fmt(x.b) : '—'}</strong></div></div>`).join('')}</div></div>
            <div class="o2-grid-2" style="margin-top:14px">
                <button class="o2-btn o2-btn-ghost" onclick="O2.backup && O2.backup.exportFile()">${I('list')}Tümünü indir</button>
                <button class="o2-btn o2-btn-ghost" onclick="O2.backupSheet && O2.backupSheet()">${I('swap')}Yedek ayarları</button>
            </div>
            <button class="o2-btn o2-btn-danger o2-btn-block" style="margin-top:12px" onclick="O2.deleteAllData()">Tüm verilerimi kalıcı olarak sil</button>
            <p style="margin:10px 0 0;font-size:11.5px;line-height:1.5;color:var(--o2-text-3)">Silme işlemi bu cihazdaki ve buluttaki yedeği kapsar, geri alınamaz. Önce "Tümünü indir" ile bir kopya almanı öneririm.</p>`);
    };
    O2.deleteAllData = async () => {
        const typed = prompt('Bu işlem geri alınamaz. Tüm antrenman, beslenme, Akademi ve diğer veriler bu cihazdan ve bulut yedeğinden silinecek.\nOnaylamak için SİL yaz:');
        if (String(typed || '').trim().toLocaleUpperCase('tr') !== 'SİL') { O2.toast('Silme iptal edildi', 'check'); return; }
        const u = typeof auth !== 'undefined' && auth.currentUser;
        try {
            if (u) {
                const snap = await db.collection('users').doc(u.uid).collection('kv').get();
                await Promise.all(snap.docs.map(d => d.ref.delete()));
            }
        } catch (e) { console.warn('Bulut yedeği silinemedi:', e); }
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^(olympus_|oly2_|dilala_|kpss_|bank_|gar_|goldnova_|culbase_|__oly_kv|diet$)/.test(k)) keys.push(k); }
        keys.forEach(k => localStorage.removeItem(k));
        sessionStorage.clear();
        alert('Tüm veriler silindi. Uygulama yeniden başlatılıyor.');
        location.reload();
    };

    // Profil → Verilerim altına
    O2.profileExtras = () => `
        <div class="o2-card" style="margin-top:12px">
            <div class="o2-coach"><div class="o2-coach-orb" style="background:rgba(255,255,255,.08);color:var(--o2-text);box-shadow:none">${I('trophy')}</div><div style="flex:1"><h4>Aylık rapor (PDF)</h4><p>Seanslar, rekorlar, kilo, uyku ve Akademi testleri tek sayfada; yazdır → PDF olarak kaydet.</p></div></div>
            <div class="o2-grid-2" style="margin-top:14px"><button class="o2-btn o2-btn-ghost" onclick="O2.monthlyReport(0)">Bu ay</button><button class="o2-btn o2-btn-ghost" onclick="O2.monthlyReport(1)">Geçen ay</button></div>
        </div>
        <div class="o2-card is-tap" style="margin-top:12px" onclick="O2.privacySheet()">
            <div class="o2-coach"><div class="o2-coach-orb" style="background:rgba(255,255,255,.08);color:var(--o2-text);box-shadow:none">${I('shield')}</div><div style="flex:1"><h4>Veri & gizlilik</h4><p>Hangi veri ne kadar yer kaplıyor, tümünü indir ya da kalıcı olarak sil</p></div>${I('chev', 'chev')}</div>
        </div>
        <div class="o2-card is-tap" style="margin-top:12px" onclick="O2.painSheet()">
            <div class="o2-coach"><div class="o2-coach-orb" style="background:rgba(255,90,95,.12);color:var(--o2-red);box-shadow:none">${I('heart')}</div><div style="flex:1"><h4>Ağrı & sakatlık kaydı</h4><p>${O2.pains().length ? `${O2.pains().length} aktif kayıt · oynatıcı uyarıyor` : 'Aktif kayıt yok'}</p></div>${I('chev', 'chev')}</div>
        </div>`;

    // Akıllı uyarılara aktif ağrı kaydını ekle
    const baseAlerts = O2.smartAlerts;
    if (baseAlerts) O2.smartAlerts = () => {
        const list = baseAlerts();
        const p = O2.pains().sort((a, b) => b.level - a.level)[0];
        const dismissed = LS.get('oly2_alert_dismiss', {}) || {};
        if (p && dismissed.pain !== O2.dayKey()) list.unshift({ id: 'pain', level: p.level >= 3 ? 'warn' : 'info', icon: 'heart', title: `${p.region} ağrısı (${p.level}/5) kayıtlı`, text: 'İlgili hareketlerde alternatif öneriyorum. Geçtiyse "İyileşti" olarak işaretle.', action: 'pain' });
        return list;
    };
    O2.actions = O2.actions || {};
    O2.actions.pain = () => O2.painSheet();
})();
