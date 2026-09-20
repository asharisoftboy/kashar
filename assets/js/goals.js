/* KasHar — target tabungan */
window.KH = window.KH || {};

KH.goals = (() => {
  const ICONS = ['🎯', '🏍️', '🚗', '🏠', '✈️', '💻', '📱', '💍', '🎓', '🏖️', '💰', '🎁'];

  function render() {
    const u = KH.utils, app = KH.app;
    const el = document.getElementById('view');
    const goals = [...app.S.goals].sort((a, b) => String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')));

    el.innerHTML =
      app.viewHeader('Target Tabungan', '<button class="btn btn-primary btn-sm" id="g-add">＋ Tambah</button>') +
      (goals.length
        ? goals.map((g) => cardHTML(g)).join('')
        : '<div class="card">' + app.emptyState('🎯', 'Belum ada target', 'Mulai menabung untuk impianmu') + '</div>');

    document.getElementById('g-add').onclick = () => openForm(null);
    el.querySelectorAll('[data-addfund]').forEach((x) => { x.onclick = () => openAddFund(x.dataset.addfund); });
    el.querySelectorAll('[data-edit]').forEach((x) => { x.onclick = () => openForm(x.dataset.edit); });
    el.querySelectorAll('[data-del]').forEach((x) => { x.onclick = () => remove(x.dataset.del); });
  }

  function cardHTML(g) {
    const u = KH.utils;
    const target = Number(g.target) || 0;
    const saved = Number(g.saved) || 0;
    const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
    const dLeft = g.deadline ? u.daysUntil(g.deadline) : null;
    let dlText;
    if (g.done) dlText = '<span class="status-badge status-paid">🎉 Tercapai</span>';
    else if (dLeft === null) dlText = '<span class="muted mini">Tanpa deadline</span>';
    else if (dLeft < 0) dlText = '<span class="mini danger-text">Lewat ' + Math.abs(dLeft) + ' hari</span>';
    else dlText = '<span class="muted mini">⏳ ' + (dLeft === 0 ? 'hari ini' : dLeft + ' hari lagi') + ' · ' + u.fmtDate(g.deadline) + '</span>';
    return '<div class="card goal-card">' +
      '<div class="debt-card">' +
        '<span class="debt-ic" style="background:var(--primary-soft)">' + u.esc(g.icon || '🎯') + '</span>' +
        '<div class="debt-info"><b>' + u.esc(g.name) + '</b>' +
          '<p class="muted mini">' + u.fmtIDR(saved) + ' dari ' + u.fmtIDR(target) + ' · ' + pct + '%</p></div>' +
        dlText +
      '</div>' +
      KH.app.progressBar(pct, g.done ? '' : pct >= 100 ? 'danger' : '') +
      (g.note ? '<p class="muted mini mt">📝 ' + u.esc(g.note) + '</p>' : '') +
      '<div class="debt-actions">' +
        '<button class="btn btn-primary btn-sm" data-addfund="' + g.id + '">＋ Tambah dana</button>' +
        '<button class="btn btn-ghost btn-sm" data-edit="' + g.id + '">✏️ Edit</button>' +
        '<button class="btn btn-ghost btn-sm" data-del="' + g.id + '">🗑️</button>' +
      '</div>' +
    '</div>';
  }

  function openForm(id) {
    const u = KH.utils, app = KH.app;
    const g = id ? app.S.goals.find((x) => x.id === id) : null;
    const isEdit = !!g;

    u.openModal(
      u.sheetHead(isEdit ? 'Edit Target' : 'Tambah Target') +
      '<form id="g-form" class="form">' +
        '<div><label>Ikon</label><div class="emoji-grid" style="grid-template-columns:repeat(6,1fr);max-height:none" id="g-icons">' +
          ICONS.map((i) => '<button type="button" class="emoji-opt ' + ((g ? g.icon : ICONS[0]) === i ? 'active' : '') + '" data-i="' + i + '">' + i + '</button>').join('') +
        '</div></div>' +
        '<div><label>Nama target</label><input type="text" id="g-name" maxlength="30" placeholder="cth: Motor Impian" value="' + (g ? u.esc(g.name) : '') + '" required autocomplete="off"></div>' +
        '<div class="form-row">' +
          '<div><label>Target nominal</label><input type="text" inputmode="numeric" id="g-target" placeholder="0" value="' + (g ? u.fmtNum(g.target) : '') + '" autocomplete="off"></div>' +
          '<div><label>Sudah terkumpul</label><input type="text" inputmode="numeric" id="g-saved" placeholder="0" value="' + (g ? u.fmtNum(g.saved) : '') + '" autocomplete="off"></div>' +
        '</div>' +
        '<div><label>Target tanggal (opsional)</label><input type="date" id="g-deadline" value="' + (g && g.deadline ? g.deadline : '') + '"></div>' +
        '<div><label>Catatan (opsional)</label><input type="text" id="g-note" maxlength="80" placeholder="cth: DP motor" value="' + (g ? u.esc(g.note || '') : '') + '" autocomplete="off"></div>' +
        '<button class="btn btn-primary btn-block" type="submit">' + (isEdit ? 'Simpan' : 'Buat Target') + '</button>' +
      '</form>',
      { sheet: true }
    );
    u.wireClose();

    let icon = g ? g.icon : ICONS[0];
    document.querySelectorAll('#g-icons .emoji-opt').forEach((b) => {
      b.onclick = () => { icon = b.dataset.i; document.querySelectorAll('#g-icons .emoji-opt').forEach((x) => x.classList.toggle('active', x === b)); };
    });
    ['g-target', 'g-saved'].forEach((fid) => {
      const inp = document.getElementById(fid);
      inp.addEventListener('input', () => {
        const raw = u.parseAmount(inp.value);
        inp.value = raw ? u.fmtNum(raw) : '';
      });
    });

    document.getElementById('g-form').onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('g-name').value.trim();
      const target = u.parseAmount(document.getElementById('g-target').value);
      const saved = u.parseAmount(document.getElementById('g-saved').value);
      if (!name) { u.toast('Nama target wajib diisi', 'error'); return; }
      if (!target || target <= 0) { u.toast('Target nominal harus lebih dari 0', 'error'); return; }
      await KH.db.put('goals', {
        id: isEdit ? g.id : u.uid(), name: name, icon: icon, target: target,
        saved: Math.min(saved, target), deadline: document.getElementById('g-deadline').value || null,
        note: document.getElementById('g-note').value.trim(),
        done: isEdit ? g.done : false, createdAt: isEdit ? g.createdAt : Date.now()
      });
      await app.reload();
      u.closeModal();
      u.toast(isEdit ? 'Target diperbarui ✓' : 'Target dibuat ✓');
    };
  }

  function openAddFund(id) {
    const u = KH.utils, app = KH.app;
    const g = app.S.goals.find((x) => x.id === id);
    if (!g) return;
    u.openModal(
      u.sheetHead('Tambah Dana — ' + g.name) +
      '<form id="af-form" class="form">' +
        '<p class="muted small">Terkumpul: <b>' + u.fmtIDR(g.saved) + '</b> dari ' + u.fmtIDR(g.target) + '</p>' +
        '<div><label>Nominal</label><input type="text" inputmode="numeric" class="amount-input" id="af-amount" placeholder="0" autocomplete="off"></div>' +
        '<button class="btn btn-primary btn-block" type="submit">Simpan Dana</button>' +
      '</form>',
      { sheet: true }
    );
    u.wireClose();
    const amt = document.getElementById('af-amount');
    amt.addEventListener('input', () => {
      const raw = u.parseAmount(amt.value);
      amt.value = raw ? u.fmtNum(raw) : '';
    });
    document.getElementById('af-form').onsubmit = async (e) => {
      e.preventDefault();
      const add = u.parseAmount(amt.value);
      if (!add || add <= 0) { u.toast('Nominal harus lebih dari 0', 'error'); return; }
      const newSaved = Math.min((Number(g.saved) || 0) + add, Number(g.target) || 0);
      const reached = newSaved >= (Number(g.target) || Infinity);
      await KH.db.put('goals', Object.assign({}, g, { saved: newSaved, done: g.done || reached }));
      await app.reload();
      u.closeModal();
      u.toast(reached && !g.done ? '🎉 Target tercapai!' : 'Dana ditambahkan ✓');
    };
  }

  async function remove(id) {
    const u = KH.utils;
    const ok = await u.confirmDialog({ title: 'Hapus target?', message: 'Target tabungan akan dihapus permanen.', danger: true, confirmText: 'Hapus' });
    if (!ok) return;
    await KH.db.del('goals', id);
    await KH.app.reload();
    u.toast('Target dihapus');
  }

  return { render, openForm, openAddFund, remove };
})();
