/* ILLUMÉNOCTIS — the dashboard's runtime, provided by the program.
   The dashboard was written against four services: a document store (db), a live room
   (room), a file store (assets) and file saving (downloads). Here each one is the same
   call shape, kept in the shared Supabase database instead of the page's own host. */
(function () {
'use strict';
const CFG = window.ILLU_CONFIG;
const sb = window.supabase.createClient(CFG.url, CFG.key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'illu.auth.' + ((String(CFG.url).match(/\/\/([a-z0-9]+)\./) || [])[1] || 'x') },   // 1.2.217: one sign-in per Supabase project
  realtime: { params: { eventsPerSecond: 20 } },
  /* 1.2.216: every request is counted (and can be paused) by the download meter */
  global: window.IlluNet ? { fetch: window.IlluNet.fetch } : {}
});
window.__illuSb = sb;

/* ---------- who is signed in, and the directory, before the dashboard starts ---------- */
const DIR = (window.illu && window.illu.dirSync) ? window.illu.dirSync() : (window.__ILLU_TESTDIR || null);
window.__ILLU_AG = (DIR && DIR.ag) || [];
window.__ILLU_ADMIN = (DIR && DIR.admin) || '';
const ME = (DIR && DIR.me) || '';
try { if (ME) localStorage.setItem('illum.me', ME); } catch (e) {}

let SESSION = null;
const gate = () => { try { location.replace('../index.html' + (/^#cards=[a-z0-9]+$/i.test(location.hash || '') ? location.hash : '')); } catch (e) {} };   /* 1.2.261: keep a "cards sent to you" link through the sign-in */
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

/* ================= the shared data, kept on this computer, changes only =================
   1.2.216 (17 Nov 2026). Until 1.2.215 every list was downloaded in full when the program opened, and
   again in full whenever the live connection reconnected - on 16 Nov the connection reconnected every
   6-10 seconds all day and the free Supabase download allowance was used up in one day.
   Now:
   - each list is kept on this computer (IlluCache) and only what changed since last time is asked for;
   - the live connection carries only "this document changed" notes (table doc_events, a few bytes each);
     the program then fetches just that document, and only if something on screen uses it;
   - a reconnect asks for what changed while it was away (catch-up), never everything again;
   - reconnects back off (3 s, 6 s, 12 s ... up to 2 min) instead of retrying every 3 s for ever;
   - every request is counted by IlluNet (download meter and brake). */
const LISTEN = new Set();          // {kind:'doc'|'coll', key, fn(path, row|null, ev), re()}
const C = new Map();               // coll -> {rows: Map(path -> {path, coll, id, data}), complete, loading}
const COMPLETE = new Set();        // lists whose every document is in the local copy
const DIRTY = new Map();           // coll -> Set(paths) changed by others, not yet fetched (nobody was looking)
const MINE = new Map();            // path -> updated_at of our own last save (its change note is ours)
const STAT = { restarts: 0, reasons: [], catchups: 0, events: 0, fetched: 0, full: 0, fromCache: 0, started: new Date().toISOString() };
let SYNC = null;                   // every change up to this database time is in the local copy (minus 2 min)
const CACHE = window.IlluCache || null;
const later = (a, b) => (!a ? b : !b ? a : (Date.parse(b) > Date.parse(a) ? b : a));
const collOf = p => { const s = String(p).split('/'); return s.slice(0, -1).join('/'); };
/* the same moment, however it was written ("2026-11-17 01:51:52.27+00" from the live connection,
   "2026-11-17T01:51:52.274685+00:00" from the database) */
const tsKey = v => { const m = String(v || '').match(/^(\d{4}-\d\d-\d\d)[T ](\d\d:\d\d:\d\d)(?:\.(\d+))?/); return m ? m[1] + 'T' + m[2] + '.' + ((m[3] || '') + '000000').slice(0, 6) : ''; };

/* writes to the local copy are gathered and saved together */
const PEND = new Map(); let pendT = 0;
function keep(path, row) { if (!CACHE) return; PEND.set(path, row); if (!pendT) pendT = setTimeout(flushKeep, 1500); }
function flushKeep() {
  pendT = 0; if (!CACHE || !PEND.size) return;
  const puts = [], dels = [];
  for (const [p, r] of PEND) { if (r) puts.push(r); else dels.push(p); }
  PEND.clear(); CACHE.apply(puts, dels);
}
function saveMeta() { if (!CACHE) return; CACHE.setMeta('sync', SYNC); CACHE.setMeta('complete', [...COMPLETE]); CACHE.setMeta('checked', Date.now()); }
try { addEventListener('pagehide', flushKeep); } catch (e) {}

async function serverMark() {
  const { data, error } = await sb.from('docs').select('updated_at').order('updated_at', { ascending: false }).limit(1);
  if (error) throw err('unavailable', error.message);
  return (data && data[0] && data[0].updated_at) || '1970-01-01T00:00:00Z';
}
/* one document straight from the database */
async function fetchDocNet(pathv) {
  const { data, error } = await sb.from('docs').select('path,id,coll,data,updated_at').eq('path', pathv).maybeSingle();
  if (error) throw err('unavailable', error.message);
  STAT.fetched++;
  return data;
}
/* a whole list straight from the database (only when this computer has no copy of it yet) */
async function fetchCollNet(coll) {
  const out = [];
  /* 1.2.146 (12 Nov 2026): pages of 200, each tried up to 4 times - one page of 1000 big documents (the
     measurements) ran past the database's time limit and the whole collection came back empty */
  const PG = 200;
  for (let from = 0; ; from += PG) {
    let data = null, last = null;
    for (let t = 0; t < 4 && !data; t++) {
      if (t) await new Promise(r => setTimeout(r, 800 * t * t));
      const r = await sb.from('docs').select('path,id,data,updated_at').eq('coll', coll).order('id').range(from, from + PG - 1);
      if (r.error) last = r.error; else data = r.data;
    }
    if (!data) throw err('unavailable', last && last.message);
    out.push(...data);
    if (data.length < PG) break;
  }
  STAT.full++;
  return out;
}

/* a change (from the database, a catch-up or our own save) goes into the local copy and to whoever shows it */
function applyRow(coll, pathv, row, ev) {
  const c = C.get(coll);
  if (c) { if (row) c.rows.set(pathv, row); else c.rows.delete(pathv); }
  if (COMPLETE.has(coll)) keep(pathv, row ? { path: pathv, coll, id: row.id, data: row.data, u: row.u || '' } : null);
  deliver(pathv, coll, row, ev);
}
function deliver(pathv, coll, row, ev) {
  for (const l of LISTEN) {
    if (l.kind === 'doc' && l.key === pathv) l.fn(pathv, row, ev);
    else if (l.kind === 'coll' && l.key === coll) l.fn(pathv, row, ev);
  }
}
const watched = (coll, pathv) => { for (const l of LISTEN) if ((l.kind === 'coll' && l.key === coll) || (l.kind === 'doc' && l.key === pathv)) return true; return false; };

/* Ask the database what changed since the last check, for every list this computer keeps. */
let catching = null;
function catchUp(why) {
  if (catching) return catching;
  catching = (async () => {
    if (!COMPLETE.size) { if (!SYNC) { SYNC = await serverMark(); saveMeta(); } return true; }
    const since = new Date(Date.parse(SYNC || '1970-01-01T00:00:00Z') - 120e3).toISOString();
    const colls = [...COMPLETE];
    /* the database's own clock: afterwards everything up to a minute before this is known to be here */
    const nowR = await sb.rpc('illu_now');
    const qnow = !nowR.error && nowR.data ? new Date(Date.parse(String(nowR.data).replace(' ', 'T').replace(/\+00$/, '+00:00')) - 60e3).toISOString() : null;
    /* first only which documents changed and when (a few dozen bytes each); then only the ones this computer
       doesn't already have in that version are fetched - the 2-minute overlap never downloads anything twice */
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const r = await sb.from('docs').select('path,coll,updated_at').in('coll', colls).gt('updated_at', since).order('updated_at').range(from, from + 999);
      if (r.error) throw err('unavailable', r.error.message);
      rows.push(...r.data);
      if (r.data.length < 1000) break;
      if (from >= 9000) {            // more than 10000 changes since: start these lists afresh
        for (const k of colls) { COMPLETE.delete(k); const c = C.get(k); if (c) c.complete = false; }
        if (CACHE) await CACHE.clearAll();
        SYNC = null; saveMeta(); resyncAll();
        return false;
      }
    }
    const t = await sb.from('doc_tombs').select('path,coll,deleted_at').in('coll', colls).gt('deleted_at', since);
    if (t.error) throw err('unavailable', t.error.message);
    let max = SYNC;
    const need = [];
    for (const r of rows) {
      max = later(max, r.updated_at);
      const c = C.get(r.coll), mem = c && c.rows.get(r.path);
      const have = mem ? mem.u : (CACHE ? ((await CACHE.getRow(r.path)) || {}).u : '');
      if (!have || tsKey(have) !== tsKey(r.updated_at)) need.push(r.path);
    }
    if (need.length) await fetchPaths(need);
    for (const x of t.data || []) { max = later(max, x.deleted_at); applyRow(x.coll, x.path, null, 'SYNC'); }
    for (const k of colls) DIRTY.delete(k);
    SYNC = qnow && Date.parse(qnow) > Date.parse(max || 0) ? qnow : max; saveMeta(); flushKeep();
    STAT.catchups++;
    return true;
  })().catch(e => { try { console.warn('[illu] catch-up failed (' + why + '):', e && e.message); } catch (x) {} return false; })
    .finally(() => { catching = null; });
  return catching;
}

/* the local copy, opened once: anything older than 25 days is started afresh (deletions are remembered 30) */
const READY = (async () => {
  if (!CACHE) return;
  try {
    const [sync, comp, checked] = await Promise.all([CACHE.getMeta('sync'), CACHE.getMeta('complete'), CACHE.getMeta('checked')]);
    if (!sync || !Array.isArray(comp) || !checked || Date.now() - checked > 25 * 86400e3) { await CACHE.clearAll(); return; }
    SYNC = sync; for (const k of comp) COMPLETE.add(k);
    /* if the database can't be reached right now the program still opens on its own copy, and the
       catch-up is tried again every minute until it works */
    const ok = await catchUp('start');
    if (!ok && COMPLETE.size) STAT.behind = true;
  } catch (e) { COMPLETE.clear(); SYNC = null; }
})();

/* Fetch the documents others changed that nobody here was looking at, before a list is read. */
async function freshen(coll) {
  const set = DIRTY.get(coll); if (!set || !set.size) return;
  DIRTY.delete(coll);
  await fetchPaths([...set]);
}
async function fetchPaths(paths) {
  for (let i = 0; i < paths.length; i += 100) {
    const part = paths.slice(i, i + 100);
    const { data, error } = await sb.from('docs').select('path,id,coll,data,updated_at').in('path', part);
    if (error) throw err('unavailable', error.message);
    STAT.fetched += (data || []).length;
    const got = new Set();
    for (const r of data || []) { got.add(r.path); applyRow(r.coll, r.path, { path: r.path, coll: r.coll, id: r.id, data: r.data, u: r.updated_at }, 'UPDATE'); }
    for (const p of part) if (!got.has(p)) applyRow(collOf(p), p, null, 'DELETE');
  }
}
/* a whole list: from the local copy when this computer has one, else from the database (and kept) */
async function collLoad(coll) {
  await READY;
  let c = C.get(coll);
  if (c && c.complete) { await freshen(coll).catch(() => {}); STAT.fromCache++; return c.rows; }
  if (!c) { c = { rows: new Map(), complete: false, loading: null }; C.set(coll, c); }
  if (c.loading) return c.loading;
  c.loading = (async () => {
    if (COMPLETE.has(coll) && CACHE) {
      const rows = await CACHE.collRows(coll);
      if (rows) {
        c.rows = new Map(rows.map(r => [r.path, { path: r.path, coll, id: r.id, data: r.data, u: r.u || '' }]));
        c.complete = true; await freshen(coll).catch(() => {}); STAT.fromCache++;
        return c.rows;
      }
      COMPLETE.delete(coll);
    }
    let mark = null; try { mark = await serverMark(); } catch (e) {}
    const rows = await fetchCollNet(coll);
    const m = new Map(); for (const r of rows) m.set(r.path, { path: r.path, coll, id: r.id, data: r.data, u: r.updated_at || '' });
    /* changes that arrived while the list was being read are kept, not overwritten */
    for (const [p, r] of c.rows) if (!m.has(p) && r) m.set(p, r);
    c.rows = m; c.complete = true;
    if (CACHE && mark) {
      COMPLETE.add(coll);
      SYNC = SYNC ? (Date.parse(mark) < Date.parse(SYNC) ? mark : SYNC) : mark;
      await CACHE.replaceColl(coll, [...m.values()]);
      saveMeta();
    }
    return c.rows;
  })().finally(() => { c.loading = null; });
  return c.loading;
}
async function fetchDoc(pathv) {
  const coll = collOf(pathv);
  await READY;
  const c = C.get(coll);
  if (c && c.complete) { await freshen(coll).catch(() => {}); return c.rows.get(pathv) || null; }
  if (COMPLETE.has(coll) && CACHE) {
    const d = DIRTY.get(coll);
    if (!(d && d.has(pathv))) { const r = await CACHE.getRow(pathv); STAT.fromCache++; return r ? { path: r.path, id: r.id, data: r.data } : null; }
  }
  return fetchDocNet(pathv);
}
async function fetchColl(coll) { return [...(await collLoad(coll)).values()]; }

/* ---------- the live connection: change notes only ---------- */
let live = null, liveUp = false, lastEvt = Date.now(), liveRetry = 0, liveDog = 0, liveGen = 0, fails = 0, upSince = 0;
const WANT = new Map(); let wantT = 0; const LASTGET = new Map();
function want(pathv) {
  /* a document written many times in a row is fetched at most every second, a big one less often
     (a 140 KB document at most every 15 s): the screen still catches up, the download stays small */
  const c = C.get(collOf(pathv)), r = c && c.rows.get(pathv);
  const size = r ? JSON.stringify(r.data || {}).length : 0;
  const gap = 1000 + size / 10, last = LASTGET.get(pathv) || 0;
  const at = Math.max(Date.now() + 300, last + gap);
  if (!WANT.has(pathv) || WANT.get(pathv) > at) WANT.set(pathv, at);
  scheduleWant();
}
function scheduleWant() {
  clearTimeout(wantT); if (!WANT.size) return;
  const next = Math.min(...WANT.values());
  wantT = setTimeout(async () => {
    const now = Date.now(), due = [...WANT].filter(([, t]) => t <= now).map(([p]) => p);
    for (const p of due) { WANT.delete(p); LASTGET.set(p, now); }
    if (due.length) await fetchPaths(due).catch(() => { for (const p of due) { const k = collOf(p); if (!DIRTY.has(k)) DIRTY.set(k, new Set()); DIRTY.get(k).add(p); } });
    scheduleWant();
  }, Math.max(0, next - Date.now()));
}
function onNote(n) {
  lastEvt = Date.now(); STAT.events++;
  const pathv = n.path, coll = n.coll; if (!pathv) return;
  if (MINE.get(pathv) && MINE.get(pathv) === tsKey(n.at)) return;   // our own save coming back
  if (n.del) { applyRow(coll, pathv, null, 'DELETE'); return; }
  if (watched(coll, pathv)) want(pathv);
  else if (COMPLETE.has(coll) || C.has(coll)) { if (!DIRTY.has(coll)) DIRTY.set(coll, new Set()); DIRTY.get(coll).add(pathv); }
}
function startLive() {
  if (live) return;
  const gen = ++liveGen;
  try { if (SESSION && SESSION.access_token && sb.realtime && sb.realtime.setAuth) sb.realtime.setAuth(SESSION.access_token); } catch (e) {}
  /* a fresh name each time: a reconnect never shares its name with the connection being closed */
  live = sb.channel('illu-ev-' + gen + '-' + rid(3))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'doc_events' }, p => {
      if (gen !== liveGen) return;
      if (p && p.new) onNote(p.new);
    })
    .subscribe(st => {
      if (gen !== liveGen) return;
      if (st === 'SUBSCRIBED') {
        const was = liveUp; liveUp = true; lastEvt = Date.now(); upSince = Date.now();
        if (was === false && liveGen > 1) catchSoon('reconnect');
      } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') {
        /* this connection stops at once (its own quick retries included); the next one waits longer each time */
        liveUp = false;
        const dead = live; live = null; liveGen++;
        try { if (dead) sb.removeChannel(dead); } catch (e) {}
        restartLive('stream ' + st, 3000);
      }
    });
  lastEvt = Date.now();
  if (!liveDog) liveDog = setInterval(() => {
    /* every open program saves its heartbeat every 30 s, so a healthy connection is never quiet for long */
    if (live && LISTEN.size && Date.now() - lastEvt > 75000) restartLive('quiet for ' + Math.round((Date.now() - lastEvt) / 1000) + ' s', 0);
    /* while the connection is down, a small catch-up every minute keeps the screen right */
    if ((!liveUp || STAT.behind) && LISTEN.size && Date.now() - (STAT.lastPoll || 0) > 60000) { STAT.lastPoll = Date.now(); catchUp('poll').then(ok => { if (ok) STAT.behind = false; }); }
  }, 15000);
}
function restartLive(why, delay) {
  if (upSince && Date.now() - upSince > 120e3) fails = 0;
  fails++; upSince = 0;
  const wait = Math.max(delay || 0, Math.min(120e3, 3000 * Math.pow(2, fails - 1)));
  STAT.restarts++; STAT.reasons.push(new Date().toISOString().slice(11, 19) + ' ' + why + ' (+' + Math.round(wait / 1000) + 's)'); if (STAT.reasons.length > 12) STAT.reasons.shift();
  clearTimeout(liveRetry);
  liveRetry = setTimeout(() => {
    try { console.warn('[illu] live connection restarted:', why); } catch (e) {}
    const old = live; live = null; liveUp = false;
    try { if (old) sb.removeChannel(old); } catch (e) {}
    startLive();
  }, wait);
}
/* at most one catch-up every 20 s, however often the connection comes back */
let catchT = 0, lastCatch = 0;
function catchSoon(why) {
  const wait = Math.max(0, lastCatch + 20000 - Date.now());
  clearTimeout(catchT);
  catchT = setTimeout(() => { lastCatch = Date.now(); catchUp(why); }, wait);
}
/* the rare case a catch-up can't cover: everything on screen read again */
function resyncAll() { for (const l of LISTEN) { try { l.re && l.re(); } catch (e) {} } }
/* a safety check every 10 minutes, in case a change note was ever missed */
setInterval(() => { if (LISTEN.size) catchUp('check'); }, 10 * 60e3);
window.__illuLive = { restart: why => restartLive(why || 'asked', 0), last: () => lastEvt, up: () => liveUp, stats: () => Object.assign({}, STAT, { up: liveUp, kept: COMPLETE.size, sync: SYNC, watching: [...new Set([...LISTEN].map(l => l.key))].length }) };
try {
  addEventListener('online', () => restartLive('back online', 500));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && live && Date.now() - lastEvt > 45000) restartLive('woke up', 0); });
} catch (e) {}

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
  /* only the save time comes back (a few bytes), so this program can tell its own change note apart */
  const { data: back, error } = await sb.from('docs').upsert({ path: pathv, coll, id, data }, { onConflict: 'path' }).select('updated_at');
  if (error) throw err(/row-level|permission|policy/i.test(error.message) ? 'invalid_argument' : 'unavailable', error.message);
  if (back && back[0] && back[0].updated_at) MINE.set(pathv, tsKey(back[0].updated_at));
  if (MINE.size > 2000) MINE.delete(MINE.keys().next().value);
  applyRow(coll, pathv, { path: pathv, id, coll, data, u: (back && back[0] && back[0].updated_at) || '' }, 'LOCAL');
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
        /* merged onto the database's current version, never an older local one */
        const r = await fetchDocNet(pathv);
        if (!r) throw err('invalid_argument', 'update needs an existing document');
        await writeDoc(pathv, coll, id, merge(r.data, body));
      });
    },
    delete() {
      return queued(pathv, async () => {
        const { error } = await sb.from('docs').delete().eq('path', pathv);
        if (error) throw err('unavailable', error.message);
        applyRow(coll, pathv, null, 'LOCAL');
      });
    },
    async acquire(o) { return { acquired: true, version: 1, expiresAt: new Date(Date.now() + ((o && o.ttlMs) || 30000)).toISOString(), holder: o && o.holder }; },
    onSnapshot(next, onErr) {
      startLive();
      let last, dead = false;
      const emit = data => { const k = JSON.stringify(data === undefined ? null : data); if (k === last) return; last = k; try { next(dsnap(id, data == null ? null : view(coll, data))); } catch (e) { console.error(e); } };
      const l = { kind: 'doc', key: pathv, fn: (_p, row) => { if (!dead) emit(row ? row.data : null); },
        re: () => fetchDocNet(pathv).then(r => { if (!dead) emit(r ? r.data : null); }, () => {}) };
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
        if (row && row.data !== undefined) all.set(id, { id, data: row.data }); else if (row) { fetchDocNet(p).then(r => { if (r) all.set(id, { id, data: r.data }); emit(); }); return; } else all.delete(id);
        clearTimeout(t); t = setTimeout(emit, 30);
      }, re: () => { const c = C.get(coll); if (c) { c.complete = false; COMPLETE.delete(coll); } fetchColl(coll).then(rows => { if (dead || have === null) return; all.clear(); for (const r of rows) all.set(r.id, { id: r.id, data: r.data }); emit(); }, () => {}); } };
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
/* 1.2.216 (user, 17 Nov 2026: "I no longer want any of the photos and videos to be saved onto supabase"):
   new photos, videos and attachments go to Dropbox (ILLUMENOCTIS/MEDIA, see media.js), never to Supabase.
   "model" files (photos of models) go to MODEL PHOTOS, everything else to BOOKING FILES. Older files saved in
   Supabase before 1.2.216 still open (they are read from Dropbox once copied there, else from Supabase). */
const kindOf = (blob, o) => (o && o.kind) ? o.kind : (/^photo\./i.test((blob && blob.name) || '') ? 'model' : 'booking');
const ASSETS = Object.freeze({
  async upload(blob, o) {
    if (!blob) throw err('invalid_request', 'nothing to upload');
    if (blob.size > 20 * 1024 * 1024) throw err('too_large', 'over 20MB');
    const type = (o && o.type) || blob.type || 'application/octet-stream';
    if (!window.illu || !window.illu.mediaPut) throw err('store_unavailable', 'saving files needs the program');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const r = await window.illu.mediaPut(kindOf(blob, o), type, bytes, rid(12));
    if (!r || !r.ok || !r.id) throw err('upstream_error', (r && r.why) || 'not saved');
    return { id: r.id, url: '/_blob/' + r.id, sizeBytes: blob.size, contentType: type, queued: r.to === 'queued' };
  },
  async list() {
    /* what the Dropbox MEDIA folder holds; the Booking bar's storage chip reads this */
    const u = (window.illu && window.illu.mediaUsage) ? await window.illu.mediaUsage() : null;
    if (!u || !u.ok) throw err('store_unavailable', (u && u.why) || 'Dropbox not available on this computer');
    return { assets: [], usage: { files: u.files, bytes: u.bytes, maxFiles: 1000000, maxBytes: 2 * 1024 * 1024 * 1024, where: u.where } };
  },
  async delete(id) {
    if (!window.illu || !window.illu.mediaDel) throw err('upstream_error', 'not available');
    await window.illu.mediaDel(String(id));
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
