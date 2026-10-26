// Olympus 2.0 spor modülü — arayüz: kabuk, sekmeler (Bugün / Antrenman / Beslenme / İlerleme), alt sayfalar, ayarlar
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const esc = (v) => escapeHTML(v);
    const haptic = (p = 12) => { if (navigator.vibrate) navigator.vibrate(p); };
    O2.haptic = haptic;

    O2.ui = { tab: 'today', trainOffset: 0, fuelOffset: 0, charts: [] };

    // ==========================================
    // 🎨 İKONLAR (24px çizgi ikon seti)
    // ==========================================
    const P = {
        today: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
        train: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
        fuel: '<path d="M12 21c-4.4 0-8-3.4-8-8 0-5 4.6-9.3 8-10 3.4.7 8 5 8 10 0 4.6-3.6 8-8 8Z"/><path d="M12 21V11m0 4 3-3m-3 0-2.5-2.5"/>',
        progress: '<path d="M3 20h18"/><path d="M6 16v-4M11 16V8M16 16v-6M20 16V5"/>',
        play: '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" stroke="none"/>',
        back: '<path d="M15 18 9 12l6-6"/>',
        close: '<path d="M18 6 6 18M6 6l12 12"/>',
        chev: '<path d="m9 6 6 6-6 6"/>',
        check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        minus: '<path d="M5 12h14"/>',
        flame: '<path d="M12 21c4 0 7-2.9 7-7 0-3.4-2-6.1-4.6-8.5-.4 2.2-1.6 3.6-3 4.3.3-2.7-.7-5.5-3.4-7.8.2 3.4-1.8 5.5-3.3 7.4C3.6 11 3 12.4 3 14c0 4.1 3.4 7 9 7Z"/>',
        drop: '<path d="M12 21a7 7 0 0 0 7-7c0-4.5-7-11-7-11S5 9.5 5 14a7 7 0 0 0 7 7Z"/>',
        moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>',
        scale: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 9a5.5 5.5 0 0 1 8 0l-2.5 3h-3Z"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
        trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
        mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
        spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
        run: '<circle cx="14" cy="4.5" r="2"/><path d="m6 21 3.5-6 3 2.5V22M8 11l3-3 3.5 2 2.5 3h3M5.5 12.5 8 11"/>',
        swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
        list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
        skip: '<path d="m5 4 10 8-10 8z"/><path d="M19 5v14"/>',
        prev: '<path d="m19 20-10-8 10-8z"/><path d="M5 19V5"/>',
        pause: '<path d="M7 5v14M17 5v14"/>',
        expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
        min: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
        camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.5"/>',
        heart: '<path d="M12 20s-7.5-4.6-9.2-9.4C1.6 7.2 3.8 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.4 0 5.6 3.2 4.4 6.6C19.5 15.4 12 20 12 20Z"/>',
        shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6Z"/>',
        grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
        calc: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8.5 7h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
        chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12Z"/>',
        ball: '<circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 5h-5L8 10Z"/><path d="M12 3v4M21 10.5 16 10M18 19l-3.5-4M6 19l3.5-4M3 10.5 8 10"/>',
        tent: '<path d="M3 20 12 4l9 16Z"/><path d="M12 4v16M9 20l3-5 3 5"/>',
        leaf: '<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15Z"/><path d="M5 19 13 11"/>',
        game: '<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3M15.5 12h.01M18 13.5h.01"/>',
        medal: '<circle cx="12" cy="15" r="5"/><path d="m8.5 11.5-3-8.5h4l2.5 6M15.5 11.5l3-8.5h-4L12 9"/>',
        swords: '<path d="m14.5 17.5 6-6V5h-6.5l-6 6M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 6.5 3.5 12.5V19H10l6-6"/>',
        bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
        ruler: '<path d="M3 17 17 3l4 4L7 21Z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>'
    };
    O2.icon = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${P[name] || ''}</svg>`;
    const I = O2.icon;

    // Halka (ring) bileşeni
    O2.ring = ({ pct = 0, size = 132, stroke = 12, color = 'url(#o2Gold)', center = '', id = '' }) => {
        const r = (size - stroke) / 2;
        const c = 2 * Math.PI * r;
        const off = c * (1 - O2.clamp(pct));
        return `
        <div class="o2-ring-wrap" style="width:${size}px;height:${size}px" ${id ? `id="${id}"` : ''}>
            <svg viewBox="0 0 ${size} ${size}">
                <defs><linearGradient id="o2Gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--o2-g1)"/><stop offset=".45" style="stop-color:var(--o2-g2)"/><stop offset="1" style="stop-color:var(--o2-g3)"/></linearGradient></defs>
                <circle class="o2-ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
                <circle class="o2-ring-bar" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke="${color}"
                    stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${off}"/>
            </svg>
            <div class="o2-ring-center">${center}</div>
        </div>`;
    };
    // Halkaları DOM'a girdikten sonra doldurarak animasyon başlat
    const animateRings = (root) => requestAnimationFrame(() => requestAnimationFrame(() => {
        root.querySelectorAll('.o2-ring-bar[data-off]').forEach(el => { el.style.strokeDashoffset = el.dataset.off; });
        root.querySelectorAll('.o2-bar i[data-w]').forEach(el => { el.style.width = el.dataset.w; });
    }));

    // ==========================================
    // 🧍 KAS HARİTASI (stilize ön / arka figür)
    // ==========================================
    const FIG = {
        front: [
            ['base', '<circle cx="50" cy="16" r="11"/><rect x="45" y="26" width="10" height="9" rx="3"/><rect x="18" y="74" width="12" height="30" rx="6"/><rect x="70" y="74" width="12" height="30" rx="6"/><rect x="38" y="96" width="24" height="16" rx="7"/>'],
            ['shoulders', '<ellipse cx="29" cy="46" rx="9" ry="8"/><ellipse cx="71" cy="46" rx="9" ry="8"/>'],
            ['chest', '<rect x="35" y="39" width="14.5" height="21" rx="6"/><rect x="50.5" y="39" width="14.5" height="21" rx="6"/>'],
            ['core', '<rect x="39" y="62" width="10" height="10" rx="3"/><rect x="51" y="62" width="10" height="10" rx="3"/><rect x="39" y="74" width="10" height="10" rx="3"/><rect x="51" y="74" width="10" height="10" rx="3"/><rect x="40" y="86" width="20" height="10" rx="4"/>'],
            ['biceps', '<ellipse cx="24" cy="62" rx="6" ry="11"/><ellipse cx="76" cy="62" rx="6" ry="11"/>'],
            ['quads', '<ellipse cx="42" cy="134" rx="8.5" ry="23"/><ellipse cx="58" cy="134" rx="8.5" ry="23"/>'],
            ['calves', '<ellipse cx="42" cy="184" rx="5.5" ry="16"/><ellipse cx="58" cy="184" rx="5.5" ry="16"/>']
        ],
        back: [
            ['base', '<circle cx="50" cy="16" r="11"/><rect x="45" y="26" width="10" height="9" rx="3"/><rect x="18" y="74" width="12" height="30" rx="6"/><rect x="70" y="74" width="12" height="30" rx="6"/>'],
            ['shoulders', '<ellipse cx="29" cy="46" rx="9" ry="8"/><ellipse cx="71" cy="46" rx="9" ry="8"/>'],
            ['back', '<path d="M36 38h28l-3 30-11 20-11-20Z"/>'],
            ['triceps', '<ellipse cx="24" cy="62" rx="6" ry="11"/><ellipse cx="76" cy="62" rx="6" ry="11"/>'],
            ['glutes', '<ellipse cx="43" cy="104" rx="8.5" ry="10"/><ellipse cx="57" cy="104" rx="8.5" ry="10"/>'],
            ['hamstrings', '<ellipse cx="42" cy="138" rx="8" ry="21"/><ellipse cx="58" cy="138" rx="8" ry="21"/>'],
            ['calves', '<ellipse cx="42" cy="184" rx="6" ry="16"/><ellipse cx="58" cy="184" rx="6" ry="16"/>']
        ]
    };
    // fillFor(muscle) → renk
    O2.figure = (side, fillFor) => `
        <svg viewBox="0 0 100 205" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="o2FigGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--o2-g1)"/><stop offset="1" style="stop-color:var(--o2-g3)"/></linearGradient></defs>
            ${FIG[side].map(([m, shapes]) => `<g class="${m === 'base' ? 'o2-body-base' : 'o2-muscle'}" ${m === 'base' ? '' : `style="fill:${fillFor(m)}"`}>${shapes}</g>`).join('')}
        </svg>`;

    // ==========================================
    // 🐚 KABUK: AÇ / KAPAT / SEKME
    // ==========================================
    const $ = (id) => document.getElementById(id);

    O2.open = async () => {
        const screen = $('oly2-screen');
        screen.classList.remove('hidden');
        syncAvatar();
        O2.syncNotifBadge();
        if (O2.ui.tab === 'builder' && !localStorage.getItem('oly2_builder_draft')) O2.ui.tab = 'train';
        O2.go(O2.ui.tab || 'today', true);
        O2.refreshLivePill();
        if (typeof saveLastScreen === 'function') saveLastScreen('olympus2');
        // Bulutta başka cihazdan gelen seanslar varsa birleştir
        const changed = await O2.cloudLoad();
        if (changed) O2.render();
        O2.maybeSendWeeklyReport();
    };

    O2.close = () => {
        O2.closeSheet(true);
        if (O2.isTrainingHome()) return O2.openSuperApp();
        returnToHub();
    };

    // Donanım geri tuşu: önce açık katmanları kapat
    O2.back = () => {
        if (O2.isSheetOpen()) { O2.closeSheet(); return; }
        if (O2.isPlayerOpen && O2.isPlayerOpen()) { O2.minimizePlayer(); return; }
        if (O2.isBreathOpen && O2.isBreathOpen()) { O2.breatheStop(); return; }
        if (O2.isCardioOpen && O2.isCardioOpen()) { O2.toast('Kaydı bitirmek için "Bitir"e dokun', 'run'); return; }
        if (O2.isTrainingHome()) { if (O2.ui.tab !== 'today') O2.go('today'); return; }
        O2.close();
    };

    // Training ana ekran olduğunda, kök dışındaki her katman için geçmiş kaydı aç (geri tuşu onu kapatsın)
    const markLayer = () => { if (O2.isTrainingHome() && typeof pushModuleHistory === 'function') pushModuleHistory(); };
    O2.markLayer = markLayer;

    function syncAvatar() {
        const user = typeof auth !== 'undefined' && auth.currentUser;
        const photo = (user && user.photoURL) || ($('header-profile-img') && $('header-profile-img').src) || 'icon.png';
        $('o2-avatar-img').src = photo;
    }

    O2.userName = () => {
        const user = typeof auth !== 'undefined' && auth.currentUser;
        const shown = $('profile-name-display') && $('profile-name-display').innerText;
        const n = (user && user.displayName) || (shown && !/yükleniyor/i.test(shown) ? shown : '') || 'Şampiyon';
        return n.split(' ')[0];
    };

    O2.go = (tab, silent) => {
        O2.ui.tab = tab;
        if (tab !== 'today') markLayer();
        document.querySelectorAll('.o2-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        if (!silent) haptic(8);
        O2.render();
        $('o2-view').scrollTo({ top: 0 });
    };

    O2.render = () => {
        O2.ui.charts.forEach(c => { try { c.destroy(); } catch (e) { } });
        O2.ui.charts = [];
        const view = $('o2-view');
        const renderers = {
            today: renderToday, train: renderTrain, fuel: renderFuel, progress: renderProgress,
            builder: () => O2.renderBuilder(), profile: () => O2.renderProfile(), library: () => O2.renderLibrary()
        };
        view.innerHTML = `<div class="o2-page">${renderers[O2.ui.tab]()}</div>`;
        animateRings(view);
        if (O2.ui.tab === 'progress') drawProgressCharts();
    };

    // ==========================================
    // 🔔 TOAST & ALT SAYFA
    // ==========================================
    let toastTimer;
    O2.toast = (msg, icon = 'check') => {
        const t = $('o2-toast');
        t.innerHTML = `${I(icon)}<span>${esc(msg)}</span>`;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
    };

    O2.sheet = (title, body) => {
        const layer = $('o2-sheet-layer');
        layer.innerHTML = `
            <div class="o2-backdrop" onclick="O2.closeSheet()"></div>
            <div class="o2-sheet" role="dialog" aria-label="${esc(title)}">
                <div class="o2-sheet-handle"></div>
                <div class="o2-sheet-head"><h3>${esc(title)}</h3><button class="o2-icon-btn" onclick="O2.closeSheet()" aria-label="Kapat">${I('close')}</button></div>
                <div class="o2-sheet-body">${body}</div>
            </div>`;
        requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('open')));
        animateRings(layer);
        haptic(10);
        markLayer();
    };
    O2.isSheetOpen = () => $('o2-sheet-layer').classList.contains('open');
    O2.closeSheet = (instant) => {
        const layer = $('o2-sheet-layer');
        if (!layer.classList.contains('open')) return;
        layer.classList.remove('open');
        if (instant) layer.innerHTML = '';
        else setTimeout(() => { if (!layer.classList.contains('open')) layer.innerHTML = ''; }, 450);
    };

    const stepper = (id, value, step) => `
        <div class="o2-stepper">
            <button onclick="O2.step('${id}', -${step})">−</button>
            <input class="o2-input" id="${id}" type="number" inputmode="decimal" step="${step}" value="${value}">
            <button onclick="O2.step('${id}', ${step})">+</button>
        </div>`;
    O2.step = (id, d) => {
        const el = $(id);
        el.value = +((parseFloat(el.value) || 0) + d).toFixed(2);
        haptic(6);
    };

    // ==========================================
    // ☀️ BUGÜN
    // ==========================================
    function renderToday() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
        const r = O2.readiness();
        const plan = O2.dayPlan(0);
        const water = O2.water();
        const week = O2.weekStats(0);
        const settings = O2.settings();
        const todayKcal = kcalToday();
        const active = O2.activeSession && O2.activeSession();
        const doneToday = O2.sessions().filter(s => s.dayKey === O2.dayKey() && s.type !== 'cardio').pop();

        return `
        <div class="o2-stagger">
            <div class="o2-hero-head">
                <div class="o2-eyebrow">${esc(dateStr)}</div>
                <h1 class="o2-title">${O2.greeting()},<br><em>${esc(O2.userName())}</em></h1>
            </div>

            ${active ? `
            <div class="o2-card o2-card-glow is-tap" onclick="O2.resumeSession()" style="margin-bottom:12px;">
                <div class="o2-coach">
                    <div class="o2-coach-orb">${I('play')}</div>
                    <div style="flex:1"><h4>Devam eden antrenman</h4><p>${esc(active.title)} · ${active.exercises.filter(e => e.sets.every(s => s.done)).length}/${active.exercises.length} hareket tamam</p></div>
                    ${I('chev', 'chev')}
                </div>
            </div>` : ''}

            <div class="o2-card o2-card-glow o2-readiness">
                ${O2.ring({ pct: r.score / 100, size: 132, stroke: 12, center: `<strong>${r.score}</strong><span>HAZIRLIK</span>` })}
                <div>
                    <div class="o2-eyebrow" style="color:${r.tone}">● Bugün</div>
                    <h4>${r.label}</h4>
                    <div class="o2-factors">
                        ${r.factors.map(f => `<div class="o2-factor"><span>${f.name}</span><div class="o2-bar"><i data-w="${f.value}%" style="width:0;background:${f.color}"></i></div><b>${f.value}</b></div>`).join('')}
                    </div>
                </div>
            </div>

            <div class="o2-grid-3" style="margin-top:12px;">
                ${miniRing(water.amount / water.goal, 'var(--o2-blue)', 'drop', `${O2.fmtNum(water.amount / 1000, 1)} L`, `/ ${O2.fmtNum(water.goal / 1000, 1)} L su`, "O2.quickWater()")}
                ${miniRing(todayKcal / settings.kcalGoal, 'var(--o2-orange)', 'flame', `${O2.fmtNum(todayKcal)}`, 'kcal hareket', "O2.logSheet('kcal')")}
                ${miniRing(week.sessions / settings.weeklyTarget, 'url(#o2Gold)', 'bolt', `${week.sessions}/${settings.weeklyTarget}`, 'haftalık seans', "O2.go('train')")}
            </div>

            <div class="o2-section-head"><h3>Bugünün seansı</h3><button class="o2-link" onclick="O2.go('train')">Programı gör</button></div>
            ${plan.isRest ? restCard(plan) : (doneToday ? doneCard(doneToday) : sessionHero(plan, 0))}

            <div class="o2-section-head"><h3>Bu hafta</h3><span class="o2-link" style="color:var(--o2-text-3)">${O2.weekStreak() ? `🔥 ${O2.weekStreak()} hafta seri · ` : ''}${week.sessions} seans</span></div>
            <div class="o2-card" style="padding:12px;">${weekStrip()}</div>

            ${document.body.classList.contains('dilala-mode') ? `
            <div class="o2-card is-tap o2-dilala-card" onclick="O2.openDilalaSpace()" style="margin-top:12px">
                <div class="o2-coach"><div class="o2-coach-orb">${I('heart')}</div><div style="flex:1"><h4>Bizim Alanımız</h4><p>Kavuşma sayacı, mektuplar ve anılar</p></div>${I('chev', 'chev')}</div>
            </div>` : ''}

            <div class="o2-section-head"><h3>Hızlı kayıt</h3><button class="o2-link" onclick="O2.moreLogsSheet()">Tümü</button></div>
            <div class="o2-quick">
                <button onclick="O2.quickWater()"><i style="background:rgba(90,200,250,.12);color:var(--o2-blue)">${I('drop')}</i>+250 ml</button>
                <button onclick="O2.logSheet('weight')"><i style="background:rgba(230,195,116,.12);color:var(--o2-gold)">${I('scale')}</i>Kilo</button>
                <button onclick="O2.logSheet('sleep')"><i style="background:rgba(167,139,250,.12);color:var(--o2-violet)">${I('moon')}</i>Uyku</button>
                <button onclick="O2.openCardio()"><i style="background:rgba(255,122,69,.12);color:var(--o2-orange)">${I('run')}</i>Kardiyo</button>
            </div>

            <div class="o2-section-head"><h3>Günlük görevler</h3><span class="o2-link" style="color:var(--o2-text-3)">${tasksDone()}</span></div>
            ${tasksCard()}

            <div class="o2-section-head"><h3>Oly Koç</h3>${typeof askGeminiAI === 'function' ? `<button class="o2-link" onclick="O2.aiCoach()">Derin analiz</button>` : ''}</div>
            ${coachCard()}

            <div class="o2-section-head"><h3>Keşfet</h3></div>
            ${exploreGrid()}
        </div>`;
    }

    function miniRing(pct, color, icon, value, label, onclick) {
        return `
        <div class="o2-card o2-mini-ring is-tap" onclick="${onclick}">
            ${O2.ring({ pct, size: 64, stroke: 7, color, center: `<span style="color:${color.startsWith('url') ? 'var(--o2-gold)' : color}">${I(icon)}</span>` })}
            <div><strong>${value}</strong><small>${label}</small></div>
        </div>`;
    }

    function kcalToday() {
        const today = O2.dayKey();
        const fromSessions = O2.sessions().filter(s => s.dayKey === today).reduce((a, s) => a + (s.kcal || 0), 0);
        const manual = (LS.get('olympus_active_kcal_history', []) || []).filter(h => { const d = O2.parseDate(h.date); return d && O2.dayKey(d) === today; }).reduce((a, h) => a + (parseFloat(h.val) || 0), 0);
        return Math.round(fromSessions + manual);
    }

    function sessionHero(plan, offset) {
        const muscles = O2.musclesOfDay(plan);
        const totalSets = plan.ex.reduce((a, e) => a + O2.parseScheme(e.scheme).sets, 0);
        const fill = (m) => muscles.includes(m) ? 'url(#o2FigGold)' : '#24242c';
        const parts = String(plan.title || '').split(':');
        const name = (parts[1] || parts[0]).trim();
        return `
        <div class="o2-card o2-card-glow o2-session-hero is-tap" onclick="O2.go('train')">
            <div class="o2-session-figure">${O2.figure(muscles.some(m => ['back', 'triceps', 'hamstrings', 'glutes'].includes(m)) && !muscles.includes('chest') ? 'back' : 'front', fill)}</div>
            <div class="o2-session-body">
                <div class="o2-eyebrow">${esc(parts.length > 1 ? parts[0] : 'Antrenman')}</div>
                <h2>${esc(name)}</h2>
                <div class="o2-session-meta">
                    <span>${I('clock')}~${O2.estMinutes(plan)} dk</span>
                    <span>${I('list')}${plan.ex.length} hareket</span>
                    <span>${I('bolt')}${totalSets} set</span>
                </div>
                <div class="o2-chips" style="margin-bottom:18px;">${muscles.slice(0, 4).map(m => `<span class="o2-chip">${O2.MUSCLES[m]}</span>`).join('')}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button class="o2-btn o2-btn-gold" onclick="event.stopPropagation(); O2.startSession(${offset})">${I('play')}Başlat</button>
                    <button class="o2-btn o2-btn-ghost o2-btn-sm" style="height:50px" onclick="event.stopPropagation(); O2.startSession(${offset}, { express: true })" title="Az vaktin varsa: ana hareketler, daha az set">${I('bolt')}Ekspres</button>
                </div>
            </div>
        </div>`;
    }

    // Bugünün antrenmanı bittiyse: kutlama + özet
    function doneCard(s) {
        const fill = (m) => (s.muscles || []).includes(m) ? 'url(#o2FigGold)' : '#24242c';
        return `
        <div class="o2-card o2-card-glow o2-session-hero is-tap" onclick="O2.sessionSheet('${esc(s.id)}')">
            <div class="o2-session-figure">${O2.figure('front', fill)}</div>
            <div class="o2-session-body">
                <div class="o2-eyebrow" style="color:var(--o2-green)">● Tamamlandı</div>
                <h2>${esc(String(s.title).split(':').pop().trim())}</h2>
                <div class="o2-session-meta">
                    <span>${I('clock')}${O2.fmtClock(s.durationSec)}</span>
                    <span>${I('bolt')}${O2.fmtNum(s.volume)} kg</span>
                    <span>${I('check')}${s.setCount} set</span>
                </div>
                <div class="o2-chips">${(s.prs || []).length ? `<span class="o2-chip gold">${s.prs.length} rekor</span>` : ''}<span class="o2-chip green">Toparlanma modu</span></div>
                <p style="margin:14px 0 0;font-size:12.5px;line-height:1.5;color:var(--o2-text-2)">Bugünün işi bitti. Proteinini al, suyunu tamamla ve iyi uyu.</p>
            </div>
        </div>`;
    }

    function restCard(plan) {
        return `
        <div class="o2-card o2-card-glow">
            <div class="o2-eyebrow" style="color:var(--o2-green)">● Toparlanma</div>
            <h2 style="margin:8px 0 6px;font-size:23px;font-weight:800;letter-spacing:-.6px;">${esc(plan.title || 'Dinlenme günü')}</h2>
            <p style="margin:0 0 16px;color:var(--o2-text-2);font-size:13px;line-height:1.55;">Kaslar dinlenirken büyür. Hafif tempolu yürüyüş, mobilite ve kaliteli uyku bugünün antrenmanı.</p>
            <div class="o2-chips" style="margin-bottom:16px;"><span class="o2-chip green">20 dk yürüyüş</span><span class="o2-chip blue">Mobilite</span><span class="o2-chip violet">8 saat uyku</span></div>
            <div style="display:flex;gap:8px;">
                <button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.openZen()">${I('heart')}Nefes egzersizi</button>
                <button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.openCardio()">${I('run')}Hafif kardiyo</button>
            </div>
        </div>`;
    }

    function weekStrip(selectable = false) {
        const done = O2.activityDays();
        const start = O2.weekStart();
        const today = O2.dayKey();
        const program = O2.activeProgram();
        return `<div class="o2-week">${O2.WEEKDAYS.map((label, i) => {
            const d = O2.addDays(start, i);
            const key = O2.dayKey(d);
            const offset = Math.round((O2.startOfDay(d) - O2.startOfDay()) / 864e5);
            const plan = O2.dayPlan(offset, program);
            const cls = [done.has(key) ? 'done' : (plan.isRest ? 'rest' : ''), key === today ? 'today' : '', selectable && offset === O2.ui.trainOffset ? 'selected' : '', selectable ? 'is-tap' : ''].join(' ');
            return `<div class="o2-week-day ${cls}" ${selectable ? `onclick="O2.pickTrainDay(${offset})"` : ''}><small>${label}</small><b>${done.has(key) ? I('check') : d.getDate()}</b></div>`;
        }).join('')}</div>`;
    }

    function coachCard() {
        const tips = O2.coachInsights();
        return `
        <div class="o2-card">
            <div class="o2-coach">
                <div class="o2-coach-orb">${I('spark')}</div>
                <div style="flex:1"><h4>Günün önerisi</h4><p>${esc(tips[0])}</p></div>
            </div>
            ${tips.length > 1 ? `<ul class="o2-coach-list">${tips.slice(1, 4).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
            ${typeof openOlyChat === 'function' ? `<button class="o2-btn o2-btn-ghost o2-btn-sm" style="margin-top:14px" onclick="openOlyChat()">${I('spark')}Oly'ye sor</button>` : ''}
        </div>`;
    }

    O2.aiCoach = async () => {
        O2.sheet('Oly Koç · Derin analiz', `<div class="o2-empty">${I('spark')}<br>Verilerin analiz ediliyor…</div>`);
        const r = O2.readiness();
        const w = O2.weekStats(0), lw = O2.weekStats(1);
        const plan = O2.dayPlan(0);
        const bests = Object.entries(O2.bests()).sort((a, b) => b[1].e1rm - a[1].e1rm).slice(0, 5).map(([n, b]) => `${n}: ${b.w}kg x ${b.r}`).join(', ');
        const prompt = `Sen elit bir kuvvet ve kondisyon koçusun. Sporcunun verileri: hazırlık skoru ${r.score}/100 (uyku ${r.factors[0].value}, toparlanma ${r.factors[1].value}, yük ${r.factors[2].value}). Bu hafta ${w.sessions} seans, ${Math.round(w.volume)} kg hacim; geçen hafta ${lw.sessions} seans, ${Math.round(lw.volume)} kg. Bugünün planı: ${plan.isRest ? 'dinlenme' : plan.title}. En iyi setleri: ${bests || 'veri yok'}. Türkçe, samimi ama profesyonel, en fazla 5 madde: bugün için somut öneri, haftalık değerlendirme, bir teknik/beslenme ipucu. Madde işareti olarak "•" kullan.`;
        try {
            const text = await askGeminiAI(prompt);
            const items = String(text).split(/\n+/).map(s => s.replace(/^[•\-*\d.\s]+/, '').trim()).filter(Boolean);
            $('o2-sheet-layer').querySelector('.o2-sheet-body').innerHTML = `<ul class="o2-coach-list" style="margin-top:4px">${items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
        } catch (e) {
            $('o2-sheet-layer').querySelector('.o2-sheet-body').innerHTML = `<div class="o2-empty">Yapay zekâ şu an yanıt veremedi.<br>Oly ayarlarından Gemini API anahtarını kontrol et.</div>`;
        }
    };

    O2.quickWater = () => {
        const w = O2.addWater(250);
        haptic([10, 30, 10]);
        O2.toast(`Su eklendi · ${O2.fmtNum(w.amount)} / ${O2.fmtNum(w.goal)} ml`, 'drop');
        if (w.amount >= w.goal && w.amount - 250 < w.goal && typeof confetti === 'function') confetti({ particleCount: 80, spread: 70, colors: ['#5ac8fa', '#ffffff'] });
        O2.render();
    };

    O2.openCardio = () => O2.cardioSheet();
    O2.openZen = () => O2.breathe();

    // ==========================================
    // 🏋️ ANTRENMAN
    // ==========================================
    O2.pickTrainDay = (offset) => { O2.ui.trainOffset = offset; haptic(8); O2.render(); };
    O2.pickProgram = (id) => {
        O2.saveSettings({ program: id });
        haptic(10);
        O2.render();
    };

    function renderTrain() {
        const programs = O2.programs();
        const active = O2.activeProgram();
        const plan = O2.dayPlan(O2.ui.trainOffset, active);
        const d = O2.addDays(new Date(), O2.ui.trainOffset);
        const dayLabel = O2.ui.trainOffset === 0 ? 'Bugün' : d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'short' });
        const bests = O2.bests();

        return `
        <div class="o2-stagger">
            <div class="o2-hero-head">
                <div class="o2-eyebrow">${esc(active.sub)}</div>
                <h1 class="o2-title">Antrenman</h1>
            </div>

            <div class="o2-segment">${programs.map(p => `<button class="${p.id === active.id ? 'active' : ''}" onclick="O2.pickProgram('${esc(p.id)}')">${esc(p.name)}</button>`).join('')}</div>

            <div class="o2-card" style="padding:12px;margin-top:12px;">${weekStrip(true)}</div>

            <div class="o2-section-head"><h3>${esc(dayLabel)}</h3>${plan.isRest ? '' : `<span class="o2-link" style="color:var(--o2-text-3)">~${O2.estMinutes(plan)} dk</span>`}</div>
            ${plan.isRest ? restCard(plan) : `
            <div class="o2-card o2-day-card">
                <div class="o2-eyebrow">${esc(String(plan.title).split(':')[0])}</div>
                <h2>${esc((String(plan.title).split(':')[1] || plan.title).trim())}</h2>
                <div class="o2-chips" style="margin:10px 0 6px;">${O2.musclesOfDay(plan).map(m => `<span class="o2-chip">${O2.MUSCLES[m]}</span>`).join('')}</div>
                <div class="o2-list" style="margin-top:6px;">
                    ${plan.ex.map((e, i) => {
                        const b = bests[e.name];
                        return `
                        <div class="o2-row is-tap" onclick="O2.exerciseSheet(${O2.ui.trainOffset}, ${i})">
                            <div class="o2-row-idx">${i + 1}</div>
                            <div class="o2-row-main"><h5>${esc(e.name)}</h5><p>${esc(e.scheme)} · Tempo ${esc(e.tempo || '—')} · RPE ${esc(e.rpe || '—')}</p></div>
                            <div class="o2-row-end">${b ? `<strong>${O2.fmtNum(b.w, 1)} kg</strong><span class="o2-ex-best">× ${b.r}</span>` : `<span style="color:var(--o2-text-3)">Yeni</span>`}</div>
                        </div>`;
                    }).join('')}
                </div>
                <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:16px;" onclick="O2.startSession(${O2.ui.trainOffset})">${I('play')}${O2.ui.trainOffset === 0 ? 'Antrenmanı başlat' : 'Bu antrenmanı şimdi yap'}</button>
            </div>`}

            <div class="o2-section-head"><h3>Araçlar</h3></div>
            <div class="o2-grid-2">
                <div class="o2-card is-tap" onclick="O2.logSheet('1rm')"><span style="color:var(--o2-gold)">${I('calc')}</span><h4 style="margin:10px 0 2px;font-size:15px;">1RM hesapla</h4><p style="margin:0;font-size:12px;color:var(--o2-text-3)">Maksimum gücünü tahmin et</p></div>
                <div class="o2-card is-tap" onclick="O2.openCardio()" style="margin-top:0"><span style="color:var(--o2-orange)">${I('run')}</span><h4 style="margin:10px 0 2px;font-size:15px;">Kardiyo</h4><p style="margin:0;font-size:12px;color:var(--o2-text-3)">GPS ile koşu & bisiklet</p></div>
            </div>

            ${O2.programsSection()}

            <div class="o2-section-head"><h3>Son seanslar</h3></div>
            ${historyList()}
        </div>`;
    }

    function historyList() {
        const items = [];
        O2.sessions().forEach(s => items.push({
            t: s.endedAt, title: s.title, id: s.id, prs: (s.prs || []).length,
            sub: s.type === 'cardio'
                ? `${O2.fmtNum(s.distanceKm, 2)} km · ${O2.fmtClock(s.durationSec)}${s.kind === 'ride' ? '' : ` · ${O2.fmtPace(s.paceSec)}/km`}`
                : `${O2.fmtClock(s.durationSec)} · ${O2.fmtNum(s.volume)} kg · ${s.setCount} set`
        }));
        (LS.get('olympus_past_workouts', []) || []).forEach(w => {
            if (String(w.id || '').startsWith('o2')) return;
            const d = O2.parseDate(w.date);
            if (d) items.push({ t: d.getTime() + 1, title: w.title, sub: `${w.date} · ${w.duration || ''}`, prs: 0, id: null });
        });
        items.sort((a, b) => b.t - a.t);
        if (!items.length) return `<div class="o2-card o2-empty">${I('trophy')}<br>İlk seansını tamamladığında geçmişin burada görünecek.</div>`;
        return `<div class="o2-card" style="padding:4px 18px;"><div class="o2-list">${items.slice(0, 8).map(it => `
            <div class="o2-row ${it.id ? 'is-tap' : ''}" ${it.id ? `onclick="O2.sessionSheet('${it.id}')"` : ''}>
                <div class="o2-row-idx" style="color:var(--o2-gold)">${I('check')}</div>
                <div class="o2-row-main"><h5>${esc(it.title)}</h5><p>${esc(it.id ? new Date(it.t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' · ' : '')}${esc(it.sub)}</p></div>
                ${it.prs ? `<span class="o2-chip gold">${it.prs} PR</span>` : ''}
            </div>`).join('')}</div></div>`;
    }

    O2.exerciseSheet = (offset, i) => {
        const plan = O2.dayPlan(offset);
        const e = plan.ex[i];
        const target = O2.parseScheme(e.scheme);
        const last = O2.lastPerformance(e.name);
        const best = O2.bests()[e.name];
        const sug = O2.suggest(e);
        const muscle = O2.muscleOf(e.name);
        const video = `https://www.youtube.com/results?search_query=${encodeURIComponent(e.name + ' exercise form')}`;
        O2.sheet(e.name, `
            <div class="o2-chips"><span class="o2-chip gold">${O2.MUSCLES[muscle]}</span><span class="o2-chip">${esc(e.scheme)}</span><span class="o2-chip">Tempo ${esc(e.tempo || '—')}</span><span class="o2-chip">RPE ${esc(e.rpe || '—')}</span></div>
            <div class="o2-grid-2" style="margin-top:16px;">
                <div class="o2-card o2-stat"><small>En iyi set</small><strong>${best ? `${O2.fmtNum(best.w, 1)}<small> kg × ${best.r}</small>` : '—'}</strong></div>
                <div class="o2-card o2-stat" style="margin-top:0"><small>Tahmini 1RM</small><strong>${best ? `${O2.fmtNum(best.e1rm, 1)}<small> kg</small>` : '—'}</strong></div>
            </div>
            ${sug.note ? `<div class="o2-insight">${I('spark')}<span>${sug.note}</span></div>` : ''}
            ${O2.cuesFor(e.name) ? `<div class="o2-field"><label>Teknik</label><ul class="o2-coach-list" style="margin:2px 0 0">${O2.cuesFor(e.name).map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>` : ''}
            ${last ? `<div class="o2-field"><label>Son performans</label><div class="o2-chips">${last.sets.map(s => `<span class="o2-chip">${O2.fmtNum(s.w, 1)} kg × ${s.r}</span>`).join('')}</div></div>` : ''}
            <div class="o2-field"><label>Tempo nasıl okunur</label><p style="margin:0;font-size:13px;line-height:1.6;color:var(--o2-text-2)">${esc(e.tempo || '2-0-1-0')} → iniş · alt duraklama · kalkış · üst duraklama (saniye). ${target.sets} set, ${target.isTime ? 'süre' : 'tekrar'} hedefi ${target.low && target.high && target.low !== target.high ? `${target.low}-${target.high}` : (target.high || 'maksimum')}.</p></div>
            <a class="o2-btn o2-btn-ghost o2-btn-block" style="margin-top:18px;text-decoration:none;" href="${video}" target="_blank" rel="noopener">${I('play')}Teknik videosunu izle</a>
            ${O2.exerciseHistoryHTML(e.name)}
        `);
        O2.drawExerciseChart(e.name, 'o2-ex-chart');
    };

    // Programda olmayan (rekor tablosundan açılan) hareketler için geçmiş
    O2.exerciseInfo = (name) => {
        const best = O2.bests()[name];
        O2.sheet(name, `
            <div class="o2-chips"><span class="o2-chip gold">${O2.MUSCLES[O2.muscleOf(name)]}</span></div>
            <div class="o2-grid-2" style="margin-top:14px">
                <div class="o2-card o2-stat"><small>En iyi set</small><strong>${best ? `${O2.fmtNum(best.w, 1)}<small> kg × ${best.r}</small>` : '—'}</strong></div>
                <div class="o2-card o2-stat"><small>Tahmini 1RM</small><strong>${best ? `${O2.fmtNum(best.e1rm, 1)}<small> kg</small>` : '—'}</strong></div>
            </div>
            ${O2.exerciseHistoryHTML(name) || '<div class="o2-empty">Bu hareket için Olympus Training seans kaydı yok.</div>'}`);
        O2.drawExerciseChart(name, 'o2-ex-chart');
    };

    O2.sessionSheet = (id) => {
        const s = O2.sessions().find(x => x.id === id);
        if (!s) return;
        if (s.type === 'cardio') return O2.sheet(s.title, O2.cardioDetail(s));
        O2.sheet(s.title, `
            <div class="o2-grid-3">
                <div class="o2-card o2-stat"><small>Süre</small><strong style="font-size:20px">${O2.fmtClock(s.durationSec)}</strong></div>
                <div class="o2-card o2-stat" style="margin-top:0"><small>Hacim</small><strong style="font-size:20px">${O2.fmtNum(s.volume)}<small> kg</small></strong></div>
                <div class="o2-card o2-stat" style="margin-top:0"><small>Set</small><strong style="font-size:20px">${s.setCount}</strong></div>
            </div>
            <div class="o2-list" style="margin-top:10px;">${(s.exercises || []).filter(e => e.sets.length).map(e => `
                <div class="o2-row"><div class="o2-row-main"><h5>${esc(e.name)}</h5><p>${e.sets.map(st => `${O2.fmtNum(st.w, 1)}×${st.r}`).join('  ·  ')}</p></div>
                ${(s.prs || []).some(p => p.ex === e.name) ? '<span class="o2-chip gold">PR</span>' : ''}</div>`).join('')}</div>
            ${s.note ? `<div class="o2-field"><label>Not</label><p style="margin:0;color:var(--o2-text-2);font-size:13px">${esc(s.note)}</p></div>` : ''}
        `);
    };

    // ==========================================
    // 🥗 BESLENME
    // ==========================================
    O2.pickFuelDay = (offset) => { O2.ui.fuelOffset = offset; haptic(8); O2.render(); };

    function renderFuel() {
        const off = O2.ui.fuelOffset;
        const dietIdx = O2.dayIndex(off, 7) + 1;
        const d = O2.diet()[dietIdx];
        const mac = O2.macros(d.title);
        const key = O2.dayKey(O2.addDays(new Date(), off));
        const eaten = LS.get(`oly2_meals_${key}`, []);
        const water = O2.water();
        const supps = LS.get(`oly2_supps_${key}`, []);
        const SUPPS = [['creatine', 'Kreatin', '5 g'], ['whey', 'Whey', '1 ölçek'], ['omega', 'Omega-3', '2 kapsül'], ['multi', 'Multivitamin', '1 tablet']];

        return `
        <div class="o2-stagger">
            <div class="o2-hero-head">
                <div class="o2-eyebrow">${esc(String(d.title).split(':').pop().trim())} günü</div>
                <h1 class="o2-title">Beslenme</h1>
            </div>
            <div class="o2-segment"><button class="${off === 0 ? 'active' : ''}" onclick="O2.pickFuelDay(0)">Bugün</button><button class="${off === 1 ? 'active' : ''}" onclick="O2.pickFuelDay(1)">Yarın</button></div>

            <div style="margin-top:12px">${O2.foodCard(key, mac)}</div>
            <p style="margin:10px 4px 0;font-size:11.5px;color:var(--o2-text-3);line-height:1.5">Hedefler ${O2.fmtNum(mac.bw, 1)} kg vücut ağırlığına ve günün karbonhidrat tipine göre hesaplanır.</p>

            <div class="o2-section-head"><h3>Öğün planı</h3><span class="o2-link" style="color:var(--o2-text-3)">Değişim için dokun</span></div>
            ${d.meals.map((m, i) => `
            <div class="o2-card o2-meal ${eaten.includes(i) ? 'done' : ''}" id="o2-meal-${i}">
                <div class="o2-meal-icon">${m.i || '🍽️'}</div>
                <div onclick="document.getElementById('o2-meal-${i}').classList.toggle('show-alt')" style="cursor:pointer">
                    <small>${esc(m.t)}</small>
                    <h5>${esc(m.d)}</h5>
                    <div class="o2-alt">${esc(m.alt || 'Alternatif bulunmuyor.')}</div>
                    <span class="o2-meal-swap">${I('swap')}Alternatif</span>
                </div>
                <button class="o2-check ${eaten.includes(i) ? 'on' : ''}" onclick="O2.toggleMeal('${key}', ${i})" aria-label="Yendi olarak işaretle">${I('check')}</button>
            </div>`).join('')}

            ${typeof openFatSecretApp === 'function' ? `<button class="o2-btn o2-btn-ghost o2-btn-block" style="margin-top:12px" onclick="openFatSecretApp()">${I('fuel')}FatSecret'te kalori kaydet</button>` : ''}

            <div class="o2-section-head"><h3>Hidrasyon</h3><button class="o2-link" onclick="O2.logSheet('waterGoal')">Hedef</button></div>
            <div class="o2-card o2-water">
                <div class="o2-bottle"><div class="o2-bottle-fill" style="height:${Math.round(O2.clamp(water.amount / water.goal) * 100)}%"></div></div>
                <div>
                    <div class="o2-eyebrow">Bugün</div>
                    <strong>${O2.fmtNum(water.amount)}<small> / ${O2.fmtNum(water.goal)} ml</small></strong>
                    <p style="margin:6px 0 14px;font-size:12px;color:var(--o2-text-3)">${water.amount >= water.goal ? 'Hedef tamam. Mükemmel.' : `${O2.fmtNum(water.goal - water.amount)} ml kaldı · dün ${O2.fmtNum(water.yesterday || 0)} ml`}</p>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.water250(250)">+250</button>
                        <button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.water250(500)">+500</button>
                        <button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.water250(-250)" aria-label="250 ml geri al">${I('minus')}</button>
                    </div>
                </div>
            </div>

            <div class="o2-section-head"><h3>Takviyeler</h3><span class="o2-link" style="color:var(--o2-text-3)">${supps.length}/${SUPPS.length}</span></div>
            <div class="o2-card" style="padding:4px 18px;"><div class="o2-list">${SUPPS.map(([id, name, dose]) => `
                <div class="o2-row is-tap" onclick="O2.toggleSupp('${key}', '${id}')">
                    <div class="o2-row-main"><h5>${name}</h5><p>${dose}</p></div>
                    <span class="o2-check ${supps.includes(id) ? 'on' : ''}">${I('check')}</span>
                </div>`).join('')}</div></div>
        </div>`;
    }

    O2.toggleMeal = (key, i) => {
        const list = LS.get(`oly2_meals_${key}`, []);
        const idx = list.indexOf(i);
        if (idx >= 0) list.splice(idx, 1); else { list.push(i); haptic([10, 40, 10]); }
        LS.set(`oly2_meals_${key}`, list);
        O2.render();
    };
    O2.toggleSupp = (key, id) => {
        const list = LS.get(`oly2_supps_${key}`, []);
        const idx = list.indexOf(id);
        if (idx >= 0) list.splice(idx, 1); else { list.push(id); haptic(12); }
        LS.set(`oly2_supps_${key}`, list);
        O2.render();
    };
    O2.water250 = (ml) => { O2.addWater(ml); haptic(10); O2.render(); };

    // ==========================================
    // 📈 İLERLEME
    // ==========================================
    function renderProgress() {
        const p = LS.get('olympus_profile', {}) || {};
        const weights = (LS.get('olympus_history', []) || []).map(h => ({ d: O2.parseDate(h.date), w: parseFloat(h.weight) })).filter(x => x.d && x.w);
        const lastW = weights[weights.length - 1];
        const monthAgo = weights.filter(x => x.d <= O2.addDays(new Date(), -28)).pop() || weights[0];
        const wDelta = lastW && monthAgo && lastW !== monthAgo ? lastW.w - monthAgo.w : null;
        const bf = O2.bodyFat(p);
        const w0 = O2.weekStats(0), w1 = O2.weekStats(1);
        const volDelta = w1.volume ? Math.round((w0.volume - w1.volume) / w1.volume * 100) : null;
        const active30 = [...O2.activityDays()].filter(k => new Date(k) >= O2.addDays(new Date(), -30)).length;
        const rec = O2.recovery();
        const fatigueFill = (m) => {
            const f = 1 - rec[m];
            if (f <= .05) return 'rgba(61,220,151,.28)';
            if (f < .4) return `rgba(230,195,116,${.35 + f})`;
            return `rgba(255,122,69,${.4 + f * .6})`;
        };
        const bests = Object.entries(O2.bests()).sort((a, b) => b[1].e1rm - a[1].e1rm).slice(0, 6);
        const streak = O2.weekStreak();
        const cardioList = w0.list.filter(s => s.type === 'cardio');
        const runs = cardioList.filter(s => s.kind !== 'ride' && s.paceSec);
        const cardioWeek = { km: cardioList.reduce((a, s) => a + (s.distanceKm || 0), 0), count: cardioList.length, bestPace: runs.length ? Math.min(...runs.map(s => s.paceSec)) : null };
        const photos = LS.get('olympus_progress_photos', []) || [];
        const MEAS = [['w', 'Kilo', 'kg'], ['height', 'Boy', 'cm'], ['chest', 'Göğüs', 'cm'], ['waist', 'Bel', 'cm'], ['arm', 'Kol', 'cm'], ['shoulder', 'Omuz', 'cm'], ['thigh', 'Bacak', 'cm'], ['neck', 'Boyun', 'cm']];

        return `
        <div class="o2-stagger">
            <div class="o2-hero-head">
                <div class="o2-eyebrow">Son 30 gün · ${active30} aktif gün</div>
                <h1 class="o2-title">İlerleme</h1>
            </div>

            <div class="o2-grid-2">
                <div class="o2-card o2-stat is-tap" onclick="O2.logSheet('weight')"><small>Vücut ağırlığı</small><strong>${lastW ? O2.fmtNum(lastW.w, 1) : '—'}<small> kg</small></strong>${wDelta !== null ? `<div class="delta ${Math.abs(wDelta) < .3 ? 'flat' : 'good'}">${wDelta >= 0 ? '▲' : '▼'} ${O2.fmtNum(Math.abs(wDelta), 1)} kg · 4 hafta</div>` : '<div class="delta flat">Kayıt ekle</div>'}</div>
                <div class="o2-card o2-stat is-tap" onclick="O2.logSheet('measure')" style="margin-top:0"><small>Yağ oranı</small><strong>${bf ? `%${O2.fmtNum(bf, 1)}` : '—'}</strong><div class="delta flat">${bf ? 'US Navy formülü' : 'Ölçü gir'}</div></div>
                <div class="o2-card o2-stat" style="margin-top:0"><small>Haftalık hacim</small><strong>${O2.fmtNum(w0.volume / 1000, 1)}<small> ton</small></strong><div class="delta ${volDelta === null ? 'flat' : volDelta >= 0 ? 'good' : 'bad'}">${volDelta === null ? 'Geçen hafta veri yok' : `${volDelta >= 0 ? '▲' : '▼'} %${Math.abs(volDelta)} geçen haftaya göre`}</div></div>
                <div class="o2-card o2-stat" style="margin-top:0"><small>Haftalık seri</small><strong>${streak}<small> hafta</small></strong><div class="delta ${streak ? 'good' : 'flat'}">${streak ? `Hedef: haftada ${O2.settings().weeklyTarget} seans` : 'Bu hafta hedefi tamamla'}</div></div>
            </div>

            <div class="o2-section-head"><h3>Kardiyo</h3><button class="o2-link" onclick="O2.cardioSheet()">Başlat</button></div>
            <div class="o2-card">
                <div class="o2-grid-3">
                    <div><div class="o2-eyebrow">Bu hafta</div><div style="font-size:22px;font-weight:800;margin-top:4px">${O2.fmtNum(cardioWeek.km, 1)}<span style="font-size:12px;color:var(--o2-text-3)"> km</span></div></div>
                    <div><div class="o2-eyebrow">Aktivite</div><div style="font-size:22px;font-weight:800;margin-top:4px">${cardioWeek.count}</div></div>
                    <div><div class="o2-eyebrow">En iyi tempo</div><div style="font-size:22px;font-weight:800;margin-top:4px">${O2.fmtPace(cardioWeek.bestPace)}</div></div>
                </div>
            </div>

            <div class="o2-section-head"><h3>Ağırlık trendi</h3><button class="o2-link" onclick="O2.logSheet('weight')">+ Kayıt</button></div>
            <div class="o2-card">${weights.length >= 2 ? '<div class="o2-chart"><canvas id="o2-chart-weight"></canvas></div>' : `<div class="o2-empty">${I('scale')}<br>Trend için en az 2 tartı kaydı gerekiyor.</div>`}</div>

            <div class="o2-section-head"><h3>Haftalık hacim</h3><span class="o2-link" style="color:var(--o2-text-3)">8 hafta</span></div>
            <div class="o2-card"><div class="o2-chart" style="height:170px"><canvas id="o2-chart-volume"></canvas></div></div>

            <div class="o2-section-head"><h3>Tutarlılık</h3><span class="o2-link" style="color:var(--o2-text-3)">12 hafta</span></div>
            <div class="o2-card">${heatmap()}</div>

            <div class="o2-section-head"><h3>Kas toparlanması</h3></div>
            <div class="o2-card">
                <div class="o2-bodymap">
                    <figure style="margin:0">${O2.figure('front', fatigueFill)}<figcaption>ÖN</figcaption></figure>
                    <figure style="margin:0">${O2.figure('back', fatigueFill)}<figcaption>ARKA</figcaption></figure>
                </div>
                <div class="o2-chips" style="justify-content:center;margin-top:12px;"><span class="o2-chip green">Hazır</span><span class="o2-chip">Toparlanıyor</span><span class="o2-chip orange">Yorgun</span></div>
                <div class="o2-muscle-grid">${Object.keys(O2.MUSCLES).map(m => `
                    <div class="o2-muscle-row"><div><span>${O2.MUSCLES[m]}</span><b>%${Math.round(rec[m] * 100)}</b></div><div class="o2-bar"><i data-w="${Math.round(rec[m] * 100)}%" style="width:0;background:${rec[m] > .95 ? 'var(--o2-green)' : rec[m] > .6 ? 'var(--o2-gold)' : 'var(--o2-orange)'}"></i></div></div>`).join('')}</div>
            </div>

            <div class="o2-section-head"><h3>Kişisel rekorlar</h3></div>
            <div class="o2-card" style="padding:4px 18px;">${bests.length ? bests.map(([name, b]) => `
                <div class="o2-pr" style="cursor:pointer" onclick="O2.exerciseInfo(${jsArg(name)})"><div class="o2-pr-medal">${I('trophy')}</div><div class="o2-row-main"><h5>${esc(name)}</h5><p>${O2.fmtNum(b.w, 1)} kg × ${b.r} · ${esc(O2.prettyDate(b.date))}</p></div><div class="o2-row-end"><strong>${O2.fmtNum(b.e1rm, 1)}</strong>1RM</div></div>`).join('') : `<div class="o2-empty">Set kaydettikçe rekorların burada birikecek.</div>`}</div>

            <div class="o2-section-head"><h3>Ölçüler</h3><button class="o2-link" onclick="O2.logSheet('measure')">Düzenle</button></div>
            <div class="o2-card"><div class="o2-grid-2" style="gap:14px 18px">${MEAS.map(([k, label, unit]) => `<div><div class="o2-eyebrow" style="letter-spacing:1px">${label}</div><div style="margin-top:4px;font-size:18px;font-weight:800">${p[k] ? `${esc(p[k])} <span style="font-size:12px;color:var(--o2-text-3)">${unit}</span>` : '<span style="color:var(--o2-text-3)">—</span>'}</div></div>`).join('')}</div></div>

            <div class="o2-section-head"><h3>Gelişim fotoğrafları</h3>${photos.length >= 2 ? `<button class="o2-link" onclick="O2.compareSheet()">Karşılaştır</button>` : `<span class="o2-link" style="color:var(--o2-text-3)">${photos.length}/10</span>`}</div>
            <div class="o2-card">
                <div class="o2-photos">
                    <button class="add" onclick="document.getElementById('o2-photo-input').click()" aria-label="Fotoğraf ekle">${I('camera')}</button>
                    ${photos.slice().reverse().map(ph => `<button onclick="O2.photoSheet(${ph.id})"><img src="${ph.img}" alt="Gelişim fotoğrafı ${esc(ph.date)}" loading="lazy"><small>${esc(ph.date)}</small></button>`).join('')}
                </div>
                <input type="file" id="o2-photo-input" accept="image/*" hidden onchange="O2.addPhoto(event)">
            </div>

            <div class="o2-section-head"><h3>Haftalık rapor</h3></div>
            <div class="o2-card">
                <div class="o2-coach">
                    <div class="o2-coach-orb">${I('mail')}</div>
                    <div style="flex:1"><h4>Performans raporu e-postası</h4><p>Her yeni haftanın ilk açılışında geçen haftanın özeti e-postana gelir.</p></div>
                </div>
                <button class="o2-btn o2-btn-ghost o2-btn-block" style="margin-top:14px" onclick="O2.sendReportNow()">${I('mail')}Bu haftanın raporunu şimdi gönder</button>
            </div>
        </div>`;
    }

    function heatmap() {
        const days = O2.activityDays();
        const start = O2.addDays(O2.weekStart(), -7 * 11);
        const todayT = O2.startOfDay().getTime();
        const vols = {};
        O2.sessions().forEach(s => { vols[s.dayKey] = (vols[s.dayKey] || 0) + (s.volume || 0); });
        let cells = '';
        for (let i = 0; i < 84; i++) {
            const d = O2.addDays(start, i);
            const k = O2.dayKey(d);
            let cls = '';
            if (d.getTime() > todayT) cls = 'future';
            else if (days.has(k)) cls = vols[k] > 8000 ? 'l3' : vols[k] > 3000 ? 'l2' : 'l1';
            cells += `<i class="${cls}" title="${k}"></i>`;
        }
        return `<div class="o2-heat">${cells}</div>
            <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:10.5px;font-weight:700;color:var(--o2-text-3)"><span>12 hafta önce</span><span>Bugün</span></div>`;
    }

    function drawProgressCharts() {
        if (typeof Chart === 'undefined') return;
        const gold = '#e6c374';
        const grid = 'rgba(255,255,255,.05)';
        const tick = '#63636e';
        const base = {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#18181c', borderColor: 'rgba(255,255,255,.1)', borderWidth: 1, titleColor: '#a1a1aa', bodyColor: '#fff', padding: 10, displayColors: false, bodyFont: { weight: 'bold' } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: tick, font: { size: 10, weight: 'bold' }, maxRotation: 0, autoSkipPadding: 14 }, border: { display: false } },
                y: { grid: { color: grid }, ticks: { color: tick, font: { size: 10, weight: 'bold' }, maxTicksLimit: 5 }, border: { display: false } }
            }
        };

        const wc = document.getElementById('o2-chart-weight');
        if (wc) {
            const weights = (LS.get('olympus_history', []) || []).map(h => ({ d: O2.parseDate(h.date), w: parseFloat(h.weight) })).filter(x => x.d && x.w).slice(-24);
            const ctx = wc.getContext('2d');
            const g = ctx.createLinearGradient(0, 0, 0, 190);
            g.addColorStop(0, 'rgba(230,195,116,.35)'); g.addColorStop(1, 'rgba(230,195,116,0)');
            O2.ui.charts.push(new Chart(ctx, {
                type: 'line',
                data: { labels: weights.map(x => x.d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })), datasets: [{ data: weights.map(x => x.w), borderColor: gold, backgroundColor: g, fill: true, tension: .38, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: gold }] },
                options: { ...base, plugins: { ...base.plugins, tooltip: { ...base.plugins.tooltip, callbacks: { label: c => `${c.parsed.y} kg` } } } }
            }));
        }

        const vc = document.getElementById('o2-chart-volume');
        if (vc) {
            const weeks = [];
            for (let i = 7; i >= 0; i--) weeks.push(O2.weekStats(i));
            const ctx = vc.getContext('2d');
            const g = ctx.createLinearGradient(0, 0, 0, 170);
            g.addColorStop(0, '#f6dea0'); g.addColorStop(1, '#b9842c');
            O2.ui.charts.push(new Chart(ctx, {
                type: 'bar',
                data: { labels: weeks.map(w => w.start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })), datasets: [{ data: weeks.map(w => Math.round(w.volume)), backgroundColor: weeks.map((w, i) => i === 7 ? g : 'rgba(255,255,255,.1)'), borderRadius: 8, borderSkipped: false, maxBarThickness: 26 }] },
                options: { ...base, plugins: { ...base.plugins, tooltip: { ...base.plugins.tooltip, callbacks: { label: c => `${O2.fmtNum(c.parsed.y)} kg` } } } }
            }));
        }
    }

    O2.sendReportNow = async () => {
        if (!(typeof auth !== 'undefined' && auth.currentUser && auth.currentUser.email)) { O2.toast('Rapor için e-posta adresli bir hesapla giriş yapmalısın', 'mail'); return; }
        O2.toast('Rapor hazırlanıyor…', 'mail');
        const ok = await O2.sendWeeklyReport(0);
        O2.toast(ok ? `Rapor gönderildi · ${auth.currentUser.email}` : 'Rapor gönderilemedi, bağlantını kontrol et', 'mail');
    };

    O2.addPhoto = (event) => {
        if (typeof addProgressPhoto !== 'function') return;
        const before = (LS.get('olympus_progress_photos', []) || []).length;
        addProgressPhoto(event);
        // Eski motor görseli sıkıştırıp asenkron kaydeder; kayıt düşene kadar bekle
        let tries = 0;
        const wait = setInterval(() => {
            tries++;
            if ((LS.get('olympus_progress_photos', []) || []).length !== before || tries > 20) {
                clearInterval(wait);
                O2.render();
                O2.toast('Gelişim fotoğrafı eklendi', 'camera');
            }
        }, 250);
    };

    O2.photoSheet = (id) => {
        const ph = (LS.get('olympus_progress_photos', []) || []).find(x => x.id === id);
        if (!ph) return;
        const m = ph.measurements || {};
        O2.sheet(ph.date, `
            <img src="${ph.img}" alt="" style="width:100%;border-radius:18px;display:block;">
            ${m.w ? `<div class="o2-chips" style="margin-top:12px">${m.w ? `<span class="o2-chip">${esc(m.w)} kg</span>` : ''}${m.waist ? `<span class="o2-chip">Bel ${esc(m.waist)} cm</span>` : ''}${m.arm ? `<span class="o2-chip">Kol ${esc(m.arm)} cm</span>` : ''}</div>` : ''}
            <button class="o2-btn o2-btn-danger o2-btn-block" style="margin-top:16px" onclick="O2.deletePhoto(${id})">Fotoğrafı sil</button>`);
    };
    O2.deletePhoto = (id) => {
        if (!confirm('Bu gelişim fotoğrafı silinsin mi?')) return;
        LS.set('olympus_progress_photos', (LS.get('olympus_progress_photos', []) || []).filter(x => x.id !== id));
        O2.closeSheet();
        O2.render();
    };

    // ==========================================
    // ✍️ KAYIT ALT SAYFALARI
    // ==========================================
    O2.logSheet = (type) => {
        const p = LS.get('olympus_profile', {}) || {};
        if (type === 'weight') {
            const hist = LS.get('olympus_history', []) || [];
            const last = hist.length ? parseFloat(hist[hist.length - 1].weight) : (parseFloat(p.w) || 80);
            O2.sheet('Kilo kaydı', `
                <p style="margin:0;color:var(--o2-text-2);font-size:13px;line-height:1.55">En tutarlı sonuç için sabah, tuvaletten sonra ve aç karnına tartıl.</p>
                <div class="o2-field"><label>Ağırlık (kg)</label>${stepper('o2-in-weight', last, .1)}</div>
                <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:20px" onclick="O2.saveWeight()">Kaydet</button>`);
        } else if (type === 'sleep') {
            O2.sheet('Uyku kaydı', `
                <p style="margin:0;color:var(--o2-text-2);font-size:13px;line-height:1.55">Dün gece kaç saat uyudun? Hazırlık skorun buna göre güncellenir.</p>
                <div class="o2-field"><label>Süre (saat)</label>${stepper('o2-in-sleep', (O2.lastSleep() || {}).hours || 7.5, .5)}</div>
                <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:20px" onclick="O2.saveSleep()">Kaydet</button>`);
        } else if (type === 'kcal') {
            O2.sheet('Hareket enerjisi', `
                <p style="margin:0;color:var(--o2-text-2);font-size:13px;line-height:1.55">Saat ya da telefonunun gösterdiği aktif kaloriyi ekle. Antrenman seansların otomatik sayılır.</p>
                <div class="o2-field"><label>Aktif kalori (kcal)</label>${stepper('o2-in-kcal', 200, 50)}</div>
                <div class="o2-field"><label>Günlük hedef (kcal)</label>${stepper('o2-in-kcalgoal', O2.settings().kcalGoal, 50)}</div>
                <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:20px" onclick="O2.saveKcal()">Kaydet</button>`);
        } else if (type === 'waterGoal') {
            O2.sheet('Su hedefi', `
                <div class="o2-field"><label>Günlük hedef (ml)</label>${stepper('o2-in-water', O2.water().goal, 250)}</div>
                <p style="margin:12px 0 0;color:var(--o2-text-3);font-size:12px">Öneri: vücut ağırlığı × 35 ml ≈ ${O2.fmtNum((parseFloat(p.w) || 80) * 35)} ml</p>
                <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:20px" onclick="O2.saveWaterGoal()">Kaydet</button>`);
        } else if (type === 'measure') {
            const F = [['w', 'Kilo (kg)'], ['height', 'Boy (cm)'], ['neck', 'Boyun'], ['shoulder', 'Omuz'], ['chest', 'Göğüs'], ['waist', 'Bel'], ['hips', 'Basen'], ['arm', 'Kol'], ['thigh', 'Bacak'], ['calf', 'Kalf']];
            O2.sheet('Vücut ölçüleri', `
                <div class="o2-grid-2">${F.map(([k, l]) => `<div class="o2-field" style="margin-top:8px"><label>${l}</label><input class="o2-input" id="o2-m-${k}" type="number" inputmode="decimal" value="${esc(p[k] || '')}"></div>`).join('')}</div>
                <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:20px" onclick="O2.saveMeasures()">Kaydet</button>`);
        } else if (type === '1rm') {
            O2.sheet('1RM hesaplayıcı', `
                <div class="o2-grid-2"><div class="o2-field"><label>Ağırlık (kg)</label><input class="o2-input" id="o2-1rm-w" type="number" inputmode="decimal" placeholder="100" oninput="O2.calc1rm()"></div>
                <div class="o2-field"><label>Tekrar</label><input class="o2-input" id="o2-1rm-r" type="number" inputmode="numeric" placeholder="5" oninput="O2.calc1rm()"></div></div>
                <div class="o2-card" style="margin-top:16px;text-align:center"><div class="o2-eyebrow">Tahmini maksimum</div><div id="o2-1rm-out" style="font-size:42px;font-weight:800;letter-spacing:-1.5px;margin-top:6px">— kg</div></div>
                <div id="o2-1rm-table" style="margin-top:10px"></div>`);
        }
    };

    O2.calc1rm = () => {
        const w = parseFloat($('o2-1rm-w').value), r = parseInt($('o2-1rm-r').value);
        const max = O2.e1rm(w, r);
        $('o2-1rm-out').innerText = max ? `${O2.fmtNum(max, 1)} kg` : '— kg';
        $('o2-1rm-table').innerHTML = max ? `<div class="o2-list">${[[95, 2], [90, 4], [85, 6], [80, 8], [75, 10], [70, 12]].map(([pc, rep]) => `<div class="o2-row"><div class="o2-row-main"><h5>%${pc}</h5><p>≈ ${rep} tekrar</p></div><div class="o2-row-end"><strong>${O2.fmtNum(max * pc / 100, 1)} kg</strong></div></div>`).join('')}</div>` : '';
    };

    O2.saveWeight = () => {
        const v = parseFloat($('o2-in-weight').value);
        if (!v || v < 25 || v > 300) { O2.toast('Geçerli bir ağırlık gir', 'scale'); return; }
        const hist = LS.get('olympus_history', []) || [];
        const today = O2.trDate();
        if (hist.length && hist[hist.length - 1].date === today) hist[hist.length - 1].weight = String(v);
        else hist.push({ date: today, weight: String(v) });
        LS.set('olympus_history', hist);
        const p = LS.get('olympus_profile', {}) || {};
        localStorage.setItem('olympus_profile_old', JSON.stringify(p));
        p.w = String(v);
        LS.set('olympus_profile', p);
        if (typeof syncDataToCloud === 'function') syncDataToCloud();
        O2.closeSheet(); O2.render(); O2.toast(`${v} kg kaydedildi`, 'scale');
    };
    O2.saveSleep = () => {
        const v = parseFloat($('o2-in-sleep').value);
        if (!v || v <= 0 || v > 16) { O2.toast('Geçerli bir süre gir', 'moon'); return; }
        const hist = LS.get('olympus_sleep_history', []) || [];
        const today = O2.trDate();
        if (hist.length && hist[hist.length - 1].date === today) hist[hist.length - 1].val = String(v);
        else hist.push({ date: today, val: String(v) });
        LS.set('olympus_sleep_history', hist);
        O2.closeSheet(); O2.render(); O2.toast(`${v} saat uyku kaydedildi`, 'moon');
    };
    O2.saveKcal = () => {
        const v = parseFloat($('o2-in-kcal').value);
        const goal = parseInt($('o2-in-kcalgoal').value);
        if (v > 0) {
            const hist = LS.get('olympus_active_kcal_history', []) || [];
            hist.push({ date: O2.trDate(), val: String(v) });
            LS.set('olympus_active_kcal_history', hist);
        }
        if (goal > 0) O2.saveSettings({ kcalGoal: goal });
        O2.closeSheet(); O2.render(); O2.toast('Hareket enerjisi güncellendi', 'flame');
    };
    O2.saveWaterGoal = () => {
        const v = parseInt($('o2-in-water').value);
        if (v >= 500) localStorage.setItem('olympus_water_goal', v);
        O2.closeSheet(); O2.render();
    };
    O2.saveMeasures = () => {
        const p = LS.get('olympus_profile', {}) || {};
        localStorage.setItem('olympus_profile_old', JSON.stringify(p));
        ['w', 'height', 'neck', 'shoulder', 'chest', 'waist', 'hips', 'arm', 'thigh', 'calf'].forEach(k => {
            const v = $('o2-m-' + k).value;
            if (v !== '') p[k] = v;
        });
        LS.set('olympus_profile', p);
        if (p.w) {
            const hist = LS.get('olympus_history', []) || [];
            const today = O2.trDate();
            if (!(hist.length && hist[hist.length - 1].date === today && hist[hist.length - 1].weight === p.w)) {
                if (hist.length && hist[hist.length - 1].date === today) hist[hist.length - 1].weight = p.w;
                else hist.push({ date: today, weight: p.w });
                LS.set('olympus_history', hist);
            }
        }
        if (typeof syncDataToCloud === 'function') syncDataToCloud();
        O2.closeSheet(); O2.render(); O2.toast('Ölçüler kaydedildi', 'ruler');
    };

    // ==========================================
    // ⚙️ AYARLAR
    // ==========================================
    O2.settingsSheet = () => {
        const s = O2.settings();
        const user = typeof auth !== 'undefined' && auth.currentUser;
        const start = LS.raw('olympus_start_date', O2.dayKey());
        O2.sheet('Ayarlar', `
            <div class="o2-coach" style="align-items:center">
                <div class="o2-avatar" style="width:54px;height:54px"><img src="${esc($('o2-avatar-img').src)}" alt=""></div>
                <div><h4 style="font-size:17px">${esc((user && user.displayName) || O2.userName())}</h4><p>${esc((user && user.email) || 'Misafir oturumu')}</p></div>
            </div>
            <div class="o2-field" style="margin-top:20px"><label>Program başlangıç tarihi</label><input class="o2-input" type="date" id="o2-set-start" value="${esc(start)}"></div>
            <div class="o2-grid-2">
                <div class="o2-field"><label>Dinlenme (sn)</label>${stepper('o2-set-rest', s.restSec, 15)}</div>
                <div class="o2-field"><label>Haftalık hedef</label>${stepper('o2-set-target', s.weeklyTarget, 1)}</div>
            </div>
            <div class="o2-toggle-row" style="margin-top:10px" onclick="this.querySelector('.o2-switch').classList.toggle('on')">
                <div><h5>Haftalık rapor e-postası</h5><p>Her hafta başında performans özetini ${esc((user && user.email) || 'e-postana')} gönderir.</p></div>
                <span class="o2-switch ${s.weeklyMail ? 'on' : ''}" id="o2-set-mail"></span>
            </div>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:18px" onclick="O2.saveSettingsSheet()">Kaydet</button>

            <div class="o2-toggle-row" onclick="O2.toggleDilala()">
                <div><h5>🌸 Dilala modu</h5><p>Özel program, diyet ve görevler. Açarken şifre sorulur.</p></div>
                <span class="o2-switch ${document.body.classList.contains('dilala-mode') ? 'on' : ''}"></span>
            </div>

            <div class="o2-section-head" style="margin-top:26px"><h3>Akademi modu</h3></div>
            <div class="o2-grid-2">
                <button class="o2-btn o2-btn-ghost" onclick="O2.openAcademy('polis')">${I('shield')}POMEM</button>
                <button class="o2-btn o2-btn-ghost" onclick="O2.openAcademy('jandarma')">${I('shield')}JASEM</button>
            </div>

            <div class="o2-section-head" style="margin-top:26px"><h3>Super App</h3></div>
            <div class="o2-card o2-card-glow is-tap" onclick="O2.openSuperApp()" style="margin-bottom:12px">
                <div class="o2-coach">
                    <img src="icon.png" alt="" style="width:46px;height:46px;border-radius:14px;object-fit:cover;flex-shrink:0">
                    <div style="flex:1"><h4>Project Olympus Super App</h4><p>KPSS, Finans, Garaj, Arcade, Business, OlyScore, OlySocial ve diğer modüller</p></div>
                    ${I('chev', 'chev')}
                </div>
            </div>
            <div class="o2-field" style="margin-top:4px"><label>Uygulama açılışı</label>
                <div class="o2-segment">
                    <button class="${O2.isTrainingHome() ? 'active' : ''}" onclick="O2.formPick(this); O2.setLaunchTarget('training')">Olympus Training</button>
                    <button class="${O2.isTrainingHome() ? '' : 'active'}" onclick="O2.formPick(this); O2.setLaunchTarget('hub')">Super App</button>
                </div>
            </div>

            <div class="o2-section-head" style="margin-top:26px"><h3>Diğer</h3></div>
            <div class="o2-list">
                <div class="o2-row is-tap" onclick="O2.openClassic()"><div class="o2-row-idx">${I('grid')}</div><div class="o2-row-main"><h5>Klasik Olympus</h5><p>Önceki tasarıma geç (tüm veriler ortak)</p></div>${I('chev', 'chev')}</div>
            </div>
            <p style="margin:22px 0 0;text-align:center;font-size:11px;color:var(--o2-text-3);letter-spacing:.4px">Olympus Training · Project Olympus</p>`);
    };

    O2.saveSettingsSheet = () => {
        const start = $('o2-set-start').value;
        if (start) localStorage.setItem('olympus_start_date', start);
        O2.saveSettings({
            restSec: O2.clamp(parseInt($('o2-set-rest').value) || 90, 15, 600),
            weeklyTarget: O2.clamp(parseInt($('o2-set-target').value) || 5, 1, 14),
            weeklyMail: $('o2-set-mail').classList.contains('on')
        });
        O2.closeSheet(); O2.render(); O2.toast('Ayarlar kaydedildi', 'settings');
    };

    O2.openAcademy = (mode) => {
        O2.closeSheet(true);
        window.securityReturnScreen = 'oly2-screen';
        if (typeof triggerSecurityMode === 'function') triggerSecurityMode(mode);
    };

    // ==========================================
    // ✅ GÜNLÜK GÖREVLER (klasik ekranla ortak: olympus_acts)
    // ==========================================
    function tasksDone() {
        if (typeof activities === 'undefined') return '';
        return `${activities.filter(a => a.done).length}/${activities.length}`;
    }
    function tasksCard() {
        if (typeof activities === 'undefined') return '';
        return `
        <div class="o2-card" style="padding:4px 18px 14px">
            <div class="o2-list">${activities.map(a => `
                <div class="o2-row">
                    <button class="o2-check ${a.done ? 'on' : ''}" onclick="O2.toggleTask(${a.id})" aria-label="Görevi işaretle">${I('check')}</button>
                    <div class="o2-row-main" onclick="O2.toggleTask(${a.id})" style="cursor:pointer"><h5 style="${a.done ? 'opacity:.45;text-decoration:line-through' : ''}">${esc(a.text)}</h5></div>
                    <button class="o2-icon-btn" style="width:32px;height:32px;border:0;background:none" onclick="O2.removeTask(${a.id})" aria-label="Görevi sil">${I('close')}</button>
                </div>`).join('')}</div>
            <div style="display:flex;gap:8px;margin-top:10px">
                <input class="o2-input" id="o2-task-input" placeholder="Yeni görev ekle" style="height:44px;font-size:14px" onkeydown="if(event.key==='Enter')O2.addTask()">
                <button class="o2-btn o2-btn-ghost o2-btn-sm" style="height:44px" onclick="O2.addTask()" aria-label="Ekle">${I('plus')}</button>
            </div>
        </div>`;
    }
    O2.toggleTask = (id) => {
        const t = activities.find(a => a.id === id);
        if (!t) return;
        toggleAct(id, !t.done);
        if (t.done) haptic([10, 40, 10]);
        if (activities.length && activities.every(a => a.done)) {
            O2.toast('Kusursuz gün · tüm görevler tamam', 'trophy');
            if (typeof confetti === 'function') confetti({ particleCount: 90, spread: 70, colors: ['#f6dea0', '#e6c374', '#ffffff'] });
        }
        O2.render();
    };
    O2.addTask = () => {
        const input = $('o2-task-input');
        const text = input && input.value.trim();
        if (!text) return;
        activities.push({ id: Date.now(), text: text.slice(0, 60), done: false });
        saveAndRenderActivities();
        haptic(10);
        O2.render();
    };
    O2.removeTask = (id) => { deleteAct(id); O2.render(); };

    // ==========================================
    // 🧭 KEŞFET: diğer Olympus özellikleri
    // ==========================================
    function exploreGrid() {
        const tiles = [
            ['swords', 'Arena', 'Liderlik & akış', 'var(--o2-gold)', "O2.openClassicSection('openArenaScreen')", 'openArenaScreen'],
            ['chat', 'Sohbet', 'Sporcu mesajları', 'var(--o2-blue)', 'openChatListModal()', 'openChatListModal'],
            ['ball', 'Sporlar', 'Halı saha & FUT', 'var(--o2-green)', "O2.openClassicSection('openSportsScreen')", 'openSportsScreen'],
            ['run', 'Kardiyo', 'GPS koşu & bisiklet', 'var(--o2-orange)', 'O2.openCardio()', 'openCardioHub'],
            ['tent', 'Kamp', 'Doğa günlüğü', '#c4a37a', 'openCampBook()', 'openCampBook'],
            ['medal', 'Rozetler', 'Başarımların', 'var(--o2-gold)', 'O2.badgesSheet()', null],
            ['leaf', 'Zen', '4-7-8 nefes', 'var(--o2-green)', 'O2.openZen()', 'startZenMode'],
            ['game', 'Mini oyun', 'Olympus Catch', 'var(--o2-violet)', 'openMiniGame()', 'openMiniGame']
        ].filter(t => !t[5] || typeof window[t[5]] === 'function');
        return `<div class="o2-explore">${tiles.map(([icon, title, sub, color, fn]) => `
            <button class="o2-card is-tap" onclick="${fn}">
                <i style="color:${color};background:color-mix(in srgb, ${color} 14%, transparent)">${I(icon)}</i>
                <h4>${title}</h4><p>${sub}</p>
            </button>`).join('')}</div>`;
    }

    // Arena ve Sporlar eski ekranın içinde yaşıyor: oraya geçip kapanınca buraya geri dönülür
    O2.openClassicSection = (fnName) => {
        window.o2ClassicBridge = true;
        document.body.classList.add('o2-bridge'); // klasik üst bar/alt menü gizlenir, bölüm tam ekran
        // Klasik "Profil'e Dön" düğmeleri bu bağlamda Training'e döner
        document.querySelectorAll('#app-content [onclick="closeSportsScreen()"]').forEach(btn => {
            if (!btn.dataset.label) btn.dataset.label = btn.innerHTML;
            btn.innerHTML = '← Training';
        });
        O2.closeSheet(true);
        $('oly2-screen').classList.add('hidden');
        const app = $('app-content');
        app.classList.remove('hidden');
        app.style.display = 'flex';
        window[fnName]();
    };
    ['closeArenaScreen', 'closeSportsScreen'].forEach(name => {
        const original = window[name];
        if (typeof original !== 'function') return;
        window[name] = function (...args) {
            const result = original.apply(this, args);
            if (window.o2ClassicBridge) {
                window.o2ClassicBridge = false;
                O2.openFromClassic();
            }
            return result;
        };
    });

    // Klasik ekrandan Olympus 2.0'a geçiş (klasik başlıktaki "2.0" düğmesi)
    O2.openFromClassic = () => {
        window.o2ClassicBridge = false;
        document.body.classList.remove('o2-bridge');
        document.querySelectorAll('#app-content [data-label]').forEach(btn => { btn.innerHTML = btn.dataset.label; });
        const app = $('app-content');
        app.classList.add('hidden');
        app.style.display = '';
        $('oly2-screen').classList.remove('hidden');
        O2.open();
    };

    O2.badgesSheet = () => {
        if (typeof badgesData === 'undefined') return;
        const list = badgesData.map(b => ({ ...b, earned: (() => { try { return !!b.req(); } catch (e) { return false; } })() }));
        const earned = list.filter(b => b.earned).length;
        O2.sheet('Rozetler', `
            <div class="o2-card" style="text-align:center;margin-bottom:12px">
                <div class="o2-eyebrow">Koleksiyon</div>
                <div style="font-size:34px;font-weight:800;letter-spacing:-1px;margin-top:4px">${earned}<span style="font-size:16px;color:var(--o2-text-3)"> / ${list.length}</span></div>
                <div class="o2-bar" style="margin-top:10px"><i data-w="${Math.round(earned / list.length * 100)}%" style="width:0;background:var(--o2-gold-grad)"></i></div>
            </div>
            <div class="o2-badges">${list.map(b => `
                <div class="o2-badge ${b.earned ? 'earned' : ''}">
                    <span>${b.icon}</span><h5>${esc(b.title)}</h5><p>${esc(b.desc)}</p>
                </div>`).join('')}</div>`);
    };

    O2.openDilalaSpace = () => { if (typeof openDilalaScreen === 'function') openDilalaScreen(); };
    O2.toggleDilala = () => {
        if (typeof setDilalaMode !== 'function') return;
        const on = document.body.classList.contains('dilala-mode');
        O2.closeSheet(true);
        setDilalaMode(!on);
        O2.render();
        O2.toast(document.body.classList.contains('dilala-mode') ? 'Dilala modu açık 🌸' : 'Dilala modu kapalı', 'heart');
    };

    // ==========================================
    // 📝 EK KAYITLAR (nabız, adım, takviye stoğu)
    // ==========================================
    O2.moreLogsSheet = () => {
        const supp = LS.get('olympus_supp_stock', null) || { whey: 0, creatine: 0, carnitine: 0, electro: 0 };
        const lastOf = (key) => { const h = LS.get(key, []) || []; return h.length ? h[h.length - 1].val : null; };
        O2.sheet('Tüm kayıtlar', `
            <div class="o2-list">
                <div class="o2-row is-tap" onclick="O2.logSheet('weight')"><div class="o2-row-idx" style="color:var(--o2-gold)">${I('scale')}</div><div class="o2-row-main"><h5>Kilo</h5><p>Sabah, aç karnına</p></div>${I('chev', 'chev')}</div>
                <div class="o2-row is-tap" onclick="O2.logSheet('sleep')"><div class="o2-row-idx" style="color:var(--o2-violet)">${I('moon')}</div><div class="o2-row-main"><h5>Uyku</h5><p>${lastOf('olympus_sleep_history') ? `Son: ${lastOf('olympus_sleep_history')} saat` : 'Henüz kayıt yok'}</p></div>${I('chev', 'chev')}</div>
                <div class="o2-row is-tap" onclick="O2.logSheet('kcal')"><div class="o2-row-idx" style="color:var(--o2-orange)">${I('flame')}</div><div class="o2-row-main"><h5>Aktif kalori</h5><p>Saat / telefon verisi</p></div>${I('chev', 'chev')}</div>
                <div class="o2-row is-tap" onclick="O2.logSheet('measure')"><div class="o2-row-idx" style="color:var(--o2-blue)">${I('ruler')}</div><div class="o2-row-main"><h5>Vücut ölçüleri</h5><p>Bel, göğüs, kol…</p></div>${I('chev', 'chev')}</div>
            </div>
            <div class="o2-grid-2" style="margin-top:8px">
                <div class="o2-field"><label>Dinlenik nabız (bpm)</label>${stepper('o2-in-bpm', lastOf('olympus_bpm_history') || 60, 1)}</div>
                <div class="o2-field"><label>Adım</label>${stepper('o2-in-steps', lastOf('olympus_cardio_history') || 8000, 500)}</div>
            </div>
            <div class="o2-field"><label>Takviye stoğu (servis)</label>
                <div class="o2-grid-2">
                    ${[['whey', 'Whey'], ['creatine', 'Kreatin'], ['carnitine', 'Karnitin'], ['electro', 'Elektrolit']].map(([k, l]) => `<div><div style="font-size:12px;font-weight:700;color:var(--o2-text-2);margin-bottom:6px">${l}</div>${stepper('o2-in-supp-' + k, supp[k] || 0, 1)}</div>`).join('')}
                </div>
            </div>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:20px" onclick="O2.saveMoreLogs()">Kaydet</button>`);
    };
    O2.saveMoreLogs = () => {
        const today = O2.trDate();
        const push = (key, val) => {
            if (!val) return;
            const h = LS.get(key, []) || [];
            if (h.length && h[h.length - 1].date === today) h[h.length - 1].val = String(val);
            else h.push({ date: today, val: String(val) });
            LS.set(key, h);
        };
        push('olympus_bpm_history', parseInt($('o2-in-bpm').value));
        push('olympus_cardio_history', parseInt($('o2-in-steps').value));
        const supp = {};
        ['whey', 'creatine', 'carnitine', 'electro'].forEach(k => { supp[k] = String(Math.max(0, parseInt($('o2-in-supp-' + k).value) || 0)); });
        LS.set('olympus_supp_stock', supp);
        O2.closeSheet(); O2.render(); O2.toast('Kayıtlar güncellendi', 'check');
    };

    // Bildirim zili: klasik başlıktaki rozet sayısını yansıtır
    O2.openNotifications = () => {
        if (typeof openNotifications === 'function') openNotifications();
        const b = $('o2-notif-badge');
        if (b) b.classList.add('hidden');
    };
    O2.syncNotifBadge = () => {
        const src = $('notif-badge'), dst = $('o2-notif-badge');
        if (!src || !dst) return;
        const n = src.innerText.trim();
        dst.classList.toggle('hidden', src.style.display === 'none' || !n || n === '0');
        dst.textContent = n;
    };

    // ==========================================
    // 🏠 ANA EKRAN: OLYMPUS TRAINING ↔ SUPER APP
    // ==========================================
    O2.isTrainingHome = () => (localStorage.getItem('olympus_launch_target') || 'training') === 'training';

    // Training "ev" kökünde mi? (geri tuşu burada uygulamadan çıkar)
    O2.isHomeRoot = () => O2.isTrainingHome()
        && !$('oly2-screen').classList.contains('hidden')
        && !O2.isSheetOpen() && !O2.isPlayerOpen() && !(O2.isCardioOpen && O2.isCardioOpen())
        && O2.ui.tab === 'today';

    // Açılış: splash'ten sonra doğrudan Training
    O2.launch = () => {
        $('oly2-screen').classList.remove('hidden');
        $('oly2-screen').classList.add('o2-enter');
        setTimeout(() => $('oly2-screen').classList.remove('o2-enter'), 900);
        O2.ui.tab = 'today';
        O2.open();
    };

    // Hub'daki Training kartından ya da geri tuşuyla Training'e dönüş
    O2.openFromHub = () => {
        const hub = $('hub-screen');
        hub.classList.add('hidden');
        hub.style.display = '';
        $('oly2-screen').classList.remove('hidden');
        O2.open();
    };

    // Ayarlar → Super App: hub'ı Super App bölümünde aç
    O2.openSuperApp = () => {
        O2.closeSheet(true);
        $('oly2-screen').classList.add('hidden');
        const hub = $('hub-screen');
        hub.classList.remove('hidden');
        hub.style.display = 'flex';
        hubPane('super');
        if (typeof updateHubGreeting === 'function') updateHubGreeting();
        if (typeof pushModuleHistory === 'function') pushModuleHistory();
    };

    O2.setLaunchTarget = (target) => {
        localStorage.setItem('olympus_launch_target', target);
        O2.toast(target === 'training' ? 'Uygulama Olympus Training ile açılacak' : 'Uygulama Super App ile açılacak', 'settings');
    };

    // Hub'daki Training kartının canlı özeti
    O2.renderHubTraining = () => {
        const el = $('hub2-training-stats');
        if (!el) return;
        const r = O2.readiness();
        const plan = O2.dayPlan(0);
        const w = O2.weekStats(0);
        const doneToday = O2.sessions().some(s => s.dayKey === O2.dayKey() && s.type !== 'cardio');
        const planName = plan.isRest ? 'Dinlenme günü' : String(plan.title).split(':').pop().trim();
        el.innerHTML = `
            <div><small>Hazırlık</small><strong style="color:${r.tone}">${r.score}</strong></div>
            <div><small>Bugün</small><strong>${doneToday ? '✓ Tamam' : esc(planName)}</strong></div>
            <div><small>Bu hafta</small><strong>${w.sessions}/${O2.settings().weeklyTarget}</strong></div>`;
    };

    // Önceki tasarım: eski Olympus ekranı yedek olarak korunuyor
    O2.openClassic = () => {
        O2.closeSheet(true);
        $('oly2-screen').classList.add('hidden');
        const app = $('app-content');
        app.classList.remove('hidden');
        app.style.display = 'flex';
        if (typeof calculateCurrentDay === 'function') calculateCurrentDay();
    };
})();
