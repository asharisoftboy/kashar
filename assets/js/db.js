/* KasHar — IndexedDB layer (KasHarDB)
   Semua data aplikasi disimpan lokal di perangkat. Tidak ada server. */
window.KH = window.KH || {};

KH.db = (() => {
  const DB_NAME = 'KasHarDB';
  const DB_VER = 1;
  const STORES = ['transactions', 'wallets', 'categories', 'budgets', 'goals', 'debts', 'settings'];
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        STORES.forEach((s) => {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
        });
      };
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }

  function wrap(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function store(name, mode) {
    const db = await open();
    return db.transaction(name, mode || 'readonly').objectStore(name);
  }

  async function getAll(s)  { return wrap((await store(s)).getAll()); }
  async function get(s, id) { return wrap((await store(s)).get(id)); }
  async function put(s, v)  { return wrap((await store(s, 'readwrite')).put(v)); }
  async function del(s, id) { return wrap((await store(s, 'readwrite')).delete(id)); }
  async function clear(s)   { return wrap((await store(s, 'readwrite')).clear()); }

  async function exportAll() {
    const out = { app: 'KasHar', version: 1, exportedAt: new Date().toISOString(), data: {} };
    for (const s of STORES) out.data[s] = await getAll(s);
    return out;
  }

  async function importAll(payload) {
    const data = payload && payload.data ? payload.data : payload;
    if (!data || typeof data !== 'object') throw new Error('File backup tidak valid');
    for (const s of STORES) {
      await clear(s);
      const rows = Array.isArray(data[s]) ? data[s] : [];
      for (const row of rows) await put(s, row);
    }
  }

  async function resetAll() {
    for (const s of STORES) await clear(s);
  }

  return { open, getAll, get, put, del, clear, exportAll, importAll, resetAll, STORES };
})();
