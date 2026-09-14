/* =========================================================================
   Qarz Daftar — QARZ MODULI
   Bosh sahifa, Qarzlar, Mijozlar, To'lovlar
   ========================================================================= */
(function () {
  'use strict';
  const GC = window.GC;
  const esc = GC.esc, money = GC.money, fmtDate = GC.fmtDate;

  const UI = GC.ui = GC.ui || {};
  UI.debts = { filter: 'all', range: 'all', custom: { from: '', to: '' }, sort: 'new', page: 1, q: '' };
  UI.customers = { filter: 'all', sort: 'remain', page: 1, q: '' };
  UI.payments = { range: 'all', method: 'all', page: 1, q: '', custom: { from: '', to: '' } };
  const PER = 25;

  /* =================== BOSH SAHIFA =================== */
  GC.views.dashboard = function () {
    const st = GC.compute(), T = st.totals, sh = st.shop, stk = st.stock;
    const S = GC.state;

    const top = st.customers.filter(c => c.remain > 0).sort((a, b) => b.remain - a.remain).slice(0, 5);
    const overdueRows = st.debtRows.filter(r => r.status === 'overdue').sort((a, b) => b.dueDays - a.dueDays).slice(0, 6);

    // oxirgi 14 kunlik grafik
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const iso = GC.addDays(st.today, -i);
      const d = GC.isoToDate(iso);
      days.push({
        iso,
        label: d.getDate() + '.' + (d.getMonth() + 1),
        a: S.debts.filter(x => !x.canceled && x.date === iso).reduce((s, x) => s + x.amount, 0),
        b: S.payments.filter(x => !x.canceled && x.date === iso).reduce((s, x) => s + x.amount, 0)
      });
    }
    const acts = S.audit_logs.slice(-12).reverse();

    return '' +
      '<div class="page-head"><div><div class="page-title">Bosh sahifa</div>' +
      '<div class="page-sub">' + esc(S.settings.clubName) + ' · ' + GC.WEEK[GC.isoToDate(st.today).getDay()] + ', ' + fmtDate(st.today) + '</div></div>' +
      '<div class="spacer"></div>' +
      '<button class="btn btn-primary" data-action="new-debt">+ Qarz qo‘shish</button>' +
      '<button class="btn btn-success" data-action="new-payment">+ To‘lov qabul qilish</button></div>' +

      '<div class="cards">' +
      GC.statCard('Jami qarzdorlik', money(T.debt), 'Barcha vaqtdagi yozilgan qarz', '', '📕') +
      GC.statCard('Qaytarilgan', money(T.paid), 'Jami to‘langan summa', 'ok', '✅') +
      GC.statCard('Qolgan qarz', money(T.remain), 'Hozirgi real qarzdorlik', 'dan', '⏳') +
      GC.statCard('Bugun berilgan qarz', money(T.todayDebt), fmtDate(st.today), 'warn', '📤') +
      GC.statCard('Bugun qaytarilgan', money(T.todayPaid), fmtDate(st.today), 'ok', '📥') +
      GC.statCard('Qarzdor mijozlar', T.debtorCount + ' ta', 'Jami mijoz: ' + S.customers.length, 'info', '👥') +
      GC.statCard('Muddati o‘tgan', money(T.overdue), T.overdueCount + ' ta qarz kechikkan', 'dan', '🔴') +
      GC.statCard('Bugun to‘lanishi kerak', money(T.dueToday), 'Muddati bugun tugaydi', 'warn', '📅') +
      GC.statCard('To‘liq yopilgan qarzlar', T.closedDebts + ' ta', T.clearCount + ' mijoz qarzdan chiqdi', 'ok', '🏁') +
      '</div>' +

      '<div class="grid2">' +
      '<div class="panel"><div class="panel-head"><div class="panel-title">📈 Oxirgi 14 kun: qarz va to‘lovlar</div></div>' +
      '<div class="panel-body">' + GC.chart.bars(days) + '</div>' +
      '<div class="chart-legend"><span><i style="background:#ef4444"></i>Berilgan qarz</span><span><i style="background:#22c55e"></i>Qaytarilgan</span></div></div>' +

      '<div class="panel"><div class="panel-head"><div class="panel-title">🏆 Eng katta qarzdorlar</div>' +
      '<div class="spacer"></div><a class="btn btn-sm" href="#/customers">Barchasi</a></div>' +
      '<div class="panel-body">' + (top.length
        ? GC.chart.hbars(top.map(c => ({ label: c.c.name, value: c.remain })))
        : '<div class="empty"><div class="big">🎉</div>Qarzdor mijozlar yo‘q</div>') + '</div></div>' +
      '</div>' +

      '<div class="cards">' +
      GC.statCard('Bugungi sotuv', money(sh.todayTotal), sh.todayCount + ' ta savdo · ' + sh.todayItems + ' dona', 'info', '🛒') +
      GC.statCard('Bugungi foyda', money(sh.todayProfit), 'Sof foyda (tannarxsiz)', 'ok', '💹') +
      GC.statCard('Ombor qiymati', money(stk.costValue), 'Sotuvda: ' + money(stk.saleValue), '', '🏬') +
      GC.statCard('Bugungi kirim', money(st.todayIn), 'Omborga qabul qilingan', 'warn', '📦') +
      GC.statCard('Kam qolgan mahsulot', stk.low + ' ta', 'Tugagan: ' + stk.out + ' ta', stk.low || stk.out ? 'dan' : 'ok', '⚠️') +
      GC.statCard('Kassada bugun', money(st.cash.today), 'Naqd: ' + money(st.cash.todayByMethod.naqd || 0), 'ok', '🏦') +
      '</div>' +

      '<div class="grid2">' +
      '<div class="panel"><div class="panel-head"><div class="panel-title">🔴 Muddati o‘tgan qarzlar</div>' +
      '<div class="spacer"></div><a class="btn btn-sm" href="#/debts">Barchasi</a></div>' +
      '<div class="panel-body tight"><div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>Mijoz</th><th class="num">Qolgan</th><th>Muddat</th><th></th></tr></thead><tbody>' +
      (overdueRows.length ? overdueRows.map(r =>
        '<tr class="clickable" data-action="debt-view" data-id="' + r.d.id + '">' +
        '<td>' + esc(r.customer ? r.customer.c.name : '—') + '</td>' +
        '<td class="num strong">' + money(r.remain) + '</td>' +
        '<td><span class="badge b-red">' + r.dueDays + ' kun kech</span></td>' +
        '<td class="num"><button class="btn btn-sm btn-success" data-action="pay-debt" data-id="' + r.d.id + '">To‘lov</button></td></tr>').join('')
        : '<tr><td colspan="4"><div class="empty">Muddati o‘tgan qarz yo‘q 👍</div></td></tr>') +
      '</tbody></table></div></div></div>' +

      '<div class="panel"><div class="panel-head"><div class="panel-title">🕘 Oxirgi harakatlar</div>' +
      '<div class="spacer"></div><a class="btn btn-sm" href="#/audit">Tarix</a></div>' +
      '<div class="panel-body"><div class="tl">' +
      (acts.length ? acts.map(a => '<div class="tl-item ' + (a.entity === 'payment' ? 'pay' : a.entity === 'debt' ? 'debt' : '') + '">' +
        '<div class="tl-t">' + GC.fmtDT(a.ts) + ' · ' + esc(a.user || '') + '</div>' +
        '<div class="tl-d">' + esc(a.description) + '</div></div>').join('')
        : '<div class="empty">Hozircha harakatlar yo‘q</div>') +
      '</div></div></div></div>';
  };

  /* =================== QARZLAR =================== */
  function debtFilterRows() {
    const st = GC.compute();
    const f = UI.debts;
    const r = GC.rangeFor(f.range, f.custom);
    let rows = st.debtRows.filter(x => GC.inRange(x.d.date, r));
    switch (f.filter) {
      case 'today': rows = rows.filter(x => x.d.date === st.today); break;
      case 'overdue': rows = rows.filter(x => x.status === 'overdue'); break;
      case 'due_today': rows = rows.filter(x => x.status === 'due_today'); break;
      case 'unpaid': rows = rows.filter(x => x.paid === 0 && x.remain > 0); break;
      case 'partial': rows = rows.filter(x => x.paid > 0 && x.remain > 0); break;
      case 'paid': rows = rows.filter(x => x.remain <= 0); break;
    }
    if (f.q) {
      const q = f.q.toLowerCase();
      rows = rows.filter(x => (x.customer && x.customer.c.name.toLowerCase().includes(q)) ||
        (x.d.reason || '').toLowerCase().includes(q) || x.d.id.includes(q) || String(x.d.amount).includes(q));
    }
    const S = { new: (a, b) => (a.d.date === b.d.date ? b.d.createdAt - a.d.createdAt : (a.d.date < b.d.date ? 1 : -1)),
      old: (a, b) => (a.d.date === b.d.date ? a.d.createdAt - b.d.createdAt : (a.d.date > b.d.date ? 1 : -1)),
      max: (a, b) => b.d.amount - a.d.amount, min: (a, b) => a.d.amount - b.d.amount,
      late: (a, b) => (b.dueDays || -9999) - (a.dueDays || -9999) };
    rows.sort(S[f.sort] || S.new);
    return rows;
  }

  GC.views.debts = function () {
    const f = UI.debts;
    const rows = debtFilterRows();
    const pg = GC.paginate(rows, f.page, PER);
    const sum = rows.reduce((s, r) => ({ a: s.a + r.d.amount, p: s.p + r.paid, r: s.r + r.remain }), { a: 0, p: 0, r: 0 });

    const chip = (key, val, label) => '<button class="chip' + (f[key] === val ? ' active' : '') +
      '" data-action="debt-filter" data-key="' + key + '" data-val="' + val + '">' + esc(label) + '</button>';

    return '' +
      '<div class="page-head"><div><div class="page-title">Qarzlar</div>' +
      '<div class="page-sub">Jami ' + rows.length + ' ta yozuv · Qarz: ' + money(sum.a) + ' · To‘langan: ' + money(sum.p) + ' · Qolgan: <b>' + money(sum.r) + '</b></div></div>' +
      '<div class="spacer"></div>' + GC.exportBar('debts') +
      '<button class="btn btn-primary" data-action="new-debt">+ Qarz qo‘shish</button></div>' +

      '<div class="panel"><div class="panel-head">' +
      '<div class="chips">' + chip('filter', 'all', 'Barcha') + chip('filter', 'today', 'Bugungi') +
      chip('filter', 'overdue', '🔴 Muddati o‘tgan') + chip('filter', 'due_today', '🟡 Bugun to‘lanadi') +
      chip('filter', 'unpaid', 'To‘lanmagan') + chip('filter', 'partial', 'Qisman') + chip('filter', 'paid', '🟢 To‘langan') +
      '</div><div class="spacer"></div>' +
      '<div class="chips">' + chip('range', 'all', 'Barcha vaqt') + chip('range', 'today', 'Bugun') + chip('range', 'yesterday', 'Kecha') +
      chip('range', 'week', 'Shu hafta') + chip('range', 'month', 'Shu oy') + chip('range', 'custom', 'Sana tanlash') + '</div>' +
      '</div>' +
      (f.range === 'custom' ? '<div class="panel-head"><div class="row"><span class="muted">Dan:</span>' +
        '<input type="date" class="input" style="width:auto" data-action="debt-date" data-k="from" value="' + esc(f.custom.from) + '">' +
        '<span class="muted">Gacha:</span><input type="date" class="input" style="width:auto" data-action="debt-date" data-k="to" value="' + esc(f.custom.to) + '"></div></div>' : '') +
      '<div class="panel-head"><input class="input" style="max-width:280px" placeholder="Jadval ichidan qidirish…" data-action="debt-search" value="' + esc(f.q) + '">' +
      '<div class="spacer"></div><span class="muted">Saralash:</span>' +
      '<select class="select" style="width:auto" data-action="debt-sort">' +
      [['new', 'Eng yangi'], ['old', 'Eng eski'], ['max', 'Eng katta summa'], ['min', 'Eng kichik summa'], ['late', 'Eng katta kechikish']]
        .map(o => '<option value="' + o[0] + '"' + (f.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
      '</select></div>' +

      '<div class="panel-body tight"><div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>ID</th><th>Mijoz</th><th class="num">Qarz</th><th class="num">To‘langan</th><th class="num">Qolgan</th>' +
      '<th>Sana</th><th>Muddat</th><th>Holat</th><th>Amallar</th></tr></thead><tbody>' +
      (pg.rows.length ? pg.rows.map(r => {
        const c = r.customer;
        return '<tr>' +
          '<td class="muted mono">#' + esc(r.d.id.slice(-6).toUpperCase()) + '</td>' +
          '<td><div class="cust-cell clickable" data-action="customer-view" data-id="' + (c ? c.id : '') + '">' +
          GC.avatar(c ? c.c.name : '?') + '<div><div class="strong">' + esc(c ? c.c.name : 'O‘chirilgan mijoz') + '</div>' +
          '<div class="muted" style="font-size:11px">' + esc(r.d.reason || '—') + '</div></div></div></td>' +
          '<td class="num strong">' + money(r.d.amount) + '</td>' +
          '<td class="num" style="color:var(--ok)">' + money(r.paid) + '</td>' +
          '<td class="num strong" style="color:' + (r.remain > 0 ? 'var(--dan)' : 'var(--ok)') + '">' + money(r.remain) + '</td>' +
          '<td class="mono">' + fmtDate(r.d.date) + '</td>' +
          '<td class="mono">' + (r.d.dueDate ? fmtDate(r.d.dueDate) : '—') + '</td>' +
          '<td>' + GC.debtBadge(r) + '</td>' +
          '<td><div class="row" style="gap:4px;flex-wrap:nowrap">' +
          '<button class="btn btn-sm" data-action="debt-view" data-id="' + r.d.id + '" title="Ko‘rish">👁</button>' +
          (r.remain > 0 ? '<button class="btn btn-sm btn-success" data-action="pay-debt" data-id="' + r.d.id + '" title="To‘lov">💵</button>' : '') +
          '<button class="btn btn-sm" data-action="debt-edit" data-id="' + r.d.id + '" title="Tahrirlash">✏️</button>' +
          '<button class="btn btn-sm" data-action="debt-receipt" data-id="' + r.d.id + '" title="Chek">🧾</button>' +
          '<button class="btn btn-sm btn-danger" data-action="debt-delete" data-id="' + r.d.id + '" title="O‘chirish">🗑</button>' +
          '</div></td></tr>';
      }).join('') : '<tr><td colspan="9"><div class="empty"><div class="big">📒</div>Qarz yozuvlari topilmadi</div></td></tr>') +
      '</tbody></table></div>' + GC.pagerHTML(pg, 'debts') + '</div></div>';
  };

  /* =================== MIJOZLAR =================== */
  GC.views.customers = function () {
    const st = GC.compute(), f = UI.customers;
    let rows = st.customers.slice();
    if (f.filter === 'debt') rows = rows.filter(x => x.remain > 0);
    else if (f.filter === 'overdue') rows = rows.filter(x => x.status === 'overdue');
    else if (f.filter === 'clear') rows = rows.filter(x => x.remain <= 0);
    if (f.q) {
      const q = f.q.toLowerCase();
      rows = rows.filter(x => x.c.name.toLowerCase().includes(q) || (x.c.phone || '').includes(q) ||
        (x.c.telegram || '').toLowerCase().includes(q) || x.id.includes(q));
    }
    const sorters = {
      remain: (a, b) => b.remain - a.remain, name: (a, b) => a.c.name.localeCompare(b.c.name, 'uz'),
      total: (a, b) => b.total - a.total, recent: (a, b) => (b.c.createdAt || 0) - (a.c.createdAt || 0)
    };
    rows.sort(sorters[f.sort] || sorters.remain);
    const pg = GC.paginate(rows, f.page, PER);
    const chip = (key, val, label) => '<button class="chip' + (f[key] === val ? ' active' : '') +
      '" data-action="cust-filter" data-key="' + key + '" data-val="' + val + '">' + esc(label) + '</button>';

    return '' +
      '<div class="page-head"><div><div class="page-title">Mijozlar</div>' +
      '<div class="page-sub">Jami ' + st.customers.length + ' ta mijoz · Qarzdor: ' + st.totals.debtorCount + ' ta · Umumiy qoldiq: <b>' + money(st.totals.remain) + '</b></div></div>' +
      '<div class="spacer"></div>' + GC.exportBar('customers') +
      '<button class="btn btn-primary" data-action="new-customer">+ Mijoz qo‘shish</button></div>' +

      '<div class="panel"><div class="panel-head">' +
      '<div class="chips">' + chip('filter', 'all', 'Barcha') + chip('filter', 'debt', '🟡 Qarzi bor') +
      chip('filter', 'overdue', '🔴 Muddati o‘tgan') + chip('filter', 'clear', '🟢 Qarzi yo‘q') + '</div>' +
      '<div class="spacer"></div>' +
      '<input class="input" style="max-width:240px" placeholder="Ism / telefon bo‘yicha…" data-action="cust-search" value="' + esc(f.q) + '">' +
      '<select class="select" style="width:auto" data-action="cust-sort">' +
      [['remain', 'Qolgan qarz bo‘yicha'], ['total', 'Jami qarz bo‘yicha'], ['name', 'Ism bo‘yicha'], ['recent', 'Yangi qo‘shilgan']]
        .map(o => '<option value="' + o[0] + '"' + (f.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' +

      '<div class="panel-body tight"><div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>ID</th><th>Mijoz</th><th>Telefon</th><th class="num">Jami qarz</th><th class="num">To‘langan</th><th class="num">Qolgan</th>' +
      '<th>Oxirgi qarz</th><th>Oxirgi to‘lov</th><th>Holat</th><th>Amallar</th></tr></thead><tbody>' +
      (pg.rows.length ? pg.rows.map(x =>
        '<tr class="clickable"><td class="muted mono" data-action="customer-view" data-id="' + x.id + '">#' + esc(x.id.slice(-6).toUpperCase()) + '</td>' +
        '<td data-action="customer-view" data-id="' + x.id + '"><div class="cust-cell">' + GC.avatar(x.c.name) +
        '<div><div class="strong">' + esc(x.c.name) + '</div>' +
        (x.c.telegram ? '<div class="muted" style="font-size:11px">@' + esc(x.c.telegram.replace(/^@/, '')) + '</div>' : '') + '</div></div></td>' +
        '<td class="mono">' + esc(GC.fmtPhone(x.c.phone)) + '</td>' +
        '<td class="num">' + money(x.total) + '</td>' +
        '<td class="num" style="color:var(--ok)">' + money(x.paid) + '</td>' +
        '<td class="num strong" style="color:' + (x.remain > 0 ? 'var(--dan)' : 'var(--ok)') + '">' + money(x.remain) + '</td>' +
        '<td class="mono">' + (x.lastDebt ? fmtDate(x.lastDebt) : '—') + '</td>' +
        '<td class="mono">' + (x.lastPay ? fmtDate(x.lastPay) : '—') + '</td>' +
        '<td>' + GC.custBadge(x) + '</td>' +
        '<td><div class="row" style="gap:4px;flex-wrap:nowrap">' +
        '<button class="btn btn-sm" data-action="customer-view" data-id="' + x.id + '" title="Profil">👁</button>' +
        '<button class="btn btn-sm btn-primary" data-action="new-debt" data-cust="' + x.id + '" title="Qarz yozish">＋</button>' +
        (x.remain > 0 ? '<button class="btn btn-sm btn-success" data-action="new-payment" data-cust="' + x.id + '" title="To‘lov">💵</button>' : '') +
        '<button class="btn btn-sm" data-action="cust-edit" data-id="' + x.id + '" title="Tahrirlash">✏️</button>' +
        '<button class="btn btn-sm btn-danger" data-action="cust-delete" data-id="' + x.id + '" title="O‘chirish">🗑</button>' +
        '</div></td></tr>').join('')
        : '<tr><td colspan="10"><div class="empty"><div class="big">👥</div>Mijoz topilmadi. "Mijoz qo‘shish" tugmasini bosing.</div></td></tr>') +
      '</tbody></table></div>' + GC.pagerHTML(pg, 'customers') + '</div></div>';
  };

  /* =================== TO'LOVLAR =================== */
  GC.views.payments = function () {
    const S = GC.state, st = GC.compute(), f = UI.payments;
    const r = GC.rangeFor(f.range, f.custom);
    let rows = S.payments.filter(p => !p.canceled && GC.inRange(p.date, r));
    if (f.method !== 'all') rows = rows.filter(p => p.method === f.method);
    if (f.q) {
      const q = f.q.toLowerCase();
      rows = rows.filter(p => {
        const c = st.custById.get(p.customerId);
        return (c && c.c.name.toLowerCase().includes(q)) || String(p.amount).includes(q) || (p.note || '').toLowerCase().includes(q);
      });
    }
    rows.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : (a.date < b.date ? 1 : -1)));
    const pg = GC.paginate(rows, f.page, PER);
    const total = rows.reduce((s, p) => s + p.amount, 0);
    const chip = (key, val, label) => '<button class="chip' + (f[key] === val ? ' active' : '') +
      '" data-action="pay-filter" data-key="' + key + '" data-val="' + val + '">' + esc(label) + '</button>';

    return '' +
      '<div class="page-head"><div><div class="page-title">To‘lovlar</div>' +
      '<div class="page-sub">' + rows.length + ' ta to‘lov · Jami: <b>' + money(total) + '</b></div></div>' +
      '<div class="spacer"></div>' + GC.exportBar('payments') +
      '<button class="btn btn-success" data-action="new-payment">+ To‘lov qabul qilish</button></div>' +

      '<div class="panel"><div class="panel-head">' +
      '<div class="chips">' + chip('range', 'all', 'Barcha') + chip('range', 'today', 'Bugun') + chip('range', 'yesterday', 'Kecha') +
      chip('range', 'week', 'Shu hafta') + chip('range', 'month', 'Shu oy') + '</div><div class="spacer"></div>' +
      '<div class="chips">' + chip('method', 'all', 'Barcha turlar') +
      GC.PAY_METHODS.map(m => chip('method', m.id, m.name)).join('') + '</div></div>' +
      '<div class="panel-head"><input class="input" style="max-width:280px" placeholder="Mijoz yoki summa bo‘yicha…" data-action="pay-search" value="' + esc(f.q) + '"></div>' +

      '<div class="panel-body tight"><div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>ID</th><th>Sana</th><th>Mijoz</th><th class="num">Summa</th><th>Turi</th><th>Izoh</th><th>Kassir</th><th>Amallar</th>' +
      '</tr></thead><tbody>' +
      (pg.rows.length ? pg.rows.map(p => {
        const c = st.custById.get(p.customerId);
        return '<tr><td class="muted mono">#' + esc(p.id.slice(-6).toUpperCase()) + '</td>' +
          '<td class="mono">' + fmtDate(p.date) + ' <span class="muted">' + GC.fmtTime(p.createdAt) + '</span></td>' +
          '<td class="clickable" data-action="customer-view" data-id="' + p.customerId + '"><b>' + esc(c ? c.c.name : '—') + '</b></td>' +
          '<td class="num strong" style="color:var(--ok)">' + money(p.amount) + '</td>' +
          '<td><span class="badge b-blue">' + esc(GC.methodName(p.method)) + '</span></td>' +
          '<td class="muted">' + esc(p.note || '—') + '</td>' +
          '<td class="muted">' + esc(p.cashier || '') + '</td>' +
          '<td><div class="row" style="gap:4px;flex-wrap:nowrap">' +
          '<button class="btn btn-sm" data-action="pay-receipt" data-id="' + p.id + '" title="Chek">🧾</button>' +
          '<button class="btn btn-sm" data-action="pay-edit" data-id="' + p.id + '" title="Tahrirlash">✏️</button>' +
          '<button class="btn btn-sm btn-danger" data-action="pay-delete" data-id="' + p.id + '" title="O‘chirish">🗑</button>' +
          '</div></td></tr>';
      }).join('') : '<tr><td colspan="8"><div class="empty"><div class="big">💵</div>To‘lovlar topilmadi</div></td></tr>') +
      '</tbody></table></div>' + GC.pagerHTML(pg, 'payments') + '</div></div>';
  };

  /* =================== MODALLAR / AMALLAR =================== */
  const A = GC.actions;

  A['debt-filter'] = (el) => { UI.debts[el.dataset.key] = el.dataset.val; UI.debts.page = 1; GC.rerender(); };
  A['debt-date'] = null; // input event bilan ishlaydi
  A['cust-filter'] = (el) => { UI.customers[el.dataset.key] = el.dataset.val; UI.customers.page = 1; GC.rerender(); };
  A['pay-filter'] = (el) => { UI.payments[el.dataset.key] = el.dataset.val; UI.payments.page = 1; GC.rerender(); };
  A['page'] = (el) => { const k = el.dataset.key; if (UI[k]) { UI[k].page = +el.dataset.page; GC.rerender(); } };

  GC.inputHandlers['debt-search'] = (el) => { UI.debts.q = el.value; UI.debts.page = 1; GC.rerender(true); };
  GC.inputHandlers['cust-search'] = (el) => { UI.customers.q = el.value; UI.customers.page = 1; GC.rerender(true); };
  GC.inputHandlers['pay-search'] = (el) => { UI.payments.q = el.value; UI.payments.page = 1; GC.rerender(true); };
  GC.inputHandlers['debt-sort'] = (el) => { UI.debts.sort = el.value; GC.rerender(); };
  GC.inputHandlers['cust-sort'] = (el) => { UI.customers.sort = el.value; GC.rerender(); };
  GC.inputHandlers['debt-date'] = (el) => { UI.debts.custom[el.dataset.k] = el.value; UI.debts.page = 1; GC.rerender(true); };

  /* ---- Mijoz qo'shish / tahrirlash ---- */
  function customerForm(c) {
    return '<div class="field"><label>Ism familiya *</label>' +
      '<input class="input" name="name" value="' + esc(c ? c.name : '') + '" placeholder="Masalan: Ali Valiyev" data-autofocus><div class="err"></div></div>' +
      '<div class="grid2"><div class="field"><label>Telefon raqami</label>' +
      '<input class="input" name="phone" value="' + esc(c ? c.phone : '') + '" placeholder="+998 90 123 45 67"><div class="err"></div></div>' +
      '<div class="field"><label>Telegram username (ixtiyoriy)</label>' +
      '<input class="input" name="telegram" value="' + esc(c ? c.telegram : '') + '" placeholder="@username"></div></div>' +
      '<div class="field"><label>Izoh</label><textarea class="input" name="note" rows="2" placeholder="Qo‘shimcha ma’lumot">' + esc(c ? c.note : '') + '</textarea></div>';
  }
  A['new-customer'] = () => {
    const m = GC.modal({
      title: '👤 Yangi mijoz qo‘shish', body: customerForm(null),
      footer: '<button class="btn" data-mclose>Bekor qilish</button><button class="btn btn-primary" data-save>Saqlash</button>'
    });
    m.q('[data-save]').onclick = () => {
      const v = m.values();
      const e = GC.V.customer(v);
      if (!GC.showErrors(m.el, e)) return;
      const c = GC.addCustomer(v);
      m.close();
      GC.toast('Mijoz qo‘shildi: ' + c.name, 'ok');
    };
  };
  A['cust-edit'] = (el) => {
    const c = GC.state.customers.find(x => x.id === el.dataset.id); if (!c) return;
    const m = GC.modal({
      title: '✏️ Mijozni tahrirlash', body: customerForm(c),
      footer: '<button class="btn" data-mclose>Bekor qilish</button><button class="btn btn-primary" data-save>Saqlash</button>'
    });
    m.q('[data-save]').onclick = () => {
      const v = m.values();
      const e = GC.V.customer(v, c.id);
      if (!GC.showErrors(m.el, e)) return;
      GC.updateCustomer(c.id, v); m.close(); GC.toast('Mijoz ma’lumotlari yangilandi', 'ok');
    };
  };
  A['cust-delete'] = async (el) => {
    const c = GC.state.customers.find(x => x.id === el.dataset.id); if (!c) return;
    const ok = await GC.confirm({
      title: 'Mijozni o‘chirish', danger: true, okText: 'O‘chirish',
      html: '<b>' + esc(c.name) + '</b> mijozi o‘chirilsinmi?<br><span class="muted">Qarz yoki to‘lov yozuvi bo‘lgan mijozni o‘chirib bo‘lmaydi.</span>'
    });
    if (!ok) return;
    if (!GC.deleteCustomer(c.id)) GC.toast('Bu mijozda qarz/to‘lov tarixi bor — o‘chirib bo‘lmaydi', 'err', 4500);
    else GC.toast('Mijoz o‘chirildi', 'ok');
  };

  /* ---- Qarz qo'shish ---- */
  A['new-debt'] = (el) => {
    const S = GC.state, today = GC.todayISO();
    const custId = el && el.dataset ? el.dataset.cust : '';
    const m = GC.modal({
      title: '📕 Yangi qarz qo‘shish',
      body:
        '<div class="field"><label>Mijoz *</label>' + GC.customerSelect('customerId', custId, 'data-autofocus') +
        '<div class="err"></div><div class="hint">Mijoz ro‘yxatda yo‘qmi? <a href="#" data-quick-cust style="color:var(--acc2)">Tezkor qo‘shish</a></div></div>' +
        '<div class="field"><label>Qarz summasi (so‘m) *</label><input class="input" name="amount" data-money placeholder="150 000"><div class="err"></div></div>' +
        '<div class="grid2"><div class="field"><label>Sana *</label><input class="input" type="date" name="date" value="' + today + '"><div class="err"></div></div>' +
        '<div class="field"><label>To‘lash muddati</label><input class="input" type="date" name="dueDate" value="' + GC.addDays(today, S.settings.defaultDueDays || 7) + '"><div class="err"></div></div></div>' +
        '<div class="field"><label>Sabab / izoh</label><input class="input" name="reason" placeholder="Masalan: 4 soat kompyuter + ichimlik"></div>' +
        '<div class="grid2"><div class="field"><label>Kassir</label>' + GC.cashierSelect('cashier', S.settings.cashier) + '</div>' +
        '<div class="field"><label>Qo‘shimcha izoh</label><input class="input" name="note" placeholder="Ixtiyoriy"></div></div>',
      footer: '<button class="btn" data-mclose>Bekor qilish</button><button class="btn btn-primary" data-save>💾 Saqlash</button>'
    });
    m.q('[data-quick-cust]').onclick = (e) => {
      e.preventDefault();
      A['new-customer']();
    };
    m.q('[data-save]').onclick = () => {
      const v = m.values();
      const e = GC.V.debt(v);
      if (!GC.showErrors(m.el, e)) return;
      const d = GC.addDebt(v);
      const c = GC.state.customers.find(x => x.id === d.customerId);
      const st = GC.compute().custById.get(d.customerId);
      m.close();
      GC.toast('✅ ' + c.name + ' ga ' + money(d.amount) + ' qarz yozildi. Qolgan: ' + money(st.remain), 'ok', 4000);
    };
  };

  /* ---- To'lov qabul qilish ---- */
  function paymentModal(customerId, debtId) {
    const st = GC.compute(), today = GC.todayISO();
    const m = GC.modal({
      title: '💵 To‘lov qabul qilish',
      body:
        '<div class="field"><label>Mijoz *</label>' + GC.customerSelect('customerId', customerId || '') + '<div class="err"></div></div>' +
        '<div class="field"><label>Qaysi qarz uchun</label><select class="select" name="debtId"><option value="">Avtomatik (eng eski qarzdan boshlab)</option></select>' +
        '<div class="hint" data-remain></div></div>' +
        '<div class="field"><label>To‘lov summasi (so‘m) *</label><input class="input" name="amount" data-money placeholder="0">' +
        '<div class="err"></div><div class="row" style="margin-top:7px">' +
        '<button class="btn btn-sm" data-fill="all" type="button">Butun qarzni yopish</button>' +
        '<button class="btn btn-sm" data-fill="half" type="button">Yarmi</button></div></div>' +
        '<div class="grid2"><div class="field"><label>Sana *</label><input class="input" type="date" name="date" value="' + today + '"><div class="err"></div></div>' +
        '<div class="field"><label>To‘lov turi</label>' + GC.methodSelect('method', 'naqd') + '</div></div>' +
        '<div class="grid2"><div class="field"><label>Kassir</label>' + GC.cashierSelect('cashier', GC.state.settings.cashier) + '</div>' +
        '<div class="field"><label>Izoh</label><input class="input" name="note" placeholder="Ixtiyoriy"></div></div>' +
        '<div class="field"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="print" checked> To‘lovdan keyin chek chiqarish</label></div>',
      footer: '<button class="btn" data-mclose>Bekor qilish</button><button class="btn btn-success" data-save>💾 To‘lovni saqlash</button>'
    });
    const selC = m.q('[name=customerId]'), selD = m.q('[name=debtId]'), amt = m.q('[name=amount]');
    function refresh() {
      const cid = selC.value;
      const s = GC.compute();
      const rows = s.debtRows.filter(r => r.d.customerId === cid && r.remain > 0)
        .sort((a, b) => (a.d.date < b.d.date ? -1 : 1));
      selD.innerHTML = '<option value="">Avtomatik (eng eski qarzdan boshlab)</option>' +
        rows.map(r => '<option value="' + r.d.id + '">' + fmtDate(r.d.date) + ' · ' + money(r.remain) + ' qolgan' +
          (r.d.reason ? ' · ' + esc(r.d.reason) : '') + '</option>').join('');
      if (debtId) selD.value = debtId;
      const cust = s.custById.get(cid);
      const max = selD.value ? (rows.find(r => r.d.id === selD.value) || {}).remain : (cust ? cust.remain : 0);
      m.q('[data-remain]').innerHTML = cust
        ? 'Mijozning qolgan qarzi: <b style="color:var(--dan)">' + money(cust.remain) + '</b>' +
          (selD.value ? ' · Tanlangan qarzda: <b>' + money(max || 0) + '</b>' : '')
        : 'Mijozni tanlang';
      m._max = max || 0;
    }
    selC.onchange = refresh; selD.onchange = refresh;
    refresh();
    m.qa('[data-fill]').forEach(b => b.onclick = () => {
      const val = b.dataset.fill === 'all' ? m._max : Math.round(m._max / 2);
      amt.value = GC.groupNum(val);
    });
    m.q('[data-save]').onclick = () => {
      const v = m.values();
      const s = GC.compute();
      const cust = s.custById.get(v.customerId);
      const maxAmount = v.debtId ? (s.debtRowById.get(v.debtId) || {}).remain : (cust ? cust.remain : 0);
      const e = GC.V.payment(v, { maxAmount: maxAmount || 0 });
      if (!cust) e.customerId = 'Mijozni tanlang';
      else if (cust.remain <= 0) e.amount = 'Bu mijozning qarzi yo‘q';
      if (!GC.showErrors(m.el, e)) return;
      const before = cust.remain;
      const p = GC.addPayment(v);
      const after = GC.compute().custById.get(v.customerId).remain;
      m.close();
      GC.toast('✅ To‘lov qabul qilindi: ' + money(p.amount) + ' · Qolgan qarz: ' + money(after), 'ok', 4500);
      if (v.print) GC.printReceipt(GC.paymentReceipt(p, before, after));
    };
    return m;
  }
  A['new-payment'] = (el) => paymentModal(el && el.dataset ? el.dataset.cust : '', null);
  A['pay-debt'] = (el) => {
    const r = GC.compute().debtRowById.get(el.dataset.id); if (!r) return;
    paymentModal(r.d.customerId, r.d.id);
  };

  /* ---- Qarz ko'rish / tahrirlash / o'chirish ---- */
  A['debt-view'] = (el) => {
    const r = GC.compute().debtRowById.get(el.dataset.id); if (!r) return;
    const c = r.customer;
    const pays = GC.state.payments.filter(p => !p.canceled && p.debtId === r.d.id);
    GC.modal({
      title: '📕 Qarz #' + r.d.id.slice(-6).toUpperCase(),
      body: '<div class="kv"><span class="k">Mijoz</span><span class="v">' + esc(c ? c.c.name : '—') + '</span></div>' +
        '<div class="kv"><span class="k">Telefon</span><span class="v">' + esc(c ? GC.fmtPhone(c.c.phone) : '—') + '</span></div>' +
        '<div class="kv"><span class="k">Qarz summasi</span><span class="v">' + money(r.d.amount) + '</span></div>' +
        '<div class="kv"><span class="k">To‘langan</span><span class="v" style="color:var(--ok)">' + money(r.paid) + '</span></div>' +
        '<div class="kv"><span class="k">Qolgan</span><span class="v" style="color:var(--dan)">' + money(r.remain) + '</span></div>' +
        '<div class="kv"><span class="k">Sana</span><span class="v">' + fmtDate(r.d.date) + '</span></div>' +
        '<div class="kv"><span class="k">To‘lash muddati</span><span class="v">' + (r.d.dueDate ? fmtDate(r.d.dueDate) : '—') + '</span></div>' +
        '<div class="kv"><span class="k">Holat</span><span class="v">' + GC.debtBadge(r) + '</span></div>' +
        '<div class="kv"><span class="k">Sabab</span><span class="v">' + esc(r.d.reason || '—') + '</span></div>' +
        '<div class="kv"><span class="k">Kassir</span><span class="v">' + esc(r.d.cashier || '—') + '</span></div>' +
        (r.d.note ? '<div class="kv"><span class="k">Izoh</span><span class="v">' + esc(r.d.note) + '</span></div>' : '') +
        '<div class="panel-title" style="margin:16px 0 8px">Ushbu qarzga biriktirilgan to‘lovlar</div>' +
        (pays.length ? '<div class="tl">' + pays.map(p => '<div class="tl-item pay"><div class="tl-t">' + fmtDate(p.date) + ' · ' +
          esc(GC.methodName(p.method)) + '</div><div class="tl-d">' + money(p.amount) + '</div></div>').join('') + '</div>'
          : '<div class="muted">To‘g‘ridan-to‘g‘ri biriktirilgan to‘lov yo‘q (avtomatik taqsimlangan bo‘lishi mumkin)</div>'),
      footer: (r.remain > 0 ? '<button class="btn btn-success" data-action="pay-debt" data-id="' + r.d.id + '">💵 To‘lov qilish</button>' : '') +
        '<button class="btn" data-action="debt-receipt" data-id="' + r.d.id + '">🧾 Chek</button>' +
        '<button class="btn" data-action="customer-view" data-id="' + (c ? c.id : '') + '">👤 Mijoz profili</button>' +
        '<button class="btn" data-mclose>Yopish</button>'
    });
  };
  A['debt-edit'] = (el) => {
    const d = GC.state.debts.find(x => x.id === el.dataset.id); if (!d) return;
    const row = GC.compute().debtRowById.get(d.id);
    const m = GC.modal({
      title: '✏️ Qarzni tahrirlash',
      body: '<div class="field"><label>Qarz summasi (so‘m)</label><input class="input" name="amount" data-money value="' + GC.groupNum(d.amount) + '"><div class="err"></div>' +
        '<div class="hint">Bu qarz bo‘yicha to‘langan: ' + money(row.paid) + '</div></div>' +
        '<div class="grid2"><div class="field"><label>Sana</label><input class="input" type="date" name="date" value="' + esc(d.date) + '"><div class="err"></div></div>' +
        '<div class="field"><label>To‘lash muddati</label><input class="input" type="date" name="dueDate" value="' + esc(d.dueDate || '') + '"><div class="err"></div></div></div>' +
        '<div class="field"><label>Sabab</label><input class="input" name="reason" value="' + esc(d.reason || '') + '"></div>' +
        '<div class="field"><label>Izoh</label><input class="input" name="note" value="' + esc(d.note || '') + '"></div>',
      footer: '<button class="btn" data-mclose>Bekor qilish</button><button class="btn btn-primary" data-save>Saqlash</button>'
    });
    m.q('[data-save]').onclick = () => {
      const v = Object.assign({ customerId: d.customerId }, m.values());
      const e = GC.V.debt(v);
      if (!e.amount && GC.parseMoney(v.amount) < row.paid)
        e.amount = 'Qarz summasi to‘langan summadan (' + money(row.paid) + ') kichik bo‘lishi mumkin emas';
      if (!GC.showErrors(m.el, e)) return;
      GC.updateDebt(d.id, v); m.close(); GC.toast('Qarz yangilandi', 'ok');
    };
  };
  A['debt-delete'] = async (el) => {
    const r = GC.compute().debtRowById.get(el.dataset.id); if (!r) return;
    const reason = await GC.confirm({
      title: 'Qarzni o‘chirish', danger: true, okText: 'O‘chirish', reason: true,
      html: '<b>' + money(r.d.amount) + '</b> miqdoridagi qarz o‘chirilsinmi?<br>' +
        '<span class="muted">O‘chirilgan operatsiya audit logda saqlanadi — moliyaviy tarix buzilmaydi.</span>'
    });
    if (!reason) return;
    GC.deleteDebt(r.d.id, reason === true ? '' : reason);
    GC.toast('Qarz o‘chirildi (audit logga yozildi)', 'ok');
  };
  A['debt-receipt'] = (el) => {
    const r = GC.compute().debtRowById.get(el.dataset.id); if (!r) return;
    const S = GC.state, c = r.customer;
    GC.printReceipt('<div class="receipt"><div class="rc big">' + esc(S.settings.clubName) + '</div><hr>' +
      '<div class="rc">QARZ CHEKI</div><hr>' +
      '<div class="rl"><span>Mijoz:</span><b>' + esc(c ? c.c.name : '—') + '</b></div>' +
      '<div class="rl"><span>Sana:</span><span>' + fmtDate(r.d.date) + '</span></div>' +
      '<div class="rl"><span>Muddat:</span><span>' + (r.d.dueDate ? fmtDate(r.d.dueDate) : '—') + '</span></div><hr>' +
      '<div class="rl"><span>Qarz:</span><b>' + money(r.d.amount) + '</b></div>' +
      '<div class="rl"><span>To‘langan:</span><b>' + money(r.paid) + '</b></div>' +
      '<div class="rl big"><span>Qolgan:</span><b>' + money(r.remain) + '</b></div><hr>' +
      (r.d.reason ? '<div class="rl"><span>Izoh:</span><span>' + esc(r.d.reason) + '</span></div>' : '') +
      '<div class="rl"><span>Kassir:</span><span>' + esc(r.d.cashier || '') + '</span></div>' +
      '<div class="rl"><span>Chek №:</span><span>' + esc(r.d.id.slice(-8).toUpperCase()) + '</span></div><hr>' +
      '<div class="rc">' + esc(S.settings.receiptFooter || '') + '</div></div>');
  };

  /* ---- To'lovni tahrirlash / o'chirish / chek ---- */
  A['pay-edit'] = (el) => {
    const p = GC.state.payments.find(x => x.id === el.dataset.id); if (!p) return;
    const m = GC.modal({
      title: '✏️ To‘lovni tahrirlash',
      body: '<div class="field"><label>Summa (so‘m)</label><input class="input" name="amount" data-money value="' + GC.groupNum(p.amount) + '"><div class="err"></div></div>' +
        '<div class="grid2"><div class="field"><label>Sana</label><input class="input" type="date" name="date" value="' + esc(p.date) + '"><div class="err"></div></div>' +
        '<div class="field"><label>To‘lov turi</label>' + GC.methodSelect('method', p.method) + '</div></div>' +
        '<div class="field"><label>Izoh</label><input class="input" name="note" value="' + esc(p.note || '') + '"></div>',
      footer: '<button class="btn" data-mclose>Bekor qilish</button><button class="btn btn-primary" data-save>Saqlash</button>'
    });
    m.q('[data-save]').onclick = () => {
      const v = Object.assign({ customerId: p.customerId, debtId: p.debtId }, m.values());
      const st = GC.compute().custById.get(p.customerId);
      const maxAmount = (st ? st.remain : 0) + p.amount;
      const e = GC.V.payment(v, { maxAmount });
      if (!GC.showErrors(m.el, e)) return;
      GC.updatePayment(p.id, v); m.close(); GC.toast('To‘lov yangilandi', 'ok');
    };
  };
  A['pay-delete'] = async (el) => {
    const p = GC.state.payments.find(x => x.id === el.dataset.id); if (!p) return;
    const reason = await GC.confirm({
      title: 'To‘lovni o‘chirish', danger: true, okText: 'O‘chirish', reason: true,
      html: '<b>' + money(p.amount) + '</b> to‘lov o‘chirilsinmi? Mijoz qarzi shuncha summaga oshadi.<br>' +
        '<span class="muted">Operatsiya audit logda saqlanadi.</span>'
    });
    if (!reason) return;
    GC.deletePayment(p.id, reason === true ? '' : reason);
    GC.toast('To‘lov o‘chirildi', 'ok');
  };
  A['pay-receipt'] = (el) => {
    const p = GC.state.payments.find(x => x.id === el.dataset.id); if (!p) return;
    const st = GC.compute().custById.get(p.customerId);
    const after = st ? st.remain : 0;
    GC.printReceipt(GC.paymentReceipt(p, after + p.amount, after));
  };

  /* ---- Mijoz profili ---- */
  A['customer-view'] = (el) => {
    const id = el.dataset.id; if (!id) return;
    const st = GC.compute(), x = st.custById.get(id); if (!x) return;
    const hist = GC.customerHistory(id);
    const debts = st.debtRows.filter(r => r.d.customerId === id).sort((a, b) => (a.d.date < b.d.date ? 1 : -1));
    const sales = GC.state.sales.filter(s => !s.canceled && s.customerId === id);
    GC.modal({
      title: '👤 ' + x.c.name,
      size: 'wide',
      body:
        '<div class="row" style="margin-bottom:14px">' + GC.avatar(x.c.name) +
        '<div><div class="strong" style="font-size:16px">' + esc(x.c.name) + '</div>' +
        '<div class="muted">' + esc(GC.fmtPhone(x.c.phone)) + (x.c.telegram ? ' · @' + esc(x.c.telegram.replace(/^@/, '')) : '') + '</div></div>' +
        '<div class="spacer"></div>' + GC.custBadge(x) + '</div>' +
        (x.c.note ? '<div class="muted" style="margin-bottom:12px">📝 ' + esc(x.c.note) + '</div>' : '') +
        '<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">' +
        GC.statCard('Jami qarz', money(x.total)) +
        GC.statCard('To‘langan', money(x.paid), '', 'ok') +
        GC.statCard('Qolgan qarz', money(x.remain), '', x.remain > 0 ? 'dan' : 'ok') +
        GC.statCard('Muddati o‘tgan', money(x.overdue), '', 'warn') +
        '</div>' +
        '<div class="grid2">' +
        '<div><div class="panel-title" style="margin:6px 0 8px">📕 Qarzdorlik tarixi</div>' +
        (debts.length ? '<div class="tl">' + debts.map(r => '<div class="tl-item debt"><div class="tl-t">' + fmtDate(r.d.date) +
          (r.d.dueDate ? ' · muddat: ' + fmtDate(r.d.dueDate) : '') + '</div><div class="tl-d"><b>' + money(r.d.amount) + '</b> ' +
          GC.debtBadge(r) + (r.d.reason ? '<div class="muted" style="font-size:11.5px">' + esc(r.d.reason) + '</div>' : '') +
          '</div></div>').join('') + '</div>' : '<div class="muted">Qarz yozuvlari yo‘q</div>') + '</div>' +
        '<div><div class="panel-title" style="margin:6px 0 8px">💵 To‘lov tarixi</div>' +
        (hist.filter(h => h.type === 'pay').length ? '<div class="tl">' + hist.filter(h => h.type === 'pay').map(h =>
          '<div class="tl-item pay"><div class="tl-t">' + fmtDate(h.date) + ' · ' + esc(GC.methodName(h.obj.method)) + '</div>' +
          '<div class="tl-d"><b style="color:var(--ok)">' + money(h.amount) + '</b>' +
          (h.obj.note ? '<div class="muted" style="font-size:11.5px">' + esc(h.obj.note) + '</div>' : '') + '</div></div>').join('') + '</div>'
          : '<div class="muted">To‘lovlar yo‘q</div>') +
        (sales.length ? '<div class="panel-title" style="margin:14px 0 8px">🛒 Magazin xaridlari</div>' +
          '<div class="tl">' + sales.slice(-8).reverse().map(s => '<div class="tl-item"><div class="tl-t">' + fmtDate(s.date) + ' · ' +
            esc(GC.methodName(s.method)) + '</div><div class="tl-d">' + money(s.total) + '</div></div>').join('') + '</div>' : '') +
        '</div></div>',
      footer: '<button class="btn btn-primary" data-action="new-debt" data-cust="' + id + '">+ Qarz</button>' +
        (x.remain > 0 ? '<button class="btn btn-success" data-action="new-payment" data-cust="' + id + '">+ To‘lov</button>' : '') +
        '<button class="btn" data-action="cust-edit" data-id="' + id + '">✏️ Tahrirlash</button>' +
        '<button class="btn" data-action="cust-print" data-id="' + id + '">🖨 Hisobot</button>' +
        '<button class="btn" data-mclose>Yopish</button>'
    });
  };
  A['cust-print'] = (el) => {
    const st = GC.compute(), x = st.custById.get(el.dataset.id); if (!x) return;
    const hist = GC.customerHistory(x.id);
    const S = GC.state;
    GC.printReceipt('<div style="padding:18px;font-family:Segoe UI,sans-serif;color:#000;background:#fff">' +
      '<h2 style="margin:0">' + esc(S.settings.clubName) + '</h2>' +
      '<div style="font-size:12px;color:#555;margin-bottom:12px">Mijoz hisoboti · ' + GC.fmtDT(Date.now()) + '</div>' +
      '<h3 style="margin:0 0 4px">' + esc(x.c.name) + ' · ' + esc(GC.fmtPhone(x.c.phone)) + '</h3>' +
      '<p style="font-size:13px">Jami qarz: <b>' + money(x.total) + '</b> · To‘langan: <b>' + money(x.paid) +
      '</b> · Qolgan: <b>' + money(x.remain) + '</b></p>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
      '<tr><th style="border:1px solid #999;padding:5px;background:#eee">Sana</th><th style="border:1px solid #999;padding:5px;background:#eee">Amal</th>' +
      '<th style="border:1px solid #999;padding:5px;background:#eee">Summa</th><th style="border:1px solid #999;padding:5px;background:#eee">Izoh</th></tr>' +
      hist.map(h => '<tr><td style="border:1px solid #ccc;padding:5px">' + fmtDate(h.date) + '</td>' +
        '<td style="border:1px solid #ccc;padding:5px">' + (h.type === 'debt' ? 'Qarz' : 'To‘lov') + '</td>' +
        '<td style="border:1px solid #ccc;padding:5px">' + money(h.amount) + '</td>' +
        '<td style="border:1px solid #ccc;padding:5px">' + esc(h.obj.reason || h.obj.note || '') + '</td></tr>').join('') +
      '</table></div>');
  };
})();
