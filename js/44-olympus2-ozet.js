// Olympus Training — Günün özeti (sabah brifingi), akıllı uyarılar, haftalık değerlendirme ve tek dokunuşla kayıt
// Bütün modüllerin verisini okuyup tek bakışta gösterir; bildirim takvimine 'briefing', 'alerts', 'review' kaynaklarını ekler.
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);

    const lastOf = (key) => { const l = LS.get(key, []) || []; return l[l.length - 1]; };
    const histOnDay = (key, d) => (LS.get(key, []) || []).filter(h => { const x = O2.parseDate(h.date); return x && O2.dayKey(x) === O2.dayKey(d); });
    const sessionTitle = (p) => String(p.title || '').split(':').pop().trim();

    // ==========================================
    // ☀️ GÜNÜN ÖZETİ
    // ==========================================
    O2.briefing = (i = 0) => {
        const day = O2.addDays(O2.startOfDay(), i);
        const dk = O2.dayKey(day);
        const plan = O2.dayPlan(i);
        const trained = O2.sessions().some(s => s.dayKey === dk && s.type !== 'cardio');
        const flow = O2.flowDayInfo ? O2.flowDayInfo(day) : { blocks: [], done: 0, total: 0 };
        const nowMin = i === 0 ? new Date().getHours() * 60 + new Date().getMinutes() : 0;
        const nextBlocks = flow.blocks.filter(b => !b.done && b.end > nowMin).slice(0, 3);
        const acad = O2.academySummary ? O2.academySummary() : null;
        const exam = acad && acad.dates.map(d => ({ ...d, left: d.left - i })).filter(d => d.left >= 0).sort((a, b) => a.left - b.left)[0];
        const out = {
            session: plan.isRest ? 'Dinlenme günü' : trained ? `${sessionTitle(plan)} ✓` : sessionTitle(plan),
            rest: plan.isRest, trained, nextBlocks, flow,
            exam: exam ? `${exam.label}: ${exam.left === 0 ? 'bugün' : exam.left + ' gün'}` : '',
            gaps: []
        };
        if (i === 0) {
            const y = O2.addDays(day, -1);
            const w = O2.water();
            if (w.yesterday > 0 && w.goal && w.yesterday < w.goal * .8) out.gaps.push(`Dün su hedefinin %${Math.round(w.yesterday / w.goal * 100)}'i içildi`);
            if (!histOnDay('olympus_sleep_history', day).length) out.gaps.push('Bu geceki uykunu kaydet');
            const yFlow = O2.flowDayInfo ? O2.flowDayInfo(y) : null;
            if (yFlow && yFlow.total && yFlow.done / yFlow.total < .5) out.gaps.push(`Dün akışın ${yFlow.done}/${yFlow.total} bloğu tamamlandı`);
            const a = LS.get('oly2_academy', null);
            if (a && a.examMode !== undefined && !(a.days || []).includes(O2.dayKey(y)) && acad) out.gaps.push('Dün Akademi çalışması yapılmadı');
            out.readiness = O2.readiness();
        }
        return out;
    };

    O2.briefingCard = () => {
        const b = O2.briefing(0);
        const hidden = LS.raw('oly2_brief_hide', '') === O2.dayKey();
        const h = new Date().getHours();
        if (hidden) return '';
        return `
        <div class="o2-card o2-brief">
            <div class="o2-brief-head">
                <div><div class="o2-eyebrow">${h < 12 ? '☀️ Günün özeti' : h < 18 ? '🌤 Günün durumu' : '🌙 Günün kapanışı'}</div>
                <h4>${b.rest ? 'Bugün toparlanma günü' : b.trained ? 'Antrenman tamam, gün yolunda' : `Bugün: ${esc(b.session)}`}</h4></div>
                <button class="o2-icon-btn" style="width:30px;height:30px;border:0;background:none" onclick="O2.hideBriefing()" aria-label="Bugün gizle">${I('close')}</button>
            </div>
            <div class="o2-brief-chips">
                <span>${I('bolt')}Hazırlık ${b.readiness.score}</span>
                ${b.flow.total ? `<span>${I('clock')}Akış ${b.flow.done}/${b.flow.total}</span>` : ''}
                ${b.exam ? `<span>${I('shield')}${esc(b.exam)}</span>` : ''}
            </div>
            ${b.nextBlocks.length ? `<div class="o2-brief-blocks">${b.nextBlocks.map(x => `<div style="--c:${x.color}"><b>${esc(x.time)}</b><span>${esc(x.title)}</span></div>`).join('')}</div>` : ''}
            ${b.gaps.length ? `<ul class="o2-brief-gaps">${b.gaps.slice(0, 3).map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
        </div>`;
    };
    O2.hideBriefing = () => { localStorage.setItem('oly2_brief_hide', O2.dayKey()); O2.render(); };

    // ==========================================
    // ⚠️ AKILLI UYARILAR
    // ==========================================
    O2.smartAlerts = () => {
        const out = [];
        const today = O2.startOfDay();
        const add = (id, level, icon, title, text, action) => out.push({ id, level, icon, title, text, action });

        // Uyku: son 3 kayıt 6,5 saatin altında
        const sleeps = (LS.get('olympus_sleep_history', []) || []).slice(-3).map(s => parseFloat(s.val)).filter(Boolean);
        if (sleeps.length === 3 && sleeps.every(v => v < 6.5)) add('sleep', 'warn', 'moon', `${sleeps.length} gündür uyku 6,5 saatin altında`, 'Bugün yoğunluğu RPE 7\'de tut, akşam ekranı erken kapat.', 'flow');

        // Protein: kayıt girilen son 2 günde hedefin %70'inin altında
        const lowP = [1, 2].map(n => {
            const d = O2.addDays(today, -n), key = O2.dayKey(d);
            const t = O2.foodTotals(key);
            if (!t.kcal) return null;
            const day = O2.diet()[O2.dayIndex(-n, 7) + 1];
            const target = O2.macros(day ? day.title : '').protein;
            return t.p < target * .7 ? Math.round(t.p / target * 100) : null;
        });
        if (lowP.every(x => x !== null)) add('protein', 'warn', 'fuel', `Protein 2 gündür hedefin %${Math.max(...lowP)}'inde`, 'Her öğüne bir protein kaynağı ekle ya da ara öğünde whey/süzme yoğurt.', 'fuel');

        // Su: dün hedefin %60'ının altında
        const w = O2.water();
        if (w.goal && w.yesterday !== undefined && w.yesterday > 0 && w.yesterday < w.goal * .6) add('water', 'info', 'drop', 'Dün az su içildi', `Hedefin %${Math.round(w.yesterday / w.goal * 100)}'i. Bugün su hatırlatıcılarını açmayı düşün.`, 'water');

        // Antrenman: 4 gündür seans yok (dinlenme günleri hariç)
        const lastS = O2.sessions().filter(s => s.type !== 'cardio').slice(-1)[0];
        const gap = lastS ? Math.floor((Date.now() - lastS.endedAt) / 864e5) : null;
        if (gap !== null && gap >= 4) add('gap', 'warn', 'train', `${gap} gündür antrenman yok`, 'Ekspres seansla (4 hareket, 30 dk) ritmi geri kazan.', 'start');

        // Hazırlık düşük ve bugün antrenman günü
        const r = O2.readiness(), plan = O2.dayPlan(0);
        if (!plan.isRest && r.score < 50) add('ready', 'warn', 'bolt', `Hazırlık skoru ${r.score}`, 'Ağırlıkları %10 düşür ya da ekspres seans yap; sakatlık riskini azalt.', 'start');

        // Akademi: son 14 günde ana test gelişmiyor (en az 3 kayıt)
        const a = LS.get('oly2_academy', null);
        if (a && (a.tests || []).length >= 3) {
            const isTime = (a.tests.slice(-1)[0].res || {}).parkur !== undefined || (a.tests.slice(-1)[0].res || {}).run400 !== undefined;
            const key = (a.tests.slice(-1)[0].res || {}).parkur !== undefined ? 'parkur' : Object.keys(a.tests.slice(-1)[0].res || {})[0];
            const since = O2.dayKey(O2.addDays(today, -14));
            const recent = a.tests.filter(t => t.d >= since && t.res && t.res[key] !== undefined).map(t => t.res[key]);
            const older = a.tests.filter(t => t.d < since && t.res && t.res[key] !== undefined).map(t => t.res[key]);
            if (recent.length && older.length) {
                const bestR = isTime ? Math.min(...recent) : Math.max(...recent), bestO = isTime ? Math.min(...older) : Math.max(...older);
                if (isTime ? bestR >= bestO : bestR <= bestO) add('stall', 'warn', 'shield', '2 haftadır test sonucun gelişmiyor', 'Kronometrede tur sürelerine bak; en yavaş istasyona ayrı çeviklik bloğu ekle.', 'academy');
            }
        }

        // Akış: dün yarısından azı tamamlandı
        const yFlow = O2.flowDayInfo ? O2.flowDayInfo(O2.addDays(today, -1)) : null;
        if (yFlow && yFlow.total >= 4 && yFlow.done / yFlow.total < .4) add('flow', 'info', 'clock', `Dün akışın ${yFlow.done}/${yFlow.total} bloğu tamamlandı`, 'Rutin fazla mı yoğun? Bir bloğu kısalt ya da AI ile yeniden planla.', 'flow');

        // İyi haber: haftalık hedef bitti
        const wk = O2.weekStats(0);
        if (wk.sessions >= O2.settings().weeklyTarget) add('goal', 'good', 'trophy', 'Haftalık antrenman hedefi tamam', `${wk.sessions} seans. Kalan günlerde toparlanmaya odaklan.`, '');

        const dismissed = LS.get('oly2_alert_dismiss', {}) || {};
        return out.filter(x => dismissed[x.id] !== O2.dayKey());
    };
    O2.alertsHTML = (max = 3) => {
        const list = O2.smartAlerts().slice(0, max);
        if (!list.length) return '';
        return `<div class="o2-alerts">${list.map(a => `
            <div class="o2-alert ${a.level}" ${a.action ? `onclick="O2.handleAction('${a.action}')" style="cursor:pointer"` : ''}>
                <i>${I(a.icon)}</i>
                <div><h5>${esc(a.title)}</h5><p>${esc(a.text)}</p></div>
                <button class="o2-icon-btn" style="width:28px;height:28px;border:0;background:none" onclick="event.stopPropagation(); O2.dismissAlert('${a.id}')" aria-label="Kapat">${I('close')}</button>
            </div>`).join('')}</div>`;
    };
    O2.dismissAlert = (id) => {
        const d = LS.get('oly2_alert_dismiss', {}) || {};
        d[id] = O2.dayKey();
        LS.set('oly2_alert_dismiss', d);
        O2.render();
    };

    // ==========================================
    // 📝 HAFTALIK DEĞERLENDİRME (Pazar akşamı – Pazartesi)
    // ==========================================
    const reviewWeek = () => {
        const d = new Date(), wd = d.getDay(); // 0 = Pazar
        // Pazar / Cumartesi akşamı: bu hafta; Pazartesi: geçen hafta
        return O2.isoWeekId(wd === 1 ? O2.addDays(d, -1) : d);
    };
    const reviewOpen = () => { const d = new Date(), wd = d.getDay(); return wd === 0 || wd === 1 || (wd === 6 && d.getHours() >= 18); };
    O2.reviewCard = () => {
        if (!reviewOpen()) return '';
        const done = (LS.get('oly2_reviews', {}) || {})[reviewWeek()];
        if (done) return '';
        return `
        <div class="o2-card o2-card-glow is-tap" style="margin-top:12px" onclick="O2.reviewSheet()">
            <div class="o2-coach"><div class="o2-coach-orb">${I('list')}</div>
            <div style="flex:1"><h4>Haftanı değerlendir · 3 dk</h4><p>Ne iyi gitti, ne zorladı? AI gelecek haftanı buna göre planlasın.</p></div>${I('chev', 'chev')}</div>
        </div>`;
    };
    function weekSummary() {
        const offset = new Date().getDay() === 1 ? 1 : 0;
        const w = O2.weekStats(offset);
        const start = O2.addDays(O2.weekStart(), -7 * offset);
        let flowDone = 0, flowTotal = 0, waterDays = 0, sleepSum = 0, sleepN = 0;
        for (let i = 0; i < 7; i++) {
            const d = O2.addDays(start, i);
            if (d > new Date()) break;
            const f = O2.flowDayInfo ? O2.flowDayInfo(d) : { done: 0, total: 0 };
            flowDone += f.done; flowTotal += f.total;
            const s = histOnDay('olympus_sleep_history', d)[0];
            if (s) { sleepSum += parseFloat(s.val) || 0; sleepN++; }
        }
        return { sessions: w.sessions, volume: Math.round(w.volume), km: w.km || 0, flowPct: flowTotal ? Math.round(flowDone / flowTotal * 100) : null, sleepAvg: sleepN ? Math.round(sleepSum / sleepN * 10) / 10 : null, waterDays };
    }
    const RATE = [['energy', 'Enerji'], ['mood', 'Ruh hali'], ['stress', 'Stres (düşük iyi)'], ['sleepQ', 'Uyku kalitesi']];
    const FOCUS = ['Kuvvet', 'Kondisyon', 'Beslenme', 'Uyku', 'Akademi', 'Düzen', 'Esneklik'];
    O2.reviewSheet = () => {
        const s = weekSummary();
        const wk = reviewWeek();
        const prev = (LS.get('oly2_reviews', {}) || {})[wk] || {};
        O2.sheet('Haftalık değerlendirme', `
            <div class="o2-grid-3">
                <div class="o2-card o2-stat"><small>Seans</small><strong>${s.sessions}</strong></div>
                <div class="o2-card o2-stat" style="margin-top:0"><small>Akış</small><strong>${s.flowPct === null ? '—' : '%' + s.flowPct}</strong></div>
                <div class="o2-card o2-stat" style="margin-top:0"><small>Uyku ort.</small><strong>${s.sleepAvg === null ? '—' : s.sleepAvg}</strong></div>
            </div>
            ${RATE.map(([k, l]) => `
            <div class="o2-field"><label>${l}</label><div class="o2-rate" data-k="${k}">${[1, 2, 3, 4, 5].map(n => `<button class="${prev[k] === n ? 'on' : ''}" onclick="this.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === this))">${['😣', '😕', '😐', '🙂', '🤩'][n - 1]}</button>`).join('')}</div></div>`).join('')}
            <div class="o2-field"><label>Bu hafta iyi giden</label><textarea class="o2-input" id="o2-rv-good" rows="2" style="height:auto;padding:12px">${esc(prev.good || '')}</textarea></div>
            <div class="o2-field"><label>Zorlayan / geliştirilecek</label><textarea class="o2-input" id="o2-rv-hard" rows="2" style="height:auto;padding:12px">${esc(prev.hard || '')}</textarea></div>
            <div class="o2-grid-2">
                <div class="o2-field"><label>Gelecek hafta seans hedefi</label><input class="o2-input" id="o2-rv-target" inputmode="numeric" value="${prev.target || O2.settings().weeklyTarget}"></div>
                <div class="o2-field"><label>Odak</label><div class="o2-chips" id="o2-rv-focus">${FOCUS.map(f => `<button class="o2-chip ${(prev.focus || []).includes(f) ? 'gold' : ''}" onclick="this.classList.toggle('gold')">${f}</button>`).join('')}</div></div>
            </div>
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:16px" onclick="O2.reviewSave()">${I('check')}Kaydet ve AI önerisi al</button>
            <div id="o2-rv-ai"></div>`);
    };
    O2.reviewSave = async () => {
        const wk = reviewWeek();
        const data = { at: Date.now(), summary: weekSummary(), good: $('o2-rv-good').value.trim().slice(0, 300), hard: $('o2-rv-hard').value.trim().slice(0, 300), target: Math.max(1, Math.min(14, parseInt($('o2-rv-target').value) || 4)), focus: [...document.querySelectorAll('#o2-rv-focus .gold')].map(x => x.textContent) };
        document.querySelectorAll('.o2-rate').forEach(r => { const on = r.querySelector('.on'); data[r.dataset.k] = on ? [...r.children].indexOf(on) + 1 : null; });
        const all = LS.get('oly2_reviews', {}) || {};
        all[wk] = data;
        LS.set('oly2_reviews', all);
        O2.saveSettings({ weeklyTarget: data.target });
        O2.toast('Değerlendirme kaydedildi', 'check');
        const box = $('o2-rv-ai');
        if (!box) return;
        if (!localStorage.getItem('OLY_API_KEY') || typeof askGeminiAI !== 'function') {
            box.innerHTML = `<div class="o2-acad-ai" style="margin-top:14px"><small>Öneri</small><p>${esc(localAdvice(data))}</p></div>`;
            return;
        }
        box.innerHTML = '<div class="o2-acad-ai" style="margin-top:14px"><p>Gemini gelecek haftanı planlıyor…</p></div>';
        try {
            const acad = O2.academySummary && O2.academySummary();
            const text = await askGeminiAI(`Sporcunun haftalık değerlendirmesi: ${data.summary.sessions} seans, akış tamamlama %${data.summary.flowPct ?? '?'}, ort. uyku ${data.summary.sleepAvg ?? '?'} saat. Enerji ${data.energy}/5, ruh hali ${data.mood}/5, stres ${data.stress}/5, uyku kalitesi ${data.sleepQ}/5. İyi giden: "${data.good}". Zorlayan: "${data.hard}". Gelecek hafta hedef ${data.target} seans, odak: ${data.focus.join(', ') || 'belirtilmedi'}.${acad ? ` ${acad.branch} ${acad.track} sınavına hazırlanıyor (${acad.dates.map(d => `${d.label} ${d.left} gün`).join(', ')}).` : ''} Gelecek hafta için 5 maddelik somut plan yaz (antrenman günleri, günlük rutin, beslenme, uyku, Akademi). Türkçe, en fazla 120 kelime.`);
            box.innerHTML = `<div class="o2-acad-ai" style="margin-top:14px"><small>Gelecek haftan</small><p>${esc(text || '').replace(/\*\*/g, '').replace(/\n/g, '<br>')}</p></div>`;
        } catch (e) {
            box.innerHTML = `<div class="o2-acad-ai" style="margin-top:14px"><small>Öneri</small><p>${esc(localAdvice(data))}</p></div>`;
        }
    };
    function localAdvice(d) {
        const tips = [];
        if (d.energy && d.energy <= 2) tips.push('Enerjin düşük: bu hafta bir seansı aktif dinlenmeye çevir, uykuya 30 dk ekle.');
        if (d.stress && d.stress >= 4) tips.push('Stres yüksek: Akış\'a her akşam 10 dk nefes/yürüyüş bloğu ekle.');
        if (d.summary.flowPct !== null && d.summary.flowPct < 60) tips.push('Akışın yarıda kalıyor: rutini 1-2 blok sadeleştir, sabah bloklarını koru.');
        if (d.summary.sleepAvg && d.summary.sleepAvg < 7) tips.push('Uyku ortalaman 7 saatin altında: yatış saatini 30 dk öne çek.');
        if (d.focus.includes('Akademi')) tips.push('Akademi odağı: her gün 10 kart + 2 test simülasyonu planla.');
        if (!tips.length) tips.push('Ritmin iyi. Aynı düzeni koru ve ana harekette küçük bir yük artışı dene.');
        return tips.join(' ');
    }
    O2.reviewsHTML = () => {
        const all = LS.get('oly2_reviews', {}) || {};
        const keys = Object.keys(all).sort().slice(-4).reverse();
        if (!keys.length) return '';
        return `
        <div class="o2-section-head"><h3>Haftalık değerlendirmeler</h3><button class="o2-link" onclick="O2.reviewSheet()">Bu hafta</button></div>
        <div class="o2-card" style="padding:4px 16px"><div class="o2-list">${keys.map(k => {
            const r = all[k];
            return `<div class="o2-row"><div class="o2-row-idx" style="font-size:11px;font-weight:800">${esc(k.split('-W')[1] ? 'H' + k.split('-W')[1] : k)}</div>
                <div class="o2-row-main"><h5>${r.summary.sessions} seans · enerji ${r.energy || '—'}/5 · stres ${r.stress || '—'}/5</h5><p>${esc(r.good || r.hard || (r.focus || []).join(', ') || 'Not yok')}</p></div></div>`;
        }).join('')}</div></div>`;
    };
    // İlerleme sekmesindeki haftalık koç kartının altına geçmiş değerlendirmeler
    const baseCoach = O2.weeklyCoachHTML;
    if (baseCoach) O2.weeklyCoachHTML = () => baseCoach() + O2.reviewsHTML();

    // ==========================================
    // 👆 TEK DOKUNUŞLA KAYIT (bildirim düğmeleri)
    // ==========================================
    O2.quickAct = (act) => {
        const [name, a, b] = String(act || '').split(':');
        if (name === 'water250' || name === 'water') { O2.addWater(250); O2.toast('+250 ml su kaydedildi', 'drop'); }
        else if (name === 'flowdone' && O2.flowMarkDone) { O2.flowMarkDone(a, b); O2.toast('Blok tamamlandı', 'check'); }
        else if (name === 'mealdone' && O2.mealMarkEaten) { O2.mealMarkEaten(a, b); O2.toast('Öğün günlüğe eklendi', 'fuel'); }
        else return;
        if (O2.refreshNotifications) O2.refreshNotifications();
        if (O2.ui && !O2.isSheetOpen()) O2.render();
    };
    // Service worker kuyruğundaki (uygulama kapalıyken basılan) düğmeleri işle
    O2.drainQuickQueue = () => new Promise((resolve) => {
        if (!('indexedDB' in window)) return resolve(0);
        const open = indexedDB.open('olympus-sw', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('queue', { autoIncrement: true });
        open.onerror = () => resolve(0);
        open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction('queue', 'readwrite');
            const store = tx.objectStore('queue');
            const req = store.getAll();
            req.onsuccess = () => {
                const items = (req.result || []).filter(x => Date.now() - x.t < 48 * 36e5);
                store.clear();
                tx.oncomplete = () => { items.forEach(x => O2.quickAct(x.act)); resolve(items.length); };
            };
            req.onerror = () => resolve(0);
        };
    });

    // ==========================================
    // 🔔 BİLDİRİM KAYNAKLARI
    // ==========================================
    if (O2.registerNotifySource) {
        O2.registerNotifySource('briefing', (day, i, r) => {
            const b = O2.briefing(i);
            const [h, m] = String(r.briefingTime || '07:30').split(':').map(Number);
            const first = O2.flowDayInfo ? O2.flowDayInfo(day).blocks.find(x => x.start >= h * 60 + m) : null;
            const parts = [b.rest ? 'Toparlanma günü' : `Antrenman: ${b.session}`, first ? `${first.time} ${first.title}` : '', b.exam].filter(Boolean);
            return [{ key: 'brief', h, m, title: '☀️ Günün özeti', body: parts.join(' · '), action: 'today' }];
        });
        O2.registerNotifySource('review', (day) => day.getDay() === 0 ? [{ key: 'review', h: 20, m: 0, title: '📝 Haftanı değerlendir', body: '3 dakika: ne iyi gitti, ne zorladı? Gelecek haftanı birlikte planlayalım.', action: 'review' }] : []);
        O2.registerNotifySource('alerts', (day, i) => {
            if (i !== 0) return [];
            const warn = O2.smartAlerts().filter(a => a.level === 'warn');
            return warn.length ? [{ key: 'alert', h: 12, m: 30, title: `⚠️ ${warn[0].title}`, body: warn[0].text, action: warn[0].action || 'today' }] : [];
        });
    }
    O2.actions = O2.actions || {};
    O2.actions.today = () => O2.go('today');
    O2.actions.review = () => { O2.go('today'); setTimeout(() => O2.reviewSheet(), 300); };

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => O2.drainQuickQueue(), 2500);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) O2.drainQuickQueue(); });
        if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.olyQueue) O2.drainQuickQueue(); });
        // Android: bildirim düğmeleri
        const LN = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
        if (LN && LN.registerActionTypes) LN.registerActionTypes({ types: [
            { id: 'OLY_DONE', actions: [{ id: 'quick', title: 'Tamamlandı ✓' }] },
            { id: 'OLY_MEAL', actions: [{ id: 'quick', title: 'Yedim ✓' }] },
            { id: 'OLY_WATER', actions: [{ id: 'quick', title: '+250 ml 💧' }] }
        ] }).catch(() => { });
    });
})();
