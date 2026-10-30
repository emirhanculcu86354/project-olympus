// Olympus bulut yedeği — cihazdaki tüm uygulama verilerini (localStorage) Firestore'a anahtar anahtar eşitler.
// Uygulama ana ekrandan/yer işaretlerinden kaldırılıp yeniden eklendiğinde tarayıcı verisi silinir;
// aynı hesapla giriş yapınca her şey users/{uid}/kv altından geri yüklenir.
(function () {
    const O2 = window.O2 = window.O2 || {};

    // Yedeklenen anahtarlar: Olympus, Training, Dilala, KPSS, finans, garaj, futbol, Culbase
    const SYNCED = /^(olympus_|oly2_|dilala_|kpss_|bank_|gar_|goldnova_|culbase_|diet$)/;
    // Cihaza özel ya da gizli kalması gerekenler (API anahtarı buluta yazılmaz)
    const SKIP = /^(olympus_last_active_screen|olympus_acts_backup|olympus_profile_old|olympus_daily_notif_date|OLY_API_KEY)$/;
    const isSynced = (k) => typeof k === 'string' && SYNCED.test(k) && !SKIP.test(k);

    const META = '__oly_kv_meta';      // { key: { t: son yerel değişiklik, h: yerel özet, p: buluta yazılan özet } }
    const OWNER = '__oly_kv_owner';    // bu cihazın en son eşitlendiği hesap
    const LAST = '__oly_kv_last';      // son başarılı eşitleme zamanı
    const PART = 300000;               // Firestore belge sınırı (1 MB) için parça boyu (karakter)

    const proto = Storage.prototype;
    const rawGet = proto.getItem, rawSet = proto.setItem, rawRemove = proto.removeItem;
    const get = (k) => rawGet.call(localStorage, k);

    let meta = {};
    try { meta = JSON.parse(get(META)) || {}; } catch (e) { meta = {}; }
    const saveMeta = () => { try { rawSet.call(localStorage, META, JSON.stringify(meta)); } catch (e) { } };

    // Hızlı içerik özeti (değişmeyen değerleri tekrar yüklememek için)
    const hash = (s) => {
        if (s === null) return 'null';
        let h = 5381;
        for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
        return s.length + ':' + (h >>> 0).toString(36);
    };

    let applying = false, pushTimer = null;
    function touch(k) {
        const h = hash(get(k));
        const m = meta[k] || {};
        if (m.h === h) return;
        meta[k] = { ...m, h, t: Date.now() };
        saveMeta();
        schedulePush();
    }

    // Tüm uygulamanın localStorage yazımlarını izle (modüllerin kodu değişmeden yedeklenir)
    proto.setItem = function (k, v) {
        rawSet.call(this, k, v);
        if (this === localStorage && !applying && isSynced(k)) touch(k);
    };
    proto.removeItem = function (k) {
        rawRemove.call(this, k);
        if (this === localStorage && !applying && isSynced(k)) touch(k);
    };

    const user = () => (typeof auth !== 'undefined' && auth.currentUser) || null;
    const col = (uid) => db.collection('users').doc(uid).collection('kv');
    const docId = (k) => k.replace(/\//g, '∕');

    function schedulePush(delay = 4000) {
        clearTimeout(pushTimer);
        pushTimer = setTimeout(() => O2.backup.push(), delay);
    }

    // Henüz izlenmeyen (bu modül yüklenmeden önce yazılmış) anahtarları da kayda al
    function scanLocal() {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!isSynced(k)) continue;
            const h = hash(get(k));
            if (!meta[k]) meta[k] = { h, t: 0 };
            else if (meta[k].h !== h) meta[k] = { ...meta[k], h, t: Date.now() };
        }
        saveMeta();
    }

    let pushing = false;
    async function push() {
        const u = user();
        if (!u || pushing || get(OWNER) !== u.uid) return false;
        pushing = true;
        try {
            const pending = Object.keys(meta).filter(k => isSynced(k) && meta[k].h !== meta[k].p);
            for (const k of pending) {
                const v = get(k), m = meta[k], ref = col(u.uid).doc(docId(k));
                const t = m.t || Date.now();
                if (v === null) {
                    await ref.set({ k, deleted: true, t, h: m.h });
                } else if (v.length <= PART) {
                    await ref.set({ k, v, t, h: m.h, parts: 0 });
                } else {
                    const n = Math.ceil(v.length / PART);
                    for (let i = 0; i < n; i++) await col(u.uid).doc(docId(k) + '~' + i).set({ chunk: true, v: v.slice(i * PART, (i + 1) * PART) });
                    await ref.set({ k, t, h: m.h, parts: n });
                }
                m.p = m.h;
                saveMeta();
            }
            rawSet.call(localStorage, LAST, String(Date.now()));
            return true;
        } catch (e) {
            console.warn('Olympus yedeği yazılamadı:', e);
            return false;
        } finally { pushing = false; }
    }

    // Buluttaki kayıtları getir; yeniyse yerele yaz. force: bulut her zaman kazanır (manuel geri yükleme)
    async function pull(force) {
        const u = user();
        if (!u) return { ok: false, changed: 0 };
        const snap = await col(u.uid).get();
        const chunks = {}, mains = [];
        snap.forEach(d => { const x = d.data(); if (x.chunk) chunks[d.id] = x.v; else if (x.k) mains.push(x); });
        // Bu cihaz bu hesapla hiç eşitlenmediyse (yeni kurulum) bulut kazanır: açılışta yazılan varsayılanlar yedeği ezmesin
        const fresh = force || get(OWNER) !== u.uid;
        let changed = 0;
        applying = true;
        try {
            mains.forEach(r => {
                if (!isSynced(r.k)) return;
                const m = meta[r.k] || { t: 0 };
                if (m.h === r.h) { meta[r.k] = { ...m, p: r.h }; return; }
                if (!fresh && (m.t || 0) >= (r.t || 0)) return; // yerel daha yeni → push edilecek
                if (r.deleted) rawRemove.call(localStorage, r.k);
                else {
                    const v = r.parts ? Array.from({ length: r.parts }, (_, i) => chunks[docId(r.k) + '~' + i] || '').join('') : r.v;
                    rawSet.call(localStorage, r.k, v);
                }
                meta[r.k] = { h: r.h, t: r.t || 0, p: r.h };
                changed++;
            });
        } finally { applying = false; }
        saveMeta();
        rawSet.call(localStorage, OWNER, u.uid);
        return { ok: true, changed, remote: mains.length };
    }

    O2.backup = {
        push,
        async sync(opts = {}) {
            if (!user()) return false;
            scanLocal();
            try {
                const res = await pull(opts.force);
                await push();
                if (res.changed && !opts.silent) {
                    // Eski modüller veriyi açılışta okuyor: tutarlılık için bir kez yeniden yükle
                    if (!sessionStorage.getItem('oly_kv_reloaded')) {
                        sessionStorage.setItem('oly_kv_reloaded', '1');
                        sessionStorage.setItem('oly_kv_toast', String(res.changed));
                        location.reload();
                    }
                }
                return res;
            } catch (e) {
                console.warn('Olympus yedeği eşitlenemedi:', e);
                return false;
            }
        },
        status() {
            const keys = Object.keys(meta).filter(isSynced);
            let bytes = 0;
            keys.forEach(k => { const v = get(k); if (v) bytes += v.length; });
            const last = +get(LAST) || 0;
            return { keys: keys.length, pending: keys.filter(k => meta[k].h !== meta[k].p).length, bytes, last, signedIn: !!user() };
        },
        // Dosyaya tam yedek (giriş yapmadan da çalışır)
        exportFile() {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (isSynced(k)) data[k] = get(k); }
            const blob = new Blob([JSON.stringify({ app: 'olympus', v: 1, at: new Date().toISOString(), data })], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `olympus-yedek-${O2.dayKey ? O2.dayKey() : Date.now()}.json`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        },
        importFile(file) {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const json = JSON.parse(reader.result);
                    if (!json || json.app !== 'olympus' || !json.data) throw new Error('format');
                    const n = Object.keys(json.data).filter(isSynced).length;
                    if (!confirm(`${n} kayıt bu cihaza yüklenecek ve mevcut verilerin üzerine yazılacak. Devam edilsin mi?`)) return;
                    Object.entries(json.data).forEach(([k, v]) => { if (isSynced(k) && typeof v === 'string') localStorage.setItem(k, v); });
                    push().finally(() => location.reload());
                } catch (e) { alert('Bu dosya bir Olympus yedeği değil.'); }
            };
            reader.readAsText(file);
        }
    };

    // ==========================================
    // ☁️ YEDEK EKRANI (Ayarlar → Veri & yedek)
    // ==========================================
    const fmtBytes = (n) => n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
    O2.backupSheet = () => {
        const s = O2.backup.status();
        const u = user();
        const I = O2.icon;
        const last = s.last ? new Date(s.last).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Henüz yok';
        O2.sheet('Veri & yedek', `
            <div class="o2-card o2-card-glow" style="margin-bottom:14px">
                <div class="o2-coach">
                    <div class="o2-backup-orb ${u ? 'on' : ''}">${I(u ? 'check' : 'bolt')}</div>
                    <div style="flex:1">
                        <h4>${u ? 'Bulut yedeği açık' : 'Yedek kapalı · misafir'}</h4>
                        <p>${u ? `${escapeHTML(u.email || 'Hesabın')} · Son eşitleme: ${last}` : 'Giriş yapmadan veriler sadece bu cihazda durur; uygulamayı kaldırınca silinir.'}</p>
                    </div>
                </div>
            </div>
            <div class="o2-grid-2" style="margin-bottom:14px">
                <div class="o2-card o2-stat"><small>Kayıt</small><strong>${s.keys}</strong></div>
                <div class="o2-card o2-stat" style="margin-top:0"><small>Boyut</small><strong>${fmtBytes(s.bytes)}</strong></div>
            </div>
            <p style="margin:0 0 14px;font-size:12px;line-height:1.55;color:var(--o2-text-3)">Antrenmanlar, beslenme, ölçüler, fotoğraflar, Akademi, Dilala ve Super App modüllerinin verileri her değişiklikte otomatik yedeklenir. Uygulamayı ana ekrandan kaldırıp yeniden eklediğinde aynı hesapla giriş yap; her şey geri gelir.${s.pending && u ? ` <b style="color:var(--o2-gold)">${s.pending} değişiklik yüklenmeyi bekliyor.</b>` : ''}</p>
            ${u ? `
            <button class="o2-btn o2-btn-gold o2-btn-block" onclick="O2.backupNow()">${I('check')}Şimdi yedekle</button>
            <button class="o2-btn o2-btn-ghost o2-btn-block" style="margin-top:10px" onclick="O2.backupRestore()">${I('swap')}Buluttan geri yükle</button>` : `
            <button class="o2-btn o2-btn-gold o2-btn-block" onclick="O2.closeSheet(true); logout();">Giriş yap ve yedeği aç</button>`}
            <div class="o2-grid-2" style="margin-top:10px">
                <button class="o2-btn o2-btn-ghost" onclick="O2.backup.exportFile()">Dosyaya aktar</button>
                <button class="o2-btn o2-btn-ghost" onclick="document.getElementById('o2-backup-file').click()">Dosyadan yükle</button>
            </div>
            <input type="file" id="o2-backup-file" accept="application/json,.json" hidden onchange="this.files[0] && O2.backup.importFile(this.files[0])">`);
    };
    O2.backupNow = async () => {
        O2.toast('Yedekleniyor…', 'settings');
        const res = await O2.backup.sync({ silent: true });
        O2.toast(res ? 'Tüm verilerin bulutta' : 'Yedeklenemedi · bağlantını kontrol et', res ? 'check' : 'bolt');
        if (res && O2.isSheetOpen()) O2.backupSheet();
    };
    O2.backupRestore = async () => {
        if (!confirm('Buluttaki yedek bu cihazdaki verilerin üzerine yazılacak. Devam edilsin mi?')) return;
        sessionStorage.removeItem('oly_kv_reloaded');
        O2.toast('Geri yükleniyor…', 'swap');
        const res = await O2.backup.sync({ force: true });
        if (res && !res.changed) O2.toast('Cihaz zaten bulutla aynı', 'check');
        if (!res) O2.toast('Geri yüklenemedi', 'bolt');
    };

    // ==========================================
    // 🔌 OTOMATİK ÇALIŞMA
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        // Tarayıcıdan kalıcı depolama iste (otomatik temizlemeye karşı)
        if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(() => { });
        if (typeof auth !== 'undefined') {
            auth.onAuthStateChanged(u => { if (u) setTimeout(() => O2.backup.sync(), 1500); });
        }
        const restored = sessionStorage.getItem('oly_kv_toast');
        if (restored) {
            sessionStorage.removeItem('oly_kv_toast');
            setTimeout(() => O2.toast && O2.toast(`Verilerin buluttan geri yüklendi (${restored} kayıt)`, 'check'), 2500);
        }
    });
    // Uygulama arka plana alınınca bekleyenleri hemen gönder
    document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(pushTimer); push(); } });
})();
