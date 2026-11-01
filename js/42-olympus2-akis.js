// Olympus Training — Akış: günlük rutin ve saatler (Dayflow'un sade sürümü)
// Rutin bloklar haftanın günlerine göre tekrarlanır; günlük görevler, alışkanlıklar, odak zamanlayıcı ve AI planlayıcı.
// Veriler: oly2_flow. Antrenman, Akademi ve öğün blokları ilgili ekranlara bağlanır; bloklar bildirim takvimine girer.
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);
    const KEY = 'oly2_flow';

    const CATS = {
        spor: { name: 'Spor', color: '#ff7a45', icon: 'train' },
        calisma: { name: 'Çalışma', color: '#6b9cf5', icon: 'shield' },
        yemek: { name: 'Yemek', color: '#3ddc97', icon: 'fuel' },
        saglik: { name: 'Sağlık', color: '#5ac8fa', icon: 'drop' },
        kisisel: { name: 'Kişisel', color: '#a78bfa', icon: 'leaf' },
        uyku: { name: 'Uyku', color: '#8e8ea0', icon: 'moon' }
    };
    const ALL = [1, 2, 3, 4, 5, 6, 7];
    const uid = () => Math.random().toString(36).slice(2, 9);
    const DEFAULT_ROUTINE = [
        ['07:00', 30, 'Uyanış · su ve esneme', 'saglik', ''],
        ['07:30', 30, 'Kahvaltı', 'yemek', 'meal'],
        ['09:00', 120, 'Odak çalışma', 'calisma', ''],
        ['12:30', 45, 'Öğle yemeği', 'yemek', 'meal'],
        ['14:00', 30, 'Mülakat kartları', 'calisma', 'academy'],
        ['16:30', 15, 'Ara öğün', 'yemek', 'meal'],
        ['18:00', 75, 'Antrenman', 'spor', 'workout'],
        ['19:30', 45, 'Akşam yemeği', 'yemek', 'meal'],
        ['21:30', 30, 'Okuma', 'kisisel', ''],
        ['23:00', 30, 'Uyku hazırlığı · ekransız', 'uyku', '']
    ].map(([time, dur, title, cat, link]) => ({ id: uid(), time, dur, title, cat, link, days: ALL.slice(), remind: true }));
    const DEFAULT_HABITS = [
        { id: 'water', title: 'Su hedefi', icon: '💧', auto: 'water' },
        { id: 'train', title: 'Antrenman / aktif dinlenme', icon: '🏋️', auto: 'train' },
        { id: 'cards', title: '10 mülakat kartı', icon: '🛡️', auto: 'academy' },
        { id: 'read', title: '20 sayfa okuma', icon: '📖' },
        { id: 'sleep', title: '23:30 öncesi yatış', icon: '🌙' }
    ];

    const state = () => {
        const s = LS.get(KEY, null);
        if (s) return { routine: [], tasks: {}, done: {}, skip: {}, habits: DEFAULT_HABITS, habitLog: {}, focus: {}, ...s };
        // İlk açılışta varsayılan rutini kaydet: blok kimlikleri sabit kalsın (bildirimler ve işaretler buna bağlı)
        const fresh = { routine: DEFAULT_ROUTINE, tasks: {}, done: {}, skip: {}, habits: DEFAULT_HABITS, habitLog: {}, focus: {} };
        LS.set(KEY, fresh);
        return fresh;
    };
    const save = (st) => {
        // Eski günlerin kayıtlarını sınırla (60 gün)
        const cut = O2.dayKey(O2.addDays(O2.startOfDay(), -60));
        ['tasks', 'done', 'skip', 'habitLog', 'focus'].forEach(k => Object.keys(st[k] || {}).forEach(d => { if (d < cut) delete st[k][d]; }));
        LS.set(KEY, st);
        if (O2.refreshNotifications) O2.refreshNotifications();
    };
    const update = (fn, rerender = true) => { const st = state(); fn(st); save(st); if (rerender && O2.ui.tab === 'flow') O2.render(); };

    const weekday = (d) => ((d.getDay() + 6) % 7) + 1; // Pazartesi = 1
    const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
    const fmt = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
    const dayOf = (off) => O2.addDays(O2.startOfDay(), off);

    // Seçili günün blokları (rutin + o güne özel görevler), saat sırasıyla
    function blocksFor(st, date) {
        const dk = O2.dayKey(date), wd = weekday(date);
        const skip = st.skip[dk] || [];
        const off = Math.round((O2.startOfDay(date) - O2.startOfDay()) / 864e5);
        const plan = O2.dayPlan(off);
        const list = [
            ...st.routine.filter(b => (b.days || ALL).includes(wd) && !skip.includes(b.id)).map(b => ({ ...b, routine: true })),
            ...(st.tasks[dk] || []).filter(t => t.time).map(t => ({ ...t, routine: false }))
        ].map(b => {
            // Antrenman bloğu o günün planından başlık alır; dinlenme gününde aktif dinlenmeye döner
            if (b.link === 'workout') return { ...b, title: plan.isRest ? 'Aktif dinlenme · yürüyüş & mobilite' : String(plan.title || b.title).split(':').pop().trim(), rest: plan.isRest };
            return b;
        });
        return list.sort((a, b) => toMin(a.time) - toMin(b.time));
    }
    const isDone = (st, dk, b) => (st.done[dk] || []).includes(b.id) || (!b.routine && b.done);

    // Otomatik alışkanlıklar: su, antrenman, Akademi
    function habitDone(st, h, dk) {
        if ((st.habitLog[dk] || []).includes(h.id)) return true;
        if (dk !== O2.dayKey()) return false;
        if (h.auto === 'water') { const w = O2.water(); return w.amount >= w.goal; }
        if (h.auto === 'train') return O2.sessions().some(s => s.dayKey === dk) || O2.dayPlan(0).isRest;
        if (h.auto === 'academy') { const a = LS.get('oly2_academy', null); return !!(a && (a.days || []).includes(dk)); }
        return false;
    }
    function streak(st, h) {
        let n = 0;
        for (let i = 0; i < 365; i++) {
            const dk = O2.dayKey(dayOf(-i));
            if (habitDone(st, h, dk)) n++;
            else if (i > 0) break;
        }
        return n;
    }

    // ==========================================
    // 🖥️ EKRAN
    // ==========================================
    O2.renderFlow = () => {
        const st = state();
        const off = O2.ui.flowOffset || 0;
        const date = dayOf(off), dk = O2.dayKey(date);
        const blocks = blocksFor(st, date);
        const doneN = blocks.filter(b => isDone(st, dk, b)).length;
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        const isToday = off === 0;
        const cur = isToday ? blocks.find(b => toMin(b.time) <= nowMin && nowMin < toMin(b.time) + (b.dur || 30)) : null;
        const next = isToday ? blocks.find(b => toMin(b.time) > nowMin) : null;
        const focusMin = st.focus[dk] || 0;
        let nowPlaced = !isToday;

        const row = (b) => {
            const c = CATS[b.cat] || CATS.kisisel;
            const s = toMin(b.time), e = s + (b.dur || 30);
            const done = isDone(st, dk, b);
            const past = isToday && e <= nowMin;
            const active = cur && cur.id === b.id;
            let line = '';
            if (!nowPlaced && s > nowMin) { nowPlaced = true; line = `<div class="o2-flow-now"><span>${fmt(nowMin)}</span></div>`; }
            const pct = active ? Math.round((nowMin - s) / (e - s) * 100) : 0;
            return `${line}
            <div class="o2-flow-block ${done ? 'done' : ''} ${past && !done ? 'past' : ''} ${active ? 'active' : ''}" style="--c:${c.color}">
                <div class="o2-flow-time"><b>${esc(b.time)}</b><small>${fmt(e)}</small></div>
                <div class="o2-flow-card" onclick="O2.flowBlockSheet('${b.id}', ${b.routine})">
                    <div class="o2-flow-title"><i>${I(c.icon)}</i><div><h5>${esc(b.title)}</h5><p>${b.dur || 30} dk · ${c.name}${b.routine ? '' : ' · bugüne özel'}${b.remind === false ? '' : ' · 🔔'}</p></div></div>
                    ${active ? `<div class="o2-flow-progress"><i style="width:${pct}%"></i></div><small class="o2-flow-left">${e - nowMin} dk kaldı</small>` : ''}
                    ${active && b.link ? linkButton(b) : ''}
                </div>
                <button class="o2-check ${done ? 'on' : ''}" onclick="O2.flowToggle('${b.id}', ${b.routine})" aria-label="Tamamlandı">${I('check')}</button>
            </div>`;
        };

        return `
        <div class="o2-stagger o2-flow">
            <button class="o2-link" style="display:inline-flex;align-items:center;gap:4px;margin:4px 0 10px" onclick="O2.go('today')">${I('back')}Training</button>
            <div class="o2-eyebrow">${esc(date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
            <h1 class="o2-title">Akış</h1>

            <div class="o2-week" style="margin-top:16px">${O2.WEEKDAYS.map((label, i) => {
                const d = O2.addDays(O2.weekStart(), i);
                const o = Math.round((O2.startOfDay(d) - O2.startOfDay()) / 864e5);
                const k = O2.dayKey(d), bl = blocksFor(st, d);
                const all = bl.length && bl.every(b => isDone(st, k, b));
                return `<div class="o2-week-day is-tap ${o === 0 ? 'today' : ''} ${o === off ? 'selected' : ''} ${all ? 'done' : ''}" onclick="O2.flowDay(${o})"><small>${label}</small><b>${all ? I('check') : d.getDate()}</b></div>`;
            }).join('')}</div>

            <div class="o2-card o2-card-glow o2-flow-hero">
                ${O2.ring({ pct: blocks.length ? doneN / blocks.length : 0, size: 96, stroke: 9, center: `<strong>${doneN}/${blocks.length}</strong><span>BLOK</span>` })}
                <div>
                    ${cur ? `<div class="o2-eyebrow" style="color:${(CATS[cur.cat] || CATS.kisisel).color}">● Şimdi</div><h4>${esc(cur.title)}</h4><p>${toMin(cur.time) + (cur.dur || 30) - nowMin} dk kaldı${next ? ` · sonra ${esc(next.time)} ${esc(next.title)}` : ''}</p>`
                    : next ? `<div class="o2-eyebrow">Sıradaki · ${esc(next.time)}</div><h4>${esc(next.title)}</h4><p>${toMin(next.time) - nowMin} dk sonra başlıyor</p>`
                    : isToday ? `<div class="o2-eyebrow">Gün tamam</div><h4>${doneN === blocks.length && blocks.length ? 'Kusursuz gün 👑' : 'Bugünün blokları bitti'}</h4><p>Yarının akışına göz at.</p>`
                    : `<div class="o2-eyebrow">${off > 0 ? 'Planlanan' : 'Geçmiş'}</div><h4>${blocks.length} blok</h4><p>${blocks.reduce((a, b) => a + (b.dur || 30), 0)} dk planlı zaman</p>`}
                    ${focusMin ? `<p style="margin-top:6px;color:var(--o2-gold)">⏱ ${focusMin} dk odak</p>` : ''}
                </div>
            </div>

            <div class="o2-grid-2" style="margin-top:12px">
                <button class="o2-btn o2-btn-gold" onclick="O2.flowBlockSheet()">${I('plus')}Blok ekle</button>
                <button class="o2-btn o2-btn-ghost" onclick="O2.flowAISheet()">${I('spark')}AI ile planla</button>
            </div>

            <div class="o2-section-head"><h3>Zaman çizelgesi</h3><button class="o2-link" onclick="O2.flowRoutineSheet()">Rutini düzenle</button></div>
            <div class="o2-flow-list">${blocks.map(row).join('')}${!nowPlaced ? `<div class="o2-flow-now"><span>${fmt(nowMin)}</span></div>` : ''}</div>
            ${!blocks.length ? `<div class="o2-card o2-empty">${I('clock')}<br>Bu gün için blok yok. "Blok ekle" ya da "AI ile planla".</div>` : ''}

            <div class="o2-section-head"><h3>Alışkanlıklar</h3><button class="o2-link" onclick="O2.flowHabitSheet()">Düzenle</button></div>
            <div class="o2-flow-habits">${st.habits.map(h => {
                const on = habitDone(st, h, dk), sk = streak(st, h);
                return `<button class="o2-flow-habit ${on ? 'on' : ''}" onclick="O2.flowHabit('${h.id}')"><span>${esc(h.icon || '✓')}</span><b>${esc(h.title)}</b><small>${sk ? `🔥 ${sk} gün` : h.auto ? 'otomatik' : 'dokun'}</small></button>`;
            }).join('')}</div>

            <div class="o2-section-head"><h3>Odak</h3><span class="o2-link" style="color:var(--o2-text-3)">bugün ${st.focus[O2.dayKey()] || 0} dk</span></div>
            <div class="o2-card o2-flow-focus">
                <div><h4>Derin çalışma zamanlayıcı</h4><p>Telefonu bırak, tek işe odaklan. Bitince bildirim gelir.</p></div>
                <div class="o2-grid-3" style="margin-top:12px">${[25, 50, 90].map(m => `<button class="o2-btn o2-btn-ghost" onclick="O2.flowFocus(${m})">${m} dk</button>`).join('')}</div>
            </div>
        </div>`;
    };

    function linkButton(b) {
        if (b.link === 'workout' && !b.rest) return `<button class="o2-btn o2-btn-gold o2-btn-sm" style="margin-top:10px" onclick="event.stopPropagation(); O2.orb()">${I('play')}Antrenmanı başlat</button>`;
        if (b.link === 'academy') return `<button class="o2-btn o2-btn-ghost o2-btn-sm" style="margin-top:10px" onclick="event.stopPropagation(); O2.acadPractice && O2.acadPractice()">${I('chat')}Kartları aç</button>`;
        if (b.link === 'meal') return `<button class="o2-btn o2-btn-ghost o2-btn-sm" style="margin-top:10px" onclick="event.stopPropagation(); O2.go('fuel')">${I('fuel')}Öğün planı</button>`;
        return '';
    }

    O2.flowDay = (off) => { O2.ui.flowOffset = off; O2.haptic(6); O2.render(); };
    O2.flowToggle = (id, routine) => {
        const dk = O2.dayKey(dayOf(O2.ui.flowOffset || 0));
        update(st => {
            if (routine) {
                const d = st.done[dk] = st.done[dk] || [];
                const i = d.indexOf(id);
                if (i >= 0) d.splice(i, 1); else { d.push(id); O2.haptic([10, 40, 10]); }
            } else {
                const t = (st.tasks[dk] || []).find(x => x.id === id);
                if (t) { t.done = !t.done; if (t.done) O2.haptic([10, 40, 10]); }
            }
            const all = blocksFor(st, dayOf(O2.ui.flowOffset || 0));
            if (all.length && all.every(b => isDone(st, dk, b)) && typeof confetti === 'function') confetti({ particleCount: 90, spread: 70, colors: ['#f6dea0', '#e6c374', '#ffffff'] });
        });
    };
    O2.flowHabit = (id) => {
        const dk = O2.dayKey(dayOf(O2.ui.flowOffset || 0));
        update(st => {
            const h = st.habits.find(x => x.id === id);
            if (h && h.auto && habitDone(st, h, dk) && !(st.habitLog[dk] || []).includes(id)) { O2.toast('Bu alışkanlık otomatik işaretlendi', 'check'); return; }
            const l = st.habitLog[dk] = st.habitLog[dk] || [];
            const i = l.indexOf(id);
            if (i >= 0) l.splice(i, 1); else { l.push(id); O2.haptic([10, 30, 10]); }
        });
    };

    // Blok ekle / düzenle
    O2.flowBlockSheet = (id, routine) => {
        const st = state();
        const dk = O2.dayKey(dayOf(O2.ui.flowOffset || 0));
        const b = id ? (routine ? st.routine.find(x => x.id === id) : (st.tasks[dk] || []).find(x => x.id === id)) : null;
        const v = b || { time: fmt(Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 30) * 30 % 1440), dur: 30, title: '', cat: 'kisisel', days: ALL.slice(), remind: true };
        const repeat = !b ? 'once' : !routine ? 'once' : 'custom';
        O2.sheet(b ? 'Bloğu düzenle' : 'Yeni blok', `
            <div class="o2-field"><label>Ne yapacaksın?</label><input class="o2-input" id="o2-fb-title" maxlength="50" placeholder="Örn. KPSS tarih tekrarı" value="${esc(v.title)}"></div>
            <div class="o2-grid-2">
                <div class="o2-field"><label>Başlangıç</label><input class="o2-input" type="time" id="o2-fb-time" value="${esc(v.time)}"></div>
                <div class="o2-field"><label>Süre (dk)</label><select class="o2-input" id="o2-fb-dur">${[10, 15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240].map(m => `<option value="${m}" ${+v.dur === m ? 'selected' : ''}>${m >= 60 ? `${m / 60} sa`.replace('.5', ',5') : m + ' dk'}</option>`).join('')}</select></div>
            </div>
            <div class="o2-field"><label>Kategori</label><div class="o2-chips" id="o2-fb-cat">${Object.entries(CATS).map(([k, c]) => `<button class="o2-chip ${v.cat === k ? 'gold' : ''}" data-v="${k}" onclick="this.parentElement.querySelectorAll('.o2-chip').forEach(b => b.classList.toggle('gold', b === this))">${c.name}</button>`).join('')}</div></div>
            <div class="o2-field"><label>Tekrar</label>
                <div class="o2-segment" id="o2-fb-rep">
                    <button class="${repeat === 'once' ? 'active' : ''}" data-v="once" onclick="O2.formPick(this); O2.flowRepUI()">Sadece bu gün</button>
                    <button class="${repeat !== 'once' ? 'active' : ''}" data-v="custom" onclick="O2.formPick(this); O2.flowRepUI()">Rutin</button>
                </div>
                <div class="o2-chips" id="o2-fb-days" style="margin-top:10px;${repeat === 'once' ? 'display:none' : ''}">${O2.WEEKDAYS.map((l, i) => `<button class="o2-chip ${(v.days || ALL).includes(i + 1) ? 'gold' : ''}" data-d="${i + 1}" onclick="this.classList.toggle('gold')">${l}</button>`).join('')}</div>
            </div>
            <div class="o2-toggle-row" onclick="this.querySelector('.o2-switch').classList.toggle('on')"><div><h5>Hatırlat</h5><p>Bildirimler'de "Günlük akış" açıksa bu saatte gelir</p></div><span class="o2-switch ${v.remind !== false ? 'on' : ''}" id="o2-fb-remind"></span></div>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:16px" onclick="O2.flowSaveBlock('${b ? b.id : ''}', ${!!routine})">${I('check')}Kaydet</button>
            ${b ? `<div class="o2-grid-2" style="margin-top:10px">
                ${routine ? `<button class="o2-btn o2-btn-ghost" onclick="O2.flowSkip('${b.id}')">Bugün atla</button>` : '<span></span>'}
                <button class="o2-btn o2-btn-danger" onclick="O2.flowDelete('${b.id}', ${!!routine})">${routine ? 'Rutinden sil' : 'Sil'}</button>
            </div>` : ''}`);
    };
    O2.flowRepUI = () => {
        const custom = document.querySelector('#o2-fb-rep .active').dataset.v === 'custom';
        $('o2-fb-days').style.display = custom ? '' : 'none';
    };
    O2.flowSaveBlock = (id, wasRoutine) => {
        const title = $('o2-fb-title').value.trim();
        if (!title) { O2.toast('Bloğa bir ad ver', 'bolt'); return; }
        const catEl = document.querySelector('#o2-fb-cat .gold');
        const cat = catEl ? catEl.dataset.v : 'kisisel';
        const routine = document.querySelector('#o2-fb-rep .active').dataset.v === 'custom';
        const days = [...document.querySelectorAll('#o2-fb-days .gold')].map(x => +x.dataset.d);
        if (routine && !days.length) { O2.toast('En az bir gün seç', 'bolt'); return; }
        const dk = O2.dayKey(dayOf(O2.ui.flowOffset || 0));
        const data = { time: $('o2-fb-time').value || '09:00', dur: +$('o2-fb-dur').value || 30, title: title.slice(0, 50), cat, remind: $('o2-fb-remind').classList.contains('on') };
        update(st => {
            // Eski yerinden kaldır (rutin ↔ tek gün geçişi olabilir)
            if (id) {
                if (wasRoutine) { const old = st.routine.find(x => x.id === id); if (old) data.link = old.link; st.routine = st.routine.filter(x => x.id !== id); }
                else st.tasks[dk] = (st.tasks[dk] || []).filter(x => x.id !== id);
            }
            if (routine) st.routine.push({ id: id || uid(), ...data, days });
            else (st.tasks[dk] = st.tasks[dk] || []).push({ id: id || uid(), ...data, done: false });
        });
        O2.closeSheet();
        O2.toast(routine ? 'Rutine eklendi' : 'Güne eklendi', 'clock');
    };
    O2.flowSkip = (id) => {
        const dk = O2.dayKey(dayOf(O2.ui.flowOffset || 0));
        update(st => { (st.skip[dk] = st.skip[dk] || []).push(id); });
        O2.closeSheet(); O2.toast('Bu gün için atlandı', 'skip');
    };
    O2.flowDelete = (id, routine) => {
        if (routine && !confirm('Bu blok rutinden tamamen silinsin mi? (Tüm günlerden kalkar)')) return;
        const dk = O2.dayKey(dayOf(O2.ui.flowOffset || 0));
        update(st => {
            if (routine) st.routine = st.routine.filter(x => x.id !== id);
            else st.tasks[dk] = (st.tasks[dk] || []).filter(x => x.id !== id);
        });
        O2.closeSheet();
    };

    // Rutin özeti: tüm tekrar eden bloklar ve şablonlar
    const TEMPLATES = {
        akademi: { name: 'Akademi hazırlık günü', list: [['07:00', 20, 'Uyanış · su', 'saglik'], ['07:30', 30, 'Kahvaltı', 'yemek', 'meal'], ['08:30', 90, 'Genel kültür / tarih', 'calisma'], ['10:15', 60, 'Parkur / FYT çalışması', 'spor'], ['12:30', 45, 'Öğle yemeği', 'yemek', 'meal'], ['14:00', 45, 'Mülakat kartları + prova', 'calisma', 'academy'], ['16:30', 15, 'Ara öğün', 'yemek', 'meal'], ['18:00', 75, 'Antrenman', 'spor', 'workout'], ['19:45', 45, 'Akşam yemeği', 'yemek', 'meal'], ['21:00', 45, 'Güncel olaylar / okuma', 'kisisel'], ['23:00', 30, 'Uyku hazırlığı', 'uyku']] },
        isgunu: { name: 'İş / okul günü', list: [['06:45', 30, 'Uyanış · kahvaltı', 'yemek', 'meal'], ['08:00', 540, 'İş / okul', 'calisma'], ['12:30', 30, 'Öğle yemeği', 'yemek', 'meal'], ['18:30', 75, 'Antrenman', 'spor', 'workout'], ['20:00', 45, 'Akşam yemeği', 'yemek', 'meal'], ['21:00', 45, 'Kişisel gelişim', 'kisisel'], ['23:00', 30, 'Uyku hazırlığı', 'uyku']] },
        hafif: { name: 'Hafif / tatil günü', list: [['09:00', 45, 'Rahat kahvaltı', 'yemek', 'meal'], ['11:00', 60, 'Yürüyüş / doğa', 'saglik'], ['13:30', 45, 'Öğle yemeği', 'yemek', 'meal'], ['16:00', 60, 'Hobi', 'kisisel'], ['19:30', 60, 'Akşam yemeği', 'yemek', 'meal'], ['23:30', 30, 'Uyku hazırlığı', 'uyku']] }
    };
    O2.flowRoutineSheet = () => {
        const st = state();
        const sorted = [...st.routine].sort((a, b) => toMin(a.time) - toMin(b.time));
        const dayLabel = (days) => (days || ALL).length === 7 ? 'Her gün' : (days || []).join(',') === '1,2,3,4,5' ? 'Hafta içi' : (days || []).join(',') === '6,7' ? 'Hafta sonu' : (days || []).map(d => O2.WEEKDAYS[d - 1]).join(' ');
        O2.sheet('Rutin', `
            <div class="o2-card" style="padding:4px 16px"><div class="o2-list">${sorted.map(b => `
                <div class="o2-row is-tap" onclick="O2.closeSheet(true); setTimeout(() => O2.flowBlockSheet('${b.id}', true), 60)">
                    <div class="o2-row-idx" style="color:${(CATS[b.cat] || CATS.kisisel).color};font-size:12px;font-weight:800">${esc(b.time)}</div>
                    <div class="o2-row-main"><h5>${esc(b.title)}</h5><p>${b.dur} dk · ${dayLabel(b.days)}</p></div>${I('chev', 'chev')}
                </div>`).join('') || '<div class="o2-empty">Rutin boş</div>'}</div></div>
            <div class="o2-section-head" style="margin-top:20px"><h3>Hazır şablonlar</h3></div>
            ${Object.entries(TEMPLATES).map(([k, t]) => `
            <div class="o2-row is-tap" style="padding:12px 0" onclick="O2.flowTemplate('${k}')">
                <div class="o2-row-main"><h5>${t.name}</h5><p>${t.list.length} blok · ${t.list[0][0]}-${t.list[t.list.length - 1][0]}</p></div>${I('chev', 'chev')}
            </div>`).join('')}`);
    };
    O2.flowTemplate = (k) => {
        const t = TEMPLATES[k];
        const which = prompt(`"${t.name}" şablonu hangi günlere uygulansın?\n1 = Her gün, 2 = Hafta içi, 3 = Hafta sonu\n(Bu günlerdeki mevcut rutin blokları değiştirilir)`, '2');
        const days = { 1: ALL, 2: [1, 2, 3, 4, 5], 3: [6, 7] }[String(which).trim()];
        if (!days) return;
        update(st => {
            // Seçilen günleri mevcut bloklardan çıkar, boşalan blokları sil
            st.routine = st.routine.map(b => ({ ...b, days: (b.days || ALL).filter(d => !days.includes(d)) })).filter(b => b.days.length);
            t.list.forEach(([time, dur, title, cat, link]) => st.routine.push({ id: uid(), time, dur, title, cat, link: link || '', days: days.slice(), remind: true }));
        });
        O2.closeSheet();
        O2.toast(`${t.name} uygulandı`, 'check');
    };

    // Alışkanlık düzenleme
    O2.flowHabitSheet = () => {
        const st = state();
        O2.sheet('Alışkanlıklar', `
            <div class="o2-list">${st.habits.map(h => `
                <div class="o2-row"><div class="o2-row-idx">${esc(h.icon || '✓')}</div><div class="o2-row-main"><h5>${esc(h.title)}</h5><p>${h.auto ? 'Otomatik işaretlenir' : 'Elle işaretlenir'} · 🔥 ${streak(st, h)} gün</p></div>
                <button class="o2-icon-btn" style="width:32px;height:32px;border:0;background:none" onclick="O2.flowHabitDel('${h.id}')" aria-label="Sil">${I('close')}</button></div>`).join('')}</div>
            <div class="o2-grid-3" style="grid-template-columns:64px 1fr;margin-top:14px">
                <input class="o2-input" id="o2-hb-icon" maxlength="2" placeholder="✨" style="text-align:center">
                <input class="o2-input" id="o2-hb-title" maxlength="40" placeholder="Yeni alışkanlık (örn. 10 dk meditasyon)">
            </div>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:12px" onclick="O2.flowHabitAdd()">${I('plus')}Ekle</button>`);
    };
    O2.flowHabitAdd = () => {
        const title = $('o2-hb-title').value.trim();
        if (!title) return;
        update(st => { st.habits = [...st.habits, { id: uid(), title: title.slice(0, 40), icon: $('o2-hb-icon').value.trim() || '✨' }]; }, false);
        O2.flowHabitSheet(); O2.render();
    };
    O2.flowHabitDel = (id) => { update(st => { st.habits = st.habits.filter(h => h.id !== id); }, false); O2.flowHabitSheet(); O2.render(); };

    // ⏱️ Odak zamanlayıcı
    let focus = null;
    O2.flowFocus = (min) => {
        focus = { total: min * 60, end: Date.now() + min * 60000, timer: null };
        if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
        const size = 220, stroke = 12, r = (size - stroke) / 2, c = 2 * Math.PI * r;
        O2.sheet(`Odak · ${min} dk`, `
            <div class="o2-acad-result">
                <div class="o2-ring-wrap" style="width:${size}px;height:${size}px">
                    <svg viewBox="0 0 ${size} ${size}"><circle class="o2-ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
                    <circle id="o2-focus-bar" class="o2-ring-bar" style="transition:stroke-dashoffset 1s linear" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke="url(#o2Gold)" stroke-dasharray="${c}" stroke-dashoffset="0"/></svg>
                    <div class="o2-ring-center"><strong id="o2-focus-num">${min}:00</strong><span>ODAK</span></div>
                </div>
                <p>Bildirimleri sustur, telefonu ters çevir. Süre bitince haber vereceğim.</p>
            </div>
            <div class="o2-grid-2" style="margin-top:16px">
                <button class="o2-btn o2-btn-ghost" onclick="O2.flowFocusStop(false)">Vazgeç</button>
                <button class="o2-btn o2-btn-gold" onclick="O2.flowFocusStop(true)">Bitir & kaydet</button>
            </div>`);
        focus.timer = setInterval(() => {
            const left = Math.max(0, Math.round((focus.end - Date.now()) / 1000));
            const num = $('o2-focus-num'), bar = $('o2-focus-bar');
            if (num) num.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
            if (bar) bar.style.strokeDashoffset = c * (1 - left / focus.total);
            if (!left) O2.flowFocusStop(true, true);
        }, 1000);
        if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(l => { focus.lock = l; }).catch(() => { });
    };
    O2.flowFocusStop = async (saveIt, natural) => {
        if (!focus) return;
        clearInterval(focus.timer);
        if (focus.lock) focus.lock.release().catch(() => { });
        const min = Math.round((focus.total - Math.max(0, (focus.end - Date.now()) / 1000)) / 60);
        focus = null;
        if (saveIt && min > 0) update(st => { const dk = O2.dayKey(); st.focus[dk] = (st.focus[dk] || 0) + min; }, false);
        O2.closeSheet();
        if (natural) {
            O2.haptic([200, 100, 200]);
            O2.toast(`${min} dk odak tamam 🎯`, 'trophy');
            const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
            if (reg && 'Notification' in window && Notification.permission === 'granted') reg.showNotification('Odak tamam 🎯', { body: `${min} dakikalık derin çalışma bitti. 5 dk mola ver.`, icon: 'assets/olympus-training-icon-192.png' });
        } else if (saveIt && min) O2.toast(`${min} dk odak kaydedildi`, 'clock');
        if (O2.ui.tab === 'flow') O2.render();
    };

    // ==========================================
    // ✨ AI PLANLAYICI (Gemini; anahtar yoksa cihaz içi ayrıştırıcı)
    // ==========================================
    let aiDraft = [];
    O2.flowAISheet = () => {
        const date = dayOf(O2.ui.flowOffset || 0);
        O2.sheet('AI ile planla', `
            <p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:var(--o2-text-2)"><b>${esc(date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }))}</b> için ne yapmak istediğini anlat; saatleri ben yerleştireyim.</p>
            <textarea class="o2-input" id="o2-ai-plan" rows="4" style="height:auto;padding:12px" placeholder="Örn: 9-12 arası KPSS tarih, 2 saat parkur çalışması, öğleden sonra 45 dk mülakat provası, akşam 7'de antrenman, 1 saat kitap"></textarea>
            <div class="o2-chips" style="margin-top:10px">${['Sabah 3 saat ders, akşam antrenman', 'Mülakat haftası yoğun plan', 'Dinlenme günü, hafif tempo'].map(x => `<button class="o2-chip" onclick="document.getElementById('o2-ai-plan').value='${x}'">${x}</button>`).join('')}</div>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:14px" onclick="O2.flowAIRun()">${I('spark')}Planı oluştur</button>
            <div id="o2-ai-out" style="margin-top:14px"></div>`);
    };
    O2.flowAIRun = async () => {
        const text = $('o2-ai-plan').value.trim();
        if (!text) { O2.toast('Ne yapmak istediğini yaz', 'spark'); return; }
        const out = $('o2-ai-out');
        out.innerHTML = '<div class="o2-acad-ai" style="margin-top:0"><p>Plan hazırlanıyor…</p></div>';
        const st = state(), date = dayOf(O2.ui.flowOffset || 0);
        const fixed = blocksFor(st, date).map(b => `${b.time} (${b.dur} dk) ${b.title}`).join('; ');
        let list = null;
        if (localStorage.getItem('OLY_API_KEY') && typeof askGeminiAI === 'function') {
            try {
                const res = await askGeminiAI(`Bir günlük zaman planlayıcısısın. Kullanıcının isteği: "${text}". Günün mevcut sabit blokları: ${fixed || 'yok'}. Bu bloklarla çakışmadan, gerçekçi molalarla yeni blokları yerleştir. SADECE JSON dizi döndür, açıklama yazma: [{"time":"HH:MM","dur":dakika,"title":"kısa başlık","cat":"spor|calisma|yemek|saglik|kisisel|uyku"}]`);
                const m = String(res || '').match(/\[[\s\S]*\]/);
                if (m) list = JSON.parse(m[0]);
            } catch (e) { console.warn('AI planı alınamadı, cihaz içi ayrıştırıcı kullanılıyor:', e); }
        }
        if (!Array.isArray(list) || !list.length) list = localPlan(text, blocksFor(st, date));
        aiDraft = list.filter(x => x && x.title && /^\d{1,2}:\d{2}$/.test(String(x.time))).map(x => ({
            time: fmt(toMin(x.time)), dur: Math.max(5, Math.min(600, +x.dur || 30)), title: String(x.title).slice(0, 50), cat: CATS[x.cat] ? x.cat : guessCat(x.title)
        })).sort((a, b) => toMin(a.time) - toMin(b.time));
        if (!aiDraft.length) { out.innerHTML = '<div class="o2-empty">Anlayamadım. Saat ya da süre ekleyerek tekrar dene (örn. "14:00-16:00 ders").</div>'; return; }
        out.innerHTML = `
            <div class="o2-card" style="padding:4px 16px"><div class="o2-list">${aiDraft.map((b, i) => `
                <div class="o2-row"><button class="o2-check on" data-i="${i}" onclick="this.classList.toggle('on')">${I('check')}</button>
                <div class="o2-row-main"><h5>${esc(b.time)} · ${esc(b.title)}</h5><p>${b.dur} dk · ${CATS[b.cat].name}</p></div></div>`).join('')}</div></div>
            <div class="o2-toggle-row" style="margin-top:8px" onclick="this.querySelector('.o2-switch').classList.toggle('on')"><div><h5>Rutin olarak kaydet</h5><p>Kapalıysa yalnızca bu güne eklenir</p></div><span class="o2-switch" id="o2-ai-routine"></span></div>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:12px" onclick="O2.flowAIApply()">${I('check')}Seçilenleri ekle</button>`;
    };
    O2.flowAIApply = () => {
        const picks = [...document.querySelectorAll('#o2-ai-out .o2-check.on')].map(x => aiDraft[+x.dataset.i]).filter(Boolean);
        const routine = $('o2-ai-routine').classList.contains('on');
        const date = dayOf(O2.ui.flowOffset || 0), dk = O2.dayKey(date), wd = weekday(date);
        update(st => picks.forEach(b => {
            if (routine) st.routine.push({ id: uid(), ...b, link: '', days: [wd], remind: true });
            else (st.tasks[dk] = st.tasks[dk] || []).push({ id: uid(), ...b, remind: true, done: false });
        }));
        O2.closeSheet();
        O2.toast(`${picks.length} blok eklendi`, 'spark');
    };

    function guessCat(t) {
        t = String(t).toLocaleLowerCase('tr');
        if (/antrenman|spor|koşu|parkur|fyt|yüzme|salon|idman|yürüyüş/.test(t)) return 'spor';
        if (/ders|çalış|kpss|mülakat|tarih|okul|iş|toplantı|sınav|tekrar/.test(t)) return 'calisma';
        if (/yemek|kahvaltı|öğün|akşam yemeği|öğle/.test(t)) return 'yemek';
        if (/uyku|yat|şekerleme/.test(t)) return 'uyku';
        if (/su|meditasyon|nefes|esneme|duş/.test(t)) return 'saglik';
        return 'kisisel';
    }
    // Cihaz içi ayrıştırıcı: "9-12 ders", "14:00-16:00 X", "akşam 7'de X", "2 saat X", "45 dk X"
    function localPlan(text, fixed) {
        const busy = fixed.map(b => [toMin(b.time), toMin(b.time) + (b.dur || 30)]);
        const parts = text.split(/[,;\n]+|\s+ve\s+/i).map(s => s.trim()).filter(Boolean);
        const out = [];
        let cursor = 9 * 60;
        const free = (s, d) => !busy.some(([a, b]) => s < b && s + d > a);
        parts.forEach(p => {
            let s = null, dur = null, title = p;
            const pm = /akşam|öğleden sonra|öğlen|gece/i.test(p);
            const evening = /akşam|gece/i.test(p);
            const range = p.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(?:-|–|ile)\s*(\d{1,2})(?:[:.](\d{2}))?/);
            const at = p.match(/(?:saat\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:'?(?:de|da|te|ta|'de|'da)\b)/i);
            const len = p.match(/(\d+(?:[.,]\d+)?)\s*(saat|sa|dakika|dk)\b/i);
            const fix = (h) => (pm && h < 12 ? h + 12 : h);
            if (range) {
                s = fix(+range[1]) * 60 + (+range[2] || 0);
                let e = fix(+range[3]) * 60 + (+range[4] || 0);
                if (e <= s) e += 12 * 60;
                dur = e - s;
                title = p.replace(range[0], '');
            } else if (at) {
                s = fix(+at[1]) * 60 + (+at[2] || 0);
                title = p.replace(at[0], '');
            }
            if (len) {
                dur = dur || Math.round(parseFloat(len[1].replace(',', '.')) * (/saat|sa/i.test(len[2]) ? 60 : 1));
                title = title.replace(len[0], '');
            }
            dur = dur || 45;
            // Türkçe karakterlerde \b çalışmaz: boşluk sınırıyla temizle
            title = (' ' + title + ' ').replace(/['’](de|da|te|ta)(?=\s)/gi, ' ')
                .replace(/\s(arası|arasında|saat|için|sabah|akşam|öğleden sonra|öğlen|gece|sonra)(?=\s)/gi, ' ')
                .replace(/\s+/g, ' ').trim();
            if (!title) return;
            title = title.charAt(0).toLocaleUpperCase('tr') + title.slice(1);
            if (s === null) {
                s = Math.max(cursor, evening ? 18 * 60 : pm ? 13 * 60 : 0);
                while (!free(s, dur) && s < 23 * 60) s += 15;
            }
            busy.push([s, s + dur]);
            cursor = s + dur + 15;
            out.push({ time: fmt(s), dur, title, cat: guessCat(title) });
        });
        return out;
    }

    // ==========================================
    // 🔗 ENTEGRASYON: Bugün kartı, bildirimler, eylemler
    // ==========================================
    O2.flowTodayCard = () => {
        const st = state(), dk = O2.dayKey();
        const blocks = blocksFor(st, new Date());
        if (!blocks.length) return '';
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        const cur = blocks.find(b => toMin(b.time) <= nowMin && nowMin < toMin(b.time) + (b.dur || 30));
        const next = blocks.find(b => toMin(b.time) > nowMin);
        const doneN = blocks.filter(b => isDone(st, dk, b)).length;
        const show = cur || next;
        const c = show ? (CATS[show.cat] || CATS.kisisel) : CATS.kisisel;
        return `
        <div class="o2-card is-tap o2-flow-today" onclick="O2.go('flow')" style="--c:${c.color}">
            <div class="o2-coach">
                <div class="o2-coach-orb" style="background:color-mix(in srgb, ${c.color} 18%, transparent);color:${c.color}">${I(show ? c.icon : 'check')}</div>
                <div style="flex:1">
                    <h4>${show ? `${cur ? 'Şimdi' : esc(next.time)} · ${esc(show.title)}` : 'Günün akışı tamam'}</h4>
                    <p>${cur ? `${toMin(cur.time) + (cur.dur || 30) - nowMin} dk kaldı` : next ? `${toMin(next.time) - nowMin} dk sonra` : 'Yarını planla'} · ${doneN}/${blocks.length} blok</p>
                </div>
                ${I('chev', 'chev')}
            </div>
        </div>`;
    };

    if (O2.registerNotifySource) O2.registerNotifySource('routine', (day, i, r) => {
        const st = state(), dk = O2.dayKey(day);
        const lead = +r.routineLead || 0;
        // Antrenman ve öğün blokları kendi hatırlatıcıları açıksa çift bildirim olmasın
        return blocksFor(st, day).filter(b => b.remind !== false && !(i === 0 && isDone(st, dk, b))
            && !(b.link === 'workout' && (r.workout || b.rest)) && !(b.link === 'meal' && r.meals)).map(b => {
            const t = Math.max(0, toMin(b.time) - lead);
            const action = b.link === 'workout' ? 'start' : b.link === 'academy' ? 'academy' : b.link === 'meal' ? 'fuel' : 'flow';
            return { key: b.id, h: Math.floor(t / 60), m: t % 60, title: `${lead ? `${lead} dk sonra · ` : ''}${b.title}`, body: `${b.time} · ${b.dur || 30} dk${b.link === 'workout' && !b.rest ? ' · antrenmanı başlatmak için dokun' : ''}`, action };
        });
    });
    O2.actions = O2.actions || {};
    O2.actions.flow = () => O2.go('flow');
    O2.actions.fuel = () => O2.go('fuel');
})();
