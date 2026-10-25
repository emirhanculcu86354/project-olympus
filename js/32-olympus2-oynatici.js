// Olympus 2.0 spor modülü — canlı antrenman oynatıcısı: set kaydı, dinlenme sayacı, PR tespiti, seans özeti
// Devam eden seans her değişiklikte "oly2_active_session" anahtarına yazılır; uygulama kapansa bile kaldığı yerden sürer.
(function () {
    const O2 = window.O2 = window.O2 || {};
    const LS = O2.LS;
    const I = (n, c) => O2.icon(n, c);
    const esc = (v) => escapeHTML(v);
    const $ = (id) => document.getElementById(id);

    let S = null;            // aktif seans
    let ticker = null;       // saat / dinlenme döngüsü
    let wakeLock = null;
    let summaryMode = false;

    const persist = () => { if (S) LS.set('oly2_active_session', S); };
    O2.activeSession = () => S || LS.get('oly2_active_session', null);
    O2.isPlayerOpen = () => !$('o2-player').classList.contains('hidden');

    // ==========================================
    // ▶️ BAŞLAT / DEVAM ET
    // ==========================================
    O2.orb = () => {
        if (O2.activeSession()) return O2.resumeSession();
        const plan = O2.dayPlan(0);
        if (plan.isRest) {
            O2.toast('Bugün dinlenme günü · Antrenman sekmesinden başka bir gün seçebilirsin', 'moon');
            O2.go('train');
            return;
        }
        O2.startSession(0);
    };

    O2.startSession = (offset = 0) => {
        const existing = O2.activeSession();
        if (existing && !confirm(`"${existing.title}" seansı hâlâ devam ediyor.\nYeni antrenman başlatılırsa o seans silinecek. Devam edilsin mi?`)) {
            return O2.resumeSession();
        }
        const program = O2.activeProgram();
        const plan = O2.dayPlan(offset, program);
        if (plan.isRest) { O2.toast('Seçili gün dinlenme günü', 'moon'); return; }

        S = {
            id: 'o2_' + Date.now(),
            title: plan.title,
            programId: program.id,
            startedAt: Date.now(),
            cur: 0,
            rest: null,
            prs: [],
            exercises: plan.ex.map(e => {
                const target = O2.parseScheme(e.scheme);
                const sug = O2.suggest(e);
                const last = O2.lastPerformance(e.name);
                return {
                    name: e.name, scheme: e.scheme, tempo: e.tempo, rpe: e.rpe,
                    muscle: O2.muscleOf(e.name), target, note: sug.note,
                    sets: Array.from({ length: target.sets }, (_, i) => {
                        const prev = last && (last.sets[i] || last.sets[last.sets.length - 1]);
                        return { w: sug.w === '' ? '' : sug.w, r: sug.r === '' ? '' : sug.r, done: false, prev: prev ? `${prev.w}×${prev.r}` : '—' };
                    })
                };
            })
        };
        persist();
        summaryMode = false;
        if (typeof startWorkoutBackgroundEngine === 'function') startWorkoutBackgroundEngine(plan.title);
        O2.haptic([30, 60, 30]);
        openPlayer();
    };

    O2.resumeSession = () => {
        S = O2.activeSession();
        if (!S) return;
        summaryMode = false;
        openPlayer();
    };

    function openPlayer() {
        $('o2-player').classList.remove('hidden');
        $('o2-live-pill').classList.add('hidden');
        requestWakeLock();
        renderPlayer();
        startTicker();
    }

    O2.minimizePlayer = () => {
        $('o2-player').classList.add('hidden');
        O2.refreshLivePill();
        O2.render();
    };

    // Tab çubuğunun üstündeki "devam eden seans" kapsülü
    O2.refreshLivePill = () => {
        const active = O2.activeSession();
        const pill = $('o2-live-pill');
        const orb = document.querySelector('.o2-orb');
        if (orb) orb.classList.toggle('live', !!active);
        if (!active || O2.isPlayerOpen()) { pill.classList.add('hidden'); return; }
        pill.classList.remove('hidden');
        pill.innerHTML = `<i></i>${esc(String(active.title).split(':').pop().trim())} <span id="o2-pill-clock">${O2.fmtClock((Date.now() - active.startedAt) / 1000)}</span>`;
        startTicker();
    };

    // ==========================================
    // ⏱️ SAAT & DİNLENME DÖNGÜSÜ
    // ==========================================
    function startTicker() {
        if (ticker) return;
        ticker = setInterval(tick, 250);
    }
    function stopTicker() { clearInterval(ticker); ticker = null; }

    function tick() {
        const active = O2.activeSession();
        if (!active) { stopTicker(); return; }
        const elapsed = (Date.now() - active.startedAt) / 1000;
        const clock = $('o2-player-clock');
        if (clock) clock.textContent = O2.fmtClock(elapsed);
        const pillClock = $('o2-pill-clock');
        if (pillClock) pillClock.textContent = O2.fmtClock(elapsed);

        if (S && S.rest) {
            const left = (S.rest.until - Date.now()) / 1000;
            if (left <= 0) return endRest(true);
            const num = $('o2-rest-num');
            if (num) {
                num.textContent = O2.fmtClock(Math.ceil(left));
                const bar = $('o2-rest-bar');
                const c = parseFloat(bar.getAttribute('stroke-dasharray'));
                bar.style.strokeDashoffset = c * (1 - left / S.rest.total);
            }
            // 3-2-1 son saniye titreşimi
            const sec = Math.ceil(left);
            if (sec <= 3 && S.rest.lastBeep !== sec) { S.rest.lastBeep = sec; O2.haptic(25); }
        }
    }

    // ==========================================
    // 🖥️ OYNATICI ARAYÜZÜ
    // ==========================================
    const currentSetIndex = (ex) => ex.sets.findIndex(s => !s.done);
    const exDone = (ex) => ex.sets.length > 0 && ex.sets.every(s => s.done);

    function renderPlayer() {
        if (summaryMode) return renderSummary();
        const ex = S.exercises[S.cur];
        const ci = currentSetIndex(ex);
        const next = S.exercises[S.cur + 1];
        const isLast = S.cur === S.exercises.length - 1;
        const allDone = S.exercises.every(exDone);
        const cta = ci >= 0
            ? { label: `${ci + 1}. seti tamamla`, fn: `O2.completeSet(${ci})`, icon: 'check' }
            : (isLast || allDone ? { label: 'Antrenmanı bitir', fn: 'O2.finishSession()', icon: 'trophy' } : { label: 'Sonraki hareket', fn: 'O2.gotoExercise(' + (S.cur + 1) + ')', icon: 'chev' });

        $('o2-player').innerHTML = `
            <div class="o2-player-top">
                <button class="o2-icon-btn" onclick="O2.minimizePlayer()" aria-label="Küçült">${I('min')}</button>
                <div class="o2-player-clock"><strong id="o2-player-clock">${O2.fmtClock((Date.now() - S.startedAt) / 1000)}</strong><small>${esc(String(S.title).split(':').pop().trim().toUpperCase())}</small></div>
                <button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.finishSession()">Bitir</button>
            </div>
            <div class="o2-progress">${S.exercises.map((e, i) => {
                const pct = e.sets.filter(s => s.done).length / e.sets.length * 100;
                return `<i class="${exDone(e) ? 'done' : ''}" onclick="O2.gotoExercise(${i})" style="cursor:pointer"><b style="width:${pct}%"></b></i>`;
            }).join('')}</div>

            <div class="o2-player-body" id="o2-player-body">
                <div class="o2-ex-head" key="${S.cur}">
                    <div class="o2-eyebrow">Hareket ${S.cur + 1} / ${S.exercises.length} · ${O2.MUSCLES[ex.muscle]}</div>
                    <h1>${esc(ex.name)}</h1>
                    <div class="o2-ex-target">
                        <span class="o2-chip gold">${esc(ex.scheme)}</span>
                        ${ex.tempo ? `<span class="o2-chip">Tempo ${esc(ex.tempo)}</span>` : ''}
                        ${ex.rpe ? `<span class="o2-chip">RPE ${esc(ex.rpe)}</span>` : ''}
                    </div>
                </div>

                ${ex.note ? `<div class="o2-insight">${I('spark')}<span>${ex.note}</span></div>` : ''}

                <div class="o2-sets">
                    <div class="o2-sets-head"><span>Set</span><span>Önceki</span><span>${ex.target.isTime ? 'Kg' : 'Kg'}</span><span>${ex.target.isTime ? 'Sn' : 'Tekrar'}</span><span></span></div>
                    ${ex.sets.map((s, i) => `
                    <div class="o2-set ${s.done ? 'done' : ''} ${i === ci ? 'current' : ''}">
                        <span class="o2-set-no">${i + 1}</span>
                        <span class="o2-set-prev">${esc(s.prev)}</span>
                        <input type="number" inputmode="decimal" step="0.5" value="${s.w}" placeholder="—" onchange="O2.editSet(${i}, 'w', this.value)" aria-label="${i + 1}. set ağırlık">
                        <input type="number" inputmode="numeric" value="${s.r}" placeholder="${ex.target.isMax ? 'max' : '—'}" onchange="O2.editSet(${i}, 'r', this.value)" aria-label="${i + 1}. set tekrar">
                        <button class="o2-set-check" onclick="O2.completeSet(${i})" aria-label="${i + 1}. seti tamamla">${I('check')}</button>
                    </div>`).join('')}
                </div>

                <div class="o2-player-actions">
                    <button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.addSet()">${I('plus')}Set ekle</button>
                    <a class="o2-btn o2-btn-ghost o2-btn-sm" style="text-decoration:none" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' exercise form')}">${I('play')}Teknik</a>
                    <button class="o2-btn o2-btn-ghost o2-btn-sm" onclick="O2.exerciseList()">${I('list')}Liste</button>
                </div>

                ${next ? `
                <div class="o2-card o2-upnext is-tap" onclick="O2.gotoExercise(${S.cur + 1})">
                    <div style="flex:1"><small>SIRADAKİ</small><h5>${esc(next.name)}</h5></div>
                    <span class="o2-chip">${esc(next.scheme)}</span>
                </div>` : ''}
            </div>

            <div class="o2-player-foot">
                <button class="o2-icon-btn" onclick="O2.gotoExercise(${S.cur - 1})" ${S.cur === 0 ? 'disabled style="opacity:.3"' : ''} aria-label="Önceki hareket">${I('prev')}</button>
                <button class="o2-btn o2-btn-gold" onclick="${cta.fn}">${I(cta.icon)}${cta.label}</button>
                <button class="o2-icon-btn" onclick="O2.gotoExercise(${S.cur + 1})" ${isLast ? 'disabled style="opacity:.3"' : ''} aria-label="Sonraki hareket">${I('skip')}</button>
            </div>

            ${S.rest ? restOverlay() : ''}
            <div class="o2-pr-burst" id="o2-pr-burst"></div>`;
    }

    function restOverlay() {
        const ex = S.exercises[S.cur];
        const ci = currentSetIndex(ex);
        let nextLabel = '';
        if (ci >= 0) nextLabel = `${ci + 1}. set · ${ex.sets[ci].w || '—'} kg × ${ex.sets[ci].r || '—'}`;
        else if (S.exercises[S.cur + 1]) nextLabel = S.exercises[S.cur + 1].name;
        else nextLabel = 'Antrenmanı bitir';
        const size = 240, stroke = 14, r = (size - stroke) / 2, c = 2 * Math.PI * r;
        const left = Math.max(0, (S.rest.until - Date.now()) / 1000);
        return `
        <div class="o2-rest" id="o2-rest">
            <div class="o2-eyebrow" style="letter-spacing:4px">Dinlen</div>
            <div class="o2-ring-wrap" style="width:${size}px;height:${size}px">
                <svg viewBox="0 0 ${size} ${size}">
                    <defs><linearGradient id="o2RestG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6dea0"/><stop offset="1" stop-color="#b9842c"/></linearGradient></defs>
                    <circle class="o2-ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
                    <circle id="o2-rest-bar" class="o2-ring-bar" style="transition:stroke-dashoffset .25s linear" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke="url(#o2RestG)" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - left / S.rest.total)}"/>
                </svg>
                <div class="o2-ring-center"><strong id="o2-rest-num">${O2.fmtClock(Math.ceil(left))}</strong><span>SANİYE</span></div>
            </div>
            <div class="o2-rest-next"><small>SIRADAKİ</small><h4>${esc(nextLabel)}</h4></div>
            <div class="o2-rest-controls">
                <button class="o2-btn o2-btn-ghost" onclick="O2.adjustRest(-15)">−15</button>
                <button class="o2-btn o2-btn-gold" onclick="O2.skipRest()">Atla</button>
                <button class="o2-btn o2-btn-ghost" onclick="O2.adjustRest(15)">+15</button>
            </div>
        </div>`;
    }

    // ==========================================
    // ✅ SET İŞLEMLERİ
    // ==========================================
    O2.editSet = (i, field, value) => {
        const ex = S.exercises[S.cur];
        ex.sets[i][field] = value === '' ? '' : parseFloat(value);
        // Ağırlık değişince sonraki tamamlanmamış setlere de taşı (gerçek salon akışı)
        if (field === 'w') ex.sets.forEach((s, j) => { if (j > i && !s.done) s.w = ex.sets[i].w; });
        persist();
        if (field === 'w') renderPlayer();
    };

    O2.addSet = () => {
        const ex = S.exercises[S.cur];
        const last = ex.sets[ex.sets.length - 1] || { w: '', r: '' };
        ex.sets.push({ w: last.w, r: last.r, done: false, prev: '—' });
        persist();
        O2.haptic(10);
        renderPlayer();
    };

    O2.completeSet = (i) => {
        const ex = S.exercises[S.cur];
        const set = ex.sets[i];
        // Tamamlanmış sete tekrar dokunmak işareti geri alır
        if (set.done) {
            set.done = false;
            S.prs = S.prs.filter(p => !(p.ex === ex.name && p.setIndex === i));
            persist(); renderPlayer(); return;
        }
        // Formdaki son değerleri al (onchange tetiklenmemiş olabilir)
        const row = document.querySelectorAll('.o2-set')[i];
        if (row) {
            const [wIn, rIn] = row.querySelectorAll('input');
            set.w = wIn.value === '' ? '' : parseFloat(wIn.value);
            set.r = rIn.value === '' ? '' : parseFloat(rIn.value);
        }
        // Bu sette kullanılan ağırlık, kalan setler için de varsayılan olsun
        if (set.w !== '') ex.sets.forEach((s, j) => { if (j > i && !s.done) s.w = set.w; });
        if (set.r === '' || set.r <= 0) {
            O2.toast(ex.target.isTime ? 'Süreyi gir' : 'Tekrar sayısını gir', 'bolt');
            return;
        }
        set.done = true;
        set.ts = Date.now();
        O2.haptic([15, 40, 15]);

        const prHit = checkPR(ex, i);
        const lastOfAll = S.exercises.every(exDone);
        if (!lastOfAll) startRest();
        persist();
        renderPlayer();
        if (prHit) celebratePR(prHit);
        if (lastOfAll) O2.toast('Tüm setler tamam · Antrenmanı bitirebilirsin', 'trophy');
    };

    // Kişisel rekor: tahmini 1RM, geçmiş en iyiden ve bu seanstaki önceki setlerden yüksekse
    function checkPR(ex, i) {
        const set = ex.sets[i];
        if (ex.target.isTime || !set.w) return null;
        const e = O2.e1rm(set.w, set.r);
        const best = O2.bests()[ex.name];
        const sessionBest = Math.max(0, ...S.prs.filter(p => p.ex === ex.name).map(p => p.e1rm));
        if (!best) return null; // ilk kayıt rekor sayılmaz; referans oluşturur
        if (e > best.e1rm + .01 && e > sessionBest) {
            S.prs = S.prs.filter(p => p.ex !== ex.name);
            const pr = { ex: ex.name, w: set.w, r: set.r, e1rm: Math.round(e * 10) / 10, prev: Math.round(best.e1rm * 10) / 10, setIndex: i };
            S.prs.push(pr);
            return pr;
        }
        return null;
    }

    function celebratePR(pr) {
        const el = $('o2-pr-burst');
        if (!el) return;
        el.innerHTML = `<small>KİŞİSEL REKOR</small><h3>${O2.fmtNum(pr.w, 1)} kg × ${pr.r}</h3><p>${esc(pr.ex)} · 1RM ${O2.fmtNum(pr.prev, 1)} → <b style="color:var(--o2-gold)">${O2.fmtNum(pr.e1rm, 1)} kg</b></p>`;
        el.classList.add('show');
        O2.haptic([40, 60, 40, 60, 120]);
        if (typeof confetti === 'function') confetti({ particleCount: 140, spread: 85, origin: { y: .35 }, colors: ['#f6dea0', '#e6c374', '#b9842c', '#ffffff'] });
        setTimeout(() => el.classList.remove('show'), 2600);
    }

    // ==========================================
    // 😮‍💨 DİNLENME
    // ==========================================
    function startRest() {
        const total = O2.settings().restSec;
        S.rest = { until: Date.now() + total * 1000, total };
    }
    O2.adjustRest = (d) => {
        if (!S.rest) return;
        S.rest.until = Math.max(Date.now() + 5000, S.rest.until + d * 1000);
        S.rest.total = Math.max(S.rest.total + d, 5);
        persist(); O2.haptic(8); tick();
    };
    O2.skipRest = () => endRest(false);

    function endRest(natural) {
        if (!S || !S.rest) return;
        S.rest = null;
        persist();
        const el = $('o2-rest');
        if (el) el.remove();
        if (natural) {
            O2.haptic([200, 100, 200]);
            beep();
            if (typeof showDynamicIsland === 'function' && document.hidden) showDynamicIsland('Dinlenme bitti', 'Sıradaki sete hazırlan', '⚡');
        }
        // Mevcut hareketin setleri bittiyse otomatik sonrakine geç
        const ex = S.exercises[S.cur];
        if (exDone(ex) && S.cur < S.exercises.length - 1) S.cur++;
        persist();
        if (O2.isPlayerOpen()) renderPlayer();
    }

    let audioCtx = null;
    function beep() {
        try {
            audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            [0, .18].forEach((t, k) => {
                const o = audioCtx.createOscillator(), g = audioCtx.createGain();
                o.type = 'sine';
                o.frequency.value = k ? 1320 : 880;
                g.gain.setValueAtTime(.0001, audioCtx.currentTime + t);
                g.gain.exponentialRampToValueAtTime(.25, audioCtx.currentTime + t + .02);
                g.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + t + .16);
                o.connect(g).connect(audioCtx.destination);
                o.start(audioCtx.currentTime + t);
                o.stop(audioCtx.currentTime + t + .18);
            });
        } catch (e) { }
    }

    // ==========================================
    // 🧭 HAREKETLER ARASI GEÇİŞ
    // ==========================================
    O2.gotoExercise = (i) => {
        if (i < 0 || i >= S.exercises.length) return;
        S.cur = i;
        S.rest = null;
        persist();
        O2.haptic(8);
        renderPlayer();
        const body = $('o2-player-body');
        if (body) body.scrollTop = 0;
    };

    O2.exerciseList = () => {
        O2.sheet('Hareketler', `<div class="o2-list">${S.exercises.map((e, i) => `
            <div class="o2-row is-tap" onclick="O2.closeSheet(); O2.gotoExercise(${i})">
                <div class="o2-row-idx" style="${exDone(e) ? 'background:rgba(61,220,151,.14);color:var(--o2-green)' : i === S.cur ? 'background:var(--o2-gold-grad);color:#171104' : ''}">${exDone(e) ? I('check') : i + 1}</div>
                <div class="o2-row-main"><h5>${esc(e.name)}</h5><p>${e.sets.filter(s => s.done).length}/${e.sets.length} set · ${esc(e.scheme)}</p></div>
            </div>`).join('')}</div>`);
    };

    // ==========================================
    // 🏁 BİTİR & ÖZET
    // ==========================================
    O2.finishSession = () => {
        const doneSets = S.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
        if (!doneSets) {
            if (confirm('Henüz hiç set tamamlamadın. Bu seans kaydedilmeden silinsin mi?')) discard();
            return;
        }
        const total = S.exercises.reduce((a, e) => a + e.sets.length, 0);
        if (doneSets < total && !confirm(`${total - doneSets} set tamamlanmadı. Antrenman yine de bitirilsin mi?`)) return;
        S.rest = null;
        S.endedAt = Date.now();
        S.rating = S.rating || 3;
        persist();
        summaryMode = true;
        renderPlayer();
        if (typeof confetti === 'function') {
            confetti({ particleCount: 160, spread: 100, origin: { y: .3 }, colors: ['#f6dea0', '#e6c374', '#b9842c', '#ffffff'] });
        }
        O2.haptic([50, 80, 50, 80, 150]);
    };

    function summarize() {
        let volume = 0, setCount = 0;
        const muscles = new Set();
        const exercises = S.exercises.map(e => {
            const sets = e.sets.filter(s => s.done).map(s => ({ w: +s.w || 0, r: +s.r || 0 }));
            sets.forEach(s => { if (!e.target.isTime) volume += s.w * s.r; });
            setCount += sets.length;
            if (sets.length) muscles.add(e.muscle);
            return { name: e.name, muscle: e.muscle, sets };
        });
        const durationSec = Math.round(((S.endedAt || Date.now()) - S.startedAt) / 1000);
        return { volume: Math.round(volume), setCount, muscles: [...muscles], exercises, durationSec, kcal: Math.round(durationSec / 60 * 6.5) };
    }

    const RATINGS = [['😌', 'Çok kolay'], ['🙂', 'Rahat'], ['💪', 'İdeal'], ['🔥', 'Zorlu'], ['🥵', 'Limit']];

    function renderSummary() {
        const sum = summarize();
        const fill = (m) => sum.muscles.includes(m) ? 'url(#o2FigGold)' : '#24242c';
        $('o2-player').innerHTML = `
            <div class="o2-summary">
                <div class="o2-summary-crown">${I('trophy')}</div>
                <h1>Antrenman tamamlandı</h1>
                <p>${esc(String(S.title).split(':').pop().trim())} · ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</p>

                <div class="o2-grid-3">
                    <div class="o2-card o2-stat"><small>Süre</small><strong style="font-size:21px">${O2.fmtClock(sum.durationSec)}</strong></div>
                    <div class="o2-card o2-stat" style="margin-top:0"><small>Hacim</small><strong style="font-size:21px">${O2.fmtNum(sum.volume)}<small> kg</small></strong></div>
                    <div class="o2-card o2-stat" style="margin-top:0"><small>Set</small><strong style="font-size:21px">${sum.setCount}</strong></div>
                </div>

                ${S.prs.length ? `
                <div class="o2-section-head"><h3>Kırılan rekorlar</h3><span class="o2-chip gold">${S.prs.length} PR</span></div>
                <div class="o2-card" style="padding:4px 18px">${S.prs.map(p => `
                    <div class="o2-pr"><div class="o2-pr-medal">${I('trophy')}</div><div class="o2-row-main"><h5>${esc(p.ex)}</h5><p>${O2.fmtNum(p.w, 1)} kg × ${p.r}</p></div><div class="o2-row-end"><strong>${O2.fmtNum(p.e1rm, 1)}</strong><span class="up">+${O2.fmtNum(p.e1rm - p.prev, 1)} kg</span></div></div>`).join('')}</div>` : ''}

                <div class="o2-section-head"><h3>Çalışan kaslar</h3></div>
                <div class="o2-card"><div class="o2-bodymap">
                    <figure style="margin:0">${O2.figure('front', fill)}<figcaption>ÖN</figcaption></figure>
                    <figure style="margin:0">${O2.figure('back', fill)}<figcaption>ARKA</figcaption></figure>
                </div></div>

                <div class="o2-section-head"><h3>Seans nasıldı?</h3></div>
                <div class="o2-rating">${RATINGS.map(([e, l], i) => `<button class="${S.rating === i + 1 ? 'active' : ''}" onclick="O2.rateSession(${i + 1})">${e}<small>${l}</small></button>`).join('')}</div>

                <div class="o2-field"><label>Not (isteğe bağlı)</label><input class="o2-input" id="o2-session-note" placeholder="Ör. omuzda hafif gerginlik vardı" value="${esc(S.note || '')}" onchange="O2.noteSession(this.value)"></div>

                <button class="o2-btn o2-btn-gold o2-btn-block" style="margin-top:22px" onclick="O2.saveSession()">${I('check')}Kaydet</button>
                <div style="display:flex;gap:8px;margin-top:10px">
                    <button class="o2-btn o2-btn-ghost" style="flex:1" onclick="O2.shareSession()">Paylaş</button>
                    <button class="o2-btn o2-btn-ghost" style="flex:1" onclick="O2.backToWorkout()">Antrenmana dön</button>
                </div>
            </div>`;
    }

    O2.rateSession = (n) => { S.rating = n; persist(); O2.haptic(10); renderSummary(); };
    O2.noteSession = (v) => { S.note = v; persist(); };
    O2.backToWorkout = () => { summaryMode = false; S.endedAt = null; persist(); renderPlayer(); };

    O2.shareSession = async () => {
        const sum = summarize();
        const text = `🏛️ Project Olympus\n${String(S.title).split(':').pop().trim()} tamamlandı\n⏱️ ${O2.fmtClock(sum.durationSec)} · 🏋️ ${O2.fmtNum(sum.volume)} kg · ${sum.setCount} set${S.prs.length ? `\n🏆 ${S.prs.length} kişisel rekor` : ''}`;
        try {
            if (navigator.share) await navigator.share({ text });
            else { await navigator.clipboard.writeText(text); O2.toast('Özet panoya kopyalandı'); }
        } catch (e) { }
    };

    O2.saveSession = () => {
        const note = $('o2-session-note');
        if (note) S.note = note.value;
        const sum = summarize();
        const now = new Date(S.endedAt || Date.now());
        const record = {
            id: S.id, title: S.title, programId: S.programId,
            dayKey: O2.dayKey(now), startedAt: S.startedAt, endedAt: now.getTime(),
            durationSec: sum.durationSec, volume: sum.volume, setCount: sum.setCount, kcal: sum.kcal,
            muscles: sum.muscles, rating: S.rating, note: S.note || '',
            prs: S.prs.map(({ setIndex, ...p }) => p),
            exercises: sum.exercises
        };
        O2.saveSessions([...O2.sessions(), record]);
        writeLegacy(record, now);
        O2.cloudSave();

        localStorage.removeItem('oly2_active_session');
        S = null;
        summaryMode = false;
        cleanup();
        $('o2-player').classList.add('hidden');
        O2.refreshLivePill();
        O2.ui.tab = 'today';
        O2.go('today', true);
        O2.toast(`Seans kaydedildi · +${150 + record.prs.length * 25} Olympus puanı`, 'trophy');
    };

    // Klasik ekran, Hub widget'ı, rozetler ve arena bu anahtarları okuyor
    function writeLegacy(rec, now) {
        const past = LS.get('olympus_past_workouts', []) || [];
        past.push({ id: rec.id, date: O2.trDate(now), time: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }), title: rec.title, duration: O2.fmtClock(rec.durationSec) });
        LS.set('olympus_past_workouts', past);

        const hist = LS.get('olympus_ex_history', {}) || {};
        rec.exercises.forEach(e => {
            const top = e.sets.reduce((a, s) => (s.w > (a ? a.w : -1) ? s : a), null);
            if (!top || !top.w) return;
            const old = hist[e.name];
            if (!old || top.w >= parseFloat(old.weight)) hist[e.name] = { weight: String(top.w), reps: String(top.r), date: O2.trDate(now) };
        });
        LS.set('olympus_ex_history', hist);

        const coarse = { chest: ['chest'], biceps: ['arms-l', 'arms-r'], triceps: ['arms-l', 'arms-r'], shoulders: ['arms-l', 'arms-r'], core: ['core'], quads: ['legs-l', 'legs-r'], hamstrings: ['legs-l', 'legs-r'], glutes: ['legs-l', 'legs-r'], calves: ['legs-l', 'legs-r'] };
        const v2 = LS.get('olympus_worked_muscles_v2', {}) || {};
        const v1 = LS.get('olympus_worked_muscles', []) || [];
        rec.muscles.forEach(m => (coarse[m] || []).forEach(k => { v2[k] = rec.endedAt; if (!v1.includes(k)) v1.push(k); }));
        LS.set('olympus_worked_muscles_v2', v2);
        LS.set('olympus_worked_muscles', v1);

        if (typeof window.addOlympusPoints === 'function') window.addOlympusPoints(150 + rec.prs.length * 25, 'İdman Tamamlandı');
        if (typeof toggleAct === 'function') { try { toggleAct(3, true); } catch (e) { } }
    }

    function discard() {
        localStorage.removeItem('oly2_active_session');
        S = null;
        summaryMode = false;
        cleanup();
        $('o2-player').classList.add('hidden');
        O2.refreshLivePill();
        O2.render();
        O2.toast('Seans silindi', 'close');
    }

    function cleanup() {
        stopTicker();
        releaseWakeLock();
        if (typeof stopWorkoutBackgroundEngine === 'function') stopWorkoutBackgroundEngine();
    }

    // ==========================================
    // 🔆 EKRANI AÇIK TUT
    // ==========================================
    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator && !wakeLock) {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => { wakeLock = null; });
            }
        } catch (e) { wakeLock = null; }
    }
    function releaseWakeLock() {
        if (wakeLock) { wakeLock.release().catch(() => { }); wakeLock = null; }
    }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && S && O2.isPlayerOpen()) {
            requestWakeLock();
            tick();
        }
    });
})();
