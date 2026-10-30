// Olympus Training — besin günlüğü, ısınma & plaka hesabı, profil (başarımlar, takvim, dışa aktarma),
// hareket kütüphanesi (teknik ipuçları), gelişim fotoğrafı karşılaştırma
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);

    // ==========================================
    // 🍽️ BESİN GÜNLÜĞÜ
    // ==========================================
    // Porsiyon başına: [ad, porsiyon, kcal, protein, karb, yağ]
    const FOODS = [
        ['Yumurta', '1 adet', 78, 6.3, .6, 5.3], ['Yulaf ezmesi', '50 g', 190, 6.5, 33, 3.5], ['Tavuk göğsü', '100 g', 165, 31, 0, 3.6],
        ['Pirinç pilavı', '150 g pişmiş', 195, 4, 42, 1], ['Makarna', '150 g pişmiş', 235, 8, 46, 1.5], ['Tam buğday ekmeği', '1 dilim', 70, 3.5, 12, 1],
        ['Lor peyniri', '100 g', 98, 12, 3, 4.5], ['Süzme yoğurt', '150 g', 150, 15, 6, 7], ['Whey protein', '1 ölçek', 120, 24, 3, 1.5],
        ['Muz', '1 orta', 105, 1.3, 27, .4], ['Elma', '1 orta', 95, .5, 25, .3], ['Ton balığı', '1 kutu süzülmüş', 130, 29, 0, 1],
        ['Kırmızı et', '100 g', 250, 26, 0, 17], ['Köfte', '100 g', 230, 18, 6, 15], ['Fıstık ezmesi', '15 g', 94, 3.6, 3, 8],
        ['Badem', '30 g', 174, 6.4, 6.5, 15], ['Beyaz peynir', '30 g', 90, 5, 1, 7], ['Mercimek çorbası', '1 kase', 180, 10, 28, 4],
        ['Fırın patates', '200 g', 186, 5, 42, .2], ['Süt', '250 ml', 155, 8, 12, 8], ['Kefir', '250 ml', 140, 9, 11, 7],
        ['Pirinç patlağı', '1 adet', 35, .7, 7.5, .3], ['Bal', '1 tatlı kaşığı', 30, 0, 8, 0], ['Zeytinyağı', '1 yemek kaşığı', 120, 0, 0, 14],
        ['Somon', '100 g', 208, 20, 0, 13], ['Hindi füme', '50 g', 55, 9, 1, 1.5], ['Nohut yemeği', '1 porsiyon', 260, 12, 35, 8], ['Salata', '1 kase', 60, 2, 8, 2.5]
    ].map(([name, unit, kcal, p, c, f]) => ({ name, unit, kcal, p, c, f }));
    const MEALS = ['Kahvaltı', 'Öğle', 'Ara öğün', 'Akşam'];

    O2.foodLog = (key = O2.dayKey()) => LS.get(`oly2_food_${key}`, []) || [];
    O2.foodTotals = (key) => O2.foodLog(key).reduce((a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.p, c: a.c + x.c, f: a.f + x.f }), { kcal: 0, p: 0, c: 0, f: 0 });

    // Beslenme sekmesindeki günlük kartı
    O2.foodCard = (key, mac) => {
        const t = O2.foodTotals(key);
        const log = O2.foodLog(key);
        const bar = (v, max, color) => `<div class="o2-bar" style="height:7px"><i data-w="${Math.min(100, Math.round(v / max * 100))}%" style="width:0;background:${color}"></i></div>`;
        const left = Math.round(mac.kcal - t.kcal);
        return `
        <div class="o2-card o2-card-glow">
            <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px">
                <div><div class="o2-eyebrow">Alınan</div><div style="font-size:34px;font-weight:800;letter-spacing:-1.2px;margin-top:4px">${O2.fmtNum(t.kcal)}<span style="font-size:14px;color:var(--o2-text-3);letter-spacing:0"> / ${O2.fmtNum(mac.kcal)} kcal</span></div></div>
                <span class="o2-chip ${left >= 0 ? 'green' : 'orange'}">${left >= 0 ? `${O2.fmtNum(left)} kcal kaldı` : `${O2.fmtNum(-left)} kcal fazla`}</span>
            </div>
            <div class="o2-food-macros">
                <div><span>Protein</span><b>${Math.round(t.p)} / ${mac.protein} g</b>${bar(t.p, mac.protein, 'var(--o2-gold)')}</div>
                <div><span>Karb</span><b>${Math.round(t.c)} / ${mac.carb} g</b>${bar(t.c, mac.carb, 'var(--o2-blue)')}</div>
                <div><span>Yağ</span><b>${Math.round(t.f)} / ${mac.fat} g</b>${bar(t.f, mac.fat, 'var(--o2-orange)')}</div>
            </div>
            ${log.length ? `<div class="o2-list" style="margin-top:8px">${MEALS.filter(m => log.some(x => x.meal === m)).map(m => `
                <div class="o2-food-meal">${m}</div>
                ${log.filter(x => x.meal === m).map(x => `
                <div class="o2-row" style="padding:10px 0">
                    <div class="o2-row-main"><h5 style="font-size:14px">${esc(x.name)}</h5><p>${esc(x.amountLabel || '')} · P ${Math.round(x.p)} · K ${Math.round(x.c)} · Y ${Math.round(x.f)}</p></div>
                    <div class="o2-row-end"><strong style="font-size:14px">${Math.round(x.kcal)}</strong>kcal</div>
                    <button class="o2-icon-btn" style="width:30px;height:30px;border:0;background:none" onclick="O2.removeFood('${key}', ${x.id})" aria-label="Sil">${I('close')}</button>
                </div>`).join('')}`).join('')}</div>` : ''}
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:14px" onclick="O2.foodSheet('${key}')">${I('plus')}Besin ekle</button>
        </div>`;
    };

    O2.foodSheet = (key, query = '') => {
        const recent = LS.get('oly2_food_recent', []) || [];
        const all = [...recent.filter(r => !FOODS.some(f => f.name === r.name)), ...FOODS];
        const list = all.filter(f => !query || f.name.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')));
        const hour = new Date().getHours();
        const defMeal = hour < 11 ? 'Kahvaltı' : hour < 15 ? 'Öğle' : hour < 18 ? 'Ara öğün' : 'Akşam';
        const body = `
            <input class="o2-input" id="o2-food-q" placeholder="Besin ara" value="${esc(query)}" oninput="O2.foodSheet('${key}', this.value)">
            <div class="o2-segment" id="o2-food-meal" style="margin-top:10px">${MEALS.map(m => `<button class="${m === (O2.ui.foodMeal || defMeal) ? 'active' : ''}" onclick="O2.formPick(this); O2.ui.foodMeal='${m}'">${m}</button>`).join('')}</div>
            <div class="o2-list" style="margin-top:6px">
                <div class="o2-row is-tap" onclick="O2.barcodeSheet('${key}')"><div class="o2-row-idx" style="color:var(--o2-gold)">${I('camera')}</div><div class="o2-row-main"><h5>Barkod tara</h5><p>Paketli ürünü kamerayla bul</p></div>${I('chev', 'chev')}</div>
                ${query.trim().length >= 3 ? `<div class="o2-row is-tap" onclick="O2.foodOnlineSearch('${key}', document.getElementById('o2-food-q').value)"><div class="o2-row-idx" style="color:var(--o2-blue)">${I('spark')}</div><div class="o2-row-main"><h5>İnternette ara: "${esc(query.trim())}"</h5><p>Open Food Facts · 100 g değerleri</p></div></div><div id="o2-food-online"></div>` : ''}
                ${list.map(f => `
                <div class="o2-row is-tap" onclick="O2.foodAmountSheet('${key}', ${jsArg(JSON.stringify(f))})">
                    <div class="o2-row-main"><h5>${esc(f.name)}</h5><p>${esc(f.unit)} · P ${f.p} · K ${f.c} · Y ${f.f}</p></div>
                    <div class="o2-row-end"><strong>${f.kcal}</strong>kcal</div>
                </div>`).join('')}
                <div class="o2-row is-tap" onclick="O2.customFoodSheet('${key}')"><div class="o2-row-idx" style="color:var(--o2-gold)">${I('plus')}</div><div class="o2-row-main"><h5>Özel besin ekle</h5><p>Etiketteki değerleri gir</p></div></div>
            </div>`;
        if (O2.isSheetOpen() && $('o2-food-q')) {
            const pos = $('o2-food-q').selectionStart;
            $('o2-sheet-layer').querySelector('.o2-sheet-body').innerHTML = body;
            $('o2-food-q').focus();
            try { $('o2-food-q').setSelectionRange(pos, pos); } catch (e) { }
        } else {
            O2.ui.foodMeal = defMeal;
            O2.sheet('Besin ekle', body);
        }
    };

    O2.foodAmountSheet = (key, json) => {
        const f = JSON.parse(json);
        const meal = O2.ui.foodMeal || 'Öğle';
        O2.sheet(f.name, `
            <p style="margin:0;color:var(--o2-text-2);font-size:13px">1 porsiyon = ${esc(f.unit)} · ${f.kcal} kcal</p>
            <div class="o2-field"><label>Porsiyon</label>
                <div class="o2-stepper"><button onclick="O2.step('o2-food-qty', -.5); O2.foodPreview()">−</button><input class="o2-input" id="o2-food-qty" type="number" step=".5" value="1" oninput="O2.foodPreview()"><button onclick="O2.step('o2-food-qty', .5); O2.foodPreview()">+</button></div>
            </div>
            <div class="o2-card" id="o2-food-preview" data-food="${esc(json)}" style="margin-top:14px"></div>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:16px" onclick="O2.addFood('${key}', '${esc(meal)}')">${esc(meal)} öğününe ekle</button>`);
        O2.foodPreview();
    };
    O2.foodPreview = () => {
        const el = $('o2-food-preview');
        if (!el) return;
        const f = JSON.parse(el.dataset.food);
        const q = Math.max(.25, parseFloat($('o2-food-qty').value) || 1);
        el.innerHTML = `<div class="o2-grid-3" style="grid-template-columns:repeat(4,1fr)">${[['Kalori', Math.round(f.kcal * q), ''], ['Protein', Math.round(f.p * q), 'g'], ['Karb', Math.round(f.c * q), 'g'], ['Yağ', Math.round(f.f * q), 'g']].map(([l, v, u]) => `<div style="text-align:center"><div class="o2-eyebrow" style="letter-spacing:.6px">${l}</div><div style="font-size:20px;font-weight:800;margin-top:4px">${v}<span style="font-size:11px;color:var(--o2-text-3)">${u}</span></div></div>`).join('')}</div>`;
    };
    O2.addFood = (key, meal) => {
        const f = JSON.parse($('o2-food-preview').dataset.food);
        const q = Math.max(.25, parseFloat($('o2-food-qty').value) || 1);
        const log = O2.foodLog(key);
        log.push({ id: Date.now(), name: f.name, meal, amountLabel: `${q === 1 ? '' : q + ' × '}${f.unit}`, kcal: f.kcal * q, p: f.p * q, c: f.c * q, f: f.f * q });
        LS.set(`oly2_food_${key}`, log);
        const recent = (LS.get('oly2_food_recent', []) || []).filter(r => r.name !== f.name);
        recent.unshift(f);
        LS.set('oly2_food_recent', recent.slice(0, 12));
        O2.closeSheet(); O2.render(); O2.toast(`${f.name} eklendi`, 'fuel');
    };
    O2.removeFood = (key, id) => { LS.set(`oly2_food_${key}`, O2.foodLog(key).filter(x => x.id !== id)); O2.render(); };
    O2.customFoodSheet = (key) => {
        O2.sheet('Özel besin', `
            <div class="o2-field" style="margin-top:0"><label>Ad</label><input class="o2-input" id="o2-cf-name" placeholder="Ör. Protein bar"></div>
            <div class="o2-field"><label>Porsiyon</label><input class="o2-input" id="o2-cf-unit" placeholder="Ör. 1 adet (60 g)"></div>
            <div class="o2-grid-2">${[['kcal', 'Kalori'], ['p', 'Protein (g)'], ['c', 'Karbonhidrat (g)'], ['f', 'Yağ (g)']].map(([k, l]) => `<div class="o2-field"><label>${l}</label><input class="o2-input" id="o2-cf-${k}" type="number" inputmode="decimal"></div>`).join('')}</div>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:18px" onclick="O2.saveCustomFood('${key}')">Devam</button>`);
    };
    O2.saveCustomFood = (key) => {
        const name = $('o2-cf-name').value.trim();
        const kcal = parseFloat($('o2-cf-kcal').value);
        if (!name || !(kcal >= 0)) { O2.toast('Ad ve kaloriyi gir', 'fuel'); return; }
        const f = { name, unit: $('o2-cf-unit').value.trim() || '1 porsiyon', kcal, p: parseFloat($('o2-cf-p').value) || 0, c: parseFloat($('o2-cf-c').value) || 0, f: parseFloat($('o2-cf-f').value) || 0 };
        O2.foodAmountSheet(key, JSON.stringify(f));
    };

    // ==========================================
    // 🔥 ISINMA SETLERİ & 🏋️ PLAKA HESABI
    // ==========================================
    const COMPOUND = /bench|squat|deadlift|romanian|press|row|pull-?up|hip thrust|leg press|dips/i;
    O2.isCompound = (name) => COMPOUND.test(name) && !/fly|curl|raise|extension|pushdown/i.test(name);
    // Plaka hesabı sadece halterle yapılan hareketlerde anlamlı
    O2.isBarbell = (name) => /bench press|squat|deadlift|barbell|military|hip thrust|close grip|ez bar|romanian|row/i.test(name)
        && !/dumbbell|db|machine|cable|goblet|smith|leg press|supported|one arm|seated|inverted|bulgarian/i.test(name);
    const round25 = (v) => Math.round(v / 2.5) * 2.5;

    O2.warmupHTML = (ex) => {
        const w = parseFloat(ex.sets[0] && ex.sets[0].w);
        if (!O2.isCompound(ex.name) || !w || w < 30) return '';
        const bar = /dumbbell|db /i.test(ex.name) ? null : 20;
        const rows = [[bar ? bar : round25(w * .3), 10], [round25(w * .5), 5], [round25(w * .7), 3], [round25(w * .85), 1]]
            .filter(([kg], i, arr) => kg < w && (i === 0 || kg > arr[i - 1][0]));
        return `
        <details class="o2-warmup">
            <summary>${I('flame')}Isınma setleri <span>${rows.length} set · çalışma ağırlığı ${O2.fmtNum(w, 1)} kg</span></summary>
            <div class="o2-chips" style="margin-top:12px">${rows.map(([kg, r]) => `<span class="o2-chip">${O2.fmtNum(kg, 1)} kg × ${r}</span>`).join('')}</div>
            <p style="margin:10px 0 0;font-size:12px;color:var(--o2-text-3);line-height:1.5">Isınma setlerinde tükenme yok; aralarda 45-60 sn yeter. Kayda geçmez.</p>
        </details>`;
    };

    const PLATES = [[25, '#e74c3c'], [20, '#3b82f6'], [15, '#eab308'], [10, '#22c55e'], [5, '#e5e7eb'], [2.5, '#a1a1aa'], [1.25, '#71717a']];
    O2.plateSheet = (weight) => {
        weight = parseFloat(weight) || 0;
        const render = (bar) => {
            let side = Math.max(0, (weight - bar) / 2);
            const used = [];
            PLATES.forEach(([p, color]) => { while (side >= p - 1e-9) { used.push([p, color]); side -= p; } });
            const rest = Math.round(side * 100) / 100;
            return `
                <div class="o2-plates">
                    <i class="o2-plate-bar"></i>
                    ${used.map(([p, color]) => `<i class="o2-plate" style="--h:${40 + p * 2.2}px;background:${color}" title="${p} kg"></i>`).join('')}
                    <i class="o2-plate-sleeve"></i>
                </div>
                <div class="o2-chips" style="justify-content:center;margin-top:12px">${used.length ? Object.entries(used.reduce((a, [p]) => { a[p] = (a[p] || 0) + 1; return a; }, {})).sort((a, b) => b[0] - a[0]).map(([p, n]) => `<span class="o2-chip">${n} × ${O2.fmtNum(+p, 2)} kg</span>`).join('') : '<span class="o2-chip">Sadece bar</span>'}</div>
                ${rest > 0 ? `<p style="margin:10px 0 0;text-align:center;font-size:12px;color:var(--o2-orange)">${O2.fmtNum(rest * 2, 2)} kg plakalarla tam karşılanamıyor</p>` : ''}`;
        };
        O2.sheet('Plaka hesabı', `
            <div style="text-align:center"><div class="o2-eyebrow">Hedef ağırlık</div><div style="font-size:40px;font-weight:800;letter-spacing:-1.5px;margin-top:4px">${O2.fmtNum(weight, 1)} kg</div><p style="margin:4px 0 14px;font-size:12px;color:var(--o2-text-3)">Her bir tarafa takılacak plakalar</p></div>
            <div class="o2-segment" style="margin-bottom:12px"><button class="active" onclick="O2.formPick(this); document.getElementById('o2-plate-out').innerHTML=O2.plateRender(${weight},20)">Olimpik bar 20 kg</button><button onclick="O2.formPick(this); document.getElementById('o2-plate-out').innerHTML=O2.plateRender(${weight},15)">Kadın bar 15 kg</button><button onclick="O2.formPick(this); document.getElementById('o2-plate-out').innerHTML=O2.plateRender(${weight},10)">EZ bar 10 kg</button></div>
            <div id="o2-plate-out">${render(20)}</div>`);
        O2.plateRender = (w, bar) => { weight = w; return render(bar); };
    };

    // ==========================================
    // 👤 PROFİL: ömür boyu istatistik, başarımlar, takvim, dışa aktarma
    // ==========================================
    O2.lifetime = () => {
        const s = O2.sessions();
        const strength = s.filter(x => x.type !== 'cardio');
        let longest = 0, run = 0;
        const target = O2.settings().weeklyTarget;
        for (let i = 103; i >= 0; i--) { if (O2.weekStats(i).sessions >= target) { run++; longest = Math.max(longest, run); } else run = 0; }
        return {
            sessions: s.length + (LS.get('olympus_past_workouts', []) || []).filter(w => !String(w.id || '').startsWith('o2')).length,
            volume: strength.reduce((a, x) => a + (x.volume || 0), 0),
            km: s.reduce((a, x) => a + (x.distanceKm || 0), 0),
            prs: s.reduce((a, x) => a + (x.prs || []).length, 0),
            days: O2.activityDays().size,
            longest,
            first: s.length ? new Date(Math.min(...s.map(x => x.startedAt || x.endedAt))) : null,
            early: s.some(x => new Date(x.startedAt).getHours() < 8),
            night: s.some(x => new Date(x.startedAt).getHours() >= 22),
            photos: (LS.get('olympus_progress_photos', []) || []).length
        };
    };

    const ACHIEVEMENTS = [
        ['play', 'İlk Adım', 'İlk seansını tamamla', l => [l.sessions, 1]],
        ['bolt', 'Disiplin', '10 seans tamamla', l => [l.sessions, 10]],
        ['shield', 'Demir İrade', '50 seans tamamla', l => [l.sessions, 50]],
        ['train', '10 Ton', 'Toplam 10.000 kg kaldır', l => [l.volume, 10000]],
        ['trophy', '100 Ton', 'Toplam 100.000 kg kaldır', l => [l.volume, 100000]],
        ['medal', 'Rekor Avcısı', '5 kişisel rekor kır', l => [l.prs, 5]],
        ['flame', 'Tutarlılık', '4 hafta üst üste hedefe ulaş', l => [l.longest, 4]],
        ['run', 'Yolcu', '50 km kardiyo', l => [l.km, 50]],
        ['spark', 'Erkenci', '08:00\'den önce antrenman yap', l => [l.early ? 1 : 0, 1]],
        ['moon', 'Gece Kuşu', '22:00\'den sonra antrenman yap', l => [l.night ? 1 : 0, 1]],
        ['camera', 'Ayna', 'İlk gelişim fotoğrafını ekle', l => [l.photos, 1]],
        ['heart', 'Sadık', '30 farklı gün aktif ol', l => [l.days, 30]]
    ];

    O2.renderProfile = () => {
        const l = O2.lifetime();
        const user = typeof auth !== 'undefined' && auth.currentUser;
        const photo = $('o2-avatar-img').src;
        const achieved = ACHIEVEMENTS.map(a => { const [v, t] = a[3](l); return { a, v, t, done: v >= t }; });
        const doneCount = achieved.filter(x => x.done).length;
        return `
        <div class="o2-stagger">
            <div class="o2-profile-head">
                <div class="o2-avatar" style="width:84px;height:84px"><img src="${esc(photo)}" alt=""></div>
                <h1>${esc((user && user.displayName) || O2.userName())}</h1>
                <p>${l.first ? `Olympus Training · ${l.first.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}'den beri` : 'Olympus Training'}</p>
                <div style="display:flex;gap:8px;justify-content:center;margin-top:14px">
                    <button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.settingsSheet()">${I('settings')}Ayarlar</button>
                    <button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.go('library')">${I('list')}Hareket kütüphanesi</button>
                </div>
            </div>

            <div class="o2-grid-3" style="margin-top:22px">
                ${[['Seans', l.sessions, ''], ['Hacim', O2.fmtNum(l.volume / 1000, 1), ' ton'], ['Kardiyo', O2.fmtNum(l.km, 1), ' km'], ['Rekor', l.prs, ''], ['Aktif gün', l.days, ''], ['Seri rekoru', l.longest, ' hf']].map(([k, v, u]) => `
                <div class="o2-card o2-stat"><small>${k}</small><strong>${v}<small>${u}</small></strong></div>`).join('')}
            </div>

            <div class="o2-section-head"><h3>Başarımlar</h3><span class="o2-link" style="color:var(--o2-text-3)">${doneCount}/${ACHIEVEMENTS.length}</span></div>
            <div class="o2-achievements">${achieved.map(({ a, v, t, done }) => `
                <div class="o2-ach ${done ? 'done' : ''}">
                    <i>${I(a[0])}</i>
                    <h5>${a[1]}</h5><p>${a[2]}</p>
                    ${done ? '<span class="o2-chip gold" style="margin-top:8px">Kazanıldı</span>' : `<div class="o2-bar" style="margin-top:10px"><i data-w="${Math.min(100, Math.round(v / t * 100))}%" style="width:0;background:var(--o2-gold-grad)"></i></div>`}
                </div>`).join('')}</div>

            <div class="o2-section-head"><h3>Meydan okumalar</h3><span class="o2-link" style="color:var(--o2-text-3)">bu ay</span></div>
            ${O2.challengeCards()}

            <div class="o2-section-head"><h3>Takvim</h3><div style="display:flex;gap:6px"><button class="o2-icon-btn" style="width:32px;height:32px" onclick="O2.calMonth(-1)" aria-label="Önceki ay">${I('back')}</button><button class="o2-icon-btn" style="width:32px;height:32px" onclick="O2.calMonth(1)" aria-label="Sonraki ay">${I('chev')}</button></div></div>
            <div class="o2-card">${calendarHTML()}</div>

            <div class="o2-section-head"><h3>Verilerim</h3></div>
            <div class="o2-card">
                <div class="o2-coach"><div class="o2-coach-orb" style="background:rgba(255,255,255,.08);color:var(--o2-text);box-shadow:none">${I('list')}</div><div style="flex:1"><h4>Dışa aktar (CSV)</h4><p>Tüm seansların, kardiyoların ve kilo kayıtların Excel/Sheets'te açılabilir dosya olarak.</p></div></div>
                <button class="o2-btn o2-btn-ghost o2-btn-block" style="margin-top:14px" onclick="O2.exportCSV()">Dosyayı indir</button>
            </div>
        </div>`;
    };

    function calendarHTML() {
        const base = new Date();
        base.setDate(1);
        base.setMonth(base.getMonth() + (O2.ui.calOffset || 0));
        const y = base.getFullYear(), m = base.getMonth();
        const first = (new Date(y, m, 1).getDay() + 6) % 7;
        const days = new Date(y, m + 1, 0).getDate();
        const byDay = {};
        O2.sessions().forEach(s => { (byDay[s.dayKey] = byDay[s.dayKey] || []).push(s); });
        (LS.get('olympus_past_workouts', []) || []).forEach(w => {
            if (String(w.id || '').startsWith('o2')) return;
            const d = O2.parseDate(w.date);
            if (d) (byDay[O2.dayKey(d)] = byDay[O2.dayKey(d)] || []).push({ legacy: true, title: w.title });
        });
        const today = O2.dayKey();
        let cells = '';
        for (let i = 0; i < first; i++) cells += '<i></i>';
        for (let d = 1; d <= days; d++) {
            const k = O2.dayKey(new Date(y, m, d));
            const list = byDay[k] || [];
            const dots = list.slice(0, 3).map(s => `<b style="background:${s.type === 'cardio' ? 'var(--o2-orange)' : 'var(--o2-gold)'}"></b>`).join('');
            cells += `<button class="${list.length ? 'has' : ''} ${k === today ? 'today' : ''}" ${list.length ? `onclick="O2.calDay('${k}')"` : ''}><span>${d}</span><em>${dots}</em></button>`;
        }
        return `<div style="text-align:center;font-weight:800;font-size:15px;margin-bottom:12px">${base.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</div>
            <div class="o2-cal">${O2.WEEKDAYS.map(d => `<small>${d}</small>`).join('')}${cells}</div>
            <div class="o2-chips" style="justify-content:center;margin-top:12px"><span class="o2-chip"><b style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--o2-gold)"></b>Ağırlık</span><span class="o2-chip"><b style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--o2-orange)"></b>Kardiyo</span></div>`;
    }
    O2.calMonth = (d) => { O2.ui.calOffset = (O2.ui.calOffset || 0) + d; O2.haptic(6); O2.render(); };
    O2.calDay = (k) => {
        const list = O2.sessions().filter(s => s.dayKey === k);
        if (list.length === 1) return O2.sessionSheet(list[0].id);
        O2.sheet(O2.prettyDate(k), `<div class="o2-list">${list.map(s => `
            <div class="o2-row is-tap" onclick="O2.sessionSheet('${esc(s.id)}')"><div class="o2-row-main"><h5>${esc(s.title)}</h5><p>${O2.fmtClock(s.durationSec)}${s.type === 'cardio' ? ` · ${O2.fmtNum(s.distanceKm, 2)} km` : ` · ${O2.fmtNum(s.volume)} kg`}</p></div>${I('chev', 'chev')}</div>`).join('') || '<div class="o2-empty">Bu gün eski sistemde kayıtlı bir antrenman var.</div>'}</div>`);
    };

    O2.exportCSV = async () => {
        const rows = [['Tarih', 'Tür', 'Başlık', 'Süre (dk)', 'Hacim (kg)', 'Set', 'Mesafe (km)', 'Tempo (dk/km)', 'Rekor', 'Not']];
        O2.sessions().forEach(s => rows.push([s.dayKey, s.type === 'cardio' ? 'Kardiyo' : 'Ağırlık', s.title, Math.round((s.durationSec || 0) / 60), s.volume || 0, s.setCount || 0, s.distanceKm || '', s.paceSec ? (s.paceSec / 60).toFixed(2) : '', (s.prs || []).length, s.note || '']));
        rows.push([]);
        rows.push(['Tarih', 'Kilo (kg)']);
        (LS.get('olympus_history', []) || []).forEach(h => rows.push([h.date, h.weight]));
        const csv = '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
        const name = `olympus-training-${O2.dayKey()}.csv`;
        const file = new File([csv], name, { type: 'text/csv' });
        try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Olympus Training verileri' }); return; }
        } catch (e) { }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        O2.toast('Veriler dışa aktarıldı', 'check');
    };

    // ==========================================
    // 📚 HAREKET KÜTÜPHANESİ (teknik ipuçları)
    // ==========================================
    const CUES = {
        'Bench Press': ['Kürek kemiklerini geriye ve aşağıya sıkıştır, göğsünü kaldır.', 'Bar göğüs ucu hizasına kontrollü insin; dirsekler gövdeye ~45°.', 'Ayaklar yere bassın, itişte bacak gücünü kullan.'],
        'Incline DB Press': ['Sehpa 30-45°; dambıllar üst göğüs hizasına insin.', 'En altta kısa duraklama, yukarıda dambılları birbirine çarptırma.'],
        'Squat': ['Nefesi al, karnı sık (brace), bar sırtın orta-üstünde.', 'Dizler ayak uçlarıyla aynı yöne açılsın; kalça paralelin altına insin.', 'Topuklardan it, göğüs düşmesin.'],
        'Romanian Deadlift': ['Dizler hafif kırık sabit; hareket kalçadan menteşe gibi.', 'Bar bacaklara sürtünerek insin, sırt nötr kalsın.', 'Arka bacakta gerilmeyi hissettiğin yerde dur, kalçayı ileri iterek kalk.'],
        'Barbell Row': ['Gövde ~45° öne eğik, sırt düz.', 'Barı göbeğe doğru çek, dirsekleri geriye götür.', 'Kalça ile savurma yapma.'],
        'Pull-up': ['Tam sarkıdan başla, omuzları aşağı çekerek başlat.', 'Göğsü bara doğru götür; çene barın üstüne çıksın.', 'İnişi 2-3 saniyede kontrollü yap.'],
        'Lat Pulldown': ['Hafif geriye yaslan, barı üst göğse çek.', 'Dirsekleri aşağı ve geriye sür; bileklerle çekme.'],
        'Military Press': ['Kalça ve karnı sık, belini çukurlaştırma.', 'Bar yüzüne yakın geçsin; tepede başı bar altına sok.'],
        'Shoulder Press': ['Dambıllar kulak hizasından yukarı; dirsekler hafif önde.', 'Tepede kilitlemeden önce dur.'],
        'Lateral Raise': ['Dirsekler hafif bükük, kollar omuz hizasına kadar.', 'Serçe parmak hafif yukarı; ağırlığı savurma.'],
        'Leg Press': ['Bel sırtlıktan kalkmasın; dizler içe çökmesin.', 'Tam aralıkta in, dizleri en üstte kilitleme.'],
        'Hip Thrust': ['Kürek kemikleri sehpada, çene içeride.', 'Tepede kalçayı 1 sn sık; bel aşırı kavislenmesin.'],
        'Triceps Pushdown': ['Dirsekler gövdeye sabit; sadece ön kol hareket eder.', 'Altta tam açıp tricepsi sık.'],
        'Incline DB Curl': ['Kollar gövdenin arkasında asılı; tam gerilmeden başla.', 'Omuzlar öne gelmesin, yukarıda biceps sık.'],
        'Barbell Curl': ['Dirsekler sabit, gövde sallanmasın.', 'İnişi yavaş yap; tam açılmadan bir sonrakine geçme.'],
        'Plank': ['Omuzlar dirseklerin üstünde, vücut tek çizgi.', 'Kalçayı ve karnı sık; nefesi tutma.'],
        'Face Pull': ['İpi yüz hizasına çek, elleri dışa aç.', 'Arka omuz ve kürek kemiklerini sık.'],
        'Hanging Leg Raise': ['Sallanmadan, karnı büzerek bacakları kaldır.', 'İnişi kontrollü yap.'],
        'Standing Calf Raise': ['Altta tam gerilme, üstte 1 sn sıkışma.', 'Dizleri kilitleme, yaylanma yapma.'],
        'Leg Curl': ['Kalça pede bassın; topukları kalçaya çek.', 'İnişi 2-3 sn yavaş yap.'],
        'Leg Extension': ['Dizler makinenin ekseninde; tepede 1 sn sık.', 'Ağırlığı düşürmeden kontrollü indir.'],
        'Cable Fly': ['Dirsekler sabit hafif bükük; kucaklar gibi kapat.', 'Göğüste gerilmeyi hisset, omuzlar öne kaçmasın.'],
        'Push-up': ['Vücut tek çizgi, eller omuz genişliğinde.', 'Göğüs yere yakın insin; dirsekler ~45°.'],
        'Goblet Squat': ['Dambılı göğüste tut, dirsekler dizlerin arasından insin.', 'Göğüs dik, topuklardan kalk.'],
        'Bulgarian Split Squat': ['Arka ayak sehpada; ön dizi ayak ucuyla aynı yönde.', 'Gövde hafif önde, ön topuktan it.']
    };
    const MUSCLE_CUES = {
        chest: 'Kürek kemiklerini sabitle, göğsü gererek kontrollü çalış.', back: 'Hareketi dirseklerle başlat, kürek kemiklerini sık.', shoulders: 'Boynu gevşek tut, ağırlığı savurma.',
        biceps: 'Dirsekleri sabit tut, inişte kontrolü bırakma.', triceps: 'Dirsekleri sabit tut, altta tam aç.', quads: 'Dizler ayak uçlarıyla aynı yönde, tam aralıkta çalış.',
        hamstrings: 'Sırt nötr; gerilmeyi hissettiğin yerde dur.', glutes: 'Tepede kalçayı bilinçli sık.', calves: 'Altta gerilme, üstte duraklama.', core: 'Karnı sık, nefesi düzenli ver.'
    };

    O2.renderLibrary = () => {
        const q = O2.ui.libQuery || '', filter = O2.ui.libFilter || 'all';
        const pool = O2.exercisePool().filter(e => (filter === 'all' || e.muscle === filter) && (!q || e.name.toLowerCase().includes(q.toLowerCase())));
        const bests = O2.bests();
        return `
        <div class="o2-stagger">
            <button class="o2-link" style="display:inline-flex;align-items:center;gap:4px;margin:4px 0 10px" onclick="O2.go('profile')">${I('back')}Profil</button>
            <div class="o2-eyebrow">${O2.exercisePool().length} hareket</div>
            <h1 class="o2-title">Hareket kütüphanesi</h1>
            <input class="o2-input" id="o2-lib-q" style="margin-top:16px" placeholder="Hareket ara" value="${esc(q)}" oninput="O2.libSearch(this.value)">
            <div class="o2-chips" style="margin:12px 0 4px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px">${['all', ...Object.keys(O2.MUSCLES)].map(g => `<button class="o2-chip ${g === filter ? 'gold' : ''}" onclick="O2.ui.libFilter='${g}'; O2.render()">${g === 'all' ? 'Tümü' : O2.MUSCLES[g]}</button>`).join('')}</div>
            <div class="o2-card" style="padding:4px 18px;margin-top:8px" id="o2-lib-list">${libList(pool, bests)}</div>
        </div>`;
    };
    function libList(pool, bests) {
        return `<div class="o2-list">${pool.map(e => `
            <div class="o2-row is-tap" onclick="O2.libSheet(${jsArg(e.name)})">
                <div class="o2-row-main"><h5>${esc(e.name)}</h5><p>${O2.MUSCLES[e.muscle]} · ${{ gym: 'Salon', db: 'Dambıl', bw: 'Vücut ağırlığı' }[e.equip]}${CUES[e.name] ? ' · İpuçlu' : ''}</p></div>
                ${bests[e.name] ? `<div class="o2-row-end"><strong>${O2.fmtNum(bests[e.name].e1rm, 1)}</strong>1RM</div>` : I('chev', 'chev')}
            </div>`).join('') || '<div class="o2-empty">Sonuç yok</div>'}</div>`;
    }
    O2.libSearch = (q) => {
        O2.ui.libQuery = q;
        const filter = O2.ui.libFilter || 'all';
        const pool = O2.exercisePool().filter(e => (filter === 'all' || e.muscle === filter) && (!q || e.name.toLowerCase().includes(q.toLowerCase())));
        $('o2-lib-list').innerHTML = libList(pool, O2.bests());
    };
    O2.libSheet = (name) => {
        const cues = CUES[name] || [MUSCLE_CUES[O2.muscleOf(name)]];
        O2.exerciseInfo(name);
        const body = $('o2-sheet-layer').querySelector('.o2-sheet-body');
        body.insertAdjacentHTML('afterbegin', '');
        const chips = body.querySelector('.o2-chips');
        chips.insertAdjacentHTML('afterend', `
            <div class="o2-card" style="margin-top:14px"><div class="o2-eyebrow">Teknik</div><ul class="o2-coach-list" style="margin-top:10px">${cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
            <a class="o2-btn o2-btn-ghost o2-btn-sm" style="margin-top:12px;text-decoration:none" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' exercise form')}">${I('play')}Videoda izle</a></div>`);
    };
    O2.cuesFor = (name) => CUES[name] || null;

    // ==========================================
    // 🖼️ GELİŞİM FOTOĞRAFI KARŞILAŞTIRMA
    // ==========================================
    O2.compareSheet = () => {
        const photos = (LS.get('olympus_progress_photos', []) || []).slice().sort((a, b) => a.id - b.id);
        if (photos.length < 2) { O2.toast('Karşılaştırma için en az 2 fotoğraf gerekli', 'camera'); return; }
        const opt = (sel) => photos.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.date)}</option>`).join('');
        const a = photos[0], b = photos[photos.length - 1];
        O2.sheet('Önce / Sonra', `
            <div class="o2-grid-2" style="margin-bottom:12px">
                <select class="o2-input" id="o2-cmp-a" onchange="O2.compareUpdate()">${opt(a.id)}</select>
                <select class="o2-input" id="o2-cmp-b" onchange="O2.compareUpdate()">${opt(b.id)}</select>
            </div>
            <div class="o2-compare" id="o2-compare">
                <img id="o2-cmp-img-b" src="${b.img}" alt="Sonra">
                <div class="o2-compare-top" id="o2-cmp-top"><img id="o2-cmp-img-a" src="${a.img}" alt="Önce"></div>
                <i class="o2-compare-handle" id="o2-cmp-handle"></i>
                <span class="o2-compare-tag left">ÖNCE</span><span class="o2-compare-tag right">SONRA</span>
            </div>
            <input type="range" min="0" max="100" value="50" class="o2-compare-range" oninput="O2.compareSlide(this.value)" aria-label="Karşılaştırma kaydırıcısı">
            <p id="o2-cmp-diff" style="margin:10px 0 0;text-align:center;font-size:12.5px;color:var(--o2-text-2)"></p>`);
        O2.compareUpdate();
    };
    // Üstteki (önce) fotoğraf tam boyutta kalır, sadece sağdan kırpılır
    O2.compareSlide = (v) => { $('o2-cmp-top').style.clipPath = `inset(0 ${100 - v}% 0 0)`; $('o2-cmp-handle').style.left = v + '%'; };
    O2.compareUpdate = () => {
        const photos = LS.get('olympus_progress_photos', []) || [];
        const a = photos.find(p => p.id === +$('o2-cmp-a').value), b = photos.find(p => p.id === +$('o2-cmp-b').value);
        if (!a || !b) return;
        $('o2-cmp-img-a').src = a.img; $('o2-cmp-img-b').src = b.img;
        const ma = a.measurements || {}, mb = b.measurements || {};
        const parts = [['w', 'kg'], ['waist', 'cm bel'], ['arm', 'cm kol']].filter(([k]) => ma[k] && mb[k]).map(([k, u]) => { const d = (parseFloat(mb[k]) - parseFloat(ma[k])); return `${d >= 0 ? '+' : ''}${O2.fmtNum(d, 1)} ${u}`; });
        $('o2-cmp-diff').textContent = parts.length ? parts.join(' · ') : `${a.date} → ${b.date}`;
    };
})();
