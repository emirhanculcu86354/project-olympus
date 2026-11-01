// Olympus Training — bildirim merkezi (zil butonu)
// Sağdan kayan panel: "Şimdi senin için" akıllı kartları + gelen kutusu (sosyal bildirimler ve uygulama olayları),
// filtreler, okunmamış rozeti, gün gruplaması. Uygulama olayları oly2_inbox'ta tutulur.
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);
    const KEY = 'oly2_inbox', SEEN = 'oly2_inbox_seen';

    const TYPES = {
        social: { label: 'Sosyal', color: '#6b9cf5', icon: 'chat' },
        train: { label: 'Antrenman', color: '#e6c374', icon: 'trophy' },
        academy: { label: 'Akademi', color: '#4fc3a1', icon: 'shield' },
        system: { label: 'Sistem', color: '#a78bfa', icon: 'settings' }
    };

    // ==========================================
    // 📥 GELEN KUTUSU VERİSİ
    // ==========================================
    O2.inboxAdd = (item) => {
        const list = LS.get(KEY, []) || [];
        list.push({ id: 'i' + Date.now() + Math.random().toString(36).slice(2, 5), t: Date.now(), type: 'system', ...item });
        LS.set(KEY, list.slice(-80));
        O2.syncNotifBadge();
    };
    const social = () => (window.__olySocialNotifs || []).map((n, i) => ({
        id: 's' + (n.timestamp || i), t: n.timestamp || 0, type: 'social', title: socialTitle(n.message), text: n.message, social: true
    }));
    function socialTitle(m) {
        m = String(m || '');
        if (/kadro|maç|⚽/i.test(m)) return 'Maç daveti';
        if (/takip/i.test(m)) return 'Yeni takipçi';
        if (/beğen|❤/i.test(m)) return 'Beğeni';
        return 'Yeni bildirim';
    }
    const allItems = () => [...(LS.get(KEY, []) || []).filter(x => !x.hidden), ...social()].sort((a, b) => b.t - a.t);
    const seen = () => +LS.raw(SEEN, 0) || 0;
    const unread = () => allItems().filter(x => x.t > seen()).length;

    O2.syncNotifBadge = () => {
        const dst = $('o2-notif-badge');
        if (!dst) return;
        const n = unread();
        dst.classList.toggle('hidden', !n);
        dst.textContent = n > 9 ? '9+' : n;
    };
    O2.onSocialNotifs = () => { O2.syncNotifBadge(); if (isOpen()) paint(); };

    // ==========================================
    // ✨ ŞİMDİ SENİN İÇİN (canlı, üretilen kartlar)
    // ==========================================
    function smartCards() {
        const out = [];
        const add = (c) => { if (!out.some(x => x.id === c.id)) out.push(c); };
        const dk = O2.dayKey();
        const trained = O2.sessions().some(s => s.dayKey === dk && s.type !== 'cardio');
        const plan = O2.dayPlan(0);
        if (trained) add({ id: 'done', tone: 'good', icon: 'trophy', title: 'Bugünkü seans tamam 💪', text: 'Toparlanma: protein, su ve 7+ saat uyku.' });
        else if (!plan.isRest) add({ id: 'session', tone: 'gold', icon: 'play', title: `Bugün: ${String(plan.title || '').split(':').pop().trim()}`, text: 'Hazırsan tek dokunuşla başla.', btn: ['Başla', 'start'] });

        (O2.smartAlerts ? O2.smartAlerts() : []).slice(0, 3).forEach(a => add({ id: 'al-' + a.id, tone: a.level === 'warn' ? 'warn' : a.level === 'good' ? 'good' : 'info', icon: a.icon, title: a.title, text: a.text, btn: a.action ? ['Aç', a.action] : null, dismiss: a.id }));

        const b = O2.briefing ? O2.briefing(0) : null;
        if (b && b.gaps.some(g => /uyku/i.test(g))) add({ id: 'sleep', tone: 'info', icon: 'moon', title: 'Uykunu kaydetmedin', text: 'Hazırlık skorun uykuya göre hesaplanıyor.', btn: ['Kaydet', 'sleep'] });
        const w = O2.water();
        if (w.goal && w.amount < w.goal && new Date().getHours() >= 14) add({ id: 'water', tone: 'info', icon: 'drop', title: `${O2.fmtNum((w.goal - w.amount) / 1000, 1)} L su kaldı`, text: 'Bir bardak şimdi iç; hedef yakın.', btn: ['+250 ml', 'water'] });
        if (O2.reviewCard && O2.reviewCard()) add({ id: 'review', tone: 'gold', icon: 'list', title: 'Haftanı değerlendir', text: '3 dakika; AI gelecek haftanı planlasın.', btn: ['Başla', 'review'] });

        const next = O2.notifySchedule ? O2.notifySchedule(2)[0] : null;
        if (next) add({ id: 'next', tone: 'muted', icon: 'clock', title: `Sıradaki hatırlatma · ${new Date(next.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`, text: next.title.replace(/^[^\wÇĞİÖŞÜçğıöşü]+/, ''), btn: ['Ayarlar', 'notifsettings'] });
        else add({ id: 'next', tone: 'muted', icon: 'bell', title: 'Planlı hatırlatma yok', text: 'Antrenman, akış ve öğün saatleri için hatırlatıcıları aç.', btn: ['Aç', 'notifsettings'] });

        const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
        const r = O2.reminderSettings ? O2.reminderSettings() : {};
        if (!isNative && !(r.push && localStorage.getItem('oly2_push_token')) && O2.pushSupported && O2.pushSupported()) add({ id: 'push', tone: 'violet', icon: 'bell', title: 'Telefona anlık bildirim kapalı', text: 'Uygulama kapalıyken de hatırlatma almak için aç.', btn: ['Aç', 'notifsettings'] });
        return out.slice(0, 5);
    }

    // ==========================================
    // 🖥️ PANEL
    // ==========================================
    let filter = 'all';
    const isOpen = () => { const el = $('o2-inbox'); return !!(el && el.classList.contains('open')); };
    const rel = (t) => {
        const s = Math.round((Date.now() - t) / 1000);
        if (s < 60) return 'şimdi';
        if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
        if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
        if (s < 7 * 86400) return `${Math.floor(s / 86400)} gün önce`;
        return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    };
    const group = (t) => {
        const d = O2.startOfDay(new Date(t)), today = O2.startOfDay();
        const diff = Math.round((today - d) / 864e5);
        return diff <= 0 ? 'Bugün' : diff === 1 ? 'Dün' : diff < 7 ? 'Bu hafta' : 'Daha önce';
    };

    function paint() {
        const el = $('o2-inbox');
        if (!el) return;
        const items = allItems().filter(x => filter === 'all' || x.type === filter);
        const lastSeen = +el.dataset.seen || 0;
        const cards = smartCards();
        const counts = Object.fromEntries(Object.keys(TYPES).map(k => [k, allItems().filter(x => x.type === k).length]));
        let lastG = '';
        el.querySelector('.o2-inbox-body').innerHTML = `
            <div class="o2-inbox-section"><span>Şimdi senin için</span></div>
            <div class="o2-inbox-cards">${cards.map(c => `
                <div class="o2-inbox-card ${c.tone}">
                    <i>${I(c.icon)}</i>
                    <div><h5>${esc(c.title)}</h5><p>${esc(c.text)}</p></div>
                    ${c.btn ? `<button class="o2-inbox-btn" onclick="O2.inboxAct('${c.btn[1]}')">${esc(c.btn[0])}</button>` : ''}
                    ${c.dismiss ? `<button class="o2-inbox-x" onclick="O2.inboxDismissAlert('${c.dismiss}')" aria-label="Kapat">${I('close')}</button>` : ''}
                </div>`).join('')}</div>

            <div class="o2-inbox-filters">
                <button class="${filter === 'all' ? 'on' : ''}" onclick="O2.inboxFilter('all')">Tümü</button>
                ${Object.entries(TYPES).map(([k, t]) => `<button class="${filter === k ? 'on' : ''}" onclick="O2.inboxFilter('${k}')">${t.label}${counts[k] ? ` <b>${counts[k]}</b>` : ''}</button>`).join('')}
            </div>

            ${items.length ? items.map(x => {
                const t = TYPES[x.type] || TYPES.system;
                const g = group(x.t);
                const head = g !== lastG ? `<div class="o2-inbox-section"><span>${g}</span></div>` : '';
                lastG = g;
                return `${head}
                <div class="o2-inbox-item ${x.t > lastSeen ? 'new' : ''}" style="--c:${t.color}" ${x.action ? `onclick="O2.inboxAct('${x.action}')"` : ''}>
                    <i>${x.emoji ? `<span>${esc(x.emoji)}</span>` : I(x.icon || t.icon)}</i>
                    <div><h5>${esc(x.title || t.label)}</h5>${x.text ? `<p>${esc(x.text)}</p>` : ''}<small>${t.label} · ${rel(x.t)}</small></div>
                    ${x.social ? '' : `<button class="o2-inbox-x" onclick="event.stopPropagation(); O2.inboxRemove('${x.id}')" aria-label="Sil">${I('close')}</button>`}
                </div>`;
            }).join('') : `
            <div class="o2-inbox-empty">
                <div class="o2-inbox-bell">${I('bell')}<span>✦</span><span>✦</span></div>
                <h4>Her şey yolunda</h4>
                <p>${filter === 'all' ? 'Rekorlar, maç davetleri, takipçiler ve Akademi gelişmelerin burada birikecek.' : `${TYPES[filter].label} bildirimi yok.`}</p>
            </div>`}`;
    }

    O2.openNotifications = () => {
        let el = $('o2-inbox');
        if (!el) {
            el = document.createElement('div');
            el.id = 'o2-inbox';
            el.className = 'o2-inbox';
            el.innerHTML = `
                <div class="o2-inbox-backdrop" onclick="O2.closeInbox()"></div>
                <aside class="o2-inbox-panel" role="dialog" aria-label="Bildirimler">
                    <header class="o2-inbox-head">
                        <div><div class="o2-eyebrow" id="o2-inbox-sub"></div><h3>Bildirimler</h3></div>
                        <div style="display:flex;gap:8px">
                            <button class="o2-icon-btn" onclick="O2.inboxClearAll()" aria-label="Tümünü temizle" title="Tümünü temizle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>
                            <button class="o2-icon-btn" onclick="O2.inboxAct('notifsettings')" aria-label="Bildirim ayarları" title="Bildirim ayarları">${I('settings')}</button>
                            <button class="o2-icon-btn" onclick="O2.closeInbox()" aria-label="Kapat">${I('close')}</button>
                        </div>
                    </header>
                    <div class="o2-inbox-body"></div>
                </aside>`;
            $('oly2-screen').appendChild(el);
        }
        // Açılış anındaki "son görülme"yi sakla: yeni olanlar bu açılışta vurgulu kalsın, rozet sıfırlansın
        el.dataset.seen = seen();
        const n = unread();
        $('o2-inbox-sub').textContent = n ? `${n} yeni` : 'Hepsi okundu';
        localStorage.setItem(SEEN, String(Date.now()));
        O2.syncNotifBadge();
        paint();
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')));
        if (O2.markLayer) O2.markLayer();
        O2.haptic(10);
    };
    O2.closeInbox = () => {
        const el = $('o2-inbox');
        if (el) el.classList.remove('open');
    };
    O2.isInboxOpen = isOpen;
    O2.inboxFilter = (f) => { filter = f; O2.haptic(6); paint(); };
    O2.inboxRemove = (id) => {
        LS.set(KEY, (LS.get(KEY, []) || []).map(x => x.id === id ? { ...x, hidden: true } : x));
        paint();
    };
    O2.inboxDismissAlert = (id) => { if (O2.dismissAlert) { const d = LS.get('oly2_alert_dismiss', {}) || {}; d[id] = O2.dayKey(); LS.set('oly2_alert_dismiss', d); } paint(); };
    O2.inboxClearAll = () => {
        if (!confirm('Tüm bildirimler temizlensin mi? (Maç davetleri ve takipçi bildirimleri de silinir)')) return;
        LS.set(KEY, (LS.get(KEY, []) || []).map(x => ({ ...x, hidden: true })));
        if (typeof clearNotifications === 'function' && (window.__olySocialNotifs || []).length) clearNotifications();
        window.__olySocialNotifs = [];
        paint(); O2.syncNotifBadge();
        O2.toast('Bildirimler temizlendi', 'check');
    };
    O2.inboxAct = (action) => {
        O2.closeInbox();
        if (action === 'notifsettings') { setTimeout(() => O2.remindersSheet(), 250); return; }
        if (action === 'water') { O2.quickWater(); return; }
        O2.handleAction(action);
    };

    // Geri tuşu / Esc: önce paneli kapat
    const baseBack = O2.back;
    O2.back = () => { if (isOpen()) { O2.closeInbox(); return; } baseBack(); };

    // ==========================================
    // 📝 UYGULAMA OLAYLARINI GELEN KUTUSUNA YAZ
    // ==========================================
    const baseSave = O2.saveSession;
    O2.saveSession = function () {
        const s = O2.activeSession();
        const res = baseSave.apply(this, arguments);
        if (s) {
            (s.prs || []).forEach(p => O2.inboxAdd({ type: 'train', emoji: '🏆', title: `Yeni rekor · ${p.ex}`, text: `${O2.fmtNum(p.w, 1)} kg × ${p.r} · tahmini 1RM ${O2.fmtNum(p.e1rm, 1)} kg (önceki ${O2.fmtNum(p.prev, 1)})`, action: 'progress' }));
            const wk = O2.weekStats(0), target = O2.settings().weeklyTarget;
            if (wk.sessions === target) O2.inboxAdd({ type: 'train', emoji: '🔥', title: 'Haftalık hedef tamam', text: `${target} seans tamamlandı. Seri devam ediyor!`, action: 'progress' });
        }
        return res;
    };
    if (O2.acadSaveTest) {
        const baseTest = O2.acadSaveTest;
        O2.acadSaveTest = function () {
            const before = (LS.get('oly2_academy', {}) || {}).tests || [];
            const res = baseTest.apply(this, arguments);
            const after = (LS.get('oly2_academy', {}) || {}).tests || [];
            if (after.length > before.length) {
                const t = after.find(x => !before.some(b => b.id === x.id));
                if (t && t.res) Object.entries(t.res).forEach(([k, v]) => {
                    const prev = before.map(b => b.res && b.res[k]).filter(x => x !== undefined);
                    if (!prev.length) return;
                    const lowBetter = k === 'parkur' || k === 'run400';
                    const bestPrev = lowBetter ? Math.min(...prev) : Math.max(...prev);
                    if (lowBetter ? v < bestPrev : v > bestPrev) O2.inboxAdd({ type: 'academy', emoji: '🛡️', title: `Akademi rekoru · ${{ parkur: 'Parkur', run400: '400 m', pushup: 'Şınav', situp: 'Mekik' }[k] || k}`, text: `${v}${lowBetter ? ' sn' : ' tekrar'} (önceki en iyi ${bestPrev}${lowBetter ? ' sn' : ''})`, action: 'academy' });
                });
            }
            return res;
        };
    }
    O2.actions = O2.actions || {};
    O2.actions.progress = () => O2.go('progress');

    // İlk kurulumda karşılama
    document.addEventListener('DOMContentLoaded', () => {
        if (!localStorage.getItem(KEY)) O2.inboxAdd({ type: 'system', emoji: '✨', title: 'Bildirim merkezi yenilendi', text: 'Rekorların, maç davetlerin, Akademi gelişmelerin ve sana özel öneriler artık burada.', action: '' });
        setTimeout(() => O2.syncNotifBadge(), 1500);
        setInterval(() => { if (!document.hidden) O2.syncNotifBadge(); }, 60 * 1000);
    });
})();
