/* KasHar — dompet / sumber dana */
window.KH = window.KH || {};

KH.wallets = (() => {
  const COLORS = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2'];
  const ICONS = ['💵', '🏦', '💳', '📱', '🪙', '💰', '🧾', '🏧'];

  function render() {
    const u = KH.utils, app = KH.app;
    const el = document.getElementById('view');
    el.innerHTML =
      app.viewHeader('Dompet', '<button class="btn btn-primary btn-sm" id="w-add">＋ Tambah</button>') +
      (app.S.wallets.length
        ? '<div class="two-col">' + app.S.wallets.map((w) => {
            const bal = app.walletBalance(w);
            return '<div class="card wallet-card" style="border-top:3px solid ' + u.esc(w.color || '#0d9488') + '">' +
              '<div class="wallet-card-head"><span class="wallet-ic" style="background:' + u.esc(w.color || '#0d9488') + '22">' + u.esc(w.icon || '💼') + '</span>' +
              '<div style="flex:1;min-width:0"><b>' + u.esc(w.name) + '</b></div>' +
              '<button class="icon-btn sm" data-edit="' + w.id + '">✏️</button>' +
              '<button class="icon-btn sm" data-del="' + w.id + '">🗑️</button></div>' +
              '<p class="muted mini">Saldo saat ini</p>' +
              '<h3 style="font-size:19px" class="' + (bal < 0 ? 'danger-text' : '') + '">' + u.fmtIDR(bal) + '</h3>' +
            '</div>';
          }).join('') + '</div>' +
          '<div class="card"><p class="muted mini">💡 Total semua dompet: <b class="text-' + (app.totalBalance() < 0 ? 'expense' : 'income') + '">' + u.fmtIDR(app.totalBalance()) + '</b></p></div>'
        : '<div class="card">' + app.emptyState('💼', 'Belum ada dompet', 'Buat dompet seperti Cash, DANA, atau rekening bank') + '</div>');

    const add = document.getElementById('w-add');
    if (add) add.onclick = () => openForm(null);
    el.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => openForm(b.dataset.edit); });
    el.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => remove(b.dataset.del); });
  }

  function openForm(id) {
    const u = KH.utils, app = KH.app;
    const w = id ? app.getWallet(id) : null;
    const isEdit = !!w;

    u.openModal(
      u.sheetHead(isEdit ? 'Edit Dompet' : 'Tambah Dompet') +
      '<form id="w-form" class="form">' +
        '<div><label>Ikon</label><div class="emoji-grid" style="grid-template-columns:repeat(8,1fr);max-height:none" id="w-icons">' +
          ICONS.map((i) => '<button type="button" class="emoji-opt ' + ((w ? w.icon : ICONS[0]) === i ? 'active' : '') + '" data-i="' + i + '">' + i + '</button>').join('') +
        '</div></div>' +
        '<div><label>Nama dompet</label><input type="text" id="w-name" maxlength="20" placeholder="cth: DANA, SeaBank, Cash" value="' + (w ? u.esc(w.name) : '') + '" required autocomplete="off"></div>' +
        '<div><label>Warna</label><div class="emoji-grid" style="grid-template-columns:repeat(8,1fr);max-height:none" id="w-colors">' +
          COLORS.map((c) => '<button type="button" class="emoji-opt ' + ((w ? w.color : COLORS[0]) === c ? 'active' : '') + '" data-c="' + c + '" style="background:' + c + ';height:34px" aria-label="warna"></button>').join('') +
        '</div></div>' +
        (isEdit
          ? '<p class="muted mini">💡 Saldo dihitung otomatis dari seluruh transaksi.</p>'
          : '<div><label>Saldo awal (opsional)</label><input type="text" inputmode="numeric" id="w-balance" placeholder="0" autocomplete="off"></div>') +
        '<button class="btn btn-primary btn-block" type="submit">' + (isEdit ? 'Simpan' : 'Tambah Dompet') + '</button>' +
      '</form>',
      { sheet: true }
    );
    u.wireClose();

    let icon = w ? w.icon : ICONS[0];
    let color = w ? w.color : COLORS[0];
    document.querySelectorAll('#w-icons .emoji-opt').forEach((b) => {
      b.onclick = () => { icon = b.dataset.i; document.querySelectorAll('#w-icons .emoji-opt').forEach((x) => x.classList.toggle('active', x === b)); };
    });
    document.querySelectorAll('#w-colors .emoji-opt').forEach((b) => {
      b.onclick = () => { color = b.dataset.c; document.querySelectorAll('#w-colors .emoji-opt').forEach((x) => x.classList.toggle('active', x === b)); };
    });

    if (!isEdit) {
      const bal = document.getElementById('w-balance');
      bal.addEventListener('input', () => {
        const raw = u.parseAmount(bal.value);
        bal.value = raw ? u.fmtNum(raw) : '';
      });
    }

    document.getElementById('w-form').onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('w-name').value.trim();
      if (!name) { u.toast('Nama dompet wajib diisi', 'error'); return; }
      const rec = {
        id: isEdit ? w.id : u.uid(), name: name, icon: icon, color: color,
        initialBalance: isEdit ? w.initialBalance : u.parseAmount(document.getElementById('w-balance').value),
        createdAt: isEdit ? w.createdAt : Date.now()
      };
      await KH.db.put('wallets', rec);
      await app.reload();
      u.closeModal();
      u.toast(isEdit ? 'Dompet diperbarui ✓' : 'Dompet ditambahkan ✓');
    };
  }

  async function remove(id) {
    const u = KH.utils, app = KH.app;
    const used = app.S.transactions.some((t) => t.walletId === id || t.fromWalletId === id || t.toWalletId === id);
    if (used) { u.toast('Dompet punya riwayat transaksi, tidak bisa dihapus', 'error'); return; }
    const ok = await u.confirmDialog({ title: 'Hapus dompet?', message: 'Dompet akan dihapus permanen.', danger: true, confirmText: 'Hapus' });
    if (!ok) return;
    await KH.db.del('wallets', id);
    await app.reload();
    u.toast('Dompet dihapus');
  }

  return { render, openForm, remove };
})();
