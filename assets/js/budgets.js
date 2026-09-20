/* KasHar — budget per kategori per bulan */
window.KH = window.KH || {};

KH.budgets = (() => {
  function render() {
    const u = KH.utils, app = KH.app;
    const el = document.getElementById('view');
    const mk = u.monthKey(u.todayISO());
    const budgets = [...app.S.budgets];

    el.innerHTML =
      app.viewHeader('Budget', '<button class="btn btn-primary btn-sm" id="b-add">＋ Tambah</button>') +
      '<p class="muted small section-gap">Anggaran untuk ' + u.monthLabel(mk) + ' per kategori pengeluaran.</p>' +
      (budgets.length
        ? budgets.map((b) => {
            const c = app.getCategory(b.categoryId);
            const used = app.monthCategoryExpense(b.categoryId, mk);
            const limit = Number(b.limit) || 0;
            const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
            const sisa = limit - used;
            const cls = pct >= 100 ? 'danger' : pct >= 80 ? 'warn' : '';
            return '<div class="card budget-card">' +
              '<div class="debt-card">' +
                '<span class="debt-ic" style="background:var(--bg)">' + (c ? u.esc(c.icon) : '🏷️') + '</span>' +
                '<div class="debt-info"><b>' + (c ? u.esc(c.name) : 'Kategori terhapus') + '</b>' +
                  '<p class="muted mini">Limit ' + u.fmtIDR(limit) + ' / bulan</p></div>' +
                '<button class="icon-btn sm" data-edit="' + b.id + '">✏️</button>' +
                '<button class="icon-btn sm" data-del="' + b.id + '">🗑️</button>' +
              '</div>' +
              app.progressBar(pct, cls) +
              '<div class="budget-meta">' +
                '<span class="mini">Terpakai <b>' + u.fmtIDR(used) + '</b> (' + pct + '%)</span>' +
                '<span class="mini ' + (sisa < 0 ? 'danger-text' : '') + '">' + (sisa < 0 ? 'Lebih ' + u.fmtIDR(-sisa) + ' ⚠️' : 'Sisa ' + u.fmtIDR(sisa)) + '</span>' +
              '</div>' +
            '</div>';
          }).join('')
        : '<div class="card">' + app.emptyState('🧾', 'Belum ada budget', 'Contoh: Budget makanan Rp1.000.000/bulan') + '</div>');

    document.getElementById('b-add').onclick = () => openForm(null);
    el.querySelectorAll('[data-edit]').forEach((x) => { x.onclick = () => openForm(x.dataset.edit); });
    el.querySelectorAll('[data-del]').forEach((x) => { x.onclick = () => remove(x.dataset.del); });
  }

  function openForm(id) {
    const u = KH.utils, app = KH.app;
    const b = id ? app.S.budgets.find((x) => x.id === id) : null;
    const isEdit = !!b;
    const taken = app.S.budgets.filter((x) => x.id !== id).map((x) => x.categoryId);
    const cats = app.getCategories('expense').filter((c) => !taken.includes(c.id));

    if (!cats.length && !isEdit) {
      u.toast('Semua kategori pengeluaran sudah punya budget', 'error');
      return;
    }

    u.openModal(
      u.sheetHead(isEdit ? 'Edit Budget' : 'Tambah Budget') +
      '<form id="b-form" class="form">' +
        '<div><label>Kategori pengeluaran</label><select id="b-cat">' +
          (isEdit
            ? (() => { const c = app.getCategory(b.categoryId); return '<option value="' + b.categoryId + '">' + (c ? c.icon + ' ' + u.esc(c.name) : '?') + '</option>'; })()
            : cats.map((c) => '<option value="' + c.id + '">' + u.esc(c.icon) + ' ' + u.esc(c.name) + '</option>').join('')) +
        '</select></div>' +
        '<div><label>Limit per bulan</label><input type="text" inputmode="numeric" class="amount-input" id="b-limit" placeholder="0" value="' + (isEdit ? u.fmtNum(b.limit) : '') + '" autocomplete="off"></div>' +
        '<button class="btn btn-primary btn-block" type="submit">' + (isEdit ? 'Simpan' : 'Tambah Budget') + '</button>' +
      '</form>',
      { sheet: true }
    );
    u.wireClose();

    const lim = document.getElementById('b-limit');
    lim.addEventListener('input', () => {
      const raw = u.parseAmount(lim.value);
      lim.value = raw ? u.fmtNum(raw) : '';
    });

    document.getElementById('b-form').onsubmit = async (e) => {
      e.preventDefault();
      const limit = u.parseAmount(lim.value);
      if (!limit || limit <= 0) { u.toast('Limit harus lebih dari 0', 'error'); return; }
      await KH.db.put('budgets', {
        id: isEdit ? b.id : u.uid(),
        categoryId: document.getElementById('b-cat').value,
        limit: limit, createdAt: isEdit ? b.createdAt : Date.now()
      });
      await app.reload();
      u.closeModal();
      u.toast(isEdit ? 'Budget diperbarui ✓' : 'Budget ditambahkan ✓');
    };
  }

  async function remove(id) {
    const u = KH.utils;
    const ok = await u.confirmDialog({ title: 'Hapus budget?', message: 'Budget akan dihapus, transaksi tidak terpengaruh.', danger: true, confirmText: 'Hapus' });
    if (!ok) return;
    await KH.db.del('budgets', id);
    await KH.app.reload();
    u.toast('Budget dihapus');
  }

  return { render, openForm, remove };
})();
