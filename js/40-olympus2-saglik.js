// Olympus Training — Health Connect (Android): adım, aktif kalori, dinlenik nabız, uyku ve kiloyu otomatik alır.
// @capgo/capacitor-health eklentisi yalnızca Android uygulamasında vardır; web'de bu bölüm sessizce gizlenir.
// Veriler mevcut kayıt anahtarlarına (olympus_cardio_history, olympus_bpm_history, olympus_sleep_history …) yazılır,
// böylece hazırlık skoru, halkalar ve raporlar ek kod olmadan kullanır.
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);

    const HC = () => window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.Health;
    const TYPES = ['steps', 'calories', 'restingHeartRate', 'heartRate', 'sleep', 'weight'];
    const cfg = () => ({ on: false, last: 0, ...(LS.get('oly2_health', {}) || {}) });
    const saveCfg = (patch) => LS.set('oly2_health', { ...cfg(), ...patch });

    O2.healthSupported = () => !!HC();

    // Günlük kayıt listesine (tarih "gg.aa.yyyy") değer yaz/güncelle.
    // Toplanan listelerde (aktif kalori) elle girilenlere dokunulmaz; gün başına tek değerli listelerde günün kaydı güncellenir.
    const SUMMED = ['olympus_active_kcal_history'];
    function upsert(key, date, val, extra = {}) {
        const list = LS.get(key, []) || [];
        const tr = date.toLocaleDateString('tr-TR');
        const i = list.findIndex(x => x.date === tr && (x.src === 'health' || (!x.src && !SUMMED.includes(key))));
        const row = { date: tr, val: String(val), src: 'health', ...extra };
        if (i >= 0) list[i] = { ...list[i], ...row }; else list.push(row);
        list.sort((a, b) => (O2.parseDate(a.date) || 0) - (O2.parseDate(b.date) || 0));
        LS.set(key, list.slice(-400));
    }

    O2.healthConnect = async () => {
        const plugin = HC();
        if (!plugin) { O2.toast('Health Connect sadece Android uygulamasında çalışır', 'heart'); return false; }
        try {
            const av = await plugin.isAvailable();
            if (!av.available) {
                O2.toast('Health Connect bulunamadı · Play Store\'dan yükle', 'heart');
                return false;
            }
            await plugin.requestAuthorization({ read: TYPES, write: [] });
            saveCfg({ on: true });
            const n = await O2.healthSync(true);
            O2.toast(n ? `Health Connect bağlandı · ${n} kayıt alındı` : 'Health Connect bağlandı', 'heart');
            return true;
        } catch (e) {
            console.warn('Health Connect yetkisi alınamadı:', e);
            O2.toast('İzin verilmedi', 'heart');
            return false;
        }
    };

    O2.healthSync = async (force) => {
        const plugin = HC();
        const c = cfg();
        if (!plugin || !c.on) return 0;
        if (!force && Date.now() - c.last < 30 * 60 * 1000) return 0; // en fazla yarım saatte bir
        const end = new Date();
        const start = O2.addDays(O2.startOfDay(), -6);
        const range = { startDate: start.toISOString(), endDate: end.toISOString() };
        let count = 0;
        const agg = async (dataType, aggregation) => {
            try { return (await plugin.queryAggregated({ dataType, ...range, bucket: 'day', aggregation })).samples || []; }
            catch (e) { return []; }
        };
        // Adım (Kardiyo/hareket halkası)
        (await agg('steps', 'sum')).forEach(s => { if (s.value > 0) { upsert('olympus_cardio_history', new Date(s.startDate), Math.round(s.value)); count++; } });
        // Aktif kalori (Bugün ekranındaki kcal halkası)
        (await agg('calories', 'sum')).forEach(s => { if (s.value > 0) { upsert('olympus_active_kcal_history', new Date(s.startDate), Math.round(s.value)); count++; } });
        // Dinlenik nabız (yoksa günün en düşük nabzı)
        let rhr = await agg('restingHeartRate', 'average');
        if (!rhr.length) rhr = await agg('heartRate', 'min');
        rhr.forEach(s => { if (s.value > 25) { upsert('olympus_bpm_history', new Date(s.startDate), Math.round(s.value)); count++; } });
        // Uyku: oturumlar uyanılan güne yazılır (uyanık dilimler hariç)
        try {
            const { samples = [] } = await plugin.readSamples({ dataType: 'sleep', startDate: O2.addDays(start, -1).toISOString(), endDate: end.toISOString(), limit: 500 });
            const byDay = {};
            samples.forEach(s => {
                if (/awake|out_of_bed/i.test(String(s.sleepState || ''))) return;
                const d = O2.startOfDay(new Date(s.endDate));
                const k = O2.dayKey(d);
                byDay[k] = (byDay[k] || { d, min: 0 });
                byDay[k].min += +s.value || 0;
            });
            Object.values(byDay).forEach(x => { if (x.min >= 60) { upsert('olympus_sleep_history', x.d, Math.round(x.min / 6) / 10); count++; } });
        } catch (e) { }
        // Kilo: son ölçüm, uygulamadaki son kayıttan yeniyse
        try {
            const { samples = [] } = await plugin.readSamples({ dataType: 'weight', ...range, limit: 20 });
            const lastW = samples.sort((a, b) => new Date(a.endDate) - new Date(b.endDate)).pop();
            if (lastW && lastW.value > 30) {
                const hist = LS.get('olympus_history', []) || [];
                const last = hist[hist.length - 1];
                const d = new Date(lastW.endDate);
                if (!last || (O2.parseDate(last.date) || 0) < O2.startOfDay(d)) {
                    hist.push({ date: d.toLocaleDateString('tr-TR'), weight: String(Math.round(lastW.value * 10) / 10) });
                    LS.set('olympus_history', hist);
                    const p = LS.get('olympus_profile', {}) || {};
                    p.w = String(Math.round(lastW.value * 10) / 10);
                    LS.set('olympus_profile', p);
                    count++;
                }
            }
        } catch (e) { }
        saveCfg({ last: Date.now() });
        if (count && O2.ui && ['today', 'progress', 'academy'].includes(O2.ui.tab) && !O2.isSheetOpen()) O2.render();
        return count;
    };

    O2.healthDisconnect = () => {
        saveCfg({ on: false });
        O2.toast('Health Connect eşitlemesi kapatıldı', 'heart');
        O2.healthSheet();
    };

    O2.healthSheet = () => {
        const c = cfg(), supported = O2.healthSupported();
        const last = c.last ? new Date(c.last).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
        O2.sheet('Health Connect', `
            <div class="o2-card o2-card-glow" style="margin-bottom:14px">
                <div class="o2-coach">
                    <div class="o2-backup-orb ${c.on && supported ? 'on' : ''}">${I('heart')}</div>
                    <div style="flex:1"><h4>${!supported ? 'Android uygulamasında kullanılabilir' : c.on ? 'Bağlı' : 'Bağlı değil'}</h4>
                    <p>${supported ? (c.on ? `Son eşitleme: ${esc(last)}` : 'Samsung Health, Google Fit, Mi Fitness ve saatlerin Health Connect\'e yazdığı veriler') : 'Bu özellik telefondaki Olympus Training (APK) uygulamasında çalışır.'}</p></div>
                </div>
            </div>
            <div class="o2-list">
                ${[['run', 'Adımlar', 'Hareket halkası ve kardiyo'], ['flame', 'Aktif kalori', 'Bugün ekranındaki kcal halkası'], ['heart', 'Dinlenik nabız', 'Hazırlık skoru'], ['moon', 'Uyku', 'Hazırlık skoru ve haftalık rapor'], ['scale', 'Kilo', 'Ağırlık trendi ve Akademi VKİ']]
                    .map(([ic, t, d]) => `<div class="o2-row"><div class="o2-row-idx">${I(ic)}</div><div class="o2-row-main"><h5>${t}</h5><p>${d}</p></div></div>`).join('')}
            </div>
            <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:var(--o2-text-3)">Veriler yalnızca okunur, son 7 gün alınır ve uygulama her açıldığında güncellenir. İzinleri Health Connect ayarlarından istediğin zaman geri alabilirsin.</p>
            ${supported ? (c.on ? `
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:16px" onclick="O2.healthSync(true).then(n => O2.toast(n + ' kayıt güncellendi', 'heart'))">${I('swap')}Şimdi eşitle</button>
            <button class="o2-btn o2-btn-ghost o2-btn-block" style="margin-top:10px" onclick="O2.healthDisconnect()">Bağlantıyı kes</button>` : `
            <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:16px" onclick="O2.healthConnect().then(ok => ok && O2.healthSheet())">${I('heart')}Health Connect'e bağlan</button>`) : ''}`);
    };

    // Açılışta ve uygulama öne geldiğinde arka planda eşitle
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => O2.healthSync(), 4000));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) O2.healthSync(); });
})();
