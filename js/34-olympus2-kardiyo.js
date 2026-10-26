// Olympus Training — kardiyo (GPS koşu/yürüyüş/bisiklet), nefes egzersizi, hareket geçmişi, haftalık seri
// Kardiyo seansları da "oly2_sessions" içine type: 'cardio' olarak yazılır; geçmiş, ısı haritası ve haftalık rapor onları da sayar.
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);

    const KINDS = {
        run: { label: 'Koşu', icon: 'run', color: 'var(--o2-orange)', kcalPerKgKm: 1.0, maxSpeed: 9, muscles: ['quads', 'hamstrings', 'calves'] },
        walk: { label: 'Yürüyüş', icon: 'run', color: 'var(--o2-green)', kcalPerKgKm: .5, maxSpeed: 4, muscles: [] },
        ride: { label: 'Bisiklet', icon: 'bolt', color: 'var(--o2-blue)', kcalPerKgKm: .3, maxSpeed: 22, muscles: ['quads'] }
    };

    // ==========================================
    // 📏 YARDIMCILAR
    // ==========================================
    const haversine = (a, b) => {
        const R = 6371000, toRad = d => d * Math.PI / 180;
        const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(h));
    };
    O2.fmtPace = (secPerKm) => {
        if (!secPerKm || !isFinite(secPerKm) || secPerKm > 3600) return '—';
        const m = Math.floor(secPerKm / 60), s = Math.round(secPerKm % 60);
        return `${m}'${String(s).padStart(2, '0')}"`;
    };
    const bodyWeight = () => parseFloat((LS.get('olympus_profile', {}) || {}).w) || 80;

    // ==========================================
    // 🏃 KARDİYO SEÇİMİ
    // ==========================================
    O2.cardioSheet = () => {
        const recent = O2.sessions().filter(s => s.type === 'cardio').slice(-3).reverse();
        O2.sheet('Kardiyo', `
            <p style="margin:0;color:var(--o2-text-2);font-size:13px;line-height:1.55">GPS ile mesafe, tempo ve rota takibi. Ekran açık kalır; kilometre bölümlerin otomatik kaydedilir.</p>
            <div class="o2-grid-3" style="margin-top:16px">
                ${Object.entries(KINDS).map(([k, v]) => `
                <button class="o2-card is-tap o2-cardio-kind" onclick="O2.cardioStart('${k}')">
                    <i style="color:${v.color};background:color-mix(in srgb, ${v.color} 14%, transparent)">${I(v.icon)}</i>
                    <b>${v.label}</b>
                </button>`).join('')}
            </div>
            ${recent.length ? `<div class="o2-section-head" style="margin-top:22px"><h3>Son kardiyolar</h3></div>
            <div class="o2-list">${recent.map(s => `
                <div class="o2-row is-tap" onclick="O2.sessionSheet('${esc(s.id)}')">
                    <div class="o2-row-idx" style="color:${KINDS[s.kind] ? KINDS[s.kind].color : 'var(--o2-gold)'}">${I('run')}</div>
                    <div class="o2-row-main"><h5>${esc(s.title)}</h5><p>${O2.prettyDate(s.dayKey)} · ${O2.fmtClock(s.durationSec)}</p></div>
                    <div class="o2-row-end"><strong>${O2.fmtNum(s.distanceKm, 2)}</strong>km</div>
                </div>`).join('')}</div>` : ''}`);
    };

    // ==========================================
    // 🛰️ CANLI TAKİP
    // ==========================================
    let C = null, watchId = null, ticker = null, map = null, line = null, dot = null, wakeLock = null;

    O2.cardioStart = (kind) => {
        if (!navigator.geolocation) { O2.toast('Bu cihaz konum servisini desteklemiyor', 'run'); return; }
        O2.closeSheet(true);
        C = { id: 'o2c_' + Date.now(), kind, startedAt: Date.now(), movingMs: 0, lastTick: Date.now(), paused: false, distance: 0, route: [], splits: [], lastPoint: null, accuracy: null };
        openLayer();
        watchId = navigator.geolocation.watchPosition(onPosition, onGeoError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
        O2.haptic([30, 60, 30]);
    };

    function onGeoError(err) {
        const msg = err.code === 1 ? 'Konum izni verilmedi. Ayarlardan konum iznini aç.' : 'GPS sinyali bekleniyor…';
        const el = $('o2-cardio-gps');
        if (el) el.textContent = msg;
    }

    function onPosition(pos) {
        if (!C || C.paused) return;
        const p = [pos.coords.latitude, pos.coords.longitude];
        C.accuracy = Math.round(pos.coords.accuracy);
        const gps = $('o2-cardio-gps');
        if (gps) gps.textContent = C.accuracy <= 25 ? `GPS güçlü · ±${C.accuracy} m` : `GPS zayıf · ±${C.accuracy} m`;
        if (pos.coords.accuracy > 35) return; // zayıf ölçümleri yok say
        if (C.lastPoint) {
            const d = haversine(C.lastPoint.p, p);
            const dt = (pos.timestamp - C.lastPoint.t) / 1000;
            if (d < 3) return; // yerinde titreme
            if (dt > 0 && d / dt > KINDS[C.kind].maxSpeed * 1.6) return; // gerçek dışı sıçrama
            const before = C.distance;
            C.distance += d;
            // Kilometre bölümü
            if (Math.floor(C.distance / 1000) > Math.floor(before / 1000)) {
                const km = Math.floor(C.distance / 1000);
                const prevTotal = C.splits.reduce((a, s) => a + s, 0);
                C.splits.push(Math.round(C.movingMs / 1000 - prevTotal));
                O2.haptic([60, 80, 60]);
                O2.toast(`${km}. km · ${O2.fmtPace(C.splits[C.splits.length - 1])}`, 'run');
            }
        }
        C.lastPoint = { p, t: pos.timestamp };
        C.route.push(p);
        if (map) {
            line.addLatLng(p);
            dot.setLatLng(p);
            map.panTo(p, { animate: true });
        }
        renderStats();
    }

    function openLayer() {
        const layer = $('o2-cardio');
        layer.classList.remove('hidden');
        if (O2.markLayer) O2.markLayer();
        const k = KINDS[C.kind];
        layer.innerHTML = `
            <div class="o2-player-top">
                <button class="o2-icon-btn" onclick="O2.cardioFinish()" aria-label="Bitir">${I('close')}</button>
                <div class="o2-player-clock"><strong>${k.label}</strong><small id="o2-cardio-gps">GPS aranıyor…</small></div>
                <span style="width:40px"></span>
            </div>
            <div id="o2-cardio-map" class="o2-cardio-map"></div>
            <div class="o2-cardio-stats">
                <div class="o2-cardio-main"><strong id="o2-c-dist">0,00</strong><small>KİLOMETRE</small></div>
                <div class="o2-grid-3">
                    <div><strong id="o2-c-time">00:00</strong><small>SÜRE</small></div>
                    <div><strong id="o2-c-pace">—</strong><small>${C.kind === 'ride' ? 'HIZ' : 'TEMPO /KM'}</small></div>
                    <div><strong id="o2-c-kcal">0</strong><small>KCAL</small></div>
                </div>
            </div>
            <div class="o2-player-foot" style="grid-template-columns:1fr 1fr">
                <button class="o2-btn o2-btn-ghost" id="o2-c-pause" onclick="O2.cardioTogglePause()">${I('pause')}Duraklat</button>
                <button class="o2-btn o2-btn-gold" onclick="O2.cardioFinish()">${I('check')}Bitir</button>
            </div>`;
        initMap();
        clearInterval(ticker);
        ticker = setInterval(tick, 1000);
        requestWakeLock();
    }

    function initMap() {
        if (typeof L === 'undefined') { $('o2-cardio-map').innerHTML = '<div class="o2-empty">Harita yüklenemedi</div>'; return; }
        map = L.map('o2-cardio-map', { zoomControl: false, attributionControl: true }).setView([39.92, 32.85], 16);
        // Anahtarsız OpenStreetMap katmanı; koyu görünüm CSS filtresiyle (.o2-cardio-map .leaflet-tile-pane)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
        line = L.polyline([], { color: '#e6c374', weight: 5, opacity: .95 }).addTo(map);
        dot = L.circleMarker([39.92, 32.85], { radius: 8, color: '#fff', weight: 3, fillColor: '#e6c374', fillOpacity: 1 }).addTo(map);
        navigator.geolocation.getCurrentPosition(pos => {
            const p = [pos.coords.latitude, pos.coords.longitude];
            if (map) { map.setView(p, 17); dot.setLatLng(p); }
        }, () => { }, { enableHighAccuracy: true, timeout: 10000 });
        setTimeout(() => map && map.invalidateSize(), 300);
    }

    function tick() {
        if (!C) return;
        const now = Date.now();
        if (!C.paused) C.movingMs += now - C.lastTick;
        C.lastTick = now;
        renderStats();
    }

    function renderStats() {
        if (!C || !$('o2-c-dist')) return;
        const km = C.distance / 1000;
        const sec = C.movingMs / 1000;
        $('o2-c-dist').textContent = O2.fmtNum(km, 2);
        $('o2-c-time').textContent = O2.fmtClock(sec);
        $('o2-c-pace').textContent = C.kind === 'ride' ? (km > .05 ? `${O2.fmtNum(km / (sec / 3600), 1)}` : '—') : (km > .05 ? O2.fmtPace(sec / km) : '—');
        $('o2-c-kcal').textContent = O2.fmtNum(km * bodyWeight() * KINDS[C.kind].kcalPerKgKm);
    }

    O2.cardioTogglePause = () => {
        if (!C) return;
        C.paused = !C.paused;
        C.lastTick = Date.now();
        if (!C.paused) C.lastPoint = null; // duraklama sırasında yürünen yolu sayma
        $('o2-c-pause').innerHTML = C.paused ? `${I('play')}Devam et` : `${I('pause')}Duraklat`;
        O2.haptic(20);
    };

    O2.isCardioOpen = () => !$('o2-cardio').classList.contains('hidden');

    O2.cardioFinish = () => {
        if (!C) return closeLayer();
        if (C.distance < 50) {
            if (!confirm('50 metreden kısa bir aktivite kaydedilmez. Kapatılsın mı?')) return;
            return closeLayer();
        }
        if (!confirm('Kardiyo bitirilsin ve kaydedilsin mi?')) return;
        const k = KINDS[C.kind];
        const km = C.distance / 1000;
        const durationSec = Math.round(C.movingMs / 1000);
        const now = new Date();
        // Rotayı en fazla 250 noktaya inceltip sakla
        const step = Math.max(1, Math.ceil(C.route.length / 250));
        const route = C.route.filter((_, i) => i % step === 0 || i === C.route.length - 1).map(([a, b]) => [+a.toFixed(5), +b.toFixed(5)]);
        const rec = {
            id: C.id, type: 'cardio', kind: C.kind, title: k.label,
            dayKey: O2.dayKey(now), startedAt: C.startedAt, endedAt: now.getTime(),
            durationSec, distanceKm: +km.toFixed(3), paceSec: km ? Math.round(durationSec / km) : null,
            splits: C.splits, route, kcal: Math.round(km * bodyWeight() * k.kcalPerKgKm),
            volume: 0, setCount: 0, muscles: k.muscles, prs: [], exercises: []
        };
        O2.saveSessions([...O2.sessions(), rec]);
        // Klasik ekranın kardiyo geçmişiyle uyum
        const past = LS.get('olympus_past_workouts', []) || [];
        past.push({ id: rec.id, date: O2.trDate(now), time: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }), title: `${k.label}`, duration: `${O2.fmtNum(km, 2)} km | ${O2.fmtClock(durationSec)}` });
        LS.set('olympus_past_workouts', past);
        O2.cloudSave();
        if (typeof window.addOlympusPoints === 'function') window.addOlympusPoints(Math.round(50 + km * 20), 'Kardiyo');
        closeLayer();
        if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80, origin: { y: .3 }, colors: ['#f6dea0', '#e6c374', '#ffffff'] });
        O2.render();
        O2.sessionSheet(rec.id);
    };

    function closeLayer() {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        watchId = null;
        clearInterval(ticker);
        if (map) { map.remove(); map = null; }
        if (wakeLock) { wakeLock.release().catch(() => { }); wakeLock = null; }
        C = null;
        $('o2-cardio').classList.add('hidden');
        $('o2-cardio').innerHTML = '';
    }

    async function requestWakeLock() {
        try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { }
    }

    // Seans detayında kardiyo haritası
    O2.cardioDetail = (s) => {
        const k = KINDS[s.kind] || KINDS.run;
        setTimeout(() => {
            const el = $('o2-cardio-mini');
            if (!el || typeof L === 'undefined' || !s.route || s.route.length < 2) return;
            const m = L.map(el, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
            const pl = L.polyline(s.route, { color: '#e6c374', weight: 4 }).addTo(m);
            m.fitBounds(pl.getBounds(), { padding: [18, 18] });
        }, 350);
        return `
            ${s.route && s.route.length > 1 ? '<div id="o2-cardio-mini" class="o2-cardio-mini"></div>' : ''}
            <div class="o2-grid-3" style="margin-top:12px">
                <div class="o2-card o2-stat"><small>Mesafe</small><strong>${O2.fmtNum(s.distanceKm, 2)}<small> km</small></strong></div>
                <div class="o2-card o2-stat"><small>Süre</small><strong>${O2.fmtClock(s.durationSec)}</strong></div>
                <div class="o2-card o2-stat"><small>${s.kind === 'ride' ? 'Ort. hız' : 'Tempo'}</small><strong>${s.kind === 'ride' ? `${O2.fmtNum(s.distanceKm / (s.durationSec / 3600), 1)}<small> km/s</small>` : O2.fmtPace(s.paceSec)}</strong></div>
            </div>
            ${s.splits && s.splits.length ? `<div class="o2-section-head"><h3>Kilometre bölümleri</h3></div>
            <div class="o2-list">${s.splits.map((sec, i) => {
                const best = Math.min(...s.splits);
                return `<div class="o2-row"><div class="o2-row-idx">${i + 1}</div><div class="o2-row-main"><div class="o2-bar" style="height:7px"><i style="width:${Math.round(best / sec * 100)}%;background:${sec === best ? 'var(--o2-gold-grad)' : k.color}"></i></div></div><div class="o2-row-end"><strong>${O2.fmtPace(sec)}</strong></div></div>`;
            }).join('')}</div>` : ''}
            <p style="margin:14px 0 0;font-size:12px;color:var(--o2-text-3)">${O2.fmtNum(s.kcal)} kcal · ${O2.prettyDate(s.dayKey)}</p>`;
    };

    // ==========================================
    // 🫁 NEFES (4-7-8)
    // ==========================================
    let breathTimer = null;
    O2.breathe = () => {
        const layer = $('o2-cardio');
        layer.classList.remove('hidden');
        if (O2.markLayer) O2.markLayer();
        layer.innerHTML = `
            <div class="o2-player-top">
                <button class="o2-icon-btn" onclick="O2.breatheStop()" aria-label="Kapat">${I('close')}</button>
                <div class="o2-player-clock"><strong>Nefes</strong><small>4 · 7 · 8 TEKNİĞİ</small></div>
                <span style="width:40px"></span>
            </div>
            <div class="o2-breath">
                <div class="o2-breath-orb" id="o2-breath-orb"><span id="o2-breath-count">4</span></div>
                <h2 id="o2-breath-label">Hazırlan</h2>
                <p id="o2-breath-round">4 tur · yaklaşık 1,5 dakika</p>
            </div>`;
        const phases = [['Nefes al', 4, 'in'], ['Tut', 7, 'hold'], ['Ver', 8, 'out']];
        let round = 0, pi = 0, left = phases[0][1];
        const orb = $('o2-breath-orb');
        const apply = () => {
            const [label, , cls] = phases[pi];
            $('o2-breath-label').textContent = label;
            $('o2-breath-round').textContent = `Tur ${round + 1} / 4`;
            orb.className = 'o2-breath-orb ' + cls;
            orb.style.transitionDuration = `${phases[pi][1]}s`;
            O2.haptic(cls === 'hold' ? 10 : 25);
        };
        setTimeout(apply, 600);
        clearInterval(breathTimer);
        breathTimer = setInterval(() => {
            const cnt = $('o2-breath-count');
            if (!cnt) return clearInterval(breathTimer);
            cnt.textContent = left;
            left--;
            if (left < 0) {
                pi = (pi + 1) % 3;
                if (pi === 0) round++;
                if (round >= 4) {
                    clearInterval(breathTimer);
                    $('o2-breath-label').textContent = 'Tamamlandı';
                    $('o2-breath-round').textContent = 'Sinir sistemin sakinleşti. Güzel iş.';
                    orb.className = 'o2-breath-orb done';
                    cnt.textContent = '✓';
                    return;
                }
                left = phases[pi][1];
                apply();
            }
        }, 1000);
    };
    O2.breatheStop = () => {
        clearInterval(breathTimer);
        $('o2-cardio').classList.add('hidden');
        $('o2-cardio').innerHTML = '';
    };
    O2.isBreathOpen = () => !!$('o2-breath-orb');

    // ==========================================
    // 📈 HAREKET GEÇMİŞİ (1RM trendi)
    // ==========================================
    O2.exerciseHistory = (name) => {
        const rows = [];
        O2.sessions().forEach(s => (s.exercises || []).forEach(e => {
            if (e.name !== name || !e.sets.length) return;
            const top = e.sets.reduce((a, st) => (O2.e1rm(st.w, st.r) > O2.e1rm(a.w, a.r) ? st : a), e.sets[0]);
            rows.push({ date: s.dayKey, e1rm: Math.round(O2.e1rm(top.w, top.r) * 10) / 10, top, sets: e.sets, volume: e.sets.reduce((a, st) => a + st.w * st.r, 0) });
        }));
        return rows;
    };

    O2.drawExerciseChart = (name, canvasId) => {
        const el = $(canvasId);
        const rows = O2.exerciseHistory(name).slice(-16);
        if (!el || typeof Chart === 'undefined' || rows.length < 2) return;
        const ctx = el.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, 160);
        g.addColorStop(0, 'rgba(230,195,116,.35)'); g.addColorStop(1, 'rgba(230,195,116,0)');
        O2.ui.charts.push(new Chart(ctx, {
            type: 'line',
            data: { labels: rows.map(r => O2.prettyDate(r.date)), datasets: [{ data: rows.map(r => r.e1rm), borderColor: '#e6c374', backgroundColor: g, fill: true, tension: .35, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#e6c374' }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: c => `1RM ${c.parsed.y} kg` } } },
                scales: { x: { grid: { display: false }, ticks: { color: '#63636e', font: { size: 10, weight: 'bold' }, maxRotation: 0, autoSkipPadding: 12 } }, y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#63636e', font: { size: 10, weight: 'bold' }, maxTicksLimit: 4 } } }
            }
        }));
    };

    O2.exerciseHistoryHTML = (name) => {
        const rows = O2.exerciseHistory(name);
        if (!rows.length) return '';
        return `
            <div class="o2-section-head" style="margin-top:22px"><h3>Gelişim</h3><span class="o2-link" style="color:var(--o2-text-3)">${rows.length} seans</span></div>
            ${rows.length >= 2 ? `<div class="o2-card" style="padding:12px"><div class="o2-chart" style="height:160px;margin:0"><canvas id="o2-ex-chart"></canvas></div></div>` : ''}
            <div class="o2-list" style="margin-top:6px">${rows.slice().reverse().slice(0, 6).map(r => `
                <div class="o2-row"><div class="o2-row-main"><h5>${O2.prettyDate(r.date)}</h5><p>${r.sets.map(st => `${O2.fmtNum(st.w, 1)}×${st.r}`).join(' · ')}</p></div><div class="o2-row-end"><strong>${O2.fmtNum(r.e1rm, 1)}</strong>1RM</div></div>`).join('')}</div>`;
    };

    // ==========================================
    // 🔥 HAFTALIK SERİ
    // ==========================================
    // Haftalık hedefe üst üste kaç hafta ulaşıldı (içinde bulunulan hafta hedefe ulaştıysa o da sayılır)
    O2.weekStreak = () => {
        const target = O2.settings().weeklyTarget;
        let streak = 0;
        if (O2.weekStats(0).sessions >= target) streak++;
        for (let i = 1; i < 104; i++) {
            if (O2.weekStats(i).sessions >= target) streak++;
            else break;
        }
        return streak;
    };
})();
