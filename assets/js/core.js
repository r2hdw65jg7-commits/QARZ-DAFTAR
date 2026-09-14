/* =========================================================================
   Qarz Daftar — CORE
   Ma'lumotlar bazasi, hisob-kitob mantig'i, formatlash, validatsiya.
   Barcha summalar butun son (integer) — UZS so'm. Floating point ishlatilmaydi.
   ========================================================================= */
(function () {
  'use strict';

  const GC = window.GC = window.GC || {};
  const DB_KEY = 'qarz_daftar_db_v1';
  const SCHEMA = 1;

  /* ------------------------- Formatlash ------------------------- */
  const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
  const WEEK = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];

  function groupNum(n) {
    const neg = n < 0;
    let s = String(Math.abs(Math.round(n)));
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (neg ? '-' : '') + s;
  }
  const money = (n) => groupNum(n || 0) + ' so‘m';
  const moneyShort = (n) => {
    n = n || 0;
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(1).replace('.0','') + ' mlrd';
    if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.0','') + ' mln';
    if (a >= 1e3) return groupNum(n);
    return groupNum(n);
  };
  function parseMoney(v) {
    if (typeof v === 'number') return Math.round(v);
    const s = String(v == null ? '' : v).replace(/[^\d-]/g, '');
    if (!s || s === '-') return NaN;
    return parseInt(s, 10);
  }
  const pad2 = (n) => (n < 10 ? '0' : '') + n;

  function todayISO() { return dateToISO(new Date()); }
  function dateToISO(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function isoToDate(iso) {
    if (!iso) return null;
    const p = String(iso).slice(0, 10).split('-');
    if (p.length !== 3) return null;
    const d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  }
  function fmtDate(iso) {
    const d = isoToDate(iso); if (!d) return '—';
    return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear();
  }
  function fmtDT(ts) {
    if (!ts) return '—';
    const d = new Date(ts); if (isNaN(d.getTime())) return '—';
    return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' +
           pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }
  function fmtTime(ts) {
    const d = new Date(ts); if (isNaN(d.getTime())) return '—';
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  function daysDiff(isoA, isoB) { // isoA - isoB (kunlarda)
    const a = isoToDate(isoA), b = isoToDate(isoB);
    if (!a || !b) return 0;
    return Math.round((a - b) / 86400000);
  }
  function addDays(iso, n) {
    const d = isoToDate(iso) || new Date();
    d.setDate(d.getDate() + n);
    return dateToISO(d);
  }
  function fmtSize(bytes) {
    if (!bytes && bytes !== 0) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function normPhone(p) { return String(p || '').replace(/[^\d+]/g, ''); }
  function fmtPhone(p) {
    const d = String(p || '').replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('998'))
      return '+998 ' + d.slice(3, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8, 10) + ' ' + d.slice(10);
    if (d.length === 9) return '+998 ' + d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5, 7) + ' ' + d.slice(7);
    return p || '—';
  }
  function validPhone(p) {
    const d = String(p || '').replace(/\D/g, '');
    return d.length >= 7 && d.length <= 15;
  }

  /* ------------------------- Boshlang'ich baza ------------------------- */
  function defaultState() {
    const t = todayISO();
    return {
      schema: SCHEMA,
      settings: {
        clubName: 'GAME CLUB',
        address: '',
        phone: '',
        cashier: 'Admin',
        cashiers: ['Admin'],
        theme: 'dark',
        autoBackup: true,
        backupDebounceMs: 1500,
        allowNegativeStock: false,
        defaultDueDays: 7,
        receiptFooter: 'Xaridingiz uchun rahmat!',
        createdAt: t
      },
      customers: [],
      debts: [],
      payments: [],
      categories: [
        { id: 'cat_drink', name: 'Ichimliklar' },
        { id: 'cat_chips', name: 'Chips' },
        { id: 'cat_sweet', name: 'Shirinliklar' },
        { id: 'cat_food', name: 'Fast Food' },
        { id: 'cat_acc', name: 'Aksessuarlar' },
        { id: 'cat_game', name: 'Gaming mahsulotlar' },
        { id: 'cat_other', name: 'Boshqa' }
      ],
      suppliers: [],
      products: [],
      stock_movements: [],
      purchases: [],
      purchase_items: [],
      sales: [],
      sale_items: [],
      inventory_adjustments: [],
      audit_logs: [],
      backup_logs: []
    };
  }

  const UNITS = ['dona', 'litr', 'kg', 'quti', 'pachka', 'metr', 'boshqa'];
  const PAY_METHODS = [
    { id: 'naqd', name: 'Naqd' }, { id: 'karta', name: 'Karta' }, { id: 'click', name: 'Click' },
    { id: 'payme', name: 'Payme' }, { id: 'uzum', name: 'Uzum' }, { id: 'boshqa', name: 'Boshqa' }
  ];
  const SALE_METHODS = PAY_METHODS.concat([{ id: 'qarz', name: 'Qarz' }]);

  /* ------------------------- Saqlash ------------------------- */
  let S = defaultState();
  let saveTimer = null;
  let cache = null;

  function migrate(data) {
    const base = defaultState();
    const out = Object.assign({}, base, data || {});
    out.settings = Object.assign({}, base.settings, (data && data.settings) || {});
    // massiv maydonlar mavjudligini kafolatlash
    Object.keys(base).forEach(k => {
      if (Array.isArray(base[k]) && !Array.isArray(out[k])) out[k] = base[k].slice();
    });
    out.schema = SCHEMA;
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) { S = migrate(JSON.parse(raw)); return true; }
    } catch (e) { console.error('DB o‘qishda xato', e); }
    S = defaultState();
    return false;
  }

  function persist() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(S));
      return true;
    } catch (e) {
      console.error(e);
      GC.toast('Ma’lumotni saqlab bo‘lmadi: xotira to‘lgan bo‘lishi mumkin', 'err');
      return false;
    }
  }

  function save(opts) {
    cache = null;
    persist();
    if (!opts || opts.backup !== false) GC.Backup && GC.Backup.schedule();
    if (!opts || opts.render !== false) GC.rerender && GC.rerender();
  }

  /* ------------------------- Audit ------------------------- */
  function audit(action, entity, entityId, description, extra) {
    S.audit_logs.push({
      id: uid('log'), ts: Date.now(), action, entity, entityId,
      description, user: S.settings.cashier, extra: extra || null
    });
    if (S.audit_logs.length > 20000) S.audit_logs.splice(0, S.audit_logs.length - 20000);
  }

  /* ------------------------- Hisob-kitob (derived) ------------------------- */
  /* Hech qachon qo'lda saqlangan balans ishlatilmaydi — har doim bazadan hisoblanadi. */
  function compute() {
    if (cache) return cache;
    const today = todayISO();
    const debts = S.debts.filter(d => !d.canceled);
    const payments = S.payments.filter(p => !p.canceled);

    const debtById = new Map();
    const perCustomerDebts = new Map();
    debts.forEach(d => {
      const row = { debt: d, paid: 0 };
      debtById.set(d.id, row);
      if (!perCustomerDebts.has(d.customerId)) perCustomerDebts.set(d.customerId, []);
      perCustomerDebts.get(d.customerId).push(row);
    });
    // eng eski qarz birinchi (FIFO)
    perCustomerDebts.forEach(list => list.sort((a, b) =>
      (a.debt.date === b.debt.date ? (a.debt.createdAt || 0) - (b.debt.createdAt || 0) : (a.debt.date < b.debt.date ? -1 : 1))));

    const perCustomerPaid = new Map();
    const lastPayMap = new Map();
    const free = new Map(); // customerId -> taqsimlanmagan to'lov

    payments.forEach(p => {
      perCustomerPaid.set(p.customerId, (perCustomerPaid.get(p.customerId) || 0) + p.amount);
      const lp = lastPayMap.get(p.customerId);
      if (!lp || p.date > lp) lastPayMap.set(p.customerId, p.date);
      let rest = p.amount;
      if (p.debtId && debtById.has(p.debtId)) {
        const row = debtById.get(p.debtId);
        const can = Math.max(0, row.debt.amount - row.paid);
        const use = Math.min(can, rest);
        row.paid += use; rest -= use;
      }
      if (rest > 0) free.set(p.customerId, (free.get(p.customerId) || 0) + rest);
    });
    // qolgan to'lovlarni eng eski qarzlardan boshlab taqsimlash
    free.forEach((amount, cid) => {
      const list = perCustomerDebts.get(cid) || [];
      let rest = amount;
      for (let i = 0; i < list.length && rest > 0; i++) {
        const row = list[i];
        const can = Math.max(0, row.debt.amount - row.paid);
        const use = Math.min(can, rest);
        row.paid += use; rest -= use;
      }
    });

    const customers = S.customers.map(c => {
      const list = perCustomerDebts.get(c.id) || [];
      const total = list.reduce((s, r) => s + r.debt.amount, 0);
      const paid = perCustomerPaid.get(c.id) || 0;
      const remain = Math.max(0, total - paid);
      let lastDebt = null, overdue = 0, dueToday = 0;
      const lastPay = lastPayMap.get(c.id) || null;
      list.forEach(r => {
        if (!lastDebt || r.debt.date > lastDebt) lastDebt = r.debt.date;
        const rem = r.debt.amount - r.paid;
        if (rem > 0 && r.debt.dueDate) {
          const dd = daysDiff(today, r.debt.dueDate);
          if (dd > 0) overdue += rem; else if (dd === 0) dueToday += rem;
        }
      });
      const status = remain <= 0 ? 'clear' : (overdue > 0 ? 'overdue' : 'debt');
      return { id: c.id, c, total, paid, remain, lastDebt, lastPay, overdue, dueToday, status, debtCount: list.length };
    });
    const custById = new Map(customers.map(x => [x.id, x]));

    const debtRows = debts.map(d => {
      const row = debtById.get(d.id);
      const paid = row ? row.paid : 0;
      const remain = Math.max(0, d.amount - paid);
      let status, dueDays = null;
      if (remain <= 0) status = 'paid';
      else {
        if (d.dueDate) {
          dueDays = daysDiff(today, d.dueDate); // musbat = kechikkan kun
          if (dueDays > 0) status = 'overdue';
          else if (dueDays === 0) status = 'due_today';
          else status = paid > 0 ? 'partial' : 'open';
        } else status = paid > 0 ? 'partial' : 'open';
      }
      return { d, paid, remain, status, dueDays, customer: custById.get(d.customerId) };
    });
    const debtRowById = new Map(debtRows.map(r => [r.d.id, r]));

    const totals = {
      debt: debts.reduce((s, d) => s + d.amount, 0),
      paid: payments.reduce((s, p) => s + p.amount, 0)
    };
    totals.remain = Math.max(0, totals.debt - totals.paid);
    totals.todayDebt = debts.filter(d => d.date === today).reduce((s, d) => s + d.amount, 0);
    totals.todayPaid = payments.filter(p => p.date === today).reduce((s, p) => s + p.amount, 0);
    totals.debtorCount = customers.filter(x => x.remain > 0).length;
    totals.clearCount = customers.filter(x => x.remain <= 0 && x.total > 0).length;
    totals.overdue = debtRows.filter(r => r.status === 'overdue').reduce((s, r) => s + r.remain, 0);
    totals.overdueCount = debtRows.filter(r => r.status === 'overdue').length;
    totals.dueToday = debtRows.filter(r => r.status === 'due_today').reduce((s, r) => s + r.remain, 0);
    totals.closedDebts = debtRows.filter(r => r.status === 'paid').length;

    /* ---- Ombor ---- */
    const stockMap = new Map();
    S.products.forEach(p => stockMap.set(p.id, 0));
    S.stock_movements.forEach(m => {
      if (m.canceled) return;
      stockMap.set(m.productId, (stockMap.get(m.productId) || 0) + m.qty);
    });
    const products = S.products.map(p => {
      const qty = stockMap.get(p.id) || 0;
      const st = qty <= 0 ? 'out' : (qty <= (p.minStock || 0) ? 'low' : 'ok');
      return { p, qty, status: st, costValue: qty * p.costPrice, saleValue: qty * p.salePrice };
    });
    const prodById = new Map(products.map(x => [x.p.id, x]));

    const stock = {
      names: products.length,
      units: products.reduce((s, x) => s + x.qty, 0),
      costValue: products.reduce((s, x) => s + Math.max(0, x.costValue), 0),
      saleValue: products.reduce((s, x) => s + Math.max(0, x.saleValue), 0),
      low: products.filter(x => x.status === 'low').length,
      out: products.filter(x => x.status === 'out').length
    };
    stock.potentialProfit = stock.saleValue - stock.costValue;

    /* ---- Sotuv / Kassa ---- */
    const sales = S.sales.filter(s => !s.canceled);
    const todaySales = sales.filter(s => s.date === today);
    const shop = {
      todayTotal: todaySales.reduce((s, x) => s + x.total, 0),
      todayProfit: todaySales.reduce((s, x) => s + (x.total - x.cost), 0),
      todayCount: todaySales.length,
      todayItems: (() => {
        const ids = new Set(todaySales.map(s => s.id));
        return S.sale_items.reduce((s, i) => s + (ids.has(i.saleId) ? i.qty : 0), 0);
      })(),
      totalRevenue: sales.reduce((s, x) => s + x.total, 0),
      totalProfit: sales.reduce((s, x) => s + (x.total - x.cost), 0)
    };
    const todayIn = S.purchases.filter(p => !p.canceled && p.date === today).reduce((s, p) => s + p.total, 0);

    const cashRows = [];
    sales.forEach(s => { if (s.method !== 'qarz') cashRows.push({ date: s.date, amount: s.total, method: s.method, src: 'sotuv', id: s.id }); });
    payments.forEach(p => cashRows.push({ date: p.date, amount: p.amount, method: p.method, src: 'qarz to‘lovi', id: p.id }));
    const cash = {
      total: cashRows.reduce((s, r) => s + r.amount, 0),
      today: cashRows.filter(r => r.date === today).reduce((s, r) => s + r.amount, 0),
      byMethod: {}
    };
    PAY_METHODS.forEach(m => { cash.byMethod[m.id] = cashRows.filter(r => r.method === m.id).reduce((s, r) => s + r.amount, 0); });
    cash.todayByMethod = {};
    PAY_METHODS.forEach(m => { cash.todayByMethod[m.id] = cashRows.filter(r => r.method === m.id && r.date === today).reduce((s, r) => s + r.amount, 0); });

    cache = { today, customers, custById, debtRows, debtRowById, totals, products, prodById, stock, shop, cash, cashRows, todayIn };
    return cache;
  }

  /* ------------------------- CRUD: Mijoz ------------------------- */
  function addCustomer(data) {
    const c = {
      id: uid('cus'), name: String(data.name || '').trim(), phone: normPhone(data.phone),
      telegram: String(data.telegram || '').trim(), note: String(data.note || '').trim(),
      createdAt: Date.now(), date: todayISO()
    };
    S.customers.push(c);
    audit('create', 'customer', c.id, 'Yangi mijoz qo‘shildi: ' + c.name);
    save();
    return c;
  }
  function updateCustomer(id, data) {
    const c = S.customers.find(x => x.id === id); if (!c) return null;
    const before = c.name;
    Object.assign(c, {
      name: String(data.name || '').trim(), phone: normPhone(data.phone),
      telegram: String(data.telegram || '').trim(), note: String(data.note || '').trim()
    });
    audit('update', 'customer', id, 'Mijoz tahrirlandi: ' + before + (before !== c.name ? ' → ' + c.name : ''));
    save();
    return c;
  }
  function deleteCustomer(id) {
    const c = S.customers.find(x => x.id === id); if (!c) return false;
    const hasOps = S.debts.some(d => d.customerId === id) || S.payments.some(p => p.customerId === id);
    if (hasOps) return false;
    S.customers = S.customers.filter(x => x.id !== id);
    audit('delete', 'customer', id, 'Mijoz o‘chirildi: ' + c.name);
    save();
    return true;
  }

  /* ------------------------- CRUD: Qarz ------------------------- */
  function addDebt(data) {
    const d = {
      id: uid('dbt'), customerId: data.customerId, amount: parseMoney(data.amount),
      date: data.date || todayISO(), dueDate: data.dueDate || null,
      reason: String(data.reason || '').trim(), note: String(data.note || '').trim(),
      cashier: data.cashier || S.settings.cashier, saleId: data.saleId || null,
      canceled: false, createdAt: Date.now()
    };
    S.debts.push(d);
    const c = S.customers.find(x => x.id === d.customerId);
    audit('create', 'debt', d.id, (c ? c.name : '?') + ' ga ' + money(d.amount) + ' qarz yozildi' + (d.reason ? ' (' + d.reason + ')' : ''));
    if (!data._silent) save();
    return d;
  }
  function updateDebt(id, data) {
    const d = S.debts.find(x => x.id === id); if (!d) return null;
    const old = { amount: d.amount, dueDate: d.dueDate, date: d.date, reason: d.reason };
    d.amount = parseMoney(data.amount);
    d.date = data.date || d.date;
    d.dueDate = data.dueDate || null;
    d.reason = String(data.reason || '').trim();
    d.note = String(data.note || '').trim();
    audit('update', 'debt', id, 'Qarz tahrirlandi: ' + money(old.amount) + ' → ' + money(d.amount), old);
    save();
    return d;
  }
  function cancelDebt(id, reason) {
    const d = S.debts.find(x => x.id === id); if (!d) return false;
    d.canceled = true; d.canceledAt = Date.now(); d.cancelReason = reason || '';
    audit('cancel', 'debt', id, 'Qarz bekor qilindi: ' + money(d.amount) + (reason ? ' — ' + reason : ''));
    save();
    return true;
  }
  function deleteDebt(id, reason) {
    const d = S.debts.find(x => x.id === id); if (!d) return false;
    const snap = JSON.parse(JSON.stringify(d));
    S.debts = S.debts.filter(x => x.id !== id);
    S.payments.forEach(p => { if (p.debtId === id) p.debtId = null; });
    audit('delete', 'debt', id, 'Qarz o‘chirildi: ' + money(d.amount) + (reason ? ' — ' + reason : ''), snap);
    save();
    return true;
  }

  /* ------------------------- CRUD: To'lov ------------------------- */
  function addPayment(data) {
    const p = {
      id: uid('pay'), customerId: data.customerId, debtId: data.debtId || null,
      amount: parseMoney(data.amount), date: data.date || todayISO(),
      method: data.method || 'naqd', note: String(data.note || '').trim(),
      cashier: data.cashier || S.settings.cashier, canceled: false, createdAt: Date.now()
    };
    S.payments.push(p);
    const c = S.customers.find(x => x.id === p.customerId);
    audit('create', 'payment', p.id, (c ? c.name : '?') + ' ' + money(p.amount) + ' to‘ladi (' + methodName(p.method) + ')');
    save();
    cache = null;
    const st = compute().custById.get(p.customerId);
    if (st) audit('info', 'payment', p.id, 'Qolgan qarz: ' + money(st.remain));
    persist();
    return p;
  }
  function updatePayment(id, data) {
    const p = S.payments.find(x => x.id === id); if (!p) return null;
    const old = p.amount;
    p.amount = parseMoney(data.amount);
    p.date = data.date || p.date;
    p.method = data.method || p.method;
    p.debtId = data.debtId || null;
    p.note = String(data.note || '').trim();
    audit('update', 'payment', id, 'To‘lov tahrirlandi: ' + money(old) + ' → ' + money(p.amount), { amount: old });
    save();
    return p;
  }
  function deletePayment(id, reason) {
    const p = S.payments.find(x => x.id === id); if (!p) return false;
    const snap = JSON.parse(JSON.stringify(p));
    S.payments = S.payments.filter(x => x.id !== id);
    audit('delete', 'payment', id, 'To‘lov o‘chirildi: ' + money(p.amount) + (reason ? ' — ' + reason : ''), snap);
    save();
    return true;
  }

  function methodName(id) {
    const m = SALE_METHODS.find(x => x.id === id);
    return m ? m.name : id;
  }

  /* ------------------------- Mahsulot / Ombor ------------------------- */
  function addProduct(data) {
    const p = {
      id: uid('prd'), name: String(data.name || '').trim(), categoryId: data.categoryId || 'cat_other',
      costPrice: parseMoney(data.costPrice), salePrice: parseMoney(data.salePrice),
      minStock: parseInt(data.minStock, 10) || 0, barcode: String(data.barcode || '').trim(),
      unit: data.unit || 'dona', supplierId: data.supplierId || null,
      note: String(data.note || '').trim(), active: true, createdAt: Date.now()
    };
    S.products.push(p);
    audit('create', 'product', p.id, 'Mahsulot qo‘shildi: ' + p.name);
    const start = parseInt(data.startQty, 10) || 0;
    if (start > 0) {
      S.stock_movements.push({
        id: uid('mov'), productId: p.id, qty: start, type: 'in', refType: 'start', refId: null,
        date: todayISO(), ts: Date.now(), note: 'Boshlang‘ich qoldiq', cashier: S.settings.cashier
      });
      audit('stock', 'product', p.id, p.name + ': boshlang‘ich qoldiq ' + start + ' ' + p.unit);
    }
    save();
    return p;
  }
  function updateProduct(id, data) {
    const p = S.products.find(x => x.id === id); if (!p) return null;
    Object.assign(p, {
      name: String(data.name || '').trim(), categoryId: data.categoryId || p.categoryId,
      costPrice: parseMoney(data.costPrice), salePrice: parseMoney(data.salePrice),
      minStock: parseInt(data.minStock, 10) || 0, barcode: String(data.barcode || '').trim(),
      unit: data.unit || p.unit, supplierId: data.supplierId || null, note: String(data.note || '').trim()
    });
    audit('update', 'product', id, 'Mahsulot tahrirlandi: ' + p.name);
    save();
    return p;
  }
  function deleteProduct(id) {
    const p = S.products.find(x => x.id === id); if (!p) return false;
    const used = S.sale_items.some(i => i.productId === id) || S.purchase_items.some(i => i.productId === id);
    if (used) { p.active = false; audit('archive', 'product', id, 'Mahsulot arxivlandi: ' + p.name); save(); return 'archived'; }
    S.products = S.products.filter(x => x.id !== id);
    S.stock_movements = S.stock_movements.filter(m => m.productId !== id);
    audit('delete', 'product', id, 'Mahsulot o‘chirildi: ' + p.name);
    save();
    return true;
  }

  function addPurchase(data) {
    // data: {supplierId, date, note, items:[{productId, qty, cost}]}
    const items = (data.items || []).filter(i => i.qty > 0);
    if (!items.length) return null;
    const total = items.reduce((s, i) => s + i.qty * i.cost, 0);
    const pur = {
      id: uid('pur'), supplierId: data.supplierId || null, date: data.date || todayISO(),
      total, note: String(data.note || '').trim(), cashier: S.settings.cashier,
      canceled: false, ts: Date.now()
    };
    S.purchases.push(pur);
    items.forEach(i => {
      S.purchase_items.push({ id: uid('pit'), purchaseId: pur.id, productId: i.productId, qty: i.qty, cost: i.cost });
      S.stock_movements.push({
        id: uid('mov'), productId: i.productId, qty: i.qty, type: 'in', refType: 'purchase', refId: pur.id,
        date: pur.date, ts: Date.now(), note: 'Kirim', cashier: S.settings.cashier
      });
      const p = S.products.find(x => x.id === i.productId);
      if (p && data.updateCost !== false && i.cost > 0) p.costPrice = i.cost;
    });
    audit('create', 'purchase', pur.id, 'Omborga kirim: ' + money(total) + ' (' + items.length + ' nomdagi mahsulot)');
    save();
    return pur;
  }
  function cancelPurchase(id, reason) {
    const pur = S.purchases.find(x => x.id === id); if (!pur || pur.canceled) return false;
    pur.canceled = true; pur.canceledAt = Date.now(); pur.cancelReason = reason || '';
    S.stock_movements.forEach(m => { if (m.refType === 'purchase' && m.refId === id) m.canceled = true; });
    audit('cancel', 'purchase', id, 'Kirim bekor qilindi: ' + money(pur.total) + (reason ? ' — ' + reason : ''));
    save();
    return true;
  }

  function addSale(data) {
    // data: {items:[{productId,qty,price}], method, customerId, note, date}
    const items = (data.items || []).filter(i => i.qty > 0);
    if (!items.length) return null;
    let total = 0, cost = 0;
    const rows = items.map(i => {
      const p = S.products.find(x => x.id === i.productId);
      const price = parseMoney(i.price);
      const c = p ? p.costPrice : 0;
      total += price * i.qty; cost += c * i.qty;
      return { id: uid('sit'), productId: i.productId, name: p ? p.name : '?', qty: i.qty, price, cost: c };
    });
    const sale = {
      id: uid('sal'), date: data.date || todayISO(), ts: Date.now(),
      customerId: data.customerId || null, method: data.method || 'naqd',
      total, cost, cashier: S.settings.cashier, note: String(data.note || '').trim(), canceled: false
    };
    S.sales.push(sale);
    rows.forEach(r => {
      r.saleId = sale.id;
      S.sale_items.push(r);
      S.stock_movements.push({
        id: uid('mov'), productId: r.productId, qty: -r.qty, type: 'sale', refType: 'sale', refId: sale.id,
        date: sale.date, ts: Date.now(), note: 'Sotuv', cashier: S.settings.cashier
      });
    });
    if (sale.method === 'qarz' && sale.customerId) {
      const d = addDebt({
        customerId: sale.customerId, amount: total, date: sale.date,
        dueDate: addDays(sale.date, S.settings.defaultDueDays || 7),
        reason: 'Magazin xaridi (qarzga)', saleId: sale.id, _silent: true
      });
      sale.debtId = d.id;
    }
    audit('create', 'sale', sale.id, 'Sotuv: ' + money(total) + ' (' + methodName(sale.method) + ')');
    save();
    return sale;
  }
  function cancelSale(id, reason) {
    const s = S.sales.find(x => x.id === id); if (!s || s.canceled) return false;
    s.canceled = true; s.canceledAt = Date.now(); s.cancelReason = reason || '';
    S.stock_movements.forEach(m => { if (m.refType === 'sale' && m.refId === id) m.canceled = true; });
    if (s.debtId) {
      const d = S.debts.find(x => x.id === s.debtId);
      if (d) { d.canceled = true; d.cancelReason = 'Sotuv bekor qilindi'; }
    }
    audit('cancel', 'sale', id, 'Sotuv bekor qilindi: ' + money(s.total) + (reason ? ' — ' + reason : ''));
    save();
    return true;
  }

  function stockOut(productId, qty, reason) { // chiqim (yaroqsiz, sinish, ichki ishlatish)
    const p = S.products.find(x => x.id === productId); if (!p) return false;
    S.stock_movements.push({
      id: uid('mov'), productId, qty: -Math.abs(qty), type: 'out', refType: 'writeoff', refId: null,
      date: todayISO(), ts: Date.now(), note: reason || 'Chiqim', cashier: S.settings.cashier
    });
    audit('stock', 'product', productId, p.name + ': chiqim ' + Math.abs(qty) + ' ' + p.unit + (reason ? ' — ' + reason : ''));
    save();
    return true;
  }

  function inventoryAdjust(productId, realQty, reason) {
    const p = S.products.find(x => x.id === productId); if (!p) return false;
    cache = null;
    const cur = compute().prodById.get(productId);
    const sys = cur ? cur.qty : 0;
    const diff = realQty - sys;
    S.inventory_adjustments.push({
      id: uid('inv'), productId, systemQty: sys, realQty, diff, reason: reason || '',
      date: todayISO(), ts: Date.now(), cashier: S.settings.cashier
    });
    if (diff !== 0) {
      S.stock_movements.push({
        id: uid('mov'), productId, qty: diff, type: 'adjust', refType: 'inventory', refId: null,
        date: todayISO(), ts: Date.now(), note: 'Inventarizatsiya: ' + (reason || ''), cashier: S.settings.cashier
      });
    }
    audit('inventory', 'product', productId, p.name + ': inventarizatsiya ' + sys + ' → ' + realQty + ' (' + (diff > 0 ? '+' : '') + diff + ')' + (reason ? ' — ' + reason : ''));
    save();
    return true;
  }

  /* ------------------------- Kategoriya / Yetkazib beruvchi ------------------------- */
  function addCategory(name) {
    const c = { id: uid('cat'), name: String(name || '').trim() };
    S.categories.push(c); audit('create', 'category', c.id, 'Kategoriya qo‘shildi: ' + c.name); save(); return c;
  }
  function updateCategory(id, name) {
    const c = S.categories.find(x => x.id === id); if (!c) return null;
    c.name = String(name || '').trim(); audit('update', 'category', id, 'Kategoriya tahrirlandi: ' + c.name); save(); return c;
  }
  function deleteCategory(id) {
    if (S.products.some(p => p.categoryId === id)) return false;
    S.categories = S.categories.filter(x => x.id !== id);
    audit('delete', 'category', id, 'Kategoriya o‘chirildi'); save(); return true;
  }
  function addSupplier(data) {
    const s = {
      id: uid('sup'), name: String(data.name || '').trim(), phone: normPhone(data.phone),
      address: String(data.address || '').trim(), note: String(data.note || '').trim(), createdAt: Date.now()
    };
    S.suppliers.push(s); audit('create', 'supplier', s.id, 'Yetkazib beruvchi qo‘shildi: ' + s.name); save(); return s;
  }
  function updateSupplier(id, data) {
    const s = S.suppliers.find(x => x.id === id); if (!s) return null;
    Object.assign(s, {
      name: String(data.name || '').trim(), phone: normPhone(data.phone),
      address: String(data.address || '').trim(), note: String(data.note || '').trim()
    });
    audit('update', 'supplier', id, 'Yetkazib beruvchi tahrirlandi: ' + s.name); save(); return s;
  }
  function deleteSupplier(id) {
    if (S.products.some(p => p.supplierId === id) || S.purchases.some(p => p.supplierId === id)) return false;
    S.suppliers = S.suppliers.filter(x => x.id !== id);
    audit('delete', 'supplier', id, 'Yetkazib beruvchi o‘chirildi'); save(); return true;
  }

  /* ------------------------- Mijoz tarixi ------------------------- */
  function customerHistory(customerId) {
    const out = [];
    S.debts.forEach(d => { if (d.customerId === customerId) out.push({ type: 'debt', ts: d.createdAt || 0, date: d.date, amount: d.amount, obj: d }); });
    S.payments.forEach(p => { if (p.customerId === customerId) out.push({ type: 'pay', ts: p.createdAt || 0, date: p.date, amount: p.amount, obj: p }); });
    out.sort((a, b) => (a.date === b.date ? b.ts - a.ts : (a.date < b.date ? 1 : -1)));
    return out;
  }

  /* ------------------------- Validatsiya ------------------------- */
  const V = {
    debt(data) {
      const e = {};
      if (!data.customerId) e.customerId = 'Mijozni tanlang';
      const a = parseMoney(data.amount);
      if (isNaN(a)) e.amount = 'Summani kiriting';
      else if (a <= 0) e.amount = 'Qarz summasi 0 dan katta bo‘lishi kerak';
      else if (a > 1e12) e.amount = 'Summa juda katta';
      if (!data.date || !isoToDate(data.date)) e.date = 'Sana noto‘g‘ri';
      if (data.dueDate) {
        if (!isoToDate(data.dueDate)) e.dueDate = 'Muddat sanasi noto‘g‘ri';
        else if (daysDiff(data.dueDate, data.date) < 0) e.dueDate = 'To‘lash muddati qarz sanasidan oldin bo‘lishi mumkin emas';
      }
      return e;
    },
    payment(data, ctx) {
      const e = {};
      if (!data.customerId) e.customerId = 'Mijozni tanlang';
      const a = parseMoney(data.amount);
      if (isNaN(a)) e.amount = 'To‘lov summasini kiriting';
      else if (a <= 0) e.amount = 'To‘lov 0 dan katta bo‘lishi kerak';
      else if (ctx && a > ctx.maxAmount) e.amount = 'To‘lov qolgan qarzdan (' + money(ctx.maxAmount) + ') katta bo‘lishi mumkin emas';
      if (!data.date || !isoToDate(data.date)) e.date = 'Sana noto‘g‘ri';
      return e;
    },
    customer(data, id) {
      const e = {};
      const n = String(data.name || '').trim();
      if (!n) e.name = 'Ismni kiriting';
      else if (n.length < 2) e.name = 'Ism juda qisqa';
      else if (S.customers.some(c => c.id !== id && c.name.toLowerCase() === n.toLowerCase() && normPhone(c.phone) === normPhone(data.phone)))
        e.name = 'Bu ism va telefon bilan mijoz allaqachon mavjud';
      if (data.phone && !validPhone(data.phone)) e.phone = 'Telefon raqami noto‘g‘ri (masalan: +998 90 123 45 67)';
      return e;
    },
    product(data) {
      const e = {};
      if (!String(data.name || '').trim()) e.name = 'Mahsulot nomini kiriting';
      const c = parseMoney(data.costPrice), s = parseMoney(data.salePrice);
      if (isNaN(c) || c < 0) e.costPrice = 'Kirim narxini to‘g‘ri kiriting';
      if (isNaN(s) || s <= 0) e.salePrice = 'Sotish narxi 0 dan katta bo‘lishi kerak';
      if (!isNaN(c) && !isNaN(s) && s < c) e.salePrice = 'Sotish narxi tannarxdan kichik — zarar bo‘ladi';
      const m = parseInt(data.minStock, 10);
      if (data.minStock !== '' && (isNaN(m) || m < 0)) e.minStock = 'Minimal qoldiq noto‘g‘ri';
      return e;
    }
  };

  /* ------------------------- Export / Import ------------------------- */
  function exportJSON() {
    return JSON.stringify({ app: 'QarzDaftar', schema: SCHEMA, exportedAt: new Date().toISOString(), data: S }, null, 2);
  }
  function validateBackup(obj) {
    const res = { ok: false, reason: '', stats: null };
    if (!obj || typeof obj !== 'object') { res.reason = 'Fayl JSON formatida emas'; return res; }
    const d = obj.data || obj;
    const need = ['customers', 'debts', 'payments', 'products', 'settings'];
    for (const k of need) {
      if (!(k in d)) { res.reason = 'Backup faylida "' + k + '" jadvali topilmadi'; return res; }
    }
    if (!Array.isArray(d.customers) || !Array.isArray(d.debts) || !Array.isArray(d.payments)) {
      res.reason = 'Backup fayl strukturasi buzilgan'; return res;
    }
    res.ok = true;
    res.stats = {
      customers: d.customers.length, debts: d.debts.length, payments: d.payments.length,
      products: (d.products || []).length, sales: (d.sales || []).length,
      exportedAt: obj.exportedAt || null
    };
    return res;
  }
  function importJSON(obj) {
    const v = validateBackup(obj);
    if (!v.ok) return v;
    S = migrate(obj.data || obj);
    cache = null;
    persist();
    audit('restore', 'system', null, 'Ma’lumotlar backupdan tiklandi');
    persist();
    return v;
  }

  function toCSV(rows, headers) {
    const esc2 = (v) => {
      const s = String(v == null ? '' : v);
      return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const head = headers.map(h => esc2(h.label)).join(';');
    const body = rows.map(r => headers.map(h => esc2(typeof h.get === 'function' ? h.get(r) : r[h.key])).join(';'));
    return '﻿' + [head].concat(body).join('\r\n');
  }
  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  /* ------------------------- Public API ------------------------- */
  Object.assign(GC, {
    SCHEMA, DB_KEY, UNITS, views: {}, actions: {}, inputHandlers: {}, PAY_METHODS, SALE_METHODS, MONTHS, WEEK,
    setState(next) { S = migrate(next); cache = null; },
    load, save, persist, invalidate() { cache = null; },
    compute, audit, defaultState, migrate,
    money, moneyShort, groupNum, parseMoney, fmtDate, fmtDT, fmtTime, todayISO, dateToISO, isoToDate,
    daysDiff, addDays, fmtSize, esc, uid, normPhone, fmtPhone, validPhone, methodName,
    addCustomer, updateCustomer, deleteCustomer,
    addDebt, updateDebt, cancelDebt, deleteDebt,
    addPayment, updatePayment, deletePayment,
    addProduct, updateProduct, deleteProduct,
    addPurchase, cancelPurchase, addSale, cancelSale, stockOut, inventoryAdjust,
    addCategory, updateCategory, deleteCategory,
    addSupplier, updateSupplier, deleteSupplier,
    customerHistory, V, exportJSON, importJSON, validateBackup, toCSV, download
  });
  // MUHIM: Object.assign getterlarni qiymatga aylantiradi, shuning uchun alohida e'lon qilinadi
  Object.defineProperty(GC, 'state', { get() { return S; }, enumerable: true });
})();
