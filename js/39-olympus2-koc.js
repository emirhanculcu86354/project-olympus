// Olympus Training — haftalık koç (veriye dayalı plan + Gemini) ve haftalık liderlik tablosu
// Liderlik: Firestore leaderboard/{haftaId}/users/{uid} — yalnızca "Sıralamada görün" açık olanlar yazılır.
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);

    // ==========================================
    // 🧠 HAFTALIK KOÇ
    // ==========================================
    // Kas dengesi, plato, hazırlık ve hedef seans sayısından bu hafta için 3 somut adım üretir
    O2.weeklyPlan = () => {
        const s = O2.settings();
        const w0 = O2.weekStats(0), w1 = O2.weekStats(1);
        const sets = O2.weeklySetsByMuscle ? O2.weeklySetsByMuscle() : {};
        const dayOfWeek = (new Date().getDay() + 6) % 7; // Pazartesi = 0
        const daysLeft = 7 - dayOfWeek;
        const need = Math.max(0, s.weeklyTarget - w0.sessions);
        const r = O2.readiness();
        const steps = [];

        if (need === 0) steps.push({ icon: 'trophy', tone: 'var(--o2-green)', text: `Haftalık hedef tamam (${w0.sessions}/${s.weeklyTarget}). Kalan günlerde hafif kardiyo ve mobiliteyle toparlan.` });
        else if (need > daysLeft) steps.push({ icon: 'bolt', tone: 'var(--o2-orange)', text: `Hedefe ${need} seans var ama ${daysLeft} gün kaldı. Ekspres (4 hareket) seanslarla en az ${daysLeft} seans yap.` });
        else steps.push({ icon: 'clock', tone: 'var(--o2-gold)', text: `Hedefe ${need} seans kaldı · ${daysLeft} gün içinde. ${need >= daysLeft - 1 ? 'Dinlenme gününü kaçırma ama araya boşluk koyma.' : 'Rahat bir tempo, kaliteye odaklan.'}` });

        const trained = Object.values(sets).some(v => v > 0);
        const under = Object.entries(sets).filter(([m, v]) => m !== 'core' && v < 10).sort((a, b) => a[1] - b[1]).slice(0, 2);
        if (trained && under.length) steps.push({ icon: 'train', tone: 'var(--o2-blue)', text: `${under.map(([m, v]) => `${O2.MUSCLES[m]} (${v} set)`).join(' ve ')} haftalık 10 setin altında. Sonraki seanslara 3-4 set ekle.` });

        const plateau = (O2.coachInsights() || []).find(t => /plato|takıl|durağan/i.test(t));
        if (plateau) steps.push({ icon: 'spark', tone: 'var(--o2-violet)', text: plateau.replace(/<[^>]+>/g, '') });
        else if (w1.volume && w0.volume > w1.volume * 1.25) steps.push({ icon: 'heart', tone: 'var(--o2-violet)', text: `Hacmin geçen haftadan %${Math.round((w0.volume / w1.volume - 1) * 100)} fazla. Uykuya ve proteine dikkat; bir sonraki hafta deload düşün.` });
        else if (r.score < 55) steps.push({ icon: 'moon', tone: 'var(--o2-violet)', text: `Hazırlık skorun ${r.score}. Bu hafta yoğunluğu RPE 7-8'de tut, 7+ saat uyu.` });
        else steps.push({ icon: 'spark', tone: 'var(--o2-violet)', text: 'Ana hareketlerde her set sonrası RPE gir: koç yükü ona göre ayarlar (RPE ≤7 → yükle, 10 → aynı kal).' });

        const acad = O2.academySummary && O2.academySummary();
        if (acad) {
            const next = acad.dates.sort((a, b) => a.left - b.left)[0];
            if (next && next.left <= 21) steps.push({ icon: 'shield', tone: acad.color, text: `${next.label} ${next.left === 0 ? 'bugün' : `${next.left} gün sonra`}: haftada en az 2 test simülasyonu ve her gün 10 mülakat kartı.` });
        }
        return { steps: steps.slice(0, 4), w0, need, daysLeft };
    };

    O2.weeklyCoachHTML = () => {
        const p = O2.weeklyPlan();
        return `
        <div class="o2-section-head"><h3>Haftalık koç</h3><button class="o2-link" onclick="O2.aiWeekSheet()">✦ AI planı</button></div>
        <div class="o2-card o2-card-glow" style="padding:6px 18px 10px">
            <div class="o2-list">${p.steps.map(s => `
                <div class="o2-row">
                    <div class="o2-row-idx" style="color:${s.tone}">${I(s.icon)}</div>
                    <div class="o2-row-main"><p style="color:var(--o2-text-2);font-size:13px;line-height:1.5;margin:0">${esc(s.text)}</p></div>
                </div>`).join('')}</div>
        </div>`;
    };

    O2.aiWeekSheet = async () => {
        O2.sheet('Haftalık AI planı', `<div id="o2-ai-week" class="o2-acad-ai" style="margin-top:0"><p>Gemini son iki haftanı inceliyor…</p></div>`);
        const s = O2.settings(), w0 = O2.weekStats(0), w1 = O2.weekStats(1);
        const sets = O2.weeklySetsByMuscle ? O2.weeklySetsByMuscle() : {};
        const bests = Object.entries(O2.bests()).sort((a, b) => b[1].e1rm - a[1].e1rm).slice(0, 5).map(([n, b]) => `${n}: ${b.w}kg×${b.r}`).join(', ');
        const acad = O2.academySummary && O2.academySummary();
        const prompt = `Kullanıcının antrenman verisi: Bu hafta ${w0.sessions} seans, ${Math.round(w0.volume)} kg hacim; geçen hafta ${w1.sessions} seans, ${Math.round(w1.volume)} kg. Haftalık hedef ${s.weeklyTarget} seans. Son 7 gün kas başına set: ${Object.entries(sets).map(([m, v]) => `${O2.MUSCLES[m]} ${v}`).join(', ')}. En iyi setler: ${bests || 'yok'}. Hazırlık skoru: ${O2.readiness().score}/100.${acad ? ` Ayrıca ${acad.branch} ${acad.track} sınavına hazırlanıyor (hazırlık ${acad.score}/100${acad.dates.length ? `, ${acad.dates.map(d => `${d.label} ${d.left} gün`).join(', ')}` : ''}).` : ''}
Bu verilere göre önümüzdeki 7 gün için kısa, uygulanabilir bir plan yaz: gün gün 1 satır, sonunda 2 maddelik dikkat notu. Türkçe, en fazla 140 kelime, madde işaretli.`;
        try {
            const text = await askGeminiAI(prompt);
            const el = $('o2-ai-week');
            if (el) el.innerHTML = `<small>Önümüzdeki 7 gün</small><p>${esc(text || '').replace(/\*\*/g, '').replace(/\n/g, '<br>')}</p>`;
        } catch (e) {
            const el = $('o2-ai-week');
            if (el) el.innerHTML = `<p>${esc(e.message || 'Plan alınamadı. Ayarlardan Gemini anahtarını kontrol et.')}</p>`;
        }
    };

    // ==========================================
    // 🏆 HAFTALIK LİDERLİK TABLOSU
    // ==========================================
    const user = () => (typeof auth !== 'undefined' && auth.currentUser) || null;
    const weekScore = (w) => Math.round(w.sessions * 100 + w.volume / 100 + (w.km || 0) * 20);
    const lbRef = (weekId) => db.collection('leaderboard').doc(weekId).collection('users');

    let lbTimer = null;
    O2.pushLeaderboard = () => {
        clearTimeout(lbTimer);
        lbTimer = setTimeout(() => {
            const u = user();
            if (!u || !O2.settings().leaderboard) return;
            const w = O2.weekStats(0);
            lbRef(O2.isoWeekId()).doc(u.uid).set({
                name: O2.userName(), photo: u.photoURL || '',
                sessions: w.sessions, volume: Math.round(w.volume), km: Math.round((w.km || 0) * 10) / 10,
                score: weekScore(w), t: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(err => console.warn('Liderlik tablosu yazılamadı:', err));
        }, 1500);
    };
    // Her bulut kaydında (seans, ayar) sıralamayı da güncelle
    const baseCloudSave = O2.cloudSave;
    O2.cloudSave = function () { baseCloudSave.apply(this, arguments); O2.pushLeaderboard(); };

    O2.leaderboardSheet = async () => {
        const u = user();
        const on = !!O2.settings().leaderboard;
        O2.sheet('Haftalık sıralama', `
            <div class="o2-toggle-row" onclick="O2.toggleLeaderboard()">
                <div><h5>Sıralamada görün</h5><p>Adın, profil fotoğrafın ve bu haftaki seans/hacim/km bilgin diğer Olympus sporcularına görünür.</p></div>
                <span class="o2-switch ${on ? 'on' : ''}"></span>
            </div>
            <p style="margin:10px 0 0;font-size:12px;color:var(--o2-text-3)">Puan = seans × 100 + hacim/100 + km × 20 · her pazartesi sıfırlanır</p>
            <div class="o2-card" style="padding:4px 14px;margin-top:12px" id="o2-lb-list"><div class="o2-empty">${u ? 'Yükleniyor…' : 'Sıralamayı görmek için giriş yap.'}</div></div>`);
        if (!u) return;
        try {
            const snap = await lbRef(O2.isoWeekId()).orderBy('score', 'desc').limit(30).get();
            const rows = [];
            snap.forEach(d => rows.push({ uid: d.id, ...d.data() }));
            const el = $('o2-lb-list');
            if (!el) return;
            el.innerHTML = rows.length ? rows.map((r, i) => `
                <div class="o2-leader ${r.uid === u.uid ? 'me' : ''}">
                    <span class="o2-leader-rank">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
                    <img src="${esc(r.photo || 'icon.png')}" alt="" onerror="this.src='icon.png'">
                    <div class="o2-row-main"><h5>${esc(r.name || 'Sporcu')}</h5><p>${r.sessions} seans · ${O2.fmtNum((r.volume || 0) / 1000, 1)} ton${r.km ? ` · ${O2.fmtNum(r.km, 1)} km` : ''}</p></div>
                    <div class="o2-row-end"><strong>${O2.fmtNum(r.score)}</strong>puan</div>
                </div>`).join('') : `<div class="o2-empty">Bu hafta henüz kimse yok. ${on ? 'İlk seansınla zirveye yerleş!' : 'Katıl ve ilk sen ol.'}</div>`;
        } catch (e) {
            const el = $('o2-lb-list');
            if (el) el.innerHTML = `<div class="o2-empty">Sıralama okunamadı. Firestore kurallarına "leaderboard" izni eklenmeli (firestore.rules).</div>`;
        }
    };
    O2.toggleLeaderboard = () => {
        const on = !O2.settings().leaderboard;
        O2.saveSettings({ leaderboard: on });
        const u = user();
        if (!on && u) lbRef(O2.isoWeekId()).doc(u.uid).delete().catch(() => { });
        O2.toast(on ? 'Sıralamaya katıldın' : 'Sıralamadan çıktın', 'trophy');
        setTimeout(() => O2.leaderboardSheet(), on ? 1800 : 300);
    };
})();
