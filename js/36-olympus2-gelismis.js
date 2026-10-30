// Olympus Training — gelişmiş özellikler: hacim dengesi, güç standartları, hedef kilo tahmini, paylaşım kartı,
// sesli koç, online besin arama & barkod, meydan okumalar, hatırlatıcılar, uygulama kısayolları, uyku/nabız trendi
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);
    const bodyWeight = () => parseFloat((LS.get('olympus_profile', {}) || {}).w) || null;

    // ==========================================
    // ⚖️ HACİM DENGESİ: kas başına haftalık set (son 7 gün)
    // ==========================================
    // Bilimsel öneri: kas başına haftada ~10-20 çalışma seti
    const SET_TARGET = { min: 10, max: 20 };
    O2.weeklySetsByMuscle = () => {
        const since = Date.now() - 7 * 864e5;
        const out = {};
        Object.keys(O2.MUSCLES).forEach(m => { out[m] = 0; });
        O2.sessions().filter(s => s.endedAt >= since && s.type !== 'cardio').forEach(s => (s.exercises || []).forEach(e => {
            const m = e.muscle || O2.muscleOf(e.name);
            out[m] = (out[m] || 0) + (e.sets || []).length;
        }));
        return out;
    };
    O2.muscleBalanceHTML = () => {
        const sets = O2.weeklySetsByMuscle();
        const total = Object.values(sets).reduce((a, b) => a + b, 0);
        if (!total) return `<div class="o2-card o2-empty">${I('train')}<br>Son 7 günde ağırlık seansı yok. Seans kaydettikçe kas başına haftalık set dağılımın burada görünür.</div>`;
        const max = Math.max(SET_TARGET.max + 4, ...Object.values(sets));
        const under = Object.entries(sets).filter(([m, v]) => v < SET_TARGET.min && m !== 'core').map(([m]) => O2.MUSCLES[m]);
        return `
        <div class="o2-card">
            <div class="o2-balance">${Object.entries(sets).map(([m, v]) => {
                const tone = v === 0 ? 'var(--o2-text-3)' : v < SET_TARGET.min ? 'var(--o2-orange)' : v > SET_TARGET.max ? 'var(--o2-violet)' : 'var(--o2-green)';
                return `<div class="o2-balance-row"><span>${O2.MUSCLES[m]}</span>
                    <div class="o2-balance-track"><i class="o2-balance-zone" style="left:${SET_TARGET.min / max * 100}%;width:${(SET_TARGET.max - SET_TARGET.min) / max * 100}%"></i><i class="o2-balance-fill" data-w="${Math.min(100, v / max * 100)}%" style="width:0;background:${tone}"></i></div>
                    <b style="color:${tone}">${v}</b></div>`;
            }).join('')}</div>
            <p style="margin:14px 0 0;font-size:12px;line-height:1.55;color:var(--o2-text-2)">Yeşil bant: kas başına haftada ${SET_TARGET.min}-${SET_TARGET.max} set (gelişim için ideal aralık).${under.length ? ` <b style="color:var(--o2-orange)">Eksik kalan:</b> ${under.slice(0, 4).join(', ')}.` : ' Dengeli bir hafta.'}</p>
        </div>`;
    };

    // ==========================================
    // 🏅 GÜÇ STANDARTLARI (vücut ağırlığına göre 1RM oranı)
    // ==========================================
    const LEVELS = ['Başlangıç', 'Acemi', 'Orta', 'İleri', 'Elit'];
    const STANDARDS = [
        ['Bench Press', [.5, .75, 1, 1.5, 2]],
        ['Squat', [.75, 1.25, 1.5, 2.25, 2.75]],
        ['Romanian Deadlift', [.75, 1.25, 1.5, 2, 2.5]],
        ['Military Press', [.35, .55, .75, 1, 1.25]],
        ['Barbell Row', [.5, .75, 1, 1.25, 1.5]]
    ];
    O2.strengthHTML = () => {
        const bw = bodyWeight();
        const bests = O2.bests();
        const rows = STANDARDS.map(([name, ratios]) => {
            const b = bests[name] || (name === 'Romanian Deadlift' ? bests['Deadlift'] : null) || (name === 'Military Press' ? bests['Shoulder Press'] || bests['Overhead Press'] : null);
            if (!b || !bw) return null;
            const ratio = b.e1rm / bw;
            let lvl = -1;
            ratios.forEach((r, i) => { if (ratio >= r) lvl = i; });
            const next = ratios[lvl + 1];
            const pct = next ? Math.min(100, ((ratio - (ratios[lvl] || 0)) / (next - (ratios[lvl] || 0))) * 100) : 100;
            return { name, ratio, lvl, next, pct, e1rm: b.e1rm, nextKg: next ? next * bw : null };
        }).filter(Boolean);
        if (!bw) return `<div class="o2-card o2-empty">Güç seviyeni hesaplamak için kilonu kaydet.</div>`;
        if (!rows.length) return `<div class="o2-card o2-empty">Bench, squat, deadlift, military press veya row setleri kaydettikçe güç seviyen burada görünür.</div>`;
        return `<div class="o2-card" style="padding:6px 18px">${rows.map(r => `
            <div class="o2-strength">
                <div class="o2-strength-head"><h5>${esc(r.name)}</h5><span class="o2-chip ${r.lvl >= 3 ? 'gold' : r.lvl >= 2 ? 'green' : ''}">${r.lvl < 0 ? 'Başlangıç altı' : LEVELS[r.lvl]}</span></div>
                <div class="o2-strength-scale">${LEVELS.map((l, i) => `<i class="${i <= r.lvl ? 'on' : ''}"></i>`).join('')}</div>
                <p>1RM ${O2.fmtNum(r.e1rm, 1)} kg · vücut ağırlığının ${O2.fmtNum(r.ratio, 2)} katı${r.nextKg ? ` · ${LEVELS[r.lvl + 1]} için ${O2.fmtNum(r.nextKg, 0)} kg` : ' · zirvedesin'}</p>
            </div>`).join('')}</div>`;
    };

    // ==========================================
    // 🎯 HEDEF KİLO & TAHMİNİ VARIŞ (son 8 haftanın doğrusal eğilimi)
    // ==========================================
    O2.weightTrend = () => {
        const pts = (LS.get('olympus_history', []) || []).map(h => ({ d: O2.parseDate(h.date), w: parseFloat(h.weight) })).filter(x => x.d && x.w && x.d >= O2.addDays(new Date(), -56));
        if (pts.length < 3) return null;
        const t0 = pts[0].d.getTime();
        const xs = pts.map(p => (p.d - t0) / (7 * 864e5)), ys = pts.map(p => p.w);
        const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
        const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / (xs.reduce((a, x) => a + (x - mx) ** 2, 0) || 1);
        return { perWeek: slope, current: ys[ys.length - 1] };
    };
    O2.goalHTML = () => {
        const goal = parseFloat(O2.settings().goalWeight);
        const tr = O2.weightTrend();
        if (!goal) return `<button class="o2-btn o2-btn-ghost o2-btn-block" style="margin-top:12px" onclick="O2.goalSheet()">${I('scale')}Hedef kilo belirle</button>`;
        const cur = tr ? tr.current : bodyWeight();
        const diff = cur ? goal - cur : null;
        let eta = 'Tahmin için birkaç tartı kaydı daha gerekli.';
        if (tr && diff !== null) {
            if (Math.abs(diff) < .3) eta = 'Hedefine ulaştın. Yeni bir hedef belirle.';
            else if (Math.sign(diff) === Math.sign(tr.perWeek) && Math.abs(tr.perWeek) > .05) {
                const weeks = diff / tr.perWeek;
                eta = `Bu hızla (haftada ${tr.perWeek > 0 ? '+' : ''}${O2.fmtNum(tr.perWeek, 2)} kg) tahmini varış: <b>${O2.addDays(new Date(), weeks * 7).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</b>`;
            } else eta = `Şu anki eğilim (haftada ${tr.perWeek > 0 ? '+' : ''}${O2.fmtNum(tr.perWeek, 2)} kg) hedefin tersi yönünde.`;
        }
        return `
        <div class="o2-card is-tap" style="margin-top:12px" onclick="O2.goalSheet()">
            <div style="display:flex;justify-content:space-between;align-items:baseline"><div class="o2-eyebrow">Hedef</div><span style="font-size:20px;font-weight:800">${O2.fmtNum(goal, 1)} kg</span></div>
            ${diff !== null ? `<p style="margin:6px 0 0;font-size:13px;color:var(--o2-text-2)">${Math.abs(diff) < .3 ? 'Hedefe ulaşıldı' : `Kalan: <b style="color:var(--o2-text)">${O2.fmtNum(Math.abs(diff), 1)} kg</b> ${diff < 0 ? 'vermek' : 'almak'}`}</p>` : ''}
            <p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:var(--o2-text-3)">${eta}</p>
        </div>`;
    };
    O2.goalSheet = () => {
        const cur = bodyWeight() || 80;
        O2.sheet('Hedef kilo', `
            <p style="margin:0;color:var(--o2-text-2);font-size:13px;line-height:1.55">Sağlıklı tempo: haftada vücut ağırlığının %0,5-1'i. Olympus son 8 haftalık tartılarından varış tarihini tahmin eder.</p>
            <div class="o2-field"><label>Hedef (kg)</label>
                <div class="o2-stepper"><button onclick="O2.step('o2-goal-w', -.5)">−</button><input class="o2-input" id="o2-goal-w" type="number" step=".5" value="${O2.settings().goalWeight || Math.round(cur - 3)}"><button onclick="O2.step('o2-goal-w', .5)">+</button></div>
            </div>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:20px" onclick="O2.saveSettings({ goalWeight: parseFloat(document.getElementById('o2-goal-w').value) }); O2.closeSheet(); O2.render(); O2.toast('Hedef kaydedildi', 'scale')">Kaydet</button>
            ${O2.settings().goalWeight ? `<button class="o2-btn o2-btn-ghost o2-btn-block" style="margin-top:10px" onclick="O2.saveSettings({ goalWeight: null }); O2.closeSheet(); O2.render()">Hedefi kaldır</button>` : ''}`);
    };

    // ==========================================
    // 😴 UYKU & NABIZ TRENDİ
    // ==========================================
    O2.recoveryTrendHTML = () => {
        const sleep = (LS.get('olympus_sleep_history', []) || []).slice(-14);
        const bpm = (LS.get('olympus_bpm_history', []) || []).slice(-14);
        if (sleep.length < 2 && bpm.length < 2) return '';
        const avg = (arr) => arr.reduce((a, x) => a + parseFloat(x.val), 0) / arr.length;
        return `
            <div class="o2-section-head"><h3>Uyku & nabız</h3><span class="o2-link" style="color:var(--o2-text-3)">son 14 kayıt</span></div>
            <div class="o2-card">
                <div class="o2-grid-2" style="margin-bottom:8px">
                    <div><div class="o2-eyebrow">Ort. uyku</div><div style="font-size:22px;font-weight:800;margin-top:4px;color:var(--o2-violet)">${sleep.length ? O2.fmtNum(avg(sleep), 1) : '—'}<span style="font-size:12px;color:var(--o2-text-3)"> saat</span></div></div>
                    <div><div class="o2-eyebrow">Dinlenik nabız</div><div style="font-size:22px;font-weight:800;margin-top:4px;color:var(--o2-red)">${bpm.length ? Math.round(avg(bpm)) : '—'}<span style="font-size:12px;color:var(--o2-text-3)"> bpm</span></div></div>
                </div>
                <div class="o2-chart" style="height:150px;margin-top:6px"><canvas id="o2-chart-recovery"></canvas></div>
            </div>`;
    };
    O2.drawRecoveryChart = () => {
        const el = $('o2-chart-recovery');
        if (!el || typeof Chart === 'undefined') return;
        const sleep = (LS.get('olympus_sleep_history', []) || []).slice(-14);
        const bpm = (LS.get('olympus_bpm_history', []) || []).slice(-14);
        const labels = [...new Set([...sleep, ...bpm].map(x => x.date))].sort((a, b) => O2.parseDate(a) - O2.parseDate(b)).slice(-14);
        const val = (arr, d) => { const f = arr.find(x => x.date === d); return f ? parseFloat(f.val) : null; };
        O2.ui.charts.push(new Chart(el.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels.map(d => O2.prettyDate(d)),
                datasets: [
                    { label: 'Uyku', data: labels.map(d => val(sleep, d)), borderColor: '#a78bfa', backgroundColor: 'transparent', tension: .35, borderWidth: 2.5, pointRadius: 2, spanGaps: true, yAxisID: 'y' },
                    { label: 'Nabız', data: labels.map(d => val(bpm, d)), borderColor: '#ff5a5f', backgroundColor: 'transparent', tension: .35, borderWidth: 2, pointRadius: 2, spanGaps: true, borderDash: [4, 4], yAxisID: 'y2' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#63636e', font: { size: 10, weight: 'bold' }, maxRotation: 0, autoSkipPadding: 12 } },
                    y: { position: 'left', grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#a78bfa', font: { size: 10, weight: 'bold' }, maxTicksLimit: 4 } },
                    y2: { position: 'right', grid: { display: false }, ticks: { color: '#ff5a5f', font: { size: 10, weight: 'bold' }, maxTicksLimit: 4 } }
                }
            }
        }));
    };

    // ==========================================
    // 🖼️ PAYLAŞIM KARTI (Instagram hikâyesi boyutunda PNG)
    // ==========================================
    function drawMark(ctx, x, y, size) {
        const S = size / 120;
        const g = ctx.createLinearGradient(x, y, x + size, y + size);
        g.addColorStop(0, '#f6dea0'); g.addColorStop(.45, '#e6c374'); g.addColorStop(1, '#b9842c');
        ctx.save(); ctx.translate(x, y); ctx.scale(S, S);
        ctx.strokeStyle = g; ctx.fillStyle = g; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'miter';
        ctx.beginPath(); ctx.moveTo(28, 88); ctx.lineTo(60, 28); ctx.lineTo(92, 88); ctx.stroke();
        const rr = (rx, ry, w, h, r) => { ctx.beginPath(); ctx.roundRect(rx, ry, w, h, r); ctx.fill(); };
        rr(14, 70, 92, 6, 3); rr(12, 60, 7, 26, 3); rr(21, 64, 5, 18, 2.5); rr(101, 60, 7, 26, 3); rr(94, 64, 5, 18, 2.5);
        ctx.beginPath(); [[90, 13], [92.4, 21.6], [101, 24], [92.4, 26.4], [90, 35], [87.6, 26.4], [79, 24], [87.6, 21.6]].forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.fill();
        ctx.restore();
    }

    O2.shareCard = async (id) => {
        const s = O2.sessions().find(x => x.id === id);
        if (!s) return;
        const W = 1080, H = 1920;
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');
        // Zemin
        ctx.fillStyle = '#050506'; ctx.fillRect(0, 0, W, H);
        const glow = ctx.createRadialGradient(W * .3, 0, 0, W * .3, 0, W * 1.1);
        glow.addColorStop(0, 'rgba(230,195,116,.28)'); glow.addColorStop(1, 'rgba(230,195,116,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
        await document.fonts.load('800 80px Manrope').catch(() => { });
        const font = (w, s) => `${w} ${s}px Manrope, Montserrat, sans-serif`;
        // Logo
        drawMark(ctx, 90, 110, 120);
        ctx.fillStyle = '#f5f5f7'; ctx.font = font(800, 34); ctx.letterSpacing = '10px';
        ctx.fillText('OLYMPUS', 240, 172);
        const tw = ctx.measureText('OLYMPUS ').width;
        const gt = ctx.createLinearGradient(240 + tw, 140, 240 + tw + 260, 180); gt.addColorStop(0, '#f6dea0'); gt.addColorStop(1, '#b9842c');
        ctx.fillStyle = gt; ctx.fillText('TRAINING', 240 + tw, 172);
        ctx.letterSpacing = '0px';
        // Başlık
        const isCardio = s.type === 'cardio';
        const title = String(s.title).split(':').pop().trim();
        ctx.fillStyle = '#a1a1aa'; ctx.font = font(700, 38);
        ctx.fillText(new Date(s.endedAt).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase(), 90, 420);
        ctx.fillStyle = '#f5f5f7'; ctx.font = font(800, 104);
        title.split(' ').reduce((lines, w) => { const l = lines[lines.length - 1]; if (ctx.measureText(l + ' ' + w).width > W - 180 && l) lines.push(w); else lines[lines.length - 1] = (l ? l + ' ' : '') + w; return lines; }, ['']).slice(0, 2)
            .forEach((line, i) => ctx.fillText(line, 90, 540 + i * 116));
        // İstatistikler
        const stats = isCardio
            ? [['MESAFE', `${O2.fmtNum(s.distanceKm, 2)} km`], ['SÜRE', O2.fmtClock(s.durationSec)], [s.kind === 'ride' ? 'ORT. HIZ' : 'TEMPO', s.kind === 'ride' ? `${O2.fmtNum(s.distanceKm / (s.durationSec / 3600), 1)} km/s` : `${O2.fmtPace(s.paceSec)} /km`], ['KALORİ', `${O2.fmtNum(s.kcal)} kcal`]]
            : [['SÜRE', O2.fmtClock(s.durationSec)], ['HACİM', `${O2.fmtNum(s.volume)} kg`], ['SET', String(s.setCount)], ['REKOR', String((s.prs || []).length)]];
        stats.forEach(([label, value], i) => {
            const x = 90 + (i % 2) * 460, y = 800 + Math.floor(i / 2) * 250;
            ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.beginPath(); ctx.roundRect(x, y, 430, 210, 36); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#63636e'; ctx.font = font(800, 28); ctx.fillText(label, x + 36, y + 64);
            ctx.fillStyle = '#f5f5f7'; ctx.font = font(800, 64); ctx.fillText(value, x + 36, y + 156);
        });
        // Rekorlar veya rota
        let y = 1360;
        if (!isCardio && (s.prs || []).length) {
            ctx.fillStyle = '#e6c374'; ctx.font = font(800, 30); ctx.fillText('KIRILAN REKORLAR', 90, y); y += 60;
            s.prs.slice(0, 3).forEach(p => { ctx.fillStyle = '#f5f5f7'; ctx.font = font(700, 42); ctx.fillText(`🏆 ${p.ex} · ${O2.fmtNum(p.w, 1)} kg × ${p.r}`, 90, y); y += 64; });
        } else if (isCardio && s.route && s.route.length > 1) {
            const lats = s.route.map(p => p[0]), lngs = s.route.map(p => p[1]);
            const [la0, la1, ln0, ln1] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
            const box = { x: 90, y: 1380, w: 900, h: 360 };
            const sc = Math.min(box.w / ((ln1 - ln0) || 1e-5), box.h / ((la1 - la0) || 1e-5)) * .9;
            ctx.strokeStyle = '#e6c374'; ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            ctx.beginPath();
            s.route.forEach(([la, ln], i) => { const px = box.x + box.w / 2 + (ln - (ln0 + ln1) / 2) * sc, py = box.y + box.h / 2 - (la - (la0 + la1) / 2) * sc; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
            ctx.stroke();
        }
        ctx.fillStyle = '#3f3f46'; ctx.font = font(700, 30); ctx.fillText('Sınırlarını zorla. Zirveye çık.', 90, H - 110);

        const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
        const file = new File([blob], `olympus-${s.dayKey}.png`, { type: 'image/png' });
        try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Olympus Training' }); return; }
        } catch (e) { if (e && e.name === 'AbortError') return; }
        const url = URL.createObjectURL(blob);
        O2.sheet('Paylaşım kartı', `<img src="${url}" alt="Paylaşım kartı" style="width:100%;border-radius:18px;display:block"><a class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:14px;text-decoration:none" href="${url}" download="olympus-${s.dayKey}.png">Görseli indir</a>`);
    };

    // ==========================================
    // 🔊 SESLİ KOÇ
    // ==========================================
    O2.voice = (text) => {
        if (!O2.settings().voiceCoach || !('speechSynthesis' in window)) return;
        try {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'tr-TR';
            u.rate = 1.02;
            const tr = speechSynthesis.getVoices().find(v => /tr/i.test(v.lang));
            if (tr) u.voice = tr;
            speechSynthesis.speak(u);
        } catch (e) { }
    };

    // ==========================================
    // 🥫 ONLINE BESİN ARAMA (Open Food Facts) & BARKOD
    // ==========================================
    const offToFood = (p) => {
        const n = p.nutriments || {};
        const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : null);
        if (kcal == null || !p.product_name) return null;
        return {
            name: `${p.product_name}${p.brands ? ' · ' + String(p.brands).split(',')[0] : ''}`.slice(0, 60),
            unit: '100 g', kcal: Math.round(kcal), p: +(n.proteins_100g || 0).toFixed(1), c: +(n.carbohydrates_100g || 0).toFixed(1), f: +(n.fat_100g || 0).toFixed(1)
        };
    };
    O2.foodOnlineSearch = async (key, q) => {
        const box = $('o2-food-online');
        if (!box) return;
        box.innerHTML = `<div class="o2-empty" style="padding:14px">Aranıyor…</div>`;
        try {
            const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&json=1&page_size=12&fields=product_name,brands,nutriments`);
            const data = await res.json();
            const foods = (data.products || []).map(offToFood).filter(Boolean);
            box.innerHTML = foods.length ? foods.map(f => `
                <div class="o2-row is-tap" onclick="O2.foodAmountSheet('${key}', ${jsArg(JSON.stringify(f))})">
                    <div class="o2-row-main"><h5>${esc(f.name)}</h5><p>100 g · P ${f.p} · K ${f.c} · Y ${f.f}</p></div>
                    <div class="o2-row-end"><strong>${f.kcal}</strong>kcal</div>
                </div>`).join('') : `<div class="o2-empty" style="padding:14px">İnternette sonuç bulunamadı.</div>`;
        } catch (e) {
            box.innerHTML = `<div class="o2-empty" style="padding:14px">Bağlantı yok. Hazır listeden ya da özel besinle ekleyebilirsin.</div>`;
        }
    };

    O2.foodByBarcode = async (key, code) => {
        code = String(code || '').replace(/\D/g, '');
        if (code.length < 8) { O2.toast('Geçerli bir barkod gir', 'fuel'); return; }
        O2.toast('Ürün aranıyor…', 'fuel');
        try {
            const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments`);
            const data = await res.json();
            const f = data.status === 1 && offToFood(data.product);
            if (!f) { O2.toast('Bu barkod veritabanında yok · özel besin olarak ekleyebilirsin', 'fuel'); return; }
            O2.foodAmountSheet(key, JSON.stringify(f));
        } catch (e) { O2.toast('Bağlantı hatası', 'fuel'); }
    };

    let scanStream = null, scanTimer = null;
    O2.barcodeSheet = (key) => {
        const hasDetector = 'BarcodeDetector' in window;
        O2.sheet('Barkod', `
            ${hasDetector ? `<div class="o2-scan"><video id="o2-scan-video" playsinline muted></video><i class="o2-scan-line"></i></div>
            <p style="margin:10px 0 0;text-align:center;font-size:12px;color:var(--o2-text-3)">Barkodu çerçeveye hizala</p>` : `<p style="margin:0;color:var(--o2-text-2);font-size:13px">Bu cihazda kamera ile barkod okuma desteklenmiyor; numarayı elle girebilirsin.</p>`}
            <div class="o2-field"><label>Barkod numarası</label><input class="o2-input" id="o2-scan-code" inputmode="numeric" placeholder="869…"></div>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:14px" onclick="O2.stopScan(); O2.foodByBarcode('${key}', document.getElementById('o2-scan-code').value)">Ara</button>`);
        if (!hasDetector) return;
        setTimeout(async () => {
            try {
                const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
                scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                const video = $('o2-scan-video');
                if (!video) return O2.stopScan();
                video.srcObject = scanStream;
                await video.play();
                scanTimer = setInterval(async () => {
                    if (!$('o2-scan-video')) return O2.stopScan();
                    const codes = await detector.detect(video).catch(() => []);
                    if (codes.length) {
                        const code = codes[0].rawValue;
                        O2.stopScan();
                        O2.haptic([30, 40, 30]);
                        O2.foodByBarcode(key, code);
                    }
                }, 400);
            } catch (e) {
                O2.stopScan();
                const v = $('o2-scan-video');
                if (v) v.parentElement.innerHTML = '<div class="o2-empty">Kamera izni verilmedi. Barkodu elle girebilirsin.</div>';
            }
        }, 350);
    };
    O2.stopScan = () => {
        clearInterval(scanTimer); scanTimer = null;
        if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
    };

    // ==========================================
    // 🏁 MEYDAN OKUMALAR
    // ==========================================
    const CHALLENGE_TYPES = {
        sessions: { label: 'Seans', unit: 'seans', icon: 'bolt', value: (list) => list.length },
        volume: { label: 'Hacim', unit: 'kg', icon: 'train', value: (list) => list.reduce((a, s) => a + (s.volume || 0), 0) },
        km: { label: 'Kardiyo', unit: 'km', icon: 'run', value: (list) => list.reduce((a, s) => a + (s.distanceKm || 0), 0) },
        prs: { label: 'Rekor', unit: 'rekor', icon: 'trophy', value: (list) => list.reduce((a, s) => a + (s.prs || []).length, 0) }
    };
    // Ayın bitmesine 7 günden az kaldıysa gelecek ayın meydan okumaları sunulur
    const monthRange = () => {
        const n = new Date();
        const daysLeft = (new Date(n.getFullYear(), n.getMonth() + 1, 1) - n) / 864e5;
        const m = n.getMonth() + (daysLeft < 7 ? 1 : 0);
        return [new Date(n.getFullYear(), m, 1), new Date(n.getFullYear(), m + 1, 1)];
    };
    const PRESETS = () => {
        const [s, e] = monthRange();
        const month = s.toLocaleDateString('tr-TR', { month: 'long' });
        return [
            { id: `m-sessions-${s.getMonth()}`, title: `${month} · 16 seans`, type: 'sessions', target: 16, start: +s, end: +e },
            { id: `m-km-${s.getMonth()}`, title: `${month} · 50 km`, type: 'km', target: 50, start: +s, end: +e },
            { id: `m-vol-${s.getMonth()}`, title: `${month} · 50 ton`, type: 'volume', target: 50000, start: +s, end: +e },
            { id: `m-pr-${s.getMonth()}`, title: `${month} · 5 rekor`, type: 'prs', target: 5, start: +s, end: +e }
        ];
    };
    O2.challenges = () => LS.get('oly2_challenges', []) || [];
    O2.challengeProgress = (c) => {
        const list = O2.sessions().filter(s => s.endedAt >= c.start && s.endedAt < c.end);
        const v = CHALLENGE_TYPES[c.type].value(list);
        return { value: v, pct: Math.min(100, v / c.target * 100), done: v >= c.target, ended: Date.now() >= c.end };
    };
    O2.joinChallenge = (json) => {
        const c = JSON.parse(json);
        const list = O2.challenges().filter(x => x.id !== c.id);
        list.push(c);
        LS.set('oly2_challenges', list);
        O2.haptic([20, 40, 20]);
        O2.toast(`"${c.title}" başladı`, 'trophy');
        O2.render();
    };
    O2.leaveChallenge = (id) => { LS.set('oly2_challenges', O2.challenges().filter(x => x.id !== id)); O2.render(); };

    const fmtVal = (type, v) => type === 'volume' ? `${O2.fmtNum(v / 1000, 1)} ton` : type === 'km' ? `${O2.fmtNum(v, 1)} km` : `${Math.round(v)}`;
    O2.challengeCards = (compact = false) => {
        const active = O2.challenges().filter(c => Date.now() < c.end + 3 * 864e5);
        // Tamamlananları bir kez kutla
        active.forEach(c => {
            const p = O2.challengeProgress(c);
            if (p.done && !c.celebrated) {
                c.celebrated = true;
                LS.set('oly2_challenges', O2.challenges().map(x => x.id === c.id ? c : x));
                setTimeout(() => { O2.toast(`Meydan okuma tamamlandı · ${c.title}`, 'trophy'); if (typeof confetti === 'function') confetti({ particleCount: 140, spread: 90, colors: ['#f6dea0', '#e6c374', '#ffffff'] }); }, 600);
            }
        });
        const joined = new Set(active.map(c => c.id));
        const presets = compact ? [] : PRESETS().filter(p => !joined.has(p.id));
        if (compact && !active.length) return '';
        return `
            ${active.map(c => {
                const p = O2.challengeProgress(c), t = CHALLENGE_TYPES[c.type];
                const daysLeft = Math.max(0, Math.ceil((c.end - Date.now()) / 864e5));
                return `<div class="o2-card o2-challenge ${p.done ? 'done' : ''}">
                    <div class="o2-coach" style="align-items:center"><div class="o2-coach-orb" style="width:38px;height:38px">${I(t.icon)}</div>
                    <div style="flex:1"><h4>${esc(c.title)}</h4><p>${fmtVal(c.type, p.value)} / ${fmtVal(c.type, c.target)} · ${p.done ? 'Tamamlandı 🎉' : `${daysLeft} gün kaldı`}</p></div>
                    ${compact ? '' : `<button class="o2-icon-btn" style="width:32px;height:32px" onclick="O2.leaveChallenge('${esc(c.id)}')" aria-label="Ayrıl">${I('close')}</button>`}</div>
                    <div class="o2-bar" style="margin-top:12px;height:7px"><i data-w="${p.pct}%" style="width:0;background:var(--o2-gold-grad)"></i></div>
                </div>`;
            }).join('')}
            ${presets.length ? `<div class="o2-grid-2" style="margin-top:${active.length ? 12 : 0}px">${presets.map(p => `
                <button class="o2-card is-tap o2-create" onclick="O2.joinChallenge(${jsArg(JSON.stringify(p))})"><span style="color:var(--o2-gold)">${I(CHALLENGE_TYPES[p.type].icon)}</span><h4>${esc(p.title)}</h4><p>Katıl</p></button>`).join('')}</div>` : ''}`;
    };

    // ==========================================
    // ⏰ HATIRLATICILAR (telefon bildirimi + e-posta)
    // ==========================================
    // Android'de @capacitor/local-notifications (uygulama kapalıyken de çalışır); web'de uygulama açıkken bildirim.
    // E-posta: Google Apps Script servisi (apps-script/olympus-hatirlatici.gs) her gün seçilen saatte mail atar.
    const LN = () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
    const REMINDER_IDS = { legacyWorkout: 9001, sleep: 9002, water: [9010, 9011, 9012, 9013, 9014, 9015], workout: [9030, 9031, 9032, 9033, 9034, 9035, 9036], academy: [9040, 9041, 9042, 9043, 9044, 9045, 9046] };
    const ALL_IDS = [REMINDER_IDS.legacyWorkout, REMINDER_IDS.sleep, ...REMINDER_IDS.water, ...REMINDER_IDS.workout, ...REMINDER_IDS.academy];
    const WATER_HOURS = [10, 12, 14, 16, 18, 20];
    O2.reminderSettings = () => ({ workout: false, workoutTime: '18:00', water: false, sleep: false, academy: false, academyTime: '20:30', mail: false, mailUrl: '', ...(LS.get('oly2_reminders', {}) || {}) });
    const anyOn = (r) => r.workout || r.water || r.sleep || r.academy;
    const hm = (t) => t.split(':').map(Number);
    const trainedOn = (key) => O2.sessions().some(s => s.dayKey === key && s.type !== 'cardio');

    // Önümüzdeki 7 günün bildirimleri: antrenman günü başlığıyla, dinlenme günleri ve bugün yapılmışsa atlanır
    function upcoming(r) {
        const list = [];
        const now = new Date();
        for (let i = 0; i < 7; i++) {
            const day = O2.addDays(O2.startOfDay(), i);
            if (r.workout) {
                const [h, m] = hm(r.workoutTime);
                const at = new Date(day); at.setHours(h, m, 0, 0);
                const plan = O2.dayPlan(i);
                if (at > now && !plan.isRest && !(i === 0 && trainedOn(O2.dayKey()))) {
                    const title = String(plan.title || '').split(':').pop().trim();
                    list.push({ id: REMINDER_IDS.workout[i], at, title: 'Antrenman vakti 💪', body: `Bugün: ${title}. Hazırlık skoruna bak ve başla.`, action: 'start' });
                }
            }
            if (r.academy && O2.academySummary) {
                const [h, m] = hm(r.academyTime);
                const at = new Date(day); at.setHours(h, m, 0, 0);
                const s = O2.academySummary();
                if (at > now && s) {
                    const next = s.dates.map(d => ({ ...d, left: d.left - i })).filter(d => d.left >= 0).sort((a, b) => a.left - b.left)[0];
                    const when = next ? (next.left === 0 ? `${next.label} bugün!` : next.left === 1 ? `${next.label} yarın!` : `${next.label}: ${next.left} gün kaldı.`) : '';
                    list.push({ id: REMINDER_IDS.academy[i], at, title: `🛡️ ${s.branch} · ${s.track} hazırlığı`, body: `${when} Bugün 10 mülakat kartı çalış ve testini kaydet.`.trim(), action: 'academy' });
                }
            }
        }
        return list;
    }

    O2.applyReminders = async (opts = {}) => {
        const r = O2.reminderSettings();
        const plugin = LN();
        if (plugin) {
            try {
                const perm = await plugin.checkPermissions();
                if (perm.display !== 'granted' && anyOn(r)) {
                    if (opts.silent) return false;
                    const req = await plugin.requestPermissions();
                    if (req.display !== 'granted') { O2.toast('Bildirim izni verilmedi', 'bell'); return false; }
                }
                await plugin.cancel({ notifications: ALL_IDS.map(id => ({ id })) });
                const list = upcoming(r).map(n => ({ id: n.id, title: n.title, body: n.body, schedule: { at: n.at, allowWhileIdle: true }, extra: { action: n.action } }));
                if (r.sleep) list.push({ id: REMINDER_IDS.sleep, title: 'Günaydın', body: 'Dün gece kaç saat uyudun? Kaydet, hazırlık skorun güncellensin.', schedule: { on: { hour: 9, minute: 30 }, allowWhileIdle: true }, extra: { action: 'sleep' } });
                if (r.water) WATER_HOURS.forEach((h, i) => list.push({ id: REMINDER_IDS.water[i], title: 'Su vakti 💧', body: 'Bir bardak su iç; hedefe bir adım daha.', schedule: { on: { hour: h, minute: 0 }, allowWhileIdle: true }, extra: { action: 'water' } }));
                if (list.length) await plugin.schedule({ notifications: list });
                return true;
            } catch (e) { console.warn('Hatırlatıcılar kurulamadı:', e); return false; }
        }
        // Web yedeği: izin al, uygulama açıkken zamanı gelince göster
        if (anyOn(r) && 'Notification' in window && Notification.permission !== 'granted') {
            if (opts.silent) return false;
            const p = await Notification.requestPermission();
            if (p !== 'granted') { O2.toast('Bildirim izni verilmedi', 'bell'); return false; }
        }
        scheduleWebReminders();
        return true;
    };

    let webTimers = [];
    function scheduleWebReminders() {
        webTimers.forEach(clearTimeout); webTimers = [];
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const r = O2.reminderSettings();
        const show = async (title, body, action) => {
            const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
            if (reg) reg.showNotification(title, { body, icon: 'assets/olympus-training-icon-192.png', data: { action } });
            else new Notification(title, { body, icon: 'assets/olympus-training-icon-192.png' });
        };
        const today = O2.dayKey();
        const at = (h, m, title, body, action) => {
            const t = new Date(); t.setHours(h, m, 0, 0);
            if (t <= new Date()) return;
            webTimers.push(setTimeout(() => show(title, body, action), t - new Date()));
        };
        upcoming(r).filter(n => O2.dayKey(n.at) === today).forEach(n => webTimers.push(setTimeout(() => {
            if (n.action === 'start' && trainedOn(today)) return;
            show(n.title, n.body, n.action);
        }, n.at - new Date())));
        if (r.sleep) at(9, 30, 'Günaydın', 'Dün gece kaç saat uyudun?', 'sleep');
        if (r.water) WATER_HOURS.forEach(h => at(h, 0, 'Su vakti 💧', 'Bir bardak su iç.', 'water'));
    }

    // ✉️ E-posta hatırlatıcısı: ayarları ve önümüzdeki 7 günün planını Apps Script servisine gönderir.
    // Kimlik, Firebase ID token ile sunucuda doğrulanır; mail yalnızca hesabın kendi adresine gider.
    O2.syncMailReminder = async (force) => {
        const r = O2.reminderSettings();
        const u = typeof auth !== 'undefined' && auth.currentUser;
        if (!r.mailUrl || !u || !/^https:\/\/script\.google\.com\//.test(r.mailUrl)) return false;
        if (!force && LS.raw('oly2_mail_sync_day', '') === O2.dayKey()) return true;
        try {
            const plans = {};
            for (let i = 0; i < 7; i++) {
                const p = O2.dayPlan(i);
                plans[O2.dayKey(O2.addDays(O2.startOfDay(), i))] = p.isRest ? '' : String(p.title || '').split(':').pop().trim();
            }
            const last = O2.sessions().filter(s => s.type !== 'cardio').slice(-1)[0];
            const acad = O2.academySummary ? O2.academySummary() : null;
            const body = {
                idToken: await u.getIdToken(),
                name: O2.userName(),
                appUrl: /^https:/.test(location.protocol) ? location.origin + location.pathname : '',
                enabled: !!r.mail,
                workout: { on: !!(r.mail && r.workout), time: r.workoutTime },
                academy: { on: !!(r.mail && r.academy), time: r.academyTime, branch: acad ? `${acad.branch} · ${acad.track}` : '', dates: acad ? acad.dates.map(d => ({ label: d.label, date: d.date })) : [] },
                plans,
                lastWorkoutDay: last ? last.dayKey : '',
                weekSessions: O2.weekStats().sessions,
                weeklyTarget: O2.settings().weeklyTarget
            };
            // Apps Script CORS ön kontrolünü desteklemez: text/plain + no-cors ile gönderilir
            await fetch(r.mailUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
            localStorage.setItem('oly2_mail_sync_day', O2.dayKey());
            return true;
        } catch (e) { console.warn('E-posta hatırlatıcısı eşitlenemedi:', e); return false; }
    };

    O2.remindersSheet = () => {
        const r = O2.reminderSettings();
        const row = (key, title, desc) => `
            <div class="o2-toggle-row" onclick="this.querySelector('.o2-switch').classList.toggle('on')">
                <div><h5>${title}</h5><p>${desc}</p></div><span class="o2-switch ${r[key] ? 'on' : ''}" data-key="${key}"></span>
            </div>`;
        const u = typeof auth !== 'undefined' && auth.currentUser;
        O2.sheet('Hatırlatıcılar', `
            ${row('workout', 'Antrenman', 'Antrenman günlerinde, o günün seansıyla; o gün çalıştıysan gelmez')}
            <div class="o2-field" style="margin-top:10px"><label>Antrenman saati</label><input class="o2-input" type="time" id="o2-rem-time" value="${esc(r.workoutTime)}"></div>
            ${row('academy', 'Akademi çalışması', 'Her gün mülakat kartları ve sınava kalan gün')}
            <div class="o2-field" style="margin-top:10px"><label>Akademi saati</label><input class="o2-input" type="time" id="o2-rem-acad" value="${esc(r.academyTime)}"></div>
            ${row('water', 'Su', '10:00-20:00 arası 2 saatte bir')}
            ${row('sleep', 'Uyku kaydı', 'Her sabah 09:30')}
            <div class="o2-section-head" style="margin-top:22px"><h3>E-posta</h3></div>
            ${row('mail', 'E-posta ile de hatırlat', `Antrenman ve Akademi hatırlatıcıları ${u ? esc(u.email) : 'hesabının e-postasına'} da gelir; sınavlara 30, 7 ve 1 gün kala ayrıca uyarır.`)}
            <div class="o2-field" style="margin-top:10px"><label>E-posta servisi adresi (Apps Script)</label><input class="o2-input" id="o2-rem-url" inputmode="url" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(r.mailUrl)}"></div>
            <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:var(--o2-text-3)">${LN() ? 'Android bildirimleri uygulama kapalıyken de gelir.' : 'Tarayıcıda/ana ekran uygulamasında bildirimler yalnızca uygulama açıkken gelir; kapalıyken e-posta hatırlatıcısı ve Android uygulaması devreye girer.'}${u ? '' : ' E-posta için giriş yapmalısın.'}</p>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:16px" onclick="O2.saveReminders()">Kaydet</button>`);
    };
    O2.saveReminders = async () => {
        const r = O2.reminderSettings();
        document.querySelectorAll('#o2-sheet-layer .o2-switch[data-key]').forEach(sw => { r[sw.dataset.key] = sw.classList.contains('on'); });
        r.workoutTime = $('o2-rem-time').value || '18:00';
        r.academyTime = $('o2-rem-acad').value || '20:30';
        r.mailUrl = ($('o2-rem-url').value || '').trim();
        if (r.mail && !/^https:\/\/script\.google\.com\//.test(r.mailUrl)) { O2.toast('Geçerli bir Apps Script adresi gir', 'mail'); return; }
        LS.set('oly2_reminders', r);
        const ok = await O2.applyReminders();
        const mailOk = r.mailUrl ? await O2.syncMailReminder(true) : true;
        O2.closeSheet();
        if (ok) O2.toast(anyOn(r) ? (r.mail && mailOk ? 'Bildirim + e-posta hatırlatıcıları kuruldu' : 'Hatırlatıcılar kuruldu') : 'Hatırlatıcılar kapatıldı', 'bell');
    };

    // Seans kaydedilince bugünün antrenman hatırlatıcısı iptal olsun, e-posta servisi de bilsin
    const baseSave = O2.saveSession;
    O2.saveSession = function () {
        const res = baseSave.apply(this, arguments);
        O2.applyReminders({ silent: true });
        O2.syncMailReminder(true);
        return res;
    };

    // ==========================================
    // 🔗 KISAYOLLAR & BİLDİRİMDEN AÇILIŞ (?action=start|water|cardio|sleep)
    // ==========================================
    O2.handleAction = (action) => {
        if (!action) return;
        setTimeout(() => {
            if (action === 'start') O2.orb();
            else if (action === 'water') O2.quickWater();
            else if (action === 'cardio') O2.cardioSheet();
            else if (action === 'sleep') O2.logSheet('sleep');
            else if (action === 'food') { O2.go('fuel'); O2.foodSheet(O2.dayKey()); }
            else if (action === 'academy') O2.go('academy');
        }, 500);
    };
    O2.consumeLaunchAction = () => {
        const params = new URLSearchParams(location.search);
        const action = params.get('action');
        if (!action) return;
        params.delete('action');
        history.replaceState(history.state, '', location.pathname + (params.toString() ? '?' + params : ''));
        O2.handleAction(action);
    };
    // Bildirime dokunulunca (Android)
    document.addEventListener('DOMContentLoaded', () => {
        const plugin = LN();
        if (plugin && plugin.addListener) plugin.addListener('localNotificationActionPerformed', (e) => O2.handleAction(e && e.notification && e.notification.extra && e.notification.extra.action));
        if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.olyAction) O2.handleAction(e.data.olyAction); });
        scheduleWebReminders();
        // Haftalık bildirim takvimini her açılışta tazele (izin istemeden); e-posta servisine günde bir kez bildir
        setTimeout(() => O2.applyReminders({ silent: true }), 5000);
        if (typeof auth !== 'undefined') auth.onAuthStateChanged(u => { if (u) setTimeout(() => O2.syncMailReminder(), 6000); });
    });
})();
