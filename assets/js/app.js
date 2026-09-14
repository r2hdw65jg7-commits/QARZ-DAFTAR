/* =========================================================================
   Qarz Daftar — ILOVA YADROSI (router, global qidiruv, hodisalar)
   ========================================================================= */
(function () {
  'use strict';
  const GC = window.GC;
  const esc = GC.esc, money = GC.money;

  const ROUTES = ['dashboard', 'debts', 'customers', 'payments', 'pos', 'sales', 'products', 'stock', 'suppliers', 'cash', 'reports', 'audit', 'settings'];
  let current = 'dashboard';
  let rafPending = false;

  /* ---------------- Render ---------------- */
  function currentRoute() {
    const h = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    return ROUTES.includes(h) ? h : 'dashboard';
  }

  function render(keepFocus) {
    const view = document.getElementById('view');
    const name = current;
    const fn = GC.views[name];
    let focusSel = null, selStart = null;
    if (keepFocus && document.activeElement && document.activeElement.dataset && document.activeElement.dataset.action) {
      focusSel = '[data-action="' + document.activeElement.dataset.action + '"]';
      selStart = document.activeElement.selectionStart;
    }
    try {
      view.innerHTML = fn ? fn() : '<div class="empty">Sahifa topilmadi</div>';
    } catch (e) {
      console.error(e);
      view.innerHTML = '<div class="empty"><div class="big">⚠️</div>Sahifani chizishda xato: ' + esc(e.message) + '</div>';
    }
    GC.initMoneyInputs(view);
    document.querySelectorAll('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.view === name));
    updateChrome();
    if (focusSel) {
      const el = view.querySelector(focusSel);
      if (el) { el.focus(); try { el.setSelectionRange(selStart, selStart); } catch (e) {} }
    }
  }

  GC.rerender = function (keepFocus) {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; render(keepFocus); });
  };

  function updateChrome() {
    const S = GC.state, st = GC.compute(), B = GC.Backup.status;
    document.getElementById('brandName').textContent = S.settings.clubName || 'GAME CLUB';
    document.getElementById('cashierName').textContent = S.settings.cashier || 'Admin';
    document.getElementById('cashierAva').textContent = (S.settings.cashier || 'A').charAt(0).toUpperCase();
    const bd = document.getElementById('badgeDebts');
    bd.textContent = st.totals.overdueCount ? st.totals.overdueCount : '';
    const bs = document.getElementById('badgeStock');
    const lowOut = st.stock.low + st.stock.out;
    bs.textContent = lowOut ? lowOut : '';
    const dot = document.getElementById('backupDot');
    const txt = document.getElementById('backupChipText');
    dot.className = 'dot ' + (!B.connected ? '' : B.lastStatus === 'err' ? 'err' : B.lastStatus === 'ok' ? 'ok' : 'warn');
    txt.textContent = !B.supported ? 'Backup: mavjud emas'
      : !B.connected ? 'Backup: papka tanlanmagan'
      : B.lastStatus === 'err' ? 'Backup: xato!'
      : B.lastAt ? 'Backup: ' + GC.fmtTime(B.lastAt) : 'Backup: tayyor';
    document.getElementById('themeBtn').textContent = S.settings.theme === 'dark' ? '🌙' : '☀️';
  }
  GC.on('backup', () => { try { updateChrome(); } catch (e) {} });

  /* ---------------- Router ---------------- */
  function route() {
    current = currentRoute();
    document.body.classList.remove('nav-open');
    render();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* ---------------- Hodisalar ---------------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const act = el.dataset.action;
    if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
      // checkbox amallari o'z handlerida
    } else if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return;
    const fn = GC.actions[act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-action],[data-set]');
    if (!el) return;
    if (el.dataset.set) { GC.settingsInput(el); return; }
    const act = el.dataset.action;
    if (el.type === 'checkbox' && GC.actions[act]) { GC.actions[act](el, e); return; }
    if (GC.inputHandlers[act]) GC.inputHandlers[act](el, e);
  });
  let inputTimer = null;
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-action],[data-set],[name]');
    if (!el) return;
    if (el.dataset.set) { clearTimeout(inputTimer); inputTimer = setTimeout(() => GC.settingsInput(el), 400); return; }
    const act = el.dataset.action || el.name;
    if (act === 'globalSearch') return;
    if (GC.inputHandlers[act]) {
      clearTimeout(inputTimer);
      inputTimer = setTimeout(() => GC.inputHandlers[act](el, e), el.type === 'date' ? 0 : 220);
    }
  });

  /* ---------------- Sidebar / tema ---------------- */
  GC.actions['toggle-sidebar'] = () => document.body.classList.toggle('nav-open');
  GC.actions['toggle-theme'] = () => {
    const S = GC.state;
    S.settings.theme = S.settings.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    GC.save();
  };
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', GC.state.settings.theme === 'light' ? 'light' : 'dark');
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = GC.state.settings.theme === 'light' ? '#eef2f9' : '#0b0f1a';
  }

  /* ---------------- Global qidiruv ---------------- */
  const searchEl = document.getElementById('globalSearch');
  const resEl = document.getElementById('searchResults');
  let searchTimer = null;

  function globalSearch(q) {
    q = q.trim().toLowerCase();
    if (!q) { resEl.hidden = true; return; }
    const st = GC.compute(), S = GC.state;
    const num = GC.parseMoney(q);
    const out = [];

    const custs = st.customers.filter(x =>
      x.c.name.toLowerCase().includes(q) || (x.c.phone || '').includes(q.replace(/\D/g, '')) ||
      (x.c.telegram || '').toLowerCase().includes(q) || x.id.toLowerCase().includes(q)).slice(0, 6);
    if (custs.length) out.push('<div class="sr-group">Mijozlar</div>' + custs.map(x =>
      '<div class="sr-item" data-action="customer-view" data-id="' + x.id + '"><span>' + GC.esc(x.c.name) +
      ' <span class="muted">' + GC.esc(GC.fmtPhone(x.c.phone)) + '</span></span>' +
      '<b style="color:' + (x.remain > 0 ? 'var(--dan)' : 'var(--ok)') + '">' + money(x.remain) + '</b></div>').join(''));

    const debts = st.debtRows.filter(r =>
      (r.customer && r.customer.c.name.toLowerCase().includes(q)) ||
      (r.d.reason || '').toLowerCase().includes(q) || r.d.id.toLowerCase().includes(q) ||
      (!isNaN(num) && String(r.d.amount).startsWith(String(num))) || r.d.date === q).slice(0, 6);
    if (debts.length) out.push('<div class="sr-group">Qarzlar</div>' + debts.map(r =>
      '<div class="sr-item" data-action="debt-view" data-id="' + r.d.id + '"><span>' +
      GC.esc(r.customer ? r.customer.c.name : '—') + ' <span class="muted">' + GC.fmtDate(r.d.date) + '</span></span>' +
      '<b>' + money(r.remain) + '</b></div>').join(''));

    const prods = st.products.filter(x => x.p.name.toLowerCase().includes(q) || (x.p.barcode || '').includes(q)).slice(0, 6);
    if (prods.length) out.push('<div class="sr-group">Mahsulotlar</div>' + prods.map(x =>
      '<div class="sr-item" data-action="prod-history" data-id="' + x.p.id + '"><span>' + GC.esc(x.p.name) +
      ' <span class="muted">' + x.qty + ' ' + GC.esc(x.p.unit) + '</span></span><b>' + money(x.p.salePrice) + '</b></div>').join(''));

    const pays = S.payments.filter(p => !p.canceled && (!isNaN(num) && String(p.amount).startsWith(String(num)) || p.date === q)).slice(0, 4);
    if (pays.length) out.push('<div class="sr-group">To‘lovlar</div>' + pays.map(p => {
      const c = st.custById.get(p.customerId);
      return '<div class="sr-item" data-action="pay-receipt" data-id="' + p.id + '"><span>' + GC.esc(c ? c.c.name : '—') +
        ' <span class="muted">' + GC.fmtDate(p.date) + '</span></span><b style="color:var(--ok)">' + money(p.amount) + '</b></div>';
    }).join(''));

    resEl.innerHTML = out.length ? out.join('') : '<div class="sr-group">Hech narsa topilmadi</div>';
    resEl.hidden = false;
  }
  searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => globalSearch(searchEl.value), 160);
  });
  searchEl.addEventListener('focus', () => { if (searchEl.value) globalSearch(searchEl.value); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) resEl.hidden = true;
    else if (e.target.closest('.sr-item')) { resEl.hidden = true; searchEl.value = ''; }
  });

  /* ---------------- Klaviatura ---------------- */
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input,textarea,select')) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'q') { e.preventDefault(); GC.actions['new-debt']({ dataset: {} }); }
    else if (k === 't') { e.preventDefault(); GC.actions['new-payment']({ dataset: {} }); }
    else if (k === 'm') { e.preventDefault(); location.hash = '#/pos'; }
    else if (k === '/') { e.preventDefault(); searchEl.focus(); }
  });

  /* ---------------- Eksport ---------------- */
  GC.actions['export'] = (el) => {
    const kind = el.dataset.kind, what = el.dataset.what;
    const S = GC.state, st = GC.compute();
    const M = (n) => GC.groupNum(n);
    let rows = [], headers = [], name = '';

    if (what === 'debts') {
      name = 'Qarzlar_' + GC.todayISO();
      rows = st.debtRows;
      headers = [
        { label: 'ID', get: r => r.d.id.slice(-6).toUpperCase() },
        { label: 'Mijoz', get: r => r.customer ? r.customer.c.name : '' },
        { label: 'Telefon', get: r => r.customer ? GC.fmtPhone(r.customer.c.phone) : '' },
        { label: 'Qarz', get: r => M(r.d.amount) }, { label: 'To‘langan', get: r => M(r.paid) },
        { label: 'Qolgan', get: r => M(r.remain) }, { label: 'Sana', get: r => GC.fmtDate(r.d.date) },
        { label: 'Muddat', get: r => r.d.dueDate ? GC.fmtDate(r.d.dueDate) : '' },
        { label: 'Holat', get: r => ({ paid: 'To‘langan', open: 'To‘lanmagan', partial: 'Qisman', due_today: 'Bugun to‘lanadi', overdue: 'Muddati o‘tgan' })[r.status] },
        { label: 'Sabab', get: r => r.d.reason || '' }, { label: 'Kassir', get: r => r.d.cashier || '' }];
    } else if (what === 'customers') {
      name = 'Mijozlar_' + GC.todayISO();
      rows = st.customers;
      headers = [
        { label: 'Ism', get: r => r.c.name }, { label: 'Telefon', get: r => GC.fmtPhone(r.c.phone) },
        { label: 'Telegram', get: r => r.c.telegram || '' }, { label: 'Jami qarz', get: r => M(r.total) },
        { label: 'To‘langan', get: r => M(r.paid) }, { label: 'Qolgan', get: r => M(r.remain) },
        { label: 'Muddati o‘tgan', get: r => M(r.overdue) },
        { label: 'Oxirgi qarz', get: r => r.lastDebt ? GC.fmtDate(r.lastDebt) : '' },
        { label: 'Oxirgi to‘lov', get: r => r.lastPay ? GC.fmtDate(r.lastPay) : '' },
        { label: 'Holat', get: r => ({ clear: 'Qarzi yo‘q', debt: 'Qarz mavjud', overdue: 'Muddati o‘tgan' })[r.status] }];
    } else if (what === 'payments') {
      name = 'Tolovlar_' + GC.todayISO();
      rows = S.payments.filter(p => !p.canceled);
      headers = [
        { label: 'Sana', get: p => GC.fmtDate(p.date) },
        { label: 'Mijoz', get: p => { const c = st.custById.get(p.customerId); return c ? c.c.name : ''; } },
        { label: 'Summa', get: p => M(p.amount) }, { label: 'Turi', get: p => GC.methodName(p.method) },
        { label: 'Izoh', get: p => p.note || '' }, { label: 'Kassir', get: p => p.cashier || '' }];
    } else if (what === 'sales') {
      name = 'Sotuvlar_' + GC.todayISO();
      rows = S.sales.filter(s => !s.canceled);
      headers = [
        { label: 'Sana', get: s => GC.fmtDate(s.date) },
        { label: 'Mahsulotlar', get: s => S.sale_items.filter(i => i.saleId === s.id).map(i => i.name + '×' + i.qty).join(', ') },
        { label: 'Jami', get: s => M(s.total) }, { label: 'Tannarx', get: s => M(s.cost) },
        { label: 'Foyda', get: s => M(s.total - s.cost) }, { label: 'To‘lov', get: s => GC.methodName(s.method) },
        { label: 'Mijoz', get: s => { const c = s.customerId ? st.custById.get(s.customerId) : null; return c ? c.c.name : ''; } },
        { label: 'Kassir', get: s => s.cashier || '' }];
    } else if (what === 'products') {
      name = 'Mahsulotlar_' + GC.todayISO();
      rows = st.products;
      headers = [
        { label: 'Nomi', get: x => x.p.name },
        { label: 'Kategoriya', get: x => { const c = S.categories.find(y => y.id === x.p.categoryId); return c ? c.name : ''; } },
        { label: 'Tannarx', get: x => M(x.p.costPrice) }, { label: 'Sotish narxi', get: x => M(x.p.salePrice) },
        { label: 'Qoldiq', get: x => x.qty }, { label: 'Birlik', get: x => x.p.unit },
        { label: 'Minimal', get: x => x.p.minStock || 0 },
        { label: 'Ombor qiymati', get: x => M(x.costValue) },
        { label: 'Holat', get: x => ({ ok: 'Mavjud', low: 'Kam qolgan', out: 'Tugagan' })[x.status] }];
    } else if (what === 'cash') {
      name = 'Kassa_' + GC.todayISO();
      const r = GC.rangeFor(GC.ui.cash.range, GC.ui.cash.custom);
      rows = st.cashRows.filter(x => GC.inRange(x.date, r));
      headers = [{ label: 'Sana', get: x => GC.fmtDate(x.date) }, { label: 'Manba', get: x => x.src },
        { label: 'To‘lov turi', get: x => GC.methodName(x.method) }, { label: 'Summa', get: x => M(x.amount) }];
    } else if (what === 'audit') {
      name = 'Audit_' + GC.todayISO();
      rows = S.audit_logs.slice().reverse();
      headers = [{ label: 'Vaqt', get: a => GC.fmtDT(a.ts) }, { label: 'Amal', get: a => a.action },
        { label: 'Obyekt', get: a => a.entity }, { label: 'Tavsif', get: a => a.description },
        { label: 'Foydalanuvchi', get: a => a.user || '' }];
    } else if (what === 'report') {
      name = 'Hisobot_' + GC.todayISO();
      rows = st.customers.filter(c => c.total > 0);
      headers = [{ label: 'Mijoz', get: c => c.c.name }, { label: 'Telefon', get: c => GC.fmtPhone(c.c.phone) },
        { label: 'Jami qarz', get: c => M(c.total) }, { label: 'To‘langan', get: c => M(c.paid) },
        { label: 'Qolgan', get: c => M(c.remain) }, { label: 'Muddati o‘tgan', get: c => M(c.overdue) }];
    }
    GC.exportTable(kind, name, rows, headers);
  };

  /* ---------------- Ishga tushirish ---------------- */
  function boot() {
    const existed = GC.load();
    applyTheme();
    if (!existed) {
      GC.audit('create', 'system', null, 'Dastur birinchi marta ishga tushirildi');
      GC.persist();
    }
    GC.Backup.init().then(() => updateChrome());
    route();

    // Xush kelibsiz oynasi — faqat birinchi ishga tushirishda
    if (!existed) {
      setTimeout(() => {
        GC.modal({
          title: '🎮 Xush kelibsiz!',
          body: '<div class="confirm-text">' +
            '<b>Qarz Daftar</b> — Game Club uchun qarz, magazin, ombor va kassa boshqaruv tizimi.<br><br>' +
            'Ishni boshlash uchun:<br>' +
            '1️⃣ <b>Sozlamalar</b> → klub nomini kiriting va <b>backup papkasini tanlang</b> (ma’lumot yo‘qolmasligi uchun)<br>' +
            '2️⃣ <b>Mijozlar</b> → mijozlarni qo‘shing<br>' +
            '3️⃣ <b>Qarzlar</b> → qarz yozing, to‘lov qabul qiling<br>' +
            '4️⃣ <b>Mahsulotlar</b> → magazin mahsulotlarini kiriting<br><br>' +
            '<span class="muted">Tezkor tugmalar: <b>Q</b> — qarz, <b>T</b> — to‘lov, <b>M</b> — magazin, <b>/</b> — qidiruv</span></div>',
          footer: '<button class="btn btn-primary" data-action="pick-folder" data-mclose>📁 Backup papkasini tanlash</button>' +
            '<button class="btn" data-mclose>Keyinroq</button>'
        });
      }, 400);
    }

    // PWA service worker (faqat http/https da ishlaydi)
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
