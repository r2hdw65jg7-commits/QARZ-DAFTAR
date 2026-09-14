/* =========================================================================
   Qarz Daftar — KASSA, HISOBOTLAR, AUDIT, SOZLAMALAR (BACKUP)
   ========================================================================= */
(function () {
  'use strict';
  const GC = window.GC;
  const esc = GC.esc, money = GC.money, fmtDate = GC.fmtDate;
  const UI = GC.ui;
  UI.reports = { tab: 'day', custom: { from: GC.addDays(GC.todayISO(), -29), to: GC.todayISO() } };
  UI.audit = { q: '', page: 1, type: 'all' };
  UI.cash = { range: 'today', custom: { from: '', to: '' } };

  /* =================== KASSA =================== */
  GC.views.cash = function () {
    const st = GC.compute(), f = UI.cash;
    const r = GC.rangeFor(f.range, f.custom);
    const rows = st.cashRows.filter(x => GC.inRange(x.date, r)).sort((a, b) => (a.date < b.date ? 1 : -1));
    const total = rows.reduce((s, x) => s + x.amount, 0);
    const byM = {};
    GC.PAY_METHODS.forEach(m => byM[m.id] = rows.filter(x => x.method === m.id).reduce((s, x) => s + x.amount, 0));
    const fromSales = rows.filter(x => x.src === 'sotuv').reduce((s, x) => s + x.amount, 0);
    const fromDebts = rows.filter(x => x.src !== 'sotuv').reduce((s, x) => s + x.amount, 0);
    const chip = (val, label) => '<button class="chip' + (f.range === val ? ' active' : '') +
      '" data-action="cash-range" data-val="' + val + '">' + esc(label) + '</button>';

    return '<div class="page-head"><div><div class="page-title">Kassa</div>' +
      '<div class="page-sub">' + r.label + ' · Jami tushum: <b>' + money(total) + '</b></div></div><div class="spacer"></div>' +
      GC.exportBar('cash') + '</div>' +
      '<div class="chips" style="margin-bottom:14px">' + chip('today', 'Bugun') + chip('yesterday', 'Kecha') +
      chip('week', 'Shu hafta') + chip('month', 'Shu oy') + chip('all', 'Barcha vaqt') + '</div>' +
      '<div class="cards">' +
      GC.statCard('Jami kassa tushumi', money(total), r.label, 'ok', '🏦') +
      GC.statCard('Magazin sotuvidan', money(fromSales), 'Naqd va boshqa to‘lovlar', '', '🛒') +
      GC.statCard('Qarz to‘lovlaridan', money(fromDebts), 'Mijozlar qaytargan', 'info', '💵') +
      GC.PAY_METHODS.map(m => GC.statCard(m.name, money(byM[m.id]), '', '', '💳')).join('') +
      '</div>' +
      '<div class="panel"><div class="panel-head"><div class="panel-title">Kassa harakatlari</div></div>' +
      '<div class="panel-body tight"><div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>Sana</th><th>Manba</th><th>To‘lov turi</th><th class="num">Summa</th></tr></thead><tbody>' +
      (rows.length ? rows.slice(0, 300).map(x => '<tr><td class="mono">' + fmtDate(x.date) + '</td>' +
        '<td>' + (x.src === 'sotuv' ? '🛒 Magazin sotuvi' : '💵 Qarz to‘lovi') + '</td>' +
        '<td><span class="badge b-blue">' + esc(GC.methodName(x.method)) + '</span></td>' +
        '<td class="num strong" style="color:var(--ok)">+' + money(x.amount) + '</td></tr>').join('')
        : '<tr><td colspan="4"><div class="empty">Kassa harakatlari yo‘q</div></td></tr>') +
      '</tbody></table></div></div></div>' +
      '<div class="panel"><div class="panel-head"><div class="panel-title">ℹ️ Eslatma</div></div><div class="panel-body muted">' +
      'Qarzga berilgan sotuvlar kassaga tushmaydi — ular mijoz qarziga yoziladi. ' +
      'Mijoz qarzini to‘laganda summa kassaga tushadi.</div></div>';
  };

  /* =================== HISOBOTLAR =================== */
  function periodStats(from, to) {
    const S = GC.state;
    const inR = (d) => (!from || d >= from) && (!to || d <= to);
    const debts = S.debts.filter(d => !d.canceled && inR(d.date));
    const pays = S.payments.filter(p => !p.canceled && inR(p.date));
    const sales = S.sales.filter(s => !s.canceled && inR(s.date));
    const purch = S.purchases.filter(p => !p.canceled && inR(p.date));
    const newCust = S.customers.filter(c => inR(c.date || GC.dateToISO(new Date(c.createdAt || Date.now()))));
    const st = GC.compute();
    const closed = st.debtRows.filter(r => r.status === 'paid' && inR(r.d.date)).length;
    return {
      debtSum: debts.reduce((s, d) => s + d.amount, 0), debtCount: debts.length,
      paySum: pays.reduce((s, p) => s + p.amount, 0), payCount: pays.length,
      saleSum: sales.reduce((s, x) => s + x.total, 0), saleProfit: sales.reduce((s, x) => s + (x.total - x.cost), 0),
      saleCount: sales.length, purchaseSum: purch.reduce((s, p) => s + p.total, 0),
      debtors: new Set(debts.map(d => d.customerId)).size,
      newCustomers: newCust.length, closedDebts: closed
    };
  }

  GC.views.reports = function () {
    const S = GC.state, st = GC.compute(), f = UI.reports;
    const today = st.today;
    const tabs = [['day', 'Kunlik'], ['week', 'Haftalik'], ['month', 'Oylik'], ['custom', 'Tanlangan davr']];
    let from, to, label, series = [];

    if (f.tab === 'day') {
      from = today; to = today; label = 'Bugun · ' + fmtDate(today);
      for (let i = 13; i >= 0; i--) {
        const iso = GC.addDays(today, -i), d = GC.isoToDate(iso);
        series.push({ iso, label: d.getDate() + '.' + (d.getMonth() + 1) });
      }
    } else if (f.tab === 'week') {
      const r = GC.rangeFor('week'); from = r.from; to = r.to; label = 'Shu hafta · ' + fmtDate(from) + ' — ' + fmtDate(to);
      for (let i = 6; i >= 0; i--) {
        const iso = GC.addDays(today, -i), d = GC.isoToDate(iso);
        series.push({ iso, label: GC.WEEK[d.getDay()].slice(0, 3) });
      }
    } else if (f.tab === 'month') {
      const r = GC.rangeFor('month'); from = r.from; to = r.to; label = 'Shu oy · ' + GC.MONTHS[GC.isoToDate(today).getMonth()];
      const days = GC.isoToDate(today).getDate();
      for (let i = days - 1; i >= 0; i--) {
        const iso = GC.addDays(today, -i), d = GC.isoToDate(iso);
        series.push({ iso, label: String(d.getDate()) });
      }
    } else {
      from = f.custom.from; to = f.custom.to; label = fmtDate(from) + ' — ' + fmtDate(to);
      let cur = from, guard = 0;
      while (cur <= to && guard++ < 120) {
        const d = GC.isoToDate(cur);
        series.push({ iso: cur, label: d.getDate() + '.' + (d.getMonth() + 1) });
        cur = GC.addDays(cur, 1);
      }
    }

    const P = periodStats(from, to);
    const chartData = series.map(s => ({
      label: s.label,
      a: S.debts.filter(d => !d.canceled && d.date === s.iso).reduce((x, d) => x + d.amount, 0),
      b: S.payments.filter(p => !p.canceled && p.date === s.iso).reduce((x, p) => x + p.amount, 0)
    }));
    const salesLine = series.map(s => ({
      label: s.label,
      v: S.sales.filter(x => !x.canceled && x.date === s.iso).reduce((a, b) => a + b.total, 0)
    }));

    // TOP ro'yxatlar
    const topDebtors = st.customers.filter(c => c.remain > 0).sort((a, b) => b.remain - a.remain).slice(0, 10);
    const saleItems = S.sale_items.filter(i => {
      const s = S.sales.find(x => x.id === i.saleId);
      return s && !s.canceled && (!from || s.date >= from) && (!to || s.date <= to);
    });
    const byProd = {};
    saleItems.forEach(i => {
      byProd[i.productId] = byProd[i.productId] || { name: i.name, qty: 0, sum: 0, profit: 0 };
      byProd[i.productId].qty += i.qty;
      byProd[i.productId].sum += i.qty * i.price;
      byProd[i.productId].profit += (i.price - i.cost) * i.qty;
    });
    const prodList = Object.values(byProd);
    const topQty = prodList.slice().sort((a, b) => b.qty - a.qty).slice(0, 8);
    const topProfit = prodList.slice().sort((a, b) => b.profit - a.profit).slice(0, 8);

    return '<div class="page-head"><div><div class="page-title">Hisobotlar</div><div class="page-sub">' + esc(label) + '</div></div>' +
      '<div class="spacer"></div>' + GC.exportBar('report') + '</div>' +
      '<div class="chips" style="margin-bottom:14px">' +
      tabs.map(t => '<button class="chip' + (f.tab === t[0] ? ' active' : '') + '" data-action="rep-tab" data-val="' + t[0] + '">' + t[1] + '</button>').join('') +
      '</div>' +
      (f.tab === 'custom' ? '<div class="panel"><div class="panel-head"><div class="row"><span class="muted">Dan:</span>' +
        '<input type="date" class="input" style="width:auto" data-action="rep-date" data-k="from" value="' + esc(f.custom.from) + '">' +
        '<span class="muted">Gacha:</span><input type="date" class="input" style="width:auto" data-action="rep-date" data-k="to" value="' + esc(f.custom.to) + '"></div></div></div>' : '') +

      '<div class="cards">' +
      GC.statCard('Berilgan qarz', money(P.debtSum), P.debtCount + ' ta yozuv', 'dan', '📤') +
      GC.statCard('Qaytarilgan qarz', money(P.paySum), P.payCount + ' ta to‘lov', 'ok', '📥') +
      GC.statCard('Davr farqi', money(P.debtSum - P.paySum), P.debtSum >= P.paySum ? 'Qarz o‘sdi' : 'Qarz kamaydi', P.debtSum >= P.paySum ? 'warn' : 'ok', '⚖️') +
      GC.statCard('Qarzdorlar', P.debtors + ' ta', 'Davrda qarz olganlar', 'info', '👥') +
      GC.statCard('Yangi mijozlar', P.newCustomers + ' ta', '', '', '🆕') +
      GC.statCard('Yopilgan qarzlar', P.closedDebts + ' ta', 'To‘liq to‘langan', 'ok', '🏁') +
      GC.statCard('Magazin savdosi', money(P.saleSum), P.saleCount + ' ta chek', 'info', '🛒') +
      GC.statCard('Magazin foydasi', money(P.saleProfit), 'Sof foyda', 'ok', '💹') +
      GC.statCard('Omborga kirim', money(P.purchaseSum), 'Sotib olingan mahsulot', 'warn', '📦') +
      GC.statCard('Umumiy qoldiq qarz', money(st.totals.remain), 'Hozirgi holat', 'dan', '📕') +
      '</div>' +

      '<div class="grid2">' +
      '<div class="panel"><div class="panel-head"><div class="panel-title">📊 Qarz va to‘lovlar dinamikasi</div></div>' +
      '<div class="panel-body">' + GC.chart.bars(chartData) + '</div>' +
      '<div class="chart-legend"><span><i style="background:#ef4444"></i>Berilgan qarz</span><span><i style="background:#22c55e"></i>Qaytarilgan</span></div></div>' +
      '<div class="panel"><div class="panel-head"><div class="panel-title">📈 Magazin savdosi</div></div>' +
      '<div class="panel-body">' + GC.chart.line(salesLine) + '</div></div>' +
      '</div>' +

      '<div class="grid2">' +
      '<div class="panel"><div class="panel-head"><div class="panel-title">🏆 TOP qarzdorlar</div></div><div class="panel-body">' +
      (topDebtors.length ? GC.chart.hbars(topDebtors.map(c => ({ label: c.c.name, value: c.remain })))
        : '<div class="empty">Qarzdorlar yo‘q</div>') + '</div></div>' +
      '<div class="panel"><div class="panel-head"><div class="panel-title">🔥 Eng ko‘p sotilgan mahsulotlar</div></div><div class="panel-body">' +
      (topQty.length ? GC.chart.hbars(topQty.map(p => ({ label: p.name, value: p.qty, display: p.qty + ' dona' })))
        : '<div class="empty">Sotuvlar yo‘q</div>') + '</div></div>' +
      '</div>' +

      '<div class="panel"><div class="panel-head"><div class="panel-title">💰 Eng ko‘p foyda keltirgan mahsulotlar</div></div>' +
      '<div class="panel-body">' + (topProfit.length ? GC.chart.hbars(topProfit.map(p => ({ label: p.name, value: p.profit })))
        : '<div class="empty">Ma’lumot yo‘q</div>') + '</div></div>';
  };

  /* =================== AUDIT / TARIX =================== */
  GC.views.audit = function () {
    const S = GC.state, f = UI.audit;
    let rows = S.audit_logs.slice().reverse();
    if (f.type !== 'all') rows = rows.filter(a => a.entity === f.type);
    if (f.q) {
      const q = f.q.toLowerCase();
      rows = rows.filter(a => (a.description || '').toLowerCase().includes(q) || (a.user || '').toLowerCase().includes(q));
    }
    const pg = GC.paginate(rows, f.page, 50);
    const ACT = { create: ['Qo‘shildi', 'b-green'], update: ['Tahrirlandi', 'b-blue'], delete: ['O‘chirildi', 'b-red'],
      cancel: ['Bekor qilindi', 'b-yellow'], stock: ['Ombor', 'b-blue'], inventory: ['Inventarizatsiya', 'b-yellow'],
      restore: ['Tiklandi', 'b-red'], archive: ['Arxivlandi', 'b-gray'], info: ['Ma’lumot', 'b-gray'], settings: ['Sozlama', 'b-gray'] };
    const chip = (val, label) => '<button class="chip' + (f.type === val ? ' active' : '') +
      '" data-action="audit-type" data-val="' + val + '">' + esc(label) + '</button>';

    return '<div class="page-head"><div><div class="page-title">Tarix / Audit log</div>' +
      '<div class="page-sub">' + rows.length + ' ta yozuv · Barcha moliyaviy harakatlar saqlanadi va o‘chirilmaydi</div></div>' +
      '<div class="spacer"></div>' + GC.exportBar('audit') + '</div>' +
      '<div class="panel"><div class="panel-head"><div class="chips">' +
      chip('all', 'Barchasi') + chip('debt', 'Qarzlar') + chip('payment', 'To‘lovlar') + chip('customer', 'Mijozlar') +
      chip('product', 'Mahsulotlar') + chip('sale', 'Sotuvlar') + chip('purchase', 'Kirimlar') + chip('system', 'Tizim') +
      '</div><div class="spacer"></div><input class="input" style="max-width:260px" placeholder="Qidirish…" data-action="audit-search" value="' + esc(f.q) + '"></div>' +
      '<div class="panel-body tight"><div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>Vaqt</th><th>Amal</th><th>Tavsif</th><th>Foydalanuvchi</th></tr></thead><tbody>' +
      (pg.rows.length ? pg.rows.map(a => {
        const t = ACT[a.action] || [a.action, 'b-gray'];
        return '<tr><td class="mono muted">' + GC.fmtDT(a.ts) + '</td>' +
          '<td><span class="badge ' + t[1] + '">' + t[0] + '</span></td>' +
          '<td>' + esc(a.description) + '</td><td class="muted">' + esc(a.user || '') + '</td></tr>';
      }).join('') : '<tr><td colspan="4"><div class="empty">Yozuvlar yo‘q</div></td></tr>') +
      '</tbody></table></div>' + GC.pagerHTML(pg, 'audit') + '</div></div>';
  };

  /* =================== SOZLAMALAR =================== */
  GC.views.settings = function () {
    const S = GC.state, B = GC.Backup.status;
    const dotClass = !B.connected ? '' : (B.lastStatus === 'err' ? 'err' : B.lastStatus === 'ok' ? 'ok' : 'warn');
    const statusText = !B.supported ? 'Bu brauzer avto backupni qo‘llab-quvvatlamaydi'
      : !B.connected ? 'Backup papkasi tanlanmagan'
      : B.lastStatus === 'err' ? 'Xato: ' + esc(B.lastError)
      : B.lastStatus === 'ok' ? 'Muvaffaqiyatli' : 'Kutilmoqda';
    const logs = S.backup_logs.slice().reverse().slice(0, 12);

    return '<div class="page-head"><div><div class="page-title">Sozlamalar</div>' +
      '<div class="page-sub">Klub ma’lumotlari, backup va tizim sozlamalari</div></div></div>' +

      '<div class="grid2">' +
      /* --- Backup --- */
      '<div class="panel"><div class="panel-head"><div class="panel-title">💾 Avto Backup</div>' +
      '<div class="spacer"></div><span class="backup-chip"><span class="dot ' + dotClass + '"></span>' + statusText + '</span></div>' +
      '<div class="panel-body">' +
      '<div class="kv"><span class="k">Avto Backup</span><span class="v"><label class="switch">' +
      '<input type="checkbox" data-action="toggle-autobackup"' + (S.settings.autoBackup ? ' checked' : '') + '><span class="slider"></span></label></span></div>' +
      '<div class="kv"><span class="k">Backup papkasi</span><span class="v">' + (B.folderName ? esc(B.folderName) : '<span class="muted">Tanlanmagan</span>') + '</span></div>' +
      '<div class="kv"><span class="k">Backup fayli</span><span class="v mono">' + GC.Backup.FILE_MAIN + '</span></div>' +
      '<div class="kv"><span class="k">Oxirgi backup</span><span class="v">' + (B.lastAt ? GC.fmtDT(B.lastAt) : '—') + '</span></div>' +
      '<div class="kv"><span class="k">Backup hajmi</span><span class="v">' + (B.lastSize ? GC.fmtSize(B.lastSize) : '—') + '</span></div>' +
      '<div class="kv"><span class="k">Rejim</span><span class="v">' + (B.mode === 'native' ? 'Windows dasturi (to‘liq)' : B.mode === 'fs' ? 'Brauzer (File System Access)' : 'Qo‘llab-quvvatlanmaydi') + '</span></div>' +
      '<div class="row" style="margin-top:14px">' +
      '<button class="btn btn-primary" data-action="pick-folder">📁 ' + (B.folderName ? 'Papkani o‘zgartirish' : 'Papkani tanlash') + '</button>' +
      (B.folderName && !B.connected ? '<button class="btn btn-warn" data-action="restore-perm">🔓 Ruxsatni tiklash</button>' : '') +
      '<button class="btn btn-success" data-action="backup-now">💾 Hozir backup qilish</button>' +
      '<button class="btn" data-action="backup-check">🔍 Backupni tekshirish</button>' +
      '<button class="btn btn-warn" data-action="backup-restore">♻️ Backupdan tiklash</button>' +
      '</div>' +
      '<div class="hint muted" style="margin-top:10px;font-size:11.5px">Papka bir marta tanlanadi va eslab qolinadi. ' +
      'Har bir o‘zgarishdan keyin <b>' + GC.Backup.FILE_MAIN + '</b> fayli avtomatik yangilanadi (yangi fayl yaratilmaydi). ' +
      'Yozish atomik: avval .tmp fayl yoziladi, tekshiriladi, keyin almashtiriladi.</div>' +
      '</div></div>' +

      /* --- Klub --- */
      '<div class="panel"><div class="panel-head"><div class="panel-title">🎮 Klub ma’lumotlari</div></div>' +
      '<div class="panel-body">' +
      '<div class="field"><label>Klub nomi (chekda chiqadi)</label><input class="input" data-set="clubName" value="' + esc(S.settings.clubName) + '"></div>' +
      '<div class="grid2"><div class="field"><label>Manzil</label><input class="input" data-set="address" value="' + esc(S.settings.address || '') + '"></div>' +
      '<div class="field"><label>Telefon</label><input class="input" data-set="phone" value="' + esc(S.settings.phone || '') + '"></div></div>' +
      '<div class="field"><label>Chek pastki yozuvi</label><input class="input" data-set="receiptFooter" value="' + esc(S.settings.receiptFooter || '') + '"></div>' +
      '<div class="grid2"><div class="field"><label>Standart to‘lash muddati (kun)</label>' +
      '<input class="input" type="number" min="0" data-set="defaultDueDays" value="' + (S.settings.defaultDueDays || 7) + '"></div>' +
      '<div class="field"><label>Backup kechikishi (ms)</label><input class="input" type="number" min="200" step="100" data-set="backupDebounceMs" value="' + (S.settings.backupDebounceMs || 1500) + '"></div></div>' +
      '<div class="kv"><span class="k">Manfiy qoldiq bilan sotishga ruxsat</span><span class="v"><label class="switch">' +
      '<input type="checkbox" data-action="toggle-negstock"' + (S.settings.allowNegativeStock ? ' checked' : '') + '><span class="slider"></span></label></span></div>' +
      '<div class="kv"><span class="k">Mavzu (tema)</span><span class="v"><button class="btn btn-sm" data-action="toggle-theme">' +
      (S.settings.theme === 'dark' ? '🌙 Tungi' : '☀️ Kunduzgi') + '</button></span></div>' +
      '</div></div></div>' +

      /* --- Kassirlar --- */
      '<div class="grid2">' +
      '<div class="panel"><div class="panel-head"><div class="panel-title">👤 Kassirlar</div><div class="spacer"></div>' +
      '<button class="btn btn-sm btn-primary" data-action="add-cashier">+ Kassir</button></div><div class="panel-body">' +
      (S.settings.cashiers || []).map(c => '<div class="kv"><span class="k">' + esc(c) +
        (c === S.settings.cashier ? ' <span class="badge b-green">Faol</span>' : '') + '</span><span class="v">' +
        (c !== S.settings.cashier ? '<button class="btn btn-sm" data-action="set-cashier" data-name="' + esc(c) + '">Tanlash</button> ' +
          '<button class="btn btn-sm btn-danger" data-action="del-cashier" data-name="' + esc(c) + '">🗑</button>' : '') + '</span></div>').join('') +
      '</div></div>' +

      /* --- Ma'lumotlar --- */
      '<div class="panel"><div class="panel-head"><div class="panel-title">🗄 Ma’lumotlar</div></div><div class="panel-body">' +
      '<div class="kv"><span class="k">Mijozlar</span><span class="v">' + S.customers.length + '</span></div>' +
      '<div class="kv"><span class="k">Qarzlar</span><span class="v">' + S.debts.length + '</span></div>' +
      '<div class="kv"><span class="k">To‘lovlar</span><span class="v">' + S.payments.length + '</span></div>' +
      '<div class="kv"><span class="k">Mahsulotlar</span><span class="v">' + S.products.length + '</span></div>' +
      '<div class="kv"><span class="k">Sotuvlar</span><span class="v">' + S.sales.length + '</span></div>' +
      '<div class="kv"><span class="k">Audit yozuvlari</span><span class="v">' + S.audit_logs.length + '</span></div>' +
      '<div class="row" style="margin-top:14px">' +
      '<button class="btn" data-action="export-db">⬇️ Export (JSON)</button>' +
      '<button class="btn" data-action="import-db">⬆️ Import (JSON)</button>' +
      '<button class="btn btn-danger" data-action="reset-db">🧨 Bazani tozalash</button></div>' +
      '<div class="hint muted" style="margin-top:8px;font-size:11.5px">Export fayli backup fayli bilan bir xil formatda — ' +
      'uni boshqa kompyuterda import qilish mumkin.</div>' +
      '</div></div></div>' +

      /* --- Backup log --- */
      '<div class="panel"><div class="panel-head"><div class="panel-title">📋 Backup tarixi</div></div>' +
      '<div class="panel-body tight"><div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>Sana</th><th>Amal</th><th>Holat</th><th class="num">Hajm</th><th>Izoh</th></tr></thead><tbody>' +
      (logs.length ? logs.map(l => '<tr><td class="mono">' + GC.fmtDT(l.ts) + '</td>' +
        '<td>' + (l.type === 'auto' ? 'Auto Backup' : l.type === 'manual' ? 'Manual Backup' : 'Safety Backup') + '</td>' +
        '<td>' + (l.status === 'ok' ? '<span class="badge b-green">Muvaffaqiyatli</span>' : '<span class="badge b-red">Xato</span>') + '</td>' +
        '<td class="num">' + GC.fmtSize(l.size) + '</td><td class="muted">' + esc(l.message || '') + '</td></tr>').join('')
        : '<tr><td colspan="5"><div class="empty">Backup tarixi bo‘sh</div></td></tr>') +
      '</tbody></table></div></div></div>';
  };

  /* =================== AMALLAR =================== */
  const A = GC.actions;
  A['cash-range'] = (el) => { UI.cash.range = el.dataset.val; GC.rerender(); };
  A['rep-tab'] = (el) => { UI.reports.tab = el.dataset.val; GC.rerender(); };
  A['audit-type'] = (el) => { UI.audit.type = el.dataset.val; UI.audit.page = 1; GC.rerender(); };
  GC.inputHandlers['audit-search'] = (el) => { UI.audit.q = el.value; UI.audit.page = 1; GC.rerender(true); };
  GC.inputHandlers['rep-date'] = (el) => { UI.reports.custom[el.dataset.k] = el.value; GC.rerender(true); };

  /* --- Sozlama inputlari --- */
  GC.settingsInput = (el) => {
    const k = el.dataset.set;
    let v = el.value;
    if (k === 'defaultDueDays' || k === 'backupDebounceMs') v = Math.max(k === 'backupDebounceMs' ? 200 : 0, parseInt(v, 10) || 0);
    GC.state.settings[k] = v;
    GC.save({ render: false });
    if (k === 'clubName') document.getElementById('brandName').textContent = v || 'GAME CLUB';
  };
  A['toggle-autobackup'] = (el) => {
    GC.state.settings.autoBackup = el.checked;
    GC.audit('settings', 'system', null, 'Avto Backup ' + (el.checked ? 'yoqildi' : 'o‘chirildi'));
    GC.save();
    GC.toast('Avto Backup ' + (el.checked ? '🟢 yoqildi' : '🔴 o‘chirildi'), el.checked ? 'ok' : 'warn');
  };
  A['toggle-negstock'] = (el) => {
    GC.state.settings.allowNegativeStock = el.checked;
    GC.audit('settings', 'system', null, 'Manfiy qoldiq bilan sotish ' + (el.checked ? 'yoqildi' : 'o‘chirildi'));
    GC.save();
  };
  A['add-cashier'] = () => {
    const name = prompt('Kassir ismi:');
    if (!name || !name.trim()) return;
    const S = GC.state;
    S.settings.cashiers = S.settings.cashiers || [];
    if (S.settings.cashiers.includes(name.trim())) { GC.toast('Bunday kassir mavjud', 'warn'); return; }
    S.settings.cashiers.push(name.trim());
    GC.audit('settings', 'system', null, 'Kassir qo‘shildi: ' + name.trim());
    GC.save(); GC.toast('Kassir qo‘shildi', 'ok');
  };
  A['set-cashier'] = (el) => {
    GC.state.settings.cashier = el.dataset.name;
    GC.save(); GC.toast('Faol kassir: ' + el.dataset.name, 'ok');
  };
  A['del-cashier'] = (el) => {
    const S = GC.state;
    S.settings.cashiers = (S.settings.cashiers || []).filter(c => c !== el.dataset.name);
    GC.audit('settings', 'system', null, 'Kassir o‘chirildi: ' + el.dataset.name);
    GC.save();
  };
  A['open-cashier'] = () => { location.hash = '#/settings'; };
  A['goto-backup'] = () => { location.hash = '#/settings'; };

  /* --- Backup amallari --- */
  A['pick-folder'] = () => GC.Backup.chooseFolder().then(() => GC.rerender());
  A['restore-perm'] = () => GC.Backup.restorePermission().then(() => GC.rerender());
  A['backup-now'] = () => GC.Backup.run('manual').then(() => GC.rerender());
  A['backup-check'] = () => GC.Backup.check().then(() => GC.rerender());

  async function applyRestore(obj, sourceLabel) {
    const v = GC.validateBackup(obj);
    if (!v.ok) { GC.toast('🔴 Backup yaroqsiz: ' + v.reason, 'err', 6000); return; }
    const ok = await GC.confirm({
      title: '⚠️ Diqqat!', danger: true, okText: 'Davom etish',
      html: '<b>Backupdan tiklash joriy ma’lumotlarni almashtiradi.</b><br><br>' +
        'Manba: ' + esc(sourceLabel) + '<br>' +
        'Mijozlar: <b>' + v.stats.customers + '</b> · Qarzlar: <b>' + v.stats.debts + '</b> · To‘lovlar: <b>' + v.stats.payments + '</b><br>' +
        'Mahsulotlar: <b>' + v.stats.products + '</b> · Sotuvlar: <b>' + v.stats.sales + '</b><br>' +
        (v.stats.exportedAt ? 'Yaratilgan: ' + GC.fmtDT(v.stats.exportedAt) + '<br>' : '') +
        '<br><span class="muted">Tiklashdan oldin joriy baza avtomatik zaxiraga olinadi.</span>'
    });
    if (!ok) return;
    await GC.Backup.safetyBackup();
    GC.importJSON(obj);
    GC.Backup.schedule();
    GC.rerender();
    GC.toast('✅ Ma’lumotlar backupdan tiklandi', 'ok', 5000);
  }

  A['backup-restore'] = async () => {
    const B = GC.Backup.status;
    const fileInput = () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.db,.json,application/json';
      inp.onchange = () => {
        const f = inp.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          try { applyRestore(JSON.parse(rd.result), f.name); }
          catch (e) { GC.toast('🔴 Fayl o‘qilmadi yoki buzilgan', 'err', 5000); }
        };
        rd.readAsText(f);
      };
      inp.click();
    };
    if (B.connected) {
      const m = GC.modal({
        title: '♻️ Backupdan tiklash',
        body: '<div class="confirm-text">Qaysi manbadan tiklaymiz?</div>',
        footer: '<button class="btn" data-file>📂 Fayl tanlash</button>' +
          '<button class="btn btn-primary" data-main>💾 ' + GC.Backup.FILE_MAIN + '</button>' +
          '<button class="btn" data-mclose>Bekor</button>'
      });
      m.q('[data-file]').onclick = () => { m.close(); fileInput(); };
      m.q('[data-main]').onclick = async () => {
        m.close();
        const r = await GC.Backup.readMainBackup();
        if (!r) { GC.toast('🔴 Backup fayli topilmadi', 'err'); return; }
        try { applyRestore(JSON.parse(r.text), GC.Backup.FILE_MAIN + ' (' + GC.fmtSize(r.size) + ')'); }
        catch (e) { GC.toast('🔴 Backup fayli buzilgan', 'err'); }
      };
    } else fileInput();
  };

  A['export-db'] = () => {
    GC.download('GameClub_Export_' + GC.todayISO() + '.db', GC.exportJSON(), 'application/json');
    GC.toast('Ma’lumotlar eksport qilindi', 'ok');
  };
  A['import-db'] = () => A['backup-restore']();
  A['reset-db'] = async () => {
    const ok = await GC.confirm({
      title: '🧨 Bazani tozalash', danger: true, okText: 'Hammasini o‘chirish',
      html: '<b>Barcha mijozlar, qarzlar, to‘lovlar, mahsulotlar va sotuvlar o‘chiriladi!</b><br>' +
        '<span class="muted">Avval joriy baza zaxiraga olinadi. Bu amalni qaytarib bo‘lmaydi.</span>'
    });
    if (!ok) return;
    await GC.Backup.safetyBackup();
    const settings = GC.state.settings;
    const fresh = GC.defaultState();
    fresh.settings = settings;
    GC.setState(fresh);
    GC.audit('delete', 'system', null, 'Baza to‘liq tozalandi');
    GC.save();
    GC.toast('Baza tozalandi (zaxira nusxa saqlandi)', 'ok');
  };
})();
