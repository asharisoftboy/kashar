/* KasHar — laporan keuangan dengan chart canvas ringan (tanpa library) */
window.KH = window.KH || {};

KH.reports = (() => {
  let range = 'month'; // today | week | month | year | custom
  let customFrom = '', customTo = '';

  const PALETTE = ['#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#10b981', '#f97316', '#64748b', '#14b8a6', '#a855f7', '#eab308'];

  function rangeBounds() {
    const u = KH.utils;
    const today = new Date();
    const iso = u.toISO(today);
    if (range === 'today') return { from: iso, to: iso };
    if (range === 'week') {
      const d = new Date(today);
      const dow = (d.getDay() + 6) % 7; // Senin = 0
      d.setDate(d.getDate() - dow);
      return { from: u.toISO(d), to: iso };
    }
    if (range === 'month') return { from: iso.slice(0, 8) + '01', to: iso };
    if (range === 'year') return { from: iso.slice(0, 4) + '-01-01', to: iso };
    return { from: customFrom || iso, to: customTo || iso };
  }

  function render() {
    const u = KH.utils, app = KH.app;
    const el = document.getElementById('view');
    el.innerHTML =
      app.viewHeader('Laporan') +
      '<div class="chip-row" id="range-chips" style="margin-bottom:12px">' +
        [['today', 'Hari ini'], ['week', 'Minggu ini'], ['month', 'Bulan ini'], ['year', 'Tahun ini'], ['custom', 'Custom']].map(([v, l]) =>
          '<button class="chip ' + (range === v ? 'active' : '') + '" data-r="' + v + '">' + l + '</button>').join('') +
      '</div>' +
      '<div class="filter-row ' + (range === 'custom' ? '' : 'hidden') + '" id="custom-range" style="margin-bottom:12px">' +
        '<input type="date" id="r-from" value="' + customFrom + '">' +
        '<input type="date" id="r-to" value="' + customTo + '">' +
      '</div>' +
      '<div id="report-body"></div>';

    document.querySelectorAll('#range-chips .chip').forEach((b) => {
      b.onclick = () => {
        range = b.dataset.r;
        document.querySelectorAll('#range-chips .chip').forEach((x) => x.classList.toggle('active', x === b));
        document.getElementById('custom-range').classList.toggle('hidden', range !== 'custom');
        paintBody();
      };
    });
    document.getElementById('r-from').onchange = (e) => { customFrom = e.target.value; paintBody(); };
    document.getElementById('r-to').onchange = (e) => { customTo = e.target.value; paintBody(); };
    paintBody();
  }

  function paintBody() {
    const u = KH.utils, app = KH.app;
    const box = document.getElementById('report-body');
    if (!box) return;
    const { from, to } = rangeBounds();
    const txs = app.S.transactions.filter((t) => t.date >= from && t.date <= to);
    const incTx = txs.filter((t) => t.type === 'income');
    const expTx = txs.filter((t) => t.type === 'expense');
    const inc = incTx.reduce((s, t) => s + t.amount, 0);
    const exp = expTx.reduce((s, t) => s + t.amount, 0);
    const diff = inc - exp;

    const days = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
    const byMonth = days > 62;

    // bucket data untuk bar chart
    const buckets = new Map();
    const keyOf = (iso) => byMonth ? iso.slice(0, 7) : iso;
    const labelOf = (k) => byMonth
      ? new Date(k + '-02T00:00:00').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
      : new Date(k + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    txs.forEach((t) => {
      if (t.type === 'transfer') return;
      const k = keyOf(t.date);
      if (!buckets.has(k)) buckets.set(k, { inc: 0, exp: 0 });
      buckets.get(k)[t.type === 'income' ? 'inc' : 'exp'] += t.amount;
    });
    const keys = [...buckets.keys()].sort();
    const labels = keys.map(labelOf);

    // pengeluaran per kategori
    const byCat = new Map();
    expTx.forEach((t) => {
      byCat.set(t.categoryId, (byCat.get(t.categoryId) || 0) + t.amount);
    });
    const catRows = [...byCat.entries()]
      .map(([cid, amt]) => ({ cat: app.getCategory(cid), amt }))
      .sort((a, b) => b.amt - a.amt);

    const top = [...expTx].sort((a, b) => b.amount - a.amount).slice(0, 5);

    box.innerHTML =
      '<div class="report-grid">' +
        '<div class="report-stat"><p>💰 Pemasukan</p><b class="text-income">+' + u.fmtIDR(inc) + '</b></div>' +
        '<div class="report-stat"><p>📉 Pengeluaran</p><b class="text-expense">−' + u.fmtIDR(exp) + '</b></div>' +
        '<div class="report-stat"><p>📊 Selisih</p><b class="' + (diff < 0 ? 'text-expense' : 'text-income') + '">' + (diff < 0 ? '−' : '+') + u.fmtIDR(Math.abs(diff)) + '</b></div>' +
      '</div>' +

      '<section class="card"><div class="card-head"><h3>Grafik</h3><span class="muted mini">' +
        (byMonth ? 'per bulan' : 'per hari') + '</span></div>' +
        (keys.length ? '<canvas id="rep-chart" height="170"></canvas>' +
          '<div class="legend"><div class="legend-row"><span class="legend-dot" style="background:' + app.cssVar('--income') + '"></span>Pemasukan</div>' +
          '<div class="legend-row"><span class="legend-dot" style="background:' + app.cssVar('--expense') + '"></span>Pengeluaran</div></div>'
        : app.emptyState('📊', 'Belum ada data', 'Tidak ada transaksi pada periode ini')) +
      '</section>' +

      (catRows.length
        ? '<section class="card"><div class="card-head"><h3>Pengeluaran per Kategori</h3></div>' +
          '<div style="display:flex;align-items:center;gap:16px">' +
            '<canvas id="rep-donut" width="130" height="130" style="flex:none;width:130px;height:130px"></canvas>' +
            '<div class="legend" style="flex:1;margin-top:0;max-height:140px;overflow-y:auto">' +
              catRows.slice(0, 7).map((r, i) =>
                '<div class="legend-row"><span class="legend-dot" style="background:' + PALETTE[i % PALETTE.length] + '"></span>' +
                (r.cat ? u.esc(r.cat.icon + ' ' + r.cat.name) : 'Lainnya') +
                '<b>' + u.fmtIDR(r.amt) + '</b></div>').join('') +
            '</div>' +
          '</div></section>'
        : '') +

      (top.length
        ? '<section class="card"><div class="card-head"><h3>Transaksi Terbesar</h3><span class="muted mini">Top ' + top.length + '</span></div><div class="tx-list">' +
          top.map((t, i) => {
            const c = app.getCategory(t.categoryId);
            return '<div class="tx-row" style="cursor:default"><span class="rank-num">' + (i + 1) + '</span>' +
              '<span class="tx-icon">' + (c ? c.icon : '❔') + '</span>' +
              '<span class="tx-body"><b>' + (c ? u.esc(c.name) : 'Lainnya') + '</b><p class="muted mini">' + (t.note ? u.esc(t.note) + ' · ' : '') + u.fmtDate(t.date) + '</p></span>' +
              '<span class="tx-right"><b class="text-expense">−' + u.fmtIDR(t.amount) + '</b></span></div>';
          }).join('') + '</div></section>'
        : '');

    drawDonutIfAny();
  }


  function drawDonutIfAny() {
    const app = KH.app, u = KH.utils;
    const canvas = document.getElementById('rep-donut');
    if (!canvas) return;
    const { from, to } = rangeBounds();
    const expTx = app.S.transactions.filter((t) => t.type === 'expense' && t.date >= from && t.date <= to);
    const byCat = new Map();
    expTx.forEach((t) => byCat.set(t.categoryId, (byCat.get(t.categoryId) || 0) + t.amount));
    const rows = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
    const total = rows.reduce((s, r) => s + r[1], 0);
    if (!total) return;
    const dpr = window.devicePixelRatio || 1;
    const S = 130;
    canvas.width = S * dpr; canvas.height = S * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const cx = S / 2, cy = S / 2, R = 52, r = 34;
    let a0 = -Math.PI / 2;
    rows.forEach((row, i) => {
      const frac = row[1] / total;
      const a1 = a0 + frac * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0, a1);
      ctx.arc(cx, cy, r, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.fill();
      a0 = a1;
    });
    ctx.fillStyle = app.cssVar('--text');
    ctx.font = '700 13px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round((rows[0][1] / total) * 100) + '%', cx, cy - 8);
    ctx.font = '10px system-ui';
    ctx.fillStyle = app.cssVar('--muted');
    const topCat = app.getCategory(rows[0][0]);
    ctx.fillText(topCat ? topCat.name.slice(0, 10) : 'Lainnya', cx, cy + 8);
  }

  return { render: render };
})();
