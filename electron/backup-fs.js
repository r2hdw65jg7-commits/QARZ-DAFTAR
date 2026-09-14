/* =========================================================================
   Qarz Daftar — fayl tizimidagi atomik backup (Node/Electron uchun)
   Bu modul Electron'ga bog'liq emas — shuning uchun testlarda ham ishlatiladi.
   ========================================================================= */
const fs = require('fs');
const path = require('path');

const FILE_MAIN = 'GameClub_Backup.db';
const FILE_TMP = 'GameClub_Backup.tmp';
const FILE_SAFETY = 'GameClub_Safety_Backup.db';

function ensureDir(dir) {
  if (!dir) throw new Error('Backup papkasi tanlanmagan');
  if (!fs.existsSync(dir)) throw new Error('NotFound: backup papkasi mavjud emas');
  fs.accessSync(dir, fs.constants.W_OK);
}

/* Atomik yozish: .tmp → tekshirish → rename (bir xil diskda atomik amal) */
function write(dir, text) {
  ensureDir(dir);
  const tmp = path.join(dir, FILE_TMP);
  const main = path.join(dir, FILE_MAIN);
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(fd, text, 'utf8');
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  const back = fs.readFileSync(tmp, 'utf8');
  if (back.length !== text.length) { fs.unlinkSync(tmp); throw new Error('Backup to‘liq yozilmadi'); }
  JSON.parse(back); // buzilmaganini tasdiqlash
  fs.renameSync(tmp, main);
  return { size: fs.statSync(main).size, path: main };
}

function readMain(dir) {
  const main = path.join(dir || '', FILE_MAIN);
  if (!fs.existsSync(main)) throw new Error('NotFound: backup fayli topilmadi');
  const st = fs.statSync(main);
  return { text: fs.readFileSync(main, 'utf8'), size: st.size, modified: st.mtimeMs };
}

function safety(dir, text) {
  ensureDir(dir);
  const p = path.join(dir, FILE_SAFETY);
  fs.writeFileSync(p, text, 'utf8');
  return { size: fs.statSync(p).size };
}

function check(dir) {
  const main = path.join(dir || '', FILE_MAIN);
  if (!fs.existsSync(main)) return { ok: false, reason: 'Backup fayli topilmadi', size: 0 };
  const st = fs.statSync(main);
  let obj;
  try { obj = JSON.parse(fs.readFileSync(main, 'utf8')); }
  catch (e) { return { ok: false, reason: 'Fayl buzilgan (JSON o‘qilmadi)', size: st.size }; }
  const d = obj.data || obj;
  const need = ['customers', 'debts', 'payments', 'products', 'settings'];
  for (const k of need) if (!(k in d)) return { ok: false, reason: '"' + k + '" jadvali topilmadi', size: st.size };
  return {
    ok: true, size: st.size, modified: st.mtimeMs,
    stats: {
      customers: d.customers.length, debts: d.debts.length, payments: d.payments.length,
      products: (d.products || []).length, sales: (d.sales || []).length, exportedAt: obj.exportedAt || null
    }
  };
}

module.exports = { write, readMain, safety, check, ensureDir, FILE_MAIN, FILE_TMP, FILE_SAFETY };
