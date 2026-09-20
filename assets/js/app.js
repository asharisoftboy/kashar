/* KasHar — app core: state, router, dashboard, account, tema, backup/restore */
window.KH = window.KH || {};

KH.app = (() => {
  const S = { transactions: [], wallets: [], categories: [], budgets: [], goals: [], debts: [] };
  let settings = {};

  const EXPENSE_CATS = [
    ['🍔', 'Makanan'], ['🚗', 'Transportasi'], ['🛍️', 'Belanja'], ['🧾', 'Tagihan'],
    ['🎬', 'Hiburan'], ['📚', 'Pendidikan'], ['💊', 'Kesehatan'], ['🛵', 'Motor'],
    ['📱', 'Top Up'], ['📦', 'Lainnya']
  ];
  const INCOME_CATS = [
    ['💰', 'Gaji'], ['🎁', 'Bonus'], ['💼', 'Bisnis'], ['💻', 'Freelance'],
    ['🏆', 'Hadiah'], ['📦', 'Lainnya']
  ];

  /* ================= Settings ================= */
  function getSetting(id, def) {
    return settings[id] !== undefined ? settings[id] : (localStorage.getItem('kashar-' + id) ?? def);
  }
  async function setSetting(id, value) {
    settings[id] = value;
    localStorage.setItem('kashar-' + id, value);
    await KH.db.put('settings', { id: id, value: value });
  }

  /* ================= Data ================= */
  async function loadAll() {
    for (const k of ['transactions', 'wallets', 'categories', 'budgets', 'goals', 'debts']) {
      S[k] = await KH.db.getAll(k);
    }
    const rows = await KH.db.getAll('settings');
    settings = {};
    rows.forEach((r) => { settings[r.id] = r.value; });
  }

  async function seedDefaults() {
    const cats = await KH.db.getAll('categories');
    if (!cats.length) {
      for (const [icon, name] of EXPENSE_CATS) {
        await KH.db.put('categories', { id: KH.utils.uid(), name: name, icon: icon, type: 'expense' });
      }
      for (const [icon, name] of INCOME_CATS) {
        await KH.db.put('categories', { id: KH.utils.uid(), name: name, icon: icon, type: 'income' });
      }
    }
    const ws = await KH.db.getAll('wallets');
    if (!ws.length) {
      await KH.db.put('wallets', {
        id: KH.utils.uid(), name: 'Cash', icon: '💵', color: '#0d9488',
        initialBalance: 0, createdAt: Date.now()
      });
    }
  }

  async function reload() {
    await loadAll();
    renderRoute();
  }

  /* ================= Derived finance logic ================= */
  // Saldo dompet = saldo awal + replay seluruh transaksi (selalu konsisten, aman untuk edit/hapus)
  function txDelta(tx, walletId) {
    if (tx.type === 'transfer') {
      if (tx.fromWalletId === walletId) return -tx.amount;
      if (tx.toWalletId === walletId) return tx.amount;
      return 0;
    }
    if (tx.walletId !== walletId) return 0;
    return tx.type === 'income' ? tx.amount : -tx.amount;
  }

  function walletBalance(w) {
    const base = Number(w.initialBalance) || 0;
    return S.transactions.reduce((sum, t) => sum + txDelta(t, w.id), base);
  }

  // Saldo efektif saat edit transaksi (mengabaikan efek transaksi lama yang sedang diedit)
  function effectiveBalance(w, editingTx) {
    let b = walletBalance(w);
    if (editingTx) b -= txDelta(editingTx, w.id);
    return b;
  }

  function totalBalance() {
    return S.wallets.reduce((sum, w) => sum + walletBalance(w), 0);
  }

  function monthStats(mk) {
    let inc = 0, exp = 0;
    S.transactions.forEach((t) => {
      if (t.type === 'transfer') return;
      if (KH.utils.monthKey(t.date) !== mk) return;
      if (t.type === 'income') inc += t.amount; else exp += t.amount;
    });
    return { inc: inc, exp: exp };
  }

  function monthCategoryExpense(categoryId, mk) {
    return S.transactions
      .filter((t) => t.type === 'expense' && t.categoryId === categoryId && KH.utils.monthKey(t.date) === mk)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  function budgetOverall(mk) {
    let used = 0, limit = 0;
    S.budgets.forEach((b) => {
      limit += Number(b.limit) || 0;
      used += monthCategoryExpense(b.categoryId, mk);
    });
    return { used: used, limit: limit, pct: limit > 0 ? Math.round((used / limit) * 100) : 0 };
  }

  /* ================= Accessors ================= */
  function getCategories(type) {
    return S.categories.filter((c) => c.type === type)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  function getCategory(id) { return S.categories.find((c) => c.id === id) || null; }
  function getWallet(id) { return S.wallets.find((w) => w.id === id) || null; }

  /* ================= Tema ================= */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('.theme-toggle').forEach((b) => { b.textContent = theme === 'dark' ? '☀️' : '🌙'; });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f141b' : '#0d9488');
  }
  async function toggleTheme() {
    const next = getSetting('theme', 'light') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    await setSetting('theme', next);
  }

  /* ================= Router ================= */
  const routes = {
    '':          renderHome,
    'home':      renderHome,
    'transactions': () => KH.transactions.render(),
    'reports':   () => KH.reports.render(),
    'budgets':   () => KH.budgets.render(),
    'goals':     () => KH.goals.render(),
    'debts':     () => KH.debts.render(),
    'wallets':   () => KH.wallets.render(),
    'account':   renderAccount
  };

  function currentRoute() {
    return location.hash.replace(/^#\/?/, '').split('?')[0];
  }

  function nav(path) { location.hash = '#/' + path; }

  function renderRoute() {
    const key = currentRoute();
    const fn = routes[key] || renderHome;
    document.querySelectorAll('.nav-item').forEach((b) => {
      b.classList.toggle('active', b.dataset.route === key || (key === '' && b.dataset.route === 'home'));
    });
    fn();
    window.scrollTo(0, 0);
  }

  function renderCurrent() { renderRoute(); }

  /* ================= Komponen kecil ================= */
  function viewHeader(title, right) {
    return '<header class="view-header"><h1>' + KH.utils.esc(title) + '</h1>' +
      '<div class="header-right">' + (right || '') + '</div></header>';
  }

  function emptyState(icon, title, subtitle) {
    return '<div class="empty-state"><div class="empty-icon">' + icon + '</div>' +
      '<p class="empty-title">' + KH.utils.esc(title) + '</p>' +
      (subtitle ? '<p class="muted small">' + KH.utils.esc(subtitle) + '</p>' : '') + '</div>';
  }

  function progressBar(pct, cls) {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    return '<div class="progress"><div class="progress-fill ' + (cls || '') + '" style="width:' + p + '%"></div></div>';
  }

  function wireThemeToggles(root) {
    (root || document).querySelectorAll('.theme-toggle').forEach((b) => {
      b.onclick = () => toggleTheme();
    });
  }

  /* ================= HOME / DASHBOARD ================= */
  function renderHome() {
    const u = KH.utils;
    const el = document.getElementById('view');
    const name = getSetting('name', '');
    const mk = u.monthKey(u.todayISO());
    const st = monthStats(mk);
    const bal = totalBalance();
    const savedTotal = S.goals.reduce((s, g) => s + (Number(g.saved) || 0), 0);
    const bo = budgetOverall(mk);
    const recent = [...S.transactions]
      .sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')))
      .slice(0, 6);
    const goalsPreview = [...S.goals].sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 2);

    el.innerHTML =
      '<header class="home-head">' +
        '<div>' +
          '<p class="greet">Selamat datang 👋' + (name ? ', <b>' + u.esc(name) + '</b>' : '') + '</p>' +
          '<h1 class="brand">KasHar</h1>' +
        '</div>' +
        '<button class="icon-btn theme-toggle" aria-label="Ganti tema">🌙</button>' +
      '</header>' +

      '<section class="card hero">' +
        '<p class="muted small">Saldo kamu</p>' +
        '<h2 class="hero-amount">' + u.fmtIDR(bal) + '</h2>' +
        '<div class="hero-row">' +
          '<div class="hero-stat"><span class="badge-dot in"></span><div><p class="muted mini">Pemasukan bulan ini</p><b class="text-income">+' + u.fmtIDR(st.inc) + '</b></div></div>' +
          '<div class="hero-stat"><span class="badge-dot out"></span><div><p class="muted mini">Pengeluaran bulan ini</p><b class="text-expense">−' + u.fmtIDR(st.exp) + '</b></div></div>' +
        '</div>' +
      '</section>' +

      '<div class="quick-grid">' +
        '<button class="quick-card qc-income" data-add="income"><span>📈</span>Pemasukan</button>' +
        '<button class="quick-card qc-expense" data-add="expense"><span>📉</span>Pengeluaran</button>' +
        '<button class="quick-card qc-transfer" data-add="transfer"><span>⇄</span>Transfer</button>' +
        '<button class="quick-card qc-goal" id="qa-goal"><span>🎯</span>Tambah target</button>' +
      '</div>' +

      '<div class="two-col">' +
        '<div class="card mini-card"><p class="muted mini">💰 Total tabungan</p><b>' + u.fmtIDR(savedTotal) + '</b></div>' +
        '<button class="card mini-card" style="text-align:left;cursor:pointer" id="home-budget"><p class="muted mini">🧾 Budget ' + u.monthLabel(mk) + '</p><b>' + bo.pct + '%</b>' + progressBar(bo.pct, bo.pct >= 100 ? 'danger' : bo.pct >= 80 ? 'warn' : '') + '</button>' +
      '</div>' +

      '<section class="card">' +
        '<div class="card-head"><h3>Pemasukan vs Pengeluaran</h3><span class="muted mini">6 bulan terakhir</span></div>' +
        '<canvas id="home-chart" height="150"></canvas>' +
      '</section>' +

      '<section class="card">' +
        '<div class="card-head"><h3>Dompet</h3><a class="link" href="#/wallets">Kelola</a></div>' +
        (S.wallets.length
          ? '<div class="wallet-scroll">' + S.wallets.map((w) =>
              '<div class="wallet-chip" data-wallet="' + w.id + '"><span class="wallet-ic" style="background:' + u.esc(w.color || '#0d9488') + '22">' + u.esc(w.icon || '💼') + '</span><div><b>' + u.esc(w.name) + '</b><p class="muted mini">' + u.fmtIDR(walletBalance(w)) + '</p></div></div>'
            ).join('') + '</div>'
          : emptyState('💼', 'Belum ada dompet', 'Buat dompet pertamamu')) +
      '</section>' +

      (goalsPreview.length
        ? '<section class="card"><div class="card-head"><h3>Target keuangan</h3><a class="link" href="#/goals">Lihat semua</a></div>' +
          goalsPreview.map((g) => {
            const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
            return '<div class="goal-row" data-goal="' + g.id + '"><span class="goal-ic">' + u.esc(g.icon || '🎯') + '</span><div class="goal-info"><b>' + u.esc(g.name) + '</b>' + progressBar(pct) + '<p class="muted mini">' + u.fmtIDR(g.saved) + ' dari ' + u.fmtIDR(g.target) + ' · ' + Math.round(pct) + '%</p></div></div>';
          }).join('') + '</section>'
        : '') +

      '<section class="card">' +
        '<div class="card-head"><h3>Transaksi terbaru</h3><a class="link" href="#/transactions">Lihat semua</a></div>' +
        (recent.length ? '<div class="tx-list">' + recent.map(txRow).join('') + '</div>' : emptyState('🧾', 'Belum ada transaksi', 'Tekan tombol + untuk mencatat')) +
      '</section>';

    el.querySelectorAll('[data-add]').forEach((b) => { b.onclick = () => KH.transactions.openForm(b.dataset.add); });
    const hb = document.getElementById('home-budget');
    if (hb) hb.onclick = () => nav('budgets');
    const qa = document.getElementById('qa-goal');
    if (qa) qa.onclick = () => KH.goals.openForm();
    el.querySelectorAll('.tx-row').forEach((r) => { r.onclick = () => KH.transactions.openDetail(r.dataset.tx); });
    wireThemeToggles(el);
    drawHomeChart();
  }

  function txRow(t) {
    const u = KH.utils;
    let icon, title, sub, amtCls, amtSign;
    if (t.type === 'transfer') {
      const from = getWallet(t.fromWalletId), to = getWallet(t.toWalletId);
      icon = '⇄'; title = 'Transfer';
      sub = (from ? u.esc(from.name) : '?') + ' → ' + (to ? u.esc(to.name) : '?');
      amtCls = 'text-transfer'; amtSign = '';
    } else {
      const c = getCategory(t.categoryId);
      const w = getWallet(t.walletId);
      icon = c ? c.icon : '❔';
      title = c ? u.esc(c.name) : 'Lainnya';
      sub = (t.note ? u.esc(t.note) + ' · ' : '') + (w ? u.esc(w.name) : '');
      if (t.type === 'income') { amtCls = 'text-income'; amtSign = '+'; }
      else { amtCls = 'text-expense'; amtSign = '−'; }
    }
    return '<button class="tx-row" data-tx="' + t.id + '">' +
      '<span class="tx-icon">' + icon + '</span>' +
      '<span class="tx-body"><b>' + title + '</b><p class="muted mini">' + sub + '</p></span>' +
      '<span class="tx-right"><b class="' + amtCls + '">' + amtSign + u.fmtIDR(t.amount) + '</b><p class="muted mini">' + u.fmtDate(t.date) + '</p></span>' +
    '</button>';
  }

  function drawHomeChart() {
    const u = KH.utils;
    const canvas = document.getElementById('home-chart');
    if (!canvas) return;
    const now = new Date();
    const labels = [], inc = [], exp = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = d.getFullYear() + '-' + u.pad(d.getMonth() + 1);
      labels.push(d.toLocaleDateString('id-ID', { month: 'short' }));
      const st = monthStats(mk);
      inc.push(st.inc); exp.push(st.exp);
    }
    drawBarChart(canvas, labels, [
      { name: 'Masuk', color: cssVar('--income'), values: inc },
      { name: 'Keluar', color: cssVar('--expense'), values: exp }
    ]);
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#0d9488';
  }

  /* Bar chart ringan (canvas, tanpa library) */
  function drawBarChart(canvas, labels, series) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || canvas.parentElement.clientWidth - 32;
    const H = Number(canvas.getAttribute('height')) || 150;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = '100%'; canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    const max = Math.max(1, ...series.flatMap((s) => s.values));
    const padB = 18, padT = 8;
    const chartH = H - padB - padT;
    const groupW = W / labels.length;
    const barW = Math.min(14, (groupW - 16) / series.length);
    ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    labels.forEach((lb, i) => {
      const cx = groupW * i + groupW / 2;
      series.forEach((s, si) => {
        const h = Math.max(2, (s.values[i] / max) * chartH);
        const x = cx - (barW * series.length) / 2 + si * (barW + 3);
        ctx.fillStyle = s.color;
        roundRect(ctx, x, padT + chartH - h, barW, h, 4);
      });
      ctx.fillStyle = cssVar('--muted');
      ctx.fillText(lb, cx, H - 5);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  /* ================= SHEET: pilih jenis transaksi ================= */
  function openAddSheet() {
    const u = KH.utils;
    u.openModal(
      u.sheetHead('Tambah Transaksi') +
      '<div class="type-grid">' +
        '<button class="type-card qc-income" data-txtype="income"><span>📈</span><b>Pemasukan</b><p class="muted mini">Uang masuk</p></button>' +
        '<button class="type-card qc-expense" data-txtype="expense"><span>📉</span><b>Pengeluaran</b><p class="muted mini">Uang keluar</p></button>' +
        '<button class="type-card qc-transfer" data-txtype="transfer"><span>⇄</span><b>Transfer</b><p class="muted mini">Antar dompet</p></button>' +
      '</div>',
      { sheet: true }
    );
    u.wireClose();
    document.querySelectorAll('[data-txtype]').forEach((b) => {
      b.onclick = () => { u.closeModal(); KH.transactions.openForm(b.dataset.txtype); };
    });
  }

  /* ================= AKUN ================= */
  function renderAccount() {
    const u = KH.utils;
    const el = document.getElementById('view');
    const name = getSetting('name', '');
    const theme = getSetting('theme', 'light');

    el.innerHTML =
      viewHeader('Akun') +
      '<section class="card profile-card">' +
        '<div class="avatar">👤</div>' +
        '<div class="profile-info"><b>' + (name ? u.esc(name) : 'Pengguna KasHar') + '</b><p class="muted mini">Data tersimpan di perangkat ini</p></div>' +
        '<button class="icon-btn" id="edit-name">✏️</button>' +
      '</section>' +

      '<section class="card menu-card">' +
        '<div class="card-head"><h3>Preferensi</h3></div>' +
        '<button class="menu-row" id="m-theme"><span>🌙</span><div><b>Dark Mode</b><p class="muted mini">Tampilan gelap nyaman di malam hari</p></div><span class="switch ' + (theme === 'dark' ? 'on' : '') + '"><i></i></span></button>' +
        '<button class="menu-row" id="m-cats"><span>🏷️</span><div><b>Kategori</b><p class="muted mini">Tambah, edit, hapus kategori</p></div><span class="chev">›</span></button>' +
        '<a class="menu-row" href="#/wallets"><span>💼</span><div><b>Dompet / Sumber dana</b><p class="muted mini">Kelola semua dompet</p></div><span class="chev">›</span></a>' +
        '<a class="menu-row" href="#/budgets"><span>🧾</span><div><b>Budget</b><p class="muted mini">Anggaran per kategori per bulan</p></div><span class="chev">›</span></a>'
      '</section>' +

      '<section class="card menu-card">' +
        '<div class="card-head"><h3>Data</h3></div>' +
        '<button class="menu-row" id="m-export"><span>⬇️</span><div><b>Export Data</b><p class="muted mini">Simpan semua data ke file JSON</p></div><span class="chev">›</span></button>' +
        '<button class="menu-row" id="m-import"><span>⬆️</span><div><b>Import Data</b><p class="muted mini">Pulihkan data dari file backup</p></div><span class="chev">›</span></button>' +
        '<button class="menu-row danger-row" id="m-reset"><span>🗑️</span><div><b>Reset Semua Data</b><p class="muted mini">Hapus seluruh data permanen</p></div><span class="chev">›</span></button>' +
        '<input type="file" id="import-file" accept="application/json,.json" hidden>' +
      '</section>' +

      '<section class="card about-card">' +
        '<div class="logo-badge">H</div>' +
        '<div><b>KasHar</b><p class="muted mini">v1.0.0 · PWA · 100% offline · tanpa server</p></div>' +
      '</section>';

    document.getElementById('edit-name').onclick = openNameModal;
    document.getElementById('m-theme').onclick = async () => {
      await toggleTheme();
      const sw = document.querySelector('#m-theme .switch');
      if (sw) sw.classList.toggle('on', getSetting('theme') === 'dark');
    };
    document.getElementById('m-cats').onclick = openCategoriesModal;
    document.getElementById('m-export').onclick = exportData;
    document.getElementById('m-import').onclick = () => document.getElementById('import-file').click();
    document.getElementById('import-file').addEventListener('change', importData);
    document.getElementById('m-reset').onclick = resetData;
    wireThemeToggles(el);
  }

  function openNameModal() {
    const u = KH.utils;
    const cur = getSetting('name', '');
    u.openModal(
      u.sheetHead('Nama Kamu') +
      '<form id="name-form" class="form">' +
        '<input type="text" id="f-name" maxlength="30" placeholder="Masukkan nama" value="' + u.esc(cur) + '" autocomplete="off">' +
        '<button class="btn btn-primary btn-block" type="submit">Simpan</button>' +
      '</form>',
      { sheet: true }
    );
    u.wireClose();
    document.getElementById('name-form').onsubmit = async (e) => {
      e.preventDefault();
      const v = document.getElementById('f-name').value.trim();
      await setSetting('name', v);
      u.closeModal();
      u.toast('Nama tersimpan ✓');
      renderRoute();
    };
  }

  /* ---------- Kategori manager ---------- */
  function openCategoriesModal() {
    const u = KH.utils;
    const renderList = (type) => {
      const cats = S.categories.filter((c) => c.type === type);
      if (!cats.length) return emptyState('🏷️', 'Belum ada kategori');
      return cats.map((c) =>
        '<div class="cat-row" data-cat="' + c.id + '"><span class="cat-ic">' + u.esc(c.icon) + '</span><b>' + u.esc(c.name) + '</b>' +
        '<button class="icon-btn sm" data-editcat="' + c.id + '">✏️</button>' +
        '<button class="icon-btn sm" data-delcat="' + c.id + '">🗑️</button></div>'
      ).join('');
    };

    u.openModal(
      u.sheetHead('Kelola Kategori') +
      '<div class="seg" id="cat-seg">' +
        '<button class="seg-btn" data-t="expense">Pengeluaran</button>' +
        '<button class="seg-btn" data-t="income">Pemasukan</button>' +
      '</div>' +
      '<div id="cat-list" class="cat-list"></div>' +
      '<button class="btn btn-primary btn-block" id="add-cat">＋ Tambah kategori</button>',
      { sheet: true }
    );
    u.wireClose();

    let curType = 'expense';
    const paint = () => {
      document.querySelectorAll('#cat-seg .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.t === curType));
      document.getElementById('cat-list').innerHTML = renderList(curType);
      document.querySelectorAll('[data-editcat]').forEach((b) => { b.onclick = () => openCatForm(curType, b.dataset.editcat); });
      document.querySelectorAll('[data-delcat]').forEach((b) => { b.onclick = () => deleteCat(b.dataset.delcat); });
    };
    document.querySelectorAll('#cat-seg .seg-btn').forEach((b) => { b.onclick = () => { curType = b.dataset.t; paint(); }; });
    document.getElementById('add-cat').onclick = () => openCatForm(curType, null);
    paint();
  }

  function openCatForm(type, id) {
    const u = KH.utils;
    const cat = id ? getCategory(id) : null;
    const EMOJI = ['🍔', '🚗', '🛍️', '🧾', '🎬', '📚', '💊', '🛵', '📱', '🏠', '👕', '🐾', '✈️', '🎮', '💰', '🎁', '💼', '💻', '🏆', '📦'];
    u.openModal(
      u.sheetHead(cat ? 'Edit Kategori' : 'Tambah Kategori') +
      '<form id="cat-form" class="form">' +
        '<div class="emoji-grid" id="emoji-grid">' +
          EMOJI.map((e) => '<button type="button" class="emoji-opt ' + ((cat ? cat.icon : EMOJI[0]) === e ? 'active' : '') + '" data-e="' + e + '">' + e + '</button>').join('') +
        '</div>' +
        '<input type="text" id="f-catname" maxlength="20" placeholder="Nama kategori" value="' + (cat ? u.esc(cat.name) : '') + '" required autocomplete="off">' +
        '<button class="btn btn-primary btn-block" type="submit">' + (cat ? 'Simpan' : 'Tambah') + '</button>' +
      '</form>',
      { sheet: true }
    );
    u.wireClose();
    let sel = cat ? cat.icon : EMOJI[0];
    document.querySelectorAll('#emoji-grid .emoji-opt').forEach((b) => {
      b.onclick = () => {
        sel = b.dataset.e;
        document.querySelectorAll('#emoji-grid .emoji-opt').forEach((x) => x.classList.toggle('active', x === b));
      };
    });
    document.getElementById('cat-form').onsubmit = async (e) => {
      e.preventDefault();
      const nm = document.getElementById('f-catname').value.trim();
      if (!nm) { u.toast('Nama kategori wajib diisi', 'error'); return; }
      await KH.db.put('categories', { id: cat ? cat.id : u.uid(), name: nm, icon: sel, type: type });
      await reload();
      u.toast(cat ? 'Kategori diperbarui ✓' : 'Kategori ditambahkan ✓');
      document.querySelectorAll('.modal-backdrop').forEach(() => {}); // tetap di modal kategori
      const btn = document.getElementById('m-cats'); if (btn) openCategoriesModal();
    };
  }

  async function deleteCat(id) {
    const u = KH.utils;
    const used = S.transactions.some((t) => t.categoryId === id);
    if (used) { u.toast('Kategori dipakai transaksi, tidak bisa dihapus', 'error'); return; }
    const inBudget = S.budgets.some((b) => b.categoryId === id);
    if (inBudget) { u.toast('Kategori dipakai budget, tidak bisa dihapus', 'error'); return; }
    const ok = await u.confirmDialog({ title: 'Hapus kategori?', message: 'Kategori akan dihapus permanen.', danger: true, confirmText: 'Hapus' });
    if (!ok) return;
    await KH.db.del('categories', id);
    await reload();
    u.toast('Kategori dihapus');
    openCategoriesModal();
  }

  /* ---------- Backup & Restore ---------- */
  async function exportData() {
    const u = KH.utils;
    try {
      const data = await KH.db.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kashar-backup-' + u.todayISO() + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      u.toast('Backup berhasil diunduh ✓');
    } catch (err) {
      u.toast('Export gagal: ' + err.message, 'error');
    }
  }

  async function importData(e) {
    const u = KH.utils;
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const ok = await u.confirmDialog({
      title: 'Import Data?',
      message: 'Seluruh data saat ini akan DIGANTI dengan isi file backup. Tindakan ini tidak bisa dibatalkan.',
      danger: true, confirmText: 'Ya, import'
    });
    if (!ok) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await KH.db.importAll(payload);
      await reload();
      u.toast('Data berhasil dipulihkan ✓');
    } catch (err) {
      u.toast('Import gagal: ' + err.message, 'error');
    }
  }

  async function resetData() {
    const u = KH.utils;
    const ok1 = await u.confirmDialog({
      title: 'Reset Semua Data?',
      message: 'Seluruh transaksi, dompet, budget, target, dan utang akan DIHAPUS PERMANEN.',
      danger: true, confirmText: 'Lanjut'
    });
    if (!ok1) return;
    const ok2 = await u.confirmDialog({
      title: 'Yakin 100%?',
      message: 'Ini adalah konfirmasi terakhir. Data yang terhapus tidak bisa dikembalikan kecuali kamu punya file backup.',
      danger: true, confirmText: 'Ya, hapus semua'
    });
    if (!ok2) return;
    await KH.db.resetAll();
    await seedDefaults();
    await reload();
    u.toast('Semua data telah direset');
  }

  /* ================= Init & PWA ================= */
  function registerSW() {
    if ('serviceWorker' in navigator) {
      // Path relatif: aman untuk GitHub Pages subpath seperti /kashar/
      navigator.serviceWorker.register('./sw.js').catch(() => { /* offline dari file:// tetap jalan tanpa SW */ });
    }
  }

  async function init() {
    const savedTheme = localStorage.getItem('kashar-theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);
    await seedDefaults();
    await loadAll();
    document.querySelectorAll('[data-route]').forEach((b) => {
      b.addEventListener('click', () => { nav(b.dataset.route); });
    });
    const addBtn = document.getElementById('nav-add');
    if (addBtn) addBtn.onclick = openAddSheet;
    window.addEventListener('hashchange', renderRoute);
    renderRoute();
    registerSW();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    S, getSetting, setSetting, walletBalance, effectiveBalance, totalBalance,
    monthStats, monthCategoryExpense, budgetOverall, txDelta,
    getCategories, getCategory, getWallet,
    reload, renderCurrent, nav, openAddSheet, applyTheme, toggleTheme,
    viewHeader, emptyState, progressBar, txRow, drawBarChart, cssVar
  };
})();
