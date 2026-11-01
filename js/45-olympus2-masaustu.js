// Olympus Training — masaüstü (PC) deneyimi
// Geniş ekranda sol kenar menü (CSS), ortada içerik ve sağda canlı "Günün paneli": hazırlık, akış, hızlı kayıt, uyarılar, Akademi.
// Klavye kısayolları: 1-4 sekmeler · F akış · A akademi · P profil · N yeni blok (Akış) · B antrenmana başla · Esc geri.
(function () {
    const O2 = window.O2 = window.O2 || {};
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);
    const wide = () => window.matchMedia('(min-width: 1280px)').matches;

    function sideHTML() {
        const now = new Date();
        const r = O2.readiness();
        const flow = O2.flowDayInfo ? O2.flowDayInfo(now) : { blocks: [], done: 0, total: 0 };
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const upcoming = flow.blocks.filter(b => b.end > nowMin).slice(0, 5);
        const w = O2.water();
        const wk = O2.weekStats(0), target = O2.settings().weeklyTarget;
        const acad = O2.academySummary ? O2.academySummary() : null;
        const next = acad && acad.dates.slice().sort((a, b) => a.left - b.left)[0];
        return `
            <div class="o2-side-head">
                <div class="o2-eyebrow">${esc(now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
                <h3>${esc(O2.greeting())}, ${esc(O2.userName())}</h3>
            </div>

            <div class="o2-side-card o2-side-ready">
                ${O2.ring({ pct: r.score / 100, size: 74, stroke: 7, center: `<strong>${r.score}</strong>` })}
                <div><small>Hazırlık</small><b style="color:${r.tone}">${esc(r.label)}</b><p>${wk.sessions}/${target} seans bu hafta</p></div>
            </div>

            <div class="o2-side-title"><span>Akış</span><button class="o2-link" onclick="O2.go('flow')">${flow.done}/${flow.total} →</button></div>
            <div class="o2-side-card" style="padding:6px 12px">${upcoming.length ? upcoming.map(b => {
                const active = b.start <= nowMin && nowMin < b.end;
                return `<div class="o2-side-block ${active ? 'active' : ''} ${b.done ? 'done' : ''}" style="--c:${b.color}">
                    <b>${esc(b.time)}</b><span>${esc(b.title)}${active ? `<em>${b.end - nowMin} dk kaldı</em>` : ''}</span>
                    <button class="o2-check ${b.done ? 'on' : ''}" onclick="O2.flowMarkDone('${b.id}'); O2.renderSide()" aria-label="Tamamla">${I('check')}</button>
                </div>`;
            }).join('') : `<p class="o2-side-empty">Bugünün blokları bitti. ${flow.total ? '👑' : '<a onclick="O2.go(\'flow\')">Akışını planla</a>'}</p>`}</div>

            <div class="o2-side-title"><span>Hızlı kayıt</span></div>
            <div class="o2-side-quick">
                <button onclick="O2.quickWater(); O2.renderSide()"><i style="color:var(--o2-blue)">${I('drop')}</i><b>${O2.fmtNum(w.amount / 1000, 1)} L</b><small>+250 ml</small></button>
                <button onclick="O2.logSheet('weight')"><i style="color:var(--o2-gold)">${I('scale')}</i><b>Kilo</b><small>kaydet</small></button>
                <button onclick="O2.logSheet('sleep')"><i style="color:var(--o2-violet)">${I('moon')}</i><b>Uyku</b><small>kaydet</small></button>
                <button onclick="O2.go('fuel'); O2.foodSheet && O2.foodSheet(O2.dayKey())"><i style="color:var(--o2-green)">${I('fuel')}</i><b>Besin</b><small>ekle</small></button>
            </div>

            ${O2.alertsHTML ? (() => { const h = O2.alertsHTML(4); return h ? `<div class="o2-side-title"><span>Uyarılar</span></div>${h}` : ''; })() : ''}

            ${acad ? `
            <div class="o2-side-title"><span>Akademi</span><button class="o2-link" onclick="O2.go('academy')">Aç →</button></div>
            <div class="o2-side-card o2-side-acad" style="--acad:${acad.color}" onclick="O2.go('academy')">
                <b>${esc(acad.branch)} · ${esc(acad.track)}</b>
                <span>${next ? `${esc(next.label)}: <strong>${next.left === 0 ? 'bugün' : next.left + ' gün'}</strong>` : 'Sınav tarihlerini ekle'}</span>
                <div class="o2-bar" style="margin-top:8px"><i style="width:${acad.score}%;background:${acad.color}"></i></div>
                <small>Hazırlık ${acad.score}/100 · ${acad.known}/${acad.qTotal} soru</small>
            </div>` : ''}`;
    }

    O2.renderSide = () => {
        const el = $('o2-side');
        if (!el || !wide() || $('oly2-screen').classList.contains('hidden')) return;
        try { el.innerHTML = sideHTML(); } catch (e) { console.warn('Masaüstü paneli çizilemedi:', e); }
        el.querySelectorAll('.o2-ring-bar').forEach(bar => { const off = bar.getAttribute('data-off'); if (off !== null) bar.setAttribute('stroke-dashoffset', off); });
    };

    // Her ekran çiziminde paneli tazele
    const baseRender = O2.render;
    O2.render = function () {
        const res = baseRender.apply(this, arguments);
        O2.renderSide();
        return res;
    };
    setInterval(() => { if (!document.hidden) O2.renderSide(); }, 60 * 1000);
    window.addEventListener('resize', () => { clearTimeout(O2._sideT); O2._sideT = setTimeout(O2.renderSide, 200); });

    // ==========================================
    // ⌨️ KLAVYE KISAYOLLARI
    // ==========================================
    document.addEventListener('keydown', (e) => {
        const screen = $('oly2-screen');
        if (!screen || screen.classList.contains('hidden') || e.ctrlKey || e.metaKey || e.altKey) return;
        const tag = (e.target && e.target.tagName) || '';
        if (e.key === 'Escape') { if (O2.back) O2.back(); return; }
        if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
        if ((O2.isPlayerOpen && O2.isPlayerOpen()) || O2.isSheetOpen()) return;
        const map = { '1': 'today', '2': 'train', '3': 'fuel', '4': 'progress', f: 'flow', a: 'academy', p: 'profile' };
        const k = e.key.toLowerCase();
        if (map[k]) { e.preventDefault(); O2.go(map[k]); }
        else if (k === 'b') { e.preventDefault(); O2.orb(); }
        else if (k === 'n' && O2.ui.tab === 'flow') { e.preventDefault(); O2.flowBlockSheet(); }
    });
})();
