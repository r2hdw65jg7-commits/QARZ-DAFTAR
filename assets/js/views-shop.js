/* =========================================================================
   Qarz Daftar — MAGAZIN VA OMBOR MODULI
   Sotuv (POS), Sotuvlar tarixi, Mahsulotlar, Ombor, Yetkazib beruvchilar
   ========================================================================= */
(function () {
  'use strict';
  const GC = window.GC;
  const esc = GC.esc, money = GC.money, fmtDate = GC.fmtDate;
  const UI = GC.ui;
  UI.pos = { cart: [], q: '', cat: 'all', method: 'naqd', customerId: '' };
  UI.products = { q: '', cat: 'all', filter: 'all', page: 1 };
  UI.sales = { range: 'today', page: 1, method: 'all', custom: { from: '', to: '' } };
  UI.stock = { tab: 'moves', page: 1, q: '' };
  const PER = 25;

  const catName = (id) => { const c = GC.state.categories.find(x => x.id === id); return c ? c.name : '—'; };

  /* =================== SOTUV (POS) =================== */
  GC.views.pos = function () {
    const st = GC.compute(), f = UI.pos, S = GC.state;
    let list = st.products.filter(x => x.p.active !== false);
    if (f.cat !== 'all') list = list.filter(x => x.p.categoryId === f.cat);
    if (f.q) {
      const q = f.q.toLowerCase();
      list = list.filter(x => x.p.name.toLowerCase().includes(q) || (x.p.barcode || '').includes(q));
    }
    list.sort((a, b) => a.p.name.localeCompare(b.p.name, 'uz'));

    const cart = f.cart.map(ci => {
      const pr = st.prodById.get(ci.productId);
      return { ci, pr, sum: ci.qty * ci.price };
    }).filter(x => x.pr);
    const total = cart.reduce((s, x) => s + x.sum, 0);
    const profit = cart.reduce((s, x) => s + (x.ci.price - x.pr.p.costPrice) * x.ci.qty, 0);

    return '' +
      '<div class="page-head"><div><div class="page-title">Sotuv (Kassa)</div>' +
      '<div class="page-sub">Bugungi savdo: <b>' + money(st.shop.todayTotal) + '</b> · Foyda: ' + money(st.shop.todayProfit) + ' · ' + st.shop.todayCount + ' ta chek</div></div>' +
      '<div class="spacer"></div><a class="btn" href="#/sales">🧾 Sotuvlar tarixi</a>' +
      '<button class="btn btn-primary" data-action="new-product">+ Mahsulot</button></div>' +

      '<div class="pos"><div class="panel">' +
      '<div class="panel-head"><input class="input" style="max-width:260px" placeholder="Mahsulot nomi yoki shtrix-kod…" data-action="pos-search" value="' + esc(f.q) + '" autofocus>' +
      '<div class="spacer"></div><select class="select" style="width:auto" data-action="pos-cat">' +
      '<option value="all">Barcha kategoriyalar</option>' +
      S.categories.map(c => '<option value="' + c.id + '"' + (f.cat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') +
      '</select></div>' +
      '<div class="pos-products">' +
      (list.length ? list.map(x =>
        '<div class="p-card' + (x.qty <= 0 ? ' out' : '') + '" data-action="pos-add" data-id="' + x.p.id + '">' +
        '<div class="pn">' + esc(x.p.name) + '</div>' +
        '<div class="pp">' + money(x.p.salePrice) + '</div>' +
        '<div class="ps">Qoldiq: ' + x.qty + ' ' + esc(x.p.unit) + (x.status === 'low' ? ' 🟡' : x.status === 'out' ? ' 🔴' : '') + '</div></div>').join('')
        : '<div class="empty" style="grid-column:1/-1"><div class="big">📦</div>Mahsulot topilmadi.<br>Avval "Mahsulotlar" bo‘limidan mahsulot qo‘shing.</div>') +
      '</div></div>' +

      '<div class="panel"><div class="panel-head"><div class="panel-title">🛒 Savatcha</div><div class="spacer"></div>' +
      (cart.length ? '<button class="btn btn-sm btn-danger" data-action="pos-clear">Tozalash</button>' : '') + '</div>' +
      '<div class="panel-body">' +
      (cart.length ? cart.map(x =>
        '<div class="cart-item"><div class="ci-n">' + esc(x.pr.p.name) + '<div class="muted" style="font-size:11px">' + money(x.ci.price) + ' × ' + x.ci.qty + '</div></div>' +
        '<div class="qty"><button data-action="pos-qty" data-id="' + x.ci.productId + '" data-d="-1">−</button>' +
        '<input type="number" min="1" value="' + x.ci.qty + '" data-action="pos-setqty" data-id="' + x.ci.productId + '">' +
        '<button data-action="pos-qty" data-id="' + x.ci.productId + '" data-d="1">+</button></div>' +
        '<div class="num strong" style="width:95px">' + GC.groupNum(x.sum) + '</div>' +
        '<button class="btn btn-sm btn-danger" data-action="pos-del" data-id="' + x.ci.productId + '">✕</button></div>').join('')
        : '<div class="empty">Savatcha bo‘sh.<br><span class="muted">Mahsulot ustiga bosing.</span></div>') +

      (cart.length ? '<div class="cart-total"><span class="muted">Mahsulotlar:</span><span>' + cart.reduce((s, x) => s + x.ci.qty, 0) + ' dona</span></div>' +
        '<div class="cart-total"><span class="muted">Kutilayotgan foyda:</span><span style="color:var(--ok)">' + money(profit) + '</span></div>' +
        '<div class="cart-total big"><span>JAMI:</span><span>' + money(total) + '</span></div>' +
        '<div class="field" style="margin-top:12px"><label>To‘lov turi</label>' + GC.methodSelect('posMethod', f.method, true) + '</div>' +
        '<div class="field" id="posCustWrap"' + (f.method === 'qarz' ? '' : ' hidden') + '><label>Mijoz (qarzga yozish uchun) *</label>' +
        GC.customerSelect('posCustomer', f.customerId) + '</div>' +
        '<button class="btn btn-success" style="width:100%;justify-content:center;padding:12px" data-action="pos-checkout">✅ Sotuvni yakunlash</button>'
        : '') +
      '</div></div></div>';
  };

  /* =================== SOTUVLAR TARIXI =================== */
  GC.views.sales = function () {
    const S = GC.state, st = GC.compute(), f = UI.sales;
    const r = GC.rangeFor(f.range, f.custom);
    let rows = S.sales.filter(s => !s.canceled && GC.inRange(s.date, r));
    if (f.method !== 'all') rows = rows.filter(s => s.method === f.method);
    rows.sort((a, b) => b.ts - a.ts);
    const pg = GC.paginate(rows, f.page, PER);
    const total = rows.reduce((s, x) => s + x.total, 0);
    const profit = rows.reduce((s, x) => s + (x.total - x.cost), 0);
    const chip = (key, val, label) => '<button class="chip' + (f[key] === val ? ' active' : '') +
      '" data-action="sale-filter" data-key="' + key + '" data-val="' + val + '">' + esc(label) + '</button>';

    return '' +
      '<div class="page-head"><div><div class="page-title">Sotuvlar tarixi</div>' +
      '<div class="page-sub">' + rows.length + ' ta savdo · Tushum: <b>' + money(total) + '</b> · Foyda: <b style="color:var(--ok)">' + money(profit) + '</b></div></div>' +
      '<div class="spacer"></div>' + GC.exportBar('sales') + '<a class="btn btn-primary" href="#/pos">🛒 Yangi sotuv</a></div>' +
      '<div class="panel"><div class="panel-head"><div class="chips">' +
      chip('range', 'all', 'Barcha') + chip('range', 'today', 'Bugun') + chip('range', 'yesterday', 'Kecha') +
      chip('range', 'week', 'Shu hafta') + chip('range', 'month', 'Shu oy') + '</div><div class="spacer"></div>' +
      '<div class="chips">' + chip('method', 'all', 'Barcha turlar') + GC.SALE_METHODS.map(m => chip('method', m.id, m.name)).join('') + '</div></div>' +
      '<div class="panel-body tight"><div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>ID</th><th>Sana</th><th>Mahsulotlar</th><th class="num">Jami</th><th class="num">Foyda</th><th>To‘lov</th><th>Mijoz</th><th>Kassir</th><th>Amallar</th>' +
      '</tr></thead><tbody>' +
      (pg.rows.length ? pg.rows.map(s => {
        const items = S.sale_items.filter(i => i.saleId === s.id);
        const c = s.customerId ? st.custById.get(s.customerId) : null;
        return '<tr><td class="muted mono">#' + esc(s.id.slice(-6).toUpperCase()) + '</td>' +
          '<td class="mono">' + fmtDate(s.date) + ' <span class="muted">' + GC.fmtTime(s.ts) + '</span></td>' +
          '<td>' + esc(items.slice(0, 2).map(i => i.name + '×' + i.qty).join(', ')) + (items.length > 2 ? ' <span class="muted">+' + (items.length - 2) + '</span>' : '') + '</td>' +
          '<td class="num strong">' + money(s.total) + '</td>' +
          '<td class="num" style="color:var(--ok)">' + money(s.total - s.cost) + '</td>' +
          '<td><span class="badge ' + (s.method === 'qarz' ? 'b-red' : 'b-blue') + '">' + esc(GC.methodName(s.method)) + '</span></td>' +
          '<td>' + (c ? '<span class="clickable" data-action="customer-view" data-id="' + c.id + '">' + esc(c.c.name) + '</span>' : '<span class="muted">—</span>') + '</td>' +
          '<td class="muted">' + esc(s.cashier || '') + '</td>' +
          '<td><div class="row" style="gap:4px;flex-wrap:nowrap">' +
          '<button class="btn btn-sm" data-action="sale-view" data-id="' + s.id + '">👁</button>' +
          '<button class="btn btn-sm" data-action="sale-receipt" data-id="' + s.id + '">🧾</button>' +
          '<button class="btn btn-sm btn-danger" data-action="sale-cancel" data-id="' + s.id + '" title="Bekor qilish">↩</button>' +
          '</div></td></tr>';
      }).join('') : '<tr><td colspan="9"><div class="empty"><div class="big">🧾</div>Sotuvlar topilmadi</div></td></tr>') +
      '</tbody></table></div>' + GC.pagerHTML(pg, 'sales') + '</div></div>';
  };

  /* =================== MAHSULOTLAR =================== */
  GC.views.products = function () {
    const S = GC.state, st = GC.compute(), f = UI.products;
    let rows = st.products.slice();
    if (f.cat !== 'all') rows = rows.filter(x => x.p.categoryId === f.cat);
    if (f.filter === 'ok') rows = rows.filter(x => x.status === 'ok');
    else if (f.filter === 'low') rows = rows.filter(x => x.status === 'low');
    else if (f.filter === 'out') rows = rows.filter(x => x.status === 'out');
    if (f.q) {
      const q = f.q.toLowerCase();
      rows = rows.filter(x => x.p.name.toLowerCase().includes(q) || (x.p.barcode || '').includes(q) ||
        catName(x.p.categoryId).toLowerCase().includes(q) || x.p.id.includes(q));
    }
    rows.sort((a, b) => a.p.name.localeCompare(b.p.name, 'uz'));
    const pg = GC.paginate(rows, f.page, PER);
    const chip = (key, val, label) => '<button class="chip' + (f[key] === val ? ' active' : '') +
      '" data-action="prod-filter" data-key="' + key + '" data-val="' + val + '">' + esc(label) + '</button>';

    return '' +
      '<div class="page-head"><div><div class="page-title">Mahsulotlar</div>' +
      '<div class="page-sub">' + st.stock.names + ' nomdagi mahsulot · Ombor qiymati: <b>' + money(st.stock.costValue) + '</b></div></div>' +
      '<div class="spacer"></div>' + GC.exportBar('products') +
      '<button class="btn" data-action="categories">🏷 Kategoriyalar</button>' +
      '<button class="btn btn-primary" data-action="new-product">+ Mahsulot qo‘shish</button></div>' +

      '<div class="panel"><div class="panel-head"><div class="chips">' +
      chip('filter', 'all', 'Barcha') + chip('filter', 'ok', '🟢 Mavjud') + chip('filter', 'low', '🟡 Kam qolgan') + chip('filter', 'out', '🔴 Tugagan') +
      '</div><div class="spacer"></div>' +
      '<input class="input" style="max-width:240px" placeholder="Nomi / shtrix-kod…" data-action="prod-search" value="' + esc(f.q) + '">' +
      '<select class="select" style="width:auto" data-action="prod-cat"><option value="all">Barcha kategoriyalar</option>' +
      S.categories.map(c => '<option value="' + c.id + '"' + (f.cat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></div>' +

      '<div class="panel-body tight"><div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>ID</th><th>Mahsulot</th><th>Kategoriya</th><th class="num">Tannarx</th><th class="num">Sotish</th><th class="num">Foyda</th>' +
      '<th class="num">Qoldiq</th><th class="num">Min.</th><th>Holat</th><th>Amallar</th></tr></thead><tbody>' +
      (pg.rows.length ? pg.rows.map(x =>
        '<tr><td class="muted mono">#' + esc(x.p.id.slice(-6).toUpperCase()) + '</td>' +
        '<td><b>' + esc(x.p.name) + '</b>' + (x.p.barcode ? '<div class="muted" style="font-size:11px">' + esc(x.p.barcode) + '</div>' : '') + '</td>' +
        '<td>' + esc(catName(x.p.categoryId)) + '</td>' +
        '<td class="num">' + money(x.p.costPrice) + '</td>' +
        '<td class="num strong">' + money(x.p.salePrice) + '</td>' +
        '<td class="num" style="color:var(--ok)">' + money(x.p.salePrice - x.p.costPrice) + '</td>' +
        '<td class="num strong">' + x.qty + ' <span class="muted">' + esc(x.p.unit) + '</span></td>' +
        '<td class="num muted">' + (x.p.minStock || 0) + '</td>' +
        '<td>' + GC.stockBadge(x) + '</td>' +
        '<td><div class="row" style="gap:4px;flex-wrap:nowrap">' +
        '<button class="btn btn-sm btn-success" data-action="stock-in" data-id="' + x.p.id + '" title="Kirim">📥</button>' +
        '<button class="btn btn-sm btn-warn" data-action="stock-out" data-id="' + x.p.id + '" title="Chiqim">📤</button>' +
        '<button class="btn btn-sm" data-action="prod-history" data-id="' + x.p.id + '" title="Harakatlar">📊</button>' +
        '<button class="btn btn-sm" data-action="prod-edit" data-id="' + x.p.id + '" title="Tahrirlash">✏️</button>' +
        '<button class="btn btn-sm btn-danger" data-action="prod-delete" data-id="' + x.p.id + '" title="O‘chirish">🗑</button>' +
        '</div></td></tr>').join('')
        : '<tr><td colspan="10"><div class="empty"><div class="big">📦</div>Mahsulot topilmadi</div></td></tr>') +
      '</tbody></table></div>' + GC.pagerHTML(pg, 'products') + '</div></div>';
  };

  /* =================== OMBOR =================== */
  GC.views.stock = function () {
    const S = GC.state, st = GC.compute(), f = UI.stock;
    const tabs = [['moves', 'Ombor harakatlari'], ['in', 'Kirimlar tarixi'], ['inv', 'Inventarizatsiya'], ['low', 'Kam qolgan / tugagan']];
    let body = '';

    if (f.tab === 'moves') {
      let moves = S.stock_movements.filter(m => !m.canceled).slice();
      if (f.q) {
        const q = f.q.toLowerCase();
        moves = moves.filter(m => { const p = S.products.find(x => x.id === m.productId); return p && p.name.toLowerCase().includes(q); });
      }
      moves.sort((a, b) => b.ts - a.ts);
      const pg = GC.paginate(moves, f.page, PER);
      const type = { in: ['🟢 Kirim', 'b-green'], sale: ['🔴 Sotuv', 'b-red'], out: ['🟠 Chiqim', 'b-yellow'], adjust: ['🔵 Tuzatish', 'b-blue'] };
      body = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Vaqt</th><th>Mahsulot</th><th>Turi</th><th class="num">Miqdor</th><th>Izoh</th><th>Kassir</th></tr></thead><tbody>' +
        (pg.rows.length ? pg.rows.map(m => {
          const p = S.products.find(x => x.id === m.productId);
          const t = type[m.type] || ['—', 'b-gray'];
          return '<tr><td class="mono">' + fmtDate(m.date) + ' <span class="muted">' + GC.fmtTime(m.ts) + '</span></td>' +
            '<td><b>' + esc(p ? p.name : '—') + '</b></td>' +
            '<td><span class="badge ' + t[1] + '">' + t[0] + '</span></td>' +
            '<td class="num strong" style="color:' + (m.qty > 0 ? 'var(--ok)' : 'var(--dan)') + '">' + (m.qty > 0 ? '+' : '') + m.qty + '</td>' +
            '<td class="muted">' + esc(m.note || '') + '</td><td class="muted">' + esc(m.cashier || '') + '</td></tr>';
        }).join('') : '<tr><td colspan="6"><div class="empty">Harakatlar yo‘q</div></td></tr>') +
        '</tbody></table></div>' + GC.pagerHTML(pg, 'stock');
    } else if (f.tab === 'in') {
      const pur = S.purchases.slice().sort((a, b) => b.ts - a.ts);
      const pg = GC.paginate(pur, f.page, PER);
      body = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Sana</th><th>Mahsulotlar</th><th class="num">Jami summa</th><th>Yetkazib beruvchi</th><th>Izoh</th><th>Holat</th><th>Amallar</th></tr></thead><tbody>' +
        (pg.rows.length ? pg.rows.map(p => {
          const items = S.purchase_items.filter(i => i.purchaseId === p.id);
          const sup = S.suppliers.find(s => s.id === p.supplierId);
          return '<tr' + (p.canceled ? ' style="opacity:.5"' : '') + '><td class="mono">' + fmtDate(p.date) + '</td>' +
            '<td>' + esc(items.map(i => { const pr = S.products.find(x => x.id === i.productId); return (pr ? pr.name : '?') + '×' + i.qty; }).join(', ')) + '</td>' +
            '<td class="num strong">' + money(p.total) + '</td>' +
            '<td>' + esc(sup ? sup.name : '—') + '</td><td class="muted">' + esc(p.note || '') + '</td>' +
            '<td>' + (p.canceled ? '<span class="badge b-red">Bekor qilingan</span>' : '<span class="badge b-green">Faol</span>') + '</td>' +
            '<td>' + (p.canceled ? '' : '<button class="btn btn-sm btn-danger" data-action="purchase-cancel" data-id="' + p.id + '">↩ Bekor</button>') + '</td></tr>';
        }).join('') : '<tr><td colspan="7"><div class="empty">Kirimlar yo‘q</div></td></tr>') +
        '</tbody></table></div>' + GC.pagerHTML(pg, 'stock');
    } else if (f.tab === 'inv') {
      const inv = S.inventory_adjustments.slice().sort((a, b) => b.ts - a.ts);
      body = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Sana</th><th>Mahsulot</th><th class="num">Tizimda</th><th class="num">Haqiqiy</th><th class="num">Farq</th><th>Sabab</th><th>Kassir</th></tr></thead><tbody>' +
        (inv.length ? inv.map(a => {
          const p = S.products.find(x => x.id === a.productId);
          return '<tr><td class="mono">' + fmtDate(a.date) + ' <span class="muted">' + GC.fmtTime(a.ts) + '</span></td>' +
            '<td><b>' + esc(p ? p.name : '—') + '</b></td><td class="num">' + a.systemQty + '</td><td class="num">' + a.realQty + '</td>' +
            '<td class="num strong" style="color:' + (a.diff < 0 ? 'var(--dan)' : a.diff > 0 ? 'var(--ok)' : 'var(--tx3)') + '">' + (a.diff > 0 ? '+' : '') + a.diff + '</td>' +
            '<td>' + esc(a.reason || '—') + '</td><td class="muted">' + esc(a.cashier || '') + '</td></tr>';
        }).join('') : '<tr><td colspan="7"><div class="empty">Inventarizatsiya o‘tkazilmagan</div></td></tr>') + '</tbody></table></div>';
    } else {
      const rows = st.products.filter(x => x.status !== 'ok').sort((a, b) => a.qty - b.qty);
      body = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Mahsulot</th><th class="num">Qoldiq</th><th class="num">Minimal</th><th>Holat</th><th>Amallar</th></tr></thead><tbody>' +
        (rows.length ? rows.map(x => '<tr><td><b>' + esc(x.p.name) + '</b></td><td class="num strong">' + x.qty + '</td>' +
          '<td class="num muted">' + (x.p.minStock || 0) + '</td><td>' + GC.stockBadge(x) + '</td>' +
          '<td><button class="btn btn-sm btn-success" data-action="stock-in" data-id="' + x.p.id + '">📥 Kirim qilish</button></td></tr>').join('')
          : '<tr><td colspan="5"><div class="empty">✅ Barcha mahsulotlar yetarli</div></td></tr>') + '</tbody></table></div>';
    }

    return '' +
      '<div class="page-head"><div><div class="page-title">Ombor</div>' +
      '<div class="page-sub">' + st.stock.names + ' nomda · ' + st.stock.units + ' dona · Kam qolgan: ' + st.stock.low + ' · Tugagan: ' + st.stock.out + '</div></div>' +
      '<div class="spacer"></div>' +
      '<button class="btn btn-success" data-action="stock-in">📥 Omborga kirim</button>' +
      '<button class="btn btn-warn" data-action="inventory">🔍 Inventarizatsiya</button></div>' +
      '<div class="cards">' +
      GC.statCard('Jami mahsulot', st.stock.names + ' nom', st.stock.units + ' dona', '', '📦') +
      GC.statCard('Ombor tannarxi', money(st.stock.costValue), 'Sotib olingan narxda', '', '💰') +
      GC.statCard('Sotuv qiymati', money(st.stock.saleValue), 'Kutilayotgan foyda: ' + money(st.stock.potentialProfit), 'ok', '📈') +
      GC.statCard('Bugungi kirim', money(st.todayIn), 'Bugun qabul qilingan', 'info', '📥') +
      GC.statCard('Kam qolgan', st.stock.low + ' ta', 'Minimal qoldiqdan past', 'warn', '🟡') +
      GC.statCard('Tugagan', st.stock.out + ' ta', 'Qoldiq 0', 'dan', '🔴') +
      '</div>' +
      '<div class="panel"><div class="tabs">' +
      tabs.map(t => '<div class="tab' + (f.tab === t[0] ? ' active' : '') + '" data-action="stock-tab" data-tab="' + t[0] + '">' + t[1] + '</div>').join('') +
      '</div>' + (f.tab === 'moves' ? '<div class="panel-head"><input class="input" style="max-width:260px" placeholder="Mahsulot bo‘yicha…" data-action="stock-search" value="' + esc(f.q) + '"></div>' : '') +
      '<div class="panel-body tight">' + body + '</div></div>';
  };

  /* =================== YETKAZIB BERUVCHILAR =================== */
  GC.views.suppliers = function () {
    const S = GC.state;
    return '<div class="page-head"><div><div class="page-title">Yetkazib beruvchilar</div>' +
      '<div class="page-sub">' + S.suppliers.length + ' ta hamkor</div></div><div class="spacer"></div>' +
      '<button class="btn btn-primary" data-action="new-supplier">+ Yetkazib beruvchi</button></div>' +
      '<div class="panel"><div class="panel-body tight"><div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>Nomi</th><th>Telefon</th><th>Manzil</th><th class="num">Mahsulotlar</th><th class="num">Jami kirim</th><th>Izoh</th><th>Amallar</th></tr></thead><tbody>' +
      (S.suppliers.length ? S.suppliers.map(s => {
        const prods = S.products.filter(p => p.supplierId === s.id);
        const total = S.purchases.filter(p => !p.canceled && p.supplierId === s.id).reduce((a, b) => a + b.total, 0);
        return '<tr><td><b>' + esc(s.name) + '</b></td><td class="mono">' + esc(GC.fmtPhone(s.phone)) + '</td>' +
          '<td>' + esc(s.address || '—') + '</td><td class="num">' + prods.length + ' ta</td>' +
          '<td class="num strong">' + money(total) + '</td><td class="muted">' + esc(s.note || '—') + '</td>' +
          '<td><div class="row" style="gap:4px"><button class="btn btn-sm" data-action="sup-edit" data-id="' + s.id + '">✏️</button>' +
          '<button class="btn btn-sm btn-danger" data-action="sup-delete" data-id="' + s.id + '">🗑</button></div></td></tr>';
      }).join('') : '<tr><td colspan="7"><div class="empty"><div class="big">🚚</div>Yetkazib beruvchilar yo‘q</div></td></tr>') +
      '</tbody></table></div></div></div>';
  };

  /* =================== AMALLAR =================== */
  const A = GC.actions;

  /* --- POS --- */
  GC.inputHandlers['pos-search'] = (el) => { UI.pos.q = el.value; GC.rerender(true); };
  GC.inputHandlers['pos-cat'] = (el) => { UI.pos.cat = el.value; GC.rerender(); };
  GC.inputHandlers['posMethod'] = (el) => {
    UI.pos.method = el.value;
    const w = document.getElementById('posCustWrap');
    if (w) w.hidden = el.value !== 'qarz';
  };
  GC.inputHandlers['posCustomer'] = (el) => { UI.pos.customerId = el.value; };
  GC.inputHandlers['pos-setqty'] = (el) => {
    const it = UI.pos.cart.find(c => c.productId === el.dataset.id);
    if (it) { it.qty = Math.max(1, parseInt(el.value, 10) || 1); GC.rerender(); }
  };
  GC.inputHandlers['prod-search'] = (el) => { UI.products.q = el.value; UI.products.page = 1; GC.rerender(true); };
  GC.inputHandlers['prod-cat'] = (el) => { UI.products.cat = el.value; UI.products.page = 1; GC.rerender(); };
  GC.inputHandlers['stock-search'] = (el) => { UI.stock.q = el.value; UI.stock.page = 1; GC.rerender(true); };

  A['pos-add'] = (el) => {
    const st = GC.compute(), x = st.prodById.get(el.dataset.id);
    if (!x) return;
    const inCart = UI.pos.cart.find(c => c.productId === x.p.id);
    const want = (inCart ? inCart.qty : 0) + 1;
    if (!GC.state.settings.allowNegativeStock && want > x.qty) {
      GC.toast('❌ "' + x.p.name + '" omborda yetarli emas (qoldiq: ' + x.qty + ')', 'err');
      return;
    }
    if (inCart) inCart.qty = want;
    else UI.pos.cart.push({ productId: x.p.id, qty: 1, price: x.p.salePrice });
    GC.rerender();
  };
  A['pos-qty'] = (el) => {
    const it = UI.pos.cart.find(c => c.productId === el.dataset.id); if (!it) return;
    const d = +el.dataset.d;
    const x = GC.compute().prodById.get(it.productId);
    if (d > 0 && !GC.state.settings.allowNegativeStock && it.qty + d > x.qty) {
      GC.toast('Omborda faqat ' + x.qty + ' dona bor', 'warn'); return;
    }
    it.qty += d;
    if (it.qty <= 0) UI.pos.cart = UI.pos.cart.filter(c => c.productId !== it.productId);
    GC.rerender();
  };
  A['pos-del'] = (el) => { UI.pos.cart = UI.pos.cart.filter(c => c.productId !== el.dataset.id); GC.rerender(); };
  A['pos-clear'] = () => { UI.pos.cart = []; GC.rerender(); };
  A['pos-checkout'] = async () => {
    const f = UI.pos;
    if (!f.cart.length) { GC.toast('Savatcha bo‘sh', 'warn'); return; }
    const method = (document.querySelector('[name=posMethod]') || {}).value || f.method;
    const customerId = (document.querySelector('[name=posCustomer]') || {}).value || '';
    if (method === 'qarz' && !customerId) { GC.toast('Qarzga sotish uchun mijozni tanlang', 'err'); return; }
    const st = GC.compute();
    if (!GC.state.settings.allowNegativeStock) {
      for (const ci of f.cart) {
        const x = st.prodById.get(ci.productId);
        if (!x || ci.qty > x.qty) { GC.toast('❌ ' + (x ? x.p.name : 'Mahsulot') + ' omborda yetarli emas', 'err'); return; }
      }
    }
    const total = f.cart.reduce((s, c) => s + c.qty * c.price, 0);
    const ok = await GC.confirm({
      title: 'Sotuvni yakunlash', okText: 'Tasdiqlash',
      html: 'Jami: <b>' + money(total) + '</b><br>To‘lov turi: <b>' + esc(GC.methodName(method)) + '</b>' +
        (method === 'qarz' ? '<br><span style="color:var(--warn)">Bu summa mijoz qarziga qo‘shiladi.</span>' : '')
    });
    if (!ok) return;
    const sale = GC.addSale({ items: f.cart, method, customerId: method === 'qarz' ? customerId : (customerId || null) });
    UI.pos.cart = []; UI.pos.method = 'naqd'; UI.pos.customerId = '';
    GC.rerender();
    if (method === 'qarz') {
      const c = GC.compute().custById.get(customerId);
      GC.toast('✅ Sotuv qarzga yozildi. ' + c.c.name + ' ning qarzi: ' + money(c.remain), 'ok', 5000);
    } else {
      GC.toast('✅ Sotuv yakunlandi: ' + money(total) + ' kassaga tushdi', 'ok', 4000);
    }
    GC.printReceipt(GC.saleReceipt(sale));
  };

  /* --- Sotuv tarixi --- */
  A['sale-filter'] = (el) => { UI.sales[el.dataset.key] = el.dataset.val; UI.sales.page = 1; GC.rerender(); };
  A['sale-view'] = (el) => {
    const S = GC.state, s = S.sales.find(x => x.id === el.dataset.id); if (!s) return;
    const items = S.sale_items.filter(i => i.saleId === s.id);
    const c = s.customerId ? S.customers.find(x => x.id === s.customerId) : null;
    GC.modal({
      title: '🧾 Sotuv #' + s.id.slice(-6).toUpperCase(),
      body: '<div class="table-wrap"><table class="tbl"><thead><tr><th>Mahsulot</th><th class="num">Miqdor</th><th class="num">Narx</th>' +
        '<th class="num">Tannarx</th><th class="num">Jami</th><th class="num">Foyda</th></tr></thead><tbody>' +
        items.map(i => '<tr><td>' + esc(i.name) + '</td><td class="num">' + i.qty + '</td><td class="num">' + money(i.price) + '</td>' +
          '<td class="num muted">' + money(i.cost) + '</td><td class="num strong">' + money(i.qty * i.price) + '</td>' +
          '<td class="num" style="color:var(--ok)">' + money((i.price - i.cost) * i.qty) + '</td></tr>').join('') +
        '</tbody></table></div>' +
        '<div class="kv"><span class="k">Jami</span><span class="v">' + money(s.total) + '</span></div>' +
        '<div class="kv"><span class="k">Foyda</span><span class="v" style="color:var(--ok)">' + money(s.total - s.cost) + '</span></div>' +
        '<div class="kv"><span class="k">To‘lov turi</span><span class="v">' + esc(GC.methodName(s.method)) + '</span></div>' +
        '<div class="kv"><span class="k">Mijoz</span><span class="v">' + esc(c ? c.name : '—') + '</span></div>' +
        '<div class="kv"><span class="k">Sana</span><span class="v">' + fmtDate(s.date) + ' ' + GC.fmtTime(s.ts) + '</span></div>' +
        '<div class="kv"><span class="k">Kassir</span><span class="v">' + esc(s.cashier || '') + '</span></div>',
      footer: '<button class="btn" data-action="sale-receipt" data-id="' + s.id + '">🧾 Chek chiqarish</button><button class="btn" data-mclose>Yopish</button>'
    });
  };
  A['sale-receipt'] = (el) => {
    const s = GC.state.sales.find(x => x.id === el.dataset.id); if (!s) return;
    GC.printReceipt(GC.saleReceipt(s));
  };
  A['sale-cancel'] = async (el) => {
    const s = GC.state.sales.find(x => x.id === el.dataset.id); if (!s) return;
    const reason = await GC.confirm({
      title: 'Sotuvni bekor qilish', danger: true, okText: 'Bekor qilish', reason: true,
      html: '<b>' + money(s.total) + '</b> summadagi sotuv bekor qilinsinmi?<br>' +
        '<span class="muted">Mahsulotlar omborga qaytariladi' + (s.debtId ? ', mijoz qarzi kamayadi' : '') + '. Yozuv audit logda saqlanadi.</span>'
    });
    if (!reason) return;
    GC.cancelSale(s.id, reason === true ? '' : reason);
    GC.toast('Sotuv bekor qilindi, ombor tiklandi', 'ok');
  };

  /* --- Mahsulot --- */
  A['prod-filter'] = (el) => { UI.products[el.dataset.key] = el.dataset.val; UI.products.page = 1; GC.rerender(); };
  function productForm(p) {
    const S = GC.state;
    return '<div class="field"><label>Mahsulot nomi *</label><input class="input" name="name" value="' + esc(p ? p.name : '') + '" placeholder="Coca Cola 0.5L" data-autofocus><div class="err"></div></div>' +
      '<div class="grid2"><div class="field"><label>Kategoriya</label><select class="select" name="categoryId">' +
      S.categories.map(c => '<option value="' + c.id + '"' + (p && p.categoryId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Birlik turi</label><select class="select" name="unit">' +
      GC.UNITS.map(u => '<option value="' + u + '"' + (p && p.unit === u ? ' selected' : '') + '>' + u + '</option>').join('') + '</select></div></div>' +
      '<div class="grid2"><div class="field"><label>Kirim narxi (tannarx) *</label><input class="input" name="costPrice" data-money value="' + (p ? GC.groupNum(p.costPrice) : '') + '" placeholder="8 000"><div class="err"></div></div>' +
      '<div class="field"><label>Sotish narxi *</label><input class="input" name="salePrice" data-money value="' + (p ? GC.groupNum(p.salePrice) : '') + '" placeholder="12 000"><div class="err"></div></div></div>' +
      '<div class="grid2">' + (p ? '' : '<div class="field"><label>Boshlang‘ich qoldiq</label><input class="input" type="number" name="startQty" value="0" min="0"></div>') +
      '<div class="field"><label>Minimal qoldiq (ogohlantirish uchun)</label><input class="input" type="number" name="minStock" value="' + (p ? (p.minStock || 0) : 5) + '" min="0"><div class="err"></div></div></div>' +
      '<div class="grid2"><div class="field"><label>Shtrix-kod (ixtiyoriy)</label><input class="input" name="barcode" value="' + esc(p ? p.barcode : '') + '"></div>' +
      '<div class="field"><label>Yetkazib beruvchi</label><select class="select" name="supplierId"><option value="">—</option>' +
      S.suppliers.map(s => '<option value="' + s.id + '"' + (p && p.supplierId === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>').join('') + '</select></div></div>' +
      '<div class="field"><label>Izoh</label><input class="input" name="note" value="' + esc(p ? p.note : '') + '"></div>';
  }
  A['new-product'] = () => {
    const m = GC.modal({
      title: '📦 Yangi mahsulot', size: 'wide', body: productForm(null),
      footer: '<button class="btn" data-mclose>Bekor qilish</button><button class="btn btn-primary" data-save>Saqlash</button>'
    });
    m.q('[data-save]').onclick = () => {
      const v = m.values(); const e = GC.V.product(v);
      if (!GC.showErrors(m.el, e)) return;
      GC.addProduct(v); m.close(); GC.toast('Mahsulot qo‘shildi', 'ok');
    };
  };
  A['prod-edit'] = (el) => {
    const p = GC.state.products.find(x => x.id === el.dataset.id); if (!p) return;
    const m = GC.modal({
      title: '✏️ Mahsulotni tahrirlash', size: 'wide', body: productForm(p),
      footer: '<button class="btn" data-mclose>Bekor qilish</button><button class="btn btn-primary" data-save>Saqlash</button>'
    });
    m.q('[data-save]').onclick = () => {
      const v = m.values(); const e = GC.V.product(v);
      if (!GC.showErrors(m.el, e)) return;
      GC.updateProduct(p.id, v); m.close(); GC.toast('Mahsulot yangilandi', 'ok');
    };
  };
  A['prod-delete'] = async (el) => {
    const p = GC.state.products.find(x => x.id === el.dataset.id); if (!p) return;
    const ok = await GC.confirm({
      title: 'Mahsulotni o‘chirish', danger: true, okText: 'O‘chirish',
      html: '<b>' + esc(p.name) + '</b> o‘chirilsinmi?<br><span class="muted">Sotuv tarixi bo‘lsa, mahsulot arxivga o‘tkaziladi (tarix buzilmaydi).</span>'
    });
    if (!ok) return;
    const r = GC.deleteProduct(p.id);
    GC.toast(r === 'archived' ? 'Mahsulot arxivlandi (sotuv tarixi saqlandi)' : 'Mahsulot o‘chirildi', 'ok');
  };
  A['prod-history'] = (el) => {
    const S = GC.state, x = GC.compute().prodById.get(el.dataset.id); if (!x) return;
    const moves = S.stock_movements.filter(m => m.productId === x.p.id && !m.canceled).sort((a, b) => b.ts - a.ts).slice(0, 100);
    const sold = S.sale_items.filter(i => i.productId === x.p.id);
    const soldQty = sold.reduce((s, i) => s + i.qty, 0);
    const profit = sold.reduce((s, i) => s + (i.price - i.cost) * i.qty, 0);
    const type = { in: ['🟢 Kirim', 'b-green'], sale: ['🔴 Sotuv', 'b-red'], out: ['🟠 Chiqim', 'b-yellow'], adjust: ['🔵 Tuzatish', 'b-blue'] };
    GC.modal({
      title: '📊 ' + x.p.name + ' — ombor harakatlari', size: 'wide',
      body: '<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">' +
        GC.statCard('Joriy qoldiq', x.qty + ' ' + x.p.unit, '', x.status === 'out' ? 'dan' : x.status === 'low' ? 'warn' : 'ok') +
        GC.statCard('Sotilgan', soldQty + ' ' + x.p.unit) +
        GC.statCard('Olingan foyda', money(profit), '', 'ok') +
        GC.statCard('Ombor qiymati', money(x.costValue)) + '</div>' +
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>Vaqt</th><th>Turi</th><th class="num">Miqdor</th><th>Izoh</th></tr></thead><tbody>' +
        (moves.length ? moves.map(m => { const t = type[m.type] || ['—', 'b-gray'];
          return '<tr><td class="mono">' + fmtDate(m.date) + ' ' + GC.fmtTime(m.ts) + '</td><td><span class="badge ' + t[1] + '">' + t[0] + '</span></td>' +
            '<td class="num strong" style="color:' + (m.qty > 0 ? 'var(--ok)' : 'var(--dan)') + '">' + (m.qty > 0 ? '+' : '') + m.qty + '</td>' +
            '<td class="muted">' + esc(m.note || '') + '</td></tr>'; }).join('')
          : '<tr><td colspan="4"><div class="empty">Harakatlar yo‘q</div></td></tr>') + '</tbody></table></div>',
      footer: '<button class="btn" data-mclose>Yopish</button>'
    });
  };

  /* --- Kategoriyalar --- */
  A['categories'] = () => {
    const render = () => GC.state.categories.map(c =>
      '<div class="kv"><span class="k">' + esc(c.name) + ' <span class="muted">(' +
      GC.state.products.filter(p => p.categoryId === c.id).length + ' mahsulot)</span></span>' +
      '<span class="v"><button class="btn btn-sm" data-cedit="' + c.id + '">✏️</button> ' +
      '<button class="btn btn-sm btn-danger" data-cdel="' + c.id + '">🗑</button></span></div>').join('');
    const m = GC.modal({
      title: '🏷 Kategoriyalar',
      body: '<div data-list>' + render() + '</div>' +
        '<div class="row" style="margin-top:14px"><input class="input" name="newCat" placeholder="Yangi kategoriya nomi" style="flex:1">' +
        '<button class="btn btn-primary" data-add>Qo‘shish</button></div>',
      footer: '<button class="btn" data-mclose>Yopish</button>'
    });
    const refresh = () => { m.q('[data-list]').innerHTML = render(); bind(); };
    function bind() {
      m.qa('[data-cedit]').forEach(b => b.onclick = () => {
        const c = GC.state.categories.find(x => x.id === b.dataset.cedit);
        const name = prompt('Kategoriya nomi:', c.name);
        if (name && name.trim()) { GC.updateCategory(c.id, name.trim()); refresh(); }
      });
      m.qa('[data-cdel]').forEach(b => b.onclick = () => {
        if (!GC.deleteCategory(b.dataset.cdel)) GC.toast('Bu kategoriyada mahsulotlar bor — o‘chirib bo‘lmaydi', 'err');
        else { GC.toast('Kategoriya o‘chirildi', 'ok'); refresh(); }
      });
    }
    bind();
    m.q('[data-add]').onclick = () => {
      const i = m.q('[name=newCat]');
      if (!i.value.trim()) { GC.toast('Kategoriya nomini kiriting', 'err'); return; }
      GC.addCategory(i.value.trim()); i.value = ''; refresh(); GC.toast('Kategoriya qo‘shildi', 'ok');
    };
  };

  /* --- Ombor kirim / chiqim / inventarizatsiya --- */
  A['stock-tab'] = (el) => { UI.stock.tab = el.dataset.tab; UI.stock.page = 1; GC.rerender(); };
  A['stock-in'] = (el) => {
    const S = GC.state;
    if (!S.products.length) { GC.toast('Avval mahsulot qo‘shing', 'warn'); return; }
    const preId = el && el.dataset ? el.dataset.id : '';
    const rowHTML = (i) => '<div class="row" data-prow style="margin-bottom:8px;flex-wrap:nowrap">' +
      '<select class="select" data-p style="flex:2">' + S.products.filter(p => p.active !== false).map(p =>
        '<option value="' + p.id + '"' + (p.id === preId && i === 0 ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select>' +
      '<input class="input" type="number" data-q min="1" value="1" placeholder="Miqdor" style="width:90px">' +
      '<input class="input" data-c data-money placeholder="Narx" style="width:130px">' +
      '<button class="btn btn-danger btn-sm" data-prem>✕</button></div>';
    const m = GC.modal({
      title: '📥 Omborga kirim', size: 'wide',
      body: '<div class="grid2"><div class="field"><label>Yetkazib beruvchi</label><select class="select" name="supplierId"><option value="">—</option>' +
        S.suppliers.map(s => '<option value="' + s.id + '">' + esc(s.name) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>Sana</label><input class="input" type="date" name="date" value="' + GC.todayISO() + '"></div></div>' +
        '<label style="font-size:12px;color:var(--tx2);font-weight:600">Mahsulotlar</label>' +
        '<div data-rows>' + rowHTML(0) + '</div>' +
        '<button class="btn btn-sm" data-addrow>+ Qator qo‘shish</button>' +
        '<div class="field" style="margin-top:12px"><label>Izoh</label><input class="input" name="note" placeholder="Ixtiyoriy"></div>' +
        '<div class="kv"><span class="k">Jami summa</span><span class="v" data-total>0 so‘m</span></div>',
      footer: '<button class="btn" data-mclose>Bekor qilish</button><button class="btn btn-success" data-save>💾 Kirimni saqlash</button>'
    });
    function fillCost(row) {
      const pid = row.querySelector('[data-p]').value;
      const p = S.products.find(x => x.id === pid);
      const c = row.querySelector('[data-c]');
      if (p && !c.value) c.value = GC.groupNum(p.costPrice);
    }
    function recalc() {
      let total = 0;
      m.qa('[data-prow]').forEach(r => {
        total += (parseInt(r.querySelector('[data-q]').value, 10) || 0) * (GC.parseMoney(r.querySelector('[data-c]').value) || 0);
      });
      m.q('[data-total]').textContent = money(total);
    }
    function bindRow(r) {
      r.querySelector('[data-p]').onchange = () => { r.querySelector('[data-c]').value = ''; fillCost(r); recalc(); };
      r.querySelector('[data-prem]').onclick = () => { if (m.qa('[data-prow]').length > 1) { r.remove(); recalc(); } };
      r.querySelectorAll('input').forEach(i => i.addEventListener('input', recalc));
      fillCost(r); GC.initMoneyInputs(r);
    }
    m.qa('[data-prow]').forEach(bindRow);
    m.q('[data-addrow]').onclick = () => {
      const d = document.createElement('div'); d.innerHTML = rowHTML(1);
      const r = d.firstChild; m.q('[data-rows]').appendChild(r); bindRow(r); recalc();
    };
    recalc();
    m.q('[data-save]').onclick = () => {
      const items = [];
      let bad = false;
      m.qa('[data-prow]').forEach(r => {
        const qty = parseInt(r.querySelector('[data-q]').value, 10) || 0;
        const cost = GC.parseMoney(r.querySelector('[data-c]').value);
        if (qty <= 0) bad = true;
        if (isNaN(cost) || cost < 0) bad = true;
        items.push({ productId: r.querySelector('[data-p]').value, qty, cost: cost || 0 });
      });
      if (bad || !items.length) { GC.toast('Miqdor va narxni to‘g‘ri kiriting (0 dan katta)', 'err'); return; }
      const v = m.values();
      const pur = GC.addPurchase({ supplierId: v.supplierId, date: v.date, note: v.note, items });
      m.close();
      GC.toast('✅ Kirim saqlandi: ' + money(pur.total) + ' · Ombor yangilandi', 'ok', 4000);
    };
  };
  A['stock-out'] = (el) => {
    const x = GC.compute().prodById.get(el.dataset.id); if (!x) return;
    const m = GC.modal({
      title: '📤 Chiqim — ' + x.p.name,
      body: '<div class="kv"><span class="k">Joriy qoldiq</span><span class="v">' + x.qty + ' ' + esc(x.p.unit) + '</span></div>' +
        '<div class="field" style="margin-top:12px"><label>Chiqim miqdori *</label><input class="input" type="number" name="qty" min="1" value="1" data-autofocus><div class="err"></div></div>' +
        '<div class="field"><label>Sabab *</label><input class="input" name="reason" placeholder="Masalan: sinib qoldi / yaroqsiz / ichki ehtiyoj"><div class="err"></div></div>',
      footer: '<button class="btn" data-mclose>Bekor qilish</button><button class="btn btn-warn" data-save>Saqlash</button>'
    });
    m.q('[data-save]').onclick = () => {
      const v = m.values();
      const q = parseInt(v.qty, 10);
      const e = {};
      if (!q || q <= 0) e.qty = 'Miqdorni to‘g‘ri kiriting';
      else if (q > x.qty && !GC.state.settings.allowNegativeStock) e.qty = 'Omborda faqat ' + x.qty + ' ' + x.p.unit + ' bor';
      if (!String(v.reason || '').trim()) e.reason = 'Sababni kiriting';
      if (!GC.showErrors(m.el, e)) return;
      GC.stockOut(x.p.id, q, v.reason); m.close(); GC.toast('Chiqim saqlandi', 'ok');
    };
  };
  A['inventory'] = () => {
    const st = GC.compute();
    if (!st.products.length) { GC.toast('Mahsulotlar yo‘q', 'warn'); return; }
    const m = GC.modal({
      title: '🔍 Inventarizatsiya', size: 'wide',
      body: '<div class="muted" style="margin-bottom:10px">Omborni sanab chiqing va haqiqiy qoldiqni kiriting. Faqat farqi bor qatorlar saqlanadi.</div>' +
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>Mahsulot</th><th class="num">Tizimda</th><th>Haqiqiy</th><th>Sabab</th></tr></thead><tbody>' +
        st.products.map(x => '<tr data-irow data-id="' + x.p.id + '"><td><b>' + esc(x.p.name) + '</b></td>' +
          '<td class="num" data-sys>' + x.qty + '</td>' +
          '<td><input class="input" type="number" data-real value="' + x.qty + '" style="width:90px"></td>' +
          '<td><input class="input" data-reason placeholder="Farq sababi"></td></tr>').join('') +
        '</tbody></table></div>',
      footer: '<button class="btn" data-mclose>Bekor qilish</button><button class="btn btn-warn" data-save>💾 Inventarizatsiyani saqlash</button>'
    });
    m.q('[data-save]').onclick = async () => {
      const changes = [];
      m.qa('[data-irow]').forEach(r => {
        const sys = parseInt(r.querySelector('[data-sys]').textContent, 10);
        const real = parseInt(r.querySelector('[data-real]').value, 10);
        if (!isNaN(real) && real !== sys) changes.push({ id: r.dataset.id, real, reason: r.querySelector('[data-reason]').value.trim() });
      });
      if (!changes.length) { GC.toast('Farq topilmadi — hammasi to‘g‘ri 👍', 'ok'); m.close(); return; }
      const ok = await GC.confirm({
        title: 'Inventarizatsiyani tasdiqlang', okText: 'Tasdiqlash',
        html: changes.length + ' ta mahsulotda farq aniqlandi. Ombor qoldig‘i tuzatiladi.'
      });
      if (!ok) return;
      changes.forEach(c => GC.inventoryAdjust(c.id, c.real, c.reason));
      m.close(); GC.toast('✅ Inventarizatsiya saqlandi: ' + changes.length + ' ta tuzatish', 'ok');
    };
  };
  A['purchase-cancel'] = async (el) => {
    const p = GC.state.purchases.find(x => x.id === el.dataset.id); if (!p) return;
    const reason = await GC.confirm({
      title: 'Kirimni bekor qilish', danger: true, okText: 'Bekor qilish', reason: true,
      html: '<b>' + money(p.total) + '</b> summadagi kirim bekor qilinsinmi? Ombor qoldig‘i kamayadi.'
    });
    if (!reason) return;
    GC.cancelPurchase(p.id, reason === true ? '' : reason);
    GC.toast('Kirim bekor qilindi', 'ok');
  };

  /* --- Yetkazib beruvchilar --- */
  function supplierForm(s) {
    return '<div class="field"><label>Nomi *</label><input class="input" name="name" value="' + esc(s ? s.name : '') + '" data-autofocus><div class="err"></div></div>' +
      '<div class="grid2"><div class="field"><label>Telefon</label><input class="input" name="phone" value="' + esc(s ? s.phone : '') + '"><div class="err"></div></div>' +
      '<div class="field"><label>Manzil</label><input class="input" name="address" value="' + esc(s ? s.address : '') + '"></div></div>' +
      '<div class="field"><label>Izoh</label><input class="input" name="note" value="' + esc(s ? s.note : '') + '"></div>';
  }
  A['new-supplier'] = () => {
    const m = GC.modal({
      title: '🚚 Yangi yetkazib beruvchi', body: supplierForm(null),
      footer: '<button class="btn" data-mclose>Bekor qilish</button><button class="btn btn-primary" data-save>Saqlash</button>'
    });
    m.q('[data-save]').onclick = () => {
      const v = m.values(); const e = {};
      if (!String(v.name || '').trim()) e.name = 'Nomini kiriting';
      if (v.phone && !GC.validPhone(v.phone)) e.phone = 'Telefon raqami noto‘g‘ri';
      if (!GC.showErrors(m.el, e)) return;
      GC.addSupplier(v); m.close(); GC.toast('Yetkazib beruvchi qo‘shildi', 'ok');
    };
  };
  A['sup-edit'] = (el) => {
    const s = GC.state.suppliers.find(x => x.id === el.dataset.id); if (!s) return;
    const m = GC.modal({
      title: '✏️ Tahrirlash', body: supplierForm(s),
      footer: '<button class="btn" data-mclose>Bekor qilish</button><button class="btn btn-primary" data-save>Saqlash</button>'
    });
    m.q('[data-save]').onclick = () => {
      const v = m.values(); const e = {};
      if (!String(v.name || '').trim()) e.name = 'Nomini kiriting';
      if (v.phone && !GC.validPhone(v.phone)) e.phone = 'Telefon raqami noto‘g‘ri';
      if (!GC.showErrors(m.el, e)) return;
      GC.updateSupplier(s.id, v); m.close(); GC.toast('Yangilandi', 'ok');
    };
  };
  A['sup-delete'] = async (el) => {
    const ok = await GC.confirm({ title: 'O‘chirish', danger: true, okText: 'O‘chirish', text: 'Yetkazib beruvchi o‘chirilsinmi?' });
    if (!ok) return;
    if (!GC.deleteSupplier(el.dataset.id)) GC.toast('Bunga bog‘langan mahsulot yoki kirim bor — o‘chirib bo‘lmaydi', 'err', 4500);
    else GC.toast('O‘chirildi', 'ok');
  };
})();
