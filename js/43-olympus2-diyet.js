// Olympus Training — AI diyet planlayıcı
// Hedef, öğün sayısı/saatleri, tercihler ve sevilmeyenlere göre haftalık plan üretir (Gemini; anahtar yoksa cihaz içi şablon motoru).
// Her öğünün 2-3 alternatifi vardır; "Değiştir" ile seçilir, işaretlenen öğün kalori/makrolarıyla besin günlüğüne eklenir.
// Plan oly2_diet_plan'da durur; O2.diet() ve O2.macros() bu planı kullanır (Dilala modu kendi planını korur).
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);
    const KEY = 'oly2_diet_plan';

    // ==========================================
    // 🥚 BESİN TABANI (birim başına: kcal, protein, karb, yağ; adım = yuvarlama)
    // ==========================================
    const DB = {
        yumurta: ['Yumurta', 'adet', 78, 6.3, .6, 5.3, 1], ekmek: ['Tam buğday ekmeği', 'dilim', 70, 3.5, 12, 1, 1],
        peynir: ['Beyaz peynir', 'g', 3, .17, .03, .23, 10], lor: ['Lor peyniri', 'g', .98, .12, .03, .045, 25],
        domates: ['Domates-salatalık', 'porsiyon', 30, 1, 6, 0, 1], zeytin: ['Zeytin', 'adet', 5, .05, .1, .5, 2],
        yulaf: ['Yulaf ezmesi', 'g', 3.8, .13, .66, .07, 10], sut: ['Süt', 'ml', .62, .032, .048, .032, 50],
        muz: ['Muz', 'adet', 105, 1.3, 27, .4, 1], elma: ['Elma', 'adet', 95, .5, 25, .3, 1],
        fistik: ['Fıstık ezmesi', 'g', 6.2, .24, .2, .53, 5], suzme: ['Süzme yoğurt', 'g', 1, .1, .04, .047, 25],
        yogurt: ['Yoğurt', 'g', .6, .035, .047, .033, 50], kefir: ['Kefir', 'ml', .56, .036, .044, .028, 50],
        bal: ['Bal', 'tatlı kaşığı', 30, 0, 8, 0, 1], ceviz: ['Ceviz', 'g', 6.5, .15, .14, .65, 5], badem: ['Çiğ badem', 'g', 5.8, .21, .22, .5, 5],
        whey: ['Whey protein', 'ölçek', 120, 24, 3, 1.5, 1], patlak: ['Pirinç patlağı', 'adet', 35, .7, 7.5, .3, 1],
        tavuk: ['Tavuk göğsü (ızgara)', 'g', 1.65, .31, 0, .036, 10], kofte: ['Izgara köfte', 'g', 2.3, .18, .06, .15, 10],
        somon: ['Somon', 'g', 2.08, .2, 0, .13, 10], ton: ['Ton balığı (süzülmüş)', 'kutu', 130, 29, 0, 1, 1], hindi: ['Hindi füme', 'g', 1.1, .18, .02, .03, 10],
        pirinc: ['Pirinç pilavı', 'g', 1.3, .027, .28, .007, 10], bulgur: ['Bulgur pilavı', 'g', 1.2, .04, .25, .01, 10],
        makarna: ['Tam buğday makarna', 'g', 1.5, .055, .29, .01, 10], patates: ['Fırın patates', 'g', .93, .025, .21, .001, 10],
        mercimek: ['Mercimek çorbası', 'kase', 180, 10, 28, 4, 1], nohut: ['Nohut yemeği', 'porsiyon', 260, 12, 35, 8, 1],
        fasulye: ['Kuru fasulye', 'porsiyon', 250, 14, 34, 7, 1], salata: ['Mevsim salata (zeytinyağlı)', 'kase', 100, 2, 8, 7, 1],
        sebze: ['Zeytinyağlı sebze', 'porsiyon', 150, 3, 15, 9, 1]
    };
    const DAIRY = ['peynir', 'lor', 'sut', 'suzme', 'yogurt', 'kefir', 'whey'];
    const MEAT = ['tavuk', 'kofte', 'somon', 'ton', 'hindi'];
    const GLUTEN = ['ekmek', 'makarna', 'bulgur', 'yulaf'];
    const T = (emoji, items) => ({ emoji, items });
    const POOL = {
        kahvalti: [
            T('🍳', [['yumurta', 3], ['ekmek', 2], ['peynir', 30], ['domates', 1], ['zeytin', 6]]),
            T('🥣', [['yulaf', 60], ['sut', 250], ['muz', 1], ['fistik', 15]]),
            T('🧀', [['yumurta', 2], ['lor', 100], ['ekmek', 1], ['domates', 1], ['ceviz', 15]]),
            T('🥛', [['suzme', 200], ['yulaf', 40], ['bal', 1], ['ceviz', 15]]),
            T('🍳', [['yumurta', 3], ['patates', 150], ['domates', 1], ['zeytin', 8]])
        ],
        ogle: [
            T('🍗', [['tavuk', 150], ['pirinc', 150], ['salata', 1]]),
            T('🥩', [['kofte', 150], ['bulgur', 150], ['salata', 1]]),
            T('🍲', [['mercimek', 1], ['nohut', 1], ['ekmek', 1], ['yogurt', 150]]),
            T('🐟', [['ton', 1], ['makarna', 150], ['salata', 1]]),
            T('🥙', [['hindi', 100], ['ekmek', 2], ['domates', 1], ['ayran', 0]].filter(x => DB[x[0]]))
        ],
        ara: [
            T('🍌', [['muz', 1], ['badem', 20]]),
            T('🥛', [['suzme', 150], ['bal', 1]]),
            T('🥤', [['whey', 1], ['muz', 1]]),
            T('🍎', [['elma', 1], ['fistik', 15]]),
            T('🍘', [['patlak', 2], ['fistik', 15]])
        ],
        aksam: [
            T('🍗', [['tavuk', 180], ['patates', 200], ['salata', 1]]),
            T('🐟', [['somon', 150], ['bulgur', 120], ['sebze', 1]]),
            T('🫘', [['fasulye', 1], ['bulgur', 120], ['yogurt', 150], ['salata', 1]]),
            T('🥩', [['kofte', 150], ['sebze', 1], ['yogurt', 150]]),
            T('🍝', [['tavuk', 150], ['makarna', 150], ['salata', 1]])
        ],
        gece: [
            T('🧀', [['lor', 150]]), T('🥛', [['kefir', 250]]), T('🥣', [['suzme', 150], ['ceviz', 10]]), T('🌰', [['badem', 20]])
        ]
    };
    const SLOT_NAMES = { kahvalti: 'Kahvaltı', ogle: 'Öğle', ara: 'Ara öğün', aksam: 'Akşam', gece: 'Gece öğünü' };
    const LAYOUT = {
        3: [['kahvalti', .3], ['ogle', .38], ['aksam', .32]],
        4: [['kahvalti', .25], ['ogle', .3], ['ara', .15], ['aksam', .3]],
        5: [['kahvalti', .22], ['ogle', .27], ['ara', .12], ['aksam', .29], ['gece', .1]]
    };

    const round1 = (v) => Math.round(v);
    const itemText = (it) => `${it.q} ${it.u === 'adet' || it.u === 'dilim' || it.u === 'kase' || it.u === 'porsiyon' || it.u === 'kutu' || it.u === 'ölçek' || it.u === 'tatlı kaşığı' ? it.u + ' ' : it.u + ' '}${it.n}`.replace(/\s+/g, ' ');
    const sumMac = (items) => items.reduce((a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.p, c: a.c + x.c, f: a.f + x.f }), { kcal: 0, p: 0, c: 0, f: 0 });
    const option = (items) => {
        const m = sumMac(items);
        return { d: items.map(itemText).join(', '), items: items.map(x => ({ n: x.n, q: x.q, u: x.u })), kcal: round1(m.kcal), p: round1(m.p), c: round1(m.c), f: round1(m.f) };
    };
    // Şablonu hedef kaloriye ölçekle (birimlere göre yuvarlar)
    // Doğal porsiyonlu besinler (1 ölçek whey, 1 meyve, 1 kutu ton) ölçeklenmez; kalan kalori diğerlerine dağıtılır
    const FIXED = ['whey', 'muz', 'elma', 'ton', 'bal', 'domates', 'mercimek', 'salata'];
    function scaleTemplate(tpl, kcal) {
        const base = tpl.items.reduce((a, [k, q]) => a + DB[k][2] * q, 0);
        const fixed = tpl.items.reduce((a, [k, q]) => a + (FIXED.includes(k) ? DB[k][2] * q : 0), 0);
        const factor = base - fixed > 20 ? Math.max(.5, Math.min(2, (kcal - fixed) / (base - fixed))) : 1;
        const items = tpl.items.map(([k, q]) => {
            const [n, u, kc, p, c, f, step] = DB[k];
            const qty = FIXED.includes(k) ? q : Math.max(step, Math.round(q * factor / step) * step);
            return { n, u, q: qty, kcal: kc * qty, p: p * qty, c: c * qty, f: f * qty };
        });
        return option(items);
    }
    function allowed(tpl, prefs, avoid) {
        return tpl.items.every(([k]) => {
            if (prefs.includes('veg') && MEAT.includes(k)) return false;
            if (prefs.includes('lactose') && DAIRY.includes(k)) return false;
            if (prefs.includes('gluten') && GLUTEN.includes(k)) return false;
            const n = DB[k][0].toLocaleLowerCase('tr');
            return !avoid.some(a => a && n.includes(a));
        });
    }

    const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
    const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
    function mealTimes(n, first, last) {
        const a = toMin(first), b = Math.max(a + 60 * (n - 1), toMin(last));
        return Array.from({ length: n }, (_, i) => fmt(Math.round((a + (b - a) * (n === 1 ? 0 : i / (n - 1))) / 15) * 15));
    }

    // Hedefler: antrenman günü ve dinlenme günü
    function targets(form) {
        const p = LS.get('olympus_profile', {}) || {};
        const bw = parseFloat(p.w) || 80;
        const train = Math.round(form.kcal / 10) * 10;
        const rest = Math.round(train * .9 / 10) * 10;
        const mk = (kcal) => {
            const protein = Math.round(bw * (form.goal === 'cut' ? 2.2 : 2));
            const fat = Math.round(bw * .9);
            const carb = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
            return { kcal, protein, carb, fat, bw };
        };
        return { train: mk(train), rest: mk(rest) };
    }
    // Program günleriyle eşleştir: dinlenme → dinlenme şablonu, antrenman günleri A/B dönüşümlü
    function weekMap() {
        const days = O2.activeProgram().days;
        let alt = 0;
        return Array.from({ length: 7 }, (_, j) => {
            const d = days[j % days.length];
            if (d.rest || !(d.ex && d.ex.length)) return 'rest';
            return (alt++ % 2) ? 'trainB' : 'trainA';
        });
    }

    // ==========================================
    // ⚙️ ŞABLON MOTORU (Gemini yoksa)
    // ==========================================
    function localTemplates(form, tg) {
        const avoid = String(form.avoid || '').toLocaleLowerCase('tr').split(/[,;]+/).map(x => x.trim()).filter(Boolean);
        const layout = LAYOUT[form.meals] || LAYOUT[4];
        const times = mealTimes(layout.length, form.first, form.last);
        const build = (key, t, shift) => ({
            key, title: key === 'rest' ? 'Dinlenme günü' : key === 'trainA' ? 'Antrenman günü A' : 'Antrenman günü B',
            target: t,
            meals: layout.map(([slot, share], i) => {
                const pool = POOL[slot].filter(tpl => allowed(tpl, form.prefs, avoid));
                const list = (pool.length ? pool : POOL[slot]);
                const pick = (n) => list[(n + shift + i) % list.length];
                const opts = [0, 1, 2].map(n => scaleTemplate(pick(n), t.kcal * share)).filter((o, k, arr) => arr.findIndex(x => x.d === o.d) === k);
                return { name: SLOT_NAMES[slot], time: times[i], emoji: pick(0).emoji, opts };
            })
        });
        return [build('trainA', tg.train, 0), build('trainB', tg.train, 2), build('rest', tg.rest, 1)];
    }

    // ==========================================
    // ✨ GEMINI
    // ==========================================
    async function aiTemplates(form, tg) {
        const layout = LAYOUT[form.meals] || LAYOUT[4];
        const times = mealTimes(layout.length, form.first, form.last);
        const prefText = form.prefs.map(p => ({ tr: 'Türk mutfağı', quick: 'pratik (15 dk)', budget: 'öğrenci bütçesi', veg: 'vejetaryen', lactose: 'laktozsuz', gluten: 'glutensiz', highp: 'yüksek protein' }[p])).filter(Boolean).join(', ');
        const prompt = `Sporcu için diyet planı hazırla. Hedef: ${{ cut: 'yağ yakımı', keep: 'kilo koruma', bulk: 'kas kazanımı' }[form.goal]}. Tercihler: ${prefText || 'yok'}. Yemeyeceği / alerji: ${form.avoid || 'yok'}.
3 gün şablonu üret: "trainA" ve "trainB" (antrenman günleri, her biri ${tg.train.kcal} kcal, P ${tg.train.protein} g, K ${tg.train.carb} g, Y ${tg.train.fat} g) ve "rest" (dinlenme, ${tg.rest.kcal} kcal, P ${tg.rest.protein} g, K ${tg.rest.carb} g, Y ${tg.rest.fat} g).
Her günde şu öğünler ve saatler olsun: ${layout.map(([s], i) => `${SLOT_NAMES[s]} ${times[i]}`).join(', ')}.
Her öğün için 3 seçenek (opts) ver: Türkiye'de kolay bulunan, gramajları net malzemeler. Öğün makroları gerçekçi olsun ve günlük toplam hedefe ±%7 yakın.
SADECE geçerli JSON döndür, açıklama yazma:
{"name":"kısa plan adı","days":[{"key":"trainA","meals":[{"name":"Kahvaltı","time":"08:00","emoji":"🍳","opts":[{"items":[{"n":"Yumurta","q":3,"u":"adet"}],"kcal":0,"p":0,"c":0,"f":0}]}]}]}`;
        const res = await askGeminiAI(prompt);
        const m = String(res || '').match(/\{[\s\S]*\}/);
        if (!m) throw new Error('AI yanıtı okunamadı');
        const json = JSON.parse(m[0]);
        const titles = { trainA: 'Antrenman günü A', trainB: 'Antrenman günü B', rest: 'Dinlenme günü' };
        const out = (json.days || []).map(d => ({
            key: d.key, title: titles[d.key] || d.key, target: d.key === 'rest' ? tg.rest : tg.train,
            meals: (d.meals || []).map((ml, i) => ({
                name: String(ml.name || SLOT_NAMES[layout[i] && layout[i][0]] || 'Öğün').slice(0, 30),
                time: /^\d{1,2}:\d{2}$/.test(ml.time) ? fmt(toMin(ml.time)) : times[i] || '12:00',
                emoji: String(ml.emoji || '🍽️').slice(0, 4),
                opts: (ml.opts || []).slice(0, 3).map(o => {
                    const items = (o.items || []).map(x => ({ n: String(x.n || '').slice(0, 40), q: +x.q || 1, u: String(x.u || '').slice(0, 12) })).filter(x => x.n);
                    return { d: items.map(x => `${x.q} ${x.u} ${x.n}`.replace(/\s+/g, ' ')).join(', '), items, kcal: Math.round(+o.kcal || 0), p: Math.round(+o.p || 0), c: Math.round(+o.c || 0), f: Math.round(+o.f || 0) };
                }).filter(o => o.items.length && o.kcal > 0)
            })).filter(ml => ml.opts.length)
        })).filter(d => d.meals.length && titles[d.key]);
        if (!out.find(d => d.key === 'trainA') || !out.find(d => d.key === 'rest')) throw new Error('AI planı eksik geldi');
        if (!out.find(d => d.key === 'trainB')) out.push({ ...out.find(d => d.key === 'trainA'), key: 'trainB', title: titles.trainB });
        return { name: String(json.name || 'AI diyet planı').slice(0, 40), templates: out };
    }

    // Şablonları 7 güne yerleştir (dietData biçimiyle uyumlu: t, d, alt, i + makrolar)
    function assemble(name, templates, form, source) {
        const map = weekMap();
        const byKey = Object.fromEntries(templates.map(t => [t.key, t]));
        const days = {};
        map.forEach((k, j) => {
            const t = byKey[k] || byKey.trainA;
            days[j + 1] = {
                title: t.title, target: t.target, kind: k,
                meals: t.meals.map(ml => {
                    const o = ml.opts[0];
                    return { t: `${ml.name} (${ml.time})`, name: ml.name, time: ml.time, i: ml.emoji, d: o.d, alt: ml.opts.slice(1).map(x => x.d).join(' · ') || 'Alternatif yok', kcal: o.kcal, p: o.p, c: o.c, f: o.f, opts: ml.opts };
                })
            };
        });
        return { name, source, created: Date.now(), form, days };
    }

    // ==========================================
    // 🔌 MEVCUT BESLENME EKRANIYLA ENTEGRASYON
    // ==========================================
    const plan = () => LS.get(KEY, null);
    const baseDiet = O2.diet, baseMacros = O2.macros;
    const dilala = () => document.body.classList.contains('dilala-mode');
    O2.diet = () => {
        const p = plan();
        return p && p.days && !dilala() ? p.days : baseDiet();
    };
    O2.macros = (dayTitle = '') => {
        const p = plan();
        if (p && !dilala()) {
            const d = Object.values(p.days).find(x => x.title === dayTitle);
            if (d && d.target) return { ...d.target };
        }
        return baseMacros(dayTitle);
    };
    // Gün için seçili alternatifler uygulanmış öğünler
    O2.dietMealsFor = (day, key) => {
        const swaps = LS.get(`oly2_meal_swap_${key}`, {}) || {};
        return day.meals.map((m, i) => {
            const k = swaps[i] || 0;
            if (!m.opts || !m.opts[k] || !k) return { ...m, optIndex: 0 };
            const o = m.opts[k];
            return { ...m, d: o.d, kcal: o.kcal, p: o.p, c: o.c, f: o.f, alt: m.opts.filter((_, j) => j !== k).map(x => x.d).join(' · '), optIndex: k };
        });
    };
    O2.dietSwap = (key, i) => {
        const dayIdx = O2.dayIndex(O2.ui.fuelOffset || 0, 7) + 1;
        const m = O2.diet()[dayIdx].meals[i];
        if (!m.opts || m.opts.length < 2) { document.getElementById('o2-meal-' + i).classList.toggle('show-alt'); return; }
        const swaps = LS.get(`oly2_meal_swap_${key}`, {}) || {};
        swaps[i] = ((swaps[i] || 0) + 1) % m.opts.length;
        LS.set(`oly2_meal_swap_${key}`, swaps);
        // Günlüğe eklenmiş öğün varsa yeni seçenekle güncelle
        const log = O2.foodLog(key);
        const entry = log.find(x => x.id === `meal_${i}`);
        if (entry) { const o = m.opts[swaps[i]]; Object.assign(entry, { name: o.d.slice(0, 60), kcal: o.kcal, p: o.p, c: o.c, f: o.f }); LS.set(`oly2_food_${key}`, log); }
        O2.haptic(8);
        O2.render();
    };
    // Öğün işaretlenince kalori/makrolarıyla besin günlüğüne eklenir (geri alınca çıkar)
    const baseToggle = O2.toggleMeal;
    O2.toggleMeal = (key, i) => {
        const dayIdx = O2.dayIndex(O2.ui.fuelOffset || 0, 7) + 1;
        const day = O2.diet()[dayIdx];
        const m = O2.dietMealsFor(day, key)[i];
        const was = (LS.get(`oly2_meals_${key}`, []) || []).includes(i);
        if (m && m.kcal) {
            const log = O2.foodLog(key).filter(x => x.id !== `meal_${i}`);
            if (!was) log.push({ id: `meal_${i}`, name: m.d.slice(0, 60), meal: m.name || 'Öğün', amountLabel: 'Plan öğünü', kcal: m.kcal, p: m.p, c: m.c, f: m.f });
            LS.set(`oly2_food_${key}`, log);
            if (!was) O2.toast(`${m.kcal} kcal günlüğe eklendi`, 'fuel');
        }
        baseToggle(key, i);
    };

    // ==========================================
    // 🖥️ PLANLAYICI EKRANI
    // ==========================================
    const PREFS = [['tr', 'Türk mutfağı'], ['quick', 'Pratik'], ['budget', 'Öğrenci bütçesi'], ['highp', 'Yüksek protein'], ['veg', 'Vejetaryen'], ['lactose', 'Laktozsuz'], ['gluten', 'Glutensiz']];
    O2.dietPlanCard = () => {
        const p = plan();
        if (dilala()) return '';
        return p ? `
            <div class="o2-card o2-card-glow is-tap" style="margin-bottom:12px" onclick="O2.dietSheet()">
                <div class="o2-coach"><div class="o2-coach-orb">${I('spark')}</div>
                <div style="flex:1"><h4>${esc(p.name)}</h4><p>${p.source === 'ai' ? 'Gemini' : 'Akıllı şablon'} · ${Object.values(p.days)[0].target.kcal} kcal antrenman günü · alternatifler için "Değiştir"</p></div>${I('chev', 'chev')}</div>
            </div>` : `
            <div class="o2-card is-tap" style="margin-bottom:12px" onclick="O2.dietSheet()">
                <div class="o2-coach"><div class="o2-coach-orb">${I('spark')}</div>
                <div style="flex:1"><h4>Diyetini AI ile baştan oluştur</h4><p>Hedefine, saatlerine ve damak zevkine göre 7 günlük plan + her öğüne alternatifler</p></div>${I('chev', 'chev')}</div>
            </div>`;
    };
    O2.dietSheet = () => {
        const p = plan();
        const f = (p && p.form) || LS.get('oly2_diet_form', null) || {};
        const goal = f.goal || 'keep';
        const base = baseMacros('Orta karb').kcal;
        const kcal = f.kcal || Math.round(base * ({ cut: .85, keep: 1, bulk: 1.1 }[goal]) / 50) * 50;
        const hasKey = !!localStorage.getItem('OLY_API_KEY');
        O2.sheet('AI diyet planı', `
            ${p ? `<div class="o2-card" style="margin-bottom:14px"><div class="o2-coach"><div class="o2-coach-orb">${I('fuel')}</div><div style="flex:1"><h4>${esc(p.name)}</h4><p>${new Date(p.created).toLocaleDateString('tr-TR')} · ${Object.keys(p.days).length} gün</p></div></div>
                <div class="o2-grid-2" style="margin-top:12px"><button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.dietShopping()">${I('list')}Alışveriş listesi</button><button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.dietReset()">Planı sil</button></div></div>` : ''}
            <div class="o2-field"><label>Hedef</label><div class="o2-segment" id="o2-dt-goal">${[['cut', 'Yağ yakımı'], ['keep', 'Koruma'], ['bulk', 'Kas kazanımı']].map(([k, l]) => `<button class="${goal === k ? 'active' : ''}" data-v="${k}" onclick="O2.formPick(this); O2.dietGoalKcal('${k}')">${l}</button>`).join('')}</div></div>
            <div class="o2-grid-2">
                <div class="o2-field"><label>Kalori (antrenman günü)</label><input class="o2-input" id="o2-dt-kcal" inputmode="numeric" value="${kcal}"></div>
                <div class="o2-field"><label>Öğün sayısı</label><div class="o2-segment" id="o2-dt-meals">${[3, 4, 5].map(n => `<button class="${(f.meals || 4) === n ? 'active' : ''}" data-v="${n}" onclick="O2.formPick(this)">${n}</button>`).join('')}</div></div>
            </div>
            <div class="o2-grid-2">
                <div class="o2-field"><label>İlk öğün</label><input class="o2-input" type="time" id="o2-dt-first" value="${esc(f.first || '08:00')}"></div>
                <div class="o2-field"><label>Son öğün</label><input class="o2-input" type="time" id="o2-dt-last" value="${esc(f.last || '21:00')}"></div>
            </div>
            <div class="o2-field"><label>Tercihler</label><div class="o2-chips" id="o2-dt-prefs">${PREFS.map(([k, l]) => `<button class="o2-chip ${(f.prefs || ['tr']).includes(k) ? 'gold' : ''}" data-v="${k}" onclick="this.classList.toggle('gold')">${l}</button>`).join('')}</div></div>
            <div class="o2-field"><label>Sevmediklerin / alerjin (virgülle)</label><input class="o2-input" id="o2-dt-avoid" placeholder="örn. somon, ceviz" value="${esc(f.avoid || '')}"></div>
            <p style="margin:0;font-size:12px;line-height:1.5;color:var(--o2-text-3)">Dinlenme günleri ~%10 daha az kalori ile ayarlanır. ${hasKey ? 'Gemini planı hazırlar (20-40 sn).' : 'Gemini anahtarı yok: cihaz içi akıllı şablon kullanılır.'}</p>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:14px" id="o2-dt-go" onclick="O2.dietGenerate()">${I('spark')}${p ? 'Planı yeniden oluştur' : 'Planımı oluştur'}</button>
            ${hasKey ? `<button class="o2-btn o2-btn-ghost o2-btn-block" style="margin-top:8px" onclick="O2.dietGenerate(true)">Hızlı şablonla oluştur (AI'sız)</button>` : ''}`);
    };
    O2.dietGoalKcal = (goal) => {
        const base = baseMacros('Orta karb').kcal;
        $('o2-dt-kcal').value = Math.round(base * ({ cut: .85, keep: 1, bulk: 1.1 }[goal]) / 50) * 50;
    };
    O2.dietGenerate = async (forceLocal) => {
        const form = {
            goal: document.querySelector('#o2-dt-goal .active').dataset.v,
            kcal: Math.max(1200, Math.min(5000, parseInt($('o2-dt-kcal').value) || 2400)),
            meals: +document.querySelector('#o2-dt-meals .active').dataset.v,
            first: $('o2-dt-first').value || '08:00', last: $('o2-dt-last').value || '21:00',
            prefs: [...document.querySelectorAll('#o2-dt-prefs .gold')].map(x => x.dataset.v),
            avoid: $('o2-dt-avoid').value.trim().slice(0, 120)
        };
        LS.set('oly2_diet_form', form);
        const tg = targets(form);
        const btn = $('o2-dt-go');
        let result = null;
        if (!forceLocal && localStorage.getItem('OLY_API_KEY') && typeof askGeminiAI === 'function') {
            btn.disabled = true; btn.innerHTML = 'Gemini planını hazırlıyor…';
            try {
                const ai = await aiTemplates(form, tg);
                result = assemble(ai.name, ai.templates, form, 'ai');
            } catch (e) {
                console.warn('AI diyet planı alınamadı:', e);
                O2.toast('AI planı alınamadı · akıllı şablon kullanıldı', 'spark');
            }
        }
        if (!result) result = assemble(`${{ cut: 'Yağ yakımı', keep: 'Koruma', bulk: 'Kas kazanımı' }[form.goal]} planı`, localTemplates(form, tg), form, 'rule');
        LS.set(KEY, result);
        // Yeni plan: eski öğün işaretleri / değişimleri bugünden itibaren sıfırlansın
        for (let i = 0; i < 7; i++) { const k = O2.dayKey(O2.addDays(new Date(), i)); localStorage.removeItem(`oly2_meal_swap_${k}`); }
        O2.closeSheet();
        O2.ui.tab = 'fuel'; O2.go('fuel', true);
        if (typeof confetti === 'function') confetti({ particleCount: 70, spread: 60, colors: ['#3ddc97', '#e6c374', '#ffffff'] });
        O2.toast('Diyet planın hazır · öğünlere dokunup alternatiflere bak', 'fuel');
        if (O2.refreshNotifications) O2.refreshNotifications();
    };
    O2.dietReset = () => {
        if (!confirm('Oluşturulan plan silinip varsayılan diyet programına dönülsün mü?')) return;
        localStorage.removeItem(KEY);
        O2.closeSheet(); O2.render(); O2.toast('Varsayılan plana dönüldü', 'fuel');
    };

    // 🛒 Alışveriş listesi: haftanın seçili öğünlerinden malzemeleri toplar
    O2.dietShopping = () => {
        const p = plan();
        if (!p) return;
        const sum = {};
        Object.values(p.days).forEach((d, j) => {
            const key = O2.dayKey(O2.addDays(new Date(), j));
            O2.dietMealsFor(d, key).forEach(m => {
                const o = (m.opts && m.opts[m.optIndex || 0]) || null;
                (o ? o.items : []).forEach(it => {
                    const k = `${it.n}|${it.u}`;
                    sum[k] = sum[k] || { n: it.n, u: it.u, q: 0 };
                    sum[k].q += +it.q || 0;
                });
            });
        });
        const rows = Object.values(sum).sort((a, b) => a.n.localeCompare(b.n, 'tr')).map(x => {
            let q = x.q, u = x.u;
            if (u === 'g' && q >= 1000) { q = Math.round(q / 100) / 10; u = 'kg'; }
            if (u === 'ml' && q >= 1000) { q = Math.round(q / 100) / 10; u = 'L'; }
            return `${x.n} — ${Math.round(q * 10) / 10} ${u}`;
        });
        O2.sheet('Haftalık alışveriş listesi', `
            <div class="o2-card" style="padding:4px 16px"><div class="o2-list">${rows.map(r => `
                <div class="o2-row is-tap" onclick="this.querySelector('.o2-check').classList.toggle('on')"><span class="o2-check">${I('check')}</span><div class="o2-row-main"><h5>${esc(r)}</h5></div></div>`).join('')}</div></div>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:14px" onclick="navigator.clipboard && navigator.clipboard.writeText(${jsArg(rows.join('\n'))}).then(() => O2.toast('Liste kopyalandı', 'check'))">${I('list')}Listeyi kopyala</button>`);
    };

    // Öğün hatırlatıcıları (Bildirimler → Öğünler)
    if (O2.registerNotifySource) O2.registerNotifySource('meals', (day, i) => {
        const p = plan();
        if (!p || dilala()) return [];
        const d = O2.diet()[O2.dayIndex(i, 7) + 1];
        if (!d) return [];
        const key = O2.dayKey(day);
        const eaten = LS.get(`oly2_meals_${key}`, []) || [];
        return O2.dietMealsFor(d, key).filter((m, k) => m.time && !(i === 0 && eaten.includes(k))).map((m, k) => {
            const [h, mm] = m.time.split(':').map(Number);
            return { key: 'meal' + k, h, m: mm, title: `${m.i || '🍽️'} ${m.name || 'Öğün'} vakti`, body: `${m.d}${m.kcal ? ` · ${m.kcal} kcal` : ''}`, action: 'fuel' };
        });
    });
})();
