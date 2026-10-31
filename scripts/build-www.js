// Capacitor'ın Android'e paketlediği www/ klasörünü proje kökündeki güncel dosyalarla yeniden oluşturur.
// Kullanım: npm run build   (Android için: npm run android)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');

const FILES = [
    'index.html', 'olympus.html', 'style.css', 'sw.js', 'manifest.json',
    'icon.png', 'bank.png', 'bmw.png', 'bmw_g20.glb', 'megane.glb',
    'engine.mp3', 'music.mp3', 'acılıs.mp4', 'privacypolicy.html'
];
const DIRS = ['js', 'css', 'assets', 'culbase_system', 'games', 'memories'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const file of FILES) {
    const src = path.join(root, file);
    if (!fs.existsSync(src)) { console.warn(`⚠️  Atlandı (bulunamadı): ${file}`); continue; }
    fs.copyFileSync(src, path.join(out, file));
}
for (const dir of DIRS) {
    fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
}

console.log(`✅ www/ güncellendi (${FILES.length} dosya, ${DIRS.length} klasör).`);
