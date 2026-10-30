/**
 * Olympus Training — E-posta hatırlatıcı servisi (Google Apps Script)
 *
 * Ne yapar?
 *  - Uygulama, hatırlatıcı ayarlarını ve önümüzdeki 7 günün antrenman planını buraya POST eder.
 *  - Her 15 dakikada bir çalışan tetikleyici, saati gelen kullanıcılara e-posta gönderir:
 *      · Antrenman hatırlatıcısı (dinlenme günleri ve o gün antrenman yapıldıysa gönderilmez)
 *      · Akademi çalışma hatırlatıcısı + sınava 30 / 7 / 1 gün kala uyarı
 *  - Mailler bu script'i yayınlayan hesaptan çıkar (emirhan@culbase.com ile yayınla).
 *
 * Güvenlik: İstekteki Firebase ID token Google'a doğrulatılır; mail yalnızca o hesabın kendi
 * e-posta adresine gider. Yani adres herkese açık olsa bile kimse başkasına mail yağdıramaz.
 *
 * Kurulum (5 dakika):
 *  1. emirhan@culbase.com ile https://script.google.com → Yeni proje → bu dosyanın içeriğini yapıştır.
 *  2. Üstte fonksiyon olarak "kurulum" seç → Çalıştır → izinleri onayla (Gmail gönderme + harici istek).
 *  3. Dağıt → Yeni dağıtım → Tür: Web uygulaması
 *       Yürütme kimliği: Ben (emirhan@culbase.com) · Erişim: Herkes
 *  4. Çıkan ".../exec" adresini Olympus Training → Ayarlar → Hatırlatıcılar → "E-posta servisi adresi"ne yapıştır.
 */

const FIREBASE_API_KEY = 'AIzaSyD8n3FxnxAjbEaq4TJRXoHBf_qwxpc0zy4'; // Web API anahtarı (zaten istemcide herkese açık)
const TZ = 'Europe/Istanbul';
const APP_URL = ''; // Boş bırakılırsa uygulamanın gönderdiği kendi adresi kullanılır
const SENDER_NAME = 'Olympus Training';

// Tek seferlik: 15 dakikalık tetikleyiciyi kurar
function kurulum() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'tick') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(15).create();
  Logger.log('Tetikleyici kuruldu. Şimdi Web uygulaması olarak dağıt.');
}

function doGet() {
  return json({ ok: true, service: 'olympus-reminders', users: Object.keys(store().getProperties()).length });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const user = verify(body.idToken);
    if (!user) return json({ ok: false, error: 'auth' });
    const key = 'u_' + user.uid;
    const prev = JSON.parse(store().getProperty(key) || '{}');
    const rec = {
      email: user.email,
      name: String(body.name || '').slice(0, 40),
      enabled: !!body.enabled,
      workout: { on: !!(body.workout && body.workout.on), time: safeTime(body.workout && body.workout.time, '18:00') },
      academy: {
        on: !!(body.academy && body.academy.on),
        time: safeTime(body.academy && body.academy.time, '20:30'),
        branch: String((body.academy && body.academy.branch) || '').slice(0, 60),
        dates: ((body.academy && body.academy.dates) || []).slice(0, 3).map(d => ({ label: String(d.label).slice(0, 30), date: String(d.date).slice(0, 10) }))
      },
      plans: body.plans || {},
      lastWorkoutDay: String(body.lastWorkoutDay || ''),
      weekSessions: +body.weekSessions || 0,
      weeklyTarget: +body.weeklyTarget || 5,
      appUrl: /^https:\/\//.test(String(body.appUrl || '')) ? String(body.appUrl).slice(0, 200) : '',
      sent: prev.sent || {}
    };
    if (!rec.enabled) { store().deleteProperty(key); return json({ ok: true, enabled: false }); }
    store().setProperty(key, JSON.stringify(rec));
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Her 15 dakikada bir: saati gelen hatırlatıcıları gönder
function tick() {
  const now = new Date();
  const today = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  const nowMin = toMin(Utilities.formatDate(now, TZ, 'HH:mm'));
  const props = store().getProperties();
  Object.keys(props).forEach(key => {
    if (key.indexOf('u_') !== 0) return;
    const u = JSON.parse(props[key]);
    let changed = false;
    const due = (time) => nowMin >= toMin(time) && nowMin < toMin(time) + 60;

    if (u.workout.on && due(u.workout.time) && u.sent.workout !== today) {
      const plan = u.plans[today];
      if (plan && u.lastWorkoutDay !== today) sendWorkout(u, plan);
      u.sent.workout = today; changed = true;
    }
    if (u.academy.on && due(u.academy.time) && u.sent.academy !== today) {
      sendAcademy(u, today);
      u.sent.academy = today; changed = true;
    }
    if (changed) store().setProperty(key, JSON.stringify(u));
  });
}

function sendWorkout(u, plan) {
  const left = Math.max(0, u.weeklyTarget - u.weekSessions);
  mail(u, `💪 Antrenman vakti: ${plan}`, {
    eyebrow: 'Antrenman hatırlatıcısı',
    headline: `Bugün: ${plan}`,
    message: `Selam ${u.name || 'şampiyon'}, bugünkü seansın seni bekliyor. ${left > 0 ? `Haftalık hedefine ${left} seans kaldı.` : 'Haftalık hedefini tamamladın, seriyi bozma!'}`,
    cta: 'Antrenmanı başlat', link: appLink(u, 'start')
  });
}

function sendAcademy(u, today) {
  const t0 = new Date(today + 'T00:00:00');
  const items = u.academy.dates
    .map(d => ({ label: d.label, left: Math.round((new Date(d.date + 'T00:00:00') - t0) / 864e5) }))
    .filter(d => d.left >= 0)
    .sort((a, b) => a.left - b.left);
  const milestone = items.find(d => d.left === 30 || d.left === 7 || d.left === 1 || d.left === 0);
  const next = items[0];
  const subject = milestone
    ? (milestone.left === 0 ? `🛡️ ${milestone.label} bugün — başarılar!` : `🛡️ ${milestone.label}: ${milestone.left} gün kaldı`)
    : `🛡️ ${u.academy.branch || 'Akademi'} · günlük hazırlık`;
  mail(u, subject, {
    eyebrow: u.academy.branch || 'Olympus Akademi',
    headline: next ? (next.left === 0 ? `${next.label} bugün` : `${next.label}: ${next.left} gün`) : 'Günlük hazırlık zamanı',
    message: 'Bugünün planı: 10 mülakat kartı, 1 prova sorusu ve fiziki test çalışması. Küçük ama her gün.',
    rows: items.map(d => [d.label, d.left === 0 ? 'Bugün' : `${d.left} gün`]),
    cta: 'Akademiyi aç', link: appLink(u, 'academy')
  });
}

function mail(u, subject, o) {
  const rows = (o.rows || []).map(r => `<tr><td style="padding:10px 0;color:#9a9aa3;font-size:13px;border-bottom:1px solid #222">${esc(r[0])}</td><td style="padding:10px 0;text-align:right;color:#f6dea0;font-weight:700;font-size:13px;border-bottom:1px solid #222">${esc(r[1])}</td></tr>`).join('');
  const html = `
  <div style="background:#07070a;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#111115;border:1px solid #2a2a30;border-radius:24px;padding:28px">
      <div style="font-size:11px;letter-spacing:3px;color:#e6c374;font-weight:800;text-transform:uppercase">${esc(o.eyebrow)}</div>
      <h1 style="margin:10px 0 0;color:#fff;font-size:24px;line-height:1.25">${esc(o.headline)}</h1>
      <p style="margin:14px 0 0;color:#c9c9cf;font-size:15px;line-height:1.6">${esc(o.message)}</p>
      ${rows ? `<table style="width:100%;margin-top:16px;border-collapse:collapse">${rows}</table>` : ''}
      ${o.link ? `<a href="${o.link}" style="display:inline-block;margin-top:22px;padding:14px 22px;border-radius:14px;background:linear-gradient(135deg,#f6dea0,#e6c374,#b8913f);color:#1a1407;font-weight:800;text-decoration:none">${esc(o.cta)}</a>` : ''}
      <p style="margin:24px 0 0;color:#6b6b73;font-size:11px">Olympus Training · Hatırlatıcıları uygulamada Ayarlar → Hatırlatıcılar'dan kapatabilirsin.</p>
    </div>
  </div>`;
  GmailApp.sendEmail(u.email, subject, `${o.headline}\n\n${o.message}\n\n${o.link}`, { htmlBody: html, name: SENDER_NAME });
}

// Firebase ID token → { uid, email } (Google Identity Toolkit ile doğrulanır)
function verify(idToken) {
  if (!idToken) return null;
  const res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken }), muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return null;
  const u = (JSON.parse(res.getContentText()).users || [])[0];
  return u && u.email ? { uid: u.localId, email: u.email } : null;
}

const appLink = (u, action) => (APP_URL || u.appUrl) ? (APP_URL || u.appUrl) + '?action=' + action : '';
const store = () => PropertiesService.getScriptProperties();
const json = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
const toMin = (t) => { const p = String(t).split(':'); return (+p[0]) * 60 + (+p[1] || 0); };
const safeTime = (t, d) => /^\d{2}:\d{2}$/.test(String(t)) ? t : d;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
