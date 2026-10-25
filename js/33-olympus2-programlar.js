// Olympus 2.0 spor modülü — program yönetimi: yapay zekâ ile program oluşturma, manuel program düzenleyici
// Programlar eski sistemle aynı yere kaydedilir (olympus_custom_profiles → { id, name, icon, date, programData:[gün] })
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);

    // ==========================================
    // 📚 EGZERSİZ HAVUZU (ekipman etiketli)
    // ==========================================
    // equip: gym = tam salon, db = dambıl, bw = vücut ağırlığı · type: c = bileşik, i = izole
    const POOL = [
        ['Bench Press', 'gym', 'c'], ['Dumbbell Bench Press', 'db', 'c'], ['Incline DB Press', 'db', 'c'], ['Machine Chest Press', 'gym', 'c'],
        ['Cable Fly', 'gym', 'i'], ['Pec Deck Fly', 'gym', 'i'], ['DB Fly', 'db', 'i'], ['Push-up', 'bw', 'c'], ['Decline Push-up', 'bw', 'c'], ['Dips (Chest Focus)', 'bw', 'c'],
        ['Pull-up', 'bw', 'c'], ['Lat Pulldown', 'gym', 'c'], ['Barbell Row', 'gym', 'c'], ['Seated Cable Row', 'gym', 'c'], ['Chest Supported Row', 'gym', 'c'],
        ['One Arm DB Row', 'db', 'c'], ['Inverted Row', 'bw', 'c'], ['Straight Arm Pulldown', 'gym', 'i'],
        ['Squat', 'gym', 'c'], ['Leg Press', 'gym', 'c'], ['Goblet Squat', 'db', 'c'], ['Bulgarian Split Squat', 'db', 'c'], ['Walking Lunge', 'db', 'c'], ['Bodyweight Squat', 'bw', 'c'],
        ['Leg Extension', 'gym', 'i'], ['Romanian Deadlift', 'gym', 'c'], ['DB Romanian Deadlift', 'db', 'c'], ['Nordic Curl', 'bw', 'c'], ['Single Leg RDL', 'bw', 'c'], ['Leg Curl', 'gym', 'i'], ['Hip Thrust', 'gym', 'c'], ['Glute Bridge', 'bw', 'i'],
        ['Standing Calf Raise', 'gym', 'i'], ['Calf Raise', 'bw', 'i'],
        ['Military Press', 'gym', 'c'], ['Shoulder Press', 'db', 'c'], ['Pike Push-up', 'bw', 'c'], ['Lateral Raise', 'db', 'i'], ['Cable Lateral Raise', 'gym', 'i'], ['Rear Delt Fly', 'db', 'i'], ['Face Pull', 'gym', 'i'],
        ['Barbell Curl', 'gym', 'i'], ['Cable Curl', 'gym', 'i'], ['Incline DB Curl', 'db', 'i'], ['Hammer Curl', 'db', 'i'],
        ['Triceps Pushdown', 'gym', 'i'], ['Overhead Rope Ext.', 'gym', 'i'], ['DB Overhead Extension', 'db', 'i'], ['Close Grip Push-up', 'bw', 'c'], ['Bench Dips', 'bw', 'i'],
        ['Plank', 'bw', 'i'], ['Hanging Leg Raise', 'bw', 'i'], ['Cable Crunch', 'gym', 'i'], ['Ab Wheel', 'bw', 'i'], ['Russian Twist', 'bw', 'i']
    ].map(([name, equip, type]) => ({ name, equip, type, muscle: O2.muscleOf(name) }));

    // Eski kütüphanedeki hareketleri de seçiciye ekle (tekrarsız)
    O2.exercisePool = () => {
        const list = [...POOL];
        if (typeof exerciseLibrary !== 'undefined') {
            Object.values(exerciseLibrary).flat().forEach(e => {
                if (!list.some(x => x.name === e.name)) list.push({ name: e.name, equip: 'gym', type: 'i', muscle: O2.muscleOf(e.name), tempo: e.defaultTempo, rpe: e.defaultRpe });
            });
        }
        return list;
    };

    // ==========================================
    // 🧠 AKILLI ŞABLON MOTORU (yapay zekâ yoksa / yanıt bozuksa)
    // ==========================================
    const SESSIONS = {
        push: { name: 'İtme (Push)', slots: [['chest', 'c'], ['chest', 'c'], ['shoulders', 'c'], ['shoulders', 'i'], ['chest', 'i'], ['triceps', 'i'], ['triceps', 'i']] },
        pull: { name: 'Çekme (Pull)', slots: [['back', 'c'], ['back', 'c'], ['back', 'c'], ['shoulders', 'i', /rear|face/i], ['biceps', 'i'], ['biceps', 'i'], ['core', 'i']] },
        legs: { name: 'Bacak (Legs)', slots: [['quads', 'c'], ['hamstrings', 'c'], ['quads', 'c'], ['glutes', 'c'], ['hamstrings', 'i'], ['calves', 'i'], ['core', 'i']] },
        upper: { name: 'Üst Vücut', slots: [['chest', 'c'], ['back', 'c'], ['shoulders', 'c'], ['back', 'c'], ['chest', 'i'], ['biceps', 'i'], ['triceps', 'i']] },
        lower: { name: 'Alt Vücut', slots: [['quads', 'c'], ['hamstrings', 'c'], ['glutes', 'c'], ['quads', 'i'], ['hamstrings', 'i'], ['calves', 'i'], ['core', 'i']] },
        fullA: { name: 'Tüm Vücut A', slots: [['quads', 'c'], ['chest', 'c'], ['back', 'c'], ['shoulders', 'c'], ['hamstrings', 'c'], ['biceps', 'i'], ['core', 'i']] },
        fullB: { name: 'Tüm Vücut B', slots: [['hamstrings', 'c'], ['shoulders', 'c'], ['back', 'c'], ['chest', 'c'], ['quads', 'c'], ['triceps', 'i'], ['core', 'i']] }
    };
    const SPLITS = {
        2: { pattern: [0, null, null, 1, null, null, null], sessions: ['fullA', 'fullB'] },
        3: { pattern: [0, null, 1, null, 2, null, null], sessions: ['push', 'pull', 'legs'] },
        4: { pattern: [0, 1, null, 2, 3, null, null], sessions: ['upper', 'lower', 'upper', 'lower'] },
        5: { pattern: [0, 1, 2, null, 3, 4, null], sessions: ['push', 'pull', 'legs', 'upper', 'lower'] },
        6: { pattern: [0, 1, 2, 3, 4, 5, null], sessions: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] }
    };
    const FOCUS_EXTRA = { 'Üst vücut': [['chest', 'i'], ['back', 'i']], 'Alt vücut': [['glutes', 'c'], ['quads', 'i']], 'Omuz & kol': [['shoulders', 'i'], ['biceps', 'i']] };

    function schemeFor(goal, level, ex, slotIndex) {
        const isTime = /plank/i.test(ex.name);
        let sets, reps, tempo, rpe;
        if (goal === 'Güç') {
            if (ex.type === 'c' && slotIndex === 0) { sets = 5; reps = '3-5'; tempo = '2-1-1-0'; rpe = 8; }
            else if (ex.type === 'c') { sets = 4; reps = '5-8'; tempo = '3-0-1-0'; rpe = 8; }
            else { sets = 3; reps = '8-12'; tempo = '2-0-1-1'; rpe = 8; }
        } else if (goal === 'Yağ yakımı') {
            sets = 3; reps = ex.type === 'c' ? '10-12' : '12-15'; tempo = '2-0-1-0'; rpe = ex.type === 'c' ? 8 : 9;
        } else if (goal === 'Kondisyon') {
            sets = ex.type === 'c' ? 3 : 2; reps = '8-12'; tempo = '2-0-1-0'; rpe = 7;
        } else { // Hipertrofi
            if (ex.type === 'c') { sets = 4; reps = '6-10'; tempo = '3-0-1-0'; rpe = 8; }
            else { sets = 3; reps = '10-15'; tempo = '2-0-1-1'; rpe = 9; }
        }
        if (level === 'Başlangıç') { sets = Math.max(2, sets - 1); rpe = Math.max(6, rpe - 1); }
        if (level === 'İleri') sets += 1;
        if (isTime) return { scheme: `${sets} x ${goal === 'Güç' ? 45 : 60} sn`, tempo: 'Statik', rpe: String(rpe) };
        return { scheme: `${sets} x ${reps}`, tempo, rpe: String(rpe) };
    }

    O2.generateProgram = (opts) => {
        const { goal, days, level, minutes, equip, focus } = opts;
        const split = SPLITS[days] || SPLITS[3];
        let sessions = split.sessions;
        if (days === 3 && level === 'Başlangıç') sessions = ['fullA', 'fullB', 'fullA'];
        const allowed = equip === 'bw' ? ['bw'] : equip === 'db' ? ['db', 'bw'] : ['gym', 'db', 'bw'];
        const pool = POOL.filter(e => allowed.includes(e.equip));
        const count = { 45: 4, 60: 5, 75: 6, 90: 7 }[minutes] || 5;
        const used = {}; // aynı tip seanslar arasında çeşitlilik için

        const out = split.pattern.map((si, d) => {
            if (si === null) return { day: d + 1, title: `Gün ${d + 1}: Dinlenme`, rest: true, ex: [] };
            const key = sessions[si];
            const tpl = SESSIONS[key];
            const variant = used[key] = (used[key] || 0) + 1;
            let slots = tpl.slots.slice(0, count);
            if (FOCUS_EXTRA[focus]) slots = [...slots.slice(0, 2), ...FOCUS_EXTRA[focus].slice(0, 1), ...slots.slice(2)].slice(0, count + 1);
            const picked = [];
            // Seçilen ekipmana en uygun hareketler önce (salonda dambıl/vücut ağırlığı yedekte kalır)
            const rank = (e) => allowed.indexOf(e.equip);
            slots.forEach(([muscle, type, prefer]) => {
                let cands = pool.filter(e => e.muscle === muscle && e.type === type && !picked.includes(e));
                if (prefer && cands.some(e => prefer.test(e.name))) cands = cands.filter(e => prefer.test(e.name));
                if (!cands.length) cands = pool.filter(e => e.muscle === muscle && !picked.includes(e));
                if (!cands.length) return;
                cands = cands.map((e, i) => [e, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]);
                // Aynı seans tipinin A/B versiyonları arasında çeşitlilik: en iyi iki aday arasında dön
                picked.push(cands[(variant - 1) % Math.min(2, cands.length)]);
            });
            const ex = picked.map((e, idx) => ({ name: e.name, ...schemeFor(goal, level, e, idx) }));
            const suffix = sessions.filter(s => s === key).length > 1 ? (variant === 1 ? ' A' : ' B') : '';
            return { day: d + 1, title: `Gün ${d + 1}: ${tpl.name}${suffix}`, rest: false, ex };
        });
        return out;
    };

    // ==========================================
    // ✨ YAPAY ZEKÂ İLE PROGRAM
    // ==========================================
    const FORM = {
        goal: ['Hipertrofi', 'Güç', 'Yağ yakımı', 'Kondisyon'],
        days: ['2', '3', '4', '5', '6'],
        level: ['Başlangıç', 'Orta', 'İleri'],
        minutes: ['45', '60', '75', '90'],
        equip: [['gym', 'Tam salon'], ['db', 'Dambıl'], ['bw', 'Ekipmansız']],
        focus: ['Dengeli', 'Üst vücut', 'Alt vücut', 'Omuz & kol']
    };
    const DEFAULTS = { goal: 'Hipertrofi', days: '4', level: 'Orta', minutes: '60', equip: 'gym', focus: 'Dengeli' };

    const segment = (field, label) => {
        const val = (LS.get('oly2_ai_form', {}) || {})[field] || DEFAULTS[field];
        const opts = FORM[field].map(o => Array.isArray(o) ? o : [o, o]);
        return `<div class="o2-field"><label>${label}</label>
            <div class="o2-segment" data-field="${field}">${opts.map(([v, l]) => `<button class="${v === val ? 'active' : ''}" data-value="${esc(v)}" onclick="O2.formPick(this)">${esc(l)}</button>`).join('')}</div></div>`;
    };
    O2.formPick = (btn) => {
        btn.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
        O2.haptic(6);
    };
    const readForm = () => {
        const out = {};
        document.querySelectorAll('#o2-sheet-layer .o2-segment[data-field]').forEach(seg => {
            const a = seg.querySelector('button.active');
            out[seg.dataset.field] = a ? a.dataset.value : DEFAULTS[seg.dataset.field];
        });
        return out;
    };

    O2.aiBuilderSheet = () => {
        const saved = LS.get('oly2_ai_form', {}) || {};
        O2.sheet('Yapay zekâ ile program', `
            <p style="margin:0;color:var(--o2-text-2);font-size:13px;line-height:1.55">Hedefini ve şartlarını seç; Oly sana 7 günlük, setleri ve temposu ayarlanmış bir program hazırlasın. Sonra dilediğin gibi düzenleyebilirsin.</p>
            ${segment('goal', 'Hedef')}
            ${segment('days', 'Haftada kaç gün')}
            ${segment('level', 'Seviye')}
            ${segment('minutes', 'Seans süresi (dk)')}
            ${segment('equip', 'Ekipman')}
            ${segment('focus', 'Öncelikli bölge')}
            <div class="o2-field"><label>Not (isteğe bağlı)</label><input class="o2-input" id="o2-ai-note" placeholder="Ör. sol omzumda hassasiyet var, deadlift istemiyorum" value="${esc(saved.note || '')}"></div>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:20px" id="o2-ai-go" onclick="O2.runAiBuilder()">${I('spark')}Programı oluştur</button>
            <p style="margin:10px 0 0;text-align:center;font-size:11.5px;color:var(--o2-text-3)">${typeof askGeminiAI === 'function' && localStorage.getItem('OLY_API_KEY') ? 'Gemini ile oluşturulur' : 'Gemini anahtarı yoksa Olympus akıllı şablonu kullanılır'}</p>`);
    };

    O2.runAiBuilder = async () => {
        const f = readForm();
        f.note = $('o2-ai-note').value.trim();
        LS.set('oly2_ai_form', f);
        const opts = { goal: f.goal, days: parseInt(f.days), level: f.level, minutes: parseInt(f.minutes), equip: f.equip, focus: f.focus, note: f.note };
        const btn = $('o2-ai-go');
        btn.disabled = true;
        btn.innerHTML = `${I('spark')}Oly programını hazırlıyor…`;

        let days = null, source = 'rule';
        if (typeof askGeminiAI === 'function' && localStorage.getItem('OLY_API_KEY')) {
            try {
                days = await aiProgram(opts);
                source = 'ai';
            } catch (e) {
                console.warn('Yapay zekâ programı okunamadı, şablona geçiliyor:', e);
            }
        }
        if (!days) days = O2.generateProgram(opts);

        const equipLabel = { gym: 'Salon', db: 'Dambıl', bw: 'Ev' }[opts.equip];
        O2.openBuilder({
            id: null,
            name: `${opts.goal} · ${opts.days} Gün${opts.equip !== 'gym' ? ` · ${equipLabel}` : ''}`,
            icon: { 'Hipertrofi': '🦍', 'Güç': '🦾', 'Yağ yakımı': '⚡', 'Kondisyon': '🏃' }[opts.goal] || '🏋️',
            source, settings: opts, programData: days
        });
        O2.toast(source === 'ai' ? 'Gemini programını hazırladı · düzenleyip kaydet' : 'Program hazır · düzenleyip kaydet', 'spark');
    };

    async function aiProgram(o) {
        const names = POOL.filter(e => o.equip === 'gym' || (o.equip === 'db' ? ['db', 'bw'] : ['bw']).includes(e.equip)).map(e => e.name).join(', ');
        const prompt = `Sen elit bir kuvvet antrenörüsün. Aşağıdaki sporcu için 7 günlük haftalık antrenman programı hazırla.
Hedef: ${o.goal}. Haftada ${o.days} antrenman günü (kalan günler dinlenme). Seviye: ${o.level}. Seans süresi: ${o.minutes} dakika. Ekipman: ${{ gym: 'tam donanımlı salon', db: 'sadece dambıl ve vücut ağırlığı', bw: 'ekipmansız, sadece vücut ağırlığı' }[o.equip]}. Öncelikli bölge: ${o.focus}.${o.note ? ` Sporcunun notu: ${o.note}.` : ''}
Mümkün olduğunca şu hareket adlarını aynen kullan: ${names}.
SADECE geçerli JSON döndür, açıklama yazma. Biçim:
{"days":[{"title":"Gün 1: İtme (Push)","rest":false,"ex":[{"name":"Bench Press","scheme":"4 x 6-8","tempo":"3-0-1-0","rpe":"8"}]}, {"title":"Gün 2: Dinlenme","rest":true,"ex":[]}]}
Tam olarak 7 gün olmalı. scheme biçimi "SET x TEKRAR" (ör. "3 x 10-12" veya "3 x 45 sn"). Her antrenman gününde süreye uygun 4-7 hareket olsun.`;
        const text = await askGeminiAI(prompt);
        const json = String(text).replace(/```json|```/g, '').trim();
        const start = json.indexOf('{'), end = json.lastIndexOf('}');
        const data = JSON.parse(json.slice(start, end + 1));
        const days = (data.days || []).slice(0, 7).map((d, i) => ({
            day: i + 1,
            title: String(d.title || `Gün ${i + 1}`).slice(0, 60),
            rest: !!d.rest || !(d.ex && d.ex.length),
            ex: (d.ex || []).slice(0, 9).map(e => ({
                name: String(e.name || '').slice(0, 50),
                scheme: /\d\s*[x×]/i.test(e.scheme) ? String(e.scheme) : '3 x 10-12',
                tempo: String(e.tempo || '2-0-1-0').slice(0, 12),
                rpe: String(e.rpe || '8').slice(0, 4)
            })).filter(e => e.name)
        }));
        if (days.length !== 7 || !days.some(d => !d.rest)) throw new Error('Geçersiz program');
        return days;
    }

    // ==========================================
    // 🛠️ MANUEL PROGRAM DÜZENLEYİCİ
    // ==========================================
    // Taslak her değişiklikte saklanır; uygulama kapansa bile kaybolmaz
    const draft = () => LS.get('oly2_builder_draft', null);
    const saveDraft = (d) => LS.set('oly2_builder_draft', d);

    O2.openBuilder = (program) => {
        const d = program || {
            id: null, name: '', icon: '⚙️', source: 'manual',
            programData: [{ day: 1, title: 'Gün 1: Yeni antrenman', rest: false, ex: [] }]
        };
        d.sel = 0;
        saveDraft(JSON.parse(JSON.stringify(d)));
        O2.closeSheet(true);
        O2.ui.tab = 'builder';
        document.querySelectorAll('.o2-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === 'train'));
        O2.render();
        $('o2-view').scrollTo({ top: 0 });
    };

    O2.editProgram = (id) => {
        const p = (LS.get('olympus_custom_profiles', []) || []).find(x => x.id === id);
        if (p) O2.openBuilder({ ...p, programData: JSON.parse(JSON.stringify(p.programData || [])) });
    };

    O2.renderBuilder = () => {
        const d = draft();
        if (!d) return '<div class="o2-empty">Taslak bulunamadı.</div>';
        const day = d.programData[d.sel] || d.programData[0];
        const sourceLabel = d.source === 'ai' ? 'Gemini ile oluşturuldu' : d.source === 'rule' ? 'Olympus akıllı şablonu' : d.id ? 'Program düzenleniyor' : 'Manuel program';
        return `
        <div class="o2-stagger">
            <button class="o2-link" style="display:inline-flex;align-items:center;gap:4px;margin:4px 0 10px" onclick="O2.leaveBuilder()">${I('back')}Antrenman</button>
            <div class="o2-eyebrow">${esc(sourceLabel)}</div>
            <input class="o2-title-input" value="${esc(d.name)}" placeholder="Program adı" oninput="O2.builderSet('name', this.value)">

            <div class="o2-day-chips">
                ${d.programData.map((x, i) => `<button class="${i === d.sel ? 'active' : ''} ${x.rest ? 'rest' : ''}" onclick="O2.builderSelect(${i})"><small>GÜN</small>${i + 1}</button>`).join('')}
                ${d.programData.length < 7 ? `<button class="add" onclick="O2.builderAddDay()" aria-label="Gün ekle">${I('plus')}</button>` : ''}
            </div>

            <div class="o2-card" style="margin-top:12px">
                <div class="o2-field" style="margin-top:0"><label>Gün başlığı</label><input class="o2-input" value="${esc(day.title)}" oninput="O2.builderDaySet('title', this.value)"></div>
                <div class="o2-toggle-row" onclick="O2.builderToggleRest()">
                    <div><h5>Dinlenme günü</h5><p>Bu gün antrenman yapılmaz; toparlanma önerileri gösterilir.</p></div>
                    <span class="o2-switch ${day.rest ? 'on' : ''}"></span>
                </div>
                ${day.rest ? '' : `
                <div class="o2-list" style="margin-top:6px">
                    ${day.ex.length ? day.ex.map((e, i) => `
                    <div class="o2-row is-tap" onclick="O2.builderExSheet(${i})">
                        <div class="o2-row-idx">${i + 1}</div>
                        <div class="o2-row-main"><h5>${esc(e.name)}</h5><p>${esc(e.scheme)} · Tempo ${esc(e.tempo || '—')} · RPE ${esc(e.rpe || '—')}</p></div>
                        <span class="o2-chip">${O2.MUSCLES[O2.muscleOf(e.name)]}</span>
                    </div>`).join('') : `<div class="o2-empty" style="padding:18px 6px">Bu güne henüz hareket eklenmedi.</div>`}
                </div>
                <button class="o2-btn o2-btn-ghost o2-btn-block" style="margin-top:12px" onclick="O2.exercisePicker()">${I('plus')}Hareket ekle</button>`}
                ${d.programData.length > 1 ? `<button class="o2-btn o2-btn-ghost o2-btn-sm" style="margin-top:10px;color:var(--o2-text-3)" onclick="O2.builderRemoveDay()">Bu günü sil</button>` : ''}
            </div>

            <div class="o2-card" style="margin-top:12px">
                <div class="o2-grid-3">
                    <div><div class="o2-eyebrow">Antrenman</div><div style="font-size:22px;font-weight:800;margin-top:4px">${d.programData.filter(x => !x.rest).length} gün</div></div>
                    <div><div class="o2-eyebrow">Hareket</div><div style="font-size:22px;font-weight:800;margin-top:4px">${d.programData.reduce((a, x) => a + (x.rest ? 0 : x.ex.length), 0)}</div></div>
                    <div><div class="o2-eyebrow">Set / hafta</div><div style="font-size:22px;font-weight:800;margin-top:4px">${d.programData.reduce((a, x) => a + (x.rest ? 0 : x.ex.reduce((b, e) => b + O2.parseScheme(e.scheme).sets, 0)), 0)}</div></div>
                </div>
            </div>

            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:18px" onclick="O2.saveBuilder()">${I('check')}Kaydet ve aktif et</button>
            ${d.id ? `<button class="o2-btn o2-btn-danger o2-btn-block" style="margin-top:10px" onclick="O2.deleteProgram('${esc(d.id)}')">Programı sil</button>` : ''}
        </div>`;
    };

    const mutate = (fn, rerender = true) => {
        const d = draft();
        fn(d, d.programData[d.sel]);
        saveDraft(d);
        if (rerender) O2.render();
    };
    O2.builderSet = (k, v) => mutate(d => { d[k] = v; }, false);
    O2.builderDaySet = (k, v) => mutate((d, day) => { day[k] = v; }, false);
    O2.builderSelect = (i) => { O2.haptic(6); mutate(d => { d.sel = i; }); };
    O2.builderToggleRest = () => mutate((d, day) => {
        day.rest = !day.rest;
        const n = d.sel + 1;
        if (day.rest && !/dinlen/i.test(day.title)) day.title = `Gün ${n}: Dinlenme`;
        if (!day.rest && /dinlen/i.test(day.title)) day.title = `Gün ${n}: Antrenman`;
    });
    O2.builderAddDay = () => mutate(d => {
        const n = d.programData.length + 1;
        d.programData.push({ day: n, title: `Gün ${n}: Yeni antrenman`, rest: false, ex: [] });
        d.sel = n - 1;
    });
    O2.builderRemoveDay = () => {
        if (!confirm('Bu gün programdan silinsin mi?')) return;
        mutate(d => {
            d.programData.splice(d.sel, 1);
            d.programData.forEach((x, i) => { x.day = i + 1; x.title = String(x.title).replace(/^Gün \d+/, `Gün ${i + 1}`); });
            d.sel = Math.max(0, d.sel - 1);
        });
    };

    O2.exercisePicker = (filter = 'all', query = '') => {
        const pool = O2.exercisePool();
        const groups = ['all', ...Object.keys(O2.MUSCLES)];
        const list = pool.filter(e => (filter === 'all' || e.muscle === filter) && (!query || e.name.toLowerCase().includes(query.toLowerCase())));
        const body = `
            <input class="o2-input" id="o2-ex-search" placeholder="Hareket ara veya yeni ad yaz" value="${esc(query)}" oninput="O2.exercisePicker('${filter}', this.value)">
            <div class="o2-chips" style="margin:12px 0 4px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px">${groups.map(g => `<button class="o2-chip ${g === filter ? 'gold' : ''}" onclick="O2.exercisePicker('${g}', document.getElementById('o2-ex-search').value)">${g === 'all' ? 'Tümü' : O2.MUSCLES[g]}</button>`).join('')}</div>
            <div class="o2-list">
                ${query && !pool.some(e => e.name.toLowerCase() === query.toLowerCase()) ? `
                <div class="o2-row is-tap" onclick="O2.builderAddEx(${jsArg(query)})"><div class="o2-row-idx" style="color:var(--o2-gold)">${I('plus')}</div><div class="o2-row-main"><h5>"${esc(query)}" ekle</h5><p>Özel hareket</p></div></div>` : ''}
                ${list.map(e => `
                <div class="o2-row is-tap" onclick="O2.builderAddEx(${jsArg(e.name)})">
                    <div class="o2-row-main"><h5>${esc(e.name)}</h5><p>${O2.MUSCLES[e.muscle]} · ${{ gym: 'Salon', db: 'Dambıl', bw: 'Vücut ağırlığı' }[e.equip]}</p></div>
                    ${I('plus', 'chev')}
                </div>`).join('')}
            </div>`;
        if (O2.isSheetOpen() && $('o2-ex-search')) {
            // Arama yazarken sayfayı yeniden açmadan yalnızca içeriği güncelle (odak korunur)
            const sheetBody = $('o2-sheet-layer').querySelector('.o2-sheet-body');
            const pos = $('o2-ex-search').selectionStart;
            sheetBody.innerHTML = body;
            const input = $('o2-ex-search');
            input.focus();
            try { input.setSelectionRange(pos, pos); } catch (e) { }
        } else {
            O2.sheet('Hareket ekle', body);
        }
    };

    O2.builderAddEx = (name) => {
        const pool = O2.exercisePool();
        const p = pool.find(e => e.name === name) || { name, type: 'i', muscle: O2.muscleOf(name) };
        const goal = (draft().settings || {}).goal || 'Hipertrofi';
        const level = (draft().settings || {}).level || 'Orta';
        const sch = schemeFor(goal, level, p, p.type === 'c' ? 1 : 3);
        mutate((d, day) => day.ex.push({ name, scheme: sch.scheme, tempo: p.tempo || sch.tempo, rpe: p.rpe || sch.rpe }));
        O2.closeSheet();
        O2.toast(`${name} eklendi`, 'plus');
    };

    O2.builderExSheet = (i) => {
        const d = draft();
        const e = d.programData[d.sel].ex[i];
        const n = d.programData[d.sel].ex.length;
        O2.sheet(e.name, `
            <div class="o2-field" style="margin-top:0"><label>Hareket adı</label><input class="o2-input" id="o2-bx-name" value="${esc(e.name)}"></div>
            <div class="o2-field"><label>Set × tekrar</label><input class="o2-input" id="o2-bx-scheme" value="${esc(e.scheme)}" placeholder="4 x 8-10"></div>
            <div class="o2-grid-2">
                <div class="o2-field"><label>Tempo</label><input class="o2-input" id="o2-bx-tempo" value="${esc(e.tempo || '')}" placeholder="3-0-1-0"></div>
                <div class="o2-field"><label>RPE</label><input class="o2-input" id="o2-bx-rpe" value="${esc(e.rpe || '')}" placeholder="8" inputmode="decimal"></div>
            </div>
            <div class="o2-grid-2" style="margin-top:16px">
                <button class="o2-btn o2-btn-ghost" ${i === 0 ? 'disabled' : ''} onclick="O2.builderMoveEx(${i}, -1)">Yukarı</button>
                <button class="o2-btn o2-btn-ghost" ${i === n - 1 ? 'disabled' : ''} onclick="O2.builderMoveEx(${i}, 1)">Aşağı</button>
            </div>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:12px" onclick="O2.builderSaveEx(${i})">Kaydet</button>
            <button class="o2-btn o2-btn-danger o2-btn-block" style="margin-top:10px" onclick="O2.builderRemoveEx(${i})">Hareketi kaldır</button>`);
    };
    O2.builderSaveEx = (i) => {
        const scheme = $('o2-bx-scheme').value.trim();
        if (!/\d\s*[x×]\s*\S/i.test(scheme)) { O2.toast('Set biçimi "4 x 8-10" gibi olmalı', 'bolt'); return; }
        mutate((d, day) => Object.assign(day.ex[i], {
            name: $('o2-bx-name').value.trim() || day.ex[i].name,
            scheme, tempo: $('o2-bx-tempo').value.trim(), rpe: $('o2-bx-rpe').value.trim()
        }));
        O2.closeSheet();
    };
    O2.builderMoveEx = (i, dir) => {
        mutate((d, day) => { const [x] = day.ex.splice(i, 1); day.ex.splice(i + dir, 0, x); });
        O2.closeSheet();
    };
    O2.builderRemoveEx = (i) => { mutate((d, day) => day.ex.splice(i, 1)); O2.closeSheet(); };

    O2.saveBuilder = () => {
        const d = draft();
        if (!d.name || !d.name.trim()) { O2.toast('Programa bir ad ver', 'bolt'); return; }
        if (!d.programData.some(x => !x.rest && x.ex.length)) { O2.toast('En az bir antrenman gününe hareket ekle', 'bolt'); return; }
        const id = d.id || 'custom_' + Date.now();
        const record = {
            id, name: d.name.trim(), icon: d.icon || '⚙️', date: O2.trDate(), source: d.source || 'manual',
            settings: d.settings || null,
            programData: d.programData.map((x, i) => ({ day: i + 1, title: x.title, rest: !!x.rest, ex: x.rest ? [] : x.ex }))
        };
        const list = (LS.get('olympus_custom_profiles', []) || []).filter(p => p.id !== id);
        list.push(record);
        LS.set('olympus_custom_profiles', list);
        localStorage.setItem('olympus_active_profile_id', id);
        localStorage.removeItem('oly2_builder_draft');
        O2.saveSettings({ program: id });
        O2.haptic([20, 50, 20]);
        O2.ui.tab = 'train';
        O2.go('train', true);
        O2.toast(`"${record.name}" kaydedildi ve aktif`, 'check');
    };

    O2.deleteProgram = (id) => {
        if (!confirm('Bu program silinsin mi? Antrenman geçmişin etkilenmez.')) return;
        LS.set('olympus_custom_profiles', (LS.get('olympus_custom_profiles', []) || []).filter(p => p.id !== id));
        if (O2.settings().program === id) O2.saveSettings({ program: 'p1' });
        localStorage.removeItem('oly2_builder_draft');
        O2.go('train', true);
        O2.toast('Program silindi', 'close');
    };

    O2.leaveBuilder = () => {
        const d = draft();
        if (d && !d.id && d.programData.some(x => x.ex.length) && !confirm('Kaydedilmemiş program kapatılsın mı?')) return;
        localStorage.removeItem('oly2_builder_draft');
        O2.go('train');
    };

    // Antrenman sekmesindeki "Programlarım" bölümü
    O2.programsSection = () => {
        const active = O2.activeProgram();
        const custom = (LS.get('olympus_custom_profiles', []) || []).filter(p => Array.isArray(p.programData) && p.programData.length);
        const builtin = O2.programs().filter(p => !custom.some(c => c.id === p.id));
        const row = (p, isCustom) => `
            <div class="o2-row is-tap" onclick="O2.pickProgram('${esc(p.id)}')">
                <div class="o2-row-idx" style="font-size:18px">${isCustom ? esc(p.icon || '⚙️') : I('train')}</div>
                <div class="o2-row-main"><h5>${esc(p.name)}</h5><p>${isCustom ? `${p.programData.filter(x => !x.rest && x.ex && x.ex.length).length} gün · ${{ ai: 'Gemini', rule: 'Akıllı şablon', manual: 'Manuel' }[p.source] || 'Özel'} · ${esc(p.date || '')}` : esc(p.sub)}</p></div>
                ${p.id === active.id ? '<span class="o2-chip gold">Aktif</span>' : ''}
                ${isCustom ? `<button class="o2-icon-btn" style="width:34px;height:34px" onclick="event.stopPropagation(); O2.editProgram('${esc(p.id)}')" aria-label="Düzenle">${I('settings')}</button>` : ''}
            </div>`;
        return `
            <div class="o2-section-head"><h3>Programlarım</h3></div>
            <div class="o2-grid-2">
                <button class="o2-card o2-card-glow is-tap o2-create" onclick="O2.aiBuilderSheet()"><span class="o2-coach-orb" style="width:38px;height:38px">${I('spark')}</span><h4>Yapay zekâ ile oluştur</h4><p>Hedefine göre 7 günlük program</p></button>
                <button class="o2-card is-tap o2-create" onclick="O2.openBuilder()"><span class="o2-coach-orb" style="width:38px;height:38px;background:rgba(255,255,255,.08);color:var(--o2-text);box-shadow:none">${I('list')}</span><h4>Manuel oluştur</h4><p>Gün gün kendin kur</p></button>
            </div>
            <div class="o2-card" style="padding:4px 18px;margin-top:12px"><div class="o2-list">
                ${builtin.map(p => row(p, false)).join('')}
                ${custom.map(p => row(p, true)).join('')}
            </div></div>`;
    };
})();
