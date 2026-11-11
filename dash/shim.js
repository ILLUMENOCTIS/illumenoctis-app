/* ILLUMÉNOCTIS — the dashboard's runtime, provided by the program.
   The dashboard was written against four services: a document store (db), a live room
   (room), a file store (assets) and file saving (downloads). Here each one is the same
   call shape, kept in the shared Supabase database instead of the page's own host. */
(function () {
'use strict';
const CFG = window.ILLU_CONFIG;
const sb = window.supabase.createClient(CFG.url, CFG.key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'illu.auth' },
  realtime: { params: { eventsPerSecond: 20 } }
});
window.__illuSb = sb;

/* ---------- who is signed in, and the directory, before the dashboard starts ---------- */
const DIR = (window.illu && window.illu.dirSync) ? window.illu.dirSync() : (window.__ILLU_TESTDIR || null);
window.__ILLU_AG = (DIR && DIR.ag) || [];
window.__ILLU_ADMIN = (DIR && DIR.admin) || '';
const ME = (DIR && DIR.me) || '';
try { if (ME) localStorage.setItem('illum.me', ME); } catch (e) {}

let SESSION = null;
const gate = () => { try { location.replace('../index.html'); } catch (e) {} };
sb.auth.onAuthStateChange((ev, s) => {
  SESSION = s;
  if (s && window.illu && window.illu.setToken) window.illu.setToken(s.access_token);
  if (ev === 'SIGNED_OUT' || (ev === 'INITIAL_SESSION' && !s) || (s && ME && s.user.id !== ME)) gate();
});
window.__illuSignOut = async () => { try { await sb.auth.signOut(); } catch (e) {} try { localStorage.removeItem('illum.me'); } catch (e) {} gate(); };

const err = (code, message) => { const e = new Error(message || code); e.code = code; return e; };
const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
function freeze(o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const k in o) freeze(o[k]); } return o; }
const rid = (n) => { const a = new Uint8Array(n || 10); crypto.getRandomValues(a); return [...a].map(b => b.toString(36).padStart(2, '0')).join('').slice(0, (n || 10) * 2); };

/* ================= db ================= */
const SEG = /^[A-Za-z0-9_\-.~:@+]+$/;
function segs(p) {
  const s = String(p == null ? '' : p).split('/');
  if (!s.length || s.length > 16 || String(p).length > 1000) throw new TypeError('db path: ' + p);
  for (const x of s) if (!x || x === '.' || x === '..' || !SEG.test(x) || x.length > 200) throw new TypeError('db path segment "' + x + '" in ' + p);
  return s;
}
const META = { fromCache: false, hasPendingWrites: false };
/* An ID's password is kept by the program's sign-in, not on the person's document; the
   dashboard is told one is set (so it offers "change password", never "set one"). */
function view(coll, data) {
  if (coll !== 'people' || !data || data.x || data.mg) return data;
  return Object.assign({}, data, { h: 'program', s: '' });
}
function dsnap(id, data) {
  const d = data == null ? undefined : freeze(clone(data));
  return { id, exists: data != null, data: () => d, metadata: META };
}
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function merge(a, b) {
  const o = Object.assign({}, a);
  for (const k of Object.keys(b)) o[k] = (isObj(b[k]) && isObj(o[k])) ? merge(o[k], b[k]) : b[k];
  return o;
}
function checkBody(data) {
  if (!isObj(data)) throw err('invalid_argument', 'a document body must be an object');
  const s = JSON.stringify(data);
  if (s.length > 262144 * 4) throw err('invalid_argument', 'document over the size limit');
  return JSON.parse(s);
}

/* live changes: one stream for the whole store, handed to whichever listener it concerns.
   1.2.129 (10 Nov 2026): the stream can go quiet without saying so (the computer slept, the network
   changed, the sign-in token was renewed late) - then nobody else's changes arrive (who is here, votes,
   cards) until the program is restarted. Every open program writes its own heartbeat every 30 s and the
   stream echoes it back, so a healthy stream is never silent for long. If nothing at all has come
   through for 75 s, or the stream reports an error, it is closed and opened again, and every board
   re-reads what it shows so nothing missed in between stays missing. */
const LISTEN = new Set();          // {kind:'doc'|'coll', key, fn(row|null, path), re()}
let live = null, liveUp = false, lastEvt = Date.now(), liveRetry = 0, liveDog = 0, liveGen = 0;
function startLive() {
  if (live) return;
  const gen = ++liveGen;
  try { if (SESSION && SESSION.access_token && sb.realtime && sb.realtime.setAuth) sb.realtime.setAuth(SESSION.access_token); } catch (e) {}
  live = sb.channel('illu-docs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, p => {
      if (gen !== liveGen) return;
      lastEvt = Date.now();
      const n = p.new && p.new.path ? p.new : null, o = p.old && p.old.path ? p.old : null;
      const row = p.eventType === 'DELETE' ? null : n;
      const pathv = (n || o || {}).path, coll = (n || o || {}).coll;
      if (!pathv) return;
      deliver(pathv, coll, row, p.eventType);
    })
    .subscribe(st => {
      if (gen !== liveGen) return;
      if (st === 'SUBSCRIBED') {
        const was = liveUp; liveUp = true; lastEvt = Date.now();
        if (was === false && liveGen > 1) resyncAll();
      } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') {
        liveUp = false; restartLive('stream ' + st, 3000);
      }
    });
  lastEvt = Date.now();
  if (!liveDog) liveDog = setInterval(() => {
    if (live && LISTEN.size && Date.now() - lastEvt > 75000) restartLive('quiet for ' + Math.round((Date.now() - lastEvt) / 1000) + ' s', 0);
  }, 15000);
}
function restartLive(why, delay) {
  clearTimeout(liveRetry);
  liveRetry = setTimeout(() => {
    try { console.warn('[illu] live stream restarted:', why); } catch (e) {}
    const old = live; live = null; liveUp = false;
    try { if (old) sb.removeChannel(old); } catch (e) {}
    startLive();
  }, delay || 0);
}
/* re-read everything on screen (after a reconnect) */
function resyncAll() { for (const l of LISTEN) { try { l.re && l.re(); } catch (e) {} } }
window.__illuLive = { restart: why => restartLive(why || 'asked', 0), last: () => lastEvt, up: () => liveUp };
try {
  addEventListener('online', () => restartLive('back online', 500));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && live && Date.now() - lastEvt > 45000) restartLive('woke up', 0); });
} catch (e) {}
function deliver(pathv, coll, row, ev) {
  for (const l of LISTEN) {
    if (l.kind === 'doc' && l.key === pathv) l.fn(pathv, row, ev);
    else if (l.kind === 'coll' && l.key === coll) l.fn(pathv, row, ev);
  }
}
async function fetchDoc(pathv) {
  const { data, error } = await sb.from('docs').select('path,id,data').eq('path', pathv).maybeSingle();
  if (error) throw err('unavailable', error.message);
  return data;
}
async function fetchColl(coll) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('docs').select('path,id,data').eq('coll', coll).order('id').range(from, from + 999);
    if (error) throw err('unavailable', error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}
/* writes: one at a time per document, in the order they were asked for */
const WQ = new Map();
function queued(pathv, job) {
  const prev = WQ.get(pathv) || Promise.resolve();
  const next = prev.catch(() => {}).then(job);
  WQ.set(pathv, next);
  next.finally(() => { if (WQ.get(pathv) === next) WQ.delete(pathv); });
  return next;
}
async function writeDoc(pathv, coll, id, data) {
  if (coll === 'people') { data = Object.assign({}, data); delete data.h; delete data.s; }
  const { error } = await sb.from('docs').upsert({ path: pathv, coll, id, data, updated_at: new Date().toISOString() }, { onConflict: 'path' });
  if (error) throw err(/row-level|permission|policy/i.test(error.message) ? 'invalid_argument' : 'unavailable', error.message);
  deliver(pathv, coll, { path: pathv, id, coll, data }, 'LOCAL');
  hooks(pathv, coll, id, data);
}
/* the dashboard deleting someone's ID, or merging it into another (owner only), also
   closes their sign-in - a merged ID must never sign in as the one it was merged into */
function hooks(pathv, coll, id, data) {
  if (coll === 'people' && data && (data.x === 1 || data.mg) && id !== ME && /^[0-9a-f-]{36}$/.test(id)) {
    sb.rpc('admin_delete_person_by_id', { p_id: id }).then(() => {}, () => {});
  }
}

function docRef(pathv) {
  const s = segs(pathv);
  if (s.length % 2) throw new TypeError('db.doc needs an even number of segments: ' + pathv);
  const id = s[s.length - 1], coll = s.slice(0, -1).join('/');
  const ref = {
    id, path: pathv,
    async get() { const r = await fetchDoc(pathv); return dsnap(id, r ? view(coll, r.data) : null); },
    set(data) { const body = checkBody(data); return queued(pathv, () => writeDoc(pathv, coll, id, body)); },
    update(data) {
      const body = checkBody(data);
      return queued(pathv, async () => {
        const r = await fetchDoc(pathv);
        if (!r) throw err('invalid_argument', 'update needs an existing document');
        await writeDoc(pathv, coll, id, merge(r.data, body));
      });
    },
    delete() {
      return queued(pathv, async () => {
        const { error } = await sb.from('docs').delete().eq('path', pathv);
        if (error) throw err('unavailable', error.message);
        deliver(pathv, coll, null, 'LOCAL');
      });
    },
    async acquire(o) { return { acquired: true, version: 1, expiresAt: new Date(Date.now() + ((o && o.ttlMs) || 30000)).toISOString(), holder: o && o.holder }; },
    onSnapshot(next, onErr) {
      startLive();
      let last, dead = false;
      const emit = data => { const k = JSON.stringify(data === undefined ? null : data); if (k === last) return; last = k; try { next(dsnap(id, data == null ? null : view(coll, data))); } catch (e) { console.error(e); } };
      const l = { kind: 'doc', key: pathv, fn: (_p, row) => { if (!dead) emit(row ? row.data : null); },
        re: () => fetchDoc(pathv).then(r => { if (!dead) emit(r ? r.data : null); }, () => {}) };
      LISTEN.add(l);
      fetchDoc(pathv).then(r => { if (!dead) emit(r ? r.data : null); }, e => { if (onErr && !dead) onErr({ code: 'unavailable', message: e.message }); });
      return () => { dead = true; LISTEN.delete(l); };
    },
    collection(sub) { return collRef(pathv + '/' + sub); }
  };
  return ref;
}

function cmp(a, b) {
  if (a === b) return 0;
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;
  if (typeof a === typeof b) return a < b ? -1 : 1;
  return String(a) < String(b) ? -1 : 1;
}
function test(v, op, x) {
  switch (op) {
    case '==': return JSON.stringify(v) === JSON.stringify(x);
    case '!=': return JSON.stringify(v) !== JSON.stringify(x);
    case '<': return v != null && v < x;
    case '<=': return v != null && v <= x;
    case '>': return v != null && v > x;
    case '>=': return v != null && v >= x;
    case 'in': return Array.isArray(x) && x.some(y => JSON.stringify(y) === JSON.stringify(v));
    case 'not-in': return Array.isArray(x) && !x.some(y => JSON.stringify(y) === JSON.stringify(v));
    case 'array-contains': return Array.isArray(v) && v.some(y => JSON.stringify(y) === JSON.stringify(x));
  }
  throw err('invalid_argument', 'unknown operator ' + op);
}
function query(coll, q) {
  const apply = rows => {
    let r = rows.filter(x => q.w.every(([f, op, v]) => test(x.data ? x.data[f] : undefined, op, v)));
    if (q.o) {
      const [f, dir] = q.o;
      r.sort((a, b) => {
        const x = a.data[f], y = b.data[f], mx = x == null, my = y == null;
        if (mx || my) return mx === my ? 0 : (mx ? 1 : -1);     // a missing field sorts last either way
        const c = cmp(x, y);
        return dir === 'desc' ? -c : c;
      });
    }
    else r.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    if (q.l) r = r.slice(0, q.l);
    return r;
  };
  const qs = (rows, changes) => {
    const docs = rows.map(r => dsnap(r.id, view(coll, r.data)));
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => changes || docs.map((d, i) => ({ type: 'added', doc: d, oldIndex: -1, newIndex: i })), metadata: META };
  };
  const api = {
    where(f, op, v) { if (q.w.length >= 10) throw err('invalid_argument', 'too many filters'); return query(coll, { w: q.w.concat([[f, op, v]]), o: q.o, l: q.l }); },
    orderBy(f, dir) { return query(coll, { w: q.w, o: [f, dir === 'desc' ? 'desc' : 'asc'], l: q.l }); },
    limit(n) { n = Math.max(1, Math.min(10000, +n || 1)); return query(coll, { w: q.w, o: q.o, l: n }); },
    async get() { return qs(apply(await fetchColl(coll))); },
    onSnapshot(next, onErr) {
      startLive();
      let dead = false, have = null, prev = [], t = 0;
      const all = new Map();
      const emit = () => {
        const rows = apply([...all.values()]);
        const key = JSON.stringify(rows.map(r => [r.id, r.data]));
        if (have === key) return;
        const changes = [], pm = new Map(prev.map((r, i) => [r.id, [r, i]]));
        const docs = rows.map(r => dsnap(r.id, view(coll, r.data)));
        rows.forEach((r, i) => {
          const was = pm.get(r.id);
          if (!was) changes.push({ type: 'added', doc: docs[i], oldIndex: -1, newIndex: i });
          else if (JSON.stringify(was[0].data) !== JSON.stringify(r.data) || was[1] !== i) changes.push({ type: 'modified', doc: docs[i], oldIndex: was[1], newIndex: i });
        });
        const now = new Set(rows.map(r => r.id));
        prev.forEach((r, i) => { if (!now.has(r.id)) changes.push({ type: 'removed', doc: dsnap(r.id, view(coll, r.data)), oldIndex: i, newIndex: -1 }); });
        have = key; prev = rows;
        const s = qs(rows, changes); s.docs = docs;
        try { next(s); } catch (e) { console.error(e); }
      };
      const l = { kind: 'coll', key: coll, fn: (p, row) => {
        if (dead || have === null) return;
        const id = p.slice(coll.length + 1);
        if (row && row.data !== undefined) all.set(id, { id, data: row.data }); else if (row) { fetchDoc(p).then(r => { if (r) all.set(id, { id, data: r.data }); emit(); }); return; } else all.delete(id);
        clearTimeout(t); t = setTimeout(emit, 30);
      }, re: () => fetchColl(coll).then(rows => { if (dead || have === null) return; all.clear(); for (const r of rows) all.set(r.id, { id: r.id, data: r.data }); emit(); }, () => {}) };
      LISTEN.add(l);
      fetchColl(coll).then(rows => { if (dead) return; for (const r of rows) all.set(r.id, { id: r.id, data: r.data }); have = ''; emit(); },
        e => { if (onErr && !dead) onErr({ code: 'unavailable', message: e.message }); });
      return () => { dead = true; LISTEN.delete(l); clearTimeout(t); };
    }
  };
  return api;
}
function collRef(pathv) {
  const s = segs(pathv);
  if (!(s.length % 2)) throw new TypeError('db.collection needs an odd number of segments: ' + pathv);
  const q = query(pathv, { w: [], o: null, l: 0 });
  return Object.assign(q, {
    path: pathv,
    doc(id) { return docRef(pathv + '/' + (id || rid(10))); },
    async add(data) { const r = docRef(pathv + '/' + rid(10)); await r.set(data); return r; }
  });
}
const DB = Object.freeze({ doc: docRef, collection: collRef });

/* ================= room ================= */
const TAB = 'tab-' + rid(6);
function makeRoom() {
  let state = {}, joined = false, peers = [];
  const topicFns = new Map(), peerFns = new Set(), connFns = new Set();
  const ch = sb.channel('illu-room', { config: { presence: { key: TAB }, broadcast: { self: false } } });
  const toPeer = (key, metas) => {
    const m = (metas && metas[metas.length - 1]) || {};
    return Object.freeze({ peer: key, by: m.__by || null, isMe: !!ME && m.__by === ME, sameTab: key === TAB, kind: 'viewer', guest: false,
      presence: Object.freeze(Object.assign({}, m.presence || {})), updatedAt: m.__at || Date.now() });
  };
  ch.on('presence', { event: 'sync' }, () => {
    const st = ch.presenceState();
    const old = new Map(peers.map(p => [p.peer, p]));
    peers = Object.keys(st).map(k => toPeer(k, st[k]));
    const now = new Map(peers.map(p => [p.peer, p]));
    const change = {
      peers, joined: peers.filter(p => !old.has(p.peer)), left: [...old.values()].filter(p => !now.has(p.peer)),
      updated: peers.filter(p => old.has(p.peer) && old.get(p.peer).updatedAt !== p.updatedAt)
    };
    for (const fn of peerFns) { try { fn(change); } catch (e) { console.error(e); } }
  });
  ch.on('broadcast', { event: '*' }, ({ event, payload }) => {
    const fns = topicFns.get(event); if (!fns) return;
    const p = payload || {};
    const msg = Object.freeze({ topic: event, data: p.data, peer: p.peer || '', by: p.by || null, isMe: !!ME && p.by === ME, sameTab: p.peer === TAB, kind: 'viewer', guest: false });
    for (const fn of fns) { try { fn(msg); } catch (e) { console.error(e); } }
  });
  const track = () => joined ? ch.track({ presence: state, __by: ME || null, __at: Date.now() }) : Promise.resolve();
  ch.subscribe(st => {
    const was = joined; joined = st === 'SUBSCRIBED';
    if (joined) track();
    if (was !== joined) for (const fn of connFns) { try { fn(joined); } catch (e) {} }
  });
  return Object.freeze({
    emit(topic, data) { return ch.send({ type: 'broadcast', event: String(topic), payload: { data, peer: TAB, by: ME || null } }).then(() => {}); },
    on(topic, fn) { const t = String(topic); if (!topicFns.has(t)) topicFns.set(t, new Set()); topicFns.get(t).add(fn); return () => topicFns.get(t).delete(fn); },
    presence(patch) { for (const [k, v] of Object.entries(patch || {})) { if (v === null) delete state[k]; else state[k] = v; } return track().then(() => {}); },
    peers() { return peers; },
    onPeers(fn) { peerFns.add(fn); setTimeout(() => { try { fn({ peers, joined: peers, left: [], updated: [] }); } catch (e) {} }, 0); return () => peerFns.delete(fn); },
    connected() { return joined; },
    onConnection(fn) { connFns.add(fn); return () => connFns.delete(fn); },
    sendToClaudeSession() { return Promise.reject(err('claude_unavailable', 'not available in the program')); },
    canSendToClaudeSession() { return Promise.resolve('unsupported'); }
  });
}

/* ================= assets ================= */
const ASSETS = Object.freeze({
  async upload(blob, o) {
    if (!blob) throw err('invalid_request', 'nothing to upload');
    if (blob.size > 20 * 1024 * 1024) throw err('too_large', 'over 20MB');
    const type = (o && o.type) || blob.type || 'application/octet-stream';
    const id = rid(12);
    const { error } = await sb.storage.from('assets').upload(id, blob, { contentType: type, upsert: false, cacheControl: '31536000' });
    if (error) throw err(/exceed|quota|size/i.test(error.message) ? 'quota_or_state' : 'upstream_error', error.message);
    return { id, url: '/_blob/' + id, sizeBytes: blob.size, contentType: type };
  },
  async list() {
    const assets = []; let bytes = 0;
    for (let off = 0; ; off += 1000) {
      const { data, error } = await sb.storage.from('assets').list('', { limit: 1000, offset: off, sortBy: { column: 'created_at', order: 'asc' } });
      if (error) throw err('store_unavailable', error.message);
      for (const f of data) {
        if (!f.id) continue;
        const sz = (f.metadata && f.metadata.size) || 0; bytes += sz;
        assets.push({ id: f.name, url: '/_blob/' + f.name, contentType: (f.metadata && f.metadata.mimetype) || '', sizeBytes: sz, createdAt: f.created_at });
      }
      if (data.length < 1000) break;
    }
    return { assets, usage: { files: assets.length, bytes, maxFiles: 100000, maxBytes: 1024 * 1024 * 1024 } };
  },
  async delete(id) {
    const { error } = await sb.storage.from('assets').remove([String(id)]);
    if (error) throw err('upstream_error', error.message);
    return { deleted: true };
  }
});

/* ================= downloads ================= */
const DOWNLOADS = Object.freeze({
  async save(req) {
    if (!req || !req.filename) throw err('bad_request', 'a file name is needed');
    let d = req.data;
    if (typeof d === 'string') d = new TextEncoder().encode(d);
    else if (d instanceof Blob) d = new Uint8Array(await d.arrayBuffer());
    else if (d instanceof ArrayBuffer) d = new Uint8Array(d);
    else if (ArrayBuffer.isView(d)) d = new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
    else throw err('bad_request', 'unsupported data');
    if (!window.illu || !window.illu.save) throw err('unavailable', 'saving is not available here');
    const r = await window.illu.save(req.filename, d);
    if (!r || !r.ok) throw err('declined', 'not saved');
    return { status: 'saved' };
  }
});

/* ================= claude.use ================= */
const MEMO = new Map();
function use(name) {
  if (MEMO.has(name)) return MEMO.get(name);
  let p;
  if (name === 'db') p = Promise.resolve(DB);
  else if (name === 'room') p = Promise.resolve(makeRoom());
  else if (name === 'assets') p = Promise.resolve(ASSETS);
  else if (name === 'downloads') p = Promise.resolve(DOWNLOADS);
  else p = Promise.resolve(null);     // sample (asking Claude) and anything else: not in the program
  MEMO.set(name, p);
  return p;
}
Object.defineProperty(window, 'claude', { value: Object.freeze({ use }), writable: false, configurable: false });
})();
