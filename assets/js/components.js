/* =========================================================================
   Qarz Daftar — UI KOMPONENTLARI
   Toast, Modal, Confirm, Forma yordamchilari, Jadval, Grafiklar, Chek
   ========================================================================= */
(function () {
  'use strict';
  const GC = window.GC;
  const esc = GC.esc, money = GC.money;

  /* ---------------- Event bus ---------------- */
  const listeners = {};
  GC.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  GC.emit = (ev, data) => { (listeners[ev] || []).forEach(f => { try { f(data); } catch (e) { console.error(e); } }); };

  /* ---------------- Toast ---------------- */
  GC.toast = function (msg, type, ms) {
    const root = document.getElementById('toastRoot');
    if (!root) return;
    const d = document.createElement('div');
    d.className = 'toast ' + (type || '');
    d.innerHTML = esc(msg);
    root.appendChild(d);
    setTimeout(() => {
      d.style.transition = '.25s'; d.style.opacity = '0'; d.style.transform = 'translateX(20px)';
      setTimeout(() => d.remove(), 260);
    }, ms || 3000);
  };

  /* ---------------- Modal ---------------- */
  const stack = [];
  GC.modal = function (opt) {
    const root = document.getElementById('modalRoot');
    const wrap = document.createElement('div');
    wrap.className = 'modal ' + (opt.size || '');
    wrap.innerHTML =
      '<div class="modal-head"><div class="modal-title">' + esc(opt.title || '') + '</div>' +
      '<div class="spacer"></div><button class="icon-btn" data-mclose>✕</button></div>' +
      '<div class="modal-body">' + (opt.body || '') + '</div>' +
      (opt.footer ? '<div class="modal-foot">' + opt.footer + '</div>' : '');
    root.hidden = false;
    root.innerHTML = '';
    root.appendChild(wrap);
    const handle = {
      el: wrap,
      close() {
        const i = stack.indexOf(handle);
        if (i >= 0) stack.splice(i, 1);
        if (stack.length) {
          root.innerHTML = ''; root.appendChild(stack[stack.length - 1].el);
        } else { root.hidden = true; root.innerHTML = ''; }
        if (opt.onClose) opt.onClose();
      },
      q(sel) { return wrap.querySelector(sel); },
      qa(sel) { return Array.prototype.slice.call(wrap.querySelectorAll(sel)); },
      values() { return GC.formValues(wrap); }
    };
    stack.push(handle);
    wrap.querySelectorAll('[data-mclose]').forEach(b => b.addEventListener('click', () => handle.close()));
    root.onclick = (e) => { if (e.target === root) handle.close(); };
    if (opt.onMount) opt.onMount(handle);
    GC.initMoneyInputs(wrap);
    const first = wrap.querySelector('[data-autofocus],input:not([type=hidden]):not([readonly]),select');
    if (first) setTimeout(() => first.focus(), 40);
    return handle;
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close();
  });

  GC.confirm = function (opt) {
    return new Promise((resolve) => {
      const m = GC.modal({
        title: opt.title || 'Tasdiqlang',
        size: opt.size || '',
        body: '<div class="confirm-text">' + (opt.html || esc(opt.text || '')) + '</div>' +
              (opt.reason ? '<div class="field" style="margin-top:14px"><label>Sabab (audit uchun saqlanadi)</label>' +
                '<input class="input" name="reason" placeholder="Masalan: noto‘g‘ri kiritildi"></div>' : ''),
        footer: '<button class="btn" data-no>Bekor qilish</button>' +
                '<button class="btn ' + (opt.danger ? 'btn-danger' : 'btn-primary') + '" data-yes>' + esc(opt.okText || 'Davom etish') + '</button>',
        onClose: () => resolve(false)
      });
      m.q('[data-no]').addEventListener('click', () => m.close());
      m.q('[data-yes]').addEventListener('click', () => {
        const r = m.q('[name=reason]');
        const val = r ? r.value.trim() : true;
        const i = stack.indexOf(m); if (i >= 0) stack.splice(i, 1);
        const root = document.getElementById('modalRoot');
        if (stack.length) { root.innerHTML = ''; root.appendChild(stack[stack.length - 1].el); }
        else { root.hidden = true; root.innerHTML = ''; }
        resolve(opt.reason ? (val || ' ') : true);
      });
    });
  };

  /* ---------------- Forma yordamchilari ---------------- */
  GC.formValues = function (scope) {
    const out = {};
    scope.querySelectorAll('[name]').forEach(el => {
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
      else if (el.dataset.money !== undefined) out[el.name] = GC.parseMoney(el.value);
      else out[el.name] = el.value;
    });
    return out;
  };
  GC.showErrors = function (scope, errors) {
    scope.querySelectorAll('.field').forEach(f => f.classList.remove('invalid'));
    let first = null;
    Object.keys(errors).forEach(k => {
      const el = scope.querySelector('[name="' + k + '"]');
      if (!el) { GC.toast(errors[k], 'err'); return; }
      const f = el.closest('.field');
      if (f) {
        f.classList.add('invalid');
        let e = f.querySelector('.err');
        if (!e) { e = document.createElement('div'); e.className = 'err'; f.appendChild(e); }
        e.textContent = errors[k];
      } else GC.toast(errors[k], 'err');
      if (!first) first = el;
    });
    if (first) first.focus();
    return Object.keys(errors).length === 0;
  };
  GC.initMoneyInputs = function (scope) {
    scope.querySelectorAll('input[data-money]').forEach(el => {
      if (el._moneyBound) return;
      el._moneyBound = true;
      el.setAttribute('inputmode', 'numeric');
      el.classList.add('money');
      const fmt = () => {
        const pos = el.selectionStart, len = el.value.length;
        const n = GC.parseMoney(el.value);
        el.value = isNaN(n) ? '' : GC.groupNum(n);
        const dl = el.value.length - len;
        try { el.setSelectionRange(Math.max(0, pos + dl), Math.max(0, pos + dl)); } catch (e) {}
      };
      el.addEventListener('input', fmt);
      el.addEventListener('blur', fmt);
      if (el.value) fmt();
    });
  };

  /* Mijoz tanlash (qidiruvli) */
  GC.customerSelect = function (name, selectedId, extra) {
    const st = GC.compute();
    const list = st.customers.slice().sort((a, b) => a.c.name.localeCompare(b.c.name, 'uz'));
    return '<select class="select" name="' + name + '" ' + (extra || '') + '>' +
      '<option value="">— Mijozni tanlang —</option>' +
      list.map(x => '<option value="' + x.id + '"' + (x.id === selectedId ? ' selected' : '') + '>' +
        esc(x.c.name) + (x.c.phone ? ' · ' + esc(GC.fmtPhone(x.c.phone)) : '') +
        (x.remain > 0 ? ' · qolgan ' + GC.groupNum(x.remain) : '') + '</option>').join('') +
      '</select>';
  };
  GC.methodSelect = function (name, sel, withDebt) {
    const list = withDebt ? GC.SALE_METHODS : GC.PAY_METHODS;
    return '<select class="select" name="' + name + '">' +
      list.map(m => '<option value="' + m.id + '"' + (m.id === sel ? ' selected' : '') + '>' + esc(m.name) + '</option>').join('') + '</select>';
  };
  GC.cashierSelect = function (name, sel) {
    const list = GC.state.settings.cashiers || ['Admin'];
    return '<select class="select" name="' + name + '">' +
      list.map(c => '<option value="' + esc(c) + '"' + (c === sel ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>';
  };

  /* ---------------- Badge / status ---------------- */
  const DEBT_STATUS = {
    paid: { c: 'b-green', t: '🟢 To‘langan' },
    open: { c: 'b-blue', t: '🔵 To‘lanmagan' },
    partial: { c: 'b-yellow', t: '🟡 Qisman to‘langan' },
    due_today: { c: 'b-yellow', t: '🟡 Bugun to‘lanadi' },
    overdue: { c: 'b-red', t: '🔴 Muddati o‘tgan' }
  };
  GC.debtBadge = function (row) {
    const s = DEBT_STATUS[row.status] || DEBT_STATUS.open;
    const extra = row.status === 'overdue' ? ' (' + row.dueDays + ' kun)' : '';
    return '<span class="badge ' + s.c + '">' + s.t + extra + '</span>';
  };
  GC.custBadge = function (x) {
    if (x.status === 'clear') return '<span class="badge b-green">🟢 Qarzi yo‘q</span>';
    if (x.status === 'overdue') return '<span class="badge b-red">🔴 Muddati o‘tgan</span>';
    return '<span class="badge b-yellow">🟡 Qarz mavjud</span>';
  };
  GC.stockBadge = function (x) {
    if (x.status === 'out') return '<span class="badge b-red">🔴 Tugagan</span>';
    if (x.status === 'low') return '<span class="badge b-yellow">🟡 Kam qoldi</span>';
    return '<span class="badge b-green">🟢 Mavjud</span>';
  };
  GC.avatar = function (name) {
    return '<div class="avatar">' + esc(String(name || '?').trim().charAt(0).toUpperCase()) + '</div>';
  };

  /* ---------------- Stat karta ---------------- */
  GC.statCard = function (label, value, sub, tone, icon) {
    return '<div class="card stat ' + (tone || '') + '">' +
      '<div class="lab">' + (icon ? '<span>' + icon + '</span>' : '') + esc(label) + '</div>' +
      '<div class="val">' + esc(value) + '</div>' +
      (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
  };

  /* ---------------- Pagination ---------------- */
  GC.paginate = function (rows, page, per) {
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / per));
    const p = Math.min(Math.max(1, page), pages);
    return { rows: rows.slice((p - 1) * per, p * per), page: p, pages, total };
  };
  GC.pagerHTML = function (pg, key) {
    if (pg.total === 0) return '';
    const btn = (p, label, dis) => '<button class="btn btn-sm" data-action="page" data-key="' + key + '" data-page="' + p + '"' +
      (dis ? ' disabled' : '') + '>' + label + '</button>';
    return '<div class="pager"><span class="muted">Jami: <b>' + pg.total + '</b> ta yozuv · ' + pg.page + '/' + pg.pages + '-sahifa</span>' +
      '<div class="spacer"></div>' + btn(1, '«', pg.page === 1) + btn(pg.page - 1, '‹', pg.page === 1) +
      btn(pg.page + 1, '›', pg.page === pg.pages) + btn(pg.pages, '»', pg.page === pg.pages) + '</div>';
  };

  /* ---------------- Grafiklar (sof SVG) ---------------- */
  GC.chart = {
    bars(data, opts) {
      opts = opts || {};
      const w = 100, h = 100;
      const max = Math.max(1, ...data.map(d => Math.max(d.a || 0, d.b || 0)));
      const n = data.length || 1;
      const bw = 100 / n;
      let bars = '', labels = '';
      data.forEach((d, i) => {
        const x = i * bw;
        const ha = ((d.a || 0) / max) * 86;
        const hb = ((d.b || 0) / max) * 86;
        const pad = bw * 0.18;
        const each = (bw - pad * 2) / 2;
        bars += '<rect x="' + (x + pad) + '" y="' + (88 - ha) + '" width="' + (each * 0.9) + '" height="' + Math.max(0.4, ha) + '" fill="url(#gA)" rx="0.8"><title>' + esc(d.label + ' — Qarz: ' + money(d.a || 0)) + '</title></rect>';
        bars += '<rect x="' + (x + pad + each) + '" y="' + (88 - hb) + '" width="' + (each * 0.9) + '" height="' + Math.max(0.4, hb) + '" fill="url(#gB)" rx="0.8"><title>' + esc(d.label + ' — To‘lov: ' + money(d.b || 0)) + '</title></rect>';
        labels += '<text x="' + (x + bw / 2) + '" y="97" font-size="3.1" text-anchor="middle" fill="currentColor" opacity=".55">' + esc(d.label) + '</text>';
      });
      return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
        '<defs><linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef4444"/><stop offset="1" stop-color="#b91c1c"/></linearGradient>' +
        '<linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#15803d"/></linearGradient></defs>' +
        '<line x1="0" y1="88" x2="100" y2="88" stroke="currentColor" stroke-width=".25" opacity=".25"/>' +
        bars + labels + '</svg>';
    },
    line(points, opts) {
      opts = opts || {};
      const max = Math.max(1, ...points.map(p => p.v));
      const n = points.length;
      if (!n) return '<div class="empty">Ma’lumot yo‘q</div>';
      const pts = points.map((p, i) => {
        const x = n === 1 ? 50 : (i / (n - 1)) * 100;
        const y = 88 - (p.v / max) * 82;
        return [x, y];
      });
      const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
      const area = path + ' L100 88 L0 88 Z';
      const dots = pts.map((p, i) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="0.9" fill="#22d3ee"><title>' +
        esc(points[i].label + ': ' + money(points[i].v)) + '</title></circle>').join('');
      const labels = points.map((p, i) => (n <= 14 || i % Math.ceil(n / 12) === 0)
        ? '<text x="' + pts[i][0] + '" y="97" font-size="3" text-anchor="middle" fill="currentColor" opacity=".5">' + esc(p.label) + '</text>' : '').join('');
      return '<svg class="chart" viewBox="0 0 100 100" preserveAspectRatio="none">' +
        '<defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#6d5cff" stop-opacity=".45"/><stop offset="1" stop-color="#6d5cff" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + area + '" fill="url(#lg)"/>' +
        '<path d="' + path + '" fill="none" stroke="#22d3ee" stroke-width=".7" stroke-linejoin="round"/>' + dots + labels + '</svg>';
    },
    hbars(items) { // [{label, value, sub}]
      const max = Math.max(1, ...items.map(i => i.value));
      return items.map((i, idx) =>
        '<div class="bar-row">' +
        '<span class="rank ' + (idx < 3 ? 'r' + (idx + 1) : '') + '">' + (idx + 1) + '</span>' +
        '<div class="bl">' + esc(i.label) + '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + ((i.value / max) * 100).toFixed(1) + '%"></div></div>' +
        '<div class="bv">' + esc(i.display || money(i.value)) + '</div></div>').join('');
    }
  };

  /* ---------------- Chek (chop etish) ---------------- */
  GC.printReceipt = function (html) {
    const area = document.getElementById('printArea');
    area.innerHTML = html;
    window.print();
  };
  GC.paymentReceipt = function (payment, before, after) {
    const S = GC.state, c = S.customers.find(x => x.id === payment.customerId);
    return '<div class="receipt">' +
      '<div class="rc big">' + esc(S.settings.clubName) + '</div>' +
      (S.settings.address ? '<div class="rc">' + esc(S.settings.address) + '</div>' : '') +
      (S.settings.phone ? '<div class="rc">' + esc(S.settings.phone) + '</div>' : '') +
      '<hr><div class="rc">TO‘LOV CHEKI</div><hr>' +
      '<div class="rl"><span>Mijoz:</span><b>' + esc(c ? c.name : '—') + '</b></div>' +
      '<div class="rl"><span>Sana:</span><span>' + GC.fmtDate(payment.date) + ' ' + GC.fmtTime(payment.createdAt) + '</span></div>' +
      '<div class="rl"><span>To‘lov turi:</span><span>' + esc(GC.methodName(payment.method)) + '</span></div>' +
      '<hr>' +
      '<div class="rl"><span>Eski qarz:</span><b>' + money(before) + '</b></div>' +
      '<div class="rl"><span>To‘lov:</span><b>' + money(payment.amount) + '</b></div>' +
      '<div class="rl big"><span>Qolgan:</span><b>' + money(after) + '</b></div>' +
      '<hr><div class="rl"><span>Kassir:</span><span>' + esc(payment.cashier) + '</span></div>' +
      '<div class="rl"><span>Chek №:</span><span>' + esc(payment.id.slice(-8).toUpperCase()) + '</span></div>' +
      '<hr><div class="rc">' + esc(S.settings.receiptFooter || '') + '</div></div>';
  };
  GC.saleReceipt = function (sale) {
    const S = GC.state;
    const items = S.sale_items.filter(i => i.saleId === sale.id);
    const c = sale.customerId ? S.customers.find(x => x.id === sale.customerId) : null;
    return '<div class="receipt">' +
      '<div class="rc big">' + esc(S.settings.clubName) + '</div>' +
      (S.settings.address ? '<div class="rc">' + esc(S.settings.address) + '</div>' : '') +
      '<hr><div class="rc">SOTUV CHEKI</div><hr>' +
      items.map(i => '<div class="rl"><span>' + esc(i.name) + ' × ' + i.qty + '</span><b>' + GC.groupNum(i.qty * i.price) + '</b></div>').join('') +
      '<hr><div class="rl big"><span>JAMI:</span><b>' + money(sale.total) + '</b></div>' +
      '<div class="rl"><span>To‘lov:</span><span>' + esc(GC.methodName(sale.method)) + '</span></div>' +
      (c ? '<div class="rl"><span>Mijoz:</span><span>' + esc(c.name) + '</span></div>' : '') +
      '<div class="rl"><span>Sana:</span><span>' + GC.fmtDate(sale.date) + ' ' + GC.fmtTime(sale.ts) + '</span></div>' +
      '<div class="rl"><span>Kassir:</span><span>' + esc(sale.cashier) + '</span></div>' +
      '<div class="rl"><span>Chek №:</span><span>' + esc(sale.id.slice(-8).toUpperCase()) + '</span></div>' +
      '<hr><div class="rc">' + esc(S.settings.receiptFooter || '') + '</div></div>';
  };

  /* ---------------- Export ---------------- */
  GC.exportTable = function (kind, filename, rows, headers) {
    if (!rows.length) { GC.toast('Eksport uchun ma’lumot yo‘q', 'warn'); return; }
    if (kind === 'csv') {
      GC.download(filename + '.csv', GC.toCSV(rows, headers), 'text/csv;charset=utf-8');
      GC.toast('CSV fayl yuklab olindi', 'ok');
    } else if (kind === 'excel') {
      const html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">' +
        '<tr>' + headers.map(h => '<th>' + esc(h.label) + '</th>').join('') + '</tr>' +
        rows.map(r => '<tr>' + headers.map(h => '<td>' + esc(typeof h.get === 'function' ? h.get(r) : r[h.key]) + '</td>').join('') + '</tr>').join('') +
        '</table></body></html>';
      GC.download(filename + '.xls', html, 'application/vnd.ms-excel');
      GC.toast('Excel fayl yuklab olindi', 'ok');
    } else if (kind === 'pdf' || kind === 'print') {
      const S = GC.state;
      const html = '<div style="padding:16px;font-family:Segoe UI,sans-serif;color:#000;background:#fff">' +
        '<h2 style="margin:0 0 4px">' + esc(S.settings.clubName) + '</h2>' +
        '<div style="font-size:12px;color:#555;margin-bottom:10px">' + esc(filename) + ' · ' + GC.fmtDT(Date.now()) + '</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
        '<tr>' + headers.map(h => '<th style="border:1px solid #999;padding:5px;background:#eee;text-align:left">' + esc(h.label) + '</th>').join('') + '</tr>' +
        rows.map(r => '<tr>' + headers.map(h => '<td style="border:1px solid #ccc;padding:5px">' +
          esc(typeof h.get === 'function' ? h.get(r) : r[h.key]) + '</td>').join('') + '</tr>').join('') +
        '</table></div>';
      GC.printReceipt(html);
    }
  };
  GC.exportBar = function (key) {
    return '<div class="row">' +
      '<button class="btn btn-sm" data-action="export" data-kind="excel" data-what="' + key + '">📊 Excel</button>' +
      '<button class="btn btn-sm" data-action="export" data-kind="csv" data-what="' + key + '">📄 CSV</button>' +
      '<button class="btn btn-sm" data-action="export" data-kind="pdf" data-what="' + key + '">🖨 PDF / Chop etish</button></div>';
  };

  /* ---------------- Sana oralig'i ---------------- */
  GC.rangeFor = function (kind, custom) {
    const t = GC.todayISO();
    const d = GC.isoToDate(t);
    switch (kind) {
      case 'today': return { from: t, to: t, label: 'Bugun' };
      case 'yesterday': { const y = GC.addDays(t, -1); return { from: y, to: y, label: 'Kecha' }; }
      case 'week': {
        const dow = (d.getDay() + 6) % 7; // dushanba = 0
        return { from: GC.addDays(t, -dow), to: t, label: 'Shu hafta' };
      }
      case 'month': return { from: GC.dateToISO(new Date(d.getFullYear(), d.getMonth(), 1)), to: t, label: 'Shu oy' };
      case 'custom': return { from: (custom && custom.from) || t, to: (custom && custom.to) || t, label: 'Tanlangan davr' };
      default: return { from: null, to: null, label: 'Barcha vaqt' };
    }
  };
  GC.inRange = function (date, r) {
    if (!r || (!r.from && !r.to)) return true;
    if (r.from && date < r.from) return false;
    if (r.to && date > r.to) return false;
    return true;
  };
})();
