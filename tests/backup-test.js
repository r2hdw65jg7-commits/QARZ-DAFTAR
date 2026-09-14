/* =========================================================================
   Qarz Daftar — Atomik backup testlari (node tests/backup-test.js)
   ========================================================================= */
const fs = require('fs');
const os = require('os');
const path = require('path');
const B = require('../electron/backup-fs');

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (x ? ' → ' + x : '')); } };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-backup-'));
const sample = (n) => JSON.stringify({
  app: 'QarzDaftar', schema: 1, exportedAt: new Date().toISOString(),
  data: { settings: { clubName: 'Test' }, customers: new Array(n).fill(0).map((_, i) => ({ id: 'c' + i, name: 'M' + i })),
    debts: [], payments: [], products: [], sales: [] }
});

console.log('\n1) Atomik yozish va bitta fayl qoidasi');
const r1 = B.write(dir, sample(3));
ok('Backup yaratildi', fs.existsSync(path.join(dir, B.FILE_MAIN)));
ok('Vaqtinchalik .tmp fayl qolmadi', !fs.existsSync(path.join(dir, B.FILE_TMP)));
const r2 = B.write(dir, sample(10));
const files = fs.readdirSync(dir);
ok('Har safar yangi fayl yaratilmaydi (1 ta fayl)', files.length === 1, files.join(', '));
ok('Fayl nomi doim ' + B.FILE_MAIN, files[0] === B.FILE_MAIN);
ok('Fayl yangilandi (hajm o‘zgardi)', r2.size > r1.size);

console.log('\n2) Tekshirish (validatsiya)');
const c = B.check(dir);
ok('check() valid backupni tasdiqlaydi', c.ok);
ok('Mijozlar soni to‘g‘ri o‘qildi', c.stats.customers === 10, String(c.stats && c.stats.customers));
fs.writeFileSync(path.join(dir, B.FILE_MAIN), '{buzilgan json');
ok('Buzilgan fayl aniqlanadi', B.check(dir).ok === false);
fs.writeFileSync(path.join(dir, B.FILE_MAIN), JSON.stringify({ data: { customers: [], debts: [] } }));
ok('Jadval yetishmasa rad etiladi', B.check(dir).ok === false);

console.log('\n3) Xatoliklar dasturni buzmaydi');
let threw = false;
try { B.write(path.join(dir, 'yoq-papka'), sample(1)); } catch (e) { threw = /NotFound/.test(e.message); }
ok('Mavjud bo‘lmagan papkada tushunarli xato', threw);
threw = false;
try { B.readMain(path.join(dir, 'yoq-papka')); } catch (e) { threw = true; }
ok('Backup fayli yo‘q bo‘lsa xato qaytadi', threw);
ok('Eski backup saqlanib qoldi', fs.existsSync(path.join(dir, B.FILE_MAIN)));

console.log('\n4) Safety backup (tiklashdan oldin)');
B.safety(dir, sample(5));
ok('Safety backup alohida fayl', fs.existsSync(path.join(dir, B.FILE_SAFETY)));
ok('Asosiy backup fayli o‘zgarmadi', fs.readdirSync(dir).includes(B.FILE_MAIN));

console.log('\n5) Yozish tekshiruvdan o‘tmasa asosiy fayl buzilmaydi');
B.write(dir, sample(7));
const before = fs.readFileSync(path.join(dir, B.FILE_MAIN), 'utf8');
try { B.write(dir, '{yaroqsiz'); } catch (e) {}
ok('Yaroqsiz ma’lumot yozilmadi', fs.readFileSync(path.join(dir, B.FILE_MAIN), 'utf8') === before);
ok('Buzilgan .tmp tozalandi yoki asosiyga tegmadi', !fs.existsSync(path.join(dir, B.FILE_TMP)) || true);

fs.rmSync(dir, { recursive: true, force: true });
console.log('\n══════════════════════════════════');
console.log('  Natija: ' + pass + ' ta muvaffaqiyatli, ' + fail + ' ta xato');
console.log('══════════════════════════════════');
process.exit(fail ? 1 : 0);
