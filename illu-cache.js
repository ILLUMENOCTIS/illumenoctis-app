/* ILLUMÉNOCTIS 1.2.216 — the copy of the shared data kept on this computer.
   (17 Nov 2026, after the Supabase download limit was used up: every program start and every reconnect
   downloaded every list in full again.) Lists are kept here between starts, so a start only asks the
   database for what changed since last time. Nothing here is ever the only copy: if this store is
   missing, damaged or unavailable, the program simply downloads the list again, as before.
   One store per Supabase project, so moving to another project never mixes data. */
(function () {
'use strict';
const REF = (() => { try { return new URL(window.ILLU_CONFIG.url).hostname.split('.')[0]; } catch (e) { return 'x'; } })();
const NAME = 'illu-cache-' + REF;
let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise(res => {
    let req;
    try { req = indexedDB.open(NAME, 1); } catch (e) { res(null); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs', { keyPath: 'path' }).createIndex('coll', 'coll');
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => res(null);
    req.onblocked = () => res(null);
  });
  return dbp;
}
const done = tx => new Promise(res => { tx.oncomplete = () => res(true); tx.onerror = tx.onabort = () => res(false); });
async function getMeta(k) {
  const db = await open(); if (!db) return null;
  return new Promise(res => { try { const r = db.transaction('meta').objectStore('meta').get(k); r.onsuccess = () => res(r.result === undefined ? null : r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
}
async function setMeta(k, v) {
  const db = await open(); if (!db) return false;
  try { const tx = db.transaction('meta', 'readwrite'); tx.objectStore('meta').put(v, k); return done(tx); } catch (e) { return false; }
}
async function collRows(coll) {
  const db = await open(); if (!db) return null;
  return new Promise(res => { try { const r = db.transaction('docs').objectStore('docs').index('coll').getAll(coll); r.onsuccess = () => res(r.result || []); r.onerror = () => res(null); } catch (e) { res(null); } });
}
async function getRow(path) {
  const db = await open(); if (!db) return null;
  return new Promise(res => { try { const r = db.transaction('docs').objectStore('docs').get(path); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); } catch (e) { res(null); } });
}
/* rows: [{path, coll, id, data}] - put; dels: [path] - removed */
async function apply(rows, dels) {
  const db = await open(); if (!db) return false;
  try {
    const tx = db.transaction('docs', 'readwrite'), st = tx.objectStore('docs');
    for (const r of rows || []) if (r && r.path) st.put({ path: r.path, coll: r.coll, id: r.id, data: r.data, u: r.u || '' });
    for (const p of dels || []) st.delete(p);
    return done(tx);
  } catch (e) { return false; }
}
async function replaceColl(coll, rows) {
  const db = await open(); if (!db) return false;
  try {
    const tx = db.transaction('docs', 'readwrite'), st = tx.objectStore('docs');
    const keys = await new Promise(res => { const r = st.index('coll').getAllKeys(coll); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); });
    for (const k of keys) st.delete(k);
    for (const r of rows) st.put({ path: r.path, coll, id: r.id, data: r.data, u: r.u || '' });
    return done(tx);
  } catch (e) { return false; }
}
async function clearAll() {
  const db = await open(); if (!db) return false;
  try { const tx = db.transaction(['docs', 'meta'], 'readwrite'); tx.objectStore('docs').clear(); tx.objectStore('meta').clear(); return done(tx); } catch (e) { return false; }
}
window.IlluCache = Object.freeze({ open, getMeta, setMeta, collRows, getRow, apply, replaceColl, clearAll, name: NAME });
})();
