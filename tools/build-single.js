/* =========================================================================
   Bitta faylli (standalone) HTML yig'uvchi:
   CSS va JS fayllarni index.html ichiga joylab, qarz-daftar.html yaratadi.
   Ishlatish: node tools/build-single.js
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');

// CSS
html = html.replace('<link rel="stylesheet" href="assets/css/styles.css">',
  '<style>\n' + read('assets/css/styles.css') + '\n</style>');

// Ikonka (data URI)
const svg = read('assets/icons/icon.svg');
const svgData = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
html = html.replace('<link rel="icon" href="assets/icons/icon.svg" type="image/svg+xml">',
  '<link rel="icon" href="' + svgData + '" type="image/svg+xml">');
html = html.replace('<link rel="manifest" href="manifest.webmanifest">', '');
html = html.replace('<link rel="apple-touch-icon" href="assets/icons/icon-192.png">',
  '<link rel="apple-touch-icon" href="' + svgData + '">');

// JS
const scripts = ['core', 'backup', 'components', 'views-debt', 'views-shop', 'views-report', 'app'];
scripts.forEach(name => {
  html = html.replace('<script src="assets/js/' + name + '.js"></script>',
    '<script>\n' + read('assets/js/' + name + '.js') + '\n</script>');
});

// Bitta faylda service worker bo'lmaydi
html = html.replace("navigator.serviceWorker.register('sw.js').catch(() => {});", '/* standalone: service worker yo‘q */');

const out = path.join(root, 'qarz-daftar.html');
fs.writeFileSync(out, html, 'utf8');
const kb = (fs.statSync(out).size / 1024).toFixed(1);
if (/<script src=|<link rel="stylesheet"/.test(html)) {
  console.error('❌ Tashqi fayllar qoldi — yig‘ish to‘liq emas');
  process.exit(1);
}
console.log('✅ qarz-daftar.html yaratildi (' + kb + ' KB) — bitta faylda to‘liq dastur');
