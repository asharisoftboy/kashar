/* KasHar — utang & piutang */
window.KH = window.KH || {};

KH.debts = (() => {
  let tab = 'owed'; // 'owed' = orang berutang ke saya (piutang), 'owe' = saya berutang

  function render() {
    const u = KH.utils, app = KH.app;
    const el = document.getElementById('view');
    const list = app.S.debts.filter((d) => d.direction === tab)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const openList = list.filter((d) => d.status !== 'paid');
    const paidList = list.filter((d) => d.status === 'paid');
    const totalOpen = openList.reduce((s, d) => s + d.amount, 0);

    el.innerHTML =
      app.viewHeader('Utang & Piutang', '<button class="btn btn-primary btn-sm" id="d-add">＋ Tambah</button>') +
      '<div class="seg">' +
        '<button class="seg-btn ' + (tab === 'owed' ? 'active' : '') + '" data-tab="owed">💰 Piutang saya</button>' +
        '<button class="seg-btn ' + (tab === 'owe' ? 'active' : '') + '" data-tab="owe">🤝 Saya berutang</button>' +
      '</div>' +
      (openList.length
        ? '<div class="card mini-card"><p class="muted mini">' + (tab === 'owed' ? 'Total piutang belum lunas' : 'Total utang belum lunas') + '</p><b>' + u.fmtIDR(totalOpen) + '</b></div>'
        : '') +
      (openList.length || paidList.length
        ? openList.map((d) => cardHTML(d)).join('') +
          (paidList.length ? '<p class="date-group">Sudah lunas</p>' + paidList.map((d) => cardHTML(d)).join('') : '')
        : '<div class="card">' + app.emptyState('🤝', 'Tidak ada catatan', 'Catat utang atau piutang di sini') + '</div>');

    document.getElementById('d-add').onclick = () => openForm(null);
    el.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; render(); }; });
    el.querySelectorAll('[data-edit]').forEach((x) => { x.onclick = () => openForm(x.dataset.edit); });
    el.querySelectorAll('[data-del]').forEach((x) => { x.onclick = () => remove(x.dataset.del); });
    el.querySelectorAll('[data-pay]').forEach((x) => { x.onclick = () => markPaid(x.dataset.pay); });
  }

  function cardHTML(d) {
    const u = KH.utils;
    const paid = d.status === 'paid';
    const dl = d.deadline ? u.daysUntil(d.deadline) : null;
    const dlTxt = d.deadline
      ? (paid ? '<p class="muted mini">Lunas · ' + u.fmtDate(d.paidDate || d.deadline) + '</p>'
        : dl < 0 ? '<p class="mini danger-text">⚠️ Lewat ' + Math.abs(dl) + ' hari · ' + u.fmtDate(d.deadline) + '</p>'
        : '<p class="muted mini">⏰ ' + (dl === 0 ? 'Jatuh tempo hari ini' : dl + ' hari lagi') + ' · ' + u.fmtDate(d.deadline) + '</p>')
      : '';
    return '<div class="card">' +
      '<div class="debt-card">' +
        '<span class="debt-ic" style="background:' + (paid ? 'var(--income-soft)' : 'var(--warn-soft)') + '">' + (paid ? '✅' : tab === 'owed' ? '💰' : '🤝') + '</span>' +
        '<div class="debt-info"><b>' + u.esc(d.person) + '</b>' +
          '<p class="mini"><b class="' + (paid ? 'text-income' : '') + '">' + u.fmtIDR(d.amount) + '</b> · ' + u.fmtDate(d.date) + '</p>' +
          dlTxt +
          (d.note ? '<p class="muted mini">📝 ' + u.esc(d.note) + '</p>' : '') +
        '</div>' +
        '<span class="status-badge ' + (paid ? 'status-paid' : 'status-open') + '">' + (paid ? 'Lunas' : 'Belum lunas') + '</span>' +
      '</div>' +
      (!paid ? '<div class="debt-actions">' +
        '<button class="btn btn-primary btn-sm" data-pay="' + d.id + '">✓ Tandai lunas</button>' +
        '<button class="btn btn-ghost btn-sm" data-edit="' + d.id + '">✏️</button>' +
        '<button class="btn btn-ghost btn-sm" data-del="' + d.id + '">🗑️</button>' +
      '</div>' : '<div class="debt-actions">' +
        '<button class="btn btn-ghost btn-sm" data-del="' + d.id + '">🗑️ Hapus</button>' +
      '</div>') +
    '</div>';
  }

  function openForm(id) {
    const u = KH.utils, app = KH.app;
    const d = id ? app.S.debts.find((x) => x.id === id) : null;
    const isEdit = !!d;
    let dir = d ? d.direction : tab;

    u.openModal(
      u.sheetHead(isEdit ? 'Edit Catatan' : 'Tambah Catatan') +
      '<form id="dbt-form" class="form">' +
        '<div class="seg" id="dbt-seg">' +
          '<button type="button" class="seg-btn ' + (dir === 'owed' ? 'active' : '') + '" data-d="owed">💰 Piutang saya</button>' +
          '<button type="button" class="seg-btn ' + (dir === 'owe' ? 'active' : '') + '" data-d="owe">🤝 Saya berutang</button>' +
        '</div>' +
        '<div><label>Nama orang</label><input type="text" id="dbt-person" maxlength="30" placeholder="cth: Budi" value="' + (d ? u.esc(d.person) : '') + '" required autocomplete="off"></div>' +
        '<div><label>Nominal</label><input type="text" inputmode="numeric" class="amount-input" id="dbt-amount" placeholder="0" value="' + (d ? u.fmtNum(d.amount) : '') + '" autocomplete="off"></div>' +
        '<div class="form-row">' +
          '<div><label>Tanggal</label><input type="date" id="dbt-date" value="' + (d ? d.date : u.todayISO()) + '"></div>' +
          '<div><label>Deadline (opsional)</label><input type="date" id="dbt-deadline" value="' + (d && d.deadline ? d.deadline : '') + '"></div>' +
        '</div>' +
        '<div><label>Catatan (opsional)</label><input type="text" id="dbt-note" maxlength="80" placeholder="cth: pinjam buat beli pulsa" value="' + (d ? u.esc(d.note || '') : '') + '" autocomplete="off"></div>' +
        '<button class="btn btn-primary btn-block" type="submit">' + (isEdit ? 'Simpan' : 'Tambah') + '</button>' +
      '</form>',
      { sheet: true }
    );
    u.wireClose();

    document.querySelectorAll('#dbt-seg .seg-btn').forEach((b) => {
      b.onclick = () => {
        dir = b.dataset.d;
        document.querySelectorAll('#dbt-seg .seg-btn').forEach((x) => x.classList.toggle('active', x === b));
      };
    });
    const amt = document.getElementById('dbt-amount');
    amt.addEventListener('input', () => {
      const raw = u.parseAmount(amt.value);
      amt.value = raw ? u.fmtNum(raw) : '';
    });

    document.getElementById('dbt-form').onsubmit = async (e) => {
      e.preventDefault();
      const person = document.getElementById('dbt-person').value.trim();
      const amount = u.parseAmount(amt.value);
      if (!person) { u.toast('Nama wajib diisi', 'error'); return; }
      if (!amount || amount <= 0) { u.toast('Nominal harus lebih dari 0', 'error'); return; }
      await KH.db.put('debts', {
        id: isEdit ? d.id : u.uid(), direction: dir, person: person, amount: amount,
        date: document.getElementById('dbt-date').value || u.todayISO(),
        deadline: document.getElementById('dbt-deadline').value || null,
        note: document.getElementById('dbt-note').value.trim(),
        status: isEdit ? d.status : 'open',
        paidDate: isEdit ? d.paidDate : null,
        createdAt: isEdit ? d.createdAt : Date.now()
      });
      await app.reload();
      u.closeModal();
      u.toast(isEdit ? 'Catatan diperbarui ✓' : 'Catatan ditambahkan ✓');
    };
  }

  async function markPaid(id) {
    const u = KH.utils, app = KH.app;
    const d = app.S.debts.find((x) => x.id === id);
    if (!d) return;
    const ok = await u.confirmDialog({
      title: 'Tandai lunas?',
      message: d.person + ' — ' + u.fmtIDR(d.amount) + ' akan ditandai sebagai lunas.',
      confirmText: 'Ya, lunas'
    });
    if (!ok) return;
    await KH.db.put('debts', Object.assign({}, d, { status: 'paid', paidDate: u.todayISO() }));
    await app.reload();
    u.toast('Ditandai lunas ✓');
  }

  async function remove(id) {
    const u = KH.utils;
    const ok = await u.confirmDialog({ title: 'Hapus catatan?', message: 'Catatan utang/piutang akan dihapus permanen.', danger: true, confirmText: 'Hapus' });
    if (!ok) return;
    await KH.db.del('debts', id);
    await KH.app.reload();
    u.toast('Catatan dihapus');
  }

  return { render, openForm, markPaid, remove };
})();
