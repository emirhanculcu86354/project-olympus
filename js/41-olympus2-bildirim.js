// Olympus Training — bildirim merkezi
// Tüm hatırlatıcılar (antrenman, Akademi, akış blokları, öğünler, su, uyku) tek bir takvimden üretilir ve üç kanala dağıtılır:
//   1) Android uygulaması: @capacitor/local-notifications (uygulama kapalıyken de, internetsiz)
//   2) iPhone/Android ana ekran uygulaması (PWA): Firebase Cloud Messaging web push → Apps Script sunucusu zamanı gelince yollar
//   3) E-posta: antrenman ve Akademi hatırlatıcıları (Apps Script, emirhan@culbase.com)
// Modüller kendi bildirimlerini O2.registerNotifySource(ad, fn) ile ekler (Akış → 'routine', Diyet → 'meals').
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);

    // emirhan@culbase.com hesabında yayınlanan Apps Script servisi (apps-script/olympus-hatirlatici.gs)
    const SERVER_URL = 'https://script.google.com/macros/s/AKfycbwWqzNnfaoi6sN1QE4Yncb2kGvhHdeEgFlJ_gPwNfS9eHJMYSSmBCm7GAHBDmGtehBisg/exec';
    // Firebase Console → Proje ayarları → Cloud Messaging → Web Push sertifikaları (herkese açık anahtar)
    const VAPID_KEY = 'BIlDxfIJylLYNwgoIb0q8JzSLyxfsjjTfNckUvHQbMf8lXeoUhEwbT92OvMxvONhObfYvJW_5_XZ-_4kGCtH6YU';
    const DAYS_AHEAD = 4;
    const LEGACY_IDS = [9001, 9002, 9010, 9011, 9012, 9013, 9014, 9015, 9030, 9031, 9032, 9033, 9034, 9035, 9036, 9040, 9041, 9042, 9043, 9044, 9045, 9046];
    const WATER_HOURS = [10, 12, 14, 16, 18, 20];

    const LN = () => window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
    const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

    O2.reminderSettings = () => {
        const r = {
            workout: false, workoutTime: '18:00', academy: false, academyTime: '20:30',
            routine: false, routineLead: 5, meals: false, water: false, sleep: false,
            quiet: true, quietFrom: '23:30', quietTo: '07:00',
            mail: false, push: false, mailUrl: '',
            ...(LS.get('oly2_reminders', {}) || {})
        };
        if (!r.mailUrl) r.mailUrl = SERVER_URL;
        return r;
    };
    const saveSettings = (r) => LS.set('oly2_reminders', r);
    const anyOn = (r) => ['workout', 'academy', 'routine', 'meals', 'water', 'sleep'].some(k => r[k]);
    const hm = (t) => String(t || '0:0').split(':').map(Number);
    const trainedOn = (key) => O2.sessions().some(s => s.dayKey === key && s.type !== 'cardio');

    // ==========================================
    // 🗓️ ORTAK TAKVİM
    // ==========================================
    const sources = {};
    O2.registerNotifySource = (name, fn) => { sources[name] = fn; };

    O2.registerNotifySource('workout', (day, i, r) => {
        const plan = O2.dayPlan(i);
        if (plan.isRest || (i === 0 && trainedOn(O2.dayKey()))) return [];
        const [h, m] = hm(r.workoutTime);
        const title = String(plan.title || '').split(':').pop().trim();
        return [{ key: 'w', h, m, title: 'Antrenman vakti 💪', body: `Bugün: ${title}. Hazırlık skoruna bak ve başla.`, action: 'start' }];
    });
    O2.registerNotifySource('academy', (day, i, r) => {
        const s = O2.academySummary && O2.academySummary();
        if (!s) return [];
        const [h, m] = hm(r.academyTime);
        const next = s.dates.map(d => ({ ...d, left: d.left - i })).filter(d => d.left >= 0).sort((a, b) => a.left - b.left)[0];
        const when = next ? (next.left === 0 ? `${next.label} bugün!` : next.left === 1 ? `${next.label} yarın!` : `${next.label}: ${next.left} gün kaldı.`) : '';
        return [{ key: 'a', h, m, title: `🛡️ ${s.branch} · ${s.track} hazırlığı`, body: `${when} Bugün 10 mülakat kartı çalış ve testini kaydet.`.trim(), action: 'academy' }];
    });
    O2.registerNotifySource('water', () => WATER_HOURS.map(h => ({ key: 'water' + h, h, m: 0, title: 'Su vakti 💧', body: 'Bir bardak su iç; hedefe bir adım daha.', action: 'water' })));
    O2.registerNotifySource('sleep', () => [{ key: 'sleep', h: 9, m: 30, title: 'Günaydın ☀️', body: 'Dün gece kaç saat uyudun? Kaydet, hazırlık skorun güncellensin.', action: 'sleep' }]);

    const inQuiet = (r, h, m) => {
        if (!r.quiet) return false;
        const t = h * 60 + m, [fh, fm] = hm(r.quietFrom), [th, tm] = hm(r.quietTo);
        const a = fh * 60 + fm, b = th * 60 + tm;
        return a > b ? (t >= a || t < b) : (t >= a && t < b);
    };

    // Önümüzdeki günlerin bildirimleri: [{ id, at, title, body, action, src }]
    O2.notifySchedule = (days = DAYS_AHEAD) => {
        const r = O2.reminderSettings();
        const now = Date.now();
        const out = [];
        for (let i = 0; i < days; i++) {
            const day = O2.addDays(O2.startOfDay(), i);
            const dk = O2.dayKey(day);
            Object.entries(sources).forEach(([name, fn]) => {
                if (!r[name]) return;
                let list = [];
                try { list = fn(day, i, r) || []; } catch (e) { console.warn('Bildirim kaynağı hatası:', name, e); }
                list.forEach(ev => {
                    const at = new Date(day); at.setHours(ev.h, ev.m, 0, 0);
                    // Sessiz saatler: yalnızca otomatik tekrarlar (su) susturulur; kullanıcının saat verdiği bloklar her zaman gelir
                    if (name === 'water' && inQuiet(r, ev.h, ev.m)) return;
                    if (at.getTime() <= now + 15000) return;
                    out.push({ id: `${name}:${ev.key}:${dk}`, at: at.getTime(), title: ev.title, body: ev.body, action: ev.action || '', src: name });
                });
            });
        }
        return out.sort((a, b) => a.at - b.at).slice(0, 120);
    };

    // ==========================================
    // 📱 KANAL 1: ANDROID YEREL BİLDİRİM
    // ==========================================
    const numId = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return 10000 + (Math.abs(h) % 2000000000); };
    async function applyAndroid(r, opts) {
        const plugin = LN();
        const perm = await plugin.checkPermissions();
        if (perm.display !== 'granted' && anyOn(r)) {
            if (opts.silent) return false;
            const req = await plugin.requestPermissions();
            if (req.display !== 'granted') { O2.toast('Bildirim izni verilmedi', 'bell'); return false; }
        }
        const prev = LS.get('oly2_notif_ids', []) || [];
        const cancel = [...new Set([...prev, ...LEGACY_IDS])].map(id => ({ id }));
        if (cancel.length) await plugin.cancel({ notifications: cancel });
        const list = O2.notifySchedule().slice(0, 60).map(n => ({
            id: numId(n.id), title: n.title, body: n.body,
            schedule: { at: new Date(n.at), allowWhileIdle: true },
            extra: { action: n.action }
        }));
        if (list.length) await plugin.schedule({ notifications: list });
        LS.set('oly2_notif_ids', list.map(n => n.id));
        return true;
    }

    // ==========================================
    // 🌐 KANAL 2: WEB PUSH (FCM) — uygulama kapalıyken de
    // ==========================================
    let messagingReady = null;
    function loadMessaging() {
        if (messagingReady) return messagingReady;
        messagingReady = new Promise((res, rej) => {
            if (firebase.messaging) return res(firebase.messaging());
            const s = document.createElement('script');
            s.src = 'https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js';
            s.onload = () => res(firebase.messaging());
            s.onerror = () => { messagingReady = null; rej(new Error('Bildirim kütüphanesi yüklenemedi')); };
            document.head.appendChild(s);
        });
        return messagingReady;
    }
    O2.pushSupported = () => !LN() && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID_KEY;

    // iOS: izin isteği doğrudan dokunma anında çağrılmalı (önce izin, sonra yükleme)
    O2.enablePush = async () => {
        if (!('Notification' in window)) { O2.toast('Bu tarayıcı bildirim desteklemiyor', 'bell'); return false; }
        if (isIOS() && !isStandalone()) { O2.toast('iPhone\'da önce Paylaş → Ana Ekrana Ekle, sonra oradan aç', 'bell'); return false; }
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { O2.toast('Bildirim izni verilmedi · Ayarlar\'dan açabilirsin', 'bell'); return false; }
        if (!VAPID_KEY) { O2.toast('Anlık bildirim anahtarı henüz eklenmedi', 'bell'); return false; }
        try {
            const reg = await navigator.serviceWorker.ready;
            const messaging = await loadMessaging();
            const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
            if (!token) throw new Error('Token alınamadı');
            localStorage.setItem('oly2_push_token', token);
            const r = O2.reminderSettings(); r.push = true; saveSettings(r);
            await O2.syncServer(true);
            return true;
        } catch (e) {
            console.warn('Web push açılamadı:', e);
            O2.toast('Anlık bildirim açılamadı: ' + (e.message || e), 'bell');
            return false;
        }
    };
    O2.disablePush = async () => {
        const r = O2.reminderSettings(); r.push = false; saveSettings(r);
        try { if (messagingReady) (await messagingReady).deleteToken(); } catch (e) { }
        localStorage.removeItem('oly2_push_token');
        await O2.syncServer(true);
    };

    // Uygulama açıkken (push kapalıysa) bugünün bildirimlerini zamanlayıcıyla göster
    let webTimers = [];
    function scheduleInApp(r) {
        webTimers.forEach(clearTimeout); webTimers = [];
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        if (r.push && localStorage.getItem('oly2_push_token')) return; // push zaten gönderecek, çift bildirim olmasın
        const end = O2.addDays(O2.startOfDay(), 1).getTime();
        O2.notifySchedule(1).filter(n => n.at < end).forEach(n => webTimers.push(setTimeout(async () => {
            if (n.action === 'start' && trainedOn(O2.dayKey())) return;
            const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
            const opt = { body: n.body, icon: 'assets/olympus-training-icon-192.png', badge: 'assets/olympus-training-icon-192.png', tag: n.id, data: { action: n.action } };
            if (reg) reg.showNotification(n.title, opt); else new Notification(n.title, opt);
        }, n.at - Date.now())));
    }

    // ==========================================
    // ☁️ SUNUCU SENKRONU (push takvimi + e-posta)
    // ==========================================
    const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); };
    O2.syncServer = async (force) => {
        const r = O2.reminderSettings();
        const u = typeof auth !== 'undefined' && auth.currentUser;
        if (!u || !/^https:\/\/script\.google\.com\//.test(r.mailUrl)) return false;
        const plans = {};
        for (let i = 0; i < 7; i++) {
            const p = O2.dayPlan(i);
            plans[O2.dayKey(O2.addDays(O2.startOfDay(), i))] = p.isRest ? '' : String(p.title || '').split(':').pop().trim();
        }
        const last = O2.sessions().filter(s => s.type !== 'cardio').slice(-1)[0];
        const acad = O2.academySummary ? O2.academySummary() : null;
        const token = r.push ? (localStorage.getItem('oly2_push_token') || '') : '';
        const payload = {
            name: O2.userName(),
            appUrl: /^https:/.test(location.protocol) ? location.origin + location.pathname : '',
            enabled: !!(r.mail || token),
            workout: { on: !!(r.mail && r.workout), time: r.workoutTime },
            academy: { on: !!(r.mail && r.academy), time: r.academyTime, branch: acad ? `${acad.branch} · ${acad.track}` : '', dates: acad ? acad.dates.map(d => ({ label: d.label, date: d.date })) : [] },
            plans,
            lastWorkoutDay: last ? last.dayKey : '',
            weekSessions: O2.weekStats().sessions,
            weeklyTarget: O2.settings().weeklyTarget,
            pushToken: token,
            // Sunucuda yer kazanmak için kısa biçim: [saniye, başlık, metin, eylem]
            events: token ? O2.notifySchedule().map(n => [Math.round(n.at / 1000), n.title, n.body, n.action]) : []
        };
        // Takvim saat geçtikçe değişir: zorlanmadıkça en fazla 10 dakikada bir, ayar değiştiyse hemen gönder
        const h = hashStr(JSON.stringify({ ...payload, events: payload.events.length }) + O2.dayKey());
        if (!force && LS.raw('oly2_sync_hash', '') === h && Date.now() - (+LS.raw('oly2_sync_at', 0)) < 10 * 60 * 1000) return true;
        try {
            await fetch(r.mailUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...payload, idToken: await u.getIdToken() }) });
            localStorage.setItem('oly2_sync_hash', h);
            localStorage.setItem('oly2_sync_at', String(Date.now()));
            return true;
        } catch (e) { console.warn('Bildirim sunucusu eşitlenemedi:', e); return false; }
    };
    O2.syncMailReminder = O2.syncServer; // eski çağrılar için

    // Sunucudan anında test bildirimi (push + gerekirse e-posta)
    O2.testNotification = async () => {
        const r = O2.reminderSettings();
        const u = typeof auth !== 'undefined' && auth.currentUser;
        if (LN()) {
            await LN().schedule({ notifications: [{ id: 99999, title: 'Olympus Training ✅', body: 'Bildirimler çalışıyor.', schedule: { at: new Date(Date.now() + 3000) }, extra: { action: '' } }] });
            O2.toast('3 sn içinde test bildirimi gelecek', 'bell');
            return;
        }
        const token = localStorage.getItem('oly2_push_token');
        if (!u || !token) {
            if ('Notification' in window && Notification.permission === 'granted') {
                const reg = await navigator.serviceWorker.getRegistration();
                if (reg) reg.showNotification('Olympus Training ✅', { body: 'Bildirimler bu cihazda çalışıyor (uygulama açıkken).', icon: 'assets/olympus-training-icon-192.png' });
            } else O2.toast('Önce bildirimlere izin ver', 'bell');
            return;
        }
        O2.toast('Sunucudan test gönderiliyor…', 'bell');
        try {
            const res = await fetch(r.mailUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ idToken: await u.getIdToken(), test: true, pushToken: token }) }).then(x => x.json());
            O2.toast(res.ok ? 'Test gönderildi · birkaç saniye içinde gelecek' : 'Test başarısız: ' + (res.error || ''), 'bell');
        } catch (e) { O2.toast('Sunucuya ulaşılamadı', 'bell'); }
    };

    // ==========================================
    // ⚙️ UYGULA
    // ==========================================
    O2.applyReminders = async (opts = {}) => {
        const r = O2.reminderSettings();
        let ok = true;
        try {
            if (LN()) ok = await applyAndroid(r, opts);
            else {
                if (anyOn(r) && 'Notification' in window && Notification.permission === 'default' && !opts.silent) {
                    const p = await Notification.requestPermission();
                    if (p !== 'granted') { O2.toast('Bildirim izni verilmedi', 'bell'); ok = false; }
                }
                scheduleInApp(r);
            }
        } catch (e) { console.warn('Hatırlatıcılar kurulamadı:', e); ok = false; }
        O2.syncServer(!!opts.force);
        return ok;
    };
    let refreshTimer = null;
    O2.refreshNotifications = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => O2.applyReminders({ silent: true }), 1500); };

    // ==========================================
    // 🖥️ AYAR EKRANI
    // ==========================================
    function channelCard(r) {
        if (LN()) return `
            <div class="o2-notif-status on">${I('bell')}<div><h5>Android bildirimleri</h5><p>Uygulama kapalıyken ve internetsiz de gelir.</p></div></div>`;
        const perm = 'Notification' in window ? Notification.permission : 'unsupported';
        const token = localStorage.getItem('oly2_push_token');
        const u = typeof auth !== 'undefined' && auth.currentUser;
        if (isIOS() && !isStandalone()) return `
            <div class="o2-notif-status warn">${I('bell')}<div><h5>Önce ana ekrana ekle</h5><p>iPhone'da bildirimler yalnızca ana ekrana eklenen uygulamada çalışır: Safari → Paylaş → Ana Ekrana Ekle, sonra oradan aç.</p></div></div>`;
        if (r.push && token) return `
            <div class="o2-notif-status on">${I('bell')}<div><h5>Anlık bildirimler açık</h5><p>Uygulama kapalıyken de telefona gelir.</p></div><button class="o2-link" onclick="O2.disablePush().then(() => O2.remindersSheet())">Kapat</button></div>`;
        return `
            <div class="o2-notif-status ${perm === 'denied' ? 'warn' : ''}">${I('bell')}<div><h5>${perm === 'denied' ? 'Bildirim izni kapalı' : 'Telefona anlık bildirim'}</h5>
                <p>${perm === 'denied' ? 'Tarayıcı/telefon ayarlarından Olympus için bildirime izin ver.' : !u ? 'Uygulama kapalıyken bildirim için giriş yapmalısın.' : !O2.pushSupported() ? 'Bu cihazda şimdilik uygulama açıkken bildirim gelir.' : 'Uygulama kapalıyken de bildirim almak için aç.'}</p></div>
                ${perm !== 'denied' && u && O2.pushSupported() ? `<button class="o2-btn o2-btn-gold o2-btn-sm" onclick="O2.enablePush().then(ok => ok && O2.remindersSheet())">Aç</button>` : ''}
            </div>`;
    }

    O2.remindersSheet = () => {
        const r = O2.reminderSettings();
        const u = typeof auth !== 'undefined' && auth.currentUser;
        const row = (key, title, desc, extra = '') => `
            <div class="o2-notif-row">
                <div class="o2-toggle-row" onclick="this.querySelector('.o2-switch').classList.toggle('on')">
                    <div><h5>${title}</h5><p>${desc}</p></div><span class="o2-switch ${r[key] ? 'on' : ''}" data-key="${key}"></span>
                </div>${extra}
            </div>`;
        const time = (id, v) => `<input class="o2-input o2-notif-time" type="time" id="${id}" value="${esc(v)}">`;
        const upcoming = O2.notifySchedule(2).slice(0, 6);
        O2.sheet('Bildirimler', `
            ${channelCard(r)}
            <div class="o2-section-head" style="margin-top:18px"><h3>Neler hatırlatılsın?</h3></div>
            ${row('workout', 'Antrenman', 'Antrenman günlerinde, o günün seansıyla; o gün çalıştıysan gelmez', time('o2-rem-time', r.workoutTime))}
            ${row('routine', 'Günlük akış', 'Akış\'taki rutin blokların ve görevlerin saatinde', `<select class="o2-input o2-notif-time" id="o2-rem-lead">${[0, 5, 10, 15, 30].map(v => `<option value="${v}" ${+r.routineLead === v ? 'selected' : ''}>${v ? v + ' dk önce' : 'Tam saatinde'}</option>`).join('')}</select>`)}
            ${row('meals', 'Öğünler', 'Diyet planındaki öğün saatlerinde, ne yiyeceğinle birlikte')}
            ${row('academy', 'Akademi çalışması', 'Her gün mülakat kartları ve sınava kalan gün', time('o2-rem-acad', r.academyTime))}
            ${row('water', 'Su', '10:00-20:00 arası 2 saatte bir')}
            ${row('sleep', 'Uyku kaydı', 'Her sabah 09:30')}
            ${row('quiet', 'Sessiz saatler', 'Bu aralıkta su hatırlatıcısı gelmez', `<div style="display:flex;gap:6px">${time('o2-rem-qf', r.quietFrom)}${time('o2-rem-qt', r.quietTo)}</div>`)}
            <div class="o2-section-head" style="margin-top:18px"><h3>E-posta</h3></div>
            ${row('mail', 'E-posta ile de hatırlat', `Antrenman ve Akademi hatırlatıcıları ${u ? esc(u.email) : 'hesabının e-postasına'} da gelir; sınavlara 30, 7 ve 1 gün kala ayrıca uyarır.`)}
            ${upcoming.length ? `
            <div class="o2-section-head" style="margin-top:18px"><h3>Sıradaki bildirimler</h3></div>
            <div class="o2-card" style="padding:4px 16px"><div class="o2-list">${upcoming.map(n => `
                <div class="o2-row"><div class="o2-row-idx" style="font-size:11px;font-weight:800;color:var(--o2-gold)">${new Date(n.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                <div class="o2-row-main"><h5>${esc(n.title)}</h5><p>${O2.dayKey(new Date(n.at)) === O2.dayKey() ? 'Bugün' : 'Yarın'} · ${esc(n.body)}</p></div></div>`).join('')}</div></div>` : ''}
            <div class="o2-grid-2" style="margin-top:16px">
                <button class="o2-btn o2-btn-ghost" onclick="O2.testNotification()">${I('bell')}Test et</button>
                <button class="o2-btn o2-btn-gold" onclick="O2.saveReminders()">Kaydet</button>
            </div>`);
    };
    O2.saveReminders = async () => {
        const r = O2.reminderSettings();
        document.querySelectorAll('#o2-sheet-layer .o2-switch[data-key]').forEach(sw => { r[sw.dataset.key] = sw.classList.contains('on'); });
        r.workoutTime = $('o2-rem-time').value || '18:00';
        r.academyTime = $('o2-rem-acad').value || '20:30';
        r.routineLead = parseInt($('o2-rem-lead').value) || 0;
        r.quietFrom = $('o2-rem-qf').value || '23:30';
        r.quietTo = $('o2-rem-qt').value || '07:00';
        saveSettings(r);
        const ok = await O2.applyReminders({ force: true });
        O2.closeSheet();
        if (ok) O2.toast(anyOn(r) ? `${O2.notifySchedule().length} bildirim planlandı` : 'Hatırlatıcılar kapatıldı', 'bell');
    };

    // Seans kaydedilince bugünün antrenman hatırlatıcısı düşsün, sunucu da bilsin
    const baseSave = O2.saveSession;
    O2.saveSession = function () {
        const res = baseSave.apply(this, arguments);
        O2.refreshNotifications();
        return res;
    };

    document.addEventListener('DOMContentLoaded', () => {
        // Takvim her açılışta ve uygulama öne geldiğinde ileri kaydırılır (izin istemeden)
        setTimeout(() => O2.applyReminders({ silent: true }), 4000);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) O2.refreshNotifications(); });
        if (typeof auth !== 'undefined') auth.onAuthStateChanged(u => { if (u) setTimeout(() => O2.syncServer(), 5000); });
    });
})();
