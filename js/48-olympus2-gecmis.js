// Antrenman erteleme ve ayrıntılı seans geçmişi
// Erteleme: oly2_postponed = ertelenen günlerin dayKey listesi. O gün dinlenmeye döner, program o günden itibaren bir gün kayar.
// Seans detayı: koşuda km'ye göre renklenen etkileşimli harita, güç antrenmanında set tablosu, kas dağılımı ve önceki seansla kıyas.
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);
    const KEY = 'oly2_postponed';
    const DAY_MS = 864e5;

    // ==========================================
    // ⏭️ ERTELEME
    // ==========================================
    O2.postponed = () => LS.get(KEY, []) || [];
    const dateAt = (offset) => O2.addDays(O2.startOfDay(), offset);

    // Ertelenen her gün, sonraki günlerin program indeksini bir geri çeker
    O2.dayIndex = (offset = 0, length = 7) => {
        const start = O2.startOfDay(O2.parseDate(LS.raw('olympus_start_date', O2.dayKey())) || new Date());
        const target = dateAt(offset);
        const sKey = O2.dayKey(start), tKey = O2.dayKey(target);
        const skipped = O2.postponed().filter(k => k >= sKey && k < tKey).length;
        const diff = Math.max(0, Math.round((target - start) / DAY_MS) - skipped);
        return diff % length;
    };

    const baseDayPlan = O2.dayPlan;
    O2.dayPlan = (offset = 0, program) => {
        const p = baseDayPlan(offset, program);
        if (!O2.postponed().includes(O2.dayKey(dateAt(offset)))) return p;
        const next = baseDayPlan(offset + 1, program);
        const name = String(next.title || 'Antrenman').split(':').pop().trim();
        return { ...p, title: `Ertelendi · ${name} yarın`, ex: [], rest: true, isRest: true, postponed: true };
    };

    const doneOn = (key) => O2.activityDays().has(key);
    O2.postponeDay = (offset = 0) => {
        const key = O2.dayKey(dateAt(offset));
        const plan = O2.dayPlan(offset);
        if (plan.isRest) { O2.toast('Bu gün zaten dinlenme günü', 'clock'); return; }
        if (doneOn(key)) { O2.toast('Bu günün antrenmanı yapılmış', 'check'); return; }
        const name = String(plan.title || '').split(':').pop().trim();
        LS.set(KEY, [...O2.postponed().filter(k => k >= O2.dayKey(dateAt(-60))), key].sort());
        O2.haptic([10, 40, 10]);
        O2.toast(offset < 0 ? `${name} bugüne alındı` : `${name} yarına ertelendi · program bir gün kaydı`, 'clock');
        if (O2.refreshNotifications) O2.refreshNotifications();
        O2.render();
    };
    O2.undoPostpone = (offset = 0) => {
        const key = O2.dayKey(dateAt(offset));
        LS.set(KEY, O2.postponed().filter(k => k !== key));
        O2.toast('Erteleme geri alındı', 'check');
        if (O2.refreshNotifications) O2.refreshNotifications();
        O2.render();
    };

    // Bugün ekranı: dün yapılmayan antrenmanı bugüne kaydırma önerisi
    O2.missedCard = () => {
        const yKey = O2.dayKey(dateAt(-1)), today = O2.dayKey();
        const startKey = LS.raw('olympus_start_date', today);
        if (yKey < startKey || doneOn(yKey) || doneOn(today) || LS.raw('oly2_missed_seen', '') === yKey) return '';
        const y = O2.dayPlan(-1);
        if (y.isRest) return '';
        const t = O2.dayPlan(0);
        const name = String(y.title || '').split(':').pop().trim();
        return `
        <div class="o2-card o2-missed">
            <div class="o2-coach">
                <div class="o2-coach-orb" style="background:rgba(255,122,69,.14);color:var(--o2-orange)">${I('clock')}</div>
                <div style="flex:1"><h4>Dün: ${esc(name)} yapılmadı</h4><p>Bugüne alırsan program bir gün kayar${t.isRest ? '' : `; bugünkü ${esc(String(t.title).split(':').pop().trim())} yarına geçer`}.</p></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:12px">
                <button class="o2-btn o2-btn-gold o2-btn-sm" onclick="O2.postponeDay(-1)">${I('play')}Bugüne al</button>
                <button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.dismissMissed()">Atla</button>
            </div>
        </div>`;
    };
    O2.dismissMissed = () => { localStorage.setItem('oly2_missed_seen', O2.dayKey(dateAt(-1))); O2.render(); };

    // ==========================================
    // 🗺️ ROTA YARDIMCILARI
    // ==========================================
    const hav = (a, b) => {
        const R = 6371000, r = Math.PI / 180;
        const dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
        const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(x));
    };
    // Rotayı kilometre parçalarına böler: [[nokta...], ...]
    function kmChunks(route) {
        const out = [[route[0]]];
        let cum = 0;
        for (let i = 1; i < route.length; i++) {
            cum += hav(route[i - 1], route[i]);
            const k = Math.floor(cum / 1000);
            while (out.length <= k) out.push([route[i - 1]]);
            out[k].push(route[i]);
        }
        return out.filter(c => c.length > 1);
    }
    // Hıza göre renk: en hızlı km yeşil, en yavaş turuncu
    const paceColor = (sec, splits) => {
        if (!sec || !splits.length) return '#e6c374';
        const lo = Math.min(...splits), hi = Math.max(...splits);
        const t = hi === lo ? .5 : (sec - lo) / (hi - lo);
        return `hsl(${Math.round(150 - t * 130)}, 75%, 58%)`;
    };

    // Liste satırı için küçük rota çizimi
    O2.routeSVG = (route, size = 44) => {
        if (!route || route.length < 2) return '';
        const lats = route.map(p => p[0]), lngs = route.map(p => p[1]);
        const la0 = Math.min(...lats), la1 = Math.max(...lats), ln0 = Math.min(...lngs), ln1 = Math.max(...lngs);
        const k = Math.cos(((la0 + la1) / 2) * Math.PI / 180);
        const w = (ln1 - ln0) * k || 1e-6, h = (la1 - la0) || 1e-6, sc = (size - 8) / Math.max(w, h);
        const pts = route.map(([la, ln]) => `${(4 + ((ln - ln0) * k) * sc + (size - 8 - w * sc) / 2).toFixed(1)},${(4 + (la1 - la) * sc + (size - 8 - h * sc) / 2).toFixed(1)}`).join(' ');
        return `<svg class="o2-route-thumb" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><polyline points="${pts}" fill="none" stroke="var(--o2-gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    };

    let detailMap = null;
    function drawRoute(s) {
        const el = $('o2-route-map');
        if (!el || typeof L === 'undefined') return;
        if (detailMap) { try { detailMap.remove(); } catch (e) { } }
        detailMap = L.map(el, { zoomControl: false, attributionControl: true });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(detailMap);
        const splits = s.splits || [];
        const chunks = kmChunks(s.route);
        chunks.forEach((c, i) => L.polyline(c, { color: paceColor(splits[i], splits), weight: 5, opacity: .95, lineCap: 'round' }).addTo(detailMap));
        // Kilometre işaretleri
        chunks.slice(1).forEach((c, i) => L.marker(c[0], { icon: L.divIcon({ className: 'o2-km-pin', html: `<span>${i + 1}</span>`, iconSize: [20, 20] }) }).addTo(detailMap));
        const dot = (p, cls) => L.marker(p, { icon: L.divIcon({ className: `o2-route-dot ${cls}`, iconSize: [14, 14] }) }).addTo(detailMap);
        dot(s.route[0], 'start'); dot(s.route[s.route.length - 1], 'end');
        detailMap.fitBounds(L.latLngBounds(s.route), { padding: [24, 24] });
    }
    O2.routeFullscreen = () => {
        const el = $('o2-route-map');
        if (!el) return;
        el.classList.toggle('big');
        setTimeout(() => detailMap && detailMap.invalidateSize(), 320);
    };

    // ==========================================
    // 📋 SEANS DETAYI
    // ==========================================
    const timeRange = (s) => {
        const f = (t) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const d = new Date(s.startedAt || s.endedAt);
        return `${d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}${s.startedAt ? ` · ${f(s.startedAt)}–${f(s.endedAt)}` : ''}`;
    };
    const stat = (label, value) => `<div class="o2-card o2-stat"><small>${label}</small><strong style="font-size:19px">${value}</strong></div>`;
    const prevOf = (s, fn) => O2.sessions().filter(x => x.id !== s.id && x.endedAt < s.endedAt && fn(x)).pop();
    const delta = (v, unit, lowerBetter = false, fmt = (x) => O2.fmtNum(Math.abs(x), 1)) => {
        if (!v) return '<span class="o2-delta">aynı</span>';
        const good = lowerBetter ? v < 0 : v > 0;
        return `<span class="o2-delta ${good ? 'up' : 'down'}">${v > 0 ? '+' : '−'}${fmt(v)}${unit}</span>`;
    };
    const footer = (s) => `
        ${s.note ? `<div class="o2-field" style="margin-top:14px"><label>Not</label><p style="margin:0;color:var(--o2-text-2);font-size:13px;line-height:1.5">${esc(s.note)}</p></div>` : ''}
        <button class="o2-btn o2-btn-ghost o2-btn-block" style="margin-top:16px" onclick="O2.shareCard('${esc(s.id)}')">${I('camera')}Paylaşım kartı oluştur</button>`;

    function cardioHTML(s) {
        const splits = s.splits || [];
        const best = splits.length ? Math.min(...splits) : null;
        const prev = prevOf(s, x => x.type === 'cardio' && x.kind === s.kind && x.paceSec);
        const ride = s.kind === 'ride';
        const hasRoute = s.route && s.route.length > 1;
        return `
            <p class="o2-detail-when">${esc(timeRange(s))}</p>
            ${hasRoute ? `
            <div class="o2-route-wrap">
                <div id="o2-route-map" class="o2-cardio-mini o2-route-map"></div>
                <button class="o2-route-full" onclick="O2.routeFullscreen()" aria-label="Haritayı büyüt">${I('plus')}</button>
                ${splits.length > 1 ? '<div class="o2-route-legend"><i></i>hızlı<b></b>yavaş</div>' : ''}
            </div>` : `<div class="o2-card o2-empty" style="padding:22px">${I('run')}<br>Bu seansta GPS rotası kaydedilmedi.</div>`}
            <div class="o2-grid-3" style="margin-top:12px">
                ${stat('Mesafe', `${O2.fmtNum(s.distanceKm, 2)}<small> km</small>`)}
                ${stat('Süre', O2.fmtClock(s.durationSec))}
                ${stat(ride ? 'Ort. hız' : 'Tempo', ride ? `${O2.fmtNum(s.distanceKm / (s.durationSec / 3600), 1)}<small> km/s</small>` : `${O2.fmtPace(s.paceSec)}<small>/km</small>`)}
            </div>
            <div class="o2-grid-3">
                ${stat('Kalori', `${O2.fmtNum(s.kcal)}<small> kcal</small>`)}
                ${stat('En hızlı km', best ? O2.fmtPace(best) : '—')}
                ${stat(ride ? 'Tempo' : 'Ort. hız', ride ? O2.fmtPace(s.paceSec) : `${O2.fmtNum(s.distanceKm / Math.max(1, s.durationSec) * 3600, 1)}<small> km/s</small>`)}
            </div>
            ${prev ? `<div class="o2-insight">${I('spark')}<span>Önceki ${esc(String(s.title).toLowerCase())} (${esc(O2.prettyDate(prev.dayKey))}): ${O2.fmtPace(prev.paceSec)}/km, ${O2.fmtNum(prev.distanceKm, 2)} km. Tempo ${delta(s.paceSec - prev.paceSec, ' sn/km', true, (x) => Math.round(Math.abs(x)))} · mesafe ${delta(+(s.distanceKm - prev.distanceKm).toFixed(2), ' km', false, (x) => O2.fmtNum(Math.abs(x), 2))}</span></div>` : ''}
            ${splits.length ? `<div class="o2-section-head"><h3>Kilometre bölümleri</h3></div>
            <div class="o2-list">${splits.map((sec, i) => `
                <div class="o2-row"><div class="o2-row-idx">${i + 1}</div>
                    <div class="o2-row-main"><div class="o2-bar" style="height:8px"><i style="width:${Math.round(best / sec * 100)}%;background:${paceColor(sec, splits)}"></i></div></div>
                    <div class="o2-row-end"><strong>${O2.fmtPace(sec)}</strong>${i ? `<span class="o2-ex-best">${sec <= splits[i - 1] ? '▲' : '▼'} ${Math.abs(Math.round(sec - splits[i - 1]))} sn</span>` : ''}</div>
                </div>`).join('')}</div>` : ''}
            ${footer(s)}`;
    }

    const FRONT = ['chest', 'shoulders', 'biceps', 'core', 'quads'];
    function strengthHTML(s) {
        const exs = (s.exercises || []).filter(e => e.sets && e.sets.length);
        const reps = exs.reduce((a, e) => a + e.sets.reduce((b, x) => b + (+x.r || 0), 0), 0);
        const prev = prevOf(s, x => x.type !== 'cardio' && x.title === s.title);
        // Kas grubu başına hacim
        const byMuscle = {};
        exs.forEach(e => { const m = O2.muscleOf(e.name); byMuscle[m] = (byMuscle[m] || 0) + e.sets.reduce((a, x) => a + (+x.w || 0) * (+x.r || 0), 0); });
        const muscles = Object.entries(byMuscle).sort((a, b) => b[1] - a[1]);
        const maxM = muscles.length ? muscles[0][1] || 1 : 1;
        const worked = new Set(s.muscles && s.muscles.length ? s.muscles : Object.keys(byMuscle));
        const fill = (m) => worked.has(m) ? 'url(#o2FigGold)' : '#24242c';
        const stars = s.rating ? '★'.repeat(s.rating) + '☆'.repeat(Math.max(0, 5 - s.rating)) : '';

        const exCard = (e) => {
            const vol = e.sets.reduce((a, x) => a + (+x.w || 0) * (+x.r || 0), 0);
            const top = e.sets.reduce((b, x) => O2.e1rm(x.w, x.r) > O2.e1rm(b.w, b.r) ? x : b, e.sets[0]);
            const before = prevOf(s, x => (x.exercises || []).some(y => y.name === e.name && y.sets && y.sets.length));
            const pe = before && before.exercises.find(y => y.name === e.name);
            const pTop = pe && Math.max(...pe.sets.map(x => O2.e1rm(x.w, x.r)));
            const pr = (s.prs || []).some(p => p.ex === e.name);
            return `
            <div class="o2-card o2-ex-detail">
                <div class="o2-ex-detail-head">
                    <div><h5>${esc(e.name)}</h5><p>${O2.MUSCLES[O2.muscleOf(e.name)]} · ${e.sets.length} set · ${O2.fmtNum(vol)} kg hacim</p></div>
                    ${pr ? '<span class="o2-chip gold">PR</span>' : ''}
                </div>
                <div class="o2-set-table">
                    <div><b>Set</b><b>Kg</b><b>Tekrar</b><b>RPE</b><b>1RM</b></div>
                    ${e.sets.map((x, i) => `<div class="${x === top ? 'top' : ''}"><span>${i + 1}</span><span>${O2.fmtNum(x.w, 1)}</span><span>${x.r}</span><span>${x.rpe || '—'}</span><span>${O2.fmtNum(O2.e1rm(x.w, x.r), 1)}</span></div>`).join('')}
                </div>
                <p class="o2-ex-detail-foot">${pTop ? `Önceki (${esc(O2.prettyDate(before.dayKey))}): en iyi 1RM ${O2.fmtNum(pTop, 1)} kg → ${delta(+(O2.e1rm(top.w, top.r) - pTop).toFixed(1), ' kg')}` : 'Bu hareketi ilk kez kaydettin.'}</p>
            </div>`;
        };

        return `
            <p class="o2-detail-when">${esc(timeRange(s))}${stars ? ` · <span style="color:var(--o2-gold)">${stars}</span>` : ''}</p>
            <div class="o2-grid-2 o2-detail-top">
                <div class="o2-detail-figs">
                    <div>${O2.figure('front', fill)}</div>
                    <div>${O2.figure('back', fill)}</div>
                </div>
                <div class="o2-detail-muscles">${muscles.slice(0, 6).map(([m, v]) => `
                    <div><span>${O2.MUSCLES[m]}</span><div class="o2-bar"><i style="width:${Math.round(v / maxM * 100)}%;background:${FRONT.includes(m) ? 'var(--o2-gold-grad)' : 'var(--o2-blue)'}"></i></div></div>`).join('') || '<p style="font-size:12px;color:var(--o2-text-3)">Kas verisi yok</p>'}</div>
            </div>
            <div class="o2-grid-3" style="margin-top:12px">
                ${stat('Süre', O2.fmtClock(s.durationSec))}
                ${stat('Hacim', `${O2.fmtNum(s.volume)}<small> kg</small>`)}
                ${stat('Set · tekrar', `${s.setCount}<small> · ${reps}</small>`)}
            </div>
            ${prev ? `<div class="o2-insight">${I('spark')}<span>Önceki ${esc(String(s.title).split(':').pop().trim())} (${esc(O2.prettyDate(prev.dayKey))}) ile: hacim ${delta(s.volume - prev.volume, ' kg', false, (x) => O2.fmtNum(Math.abs(x)))} · süre ${delta(Math.round((s.durationSec - prev.durationSec) / 60), ' dk', true, (x) => Math.abs(x))}</span></div>` : ''}
            ${(s.prs || []).length ? `<div class="o2-insight" style="border-color:rgba(230,195,116,.35)">${I('trophy')}<span><b>${s.prs.length} kişisel rekor:</b> ${s.prs.map(p => esc(p.ex)).join(', ')}</span></div>` : ''}
            <div class="o2-section-head"><h3>Hareketler</h3><span class="o2-link" style="color:var(--o2-text-3)">${exs.length} hareket</span></div>
            ${exs.map(exCard).join('') || '<div class="o2-card o2-empty">Set kaydı yok.</div>'}
            ${footer(s)}`;
    }

    O2.sessionSheet = (id) => {
        const s = O2.sessions().find(x => x.id === id);
        if (!s) return;
        const cardio = s.type === 'cardio';
        O2.sheet(String(s.title).split(':').pop().trim(), cardio ? cardioHTML(s) : strengthHTML(s));
        if (cardio && s.route && s.route.length > 1) setTimeout(() => drawRoute(s), 380);
    };
})();
