/* KasHar — transaksi: riwayat, filter, search, tambah/edit/hapus */
window.KH = window.KH || {};

KH.transactions = (() => {
  const F = { q: '', type: 'all', cat: '', wallet: '', from: '', to: '', sort: 'desc' };

  function render() {
    const u = KH.utils, app = KH.app;
    const el = document.getElementById('view');
    const cats = app.S.categories;
    const wallets = app.S.wallets;

    el.innerHTML =
      app.viewHeader('Transaksi') +
      '<div class="filter-bar">' +
        '<div class="search-box"><input id="f-q" type="search" placeholder="Cari catatan atau kategori..." value="' + u.esc(F.q) + '"></div>' +
        '<div class="chip-row" id="type-chips">' +
          [['all', 'Semua'], ['income', 'Masuk'], ['expense', 'Keluar'], ['transfer', 'Transfer']].map(([v, l]) =>
            '<button class="chip ' + (F.type === v ? 'active' : '') + '" data-v="' + v + '">' + l + '</button>').join('') +
        '</div>' +
        '<div class="filter-row">' +
          '<select id="f-cat"><option value="">Semua kategori</option>' +
            cats.map((c) => '<option value="' + c.id + '" ' + (F.cat === c.id ? 'selected' : '') + '>' + c.icon + ' ' + u.esc(c.name) + '</option>').join('') +
          '</select>' +
          '<select id="f-wallet"><option value="">Semua dompet</option>' +
            wallets.map((w) => '<option value="' + w.id + '" ' + (F.wallet === w.id ? 'selected' : '') + '>' + u.esc(w.icon || '') + ' ' + u.esc(w.name) + '</option>').join('') +
          '</select>' +
          '<select id="f-sort">' +
            '<option value="desc" ' + (F.sort === 'desc' ? 'selected' : '') + '>Terbaru dulu</option>' +
            '<option value="asc" ' + (F.sort === 'asc' ? 'selected' : '') + '>Terlama dulu</option>' +
          '</select>' +
        '</div>' +
        '<div class="filter-row">' +
          '<input type="date" id="f-from" value="' + F.from + '" title="Dari tanggal">' +
          '<input type="date" id="f-to" value="' + F.to + '" title="Sampai tanggal">' +
        '</div>' +
      '</div>' +
      '<div id="tx-list"></div>';

    document.getElementById('f-q').addEventListener('input', u.debounce((e) => { F.q = e.target.value; paintList(); }, 200));
    document.querySelectorAll('#type-chips .chip').forEach((b) => {
      b.onclick = () => {
        F.type = b.dataset.v;
        document.querySelectorAll('#type-chips .chip').forEach((x) => x.classList.toggle('active', x === b));
        paintList();
      };
    });
    document.getElementById('f-cat').onchange = (e) => { F.cat = e.target.value; paintList(); };
    document.getElementById('f-wallet').onchange = (e) => { F.wallet = e.target.value; paintList(); };
    document.getElementById('f-sort').onchange = (e) => { F.sort = e.target.value; paintList(); };
    document.getElementById('f-from').onchange = (e) => { F.from = e.target.value; paintList(); };
    document.getElementById('f-to').onchange = (e) => { F.to = e.target.value; paintList(); };
    paintList();
  }

  function filtered() {
    const q = F.q.trim().toLowerCase();
    let list = KH.app.S.transactions.filter((t) => {
      if (F.type !== 'all' && t.type !== F.type) return false;
      if (F.cat && t.categoryId !== F.cat) return false;
      if (F.wallet && t.walletId !== F.wallet && t.fromWalletId !== F.wallet && t.toWalletId !== F.wallet) return false;
      if (F.from && t.date < F.from) return false;
      if (F.to && t.date > F.to) return false;
      if (q) {
        const c = KH.app.getCategory(t.categoryId);
        const hay = ((t.note || '') + ' ' + (c ? c.name : '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const dir = F.sort === 'asc' ? 1 : -1;
    list.sort((a, b) => dir * (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    return list;
  }

  function paintList() {
    const u = KH.utils, app = KH.app;
    const box = document.getElementById('tx-list');
    if (!box) return;
    const list = filtered();
    if (!list.length) {
      box.innerHTML = '<div class="card">' + app.emptyState('🔍', 'Tidak ada transaksi', 'Coba ubah filter atau tambah transaksi baru') + '</div>';
      return;
    }
    let html = '', lastDate = null;
    list.forEach((t) => {
      if (t.date !== lastDate) {
        html += '<p class="date-group">' + u.fmtDateLong(t.date) + '</p>';
        lastDate = t.date;
      }
      html += app.txRow(t);
    });
    box.innerHTML = html;
    box.querySelectorAll('.tx-row').forEach((r) => { r.onclick = () => openDetail(r.dataset.tx); });
  }

  /* ---------- Detail ---------- */
  function openDetail(id) {
    const u = KH.utils, app = KH.app;
    const t = app.S.transactions.find((x) => x.id === id);
    if (!t) return;
    let rows;
    if (t.type === 'transfer') {
      const from = app.getWallet(t.fromWalletId), to = app.getWallet(t.toWalletId);
      rows = [
        ['Jenis', 'Transfer antar dompet'],
        ['Dari dompet', from ? from.icon + ' ' + from.name : '-'],
        ['Ke dompet', to ? to.icon + ' ' + to.name : '-'],
        ['Nominal', u.fmtIDR(t.amount)],
        ['Tanggal', u.fmtDateLong(t.date) + ' · ' + (t.time || '-')],
        ['Catatan', t.note || '-']
      ];
    } else {
      const c = app.getCategory(t.categoryId), w = app.getWallet(t.walletId);
      rows = [
        ['Jenis', t.type === 'income' ? '📈 Pemasukan' : '📉 Pengeluaran'],
        ['Kategori', c ? c.icon + ' ' + c.name : '-'],
        ['Dompet', w ? w.icon + ' ' + w.name : '-'],
        ['Nominal', (t.type === 'income' ? '+' : '−') + u.fmtIDR(t.amount)],
        ['Tanggal', u.fmtDateLong(t.date) + ' · ' + (t.time || '-')],
        ['Catatan', t.note || '-']
      ];
    }
    u.openModal(
      u.sheetHead('Detail Transaksi') +
      '<div class="detail-box">' + rows.map(([k, v]) =>
        '<div class="detail-row"><span class="muted mini">' + k + '</span><b>' + u.esc(String(v)) + '</b></div>').join('') +
      '</div>' +
      '<div class="row-gap">' +
        '<button class="btn btn-ghost" id="d-edit">✏️ Edit</button>' +
        '<button class="btn btn-danger" id="d-del">🗑️ Hapus</button>' +
      '</div>'
    );
    u.wireClose();
    document.getElementById('d-edit').onclick = () => openForm(t.type, t);
    document.getElementById('d-del').onclick = () => remove(t.id);
  }

  /* ---------- Form tambah / edit ---------- */
  function openForm(type, editTx) {
    const u = KH.utils, app = KH.app;
    const wallets = app.S.wallets;

    if (!wallets.length) {
      u.toast('Buat dompet dulu sebelum transaksi', 'error');
      app.nav('wallets');
      return;
    }
    if (type !== 'transfer' && !app.getCategories(type).length) {
      u.toast('Buat kategori dulu di menu Akun', 'error');
      return;
    }

    const isEdit = !!editTx;
    const t = editTx || {};
    const title = (isEdit ? 'Edit ' : 'Tambah ') + (type === 'income' ? 'Pemasukan' : type === 'expense' ? 'Pengeluaran' : 'Transfer');

    const walletOpts = (sel) => wallets.map((w) =>
      '<option value="' + w.id + '" ' + (sel === w.id ? 'selected' : '') + '>' + u.esc(w.icon || '💼') + ' ' + u.esc(w.name) + '</option>').join('');

    let body;
    if (type === 'transfer') {
      body =
        '<div class="form-row">' +
          '<div><label>Dari dompet</label><select id="f-from">' + walletOpts(t.fromWalletId || wallets[0].id) + '</select></div>' +
          '<div><label>Ke dompet</label><select id="f-to">' + walletOpts(t.toWalletId || (wallets[1] ? wallets[1].id : wallets[0].id)) + '</select></div>' +
        '</div>';
    } else {
      const cats = app.getCategories(type);
      body =
        '<div><label>Kategori</label><div class="cat-pick" id="cat-pick">' +
          cats.map((c) => '<button type="button" class="cat-opt ' + (t.categoryId === c.id ? 'active' : '') + '" data-c="' + c.id + '">' + u.esc(c.icon) + ' ' + u.esc(c.name) + '</button>').join('') +
        '</div></div>' +
        '<div><label>Dompet / sumber dana</label><select id="f-wallet">' + walletOpts(t.walletId || wallets[0].id) + '</select></div>';
    }

    u.openModal(
      u.sheetHead(title) +
      '<form id="tx-form" class="form" novalidate>' +
        '<div><label>Nominal</label>' +
          '<input type="text" inputmode="numeric" class="amount-input" id="f-amount" placeholder="0" value="' + (isEdit ? u.fmtNum(t.amount) : '') + '" autocomplete="off">' +
        '</div>' +
        body +
        '<div class="form-row">' +
          '<div><label>Tanggal</label><input type="date" id="f-date" value="' + (t.date || u.todayISO()) + '" required></div>' +
          '<div><label>Waktu</label><input type="time" id="f-time" value="' + (t.time || u.nowTime()) + '" required></div>' +
        '</div>' +
        '<div><label>Catatan <span class="muted">(opsional)</span></label>' +
          '<input type="text" id="f-note" maxlength="80" placeholder="cth: Bakso langganan" value="' + u.esc(t.note || '') + '" autocomplete="off">' +
        '</div>' +
        '<button class="btn btn-primary btn-block" type="submit">' + (isEdit ? 'Simpan Perubahan' : 'Simpan Transaksi') + '</button>' +
        '<p class="fab-note">Data tersimpan aman di perangkat ini</p>' +
      '</form>',
      { sheet: true }
    );
    u.wireClose();

    // Format nominal Rupiah otomatis
    const amt = document.getElementById('f-amount');
    amt.addEventListener('input', () => {
      const raw = u.parseAmount(amt.value);
      amt.value = raw ? u.fmtNum(raw) : '';
    });

    if (type !== 'transfer') {
      document.querySelectorAll('#cat-pick .cat-opt').forEach((b) => {
        b.onclick = () => {
          document.querySelectorAll('#cat-pick .cat-opt').forEach((x) => x.classList.toggle('active', x === b));
        };
      });
    }

    document.getElementById('tx-form').onsubmit = async (e) => {
      e.preventDefault();
      const amount = u.parseAmount(amt.value);
      const date = document.getElementById('f-date').value;
      const time = document.getElementById('f-time').value;
      const note = document.getElementById('f-note').value.trim();

      if (!amount || amount <= 0) { u.toast('Nominal harus lebih dari 0', 'error'); amt.focus(); return; }
      if (!date) { u.toast('Tanggal wajib diisi', 'error'); return; }

      let tx;
      if (type === 'transfer') {
        const fromId = document.getElementById('f-from').value;
        const toId = document.getElementById('f-to').value;
        if (fromId === toId) { u.toast('Dompet asal dan tujuan tidak boleh sama', 'error'); return; }
        const from = app.getWallet(fromId);
        if (app.effectiveBalance(from, isEdit ? t : null) < amount) {
          u.toast('Saldo "' + from.name + '" tidak mencukupi', 'error'); return;
        }
        tx = {
          id: isEdit ? t.id : u.uid(), type: 'transfer', amount: amount,
          fromWalletId: fromId, toWalletId: toId, categoryId: null,
          walletId: null, note: note, date: date, time: time,
          createdAt: isEdit ? t.createdAt : Date.now()
        };
      } else {
        const activeCat = document.querySelector('#cat-pick .cat-opt.active');
        if (!activeCat) { u.toast('Pilih kategori dulu', 'error'); return; }
        const walletId = document.getElementById('f-wallet').value;
        if (type === 'expense') {
          const w = app.getWallet(walletId);
          if (app.effectiveBalance(w, isEdit ? t : null) < amount) {
            u.toast('Saldo "' + w.name + '" tidak mencukupi', 'error'); return;
          }
        }
        tx = {
          id: isEdit ? t.id : u.uid(), type: type, amount: amount,
          categoryId: activeCat.dataset.c, walletId: walletId,
          fromWalletId: null, toWalletId: null,
          note: note, date: date, time: time,
          createdAt: isEdit ? t.createdAt : Date.now()
        };
      }

      await KH.db.put('transactions', tx);
      await app.reload();
      u.closeModal();
      u.toast(isEdit ? 'Transaksi berhasil diperbarui ✓' : 'Transaksi berhasil ditambahkan ✓');
    };
  }

  async function remove(id) {
    const u = KH.utils;
    const ok = await u.confirmDialog({
      title: 'Hapus transaksi?', message: 'Transaksi akan dihapus permanen dan saldo dompet menyesuaikan.',
      danger: true, confirmText: 'Hapus'
    });
    if (!ok) return;
    await KH.db.del('transactions', id);
    await KH.app.reload();
    u.toast('Transaksi berhasil dihapus');
  }

  return { render, openForm, openDetail, remove };
})();
