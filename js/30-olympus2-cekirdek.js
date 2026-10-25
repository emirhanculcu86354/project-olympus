// Olympus 2.0 spor modülü — çekirdek: veri katmanı, hesap motorları, bulut senkronu, haftalık rapor
// Eski Olympus verilerini (olympus_* anahtarları) okur ve geriye dönük uyumlu yazar; klasik ekran da aynı veriyi görür.
(function () {
    const O2 = window.O2 = window.O2 || {};

    // ==========================================
    // 💾 DEPOLAMA
    // ==========================================
    const LS = {
        get(key, fallback) {
            try {
                const v = localStorage.getItem(key);
                return v === null ? fallback : JSON.parse(v);
            } catch (e) { return fallback; }
        },
        set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
        raw(key, fallback) { const v = localStorage.getItem(key); return v === null ? fallback : v; }
    };
    O2.LS = LS;

    const DEFAULT_SETTINGS = { program: 'p1', restSec: 90, weeklyMail: true, weeklyTarget: 5, kcalGoal: 600 };
    O2.settings = () => ({ ...DEFAULT_SETTINGS, ...LS.get('oly2_settings', {}) });
    O2.saveSettings = (patch) => {
        LS.set('oly2_settings', { ...O2.settings(), ...patch });
        O2.cloudSave();
    };

    // ==========================================
    // 📅 TARİH YARDIMCILARI
    // ==========================================
    const pad = n => String(n).padStart(2, '0');
    const DAY_MS = 864e5;
    O2.dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    O2.trDate = (d = new Date()) => d.toLocaleDateString('tr-TR');
    // Eski kayıtlar "23.10.2026" biçiminde; yeniler ISO
    O2.parseDate = (s) => {
        if (!s) return null;
        const m = String(s).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
        const d = new Date(s);
        return isNaN(d) ? null : d;
    };
    // Kayıtlardaki karışık tarih biçimlerini tek tip gösterir: "7 Eki"
    O2.prettyDate = (s) => {
        const d = O2.parseDate(s);
        if (!d) return '';
        const sameYear = d.getFullYear() === new Date().getFullYear();
        return d.toLocaleDateString('tr-TR', sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
    };
    O2.startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    O2.addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    O2.weekStart = (d = new Date()) => { const x = O2.startOfDay(d); const wd = (x.getDay() + 6) % 7; return O2.addDays(x, -wd); };
    O2.WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    O2.fmtClock = (sec) => {
        sec = Math.max(0, Math.round(sec));
        const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
        return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    };
    O2.fmtNum = (n, d = 0) => Number(n || 0).toLocaleString('tr-TR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
    O2.greeting = () => {
        const h = new Date().getHours();
        if (h < 5) return 'İyi geceler';
        if (h < 12) return 'Günaydın';
        if (h < 18) return 'İyi günler';
        return 'İyi akşamlar';
    };
    O2.clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

    // ==========================================
    // 🏋️ PROGRAMLAR
    // ==========================================
    const PROGRAM_META = {
        p1: { name: 'Faz 1', sub: 'Push · Pull · Legs' },
        p2: { name: 'Faz 2', sub: 'Güç & Hacim' },
        p3: { name: 'Faz 3', sub: 'Pump & Detay' }
    };

    O2.programs = () => {
        if (document.body.classList.contains('dilala-mode') && typeof dilalaProgramData !== 'undefined') {
            return [{ id: 'dilala', name: 'Dilala', sub: 'Özel program', days: dilalaProgramData.p1 }];
        }
        const list = Object.keys(PROGRAM_META).map(id => ({ id, ...PROGRAM_META[id], days: programData[id] }));
        // Manuel program oluşturucuyla kaydedilen özel programlar artık gerçekten seçilebiliyor
        (LS.get('olympus_custom_profiles', []) || []).forEach(p => {
            if (Array.isArray(p.programData) && p.programData.length) {
                list.push({ id: p.id, name: p.name, sub: 'Özel program', days: p.programData });
            }
        });
        return list;
    };

    O2.activeProgram = () => {
        const list = O2.programs();
        return list.find(p => p.id === O2.settings().program) || list[0];
    };

    // Programın başlangıç tarihine göre bugünün (veya offset günün) indeksini verir
    O2.dayIndex = (offset = 0, length = 7) => {
        const startStr = LS.raw('olympus_start_date', O2.dayKey());
        const start = O2.startOfDay(O2.parseDate(startStr) || new Date());
        const target = O2.addDays(O2.startOfDay(), offset);
        const diff = Math.max(0, Math.round((target - start) / DAY_MS));
        return diff % length;
    };

    O2.dayPlan = (offset = 0, program = O2.activeProgram()) => {
        const days = program.days;
        const idx = O2.dayIndex(offset, days.length);
        const day = days[idx];
        return { ...day, index: idx, isRest: !!day.rest || !(day.ex && day.ex.length) };
    };

    // ==========================================
    // 💪 KAS GRUPLARI
    // ==========================================
    O2.MUSCLES = {
        chest: 'Göğüs', shoulders: 'Omuz', back: 'Sırt', biceps: 'Biceps', triceps: 'Triceps',
        core: 'Karın', quads: 'Ön Bacak', hamstrings: 'Arka Bacak', glutes: 'Kalça', calves: 'Kalf'
    };
    // Sıra önemli: daha özel kalıplar önce
    const MUSCLE_RULES = [
        [/calf/i, 'calves'],
        [/leg curl|romanian|\brdl\b|deadlift|hamstring|good morning/i, 'hamstrings'],
        [/hip thrust|glute|kickback/i, 'glutes'],
        [/squat|leg press|lunge|leg extension|hack|step.?up/i, 'quads'],
        [/plank|crunch|leg raise|sit.?up|\bab\b|core|russian/i, 'core'],
        [/curl/i, 'biceps'],
        [/pushdown|triceps|overhead.*ext|skull|close grip|kickback|^dips$|dips(?! \(chest)/i, 'triceps'],
        [/lateral|military|shoulder press|overhead press|\bohp\b|rear delt|face pull|arnold|upright/i, 'shoulders'],
        [/chest press|chest fly|pec deck|machine chest/i, 'chest'],
        [/pull.?up|pulldown|\brows?\b|\blat\b|shrug|\bchin/i, 'back'],
        [/bench|press|fly|chest|pec|dips|push.?up/i, 'chest']
    ];
    O2.muscleOf = (exName) => {
        for (const [re, m] of MUSCLE_RULES) if (re.test(exName)) return m;
        return 'core';
    };
    O2.musclesOfDay = (day) => [...new Set((day.ex || []).map(e => O2.muscleOf(e.name)))];

    // "4 x 6-8", "4 x Max", "3 x 60 sn", "100 tekrar"
    O2.parseScheme = (scheme = '') => {
        const s = String(scheme);
        const m = s.match(/(\d+)\s*[x×]\s*(.+)/i);
        const sets = m ? parseInt(m[1]) : 1;
        const rest = m ? m[2] : s;
        const isTime = /sn|sec|dk/i.test(rest);
        const range = rest.match(/(\d+)\s*-\s*(\d+)/);
        const single = rest.match(/(\d+)/);
        let low = null, high = null;
        if (range) { low = +range[1]; high = +range[2]; }
        else if (single) { low = high = +single[1]; }
        return { sets: O2.clamp(sets, 1, 12), low, high, isTime, isMax: /max/i.test(rest) };
    };

    O2.e1rm = (w, r) => {
        w = parseFloat(w); r = parseInt(r);
        if (!w || !r) return 0;
        return r <= 1 ? w : w * (1 + r / 30); // Epley
    };

    // Tahmini süre: set başına ~2.6 dk (çalışma + dinlenme)
    O2.estMinutes = (day) => Math.round((day.ex || []).reduce((a, e) => a + O2.parseScheme(e.scheme).sets, 0) * 2.6);

    // ==========================================
    // 📒 SEANS KAYITLARI
    // ==========================================
    O2.sessions = () => LS.get('oly2_sessions', []);
    O2.saveSessions = (list) => LS.set('oly2_sessions', list.slice(-300));

    // Eski "olympus_past_workouts" kayıtları + yeni seanslar: takvim/ısı haritası için tek kaynak
    O2.activityDays = () => {
        const set = new Set();
        O2.sessions().forEach(s => set.add(s.dayKey));
        (LS.get('olympus_past_workouts', []) || []).forEach(w => {
            const d = O2.parseDate(w.date);
            if (d) set.add(O2.dayKey(d));
        });
        return set;
    };

    // Egzersizin son performansı (yeni seanslardan, yoksa eski kayıttan)
    O2.lastPerformance = (exName) => {
        const list = O2.sessions();
        for (let i = list.length - 1; i >= 0; i--) {
            const ex = (list[i].exercises || []).find(e => e.name === exName);
            if (ex && ex.sets && ex.sets.length) return { sets: ex.sets, date: list[i].dayKey };
        }
        const legacy = (LS.get('olympus_ex_history', {}) || {})[exName];
        if (legacy && legacy.weight) return { sets: [{ w: +legacy.weight, r: +legacy.reps }], date: legacy.date, legacy: true };
        return null;
    };

    // Kişisel rekor tablosu: { egzersiz: { e1rm, w, r, date } }
    O2.bests = () => {
        const best = {};
        const put = (name, w, r, date) => {
            const e = O2.e1rm(w, r);
            if (!e) return;
            if (!best[name] || e > best[name].e1rm) best[name] = { e1rm: e, w: +w, r: +r, date };
        };
        Object.entries(LS.get('olympus_ex_history', {}) || {}).forEach(([n, v]) => put(n, v.weight, v.reps, v.date));
        O2.sessions().forEach(s => (s.exercises || []).forEach(ex => (ex.sets || []).forEach(st => put(ex.name, st.w, st.r, s.dayKey))));
        return best;
    };

    // Progresif yüklenme önerisi
    O2.suggest = (ex) => {
        const target = O2.parseScheme(ex.scheme);
        const last = O2.lastPerformance(ex.name);
        if (!last || target.isTime) return { w: last ? last.sets[0].w : '', r: target.isTime ? target.high : (target.high || ''), note: null };
        const top = last.sets.reduce((a, s) => (O2.e1rm(s.w, s.r) > O2.e1rm(a.w, a.r) ? s : a), last.sets[0]);
        const muscle = O2.muscleOf(ex.name);
        const bigLower = ['quads', 'hamstrings', 'glutes'].includes(muscle);
        if (target.high && top.r >= target.high) {
            const inc = bigLower ? 5 : 2.5;
            return { w: +top.w + inc, r: target.low || top.r, note: `Geçen sefer ${top.w} kg × ${top.r} ile aralığın tepesine ulaştın. Bugün <b>${+top.w + inc} kg</b> dene.` };
        }
        const nextR = target.high ? Math.min(target.high, (top.r || 0) + 1) : top.r;
        return { w: top.w, r: nextR, note: `Geçen sefer <b>${top.w} kg × ${top.r}</b>. Aynı ağırlıkla <b>${nextR} tekrar</b> hedefle.` };
    };

    // ==========================================
    // 🔋 TOPARLANMA & HAZIRLIK SKORU
    // ==========================================
    // Kas başına son çalışma zamanı: yeni seanslar + eski "worked_muscles_v2" (kaba gruplar)
    O2.muscleLastWorked = () => {
        const last = {};
        O2.sessions().forEach(s => (s.muscles || []).forEach(m => {
            last[m] = Math.max(last[m] || 0, s.endedAt || 0);
        }));
        const legacy = LS.get('olympus_worked_muscles_v2', {}) || {};
        const legacyMap = { chest: ['chest'], 'arms-l': ['biceps', 'triceps', 'shoulders'], 'arms-r': ['biceps', 'triceps', 'shoulders'], core: ['core'], 'legs-l': ['quads', 'hamstrings', 'glutes', 'calves'], 'legs-r': ['quads', 'hamstrings', 'glutes', 'calves'] };
        Object.entries(legacy).forEach(([k, ts]) => (legacyMap[k] || []).forEach(m => { last[m] = Math.max(last[m] || 0, ts); }));
        return last;
    };

    // 0 = tamamen yorgun, 1 = tamamen toparlanmış (72 saatte doğrusal)
    O2.recovery = () => {
        const last = O2.muscleLastWorked();
        const now = Date.now();
        const out = {};
        Object.keys(O2.MUSCLES).forEach(m => {
            const h = last[m] ? (now - last[m]) / 36e5 : 999;
            out[m] = O2.clamp(h / 72);
        });
        return out;
    };

    O2.water = () => {
        const today = O2.trDate();
        let w = LS.get('olympus_water_obj', null) || { date: today, amount: 0, yesterday: 0 };
        if (w.date !== today) { w = { date: today, amount: 0, yesterday: w.amount || 0 }; LS.set('olympus_water_obj', w); }
        return { ...w, goal: parseInt(LS.raw('olympus_water_goal', '3000')) || 3000 };
    };
    O2.addWater = (ml) => {
        const w = O2.water();
        w.amount = Math.max(0, (w.amount || 0) + ml);
        LS.set('olympus_water_obj', { date: w.date, amount: w.amount, yesterday: w.yesterday });
        return w;
    };

    O2.lastSleep = () => {
        const list = LS.get('olympus_sleep_history', []) || [];
        const last = list[list.length - 1];
        if (!last) return null;
        const d = O2.parseDate(last.date);
        const ageDays = d ? (O2.startOfDay() - O2.startOfDay(d)) / DAY_MS : 99;
        return { hours: parseFloat(last.val), fresh: ageDays <= 1 };
    };

    O2.readiness = () => {
        const sleep = O2.lastSleep();
        const sleepScore = sleep && sleep.fresh ? O2.clamp((sleep.hours - 4.5) / 3.5) * 100 : 72;

        const rec = O2.recovery();
        const fatigues = Object.values(rec).map(v => 1 - v).sort((a, b) => b - a).slice(0, 3);
        const recoveryScore = 100 - (fatigues.reduce((a, b) => a + b, 0) / fatigues.length) * 100;

        const since = Date.now() - 3 * DAY_MS;
        const recentMin = O2.sessions().filter(s => s.endedAt > since).reduce((a, s) => a + (s.durationSec || 0) / 60, 0);
        const loadScore = 100 - O2.clamp(recentMin / 240) * 70;

        const score = Math.round(sleepScore * .4 + recoveryScore * .4 + loadScore * .2);
        let label = 'Toparlanma günü', tone = 'var(--o2-orange)';
        if (score >= 85) { label = 'Zirve formdasın'; tone = 'var(--o2-green)'; }
        else if (score >= 70) { label = 'Antrenmana hazırsın'; tone = 'var(--o2-green)'; }
        else if (score >= 52) { label = 'Dengeli'; tone = 'var(--o2-gold)'; }
        return {
            score, label, tone,
            factors: [
                { name: 'Uyku', value: Math.round(sleepScore), color: 'var(--o2-violet)', hint: sleep && sleep.fresh ? `${sleep.hours} saat` : 'veri yok' },
                { name: 'Toparlanma', value: Math.round(recoveryScore), color: 'var(--o2-green)' },
                { name: 'Yük', value: Math.round(loadScore), color: 'var(--o2-orange)' }
            ],
            sleep
        };
    };

    // ==========================================
    // 🧠 OLY KOÇ (kural tabanlı içgörüler)
    // ==========================================
    O2.coachInsights = () => {
        const out = [];
        const r = O2.readiness();
        const plan = O2.dayPlan();
        const water = O2.water();
        const hour = new Date().getHours();
        const sessions = O2.sessions();
        const week = O2.weekStats(0);

        if (!plan.isRest && r.score < 52) out.push(`Hazırlık skorun düşük (${r.score}). Bugün ağırlıkları %10 azaltıp RPE 7'de kalmak, sakatlık riskini ciddi şekilde düşürür.`);
        else if (!plan.isRest && r.score >= 85) out.push(`Vücudun zirvede (${r.score}). Ana harekette yeni bir rekor denemek için ideal gün.`);
        if (plan.isRest) out.push('Bugün dinlenme günü. 20 dakikalık yürüyüş ve mobilite, bir sonraki seansın kalitesini artırır.');

        const sleep = r.sleep;
        if (!sleep || !sleep.fresh) out.push('Dün geceki uykunu kaydet; hazırlık skorun çok daha isabetli hesaplanır.');
        else if (sleep.hours < 6.5) out.push(`${sleep.hours} saat uyku kas onarımı için az. Bu akşam 23:30'dan önce yatmayı hedefle.`);

        const waterPct = water.amount / water.goal;
        if (hour >= 14 && waterPct < .45) out.push(`Su hedefinin %${Math.round(waterPct * 100)}'indesin. Akşama kadar ${O2.fmtNum(water.goal - water.amount)} ml daha içmelisin.`);

        const weights = LS.get('olympus_history', []) || [];
        const lastW = weights[weights.length - 1];
        const lastWDate = lastW && O2.parseDate(lastW.date);
        if (!lastWDate || (Date.now() - lastWDate) / DAY_MS > 10) out.push('10 günü aşkın süredir tartılmadın. Sabah aç karnına tek ölçüm, trendi netleştirir.');

        const recentPR = sessions.slice(-3).flatMap(s => s.prs || []);
        if (recentPR.length) out.push(`Son seanslarda ${recentPR.length} kişisel rekor kırdın. Momentum seninle.`);

        const target = O2.settings().weeklyTarget;
        if (week.sessions < target && new Date().getDay() >= 4) out.push(`Haftalık hedefin ${target} seans; şu an ${week.sessions}. Hafta bitmeden ${target - week.sessions} seans daha.`);

        if (!out.length) out.push('Her şey yolunda. Planına sadık kal; tutarlılık her zaman yoğunluğu yener.');
        return out;
    };

    // ==========================================
    // 📊 HAFTALIK İSTATİSTİK
    // ==========================================
    // weeksAgo = 0 bu hafta, 1 geçen hafta
    O2.weekStats = (weeksAgo = 0) => {
        const start = O2.addDays(O2.weekStart(), -7 * weeksAgo);
        const end = O2.addDays(start, 7);
        const list = O2.sessions().filter(s => s.endedAt >= start.getTime() && s.endedAt < end.getTime());
        const legacyCount = (LS.get('olympus_past_workouts', []) || []).filter(w => {
            if (String(w.id || '').startsWith('o2_')) return false; // yeni seansların uyumluluk kopyası
            const d = O2.parseDate(w.date);
            return d && d >= start && d < end;
        }).length;
        return {
            start, end,
            sessions: list.length + legacyCount,
            volume: list.reduce((a, s) => a + (s.volume || 0), 0),
            minutes: Math.round(list.reduce((a, s) => a + (s.durationSec || 0), 0) / 60),
            sets: list.reduce((a, s) => a + (s.setCount || 0), 0),
            prs: list.reduce((a, s) => a + (s.prs || []).length, 0),
            list
        };
    };

    O2.bodyFat = (p = LS.get('olympus_profile', {}) || {}) => {
        const w = parseFloat(p.waist), n = parseFloat(p.neck), h = parseFloat(p.height);
        if (!w || !n || !h || w <= n) return null;
        const bf = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450;
        return Math.max(3, bf);
    };

    // ==========================================
    // 🥗 BESLENME HEDEFLERİ
    // ==========================================
    O2.diet = () => (document.body.classList.contains('dilala-mode') && typeof dilalaDietData !== 'undefined') ? dilalaDietData : dietData;
    O2.macros = (dayTitle = '') => {
        const p = LS.get('olympus_profile', {}) || {};
        const bw = parseFloat(p.w) || 80;
        let carbPerKg = 3;
        if (/yüksek/i.test(dayTitle)) carbPerKg = 4;
        else if (/düşük/i.test(dayTitle)) carbPerKg = 1.5;
        else if (/cheat/i.test(dayTitle)) carbPerKg = 4.5;
        const protein = Math.round(bw * 2.1), fat = Math.round(bw * .9), carb = Math.round(bw * carbPerKg);
        return { protein, fat, carb, kcal: protein * 4 + carb * 4 + fat * 9, bw };
    };

    // ==========================================
    // ☁️ BULUT SENKRONU (Firestore: users/{uid}.training)
    // ==========================================
    let cloudTimer = null;
    O2.cloudSave = () => {
        clearTimeout(cloudTimer);
        cloudTimer = setTimeout(() => {
            if (typeof auth === 'undefined' || !auth.currentUser) return;
            db.collection('users').doc(auth.currentUser.uid).set({
                training: {
                    sessions: O2.sessions().slice(-120),
                    settings: O2.settings(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            }, { merge: true }).catch(err => console.warn('Olympus bulut kaydı başarısız:', err));
        }, 1200);
    };

    O2.cloudLoad = async () => {
        if (typeof auth === 'undefined' || !auth.currentUser) return false;
        try {
            const snap = await db.collection('users').doc(auth.currentUser.uid).get();
            const training = snap.exists && snap.data().training;
            if (!training) return false;
            const local = O2.sessions();
            const ids = new Set(local.map(s => s.id));
            const incoming = (training.sessions || []).filter(s => !ids.has(s.id));
            if (incoming.length) O2.saveSessions([...local, ...incoming].sort((a, b) => a.endedAt - b.endedAt));
            if (training.settings && !localStorage.getItem('oly2_settings')) LS.set('oly2_settings', training.settings);
            return incoming.length > 0;
        } catch (e) {
            console.warn('Olympus bulut verisi okunamadı:', e);
            return false;
        }
    };

    // ==========================================
    // ✉️ HAFTALIK PERFORMANS RAPORU (EmailJS)
    // ==========================================
    O2.isoWeekId = (d = new Date()) => {
        const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const day = t.getUTCDay() || 7;
        t.setUTCDate(t.getUTCDate() + 4 - day);
        const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
        return `${t.getUTCFullYear()}-W${Math.ceil(((t - yearStart) / DAY_MS + 1) / 7)}`;
    };

    O2.buildWeeklyReport = (weeksAgo = 1) => {
        const w = O2.weekStats(weeksAgo);
        const prev = O2.weekStats(weeksAgo + 1);
        const weights = (LS.get('olympus_history', []) || []).map(h => ({ d: O2.parseDate(h.date), w: parseFloat(h.weight) })).filter(x => x.d && x.w);
        const inWeek = weights.filter(x => x.d >= w.start && x.d < w.end);
        const before = weights.filter(x => x.d < w.start);
        const weightNow = inWeek.length ? inWeek[inWeek.length - 1].w : (before.length ? before[before.length - 1].w : null);
        const weightRef = before.length ? before[before.length - 1].w : null;
        const sleeps = (LS.get('olympus_sleep_history', []) || []).map(s => ({ d: O2.parseDate(s.date), h: parseFloat(s.val) })).filter(x => x.d && x.d >= w.start && x.d < w.end);
        const avgSleep = sleeps.length ? sleeps.reduce((a, s) => a + s.h, 0) / sleeps.length : null;
        const target = O2.settings().weeklyTarget;
        const volDelta = prev.volume ? Math.round((w.volume - prev.volume) / prev.volume * 100) : null;

        const rows = [
            ['Seans', `${w.sessions} / ${target}`],
            ['Toplam hacim', `${O2.fmtNum(w.volume)} kg${volDelta !== null ? ` (${volDelta >= 0 ? '+' : ''}${volDelta}%)` : ''}`],
            ['Antrenman süresi', `${w.minutes} dk`],
            ['Tamamlanan set', `${w.sets}`],
            ['Kişisel rekor', `${w.prs}`]
        ];
        if (weightNow) rows.push(['Vücut ağırlığı', `${weightNow} kg${weightRef ? ` (${weightNow - weightRef >= 0 ? '+' : ''}${(weightNow - weightRef).toFixed(1)})` : ''}`]);
        if (avgSleep) rows.push(['Ortalama uyku', `${avgSleep.toFixed(1)} saat`]);

        const ratio = w.sessions / target;
        let headline = 'Yeni haftaya güçlü başla.';
        if (ratio >= 1) headline = 'Hedefini tamamladın. Bu bir alışkanlık artık.';
        else if (ratio >= .6) headline = 'Sağlam bir hafta. Biraz daha zorla.';
        const fmt = d => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

        return {
            stats: w,
            subject: `🏛️ Olympus Haftalık Rapor · ${fmt(w.start)} – ${fmt(O2.addDays(w.end, -1))}`,
            eyebrow: 'HAFTALIK PERFORMANS RAPORU',
            headline,
            message: `${fmt(w.start)} – ${fmt(O2.addDays(w.end, -1))} haftasının özeti aşağıda. ${w.prs ? `Bu hafta ${w.prs} kişisel rekor kırdın. ` : ''}Tutarlılık, yoğunluktan daha çok kazandırır.`,
            content_html: typeof mailInfoRows === 'function' ? mailInfoRows(rows) : ''
        };
    };

    O2.sendWeeklyReport = async (weeksAgo = 1) => {
        const user = typeof auth !== 'undefined' && auth.currentUser;
        if (!user || !user.email || typeof sendOlympusMail !== 'function') return false;
        const r = O2.buildWeeklyReport(weeksAgo);
        const res = await sendOlympusMail({
            to_email: user.email,
            to_name: user.displayName,
            subject: r.subject, eyebrow: r.eyebrow, headline: r.headline,
            message: r.message, content_html: r.content_html
        });
        return !!res;
    };

    // Yeni haftanın ilk açılışında geçen haftanın raporunu bir kez gönder (ayarlardan kapatılabilir)
    O2.maybeSendWeeklyReport = async () => {
        if (!O2.settings().weeklyMail) return;
        const thisWeek = O2.isoWeekId();
        if (LS.raw('oly2_last_report_week', '') === thisWeek) return;
        const last = O2.weekStats(1);
        if (!last.sessions) { localStorage.setItem('oly2_last_report_week', thisWeek); return; }
        localStorage.setItem('oly2_last_report_week', thisWeek);
        const ok = await O2.sendWeeklyReport(1);
        if (ok && O2.toast) O2.toast('Geçen haftanın performans raporu e-postana gönderildi', 'mail');
    };
})();
