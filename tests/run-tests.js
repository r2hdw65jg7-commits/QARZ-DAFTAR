/* =========================================================================
   Qarz Daftar — hisob-kitob mantig'i testlari (node tests/run-tests.js)
   Brauzersiz muhitda core.js yuklanadi va moliyaviy formulalar tekshiriladi.
   ========================================================================= */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const store = {};
const sandbox = {
  console,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'core.js'), 'utf8'), sandbox);

const GC = sandbox.GC;
GC.toast = () => {};
GC.load();

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
function eq(name, a, b) { ok(name, a === b, 'kutilgan ' + b + ', olindi ' + a); }
function section(t) { console.log('\n' + t); }

/* ---------- 1. Formatlash ---------- */
section('1) Pul formatlash va parsing');
eq('1 000 so‘m', GC.money(1000), '1 000 so‘m');
eq('12 500 000 so‘m', GC.money(12500000), '12 500 000 so‘m');
eq('parseMoney("1 250 000")', GC.parseMoney('1 250 000'), 1250000);
eq('parseMoney("150 000 so‘m")', GC.parseMoney('150 000 so‘m'), 150000);
eq('butun son (integer)', Number.isInteger(GC.parseMoney('99 999')), true);

/* ---------- 2. Qarz hisoblash ---------- */
section('2) Qarz va qisman to‘lov');
const ali = GC.addCustomer({ name: 'Ali', phone: '+998901234567' });
GC.addDebt({ customerId: ali.id, amount: 500000, date: GC.todayISO(), reason: '4 soat PC' });
let st = GC.compute();
eq('Jami qarz 500 000', st.custById.get(ali.id).total, 500000);
eq('Qolgan 500 000', st.custById.get(ali.id).remain, 500000);

GC.addPayment({ customerId: ali.id, amount: 200000, method: 'naqd' });
st = GC.compute();
eq('To‘langan 200 000', st.custById.get(ali.id).paid, 200000);
eq('Qolgan 300 000', st.custById.get(ali.id).remain, 300000);

GC.addPayment({ customerId: ali.id, amount: 100000, method: 'karta' });
st = GC.compute();
eq('Ketma-ket to‘lovdan keyin qolgan 200 000', st.custById.get(ali.id).remain, 200000);

GC.addPayment({ customerId: ali.id, amount: 200000, method: 'click' });
st = GC.compute();
eq('To‘liq to‘langanda qolgan 0', st.custById.get(ali.id).remain, 0);
eq('Mijoz holati "clear"', st.custById.get(ali.id).status, 'clear');
eq('Qarz statusi "paid"', st.debtRows[0].status, 'paid');

/* ---------- 3. Muddat nazorati ---------- */
section('3) Muddat nazorati');
const vali = GC.addCustomer({ name: 'Vali' });
const today = GC.todayISO();
GC.addDebt({ customerId: vali.id, amount: 300000, date: GC.addDays(today, -10), dueDate: GC.addDays(today, -4) });
GC.addDebt({ customerId: vali.id, amount: 100000, date: today, dueDate: today });
GC.addDebt({ customerId: vali.id, amount: 50000, date: today, dueDate: GC.addDays(today, 5) });
st = GC.compute();
const vRows = st.debtRows.filter(r => r.d.customerId === vali.id);
eq('Muddati o‘tgan qarz aniqlandi', vRows.filter(r => r.status === 'overdue').length, 1);
eq('Kechikish 4 kun', vRows.find(r => r.status === 'overdue').dueDays, 4);
eq('Bugun to‘lanadigan qarz', vRows.filter(r => r.status === 'due_today').length, 1);
eq('Muddati bor qarz "open"', vRows.filter(r => r.status === 'open').length, 1);
eq('Mijoz holati "overdue"', st.custById.get(vali.id).status, 'overdue');

/* ---------- 4. FIFO taqsimot ---------- */
section('4) To‘lovni eng eski qarzdan taqsimlash (FIFO)');
GC.addPayment({ customerId: vali.id, amount: 350000, method: 'naqd' });
st = GC.compute();
const oldest = st.debtRows.filter(r => r.d.customerId === vali.id).sort((a, b) => (a.d.date < b.d.date ? -1 : 1))[0];
eq('Eng eski qarz to‘liq yopildi', oldest.remain, 0);
eq('Vali qolgan qarzi 100 000', st.custById.get(vali.id).remain, 100000);

/* ---------- 5. Validatsiya ---------- */
section('5) Validatsiya qoidalari');
ok('Manfiy qarz rad etiladi', !!GC.V.debt({ customerId: ali.id, amount: -5000, date: today }).amount);
ok('0 so‘mlik qarz rad etiladi', !!GC.V.debt({ customerId: ali.id, amount: 0, date: today }).amount);
ok('Mijozsiz qarz rad etiladi', !!GC.V.debt({ amount: 10000, date: today }).customerId);
ok('Noto‘g‘ri sana rad etiladi', !!GC.V.debt({ customerId: ali.id, amount: 1000, date: 'xx' }).date);
ok('Muddat sanadan oldin bo‘lsa rad etiladi',
  !!GC.V.debt({ customerId: ali.id, amount: 1000, date: today, dueDate: GC.addDays(today, -1) }).dueDate);
ok('Qarzdan katta to‘lov rad etiladi',
  !!GC.V.payment({ customerId: vali.id, amount: 999999999, date: today }, { maxAmount: 100000 }).amount);
ok('Noto‘g‘ri telefon rad etiladi', !!GC.V.customer({ name: 'Test', phone: '123' }).phone);
ok('Bo‘sh ism rad etiladi', !!GC.V.customer({ name: '' }).name);
ok('Tannarxdan arzon sotish narxi ogohlantiradi',
  !!GC.V.product({ name: 'X', costPrice: 10000, salePrice: 5000, minStock: '0' }).salePrice);

/* ---------- 6. Ombor ---------- */
section('6) Ombor qoldig‘i va sotuv');
const cola = GC.addProduct({ name: 'Coca Cola 0.5L', costPrice: 8000, salePrice: 12000, startQty: 100, minStock: 10, unit: 'dona' });
GC.addPurchase({ items: [{ productId: cola.id, qty: 50, cost: 8000 }], date: today });
st = GC.compute();
eq('Boshlang‘ich + kirim = 150', st.prodById.get(cola.id).qty, 150);

const sale = GC.addSale({ items: [{ productId: cola.id, qty: 80, price: 12000 }], method: 'naqd' });
GC.stockOut(cola.id, 5, 'sinib qoldi');
st = GC.compute();
eq('Qoldiq = 100+50-80-5 = 65', st.prodById.get(cola.id).qty, 65);
eq('Sotuv summasi', sale.total, 960000);
eq('Foyda = (12000-8000)*80', sale.total - sale.cost, 320000);

GC.inventoryAdjust(cola.id, 62, '3 dona yo‘qolgan');
st = GC.compute();
eq('Inventarizatsiyadan keyin qoldiq 62', st.prodById.get(cola.id).qty, 62);

/* ---------- 7. Magazin + qarz integratsiyasi ---------- */
section('7) Qarzga sotish → mijoz qarzi + kassa');
const beforeRemain = GC.compute().custById.get(ali.id).remain;
const cashBefore = GC.compute().cash.total;
GC.addSale({ items: [{ productId: cola.id, qty: 1, price: 12000 }], method: 'qarz', customerId: ali.id });
st = GC.compute();
eq('Mijoz qarzi +12 000', st.custById.get(ali.id).remain, beforeRemain + 12000);
eq('Kassaga pul tushmadi', st.cash.total, cashBefore);
eq('Ombor 1 donaga kamaydi', st.prodById.get(cola.id).qty, 61);

/* ---------- 8. Kam qolgan / tugagan ---------- */
section('8) Ombor ogohlantirishlari');
const chips = GC.addProduct({ name: 'Chips', costPrice: 10000, salePrice: 15000, startQty: 5, minStock: 10 });
const empty = GC.addProduct({ name: 'Snickers', costPrice: 7000, salePrice: 10000, startQty: 0, minStock: 5 });
st = GC.compute();
eq('Kam qolgan holati', st.prodById.get(chips.id).status, 'low');
eq('Tugagan holati', st.prodById.get(empty.id).status, 'out');

/* ---------- 9. Bekor qilish ---------- */
section('9) Sotuvni bekor qilish ombor va qarzni tiklaydi');
const qtyBefore = GC.compute().prodById.get(cola.id).qty;
const remainBefore = GC.compute().custById.get(ali.id).remain;
const s2 = GC.addSale({ items: [{ productId: cola.id, qty: 2, price: 12000 }], method: 'qarz', customerId: ali.id });
GC.cancelSale(s2.id, 'test');
st = GC.compute();
eq('Ombor tiklandi', st.prodById.get(cola.id).qty, qtyBefore);
eq('Qarz tiklandi', st.custById.get(ali.id).remain, remainBefore);

/* ---------- 10. Audit va backup formati ---------- */
section('10) Audit log va backup fayli');
ok('Audit log yozuvlari mavjud', GC.state.audit_logs.length > 10);
ok('O‘chirilgan operatsiya audit logda saqlanadi', (() => {
  const d = GC.addDebt({ customerId: ali.id, amount: 70000, date: today });
  GC.deleteDebt(d.id, 'noto‘g‘ri kiritildi');
  return GC.state.audit_logs.some(a => a.action === 'delete' && a.entity === 'debt');
})());
const json = GC.exportJSON();
const parsed = JSON.parse(json);
ok('Backup JSON valid', GC.validateBackup(parsed).ok);
ok('Buzilgan backup rad etiladi', !GC.validateBackup({ data: { customers: [] } }).ok);
const snapshot = GC.compute().totals.remain;
GC.importJSON(parsed);
eq('Import qilingandan keyin qoldiq bir xil', GC.compute().totals.remain, snapshot);

/* ---------- 11. Umumiy formulalar ---------- */
section('11) Umumiy formulalar (SUM asosida)');
const S = GC.state;
const sumDebt = S.debts.filter(d => !d.canceled).reduce((a, b) => a + b.amount, 0);
const sumPay = S.payments.filter(p => !p.canceled).reduce((a, b) => a + b.amount, 0);
st = GC.compute();
eq('Jami qarz = SUM(debts.amount)', st.totals.debt, sumDebt);
eq('Jami to‘lov = SUM(payments.amount)', st.totals.paid, sumPay);
eq('Qolgan = jami qarz - jami to‘lov', st.totals.remain, Math.max(0, sumDebt - sumPay));

/* ---------- 12. Performance ---------- */
section('12) Performance (katta hajm)');
const t0 = Date.now();
const big = GC.defaultState();
for (let i = 0; i < 2000; i++) big.customers.push({ id: 'c' + i, name: 'Mijoz ' + i, phone: '', createdAt: Date.now(), date: today });
for (let i = 0; i < 20000; i++) big.debts.push({ id: 'd' + i, customerId: 'c' + (i % 2000), amount: 10000, date: today, dueDate: today, createdAt: i });
for (let i = 0; i < 20000; i++) big.payments.push({ id: 'p' + i, customerId: 'c' + (i % 2000), amount: 5000, date: today, method: 'naqd', createdAt: i });
GC.setState(big);
const t1 = Date.now();
st = GC.compute();
const ms = Date.now() - t1;
eq('2 000 mijoz · 40 000 yozuv: jami qarz', st.totals.debt, 200000000);
eq('Qolgan qarz to‘g‘ri', st.totals.remain, 100000000);
ok('Hisoblash 1 soniyadan tez (' + ms + ' ms)', ms < 1000);
console.log('  ℹ baza tayyorlash: ' + (t1 - t0) + ' ms, hisoblash: ' + ms + ' ms');

console.log('\n══════════════════════════════════');
console.log('  Natija: ' + pass + ' ta muvaffaqiyatli, ' + fail + ' ta xato');
console.log('══════════════════════════════════');
process.exit(fail ? 1 : 0);
