/* =========================================================================
   Qarz Daftar — AVTO BACKUP TIZIMI
   - Foydalanuvchi papkani BIR MARTA tanlaydi (handle IndexedDB'da saqlanadi)
   - Har bir o'zgarishdan KEYIN debounce bilan avtomatik backup
   - Doim BITTA fayl: GameClub_Backup.db (yangilanadi, yangi fayl yaratilmaydi)
   - Atomik yozish: .tmp → tekshirish → asosiy faylga almashtirish
   - Xatolik dasturni to'xtatmaydi, faqat ogohlantiradi
   ========================================================================= */
(function () {
  'use strict';
  const GC = window.GC;
  const FILE_MAIN = 'GameClub_Backup.db';
  const FILE_TMP = 'GameClub_Backup.tmp';
  const FILE_SAFETY = 'GameClub_Safety_Backup.db';
  const IDB_NAME = 'qarz_daftar_fs';
  const IDB_STORE = 'handles';

  const status = {
    supported: false,
    mode: 'none',        // 'native' (Electron) | 'fs' (File System Access) | 'none'
    folderName: '',
    folderPath: '',
    connected: false,
    lastAt: null,
    lastSize: null,
    lastStatus: 'idle',  // ok | err | idle | pending
    lastError: '',
    pending: false,
    busy: false
  };

  let dirHandle = null;
  let timer = null;
  let queued = false;

  /* ---------------- IndexedDB (handle saqlash) ---------------- */
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(IDB_NAME, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(IDB_STORE); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbSet(key, val) {
    try {
      const db = await idb();
      await new Promise((res, rej) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(val, key);
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
    } catch (e) { console.warn('idbSet', e); }
  }
  async function idbGet(key) {
    try {
      const db = await idb();
      return await new Promise((res, rej) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const rq = tx.objectStore(IDB_STORE).get(key);
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      });
    } catch (e) { return null; }
  }
  async function idbDel(key) {
    try {
      const db = await idb();
      await new Promise((res) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key); tx.oncomplete = res; tx.onerror = res;
      });
    } catch (e) {}
  }

  /* ---------------- Log ---------------- */
  function log(type, ok, size, message) {
    const S = GC.state;
    S.backup_logs.push({
      id: GC.uid('bkp'), ts: Date.now(), type, status: ok ? 'ok' : 'err',
      size: size || 0, message: message || ''
    });
    // loglar juda ko'payib ketmasligi uchun oxirgi 300 tasi saqlanadi
    if (S.backup_logs.length > 300) S.backup_logs.splice(0, S.backup_logs.length - 300);
    GC.persist();
  }

  /* ---------------- Adapterlar ---------------- */
  const native = {
    get available() { return !!(window.gcNative && window.gcNative.backup); },
    async pickFolder() {
      const p = await window.gcNative.backup.pickFolder();
      if (!p) return null;
      status.folderPath = p; status.folderName = p;
      GC.state.settings.backupPath = p; GC.persist();
      return p;
    },
    async write(text) { return window.gcNative.backup.write(GC.state.settings.backupPath, text); },
    async readMain() { return window.gcNative.backup.readMain(GC.state.settings.backupPath); },
    async safety(text) { return window.gcNative.backup.safety(GC.state.settings.backupPath, text); },
    async check() { return window.gcNative.backup.check(GC.state.settings.backupPath); }
  };

  const fsa = {
    get available() { return typeof window.showDirectoryPicker === 'function'; },
    async pickFolder() {
      const h = await window.showDirectoryPicker({ id: 'gc-backup', mode: 'readwrite', startIn: 'documents' });
      const ok = await ensurePermission(h, true);
      if (!ok) throw new Error('Papkaga yozish uchun ruxsat berilmadi');
      dirHandle = h;
      await idbSet('dir', h);
      status.folderName = h.name; status.folderPath = h.name;
      GC.state.settings.backupPath = h.name; GC.persist();
      return h.name;
    },
    async write(text) {
      if (!dirHandle) throw new Error('Backup papkasi tanlanmagan');
      if (!(await ensurePermission(dirHandle, true))) throw new Error('Papkaga ruxsat yo‘q (qayta tanlang)');
      // 1) vaqtinchalik faylga yozamiz
      const tmp = await dirHandle.getFileHandle(FILE_TMP, { create: true });
      const w = await tmp.createWritable();
      await w.write(text); await w.close();
      // 2) tekshiramiz
      const tf = await tmp.getFile();
      const back = await tf.text();
      if (back.length !== text.length) throw new Error('Vaqtinchalik backup to‘liq yozilmadi');
      JSON.parse(back); // buzilmaganini tasdiqlash
      // 3) asosiy faylga ko'chiramiz
      const main = await dirHandle.getFileHandle(FILE_MAIN, { create: true });
      const w2 = await main.createWritable();
      await w2.write(back); await w2.close();
      // 4) tekshirib, tmp ni o'chiramiz
      const mf = await main.getFile();
      const mtext = await mf.text();
      JSON.parse(mtext);
      try { await dirHandle.removeEntry(FILE_TMP); } catch (e) {}
      return { size: mf.size, path: dirHandle.name + '/' + FILE_MAIN };
    },
    async readMain() {
      if (!dirHandle) throw new Error('Backup papkasi tanlanmagan');
      const h = await dirHandle.getFileHandle(FILE_MAIN);
      const f = await h.getFile();
      return { text: await f.text(), size: f.size, modified: f.lastModified };
    },
    async safety(text) {
      if (!dirHandle) return null;
      const h = await dirHandle.getFileHandle(FILE_SAFETY, { create: true });
      const w = await h.createWritable();
      await w.write(text); await w.close();
      const f = await h.getFile();
      return { size: f.size };
    },
    async check() {
      const r = await fsa.readMain();
      const obj = JSON.parse(r.text);
      const v = GC.validateBackup(obj);
      return Object.assign({ size: r.size, modified: r.modified }, v);
    }
  };

  async function ensurePermission(handle, request) {
    if (!handle || !handle.queryPermission) return true;
    const opts = { mode: 'readwrite' };
    let st = await handle.queryPermission(opts);
    if (st === 'granted') return true;
    if (request && handle.requestPermission) st = await handle.requestPermission(opts);
    return st === 'granted';
  }

  function adapter() {
    if (native.available) return native;
    if (fsa.available) return fsa;
    return null;
  }

  /* ---------------- Asosiy operatsiyalar ---------------- */
  async function init() {
    status.supported = !!adapter();
    status.mode = native.available ? 'native' : (fsa.available ? 'fs' : 'none');
    if (fsa.available && !native.available) {
      const h = await idbGet('dir');
      if (h) {
        dirHandle = h;
        status.folderName = h.name; status.folderPath = h.name;
        const ok = await ensurePermission(h, false);
        status.connected = ok;
        if (!ok) { status.lastStatus = 'warn'; status.lastError = 'Papkaga ruxsat tiklanmadi — "Ruxsatni tiklash" tugmasini bosing'; }
      }
    } else if (native.available && GC.state.settings.backupPath) {
      status.folderPath = GC.state.settings.backupPath;
      status.folderName = GC.state.settings.backupPath;
      status.connected = true;
    }
    const last = GC.state.backup_logs.slice(-1)[0];
    if (last) { status.lastAt = last.ts; status.lastSize = last.size; status.lastStatus = last.status; }
    GC.emit && GC.emit('backup');
  }

  async function chooseFolder() {
    const a = adapter();
    if (!a) {
      GC.toast('Bu brauzer papka tanlashni qo‘llab-quvvatlamaydi. Chrome/Edge yoki Windows dasturidan foydalaning.', 'err', 6000);
      return false;
    }
    try {
      const name = await a.pickFolder();
      if (!name) return false;
      status.connected = true; status.lastError = '';
      GC.toast('Backup papkasi tanlandi: ' + name, 'ok');
      await run('manual');
      return true;
    } catch (e) {
      if (e && e.name === 'AbortError') return false;
      status.lastError = e.message || String(e);
      GC.toast('Papka tanlanmadi: ' + status.lastError, 'err');
      return false;
    }
  }

  async function restorePermission() {
    if (!dirHandle) return false;
    const ok = await ensurePermission(dirHandle, true);
    status.connected = ok;
    if (ok) { status.lastError = ''; GC.toast('Ruxsat tiklandi', 'ok'); await run('manual'); }
    else GC.toast('Ruxsat berilmadi', 'err');
    GC.emit && GC.emit('backup');
    return ok;
  }

  function friendlyError(e) {
    const m = (e && (e.message || e.name) || '').toLowerCase();
    if (m.includes('notfound') || m.includes('not found')) return 'Backup papkasi yoki fayl topilmadi (papka o‘chirilgan yoki disk ulanmagan)';
    if (m.includes('notallowed') || m.includes('permission') || m.includes('ruxsat')) return 'Papkaga ruxsat berilmagan';
    if (m.includes('quota') || m.includes('space') || m.includes('enospc')) return 'Diskda joy yetarli emas';
    if (m.includes('busy') || m.includes('lock') || m.includes('eperm') || m.includes('ebusy')) return 'Backup fayli boshqa dastur tomonidan bloklangan';
    if (m.includes('nodev') || m.includes('enoent')) return 'Disk mavjud emas';
    return (e && e.message) || 'Noma’lum xato';
  }

  async function run(type) {
    const a = adapter();
    if (!a) return false;
    if (!status.connected && !(native.available && GC.state.settings.backupPath)) {
      status.lastStatus = 'idle';
      return false;
    }
    if (status.busy) { queued = true; return false; }
    status.busy = true; status.pending = false;
    try {
      const text = GC.exportJSON();
      const res = await a.write(text);
      status.lastAt = Date.now();
      status.lastSize = res && res.size ? res.size : text.length;
      status.lastStatus = 'ok'; status.lastError = '';
      GC.state.settings.lastBackupAt = status.lastAt;
      log(type === 'manual' ? 'manual' : 'auto', true, status.lastSize, '');
      if (type === 'manual') GC.toast('Backup muvaffaqiyatli yaratildi (' + GC.fmtSize(status.lastSize) + ')', 'ok');
      return true;
    } catch (e) {
      status.lastStatus = 'err';
      status.lastError = friendlyError(e);
      log(type === 'manual' ? 'manual' : 'auto', false, 0, status.lastError);
      GC.toast('🔴 Backup bajarilmadi: ' + status.lastError, 'err', 5000);
      return false;
    } finally {
      status.busy = false;
      GC.emit && GC.emit('backup');
      if (queued) { queued = false; schedule(); }
    }
  }

  /* Debounce: kassir ketma-ket kiritsa ham dastur sekinlashmaydi */
  function schedule() {
    if (!GC.state.settings.autoBackup) return;
    if (!adapter() || !status.connected) return;
    status.pending = true;
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; run('auto'); }, GC.state.settings.backupDebounceMs || 1500);
  }

  async function flush() { // dastur yopilishidan oldin majburiy backup
    if (timer) { clearTimeout(timer); timer = null; }
    if (status.pending || queued) { queued = false; return run('auto'); }
    return true;
  }

  async function check() {
    const a = adapter();
    if (!a || !status.connected) { GC.toast('Avval backup papkasini tanlang', 'warn'); return null; }
    try {
      const r = await a.check();
      if (r.ok) {
        GC.toast('✅ Backup fayli to‘g‘ri: ' + r.stats.customers + ' mijoz, ' + r.stats.debts + ' qarz, ' +
                 r.stats.payments + ' to‘lov · ' + GC.fmtSize(r.size), 'ok', 6000);
      } else {
        GC.toast('🔴 Backup fayli yaroqsiz: ' + r.reason, 'err', 6000);
      }
      return r;
    } catch (e) {
      const msg = friendlyError(e);
      GC.toast('🔴 Backupni tekshirib bo‘lmadi: ' + msg, 'err', 6000);
      return { ok: false, reason: msg };
    }
  }

  async function readMainBackup() {
    const a = adapter();
    if (!a || !status.connected) return null;
    try { return await a.readMain(); } catch (e) { return null; }
  }

  async function safetyBackup() {
    const a = adapter();
    const text = GC.exportJSON();
    if (a && status.connected) {
      try {
        const r = await a.safety(text);
        log('safety', true, (r && r.size) || text.length, 'Tiklashdan oldingi zaxira');
        return true;
      } catch (e) {
        log('safety', false, 0, friendlyError(e));
      }
    }
    // papka yo'q bo'lsa — brauzer orqali yuklab olamiz
    GC.download('GameClub_Safety_Backup_' + GC.todayISO() + '.db', text, 'application/json');
    return true;
  }

  /* Dastur yopilishida */
  window.addEventListener('beforeunload', (e) => {
    if (status.pending && GC.state.settings.autoBackup && status.connected) {
      flush();
      e.preventDefault();
      e.returnValue = 'Backup hali yakunlanmadi. Chiqishni xohlaysizmi?';
      return e.returnValue;
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

  GC.Backup = {
    status, init, chooseFolder, restorePermission, run, schedule, flush, check,
    readMainBackup, safetyBackup, FILE_MAIN, FILE_SAFETY,
    forget: async () => { await idbDel('dir'); dirHandle = null; status.connected = false; status.folderName = ''; GC.emit && GC.emit('backup'); }
  };
})();
