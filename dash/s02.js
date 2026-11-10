
const AG = (window.__ILLU_AG || []);
const AGALL = AG.slice();                 // every agency, deleted ones included
const TIER = {"main": "Main Board", "newfaces": "New Faces", "development": "Development", "direct": "Direct", "commercial": "Commercial / other", "unlabelled": "Unlabelled"};
const REGION = {"Australia":"Oceania","Belgium":"Europe","Brazil":"South America","Bulgaria":"Europe","Canada":"North America","Czech Republic":"Europe","Estonia":"Europe","France":"Europe","Germany":"Europe","Hungary":"Europe","Ireland":"Europe","Latvia":"Europe","Lithuania":"Europe","Mexico":"North America","Netherlands":"Europe","Norway":"Europe","Poland":"Europe","Romania":"Europe","Russia":"Europe","Slovakia":"Europe","South Africa":"Africa","Spain":"Europe","Turkey":"Europe","United Kingdom":"Europe","United States":"North America","Unknown":"Unknown","Uruguay":"South America","Uzbekistan":"Asia","Italy":"Europe","Croatia":"Europe","India":"Asia","Japan":"Asia","Kazakhstan":"Asia","Kyrgyzstan":"Asia","Mongolia":"Asia","Serbia":"Europe","Singapore":"Asia","Sweden":"Europe","Ukraine":"Europe","International":"Unknown"};
const BLINDS = [];
const REASON = {
  blocked:   {l:'Blocked',    t:'The site refuses the scan outright \u2014 nothing comes back to read.'},
  javascript:{l:'JavaScript', t:'The roster is drawn by script after load, so the page arrives empty.'},
  truncated: {l:'Truncated',  t:'Only the first page of models is served, so a departure cannot be told from a cut-off list.'}};
const KINDLABEL = {arrival:'new face', check:'checked', search:'search', insta:'instagram'};
const main = document.getElementById('main');
const q = document.getElementById('q');
const countEl = document.getElementById('count');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* Which boxes are ticked, asked once a turn instead of once a model. Reading it from
   the DOM is cheap on its own and ruinous four times over for every one of a few
   hundred rows - it was two thirds of the time a Lumen draw took. The answer is held
   for the current turn of the event loop only: a synchronous draw cannot tick a box
   under itself, and anything that does runs in a later turn, by which time it is gone.
   So there is no cache to invalidate and no way for it to go stale. */
const CHK = new Map();
let chkHeld = false;
const checked = n => {
  if(CHK.has(n)) return CHK.get(n);
  const v = Array.from(document.querySelectorAll('input[data-f="' + n + '"]:checked'))
    .map(i => i.value);
  CHK.set(n, v);
  if(!chkHeld){
    chkHeld = true;
    Promise.resolve().then(() => { CHK.clear(); chkHeld = false; });
  }
  return v;
};
const MONTHS = ['J','F','M','A','M','J','J','A','S','O','N','D'];
const MONTHNAME = ['January','February','March','April','May','June','July','August','September',
                   'October','November','December'];
const SEXNAME = {M:'Men', F:'Women', '?':'Division not stated by the agency'};
let VIEW = 'arr', lenUnit = 'cm', shoeUnit = 'eu';
/* What the cards print. Separate from the sidebar's filter units on purpose: a scout
   reads a height in feet and a waist in inches, or any mix of the two, and the store
   stays in centimetres underneath whichever is showing. */
let htU = 'cm', bwU = 'cm';
/* Which of the three Lumen lists are folded shut. Kept with the other page preferences
   so a list you put away stays away the next time you open the dashboard. */
const LITSHUT = new Set();
/* Regions the scout has folded away. Kept with the other preferences, so a tidied
   Directory stays tidied - on this machine and on everyone else's. */
const RGNSHUT = new Set();
const unitFor = f => (f === 'ht' ? htU : bwU);
function cmToFtIn(cm){
  if(cm == null) return null;
  const total = cm / 2.54;
  let ft = Math.floor(total / 12);
  let inch = Math.round((total - ft * 12) * 2) / 2;
  if(inch >= 12){ ft += 1; inch -= 12; }
  return ft + '\u2032' + inch + '\u2033';
}
function ftInToCm(v){
  const s = String(v == null ? '' : v).trim();
  if(!s) return null;
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(?:['\u2032\u00b4\u2019]|ft|feet)?\s*(\d+(?:\.\d+)?)?/);
  if(!m) return null;
  const ft = parseFloat(m[1]);
  if(!isFinite(ft)) return null;
  const inch = m[2] === undefined ? 0 : parseFloat(m[2]);
  return Math.round((ft * 12 + (isFinite(inch) ? inch : 0)) * 2.54 * 10) / 10;
}
/* Counted from the directory itself, once, the first time anything asks. A model who
   sits on two boards of the same agency is one model, which is why this counts keys
   rather than rows. Sets the two tab badges at the same time, so a new agency cannot
   leave them behind again. */
let DIRSUB = '';
function tallies(){
  if(DIRSUB) return DIRSUB;
  const uniq = new Set(), cty = new Set();
  for(const a of AG){
    if(a.country) cty.add(a.country);
    for(const b of a.boards) for(const m of b.m){
      const raw = m[1];
      uniq.add(normKey(raw.charAt(0) === '|' ? raw.slice(1) : b.p + raw));
    }
  }
  DIRSUB = uniq.size.toLocaleString() + ' models \u00b7 ' + AG.length + ' agencies \u00b7 '
         + cty.size + (cty.size === 1 ? ' country' : ' countries');
  const d = document.getElementById('vn-dir');
  if(d) d.textContent = AG.length + ' agencies';
  const rbox = document.getElementById('f-region');
  if(rbox){
    const have = new Set(Array.from(rbox.querySelectorAll('input[data-f="region"]'))
      .map(i => i.value));
    const want = [];
    for(const a of AG){
      const r = a.region || REGION[a.country] || 'Unknown';
      if(!have.has(r) && !want.includes(r)) want.push(r);
    }
    for(const r of want.sort()){
      const lab = document.createElement('label');
      lab.className = 'opt';
      lab.innerHTML = '<input type="checkbox" data-f="region" value="' + esc(r) + '">' +
        '<span>' + esc(r) + '</span>' +
        '<span class="oc" data-c="region:' + esc(r) + '">0</span>';
      rbox.appendChild(lab);
    }
  }
  /* the Blind spots badge has always counted BOARDS the scan cannot read, not the
     agencies they belong to - kept as it was, but counted rather than typed */
  const bl = document.getElementById('vn-bld');
  if(bl) bl.textContent = String(BLINDS.reduce((n, a) => n + a.b.length, 0));
  return DIRSUB;
}

/* ================= storage =================
     log/YYYY-MM-DD    {day, boards, found, kept, arrivals:[...]}   written by the scan
     views/YYYY-MM-DD  {day, e:[[key,kind,name,meta,url,hhmm,n]]}   written by this page
   One document per day, not per entry: the store caps out at 5,000 documents. */
let DB = null, DOWN = null, logReady = false, logSettled = false;
/* THE STORE HANDS BACK FROZEN DOCUMENTS. Every object and array inside one is sealed,
   so pushing a row onto a loaded list, or adding a key to a loaded object, fails - in
   sloppy mode silently, which is the worst of both worlds: the page looks like it took
   the change and the change was never made. A booking stage would not light, the work
   log would not take a line, and nothing said why.

   So nothing frozen is allowed past the door. Every document is copied on the way in,
   and the page works on its own copy. A document is JSON either way - that is how it
   was stored - so a round trip through JSON is a faithful, and thawed, copy. */
const thaw = v => {
  if(!v || typeof v !== 'object') return v;
  try{ return JSON.parse(JSON.stringify(v)); }catch(e){ return v; }
};
const docOf = d => thaw((d && typeof d.data === 'function') ? d.data() : d);
const VIEWS = new Map();
const RUNS  = new Map();
const KEYDAY = new Map();
let lkind = 'all', lmonth = null, lyear = null, lday = null;
let calY = null, calM = null;
let SHOWN = [];
const LOPEN = new Set();   // agency rows unfolded in the log
let KIDS = new Map();

const hkey = s => 'v' + Math.abs([...s].reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))|0,0)).toString(36)
                  + '_' + s.length;
const localDay = d => {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate());
};
const hhmm = d => String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
const use = n => (window.claude && window.claude.use) ? window.claude.use(n)
                                                     : Promise.resolve(null);
/* The Directory's own measurements. The blob in this page carries names and links only;
   every height or girth here was read off the model's own page by the scan and kept in
   the "meas" collection, one shard per 128, keyed by the normalised profile URL. Loaded
   the first time a bound is typed, never on open - most visits never need it. */
/* Interest marks. Same 128-shard scheme as the measurements, so a busy Lumen list
   never grows one enormous document. Written back whole per shard from what the page
   holds, which is correct for a single scout and last-writer-wins for more. */
const MARKS = new Map();
/* When each lamp was lit, "YYYY-MM-DD HH:MM". Kept in the same shard document under
   its own key, so the measurement crawler - which reads only "e" - is unaffected. */
const MARKAT = new Map();
const shard128 = s => Math.abs([...s].reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))|0,0)) % 128;
const markShard = k => 'k' + shard128(k).toString(16);
/* ================= people =================
   More than one person works this board, so a lamp has to belong to somebody. Anyone
   with the link picks a name and a colour; that pair is their ID. The ID lives in the
   shared store so everyone can see who marked what, and which ID is YOU is remembered
   in this browser alone.

   WHERE THINGS LIVE
     people/<pid>          {n, c}            everyone, readable by all
     pmarks/<pid>          {e:{url:lamp}, t:{url:when}}   one document per person
     blog/<pid>-<YYYY-MM>  {p, m, e:[[when, verb, url, name, agency]]}
     marks/k<shard>        the lamps lit before anyone had an ID - claimable, once

   One document per person per month for the backlog, and one for their lamps, is not
   frugality for its own sake: the store is last-writer-wins with no transactions, so
   two people appending to the SAME document would silently lose one another's writes.
   Nobody here ever writes a document somebody else writes. */
/* Deliberately cool and deliberately pale. Green, amber and red belong to the three
   lamps and to nothing else on this page, so no person's colour comes near them: the
   set runs violet to blue to a single warm neutral, all desaturated enough that a disc
   never competes with the ring of lamp colour around it. */
const IDC = {
  lilac:      {bg: '#C7B6E6', fg: '#3E2C59', n: 'Lilac'},
  periwinkle: {bg: '#AEBFEC', fg: '#2C3A66', n: 'Periwinkle'},
  sky:        {bg: '#A4CCE9', fg: '#1D455F', n: 'Sky'},
  aqua:       {bg: '#A6D2D9', fg: '#1C484D', n: 'Aqua'},
  mauve:      {bg: '#DCB7CE', fg: '#57314C', n: 'Mauve'},
  stone:      {bg: '#C4BFD0', fg: '#3C3849', n: 'Stone'},
  slate:      {bg: '#ABB6C6', fg: '#2C3743', n: 'Slate'},
  clay:       {bg: '#D8C3AF', fg: '#584431', n: 'Clay'}
};
const IDCK = Object.keys(IDC);
const PEOPLE = new Map();            // pid -> {n, c}
/* A duplicate ID is folded into the one it belongs to rather than deleted: the person
   document stays, flagged with who it was merged into, so every backlog line it ever
   wrote still resolves to a name. It simply stops appearing as somebody in its own
   right. */
const MERGED = new Map();            // dead pid -> the pid it became
/* A deleted ID leaves a tombstone {n, c, x:1} rather than nothing, so the backlog lines
   it wrote still say whose they were. It never signs in and never shows as a person. */
const GONEID = new Map();            // deleted pid -> {n, c}
/* The first ID ever made on this board - the owner's. It alone may delete, reset or
   merge somebody else's ID. */
const ADMIN_PID = window.__ILLU_ADMIN || '';
const isAdmin = () => !!ME && realPid(ME) === ADMIN_PID;
const PEERMARKS = new Map();         // pid -> {e: Map, t: Map}
const LEGACY = {e: new Map(), t: new Map()};
const BLOGDOC = new Map();           // doc id -> {p, m, e:[]}
let BLOG = [];                       // every entry, merged, newest last
let ME = null;
let kWho = '';                       // the backlog's person filter
let RINGS = true;                    // draw ID rings around the lamps

const LS = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
const newPid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const idCol = c => IDC[c] || IDC.lilac;
const idInit = n => (String(n || '?').trim().charAt(0) || '?').toUpperCase();
const meRec = () => (ME ? PEOPLE.get(ME) : null) || null;
/* Follow a merge to whoever the ID became, with a hop limit so a bad pair cannot loop. */
function realPid(pid){
  let p = pid;
  for(let i = 0; i < 6 && MERGED.has(p); i++) p = MERGED.get(p);
  return p;
}
function idStyle(c){
  const k = idCol(c);
  return 'style="--idbg:' + k.bg + ';--idfg:' + k.fg + '"';
}
function idDisc(pid, cls, extra){
  const p = PEOPLE.get(pid);
  if(!p) return '';
  return '<i class="' + (cls || 'iddisc') + '" ' + idStyle(p.c) +
    ' data-p="' + esc(pid) + '" data-n="' + esc(p.n) + '"' + (extra || '') + '>' +
    esc(idInit(p.n)) + '</i>';
}

function liveChip(){
  const n = document.getElementById('signow');
  if(!n) return;
  let c = document.getElementById('livechip');
  if(!c){ c = document.createElement('span'); c.id = 'livechip'; n.insertAdjacentElement('afterend', c); }
  const on = LIVE.started && LIVE.subs.length > 0;
  c.className = on ? 'on' : '';
  c.textContent = on ? 'LIVE' : '';
  c.title = on ? 'Changes by anyone appear here as they happen' : '';
}
/* ================= live =================
   Everyone who has the page open sees the same thing, as it happens. Each shared
   collection is watched once; a change anywhere re-reads that collection through the
   same loader the page opened with, so the data rules are the ones already proven,
   and the screen redraws. Two guards keep it from fighting the person at the keyboard:
   - what you changed in the last few seconds wins over a delivery that may predate it
     (your lamp, a booking card you are editing, contacts you just typed);
   - nothing redraws under someone mid-typing: deliveries wait until the field is left. */
const LIVE = {mineAt: 0, book: new Map(), cts: new Map(), arr: new Map(), add: new Map(),
              subs: [], dirty: new Set(), timer: 0, started: false, at: 0};
const LIVEHOLD = 8000;
const liveRecent = (map, k) => (Date.now() - (map.get(k) || 0)) < LIVEHOLD;
function liveTyping(){
  const a = document.activeElement;
  return !!(a && a !== document.body && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable));
}
function liveStart(){
  if(LIVE.started || !DB) return;
  LIVE.started = true;
  for(const c of ['people', 'pmarks', 'marks', 'book', 'photos', 'contacts', 'blog', 'views', 'log',
                  'bvadd', 'bvarr', 'medits', 'insta', 'agdel', 'sitestat', 'mdel', 'gone'])
    liveWatch(c);
  /* a field left: anything that arrived meanwhile goes on screen now */
  document.addEventListener('focusout', () => setTimeout(() => { if(LIVE.dirty.size) liveKick(); }, 250));
}
function liveWatch(coll, tries){
  let first = true;
  try{
    const un = DB.collection(coll).limit(1000).onSnapshot(() => {
      if(first){ first = false; return; }          // the opening delivery is what we just loaded
      LIVE.dirty.add(coll); liveKick();
    }, err => {
      /* a dead stream is re-opened once a little later; a revoked view stays as it is */
      if(err && err.code === 'unavailable' && (tries || 0) < 5)
        setTimeout(() => liveWatch(coll, (tries || 0) + 1), 4000);
    });
    LIVE.subs.push(un);
  }catch(e){}
}
const LIVELATER = new Map();
function liveLater(coll){
  clearTimeout(LIVELATER.get(coll));     // the newest hold decides when to look again
  LIVELATER.set(coll, setTimeout(() => { LIVELATER.delete(coll); LIVE.dirty.add(coll); liveKick(); }, LIVEHOLD + 400));
}
function liveKick(){
  clearTimeout(LIVE.timer);
  LIVE.timer = setTimeout(liveApply, 300);
}
let liveBusy = false;
async function liveApply(){
  if(liveBusy){ liveKick(); return; }
  if(liveTyping()) return;                          // picked up again on focusout
  const todo = new Set(LIVE.dirty); LIVE.dirty.clear();
  if(!todo.size) return;
  liveBusy = true;
  try{
    if(todo.has('people') || todo.has('pmarks') || todo.has('marks')){
      const keepMine = ME && (Date.now() - LIVE.mineAt) < LIVEHOLD;
      const mine = keepMine ? {e: new Map(MARKS), t: new Map(MARKAT), m: new Map((myLampRec().m) || [])} : null;
      if(todo.has('people')) await loadPeople();
      await Promise.all([loadPeerMarks(), loadLegacyMarks()]);
      if(mine && ME){ PEERMARKS.set(ME, {e: new Map(mine.e), t: new Map(mine.t), m: mine.m}); liveLater('pmarks'); }
      MARKS.clear(); MARKAT.clear();
      const rec = ME ? PEERMARKS.get(ME) : null;
      if(rec){ for(const [k, v] of rec.e) MARKS.set(k, v); for(const [k, v] of rec.t) MARKAT.set(k, v); }
      else if(!ME){ for(const [k, v] of LEGACY.e) MARKS.set(k, v); for(const [k, v] of LEGACY.t) MARKAT.set(k, v); }
      sharedDirty();
      try{ paintIdBar(); }catch(e){}
      try{ mergeOnline(); }catch(e){}
    }
    if(todo.has('book')){
      const keep = new Map(), base = new Map();
      for(const [bid, c] of BOOK) if(BKSAVE.has(bid) || liveRecent(LIVE.book, bid)){ keep.set(bid, c); base.set(bid, BKBASE.get(bid)); }
      await loadBook();
      for(const [bid, c] of keep){ BOOK.set(bid, c); if(base.get(bid)) BKBASE.set(bid, base.get(bid)); }
      if(keep.size) liveLater('book');
    }
    if(todo.has('contacts')){
      const keep = new Map();
      for(const [d, rows] of CONTACTS) if(liveRecent(LIVE.cts, d)) keep.set(d, [rows, ADDR.get(d)]);
      await loadContacts();
      for(const [d, [rows, a]] of keep){ CONTACTS.set(d, rows); ADDR.set(d, a); }
      if(keep.size) liveLater('contacts');
      try{ repaintContacts(); }catch(e){}
    }
    if(todo.has('photos')) await loadPics();
    if(todo.has('agdel')) await loadAgDel();
    if(todo.has('mdel')) await loadMDel();
    if(todo.has('gone')) await loadGone();
    if(todo.has('sitestat')){ await loadSiteStat(); setTimeout(siteNotify, 300); }
    if(todo.has('blog')) await loadBacklog();
    if(todo.has('medits')) try{ await loadEdits(); }catch(e){}
    if(todo.has('insta')) try{ await loadIG(); }catch(e){}
    if(todo.has('views') || todo.has('log')) await liveLog(todo);
    if(bv && !bvEl.hidden){
      const id = bv.id;
      if(todo.has('bvadd')){ if(!liveRecent(LIVE.add, id)) await bvAddLoad(id, true); else liveLater('bvadd'); }
      if(todo.has('bvarr')){ if(!liveRecent(LIVE.arr, id)){ BVARR.delete(id); await bvArrLoad(id); } else liveLater('bvarr'); }
    }
    LIVE.at = Date.now();
    liveRedraw(todo);
  }catch(e){}
  finally{ liveBusy = false; }
}
/* the shared work log and the morning scans: rows are only ever added, so a delivery
   is merged in rather than replacing what this page already holds */
async function liveLog(todo){
  if(todo.has('views')){
    for(const v of await readAll('views')){
      if(!v || !v.day) continue;
      const rows = Array.isArray(v.e) ? v.e : [];
      const cur = VIEWS.get(v.day);
      if(!cur){ VIEWS.set(v.day, {day: v.day, e: rows.slice()}); }
      else{
        const have = new Map(cur.e.map((r, i) => [r[0], i]));
        for(const r of rows){ if(have.has(r[0])) cur.e[have.get(r[0])] = r; else cur.e.push(r); }
      }
      for(const r of rows){ const had = KEYDAY.get(r[0]); if(!had || v.day < had) KEYDAY.set(r[0], v.day); }
    }
  }
  if(todo.has('log')) for(const r of await readAll('log')) if(r && r.day) RUNS.set(r.day, r);
  try{ buildYears(); renderLog(); updateBadge(); }catch(e){}
}
function liveRedraw(todo){
  if(liveTyping()){ for(const c of todo) LIVE.dirty.add(c); return; }
  const y = window.scrollY;
  try{ refresh(); }catch(e){}
  if(Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
  if(bv && !bvEl.hidden){
    const c = BOOK.get(bv.id);
    if(!c){ bvClose(); return; }
    try{ bvSideRefresh(); }catch(e){}
    const mx = bvHd.querySelector('.bvmx'); if(mx) try{ mx.innerHTML = bvFigures(c); }catch(e){}
    if((todo.has('bvadd') || todo.has('bvarr')) && bv.view !== 'm' && !bv.choose && bvDragFrom == null)
      try{ bvDraw(); }catch(e){}
  }
  try{ liveChip(); }catch(e){}
  if(LANG !== 'en') try{ paintLang(); }catch(e){}
}

/* ================= agencies: deleting, reviving, and their websites =================
   An agency is never really removed: deleting it hides it from the directory, the
   filters and every count, and files it in the Backlog, where Revive puts it back
   exactly as it was. The record is shared (agdel/<domain>), so it is the same for
   everyone at once, and the morning scan skips a deleted agency's boards. */
const AGDEL = new Map();          // domain -> {d, nm, st: 'del'|'live', at, by, h: [[ts, pid, 'del'|'rev']]}
const SITESTAT = new Map();       // domain -> {d, nm, s: 'construction'|'gone'|'ok', at, since, note}
const agDocId = d => String(d || '').toLowerCase().replace(/[^a-z0-9.\-]/g, '_').slice(0, 180) || 'x';
async function loadAgDel(){
  if(!DB) return;
  try{
    const snap = await DB.collection('agdel').limit(500).get();
    AGDEL.clear();
    for(const d of ((snap && snap.docs) ? snap.docs : (snap || []))){
      const v = docOf(d);
      if(v && v.d) AGDEL.set(v.d, v);
    }
  }catch(e){}
  agApply();
}
async function loadSiteStat(){
  if(!DB) return;
  try{
    const snap = await DB.collection('sitestat').limit(500).get();
    SITESTAT.clear();
    for(const d of ((snap && snap.docs) ? snap.docs : (snap || []))){
      const v = docOf(d);
      if(v && v.d) SITESTAT.set(v.d, v);
    }
  }catch(e){}
}
const agIsDel = d => { const r = AGDEL.get(d); return !!(r && r.st === 'del'); };
/* the list everything else reads, rebuilt in place so no reader has to change */
function agApply(){
  const want = AGALL.filter(a => !agIsDel(a.domain));
  if(want.length === AG.length && want.every((a, i) => AG[i] === a)) return false;
  AG.length = 0;
  for(const a of want) AG.push(a);
  DIRSUB = ''; AGOF = null; KEYINFO = null;
  try{ tallies(); }catch(e){}
  return true;
}
async function agSetDeleted(dom, del){
  if(!SIGNED()){ nudgeSignIn(); return false; }
  if(!DB) return false;
  const a = AGALL.find(x => x.domain === dom);
  if(!a) return false;
  const id = agDocId(dom);
  let cur = null;
  try{ cur = docOf(await DB.doc('agdel/' + id).get()); }catch(e){}
  const now = new Date().toISOString();
  const rec = Object.assign({d: dom, nm: a.name, city: a.city || '', country: a.country || '', h: []}, cur || {});
  rec.h = (Array.isArray(rec.h) ? rec.h : []).concat([[now, ME || '', del ? 'del' : 'rev']]).slice(-40);
  rec.st = del ? 'del' : 'live';
  rec.at = now; rec.by = ME || '';
  try{ await DB.doc('agdel/' + id).set(rec); }catch(e){ return false; }
  AGDEL.set(dom, rec);
  agApply();
  try{ refresh(); }catch(e){}
  try{ if(VIEW === 'bkl') renderBacklog(); }catch(e){}
  return true;
}

/* ---- one window for questions and notices, in the page's own style ---- */
let DLGOPEN = null;
function illumDialog(o){
  return new Promise(res => {
    if(DLGOPEN) DLGOPEN.close(null);
    const w = document.createElement('div');
    w.className = 'idlg' + (o.danger ? ' idlg--danger' : '');
    w.setAttribute('role', o.danger ? 'alertdialog' : 'dialog');
    w.setAttribute('aria-modal', 'true');
    w.innerHTML = '<div class="idlgbox"><h3>' + o.title + '</h3><div class="idlgbody">' + o.body + '</div>' +
      '<div class="idlgbtns">' + (o.cancel === false ? '' : '<button type="button" class="idlgc" data-r="0">' +
      (o.cancel || 'Cancel') + '</button>') + '<button type="button" class="idlgo" data-r="1">' +
      (o.ok || 'OK') + '</button></div></div>';
    const close = v => {
      if(!w.isConnected) return;
      w.remove(); document.removeEventListener('keydown', key, true);
      if(DLGOPEN && DLGOPEN.w === w) DLGOPEN = null;
      res(v);
    };
    const key = e => { if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(false); } };
    w.addEventListener('click', e => {
      if(e.target === w){ close(false); return; }
      const b = e.target.closest('[data-r]');
      if(b){ close(b.dataset.r === '1'); return; }
      if(o.onClick) o.onClick(e, close);
    });
    document.addEventListener('keydown', key, true);
    document.body.appendChild(w);
    DLGOPEN = {w: w, close: close};
    if(LANG !== 'en') try{ langWalk(w); }catch(e){}
    setTimeout(() => { const b = w.querySelector(o.danger ? '.idlgc' : '.idlgo'); if(b) b.focus(); }, 0);
  });
}
async function agAskDelete(dom){
  if(!SIGNED()){ nudgeSignIn(); return; }
  const a = AGALL.find(x => x.domain === dom);
  if(!a) return;
  let n = 0;
  for(const b of a.boards) n += b.m.length;
  const ok = await illumDialog({
    danger: true,
    title: 'Delete ' + esc(a.name) + '?',
    body: '<p>Are you sure you want to delete <b>' + esc(a.name) + '</b>' +
      (a.city || a.country ? ' (' + esc([a.city, a.country].filter(Boolean).join(', ')) + ')' : '') +
      ' from the directory?</p><p>Its ' + a.boards.length + (a.boards.length === 1 ? ' board' : ' boards') +
      ' and ' + n.toLocaleString() + ' models leave the directory and the morning scan stops checking them. ' +
      'Lamps, notes and bookings already made are kept.</p>' +
      '<p class="idlgnote">You can revive it at any time from the <b>Backlog</b>.</p>',
    ok: 'Delete agency', cancel: 'Keep it'
  });
  if(!ok) return;
  if(await agSetDeleted(dom, true)) siteToast(a.name + ' deleted · revive it from the Backlog');
}
function siteToast(t){
  let el = document.getElementById('agtoast');
  if(!el){ el = document.createElement('div'); el.id = 'agtoast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = t; el.classList.add('on');
  if(LANG !== 'en') try{ langWalk(el); }catch(e){}
  clearTimeout(siteToast.t); siteToast.t = setTimeout(() => el.classList.remove('on'), 4200);
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-agdel]');
  if(!b) return;
  e.preventDefault(); e.stopPropagation();
  agAskDelete(b.dataset.agdel);
}, true);
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-agrev]');
  if(!b) return;
  e.preventDefault(); e.stopPropagation();
  const dom = b.dataset.agrev, a = AGALL.find(x => x.domain === dom);
  agSetDeleted(dom, false).then(ok => { if(ok && a) siteToast(a.name + ' is back in the directory'); });
}, true);

/* ---- the Backlog's list of deleted agencies ---- */
function agDelSection(){
  const dels = [...AGDEL.values()].filter(r => r.st === 'del').sort((x, y) => String(y.at).localeCompare(String(x.at)));
  if(!dels.length) return '';
  const when = t => { const d = new Date(t); return isNaN(d) ? '' : localDay(d) + ' ' + hhmm(d); };
  return '<section class="agdelsec"><h3>Deleted agencies <s>' + dels.length + '</s></h3>' +
    '<p class="agdelp">Deleted from the directory. Revive puts an agency back with all its boards.</p>' +
    dels.map(r => '<div class="agdelrow"><div class="agdelw"><b>' + esc(r.nm || r.d) + '</b><span>' +
      esc([r.city, r.country].filter(Boolean).join(', ')) + (r.d ? ' · ' + esc(r.d) : '') + '</span>' +
      '<em>Deleted ' + esc(when(r.at)) + (r.by && PEOPLE.has(r.by) ? ' by ' + idDisc(r.by) + esc(PEOPLE.get(r.by).n) : '') +
      '</em></div>' + (SIGNED() ? '<button type="button" class="agrevb" data-agrev="' + esc(r.d) + '">Revive</button>' : '') +
      '</div>').join('') + '</section>';
}

/* ---- websites that are under construction or gone ----
   The morning scan records each agency whose site is down (sitestat/<domain>); the
   page shows a chip on the agency and, once per new notice, a window saying so. */
const SITESTXT = {construction: 'Under construction', gone: 'No longer available'};
function siteChip(dom){
  const r = SITESTAT.get(dom);
  if(!r || !SITESTXT[r.s]) return '';
  return '<span class="agstat agstat--' + r.s + '" title="' + esc(SITESTXT[r.s] + (r.note ? ' — ' + r.note : '')) +
    '">' + SITESTXT[r.s] + '</span>';
}
const siteAckKey = r => r.d + '|' + r.s + '|' + (r.since || r.at || '');
function siteAcked(){ try{ return new Set(JSON.parse(localStorage.getItem('illum.siteack') || '[]')); }catch(e){ return new Set(); } }
let siteNoticeOpen = false;
async function siteNotify(){
  if(siteNoticeOpen || !SITESTAT.size) return;
  const ack = siteAcked();
  const list = [...SITESTAT.values()].filter(r => SITESTXT[r.s] && !agIsDel(r.d) && !ack.has(siteAckKey(r)));
  if(!list.length) return;
  siteNoticeOpen = true;
  const when = t => { const d = new Date(t); return isNaN(d) ? '' : localDay(d); };
  await illumDialog({
    title: list.length === 1 ? 'An agency website needs attention' : list.length + ' agency websites need attention',
    body: '<div class="sitelist">' + list.map(r => {
      const a = AGALL.find(x => x.domain === r.d);
      return '<div class="siterow siterow--' + r.s + '"><div><b>' + esc((a && a.name) || r.nm || r.d) + '</b>' +
        '<span class="agstat agstat--' + r.s + '">' + SITESTXT[r.s] + '</span>' +
        '<em>' + esc(r.d) + (r.since ? ' · since ' + esc(when(r.since)) : '') + (r.note ? ' · ' + esc(r.note) : '') + '</em></div>' +
        '<span class="sitebtns"><a href="https://' + esc(r.d) + '" target="_blank" rel="noopener noreferrer">Open site</a>' +
        (SIGNED() && a ? '<button type="button" data-sitedel="' + esc(r.d) + '">Delete listing</button>' : '') + '</span></div>';
    }).join('') + '</div><p class="idlgnote">The morning scan checks these again each day and clears the notice when a site is back.</p>',
    ok: 'Got it', cancel: false,
    onClick: (e, close) => {
      const b = e.target.closest('[data-sitedel]');
      if(b){ close(true); setTimeout(() => agAskDelete(b.dataset.sitedel), 50); }
    }
  });
  const a2 = siteAcked();
  for(const r of list) a2.add(siteAckKey(r));
  try{ localStorage.setItem('illum.siteack', JSON.stringify([...a2].slice(-500))); }catch(e){}
  siteNoticeOpen = false;
}

/* ================= models that have left their board =================
   GONE holds the profiles the crawler was told no longer exist, and the departures the
   morning scan saw on two runs running. Selecting one of those models asks whether to
   take the card out of the directory. A removal is shared (mdel/<id>), hides the model
   from every directory list for everyone, and is filed in the Backlog with a Revive. */
const MDEL = new Map();           // model key -> {k, nm, ag, co, st: 'del'|'live', at, by, why, h}
const mdelId = k => { let a = 0, b = 2166136261;
  for(const c of String(k)){ const x = c.charCodeAt(0); a = ((a << 5) - a + x) | 0; b = Math.imul(b ^ x, 16777619); }
  return 'k' + (a >>> 0).toString(36) + (b >>> 0).toString(36); };
const mdelIs = k => { const r = MDEL.get(k); return !!(r && r.st === 'del'); };
async function loadMDel(){
  if(!DB) return;
  try{
    const snap = await DB.collection('mdel').limit(1000).get();
    MDEL.clear();
    for(const d of ((snap && snap.docs) ? snap.docs : (snap || []))){
      const v = docOf(d);
      if(v && v.k) MDEL.set(v.k, v);
    }
  }catch(e){}
  DIRSUB = '';
}
async function mdelSet(k, info, del){
  if(!SIGNED()){ nudgeSignIn(); return false; }
  if(!DB) return false;
  const id = mdelId(k);
  let cur = null;
  try{ cur = docOf(await DB.doc('mdel/' + id).get()); }catch(e){}
  const now = new Date().toISOString();
  const rec = Object.assign({k: k, nm: info.nm || '', ag: info.ag || '', co: info.co || '', href: info.href || k, h: []}, cur || {});
  rec.h = (Array.isArray(rec.h) ? rec.h : []).concat([[now, ME || '', del ? 'del' : 'rev']]).slice(-40);
  rec.st = del ? 'del' : 'live';
  rec.at = now; rec.by = ME || '';
  if(del) rec.why = info.why || rec.why || 'gone';
  try{ await DB.doc('mdel/' + id).set(rec); }catch(e){ return false; }
  MDEL.set(k, rec);
  DIRSUB = '';
  try{ refresh(); }catch(e){}
  try{ if(VIEW === 'bkl') renderBacklog(); }catch(e){}
  return true;
}
function goneAcked(){ try{ return new Set(JSON.parse(localStorage.getItem('illum.goneack') || '[]')); }catch(e){ return new Set(); } }
async function mdelAsk(k, nm, ag, href){
  const g = GONE.get(k) || {};
  const name = nm || g.nm || 'This model';
  const agency = ag || g.ag || 'the agency';
  const when = g.t ? (d => isNaN(d) ? '' : localDay(d))(new Date(g.t)) : '';
  const ok = await illumDialog({
    danger: true,
    title: 'No longer on the board',
    body: '<p><b>' + esc(name) + '</b> is no longer on <b>' + esc(agency) + '</b>’s board' +
      (when ? ' (noticed ' + esc(when) + ')' : '') + '. The agency has taken the profile down.</p>' +
      '<p>Do you want to remove this model’s card from the directory listing?</p>' +
      '<p class="idlgnote">Lamps, notes and bookings are kept. You can revive the card at any time from the <b>Backlog</b>.</p>',
    ok: 'Remove card', cancel: 'Keep card',
    onClick: (e, close) => { const a = e.target.closest('[data-goneopen]'); if(a){ close(false); } }
  });
  if(ok){
    if(!SIGNED()){ nudgeSignIn(); return; }
    if(await mdelSet(k, {nm: name, ag: agency, co: g.co || '', href: href, why: 'gone'}, true))
      siteToast(name + ' removed · revive the card from the Backlog');
    return;
  }
  /* kept: this browser does not ask about the same model again */
  const a = goneAcked(); a.add(k);
  try{ localStorage.setItem('illum.goneack', JSON.stringify([...a].slice(-2000))); }catch(e){}
}
/* runs before every other click handler, and before the link opens a page that 404s */
document.addEventListener('click', e => {
  const el = e.target.closest && e.target.closest('.rnm[data-ref], .mnm[data-ref], a.bknmlink[data-ref]');
  if(!el || e.button) return;
  const href = el.dataset.ref, k = normKey(href);
  if(!GONE.has(k) || MDEL.has(k) || goneAcked().has(k)) return;   // a revived card is kept on purpose
  e.preventDefault(); e.stopPropagation();
  const box = el.closest('.ag'), a = box ? AG[+box.dataset.i] : null;
  mdelAsk(k, el.dataset.nm || el.textContent.trim(), el.dataset.ag || (a && a.name) || '', href);
}, true);
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-mrev]');
  if(!b) return;
  e.preventDefault(); e.stopPropagation();
  const k = b.dataset.mrev, r = MDEL.get(k);
  mdelSet(k, r || {}, false).then(ok => {
    if(!ok) return;
    const a = goneAcked(); a.add(k);                 // revived on purpose: do not ask again here
    try{ localStorage.setItem('illum.goneack', JSON.stringify([...a].slice(-2000))); }catch(e){}
    siteToast((r && r.nm || 'The model') + ' is back in the directory');
  });
}, true);
function mdelSection(){
  const dels = [...MDEL.values()].filter(r => r.st === 'del').sort((x, y) => String(y.at).localeCompare(String(x.at)));
  if(!dels.length) return '';
  const when = t => { const d = new Date(t); return isNaN(d) ? '' : localDay(d) + ' ' + hhmm(d); };
  return '<section class="agdelsec"><h3>Removed model cards <s>' + dels.length + '</s></h3>' +
    '<p class="agdelp">Taken out of the directory after leaving their board. Revive puts a card back.</p>' +
    dels.map(r => '<div class="agdelrow"><div class="agdelw"><b>' + esc(r.nm || r.k) + '</b><span>' +
      esc([r.ag, r.co].filter(Boolean).join(' · ')) + '</span>' +
      '<em>Removed ' + esc(when(r.at)) + (r.by && PEOPLE.has(r.by) ? ' by ' + idDisc(r.by) + esc(PEOPLE.get(r.by).n) : '') +
      '</em></div>' + (SIGNED() ? '<button type="button" class="agrevb" data-mrev="' + esc(r.k) + '">Revive</button>' : '') +
      '</div>').join('') + '</section>';
}
/* ---- country flags: built in, because Windows shows no flag emoji and the page may not load
   outside images. Every country is here, so a newly added one gets its flag too. ---- */
const FLAGPNG = {"af":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADwUlEQVR4AeyYW0xbdRzHP+eccnqnUEAGK5dKySYwEAeTJYqZzKCLxphNH+bMTJzG8LQXM5d4icEYX5Y4XDL3MI0vOqIJmMyYPS3OzCyRB3FsCugQuzAobUUo9N76h2QPkLGmPadZlrTpLyf/87uc7+Wfc06ODFJaS1yEtJbgDGktIQhwX/8KBO61fQUHCg5oVKCwhTQKqLm94MDdJDSUl1MkAkW5W5mmnO4OKDYb9o4Oyvfvp/LgQSxNTZTt20dpby+K3a4J7J2adSWgWK1UCOAYDERv3SLi9SKpKvFAgGQoRGlPD9bW1jvhyPmcbgSsjzRi6fQQuvoLS1eusHL9OnG/n1Q0ytLICIuXL5MML6A4Uphb6nIGvLFRFwKy3YxjbzdWj4dUIo5kNqGUOXjg5ecoffYJimqrkC1mYrMzmD0NOJ/Zi2QzbcSS01oXAiZ3JaFfx4jOBVn5bXINZFnPk6j1wpXtzTgf78YkgC+PThCfWyA0OsZqT06INzRpJiCXmDHtaKL6lTeR4imUEhuyrRi1tk6obqXIWYHqdiObLGs5JJnqw31YWpuQ7cYNcLJfaiYgKRJEl4XqdcKBAA2nB0iJvR7yTTH56iHGDx8iFPyHdCKE58wporN+VFclxMJIBtGbPeZ1HZoJGKtcqJ5t3Bz4WNxhmvGd/QKMKulYCveJAeRiJytjE6AamTv7OZbm7cycPoFxWwvG6pp1YHJZaCYQnviTkq7HcH/0Kea6BwlPTiElFRwtbcT8czScPImjcxfppEx4/AYWd6OoPYVtR5uovZEL5nU9mgmsKu397BPGX3uJyOwk0embGF1bkZMSSxd/xPfVl8jhMAazcS0XDfv44/UXCQ4NCpeS68DkssiCwObjE797kcsqSBTJuD54G/vD7ST+XcTevhtrfTPGkiqcPU9R8+FxEGSU8q38d2lk84FZZHQhEJ2ex9a2m4quHgHci/+HQQLD3zE/NETwwgX8w8Pi3DnxYPubkl3d2Fo7iM8sZAFz81JdCKyO977bz+zwOQyOUlxH36LqyBEcXY9ia2+n/IXnqX7jKKqzCt/wIN53+ldbdAndCIivOyz/dJWVa1NYah+idM8e6t97H1dfH2pjDcVtnUTEVlu6NCq+JOmCfW2IfgTEuLjPT/Db77l24AB/HTvGz1u2MLJzJ9PH+xntfRrf198Qnw+ISv3+uhK4DSsm3kQD58+TikRILi6Ku8+02P/+22ldj3khoCvCDMMKBDIIlPd0wYG8S5zhAgUHMgiU93TBgbxLnOEC/wMAAP//JoKWyQAAAAZJREFUAwA+YV+4Fxo/zgAAAABJRU5ErkJggg==","ax":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABB0lEQVR4AeySIQsCQRCFhw1iEuHqgRiVsx1mtZnF5t8wmS8JVv+AJv+DmkUMCmoT4aoGk1hWOFDYtjMTdhfm4IW7e/vYed8oGCw1RrN5X+sDFHpmkT5W07+uSVJ8//3H5FK9CgJ/ZADXAIWAEGA2ICvELJB9XAiwK2QGhE+gUzsDRnHlYd0ZJpfqVZtRBhgNGzvrATC5VG/4K2Rdp6dGdeqlQFU+rRtjffIyOYt6B1khA4GDl/AJtNZ7oCoe34zOS/GbnEW9A4KAcVdvXsIfoLuYAEarS9u6fUwu1au29yZglL8i6wEwuVRv+CtkXaenRiHgGowQEALMBmSFmAWyjwsBdoXMgC8AAAD//+AOw9wAAAAGSURBVAMAT47PZwEKKvUAAAAASUVORK5CYII=","al":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADe0lEQVR4AeyXa2iOYRjHr00yFomITEzSJptECjnGGpPD0BySc8pSPvjAJz7wgZxzyCHnQ0jL1jahMBISOdMMn5zKOT5Q7+v3f/O2rbbyXtvT21vvun7P/3ru3fdz3ddzH577TQ2bhROZVEvwv2QC8R7A5AgkR6CJb8A9hbYT+CXIqrncgOEwCgrhLkTtDs5kGPmPm6jaICbdKceJO4HWBMyDZ9Ab/kB/uGYpVgJr8WV8Y0x+KWVVkGtmv0FtnqLjQM9CXOZOYALhlsAA6Any+6KvLWz5UE5nT3N/HCrxx1Om/2VzvwgyYSAsg3zwmjuBHUR8AAdhNtTQyWI4gH8SWtHhFehKSMM/ge4F1XlFvbn4+6AGdoPX3AksIOIw+Ao/IGoPcVSmafIe/yOdlf8NX/9DIqY2QtNuXqTEd3EncJV4WnxazPfwo1ZGh3uB5n60LMR9JlRAtEyLXKO4jYIq8Jo7gbFEPAxXoAs0bCkNF1OaAWp7BNXOhbjMncALwm2CMugKsVpnGpwHPaMa9Zo7ATXMIWoFqDNITNaJ2hdAz9CzcF3mbtuWcNoSj6LfIVb7RQNNwT5oO/CaO4HHRCyB1dAPCtgqMyAH2gNF9UxluZR3A30TlPwqamgaPUK95k5gKhG1C01BL8IGWAxKZg5qkR2ndi/Svq/pMt/MNkMpzIBdMAm85k7gCREHgT5OG9F1MBGKQB+3bN40bsSy8FVWxJ0SXo8qiS3oYHgOXnMnMIKI+gacQ7uDvqoaBb19HdyUoB6eSuflF1BHX2zt/Uq6B/flsBV0CERcphj/2bB+NW19XyjS0eEMugbeQQvYA1rcITTEVDqFqtOIvTEz1VUbjYq+0NqSKXaZK4GfhLoOlXAbLkMaaC0cQ2+BzkFIxJZz1ZFaBzttnS25vwQ6VmsR6yiuZ1IUs7kSSCfMaNBReD+q6TMT/QRnQVa7fHVnFkI03T6js0DtNHp5+GNAz0RiNlcCiqL9W7uOfKFzvo4HWsiHKNDxug2abmFbiGq6aG2ojupSFLGlXPXbAHGZO4HGommn0eh8oII6loW+Bb3paWhzW7MnoA5qf9d2qePzfQqmQyEEYYEk0JGeDgEtbP1cHIrfAYKwQBJQR3VC1UlTi7Xx47ZqNo3AElC3irlox0ECs0ATCKzXdR6cTKDOy4iLmxyBuLz2OkETfgT+AgAA//9sRKt/AAAABklEQVQDACs0CfiAl896AAAAAElFTkSuQmCC","dz":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADcUlEQVR4AexWW0hUQRj+5qhb3pI0b4WadlUjNbNWU7KSgiIN7EIQPVSivVhPigTZBYukoLAwsqfAhyArjYSiRAovkIlGogYaCqZmuRpecnV3mjngOe1uD9vOWUTYAzNn5p9/Zr7v/+ef+SWcSqTOLNTJn4RF/rkILLQDXR5weUDQAq4jJGhA4emae2DHEEXxR+BRPdBUA3Su34feg3kYLinHdGuHMGDrBTQjsHYcePAeKG+UkN1HED9K4D1HMDcyCmP/ICYaWtHDiPSfvgDTD4M1Dof7mhDgVn9cB+hHiAJk2JPivJ4itq8eG9ursaa2Apv667Ei5yjGql5jpqtX0RVpCBOIMVDcaSbwoCr46giKzAyKupWAtMxbxefmBi99HAJyj2F2cASmn2PqmIMtIQI6E8X1DwQ6M1G2bwyiuLiFYtpDlSmDvGE2AyYTfHZth+S5lEuEiiQyO2OAIHJCBWrQURQlAZSoMuv1h0sfgs7MymLitcAE0oZlHEr1JBIwLFG6csNQWYNJFsCgFFPN7fh+owKQiDymRSXkgRiry6TN3xaSd3ICvh7JR2fsAflvqyEmESIQ9Nty808B1FLAerqoMKy6WYg5FrTmiSkmAbqTsjFUXAYt3gUhAsQKLwtPGaBNZbZS5DHCjhQkoe3lbYRWGLGKweh/3IrGnn4MFJTCPTQQbv5+4IG7oeUpQq7kwzM+WgYhUgkRaA+w3DrWYBuck01tiKq6i+iOl1hdeQt0ip07fpVaTnW49x8EbPeoDbOUHWePq6/R8rgsP5EJr+R4gB0b/ogFFZxh9yw0+4QINAYDbf4q4JBpgmsttl74G21wYQ6Izl0WmX9Nyn+RSogA37gkgcIoqSR2DhFcZdmo56wq43pK4YHLUorx6rcwjbEMUBlwrCFMoNuP4JyewgQVcBbLRp+/Idj9DbCwMksh+GM2dKkM/GHzCGfJkmO4lVnCBPhKDSEEh/dQ8DyI93kJZcfpdjNBR0Q6uuKy0LM/B5/D0+UbyXdvKvwOZXA14aIJAY6ih3kiLxU4m2JGFctGeWxMuVG4B/pDFx4Kn7StiHp2D+veVcI7JYFP0aRoRmAeDffG5UTgZDqgzwKiv7xC1Iv7CC7Khde2zfNqmv01J6AZMjsXchGw01BOU3N5wGmmtXNhlwfsNJTT1Ba9B/4AAAD//7yLsOsAAAAGSURBVAMA7Dx+2D4Oh4QAAAAASUVORK5CYII=","as":"data:image/png;base64,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","ad":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADvElEQVR4AeyWW1NbVRTHf+dGuCQBEiiokNsUuVShVFCoLY4Pjs6Ivvjgky9+Ar+D38AXn3zCB0vfHR0fnFpHmQaQtsxguQVhSiwhQHICJ4Qkx33IOC0zacb0nOJ0JnuyTs7ee+21/v+11s6KTOd35rPK1NfXzGIMW5L8qt1caLn6zCLzgo8agf87gbUM1DJgMwK1ErIZQNvHn1sGisXH2J58f7zqzJujBEyzBKqQV4jenWRt4wqxjUFm//iYkxPpdPNfndOJAw/HCGz/PcD8/U+ZmZ3gJAfp1Cusb02wHHsXo9CBKZBH565z69cP2X540QHoJROOECgUYP3h+2SMEEdGhJXYBIYhcZg+oiA2jUMXdxc/YE+/TJ4+Hghix9kSALtPRwgoCkS6fsCM7+L/JkrzvdcZuHeHV7dmGPJ+z3BumkBintcSN5ClJH2hH3HV24VeOu8Ige2dQZZXQ0gFE3dbJ4HPdwh/MUpuUUPLZVAzxqnIyWMUVWL9rz42NyIlBDaftgnomRaic+PsH3RRFOUiycKklKOgl0eWyxVJ6X0sb02KElPLK1WxKrxVoV1GVVWz1DVIp+BlRcU9fsKj6TH2fgmivRzALJoUnxCXS8MUP0j5Yu70u4zJqpbkqrTLKDfUZ+npXqCuzoXUpZKq3yWtTZFWvkUe2SHd3U9iaIij8X5OPuold2xFXaI/9DNuT76MxeqWbBOw3EXCM1xo30Rhn5b0Gq2ZNbzJTTzZGB3eRTJTcY6//BN/PIosG/ibFwkEHlhHbYsjBO4vjZHUfUhKeXO+qxl8nxVROwVeSRJ3wM/i0oiY2P+U91iFXdGf0HUPquQHuRFJls6cljSJ/JpM9naevK4iaCBqjUPRG5z4i1EFAZ46Gpp86Ic68W2JjbZ32PP1cPBSCN0TJpEKIb8XJPXJKEvGJNkDhWPRqk3axOV+qsn/vGGbgCQC7m2K0er34W5ys57sZCV/jVXlOlvqqOgPbxOLj7GyPEBirwutoZ6W1mYa6uOo1n3G3rBNwHLfE7lD+MJPeL1xuoOHeJt3RadtRNM0Gt2NAqhCW/s+vpZHeJq28XtuMTgwhxPDEQIWkHB4gbEr04wOTzM2fAPJTJBJZTAMQ/SITd66fJMRIW++cZNLvb8jKwXrmG1xjICFxConqyxE4OmJ/Eawa5ZAxzwXQ3NoLtDqENmwNJ0T2TlTZy0Fu1cZvBSlv/c24WDs7KaDs+dGwEGMFU3VCFQMzzls1jJwDkGu6KKWgYrhOYfNWgbOIcgVXfwDAAD//+owLqcAAAAGSURBVAMAtAmcyGPoBrgAAAAASUVORK5CYII=","ao":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADI0lEQVR4AeyYa2iOYRjHf/crp5iznEPti0P2RSKU40TLKXIYJSEhhoT5giTkVGj5MHPOlBaSIpqWcoiIohy3JUubhG1l7PG/9+41m7X1nKbV+3b9nvs53Pf1XP/7/D4RB5zmTIRm/osL+N8NGG+BeAv4rIF4F/JZgb6LB9cCLRXLLjFANKEFIyBHEd8QK8U60YQWjAAb+GlF/UlMEUvFZdFJhGz+BRhF+EtkieHimtgrRouxImTzL8AGOas6yjKlm0Sq+CnyRVcRonkX0E5R2UF7WOkGcUb0FNbseDiik4vikWgjQjLvAkoVkRXQQ2l3sUcUiZhl6KSLeCv6iJDMuwAbUJIOtvbnKU0Uf9tnXTwQl8QbEZJFcuXYC3ntIfe+yBa3hGadun6KNAZ+rILC7Xru8T11fda9jozH4Ja0oXB9OY2Wu6tx0kpd7MWQxvO6jSGWP6KKcW2zU2BrGkybrD+jDZROHAiXrsAmtUAD2Xw98iTgw0dISIDjByHjgEO3rv8K6dfHIUk1/+UrvHzlK8YGC7sQUOMn6zyc1RTZV7PLlAlw+Sykzq0tYs2y6NeCpanQOza91rgI7MyTgIoKw+KVhklawMrKIUljYrP2QBcyHfr3cxg7ymGjBm/GSViwAt4X2OU6sJhrOXIloFNHh4j9EFPt4tYdw7AxkJYOHRJgnLYPWUdhm6bW/EI4lgnZOeEFb8NwJeDATnh6B2ZMdTDGseWprDRkqgvNWQJ596KtkTgAXr+Dvr2qsoR6cCVgzRYo1X4n5xR8ew/3bzg8y3P4XgAPb8L0ZLiu9KoYNQI2p8Gc6VGhYalwJaC83FBcAsVaZdemQ7n6/9BBkKMdqJ0qW7SAV9o6rNeziRof7drC6uWQrbGRPCEcIa4E2FpMWWgYPBpOnDNs3wc7hE33HzX0HGyvbZ83PHxsGJls2H0IWremat04neH86XrWVxC4FmBfWlxig4Tcu1aE4fXb6HXsvs0T4+Ztw8xFhifPoUvn2N3gUk8CvLx+fbohZb7Rl+SoWC8+6ivTZALqe3kQ9+ICgqhFPz7iLeCn9oIo2+xb4DcAAAD//yMzR4AAAAAGSURBVAMAA7A/WFznyWoAAAAASUVORK5CYII=","ai":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAF/klEQVR4AeyYeUxUdxDHPzx0uVTEFKXiiUetAt4HMY36h1pFq1ZrLKmtYgsVq0apB3iLBx7VptFE4lWrRotaFRW8iGe9BQTFg0ME2YpVERa5Zft+r9ktu8sqEA6b+LLz3vzmN/Odmd+b9/tNVkrym699nZunFVf4mdvaRl38tRatJxtQTHyaNsptsPZKQ3eFBC9kxnrCVmCkLlqvverUU/t09yEDHGP9qhhLOTdvE9d/HHn3kxnSvxNxxxfg0c2Fil69u7Qm5rfJtFgRzIuIs7id3Yuj14iKwlRYX4qZNgM79w5KEs/3hdO0iT0XQv2Z7Tuo3GCzfAYS7udBxvBvsGrprARv85ELx8/dKTdGZRWlCfP3ssKhE87Bc0mevoTkKQugoIDgOSM5tm0KDva2ZrEb1LdWdPw0SSR+7U/LFbNouzmYkroq5q46xNCJG83aVtWEJIB+3X+ZgbtuU3/nBjQ34pS3oSup2Ij52NpYCTUDsrVREb3Vh+aLg3h5+iKuZ/YoJZP+5CX9xq1jdchJA/3qGigJCPB7SU/oMW038f4/GpSUs1ND2rVyFCoG5NLIluejJ2HdrpW+ZCLO3sF9yDIuRyUb6FbnQDqzZwY6EiXTtGUTSgJn0iUmHFUzJ/ITUsr0b1HHks7Xw5SSkWysSU59Jr8pFX9s8tXjCdwyjatQKDkGrcSYiqfOJXHSbNKWbyB5xlLih3lTlPFM71bw98ZOIcF7ljIn5vP9ZpvgCFy9UTUxkubPm5SHtIVF+hAEXx4boaM3qiZGqibcGoP9/yeQf3w/xuQQdYpeL2LonXmL7g/O0DP9CqrmH+pXVfBizv3qQTqGb6d74jkcYyNNcASu3qiaGGnAl+vRkaf3RtLlfbx968Zo8wuUQy268xBKCgpN3Gu1YNPehfyHaUS7DcZi7UZy8wr5/PsQPZ7ANTGsYoG+hDq0cSL6aCBeI3oqfVGc3B+JQ81xXwgPs0wTSEjJIDX9hXJ4iUMs+0o0zgELiAqZWKleqrJ5KQlMGOPBzSMBtJNXXvRDInjRH6mXLqT7D7vklS0wwc/LL8J96DLCTsci+h43uXmzdW3P05HeHBznWq5eynfQY9Z/m453v3iGdU0h6ItojixUs2Z8LGN6JSo0b7Qs93ps4l8nkLatHo8gK+1rpWREP9RqbSBb2vbBc/IWMrNydbomz2xNPiN9NuG//ABalUo51ITto2mL8EmNIiLkOxOb0oK6Vg2ZHniYLVsOE7ZjCfNmrMRzwiH8l5wndOsqQndsJmhNOA5NOpU2M+Alsfqi74kTJXM9lsahmxh1MLFCvcz6rZH0HbMWdUaWvqQ0N2JxClhk4Mx4UFxc8q/I0h6sXeHYENjdAiK/gnthYPmBMl9c9Fp5lnWTDEomaBHdpu6uVC9z7VYKbp8GESH3Q7qSsuvasSyfellh6cASdoKqIQw8AB4/QZuxUMdO0c0vdYgqglI3yXHOUfrY9KB9ZLbZkunquYLuOS54OPRVSPBCVgpHYUW5eco7meTiR51OMxVMZcLMTfOqGLLuQVqEvNrWYN8W6taDawFwfTHkpCqWmlxZT+FMb5KpqOYk9x9boLWRyyftBNRrDr1WgsPH4DodCp7DyVHwKp3s7FyzQdVqAinP65OZcRea9oOUw1D4Eh6fguwkaCd/Byq5pPL+4tET011Ql1EFEtCZVN0zO9eKJPk8oekAuL8djg+HmGBwGS0nkQCDDvBC3q5P37Ix67RWExBRxSemgYUl9FkDn50Hz5OQGQ9NPBAfdWz8XXIL6mLuqvUEwiKTUL+yRN3MB7XdJ6hzZF7qgNp+EGoNhJ+VS8xc9LK81hM4eMmSy5d+5+gD/qNES44mqoiOPcW6UI0cpvlfrScgQps0+yLOf28QrJ5aFp4gYP4uSkreHOKbZ/Vw1cuIj9nLP4YGKT8jUYRzdij+gXu4/cjurY7fiQRElJo8FV6zHnDqF1/G+J4m/pH5/6OEvo7emQR0Ae27YE1BcR3d8K3Pdy6Bt0ZspPA+AaMFqfHh+zdQ40tu5PD9GzBakBof/gMAAP//TWw4KgAAAAZJREFUAwDS19lHCruTrAAAAABJRU5ErkJggg==","aq":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEDElEQVR4AexYaUhUXxT/6aij/dXJf+WWWW6VRkFZEu1U9CFoT2ih1SJaoCKIIAr8EBWFgmVEUBEttH3JMtqRjChabDHLyiazHJc0naYZdVy659kriXlv7p15LwgaOO/ed+85v3N/755777njO2rb446/WXzxl//+EVCawPBQf6UuTds1n4HUuGAsnxCJnGVJyF6SiJWTorBrQTziwgM1HbgMpimB6LAANugkZEyMQp8eRqQlhGDp+EiMHWhC1uJETB4cBl8fIDTIIPv3utSMQEpMN+Rm9IdBAZFCKjO9Hwozh+LcxkFIigryevAEoOCOusRkSGwwaJA8VsGBBqxgs0ShNSGlO/wMbFp4DF3oaEaAwsQFvmLTmAEmKbR2zIvDiXXJWD0lWlFXrUOVQFJkEFLjQ9TspT4Km4QIz0OC1sv01J4SluhDlYCztQNbZ/VFZPcAVdzeYUaEeLkw/T0MI1UC7z834fNXJ86sT0H6yF5Q+k0b7tnX64oXFOCLhAjxrVaVADnYc+kD6mxObJgagzMbUjCqfyg1SxJh8se4ZBMWjA6X3r19pCX+wubFckvAXOXA7rwP6OgAYv43Yse8eGk2cpYm4tjaZOycH8/ry61eNAtFt0q/Kbgl0NoOTBoUBh+fTssAPx9pNmhxh7DtsLNVm2d1Y4swkFsChLj/6idsOfWOqrpKeW2TMD4XAaujDYWvGnHlSb2wAxEDOtgWj4tAKsuneO24CMhg9hYWT/KLTuWqydEYxnH2yO65CcSy5Gx2mvfbpexYrUwQOBS5CbSxXUjNqZZ9RWYbNxw3gVkj/szXp5GPYek3pSdUdyfcBMw1Dnyqb3aHp0l/v16B+M9o4MLiJpBfVI/5OSVoduofS88rbKCdj4cBNwECa2ObUFZ+BVV1EydbbJce1XHjCxEg1FKLnQrd5CIb/N3XVm58YQJWextKKx3cDkQVjSxVEbERJkD5yq4L5Th8yyLih0u35KMdeWwGuJR/KAkTILvXFgeOFFQh42Ap7r2x4nhhNc7fr8X2s2YcuFaJY7er0MIuQ6QrMltHCyworvhGZtziEQEZ/VWlHZuOl+Hg9Upk53/EzeIGnLxTjUM3LEjPfoE1h99g88kyWV21pMX7lqXuqkouOr0i4ALvZxPd5J6W26QbXb2t9We7qwrpzs16gRqr01W3aptuBGSvdCiZuvnJry7LdzVNaLSrk3RpyBp1JUDpwJYZsYp/djH/eFD2FbnsvkEhRO+ioiuBdnZoXy6qQy0LDUtD523L3tyOvId1uPbsC7aeNrM19BaexL5MVFcCdI+mbXHm3mIs3FeCOSzOF+W+lO7Ymeffo6CkAXS6y4PxpNSVQNcBUQ5VxWaBpGu7t/U/RsDbgSrZfwcAAP//PQEnYgAAAAZJREFUAwAiQJ4YMG2+2QAAAABJRU5ErkJggg==","ag":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEvklEQVR4AdRWe2xTdRg9t69t7bruwRwqk4EyYxadCmawTLONrIImBBM08ZElM0ZDRjRq9hI3szHdfERUMuMroDAVozIVXIygLshDQBQiYbqFjWFimA5X5rBsa633tNzudvS2vbe3f9DktN/93e8733fu79xfaqgwp/oA4ZIEZzc8Zc2BQxBwqX04M2c3OAxGMNBDgMkkbuQMoool5pCVTEfIpeaLJutscHYDGSosdpSbbQzjQtXKZNhlNDdfZ0TliuQgJwU+91hq8FprUCHOWmYJ8PgFkKhRByuN/+vDe8+mkc6P5bdasHSxxR/zq6XahlRrfHaVrEM+IiiA26HWSvOuFCAI07Y5fsKLFWVJeOTuwFNfVpKEyzINuH6BActKzKh90IZfBzzsG0T+3OAIwbVIgWQdKSekWq2V3BNAz6Z00Cok7L0w3Ct1qVhSaMTiG0xcFm2Ugs62wM70Dnr9a7mzBXS22+Esnt4h/40IX06ZdaS0EAFcVGOl0yM+dH0zgYNbM9HxdCpsKQL6TnpgNgvY+XaGuDsCKfF4pRXpaQZ/PDzyH1540oa+HVnIzzOiY6sbsXxonQbR5jNzA6yyVYd4KoVLlKWEhBs+cOOXfo9omxT0fpEFqyiCCclJgeEZy7G9w4EnREEUWd36D3y+8HnyGsZNF04dxnJcJIA3nRFOJZ4kdy21oLzIBL4DPvEVWCMOwrpZGQbMyTEyVITdFmj51sduHDrmhcMOLCowYpXTgsJrw9eGs47UIMAmXcl+lazk8QjYf3QKDQ/Z0N89C+cOZuOdFjvOT4hKZPXRwtJbzBj5Pgtn9mRjX2cG8q4w4uhvgfdDXqtkHSlHUUAkK9H7zoddWPvquOhzYMFcE5QsA4VPfp7J/16cHvGitMqFl951h81Uso6UrCiACZGs5BO9+/xGN5avdmFySt3TJzex+/AkFt4zin1HQo9W3iMiWYf3iYgCmDDTSmbx78JtC01orrZiz5Z0fPVGOiziqcNctSi42oQ3n7GjpioFxTeaRJ7pBxHNOlKvqAJopXU3rUJezXbMr/0Md7S+hsvvbcPxec3YMLwWld/W4f6dtZrw6KF6fDjZiFMFLch9oA13tq5Hft02f6/2wpVgb2lQpd+oAlhYMngE808MYMCTjc//XISP/ihOCLqGi9A3lYP8/n4UDR1j66iISQBZGvduguP8OMOEgj0a9m+OuUfMAhyT51D/w5aYibUmNu3dCPaKtT5mASS8ffAAyk/+yDAhcA4cQNmpn1RxqxJA5kRZSa11OAuhWgC3NxFWUmsdDk+oEMD0APS2khbrBCYBNAlg8YuHN6Pnvjn4bnVBXCBH28/vk1ITNAsQxsZw1esvo/SatLiQu74d5NI0vVikWYBYC1dXN8a+7mGoCaOffomz3bs01UpFcQkgydCaBnhHXQxVwfPXGfxe06yqJlxy3AI8I39rGmSouh5e19lwM6lai1sAu41uU2clWmds126Wxg1dBHCKWK2kl3XYk9BNQKxW0ss6HJ7QTQDJollJT+uwH6GrABIqWUlv67AXobsAJSvpbR0OT+gugKQzrTT6yQ7odeqQX46ECGADyUp+69S2cCkhSJgAv5Xq1iFR1pGexv8AAAD//0DKQxIAAAAGSURBVAMApUT9WQjh0eUAAAAASUVORK5CYII=","ar":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACPklEQVR4AeyTzW4SYRSGn2+mU4YOf6WUUmlrU6mpmvjDwkRNdKWu3NiFN6JehN5KtcYbaKrRuDEhalzUCtg2oQUsIAx/BUZYsIOUwkyUZEhOSE7OOd953+eM9HQjYYxzSIz5zxbwrwHaBGwCIzpgn9CIBo7cbhMY2cIRB4w/gZfry1gVLx6ft2x2d2fTCRiGQaVwTGE/xu/vb0jHNigefKOu6yMeS+920wVUMj8pp75Qz+9RP47TKOyiZ3fIJ7cpp3fpCOy9ynBZUwXUijmKhTzNwg76wScyPz6SSXymlvpAqyMkvkmtVBxu0z5dpgo4yX7FyL6ntL9FdW+T+al3hBxblBNvycW3aUmTVDOxPqsMlzZVgJ5LUa9UKep+vNohjapOo1bG58lSTB/RarlpyQFTz8g0AZ3bVgJXkZ2zODSNCUXGEBJCkpBkiUkFmpVDmn+SCCGGs7tHl9QjN1RKCMHESQpFLqGpR+RyGkiO9rIq+YIfT2iBCVXF6XYNNb9fk2kCOg8oM5fbBBZQ/FHkxSdkK7fJGQ9Qwg9xLd3F0BZRAtFOqWlxBgGnv6l653AGryF8EbTwLaYjd/Ct3MSzfB/ZexFv6AYO139MQAjB1NwqvqV7aME1VP8q6swKk/4I2nwU5+yF0104Y4WpBLpvd1x2n7tE8Po602uP8ISvoHr97e9BdEtM+5eevUpiZTx//cvS+ZYQMM3eAQbZAgYwydISm4Cl9g4w3CYwgEmWltgELLV3gOE2gQFMsrTkLwAAAP//FsgEqAAAAAZJREFUAwBE87X4P0JJXgAAAABJRU5ErkJggg==","am":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAh0lEQVR4AeySUQnAMAxEQyXMxATM0EzMxvzNxgxsFgLHUY6+Qv6Sg75346ntS55R4Y8PzBaIAQyIBKiQCFA+x4CMUAzIN7AfdyVPvgGxgtPPMTBbAQYwIBJYqUIiKtM5Bkxg27Hjvc5KHirUdm1axIAJbDsWA21UpkUMmMC2YzHQRmVajDfwAwAA//8c686EAAAABklEQVQDAGsy3PmURuo5AAAAAElFTkSuQmCC","aw":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACZklEQVR4AeyVTWgTQRiG387+pY1aIdhgCj20Vqtgf2hBUCwepEcPIu3Bg4qiR6UHRZqbFBSKPehFEQv2IPSgh95EQUVFMKjBH0xpFYVGjBWNbcwmu9l1dtNCQgMZCMzu0C75JrO73+z3PvPO7JLeGzFb5CAQ/GAG6Ag1QJOY07lNC5MihQof/PwMjQGZmzDWQkwAjZqE8IuHaE8nWZ/LLY8JIGIuIfj6JXYtfOEmjLUQE0BnMgEjlUJkJo6gKrE+m0teVYCATNDy9SMsXUfzW7oP1KpDuAhfKVJRjUzqEGpQ0KnmMZROIPxoupg/N4vBT4/Rby1g6wYFQcV7N8oAuupNDP2dwfD7aYxMXMC5kSPYd/E4AnMJOIdNXdh56SyORY8iOnYSw09v49SvOAbq/0GR6pwU7lEGoMoEqirDKpiwDRMoFADLWi3KtoHib/kePVnu8f4rA3i1SDAZaMX1nsO4cuYqrl2+h+djk9BbWl1dRNOQiI7jzuhdjJ6fwHj/CdwKdeFBNgij4A1EGYCrkja6aSGVyeNNXsPUxu34cfAQvUonva0dUx0H8ISEkFzMIWNUcMfN5NdUBCgtn6Ui59t2g6gqvnfvxW+j9K73/aoAjsR34W2Qmpowv6MbmTzdF85FnwQTwDdtM7I9e/BhS3Ev+ES7K4MJIK2b+Ll/ALObIu4gPzVMAIZl435zL/7k6KvVT+qpFiYAmof4EpCjbyen76dgBvCT6FItawmglNs//XUHvPaCxE73QeQQfwn13YxB5BDfAZHXv6NdfAdEXv+OdvEd8PpDVGv9dQdqncFaxwvvwH8AAAD//w7ZzIYAAAAGSURBVAMAUSkwt3gMbhoAAAAASUVORK5CYII=","sh-ac":"data:image/png;base64,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","au":"data:image/png;base64,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","at":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhUlEQVR4AeySwQmAQAwEj6tAG9Gn/f/0aSWWoC0EliUszkF+ycLN7DyX7U2eOcIfH+gWiAEMiASokAhQPseAjFAMyDdwPPdInnwDYgXbzzHQrQADGBAJ/KlCIirTOQZMYMux81r3kTxUqOzatIgBE9hyLAbKqEyLGDCBLcdioIzKtBhv4AMAAP//LWvYAgAAAAZJREFUAwBri/E55Ye3+QAAAABJRU5ErkJggg==","az":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACW0lEQVR4AeyTS2gTURSGv5m8TLTWVhc1LgQRVGKpa8EuRNwYbKsUQbT4QBGUVq34gi6sGx8otCAWQaiuLCIouIhFRFQQEakSpAXF+mhwobWNqUkTZzImU9oGOxHGuY4EZphz7+HMmXPO///3ylLkk8a9oZI1mRJ/HAD/W0BHAUcBiww4R8gigZZ/dxSwTKHFAqWvwJdDjQwfFGujXScZe3aDROQy307tEV6/cF6hCriWLKb8Vrdu3nW1uFdV49/bhK+xDtwu/sUjiyo6a+vm3ODXkOZX8n3HARK7W0ie6SB5tpP0zTu4a1YiLawS1W6qjhgAHvcEyz4vP9rPozzvm2ow6SgvXiH7fXjD68HrnQxb3oUA8NSuxrVsKUq0n58PHhsOJS2oJHC0Gf++nZRdPE2gdb9hntmgGAA1Ib2v+npA340W16IgcrCK/D3xrF0DOdWkinlGqaZisqlsq8mSNF1BVad9C54QAEr/G30EV2i5vhst6lCMbOwz6rv3E8csq6GNjBqlmooJAZB5+ITsxxju6hXox8NgBG14hOS5TlJd3SQOt5G8cMkgy3zIBIA/FE+NM3aiHbJZZrcdQSqfOyNZmhNAHfxA5m4vZDIzvv9tQAyAXHelL0q8fjtaIkHF0whlVzsIHG8hcKwZ35Z6tPE0aLlEwa8wAPm51LeDxDduI97QROb+I5SXUVJXrpPuuQ2KmEub71No8qZWRcsZIq0uPMCGYA/hUC8Nu74Krf37nEIVKGTGLt8BYBfTxfo4ChRjxq64o4BdTBfr4yhQjBm74o4CdjFdrM8vAAAA//9yg6xLAAAABklEQVQDAIPJoyUZ3uQZAAAAAElFTkSuQmCC","bs":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADIUlEQVR4AdSWbUhTURjH/+dsu7FSG2RE2KK3L1ppCVJ+SSp6kQbKyDSzV6koiwiJCtECQaEXStMPRUphRFiJTYzqc32QZUELM8Xal0yMkD5o2912T3fXXcaw2u5279wuPOe59znneZ7/72yXc+nCzVun1nb3/sof/DKRjEZ/vrUbHcWWNHtLs+n9lCvpjAIM/svb0gS3ZRt8vTYwQfCHksJEgKBONjoKT+1F8OW7IfTbgxMJfBcCIOtkQ5/BHz0E/kI12Nh3OZyQ/q8AslLh1Qu4rRZ4790F83rlcEL5/wJISl0ueJtvgK+sgOD8KoUSaQgPEFDLHA7we63w3m8H83gC0dl3EQNIUt08vE3XwVeUQBj4KIVme1AGEFDLhofBHyiD53IN2I/xQHR2XFQAklSBwWfrhrtoJzytTWCTk1I43oMIMH2QRd3Y5Yav7Q74/XsgOD5EXSbaRJpK1Nk55nTCe7gMp9uyMLEgC78z4mPiLxAt+8w8QSC42kqwPA942DVzXouIqgCywLFxgn0nCDYWAn39clQbrwmALLXvHUH+LqD0GDA0IkfV9ZoC+KUyRtD5jGBNAdBwE/D5/FH1THMAWarHQ1DTSJCzBRhxytHYfdwA/FIXL2KoPQusXOZ/Useoyx3jORCBDkoZTlUyDL4R34fiCBIULKFuN1GwXPnS3GwG+0vgVgOQlqo8P1yGgr9QuFKh8/PmMlypmxafmx06p+aTJgCW7QyfXgPnqgCqSYfgFqha3pzB0NPhN8CcEWyi5Z06AHoddAePYLyzHyWrB2D8Fj+jse4OyVkH7lEXDGeqQYzGWMspzo8ewDQf+kv14NofgK5YpbixWgnKAQigK7ZiTtdz6IusIISopSWqOooAyBKztOOGunoQkymqhmonRQbAGaA/fhLcExtoznq1NcRULywAzdsA7rFNBKgC4biYmmmR/G+A9HQYGq+Bu90Oal6qRW9Vas4EoAS60nLxJe2FbkchEv0KASCZmeA6OmE4XwOSkpLo2iV90wDiAaQXDyK/eJqZJU0ky0CNmwrYnKc90IufAkTrLy8NduUPAAAA//8Twr+JAAAABklEQVQDALRWHR8+J4FIAAAAAElFTkSuQmCC","bh":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADTklEQVR4AdSYC0hTURjH/85X5kxFMc0ylTIfk5QUNJqG9hCzhyHS+4G9MMqsCAkVwigDS4UsEswiFAopgxSsrHxQppaJ85GFlW1pQ5nmzObm1u7iztA429Jx7y4cztn5zjnf/8c5++53D0dFeGS9QpUw/aKq1TNE9dbRh5WFA8Jjtcgd7llpCOysh0deFmwCfAmjmTERAWhJZnOs4bQnEb51D+FTWQqH+FjAwoI2M1pzDPVuG7YCXkW58Ksph4WLs6HTZ328wQCyni/oTc1AV9RWKMQDsy7I0AX1BpC+bELP9iPoCFmHwdv3oJKNG+rLKOPJABMTkNyvxPvoBHyI24XhqudGETGTRYkAI/WN+J57Az9b2mbiw6hziQB2keF/Ik/VXTgmbISZpaVRxfzP4kQAekHb0CB4FuaA11EHt7MpsHRzoU2M13oB0CotnBzhejoZvPY6eBXnm2YYBfXHLnuE/rxC0wqjSukoxAXFEARH4/OhUxhrbac3htFa5xGS94khyryENl4ERBnZkAv7GBU81TkRQFrXgPaQtRBfvQnlD+nUuaz4TQTg8sMQKKjBgsyTsFzoxgrBU0UQAajB5o4OmH/iMHjvnsH7TgHsIsKpbtYUnQBapRwO7DeswZLyW/BvqoJz0k5wuLZaM1MN/QGYUqjDr/4ASiWGK57i45Z96Ahdj4GiElChVcf6RjfrBJiQDGkSOkFQFHp2H8VI7SujizLEARGACqNtvEh8y7oCuZBd8Z+GJAJQYTSg+QlcjiWBM49Lz2FVTQSglFKZp/u5M+r3QS3cz6ex7n2gE4CCoAoVMl2S94PXUq1OrS/DZnkA1c140RtAq9TcXP1xEwfX4wdML51WDErQn3MNggA+PiWlmk46PdrYokmhBf589F3IB5WhaneE4QbxCEnrX6NrdTy6Y7ZBov6IUcnlDMud7p4IwF0ZCteUg5gbHDh9Jkt6iABQJ3DUPeiy6jIsrSiBfUwUS2RPyiADTI4DNzwE3qXX4d/8GE57E2FmbfWXlbmm3gC0RGvvxfDIzYLvCxO93B1teKMJoZ38TaYTRlW/ZJoL3S7+ZnTH7sDQg0pAoaA3hdGaeITGv4ogSs9Gm98qzZX6WHsXo2L/5fw3AAAA//+GG24YAAAABklEQVQDAAyCXZt2zXLtAAAAAElFTkSuQmCC","bd":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACt0lEQVR4AexVS2gTURQ9k6T5GNvaUiSurCDtRoqK2JUIrhRrF0rxg2uhdSO4KAjiLgvFjSvRpYsW1wVBs1IRKihiXbQpQgVbG41d2LT5TJLx3kkH2nTS3Jk3TQlkmJeXd+ecc+95780bH8aGjWZuPjT51TKw1wvYWoGmX4FO3cCNZR2T39bxeXoNv96umu3TdAYTM+u4vlwAY3bLqOstdDBfxqNkDt8/rOLZbA5D6RL6smW0l2G2/qyBS39LeD6bNzEP53NgjtdGXBm4kNbx5eMaRpd0hA2tbk2MGVuscIaIW5fgAODIgGYYuLeQx8uZLDpKDrJsQJkzQdxx0mCtjbBS58jA1ZROBgrQtPqzXqsqTdNwf6GAm/TewINLbODsShFP53IepKxIPKH359yKXhko/IoNjC4VEBDsd2ktbaR1i94hKb4WTmSAT4+Lf4q1NFzHWTNGp5lrASKKDAyni0r7nvLY3pqm0fFbtH0mDYoMXPmtlmSnYlS1RQYGMi7OzJ2q3vRMVVtkIExf1005Pf2rqi0y4GnFVWI5xQpE9FTQ/Yerqt5tw1RQVMI2nhUQsb+2i2CWpqM+GVWbHFFl7zr9ABzVJQYnugJirB1QZCDRrZbELrEVe6OoLTIwF/Uj0SWCWnWJ+qkeP35E1HTF7PGjYeTVtusWU6x1lzS3BF0MxAZ4Fe70hVyksKfc7g9hMSxOby9CUUcKLw4FEe8NEk3tfnAkiMmYug5X4cgAE+K9IVw7FsY/FwcTc0aI+/iwdyvp2ACbmOppw+lTUbzqlrtgrMkhLmt41VwZ4OQ/6fQYGdiH88cj5rZ6TWaSFMv4DXCbj2jgWJy2HGMYyxzmetlcG7CKeH8gQAZCuExmTg5GETvTYbYTg/vNWJy2HGMsvNe9z2vBRuu1DDR6xqvztVagekYaPf4PAAD//0tO46EAAAAGSURBVAMAPO8HqDltBvcAAAAASUVORK5CYII=","bb":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAChUlEQVR4AeyVTWgTQRTH/7ubZNNYI02JXVOrVDBgkZqDilXwUhTrB/YoKnr0IDkI1h48FI+iHpRa9OJFRA968iIaWjwpVBGFKqixWj9AW0rTkI+Nza4zK0sTCAubeYsIG/I2M29m3vx/781kZSRHTBEznyVNERPZm6+V8Z9/fIB/XUC/An4FBDPgHyHBBAov9yvglML3X3T8nF9ymiI85mkFrt1fwNiDBWGRTgFIADKTBUx90uv24Zm/9TDHAHIolo26sdcfdEy8LNb5mu2QAERUGZuPzeDg2e9YLFQtLekrv1BiTHM5A0Ojs5ZvfrGK/vRXpE7MIBZVLJ/ogwRgZ28LjuxpxaPnBegVk5mB2yMa1mkKerqDuJyOo1o1GZyB8RdlnBqMYstGVVS7tZ4EgEcaPt7GREq4l8lDDcmWSZD4EFpUGYoi4e7jPCTJxDk21xogeJABpJJh7OpVkZmsOdtMv8zM1vmE3ZWBvhXY0BmyXcK/ZABcyeHdrexylnjTMq5d4g/WK+sGnr4qYZDNYV2yLylA/9YI8kUT2W8VS6Atnnfefa7AMCQM9EV4l8xIAVLsYoaCwNT0XwCu0oZ4ywC0dhlrV7MJfIDISAFkduA74wGcuToL7UAW0z+W8ObjbyQOZXH+xhzWtAeIZC+HcQGwvMiptW9HBOu1AE7uj6JtpQQtJuPo3ii6E0HwI+a0tpkxcoCxoQ6Mj3bh4uk4YqsUaCzr/D0wcb0Ll9j7oBmRTmvIAWo3439A9h2o9VO2PQUAJ6BU2yCWpwDbN4WxrSfcYFs6l6cAdy4kcHO4g05tg0ieAjTYj9zlA5Cn1GVAvwIuE0Y+3a8AeUpdBvQr4DJh5NP/AAAA//9Aat0fAAAABklEQVQDAA6L8Xmfo/FYAAAAAElFTkSuQmCC","es-pv":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAE/klEQVR4AdRYXWxURRQ+XtvtGqNLkT5ga2t3BX9q1BBNUeObaKVpLV0ri9tnpLwImqCx/GprjMbIUxv1wRjbQkEBW4lU9MUHhIQ0JFD+2u5SaIGktKUlhLYUlvkuvTezM3N/9rK00OR0Z86cM+c7O9/OzBmNfipJ8BL+qDjR+UJBoqso37MMbPo0If4NbFzneT5gAaZKho3HirZGwt/vz2dTZTRIZwOZwsjsdYEFmHYxbCIKKQEYnJmbRcuqQ7RvwaPozqoAA7AAkwqI9lVHP2VN3ZTGxjM1+qQ0jza+OZ8mHnxAGr/bCsTcwGIDA7Co4n29b4C0d0+M0c7mGAWHJ1Q2NBuUsqMMQD7JsP75Sw+VnRwlnUKhkUk9iaVMAQNRsHxYRiynOJbuPmIgFmKq5l7WNUK72BdeyDBjXE8ADf+NBH3LlqS+Y4Aempx5SoEy65fM12mrooyP0fy7vf1Ut/8CZTGswAwxE0AHUnFilFq3xyk4NI6uJKBUJFKY1l0qnu2j91cU0u6ibCkeFE9dGte/9ZLuMXSTREoAoyHGsZ0tcbKi1Okcf9p2KVAGW2TPPD9CS1J5bIR2bIuTQRnRQJkAjNxSCjsFlh8+qQh8DMpMZsgw/NdvEijz5T/JlBFjyJ6ChROlcLhg+UEDwdWyC1v42FFmd1MvqSgjTuqYABycKIXlBw1AB9jbCWxgCx+VHXYZUCZ/9LpqWNK5SgBeTpQCDXDogBZTinNvikWqXfK4vsvAFnPyYlBG3GV4G1WbTatSW+t0Sm2LWR58oEVjcY40QQPT7SmaI+mhwMHkljKw5yXlBOCsH3wtvVR68jK6kgw9nOFKB6Mw22VwMLmlDHx40XJWryUv8sTKtfRzcDn9FyinuhejtHlRtSllBcV8DL1dXrDYHIdt3UtROvBIOTUujFDeh2s8YQBulgCcvcsbVTVU+0o1bVoUNaUsf7EOmv8HHW9T+3I1vbq8hgH3Hjtn9ZrbdyE+0P3W9vQbuJeSvP8TGGzYSnci/7c2Ut3hJtrS2WxK+9mD0iJBx9vUM58DOxrvKDZwa4MN37NJ3EiyTf8PW2lldyu9dqWNNhxpps2dTaa09x2SEmjrO2iOw3Y983l9rI1Wnd5O535MnjsVTJ4ohLsMrgNWB9NjV6ekBOYpdDDCXarqgxD1zfGhm7KknMCeZwNUtSJIdhVTzaFBCcgqprO6nsfYI0KYvYTsfTr1RwTXCeD6+/HSXKp9O5eu+WQ3vmLKSEj4KZMVeXrF97e64rvGHhHWvZNHuJ6Pywe5POG0RkYyPcB/GJTpWBjg1WbbrmIyjaYbFcdR8cUoNDQxrUn+AKUikSCjVGbygEXPMQHj+mtFGaeKSRU3NDzJqqxequhS36W6WXUWjobIDaUsEwBlPn/L+frrVDGpEoDOz37n9fvP0zd/qd+l3FJKmUDPXJ/+vPjHc+rr7wJWZHu9/gI8L6Wn2LtUS4wwJ6832k6UkhLALgMOWlEG199WVmR7vf4awPhPUApzgo683mjbUcpMAJSx22WMiukLhyLbCJrqJ956QEcU8ogl+ltRSk/AaZcJsTeidFFGBCb2UcgjFqo0cQx9UIo/+LT2ZwIUZoeIFWXeOzpMbb/GKJ2UARA7QSxUaVaU4g8+7bOSXJqweZfZ8u9Fu1h3bcwtpXQKiShmkjJibLHvRCkpAVDmt+b4jFJGBC327Sh1CwAA///jElrIAAAABklEQVQDANiaU7D/8XolAAAAAElFTkSuQmCC","by":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEs0lEQVR4AcxYbVBUVRh+OCy7LB8LLCDCwroIG2pUUzaM04cRGYOaZcaoGGrlxBTShAQZDOFIDGQQ0oTUMOOUQqDG2IciDhmZNY3DZGIZaSu67LKgsiywwC677O7tnNMMv/nnOTPnvfc998y9z7nvOe/HQ/rTs6Sx9q+lvsTlknvIIo2f7pKsLW1SX1Kq5Bo0S5e1KdIfMTphOwnUJ8G0txzh67JwK68AioR4mMv3IyzzGQy+XQxZVCREbmTq/C8IX58F1ZoMuIdHcCu/EOpNLyDs2QzMGm7AYx0TGT9IyKo0TF34FSRICaJUIrGpAfafLsBPLocsUi2+BVzmIUQ8vx6DhSXQVJTCOz0DVUY6TCVl0JS/J74Fgu5fTrfQWkTvzEVA7GIEpugR8eIGRL+6A7JF0eJbYPpiLywf1PDtYty9B6biUgxX18FfFQqme+1TELkRf5WKbptpyLUJ8NhsYF7J53RAHq/hOlEoRMYPwoDGlZbA+mUL9MeOQp29CbGFBbAd70By+xGhwTNwxGu3Y/zkd7D3/Izp3t8BPz+MHvkKk90/cjfqc7kgciMkJBgTnWc5xpHag3D+dRXTv138X/+onp8FrggqyEzvJZDQUETQ4OWdtMNIAxnDGpmbA7dpSHw3ys6Ab2oKMfl5CN+wjmGH7vNPIU/Q8ODmTy3EBwUVRPLMIXLbZihTV0CZch+HqVymR1TOZjq+hXqoGT4mqiBBDz0Ibf0BvlVuN34G7cc1GKqo4kEsvmqf+IFssvsc/7nmsn1Qv7QRsuhouIxGjH97Gq6Bm5izDPPnogoi12hgyN6GmUuXwaxBlIFYlLcL5rIK3NyVD1lUlKjYOS6iXLEMJEAOXWM9lDQvunOoGeFrMxGVu5XmQ9vhp5DziaIKIiqwheIizv5r8M25YSwogvPvfxCzOw8TXd2wth7D6BctkFzuhb7rnswjbosF+o42BK98GI6+K/A5nbjbfBgJ1ZVYergJHqv1ngBb6EdJWOYaPjehej9sNCfyjFqh0OkQsfE5KJKWIkATx58DYl6I48qfMBXtpd4mEosL3oTpnVLEV5bDc3cUQ7S494heE/vJAjDWdgLOq/1wXv+X/2bnNQOs7Sfo+HEIn0pQLognc3eamjFx6gxfgPGNt+A2W+BzOPHa41488nq4sJ0Ep60ES+ZYTeAfpoKOshJsFWOt7ZBr46kFgpgqbCc+ykIwXoghjC3ZA+UDqQh5bBVTEftuEXyzghc0rCZmtYAq4ymEpD0KSBJlKF7mzFygPhl+MhlfjKiCsDMwXFOLqFe2w7B1B2wdJzHS0Aj1lmzcyNkpKu55XLwm9g8JgdtkhkytpnXwAIgyCGxhTJc8nvnJIt4QRi1q3i+FZ8wG3aGD0NbVIK6sGF7KBzGdBCpExD2PiTho/jPR2UWZiFbMjdzG7HUDxr85RfOgozyY+WYc85NFvCGMTh//vhNLGmphqayhbjOYUiznoa2thqXqQ5DgIBFxz2MijFoMXf0ED1oskWP0uurp1ZDcbr6thLdAaPqTYLyQ/VwP5HGxnF5nSd3kDz2UZkwW3wKzhgFoD1Rh4sxZJDY3gtHtCbSYn6TM3JJP6uAV/Az8BwAA///oO7DEAAAABklEQVQDAMHjNhk+QLVBAAAAAElFTkSuQmCC","be":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAi0lEQVR4AeySwQmEQBAE9+5tAIZh/pkYhwGMptAUjQglzG+6Zar2v9ZvyMy5DZlrP4bMc8D69OcBb+vTgAYgAZ8QBIjjGsAIYYEGIEAc1wBGCAs0AAHiuAYwQligAQgQxwMD+F+VAg+oYA1KNRDAqqxqoII1KNVAAKuyqoEK1qBUAwGsyqoGKliD0hsAAP//GRXn3AAAAAZJREFUAwB3n2IZhWWtYwAAAABJRU5ErkJggg==","bz":"data:image/png;base64,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","bj":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAm0lEQVR4AeySwQmAMAxFQxfQVVxDwekcTbz24BiC9dpbkG9ahFcI9JD8tu81TZuVr+ra7SyHlYZ1J/v54gG9BWIAAyIBvpAIUB7HgIxQDMCACFAex4CMUAzAgAhQHsdAjTCvo+WlYc2DYaA20GP/wkCP6/ln8gCfUWwHBmL5+ukY8BnFdmAglq+fjgGfUWwHBmL5+ukY8BnFdjwAAAD//ypymJQAAAAGSURBVAMAr6GXSUrQsIMAAAAASUVORK5CYII=","bm":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAHJUlEQVR4AeyXC1BU1xnHf1xgBRZEI4iP8REfMSiigIJRM9oa6zRtY8dOxKBIquKzGp1WJ9FiQjKKRo1ipUbqAxI1kVGJFgUjRbCCYkEjIPKOsMhDrVgewrKP23vXsIawi2tGMJnxzv3uOft93/9/vu+ce8/5Viha+J6oq2sQtVqduH79CVEQFomwsJU0NjaLOdPmipe6eRrkG9/ponzZ2y9r5Wdru0TcFX5WLHt/u5juNka8fegr8arLiA4VoeHaDa6Nn0FT1g1CQ98gJeUvuLk58aTX4MGuXI5fxOS4aO4ePY3H15/hGjD9SWme2F8QIrbh/Kov1381l8qdUUycMJicnA+YNm24xWRvvTWWC+FT0c5fhuBgj2faMRw83dm374LFHD/WURgzYRtnPKYwOHIj5Zt2c+ONYJz1auLjV7B58wxsbASz3F262LAvMoCwgTWUBr5D76WBuMfuQaOww98/kgULPjeLfVoGQa3WsnTpYYL2FTLg9Odo7t4j65UZ1J67yJo107h06V2srKxMjnfx5Hx8D+3mzhcnefn4p/Rds4j8gmpGj/6ImJhMk5inrTRO76lT2Yx+fS+1Gzbwwu+mkPeHJZSu3YK3Z1/kmTY1cMO85UjZ4Zl6DOfJ4zh4MB05+Pz8ajrrEkRxDy1SUfExE3/pzos71uNXc40BG1djZWtjNhafwmQ8zn2Bok9Pg8+cOX40NkbQwie3BkMHPoTc387DEmnMLTSG0ayqtAgj8xpBHdQR6lIzsUSks8IYgr6xySKMzGsEdVDH+A10EH8bWr0oovXxQPQdZbHI/jKuDZmkEJwm+GCJWDspJfeHt2BvZxFG5n2IePRsRmTQgR2MiD3QSlxClqMd4sILywNb6WW/QdE7UUu4RyyPesLwuP1YIvbDhxpRin69LcLIvEbQ9zq2trYoFAqjoFZTHRLCzaNHqdqyBamuMdpa/L4Hb9UVrKwWSTvhQ3F0XM7hw5cNDmKTmuLF68joPx5pWzHo2jyk16Fi+z7Se3hxc/VGoqWTV6qPjHwydxuMCUV1WhrNKSl0qahATEri1tmzJrxMq4zfgLt7L65eDSEgwJemwptkvfomD3KLcDq4B3WzziS6oLCaPqvm4/GvQ9TEJ+MdFc6V+GCGDXMz6f9DpVQQGlS6pibuazTIm7FG0uil1ZEaad6kWlHutCOGBObNG09m5jqGDu3JncMnyJ7kbziYcha8g8/rkWaJ/Pw2SSduBsrRww31j6KPG/VzFpMSNpGZM33aGRZ0Oh2xIZvJif6S8n8e596LUCUh8sY4UBh3gitRX3Lygy3o9XpJa/4WoqLeloquIOysRAr/uFp6FcIY8LdQNtzvR0BQNA0NzWbRchni7/8P5s+PRtvFnmFHdtH//ZWULl5LmFslBz6dRXtXcldHDn19goxxjqQuDiY1LICMmXPJesmF+FM7SLKzMTt5LbxCUNArNOYVkzXxTUPr9NnfeS30Mnv3Wl5J7t+fxqhRH5KfX4Vb8Cw8Eg9Sez4d7+hdLeO0aeWZ7ap8gMukHuhVOdSKg7hybyQ698UUDZlJ/qyddHdVPD6Bu0fiyJ48C6XXcK4vWsWY6QfIzr7VZsDHKfKl+keug2JiMnAY+bLhlbIfNsgszFqr5ddCDc61KZSW3sarKR7bu5XY5abjZavBvXgrvxHvYC29amZJJINQ/qd3Uegaqf8qDvfVS7hgf46rLqmtJK+fF5rMTLrY6AwilhTxjasHacrkVn4XHVN4adnbBlvWgLE0xMVLQ5i+C8LDebB0E5r6+wzs35XbqjtY55yhImYDipwkulepaFj4IQUREaYJvtMaPuLv+p3WNNXWUhIVRdWKfvj9Yh7dXAdSd0+PQ2MVQtP/UF37N96BW1AF+/Dt/v2o6+vNxvZMElA4OuI4dy7iyN+jcw5mwrSPmL36OPZ2zqyMPMPs9Xvp6zYCq/FTcQgMRKFUPo0EzHI8kUHe+1X1ZXiuWoKX7xRKvk0k4+JeevfuSVhCNr16DyI9ZTMlJacptrtF2VRXMiovm/2YO30FbKR/d2EJ63kvYRXhkWvJ2xlMeUYy2SUq9GqRvOJ8ajITOfvXIK4kJrD1/AY+SdqIjDM1U52egK2VwOTr9pzPTUZf2FU6vby5UFfM9oRJRMSGsC3Rn3O1Kqxv++BcPhBNo47pOd1RSLifRAJyEGNj8lih8uTGa2pi5zhQNrobNb16kKA5xX97Kijx7s7x2UqKp2pYWeTJmONFMsykdPoKtEThd6yErZ+oCa7shrswWNrvrdFKZ4O1zhYP6yEskfQfb9My9mRJC8Rk+8wSkKNRaq2YcKSQP4eWE77biXX/GcHOCCWrQlWMO1KAUiPKbu3KM02gJTIbQaBrnQb3pDKcGjTIv1tsj2t/Egk8Lsj27M8TaG92OsP2fAU6Y5bbG+P5CrQ3O51h+9mvwP8BAAD//0OSeGsAAAAGSURBVAMAw6eH5jMGKKIAAAAASUVORK5CYII=","bt":"data:image/png;base64,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","bo":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACgElEQVR4AeyTz0sUYRjHP+/sruYPNBtYtc1dxaVSg6jtECKhghFIlzp1CBT8F4KuWYfAqJNIEJnVJSpKJbqkFpRInSrUoNjAQmkjrLXZXXV3pvGge3J3X2aGEOZlXmZ4n+/zfZ7n+31HmW0JGjt5K+zw5Q7wvw10HXAdsKiAe4UsCmg53XXAsoQWCXa+A83PFnBi+x9mecOj2W+7azniwM+EwtiXLPWjz2Uk0xbvyjbp2SrbAGSPdR0G77Xx/VUPE9O93B/tJva2j7tjDSQTHlm6vHhbB9CpJp0K0FO6QuWhGUZGnhL9+o6oOkHX6Q487EUXgbxNyQBsGyAtmoh98LJ4KUWJ+guj4iwL564zGblGQ+0Zds9OsdSfIDaXYV0clukxJ9a2AbzGPMnxFIpfZ0yt4qOmMPDyIgMvLjCXgOerCqLKID2j4TPe52xKJqjIgPNhjbhJF9QZj7cSSkzSHWzkfCBEtfaaJyvtiJBOerEoH41U3Kwohd8WbKyBrhUhig2UtR/cWA4TUuuJmhlDy3Xoq+a12mWwvlQMGfPQpse2AYTX7EiA+Oalf9cUHrWDmqqDNJdX4NtzgsslkygLHoSJMf9m7FoSA+QpaTKVhhMYGYXKTx4Gp6+gx6PUVdQy9OYq5fNFGAhKDyTzEMmFzbJyCbnQal8c0ZVCtKcIH//N7bIH3Cp5TH3bHzydSfTONdTeeC4K6ZitAxSXZahp1Ai2/CVyKoa/NYW/LcmRkzH2NWkE9mtsYKS7zJGgiJvHsHP7hiNbfMqdCBt7k983fHQrtnlm9W2rAzmEcizkDuCYtAUSuw4UKJRjMNcBx6QtkNh1oEChHIO5DjgmbYHE/wAAAP//wS6sgAAAAAZJREFUAwCOOnuYoAdxawAAAABJRU5ErkJggg==","bq":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAiElEQVR4AeySwQmAQAwEj6vDly878W1f1mI7FmAh2kJgWcLiHOSXLNzMzmvZ3uSZI/zxgW6BGMCASIAKiQDlcwzICMWAfAPHc4/kyTcgVrD9HAPdCjCAAZHAnyokojKdY8AEthw71/0cyUOFyq5NixgwgS3HYqCMyrSIARPYciwGyqhMi/EGPgAAAP//ExJk3gAAAAZJREFUAwDE3u15ClNOPAAAAABJRU5ErkJggg==","ba":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEEElEQVR4AcyZTUhUURTH/05QQRGkLRvLEaPSytSFSUS1kSgXZZn0udFJy02rhMrsaxGJCi2isigFyVTIwp0KfuNXYCmaaIWaH0l+jorazOue+3xvnunUTDPvzRu8l3MuA56f9577v+doAJ4INMbG5gT69PRMcJ/WlCPdfEwQmqGL8e29nxSjjQEAR44YUVjYg6Cg12hqGsGePb6gz9Gj/oiI2EQm0p/G4MGraG7raeIAlZWDMJur0d09ifj4cnR1TfAY4+JMiI01cZum1EcnkJ1/mEzdDA4wM/NLDmj1agMePoxkZ8WMCxe2ITU1FFZrIu7ciYCBfftq5mldQbCQ5Ni5MT9vQ0pKLW7caOI+TZcv1yAtrRk2G3mAniCWAYghAibTBjQ0/EBb2yiMxvXSspwfeoFwCFBe/h2RkW+xa1cRWlt/ygB5efYc0AOEQ4D8/G456N5eC9LTw5GTc4AB+SIzcx/3g4M3ev04OQSQo2cGHSWLZQEXL25jHpCcvBN9fRa0t49x35s74RQARZmR8RFTUwtkYmBgGs+ff+a2NHkLwmmA6OjNKCr6skzsYmMDsHu3KHzegHAaoKpqcEWxi48PxKlTdrHTGsJpgNlZq3RasGaNAVlZUVzsTp40Mc0I42J382YYfHygaWI7DSBHz4y5ORuSkqqZOrcwT/xJSKjC3bsfGJToa7UT/wUghggEBGxAff0wOjvH4e/vHbFzC6C0tBdRUSXYseMNu1JHJS7k5mondm4BFBT0yEFLYvfs2QF+K2VliWIXErJR1ZxwC0COnhmNjSOYnJyXxS4paSf6+6fZW0pdsfMYAGNgT4xPIMUme2hohj09OsmUhxqJ7VEAErvi4q9c7OrqhuVq7vjxraq9Yj0KUF09hMTEKl7ZnT1bwRJbPD5xcSR2garshAsA8u93aCgrOxI7erUKgpmVqYG4fn0vF7tbt8I9KnYeBVCSkdglJ9fg9u0WeZl2h3xBEJc8kROqAYghipWdJHbKyi401I9/xV0I1QEciV1e3iEOQJM7EKoDKMWur2+aV3JU2YWE+CI7e6nYvSiJIh6XhuoAymj+rOwuXVoqdgn3zsNVCE0BCIYqO4tF7ENRZZeTYxc7QTDAVQjNAZRtTNqRsDCxdRkT44/w8E3sOe4ahOYAyjbmmTMV6OhQip1Y2bmyE5oDKMWO2pgZGWIb89y5IFy7Zm9j+vg4txOaA1AeSIPamFeu1LKbyS52JH5pi21MZ3bCqwASyJYt63kbkyo7o3GdtAwSu39B6AKgrExsY1JlJ7Ux165dhZcvD3KYv0HoAkDZxhwcnAG1MR8/3s+e4H6gHCF/+3bfFa9YXQDwP/PiRHWE1Srw/03QUkpKMK/sOjrG+RWbeJ+J3Tu7Yv8GAAD//492SegAAAAGSURBVAMA8bdUs8QWiF8AAAAASUVORK5CYII=","bw":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAfElEQVR4AezT0QmAQAyD4bQzuf8COpN1BglHCfwHeezJ5auteyY5rfDDA7YBEUDAbIAVMgu0xxGwKzQvyBeYS0pOvkBVq4LT5j+0Ps4DtgkQQMBs4McKmV86NN4zr5KTL1CPlJx8AYUfBLYBEUDAbIAVMgu0xxGwKzQv+AAAAP//+Ao4JwAAAAZJREFUAwAC0XYI556qoAAAAABJRU5ErkJggg==","bv":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABNUlEQVR4AexTMarCQBAdtv7Nb/QIRmwFLbXVK4gK2lmIJ9ATCFYewNrGC8RCbESxECIWFqIWIiKIIoKsWKQwW+jMQEJgFl6Rzc57O+/NKseyNAanXk+/lz3daUh3P1Bvj96/9MW2UZwYfe9ZBSFf0kDQAUoCkgDTARkhpoHsckmAbSGTQBJgGsgulwTYFjIJlOU4gMF/ofBV8i+TQXFi9L1n1XC2Bwrmq6PRyPZwJXFR9N0ala0NgIJGZ2w00B+uSVwUfbdGHrERg88b4U+gWUnCb/g8V8rFDK9TiSiJi6Lv1qhWNQkUlPNmA+lEhMRF0Xdrwj9Cy3gcMLgvFsboeDee5zNsikVfgE9Aa+99jW/9eMBtMvEF+AaM6wa7IQ0E6z+AJCAJMB2QEWIayC6XBNgWMgleAAAA//+BHU6eAAAABklEQVQDANoBQdHm/8SiAAAAAElFTkSuQmCC","br":"data:image/png;base64,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","io":"data:image/png;base64,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","bn":"data:image/png;base64,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","bg":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAgElEQVR4AeySwQnAMAwDUy/cVfrrAp2p67QrGIQwIhfwzxbkTvWFv1rhjw9MC8QABkQCVEgEKJ9jQEYoBuQbOO5zJU++AbGC4+cYmFaAAQyIBHaqkIjKdI4BE9h2bL3Xs5KHCrVdmxYxYALbjsVAG5VpEQMmsO1YDLRRmRbjDfwAAAD//7S3/JMAAAAGSURBVAMAnppSyAZLtYsAAAAASUVORK5CYII=","bf":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACiElEQVR4AeyYz2sTQRTHP02QJCYHtVgrVDwKngQv/kI8RFtBQdH+QDyIV/8AD/74AwTPUsRDEQTBmwcVlSKoiPGgl6BFPVjaQ0ur1hbTaq3vsV02TXc3O90dQkqWfdmZN++9+X7nvcwsm/oCla+w1KySosmvFoFGJ7CVgXWdgbY8qGDxslpCG4+DikX8WCVQOAsqTUmgrSCrf8wRbdsiYS0DhdMCeYMj+VPytHRbI5Dv9RDbLCMrBNIdkDvsEcgdgdRmr59kywqBvJZPugqmtPNnqvoJNq0Q8CsZP10SPIwIZA9C50PY/ihcMvtWQ1Pfen4aO3tgtW+YxohA5RVMX4V0J2QPBUvQhGE+GlNjV14HefvrjQhoiIUPMLYfZgaltyQS95YYM7ecmBrbNFxqYIhM/xCYSJ+AL26FSy9hqmI6pWc/8duJUdwGGtMEg9qev028V4nSJPQ+heFxD1TU1uNv0P8MNEZUHz874xKqDTL7By6/gStvYVHKoXa8tq82an/9HcyJb+24ad+AQHjo8ndIt4Xb6KjajPzUVjKSGIETO6MDMrGtFzUxAicNCHR31YMVfTwRArvlPacjt3LSXwvOf+NaCbRdPdpVgF2bqjVrbydCoHvHSgClCehb3p2ejMLAc9ltRFdt1ZNQFhIlUPkLN947e/vUvAd3cnm/vymH4Pyio+8xKDnHw/83NoG9cqBtyUB52lnpB/KN0n8quC/fMc9JNj79gHbx2dMeZBldH5tAUUphsAwXX8D4XP2JR2fhwjDc+QhHxbe+R7hFbAJ3Rxww/yIcYi4UPcyU9L3Prmbtz9gEoqx6ELyxCBkL8nX1sQm4gRr1bBFo1Mq787Yy4K5Eo57/AQAA//+I4ueiAAAABklEQVQDAG8eAEcrJ9ZyAAAAAElFTkSuQmCC","bi":"data:image/png;base64,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","cv":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAD20lEQVR4AexXe0hTURz+vG5t9jDQ8rEsewhlmPYQo8iKsBWUBaVFRVpBL4rIXvQgWkT0oBeyngZJRfVHhKQlEzVMRW3NR/nIB6aVujmVsHS+pt1z2eYIw917NkLY4Lvnd3/3fL/zffd3uOwwUp+jAyMZDEb4z2ngfzfQ2QFnByjfgHMLUb5AarqzA9SvkLKAwzrg6W6glGYb3WEGLuzIg1hktE0FxSy7GJgX0GyRQEQrYvKxc3UF0q4kwd+73fJs1pQ2S2yvgMqAm6QXx6I1eHJSBSI6cEorevtcoa70wsv3ASj76oF6nTvXiaXBDbi1PwsrF9Rj8sRBU7RGqAwYusUoqZ2AGbJ2+Hp0oOKbJ6cns3gytl9eheMJS7h7YmqMpAfLQhqxc1U5GtvGcnl7XKgMEAEMM4ClcRuhqfEitxyIMRKYRxITHL4dzpr0gNFIvSwpx0FwJbLXSQWVeiq7ZXzwIGUOuf0nUtXTcP9NMC48XWiaMwCRq9EUCx8YQ9M1CEF7gTsMDQpBXG69qjX4VRYhnG/SLaADfUD9HkB3FSgLBDoL+b++1sdAzTqgdjPQ+og/34ohwIAI8I4Dxi0Hxq8FRs+3Kmdj6LkdGBPGgt1OnrE2koaexmjjdqPpQKwNGJzTfO4smm5OhE6p58Uzr6M9vA3au94svKCN2yqohrkW01WsQVeRmhc6ssvZ+R/RmUNGNRvzg+FDMQwFJSZ84s231itgC5layX4+TZGggRlthOv4XkFcaxLjc/MBfJWJvOEXvxkypYI3j6wlU57GpKsrILu4jK1xSlANUoeAkc4NhXR+GD/IMiB2uQKJ635IZ+j4cdm1JMEREIlTWaRBErySN99ar7At5HWI/YIsBsaGs1+iSOuO2ha7SAHf04BMAbiMAs2PidySAPmGO7wQHaPEmjPrsEmxCKujlLy43FrRzyDf0wf57i7Io1/w51vpZXILapGdxw8pGXpk5nxHcroeWbl1aGlQQ1NYOWydqi+fUVtdMuw8PnqEbSGrnsfKy3FtbzbiD2ZBHlpveWL+r2RObAivRvyBLNzYl42o8CpzmnqkNpCcPw2LArUIma7Hu2I/iyBFTAF3DjAnVGp/hM5sRtgsHVQaf3OaemQ6DT2dNFXGufVi1/UIPFLN5g4zklF9SDyRhiNRRShNeIqgqS1cebGoH5eeh+L8k4WssX4uZ48LdQfIiSspNwB3Xodwerp7RLiXHIR0jR9Id0rrJnD5n7+lePg2CIms0bZ2Ny5njwu1gaFENLEnrsiz63Hr1dyhHts15xADpCtE5Q+9OxkcCocYcKjiv4r/AQAA//+0byjrAAAABklEQVQDADMpQMroqCXlAAAAAElFTkSuQmCC","kh":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEOElEQVR4AexWXWhbZRh+zklOcn6Sk6bN/2SWZZ0z2IyhqCizo+0GTjf/xhgtKoKiXng1ZV64KuiVioj3jsq82KUoiFe7E3E3Qmhtb5aka5NsTbI1S7rltMk5e7/DlpG2jJ6TraOQcF74vuf9+d7nfd/znfCO5C/GdhYe2/zXJfCoG9jtQLcDHVagO0IdFrBjd/5S6htsZ3moI3RdEbHkdnZc5fsFeGgEmtCRGh9GamyEVvr9cuhI90AIGDDWJbHkEtA7/CJ6Dx1AVXSv02/ks85oE0DHBDRVQe3NYaLQTqL6zF6o0TDEUB+uJ3a1pcKSrx0fheaV23A7m44IsEQybw2j9PEJFAVH2/lK/05wHAdRFOHe9VibriS6UPzwOLJvDLXhdjYdEVgWBSgjzyIQCaM+tK/VhTw0ZBQn6pUqbiwWkfZLWEQT7KeTlTa0H0HyUQ6/gJroZLBtsU1giao49d4r8CUTkGUZ6tjryMsuLLl4XHn5ACLjx7BzII7+vU8gevJV5EafNnUFspFPHDF9vINPIvXuEbBYdhnYJxBWoT0VR6VSQblcxlXewPzZCRj/nkfv6Q9QJCyXy2Fubg43qlX0TXxi6i7/fAZFyYFSqYRarYbGvgEsx/x284dtAoGFawj2+GDUNXB0vMMjwePxoNFoQNd1RCIRc/5VVUUoFDIxpvP5fOBFiQ7m0LxVR1DtgX++TBHsPbYJCM1VuHQOsr8HYUpW2RGFw+GApmnged4ckVgsBiaSJKHZbKJer0MQBHiiIYToHZB8Klx0eTlXV+xlT162CbBP02KpjEwmg+npaeTzeRQuLyCfTiOXnTP3MzMzmJ2dBRulhXQWBbIt0EgVCgVMTU0hm83iKo2STi825WLrsUDgXnwaElROvYNEPI6Ixwu/34/gioH9kR3Y4wsi4Q+ir95En68HvWyESDcYipq6wWAMAU1HMBBA1OszY1w79TbdUawksPyzRWD52EEEDr8Exe2GJInmWHhp7RFFKKIbHlGESsLGxeUU4KU1E+WOjtlyNGZut8uMETo0hOXXDlpOnjlYJqC5HODHj8JoUsVI9AYNMYtEa6wVhjNZi7M94ZzBgfkY9NLzY0fBYhNs6eGtWLMv782R50B9x2p/zBTQXwl266w+HjX3d3G2Nxw8DMEJtm7hzI9sDYOieeWWj5GI49bo8/Q23CnIJhOzRIDFZLeGfO4PuCd/M8W4cBHapXko5/8093dxiWxW/vsf9YspSOd+b9Mx25X0PIwL/7RwFtOpW0ue5WOJAEc3vvzX3+C/PduS0Oc/0pf2U8g//NrCmF74fhLh979C5KOv4fxusk3HbKMnP0Pw9E9tuEKx2Rkssc0KH09+ASuyO3kGa2VP8st1GLMZSE6AyW4LPlZyYbaWOrDZqmylXZfAVlZ7o7O6HdioKluJdTuwldXe6Kxt34HbAAAA//+9719yAAAABklEQVQDAFgPXZfS+S7gAAAAAElFTkSuQmCC","cm":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABYElEQVR4AexSzUrDQBD+sjVSCU2jgkcFBfEkYk+eFPQpLAjiU9iH6KMJXmrrpZ49GcTYJtusE0/toZAys5TCLBkyO7vz833fGvQeHMdedk8dx+zrgeOYwYYvBbBuAVUBVYDJgD4hJoHsdFWATSGzgCrAJJCd7lcBUwKVscdcXsArgPZ1juSmWN5d4MQrgOTOIrndMADxVY6oQ3aRo1X9OwUi8qPLHNWZAOkLJcQVsGmAo+cMJ/0MpmnQaM5w3P/BYS+DTRd6i2zEAWSDEG/3MX7HAQ1YAg6YkD+kWDbYppjsJw6gGs/lBuG+g6PnX9oGwj3yKQYPywuA6LzALDUYdtsYdWPYL4OdM0KzXgD1u9vvAKPHForPxr+9P8UoJ0H9Aivc9KLAdLwFlHMDkz/9oNgKg9W96gVA3eYS9xSABIucGqoAhz2JXFVAgkVODVWAw55EriogwSKnhirAYU8i9w8AAP//caqW4QAAAAZJREFUAwD8yrcZKQVBWAAAAABJRU5ErkJggg==","ca":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADFklEQVR4AeyXW0gUURjH/7Ouzsx6y7yVkNe8pUlRGCn5EBIRkYQvSeRLGRQUWSKS9RA+GYRBRA9lkKEIalh5LS2zoqeopHqRLtJq5bWdvWWrMznzMAzr6M4Zd41gB2b8zvf9z/m+3/nGs7uGD1nxgtab6+95K/j44nq73mmtR9QZ8J9ffoB/3UB/B/wdWOEOEL1CFCiidNaBPiK9HjERgABBcw7e6cBo1RlYH3drnqNHSARAeeiA4HTKNUw31IO3WTF+7Yrs4x122faWQQTgKakw58KnokJwvZ2YvHNTks9+HsbEjaswV56CpaNd8nnzQQTg6RUyhIaBt9thPncSPGeR65y4Xgeu6wHYrBzZ5y2DCEBLUjojU11mNIJOz1CPrcBLBKD8H5ifmZbT2l8OYqrhljRmMrKkv+4PdsFPGQPhHHqDn5dr5LD4iskDHQYRgHJ924sBfMxOwLfTZTCfL5eK+tXeAjZ9k1Im20x2Dn6/H8LI8SMS7Gj1WQzvycd4Xa2s0WPoBggt3Cvlsz55hPmpSckeu1ABS2+HZLs/XKNmfC07DPFkEmOW+21wjZkRUrBbHOq+dQMYWBPYzVsWJeZ61AFsz5+Ct3KL9HRK6iIfiUM3gG2gH7MjX0hyqWpnWptU/VqdRADKYzRwQzwMDKM1j6qOCqIRklegGtPqJAJQLiq2PrmlE3SavqPRGB2DpMZ7CN9/ULkssa0bQMxkjIxGcmM7TLk7xaHmm1k4kVJau8FkZmues5SQAAAL34QouF8UyyLxdjPCi4rdQ6pj07ZcJDc/REBklGqc1EkEsNziEcUly4XlGJO2xCe1rCAzvAYw9+M7IkuPYX11DRLqm5Da9wrBebuQ/uw1Eu+2Ie5SLaKOngBF02QVelATAShPIfd1w/YdQGzlRUSUlCJ4Rz4C18WB5zgERKyFaet2rCk+hJjyKsRWVLtPXdGYCIA0k+BygbfbSKcR6X0P4HAQFUQq9jHAH/jiV5gS0qcAG7sHEZSUosznddunAF6vVmVBP4DKpqyqy9+BVd1ulWT+Dqhsyqq6/gIAAP//Os6ZzAAAAAZJREFUAwCRDVnfxlNXpAAAAABJRU5ErkJggg==","ic":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhElEQVR4AeySwQnAMAzEQj5dtat1l+7kznCIowRk8M++YCl7YF33M6TnXUN6r8PLA/4WqAENQAJ+IQgQr2sAI4QBGoAA8boGMEIYoAEIEK9rACOEARqAAPF6YAC/VQnwgArWIFQDAazKqAYqWINQDQSwKqMaqGANQjUQwKqMaqCCNQj9AAAA//83Xvl9AAAABklEQVQDAAe7jhkj1V8jAAAAAElFTkSuQmCC","es-ct":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAoElEQVR4AexYwQmAQAwr/fl0BXdw/wGcQVdwAUHpBpESSiAH/bW9XpJeucvnXF5lyxBfPsA0gXntayibJTQuoekCuvvndtyhbO6BrgS68foMKM+Aql2fga4Gp+P1GVCeAVW7PgPTGu7ur89A3aXK9oOBLtmceB+Agyue1e8BHCuOp3uAgyue1f9COFYcT/cAB1c8q+cAjhXH0z3AwRXP+gEAAP//dbEd0QAAAAZJREFUAwB4P8qXaKB4kwAAAABJRU5ErkJggg==","ky":"data:image/png;base64,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","cf":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABlUlEQVR4AexXPUvDQBh+cuDSsf+hQ111tF//wVIRi5Ngl85iaTgixd3FglOxlIr9D3511LUO/Q9uuog9c0EP0oQcSa7kAhd4Qu7e9+59nvc5EkIAxtZByA/jWJ+Xjc9wyT5RiMQ5BoF6sn2j4q4ABK5a7QkcgYBkYgvfKOArEjxHsk2scKiAVusOHLF2yihZCKhUXkAp9dBs3oOD/o2r1eeM6MnLCgHz+Z6X3e9foFj88GDbDghZ4T/mJWh2EwIYs7zuTyaHguJstg/bFbFaiTQR0+UhwKzReMB4fITh8BT1+iMsy31p6MI2hIdPQKm0RK83QLt9i07nGt3uFcrl95Bl+kz5BCyXJYxGx4LddHqAxWJbjHV8IMw9IargOHKJ7ost5NMZ9amKjvkckJfXL8MIyNoT44BxIGUHzBFK2cDUy4l1Y0EV7FdbSoi+UWX1OG9zhKQt33BCDAc2zCTh9kZAwsYpW2YcUNbKhBvl3wF24v7xKIKzK28j3VFXj3PPvwPynumdYRzI2h/jgHEgZQdyf4R+AQAA//+sRKF0AAAABklEQVQDABNDQtTF45vMAAAAAElFTkSuQmCC","cefta":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAFRklEQVR4AexXa1BVVRT+Lt4uCQp5RQzFJwLaiKgx6pghPpoeQk4OWUQQDzNGCOORxQyIAZaloMQwJDI8hFAGa5zQJouBkBg0a0DQIR7GS1QEFHB4c7ntvegSzHAM7uH8YOTMWXuvu89a317fWXvts68Onj+pnsyig0l+TREQSqCObAB2FuUkXBeyEzsuWQYUchVyA6JIuC42UCF/yQgITTjR41MEJvqNjhdvKgPjfWMTbf9kZ2CGbjcqwkKQ6Joy9GLNjRsR/VYGfvKNRp9qGgnXT+zOwFKjJrJbu7AOvltzSBfbiMpAb78carUMCnk/xeFlm4fikAgKbrNFJZ6apiLh+v5tObgeEo4ju75H/sdHieQbq4vIT0yjI8a5VyWHZWgY3k30RJRjJuKc06Gn6MW9VgOcyt8El0QPEq43thlghm4PPnn5EtmkFm7A+SJrMdOTrygChMCa7cvL4PdSNmUj9AcHLA0+jL1pLki7up6E62bBEUi7sg4qlQ4yrtnALeU9qMGmV6sZgvY3Q9DemXsaPN2F0x5JXMXhH19F2EV7dPUpsHpBPXzsckmsTevR0aOAS5IntkT5w5llbEDNppZxN9aotSfBUDiI9uKwqgQmhm2oum+Mzy7YE1DcO9+iiL3xGKez4HL10yOwNr0NsFjzq8yhGhg2LRujB1pyGIaEx15mc5rYGu4mG5tFNXTK5KfN7SvKwNYCCm6ZoX9gGhYpW+C1+TLZpV1Zj+SCDXCI9cb1hgU0xhsZc1g5r4EKnJO3s2SnVi7mrP/3BMuxeXa5/eNkTASMZ7ajMjwEmXvjCSuJbZuak6bbxkLwN3ujYR74tcz4Pu9QfncuWzIecD/tjl/KnqMxTfOa1Q2UsuI/ZJ+FHValdGIlvMDB0yvp7CRrNb9B4yLYj4lAa6ceK8D1yPjDhoB+r1mCvHILkroWJWXgWcN2etbePZ16U2UreNZMn3kAXXkfjWmam3dM8N2fa5H91wrcbTMkHA3e8L61S0/jItiPiQDfLl2T3ZFcuJGAPFNdYRcVQBJwzhE8A2tY0YJdPBM8KH3dHlRFBKP+yyBkecdCXzG4/JgJalqM4Bj/AXLLLXGx1Ipw7CL9YRc5iKnBvnlnMKvcR0jGRGDQefS2uH5wbdsuq2CFWk870I4YH1woWYWHHXpoejQTXb0KzGOFzvbZ0UGogFk1s3t0A+FR0QSqmoxxvng15PIBZOw5BV54RfULqXCV/sdhHHgMO+P2obJpLvTYR05f0TMyGgqeNVoEz4FEE+AgHimuuMe+vpYmjSg5GI6NZrf48AixNa9ARfhB/Lw/+r/lxOIG25Eg0zJ6NoNoAtvYV3jXmiK8EuOL6iYjLJrdgoIDX6GFrelrQZ+jODic9LzASMyf1QoTtpTmGjxiU/ObMRARPEcQRWCJUTMu+X6NBNdUzNbvwMqwUCT8tonjQjmjAzaLa2G94DbpfPBkni3Z/N08h/8Ef/OG07sg5hJFoLrZCD5n38aJ7G3IKV+OTlas76e6QOkXhS0sAz5nnOCd7kS7y6yPjsMr3ZlsNAHvtC5G7RdBWLe4WjM07l4UAT7bN5c3wy9zN1eH5GGnPn6tsEQt+0bUPVAir8ICo+3pvltzwTPgxj+GQ97jU0QTEJpOxorzzJ4EpHkmCpng9dh9OJTlgA9ZFgWN/ueBZATUkCHg3JsI5B86gSA6enXpADjicCdgKzQsGQE+YXz+i0NFzX9LIZIR4EsoL+AYcv0jpYh7CFMyAnwJyXUGhiaSSpGMAA/4haMH2D+wAK5KJpISkCzqYcCTnsA/AAAA///vCsJhAAAABklEQVQDAOqHJ3f/fpHNAAAAAElFTkSuQmCC","td":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAkUlEQVR4AeySwQmAMBAEg2/r8G1R1upDu7GARFs4h0WECdzvdkNmMrVlG2T60a5+tvFqnuw+r4PM1H5+fMDXAjWgAUjALwQB4rgGMEJYoAEIEMc1gBHCAg1AgDiuAYwQFmgAAsTxggF8V6TAB0SwFko1UIAVWdVABGuhVAMFWJFVDUSwFko1UIAVWdVABGuh9AYAAP//kOXvFQAAAAZJREFUAwA4imVNf7iHuQAAAABJRU5ErkJggg==","cl":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABi0lEQVR4AexUPUsDQRB9HsEYEBIxoJiIIJZKqhQiKQKKjcTCysbC0kbExh8hKmn8AYIEC0sxINhZiRai+EEICiKC4DckEe7cOciF41gXIWQ2sMe9Y3ZnuHlv3t5ZGN91mgGH6bLQ5pcRwG2g0oHuSAidIWUZmw4ls6l0PyYF2BgqGisF5DIJzAoo3sOW/lNAh6A1M5HAXHZQRHreAQF9PV0obmbhnMzDFojHwuiNht017VGOanSRExDw/FrB9MoxVvPnqP3YHk+KaY9yVOMlmIOAgDqfjcI1Xt6r9aUb0563oUkgFTA2HMVAPILbh09clN7cODUS04R2g4bVCP1RLpPE9v4dUgsHSC8Wkd+7EX+jpL9Ig5VUQOHoHkvrp6jUbFTFt7C8dYadw7IGlP0UpAJKj1/+SrEqP32Lp163VIBeNOVsjAD5bFqTsS4/1tAMXI0OgQPmCLXmoMi7/MMB+Us4M0YA5/Spt3GApsAJ4wDn9Km3cYCmwAnjAOf0qbdxgKbACeMA5/Sp9y8AAAD///MaouQAAAAGSURBVAMALiIxyJ6kbN0AAAAASUVORK5CYII=","cn":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACgElEQVR4AexWvW/TUBD/Pcd2nKYNMkQViFZlYURCDEwIia8FscDAUKYODB1AfEywwNJ/AIYuwMqKVAkGJP4AJiQGZhQkkFBd3CaxHcc2956VqlZiu1b60la15fd87+58d7/fPX8o1tzZ6DAPBYf8GBsAO96HfnsT1UV7X6jIB2CEAB8p5UWWCmPJhvHIQuW8i0kfuQC0ax1oVzupdSnzPpzXJtxVE8E3I9VPliEXgH6rDT7SCghbGvzP0+h9mBEurBEAVeqaWMmfsgHQ1tGvd6DfoA6QnFVOtFER5shnaKy1UF36J9aypySAWghj2ULtyboY9ZW/tP8jMbg80HMfkO9QcSxC9Z6Nynwf6kUHUOjeIae9VSQBOAp6azNQL3VhPLag393czsZlruM27gPy3TYOhIjBe2Oi/XQWneVTQMgGFmnXJABKE/7SsHVnDs5Kk1bJk+u4jfskLcmV/zF+HpJaOashAHEahqClxuKOOfip0WoXrKrytw4VIs4UAIB+sw24DN0XTXRfUjdIFjpxW/ZUe2hlO+yhdTQAeuMoZgD7ygK8dya8t6aQlRN9QMtiN4JxfwPGAwv1V38widepkkbG1uJp7NzrXOY6VLIAMPhfa/DeH4P/ZQrwUsOnpS2sH53B5epRe510wjachzWpO6QOfujoPp+lD1uDVvJPXulYWdjJPuqrvzH1bD2O0xs7ZBxnl/P42RwG9YIL5UwPlXMH8GculwiiwL68AJc+YMH3A/gzlwdA/APRw+p/ms5zlWIn/qTEnVjQowRgYqQWSlR2oBBdEpzLDkggtVDIsgOF6JLgXHZAAqmFQpYdKESXBOeyAxJILRSy7EAhuiQ4/wcAAP//eckySQAAAAZJREFUAwDu7w34JLTOmwAAAABJRU5ErkJggg==","cx":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEsElEQVR4AdSYe2xTVRzHv/f29rHNyR641VFBHoMxs5gGDRgasQzxFSFRFrNEiUaDMWBMlihRY9RIpjFRR4aP+I9g1BDM8A+NsmXi/nLjESwuuAFiZI5RhutEtq69j17OOe3a9d7ePnnsNju35/H7nfP7nPM956yXL35whzqv9X7V9f5aUyY+eHI5LnQ0QRqrgBk/PA1aDlQyiMnBOlo0VWIALGJFwPgvjQgcXAtVtrAqMzwSALFozSYpHQDlMJOkUgJQCJhEUsYAjAK4UZJqmS/hjpJILArjr4wA1PVGSOobv4B9DWE0Vig0BMOUFQDzvs6S8oscugM8dteLaSGyB2AU11dSu88LCJEFaKsVUcKrsQiSv3IGoO7XSlLrK2S8vVDEQ5UybCTg3y5b0HpWQJkVuLOUkNDBNYnXlHXFmiqHro5VXANJdQXIZapw+Hy5hCN3h7CpSkZJ7E512VU2rPaRFuD55oXo2+/Fek+V1i9eNjql6AzWlyigiebjDhkybUNWbDhugz/M4aOlErYvkJnH7UV5AIyOhTEyOoWhkSDrxOihldTTt8o4sTKETrfIEs1vdkpG7rp6Kp0HfA50jMamn1g8dosCT5mCFaXJR2vaFfipx4/Vm3pw8q8J0kWGv5ikHg7U4p3FEhyJsTFMThSBjNRUHZ3NDD3Fm1tOWzGlqKw8jyh551IR7y0Jw2lLQJBuWXvKR0iMQCG20S4SJjUG+8IhyGj1nsJn5wRMkFhVqPjhXws2+OzYe8GC1xZIsHPa3hL9anMrb46gyMIhFFHROcbjjTNWNPU74BcTYSdyWm+DsueuShz6zouWZ5foLFbVjqCyNIRj/3NwH3bAc9SBFwZtuEw25iNzIygmq1J/E5kRnae+YvUcBS3zZbxMVqGhrwjPDdjx45iA/2QuyTgOYLfxmFtuS2pMVYiQ2eB5DjYrn6oZ/RMcvOURrCM3aI1dBU9mvK44gh2LJAaQ0ilWaSEr5i2ngUvYSDT/zB82snICWYHkoGPm7ItFYRU4dH3pwcGv70VpicAajB6/Hgtg0ZoDaN9zRmdy/GwVltk5NDsVfFon4dsGEU9UK2ggG4/OvkjgB4NsSAZ4D5nlrS4JL90m4UmnzII+FwY+JCfRK3/aMKEYBz49OOtNVYGevov4/ufzCIVTXxju+jnTPgiTvTE5pbcbDzqwfe+auB3NULPpk+Otwy6yKaNBdQcs6L1kwcfDVuz8x4qvyP8++y8KOBUkOqOOWSYGIJOd/mbbAF7/4AQkmdBonOmm3bdrFVzOIk2Lvth2YAW2ftGIkBhdyfZlEh6v4PDinka829581X/xMQBk+ND7oG5dJ4b9Uxkso82fdLtRtmUb3K8+xRLN7+pys0aji4815vHICoCuED1Oc+k/LAnwDVWzRPMzfbUX38y2XPNZAeTaaVb2sYuv0JcIGQGo/rMKKE+jQiWVFqD5URd6O+7Dts2L8wwvO7dCJJUW4Gj/OHwDl3DIF8gukkKs8pRUWoDTf09i45ZeHPl9vJDQcvLNVVJpAXIa+Soa5yKpWQnA5iJLSc1eAEaR+SXCrAegHOkkZQoACmH0qtM8AIxCLynTAVCOmZK6AgAA//8PQfenAAAABklEQVQDAAh0VOUumQ2qAAAAAElFTkSuQmCC","cp":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhElEQVR4AeyS0QmAUAzEigs4uyM6SXWFIxwipNC/9h5N3jFzLemFdc+5pN8D5tflAV/r04AGIAG/EASI1zWAEcIADUCAeF0DGCEM0AAEiNc1gBHCAA1AgHg9MIDfqgR4QAVrEKqBAFZlVAMVrEGoBgJYlVENVLAGoRoIYFVGNVDBGoQ+AAAA//85HqNsAAAABklEQVQDAG5id/mC11GZAAAAAElFTkSuQmCC","cc":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADsUlEQVR4AeyXWUhUYRTHf7mV6WSLLbRpD9EiLbTRAhZFRVIUPlUvvQRBPbTSRkQQ1Us9FAUJ1VMEQaVRJpUWEUpZVlpaIWGbtohZlkuW2jleZbwzd5wZ5w4pzGXOd8+ce75zz/nOOf/vu2EcoKUnUxg9/AoF8L8TGMpAKAMBrkCnJRQXBZMGQFivAN8SxOmWAawcDfnLoXotFK2EytWQNgcG9g6iJ2J6SDQMExLW559bAKdmQ8ZCmBkPuvAfamHnY1g6AkpTYWw/gnJptm8thiwh5X19iSmAZeLkxvFQ9xf2P4VFN+FIkRgth5c/wBEJZ+b6ato/vcRY+NMMv5sgQXhfZ5sC2DzRmJbV5vCDSrj4FlpaYO09ePEdkofB+DhDz86x8BusugOpd6VshffVtimAqQPhcz3kfYXRMbBilKyKrIhDaik6AvYWGGZVz+DsHcvroELIH6umAHSiNtGxmaCkaZ0bDycGQ6Ok98J81YA+4cbd06ilWLDCAAEFAuVV5km/M3lMBEyRhdW7lZ4pgGcuqUuRnjiWAIl9oGA59I8yTGhpGZx5DJdMHZ4OmdKII/vCbsnYrOsw7wa8kh6arJAsUxSWlYT1+js8DXKWwgIpXStlUwCnX5tVtN6rnoBjkJRULK2olCvlpc5gcSUPhT2ToFl6JiUb0sReaQ00SBmW/ZLaroZB0bAtCbZKv3lDm74REBluvCgyzLi7jiZxxntp2jKnSq2sWkEmxLZBZ62g07r7zueu3C5xXmVX3knGqpRzp+ESwL7JsG8KXtFG0fBQIUxIl6x+dLelElMAKlgjaKMQ2iSrGO2ATecgJt5wSA29+ala1tTe3MWCVtYaoGiz/RHsECpyKVmrOdrYlQ20QqzVc7cAxG8OStSO85B0FZJzYNRlmHENdFOzMuKv7GwpKHmaN1z6R0usX5QnDafcLYD2R/VSt1rrD2Uv+CTQ2i7v7N4OAkn9O9Py/kyzP0JgvKbRu67HALxPddc4WmzIUhNgXJzBu46925rSVd7x/xdZMC2xjjJPvB8BeDLhlGdXwPESUDjNS4EN42g9O+m+MUZQTE+2elRwzgicszUAdWdLvvROBqQLoimk3l4CJ2eD7uTPBUZVx06yPQB1rkRQaH0uJF4ySHmV6TO7KSgBdNXJIbJH6FHGn/ndJgDdlQP+HvAncrt1E6XJA/4esNspf+zpDh3w94A/LwyGrh4bAv4eCIZjwbTZbZq4q0GGAujqytk1L5QBu1ayq3Z6fAb+AQAA///0eESwAAAABklEQVQDAPeZJyiwYdyQAAAAAElFTkSuQmCC","co":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhklEQVR4AeyS0QmAMAwFq/M4pQM4oBP44Q51gnzIQcODK+QnkKS5yz6fMZNjH+HPBboFakADkIAnBAHicg1ghLCBBiBAXK4BjBA20AAEiMvzDWzHNZIj3wA+wuYGPww0/7QY7wIFmGVpDSxDXQzKN3C/50iOfAPFacWkNdCtSgMagATiT+gDAAD//0czvvUAAAAGSURBVAMAQ2scCJPtbRMAAAAASUVORK5CYII=","km":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAD90lEQVR4AdSXeUhUQRzHv77Ut4alZmUlaAdRtJqBFZpYdCAdFFFWZER0GdFFJBWUJd1JFx0EER1QEP2xBl2GqVniRXhUhqLllWurroqmrrq6vRnZ8T3bXZ+Qu0/xN/ub384438/v92acx+1LDjLVt7uYTCYMS+MSK3ywQhOGt+XjMRx/OCK6ocMVB1LnYH9KEPQGFxIaNkYBzGrN1Uj75W0OKf5TAkDUkmrsTArG0U9qNHc6k5Ci7R8As1pNqS+WaxZA6dWwCkBAattVUHo1bAIQCGJKroYsAAKh1GrIBiAQxHqrESnsjRyha3K4WQXw4kdju3odHkZcQHx4DIJ91ILY3t/a9gZhb5wUTqoraDMaeoMOai0CLPSdi3fr7uPE/D2oaK6GpiQJu9SRcOWk/+Q0pUlYkRCN7JoCB8kHuP4rb56xCg8izmOMygNJlRmIy7qDbbPWYpl/KCImh/Ufjuo/OmxJPIq4zNsOqYYEYJ5PIM4uOEhF6tr0iEmLp/6LH8m4mHMPr35+oH1LzZOilw6phgQgNmQv03Yj9zFaje20/64iHcmVWdS31TiiGgwgwHs6Zo2ZRvV1m3rwpuwj9V04Z9xdehqPl1/C/AmBNDZQY89qMIBlfqFM17f6Epb9rh4j2roMcHPmUdXym40ZyLFXNRjAJPe+9wG9oUmi71TGTUS+OoSa1jpJXE7HXI38uiI5wwc9hgF0dnexyfwI6XFJ9oJaeMTYgEE6hvJqZIVvQqrTzP9uDKCypYbJGuvmxXzOicOzlVdxOfwI1k5byuKyHOE9dXFyM+JitZhR3CFrymAHMYDUqmw2d7qnP9xdRtJ+j7ChC/WlKG4ow+uyNBqT03jXGxETr0PU00aoOsiVQ86swY9hACVNFcjQ5tG/QLK+asoi6pPmbPZdbE08BrKhSd+m2SHr4vUZAAkeT7+Gls5W4mLP7E306kBgQiYEYf+cLTRuq7FX1sUaJADa1lrh5f4cyIb2GzURh4O3gTxCOwLWIzpwI0ImBonn9vl2znrfwhbuQunaXGx+ewTlwiVud8AGeg9KEC5tjwoTkGXh0ubRaJ9nXSxa7EsqYP6ioK5YeB/ejej3pzDa1R0e/CjEf75v/pp9hqa34MwQnjBsIRuORQAy3mjqRopwMt3Kf4JnxW/QLZxGJE6MZP3gdR12PGjAyLahO2HIWgOZVQBrE1XaqeALovA8MAaxUScdbrIBuA43eOUtgef3MHBG3hqf3eOyAEjWx2auBq/3tbvAgRa0CaDUrIuhrAIoOes2AZw6eUU+62LRYl9SAV7nh3GZaxT5rItFi30KQLLu+WUhvL4uAtelEn+veJ8zZ11V6694sZYE/gUAAP//hZUCuwAAAAZJREFUAwATA22PW9ymHQAAAABJRU5ErkJggg==","ck":"data:image/png;base64,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","cr":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAoklEQVR4AeyTIQ6AMBRDm+/QaO6B3O6M3yT3QKORwAFmSMOWJiWpIel+ft9vANutrHcBSH9eYDQ+fQIpzVBWlLJCWfonNLqE7HwTYBNk/XHVCmXFkTOU5Q6wN8z6TYBNkPWbAJsg6zcBNkHW/4EAO+ofv/4CU0pQViylQFn6J/RPtfq9agL9sm5PilpPKCty3qEsd6B9mf3+mkC/rNuT5Ak8AAAA//+oBnRTAAAABklEQVQDAMt6kfcFyzMLAAAAAElFTkSuQmCC","hr":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEK0lEQVR4AeyYf0yVVRjHP1xQIBCmkeCslRuoi+yHMxOwOAUCYkZgSkwv3RUWd01brOiPprOFw5RyOsMhP3whcm6twMLRAoSbcFlWm2Vhowmr6djYuhs3wMDw9p57r9zij9SdF5zbPbvPeZ/z3Oc55/s9z3PPe3ZNLnDdzmLiNm9+Arc6gf4M/CcDwcF8XrCfsTujISCAowc/o/Jgo1uXtsaX9oPug4FNOQPdz1t5q6yJ3hXJlKbvpfLTi+wOzmTb7noODP9G+XA/1pIGVsSUUtgUzM6scnpXPumOsecWKlNRIuAKDcW69g3OjHWx5IUa8pvfpeTPT3jI8RMDly9iDqkgP7ScC78P8nTsXuZePsux80EsMVfx98g7FKdsUs6IEoHB1Sn8OHSVuKBfCHBdpXBDDa9HbKEleBkTs1ZS7zS7JSj8fh5Oc7Kr9AuycqJInh/E4Yhy7GP3Mrj6KaUsKBGIbmkiZ4GJo2Fl3BduYu0f7VQPVZL913eEOp3McTmYwxABo+McKs+gojaJDY5utlqWUtPwJodm9zC/rfnWEZArF3XVszQykGV3hfDRc1aKxAfUJW0nIWCYnWHx7AiKI3P0HPfMfZTI8GfY9cQr9FbZuDs1h9SeblSbUgbk4olH3iMjchxrz1d0vr+ehjYzH58qYNu+zaQWv0jK24W8WvsaxzqtNJzKp3nrgzz2g43GB9aw+Ih+KslJFMSkfBMaGWGfrYKM8zYCExOgrQ06OqC2FiwWsFigrg46OqC1lcBns8gc/JkyezWMjirfxJQz4N68S5dA00DTIDERkpMhPBw0DTTNo0vbqlWgaaBpIGPcwWqdMQTUMChFG0OgoADa2z2ybh0IAXa7ZyztLS0gBOTk+GwyRgm6J9gYAosWgRAgBJw+DTYb9PWBECAEDAx4bJ2dIAQIATLGg0GpN4aAEgS1YGMIVFWBECAEnDzpKZP0dBAChIDsbI/txAkQAoSAav0UUsPujjaGQH+/p0Rk6SQlgRAQHe2zhYWBEJCgH7PSR4osMTcEtc4YAleu+FDo12jfwKuZvMtce0rzxITslcU7843M8z8+eXm+F1JkJEgS8uV17e+C+nqPbd48n19uLkY0YwiMj988ln9n7eajJyOMIRAfDw7H5KTXVaTv8uXXdbsRB1NMzGGUJa2Lb14ugYULQb9Gu+9XZjPuUpLlJHVZTvI73ae9YA8xj7eqr6tjNyYDQFZnHOc2btc170cC9qqTD/2H++3GIvLs+otv0qimGEZAwlhzPILitAMM2/R7vjw6Q0IgKsp9mXN+fQZryoesP36HdDVMDCUgUdX1RhCbe5YFlj4sj+xhc+wOYrb8yuJN39NwwVjwcj3DCchJpcgK+rJvNm39s+Rw2mTaCEwb4ikT+wlM2ZAZH/ozMONbPmVBfwambMiMD/8BAAD//15TqRIAAAAGSURBVAMAFej/6Euh2uMAAAAASUVORK5CYII=","cu":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEJklEQVR4AdSXXUwUVxTH/zNsh2GXBbEFSVmLD3yYXVsSY6XdoFRRTKOhD5oo2/DSlNDIQ7UJNsQYKcE0qdEiKaTEj5RUXbFtIg9NG8QV8UUSQ6JxEcQIUTGIiCzLx+4CM86dMJNglt2Z3VlYNjlz7z1zz7n/3+yde+/QZz7M5ddlHeVh/nVFGm2deQL76Fn84G6FgfNipf1oIlhH8Sj23MU/o7+jaPoeaJ4j7hVhIoCk9H1+Escm/sWfby5gg29Qckd1uQBAUpo1N4wLY02oHm9Byty45I7K0i8AUUpRwJdepzCtGvHt5G2wnI+4o84WBZCUsphB2dRt/D3aiF0ep+SOmjIogKR0De9GjbsFnWv+R8exj9H+x76oMMUAEgj9oAtx39uQbj+NvAwD8j81LaupBhBBeB4jFy/ifm4uhs+fBz87K7qX4xIawLzSubExPK2shHPrVrhu3Jj3Lm0RFoAk1fP4MfqKi/HowAF4BwYk95KUigHizOaggsYdDjzIy8PzmhpwExNB+2vRQREAYzIh7cgRRePxPh+G6urE92Pk8mWAi+yxRBFA0u7dSNyxAxTLKoIgnWZfvcLAoUNw5HyOM5VN+KnhTkRMGcCePaAYBqt27iTaVFnCy35Yz1WA/rkSDXWtqKq/o6n5BUg9eBDZ167JFi8sl0T12upq2ZfV3Iy49euJO6i9eyxhOO2WXb8AQw0NcF2/jvjNm2G0WmWBTFqa2GZSU/GsqgrTPT3yPSUV6VjS/OYs8r29SkKC9vELQKKG6uvRU1SEObebNGUbb2+Hs6AA0w8fyr7lrCwKQERN3RM+bmJjSVU23+AguMlJua2m4sF7aNRvwf6kUtyKzVYTumjfgAAJ+fkgLy83NQVXW5uYZFVhoViquQgnD/wXa8He1WU4Z9gCH61TEx6wLx3oLhE73d0N57Zt6LPZMHD4MOj4eOhzcgKFLbj3wmjCb9YKOArKYf7MjC+Ew5+WFhBgRljLu4Un7u3vF0WNXLoE0o7LDv7365KTsa62FkV9d9HUUoGbwvE7EhYQ4MXJkyA7q6h+/uLp7cXrq1fnW36KmBiklJbik85OfGCzAXTAIfwkUOfSNHvC9u3Y0NGBj06cEKeaOimh9dYEgM3IQKbdjqwrV8BmZoamJMSosADIC206fhwW4aknCntDiBrCCgsNQDgbJJeUiPM8tbwclE67ZVEtjWoAw8aNsAhfX+mnToGsNGoH1Lq/YoCXlBFHjV/B8nQX9PvbQFlqo8KCAkjb/z5hF21lLeCF6aP1UwwnX0AAB5Mtb/8emglnnIjF+gV4FJOCssSv8WPiXgzHJERscC0SLwBwUSx+MRSiJOkbdDHpWuSPeA4RYJanYGc3CdPlO/yl3wSOEt0RH1yLAegu3VoUry7FaWMhXLRei5xLmuMtAAAA//9/47IaAAAABklEQVQDADQTWRpBUAbWAAAAAElFTkSuQmCC","cw":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAB2ElEQVR4AeyVSUgCURjH/3jpFAXRhi0Wpe0bFRFERQVttF06tJ4KCiIKOhWtly5RREQEeanoUHSQoFOidEkrj0VCmFBIZItWpoQ240EwR5yLzryaYb7hve/NvPf/ff/3GBGyp10khwiEX38TIEUciazUaCK8YXSgrSYDzVVS8gAKM+JwfzKOpYl6LI7V4XijG5XFybwG8XJAd23C4KzCLdjpdKFr4gCq8zt3n68PLwBaZHlBIjb3LzC9pkRZfgKd4nX4AMgPdRiYUWBhQ40jtd5LvDgmHHnSWK8c1x0fAL3x2a+mlmoZGirS/I5zMeAD8FsEXfWqEgno6KzPQUdtlrtN94sy48H1FRDA/GrDaE8ZlPJ+VFIgpblibM23Il8WixuDmWv9CAjw5fhG+8geVFqDR+zcugor22d4tzk8Oa4aAQFoYS7qkRQfATsF82KxUecgncrw42YFIJNE4er2CdLGVUjqlnF6yZ9/AyuAh0crmoZ2YDS9wfJhx+quhh/lp1SwArB+cr/XKa2MNysAxi95khQAuDbiPznAda2Z1xdN9WpAcogm+7QgOYQzwLwzQ5cl34GwmmGQHOQ7ELrdGpyVBAeCU1f2swoOsK9VcN4UHAhOXdnP+gMAAP//Oc3ulQAAAAZJREFUAwCsS3EI9e9vdwAAAABJRU5ErkJggg==","cy":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEiUlEQVR4AexWC0xbVRj+6ChsAqVFGBYoLUxeU4kWN9w0iODciLGbA4fDIUI2ncwYEjddnHGCWUxczICg0cUJ0TCWZe4FbrEyHmYLGHFM0QHa0kF5FCivrkAftPWeu0CajdF7u7KNhJOcc8895/v+///Of+45l2Nb4IWDBV4WBdzrBC5mYL4yYBpSMDJ9f2XAOoXrVyuhLk+H/l/5whFg0Q/QAXeWvoShS8UQbiyG35rchSHAqGmBojgOnUfWw50nhDi7Cu7egYyCJ6B7soWsBh3GrlSg53g2FEVx8PBbAXHOeQSnHYGbuyeJi3F1iQBDbzP6Tu+C7u+TGPvzGMaVdTAOtM4EQVZ5XFmLwQufoi0/AK37fdFdkYHRP8rgG/sKwnbWwTtqA+DmBrbFJQI8A6Ix3PAV1D+kovvoVlw7/BwUX6zEPx+40VVxKJYaS8KA/GNYJrQgxYPiSN6shVBWSF6dri4RYBrpZB2AUFYErxWJWOIVwJprT2AtwDI5As3ZPKi+TkT/ufdBzuvB6gJ7m4z6VqOOEc4RiJEAQ89lwGajbWmq3qOOuiJMqOqhrT+I/z6PoPZ9BT3Hpuk9lYspXR8byqxYRgImKQHKktXUPk7GaFPprIbYDlrGB9Hx5RqQJ1uuPZ6RAL40E4buJup0qbHnsu4LN5YgNOsMfB/PQBB1ZAanfUttwQ7WduwJjASQs9kjIMqex7rP5YfCb+0u+KyUIWRrOQSrcuAV8TyWhcaztmVPYCSAECTbfwHclsCZQi6q5evynaE65DAWwOWLwJduc2jQHsAVSCDadgIP724F/8k37Kdc1mcsgHgM3lIGcvnw47LIK109/CPBWcqn+7xHN1O/BOdoTEz+GCL3qsB7LJVKHJeen4+GhYAb7snlQ4TEFFxHzCcjiNjTDnHWaZA9Lsr8kfolSKEvKM5S3g3CPLesBBws2YsrLY0YGu4Hx9MbnGV8OrwHwp9FSPr3M3cFPeigsVH3yoC2Dx8deAu9mi4H6NtPsxLwdvaH+O1yPRSq1lucEhFMf8bMZhOU19pQXX8GLyRtRtBDobeP0MEMKwHEsY8XD6NjwyirKERfv9qB+dmnS48W4sKvZxEuiYLZbJwdxHCUlQAB3x9bNm1Hp1qBZ55aD3VPBy42ytHc0uDQ3cTkOE5UltLZWy1NgK+PAHq9DskJMofcuQCsBBBD7u5ciELC6e9gcEiD3v4uVP18DFfbm2lhVquFwGYqyVK74i/Ia09Cq9Wg7tJPME+ZYDQZ8Ei0dAbnbIe1AOIoJTkNL7/4OuKliehSKyFLeQ3yulNobKpF4Tf7CYSu7YoWfFd+CA2/18BPsBxWmxUhQWFY9UQCsl59F8JAEY27k8YpAdMO/R8MxO53PkOYOBLpm3bQ34TA1x9KVRvOVx8Hl8rWxKSeXukQoRi5OfuwISl1mu6S5x0JmI6A582nVzNvZwGyM/JQc7ESPGqPj+qGcWDfYXrFwyXR03CXPl0i4OaIdmTuwdPx6yCNXXvzlMvf50WAy6Ocw+CigDkW565MLWbgrizzHE7+BwAA//9TTJN5AAAABklEQVQDAPeGM6f0snE5AAAAAElFTkSuQmCC","cz":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABO0lEQVR4AdTROQrCQBgF4J+cQAsrT2KpF3EBPYjLDbyCoGKjtVjoGVwqsbFSUcEFEVGeEDCExCwzmf8feAQCCfO9ZxXr3ffueHlLPdZotqBctU3D6ZwkHguXPpxvVG72qdTo0f50xSsx+QLs20pcwwEARNoaLgAQiJQ1PAFASFjDFwAEwnmNQAAguK4RGAAEwm2N0AAgOK0RCQAEwmGNWAAgTK8RGwAEYmoNZQAgTKyhFAAEkuQaWgBAJLWGNgAQiO41tAOAeO0PtK3UaJXJKo92QP64ps5yQIXzBhbl0QZIPe/UXI+ptZlQ+vVQfnH7hyEA9if/n7pb/72BUkBSrWsBJNm6UoCJ1pUBTLUeG2C69VgADq1HAnBqPTSAW+uBAVxbDwTg3LovQELrngAprbsA0lp3ACS2/gv4AAAA///EJs8VAAAABklEQVQDAKEPzO5oFAUOAAAAAElFTkSuQmCC","ci":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAiElEQVR4AeySwQmAQAwED1/2/xQsyXb8xhrWYRFhAvkle2TmtjnWvO5zvwfWutaQ3tbPywO+FqgBDUACfiEIEK9rACOEARqAAPG6BjBCGKABCBCvawAjhAEagADxemAAv1UJ8IAK1iBUAwGsyqgGKliDUA0EsCqjGqhgDUI1EMCqjGqggjUIfQAAAP//xn89lgAAAAZJREFUAwCIFIZLCXdZwwAAAABJRU5ErkJggg==","cd":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAErElEQVR4AdSXbUxbVRjH/730LWUiMigvBabDxBemZjrny4BBdLoSIHEjZsJY/GSymPkFZoywqJl8MIIfdImZnxQzR5ZtH4ZCZcXxMsfCYpS5yTSpydYVAQcyV7ClL9d7ztbLve0p90Jp0zU5t+d5zjnPef7tL885l8N7PH+3tMKPrvEn7Lv5/37L4W/25vJ/VBbyHO6Cj4HzoqW4DaOVpbBm2vH3F1r8WW+A+1wKOKX8H037XWlKXMetuXb8Yi1F84Z2+M774BASv/GlDrxPA/JRFND4yCGsS3WSuQltZM8TpQ04WdaAvNnrcDbpcX2/AT6XPGW5FZYipwmgymLDK/ldYSPxM0O4kF99+31yXFi7LimgzDyMNJ0b1ZbvWWtX3fdizhmB85JFXF4zQIoLa8MlBVTn9dA1z2WOIEM/Q/vxeIRw6dpah9x/XCIu/qkl06OpiDPKs8/CVr4TvRU7xLb7gWN0kkYD2CpqRT+Zc2jTfqzRztHxWB7Nxe24UrUZBJepz7VwvGqk1UVNzIxdvsUq1D9Zgg8uvY0H73GgVECHNIJPKNBj6WOi3+G+H00/H4TbnxoaXvY3weVK1dNo2dCGWz9ycAi4TH+tUxXH9FQA6494kP2Wf1EAWTl84xk82TMA+8RWYkY0t8+E+nOHsffCJ/AEjBHjahyx4KLNCCLvwALWfbaACbMFOwY75AJIArO+dFQPdMI1n0NMWXtn9H2cdNbIfMsxpLhIDyPFGCk8CC5FnR7caw2g9VIjHv72Anr+2hYpgAQrNDlhMU2QrqxVmIdktlpDisu/ZwRc6pSrSyg2xaXDS3Hpu1WBh7pG8OHlptAwW0Bt4SlxwoGL72JkeiO1X87to99qHwSX4yV7EKouV/fp4Wo2wD8p1o6oobTZQVhavRSXSQGX2qGvUDN4FNfmC2RrmJFq8rtxdS4fm212tI3twws/nEL72JtI1c5juwoRBuHuQnAhh5E147R4d5n/KUW2OdMI4fKNF/oyHcXl8e6z+G78Jeb0CAFrhXrvFJLfZOvHrzeL6SJ/UIuWiy2w9h/Hlqzz1BftQXAZrSyh1WVh0AfHSnGZLccT3UMUF2/QEG27SIQ8QSMahg8zS+TA1Ba0Xm5kBksELqyNuXDnnN8U7pLZ4eUzkbjIErljRAi441f1lWhcWEmtSADBhVx1SXXJmXJhpdVlPKsAO4c6mNWFlSzLtywBUlzI3WXyU+HNaI8BaqqLRscj83UfiiTVZWPPILrHt7HyUu1TLYCFy0yncHcJCDc9he3oYXTEi6w3/OhTWV0UQorDigIWcalDLLi40mPHRcxa0okqIBlxkeQtdpkCkhUXMWtJRyYg2XGR5C12qQAZLmmnkQzVRcxQocNJcfH2+uHYZYTa6rLmefJmFJ/qopC3OMxJD6Pxg3r4Z+ifIk5gdbTmIPI/9qKgbQHxqi6sfVk+juJSb1R1GJEAaxuEw+ioF7pnb191V+MwInFX2jiKi4rVBJeiYx6Y967+YaRi+6hTFHlJJlxYKqIKEO8uSYSLagEEl/VxuruwkojFJ/sHdJbkqS5qRVEBIi7Cr54s1UW1ACku9ml1L9Jqgydi3v8AAAD//9Ac+zIAAAAGSURBVAMAxlQdqzCZSqQAAAAASUVORK5CYII=","dk":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAA00lEQVR4AeyTsQ3CQBAEXxd/QA4t2AkuCiqAEqACuwDohcAkuAWQG/jciPSfwNqVbJ20L11gy7fe27m3x6ae0Bq7+5Sfsb3BeogPC86PBlgboAiIAJmAVogMkG4XATpCUkAEyADpdhGgIyQFbHc+BrRiUxW/j00N6yE+bHs6BLTi/t8AFayH+NAdKHZo4Rf+CXyuXUArPYci79QPsB7iw96XNsyr8ruf2XyC1L9gPcSH/xXKE/T2LAJrExMBESAT0AqRAdLtIkBHSAqIABkg3e6ewBcAAP//qE59kAAAAAZJREFUAwBFA3NekC8r/gAAAABJRU5ErkJggg==","dg":"data:image/png;base64,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","dj":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAB00lEQVR4AdSXMU/CQBiGHwmDg5roahx0MQQn2UmIDgwsDLizwO4vkIWfAMGwuEEgjIQZwuZsGEycSAgMEiYHYuWDkJTQQkuR3jV526/Xu+v3vO90gffPX+P5zTAyJT0ViNzAS8rg/hotr4B0fXoM2UeDzIPByayWMV00B1g2q2MaKwAColsaawACIdIlDVsAgdAhjY0AAiFSOQ1HAAKhahqOAQRCpFoargEEQqU0dgIQCJEKaXgCEAi/0/AMIBAiv9LYDjAYQLcrPW6VH2lsB6hWoVbb2rx5wiHTsAaYTCCfh1wOSiWoVBa1vPf75l5t60OlYQ1wdgbJJDQa0OvBcAjlMsRicHlp27TVh2Ua4Surr97HrAFk31AI0mmpFkokIBpd1C7vP8ERndsUr5GjvcseQJpstaBYhGYTOh0wDBl1pfp3nfDHHfJ0tdDhZHuA6RQKhdlRLQvxOLTbMB473BZG0xGpr6e5pHa80OVEe4BgEG5mB+blhhcXcH6+fNv4FLf/03Xzz+0BzLMc1uL0IVw3t7M3gEO6vlcAP1zfG4BfrnsG8Nt1TwAquL4TgEquuwZQzXXHAKq67ghAZdc3Aujgui2ALq6vAejm+gqAjq6bAf4AAAD//9vkG3cAAAAGSURBVAMAo3Z6DGWmFDAAAAAASUVORK5CYII=","dm":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAE7UlEQVR4AeyXa2wUVRTHf3dm9r1dtg9KLBUqQSiViJESoAJVgiWCCaJoIsEij2g0BkU0oKYShfiB8AjhgzECEiGGD4oBwicJRQMRNGIU6MOCpZDKI5Xa7e52uzu7452tLYwSU2aXGJO9mTO757H3/P/n3LlzVwluxMiGzPsEw2i4IYoDA0RatuzbaPSP1j/OZyVfP2aF//nIEfivG5jrQK4DGVYgt4RuWcAUlDsVFgRUFheqFF28BLGeW4ZmasxqB/Q2hc71Pq4+N4S9I33UPA/jaw0qP9rJlcpSOuZPR/26PlPMlt9nhYAzCXOOObn8pp+fTguMmCA/pdAxQkcvSxJEhVSKtus/0vb+q9QddTE0KsjGyJjAxMsq+/flUX5GY9e7ISJj4mlcmhA8+1mAmh158nwhTxTS2lqS4EBdhIoYHPo8wIJmJ+aBQ7psX8qaeyETWR12UBZSadR1rp+DK51iALC7R6EkoSJEn62wU2X8WYFbV8hLCFaed7FmdGb5ldWSgF15Paly93EtDXhe1MuS3XnMvexJAzZL2qjVcMq9hFjKn7aNu+hi0m4/5VddppvAbwqvnHVhN7/5u4yWUMuXDr59rIeTVRGiRopic62noYGeSuF/6xJnAkvZMfQw4aQn7ckXavrTvB2eFCG8X5KRu5ap25GMCOT9otE6KskPo3S8wjqVpigsPxhlyz0zGBJrpMVRbcF3oCzCd/N16kf2oF+4QcoSNAhFERUCOzJigoLSpVK91UflHu8/UiVlB566fpz8xGh8zmcoFa2WmLGdDqasc+O+qPFyrWYLg4nbWjZLin9Xqrwaqnw47xMOJgu5m/wtXJf2BA4aR3zPqskJivQmS8TYLic1MTdTul1M9KgW3+0otgm4RF+aqDtFu1PvU266O9AJxptxpjR6fHDMH77JCxF/kkjK4FeXTkD5azJLxOAUZf3utdiRaWuWpDMcWRbiRK0VnOlQZHcqwtsY0/kEyAJvG5M0zQPSNDTBVxu6MIakKJg11RYGE7fyzqK12JHlKzbT4k3gkjuIWwJsV28ANAyD5sJuWnwfc0E7DQJOlZHebpHD9MeHJYmF5HujQOfhha/ZwmDiVuR8g7ysYcLjpbx4HFXbA8zcGWC4fCf0RwghuKvLTVWHRm9BM0iSXrnKhJBMZJAQgqknfDy61c9DTV4cD1RKq73LNgEzna/2JXwJBY+U5rw4SVl5025KQHdQmvTzhtx8XuiAupMMdKBRxpoxhREN9+x5KEXDsDuU/E0CuzK8fRnflCZo8sY5vCLKFwtDxG8iYYJacSrIe/VBnr4WxFxkh+aEOLgqSkOwl2ueFBOKPrWd38StmEkykbppUQp1lZI2ga9LwSmXR/98YblDndYS/SrmAS94SaOkXZAfV3l7RpSQ2xjw2/mSMYFrPoPFc8Pcf8TH9IN+C4b6xSHOLY1YbFN/9jBHnpnWPRjjeKl8MCze21cyJmCmbC0w2LQwTMmiGGh9FW3xJBBCIN9ntDvMxWNGSpk5i8ef7KZ+bObg5Wwo5i0bIv+/4F/Qy7BdXRSs62ZPm054swtlo5vfq2eS/+Feio82EP9gA52ePpLZyJs1Av1ghAecFUm2h3pZ2dbLixd6aXhkOq7q2SjFd/WHZe0z6wSyhmyQE+UIDLJQdyws14E7VtpBTpzrwCALdcfC/gQAAP//4/5v9QAAAAZJREFUAwADjFWoUzmkrwAAAABJRU5ErkJggg==","do":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAB8UlEQVR4AeyTS0hUYRiGnyZsbKJSGeiyKAyMssLGYWySgeyGOwdmIAgaqQgKcQqyLInIFkHksuxCEC0CowhSOgVFYBdceRnxslAEUfE2rtQZdWacI7iXI5zvoML/wXs23/n/77zv8x0bx67qknrzuVlfqaLvGvT27IOisrHBSxlYa4CKgCJgMgG1QiYDNH1cETAdockLFAGTAZo+vvEJPLpRhqTc+ftJp9Nov5qpuFND1YOHfP2hLSftcB1ld3WlqGy1FX4ktc/pwFN6mU/aH9xuH/4jhQw0NlFWHkbPy2XP/bCoxFdoZ1Y21XVBHNtTtPdFcLZoeO2LnAvlk0gml0lIPsQNvG/9yJfO7xzIPYFrVw4RTzEjh85T96+e7mg30iVuYHw2Soa+mUB0kIXhKWL9k8QTCbbYs5iam5H+fsQNBPNKSTGPfWsmnliSjMwchjalGU3FiKOvfwMTfzsoqO+l4dtb/nf+ZKztA87fr3iibWNv17S8gbGnz1mdVveet+A4JTdvUXj6AkXh65SErnH41CV89+6yw+Wl9mWjqGzjz14gqXikh+LQRc7WVOELXOFkoJwztyspCvpp7Rnk8esmUYn/A+I7YnChMmAQkOVtRcDyiA0GKAIGAVneVgQsj9hggCJgEJDlbUXA8ogNBiwBAAD//8dsrvwAAAAGSURBVAMAg9q/2VXCGloAAAAASUVORK5CYII=","eac":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADT0lEQVR4AexTXUiTURh+dvZtTZub8zMq+rel5Witsh9tc5AFYoFZm0HUVdFlddMfFcy0PyqIikqtXBeSutrwpiICUT5agX/hSKPwp2kuh6Sm6dx07RsE3gTCd2QMduA5HA7v8z7nfd/zEFwLBqMZBFG+YgVEeoCxCcQmILADsS8ksIGC6dE/geA5IJpBCgsL6+cCJpOpoaCggOPBn+dCg89JbLYXRppwOBxGmUxmNJv3ZBcX79dbLAf0JtPebIZhjHa7naoW/26qHpBKJbBa76KoaAdSN/pAiBoKhQZpm3woKdmNior7kEgYwcadmYDgfLCVFo4/Oe7JzPKjuvMXbF3fsbZnCCu/elHV2YlXfWMwZP/EsadH+2np8XmIOQPDNLBvLUZPGLYlN3vHIJsnxaWuxwhsfgO/zgaL2wYfxuEajMMpfQbLx9LQ5HOQmv0w0oA1P10v8rcwbb8ncKTuC0QH08GNnIRkQRlwQIbDdT1wjUyDBFxSa/4aPQ1NPgc1D/j9SojF86BiVJBq2iBm4rFTvQpTvpdgyADi012Qi+UhD0gxOSmf+Y0FnakVIBL1hgqYBMMQ9Hly4R9yYtr3IFRIIgKDAXR7d0JEghCJfCFz9wp69EwytQJY1o2JCSXWs90oWzmEgY8XMHmxGL6zh9D/6RLKlnmxcUE3xsfjwbLemW8QdCaFdtTTwp2m6tZVcsV0zpJhBAx5EF91g7nxA1NZuchbPoqlcbLp2832Jlp6fB5S1wjl7PD/uHdOqMR9BWlyVa5GwZ4ixtVnQl6YgNvthsfjQaL4Dwwp56BIPk3YpHxt0L03lecI1eX5xHsNOqFoce7QbtmQuShRkiQpbShFReNbVH12orK5Eo5vDjx3OfH4w2uUc+WYTxIkW9dnLm55n6UVqsvzqXhA3t6OpQkroFPqoE3WYh27Dmq5GpqFGqTMT0GqMhVpqjSo49ThmMUJy5HQ0SHo7/8jE5jN9ULB5uTU77JUcluLS7ktlx9xuov3uM2WB1z2rWfctpIyLqPoYfjecNPKbb9SzuWV2LikEEeoLs8nqKkx0kBSba0+eZbgY2lo8jmI6DoQzaDiAURwxQqIYPPD0rEJhNsQwS02gQg2Pywdm0C4DRHc/gIAAP//ZO5DWwAAAAZJREFUAwDZGkt1z22opgAAAABJRU5ErkJggg==","ec":"data:image/png;base64,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","eg":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACSElEQVR4AeyUPW/TQBjHf3dOQ2PS1EkjKKEUQVGbtgxFiAWExNCBnYWPgIQEI4hPwYdg4AOwsgALDFHFgFSoVBQGqBIKDXFebR8XRxk8hSqX0Eg++7HP5/Nz/5d7LEvZVTXNIZnyFhP43wbGDsQOjKhAvIVGFHDkz2MHRpZwxATT78C1w13GEVvVTxTePWO59Hws+QeYzTugVLgphLRwLm6Tzm+hlB+O6U7/bvBqmICiUy/jtX/jt2uoxiF+q4LXrIVjrT9lDb1PUHeMnEYJBF6HL28eUa/u0GkeoZI5Esk8ftelXimx9/Yxyu8aAT5IYpSAEGjgFQ52X7D//glH319TLb9i/8NTDj6/1E5UUfoYLG7ibpSA0vvf91yEkKScK4jwgKR9XvcUvt/AdB0YJaD3B4HX0hgD0gub2E6R2fkVTufWwzG/W9ein+Aa6AEUMkHgd5ixl1BCIS2bdK6olQ8QwtL1oF3QNEydRh3wdLFaVoqF5btYM3O4lR3cnx81ERvnwjbCSmpyLiab/Pdkw2cGXpPC5gMCTtGpfdUF/UsXro7GN0QiTWHjoXagNTzRMWYYJZBy1phbvImgTaO2Ryq7jp27StP9gQgUztJtUvMrx4A3fKpRAtJKkHIukzl7Q4O9gxSeLl4Xp3CLdL7IbOYSQlqYbFIIiTAY1oyNnV0jc+Y6i6v3OFe8H/6F7NwGvXcm1+rlkibViOYS+EE/QDCuNkYC44IczRsTiOox+afYgclrHl0xdiCqx+SfYgcmr3l0xal34C8AAAD//4Xok1MAAAAGSURBVAMAyTRtWCumS4IAAAAASUVORK5CYII=","sv":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACVklEQVR4AeySX0iTURjGf/urW84UMzPXYopZRH8GBdmNiWIWkQZFERFY1FURQQTRRdclBV12E90HOiNqEGRUJBJaY9Oy1rA1cauGs625zbn6vHbwMb7zIYPvhZdzODznOe/zPEe/9uDgv1JuPSVemoDVDlBLQEtAoQPaF1JooOLrWgKKLVRIUPoJxD29qNZP9xN/1qEevzS7CgnkIfkG4kOw4Id8Rtq7IfNV4WcpfF28gMQwWLZDVQ+jgUZSi5XSvhcM0pr+XHgKBadiBaQniKZrGHwxQiqVxLXhJebkAJFojCev35LWNcDcYwXjrrwqTkA+BbkY7ncD+AP1BCaHMRm3YciYGB8f5ddPJ48890FnhKV5RJU4AekpPoTmCIfryf8N0lgbBksTVHezyzFNOBQkErEws7BOEvBH1PyIE2B1kcgZiUtBtDTNE4s8IPZpD2O+03hjfsqtZcQzGdLZHOjMiCpxArIhXI46sgYvUetvznsvc/z9Ta59PEL/xG6qnT6WDCE21TrAWC1qfoEJmB3Y+IFzox2buYbrWzu53XqU/tbD3NjRRU5XSXNDM+bFSVidBJAvs52+9jb837x4pu7yZWaMV74hRr4/ZHo2SN+BdijbIs9TBEJfBFYeat1LXYWJe2fOsnm9k+BsEoupXvo2du6c6MBmTEB5izxPEQixApYfXrMPrDu50nOVWxdOcenkMc51XQRbJ1S0LSOEtr6q243wPvR8JWehMwFvi09AqL/yZJoAeY/URWgJqOuvPLuWgLxH6iK0BNT1V55dS0DeI3UR/wEAAP//HjrigQAAAAZJREFUAwAaDYoYUx6nUQAAAABJRU5ErkJggg==","gb-eng":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAtklEQVR4AeySvQqDMBRGQ6Dd263FsR0d+gD1/ScddHMV3XwAHSKOchfhRCXwBe4Scn9yzvXhgFPn/1A+Ppto8uKATiF4l/jRB64WKAMyAAlohSBAnC4DGCEsIAMQIE6XAYwQFvDV8+tix9wNZqyp66P3WefWChnUJ1/IwMnATbv0DfzG1u2L/e9u2cuQumfv6H3Wub3plNiFPnC1MBmQAUhAKwQB4nQZwAhhARmAAHG6DGCEsMACAAD//6QDA90AAAAGSURBVAMAuEM4MsMw0/kAAAAASUVORK5CYII=","gq":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADF0lEQVR4AdSUX0hTURzHv+fitrs5Q31QQlw1hg/bi5A9BDKSoughC0EloszAl3qMiPC1QjToyQSJqBB6CHyO7A9FL2FRgTMiwVzT6aZzbe7OzXlv90wb3ty93svuHs7gt/3u+X3P73c+9/x+45qG2iX/KJg1bmbpJlIZN1j9cKJkx/eFQWxu8kwycPTUQtaNmcgt6jJneQB66qXEGSz+aacuU1YAoKdmcR4UACzOgwKA3gJr87ALgEKwNA9FASgEK/OgCsDKPKgC0FtgYR40ASgEnYfe5hW865MM2ZsrOby8GJNtBdQ3ul+vfk8ACnFtPIjppXXqapoobiL+awirs/ewGn6B1MIjCItjsj8hrw3Kdh9Uo5nEYFAXgLAhofPpLISsqJmeEA7E3oycsweWqlYkqrqR3Xde9o/Ka73gHD4QWaOZxGCQ06unN3B1/LemnBACvtoPh8MBwbKBU29v4Oz7fgz8eAbJSmCvOQZCiGYOo0HdADTxk08xPJ6MUVfVCCHYEHPonxwFTyzgJQ4D38bwOvxZdU8pAUMAtJCeeUjl0rjgOYmHB7sweqAHUt8HtDe20u2mm2EArROI4taMVFurcLyhBfW2GnAVFYot/zSKxRIeDAMMd7jgreeLlkyn0xAEoRBLRueQTiYKz//HC4ESHEMAPS21uHykVrVcJpPB2tqa/Fe5dROxuQBCP6fzekmSkEwmQTX5BZO+dAN463k86GjULFtZWYnl5WVEIhGEQiH4zl3H4dOdCIfDyGazCAQCoBrNJAaDugAcFoLnlw7BYdWW22w2eDwezM/PIx6PIxqNIr2eQSqVwtTUFNra2sDzxdvP4LkLcu0Tbcu0+n5bUvhxOp3w+/3wer1wuVyoq6uD2+3Or1mt1oLOLGdPgM65VzjR7UPIvd+QLXgasOJz5436Rvfr1WsCNCWCuPNl2KyXVZY8qgD23DpGPt6FXcyUpbBZSVUBbn8dQVMyaFadsuUpCkD7vis4UbaiZibeBcBC3+98AQoAVvpeFYCVvi8KwFLf7wJgre8VACz2vQKAxb7fCfAXAAD//5IbRMMAAAAGSURBVAMA4Rz0dZ0iti0AAAAASUVORK5CYII=","er":"data:image/png;base64,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","ee":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAgElEQVR4AeySwQnAMAwDg5fomJ2lY3aJuisYhAgiF/DPFuROdT3dyVMr/PGB3QIxgAGRABUSAcrnGJARigH5Bt67VvLkGxAruP0cA7sVYAADIoGTKiSiMp1jwAR2HFvd30oeKjR2bVrEgAnsOBYDY1SmRQyYwI5jMTBGZVqMN/ADAAD//8zqu7kAAAAGSURBVAMAUAFPmPWYRkcAAAAASUVORK5CYII=","sz":"data:image/png;base64,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","et":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADzklEQVR4AeyVbWxTVRjHf23d6JbB3rci20LYHBQyGCMwI4tsooRFP4BAIuODHxjxdYlGMAQEjJEYElEWPxgNhhgFP8yXRKODzaWii3NswmTiWsa6Uu3KVlo61rWr64v3Hl2zoFliTp1Z0ps8z33Ouee5z////M+5V2t8XR+dy6Zljl8JAv+3gAkFEgpIdiCxhSQbKJ2eUEC6hZIviKsCgYnlOG++gG3oLSy2L+i3f4T9xmuMeHYTDqdJQv3ndO3a9GRkbc0CPXf567nubMQ79jCB4ApWZbgIhfMZD1TiHt2Fw3mSRZp7pWvdiVX7/opsZOxIkRGr4wS9w3XsLvk21qbtRReoyBqMjVdneGizHiV3ooGTxjypmtPxSm+hFmcZ398sFUDDEQ1VuWZ0mjAFqW62FXaJ+UcWXUSvmySKhlPWDbgm5ov5eDgpAgNjeey9VBfDccpazaOF3VTn9WH357A+10J6kh9j+hBf3ygT6zy/p1HfuUfE8XBSBD4YrCIU1VGd/0vMPndUUF9iwhtMJTPZT+3dPXS5l7Aue0BRpJMNCrnmoXJsvhzicWllXmIbzyUYTlKAjrNHAV1f/A0bDVeUzvcLBdTttVVRRJ07XnGahqUtXB0ziJJqrggknRwBX64o/9mva3n2wuNkJfuIRDUcurydJnslB3/awZK0EdZlXUMl80DbQZyBTJFj+ytXDCScFAFDileUzkzy8djiDt601HJfTj9bCrox6L08U9qKW9nz71lrROfnaUNiveqmctVYxqQIlGde5575Tp5WgJ5zrqRV+SLpNBHevvogzTXH2FL4I2cG11OQ4mZAOfBHyj7huWXNAq+aKwJJ9y8I/L2SCqJ/bCFHr2zF6stnZYZddPyNNafZe3EX54eX8ZChl+XKV6jbU8z+np2cMNeSrx/FkDJKPC4pApsW9nJ/njmGY5vy82ofWcpm04viMB++vIN3r9WwSlHKuMARW/eyokRsIBlIEdBqojRVNVKU6hIwOt3FNFo285s/W/mZRcTcdy4jm9r2k6e/LcZPlLTxZGmbiOPhtL5Xg8hY6nEX58yH2Ojv4SvH6hgmnfZPAurErck02odL2XfrY461viNV706s2lBfBFkz/DxCk+kVDps/pGTcgS4SFmdABZ8SDlLpMfNlx0sc6DhDtC8kXW86XqktpAKcMo0Gnrd+Stf5BhwtdZja93HJ9BSOszs5+8MBKr2WqaVxvceNwHRU8yKTlN8eYHFgGJXY9Gfxjv8TAvEGOdP7EgRm6s5sPEsoMBtdnqlGQoGZujMbz+a8An8AAAD//4taYMEAAAAGSURBVAMAoh1st9mziEcAAAAASUVORK5CYII=","eu":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADkElEQVR4AexYW0hUURRdjRM9zEc+0Ex84ItQ1LSCSkPK34xC8SM/rEQwrYwyMK0vEysitRT8yIwKNCjLUD9K85V9KGgaYo6QZL4VnxNqOtPZA15UZhzvuVdFcODM7LP32mvvdc69HM4oEJin3cxDgU3+2RKw0Ru4tQMr7YCJYg40VsJIja3pDoQfbEKYb4vUHlfMl01AkFvnkkInPH7i5cV8FMbmIdijY0lsOXZJUOREFgHRx76iLCETFYmP4GozpGuhVuWBrMqTyPocijqVu85HMcKUMizl6JwSv2QR8KL+KExMNFAo5/Fr2FbXkhYKJL2NwK13ESCbnBRTbp+DUqkB5ZBP6pBFgI2ZGo7JDxH/KspoPwmvz8M1JQOUYxS8CgC3gBDPdmxja0s1hibNMKo2RVu/A01XHK29jhicMAflEJA4iItsnsEl4Kx/E0ric1B98z5cbIZ56upyKLc2KQMf4nNx2rdZ5xP7xSXgfbM/tFote5bn0TVsI7amgKfc7cp/0DCujy3+gl+MwSXAes8U3O+kIzr/kphaerEXCmLgdfceLHer9caNObkEDE+ZsWfYHB2D9sb4jcbb+hx078TYX1OjWH0ALgHOViP6uCT5eDlFCdjLtjktrBhV7OWNDa6R1PDiZOKqvPEAxE01FseM2aIEjLJt9rQfgJPVOD61eRnjXnWcuFysxuBiOwKqsepEBhQlgOGRXXkKlomZ2MFOU5rLMYjL8nomMitCRdOJFlDX6YHJ6V1oH9gnupihBOIizsYuF0MQg34RAgxybGiAW0BcSBV7jGYlN79DOYvLIV+4ebgERB5qwJPIQqjSkuFp189dnHI7GUd2ZBGIk4eIS0D5D2+UtXqjRnUAHQP8hxnlVjOO0lYfEOe6CZiY3o2w3CuIehYj1BRzEC3GEseZ3AQQp0AmwuDageX8YX7NKI7LQczxGlibTi0PC3OKEaYk/ikoRwhIMGQR0DNmAT/HHpwLaMSIeo/QTpCbCjQWHBQLD2yAz/5e/Bm1XHBL+pVFgEajQEB6Cgq+BQvN0KW+/FoWSq8+xuJL/fP6YASm39adJQJYgiGLgKZuZ3zvdsKbxsNCKzUqLwyMW6BvzAq1Kk/BX9R4BM2/naEatBN8UgxZBOhrQLFtHv5pqWy1U9nVU6MPIotvzQRotCaYmtkF9cxOdnNeszLsvw9Z1mHjSNZuadZJ05aAdVpog2X+AwAA//+HRo+2AAAABklEQVQDADR3Z2jxQG5HAAAAAElFTkSuQmCC","fk":"data:image/png;base64,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","fo":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAA/klEQVR4AeySOwrCQBCG11RaGGKTG4hJZ+WjtvICFrYWERuPIha+CsHOxitYB08QBE9goWIQxWYFC2GbwM5fxIFZmGJ3mZ/Z71tHE5ff3WjVWug4rOskCH7lNibf8/TxJibbtTmK+ZIH5C1QDIgBkIB8IRAg3C4GYIRggBgAAcLt/A3UeltVaC+t63x9ZtIrd9bWmZQ5+BuYH2cquU3J5emXYeJwX5GzKHPwN2DgY7jhbyCqjlTojcl1UUXDW9ONyFmUOSwMGHP+zcY57fpKx0Pr8iulzEek+4F1JmUO/gYyMTK4FAN5SxIDYgAkIF8IBAi3iwEYIRggBkCAcPsHAAD//x7At2UAAAAGSURBVAMAjy2xl6B4ga4AAAAASUVORK5CYII=","fm":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADFElEQVR4AexY20sUYRT/7c3ddHe9rV3cNXUxsUBTu1Jv2V0Iov6AosLosYeQCOot6CkoqKAgKCKICIp6iOihhwgrBAONvGReklBT191cm9XtnIVdBtnbzHyfsOTAx5zvci6/c2bOOTPmtlvd0VweZuT4tQIgXQBNJsCRJ9dHUqVv8hWgfr0zHUbDe1IBNFa70eR3GzYynQDhAMrcNrQd8OH8kUps3+BGfaUzRp87VIF1xfZ0tujaEw5gPKDg0bsxLEYBu80Mm8UEKw1eG5uah+hLOAA2cHZuAdMhBcpCFOG/iwiGeR7hLeFDCgD2eFGBFVce9+MyDYvZhHxJ2UgKAE6f118MYXJWwcyfCG68HILCz5Rw/wNSACgRegGWGJtsbckRXVMpAHRZopPp/wLgWmXR6afs2bTq0BSBXXVFqC3Pz94ajScrPA60NJRq4tIEwErp8GSLF9tq3Dixp5zaBJcmZckOb6R+6fReL3bWFuLMPi/yrKZkx1KumVPuqDYqyxw42OzBDlJSTPn9FCnk9Ng5MKs6pY/sGQlhZDIcc8jqwjxsrnKhdYsH/jWrkA2UjABYSIHDAl+JHSVOW8LKIFXbxMQgwZU6LqKQHOQrdcBJOrNBkBEAZ/Tu4RDuvhnFh28z4DaB7y0NJfASqLhivXdu/g6Txz/2BWKFr2swiDuvR9D1I4goK88gOCMANT9XWK6q99/+RPuDXgJjvL8JK4u4+LAP98hBN18NY0FjxdYAAHjeMY6hiXACU0DAY8QRjQvkbvXJ+1/xaVZ3TQD4xc1KqoFDAeqdtLBrAqBF8HKdXQGwXJ5OpUdKBOxUTVu3emAm6VxH9jeWgj9wUhlhZJ1UGGFPzjtP3wM1a/Nx6bgf7ceq0Ux/JqZDxlNuMm1SALCi30EF5VTouA2ZIpojweuih3AAHpcNF45WYXddUcLWJr8rFomc+K0yQd/B154N4uztHnzuD+DraChGX336HVyoEqgEEcIjoLbrE/U3Hb0B9ZJwWiqAL9SQdQ7kMIAINWZz9GNLuNtVAqVGQKVHGpnzAP4BAAD//92/rfcAAAAGSURBVAMAjtZe6LgJ+XQAAAAASUVORK5CYII=","fj":"data:image/png;base64,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","fi":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAtklEQVR4AeySuw2FMAxF8zLCK2kYAZZhC5iDAViMFWgoqfkUYQRiX6Ng6UZKZ1/L5zgmxWu6MYWmf/yKaHFLDM4fFygtkAZoACTAEwIBwu0qA/txwYOtAnQLnM4XsKJnkaMyYDHYKiP+2iFI/7JuWfOluZp6/wayUH64iAZKy6EBGgAJCE4InPRSu/8F0jwF6a+rfxZPaa6m3r+BLJQfLqKB0nJogAZAAjwhECDcTgMwQjDAvYEbAAD//z1siGAAAAAGSURBVAMAAIMjDZUJxWsAAAAASUVORK5CYII=","fr":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhElEQVR4AeyS0QmAUAzEigs4uyM6SXWFIxwipNC/9h5N3jFzLemFdc+5pN8D5tflAV/r04AGIAG/EASI1zWAEcIADUCAeF0DGCEM0AAEiNc1gBHCAA1AgHg9MIDfqgR4QAVrEKqBAFZlVAMVrEGoBgJYlVENVLAGoRoIYFVGNVDBGoQ+AAAA//85HqNsAAAABklEQVQDAG5id/mC11GZAAAAAElFTkSuQmCC","gf":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhElEQVR4AeyS0QmAUAzEigs4uyM6SXWFIxwipNC/9h5N3jFzLemFdc+5pN8D5tflAV/r04AGIAG/EASI1zWAEcIADUCAeF0DGCEM0AAEiNc1gBHCAA1AgHg9MIDfqgR4QAVrEKqBAFZlVAMVrEGoBgJYlVENVLAGoRoIYFVGNVDBGoQ+AAAA//85HqNsAAAABklEQVQDAG5id/mC11GZAAAAAElFTkSuQmCC","pf":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEdUlEQVR4AeyWa2wUVRiGn5m9dbel94KUuwWqhDa2lrWlYksxQIhoDISYGE2IP4xGa0ywKC3EBBLBmJgIGEyw4C0hSjT1hwJKUYSgSIsttBRa2Jal7fZmt+3W7s7uznh2gaQJvzYzhDTZyflOJrPf+57v/d4zO0e+MT9Vm8ohM8WvuIAHbWDcgbgDOjsQ30I6G6gbLi9wDXO/Yva1frLbPMztGLxvaxi7hRQfoWvHGN1fxMTFeq6tWcOZjRvpaTyN79Aawr1NqEPturs+mcAwAWHPJUb3FREedqH2teA6epT0U6dYsns3M+ROQq7TBM4fYOzz1YSu10+uQde9rAt9Bxzuu0yw7UdUbxdh93nkzFw07GQAw3V1KP/eREp6CC3gQ/N5CDTUovm94lf9wxABvi+fQwv6kZ58lyF3G6Y5TiTJiknUt7i6mvY6F5bctXg7LxKY4YRwiLEDpaCpIkPf0C9AGUeyJRH44yNunO3jVucigh1ii2iacIGoCItsF89O0ustwtWUSfBKXVSwOuLWV71A6xbw37EqrPmbsFXswGZzkGLPwjSrCE1SBP3tIUkh5NR5JKXNxzEtC1vZe1iXbmDi+LbbCTpm3QJU70389bsI/P4B4QGf2O/9MO4hKf8x2p1Oui0WFFVDMlnQvCMEegeEWx8SOLeXYMv3aKPdOsoH3QIsORUkVGwn4amtYLLiw8rFaetpsjhorKzk5P79XFqYR4NjLWOKjGQ2Yc5ZJVx7AdvySqRp2Q9WgNL8rXBgJ/5Tu5CCAWRHMl/Xt3P67HnaO67jHhikpdfDNydbsdkT0cJBQu0nUJqPELz6M+JtR88l6wFHsSXvkFBejVJcgype5p7+UYrXvY43+WlS568UUc6Qoxzn2tfo6hpAs6eglNREMZRURSn0TLoF1F5ZTFXDSpYfzOHQeC6lrQ2kXm9iyVgb46MKQ94QucNXSOu6xLKOZo6q+RR/lkNV4yo+bV2qp/YoNgYB0fx7popls2h1DfHMijlkFRbSkz6dki0vk9d4nKYejZZbExR0XuCJt1/Co6ikFC/n2bI5Ucz6snn38MX6QJcA8VfP7OkO9lWtYHDYz2/NA7i37eWnrXv5oqSSvJx0HpmXxpHCV/hl6ycMfHwYkcbMjERqt5eTneEgwhFr0ZPzdQmQJEhLtnGje4zkRCvZ6TbeP3yZXy1LSExM5K/WQf683I/ZbOY7/yJ21F7FOxrgVt84QyOBKDbCMbmgWO91Cbi72LrSuex81UlGsp3CXHECEm1VxTFBEuxmiwmfPwSSKj50EhNKiOrNBRRE8tB/iSX0k0QYMlJt7HmzmD1vOLEnmDlxzo1JFscJVeXMPx6mpzr4YfdqDomtkylyIxgjwjABkWLMZolMUei+LaVc+GoDNZsf561Nefx9+HkO1pSRnmLDKhwxi49ZJN+IkF0L0jAyOh9Oo+/RLHwFM8lYt4jcF/PxFc7EvTDd0HXu1myoA0Z0NFaOuIBYO2Z0ftwBozsaK1/cgVg7ZnT+lHfgfwAAAP//7VweSQAAAAZJREFUAwDCqm/XRBulSgAAAABJRU5ErkJggg==","tf":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAD2ElEQVR4AexWeUiUQRT/uetZYoVSf3SSUmmZlpZpVGr/VRBUVlR2bVlpB5UdGLmKdNghFBWVaUF00YFiF6agZlZmoXnkkVfqKua5rvexzczqurq7aH3kp7Af+5t9896bb95v3vtmRgDL63JtSEmvlGt7ZOJgebW1s0bU+Z3V+k5tc/2rXoAR/ugI8J1AXQZ0GeC4AroS4riAnIfrMsB5CTm+QJcBjgvIefjIz4CvyA7aUFbRiIRkiUZkW86HZJuXRmRZOnBe2cG+QHApLA3asHrvayzbFKERjoG5sA1t0giXsz8HOz9nP95LyHeXPQIOLhgQO9bO0kiWdwJSWRvEhMBA+CWRDR8CY0wNIRTosYBuP86C2+YIJaJii5g+VEXvtOYZYj+WMr3FOGMoRrIuhjwDNlbj4OM5B95b5mDGtDEsirjPEvRAUtnIdNOnmMHVaSIcbccj+Xsl082daY4jO+2xY90sTJ9sBvoMOYGaulaIPGywe4MNqmpbaAx9oKen6C53mcRKq7WtU6EgbZ20FdvJt+C1cTYZ20w0+JsMMH/OTU19C24+ysC959moqW9l7xN5WMN90UQmy+XsDz0l1NTcobTVEgIh4al4+iYfUlk7cxzyDLS1d+FiaCpCwtNYABPMTXDZbzHCg91hYiRETwYKS6XIK6pntjvn3GBkKEBDYzsu3UnF5bBUNpY2Q06ATqqKq/5LkJ1fCwN9AYJPuKAnA/T/9hlX5BfXQ5/YAg4uVB2mlHklsNJ1KtavtII52VloRAe22sLJbgIVsXGVFVYQ+1gzI+gRzXGveaAfMRH7/HgjYDrKADeDliHuUxkeROYi9EkWsvJqYW9jwQK0s7ZA0rcK3I/IQdjTH0jPqUbYeTdGhjl0N7wRMDEWwtM3Bmt93iLg6hcGb3F8d1hAR0cXPI/GMD21rxC9xLHzSRhNiCudiMAbgd81LaB7P92JaP2TWBBPLo6R7wqpiGv301FQImUytUsqm5i/rEmx+zADaXgjQOZW/oIOL1TKdJWrCDnxlWSl7vR+R6XcX+CVgJmpAe5dcMdRkT1O7pnPrhd5ZNdx9njO9nljQyFCyBZ7ytsBF044w9BAPVx1TX+K/7FPD6N4co04FJSID1/L0dmlOMWKyxrYrC3kFE5MKYe3fwKoHz1DmEGl4ZUAjeMuOZFvPMjAexIo7VP4H+gtmRfRBbj1OBOv4oqpSQ28E1CNaLSJPm4ELoXfPgcEHloAfSE9AVQ91OVhRaCR3HtoyfiIE0hJVaCjU1FS6mH3aoYVARrWw6g8ctnLRHRiCe0OiGFHYMCI+zn8AQAA//+MWKQkAAAABklEQVQDABNw7KiK+Wx1AAAAAElFTkSuQmCC","ga":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAg0lEQVR4AeyS0QmAQAxD6w3lCI7mHu7hAk6lKxRCKMF30L82cO9l7Ve9ybMq/PGBaYEYwIBIgAqJAOVzDMgIxYB8A89RlTz5BsQKjp9jYFoBBjAgEvhThURUpnMMmMC2Y9d23pU8VKjt2rSIARPYdiwG2qhMixgwgW3HYqCNyrQYb+ADAAD//xw8zHQAAAAGSURBVAMA0SzHyX/eMYsAAAAASUVORK5CYII=","es-ga":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAFMElEQVR4AcyYa0xTZxjH/+cUeqEFL0B1bIoyRsENppFNjYmYbER06ERxyxIXmZhlS0zMzBb44If5QXfJrjLMSEwwGc5sI45twCZZhOGGgsCGyGUVBCk3wVKQS++ne59mhy9Aewol9KRP3/btc57n+ff8znuec3gU1LtmM47N59zsddmcgiuQNx5zbC42/1HTILaWtMMwYWPfAvM1pwCx3MaHU0gqbkVF7yNxKqBGrwKo2lGbE2nld5Fb2we7QMeGZgPDJAmgUqnsQESKL0yJhlLGUY2STESqpHtUkv9iO/FZugjUZSTgmRVKybkIqYyKThz/q2fJkXIjlLhS5RZxJC5csghyzG8Z9rhK9Xb+AkEQyHXRzC2AoquCeFzcuQ7+QIpdN2A2m5F9Xo/SG3o4nU5KsSg2LUCMLiIVG6YQp7yO00j93oa/6wrxx2+fouLnM8hK1oAfLEbVr+dwq/oT9HTfBonzGtAHhxkCaF9CqvFAAnxCiqFiaLuC0w0m9N42YEWdFYrOfxF2qxOOgSGEP7EXw/e/h9FopBR+s1kFUPRQucw3pFwuPK0axYvnyhBeVQhFwTcIc+RD/W0Z+NLzMCbtgtA3homJCQrvN5tTgJhBMlIyGUrHlEh4tQfLdkVh8rUHkK+JxejuYYTsXQdrWi8cjjasXbtWDO2X0asAyiIVqWZVOu51m6C32NC2cQuMBsCQpEXTlAqG1QJit38NnpeUktJKMsnRJCElOHBZcQh9V8MxkaeA/lIkhvISMF7kgMW+E0rtKtjtdkmFSXWSLEAMOCdSdivwpxGVo/twSnsauRveQU3mW8jRvY3c6PdxdCwHYdnVyC/Xi6H8MvosgLLOhVSUyorc7RaoFTJEsiv7jqdU2BYjB4JDsDVqCkeTzPi8+QE6HzGxFMgPxs83xqxIUUtFxoIOW5X47g7QNKIBOA48M7ZQoZfdWzzL2nN/9VLzFoD/NxGpmFAF+i1qfFgtx6SggG65BV8e0uJMKnN0Cajp16CwOQQCJ8OkQ4DYS1mcLuYw/9eCBVBqQurm/nhsWTWBz/YIWKM0Qe1qQU27AXd6uhEpN+AV3ThOpVgRJNhpF7dRL7X5SuuCkPKLAKqGkGp/qEBlpwMD4za899xZRAe9ifR1uUhaVo9rXTyu6gU4uCByn7ZWkwULQcoHAdM5Z/3AcQz+ICUaB4LhCF6FgqYsdyfaYFiP6yO7MepQocPE+ituZsqFIDUz2qzleZ/kOA7JEWN4dweHKOUkqgbTMGjSoPz+S7A5lcjUTeL4NieCuLlXoPkg5TcBMtZKuFQRKKq3oH+K3Ryxk1VvisW98ViAl6GsIxiXG6xwrNB4/DdEpIruSmv6/CogN0OHhiG1u2A4zYjX9iFa0+UueFzQoEPOig8NcX/39EZIvV7ZjcPXumBhK5YnX78JoCSpmx7HhWNxCOFtSFn5EzuZI5EcfgPBZgMObAzBy+l0NKSnvNQxgs0/tnlcpaRHowolWHZqDHrytuNY5km4HvsKickfo/aDVPxwMhkle+JwYUc0VD48RPCGlN8FkMbwZWocfiEeZ48k48T+RGyKWw2xC82Oj0Ate4jgyx2fJ6QWRQCJ8GR04aM7voPrl3tym/GbiFTLiHn6tyURQNnpwlec+iS+2LYGcp6jKUlGSNF5Ia5SSyZArPZEohbX9+kQE8q6VnHSy2hl/ROtUm9UdWPJBVCtz2vV+OfgBviK1EW9MTAEkIj5IhUQR4AEiCYiJXWVCjgBJISQkrpKBaQAEiEVqf8AAAD//zbJprIAAAAGSURBVAMAhb241uLPE3UAAAAASUVORK5CYII=","gm":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAmklEQVR4AeyVsQ3AIAwEHXfpGYRRWCCLZQvaTMEI6RmCLEBnYevJI32DZFv8GVuHyECWCvjhA6IBkgAJGB1gCxkNNIdvQAB6Dw/BJ1Dr25ClpTwZWfgtZJ5jwQlIIBjABmM02kFr/T/9AatXa+LxCfR+NWRpSmdGFn4LHfchyMInsGa4+WUlAT+v55VIYO6L3y0J+Hk9rwRP4AMAAP//tLd7UQAAAAZJREFUAwCoa1znUl8bxgAAAABJRU5ErkJggg==","ge":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAC4UlEQVR4AeyYu0sdQRTGf1wCeUAIeUJCUiQhjY3XBz6wuZZ2dipYq4XYWCgo+NkJ/gX2oiCIiPY+ChXxCaKFoiKihQ9UBO2MJwdJ4y4D7uWiuDBn95yZ+b759swsO5O6SfpqbLy5gftLQ0PSbDcpHvn1LCDXCQzLQF4efPoE8/PZH+/0NHz+DAUFQVxhAn7+hJMT+PMnCPRBjYzr+DiYK17A16+QycDuro+ppQXevYPxcfeTtKOj8P49tLc76sYGZDLw/bv7ETZeQOq2emoK1te9e38/XFzAy5fuJ2lfvICzMxgYcNS1NTBui3vkXns7wnvjHhwagqsrqKtz//ISlpagsND9JG1JCayswPm5o9bXO/fgoPsRNl5ARQW8egX7+9794MAX18eP7idpbeHm58PenqMeHjp3ebn7ETZewF2n3l6YmIAvX+4i2bt/++ZcPT1BHGECSkshk+HfAg6CfUCjDx8gk4Hi4iCQMAFBULlp9AQESCCBBBJIIIEEEkgggQQSSCCBBBJIIIEEEiwsRKdicREkkEACCSSQQAIJJJBAAgkkkEACCSSQQAKJFN3dJFpskFESrC5hvicwhaLe1iOJP2cg14l6Ahno6oKgEtiuqCg6KVaXJNctVorbb2miJe4XwAQkzPcEplB0wh9FTVgGZmdhchJOT7Mvyvbek5MwNxfEFSaguRkqK8E2GUGwD2i0ve1cra1BIPECZmbg+hrspMDgfv+G5WU4OjIv2WKYq6v/uX79cm4bQwxTvICaGnj9GoaHHcKebT9sP2UeSc7amVM67WdChmoHCMZXW2teZIkXkE5DWxvYXtUgOjvdf/vWvGTLmzdQXQ0dHY6bTjtXVZX7ETZewNgY2N70xw/vbmvBfNvseyQ5a2tsZASamhzTpq1x9fW5H2HjBdx12tryp50dv2fTbm46eiBXmAA7JbMT/7IyB8+mtUwYl30sAnjCBAQA5arJs4Bcvfk73r8AAAD///ats8wAAAAGSURBVAMAl43hQqCv2LEAAAAASUVORK5CYII=","de":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAeklEQVR4AeySwQ3AIAwDU/YfrTtRj1DJQpbFQfiRRLnLmnl289MAU30YIK0PAxgwCbBCJkA7HQM2QrNAv4E93bffgLmC8XQMpBVgAAMmgZtWyER1KB0Dh8D+Lrvm1d/ixwrJXzQwEMWv5hgQhGhgIIpfzTEgCNGoN/ABAAD//3lSdecAAAAGSURBVAMAN8W2KbzXbo8AAAAASUVORK5CYII=","gh":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABzUlEQVR4AexUTUtCURA9zzI/SkijJCIIgiCEINq27BfUMoLaFBSEkbgqCnd9bosWSYsWRR9U20IXRa1Kd7VsUwsjAsl4qVnzwCciybV7LyFcYXDuzJm5c+ZcnuXW3ZWrZrOgyn+KwH8LqBRQCnBuQD0hzgVylysFuFfI2aD6FeiJvkGWWbdfQCarP/WVqsDRuQ4yzldStlw6geMLvewAvElpBB6fsog/ZBG7z4J83kF/qxdCQP/MYSX8jtBGwfxLSfPOmeVkUW5tJwWqMQEcjhACtjoNgwM2nER0hDZThp1F0+ZYp5G0EaMcYYZ+sFRjAjgcIQTo/s72WtzsujE9bKdjiWlaDv4Ru4HpaKspyf81IIwADWC1algPuhAYddCxyIJjTqwGXCBMUYLzIJRAfpbrWOH5mLF4aSyf4/mvgADbNc+JLK5iGdCTWZh0Ym7cYfiXd2kkXr/YmlSAEk6AvvutzRoi4UbMT9RjcarB8L1NFlCugtmYoMIJpDNA/NCD/t46cwDyYwcefOg5MybKsdRudUOkzab60LLnK+np3feBciLvol7CFRC1WdY+igDrpmThlAKyNsvaVynAuilZOKWArM2y9lUKsG5KFu4bAAD//07JaycAAAAGSURBVAMA8wpUCP8qR5MAAAAASUVORK5CYII=","gi":"data:image/png;base64,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","gr":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAuklEQVR4AeyXwQ2AMAhFm951NifQ2ZxAZ3MBvf9DfxrIRxKa9ECgIrxfkvZlv97RfmGNYiN8vSVfVUA0QHcCz7k15XYvQE2kClB3HPN1plc8wOLX427KXRJCQmo7PwGmV+woi2d3xNufnwB2OJtdBJAYuyPe/iKABNR2fgJsLmNHWbzaP0EAS/mHXQVEc+jec1n9vZJQuISif8Can76J1XN9Nl/dAasErOfzE1DPbe98+QlYNRh9Pj2BDwAA///FE3ndAAAABklEQVQDAMKOXRcNS923AAAAAElFTkSuQmCC","gl":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACxklEQVR4AeyYS2gTQRjH/+TuXfCmV6so0ZvgSfFktUbvioJoRA++sAhiox7qA/GRogcRH8W3IlprbSsG3wiaQJK2JmleJE3Ma5smm6Qbd5ZukZDZZHdnLYEsfJmd3e/7z/eb2Sz7jana4ocJLX60ARZ6Adsr0JIrIOSmkbr1DH7LQXhWbYVz8TrJPKu7pGup288hTM/8FzZVj1Bl6g+iR8/DtWwjQtYe5AYc4CeCEPIFyfjxSelaaN9puJZuQPT4RVSSaUNBmgbIvf4Ad8dmJK7dR7XIN0yqWigiceUu3Cs6kRv61NBfq0NTAInLd+DffgjCTFH1OAKXh3+LFcnr/apjmwloCJDuf4XoiUvNaCn6RI70Iv1gQNFHy01FgKL7N4K7T2rRrRsT3NUNfiwAlociQKzHznIsSStm65NaVj9UgLL4xsm+GGE1zrxO5slbVFLZ+b7eEypA9tGgXm1qfOYxO20qQObpEDUBvTeyDLWpAIVfXr15UuNZalMBtLzzqRnX3GCpbfq5yIx61hF3YCX33RBbHhyuO2a9PBpdo65AJZGqmTd23XIsyUyMClB0jTMbpFao6ByrvaS5TwXghr/UiLLrcu+/MROjA4wYCMBQmwpAvu250a/MZkoWIp/WJV9Y7upuqQBEOWy1QeBL5JSJCWKNEBaLHSZicyKKAKVABKG9p+Zc9TeTO7tRjk7pF/pHQRGA+GUevkH02AVyqssih3uRezmqS6NecEMAEpS4eg++rgOY1VCoz4obAL7O/UjaF6giIwDEuMGP8Jotqupb8of1rt0B7t1nImGINbUC8sjlSFyqbyc27UHsTJ+UGO8NSDsSZKuF9/jBiQV8zGYH8SG1MImR441oVQHICeQdPxA/ewPk0fCYt0l7Qs4l6+FZY4FPLODj526C+Mj+RraaAIxMSK12G0DtjLH2b68A6xlVq/cXAAD//3IV5osAAAAGSURBVAMAAKYTB5Qcno0AAAAASUVORK5CYII=","gd":"data:image/png;base64,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","gp":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhElEQVR4AeyS0QmAUAzEigs4uyM6SXWFIxwipNC/9h5N3jFzLemFdc+5pN8D5tflAV/r04AGIAG/EASI1zWAEcIADUCAeF0DGCEM0AAEiNc1gBHCAA1AgHg9MIDfqgR4QAVrEKqBAFZlVAMVrEGoBgJYlVENVLAGoRoIYFVGNVDBGoQ+AAAA//85HqNsAAAABklEQVQDAG5id/mC11GZAAAAAElFTkSuQmCC","gu":"data:image/png;base64,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","gt":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAC3klEQVR4AeyUS0hUURjHfzPqjM6j0inHnJyJcELNyDQD7UEPNNKNlRJEbhLCrZs2BUGbIqhlLVslBdEiaqPRQsgiAyMw8zGOzyltHL3OHR11Ht0xdNFCJu4ZKrj3cM49j+985/849+rPPvwUV1PjKh81Zyf26vnPH43A3zZQc0BzQKUC2hVSKaDq7ZoDqiVUmUBz4HcB5UVpY8oz/ZX50OzGOBqLEI1HN8YiOsIc8Pr6efD8Fi/ftW/gev/qBS2365gNTq/NDU/0cb/9GoHgzNpYRCOMwGdPD7aMbE6XNTDtec3Yx5s01OfTWl1DR+9TggtzOPMKsVns9A6+FYF9LYcwApHoKmMLI2y35RHPdGDNyWF1KcCRCjel5PJhpItMg4nFlRB9gz3EYmKukhACs9J3xn1DFDnL0Cklz1GMLtNFXKcnpKztLdvBUiRMJLbKjhw7Npv93yIQV8yUFKBW81alB7IsY7K60SkE0tIMLEkDeEY9BGQ/WYYt+HxeViLLa7FqGyEOGDKMuAsO4g/8+jiN6cvIMx1EwjLSzCTB6QnmY1OYjVbk0BwuZzGxeIK2WvgghEBWhom5cIDhb19I/Cq733RjyG7GzzmMrjb6vPvJNRcQCs0zNNnHNrMNo0JaPXxBBDIUMI0nrrA7282dtotk5+cSjsZx5O/EO+lDMslYJHjW9YgSZwXSYgC9Pk0E/j9xYPPz8ra7WBjwshRUVB68x5POu1gtFsoP7GN+wcto52P8/YMYTAaaTl4lTZ++ecIkV4VcofWzKqvPsKv+GF4pHWfuXgKSn6kf40QzzZgOleLYXURt5YX1cCFvoQTKq2qoP3oZi62EU9VNhMMhxeJ0Ch1FVFY103LpOllGixDg60mEEkgkLbAX0nr+BlbTNvLtLvbsclN7uJHj5XXolJKIEVmFExAJLplcGoFkVEpljOZAKtVNJrfmQDIqpTJGcyCV6iaTW3MgGZVSGfMTAAD//46QLTcAAAAGSURBVAMA1Ppx+CJFgT8AAAAASUVORK5CYII=","gg":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACUklEQVR4AexYPWsUYRB+9uPN4eUiuRQqVsGPzgiSgKKN/gDrdClsLCwCdlqLjZWIhY2If8HfICgkCGrnB6kkSkhCvJxsdvdeZ/b2dLOGd3LcLF5gX/bZfb9mnpl35ti59a1i27ixaNfbc05sXF9UZLTWxxFv6g74pxK0nm5h6tnmPrSebMI/maofl7oDvfUQ0csmwosxwvkcF2JELybR+x6MvwNsYfy2geS94W6G+INBvNrI+to39QhoGyjpqx2QTqjq9ToCVZ+wpL+OgHRCVa8f/Qhs3bwFLaSf1gBr+ygffT6ffl5T42O7/b3XK3Ah+fLGuV6UtbtdwPP6QKnl87ynKOPqp19lbjGFmvd3YBaikjXVD83VCMfu7YhEogMelTCtx9v7KstypXnQOLy0R+SUTrAw1D9oj2uu9WgbzE1KnJfoQCZNTvypLAcVpvBEppnSCYTA+1uZCnIDHhBnxi3cMhphz1gvH84B+gkkqwbDAD32u59CSO1QsswD4mQNEkQHLCnqLE/j5+2ZoZC8myBuSh9KoZj6w8p37k7DJixPahyX6ED34XHEK5yQDi0VLPGfol8PpkTN/sS1BbgQnr3iXC/KepPN/kvMcuqUuHmOwHuKMq5+cEbm9tuvnkMLwflZIH9hodzy+eDcrBof2y2mUNmOcRvXDvzviNQRqCMw4gnUKTTiAY4sXkkEzOUIIX3QHVhn5mKY+WgwVH2qOxCcTtBY6iL5WKheqd9Y2oV/IlU1npWpO5B+C9G50/6ncu0sz6D3I2BOVag7oGrdIZT9BgAA//8fpxDTAAAABklEQVQDAKe3nvz9BrvkAAAAAElFTkSuQmCC","gn":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAgklEQVR4AeySwQnAMAwDTfZfoNO6XUEcogQu4J+lkLucnVk0++XBzDNL5szlxwf8LVADGoAE/EIQII5rACOEBRqAAHFcAxghLNAABIjjGsAIYYEGIEAcDwzguyoFPqCCNSjVQACrsqqBCtagVAMBrMqqBipYg1INBLAqqxqoYA1KXwAAAP//UtjfRgAAAAZJREFUAwBto2l5Ofa+/wAAAABJRU5ErkJggg==","gw":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABx0lEQVR4AeyVP0vDQBjGn6S1bSyJf9paxYqUol+gg5/ATUQUO7h20n4GF0fBwVU/QCexuiuIOCp0c5BawamimNZWTdOcFzURiUrgCE3lQl7urrm7vr/neS8RL4amCUs8bI8f6+UR0q0Q0eMXB+i2gdwB7gCjAryEGAVkXs4dYJaQcYP/7QAhBPuvj4waebv8TwfK+jOKLz0MUNLqqBgamsTwVkaG3X91wCyfE+0JBgQcaQ2Gv/B2qQ1wZ7Sx2rjFvHqNnFrFcv0GKk0fINhq1bBSr2KRPlugseejsrIBEmIfNqNjSApBXNGyqVAgQIB5NSjEZUdDzdBRkOJYigyaP/sibAAzG1kMYFeZwEb/KB2Sz6ANvTMU8GAgjdmQTEdfd66SRvA827X4BmClNRUIWV27TVGAmBi0x37p/AhQ0tT34skGJBQiMZhpn+ktX76NHADm2+e03UQ+MowdOYW8FENRmURCDOLQhx81B8A96WBdSmKNHlZB+DjEmUAYJSUNmR5wv5SOlYcDIE7rfCYUtZ7bbR+FmQsr9tgvHQeAXxJzmwcHcKuUV/O4A14p63Zf7oBbpbyaxx3wSlm3+3IH3Crl1byed+ANAAD//0WOQAYAAAAGSURBVAMAJukCHyo2H9QAAAAASUVORK5CYII=","gy":"data:image/png;base64,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","ht":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACbElEQVR4AeySXUhTYRzGf56hSH4lWkIWzplChVGyi8SbIWVCECVRLIrsJgYVdNFVXXXRTRetpI+LlFYXBSu1IkIvCoW6GW2CqATlhuRwTZ2O1H04d/IMB3ozNs47YnAO/M95+f+f93nf53mOhP65nMslkeOPJuB/B6gloCWg0gHtF1JpoOrtWgKqLVRJoCWg0kDV24UlcP6kgbs3m7bUnRuHuH2tcUtPwShY1TffIBAmoKO9hltXDybqyqVqglV9eLDiXr3HUtU7LJ17EjMFo2A3zlf9ESZg801KC0u42HyW5QIdUkU55iNnUHqbMaLWkiiiJE88MstQzzP2Vui5bjRhMbbRUFnLcE83yiyJE/UVKiAe9mHv/oLNqcP+ppeGvF/sK/Bje9XPS5dM34uhdRF+UXdP8Eiji48RUUdXJwn4osx7R4nGA/j7Bwl+cxAY/MjCp8/rvTkCUyME52IoWBFnKhzCEoiHQpTtrMQvLWLc/p7d9Q4IlbG2XMxxw1cOlA7g0y2xraSYeDiUcE/ESxJBonDIyCys/CG8K0I0f5pIzMPE2DDjzgFca26kwt/k1en4G55FlmPKFiGVgYDU51km7nPi4TF26A1M153idWkj9rrDfGhqwaE/jbe2g0hRPm1d7TyasaUmy2AqZYBNCW3xVtIqNRP4/pMSzzz7I/UYdDVUy9UUzeRR6Pax4prCFG+ifLwgJVcmQ2ECWns9XOj6gdk6RueTSS4/dXPO6sT8YCSxTvaUvumtO5M7psQKE5DylCwONQFZNDctai2BtGzKIkhLIIvmpkWtJZCWTVkEaQlk0dy0qHM+gX8AAAD//x6W/WMAAAAGSURBVAMASrhlSOkLKt8AAAAASUVORK5CYII=","hm":"data:image/png;base64,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","va":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADdklEQVR4AeyWX2hbVRzHPze5W5o0t+m0TTUxbe2fsFULXZsy59gYFtSBik/zwb3qi0NF8clHwReFvQzqw/zDlKE+6ItY1lErOK2tbjatVEpa1iZuWdfbdLe33sQ0uXf3lsFebkq20eYOcuAHl/M7h/v9nO/vdzguYwFjW8PY3uHiAR9VgEobWHWg6sB9noCjSiivLbGRW7krJEcB3Fy9gao8oAB/Xfyca/HPuPLHINNjZ8t2wREOFAs5CvJvFIo53IKClh5BL+bLgqgogPnIIJvNmkIFEAr8l0mxlkljIJrvG2EzZ61hi1ERAEvUglkuijzP3+ffYvbS1xiCn4ZIN02tB3DXBJkZ/4Lp4Xc3eyKZTJpAhi1GRQAEQcBf3058aor2g+9RHzqIpzaIcvUXluYusNtTS0PLEdr6TzL5wwl8NbsQBME5AJaSmxthjP9XmLp4hrXUMJH9b9A28CXR577i8f43Ua58R/zXc1DUUBa/tbbYRkUcsEpIlmXyYgtS63FkxUBOjqH+O4ya+pHriSHk63Ps8a2Rz2VZmfveeSUUi8UIh8MEg0FC7YdQi48QeGiAWm8j6uyHPNbzOo3NB4hEjxB75SfnlZAoinR1dRGJRAi3PEFbKMDMJ++QPPU2nceGCLf2Eul+lejRj3G5XLblY02WzljZbQ5BuN2YhQyJocPoqZ9R9AFmZu/cOoJwe00JLRUBsHrgRnqehclPSScuMDX6EW5fBy3NJ+hsbt0sl/jYN1y7mmRxcRE5Ne6sHtB1nZV/zrChLVPjb8TX9DTRjlPUPTVAfV8fe1UVn3sVr08in8+ztObH2mNnwl04YLf93ubWly+jrc4iPRxFSYxSHBnEpWmIkoTbbGpPIICWaiSTyeD3+9HM3Pr6uu3PKgIgBfsQ9+wnPXMOZfJPpOYX2d3ZiWE2q24KFUIhmsQiavwy6XQaj55CkvzOAbBule6j79Nx+AP2vjZI5PhJNkyh6sQEyvg4+vIyj77wPPuOPUs0GuXJ/pfNm8jtHABLiQUhNezD461DNK9UX28vdYdiBF56Bm9PD7u8DWYusFlC1lprj11UpITshFhzucQlstMT1mfZ4SiAwtnzGL/Ply3eWugogNDoCOHTpy1dZYejANxu+0bdisZRAFsJLZWrApQ6mZ2arzqwUydd6j9VB0qdzE7N3wIAAP//NcddJAAAAAZJREFUAwD9s9fIXrD8BwAAAABJRU5ErkJggg==","hn":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABfElEQVR4AeyUMUsDQRCFn3cXNQh2wYtaBO2j9v4La+208q8FUliZUgv/gKKVgoWQxCYQsfA875FiCOFub3fAuLghk0xuMx878x4TpTfPuc8RwfNXaGDZAgYFggLKCQQLKQeoLg8KqEeoBPivwNtxB7bxWtQwbOvK/k8Wo+y86rmTAlfjKa7fP5TiS7mGZ91AbzTF5dMY548jMJdruGVkkHfhyLNu4KS1gXQ1RiuJwdzt2lJFBnlbDTeedQOTLEe/20b/IAVzucpidjf5BGPxRJ6QQV6va+ZJlWTWDWzGK9hdi9FZT8BcUPMZrXF2P8Tpw7DSamTU4c3T5Zd1Ayz9Kj4YxVfpm9bIkCP7zo1WI4tRCqs4cGqgztagNQaHOxgcbRutVodX1oN1A7QGt4ZpC9Eae80E+82G0Wrk/cIWms2A1uDW+BdbaNZy9Set9ie3UPW15ZRWU22h9u0LfI5IZuFnFhpYtm5BgaCAcgLBQsoBqsuDAuoRKgHeK/ADAAD//9UFeS8AAAAGSURBVAMAo2+UCLHBlrQAAAAASUVORK5CYII=","hk":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEXElEQVR4AexWDWwURRT+dvZ+9q5ce3e1taVQQyQIREiIMQo2EFBIra3xNyLa+outxWhTJaA2Vi01omhKjSQlBsGiErUaQZJGsKYiCqIWoUggQEDif8PZ+//ZvXXmqTSkEnq7d5Amt9l583b2zcz3zdv33rKBkun6aG4Mo/zKErjQDsx6IOsBkyeQ2U9IksDGFsEyfSoydWWMgK3iOnj2fArP7m4iMaoIOJ+oh2vtK2BFhYCqIb79i0zhR9o9YKucD0dD7RBgqwWWaVOGntOspZ2As6GOIEbXvYNE71ekW6++gvpMCMMEpIL84XicDsiTJ/4zbrGAeT2k64Eg9ZkQhghI7ly4Xm0B7LYzMLF/Sal7+2G/6XrI/NPR//IjtnU7HHX3wP1ZF/KP7ObBvQ25G16D9drZZ8w38mCIgHzJeFjnXgNvXw/ytmwkQDkty5H8YwCIRgFdh5TrQpwD982/Fbnr2+FsaoR8GfeOooAVFxJ4QcLZ+LAR3KfnGCKgx2K0gABpmTGNACn33YmcpUvotJk7D9rhowjUPg5XWyvkCaVkL0Si50uEX2wXKjVHYx1s5fNINyIMEdAOH4PuD9B+ic93IrJ6Leki94eaV0IPh6F+vw+spBh6KAzt+EkgniAb67wyyBMnkJfEQJK/cyyuFqqhZogAkklE12+iDa1zZkJyKEBCBRs3FpbLp2BwYS0nEYGwCz72NAZvrIZvVgXUfT/SHPttVQCv0pG2DvjKKuG//1FIOU4YuYwR4DuF29+A+sMBgDEoD9VA7T+IxM5vkNu5BuJEIx1vIfn7n8hpfQre/h1wrVuNSMcG+GuWILxqDQZvWEQ9Xwr6YIA8JfRUm2ECIlj9dyxG7IMtEEErYsEydRLUb/dyj9gh8Qxlq1yA4NJn+ckfgMhQrtdXwjZnFsTJE/lU0f6PvXECfDE9GEKwoQm+q8oRbHyGTjS4vAWh51ZB4qnWUVsD65UzkNj1HZjHjeTPv0J54C7YF93CZ6fnToHA2TdM/vIbxPeu3LsQ7t6P4e75EHmbN4IVFnAieTwuJgOKnX8qflrE+ciD1KdDpIWAdfZMjGlbAbl0HGGSJ10K7dARsKICaCdO4r9fCe3YCcperLQEbHwJ2ZoVaSFgv7mCcIh4CDW/BH3gFBUt7dBRaPsP8kCXgUgE8d6vTwcry/fQHLPCNAFWfDHsVQsIh618LpTq2yFd5AU0DcGmF2g8uukjwOHAmJebwbi9GNSO/yQ6080UAZnnfHc3rwcKrwMcipTvpSKl818K/931UHnw8mGqvNHO94VKTaRbnf8j0YNJYYqAxnO/r6wKwWXPI765G7GuTygrneJFK7Fj1xA0VUXoyRWIvvkujYk6QEoahCkCYn/xqxx7uwuB+mUQVVfEAaIx8WpYU/v2cyKtUPf0DXtndMA0gVQ2jm3dhmjne6lMOafteSWAWPycgFI1OL8EUkU3AvssgREcUkZNsh7I6PGOYPFR74G/AQAA///hZdmYAAAABklEQVQDAG3j0RhfxUZBAAAAAElFTkSuQmCC","hu":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhklEQVR4AeySwQmAQAwEzyvCJnz7sEkL820TVqEtBJYlLM5BfsnCzey89/VNnjnCHx/oFogBDIgEqJAIUD7HgIxQDMg3sF3PSJ58A2IF288x0K0AAxgQCfypQiIq0zkGTGDLsfM4l5E8VKjs2rSIARPYciwGyqhMixgwgS3HYqCMyrQYb+ADAAD//9vwXdgAAAAGSURBVAMADXrlCUe74TgAAAAASUVORK5CYII=","is":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAtUlEQVR4AeySwQ2AIBRDv0yDTqAbuZFu5AbiNGI4Gg7E9iA/KUkvn7T59BFs3jKiXM595xTjS2VchGQinmDOjx7wN0AREAGyAX0hskDaLgJ0hWSACJAF0nb/BPKxGqJWdUgm4vFP4BpHgzVNFQg4C9zDP4GqQmcD/wRiSgbrPCtecBa4xwcC1a5dDMKw7IaotT2SiXj8E2g12fu9CPxNSAREgGxAX4gskLaLAF0hGSACZIG0/QEAAP//GcoBYAAAAAZJREFUAwCyNl0OyVJ6QwAAAABJRU5ErkJggg==","in":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACMklEQVR4AeyVz0sbQRTHP4lNqD8obeoh7aGiOZUSpEYJhUJa2kKhnj14UVCKBG8iHjx4UgiK6EXIURD8A6RCC4r1UqopvdQeWqrVIunBmiZQXdl009klx2Ul2XFLZBYeO/vevDfv+/0+Zv2ldKxUy+anxh8F4H8LqBRQCrhkQI2QSwJdpysFXFPossAlUOBlBmrYLkSB/f0C4+Nv6et7ZZm5Nn0up8U2XSoAwygxN5dhdHSdnp67TE8/YmbmsQARJZl8zfx8BnOPbSdVOqUCMFne2soyO/uEYLCO7e2fmN+BQB3p9HM2N3+wt5evslX7NKkAFhY+iNF5QC6nsbb2ndXVb6ysfBX2hePjUyYmHgogH+07qdIrFcDOzi8aG6+wu5sjm/3DyYmOrv/l6OhUMP+bpqYg5p4qe7VNkwrA5/OJGfdZB+m6QaGgkc9rnJ2VLB8YYrSkHonUavH4LQ4PC7S2XhdADCKRENFo2Fq3td3g4KBAPH67DEbOSyqAZLKDVOo9oVA9AwPtJBJ36OwMixuog4aGAFNT7xgcbJfTeblKBQDKGQ6v5uZ6ursjDA+/oVg0iMXCdHWF0bQiIyPr9Pbew9zjUKLikL/ijHMShobui/v+GcvLnxkb2xD/hA2Wlj4J31P6+6PnZFcelg7AbKGl5ZoYlwSLiy8sm5xMYPrMmGzz30xdpZbtQhSQzbJTPQXAiR0vYkoBL1h2OkMp4MSOFzGlgBcsO52hFHBix4vYPwAAAP//zDo5UAAAAAZJREFUAwBdyH1Y75illAAAAABJRU5ErkJggg==","id":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhklEQVR4AeySwQkAMQgEJR3c7/pv7n7XQlLBPsLCijABP4IaZ1xfPXtyrBr+WKBbIAYwYBLghEyAdjkGbIRmAwyYAO1yDNgIzQYYMAHa5fMNvPuvyTHfgH2EzQ0uDDT/VIxnAQEmlsZADLUYhAEBJpbGQAy1GIQBASaWxkAMtRiEAQEmlj4AAAD//+Zh8eYAAAAGSURBVAMA+um/iQ6z/3EAAAAASUVORK5CYII=","ir":"data:image/png;base64,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","iq":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACQklEQVR4AexUS0hbQRQ97y3a2mij/aQuWvrDQsVF02KEltL0p+2mtWC6tNJuaj8Bu+qmpbS0uFFx4UIUFRXdiGBQXCh+NqIGowFF/EURNSqiKPEXY/TNLGLAgLyZB/pgHtx5d+7MnTnnnvue7Iq7vadnk6HzRxA4bgGFAkIBzgqIFuIsIHe6UIC7hJwH6F8B8/II9Gz6V4CzBY9MX93yHdoT3Ati0bdC49sBP7YUoxOGQXMFshvy0OHpD0Gx1f7C0sZqaE6cvtkRDHjH0Dk5gObRHthqfpIwk2lKwN5YiLQEC6w3zSEwgeAujKcNoTlxkq/cgXt+Au0eF+j6mWgSZjLNCOR2VsOiAEtPfITlzTVk1f1H1/RgRFBlfU1we8cjrqkNMhEgPeuaG6V3/WmrwOCCB8W9Dgoqtfw7rCV2TK14UdRdT/eED7XuVpQ6G8NDXD4TAZ9/E6+rfihAv1GQXx0FuBZ7Gc6ZYfgDOzgfFQP/boC2hwQJL8pyKEhC6osjH0OLk2gZd6LC1UzjxP/XUUl9tQMTgYtnjQrgeNrr2Snp9E36PtxSE5JhS3qCTHMaXV/bXofhVBTsDzKQ8/AdSF7WvVdINF2n/lWjCSyPCgIHx5O/x9/nH/HJ8gafU97i97MPES0jyYr3Ckiyfk75kC8ZYg/tIwTIeqb55cEFKjwmAo9v3MXTW/cRH3MBpug4Fddpv5WJgPYw2E+UJUmGpGOT2bmfjExB4Lh1EAoIBTgrIFqIs4Dc6UIB7hJyHqB7BfYBAAD//6jBG0gAAAAGSURBVAMAVM5oWKGocLgAAAAASUVORK5CYII=","ie":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAgklEQVR4AeySwQnAMAzETLbrSF2ly7ozHOIoBRn8sy9YypnnWtJL655d0Gd+Xh7wtUANaAAS8AtBgHhdAxghDNAABIjXNYARwgANQIB4XQMYIQzQAASI1wMD+K1KgAdUsAahGghgVUY1UMEahGoggFUZ1UAFaxCqgQBWZVQDFaxB6AsAAP//UuxIyQAAAAZJREFUAwBhhoWZH2fb1AAAAABJRU5ErkJggg==","im":"data:image/png;base64,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","il":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADKElEQVR4AexWaUhUURT+5s24NDHl0qI5BuaSOogtaChBZYtEGxWGIBFkaKhoA5YtlFZaEGYyaShpZUZFShtWSosWgUEb/UhHzRUdM5ckc3LEcbr3/bCZRoPmzUMf+JhvuPe8c+8931nueYxB4A8DgT/CJ5BW8AVCBnOysBFChvBTSOA1DOFHwFAdDiGD1wgkZtVCrzfwmqW8Ebj9tBMXS9pw+UG78AjohkeRkluPgiMKpBU2YECr540ELxE4e70JoQEOiN4qR1S4G47nN0xNAtohPf7u4soLaqRfbYRMKmEbpIiYrippRXxmjZmuumWQvOX24xQBqb0Yda2DuFfVBZFIxOL+q2/YFDoXbvPsWctkMyXsvPTFH52KNz24Ua6Bp1zK6nD540SAHpyV5IvmTi32bnZDRNh8aHV63DodiNRozzHcPBWI0VEDNgQ7I37nQqgJ6bwUBWwkIroFJ3Am4DrHDspIDySRKzPuXA0y9nuDRsbYKplUDEo0IbMWh3LUWBnoiHVBzsYqFo85E6AnH92zCM/f9aG7fxjRW+RUZIbdGxdALAaKHmuQfcDX7L2lAqsQGB6hzcoAW5t/b2cjYUidgKQOY6m9ZuusslMGuXVoWtDUKXg4fuOinm9s12L1MieSRnVmhlgq4Eyg7esQVCUtyFb6kaL1wrG8erPGRRtZskqNnGR/5JPivUturWdvey212WTdfxAwWTc2od87wf4O0PToYGfLYIadGFGpn6C604riJxqUve4G1TGQLOvq0+FD3Q+sWe7EyqzxncSJQP/ACJb4yEDTovJ9LygiwlxQXt3DFuuVsg6cKWrCtUcdiFzvyhb55+afCAlwwK61LuT6/TXmCEsHnAg4yCRI2+dlgszExThBeoCPuxSVuUFYoZiNuB3uJH38TPToOq+p0MjG89zBKA+8/PgduaVtKC7vQHqs93hqVpFxisBEFtBayFb6IuF8LdJjfOA4y2YiVc5yXghQq2iOx2yTI3a7O53yBt4IUIvzDyvYxkXHfIERhVRAyOA1Anx53XjfaQLG3piMMbNqqSOEDKbqUjCEjOkamIy8Nz7zNwAAAP//AhCMsAAAAAZJREFUAwDVmWu28SEFbwAAAABJRU5ErkJggg==","it":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhklEQVR4AeySwQnAMAzEQtbpAN2gA3awruTOcIijFGTwz75gKXvd15AeWM9xDum9fl4e8LVADWgAEvALQYB4XQMYIQzQAASI1zWAEcIADUCAeF0DGCEM0AAEiNcDA/itSoAHVLAGoRoIYFVGNVDBGoRqIIBVGdVABWsQqoEAVmVUAxWsQegLAAD//8GXINUAAAAGSURBVAMAbmCAaSqhYckAAAAASUVORK5CYII=","jm":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEp0lEQVR4AczYT4hVZRjH8d8daSgpyk0IkovUiCiooFZSkKuosIUugkAj9wotWlRUVIsWgS4DI4WihS6SilYGhRBURFBEpLYwRGtjkVhMye187uU45555z507M7cx8fWc9/n7e/g+3us40/8q/eY593n6D7ybft78fx2aaGtq9T6T1q/11ySf3JY8tz7p5er/ooEWmmhrK1owgIA1VdarG5KPNifr1rBcnaM3DbTQVFIxc+iDknloe/jG5Ns7kgdvGN5X80899aahqy/tM0+93Mvul5I//yqHbZhNjm9ZvZWq4A/WV0+9S6popZn2wQod/rCX+3clJ8+UwhP4YIQT1nLUyq1q66GXnqWKNNJKM/9gAC/fne7l3icTWNxLB85vqpW6b23JuzKbmmrr0VWJNhpprWOuDMBw8VIvsMADE1v7bKxW6sTtyd6bM5VPqV6GtdRUu7ou+E0LTbTR2AwYGaB2wAMTXLWt+Zytuu6/ZeWfUvXKqKVms0f9TgMtNNW25rM4gACY4ILNvXTghh3+kn+cTY5cNbri9KaBlq6YzgEkwAUbfDCytQ/s8Fuptq90r+AN1k+O3FKMXnrqTUMppraNHaAOgg9GOGtb8wm/NThy6/gvvmmsTLOv94kGEAgjnEePu5XPjnWJtbAe7Qg2vnEro7YeerXzu+4TD6AAnDuf7WXPK91ffNbCejRXyjsbnzrtY2XUVFuPtn/cfUkD1IXeOjb+i69eqfc3JY71Yqvzm09raT3VbNonfV/WAIrDDDfs7qWz/abEKfnY5KqhlvtyzrIH0Axu2Pe9kcz9zTLZEStHrhqTZZWjVjRAXfLAe71s3ZOc+rm2dD/FiJXTHTW5ZyoDTN5u+pFTGWDvE/2cOJhsrv55sZhEMWLlLBY7iX9FA1y/tp8jr/ez/5lktvpRdJKGYsTKkasG23LPEgYYbXHnpn6+fifZsW3U3rwd+y1xmrbmu1w11Gral/K+rAGe3t7PF4eTLRvLreb6yb7qL/TjpxPHO1spWg211Cz5F7MtaQC4YT/4QnLdteXSZ+aSrT8kB36d93tn45u3zr+ppabaesx7Fn+beACY4Ya9q+zRC8nd3ydfXloYwcb38e8LfbVFbT30qm2LPScaAF6Y4S4VtB7WZOdPyYXLpYihje+RU8P1kjO0jv6ph167Hq32cNRVvI0dAE5Y4YW5VMFaWA9rUvK3bWSJlSO37XfX61D1PyVvv9gPDWxdp3MAGOGEtSvZOlgL69EV02WXI1eNrpjdj2XwSUdLV0xxAPhghLOUCL+VsQ7WohQziU2uGs+fTS5DU0iigRaaCu6MDAAXbPDBWEqAHX5r0NGzlNZpU+O188lDPyZqlwJpoYk2GpsxVwaAycrA1gxovsMNO/xN+zTeP7s4/ATTo6sebTTSWscMBoAHJrhqR/MJL8xww970TfNdbT300rNUm0ZaaeafgQUemBja52z1xbTtZAIz3G3/tO966KXnuY6fMWilmfYZWLpEwHlX9cX06R9dEf+dXc97qt40dHWhfbBC7QD4YIQT1rZ/te6//JPQQAtNpb4LBjhfYfOJACOcpaTVtNFAC020tXv/CwAA//9ANEdFAAAABklEQVQDAEcr/CbuvYmnAAAAAElFTkSuQmCC","jp":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACsUlEQVR4AeyVX0hTcRTHvxtzrofFnLamBgU9bRLRpKCktScJEklKiB4UsgyK3qMCGRS99NhTFhFRiBlEQ8r5oon9pTBiOuqpHqwtZ+VCcy7Xzn0Rt/vvd+4doezCYfud8z3f8/vc392dNbfGLyvW+FUG+N8HWD6BdXsCmeQs0u8mpVj6PlsyTtMeoVw2i+mbDzHRchajVU0Y2xzC68ZjUjzzhKTc+9Zzkoa0ZhEZB8jlkOh7ghf+w5g6FUZqcAzZn+mi/VFuJjIqaV42tCHRPwTke4uEggnDAF/vRhDrvIiFT1+g95r/+BmxjguYvv1Ib4uizhBA8kEUk52XkMtkFQcoFXKLS5jq6sG3+4NKEl15NkB6Io5Y/s7rmqIioseOfuwqEtUSGyDeHcbywqKquZ7i8vwfxM9c0SOV1bAAkgNRzL2JyRpyknOvPoA8Ob1MgGHOLNWe5ADPUxwg/+qbeTquuhlOMTX0nPVaFQbIJFL4++s3Z4+qPdn8fwd5q4pkisIANEjGx5QUx1sYwJSdKphYHXaFinJaGMDurVZ2M1ixe2uEHYQBbK6NcGytFR6k1UCeVkellqyoLgCw0lt9sGllYdI3ricLoL77KGCBeVfeq/50O8uPBeAM+OFu3scaKNdEXs5dPrmSZo4FQK7bznfRhylhxIsNUBXajYZ7Vw0D7Oi/BvLiGrEBaKD3+CH4boVhqaygpVBY7Db471yGp71ZqK9QbAiAzOpOtCEQvYEN27fQUleQNjDci9qOVl16NZFhADJ3BRuxN/4Yvt4e1LQEYXM5Kb0qKEc10pCWelYJmAsrs6+ozWKzoe7kEeyMXMeBH+MIJkew522fFPsTI1KOaqQhbZEBM2EaQOH8ik1u0OuWwu5xF5ZNW5cMwLQdahiVATRuUMnL5RMo+S3WGPAPAAD//zhTMsQAAAAGSURBVAMA9ad7mOnyfVUAAAAASUVORK5CYII=","je":"data:image/png;base64,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","jo":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABi0lEQVR4AdTYMW7CMBTG8X8yMbEwsSLaMnKDOhsSJ+g12hFxB8SCxDXY4e3coHeABYmxriNkhBQhDHYSO9KTIVH8vl9AsZJ8C1qZgkynWLkJzw5MaRTGQFpbbuOmCrkCUoVUAKlB7gJSgTwExA5xBsQKeRoQG+RlQCwQb0DbkGCAtiB5lmW2d9DRruxafaJ3W7T+q6WC/wKVqyACRXEpkcph3x31A2xCkQuixIjYvd7jc4Bu17shIkEhboDRCPp9mE5hOPRHlDOIBIG4Ac5n2O9huYTxuGwfrkS8IG6AyQSOR+h0YDCAXi8cwHMmN8B6DZsNzOewWsHh4Nn25nSlzOOgeSbcmVLq5oDbRzdAOddsBosFnE7lN/9Syiu4DeAOwJ7iOSoVJLhN0RxAqaDBmwMoVUvwK0DX9CpF3s3d8RuyLyH7LcjWWS0V/C9kgxc/IB/UvgUDNB3cXhlvQFvBvQFtB38ZEEvwpwGxBXcGxBr8ISD24HcBqQSvAFILfgXI22XJb2rltI1Djf8AAAD//zcQ8VQAAAAGSURBVAMA58IWPFwWmZEAAAAASUVORK5CYII=","kz":"data:image/png;base64,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","ke":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADqklEQVR4AexXW0hUYRD+PO3qUpSbFwoqkKiHKOgCiZfE47tQ9FQPkUYkhWQUhk9eCEQWywdREFZCgh6CJYNoQcwLXrEerAgl0ITULNPM8pq6zZw9v21eIvcMhuAy3//PP3P+mW/O7znO0YAQ30YGFYAN/dss4H8f3+YJREZGIDTUvuaD4D0RETvXvG/pBssnMDExAY/HA5tty9LYq66ZPO+ZnJxc9Zp/dVguYHp6GgsLCygsLKSc9EamkWU7fMjeuwe3CFtJZ5sfPrhcLkxNTYH3+m3Bj5YLAEJQWlqK7OxsJCQkQP3ukHIpNRWXCXmkK0lKSkJWVhZKSkrIFEKwJgIFALW1tWhsbERubi6x8eEq3fHDpIXHxYFxgvTzZAMhLy8PNTU1aGtrI6t10XQ9Gdaho6ioCJqm4dzx4zhLvDSHA46YGAOsXyDf6ZMnjT+34uJi6LpOsJ5bq6+vhwS8Xi+ioqJwcXyc6AM2p9OYeWDdTs/JFbsd0dHRxglI5OQYWm9+PqQwU14OW08Pc14Roa2tmHG7xfIxb623oABScBG5CZP63NiYqQFKZ9+9sjKxfMxbW8wioLRSjE4CywK9XmeHhjDd1wfW2dZBg8yjS4FMESvgCwX8RHhFUDLW3Ixv7e1qibekfSCMEKRErIABkxEXYar42tSEsYDX5bDp+GzOEpNYAaMmGzXz8khVFQ5VVLBqQBUXeI3hsDCIFaA4/FQKzfP0HNC0TGaXWYI3iBUQYXLYZc48dWVkgME6Q/nUtWyzCrECdptMFEleOuPjwWCdoXx7eSGENRTw94xMjnE04DLugxjKxL59tIgkSIlYAUwonoZjBBbufxwxv3shtrGPr2FdCtp+6g6lcDstDdtMZjan09Sw2Bex70Z6OqTycRxtP/VCUginb4I5uuuLzJcocwcOIDInB1L5OI6WcjcFEkh2JcPb7MWjxB0GbdX/8ELpD3Qnqp9XQ3fpIjmZt9bwrgESGOweRPfHbtzf9hq1B2H0P4G90OMjwEPtJXqHezHQPSCSk3lrfIcsg/4zZZ7KROX7SiNUGX1ZjmwFVC/UHw64Yw0X3D1uZMRlALTHb7E2ihSQGJYIT6cHvjD/R/2PMOAafZY9e1GNJ2+e4voZ4mvzE513zMPb5UWs3azIbw56FCmgZb4FTTNNf5AYpRO4ebQfOYf78Z0KCnTWTdahw8fNdaA1OF2kAAQTJZg9K9QoFGaFyOtk2ixgnW70qmk2T2DVW7NOjl8AAAD//2EnYscAAAAGSURBVAMAke7xV+hKBK4AAAAASUVORK5CYII=","ki":"data:image/png;base64,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","xk":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEN0lEQVR4AexXbWxTVRh+1rVb232UjXYrrArMzenC4phsiDZGwS0GRPihJoAxJkSJBsNi1MTxQ/GHhqgx0Rn8Y0gIYjBRo+DCRPBjrgwF1lmEMcZgsKzdWMvW7q4fa1fOOQvLbr+4Xw1Zsibvued9zvN+PPec3tyrKlv3TXQumwpz/Dcv4G5v4PwOJNqBgvzsODgRFkeSAMjegVJLPjRqfppdr9TwWlGpMtAUg9GYZSV5PJ4Uh19ZZIYVDxrx8qYHsHV9OcruNUCXnYkPd67CxjXLcHDPUyheqIOZ2IGP1mITwT7YUQct4VDuixvuZ7E0h8iyPLpoAfWrLTMJxicmUbe8CNaaRfCMBuAPRmCzu3DgSA86/hvCkNsPF7FTjmGGnexyIUA4nrEAHqs24+FKE3zc5Ey+2blnwDtMBAswFmixY/NyvP96LbY/X4kcnRqcP4xDrb2wd49gdDzESv1qu47de0/jq+/+Zz4d9h46x7DjHQPUxZgvhK6Lbnz/Wx+8JE6vVbOc771Wize2VKGoUMd4QgbBAkZuBtBO7q6X3LGj7ddZ84PDHPb92I3mb89hairK6oUmp3hX6sRiEcL94qCDxQ57/JgIhEFz+siO/t3pBMVonBATLIAmy9NrsOWdY7AU51A3qRXo/FhfcQm763+HxeBNypu9UFKUg60kdy6pMRu/01yUgL/OOHHTG0R7pytlXpOew+ZqBypMblSZh6DPmj5eqYLof8dDcreRGql4sWuiBMQGJ/N73Eb0uguhVkWxrdaO/S/8hOaNLTDn+ZKFSMbTIuDZym6ULfTwmjLncXiu6gLys4M8XK6juIBtKzvxUo0DWk0krrcnSvvJsRqJw+UAigmg5/y+Qg+MuVzKfhqtp7BrTRsKtP6UPKGLsgSUG91YsmAU1qX97JzvWXcctRZnytrZ6gg7XuOhrJQ8oYuyBLz1uA2fPnMMjdZ/hNZjPJ1mksW9uuoMTDkTzNiChEGWgO0/bMCgV/wLGX06Lc73oaG8jwhpxU5rh4TWp0NkCaApsjLD9CLZ9JowTvQulRwvQkDiGo2Hn4ZnQpt4UQBqdxbjxOVSAczEFNkCAmE1fj5fkTi7ALSlu0wAKzlFtgCa2j5YjJ6RQjoVZR//uRpdJFZUUAxZEQEDXgOajq5FU+uTcPlyY0rEu1xIg1/InafvSpFoZjxBBKKIgNv1em4Y8eXJlbdd3vWPviWgO0XBz9oewb7TK7D/7EPUlWWKCqCdXBg2gQtq6JR8IwAd/SVoPNyAZlsdPm+vw7VRAxyuIrauxKC4ANrUWeciesG75Fh90vYoBsYMzPcGtXjzSAMiUeXKKpeJtTg92K7ewyacQq8LLFmSIS0Cqhc7ccWzAMiY/sxEGn9pEfD1vzV4u6WePJHEv2aI1ZoWAVPRDLF9SOanRYDkbiQEzguQcNMUDZnzO3ALAAD//3JW5uoAAAAGSURBVAMAknC1uKnSS1IAAAAASUVORK5CYII=","kw":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABXUlEQVR4AeyUMWvCQBzFH9fSpEsbaTq4tHQpXTt36lIKXfwA/Q5+HDcXZ3cnV0FXEfwKIk5OIsT7nwoXYmJiDPf/QwLvOHLk7v3eO6Lw+xxh9BVh/i1SCoMl8DcGBgtIfJQxvdoC7ZnWFFhtzCspwx7g6FZgG3EAAhHWRhKAIEhC2kgHIAgBbWQDEASJcRv5AAiCaRv5AQiCxKyN4gAEwaiNywAIgsSgjXIABHFoI3ofwoXKAxCEQ9UADsM3R9cNmBgcDnUDDsM3R1+lAc+7M5u5GAoApNvzfT99seKVqwBU7DFz+xqgqW7RVU9YNz+dqFQD//cNjMMP/HgPmTVXuXgRAKXeb7yh8/iCQN1U6e/s3oUBOKRuU+UGCHXSXFIvDNDSd3zi+K7bpu15ZgOUei94RU/f91D/bewPucxTAY6pt/yAi9eTPhIAElK3SWIAUlJPAEhLPQYgMXUbYAcAAP//KP+kwAAAAAZJREFUAwCGKhRJaiRv3gAAAABJRU5ErkJggg==","kg":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADzElEQVR4AeyXWahNYRSAj3meM0UomTNkSEKEDMkYmSJDkjfDA1GU4UWUOSKEF8oYEsKDecqQWeZ5nmeu78s998HDrfPvfa9uHa3PWnvvY/9r/Wv4t/wZiURGXiZ/Io//SQfwvxOYzkA6AxF3IOdKqCSeFYDimaASXqtjJL4AfFNhPGsJ5aEfKOreGAWhJxgQKi5x2ejv0qnfvGYm3ISx0AbqQFHoBsPhGgyAIlAJYpDoAVTFixKwAPbDEOgAlksfdF34DL2gOxSDhfARzBQqikQP4BfL69AFdEdw9+ujB8McmASDwECGos3AFvRkMBjLDjNUogVQjWVHwgbQMXe8MfYRGAOtoR2MhuPQHMrAbLgM/aEFRJDwAJwy9Vh5N0yHL2Ap2bAnsHXyLFp7Gfo+WEJl0W/AnjiM9j1uBGaIhAdgDZ9hSRv3KbovmIUqaLOAyhIdHMfVKLBHOqPfgn1j4D+w80GAhAdgTVvHOuAUWsnqT2AdjIcGYEnZH7Wwq4O7/h5tRmz059jeM2t803OVsoQFoDPzWasiWNsN0ZbSJbSO7EPXhp0wEdxdA7yKfQ42g+9wOt3DvguOVlSqEhbAM5ZZBI/A0nGUPsSuDIoON8EoB4WgBjQDp5M1/xVbUR/DcIJ9QwdIWAA6atnonE3qIeZu6sAH/toGPuuBtlQMaAm2jYxKmCVLz533PY7eVj5InbAAPrGQtWszOvvdPU9WM7OWZ42gNHSBYWCGLKml2Dru/DeITlzPAPvFYDBTlbAAHIMeTnNZ7g68hAlgw55E25w66O47mSwlg3vMs8XgRHITSmE7iUagX0CApBDAP2/3UHrAPZvXkToQ+zT8hFvggVUBbc177zu2HECbPZt5B7bv8DC0zLhMVcIDOM9SXcE3HEJ77Xjci+2Md6qo7Y133NNRv5UsIz/4HKdOK8vHaWXG+Fmq4vKp/pu/v/fz2Hp3uuzhlhPlBvo1WF7X0e60jew9zwRLy+zo7C6et4f18AoCJTwAG9dmtAmt/2l44K6vQjeF1XAwk61oD6tTaGt/CtrP7RVoywwVKuEBuKInr7XuGPQ/Ln552g8eWMv5wVTwADOoK9gyC+3IVNfENiuoUIkWgKuafgNZw4VflvPQ3jM7R7GdSp4Tt7GdOG3R7rwZDBydvCFLogeQfJWfEU4YJ81GbpoFx62n9UWuLSMb14Z3nHrgcTuqxBeAnuiYE8dd38QNG9nG3o5tcGbKCcRlXBJvAEmvLJnkDjs+7Yvks5h1zgQQs5PZvS4dQHa7kxvP0hnIjV3Obo08n4E/AAAA//8wi8q1AAAABklEQVQDANWtKfiBaAkzAAAAAElFTkSuQmCC","la":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACC0lEQVR4AexTO0sDQRD+PI2InZXio/KN4iMI9hYqaCWxFLXQRkUrFZto4QMrRW1MoWIlSRmLWKQPSF5NjGClAf0DEhKD3hwcmJDH3s1COLjAZHdnvm9mv5lbJdzU82tlU2Dxny2g2gO0J2BPgNkB+xNiNpBNV5zNE7CySf+EGhsccE2OYn99Ft6zFc1oTz6KsVtekECqgNH+Djz79uA9X4V7bQauKadmtCcfxQhTcAfWUYqAWqUGe6vTCD3soL+zpeSFKEaY3ZUpEKck0EBAioCBrla412fgcNRWLE2Yg41ZDHa3VsSKANgC6tVL358uo95RJ1JPwxD27mRJ5VQWrBHK/LEFTIz3Yqi3rUyJ4qHhvnYQt3hU3MsWMKI+XPFy+UgOV8/EF6B2Uk9mdB1hcPVabAF6omqtbAHRlw/Td+dw9aJ8AYl3PZfhNcrg6sUMCNAp+WswlETMxBTiyRSIm5/N+IktIJPNYXH3Fpnsj3B1wi5s36icnDCnFJAtgBLH1G4eXwdoK2TuCz/irykhbCWQFAFUZP/SD+fcERJvn3QsahQjzIlHXGzRRP+c0gRQzoj6KMdcR5jfvMbB1SN8gbBmtCefc+4QhCGsLJMqgC71nc7C9xQBTWR+ywMy2pMvnRF/J5RLxJTwVxBWNukTEOmaTIwtQGY3zeSyJ2CmazI59gRkdtNMLstP4A8AAP//w3VwhAAAAAZJREFUAwDxl28Yge1b5wAAAABJRU5ErkJggg==","lv":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAi0lEQVR4AeyTsQ2AMAwELQ/CEMBM0MIkUAIzwUywAtIVzksf6bt8otw5eXT9q5wM8eUHVAu0ARuABDxCECCu2wBGCA+wAQgQ1/UNDMsUyslxnUM5+iMU4ssGqgXqG7i3M/6lzX357FcoR3+Eqj8hvd8GKEHatwFKkPZtgBKkfRugBGnfBihB2pc38AEAAP//6/vX7gAAAAZJREFUAwBvmHuoMuHulAAAAABJRU5ErkJggg==","arab":"data:image/png;base64,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","lb":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEV0lEQVR4AexWe0xTVxj/0VIqAoWV2fLS4gQ2FOQxpkNeG8vcIGDMNtxAR1yQZJItwt5uzi2oG8uiw829EoxxRpMpm2IIgemG6ISOIQw2WEFFtCWAbamlWPqu596Asdg/9N6CIWmbc+6933e+c36/73HO4YyKJPa53DiY4z83gQcdQHcE3BFg6QF3CrF0IGtzzkMjA5ipdrrtMK71npmx+SncM5ZCR66exQZpJR7/7W1s7TqEG+abrL3tbIIZIfCl7DjWS7+CyWaB1W5Dxf+/QnxiI7KaytF5Y8AZDsYylxNoVslQN9iOAJ4PFvAFEPDmI5DnCw87UD/cgfyW3TDazIwBTzfkTBew/eZxuHS6VMQVoviRZ5EYEI4kYRRi/SXIDk5EFmldLoyCywhQXn297XusOPUewnyEOCY/j4ahDgTNF2LMosMl/TD+0VxBuI8IkX4hbP10294lBP4Y6UJE7WY0K2WoWF6IFcJH0aruQ7C3EPJxFakFG356YguW+AbjrY4DyD27C/3jw7dBsHlxCYFM8XLI11TBhzsPveMKfHOxFjqLAedU3TivluGC5jLWSXfjT1UPCiUZkE+oEN9Qhu3/HoGd/B84gVGTDkWt+yDV9OHglUZoyJaZ8vBj2Lh4NT6KzoMXlweD1UhDPXC1EQaLCQWSdCzxC4bWrGeDH6wiYLFbsbntBwSdeA11Q+0oj8nHS2HJsNisxOv92NtXg79G+0Ajn4Rpt9sxYTXBTMbcJFFSGrSTGmYPVgQ8PbhIWRCN46kfIFoQimp5C35RSOHt6QUDAcnneOL0SCepATP4JApfkJ2pNDIHvp7eOEwOuprBVgj5fsyQT1qxIqAnaaE26ugTt/H6f+jSDiDQyxc1Ke+jYFEavk4sQoZ4Gb0U14ODSlIb1YoWHEx+E7mhSZCNKZBQX4aeMTk9hkl3HwQcp68nKbPoZDFKO/bTipyQJPp53TiGPb216NbJsaOnGi3KXlqutxgxpB+FYkKNnKbPcFk3jO3LXsbvT5djqWAhPYZJx5hAMinSirhXURaVi3xJGihCFICEgMU4p+xBp2YACr2apI+FEmN1UDwqE4qQKYrFk4FRoIhs+vtblFz4EUqjlh7DpGNMwJ9cESLIvk5dFUR8f+xN3ITBNfvR/twevBGZfReWfJJSW6JyaI+fydxJj6Vqx0TuSxuklbCRO9NdRvcgYEyAmvspUQw+jXmFbiURWQghB5eVADkmb6bUDm0qQlNCHinwtaEr0ZS5Cw0Zn4BDamRKdz9PVgTuXIjy4FFyfUggB1S0IAw/r3oH25bmYR6HRw+jdNNJ0AqWncsIfHepHt3aazi66l3Upm/DuoUp2BFbgJNpH6Ik4nnUpX+MfRfrUNV/iiVkR3OORhwOV7T1qSUofWYrxJGpDvMlxa3FzuzPsTL+BRzKq8KLycUOerZruywCjn6ZvS83gdnztfOV3BFw7pfZk7ojMHu+dr7SnI/ALQAAAP//aCLnVgAAAAZJREFUAwAARmnHc0od4QAAAABJRU5ErkJggg==","ls":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACRklEQVR4AexWO6gaQRQ9a2clFooQiyB+8AsigaiFCUEJpEp6QRHsrAImfRQUgp1YpoxIhBRJYzQxImmMYiQiokRRsRFEFOVBCsMMpHg8VvE5w0PYhTvszr0795x77syuDPff7S/ZZLjwSyJw1wJKCkgKnFkBqYXOLODZr1++Ao8eanDJJvv2/il42RPrTzxz/ea2PsHNrYWSySR6vR61VCp1dq+LLcCFQLlchtVqhdFohMlkgk6nQ61WE8Nw1jwXAuv1moKq1+soFAoQBAGbzYbOsR64EFCpVNhut9BqtdDr9Vgul1Cr1ayx0/W4EHA4HOh2u2i1Wmi32xgOh7DZbDQh64ELAYVCgfF4jE6ng36/j9FoBLlczho7XY8LgVKphHw+TxOQoVgsghi5Z23MCcxmM4TDYez3+2tYo9EoBoPBtTkWD0wJ7HY7hEIhzOfzG9jIRg4Gg/h/Qt0IuOXECQQOZ5hMJjCbzahUKqKBzWYTPp+PbmrRoBMdzAhkMhl6VMZiMQQCAfoRi8fjsFgsiEQi8Pv98Hq9ICdUOp0+EaZ4OBMCpN9JezidTlSrVUynU5DnRqMBu91O22axWECj0WC1WtE9Ig7pNA8TAoIgwOVyIZvN0l8GooZSqYTb7YbBYKBtk0gkkMvl6Gnk8XhOQ3kgWvb440uwssDn13hefYP01Rd8uPcHPx5coe7a0fu3f7/ixfcE/J9eMctHcMuq81+4ZGPSQgcU5u6SCHAv8ZEEkgJHCsTdLSnAvcRHEkgKHCkQd/c/AAAA//9Lf63KAAAABklEQVQDAATxDLd0toz9AAAAAElFTkSuQmCC","lr":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACGElEQVR4AdyYP0gjQRTGvwwcl4MspBLM6XHHcR4YlKCFGkGjRVIoamUVo2ksBRHsYqKCWIhoZSeksLCwESQiyEasRMVOSAJplIT4hyCKoiGsu8IOyIbFP8Xsc+HHzLyZ4vuYNzOPZcCo8hl2vQHlCBCGagCkv69toKpKgt9fb7pDV30jqJNlYZjuQDDYgnDYa2rg6ecfSD6fMEwNDA21YmDAA4fju6kJkZPcQE2NEz5fHWdwsBkeTy3s9m+YnAzwuLbG7a7mmqVDGblYTBjcQD5/A6/3LxKJMcjyBNbXR7nISKTnJabFh4fbkMvd8DnpKIn89LQwuIFyWcHcXAJudwz7+xkuUO9ks5fo7l5Uz0QcxeK9HhbecgO6kmz2CvPz2/qQtxsbJ+oupPhY7zy6fsPR2SkMgwFNmJYmWru2doCpqU2USmWEQq1gzKaFX3HdH8b/ZFIYBgNO5w80Nf1CILCMYHAVs7NbL2mVThfQ29vwSrwVBgYDkmRHY+MMdnZOub5M5gIdHQtIpQo8ZpWOwcDZWREPD6WK+ioZcK1EcWyzCcNgoKJyCwfpG4jHR/AZaqMRYYWcVkSyUKhNvSI/zj9/u7BCTlKLSPopdKs+QpRh6a4uUOYdKWTNu5S+gWZFAWXo74A1M/vtqlhKfQwow+729kAZ+megOhoFZZhL/adDGfopVFhaAmXY+fg4KEM/hd7+5llz5TMAAAD//xKBWsAAAAAGSURBVAMATHQxpCO+LCQAAAAASUVORK5CYII=","ly":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACGElEQVR4AexVTUsCURQ9DX1uCmk2absW5SZdWK4zWpQLN27cuBAsUEjb1c61m6JAKbSNP0BwUYFOv0DKAvsDlSHSQB+SpWhvBgxRB7R5TQhv4L2Zd+a+e++598wb7gnTjUEeHAb8YgT+u4GsA6wDKivAJKSygKq3czMQMciDSUi1BlQ6YB1QKuDqqg3BYEAeNtuKkplqnHoHeH4aFxfnSCQSyOfziMfjKBaLMJkWMTQEjIwMq0661QHXuqDxHIvFYDabYbVakU5n8Pb2Tojc4ebmFo0G4PP5YDDoaYSSfVAlsLy8BIfDAY/Hg/v7BzlA+6TT6QixNAKBbZycHGNiYrzdpK81VQIWiwWiKOLs7LwjidlZA3Z2gnC5XDAajQiHw4hEIvj4qHTY9gNQJVCr1VCv17vGb0j6IW9KpRKZgXK5TCRFNCWvfj9RJZDNZsHzPPkGTB0ZPT4WsL9/gEwmA0EQEAqF4Pf7MTY22mHbD0CVwNXVNZLJJFKpFBYW5rvmIUnM7Xbj8PAIm5tb+Pz86mrXK9gHgd5cer1ecurkkcvlsLe3C71+Rt44NTUpH6PRaBSFwpOM0ZioE3h+FrG+vgG73Y5KpQKn0wnpp/by8ko0D1SrNRp5//igTqDpWRAuZc1LUpGemzjt+58RoJ2okj9GQKkyWuHc3OkaBnkwCWklFaU4rANKldEKZx3QqtJKcVgHlCqjFf4NAAD//4Ue+ScAAAAGSURBVAMAOBBSeEmI3ogAAAAASUVORK5CYII=","li":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACpklEQVR4AeyUX0hTURzHP5tzWzOdN5e10pmmmRqmRehK7I8PFSJBjxKa0FMR9eJLRK3oofCxIvAhfIneK/vjixkR9NAfCaKSXCX4Lzabzt39udu680F6uG4N5W6DHe6Be3+Hc8738/2ec7XUXY1mcteS4S15gGgUpEDaYCcHEBMf8tJQ8g1i72mAkSRAhPrSGfSiE3OuOw3kQ2KASBhCQQj4IBJlZk5Hc20Yz6IB/CIE/SyNpwgnPoAk0WJ9SW/bE660P+VY5Qts+te43S6qTUOcaXmGo2OQ7n2P2WL8nBKEuAA7NozSc3Qee62IzeKluXKKpgoP+rBcq5ik1uphV5mf43uDdB8YQxtZUB1iZQD5kgoGDyaDBsFswGox0NpYiFCoZ1GCPTVGGnbmy2O5FBXoKBYiFJlcaQSg0RDV5ePxSbz75ME5GeTBo2kshTnUlOcz4wrz/JWbr04/Y7+8LIjgFoU0ApATOLhby5HGdZRY89jfKNB1wkr7oWLZdSOH7QKdHcXYG8zYtubR2ZZLxUb5oqNuW/kIyQncH6ni51RAFllASIrS2iSwvcxEVZmRNruFUFhDffV6JEnD0AczY7ObULutDCArcYkFvPm+mdEv8/yYWOTGPSeOO+NL347b44y8nWNw+DdGXZT+4Sr5pxx3OXnFtX8S7tg3WEfXdZFTl2e51r/ArQERR7+PmwM+Lt31cLJ3mtN9eXycUN/9mB0JAbwhM3+KegiVX0Dadh5/6VkCsW47R1D+lsovMm1oB/nIkYKWEGBZU0ygNkc+Jv90zf9PX15njV9Sr2CVQJkP8H7yIZncMz+BVR7BlE9PIoGUa1UUkAVQtEXFYjYBFc1W3CqbgKItKhazCahotuJW2QQUbVGxmE1ARbMVt8omoGiLisW/AAAA//94CAo8AAAABklEQVQDAGoYghjqFexeAAAAAElFTkSuQmCC","lt":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAiUlEQVR4AeyTwQmAQAwEQ/z5tRJL9yX+bMciDm0hsIRjcYT8kgVn9nJc2+s8GeYfPzBbIAYwIBKgQiJA+RwDMkIxwN/AcuzhPP4GxApOP8fAbAUYwIBI4E8VElE1nWOgCWw5Ns/7CefJdUQ4D2+gXNamRQw0gS3HYqCMqmkRA01gy7EYKKNqWvwAAAD//7hlZWgAAAAGSURBVAMAIXJUGDQiHw0AAAAASUVORK5CYII=","lu":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAh0lEQVR4AeySwQmAQAwEzyvBLizBdi3GEvxagTVoC4FlCYtzkF+ycDM7n21/k2eO8McHugViAAMiASokApTPMSAjFAPyDazXOZIn34BYwfZzDHQrwAAGRAJ/qpCIynSOARPYcuxcjnskDxUquzYtYsAEthyLgTIq0yIGTGDLsRgoozItxhv4AAAA//90pgB6AAAABklEQVQDAMpLB/gveuvEAAAAAElFTkSuQmCC","mo":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEbElEQVR4AexVa0ybZRR+vtIy2rJxrzCROwzQaNhGQOe4bvvhRsQ4hzHeokznHNNfytBkurifLopDEzUKZBgTNWgwxm0snQzYzIa7VlyEoXXQ0RUGtEBZS+s5Tfjgc/wo/VrNTAmnPe95n/Oe87znnLcK1D7tvp1Fgdv8L0jgvy5gsAL/6wooBDdYAkkyoC20XjeKB+NGA5k/AkZgPSXesNaAD/MNKNKNBIyE3wiUx1uwLckkJtplicIVmwZ9Vi1OmKNFe1XSEErvsIhruYpfCIQILjyUcB3Ppl1FuNLpyUlFtsqONdjamYdQhctji1A5CDNIWAv8NRt+ITDrVuCNC1nY3ZMLm1PpSXbGFYK7ImKRsDwGrLNx3KHCqz05qDufBZdbYJNskU3g7hVWTxL22RBPu/CiKGUVIsM00G+vxbHqWmhUoShOXcVbuGwNh4MI82LOl3VfRRaB7elGfFx4CQlquyT+Bw8/hY8qn0FqtA6ZsfGor3gS725+QoJZST7sW51hlNiXupBF4HerFj8MxsE0HSbGXRaipP4WkJ+YJtrWpWQhTKmCUjEfboh8Dpvi0G/ViDhflPkTffA+bo7BfkOGxJMTNU2MIT1GJ9qz4xJwzToGtTJUtLGy72IG9MOxrPossghw1PjwCOwoKMW65ExPr4/PTNNNh/CWRJwuF6w37dDSPDD2pYIy6LTLJRhfFrIJWCnhpMgYVN1bgKbHXsDOwnJcHP4LI1M2MZ9h2zh6zUOouX8Dmre9iMfvK0RiRDRsN2dEjK+KzwQUgoCfd+6Fbd8n2FNSgZoHNmJtYioqc1cjjYZXrZpvlxXL1MjWJWBLTh7WJKZgFxGpK63AJPnyGXzWv07A5Xbj60unJXFTomKxMfMelKfnUr+rxL0wGuDi1Gxsor3kSGnPf3nhFP0muEXsUhWfK8CB9P2/4vvfzrEqEb59QZj/oRIEAWyTgGjxraEHHQOXSfP9fwkEbg3CfW62TaCx5wRuTE9KADNOB2q+a8YuEjvpCzdHaT4+O9MB8+SEZFYWYrzVZREYuGHBjtZG6Pt7Ud99FK10o8f6DGg51433u46gND0HxWnZeK/zMA6d7Qbv8a3XE/b4lV68TOT+oDO8TXYxnCwC72x6FEerX8Nz+UUooUSjNVqqxJSnp88MDmBry0FUfdGA8yYjqIswZp9CFGGY2PP5xWivfh1vb3hksby8tski8OaRb1D341d4q71VlIZT7eD2uD5p9VSgNC0H1+gZ/fT0Tzh4sl3Esc8e8t1Lvl5nuwhQFgE+r9vYB35ZSijRf0oZvUZlGblUnZxbJCkiBifJl8+QI7IJcPCmXzrRRIPsmHXyUhR6aeHmD9ECMIaxzWe7Flh9V/1CgMPzQO/Xt3lepKvjo4hWa7H6zmTkrUxBlFoD49gIPqeXhzGMZR9/iN8IzCXDrwr3++62Q9jceABbmg7glbYWz1z8SSTmcP769jsBfyXm7TlBAt7eVKBwwQoE6ma9PTdYAW9vKlC4vwEAAP//wtpCiAAAAAZJREFUAwApDtFIgeKbLAAAAABJRU5ErkJggg==","mg":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhklEQVR4AeySQQqAMAwEpXjwPd49+P8vCfULK8NShCnklmzJTMaE77nOubLG9vPnAqsFakADkIAnBAHicQ1ghDBAAxAgHtcARggDNAAB4nEN7PexrSwN4COGAR8MwJ9K4y5QAhvHaiBGVWrUQAlsHKuBGFWpUQMlsHGsBmJUpUYNlMDGsS8AAAD//4QP1icAAAAGSURBVAMArtKW6WsWk0YAAAAASUVORK5CYII=","mw":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADSklEQVR4AeyVS0hUURjH//fO3JnJ0poSo4JqkYuIKJKgVUEiBIEUFLSxRQQ9aNciCnIdtAt6Ltzkok1iix6WWlYLe6A9KDWwiDTTpDQ1H/O4/Y66cKV35gpTdIfzcR73e/z/3/edM7ZkufMta23LLQ5ZbpGlSVlpy12BzHcc4w8C8v0z2NbgqcyxVF3g6OzCsA7HwjqyIKxDyAnkGHIpPyyjsxpd30GnHfh2tYwCVsRCqgT00bywBtOuepBeZIwg49Q3xZxk7ky52hkJ6fwiR6fzQpz6H1kTiAO8PGLpYn5Em8K2HifS+gjAduQzYkj0MHdDxJz3u66GWA8wN6O73LZUv8SZrIgfGlkRoLVVQYusC9lqS6bVBVCT+ScTKbWzN2QeJVJ6CNB6zm6Np9Q4kdZb9L5CwgAusKQmzkocW8cXZAXDuFFWlhdogS6ApHHRAuBfZPUd4B4AqBHQHfRMT9pSNwo/XEtG2jl7xrc6yLzEpgFdY1NEJb5geyrLlsqIQJ5cMm8rTtDNYUsfUmkN0ds1gPoEiFFZKqGdrnORW+IR9RZG1bksqprFjg7GbMUg3Ach00J3qYzZP4fUdu7FBuxMS6KS0ciIwDbKvQOpI7gBngD8K7L5k7kIT7UAbYhHtScaUjGA8ixLRZAtA6C5Ky1LY9oftZWA6DA29/Fj0I5SwTCLvdiZ14yl50FYb7oLyX45AbYAbH3I0nuAv0YGyOhWzprjMZUCdDZvq7CrKojoBhVKoNiP7Qt8mBdrAhLmTu3jReOT5+GZwK6IrTgkTN+a7Jmg38miw9nlfEemrbxG3U0izvDkGv1vtJ4jS7/ZGFKlVLiQF46tp+GRgKsRLm0bF/HpRFIdZM08keDXUl6TypGEDgyOZySt+IhBfgSYTbTSG+5C9VhS10aTmgJlvPNxjjGlO4eS+XyPf6JzOL86ltZNXpDuaf+9zLfZZyp3sDF/dMZ3K1W4MpZSFVLLeR8+zbkXsYd5KeaWmIYLcyFR4s4univgJRu50AkI5CLrM2MGFZiZjVysgwrkIuszY/5PFZjJ++9ZBxXIdS3sjSdL9C9L0EI5b6FcA/AbP2ghvxn0ax9UwG8G/doHFfCbQb/2QQX8ZtCv/R8AAAD//xTgkDYAAAAGSURBVAMAZicFx+1aMIIAAAAASUVORK5CYII=","my":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADgklEQVR4AexYWUhUURj+vI46NjlplqGmUZkVgiZmpeYWKG2KWEoQZQpaIiGK4aMivohREtGD9VCJkC0UWBaKS5KVaW6hppn7NqYyau7j3OYcU+Y6GhYebcCB7+zz//93z/+de7icGGE8S5QDPEtwExCBJcD4xzG2D4vERKZgTsA8IQEs8UcChgYKnHBtR3xIFUL9G2C7Q856w/7a/qIE9ERKJEeWoT//IRIiKjCt4NApk8DDsRfOdn3zTgjB+c4SjWoTE7CEBgED/Rm8Tc/GtYvVCEvyxJFLAbiRaY+80u2492IfymrN4Li3n4Z7zLmb1gd+92lnQaGQy8ESGgRSoz/CxV6GlAcHkJW7WxCOWJVSW4wn8HNcD1HBtTjt3oZTR9thumkSEsNpSCVTgvWkY+TlBZYQEDCRTuJyYD2mpjlcz7An/gWYmBThuGsHArxaERVUi0DvVtyKK4Gt9RCunKnH8Ki+YD3p2BYWgiUEBNwceqGvp8Tr91YawejqKunO8DxUWujB/p1ymG0ex67tIwhTCbyrbwO8D3aDpCAJfLUgIGCxdYz67eqT0Fq9mJnh8KFmG762GsNp/6wG5uZtrIbQLxejsNwCk1O6c8O0ZilgYltAoG/QkDq1NBultXohUu3ASbd2hPo14lv7JvUptHQZIdinGed8mwTjpMNSwMS2gEBlgynxCd/DnTBaIEiFagdySqyRkbNHdSJZor7FGANyAzR1SJH5Zg+eFezEo1wb+n/1gqWAiW0BgbYeI+SUWMFQPIOUq5/U46BtHR2epkpW3m7cfmyHp/m7EHvTBVWNpqhrNsEGsYKuUy9YCpjYFhAgjsOTPUBSKfJsHeIuVJOhefC8Dr53SmG5dRR3ntjh5TtrZBfvwOCQATpkGzE2IZpfu1oNDQLdPyQ4FBKAkqptSI0uRen954g9XwMfVVp5OXXDwXYARZ8taHwFZZa0rmzYQuvFikZvb7CEBgESBEkl93B/eEb44ZUq76WSabg5yGBjNYwvTZvJEorlPPGRoiKwxKIESHQkXYorzJF01wmJ6bMgVwmlUodM/zdYksBKRejE82AJ5gRW6kEsZYcLMh8CS7AUMLHNxfdkYXn4t3UsBUxsa38KkbeZNoMj9wltBidLS4M2g+uMiYE2Y13Ea30ArIt4rQ+AdREvdclarXGO9edv1vY5lp++V8O21r8HfgEAAP//gwfL+QAAAAZJREFUAwDjU4bjSIiZXgAAAABJRU5ErkJggg==","mv":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAB4ElEQVR4AexWO0gDQRB9SUwQbCxs/CA2QoIgEQwY0GCpoKBYCIoEFbQIBAsVxFZS2ASUYCGIFiksFMHOMggKgkhAUMTCHwERREXhkmjcOXKNRLPehyVkj5ud42725r15w+7ak9XtuVI2O0r8kgRECygVkAoYrIBsIYMFNDydS4HWsAsijIcdFwGeH4mKkQT+qnxHQws2BxeRmIgh5BuCu6YRTnsFbDQpx4YcDcwbuC1RoMpZiWhPGIeTa1CyGfTH5xE72cHF0y0yX1mosFUWDDmRIGOPem5LCMx1jmLGP4zj+3NM7y/jRXkvjM3GWKhW+DPPW9MJUJssdI0h/ZlBcHeJB0M+RtUl/8zvTCcw4A7A5XDiNHWJ6+cHTiRMCc7In2GmE/DWNqs5zlJXquce9AkA0wlwAzYp0HQCWuU1Jbhx6uwi0wnEkwd4Uz7gq/Mwc/Php2XU+hbiw3L3+ohIYgsOuwOxvtnikwg8RdFySv6fZroClD96tM02rRv46j0Ienvp1e9GraMTPP3UEgIK2wM8qyPwr0+hu6mtyFGCGBAUfWYJAQ0K7cTjexEENkKFjxIGKq/lsJSAlsRKXx4EkitpiDAe5cpDAZ5KiIqRCoiqvJZXKqBVQpSXCoiqvJb3GwAA//8FHryWAAAABklEQVQDAG2UKEigbjOUAAAAAElFTkSuQmCC","ml":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAiElEQVR4AeySMQqAMBAEDyv/Xwp+0zb6hXVYRJjAdbcbMpNtjllvZz/nWmsWmnnyYLb5+fEBXwvUgAYgAb8QBIjjGsAIYYEGIEAc1wBGCAs0AAHiuAYwQligAQgQxwMD+K5KgQ+oYA1KNRDAqqxqoII1KNVAAKuyqoEK1qBUAwGsyqoGKliD0hsAAP//3+/9AQAAAAZJREFUAwAjummLAnmaPgAAAABJRU5ErkJggg==","mt":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACrUlEQVR4AexWXYsSYRR+3hlXTU1JXbfNcXWxjbQgAm+CDZZdqAiC7rqK7ar+V9BNX0SxFHXlTcF2sRERbGV+4Kpo5seqqOMyzbzgtH4sDbzMuJIDD84cz3vOec5zjg4n6XzteC9IeoLDlF//BwGpK6L28ROq2zsqxF+/j4V2mhTIv3qLoolg/9RJirLdgtSL19NDQDzowRtaQmDlLMXicghwOaaHwLGo9IgiNI3Q2LOSNNZstPGfBBpfv6HCSWi1Wshms8hkMmg0Gqh5nMi/ixtd70i+AQJSu4O951tIPnmp4kfiJ1ImIJFIUBLtdpuSaJp45OZk+8PHqm/y0TOIZWN/nbjDlFopubvLAjzX11QsxC7B7/cjHA7DYrHAbrcjFAqh2WzCJfgxf/sG+v7cagyl+IfDIXW/54YzmC1mOJ1OFRzH0cIJIdRms9nQ6XQQjUYhv4VQW99fIQfZbzimns8jBIaTiaKIbrcLt9tNC+71erBarVA+0+n0sLvhzyMEunJ3lSXtQxmbZDKJQqFAx0YhQwhBvV6HIAh0ofu+yqIrqhjJYoCAVZ5p6+dd5J5uqci/34bP56MqKEXXajWUSiXwPI9KNoesvLh9/86bOHxXYkbWjwECvMOG4OYdnLv3F8GlIPhKje6BMuuEELhcLhzsNxHoSjj/YFP1X7l/F3OLC5MjMC6z6/JFCC2RLmsgEEAkEqH3jmwBws2NcUcMtQ0ocFRmYpL/CIa+JPIIDZkm8qiJwEQq05hUEwGecKhWqygWixTlchnyVmtMoa+bJgJnbl2DM7kH7ssuxYnvKQQ31vStTGN0TQQ4qwWe9VV416+qMJ+e15hCXzdNBPQtgS36jABb/9hPzxRg7yFbhJkCbP1jPz1TgL2HbBFmCrD1j/30TAH2HrJFmHoF/gAAAP//a+qvFQAAAAZJREFUAwC/Po0wdXIrkgAAAABJRU5ErkJggg==","mh":"data:image/png;base64,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","mq":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABVklEQVR4AdTSO0oDURTG8W9utJgFuAI7LV2HYp1Gt2GnS1CY3koR7LTTFYi4AQ0IitglXd5zky+QKZIJmce9c88JHMgM8zi/4W+S4yMb355Y3J2qHNN+7+Hl+gsHf31o/Bkuffg/xOtNB+23Lg9VzQLAjeOxRfLwi+T+B/Eo5SkVkwGW22pLag1AiKakcgFEaElqI4AIjvSktgKIkJxUIQARUpMqDCCCIy2p0gAiJCVVCUCElKQqA4jghE6qNoCIkEk5ARARKilnACI4TSflHEBEk0l5ARARjVPsPX5j/+LD63gBfCLF2c4Ezy1Li9dxDniKpjifL98xXvfOHl7iNdk9uX8GsLhsTXC1m2JootxrfJx0AmgymdWPUBvQdDLOAKGScQIImUxtQOhkKgOkJFMJICmZ0gBpyRQGSE2mEEByMlsB0pPZCNCSTC5AUzJrAG3JrAJmAAAA//9NCheYAAAABklEQVQDAB2WS6gmD516AAAAAElFTkSuQmCC","mr":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADe0lEQVR4AexWaUhUURT+nMm93B33lSw3CsVcyBZoM7L0T5Z/QhKKSiGJ/lbUzyAhtSgiiSCDCErsR0klSGmLBomaaWFpolPjUm4z08x0z4M3bu/N5oz2wAeHe+455373fO+ed96VtSRuNUhZZJD4s0JguQ9Q+idwI1wDKYvsZrgWUhaHllC89zTWM3Hkd+JQAvlRo8iPHHVk/nAsAZY8kXAkA7sScJYZcDF1AA17uzjJUEwgkwk/v5T6Ay4yvV35WE3AXS6egFbvhPOtIXj4zRdpAZPGREkn27nWUGj04luawjaCzVPE0eYF8tPtIX94VXA0wAkVHQq0j7oZ/Z1jbpyNfEajgGIOW2CJ9d9AZuCEEM4cW4i7FumBk7jb7Yc73f7caYR6aObECE2yWLkJ2U3ZrD6BUA8tYtaoTWFiT/gYjjZG4UhjDIoao1HM9N1hv02uoXYbzIibDBJwWk1gWC1HQfSIANSMqearH6q7A4yG20wnm9EgoBxkmCr1KgGPaZPVBJRTzihNVII6jhi0WrcQVsjGr3dljeFEwk8MTi4BgXcqD4R5anEmeYjff9HjWYZFpfn2l6fVWAtflRmIxsHVUE3LuX6fHTRuJtq8e7NiHBdSBri336xcAgLUCis7FVwJ1e7oQaL3lPksRSKSfKZQt6sHcvYaqxgmYYuEiprZUlGfqONyWxB3Cr5uOrze34Vtwab/DUJAdHqvcrvg46rDMGsM5e0KoTCzNisIzGBN/JWjsCEWegPg7aLD85zPuJXdizALej3FVG/p5a4atJYwDr+MBWHO7GC5ZhMBgq8f8EJZcwSpXAkUr1Ph+6E2tBzoxJX0PpxKUGJfxBjy2IWuhOnlGX1ozevgYoriVNwaWlzaFAHCIt0WsZkAbXaV1W1hQww0OieaQsaGVHYHKktWojKrj6vvRzu/oILpp5OUSPGf4mIomNYUvIjFtU+2lQ5hkCyKAAHcZz+tzLp4PO33oqlF8qTPG5tq4/Gg19eieFNBiyZA4B/YvyHnWRwyWVLXOwMxwtos2WcLtd4q5qPEc+vX4uOIx2y3zbpdCPC7v2E/opNNkfC/txHBNRuQ9jieE9IDma2E+d6zGD7eHqNdCfAJGdiVeohdOVpUniAhnWy8356jQwjYM0FzWNIncKzfGVIW2fF+F0hZpF9C5j6S/92/cgLLfUL/AAAA//9awgezAAAABklEQVQDADZwjycuwpWsAAAAAElFTkSuQmCC","mu":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAlklEQVR4AeySwQmAMAxFY5bpBjqF07mHy7iFB8/edIJC5ZNI4BVyKU1C3/t+teWpXG7FDx/4WyAGMCASIEIiQLnd2z1b5SJCcgbEARgQAcrtGJARigMwIAKU2/3cN6tcREjOgDjggwFxU1A7HwgCOzwWA8Oogh7WNzAdq1Wu+gaCopk2FgNpqDuLMNABk3aNgTTUnUUvAAAA//9HRuXSAAAABklEQVQDAAc7TJihk0LZAAAAAElFTkSuQmCC","yt":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhElEQVR4AeyS0QmAUAzEigs4uyM6SXWFIxwipNC/9h5N3jFzLemFdc+5pN8D5tflAV/r04AGIAG/EASI1zWAEcIADUCAeF0DGCEM0AAEiNc1gBHCAA1AgHg9MIDfqgR4QAVrEKqBAFZlVAMVrEGoBgJYlVENVLAGoRoIYFVGNVDBGoQ+AAAA//85HqNsAAAABklEQVQDAG5id/mC11GZAAAAAElFTkSuQmCC","mx":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAChklEQVR4AeySW0hTcRzHPx63ttzWNm/VaF7QlpYa+pBW6kNEkmWQPikUVi/RS29RvvUQCV3epCIQwuotVkSEPbouOJpM80HKydRUbKuYCqln8xQ+DSc6+J8WwfnD//A/v//v8r38JS42KCJbEVwDdpcisiX+86UR+NcGag5oDggqoD0hQQGFyzUHhCUUbKA5sJGAoYCfoRf3GfW93ShN6E51BxRiLC3OMeF18/m9m1c99+i83E73lVaisiwEdr1i1QmEw0Em/F3M+N1Egp8wWc3olBievnd0d5xfD4NQTF0C0QhWUwZzyi6Ws4qISRYCXxfRGQ04MjOY9HsIDnqFAK8tVpeAzsLUzPCfJ/SL9JiV0OwYK3oF1x4XCyt6okYzfa/dazEI/atG4OPAS6KTI6TJZhxmGaNhnOnIFmz2bYyGZc5evUNe5TG2F5XywftMCHR8sWoE0pR50mzZdPX6CMxGcDprOVx3gND3ZULhb7x5fJeyuqMUlO1HXgrHYxA6q0bAYilgaMzHjopyeoJ2bgzO81C/l/LmSmpaajDVtlBi0DE+3U9ObqkQ6Phi1Qi4XIeQohEu7LPS1HiSkuJSdkZ/8uSHk6ncegJmG1NOB3abHVfxwXgMQmcp+erNM4tLGnje+4jjORKGrTItkT6uL3hw5O3m1okj+DwPKCysJj1dv3mzJDNUJWAy2Wlv62Rk1It12oOxqYPC+ktkjT1l+Es/59pukp2ZlyS05NJUJbA6UjJQVXma5lPXKNqSRU5VNWdab1NV0YikM6+mqPlRn0AcOmt+PtbM7LiI+se/SkB9uIkdNQKJmqQ2ojmQWr0Tp2kOJGqS2ojmQGr1TpymOZCoSWojvwEAAP//snI49wAAAAZJREFUAwDBGx84jbgYnAAAAABJRU5ErkJggg==","md":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAGl0lEQVR4AeyXXWwcVxXHfzM7u+vdsb1rL46dGDvxJ0kamzglFUiJSpu6LdA0VSUDrXipSkFCfaESLzwgEIgXAiqCCiRACBBRW9QQlYRWblOqujEhhDRuPuQksLYTB3+vN+vd9e7szgxnJmubVFHlHTeqKuXq3nPvnHvOved/z7kfo9Lza3stxY5jr6XEW6L2WorKRzzdBvBhO/C2B27mAdu+GffW8NbsAcNYMcwx/FoRkhYUpaQz4BSHvyK10srnV9peW2sCEPXP8/Kf27h0SXfnN8Xoggb5d+Eff9R55cgDHDzQw9HXG7CkzxUqkckpjcOH2pmMBkocb5V3AFaRvpYBiukGTgx0MjWtovnAPyoABiE4YqNpMQJqmKkr9WSyLKeMeGbgjU4K6XqGt9ezaJrLfeU21HIVluWtHO1VV8kXTGYSCu+eqnO7tEaofgJqvlIkNR13eTV1SUIVbtMl58/VMH4lgClumdVUkmG/y/dCPAPwKwYFs8CV6Qy5vMnknIazkGEJoYgY29BgoPhy5AyT7h1XxRsr5s3Nw6JhMTKZplC0SQc8m4FnTdXnqNpiiElRgt8uRYGigCpdqgI+zcSSHRwKljpLGISFbYpuroi7NVxS6iyzkqnK1CiJK1Jblk1VyC8esDCLft4aqGVC9kI2B8MXqvApYSp1lbPnY2QXYTYBJ05EmZ2tJJMrENEDsjcKBBzUMp6X7BmAs4qGnJWLEj7O/I3xFD0/yBB6LECqT6H5GYPe37/DnhdP0v3dBRJfUtG+WEHnt/NsPXlNvKRIeBUltBQUWQg8Js8AFHF+pDKAX1PQJfDDBYXoaB5dyWF22VSP5wkeMNAPFwgpeSo6LYINOaLxRfSUJTp+bBSqwgFkG3g0H497IDSP6iy7TBvw+4Qi4QKOV5Jfh9hBsIKgtQm/SdrVUPUyZL4FRZFWFSGSw0FNKPiFoYRst10uUctVoGoCeg5RbDp3o2rJKGUWCh3gl7PebIH8ZggOCe8OsJPImnNjEtSqz6Lqq/93Udwo8b5f6vv2vrdz3SX4wg+hdgRtoZaiYq1I2GDKV/WP5IhshdSr8iHXgPom5C7I6t8jXviagBC2k20x3KkRT27en8JKqe5nuaQ8rekOeO0ZOP05bH2Ov6z77/J8Fz+2nf6f9nLqpTv52/Y+IveDXg9hCSG9E85s2c3p56XvF3s41vr5ZT2nkY6rZA/K5eF8lFnKA+AMnpOA3vo2RsfficjRaSqy9MKfDHTxu9f+yv7fHOds/nEOvfRlihLwzkIPne7gXGofP/ntCX51pJ946F7RuJ4VxWR2IIC1UIrB6+xVU3XVkkuCmRoY3Yk23YpfTp5XS16wUORIzNG14zni/+4mnbb50wsPMnisiwvDTQy8+RSWZaIoKra1NBg0tGTIngmsMMpslQFgaWRRGbsTq/4Kw3qKqBHAWbuG2otUR8dobT9C08a36Or+J7U1aTmtVHbf/QbNmwbZ9dlnCesXaGmSXS1azj5QVfFgUcZcGr7M2ptmXse3qLPBCLFtvpqJ4CIV4X/R0/osx49+n9H4Yxwb2CsPvUkxeJxXDu8jMbue4aGH2Hffz9i28Xnxgk2o2mAh6ReTBYRQL9kbAFSqTz1MVybK29EZXmy8jBpLUTfSz6fWf4MnH7mXxcQnGP3PZzg7dA+jw/dzV/uP2dP5BJXjL9CwISMvUTnM6nNcmwmJ3Y4PpfKQPQIAuXtIagWO18/Rbqo84Mvy6devsrPtLL13D7Kj+XtUzNgkz9exs2k/fXv/QOjSGNH+HI21Bh1brrrmKori1l6J6llRdmJ3OsrP55p5akuW8C8h0mtyx30GExMqoxfXY2TP4DOOMz5Sw1wiTO/Tk3Qn0hjPwSOPJ+RnZ0F2gmOB7RBPxTsA1eLkRBOPPjrG3qdhZgz8ffDOUIiB/h2oqkEwlJe/NI1gZZLTg90cOx+Bb4qd8tTIPwkPPzRL3bkpeRMJz2NWPepRMAocvtxDLAbKd+T2ldryw7pYng1tcVo2X6aCGiorAtTGsjR2XmRjc4bCJnCjphH8Ir/t8jUy6Txek+pVccpqIaM0u+qRB6HqgDTl1v14k8WuXQm2bs5QWTOPVpHmkz3z7BZeW2sRXS5z6yhEBLTz4xPzB9ii+kTZW/YM4L3T1Yeh9Lh0u+rW2dy1e5i2rmFaNuVd3hLRda57gbWnDwzAzUxpXC8P1+4bjb+Z3Fp4txTAWgxbre5tAKtdqVsld9sDt2plVzvu/wAAAP//WDUjlAAAAAZJREFUAwBaFqfH7j8mVwAAAABJRU5ErkJggg==","mc":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAiklEQVR4AeySsQnAMAwEjesMkDGy/xIZIwNkAHuCL8zDC8EZ1AgkWXea//2szjFH88cC1QIxgAGTACdkArTLMWAjNBtgwARol2PARmg2wIAJ0C7vb+D63tE5+huwj7C4wYGB4p+K8SwgwMTSGIihFoMwIMDE0hiIoRaDMCDAxNIYiKEWgzAgwMTSGwAA//+SQuBkAAAABklEQVQDAH8Ov4l4mX9dAAAAAElFTkSuQmCC","mn":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAC8klEQVR4AeyXz2sTQRTHv5vNj8Y0TVr7O7HWiBVa8dCD3vXgwZOInv2FNw+99KBX9SIIelOkeFLwIlLwD5CCiiBUag+tmNrWSkxa+2OTTbLZrPMGs6lkmkMjzAS7zEseb97OfD/zMjsbz9zgqNOI4fqk04g1Mjfd60GTX3sAsgv4H1TA68he5Lrz162Ar7cA7/5i3QFkd9YFCJ9aQ8eFlGyNdeffESB4zEDLUI5VwAL5dUeR2CkGcBwUF/0IHDLhT5jcB4tJ1Lnj1DUAzh+h9qYfi2NDWGJGPo1Q6SNfFasB0DQmjX30ji8g8WyGW8/YN4DFWINqVw2AwxTqEQu0gcFhgLbTa9DbLVAf61aq1QCQZjuro5zTXaHlogZ7S4emqYdQAwBobMVXkZnoh7US4JaZiPEYHEE65F5CRf54EZGzGWQ/tHEjn2JypYpnFwJknvZj/WUX9GiJG/kUEw8hN+oCxO/Ngazz6nf4egrYN7oFL9u4ZOT7uovovLbMcyhPruzq7C5A8LgBsgA7uKyVFqTuH0TuYxjZ9xHuWz8C/GCjHLLqEHI9F2C7DFrp2J0vvAqhkxsgnyqzPUcVXwhQSAZhfgrDnG5Fjm1k8inGHlCq6HZ1CAAcGFPt8IRK7DBbRejEL9iGBmMqiiYBADouphA9l4b5OQzrZxDBkRzaz6v5Wi2oABA4nAPKgKfVhr2p883bcpTFoN4lBLANHca7CPx9eUTOrMIXL7Cfka6eeqZICLDxuhOO6UF+PgTjbRRO3gOKsXzlmhAgP9uK9KMYtt5EYc6GkLw8DIopp54JEgBoiN2dR+LFDGK3v6L7xhISz5nPzgWWr1wTAACpBwNYHj/yl6UeHuAbWzUCIUApw/4PD5rou5VE380k/AN5UAzCbLlIrqTKiqefxABbw/qrbixcGUby0gg2Jrt4LP047lZFruzq7C6AOU2vDmEU2WtEpbtseOGY1ccn9VXyKjmyv10A2UJ2O/8ewG5X7l/d1/QV+A0AAP//OGOmDAAAAAZJREFUAwAfTmM4os4MlwAAAABJRU5ErkJggg==","me":"data:image/png;base64,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","ms":"data:image/png;base64,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","ma":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABoUlEQVR4AexUSy9DQRT+7ugzakHSKGKNVImN2EisRRcWdpbCumLn8R/4FTbiB7CxtGZB2ShRlXpESTzu3DEzfbBqyJzbmybTZE7PPXPvOd9j7mVHQxnRzouhzX+WQNAGWgesA4YK2CNkKKDx49YBYwkNG1gHDAU0ftxXB/ZTDGoZo2zSwFcCB0mGw2RHk/HmW6QEvF94bmIO4rIQ9QRUXt/i9YTon5TAbj/D4kQIK2MhrKY7UIgB13EHuXS1pvb2+hwi6NU2pAQWihzDr8D4i8DAu8BWnmPz3MWgzDOyNlIRmL+TtlRnk0RSAmHhYOPCRc+nQD7BkPoQ6JX5WcLR+folh7qHBHmtCSmBWk999rNS6dxoGGvy+GRLHqK0wtdHwRcCx90Mt/Ilnil7mH4QKEYBVWtMJUz+QeBvUysh4DHsYK7EsVTgWL7imL33UI4Abz58UckJdLnAzskXJp9Fg/HUk8D2qYtO3iiRJeQEFLLID3Z1qVdbvQMacYuCLw60CLseYwloGQIM1oEAxdejrQNahgCDdSBA8fVo64CWIcDwDQAA//+pCfH1AAAABklEQVQDAPwJxAmjSVMQAAAAAElFTkSuQmCC","mz":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADqUlEQVR4AdRZa0iTURh+tmYkpqWBF0QpcCWlUBoGC5GyJCs0Q03USIkIjDBQiEj6U1mSFqT+yCgXjApmZUQ3IimizNCULgpqFF29RSqWhuZ6Xm212Cbzh9u38Tzn8u7T8zzfOe/5zjZ1tQ4mzwqYUOWeVOc8ARqOAdpuuOVLLaojPwFNR4HUJum5FycMiGTvEcB4Bjh9GZg9JhH34F8DZrl764BHJ4DQr+aIsmsrAyI35i3QfARIfCU9ZdOmAZHs9x24WQ4UXwNmjUtEmbRrQOSqTMCB28D9k0DggESUxykNmOXGtU8uKanNMaXUDhkQsTIDMhMyIzIzElMCHTYgYiUXJCckNyRHJOZqTsuAWazsTr0lAaP9obXtvdm9La6k4wbCzPIna3VXt4dXYoq2bmXc3LwdeQOuomMGvCi6gLTAZ2mbTKr01tawdKMx7g5pNNbEOZtTGnhPkSVk1yoWUeQ8gM84XGXzDakhBaks5BgVCe67bDsTdg30UIWOvEVW/GKhAkqDgAw255CxpCW07DSQOU42YW3ABxjLAfIWAT7zgdpsYE0KEJ0JjCwF7m0HNu6iUmEaa4v/4Mlu9QRN8HSSEYvhObJgENA8p3gtUFWmQXNGJQ5ejIEuYSeCNlRgqLAEY7m8UJYVD36wccygf8hsaJ1gQk0p1ngBnHsGjPdEoaDoLNYnJMCkmoMfI+N4+DoEg1eCgd38MwWcWG0akFRs6wfK9APQ6XTIz89HUlISsrKy0NjYiMYPqwHJC3qwBT2DMkEdYOKwPZOwMiDin3LEeHLbEj9sjR3Ez3cl8J/dBlVnGvZveoxLD+oguxEv+Q/D7MnqyqXwYZLdGYeVAblnERyWJ2lkhtcjPsSA4OJSRKzbB9+7dfD3bkD5wj5wgmD56mBH7rreScI53ASsDEjUm0WqOFnGhmQkPxNoZMkcYp+fnedyelawaUYNG9HkSyeL55CwaUDegLjYw1YnaYnr7OhJYkylMhnCwz8akpNb1pLJyUktzqZ9A9xOMUSVtvCFwQDfUc2Nwx3Z9cf7avW5cBXtG6BGu5BHtOGbB/yLFqNjy3JXcnoGZtFSHnmK5LmIpcvhuIEF1FpJSlJLgrOpBDhmQE6iBsqVmpWSMLUBudNyx+XOywwoSfkfLfYN+PAKWeuy5mXts6tE2DYgDzBZMrLbKFG1hSZrA+l8t4oMJN0A/wx4US1/J0Ahaw/STTBpQL5xuEDFPOOwdCuosZl6z5OhpBviNwAAAP//I6bzagAAAAZJREFUAwBeEolhUuYWLQAAAABJRU5ErkJggg==","mm":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAC6klEQVR4AexYS2gTURQ9TdsQNMYifjDRtqsiiMTakloXXRSr9rMIsVZ3Ul3YjVQQVLR+0NCi1IJuXLh0365scWPBhSJVFHEniKI0LmIbDY1JaxLnTDNjSJxkJjMPSUno7dw575xz38mbfogtNYd0OZcNZf6qBPjfB1g5gbV9Ao5dAEtgSrGPUJ0fYJVrgKqNR8ASuH+IOwGbC3C2rxZ7QSnEBajrAarsq8UeYl7CAlRlPfvZvdUxbL5QC6yuA9/asOTqVffKnpjVc+gn5AS8m7xYX+NUA7AnpgIWNkICtG+VfnhzNvkvLIdS0q2hAO51bgT3BXGv7T7u+iZwu/UORlvGcLP5Fq7vvYEr3hFc3HMJgYZA3maIcY0ccqmhlh70oie9OSNPXAAwFGA+No/x9+OSXRod2zrQub0TXe4udO/oRt/OPvjr/ehv7MeGWulXqMTK/iLGNXLIpYZaetALSMvenJGtK9YbCkCzyHIEwy+Hce3NVURXooRMFT3oRU96GzUzHEAZMPN1BgOzx/D6+ysFMnyllh70MizOCEoOQH04EcbQ8yGMvRtFLBkjpKvIpYZaeugSaZBMBVA8Jz9P4sTscYR+hRRI8xqKhWQuNZokAwsGAhR25eb5PBdmAdHfUV1Bi/ko65YFaHA2osnVpPhqXskhV5NgcMGyAIc9h3SPNsItZmqbvmCHFXXK8fd/H3loPIHo5aBckHoZy3wj14qZ9LDkBGq8u1Fd78lsD0h++oKFgdOIT03LxZ6YQiCXGuXezNWSAI6eg+oeEk+eYvHoIJIfPqoYe2LLz16oWLZGBUtozAeoqYajV3r+k0ksTTzAz3MjSMfy/yYQ+3HmvMyBxJU1JWw4V2I6gH1/q/ThagqRwbOIPXyU6593Tw656VQKtb7mvHWjgOkAti2bsRg4iZW5t7pnk0tNtcetW6NFNB0gPvUYqfCClr8mTg21mgSdC6YD6JwjjFYJIOyt1WlcOQGdb5Qw2h8AAAD///W9rjEAAAAGSURBVAMARVbIOFm4dLsAAAAASUVORK5CYII=","na":"data:image/png;base64,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","nr":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACcElEQVR4AexVW0gUURj+doitViOxiIgElxClHmrVoswtLFo3tHxIKsoCoSAzssKHhGq3Deol9iEQQVgIkkgpSrttraxC3krLyh5yvay6K3hbL3hBRR1nxpdd4ejIwR0HZjj/8P//+c+Z7/u/MzMMtLdYORsDmV8KAakFVBRQFKDsgHKEKBtIvVxRgLqFlBsoClA2kHq5ogB1Cyk3kL8CZuMvyNkY08lGyNnkf4QeftZBrD1xJsBijxNdL3ZfmjrGbI/FUvboaxzee08LNRW+NDh9ZwS/zLOQW2ptMOaWPUKzcyzu3TAgITYSSQejYDwag8R4Le5mHcdauIgENqjX4ZAuEoxKBWdNCxwvsnD+lA4X0+Jhf34NlXWt2BO1HdczDmNTyHrJuBAJTE7PIESjRmfVA6Qc2w3NRjW0EVsQsSNMyJtuGlFfegcNTR6Mjk+tPQI8ovJqF3Isb5F8JIYPA2zb1lDkPi7Fjz9dAflgB0QFkvXRqHiZjTcFmURM+ZZ0NH7IxbmUfcSa1Z4gEvjyrRlJF/JhuFxAxHDf+gm61Kco/vibWLPaE0QC/IO1O8NRZL2E3oFRPgywru4hmHOMyEw/EJAPdkAkoOKQnEiMRuqVQmTcLgLLsmjrHIBvaBz9vjHYSuoQtjcP3p5hhG/WcNXSDCIBlsNT+KoW9X89MHDvw9W8YlhtlXDWtkB/9hn0+3dhbGIajioXBkcmuGppBpGAP5yanx2wlXwH/z+obnCj2d2PbNNrhHKfWf86KXxRBN45mgRs/9v7UFb+T/BdHAleASGQ8CaKgD8+t3fQP5TcXzEByREvAqAQWNSQoIfzAAAA//+Lar2bAAAABklEQVQDAAVC/FgvG7WFAAAAAElFTkSuQmCC","np":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAFiUlEQVR4AdSYCUxURxjHf/tkkUUQD1bQWjXigbYqtRqqFQSMxsS2tpgCRjlErRq1RETFKyVpYmnUYFpNjKVIbL2qUVsqkSJiFYOoVKy1FISoBSKHB5GCYGXpzIa3BdnliFy+5P/mvf98833ff2fmzcwqtgRm9iA0iFf0UgxoxszkTkxvFqZB6KBXTYciE95Gar/tpEzpQ82fOoLXS+5VgVGATHYy95VzHHTwJXuTHYE5ojcmSL67wyRATXQtVxz2kzBqCBVnexEYo/LdtWwiQCbqQjmnOOa4lKzFOoLKYPEMuullVoCaaxA37RP4wdGNksNiWB1W+e5UNitAJtqPauL4Wb+B9Lnic/tM9EaA5LsLWhSgJjqHPN1V4rTe3PlK9EYKzHdU67qybLUANcmdnNN/SaqHHVb5WkLCVL6rSosCtIMHo9HpzOY1hULtBb7r/RE5W3sR+DssGWPWsBNIkwDF3t4Url9wMC4JCbhmZDB41y5Q6s00GhQHB9QrkvT+33D6DWcqfrUhJFrlO7Oszwz6+vsjRegmTmRofDw6Nzdsxo1DHxbG8BMnjDnpV69GsbY2Pqs3Vx4piRzVh5K1XEdwkZjknmpdZ5QmAdW3bjEiMZE+vr5N4tp5euK8eTO9Z83ieZlYFppYwBKyHE5ybJArD4/YEhRvxqRDKJOAyvR0Kq9dMyb6YqQeffviFBlJ4Zo1L1Y1eh9AFYc4NTCcDF8rQqogdF4jgw54MQmQvovWrqUoPBxDlYgtiXpUXblCrocHNbdv1zPNF77k2F/igO5dCvaI3kiET/6fOM03bXNtIwEYDJTGxHBzwADy58yhaN06cqdNI8fdnadZWW1yrsXA1yQ7fUGqtw01BbBoRZsctNK4sYD6RobKSp6I+VC6YwePL13mPEOqIphREoFP2Tp8HqzH51Ek3o8Fyjfi/WQTXhUC/2xheuVWPJ8KVH+Gx7MoPP5NYZh2Nvm9Xqdihzg8/UY7X0pL/qypRUOd7VUGGs4xNCyFoZ+eZeiqXxgusTKJ4SvO4LJcYFkiLstOM2KpwJIERob+xGiJkFO4BhfQZ1kVPXa3FK+t9S0KkA6nU8Bukpz1iB+X/Ycx4ttD8CLiDkJDxH4PDREfJ/21J5oXoNWaYo2jTBNN6mgnAv4wkd3gwayAXmLiKnZ2OImvkuLggG6CPJzBW5Qon3N+jBP+17tB7sYUGgmwGTsWK72e16KjGbJ3L/0XLWJkcjJWjo7IxUxuKSZRrERxYbwz/plGD118UxrGry0v581799CNH0/fBQvoOWoUtpMnM+zIEfoFBSE/s9LeXZyft5Dm5kxAhnzvSpgEyGEz4swZ6mprjXuihkkZe0AsZFKIxtbWWDWVImUjaW+L4ZRmJLroZhIgF6qqGzeQY99cLtbDhvFg3z7qGqzSHhT22EC6+0D8L5hr0xmcSYB+5UrsvbwsxtSILXWfuXONw6qhkRd/W4VzeYozfikN+c56NgmQv25Nfr7luFZW1BkM1OTmNrGZwT2rNVydNgi/5CaVHUyYBMhxfj8qiufFxWZDFm/bxsPYWDQ9e5qtF39PWq8ic7oYTmLzZtakQ0iTALnTlBO4ROx/niQlUZ2dTV1NDc/u3jVuoxWRuMpZymQ2+doVZPo44/ejJZv25k0CpOPKixcp3bmTipQUcqdOpfz4cfJmzjSKKYqIMH1Gpa0lvEdez+VcnyWG00lLNu3JNxKgOi7dvh25JhSKs0FNXh4VokfUutaUH3DbJpQbswcRcLQ19i9jY1aA6vB5aan62OZSHGpsgsh6X/SE2PS1uXmrGzQroNVeLBj68ZduATc/HIj/AQsmL013qACZ3XyydQHcmid2sbHyvb2h2FCb+w4h1R2JPUxSHqBbCIs/bm8B/wEAAP//0JV9kQAAAAZJREFUAwDkMcq8ORTyxQAAAABJRU5ErkJggg==","nl":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAiElEQVR4AeySwQmAQAwEj6vDly878W1f1mI7FmAh2kJgWcLiHOSXLNzMzmvZ3uSZI/zxgW6BGMCASIAKiQDlcwzICMWAfAPHc4/kyTcgVrD9HAPdCjCAAZHAnyokojKdY8AEthw71/0cyUOFyq5NixgwgS3HYqCMyrSIARPYciwGyqhMi/EGPgAAAP//ExJk3gAAAAZJREFUAwDE3u15ClNOPAAAAABJRU5ErkJggg==","nc":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAE20lEQVR4AeyXfUzUdRzHX3dyp3Ccd3AIDBQpFKaErSHNyHI2zTLIqTmfarpp6R9kbqVODMHM1sMyrOZDpjSf0rZas1zLYi3YnGU5N5HJkxUPEgoHCBrIw/X93incT+73g+PJsXG7z/c+38/78/18Pu/f5/v9/X6nJ+Frx1AWPUP8M0zgfjdwuAM42qGl3iVSH+SW9KoDxtYrTLGd4vmJu1gel8GqqelOkbq0xQnM0PLXoFDxjkBbEzMjDnJyy1aOpx1k/5s5ZO24xItJZU55Z90lp+2EwL5N3cqMsVnQ3jSgRHpM4EHLOdKeeYPD6ad4KvE/JjwAAVZXbc3N8OU3kLLJZZPY7Om3OJLxPamzNzDefN7lOABjjwhEW3PJWLSXtJRKgoOUVfxxAZaugUMn4MPtSixkDGSsu8pbiz8l0vSbEuynWbcEgkfmkb74c5Yk13lMuesz8PeDnaL4yHEeXViaXM/2ZXsIGZXn2aEPVk0C5pG1vDbrExbNbVRNkbJKXP3dMCla1cUJLE5qIGXmx4zyaXDO+2vQ1/i/i5rsH7+ZFQuqNXMFBsCa111SdEXTlZULazgUtUE1n1odWnbVDly+eYuIefYue969xAsXIXMfFJbonCL1i/nuHkpdnomwZDuFjTeVQB9mqgRqgxuwhrdphs45C8HioBoMDqRERcKZc5pLsIa1YQ8ZBAJ14Tewie2hVc78uZB1DOKnwJyZsPcLSJ6jtQKCAqE+9Ia2kxeoxw60Oxw0+DV13OfV4o0Ng7dTIWaiq7Bt4jkQFqrm7bLLM1Pr238PN48E7C2tBI1xuDJqjDodzi4VFMFlIUE2DWc3KCi0nZrbLW6W3qseCTjDtalDTvzOUFgCZ//UOUXqd8zaP62CubZHj1GPVQYafKiu9AgpAoudRog4xGtXOpAi97fCQWVS/a8em9Gggnpn9lilXuwNc7OR2rrug5VfhZwzLimrAElKa1WNXbwvNflquXiFeSQgI1irzNTUSu2udP3NzoXd4oXzsQSYNhV27oFccWvt6tlpkTEtleZOQx81VQKBVf7YK7X3akExpK6HA0d1HDymY/tmyC/Qrqjuuo5Au0nbyQtUlUCMv4mK0wFUXVePNtIIZrdabOIebzSq+1dWQeWPAUSb/NSdvET0thdGoyYvxT7EkdPqFS2ZDzMe78w4LR4WJnXO79WO/WRgWWycaj61OrTs+nuTuM9v+xjIbI7lq2wfd3OHLpqE/H/wfrqDzB0OQoPBMroDVignfvbho5Y4WkZ4jqVw9mKiSUDGqQoIJKM0hu9+6XoefhV3n5hpsHGbjvVbdEwXV//vMrlKKSfF2m3lk7hm7ebdRLmsR7NuCcgoxdZQVhXHsyXLr+NM/JANScvhn/JOYr+f1zFrgXgqi8Mt18k9v/GAP6tL4im2iPZIYz9LjwjInHVBFj4wPcqzR6N4dacvC1ZCc3Nn8dJHSmmFjieTIe2wieeOR5FpTqDOZpHQgEiPCTizG0aQNz6Sfb4PY3k5mslPm5n4iIEJk/VEROkJjhhBeNwoWqeP5b36WPIiIsGgdy4dqKF30UNN2OPGkT8vgaLVT1C8IpHSVxK5tmkGFWsTaZwbA+HmgapZEbd3BBQhxMTfCFKEOtjf/iEw2FW75Rsm4HYx7os65DvwPwAAAP//X14UEgAAAAZJREFUAwBcDMeoYhVIQwAAAABJRU5ErkJggg==","nz":"data:image/png;base64,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","ni":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACcklEQVR4AexVS2jUUBQ9ycykk4k20xkRBz+4kML4AcG6cFsUd65cFEqhC9GiaEEQVASFqmDFlVi6cqOICxVE1I0FdVEXZbTW1lrFgh0/SKfza2eSmUwS38ssuzCSG2QggfNI3ru5ueecm/dEHBu3WxkiWvwKCPxvAwMHAgc8KhC0kEcBPb8eOOBZQo8JWt8Be3Qf/II2nIA2nIQ10uXbN8gdsO0Gij+fo1r8gFBEhRiSYDUq0EofYVuGx4ZZ/TopAcusYvn3a8RTBxGL78L7wiJmygZCUhyyuh2VpQnUKwurq/AwQ0fAtlDJv4WS3AsIInLlLH6JG/CNIV8tgV98TV+Z57dkICPQqC8hLHWwtlnrFPcwM4Q72QHczh/B3cxlZ04QI2hTtsA2deeZYiAjYOg5RiDh1DT5bhRyqhv90RM4XeiDuo610+wTZw3MnWpppnlPMJIRkNU0InKK/ag1zBfGsSMyhE3tg1iz/izS0ZtYyI2BSc8c2AolsYeg9GYKMgI8nWksY+rTI7yYVnB/rBf3Xh3G44lePHh5AJPfRUzPPYNplHkoGUgJCIKAnZ2HcOvkCK4fPY8rfRdxqeccrvVfxYWeG0hv62YuWGTF80T/QICH/w0Cij+esjbSnMCQAHAwXmxOh1acgsnOBGeRaCAlIIYVqKn90MufGeZY0XVYpobayle2/2dZ73dBim0kKr2ZhpQATxmWEoh17Ea4LYkaO7Rss8aK3oxoeyf4NspjKCEKA2/gByKDXyCfWUT41CzE4xlfvsHrJneAUl03uQICblTyMyZwwE913eQOHHCjkp8xgQN+qusmd+CAG5X8jPkDAAD///012roAAAAGSURBVAMAd7ObmOvz+6UAAAAASUVORK5CYII=","ne":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABjklEQVR4AexSPUsDQRScnBrFBC38gIgfIFgINla2iv8gpahYC4KgNlb2WlgIKqiNhVUKC/EnRBAkpRBQwcJCiEog5i5yZ96lC5fdS/blwsIGJre3M7fvzZu13tJxT2dY0PxnDHQ6QJOASUBxAuYKKQ5Q+XOTgPIIFQ/QP4GpjA2d0ZYEStkMPnYX8L426oPWtKd4WwI/5zXw56BwsY3PoxU4rzm4pR8ftKa9wtUOUNUEdtLiJqsBO/+I4v1pw1aKdycoP2cb8q0QrAa+rvelPXzfHEg1zQjYDHjOr39tZMWdlyfAdWWy0DybAWrKq9jSwqTxKmWpLqyAzUCsL4Hu1Iy0Lmlivf1SXVgBmwEqOJjeo4cQYTTCA+rIJgzUfRnwmlxaR2JxNYCpbRFHmtobzz+rAWppeOsSqcMHJJc30DUy6YPWY8c5EEcaTrAboObi0/MY2jzH+FneB617JmaJYoc1cDsHndGWBNjHLDjQGBAMJxLKJBDJmAVFTAKC4URCmQQiGbOgiElAMJxIqH8AAAD//znW4g4AAAAGSURBVAMAbqJBqIYIN84AAAAASUVORK5CYII=","ng":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhUlEQVR4AeySwQnAIBAExRZTVKo2hpSwDEsQRvB3t+fNOMd9bXI3OOtZaPb37jkOPy7wt0ANaAAS8AtBgLhdAxghDNAABIjbNYARwgANQIC4XQMYIQzQAASI2wMDeFYlwAUqWINQDQSwKqUaqGANQjUQwKqUaqCCNQjVQACrUqqBCtYg9AUAAP//xssj1QAAAAZJREFUAwCsfnskH3jMZQAAAABJRU5ErkJggg==","nu":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAFVUlEQVR4AexWaUxUVxT+5jkyLBKoqCAmM4K1AuLIMqAIiIkGW5dqNehUBUMNUsUFTcBAo0YTFpeoVYJiGbAiIrVuFQdsbdWqICi2IgqIrBUs+1a2YeD1vUsHZ8r8mz5a07l5373nfffcc8895768Q73aGEH3d3TSSmU/vefIdZqy3UzzbDZpoLtHQRcuDKAfmosJfnVfRrPNyG6bht7oqSF0XPItunrvUTrXUkLXp16lB8rAKajOp0V4OmcFegqKsG/HEty9sBMTxplCW+ObK8FC25ytcBzyZEGYd/4MGr+Vw/H7sxi/Zpk21X+Uo6jTR2Dm7Y7nvgF4c/wMvCS2KMzaDV9ve42NDIWNEIXXQBRWCyObVo056VIJ7ofPh9I/BJSxEcTZl2AstocsPVtDj4sXSrLqKG56LMCU09F4HXsSRR8HwUzZi8wzWxC7azlGjaLIvj3V4yCY2AcDSwW6K8wJJzDgIzFKihiTJlSt246Jm/1hfyUBfQJDrN6SiKCIc0SPy45SKJQI2XMB6zPKIMpKQV9jMwo8VqD9dg7Cg33x8HI4eDweQA3gdZwVak5aDfmTcyoQ7gnxaEj7DnaXT2FSeDBKKurhtCgaF+VPhvS4FAbDy+wgv10Ip6AktB+Owtil81G8chOqIg/Bxc4abKQxQKE9fwwBo06ezoAtYE4H8YNLMJs3G+eu5DHOR+FlRR1GqlED5fFQoTY3Fl6e9rA5tgezWp5CFB0G3mg+qmuaEfFGgG3iqQhlENluDpZzLb0Dx9tpMLCeQPxd94k7uouPD9lj7ZIJDjvqxZLPoI6S1WvAQp1b+2EEMjr48J37GxYwyOw1hj/DqeuUSD8dto6d59B3YprqeJAPFRSV2TCx+YmAlVm+7X4+xs6oRtNVGfYH5hE0XknC+OlVaGXmWJ2Bpnuw8MmExdxMsDLLqUB24bAb+gbYPfpa+LBY2Apzz3awMsvRTHcjR4QlkYsZafBZzMjyhyLwBl/RWWwMgVUfDKwURP6LHpGBMvV0hQomzm5oyPJG831PmDi7E97cyxUeY2j4zKxFbJozDqY7wUdcCzdTwIyZU61tuuuD5ns+ZI2KY0euT0E5ZCThLZIhPPADwVsuCalZMajLm4zDX7kgJkGC+pxJSGE4dZ3Jx+Rgoc6xMucHYGofqDBmeijOX3tE9qR7elH2+Rd4LJwDofV72DlKAHnbI9xsy8P2biWEk8YCNI3aozLkWjijMiwaX6c/AFMfDdlj7RJjHHZD34DdFCv8khGJNcvc0FNaiQJvP3S9eAXTtAT09vUTF/h/q4VeVtbDescGOP6YipbMO3CJO4YniRvwgY0l0R+Jjhwg0M8D+dcjMNVmAhrOX8Mzn9Xkx1S4LRSuG2VMoGloq4VmLT+Ib27kw8TJgdQ/BtaW+EMajLtbPeC3yGUk/AeVfCgAsgP+MMQASgPDmKsQA9GJfYjiC7E2PAVd3QriiLZaqJcpQ6RbZdiwKwVKQyNMS4+DcG8oqoIjEUPVIGn/KnDdqPUrZzN/zzIUePmR0TQ1HgsSHw+vJLXUQirnki/mYOZHUSgpr4NlkBSOt86h/edcuMSfUKlwNlKN6Rl4Nk8KE2cHPN+xE5KQsygsqR2+oZZaSF2JrX+cFkWRK2U8w45cKaNptuoqnMiUhdtSuGU/xpSIA5BKvNFx/Uv03zqpAUGNARziz8I9v4BAnHYNdDkPnTeOa+h1yU/Az15C5ni/G+P93Yc5cVrdKPmI1Yl3Tf4/HeC/mRt9Bv7tvOgzoM+AjhHQXyEdA6jzcn0GdA6hjgb0GdAxgDov12dA5xDqaOCdz8CfAAAA///nZWxHAAAABklEQVQDAJ07nEfkOklDAAAAAElFTkSuQmCC","nf":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEPklEQVR4AeyXe0xbVRzHP/e2CENGy4a8CgznwIFMtMNpnMHhY0zjfEZj9gdZIDHRxfCXxkSNbn8p00SjyeKMigZjosEZ3EQcYwoM9qAIDMZrUN5vBm3poO1t622zZNksJOzeZlnCSc5tz+t3vp/z+51z7hXjD+C9kbzzsLHGq1J68rCx9kY0+MaI3OJpFeBmO3DVA8t5wOPx4JJcy3VR3BZUD0iSRPtgq2KRyxkIKkDbSDO15qrl5lfcFjQAl8tF52Q7zSPnkK8LxUKXMhA0gO9rv6bsTCnmqV4++OXtpeZXXB8UAN/q370ug8xYI5LbxdClPiatE4rFBjIQFICqtgoqO8sZvGTGOmOjdrQKU//pQPMrrlMdYMIyxqGzxZyfMNE7240+OpKM9VtZe5tOsdhABlQHONn1Fw8kPELi+hS8kohTcBATGs2n1fuxO+cDaVBUpzrAmHWIs4N1frHuiMvow9ZhuCOJtJh0DlYcoLbnhCLB1w9WFWBgxkzZv6VYnXO8/2gxES4dLWONHO0u44f2Q1T3HyMhMvl6DYrKqgIgQVxkElpBy56fdrHgchDO7STokhC9IjqNnjJTqar3gqoARUf2Ypo+RdtsC8P2PgbmLyJqNXQMt+LVeDg9Uc/PHSXUqBhGqgK8+8THZEYZ2Z6QS/79b5AVvxXRLaAN1fjDJCcxl1czC+gd71LNC6oB2BftWOxy7OceJCVqIwueyyx6FghfE8G+7Hd4POlZQrQhDM8OkipvaEEQ/FBKH6oBTM1P0DTWwJf1H8l7IITKviOct5oQ5KP0eM8xjveVMz0/TePAKTk3YFu0KtXuH78CAH//JR+tw020DzXTNX6BE/Jpk5f6AjuS85h1TmG1WdgUsZlOSxsZMVk4HQ5sdtuStlbSoAqA721TcrgwJj/MxphUJJdERU8Z5rFe5jx22hwtdFs6CXOFkqBPweGR6J68sBKdS/ZVBaBloIlvW76gYeRvTg5UMCmNEb9GPk5DRBIjDCSFG9CGgVNYpGa4klGrmcb+elU2smKAo61l5H2XjUdy88/wn8SFGWRhcNHaQayQiMU24y/7ljA9OotQTyiCV0vrkImaLuW3smKAZ+59ic93l8jvPzkUbikiWw6je/T34Rbc1NmqcYQvMu4aQf485qE7c/lw52dyqD2Iwyth0Cu/lRUD+FZWF6bDPNdF8+Q59BFRFG5/k/dyinl6w3PEronHVDTIH3vPsH93Mdlp2yjIeZ0fC8vZFJfmG64oqwLwVObzlOT/xu+v1fHJi1+xJ7uAfTveIt2whZi18cTrDBg3bMOXNBoNvqzVan1FxVlUbOGKAVEUEQThSunqj23RIoeP52qFyv9Ele1dY853vI5bR+VN7L2mXs1CUAFeNubzzSu/Ioj/94xaEEEFuCsmjcc270KrUSfeA0EHFSDQhGrXrQKovaIrtXfLe+A/AAAA//8mC36lAAAABklEQVQDAEfI/JBnG/HnAAAAAElFTkSuQmCC","kp":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADJElEQVR4AexYTSycQRh+fEIprV3VFbJdKyUlqpXdpiWkcZBwQETaRkKixEEiEXEhIS5EJA4OLj0QDghasQkHCYk40ER2QxBK0WqJqqWKdq3a3c5Mtpv96cdevpUvSJ73nXlmkvd9Zuad+Sz3/NUbi5jBQeR/1wIuewOvd+DSd+D1CzXEiqKXTywcMRAr6MJz7728IFpwnNfVKuKQ/Hw8GByEan0dzwwGJCwuIqqzE5L09EurZbd2QFZcDPXWFqK7uhCck4MbkZEwHx/DPzYWdwsLETsygkdaLQKTkjwu5EIBMUNDuN/eDt/wcIfk1srKHPoBajXip6YQVlHhwAvdOVfAvfp6SDMzXXL4s7MDfX8/jnU6lzFlSwtupaS48EIRvAJ8QkMhr639b9zdvj7G72s0zDsbZXOzMyVYn1dAaGkpb1C6+nRwT6OhzgWBiYkIUKlceCEIXgHB2dksnr63F/OpqQ44mpxkY78XFjBHjstMfDy0SiWmSZ187+hgY9KsLOaFNrwC/hVtSF4e5NXVMCwv43BigsE+KSqGCuH8/PBwdBSyoiI27B8Tw7zQhleAxWSyxZZmZEC9tIQ7ubk2zr5Bk06YncXNuDgbTQXZOgI2eAWcbm87hPWWSKAgt5IDae0o6urgnPApeTesw4I6XgGH4+MugfXW24cO+Mhk1DHoBwaYtzc/x8bsu4K1eQXstLU5BQV2e3oYF9HUhKfkLZDX1LC+83Vq3NiAM8cmCmB4BZysrGDT7sj8mpuD2WjEY60W8qoqlkpEQwPiSOEayNyzvT3GUbNWUkKdR8ArgEb/Ss72j+Fh2oTp6Aiq+XkEkk8GRliNJC0NtICNm5uM+VxZCU8dHxrwXAF0wgdyn39rbcXt5GR4BwVRygW+YWHwj4rCx4ICbJNPCZcJAhIXCqCxP5WXY5Y8VvSRMh0cUMqGk9VVbDU2QqdQQN/dbeM91XBLAE3GQF7dNfJZPS2VOvwHNxMdjS+kmM/29+k0j8NtAR7PzM2AXJLFAtHCbLZwHW+1ECs63+nAUSNWkIW/Yr9KuFlXHp0m/lvIo8slQDDR78BfAAAA//9GJJYWAAAABklEQVQDAC9P8nfdHnlbAAAAAElFTkSuQmCC","mk":"data:image/png;base64,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","gb-nir":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEO0lEQVR4AexXS28TVxT+Zvyox/bY4EzspDJtElO3Rq0qFi1VW7GhCLXqAmVBN5WQQAb+Ao9KCAl+ACDxErDIut1AxKIgsalapKJm2cRJHDu24hfOJPEjiWc8PWeQUYWyiDwzUpAymjN37tzz+s6999wzomHztZBOG38DWxKP2WzOEPGOX44CaEtAw+VshBwDoJPf6vdAcxzgd+o6ctsOQDUMFFMprEkSol8Pwv9JDGtyCKVkEjVdB+0BW4GIdmqrVCrYGJlGwJVF54dBTM8IyM51oP0YheSah5aYgbqyYqdJ2ApAVVegL62j/O8mipMV5Aod5DMG1MclVLIi9FILxUJh5wKQQzJyq2VspN7D0E8aRmMqxuJteL/rYjPlRtVwYWhoaOcCiEWjEPcKMD5t459lDYbkhUfpIoMW9GQLDWoVRdm5AERRRKJ1CJLshZaMwK/4IY/6gAMKQnEPDmgf2+o8K7N1D7BCRQhjdPgwfj76C/Yf/Q3vf/MrDqfSiPi/RUQfYBZbyXYA7J3ncQ313wsY++wgPvr8C+CPVwhPzPOQ7eQIgO7LKQQGFATDYUjBIOQPRqEv5Gx3nhVaAtDtdlFeWkKlXEatWsVyvY6m349mPI59Z85g6tYtvLxyBQPHj5vfeIx5mJdlSqUSWAc70i+JOTLULy2eO4fa5ctwbWxADoXgo9N35OpVHJqexuyTJ8jcuIGFiQmUJifx1cwMeIx5mJdl6iTLOvq1z3Ji7d49WKH1u3cxe+oUXC4XJALgDwTg9nhQefQIWrOJTqMBEEB2nMeYh7PV7OnTaN+5Y8k2+21pCfWmXXj2DPMEpNfnZeHJZCDT0oqqKgQCUJiaerNc5shx4enTHrul1hYAXDFXz59HfW7OdEbTNPgWFxHY3ESX3nPPnyN77RoEQTB5Xl28CJYxmS0+bAHwtg86VZ16rQYfVaZhIuXFCwwfO2YCeJvXat8WAFzvKxThSCJh+uN2u+FNJuGlnoeoQ5GPHDlCbwDzKLTRWcb8YPFhCwCDnEucPfvGFT+lUveJE1T7ACqA8IULiIyM0Nvre4x4WeZ1z9pTVNJpbI+25vNRGt7/4AF42ay322hS1uFW2rPH9Eygp48q0HarhRZlJR7jTZ64fx8SAbFim2XFDyl79Ev7bt+GQgdV1+dDY20NbQKQu3QJf9LyiZ88iYP08/Ll6iqGx8fxF31boM3LPMxrUMpV6BxgHf3aZzmRAtT3zfk8FothkMroASqT90YiCFCkA/TTUqAIh+hwC8oyihSkYLFojjEP87JMlGaGdfTtAAlaAkDyW96cIldu3kSTZqBJM7B8/bq9v37/s+oIANbvoXMg//Ah8nTSe6jm4W9OkGMAWHGNIl8l4hlxwnnWyXa4dYT82SwC+bwjuntKHQXQM+JkuwvAyehuR/fuDGwnSk7y7M6Ak9Hdju53fgb+AwAA//8U7/QoAAAABklEQVQDAIiK3NtOoeqjAAAAAElFTkSuQmCC","mp":"data:image/png;base64,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","no":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABHElEQVR4AexWsQ4BURAcLxR+QkmoREF0fIVOQ6dRaHyBRiERlWh0voKWQlQSrV5LQXJsd6K4e7PFuWRfMsllb2budue9y7lbuRn44j5fBrJ2+0uAYv8LUpN7wvH1ZfgOKV/WQNIBWgKWgHICtoWUA1TLLQH1CJUGloBygGq5yw968EWuXot8sHB8fRk+1UA2RgPCYV7IV+M+v79gcTpfgeATRghSY/0YnWt3p2AxnGyADBCG1Fg/RmdfISS80p/Adj0Ci9m483OIpcb6MTrXapQQD7+8aqWA8AGWa6mxfozOPRYr+OJ1OCJqCcfXl+FTDTxjNCAc5oV8Nek/xFFb4d/vWwJJJ2QJWALKCdgWUg5QLbcE1CNUGqQ+gTcAAAD//9jn0R8AAAAGSURBVAMA+HlzHyeKITkAAAAASUVORK5CYII=","om":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACJElEQVR4AeyUS2sTURTHfzNJaoY0zU6kQSiKghQX2k9QXKi0Vdx0K6Kiy4pviqALXVdr7EKN1kLRoq3oQtwpPopRSrBQ8LGJbrKLBsdkxnmYuS1pYUpos5he6Fw4d86cc+H8H3dGLe3c4a42nHLZlWWpLCylvR01nRZvyrbtaFevidzb1C1bvYeUUSfgFoskhobnQUYiKHFN5PETJ4l2dopcxq1OAMfBKRTQzl9EMU2cuTmU9GZaDh7CfP5MRuwC0yIB10W/NMiGnj600+eI9ffTdm+Uyq0M1HritISbIBDrPUDqfY7k2DjmzAxqRweRRBLrR4FYdzep6Y8krt+UED4IAtanHObTKezZzzizeVTbht8lKlcuY4yNUr0xhDHxSF4C3gdsf/+KU/xJtGsXSrKm/rcvxLp2Y+fzGA/Hsd69kZeAh8ycmuTfdA63/Jdfvfv4MzAAbSm0o8e9trQhrpCHLpEZIX7kGPrgBdB1r4Tx4D52qURy4glKa6uoybYJAtG9+6FSRT97Crz7vwSlOfmYSmaYltpfaUlZmlQQsF6+QD9TA29ZywKzXr/CyGbrverd21RHMlKEIFBHtsLEyN6RArwnYlMEVsgzkGMhgUBkbjAkdKCBOIG0QgcCkbnBkPXkQAMZ1rC1Ph34sNHh7SY5oikHDu9x6OuRI5oisIZX3jc6JOCTJOBC6EDAgvvGhQ74JAm4EDoQsOC+caEDPkkCLvwHAAD//zab8+MAAAAGSURBVAMANiw9hNJIfBAAAAAASUVORK5CYII=","pc":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAFXklEQVR4AeyXa1CUZRTHf+zCcllguQrBSqKggkwjjiNmMRaWY05mNtNozuhk+SFraixn8oOXqcZq+qQfLD44WtNoF5tKy3GyRqXEK17QlBJNQViR5X5Zgb1A51kEFl1g3wWnseHdPe/7XM85/+ec85zn0ZG7q+tBJh0P+DMK4L824KgF/lcW0OsCSH3ISEJ0COuXZzE5JZJNKx8hMiyQtORw7sczIi4UYtCxKNdMdno0z+eOJSAAfi+uprapg1+LbjFGAC2fN56padG8tjBtRHEMG8DivBRiI4OJCjdw+nI9m3f/za36do5cqHED+OO8lauWVjZuv0BDi52yKhvzZyaRkxE7IkD8BhAbaXC7hjEkkMZWO5+fvwnmkEGVKq+28cupKlydXdjanW53Cxh0xtCdfgPIyYxjzZIMduy/Jsq4YKwo/2ISzI2H4MHZHhAQlpo23l2aSaB+eBAGlzTAAjyZnUBpRTMffnmpb0RCcHd5SgSsGAuTjN31Ad4NYrU3t5zmjRcmMiHJ/wD3C4Dd4cIQqMPu7OxTL0ks0FML1cP8BHhOKHRgEU5XF0V/1aFTUd8zV+N3YO4DMFq1MB29XkdJeXPfCLX6ovRT8SbGhd2xhOqdYIRlZogzqJpXOnqxlo0rsshKNXntH6pRM4DCP62yk7T25zshTHQM5P1MMx9kiPvg8RgD4aVkyBjYTdbmF2OpbfOY5HtRE4B0cwQLZpm5Yb3dX8LkcGrtTjaUVPDZtVv9+1QtUAJ13hh4Ig68SOyii53rZxHkR0B7YackeqcKq43vCm7070wSlzEFkW0Ko7SlnRMNd1nHc3R2JKid6q5dqrHFwaufnMAhMeE53JeyJgCLJMtmPCxKeHKeFoVRYmK8MYTKdrtnj/eyCvbFst16BHeb3cWuDY9hjg/1PmeQVk0AVKb9R7JqL7+YIEg3YnN18v3N+t7mIQuxEtQqLkwSH3cGv/zRcSolN9yp+vzRBEBl32kTY/qY53qU+1p9K4nbsVSCOz7Y7fvb1uYQapDt17fZvaM0AThb2kBdc0f35KggUNtnd+3ed7MDrtrgeAMcqEFMROhP1SQXNDDltI20Yy2YjjZChB6HHC2WbzqGcqV7GQ3eogEAOMVVnp6eSGKMJK1GB6FfWIjcaSGryMbUc21uyrvq4i1rMFsjEvghZyKFy6Zz9p3HObVuNj+umsG6OWnMfDiKWFMwqTFhZCZHED0pEr0siMkYNLi2Xno1AZCFIn/PFeqb7W5WasWaazqoLK5nnFPPM+YYckzhlDe1kV9sYeWhy8z+6gzTvi5ixt5zzCso4fXSG2y31HKytoXi642UXG9CHSuqnE6aosWFIvriwi1kiJcmAIpXvRyJf9uc189fG1sd7Cms5OOdl9y0d18ZlwqqqD9kxXVUgvtgLey3wr5qEDficB2cbYJySV5Kg3BRurIdFLU4lRifSU33ebAaqC4pS94rJCkuVFWHR4YAUAmuTU6zfnLSDEDJqaprJ3/NDMZESRJTDf5SXjyUiRWUJfzk4RcAJevZtQWoo8Ur88erqjbSycrPiYNkWYDD4l7aZvcb7TcAdZRusjlQV8dlc1N9t0a8AVQmThTld1eBo6ufQlorfgNQgi7KDnKlsoWbdbfdN6utq6ejLviqr5fUuSdatscUiZkFCaK8JK9KcZtv5AqqMWB7eXoUhgWgh8/BM9UCop2fj1kIkJ/7xLlaXOttoZUpsCgRHo0GqyTBbeVwRHYmPw5uPfI8vyMCoIehuuuq3ECntGy5BpuFPi2DHRXwraz4Scm8HapT+kfoP6IARkgnTWxGAWharvsweNQC92FRNbH8FwAA//8tgxCGAAAABklEQVQDAHNh+4iS1vZvAAAAAElFTkSuQmCC","pk":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAC5UlEQVR4AexYX0hTYRT/zT+4nIgEleiD6FIfigKnElQoiA8KafkQ/kEfbArloFia0UNl1txIXNNppFSstzK1bOBD2DSFCueDhbYkNYgtFzIGLVlMMe8FL2zcu3/3GyXcC+f7zjm/8+2c3zl32+VGbQV5db7s3Eqokvx3EoVdfgkE/vUAhQkIE+DZAeEW4tlA3seFCfi2MCslC8VHi33dEbOJTqCt8hZGrr7A1MIUZ8Gpe1M5sXAAYgSqT1ZDWaZE65MrcHvcnLV0y3sgk8pQmlOKoiNFnHHBAkQISJOl0Nbfg8PlgNFs5MwdEx0DiViCifZJPDjfD/NXM2dssAARAndqVIiPi8fC93nOvBkHMvCseRD5mfl0jM1hxcbmBq3zWYgQKDxcSNdgsX6hd7Zl2b6MCs0Z3B5sx6Jtkf6eyIvlbKEh+XgTyJXmQhInoZOKY8X07m+xOX6g8X4Dmg3N0Bl1/kKDwngTKDhUwCTKy8xjdC5l6N1zzC7NcsEh+3kTEIlETNLslGwk7klkbDbFs+lhc4ft401g+vO0V/KLpy552ZE2eBMwL5nhcruYOlvKW5B3MPCtxBzgqYRAgD0T9VOoGVYzoEgkwkPFI6TtS2N8/pQkSZI/OCDGmwCVQT+mx8rPFUqlJX1/Ot5rPqCusI622ZbY6FhcP3sDyUnJbHDQPiIEqCkoBhReSRPECeht7IOpfQKaWg3qi+rph7ymEgV6GvSYuWvG2q81WKwWr3OhGkQIUEnfzk+iRlsN528nZTJC/U9cKGmC7lw3hltHoK5Vo+JYBbSvutA31svEhasQI0AVMDozitwWGf08RE2F8vnK+MdxyC7nwGAy+EJh2UQJUBXYnXZUdVUiVZ6Cso4yKB8r0TGkQtvTmzhx7ThOq8ux6lylQokIcQI7Va3/WYfp0xsMvO6HapvA9qtJzH2b24GJ7REjQKzCAB8kEAjQoIjDwgQi3uIACYQJBGhQxOFdP4G/AAAA///+O0MeAAAABklEQVQDAFsTFwMohCvIAAAAAElFTkSuQmCC","pw":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACy0lEQVR4AeySbUhTURjH/9vV6TZzhRu9OHTlS1tCBUKF34oIG0kEEX0JoVpKL9BgYBFFBAs0qCAIggz3IViLpVEf+tIrRNCHzMJZaaKmOdNKc+k2N2/3rgkit3vPfRkh3Ms9955znuf5P8/vOUfrDIboxTy0WOSPCvC/D1A9AfUEZHZAkSukRRLF+m5sXfYAeywt2LjkFfKocZmlkYXLAqjMf4HL5ftxb0Mlrtt3w2NrwGFrE7ylh3BnfRV8FdtQb/VCT0XIqpHgJQnArBvG2TXHcaGkHmuN75CtjXOmNuvCqLHcRrOjGtsLWhkfmhnKvqIBHMZ23HTsxBbTE+JKTNk/4C46g3MMNHEQoaMogBztFBpsnn92XCjnZtNTOM1+ITdRdlEARwobYWGuj6gMC5xd1kasyBlYsCt9SQygp36j2nxXeqZ0pE4Twy4FT4EYYJ3xTboE+T+78a18kbQCMYDd0JEOkf8rM3SC0szIF2IUiAEcecp1LYspvtQQYtLLf4kBinI+y882T6E4t2feSvqUGCAcL5SehSNyJLaKY1f8FjFA/3SZeHWeiL5oOY+V3EQOEFUOIJLMx0SigLxKHk9igOfjTvxKLOWRIjfdHz1A7izgSQwwyRR/Y/C0gJyweSBaAn+4TtiR0IMYgNV79rMG7ZNV7FTSmKUpXOprwiydJSmeK0gUACtwpd+LoZiNnYoaNDRoHvKgd9ohKk7IWTTA95nlONrVhkDYxXSSEtJP2Qdjq3HyYwBto7WptZIf0QBs8gStg2/YDfcnP9ji2D2ukWSuSmDEhWNdreiZquBykb0nCWAuK1tUXeghajsf41R3C659OY9bzDW52HsVJz4EsbfjNXxf3UgwwHMxSv9lAfwtRoOx+Eq8j2zCo7F9CH47iJcTO1J3PU7nItOPAgCZLpFfXwXg70/mreoJZL7H/BnUE+DvT+atfwAAAP//EcGvWgAAAAZJREFUAwAGsy+YuNlX4AAAAABJRU5ErkJggg==","pa":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACmklEQVR4AeyVwUsiURzHv45Ztra4RLGxFqJE1CVYgqBdCjq0e+hS0X/goYvQbbvqpUPQKYqK2qtFm1EEHTwsnSKCpDTDS3tYN6otsRTUTCffA42pJn3hcxQa+M2833fevPf9/N7jjSByvv6PjoqBvj5uIYDzFdvbQ9Tl4hbcATjXB8wA8XiKtyem8ZkBXK5zHBxcM03CszMzgNP5D6urAZ6emMZmAkgmRayvlxGAKAKLi39gs/loWK1uBIMJ+HxhjI15qEbeORx/mapWyM4vroBKBQwPN6b3fAh2uw+zsyfZuScm/FQ7PY1icNCQ1YvdeBGAmNHrNVhb+4Lp6c8klYTT2YX5+Q5otTmHkXxXyCTvmVtb3z+Zt7m55olWbCFvgJWVAPT6CroaCwsd0OnUIFqxDT+eLy8AcvqQve7xfMfAwCdYLCYcHn6D16v8/yAvgLs7MV35r2hqqs4WwGzWYXm5C4lE+qjKqsVv5AVQVSVAeKanRqMCieLbfpjxGVsPL8uhxR1AXVcHtcHALYTu7t9QqX5xi5MfP2EKBLgF9xXgvQ3fAHhXONf4DCuQayhl3pcUwI3DwVyF0gFIJHA+MoLkxQUTRMkARLa2kAqHcbO0VB4AybMzXNntuLTZaFyNj1PjoZkZmmf02+NjqsvdFFsBdUMD3vX2IjQ3R0Fiu7vU463fT/Pg5CS07e2obGujutxNMQBiqLqnB+ajI5AnyTNBTJu9XtQMDWUk2aeiAMSVUFsLdX09aUqiwmiU5HKJ4gCpSASRjQ3o+vthSm+fD1YryDaKu91yniW64gDR7W0Y0idP4+YmKlta8HFqCsadHcT29yVG5RLFAUjlH+91bWcn9BaLnGeJrjiAxM0rkjeAVxStoJ+U/QrcAwAA//9QWBvJAAAABklEQVQDAKrGzeo/HdqYAAAAAElFTkSuQmCC","pg":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEtElEQVR4AdRYW0wcVRj+ZrFE8BJv8YKl3YQuREFT1GIaVAyJ0hf7ojU++OaDMUZtk5YqYatRiSZoDEpIkRCNpOL2QYhiYx9MiGJMKFV4kM1SSkNbElJ6C02ZtinQ75/swHT2zM6ZhW26m/+bc/vnP+eb+c5/JhvaCRxcAM4uAou5iNAXQNkGYO4C8D9y8BeSNU/AePg+IPIn8Je0bxjyOVMesQKzCMj9V2Dk18B49i3gP7b5QnjNpj3A4F8RjxMrsCUCdoy9MCofBS6QQfYkVcjZPiWeToJFppZCQALFYRRlVVKVnEXAAhsBrCEytJDXfVmVlCzanvh+Vu4mniBeIAKaJwE7zqpJykhGlFKQbKKIlW+Ib4l6YjMRwHwJSKxVkdTLjLSbeJ24SNh2CyslhJi8iS9Z2UJomhYBiWVL6h3gH7a5x3kNYn10Pk68SbxNeJmk1nc5WExomDYBO1YrjM2Bs1Q5795LPE8cI/xM9oX4aqxOwyV1tkCSuof3i8YrWD5JPEKks4Mc5DcNJEtpHHKBCNTVvYiqqk2cAdCWVA3d7yScdsXZcNTl7cj++Il9si9kT7CazrQJ7NkTRUdHB2KxGKLRxqWYIikq5MwcML7UaVdk4U+xcY44S/xL/ELwAwwzLN12lB2SjeSt3cX6HYSPaRPo7u5GcXExwuEwent7rws7CiPMg29dyrfULN0+IV4jXiV2EJ8TPxNyEpssnSYp9TI7WonbiCbidiKNaROYn59HS0sLmpqakJeXKk4z+S2VkqUucfYzxHlC5GHL52+2Je9/x/IHQnLbQywl9GMshYi8JZ/DTZvAxMQxbN++A42NUQwPj3AGtbUyS3lKyn2LLLqdnV8T7xNCRt7Se6x/TxwiZC84Dz52OS0tgYaGD5y+ynp+/hoUFcmjWx72lNSyy3LtarLKTQR5K3+w/QYhZNazlE9KyUqsqkwI3OoeKC2N4MCB3yy59PX9Su2vdbtY7UhkA9rb29HV1YWtW1+y+uyL6SUp28FdyiIn2ZkgHiQ+IkT/v7NMY0oCY2NHMDkp0YDBwUGcOHFSGWJqagrV1dWora3FyIhaVrakTOCIMoi7U07gdeyUbCWyEmJsepkQUI4NDAwgEokgkZBHonTB3JzJlBpFeXk566IBtd8os9S9wNphWCJRO9m9Q6zI4gdZ+iyeHvAksG/fjxgfP8q8v1/8AKiLWGw/RkfjmJk5rXZI9powCiphVDcAsjWDf0sl47gLTwJuR1U7HJZdphrx7vsMxibJUqaupLxDWSMZEygrK7U2sJEmxVkzKC6BJKW439mVMYFEYgx1dVusP5OcAXXr5ipJKmMCugv181uppAIRqKl5DgUFKceG3xp9x21JMREP+Dq7HLQIhEIGdu3aic7OTvT392PbtldcYVbeFElthPHMh4CQMHUjahFYWFhEPB5HSUkJKioq0NPToxs/sN/HJMEv8FNkoHXwaRGQVUxPT6O5uRltbW0oLJR/pqQ3OzgMY70cfDqS0iYwNHQY9fW7KaV6zM6u2jnk+QRMZikdSWkT8JwpywMiqSrgpOlx8N30BOT5HIIR8ZJUThAQEqaHpHKGgJAQuCWVcwSEhFNS1wAAAP//gYSvhgAAAAZJREFUAwA2UJDaGNlTcwAAAABJRU5ErkJggg==","py":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAB/0lEQVR4AeyUz4sSYRjHPyuIVrgJ4y8CRSNaVlsWOkQRRFsQnbpGdKoO/QFd6t4fENE1Ou9B6NA98BJ6zN0WyXZbRkIQHbU0ddBp3wFvMpHz7rQD78CXeXmf953n++NhAruFjOVnBPD5owT87wBVAioBlw6oEXJpoOvrKgHXFrr8gP8TyO8c4mccSwKj0Yhms4mu6zbEejweuxyWxdelCxDk2+02k8mESqVCsVjEsixarRaitpjG8rtSBQiCgnypVKL+vc76jQ0eP32C3tApl8uImuwkpArodrs2yTPpszzSX/Fu/wO/MfkY3GM1ukqtVsMwjOXtXnBTqgDTNKlWq7z48ZYHuS1erm8SNXfY0C6wr/XsURKjtYDH0ltSBQgWkUiEW4nLfP55yErg9BFC7BkHGNNfNBoNcUQqpAoIBoOEw2HujDfZ7dS5/+k9r799PVofcNsqkM1mCYVCJ1dANBoln8+zdf0mX+5t8/zSQ+6eu8qbK89Yu7hGLpdDnJGp4B8S+Htb4X4sFqPX6zGbzShEzpM9lWI6ndLv90kkEic7ASFRiNA0jcFgYP9xOp0Ow+GQeDxuj5c4IxNSE5gTEyJSqRTpdJpMJkMymZTu/LxXYOXaNn7GsSQwd8eLtxLghctOPVQCTu54UVMJeOGyUw+VgJM7XtRUAl647NTjDwAAAP//UxQM0wAAAAZJREFUAwDFgIcoV7PIrAAAAABJRU5ErkJggg==","pe":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhElEQVR4AeyS0QnAIBQDixN0h+4/UKdRHCEcQYQT/HuJvDvH/36T3AkPeXtnx3P5cYHTAjWgAUjALwQB4rgGMEJYoAEIEMc1gBHCAg1AgDiuAYwQFmgAAsTxwAB+q1LgAhWsQakGAliVUQ1UsAalGghgVUY1UMEalGoggFUZ1UAFa1C6AAAA//8bSTVSAAAABklEQVQDAKW0gWkYdqRjAAAAAElFTkSuQmCC","ph":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAFb0lEQVR4AdRXaWxUVRT+7p0p03XoAmVppUAoawBxgSqkFQTaSokYEaKCMUaiCBJBJbjEEhIkQmSNEBL4oYAoogQStsSFRa3YSqJ0oQu0dKN7O53pPu9dz3vzOp1pZ5KWdobpyz13Oee+e77vvvfOPY9fTCsXk1aeF4j7blAKT4obhcwTydi3cRZCAvUYbBdXAOt1DBtWTET+D0vwRso4cKZoB4eoBFSoTTcwYmgzjm6ZgJtfJyL+0eGq2tcrGwFrNaSSdyEVpAC6MMyMDcXVQwtw+vO5GD86yKc5qAREay7YkBgw/ykQlut2wC/Oj0b2yeewY+0MBBp0dr0vdVQCLHge2PC14GMOggXHO+EzDOHY8toU5J5agpcXjQFzsj78gUpAgcFCFgDMAHdXdGQAvt32FNKOLMTsqeHupnldbyfQW89zpkXgryOLcCw1DpFh7gn3dr3+zuszAcUho/doVVKMGnY/fHUyDH4PtIyyVL+lD54F0Jzu5NAY5Ied62fSh56MZfFRTjZvDXpNQJguQCrfCjSl9cA2PioYZ76YhysH52NSTEgPuycV7gm03KKQeq3Lt9wMpjNCdFTYdHR2oDUbqtg0SJgVaU9Lwo1DNK1nGzcErJArttNup0OYztoQ6MMAfQSY30h1LOq/h1y1j0h2nRuKQa/rSkvWL4+FMlb0nhLucmFhBXThkC3XIMxXoOyyMFO/JROirRCi8TIB114lyexyCeUJHHj/Mdw6noTEOTbSLif2U+maAPOnQ20/eNhyiKYMSHnPQtQcJiI5kEs3Qi5+h9wysPBXwEZ8QH33ZfJYIy7tTcDFPfEY54G0pCcBuRFoyyNENoCQTNSXSRyKbAH0w+jUTgBEC9CaSUaKUlT3KMr9HWVIml6EHC0tGci0nTs7tELUHodce4x2ejPkkk2AtdJ5ijYSpvOQyz+BXEZSfwaiQftWNHtnI+pOQMpPhEzzDTqTmpYMZNrejYDi1s1OKqYHEkZ3KUKNViKsFqRWnkVGbipu5n7WL+lGQA8WsRpckehd4I98CegjNbfODQtdCj56O3gUSegysNDnnSdoI+U70cVeAjMmQViDULn3MLKeWIza46cB0f/N4pqfroYbAcNEGssQdScBPSVuzI/GDoUH06tVDWG5CrAAIGA64C5P1Q0F/KJgviEjOy4Z5dt2U3RrwkBd3OVCopXe//cg6n8CC5wNXexlsGFvAfS/wKP3gMdQRBISFIKiarfLJTqVrXl3UbD8Tdx5aQ3a75V2qgesdU2A6WmHa4Dgp8FC4gH/adQ+A0YEmGEs9ReCkU1FwQPVpnsl1TegdPM25MxNgflX58Ou+9z+jF0TgB585MdgQXPAhi61rS/VA1IDpRL31TELWwkeuYGIEEFVo1VWK6oPf4Osxxej+sgJukfSDJ5p3BAgZwEznMHxAAiJzggtlYCefvr9p9LTIaHpSjH/8TeyacdLP9pOXE2KyuPinkA318yYDN3orfRU5nazAO1FJbi7ah0Klq5GW35hD7snFb0mACXKBD4Jx0tutKAsdacaXUwXfnY0ea3fBwIOmCh+1506S/F8EaoOHIVo73AwerfbZwJNGf8id/EK3Ht7M6w1dd5F68KbnYAw/0YnY5uLKTZVR1kFitZsQh6Bb/7nP5vSB2qVgLD8DlF9CHLxOjpdHf7CCKDc3IL7O/Yja3Yi6n88TxrfKioB5j+JflTuEPjrFDrn2RE2nLuMbAJesesryppb7Xpf6qgElJjOR30K3YRzgLUOLZm3kZ+yCoWvb0BHeaUv4e2BxUaA1Cz0BVhNESjetAe3E5bB8mc6aX2/2Ah0Hv8DmOZ6izpv/OWa/fiXLQOX5nqLwP8AAAD//6itbpUAAAAGSURBVAMAUR883Vk4MHIAAAAASUVORK5CYII=","pn":"data:image/png;base64,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","pl":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAg0lEQVR4AeySwQnAMAzEQnboON1/is7STnCPIrhgkCEfg+1Y8n6Hx17DwwVOC9SABiABTwgCxOUawAhhAw1AgLhcAxghbKABCBCXzzfwXPea/OYbwEd4uMEPA4d/Gsa7QABTS2ughjoM0kAAU0troIY6DNJAAFNLa6CGOgzSQABTS38AAAD//4gThXMAAAAGSURBVAMAs3f4WSbJdioAAAAASUVORK5CYII=","pt":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEFUlEQVR4AeyWbWxTVRjHf+tu161bVzplW8deNCMDXDAsRcThB0UTZ3RsQdBJlOgHl6iIM3GRDJGYbCQYBBOSRbMYMjRaQiIvQ4PEJToFlWyAiDoQsIN1w9EiW1/WF9b63PpxX3q3toakN+e599xznnOe//95nvOio5looqSvmN+jEE2l6LjNnzSB/zuA6QikIzBLD6RTaJYOnPXwxEQgIjiC4PSSoVblL2VlVgQWF8GbK2Dbo3DgBZj/JZV/bYfRNvA2CIcMkSSXGRHQCbAtj0D3s2ArB5+APHFFXufxmy9C5jz453UYexemCqU9iWVGBN57HO69Vculw6vIPN5E7VATjePPYAo35oYLm4g6m1CONOLNexrHToiYk8dAM4HPG6GmAOY7zJT5D/PEh3bq3rJz95F9BIYOKkUdduZuszOmO4hyuY9xHZzpgkCSOMj08c9syYCVNlguUpQPxS5JEZuN0ObNZD72FPlVywi2tRFsaaFgDLI9Oejlq6+A4Vfjt6NFUxOBF2vh5G/gdgvwyRzKO0FfU092ezsD9+9kl/t9cjo6UFpbKdkL+ReKKNkK1g2gVCP3di3Q4tPVxaf2n1aVLMhvLsGh06BTIngXCyhdONZZfKeRwgJjrK6+fAuEpCmA7yWIGKReALLTql0JlfgJRGChgGhYAt4Q/O0LcGqt7DZZ11n1xlHOXbzB2A0/WzpPsq/PyeAaSZtFQ5ALvk0QlQi45iQUe2wyTQSC4sKJCXCJBELZ2L6GvLAllhrmXD16fSaKosOYreeeo1A6VErwDwidFZFA3SqN2UzoK34CCnzrgL4rclBNQsQSwXgcDKMeenbVUWY1seguC1ubl/JkSQjjgODMsBKRCJhlPeSOQPE5aUtwiZ+AGHaMQ7kFvhKv/mhyEpkL/sFOfP39XHP5OfbTVSKBAJMfv0JAdp7gkjys7wDrRUYhSz6JLhoIgF0W73I5ee3rJI10A5x5+WHcci5Mrb6Pld3tfFI6SLCyEk/FANfXmHCt/pkJSTtzCzh/AE3G4mSqac6opNH3f4LVDLYyOFZ9mnHPenInzGR1dWHYuBHDyAgF5+sJWxYQveDEfRMuy5ia7jgRaVTTRECdu7UXPvgO8vIhzE16KvfS9VE1v+5Yx7W3n4s6dq/FVdWLcawfveT9HXI3qlwKOSTn0UxAhbHnF9h0CJbJrmKdA184TrBd+Yzh0k/HTQf2Y7jqZ6oODKeg+HnIDqujkiMzIqBCOeuG+j3QKwu6YSG89iAYV2D2yMEVNEF+M8yTfiWqaidPZkxAhTQlo/cLgQ098MBuGH6IwQq5YpfvAPOwqpF8EQgJMJIpcxggRw9qVf5SVhJDIGVwpxtKE5juk9S2pCOQWn9Pt5aOwHSfpLblto/AvwAAAP//IWP2TwAAAAZJREFUAwAQoYFP+jr+rQAAAABJRU5ErkJggg==","pr":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAESklEQVR4AdSXb2wTZRzHv3dc27Vbq2iYYYMBEVyJY8k2123A6FxnDIgGUUEcRl9ozOgIZi5T0DrmiNMFNSjlT3yhxgmKqLwQELOSbejmxjqMohtKMhgbxClo2q5dt3LnPTdKKemfu3btStPv3T2/e57f7/tp7557ji4tOsh1pCzgLgO3pOjjd5WhuLQDWxY1wM6ocat9aGLYQzPYe3cFdGVW7MsoBwshTE4lvPycDielYmOuGSX3t8I6PS/hzRODfgAkQPTbbYvw4LJmVOTtxUVlOgklrAICELccReHA7LUoMJzE9swauGkFCSecggJ4nToZFRoWbsESw084MvMhbzhh9mEBvE77k+fh6YLPsMo4iItfd0DT0pIQEg3gBTkxlIKcpoWoPquDLXcZGL1+SiUZgIB4WGDHt2NYsMEO85ExsHybxKdCEQF4jV5xcKj80IWcl+xoPe3xhuO6jwrA6/SXcyxKTCN4vNGJwcucNxyXvWiA7Dnhu37VMY7MDTbUH3DD6Y6Lf3FrhjkzKLz2RJIoR84x4PX9o9Aabfj8xDi4GP8h4X9W3vbapXKszJdBzvANkd8L/KW07l0ndOv70PmKGa66uphIFMDqQhmUcmB5rgSCa6DdzplY3PcUKg7djoEGHmTrVrgmUQEBah5VoGVbynUV3DNNsLPjOdX12FFTMrTpAYcLfW/csBSNT+Y+i3x+tbtz/kZ4KObG01EdB3TQ+I0bR63jWKKdBv29E+ZJFXIvkHbadApVH7nQNyTtAWCXaVCbVY+lpe2wpBpIyqgVEIBkfZuH0L/qgN1FWj4d7vYgp8qO3kFp5n0ZJvcoKAAp83P/VShk5Min83+zGIlwilSP21B32oQfji+GYdjiSxrFUUgAQzYjzDyOUeC7nokn7SO6m4hEFKc5Fs+c+xgnm/NQefYDMNxELhFDw3YJCfAwP3X+ep5F9iY7ltePoGKPCzM0FLIyQg7zK3qf6hLatfuwe9V/yNhshJKfgSZTIZ0M/MMiv9qO/mFWMLXn2BgKX3YgM913YwsnAmxm30lhf5UKXU1aFLxlhLK2NiYKCbDtSzfcN/3b5L4gS4YAnoWQin9evLEuCX1mDZ4sloF/sRPisdqEBJBa9LEiGc7s0sC0RgGVQuroyPrTkQ3zH5U9l0ZLfTIO1qgwi790/M/GthUVwB0pFHY+r8Spd9TQZzGxdRoke0QADD9q00o5/tylhnGFHDTfDpI/5mHJpYvTHTi1vhfb53dB09MGT2vrlEo0wLyRfnzaWY5D5llIW10EW0lJQigsgMrjxObeN/GjpRArLh2O+SUhtUBQAIp/lVpz4Qt0WvJRfaYRCjbCBZBURxL7BwTIvdKNY21l2G19AWmuIYkp49vdDyB1dBjv91Ti+7YHkPevNb5OIqwmACiuuvHiH++hi18tlg80gQIXYbr4D6NL/2pGu0UH0+91UHvs8XcQZcX/AQAA//85vM4mAAAABklEQVQDAD2YxeqxcYo3AAAAAElFTkSuQmCC","qa":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAA/UlEQVR4AeyXoQoCQRRFH/sLgsUkIoaNYjTZjCIKarVoEv0MRQwatIqwokZ/Qo0LiqBd9BvGsHnCHQaf4Q7shmHmzb57OCwTGHC8rw9zXkZm3x6aWa5iJpmy6hMIOFKFrBS7Damtx9KPj1KPplLqtSQd5sFKfpbDDfg51l8VuIHP7SmX1VYOnZHMw6rsmgM5LTbyiu/+vgqoBDcA1P7JUrgBOuCZC0yADmgToAPaBOiANgE6oE2ADmgToAPaBOiAHoHkZDqQ5ODtzfuAtygdC8EE6IBj0rZtMAH+B2xROs7DBOiAY9K2bTABOmCL0nEeJkAHHJO2bYMJ/JsDXwAAAP//O6Ft4wAAAAZJREFUAwAEbTTHxyUArgAAAABJRU5ErkJggg==","cg":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAA2UlEQVR4AdTYSw7CMAxF0acuAxbbsj3WwT5C3AESgv7iz7MtZVqd22TkCU805plfaK2NnwnEmW/ActcBaAEWeEmnBFjhsQDhAZZ4PIIDrPHoE3YDHvjuj3lCXviQAE+8e4A33jUgAu8WEIV3CYjEmwdE400DGHizABbeJICJVwew8aqADPjhgCz4oYBM+IsBQDb8pYCM+NMBWfGnAjLjDwOy43cDKuA3A6rg/wZUwv8EVMN/BVTEfwKq4teAyvg1QLufl4+gb4ll0QrC6HejRLz8L10AGS8BbwAAAP//+9LqJAAAAAZJREFUAwDIzLBZa1yFSwAAAABJRU5ErkJggg==","ro":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAiElEQVR4AeySwQnAMBDDQifoCh2h+3a2rHKdwQhTCgrc7+wQKce6nyEzew2ZfZ1D5lg/Pz7ga4Ea0AAk4BeCAHFcAxghLNAABIjjGsAIYYEGIEAc1wBGCAs0AAHieGAA31Up8AEVrEGpBgJYlVUNVLAGpRoIYFVWNVDBGpRqIIBVWdVABWtQ+gIAAP//zKX36AAAAAZJREFUAwBQ22up1bAXPQAAAABJRU5ErkJggg==","ru":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAgElEQVR4AeySwQnAMAwDU4/VybpRJ+oiXaBdwSCEEbmAf7Ygd6ov/NUKf3xgWiAGMCASoEIiQPkcAzJCMSDfwHHeK3nyDYgVHD/HwLQCDGBAJLBThURUpnMMmMC2Y+t5r5U8VKjt2rSIARPYdiwG2qhMixgwgW3HYqCNyrQYb+AHAAD//5O4G+YAAAAGSURBVAMA2r9VyGP6aC0AAAAASUVORK5CYII=","rw":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACSElEQVR4AeyW32oTQRTGv5ndzSapSTTWqjGV1pA2UP+C3jUXwTfwxrfyHbwVfAOReNMrRQpiS6RLrdRaUxKNdbPJ7O54ZvFCQ0opW8gsbOCE3ZnZ4fud75zZ5XjuyCQHR8J/KcB5G8ggoy0ZQrC/19HACX9aOZBjQ2QwRpn3cIMfYMHowoKAgeAE+YA2AEU2IDEhKuZX1K0dVM19LBpfousMG8OEPxVCC4A8c+Ehi/uZTaxZW6iZDm5bH/DIfodLvI+KcYAcH0aAkxRaALgyjxXrE66Z39GwOnh64QXW8xu4QxCrdL+W+Yg5ggwJQTsATs16nTJcYMcosx5a+TYWWBdNewONzDZauTatMHCFd1GiMtMOQGVViS/yATgL4AU2KtYhsmyEeX6Enn+RhP9A0Rggx91J/Zh5Camj8ltwFVuiAUlyfGrXXb+KXlDCIY2bXGLXX4IjbuG3nNMPQNJpP5J2lO2OqOPV8HEk9vWohbfiIdpeMzpGVaP/Cgv6AShFAUncFqvYDypw/CW8dJ/gjdvEe+8edkQN3XCexpfJn1At/y9mXkJKjU9lI6SFo+AyNsVd7IkqnHA5Kqt+WIKCU++BkBDU+n9DCwAlSNA7V5XIcVBAx6/js1jEnn8zqn91Uql5tW4ytAFQwpQTHmx4Mot+WMZPWaTGZvQhYajpqaEVwFSFpwwmH2D8oIYkR/IdOKXEtJ8+gwN6sqQAs/YldSB1IGYG+MqzdSQ50h6IWQGxH08diJ3CmBukDsRMYOzHUwdipzDmBn8AAAD//+x/3LoAAAAGSURBVAMA+o6PmPbdNNUAAAAASUVORK5CYII=","re":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhElEQVR4AeyS0QmAUAzEigs4uyM6SXWFIxwipNC/9h5N3jFzLemFdc+5pN8D5tflAV/r04AGIAG/EASI1zWAEcIADUCAeF0DGCEM0AAEiNc1gBHCAA1AgHg9MIDfqgR4QAVrEKqBAFZlVAMVrEGoBgJYlVENVLAGoRoIYFVGNVDBGoQ+AAAA//85HqNsAAAABklEQVQDAG5id/mC11GZAAAAAElFTkSuQmCC","bl":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhElEQVR4AeyS0QmAUAzEigs4uyM6SXWFIxwipNC/9h5N3jFzLemFdc+5pN8D5tflAV/r04AGIAG/EASI1zWAEcIADUCAeF0DGCEM0AAEiNc1gBHCAA1AgHg9MIDfqgR4QAVrEKqBAFZlVAMVrEGoBgJYlVENVLAGoRoIYFVGNVDBGoQ+AAAA//85HqNsAAAABklEQVQDAG5id/mC11GZAAAAAElFTkSuQmCC","sh-hl":"data:image/png;base64,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","sh":"data:image/png;base64,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","kn":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAFN0lEQVR4AcyYfUyVVRzHP88VqKy8c7rSiOzFErS0RNRSQWdoqblMt9bWi/UHza5/FOQflgpF4TK2XFCbzk3EIF2vSq5Jw9lQx6A1SJAY1NBiznUvJhrjZfL0O+fywANeuC9c9N7dc57znPOcc77f7/2d8z3PdSTtw4y0lHMM83IL5pU/MV9/GdMwMMHwmRxE0CduLOyaC5tnwKkTMCNF7gsFvWkMiTIiCIwRfK/eD18uhDjR+SUXLH/e4Oxf0jAkdG/DDSfwwG2w/wnY8BB89R0kLIIvvvYP3AsfbhiBGJl5w4Ne8NH/KsXhxTcM3B7DwhbQVYYJ6LmwPvToeCheAK/cB5/tkVhPhtLjwQG3AF1XArdGwTsPy8KcB5fOwbyn4c2tBv+1hwZekbhuBFLukBhfBCvvhK3bITEVfqkOHbgCr9KoE5hwE+x4DD6eDU21MPtJ+HCnQXe3QXz8NFavfgbr43SOIyUl2br1e501wxzdRfzUXV7Vk2SnSd8GC1ZB7e/9qjc2NlJUVERGRjqrVq2kvr6elpYWv8Cjo02yNplUHWV0CEy6BT6dA+/P7DekT3YZ9PQYA8BdvdpDZWUlubm5lJSUUFVVRVPTHwOeGXyjVFfAM98Gz37CS8CQ2V6YAgdlh5kqN8MZkhwP2LjRxdy5Yr3ST30TExOZPj1BFa9JdtXjb4czz0HzZsJHQBnS3sfhLZn/20PDG1JMTDTZ2dmsW7dOh42FNjY2loqKCpYtS7Wq9LVP9Qyv6jUp0HZSN42cgN2QxncEZkhdXd1s2bKVxYuXkJycLKHVQ1ZWFobhYNw4J6WlP2l0dtWnyWZwZq1X9Z523ayzEe1CliGtl3PM3mJRfSFBG1JHR6dWPS8vTwOysmlTvYs0Mx3+2QU1S/tVt55R15AI2A2p8wKkPAtpGQaX2gw1ZtDJ5XLR2npR9xszxmSTy6S6DJTqtSvhXDaY8uvqBwZlQROYN8G7NSpD2r4TZi6B8orQgFtYqqtrdFGpfrIEdmyB1j1e1a/8qpuGzAIm4IxBb4t5SRKH9WgnfXe7QUfHyMArZHbVZznFK/yorvpYKSAC2pAkvhfJ4MqQ1BnmdP3IgSsQoaiu+llpWAJ2Q6o8hX5D8mVI1mDBXEeiun0enwSUtpYhJUjo2A0pLu5ue39dHjtWrFeXAstGqrp9lmsI2A3pqGzHCRI63jckbzdlPpmZ2/TN5MmTOHz4EFFRck7WNcNndtUfuTm4WB9q5D4Cgw1pzXpYs97g/AX1e/R3Ly8v16Zz5MgP2kXdbjdtbZf7HxiiZKn+0WZwy5Z/ejn422GGGGpAtSaQIItTvSHZDen7HwcCt3p1d3fr4ooVK3A6nRQXi4PpGt/ZYNUV8L9zZV/3DuO7UxC1jvR42CdnGH+GFB0dhQoddWK0j19YWMj8+fKKZa/sLftSvb2utzFMF8faWMgJwJDUQauhoUHO7hmUlYlNCgAFfvfu3aSmpjJxojic1KnvaKuu5rCSI0liMRBDam4+y4EDB8nLyyc/Px+Px0NaWpqsh/fkZPkBbrdHjzlF/tg5UQL2WA+36nqi3sxRU+c71nvbfV7UQi4oKKCzs6uv3ZB//lyvmdT9LMcL2WHCHet9Ew0q6EU8qM7vrcfTSk5OTt9z995jcuwbeQvLhIufgwI/mqr3TSyFkAhIP316tFSvPQ5zRPXflkI4dxg1j78UMgG76m7ZFmvlhb2jyd904W8PmoAv1c9L2NATfnCBjBgUgUhR3U4sIAKRpnpQBCJR9YAIRLLqdgL/AwAA//+SzoWlAAAABklEQVQDAMnJTj0Vy0m3AAAAAElFTkSuQmCC","lc":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADv0lEQVR4AexXTUhUURT+HLO0rPEnSwJBMzUqy35AYwpbZCatLdrVolUtKoKkQGqhUWQiDjgy4pASUTr9TzXLceWiEAUTayFMJUKIQTaCjL7u90ZHHXvjm/fuBELy7nh/zjn3fPfd75zzLBf6FGU1NwtW+d9/ANFeYPY6YENiNAnza3F9A8e3AGUZ5p2MZiFuANYmCOfTgaOZ0bY3vxY3ADz5tcL6tmSgMNW8o1oWxBZaS+bmyzcDQ0NDGB8fB/vmrGlrxwVA3nogJwVoampCZ2cnDqQBGUnaTphZiQsAnnggEFCdb2trg0VRYMs046a2rnQADJuHxIl3dHQgEJjC4OAneL1eFYD0zQQu6TbnyetwOIT50MM+r9BBASw0I+9XOgCGzd7eXvT3D4S99Hg88Pv9cSGzVAAMlwybPPGw96ITDM6gvb0dBSKccl1MSXukAiB5GTa7urqWOehyuTATDEpPbNIAkLwMlwybJG8kAr//K7q7u1EqSgtm6ch1o2NpAHj3GS4ZNrWc4dVKFcUdia4lE+u8NADHsgCfz6eGTS0nenp6xPqgVDJLAbB7YyjT8oQXO19zXkF1hRKeEvkMzc3NapZmtg4vmOhIATBPXrfbHXalyqag7iLw8DZQUrQAIsSRgLS3YBoAE1SxFXA6nWC4JIKiXAWP6wGLsJ4iqtFXjUBWeggECc4szWxN4lPeTBNb6FX/uxxrHJK3paVFFbCmKnj5ALCKa6VOiJ+cbOB5A5CSHAJht9uRlKBICammAFCZAFjrMExaLOLk7wBFucLriMdWErpOnGZ95BOEJ/E5NtPog2H9veLq8ArNk7f+ElBl0zZXXQGQ2JSgDnUZADg22kwBIHn9osZhrXPmhILr51Z2g8SuPKyAhGfW5nfzylraEoYB8PR2iXvOGqesOAjXLe1NFq+Q2E/vAnvygyrxaYO2FsvE0jcMgPeXtc371048u0+C6t92kyjqGJmePLKr9RFt6ddeKmkIAJWOZAJvPW60XBsVIXKpUT0jRib71e/wvHkB2qJNPXqRMob0+GHCmsY6cRn7d0aa1D+2ici0ZuwKaIs29WsuSBoCQPL+HK5B+b6xBUsGe6dKv2F0oBZGyRwzAH6QFMy+g/X3PYMuL1fbOl2HvKBXrZGWr0afiRlApXUYCSNnkSAyaXTT+lcTE2eBkdM4af2sX2lOMmYABYFG/JjegY9f0qS2santyJ9sQCIEmDnn9PyLGcCNXw7cTPqA1sIJqa02uQ81k62YQWwuxSat50j+scyqB/AHAAD//+ZygCQAAAAGSURBVAMAgG7auKcfLVQAAAAASUVORK5CYII=","mf":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhElEQVR4AeyS0QmAUAzEigs4uyM6SXWFIxwipNC/9h5N3jFzLemFdc+5pN8D5tflAV/r04AGIAG/EASI1zWAEcIADUCAeF0DGCEM0AAEiNc1gBHCAA1AgHg9MIDfqgR4QAVrEKqBAFZlVAMVrEGoBgJYlVENVLAGoRoIYFVGNVDBGoQ+AAAA//85HqNsAAAABklEQVQDAG5id/mC11GZAAAAAElFTkSuQmCC","pm":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhElEQVR4AeyS0QmAUAzEigs4uyM6SXWFIxwipNC/9h5N3jFzLemFdc+5pN8D5tflAV/r04AGIAG/EASI1zWAEcIADUCAeF0DGCEM0AAEiNc1gBHCAA1AgHg9MIDfqgR4QAVrEKqBAFZlVAMVrEGoBgJYlVENVLAGoRoIYFVGNVDBGoQ+AAAA//85HqNsAAAABklEQVQDAG5id/mC11GZAAAAAElFTkSuQmCC","vc":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACp0lEQVR4AeyWO2hUQRSGv2zUNaLGwgerxsL1RVDwEcU0dipEbGw0rQHRLliIbwSzqRQL0cJKUokoYqNFSGsgQQ2IiiY+UUkkPqKbRPNa5zi5zN3VTXZ35rIJ3IUz9z8zszP/P+fcMzfCgZupXO1+e2Uq2Ueg1tJJKnYtd4swzX+hgGIHMIxAGAHLEwhTyPIArf/uNAKDo5PzyWXO5KuYGc4EdA/A/hYYHjOLZ6IfQ7CvGZLDmSOF+84EHGuD59+g6WV2Mg2PoasPrjzLPiffEScCbr2G1h699WVF7vtvjf3tg26481b3XH8Bn/o1tm2tBUjqNHYYGv0qPS4+Mb4gSR2JkGCxkRRINATbmrUAIfZTkfYTufEKOlWqeH0isGfQ8/Sz+SO0fdbYprUWMKpO838E2ntN71CW6tQ6FQSc2wyREkNWUHyeqkgrBWk7vhHKSjX22kWz4dA6zyv8aR2B1eVQG08n0LANSkvg9hvo+AKLy+BwZfqcE5uUqBnpfYV41gJk0/r1UD5TEOxZAVUL4auq+QlVNs8+1P11a2HpHI23qPG9ap727FonAhZEoX4Df9PkpEoXodT4COTllrtBymxUpZCMSboltsoMN+ZEgFCpXQUXtut0kZp/9530apOyOjACuyvgUjXE5+t+F20eAibeTnJ+13KQb51T42nj/aP3F1x9qr0aJUIjN60zAR6de+/hQ9LzzLOpC8aylFwzK3/kXECNejlj4y+rn87BNfxTbv3jhWLnAqTen1Yl0k9IBB3JKKP+cRvsXICQkXdhR0yQtjPqsouqKqQ9t20gAoTi+SqYpVavXgI7l0lPMKa2CGZhubSOqrshoYQEs4NeNTABsnyd+tapmCsoOAtUQHC0zcqhAHMWxUFhBIpz7mbXMALmLIqD/gAAAP//IZjmHAAAAAZJREFUAwBVyPGcIRNclQAAAABJRU5ErkJggg==","ws":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACcUlEQVR4AexVXUhTYRh+zizCLFMny9pN66IfzMCgsqukglgIgZTkoggsoiDsBwYFZT9EF0KRFHgxoiRcjFkp6IXVRVZUhCMcOH9A1At/cP6iTpk6/Y4o5+xs7h3ynQ08B97z/bzP977P874ffDpklgSoJixg1+1/RMazuK7UXQGepkMU37HDJpzI2RnFCf5QsoAblkOwPT6N8pI83LyQw58ZMQNZwGv7P2w3bIbRkIyy938RLx9ZgCEtCfnFH1Bwx4Gt+iQZ//SUjbK1mouwArL3ZMh49A2Oo7ahHZ++taDXOy7zld0zI0EnyPbUWigE6LckIvfgDthLz4hjcLWlxDasT0DNq0IUnsqC+/N1ZOg3Sd2qzBUChsemUJR/ALtN6bh18QiGRn1hiUz7Z/Gu+j+c9c2oqveAdSksmJNDIWAuEEBrpxf2Ojc8HQPwz8ytmLpu4Vqdve3AM9uPFXG8nAoBLNGLit+wWKvwpPw7W4a0gpOZYLfeNz0j+ien/OKo9i+kgAnfIpmlMZgUu+vsPXhw7WiwS/V1SAGRWLC7nnvpLSpr3ZGg3P1RCTAZU5CWnCiSamrrR3v3kDiP5S8qAefM+3A+LyuWfBW5SQLYW/Cn8jKeFh/Hy7tmNDquIpavr1QFSUD/4ASK7ldDEATRLFYnvCOT0jgxm5MEMHbZe7eh9M0v2JwumIypbCsujCzg41cPrM+/4MrDGjQ0dsUFeUZC5+qxg2I/OyqWcdJ5pLMsCU8jd4AnidXEXksCVlMnfme1DvCrLS2y1gFanfihtA7wqy0tstYBWp34obQO8KstLbLWAVqd+KG0DvCrLS3yPAAAAP//rLmKjQAAAAZJREFUAwBnIBgYuaniOwAAAABJRU5ErkJggg==","sm":"data:image/png;base64,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","st":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAC3ElEQVR4AdSUXUhTYRjHf5uFHw37oA+NEA2iIKKrQCGKiKyL0jvDSlMvIhASFPogiroKutBQCroJAyuLyraiTEgIIjCwiMKsqN30PRATqWnBep8dZx53tp2z7WLv2P+87/t8/Pf8znbmbq5dH1p0a622ctf55lLnnYOuL7cMrjNEGEBniGkAXSFMADpCRAHoBmEJoBNETABdIOIC6ACRECAC0ftoHG+BP+NkC0Agcq4uYdWNBWzM/ZVRsg0gED8uL+e7kuydanLSaQcEg4l7HAGIXTIQoRAc65BuZzrcnrjeMYBYOoUYeAWdd0FApN+OpLa7F4b98auTAhBLJxDdfTAy5kJApNeOHg9CYBSuq9549UkDiGksCP8n2HccGk5BS6u6+z6pDtHSBofOQs0JaDwDExMSNyR7idWqXJOqkT7JtF+DZuVRr7z2Kk/xlnhEKQGIiRVEyQrYvR1u90NrF/wcd0kpT19CRzc8ew1H6iA7OxwOX2TfUgMDKteuap4PGz0jY9CmPHqUV3U5iHe4YeqSMsCUT9SyaxP478GaYkmpp1gWpfoKGLoJRYXqMOu9UoFLrqFSEv97xEO8dm6WuFkpAyzd/4VlSmZb47QwH9wuYx+5zvdAVlbkFL1KLn+eOe5ygXiZo8YpJYB4w4v91wB8/AzbSqH/IhQuhisPJBNfUlNUAA/PQ7nq/aCeKfGy6nIAYG5PNLxUX/Kq//8G6LsAWzbAuztQtg4GhyRrrRdvoFTVvO1Rw5cpCNV7tB667lvXJwVgZ3j5uKZqOHlAdoY8eeA9B6uLjbPVVXI+VZMz4wE/fRAaq6yqwTGA3eHl4zyzfssSEwmIrFbKy7WKQqy4IwAnw1uPkf6obYDgngDvq0Z58jsvo2QLoLPiDzu2eqj8VpJxSgggw3dW/k3/d58mx7gAmT683IOYADoMHxNAl+EtAXQaPgpAt+FNADoOPw2g6/BhAJ2HF4B/AAAA//9ewgKeAAAABklEQVQDAKGuFiy+E7xQAAAAAElFTkSuQmCC","sa":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAFRElEQVR4AexWaVCVVRh+vG5syo4siQMiKqEEuABqoCaKWgKCw8QmhZWMShQoyQiFaQajMAxTIJKKY0EqGBiSFBoaEAISBQECwmVfZLmssnbOmehHc+fOx0VgHO83c7577jnvOed53ue87/fy1FyNx17kxsML/kgIzLSAEgUkCkzSAy/XFVqkoMr8JSclC9WFSqw//lKUk4f0PCksUdXCYhUNGOsaQk1eBfqaOlBZqDhuxmz++/McOhNSwFjXAO5bHLDHbBtcNtsjdH8AjHQMGIwAx8PQI2BXvKIHO7MdsDPfDvetDjho44q7pxIQ5xMGe/MdcLDYBTeyx1q91ZCVkoGf/Qc44+aPUI8ARtTFyo7tx/XF42q4XEsXTR2tcNy4G0d2e2DO7DmQni/FPL7DxBK38n7Ben0j2JhaofdZP/it9Xj4+A8U1ZQivfABlmnooKDyL4xhFEpELXsLG/QROytDM6zTfw3qCmqwNduOd7c5QV5mAbg+nAmYEo+ZLTdhwHizZkN2vgwGhwbRO9CPps42GCxeRkCooqalHp4ExFvrtsF/rxfsCKibOT9BhpC1MbHCvDlz0ULsF0jLYctqC6QV3COeV0JVUzV+K8lDdUsduvq6ueIHZwK55YUYGxvDCq2lKK2rYN67nHEd2mqaaHjajJTcdFQ112J0bBQ+scG4cCceoUlReNrdwdZl/JmNZUTFXKKKAlGAelnQ18MA071X67wKOWlZNBOVx2ONCwvOBCoaqwlAPnLKCtDY0QI1BWUcdzyE065HceOTaJwiv4ba+szDNFaKqkvR3tMF06WrsMFgDbtO6oqqRAlpqCxQJF4WoJhfhsXKGqhvbyKqtGLPemvw2xpAkwAX8NSGMwHqFVV5ZfyYl4GBoWfsunT39+JGViqC48PhHfMpUvPvoqS2ApsM1iPMMxBpQXHgzeJhLokXeu8Ts27DxdKOxc7wyAg0ldRR0VSDkZFh3CZrtxu/zpSVl52CGBCQe5mS+zO8drohLf9XxN9PRmefAJWNfBYXO003421LW6JQPkz0DBGS+DWySwtASdub26C7r5fESx+ySvNBrw5ts3k8aKtogga9gDgjm6hrscIUI6Oj4PrwuBpuNdqAJWpaKKurxAFrJ2xcuRbKcgpIykmDxco18HhjHwKuhCDIyQf3i3PhvsURNa11MPIm6TT8IzR2tjBvDw4Poq6tEQ3tzXAmKdPaxJKl1pLacpy7eQFl9VXo6hVwhQXOBHTVtUn6U4A1kVmRAB8cGcJ3mckIdv6YZZFifjmivb7ApYxrOBB5DEXVf0NDaRG7PjTbPCIp1GnTmyTzbMCVe4kw1VuFoeEh7PvyIMyP2oJ+R6idkc5KPKoqfv4EIlIuIrP4d2z03wvb054IvHoWdwoz4Rbmg9DEKBYD+0K8WK6np3+VGsfA1RJvhyfHolXQjtj0BByKPkGnGcmTCRGsT1+HzweyTEb3o/+5Ns4KcN1QlB29NqLmKUlR88LmppWAMACTHZsAgckeNTXrJQSmxq/cd50xBRbKyHFHKcJSbAIOFjuRdDwGlz48B1rTn33nBOL9ItkYHf9/u3YsCt8cCUW4ZxBOOvviW99I+Nm9zxotx0VgFDklNoHrpAbyjgnC+bSrpAx+yGoi+q2g3wRhLeyHGFahfv/gFqt7qknlKjNfGrREj3gvWCRIUZNiE6Cb8lsbWG1D65uJNv/LZ/BZfDh8L36OXcH76XZitUkREOvEfxf1DPSy3hOixOOGJ6wvzmvGCIgDVtgaCQFhXpnOMYkC0+ltYWdJFBDmlekc+wcAAP//CIWbFwAAAAZJREFUAwBeZ2b3wFZlxAAAAABJRU5ErkJggg==","gb-sct":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEjklEQVR4AcyY2W+OWxTGlw9HT4+7M+pxkhMSrZiaoBJTuOaCG0LMQ9HiDxAz8QcoLWoeGtxwwSUxXqghNYVKJBJqdmOoovrZv82u15f97r3f96PRZPfb79prP+tZXU/Wer9mspafVy2t2XEbG7Iy/8RPseACJwvVbEYsP927dZZjSwZJ1ZQ+0rVzJ4tHx5iIvUlxgAucbFGtCRjHxWN7ysVlQ+X/3wuMqcM+iUnsSsXBFdSZABcH/dddrq8eJhNK/+CxQxaxiElsX8DMjnMPfT5C+Y5UDJTNU/t4ffN1IAaxiOnDgntm3t7bMnnbDWn50Obzl4oxPaVhRdkPkRSSAZsYPiJwhTPctYQOX3oqpWvrpfFxs++uUFbKS5m9zoEOYIEJtu8KHOEKZ3x1AmwanzTrJHadf8Sjc1Feyky56RROZ8dhty6dpHpqsYAFpsNVH8EN8nDVBvWrPQG1l5bWNpmz51YiSdEpKD/3kyzuXF5eJovG/Ou91vy+TXOCGxyjFzLRB7OnPDrTHyQpI5l+Rb+ZkLGfSGbgmgsCJ5uTNQEcKRNJ7EwgKeSALLhvW5xtmRYuGWLD4e6ztzY4bYtNgFPKNfeLpCgjNtdCDsgCeeT69f7zV+FswehwyRAbDrlY0WdnAsaR8lFGymlscZ/Igo6CTIwP+2urhglnxhb3SQxiETPOJ2oPSoALlJFy1p4NH3w7ZvaVnWrRZQp/8YfaeqZJd0JiETNk+VEjKJSzfN/nwRciqTkjeshstSIQ1i1YDKaF+xt1J7Q6xRgTJWAwKC9lvvnwjTGl/gQDLDDTgKRKgECUefD6etkeICn8bQs5ggGW7TzEljoBwN+1qu87SlJTam/K63cfMQUtfLmDHMEIuhTjlFcCBjPpV56nL9+L+nZlruf1mVcCBV0ysn1GidTN76dfuUOZ9FIz4WB5f9k6rUQYbqH3bH6pE2AwNawsk7kji2y4Qbby0UV6uIEVdMHilCCBr7cnDflLGEzF/xR+NabcMdzAAjMNRKIEkAzD6ZAqf8hgqjr5QGpONXl5gQVm7fQSr2+uQ3ACxX8XCpJhOOWC5D7TZSZWX5OlB+9IRV2jsGdY5frlPs8bVSQ31PfvJJIKSoDyQj5EMgymAasvyNGG5+382DOsOGs3xmySSsqZAJLhXYbyFnR1umo6NUouDKZ7L1r0c/QXw4oz3neidts+Kilfl4plZSQT8i5jJINcXIOJM953kkiKV3CXpKwJJJHM1fuvJVcytr9q1PY9JfVNAkhm16y+EiqZ6lMPZOiGi2KTTJSwbW8kteV0k+34G5uRFEMTjtHD9gSMZGYN7xE9t+6NZCrr7siHj1mrT4gRSS068LlLgem7w9CkmUQlpROA9BX1D6uQLpNGMj5iSAoZhnQpOEYHX2a3kgyyoUy+QAym0nX1qSTjw0aG/VX7rVGdzOcLV2TO4MvMDJTM+KqrejD5wPM9r/gy+EIkxeDTEnIFNZI5fv2Fy+27nhlJEdsH7EwAyaTtMr7AvnMkRWw6ncvXmgDlM5LJp8u4AoecEbtSdToGH5xsdz4BAAD//3qSXAcAAAAGSURBVAMA8WSNzjWXcOEAAAAASUVORK5CYII=","sn":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACFUlEQVR4AexWS0scQRD+ZqKZfegSdg8J5BLyAiHEX5CEQBIMCQnJD/AgggfBg6IIihcR8aBn7+LFg+ADxceCBxFfIL4VQRd1FWUV37s6u449LQwsMotr9SALPVBDTX9V3fXVVzSjesvfGxQzDBgUGwYMiqnI8EcSeGwBpQJSAWIH5AgRG0hOlwqQW0jcwFEFTmIqJkIuYomp0x0l0LuQg4Flb+oKiKijBHrmvRhayVACVwkFw6tezGxrOGajRGy0bbpjCgRXPYjq5vYK+hedU8E8wZbdfYGRNTcaBgJJ1hz0W+mto8+SMDO2fcpn4RRHCIFPb6KIxRU0DvqZBbiNh9xWXdObbr7WOHiLzYY1/Pl4ZuEURwiBJ2yX+l8RdBaH4XMlbOvJUg00/d1HR9EOcrVr27h0AHZ0OuGpY3/kXWCsYhOvA1d3AnO1BIJlWyj9fHQHoywIJWAW8sqv42mWYbpJFouryHt+mbQm4iMNAvc7buMgGyt7Gg9+4Ysj/2WM+zq7VkfWPNwX+RJOoGsuh9f39d05JitDfGz+5Z/ytf4l8depcAJ97M6v+xlBd0kYfs81XGyc2gp3UVsQceS3QiiBqK6gpuAAVd8OoSi86dar+vshWv7vY52NmLUowBFKwJ1t4MvbqG1Zvz+csxtKt8UfAggl8JACqDmSALWD1HypALWD1HypALWD1HypALWD1PyMV+AGAAD//z4/RVsAAAAGSURBVAMAmbDn6XudBKcAAAAASUVORK5CYII=","rs":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAFUUlEQVR4AeyYaWxUVRSAv/fezJvpbAztUJZSaDuFFgql4MIOIRAW0RAXwg+j/DBKoiEmxkhI1BhCQjAxEUz8a9QfLgSiLDEQFo0RkVWRTZqydp1OOzOd5c3Me/PG++oPf5G82kwtCTc5My9vzj3nfOfec+/JyKefXFJ8mEXmIR+PAJiToVCZ/9/WcdgrcFEfyxXd+/AAyAE/2uaVRF+aTddzYcrnzCSwNEDy5SbubZiJsXElpjzsvNhOiG1Pugiqbf4EMuuC+KtihL68zMQDbTTVuJiQj+H/4iqT/jyPpyFNdNUUelqqbAcxHEXbAIbQbF5YhfxNG0VTJ9OQGfSbTHUjKf/UQKLaiZqKU376JpMXTBz8vdQfIix7LsoME+1uJ0aDg9iFn0mGMuhLqincP0cuE8VcXEOhbIDIhRvoAi57ucee4WFq2Qaw/GQPtHPfkcBIg+KXUPTryCkZd9qNZl6kiEneyHIvbaKcvs9IjCEBqJLCZE1hRouH63cMAmGTC1kHvZUKKZdJMqMSbsgytc0zErEP+hgSgDWjq91Pu8jw2nluWhMFylTIFoo4fTCrVuFSnw8pK15ayiMg8mrPIuxI17jJIEk0TKpBOSyhRZZR276cWScC1B7xUZvbRPpmHVOOg29aHdY4EZpmy7Yd/w/Ssb0CxWKRmp0fUPnUGsqmmuQ8XYTe24b3mfWMe+ct1E1rkMdGkIMm4W1vU7HxeYuh5GIbwDWlivKli8URWiR5RSV74TaF1ktUtDRTLd5rvxyk70yafKeCbhap2vwipmmOHoDadSvJZTXK16/FN7kef4cPuc+gcvky3JWVcEch1O8luHo1nroadKeT6tnTRg+A6XAQ6egkGusjvHsn95Yu5JrPzdGfTnHo0EFamxtJr13FpNdeIRGPk+jpwRcqHz0AuYEkZiZDMaPRL77HxxPURWK0yE4a27tpdrhRkin6RPCpSIRcXz/p2MDoATANHatgHGVe0HWMZBqtvQPrZJLdbhIXL6ELMEkUu3tMAElca4hnSjysmGy5SCYGMBxOCiKwfCqNu3E6rspxjKkP4w/XEaivx11VhWTkUX1+copMPNZvy/ZwlGwDuLQcHtWBRxSnnEriqq4iOHMGavlYPFOqCYhnRyCAO5tHkiTKxK0tF4YTmr25tgGyvf3IRQlFdaGnRR0cP8nAzVaiZ8/TffJHesUWGvjtrOiFDFSXC2eZ2FaRPko9bANo3REKhghOdaJ3deGb0YiuaYPZLuoGklMhuHgBsVu3UMUKWLqSaDFGDUBSy+JSVQbabuGY4GbsqhVEzp3DKBRIRXtJ3O/A+3gLjkKKdHsnTrHVsoNlT0mHnDy1Gzsyb1ELmRt/0fbph8Tvfk/u7DnGLFxI2lNGULQTxdt3Mc6foT/yNV379pG4eo2tW561ZduO/wfp2N5CoVlNRI9tpyLciiraCO2r/QQfm0uwYfpgIZeLSyz9+bd42+KYxX2kf9hJcP4TJc2+Zdw2QMXypejtUynkILRIx9lUwOXzohRMnOK898+Zg3eJhr9OxkiZjGl4Add40WJYXkootgEkp5PZO3aR/bWc7o6caNhCmOIyyyfiGLEEZiJBui9PMmbg6JpL7atvlDDsf03bBrCmBOa20PTxXlw3w0xYuWkw82Y0ipzTkEXnGRy/Ab+ygqa9e1BDFdaUksuQAKxoLIiWz/ajiNs4fvQYie8OEz9ylOzvfzB+2XJm7PpkRLaOFYslQwawJileL1Nf30Lju9tp3vMRM3e8T/2bWxn39DoQ/x9ZOiMl/wlgpIKz4+cRgJ0slVLn0QqUMrt2bP8NAAD///lt8r8AAAAGSURBVAMA5eK5p4AQ/RAAAAAASUVORK5CYII=","sc":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACn0lEQVR4AcyYMW/TUBSFj9yqhcJC5zCETsAEDO5AQULAwoCUiBUVCSTEUIkdmDq0oisLLDCEBSGY+geQYAPWIkQzINqmDTHQtDQ4Nq6jGzWO7Xfv83ObKM6VbF/nO88v/mJbmJrzdRf75gPfXbqhvWzMXfSXTkxkWixkeM1cqWl3b753UH/2XbufGrUDFI61UD7XoOOI6tan36jNLwO+qC12Z+0A96+uYXgo9pipK3eWt7E6+w1+ywB98E1aAcaPuLhzYT1ol73djRZWHn6Fv+XJGlP21gpwe2odY6OyEfSa7RC+Xf+XgiPfJA4wPOTh3iXZ6Hs7XjhtWtW/ckJFhzhA6ayDwjh/FH3PD3+w25//KFD0NosDzFyWXTp/BpfK5odfenSMLlEAu7iJyYkm47CdXZw3NThvZdOt08n/FAWQiMuUqFRR2AEk4jIpKmMBuOIyLaqkAIdtG4VKBawzwBVXHqKKBiDw4y8rGJu0eQE44spLVBQgCk7rlWeAI648RZUEzg6gEldeolKBswOoxGVaVFxwVgCVuEyKSgrOCpAmLlOi0gVXBkgTlwlRZQVXBugXV6clq6hMgXdoEO+BJHFlEZVp8NQAceLSFVVe4IkB4sSlI6q8wKuNFbz4uIhbr2dRfFzqn0JRcUlFZRo8ClxcKGM6gH8ehKg6q/0BouLiisoUuAqYpg7Vnv9CUXFxRJUVXApM4FR7AuwVl0pUuuBZgQmcajfAXnGliUoKbhqYwKl2A5C4kkTFBc8bmMCphgFIXHGiUoHvNzCBUw0D7IrrkOv2PPpLAj9oYAKnau2K6+75te6jvyj4oAETOFWrdKaBkadfgNFT4V1++8kCXo3Uu6aLioMaB6Va147+wOL1aTwqn8Tpd/MYdODowP0HAAD//9YDn7oAAAAGSURBVAMAPnuX1EGMaV0AAAAASUVORK5CYII=","sl":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAfklEQVR4AeySwQnAMAwDnYzU/VdoV0pXMAhhRC7gny3InXa9dZJnV/jjA9MCMYABkQAVEgHK5xiQEYoB+QbOcyp58g2IFRw/x8C0AgxgQCRwU4VEVKZzDJjAtmP3Wl8lDxVquzYtYsAEth2LgTYq0yIGTGDbsRhoozItxhv4AQAA//9eooOCAAAABklEQVQDAL6Z5oklTb5WAAAAAElFTkSuQmCC","sg":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACpUlEQVR4AexWz0vjQBT+mrRuzaHbUre1UksVL178B0T0piiKBy/+BR5EUMGDiIIgCN4UT14VjyLo0V8XRQ+eRUEWLEtb2tpdt2hiTbIzUzLd7lZhCWwSSMi8+fJefnzfvJk3Eb4CupObAIcfHwrwSBI+9fTA39cHb1ubLaXWFeDx+/F5YQGJbBaR3V34e3sBn68iwOut9Daxwp88vO3tiN/eIrSyAuXqCt+6uvB9eRlvd3fsVml0FGJLC8N2MDUChEgEsbMziIkEtFwOmcFBaMUi5+nr7ER4cxPRw0MITU3cbyWoERBaWoLY2sr4/FhfB15fGRabm1lfvrlBbnwcj3Nz0PJ55qOiGbDIVAV4PJDGxjiN54MDQBQRmJ5GlODG4WEWk09PIR8fV2JTU4ju70MaGWExKwwXIASDEKNRzqFM1gFUFWqhAG8yCeXigscYoDGSBV9HB+Tzc+aywnAB+stL9fvlMp8+lPhDPA7UqT7K9TUeyJTzGBWq+ob/hgTjS7osGxC0ZBpr4e3+HlAUiOFwNU4Q3SNAhZKYmskQjzWn8Ptn5ZMTfukj5dS4aBwYwJftbQRmZoCGBtBFHd7YQGh1FWIsZtxmSV8joLi4yEkEZmc5Vi4vQUdZe3oCrUwG1kslqOk0v88KUCOAzvfCxASgaZBI1QmSskpJ6aScZoeGUNrZoZesPc7PIz85ybCVpkYAJfJzawuZ/n6oqRSCZAcOra1Rd6WR+V4BxFJMG4FWnn8JoGTkoyOkyG6c7u4GyP4Q2dsD/YWADY+6AgyedEoVya6bJYv4mWxYht9O/YcC7ET0PS5CUtfh5Ob8DLyXGqf4/yED9pTkCrA6L24G3AyYHAF3CpkcQNOPuxkwPYQmX+BmwOQAmn7czYDpITT5Asdn4BcAAAD//66rPawAAAAGSURBVAMA8bp7mHJu2iEAAAAASUVORK5CYII=","sx":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEW0lEQVR4AdSWfUyUdQDHP89zSHcgYAdJOJ14vCgyFhNSGjRriESmK1ZtMdtiirnZelm1lluIrtL+aJOZsRW9/aGtkLWaW9pqs0KULEhQEVAgIOP97e64O+655+l5bnCDOwT+Ae5+u+/v7fndnu/nd9/nd4/ovNH0e3/q1rGBpIeUQJQYlJSYZbx0rkuXvL6FACyi5lnQ6xMiKr5Ybdj/QpU2DiS5ASYMGwwv78sKr/yySrkn2DYx5/fNVAC32UCLlA+ARhFIkZoRQINQFRCRmg1AZQB/j5TodjlH5c+RmhfABJ9fRmpeAIpinWDA7yIlepx5dazdDQy2FDJ0awNt57PpurRLXVGjCvwpUr4A3d04hgdxmI8w0lZL7ccZtP20gZ7acVrPvcqdml9AUVCLX0TKB8Dx+A5027Zz796/WVfQQvbpMzxa/TNpL53HtOc6q94qwbY9F5qbVQY8kRJNse3uiUWuRO/72TelkV/8LAVv5lJ05gfKP/mOU8Vfcbi2nZKKyxx9r4ymsEiIi/N8VYvUirOnI5fiXcoHICIsFJM+mt7hRpbJQYj2UZY7RrH197JKsbNaGGel7ASdzgMw0QlbincpHwCiokiwriHT9CE7Q5aTm5lBeno6O6OCGXRINGJgueB+BpipTP7xLVakPAAu12312VR31mLBagghzWVlheKkrq6O+vp69LLEZiwgOXFKLrd3SWp0t97VYkbKA6AoBUhSJeamFszGKPr6h7j9Xw/tnZ0MDo9wvbmFO8NmglxO/kWHbGlHljfict309j85DjompxI5vntB5QaQ5WocjmYEYSvmgSFk5zjSyAAxEWE8kZfHjrzHSE5MQLBZwGqlb108Qusonb1J2J2fThr2tDa7s2XzUxVdRz76M8szuUAdN4CixFBvWYMoGjEO9hExZmZlrImgqPvpGTXT0TeARbeMSFMiK/UCa2suIogi9pAUbHLKNGtXb/RXRW76bPWVhr6EaRcWaOAGEMVYXIoJp6sUffE7FBU+w/rXXse4t4jWr7/nx2v/MPT5KZaVniS/qJD4B9ToJA0hCpcx6vMmrdkOHf+jKnXXt1m2cdkwObnQrajdQBAE4sIOcMtaTtO2VsKvXmTju4dIKdzNc9IIbx8/zJMPp5N9YA/RDXVIZZlcGXiDaP2L6q8WzWJGRvM7VW4AbSImNIfYkJPoxLPYwxNw5jyPtK8Z6WgyrgsluPJv4sw4yK+jj/DXYDmCsh+j4SCLHRnN61R5ALTJ0OAc4sJ/Q5Q+UI/UGHV3T1A9UEplx/uMycfUcRtbIuJ5MPICW6ILlyQyms+pmgagXRAEAYPhFYKDr6lDC1n3neDptWWE6szqKdVBaOg3OMblRTtlVBOzfnwAJlcLgqDuuEFVlqpEVaJbSx0ZvMpdAbzWaUO/iIxmZKrmBbCUp8xUszP15wTwt8h4Q8wG4JeRmReAP0dmTgB/j8xsAAERmRkBAikyPgCBFhlvgP8BAAD//9Na2lAAAAAGSURBVAMAg4iAW2GSKLQAAAAASUVORK5CYII=","sk":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADt0lEQVR4AexXa2gTWRT+Jp00adJ0ldhdd92udLtPqq62u61rRYtVsfioFi0KilrEJ4pVUfHxQ6S1FkRBEVHEJ/j8IdYIikh/iFKfVYpUxYpUpb6apElsTDMzzj21rcakvZpMRMjAOffe75y55/vumRuITvnGHx2+8Scm4Gs3MNaBWAfCPIHYJxTmAYb9OncHvFu3w57yxyfmzMmDq2g6nNnDP4mx/Lf7DoZNsqsNuAXITfag++jzcmE5fhhiVmbQuOJyB8UjBXILUJzNQWtKD+sJl+oe0BjoFM+bQCiia11iwSF0Z1PLqqC86SQi9P4BPa5fguXIfhgKC4iQoXgGLMcOosetK4DZTBhziteL/LXnu63RHYdQca4O6EU1zedjfMgEQYDwfTKERDPi0n4lTOyXDjFjEIReVkCWCSPn90Mfp75Pi8g7rp1NBhGKr7Wjumy3w9H/PzSPnwJ3ySrCXbPmwv57fziHjQZaO3MhyTAZRcrRwnEJoMKKQgNz5tINMC6ci/iiQogDBzAIYmYGDNOmqFYE04Z1hJH7sBsERNbxC/igrjj0fxJg3lIO89bNFEncvR2milIYF8yBODiLMObYHWCjVsYlwOnxQUhI6ODQUloBR8YQ+t135o4h3JGZ07YenAvvth2EkVPvi7dVoqkWjkvAc3sLhGRrR33faRuUl6861jRRibJRfvoMvsqzbEqmUy81e58WGjguAQ2vPNCltv3aBHLwQofb9U3wqWNgjK2V1FQ8anSxqSbGJaCxqQX309ouq0fQ44apDyQIaNRbkJMwFjklNuRZC+GIM8KvCnlg6OzW1Z8HwN3i14Q825RLAEvcWaeSGPgP5qQVYeJfxRiavgglfSegMT6JhfHIaMXyXyYgu98SjEhfiKV9C6AfMwq7Lj+nuFaOW8DRqnrcK16MGnMf4vLE0BOXkj7+rM73/BMv4i0Uv/jdb6iZNAtnqhtorZXjFiDJCuada8LebAE6RUZXT4Lkw758K2afeNxVWkRiuoabG8FrVbaVGHb7Ivb/KyNOloISMMitOJmfhCzbYVy9sIZ7b14OgXncHWhn66++hpHXbDgxKhHJfnc7TGOK34XKyT9i0KkDkGrvEqa1+2wBjJBUcwdZeypQPc6IZb1e4yeV+PqUZlr/Xb4GUt19lhYV+yIBjJnicEBftgkrnlWhdmZvzK+thFRWDrg9LBw1+2IB7QzZp+JZvhry+z827Xi0xrAFRItoqDoxAaFOJlp4rAPROulQdWIdCHUy0cLfAQAA//9CEUMVAAAABklEQVQDAKw1OwcxqZAzAAAAAElFTkSuQmCC","si":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACe0lEQVR4AeyVW0gUYRTHfztpXlkvq+lupoVYRuRTZQqVBSGETz1sGAQ+LIEPPYn5UPleDwXmm6Sr+FQgIixKiJdMutBa2u4yBBHIGtkFt1ZdjdxqRlxc2dmKKWc354Nzvjln5nzf/3/+B0b4Ht8rKBDnSyegtYD/vwKeQZE7l3q5XGUP2bXz/ThujvBx2qe1ACgqsDg+ziFjJwdOv8PWmsnS7glan5iZDH7AMeWlpgFyi15wtfwWwfl5zYgoElienMTpLwoBu915lsBSEvfHDvPcXRLKu56+xyAoHhP67l89KN4sZGZiJLyz52qGKdw5G4Ylgy8YUlPDcpsZKBLYlpWFBG49GKd4humZvPUpctJXwuLNDhQJJJjNZONDWpWVRvLzt9PVtR+bzUx1dTZpaYL0ilzT6i4HGjjF2xMLCjAxR3FxMn19BxHFI1RUGGlpKWFgoIz29lIZrsWSJO9aOcFgGCGSJeS62MUMDkcZJlMiGRkJMsaUFEHerdYdNDUVMvwoELE+0pl/OycIIwZBRqPgUgng831jYWGF0dHVcfJ6l3E6/XKFYdHPa/bIz1q5qAQecBT7jQnq618xNDRHXZ1Ic/MburtnsVo9fLZ3MEa5Vtjle6MScLMPT89jcpIDNDYWYreXyrNfW5tHuviQu/4T8iFauqgEJGCSCvfaRC5YrtNw8Rm2qh6u/Pz7drzcyyeypE80tV8SkNB5sdDrr2SqrZ/+0a8MclxKx4T9FoE1pIMc4y35a2FM7H9EICYQbwCxlQhsoB4joa6A1kIIbk4Sr+biFPoIaT5CWgNQe78+Qmo7qLZeV0BtB9XW6wqo7aDael0BtR1UW/8DAAD//y3eKrkAAAAGSURBVAMA/LGnGqJqhQIAAAAASUVORK5CYII=","sb":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAFAklEQVR4AdRYb0xTVxT/tVCKjH8LMkCCZHNEIAEhZHGSmKDJkBkhfEDdnDEQsyAuxJjswxAD2eJIMMswZDHiPpAl8w/DjY1kTD4soDOZLiwyjWiGWARnlYL83foHaPfO7e7re20fpey1KOm797xz77n39zs959xLtcCAQ/poNAMOnU6uk44rySuxUVrLH71AALK/7dsjUFgYKdMt56WpKXE501Sf40GgvDwWBw7E+LVRXl44Dh9+GcnJoX7ZqTGZEYiPD0FXVwocjgzs3x+DPXuimdzTk4qEhBDFfSorYzE3l46+vleh0QCPHqVhcnIjysqiFG3UHmAETKZF7Nw5iubmZ+L6Z89OYdu2h3j6dFHUuQstLVPIyhqC3e4cmZqyIz39Pi5dmnUqgtAyAnyfxMRQDAxYcfOmBSRzPe91Oi65eppHBNrbZxATo0VEhGxJ18QASeJuer0G9+7ZkJv7AJs3GzA+vuCx5ZEjcYiKEk3YeHa2Hjk5D4Sw+wtbtgwjP38N0werEdFYrQ7U15tgswHz88DBg0YPDJQfJSXyCkVhdOeOlc29ccOMc+dmmBysRiSgtGFOjh6XL6/HlSup2LRJj8bGBPT2puLkyVcQHi5krpJhkPQ+CfT3W1Fd/QRJSc4SSaXy+nUzjh0bg8UinIFBAqq0jQcBKoehTqyizeCgTSirQHf336CKZTDYsOCWIt4SXFwgAEJB3m/oaSmHBwFKwoKCl2RbpqSEoq1tBkVFI8jIGEJcnBtDYXZtbbzQBv7zZtYfDDiBJxIeBPbujcbu3dEyJKOjC6irMzHdxMQiGhrGmcwbIlhTE+dRofi4Gj0B/6m5Er+2vgsCztdkBOi0PX8+mSUnXSX27Ytmcltbshj73EDaV1TEsHnd3akIC9Pg6tVU9AoJruZJLAVelP+LdHsmMwJ02lZVGTE7a2dejIzUCuXUgUOHjDAa3YKdmTmb1tZpnDr1DGlpYUyRlqbHiRPjqpzEuRvvgnvcG/Brj4Gt38KVA9PTdlByUmWZm7NjZGReuNf8d0dg8Lw3t25ZQElPTqDDsK/P7H3iMrUEvOOzavz+dRmWAr71O+CaUUKAqs+GDWEsSTMzh7BuXShClO9xIpySkihUVT0R5v+J48fHUFq6soucFHhpwc/C5VBeornHOXAOgIUQvVAMFxePYnh4HpS0u3aNQqfT0NCSz5kzk6CH7kONjROsWi1p4DaY+dp9cI/7A5wvIxKgqwSB4AMkUzjxd6XefY7ZLPeckh0Bv/Dph7h9sRTegHePOGPc3ePu64kE3AcC9S4F/s6OLmi18jwj4G98AxR1OmPcF46gEXg95SG4x30B7xvzBds17gcBl5E/EgFvra/F3fZiqAmcYwgYASnw8uIOodQu8D1ZLw0VfzzOjCWN6gTWJz4G93gggXMOqhEg4Kc/+gSDHW8jGMBVIyAFXlV2EWE64d85vrrQqxUqwlJePyv+BpLWmsA9vhrAORu/CRDwz482Yuj7HVhN4H4TkAI/+t5XWBNu4Wuw/gcDwA+g/1NV2GJ+ND6/gbWxk+AeVwKefQEo/REIJnDOUZEAAW/4oAmGzrfgC/jtCb5c8HsPAlLgNRVfIjLiHxkqChXu8dUEzkGJBGKjZsA9/iIAFwkQ8Lr3TwuhUogXCbhIwNBZiI8rvwAR4UrqKVRy25zJ+TyECmHy9mi9Aecx3u/8JcWb3XOj+xcAAP//PhnXLQAAAAZJREFUAwCbhmseRZ3l9gAAAABJRU5ErkJggg==","so":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACLklEQVR4AeyWOUicQRTHf1kNYhJCEnOQJhfBHEUiKVPlMoaQKlirhWJhYWcjWAmCjXYW9gp2gqJ4YKGIoOBRqKCwKCLirXhf6/tYh3VhZ4/vm0EWvoVhvn3vzbz//72Z9ybwrSUUSucRIM1/PoGbTqCfAT8DHiPgHyGPAfS83M9AvBBm3IqnNaOzmoHC95CTbQaobherBP6+gYLXOtdm5NYI5D6EF/fh31szQHW7WCPw+yryz+/Cxxyde+9yKwQCcnkL5PgoeH+ufSuZqdk1gQdZkPc09vifC/duRyD+ehXbzln/WfZwCEesU/tyTWDnGD7I0aj/Dg0/o0fFl2gQ2ZnRemVf/RVCIbiQEb0i+X+uCTg+W2egvBsWdpN3qCx7glDcAVNrSuJudk1AuQvuQGkXtM2CQ0rJdfPeKdQMQt0IHJzprJKXeybguDq7gKZxqOyDfQHoyGKNmY1w1AeXYmndyVIgkNjB/BZkZejtjiTim0d6vRuNUQI/XkJmQA8j7xk8Nvy0iONOD0SnyZdyqXTLe1DRC41jkbMu7QHV4JSd19kYgScS2U9S08/lJrdMQ0knTK9D+5x8S7UZXQlDNf20MEYgX54OwW0ok4rUPAmncrHDkGHtEKoGoHYY7khPePdIabzPxggsSi8ok57glFUdrP4FKJJsOI1NZ5Oq3BiBISmNyXTU3ROYWE0Vpt7eGAG9C7san4Dd+Cbe3c9A4hjZtfAzYDe+iXdP+wxcAgAA//9H6lABAAAABklEQVQDABEb9wlsldjbAAAAAElFTkSuQmCC","za":"data:image/png;base64,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","gs":"data:image/png;base64,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","kr":"data:image/png;base64,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","ss":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEWklEQVR4AdSXe0wcVRTGv7n7YpftLo8tEqihWyylCBTEAksxWKPWV9SkpTExAdKmaWmJtGgxqdo0sTWKrX3wKLY2AfUPA6GmRBObmrQxblGJFIW0EcVKIpVI1wJSyr5mOneSgW627MwuzAKTnLl3vjn3nu+3c2d2hhhy9nMkchkHMIsyiMaSDWPBMUSkbgFUEVhsG6GGGaKCLukFLHmsAZrEJwAwWCybACCaJbooGNIrYLQdgSo6TZQXdOsDIDpVmZbDmHsQhjV7QfRxorwg2/sCiE418TYYC2uhW/kqoNKK8oJqAwJQpwzRIGLFRiwprIMmvpBKCyokAUS3JMLCL6kqROa9D5V5pSjPeysbQHSqjkoRIPQZlWC0JlGetzZoAOqUYRhoE4pAH7va5S8BRE3leQkym6qM2gD9qlKYixpd0SnPX7dYYrvDHbMCmILXxmhZ61ZrbtnZLHvXn1nDw8NhC0kAi3FkyqdUx97jgG3bt6jc2oT+g0fh+OCI4iEJsCGjG0+ld0l5nzrv5V9DmgejsP7SUjQ2/Yx/a47hv5qPFAtJAOqssawBCdEO2hVCq3ajKLVH6M+0G1Mb8WHSZryS/hYum1bPlDZrXRKA5RhEGSbwyZYTeHZNJ06W1qP/8DaY9bdlFR/Qx6NyVQVeS9mFQV2srDHBJAUEUKs8WBE3JMyXl/w7Pt9+FJvz7GjrLED7lXxBl7vrMKehOP0d1CW+iHGiw1xtfgDU9NP8mq8vaUBfzXZUPXPOp9ZfN5diX2uJjyb3wM2/ljQnbMDGjAM4Z7GBXl25Y2fK8wOgifynGTh+6RDQHlWmY+yOgVeZaSHEnv/MoU3kB+DxqnGh9xFUfFaOh6pP4VB7sc/MmQ8O4L3iT300uQca1o3SG+fR1nMAL9/sAKFfsXIHz5DnB3BvHoX5ZyRGkL7vW42Sj3ej5cd12LTWjucyOwVd7s42ehWtve+iYrAdRtYpd5hkXkAAOprhf6WRCQPKm3fi619yUd68C8lvnMboZCQ9LRlJd4Zw/Lc6nOirR6LTIZkfbAKRGkBX+46mnbhxa/oR6PJoYO8L/Mlp8oxj70ALvug9hIKxa1JlQj4vCfBNTzboPSG3goq/xUsTR3Dx8WHsKMtBXPVuxFRXKRaSAI5xs1zvWJcRi47TT+L4mTIkv70HsW++rnhIAshxHxE56Upbf+26Pv9s976f9ndvatsTtpgVAKeehCv5Am6tPaztYlqsX/Vfygp3hATA8evc88CvcObXgk26DIZ45VwoRXKCBmBNf8OVcwaeh78EtBOKmApmUtkArG4UrrQ2OHnznHkwmBqK5koCcMQNt/Uiv1zqwcb3gqF/DIpaCm7ygABey1U4bbXwWr8Do3IHN3OYsu8LwBqH4MxugjuzFdD9HyYroZXxAWA143CltsP56Clw0QOhzRjmUQIABy88y34QlgubcAUMmau3deVpiDfmD7jyTsKTch6M2qV8xTmucBcAAP//39G5TAAAAAZJREFUAwC4s8hw+pphKAAAAABJRU5ErkJggg==","es":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADNklEQVR4AeyT72sTdxzHX3e57Jof/ZHYSzM7K6tzDJW5Tt1Wtq5urOv2bA9kMNgTBxtz7F/Ynm4MhyL6TyhaVFBEQQQVxR+gVtGiaatNbZs0TZqkyV3u7uvZh4Jc2piTYL7wuYO7z4/3j89XPqx1i0YOmQY/TQKv28CmA00HalSguUI1ClhzuTx8OEkjx5u9QmOZSM0rUGuDFTtQtjspSWsplVXy9loK5RBFoVG2orViWVX9iggUiTE/lmbs2Byj/wSQnjzm/l4fiZEFMuMZDDm2KhC1FK2IgKLnGD8SJjfqhGlRurPEQtome7Od5NkAisjVgmVVtVURSN7w8fAqqKrO1t8LWJ9nSQ1V0KMWuV028tA8m38uIQudJ9ch86iqtqsC/GJRVZOKcYt8FxRmJUYPdOC/EubtEwECpX42b9uL1v83T1sPYVhtzGiQDdl4daoi0BH/jnBsN1ZZIvdUsNhfwNi4gIJKdK6X+O0dCH0LlvMlGv+TYGTAK/y4ErANmL1UJH16gsmLCpLlZ9r/HjOVHnTTxOgKQ9mk4oPEKT/zZ+6TummCRya4EsgnZQoTi0itawh2mBgtRUftNipJnYPpj7h18RLZTe0IRSakmfii68k/mqWY8sYEVwLt79pE+nqoJDL41gVhQxvatWnGzQ+R31e5d+4UkyO/kdq/h4CmU7o7xZodvYScO+MFBVcCSykJPW2g7f4CO/gWajRLMJLjs87L9J27wXZxDVmfpDKTQGn1E/9liEJiCT3vBXzc70BQE2iD3diS7CRXkIRYRuYPC/pi06i9UOxR8Sk+JNvCVhS0nV2orctpdX+4OiCExNT0UfJz/xGKljEqLcughG0T2vIpdl4h9EBCbo9gBgzmp/5iLnMer447AUf3rBgkJ4aRW6IM7JKcHf+EwPd7SHwQw/rhDyLf7GT7rwsYvjiL4mtKylde4XfQuYySJYtv151wYoTO4CxtnTm2fXyBLzfu46f1/zO44V82bT1JqCPPO+EJhnuOM9A14tL11f12deBloyQJZKf6+ftlOV58l8/82E0jh6OhFzrVb0aTQP20ra5z04HqdKpfVtOB+mlbXeeGd+AZAAAA//+ItiU7AAAABklEQVQDAGfG9wjQl7FuAAAAAElFTkSuQmCC","lk":"data:image/png;base64,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","ps":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABLklEQVR4AezWi22EMBAE0LGLScrIuoy0kXSTYsLWkWLiTIz2pDudLDjwZ6VDXlsgEPP4GCIQsuciAK6XJ2D07YsCvgKjUxw4f1x48EKEV0hkfggAr5ACYP7SPEKuAEXBzhPkLoCG0jxAqoCiYDczZBOAhtJmhOwCFAU7g2R5Q16+kfPvsHoIQMPaVIGU1lJdt3XujwEsrOqK+Meo2tYu4zkAi6raHXIuYACkDaAjpC3AIA3HtgAR/iXyN3FhiTRhtAGINA9uV2MHwA6pjCLdgluKcwAi3YOfAxAZFvwQQF/4vfoAwrsi/CSErzCsdj1CFjx9AvqKKZZNgBmD29WrAmYOXgV4CH4X4Cn4FcBj8AsgcTqcaVaxYFvHOMt0uDXw7X7VWeh25xnXn4DRd+UPAAD//xtuHAYAAAAGSURBVAMA1FMD2NKL3GwAAAAASUVORK5CYII=","sd":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABmElEQVR4AdSYsU6DQACGf9A0qU666uzG1IHERR9B3wDeQp9A36L4BH0FXZows9lVZ2OalKSieD+0HWgJR3scd4SfcpdC/g++AXCDAPligDyHnXGja8B/AJILWLm4bJ1cAv4jQBiObUoBwMLpAAiDMtznnA3ZAKzL8i7YpNQWAEFsUmonACGokQ1K1QIQgjFdqUYAQpislBQAIUxVShqAEIxpSrUGIIRJSu0FQIiNUq8B0mzR25PU3gCEYKL3CP7Ex+x7xqH2HAzAxslXgtFkBMJwrDNKAFh4/jNH+BYWSX9TTmmJMoB1W94FnUopByCITqU6ASBE9pfxp/N0AuCdeYjvYgRX4gWjYwTlACwd38fwzr2Oq5enbwFQHlC3HR4NMb4ZF+F+3f9UzysB0KlM9QIcDKBbGXUAS3GqSHzJuH3ByfEpHMeF00NcUaP9+iEOeRKZOmLT79oeYCoKP4t89l9etIA8wEoZRKL4UgRmLHIABilTvWzNAIYpIw9gqDJyAAYr0wxguDL1AJYosxvAImW2ASxTpgrwDwAA//8DU835AAAABklEQVQDALHDEbwRS7Y/AAAAAElFTkSuQmCC","sr":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACHklEQVR4AexVvU/bQBT/+WzapNhJG7a6QztWLf1MAKlS6NpOXSuGftCpUImq6tj+C+3SLi1KlwICZtiZ+BCfCiBYQCAQC0sAgUlyh88gExRZIuRO4SSf/LOf7z3/7v3uvZNJ07c0bf7eylQFgeIjFFDrAoYVCCtQ5Q6Q3+9+ar/e/oCqIE9uP8LTO4+VhfqHeHtkAiqDjL38gNEX7VIw/uo9OGTxc16pLXS9KQ8OSBxSBSTSh+CQmD+kCdAMisSzPG60FMBtWSKkCYgnCyARDXo9EE8VIGsIERB7mMetN/tnYLc5fs72a+eMj8fyb/yAKgwhAnJzBmgesNsO3ER5sg6se0U/Let+0Z+3XWH0EMjNGr6/GkOIADANmz1RZDstOFtaYD7cl+00sdkbdWOC41znuS8xAk6W21s2MNtuYXexnHZ3Qfd8POYkXMijfKUqaamjIXKTlrFE7CLovphdLyWvQEDpZ8F2rLEAI37s55XYW9K9Fz4Xazw9F96kgJtwAQ3P3RNKGTb+X8X8JwvZDt7zVwDGkGh1fQKSLqUQLIDBvFvEfJeJ9e4oGNU8rP25hoUvJqwH4v8HQgXoJsPiVxM72brSTfLs3Eyd59Prqfcu6kaah/6iZbhbCFIDGST7M4Fcyb4MUoPB/ovkQRrSKagMoS0kqi0q4SFTqzOYXJlWFuRjpot1/PsMVaF+C1XSb5cxNqxArasSVqDWFTgCAAD//1P/A4gAAAAGSURBVAMAlJERAsVGjWYAAAAASUVORK5CYII=","sj":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABFElEQVR4AexWqw7CQBDcXBD8BJZACAmm1fARaCygQPIFSBA8NJqPAN0aHAmWD0CCICldSU/QnU1oLtlLVnQ7M72duTZ1j043k9Zzs814nZNbRq3xV3GP7zFGqovgHQW+bICqA7QELAGlA3aElAaq6ZaA2kKlgCWgNFBNd/XphKRVi6OfD2aMVBfBYwNEJQbIMciGpByX//4SWpfr3UuCe6gewnOD0YrQmi2P3gDcQ/UQnn2FvAj+3Ag/gdNhTmitF0PPb+6hegjP9eMmlSsf12s3vAG4h+ohPPfa7Ula7zT1Nl5sMEaqi+CxAZISA+QYZENSTvgvcTH60K4tgaoTswQsAaUDdoSUBqrploDaQqVA8Al8AAAA///aXZ1bAAAABklEQVQDANbIagMs+phEAAAAAElFTkSuQmCC","se":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAA6UlEQVR4AeySIQ7CQBBFJ6sb0BU4cBwBDgBBoTgB12jKFTgKBA4ADiQOfDWkmlLTUMEkTL/YTPI3GbV//u78N0GW28pa192gel/kZ603K7Of9f22PojzwwFiAyQBEgAT4AqBAcLtJABHCBqQABgg3O6fQDY9iLXS5KkmtxjezH7W99v6kE2OYq00eekDjOoBOnha/9Do/a+QGqWTCxKIDco/gfw8k//qqyvKnhr8/j42+1nfb+tDfpqLtYqyrw/wqAfo4Gn9Q6P3v0JqlE4uSCA2KBIgATABrhAYINxOAnCEoAEJgAHC7R8AAAD//+UaHrMAAAAGSURBVAMAtBhdgjrkgX4AAAAASUVORK5CYII=","ch":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABT0lEQVR4AeyUwa3CMBBEn2iCFuiBAz7SBXuhKi5DFxzNgR5ogSr4WuAWO8HCST7ISBukHe+sZybK4g73b64FX/5rAuYOsCXwewksl7DZpMuxyorrv0LbLcQIMUKMECPECDGCY/9eQOULDtHVT2BoY2W8CahsaDFdS6DYssoD5Qn4t3y3g1yt1/krOpab875z56eTSLmA1QokkEACCSSQQIL9Prno0XRMAgkkkEACCSRw7sfB9x/lAt7nnuRkEzCJzT1LWgI95kwCFSTwus/1CmZgBmZgBmZgBmZwOLwOJv4cMwMzMAMzMAMzMAPnToz1tcoF3G5wPObrcsnvc6xv1rnz00mkXECSZr5mEzCf98/NLYGnD/M9WwId708nCAFCgBAgBAgBQgDHOgOfNeon4N/y8xlS5dhn9+1M1xfQWTFuowkY199h9pbAsEfjnvgDAAD//+Db730AAAAGSURBVAMAQ9DH6e8nstgAAAAASUVORK5CYII=","sy":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABtElEQVR4AexSPUvDUBQ9CaLiIhUFi4NKpbhoEXRTK4hO0lWw4tTqpGAXhYKT4KZQ7Kw/QCmC4KalguBSv4uKdlVQBBFaaRXNTUmHFGleXogEXuAm992Xe+475zw57fL+ODlkOPwRBP7bQOGAcIBTAXGFOAXkbhcOcEvICeB8B/re7uDkMO1ArvgJCs4boGLw4JgmcHB/CgpeAoRBYRbHNIGd6yR2lTA7WOvjxTFFoPBdxF7mGPu3J6BcOwzrl3p5cQwTuHh6QPdGEFJ0GHUro8h/FfBRyKs51bzrU7h6fqzKwSocbZBhAj53F87ntxDun9B6y9+5gQAuF7bR0+op1/5KrMLR8A0ToIb6mlrEAxE0NzTSUo0WJd8MLIL21IKBF/0btwCHRjERoIbDbBqvuXf4O3wYau/Fi5Ins2e0xRRW4TAQKJ0vcZPC2vgsjkIxJMMxrI6FkMikSpsMb6twmAks+YNY9k9DkiTIkozoyAwig5NgfazCYSbQ6XJXnNXT1FZRq1awCkeWFBWdHMwOVFPW7n1BwG7F9fOEA3pF7F4LB+xWXD9POKBXxO61cMBuxfXzfgEAAP//2S2E5AAAAAZJREFUAwDGBVxYkDHTwQAAAABJRU5ErkJggg==","tw":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACaUlEQVR4AexVv0sjQRT+zP1IIZ4G4uY6ixwGtrrEkzU2x3VaayP+KkSbayWNigoKWlkdVsb/QUERCwWFaLa4NCaKYDDunSgHSjTVRfdmRlyWnBmixBeFXXiTN++9nfd97yOzLuCHSWWskVluYwTwqp8nEfD7P7wY0iUTCIW8FuixsS+Wb49bQUKnZAKdnZ/Q3d0Ij8eN3t6A+OX7jg4/Idz/W0kJVFe/RW3te/HW2lpGEBgcVLG4mMLQkIr+/gBWVzMiz4nxerEhXKQEcrk8IpEg9va6EArVo7X1I2ZnwxgYUDEzE0ZzswJNU5BMdmF4+DN4PSF20UpKgFeMjOxibu6nAHuvBo9zq6tzo6lJYfkEeB2PUVtRAi6WCYd9mJ7WEAzWQ1U9eOjhcU3zYWpKQ0uLD1VVD1U9X4zBLH74/VfH7X5TvKgg82II3N4COztnGB3dxcpKBonEnwKod1seX183RB2v5+/dZWhWqQIcQl9fAAsL37C1dcr+rBc8ZNn+/gU2Nn5hfv4renoarTilIyXAr8Wjoyy83igODy9xfJzF5KTOCCUxPh5HOp0VpihRGMY1amreUWIXvaQE+LW4vX2KmxsT7e0NiMfPGfiUuEaj0RR0/RxtbQ3I501sbv7G1dVfcSjlIiVgB7K0lMbEhI6Tk2tw3zByTAUdy8tpexm5XzKBWOzMAheJxCzfHreChE7JBOyYDg4u7duK+k8iUFHEBc1dJr6Dygp6l2X7+hUoyxgqeMgjFKggSklrh4BkOCQpRwGSMUuaOApIhkOSchQgGbOkiaOAZDgkKUcBkjFLmjgKSIZDkvoHAAD//zaI50UAAAAGSURBVAMA0rUh+MZTSUoAAAAASUVORK5CYII=","tj":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAC0UlEQVR4AexWTUgUURz/zZsdJ3N1RRI1VDRIKsLCDIOMtA4RdS0i+rjXtUtGneugRVDn6JAFHvo49HVQDIVIrYNEKwUSqOi2lbVgu/Px+s+bXfEwB5v3JBfmsf/3/t/z/5p5y8YAXszAUOQrSuB/NzDqQNQByQpEIyRZQGnz4u9Ay+AgihlYeVcX1griHbWId9StmX8vbuUj5Kaf+HPNLdjTlwl66N+WJXjLMkGp2ZQm4KYfw5o6C740BWgGYs19iG3pFThfSgqZ+/0ZVC41CdhpERMr74DZNgnNbBC0tqGZ8CYfN+th7vkIVr5X0Mjb+ET4XT4BKwXr02m4qX6gpA4wGwFWSmOThfttQAB4jnhlQEk9YNSS7gNYyTMA2YYP3bdk/iGxG9VgFfspOAp+hRt7+iqgU9DMhDN/b4WE0JJasukEyJYoqR+Tss4b643XwBJdeco/9OqTcH+9hZsZp7HZ5zPzO0scgt5wJU/JHdIJcAowKAQt3g69kgKtPAytrDVIBTwzEcj/F6ZcAvZPWJ8vwJm9FfhMnv0KD4KEzsxNWF8uAuQjSL5anlwCsUr6VN4Aqzq+/Dy+OOzjuTk4c3fhzN4BrHnBcxeHxOltrOoYjKbrAPnw6LDAVm8YrClmn3MSuuJltWd6kZvYhez4DrCa82CbTiE71kK8VjhUdXfhvtAFNGiJg5Bd0gkUArAmj8D98RysohN6zTmY7UkgtwBupwQea+gBSxyAk34Ka/IooMWgYilJQCvdCmPnaxjbHtHndDPFVkXJvADnf0AZEP6KTsLpDjC2D5DuS3iX3LpJoBBI7n0rXVz9cDJj4NYCWNlusHibwJ3f70j2ELkPbQV1JScbSg5BFYxuvI0R/RJG7BN4k2nHcLpagId7PE82Wtqn7Hle3Ky7rxvFDEreASWzENJJlEDIwikzizqgrJQhHUUdCFk4ZWZRB5SVMqSjvwAAAP//M7PvcQAAAAZJREFUAwBQxh9X0BhE9wAAAABJRU5ErkJggg==","tz":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAFOUlEQVR4AcyYXVMTVxjHf7sQBsc7bXvRdkbb6qDlJSJoOjoO36Cvn6IzjoqgCCSEQAKIgm9XnelXKFi/gOP7xCTERNBiaR1vK3DnyPCS0+fsshCQCFkSYCdn95zds+f8/788e/acNfkNtZNS+e+oa3HUwgJKKdTMDKq1FWWaohNDsSqZ7KDN9xk8/x7O1YEIJpEArxd6ew0yGWNNpTvCQHkJDNbDYxF/4FOYnQW/H44fh/HxtYU7brbdgEX9B2g8ikU9lYKjko9EclN3xOvjthnQ1AeOLVL/xKYeCEC9/BNjY4bWtqG0LQa+k1hPC/XztSxRr5O4D4cN5ueNDQl3Km2pAU39ilB/JLF+UKjPzUEwaFMfHc1P+JYbsKj/CM2L1NNpO9a7uoy8qTvid+9WbMk/MOCDJyL+4F6763BYD48GbqnrVhoaFGNjFNdAnYTJXz/DeRnLdae6wyNHIBAwdNFV2rVLceuW4u5d2LeP4hnolViPi/gKMaGVaupVVQaplKGLrtKpU4qXL+H0aTCkmdRUTeENWNR/gUsS68hWKOo3biju3bOpzy2UEkoEOTYcL5yBMnma+o5DVGK9QmJ9fh4iEagVI6mU4BIzbn4nTypevIAzZ7Coj01/awnvTHQyl/EUxoCmnv4JWo5AiRgZH7eHRr/fYG7OwM1WXq64dk1x/z7s3w/zmRK6Eh3UDj0jNe1dalK6W8rnndHUeyTWHeoyg5SJF9TUsKlY9/kUz5/DuXNYL7qx6cPUDyUIJkIW9Wyhrg1Y1OUhbZUQcaj7fNDWZshkzMjuY8N5TX1wUPH4MRw4YFPvHgkI9dQK6tkN5m1AU4841PeApn75sk09kXAnXAtyqDc2YlOfsql3xLs+oK7rOykvA14RnBbqbauoX7q0OepXr66kHh7xUzucm7ojXh83ZMAjtcJCPS7iK8SEpn7lSuGoNzU51A9ZsR6Id3+UuhbuJJHmZNc+aupJGWHahXqp1J6YAB3rFy+6p15WpujvVzx6hB3rCyVEku1CPZ0z1tdWJ8ZzXdDUu2VurqlXyrieycDAAFRXI0s9I9dt656vq1OkZSJ34QKUyEpsfPob6ocT+GPhDVPP7kSYZhftvEVdwsV/FBzqJ07ITLLZYGbGsCvludfU+/oU0ShUVMjDnzHpSbZRM/Qib+rZXZvZBU09VAcW9T3IQlrWqoM29WjUnXDdvkO9pQWb+tTX+G4/pT0WYTZTpqu4TksGHOodYiCbelPT5qj39Kyk3ptspWb4JYlJ6ci17OUbTU29U9qKyYNauUj9+vXNU/d67ViXbzqL1L+yqLfFejZNfVk+mFp4UAx45IF68wYaGqCx0T113Xh3t+LZMzvWdbkv2cKhP/4tGHXdppNM716QL2DcvAmHD8PDh4ZzLe+jpj46qqxvOvrm8cn91A/FaY316WJRkvn6tU397FmD9+/diw+FbOqVlbbO/mQzh4ZeF4W63YO9N/W4/uCBe+G1tUpmjoqODrvBV5P78A1HaYnJq9o+VdS9+e6dO/Eej6Kz0x5hqqpgIWPQP3Ke6tuvePpWVjZFlb3c+NIwunxq/VxlpSKZhGAQPB6YmPpSRpgYLfGBgo4w6yshvxVZaakOFVu8jvWMUL86clao/130WM9lxsx1YfV5TT0eh1AIm/rkF5y484QL8evMLJSvrr5lZXO9njT1QEAxMoL1rV5TH0icpvrPCaL/yRJsvQaKfP2jBhzqXV1QViax/vZzi3pz4ta2Us9msqYB01S0t2dTl0ld/Feq7/yzI6hnG/gfAAD//2JnaIcAAAAGSURBVAMAZJE03Mq4tPUAAAAASUVORK5CYII=","th":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAApUlEQVR4AeyTsQmAUAxEQ2awsbe0USwUFxJ3sHEHcQEdwEHEynl0hhBCOLgP1/2f/Ny76Fk2H7JUwA8HyAZIAukExmMTZGnRt4Is7kD6DmR/wNsfP0LztAiy9LlfQRZ+hLxLlP2eBEjA6QAj5DTQ/dxAwN0rpAAHCLHVUFS3fRVkadvVgizugCGuIVdJIMRWQ1G9qkGQxQgZaIdcJYEQWw1F4Qn8AAAA//9lFH/jAAAABklEQVQDAO6mDQd2/ZdZAAAAAElFTkSuQmCC","tl":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEe0lEQVR4AdSWbUxbVRjH/7cFbintLOoHEtmgvKyLGY4MRyIuLtmiIZFk8SVEY1DQD0IMYy9ZbCTOCM4PjJVGJ0tEQZo4N7MvxLQxKvpBQz9Mhfhhi2OhcYlhC2IGoy+0t+funMtuoe29LR0tLU2ee3qf85xz/797nvPco3l5r1b8fZ9BvIKHtqRpLv9J8NptLzQfhFC4i2Cr/TRM8N83gWf6fPjhuWWYzwkwHSLg8kTWlfMmATCVXj+H45+E0HYxgEdOElQNERTV5T5EBIBBMPvuN4KDnX78bySoOEtgPhsGb85dkDgABjE1LeKJFh8u/BiCoQ7YOUJB+sIoqiGsO6dMEYApXKIp9ebpIF7vCeDOkghDPVDxqUgtDGMDBeFyY1VUARgEs29/DqOuzYdf/hDYLV0FoPxjETtHCYqfJ1nf7EkBmOp/54DD1gBGnCF2Kxm/Ayg9KdLNHsa2/UTyZeOyLgAmLBji0HEmSC0A//Jq+ujMHMo+ElE5SPdI7aqfjdkMWzeALGbEGcaBd/z451b0W9c/TveIncBsD0NXtXkgKQMwkL9uiNK+GHWtphTzMzPUAtVf0BJsE2DYFw3J+tNtigA8X5D0OaxKvd0XxEvv+aUqFTugaC8H8xkR1cMCip+lINrMrIoiQE1NDbq6jsRqUrx3ThDUv+XDlWthxX5dBYfSblq1viQwHaQgmvSCKAIsLCzAbrejtfWNiKiysh0YGLChuroq4pP/3LwNHDrixzf0wyf7Ylu+HNh+SkTleQL97vRBqAIwAcPDwzhx4jguXboIj8eDkpISTE/fYF1xxqpUG/3wnRpahiiqC9RbgMpzhFauMAq2k7h5UnUoAmi1WmkejuPQ39+P5uZmCIKA7u5uyZ/o0ve1gOb3A1j0qkOw8dv20yPKVwSPHSPIfzRxLItXsyiA8vIyDA5+hpmZmbh4h8NB/Z44v5KDHQgtr3gTphQbx2k5PHxYxK7LBGZ61jI8mfqKRAAaGp7C2NgY2tvbodPp2PxRxlZBKf+jgtbcCHRP8wXcGk+Sv7TwiUIK8feniwBMTLixZ08tTCYTmpqa4Ha774esNEajES6XC8XFphVHgutuWnncn+vx4oG8BFErXUtTwMxRDTxHtfBObQBgZTpgcfEunE4XxsfHJRdLHYvFQitSq+Tr6emR/GqXjhfy8Ov5QlSVRt6NYuhGhcuTqj5lfn4ePp8PVqsV169PY3TUQdOrA52dyt8Ho17EhQ95DHTxKOTV32S6hCcFmJubQ29vL2Znb8mxqu16UibdwmUxqiswOTkJm80mx6m2yVImU8JlQaoAV69eQzAYkuPi2mQpk2nhsiBVADlAqU2UMpslXNaVMkBLo1axymy28JQBWMoMWQswZNVFVZlsCU8JQE6ZlsZ8eRyyLVwWkjSFYlMmV4QnBYhNmVwTnhBgbcrkqnBVADllSv7TbOiQJT8g021kD8gpM9Cow+y72gc+HWZacOz8EgBLmZ+O6fH09/yWES6DaF6t18JhKILmdP4DncflibLV3gMAAP//5ECnbQAAAAZJREFUAwB3PBD/CjsSYwAAAABJRU5ErkJggg==","tg":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAB7UlEQVR4AexWTUsCURQ9jVRQ9kWhiyBqEUK0qV0hgQguRJPQlSv9BWLbcBvuFP+AP8BFGK3ChYsWbtq5CISsJELDpPwgEp3GGXUh4/AE3xsHZuC8mXvnce857743c7kngJ82rs7Ab1yzAQcKF9elEHRMSCoCxuSi4tYFUFnWCYISV2Dx+HiCsOymEgvYikSwcHjIjhlhJiIBBpMJRrcbKx4PUdiLXeDWwQZEAlb9fsBgwIrXSyRgewmwmtlAVgC3uYmdbBYWnhdhisVE4otHR6Ld8+/X61gLBkW/moOsgG61ije7HbVEQpZbu1jE68kJvpNJ2fcsnbICRAKdDiqhEL6iUdEcDJ1yGc8WC/7y+YFL1ft4AX1aCwcH/SfpZjCbMb+3JxkzMCoKmDMaYXQ60S4UxC1Ti8eF1o/HWiAwA9QlCooCVn0+/KRSKAqH9zeXQyUcRsnhwLLNBqXrvQU8lNlAUUA9ncaH8Anlm80h31Ymg5LLhV51hs6Rh5sX4PyeDRQFdGu1EWqS2ftK8Y2GZKg8KgpQmRtRel0A0TJRnKT9CnyaADKQz1sXGrlTRuCsj0LXOGVcCv+7O6GdZgHtbyGK54tJaL0CTJZZIYn2K8Cqa6SVh2PVNdLKo/0tpHA+NPFKr4DaZdIroHYF/gEAAP//o1RZvAAAAAZJREFUAwBdB+N4ocfztQAAAABJRU5ErkJggg==","tk":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAFJ0lEQVR4AexXCUwUVxj+gIBAQQ6RS065WU6hgCIopIK1NoXQNmiktJWQ2gQaElKQlqRgL2xBKC3gUVMUGypVhCpgy+JSDluOyNI1rtxHuS+5Ka7QmUmAALuzA2yCJpAM783/vvfN973/33lvpGEaO/8iX9J4wf+2DGx2Arcy8NxnQE5WZrM10j6ftoS8XI3xa2ogPJwNaUkkOago9xTBB7kw1xliREtroKl9CJPTs+C3DDAi2whIVuYZwl6tQnN6KrRVJ9DQs4MRHa2Bzt4xHIvIwcDwFCOy9YKCPOvxODUNKSF3IRBII+GWO2MqWgOMWdYJ9Hfhg/9dGjI/yoOR1hOKJbuSRbVM/63LgJ2FFlN+oThbg36wP7uKG1E5MN+1vNbZXGOhc0QFFw2oqyiIwiyLmxmqo+BSELQ1lJbFmdzIywqQcrII3HPn4WXbJnRK/+hLQuOigpQBXU1lZCW+iUPuJqJwi/HOnjEYeyVhYHhyMcakY0OsOjfpPMKOVDOBM8ZQBvoGJ9DdP4aZ/wRiJ87MCvBUMIdnc/NisQuATwLKUE+supnu8EJIZKukMCtyTNgAZYAUExKTh7KadmGYdcfsjXrBTcrAmeMcxhxOJj2MsSSQMkB2JH2dfacYDxIvwtZwbXuIq1nXmqRI3ABZ6w9T0hH5xv01CVkAv+7cAHliN164F9dK1ECUXwVV61Z6g+KeK3JcYZsAR50aRY6vHJCIgR3KU2DHXcFXQSUr+dd1/7FfJeN5GzbgxWoDLzkDXjbtjB8qDuhs2gOylMThyHGxBtS2y5M4AKub+EAO2PFXoaW6tj1hNdPqSEIQe3VQSITWgIOVNr6J9sXKo4OO2jg48Zn49K0yIZSSCVkSv6MvT4gvSVoDCttk4bPfFDIyS7BTvjXUydGT1SEZpTQs0f4V2GfRSYMAlpQJgfEa+2DgmQjyu8Bw5xMUEwewH0ILsdbdUgg141D+6V9gqi16B6c1MD45C/IAFn6YjdaMVHiLOIAxVrMOoLryNApjf4bejjGhs2kNkDN8HZpBvpvP5u5DYr4bkn9zxfcFLyO9yAkXft+Dy8UOyLxnh2ulNsguZyGn0gq5f1kiv9ocd2rMcLfOBMXEEZnDM0TpQ0NU8vVQ1aCL2mYdcFu1wOvYiUedGmjsVkdLrxra+1XQNaiM3hElDI4qYmRCHju3T6H0TCZO+5fjoE0bDrCW3njSpEhR1/vedciNvo6YgHKEv1aFD3xq8R4RO+7BQ8BePvWq83FswQHrDrhZdMHRuBcs/QGYECnXJ1ZMU2USKoozUJATQEoKxAFQChPTchiaUET3sDJa+1XB/1cD9e2aqG7SRTlfHyX/GKHggSluVVkgu4KFKxw7XCx2JBbGGkqKsyDFT87ILkqmNXC5xAHSAbHUpREcCd2QCOw+FQbL8A9hHxEKl6iT2B/zLl6JO4Ejnx+Df8LbCEwMQHCqH0LTjyLs0mFE/nQIMde8EXfdE1/fdMe5225IK3LGj2wHZJXaIue+NfKqLFFEiL5HiK98rE9kR5fIjCaVlfYBVfQR2SAzMUUIn5+TggaxcS44kF7oiGunZmUxPr0NI5MKGBxTRN+oErqGt6NjUAUtfWpoJD7C+V0a4HVqgtumhdoWHVQ17QIpqOyRATg8IxTX76ZK6k6tGVFiFrj5txVyKq2plc760xaZHHvCmCMu/LGHMpla6ILk2674Nn8v9Z38xQ0PxOd4oqjOdFEuYwOLM56zzpaBzU7IVga2MrDBFfgfAAD//882XnYAAAAGSURBVAMABz4AZ9aWb7YAAAAASUVORK5CYII=","to":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAABU0lEQVR4AexWPQrCMBR+rSKCUBFxcXMUBFdx0sk7eAOv4AE8gyfwDk5VB3EVBEdHF0UtiCBKzSskgwkBi760mNKPpu81ed/PUjf80nX2/XAOQA4XUn5pBQSrFay73Qi74TCRUrUCHscjXGazCNfNJn0CEsn4jZQ2gbdvE/kqCVhWKsCx7fchZLQRp+lU1LG/H49Zx/wtCXgcDsDxDAJwGEdEeL+LOvaftxvrmL8lAeYpfcZAEtBmCXDUJxNxWqnXA17HZ3UwED2TC0lAtlwGjoznCW5OLifq2HfzedEzuZAEmCQTZ7ZWADpd7HQAUWg04pz/8z1aAV6rBU3fj1AbjX5OJs4ArYA4B1LvcReOA98A/vRRk8d56U8AVaQZNgHT6f1TAqa9Vs+3Cah9oavaBOi8Vk+yCah9oavaBOi8Vk+yCah9oavaBOi8Vk+yCah9oau+AAAA//9VeBU+AAAABklEQVQDABnp3UkG1toyAAAAAElFTkSuQmCC","tt":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAFDElEQVR4AcSYW0iUaRzGn5nx2JSmroeLIDtA3kThRd1kuOWGSpALpW0Huki7qS5aZbOlVi+GVXYMhAq2A0pkQaFl0JpuKRF6EURGdZESpG6Qo266Y5OpjbPv88aI5vt936hzwv/NM6////ub9/yYR2w2Dz92u90DmHSjoqKCTT2uO3c8PWazpwcIeZhHTp+G8/x5lJSUoKLid+h9Tp36FdXV1ViSl4fvbtwATCaE+mNmB4aPH8fo5csoLS1FWdlvlDTjxImfUVNTA2tBARKuXtVsF6wvJACLfThyBB+vXUN5eTlOnvyFkmYUFhZJiKUHDyL+0iXNdsH4YhqAxf49dAiumzdRWVmJ4uJiSsoQCwFeiGVFRYg7d07ZLhjiLAB4PBjatw+fGhtRVWUXnSzU7IMXor6+HjHHjmG53a7ZNpBfzAZgpakpDO7ejbGmJly8+KchxN69P4EQsWITiC0rY4agxlwAlne7MSB2mvG2NgmRn59PVRlu0ZYQzc3NWC7WT4zO1FMmWKSoBmDSyUkM7NyJifZ2XL9eh5ycHKrKIERe3o8gRFxVFZYdPapsFwhRG4DVxscxkJ0N99OnuH27QRdiXLT1QsSLc2VpYSEzBDz0AUR5z9gYHFlZMHd3S4iMjAyhqv+8EO1i1Li9Wg8cUDf0o2oIwFoelwuOzExY3r5FU9NfMILIzs5BR0eHPOiid+1iioCFTwCsPjU8jP6tWxH5/r2ESE9Pp6wMlwAmROfz50gU22yUzvpRJpiH6DMAc04NDcEhIKIGB/Hgwd8wgsjK+gGdL14gqbERUdu3M4XfY14ArO7u75cjESN+ZUKkpaVRVsawGDUJ8eoVku7dQ6TO+lEm8EGcNwBzut+9+wohdp62tlb4AtHV04MkcVZEbN7MFH6LBQGwult0iNMpKSwMhEhNTaWsDI5EZub36O7rQ/LDh4jQWT/KBDriggGY88ubN3IkkiIjDSEcDgcI0SfWUbI44cPXr2eKRceiAFj9y+vXcotdGR8vIVJSUigrYxpCrI3kR48QprN+lAkU4qIBmHPy5Us4tm3DysREQ4je3l45Ev84nUh5/Bhha9cyxYLDLwCsPvHsmTyx01atkhBxcXGUleGFGBQXwWQBYUlNVbbzRZwHgHG6iSdP5AUwbc0aeU74AjEk3tUcCcuKFcYFFC38CsD8n1tb5VU8fcMGCWG1Wikro6urC1zYTtFGQuisH2UCIfodQOTE5/v35aMofeNGee0wguBh54yNBaeTWWfqMfe3ERAAFhm7e1c+TzO2bJEQkWKrpa6Kzs5OEGI0IQHcnUwxMapmSi1gAKz26dYt0Cjg7ZXvCV8gJlavBs8Jk5hWzGEUAQVgcVddHWjZ5ObmyveExWKhrAyOBG+xk+vWyRPbFB2tbDdTDDgAi328cgUfhHNBCD5P9SD4jiCER6wf3p2gM/WYOygALDR64QKGhXNRIBw9QphM2rYkIfg8xaZN8haL8HCmUEbQAFjdefYs/rPZQAhaNiaTNkRLSwsIYRKbAN8T0Jh6QQUgxMiZM9JMLhKOHiGoaYUXInzHDvmyg3lud+cqWtn8qHvNZELY7X/oZiYEfacIYfGoHPGQALDH3JloJvti6zc0NIAQ0Xv2SKOA/++NkAGwAzwjaCaXClvfyBEnBA3lJfv3z3LEQwqAGWaykSNO4NraWuHVFsF6+PC0Ix5aAPZqhpls5IizuRdCOuI2G/4HAAD//zsffUoAAAAGSURBVAMA/spSqBxjDWAAAAAASUVORK5CYII=","sh-ta":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAH1klEQVR4AeyWe3TMZxrHP/NLMrk3VRFEm5AKCTaroS4th7PtYTlUV1fkWLTWYgkt7ZEetKo9Erp1cLDZygoqIaJbpO4WcYtciBIjkQS5bCSRi0SSmcxkbvv7TRiJGYwekv7hPef7vs/7Ppf3ed7rI1yfucior1MadTq9cenqfUbBb45R1m12CzSoG42KkVONqS8HmXBpwDijVJwDPm4h5+AfZtyw5Zix6Ks1xrSO/Y3l2/caYeZzhaC8nM3lt8ajzszm6wVjOLXzU7w83Xna4ufjSXrMDIbv2Erlfw7S5+g2Okwa97RmnlpeEKJX4zF0AFdHTKV03VaG9PdDcfhLRgwNtNlY6Nj+nA1/B92UMAQXZ4LO/YRLUCAxCedstvFrBYX+IWs4MvhdXo+OpHjlv8h+bwYeOg2Hts5l5efvY2cnPNK2o9yeTRGhrHCtonDyJ3SeM4XAPRvROjoxce4mZiyKe6Tus2IIjY06wpbu5MP9N/A9HIu28g6Zg8dTm5RC+KwRpO4ORyaTWZ0v5ftpDNgYRUX8zwTs/p4u4bPIyS+n7+hIfjx40arOsx40L+/BJAV9Z2ymdlUEr4x9h2sfzKZw8XcEB3gjrbS1iZVT5yJGR1DyT3gMH0TcnnTR+Qhy82/TWkUw3IziPkrSVjLk7UC6rV3KwOrL+EYuROZg/0hf+uWdpE9SPHJvL5PM5D8NoOHaOrM9ya6J8RwrIWvMX7EFDVl5Zjca/1dqk45k16z0nAihLjkDWyD+FWYXDA1qm3Qku2alhwi53I5XX3Vn5EhHPvtMxurVGqKi9Kxfr2X5cr04ZmTKFPD1dX3sQ2K+Aw/Zf25dQZAxe7ZAbGw9J04ks3fvPubN2yUGcwRV/X+ZM2cn4eG7iYzcR3T0QZKTzxEXp+Gjj17C3t7SXcH97X7YAjt3V3NQgrOTTTqSXbPSPcLLy4Xp04sICYnF3z8VJ6cCcZWr0WqH0K3DUJLPuuDgUI1cXibyiunSJY3Q0C2sXXucwECPe1YeNEKv/ZuxBc69/M1a8tc626Qj2TUr3SOkF1kQVPd6Dxr/7qeQu+morJrNqlV+JCU94EmUg0MdgiBmJVKnGQQx9+E+3HrPZ0fieRPbqNZw4+9LuODzFhgtFZuEjJSsiSGt/RsULIzkh4RkxPzIbE+ya5JrVhkMMvHl1TUbaSLfHFDB9bwqGhsRd+MlEhLeQ9UiToPohqUf5kMV8Honftm/mEnj3kSdV0Dm0Amosq7jHr8RjVbfNMtDdW5BOd4LptPn+HaqD50keMNaLm6aTo9uHR+SfNC1t5eJZ/lB/z6Vnw9q2TGKi5cTFnaJZct+RqO5z0UMGhwdZTxcTAFMmzCYjH2L8O/mRcWORK4Mm2j6mBQfz6ffzBirkUuGBr7/D3YdyMC1by9T/iP37kh96CxOzRvMhNHBkogFpCOk0bSjvLxnC1RU+DBqVFc8Pb2oqekuHpee4k40l/EW74WVALZ8N5WYb6fghIG8aQspWLgC3/VfE2Hvw1/CY1E1iHtq4UbTgEZMQ0LnxTD981h0Ts70TNiAz1fzKZy1mBXCLTZ/E4K1klESycHcsy1wWZlKenkc2tcukKT4N4mZh9h/5Z8cyDljkjtTuAOtwc3CnPDhB4PE3/MGmUMmmFr37VG8u+nCU2WSW35M4fejIsi5eZuOM0LpcyyO2tNpBEett5hQpzNSeXg5qt0zuaNzo+JMNDWCJ3JHR7p28EAjuIkZrQd3yooou1FESVW9ia908KRBZXl3hMqE/VwZHorrG724uuBT+odtQ5FTYjHxkwak/Kfv6AjTkXL5XYDpSDn39LNQk5LHyqIsquSJuMT/gX6KJajKciktyOXqpYuoa8qoa9Tj1DmIrr2DaOfVBVPRasV/Qm0im1dCh9B9DLwdjP+maiZNjEWZ1YAxX98Czk5z6XPEiUE1g0zom95RvFSzxB1Tt5BT52iYOCbaxLNznU+PrbXN5zLRDQ161Pae/LHKgPZuCtd8oaHkAI6e3Wnn2xX5y11Q6huRi0fS3s5OvH8mNeqr76JWW9mBJnbr1Q0NWtTOPqRWgJcW8hwhK+cb7GUGHMSf1k5sPcXXRq2qpfBWCaW3ihhzLAbHwlxqay3vo+kVaj33m2aqrG5PYyewF+9khytQLKuhqCCbm8XFlFbWopTZUVRcTlXmOdQpG7nmriGvXEldnabJQLNaaEY/gXx27MwsA/X57uTJQekuflxGOLrzb6SdTeHKmT2UZl0gOzKYjG0RnIhfxdYflpB+8irWSpsEUFik4ryuNyXOMExcVHflXKq8/8yltEQqzn7LoT1fkOLRmXI7Hzp6eaMPCCHzlyJr/tMmAUieKK73Q1PvgEJ8WIbdOYnbKwHIxs6jZOxSqsetov34Zdz+cgGKkDAK7rZHpTJIahZoswAKi7RkKiazl09I7P4FjT1kGHxdcHL0QtNOibGdDPsyPX7iHbl0uIpHlTYLQHIo9bwDZXkOuKrKsbvrhM6oROVaiXtJJ/R5d+iUpOL0rkIeV9o0AMmxPEUtpYfz8LmWzcv5zig9isX/IR2PlCoyjhRLIo9FmwcgeVeQr+F0fBlux2/hvx0q1qlQpFZKrCfiNxGA5KVOZyDjXBWpR29TX6+ThmzCbyYAm7y1IvQiACuL0qpDL3agVZfbymQvdsDKorTq0P8BAAD//xCWi44AAAAGSURBVAMASGPVZvrNm/IAAAAASUVORK5CYII=","tn":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAEMUlEQVR4AexXaWxUVRT+3put02E6U2Y6EhVr1MaEhJaqYIW6VMoqJgLBRCkSjSSGiPEPJQRSarDSlCgiphJDWaQmKpsaq6QBwUBDoNKWfQtr2drSBWbazsybeY97zwwvLH/Ku9OQJjPJOfc7dz3fOffed0e+Bo82kEXGAP8lCTzqBCYzkMyAYASSW0gwgMLDE54Bc+5wOBZ8BvfWDfC1nYLv+nG4N6+DY/6nMGcPE3b4/gkSRkDO8MC1sRLehl1wlpcgZepbkL0eyI/5kDL9bTgrSuFt+g+uqpWQPOn3+2HYTggB29TJyDhTD3vRu+RIpPEwupevQtf02egYNw2BJeVQ9tVTm/2jmfCxvrZJY8kWVcIETJlPwl29GpIrDWpLK25+MBc3XngT/uIvEPxzO7RgCFoojN6Nv8G/qAzaLT+kdDfcv1ZBHuIT9R9iBCTA/csaSKmp0PwBtOdNIEe5V+YXc+A71wDPnhraUmmVy+H8ajHU1jYgEoHkHATX2u94VyERImDJewlcuAddLPLRC80cwlqQD+/+WshDn0Bw0x+AolA9V6bnngHMZg5hm1QIUxazyTKmZGPDYqOs+XkEIsdOIvT734SRaodr3SrAZCI7cuI0/AuXEuaRD+/ZF8NxbR0zKo6MFYIEXqZVw7vrqOQqZcp4mDKHcqhL9zeV6Cr6BC2+56FeuqzXc2AdE5uDYyMiRqDgVVozvHsvlVxZRgynPR76Zwc53V3BsqEBwZ83wzbuDaTMnMG76WKJZ1GveEggRACyRMtp0SiV9ygp1nZ3ndYbvNskLNmsVBpVQgQijUdoXUtuNpVcKU2sjh1S28SxdL06iueBE7XPmYXouQvoXvYt76aLcvCQjo0AIQJK01Fa0zIyl0qugn/VInoxdhtxm4vzy0Vw/bgC3qN1sH9cxKt0UeobdWwEPASBB6fvqaoGVBW28QWw5McPY08vbn7Ioh7fVrzNsfBzfbCc4dUx/3b0Vm/SbSNAiECEZYDfMJBlpG9ZD/nxIeRDeNdetI+eiCi7ce58J6iBfQ9C23cC4TCZ/uJSqFevEzaqhAjwRf0l5eSo7MtgD7l/YZ8Vew8pBxrR9vQItGbmoD1/Mm4MewUdE2bAOnoUYLVCqduPntXr+RRCIkwA7GbpfIcd0LPn6eXp+qmSiDgrltCL1Jz1LGyFr8O1ZiUG79wGKc0J5UADOt+bI+T4ncHiBNhM/DZqy34NPT+sZRZgZreSY/48uLdswOAdWzGodAEsPPLsDRQoWUbbS22+Sn1FlSw6gT6eHd5bc4vRPrIQgcVlCNXUQuvohNp8BcFtNex1WgpOMrD0ayCqIlG/xBGIe6T834RA2Qp0TnkfLZ4stD6Vg65ps9n/g+8RPXkm3itxRcIJJM61vs2UJNC3OPVfr2QG+i+2fZs5mYG+xan/eg34DNwGAAD//1zPVJgAAAAGSURBVAMA0G6jCFmOU8UAAAAASUVORK5CYII=","tm":"data:image/png;base64,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","tc":"data:image/png;base64,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","tv":"data:image/png;base64,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","tr":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADz0lEQVR4AexXaWgTQRT+spukNemRxGCJYlUElXrhVfzhiYgoCt5oq+KFIrSIR8Wi1gvF+6BIFcQTrIpgvX6oeIB/tOKJ9Si1J/YyTZueabKbmJk0a7dgs7tJkEIW5u178968ed+8nTc7TIUuwdOTG4Me/kQA/O8ERjIQyUCQKxD5hIJcwKCHhy4DDAPtxAnQr1qO2G3p0C1ZAM3wYUEHGMhB0ADYAYkwZh9H3/Kv6PPsAYw5pxF/YBdMV3KQkP8Slq/5iM3YDFVcbKBYFOmDAhA9eyYsH15Bv3YlGKOBBsBXVaPlWi4adu6FdUEKGo+eAWMyoveV81APHkRtQkkUA9CvSYX55mUgKsoXj9uNppPZqB4xEfWbtqA5+wIcT56j5eoN2DP3wbowFZpRI6AZNsRnHyKqCEDU1EkwnDgEqNVCGNbFK2HPOgSPwyH0dWXa7j6Au7EJqo5sddUrkRklg+L3ZUIVHS0Mbc65CMfjZ4LcHcNXVkHd1yKYaEYmCbwSRjYA7YSx0CaPE+byeFfUfvCYIEthXAXfAJalpvFZO8Em9qe8EiIbQK85s0TztN7Jg8feKOqTIrBmEzVT6XUweSsXEdiBiYhJ3wi2U4ZIf3dNNgB10lCRP+e7jyJZquBxtENliPdWKBOipk2C5csbWAryAY4H+cyk+pENgE3oI/LtaWsTyVIEzZjRMN+7iX6/fsC/B9hBA9CaewdkP0nx4beRDYCvqfWPpW/G5PsUqCCRuD58wu/5KbDOXw539V9/dG/5y7JEX7IBuD4XiFzTSUU90gRGw8Lx9AXcNhu4wiJ6dnA/S2A4nCXNQYeVDAC+EY4n4nLZa+4sMObePqUMytsaqLXHxcG6ZBU9vcnJbd9/hPZLJbIBON++h/P1W8G/SqfzrtpeQZbCaEnt53lqWp+2HVxRMeUJIWWZvKU2RqphZ7uGjD2iE1eXuhRxmVs7m/yT1yaPh6ukTNA73yurYn4HjJ+R8yaT2talARwnDIvbvQOGU4cBrVbo68roli0CX1sDT3NLV5ViWREAMltb3kNYU9YB7e1EpC1m41pvLX8D47mTiEnbgOiZ00F++gxHD8B8/xac+e/Al1ZQ21ARxQBIAI5Hj1E1ZjJaLl2Hu963Kckpql+dChp0Xi7ivHcBvq4OdSvWgysuJcNC2oICQCLhy8pRn56BysQk1M6YR8sh+Su1rdmE6nFTUJWUjKZjZyF3cxLfUlrQAIRJvPcBUp3IZabJey9ovX0X3PdCQR0uJnQAwhVhAL8RAAEWKOzqSAbCvsQBJohkIMAChV39BwAA//8PcOUDAAAABklEQVQDACDseujNqRaiAAAAAElFTkSuQmCC","ug":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACl0lEQVR4AexXTWgTURD+uvmp1aSJv8R6qEqRErSpwfoTFFJSQU9Je8jFQxVKonj25MVeevFUTbU/EKRiES+hFU3ZNIqk0BJE1KREGqS5aA/GQExC2PwY8x5UA4VK2ZcugV2Y2ffezL75vpnZw3BAU6WRpUoADf3IBKQun1wByStQWa+gkUVuIclbSGoAYuPLLSQ2g2K/59YGdoG1fLGrEXOfwGePDatj1xC7bQQ5Yx2H3Me8hUrGC2ibDOHA8DNMr/9CUsuhY+YjjkwtotTZIzbhm75nSqB8xoZ2zzxaT53FjJ/H66UMfp93QaVSQXuyB+2PFlA5d2UTCDEHzAgUNXvRdncKarWa4mmqlGEydcFisdA9UcRmuPMQxRYt2TIRZgQUXRfRvO8QBZXP5xF4H4ZWp0Mul6NnG6r54GEQ34292DczAsqjnVAoFBSPIAiIrcQQXYli+cMy3r5bQCaToTbiozhmpGsWiju+JICFTHwr/cWj1+sxMjyCdDoN7xMvSs/H8PW6Fbm1VeozXvVlEZPcwawCJNvlcpkCJMrpdML3wgf+FY9PBiPy3xNI+bwgPpFohLgwEWYEeJ5HIpGgoLLZLEYfjCIcDqPP1gfrVTtUuv3Ybb6EeDyOQCBA/ViobRDYOpwgFOC+5UahUEAqlUKvtRd2ux39jn50m83o8MxCa7kM100XisV/7bb1rf+3MiNAQgWDb+AYcNCf2WAwYPDGIILBIEhFci2t1BYKLRJXZsKUAEHl989XM96NIdcQNHs0UCqVlIjptAnERnxYClePaexHJIm5yZeYvv8Uj++NY3ZiDsnoz7pMfhzLbEhxl0xAiqzXxpQrUJsNKdZ1mcjIpLRTIreQFG1TG1OuQG02pFg3fAX+AAAA//8CQzRzAAAABklEQVQDALhRmgcWEL6vAAAAAElFTkSuQmCC","ua":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhUlEQVR4AeySwQkAMQgEJdVdB9fOlXXdJRXsIyysCBPwI6hxxlXvvyfHquGPBboFYgADJgFOyARol2PARmg2wIAJ0C7HgI3QbIABE6BdPt/A/p6aHPMN2EfY3ODCQPNPxXgWEGBiaQzEUItBGBBgYmkMxFCLQRgQYGJpDMRQi0EYEGBi6QMAAP//r7LdpAAAAAZJREFUAwAAjrg5LtDxXAAAAABJRU5ErkJggg==","ae":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAlElEQVR4AeySQQ2AQAwEezWBDN4oQAtvBFABiMNRsXBkcimXLEl/7F46U0+zJHNtS9q5lo3b5J8WqBYoAzIACeiEIEAclwGMEBbIQOyH5f2UjQzAE8ZxGcAIYYEMQIA4LgMYISz4YAC+NCiuBQaB7a7FBiLCWnNrRePdq/70Ry1QLUYGZAAS0AlBgDguAxghLJjewAsAAP//YTbltwAAAAZJREFUAwCle6CncsaPSgAAAABJRU5ErkJggg==","gb":"data:image/png;base64,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","un":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAE8UlEQVR4AexWS28bVRT+xmOPPX7FifNyHiSNmjYJBVJVkQolVRWgFHUBLGANEo8VBYHEig3dsEFC8A/YUCgrQAJVbUnLAlBboVa0TZq2NC/n2TiJHb9ffOdCFlnOjAWKZGvuWDNzz7nnO+c7D9fJL+5Wd/NyYZf/6gD+7wDWI1CPgEMP1Cnk0IGOxWsWAa9bU8a0htwY7jbxWKeJw30BtZ7eG8QTXSaag261Z3uvenB4cwzgkSYDrz0VRblSRdjUUeL/9bkstvJlaMTkN1y4tZDFjfksIvw+GPOhXAVePxJFV6PHofmAIwDPPxrGiQNhjN9Jwe/VodGcXLGKBhoaXy9iZq2ACRpvMDqHevx462gLElsluHnqJcq8cKABooNiti+qsifb3+rFUMyEpmlIZUvYypWxp9lArMGDXLECiYyLiHRdg9CqM+JB0OfCqyNNKJSqWM+U4ea3oQ4TosueFbAfgaP7QhA6nL+dhGnoaKfhK6kShOddjQamEwVkCxVs5Su4vZjDLJ9/v58mSC9G+4Pw0PiLE0kMtvswSl3/KQCNp4mRU8s5hOjVzWwZTQE30jRW3pnkfR+j0cKklXV8MIxoQMdauoQvf13F4mZRgTM9Lkws5dAbNSA6qdbyZYtC/W1ebJI2RWZjIl1WXs7Q25LEHaTK6Rc78N6zbRjZE8Cb5P3bx1px6pl27CXtfB4NeeaJRGaDNGIgFKB9jIRl6ylgC8D+Nh+WkyXEN4oI0ttSMvuavRigEUIrg1aVCG6Tkfn2WgKStDpPYoFipfKgn/Ii4/e6MLdeQJL77OYB1RKGxUsMl8TsJtdzpQr+jGdxbyWHl4YjWCI9Pv5hAeeYGw9ZccYGwsjS43kmrlBndi2Pu6TeTcoU+a4jYqDR78Y8gVg0Q223BaBSrSLAsplhtcmQ9x+djOHDE+3oIZef7AtCqPHXap7UKkP2ztDo+EYBP08mVTL7GLVO9gCpVmn2C9PQQJXKIKs3WwCE+1kan+cSGnx3fR1XHqRpLHCwJ8DE1iGefmO0BY93+RW1pDoJvQSkRCkacMPHJM79Gx3RCRs/lw0ZdtYcwr5/SudherxKJT/d3MQnPy7i0p0kUuwJZBZuxXPMlSK/Qu3vjXrhZUIYbGwSmSMsp9I3pPFJqVUbLd4sANipeZyG6uxUjX6ddT0E8bD0gT9mMuR8BS5+O8sEPs18WGCySwm9Op1WpbYt7IH0EZmJpJldnkrtVG7hyTaAa9MZdtQKyhWorhthIvo9mqpM8xwjBFiQUQpxfXpuCe98NQuhSYCVR2aiWIPB6qRByq/Qz4LNO7baBiAHf3Z+GVE2q3sreUgJHWPDWmXlofMhXl9n4yqwnGp80cmKFWckju0PQXKBTIKA/vzCMkeP6g6jrDzYBiCHCM+/uZrASG+Ac5GPs46OVw41Yrjbj+NDYfS1eBEjXWQuMpmwLx+MqD0y/4jxZ66sqcQXXXaXIwBy6H2Wy/fPzuHy1Ba9XsDYQIgATOjULHVeaCPeFlDPDTWoPeOTKXxAmQcPC6LC0eIxjuSVsNDp+xsbkGHt3a/nWOuLrEYpNefIrPMLwc0k8jh1Zha/caCTvWmOHkrY4a0mALZtEGMFzAVOmVnW9+33YuzFiZRK2EkOb9vva/FfUwC1MMiqjjoAqx6r9f56BGrtUav66hGw6rFa79/1EfgbAAD//wPgSrMAAAAGSURBVAMAUPd/tzBGQo8AAAAASUVORK5CYII=","um":"data:image/png;base64,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","us":"data:image/png;base64,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","xx":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACcklEQVR4AdSZjXKDIBCEb0k0ef9XbdOZRMWyMDSaovyIrXF6NSJyu/jNiYn6/Lx9PR7d2PfDWwU1325fH+p6vQoAGcdRTif1FkGtAORyuYgSs53PJ1EK0nW9NWKaDvlH4dRIrdRMkYr/GEopYaNBSbTWcrSNmqiNGqnV6/sxwAYA0jRnY2AUdmbbEYJatB6tNgAzSTMD/sz5IEiFkPEa/T5ogCd5m2jEuf97pLTBmLmpgVqoKRSLBtgZ+B+kKFwvIENd01g14Du6Wdi/SplKbiuhMhWROX3+tX2SAQ7A28hB3ezUR0pbZHpbCZmLOVMi2QAHA/ZByk1KuMow71pkGfAD8U7wNvOhwkrh23P3Jci85igywEF4m2nEzZ5mU1aUIvOapNgABwLKkHKmy5Bh3mlsMuAH4p1IQaoGMj6n31cxwMFiSDlkuuwqw7HXopoBJgHCSD2RaezSnX1rRVUDXpRH6vHoxbx42KU62/z5mvtdDDwF5len57Vpn3Yx4JFp21battl1eV7VwFKVIT4pVSptzue9MgzML3w9ilWZWJV6HS/1uIqBYRgsJk3TrFYZIFylUsWG+m02wPUQAFvfQwlCbTWRKjZAZLqu/MFUC6kiA6nIhGZ/2gbAvqhr8/bFyjU9l/o520AJMjExW5BKNqDNG9MWZGImSpFKMlALmZgJIB+pqIE9kIkZmSO13nvRAJHhQswNtthtffQNZ59I9eYZs7ymCirzyHAdA8y/ytugKftSII7ULwNERgRZDybZeXMU+O+l5sl+DEyR4e8E827/f7SElDVwFGRi0wTg14NP3e93GYZRAJi9fosA3C9K1P4NAAD//6buLYIAAAAGSURBVAMAp6S22mw2jZoAAAAASUVORK5CYII=","uy":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADr0lEQVR4AeyWX2gcVRTGf3Nndza7k02zu7bFFpvQLWm1prEmwTYaK/gntkVqRYkUfRJFUBAEH/TNBxWx4ouiL/bFB1vrgyA2JKCSVI2RxKQ22FCT6GqbNjTbuH+zOzuz48zChi6pkEA6k4UOc++duZx7zvfNd889I8wqvwRVfi2LQDqdJJPJrEmq/0sgHo8zNvR1CfT0xGmmz/+IUUhwuu8jisViaX4tdEsIpNMpNC2LaRaJnz9KIR/HzE1DfpKx/ndYf0sdQgjy+YylSrqCQyqrI+094WhbQkBRfPQcfxXZuERkczsTAy9S1CbRUueQMn34FA/zs6P0fPEaXq9SQcCNlwoChmGgKAr3H3yD0d6nUDxJUrO9SAujiPQ36NkpCulxzvQd4YGDr5NIJLC3mhvAyzErCPz0/XHGhz9j/vIQm3Y8R+HKlwhJopibQs//i09tYOHix0QaD/PX2WOc/fYFZmK/ln25MlYQuHffAQqZiyT/fJ/E5FvkpSayOQipeSL1ElfnYiTTBqnYh8gLg3Qe/pTmux9eBB4MeDAHux1tiwTs5B0/8zPCuw7d147Xtx4t+4cFTqJ/WOO7oQKykFACYfyhdgzfnfw+fILfRnqtZM5Ydu7cohxWkiQkWS6dMB6PgqTcZpEIsqdFYX+nwuMP+mjdqaDlkpjaPxiGjpAFkkUKzLIbx0dRjqiqtTTvfoTtLU9YSTtCLjFiKXCV2KUCsRmDqb91LswWLAW2W/kwCwsjFHJz7GzuwF5b9uP0uEjADjz2Sw/9J58EOUJw89PU1XrI6o1W4ZLQigErH0xqmKAu+ibh6CvUBBsY/KHPXlpqrteBLdvuoe2xr9jS9gFzFwbwb3qeYn4aXyCCJxDF0E2Ujc8yc+4T6jfu5Y7WZ9jTeagE3q2uQoFwOEwgEKD/1Lvc1XUS2d+IXNuCoXahBFtR6jvQjDC7uz5n4NTbVsXWkGXZLeyluBUE7Bld1znQfZT6Dc3k8gZi3SG8ahNKsInb9x3jyuUpTG8D+7vfw7a117jZlhBQVdWqxn4MqyrPp2BXx0uImij4tuH138qG6BEkSbJsAiW1rgUfdLMOXAvEfra3xn0PvYyQa9i6o5OtTR32NLvaHiUUCpWe10InlgNCVeuso1JdjqnjNssi4DiqFQQUTv+/r3a8FSiwgs/ioOlNAg5+7OuGEk7/v692vJtb6Lq6OjhZ/Qqs9rnstL/qV8DB7XpDQlW/Aqt9Ljvtr/oVuCEb00GnVa/AfwAAAP//kCzxJAAAAAZJREFUAwDd9Ku2v2CivQAAAABJRU5ErkJggg==","uz":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAC10lEQVR4AexUTWgTQRT+dtM/2xqtJbaK/dNAf6zFVptUiRdbD4KK0IOgiCCCvYhHD9ZTFS9BRU+K4EHQQEQsqFVU2vqLwaZoLhZTi9pDSNpK0qY2adM4M5uuwWY1DZOUhV32vZ33vdk3M+9980RcfxRVs4j4z9NsWIXj1Ruwt8wAoz5fmh2VPn/risI8GcrVCShZkSPb8T4Z5DBQPECejhRnVz0ummrw8JsXPT98cAem2ZJigr9yRAH21kYU52axOee2GmFtqWHjlVk63GtrQoFOx2yeKsFWpPAddeVor1qHQ8+d8M6EJTCm51kFiCJvDEKYgKbudxgPzTGoc+ALjvZ+YuPJuQiaH7xFMBJhNk+V8AAU7NpejUuur2RDswrrCQp4ZmG610UrNhTrUZitwxvPz0W+eOBAuQH32xoZRCnUt8+MBQqdaajETctm5qMUerXfnDkKeaZDbOHS/Fz2VVJDgSDOD7qZm1LosmsEEzEKPR4dw43Po8xHKWT9OJI5Cnl+hTBMLqyldA3bgJIa8gfhHJ+U3d3ksi9cC9fEFBxj/j++7155zHOQkEJ0gcMvBnGipgyt64upKYuJtFVmRKMQogJkm4CWkiKipbeIdKO61QWSQXT8PGJyexUP4PD5UW9/iVNbKnG20QijvgA5pLXaSKs0GfSAIKBz2yZc21kH+tC2e3t3A9bmZVMTV1pqcXVHLRvryX2y72mCPltqsQzkpBQPQONTGh18OoALhOduwvdwZB4bbX1w+ALUjS7nMMykdVJjhviq7vaTlit1rWP9LrT1fKAuBGYjqLjTS75Si2UgJyWefPYEahbRevoI1CxiocUMNcs/7wAnmqY1jHaAtKY3ieBaBZJIUlqnaBVIa3qTCL6ECiQRbRmmqP8AU6/fQ80idt3qgJpFtLXnQ82i/juwDI2D65JaBbimM4VgWgVSSBrXX7QKcE1nCsG0CqSQNK6//AYAAP//q6b/HwAAAAZJREFUAwAWosCnmqQLJgAAAABJRU5ErkJggg==","vu":"data:image/png;base64,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","ve":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACbElEQVR4AexVXUhTYRh+PLo/3JwF5Rq77E/D1gbZlbcxiKYlQoRUICyT6KIgEFIh8KqooKChE6m7smYoJBFEBhqS7uyiMhCUOEG7as0Cd/brOWfsRifHb98OcuAb+875zvvzvO/zPofvcPkF5PW8OOj8xwjstoBMAaYA5QTYK0Q5QOp0pgD1CCkB9K9A1YV+6HlpooCv9RA8TQfgctjgaqhT9r7Wg5QvS+n0ihCot5nh3G+D3WrCnjozRobaMP86gHhCRHxtXdpfxfCQX/HJMc59VtRLcaVbIrNWhADHVWHl4010nG6SGk7iwdgsegcmkc3lIKay6B2cwuPn84rvUrsbqzO3IOeQtVo6mpqAxWzAKbcLP3/FUV1TgHs49hmhcR5JMYNMNofQy0XcC80qHYjpHFaFP0qOyVij2GguhYplILiPOvAlHECnrxHTn5Zxwv8UI1KjalDDLxbgaQtiemYZXf5mLL7pwfEjDWpp2/rLJlBrMcDd6MTl814YDdVYT6a3LbLZIcfK0+9q96D5sAPWWuPmkB0/l01gjhfQci6IK7fDSKWzOy5YDBRTGXT3TaClI4i5iFA0E9/LInDt4knstVsQ/RGDEFsjLlpMWBHiiC7FlNOpu9NbNBPdCQgUcL3HHHgyeAZf316H3WYqGCmu8rG69O4GgnfPwit9O0ihiAnw32II3JlE3/33SPwTSettiU/8FzHw6AN6+qfAf/+9xa9mICaQlxBHxyN4NhGVdpX5yyfT6KsIZGxSRI7/G4aeF7ECpBPSOp4R0HrCavhMAbUJae1nCmg9YTV8poDahLT2MwW0nrAa/gYAAAD//8iWKYgAAAAGSURBVAMAiFW9yDAsg5YAAAAASUVORK5CYII=","vn":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACeElEQVR4AeyWTWvUQBjH/8m2u8km1bp1X0B7rBcR8aAgiFC0FMG3gwp6V/TgyQ8g6E0/gkcrIp7Ek4cevHpRDyIIHtbgC1mlW3e7STYkcSYt3e5um+xOZpCULPuESZ7nmfn/5plkRv4yNxuk2WSk/JcB/O8CZhXY9RWQpz2hjEKXEBVfutVKL4B+1sLUuU6KARYsTBzwkJ9zhUEIW0KS4qN4yg6F6wviqiAMQDttQ5oM9UMnlVhv8b+KAzhjbaotHHaRK4v5GokBkIOhWRf1MjMD6IsdHFwyt7XZFyZkPdisAG2Ubv/dNpb2UXv0h8T7NGxsYwZovyli9aUG5ZgD9US/KUe7Q0Jy+/2hOJoXWBLMB/vgt9mksGVtyGu90mBcq8IzGbrxgN+P9+L7zTKzeCqDYWSa1jPnUx71CzXYH/K9hzEtryHDuFHBypM9MZHx7sQAdAhvJQfjegXNJZ3eRpr1roD6eQL8vhAZN6qTC0A4mCehQdZyXCWaz3RQ4DCHw4UfABEjaz6UI13S2vlPz0c7e8f3jAEQ37k2TzavXHRcGEP2ieio0b1cAQZnd/U5+UpdrcA1elR0f1CPO6MrjInkBzAZQJu3w+GCjoSfd2dg3i/B/khe2os1rC0roY9eeJ6NuAEUT9qQ1ADdrxOoX6qCbnRULLVgTcaPO2U0Hk4jcAF9kSw16uBg3ADo8mm9LuLb5Src+sYxdEBg8+kUjCtVgGxi+UPdAS/bLTeA9rKKX/dmEDjRXTqf1zc+mVSLTXJ/VvRo/bGRd523aqR/q9NvyeG7sfUZa5sbAKuApHkZQNIZTJqfVSDpDCbNzyqQdAaT5qe+Av8AAAD//2cyIPMAAAAGSURBVAMAPE4baJzErk0AAAAASUVORK5CYII=","vg":"data:image/png;base64,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","vi":"data:image/png;base64,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","gb-wls":"data:image/png;base64,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","wf":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAhElEQVR4AeyS0QmAUAzEigs4uyM6SXWFIxwipNC/9h5N3jFzLemFdc+5pN8D5tflAV/r04AGIAG/EASI1zWAEcIADUCAeF0DGCEM0AAEiNc1gBHCAA1AgHg9MIDfqgR4QAVrEKqBAFZlVAMVrEGoBgJYlVENVLAGoRoIYFVGNVDBGoQ+AAAA//85HqNsAAAABklEQVQDAG5id/mC11GZAAAAAElFTkSuQmCC","eh":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAADC0lEQVR4AdSYX0hTYRjGn5055+af3NS52SrBRmqGBEXQRTAriRFERUGRZVqStJsiuhjVtNILibwxDCMsCpNCIhKFSrtSukuRIlBxpimNtAunbpkz3wMb4TbP2Tx1zhk83/m+9/3+vL+dZztjjEObuqSGYgkyFWNTJ6IpJQM5SiXk+GKo6BylCk3JBtjiNTSUlVgAqlitUMCRqINDuw5qCshEQYBAvXKzVAgAgcjJUmEBCEIulooIQBAkqVuKE4AgpGwpXgAEIVVL8QYgCBJZ6pWlAHfsdlRVOUVX1AAEkfRjGrvbOlBpyYPT6RRVMQEQhN/rxaD9MgYvXoJ/3kshURQzQKBa97MX6N9/EN7hkUAo6qtvbByuG7fgct7GzzddmB8cgn9untc+awagU+Y+f0Gf9QDcLc9pyF9+PyYaH6CvyIZ4kxHZTgdSrXugsWwGo+X3u0wQAKp40TMbtaXonR+tqUNiQT6yKs8DDINvDfexOOOhLXlJMIDAadFYavLRU9YqZvuFwHJ8f9KKqfbO4JirIzgAHcjXUrMDn2j6sn0yMWA7jB69GV7XKPvF0GvKweTDx2x+teafANCBS78X6cJLqvR0bGtvg26fNTi/4GUrTOVnguNIHSZSYi1xbX4uCt+9huHk8VW3Sdm1k83PfOxn/e+bmGQ/xMrkJCy43WyOqxEcwHDiGArftkObn8d1NkxlpxGn12Gsrh6/vo7DWHoKW9tasL2nGwtT05zraUIUADQ9spiEBFga7sJyrx6MJiHyxL8ycWl6bHJchWf5Dkx3vYfpXCmbVZuzYDxbwva5GkEAtDwtE64YY1kJdvR/gHfEBVEeZNFYJhwAxdQbzMi+eR3Z1degK977fx5ksViGihVaMVnIszETvTXlaDTOorq7WVRFDdCxJQmHijW4MtSJqq5m0cUbwKdUoNaagdoiA3wq3suEdkzIfrwqGdarUHE0Cx25ySEbiB3gBCDLVBxZj+E0af5fFxFAqpZZecfDAkjZMpwAUrdMRAC5WCYsgJwsEwIgN8usBPgDAAD//7ewEIIAAAAGSURBVAMARKPtmoIgsMYAAAAASUVORK5CYII=","ye":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAAkUlEQVR4AeyTwQmAQAwEQwQ/9iRe3T7UkqxAW4gsiwTmIL9kj5vJ5T3H07kymh8e8LdADGBAJMAKiQDlcQzICMWAnNYtOlcu+xGdiz8grrA8jgEZoRiAARGgPI4BGaEY8MGAeJNpnAeYwJZjc4wRnSvP84rOxR8oL6upEQMmsOVYDJRRmRoxYAJbjsVAGZWp8QUAAP//5diChAAAAAZJREFUAwASm1BYYj8n+QAAAABJRU5ErkJggg==","zm":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAACXUlEQVR4AeyYvWsUQRjGf7e3d+YwucTkCDkxKn4gpLASJCBa2NmJ+DdYiwhio6JBSBcLKxWDIKKlNlpELWy0EoJIooKK5oMYTS4mmphbn+HYKruGxc1sAnPse7Mz73w8H+8061X7CTZyeGzwX2YE6vX/Uy4IGuszIVCZgUOTcGQOKor6nwaY8L97Fto1HvbDNliGQMTLyvV8B38BvDBpqzXK9YrAwW9wdAwGpqHvIxyegk4BMuBvK39cAIs18H9Bzw+4+BWufIJjX+DqOJzQ+j2a79kCHp6Ty8GzrfBuM7z5CSUpum8RTk3ALQHrV1ttg1658kCkBgT6rMDvFtEOkTn5G8qaPyfkwy3Yd8AQqfnwcCe86oSRJcirXyzAgkCX8zAvkPub1Ypch8JXjCpaBXpMcwdb4aZE8LVGQ2bLbOK9QJzZDucq8LgJhgRyRCTGVTqTcmdG71NSe0kXtkXA++Ta+W3wpAtqpQbmTAkYCIVNMLoFbojItV1wWaQGBfqpyCzKjc8qk6EynO5WyQl8TkQ8jZu1JjInYECEUVBJTKt0Pihea3BYJC60wx2R80VEQyuedUXAoMvrou7VHSiq81ZEmgTcXHx1I591R2BZd+GeSunRDnheBW8VhKukI0mv2WBdytd1eU0gJ4J5MO9mvFnlFBXWCXTNery43hYZB+4WmLiUWxGl+/BSxKLCOoG07XME0lY06X7OgaSKpT3fOZC2okn3S+BA0q3tzHcE7Ogcf4pzIF4bOxnngB2d409xDsRrYyfjHLCjc/wpzoF4bexknAOp6hwj578+bP0FAAD//zGoXpYAAAAGSURBVAMAK1X8R/uX1YgAAAAASUVORK5CYII=","zw":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAkCAYAAADPRbkKAAAE7UlEQVR4AdSYDUzUdRjHP3eICpzoZYaJlxkzQ6ZHcTh1N0fa0GquQ9l0TdNedEH2Mh2r2aZSWWri24agCU5xq5zI6Rwy37oaGyW4wex8WZEuEqfRMA6DOuB6fn/HBd0RNL3juD3f/8vzf/6/5/nu9/s9z/M/fVFRkccQa/CQjofXBh70ixcvpvrrahIuJcBlBtxPryKOi4ujsrKSFZNWwCnRuAUDRDQCKtaIiAh2795NyfYSjKeN0KC0oQ8vgc5QbTYbNRU1WBusUCNajyCExYeAitVkMuFwOFj77FoSK3XYZ8NX80MTfgkoEmFhYWRnZ7Pp0zLWrIvBUw8pY0MPPRJQJBRSU1M5+00NGw+l8u42aGtT2tBBrwRUqDExMZSVlfFg/GZmvBTGtetKGxrolYDH7cZ19Cg6nY6srCy25jmY86YJ+9kBQsB1/DiNhYXeaK1WK9+eq2G/w8aiWXDlZbj2av+h1xloOnQI14kTdLhcXhJGo5GSkhJmZufygnMoNZVwp5/QI4GG69/RVDWLW9eLQZZRk93uJdB5kZmZSXFVFe9JJf+yUxnkc48E9IMfwt1QT0TS3b5CzYS/2BISEqisruaq9FSZYvDPPMlNEEQj8OelS9xav74b2nL30+y8yQ8GODcKXJKF/m2j7m8fOIDBYEC6WpYXFfGiXKsCHoTYNRcagSHx8QydMoXftm3jVylenai9eptn5sKiw3AhpY36D7K7PXfX1TE8PV0bSB1UZ3tKZmNrUhKviCJXsCvA0Mv4mkTPn8+EixeJnDlTu1eHidJh32mBiChY+An8/AbcGAb6ESN45NgxYgsK0EVGKlMvVGdbUVGBddUq8kR7l4COXQQGXgLii0GxsYx3OIjZvJm2QXqu3QSPB77/ETZIJjXPkf2cFYHh1D6GzZunXvGL8PBwcnJytEylMpaM4tfufii7EdAGlII1cuVKXCkw1gJ/yR7+SSqv5Qm4KufRwxdhstg001A4+BKQqJokx1/Rd+A4L5v3D4gZCXEmMHbAAyekqxOb/5KWlhZUik1LS6OxsVFMdYLAiF8Cv0vxiv8FxoyCYmkZ9koJ+HAvlMq5+fQZ2rWg/AfkdDpJTk7mfF4eGWKSqcFDpnxuBwI+BFTFdZWWMrR5NMOjpkn/8z47tqxh9esLWPjkJK0dbTpyRMLylfz8fJ63WFgjJArlsex5CZyAQi9+ukmT3U60bNDEC1eYurSCIeM/IjJuA+Z5h3lso5Mxe/ag+qOuL6llopbL4YwMvmhtxdz1YYCvfQhETpuGqbgYfXS0X9fG5ct5ePt277Py8nIsZjOThfgO0Q4TBFN8CAyeMKFX/+HjxtHe3q59sS1NSWGrFLSFvb4VGAMfAn1xUycBp0jgl3PXU5rYjjkZovoJ/5uAXZaKdYaZ1enlfH4GJu6DRwv6D30m0JnbN61Lo7ywEdusvsxV4G36REDl9qlTkxnhzqN8P5hGBz6wvnrolUC+5PbnUi3sfMfJx2+B/NvS17GDYtcjgc7cXvBZBjtzWtGNAYdU51CDXwInT57EnGjGfsNO1VNgk836tBTfUEQ3Am759s2Sv07mps+lLqkOJgdlFdyTEy+B2tpapk+fzpbiLXgWyEfAyHsaN2gvawQOHjxIYlIi56Okf54tvgcJBojoly1bxpK3l9A8pxkeHyBRdwnzbwAAAP//V/Z/DQAAAAZJREFUAwAtkyhfveb46wAAAABJRU5ErkJggg=="};
const FLAGNAME = {"afghanistan":"af","aland islands":"ax","albania":"al","algeria":"dz","american samoa":"as","andorra":"ad","angola":"ao","anguilla":"ai","antarctica":"aq","antigua and barbuda":"ag","argentina":"ar","armenia":"am","aruba":"aw","ascension island":"sh-ac","australia":"au","austria":"at","azerbaijan":"az","bahamas":"bs","bahrain":"bh","bangladesh":"bd","barbados":"bb","basque country":"es-pv","belarus":"by","belgium":"be","belize":"bz","benin":"bj","bermuda":"bm","bhutan":"bt","bolivia":"bo","bonaire, sint eustatius and saba":"bq","bosnia and herzegovina":"ba","botswana":"bw","bouvet island":"bv","brazil":"br","british indian ocean territory":"io","brunei darussalam":"bn","bulgaria":"bg","burkina faso":"bf","burundi":"bi","cabo verde":"cv","cambodia":"kh","cameroon":"cm","canada":"ca","canary islands":"ic","catalonia":"es-ct","cayman islands":"ky","central african republic":"cf","central european free trade agreement":"cefta","chad":"td","chile":"cl","china":"cn","christmas island":"cx","clipperton island":"cp","cocos (keeling) islands":"cc","colombia":"co","comoros":"km","cook islands":"ck","costa rica":"cr","croatia":"hr","cuba":"cu","curaçao":"cw","cyprus":"cy","czech republic":"cz","côte d'ivoire":"ci","democratic republic of the congo":"cd","denmark":"dk","diego garcia":"dg","djibouti":"dj","dominica":"dm","dominican republic":"do","east african community":"eac","ecuador":"ec","egypt":"eg","el salvador":"sv","england":"gb-eng","equatorial guinea":"gq","eritrea":"er","estonia":"ee","eswatini":"sz","ethiopia":"et","europe":"eu","falkland islands":"fk","faroe islands":"fo","federated states of micronesia":"fm","fiji":"fj","finland":"fi","france":"fr","french guiana":"gf","french polynesia":"pf","french southern territories":"tf","gabon":"ga","galicia":"es-ga","gambia":"gm","georgia":"ge","germany":"de","ghana":"gh","gibraltar":"gi","greece":"gr","greenland":"gl","grenada":"gd","guadeloupe":"gp","guam":"gu","guatemala":"gt","guernsey":"gg","guinea":"gn","guinea-bissau":"gw","guyana":"gy","haiti":"ht","heard island and mcdonald islands":"hm","holy see":"va","honduras":"hn","hong kong":"hk","hungary":"hu","iceland":"is","india":"in","indonesia":"id","iran":"ir","iraq":"iq","ireland":"ie","isle of man":"im","israel":"il","italy":"it","jamaica":"jm","japan":"jp","jersey":"je","jordan":"jo","kazakhstan":"kz","kenya":"ke","kiribati":"ki","kosovo":"xk","kuwait":"kw","kyrgyzstan":"kg","laos":"la","latvia":"lv","league of arab states":"arab","lebanon":"lb","lesotho":"ls","liberia":"lr","libya":"ly","liechtenstein":"li","lithuania":"lt","luxembourg":"lu","macau":"mo","madagascar":"mg","malawi":"mw","malaysia":"my","maldives":"mv","mali":"ml","malta":"mt","marshall islands":"mh","martinique":"mq","mauritania":"mr","mauritius":"mu","mayotte":"yt","mexico":"mx","moldova":"md","monaco":"mc","mongolia":"mn","montenegro":"me","montserrat":"ms","morocco":"ma","mozambique":"mz","myanmar":"mm","namibia":"na","nauru":"nr","nepal":"np","netherlands":"nl","new caledonia":"nc","new zealand":"nz","nicaragua":"ni","niger":"ne","nigeria":"ng","niue":"nu","norfolk island":"nf","north korea":"kp","north macedonia":"mk","northern ireland":"gb-nir","northern mariana islands":"mp","norway":"no","oman":"om","pacific community":"pc","pakistan":"pk","palau":"pw","panama":"pa","papua new guinea":"pg","paraguay":"py","peru":"pe","philippines":"ph","pitcairn":"pn","poland":"pl","portugal":"pt","puerto rico":"pr","qatar":"qa","republic of the congo":"cg","romania":"ro","russia":"ru","rwanda":"rw","réunion":"re","saint barthélemy":"bl","saint helena":"sh-hl","saint helena, ascension and tristan da cunha":"sh","saint kitts and nevis":"kn","saint lucia":"lc","saint martin":"mf","saint pierre and miquelon":"pm","saint vincent and the grenadines":"vc","samoa":"ws","san marino":"sm","sao tome and principe":"st","saudi arabia":"sa","scotland":"gb-sct","senegal":"sn","serbia":"rs","seychelles":"sc","sierra leone":"sl","singapore":"sg","sint maarten":"sx","slovakia":"sk","slovenia":"si","solomon islands":"sb","somalia":"so","south africa":"za","south georgia and the south sandwich islands":"gs","south korea":"kr","south sudan":"ss","spain":"es","sri lanka":"lk","state of palestine":"ps","sudan":"sd","suriname":"sr","svalbard and jan mayen":"sj","sweden":"se","switzerland":"ch","syria":"sy","taiwan":"tw","tajikistan":"tj","tanzania":"tz","thailand":"th","timor-leste":"tl","togo":"tg","tokelau":"tk","tonga":"to","trinidad and tobago":"tt","tristan da cunha":"sh-ta","tunisia":"tn","turkmenistan":"tm","turks and caicos islands":"tc","tuvalu":"tv","türkiye":"tr","uganda":"ug","ukraine":"ua","united arab emirates":"ae","united kingdom":"gb","united nations":"un","united states minor outlying islands":"um","united states of america":"us","unknown":"xx","uruguay":"uy","uzbekistan":"uz","vanuatu":"vu","venezuela":"ve","vietnam":"vn","virgin islands (british)":"vg","virgin islands (u.s.)":"vi","wales":"gb-wls","wallis and futuna":"wf","western sahara":"eh","yemen":"ye","zambia":"zm","zimbabwe":"zw","united states":"us","usa":"us","us":"us","america":"us","turkey":"tr","uk":"gb","great britain":"gb","britain":"gb","korea":"kr","republic of korea":"kr","czechia":"cz","holland":"nl","the netherlands":"nl","uae":"ae","russian federation":"ru","ivory coast":"ci","hong kong sar":"hk"};
function flagImg(country){
  const c = FLAGNAME[String(country || '').trim().toLowerCase()];
  const u = c && FLAGPNG[c];
  return u ? '<img class="fl" src="' + u + '" alt="" aria-hidden="true" width="22" height="16">' : '';
}
/* ---- who is here right now ----
   The room reaches whoever has the page open this second. No names travel through it,
   so each page publishes its own ID in its presence object and everyone else lights
   that ID's discs. It is display data and nothing more: presence can say anything, so
   it colours a rim and never decides anything. */
let ROOM = null;
const ONLINE = new Set();
/* Two ways to know who is here, joined together:
   - the room (instant, but only for people the platform lets into it), and
   - a heartbeat: every open page writes live/<its ID> = {at: now} every 40 s and
     everyone watches that collection, so an ID counts as here until its last beat is
     more than two minutes old. This works for every signed-in ID that can save. */
const ROOMON = new Set(), BEATS = new Map();
const BEAT_MS = 30000, BEAT_LIVE = 150000;
let beatPid = null, beatTimer = 0, beatWatch = null;
function mergeOnline(){
  ONLINE.clear();
  for(const p of ROOMON) ONLINE.add(p);
  const now = Date.now();
  for(const [p, at] of BEATS) if(now - at < BEAT_LIVE) ONLINE.add(realPid(p));
  if(ME) ONLINE.add(ME);
  paintOnline();
}
async function beat(){
  if(!DB) return;
  const was = beatPid;
  beatPid = ME || null;
  if(was && was !== beatPid){          // signed out or switched ID: drop the old beat
    try{ await DB.doc('live/' + was).delete(); }catch(e){}
  }
  if(beatPid){                         // beat even behind other windows: still signed in
    try{ await DB.doc('live/' + beatPid).set({at: Date.now()}); }catch(e){}
  }
}
function startBeats(){
  if(!DB || beatWatch) return;
  try{
    beatWatch = DB.collection('live').onSnapshot(snap => {
      BEATS.clear();
      for(const d of ((snap && snap.docs) ? snap.docs : [])){
        const v = docOf(d);
        if(v && typeof v.at === 'number') BEATS.set(d.id, v.at);
      }
      mergeOnline();
    }, () => { beatWatch = null; });
  }catch(e){ beatWatch = null; }
  beat();
  clearInterval(beatTimer);
  beatTimer = setInterval(() => { beat(); mergeOnline(); }, BEAT_MS);
  document.addEventListener('visibilitychange', () => { beat(); mergeOnline(); });
  addEventListener('focus', () => { beat(); mergeOnline(); });
}
function paintOnline(){
  try{ paintChatWho(); paintChatFoot(); }catch(e){}
  const el = document.getElementById('onlinecss');
  if(!el) return;
  const live = [...ONLINE].filter(pid => PEOPLE.has(pid));
  /* A signed-in ID's own circle border lights up green and breathes softly. */
  el.textContent = live.map((pid, i) => {
    const q = '[data-p="' + pid + '"]';
    const halo = 'rgba(134,239,172,.75)', ring = '#86E8A6';   // signed in = light green
    const lo = '0 0 4px 1px ' + halo + ',0 0 0 1px ' + ring;
    const hi = '0 0 10px 3px ' + halo + ',0 0 0 1px ' + ring;
    return '#sigrest .iddisc' + q + '{border-color:' + ring +
      ';box-shadow:' + lo + ';animation:idlive' + i + ' 2.6s ease-in-out infinite}' +
      '@keyframes idlive' + i + '{0%,100%{box-shadow:' + lo + '}50%{box-shadow:' + hi + '}}';
  }).join('') + '@media (prefers-reduced-motion:reduce){.iddisc{animation:none!important}}';
  try{ paintSigRest(); }catch(e){}
  const n = document.getElementById('signow');
  if(n) n.textContent = live.length
    ? live.length + (live.length === 1 ? ' here now' : ' here now') : '';
  try{ liveChip(); }catch(e){}
  const list = document.getElementById('idlist');
  if(list) list.querySelectorAll('.idperson[data-pid]').forEach(row => {
    row.dataset.live = ONLINE.has(row.dataset.pid) ? '1' : '0';
  });
}
function announcePresence(){
  if(DB){ if(!beatWatch) startBeats(); else if((ME || null) !== beatPid) beat(); }
  if(!ROOM) return;
  try{ ROOM.presence({pid: ME || null}); }catch(e){}
}
(async function joinRoom(){
  for(let i = 0; i < 40 && !(window.claude && window.claude.use); i++)
    await new Promise(r => setTimeout(r, 250));
  try{ ROOM = await use('room'); }catch(e){ ROOM = null; }
  if(!ROOM) return;
  try{
    ROOM.onPeers(ch => {
      ROOMON.clear();
      for(const peer of ((ch && ch.peers) || [])){
        if(peer.kind !== 'viewer') continue;
        const pid = peer.presence && typeof peer.presence.pid === 'string'
          ? peer.presence.pid : '';
        if(pid) ROOMON.add(realPid(pid));
      }
      mergeOnline();
    }, () => {});
  }catch(e){}
  try{ ROOM.on('chat', msg => {
    if(!msg || msg.sameTab) return;      // our own line is already on screen
    chatHeard(msg.data);
  }, () => {}); }catch(e){}
  announcePresence();
})();

async function loadPeople(){
  if(!DB) return;
  PEOPLE.clear(); MERGED.clear(); GONEID.clear();
  try{
    const snap = await DB.collection('people').limit(200).get();
    for(const d of ((snap && snap.docs) ? snap.docs : (snap || []))){
      const v = docOf(d);
      if(!v || !v.n) continue;
      if(v.mg){ MERGED.set(d.id, String(v.mg)); continue; }
      if(v.x){ GONEID.set(d.id, {n: String(v.n).slice(0, 24), c: IDC[v.c] ? v.c : 'lilac'}); continue; }
      PEOPLE.set(d.id, {n: String(v.n).slice(0, 24), c: IDC[v.c] ? v.c : 'lilac',
        h: typeof v.h === 'string' ? v.h : '', s: typeof v.s === 'string' ? v.s : ''});
    }
  }catch(e){}
  const saved = LS.get('illum.me');
  const live = saved ? realPid(saved) : null;
  ME = (live && PEOPLE.has(live)) ? live : null;
  if(ME && ME !== saved) LS.set('illum.me', ME);   // follow a merge on this device too
}
async function loadPeerMarks(){
  if(!DB) return;
  PEERMARKS.clear();
  try{
    const snap = await DB.collection('pmarks').limit(200).get();
    for(const d of ((snap && snap.docs) ? snap.docs : (snap || []))){
      const v = docOf(d);
      const pid = realPid(d.id);
      if(GONEID.has(pid)) continue;
      const cur = PEERMARKS.get(pid) || {e: new Map(), t: new Map(), m: new Map()};
      if(!cur.m) cur.m = new Map();
      for(const [k, x] of Object.entries((v && v.e) || {})) if(x && !cur.e.has(k)) cur.e.set(k, x);
      for(const [k, x] of Object.entries((v && v.t) || {})) if(x && !cur.t.has(k)) cur.t.set(k, x);
      for(const [k, x] of Object.entries((v && v.m) || {})) if(x && !cur.m.has(k)) cur.m.set(k, x);
      PEERMARKS.set(pid, cur);
    }
  }catch(e){}
}
async function loadLegacyMarks(){
  if(!DB) return;
  LEGACY.e.clear(); LEGACY.t.clear();
  try{
    const snap = await DB.collection('marks').limit(400).get();
    for(const d of ((snap && snap.docs) ? snap.docs : (snap || []))){
      const data = docOf(d);
      for(const [k, v] of Object.entries((data && data.e) || {})) if(v) LEGACY.e.set(k, v);
      for(const [k, v] of Object.entries((data && data.t) || {})) if(v) LEGACY.t.set(k, v);
    }
  }catch(e){}
}
/* MARKS is still "the lamps I can act on" - every tab, filter and badge reads it and
   none of them had to change. All that moved is where it is read from and written to. */
async function loadMarks(){
  if(!DB) return;
  await loadPeople();
  await Promise.all([loadPeerMarks(), loadLegacyMarks(), loadBacklog()]);
  MARKS.clear(); MARKAT.clear();
  const mine = ME ? PEERMARKS.get(ME) : null;
  if(mine){
    for(const [k, v] of mine.e) MARKS.set(k, v);
    for(const [k, v] of mine.t) MARKAT.set(k, v);
  }else if(!ME){
    // nobody has claimed an ID in this browser: the old shared lamps are what you see
    for(const [k, v] of LEGACY.e) MARKS.set(k, v);
    for(const [k, v] of LEGACY.t) MARKAT.set(k, v);
  }
  paintIdBar();
}
async function saveMyMarks(key){
  if(!DB || !SIGNED()) return;
  if(ME){
    const e = {}, t = {}, mm = {};
    const ex = myLampRec();
    for(const [k, v] of MARKS) e[k] = v;
    for(const [k, v] of MARKAT) t[k] = v;
    for(const [k, v] of ex.m) if(MARKS.has(k)) mm[k] = v;
    PEERMARKS.set(ME, {e: new Map(MARKS), t: new Map(MARKAT), m: ex.m});
    try{ await DB.doc('pmarks/' + ME).set({e: e, t: t, m: mm}); }catch(err){}
    return;
  }
  const sid = markShard(key), e = {}, t = {};
  for(const [k, v] of MARKS) if(markShard(k) === sid){
    e[k] = v;
    const at = MARKAT.get(k);
    if(at) t[k] = at;
  }
  try{ await DB.doc('marks/' + sid).set({e: e, t: t}); }catch(err){}
}
/* My own lamp record in PEERMARKS, made on demand. "m" is when I last changed my lamp
   on each model, to the second - so a colleague's view can tell whose call is newest. */
function myLampRec(){
  let r = ME ? PEERMARKS.get(ME) : null;
  if(!r){ r = {e: new Map(), t: new Map(), m: new Map()}; if(ME) PEERMARKS.set(ME, r); }
  if(!r.m) r.m = new Map();
  return r;
}
/* Everyone else who has judged this face, and what they decided. */
function peersOn(key){
  const out = [];
  for(const [pid, m] of PEERMARKS){
    if(pid === ME) continue;
    const v = m.e.get(key);
    if(v && PEOPLE.has(pid)) out.push({pid: pid, v: v});
  }
  return out;
}
/* Who lit what. Every account that has a lamp on this face, you first, each with the
   colour it chose and the word for it - so the card says plainly that Daniel is
   interested while you ruled her out, rather than leaving a ring to be decoded. */
const PEERW = {g: 'Interested', y: 'Pending', r: 'Ruled out'};
function peerStrip(key){
  if(PRIV()) return '';
  const list = [];
  if(ME && PEOPLE.has(ME) && MARKS.get(key))
    list.push({pid: ME, v: MARKS.get(key), at: MARKAT.get(key) || ''});
  for(const x of peersOn(key)){
    const mk = PEERMARKS.get(x.pid);
    list.push({pid: x.pid, v: x.v, at: (mk && mk.t && mk.t.get(key)) || ''});
  }
  if(!list.length) return '';
  /* In the order they first lit her: whoever called it first leads, and changing your
     colour later keeps your place. A lamp with no recorded time sorts last. */
  list.sort((a, b) => (a.at || '\uffff') < (b.at || '\uffff') ? -1
                    : (a.at || '\uffff') > (b.at || '\uffff') ? 1 : 0);
  const n = {g: 0, y: 0, r: 0};
  for(const x of list) if(n[x.v] !== undefined) n[x.v]++;
  const votes = '<span class="pvotes" title="Votes per colour">' +
    ['g', 'y', 'r'].map(v => '<span class="pvote' + (n[v] ? '' : ' zero') + '" data-v="' + v +
      '" title="' + n[v] + ' \u00d7 ' + PEERW[v] + '"><s></s>' + n[v] + '</span>').join('') +
    '</span>';
  return '<div class="peers"><span class="peerl">lit by</span>' + votes + '<span class="pwho">' +
    list.map((x, i) => '<span class="pchip" data-v="' + x.v + '" title="' +
      esc(((PEOPLE.get(x.pid) || {}).n || '') + (x.pid === ME ? ' (you)' : '') +
        (x.at ? ' \u00b7 first lit ' + x.at : '')) + '"><i class="pord">' + (i + 1) + '</i>' +
      idDisc(x.pid, 'pdisc', ' data-v="' + x.v + '" tabindex="0"') +
      '<b>' + esc((PEOPLE.get(x.pid) || {}).n || '') + (x.pid === ME ? ' (you)' : '') +
      '</b><s></s><em>' + PEERW[x.v] + '</em></span>').join('') + '</span></div>';
}

/* ---- ID rings on the lamps themselves ----
   The lamp's POSITION already says what was decided - left is interested, middle is
   pending, right is ruled out - so the ring around it only has to say who decided it.
   Two or more people on the same lamp split the ring into equal arcs, clockwise from
   the top, in the order they are listed. It is the exact inverse of the disc in the
   strip below, where the fill says who and the ring says what. */
function lampWho(key, v){
  const who = [];
  for(const [pid, mk] of PEERMARKS)
    if(PEOPLE.has(pid) && mk.e.get(key) === v) who.push(pid);
  if(ME && PEOPLE.has(ME) && MARKS.get(key) === v && who.indexOf(ME) < 0) who.push(ME);
  return who;
}
/* Has anyone at all set this lamp - you, a colleague, or nobody in particular back
   before IDs existed. The lamp lights for any of them; only the ring says which. */
/* Every ID's own scorecard: how many greens, ambers and reds THEY set, whichever
   section the card ended up filed under. Counted from their own document, so the three
   numbers always add up to that person's total and never to somebody else's. */
let TALLYC = null;
function tally(){
  if(TALLYC) return TALLYC;
  const t = new Map();
  for(const [pid, mk] of PEERMARKS){
    if(!PEOPLE.has(pid)) continue;
    const c = {g: 0, y: 0, r: 0, n: 0};
    for(const v of mk.e.values()) if(c[v] !== undefined){ c[v]++; c.n++; }
    t.set(pid, c);
  }
  TALLYC = t;
  return t;
}
let litWho = '';                     // the Lumen tab's person filter
function lampAny(key, v){
  if(MARKS.get(key) === v) return true;
  if(LEGACY.e.get(key) === v) return true;
  for(const [pid, mk] of PEERMARKS)
    if(PEOPLE.has(pid) && mk.e.get(key) === v) return true;
  return false;
}
function lampRing(key, v){
  if(!RINGS || PRIV() || v !== lampOf(key)) return {a: '', t: ''};
  const who = lampWho(key, v);
  if(!who.length) return {a: '', t: ''};
  const step = 100 / who.length;
  const arcs = who.map((pid, i) => idCol(PEOPLE.get(pid).c).bg + ' ' +
    (i * step).toFixed(2) + '% ' + ((i + 1) * step).toFixed(2) + '%').join(',');
  return {a: ' data-ids="1" style="--ids:conic-gradient(from -90deg,' + arcs + ')"',
          t: who.map(pid => PEOPLE.get(pid).n).join(', ')};
}

/* ---- the backlog ---- */
/* Who did this. The discs carry the same colour and initial as everywhere else, so a
   glance down the log says whose morning it was without reading a word. */
/* Everyone whose lamp is on this model - the lamps are their own record of who. */
function lampWhoAll(key){
  const out = [];
  try{
    for(const [pid, mk] of PEERMARKS)
      if(mk && mk.e && mk.e.get(key)) out.push(pid);
  }catch(e){}
  return out;
}
function whoDiscs(who, cls){
  const list = (who || []).filter(pid => PEOPLE.has(realPid(pid)));
  if(!list.length) return '';
  return '<span class="lwho' + (cls ? ' ' + cls : '') + '" title="' +
    esc(list.map(pid => (PEOPLE.get(realPid(pid)) || {}).n || pid).join(', ')) +
    (list.length > 1 ? ' \u2014 in the order they came to it' : '') + '">' +
    list.map(pid => idDisc(realPid(pid))).join('') + '</span>';
}
const KVERB = {g: ['lit', 'green'], y: ['put', 'on amber'], r: ['ruled out', ''],
               x: ['cleared the lamp on', '']};
const blogId = () => ME + '-' + new Date().toISOString().slice(0, 7);
async function loadBacklog(){
  if(!DB) return;
  BLOGDOC.clear(); BLOG = [];
  try{
    const snap = await DB.collection('blog').limit(400).get();
    for(const d of ((snap && snap.docs) ? snap.docs : (snap || []))){
      const v = docOf(d);
      if(!v || !Array.isArray(v.e)) continue;
      BLOGDOC.set(d.id, {p: v.p || '', m: v.m || '', e: v.e.slice()});
      for(const row of v.e) if(Array.isArray(row) && row.length >= 3)
        BLOG.push({p: realPid(v.p || ''), ts: row[0], v: row[1], k: row[2],
                   nm: row[3] || '', ag: row[4] || ''});
    }
  }catch(e){}
  BLOG.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
}
async function blogAdd(verb, key, nm, ag){
  if(!ME) return;                      // no ID, no attribution - nothing to file
  const d = new Date(), ts = localDay(d) + ' ' + hhmm(d);
  BLOG.push({p: ME, ts: ts, v: verb, k: key, nm: nm || '', ag: ag || ''});
  const id = blogId();
  let doc = BLOGDOC.get(id);
  if(!doc){ doc = {p: ME, m: id.slice(-7), e: []}; BLOGDOC.set(id, doc); }
  doc.e.push([ts, verb, key, nm || '', ag || '']);
  /* One document per person per month holds about 1,400 of these. Keeping the most
     recent 1,200 means a month can never overflow the 256 KiB a document may hold. */
  if(doc.e.length > 1200) doc.e = doc.e.slice(-1200);
  if(VIEW === 'bkl') renderBacklog();
  const el = document.getElementById('vn-bkl');
  if(el) el.textContent = BLOG.length ? BLOG.length : '';
  if(!DB) return;
  try{ await DB.doc('blog/' + id).set(doc); }catch(e){}
}

/* ================= the gate =================
   No ID, no writing. Not a lock on the data - the store cannot enforce that - but a lock
   on every control that would leave an unattributed trace, which is the point: the record
   is only worth keeping if every line on it has a name.

   Three layers, so a miss in one is caught by the next: the controls are made inert in
   CSS, a capture-phase listener swallows anything that slips through, and every function
   that writes to the store checks for itself. */
const SIGNED = () => !!ME;
document.addEventListener('click', e => {
  if(e.target && e.target.id === 'selftest'){ e.preventDefault(); selfTest(); }
});
/* The stage light answers on the DOCUMENT, in the capture phase, before any other
   listener on the page gets a look. It had been sitting on the Booking pane behind a
   row of other checks, and on at least one machine the press was never arriving. This
   way nothing between the press and the lamp can swallow it. */
document.addEventListener('click', e => {
  if(!e.target || !e.target.closest) return;
  const dot = e.target.closest('[data-bkstage]');
  if(dot){
    e.preventDefault(); e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    const [bid, k] = String(dot.dataset.bkstage || '').split('|');
    if(!SIGNED()){ bkTrace('light ' + k + ': refused, not signed in'); nudgeSignIn(dot); return; }
    bkStage(bid, k, null);
    const c = BOOK.get(bid);
    bkTrace('light ' + k + ' -> "' + ((((c || {}).s || {})[k] || {}).p || '') + '"');
    return;
  }
}, true);
/* and a note of every press that lands ON a stage row, so a press that misses the
   light by a few pixels is visible as exactly that */
document.addEventListener('pointerdown', e => {
  if(!e.target || !e.target.closest) return;
  if(e.target.closest('[data-bkstage]')){ bkTrace('press: ON the light'); return; }
  const sh = e.target.closest('.bksh');
  if(sh) bkTrace('press: on the stage row, MISSED the light (hit .' +
    String(e.target.className || e.target.tagName).split(' ')[0] + ')');
}, true);
const RO_SEL = '.mk, .ctf, .ctaf, .ctadd, .ctdel, .mxi, .mxrv, .litpic[data-pic], ' +
  '.tobook, .bkf, .bkm input, .bkbody textarea, .bkt, .bknew, .bkseg button, ' +
  '.bkdot, [data-bkpic], .bkmv, .bkuseg button, .bkatt, .bkfx, ' +
  '.picx, [data-findphoto], #lumenfolder, .igadd button, .igadd input, .igadd select, ' +
  '.igdel';
/* Whatever went wrong last, kept where it can be read out. A dashboard somebody else
   is running is not a place where "open the console" is useful advice. */
let ILLERR = '';
/* A dashboard somebody else is running cannot be debugged by asking them to open a
   console. So the page keeps a short note of what the last presses hit and files it in
   the store, where it can be read back. Nothing personal goes in it. */
const TRACE = [];
let traceT = 0;
function bkTrace(m){
  const now = new Date();
  TRACE.push(now.toISOString().slice(11, 19) + ' ' + m);
  while(TRACE.length > 30) TRACE.shift();
  if(!DB || !ME) return;
  clearTimeout(traceT);
  traceT = setTimeout(() => {
    try{
      DB.doc('diag/' + ME).set({
        build: (document.getElementById('buildno') || {}).textContent || '?',
        at: new Date().toISOString(),
        cards: BOOK.size,
        signed: !!ME,
        store: !!DB,
        err: ILLERR || '',
        view: VIEW,
        filters: (function(){
          try{
            return {mark: checked('mark'), sex: checked('sex'), tier: checked('tier'),
                    region: checked('region'), bounds: !!(BND && BND.any),
                    who: litWho || '', term: (q.value || '').trim().slice(0, 40),
                    lamps: MARKS.size, lumen: (function(){ try{ return litRows().length; }
                                                          catch(e){ return -1; } })()};
          }catch(e){ return {}; }
        })(),
        ua: String(navigator.userAgent || '').slice(0, 140),
        log: TRACE.slice()
      });
    }catch(e){}
  }, 600);
}
window.addEventListener('error', e => {
  ILLERR = (e && e.message ? e.message : 'error') +
    (e && e.filename ? ' @' + String(e.lineno || '') : '');
});
window.addEventListener('unhandledrejection', e => {
  ILLERR = 'promise: ' + ((e && e.reason && e.reason.message) || 'rejected');
});
let roFlash = 0, roToastT = 0;
function roToast(el){
  let t = document.getElementById('rotoast');
  if(!t){
    t = document.createElement('div');
    t.id = 'rotoast';
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.textContent = 'Sign in with your ID to change this \u2014 the bar at the top of the ' +
    'page has the button.';
  let r = null;
  try{ r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null; }catch(e){}
  if(r){
    const w = 250;
    t.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left - 8)) + 'px';
    t.style.top = (r.top > 70 ? r.top - 58 : r.bottom + 10) + 'px';
  }else{
    t.style.left = '50%'; t.style.top = '16px';
  }
  t.dataset.on = '1';
  clearTimeout(roToastT);
  roToastT = setTimeout(() => { t.dataset.on = '0'; }, 3000);
}
function nudgeSignIn(el){
  if(el) roToast(el);
  const bar = document.getElementById('robar');
  if(!bar) return;
  clearTimeout(roFlash);
  bar.classList.add('ping');
  roFlash = setTimeout(() => bar.classList.remove('ping'), 900);
  /* jumping the page to the top under someone's cursor is its own small betrayal, so
     it only happens when there was nothing to point at */
  if(!el){ try{ bar.scrollIntoView({block: 'nearest', behavior: 'smooth'}); }catch(e){} }
}
function roGuard(e){
  if(SIGNED()) return;
  // copying a face out of a card changes nothing, so it is not gated
  if(e.target && e.target.closest && e.target.closest('[data-piccopy]')) return;
  // opening a booking card wide only looks, so it is not gated either
  const bp = e.target && e.target.closest ? e.target.closest('[data-bkpic]') : null;
  if(bp && bp.querySelector('img') && e.type !== 'drop' && e.type !== 'paste' &&
     e.type !== 'dragover') return;
  const t = e.target && e.target.closest ? e.target.closest(RO_SEL) : null;
  if(!t) return;
  e.preventDefault();
  e.stopPropagation();
  if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  if(e.type === 'click' || e.type === 'pointerdown' || e.type === 'drop') nudgeSignIn(t);
}
['pointerdown','click','keydown','input','change','drop','dragover','paste']
  .forEach(t => document.addEventListener(t, roGuard, true));
/* Presses a stage light on a throwaway card, reads back what the page did with it, and
   says so in plain words. Nothing is saved: the card is removed again either way. */
function selfTest(){
  const out = document.getElementById('selfout');
  if(!out) return;
  const L = [];
  const yes = t => L.push('<b>\u2713</b> ' + t);
  const no = t => L.push('<u>\u2717</u> ' + t);
  L.push('build ' + (document.getElementById('buildno') || {}).textContent);
  L.push(ME ? '\u2713 signed in as ' + ((PEOPLE.get(ME) || {}).n || ME)
            : '\u2717 NOT signed in \u2014 press Sign in on the amber bar above. ' +
              'Nothing on a card can be changed without an ID.');
  L.push((DB ? '\u2713' : '\u2717') + ' data store ' + (DB ? 'connected' : 'NOT connected') +
         ' \u00b7 ' + BOOK.size + ' booking card' + (BOOK.size === 1 ? '' : 's'));
  if(ME){
    const bid = newBid();
    BOOK.set(bid, {id: bid, o: -1e6, k: '', nm: '(page check)', ag: '', city: '',
      country: '', ht: '', bu: '', wa: '', hp: '', eu: '', us: '', ig: '', ph: '',
      ft: '', s: {}, st: 'proc', by: ME, at: new Date().toISOString()});
    const was = VIEW;
    /* Every step is caught on its own. A tab that will not draw must still be able to
       say so, and a lamp that lights on a tab that will not draw is worth knowing. */
    try{ setView('bk'); }catch(e){ no('the tab would not open: ' + (e && e.message)); }
    try{ renderBook(); }
    catch(e){ no('the tab would not draw: ' + (e && e.message)); }
    /* re-read the DOM after every press: a re-render replaces these nodes, and a
       reading taken from a node that is no longer on the page says nothing */
    const secOf = () => {
      const sh = document.querySelector('[data-bksec="' + CSS.escape(bid + '|email') + '"]');
      return sh ? sh.closest('.bksec') : null;
    };
    const press = () => {
      const sec = secOf();
      const dot = sec && sec.querySelector('.bkdot');
      if(!dot) return null;
      dot.click();
      const now = secOf();
      const lamp = now && now.querySelector('.bkdot s');
      return {p: now ? now.dataset.p : '', col: lamp ? getComputedStyle(lamp).backgroundColor : '',
              word: now ? (now.querySelector('.bkdot i') || {}).textContent : ''};
    };
    if(!secOf()) no('the test card did not draw \u2014 nothing on this tab is rendering');
    else{
      const a = press();
      if(!a) no('no stage light was drawn on the card');
      else if(a.p === 'y' && /^rgb\(239, ?188, ?22/.test(a.col))
        yes('one press \u2192 amber, labelled \u201c' + a.word + '\u201d');
      else if(a.p === 'y')
        no('state went amber but the lamp is ' + (a.col || 'not drawn'));
      else no('the press did not register (state \u201c' + a.p + '\u201d)');
      const b2 = press();
      if(b2 && b2.p === 'g' && /^rgb\(34, ?212, ?95/.test(b2.col))
        yes('second press \u2192 green, labelled \u201c' + b2.word + '\u201d');
      else if(b2) no('second press gave state \u201c' + b2.p + '\u201d, lamp ' +
                     (b2.col || 'not drawn'));
      const c3 = press();
      if(c3 && c3.p === '') yes('third press puts it out again');
      else if(c3) no('third press left it at \u201c' + c3.p + '\u201d');
    }
    BOOK.delete(bid);
    try{ if(DB) DB.doc('book/' + bid).delete(); }catch(e){}
    try{ setView(was); }catch(e){}
    try{ renderBook(); }catch(e){}
  }
  L.push(ILLERR ? '\u2717 last error on this page: ' + ILLERR
                : '\u2713 no script errors recorded');
  out.innerHTML = L.join('\n');
  out.hidden = false;
}
/* The bar's right side shows only the IDs signed in right now - you first - each
   with a light green glow round its own circle. */
function paintSigRest(){
  const rest = document.getElementById('sigrest');
  if(!rest) return;
  const on = [...new Set([ME, ...ONLINE])].filter(pid => pid && PEOPLE.has(pid));
  const key = on.join(',');
  if(rest.dataset.k === key && rest.innerHTML) return;
  rest.dataset.k = key;
  rest.innerHTML = on.length
    ? '<span class="idstack">' + on.slice(0, 8).map(pid => idDisc(pid)).join('') + '</span>' +
      on.map(pid => esc(PEOPLE.get(pid).n)).join(' \u00b7 ')
    : '';
}
function paintGate(){
  const on = SIGNED();
  document.body.dataset.ro = on ? '0' : '1';
  const ro = document.getElementById('robar');
  const sig = document.getElementById('sigbar');
  if(ro) ro.hidden = on;
  if(sig) sig.hidden = !on;
  if(!on) return;
  const me = meRec();
  const who = document.getElementById('sigwho');
  if(who && me) who.innerHTML = idDisc(ME) + '<span>' + esc(me.n) + '</span>';
  paintSigRest();
}

/* ---- the bar at the top right ---- */
function paintIdBar(){
  const stack = document.getElementById('idstack');
  const btn = document.getElementById('idme');
  if(!stack || !btn) return;
  const others = [...PEOPLE.keys()].filter(pid => pid !== ME);
  stack.innerHTML = others.slice(0, 4).map(pid => idDisc(pid)).join('') +
    (others.length > 4 ? '<i class="iddisc more">+' + (others.length - 4) + '</i>' : '');
  const me = meRec();
  btn.dataset.none = me ? '0' : '1';
  btn.title = me ? me.n + ' \u2014 your ID (click to change)' : 'Add yourself to this dashboard';
  btn.innerHTML = me
    ? '<i class="iddisc" ' + idStyle(me.c) + ' data-p="' + esc(ME) + '">' + esc(idInit(me.n)) + '</i>' +
      '<span>' + esc(me.n) + '</span>'
    : '<i class="iddisc">+</i><span>Add yourself</span>';
  const kb = document.getElementById('vn-bkl');
  if(kb) kb.textContent = BLOG.length ? BLOG.length : '';
  paintGate();
  announcePresence();
  paintOnline();
}


/* ================= agency contacts =================
   One document per agency in "contacts", keyed by its domain:
     {d: domain, c: [{e,n,r,p}], ph: [{l,v}]}
   c is the people - address, name, title, direct line. ph is the agency's own lines,
   a switchboard or a bookings desk, which belong to nobody in particular. Small enough
   to read whole on load (87 agencies, not 20,000 models) and written back per agency,
   last writer wins, the same bargain the interest marks already make. The measurement
   crawler never touches this collection. */
const CONTACTS = new Map();
const ADDR = new Map();   // agency domain -> street address, one per agency
const MIGRATED = new Set();
const ctsDoc = dom => 'contacts/' + (String(dom || 'unknown')
  .replace(/[^A-Za-z0-9_.~:@+-]/g, '_').slice(0, 180) || 'unknown');
const ctsClean = c => ({e: String((c && c.e) || '').trim(),
                        n: String((c && c.n) || '').trim(),
                        r: String((c && c.r) || '').trim(),
                        p: String((c && c.p) || '').trim()});
const ctsReal = c => !!(c && (c.e || c.n || c.r || c.p));
function ctsList(dom){
  let l = CONTACTS.get(dom);
  if(!l){ l = []; CONTACTS.set(dom, l); }
  return l;
}
/* A number as published is for reading; the tel: link wants it stripped back to digits
   and a leading +. Too short to be a number, no link - better a dead button than one
   that dials nothing. */
function telHref(v){
  const s = String(v || '').trim();
  const plus = s.charAt(0) === '+' ? '+' : '';
  const digits = s.replace(/[^0-9]/g, '');
  return digits.length >= 4 ? 'tel:' + plus + digits : '';
}
/* Every tab names an agency differently - the Directory has its domain, Arrivals and
   Lumen have only the name it is filed under - so resolve whatever a caller has to the
   one key this collection is stored by. An agency the Directory has never heard of
   (a blind spot, say) still gets a stable key of its own rather than being dropped. */
const AGBYNAME = new Map();
const AGCITY = new Map();
const CTNAME = new Map();
for(const a of AG){
  if(a.name){
    AGBYNAME.set(a.name.trim().toLowerCase(), a.domain);
    AGCITY.set(a.name.trim().toLowerCase(),
      [a.city, a.country].filter(Boolean).join(' · '));
  }
  if(a.domain) CTNAME.set(a.domain, a.name);
}
/* A blind spot is an agency we know of and cannot crawl. It is still an agency with a
   booker and a telephone, so it belongs in this index too - otherwise a card typed
   against one has nowhere to keep its contacts. */
for(const b of (typeof BLINDS === 'undefined' ? [] : BLINDS)){
  if(b.n && b.dom && !AGBYNAME.has(b.n.trim().toLowerCase())){
    AGBYNAME.set(b.n.trim().toLowerCase(), b.dom);
    AGCITY.set(b.n.trim().toLowerCase(), [b.city, b.c].filter(Boolean).join(' · '));
  }
  if(b.dom && !CTNAME.has(b.dom)) CTNAME.set(b.dom, b.n);
}
/* Nobody writes an agency's name the way its own website does. The card says EGO
   MODELS MANAGEMENT, the directory says Ego Models, and a strict match drops the
   contacts on the floor. So compare on what is left after the words every agency
   shares - models, management, agency - and only trust the loose match when exactly
   one agency answers to it. */
const AGFILL = /\b(?:models?|modell?ing|management|managment|mgmt|mngt|agency|agencies|agence|group|international|intl|the|and|co|company|ltd|limited|llc|inc|talents?)\b/g;
const agToks = v => String(v || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ')
  .replace(AGFILL, ' ').trim().split(/\s+/).filter(Boolean);
const agNorm = v => agToks(v).join(' ');
/* Words, not letters. Comparing the run-together letters would make Mode Models the
   answer to ModelScout, which is a different agency with a different booker. */
const AGLOOSE = new Map();   // "blow"        -> domain
const AGJOIN = new Map();    // "blowmodels"  -> domain, for a name typed with no spaces
(function(){
  const t1 = new Map(), t2 = new Map();
  const put = (map, taken, k, dom) => {
    if(!k || !dom) return;
    if(taken.has(k)){ if(taken.get(k) !== dom) map.delete(k); return; }
    taken.set(k, dom); map.set(k, dom);
  };
  const add = (name, dom) => {
    const k = agNorm(name);
    if(k.replace(/ /g, '').length < 3) return;
    put(AGLOOSE, t1, k, dom);
    put(AGJOIN, t2, k.replace(/ /g, ''), dom);
  };
  for(const a of AG) add(a.name, a.domain);
  for(const b of (typeof BLINDS === 'undefined' ? [] : BLINDS)) add(b.n, b.dom);
})();
function domOf(ref){
  const v = String(ref || '').trim();
  if(!v) return '';
  const byName = AGBYNAME.get(v.toLowerCase());
  if(byName) return byName;
  if(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(v)) return v.toLowerCase();
  const toks = agToks(v), k = toks.join(' ');
  const loose = AGLOOSE.get(k);
  if(loose) return loose;
  const joined = AGJOIN.get(k.replace(/ /g, ''));
  if(joined) return joined;
  /* A card is often filed with the office on the end - Blow Models Barcelona, Crush
     Models Prague. If exactly one agency's shorthand is the opening WORDS of the typed
     one, that is the agency. Anything less certain is left alone: a wrong booker is
     worse than none. */
  if(toks.length > 1){
    let hit = '', n = 0;
    for(const [kk, dd] of AGLOOSE){
      const kt = kk.split(' ');
      if(kt.length >= toks.length) continue;
      let ok = true;
      for(let i = 0; i < kt.length; i++) if(kt[i] !== toks[i]){ ok = false; break; }
      if(ok && dd !== hit){ n++; hit = dd; }
    }
    if(n === 1) return hit;
  }
  return '';
}
/* Where this agency's contacts are kept. A real domain when we have one; otherwise a
   key made from the name itself, so an agency nobody has crawled still has one place
   its email and its telephone live - and keeps them across reloads and people. */
const agSlug = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
function ctsKeyOf(ref, name){
  const d = domOf(ref) || domOf(name);
  if(d) return d;
  const sl = agSlug(name || ref);
  return sl ? 'name:' + sl : '';
}
const isDom = v => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(String(v || ''));
const ctsTitle = dom => CTNAME.get(dom) || dom;
/* Typing is not a save per keystroke: hold the write a beat so a name goes up once
   rather than once per letter, and never leave the last letter unsaved. */
const CTSAVE = new Map();
function queueSaveContacts(dom){
  clearTimeout(CTSAVE.get(dom));
  CTSAVE.set(dom, setTimeout(() => { CTSAVE.delete(dom); saveContacts(dom); }, 700));
}
async function loadContacts(){
  if(!DB) return;
  try{
    const snap = await DB.collection('contacts').limit(5000).get();
    const docs = (snap && snap.docs) ? snap.docs : (snap || []);
    for(const d of docs){
      const data = docOf(d);
      if(!data || !data.d) continue;
      const rows = Array.isArray(data.c) ? data.c.filter(Boolean).map(ctsClean) : [];
      /* An earlier build kept the agency's own lines in a list of their own. A line is
         just a contact whose name is "Main line", so fold them in and let the next save
         put the merged list back - nothing typed is lost. */
      if(Array.isArray(data.ph))
        for(const x of data.ph.filter(Boolean)){
          const l = String(x.l || '').trim(), v = String(x.v || '').trim();
          if(l || v){ rows.push(ctsClean({n: l, p: v})); MIGRATED.add(data.d); }
        }
      CONTACTS.set(data.d, rows);
      ADDR.set(data.d, String(data.a || '').trim());
    }
  }catch(e){}
}
async function saveContacts(dom){
  if(!DB || !dom || !SIGNED()) return;
  LIVE.cts.set(dom, Date.now());
  const list = (CONTACTS.get(dom) || []).map(ctsClean).filter(ctsReal);
  /* ph is written empty on purpose: it clears the old split list once its rows have
     been folded into c, so no build can bring them back twice. */
  try{ await DB.doc(ctsDoc(dom)).set({d: dom, c: list, ph: [],
    a: String(ADDR.get(dom) || '').trim()}); MIGRATED.delete(dom); }
  catch(e){}
}
function flushContacts(){
  for(const [dom, t] of CTSAVE){ clearTimeout(t); saveContacts(dom); }
  CTSAVE.clear();
}
window.addEventListener('beforeunload', flushContacts);
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden') flushContacts();
});
/* What the search box matches on, so looking a booker up by name, by address or by the
   number on a call sheet finds the agency they sit behind. */
const ctsHay = dom => ((CONTACTS.get(dom) || [])
  .map(c => c.e + ' ' + c.n + ' ' + c.r + ' ' + c.p).join(' ')
  + ' ' + (ADDR.get(dom) || ''));
const ctsCount = dom => (CONTACTS.get(dom) || []).filter(c => c.e).length;
const telCount = dom => (CONTACTS.get(dom) || []).filter(c => c.p).length;
/* The pair of chips that sit beside an agency name, in whichever tab. Clicking either
   opens the panel. Given a name this cannot resolve, it renders nothing rather than a
   chip that would file contacts under a key no other tab agrees on. */
function ctsChip(ref, name){
  const dom = ctsKeyOf(ref, name);
  if(!dom) return '';
  /* Remember what to call it. A blind spot is known by its domain here and by its name
     in its own list; the panel should say the name either way. */
  const nice = String(name || ref || '').trim();
  if(nice && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(nice) && !CTNAME.has(dom))
    CTNAME.set(dom, nice);
  const n = ctsCount(dom), t = telCount(dom), d = esc(dom);
  const x = '';
  return '<span class="agmail' + x + '" data-ctopen="' + d + '" data-dom="' + d +
      '" data-n="' + n + '" role="button" tabindex="0" title="' + n + ' email contact' +
      (n === 1 ? '' : 's') + ' — click to open contacts">✉ ' + n + '</span>' +
    '<span class="agtel' + x + '" data-ctopen="' + d + '" data-dom="' + d +
      '" data-n="' + t + '" role="button" tabindex="0" title="' + t + ' phone number' +
      (t === 1 ? '' : 's') + ' — click to open contacts">☎ ' + t + '</span>';
}
function paintCtsChip(dom, els){
  const n = ctsCount(dom), t = telCount(dom);
  /* only this agency's chips: found by their address, not by walking every chip on the page */
  const sel = '[data-dom="' + (window.CSS && CSS.escape ? CSS.escape(dom) : String(dom).replace(/"/g, '\\"')) + '"]';
  (els || document.querySelectorAll('.agmail' + sel + ',.agtel' + sel)).forEach(el => {
    if(el.dataset.dom !== dom) return;
    const tel = el.classList.contains('agtel'), v = tel ? t : n;
    el.dataset.n = v;
    el.textContent = (tel ? '☎ ' : '✉ ') + v;
    el.title = v + (tel ? ' phone number' : ' email contact') + (v === 1 ? '' : 's') +
      ' — click to open contacts';
  });
  document.querySelectorAll('.cts' + sel).forEach(box => {
    if(box.dataset.dom !== dom) return;
    const a = box.querySelector('.ctsn');
    if(a) a.textContent = (CONTACTS.get(dom) || []).filter(ctsReal).length;
  });
}
const CTEMPTY = 'Nobody yet. Add the booker or scout you actually deal with — name, ' +
  'title, address, number — so the next person reading this knows who is behind it. ' +
  'A switchboard goes in the same list: call it “Main line” and give it the number.';
function initialsOf(c){
  const n = String((c && c.n) || '').trim();
  if(n){
    const parts = n.split(/\s+/).filter(Boolean);
    const s = (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''));
    return s.toUpperCase();
  }
  const e = String((c && c.e) || '').trim();
  return e ? e.charAt(0).toUpperCase() : '';
}
/* A row with a number and no address is the agency's own line, not a person: give it
   the handset rather than initials, so the two read apart at a glance. */
const isLine = c => !!(c && c.p && !c.e);
function avatarHTML(c){
  if(isLine(c)) return '<span class="ctav line" aria-hidden="true">☎</span>';
  const i = initialsOf(c);
  return '<span class="ctav' + (i ? '' : ' none') + '" aria-hidden="true">' +
    (i ? esc(i) : '·') + '</span>';
}
function telBtn(v, who){
  const href = telHref(v);
  return href
    ? '<a class="cttel" href="' + esc(href) + '" title="Call ' + esc(who || v) + '">☎</a>'
    : '<span class="cttel off" aria-hidden="true">☎</span>';
}
function mailBtn(c){
  const addr = String((c && c.e) || '').trim();
  return addr
    ? '<a class="ctmail" href="mailto:' + esc(addr) + '" title="Write to ' +
      esc(c.n || addr) + '">✉</a>'
    : '<span class="ctmail off" aria-hidden="true">✉</span>';
}
function ctsRow(c, i){
  return '<div class="ctrow" data-i="' + i + '">' + avatarHTML(c) +
    '<input class="ctf ctf-n" data-k="n" type="text" autocomplete="off" ' +
      'placeholder="Name, or a line — Main line" aria-label="Name or line" value="' +
      esc(c.n) + '">' +
    '<input class="ctf ctf-r" data-k="r" type="text" autocomplete="off" ' +
      'placeholder="Title / role" aria-label="Title or role" value="' + esc(c.r) + '">' +
    '<input class="ctf ctf-e" data-k="e" type="email" autocomplete="off" spellcheck="false" ' +
      'placeholder="email" aria-label="Email address" value="' + esc(c.e) + '">' +
    '<input class="ctf ctf-p" data-k="p" type="tel" autocomplete="off" ' +
      'placeholder="phone" aria-label="Direct phone number" value="' + esc(c.p) + '">' +
    '<span class="ctacts">' + mailBtn(c) + telBtn(c.p, c.n || c.e) +
    '<button type="button" class="ctdel" title="Remove this contact" ' +
      'aria-label="Remove this contact">×</button></span></div>';
}
function ctsRows(dom){
  const list = CONTACTS.get(dom) || [];
  if(!list.length) return '<p class="ctempty">' + CTEMPTY + '</p>';
  return '<div class="cthd"><span></span><span>Name</span><span>Title / role</span>' +
    '<span>Email</span><span>Phone</span><span></span></div>' + list.map(ctsRow).join('');
}
function mapHref(v){
  const s = String(v || '').trim();
  return s ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s) : '';
}
/* The address line. Empty is the normal state until somebody fills it in, so it says
   what it wants rather than sitting there blank. */
function addrBlock(dom){
  const v = String(ADDR.get(dom) || '');
  const href = mapHref(v);
  return '<div class="ctag">' +
    '<span class="ctagi" aria-hidden="true">\u2302</span>' +
    '<input class="ctaf" data-k="a" type="text" autocomplete="off" ' +
      'placeholder="Street address — where you would post a card" ' +
      'aria-label="Agency address" value="' + esc(v) + '">' +
    '<a class="ctmap" target="_blank" rel="noopener noreferrer"' +
      (href ? ' href="' + esc(href) + '"' : ' hidden') +
      ' title="Open this address in a map">map \u2197</a></div>';
}
function contactsBlock(dom){
  return '<div class="cts" data-dom="' + esc(dom) + '">' +
    '<div class="ctsh"><b>Contacts</b><span class="ctsn">' +
      (CONTACTS.get(dom) || []).filter(ctsReal).length + '</span>' +
    '<button type="button" class="ctadd">+ Add</button></div>' +
    addrBlock(dom) +
    '<div class="ctlist">' + ctsRows(dom) + '</div></div>';
}
/* The store lands a beat after the first paint, so any panel already open when the
   contacts arrive gets rebuilt rather than sitting there empty. */
function repaintContacts(){
  document.querySelectorAll('.cts').forEach(box => {
    const dom = box.dataset.dom;
    if(!dom || box.contains(document.activeElement)) return;
    const a = box.querySelector('.ctlist');
    if(a) a.innerHTML = ctsRows(dom);
    const af = box.querySelector('.ctaf');
    if(af && af !== document.activeElement){
      af.value = String(ADDR.get(dom) || '');
      const m = box.querySelector('.ctmap'), h = mapHref(af.value);
      if(m){ if(h){ m.href = h; m.hidden = false; } else m.hidden = true; }
    }
    paintCtsChip(dom);
  });
  /* Old split-list rows folded in on load: put the merged list back once. */
  for(const dom of [...MIGRATED]) queueSaveContacts(dom);
  /* every chip, once: grouped by agency in a single pass */
  const by = new Map();
  document.querySelectorAll('.agmail,.agtel').forEach(el => { const d = el.dataset.dom; if(!d) return; if(!by.has(d)) by.set(d, []); by.get(d).push(el); });
  for(const [d, els] of by) paintCtsChip(d, els);
}
/* ---- the panel, opened from any tab ---- */
const ctmodal = document.getElementById('ctmodal');
let CTLAST = null;
function openContacts(dom){
  if(!dom || !ctmodal) return;
  CTLAST = document.activeElement;
  ctmodal.innerHTML = '<div class="ctbox" role="dialog" aria-modal="true" ' +
    'aria-label="Contacts for ' + esc(ctsTitle(dom)) + '">' +
    '<div class="ctbhd"><h3>' + esc(ctsTitle(dom)) + '</h3><s>' +
    esc([AGCITY.get(ctsTitle(dom).toLowerCase()), isDom(dom) ? dom : 'not in the directory']
      .filter(Boolean).join(' · ')) +
    '</s>' +
    '<button type="button" class="ctbx" data-ctclose="1" aria-label="Close">×</button></div>' +
    '<div class="ctbbody">' + contactsBlock(dom) + '</div></div>';
  ctmodal.dataset.on = '1';
  document.body.style.overflow = 'hidden';
  const f = ctmodal.querySelector('.ctf');
  if(f) f.focus();
}
function closeContacts(){
  if(!ctmodal || ctmodal.dataset.on !== '1') return;
  flushContacts();
  ctmodal.dataset.on = '0';
  ctmodal.innerHTML = '';
  document.body.style.overflow = '';
  if(CTLAST && CTLAST.focus) try{ CTLAST.focus(); }catch(e){}
  CTLAST = null;
}
/* Repaint just this model wherever it appears. A full re-render would fold every
   agency in the Directory shut and lose the reader's place mid-list. */
/* Who lit this face, said in one line under the lamps: a glowing dot in the lamp's colour,
   then the names on that lamp. On the shared tabs it is everyone, you first; in your own
   Lumen it is everyone else, under "Also lit by". */
function litWhoLine(key){
  const priv = PRIV();
  const g = {g: [], y: [], r: []};
  if(!priv && ME && PEOPLE.has(ME) && g[MARKS.get(key)]) g[MARKS.get(key)].push(PEOPLE.get(ME).n + ' (you)');
  try{ for(const x of peersOn(key)) if(g[x.v] && PEOPLE.has(x.pid)) g[x.v].push(PEOPLE.get(x.pid).n); }catch(e){}
  const parts = ['g', 'y', 'r'].filter(v => g[v].length);
  if(!parts.length) return '<div class="litwl" data-wl="' + esc(key) + '" hidden></div>';
  return '<div class="litwl" data-wl="' + esc(key) + '">' + (priv ? '<span class="litwl-lab">Also lit by</span>' : '') +
    parts.map(v => '<span class="litwl-' + v + '"><i></i>' + esc(g[v].join(', ')) + '</span>').join('') + '</div>';
}
function litWhoRepaint(key){
  document.querySelectorAll('.litwl[data-wl]').forEach(el => {
    if(el.dataset.wl !== key) return;
    const t = document.createElement('div'); t.innerHTML = litWhoLine(key);
    el.replaceWith(t.firstChild);
  });
}
function paintMark(key){
  try{ setTimeout(() => litWhoRepaint(key), 0); }catch(e){}
  const cls = MARKS.get(key) || '';
  const eff = lampOf(key);
  let sel;
  try{ sel = '.mk[data-mk="' + CSS.escape(key) + '"]'; }
  catch(e){ sel = null; }
  const boxes = sel ? document.querySelectorAll(sel)
    : Array.from(document.querySelectorAll('.mk')).filter(b => b.dataset.mk === key);
  boxes.forEach(box => {
    box.querySelectorAll('i[data-v]').forEach(i => {
      const on = !!eff && i.dataset.v === eff;     // one lamp, never two
      const team = on && cls !== eff;
      i.classList.toggle('on', on);
      i.classList.toggle('team', team);
    });
    const nm = box.nextElementSibling;
    if(nm){
      nm.classList.remove('lit-g', 'lit-y', 'lit-r');   // a red tube used to stick
      if(eff) nm.classList.add('lit-' + eff);
    }
    /* Repainting in place keeps the scroll position, so it has to keep the rings and
       the border in step with the click too, or a click looks unlike a reload. */
    box.querySelectorAll('i[data-v]').forEach(i => {
      const r = lampRing(key, i.dataset.v);
      if(r.a){
        i.dataset.ids = '1';
        i.style.setProperty('--ids', r.a.slice(r.a.indexOf('--ids:') + 6, -1));
      }else{
        delete i.dataset.ids;
        i.style.removeProperty('--ids');
      }
    });
    const card = box.closest('.litrow');
    if(card){ if(eff) card.dataset.lamp = eff; else delete card.dataset.lamp; }
    /* the counts under the lamps follow the click too */
    if((card && card.classList.contains('litv1')) || box.closest('.bkcard')) box.querySelectorAll('i[data-v]').forEach(i => {
      const o = i.querySelector('.lcn'); if(o) o.remove();
      try{ i.insertAdjacentHTML('beforeend', lampCount(key, i.dataset.v)); }catch(e){}
    });
  });
}
/* A model lit before the lamps started filing their own log entry - or lit on a build
   that did not - leaves a mark with nothing in the log to hang it on, so its agency has
   nothing to fold open. On load, look any such mark up in the Directory and write the
   entry it should have had. */
function reconcileMarks(){
  if(!MARKS.size) return;
  const logged = new Set();
  for(const v of VIEWS.values())
    for(const e of v.e)
      if((e[1] === 'model' || e[1] === 'arrival') && e[4]) logged.add(normKey(e[4]));
  for(const r of RUNS.values())
    for(const a of (r.arrivals || [])) if(a.url) logged.add(normKey(a.url));
  const want = new Set([...MARKS.keys()].filter(k => !logged.has(k)));
  if(!want.size) return;
  const found = new Map();
  for(const a of AG){
    for(const b of a.boards){
      for(const m of b.m){
        const raw = m[1];
        const href = raw.charAt(0) === '|' ? raw.slice(1) : b.p + raw;
        const k = normKey(href);
        if(want.has(k) && !found.has(k))
          found.set(k, {nm: m[0] || '(unnamed)', url: href,
                        meta: a.name + (a.city ? ' \u00b7 ' + a.city : '')});
      }
    }
  }
  for(const [mk, info] of found){
    const at = MARKAT.get(mk) || '';
    const day = /^\d{4}-\d{2}-\d{2}/.test(at) ? at.slice(0, 10) : localDay(new Date());
    remember('model', info.url, info.nm, info.meta, info.url, {quiet: true, day: day});
  }
  stampMarks();
}
/* A lamp lit before the time was being recorded has no moment on it. Give it one now,
   once, and write it down - otherwise it would drift to "now" on every reload. */
async function stampMarks(){
  const d = new Date(), at = localDay(d) + ' ' + hhmm(d);
  const shards = new Set();
  for(const k of MARKS.keys())
    if(!MARKAT.has(k)){ MARKAT.set(k, at); shards.add(markShard(k)); }
  if(!shards.size || !DB) return;
  if(ME){ await saveMyMarks(); return; }
  for(const sid of shards){
    const e = {}, t = {};
    for(const [k, v] of MARKS) if(markShard(k) === sid){
      e[k] = v;
      const a = MARKAT.get(k);
      if(a) t[k] = a;
    }
    try{ await DB.doc('marks/' + sid).set({e: e, t: t}); }catch(err){}
  }
}
async function setMark(key, val, about){
  if(!SIGNED()){ nudgeSignIn(); return; }
  const now = MARKS.get(key) || null;             // YOUR lamp - each account has its own
  const next = (now === val) ? null : val;        // clicking your lit lamp puts it out
  const d0 = new Date();
  const stamp = localDay(d0) + ' ' + hhmm(d0) + ':' + String(d0.getSeconds()).padStart(2, '0');
  const my = myLampRec();
  if(next){
    MARKS.set(key, next);
    if(!MARKAT.has(key)) MARKAT.set(key, localDay(d0) + ' ' + hhmm(d0));
    my.m.set(key, stamp);
  }else{ MARKS.delete(key); MARKAT.delete(key); my.m.delete(key); }
  if(ME){ my.e = new Map(MARKS); my.t = new Map(MARKAT); }
  // lighting someone is itself a decision worth keeping, so it files them in the work
  // log there and then - you should not have to open the profile to have a record of it
  /* Lighting someone is a decision worth keeping. Some lamps (an arrival with no
     profile link) carry no data-url; fall back to the mark key so the row is filed
     either way, rather than silently skipping the log. */
  if(next){
    const ref = (about && about.url) || key;
    remember('model', ref, (about && about.nm) || '', (about && about.meta) || '',
             (about && about.url) || '', {quiet: true});
  }
  // only a re-render when the lights are themselves the filter and membership changes
  // on the Lumen tab the light IS the membership, so it has to be rebuilt
  /* The lamp is the source of truth: anything lit and unlogged gets filed, whichever
     pane the click came from. Runs on every change, and exits at once when clean. */
  LIVE.mineAt = Date.now();
  sharedDirty();
  if(logReady) setTimeout(() => { try{ reconcileMarks(); }catch(e){} }, 0);
  if(LITV(VIEW) || checked('mark').length) refresh();
  else { paintMark(key); counts(); litBadge(); }
  blogAdd(next || 'x', (about && about.url) || key,
          (about && about.nm) || '', (about && about.meta) || '');
  await saveMyMarks(key);
}
const LAMPT = {g: 'Interested in booking', y: 'Pending \u2014 still deciding',
               r: 'Ruled out \u2014 does not fit the criteria'};
const LAMPA = {g: 'Interested in booking', y: 'Pending',
               r: 'Does not fit the criteria'};
const lamps = (key, nm, meta, url) => {
  if(window.__illuVoteLamps) return window.__illuVoteLamps(key, nm, meta, url);
  const m = MARKS.get(key) || '';
  const one = v => {
    const r = lampRing(key, v);
    const eff = lampOf(key);
    const on = !!eff && eff === v;               // one lamp per card, never two
    const team = on && m !== v;
    return '<i class="' + v + (on ? ' on' : '') + (team ? ' team' : '') +
      '" data-v="' + v + '" ' +
      'role="button" tabindex="0" aria-label="' + LAMPA[v] + '" title="' + LAMPT[v] +
      (r.t ? ' \u2014 ' + esc(r.t) : '') + '"' + r.a + '></i>';
  };
  return '<span class="mk" data-mk="' + esc(key) + '" data-nm="' + esc(nm || '') +
    '" data-meta="' + esc(meta || '') + '" data-url="' + esc(url || '') + '">' +
    one('g') + one('y') + one('r') + '</span>';
};
const litClass = key => {
  const m = lampOf(key);
  return m ? ' lit lit-' + m : '';
};
/* Anything inside the lamp pair is swallowed whole - including the sliver between the
   two lamps, which otherwise falls through to the link and opens the agency's site. */
function markClick(e){
  const box = e.target.closest('.mk');
  if(!box) return false;
  e.preventDefault(); e.stopPropagation();
  if(e.target.closest('.lcn')) return true;
  const lamp = e.target.closest('.mk i[data-v]');
  if(lamp) setMark(box.dataset.mk, lamp.dataset.v, box.dataset);
  return true;
}
const MEAS = new Map();
/* Hand corrections, kept in their own collection ("medits", sharded exactly as the
   measurements are) and layered over the crawled figures at read time. A field present
   here wins; a field absent falls through to what the agency published; a field set to
   null is a deliberate blank. Nothing here is ever written into "meas", so the crawler
   and the corrections cannot overwrite one another. */
const EDITS = new Map();
const MXF = ['ht', 'bu', 'wa', 'hp', 'eu', 'us'];
const measShard = k => 'e' + shard128(k).toString(16);
function measRec(key){
  const rec = MEAS.get(key);
  const ed = EDITS.get(key);
  if(!ed) return rec;
  const out = rec ? rec.slice() : [null, null, null, null, null, null, null];
  MXF.forEach((f, i) => { if(ed[f] !== undefined) out[i] = ed[f]; });
  return out;
}
const measHas = key => MEAS.has(key) || EDITS.has(key);
const measEdited = key => {
  const e = EDITS.get(key);
  return !!(e && MXF.some(f => e[f] !== undefined));
};
let measState = 'idle';   // idle | loading | ready | off
/* The same handful of thousand addresses are normalised over and over, and parsing a
   URL is not free. It is a pure function of its argument, so the answer is kept - no
   invalidation to get wrong, only a bound on how much is kept. */
const NKC = new Map();
/* Building a URL object costs more than everything else this page does at startup:
   twenty-three thousand addresses, each parsed three times over before the first screen
   appears, was a fifth of the whole boot on a phone. Nearly every address an agency
   publishes is an ordinary absolute http(s) link with no credentials, port, dot-segment
   or percent-escape, and for those the answer can be read straight off the string. The
   pattern below matches only that shape; anything else - a relative link, a port, a
   "/../", an escape - falls through to the real parser, so the two can never disagree. */
/* The character classes are the whole safety argument, so they are narrow on purpose:
   only what the URL parser is guaranteed to hand back untouched. Anything else - a
   letter outside ASCII, a space, an escape already in the string - is re-encoded by the
   parser (balticmodel.com publishes Lithuanian names in its paths, and "ė" comes back
   as "%C4%97"), and a key that disagreed with the stored one would quietly unlamp a
   model. Those go the slow way. */
const NKFAST =
  /^https?:\/\/([A-Za-z0-9.-]+)(\/[A-Za-z0-9\-._~!$&'()*+,;=:@\/]*)?(\?[A-Za-z0-9\-._~!$&'()*+,;=:@\/?]*)?(?:#.*)?$/;
/* One collator for the whole page. Making one is expensive; comparing with it is not. */
const COLLATOR = (() => {
  try{ return new Intl.Collator(undefined, {sensitivity: 'base'}); }catch(e){ return null; }
})();
const COLL = COLLATOR
  ? (x, y) => COLLATOR.compare(String(x), String(y))
  : (x, y) => String(x).localeCompare(String(y), undefined, {sensitivity: 'base'});
const normKey = u => {
  const had = NKC.get(u);
  if(had !== undefined) return had;
  let out;
  const m = NKFAST.exec(u);
  if(m && (!m[2] || m[2].indexOf('/.') < 0)){
    let h = m[1].toLowerCase();
    if(h.startsWith('www.')) h = h.slice(4);
    let p = m[2] || '';
    let e = p.length;
    while(e > 0 && p.charCodeAt(e - 1) === 47) e--;   /* trailing slashes */
    if(e !== p.length) p = p.slice(0, e);
    out = 'https://' + h + p + (m[3] || '');
  }else{
    try{
      const x = new URL(u, 'https://x.invalid');
      let h = x.hostname.toLowerCase();
      if(h.startsWith('www.')) h = h.slice(4);
      out = 'https://' + h + x.pathname.replace(/\/+$/, '') + (x.search || '');
    }catch(e){ out = u; }
  }
  if(NKC.size > 60000) NKC.clear();
  NKC.set(u, out);
  return out;
};
async function loadMeas(){
  if(measState !== 'idle') return;
  /* Arrivals is the view the page opens on, and it now asks for measurements. That ask
     can land before the store has finished connecting; calling it "off" then would
     wedge every tab until a reload. Only a settled session with no store is really off. */
  if(!DB){ if(logSettled) measState = 'off'; return; }
  measState = 'loading';
  try{
    const snap = await DB.collection('meas').limit(5000).get();
    const docs = (snap && snap.docs) ? snap.docs : (snap || []);
    for(const d of docs){
      const data = docOf(d);
      for(const [k, v] of Object.entries((data && data.e) || {})) MEAS.set(k, v);
    }
    await loadEdits();
    measState = 'ready';
  }catch(e){ measState = 'off'; }
  /* The first nine can only be chosen once the figures are in. Yesterday's draw is put
     back if there is one, so the morning list does not reshuffle under the scout. */
  try{
    await loadKfit();                  /* the scout's own bands, before anything is scored */
    await loadRecos();
    if(!RECOSHOWN.length) recoDraw(false);
    paintKfit();
  }catch(e){}
  refresh();
}
/* [ht cm, bust cm, waist cm, hips cm, shoe EU, shoe US] - nulls where the agency
   published nothing. Read out in whichever unit the sidebar is set to. */
function recOf(rec){
  const L = n => n == null ? null : (lenUnit === 'in' ? Math.round(n / 2.54 * 10) / 10 : n);
  let sh = null;
  if(shoeUnit === 'eu') sh = rec[4];
  else if(shoeUnit === 'us') sh = rec[5];
  else if(rec[4] != null) sh = Math.round((rec[4] / 1.5 - 1.5) * 10);
  return {ht: L(rec[0]), bu: L(rec[1]), wa: L(rec[2]), hp: L(rec[3]), sh: sh};
}
async function readAll(coll){
  try{
    const snap = await DB.collection(coll).orderBy('day','desc').limit(420).get();
    const docs = (snap && snap.docs) ? snap.docs : (snap || []);
    return docs.map(d => docOf(d)).filter(Boolean);
  }catch(e){ return []; }
}
async function initLog(){
  DB = await use('db').catch(() => null);
  logSettled = true;
  if(!DB){ renderLog(); refresh(); return; }
  const [vs, rs] = await Promise.all([readAll('views'), readAll('log')]);
  for(const v of vs){
    if(!v.day) continue;
    v.e = Array.isArray(v.e) ? v.e : [];
    /* Anything filed before this load finished lives only in memory. Merge it in
       rather than replacing the day, or those entries are lost on every reload. */
    const pre = VIEWS.get(v.day);
    if(pre && Array.isArray(pre.e) && pre.e.length){
      const have = new Set(v.e.map(r => r[0]));
      for(const row of pre.e) if(!have.has(row[0])){ v.e.push(row); VIEWDIRTY.add(v.day); }
    }
    VIEWS.set(v.day, v);
    for(const row of v.e){
      const had = KEYDAY.get(row[0]);
      if(!had || v.day < had) KEYDAY.set(row[0], v.day);
    }
  }
  for(const day of VIEWS.keys()) if(!vs.some(v => v.day === day)) VIEWDIRTY.add(day);
  for(const r of rs) if(r.day) RUNS.set(r.day, r);
  await Promise.all([loadMarks(), loadIG(), loadMIG(), loadPrefs(), loadPics(),
                     loadContacts(), loadGone(), loadBook(), loadAgDel(), loadSiteStat(), loadMDel()]);
  try{ repaintContacts(); }catch(e){}
  logReady = true;
  await flushViewDays();
  reconcileMarks();
  buildYears(); renderLog(); setView(VIEW); markSeen(); updateBadge();
  use('downloads').then(d => { DOWN = d; syncExportBtn(); }, () => {});
  /* how full the file store is, so the chip says a number rather than waiting to be
     asked - and the Booking bar redraws once the answer lands */
  stoRead().then(() => { try{ if(VIEW === 'bk') renderBook(); }catch(e){} }, () => {});
  liveStart();
  setTimeout(siteNotify, 1500);
}

/* One row per thing, but filed under the day you LAST opened it, so a morning's work
   always shows up under today rather than ticking a counter on an old row. The first
   date is kept in the row (slot 7) and shown on the count badge. */
const VIEWDIRTY = new Set();
/* The store arrives a beat after the page is clickable. Never drop a write because
   it has not: mark the day dirty and flush it when the store is ready. */
async function saveViewDay(day){
  const v = VIEWS.get(day);
  if(!v) return;
  if(!logReady || !DB){ VIEWDIRTY.add(day); return; }
  try{
    try{
      const srv = docOf(await DB.doc('views/' + day).get());
      if(srv && Array.isArray(srv.e)){
        const have = new Set(v.e.map(r => r[0]));
        for(const r of srv.e) if(!have.has(r[0])) v.e.push(r);
      }
    }catch(e){}
    await DB.doc('views/' + day).set({day: day, e: v.e}); VIEWDIRTY.delete(day); }
  catch(e){ VIEWDIRTY.add(day); }
}
async function flushViewDays(){
  if(!logReady || !DB) return;
  for(const day of [...VIEWDIRTY]) await saveViewDay(day);
}
/* A write that failed once should not sit there until the next reload. */
setInterval(() => {
  if(VIEWDIRTY.size) flushViewDays();
  if(logReady) { try{ reconcileMarks(); }catch(e){} }
}, 15000);
document.addEventListener('visibilitychange', () => {
  if(!document.hidden && VIEWDIRTY.size) flushViewDays();
});
async function remember(kind, ref, name, meta, url, opts){
  if(!SIGNED()) return;                    // an unsigned visit leaves no trail
  const quiet = !!(opts && opts.quiet);
  const k = hkey(ref);
  const now = new Date();
  /* A row normally lands on today, but the reconciler files a lit model under the day
     its lamp was actually lit, so the log matches the lamps however the click reached us. */
  const today = (opts && opts.day) || localDay(now);
  /* One row per thing PER DAY. Coming back to the same model tomorrow files a fresh
     entry under tomorrow, so the log reads as a day-by-day record of what you looked at.
     Within one day the row's counter ticks instead of repeating the name. Slot 7 keeps
     the first day it was ever filed, so a row can still show its first sighting. */
  const first = KEYDAY.get(k) || today;
  const v = VIEWS.get(today) || {day: today, e: []};
  const row = v.e.find(r => r[0] === k);
  if(row){
    if(quiet && !(opts && opts.state)){
      renderLog(); markSeen();
      return;                   // already filed today; do not inflate today's count
    }
    if(meta) row[3] = meta;
    if(url && !row[4]) row[4] = url;
    if(!row[7]) row[7] = first;
    if(opts && opts.state) row[8] = opts.state;
    /* Slot 9 is who. A row is one thing on one day, and more than one person may have
       come to it, so it keeps them in the order they arrived - first to notice it on
       the left, last to touch it on the right. Six is more than a board ever needs. */
    const who = Array.isArray(row[9]) ? row[9].slice() : (row[9] ? [row[9]] : []);
    if(ME && who.indexOf(ME) < 0){ who.push(ME); if(who.length > 6) who.shift(); }
    row[9] = who;
    row[6] = (row[6] || 1) + 1;
    VIEWS.set(today, v);
    await saveViewDay(today);
    try{ updateBadge(); renderLog(); markSeen(); }catch(err){}
    return;
  }
  v.e.push([k, kind, name, meta, url, hhmm(now), 1, first,
            (opts && opts.state) ? opts.state : null, ME ? [ME] : []]);
  VIEWS.set(today, v);
  if(!KEYDAY.has(k)) KEYDAY.set(k, today);
  await saveViewDay(today);
  try{ updateBadge(); renderLog(); markSeen(); }catch(err){}
}

/* ================= arrivals ================= */
function arrivalMeta(a){
  if(a.meta) return a.meta;
  const bits = [];
  let head = (a.g === 'M' || a.g === 'F') ? a.g : '';
  if(a.ht) head = (head ? head + ' ' : '') + a.ht + 'cm';
  if(head) bits.push(head);
  if(a.agency) bits.push(a.agency);
  if(a.city) bits.push(a.city); else if(a.country) bits.push(a.country);
  return bits.join(' · ');
}
/* measurement bounds, the same rule the morning file uses: the leading number of
   a published value is its centimetre figure ("81.25cm/32\" A" -> 81.25). A model
   whose agency published nothing for a measurement drops out only once a bound is
   set on it — there is no value to compare against. */
let BND = null;
const bound = k => {
  const el = document.querySelector('input[data-m="' + k + '"]');
  if(!el || el.value === '') return null;
  const v = parseFloat(el.value);
  return isNaN(v) ? null : v;
};
async function loadEdits(){
  if(!DB) return;
  try{
    const snap = await DB.collection('medits').limit(400).get();
    const docs = (snap && snap.docs) ? snap.docs : (snap || []);
    for(const d of docs){
      const data = docOf(d);
      for(const [k, v] of Object.entries((data && data.e) || {})) if(v) EDITS.set(k, v);
    }
  }catch(e){}
}
async function saveEdits(key){
  if(!DB) return;
  const sid = measShard(key), e = {};
  for(const [k, v] of EDITS) if(measShard(k) === sid) e[k] = v;
  try{ await DB.doc('medits/' + sid).set({e: e}); }catch(err){}
}
const MXSAVE = new Map();
function queueSaveEdits(key){
  clearTimeout(MXSAVE.get(key));
  MXSAVE.set(key, setTimeout(() => { MXSAVE.delete(key); saveEdits(key); }, 700));
}
function flushEdits(){
  for(const [k, t] of MXSAVE){ clearTimeout(t); saveEdits(k); }
  MXSAVE.clear();
}
window.addEventListener('beforeunload', flushEdits);
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden') flushEdits();
});
function mxNum(v){
  if(v === null || v === undefined || String(v).trim() === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : Math.round(n * 10) / 10;
}
const mxPub = (key, f) => {
  const rec = MEAS.get(key);
  return rec ? mxNum(rec[MXF.indexOf(f)]) : null;
};
const mxFixed = (key, f) => {
  const e = EDITS.get(key);
  return !!(e && e[f] !== undefined);
};
function mxSet(key, f, v){
  const ed = EDITS.get(key) || {};
  /* Typing the published figure back is not a correction - drop the override rather
     than storing a value identical to the one underneath it. */
  if(v === mxPub(key, f)) delete ed[f]; else ed[f] = v;
  if(MXF.some(x => ed[x] !== undefined)) EDITS.set(key, ed); else EDITS.delete(key);
  queueSaveEdits(key);
}
function mxRevert(key, f){
  const ed = EDITS.get(key);
  if(!ed) return;
  delete ed[f];
  if(MXF.some(x => ed[x] !== undefined)) EDITS.set(key, ed); else EDITS.delete(key);
  queueSaveEdits(key);
}
function mxWhy(key, f){
  const pub = mxPub(key, f);
  if(pub == null) return 'Not published — type to add';
  return mxFixed(key, f) ? 'Published: ' + pub + ' — corrected by hand' : 'As published';
}
/* One figure on a card: the label, the field, and - once it has been corrected - the
   little hook that puts the published number back. */
function mxCell(key, f, lbl, val, suf, ftMode, hit){
  const field = ftMode
    ? '<input class="mxi mxft" type="text" inputmode="text" data-ft="1" data-mk="' + esc(key) +
        '" data-f="' + f + '" value="' + (val == null ? '' : esc(String(val))) +
        '" placeholder="–" aria-label="' + esc(lbl || f) + '" ' +
        'title="' + esc(mxWhy(key, f)) + ' \u2014 type as 5\u20329 or 5\u2032 9\u2033">'
    : '<input class="mxi" type="number" step="0.5" inputmode="decimal" data-mk="' + esc(key) +
        '" data-f="' + f + '" value="' + (val == null ? '' : val) + '" placeholder="–" ' +
        'aria-label="' + esc(lbl || f) + '" title="' + esc(mxWhy(key, f)) + '">';
  return '<span class="mxc' + (mxFixed(key, f) ? ' fx' : '') + (hit ? ' inband' : '') +
    '" data-f="' + f + '"' + (hit ? ' title="Inside your Korea-fit band"' : '') + '>' +
    '<i>' + lbl + '</i>' + field +
    (suf ? '<u>' + suf + '</u>' : '') +
    '<button type="button" class="mxrv" data-rv="' + f + '" data-mk="' + esc(key) +
      '" title="Put the published figure back" aria-label="Revert to the published figure">' +
      '↺</button></span>';
}
/* Lengths follow the sidebar's unit, so a value typed while it reads inches is converted
   back before it is stored - the store is always centimetres. */
const mxToCm = (n, fld) => (n == null) ? null
  : (unitFor(fld) === 'in' ? Math.round(n * 2.54 * 10) / 10 : n);
document.addEventListener('input', e => {
  const f = e.target.closest && e.target.closest('.mxi');
  if(!f || !f.dataset.mk) return;
  const key = f.dataset.mk, fld = f.dataset.f;
  let v;
  if(f.dataset.ft) v = ftInToCm(f.value);
  else {
    const raw = mxNum(f.value);
    v = (fld === 'eu' || fld === 'us') ? raw : mxToCm(raw, fld);
  }
  mxSet(key, fld, v);
  const cell = f.closest('.mxc');
  if(cell) cell.classList.toggle('fx', mxFixed(key, fld));
  f.title = mxWhy(key, fld);
});
/* A field inside a card must not reach the card - the photograph and the profile link
   both answer a click of their own. */
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('.mxi,.mxrv');
  if(!t) return;
  e.stopPropagation();
  if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  const rv = e.target.closest('.mxrv');
  if(rv){ e.preventDefault(); mxRevert(rv.dataset.mk, rv.dataset.rv); flushEdits(); refresh(); }
}, true);
document.addEventListener('keydown', e => {
  const f = e.target.closest && e.target.closest('.mxi');
  if(!f) return;
  if(e.key === 'Enter' || e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); f.blur(); }
}, true);
document.addEventListener('focusout', e => {
  if(e.target.closest && e.target.closest('.mxi')) flushEdits();
}, true);
function readBounds(){
  BND = {ht: [bound('ht-lo'), bound('ht-hi')], bu: [bound('b-lo'), bound('b-hi')],
         wa: [bound('w-lo'), bound('w-hi')],   hp: [bound('h-lo'), bound('h-hi')],
         sh: [bound('s-lo'), bound('s-hi')]};
  BND.any = Object.keys(BND).some(k => Array.isArray(BND[k]) &&
                                       (BND[k][0] !== null || BND[k][1] !== null));
  return BND;
}
const leadNum = v => {
  if(v == null) return null;
  const m = String(v).match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
};
function inRange(val, lo, hi){
  if(lo === null && hi === null) return true;
  if(val === null || val === undefined || val === '') return false;
  const n = parseFloat(val);
  if(isNaN(n)) return false;
  if(lo !== null && n < lo) return false;
  if(hi !== null && n > hi) return false;
  return true;
}
/* Every conversion is done once, when the model is crawled, and arrives in `mm`:
   each length carries cm and in, each shoe carries eu, us and foot mm. All this
   does is read the figure in whichever unit the sidebar is set to. Records written
   before that existed fall back to the published strings, cm converted on the fly. */
function measOf(a){
  if(a.mm){
    const L = k => (a.mm[k] ? a.mm[k][lenUnit] : null);
    return {ht: L('ht'), bu: L('b'), wa: L('w'), hp: L('h'),
            sh: a.mm.shoe ? a.mm.shoe[shoeUnit] : null};
  }
  const toUnit = n => (n == null) ? null : (lenUnit === 'in' ? Math.round(n / 2.54 * 10) / 10 : n);
  const md = {};
  for(const pair of (a.meas || [])) if(pair) md[String(pair[0]).toUpperCase()] = pair[1];
  return {ht: toUnit(a.ht != null ? a.ht : leadNum(md.HT)),
          bu: toUnit(leadNum(md.B != null ? md.B : md.CH)),
          wa: toUnit(leadNum(md.W)), hp: toUnit(leadNum(md.H)), sh: null};
}

/* The scan re-reads every board every morning, so a face that is still on a new-faces
   page turns up again and again. Only the first sighting is a new face: later ones are
   folded into it, keeping the original date, and filling in anything the first pass did
   not have yet (a photo, measurements, a fuller name). */
function arrivalRows(){
  const first = new Map();
  const days = [...RUNS.keys()].sort();              // oldest first: the first sighting wins
  for(const day of days){
    for(const a of (RUNS.get(day).arrivals || [])){
      const k = a.url ? normKey(a.url)
        : 'n:' + String(a.name || '').toLowerCase().trim() + '|' +
                 String(a.agency || '').toLowerCase().trim();
      const had = first.get(k);
      if(!had){ first.set(k, Object.assign({}, a, {day: day, again: 0})); continue; }
      had.again++;
      // seen a second time without the first-sighting flag means it is confirmed now
      if(!a.pending) delete had.pending;
      const bare = x => x === undefined || x === null || x === '' ||
                        (Array.isArray(x) && !x.length);
      for(const f of ['name','ht','g','agency','city','country','tier','photo','meas','meta','when'])
        if(bare(had[f]) && !bare(a[f])) had[f] = a[f];
    }
  }
  const out = [...first.values()];
  out.sort((x,y) => y.day.localeCompare(x.day));
  return out;
}
// every arrival the scan has ever recorded stays on the board; nothing ages out
function inPeriod(){ return true; }
function passesFilters(a){
  if(litWho && !whoHas(litWho, normKey(a.url || 'name:' + a.name))) return false;
  const term = q.value.trim().toLowerCase();
  const sexes = checked('sex'), regions = checked('region'), tiers = checked('tier');
  if(sexes.length && !sexes.includes(a.g || '?')) return false;
  if(regions.length && !regions.includes(REGION[a.country] || 'Unknown')) return false;
  if(tiers.length && !tiers.includes(a.tier || 'unlabelled')) return false;
  const marks = checked('mark');
  if(marks.length && !marks.includes(lampOf(normKey(a.url || 'name:' + a.name)) || ''))
    return false;
  if(term){
    const hay = ((a.name||'') + ' ' + (a.agency||'') + ' ' + (a.city||'') + ' '
                 + (a.country||'') + ' ' + (a.division||'')).toLowerCase();
    if(!hay.includes(term)) return false;
  }
  if(BND && BND.any){
    const m = measOf(a);
    if(!inRange(m.ht, BND.ht[0], BND.ht[1])) return false;
    if(!inRange(m.bu, BND.bu[0], BND.bu[1])) return false;
    if(!inRange(m.wa, BND.wa[0], BND.wa[1])) return false;
    if(!inRange(m.hp, BND.hp[0], BND.hp[1])) return false;
    if(!inRange(m.sh, BND.sh[0], BND.sh[1])) return false;
  }
  return true;
}
function card(a, fresh){
  const key = normKey(a.url || 'name:' + a.name);
  return modelCard({key: key, nm: a.name || '(unnamed)', href: a.url || '',
                    ag: a.agency || '', city: a.city || '', country: a.country || '',
                    div: a.division || '', g: a.g || '?', t: a.tier || ''},
                   {once: a.pending, day: a.when || '', fresh: !!fresh,
                    dayTitle: 'When the scan found this face'});
}
function cardOld(a){
  // The card is no longer itself a link. A transparent sheet carries the link, and the
  // lamps sit on a layer above it, so a click on a lamp cannot reach the anchor at all.
  return a.url
    ? '<div class="card' + (a.pending ? ' pend' : '') + '" data-arr="' + esc(a.url) + '">' +
      '<a class="cardhit" href="' + esc(a.url) + '" target="_blank" rel="noopener noreferrer" ' +
      'aria-label="Open ' + esc(a.name) + '"></a>' + inner + '</div>'
    : '<div class="card' + (a.pending ? ' pend' : '') + '">' + inner + '</div>';
}
/* ================= recommendations =================
   The scan brings in whoever the agencies published overnight, which on a quiet day is
   nobody. The directory, though, already holds twenty-odd thousand measured models, and
   the question a Seoul booker actually asks is not "who is new" but "who here would
   place in this market". So the page answers that itself, out of the measurements it
   already has, with no crawl and no scheduled run in the way - press the button and the
   next nine come up.

   The bands below are the whole of the judgement, and they are written down rather than
   buried: they sit in the sidebar where they can be changed, and every card says in
   plain words why it was picked. Nothing here is a secret ranking. A model is scored on
   how near the middle of each band their published figures fall; a figure the agency
   never published cannot score, so a model with a full set outranks one with a height
   and nothing else, and that is stated on the card too.

   Already-lit models are left out: a lamp means the scout has made up their mind, and
   the point of this list is the ones they have not seen yet. */
/* ---- Dates of birth, where the agency publishes them ------------------------
   Agency boards carry minors as a matter of course, and a booking tool that
   scores bodies against a measurement band must never put a child in front of a
   booker. Where a profile prints a date of birth we keep the DATE, not an age, so
   the line moves on its own: a model who is seventeen today becomes eligible on
   her eighteenth birthday without anyone editing this file. Models under 18 are
   held out of the recommendation pool, their photographs are not stored and the
   photo controls are withdrawn from their card. */
const DOB = new Map(Object.entries(JSON.parse('{"https://mishelmodels.sumy.ua/model/103/013_%D0%9A%D0%B0%D1%82%D1%8F_%D0%A2":"1995-07-06","https://mishelmodels.sumy.ua/model/175/042_%D0%92%D0%B0%D0%BB%D0%B5%D1%80%D0%B8%D1%8F_%D0%9A":"1997-06-16","https://mishelmodels.sumy.ua/model/180/045_%D0%90%D0%BB%D0%B8%D0%BD%D0%B0_%D0%9A":"1999-01-11","https://mishelmodels.sumy.ua/model/230/091_%D0%A1%D0%B0%D1%88%D0%B0_%D0%A1":"2000-09-08","https://mishelmodels.sumy.ua/model/287/142_%D0%A1%D0%B0%D1%88%D0%B0_%D0%9B":"2003-08-27","https://mishelmodels.sumy.ua/model/288/143_%D0%9C%D0%B0%D1%88%D0%B0_%D0%A2":"2001-08-04","https://mishelmodels.sumy.ua/model/345/196_%D0%90%D0%BD%D0%B3%D0%B5%D0%BB%D0%B8%D0%BD%D0%B0_%D0%9A":"2006-05-29","https://mishelmodels.sumy.ua/model/348/199_%D0%90%D0%BB%D1%8C%D0%B1%D0%B8%D0%BD%D0%B0_%D0%94":"2007-05-15","https://mishelmodels.sumy.ua/model/352/203_%D0%94%D0%B8%D0%B0%D0%BD%D0%B0_%D0%94":"2005-05-02","https://mishelmodels.sumy.ua/model/354/205_%D0%9E%D0%BB%D0%B5%D1%81%D1%8F_%D0%9C":"2011-07-05","https://mishelmodels.sumy.ua/model/356/207_%D0%AF%D1%80%D0%BE%D1%81%D0%BB%D0%B0%D0%B2%D0%B0_%D0%A4":"2004-10-30","https://mishelmodels.sumy.ua/model/366/216_%D0%9F%D0%BE%D0%BB%D0%B8%D0%BD%D0%B0_%D0%90":"2006-08-30","https://mishelmodels.sumy.ua/model/374/224_%D0%9C%D0%B0%D1%88%D0%B0_%D0%A1":"2008-04-27","https://mishelmodels.sumy.ua/model/375/225_%D0%9A%D1%80%D0%B8%D1%81%D1%82%D0%B8%D0%BD%D0%B0_%D0%9A":"2007-05-27","https://mishelmodels.sumy.ua/model/378/228_%D0%92%D0%B0%D0%BB%D0%B5%D1%80%D0%B8%D1%8F_%D0%91":"1995-10-07","https://mishelmodels.sumy.ua/model/380/230_%D0%9B%D0%B5%D1%81%D1%8F_%D0%92":"1991-06-20","https://mishelmodels.sumy.ua/model/381/231_%D0%92%D0%B5%D1%80%D0%BE%D0%BD%D0%B8%D0%BA%D0%B0":"2006-08-09","https://mishelmodels.sumy.ua/model/382/232_%D0%9A%D1%80%D0%B8%D1%81%D1%82%D0%B8%D0%BD%D0%B0_%D0%9D":"2003-08-26","https://mishelmodels.sumy.ua/model/383/233_%D0%9A%D0%B0%D1%82%D1%8F_%D0%9E":"2008-01-22","https://mishelmodels.sumy.ua/model/387/237_%D0%A1%D0%BE%D1%84%D0%B8%D1%8F_%D0%94":"2009-10-18","https://mishelmodels.sumy.ua/model/388/238_%D0%9E%D0%BA%D1%81%D0%B0%D0%BD%D0%B0_%D0%A7":"2010-03-13","https://mishelmodels.sumy.ua/model/389/239_%D0%9F%D0%BE%D0%BB%D0%B8%D0%BD%D0%B0_%D0%A2":"2010-05-29","https://mishelmodels.sumy.ua/model/390/240_%D0%9C%D0%B0%D1%88%D0%B0_%D0%9F":"2007-07-30","https://mishelmodels.sumy.ua/model/391/241_%D0%94%D0%B0%D1%80%D0%B8%D0%BD%D0%B0_%D0%A1":"2007-06-29","https://mishelmodels.sumy.ua/model/392/242_%D0%9A%D0%B0%D1%80%D0%BE%D0%BB%D0%B8%D0%BD%D0%B0_%D0%90":"2009-08-22","https://mishelmodels.sumy.ua/model/394/244_%D0%90%D0%BC%D0%B8%D0%BD%D0%B0_%D0%A8":"2008-10-02","https://mishelmodels.sumy.ua/model/395/245_%D0%9B%D0%B8%D0%B7%D0%B0_%D0%94":"2007-12-28","https://mishelmodels.sumy.ua/model/398/247_%D0%95%D0%BB%D0%B8%D0%B7%D0%B0%D0%B2%D0%B5%D1%82%D0%B0_%D0%94":"2010-09-28","https://mishelmodels.sumy.ua/model/399/248_%D0%A1%D0%BE%D1%84%D0%B8%D1%8F_%D0%97":"2010-01-25","https://mishelmodels.sumy.ua/model/400/249_%D0%94%D0%B0%D1%88%D0%B0_%D0%90":"2007-12-13","https://mishelmodels.sumy.ua/model/401/250_%D0%9A%D1%81%D0%B5%D0%BD%D0%B8%D1%8F_%D0%94":"2005-02-17","https://mishelmodels.sumy.ua/model/402/251_%D0%92%D0%B8%D0%BE%D0%BB%D0%B5%D1%82%D1%82%D0%B0_%D0%9A":"2008-07-24","https://mishelmodels.sumy.ua/model/404/252_%D0%92%D0%B0%D0%BB%D0%B5%D1%80%D0%B8%D1%8F_%D0%A1":"2009-12-12","https://mishelmodels.sumy.ua/model/405/253_%D0%94%D0%B0%D1%88%D0%B0_%D0%91":"2011-06-29","https://mishelmodels.sumy.ua/model/79/%D0%91%D0%BE%D0%BD%D0%B4%D0%B0%D1%80%D0%B5%D0%BD%D0%BA%D0%BE_%D0%90%D0%BD%D0%B4%D1%80%D0%B5%D0%B9":"1982-12-27","https://mishelmodels.sumy.ua/model/123/%D0%9E%D1%80%D0%B5%D1%89%D1%83%D0%BA_%D0%98%D0%B3%D0%BE%D1%80%D1%8C":"1990-09-26","https://mishelmodels.sumy.ua/model/234/%D0%93%D0%B2%D0%BE%D0%B7%D0%B4%D0%B5%D1%86%D0%BA%D0%B8%D0%B9_%D0%94%D0%B5%D0%BD%D0%B8%D1%81":"1991-10-28","https://mishelmodels.sumy.ua/model/241/%D0%A2%D0%BA%D0%B0%D1%87%D0%B5%D0%BD%D0%BA%D0%BE_%D0%9C%D0%B0%D0%BA%D1%81%D0%B8%D0%BC":"1999-02-23","https://mishelmodels.sumy.ua/model/254/%D0%93%D0%BE%D1%80%D0%BE%D0%B1%D0%B5%D1%86_%D0%94%D0%B8%D0%BC%D0%B0":"1995-10-13","https://mishelmodels.sumy.ua/model/310/%D0%91%D0%B5%D0%BB%D0%BE%D1%88%D0%B0%D0%BF%D0%BA%D0%B0_%D0%96%D0%B5%D0%BD%D1%8F":"1993-01-18","https://mishelmodels.sumy.ua/model/322/%D0%9F%D0%BE%D0%BD%D0%BE%D0%BC%D0%B0%D1%80%D0%B5%D0%BD%D0%BA%D0%BE_%D0%94%D0%B8%D0%BC%D0%B0":"2000-02-16","https://mishelmodels.sumy.ua/model/327/%D0%9F%D0%B8%D0%BB%D0%B8%D0%BF%D0%B5%D0%BD%D0%BA%D0%BE_%D0%94%D0%B0%D0%BD%D0%B8%D0%B8%D0%BB":"2001-06-20","https://mishelmodels.sumy.ua/model/358/%D0%94%D0%B8%D0%B2%D0%BE%D1%87%D0%B8%D0%B9_%D0%94%D0%B0%D0%BD%D0%B8%D0%B8%D0%BB":"2001-10-11","https://mishelmodels.sumy.ua/model/397/%D0%9E%D1%81%D1%82%D0%B0%D0%BF_%D0%94":"2006-03-09","https://mishelmodels.sumy.ua/model/403/%D0%9C%D0%B0%D1%80%D1%87%D0%B5%D0%BD%D0%BA%D0%BE_%D0%93%D0%BB%D0%B5%D0%B1":"2008-10-18"}')));
function ageOf(key){
  const d = DOB.get(key);
  if(!d) return null;
  const p = d.split('-');
  if(p.length !== 3) return null;
  const now = new Date();
  let a = now.getFullYear() - (+p[0]);
  const m = now.getMonth() + 1, dd = now.getDate();
  if(m < (+p[1]) || (m === (+p[1]) && dd < (+p[2]))) a--;
  return a;
}
/* Unknown age is not the same as adult, but withholding every model whose agency
   prints no date of birth would empty the tool. So this is true only for a date we
   actually hold that falls short of 18 - stated, never guessed. */
function isMinor(key){ const a = ageOf(key); return a !== null && a < 18; }
const KFIT0 = {
  F: {ht: [167, 178], bu: [78, 86], wa: [56, 62], hp: [86, 92]},
  M: {ht: [183, 191], bu: [86, 96], wa: [70, 78], hp: [88, 96]}
};
let KFIT = JSON.parse(JSON.stringify(KFIT0));
let RECON = 9;                       /* how many a press brings up */
const RECOSEEN = new Set();          /* keys already offered today */
let RECOSHOWN = [];                  /* the nine on screen now */
let recoDay = '';

/* How near the middle of a band a figure sits: 1 at the centre, 0 at the edge, and
   nothing at all once it is outside. Edges are soft by a hair so a model one centimetre
   outside is not treated the same as one ten centimetres outside. */
function bandScore(v, lo, hi){
  if(v == null) return null;
  const mid = (lo + hi) / 2, half = (hi - lo) / 2;
  if(!half) return v === mid ? 1 : 0;
  const d = Math.abs(v - mid) / half;
  if(d <= 1) return 1 - d * 0.5;        /* inside: 1.0 down to 0.5 */
  if(d <= 1.6) return 0.5 * (1.6 - d) / 0.6;  /* just outside: 0.5 down to 0 */
  return 0;
}
/* The pool is every measured model the directory knows, minus the ones already decided
   on. Built once per draw rather than per card. */
function recoPool(){
  const out = [];
  const seenKeys = new Set([...MEAS.keys(), ...EDITS.keys()]);
  for(const key of seenKeys){
    if(isMinor(key)) continue;                 /* under 18: never recommended */
    if(lampOf(key)) continue;                  /* already judged */
    if(inBooking(key)) continue;               /* already in talks */
    if(RECOSEEN.has(key)) continue;            /* already offered today */
    const i = keyInfo(key);
    if(!i) continue;                           /* not on any board any more */
    const rec = measRec(key);
    if(!rec) continue;
    const g = (i.g === 'M' || i.g === 'F') ? i.g : null;
    const band = KFIT[g || 'F'];
    const ht = rec[0];
    if(ht == null) continue;                   /* height is the one figure we insist on */
    const parts = [
      [bandScore(ht, band.ht[0], band.ht[1]), 3],
      [bandScore(rec[1], band.bu[0], band.bu[1]), 1],
      [bandScore(rec[2], band.wa[0], band.wa[1]), 1],
      [bandScore(rec[3], band.hp[0], band.hp[1]), 1]
    ];
    let sum = 0, wt = 0, have = 0;
    for(const [sc, w] of parts){
      if(sc === null) continue;
      sum += sc * w; wt += w; have++;
    }
    if(!wt || !sum) continue;                  /* outside every band: not a fit */
    /* A full set of figures is worth more than a lone height, because the booker can
       act on it without writing to the agency first. Said out loud on the card. */
    const completeness = have / 4;
    const score = (sum / wt) * (0.72 + 0.28 * completeness);
    out.push({key: key, i: i, rec: rec, g: g, score: score, have: have});
  }
  out.sort((a, b) => b.score - a.score || (a.i.nm || '').localeCompare(b.i.nm || ''));
  return out;
}
/* The sentence under each card. It names the figures that earned the place, so the
   reason is checkable rather than a number to be taken on trust. */
function recoMarks(r){
  const band = KFIT[r.g || 'F'], rec = r.rec;
  const inb = (v, b) => v != null && v >= b[0] && v <= b[1];
  const m = {ht: inb(rec[0], band.ht), bu: inb(rec[1], band.bu),
             wa: inb(rec[2], band.wa), hp: inb(rec[3], band.hp)};
  m.any = m.ht || m.bu || m.wa || m.hp;
  return m;
}
function recoWhy(r){
  const band = KFIT[r.g || 'F'], rec = r.rec;
  const inb = (v, b) => v != null && v >= b[0] && v <= b[1];
  const hits = [];
  if(inb(rec[0], band.ht)) hits.push(rec[0] + 'cm');
  if(inb(rec[1], band.bu)) hits.push((r.g === 'M' ? 'chest ' : 'bust ') + rec[1]);
  if(inb(rec[2], band.wa)) hits.push('waist ' + rec[2]);
  if(inb(rec[3], band.hp)) hits.push('hips ' + rec[3]);

  let why;
  if(hits.length >= 3) why = 'Inside the band on ' + hits.slice(0, 3).join(', ');
  else if(hits.length)  why = 'Inside the band on ' + hits.join(' and ');
  else                  why = 'Just outside the band, closest available';
  /* No country here: the line above the figures already names it. */
  if(r.have < 4) why += ' · ' + r.have + ' of 4 figures published';
  return why;
}
function recoDraw(more){
  if(!more) RECOSEEN.clear();
  const pool = recoPool();
  RECOSHOWN = pool.slice(0, RECON);
  for(const r of RECOSHOWN) RECOSEEN.add(r.key);
  saveRecos();
  return RECOSHOWN;
}
async function saveRecos(){
  if(!DB || !SIGNED()) return;
  try{
    await DB.doc('recs/' + recoDay).set({day: recoDay, seen: [...RECOSEEN],
      shown: RECOSHOWN.map(r => r.key), n: RECON});
  }catch(e){}
}
async function loadRecos(){
  recoDay = localDay(new Date());
  if(!DB) return;
  try{
    const d = docOf(await DB.doc('recs/' + recoDay).get());
    if(d && Array.isArray(d.seen)) for(const k of d.seen) RECOSEEN.add(k);
    if(d && Array.isArray(d.shown) && d.shown.length){
      /* Put back exactly what was on screen, so a reload does not reshuffle the list
         the scout was halfway through reading. */
      const want = new Set(d.shown);
      for(const k of d.shown) RECOSEEN.delete(k);
      const pool = recoPool();
      RECOSHOWN = pool.filter(r => want.has(r.key));
      for(const k of d.shown) RECOSEEN.add(k);
    }
  }catch(e){}
}
function recoCard(r){
  /* The reason a model is here used to be spelled out in a sentence - but every figure in
     that sentence is printed in the row underneath it and the country in the line above,
     so it said nothing twice. What the numbers alone cannot show is WHICH of them landed
     inside the band, so that is marked on the figures themselves and the sentence goes.
     The one case still worth a line is the model who is inside none of them. */
  const marks = recoMarks(r);
  return modelCard({key: r.key, nm: r.i.nm || '(unnamed)', href: r.i.href || '',
                    ag: r.i.ag || '', city: r.i.city || '', country: r.i.country || '',
                    div: r.i.div || '', g: r.i.g || '?', t: r.i.t || ''},
                   {inband: marks, why: marks.any ? '' : recoWhy(r)});
}
function recoCards(){
  if(!RECOSHOWN.length) return '<div class="reconone">Nothing left to suggest under ' +
    'these bands today — widen them, or press Refresh tomorrow.</div>';
  let out = '';
  /* The scouting is done against the women's board, so the women are read first and
     under their own heading - the same order the day blocks below already use. */
  for(const sx of ['F', 'M', '?']){
    const group = RECOSHOWN.filter(r => (r.g || '?') === sx);
    if(!group.length) continue;
    out += '<div class="asex"><b>' + esc(SEXNAME[sx]) + '</b><s>' + group.length +
      '</s></div><div class="litres">' + group.map(recoCard).join('') + '</div>';
  }
  return out;
}
function recoBlock(){
  const b = KFIT.F, m = KFIT.M;
  return '<section class="recobox" id="recobox">' +
    '<div class="recohd">' +
      '<b>Recommended for the Korean market</b>' +
      '<s>' + RECOSHOWN.length + ' of ' + (MEAS.size || 0).toLocaleString() +
        ' measured</s>' +
      '<button type="button" id="recorefresh" class="recobtn">Refresh</button>' +
    '</div>' +
    '<p class="reconote">Drawn from the whole directory by the bands below, not from ' +
      'this morning’s scan. Women ' + b.ht[0] + '–' + b.ht[1] + 'cm · ' +
      'men ' + m.ht[0] + '–' + m.ht[1] + 'cm. Lit and booked models are left out. ' +
      'Shaded figures are the ones inside the band. ' +
      'Change the bands in Filters → Korea fit.</p>' +
    '<div id="recogrid">' + recoCards() + '</div>' +
  '</section>';
}
let ARRWEEK = null;                 // Monday of the week being shown; null = newest
let ARRSHEET = [];                  // the rows the Updates tab is showing, for the sheet
function weekOf(day){
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));   // back to Monday
  return localDay(dt);
}
function weekLabel(mon){
  const [y, m, d] = mon.split('-').map(Number);
  const a = new Date(y, m - 1, d), b = new Date(y, m - 1, d + 6);
  const f = x => x.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});
  return f(a) + ' – ' + f(b) + ' ' + b.getFullYear();
}
function pagerHtml(weeks, i, n, bot){
  /* Numbered pages, 1 = the newest week. With many weeks the run is cut down to the
     first, the last and the two either side of the current one. */
  const L = weeks.length, want = new Set([0, L - 1]);
  for(let j = i - 2; j <= i + 2; j++) if(j >= 0 && j < L) want.add(j);
  const idx = [...want].sort((a, b) => a - b);
  let nums = '', prev = -1;
  for(const j of idx){
    if(prev >= 0 && j - prev > 1) nums += '<span class="apgap">…</span>';
    nums += '<button type="button" class="apn" data-wk="' + weeks[j] + '"' +
      (j === i ? ' aria-current="page"' : '') + ' title="' + esc(weekLabel(weeks[j])) + '">' +
      (j + 1) + '</button>';
    prev = j;
  }
  return '<nav class="apager' + (bot ? ' bot' : '') + '" aria-label="Weeks">' +
    '<span class="apw">' + esc(weekLabel(weeks[i])) + ' · <b>' + n + '</b>' +
      (n === 1 ? ' new face' : ' new faces') + '</span>' +
    '<button type="button" data-wk="' + (weeks[i - 1] || '') + '"' + (i > 0 ? '' : ' disabled') +
      '>← Newer</button>' + nums +
    '<button type="button" data-wk="' + (weeks[i + 1] || '') + '"' +
      (i < weeks.length - 1 ? '' : ' disabled') + '>Older →</button></nav>';
}
function goWeek(w){
  if(!w) return;
  ARRWEEK = w;
  renderArrivals();
  const pane = document.getElementById('pane-arr');
  const pg = pane && pane.querySelector('.apager');
  if(!pg) return;
  /* the header is sticky, so land the pager just below it rather than under it */
  const hd = document.querySelector('header');
  const off = hd && getComputedStyle(hd).position === 'sticky'
    ? hd.getBoundingClientRect().bottom : 0;
  window.scrollBy(0, pg.getBoundingClientRect().top - Math.max(0, off) - 12);
}
function renderArrivals(){
  const pane = document.getElementById('pane-arr');
  if(!DB && logSettled){
    pane.innerHTML = '<div class="nomatch"><h2>Updates need this page’s storage</h2>' +
      '<p>It isn’t available in this view, so the morning’s scan can’t be read here. ' +
      'The Directory works normally.</p></div>';
    document.getElementById('vn-arr').textContent = '';
    if(VIEW === 'arr') countEl.textContent = '';
    return;
  }
  if(!logSettled){ pane.innerHTML = '<div class="skel">Opening the watch…</div>'; return; }
  /* The recommendations are drawn from the measurements, so this tab needs them too -
     it used to be the Lumen tab alone that asked for them. */
  if(measState === 'idle') loadMeas();
  const all = arrivalRows();
  document.getElementById('vn-arr').textContent = all.length ? all.length : '0';
  readBounds();
  const rows = all.filter(passesFilters);
  if(VIEW === 'arr')
    countEl.textContent = (rows.length === all.length ? rows.length : rows.length + ' of ' + all.length)
      + (all.length === 1 ? ' new face' : ' new faces');
  if(!rows.length){
    /* A morning with no new faces is still a working morning: the recommendations
       stand on their own, so the tab is never empty. */
    pane.innerHTML = recoBlock() + '<div class="nomatch"><h2>' +
      (all.length ? 'Nothing matches those filters' : 'No new faces recorded yet') + '</h2><p>' +
      (all.length
        ? 'Clear a filter or widen a measurement bound. Reset puts everything back.'
        : 'Each morning’s scan writes what it found here. The first one to run after today ' +
          'will fill this in.') + '</p></div>';
    return;
  }
  const today = localDay(new Date());
  const yest = localDay(new Date(Date.now() - 864e5));
  /* litFacts reads the morning scan's own photograph and figures through this index,
     so it has to exist before an arrival card is drawn, not only on the Lumen tab. */
  ARRBY = new Map();
  for(const a of arrivalRows()) if(a.url) ARRBY.set(normKey(a.url), a);
  /* One week per page. The weeks are counted from what the filters leave, so a page is
     never empty; if the week you were on has nothing left, the newest one is shown. */
  const weeks = [...new Set(rows.map(a => weekOf(a.day)))].sort().reverse();
  let wi = ARRWEEK ? weeks.indexOf(ARRWEEK) : 0;
  if(wi < 0) wi = 0;
  ARRWEEK = wi === 0 ? null : weeks[wi];
  const wk = weeks[wi];
  const pageRows = rows.filter(a => weekOf(a.day) === wk);
  const byDay = new Map();
  for(const a of pageRows){ if(!byDay.has(a.day)) byDay.set(a.day, []); byDay.get(a.day).push(a); }
  ARRSHEET = rows;
  let out = (DOWN ? '<div class="litbar arrbar"><button type="button" id="arrsheet">' +
      'Updates with photos \u2193</button><span>Saves the Updates tab as a page you open from ' +
      'your computer, where every card shows the agency\u2019s own photograph. The dashboard ' +
      'itself can only show photos it holds, so they cannot appear here.</span></div>' : '') +
    pagerHtml(weeks, wi, pageRows.length, false);
  for(const [day, items] of byDay){
    const label = day === today ? 'Today' : day === yest ? 'Yesterday' : day;
    const run = RUNS.get(day) || {};
    const isToday = day === today;
    out += '<div class="aday"><div class="adayh"' + (isToday ? ' data-today="1"' : '') +
      '><b>' + esc(label) + '</b><s>' + items.length +
      (items.length === 1 ? ' new face' : ' new faces') + '</s></div>';
    if(run.boards){
      /* The figures are the point of this line, so they are set as figures and the
         words around them step back. */
      const stat = (n, w) => '<span><em>' + esc(String(n)) + '</em>' + w + '</span>';
      out += '<div class="arun">' + stat(run.boards, 'boards scanned') +
        stat(run.found ?? '', 'new') +
        (run.kept != null && run.kept !== run.found
          ? stat(run.kept, 'within your heights') : '') + '</div>';
    }
    /* Women first: it is the board most of the scouting is done against, so it should
       not be the one you scroll past the men to reach. */
    for(const sx of ['F','M','?']){
      const group = items.filter(a => (a.g || '?') === sx);
      if(!group.length) continue;
      group.sort((x,y) =>
        (x.country||'').localeCompare(y.country||'') ||
        (x.agency||'').localeCompare(y.agency||'') ||
        (x.name||'').localeCompare(y.name||''));
      out += '<div class="asex"><b>' + esc(SEXNAME[sx]) + '</b><s>' + group.length +
        '</s></div>' +
        '<div class="litres">' +
        group.map(a => card(a, day === today)).join('') + '</div>';
    }
    out += '</div>';
  }
  if(weeks.length > 1) out += pagerHtml(weeks, wi, pageRows.length, true);
  pane.innerHTML = recoBlock() + out;
}
/* Refresh redraws the nine on their own. Rebuilding the whole pane would throw away
   the scroll position and redraw every arrival card for nothing. */
function recoRepaint(){
  const g = document.getElementById('recogrid');
  if(g) g.innerHTML = recoCards();
  const h = document.querySelector('#recobox .recohd s');
  if(h) h.textContent = RECOSHOWN.length + ' of ' + (MEAS.size || 0).toLocaleString() +
    ' measured';
}
document.getElementById('pane-arr').addEventListener('click', e => {
  const rb = e.target.closest && e.target.closest('#recorefresh');
  if(rb){
    e.preventDefault();
    rb.disabled = true;
    recoDraw(true);
    recoRepaint();
    setTimeout(() => { const n = document.getElementById('recorefresh');
                       if(n) n.disabled = false; }, 120);
    return;
  }
  const sh = e.target.closest && e.target.closest('#arrsheet');
  if(sh){
    e.preventDefault();
    if(!DOWN) return;
    const was = sh.textContent;
    sh.textContent = 'Building\u2026';
    (async () => {
      try{
        await DOWN.save({filename: 'updates-' + localDay(new Date()) + '.html',
                         data: updatesSheet(ARRSHEET)});
        sh.textContent = 'Saved \u2014 open the file';
      }catch(err){
        sh.textContent = (err && err.code === 'declined') ? 'Cancelled' : 'Not available';
      }
      setTimeout(() => { sh.textContent = was; }, 2600);
    })();
    return;
  }
  const wb = e.target.closest && e.target.closest('.apager button[data-wk]');
  if(wb){ e.preventDefault(); if(!wb.disabled) goWeek(wb.dataset.wk); return; }
  if(markClick(e)) return;
  const ph = e.target.closest('.pho[data-photo]');
  if(ph){
    e.preventDefault(); e.stopPropagation();
    const card = ph.closest('.card[data-arr]');
    if(card) remember('model', card.dataset.arr,
                      card.querySelector('.cnm').textContent.trim(),
                      card.querySelector('.c2 b').textContent, card.dataset.arr);
    window.open(ph.dataset.photo, '_blank', 'noopener,noreferrer');
    return;
  }
  const c = e.target.closest('.card[data-arr]');
  if(e.target.closest('.mk')) return;
  if(!c) return;
  const nm = c.querySelector('.cnm').textContent.trim();
  const meta = c.querySelector('.c2 b').textContent;
  remember('model', c.dataset.arr, nm, meta, c.dataset.arr);
});

document.addEventListener('keydown', e => {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const lamp = e.target.closest && e.target.closest('.mk i[data-v]');
  if(lamp){
    e.preventDefault();
    const box = lamp.closest('.mk');
    setMark(box.dataset.mk, lamp.dataset.v, box.dataset);
  }
});
document.getElementById('pane-arr').addEventListener('keydown', e => {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const ph = e.target.closest('.pho[data-photo]');
  if(!ph) return;
  e.preventDefault();
  window.open(ph.dataset.photo, '_blank', 'noopener,noreferrer');
});

/* Dragging the bar under a stage note sets the height of every note. */
(function(){
  const KEY = 'illum.bknoteh', root = document.documentElement;
  const put = h => root.style.setProperty('--bknoteh', h + 'px');
  try{ const h = parseInt(localStorage.getItem(KEY), 10); if(h >= 64) put(h); }catch(e){}
  let drag = null;
  document.addEventListener('pointerdown', e => {
    const g = e.target.closest && e.target.closest('.bknotegrip');
    if(!g || (e.button != null && e.button !== 0)) return;
    const ta = g.previousElementSibling;
    if(!ta || ta.tagName !== 'TEXTAREA') return;
    e.preventDefault(); e.stopPropagation();
    drag = {g: g, ta: ta, y: e.clientY, h: ta.getBoundingClientRect().height};
    g.classList.add('on'); document.body.classList.add('bknoteresize');
    try{ g.setPointerCapture(e.pointerId); }catch(err){}
  }, true);
  document.addEventListener('pointermove', e => {
    if(!drag) return;
    const h = Math.max(64, Math.min(1400, Math.round(drag.h + e.clientY - drag.y)));
    put(h); drag.last = h;
  });
  const end = () => {
    if(!drag) return;
    drag.g.classList.remove('on'); document.body.classList.remove('bknoteresize');
    if(drag.last) try{ localStorage.setItem(KEY, String(drag.last)); }catch(e){}
    drag = null;
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
})();

/* ================= work log rail ================= */
/* Which agency a row belongs to cannot be read off its meta line: a morning arrival
   reads "F 178cm \u00b7 Agency \u00b7 City", a Directory click reads "Agency \u00b7 City",
   a name can carry a \u00b7 of its own. The link is the one thing that never lies, so
   every model URL in the Directory is indexed back to the agency that lists it - all
   57 agencies, all 16,383 listings - and the fold is built from that. */
let AGOF = null, AGHOST = null, AGI = null;
/* The host out of a normalised key: it always reads "https://host/path", already
   lowercased and stripped of www, so there is nothing left to parse. Returns '' for the
   handful of keys normKey could not parse at all and left as they were. */
function hostOfKey(k){
  if(k.charCodeAt(4) !== 115 || k.lastIndexOf('https://', 0) !== 0) return '';
  const sl = k.indexOf('/', 8);
  const h = sl < 0 ? k.slice(8) : k.slice(8, sl);
  return h.indexOf('.') > 0 ? h : '';
}
function agIndex(){
  if(AGOF) return;
  AGOF = new Map(); AGHOST = new Map(); AGI = new Map();
  AG.forEach((a, i) => {
    AGI.set(a.name, i);
    for(const b of a.boards){
      for(const m of b.m){
        const raw = m[1];
        const href = raw.charAt(0) === '|' ? raw.slice(1) : b.p + raw;
        const k = normKey(href);
        if(!AGOF.has(k)) AGOF.set(k, [i, m[0] || '(unnamed)', href]);
        const h = hostOfKey(k);
        if(h && !AGHOST.has(h)) AGHOST.set(h, i);
      }
    }
    let ah = String(a.domain || '').toLowerCase().replace(/^www\./, '');
    if(ah && !AGHOST.has(ah)) AGHOST.set(ah, i);
  });
}
/* The agency this row belongs to, by name - '' when nothing in the Directory claims it.
   The exact link first, then its host (a board moved or a profile renamed still lands),
   then the head of the meta line, but only if it is an agency the Directory knows. */
function agNameOf(r){
  agIndex();
  const u = r && r.url;
  if(u){
    const hit = AGOF.get(normKey(u));
    if(hit) return AG[hit[0]].name;
    const j = AGHOST.get(hostOfKey(normKey(u)));
    if(j !== undefined) return AG[j].name;
  }
  const head = String((r && r.meta) || '').split('\u00b7')[0].trim();
  return AGI.has(head) ? head : '';
}
function allRows(){
  agIndex();
  const out = [], seen = new Map();
  // a row is shown on the day it was filed; slot 7 still carries its first sighting
  for(const [day, v] of VIEWS)
    for(const e of v.e){
      const r = {key: e[0], day: day, filed: day, kind: e[1], name: e[2], meta: e[3],
                 url: e[4], when: e[5], n: e[6] || 1, first: e[7] || day, state: e[8] || null,
                 who: Array.isArray(e[9]) ? e[9] : (e[9] ? [e[9]] : [])};
      out.push(r);
      if(r.url && (r.kind === 'model' || r.kind === 'arrival'))
        seen.set(normKey(r.url) + '|' + day, r);
    }
  /* A face the scan found and that you later opened or lit is one person, not two rows:
     the arrival folds into the entry you made, keeping the earlier of the two dates. */
  /* An arrival folds away only when you already logged that model ON THAT DAY; a
     sighting on another day stays its own row, which is the point of a daily log. */
  for(const a of arrivalRows()){
    const k = a.url ? normKey(a.url) + '|' + a.day : '';
    if(k && seen.has(k)) continue;
    out.push({day: a.day, kind: 'arrival', name: a.name || '', meta: arrivalMeta(a),
              url: a.url || '', when: a.when || '', n: 1, first: a.day});
  }
  for(const r of out)
    if(r.kind === 'model' || r.kind === 'arrival') r.ag = agNameOf(r);
  out.sort((a,b) => b.day.localeCompare(a.day) || (b.when||'').localeCompare(a.when||''));
  return out;
}
function years(){
  const s = new Set();
  for(const d of VIEWS.keys()) s.add(d.slice(0,4));
  for(const d of RUNS.keys()) s.add(d.slice(0,4));
  if(!s.size) s.add(String(new Date().getFullYear()));
  return [...s].sort().reverse();
}
function buildYears(){
  const sel = document.getElementById('railyear');
  const ys = years();
  if(!lyear || !ys.includes(lyear)) lyear = ys[0];
  sel.innerHTML = ys.map(y => '<option value="' + y + '"' + (y === lyear ? ' selected' : '') +
    '>' + y + '</option>').join('');
  sel.style.display = ys.length > 1 ? '' : 'none';
}
function updateBadge(){
  let n = 0;
  for(const v of VIEWS.values()) n += v.e.length;
  for(const r of RUNS.values()) n += (r.arrivals || []).length;
  document.getElementById('railn').textContent = n ? '(' + n + ')' : '';
  { const tn = document.getElementById('railtabn'); if(tn) tn.textContent = n ? String(n) : ''; }
}
function syncExportBtn(){ document.getElementById('lexport').style.display = DOWN ? '' : 'none'; }
/* A month at a time, showing only the days you actually worked. Clicking one shows
   that day on its own; clicking the month name shows the whole month. */
const p2 = n => String(n).padStart(2, '0');
function renderStrip(rows){
  const cal = document.getElementById('lcal');
  const per = new Map();
  for(const r of rows) per.set(r.day, (per.get(r.day) || 0) + 1);
  const worked = [...per.keys()].sort();
  if(calY === null){
    const anchor = lday || (worked.length ? worked[worked.length - 1] : localDay(new Date()));
    calY = +anchor.slice(0, 4); calM = +anchor.slice(5, 7) - 1;
  }
  const stamp = calY * 12 + calM;
  const at = d => +d.slice(0, 4) * 12 + (+d.slice(5, 7) - 1);
  const back = worked.some(d => at(d) < stamp), fwd = worked.some(d => at(d) > stamp);
  const today = localDay(new Date());
  const lead = (new Date(calY, calM, 1).getDay() + 6) % 7;      // weeks run Monday first
  const days = new Date(calY, calM + 1, 0).getDate();
  let cells = '';
  for(const w of ['M','T','W','T','F','S','S']) cells += '<span class="cdh">' + w + '</span>';
  for(let i = 0; i < lead; i++) cells += '<span class="cd out"></span>';
  for(let d = 1; d <= days; d++){
    const iso = calY + '-' + p2(calM + 1) + '-' + p2(d);
    const n = per.get(iso) || 0;
    cells += '<button type="button" class="cd' + (n ? ' has' : '') +
      (iso === lday ? ' on' : '') + (iso === today ? ' now' : '') +
      '" data-d="' + iso + '"' + (n ? '' : ' disabled') +
      ' title="' + iso + (n ? ' — ' + n + (n === 1 ? ' entry' : ' entries')
                            : ' — nothing logged') + '">' + d + '</button>';
  }
  cal.innerHTML =
    '<div class="calhd">' +
      '<button type="button" class="calnav" data-go="-1"' + (back ? '' : ' disabled') +
        ' aria-label="Previous month">‹</button>' +
      '<button type="button" class="calmo' + (lmonth === calM && !lday ? ' on' : '') +
        '" data-mo="' + calM + '" title="Show the whole month">' +
        MONTHNAME[calM] + ' ' + calY + '</button>' +
      '<button type="button" class="calnav" data-go="1"' + (fwd ? '' : ' disabled') +
        ' aria-label="Next month">›</button>' +
    '</div>' +
    '<div class="cgrid">' + cells + '</div>' +
    (lday ? '<button type="button" class="calclear" data-clear="1">showing ' + lday +
            ' · back to the whole year</button>' : '');
}
function renderLog(){
  const list = document.getElementById('llist');
  const stat = document.getElementById('lstat');
  if(!DB){
    document.getElementById('lcal').innerHTML = '';
    stat.textContent = '';
    list.innerHTML = logSettled
      ? '<div class="lempty">The work log needs this page’s storage, which is not available in '
        + 'this view. The Directory works normally.</div>'
      : '<div class="lempty">Opening the log…</div>';
    return;
  }
  const rows = allRows();
  renderStrip(rows);
  igSeenIndex(rows);
  const inYear = rows.filter(r => r.day.slice(0,4) === lyear);

  /* Every model in the log filed under the agency that lists it - whichever tab you came
     at them from - and kept once: the morning scan and a later click on the same profile
     are the same person, not two. */
  KIDS = new Map();
  const kseen = new Map();
  for(const r of rows){
    if(!r.ag) continue;
    if(!KIDS.has(r.ag)){ KIDS.set(r.ag, []); kseen.set(r.ag, new Set()); }
    const uk = normKey(r.url || '') || ('n:' + r.name);
    if(kseen.get(r.ag).has(uk)) continue;
    kseen.get(r.ag).add(uk);
    KIDS.get(r.ag).push(r);   // r carries its own `who`
  }
  /* A model you lit belongs under their agency whether or not a row was ever written
     for them. A write that failed, a second tab that overwrote the day, a mark made on
     an older build - none of that should lose someone from the log. The lamps are the
     record, so read them straight. */
  if(MARKS.size){
    const nowday = localDay(new Date());
    for(const [mk, mv] of MARKS){
      if(!mv) continue;
      const hit = AGOF.get(mk);
      if(!hit) continue;
      const agn = AG[hit[0]].name;
      if(!KIDS.has(agn)){ KIDS.set(agn, []); kseen.set(agn, new Set()); }
      if(kseen.get(agn).has(mk)) continue;
      kseen.get(agn).add(mk);
      const at = MARKAT.get(mk) || '';
      KIDS.get(agn).push({day: at ? at.slice(0, 10) : nowday, kind: 'model',
                          name: hit[1], url: hit[2], who: lampWhoAll(mk),
                          ag: agn, n: 1, when: at ? at.slice(11) : '',
                          meta: agn + (AG[hit[0]].city ? ' \u00b7 ' + AG[hit[0]].city : '')});
    }
  }
  /* Lit first - seeing who you lit is the whole reason to open a fold - then by name. */
  const rank = m => { const v = MARKS.get(normKey(m.url || ''));
                      return v === 'g' ? 0 : v === 'y' ? 1 : 2; };
  for(const mine of KIDS.values())
    mine.sort((a, b) => rank(a) - rank(b) ||
                        String(a.name || '').localeCompare(String(b.name || '')));

  /* An agency you never opened by hand still earns its row the moment one of its models
     is in the log, so the fold is there for all 57 of them, however the model got here. */
  const realAg = new Set(), realAgDay = new Set();
  for(const r of rows) if(r.kind === 'agency'){
    realAg.add(r.name); realAgDay.add(r.name + '|' + r.day);
  }
  const newest = new Map();
  for(const r of rows) if(r.ag && !newest.has(r.ag)) newest.set(r.ag, r);
  for(const [agn, mine] of KIDS) if(!newest.has(agn) && mine.length) newest.set(agn, mine[0]);
  /* An agency folds open on EVERY day it has someone in the log, not once for all time.
     Heading the fold only on the day you first opened the agency buried later models
     under an old date - a model lit today belongs under today. A day that already has a
     real agency row keeps that row as its head instead of gaining a second one. */
  const ghosts = [];
  for(const [ag, mine] of KIDS){
    const a = AG[AGI.get(ag)];
    if(!a || !mine.length) continue;
    const days = new Map();
    for(const m of mine){
      if(!m.day) continue;
      const w = m.when || '';
      if(!days.has(m.day) || w < days.get(m.day)) days.set(m.day, w);
    }
    for(const [day, when] of days){
      if(realAgDay.has(ag + '|' + day)) continue;
      ghosts.push({day: day, kind: 'agency', name: ag, ghost: true, n: 1,
        meta: [a.city, a.country].filter(Boolean).join(' · '),
        url: a.boards[0] ? a.boards[0].u : '', when: when});
    }
  }

  const nOf = k => inYear.filter(r => r.kind === k).length;
  const inThisYear = ag => realAg.has(ag)
    ? inYear.some(r => r.kind === 'agency' && r.name === ag)
    : (KIDS.get(ag) || []).some(m => m.day.slice(0,4) === lyear);
  const nAg = [...new Set([...realAg, ...KIDS.keys()])].filter(inThisYear).length;
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  stat.textContent = inYear.length
    ? plural(inYear.length, 'entry', 'entries') + ' in ' + lyear + ' · '
      + plural(nOf('arrival'), 'new face', 'new faces') + ' · '
      + plural(nOf('agency'), 'agency', 'agencies') + ' · '
      + plural(nOf('model'), 'model', 'models') + ' · '
      + nOf('check') + ' checked by hand · '
      + plural(nOf('search'), 'search', 'searches')
      + (nAg ? ' \u00b7 ' + nAg + ' agencies represented' : '')
    : 'Nothing logged in ' + lyear + ' yet';

  const pass = r => r.day.slice(0,4) === lyear
    && (lkind === 'all' || r.kind === lkind)
    && (lday ? r.day === lday : (lmonth === null || +r.day.slice(5,7) - 1 === lmonth));
  const gshown = ghosts.filter(pass);
  const folded = new Set(gshown.map(g => g.name + '|' + g.day));
  for(const r of inYear) if(r.kind === 'agency' && pass(r)) folded.add(r.name + '|' + r.day);
  let shown = inYear.filter(pass);
  // nobody listed twice: a model that lives inside THAT DAY's fold is not repeated
  if(lkind === 'all') shown = shown.filter(r => !r.ag || !folded.has(r.ag + '|' + r.day));
  shown = shown.concat(gshown)
    .sort((a, b) => b.day.localeCompare(a.day) || (b.when||'').localeCompare(a.when||''));

  if(!shown.length){
    list.innerHTML = '<div class="lempty">' + (rows.length
      ? 'Nothing here with those filters. Tap the chip again, or a lit month, to widen it.'
      : 'Nothing yet. Open an agency, click a model, or check a blind spot and it appears here, '
        + 'dated. Each morning’s scan adds the new faces it found, so the year builds up day '
        + 'by day.') + '</div>';
    return;
  }
  SHOWN = shown;
  const today = localDay(new Date());
  const yest = localDay(new Date(Date.now() - 864e5));
  const byDay = new Map();
  for(const r of shown){ if(!byDay.has(r.day)) byDay.set(r.day, []); byDay.get(r.day).push(r); }
  let out = '';
  for(const [day, items] of byDay){
    const label = day === today ? 'Today' : day === yest ? 'Yesterday' : day;
    const run = RUNS.get(day);
    const kidsOf = ag => (KIDS.get(ag) || []).filter(m => m.day === day);
    out += '<div class="lday"><div class="ldayh"><b>' + esc(label) + '</b><s>' + items.length +
      '</s></div>';
    if(run && (lkind === 'all' || lkind === 'arrival') && run.boards)
      out += '<div class="lrun">' + esc(String(run.boards)) + ' boards scanned · ' +
        esc(String(run.found ?? '')) + ' new' +
        (run.kept != null && run.kept !== run.found
          ? ' · ' + esc(String(run.kept)) + ' within your heights' : '') + '</div>';
    for(const r of items){
      const isSearch = r.kind === 'search' && r.state;
      // an agency or a blind-spot check is not a person, so it gets no lamps
      const isModel = (r.kind === 'model' || r.kind === 'arrival') && r.url;
      const key = isModel ? normKey(r.url) : null;
      const web = !!r.url && /^https?:/i.test(r.url);
      const mine = (r.kind === 'agency') ? kidsOf(r.name) : [];
      const open = LOPEN.has(r.name);
      const lit = mine.filter(m => MARKS.get(normKey(m.url || ''))).length;
      /* A row that folds open is a switch, not a link: clicking the agency's name used to
         walk you out to its website mid-thought. The arrow does that now, deliberately. */
      const nm = mine.length
        ? '<span class="lnm lagn">' + esc(r.name) + '</span>' + (r.url
            ? '<a class="lgo" href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer"'
              + ' title="Open the agency site" aria-label="Open the agency site">↗</a>' : '')
        : web
          ? '<a class="lnm' + (key ? litClass(key) : '') + '" href="' + esc(r.url) +
            '" data-u="' + esc(r.url) + '" data-meta="' + esc(r.meta || '') +
            '" target="_blank" rel="noopener noreferrer">' + esc(r.name) + '</a>'
          : '<span class="lnm' + (key ? litClass(key) : '') + '">' + esc(r.name) + '</span>';
      let cls = 'lrow';
      if(isSearch) cls += ' lsearch';
      if(mine.length) cls += ' lagency' + (open ? ' on' : '');
      out += '<div class="' + cls + '"' +
        (isSearch ? ' data-i="' + SHOWN.indexOf(r) + '"' : '') +
        (mine.length ? ' data-ag="' + esc(r.name) + '"' : '') + '>' +
        '<div class="lr1">' +
        (mine.length ? '<span class="lcar">' + (open ? '−' : '+') + '</span>' : '') +
        (key ? lamps(key, r.name, r.meta || '', r.url) : '') + nm +
        (r.n > 1 ? '<span class="lx" title="Opened ' + r.n + ' times' +
          (r.first && r.first !== r.day ? ', first on ' + esc(r.first) : '') + '">×' +
          r.n + '</span>' : '') + '</div>' +
        '<div class="lr2"><span class="lk ' + esc(r.kind) + '">' +
        esc(KINDLABEL[r.kind] || r.kind) + '</span>' +
        '<span class="lmeta">' + esc(r.meta || '') + '</span>' +
        (r.kind === 'agency' ? ctsChip(r.name) : '') +
        (mine.length ? '<span class="lkn"' + (lit ? ' data-lit="1"' : '') + '>' + mine.length +
          (lit ? ' · ' + lit + ' lit' : '') + '</span>' : '') +
        '<span class="lwhen">' + esc(r.when || '') + '</span>' +
        whoDiscs(r.who) + '</div>' +
        (open ? '<div class="lkids">' + mine.map(m => {
          const mk = normKey(m.url || '');
          const mw = !!m.url && /^https?:/i.test(m.url);
          return '<div class="lkid">' + lamps(mk, m.name, m.meta || '', m.url) +
            (mw ? '<a class="lnm' + litClass(mk) + '" href="' + esc(m.url) +
                  '" data-u="' + esc(m.url) + '" data-meta="' + esc(m.meta || '') +
                  '" target="_blank" rel="noopener noreferrer">' + esc(m.name) + '</a>'
                : '<span class="lnm' + litClass(mk) + '">' + esc(m.name) + '</span>') +
            '<span class="lkw">' + esc(m.day === day ? (m.when || '') : m.day) + '</span>' +
            whoDiscs(m.who, 'lwho--kid') + '</div>';
        }).join('') + '</div>' : '') +
        '</div>';
    }
    out += '</div>';
  }
  list.innerHTML = out;
}
function markSeen(){
  const refs = new Set();
  for(const v of VIEWS.values())
    for(const e of v.e)
      if(e[1] === 'agency' || e[1] === 'model' || e[1] === 'check') refs.add(e[0]);
  document.querySelectorAll('.ag').forEach(box => {
    const a = AG[+box.dataset.i];
    const h = box.querySelector('.agh');
    const has = h.querySelector('.seen');
    // lighting one of its models counts: you have been through this agency either way
    if(refs.has(hkey('agency:' + a.domain)) || (KIDS.get(a.name) || []).length){
      if(!has) h.querySelector('.agn').insertAdjacentHTML('afterend','<span class="seen">seen</span>');
    }else if(has) has.remove();
  });
  document.querySelectorAll('.mnm[data-ref]').forEach(el =>
    el.classList.toggle('v', refs.has(hkey(el.dataset.ref))));
  document.querySelectorAll('.bag').forEach(box => {
    const a = BLINDS[+box.dataset.b];
    const h = box.querySelector('.bagh');
    const has = h.querySelector('.seen');
    if(refs.has(hkey('blind:' + a.dom))){
      if(!has) h.querySelector('.bagn').insertAdjacentHTML('afterend','<span class="seen">checked</span>');
    }else if(has) has.remove();
  });
  document.querySelectorAll('.brow[data-ref]').forEach(el =>
    el.classList.toggle('v', refs.has(hkey(el.dataset.ref))));
  document.querySelectorAll('.rnm[data-ref]').forEach(el =>
    el.classList.toggle('v', refs.has(hkey(el.dataset.ref))));
}

/* ================= directory ================= */
function boardsFor(a, tiers, sexes){
  return a.boards.filter(b => (!tiers.length || tiers.includes(b.t))
                           && (!sexes.length || sexes.includes(b.g)));
}
/* Every model in the Directory, flattened, with its board's own sex and tier.
   A model listed on two boards (a division page and an "all models" page) is kept once. */
function dirModels(){
  const term = q.value.trim().toLowerCase();
  const regions = checked('region'), tiers = checked('tier'), sexes = checked('sex');
  const marks = checked('mark');
  const seen = new Set(), out = [];
  for(const a of AG){
    if(regions.length && !regions.includes(a.region)) continue;
    if(!illuAtOk(a)) continue;
    for(const b of a.boards){
      if(tiers.length && !tiers.includes(b.t)) continue;
      if(sexes.length && !sexes.includes(b.g)) continue;
      for(const m of b.m){
        const raw = m[1];
        const href = raw.charAt(0) === '|' ? raw.slice(1) : b.p + raw;
        const key = normKey(href);
        if(seen.has(key)) continue;
        seen.add(key);
        if(mdelIs(key)) continue;
        if(marks.length && !marks.includes(MARKS.get(key) || '')) continue;
        const nm = m[0] || '(unnamed)';
        if(term && !(nm + ' ' + a.name + ' ' + a.city + ' ' + a.country + ' ' + b.d)
                      .toLowerCase().includes(term)) continue;
        out.push({nm: nm, key: key, href: href, ag: a.name, city: a.city, div: b.d});
      }
    }
  }
  return out;
}
function renderDirResults(){
  const pool = dirModels();
  const byMeas = !!(BND && BND.any);
  if(!byMeas){
    const marked = pool.slice(0, 400);
    main.innerHTML = '<div class="rescap"><p><b>' + pool.length.toLocaleString() + '</b> ' +
      (pool.length === 1 ? 'model' : 'models') + ' lit.</p></div>' +
      (pool.length
        ? '<div class="res">' + marked.map(m =>
            '<div class="rrow">' + lamps(m.key, m.nm, m.ag + (m.div ? ' \u00b7 ' + m.div : ''), m.href) +
            '<a class="rnm' + litClass(m.key) + '" data-ref="' + esc(m.href) + '" data-nm="' +
            esc(m.nm) + '" data-ag="' + esc(m.ag) + '" href="' + esc(m.href) +
            '" target="_blank" rel="noopener noreferrer">' + esc(m.nm) + '</a>' +
            '<span class="rag">' + esc(m.ag + (m.div ? ' \u00b7 ' + m.div : '')) + '</span></div>').join('') +
          '</div>'
        : '<div class="nomatch"><h2>Nothing lit yet</h2><p>Click the green lamp beside a name to ' +
          'mark a model you want to book, or the amber one while you are still deciding.</p></div>');
    if(VIEW === 'dir') countEl.textContent = pool.length.toLocaleString() + ' lit';
    markSeen();
    return;
  }
  const measured = pool.filter(m => measHas(m.key)).length;
  let head = '<span class="cov">' + measured.toLocaleString() + ' of ' +
    pool.length.toLocaleString() + ' measured</span>';
  if(measState === 'loading'){
    main.innerHTML = head + '<div class="rescap"><p>Reading the measurements\u2026</p></div>';
    return;
  }
  if(measState === 'off'){
    main.innerHTML = '<div class="rescap"><p>Measurement filtering needs this page\u2019s storage, ' +
      'which is not available in this view. Clear the boxes to browse the Directory by name.</p></div>';
    return;
  }
  const hits = [];
  for(const m of pool){
    const rec = measRec(m.key);
    if(!rec) continue;
    const v = recOf(rec);
    if(!inRange(v.ht, BND.ht[0], BND.ht[1])) continue;
    if(!inRange(v.bu, BND.bu[0], BND.bu[1])) continue;
    if(!inRange(v.wa, BND.wa[0], BND.wa[1])) continue;
    if(!inRange(v.hp, BND.hp[0], BND.hp[1])) continue;
    if(!inRange(v.sh, BND.sh[0], BND.sh[1])) continue;
    hits.push(Object.assign({}, m, {ht: rec[0]}));
  }
  hits.sort((x, y) => x.nm.localeCompare(y.nm));
  const shown = hits.slice(0, 400);
  let out = head +
    '<div class="rescap"><p><b>' + hits.length.toLocaleString() + '</b> ' +
      (hits.length === 1 ? 'model matches' : 'models match') + ' those measurements.</p>' +
    '<p>Only models the scan has already measured can be tested \u2014 ' +
      measured.toLocaleString() + ' of the ' + pool.length.toLocaleString() +
      ' on screen. The rest are not ruled out, just not yet read; the nightly scan is ' +
      'working through them.</p></div>';
  out += hits.length
    ? '<div class="res">' + shown.map(m =>
        '<div class="rrow">' + lamps(m.key, m.nm, m.ag + (m.div ? ' \u00b7 ' + m.div : ''), m.href) +
        '<a class="rnm' + litClass(m.key) + '" data-ref="' + esc(m.href) + '" data-nm="' +
        esc(m.nm) + '" data-ag="' + esc(m.ag) + '" href="' + esc(m.href) +
        '" target="_blank" rel="noopener noreferrer">' + esc(m.nm) + '</a>' +
        (m.ht != null ? '<span class="rht">' + m.ht + 'cm</span>' : '') +
        '<span class="rag">' + esc(m.ag + (m.div ? ' \u00b7 ' + m.div : '')) + '</span></div>').join('') +
      '</div>' + (hits.length > shown.length
        ? '<p class="rmore">Showing the first ' + shown.length + '. Narrow the range to see the rest.</p>'
        : '')
    : '<div class="nomatch"><h2>Nobody measured matches that range</h2><p>Widen a bound, or clear ' +
      'one \u2014 setting a bust, waist or hip range also drops every model whose agency publishes ' +
      'only a height.</p></div>';
  main.innerHTML = out;
  if(VIEW === 'dir')
    countEl.textContent = hits.length.toLocaleString() + ' of ' + measured.toLocaleString() + ' measured';
  markSeen();
}
/* ======== Directory: the overview tiles and the agency list ========
   Women, men and models whose board does not say. The sex comes from the board's own
   wording; a model listed on a mixed board AND on a split one (an "all models" page and
   a "women" page) takes the split board's answer, so "not stated" only ever means the
   agency itself never says - it is never a guess. */
function dirSexOf(bs){
  const g = new Map();
  for(const b of bs) for(const m of b.m){
    const raw = m[1];
    const k = normKey(raw.charAt(0) === '|' ? raw.slice(1) : b.p + raw);
    const v = b.g === 'F' || b.g === 'M' ? b.g : '?';
    const had = g.get(k);
    if(had === undefined || had === '?') g.set(k, v);
  }
  const o = {F: 0, M: 0, Q: 0};
  for(const v of g.values()) o[v === '?' ? 'Q' : v]++;
  return o;
}
const DIRTIERS = ['newfaces', 'main', 'development', 'direct', 'commercial', 'unlabelled'];
function dirTiersOf(bs){
  const t = new Set(bs.map(b => b.t));
  return DIRTIERS.filter(x => t.has(x));
}
function dirMono(a){
  const w = String(a.name || '').replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if(!w.length) return '·';
  if(/^\d+$/.test(w[0])) return w[0].slice(0, 3);
  return (w[0][0] + (w[1] ? w[1][0] : (w[0][1] || ''))).toUpperCase();
}
function dirHue(str){
  let h = 0; for(const c of String(str)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
const dirN = n => Number(n || 0).toLocaleString();
/* the split, drawn once as a bar and said once in numbers */
function dirSexBar(o){
  const t = o.F + o.M + o.Q || 1;
  return '<span class="dsxbar" aria-hidden="true"><i class="F" style="width:' + (o.F / t * 100).toFixed(2) + '%"></i>' +
    '<i class="M" style="width:' + (o.M / t * 100).toFixed(2) + '%"></i>' +
    '<i class="Q" style="width:' + (o.Q / t * 100).toFixed(2) + '%"></i></span>';
}
function dirSexNums(o, words){
  const one = (k, n, w) => '<span class="dsxn dsxn--' + k + (n ? '' : ' zero') + '" title="' + dirN(n) + ' ' + w + '">' +
    '<i></i><b>' + dirN(n) + '</b><em>' + w + '</em></span>';
  return '<span class="dsxns">' + one('F', o.F, 'Female') + one('M', o.M, 'Male') + one('Q', o.Q, 'Not stated') + '</span>';
}
const DIRTH = '<div class="agth" aria-hidden="true"><span></span><span>Agency</span>' +
  '<span class="agth-sx">Models by sex</span>' +
  '<span class="agth-n">Boards</span><span class="agth-n">Models</span><span class="agth-t">Tiers</span>' +
  '<span>Contacts</span><span></span></div>';
/* one tile per part of the world: how big it is, how it splits, where it sits */
function dirTiles(rows){
  const R = new Map();
  for(const r of rows){
    if(!R.has(r.rg)) R.set(r.rg, {n: 0, b: 0, F: 0, M: 0, Q: 0, ag: 0, ct: new Map()});
    const x = R.get(r.rg);
    x.n += r.n; x.b += r.nb; x.ag++; x.F += r.sx.F; x.M += r.sx.M; x.Q += r.sx.Q;
    x.ct.set(r.ct, (x.ct.get(r.ct) || 0) + 1);
  }
  if(!R.size) return '';
  const tot = [...R.values()].reduce((p, x) => p + x.n, 0) || 1;
  const order = [...R.entries()].sort((p, q) => q[1].n - p[1].n);
  return '<div class="dtiles">' + order.map(([rg, x]) => {
    const cts = [...x.ct.entries()].sort((p, q) => q[1] - p[1] || COLL(p[0], q[0]));
    const shown = cts.slice(0, 4);
    const sec = RGNSHUT.has('dir:' + rg) ? '' : ' on';
    return '<button type="button" class="dtile' + sec + '" data-dtile="' + esc(rg) + '" title="Show ' + esc(rg) + '’s agencies">' +
      '<span class="dt-top"><span class="dt-nm">' + esc(rg) + '</span>' +
        '<span class="dt-big"><b>' + dirN(x.n) + '</b><em>models</em></span></span>' +
      '<span class="dt-meta"><span><b>' + dirN(x.ag) + '</b> ' + (x.ag === 1 ? 'agency' : 'agencies') + '</span>' +
        '<span><b>' + dirN(x.ct.size) + '</b> ' + (x.ct.size === 1 ? 'country' : 'countries') + '</span>' +
        '<span><b>' + dirN(x.b) + '</b> ' + (x.b === 1 ? 'board' : 'boards') + '</span>' +
        '<span class="dt-share"><b>' + (x.n && x.n / tot < .005 ? '&lt;1' : Math.round(x.n / tot * 100)) + '%</b> of all models</span></span>' +
      dirSexBar(x) + dirSexNums(x, true) +
      '<span class="dt-cty">' + shown.map(([c, n]) => '<span>' + esc(c === 'Unknown' ? 'Not stated' : c) + '<b>' + n + '</b></span>').join('') +
        (cts.length > shown.length ? '<span class="more">+' + (cts.length - shown.length) + '</span>' : '') + '</span>' +
      '</button>';
  }).join('') + '</div>';
}
function dirRgStats(rows, rg){
  const x = {n: 0, F: 0, M: 0, Q: 0};
  for(const r of rows) if(r.rg === rg){ x.n += r.n; x.F += r.sx.F; x.M += r.sx.M; x.Q += r.sx.Q; }
  return '<span class="rgst"><span class="rgst-n"><b>' + dirN(x.n) + '</b> models</span>' + dirSexNums(x, false) + dirSexBar(x) + '</span>';
}
function dirTilesSync(){
  main.querySelectorAll('.dtile[data-dtile]').forEach(t => {
    const sec = main.querySelector('.rgnsec[data-rgl="' + CSS.escape(t.dataset.dtile) + '"]');
    t.classList.toggle('on', !!sec && sec.dataset.open === '1');
  });
}
main.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('.dtile[data-dtile]');
  if(t){
    const sec = main.querySelector('.rgnsec[data-rgl="' + CSS.escape(t.dataset.dtile) + '"]');
    if(sec){
      const head = sec.querySelector('.rgn');
      if(sec.dataset.open === '0' && head) toggleRegion(head);
      requestAnimationFrame(() => { try{ sec.scrollIntoView({block: 'start', behavior: 'smooth'}); }catch(err){} });
    }
    dirTilesSync();
    return;
  }
  if(e.target.closest && e.target.closest('.rgn')) setTimeout(dirTilesSync, 0);
});
function dirAgRow(r){
  const a = r.a;
  return ('<div class="ag" data-i="' + AG.indexOf(a) + '">' +
      '<div class="agh"><span class="agcar">+</span>' +
      '<span class="agwho"><span class="agl1"><span class="agn">' + esc(a.name) + '</span>' +
        '<button type="button" class="agctsbtn" data-agcts aria-expanded="false" title="Address and contacts" aria-label="Address and contacts for ' + esc(a.name) + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16.2c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h4M14.5 13.5h3"/></svg></button>' +
        siteChip(a.domain) + '</span>' +
        '<span class="agl2">' +
        /* the agency's own front door, not a model's page - opens without unfolding the card */
        (a.domain ? '<a class="agsite" href="https://' + esc(a.domain) + '" target="_blank" ' +
          'rel="noopener noreferrer" title="Open ' + esc(a.domain) + ' in a new tab">' +
          esc(a.domain) + '<i>↗</i></a>' : '') +
        (a.city ? '<span class="agc">' + esc(a.city) + '</span>' : '') + illuAtChips(a) + '</span></span>' +
      '<span class="agsx">' + dirSexNums(r.sx, false) + dirSexBar(r.sx) + '</span>' +
      '<span class="agbd"><b>' + dirN(r.nb) + '</b></span>' +
      '<span class="agcount"><b>' + dirN(r.n) + '</b></span>' +
      '<span class="agtiers">' + r.ts.map(t => '<span class="tierchip" data-t="' + esc(t) + '">' + esc(TIER[t] || t) + '</span>').join('') + '</span>' +
      '<span class="agct">' + ctsChip(a.domain) + '</span>' +
      (SIGNED() ? '<button type="button" class="agdelb" data-agdel="' + esc(a.domain) + '" ' +
        'title="Delete this agency from the directory" aria-label="Delete ' + esc(a.name) + '">' +
        TRASHSVG + '</button>' : '<span></span>') + '</div>' +
      '<div class="agbody"></div></div>');
}
function render(){
  readBounds();
  /* the new Directory draws its own list; the old one (46,000 elements) is never built, not even hidden */
  if(window.dir2Render){ if(VIEW === 'dir') dir2Render(); return; }
  if(VIEW !== 'dir') return;
  const narrowed = (BND && BND.any) || checked('mark').length;
  if(VIEW === 'dir' && narrowed){
    if(BND && BND.any && measState === 'idle') loadMeas();
    renderDirResults();
    return;
  }
  const term = q.value.trim().toLowerCase();
  const regions = checked('region'), tiers = checked('tier'), sexes = checked('sex');
  let shownAg = 0;
  const shownKeys = new Set();
  const keysOf = bs => {
    const k = new Set();
    for(const b of bs) for(const m of b.m){
      const raw = m[1];
      k.add(normKey(raw.charAt(0) === '|' ? raw.slice(1) : b.p + raw));
    }
    return k;
  };
  /* Region, then country, then agency - all three alphabetical. Every agency in one
     part of the world sits in one block under one heading, so a name is found by
     walking down the page rather than by remembering where the scan happened to put it. */
  const rows = [];
  for(const a of AG){
    if(regions.length && !regions.includes(a.region)) continue;
    if(!illuAtOk(a)) continue;
    const bs = boardsFor(a, tiers, sexes);
    if(!bs.length && (a.boards.length || tiers.length || sexes.length)) continue;
    const hay = (a.name + ' ' + a.city + ' ' + a.country + ' ' + a.domain + ' ' +
                 ctsHay(a.domain)).toLowerCase();
    if(term && !hay.includes(term)) continue;
    const ks = keysOf(bs);
    const sx = dirSexOf(bs);
    const n = ks.size;
    shownAg++;
    for(const k of ks) shownKeys.add(k);
    rows.push({a: a, n: n, sx: sx, nb: bs.length, ts: dirTiersOf(bs),
               rg: a.region || REGION[a.country] || 'Unknown',
               ct: a.country || 'Unknown'});
  }
  /* base sensitivity so Élite files with Elite rather than after Z. Built once and
     reused - localeCompare with options makes a fresh collator on every call. */
  const coll = COLL;
  rows.sort((p, r) => coll(p.rg, r.rg) || coll(p.ct, r.ct) || coll(p.a.name, r.a.name));
  if(window.DIRREC && window.dirRecRender){ dirRecRender(rows); return; }
  if(window.DIRFAV && window.dirFavRender){ dirFavRender(rows); return; }
  const rgAg = new Map(), rgCty = new Map(), ctAg = new Map();
  for(const r of rows){
    const ck = r.rg + '\u0000' + r.ct;
    rgAg.set(r.rg, (rgAg.get(r.rg) || 0) + 1);
    ctAg.set(ck, (ctAg.get(ck) || 0) + 1);
    if(!rgCty.has(r.rg)) rgCty.set(r.rg, new Set());
    rgCty.get(r.rg).add(r.ct);
  }
  const out = [];
  let lastRg = null, lastCty = null, grpOpen = false;
  for(const r of rows){
    if(r.rg !== lastRg){
      if(grpOpen){ out.push('</div>'); grpOpen = false; }
      if(lastRg !== null) out.push('</div></section>');
      const na = rgAg.get(r.rg), nc = rgCty.get(r.rg).size;
      const rkey = 'dir:' + r.rg;
      const shut = RGNSHUT.has(rkey);
      out.push('<section class="rgnsec" data-rg="' + esc(rkey) + '" data-rgl="' +
        esc(r.rg) + '" data-open="' + (shut ? '0' : '1') + '">' +
        '<div class="rgn" role="button" tabindex="0" aria-expanded="' + (!shut) +
        '" title="' + (shut ? 'Open ' : 'Fold away ') + esc(r.rg) + '">' +
        '<span class="rgncar">' + (shut ? '+' : '\u2212') + '</span>' +
        '<b>' + esc(r.rg) + '</b><s>' +
        na.toLocaleString() + (na === 1 ? ' agency' : ' agencies') + ' \u00b7 ' +
        nc + (nc === 1 ? ' country' : ' countries') + '</s>' + dirRgStats(rows, r.rg) + '</div><div class="rgnbody">');
      lastRg = r.rg; lastCty = null;
    }
    if(r.ct !== lastCty){
      if(grpOpen){ out.push('</div>'); grpOpen = false; }
      const na = ctAg.get(r.rg + '\u0000' + r.ct);
      out.push('<div class="cty">' + flagImg(r.ct) + esc(r.ct) + '<i>' + na + '</i></div>' +
        '<div class="ctygrp">' + DIRTH);
      grpOpen = true; lastCty = r.ct;
    }
    out.push(dirAgRow(r));
  }
  if(grpOpen) out.push('</div>');
  if(lastRg !== null) out.push('</div></section>');
  const nShown = shownKeys.size;
  const nCty = new Set(rows.map(r => r.ct)).size;
  const dirsum = '<div class="dirsum"><b>' + shownAg.toLocaleString() + '</b>' +
    '<em>' + (shownAg === 1 ? 'agency' : 'agencies') + '</em>' +
    '<s>' + nShown.toLocaleString() + (nShown === 1 ? ' model' : ' models') +
    ' \u00b7 ' + nCty + (nCty === 1 ? ' country' : ' countries') + '</s></div>';
  const wasOpen = [...main.querySelectorAll('.ag[data-open="1"]')].map(b => AG[+b.dataset.i]).filter(Boolean);
  main.innerHTML = out.length ? (window.dirFavTabs ? dirFavTabs() : '') + dirsum + out.join('')
    : (window.dirFavTabs ? dirFavTabs() : '') + '<div class="nomatch"><h2>Nothing matches those filters</h2>' +
      '<p>Clear a tick box or widen the search. Reset puts everything back.</p></div>';
  for(const a of wasOpen){
    const box = main.querySelector('.ag[data-i="' + AG.indexOf(a) + '"]');
    if(!box) continue;
    box.dataset.open = '1';
    const car = box.querySelector('.agcar'); if(car) car.textContent = '\u2212';
    try{ agFill(box); }catch(e){}
  }
  if(VIEW === 'dir')
    countEl.textContent = shownAg + (shownAg === 1 ? ' agency' : ' agencies') + ' \u00b7 ' +
      nShown.toLocaleString() + (nShown === 1 ? ' model' : ' models');
  markSeen();
}

/* an agency card's boards and models, drawn into its body; used on open and when a
   redraw has to put back the cards that were open before it */
function agFill(box){
  const a = AG[+box.dataset.i];
  if(!a) return;
  const body = box.querySelector('.agbody');
  if(body.dataset.filled === '1') return;
  const bs = boardsFor(a, checked('tier'), checked('sex'));
  body.innerHTML = contactsBlock(a.domain) + bs.map(b => {
    const rows = b.m.filter(m => !mdelIs(normKey(m[1].charAt(0) === '|' ? m[1].slice(1) : b.p + m[1]))).map(m => {
      const raw = m[1];
      const href = raw.charAt(0) === '|' ? raw.slice(1) : b.p + raw;
      const nm = esc(m[0] || '(unnamed)');
      const key = normKey(href);
      return href.startsWith('http')
        ? '<div class="mrow">' + lamps(key, m[0] || '(unnamed)',
            a.name + (a.city ? ' \u00b7 ' + a.city : ''), href) +
          '<a class="mnm' + litClass(key) + '" data-ref="' + esc(href) + '" href="' + esc(href) +
          '" target="_blank" rel="noopener noreferrer">' + nm + '</a></div>'
        : '<div class="mrow nolink">' + lamps(key, m[0] || '(unnamed)',
            a.name + (a.city ? ' \u00b7 ' + a.city : ''), href) +
          '<span class="mnm' + litClass(key) + '" data-ref="' + esc(href) + '">' + nm +
          '</span></div>';
    }).join('');
    return '<div class="bd"><div class="bdh"><b>' + esc(b.d) + '</b>' +
      '<span class="tierchip" data-t="' + esc(b.t) + '">' + esc(TIER[b.t] || b.t) +
      '</span>' +
      '<a href="' + esc(b.u) + '" target="_blank" rel="noopener noreferrer">open board &rarr;</a>' +
      '</div><div class="mlist">' + rows + '</div></div>';
  }).join('');
  body.dataset.filled = '1';
  markSeen();
}
function toggleRegion(head){
  const sec = head.closest('.rgnsec');
  if(!sec) return;
  const rg = sec.dataset.rg || '';
  const label = sec.dataset.rgl || rg;
  const shut = sec.dataset.open === '0';
  sec.dataset.open = shut ? '1' : '0';
  head.setAttribute('aria-expanded', String(shut));
  head.title = (shut ? 'Fold away ' : 'Open ') + label;
  const car = head.querySelector('.rgncar');
  if(car) car.textContent = shut ? '\u2212' : '+';
  if(shut) RGNSHUT.delete(rg); else RGNSHUT.add(rg);
  savePrefsUI();
}
main.addEventListener('keydown', e => {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const head = e.target.closest && e.target.closest('.rgn');
  if(!head) return;
  e.preventDefault();
  toggleRegion(head);
});
main.addEventListener('click', e => {
  // a link out is a link out: never let it fold or unfold the card it sits on
  if(e.target.closest('a.agsite')){ e.stopPropagation(); return; }
  const rgnhead = e.target.closest('.rgn');
  if(rgnhead){ toggleRegion(rgnhead); return; }
  if(markClick(e)) return;
  const board = e.target.closest('.bdh a');
  if(board){
    const box = board.closest('.ag');
    const a = box ? AG[+box.dataset.i] : null;
    if(a) remember('agency', 'agency:' + a.domain, a.name,
                   [a.city, a.country].filter(Boolean).join(' · '), board.href);
    return;
  }
  const hit = e.target.closest('.rnm[data-ref]');
  if(hit){
    remember('model', hit.dataset.ref, hit.dataset.nm, hit.dataset.ag, hit.dataset.ref);
    return;
  }
  const link = e.target.closest('.mnm[data-ref]');
  if(link){
    const box = link.closest('.ag'); const a = AG[+box.dataset.i];
    remember('model', link.dataset.ref, link.textContent.trim(),
             a.name + (a.city ? ' · ' + a.city : ''), link.dataset.ref);
    return;
  }
  const head = e.target.closest('.agh');
  if(!head) return;
  const box = head.parentElement;
  const open = box.dataset.open === '1';
  box.dataset.open = open ? '0' : '1';
  head.querySelector('.agcar').textContent = open ? '+' : '−';
  if(open) return;
  /* opening moves the card onto a full-width row of its own, which shifts it under the
     fold - put its name back under the eye rather than making the scout hunt for it */
  requestAnimationFrame(() => {
    try{ head.scrollIntoView({block: 'nearest', behavior: 'smooth'}); }catch(err){}
  });
  const a = AG[+box.dataset.i];
  remember('agency', 'agency:' + a.domain, a.name,
           [a.city, a.country].filter(Boolean).join(' · '),
           a.boards[0] ? a.boards[0].u : '');
  agFill(box);
});

/* Contacts: typed straight in, saved as you go. Delegated from the document rather
   than from one pane, because the same rows appear inline in the Directory and inside
   the panel that every other tab opens. */
function ctsCtx(el){
  const box = el.closest('.cts');
  if(!box || !box.dataset.dom) return null;
  return {box: box, dom: box.dataset.dom, list: ctsList(box.dataset.dom)};
}
function ctsRepaintSeg(ctx, focusIndex){
  const host = ctx.box.querySelector('.ctlist');
  if(host) host.innerHTML = ctsRows(ctx.dom);
  paintCtsChip(ctx.dom);
  if(focusIndex == null || !host) return;
  const row = host.querySelector('.ctrow[data-i="' + focusIndex + '"]');
  const f = row && row.querySelector('.ctf');
  if(f) f.focus();
}
/* The Directory and Blind spots both fold an agency open on any click inside its
   header. A chip lives in that header, so this listener has to win the click before
   the header ever sees it - capture phase, and the propagation stopped there. */
document.addEventListener('click', e => {
  const open = e.target.closest && e.target.closest('[data-ctopen]');
  if(open){
    e.preventDefault(); e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    openContacts(open.dataset.ctopen);
  }
}, true);
document.addEventListener('click', e => {
  if(e.target.closest('[data-ctclose]')){ closeContacts(); return; }
  if(ctmodal && e.target === ctmodal){ closeContacts(); return; }
  const add = e.target.closest('.ctadd');
  if(add){
    const ctx = ctsCtx(add);
    if(!ctx) return;
    ctx.list.push({e: '', n: '', r: '', p: ''});
    ctsRepaintSeg(ctx, ctx.list.length - 1);
    return;
  }
  const del = e.target.closest('.ctdel');
  if(del){
    const ctx = ctsCtx(del);
    const row = del.closest('.ctrow');
    if(!ctx || !row) return;
    ctx.list.splice(+row.dataset.i, 1);
    ctsRepaintSeg(ctx, null);
    saveContacts(ctx.dom);
    return;
  }
});
/* A chip is a button, so it answers the keyboard too. */
document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){ closeContacts(); return; }
  const chip = e.target.closest && e.target.closest('[data-ctopen]');
  if(chip && (e.key === 'Enter' || e.key === ' ')){
    e.preventDefault(); openContacts(chip.dataset.ctopen); return;
  }
  if(e.key !== 'Enter') return;
  const f = e.target.closest && e.target.closest('.ctf');
  if(!f) return;
  e.preventDefault();
  const row = f.closest('.ctrow'), ctx = ctsCtx(f);
  if(!row || !ctx) return;
  const fields = Array.from(row.querySelectorAll('.ctf'));
  const at = fields.indexOf(f);
  if(at > -1 && at < fields.length - 1){ fields[at + 1].focus(); return; }
  const add = ctx.box.querySelector('.ctadd');
  if(add) add.click();
});
document.addEventListener('input', e => {
  const f = e.target.closest && e.target.closest('.ctf');
  if(!f) return;
  const ctx = ctsCtx(f), row = f.closest('.ctrow');
  if(!ctx || !row) return;
  const i = +row.dataset.i;
  if(!ctx.list[i]) ctx.list[i] = {e: '', n: '', r: '', p: ''};
  ctx.list[i][f.dataset.k] = f.value;
  const item = ctx.list[i];
  const swap = (sel, html) => {
    const el = row.querySelector(sel);
    if(el) el.outerHTML = html;
  };
  if(f.dataset.k !== 'r') swap('.ctav', avatarHTML(item));
  if(f.dataset.k === 'e' || f.dataset.k === 'n') swap('.ctmail', mailBtn(item));
  if(f.dataset.k === 'p' || f.dataset.k === 'n')
    swap('.cttel', telBtn(item.p, item.n || item.e));
  paintCtsChip(ctx.dom);
  queueSaveContacts(ctx.dom);
});
/* The address is one field for the whole agency, so it is not a .ctrow and needs its
   own handler; the map link follows what is typed rather than waiting for a repaint. */
document.addEventListener('input', e => {
  const f = e.target.closest && e.target.closest('.ctaf');
  if(!f) return;
  const box = f.closest('.cts');
  if(!box || !box.dataset.dom) return;
  ADDR.set(box.dataset.dom, f.value);
  const m = box.querySelector('.ctmap'), h = mapHref(f.value);
  if(m){ if(h){ m.href = h; m.hidden = false; } else m.hidden = true; }
  queueSaveContacts(box.dataset.dom);
});
document.addEventListener('focusout', e => {
  const f = e.target.closest && e.target.closest('.ctf');
  if(!f) return;
  const ctx = ctsCtx(f);
  if(ctx) queueSaveContacts(ctx.dom);
}, true);

/* ================= blind spots =================
   Boards the scan cannot read, from its own record of why. These never enter the
   Directory count: there is no roster to hold. The point of the list is that somebody
   opens them by hand, so every row logs into the work log, dated. */
const bmain = document.getElementById('bmain');
function blindShown(){
  const term = q.value.trim().toLowerCase();
  const regions = checked('region');
  return BLINDS.filter(a => {
    if(regions.length && !regions.includes(REGION[a.c] || 'Unknown')) return false;
    if(!term) return true;
    const hay = (a.n + ' ' + a.city + ' ' + a.c + ' ' + a.dom + ' ' +
                 a.b.map(b => b.d + ' ' + REASON[b.r].l).join(' ')).toLowerCase();
    return hay.includes(term);
  });
}
function renderBlind(){
  const list = blindShown();
  const boards = list.reduce((n,a) => n + a.b.length, 0);
  const dark = list.filter(a => !a.w).length;
  let out = '<div class="blead"><p>' +
    (BLINDS.length ? '<b>' + boards.toLocaleString() + '</b> boards at <b>' + list.length +
      '</b> agencies cannot be read by the scan' +
      (dark ? ', and <b>' + dark + '</b> of those agencies have no readable board at all' : '') +
      '. They are missing from the Directory count and no arrival will ever be reported from them ' +
      '\u2014 these are the ones somebody has to open by eye.' : '') + '</p>' +
    '<p>Opening an agency here, or any board inside it, records the check in the work log on the ' +
    'right, dated to the first time you did it. That is how you tell a blind spot you looked at ' +
    'last week from one nobody has opened this year.</p>' +
    '<div class="rlegend">' +
      ['blocked','javascript','truncated'].map(r =>
        '<div><span class="rchip ' + r + '">' + REASON[r].l + '</span><em>' +
        esc(REASON[r].t) + '</em></div>').join('') +
    '</div></div>';
  /* The same three levels the Directory uses - region, country, agency, all
     alphabetical - so a blind spot is found in the same place by the same walk. */
  const bcoll = (x, y) =>
    String(x).localeCompare(String(y), undefined, {sensitivity: 'base'});
  const brows = list.map(a => ({a: a,
    rg: REGION[a.c] || 'Unknown',
    ct: a.c || 'Unknown'}));
  brows.sort((x, y) => bcoll(x.rg, y.rg) || bcoll(x.ct, y.ct) || bcoll(x.a.n, y.a.n));
  const brgAg = new Map(), brgCty = new Map(), bctAg = new Map();
  for(const r of brows){
    const ck = r.rg + '\u0000' + r.ct;
    brgAg.set(r.rg, (brgAg.get(r.rg) || 0) + 1);
    bctAg.set(ck, (bctAg.get(ck) || 0) + 1);
    if(!brgCty.has(r.rg)) brgCty.set(r.rg, new Set());
    brgCty.get(r.rg).add(r.ct);
  }
  let lastRg = null, lastCty = null, grpOpen = false;
  for(const r of brows){
    const a = r.a;
    if(r.rg !== lastRg){
      if(grpOpen){ out += '</div>'; grpOpen = false; }
      if(lastRg !== null) out += '</div></section>';
      const rkey = 'bld:' + r.rg, shut = RGNSHUT.has(rkey);
      const na = brgAg.get(r.rg), nc = brgCty.get(r.rg).size;
      out += '<section class="rgnsec" data-rg="' + esc(rkey) + '" data-rgl="' +
        esc(r.rg) + '" data-open="' + (shut ? '0' : '1') + '">' +
        '<div class="rgn" role="button" tabindex="0" aria-expanded="' + (!shut) +
        '" title="' + (shut ? 'Open ' : 'Fold away ') + esc(r.rg) + '">' +
        '<span class="rgncar">' + (shut ? '+' : '−') + '</span>' +
        '<b>' + esc(r.rg) + '</b><s>' +
        na.toLocaleString() + (na === 1 ? ' agency' : ' agencies') + ' · ' +
        nc + (nc === 1 ? ' country' : ' countries') + '</s></div><div class="rgnbody">';
      lastRg = r.rg; lastCty = null;
    }
    if(r.ct !== lastCty){
      if(grpOpen){ out += '</div>'; grpOpen = false; }
      const na = bctAg.get(r.rg + '\u0000' + r.ct);
      out += '<div class="cty">' + flagImg(r.ct) + esc(r.ct) + '<i>' + na + '</i></div>' +
        '<div class="ctygrp">';
      grpOpen = true; lastCty = r.ct;
    }
    const kinds = [...new Set(a.b.map(b => b.r))];
    out += '<div class="bag" data-b="' + BLINDS.indexOf(a) + '">' +
      '<div class="bagh"><span class="agcar">+</span>' +
      '<span class="bagn">' + esc(a.n) + '</span>' +
      (a.city ? '<span class="bagc">' + esc(a.city) + '</span>' : '') +
      (a.dom ? '<a class="agsite" href="https://' + esc(a.dom) + '" target="_blank" ' +
        'rel="noopener noreferrer" title="Open ' + esc(a.dom) + ' in a new tab">' +
        esc(a.dom) + '<i>↗</i></a>' : '') +
      ctsChip(a.dom || a.n, a.n) +
      '<span class="bdots">' + kinds.map(k => '<i class="' + k + '" title="' +
        esc(REASON[k].l) + '"></i>').join('') + '</span>' +
      '<span class="bagx">' + a.b.length + (a.b.length === 1 ? ' board' : ' boards') +
        '<s>' + (a.w ? a.w + ' still readable' : 'nothing readable') + '</s></span>' +
      '</div><div class="bagbody"></div></div>';
  }
  if(grpOpen) out += '</div>';
  if(lastRg !== null) out += '</div></section>';
  bmain.innerHTML = list.length ? out
    : '<div class="bempty">No blind spot matches that. Clear the search or widen the region.</div>';
  if(VIEW === 'bld')
    countEl.textContent = list.length + ' agencies \u00b7 ' + boards + ' unreadable boards';
  markSeen();
}
bmain.addEventListener('keydown', e => {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const head = e.target.closest && e.target.closest('.rgn');
  if(!head) return;
  e.preventDefault();
  toggleRegion(head);
});
bmain.addEventListener('click', e => {
  if(e.target.closest('a.agsite')){ e.stopPropagation(); return; }
  const rgnhead = e.target.closest('.rgn');
  if(rgnhead){ toggleRegion(rgnhead); return; }
  const row = e.target.closest('.brow');
  if(row){
    const a = BLINDS[+row.closest('.bag').dataset.b];
    remember('check', row.dataset.ref, row.dataset.nm,
             a.n + ' \u00b7 ' + REASON[row.dataset.r].l, row.href);
    return;
  }
  const head = e.target.closest('.bagh');
  if(!head) return;
  const box = head.parentElement;
  const open = box.dataset.open === '1';
  box.dataset.open = open ? '0' : '1';
  head.querySelector('.agcar').textContent = open ? '+' : '\u2212';
  if(open) return;
  const a = BLINDS[+box.dataset.b];
  remember('check', 'blind:' + a.dom, a.n,
           [a.city, a.c].filter(Boolean).join(' \u00b7 ') + ' \u00b7 ' +
           a.b.length + (a.b.length === 1 ? ' blind board' : ' blind boards'),
           a.b[0] ? a.b[0].u : '');
  const body = box.querySelector('.bagbody');
  if(body.dataset.filled !== '1'){
    body.innerHTML = a.b.map(b =>
      '<a class="brow" data-ref="board:' + esc(b.u) + '" data-nm="' + esc(b.d) +
      '" data-r="' + esc(b.r) + '" href="' + esc(b.u) +
      '" target="_blank" rel="noopener noreferrer">' +
      '<span class="bd1">' + esc(b.d) + '</span>' +
      '<span class="rchip ' + esc(b.r) + '">' + esc(REASON[b.r].l) + '</span>' +
      '<span class="go">open \u2192</span></a>').join('');
    body.dataset.filled = '1';
  }
  markSeen();
});

/* ================= view switch + shared filters ================= */
/* ================= searches in the work log =================
   A search on the Directory or the Blind spots is a piece of work, so it is filed like
   anything else you opened - and clicking the row puts every box back where it was.
   Recorded after you stop typing, never on each keystroke, and never while empty. */
const SEARCHABLE = {dir: 'Directory', bld: 'Blind spots'};


/* ================= instagram directory =================
   Instagram cannot be read by the scan: it needs a login, and it turns away anything
   that is not a browser. So this list is kept by hand - what the scout finds, the
   scout writes down - and stored whole in one document, "insta"/"list". */
let IGA = [], igReady = false;
/* People paste whole addresses, @handles and handles with a slash on the end. All
   three mean the same account, so only the bare handle is ever stored. */
const igBare = v => String(v == null ? '' : v).trim()
  .replace(/^https?:\/\//i, '').replace(/^www\./i, '')
  .replace(/^instagram\.com\//i, '').replace(/^@+/, '')
  .replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase().slice(0, 30);
const igURL = h => 'https://www.instagram.com/' + String(h || '').replace(/^@+/, '') + '/';
const igHandle = h => '@' + String(h || '').replace(/^@+/, '').replace(/\/+$/, '');
/* ---- a model's own Instagram ----
   Two places a handle can come from: the Instagram tab's list, matched on the name the
   agency publishes, or typed straight onto the card and kept per model. Typed wins - it
   was put there deliberately. Sharded 128 ways like the photographs and measurements,
   so the store never grows one enormous document. */
const MIG = new Map();                       // model key -> handle
const migShard = k => 'g' + shard128(k).toString(16);
const igClean = h => String(h || '').trim()
  .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
  .replace(/^@+/, '').replace(/[\/?#].*$/, '').slice(0, 30);
/* ================= 404 =================
   A profile the crawler asked for and was told does not exist. The agency has taken the
   model down. The row is a tombstone: it stops every future run fetching a dead page,
   and it keeps the name, because a name that leaves a board has usually signed. */
const GONE = new Map();
const goneShard = k => 'x' + shard128(k).toString(16);
async function loadGone(){
  if(!DB) return;
  try{
    const snap = await DB.collection('gone').limit(200).get();
    for(const d of ((snap && snap.docs) ? snap.docs : (snap || []))){
      const v = docOf(d);
      for(const [k, r] of Object.entries((v && v.e) || {})){
        if(!Array.isArray(r)) continue;
        GONE.set(k, {t: r[0] || '', nm: r[1] || '', ag: r[2] || '', co: r[3] || ''});
      }
    }
  }catch(e){}
}
function goneLit(){
  let n = 0;
  for(const k of GONE.keys()) if(lampOf(k)) n++;
  return n;
}
function renderGone(){
  const pane = document.getElementById('gmain');
  if(!pane) return;
  const vn = document.getElementById('vn-404');
  if(vn) vn.textContent = GONE.size ? GONE.size : '';
  const lead = '<div class="klead">' +
    '<p>Profiles the crawler asked for and was told do not exist. A 404 is an agency ' +
    'taking a model off the board — the page is gone, so there is nothing left to read ' +
    'from it and no reason to ask again.</p>' +
    '<p>They are filed rather than deleted. A name that leaves a board has usually signed ' +
    'somewhere, and that is worth knowing.</p></div>';
  if(!GONE.size){
    pane.innerHTML = lead + '<div class="kempty">Nothing has come back 404 yet. When a ' +
      'profile disappears between crawls it is recorded here, with the day it went.</div>';
    if(VIEW === '404') countEl.textContent = '';
    return;
  }
  const term = q.value.trim().toLowerCase();
  const rows = [...GONE.entries()]
    .map(([k, g]) => ({k: k, t: g.t, nm: g.nm, ag: g.ag, co: g.co, lamp: lampOf(k)}))
    .filter(r => !term ||
      ((r.nm || '') + ' ' + (r.ag || '') + ' ' + (r.co || '')).toLowerCase().includes(term))
    .sort((a, b) => String(b.t).localeCompare(String(a.t)));
  if(VIEW === '404')
    countEl.textContent = rows.length + (rows.length === 1 ? ' removed' : ' removed') +
      (rows.length === GONE.size ? '' : ' of ' + GONE.size);
  if(!rows.length){
    pane.innerHTML = lead + '<div class="kempty">Nothing matches that. Clear the search to ' +
      'see all ' + GONE.size + '.</div>';
    return;
  }
  const nlit = goneLit();
  const today = localDay(new Date());
  const yest = localDay(new Date(Date.now() - 864e5));
  const byDay = new Map();
  for(const r of rows){
    const d = String(r.t).slice(0, 10) || 'Undated';
    if(!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(r);
  }
  let out = lead;
  if(nlit) out += '<p class="gnote">' + nlit + (nlit === 1 ? ' of these was lit' :
    ' of these were lit') + ' — worth chasing where they went.</p>';
  for(const [day, list] of byDay){
    const label = day === today ? 'Today' : day === yest ? 'Yesterday' : day;
    out += '<div class="kday"><b>' + esc(label) + '</b><s>' + list.length +
      (list.length === 1 ? ' removed' : ' removed') + '</s></div><div class="klist">' +
      list.map(r => {
        const web = /^https?:/i.test(r.k || '');
        const body = '<span class="gx">404</span>' +
          (r.lamp ? '<i class="gl gl-' + r.lamp + '" title="' + esc(LAMPT[r.lamp] || '') +
            '"></i>' : '') +
          '<span class="ktx"><b class="gnm">' + esc(r.nm || r.k) + '</b>' +
          (r.ag ? ' <i>· ' + esc(r.ag) + '</i>' : '') +
          (r.co ? ' <i>· ' + esc(r.co) + '</i>' : '') + '</span>' +
          '<span class="kt">' + esc(String(r.t).slice(11, 16)) + '</span>';
        const cls = 'krow grow' + (r.lamp ? ' grow--lit' : '');
        return web
          ? '<a class="' + cls + '" href="' + esc(r.k) + '" target="_blank" ' +
            'rel="noopener noreferrer">' + body + '</a>'
          : '<div class="' + cls + '">' + body + '</div>';
      }).join('') + '</div>';
  }
  pane.innerHTML = out;
}
async function loadMIG(){
  if(!DB) return;
  try{
    const snap = await DB.collection('mig').limit(200).get();
    for(const d of ((snap && snap.docs) ? snap.docs : (snap || []))){
      const v = docOf(d);
      for(const [k, h] of Object.entries((v && v.e) || {})) if(h) MIG.set(k, h);
    }
  }catch(e){}
}
async function saveMIG(key){
  if(!DB || !SIGNED()) return;
  const sid = migShard(key), e = {};
  for(const [k, h] of MIG) if(migShard(k) === sid) e[k] = h;
  try{ await DB.doc('mig/' + sid).set({e: e}); }catch(err){}
}
const IGBYNAME = new Map();
function igByName(nm){
  const key = String(nm || '').trim().toLowerCase();
  if(!key) return '';
  if(!IGBYNAME.size)
    for(const a of IGA) if(a && a.n && a.h)
      IGBYNAME.set(String(a.n).trim().toLowerCase(), a.h);
  return IGBYNAME.get(key) || '';
}
const igFor = (key, nm) => MIG.get(key) || igByName(nm) || '';
/* Nothing on file. An Instagram keyword search on a model's name is next to useless -
   it lands on whoever else shares it. The agency's own profile page is where the handle
   actually is, usually behind a Social tab, so an unknown chip goes THERE instead and
   falls back to the search only when there is no profile to open. */
const igSearch = nm =>
  'https://www.instagram.com/explore/search/keyword/?q=' + encodeURIComponent(nm || '');
const igLook = (key, nm) => (/^https?:/i.test(key || '') ? key : igSearch(nm));
const IGGLYPH = '<svg class="igi" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5"/>' +
  '<circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1.15"/></svg>';
async function loadIG(){
  if(!DB) return;
  try{
    const snap = await DB.collection('insta').limit(5).get();
    const docs = (snap && snap.docs) ? snap.docs : (snap || []);
    for(const d of docs){
      const data = docOf(d);
      if(data && Array.isArray(data.e)) IGA = data.e;
    }
  }catch(e){}
  igReady = true;
}
async function saveIG(){
  if(!DB || !SIGNED()) return;
  try{ await DB.doc('insta/list').set({e: IGA}); }catch(e){}
}
function igRows(){
  const term = q.value.trim().toLowerCase().replace(/^@+/, '');
  const regions = checked('region');
  return IGA.filter(a => {
    if(regions.length && !regions.includes(REGION[a.k] || 'Unknown')) return false;
    if(term && !((a.n || '') + ' ' + (a.h || '') + ' ' + (a.c || '') + ' ' + (a.k || '') +
                 ' ' + (a.note || '')).toLowerCase().includes(term)) return false;
    return true;
  });
}
function renderIG(){
  const pane = document.getElementById('igmain');
  document.getElementById('vn-ig').textContent = IGA.length ? IGA.length : '';
  const form =
    '<form class="igadd" id="igform" autocomplete="off">' +
      '<div class="igf"><label for="ig-h">Instagram handle</label>' +
        '<input id="ig-h" name="h" placeholder="@agency" required></div>' +
      '<div class="igf"><label for="ig-n">Agency</label>' +
        '<input id="ig-n" name="n" placeholder="Name as they use it" required></div>' +
      '<div class="igf"><label for="ig-c">City</label>' +
        '<input id="ig-c" name="c" placeholder="Optional"></div>' +
      '<div class="igf"><label for="ig-k">Country</label>' +
        '<input id="ig-k" name="k" placeholder="Optional" list="igcountries"></div>' +
      '<div class="igf"><label for="ig-f">Board</label><select id="ig-f" name="f">' +
        ['', 'main', 'newfaces', 'development', 'scouting', 'commercial'].map(t =>
          '<option value="' + t + '">' + (t ? esc(TIER[t] || t) : 'not stated') +
          '</option>').join('') + '</select></div>' +
      '<button type="submit">Add</button>' +
    '</form>' +
    '<datalist id="igcountries">' +
      [...new Set(AG.map(a => a.country).filter(Boolean))].sort()
        .map(c => '<option value="' + esc(c) + '">').join('') + '</datalist>';

  const rows = igRows();
  if(VIEW === 'ig')
    countEl.textContent = (rows.length === IGA.length ? IGA.length : rows.length + ' of ' + IGA.length)
      + (IGA.length === 1 ? ' account' : ' accounts');
  if(!IGA.length){
    pane.innerHTML = form +
      '<div class="nomatch"><h2>Nothing here yet</h2><p>Instagram is the one place the ' +
      'nightly scan cannot go — it needs a login and turns away anything that is not a ' +
      'browser. So this list is yours to keep: add an agency above and its handle becomes ' +
      'a link you can open, dated in the work log like everything else.</p></div>';
    return;
  }
  if(!rows.length){
    pane.innerHTML = form + '<div class="nomatch"><h2>Nothing matches</h2>' +
      '<p>Clear the search or the region. Reset puts everything back.</p></div>';
    return;
  }
  const byC = new Map();
  for(const a of rows){
    const c = a.k || 'Not stated';
    if(!byC.has(c)) byC.set(c, []);
    byC.get(c).push(a);
  }
  let out = form;
  for(const c of [...byC.keys()].sort((x, y) => x.localeCompare(y))){
    const list = byC.get(c).sort((x, y) => (x.n || '').localeCompare(y.n || ''));
    out += '<div class="cgroup">' + esc(c) + '</div><div class="iglist">' +
      list.map(a => {
        const url = igURL(a.h);
        const seen = LITDAY ? '' : '';
        const when = IGSEEN.get(normKey(url)) || '';
        return '<div class="igrow" data-h="' + esc(a.h) + '">' +
          '<a class="ignm" href="' + esc(url) + '" data-u="' + esc(url) + '" data-n="' +
            esc(a.n || '') + '" data-meta="' + esc([a.c, a.k].filter(Boolean).join(' · ')) +
            '" target="_blank" rel="noopener noreferrer">' + esc(a.n || igHandle(a.h)) + '</a>' +
          '<span class="ighd" title="' + esc(igHandle(a.h)) + '">' +
            esc(igHandle(a.h)) + '</span>' +
          '<span class="igtier">' +
            (a.f ? '<span class="tierchip">' + esc(TIER[a.f] || a.f) + '</span>' : '') +
          '</span>' +
          '<span class="igwhere" title="' + esc(a.c || '') + '">' +
            esc(a.c || '') + '</span>' +
          '<span class="igcts">' +
            ctsChip(a.n || igHandle(a.h), a.n || igHandle(a.h)) + '</span>' +
          '<span class="igspc"></span>' +
          '<span class="igseen' + (when ? '' : ' igseen--none') + '">' +
            (when ? 'seen ' + esc(when) : '') + '</span>' +
          '<button type="button" class="igdel" data-del="' + esc(a.h) +
            '" title="Remove this account" aria-label="Remove this account">×</button>' +
          '</div>';
      }).join('') + '</div>';
  }
  pane.innerHTML = out;
  markSeen();
}
/* which handles have been opened, and when - read off the work log like everything else */
let IGSEEN = new Map();
function igSeenIndex(rows){
  IGSEEN = new Map();
  for(const r of rows)
    if(r.kind === 'insta' && r.url){
      const k = normKey(r.url), d = r.first || r.day;
      const had = IGSEEN.get(k);
      if(!had || d < had) IGSEEN.set(k, d);
    }
}
document.getElementById('igmain').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  if(f.id !== 'igform') return;
  const h = String(f.h.value || '').trim().replace(/^@+/, '')
              .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/+$/, '');
  if(!h) return;
  if(IGA.some(a => String(a.h).toLowerCase() === h.toLowerCase())){
    f.h.setCustomValidity('That handle is already on the list');
    f.h.reportValidity();
    setTimeout(() => f.h.setCustomValidity(''), 10);
    return;
  }
  IGA.push({h: h, n: String(f.n.value || '').trim() || igHandle(h),
            c: String(f.c.value || '').trim(), k: String(f.k.value || '').trim(),
            f: f.f.value, note: '', at: localDay(new Date())});
  renderIG(); counts();
  await saveIG();
});
document.getElementById('igmain').addEventListener('click', async e => {
  const del = e.target.closest('button[data-del]');
  if(del){
    const h = del.dataset.del;
    const row = IGA.find(a => a.h === h);
    /* confirm() always resolves false inside a published artifact, so this row used to
       be undeletable. The delete button arms itself on the first click instead. */
    if(del.dataset.armed !== '1'){
      document.querySelectorAll('#igmain button[data-del]')
        .forEach(b => { b.dataset.armed = '0'; b.textContent = '\u00d7'; });
      del.dataset.armed = '1';
      del.textContent = '\u2713';
      del.title = 'Click again to remove ' + ((row && row.n) || igHandle(h));
      setTimeout(() => {
        if(del.isConnected && del.dataset.armed === '1'){
          del.dataset.armed = '0'; del.textContent = '\u00d7';
        }
      }, 4000);
      return;
    }
    IGA = IGA.filter(a => a.h !== h);
    renderIG(); counts();
    await saveIG();
    return;
  }
  const go = e.target.closest('a.ignm[data-u]');
  if(go){
    remember('insta', go.dataset.u, go.dataset.n || go.textContent.trim(),
             go.dataset.meta || '', go.dataset.u);
    renderIG();                       // the seen stamp appears on the way out
  }
});

/* ================= lumen ================= */
/* Everyone lit, read back out of the Directory so the name, board and city are the
   published ones. A mark whose profile the Directory no longer lists still shows -
   found on the work log instead - rather than dropping off the Lumen list unannounced. */
/* ================= the model card =================
   Arrivals and Lumen show the same thing - a face, a name, who they are with, and the
   figures - so they are the same card. Built once here; the only difference between the
   two tabs is the chip that dates it and the "seen once" flag a first sighting carries. */
/* The chip sits with the agency's own contacts, because that is what it is: another
   way to reach this face. A known handle links to the profile; an unknown one offers a
   search, and - once you are signed in - takes a handle typed straight into it. */
/* Who they are with and where. The line used to show the city OR the country, whichever
   it had, and with three chips beside it both the agency and the place were being cut to
   "20 M..." and "Sou...". It now says both, and the chips drop to their own line rather
   than squeezing the words out. */
function whoLine(m){
  const place = [m.city, m.country].filter(Boolean).join(' \u00b7 ');
  /* The agency name is the way to their site. The scout goes there for the pictures the
     scan cannot reach, so it is a link wherever the domain is known and plain text only
     where it is not - never a dead-looking link. */
  const dom = domOf(m.ag);
  const agname = !m.ag ? ''
    : dom
      ? '<a class="agnm" href="https://' + esc(dom) + '" target="_blank" ' +
        'rel="noopener noreferrer" title="Open ' + esc(m.ag) + ' \u2014 ' + esc(dom) +
        '">' + esc(m.ag) + '</a>'
      : '<b class="agnm">' + esc(m.ag) + '</b>';
  return '<div class="litwho">' +
    agname +
    (place ? '<span class="agloc">' + esc(place) + '</span>' : '') +
    '<span class="whochips">' + ctsChip(m.ag) + igChip(m.key, m.nm) + '</span></div>';
}
function igChip(key, nm){
  const h = igFor(key, nm);
  if(h)
    return '<a class="igc" href="' + esc(igURL(h)) + '" target="_blank" ' +
      'rel="noopener noreferrer" data-igk="' + esc(key) + '" title="' + esc(igHandle(h)) +
      ' on Instagram">' + IGGLYPH + '<span>' + esc(igHandle(h)) + '</span>' +
      '<i class="igset" role="button" tabindex="0" title="Change this handle" ' +
      'aria-label="Change this handle">\u270e</i></a>';
  /* Nothing on file yet. The chip is NOT a link: its whole job is to take a handle, so
     the whole chip opens the field. Opening the agency's page is the small arrow beside
     it - a separate target, so neither can be hit by mistake. */
  return '<span class="igc none" role="button" tabindex="0" data-igk="' + esc(key) + '" ' +
    'title="No handle on file \u2014 click to type one in. The agency\u2019s page, where ' +
    'the handle usually sits under a Social tab, is the agency name above">' + IGGLYPH +
    '<span>add ig</span><i class="igset" aria-hidden="true">\u270e</i></span>';
}
function modelCard(m, opts){
  opts = opts || {};
  const web = /^https?:/i.test(m.href || '');
  const f = litFacts(m);
  const sx = f.g === 'M' ? 'm' : f.g === 'F' ? 'f' : 'x';
  const lamp = lampOf(m.key);
  const minor = isMinor(m.key);
  const place = [m.city, m.country].filter(Boolean).join(' · ');
  const dom = domOf(m.ag);
  const agname = !m.ag ? ''
    : dom
      ? '<a class="agnm" href="https://' + esc(dom) + '" target="_blank" ' +
        'rel="noopener noreferrer" title="Open ' + esc(m.ag) + ' — ' + esc(dom) +
        '">' + esc(m.ag) + '</a>'
      : '<b class="agnm">' + esc(m.ag) + '</b>';
  const findBusy = PHOTO_FINDING.has(m.key);
  const photoSay = f.own ? 'Photo saved'
    : (PHOTO_STATUS.get(m.key)?.state === 'not-found' ? 'No retrievable agency photo'
                                                       : 'Photo not saved');
  return '<div class="litrow litv1"' + (lamp ? ' data-lamp="' + lamp + '"' : '') + '>' +
    (opts.fresh ? '<span class="foil" title="First seen on today’s scan">' +
      'new today</span>' : '') +
    picCell(m.key, m.nm, minor ? '' : f.photo) +
    '<div class="litcard"><div class="litr1">' +
    lampsCounted(m.key, lamps(m.key, m.nm, m.ag + (m.div ? ' · ' + m.div : ''), m.href)) +
    (web
      ? '<a class="rnm' + litClass(m.key) + '" data-ref="' + esc(m.href) + '" data-nm="' +
        esc(m.nm) + '" data-ag="' + esc(m.ag) + '" href="' + esc(m.href) +
        '" target="_blank" rel="noopener noreferrer">' + esc(m.nm) + '</a>'
      : '<span class="rnm' + litClass(m.key) + '">' + esc(m.nm) + '</span>') +
    '</div>' +
    litWhoLine(m.key) +
    /* who they are with, and where - read top to bottom down the middle */
    '<div class="litagy">' + agname +
      (place ? '<span class="agloc" title="' + esc(place) + '">' + esc(place) + '</span>' : '') +
    '</div>' +
    /* the facts, said once on one line: sex, board, when */
    '<div class="litfacts">' +
    '<span class="litsex ' + sx + '" title="' + (f.g === '?'
      ? 'This board does not divide by sex, so the agency states none'
      : 'From the agency’s own board wording') + '">' +
      esc(SEXWORD[f.g] || SEXWORD['?']) + '</span>' +
    (f.tier ? '<span class="tierchip" data-t="' + esc(f.tier) + '">' +
      esc(TIER[f.tier] || f.tier) + '</span>' : '') +
    (minor ? '<span class="u18" title="The agency publishes a date of birth that makes ' +
      'this model ' + ageOf(m.key) + '. Held out of recommendations; no photograph kept.">' +
      'under 18</span>' : '') +
    (opts.once ? '<span class="once" title="Seen on one scan only — not yet ' +
      'confirmed by a second">seen once</span>' : '') +
    (opts.day ? '<span class="litday" title="' + esc(opts.dayTitle ||
      'The day this model went on the record') + '">' + esc(opts.day) + '</span>' : '') +
    '</div>' +
    (opts.why ? '<div class="recowhy">' + esc(opts.why) + '</div>' : '') +
    (divAdds(m.div, f) ? '<div class="litdiv">' + esc(m.div) + '</div>' : '') +
    litLine(f, m.key, opts.inband) +
    /* every action in one bar: reach the agency, the photograph, who lit it, book */
    '<div class="litacts"><span class="litib">' +
      ctsChip(m.ag) + igChip(m.key, m.nm) +
      (minor ? '' :
        '<button type="button" class="lumenphotoctl litcam' + (findBusy ? ' finding' : '') +
          (f.own ? ' ok' : '') + '" data-findphoto="' + esc(m.key) + '"' +
          (findBusy ? ' disabled' : '') + ' title="' +
          (findBusy ? 'Finding a photo…' : 'Find photo — ' + photoSay) +
          '" aria-label="Find photo">' + CAMGLYPH + '</button>') +
      (f.photo && !minor
        ? '<span class="pho litimg" data-photo="' + esc(f.photo) + '" role="button" tabindex="0" ' +
          'title="Open the agency’s photograph in a new tab" aria-label="Open the agency’s ' +
          'photograph">' + IMGGLYPH + '</span>' : '') +
    '</span>' +
      bookChip(m.key, m.nm).replace('>\u2192 booking<', '>book \u2192<') + '</div>' +
    '</div></div>';
}
/* How many people chose each lamp, as a small figure under it; hovering the figure names
   them. Nothing is shown under a lamp nobody chose. */
function lampCount(key, v){
  if(PRIV()) return '';
  let who = [];
  try{ who = lampWhoAny(key, v); }catch(e){ who = []; }
  if(!who.length) return '';
  const names = who.map(pid => ((PEOPLE.get(pid) || {}).n || '') + (pid === ME ? ' (you)' : ''));
  return '<b class="lcn" title="' + esc(PEERW[v] + ': ' + names.join(', ')) + '">' + who.length + '</b>';
}
/* everyone on lamp v for this model - unlike lampWho, not only the lamp the card shows */
function lampWhoAny(key, v){
  const who = [];
  if(ME && PEOPLE.has(ME) && MARKS.get(key) === v) who.push(ME);
  for(const x of peersOn(key)) if(x.v === v && who.indexOf(x.pid) < 0) who.push(x.pid);
  return who;
}
function lampsCounted(key, html){
  return html.replace(/(<i [^>]*data-v="([gyr])"[^>]*>)<\/i>/g,
    (all, open, v) => open + lampCount(key, v) + '</i>');
}
const CAMGLYPH = '<svg class="litic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const IMGGLYPH = '<svg class="litic" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.6"/><path d="M5 18l5-5 3 3 2-2 4 4"/></svg>';
/* Who lit this face, as the discs alone - the ring colour says which lamp, the disc's
   own label says who. The full strip it replaces said the same in two rows. */
function peerMini(key){
  if(PRIV()) return '';
  const list = [];
  if(ME && PEOPLE.has(ME) && MARKS.get(key))
    list.push({pid: ME, v: MARKS.get(key), at: MARKAT.get(key) || ''});
  for(const x of peersOn(key)){
    const mk = PEERMARKS.get(x.pid);
    list.push({pid: x.pid, v: x.v, at: (mk && mk.t && mk.t.get(key)) || ''});
  }
  if(!list.length) return '<span class="peermini none"></span>';
  list.sort((a, b) => (a.at || '￿') < (b.at || '￿') ? -1
                    : (a.at || '￿') > (b.at || '￿') ? 1 : 0);
  const shown = list.slice(0, 4), more = list.length - shown.length;
  const say = list.map(x => ((PEOPLE.get(x.pid) || {}).n || '') + (x.pid === ME ? ' (you)' : '') +
    ' — ' + PEERW[x.v]).join('\n');
  return '<span class="peermini" title="' + esc(say) + '">' +
    shown.map(x => idDisc(x.pid, 'pdisc', ' data-v="' + x.v + '" tabindex="0"')).join('') +
    (more > 0 ? '<b>+' + more + '</b>' : '') + '</span>';
}
/* The sidebar, applied to a lit model. An arrival and a Lumen row are different
   shapes, so the same criteria are read off different fields: the sex and tier come
   from litFacts, which prefers a crawled figure over the board's own wording, and the
   interest filter reads the lamp itself rather than looking the key up again. */
/* One ID's work: the models that ID has put a lamp on, and the booking cards that ID
   opened. Clicking any ID disc on the page narrows every tab to just that. */
function whoHas(pid, key){
  const mk = PEERMARKS.get(pid);
  if(mk && mk.e.has(key)) return true;
  return pid === ME && MARKS.has(key);
}
function whoPaint(){
  const bar = document.getElementById('whobar');
  if(!bar) return;
  const p = litWho && PEOPLE.get(litWho);
  if(!p){ bar.hidden = true; bar.innerHTML = ''; document.body.dataset.who = ''; return; }
  document.body.dataset.who = litWho;
  let lit = 0, bk = 0;
  const mk = PEERMARKS.get(litWho);
  if(mk) lit = mk.e.size; else if(litWho === ME) lit = MARKS.size;
  for(const c of BOOK.values()) if(c.by === litWho && c.st !== 'canc') bk++;
  bar.hidden = false;
  bar.innerHTML = '<span class="whol">Showing only</span>' + idDisc(litWho) +
    '<b>' + esc(p.n) + '</b><span class="whos">' + lit + (lit === 1 ? ' model lit' : ' models lit') +
    ' \u00b7 ' + bk + (bk === 1 ? ' booking' : ' bookings') + '</span>' +
    '<button type="button" id="whoclear">Show everyone \u00d7</button>';
}
function whoSet(pid){
  litWho = (pid && litWho !== pid && PEOPLE.has(pid)) ? pid : '';
  /* your own Lumen shows only your lamps; anyone else's live on Communicatus */
  if(litWho && litWho !== ME && VIEW === 'lit') { whoPaint(); setView('com'); return; }
  whoPaint();
  refresh();
}
/* any ID disc, anywhere, is a filter - except inside the ID dialog and the lamp chips
   that already filter on their own */
document.addEventListener('click', e => {
  const t = e.target && e.target.closest ? e.target : null;
  if(!t) return;
  if(t.closest('#whoclear')){ e.preventDefault(); whoSet(''); return; }
  if(t.closest('#idme') || t.closest('[role="dialog"]') || t.closest('.bv')) return;
  if(t.closest('button[data-lw]')) return;
  const d = t.closest('.iddisc[data-p]') || (t.closest('#sigwho') && document.querySelector('#sigwho .iddisc[data-p]'));
  if(!d) return;
  e.preventDefault(); e.stopPropagation();
  whoSet(d.dataset.p);
}, true);
function litPasses(m, term){
  const sexes = checked('sex'), regions = checked('region'),
        tiers = checked('tier'), marks = checked('mark');
  if(litWho && (!PRIV() || litWho === ME) && !whoHas(litWho, m.key)) return false;
  if(marks.length && !marks.includes(m.v)) return false;
  if(regions.length && !regions.includes(REGION[m.country] || 'Unknown')) return false;
  if(term){
    const hay = (m.nm + ' ' + m.ag + ' ' + m.city + ' ' + m.country + ' ' + m.div)
                  .toLowerCase();
    if(!hay.includes(term)) return false;
  }
  if(!sexes.length && !tiers.length && !(BND && BND.any)) return true;
  const f = litFacts(m);
  if(sexes.length && !sexes.includes(f.g || '?')) return false;
  if(tiers.length && !tiers.includes(f.tier || 'unlabelled')) return false;
  if(BND && BND.any){
    // litFacts speaks centimetres; the bounds read in whichever unit the sidebar shows
    const L = n => n == null ? null
      : (lenUnit === 'in' ? Math.round(n / 2.54 * 10) / 10 : n);
    let sh = null;
    if(shoeUnit === 'eu') sh = f.eu;
    else if(shoeUnit === 'us') sh = f.us;
    else if(f.eu != null) sh = Math.round((f.eu / 1.5 - 1.5) * 10);
    if(!inRange(L(f.ht), BND.ht[0], BND.ht[1])) return false;
    if(!inRange(L(f.bu), BND.bu[0], BND.bu[1])) return false;
    if(!inRange(L(f.wa), BND.wa[0], BND.wa[1])) return false;
    if(!inRange(L(f.hp), BND.hp[0], BND.hp[1])) return false;
    if(!inRange(sh, BND.sh[0], BND.sh[1])) return false;
  }
  return true;
}
/* ================= the shared board =================
   Lumen is no longer a private list. It is every lamp anyone has set, folded into one
   row per model - a face two people lit appears ONCE, not twice - filed under the
   strongest verdict on it: green beats amber beats red. Your own lamp is still the one
   the trio shows and the one clicking changes; the rings and the strip say who else
   reached which conclusion, which is the whole point of sharing the tab. */
const LRANK = {g: 3, y: 2, r: 1};
/* Rebuilt once per render rather than once per card: modelCard asks for it on every
   card, and a hundred cards rebuilding the same map is a hundred passes over it. */
let SHAREDC = null;
function sharedDirty(){ SHAREDC = null; TALLYC = null; }
/* Lumen is private: on that tab only the signed-in ID's own lamps exist. Communicatus
   is the communal room - every ID's lamps, and who lit which. Every other tab keeps
   reading the board as before. */
const PRIV = () => VIEW === 'lit';
const LITV = v => v === 'lit' || v === 'com';
function sharedMarks(){ return PRIV() ? MARKS : boardMarks(); }
function boardMarks(){
  if(SHAREDC) return SHAREDC;
  /* Every account keeps its own lamp. The card is filed under YOUR lamp when you have
     lit one; when you have not, under whatever a colleague decided most recently
     (times compare as text - "YYYY-MM-DD HH:MM" sorts the same as ISO). Either way it
     is one colour, so one lamp. The strip under the card lists everybody's. */
  const best = new Map();                   // key -> {v, at}
  const add = (k, v, at) => {
    at = String(at || '').replace('T', ' ');
    const cur = best.get(k);
    if(!cur || at > cur.at || (at === cur.at && (LRANK[v] || 0) > (LRANK[cur.v] || 0)))
      best.set(k, {v: v, at: at});
  };
  for(const [pid, mk] of PEERMARKS){
    if(!PEOPLE.has(pid) || pid === ME) continue;   // a merged ID is already folded in
    for(const [k, v] of mk.e) add(k, v, (mk.m && mk.m.get(k)) || mk.t.get(k));
  }
  if(ME) for(const [k, v] of LEGACY.e) add(k, v, LEGACY.t.get(k));  // lit before IDs
  const out = new Map();
  for(const [k, b] of best) out.set(k, b.v);
  for(const [k, v] of MARKS) out.set(k, v);         // your own lamp always decides your view
  SHAREDC = out;
  return out;
}
/* A lit face means the BOARD has lit her, not that you personally did. Your own lamp
   decides the colour when you have set one; otherwise the strongest verdict anyone
   reached does - which is also the section the card is filed under. Which of the three
   lamps is filled still says what YOU decided, and the rings say who else decided what. */
function lampOf(key){ if(window.__illuVoteLamp) return window.__illuVoteLamp(key); return sharedMarks().get(key) || ''; }
/* A model taken over to Booking has left the shortlist: the decision Lumen exists to
   make has been made about them, and they are now a negotiation. So the Lumen TAB stops
   showing them - but litRows() itself still knows them, because Find Photo and the bulk
   photo import both look models up through it, and a booking card has a Find Photo. The
   lamp is not touched either: delete the booking card and they come straight back. */
const inBooking = key => { try{ return !!bkForKey(key); }catch(e){ return false; } };
function litShown(){ return litRows().filter(m => !inBooking(m.key)); }
function litRows(){
  agIndex();
  const want = new Map(sharedMarks()), out = [];
  /* This used to walk all 22,000 models and normalise every one of their addresses,
     on every single render - about 60ms of work to find the two hundred that were
     actually lit. The index is built once and then it is a lookup per lamp. */
  for(const [k, v] of want){
    const i = keyInfo(k);
    if(!i) continue;
    out.push({key: k, v: v, nm: i.nm || '(unnamed)', href: i.href, ag: i.ag,
              city: i.city, country: i.country, div: i.div, g: i.g, t: i.t});
  }
  for(const r of out) want.delete(r.key);
  const place = (o, agName) => {
    const a = AGI.has(agName) ? AG[AGI.get(agName)] : null;
    o.ag = agName || '';
    if(a){ o.city = a.city || ''; o.country = a.country || ''; }
    return o;
  };
  if(want.size){
    // found by the morning scan rather than listed on a board: the link still names the agency
    for(const r of allRows()){
      if(!r.url) continue;
      const k = normKey(r.url), v = want.get(k);
      if(!v) continue;
      want.delete(k);
      out.push(place({key: k, v: v, nm: r.name || '(unnamed)', href: r.url,
                      city: '', country: '', div: '', g: '?', t: ''},
                     r.ag || agNameOf(r)));
    }
  }
  for(const [k, v] of want)
    out.push(place({key: k, v: v, nm: k.replace(/^https?:\/\//, ''), href: k,
                    city: '', country: '', div: '', g: '?', t: ''},
                   agNameOf({url: k, meta: ''})));
  return out;
}

/* ================= the scout's own photographs =================
   A published page may not load a picture from an agency's server, but it may serve
   one it holds itself. So a photograph dropped onto a model is uploaded to this
   artifact's own store and shown from there - the only way a face can appear on the
   page rather than only in a downloaded file. */
let ASSETS = null, picsReady = false;
const PICS = new Map();                       // model key -> stored asset id
let picNote = '';
const PICPRE = new Map();                     // model key -> local preview while uploading
/* a photograph changes every card that shows that model - on whichever tab is open,
   not only Lumen */
function picPaint(){
  try{ refresh(); }catch(e){ try{ renderLit(); }catch(_){} }
  try{ if(typeof VIEW !== 'undefined' && VIEW !== 'lit' && VIEW !== 'com') renderLit(); }catch(e){}
  /* what happened to the upload is said on every tab, not only inside Lumen */
  let t = document.getElementById('picsay');
  if(!t){ t = document.createElement('div'); t.id = 'picsay'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  clearTimeout(picPaint.tm);
  t.textContent = picNote || '';
  t.hidden = !picNote;
  t.className = /Uploading/.test(picNote) ? 'busy' : 'warn';
  if(picNote && !/Uploading/.test(picNote)) picPaint.tm = setTimeout(() => { t.hidden = true; }, 7000);
}
/* A phone photograph can be 10MB and wider than any card. Before it is stored it is
   redrawn at a sensible size as a JPEG; a file the browser cannot decode goes up as it is. */
async function picShrink(file){
  try{
    if(/svg|gif/i.test(file.type || '')) return file;
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    if(k === 1 && file.size < 2.5 * 1024 * 1024 && /jpe?g|png|webp/i.test(file.type)) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg', .9));
    return b || file;
  }catch(e){ return file; }
}
async function loadPics(){
  ASSETS = (await use('assets').catch(() => null)) || ASSETS;
  if(!DB){ picsReady = true; return; }
  try{
    const snap = await DB.collection('photos').limit(400).get();
    const docs = (snap && snap.docs) ? snap.docs : (snap || []);
    for(const d of docs){
      const data = docOf(d);
      for(const [k, v] of Object.entries((data && data.e) || {})) if(v) PICS.set(k, v);
    }
  }catch(e){}
  picsReady = true;
}
async function savePicShard(key){
  if(!DB || !SIGNED()) return;
  const sid = markShard(key), e = {};
  for(const [k, v] of PICS) if(markShard(k) === sid) e[k] = v;
  try{ await DB.doc('photos/' + sid).set({e: e}); }catch(err){}
}
const picURL = id => '/_blob/' + id;
async function setPic(key, file){
  if(!key || !file) return;
  if(!/^image\//i.test(file.type || '')){
    picNote = 'That is not an image file.'; picPaint(); return;
  }
  if(file.size > 20 * 1024 * 1024){
    picNote = 'That photograph is over 20MB — save a smaller copy first.';
    picPaint(); return;
  }
  if(!ASSETS){ try{ ASSETS = await use('assets'); }catch(e){} }
  if(!ASSETS){
    picNote = 'Photographs need this page’s own store, which is not available in ' +
              'this view.';
    picPaint(); return;
  }
  /* the chosen picture shows on the card at once, from this computer, while it uploads */
  const prev = PICPRE.get(key); if(prev) try{ URL.revokeObjectURL(prev); }catch(e){}
  try{ PICPRE.set(key, URL.createObjectURL(file)); }catch(e){}
  picNote = 'Uploading…'; picPaint();
  try{
    const res = await ASSETS.upload(await picShrink(file));
    if(!res || !res.id) throw new Error('no id');
    const old = PICS.get(key);
    PICS.set(key, res.id);
    picNote = '';
    picPaint();
    /* keep the local copy until the stored one has loaded, so the card never blinks empty */
    const keep = PICPRE.get(key);
    const im = new Image();
    im.onload = im.onerror = () => { if(PICPRE.get(key) === keep){ PICPRE.delete(key); try{ URL.revokeObjectURL(keep); }catch(e){} picPaint(); } };
    im.src = picURL(res.id);
    await savePicShard(key);
    // the picture it replaced is nobody's now
    if(old && old !== res.id){ try{ await ASSETS.delete(old); }catch(e){} }
  }catch(err){
    { const p = PICPRE.get(key); PICPRE.delete(key); if(p) try{ URL.revokeObjectURL(p); }catch(e){} }
    const code = err && err.code;
    picNote = code === 'not_granted'
      ? 'Claude needs your permission to store photographs on this page.'
      : code === 'unsupported_type' ? 'That file type can’t be stored — save it as a JPG or PNG and try again.'
      : code === 'quota_or_state' ? 'The page’s photo storage is full — remove an old photograph first.'
      : code === 'rate_limited' ? 'Too many uploads at once — wait a moment and try again.'
      : code === 'upstream_auth' ? 'Your sign-in to Claude has lapsed — reload the page and try again.'
      : 'That upload did not go through. Try again, or a smaller file.';
    picPaint();
  }
}
async function dropPic(key){
  const id = PICS.get(key);
  if(!id) return;
  PICS.delete(key);
  picPaint();
  await savePicShard(key);
  if(ASSETS){ try{ await ASSETS.delete(id); }catch(e){} }
}
/* one picker for the whole tab, pointed at whichever model asked for it */
let picFor = null;
const picInput = document.createElement('input');
picInput.type = 'file';
picInput.accept = 'image/*';
picInput.hidden = true;
document.body.appendChild(picInput);
picInput.addEventListener('change', () => {
  const f = picInput.files && picInput.files[0];
  const k = picFor;
  picInput.value = ''; picFor = null;
  if(k && f) setPic(k, f);
});
/* ---- bulk import: many files at once, matched to lit models by filename ----
   Uses <input type=file multiple>, which works inside the published page's frame.
   showDirectoryPicker does not, which is why the folder route never opened. */
const bulkInput = document.createElement('input');
bulkInput.type = 'file';
bulkInput.accept = 'image/*';
bulkInput.multiple = true;
bulkInput.hidden = true;
document.body.appendChild(bulkInput);
function nameTokens(s){
  return String(s || '').normalize('NFKD').toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
}
bulkInput.addEventListener('change', async () => {
  const files = Array.from(bulkInput.files || []);
  bulkInput.value = '';
  if(!files.length) return;
  const rows = litRows();
  let matched = 0;
  const unmatched = [];
  PHOTO_DIR_NAME = files.length + (files.length === 1 ? ' file' : ' files') + ' chosen';
  for(const f of files){
    const ft = nameTokens(f.name);
    const hit = ft.length ? rows.find(m => {
      const mt = nameTokens(m.nm);
      return mt.length && mt.every(t => ft.includes(t));
    }) : null;
    if(!hit){ unmatched.push(f.name); continue; }
    picNote = 'Importing ' + f.name + '\u2026'; renderLit();
    await setPic(hit.key, f);
    matched++;
  }
  picNote = 'Imported ' + matched + ' of ' + files.length + '. ' +
    (unmatched.length ? unmatched.length + ' matched no lit model: ' +
      unmatched.slice(0,3).join(', ') + (unmatched.length > 3 ? '\u2026' : '') +
      ' \u2014 name files after the model, e.g. Alicia_Ostrowski.jpg'
     : 'Every file matched.');
  renderLit();
});
/* Copy the face out of the card. An uploaded photograph lives on this artifact's own
   origin, so it can be read off a canvas and put on the clipboard as a picture. An
   agency's photograph is somebody else's origin and taints the canvas, so that one
   copies as its address instead - which pastes usefully where a picture would not. */
function picCopyBtn(key, solo){
  return '<button type="button" class="piccopy' + (solo ? ' piccopy--solo' : '') +
    '" data-piccopy="' + esc(key) + '" title="Copy this photograph to the clipboard" ' +
    'aria-label="Copy this photograph to the clipboard">⧉</button>';
}
async function copyPic(key, btn){
  const cell = btn.closest('.litpic');
  const img = cell ? cell.querySelector('img') : null;
  const back = btn.textContent;
  const flash = (cls, txt) => {
    btn.classList.add(cls); btn.textContent = txt;
    setTimeout(() => {
      if(!btn.isConnected) return;
      btn.classList.remove(cls); btn.textContent = back;
    }, 1400);
  };
  if(!img || !img.naturalWidth){ flash('bad', '!'); return; }
  try{
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    cv.getContext('2d').drawImage(img, 0, 0);
    const blob = await new Promise((res, rej) =>
      cv.toBlob(b => b ? res(b) : rej(new Error('no blob')), 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
    flash('ok', '✓');
    return;
  }catch(err){}
  try{
    await navigator.clipboard.writeText(img.currentSrc || img.src || '');
    flash('ok', '✓');
  }catch(err){ flash('bad', '!'); }
}
function picCell(key, nm, src){
  const id = PICS.get(key);
  const drop = ASSETS ? ' data-pic="' + esc(key) + '" tabindex="0" role="button"' : '';
  const pre = PICPRE.get(key);
  if(pre)
    return '<span class="litpic has picup"' + drop + ' title="Saving this photograph…">' +
      '<img src="' + esc(pre) + '" alt="' + esc(nm || '') + '" decoding="async"></span>';
  if(id)
    return '<span class="litpic has"' + drop + ' title="Drop or paste another photograph ' +
      'to replace it">' + '<img src="' + esc(picURL(id)) + '" alt="' + esc(nm || '') +
      '" loading="lazy" decoding="async">' +
      picCopyBtn(key, false) +
      (ASSETS ? '<button type="button" class="picx" data-picdel="' + esc(key) +
        '" title="Remove this photograph" aria-label="Remove this photograph">×</button>'
        : '') + '</span>';
  return '<span class="litpic"' + drop +
    (ASSETS ? ' title="Drop or paste a photograph here, or click to choose one"' : '') + '>' +
    (src
      ? '<img class="agimg" src="' + esc(src) + '" alt="' + esc(nm || '') + '" ' +
        'referrerpolicy="no-referrer" decoding="async" loading="lazy">' + picCopyBtn(key, true) +
        '<a class="picsrc" href="' + esc(src) + '" target="_blank" rel="noopener noreferrer" ' +
        'title="Open the agency’s photograph in a new tab">agency photo ↗</a>'
      : '') +
    '<span class="picfall">' +
    (src
      ? '<a class="picget" href="' + esc(src) + '" target="_blank" rel="noopener noreferrer" ' +
        'title="Open the agency’s photograph in a new tab">the agency’s photo ↗</a>'
      : '') +
    (ASSETS
      ? '<i>' + (src ? 'open the agency photo, then drop or paste it here'
                     : 'drop or paste a photograph<br>or click to choose') + '</i>'
      : '<i>no photograph</i>') + '</span></span>';
}

/* ================= Lumen agency-photo finder =================
   Separate from the green/amber scouting lamps.
   Only the model's own agency profile/photo is considered. If the agency blocks
   retrieval, the slot remains blank for manual upload.
*/
let PHOTO_DIR = null;
let PHOTO_DIR_NAME = '';
let PHOTO_FINDING = new Set();
let PHOTO_STATUS = new Map();

function modelForLumenKey(key){
  try{ return litRows().find(x => x.key === key) || null; }catch(e){ return null; }
}
function photoFileName(name, url, type){
  const base = String(name || 'model').normalize('NFKD')
    .replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'_').slice(0,80) || 'model';
  let ext = '';
  try{
    const p = new URL(url).pathname.toLowerCase();
    const m = p.match(/\.(jpe?g|png|webp|gif)$/);
    if(m) ext = '.' + m[1].replace('jpeg','jpg');
  }catch(e){}
  if(!ext){
    const t = String(type || '').toLowerCase();
    ext = t.includes('png') ? '.png' : t.includes('webp') ? '.webp' : '.jpg';
  }
  return base + '_ILLUMEN_' + localDay(new Date()) + ext;
}
async function chooseLumenPhotoFolder(){
  bulkInput.click();
}
async function saveLumenFile(blob, filename){
  if(!PHOTO_DIR) throw new Error('PHOTO_FOLDER_NOT_SET');
  const fh = await PHOTO_DIR.getFileHandle(filename, {create:true});
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
}
function absURL(base, u){
  try{ return new URL(u, base).href; }catch(e){ return ''; }
}
function htmlPhotoCandidates(html, pageURL, modelName){
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = [], seen = new Set();
  const add = (u, why, score) => {
    if(!u) return;
    u = absURL(pageURL, String(u).trim().replace(/^['"]|['"]$/g,''));
    if(!/^https?:/i.test(u) || seen.has(u)) return;
    seen.add(u); out.push({url:u, why:why, score:score});
  };
  const meta = [
    ['meta[property="og:image"]','content','Agency profile image'],
    ['meta[name="twitter:image"]','content','Agency profile image'],
    ['meta[property="og:image:url"]','content','Agency profile image']
  ];
  for(const [sel,attr,why] of meta){
    const el = doc.querySelector(sel);
    if(el) add(el.getAttribute(attr), why, 100);
  }
  const words = String(modelName || '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu,' ').split(/\s+/).filter(x => x.length > 2);
  for(const img of doc.querySelectorAll('img')){
    const u = img.getAttribute('src') || img.getAttribute('data-src') ||
              img.getAttribute('data-lazy-src') || '';
    const hay = ((img.getAttribute('alt')||'') + ' ' +
                 (img.getAttribute('title')||'') + ' ' + u).toLowerCase();
    const hits = words.filter(w => hay.includes(w)).length;
    if(hits) add(u, 'Agency page image matching model name', 70 + hits * 5);
  }
  out.sort((a,b) => b.score-a.score);
  return out;
}
async function fetchAgencyImage(m, f){
  const candidates = [];
  if(f && f.photo) candidates.push({url:f.photo, why:'Existing agency photograph', score:120});
  if(m && m.href && /^https?:/i.test(m.href)){
    try{
      const r = await fetch(m.href, {credentials:'omit', redirect:'follow'});
      if(r.ok){
        const html = await r.text();
        candidates.push(...htmlPhotoCandidates(html, r.url || m.href, m.nm));
      }
    }catch(e){}
  }
  const seen = new Set();
  for(const c of candidates){
    if(!c.url || seen.has(c.url)) continue;
    seen.add(c.url);
    try{
      const r = await fetch(c.url, {credentials:'omit', redirect:'follow'});
      if(!r.ok) continue;
      const blob = await r.blob();
      if(!/^image\//i.test(blob.type || '') || blob.size < 1000) continue;
      return {blob:blob, url:c.url, why:c.why};
    }catch(e){}
  }
  return null;
}
async function findLumenPhoto(key){
  /* Agency servers refuse cross-origin reads from this page, so the photograph
     cannot be pulled here. This opens a chooser for that one model instead. */
  picFor = key;
  picInput.click();
}

/* An agency photograph that actually decodes takes over its slot. load does not
   bubble, so this listens in the capture phase; a refused or broken image simply never
   fires and the slot keeps the link and the drop target it already had. */
document.addEventListener('load', e => {
  const img = e.target;
  if(!img || !img.classList || !img.classList.contains('agimg')) return;
  if(!img.naturalWidth || img.naturalWidth < 2) return;
  const cell = img.closest('.litpic');
  if(cell) cell.classList.add('gotimg');
}, true);
/* the link inside a loaded slot goes to the agency, not to the file chooser */
document.addEventListener('click', e => {
  if(e.target.closest && e.target.closest('a.picsrc')) e.stopPropagation();
}, true);

/* Which slot a Ctrl+V lands in: the one you are pointing at, or the one you tabbed to.
   A paste is aimed the same way a drop is, so it needs no click first. */
let PICHOVER = '';
document.addEventListener('paste', e => {
  if(!ASSETS || !SIGNED()) return;
  const ae = document.activeElement;
  if(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
  const focused = ae && ae.closest ? ae.closest('.litpic[data-pic]') : null;
  const k = focused ? focused.dataset.pic : PICHOVER;
  if(!k) return;
  const items = (e.clipboardData && e.clipboardData.items) || [];
  for(const it of items){
    if(it.kind !== 'file' || !/^image\//i.test(it.type || '')) continue;
    const f = it.getAsFile();
    if(!f) continue;
    e.preventDefault();
    setPic(k, f);
    return;
  }
});
/* the whole tab is one drop surface; the row under the pointer takes the file */
(function picDrops(){
  ['lmain', 'pane-arr'].forEach(id => bindPicSurface(document.getElementById(id)));
})();
function bindPicSurface(pane){
  if(!pane) return;
  const cellAt = e => {
    const c = e.target && e.target.closest ? e.target.closest('.litpic[data-pic]') : null;
    return c || (e.target && e.target.closest ? e.target.closest('.litrow') : null);
  };
  const keyOf = el => {
    if(!el) return null;
    if(el.classList && el.classList.contains('litpic')) return el.dataset.pic;
    const c = el.querySelector ? el.querySelector('.litpic[data-pic]') : null;
    return c ? c.dataset.pic : null;
  };
  pane.addEventListener('pointerover', e => {
    const c = e.target && e.target.closest ? e.target.closest('.litpic[data-pic]') : null;
    if(c) PICHOVER = c.dataset.pic;
  });
  pane.addEventListener('dragover', e => {
    if(!ASSETS) return;
    const k = keyOf(cellAt(e));
    if(!k) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    pane.querySelectorAll('.litpic.over').forEach(x => x.classList.remove('over'));
    const cell = pane.querySelector('.litpic[data-pic="' + CSS.escape(k) + '"]');
    if(cell) cell.classList.add('over');
  });
  pane.addEventListener('dragleave', e => {
    if(e.target && e.target.closest){
      const c = e.target.closest('.litpic');
      if(c) c.classList.remove('over');
    }
  });
  pane.addEventListener('drop', e => {
    if(!ASSETS) return;
    const k = keyOf(cellAt(e));
    if(!k) return;
    e.preventDefault();
    pane.querySelectorAll('.litpic.over').forEach(x => x.classList.remove('over'));
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if(f) setPic(k, f);
  });
  pane.addEventListener('click', e => {
    const cp = e.target.closest('[data-piccopy]');
    if(cp){ e.preventDefault(); e.stopPropagation(); copyPic(cp.dataset.piccopy, cp); return; }
    const del = e.target.closest('[data-picdel]');
    if(del){ e.preventDefault(); e.stopPropagation(); dropPic(del.dataset.picdel); return; }
    if(e.target.closest('a.picget')) return;      // that one goes to the agency
    const cell = e.target.closest('.litpic[data-pic]');
    if(!cell) return;
    e.preventDefault(); e.stopPropagation();
    picFor = cell.dataset.pic;
    picInput.click();
  });
  pane.addEventListener('keydown', e => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const cell = e.target.closest && e.target.closest('.litpic[data-pic]');
    if(!cell) return;
    e.preventDefault();
    picFor = cell.dataset.pic;
    picInput.click();
  });
}

/* The same card appears on two tabs, so its photo button answers from the document
   rather than from one pane. */
document.addEventListener('click', async e => {
  const find = e.target.closest && e.target.closest('[data-findphoto]');
  if(!find || find.closest('#lmain')) return;   // #lmain has its own handler already
  e.preventDefault(); e.stopPropagation();
  await findLumenPhoto(find.dataset.findphoto);
});

/* Everything the studio knows about a lit model, from whichever source has it: the
   nightly measurement crawl first (numbers, already in centimetres), then whatever the
   morning scan read off the profile, then the board the name was listed on. */
let ARRBY = null, LITDAY = null;
const litDayOf = key => LITDAY.get(key) || (MARKAT.get(key) || '').slice(0, 10) || '';
function litFacts(m){
  const rec = measRec(m.key);
  const arr = ARRBY ? ARRBY.get(m.key) : null;
  const n1 = v => { if(v === null || v === undefined || v === '') return null;
                    const x = parseFloat(v); return isNaN(x) ? null : Math.round(x * 10) / 10; };
  const md = {};
  if(arr) for(const pr of (arr.meas || [])) if(pr) md[String(pr[0]).toUpperCase()] = pr[1];
  const or = (a, b) => (a !== null && a !== undefined) ? a : b;
  const f = {
    ht: or(rec ? n1(rec[0]) : null, or(arr ? n1(arr.ht) : null, n1(leadNum(md.HT)))),
    bu: or(rec ? n1(rec[1]) : null, n1(leadNum(md.B != null ? md.B : md.CH))),
    wa: or(rec ? n1(rec[2]) : null, n1(leadNum(md.W))),
    hp: or(rec ? n1(rec[3]) : null, n1(leadNum(md.H))),
    eu: or(rec ? n1(rec[4]) : null, n1(leadNum(md.SH))),
    us: rec ? n1(rec[5]) : null,
    photo: (arr && arr.photo) || (rec && rec[6]) || '',
    own: PICS.get(m.key) || '',
    tier: (arr && arr.tier) || m.t || '',
    crawled: !!rec,
    fixed: measEdited(m.key)
  };
  f.g = (m.g && m.g !== '?') ? m.g : ((arr && arr.g) || '?');
  return f;
}
const SEXWORD = {M: 'Male', F: 'Female', '?': 'Not stated'};
/* The board's own name for a division is worth printing only where it tells the scout
   something the chips beside it have not already said. "women direct booking" on a card
   that already reads Female and Direct is three words of furniture; "take fashion" or
   "elite kids" is a real answer to which board they sit on. So the sex words are struck
   out when the sex chip states that sex, the tier words when the tier chip is showing,
   and what survives decides whether the line is drawn at all. */
function divAdds(div, f){
  if(!div) return false;
  let s = ' ' + String(div).toLowerCase() + ' ';
  const cut = w => { s = s.replace(new RegExp('\\b' + w + '\\b', 'g'), ' '); };
  if(f.g === 'F') ['women', 'woman', 'female', 'females', 'girls', 'girl', 'ladies'].forEach(cut);
  if(f.g === 'M') ['men', 'man', 'male', 'males', 'boys', 'boy', 'guys'].forEach(cut);
  if(f.tier){
    s = s.replace(/\bnew faces\b/g, ' ').replace(/\bdirect booking\b/g, ' ')
         .replace(/\bmain board\b/g, ' ');
    const t = (TIER[f.tier] || f.tier || '').toLowerCase();
    for(const w of t.split(/[^a-z]+/)) if(w.length > 2) cut(w);
  }
  ['board', 'boards', 'models', 'model', 'all', 'and', 'the'].forEach(cut);
  return /[a-z0-9]/.test(s);
}
/* One line of figures per model. Lengths follow the unit the sidebar is set to; a shoe
   is shown in both EU and US, because a scout quotes whichever the client asks for. */
function litLine(f, key, hit){
  hit = hit || {};
  const ftM = htU === 'ft', inch = bwU === 'in';
  const L = n => n == null ? null : (inch ? Math.round(n / 2.54 * 10) / 10 : n);
  const u = inch ? '″' : 'cm';
  const htVal = f.ht == null ? null : (ftM ? cmToFtIn(f.ht) : f.ht);
  const none = f.ht == null && f.bu == null && f.wa == null && f.hp == null &&
               f.eu == null && f.us == null;
  return '<div class="litr2">' +
    mxCell(key, 'ht', 'HT', htVal, ftM ? '' : 'cm', ftM, hit.ht) +
    mxCell(key, 'eu', 'SH', f.eu, 'EU') +
    mxCell(key, 'us', '', f.us, 'US') +
    mxCell(key, 'bu', f.g === 'M' ? 'CH' : 'B', L(f.bu), u, false, hit.bu) +
    mxCell(key, 'wa', 'W', L(f.wa), u, false, hit.wa) +
    mxCell(key, 'hp', 'H', L(f.hp), u, false, hit.hp) +
    (none ? '<span class="mxnote">' + (f.crawled
      ? 'this agency publishes none — type them in'
      : 'not crawled yet — type them in') + '</span>' : '') + '</div>';
}
/* Three lights, one table - the copy for each lives here rather than in a ternary. */
const SEC = {
  g: {label: 'Interested',
      why: 'Green light \u2014 anyone on the board wants to book them.',
      mine: 'Green light \u2014 you want to book them.',
      none: 'Nothing on the green light yet. The left lamp beside any name puts them here.'},
  y: {label: 'Pending',
      why: 'Amber light \u2014 still being decided. A green lamp from anyone moves a face up.',
      mine: 'Amber light \u2014 you are still deciding.',
      none: 'Nothing pending. The middle lamp parks a model here while you think.'},
  r: {label: 'Ruled out',
      why: 'Red light \u2014 does not fit the criteria. Kept on the record so you do not ' +
           'weigh them up a second time.',
      none: 'Nobody ruled out. The right lamp puts a model here and keeps them out of your way.'}
};
/* The people who set this colour, and how many each. Reads as a scoreboard beside the
   section's own name rather than as another filter - the filter has its own row. */
function secBy(v){
  if(PRIV()) return '';
  const t = tally();
  const who = [...t.entries()].filter(([, c]) => c[v] > 0)
    .sort((a, b) => b[1][v] - a[1][v]);
  if(!who.length) return '';
  return '<span class="secby">' + who.map(([pid, c]) =>
    '<span class="secone" title="' + esc(PEOPLE.get(pid).n) + ' set ' + c[v] + ' of these">' +
    idDisc(pid) + '<b>' + c[v] + '</b></span>').join('') + '</span>';
}
/* What the whole board adds up to, and whose work it is. One click on a name shows
   only the faces that person has lit - the counts stay everyone's, because they are the
   scoreboard you are filtering against. */
function boardStrip(all, ng, ny, nr){
  if(PRIV())
    return '<div class="board"><div class="bsum"><b>' + all.length + '</b><em>' +
      (all.length === 1 ? 'face you have lit' : 'faces you have lit') + '</em>' +
      '<s><span class="bk g">' + ng + ' interested</span>' +
      '<span class="bk y">' + ny + ' pending</span>' +
      '<span class="bk r">' + nr + ' ruled out</span></s></div>' +
      '<div class="bwho"><span class="blab">' + (ME && PEOPLE.has(ME)
        ? 'Only visible to</span>' + idDisc(ME) + '<b class="privme">' +
          esc(PEOPLE.get(ME).n) + '</b>'
        : 'Not signed in</span><span class="privme">sign in with your ID to keep a ' +
          'private list</span>') +
      '<span class="privgo" role="button" tabindex="0" data-gocom="1">' +
      'See everyone\u2019s lamps in Communicatus \u2192</span></div></div>';
  const t = tally();
  const people = [...t.entries()].filter(([, c]) => c.n > 0)
    .sort((a, b) => b[1].n - a[1].n);
  const chip = (pid, label, n, on) =>
    '<button type="button" data-lw="' + esc(pid) + '" aria-pressed="' + on + '">' +
    (pid ? idDisc(pid) : '') + esc(label) + '<b>' + n + '</b></button>';
  return '<div class="board">' +
    '<div class="bsum"><b>' + all.length + '</b><em>' +
      (all.length === 1 ? 'face lit on this board' : 'faces lit on this board') + '</em>' +
      '<s><span class="bk g">' + ng + ' interested</span>' +
      '<span class="bk y">' + ny + ' pending</span>' +
      '<span class="bk r">' + nr + ' ruled out</span></s></div>' +
    (people.length
      ? '<div class="bwho"><span class="blab">Lit by</span>' +
        chip('', 'Everyone', all.length, !litWho) +
        people.map(([pid, c]) => chip(pid, PEOPLE.get(pid).n, c.n, litWho === pid)).join('') +
        '</div>'
      : '') + '</div>';
}
/* When a model went onto the red light - the latest moment anyone whose lamp is red on
   her set it. "m" is the exact moment a lamp last changed (to the second); "t" is only
   when it was first lit, so it stands in for lamps changed before "m" was kept. */
function ruledAt(key){
  let best = '';
  const take = at => { at = String(at || '').replace('T', ' '); if(at > best) best = at; };
  if(MARKS.get(key) === 'r'){
    const mine = myLampRec();
    take((mine.m && mine.m.get(key)) || MARKAT.get(key));
  }
  if(!PRIV()){
    for(const [pid, mk] of PEERMARKS){
      if(!PEOPLE.has(pid) || pid === ME) continue;
      if(mk.e.get(key) === 'r') take((mk.m && mk.m.get(key)) || mk.t.get(key));
    }
    if(ME && LEGACY.e.get(key) === 'r') take(LEGACY.t.get(key));
  }
  return best;
}
function litSection(v, rows){
  const green = v === 'g';
  const shut = LITSHUT.has(v);
  const measured = rows.filter(m => measHas(m.key) || (ARRBY && ARRBY.has(m.key))).length;
  const shot = rows.filter(m => { const f = litFacts(m); return f.own || f.photo; }).length;
  /* The whole coloured band is the switch: a scout working the green list wants the
     amber and red ones out of the way, and putting them back is one click on the band
     they just collapsed. */
  const head = '<div class="lithd" role="button" tabindex="0" data-sec="' + v + '" ' +
      'aria-expanded="' + (shut ? 'false' : 'true') + '" ' +
      'title="' + (shut ? 'Show' : 'Hide') + ' this list">' +
    '<i class="litdot ' + v + '"></i><h2>' + SEC[v].label + '</h2>' +
    '<span class="litwhy" data-sec="' + v + '">' + (PRIV() && SEC[v].mine ? SEC[v].mine : SEC[v].why) +
    '</span>' +
    secBy(v) +
    '<s>' + rows.length +
    (rows.length === 1 ? ' model' : ' models') +
    (rows.length ? ' · ' + shot + ' with a photograph · ' + measured +
                   ' measured' : '') + '</s>' +
    '<b class="litcar" aria-hidden="true">' + (shut ? '\u25B8' : '\u25BE') + '</b></div>';
  const open = ' data-open="' + (shut ? '0' : '1') + '"';
  if(!rows.length)
    return '<section class="litsec litsec--' + v + '"' + open + '>' + head +
      '<p class="litnone">' + SEC[v].none + '</p></section>';
  /* One grid, three across, agencies kept together by the sort rather than by a heading -
     a heading per agency left most rows a third full, and the photograph is the point. */
  const today = localDay(new Date());
  let body;
  if(v === 'r'){
    /* The red list reads newest first: the model just ruled out lands top-left, and
       each card carries the day she was moved here. */
    const at = new Map(rows.map(m => [m.key, ruledAt(m.key)]));
    const list = rows.slice().sort((a, b) =>
      (at.get(b.key) || '').localeCompare(at.get(a.key) || '') ||
      (a.ag || '￿').localeCompare(b.ag || '￿') || a.nm.localeCompare(b.nm));
    body = '<div class="litres">' +
      list.map(m => { const w = at.get(m.key) || '', d = w.slice(0, 10);
        return modelCard(m, {day: d ? 'Ruled out ' + d : '', fresh: d === today,
          dayTitle: 'Moved to Ruled out on ' + (w.slice(0, 16) || 'an unknown date')}); })
        .join('') + '</div>';
  }else{
    const list = rows.slice().sort((a, b) =>
      (a.ag || '￿').localeCompare(b.ag || '￿') || a.nm.localeCompare(b.nm));
    body = '<div class="litres">' +
      list.map(m => { const d = litDayOf(m.key);
        return modelCard(m, {day: d, fresh: d === today}); }).join('') + '</div>';
  }
  return '<section class="litsec litsec--' + v + '"' + open + '>' + head +
    '<div class="litbody">' + body + '</div></section>';
}
/* The page itself may not load a picture from an agency's server - a published page is
   not allowed to - but a file saved to your own machine is not a published page. So the
   contact sheet is built here and handed over as HTML: open it and every photograph
   loads straight from the agency, at full size, next to the figures. */
function contactSheet(){
  const esc2 = s => String(s == null ? '' : s).replace(/[&<>"]/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
  const all = litRows();
  const card = m => {
    const f = litFacts(m);
    const fig = [];
    const put = (l, v, u) => { if(v != null) fig.push('<span><i>' + l + '</i>' +
      esc2(v + (u || '')) + '</span>'); };
    put('HT', f.ht); put(f.g === 'M' ? 'CH' : 'B', f.bu); put('W', f.wa); put('H', f.hp);
    if(f.eu != null || f.us != null)
      fig.push('<span><i>SH</i>' + esc2([f.eu != null ? f.eu + ' EU' : '',
        f.us != null ? f.us + ' US' : ''].filter(Boolean).join(' / ')) + '</span>');
    return '<article class="c">' +
      (f.own
        ? '<a class="ph" href="' + esc2(m.href) + '" target="_blank" rel="noopener">' +
          '<img src="' + esc2(location.origin + picURL(f.own)) + '" alt="' + esc2(m.nm) +
          '" loading="lazy"></a>'
        : f.photo
        ? '<a class="ph" href="' + esc2(m.href) + '" target="_blank" rel="noopener">' +
          '<img src="' + esc2(f.photo) + '" alt="' + esc2(m.nm) + '" loading="lazy" ' +
          'onerror="this.closest(\'.ph\').classList.add(\'none\');this.remove()"></a>'
        : '<div class="ph none"><span>no photograph published</span></div>') +
      '<div class="b"><h3><a href="' + esc2(m.href) + '" target="_blank" rel="noopener">' +
        esc2(m.nm) + '</a></h3>' +
        '<p class="ag">' + esc2([m.ag, m.city, m.country].filter(Boolean).join(' · ')) +
        '</p>' +
        '<p class="dv">' + esc2([SEXWORD[f.g] || '', m.div || ''].filter(Boolean)
          .join(' · ')) + '</p>' +
        (fig.length ? '<div class="m">' + fig.join('') + '</div>'
                    : '<div class="m none">not measured yet</div>') +
      '</div></article>';
  };
  const sec = (v, rows) => '<section class="s s--' + v + '"><h2><i></i>' +
    (SEC[v] ? SEC[v].label : 'Pending') + '<b>' + rows.length +
    (rows.length === 1 ? ' model' : ' models') + '</b></h2>' +
    (rows.length ? '<div class="g">' + rows.map(card).join('') + '</div>'
                 : '<p class="e">Nobody on this light.</p>') + '</section>';
  const by = (a, b) => (a.ag || '').localeCompare(b.ag || '') || a.nm.localeCompare(b.nm);
  /* The sheet is who you are still considering, so the red light is deliberately
     left out of it - a ruled-out model is not someone you print for a client. */
  const g = all.filter(m => m.v === 'g').sort(by), y = all.filter(m => m.v === 'y').sort(by);
  const day = localDay(new Date());
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Illuménoctis — shortlist ' + day + '</title><style>' +
    ':root{--paper:#E8E6EE;--surf:#F7F5FA;--ink:#1B1724;--mut:#6D6579;--faint:#9C93A9;' +
    '--line:#D9D3E2;--acc:#5A2C57;--ok:#2E6845;--okbg:#DFECE4;--hold:#84610F;--holdbg:#F4EBD5;' +
    '--mono:ui-monospace,Menlo,Consolas,monospace}' +
    '*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);' +
    'font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
    '.w{max-width:1280px;margin:0 auto;padding:28px 20px 56px}' +
    'header{border-top:4px solid var(--acc);border-bottom:4px solid var(--acc);' +
    'padding:16px 0;margin-bottom:26px}' +
    'h1{margin:0;font:400 34px/1 Didot,"Bodoni MT",Georgia,serif;letter-spacing:.14em;' +
    'text-transform:uppercase}' +
    '.sub{margin:8px 0 0;font-family:var(--mono);font-size:12px;color:var(--mut)}' +
    '.s{border:1px solid var(--line);border-radius:9px;background:var(--surf);' +
    'margin-bottom:20px;overflow:hidden}' +
    '.s--g{border-top:3px solid var(--ok)}.s--y{border-top:3px solid var(--hold)}' +
    'h2{margin:0;display:flex;align-items:center;gap:10px;padding:13px 16px;font:500 13px/1 ' +
    'var(--mono);letter-spacing:.09em;text-transform:uppercase}' +
    '.s--g h2{background:var(--okbg);color:var(--ok)}' +
    '.s--y h2{background:var(--holdbg);color:var(--hold)}' +
    'h2 i{width:12px;height:12px;border-radius:50%;display:inline-block}' +
    '.s--g h2 i{background:#22D45F}.s--y h2 i{background:#EFBC16}' +
    'h2 b{margin-left:auto;font-weight:400;color:var(--mut);font-size:11px}' +
    '.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(216px,1fr));gap:14px;' +
    'padding:16px}' +
    '.c{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:8px;' +
    'background:var(--paper);overflow:hidden}' +
    '.ph{display:block;width:100%;aspect-ratio:3/4;background:#E2DCEA;overflow:hidden}' +
    '.ph img{width:100%;height:100%;object-fit:cover;object-position:50% 22%;display:block}' +
    '.ph.none{aspect-ratio:auto;min-height:34px;display:grid;place-items:center;' +
    'font-family:var(--mono);font-size:9px;letter-spacing:.06em;text-transform:uppercase;' +
    'color:var(--faint)}' +
    '.b{padding:9px 11px 11px}' +
    'h3{margin:0;font-size:14.5px}h3 a{color:inherit;text-decoration:none}' +
    'h3 a:hover{color:var(--acc)}' +
    '.ag{margin:3px 0 0;font-size:11.5px;color:var(--mut)}' +
    '.dv{margin:2px 0 0;font-family:var(--mono);font-size:9.5px;letter-spacing:.05em;' +
    'text-transform:uppercase;color:var(--faint)}' +
    '.m{display:flex;flex-wrap:wrap;gap:2px 10px;margin-top:7px;font-family:var(--mono);' +
    'font-size:11px;font-variant-numeric:tabular-nums}' +
    '.m i{font-style:normal;font-size:8.5px;letter-spacing:.08em;color:var(--faint);' +
    'margin-right:3px}' +
    '.m.none{color:var(--faint);font-size:10px}' +
    '.e{padding:16px;margin:0;color:var(--mut);font-size:13px}' +
    '@media print{body{background:#fff}.s{break-inside:avoid}.c{break-inside:avoid}}' +
    '</style></head><body><div class="w"><header><h1>Shortlist</h1>' +
    '<p class="sub">' + day + ' · ' + g.length + ' interested · ' + y.length +
    ' pending · photographs load from each agency’s own site</p></header>' +
    sec('g', g) + sec('y', y) + '</div></body></html>';
}

/* ---- Updates with photos ---------------------------------------------------
   The dashboard may only draw pictures it holds, so the agency photograph that every
   Updates card already carries is refused here and the card falls back to "the agency's
   photo". A file opened from the computer has no such rule. So this writes the Updates
   tab out as it is - the same stylesheet, the same cards, every week instead of one -
   and a few lines in the file reveal each photograph as it arrives. Controls that only
   work inside the dashboard (lamps, photo buttons, Refresh) are switched off. */
function updatesSheet(rows){
  const today = localDay(new Date()), yest = localDay(new Date(Date.now() - 864e5));
  ARRBY = new Map();
  for(const a of arrivalRows()) if(a.url) ARRBY.set(normKey(a.url), a);
  const weeks = [...new Set(rows.map(a => weekOf(a.day)))].sort().reverse();
  let body = '';
  weeks.forEach((wk, wi) => {
    const pageRows = rows.filter(a => weekOf(a.day) === wk);
    body += '<div class="wkanchor" id="w' + (wi + 1) + '"></div>' +
      pagerHtml(weeks, wi, pageRows.length, false);
    const byDay = new Map();
    for(const a of pageRows){ if(!byDay.has(a.day)) byDay.set(a.day, []); byDay.get(a.day).push(a); }
    for(const [day, items] of byDay){
      const label = day === today ? 'Today' : day === yest ? 'Yesterday' : day;
      const run = RUNS.get(day) || {};
      body += '<div class="aday"><div class="adayh"' + (day === today ? ' data-today="1"' : '') +
        '><b>' + esc(label) + '</b><s>' + items.length +
        (items.length === 1 ? ' new face' : ' new faces') + '</s></div>';
      if(run.boards){
        const stat = (n, w) => '<span><em>' + esc(String(n)) + '</em>' + w + '</span>';
        body += '<div class="arun">' + stat(run.boards, 'boards scanned') +
          stat(run.found ?? '', 'new') +
          (run.kept != null && run.kept !== run.found ? stat(run.kept, 'within your heights') : '') +
          '</div>';
      }
      for(const sx of ['F','M','?']){
        const group = items.filter(a => (a.g || '?') === sx);
        if(!group.length) continue;
        group.sort((x,y) => (x.country||'').localeCompare(y.country||'') ||
          (x.agency||'').localeCompare(y.agency||'') || (x.name||'').localeCompare(y.name||''));
        body += '<div class="asex"><b>' + esc(SEXNAME[sx]) + '</b><s>' + group.length + '</s></div>' +
          '<div class="litres">' + group.map(a => card(a, day === today)).join('') + '</div>';
      }
      body += '</div>';
    }
  });
  /* the pager buttons jump to each week further down the same file */
  body = body.replace(/data-wk="([^"]*)"/g, (m0, wk) => {
    const n = weeks.indexOf(wk) + 1;
    return n ? 'data-go="w' + n + '"' : '';
  });
  const reco = recoBlock().replace(/<button type="button" id="recorefresh"[^>]*>[^<]*<\/button>/, '');
  /* own photos sit in the dashboard's storage; give them the dashboard's full address */
  const fix = h => h.replace(/src="\/_blob\//g, 'src="' + location.origin + '/_blob/');
  const css = [...document.querySelectorAll('style')].filter(x => x.id !== 'onlinecss')
    .map(x => x.textContent).join('\n');
  const fonts = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map(l => '<link rel="stylesheet" href="' + esc(l.href) + '">').join('');
  const theme = document.documentElement.getAttribute('data-theme');
  return '<!doctype html><html lang="en"' + (theme ? ' data-theme="' + esc(theme) + '"' : '') +
    '><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="referrer" content="no-referrer">' +
    '<title>Illuménoctis — Updates ' + today + '</title>' + fonts + '<style>' + css +
    '\n.sheetw{max-width:1500px;margin:0 auto;padding:22px 0 60px}' +
    '.sheeth{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin:0 0 18px;' +
    'padding-bottom:14px;border-bottom:1px solid var(--line)}' +
    '.sheeth h1{margin:0;font-family:"Bodoni Moda",Didot,Georgia,serif;font-weight:400;' +
    'font-size:30px;letter-spacing:.12em;text-transform:uppercase}' +
    '.sheeth p{margin:0;font-family:var(--mono);font-size:11.5px;color:var(--mut)}' +
    '.wkanchor{scroll-margin-top:12px}.shell{display:block!important}' +
    '.apager{position:static!important}' +
    '.mk,.lumenphotobar,.picx,.piccopy,.picfall i,.pho,.recobtn,.cardx,[data-bkadd],' +
    '[data-rmv]{pointer-events:none}' +
    '.lumenphotobar,.picx,.piccopy,.recobtn{display:none!important}' +
    '.litpic[data-pic]{cursor:default}' +
    '</style></head><body class="' + esc(document.body.className) + '" data-view="arr" ' +
    'data-ro="1"><div class="w"><div class="shell"><div><div class="sheetw">' +
    '<div class="sheeth"><h1>Updates</h1><p>' +
    esc(today) + ' · ' + rows.length + (rows.length === 1 ? ' new face' : ' new faces') +
    ' · ' + weeks.length + (weeks.length === 1 ? ' week' : ' weeks') +
    ' · photographs load from each agency’s own site</p></div>' +
    '<div class="pane" id="pane-arr">' + fix(reco + body) + '</div></div></div></div></div>' +
    '<script>(function(){function ok(i){var p=i.closest(".litpic");if(p)p.classList.add("gotimg")}' +
    'document.querySelectorAll("img.agimg").forEach(function(i){' +
    'if(i.complete&&i.naturalWidth)ok(i);else i.addEventListener("load",function(){ok(i)})});' +
    'document.addEventListener("click",function(e){var a=e.target.closest("a[href]");' +
    'if(a&&a.getAttribute("href").charAt(0)!=="#"){a.target="_blank";a.rel="noopener"}' +
    'var g=e.target.closest("[data-go]");if(g){e.preventDefault();' +
    'document.getElementById(g.dataset.go).scrollIntoView({behavior:"smooth"});return}' +
    'if(e.target.closest("button")&&!a){e.preventDefault();e.stopPropagation()}},true)})()<\/script>' +
    '</body></html>';
}

/* Which control is doing the hiding, in the order a person would check. */
function litWhyEmpty(term){
  const bits = [];
  if(BND && BND.any) bits.push('a measurement bound is set, and that hides anyone whose ' +
    'agency never published that figure');
  const mk = checked('mark'), sx = checked('sex'), tr = checked('tier'), rg = checked('region');
  if(mk.length) bits.push('the interest filter is narrowed');
  if(sx.length) bits.push('a sex is selected');
  if(tr.length) bits.push('a board tier is selected');
  if(rg.length) bits.push('a region is selected');
  if(litWho && !PRIV()) bits.push('the list is showing one person\u2019s lamps only');
  if(term) bits.push('there is a search term in the box');
  if(!bits.length) return 'Press Reset in the filters to see them all again.';
  return 'Right now ' + bits.join(', ') + '.';
}
function renderLit(){
  const pane = document.getElementById('lmain');
  ARRBY = new Map();
  for(const a of arrivalRows()) if(a.url) ARRBY.set(normKey(a.url), a);
  LITDAY = new Map();
  for(const r of allRows()){
    if((r.kind !== 'model' && r.kind !== 'arrival') || !r.url) continue;
    const k = normKey(r.url), d = r.first || r.day;
    const had = LITDAY.get(k);
    if(!had || d < had) LITDAY.set(k, d);      // the day it first went on the record
  }
  const every = litRows();
  const all = every.filter(m => !inBooking(m.key));
  const moved = every.length - all.length;
  litBadge();
  readBounds();
  const term = q.value.trim().toLowerCase();
  const rows = all.filter(m => litPasses(m, term));
  const g = rows.filter(m => m.v === 'g'), y = rows.filter(m => m.v === 'y'),
        r = rows.filter(m => m.v === 'r');
  const shot = all.filter(m => { const f = litFacts(m); return f.own || f.photo; }).length;
  // green first and whole, then amber: the order is the decision
  pane.innerHTML =
    (picNote ? '<div class="picnote">' + esc(picNote) + '</div>' : '') +
    (moved ? '<div class="litmoved" role="button" tabindex="0" title="Open the Booking tab">' +
      moved + (moved === 1 ? ' model has' : ' models have') +
      ' moved to Booking and left this list \u2014 their lamps are kept, and they come ' +
      'back here if the booking card is removed. <b>Open Booking \u2192</b></div>' : '') +
    boardStrip(all, g.length, y.length, r.length) +
    (all.length && DOWN
      ? '<div class="litbar"><button type="button" id="litsheet">Contact sheet \u2193</button>' +
        '<button type="button" id="lumenfolder" class="lumenphotoctl">Import photos…</button>' +
        '<span>' + shot + ' of ' + all.length + ' with a photograph. Import photos picks many ' +
        'files at once and matches them by filename — name each after the model ' +
        '(Alicia_Ostrowski.jpg). You can also drop an image straight onto a card, or click ' +
        'a card’s empty slot. The page can only show pictures it holds itself, not ones on ' +
        'an agency’s server, so the contact sheet is saved to your machine where both load.</span>' +
        '<span class="lumenfolder">' + (PHOTO_DIR_NAME ? esc(PHOTO_DIR_NAME) : '') + '</span></div>'      : '') +
    /* An empty Lumen reads as "my lamps are gone", which is frightening and usually
       wrong: a bound typed into the sidebar hides every model whose agency published
       no such figure, and a search left in the box hides the rest. So when there are
       lamps and nothing is showing, say which it is and offer the way back. */
    ((all.length && !rows.length)
      ? '<div class="nomatch"><h2>Your lamps are still here</h2><p>' + all.length +
        (all.length === 1 ? ' model is lit' : ' models are lit') +
        ', but nothing answers the filters as they stand' +
        (term ? ' and the search for \u201c' + esc(q.value.trim()) + '\u201d' : '') +
        '. ' + esc(litWhyEmpty(term)) +
        '</p><button type="button" class="bknew" id="litreset">Clear the filters</button></div>'
      : '') +
    litSection('g', g) + litSection('y', y) + (r.length ? litSection('r', r) : '');
  if(LITV(VIEW))
    countEl.textContent = g.length + ' interested · ' + y.length + ' pending' +
      (r.length ? ' · ' + r.length + ' ruled out' : '') +
      (term && all.length !== rows.length ? ' of ' + all.length : '');
  markSeen();
}
document.getElementById('lmain').addEventListener('click', e => {
  if(e.target.closest && e.target.closest('[data-gocom]')){ setView('com'); return; }
  if(e.target.closest && e.target.closest('#litreset')){
    /* the same Reset the sidebar offers, reachable from where the emptiness is */
    litWho = ''; whoPaint();
    const r = document.getElementById('reset');
    if(r) r.click(); else { q.value = ''; refresh(); }
    return;
  }
  const lw = e.target.closest && e.target.closest('button[data-lw]');
  if(lw){
    e.preventDefault();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    litWho = lw.dataset.lw || '';
    whoPaint();
    renderLit();
    return;
  }
  const band = e.target.closest && e.target.closest('.lithd[data-sec],.litwhy[data-sec]');
  if(!band) return;
  const v = band.dataset.sec;
  e.preventDefault();
  if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  if(LITSHUT.has(v)) LITSHUT.delete(v); else LITSHUT.add(v);
  renderLit(); savePrefsUI();
});
document.getElementById('lmain').addEventListener('keydown', e => {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const band = e.target.closest && e.target.closest('.lithd[data-sec]');
  if(!band) return;
  e.preventDefault();
  band.click();
});
document.getElementById('lmain').addEventListener('click', async e => {
  const folder = e.target.closest('#lumenfolder');
  if(folder){
    e.preventDefault(); e.stopPropagation();
    await chooseLumenPhotoFolder();
    return;
  }
  const find = e.target.closest('[data-findphoto]');
  if(find){
    e.preventDefault(); e.stopPropagation();
    await findLumenPhoto(find.dataset.findphoto);
    return;
  }
  const sheet = e.target.closest('#litsheet');
  if(sheet){
    if(!DOWN) return;
    const was = sheet.textContent;
    sheet.textContent = 'Building\u2026';
    try{
      await DOWN.save({filename: 'shortlist-' + localDay(new Date()) + '.html',
                       data: contactSheet()});
      sheet.textContent = 'Saved';
    }catch(err){
      sheet.textContent = (err && err.code === 'declined') ? 'Cancelled' : 'Not available';
    }
    setTimeout(() => { sheet.textContent = was; }, 2400);
    return;
  }
  if(e.target.closest('.litmoved')){ setView('bk'); return; }
  if(markClick(e)) return;
  const ph = e.target.closest('.pho[data-photo]');
  if(ph){
    e.preventDefault(); e.stopPropagation();
    const row = ph.closest('.litrow');
    const nm = row && row.querySelector('.rnm[data-ref]');
    if(nm) remember('model', nm.dataset.ref, nm.dataset.nm, nm.dataset.ag, nm.dataset.ref);
    window.open(ph.dataset.photo, '_blank', 'noopener,noreferrer');
    return;
  }
  const hit = e.target.closest('.rnm[data-ref]');
  if(hit) remember('model', hit.dataset.ref, hit.dataset.nm, hit.dataset.ag, hit.dataset.ref);
});
document.getElementById('lmain').addEventListener('keydown', e => {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const ph = e.target.closest('.pho[data-photo]');
  if(!ph) return;
  e.preventDefault();
  window.open(ph.dataset.photo, '_blank', 'noopener,noreferrer');
});

function searchState(){
  const pair = k => [bound(k + '-lo'), bound(k + '-hi')];
  const none = [null, null];
  // a blind board has no roster, so only the words and the region do anything there;
  // recording the rest would put criteria in the log that changed nothing on screen
  const full = VIEW !== 'bld';
  return {v: VIEW, q: q.value.trim(),
          sex: full ? checked('sex') : [], region: checked('region'),
          tier: full ? checked('tier') : [], mark: full ? checked('mark') : [],
          lu: lenUnit, su: shoeUnit,
          b: full ? {ht: pair('ht'), bu: pair('b'), wa: pair('w'), hp: pair('h'), sh: pair('s')}
                  : {ht: none, bu: none, wa: none, hp: none, sh: none}};
}
const searchEmpty = st => !st.q && !st.sex.length && !st.region.length && !st.tier.length &&
  !st.mark.length && !Object.keys(st.b).some(k => st.b[k][0] !== null || st.b[k][1] !== null);
function searchLabel(st){
  const bits = [];
  if(st.q) bits.push('\u201c' + st.q + '\u201d');
  if(st.sex.length) bits.push(st.sex.map(x => x === '?' ? 'sex not stated' : SEXNAME[x]).join(' + '));
  if(st.tier.length) bits.push(st.tier.map(t => TIER[t] || t).join(' + '));
  if(st.region.length) bits.push(st.region.join(' + '));
  if(st.mark.length) bits.push(st.mark.map(m => m === 'g' ? 'interested' : 'pending').join(' + '));
  const span = (p, lbl, unit) => (p[0] === null && p[1] === null) ? null
    : lbl + ' ' + (p[0] === null ? '\u2264' : p[0]) +
      (p[0] !== null && p[1] !== null ? '\u2013' : '') + (p[1] === null ? '+' : p[1]) + unit;
  const u = st.lu === 'in' ? 'in' : 'cm';
  [['ht','HT'],['bu','B'],['wa','W'],['hp','H']].forEach(([k, lbl]) => {
    const t = span(st.b[k], lbl, u); if(t) bits.push(t);
  });
  const sh = span(st.b.sh, 'SH', ' ' + st.su.toUpperCase()); if(sh) bits.push(sh);
  return bits.join(' \u00b7 ');
}
let searchTimer = null, lastSearchKey = '';
function noteSearch(){
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if(!SEARCHABLE[VIEW]) return;
    const st = searchState();
    if(searchEmpty(st)) return;
    const key = 'search:' + JSON.stringify(st);
    if(key === lastSearchKey) return;
    lastSearchKey = key;
    remember('search', key, searchLabel(st), SEARCHABLE[VIEW], '', {state: st});
  }, 1100);
}
function applySearch(st){
  q.value = st.q || '';
  document.querySelectorAll('input[data-f]').forEach(i => {
    const list = st[i.dataset.f] || [];
    i.checked = list.includes(i.value);
  });
  const put = (k, v) => { const el = document.querySelector('input[data-m="' + k + '"]');
    if(el) el.value = (v === null || v === undefined) ? '' : v; };
  const b = st.b || {};
  [['ht','ht'],['bu','b'],['wa','w'],['hp','h'],['sh','s']].forEach(([k, pre]) => {
    const p = b[k] || [null, null]; put(pre + '-lo', p[0]); put(pre + '-hi', p[1]);
  });
  lenUnit = bwU = (st.lu === 'in' ? 'in' : 'cm'); shoeUnit = st.su || 'eu';
  paintUnits(); paintUnitHint();
  document.querySelectorAll('#shoeunit button').forEach(x =>
    x.setAttribute('aria-pressed', String(x.dataset.u === shoeUnit)));
  lastSearchKey = 'search:' + JSON.stringify(searchState());
  setView(st.v || 'dir');
  openRail(false);
}
/* ================= the backlog tab =================
   Who did what, newest first. Every row is a lamp somebody set, so the row links to the
   model it was set on and the disc says who set it. Nothing here is editable: to change
   a decision you change the lamp, and that files itself as its own line. */
function renderBacklog(){
  const pane = document.getElementById('kmain');
  if(!pane) return;
  const vn = document.getElementById('vn-bkl');
  if(vn) vn.textContent = BLOG.length ? BLOG.length : '';
  const lead = '<div class="klead">' +
    '<p>Every lamp anyone has set on this dashboard, in the order it happened. A lamp is a ' +
    'judgement, so it is filed under whoever made it — the disc carries their colour, ' +
    'the ring carries the verdict.</p>' +
    '<p>Nothing here can be edited. To change a decision, change the lamp: the change files ' +
    'itself as its own line, and both stay on the record.</p></div>' + agDelSection() + mdelSection();
  if(!PEOPLE.size){
    pane.innerHTML = lead + '<div class="kempty">Nobody has an ID yet, so there is nothing ' +
      'to attribute. Add yourself from the top right and your lamps start appearing here.</div>';
    if(VIEW === 'bkl') countEl.textContent = '';
    return;
  }
  const chips = '<div class="kwho">' +
    '<button type="button" class="all" data-kw="" aria-pressed="' + (!kWho) + '">Everyone</button>' +
    [...PEOPLE.keys()].map(pid =>
      '<button type="button" data-kw="' + pid + '" aria-pressed="' + (kWho === pid) + '">' +
      idDisc(pid) + esc(PEOPLE.get(pid).n) + '</button>').join('') + '</div>';
  const term = q.value.trim().toLowerCase();
  const dayQ = kDayOf(term);
  const rows = BLOG.filter(r => {
    if(kWho && r.p !== kWho) return false;
    if(!term) return true;
    const day = String(r.ts).slice(0, 10);
    if(dayQ) return dayQ.length === 10 ? day === dayQ : day.slice(5) === dayQ;
    const p = PEOPLE.get(r.p) || GONEID.get(r.p);
    const verb = (KVERB[r.v] || ['', '']).join(' ');
    const [y, m, d] = day.split('-');
    return ((r.nm || '') + ' ' + (r.ag || '') + ' ' + (p ? p.n : '') + ' ' + verb + ' ' + day + ' ' +
      d + '/' + m + '/' + y).toLowerCase().includes(term);
  }).slice().reverse();
  if(VIEW === 'bkl')
    countEl.textContent = rows.length + (rows.length === 1 ? ' action' : ' actions') +
      (rows.length === BLOG.length ? '' : ' of ' + BLOG.length);
  if(!rows.length){
    pane.innerHTML = lead + chips + '<div class="kempty">' +
      (BLOG.length ? 'Nothing matches that. Clear the search or pick Everyone.'
                   : 'No lamps set yet. The first one you light turns up here.') + '</div>';
    return;
  }
  const today = localDay(new Date());
  const yest = localDay(new Date(Date.now() - 864e5));
  const byDay = new Map();
  for(const r of rows){
    const d = String(r.ts).slice(0, 10);
    if(!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(r);
  }
  /* one week to a page, newest first - the same pager as Updates, plus a date to jump to */
  const weeks = [...new Set([...byDay.keys()].map(weekOf))];
  if(!KWEEK || weeks.indexOf(KWEEK) < 0) KWEEK = weeks[0];
  const wi = weeks.indexOf(KWEEK);
  const nWeek = [...byDay.entries()].filter(([d]) => weekOf(d) === KWEEK).reduce((n, [, l]) => n + l.length, 0);
  const pager = bot => kPager(weeks, wi, nWeek, bot, byDay);
  let out = lead + chips + pager(false);
  for(const [day, list] of byDay){
    if(weekOf(day) !== KWEEK) continue;
    const label = day === today ? 'Today' : day === yest ? 'Yesterday' : day;
    out += '<div class="kday" data-day="' + esc(day) + '"><b>' + esc(label) + '</b><s>' + list.length +
      (list.length === 1 ? ' action' : ' actions') + '</s></div><div class="klist">' +
      list.map(r => {
        const p = PEOPLE.get(r.p) || GONEID.get(r.p);
        const verb = KVERB[r.v] || ['marked', ''];
        const web = /^https?:/i.test(r.k || '');
        const body = idDisc(r.p, 'pdisc', ' data-v="' + esc(r.v) + '"') +
          '<span class="ktx"><b>' + esc(p ? p.n : 'Someone') + '</b> ' + verb[0] +
          ' <u data-v="' + esc(r.v) + '">' + esc(r.nm || r.k) + '</u>' +
          (verb[1] ? ' ' + verb[1] : '') +
          (r.ag ? ' <i>· ' + esc(r.ag) + '</i>' : '') + '</span>' +
          '<span class="kt">' + esc(String(r.ts).slice(11)) + '</span>';
        return web
          ? '<a class="krow" href="' + esc(r.k) + '" target="_blank" ' +
            'rel="noopener noreferrer">' + body + '</a>'
          : '<div class="krow">' + body + '</div>';
      }).join('') + '</div>';
  }
  pane.innerHTML = out + (weeks.length > 1 ? pager(true) : '');
}
let KWEEK = null;
/* "2026-10-23", "23/10/2026", "23/10" or "23.10.2026" -> a day to match exactly */
function kDayOf(t){
  t = String(t || '').trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
  m = t.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
  if(m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  m = t.match(/^(\d{1,2})[\/.](\d{1,2})$/);
  if(m) return m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return '';
}
function kPager(weeks, i, n, bot, byDay){
  const L = weeks.length, want = new Set([0, L - 1]);
  for(let j = i - 2; j <= i + 2; j++) if(j >= 0 && j < L) want.add(j);
  const idx = [...want].sort((a, b) => a - b);
  let nums = '', prev = -1;
  for(const j of idx){
    if(prev >= 0 && j - prev > 1) nums += '<span class="apgap">…</span>';
    nums += '<button type="button" class="apn" data-kwk="' + weeks[j] + '"' + (j === i ? ' aria-current="page"' : '') +
      ' title="' + esc(weekLabel(weeks[j])) + '">' + (j + 1) + '</button>';
    prev = j;
  }
  const days = [...byDay.keys()].sort();
  return '<nav class="apager kpager' + (bot ? ' bot' : '') + '" aria-label="Weeks">' +
    '<span class="apw">' + esc(weekLabel(weeks[i])) + ' · <b>' + n + '</b>' + (n === 1 ? ' action' : ' actions') + '</span>' +
    '<button type="button" data-kwk="' + (weeks[i - 1] || '') + '"' + (i > 0 ? '' : ' disabled') + '>← Newer</button>' + nums +
    '<button type="button" data-kwk="' + (weeks[i + 1] || '') + '"' + (i < L - 1 ? '' : ' disabled') + '>Older →</button>' +
    (bot ? '' : '<span class="kgo"><span>Go to date</span><input type="text" class="kdtx" inputmode="numeric" placeholder="DD/MM/YYYY" aria-label="Go to date (DD/MM/YYYY)">' +
      '<button type="button" class="kcal" title="Pick a date" aria-label="Pick a date"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg></button>' +
      '<input type="date" class="kdate" tabindex="-1" aria-hidden="true" min="' + (days[0] || '') + '" max="' + (days[days.length - 1] || '') + '" value=""></span>') + '</nav>';
}
function kGoWeek(w, day){
  if(!w) return;
  KWEEK = w;
  renderBacklog();
  const pane = document.getElementById('kmain');
  let el = day && pane.querySelector('.kday[data-day="' + day + '"]');
  if(!el) el = pane.querySelector('.kpager');
  if(!el) return;
  const hd = document.querySelector('header');
  const off = hd ? Math.max(0, hd.getBoundingClientRect().bottom) : 0;
  window.scrollBy(0, el.getBoundingClientRect().top - off - 12);
  if(day && el.classList.contains('kday')){ el.classList.add('kflash'); setTimeout(() => el.classList.remove('kflash'), 1600); }
}
document.getElementById('kmain').addEventListener('click', e => {
  const wk = e.target.closest('button[data-kwk]');
  if(wk){ kGoWeek(wk.dataset.kwk); return; }
  const b0 = e.target.closest('button[data-kw]');
  if(b0) KWEEK = null;
  const b = b0;
  if(!b) return;
  kWho = b.dataset.kw || '';
  renderBacklog();
});

/* ================= the ID panel ================= */
let idDraftC = 'lilac';
/* One colour, one person. The colour is how a mark is read on a card, so two people
   sharing one would make their lamps indistinguishable. */
function takenBy(c){
  const hit = [...PEOPLE.entries()].find(([pid, p]) => pid !== ME && p.c === c);
  return hit ? hit[1].n : '';
}
function freeColour(){
  const taken = new Set([...PEOPLE.entries()].filter(([pid]) => pid !== ME)
    .map(([, p]) => p.c));
  return IDCK.find(c => !taken.has(c)) || '';
}
/* ---- passwords ----
   A name and a colour said who you were, and the browser remembered it - so a new
   computer, a cleared cache or a colleague's laptop had no way back in except to claim
   somebody's name with one click. Now an ID has a password. Only a salted PBKDF2 hash is
   kept on the person's document; the password itself never leaves this page. */
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const unhex = s => new Uint8Array((String(s).match(/../g) || []).map(h => parseInt(h, 16)));
async function pwHash(pw, saltHex){
  if(!(window.crypto && crypto.subtle)) throw new Error('nocrypto');
  const salt = saltHex ? unhex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw),
    'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name: 'PBKDF2', salt: salt,
    iterations: 150000, hash: 'SHA-256'}, key, 256);
  return {h: hex(bits), s: hex(salt)};
}
/* Read the person document fresh before trusting a hash: a password set on another
   computer five minutes ago has to count here too. */
async function freshPerson(pid){
  if(!DB) return PEOPLE.get(pid) || null;
  try{
    const d = await DB.doc('people/' + pid).get();
    const v = docOf(d);
    if(!v || !v.n || v.mg || v.x) return null;
    const rec = {n: String(v.n).slice(0, 24), c: IDC[v.c] ? v.c : 'lilac',
      h: typeof v.h === 'string' ? v.h : '', s: typeof v.s === 'string' ? v.s : ''};
    PEOPLE.set(pid, rec);
    return rec;
  }catch(e){ return PEOPLE.get(pid) || null; }
}
const personDoc = p => {
  const o = {n: p.n, c: p.c};
  if(p.h){ o.h = p.h; o.s = p.s; }
  return o;
};
let idMode = 'in';          // signed out: 'in' (sign in) or 'new' (create)
let idPick = '';            // the ID chosen on the sign-in side
let idBusy = false;
function idSay(t, kind){
  const el = document.getElementById('idmsg');
  if(!el) return;
  el.textContent = t || '';
  el.dataset.k = kind || 'err';
}
function armBtn(btn, label, armedLabel){
  if(btn.dataset.armed === '1') return true;
  btn.dataset.armed = '1';
  btn.textContent = armedLabel;
  setTimeout(() => {
    if(btn.isConnected && btn.dataset.armed === '1'){ btn.dataset.armed = '0'; btn.textContent = label; }
  }, 4000);
  return false;
}
function paintIdModal(){
  const nmEl = document.getElementById('idname');
  if(!nmEl) return;
  const me = meRec();
  if(!me && !PEOPLE.size) idMode = 'new';
  const signingIn = !me && idMode === 'in';
  document.getElementById('idmode').hidden = !!me;
  document.getElementById('idmode').querySelectorAll('button').forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.m === idMode)));
  document.getElementById('idsecin').hidden = !signingIn;
  document.getElementById('idsecme').hidden = signingIn;

  /* sign-in side */
  if(idPick && !PEOPLE.has(idPick)) idPick = '';
  document.getElementById('idpick').innerHTML = PEOPLE.size
    ? [...PEOPLE.entries()].map(([pid, p]) =>
        '<button type="button" data-pick="' + pid + '" aria-pressed="' + (pid === idPick) + '">' +
        idDisc(pid) + esc(p.n) + '</button>').join('')
    : '<p class="idnote">Nobody has an ID yet. Create the first one.</p>';
  const pk = idPick ? PEOPLE.get(idPick) : null;
  const inpw = document.getElementById('idinpw');
  inpw.placeholder = pk && !pk.h ? 'Set a password for ' + pk.n + ' (4 characters or more)'
                                 : 'Password';
  document.getElementById('idinnote').textContent = pk && !pk.h
    ? pk.n + ' was made before passwords existed. Whoever signs in first sets its password, ' +
      'and from then on only that password opens it.'
    : 'Pick your name, type your password. Everything you lit before is waiting for you, ' +
      'on any computer.';
  document.getElementById('idlogin').disabled = !idPick || idBusy;

  /* create / edit side */
  const nm = nmEl.value.trim();
  const k = idDraftC ? idCol(idDraftC) : {bg: 'var(--surf2)', fg: 'var(--mut)'};
  const prev = document.getElementById('idprev');
  prev.setAttribute('style', '--idbg:' + k.bg + ';--idfg:' + k.fg);
  prev.textContent = idInit(nm || '?');
  const taken = new Set([...PEOPLE.entries()].filter(([pid]) => pid !== ME)
    .map(([, p]) => p.c));
  document.getElementById('idsw').innerHTML = IDCK.map(c =>
    '<button type="button" data-c="' + c + '" style="--idbg:' + IDC[c].bg + '" ' +
    'aria-pressed="' + (c === idDraftC) + '" ' +
    (taken.has(c) ? 'data-taken="1" disabled ' : '') +
    'title="' + IDC[c].n + (taken.has(c) ? ' — taken by ' + takenBy(c) : '') + '" ' +
    'aria-label="' + IDC[c].n + '"></button>').join('');
  document.getElementById('idmelabel').textContent = me ? 'You' : 'New ID';
  document.getElementById('idnewpw').placeholder = me
    ? (me.h ? 'New password (leave empty to keep the current one)'
            : 'Set a password (4 characters or more) so you can sign in anywhere')
    : 'Choose a password (4 characters or more)';
  const clashC = me && takenBy(me.c) && idDraftC === me.c;
  document.getElementById('idnote').textContent = me
    ? (clashC ? 'Your colour is also used by ' + takenBy(me.c) + '. Pick a colour nobody ' +
                'has and press Save.'
              : 'Change your name, colour or password and press Save.')
    : 'Pick a name, a colour and a password. The colour is how your mark shows on ' +
      'someone else’s card, so take one nobody has. Your name and password are how you ' +
      'get back in from any computer.';
  document.getElementById('iddelwrap').hidden = !me;

  /* everyone */
  const admin = isAdmin();
  document.getElementById('idlist').innerHTML = PEOPLE.size
    ? [...PEOPLE.entries()].map(([pid, p]) => {
        const mk = PEERMARKS.get(pid);
        const n = pid === ME ? MARKS.size : (mk ? mk.e.size : 0);
        const mine = pid === ME;
        const acts = (admin && !mine)
          ? '<span class="idpa">' +
            (p.h ? '<button type="button" class="idlink warn" data-reset="' + pid +
                   '">Reset password</button>' : '') +
            '<button type="button" class="idlink warn" data-merge="' + pid +
              '">Merge into mine</button>' +
            '<button type="button" class="idlink warn" data-del="' + pid +
              '">Delete</button></span>'
          : '';
        return '<div class="idperson" data-pid="' + pid + '">' + idDisc(pid) +
          '<span class="idpn">' + esc(p.n) + '</span>' +
          (mine ? '<span class="idyou">you</span>' : '') +
          '<span class="idpm">' + n + (n === 1 ? ' lamp' : ' lamps') + '</span>' +
          acts + '</div>';
      }).join('')
    : '<p class="idnote">Nobody yet.</p>';
  const nlg = LEGACY.e.size;
  document.getElementById('idclaimwrap').hidden = !(ME && nlg);
  document.getElementById('idclaimn').textContent = nlg;
  document.getElementById('idsave').disabled = !nm || idBusy;
  document.getElementById('idforget').hidden = !me;
  document.getElementById('idtitle').textContent = me
    ? 'Signed in as ' + me.n : (idMode === 'in' ? 'Sign in' : 'Create your ID');
  document.getElementById('idsub').textContent = me
    ? 'Everything you light, correct or add from here is filed under your name.'
    : 'Until you sign in, the dashboard is read-only: you can search, filter and open ' +
      'profiles, but not leave a mark on the record.';
  document.getElementById('idsave').textContent = me ? 'Save' : 'Create ID';
}
function openId(){
  const me = meRec();
  idDraftC = me ? me.c : freeColour();
  idMode = PEOPLE.size ? 'in' : 'new';
  idSay('');
  document.getElementById('idname').value = me ? me.n : '';
  document.getElementById('idnewpw').value = '';
  document.getElementById('idinpw').value = '';
  paintIdModal();
  document.getElementById('idmodal').dataset.on = '1';
  setTimeout(() => {
    const el = document.getElementById(me || idMode === 'new' ? 'idname' : 'idinpw');
    if(el) el.focus();
  }, 40);
}
const closeId = () => { document.getElementById('idmodal').dataset.on = '0'; };
function loadMine(pid){
  MARKS.clear(); MARKAT.clear();
  const mine = PEERMARKS.get(pid);
  if(mine){
    for(const [k, v] of mine.e) MARKS.set(k, v);
    for(const [k, v] of mine.t) MARKAT.set(k, v);
  }
}
async function saveId(){
  if(idBusy) return;
  const nm = document.getElementById('idname').value.trim().slice(0, 24);
  const pw = document.getElementById('idnewpw').value;
  if(!nm) return;
  const first = !ME;
  const clash = [...PEOPLE.entries()].find(([pid, p]) =>
    pid !== ME && p.n.trim().toLowerCase() === nm.toLowerCase());
  if(clash){
    idSay('There is already an ID called ' + clash[1].n + '. If that is you, sign in ' +
      'instead; otherwise pick another name.');
    return;
  }
  if(first && pw.length < 4){ idSay('Choose a password of 4 characters or more.'); return; }
  /* someone may have taken this colour on another computer since the panel opened */
  if(DB){ try{ await loadPeople(); }catch(e){} }
  if(!idDraftC){ idSay('Every colour is taken. Ask the owner to delete an ID nobody uses.'); paintIdModal(); return; }
  const owner = takenBy(idDraftC);
  if(owner){
    idSay(IDC[idDraftC].n + ' is already ' + owner + '\u2019s colour. Pick one nobody has.');
    if(first || idDraftC !== (meRec() || {}).c) idDraftC = freeColour();
    paintIdModal();
    return;
  }
  if(!first && pw && pw.length < 4){ idSay('A password needs 4 characters or more.'); return; }
  idBusy = true; paintIdModal();
  try{
    const pid = ME || newPid();
    const old = PEOPLE.get(pid) || {};
    const rec = {n: nm, c: idDraftC, h: old.h || '', s: old.s || ''};
    if(pw){
      try{ Object.assign(rec, await pwHash(pw)); }
      catch(e){ idSay('This browser cannot store a password safely. Try another browser.'); return; }
    }
    if(DB){
      try{ await DB.doc('people/' + pid).set(personDoc(rec)); }
      catch(e){ idSay('Could not save - the connection dropped. Try again.'); return; }
    }
    PEOPLE.set(pid, rec);
    ME = pid;
    LS.set('illum.me', pid);
    if(first) loadMine(pid);
    document.getElementById('idnewpw').value = '';
    idSay(first ? 'ID created. Sign in with ' + nm + ' and this password on any computer.'
                : (pw ? 'Saved. Your new password is set.' : 'Saved.'), 'ok');
  } finally {
    idBusy = false;
    paintIdBar(); paintIdModal(); refresh();
  }
}
async function signInId(){
  if(idBusy || !idPick) return;
  const pid = idPick;
  const pw = document.getElementById('idinpw').value;
  if(!pw){ idSay('Type your password.'); return; }
  idBusy = true; idSay(''); paintIdModal();
  try{
    const rec = await freshPerson(pid);
    if(!rec){ idSay('That ID no longer exists.'); await loadPeople(); return; }
    if(rec.h){
      let got;
      try{ got = await pwHash(pw, rec.s); }
      catch(e){ idSay('This browser cannot check passwords. Try another browser.'); return; }
      if(got.h !== rec.h){ idSay('Wrong password for ' + rec.n + '.'); return; }
    } else {
      /* made before passwords: the first person in sets one */
      if(pw.length < 4){ idSay('Set a password of 4 characters or more.'); return; }
      try{ Object.assign(rec, await pwHash(pw)); }
      catch(e){ idSay('This browser cannot store a password safely. Try another browser.'); return; }
      if(DB){
        try{ await DB.doc('people/' + pid).set(personDoc(rec)); }
        catch(e){ idSay('Could not save the password - try again.'); return; }
      }
      PEOPLE.set(pid, rec);
    }
    ME = pid;
    LS.set('illum.me', pid);
    await loadPeerMarks();
    loadMine(pid);
    idDraftC = rec.c;
    document.getElementById('idname').value = rec.n;
    document.getElementById('idinpw').value = '';
    idSay('Welcome back, ' + rec.n + '.', 'ok');
  } finally {
    idBusy = false;
    paintIdBar(); paintIdModal(); refresh();
  }
}
async function claimLegacy(){
  if(!ME || !LEGACY.e.size) return;
  for(const [k, v] of LEGACY.e) MARKS.set(k, v);
  for(const [k, v] of LEGACY.t) MARKAT.set(k, v);
  await saveMyMarks();
  if(DB){
    const shards = new Set([...LEGACY.e.keys()].map(markShard));
    for(const sid of shards){ try{ await DB.doc('marks/' + sid).set({e: {}, t: {}}); }catch(e){} }
  }
  LEGACY.e.clear(); LEGACY.t.clear();
  paintIdBar(); paintIdModal(); refresh();
}
/* Fold a duplicate into your ID. Owner only: anyone else could otherwise swallow a
   colleague's lamps with a click. */
async function mergeId(pid){
  if(!isAdmin() || pid === ME || !PEOPLE.has(pid)) return;
  const them = PEERMARKS.get(pid);
  if(them){
    for(const [k, v] of them.e) if(!MARKS.has(k)) MARKS.set(k, v);
    for(const [k, v] of them.t) if(!MARKAT.has(k)) MARKAT.set(k, v);
    await saveMyMarks();
  }
  const rec = PEOPLE.get(pid);
  if(DB){
    try{ await DB.doc('people/' + pid).set({n: rec.n, c: rec.c, mg: ME}); }catch(e){}
    try{ await DB.doc('pmarks/' + pid).delete(); }catch(e){}
  }
  MERGED.set(pid, ME);
  PEOPLE.delete(pid);
  PEERMARKS.delete(pid);
  for(const r of BLOG) if(r.p === pid) r.p = ME;
  idSay(rec.n + ' was merged into your ID.', 'ok');
  paintIdBar(); paintIdModal(); refresh();
}
/* Delete an ID: its lamps go, the person leaves the list, and a tombstone with the name
   stays so old backlog lines still read "Daniel lit ...". Your own, or anyone's if you
   are the owner. */
async function deleteId(pid){
  if(!PEOPLE.has(pid)) return;
  if(pid !== ME && !isAdmin()) return;
  const rec = PEOPLE.get(pid);
  if(DB){
    try{ await DB.doc('people/' + pid).set({n: rec.n, c: rec.c, x: 1}); }
    catch(e){ idSay('Could not delete - the connection dropped. Try again.'); return; }
    try{ await DB.doc('pmarks/' + pid).delete(); }catch(e){}
  }
  PEOPLE.delete(pid);
  PEERMARKS.delete(pid);
  GONEID.set(pid, {n: rec.n, c: rec.c});
  if(pid === ME){
    forgetId();
    idSay('Your ID ' + rec.n + ' has been deleted.', 'ok');
    return;
  }
  idSay(rec.n + ' has been deleted.', 'ok');
  paintIdBar(); paintIdModal(); refresh();
}
/* Owner only: wipe a forgotten password. The next person to sign in as that ID sets a
   new one, so do it while they are standing next to you. */
async function resetPw(pid){
  if(!isAdmin() || !PEOPLE.has(pid)) return;
  const rec = PEOPLE.get(pid);
  const clean = {n: rec.n, c: rec.c, h: '', s: ''};
  if(DB){
    try{ await DB.doc('people/' + pid).set(personDoc(clean)); }
    catch(e){ idSay('Could not reset - try again.'); return; }
  }
  PEOPLE.set(pid, clean);
  idSay(rec.n + ' has no password now. The next sign-in as ' + rec.n + ' sets a new one.', 'ok');
  paintIdModal();
}
function forgetId(){
  const db_ = document.getElementById('iddelme');
  if(db_){ db_.dataset.armed = '0'; db_.textContent = 'Delete my ID'; }
  LS.del('illum.me');
  ME = null;
  idPick = '';
  MARKS.clear(); MARKAT.clear();
  for(const [k, v] of LEGACY.e) MARKS.set(k, v);
  for(const [k, v] of LEGACY.t) MARKAT.set(k, v);
  idMode = PEOPLE.size ? 'in' : 'new';
  idSay('');
  document.getElementById('idname').value = '';
  idDraftC = freeColour();
  paintIdBar(); paintIdModal(); refresh();
}
document.getElementById('idme').addEventListener('click', openId);
document.getElementById('rosign').addEventListener('click', openId);
document.getElementById('idclose').addEventListener('click', closeId);
document.getElementById('idmodal').addEventListener('click', e => {
  if(e.target.id === 'idmodal') closeId();
});
document.getElementById('idlist').addEventListener('click', e => {
  /* A published page never sees a confirm() dialog, so each button asks for itself. */
  const mg = e.target.closest('button[data-merge]');
  if(mg){ if(armBtn(mg, 'Merge into mine', 'Merge — sure?')) mergeId(mg.dataset.merge); return; }
  const dl = e.target.closest('button[data-del]');
  if(dl){ if(armBtn(dl, 'Delete', 'Delete — sure?')) deleteId(dl.dataset.del); return; }
  const rs = e.target.closest('button[data-reset]');
  if(rs){ if(armBtn(rs, 'Reset password', 'Reset — sure?')) resetPw(rs.dataset.reset); }
});
document.getElementById('idmode').addEventListener('click', e => {
  const b = e.target.closest('button[data-m]');
  if(!b) return;
  idMode = b.dataset.m;
  idSay('');
  if(idMode === 'new'){ idDraftC = freeColour(); document.getElementById('idname').value = ''; }
  paintIdModal();
  const el = document.getElementById(idMode === 'new' ? 'idname' : 'idinpw');
  if(el) el.focus();
});
document.getElementById('idpick').addEventListener('click', e => {
  const b = e.target.closest('button[data-pick]');
  if(!b) return;
  idPick = b.dataset.pick;
  idSay('');
  paintIdModal();
  document.getElementById('idinpw').focus();
});
document.getElementById('idlogin').addEventListener('click', signInId);
document.getElementById('idinpw').addEventListener('keydown', e => {
  if(e.key === 'Enter'){ e.preventDefault(); signInId(); }
});
document.getElementById('idnewpw').addEventListener('keydown', e => {
  if(e.key === 'Enter'){ e.preventDefault(); saveId(); }
});
document.getElementById('iddelme').addEventListener('click', e => {
  const b = e.currentTarget;
  if(armBtn(b, 'Delete my ID', 'Delete for good — sure?')) deleteId(ME);
});
document.getElementById('idsw').addEventListener('click', e => {
  const b = e.target.closest('button[data-c]');
  if(!b || b.disabled) return;
  idDraftC = b.dataset.c;
  paintIdModal();
});
document.getElementById('idname').addEventListener('input', paintIdModal);
document.getElementById('idname').addEventListener('keydown', e => {
  if(e.key === 'Enter'){ e.preventDefault(); saveId(); }
});
document.getElementById('idsave').addEventListener('click', saveId);
document.getElementById('idforget').addEventListener('click', forgetId);
document.getElementById('idclaim').addEventListener('click', claimLegacy);
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && document.getElementById('idmodal').dataset.on === '1') closeId();
});
paintIdBar();

function litBadge(){
  // Lumen counts your own lamps, Communicatus everyone's - both leave out models in Booking
  const cnt = mp => { let n = 0; for(const k of mp.keys()) if(!inBooking(k)) n++; return n; };
  const el = document.getElementById('vn-lit');
  if(el){ const n = cnt(MARKS); el.textContent = n ? n : ''; }
  const ec = document.getElementById('vn-com');
  if(ec){ const n = cnt(boardMarks()); ec.textContent = n ? n : ''; }
}
function counts(){
  litBadge();
  // the numbers beside each tick box follow whichever view you are in
  const c = {};
  if(VIEW === 'arr'){
    for(const a of arrivalRows()){
      c['sex:' + (a.g || '?')] = (c['sex:' + (a.g || '?')] || 0) + 1;
      const rg = REGION[a.country] || 'Unknown';
      c['region:' + rg] = (c['region:' + rg] || 0) + 1;
      const t = a.tier || 'unlabelled';
      c['tier:' + t] = (c['tier:' + t] || 0) + 1;
    }
    for(const a of arrivalRows()){
      const mk = lampOf(normKey(a.url || 'name:' + a.name));
      if(mk) c['mark:' + mk] = (c['mark:' + mk] || 0) + 1;
    }
  }else if(LITV(VIEW)){
    for(const m of litShown()){
      const f = litFacts(m);
      c['sex:' + (f.g || '?')] = (c['sex:' + (f.g || '?')] || 0) + 1;
      const rg = REGION[m.country] || 'Unknown';
      c['region:' + rg] = (c['region:' + rg] || 0) + 1;
      const t = f.tier || 'unlabelled';
      c['tier:' + t] = (c['tier:' + t] || 0) + 1;
      c['mark:' + m.v] = (c['mark:' + m.v] || 0) + 1;
    }
  }else if(VIEW === 'bld'){
    for(const a of BLINDS){
      const rg = REGION[a.c] || 'Unknown';
      c['region:' + rg] = (c['region:' + rg] || 0) + 1;
    }
  }else{
    for(const a of AG){
      /* the number beside Men / Women / Not stated is models, not agencies */
      let sx = null; try{ sx = dirSexOf(a.boards || []); }catch(e){}
      if(sx){ c['sex:F'] = (c['sex:F'] || 0) + sx.F; c['sex:M'] = (c['sex:M'] || 0) + sx.M;
              c['sex:?'] = (c['sex:?'] || 0) + sx.Q; }
      else for(const g of a.sexes) c['sex:' + g] = (c['sex:' + g] || 0) + 1;
      c['region:' + a.region] = (c['region:' + a.region] || 0) + 1;
      for(const t of a.tiers) c['tier:' + t] = (c['tier:' + t] || 0) + 1;
      for(const t of String(a.at || '').split(',')) if(t) c['atype:' + t] = (c['atype:' + t] || 0) + 1;
    }
    for(const v of (window.__illuVoteMarkVals ? window.__illuVoteMarkVals() : MARKS.values())) c['mark:' + v] = (c['mark:' + v] || 0) + 1;
  }
  document.querySelectorAll('.oc[data-c]').forEach(el => {
    const n = c[el.dataset.c] || 0;
    el.textContent = n >= 1000 ? n.toLocaleString() : n;
    el.closest('.opt').classList.toggle('off', n === 0);
  });
}
function refresh(){
  sharedDirty();
  counts();
  if(VIEW === 'arr') renderArrivals();
  else if(LITV(VIEW)) renderLit();
  else if(VIEW === 'ig') renderIG();
  else if(VIEW === 'bld') renderBlind();
  else if(VIEW === 'bkl') renderBacklog();
  else if(VIEW === '404') renderGone();
  else if(VIEW === 'bk') renderBook();
  else if(VIEW === 'cmp') {}
  else if(VIEW === 'atl') { try{ window.renderAtlas && window.renderAtlas(); }catch(e){ console.error(e); } }
  else render();
}
function setView(v){
  /* filtered to someone else, Lumen (your own lamps) becomes Communicatus (everyone's) */
  if(v === 'lit' && litWho && litWho !== ME) v = 'com';
  VIEW = v;
  document.getElementById('pane-arr').hidden = v !== 'arr';
  document.getElementById('pane-lit').hidden = !LITV(v);
  document.getElementById('pane-dir').hidden = v !== 'dir';
  document.getElementById('pane-bld').hidden = v !== 'bld';
  document.getElementById('pane-ig').hidden = v !== 'ig';
  document.getElementById('pane-bkl').hidden = v !== 'bkl';
  document.getElementById('pane-404').hidden = v !== '404';
  document.getElementById('pane-bk').hidden = v !== 'bk';
  document.getElementById('pane-cmp').hidden = v !== 'cmp';
  document.getElementById('pane-atl').hidden = v !== 'atl';
  document.body.dataset.view = v;
  // a blind board has no roster, so sex, tier and measurements have nothing to sort.
  // Lumen does have one - everyone you have lit - so it takes the whole sidebar.
  const plain = v === 'bld' || v === 'ig' || v === 'bkl' || v === '404' || v === 'cmp' || v === 'atl';
  document.getElementById('f-sex').hidden = plain;
  document.getElementById('f-tier').hidden = plain;
  document.getElementById('f-meas').hidden = plain;
  document.getElementById('f-mark').hidden = plain;
  document.getElementById('f-region').hidden = v === 'bkl' || v === '404' || v === 'atl';
  document.getElementById('f-atype').hidden = v !== 'dir';
  /* Arrivals draws the same card as Lumen now, figures and all, so it needs the
     measurements too - not only the handful the morning scan happened to read. */
  try{ paintTabBtn(v); }catch(e){}
  if((LITV(v) || v === 'arr' || v === 'bk') && measState === 'idle') loadMeas();
  if(v === 'dir' && measState === 'idle' && BND && BND.any) loadMeas();
  document.querySelectorAll('input[data-m]').forEach(i => { i.disabled = plain; });
  document.getElementById('mhint').textContent = v === 'bld' ? ''
    : 'A min, a max, or both — 170 to 175 finds every height in between. Bounds read in the '
      + 'units chosen above, and setting one hides models whose agency did not publish that '
      + 'measurement: there is no value to compare against.';
  document.getElementById('mhint2').textContent = v === 'bld' ? ''
    : v === 'dir'
      ? 'On the Directory this searches only the models already measured — typing a bound '
        + 'switches the list to matching names, and the badge above it says how many of the '
        + 'models on screen could be tested at all.'
      : 'Conversions are made once, when a model is crawled, from whatever the agency published. '
        + 'A US shoe size follows the model’s own board, so switching to or from US clears '
        + 'the shoe boxes rather than changing which models match.';
  document.getElementById('v-arr').setAttribute('aria-selected', String(v === 'arr'));
  document.getElementById('v-lit').setAttribute('aria-selected', String(v === 'lit'));
  document.getElementById('v-com').setAttribute('aria-selected', String(v === 'com'));
  document.getElementById('v-dir').setAttribute('aria-selected', String(v === 'dir'));
  document.getElementById('v-bld').setAttribute('aria-selected', String(v === 'bld'));
  document.getElementById('v-ig').setAttribute('aria-selected', String(v === 'ig'));
  document.getElementById('v-bkl').setAttribute('aria-selected', String(v === 'bkl'));
  document.getElementById('v-404').setAttribute('aria-selected', String(v === '404'));
  document.getElementById('v-bk').setAttribute('aria-selected', String(v === 'bk'));
  document.getElementById('v-cmp').setAttribute('aria-selected', String(v === 'cmp'));
  if(v === 'cmp') setTimeout(() => { try{ window.cmpShow && window.cmpShow(); }catch(e){} }, 0);
  document.getElementById('v-atl').setAttribute('aria-selected', String(v === 'atl'));
  if(v === 'atl'){ try{ window.atlasShown && window.atlasShown(); }catch(e){ console.error(e); } }
  q.placeholder = v === 'arr' ? 'Name, agency, city…'
                : v === 'bld' ? 'Agency, board, reason…'
                : LITV(v) ? 'Name or agency…'
                : v === 'ig' ? 'Agency, handle, city…'
                : v === '404' ? 'Name, agency, country…'
                : v === 'bk' ? 'Name, agency, city…'
                : v === 'bkl' ? 'Name, person or date…'
                : 'Agency, city, country…';
  const days = RUNS.size;
  const ng = [...MARKS.values()].filter(x => x === 'g').length;
  const ny = [...MARKS.values()].filter(x => x === 'y').length;
  const nr = [...MARKS.values()].filter(x => x === 'r').length;
  tallies();
  try{ paintKfit(); }catch(e){}
  document.getElementById('subline').textContent =
    v === 'dir' ? DIRSUB
    : v === 'ig' ? (IGA.length
        ? IGA.length + (IGA.length === 1 ? ' account' : ' accounts') +
          ' · kept by hand · the scan cannot read Instagram'
        : 'Instagram cannot be scanned · add the accounts you follow and keep them here')
    : v === 'lit' ? (MARKS.size
        ? ng + (ng === 1 ? ' model' : ' models') + ' on the green light · ' + ny + ' pending' +
          (nr ? ' · ' + nr + ' ruled out' : '')
        : 'Nobody lit yet · the lamps beside any name put them here')
    : v === 'com' ? (function(){
        const b = boardMarks(), ids = new Set();
        for(const [pid, mk] of PEERMARKS) if(PEOPLE.has(pid) && mk.e.size) ids.add(pid);
        return b.size
          ? b.size + (b.size === 1 ? ' model' : ' models') + ' lit across ' + ids.size +
            (ids.size === 1 ? ' ID' : ' IDs') + ' · the shared room: who lit which lamp'
          : 'Nobody has lit a lamp yet · every ID\u2019s choices gather here';
      })()
    : v === 'cmp' ? 'Composite cards · four layouts of five poses, saved as JPG'
    : v === 'atl' ? 'Every agency on a map · click a region, then a country · pins stand on the addresses in their contacts'
    : v === 'bk' ? (BOOK.size
        ? BOOK.size + (BOOK.size === 1 ? ' model' : ' models') + ' in talks with their ' +
          'mother agency · everything here is typed by hand'
        : 'Nobody in play yet · move a model here from Updates or Lumen, or start a blank card')
    : v === '404' ? (GONE.size
        ? GONE.size + (GONE.size === 1 ? ' profile' : ' profiles') +
          ' taken down by their agency' +
          (goneLit() ? ' · ' + goneLit() + ' of them lit' : '')
        : 'No profiles removed yet · a page that returns 404 is filed here and never crawled again')
    : v === 'bld' ? BLINDS.length + ' agencies the scan cannot fully read · '
      + BLINDS.reduce((n,a) => n + a.b.length, 0) + ' boards · check these by hand'
    : (days ? days + (days === 1 ? ' day' : ' days') + ' of scanning · ' : '')
      + 'every new face each board publishes, and nine the directory suggests for Korea';
  refresh();
}

/* ================= tab order =================
   The row belongs to whoever is working it. Drag a tab along it and the order sticks,
   here and on every other machine. A drag is told from a click by distance, so a plain
   click still just changes view. */
const TABIDS = ['v-arr', 'v-dir', 'v-atl', 'v-bld', 'v-ig', 'v-lit', 'v-com', 'v-bkl', 'v-bk', 'v-cmp', 'v-ana', 'v-404'];
let TABORDER = null;
function applyTabOrder(){
  const row = document.querySelector('.views');
  if(!row || !Array.isArray(TABORDER) || !TABORDER.length) return;
  for(const id of TABORDER){
    const el = document.getElementById(id);
    if(el && el.parentElement === row) row.appendChild(el);
  }
  // a tab added since the order was saved sits right after the tab before it in TABIDS
  for(let i = 0; i < TABIDS.length; i++){
    const id = TABIDS[i];
    if(TABORDER.includes(id)) continue;
    const el = document.getElementById(id);
    if(!el) continue;
    const prev = i ? document.getElementById(TABIDS[i - 1]) : null;
    if(prev && prev.parentElement === row) prev.after(el); else row.appendChild(el);
  }
}
async function loadPrefs(){
  /* The hint under the unit switches describes the state the page is already in, so it
     is painted whether or not the store answers. */
  if(!DB){ lenUnit = bwU; paintUnits(); paintUnitHint(); applyTabOrder(); return; }
  try{
    const snap = await DB.collection('prefs').limit(5).get();
    const docs = (snap && snap.docs) ? snap.docs : (snap || []);
    for(const d of docs){
      const data = docOf(d);
      if(data && Array.isArray(data.tabs) && data.tabs.length) TABORDER = data.tabs;
      if(data && (data.htU === 'cm' || data.htU === 'ft')) htU = data.htU;
      if(data && (data.bwU === 'cm' || data.bwU === 'in')) bwU = data.bwU;
      if(data && typeof data.rings === 'boolean') RINGS = data.rings;
      if(data && Array.isArray(data.clocks) && data.clocks.length && window.CLOCKLOAD)
        window.CLOCKLOAD(data.clocks.map(x => String(x).split('|')));
      if(data && Array.isArray(data.rgnShut)){
        RGNSHUT.clear();
        for(const v of data.rgnShut) if(typeof v === 'string' && v) RGNSHUT.add(v);
      }
      if(data && Array.isArray(data.litShut)){
        LITSHUT.clear();
        for(const v of data.litShut) if(v === 'g' || v === 'y' || v === 'r') LITSHUT.add(v);
      }
      if(data && Array.isArray(data.bkShut)){
        BKSHUT.clear();
        for(const v of data.bkShut)
          if(v === 'done' || v === 'proc' || v === 'canc') BKSHUT.add(v);
      }
    }
  }catch(e){}
  lenUnit = bwU;
  paintUnits(); paintUnitHint();
  applyTabOrder();
}
async function saveTabOrder(){
  if(!SIGNED()) return;
  TABORDER = [...document.querySelectorAll('.views button[role="tab"]')].map(b => b.id);
  if(!DB) return;
  await savePrefsUI();
}
(function tabDrag(){
  const row = document.querySelector('.views');
  if(!row) return;
  let drag = null, justDragged = false;
  row.addEventListener('pointerdown', e => {
    if(e.button !== 0) return;
    const b = e.target.closest('button[role="tab"]');
    if(!b) return;
    drag = {b: b, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId};
  });
  row.addEventListener('pointermove', e => {
    if(!drag || e.pointerId !== drag.id) return;
    if(!drag.moved){
      if(Math.abs(e.clientX - drag.x) < 6 && Math.abs(e.clientY - drag.y) < 6) return;
      drag.moved = true;
      drag.b.classList.add('dragging');
      row.classList.add('reorder');
      try{ drag.b.setPointerCapture(e.pointerId); }catch(err){}
    }
    e.preventDefault();
    const over = document.elementsFromPoint(e.clientX, e.clientY)
      .map(el => el && el.closest ? el.closest('button[role="tab"]') : null)
      .find(x => x && x.parentElement === row);
    if(!over || over === drag.b) return;
    const r = over.getBoundingClientRect();
    const vert = getComputedStyle(row).flexDirection === 'column';
    const past = vert ? e.clientY > r.top + r.height / 2 : e.clientX > r.left + r.width / 2;
    row.insertBefore(drag.b, past ? over.nextSibling : over);
  });
  const end = e => {
    if(!drag) return;
    const was = drag;
    drag = null;
    if(!was.moved) return;
    was.b.classList.remove('dragging');
    row.classList.remove('reorder');
    try{ was.b.releasePointerCapture(e.pointerId); }catch(err){}
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 220);
    saveTabOrder();
  };
  row.addEventListener('pointerup', end);
  row.addEventListener('pointercancel', end);
  // the click that ends a drag is not a request to change view
  row.addEventListener('click', e => {
    if(justDragged){ e.preventDefault(); e.stopPropagation(); }
  }, true);
})();

(function homeplate(){
  const h = document.getElementById('home');
  if(!h) return;
  let ft = 0;
  const flare = () => {
    h.classList.remove('fire');
    void h.offsetWidth;
    h.classList.add('fire');
    clearTimeout(ft);
    ft = setTimeout(() => h.classList.remove('fire'), 880);
  };
  const go = () => {
    flare();
    setView('arr');
    try{ window.scrollTo({top: 0, behavior: 'smooth'}); }catch(e){ window.scrollTo(0, 0); }
  };
  h.addEventListener('click', go);
  h.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(); }
  });
})();
document.getElementById('v-bkl').addEventListener('click', () => setView('bkl'));
document.getElementById('v-404').addEventListener('click', () => setView('404'));
document.getElementById('v-bk').addEventListener('click', () => setView('bk'));
document.getElementById('v-cmp').addEventListener('click', () => setView('cmp'));
document.getElementById('v-atl').addEventListener('click', () => setView('atl'));
document.getElementById('v-arr').addEventListener('click', () => setView('arr'));
document.getElementById('v-lit').addEventListener('click', () => setView('lit'));
document.getElementById('v-com').addEventListener('click', () => setView('com'));
document.getElementById('v-ig').addEventListener('click', () => setView('ig'));
document.getElementById('v-dir').addEventListener('click', () => setView('dir'));
document.getElementById('v-bld').addEventListener('click', () => setView('bld'));
/* Switching the unit re-expresses whatever is already typed, so a bound you set in
   centimetres keeps meaning the same body when you flip to inches. Lengths convert
   exactly, and so does shoe EU <-> foot millimetres.
   US is the exception and is deliberately NOT converted: EU 44 is US 11 on a men's
   board and US 13 on a women's, and a bound belongs to no single model, so no single
   US number carries the same meaning. Rather than quietly change which models match,
   the shoe boxes clear whenever US is on either side of the switch. Each model's own
   US size is still correct — that one was worked out on their own board when they
   were crawled. */
const setVal = (k, v) => {
  const el = document.querySelector('input[data-m="' + k + '"]');
  if(el) el.value = (v === null || v === undefined || isNaN(v)) ? '' : v;
};
function convertLengthBounds(from, to){
  if(from === to) return;
  const f = to === 'in' ? (n => Math.round(n / 2.54 * 10) / 10)
                        : (n => Math.round(n * 2.54 * 10) / 10);
  for(const k of ['ht-lo','ht-hi','b-lo','b-hi','w-lo','w-hi','h-lo','h-hi']){
    const v = bound(k);
    if(v !== null) setVal(k, f(v));
  }
}
function convertShoeBounds(from, to){
  if(from === to) return;
  if(from === 'us' || to === 'us'){ setVal('s-lo', ''); setVal('s-hi', ''); return; }
  const half = n => Math.round(n * 2) / 2;
  const toEu = from === 'eu' ? (n => n) : (n => half((n / 10 + 1.5) * 1.5));
  const fromEu = to === 'eu' ? (n => n) : (n => Math.round((n / 1.5 - 1.5) * 10));
  for(const k of ['s-lo','s-hi']){
    const v = bound(k);
    if(v !== null) setVal(k, fromEu(toEu(v)));
  }
}
/* ---- the pencil turns the chip into a field ----
   The same bargain the measurement figures make: it looks like a chip until you mean to
   change it, and what you type is cleaned back to a bare handle however you paste it. */
function igEdit(chip){
  if(!chip) return;
  if(!SIGNED()){ nudgeSignIn(); return; }
  const key = chip.dataset.igk;
  const bid = chip.dataset.igbk || '';        // a booking card keeps its own handle
  if((!key && !bid) || chip.querySelector('input')) return;
  const cur = bid ? igClean((BOOK.get(bid) || {}).ig) : (MIG.get(key) || '');
  const inp = document.createElement('input');
  inp.className = 'igin';
  inp.type = 'text';
  inp.value = cur ? igHandle(cur) : '';
  inp.placeholder = '@handle';
  inp.setAttribute('aria-label', 'Instagram handle');
  const span = chip.querySelector('span');
  if(span) span.hidden = true;
  chip.classList.add('editing');
  /* The field lives INSIDE the link. Clicking into it, or selecting text in it, would
     otherwise follow the href and carry you off to the agency's site mid-edit. So the
     chip stops being a link for as long as the field is open, and becomes one again
     the moment it closes. */
  const href = chip.getAttribute('href');
  if(href !== null){ chip.dataset.href = href; chip.removeAttribute('href'); }
  chip.draggable = false;
  chip.insertBefore(inp, chip.querySelector('.igset'));
  inp.focus(); inp.select();
  let closed = false;
  const done = async save => {
    if(closed) return;
    closed = true;
    const val = igClean(inp.value);
    inp.remove();
    chip.classList.remove('editing');
    if(chip.dataset.href !== undefined){
      chip.setAttribute('href', chip.dataset.href);
      delete chip.dataset.href;
    }
    if(span) span.hidden = false;
    if(!save) return;
    if(bid){
      const c = BOOK.get(bid);
      if(!c) return;
      c.ig = val;
      saveBook(bid, true);
      renderBook();
      return;
    }
    if(val) MIG.set(key, val); else MIG.delete(key);
    await saveMIG(key);
    refresh();
  };
  inp.addEventListener('keydown', ev => {
    ev.stopPropagation();
    if(ev.key === 'Enter'){ ev.preventDefault(); done(true); }
    if(ev.key === 'Escape'){ ev.preventDefault(); done(false); }
  });
  inp.addEventListener('blur', () => done(true));
  inp.addEventListener('click', ev => ev.preventDefault());
}
/* Belt and braces: kill the activation at pointerdown as well. A link is activated on
   click, but preventing the default here stops the drag-and-follow behaviour too, and
   means no later listener can carry the pencil off to somewhere else. */
document.addEventListener('pointerdown', e => {
  if(!e.target.closest) return;
  if(e.target.closest('.iggo') || e.target.closest('.igin')) return;
  const chip = e.target.closest('.igc');
  if(!chip) return;
  if(!e.target.closest('.igset') && !chip.classList.contains('none') &&
     !chip.classList.contains('editing')) return;
  e.preventDefault();
  e.stopPropagation();
}, true);
/* The chip is a link inside a card that is also a link, so its clicks stop here. */
document.addEventListener('click', e => {
  const chip = e.target.closest && e.target.closest('.igc');
  if(!chip) return;
  e.stopPropagation();
  // the arrow is the one thing here that is meant to navigate
  if(e.target.closest('.iggo')) return;
  const wantsField = e.target.closest('.igset') ||
                     chip.classList.contains('editing') ||
                     e.target.closest('.igin') ||
                     chip.classList.contains('none');
  if(!wantsField) return;
  e.preventDefault();
  if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  if(!chip.classList.contains('editing')) igEdit(chip);
}, true);
/* the pencil and the empty chip answer the keyboard too */
document.addEventListener('keydown', e => {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  if(!e.target.closest) return;
  const pen = e.target.closest('.igset');
  const empty = pen ? null : e.target.closest('.igc.none');
  if(!pen && !empty) return;
  if(e.target.closest('.igin') || e.target.closest('.iggo')) return;
  e.preventDefault();
  if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  igEdit((pen || empty).closest('.igc'));
}, true);
function paintUnitHint(){
  const el = document.getElementById('uhint');
  if(!el) return;
  el.textContent = 'Bust, waist and hips print and read in ' +
    (bwU === 'in' ? 'inches' : 'centimetres') + ', bounds included. ' +
    (htU === 'ft'
      ? 'A height prints as feet and inches on a card; the bounds below still read in '
        + (lenUnit === 'in' ? 'inches' : 'centimetres') + '.'
      : 'A height prints in ' + (lenUnit === 'in' ? 'inches' : 'centimetres') + '.');
}
function paintUnits(){
  document.querySelectorAll('[data-useg] button[data-u]').forEach(x => {
    const which = x.parentElement.dataset.useg;
    const want = which === 'ht' ? htU : which === 'ring' ? (RINGS ? 'on' : 'off') : bwU;
    x.setAttribute('aria-pressed', String(x.dataset.u === want));
  });
}
/* ---- the bands, wired ----
   Shown on the Updates tab only, because that is the only place they do anything.
   Typing in one redraws the nine immediately: the scout can see the band move. */
function paintKfit(){
  for(const el of document.querySelectorAll('#f-kfit input[data-kf]')){
    const [g, f, i] = el.dataset.kf.split('.');
    const v = ((KFIT[g] || {})[f] || [])[+i];
    if(document.activeElement !== el) el.value = (v == null ? '' : v);
  }
  const box = document.getElementById('f-kfit');
  if(box) box.hidden = (VIEW !== 'arr');
}
async function saveKfit(){
  if(!DB || !SIGNED()) return;
  try{ await DB.doc('prefs/kfit').set({kfit: KFIT, n: RECON}); }catch(e){}
}
async function loadKfit(){
  if(!DB) return;
  try{
    const d = docOf(await DB.doc('prefs/kfit').get());
    if(d && d.kfit){
      for(const g of ['F','M']) for(const f of ['ht','bu','wa','hp']){
        const b = ((d.kfit[g] || {})[f]);
        if(Array.isArray(b) && b.length === 2 &&
           typeof b[0] === 'number' && typeof b[1] === 'number' && b[0] <= b[1])
          KFIT[g][f] = [b[0], b[1]];
      }
    }
    if(typeof d?.n === 'number' && d.n >= 1 && d.n <= 48) RECON = Math.round(d.n);
  }catch(e){}
}
let kfTimer = 0;
document.addEventListener('input', e => {
  const el = e.target.closest && e.target.closest('#f-kfit input[data-kf]');
  if(!el) return;
  const [g, f, i] = el.dataset.kf.split('.');
  const v = parseFloat(el.value);
  if(isNaN(v)) return;
  const band = KFIT[g][f].slice();
  band[+i] = v;
  if(band[0] > band[1]) return;        /* a half-typed range is not an error, just wait */
  KFIT[g][f] = band;
  clearTimeout(kfTimer);
  kfTimer = setTimeout(() => {
    recoDraw(false);                   /* new bands, new list from the top */
    recoRepaint();
    const note = document.querySelector('#recobox .reconote');
    if(note) note.innerHTML = '';
    if(VIEW === 'arr') renderArrivals();
    saveKfit();
  }, 320);
});
document.addEventListener('click', e => {
  if(!(e.target.closest && e.target.closest('#kfreset'))) return;
  e.preventDefault();
  KFIT = JSON.parse(JSON.stringify(KFIT0));
  paintKfit();
  recoDraw(false);
  if(VIEW === 'arr') renderArrivals();
  saveKfit();
});
async function savePrefsUI(){
  if(!DB || !SIGNED()) return;
  try{ await DB.doc('prefs/ui').set({tabs: TABORDER, htU: htU, bwU: bwU,
                                     rings: RINGS,
                                     litShut: [...LITSHUT],
                                     bkShut: [...BKSHUT],
                                     rgnShut: [...RGNSHUT],
                                     clocks: (window.CLOCKSET ? window.CLOCKSET().map(x => x.join('|')) : null)}); }catch(e){}
}
const saveUnits = savePrefsUI;
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-useg] button[data-u]');
  if(!b) return;
  e.preventDefault(); e.stopPropagation();
  const which = b.parentElement.dataset.useg;
  if(which === 'ring'){
    const on = b.dataset.u === 'on';
    if(on === RINGS) return;
    RINGS = on;
    paintUnits(); refresh(); saveUnits();
    return;
  }
  if(which === 'ht'){ if(b.dataset.u === htU) return; htU = b.dataset.u; }
  else {
    if(b.dataset.u === bwU) return;
    /* One switch, not two: the figures on the cards and the bounds typed into the
       sidebar are the same measurements, so they read in the same unit. The bounds
       already on screen are converted rather than reinterpreted. */
    convertLengthBounds(lenUnit, b.dataset.u);
    bwU = lenUnit = b.dataset.u;
  }
  paintUnits(); paintUnitHint(); refresh(); saveUnits();
}, true);
document.getElementById('shoeunit').addEventListener('click', e => {
  const b = e.target.closest('button[data-u]');
  if(!b || b.dataset.u === shoeUnit) return;
  convertShoeBounds(shoeUnit, b.dataset.u);
  shoeUnit = b.dataset.u;
  document.querySelectorAll('#shoeunit button').forEach(x =>
    x.setAttribute('aria-pressed', String(x.dataset.u === shoeUnit)));
  refresh();
});
document.addEventListener('input', e => {
  if(e.target.matches('#q, input[data-f], input[data-m]')){ refresh(); noteSearch(); }
});
document.getElementById('reset').addEventListener('click', () => {
  litWho = ''; try{ whoPaint(); }catch(e){}
  q.value = '';
  document.querySelectorAll('input[data-f]').forEach(i => i.checked = false);
  document.querySelectorAll('input[data-m]').forEach(i => i.value = '');
  refresh();
});

/* ================= rail controls ================= */
const rail = document.getElementById('rail'), scrim = document.getElementById('scrim');
/* declared before openRail, which may close the other drawer */
let sideEl = null, sideBtn = null;
/* On a wide screen the work log is a column of its own; it folds away and comes back from
   the same Work log button, and the page remembers which way it was left. On a narrower
   screen it stays the slide-out drawer it always was. */
const RAILWIDE = window.matchMedia ? window.matchMedia('(min-width:1561px)') : null;
function railDock(on){
  document.body.dataset.railoff = on ? '0' : '1';
  try{ localStorage.setItem('illum.railoff', on ? '0' : '1'); }catch(e){}
  const b = document.getElementById('railbtn');
  if(b) b.setAttribute('aria-pressed', String(!!on));
}
try{ document.body.dataset.railoff = localStorage.getItem('illum.railoff') === '1' ? '1' : '0'; }catch(e){}
function openRail(on){
  if(RAILWIDE && RAILWIDE.matches){ railDock(on); return; }
  rail.dataset.open = on ? '1' : '0';
  scrim.dataset.on = on ? '1' : '0';
  if(on && sideEl){ sideEl.dataset.open = '0';
                    if(sideBtn) sideBtn.setAttribute('aria-expanded','false'); }
  if(on){ const vs = document.getElementById('views');
          if(vs){ vs.dataset.open = '0';
                  const vb = vs.closest('.viewbar');
                  if(vb) vb.dataset.tabs = '0';
                  const tb = document.getElementById('tabbtn');
                  if(tb) tb.setAttribute('aria-expanded','false'); } }
}
document.getElementById('railbtn').addEventListener('click', () => openRail(
  RAILWIDE && RAILWIDE.matches ? document.body.dataset.railoff === '1' : rail.dataset.open !== '1'));
(function(){ const t = document.getElementById('railtab'), f = document.getElementById('railfold');
  if(t) t.addEventListener('click', () => openRail(true));
  if(f) f.addEventListener('click', () => openRail(false)); })();
(function(){ const b = document.getElementById('railbtn');
  if(b) b.setAttribute('aria-pressed', String(document.body.dataset.railoff !== '1')); })();
/* The filters drawer. Only one drawer at a time, and the scrim closes whichever is open. */
sideEl = document.querySelector('.side');
sideBtn = document.getElementById('sidebtn');
function openSide(on){
  if(!sideEl) return;
  /* close the other drawer WITHOUT going through openRail, which would turn the scrim
     back off again a line after this one turns it on */
  if(on){ rail.dataset.open = '0';
          const vs = document.getElementById('views');
          if(vs){ vs.dataset.open = '0';
                  const vb = vs.closest('.viewbar');
                  if(vb) vb.dataset.tabs = '0';
                  const tb = document.getElementById('tabbtn');
                  if(tb) tb.setAttribute('aria-expanded', 'false'); } }
  sideEl.dataset.open = on ? '1' : '0';
  if(sideBtn) sideBtn.setAttribute('aria-expanded', String(!!on));
  scrim.dataset.on = on ? '1' : '0';
}
if(sideBtn) sideBtn.addEventListener('click', () => openSide(sideEl.dataset.open !== '1'));
const sideX = document.getElementById('sideclose');
if(sideX) sideX.addEventListener('click', () => openSide(false));
scrim.addEventListener('click', () => openSide(false));
/* The tab sheet. Same bargain as the two drawers: one thing open at a time, the scrim
   closes whatever it is, and picking a tab closes it on the way through. */
/* ================= English / Korean =================
   The page is written in English and read by people who work in Korean. Rather than a
   second copy of every screen - two things to keep in step, one of which would quietly
   fall behind - the words themselves are swapped where a swap is known, and left alone
   where it is not. Only whole strings that appear in the table below are touched, so a
   model's name, an agency's name, a typed note and a measurement are never translated:
   they match nothing. Each node remembers its English, so switching back is exact. */
const KO = {"Recently viewed": "최근 본 항목", "Cards": "카드", "Names": "이름", "Agency type": "에이전시 유형", "Modeling / Booking": "모델링 / 부킹", "Mother Agency": "마더 에이전시", "Talent Agency": "탤런트 에이전시", "Nothing in this folder yet. Pick another folder above.": "이 폴더에는 아직 파일이 없습니다. 위에서 다른 폴더를 선택하세요.", "Check again": "다시 확인", "Dropbox files open right here.": "드롭박스 파일은 이 화면에서 바로 열립니다.", "Updates": "업데이트", "Directory": "디렉터리", "Blind spots": "크롤 불가", "Instagram": "인스타그램", "Lumen": "루멘", "Communicatus": "코뮤니카투스", "Backlog": "백로그", "Booking": "부킹", "404": "404", "Go to": "이동", "Filters": "필터", "Work log": "작업 기록", "Reset": "초기화", "Search": "검색", "Export CSV": "CSV 내보내기", "check this page": "이 페이지 점검", "build": "빌드", "Sign in": "로그인", "Sign out": "로그아웃", "Signed in": "로그인됨", "Viewing only": "보기 전용", "Who is using this": "이 대시보드 사용자", "Who is using this dashboard": "이 대시보드 사용자", "Messages": "메시지", "Send": "보내기", "Save": "저장", "Add": "추가", "You": "나", "Everyone": "전체", "Everyone here": "여기 있는 모두", "Claim them": "내 것으로", "Clear views": "조회 기록 지우기", "ID rings": "ID 링", "Unassigned lamps": "담당자 없는 램프", "Name": "이름", "Name as they use it": "본인이 쓰는 이름", "Your name — however you want to be known on a card": "카드에 표시될 이름", "Optional": "선택", "Not stated": "미기재", "not stated": "미기재", "Unknown": "미상", "Unlabelled": "미분류", "You are the only ID on this dashboard so far": "아직 이 대시보드의 유일한 ID입니다", "nobody else on right now": "지금 접속 중인 다른 사람 없음", "Interest": "관심도", "Sex": "성별", "Board tier": "보드 등급", "Region": "지역", "Measurements": "신체 사이즈", "Height": "신장", "Shoe": "신발", "Searches": "검색", "Women": "여성", "Men": "남성", "All": "전체", "min": "최소", "max": "최대", "Main Board": "메인 보드", "Development": "디벨롭먼트", "New Faces": "뉴 페이스", "New faces": "뉴 페이스", "Direct": "다이렉트", "Commercial / other": "커머셜 / 기타", "Interested": "관심", "Pending": "보류", "Ruled out": "제외", "Green — interested in booking": "초록 — 부킹 검토 중", "Amber — pending, still deciding": "노랑 — 보류, 검토 중", "Red — ruled out, does not fit the criteria": "빨강 — 제외, 조건 불일치", "Africa": "아프리카", "Asia": "아시아", "Europe": "유럽", "North America": "북미", "South America": "남미", "Oceania": "오세아니아", "International": "인터내셔널", "Completed": "완료", "Processing": "진행 중", "Cancelled": "취소", "completed": "완료", "processing": "진행 중", "cancelled": "취소", "Email": "이메일", "Guarantee negotiation": "개런티 협의", "Contract": "계약", "Visa": "비자", "Flight ticket": "항공권", "Book": "북", "Snaps": "스냅", "Videos": "영상", "in process": "진행 중", "done": "완료", "+ Create a New Card": "+ 새 카드 만들기", "Create a New Card": "새 카드 만들기", "Mother agency": "디렉터리", "City": "도시", "Country": "국가", "EXP": "경력", "BEEN TO": "방문 국가", "DOB": "생년월일", "AGE": "나이", "HT": "신장", "B": "가슴", "W": "허리", "H": "엉덩이", "SH": "신발", "B·W·H": "가슴·허리·엉덩이", "attach": "첨부", "folder": "폴더", "delete all": "전체 삭제", "download all": "전체 다운로드", "list": "목록", "plates": "썸네일", "photo": "사진", "a photograph": "사진", "drop or paste": "끌어다 놓거나 붙여넣기", "add ig": "인스타 추가", "Instagram handle": "인스타그램 아이디", "round trip": "왕복", "one way": "편도", "+ add": "+ 추가", "+ country, or city, country": "+ 국가, 또는 도시, 국가", "e.g. 2 yrs · 18 months": "2년 · 18개월", "Who you wrote to, when, and what came back.": "누구에게 언제 보냈고 어떤 답이 왔는지.", "The guarantee asked for and offered, the split, what is still open.": "요청·제시 개런티, 분배 조건, 미정 사항.", "Which contract, its term, what is signed and what is still with the lawyers.": "어떤 계약인지, 기간, 서명 완료분과 검토 중인 부분.", "Which visa, what the agency still needs, dates.": "비자 종류, 에이전시가 아직 필요로 하는 서류, 일정.", "Dates, route, who is paying, booking reference.": "일정, 노선, 비용 부담 주체, 예약 번호.", "Nothing cancelled.": "취소된 건 없습니다.", "Nothing here yet": "아직 아무것도 없습니다", "No updates recorded yet": "아직 기록된 업데이트가 없습니다", "Nothing logged in 2026 yet": "2026년에 기록된 내용이 아직 없습니다", "nothing in play": "진행 중인 건 없음", "No bookings open yet.": "아직 진행 중인 부킹이 없습니다.", "Nothing matches": "조건에 맞는 항목 없음", "cm": "cm", "in": "인치", "eu": "EU", "us": "US", "mm": "mm", "ft·in": "피트·인치", "EU": "EU", "US": "US", "Agency": "에이전시", "Agencies": "에이전시", "agencies": "개 에이전시", "Board": "보드", "Models": "모델", "Blocked": "차단됨", "Truncated": "일부만 읽힘", "JavaScript": "자바스크립트", "nothing readable": "읽을 수 있는 보드 없음", "on": "켜짐", "off": "꺼짐", "files": "파일", "scouting": "스카우팅", "Write, or drop a file in…": "메시지를 쓰거나 파일을 끌어다 놓으세요…", "Name or agency…": "이름 또는 에이전시…", "Name, agency, city…": "이름, 에이전시, 도시…", "Name, agency, country…": "이름, 에이전시, 국가…", "Agency, city, country…": "에이전시, 도시, 국가…", "Agency, handle, city…": "에이전시, 아이디, 도시…", "Agency, board, reason…": "에이전시, 보드, 사유…", "find by name…": "이름으로 찾기…", "File storage": "파일 저장 공간", "In use": "사용 중", "Re-read": "다시 읽기", "Booking attachments": "부킹 첨부파일", "Card photographs": "카드 사진", "Saved agency photographs": "저장된 에이전시 사진", "Chat attachments": "메시지 첨부파일", "Unaccounted": "용도 미확인", "Shrink photographs on the way in": "업로드 시 사진 용량 줄이기", "not in the directory": "디렉터리에 없음", "Contacts": "연락처", "Name / role": "이름 / 직책", "Title / role": "직책", "email": "이메일", "phone": "전화", "+ Add": "+ 추가", "map ↗": "지도 ↗", "Street address — where you would post a card": "주소 — 우편물을 보낼 수 있는 곳", "Profile": "프로필", "Detailed": "상세", "Details": "상세", "Tattoos": "타투", "Piercings": "피어싱", "Left ear": "왼쪽 귀", "Right ear": "오른쪽 귀", "Bust": "가슴", "Chest": "가슴", "Waist": "허리", "Hips": "엉덩이", "Shoes": "신발", "Weight": "몸무게", "Hair color": "머리 색", "Hair type": "머리 스타일", "Eye color": "눈 색", "Age": "나이", "Nationality": "국적", "Countries": "활동 국가", "Availability": "가능 기간", "Entry": "입국", "Departure": "출국", "Dark brown": "다크 브라운", "Wavy, long": "웨이브, 긴 머리", "Green": "그린", "Romanian": "루마니아", "Date of birth 17/05/2004": "생년월일, 예: 17/05/2004", "Date, e.g. 20/11/2026": "날짜, 예: 20/11/2026", "Flight #": "항공편", "Open folder on this computer": "이 컴퓨터에서 폴더 열기", "Reload folder": "폴더 다시 불러오기", "On this computer": "이 컴퓨터에서", "In Dropbox ↗": "드롭박스에서 ↗", "Dropbox ↗": "드롭박스 ↗", "Files are kept in": "파일 보관 위치:", ", on your computer and in Dropbox.": ", 이 컴퓨터와 드롭박스에 있습니다.", "‹ Profile": "‹ 프로필", "Files": "파일", "drop files anywhere here to upload": "여기에 파일을 끌어다 놓으면 업로드됩니다", "notes": "메모", "Model": "모델", "Female": "여성", "Male": "남성", "Hair": "머리", "Eyes": "눈", "Based in": "소재지", "Status": "상태", "Handled by": "담당자", "Card opened": "카드 생성일", "Flight": "항공편", "Round trip": "왕복", "One way": "편도", "ENTRY": "입국", "DEPARTURE": "출국", "date": "날짜", "flight #": "항공편", "AVAILABILITY": "가능 기간", "days": "일", "from": "시작", "Attach": "첨부", "Folder": "폴더", "Delete all": "전체 삭제", "Download all": "전체 다운로드", "Pick a different folder": "다른 폴더 선택", "Age ": "나이", "Close (Esc)": "닫기 (Esc)", "Switch between English and Korean": "영어/한국어 전환", "Type the weight in kilograms": "몸무게를 kg으로 입력", "Type the weight in pounds": "몸무게를 lb로 입력", "Compositus": "콤포지투스", "Choose a photo file…": "사진 파일 선택…", "Find it on the agency site": "에이전시 사이트에서 찾기", "Composite Card": "컴포지트 카드", "Composite cards · four layouts of five poses, saved as JPG": "컴포지트 카드 · 다섯 포즈를 네 가지 레이아웃으로, JPG로 저장", "● Photos are processed only on this computer": "● 사진은 이 컴퓨터에서만 처리됩니다", "New work": "새 작업", "Open task": "작업 열기", "Save work": "작업 저장", "↶ Undo": "↶ 실행 취소", "Original photo": "원본 사진", "＋ Import Photo": "＋ 사진 불러오기", "From a Booking card": "부킹 카드에서", "Choose a model…": "모델 선택…", "Load": "불러오기", "Drag the photo here": "사진을 여기로 끌어오세요", "You can select several at once": "여러 장을 한 번에 선택할 수 있어요", "Arrange in photo order": "사진 순서대로 배치", "20 photos → 5 in each of the 4 types": "20장 → 네 종류에 5장씩", "5 photos → into the selected type": "5장 → 선택한 종류에 배치", "Press a photo below to place it in the selected box.": "아래 사진을 누르면 선택한 칸에 들어갑니다.", "MODEL COMPOSITE WORKSPACE": "모델 컴포지트 작업실", "Just insert the photos, and the composite is complete.": "사진만 넣으면, 컴포지트 완성.", "Tap a photo to select · drag to move · resize with the wheel or the zoom slider": "사진을 눌러 선택 · 드래그로 위치 이동 · 휠 또는 확대 슬라이더로 크기 조정", "JPG · sRGB · original proportions kept": "JPG · sRGB · 원래 비율 유지", "Use ‘Save work’ to keep the photos and settings": "사진과 설정을 보관하려면 ‘작업 저장’", "Save all finished types": "완성된 종류 모두 저장", "Save this JPG ↓": "현재 JPG 저장 ↓", "Model information": "모델 정보", "Name size": "이름 크기", "Show the model's name on the card": "카드에 모델 이름 표시", "Photo adjustment": "사진 조정", "Import photos on the left": "왼쪽에서 사진을 불러오세요", "Zoom": "확대", "Left and right": "좌우 위치", "Up and down": "상하 위치", "Photo order": "사진 순서", "← Box before": "← 앞 칸", "Box after →": "뒤 칸 →", "Reset position": "위치 초기화", "Empty box": "칸 비우기", "Importing the 20 original ALINA O photos applies their saved crops automatically. For other models, check the head and toe positions after placing.": "ALINA O 원본 20장을 불러오면 기존 크롭을 자동 적용합니다. 다른 모델은 배치 후 머리와 발끝 위치를 확인해 주세요.", "Import photos to begin": "사진을 불러와 시작하세요", "Choose a photo": "사진 선택", "Choose a photo on the left": "왼쪽에서 사진을 선택하세요", "Getting ready…": "준비 중…"};
Object.assign(KO, {"Drag to change the order \u00b7 double-click to open": "드래그해서 순서 변경 \u00b7 더블클릭하면 크게 보기",
  "Rotate left": "왼쪽으로 회전", "Rotate right": "오른쪽으로 회전",
  "Rotate left (Shift+R)": "왼쪽으로 회전 (Shift+R)", "Rotate right (R)": "오른쪽으로 회전 (R)",
  "Show all as a grid (G)": "전체를 그리드로 보기 (G)", "Show all as a grid": "전체를 그리드로 보기",
  "Show one at a time (G)": "한 장씩 보기 (G)", "Show one at a time": "한 장씩 보기",
  "Larger thumbnails": "썸네일 크게", "Smaller thumbnails": "썸네일 작게", "Files": "파일",
  "2 per page with details": "2장씩 + 모델 정보", "1 per page, full size": "1장씩 크게",
  "Name and measurements on top \u2014 for clients": "위에 이름과 사이즈 \u2014 클라이언트용",
  "Each photo fills an A4 page \u2014 for printing": "사진 1장이 A4 한 페이지 \u2014 인쇄용",
  "MD": "MD",
  "Measurement Detail": "상세 사이즈",
  "Full body (front & back)": "전신 (앞·뒤)",
  "Upper body": "상체",
  "Lower body": "하체",
  "Arm & hand": "팔·손",
  "Foot": "발",
  "Neckline & collar": "넥라인·칼라",
  "Height": "키",
  "Weight": "몸무게",
  "Back width": "등 너비",
  "Shoulder to waist (back)": "어깨~허리 (뒤)",
  "Waist to floor": "허리~바닥",
  "Neck circumference": "목둘레",
  "Shoulder width": "어깨 너비",
  "Shoulder length": "어깨 길이",
  "Upper chest": "윗가슴둘레",
  "Bust (fullest part)": "가슴둘레 (가장 넓은 곳)",
  "Chest (fullest part)": "가슴둘레 (가장 넓은 곳)",
  "Under bust": "밑가슴둘레",
  "Waist (natural)": "허리 (자연 허리)",
  "Armhole": "암홀",
  "Waist (garment)": "허리 (옷 기준)",
  "Hip (upper)": "윗엉덩이둘레",
  "Hip (fullest)": "엉덩이둘레 (가장 넓은 곳)",
  "Thigh (fullest)": "허벅지 (가장 굵은 곳)",
  "Mid thigh": "허벅지 중간",
  "Knee": "무릎",
  "Calf": "종아리",
  "Ankle": "발목",
  "Leg opening (hem width)": "밑단 너비",
  "Arm length": "팔 길이",
  "Shoulder to elbow": "어깨~팔꿈치",
  "Hands": "손", "Feet": "발", "Inseam": "인심", "Front": "앞", "Back": "뒤", "Left hand": "왼손", "Right hand": "오른손", "Left foot": "왼발", "Right foot": "오른발", "No photo": "사진 없음", "Ring size": "반지 사이즈", "Front · left": "앞 · 왼손", "Front · right": "앞 · 오른손", "Back · left": "뒤 · 왼손", "Back · right": "뒤 · 오른손", "Left": "왼쪽", "Right": "오른쪽",
  "Elbow to wrist": "팔꿈치~손목",
  "Bicep": "윗팔둘레",
  "Elbow": "팔꿈치",
  "Forearm": "아랫팔둘레",
  "Wrist": "손목",
  "Hand length": "손 길이",
  "Palm width": "손바닥 너비",
  "Hand circumference": "손 둘레",
  "Middle finger length": "중지 길이",
  "Foot length": "발 길이",
  "Foot width": "발볼 너비",
  "Foot girth": "발 둘레",
  "Shoe size": "신발 사이즈",
  "Front neck depth": "앞목 깊이",
  "Back neck depth": "뒷목 깊이",
  "Collar size": "칼라 사이즈",
  "SIDE": "옆",
  "Every language is built in and switches at once, for everyone. Names, notes and figures stay as they are.": "모든 언어가 기본 제공되어 누구나 바로 전환할 수 있습니다. 이름, 메모, 수치는 그대로 유지됩니다.",
  "Language": "언어",
  "All languages": "모든 언어",
  "Search languages": "언어 검색",
  "Built in": "기본 제공",
  "Ready": "사용 가능",
  "Translate once": "처음 한 번 번역",
  "No language matches.": "일치하는 언어가 없습니다.",
  "English and Korean are built in. Any other language is translated once the first time someone picks it, then kept for everyone. Names, notes and figures are never translated.": "영어와 한국어는 기본 제공됩니다. 다른 언어는 누군가 처음 선택할 때 한 번 번역되어 모두에게 저장됩니다. 이름, 메모, 수치는 번역하지 않습니다.",
  "Pick this photo": "이 사진 선택",
  "Experience": "경력",
  "Date of birth (DD/MM/YYYY)": "생년월일 (DD/MM/YYYY)",
  "Show two photos side by side (2)": "두 장씩 나란히 보기 (2)",
  "Show one photo (2)": "한 장씩 보기 (2)",
  "Maximize": "크게 보기",
  "Zoom in (+)": "확대 (+)",
  "Zoom out (−)": "축소 (−)",
  "Download this file": "이 파일 다운로드",
  "Show all as a grid (G)": "전체를 격자로 보기 (G)",
  "Rotate left (Shift+R)": "왼쪽으로 회전 (Shift+R)",
  "Rotate right (R)": "오른쪽으로 회전 (R)",
  "Completed": "완료",
  "In process": "진행 중",
  "Not started": "시작 전",
  "No longer on the board": "보드에서 내려간 모델",
  "Remove card": "카드 삭제",
  "Keep card": "카드 유지",
  "Removed model cards": "삭제된 모델 카드",
  "Taken out of the directory after leaving their board. Revive puts a card back.": "보드에서 내려가 디렉토리에서 삭제된 모델입니다. 복원을 누르면 카드가 다시 돌아옵니다.",
  "Do you want to remove this model’s card from the directory listing?": "이 모델의 카드를 디렉토리 목록에서 삭제하시겠습니까?",
  "Lamps, notes and bookings are kept. You can revive the card at any time from the": "램프, 메모, 부킹 기록은 유지됩니다. 언제든지 다음에서 카드를 복원할 수 있습니다:",
  "Delete this agency from the directory": "디렉터리에서 이 에이전시 삭제",
  "Under construction": "사이트 공사 중",
  "No longer available": "사이트 없음",
  "Deleted agencies": "삭제된 에이전시",
  "Revive": "복구",
  "Delete agency": "에이전시 삭제",
  "Keep it": "유지",
  "Got it": "확인",
  "Open site": "사이트 열기",
  "Delete listing": "목록에서 삭제",
  "Cancel": "취소",
  "Deleted from the directory. Revive puts an agency back with all its boards.": "디렉터리에서 삭제된 에이전시입니다. 복구하면 모든 보드와 함께 다시 나타납니다.",
  "An agency website needs attention": "확인이 필요한 에이전시 웹사이트",
  "The morning scan checks these again each day and clears the notice when a site is back.": "매일 아침 스캔에서 다시 확인하며, 사이트가 복구되면 알림이 사라집니다.",
  "Save as\u2026": "다른 이름으로 저장\u2026",
  "PNG image": "PNG 이미지",
  "JPEG image": "JPEG 이미지",
  "Sharp, for screens and messages": "선명함 · 화면·메시지용",
  "Smaller file, for email": "작은 용량 · 이메일용",
  "A4 page, for printing and sending": "A4 · 인쇄·전송용",
  "No.": "번호",
  "Measurement": "항목",
  "length": "길이",
  "width": "너비",
  "Widen the panel": "패널 넓히기",
  "Narrow the panel": "패널 좁히기",
  "Enlarge": "크게 보기",
  "Smaller": "작게",
  "Larger": "크게",
  "Full screen": "전체 화면",
  "Click anywhere or press Esc to close": "아무 곳이나 클릭하거나 Esc를 누르면 닫힙니다",
  "SOLE": "발바닥",
  "Sign in to edit": "편집하려면 로그인하세요",
  "Also on the profile": "프로필에도 표시됨",
  "filled": "입력됨",
  "Saved as you type": "입력하면 바로 저장",
  "Sign in to fill this in": "입력하려면 로그인하세요", "Back to files": "파일로 돌아가기",
  "● also on the profile": "● 프로필과 연동",
  "Added here \u00b7 waiting to be copied to the BOOKING folder": "여기서 추가됨 \u00b7 BOOKING 폴더로 복사 대기 중"});
Object.assign(KO, {"Sign in": "로그인", "Create new ID": "새 ID 만들기", "Create your ID": "ID 만들기", "Create ID": "ID 만들기", "Choose your ID": "내 ID 선택", "Password": "비밀번호", "New ID": "새 ID", "You": "나", "Delete my ID": "내 ID 삭제", "Delete": "삭제", "Reset password": "비밀번호 초기화", "Merge into mine": "내 ID로 합치기", "Delete — sure?": "정말 삭제?", "Delete for good — sure?": "영구 삭제 — 확실해요?", "Reset — sure?": "정말 초기화?", "Merge — sure?": "정말 합치기?", "Deleting your ID removes it and all of its lamps for good.": "ID를 삭제하면 그 ID와 램프가 모두 영구히 지워집니다.", "Choose a password (4 characters or more)": "비밀번호 정하기 (4자 이상)", "New password (leave empty to keep the current one)": "새 비밀번호 (비워두면 그대로 유지)", "Set a password (4 characters or more) so you can sign in anywhere": "어디서든 로그인하려면 비밀번호를 정하세요 (4자 이상)", "Change your name, colour or password and press Save.": "이름·색·비밀번호를 바꾸고 저장을 누르세요.", "Pick your name, type your password. Everything you lit before is waiting for you, on any computer.": "이름을 고르고 비밀번호를 입력하세요. 어느 컴퓨터에서든 이전 기록이 그대로 있습니다.", "Pick a name, a colour and a password. The colour is how your mark shows on someone else’s card, so take one nobody has. Your name and password are how you get back in from any computer.": "이름, 색, 비밀번호를 정하세요. 색은 다른 사람 카드에 내 표시로 보이니 아무도 안 쓴 색을 고르세요. 이름과 비밀번호로 어느 컴퓨터에서든 다시 로그인할 수 있습니다.", "Type your password.": "비밀번호를 입력하세요.", "Choose a password of 4 characters or more.": "4자 이상의 비밀번호를 정하세요.", "A password needs 4 characters or more.": "비밀번호는 4자 이상이어야 합니다.", "Set a password of 4 characters or more.": "4자 이상의 비밀번호를 정하세요.", "Saved.": "저장했습니다.", "Every colour is taken. Ask the owner to delete an ID nobody uses.": "모든 색이 사용 중입니다. 안 쓰는 ID를 삭제해 달라고 관리자에게 요청하세요.", "Saved. Your new password is set.": "저장했습니다. 새 비밀번호가 설정됐습니다.", "That ID no longer exists.": "그 ID는 더 이상 없습니다.", "Nobody has an ID yet. Create the first one.": "아직 ID가 없습니다. 첫 ID를 만드세요.", "Until you sign in, the dashboard is read-only: you can search, filter and open profiles, but not leave a mark on the record.": "로그인 전에는 보기 전용입니다. 검색·필터·프로필 열기는 되지만 기록을 남길 수는 없습니다."});
let LANG = 'en';
try{ LANG = localStorage.getItem('illum.lang') || 'en'; }catch(e){}
const LANGSKIP = {SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, CODE: 1, PRE: 1};
const LANGATTR = ['placeholder', 'title', 'aria-label'];
function langNode(n){
  const en = n.__en != null ? n.__en : (n.nodeValue || '');
  const key = en.replace(/\s+/g, ' ').trim();
  if(!key) return;
  const D = curDict(), to = D && D[key] != null ? D[key] : null;
  if(to == null && n.__en == null) return;        // nothing to do, nothing to undo
  if(n.__en == null) n.__en = en;
  const want = to == null ? n.__en : en.replace(key, to);
  if(n.nodeValue !== want) n.nodeValue = want;
}
function langEl(el){
  for(const a of LANGATTR){
    if(!el.hasAttribute(a)) continue;
    const slot = '__en_' + a;
    const en = el[slot] != null ? el[slot] : el.getAttribute(a);
    const key = String(en).replace(/\s+/g, ' ').trim();
    const D = curDict(), to = D && D[key] != null ? D[key] : null;
    if(to == null && el[slot] == null) continue;
    if(el[slot] == null) el[slot] = en;
    const want = to == null ? el[slot] : to;
    if(el.getAttribute(a) !== want) el.setAttribute(a, want);
  }
}
function langWalk(root){
  if(!root) return;
  if(root.nodeType === 3){ langNode(root); return; }
  if(root.nodeType !== 1) return;
  if(LANGSKIP[root.tagName]) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: n => {
      if(n.nodeType !== 1) return NodeFilter.FILTER_ACCEPT;
      /* a note typed into a textarea is the user's words; its placeholder is ours, so
         the element is visited and its children are not */
      if(LANGSKIP[n.tagName]){ langEl(n); return NodeFilter.FILTER_REJECT; }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  if(root.nodeType === 1) langEl(root);
  let n;
  while(n = w.nextNode()){
    if(n.nodeType === 3) langNode(n); else langEl(n);
  }
}
let langT = 0;
function paintLang(){
  const btn = document.getElementById('langbtn');
  if(btn) btn.setAttribute('aria-pressed', String(LANG === 'ko'));
  document.documentElement.lang = LANG || 'en';
  try{ langMoreLabel(); }catch(e){}
  langWalk(document.body);
  try{ paintTabBtn(VIEW); }catch(e){}
}
/* The page redraws constantly - every tab, every card. Rather than hooking each render,
   whatever arrives is translated as it arrives, once the dust settles. */
/* roots pile up across bursts, so a redraw that lands inside the wait is not dropped */
let langRoots = [];
const langObs = new MutationObserver(ms => {
  if(LANG === 'en') return;
  for(const m of ms) for(const n of m.addedNodes) langRoots.push(n);
  if(!langRoots.length) return;
  clearTimeout(langT);
  langT = setTimeout(() => { const rs = langRoots; langRoots = [];
    for(const r of rs){ if(r.isConnected) try{ langWalk(r); }catch(e){} } }, 60);
});

/* ================= every language =================
   Korean is translated by hand. Every other language is translated once, by Claude, from
   the same list of English interface phrases the Korean comes from, and kept in the shared
   store (i18n/<code>.<part>), so the next person - and every later visit - opens it at once.
   Only interface words are sent: names, notes, figures and anything typed are never sent
   and never translated. */
const LANGS = [["en", "English", "English"], ["ko", "Korean", "한국어"], ["af", "Afrikaans", "Afrikaans"], ["sq", "Albanian", "Shqip"], ["am", "Amharic", "አማርኛ"], ["ar", "Arabic", "العربية"], ["hy", "Armenian", "Հայերեն"], ["as", "Assamese", "অসমীয়া"], ["ay", "Aymara", "Aymar aru"], ["az", "Azerbaijani", "Azərbaycanca"], ["bm", "Bambara", "Bamanankan"], ["eu", "Basque", "Euskara"], ["be", "Belarusian", "Беларуская"], ["bn", "Bengali", "বাংলা"], ["bs", "Bosnian", "Bosanski"], ["bg", "Bulgarian", "Български"], ["my", "Burmese", "မြန်မာ"], ["ca", "Catalan", "Català"], ["ceb", "Cebuano", "Cebuano"], ["ny", "Chichewa", "Chichewa"], ["zh-CN", "Chinese (Simplified)", "简体中文"], ["zh-TW", "Chinese (Traditional)", "繁體中文"], ["co", "Corsican", "Corsu"], ["hr", "Croatian", "Hrvatski"], ["cs", "Czech", "Čeština"], ["da", "Danish", "Dansk"], ["dv", "Dhivehi", "ދިވެހި"], ["nl", "Dutch", "Nederlands"], ["eo", "Esperanto", "Esperanto"], ["et", "Estonian", "Eesti"], ["ee", "Ewe", "Eʋegbe"], ["fil", "Filipino", "Filipino"], ["fi", "Finnish", "Suomi"], ["fr", "French", "Français"], ["fy", "Frisian", "Frysk"], ["gl", "Galician", "Galego"], ["ka", "Georgian", "ქართული"], ["de", "German", "Deutsch"], ["el", "Greek", "Ελληνικά"], ["gn", "Guarani", "Avañe'ẽ"], ["gu", "Gujarati", "ગુજરાતી"], ["ht", "Haitian Creole", "Kreyòl ayisyen"], ["ha", "Hausa", "Hausa"], ["haw", "Hawaiian", "ʻŌlelo Hawaiʻi"], ["he", "Hebrew", "עברית"], ["hi", "Hindi", "हिन्दी"], ["hmn", "Hmong", "Hmoob"], ["hu", "Hungarian", "Magyar"], ["is", "Icelandic", "Íslenska"], ["ig", "Igbo", "Igbo"], ["ilo", "Ilocano", "Ilokano"], ["id", "Indonesian", "Bahasa Indonesia"], ["ga", "Irish", "Gaeilge"], ["it", "Italian", "Italiano"], ["ja", "Japanese", "日本語"], ["jv", "Javanese", "Basa Jawa"], ["kn", "Kannada", "ಕನ್ನಡ"], ["kk", "Kazakh", "Қазақша"], ["km", "Khmer", "ខ្មែរ"], ["rw", "Kinyarwanda", "Kinyarwanda"], ["ku", "Kurdish (Kurmanji)", "Kurdî"], ["ckb", "Kurdish (Sorani)", "کوردی"], ["ky", "Kyrgyz", "Кыргызча"], ["lo", "Lao", "ລາວ"], ["la", "Latin", "Latina"], ["lv", "Latvian", "Latviešu"], ["ln", "Lingala", "Lingála"], ["lt", "Lithuanian", "Lietuvių"], ["lb", "Luxembourgish", "Lëtzebuergesch"], ["mk", "Macedonian", "Македонски"], ["mg", "Malagasy", "Malagasy"], ["ms", "Malay", "Bahasa Melayu"], ["ml", "Malayalam", "മലയാളം"], ["mt", "Maltese", "Malti"], ["mi", "Maori", "Māori"], ["mr", "Marathi", "मराठी"], ["mn", "Mongolian", "Монгол"], ["ne", "Nepali", "नेपाली"], ["no", "Norwegian", "Norsk"], ["or", "Odia", "ଓଡ଼ିଆ"], ["om", "Oromo", "Afaan Oromoo"], ["ps", "Pashto", "پښتو"], ["fa", "Persian", "فارسی"], ["pl", "Polish", "Polski"], ["pt-BR", "Portuguese (Brazil)", "Português (Brasil)"], ["pt-PT", "Portuguese (Portugal)", "Português (Portugal)"], ["pa", "Punjabi", "ਪੰਜਾਬੀ"], ["qu", "Quechua", "Runa Simi"], ["ro", "Romanian", "Română"], ["ru", "Russian", "Русский"], ["sm", "Samoan", "Gagana Samoa"], ["gd", "Scottish Gaelic", "Gàidhlig"], ["sr", "Serbian", "Српски"], ["st", "Sesotho", "Sesotho"], ["sn", "Shona", "chiShona"], ["sd", "Sindhi", "سنڌي"], ["si", "Sinhala", "සිංහල"], ["sk", "Slovak", "Slovenčina"], ["sl", "Slovenian", "Slovenščina"], ["so", "Somali", "Soomaali"], ["es", "Spanish", "Español"], ["es-419", "Spanish (Latin America)", "Español (Latinoamérica)"], ["su", "Sundanese", "Basa Sunda"], ["sw", "Swahili", "Kiswahili"], ["sv", "Swedish", "Svenska"], ["tg", "Tajik", "Тоҷикӣ"], ["ta", "Tamil", "தமிழ்"], ["tt", "Tatar", "Татарча"], ["te", "Telugu", "తెలుగు"], ["th", "Thai", "ไทย"], ["ti", "Tigrinya", "ትግርኛ"], ["ts", "Tsonga", "Xitsonga"], ["tr", "Turkish", "Türkçe"], ["tk", "Turkmen", "Türkmençe"], ["uk", "Ukrainian", "Українська"], ["ur", "Urdu", "اردو"], ["ug", "Uyghur", "ئۇيغۇرچە"], ["uz", "Uzbek", "Oʻzbekcha"], ["vi", "Vietnamese", "Tiếng Việt"], ["cy", "Welsh", "Cymraeg"], ["xh", "Xhosa", "isiXhosa"], ["yi", "Yiddish", "ייִדיש"], ["yo", "Yoruba", "Yorùbá"], ["zu", "Zulu", "isiZulu"]];
const LANGOF = new Map(LANGS.map(l => [l[0], l]));
const langNative = c => (LANGOF.get(c) || [c, c, c])[2];
const LANGGLOBE = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
  'stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 ' +
  '3.9 5.8 3.9 9s-1.3 6.2-3.9 9c-2.6-2.8-3.9-5.8-3.9-9S9.4 5.8 12 3z"/></svg>';
const TRD = {};                      // language code -> {English phrase: translation}
let TRIDX = null;                    // which languages are already in the store
function curDict(){
  if(LANG === 'ko') return KO;
  if(LANG === 'en') return null;
  return TRD[LANG] || null;
}
const trPhrases = () => Object.keys(KO).filter(k => k && k.length <= 400);
async function trIndex(){
  if(!DB) return TRIDX || {};
  try{ const d = docOf(await DB.doc('i18n/_index').get()); TRIDX = (d && d.langs) || {}; }catch(e){ TRIDX = TRIDX || {}; }
  return TRIDX;
}
/* a language already translated: from this browser first, else from the shared store */
async function trLoad(code){
  if(code === 'en' || code === 'ko') return null;
  if(TRD[code]) return TRD[code];
  let d = null, mine = null;
  try{ mine = JSON.parse(localStorage.getItem('illum.tr.' + code) || 'null'); }catch(e){ mine = null; }
  if(mine && !mine.d) mine = {v: '', d: mine};          // an older copy without a version
  let meta = null;
  if(DB){ try{ meta = docOf(await DB.doc('i18n/' + code).get()); }catch(e){ meta = null; } }
  if(mine && (!meta || mine.v === (meta.at || ''))) d = mine.d;
  else if(meta && meta.parts){
    try{
      d = {};
      for(let i = 0; i < meta.parts; i++){
        const part = docOf(await DB.doc('i18n/' + code + '.' + i).get());
        if(part && part.d) Object.assign(d, part.d);
      }
      try{ localStorage.setItem('illum.tr.' + code, JSON.stringify({v: meta.at || '', d: d})); }catch(e){}
    }catch(e){ d = mine ? mine.d : null; }
  }
  if(d && Object.keys(d).length) TRD[code] = d;
  return TRD[code] || null;
}
/* asks Claude for the phrases still missing in a language, a batch at a time */
async function trMake(code, prog){
  const sample = (window.claude && claude.use) ? await claude.use('sample') : null;
  if(!sample) throw {code: 'unavailable'};
  const L = LANGOF.get(code) || [code, code, code];
  const have = TRD[code] || {};
  const todo = trPhrases().filter(k => have[k] == null);
  const out = Object.assign({}, have);
  const B = 110, batches = [];
  for(let i = 0; i < todo.length; i += B) batches.push(todo.slice(i, i + B));
  let done = 0;
  prog && prog(0, batches.length);
  const ask = async batch => {
    const prompt = 'You are translating the interface of ILLUMÉNOCTIS, a dashboard a modelling agency ' +
      'uses to scout models and manage bookings, from English into ' + L[1] + ' (' + L[2] + ', language code ' +
      code + ').\nReply with only a JSON object. Each key is one of the English strings below, copied exactly ' +
      'and unchanged; each value is its ' + L[1] + ' translation.\nRules: write short, natural interface ' +
      'wording; keep the capitalisation style (text in ALL CAPS stays in capitals where the language has ' +
      'them); keep numbers, punctuation and symbols (· — → ✓ × ●) as they are; keep ' +
      'units (cm, kg, lb, EU, US, mm, ft / in), keys in brackets such as (G) or (Shift+R), and the formats ' +
      'DD/MM/YYYY unchanged; keep these names in Latin letters: ILLUMÉNOCTIS, Lumen, Dropbox, Instagram, ' +
      'BOOKING, MD, PDF, JPEG, PNG, ID.\nStrings:\n' + JSON.stringify(batch);
    const r = await sample.json(prompt, {modelTier: 'quick'});
    if(r && typeof r === 'object' && !Array.isArray(r))
      for(const k of batch){ const v = r[k]; if(typeof v === 'string' && v.trim()) out[k] = v; }
    done++; prog && prog(done, batches.length);
  };
  /* two at a time: quick, without flooding the viewer's account */
  let next = 0, failed = null;
  const lane = async () => { while(next < batches.length && !failed){ const b = batches[next++];
    try{ await ask(b); }catch(e){ failed = e; } } };
  await Promise.all([lane(), lane()]);
  if(Object.keys(out).length) TRD[code] = out;
  if(failed && Object.keys(out).length <= Object.keys(have).length) throw failed;
  await trSave(code, out);
  return {n: Object.keys(out).length, of: trPhrases().length, partial: !!failed};
}
/* kept for everyone, in parts so no one document grows large */
async function trSave(code, d){
  if(!DB || !SIGNED()) return;
  const keys = Object.keys(d), P = 220, parts = Math.ceil(keys.length / P);
  try{
    for(let i = 0; i < parts; i++){
      const part = {};
      for(const k of keys.slice(i * P, (i + 1) * P)) part[k] = d[k];
      await DB.doc('i18n/' + code + '.' + i).set({d: part});
    }
    const now = new Date().toISOString();
    await DB.doc('i18n/' + code).set({code: code, name: (LANGOF.get(code) || [code, code])[1], n: keys.length,
      parts: parts, at: now, by: ME || ''});
    const idx = await trIndex();
    idx[code] = {n: keys.length, at: now};
    await DB.doc('i18n/_index').set({langs: idx});
  }catch(e){}
}
async function setLang(code){
  code = LANGOF.has(code) ? code : 'en';
  if(code !== 'en' && code !== 'ko' && !TRD[code]) await trLoad(code);
  /* back to English first, so every phrase is read from its English original */
  if(LANG !== 'en' && LANG !== code){ LANG = 'en'; paintLang(); }
  LANG = code;
  try{ localStorage.setItem('illum.lang', LANG); }catch(e){}
  paintLang();
  try{ if(typeof bv !== 'undefined' && bv && !bvEl.hidden){
    bvEl.querySelectorAll('[data-bvlang]').forEach(b => b.setAttribute('aria-pressed',
      String(b.dataset.bvlang === LANG || (b.dataset.bvlang === 'more' && LANG !== 'en' && LANG !== 'ko'))));
    const mb = bvEl.querySelector('[data-bvlang="more"]');
    if(mb) mb.innerHTML = LANGGLOBE + (LANG !== 'en' && LANG !== 'ko' ? '<em>' + esc(langNative(LANG)) + '</em>' : '');
    if(bv.choose) bvDraw(); else bvSideRefresh(true);
    if(bv.view === 'm'){ const cc = BOOK.get(bv.id); if(cc) bvMdStage(cc); } } }catch(e){}
}
function langMoreLabel(){
  const b = document.getElementById('langmore');
  if(!b) return;
  const other = LANG !== 'en' && LANG !== 'ko';
  b.innerHTML = LANGGLOBE + (other ? '<em>' + esc(langNative(LANG)) + '</em>' : '');
  b.setAttribute('aria-pressed', String(other));
}
/* the list of every language: search, pick, and - the first time - translate */
let LANGPOPEN = false;
async function langPick(){
  if(LANGPOPEN) return;
  LANGPOPEN = true;
  const w = document.createElement('div');
  w.className = 'lpk'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true');
  w.innerHTML = '<div class="lpkbox"><div class="lpkhd"><h3>Language</h3>' +
    '<button type="button" class="lpkx" aria-label="Close">×</button></div>' +
    '<input class="lpkq" type="search" placeholder="Search languages" aria-label="Search languages">' +
    '<p class="lpknote">Every language is built in and switches at once, for everyone. Names, notes and ' +
    'figures stay as they are.</p>' +
    '<div class="lpklist" role="listbox"></div></div>';
  document.body.appendChild(w);
  const list = w.querySelector('.lpklist'), q = w.querySelector('.lpkq');
  let busy = '';
  const idx = await trIndex();
  const status = c => c === 'en' || c === 'ko' || (idx && idx[c]) || TRD[c] ? 'Built in' : 'Translate once';
  const draw = () => {
    const t = q.value.trim().toLowerCase();
    list.innerHTML = LANGS.filter(l => !t || (l[1] + ' ' + l[2] + ' ' + l[0]).toLowerCase().includes(t))
      .map(l => '<button type="button" class="lpkrow" role="option" data-lpk="' + l[0] + '" aria-selected="' +
        (l[0] === LANG) + '"' + (busy ? ' disabled' : '') + '><b>' + esc(l[2]) + '</b><span>' + esc(l[1]) +
        '</span><em data-st="' + (busy === l[0] ? 'busy' : status(l[0]) === 'Translate once' ? 'new' : 'ok') + '">' +
        (busy === l[0] ? (w.__prog || 'Translating…') : status(l[0])) + '</em></button>').join('') ||
      '<p class="lpknone">No language matches.</p>';
    if(LANG !== 'en') try{ langWalk(w); }catch(e){}
  };
  const close = () => { if(busy) return; w.remove(); LANGPOPEN = false; document.removeEventListener('keydown', key, true); };
  const key = e => { if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); } };
  document.addEventListener('keydown', key, true);
  q.addEventListener('input', draw);
  w.addEventListener('click', async e => {
    if(e.target === w || e.target.closest('.lpkx')){ close(); return; }
    const r = e.target.closest('[data-lpk]');
    if(!r || busy) return;
    const code = r.dataset.lpk;
    if(code === 'en' || code === 'ko'){ await setLang(code); close(); return; }
    await trLoad(code);
    if(!TRD[code]){
      busy = code; w.__prog = 'Translating…'; draw();
      try{
        const res = await trMake(code, (d, n) => { w.__prog = 'Translating… ' + d + '/' + n; draw(); });
        busy = ''; w.__prog = '';
        if(res.partial) siteToast(langNative(code) + ': part of the page is translated — pick it again later to finish');
      }catch(err){
        busy = ''; w.__prog = '';
        const c = err && err.code;
        siteToast(c === 'not_granted' ? 'Translating needs your permission to use Claude — allow it when asked'
          : c === 'rate_limited' ? 'Too many requests just now — try again in a minute'
          : c === 'unavailable' ? 'Translating new languages is not available in this view'
          : 'The translation did not finish — try again');
        draw();
        if(!TRD[code]) return;
      }
    }
    await setLang(code);
    busy = ''; close();
  });
  draw();
  setTimeout(() => q.focus(), 0);
}
(function(){
  const b = document.getElementById('langmore');
  if(b) b.addEventListener('click', langPick);
  langMoreLabel();
})();
(function(){
  const btn = document.getElementById('langbtn');
  if(btn) btn.addEventListener('click', () => { setLang(LANG === 'en' ? 'ko' : 'en'); });
  try{ langObs.observe(document.body, {childList: true, subtree: true}); }catch(e){}
  if(LANG === 'ko') paintLang();
  else if(LANG !== 'en'){ trLoad(LANG).then(() => paintLang()).catch(() => {}); langMoreLabel(); }
  else {
    const b2 = document.getElementById('langbtn');
    if(b2) b2.setAttribute('aria-pressed', 'false');
  }
})();
const viewsEl = document.getElementById('views');
const tabBtn = document.getElementById('tabbtn');
const tabNow = document.getElementById('tabnow');
function openTabs(on){
  if(!viewsEl) return;
  if(on){ sideEl.dataset.open = '0'; rail.dataset.open = '0';
          if(sideBtn) sideBtn.setAttribute('aria-expanded', 'false'); }
  viewsEl.dataset.open = on ? '1' : '0';
  const bar = viewsEl.closest('.viewbar');
  if(bar) bar.dataset.tabs = on ? '1' : '0';
  if(tabBtn) tabBtn.setAttribute('aria-expanded', String(!!on));
  scrim.dataset.on = on ? '1' : '0';
}
/* The button says where you are, counts and all, so the sheet is for going somewhere
   else rather than for finding out where you stand. */
function paintTabBtn(v){
  if(!tabNow || !viewsEl) return;
  /* read the view it was told about, not the tab that happens to be marked - the mark
     is set further down the same function that calls this one */
  const on = (v && document.getElementById('v-' + v))
          || viewsEl.querySelector('button[role="tab"][aria-selected="true"]');
  if(!on) return;
  const nm = (on.childNodes[0] && on.childNodes[0].nodeValue || on.textContent || '').trim();
  const n = on.querySelector('.vn');
  tabNow.textContent = nm + (n && n.textContent.trim() ? ' \u00b7 ' + n.textContent.trim() : '');
  /* and down the left margin, for the long stretches when the menu is shut and the
     button above is nowhere on the screen */
  const nn = document.getElementById('navnow');
  if(nn){
    nn.textContent = nm;
    nn.setAttribute('aria-label', nm + ' — open the menu');
  }
}
if(tabBtn) tabBtn.addEventListener('click', () => {
  openTabs(viewsEl.dataset.open !== '1');
});
/* the name down the margin opens the menu, exactly as the lighthouse above it does */
const navNowBtn = document.getElementById('navnow');
if(navNowBtn) navNowBtn.addEventListener('click', e => {
  e.stopPropagation();
  const nt = document.getElementById('navtoggle');
  if(nt) nt.click();
});
const viewsX = document.getElementById('viewsx');
if(viewsX) viewsX.addEventListener('click', () => openTabs(false));
if(viewsEl) viewsEl.addEventListener('click', e => {
  if(e.target.closest('button[role="tab"]')) openTabs(false);
});
scrim.addEventListener('click', () => openTabs(false));
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && viewsEl && viewsEl.dataset.open === '1') openTabs(false);
});
document.addEventListener('keydown', e => { if(e.key === 'Escape') openSide(false); });
/* How many filters are on, said on the button, so a narrowed list is never a mystery. */
function paintSideN(){
  const el = document.getElementById('siden');
  if(!el) return;
  let n = document.querySelectorAll('input[data-f]:checked').length;
  if((q.value || '').trim()) n++;
  document.querySelectorAll('input[data-m]').forEach(i => { if((i.value||'').trim()) n++; });
  el.textContent = n ? String(n) : '';
}
paintSideN();
['input','change'].forEach(t => document.addEventListener(t, e => {
  if(e.target && e.target.matches && e.target.matches('#q, input[data-f], input[data-m]'))
    paintSideN();
}));
document.getElementById('reset').addEventListener('click', () => setTimeout(paintSideN, 0));
document.getElementById('railclose').addEventListener('click', () => openRail(false));
scrim.addEventListener('click', () => openRail(false));
document.addEventListener('keydown', e => { if(e.key === 'Escape') openRail(false); });
document.getElementById('llist').addEventListener('click', e => {
  if(markClick(e)) return;
  /* The name is a link - let it be one, but going out to look at somebody counts as
     looking at them, so it is filed on the way past. */
  const out = e.target.closest('a');
  if(out){
    const row = out.closest('.lrow');
    if(out.classList.contains('lgo') && row && row.dataset.ag){
      const a = AGI && AGI.has(row.dataset.ag) ? AG[AGI.get(row.dataset.ag)] : null;
      if(a) remember('agency', 'agency:' + a.domain, a.name,
                     [a.city, a.country].filter(Boolean).join(' · '),
                     a.boards[0] ? a.boards[0].u : '');
    }else if(out.dataset.u){
      remember('model', out.dataset.u, out.textContent.trim(),
               out.dataset.meta || '', out.dataset.u);
    }
    return;
  }
  const ag = e.target.closest('.lagency[data-ag]');
  if(ag){
    const n = ag.dataset.ag;
    if(LOPEN.has(n)) LOPEN.delete(n); else LOPEN.add(n);
    renderLog();
    return;
  }
  const row = e.target.closest('.lsearch[data-i]');
  if(!row) return;
  const r = SHOWN[+row.dataset.i];
  if(r && r.state) applySearch(r.state);
});
document.getElementById('lchips').addEventListener('click', e => {
  const b = e.target.closest('button[data-k]');
  if(!b) return;
  lkind = (lkind === b.dataset.k && b.dataset.k !== 'all') ? 'all' : b.dataset.k;
  document.querySelectorAll('#lchips button').forEach(x =>
    x.setAttribute('aria-pressed', String(x.dataset.k === lkind)));
  renderLog();
});
document.getElementById('lcal').addEventListener('click', e => {
  const nav = e.target.closest('button[data-go]');
  if(nav){
    const n = calY * 12 + calM + (+nav.dataset.go);
    calY = Math.floor(n / 12); calM = ((n % 12) + 12) % 12;
    if(String(calY) !== lyear){
      lyear = String(calY); lmonth = null; lday = null;
      const sel = document.getElementById('railyear');
      if([...sel.options].some(o => o.value === lyear)) sel.value = lyear;
    }
    renderLog();
    return;
  }
  const mo = e.target.closest('button[data-mo]');
  if(mo){
    lday = null;
    lmonth = (lmonth === +mo.dataset.mo) ? null : +mo.dataset.mo;
    renderLog();
    return;
  }
  if(e.target.closest('button[data-clear]')){ lday = null; renderLog(); return; }
  const d = e.target.closest('button[data-d]');
  if(!d || d.disabled) return;
  lday = (lday === d.dataset.d) ? null : d.dataset.d;
  if(lday) lmonth = null;
  renderLog();
});
document.getElementById('railyear').addEventListener('change', e => {
  lyear = e.target.value; lmonth = null; lday = null; calY = null; renderLog();
});
document.getElementById('lexport').addEventListener('click', async () => {
  if(!DOWN) return;
  const btn = document.getElementById('lexport');
  const cell = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const rows = allRows().filter(r => r.day.slice(0,4) === lyear);
  const csv = '﻿' + ['Date','Time','Type','Name','Agency / where','Times opened','Link']
    .map(cell).join(',') + '\r\n' +
    rows.map(r => [r.day, r.when || '', KINDLABEL[r.kind] || r.kind,
                   r.name, r.meta || '', r.n, r.url || ''].map(cell).join(',')).join('\r\n');
  const was = btn.textContent;
  try{
    await DOWN.save({filename: 'model-work-log-' + lyear + '.csv', data: csv});
    btn.textContent = 'Saved';
  }catch(err){
    btn.textContent = (err && err.code === 'declined') ? 'Cancelled' : 'Not available';
  }
  setTimeout(() => { btn.textContent = was; }, 2200);
});
const clearBtn = document.getElementById('lclear');
let clearTimer = null;
clearBtn.addEventListener('click', async () => {
  // clears what YOU opened. The scan's record of what it found is left alone -
  // nothing regenerates it, so it is not something to lose to a stray click.
  if(clearBtn.dataset.arm !== '1'){
    clearBtn.dataset.arm = '1';
    clearBtn.textContent = 'Clear what I opened?';
    clearTimer = setTimeout(() => {
      clearBtn.dataset.arm = '0'; clearBtn.textContent = 'Clear views';
    }, 4000);
    return;
  }
  clearTimeout(clearTimer);
  clearBtn.dataset.arm = '0'; clearBtn.textContent = 'Clear views';
  if(!DB) return;
  const days = [...VIEWS.keys()];
  VIEWS.clear(); KEYDAY.clear();
  updateBadge(); renderLog(); markSeen();
  for(const d of days){ try{ await DB.doc('views/' + d).delete(); }catch(e){} }
});


/* ================= messages =================
   Kept two ways on purpose. The room delivers a line to everyone who has the page open
   the instant it is typed; the database keeps three days of them so whoever opens the
   dashboard later reads what was said. Each ID writes only its OWN document, so two
   people typing at once can never overwrite each other. */
const CHAT = [];
const CHATCAP = 300, CHATMAX = 600;
/* Attachments ride on the page's own asset store - the same one the model photographs
   use - so a file is uploaded once and everyone reads it back by its id. */
/* 20 MiB is what the page's own asset store accepts. It used to say 50 here, which
   meant a 30MB video passed this check and then failed at the upload with nothing
   useful to show for it. */
/* The store takes 20MB in one piece; a bigger file goes up in pieces, so the only
   ceiling left is how much room the page has in total. This is a sanity bound, not
   a rule - a single file past it is almost certainly a mistake. */
const ATTMAX = 2 * 1024 * 1024 * 1024, ATTN = 6;
let CHATATT = [];
const attOK = id => typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id);
const CLIPSVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path d="M20 11.5 11.7 19.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.4 8.4a1.7 1.7 0 0 1-2.4-2.4l7.7-7.7"/></svg>';
const FILESVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/></svg>';
const VIDSVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 11 6-3.5v9L15 13Z"/></svg>';
const DLSVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>';
/* Two short tones, synthesised rather than downloaded - a message should not cost a
   file fetch. The context is built on the first click, because a browser will not let
   a page make a sound before somebody has touched it. */
let CHATAC = null;
let CHATSND = LS.get('illum.chatsound') !== '0';
function chatTone(notes, vol){
  if(!CHATSND) return;
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    if(!CHATAC) CHATAC = new Ctx();
    if(CHATAC.state === 'suspended') CHATAC.resume();
    const t0 = CHATAC.currentTime + 0.01;
    notes.forEach((f, i) => {
      const o = CHATAC.createOscillator(), g = CHATAC.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t0 + i * 0.085);
      const at = t0 + i * 0.085;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.21);
      o.connect(g); g.connect(CHATAC.destination);
      o.start(at); o.stop(at + 0.24);
    });
  }catch(e){}
}
const sndSend = () => chatTone([659.25, 880], 0.05);
const sndHeard = () => chatTone([587.33, 440], 0.045);
function paintChatMute(){
  const b = document.getElementById('msgmute');
  if(!b) return;
  b.textContent = CHATSND ? '\u266a' : '\u00d7\u266a';
  b.setAttribute('aria-pressed', String(CHATSND));
  b.title = CHATSND ? 'Sounds on \u2014 click to silence' : 'Silent \u2014 click for sounds';
}
function sizeStr(n){
  n = Number(n) || 0;
  if(n < 1024) return n + 'B';
  if(n < 1048576) return Math.round(n / 1024) + 'KB';
  return (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + 'MB';
}
function attHTML(a){
  if(!a || !attOK(a.i)) return '';
  const url = '/_blob/' + encodeURIComponent(a.i);
  const t = String(a.t || '').toLowerCase();
  const nm = esc(String(a.n || 'file').slice(0, 90));
  if(t.indexOf('image/') === 0)
    return '<a class="msgimg" href="' + url + '" target="_blank" rel="noopener noreferrer" ' +
      'title="' + nm + '"><img src="' + url + '" alt="' + nm + '" loading="lazy"></a>';
  if(t.indexOf('video/') === 0)
    return '<video class="msgvid" src="' + url + '" controls preload="metadata"></video>';
  if(t.indexOf('audio/') === 0)
    return '<audio class="msgaud" src="' + url + '" controls preload="metadata"></audio>';
  return '<a class="msgfile" href="' + url + '" target="_blank" rel="noopener noreferrer" ' +
    'download="' + nm + '">' + FILESVG + '<span>' + nm + '</span><s>' +
    esc(sizeStr(a.s)) + '</s></a>';
}
function attsHTML(list){
  if(!Array.isArray(list) || !list.length) return '';
  const body = list.slice(0, ATTN).map(attHTML).join('');
  return body ? '<div class="msgatt">' + body + '</div>' : '';
}
function cleanAtts(list){
  if(!Array.isArray(list)) return [];
  const out = [];
  for(const a of list.slice(0, ATTN)){
    if(!a || !attOK(a.i)) continue;
    out.push({i: a.i, n: String(a.n || 'file').slice(0, 90),
              t: String(a.t || '').slice(0, 60), s: Number(a.s) || 0});
  }
  return out;
}
function chatNote(msg){
  const el = document.getElementById('msgnote');
  if(!el) return;
  el.textContent = msg || '';
  if(msg) setTimeout(() => { if(el.textContent === msg) el.textContent = ''; }, 5000);
}
function paintChatTray(){
  const tray = document.getElementById('msgtray');
  if(!tray) return;
  tray.hidden = !CHATATT.length;
  tray.innerHTML = CHATATT.map((a, i) =>
    '<span class="msgchip' + (a.up ? ' up' : '') + '"><span>' + esc(a.n) + '</span>' +
    (a.up ? '<s>\u2026</s>' : '<button type="button" data-attx="' + i +
      '" aria-label="Remove attachment">\u00d7</button>') + '</span>').join('');
}
async function addChatFiles(files){
  if(!files || !files.length) return;
  if(!SIGNED()){ nudgeSignIn(); return; }
  if(!ASSETS){ chatNote('Attachments need this page\u2019s own store, which this view has not got.'); return; }
  for(const f of files){
    if(!f) continue;
    if(CHATATT.length >= ATTN){ chatNote('Six attachments at a time.'); break; }
    if(f.size > ATTMAX){ chatNote(esc(f.name || 'That file') + ' is over 20MB.'); continue; }
    const slot = {n: f.name || 'file', t: f.type || '', s: f.size || 0, up: true};
    CHATATT.push(slot); paintChatTray();
    try{
      const res = await ASSETS.upload(f);
      if(!res || !res.id) throw new Error('no id');
      slot.i = res.id; slot.up = false;
    }catch(err){
      CHATATT = CHATATT.filter(x => x !== slot);
      chatNote((err && err.code === 'not_granted')
        ? 'Claude needs your permission to store files on this page.'
        : 'That upload did not go through.');
    }
    paintChatTray();
  }
}
let CHATOPEN = false, CHATUNREAD = 0, CHATTIMER = 0;
const chatDocId = (day, pid) => day.replace(/-/g, '') + '-' + pid;
const chatKey = r => r.ts + '|' + r.pid;
const chatDays = () => new Set([localDay(new Date()),
                                localDay(new Date(Date.now() - 864e5)),
                                localDay(new Date(Date.now() - 2 * 864e5))]);
function chatTidy(){
  CHAT.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  if(CHAT.length > CHATCAP) CHAT.splice(0, CHAT.length - CHATCAP);
}
function chatTime(ts){
  const d = new Date(ts);
  if(isNaN(d.getTime())) return '';
  try{ return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}); }
  catch(e){ return String(ts).slice(11, 16); }
}
async function loadChat(){
  if(!DB) return;
  const keep = chatDays();
  try{
    const snap = await DB.collection('chat').limit(300).get();
    const seen = new Set(), rows = [];
    for(const d of ((snap && snap.docs) ? snap.docs : (snap || []))){
      const v = docOf(d);
      if(!v || !v.p || !Array.isArray(v.m)) continue;
      if(v.d && !keep.has(String(v.d))) continue;
      const pid = realPid(String(v.p));
      for(const e of v.m){
        if(!Array.isArray(e) || !e[0]) continue;
        const row = {ts: String(e[0]), pid: pid, t: String(e[1] || '').slice(0, CHATMAX),
                     a: cleanAtts(e[2])};
        const k = chatKey(row);
        if(seen.has(k)) continue;
        seen.add(k); rows.push(row);
      }
    }
    CHAT.length = 0;
    for(const r of rows) CHAT.push(r);
    chatTidy();
  }catch(e){}
}
function paintChatBadge(){
  const n = document.getElementById('msgn');
  if(!n) return;
  n.textContent = CHATUNREAD ? (CHATUNREAD > 99 ? '99+' : String(CHATUNREAD)) : '';
  n.classList.toggle('on', CHATUNREAD > 0);
}
function paintChatWho(){
  const el = document.getElementById('msgwho');
  if(!el) return;
  const live = [...ONLINE].filter(pid => PEOPLE.has(pid) && pid !== ME);
  el.textContent = live.length
    ? live.map(pid => PEOPLE.get(pid).n).join(', ') + ' on'
    : 'nobody else on right now';
}
function paintChatFoot(){
  const foot = document.getElementById('msgfoot');
  if(!foot) return;
  if(!SIGNED()){
    foot.className = 'msgro';
    foot.textContent = 'Sign in with an ID to write here \u2014 a line needs a name on it. ' +
      'You can read along without one.';
    return;
  }
  if(foot.className === 'msgcompose') return;      // keep whatever is half-typed
  foot.className = 'msgcompose';
  foot.innerHTML = '<div id="msgnote"></div><div class="msgtray" id="msgtray" hidden></div>' +
    '<div class="msgform">' +
    '<button type="button" class="msgclip" id="msgclip" ' +
    'title="Attach photos, videos or files" aria-label="Attach a file">' + CLIPSVG + '</button>' +
    '<textarea id="msgin" rows="1" maxlength="' + CHATMAX +
    '" placeholder="Write, or drop a file in\u2026" aria-label="Message"></textarea>' +
    '<button type="button" id="msgsend">Send</button></div>' +
    '<input type="file" id="msgfile" multiple hidden>';
}
function paintChat(toBottom){
  const list = document.getElementById('msglist');
  if(!list) return;
  const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 44;
  const keepTop = list.scrollTop;
  if(!CHAT.length){
    list.innerHTML = '<p class="msgempty">Nothing said yet. What you write here reaches ' +
      'everyone with the dashboard open, and stays for three days so anyone who was out ' +
      'can catch up.</p>';
  }else{
    const today = localDay(new Date()), yest = localDay(new Date(Date.now() - 864e5));
    let out = '', lastDay = '';
    for(const r of CHAT){
      const day = String(r.ts).slice(0, 10);
      if(day !== lastDay){
        out += '<div class="msgday">' +
          esc(day === today ? 'Today' : day === yest ? 'Yesterday' : day) + '</div>';
        lastDay = day;
      }
      const who = PEOPLE.get(r.pid);
      out += '<div class="msgrow">' +
        (idDisc(r.pid) || '<i class="iddisc">?</i>') +
        '<div class="msgb"><div class="msgw"><b>' + esc(who ? who.n : 'Someone') + '</b>' +
        '<s>' + esc(chatTime(r.ts)) + '</s></div>' +
        (r.t ? '<p class="msgt">' + esc(r.t) + '</p>' : '') +
        attsHTML(r.a) + '</div></div>';
    }
    list.innerHTML = out;
  }
  list.scrollTop = (toBottom || atBottom) ? list.scrollHeight : keepTop;
}
async function sendChat(raw){
  const text = String(raw || '').trim().slice(0, CHATMAX);
  const atts = CHATATT.filter(a => attOK(a.i))
                      .map(a => ({i: a.i, n: a.n, t: a.t, s: a.s}));
  if(!text && !atts.length) return;
  if(!SIGNED()){ nudgeSignIn(); return; }
  if(CHATATT.some(a => a.up)){ chatNote('Still uploading \u2014 one moment.'); return; }
  CHATATT = []; paintChatTray();
  const now = new Date();
  const ts = now.toISOString(), day = localDay(now);
  CHAT.push({ts: ts, pid: ME, t: text, a: atts}); chatTidy(); paintChat(true);
  sndSend();
  try{ if(ROOM) ROOM.emit('chat', {ts: ts, pid: ME, t: text, a: atts}); }catch(e){}
  if(!DB) return;
  try{
    const ref = DB.doc('chat/' + chatDocId(day, ME));
    const cur = await ref.get();
    const v = (cur && cur.data) ? cur.data() : cur;
    const m = (v && Array.isArray(v.m)) ? v.m.slice() : [];
    m.push(atts.length ? [ts, text, atts] : [ts, text]);
    await ref.set({p: ME, d: day, m: m.slice(-250)});
  }catch(e){}
}
async function toggleChat(force){
  const dock = document.getElementById('msgdock');
  if(!dock) return;
  CHATOPEN = force === undefined ? !CHATOPEN : !!force;
  dock.classList.toggle('open', CHATOPEN);
  clearInterval(CHATTIMER); CHATTIMER = 0;
  if(!CHATOPEN) return;
  CHATUNREAD = 0; paintChatBadge(); paintChatFoot(); paintChatWho();
  paintChat(true);
  await loadChat();
  paintChat(true);
  const ta = document.getElementById('msgin');
  if(ta) try{ ta.focus(); }catch(e){}
  /* the room does the delivering; this is only the backstop for a dropped moment */
  CHATTIMER = setInterval(async () => {
    if(!CHATOPEN) return;
    await loadChat();
    paintChat(false);
    paintChatWho();
  }, 20000);
}
function chatHeard(data){
  if(!data || typeof data.t !== 'string') return;
  const row = {ts: String(data.ts || new Date().toISOString()),
               pid: typeof data.pid === 'string' ? realPid(data.pid) : '',
               t: data.t.slice(0, CHATMAX),
               a: cleanAtts(data.a)};
  if(CHAT.some(x => chatKey(x) === chatKey(row))) return;
  CHAT.push(row); chatTidy();
  sndHeard();
  if(CHATOPEN){ paintChat(false); return; }
  CHATUNREAD++; paintChatBadge();
}
(function buildChat(){
  const dock = document.createElement('div');
  dock.id = 'msgdock';
  dock.innerHTML =
    '<div id="msgpanel" role="dialog" aria-label="Messages">' +
      '<div class="msghead"><b>Messages</b><s id="msgwho"></s>' +
      '<button type="button" class="msgx msgmute" id="msgmute" ' +
      'aria-pressed="true" title="Sounds on">\u266a</button>' +
      '<button type="button" class="msgx" id="msgclose" ' +
      'aria-label="Close messages">\u00d7</button></div>' +
      '<div class="msglist" id="msglist"></div><div id="msgfoot"></div></div>' +
    '<button type="button" id="msgbtn" aria-label="Messages">' +
      'Messages<span id="msgn"></span></button>';
  document.body.appendChild(dock);
  paintChatFoot();
  paintChatMute();
  document.addEventListener('click', e => {
    if(!e.target || !e.target.closest) return;
    if(e.target.closest('#msgbtn')){ toggleChat(); return; }
    if(e.target.closest('#msgclose')){ toggleChat(false); return; }
    if(e.target.closest('#msgmute')){
      CHATSND = !CHATSND;
      LS.set('illum.chatsound', CHATSND ? '1' : '0');
      paintChatMute();
      if(CHATSND) sndSend();
      return;
    }
    if(e.target.closest('#msgclip')){
      const f = document.getElementById('msgfile');
      if(f) f.click();
      return;
    }
    const attx = e.target.closest('[data-attx]');
    if(attx){
      CHATATT.splice(+attx.dataset.attx, 1);
      paintChatTray();
      return;
    }
    if(e.target.closest('#msgsend')){
      const ta = document.getElementById('msgin');
      if(ta){ const v = ta.value; ta.value = ''; ta.style.height = ''; sendChat(v); }
    }
  });
  document.addEventListener('keydown', e => {
    if(!e.target || e.target.id !== 'msgin') return;
    if(e.key === 'Escape'){ toggleChat(false); return; }
    if(e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    const v = e.target.value;
    e.target.value = ''; e.target.style.height = '';
    sendChat(v);
  });
  document.addEventListener('input', e => {
    if(!e.target || e.target.id !== 'msgin') return;
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(96, e.target.scrollHeight) + 'px';
  });
  document.addEventListener('change', e => {
    if(!e.target || e.target.id !== 'msgfile') return;
    addChatFiles([...(e.target.files || [])]);
    e.target.value = '';
  });
  /* a file dropped anywhere on the panel is an attachment, and so is a pasted picture */
  const panel = document.getElementById('msgpanel');
  if(panel){
    panel.addEventListener('dragover', e => {
      if(!e.dataTransfer) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      panel.classList.add('dragging');
    });
    panel.addEventListener('dragleave', e => {
      if(e.target === panel) panel.classList.remove('dragging');
    });
    panel.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      panel.classList.remove('dragging');
      const fs = e.dataTransfer && e.dataTransfer.files;
      if(fs && fs.length) addChatFiles([...fs]);
    });
    panel.addEventListener('paste', e => {
      const items = (e.clipboardData && e.clipboardData.items) || [];
      const picked = [];
      for(const it of items){
        if(it.kind !== 'file') continue;
        const f = it.getAsFile();
        if(f) picked.push(f);
      }
      if(!picked.length) return;
      e.preventDefault(); e.stopPropagation();
      addChatFiles(picked);
    });
  }
  if(DB) loadChat().then(() => { if(CHATOPEN) paintChat(true); });
})();


/* ================= booking =================
   A model in talks with their mother agency. Nothing here is crawled: the figures come
   across from the card that was lamped, everything after that is typed. One document
   per card, so two people editing two cards can never overwrite each other. */
const BOOK = new Map();
const BKSEC = [['email', 'Email'], ['guar', 'Guarantee negotiation'],
               ['contract', 'Contract'], ['visa', 'Visa'],
               ['flight', 'Flight ticket']];
const BKOPEN = new Set();          // "<bid>|<sec>" while a section is unfolded
let bkArm = '';                    // the card whose delete is armed
let bkDragId = '';                 // the card being dragged between the rows
/* Three rows, in the order a booking moves through them backwards: what is finished
   sits at the top where it is out of the way, what is live sits under it. */
const BKST = [
  ['done', 'Completed',  'g',
   'Closed \u2014 the model is booked and every stage on the card is settled.',
   'Nothing finished yet. Press COMPLETED on a card once the booking is closed.'],
  ['proc', 'Processing', 'y',
   'Live \u2014 emails going back and forth, terms still being agreed.',
   'Nothing in motion. A new card, and a model brought over from Updates or Lumen, lands here.'],
  ['canc', 'Cancelled',  'r',
   'Off \u2014 the talks ended, or the model went somewhere else.',
   'Nothing cancelled.']
];
const BKSHUT = new Set();          // rows the scout has folded away
const bkStOf = c => (c && (c.st === 'done' || c.st === 'canc')) ? c.st : 'proc';
const newBid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const bkNum = v => { const x = parseFloat(v); return isNaN(x) ? null : Math.round(x * 10) / 10; };
/* The card always STORES centimetres and a European shoe size, whatever it is showing.
   A unit is a way of reading the same figure, not a different figure, so switching one
   can never lose or drift the number underneath - and a booker quoting a London client
   in inches and a Milan client in centimetres is reading one card, not keeping two. */
const cmToIn = v => v == null || v === '' ? v : Math.round(v / 2.54 * 10) / 10;
const inToCm = v => v == null || v === '' ? v : Math.round(v * 2.54 * 10) / 10;
/* Paris point: a European size is one and a half times the foot in centimetres, plus
   a point and a half. Read backwards it gives the mondopoint length in millimetres. */
const euToMm = v => v == null || v === '' ? v : Math.round((v / 1.5 - 1.5) * 10);
const mmToEu = v => v == null || v === '' ? v : Math.round((v / 10 + 1.5) * 1.5 * 10) / 10;
const bkLU = c => c && c.lu === 'in' ? 'in' : 'cm';
const bkSU = c => (c && (c.su === 'us' || c.su === 'mm')) ? c.su : 'eu';
const BKSHOEF = {eu: 'eu', us: 'us', mm: 'mm'};
function bkSorted(){
  return [...BOOK.values()].sort((a, b) =>
    (a.o || 0) - (b.o || 0) || String(a.id).localeCompare(String(b.id)));
}
function bkForKey(key){
  if(!key) return null;
  for(const c of BOOK.values()) if(c.k === key) return c;
  return null;
}
async function loadBook(){
  if(!DB) return;
  try{
    const snap = await DB.collection('book').limit(300).get();
    BOOK.clear();
    for(const d of ((snap && snap.docs) ? snap.docs : (snap || []))){
      const v = docOf(d);
      if(!v) continue;
      const id = v.id || (d && d.id);
      if(!id) continue;
      const row = Object.assign({id: id, o: 0, s: {}}, thaw(v), {id: id});
      if(!row.s || typeof row.s !== 'object' || Array.isArray(row.s)) row.s = {};
      /* cards written before that fix have the country in the city box as well */
      if(row.city && row.city === row.country) row.city = '';
      BOOK.set(id, row);
      BKBASE.set(id, thaw(v));
    }
  }catch(e){}
}
const BKSAVE = new Map();
/* Two people working on the same card at once must not wipe each other out. A card is
   saved as the fields THIS page changed since it last heard from the store, laid over
   whatever the store holds now - so one person's city and another's agency both
   survive. The stages and the measurement sheet merge one entry deeper. */
const BKBASE = new Map();
const bkJ = v => JSON.stringify(v === undefined ? null : v);
function bkMerge(base, mine, srv){
  const out = thaw(srv) || {};
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(mine || {})]);
  for(const k of keys){
    const b = (base || {})[k], m = (mine || {})[k];
    if((k === 's' || k === 'md') && m && typeof m === 'object' && !Array.isArray(m)){
      const o = (out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) ? out[k] : {};
      const bb = (b && typeof b === 'object') ? b : {};
      for(const sk of new Set([...Object.keys(bb), ...Object.keys(m)])){
        if(bkJ(m[sk]) === bkJ(bb[sk])) continue;
        if(m[sk] === undefined) delete o[sk]; else o[sk] = thaw(m[sk]);
      }
      out[k] = o;
      continue;
    }
    if(bkJ(m) === bkJ(b)) continue;
    if(m === undefined) delete out[k]; else out[k] = thaw(m);
  }
  return out;
}
async function bkWrite(bid){
  const c = BOOK.get(bid);
  if(!c || !DB) return;
  let out = c;
  const base = BKBASE.get(bid);
  if(base){
    try{
      const srv = docOf(await DB.doc('book/' + bid).get());
      if(srv) out = bkMerge(base, thaw(c), srv);
    }catch(e){}
  }
  await DB.doc('book/' + bid).set(out);
  BKBASE.set(bid, thaw(out));
  /* what the others changed comes back into this card too, in place */
  if(out !== c){ for(const k of Object.keys(c)) if(!(k in out)) delete c[k]; Object.assign(c, thaw(out)); }
}
function saveBook(bid, now){
  const c = BOOK.get(bid);
  if(!c || !DB || !SIGNED()) return;
  LIVE.book.set(bid, Date.now());
  clearTimeout(BKSAVE.get(bid));
  const go = async () => {
    BKSAVE.delete(bid);
    try{ await bkWrite(bid); }catch(e){}
  };
  if(now) go(); else BKSAVE.set(bid, setTimeout(go, 600));
}
/* A card typed into and then closed inside the held beat would have lost the last
   thing typed. The contacts already flush on the way out; so does this. */
function flushBook(){
  for(const [bid, t] of BKSAVE){
    clearTimeout(t);
    const c = BOOK.get(bid);
    if(c && DB && SIGNED()){ try{ bkWrite(bid); }catch(e){} }
  }
  BKSAVE.clear();
}
window.addEventListener('beforeunload', flushBook);
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden') flushBook();
});
async function dropBook(bid){
  BOOK.delete(bid);
  renderBook();
  if(!DB || !SIGNED()) return;
  try{ await DB.doc('book/' + bid).delete(); }catch(e){}
}
/* Bring a lamped or newly arrived model across, figures and face and all. */
function bookFromModel(key, nm, ag, city, country){
  if(!SIGNED()){ nudgeSignIn(); return null; }
  const had = bkForKey(key);
  if(had) return had;
  let f = {};
  try{ f = litFacts({key: key, nm: nm, ag: ag, city: city, country: country}) || {}; }catch(e){}
  const bid = newBid();
  const c = {id: bid, o: (bkSorted().length ? (bkSorted().slice(-1)[0].o || 0) + 1 : 0),
    k: key || '', nm: nm || '', ag: ag || '', city: city || '', country: country || '',
    ht: f.ht == null ? '' : f.ht, bu: f.bu == null ? '' : f.bu,
    wa: f.wa == null ? '' : f.wa, hp: f.hp == null ? '' : f.hp,
    eu: f.eu == null ? '' : f.eu, us: f.us == null ? '' : f.us,
    ig: igFor(key, nm) || '', ph: '', ft: '', s: {}, st: 'proc',
    by: ME || '', at: new Date().toISOString()};
  BOOK.set(bid, c);
  saveBook(bid, true);
  return c;
}
/* want === null cycles the light: out -> amber -> green -> out. Otherwise it is set
   to that colour, and pressing the colour it already is puts it out. */
/* The light used to be drawn by re-rendering the whole tab. That made one lamp depend
   on every other thing on the card rendering without fault - and anything that threw in
   between left the lamp looking dead with no sign of why. So the lamp is now painted
   straight onto its own row first, and everything else is allowed to fail behind it. */
function bkPaintStage(bid, k, v){
  const card = document.querySelector('.bkcard[data-bkid="' + CSS.escape(bid) + '"]');
  if(!card) return false;
  const sh = card.querySelector('[data-bksec="' + CSS.escape(bid + '|' + k) + '"]');
  const sec = sh ? sh.closest('.bksec') : null;
  if(!sec) return false;
  sec.dataset.p = v;
  const dot = sec.querySelector('.bkdot');
  if(dot){
    const w = dot.querySelector('i');
    if(w) w.textContent = v === 'g' ? 'done' : v === 'y' ? 'in process' : '';
    dot.title = v === 'g' ? 'Completed \u2014 press to put the light out'
      : v === 'y' ? 'In process \u2014 press to mark completed'
      : 'Not started \u2014 press to mark in process';
  }
  return true;
}
function bkStage(bid, k, want){
  const c = BOOK.get(bid);
  if(!c){ ILLERR = 'no card ' + bid; return; }
  if(!SIGNED()){ nudgeSignIn(); return; }
  const had = (c.s && typeof c.s === 'object' && !Array.isArray(c.s)) ? c.s : {};
  const st = (had[k] && typeof had[k] === 'object') ? had[k] : {};
  const now = (st.p === 'g' || st.p === 'y') ? st.p : (st.d ? 'g' : '');
  const next = want === null
    ? (now === '' ? 'y' : now === 'y' ? 'g' : '')
    : (now === want ? '' : want);
  /* A WHOLE NEW s, assigned to c - never a key written into the old one. Even if the
     old one is frozen, this cannot fail. d is kept in step so anything that still
     reads the old settled flag agrees. */
  const next_s = Object.assign({}, had);
  next_s[k] = Object.assign({}, st, {p: next, d: next === 'g'});
  c.s = next_s;
  const painted = bkPaintStage(bid, k, next);   // the light, before anything else
  try{ saveBook(bid, true); }catch(e){ ILLERR = 'save: ' + (e && e.message); }
  try{ renderBook(); }
  catch(e){
    ILLERR = 'render: ' + (e && e.message);
    if(!painted) bkPaintStage(bid, k, next);
  }
}
/* Dropped onto a row, and onto a place in that row. Dropping a card back into the row
   it came from is a reorder; dropping it on another row is a move. Both end the same
   way: the whole order is renumbered so no two cards can argue about who is first. */
function bkDropInto(bid, to, overId, before){
  const c = BOOK.get(bid);
  if(!c) return;
  if(!SIGNED()){ nudgeSignIn(); return; }
  const all = bkSorted();
  const rest = all.filter(x => x.id !== bid);
  c.st = to;
  const row = rest.filter(x => bkStOf(x) === to);
  let at = row.length;
  if(overId){
    const i = row.findIndex(x => x.id === overId);
    if(i >= 0) at = before ? i : i + 1;
  }
  row.splice(at, 0, c);
  const order = [];
  for(const [k] of BKST)
    order.push.apply(order, k === to ? row : rest.filter(x => bkStOf(x) === k));
  const changed = [];
  order.forEach((x, n) => { if(x.o !== n){ x.o = n; changed.push(x.id); } });
  if(changed.indexOf(bid) < 0) changed.push(bid);   // its row may have changed
  renderBook();
  changed.forEach(id => saveBook(id, true));
}
function bkMoveTo(bid, to){
  const c = BOOK.get(bid);
  if(!c) return false;
  if(!SIGNED()){ nudgeSignIn(); return false; }
  if(bkStOf(c) === to) return false;
  c.st = to;
  /* it lands at the end of the row it was sent to, where the eye expects it */
  const all = bkSorted();
  c.o = (all.length ? Math.max.apply(null, all.map(x => x.o || 0)) : 0) + 1;
  saveBook(bid, true);
  renderBook();
  return true;
}
function bkPhoto(c){
  if(c.ph) return picURL(c.ph);
  if(c.k){
    const id = PICS.get(c.k);
    if(id) return picURL(id);
    try{ const f = litFacts({key: c.k, nm: c.nm, ag: c.ag}); if(f && f.photo) return f.photo; }catch(e){}
  }
  return '';
}
/* The five stages - notes, lights and files - as one block, so the card and the viewer's
   side panel draw exactly the same thing and answer to the same handlers. */
function bkSecsHtml(c){
  return BKSEC.map(([k, label]) => {
    const st = (c.s && c.s[k]) || {};
    const open = BKOPEN.has(c.id + '|' + k);
    /* older cards stored a plain settled tick; it reads as the green light */
    const pv = (st.p === 'g' || st.p === 'y') ? st.p : (st.d ? 'g' : '');
    const dtit = pv === 'g' ? 'Completed \u2014 press to put the light out'
      : pv === 'y' ? 'In process \u2014 press to mark completed'
      : 'Not started \u2014 press to mark in process';
    return '<div class="bksec" data-open="' + (open ? 1 : 0) + '" data-p="' + pv + '">' +
      '<div class="bksh" role="button" tabindex="0" data-bksec="' + esc(c.id) + '|' + k + '">' +
      '<span class="bkcar">' + (open ? '\u2212' : '+') + '</span><b>' + esc(label) + '</b>' +
      '<button type="button" class="bkdot" data-bkstage="' + esc(c.id) + '|' + k +
      '" title="' + dtit + '" aria-label="' + esc(label) + ': ' + dtit + '">' +
      '<i>' + (pv === 'g' ? 'done' : pv === 'y' ? 'in process' : '') + '</i>' +
      '<s></s></button></div>' +
      '<div class="bkbody"><textarea data-bk="' + esc(c.id) + '" data-sec="' + k +
      '" placeholder="' + esc(BKHINT[k]) + '">' + esc(st.t || '') + '</textarea>' +
      '<div class="bknotegrip" role="separator" aria-orientation="horizontal" ' +
        'aria-label="Drag to resize the notes" title="Drag up or down to resize"></div>' +
      bkAttTray(c, k, st) +
      (function(){
        /* One stage's paperwork is its own errand: the visa pack goes to the embassy,
           the book goes to the client. So each stage that holds anything can be taken
           on its own, and the card's own button still takes the lot. */
        const held = (Array.isArray(st.f) ? st.f : []).filter(a => a && attOK(a.i));
        /* Each tray takes its own; this one is only for an email whose book, snaps and
           video all have to go in the same parcel. */
        if(!binned(k)) return '';
        const used = BKBINS.filter(([bin]) => held.some(a => binOf(a) === bin)).length;
        const wk = c.id + '|' + k;
        return used > 1 ? '<div class="bkdl bkdl--sec"><button type="button" class="bkdlb" ' +
          'data-bkdls="' + esc(c.id) + '|' + k + '" title="Save all three shelves of ' +
          esc(label) + ' as one zip">' + DLSVG + '<span>Download all ' +
          esc(label.toLowerCase()) + '</span><s>' + held.length + '</s></button>' +
          '<button type="button" class="bkdlb bkatt--rm' + (bkWipe === wk ? ' arm' : '') +
          '" data-bkwipe="' + esc(wk) + '" title="' +
          (bkWipe === wk ? 'Click again to delete all ' + held.length +
            ' \u2014 this cannot be undone'
           : 'Delete every file on ' + esc(label)) + '">' + TRASHSVG + '<span>' +
          (bkWipe === wk ? 'Delete ' + held.length + '?' : 'Delete all ' +
            esc(label.toLowerCase())) + '</span></button>' +
          '<span class="bkdlsay" role="status" data-bksay="' + esc(c.id) + '|' + k +
          '"></span></div>' : '';
      })() +
      /* The lamp on the row IS the status. A second control saying the same thing in
         words was one more place for the two to disagree. Only the flight stage keeps
         a control here, because round trip or one way is not a status. */
      (k === 'flight'
        ? '<div class="bkrow"><span class="bkseg" data-bkft="' + esc(c.id) + '">' +
          '<button type="button" data-ft="rt" aria-pressed="' + (c.ft === 'rt') +
          '">round trip</button>' +
          '<button type="button" data-ft="ow" aria-pressed="' + (c.ft === 'ow') +
          '">one way</button></span></div>'
        : '') +
      '</div></div>';
  }).join('');
}

/* What is still blank on a card, in the order a booker fills it in. */
function bkMissing(c){
  const blank = v => v == null || String(v).trim() === '';
  const out = [];
  const add = (cond, label) => { if(cond) out.push(label); };
  add(!bkPhoto(c), 'Photo');
  add(blank(c.ig), 'Instagram');
  add(blank(c.ht), 'Height'); add(blank(c.bu), 'Bust'); add(blank(c.wa), 'Waist');
  add(blank(c.hp), 'Hips'); add(blank(c.eu) && blank(c.us), 'Shoes'); add(blank(c.wt), 'Weight');
  add(blank(c.dob) && blank(c.age), 'Age / DOB');
  add(blank(c.exp), 'EXP');
  add(!beenList(c).length, 'Countries');
  add(blank(c.avd), 'Availability days'); add(blank(c.avf), 'Available from');
  add(blank(c.ind), 'Entry date'); add(blank(c.inf), 'Entry flight');
  add(blank(c.outd), 'Departure date'); add(blank(c.outf), 'Departure flight');
  return out;
}
const BKMISSON = new Set();     // cards whose empty fields are marked, while you look
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-bkmisst]');
  if(!b) return;
  e.preventDefault(); e.stopPropagation();
  const id = b.dataset.bkmisst;
  if(BKMISSON.has(id)) BKMISSON.delete(id); else BKMISSON.add(id);
  const c = BOOK.get(id);
  document.querySelectorAll('.bkcard[data-bkid="' + CSS.escape(id) + '"]').forEach(k =>
    k.classList.toggle('bkshowmiss', BKMISSON.has(id)));
  if(c) document.querySelectorAll('[data-bkmiss="' + CSS.escape(id) + '"]').forEach(x => {
    x.innerHTML = bkMissHtml(c); });
}, true);
function bkMissHtml(c){
  const m = bkMissing(c);
  if(!m.length) return '<span class="bkmiss bkmiss--ok" title="Everything on this card is filled in">' +
    '\u2713 all filled in</span>';
  const on = BKMISSON.has(c.id);
  return '<button type="button" class="bkmiss" data-bkmisst="' + esc(c.id) + '" aria-pressed="' + on +
    '" title="Still to fill in: ' + esc(m.join(', ')) + ' \u2014 click to ' +
    (on ? 'hide' : 'show') + ' them on the card"><i></i>' +
    '<b>' + m.length + '</b> to fill in<s>' + (on ? 'hide' : 'show') + '</s></button>';
}
function bkCard(c, i, n){
  const src = bkPhoto(c);
  const fld = (f, cls, ph, val) =>
    '<input class="bkf ' + cls + '" data-bk="' + esc(c.id) + '" data-bf="' + f +
    '" placeholder="' + esc(ph) + '" value="' + esc(val == null ? '' : String(val)) + '">';
  const lu = bkLU(c), su = bkSU(c);
  const box = (f, lab, val, unit, tip, ph) =>
    '<label class="bkm"' + (tip ? ' title="' + esc(tip) + '"' : '') + '><b>' + lab +
    '</b><input inputmode="decimal" data-bk="' + esc(c.id) + '" data-bf="' + f +
    '" placeholder="' + esc(ph || ' ') + '"' +
    ' value="' + esc(val == null || val === '' ? '' : String(val)) + '">' +
    (unit ? '<u>' + unit + '</u>' : '') + '</label>';
  const mx = (f, lab) => {
    const raw = c[f] == null || c[f] === '' ? '' : c[f];
    return box(f, lab, lu === 'in' ? cmToIn(raw) : raw, lu,
      raw === '' ? '' : lab + ' ' + raw + ' cm \u00b7 ' + cmToIn(raw) + ' in');
  };
  const shoe = () => {
    const eu = c.eu == null || c.eu === '' ? '' : c.eu;
    const us = c.us == null || c.us === '' ? '' : c.us;
    const mm = euToMm(eu);
    const tip = (eu === '' && us === '') ? '' :
      'Shoe ' + (eu === '' ? '\u2013' : eu) + ' EU \u00b7 ' +
      (us === '' ? '\u2013' : us) + ' US \u00b7 ' + (mm === '' ? '\u2013' : mm) + ' mm';
    if(su === 'us'){
      /* An agency that publishes only a European size still tells you roughly what the
         American one is. It is shown as a suggestion, in grey, and nothing is stored
         until somebody types it: a guessed figure quoted as fact is how a shoe arrives
         in the wrong size. */
      let guess = '';
      if(us === '' && eu !== ''){
        let g = null;
        try{ g = litFacts(bkModel(c)); }catch(e){}
        const gm = (c.g === 'M' || c.g === 'F') ? c.g : (g && g.g);
        guess = String(Math.round((eu - (gm === 'M' ? 33 : 31)) * 10) / 10);
      }
      return box('us', 'SH', us, 'us', tip +
        (guess ? ' \u00b7 nothing published in US, \u2248' + guess : ''), guess);
    }
    if(su === 'mm') return box('mm', 'SH', mm, 'mm', tip);
    return box('eu', 'SH', eu, 'eu', tip);
  };
  const useg = (which, opts, now) =>
    '<span class="bkuseg" data-bku="' + esc(c.id) + '|' + which + '">' +
    opts.map(u => '<button type="button" data-u="' + u + '" aria-pressed="' +
      (u === now) + '" title="Read these figures in ' + BKUNAME[u] + '">' + u +
      '</button>').join('') + '</span>';
  const secs = bkSecsHtml(c);
  return '<article class="bkcard' + (BKMISSON.has(c.id) ? ' bkshowmiss' : '') + '" data-bkfold="' + (bkFoldOpen(c.id) ? '0' : '1') + '" data-bkid="' + esc(c.id) +
    '" data-bkst="' + bkStOf(c) + '">' +
    '<div class="bkhd">' +
      '<span class="bkpic" data-bkpic="' + esc(c.id) + '" role="button" tabindex="0" ' +
      'title="' + (src ? 'Click to open everything for this model \u00b7 drop or paste ' +
        'to replace the photograph' : 'Drop, paste or click to set a photograph') + '">' +
      (src ? '<img draggable="false" src="' + esc(src) + '" alt="' + esc(c.nm || '') + '">'
           : '<i>drop or paste<br>a photograph</i>') + '</span>' +
      (c.by && PEOPLE.has(c.by)
        ? '<span class="bkby" title="' + esc(PEOPLE.get(c.by).n) +
          ' opened this card and is handling this booking">' + idDisc(c.by) + '</span>'
        : '') +
      '<span class="bktools">' +
        '<button type="button" class="bkt bkt--grip" data-bkgrip="' + esc(c.id) +
        '" title="Drag this card to another row" aria-label="Drag this card">' +
        '\u283f</button>' +
        '<button type="button" class="bkt' + (bkArm === c.id ? ' arm' : '') +
        '" data-bkdel="' + esc(c.id) + '" title="' +
        (bkArm === c.id ? 'Click again to remove this card' : 'Remove this card') +
        '" aria-label="Remove this card">\u00d7</button>' +
      '</span></div>' +
    '<span class="bkmove"><span class="bkmvseg">' + BKST.map(([k, label, v]) =>
      '<button type="button" class="bkmv bkmv--' + v + '" data-bkmove="' + esc(c.id) +
      '|' + k + '" aria-pressed="' + (bkStOf(c) === k) + '" title="Move this card to ' +
      label + '">' + label + '</button>').join('') + '</span></span>' +
    '<span class="bkwho">' +
      '<div class="litr1 bknmrow">' + bkNameCell(c, fld) + '</div>' +
      bkWhoLine(c, fld) + '</span>' +
    bkLinked(c) + bkActs(c) +
    '<div class="bkmissrow" data-bkmiss="' + esc(c.id) + '">' + bkMissHtml(c) + '</div>' +
    '<div class="bkuni">' + useg('lu', ['cm', 'in'], lu) +
      useg('su', ['eu', 'us', 'mm'], su) + useg('wu', ['kg', 'lb'], bkWU(c)) + '</div>' +
    '<div class="bkmx">' + mx('ht', 'HT') + shoe() + (function(){
        /* weight: kept in kilograms, shown in pounds when the card reads in inches */
        const wu = bkWU(c);
        const k = parseFloat(c.wt);
        const v = isNaN(k) ? '' : (wu === 'lb' ? Math.round(k / 0.45359237) : k);
        return '<label class="bkm"' + (isNaN(k) ? '' : ' title="Weight ' + k + ' kg \u00b7 ' +
          Math.round(k / 0.45359237) + ' lb"') + '><b>WT</b><input inputmode="decimal" ' +
          'data-bk="' + esc(c.id) + '" data-bf="wt" data-wu="' + wu + '" placeholder=" " value="' +
          esc(String(v)) + '"><u>' + wu + '</u></label>';
      })() + mx('bu', 'B') + mx('wa', 'W') + mx('hp', 'H') + '</div>' +
    /* born, and how old that makes her today - or just the age, when the date is not
       something anybody has bothered to send */
    (function(){
      const auto = ageFrom(c.dob);
      const p = dobParse(c.dob);
      const bad = String(c.dob || '').trim() && !p;
      return '<div class="bkdob' + (bad ? ' bkdob--odd' : '') + '">' +
        '<b>AGE</b>' + (auto === ''
          ? '<input class="bkf bkf--age" inputmode="numeric" data-bk="' + esc(c.id) +
            '" data-bf="age" placeholder="\u2014" value="' +
            esc(c.age == null ? '' : String(c.age)) + '" title="Type the age when you do ' +
            'not have the date">'
          : '<span class="bkagen" title="' + esc('From ' + dobWords(p)) + '">' + auto +
            '</span>') +
        '<b>DOB</b><input class="bkf bkf--dob" data-bk="' + esc(c.id) + '" data-bf="dob" ' +
        'placeholder="DD/MM/YYYY" value="' + esc(c.dob == null ? '' : String(c.dob)) +
        '" title="' + (p ? esc(dobWords(p))
          : 'Day first \u2014 17/05/2004, 2004-05-17 or 17 May 2004') + '">' +
        (p ? '<s>' + esc(dobWords(p)) + '</s>' : '') + '</div>';
    })() +
    /* what only a booking needs, after everything a Lumen card shows */
    '<span class="bkwho bkxtra">' +
      /* How long they have been doing this, in whatever words suit - two years, 18
         months, since 2023 - and the places the work has taken them. Both sit under
         the country because that is the paragraph a booker reads first. */
      '<span class="bkexp"><b>EXP</b>' +
        fld('exp', 'bkf--exp', '2 yrs \u00b7 18 months', c.exp) + '</span>' +
      (function(){
        const all = beenList(c);
        const open = BNMORE.has(c.id);
        const been = open ? all : all.slice(0, BNSHOW);
        const rest = all.length - been.length;
        return '<span class="bkbeen" data-bkbeen="' + esc(c.id) + '"><b>COUNTRIES</b>' +
          been.map((x, i) => '<span class="bnchip" title="' +
            esc(x.c + (x.t ? ' \u00b7 ' + x.t : '')) + '">' + esc(x.c) +
            (x.t ? '<u>' + esc(x.t) + '</u>' : '') +
            '<button type="button" class="bnx" data-bnx="' + esc(c.id) + '|' + i +
            '" title="Remove ' + esc(x.c) + '" aria-label="Remove ' + esc(x.c) +
            '">\u00d7</button></span>').join('') +
          (rest > 0
            ? '<button type="button" class="bnmore" data-bnmore="' + esc(c.id) +
              '" title="Show the other ' + rest + '">+' + rest + '</button>'
            : (open && all.length > BNSHOW
              ? '<button type="button" class="bnmore" data-bnmore="' + esc(c.id) +
                '" title="Show fewer">\u2212</button>' : '')) +
          '<input class="bnadd" list="worldcc" data-bnadd="' + esc(c.id) +
          '" placeholder="' + (all.length ? '+ add' : '+ country, or city, country') +
          '" aria-label="Add a country this model has worked in"></span>';
      })() +
      /* how long they can stay, and from when */
      '<span class="bkav"><b>AVAILABILITY</b>' +
        '<label class="bkavc"><input class="bkf bkf--avd" inputmode="numeric" data-bk="' +
          esc(c.id) + '" data-bf="avd" placeholder="\u2014" value="' +
          esc(c.avd == null ? '' : String(c.avd)) + '" aria-label="Number of days available">' +
          '<u>days</u></label>' +
        '<label class="bkavc bkavc--from"><u>from</u><input class="bkf bkf--avf" data-bk="' +
          esc(c.id) + '" data-bf="avf" placeholder="DD/MM/YYYY" value="' +
          esc(c.avf == null ? '' : String(c.avf)) + '" aria-label="Available from"></label>' +
      '</span>' +
      /* arrival and departure, each with the flight that carries them */
      [['ENTRY', 'ind', 'inf', 'Entry date', 'Arriving flight'],
       ['DEPARTURE', 'outd', 'outf', 'Departure date', 'Departing flight']].map(
        ([lab, fd, ff, ad, af]) =>
        '<span class="bkav bktrv"><b>' + lab + '</b>' +
          '<label class="bkavc bkavc--from"><u>date</u><input class="bkf bkf--avf" data-bk="' +
            esc(c.id) + '" data-bf="' + fd + '" placeholder="DD/MM/YYYY" value="' +
            esc(c[fd] == null ? '' : String(c[fd])) + '" aria-label="' + ad + '"></label>' +
          '<label class="bkavc bkavc--fl"><u>flight #</u><input class="bkf bkf--fl" data-bk="' +
            esc(c.id) + '" data-bf="' + ff + '" placeholder="KE 956" value="' +
            esc(c[ff] == null ? '' : String(c[ff])) + '" aria-label="' + af + ' number"></label>' +
        '</span>').join('') +
      '</span>' +
    /* Find Photo closes the details, right above the stages */
    bkLinked(c, 'photo') +
    '<div class="bksecs">' + secs + '</div>' +
    (function(){
      let n = 0, att = 0;
      for(const [k] of BKSEC){
        const f = (((c.s || {})[k] || {}).f || []).length;
        n += f; att += f;
      }
      if(c.ph) n++;
      /* Every shelf has its own pair and every stage has one; the card needed the same
         pair, or the only way to empty a card was to work down it a shelf at a time. */
      const wk = 'card|' + c.id;
      /* One name, always. What the card holds changes week to week - a photograph
         today, contracts and spreadsheets by Friday - and a control that renames itself
         as the contents change is one nobody can learn. The count says what is in it. */
      const onlyPic = !att && c.ph;
      return att ? '<div class="bkdl"><button type="button" class="bkdlb" data-bkdl="' +
        esc(c.id) + '" title="' + (onlyPic
          ? 'Only the photograph is on this card so far \u2014 it saves as a picture; ' +
            'once files are attached this saves them all as one zip'
          : 'Save everything on this card as one zip, foldered by stage') + '">' + DLSVG +
        '<span>Download all</span><s>' + n + '</s></button>' +
        (att ? '<button type="button" class="bkdlb bkatt--rm' +
          (bkWipe === wk ? ' arm' : '') + '" data-bkwipe="' + esc(wk) + '" title="' +
          (bkWipe === wk
            ? 'Press again to delete all ' + att + ' \u2014 this cannot be undone'
            : 'Delete every file on this card \u2014 the photograph is kept') + '">' +
          TRASHSVG + '<span>' + (bkWipe === wk ? 'Delete ' + att + '?' : 'Delete all') +
          '</span>' + (bkWipe === wk ? '' : '<s>' + att + '</s>') + '</button>' : '') +
        '<span class="bkdlsay" role="status" data-bksay="' + esc(c.id) + '|"></span></div>' : '';
    })() +
    '</article>';
}
/* The same chip the model cards carry, and the same pencil: the handle reads as a
   handle, the chip is the way to that page, and it is keyed to this card rather than
   to a crawled profile. */
/* A card that came across from Updates or Lumen still points at a real profile, so it
   keeps everything that profile earns: the lamps, the agency's contacts, the board it
   is on, the photograph hunt. A card typed from scratch has none of that to point at,
   and shows whatever its typed agency name can still reach. */
function bkSexSeg(c, g){
  const pick = (v, word, cls) => '<button type="button" class="litsex ' + cls +
    (g === v ? ' on' : '') + '" data-g="' + v + '" aria-pressed="' + (g === v) + '" title="' +
    (g === v ? word + (c.g === v ? ' \u2014 set on this card; press again to go back to ' +
      'what the agency says' : ' \u2014 as the agency\u2019s board says') : 'Set ' + word) +
    '">' + word + '</button>';
  return '<span class="bksex" data-bksex="' + esc(c.id) + '"' + (g === '?'
    ? ' title="The agency does not say \u2014 pick one"' : '') + '>' +
    pick('F', 'Female', 'f') + pick('M', 'Male', 'm') + '</span>';
}
/* The same bar that closes an Updates or Lumen card: the agency's contacts, the
   handle, Find Photo, the agency's picture - and Open, which on a booking card is what
   Book is on the others. */
function bkActs(c){
  let f = null;
  if(/^https?:/i.test(c.k || '')){ try{ f = litFacts(bkModel(c)); }catch(e){ f = null; } }
  const busy = c.k && PHOTO_FINDING.has(c.k);
  const say = f && f.own ? 'Photo saved'
    : ((PHOTO_STATUS.get(c.k) || {}).state === 'not-found' ? 'No retrievable agency photo' : 'Photo not saved');
  return '<div class="bkacts"><span class="litib">' +
    (c.ag ? ctsChip(c.ag, c.ag) : '') +
    bkIGRow(c).replace(/^<div class="bkig">/, '').replace(/<\/div>$/, '') +
    '<button type="button" class="lumenphotoctl litcam' + (busy ? ' finding' : '') +
      ((c.ph || (f && f.own)) ? ' ok' : '') + '" data-bkcam="' + esc(c.id) + '"' +
      (f ? ' data-bkcamk="' + esc(c.k) + '"' : '') + (busy ? ' disabled' : '') +
      ' title="' + (busy ? 'Finding a photo…' : (f ? 'Add a photo — choose a file, or find it on the agency site (' + say + ')'
        : 'Add a photo — choose a file')) + '" aria-label="Add a photo">' + CAMGLYPH + '</button>' +
    '</span>' + bkFoldTab(c) + '<button type="button" class="bkopen" data-bkpic="' + esc(c.id) + '" title="Open ' +
    'everything for this booking">open →</button></div>';
}
function bkLinked(c, part){
  const linked = /^https?:/i.test(c.k || '');
  let f = null;
  if(linked){ try{ f = litFacts(bkModel(c)); }catch(e){ f = null; } }
  let out = '';
  /* The interest lamps sit in front of the name (bkNameCell), as on a Lumen card. */
  /* No separate profile link: the model's name above is already that link. */
  const g = (c.g === 'M' || c.g === 'F') ? c.g : ((f && f.g) || '?');
  /* Find Photo sits on its own, lower on the card, just above the booking details */
  if(part === 'photo')
    return f ? '<div class="bkphoto"><div class="lumenphotobar">' +
      '<button type="button" class="lumenphotoctl' +
      (PHOTO_FINDING.has(c.k) ? ' finding' : '') + '" data-findphoto="' + esc(c.k) + '"' +
      (PHOTO_FINDING.has(c.k) ? ' disabled' : '') + '>' +
      (PHOTO_FINDING.has(c.k) ? 'Finding Photo\u2026' : 'Find Photo') + '</button>' +
      '<span class="lumenphotostatus ' + (f.own ? 'ok' : '') + '">' +
      (f.own ? '\u2713 Photo saved'
             : ((PHOTO_STATUS.get(c.k) || {}).state === 'not-found'
                ? 'No retrievable agency photo' : 'Photo not saved')) +
      '</span></div></div>' : '';
  out += '<div class="bkchips">' + bkSexSeg(c, g) + (f ? (f.tier ? '<span class="tierchip" data-t="' + esc(f.tier) + '">' +
        esc(TIER[f.tier] || f.tier) + '</span>' : '') +
      (f.photo ? '<span class="pho" data-photo="' + esc(f.photo) + '" role="button" ' +
        'tabindex="0" title="Open the agency\u2019s photograph in a new tab">photo</span>'
        : '') : '') + '</div>';
  if(f){
    /* the board's own name ("models", "women") is not shown: the chips already say it */
    let ps = '';
    try{ ps = peerStrip(c.k); }catch(e){ ps = ''; }
    if(ps) out += '<div class="bkpeer">' + ps + '</div>';
  }
  return out;
}
/* The name on a booking card is the way back to the model, exactly as on a Lumen card:
   the lamp trio in front of it, and the name itself a link to her page on the agency
   site. The pencil turns it back into the field when the name needs correcting. */
const BKNMEDIT = new Set();
/* On a booking card the three lights are the card's own row, not the Lumen lamps: green
   is Completed, amber Processing, red Cancelled. The lit one says where the card sits;
   clicking another moves it there. The model's Lumen light is left exactly as it was. */
const BKLAMP = {done: 'g', proc: 'y', canc: 'r'};
const BKLAMPROW = {g: 'done', y: 'proc', r: 'canc'};
const BKLAMPT = {g: 'Completed', y: 'Processing', r: 'Cancelled'};
function bkLamps(c){
  const on = BKLAMP[bkStOf(c)];
  const one = v => '<i class="' + v + (v === on ? ' on' : '') + '" data-v="' + v + '" data-bklamp="' + esc(c.id) + '|' +
    BKLAMPROW[v] + '" role="button" tabindex="0" aria-pressed="' + (v === on) + '" aria-label="' + BKLAMPT[v] +
    '" title="' + BKLAMPT[v] + (v === on ? '' : ' \u2014 move this card here') + '"></i>';
  return '<span class="mk bkmk">' + one('g') + one('y') + one('r') + '</span>';
}
function bkNameCell(c, fld){
  const web = /^https?:/i.test(c.k || '');
  if(!web) return bkLamps(c) + fld('nm', 'bkf--nm', 'Name', c.nm);
  const lit = bkLamps(c);
  if(BKNMEDIT.has(c.id) || !String(c.nm || '').trim())
    return lit + fld('nm', 'bkf--nm', 'Name', c.nm);
  return lit +
    '<a class="rnm bknmlink lit lit-' + BKLAMP[bkStOf(c)] + '" data-ref="' + esc(c.k) + '" data-nm="' +
    esc(c.nm) + '" data-ag="' + esc(c.ag || '') + '" href="' + esc(c.k) +
    '" target="_blank" rel="noopener noreferrer" title="Open ' + esc(c.nm) +
    '’s page on the agency site">' + esc(c.nm) + '</a>' +
    '<button type="button" class="bknmed" data-bknmed="' + esc(c.id) +
    '" title="Edit the name" aria-label="Edit the name">✎</button>';
}
/* The Lumen card's second line - the agency in full weight (and the way to its site),
   the place after it, then the ways to reach them - on a booking card. The pencil opens
   the agency, city and country as fields; a card with no agency yet starts open. */
function bkWhoLine(c, fld){
  const edit = BKNMEDIT.has(c.id) || !String(c.ag || '').trim();
  const chips = '<span class="whochips">' + (c.ag ? ctsChip(c.ag, c.ag) : '') +
    bkIGRow(c).replace(/^<div class="bkig">/, '').replace(/<\/div>$/, '') + '</span>';
  if(edit)
    return fld('ag', 'bkf--ag', 'Mother agency', c.ag) +
      fld('city', 'bkf--pl', 'City', c.city) +
      fld('country', 'bkf--pl', 'Country', c.country) +
      '<div class="litwho bkwhol">' + chips + '</div>';
  const place = [c.city, c.country].filter(Boolean).join(' \u00b7 ');
  const dom = domOf(c.ag);
  return '<div class="litwho bkwhol"><span class="bkagl">' +
    (dom ? '<a class="agnm" href="https://' + esc(dom) + '" target="_blank" ' +
      'rel="noopener noreferrer" title="Open ' + esc(c.ag) + ' \u2014 ' + esc(dom) +
      '">' + esc(c.ag) + '</a>' : '<b class="agnm" title="' + esc(c.ag) + '">' + esc(c.ag) + '</b>') +
    (place ? '<span class="agloc" title="' + esc(place) + '">' + esc(place) + '</span>' : '') +
    '<button type="button" class="bknmed" data-bknmed="' + esc(c.id) + '" data-f="ag" ' +
    'title="Edit agency, city and country" aria-label="Edit agency, city and country">' +
    '\u270e</button></span>' + chips + '</div>';
}
function bkIGRow(c){
  /* igClean, not igBare, so the chip reads exactly as it does on Lumen */
  const h = igClean(c.ig);
  if(h)
    return '<div class="bkig"><a class="igc" href="' + esc(igURL(h)) + '" ' +
      'target="_blank" rel="noopener noreferrer" data-igbk="' + esc(c.id) + '" ' +
      'title="' + esc(igHandle(h)) + ' on Instagram">' + IGGLYPH +
      '<span>' + esc(igHandle(h)) + '</span>' +
      '<i class="igset" role="button" tabindex="0" title="Change this handle" ' +
      'aria-label="Change this handle">\u270e</i></a></div>';
  return '<div class="bkig"><span class="igc none" role="button" tabindex="0" ' +
    'data-igbk="' + esc(c.id) + '" title="No handle on file \u2014 click to type ' +
    'one in">' + IGGLYPH + '<span>add ig</span>' +
    '<i class="igset" aria-hidden="true">\u270e</i></span></div>';
}
/* A stage is where the paperwork for that stage lives: the signed contract under
   Contract, the visa letter under Visa, the ticket under Flight. The files ride on the
   page's own store, the same one the photographs use, so everyone on the board opens
   the same document rather than hunting through an inbox for it. */
/* There is no fixed number of attachments. The real ceiling is the card's document in
   the store, which holds 256 KiB, and a file costs about 180 bytes of it - so a card
   takes something over a thousand files before it is full. BKSHOW is only how many are
   drawn before the shelf offers to show the rest; it hides nothing. */
const BKDOCMAX = 200 * 1024;         // leaves room for notes alongside the files
/* The asset store takes a closed list of types - pictures, video, PDF, fonts and a few
   kinds of text - and refuses everything else. A booking runs on the refused half:
   contracts in Word, decks, zips a mother agency sends. So anything off the list is
   carried inside a type the store does accept, as JSON holding the bytes, and unpacked
   again on the way out. Nothing about the file changes; only how it travels. */
const ATTNATIVE = {'image/png': 1, 'image/jpeg': 1, 'image/gif': 1, 'image/webp': 1,
  'image/svg+xml': 1, 'video/mp4': 1, 'video/webm': 1, 'application/pdf': 1,
  'font/woff2': 1, 'font/woff': 1, 'font/ttf': 1, 'font/otf': 1,
  'text/csv': 1, 'text/markdown': 1, 'application/json': 1, 'text/plain': 1};
/* What a browser reports is not to be trusted - a .csv picked on Windows arrives as an
   Excel type - so the extension decides when it can. */
const ATTEXT = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm',
  pdf: 'application/pdf', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf',
  otf: 'font/otf', csv: 'text/csv', md: 'text/markdown', json: 'application/json',
  txt: 'text/plain'};
const extOf = n => {
  const m = String(n || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
};
/* Files the host will write to disk one at a time. Anything else goes out in a zip,
   which it always accepts - so every file can come back, whatever it is. */
const DLEXT = {gif: 1, png: 1, jpg: 1, jpeg: 1, webp: 1, mp4: 1, webm: 1, txt: 1,
  json: 1, md: 1, docx: 1, pptx: 1, epub: 1, csv: 1, ttf: 1, html: 1, svg: 1,
  pdf: 1, xlsx: 1, zip: 1};
const B64 = buf => {
  const u = new Uint8Array(buf);
  let out = '';
  /* in slices, or a long file blows the argument limit */
  for(let i = 0; i < u.length; i += 0x8000)
    out += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(out);
};
const UNB64 = str => {
  const bin = atob(String(str || ''));
  const u = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
};
/* Base64 costs a third again in size, and the store stops at 20MB either way. */
const ATTWRAPMAX = 14 * 1024 * 1024;
/* The page gets a fixed amount of room for files and no way to ask for more from in
   here - so the least it can do is say where the room went, and give back the part
   that is being wasted. */
let STO = null, STOBUSY = '';
async function stoRead(){
  if(!ASSETS || !ASSETS.list){ STO = {err: 'unavailable'}; return STO; }
  try{
    const r = await ASSETS.list();
    STO = {assets: (r && r.assets) || [], usage: (r && r.usage) || {}};
  }catch(e){ STO = {err: (e && e.code) || 'failed'}; }
  return STO;
}
/* Everything this page can still account for. Anything else is either from a chat
   message older than the history held here, or genuinely nobody's. */
function stoHeld(){
  const att = new Set(), pics = new Set(), cards = new Set(), chat = new Set();
  for(const c of BOOK.values()){
    if(c && c.ph) cards.add(c.ph);
    const sec = (c && c.s) || {};
    for(const k in sec)
      for(const a of (((sec[k] || {}).f) || [])) for(const x of attIds(a)) att.add(x);
  }
  for(const v of PICS.values()) if(v) pics.add(v);
  for(const r of CHAT) for(const a of ((r && r.a) || [])) if(a && a.i) chat.add(a.i);
  for(const a of CHATATT) if(a && a.i) chat.add(a.i);
  return {att: att, pics: pics, cards: cards, chat: chat};
}
function stoSplit(){
  if(!STO || STO.err || !STO.assets) return null;
  const h = stoHeld();
  const sum = {att: [0, 0], pics: [0, 0], cards: [0, 0], chat: [0, 0], odd: [0, 0]};
  const odd = [];
  for(const a of STO.assets){
    const b = a.sizeBytes || 0;
    const w = h.att.has(a.id) ? 'att' : h.pics.has(a.id) ? 'pics'
            : h.cards.has(a.id) ? 'cards' : h.chat.has(a.id) ? 'chat' : 'odd';
    sum[w][0]++; sum[w][1] += b;
    if(w === 'odd') odd.push(a);
  }
  return {sum: sum, odd: odd};
}
async function stoDrop(ids, label){
  if(!ASSETS || !ASSETS.delete || !ids.length) return;
  STOBUSY = label; stoPaint();
  let n = 0;
  for(const id of ids){
    try{ await ASSETS.delete(id); n++; }catch(e){}
  }
  STOBUSY = '';
  await stoRead();
  stoPaint();
  return n;
}
/* The saved agency photographs are the one block that can always go: every one of them
   can be fetched again with Find Photo, so clearing them costs nothing but a re-fetch. */
async function stoClearPics(){
  const ids = [...PICS.values()].filter(Boolean);
  if(!ids.length) return;
  PICS.clear();
  if(DB && SIGNED()){
    const shards = new Set();
    for(let i = 0; i < 128; i++) shards.add(i);
    for(const sid of shards){ try{ await DB.doc('photos/' + sid).set({e: {}}); }catch(e){} }
  }
  try{ renderLit(); }catch(e){}
  await stoDrop(ids, 'pics');
}
const shmodal = document.getElementById('shmodal');
let SHEET = '';
function shParts(){
  const bits = String(SHEET).split('|');
  const c = BOOK.get(bits[0]);
  if(!c) return null;
  const k = bits[1], bin = bits[2] || '';
  const st = ((c.s || {})[k] || {});
  const all = (Array.isArray(st.f) ? st.f : []).filter(a => a && attOK(a.i));
  const mine = bin ? all.filter(a => binOf(a) === bin) : all;
  const label = (BKSEC.find(x => x[0] === k) || [k, k])[1] +
    (bin ? ' \u00b7 ' + (BINNAME[bin] || bin) : '');
  return {c: c, k: k, bin: bin, files: mine, label: label};
}
function shPaint(){
  if(!shmodal || shmodal.dataset.on !== '1') return;
  const p = shParts();
  if(!p){ shClose(); return; }
  const find = String(BKFIND.get(SHEET) || '').trim().toLowerCase();
  const hits = find
    ? p.files.filter(a => String(a.n || '').toLowerCase().indexOf(find) >= 0)
    : p.files;
  shmodal.innerHTML = '<div class="shbox" role="dialog" aria-modal="true" aria-label="' +
    esc(p.label) + '"><div class="shhd"><h3>' + esc(p.c.nm || '(unnamed)') +
    '</h3><s>' + esc(p.label.toUpperCase()) + '</s><s>' +
    (find ? hits.length + ' of ' + p.files.length : String(p.files.length)) +
    (p.files.length === 1 ? ' file' : ' files') + '</s>' +
    '<input class="bkfindi" data-bkfind="' + esc(SHEET) + '" value="' +
    esc(BKFIND.get(SHEET) || '') + '" placeholder="find by name\u2026" ' +
    'aria-label="Find a file by name">' +
    '<span class="shsp"></span>' +
    '<button type="button" class="bkatt bkatt--dl" data-bkdlb="' + esc(SHEET) + '">' +
    DLSVG + '<span>download all</span><s>' + p.files.length + '</s></button>' +
    '<span class="bkdlsay bkdlsay--in" role="status" data-bksay="' +
    esc(String(SHEET).split('|').slice(1).join('|')) + '"></span>' +
    '<button type="button" class="ctbx" data-shclose="1" aria-label="Close">\u00d7</button>' +
    '</div><div class="shbody">' +
    (hits.length
      ? '<div class="shgrid">' +
        hits.map(a => bkChip(a, p.c.id + '|' + p.k)).join('') + '</div>'
      : '<p class="shnone">' + (find ? 'Nothing by that name.' : 'Nothing here yet.') +
        '</p>') +
    '</div></div>';
}
function shOpen(key){
  if(!shmodal) return;
  SHEET = key;
  shmodal.dataset.on = '1';
  document.body.style.overflow = 'hidden';
  shPaint();
}
function shClose(){
  if(!shmodal) return;
  shmodal.dataset.on = '0';
  shmodal.innerHTML = '';
  SHEET = '';
  document.body.style.overflow = '';
  try{ renderBook(); }catch(e){}
}
shmodal.addEventListener('click', async e => {
  if(e.target === shmodal || e.target.closest('[data-shclose]')){ shClose(); return; }
  const p = shParts();
  if(!p) return;
  const dlb = e.target.closest('[data-bkdlb]');
  if(dlb){ const b = String(dlb.dataset.bkdlb).split('|');
           bkBundle(b[0], b[1], b[2] || ''); return; }
  const fdel = e.target.closest('[data-bkfdel]');
  if(fdel){
    if(!SIGNED()){ nudgeSignIn(); return; }
    const bits = String(fdel.dataset.bkfdel).split('|');
    await bkDropFile(bits[0], bits[1], bits.slice(2).join('|'));
    shPaint();
    return;
  }
  const get = e.target.closest('[data-bkget]');
  if(get && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && DOWN){
    e.preventDefault();
    bkOne(p.c.id, get.dataset.bkget, get.dataset.bkgetn || 'file',
          p.k + (p.bin ? '|' + p.bin : ''), get.dataset.bkw === '1');
  }
});
let SHFINDT = 0;
shmodal.addEventListener('input', e => {
  const el = e.target;
  if(!el || !el.dataset || !el.dataset.bkfind) return;
  const key = el.dataset.bkfind, v = el.value, at = el.selectionStart;
  if(String(v).trim()) BKFIND.set(key, v); else BKFIND.delete(key);
  clearTimeout(SHFINDT);
  SHFINDT = setTimeout(() => {
    shPaint();
    const back = shmodal.querySelector('.bkfindi');
    if(back){ back.focus(); try{ back.setSelectionRange(at, at); }catch(err){} }
  }, 180);
});
const stomodal = document.getElementById('stomodal');
function stoPaint(){
  if(!stomodal || stomodal.dataset.on !== '1') return;
  const u = (STO && STO.usage) || {};
  const sp = stoSplit();
  const pct = u.maxBytes ? Math.min(100, Math.round(u.bytes / u.maxBytes * 100)) : 0;
  const row = (lab, pair, note) => '<div class="storow"><b>' + lab +
    (note ? ' <span style="color:var(--faint);font-weight:400">' + note + '</span>' : '') +
    '</b><s>' + pair[0] + (pair[0] === 1 ? ' file' : ' files') + '</s><s>' +
    sizeStr(pair[1]) + '</s></div>';
  const body = (STO && STO.err)
    ? '<p class="stonote">The file store did not answer (' + esc(STO.err) + '). ' +
      'Reload the page and try again.</p>'
    : '<div class="stobar' + (pct >= 90 ? ' full' : '') + '"><i style="width:' + pct +
      '%"></i></div>' +
      '<div class="storow" style="border-top:0"><b>In use</b><s>' +
      (u.files || 0) + ' of ' + (u.maxFiles || '?') + ' files</s><s>' +
      sizeStr(u.bytes || 0) + ' of ' + sizeStr(u.maxBytes || 0) + '</s></div>' +
      (sp
        ? row('Booking attachments', sp.sum.att) +
          row('Card photographs', sp.sum.cards) +
          row('Saved agency photographs', sp.sum.pics, '\u2014 can be fetched again') +
          row('Chat attachments', sp.sum.chat) +
          row('Unaccounted', sp.sum.odd, '\u2014 nothing on this page points at them')
        : '') +
      '<div class="stoact">' +
      (sp && sp.sum.pics[0]
        ? '<button type="button" class="stob stob--rm" data-sto="pics"' +
          (STOBUSY ? ' disabled' : '') + '>' +
          (STOBUSY === 'pics' ? 'clearing\u2026' : 'Clear agency photographs \u2014 ' +
            sizeStr(sp.sum.pics[1])) + '</button>' : '') +
      (sp && sp.sum.odd[0]
        ? '<button type="button" class="stob stob--rm" data-sto="odd"' +
          (STOBUSY ? ' disabled' : '') + '>' +
          (STOBUSY === 'odd' ? 'deleting\u2026' : 'Delete unaccounted \u2014 ' +
            sizeStr(sp.sum.odd[1])) + '</button>' : '') +
      '<button type="button" class="stob" data-sto="again"' +
      (STOBUSY ? ' disabled' : '') + '>Re-read</button></div>' +
      '<div class="stosw"><label><input type="checkbox" id="stoshrink"' +
      (ATTSHRINK ? ' checked' : '') + '> Shrink photographs on the way in</label></div>' +
      '<p class="stonote">A photograph over 400KB is resized to 2400px down the long ' +
      'edge and saved at good quality \u2014 usually a fifth the size, and the original ' +
      'is kept whenever it is already smaller. Contracts, PDFs and zips are never ' +
      'touched.</p>' +
      '<p class="stonote"><b>Unaccounted</b> files are ones no card, photograph or ' +
      'loaded message refers to. Chat older than the history held here is not loaded, ' +
      'so a very old chat attachment can show up in this line \u2014 worth knowing ' +
      'before clearing it.</p>' +
      '<p class="stonote">The page cannot give itself more room. When the ceiling is ' +
      'genuinely reached, the <b>Request a higher limit</b> link on the storage notice ' +
      'is the way to raise it.</p>';
  stomodal.innerHTML = '<div class="ctbox" role="dialog" aria-modal="true" ' +
    'aria-label="File storage"><div class="ctbhd"><h3>File storage</h3><s>' +
    (u.maxBytes ? sizeStr(u.bytes || 0) + ' of ' + sizeStr(u.maxBytes) : 'reading\u2026') +
    '</s><button type="button" class="ctbx" data-stoclose="1" aria-label="Close">\u00d7' +
    '</button></div><div class="ctbbody">' + body + '</div></div>';
}
async function stoOpen(){
  if(!stomodal) return;
  stomodal.dataset.on = '1';
  document.body.style.overflow = 'hidden';
  stoPaint();
  await stoRead();
  stoPaint();
  try{ renderBook(); }catch(e){}
}
function stoClose(){
  if(!stomodal) return;
  stomodal.dataset.on = '0';
  stomodal.innerHTML = '';
  document.body.style.overflow = '';
}
document.addEventListener('click', async e => {
  if(e.target.closest && e.target.closest('#stoopen')){ stoOpen(); return; }
  if(!stomodal || stomodal.dataset.on !== '1') return;
  if(e.target.closest('[data-stoclose]') || e.target === stomodal){ stoClose(); return; }
  const b = e.target.closest('[data-sto]');
  if(!b || STOBUSY) return;
  const what = b.dataset.sto;
  if(what === 'again'){ await stoRead(); stoPaint(); try{ renderBook(); }catch(e2){} return; }
  if(what === 'pics'){ await stoClearPics(); try{ renderBook(); }catch(e2){} return; }
  if(what === 'odd'){
    const sp = stoSplit();
    if(sp) await stoDrop(sp.odd.map(a => a.id), 'odd');
    try{ renderBook(); }catch(e2){}
  }
});
document.addEventListener('change', e => {
  if(!e.target || e.target.id !== 'stoshrink') return;
  ATTSHRINK = !!e.target.checked;
  try{ localStorage.setItem('illum.shrink', ATTSHRINK ? '1' : '0'); }catch(err){}
});
document.addEventListener('keydown', e => {
  if(e.key !== 'Escape') return;
  if(shmodal && shmodal.dataset.on === '1'){ shClose(); return; }
  if(stomodal && stomodal.dataset.on === '1') stoClose();
});
/* A camera gives 6MB a frame and the store has a fixed budget. A book sent to a client
   is looked at on a screen, so 2400px down the long edge at good quality is the same
   picture at a fifth the size - and whichever comes out smaller is the one kept. Only
   photographs are touched; a PDF, a contract, a zip goes up exactly as it is. */
let ATTSHRINK = true;
try{ ATTSHRINK = localStorage.getItem('illum.shrink') !== '0'; }catch(e){}
const SHRINKABLE = {'image/jpeg': 1, 'image/webp': 1};
const SHRINKMAX = 2400, SHRINKFROM = 400 * 1024;
function shrinkPic(f){
  return new Promise(res => {
    if(!ATTSHRINK || !SHRINKABLE[String(f.type || '')] || f.size < SHRINKFROM)
      return res(null);
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      try{
        const long = Math.max(img.naturalWidth, img.naturalHeight);
        if(!long){ URL.revokeObjectURL(url); return res(null); }
        const k = long > SHRINKMAX ? SHRINKMAX / long : 1;
        const w = Math.max(1, Math.round(img.naturalWidth * k));
        const h = Math.max(1, Math.round(img.naturalHeight * k));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const cx = cv.getContext('2d');
        cx.drawImage(img, 0, 0, w, h);
        cv.toBlob(b => {
          URL.revokeObjectURL(url);
          /* no gain, no change - the original wins ties */
          if(!b || b.size >= f.size) return res(null);
          res(new File([b], String(f.name || 'photo').replace(/\.[^.]*$/, '') + '.jpg',
                       {type: 'image/jpeg'}));
        }, 'image/jpeg', 0.82);
      }catch(e){ URL.revokeObjectURL(url); res(null); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  });
}
async function attPut(f0, keep){
  let f = f0;
  let saved = 0;
  if(!keep){
    try{
      const small = await shrinkPic(f0);
      if(small){ saved = f0.size - small.size; f = small; }
    }catch(e){}
  }
  const ext = extOf(f.name);
  const native = keep === 2 ? '' : (ATTEXT[ext] || (ATTNATIVE[String(f.type || '')] ? f.type : ''));
  if(native){
    const res = await ASSETS.upload(f, {type: native});
    if(!res || !res.id) throw new Error('no id');
    const rec = {i: res.id, n: String(f.name || 'file').slice(0, 90),
                 t: native, s: f.size || 0};
    if(saved > 0){ rec.o = f0.size; rec.n = String(f0.name || rec.n).slice(0, 90); }
    return rec;
  }
  /* Nothing the store takes is bigger than 20MB, and a book zipped is often far
     bigger than that. So a large file is cut into pieces, each piece carried the same
     way, and the pieces are put back together on the way out. The file is unchanged;
     only the journey is in stages. */
  const nm = String(f.name || 'file').slice(0, 120);
  const ty = String(f.type || '') || 'application/octet-stream';
  const buf = new Uint8Array(await f.arrayBuffer());
  const parts = Math.max(1, Math.ceil(buf.length / ATTWRAPMAX));
  const ids = [];
  try{
    for(let i = 0; i < parts; i++){
      const slice = buf.subarray(i * ATTWRAPMAX, Math.min(buf.length, (i + 1) * ATTWRAPMAX));
      const body = JSON.stringify({v: 1, n: nm, t: ty, p: i, of: parts, b64: B64(slice)});
      const res = await ASSETS.upload(new Blob([body], {type: 'application/json'}),
                                      {type: 'application/json'});
      if(!res || !res.id) throw new Error('no id');
      ids.push(res.id);
      if(parts > 1) bkPartSay(i + 1, parts, nm);
    }
  }catch(err){
    /* a part that never arrived leaves nothing behind */
    for(const id of ids){ try{ await ASSETS.delete(id); }catch(e){} }
    throw err;
  }
  const rec = {i: ids[0], n: String(f.name || 'file').slice(0, 90), t: ty,
               s: f.size || 0, w: 1};
  if(parts > 1){ rec.w = 2; rec.ids = ids; }
  return rec;
}
/* where to say "part 3 of 11" while a long upload runs */
let BKPARTFOR = '';
function bkPartSay(i, n, nm){
  if(!BKPARTFOR) return;
  const bits = String(BKPARTFOR).split('|');
  bkSay(bits[0], nm + ' \u2014 part ' + i + ' of ' + n, bits.slice(1).join('|'));
}
/* Every asset a record stands on, so removing it removes all of them. */
const attIds = a => (a && a.w === 2 && Array.isArray(a.ids) && a.ids.length)
  ? a.ids.slice() : (a && a.i ? [a.i] : []);
/* The chip carries an id, not the record. A file in several pieces knows where its
   other pieces are only from the record, so look it up rather than rebuild it - a
   rebuilt one saved the first piece and called it the file. */
function attFind(bid, k, id){
  const c = BOOK.get(bid);
  if(!c) return null;
  const st = ((c.s || {})[k] || {});
  for(const a of (Array.isArray(st.f) ? st.f : [])) if(a && a.i === id) return a;
  return null;
}
/* Back out again: the real bytes, whichever way they went in. */
async function attGet(a){
  if(a && a.w === 2 && Array.isArray(a.ids) && a.ids.length){
    const parts = [];
    let n = 0;
    for(const id of a.ids){
      const r = await fetch('/_blob/' + encodeURIComponent(id));
      if(!r.ok) throw new Error('HTTP ' + r.status);
      const j = JSON.parse(await r.text());
      const u = UNB64(j && j.b64);
      parts.push(u); n += u.length;
    }
    const out = new Uint8Array(n);
    let at = 0;
    for(const p of parts){ out.set(p, at); at += p.length; }
    return out;
  }
  const r = await fetch('/_blob/' + encodeURIComponent(a.i));
  if(!r.ok) throw new Error('HTTP ' + r.status);
  if(!a || !a.w) return new Uint8Array(await r.arrayBuffer());
  const j = JSON.parse(await r.text());
  return UNB64(j && j.b64);
}
/* A folder is not a file and no browser will upload one. What it will give is a walk
   of what is inside, so a dropped or picked folder is zipped here, in the page, and
   attached as one thing - which is also how it comes back out. */
const TRASHSVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path d="M4 7h16M10 7V5h4v2M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>';
const FLDSVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
const dirRead = r => new Promise(res => {
  const all = [];
  /* readEntries hands back a page at a time and an empty page means the end */
  const step = () => { try{ r.readEntries(list => {
    if(!list || !list.length) return res(all);
    for(const e of list) all.push(e);
    step();
  }, () => res(all)); }catch(e){ res(all); } };
  step();
});
const entryFile = en => new Promise((res, rej) => { try{ en.file(res, rej); }catch(e){ rej(e); } });
async function dirWalk(en, base, into, guard){
  if(guard.n > 2000 || base.length > 400) return;
  const kids = await dirRead(en.createReader());
  for(const k of kids){
    const path = base + k.name;
    if(k.isFile){
      guard.n++;
      try{ into.push({path: path, file: await entryFile(k)}); }catch(e){}
    }else if(k.isDirectory) await dirWalk(k, path + '/', into, guard);
  }
}
async function foldZip(name, got){
  const entries = [];
  for(const g of got){
    try{ entries.push({name: g.path, bytes: new Uint8Array(await g.file.arrayBuffer())}); }
    catch(e){}
  }
  if(!entries.length) return null;
  const blob = zipStore(entries);
  return new File([blob], zipSafe(name || 'folder') + '.zip', {type: 'application/zip'});
}
/* Entries have to be taken from the event while it is still the event, so this is
   called first and awaited after. */
function dropEntries(dt){
  const out = [];
  const items = dt && dt.items;
  if(!items) return out;
  for(let i = 0; i < items.length; i++){
    const it = items[i];
    let en = null;
    try{ en = it && it.webkitGetAsEntry ? it.webkitGetAsEntry() : null; }catch(e){ en = null; }
    if(en) out.push(en);
  }
  return out;
}
async function dropToFiles(ens, plain){
  if(!ens.some(e => e && e.isDirectory)) return plain;
  const out = [];
  for(const en of ens){
    if(en.isFile){ try{ out.push(await entryFile(en)); }catch(e){} }
    else if(en.isDirectory){
      const got = [], guard = {n: 0};
      await dirWalk(en, '', got, guard);
      const f = await foldZip(en.name, got);
      if(f) out.push(f);
    }
  }
  return out.length ? out : plain;
}
/* The folder picker hands back a flat list, each file remembering the path it came
   from; group them back into the folders they were in. */
async function pickedFolders(list){
  const groups = new Map();
  const loose = [];
  for(const f of list){
    const rel = String(f.webkitRelativePath || '');
    if(!rel || rel.indexOf('/') < 0){ loose.push(f); continue; }
    const cut = rel.indexOf('/');
    const top = rel.slice(0, cut), rest = rel.slice(cut + 1);
    if(!groups.has(top)) groups.set(top, []);
    groups.get(top).push({path: rest, file: f});
  }
  const out = loose.slice();
  for(const [name, got] of groups){
    const f = await foldZip(name, got);
    if(f) out.push(f);
  }
  return out;
}
/* Every country there is, so a place typed on a card is the same place on every other
   card - and so the field can finish the word. Spellings people actually type are
   folded onto the one the list holds. */
const WORLD = 'Afghanistan|Albania|Algeria|Andorra|Angola|Antigua and Barbuda|Argentina|Armenia|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bhutan|Bolivia|Bosnia and Herzegovina|Botswana|Brazil|Brunei|Bulgaria|Burkina Faso|Burundi|Cambodia|Cameroon|Canada|Cape Verde|Central African Republic|Chad|Chile|China|Colombia|Comoros|Congo|Costa Rica|Croatia|Cuba|Cyprus|Czechia|Democratic Republic of the Congo|Denmark|Djibouti|Dominica|Dominican Republic|Ecuador|Egypt|El Salvador|Equatorial Guinea|Eritrea|Estonia|Eswatini|Ethiopia|Fiji|Finland|France|Gabon|Gambia|Georgia|Germany|Ghana|Greece|Grenada|Guatemala|Guinea|Guinea-Bissau|Guyana|Haiti|Honduras|Hong Kong|Hungary|Iceland|India|Indonesia|Iran|Iraq|Ireland|Israel|Italy|Ivory Coast|Jamaica|Japan|Jordan|Kazakhstan|Kenya|Kiribati|Kosovo|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|Lesotho|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Macau|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Marshall Islands|Mauritania|Mauritius|Mexico|Micronesia|Moldova|Monaco|Mongolia|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nauru|Nepal|Netherlands|New Zealand|Nicaragua|Niger|Nigeria|North Korea|North Macedonia|Norway|Oman|Pakistan|Palau|Palestine|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Poland|Portugal|Puerto Rico|Qatar|Romania|Russia|Rwanda|Saint Kitts and Nevis|Saint Lucia|Saint Vincent and the Grenadines|Samoa|San Marino|Sao Tome and Principe|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Slovakia|Slovenia|Solomon Islands|Somalia|South Africa|South Korea|South Sudan|Spain|Sri Lanka|Sudan|Suriname|Sweden|Switzerland|Syria|Taiwan|Tajikistan|Tanzania|Thailand|Timor-Leste|Togo|Tonga|Trinidad and Tobago|Tunisia|Turkey|Turkmenistan|Tuvalu|Uganda|Ukraine|United Arab Emirates|United Kingdom|United States|Uruguay|Uzbekistan|Vanuatu|Vatican City|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe'.split('|');
const CCALT = {usa: 'United States', us: 'United States',
  'united states of america': 'United States', america: 'United States',
  uk: 'United Kingdom', 'great britain': 'United Kingdom', britain: 'United Kingdom',
  england: 'United Kingdom', scotland: 'United Kingdom', wales: 'United Kingdom',
  uae: 'United Arab Emirates', emirates: 'United Arab Emirates',
  korea: 'South Korea', 'republic of korea': 'South Korea', rok: 'South Korea',
  'korea, south': 'South Korea', 'south korea': 'South Korea',
  'czech republic': 'Czechia', holland: 'Netherlands', 'the netherlands': 'Netherlands',
  "cote d'ivoire": 'Ivory Coast', 'côte d’ivoire': 'Ivory Coast',
  'cote divoire': 'Ivory Coast', turkiye: 'Turkey', 'türkiye': 'Turkey',
  'russian federation': 'Russia', 'viet nam': 'Vietnam', burma: 'Myanmar',
  swaziland: 'Eswatini', macedonia: 'North Macedonia', 'cabo verde': 'Cape Verde',
  'ivory coast': 'Ivory Coast', 'drc': 'Democratic Republic of the Congo',
  'hong kong sar': 'Hong Kong', 'p.r. china': 'China', prc: 'China'};
const CCKEY = v => String(v || '').trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\.$/, '');
const CCFIND = new Map();
for(const n of WORLD) CCFIND.set(CCKEY(n), n);
const ccOf = v => {
  const k = CCKEY(v);
  if(!k) return '';
  return CCFIND.get(k) || CCFIND.get(CCKEY(CCALT[k] || '')) || '';
};
/* "Tokyo, Japan" and "Japan, Tokyo" are the same visit written two ways, and a place
   the list has never heard of is still somewhere they went - it is kept as typed
   rather than thrown away. */
function beenParse(raw){
  const v = String(raw || '').replace(/\s+/g, ' ').trim();
  if(!v) return null;
  const parts = v.split(/\s*[,\u00b7|\/]\s*/).filter(Boolean);
  if(parts.length === 1){
    const c = ccOf(parts[0]);
    return c ? {c: c} : {c: parts[0].slice(0, 40)};
  }
  const a = ccOf(parts[0]), b = ccOf(parts[1]);
  if(b) return {c: b, t: parts[0].slice(0, 40)};
  if(a) return {c: a, t: parts.slice(1).join(', ').slice(0, 40)};
  return {c: parts[parts.length - 1].slice(0, 40),
          t: parts.slice(0, -1).join(', ').slice(0, 40)};
}
const beenList = c => (Array.isArray(c && c.bn) ? c.bn : [])
  .filter(x => x && x.c).map(x => ({c: String(x.c).slice(0, 40),
                                    t: String(x.t || '').slice(0, 40)}));
const beenSame = (a, b) => CCKEY(a.c) === CCKEY(b.c) && CCKEY(a.t || '') === CCKEY(b.t || '');
/* A model who has worked everywhere should not push her own measurements off the card,
   so the row keeps its height and says how many more there are. */
/* A date of birth is written a dozen ways and a card should take any of them: the
   Korean 2004.05.17, the European 17/05/2004, the written 17 May 2004. Where the day
   and the month could be either way round the day is read first, and the date is
   echoed back in words so a misreading shows itself at once. */
const MONS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const MONL = ['January','February','March','April','May','June','July','August',
              'September','October','November','December'];
function dobParse(v){
  const raw = String(v || '').trim();
  if(!raw) return null;
  let y = 0, m = 0, d = 0;
  const word = raw.toLowerCase().match(
    /^(?:(\d{1,2})\s+)?([a-z]{3,9})\.?\s+(?:(\d{1,2})\s*,?\s+)?(\d{4})$/);
  if(word){
    const mi = MONS.indexOf(word[2].slice(0, 3));
    if(mi < 0) return null;
    m = mi + 1; y = +word[4]; d = +(word[1] || word[3] || 0);
    if(!d) return null;
  }else{
    const n = raw.match(/^(\d{1,4})\s*[-./\s]\s*(\d{1,2})\s*[-./\s]\s*(\d{1,4})$/);
    if(!n) return null;
    const a = +n[1], b = +n[2], c3 = +n[3];
    if(n[1].length === 4){ y = a; m = b; d = c3; }            // 2004-05-17
    else if(n[3].length === 4){
      y = c3;
      if(a > 12 && b <= 12){ d = a; m = b; }                  // 17/05/2004
      else if(b > 12 && a <= 12){ m = a; d = b; }             // 05/17/2004
      else { d = a; m = b; }                                  // both could be - day first
    }else return null;
  }
  if(!(y >= 1900 && y <= 2100) || !(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if(dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d)
    return null;                                              // 31 February and friends
  return {y: y, m: m, d: d};
}
const dobWords = p => p ? (p.d + ' ' + MONL[p.m - 1] + ' ' + p.y) : '';
/* every date on the booking view is shown one way: DD/MM/YYYY */
function dmy(v){
  const raw = String(v == null ? '' : v).trim();
  if(!raw) return '';
  const p = dobParse(/^\d{4}-\d{2}-\d{2}T/.test(raw) ? raw.slice(0, 10) : raw);
  const z = n => (n < 10 ? '0' : '') + n;
  return p ? z(p.d) + '/' + z(p.m) + '/' + p.y : raw;
}
/* a word typed in capitals (BLACK) reads as a word (Black) */
const capWord = v => { const t = String(v == null ? '' : v);
  return /[A-Z]/.test(t) && !/[a-z]/.test(t) && t.length > 1
    ? t.replace(/\S+/g, w => w.charAt(0) + w.slice(1).toLowerCase()) : t; };
function ageFrom(v){
  const p = dobParse(v);
  if(!p) return '';
  const now = new Date();
  let a = now.getFullYear() - p.y;
  const had = (now.getMonth() + 1 > p.m) ||
              (now.getMonth() + 1 === p.m && now.getDate() >= p.d);
  if(!had) a--;
  return (a >= 0 && a < 120) ? a : '';
}
const BNSHOW = 4;
const BNMORE = new Set();
/* A book is 700 photographs and a list of 700 lines is not a book, it is a scroll.
   Shown as plates they read the way contact sheets always have - six to a row, the
   picture doing the naming - and the tray keeps its own height so the card underneath
   stays reachable. The list is still there for paperwork, where the name is the thing. */
let ATTVIEW = 'grid';
try{ ATTVIEW = localStorage.getItem('illum.attview') === 'list' ? 'list' : 'grid'; }catch(e){}
const GRIDSVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>';
const LISTSVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path d="M4 6h16M4 12h16M4 18h16"/></svg>';
const BKFIND = new Map();            // tray key -> what is typed in its find box
const BKSHOW = 12;
const BKSHOWG = 36;                  // plates are small; more of them fit before folding
const BKFINDFROM = 18;               // a find box earns its place past this many
const BKMORE = new Set();            // "<bid>|<stage>|<bin>" while a shelf is expanded
const bkDocFits = c => { try{ return JSON.stringify(c).length <= BKDOCMAX; }
                         catch(e){ return true; } };
const BKUP = new Set();                       // "<bid>|<stage>|<bin>" while a file goes up
let bkWipe = '';                              // the tray whose delete-all is armed
/* What arrives from a mother agency by email is not one kind of thing: the book, the
   digitals, and the video are three separate asks and get answered separately. So the
   Email stage keeps three shelves rather than one pile. Every other stage takes one
   pile, because a visa letter is a visa letter. */
const BKBINS = [['book', 'Book'], ['snaps', 'Snaps'], ['vid', 'Videos']];
/* Email used to split its files onto Book / Snaps / Videos shelves. It is one tray now,
   like every other stage; files filed on a shelf before still show, all together. */
const binned = k => false;
const BINNAME = {book: 'Book', snaps: 'Snaps', vid: 'Videos'};
/* A file filed before the shelves existed sits on the first one. */
const binOf = a => (a && BINNAME[a.b]) ? a.b : 'book';
function bkChip(a, key){
  const url = '/_blob/' + encodeURIComponent(a.i);
  const nm = esc(String(a.n || 'file').slice(0, 90));
  const wrapped = a.w === 1;
  const img = !wrapped && String(a.t || '').toLowerCase().indexOf('image/') === 0;
  const vid = !wrapped && String(a.t || '').toLowerCase().indexOf('video/') === 0;
  const who = (a.by && PEOPLE.has(a.by)) ? PEOPLE.get(a.by).n : (a.by || '');
  const when = String(a.at || '').slice(0, 10);
  return '<span class="bkf1">' +
    /* a carried file is not at its own address, so it is a button, not a link */
    (wrapped ? '<button type="button" class="bkfl"' : '<a class="bkfl" href="' + url +
      '" target="_blank" rel="noopener noreferrer" download="' + nm + '"') +
    ' data-bkget="' + esc(a.i) + '" data-bkgetn="' + nm + '" ' +
    (wrapped ? 'data-bkw="1" ' : '') +
    'data-bkgett="' + esc(String(a.t || '')) + '" data-bkgets="' + esc(sizeStr(a.s)) + '" ' +
    'data-bkgetw="' + esc([who, when].filter(Boolean).join(' \u00b7 ')) + '" ' +
    'title="' + nm + ' \u00b7 ' + esc(sizeStr(a.s)) + ' \u00b7 click to save">' +
    (img ? '<img src="' + url + '" alt="">' : vid ? VIDSVG : FILESVG) +
    '<span>' + nm + '</span><s>' + esc(sizeStr(a.s)) + '</s>' +
    (wrapped ? '</button>' : '</a>') +
    '<button type="button" class="bkfx" data-bkfdel="' + esc(key) + '|' + esc(a.i) +
    '" title="Remove this file" aria-label="Remove ' + nm + '">\u00d7</button></span>';
}
function bkAttBox(c, k, files, bin){
  const key = c.id + '|' + k + (bin ? '|' + bin : '');
  const busy = BKUP.has(key);
  const open = BKMORE.has(key);
  const grid = ATTVIEW === 'grid';
  const find = String(BKFIND.get(key) || '').trim().toLowerCase();
  const hits = find
    ? files.filter(a => String(a.n || '').toLowerCase().indexOf(find) >= 0)
    : files;
  /* a search is a request to see what matches, so it opens the tray on its own */
  const cap = grid ? BKSHOWG : BKSHOW;
  const show = (open || find) ? hits.slice(0, 400) : hits.slice(0, cap);
  const rest = hits.length - show.length;
  const tall = show.length > (grid ? 18 : 8);
  return (files.length >= BKFINDFROM
    ? '<div class="bkfind"><input class="bkfindi" data-bkfind="' + esc(key) +
      '" value="' + esc(BKFIND.get(key) || '') + '" placeholder="find in ' +
      files.length + '\u2026" aria-label="Find a file by name">' +
      (find ? '<s>' + hits.length + ' of ' + files.length + '</s>' : '') + '</div>'
    : '') +
    '<div class="bkatts' + (grid ? ' bkatts--grid' : '') + (tall ? ' bkatts--tall' : '') +
    '" data-bkdrop-att="' + esc(key) + '">' +
    show.map(a => bkChip(a, c.id + '|' + k)).join('') +
    (find && !hits.length ? '<span class="bkfindno">nothing by that name</span>' : '') +
    '</div>' +
    '<div class="bkatts bkatts--tools">' +
    (rest > 0
      ? '<button type="button" class="bkmorebtn" data-bkmore="' + esc(key) + '">' +
        rest + ' more\u2026</button>'
      : ((open && hits.length > (grid ? BKSHOWG : BKSHOW))
        ? '<button type="button" class="bkmorebtn" data-bkmore="' + esc(key) + '">show fewer</button>'
        : '')) +
    (files.length > 12
      ? '<button type="button" class="bkatt bkatt--view" data-bksheet="' + esc(key) +
        '" title="Open all ' + files.length + ' across the whole window">' + GRIDSVG +
        '<span>open all ' + files.length + '</span></button>'
      : '') +
    (files.length > 3
      ? '<button type="button" class="bkatt bkatt--view" data-bkview="1" title="' +
        (grid ? 'Showing plates \u2014 switch to a list with names'
              : 'Showing a list \u2014 switch to plates') + '">' +
        (grid ? LISTSVG + '<span>list</span>' : GRIDSVG + '<span>plates</span>') +
        '</button>'
      : '') +
    '<button type="button" class="bkatt" data-bkatt="' + esc(key) + '"' +
    (busy ? ' disabled' : '') + '>' + CLIPSVG +
    '<span>' + (busy ? 'attaching\u2026' : 'attach') + '</span></button>' +
    '<button type="button" class="bkatt" data-bkfld="' + esc(key) + '"' +
    (busy ? ' disabled' : '') + ' title="Attach a whole folder \u2014 it is kept as one ' +
    'zip and comes back as one">' + FLDSVG + '<span>folder</span></button>' +
    /* The errand is usually one tray's worth - the book to the client, the visa pack
       to the embassy - so the control for taking it sits where the tray is. */
    '<button type="button" class="bkatt bkatt--rm' + (bkWipe === key ? ' arm' : '') +
      '"' + (files.length ? '' : ' disabled') + ' data-bkwipe="' + esc(key) + '" title="' +
      (!files.length ? 'Nothing here to delete yet'
        : bkWipe === key ? 'Click again to delete all ' + files.length + ' \u2014 this ' +
          'cannot be undone' : 'Delete every file here') + '">' + TRASHSVG +
      '<span>' + (bkWipe === key && files.length ? 'delete ' + files.length + '?'
        : 'delete all') + '</span>' +
      /* the armed label already carries the number; two of them reads as a typo */
      ((files.length && bkWipe !== key) ? '<s>' + files.length + '</s>' : '') + '</button>' +
    '<button type="button" class="bkatt bkatt--dl"' + (files.length ? '' : ' disabled') +
      ' data-bkdlb="' + esc(key) + '" title="' +
      (files.length ? 'Save ' + files.length + ' file' + (files.length === 1 ? '' : 's') +
        ' as one zip' : 'Nothing here to download yet') + '">' + DLSVG +
      '<span>download all</span>' +
      (files.length ? '<s>' + files.length + '</s>' : '') + '</button>' +
    '<span class="bkdlsay bkdlsay--in" role="status" data-bksay="' + esc(key) + '">' +
    esc(BKSAYQ.get(key) || '') + '</span>' +
    '</div>';
}
function bkAttTray(c, k, st){
  const all = (Array.isArray(st.f) ? st.f : []).filter(a => a && attOK(a.i));
  if(!binned(k)) return bkAttBox(c, k, all, '');
  return '<div class="bkbins">' + BKBINS.map(([bin, label]) => {
    const mine = all.filter(a => binOf(a) === bin);
    return '<div class="bkbin"><span class="bkbinl">' + label +
      (mine.length ? '<s>' + mine.length + '</s>' : '') + '</span>' +
      bkAttBox(c, k, mine, bin) + '</div>';
  }).join('') + '</div>';
}
/* The uploads are awaited first and merged afterwards, so a note typed while a big
   file is going up is not thrown away by the merge. */
async function bkAddFiles(bid, k, files, bin){
  const c = BOOK.get(bid);
  if(!c || !files || !files.length) return;
  if(!SIGNED()){ nudgeSignIn(); return; }
  if(!ASSETS){ ILLERR = 'this view has no asset store'; return; }
  if(binned(k) && !BINNAME[bin]) bin = 'book';     // a drop with no shelf named
  const key = bid + '|' + k + (binned(k) ? '|' + bin : '');
  const sayk = k + (binned(k) ? '|' + bin : '');
  BKUP.add(key);
  renderBook();
  const added = [];
  for(const f of files){
    if(!f) continue;
    if(f.size > ATTMAX){
      ILLERR = (f.name || 'that file') + ' is over 2GB';
      bkSay(bid, (f.name || 'That file') + ' is over 2GB', sayk);
      continue;
    }
    try{
      BKPARTFOR = key;
      bkTrace('attach ' + (f.name || '?') + ' ' + (f.size || 0) + 'B ' +
              (f.type || 'no type'));
      const one = await attPut(f);
      bkTrace('attach ok ' + (f.name || '?') +
              (one.w === 2 ? ' in ' + one.ids.length + ' parts' : ''));
      one.by = ME || '';
      one.at = new Date().toISOString();
      if(binned(k)) one.b = bin;
      added.push(one);
    }catch(e){
      /* Say what actually happened. "Would not go up" sent somebody hunting for a bug
         in the wrong place; a store with no room left says so. */
      const code = (e && e.code) || '';
      const nm = f.name || 'That file';
      const why = code === 'quota_or_state'
          ? 'there is no room left \u2014 open the files chip to free some'
        : code === 'too_large' ? 'it is too big for the store'
        : code === 'unsupported_type' ? 'the store refused the type'
        : code === 'rate_limited' ? 'too many at once \u2014 try again in a moment'
        : code === 'not_granted' ? 'this page is not allowed to store files'
        : code === 'upstream_auth' ? 'the store wants you to sign in again'
        : code === 'store_unavailable' ? 'the store is briefly unavailable'
        : ((e && e.message) || 'it was refused');
      ILLERR = 'upload ' + nm + ': ' + (code || (e && e.message) || 'refused');
      bkTrace('attach FAILED ' + nm + ' :: ' + (code || (e && e.message) || '?'));
      bkSay(bid, nm + ' \u2014 ' + why, sayk);
    }
  }
  BKUP.delete(key);
  BKPARTFOR = '';
  if(added.length){
    const had = (c.s && typeof c.s === 'object' && !Array.isArray(c.s)) ? c.s : {};
    const st = (had[k] && typeof had[k] === 'object') ? had[k] : {};
    /* Add them all, then step back one at a time only if the card's document would
       outgrow what the store holds. Nothing already filed is ever dropped. */
    const was = Array.isArray(st.f) ? st.f.slice() : [];
    let list = was.concat(added);
    let dropped = 0;
    while(list.length > was.length){
      const ns2 = Object.assign({}, had);
      ns2[k] = Object.assign({}, st, {f: list});
      if(bkDocFits(Object.assign({}, c, {s: ns2}))) break;
      list = list.slice(0, -1);
      dropped++;
    }
    if(dropped) ILLERR = 'this card is full \u2014 ' + dropped +
      ' file' + (dropped === 1 ? '' : 's') + ' would not fit';
    const ns = Object.assign({}, had);
    ns[k] = Object.assign({}, st, {f: list});
    c.s = ns;
    saveBook(bid, true);
  }
  renderBook();
}
/* Everything in one tray, gone - with a beat in between, because this one cannot be
   taken back. The assets go too, which is what gives the room back. */
/* Every file on the card, every stage, in one go. The photograph is left where it is:
   it is not paperwork, it has its own control, and losing it to a press meant for the
   documents would be a nasty surprise. */
async function bkWipeCard(bid){
  const c = BOOK.get(bid);
  if(!c) return;
  if(!SIGNED()){ nudgeSignIn(); return; }
  const had = (c.s && typeof c.s === 'object' && !Array.isArray(c.s)) ? c.s : {};
  const gone = [];
  const ns = Object.assign({}, had);
  for(const [k] of BKSEC){
    const st = (had[k] && typeof had[k] === 'object') ? had[k] : null;
    if(!st) continue;
    const f = Array.isArray(st.f) ? st.f : [];
    if(!f.length) continue;
    for(const a of f) gone.push(a);
    ns[k] = Object.assign({}, st, {f: []});
  }
  if(!gone.length) return;
  c.s = ns;
  saveBook(bid, true);
  renderBook();
  bkSay(bid, gone.length + ' file' + (gone.length === 1 ? '' : 's') + ' deleted', '');
  for(const a of gone)
    for(const x of attIds(a)){
      try{ if(ASSETS && ASSETS.delete) await ASSETS.delete(x); }catch(e){}
    }
}
async function bkWipeTray(bid, k, bin){
  const c = BOOK.get(bid);
  if(!c) return;
  if(!SIGNED()){ nudgeSignIn(); return; }
  const had = (c.s && typeof c.s === 'object' && !Array.isArray(c.s)) ? c.s : {};
  const st = (had[k] && typeof had[k] === 'object') ? had[k] : {};
  const all = Array.isArray(st.f) ? st.f : [];
  const mine = bin ? all.filter(a => a && binOf(a) === bin) : all.slice();
  const keep = bin ? all.filter(a => !(a && binOf(a) === bin)) : [];
  if(!mine.length) return;
  const ns = Object.assign({}, had);
  ns[k] = Object.assign({}, st, {f: keep});
  c.s = ns;
  saveBook(bid, true);
  renderBook();
  bkSay(bid, mine.length + ' file' + (mine.length === 1 ? '' : 's') + ' deleted',
        k + (bin ? '|' + bin : ''));
  for(const a of mine)
    for(const x of attIds(a)){
      try{ if(ASSETS && ASSETS.delete) await ASSETS.delete(x); }catch(e){}
    }
}
async function bkDropFile(bid, k, id){
  const c = BOOK.get(bid);
  if(!c) return;
  if(!SIGNED()){ nudgeSignIn(); return; }
  const had = (c.s && typeof c.s === 'object' && !Array.isArray(c.s)) ? c.s : {};
  const st = (had[k] && typeof had[k] === 'object') ? had[k] : {};
  const list = (Array.isArray(st.f) ? st.f : []).filter(a => a && a.i !== id);
  const ns = Object.assign({}, had);
  ns[k] = Object.assign({}, st, {f: list});
  c.s = ns;
  saveBook(bid, true);
  renderBook();
  /* every piece the record stood on, and only once each */
  const gone = (Array.isArray(st.f) ? st.f : []).find(a => a && a.i === id);
  for(const x of (gone ? attIds(gone) : [id])){
    try{ if(ASSETS && ASSETS.delete) await ASSETS.delete(x); }catch(e){}
  }
}
/* ---- taking the paperwork off the page ----
   One file is an ordinary link; the whole card is a zip, built here. A published page
   may not fetch a library, so the archive is written by hand - stored, not compressed,
   which is a legal zip every tool opens and the right choice anyway for a pile of
   photographs and PDFs that are already compressed. */
const CRCT = (function(){
  const t = new Uint32Array(256);
  for(let n = 0; n < 256; n++){
    let c = n;
    for(let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(u8){
  let c = 0xFFFFFFFF;
  for(let i = 0; i < u8.length; i++) c = CRCT[(c ^ u8[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function zipStore(entries){
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const d = new Date();
  const dosT = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) |
               ((d.getSeconds() / 2) & 31);
  const dosD = (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) |
               (d.getDate() & 31);
  for(const e of entries){
    const name = enc.encode(e.name);
    const body = e.bytes;
    const crc = crc32(body);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);          // version needed
    lh.setUint16(6, 0x0800, true);      // UTF-8 names
    lh.setUint16(8, 0, true);           // stored
    lh.setUint16(10, dosT, true); lh.setUint16(12, dosD, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, body.length, true); lh.setUint32(22, body.length, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, body);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, dosT, true); ch.setUint16(14, dosD, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, body.length, true); ch.setUint32(24, body.length, true);
    ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + body.length;
  }
  const cstart = offset;
  let csize = 0;
  for(const c of central) csize += c.length;
  const eo = new DataView(new ArrayBuffer(22));
  eo.setUint32(0, 0x06054b50, true);
  eo.setUint16(8, entries.length, true); eo.setUint16(10, entries.length, true);
  eo.setUint32(12, csize, true); eo.setUint32(16, cstart, true);
  return new Blob(parts.concat(central, [new Uint8Array(eo.buffer)]),
                  {type: 'application/zip'});
}
const zipSafe = s => String(s || 'file').replace(/[\\/:*?"<>|]+/g, '-')
  .replace(/\s+/g, ' ').trim().slice(0, 80) || 'file';
/* Everything on one card, foldered the way the card is laid out. */
async function bkBundle(bid, only, onlyBin){
  const c = BOOK.get(bid);
  if(!c) return;
  /* the tray that was pressed is the one that should report back - declared first,
     because the line below used it before it existed */
  const sayk = only ? only + (onlyBin ? '|' + onlyBin : '') : '';
  if(!DOWN){ ILLERR = 'this view cannot save files';
             bkSay(bid, 'Saving is not available here', sayk); return; }
  /* A card with nothing attached still has a photograph, and wrapping one picture in a
     zip named after the model made it look like a file the card was holding - something
     to go and find, and to delete, when there was nothing there at all. So hand over
     the picture itself, named for what it is. */
  if(!only){
    let att = 0;
    for(const [k] of BKSEC)
      att += (((c.s || {})[k] || {}).f || []).filter(a => a && attOK(a.i)).length;
    if(!att && c.ph && attOK(c.ph)){
      bkSay(bid, 'Saving the photograph\u2026', '');
      try{
        const r = await fetch('/_blob/' + encodeURIComponent(c.ph));
        if(!r.ok) throw new Error('HTTP ' + r.status);
        const blob = await r.blob();
        const ty = String(blob.type || '').toLowerCase();
        const ext = ty.indexOf('png') >= 0 ? 'png' : ty.indexOf('webp') >= 0 ? 'webp'
                  : ty.indexOf('gif') >= 0 ? 'gif' : 'jpg';
        const fn = zipSafe((c.nm || 'model') + (c.ag ? ' - ' + c.ag : '') +
          ' - photograph') + '.' + ext;
        await DOWN.save({filename: fn, data: blob});
        bkSay(bid, 'Photograph saved', '');
      }catch(e){
        const code = (e && e.code) || '';
        bkSay(bid, code === 'declined' ? 'Save cancelled'
          : 'The photograph would not save', '');
        ILLERR = 'photo save: ' + (code || (e && e.message) || 'failed');
      }
      return;
    }
  }
  const want = [];
  let onlyLabel = '';
  for(const [k, label] of BKSEC){
    if(only && k !== only) continue;
    if(only) onlyLabel = label + (onlyBin && BINNAME[onlyBin] ? ' ' + BINNAME[onlyBin] : '');
    const st = (c.s || {})[k] || {};
    for(const a of (st.f || [])){
      if(!a || !attOK(a.i)) continue;
      if(onlyBin && binned(k) && binOf(a) !== onlyBin) continue;
      /* taken on its own, a stage needs no folder of its own name - only the
         email shelves still mean something inside it */
      /* one shelf on its own needs no folder at all */
      const folder = (only ? '' : zipSafe(label) + (binned(k) ? '/' : '')) +
        ((binned(k) && !onlyBin) ? BINNAME[binOf(a)] : '');
      want.push({dir: folder, name: zipSafe(a.n), id: a.i, rec: a});
    }
  }
  if(!only && c.ph && attOK(c.ph))
    want.push({dir: 'Photograph', name: 'photograph.jpg', id: c.ph});
  if(!want.length){ bkSay(bid, 'Nothing attached here yet', sayk); return; }
  bkSay(bid, 'Collecting ' + want.length + ' file' +
    (want.length === 1 ? '' : 's') + '\u2026', sayk);
  const entries = [], seen = {};
  for(const w of want){
    try{
      const buf = await attGet(w.rec || {i: w.id});
      let nm = w.dir ? w.dir + '/' + w.name : w.name;
      if(seen[nm]){ const n = ++seen[nm];
                    nm = nm.replace(/(\.[^.]*)?$/, ' (' + n + ')$1'); }
      else seen[nm] = 1;
      entries.push({name: nm, bytes: buf});
    }catch(e){ ILLERR = 'bundle: ' + ((e && e.message) || 'fetch failed'); }
  }
  if(!entries.length){ bkSay(bid, 'None of the files could be read', sayk); return; }
  /* a plain index, so the zip still makes sense a year later */
  const lines = ['ILLUMENOCTIS \u2014 booking files' + (onlyLabel ? ' \u2014 ' + onlyLabel : ''),
                 (c.nm || '(unnamed)') + (c.ag ? ' \u00b7 ' + c.ag : ''),
                 'Taken ' + new Date().toISOString().slice(0, 10), ''];
  for(const e of entries) lines.push(e.name);
  entries.push({name: 'contents.txt',
                bytes: new TextEncoder().encode(lines.join('\n'))});
  const blob = zipStore(entries);
  const fn = zipSafe((c.nm || 'booking') + (c.ag ? ' - ' + c.ag : '') +
    (onlyLabel ? ' - ' + onlyLabel : '')) + '.zip';
  try{
    await DOWN.save({filename: fn, data: blob});
    bkSay(bid, entries.length - 1 + ' file' +
      (entries.length === 2 ? '' : 's') + ' saved', sayk);
  }catch(e){
    const code = (e && e.code) || '';
    bkSay(bid, code === 'declined' ? 'Save cancelled'
      : code === 'too_large' ? 'That bundle is too big to save here'
      : 'The save did not go through', sayk);
    ILLERR = 'save: ' + code;
  }
}
/* One file, straight from the chip. The page is sandboxed, so an anchor is not a
   reliable way out; the host's own saver is. The anchor stays on the chip for a
   middle click and for the day the saver is missing. */
async function bkOne(bid, id, name, only, wrapped){
  if(!DOWN){ ILLERR = 'this view cannot save files';
             bkSay(bid, 'Saving is not available here', only); return false; }
  bkSay(bid, 'Saving ' + name + '\u2026', only);
  try{
    const rec = attFind(bid, String(only || '').split('|')[0], id)
             || {i: id, w: wrapped ? 1 : 0};
    const bytes = await attGet(rec);
    let fn = name, data = new Blob([bytes]);
    /* the host writes only certain kinds of file on their own; everything else goes
       out in a zip of one, which it always takes */
    if(!DLEXT[extOf(name)]){
      data = zipStore([{name: zipSafe(name), bytes: bytes}]);
      fn = zipSafe(name) + '.zip';
    }
    await DOWN.save({filename: fn, data: data});
    bkSay(bid, name + ' saved', only);
  }catch(e){
    const code = (e && e.code) || '';
    bkSay(bid, code === 'declined' ? 'Save cancelled'
      : code === 'rejected_extension' ? 'This page cannot save that kind of file'
      : code === 'too_large' ? 'That file is too big to save here'
      : 'The save did not go through', only);
    ILLERR = 'save one: ' + (code || (e && e.message) || 'failed');
  }
  return true;
}
/* A note put on screen and then redrawn away is a note nobody read. It is remembered
   against its tray and drawn back in until it times out. */
const BKSAYQ = new Map();
function bkSay(bid, msg, only){
  const key = bid + '|' + (only || '');
  if(msg) BKSAYQ.set(key, msg); else BKSAYQ.delete(key);
  clearTimeout((BKSAYQ.get('t:' + key) || 0));
  BKSAYQ.set('t:' + key, setTimeout(() => {
    BKSAYQ.delete(key); BKSAYQ.delete('t:' + key);
    const el = document.querySelector('[data-bksay="' + CSS.escape(key) + '"]');
    if(el) el.textContent = '';
  }, 7000));
  return bkSayNow(bid, msg, only);
}
function bkSayNow(bid, msg, only){
  const card = document.querySelector('.bkcard[data-bkid="' + CSS.escape(bid) + '"]');
  if(!card) return;
  const el = card.querySelector('[data-bksay="' + CSS.escape(bid + '|' + (only || '')) + '"]')
    || card.querySelector('[data-bksay="' + CSS.escape(bid + '|' +
         String(only || '').split('|')[0]) + '"]')
    || card.querySelector('.bkdlsay');
  if(el){ el.textContent = msg; clearTimeout(el._t);
          el._t = setTimeout(() => { el.textContent = ''; }, 4000); }
}
/* A name on a chip tells you almost nothing about a book or a set of digitals.
   Resting on one shows it at a size you can judge, without leaving the card. */
let BKPV = null, BKPVT = 0;
function bkPvEl(){
  if(!BKPV){
    BKPV = document.createElement('div');
    BKPV.id = 'bkpv';
    BKPV.setAttribute('aria-hidden', 'true');
    document.body.appendChild(BKPV);
  }
  return BKPV;
}
function bkPvHide(){
  clearTimeout(BKPVT);
  if(BKPV){ BKPV.dataset.on = '0';
            clearTimeout(BKPV._c);
            BKPV._c = setTimeout(() => { if(BKPV && BKPV.dataset.on !== '1')
                                           BKPV.innerHTML = ''; }, 200); }
}
function bkPvShow(a){
  const el = bkPvEl();
  const id = a.dataset.bkget, nm = a.dataset.bkgetn || 'file';
  const ty = String(a.dataset.bkgett || '').toLowerCase();
  const url = '/_blob/' + encodeURIComponent(id);
  const wrapped = a.dataset.bkw === '1';
  const body = (!wrapped && ty.indexOf('image/') === 0)
    ? '<img src="' + url + '" alt="">'
    : (!wrapped && ty.indexOf('video/') === 0)
      ? '<video src="' + url + '" muted playsinline preload="metadata"></video>'
      : '<span class="bkpvg">' + FILESVG + '</span>';
  el.innerHTML = body + '<b>' + nm + '</b><i>' +
    [a.dataset.bkgets, a.dataset.bkgetw].filter(Boolean).join(' \u00b7 ') + '</i>';
  el.dataset.on = '1';
  /* placed after it is drawn, so the measurement is of the real thing */
  requestAnimationFrame(() => {
    if(el.dataset.on !== '1') return;
    const r = a.getBoundingClientRect(), b = el.getBoundingClientRect();
    let left = Math.min(Math.max(8, r.left), window.innerWidth - b.width - 8);
    let top = r.bottom + 8;
    if(top + b.height > window.innerHeight - 8) top = Math.max(8, r.top - b.height - 8);
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  });
}
const BKUNAME = {cm: 'centimetres', in: 'inches', eu: 'European sizes',
                 us: 'US sizes', mm: 'millimetres (mondopoint)', kg: 'kilograms', lb: 'pounds'};
/* weight has its own switch; a card that never set one follows its length unit */
const bkWU = c => c && (c.wu === 'kg' || c.wu === 'lb') ? c.wu : (c && c.lu === 'in' ? 'lb' : 'kg');
const BKHINT = {
  email: 'Who you wrote to, when, and what came back.',
  guar: 'The guarantee asked for and offered, the split, what is still open.',
  contract: 'Which contract, its term, what is signed and what is still with the lawyers.',
  visa: 'Which visa, what the agency still needs, dates.',
  flight: 'Dates, route, who is paying, booking reference.'
};
/* The same sidebar as Lumen, reading a booking card instead of a crawled row. What is
   typed on the card wins over anything the crawl knows: the card is the one a person
   has been keeping by hand. */
let KEYINFO = null;
function keyInfo(k){
  if(!k) return null;
  if(!KEYINFO){
    KEYINFO = new Map();
    for(const a of AG) for(const b of a.boards) for(const m of b.m){
      const raw = m[1];
      const href = raw.charAt(0) === '|' ? raw.slice(1) : b.p + raw;
      /* A model can sit on more than one board of the same agency. The board that
         counts is the FIRST one in the agency's own order, which is what walking the
         boards used to give - so the index must not let a later board overwrite it. */
      try{
        const kk = normKey(href);
        if(!KEYINFO.has(kk)) KEYINFO.set(kk, {nm: m[0] || '', ag: a.name, city: a.city,
          country: a.country, div: b.d, g: b.g, t: b.t, href: href});
      }catch(e){}
    }
  }
  /* The keys handed in here are already normalised, and normalising a normalised key
     is not always the same string again - a name with an accent in it comes back
     double-encoded. So try it as given first, and only then normalise. */
  if(KEYINFO.has(k)) return KEYINFO.get(k);
  try{ return KEYINFO.get(normKey(k)) || null; }catch(e){ return null; }
}
const bkModel = c => {
  const i = keyInfo(c.k);
  return {key: c.k || '', nm: c.nm, ag: c.ag, city: c.city, country: c.country,
          div: i ? i.div : '', g: i ? i.g : '', t: i ? i.t : ''};
};
function bkFacts(c){
  let f = null;
  if(c.k){ try{ f = litFacts(bkModel(c)); }catch(e){ f = null; } }
  const n = v => { if(v === null || v === undefined || v === '') return null;
                   const x = parseFloat(v); return isNaN(x) ? null : x; };
  const or = (a, b) => a !== null && a !== undefined ? a : (b === undefined ? null : b);
  return {ht: or(n(c.ht), f && f.ht), bu: or(n(c.bu), f && f.bu),
          wa: or(n(c.wa), f && f.wa), hp: or(n(c.hp), f && f.hp),
          eu: or(n(c.eu), f && f.eu), us: or(n(c.us), f && f.us),
          g: (c.g === 'M' || c.g === 'F') ? c.g : ((f && f.g) || '?'),
          tier: (f && f.tier) || ''};
}
function bkPasses(c, term){
  const sexes = checked('sex'), regions = checked('region'),
        tiers = checked('tier'), marks = checked('mark');
  if(litWho && c.by !== litWho) return false;
  if(marks.length && !marks.includes(lampOf(c.k) || '')) return false;
  if(regions.length && !regions.includes(REGION[c.country] || 'Unknown')) return false;
  if(term){
    const hay = [c.nm, c.ag, c.city, c.country, c.ig]
      .map(x => String(x || '')).join(' ').toLowerCase();
    if(!hay.includes(term)) return false;
  }
  if(!sexes.length && !tiers.length && !(BND && BND.any)) return true;
  const f = bkFacts(c);
  if(sexes.length && !sexes.includes(f.g || '?')) return false;
  if(tiers.length && !tiers.includes(f.tier || 'unlabelled')) return false;
  if(BND && BND.any){
    const L = n => n == null ? null
      : (lenUnit === 'in' ? Math.round(n / 2.54 * 10) / 10 : n);
    let sh = null;
    if(shoeUnit === 'eu') sh = f.eu;
    else if(shoeUnit === 'us') sh = f.us;
    else if(f.eu != null) sh = Math.round((f.eu / 1.5 - 1.5) * 10);
    if(!inRange(L(f.ht), BND.ht[0], BND.ht[1])) return false;
    if(!inRange(L(f.bu), BND.bu[0], BND.bu[1])) return false;
    if(!inRange(L(f.wa), BND.wa[0], BND.wa[1])) return false;
    if(!inRange(L(f.hp), BND.hp[0], BND.hp[1])) return false;
    if(!inRange(sh, BND.sh[0], BND.sh[1])) return false;
  }
  return true;
}
function renderBook(){
  renderBookCards();
  try{ bvSideRefresh(); }catch(e){}
}
function renderBookCards(){
  const pane = document.getElementById('bkmain');
  if(!pane) return;
  const all = bkSorted();
  readBounds();
  const term = (q.value || '').trim().toLowerCase();
  const rows = all.filter(c => bkPasses(c, term));
  const hidden = all.length - rows.length;
  const vn = document.getElementById('vn-bk');
  if(vn) vn.textContent = all.length ? all.length : '';
  const lead = '<div class="bklead">' +
    '<p>Models actually in play \u2014 the ones being talked about with their mother ' +
    'agency. A card moves here from Updates or Lumen with everything already known ' +
    'about them, or starts blank and you fill it in.</p>' +
    '<p>Three rows: <b>processing</b> while it is live, <b>completed</b> once it is ' +
    'closed, <b>cancelled</b> if it falls through. Every card carries the three rows ' +
    'across the top \u2014 press one and the card moves there, or pick the card up ' +
    'and drag it. Each row folds away on its coloured band, and so do the four stages ' +
    'inside a card \u2014 press the light beside a stage to take it amber while it is ' +
    'being worked on and green once it is done.</p></div>';
  const nd = rows.filter(c => bkStOf(c) === 'done').length;
  const np = rows.filter(c => bkStOf(c) === 'proc').length;
  const nc = rows.filter(c => bkStOf(c) === 'canc').length;
  const bar = '<div class="bkbar">' +
    '<button type="button" class="bknew" id="bknew">+ Create a New Card</button>' +
    '<button type="button" class="stochip' +
      ((STO && STO.usage && STO.usage.maxBytes &&
        STO.usage.bytes >= STO.usage.maxBytes * 0.9) ? ' full' : '') +
      '" id="stoopen" title="What the files on this page are using, and how to get ' +
      'room back">' + (STO && STO.usage && STO.usage.maxBytes
        ? 'files ' + Math.round(STO.usage.bytes / STO.usage.maxBytes * 100) + '%'
        : 'files') + '</button>' +
    '<span class="bkcount">' + (rows.length
      ? np + ' processing \u00b7 ' + nd + ' completed \u00b7 ' + nc + ' cancelled' +
        (hidden ? ' \u00b7 ' + hidden + ' filtered out' : '')
      : 'nothing in play') + '</span></div>';
  if(VIEW === 'bk')
    countEl.textContent = (hidden
      ? rows.length + ' of ' + all.length
      : String(rows.length)) + (all.length === 1 ? ' booking' : ' bookings');
  if(all.length && !rows.length){
    pane.innerHTML = lead + bar +
      '<div class="nomatch"><h2>Nothing matches</h2><p>' + all.length +
      (all.length === 1 ? ' card is' : ' cards are') + ' open, but none of them answer ' +
      'the filters. Clear the search, or press Reset.</p></div>';
    return;
  }
  if(!rows.length){
    pane.innerHTML = lead + bar + '<div class="bkempty"><p>No bookings open yet.</p>' +
      '<p><b>Create a New Card</b> gives you an empty card in the same shape as every ' +
      'other one here \u2014 name, mother agency, city, country, the six figures, an ' +
      'Instagram handle, a photograph, and the four stages \u2014 all of it blank and ' +
      'yours to type.</p><p>Or open Updates or Lumen and use the <b>\u2192 booking</b> ' +
      'chip on anyone you are taking further, and the card arrives already filled in.</p>' +
      '<button type="button" class="bknew" id="bknew2">+ Create a New Card</button></div>';
    return;
  }
  pane.innerHTML = lead + bar + BKST.map(([k, label, v, why, none]) => {
    const mine = rows.filter(c => bkStOf(c) === k);
    const shut = BKSHUT.has(k);
    const head = '<div class="bkbhd" role="button" tabindex="0" data-bkband="' + k +
      '" aria-expanded="' + (shut ? 'false' : 'true') + '" title="' +
      (shut ? 'Show' : 'Hide') + ' this row">' +
      '<i class="litdot ' + v + '"></i><h2>' + label + '</h2>' +
      '<span class="bkbwhy" data-bkband="' + k + '">' + why + '</span>' +
      '<s>' + mine.length + (mine.length === 1 ? ' card' : ' cards') + '</s>' +
      '<b class="bkbcar" aria-hidden="true">' + (shut ? '\u25B8' : '\u25BE') +
      '</b></div>';
    const body = mine.length
      ? '<div class="bkbbody"><div class="bkgrid">' +
        mine.map((c, i) => bkCard(c, i, mine.length)).join('') + '</div></div>'
      : '<p class="bkbnone">' + none + '</p>';
    return '<section class="bkband bkband--' + v + '" data-open="' + (shut ? 0 : 1) +
      '" data-bkdrop="' + k + '">' + head + body + '</section>';
  }).join('');
}
/* ---- the one way in from a model card ---- */
let litArm = '';                     // the Lumen card whose remove is armed
function litDelChip(key, nm){
  if(!key) return '';
  const on = litArm === key;
  return '<span class="litdel' + (on ? ' arm' : '') + '" data-litdel="' + esc(key) +
    '" data-nm="' + esc(nm || '') + '" role="button" tabindex="0" title="' +
    (on ? 'Press again to take ' + esc(nm || 'this model') + ' off Lumen \u2014 the lamp ' +
      'goes out and the card leaves this list. Nothing else about them is lost.'
        : 'Take this model off Lumen') + '">' +
    (on ? 'remove?' : '\u00d7 remove') + '</span>';
}
/* The same remove, said in the corner of the card instead of as a chip in its chips.
   It carries the same data-litdel the chip does, so one handler serves both and the
   two-press confirm is the same confirm, whichever of them you press. */
function litDelX(key, nm){
  if(!key) return '';
  const on = litArm === key;
  /* What a remove can mean depends on what put the card in front of you. Your own lamp
     is what puts one on Lumen and in the shared room, so there the remove puts it out.
     A card the scan put there - an arrival, a recommendation - has no lamp of yours to
     put out, and the truest remove the page has for those is the red one: ruled out,
     gone from the green and amber lists, never offered as a recommendation again, and
     still on the record so nobody weighs them up twice. */
  const mine = MARKS.has(key);
  const who = nm || 'this model';
  const say = on
    ? (mine
        ? 'Press again to put your lamp out — ' + who + ' leaves Lumen and the shared ' +
          'room. Nothing else about them is lost.'
        : 'Press again to rule ' + who + ' out — the card leaves the green and amber ' +
          'lists and stops coming back as a recommendation. Reversible from the red lamp.')
    : (mine ? 'Remove this card' : 'Rule out and remove this card');
  return '<button type="button" class="litxc' + (on ? ' arm' : '') +
    '" data-litdel="' + esc(key) + '" data-nm="' + esc(nm || '') +
    '" title="' + esc(say) + '" aria-label="' + esc(say) + '">' +
    (on ? 'remove?' : '<svg class="litxi" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6"/></svg><em>remove</em>') + '</button>';
}
function bookChip(key, nm){
  if(!key) return '';
  const inPlay = !!bkForKey(key);
  return '<span class="tobook' + (inPlay ? ' in' : '') + '" data-tobook="' + esc(key) +
    '" data-nm="' + esc(nm || '') + '" role="button" tabindex="0" title="' +
    (inPlay ? 'Already on the Booking tab' : 'Move this model to the Booking tab') +
    '">' + (inPlay ? 'booking \u2713' : '\u2192 booking') + '</span>';
}
document.addEventListener('click', e => {
  const d = e.target.closest && e.target.closest('[data-litdel]');
  if(d){
    e.preventDefault();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    e.stopPropagation();
    if(!SIGNED()){ nudgeSignIn(d); return; }
    const k = d.dataset.litdel;
    if(litArm !== k){
      litArm = k;
      refresh();
      /* a second thought is allowed; after four seconds it disarms itself */
      setTimeout(() => { if(litArm === k){ litArm = ''; refresh(); } }, 4000);
      return;
    }
    litArm = '';
    /* putting the lamp out IS taking them off Lumen - setMark with the current value
       toggles it off, which is the one path that keeps the work log honest */
    const now = MARKS.get(k);
    /* A card with no lamp of yours cannot be un-lit, and the press used to land on
       nothing at all - which is what made the remove look broken everywhere but Lumen.
       On those tabs it rules the model out instead: the one durable, reversible way the
       page has of saying take them off my lists. */
    const act = now ? setMark(k, now, {nm: d.dataset.nm || '', url: k})
                    : setMark(k, 'r', {nm: d.dataset.nm || '', url: k});
    /* setMark settles asynchronously; the card should be gone the moment it has,
       not at the next thing that happens to redraw */
    Promise.resolve(act).then(() => refresh(), () => refresh());
    return;
  }
  const t = e.target.closest && e.target.closest('[data-tobook]');
  if(!t) return;
  e.preventDefault();
  if(e.stopImmediatePropagation) e.stopImmediatePropagation();
  e.stopPropagation();
  const key = t.dataset.tobook;
  if(bkForKey(key)){ setView('bk'); return; }
  const row = t.closest('.litrow');
  const ag = row ? (row.querySelector('.agnm') || {}).textContent || '' : '';
  const place = row ? (row.querySelector('.agloc') || {}).textContent || '' : '';
  /* One part is a country on its own, not a city that happens to share its name -
     copying it into both boxes is what put South Africa on the card twice. */
  const bits = place.split('\u00b7').map(x => x.trim()).filter(Boolean);
  const c = bookFromModel(key, t.dataset.nm, ag.trim(),
                          bits.length > 1 ? bits[0] : '',
                          bits.length > 1 ? bits[1] : (bits[0] || ''));
  if(!c) return;
  remember('book', key, t.dataset.nm || key, ag.trim(), key);
  renderBook();
  refresh();
  setView('bk');
}, true);
/* Typing in a find box redraws the tray around it, so the box is put back under the
   cursor afterwards - the caret where it was, nothing lost mid-word. */
let BKFINDT = 0;
document.getElementById('bkmain').addEventListener('input', e => {
  const el = e.target;
  if(!el || !el.dataset || !el.dataset.bkfind) return;
  const key = el.dataset.bkfind, v = el.value, at = el.selectionStart;
  if(String(v).trim()) BKFIND.set(key, v); else BKFIND.delete(key);
  clearTimeout(BKFINDT);
  BKFINDT = setTimeout(() => {
    renderBook();
    const back = document.querySelector('[data-bkfind="' + CSS.escape(key) + '"]');
    if(back){ back.focus(); try{ back.setSelectionRange(at, at); }catch(err){} }
  }, 180);
});
/* A place is committed on Enter or when the field is left - typing it and clicking
   away should not lose it. The same place twice is the same place. */
function beenAdd(bid, raw){
  const c = BOOK.get(bid);
  if(!c) return false;
  if(!SIGNED()){ nudgeSignIn(); return false; }
  const one = beenParse(raw);
  if(!one || !one.c) return false;
  const list = beenList(c);
  if(list.some(x => beenSame(x, one))) return false;
  if(list.length >= 60) return false;
  list.push(one);
  c.bn = list;
  saveBook(bid, true);
  return true;
}
function beenDrop(bid, i){
  const c = BOOK.get(bid);
  if(!c) return;
  if(!SIGNED()){ nudgeSignIn(); return; }
  const list = beenList(c);
  if(i < 0 || i >= list.length) return;
  list.splice(i, 1);
  c.bn = list;
  saveBook(bid, true);
  renderBook();
}
function paintDob(el, c){
  const row = el.closest('.bkdob');
  if(!row) return;
  const p = dobParse(c.dob), auto = ageFrom(c.dob);
  row.classList.toggle('bkdob--odd', !!String(c.dob || '').trim() && !p);
  el.title = p ? dobWords(p)
    : 'Day first \u2014 17/05/2004, 2004-05-17 or 17 May 2004';
  let echo = row.querySelector('s');
  if(p){
    if(!echo){ echo = document.createElement('s'); row.appendChild(echo); }
    echo.textContent = dobWords(p);
  }else if(echo) echo.remove();
  const now = row.querySelector('.bkagen') || row.querySelector('.bkf--age');
  if(!now) return;
  if(auto === ''){
    if(now.classList.contains('bkf--age')) return;    // already the typed-in box
    const box = document.createElement('input');
    box.className = 'bkf bkf--age';
    box.setAttribute('inputmode', 'numeric');
    box.dataset.bk = c.id; box.dataset.bf = 'age';
    box.placeholder = '\u2014';
    box.value = c.age == null ? '' : String(c.age);
    box.title = 'Type the age when you do not have the date';
    now.replaceWith(box);
  }else{
    if(now.classList.contains('bkagen')){ now.textContent = auto;
                                          now.title = 'From ' + dobWords(p); return; }
    const sp = document.createElement('span');
    sp.className = 'bkagen';
    sp.textContent = auto;
    sp.title = 'From ' + dobWords(p);
    now.replaceWith(sp);
  }
}
/* ---- editing ---- */
document.addEventListener('input', e => {
  const el = e.target;
  if(!el || !el.dataset) return;
  const bid = el.dataset.bk;
  if(!bid || !BOOK.has(bid)) return;
  if(!SIGNED()){ nudgeSignIn(); return; }
  const c = BOOK.get(bid);
  if(el.dataset.sec){
    const had = (c.s && typeof c.s === 'object' && !Array.isArray(c.s)) ? c.s : {};
    const ns = Object.assign({}, had);
    ns[el.dataset.sec] = Object.assign({}, had[el.dataset.sec], {t: el.value});
    c.s = ns;
  }else if(el.dataset.bf){
    const f = el.dataset.bf;
    const n = el.value.trim() === '' ? '' : bkNum(el.value);
    if(['ht','bu','wa','hp'].includes(f))
      c[f] = (n === '' || bkLU(c) === 'cm') ? n : inToCm(n);
    else if(f === 'eu' || f === 'us') c[f] = n;
    else if(f === 'mm') c.eu = n === '' ? '' : mmToEu(n);   // mm is a view of EU
    else if(f === 'ig') c.ig = igBare(el.value);
    else if(f === 'wt'){
      /* weight is kept in kilograms whichever unit it is typed in */
      const w = String(el.value).trim() === '' ? null : bkNum(el.value);
      c.wt = w == null ? '' : (el.dataset.wu === 'lb' ? Math.round(w * 4.5359237) / 10 : w);
    }
    else c[f] = el.value;
    /* the age follows the date as it is typed, and the card is not redrawn around the
       field somebody is still typing in */
    if(f === 'dob') paintDob(el, c);
  }else return;
  saveBook(bid);
  document.querySelectorAll('[data-bkmiss="' + CSS.escape(bid) + '"]').forEach(x => {
    x.innerHTML = bkMissHtml(c); });
});
const bkMainClick = async e => {
  if(markClick(e)) return;
  const nmed = e.target.closest('[data-bknmed]');
  if(nmed){
    e.preventDefault(); e.stopPropagation();
    const bid = nmed.dataset.bknmed;
    BKNMEDIT.add(bid);
    renderBook();
    const el = document.querySelector('.bkcard[data-bkid="' + CSS.escape(bid) + '"] ' +
      (nmed.dataset.f === 'ag' ? '.bkf--ag' : '.bkf--nm'));
    if(el){ el.focus(); try{ el.select(); }catch(err){} }
    return;
  }
  const nmh = e.target.closest('a.bknmlink[data-ref]');
  if(nmh){
    remember('model', nmh.dataset.ref, nmh.dataset.nm, nmh.dataset.ag, nmh.dataset.ref);
    return;
  }
  const ph = e.target.closest('.pho[data-photo]');
  if(ph){
    e.preventDefault(); e.stopPropagation();
    window.open(ph.dataset.photo, '_blank', 'noopener,noreferrer');
    return;
  }
  const nw = e.target.closest('#bknew') || e.target.closest('#bknew2');
  if(nw){
    if(!SIGNED()){ nudgeSignIn(); return; }
    const rows = bkSorted();
    const bid = newBid();
    BOOK.set(bid, {id: bid, o: (rows.length ? (rows.slice(-1)[0].o || 0) + 1 : 0),
      k: '', nm: '', ag: '', city: '', country: '', ht: '', bu: '', wa: '', hp: '',
      eu: '', us: '', ig: '', ph: '', ft: '', s: {}, st: 'proc', by: ME || '',
      at: new Date().toISOString()});
    saveBook(bid, true);
    renderBook();
    const el = document.querySelector('.bkcard[data-bkid="' + CSS.escape(bid) + '"] .bkf--nm');
    if(el) el.focus();
    return;
  }
  const mvto = e.target.closest('[data-bkmove]');
  if(mvto){
    const [bid, to] = mvto.dataset.bkmove.split('|');
    bkMoveTo(bid, to);
    return;
  }
  const bd = e.target.closest('[data-bkband]');
  if(bd){
    const k = bd.dataset.bkband;
    if(BKSHUT.has(k)) BKSHUT.delete(k); else BKSHUT.add(k);
    renderBook();
    savePrefsUI();
    return;
  }
  const dot = e.target.closest('[data-bkstage]');
  if(dot){
    if(!SIGNED()){ nudgeSignIn(dot); return; }
    const [bid, k] = dot.dataset.bkstage.split('|');
    bkStage(bid, k, null);
    return;
  }
  const uu = e.target.closest('[data-bku] button[data-u]');
  if(uu){
    if(!SIGNED()){ nudgeSignIn(); return; }
    const [bid, which] = uu.closest('[data-bku]').dataset.bku.split('|');
    const c = BOOK.get(bid);
    if(!c) return;
    c[which === 'lu' ? 'lu' : which === 'wu' ? 'wu' : 'su'] = uu.dataset.u;
    saveBook(bid, true);
    renderBook();
    return;
  }
  const sec = e.target.closest('[data-bksec]');
  if(sec){
    const k = sec.dataset.bksec;
    if(BKOPEN.has(k)) BKOPEN.delete(k); else BKOPEN.add(k);
    renderBook();
    return;
  }
  const del = e.target.closest('[data-bkdel]');
  if(del){
    if(!SIGNED()){ nudgeSignIn(); return; }
    const bid = del.dataset.bkdel;
    if(bkArm !== bid){
      bkArm = bid;
      renderBook();
      setTimeout(() => { if(bkArm === bid){ bkArm = ''; renderBook(); } }, 4000);
      return;
    }
    bkArm = '';
    await dropBook(bid);
    refresh();
    return;
  }
  const sxb = e.target.closest('[data-bksex] button[data-g]');
  if(sxb){
    if(!SIGNED()){ nudgeSignIn(); return; }
    const bid = sxb.closest('[data-bksex]').dataset.bksex;
    const c = BOOK.get(bid);
    if(!c) return;
    c.g = c.g === sxb.dataset.g ? '' : sxb.dataset.g;
    saveBook(bid, true);
    renderBook();
    return;
  }
  const ft = e.target.closest('[data-bkft] button[data-ft]');
  if(ft){
    if(!SIGNED()){ nudgeSignIn(); return; }
    const bid = ft.closest('[data-bkft]').dataset.bkft;
    const c = BOOK.get(bid);
    if(!c) return;
    c.ft = c.ft === ft.dataset.ft ? '' : ft.dataset.ft;
    saveBook(bid, true);
    renderBook();
    return;
  }
  const dl = e.target.closest('[data-bkdl]');
  if(dl){ bkBundle(dl.dataset.bkdl, ''); return; }
  const dls = e.target.closest('[data-bkdls]');
  if(dls){
    const bits = String(dls.dataset.bkdls).split('|');
    bkBundle(bits[0], bits[1], '');
    return;
  }
  const wipe = e.target.closest('[data-bkwipe]');
  if(wipe){
    if(!SIGNED()){ nudgeSignIn(wipe); return; }
    const key = wipe.dataset.bkwipe;
    if(bkWipe !== key){
      bkWipe = key;
      renderBook();
      /* a second thought is allowed; after four seconds it disarms itself */
      setTimeout(() => { if(bkWipe === key){ bkWipe = ''; renderBook(); } }, 4000);
      return;
    }
    bkWipe = '';
    const bits = String(key).split('|');
    if(bits[0] === 'card') bkWipeCard(bits[1]);
    else bkWipeTray(bits[0], bits[1], bits[2] || '');
    return;
  }
  const dlb = e.target.closest('[data-bkdlb]');
  if(dlb){
    const bits = String(dlb.dataset.bkdlb).split('|');
    bkBundle(bits[0], bits[1], bits[2] || '');
    return;
  }
  const get = e.target.closest('[data-bkget]');
  if(get && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey){
    const card = get.closest('.bkcard,.bvstages'), sec = get.closest('.bksec');
    const bid = card ? card.dataset.bkid : '';
    const box = get.closest('[data-bkdrop-att]');
    const shh = sec ? sec.querySelector('[data-bksec]') : null;
    const only = box
      ? String(box.dataset.bkdropAtt).split('|').slice(1).join('|')
      : (shh ? String(shh.dataset.bksec).split('|')[1] : '');
    if(bid && DOWN){
      e.preventDefault();
      bkPvHide();
      bkOne(bid, get.dataset.bkget, get.dataset.bkgetn || 'file', only,
            get.dataset.bkw === '1');
      return;
    }
  }
  const sh = e.target.closest('[data-bksheet]');
  if(sh){ shOpen(sh.dataset.bksheet); return; }
  const vw = e.target.closest('[data-bkview]');
  if(vw){
    ATTVIEW = ATTVIEW === 'grid' ? 'list' : 'grid';
    try{ localStorage.setItem('illum.attview', ATTVIEW); }catch(err){}
    renderBook();
    return;
  }
  const more = e.target.closest('[data-bkmore]');
  if(more){
    const key = more.dataset.bkmore;
    if(BKMORE.has(key)) BKMORE.delete(key); else BKMORE.add(key);
    renderBook();
    return;
  }
  const att = e.target.closest('[data-bkatt]');
  if(att){
    if(!SIGNED()){ nudgeSignIn(att); return; }
    bkAttFor = att.dataset.bkatt;
    bkAttInput.click();
    return;
  }
  const fld = e.target.closest('[data-bkfld]');
  if(fld){
    if(!SIGNED()){ nudgeSignIn(fld); return; }
    bkAttFor = fld.dataset.bkfld;
    bkFldInput.click();
    return;
  }
  const bnm = e.target.closest('[data-bnmore]');
  if(bnm){
    const id = bnm.dataset.bnmore;
    if(BNMORE.has(id)) BNMORE.delete(id); else BNMORE.add(id);
    renderBook();
    return;
  }
  const bnx = e.target.closest('[data-bnx]');
  if(bnx){
    const bits = String(bnx.dataset.bnx).split('|');
    beenDrop(bits[0], parseInt(bits[1], 10));
    return;
  }
  const fdel = e.target.closest('[data-bkfdel]');
  if(fdel){
    if(!SIGNED()){ nudgeSignIn(fdel); return; }
    const bits = String(fdel.dataset.bkfdel).split('|');
    bkDropFile(bits[0], bits[1], bits.slice(2).join('|'));
    return;
  }
  const cam = e.target.closest('[data-bkcam]');
  if(cam){
    e.preventDefault(); e.stopPropagation();
    if(!SIGNED()){ nudgeSignIn(cam); return; }
    bkCamMenu(cam);
    return;
  }
  const pic = e.target.closest('[data-bkpic]');
  if(pic){
    /* a card with a photograph opens wide; an empty one still asks for a picture */
    if(typeof bvOpenFor === 'function' && bvOpenFor(pic.dataset.bkpic)) return;
    if(!SIGNED()){ nudgeSignIn(); return; }
    bkPicFor = pic.dataset.bkpic;
    bkInput.click();
  }
};
document.getElementById('bkmain').addEventListener('click', bkMainClick);
/* The preview waits a beat: running the pointer across a shelf of twelve chips on
   the way somewhere else should not flash twelve pictures. Touch never asks for it,
   and a keyboard gets it on focus. */
(function(){
  const main = document.getElementById('bkmain');
  main.addEventListener('pointerover', e => {
    if(e.pointerType && e.pointerType !== 'mouse') return;
    const a = e.target.closest && e.target.closest('[data-bkget]');
    if(!a || !main.contains(a)) return;
    if(a.contains(e.relatedTarget)) return;
    clearTimeout(BKPVT);
    BKPVT = setTimeout(() => { if(a.isConnected) bkPvShow(a); }, 260);
  });
  main.addEventListener('pointerout', e => {
    const a = e.target.closest && e.target.closest('[data-bkget]');
    if(!a) return;
    if(a.contains(e.relatedTarget)) return;
    bkPvHide();
  });
  main.addEventListener('focusin', e => {
    const a = e.target.closest && e.target.closest('[data-bkget]');
    if(a) bkPvShow(a); else bkPvHide();
  });
  main.addEventListener('focusout', e => {
    if(e.target.closest && e.target.closest('[data-bkget]')) bkPvHide();
  });
  main.addEventListener('scroll', bkPvHide, true);
  window.addEventListener('scroll', bkPvHide, true);
  window.addEventListener('resize', bkPvHide);
})();
const bkMainKey = e => {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const tag = e.target.tagName;
  if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const pk = e.target.closest && e.target.closest('.pho[data-photo]');
  if(pk){ e.preventDefault(); window.open(pk.dataset.photo, '_blank', 'noopener,noreferrer');
          return; }
  const sec = e.target.closest &&
    e.target.closest('[data-bksec],[data-bkband]');
  if(!sec) return;
  e.preventDefault();
  sec.click();
};
document.getElementById('bkmain').addEventListener('keydown', bkMainKey);
/* ---- dragging a card from one coloured row to another ----
   Done with pointer events rather than the browser's own drag: that one does nothing
   at all on a phone, and a scout marking a booking finished on the way to a casting is
   exactly the person who needs it. Press the grip, or press the card anywhere that is
   not a field and move; on a touch screen hold for a moment first so an ordinary
   scroll still scrolls. */
(function bkCardDrag(){
  const pane = document.getElementById('bkmain');
  if(!pane) return;
  let st = null, swallow = false;
  const clearHi = () =>
    pane.querySelectorAll('.bkband.over').forEach(x => x.classList.remove('over'));
  function under(x, y){
    if(st && st.ghost) st.ghost.style.visibility = 'hidden';
    const el = document.elementFromPoint(x, y);
    if(st && st.ghost) st.ghost.style.visibility = '';
    if(!el || !el.closest) return {band: null, card: null};
    const card = el.closest('.bkcard');
    return {band: el.closest('[data-bkdrop]'),
            card: (card && card.dataset.bkid !== (st && st.id)) ? card : null};
  }
  /* The cards lie in a grid, so "before or after" is decided by which half of the card
     under the pointer it is in - the same way a word processor decides which side of a
     character the caret goes. */
  const clearDrop = () => document.querySelectorAll('.bkdrop-b,.bkdrop-a')
    .forEach(x => x.classList.remove('bkdrop-b', 'bkdrop-a'));
  function begin(){
    if(!st || st.armed) return;
    st.armed = true;
    bkDragId = st.id;
    const r = st.card.getBoundingClientRect();
    const g = st.card.cloneNode(true);
    /* a clone copies the markup, not what has been typed into it */
    const a = st.card.querySelectorAll('input, textarea');
    const b = g.querySelectorAll('input, textarea');
    for(let i = 0; i < a.length && i < b.length; i++) b[i].value = a[i].value;
    g.classList.add('bkghost');
    g.classList.remove('bkdrag');
    g.style.width = r.width + 'px';
    g.style.left = r.left + 'px';
    g.style.top = r.top + 'px';
    document.body.appendChild(g);
    st.ghost = g;
    st.card.classList.add('bkdrag');
    document.body.classList.add('bkdragging');
  }
  function end(ok){
    if(!st) return;
    const s = st;
    st = null;
    bkDragId = '';
    if(s.timer) clearTimeout(s.timer);
    if(s.ghost) s.ghost.remove();
    s.card.classList.remove('bkdrag');
    document.body.classList.remove('bkdragging');
    clearHi();
    clearDrop();
    document.removeEventListener('pointermove', onMove, true);
    document.removeEventListener('pointerup', onUp, true);
    document.removeEventListener('pointercancel', onCancel, true);
    if(!s.armed) return;
    swallow = true;                       // the press that dragged is not a click
    setTimeout(() => { swallow = false; }, 0);
    const band = s.band || s.lastBand;
    if(!ok || !band || !band.isConnected) return;
    const overId = s.overId || (s.band ? '' : s.lastOverId || '');
    const before = s.overId ? s.before : (s.band ? false : !!s.lastBefore);
    bkDropInto(s.id, band.dataset.bkdrop, overId, before);
  }
  function onMove(e){
    if(!st || e.pointerId !== st.pid) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if(!st.armed){
      if(st.touch){ if(Math.abs(dx) + Math.abs(dy) > 12) end(false); return; }
      if(Math.abs(dx) + Math.abs(dy) < 7) return;
      begin();
    }
    if(e.cancelable) e.preventDefault();
    st.ghost.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    const hit = under(e.clientX, e.clientY);
    if(hit.band !== st.band){ clearHi(); st.band = hit.band;
                              if(hit.band) hit.band.classList.add('over'); }
    /* Let go a pixel past the edge of a row, or in the gutter between two cards, and
       the intent was still plain. The last row the card was actually over is what the
       drop uses, rather than throwing the whole gesture away. */
    if(hit.band){ st.lastBand = hit.band; }
    let overId = '', before = false;
    if(hit.card && hit.band){
      const r = hit.card.getBoundingClientRect();
      overId = hit.card.dataset.bkid;
      before = e.clientX < r.left + r.width / 2;
    }
    if(overId !== st.overId || before !== st.before){
      st.overId = overId;
      st.before = before;
      clearDrop();
      if(overId && hit.card) hit.card.classList.add(before ? 'bkdrop-b' : 'bkdrop-a');
      if(overId){ st.lastOverId = overId; st.lastBefore = before; }
    }
  }
  function onUp(e){ if(st && e.pointerId === st.pid) end(true); }
  function onCancel(e){ if(st && e.pointerId === st.pid) end(false); }
  pane.addEventListener('pointerdown', e => {
    if(st) end(false);
    if(e.button != null && e.button !== 0) return;
    const card = e.target.closest && e.target.closest('.bkcard');
    if(!card || !card.dataset.bkid) return;
    const grip = e.target.closest && e.target.closest('[data-bkgrip]');
    if(!grip && e.target.closest &&
       e.target.closest('input, textarea, select, button, label, a, .bksh, .bknotegrip')) return;
    st = {id: card.dataset.bkid, card: card, x: e.clientX, y: e.clientY,
          pid: e.pointerId, armed: false, band: null, timer: 0, ghost: null,
          overId: '', before: false, lastBand: null, lastOverId: '', lastBefore: false,
          touch: e.pointerType === 'touch' && !grip};
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('pointercancel', onCancel, true);
    if(grip){ if(e.cancelable) e.preventDefault(); begin(); }
    else if(st.touch) st.timer = setTimeout(() => { if(st) begin(); }, 380);
  });
  pane.addEventListener('click', e => {
    if(!swallow) return;
    swallow = false;
    e.preventDefault();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    e.stopPropagation();
  }, true);
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && st) end(false); });
})();
/* one picker for every stage tray, pointed at whichever asked */
let bkAttFor = '';
const bkAttInput = document.createElement('input');
bkAttInput.type = 'file';
bkAttInput.multiple = true;
bkAttInput.hidden = true;
document.body.appendChild(bkAttInput);
bkAttInput.addEventListener('change', async () => {
  const fs = bkAttInput.files ? [...bkAttInput.files] : [];
  bkAttInput.value = '';
  const bits = String(bkAttFor).split('|');
  if(fs.length && bits.length >= 2) await bkAddFiles(bits[0], bits[1], fs, bits[2]);
});
/* one list of countries for every card's field to finish against */
(function(){
  if(document.getElementById('worldcc')) return;
  const dl = document.createElement('datalist');
  dl.id = 'worldcc';
  dl.innerHTML = WORLD.map(n => '<option value="' + esc(n) + '"></option>').join('');
  document.body.appendChild(dl);
})();
/* Enter commits, and so does leaving the field - a place typed and then clicked away
   from is a place she went, not a typo. */
document.getElementById('bkmain').addEventListener('keydown', e => {
  const el = e.target;
  if(!el || !el.classList || !el.classList.contains('bnadd')) return;
  if(e.key === 'Escape'){ el.value = ''; el.blur(); return; }
  if(e.key !== 'Enter') return;
  e.preventDefault();
  e.stopPropagation();
  const bid = el.dataset.bnadd, v = el.value;
  el.value = '';
  if(beenAdd(bid, v)){
    renderBook();
    const back = document.querySelector('.bkcard[data-bkid="' + CSS.escape(bid) +
      '"] .bnadd');
    if(back) back.focus();
  }
}, true);
document.getElementById('bkmain').addEventListener('focusout', e => {
  const el = e.target;
  if(!el || !el.classList || !el.classList.contains('bnadd')) return;
  const bid = el.dataset.bnadd, v = el.value;
  if(!String(v || '').trim()) return;
  el.value = '';
  if(beenAdd(bid, v)) renderBook();
});
document.getElementById('bkmain').addEventListener('focusout', e => {
  const el = e.target;
  if(!el || !el.classList || !(el.classList.contains('bkf--nm') ||
     el.classList.contains('bkf--ag') || el.classList.contains('bkf--pl'))) return;
  const bid = el.dataset.bk;
  if(!BKNMEDIT.has(bid)) return;
  setTimeout(() => {
    const a = document.activeElement;
    if(a && a.dataset && a.dataset.bk === bid &&
       a.matches('.bkf--nm,.bkf--ag,.bkf--pl')) return;   // moved on to the next field
    BKNMEDIT.delete(bid);
    renderBook();
  }, 0);
});
const bkFldInput = document.createElement('input');
bkFldInput.type = 'file';
bkFldInput.multiple = true;
bkFldInput.hidden = true;
try{ bkFldInput.webkitdirectory = true;
     bkFldInput.setAttribute('webkitdirectory', ''); }catch(e){}
document.body.appendChild(bkFldInput);
bkFldInput.addEventListener('change', async () => {
  const raw = bkFldInput.files ? [...bkFldInput.files] : [];
  bkFldInput.value = '';
  const bits = String(bkAttFor).split('|');
  if(!raw.length || bits.length < 2) return;
  const fs = await pickedFolders(raw);
  if(fs.length) await bkAddFiles(bits[0], bits[1], fs, bits[2]);
});
/* The camera on a booking card: a card with no agency page goes straight to the file
   picker; a linked one asks first - a file from this computer, or the agency's own photo. */
function bkCamMenu(btn){
  const bid = btn.dataset.bkcam, k = btn.dataset.bkcamk || '';
  const old = document.getElementById('bkcammenu'); if(old){ const same = old.dataset.for === bid; old.remove(); if(same) return; }
  const file = () => { bkPicFor = bid; bkInput.click(); };
  if(!k){ file(); return; }
  const m = document.createElement('div');
  m.id = 'bkcammenu'; m.className = 'bkcammenu'; m.dataset.for = bid; m.setAttribute('role', 'menu');
  m.innerHTML = '<button type="button" role="menuitem" data-cm="file">' + CAMGLYPH + '<span>' + 'Choose a photo file…' + '</span></button>' +
    '<button type="button" role="menuitem" data-cm="find">' + IMGGLYPH + '<span>' + 'Find it on the agency site' + '</span></button>';
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.left)) + 'px';
  m.style.top = (r.top - mh - 6 > 8 ? r.top - mh - 6 : r.bottom + 6) + 'px';
  const close = () => { m.remove(); document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', esc1, true); };
  const away = e => { if(!m.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close(); };
  const esc1 = e => { if(e.key === 'Escape'){ e.stopPropagation(); close(); btn.focus(); } };
  document.addEventListener('pointerdown', away, true); document.addEventListener('keydown', esc1, true);
  m.addEventListener('click', async e => {
    const b = e.target.closest('[data-cm]'); if(!b) return;
    e.preventDefault(); e.stopPropagation(); close();
    if(b.dataset.cm === 'file') file(); else await findLumenPhoto(k);
  });
  m.querySelector('button').focus();
}
/* one picker for every booking card, pointed at whichever asked */
let bkPicFor = '';
const bkInput = document.createElement('input');
bkInput.type = 'file';
bkInput.accept = 'image/*';
bkInput.hidden = true;
document.body.appendChild(bkInput);
bkInput.addEventListener('change', async () => {
  const f = bkInput.files && bkInput.files[0];
  bkInput.value = '';
  if(f) await setBookPic(bkPicFor, f);
});
async function setBookPic(bid, file){
  const c = BOOK.get(bid);
  if(!c || !file || !ASSETS || !SIGNED()) return;
  if(!/^image\//i.test(file.type || '')) return;
  if(file.size > 20 * 1024 * 1024) return;
  try{
    const res = await ASSETS.upload(file);
    if(!res || !res.id) return;
    const old = c.ph;
    c.ph = res.id;
    saveBook(bid, true);
    renderBook();
    if(old && old !== res.id){ try{ await ASSETS.delete(old); }catch(e){} }
  }catch(e){}
}
function bkDrops(pane){
  if(!pane) return;
  let hover = '';
  pane.addEventListener('pointerover', e => {
    const c = e.target.closest && e.target.closest('[data-bkpic]');
    if(c) hover = c.dataset.bkpic;
  });
  /* A file dropped anywhere on a stage lands in that stage - the header, the notes,
     the attach button, all of it. A stage that is folded shut takes the file too and
     opens itself, because the alternative is a drop that silently does nothing. */
  const stageAt = el => (el && el.closest) ? el.closest('.bksec') : null;
  const stageKey = sec => {
    const sh = sec && sec.querySelector('[data-bksec]');
    return sh ? String(sh.dataset.bksec || '') : '';
  };
  pane.addEventListener('dragover', e => {
    if(bkDragId) return;
    const sec = stageAt(e.target);
    if(sec && stageKey(sec)){
      e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
      pane.querySelectorAll('.bksec.bkbdrop').forEach(x => {
        if(x !== sec) x.classList.remove('bkbdrop'); });
      sec.classList.add('bkbdrop');
      return;
    }
    const c = e.target.closest && e.target.closest('[data-bkpic]');
    if(!c) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  pane.addEventListener('dragleave', e => {
    const sec = stageAt(e.target);
    if(sec && !sec.contains(e.relatedTarget)) sec.classList.remove('bkbdrop');
  });
  pane.addEventListener('drop', e => {
    if(bkDragId) return;
    const sec = stageAt(e.target);
    const key = stageKey(sec);
    if(key){
      sec.classList.remove('bkbdrop');
      const dt = e.dataTransfer;
      const plain = (dt && dt.files) ? [...dt.files] : [];
      /* taken now, while the event is still live */
      const ens = dropEntries(dt);
      if(plain.length || ens.length){
        e.preventDefault();
        /* dropped on a particular shelf, or anywhere else on the stage */
        const onBin = e.target.closest && e.target.closest('[data-bkdrop-att]');
        const bits = (onBin ? String(onBin.dataset.bkdropAtt) : key).split('|');
        BKOPEN.add(key);                 // show what just landed
        dropToFiles(ens, plain).then(fs => {
          if(fs.length) bkAddFiles(bits[0], bits[1], fs, bits[2]);
        });
      }
      return;
    }
    const c = e.target.closest && e.target.closest('[data-bkpic]');
    if(!c) return;
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if(f) setBookPic(c.dataset.bkpic, f);
  });
  document.addEventListener('paste', e => {
    if(VIEW !== 'bk' || !hover) return;
    const ae = document.activeElement;
    if(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
    for(const it of ((e.clipboardData && e.clipboardData.items) || [])){
      if(it.kind !== 'file' || !/^image\//i.test(it.type || '')) continue;
      const f = it.getAsFile();
      if(!f) continue;
      e.preventDefault();
      setBookPic(hover, f);
      return;
    }
  });
}
bkDrops(document.getElementById('bkmain'));

render();
renderBlind();
buildYears();
updateBadge();
syncExportBtn();
setView('arr');
initLog();

/* ================= world clocks ================= */
(function worldClocks(){
  const host = document.getElementById('clocks');
  if(!host) return;
  /* region -> [label, IANA zone]. The regions are the same six the agency filter uses;
     the cities are the model markets, plus the big ones next door to them. */
  const ZONES = {
    'Africa': [['South Africa · Cape Town','Africa/Johannesburg'],['Egypt · Cairo','Africa/Cairo'],
      ['Kenya · Nairobi','Africa/Nairobi'],['Morocco · Casablanca','Africa/Casablanca'],
      ['Nigeria · Lagos','Africa/Lagos'],['Senegal · Dakar','Africa/Dakar']],
    'Asia': [['China · Shanghai','Asia/Shanghai'],['Hong Kong','Asia/Hong_Kong'],
      ['India · Mumbai','Asia/Kolkata'],['Indonesia · Jakarta','Asia/Jakarta'],
      ['Israel · Tel Aviv','Asia/Jerusalem'],['Japan · Tokyo','Asia/Tokyo'],
      ['Kazakhstan · Almaty','Asia/Almaty'],['Korea · Seoul','Asia/Seoul'],
      ['Kyrgyzstan · Bishkek','Asia/Bishkek'],['Mongolia · Ulaanbaatar','Asia/Ulaanbaatar'],
      ['Philippines · Manila','Asia/Manila'],['Singapore','Asia/Singapore'],
      ['Taiwan · Taipei','Asia/Taipei'],['Thailand · Bangkok','Asia/Bangkok'],
      ['UAE · Dubai','Asia/Dubai'],['Uzbekistan · Tashkent','Asia/Tashkent'],
      ['Vietnam · Ho Chi Minh','Asia/Ho_Chi_Minh']],
    'Europe': [['Austria · Vienna','Europe/Vienna'],['Belgium · Brussels','Europe/Brussels'],
      ['Bulgaria · Sofia','Europe/Sofia'],['Croatia · Zagreb','Europe/Zagreb'],
      ['Czech Republic · Prague','Europe/Prague'],['Denmark · Copenhagen','Europe/Copenhagen'],
      ['Estonia · Tallinn','Europe/Tallinn'],['Finland · Helsinki','Europe/Helsinki'],
      ['France · Paris','Europe/Paris'],['Georgia · Tbilisi','Asia/Tbilisi'],
      ['Germany · Berlin','Europe/Berlin'],['Greece · Athens','Europe/Athens'],
      ['Hungary · Budapest','Europe/Budapest'],['Ireland · Dublin','Europe/Dublin'],
      ['Italy · Milan','Europe/Rome'],['Latvia · Riga','Europe/Riga'],
      ['Lithuania · Vilnius','Europe/Vilnius'],['Netherlands · Amsterdam','Europe/Amsterdam'],
      ['Norway · Oslo','Europe/Oslo'],['Poland · Warsaw','Europe/Warsaw'],
      ['Portugal · Lisbon','Europe/Lisbon'],['Romania · Bucharest','Europe/Bucharest'],
      ['Russia · Moscow','Europe/Moscow'],['Serbia · Belgrade','Europe/Belgrade'],
      ['Slovakia · Bratislava','Europe/Bratislava'],['Spain · Madrid','Europe/Madrid'],
      ['Sweden · Stockholm','Europe/Stockholm'],['Switzerland · Zurich','Europe/Zurich'],
      ['Turkey · Istanbul','Europe/Istanbul'],['Ukraine · Kyiv','Europe/Kyiv'],
      ['United Kingdom · London','Europe/London']],
    'North America': [['Canada · Toronto','America/Toronto'],['Canada · Vancouver','America/Vancouver'],
      ['Mexico · Mexico City','America/Mexico_City'],['United States · New York','America/New_York'],
      ['United States · Chicago','America/Chicago'],['United States · Los Angeles','America/Los_Angeles'],
      ['United States · Miami','America/New_York']],
    'Oceania': [['Australia · Sydney','Australia/Sydney'],['Australia · Melbourne','Australia/Melbourne'],
      ['Australia · Perth','Australia/Perth'],['New Zealand · Auckland','Pacific/Auckland']],
    'South America': [['Argentina · Buenos Aires','America/Argentina/Buenos_Aires'],
      ['Brazil · São Paulo','America/Sao_Paulo'],['Chile · Santiago','America/Santiago'],
      ['Colombia · Bogotá','America/Bogota'],['Peru · Lima','America/Lima'],
      ['Uruguay · Montevideo','America/Montevideo']]
  };
  const RKO = {'Africa':'아프리카','Asia':'아시아','Europe':'유럽','North America':'북미',
    'Oceania':'오세아니아','South America':'남미'};
  const REGIONS = Object.keys(ZONES);
  const RSHORT = {'North America':'N. America','South America':'S. America'};
  const DEF = [['Europe','France · Paris'],['Europe','United Kingdom · London'],
               ['North America','United States · New York'],['Europe','Russia · Moscow'],
               ['Asia','China · Shanghai'],['Asia','Japan · Tokyo']];
  const N = DEF.length;
  /* a saved set shorter than N (the page once had three) keeps its picks and takes the
     defaults for the rest */
  const fill = v => v.concat(DEF.slice(v.length)).slice(0, N);
  /* a zone the browser cannot resolve is dropped rather than shown with a wrong time */
  for(const r of REGIONS) ZONES[r] = ZONES[r].filter(z => {
    try{ new Intl.DateTimeFormat('en', {timeZone: z[1]}); return true; }catch(e){ return false; }
  });
  const find = (r, lab) => (ZONES[r] || []).find(z => z[0] === lab);
  let SET = DEF.map(x => x.slice());
  try{
    const v = JSON.parse(localStorage.getItem('illum.clocks') || 'null');
    if(Array.isArray(v) && v.length && v.every(x => Array.isArray(x) && find(x[0], x[1])))
      SET = fill(v.map(x => [x[0], x[1]]));
  }catch(e){}
  window.CLOCKSET = () => SET.map(x => x.slice());
  window.CLOCKLOAD = v => {
    if(!(Array.isArray(v) && v.length && v.every(x => Array.isArray(x) && find(x[0], x[1]))))
      return;
    SET = fill(v.map(x => [x[0], x[1]]));
    try{ localStorage.setItem('illum.clocks', JSON.stringify(SET)); }catch(e){}
    build();
  };
  const ko = () => (typeof LANG !== 'undefined' && LANG === 'ko');
  const esc2 = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  /* the wall time in a zone, as numbers - read from Intl, never from an offset table,
     so summer time is whatever the zone itself says it is today */
  function partsIn(tz, d){
    const f = new Intl.DateTimeFormat('en-US', {timeZone: tz, hourCycle: 'h23', weekday: 'short',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'});
    const o = {};
    for(const p of f.formatToParts(d)) o[p.type] = p.value;
    const h = (+o.hour) % 24;
    return {h: h, m: +o.minute, s: +o.second, wd: o.weekday, mo: +o.month, dd: +o.day,
            stamp: Date.UTC(+o.year, +o.month - 1, +o.day, h, +o.minute)};
  }
  const WDLONG = {Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',Fri:'Friday',
    Sat:'Saturday',Sun:'Sunday'};
  const MONTHS = ['January','February','March','April','May','June','July','August',
    'September','October','November','December'];
  const WDKO = {Mon:'월',Tue:'화',Wed:'수',Thu:'목',Fri:'금',Sat:'토',Sun:'일'};
  const OPEN = 9, SHUT = 18;   // office hours, local
  function status(p){
    const wk = (p.wd === 'Sat' || p.wd === 'Sun');
    const t = p.h + p.m / 60;
    if(wk) return ['wknd', ko() ? '주말' : 'Weekend'];
    if(t >= OPEN && t < SHUT){
      const left = SHUT - t;
      if(left <= 1) return ['edge', ko() ? '곧 마감' : 'Closing soon'];
      return ['open', ko() ? '업무 중' : 'In office'];
    }
    if(t >= OPEN - 1 && t < OPEN) return ['edge', ko() ? '곧 출근' : 'Opens soon'];
    if(t >= SHUT && t < SHUT + 2) return ['edge', ko() ? '퇴근 직후' : 'Just closed'];
    return ['shut', ko() ? '업무 외' : 'Out of hours'];
  }
  /* ---- the figures, drawn rather than typed ----
     Thin seven-segment digits with rounded ends, the way a bedside display draws them.
     Every segment is laid down once; a tick only switches segments on and off, so the
     page never rebuilds the clock face and nothing else on it is disturbed. */
  const SEGS = {a:[1.4,1,8.6,1], b:[9,1.4,9,8.6], c:[9,9.4,9,16.6], d:[1.4,17,8.6,17],
                e:[1,9.4,1,16.6], f:[1,1.4,1,8.6], g:[1.4,9,8.6,9]};
  const DIGIT = ['abcdef','bc','abged','abgcd','fgbc','afgcd','afgedc','abc','abcdefg','abcdfg'];
  const digitG = (x, k) => '<g class="sd" data-k="' + k + '" transform="translate(' + x + ',1)">' +
    Object.keys(SEGS).map(n => '<line data-s="' + n + '" x1="' + SEGS[n][0] + '" y1="' + SEGS[n][1] +
      '" x2="' + SEGS[n][2] + '" y2="' + SEGS[n][3] + '"/>').join('') + '</g>';
  const SEGHM = '<svg class="seg7" viewBox="-1 0 57 20" aria-hidden="true">' +
    digitG(0, 'h1') + digitG(13, 'h2') +
    '<circle class="sc" cx="27.5" cy="6.5" r="1"/><circle class="sc" cx="27.5" cy="12.5" r="1"/>' +
    digitG(32, 'm1') + digitG(45, 'm2') + '</svg>';
  const SEGSS = '<svg class="seg7 ss7" viewBox="-1 0 25 20" aria-hidden="true">' +
    digitG(0, 's1') + digitG(13, 's2') + '</svg>';
  function setDigit(c, k, d){
    const g = c.querySelector('.sd[data-k="' + k + '"]');
    if(!g || g.dataset.d === String(d)) return;
    g.dataset.d = String(d);
    const on = DIGIT[d] || '';
    for(const l of g.children){
      const v = on.indexOf(l.dataset.s) >= 0 ? '1' : '0';
      if(l.getAttribute('data-on') !== v) l.setAttribute('data-on', v);
    }
  }

  /* ---- the classic dial behind each card ----
     Wood rim, brass ring, cream face, Roman numerals and black spade hands. It is drawn
     once per card; a tick only turns the three hands. */
  const ROMAN = ['XII','I','II','III','IIII','V','VI','VII','VIII','IX','X','XI'];
  const FACE = (function(){
    let t = '';
    for(let k = 0; k < 60; k++){
      const hr = k % 5 === 0, q = k % 15 === 0;
      t += '<line class="' + (q ? 'tq' : hr ? 'th' : 'tm') + '" x1="0" y1="' + (q ? -70 : hr ? -76 : -82) +
        '" x2="0" y2="-88" transform="rotate(' + (k * 6) + ')"/>';
    }
    return '<svg class="ckface" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">' +
      '<circle class="ckring" r="95"/>' +
      '<g class="cktk">' + t + '</g>' +
      '<g class="ckhh"><line x1="0" y1="10" x2="0" y2="-46"/></g>' +
      '<g class="ckmh"><line x1="0" y1="14" x2="0" y2="-70"/></g>' +
      '<g class="cksh"><line x1="0" y1="20" x2="0" y2="-80"/><circle cy="-80" r="0"/></g>' +
      '<circle class="ckpin" r="4.5"/><circle class="ckpin2" r="1.8"/></svg>';
  })();
  function card(i){
    const r = SET[i][0], lab = SET[i][1];
    const ro = REGIONS.map(x => '<option value="' + esc2(x) + '"' + (x === r ? ' selected' : '') + '>' +
      esc2(ko() ? RKO[x] : (RSHORT[x] || x)) + '</option>').join('');
    const co = ZONES[r].map(z => '<option value="' + esc2(z[0]) + '"' + (z[0] === lab ? ' selected' : '') +
      '>' + esc2(z[0].split(' · ').reverse().join(', ')) + '</option>').join('');
    const parts = lab.split(' · ');
    const city = parts.length > 1 ? parts[1] : parts[0];
    const ctry = parts.length > 1 ? parts[0] : '';
    return '<div class="clk" data-i="' + i + '">' + FACE +
      '<div class="ckh"><span class="ckc" title="' + esc2(lab) + '">' + esc2(city) +
        (ctry ? '<em>' + esc2(ctry) + '</em>' : '') + '</span><i class="ckdot" data-s="open"></i>' +
        '<button type="button" class="ckgrip" title="' + (ko() ? '끌어서 순서 바꾸기' : 'Drag to reorder') +
        '" aria-label="' + (ko() ? '순서 바꾸기 (화살표 키)' : 'Reorder (arrow keys)') + '">' +
        '<svg viewBox="0 0 8 12" aria-hidden="true"><circle cx="2" cy="2" r="1"/><circle cx="6" cy="2" r="1"/>' +
        '<circle cx="2" cy="6" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="2" cy="10" r="1"/>' +
        '<circle cx="6" cy="10" r="1"/></svg></button></div>' +
      '<div class="ckr"><span class="ckt"><span class="hm">--:--</span>' + SEGHM +
        '<span class="ckap"><b class="apw">--</b>' + SEGSS + '</span></span>' +
        '<span class="ckm"><span class="ofw">-</span></span></div>' +
      '<div class="ckd"><span class="dtw">-</span></div>' +
      '<div class="ckbar" aria-hidden="true"><s style="left:' + (OPEN / 24 * 100) + '%;width:' +
        ((SHUT - OPEN) / 24 * 100) + '%"></s><b></b></div>' +
      '<span class="ckst" data-s="open"><span class="stw">-</span></span>' +
      '<div class="ckp"><select data-k="r" aria-label="' + (ko() ? '지역' : 'Region') + '">' + ro +
        '</select><select data-k="c" aria-label="' + (ko() ? '국가·도시' : 'Country / city') + '">' + co +
        '</select></div></div>';
  }
  /* Texts are changed in place - nodeValue on the node already there - so the page's
     translation watcher, which listens for nodes being added, is not woken every tick. */
  const setTxt = (el, v) => { if(el && el.firstChild && el.firstChild.nodeValue !== v) el.firstChild.nodeValue = v; };
  function tick(){
    const now = new Date();
    const home = partsIn('Asia/Seoul', now);
    host.querySelectorAll('.clk').forEach(c => {
      const i = +c.dataset.i, z = find(SET[i][0], SET[i][1]);
      if(!z) return;
      const p = partsIn(z[1], now);
      setTxt(c.querySelector('.hm'), ((p.h % 12) || 12) + ':' + String(p.m).padStart(2, '0'));
      /* the card's own light: day, dusk (and dawn), night - by the hour where they are */
      const ph = (p.h >= 7 && p.h < 17) ? 'day' : ((p.h >= 17 && p.h < 20) || (p.h >= 5 && p.h < 7)) ? 'dusk' : 'night';
      if(c.dataset.phase !== ph) c.dataset.phase = ph;
      /* twelve-hour face: 12 at noon and midnight, and no leading zero - the first
         digit simply stays dark, as on a real display */
      const h12 = (p.h % 12) || 12;
      setDigit(c, 'h1', h12 >= 10 ? 1 : 'x'); setDigit(c, 'h2', h12 % 10);
      /* a one-digit hour closes up rather than leaving an empty slot at the left */
      const vb = h12 >= 10 ? '-1 0 57 20' : '11.5 0 44.5 20';
      const sv = c.querySelector('.seg7:not(.ss7)');
      if(sv && sv.getAttribute('viewBox') !== vb) sv.setAttribute('viewBox', vb);
      setTxt(c.querySelector('.apw'), p.h < 12 ? (ko() ? '오전' : 'AM') : (ko() ? '오후' : 'PM'));
      setDigit(c, 'm1', Math.floor(p.m / 10)); setDigit(c, 'm2', p.m % 10);
      setDigit(c, 's1', Math.floor(p.s / 10)); setDigit(c, 's2', p.s % 10);
      const hd = (h12 % 12 + p.m / 60) * 30, md = (p.m + p.s / 60) * 6, sd = p.s * 6;
      const hh = c.querySelector('.ckhh'), mh = c.querySelector('.ckmh'), sh = c.querySelector('.cksh');
      /* the clock hands move only where the clock face is showing */
      if(sh && sh.getClientRects().length){
      if(hh) hh.setAttribute('transform', 'rotate(' + hd.toFixed(2) + ')');
      if(mh) mh.setAttribute('transform', 'rotate(' + md.toFixed(2) + ')');
      sh.setAttribute('transform', 'rotate(' + sd + ')'); }
      const st = status(p);
      for(const el of c.querySelectorAll('.ckst,.ckdot')) if(el.dataset.s !== st[0]) el.dataset.s = st[0];
      setTxt(c.querySelector('.stw'), st[1]);
      const dh = Math.round((p.stamp - home.stamp) / 36e5 * 2) / 2;
      const off = dh === 0 ? (ko() ? '서울과 동일' : '= Seoul')
        : ((dh > 0 ? '+' : '−') + Math.abs(dh) + 'h');
      setTxt(c.querySelector('.ofw'), off);
      setTxt(c.querySelector('.dtw'), ko()
        ? p.mo + '월 ' + p.dd + '일 (' + (WDKO[p.wd] || p.wd) + ')'
        : p.wd + ' ' + p.dd + ' ' + MONTHS[p.mo - 1].slice(0, 3));
      const b = c.querySelector('.ckbar b');
      const pct = ((p.h + p.m / 60) / 24 * 100).toFixed(2) + '%';
      if(b.style.left !== pct) b.style.left = pct;
      { const tt = (ko() ? '서울 대비 시차 · 현지 업무시간 09:00–18:00 기준' : 'Time difference vs Seoul · office hours taken as 09:00–18:00 local'); if(c.title !== tt && !c.dataset.illuTitle) c.title = tt; }
    });
  }
  function build(){
    host.innerHTML = SET.map((x, i) => card(i)).join('');
    tick();
  }
  function save(){
    try{ localStorage.setItem('illum.clocks', JSON.stringify(SET)); }catch(e){}
    try{ if(typeof savePrefsUI === 'function') savePrefsUI(); }catch(e){}
  }
  host.addEventListener('change', e => {
    const sel = e.target.closest('select');
    if(!sel) return;
    const c = sel.closest('.clk'), i = +c.dataset.i;
    if(sel.dataset.k === 'r'){
      const r = sel.value;
      if(!ZONES[r] || !ZONES[r].length) return;
      SET[i] = [r, ZONES[r][0][0]];
    } else {
      if(!find(SET[i][0], sel.value)) return;
      SET[i] = [SET[i][0], sel.value];
    }
    c.outerHTML = card(i);
    tick();
    save();
  });
  /* ---- moving the widgets ----
     Grab a card by its grip and drag it along the row; the others step aside as it
     passes. On a keyboard the grip takes the arrow keys. The new order is the saved
     order, the same as a changed city. */
  function commitOrder(movedFrom){
    const order = [...host.querySelectorAll('.clk')].map(c => +c.dataset.i);
    if(order.every((v, k) => v === k)) return;
    SET = order.map(k => SET[k]);
    build();
    const at = order.indexOf(movedFrom);
    const landed = host.querySelectorAll('.clk')[at];
    if(landed){ landed.classList.add('landed'); setTimeout(() => landed.classList.remove('landed'), 600); }
    save();
    return at;
  }
  let drag = null;
  host.addEventListener('pointerdown', e => {
    const grip = e.target.closest('.ckgrip');
    if(!grip || e.button !== 0) return;
    e.preventDefault();
    const c = grip.closest('.clk');
    drag = {c: c, id: e.pointerId, from: +c.dataset.i};
    c.classList.add('dragging');
    host.classList.add('reorder');
    try{ grip.setPointerCapture(e.pointerId); }catch(err){}
  });
  host.addEventListener('pointermove', e => {
    if(!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    const over = document.elementsFromPoint(e.clientX, e.clientY)
      .map(el => el && el.closest ? el.closest('.clk') : null)
      .find(x => x && x.parentElement === host);
    if(!over || over === drag.c) return;
    const r = over.getBoundingClientRect();
    const after = e.clientX > r.left + r.width / 2;
    host.insertBefore(drag.c, after ? over.nextSibling : over);
  });
  const endDrag = e => {
    if(!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag; drag = null;
    d.c.classList.remove('dragging');
    host.classList.remove('reorder');
    commitOrder(d.from);
  };
  host.addEventListener('pointerup', endDrag);
  host.addEventListener('pointercancel', endDrag);
  host.addEventListener('keydown', e => {
    const grip = e.target.closest && e.target.closest('.ckgrip');
    if(!grip) return;
    const step = {ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1}[e.key];
    if(!step) return;
    e.preventDefault();
    const c = grip.closest('.clk');
    const sib = step < 0 ? c.previousElementSibling : c.nextElementSibling;
    if(!sib) return;
    host.insertBefore(c, step < 0 ? sib : sib.nextSibling);
    const at = commitOrder(+c.dataset.i);
    const g = host.querySelectorAll('.clk .ckgrip')[at];
    if(g) g.focus();
  });
  const lb = document.getElementById('langbtn');
  if(lb) lb.addEventListener('click', () => setTimeout(build, 0));
  build();
  /* aligned to the second so the hand never stutters */
  setTimeout(function go(){ tick(); setTimeout(go, 1000 - (Date.now() % 1000) + 5); },
             1000 - (Date.now() % 1000) + 5);
})();

/* ================= agencies by continent =================
   A flat map beside the clocks. Each continent carries the number of agencies in the
   Directory, counted from the same list the Directory draws, so it grows by itself
   as agencies are added. A press on a continent opens the Directory filtered to it. */
(function worldMap(){
  const box = document.getElementById('wmap');
  if(!box) return;
  const W = 360, H = 170;
  const PATHS = {"Oceania": "M358.1,116.5L358.4,116.3L358.7,116.6L358.6,117.2L357.9,117.3L357.4,117.2L357.3,116.7L357.7,116.4ZM360,115.6L359.4,115.8L358.7,116L358.6,115.6L359.1,115.4L359.4,115.4L360,115.1L360,115.1L360,115.6ZM0,115.1L0,115.1L0,115.1L0.2,115L0.1,115.5L0,115.6L0,115.6L0,115.1ZM321,101.6L322.7,102.3L324.6,102.9L325.3,103.4L325.8,103.9L326,104.5L327.6,105.1L327.9,105.6L327,105.7L327.2,106.4L328.1,107L328.7,108.1L329.3,108.1L329.3,108.5L330,108.7L329.7,108.9L330.8,109.3L330.7,109.6L330,109.7L329.8,109.4L328.9,109.3L327.9,109.1L327.1,108.5L326.6,107.9L326,107.1L324.7,106.6L323.9,106.9L323.3,107.2L323.4,108L322.6,108.3L322.1,108.2L321,108.1L321,104.9ZM332.6,102.7L333,103L333.1,103.5L332.8,103.8L332.6,103.2L332.4,102.8L332,102.5L331.4,102L330.7,101.7L330.9,101.5L331.5,101.8L331.8,102L332.2,102.2ZM331.3,104.8L330.8,105.1L330.2,105.3L329.7,105.3L328.9,105L328.3,104.7L328.4,104.4L329.3,104.6L329.8,104.5L330,104L330.1,104L330.2,104.5L330.8,104.5L331.1,104.1L331.6,103.8L331.5,103.2L332.1,103.1L332.3,103.3L332.3,103.9L332,104.5L331.5,104.6ZM334.8,104.3L335.1,104.6L335.5,105.2L336,105.5L335.9,105.8L335.6,105.9L335.2,105.5L334.7,104.9L334.5,104.1L334.7,104ZM305,107.9L305.1,107.7L305.9,107.4L306.6,107.4L307,107.3L307.3,107.4L307,107.7L305.9,108.1L305.1,108.4L305.1,108.1ZM347.2,114.9L347.8,115.5L347.5,115.6L347.2,115.2ZM346.8,114.7L346.7,114.4L346.6,113.6L347.1,113.9L347.3,114.7L347,114.6ZM345.8,120.1L346.6,120.7L347.1,121.2L346.7,121.4L346.2,121.1L345.5,120.7L344.8,120.1L344.2,119.4L344,119.1L344.5,119.1L345,119.5L345.5,119.8ZM342.1,109.5L342.4,109.8L341.7,109.8L341.3,109.2L341.9,109.4ZM341.7,108.6L341.5,108.8L340.8,107.9L340.6,107.3L340.9,107.3L341.3,108.1ZM340.9,108.9L340.5,108.9L339.9,108.8L339.6,108.6L339.7,108.2L340.4,108.4L340.7,108.6ZM339.6,107L339.9,107.3L339.9,107.5L339.1,107.1L338.6,106.8L338.2,106.4L338.4,106.3L338.8,106.6ZM337.1,106L337.5,106.3L337.3,106.4L336.9,106.2L336.5,105.8L336.5,105.6ZM356.9,139.1L356.5,139.6L356,140.3L355.2,140.7L355.1,140.4L354.7,140.3L355.2,139.5L354.9,138.9L353.8,138.5L353.9,138.1L354.6,137.8L354.7,137L354.7,136.4L354.3,135.7L354.3,135.5L353.8,135.1L353.1,134.2L352.6,133.5L353,133.5L353.6,134L354.3,134.3L354.6,135.2L355.3,136.2L355.4,135.5L355.8,135.8L356,136.6L356.8,136.9L357.4,137L358,136.6L358.5,136.7L358.3,137.6L358,138.2L357.2,138.1L356.9,138.4L357,138.9ZM349.7,142.6L350.5,142L351.1,141.5L351.6,140.8L352,140.5L352.1,140L352.8,139.5L353,139.9L353.2,140.3L354,139.9L354.2,140.3L354.2,140.8L353.9,141.2L353.2,142L352.7,142.4L353.1,142.9L352.3,142.9L351.5,143.2L351.2,143.9L350.6,144.9L349.8,145.4L349.3,145.6L348.4,145.6L347.8,145.3L346.7,145.2L346.5,144.9L347,144.1L348.3,143.1L348.9,142.9ZM327.7,139.8L328.3,139.9L328.4,141.1L328,141.4L327.9,142.2L327.6,141.9L326.9,142.6L326.7,142.6L326,142.5L325.4,141.7L325.3,141L324.7,140.2L324.7,139.7L325.4,139.8L326.4,140.1L326.9,140ZM306.1,131.2L305.1,131.7L304.2,132L304,132.5L303.7,132.9L302.8,132.9L302.2,133L301.3,132.8L300.6,132.9L299.9,133L299.3,133.5L299,133.5L298.5,133.7L298,134.1L297.3,134L296.6,134L295.6,133.4L295,133.2L295,132.6L295.5,132.5L295.7,132.3L295.7,131.9L295.8,131.2L295.7,130.6L295.2,129.6L295,129L295,128.5L294.6,127.8L294.6,127.5L294.2,127.1L294,126.3L293.5,125.5L293.3,125.1L293.8,125.5L293.4,124.6L293.9,124.9L294.2,125.3L294.2,124.8L293.7,124L293.6,123.7L293.4,123.4L293.5,122.8L293.7,122.6L293.8,122.1L293.7,121.5L294.1,120.8L294.2,121.5L294.6,120.8L295.5,120.5L295.9,120.1L296.7,119.7L297.2,119.6L297.4,119.7L298.2,119.4L298.8,119.3L299,119L299.3,119L299.8,119L300.9,118.7L301.4,118.2L301.7,117.7L302.2,117.2L302.3,116.8L302.3,116.3L303,115.4L303.4,116.3L303.9,116.1L303.5,115.6L303.8,115.1L304.3,115.3L304.4,114.6L304.9,114.1L305.2,113.7L305.7,113.5L305.7,113.2L306.1,113.3L306.1,113.1L306.6,113L307.1,112.8L307.8,113.3L308.4,113.9L309,113.9L309.6,114L309.4,113.4L309.9,112.6L310.3,112.4L310.2,112.1L310.6,111.5L311.2,111.2L311.7,111.3L312.6,111.1L312.6,110.6L311.8,110.3L312.4,110.1L313,110.4L313.6,110.8L314.4,111L314.7,110.9L315.3,111.2L315.9,111L316.3,111L316.5,110.9L317,111.4L316.7,111.9L316.3,112.3L316,112.3L316.1,112.7L315.8,113.2L315.4,113.7L315.5,114L316.3,114.6L317.1,114.9L317.6,115.2L318.3,115.8L318.6,115.8L319.1,116.1L319.3,116.4L320.2,116.7L320.9,116.4L321.1,115.8L321.3,115.4L321.4,114.8L321.7,114L321.6,113.6L321.6,113.3L321.5,112.7L321.7,111.9L321.8,111.7L321.7,111.4L321.9,110.9L322.1,110.3L322.1,110L322.5,109.7L322.8,110.2L322.9,110.8L323.1,110.9L323.2,111.3L323.5,111.8L323.6,112.4L323.6,112.8L323.9,113.5L324.6,113.2L324.9,113.6L325.4,114L325.3,114.4L325.5,115.3L325.6,115.8L325.9,115.9L326.2,116.8L326.1,117.3L326.4,118L327.5,118.5L328.2,119L328.8,119.4L328.7,119.6L329.3,120.3L329.7,121.3L330.1,121.1L330.5,121.6L330.7,121.4L330.9,122.5L331.6,123.1L332.1,123.5L332.9,124.3L333.1,125.1L333.2,125.6L333.1,126.3L333.6,127.1L333.5,128L333.3,128.5L333.1,129.4L333.1,129.9L332.9,130.6L332.4,131.6L331.7,132L331.3,132.8L331,133.3L330.7,134.2L330.3,134.7L330.1,135.4L329.9,136.1L330,136.4L329.4,136.8L328.3,136.8L327.4,137.2L326.9,137.6L326.3,138L325.5,137.6L324.9,137.4L325,136.9L324.5,137.1L323.6,137.8L322.7,137.5L322.2,137.4L321.6,137.3L320.6,137L320,136.4L319.8,135.6L319.6,135.1L319.1,134.7L318.1,134.6L318.4,134.1L318.2,133.4L317.7,134.1L316.8,134.3L317.4,133.7L317.5,133.1L317.9,132.6L317.8,131.9L317,132.8L316.4,133.1L316,133.9L315.2,133.5L315.2,132.9L314.6,132.2L314.1,131.8L314.3,131.6L313,131L312.3,131L311.3,130.5L309.5,130.6L308.2,130.9L307.1,131.3Z", "Africa": "M219.2,103.7L218.7,104.9L218.8,105.5L219.4,105.8L219.5,106.1L219.2,106.7L219.3,107L219.2,107.5L219.5,108.1L220,109.1L220.3,109.3L220.5,109.8L220.4,110.8L220.6,111.6L220.6,113.2L220.8,113.7L220.5,114.4L220.1,115.1L219.5,115.7L218.5,116.1L217.4,116.6L216.3,117.7L215.9,117.8L215.2,118.6L214.8,118.8L214.7,119.5L215.2,120.3L215.4,120.8L215.4,121.1L215.6,121.1L215.5,122.1L215.4,122.5L215.6,122.7L215.5,123.1L215,123.5L214.2,123.8L213,124.4L212.6,124.7L212.7,125.1L212.9,125.2L212.8,125.7L212.6,126.5L212.5,127.3L212.2,127.8L211.5,128.3L211.3,128.4L210.9,128.9L210.6,129.4L210.1,130.1L208.9,131.2L208.2,131.8L207.5,132.2L206.4,132.6L205.9,132.7L205.8,132.9L205.2,132.8L204.7,133L203.6,132.8L203,132.9L202.6,132.9L201.5,133.3L200.7,133.4L200.1,133.8L199.6,133.8L199.2,133.5L198.9,133.4L198.4,133L198.4,133.1L198.2,132.9L198.3,132.3L197.9,131.6L198.2,131.4L198.2,130.7L197.6,129.7L197.1,128.9L197.1,128.9L196.3,127.6L195.6,126.8L195.2,126.1L195,125.1L194.7,124.4L194.4,122.9L194.4,121.7L194.3,121.1L193.9,120.7L193.4,119.9L192.8,118.7L192.6,118L191.8,117.1L191.7,116.3L191.6,115.7L191.8,114.8L192.1,113.9L192.2,113.4L192.5,112.5L192.7,112.1L193.3,111.5L193.6,111L193.7,110.3L193.7,109.7L193.4,109.4L193.1,108.8L192.9,108.2L192.9,108L193.2,107.6L192.9,106.6L192.7,105.9L192.2,105.3L192.3,105.1L192.2,104.8L191.9,104L191.1,103L190.1,102L189.4,101.1L188.8,100.1L188.8,99.8L189,99.5L189.3,98.7L189.5,98L189.3,97.8L189.6,96.7L189.8,95.9L189.4,95.3L188.9,95.1L188.7,94.6L188.5,94.5L188.5,94.2L187.5,94.6L187.1,94.5L186.7,94.8L185.9,94.7L185.4,94.1L185,93.4L184.3,92.7L183.6,92.7L182.7,92.7L181.9,92.9L181.1,93.1L179.5,93.7L178.9,94L178,94.3L177.1,94L176.7,94L176,93.8L175.4,93.8L174.2,94L173.5,94.3L172.5,94.7L172.3,94.6L172,94.6L171,94.2L170.1,93.4L169.2,92.9L168.6,92.2L168.3,92.1L167.6,91.7L167.1,91.2L166.9,90.8L166.8,90.1L166.3,89.5L165.9,89.1L165.7,89L165.4,88.8L165.3,88.3L165.2,88.1L164.9,88L164.3,87.5L163.9,87.5L163.7,87.2L163.7,87L163.4,86.8L163.3,86.6L163.2,85.8L163.3,85.4L162.9,84.6L162.4,84.3L162.8,84.1L163.3,83.4L163.5,82.9L163.4,82.3L163.7,81.8L163.9,80.9L163.7,79.9L163.6,79.4L163.7,78.9L163.5,78.4L162.9,78L163,77.6L163,77.1L163.4,76.8L163.7,76.3L163.7,76L164,75.3L164.6,74.6L164.9,74.5L165.2,73.9L165.2,73.4L165.6,72.7L166.2,72.4L166.9,71.4L166.9,71.3L167.4,71L168.3,70.9L169.1,70.2L169.6,69.9L170.4,69.1L170.2,67.8L170.6,67L170.7,66.4L171.3,65.8L172.3,65.3L173.1,64.9L173.8,63.9L174.1,63.2L174.8,63.2L175.4,63.7L176.4,63.6L177.4,63.8L177.8,63.8L178.8,63.3L179.9,63.1L180.5,62.7L181.5,62.4L183.2,62.2L184.8,62.1L185.3,62.3L186.3,61.9L187.3,61.9L187.7,62.1L188.4,62.1L189.5,61.6L190.2,61.8L190.2,62.3L191,61.9L191.1,62.1L190.6,62.6L190.6,63.1L190.9,63.3L190.8,64.2L190.2,64.7L190.3,65.2L190.9,65.2L191.1,65.7L191.5,65.9L192.7,66.2L193.1,66.1L193.9,66.3L195.2,66.7L195.7,67.6L196.6,67.8L198,68.2L199.1,68.7L199.6,68.5L200.1,68L199.8,67.2L200.1,66.8L200.9,66.3L201.5,66.2L202.9,66.4L203.2,66.8L203.6,66.8L203.9,67L204.9,67.1L205.2,67.4L206.5,67.4L207.5,67.7L208.4,68L208.9,68.1L209.7,67.8L210.1,67.5L211,67.4L211.7,67.6L212,68.1L212.2,67.7L213,68L213.8,68L214.3,67.8L214.8,69.2L214.9,69.5L214.6,69.9L214.4,70.7L214.2,71.2L213.9,71.4L213.6,71L213.1,70.6L212.4,69.1L212.3,69.2L212.7,70.3L213.3,71.3L214.1,72.9L214.5,73.4L214.8,74L215.7,75.1L215.5,75.2L215.5,75.9L216.7,76.8L216.9,77L217.2,78L217,78.2L217.1,79.2L217.5,80.4L217.9,80.6L218.4,81L219,82.2L219.3,83.1L219.8,83.6L221.2,84.5L221.7,85.1L222.3,85.7L222.6,86L223.1,86.3L223.3,86.6L223.3,87L222.7,87.3L223.1,87.5L223.5,87.7L223.7,88.1L224.1,88.6L224.6,88.6L225.6,88.3L226.6,88.2L227.5,87.9L228,87.8L228.4,87.6L228.9,87.6L229.3,87.6L229.7,87.4L230.3,87.3L230.7,87L231.1,87L231.1,87.3L231,87.8L231,88.4L230.8,88.7L230.6,89.8L230.1,90.9L229.5,92.2L228.6,93.7L227.7,94.8L226.6,96.1L225.6,97L224.1,97.9L223.1,98.7L222,99.9L221.8,100.4L221.6,100.7L220.9,101.1L220.6,101.5L220.3,101.6L220.1,102.3L219.8,102.7L219.6,103.3ZM229.5,111.5L229.8,111.9L230.1,112.6L230.2,113.8L230.5,114.2L230.4,114.7L230.2,115L229.9,114.4L229.7,114.7L229.9,115.5L229.8,115.9L229.5,116.1L229.4,117L229,118.1L228.5,119.5L227.9,121.4L227.5,122.8L227.1,123.9L226.3,124.2L225.4,124.6L224.8,124.3L224,124L223.8,123.5L223.7,122.6L223.3,121.8L223.3,121.1L223.4,120.3L223.9,120.2L223.9,119.8L224.4,119.1L224.5,118.4L224.2,118L224,117.3L224,116.4L224.3,115.9L224.4,115.2L224.9,115.2L225.5,115L225.9,114.8L226.3,114.8L226.9,114.2L227.7,113.6L228,113.1L227.9,112.7L228.3,112.8L228.8,112.1L228.9,111.5L229.2,111Z", "North America": "M39,29.3L40.9,29.5L42.5,30L43.5,30.1L44.4,29.7L45.6,29.4L47.1,29.5L48.6,29.1L50.2,28.8L50.9,29.2L51.6,29L51.9,28.5L52.6,28.6L54.2,29.5L55.6,28.8L55.7,29.6L56.9,29.4L57.3,29.1L58.5,29.2L60.1,29.6L62.4,30L63.8,30.2L64.8,30.1L66.1,30.6L64.7,31.1L66.5,31.3L69.2,31.2L70.1,31L71.1,31.6L72.2,31.1L71.2,30.7L71.8,30.3L73,30.3L73.9,30.2L74.7,30.4L75.7,31L76.8,30.9L78.5,31.4L80.1,31.2L81.6,31.2L81.4,30.6L82.3,30.4L83.9,30.8L83.9,31.7L84.5,30.9L85.3,30.9L85.8,29.9L84.7,29.3L83.5,28.9L83.6,27.8L84.8,27.1L86.1,27.2L87.1,27.7L88.5,28.8L87.6,29.3L89.5,29.5L89.5,30.5L90.8,29.7L92,30.4L91.7,31.1L92.7,31.8L93.7,31.1L94.4,30.2L94.5,29.1L95.9,29.2L97.4,29.3L98.7,29.8L98.8,30.3L98,30.9L98.7,31.4L98.6,31.9L96.7,32.6L95.3,32.7L94.2,32.4L93.9,32.9L93,33.8L92.7,34.2L91.5,34.9L90.1,35L89.3,35.4L89.2,36L88.1,36.2L86.8,37L85.8,38.1L85.4,38.9L85.3,40.1L86.8,40.2L87.2,41.2L87.7,41.9L89.1,41.7L91,42.1L92,42.5L92.7,43L93.9,43.3L95,43.7L96.6,43.8L97.7,43.9L97.6,44.7L97.9,45.7L98.6,46.8L100.1,47.8L100.9,47.5L101.4,46.4L100.9,44.9L100.2,44.3L101.8,43.9L102.9,43.2L103.5,42.5L103.4,41.8L102.7,40.9L101.5,40.2L102.7,39.1L102.2,38.2L101.9,36.7L102.6,36.4L104.3,36.7L105.3,36.8L106.2,36.6L107.1,36.9L108.3,37.5L108.6,37.9L110.4,37.9L110.4,38.8L110.7,40L111.6,40.2L112.3,40.8L113.8,40.2L114.8,39.1L115.4,38.7L116.2,39.6L117.5,40.8L118.6,42L118.2,42.7L119.5,43.2L120.4,43.8L122,44.1L122.7,44.4L123.1,45.2L123.8,45.4L124.2,45.7L124.3,46.9L123.6,47.2L122.9,47.6L121.2,47.9L120,48.8L118.3,48.9L116.1,48.7L114.6,48.7L113.6,48.8L112.8,49.5L111.5,49.9L110,51.3L108.9,52.2L109.7,52L111.3,50.7L113.4,49.9L114.9,49.8L115.8,50.3L114.9,50.9L115.2,52L115.5,52.8L116.8,53.3L118.5,53.1L119.5,52L119.5,52.7L120.2,53.1L119,53.7L116.7,54.3L115.8,54.7L114.6,55.5L113.9,55.4L113.8,54.5L115.6,53.7L114,53.7L112.9,53.9L113,54.2L112,54.7L110.9,55L109.9,55.3L109.4,55.9L109.2,56.1L109.2,56.7L109.5,57.2L109.9,57.2L109.8,56.9L110.1,57.1L110,57.4L109.4,57.5L108.9,57.5L108.1,57.7L107.7,57.7L107.1,57.8L106.3,58.1L107.8,57.9L108.1,58.1L106.7,58.4L106,58.4L106,58.2L105.7,58.5L106,58.6L105.8,59.3L105.1,60.1L105,59.8L104.8,59.8L104.5,59.5L104.7,60L104.9,60.2L104.9,60.6L104.6,61L104.1,61.8L104,61.7L104.3,61.1L103.8,60.7L103.6,59.9L103.5,60.3L103.7,60.9L103,60.8L103.7,61.1L103.7,62L104,62.1L104.1,62.4L104.3,63.4L103.6,64.2L102.6,64.5L101.9,65.1L101.4,65.1L100.9,65.5L100.8,65.8L99.7,66.5L99.1,67L98.7,67.6L98.5,68.3L98.7,69L99,69.8L99.5,70.5L99.5,71L99.9,72.1L99.9,72.8L99.9,73.2L99.6,73.8L99.3,73.9L98.8,73.8L98.7,73.4L98.3,73.1L97.8,72.3L97.3,71.5L97.1,71.1L97.3,70.4L97.1,69.9L96.3,69.1L95.9,68.9L94.9,69.4L94.7,69.3L94.2,68.8L93.6,68.6L92.5,68.7L91.6,68.6L90.8,68.7L90.4,68.8L90.6,69.1L90.6,69.5L90.8,69.7L90.6,69.8L90.2,69.7L89.8,69.9L89.1,69.9L88.4,69.3L87.5,69.4L86.8,69.2L86.2,69.3L85.3,69.5L84.4,70.3L83.4,70.7L82.9,71.2L82.6,71.6L82.6,72.3L82.7,72.8L82.9,73.1L82.5,74L82.3,74.7L82.2,76.1L82.1,76.6L82.3,77.1L82.6,77.6L82.8,78.4L83.5,79.1L83.7,79.7L84.1,80.2L85.2,80.4L85.6,80.9L86.5,80.6L87.2,80.5L88,80.3L88.6,80.1L89.2,79.7L89.5,79.1L89.5,78.3L89.7,78L90.4,77.7L91.5,77.5L92.3,77.5L92.9,77.5L93.2,77.7L93.2,78.2L92.6,78.7L92.4,79.4L92.6,79.5L92.4,80L92.2,80.7L91.9,80.5L91.7,80.5L91.7,80.6L91.9,80.7L91.9,80.9L91.7,81.4L91.8,81.5L91.7,81.9L91.8,82L91.6,82.5L91.4,82.7L91.3,82.8L91.1,83.1L91.4,83.3L91.5,83.1L91.8,83.3L91.9,83.3L92.1,83.1L92.4,83.1L92.5,83.2L92.6,83.2L93.1,83.2L93.6,83.2L93.9,83.1L94,83L94.3,83L94.6,83.1L94.8,83.1L95,83L95.5,83.1L95.6,83.2L95.9,83.4L96.2,83.6L96.6,83.7L96.9,84L96.8,84.1L96.7,84.3L96.8,84.7L96.6,85L96.5,85.4L96.4,85.9L96.5,86.1L96.5,86.6L96.4,86.7L96.3,87.1L96.3,87.4L96.1,87.6L96.2,87.9L96.3,88.1L96.6,88.6L97,89L97.5,89.4L97.8,89.8L97.8,90L98.2,90L98.3,90L98.6,90.2L99.1,90.1L99.5,89.9L100.1,89.7L100.4,89.4L101,89.4L100.9,89.5L101.5,89.6L101.9,89.8L102.3,90.1L102.6,90.3L102.5,90.5L102.8,91.1L102.6,91.4L102.2,91.3L102.1,91.8L101.8,91.5L101.6,90.9L101.8,90.7L101.6,90.6L101.4,90.3L100.9,90L100.4,90.1L100.2,90.4L99.8,90.7L99.6,90.7L99.5,90.9L100,91.5L99.7,91.6L99.6,91.7L99.1,91.8L98.9,91.2L98.8,91.4L98.5,91.3L98.3,90.9L97.9,90.8L97.6,90.7L97.2,90.7L97.2,90.9L97,90.8L96.5,90.6L96.3,90.3L96.4,90.2L96.4,89.9L96.1,89.7L95.7,89.5L95.4,89.4L95.3,89.1L95,88.9L95.1,89.2L94.9,89.4L94.7,89.2L94.3,89.1L94.2,88.9L94.2,88.6L94.3,88.2L94.1,88.1L94.3,87.9L93.9,87.6L93.5,87.2L93.3,86.9L92.8,86.5L92.3,86.1L92.4,85.9L92.6,86.1L92.7,86L92.5,85.7L92.2,85.6L92.1,85.9L91.5,85.8L91.2,85.7L90.7,85.5L90.2,85.5L89.9,85.3L89.4,85.1L88.8,85.1L88.3,84.9L87.8,84.5L86.6,83.4L86.1,83.1L85.3,82.8L84.7,82.9L83.9,83.2L83.4,83.3L82.7,83.1L82,82.9L81.1,82.4L80.3,82.3L79.2,81.8L78.3,81.4L78.1,81.1L77.5,81L76.5,80.7L76.1,80.3L75,79.7L74.5,79.1L74.3,78.6L74.6,78.5L74.5,78.2L74.7,77.9L74.7,77.6L74.4,77.1L74.3,76.7L74,76.2L73.1,75.2L72.1,74.5L71.6,73.8L70.7,73.4L70.6,73.2L70.7,72.6L70.2,72.3L69.6,71.8L69.4,71.1L68.8,71.1L68.2,70.5L67.8,70L67.7,69.7L67.2,69L66.8,68.2L66.9,67.8L66.1,67.4L65.8,67.5L65.2,67.2L65.1,67.6L65.2,68.1L65.3,68.8L65.7,69.2L66.4,69.9L66.6,70.2L66.7,70.2L66.9,70.6L67,70.6L67.2,71.2L67.5,71.5L67.8,71.8L68.4,72.3L68.7,73.3L69,73.7L69.3,74.2L69.3,74.7L69.8,74.7L70.2,75.2L70.6,75.6L70.6,75.8L70.1,76.2L70,76.2L69.7,75.6L69.1,75L68.3,74.5L67.8,74.3L67.8,73.5L67.7,73L67.2,72.7L66.5,72.2L66.4,72.4L66.2,72.1L65.5,71.9L64.9,71.3L65,71.2L65.4,71.3L65.8,70.9L65.8,70.4L65.1,69.7L64.5,69.4L64.1,68.8L63.7,68.2L63.3,67.4L62.9,66.5L62.7,66L62.1,65.4L61.6,65.3L61.5,65L60.9,64.9L60.6,64.7L59.6,64.6L59.4,64.4L59.3,63.8L58.3,62.8L57.5,61.4L57.5,61.2L57,60.9L56.3,60L56.1,59.2L55.6,58.7L55.8,57.9L55.8,57L55.5,56.2L55.9,55.3L56,54.4L56.1,53.5L55.9,52.1L55.6,51.3L55.3,50.8L55.4,50.6L56.9,51L57.4,51.9L57.7,51.6L57.5,50.8L57.2,50L57,50L55.1,49L54.4,48.6L52.6,48.2L52,47.3L52.2,46.7L50.9,46.2L50.7,45.4L49.5,44.7L49.5,44.2L48.9,43.8L48,43.5L47.8,42.6L46.5,41.8L45.9,40.9L45,40.8L43.4,40.8L42.2,40.5L40.1,39.5L39.2,39.3L37.4,38.9L36,39L34.1,38.5L32.9,38.1L31.8,38.3L32,39L31.4,39.1L30.3,39.3L29.4,39.6L28.3,39.8L28.1,39.3L28.6,38.3L29.7,38L29.4,37.7L28.1,38.3L27.4,38.9L26,39.6L26.7,40.1L25.8,40.9L24.7,41.3L23.7,41.6L23.4,42L21.9,42.5L21.6,43L20.4,43.4L19.7,43.4L18.8,43.6L17.8,44L16.9,44.3L15.2,44.6L15.1,44.4L16.2,44L17.1,43.7L18.2,43.1L19.4,43L19.9,42.6L21.3,42L21.5,41.8L22.3,41.4L22.4,40.7L23,40.1L21.8,40.4L21.5,40.2L20.9,40.6L20.3,40.1L20,40.4L19.6,39.9L18.6,40.3L18,40.3L17.9,39.7L18.1,39.4L17.5,39L16.2,39.2L15.3,38.7L14.7,38.5L14.6,37.9L13.9,37.5L14.3,36.9L15.1,36.4L15.4,35.9L16.2,35.8L16.9,35.9L17.7,35.5L18.5,35.5L19.2,35.2L19,34.8L18.5,34.6L19.2,34.2L18.6,34.2L17.5,34.4L17.2,34.7L16.5,34.4L15,34.6L13.6,34.3L13.2,33.9L11.9,33.3L13.3,32.9L15.5,32.4L16.3,32.4L16.2,32.9L18.3,32.9L17.5,32.3L16.3,31.9L15.6,31.4L14.6,31L13.2,30.6L13.8,30.1L15.6,30.1L16.8,29.6L17.1,29.1L18.1,28.7L19.1,28.6L21,28.1L21.9,28.2L23.4,27.6L24.9,27.9L25.7,28.3L26.1,28.1L27.8,28.2L27.7,28.4L29.3,28.6L30.3,28.5L32.4,28.8L34.3,28.9L35.1,29L36.4,28.8L37.9,29.1ZM96,36.5L96.8,36.1L98.1,36.1L98.1,36.3L96.9,36.8L96.2,36.8ZM100.2,26.2L99.1,25.7L99.2,25.3L99.6,25.2L101.9,25.3L103.7,25.9L103.7,26.2L102.7,26.1L101.6,26.1L100.5,26.3ZM99.7,36.9L100.1,36.6L100.5,36.6L100.7,36.8L100.3,37.4L99.9,37.3L99.6,37ZM86.4,24L85.8,24.4L84.4,24.3L83.2,24.1L83.7,23.6L85.1,23.4L86,23.7ZM86.2,21.5L85.7,21.5L83.8,21.4L83.6,21.2L85.6,21.2L86.3,21.4ZM83.2,20.2L84.4,20.6L84.2,20.9L82.7,21.2L81.9,20.9L81.4,20.5L81.4,20.1L82.7,20.2ZM91.9,24.6L90.2,24.5L87.6,24.2L87.2,23.6L87.1,23.1L86.1,22.7L84,22.6L82.9,22.2L83.3,21.8L85.3,21.9L86.4,22.2L88.4,22.2L89.3,22.5L89,22.9L90.2,23.2L90.8,23.4L92.2,23.4L93.6,23.5L95.2,23.3L97.2,23.2L98.9,23.3L99.9,23.7L100.2,24.1L99.5,24.3L98.1,24.6L96.8,24.4L93.9,24.6ZM68.7,20.8L70.1,21L69.8,21.3L67.9,21.6L66.5,21.3L67.3,20.9ZM69,20.2L70.3,20.4L69.1,20.6L67.5,20.6L67.5,20.4L68.5,20.1ZM124.4,47.7L123.9,48.3L123.2,49.2L123.9,48.9L124.5,49.1L124.2,49.4L125.1,49.7L125.5,49.4L126.5,49.8L126.2,50.5L126.9,50.3L127,50.8L127.4,51.5L126.9,52.3L126.5,52.4L125.8,52.2L126,51.4L125.8,51.2L124.6,52.1L124,52.1L124.7,51.6L123.7,51.4L122.7,51.4L120.7,51.4L120.6,51.1L121.2,50.7L120.8,50.5L121.6,49.9L122.6,48.3L123.3,47.7L124.1,47.4L124.6,47.4ZM96.1,33.9L97.2,34.2L98.4,34.5L98.4,35L99.2,34.9L99.9,35.3L99,35.6L97.5,35.3L96.9,34.9L95.9,35.4L94.5,35.9L94.1,35.4L92.8,35.5L93.6,35L93.8,34.2L94.1,33.3L94.8,33.3L95,33.8L95.5,33.6ZM101.2,26.6L102.2,26.2L104.4,26.8L105.8,27.2L105.9,27.7L107.8,27.4L108.8,28.1L111.2,28.5L112.1,28.9L113,29.8L111.2,30.3L113.5,30.9L115.1,31.2L116.6,32.1L118.1,32.1L117.8,32.8L116.1,34L114.9,33.6L113.3,32.6L112,32.7L111.9,33.3L112.9,33.9L114.3,34.4L114.7,34.6L115.3,35.6L115,36.3L113.7,36.1L111.2,35.3L112.6,36.1L113.7,36.7L113.8,37.1L111.1,36.7L109,36.1L107.8,35.6L108.1,35.3L106.6,34.8L105.2,34.3L105.2,34.6L102.3,34.8L101.4,34.4L102.1,33.7L104,33.7L106,33.5L105.7,33.2L106.1,32.7L107.3,31.7L107.1,31.3L106.7,30.9L105.2,30.4L103.1,30.1L103.8,29.9L102.7,29.2L101.8,29.2L101,28.8L100.5,29.1L98.7,29.3L95.1,29L92.9,28.7L91.3,28.6L90.5,28.2L91.5,27.8L90.1,27.8L89.8,26.8L90.6,25.9L91.6,25.5L94.2,25.2L93.4,25.8L94.2,26.5L95.1,25.7L97.7,25.2L99.4,26.3L99.2,26.9ZM85.5,24.9L87.6,24.9L89.5,25.1L88,26L86.8,26.2L85.7,27L84.6,26.9L84,26.1L84,25.6L84.5,25.1ZM57.1,22.9L58.8,22.1L60.9,21.5L62.4,21.5L63.8,21.4L63.7,22.1L62.9,22.5L62,22.5L60.1,22.9L58.5,23.1ZM47.3,45L48.3,44.9L47.9,46L48.8,46.8L48.4,46.8L47.8,46.4L47.4,45.9L46.9,45.6L46.8,45.1L46.8,44.8ZM74.5,19.7L76.5,19.8L79.2,20.2L79.9,20.7L80.3,21.1L78.7,21L77.1,20.7L74.8,20.6L75.8,20.3L74.6,20.1ZM56.5,50.5L56,50.6L54.3,50.2L54,49.8L53.2,49.5L53,49.2L51.9,49L51.6,48.5L51.6,48.2L52.7,48.4L53.3,48.6L54.2,48.7L54.6,49.1L55.1,49.5L56.1,49.9ZM58.5,24.6L59.9,24.8L62.4,24.8L63.4,25.1L64.5,25.5L63.2,25.8L60.8,26.5L59.5,27.2L59.5,27.6L56.9,28.1L56.4,27.7L54.1,27.1L54.5,26.7L55.2,26L56.1,25.3L55.1,24.7ZM72.2,23.2L73.1,23L74.1,23L74.3,23.5L73.7,24L70.3,24.1L67.8,24.6L66.3,24.6L66.1,24.3L68.2,23.8L63.7,24L62.3,23.8L63.7,22.8L64.6,22.5L67.4,22.9L69.2,23.5L70.9,23.5L69.5,22.6L70.4,22.2L71.4,22.3L71.8,22.8ZM73.5,25.9L74.6,26.3L75.2,27.3L75.5,28L77.2,28.5L79,29L78.9,29.4L77.3,29.5L77.9,29.9L77.6,30.2L75.8,30.1L74,29.8L72.9,29.9L71,30.2L68.5,30.4L66.7,30.5L66.1,30L64.8,29.7L63.9,29.8L62.7,29L63.3,28.9L64.9,28.8L66.3,28.8L67.6,28.6L65.7,28.4L63.5,28.5L62.1,28.5L61.6,28.1L63.9,27.7L62.3,27.7L60.6,27.4L61.4,26.7L62.1,26.3L64.8,25.7L65.8,25.9L65.3,26.3L67.6,26L68.9,26.5L70.1,26L71,26.4L71.8,27.3L72.3,26.9L71.6,25.9L72.5,25.8ZM79.6,26.3L78.5,25.6L79.6,25.2L80.8,25.4L82.6,25.2L82.9,25.5L81.9,26L83.5,26.4L83.3,27.3L81.6,27.7L80.7,27.6L80,27.3L77.5,26.5L77.5,26.2ZM73.4,25.4L74.7,25.4L75.5,25.6L74.6,26.2L73.1,25.5ZM81.5,22.3L82.3,22.7L82.3,23.3L81.8,24L80.2,24.1L79.1,23.9L79.1,23.4L77.5,23.4L77.4,22.7L78.5,22.7L80,22.4L81.4,22.4ZM84,18.4L84.7,18.1L85.7,18L85.3,17.8L87.6,17.7L88.9,18.3L90.6,18.5L92.2,18.7L93,19.3L94.2,19.7L92.8,20L91,20.7L89.2,20.8L87.1,20.7L86,20.2L86.1,19.9L86.9,19.6L85,19.6L83.9,19.3L83.3,18.8ZM88.4,17.1L89.9,16.9L91.1,16.9L93,16.7L94.5,16.3L95.7,16.4L96.8,16.7L97.6,16.1L98.9,16L100.7,15.9L103.7,15.8L104.3,15.9L107.2,15.8L109.3,15.8L111.5,15.9L114.2,16L116.3,16.1L118.1,16.4L118.1,16.6L115.7,17.1L113.2,17.3L112.3,17.5L114.5,17.5L112.2,18.1L110.5,18.4L108.8,19.2L106.8,19.4L106.1,19.6L103.1,19.7L104.5,19.8L103.8,20L104.6,20.5L103.7,20.8L102.1,21.1L101.6,21.5L100.2,21.8L100.4,22L102.1,22L102.1,22.2L99.4,22.8L96.8,22.5L93.9,22.7L92.4,22.6L90.5,22.5L90.4,22L92.2,21.8L91.7,21.1L92.4,21L95,21.5L93.7,20.8L92,20.6L92.8,20.2L94.6,20L94.9,19.7L93.5,19.3L93.1,18.7L95.8,18.8L96.6,18.9L98.2,18.5L95.9,18.4L92.4,18.5L90.6,18.1L89.8,17.7L88.6,17.4ZM104.8,31.6L104.1,31.9L103,31.9L102.8,31.4L103.2,30.9L104.1,30.7L104.9,31L104.9,31.4ZM83.7,29.5L84.4,29.9L83.7,30.2L82.4,29.9L81.6,30L80.2,29.6L81.1,29.3L81.8,28.9L82.8,29.1L83.4,29.3ZM115.5,49.1L115.8,49L117.1,49.3L118.2,49.7L118.2,49.9L117.7,49.9L116.4,49.6ZM116,52L116.3,52.5L117.1,52.6L118,52.6L117.5,53L117.1,53L115.9,52.6L115.6,52.3ZM24.6,78.9L24.8,79L24.9,79.1L25.2,79.5L25.2,79.5L24.8,79.8L24.5,79.9L24.3,80.1L24.1,79.9L24.1,79.7L23.9,79.3L24,79.2L24.1,79L24.1,78.8L24.1,78.7L24.2,78.8ZM24,78.2L23.9,78.4L23.6,78.4L23.4,78.2L23.3,78.1L23.3,78.1L23.4,78L23.7,78.1ZM23.2,77.8L23.2,77.9L22.7,77.9L22.7,77.8ZM22,77.3L22.1,77.3L22.3,77.7L22.3,77.7L22.2,77.7L21.9,77.7L21.7,77.5L21.7,77.4ZM20.6,76.8L20.7,77L20.5,77.1L20.2,76.9L20.3,76.9L20.4,76.8ZM13.5,38.6L14.3,38.7L14.4,39.1L13.8,39.2L13.2,39.1L12.5,38.8ZM26.8,41L27.4,41.1L27.9,41.4L27,41.9L26,42.3L25.5,42L25.3,41.5L26.2,41.2ZM8.3,35.2L8.9,35.4L9.5,35.3L10.3,35.6L11.3,35.7L11.2,35.8L10.5,36L9.7,35.8L9.3,35.6L8.4,35.7L8.2,35.6ZM108.3,81L107.6,80.8L107.2,80.9L106.5,80.8L106.1,81L105.5,80.7L105.6,80.3L106.6,80.5L107.3,80.6L107.7,80.3L107.2,79.9L107.2,79.5L106.6,79.4L106.8,79.1L107.4,79.1L108.3,79.3L108.4,79.1L109.2,79.1L109.8,79.4L110,79.4L110.2,79.7L110.8,79.7L110.7,80L111.2,80L111.7,80.4L111.3,80.8L110.8,80.6L110.4,80.6L110,80.6L109.9,80.8L109.5,80.8L109.3,80.6L109,80.7L108.6,81.4L108.3,81.2ZM101,72.2L101.5,72.1L102.2,72.2L102.2,72.4L101.1,72.6ZM102.2,72L103,72.4L102.8,73.1L102.6,73L102.7,72.5L102.2,72.1ZM101.8,73.8L102.1,73.8L102.5,74.7L102.5,75.2L102.2,75.3L102,74.7L101.6,74.4ZM133.2,16.4L136.6,15.8L140.1,15.8L141.4,15.5L144.9,15.4L152.9,15.5L159.2,16.3L157.3,16.7L153.5,16.7L148.1,16.8L148.6,17L152.1,16.9L155.2,17.2L157.1,16.9L157.9,17.3L156.8,17.8L159.4,17.5L164.2,17.1L167.2,17.3L167.8,17.7L163.7,18.4L163.2,18.7L160,18.8L162.3,18.9L161.1,19.6L160.3,20.2L160.3,21.4L161.5,22L160,22.1L158.3,22.4L160.2,22.9L160.4,23.8L159.3,23.8L160.6,24.7L158.4,24.8L159.6,25.2L159.2,25.5L157.8,25.7L156.4,25.7L157.7,26.4L157.7,26.8L155.7,26.4L155.2,26.7L156.6,26.9L157.9,27.5L158.2,28.3L156.5,28.5L155.7,28.1L154.5,27.6L154.8,28.2L153.6,28.8L156.3,28.8L157.7,28.9L155,29.7L152.3,30.5L149.3,30.9L148.2,30.9L147.2,31.3L145.8,32.3L143.6,33L143,33.1L141.6,33.3L140.2,33.5L139.3,34.2L139.3,34.9L138.8,35.5L137.2,36.3L137.6,37.1L137.1,37.9L136.6,38.9L135.2,39L133.7,38.1L131.7,38.1L130.8,37.6L130.1,36.6L128.4,35.4L127.9,34.7L127.7,33.8L126.3,32.9L126.7,32.2L126,31.8L127,30.6L128.5,30.3L128.9,29.9L129.1,29.1L128,29.4L127.4,29.6L126.5,29.7L125.3,29.4L125.2,28.7L125.6,28.2L126.6,28.2L128.6,28.4L126.9,27.8L126,27.5L125,27.6L124.2,27.3L125.3,26.4L124.7,26L123.9,25.3L122.7,24.3L121.4,23.9L121.4,23.5L118.7,22.9L116.6,22.8L113.9,22.9L111.5,22.9L110.3,22.6L108.6,22L111.2,21.7L113.2,21.6L109,21.4L106.7,21L106.8,20.6L110.6,20.1L114.3,19.6L114.7,19.2L112,18.9L112.9,18.5L116.3,17.8L117.8,17.7L117.4,17.2L119.7,17L122.8,16.8L125.9,16.8L127,17.1L129.6,16.6L132,16.9L133.4,17L135.5,17.3L133.1,16.8ZM113.7,80.5L114.2,80.6L114.4,80.8L114.2,81L113.4,81L112.8,81.1L112.8,80.6L112.9,80.5ZM102.4,80.5L103.1,80.6L103.6,80.8L103.8,81.1L103.1,81.1L102.8,81.3L102.2,81.1L101.7,80.8L101.8,80.5L102.2,80.5ZM97.7,75.8L98.6,75.9L99.4,75.9L100.3,76.2L100.7,76.6L101.7,76.5L102,76.7L102.9,77.3L103.5,77.8L103.8,77.8L104.4,78L104.3,78.3L105.1,78.3L105.8,78.7L105.7,78.9L105,79.1L104.4,79.1L103.7,79L102.2,79.1L102.9,78.6L102.5,78.3L101.9,78.3L101.5,78L101.3,77.4L100.7,77.4L99.8,77.2L99.5,77L98.2,76.8L97.8,76.6L98.2,76.4L97.2,76.3L96.5,76.8L96.1,76.8L95.9,77.1L95.5,77.2L95,77.1L95.6,76.8L95.8,76.4L96.2,76.2L96.7,76L97.5,75.9ZM118.3,88.2L118.9,88.1L119.1,88.1L119.1,88.9L118.2,89L118,88.9L118.3,88.6Z", "Asia": "M296.7,49.1L297.9,49.5L299.3,48.9L299.3,48.4L300.2,47.4L300.7,47L300.7,46.5L300.2,46.2L301,45.7L302.2,45.6L303.6,45.5L305.1,45.8L305.9,46.2L306.6,47.2L306.9,47.6L307.3,48.3L307.7,49.2L309.4,49.6L310.6,50.3L311,51.2L312.5,51.2L313.4,50.8L315,50.5L314.5,51.4L314.1,51.8L313.8,52.9L313.1,53.9L311.9,53.7L311,54L311.3,54.9L311.1,56.1L310.6,56.1L310.6,56.6L310.8,56.8L310.4,56.7L310,57.1L309.7,57.4L309.7,58.1L309.2,58.3L309,58.5L308.6,58.8L308,59L307.5,59.2L307.5,59.7L307.4,59.8L307.8,59.9L308.4,60.4L309.2,61.6L309.5,62.2L309.5,63.4L309.1,63.9L308.2,64.1L307.4,64.5L306.5,64.6L306.4,64.1L306.6,63.3L306.1,62.3L306.9,62.1L306.2,61.3L305.7,61.1L305.6,61.2L305.3,61.3L305.2,61.1L305,61.1L304.7,60.9L305,60.5L305.2,60.3L305.1,60.2L305.4,59.6L305.3,59.4L304.7,59.3L304.3,59.1L302.9,59.4L302.1,59.8L301.1,60.1L301.6,59.6L301.4,59.2L302.2,58.6L301.6,58.1L300.8,58.4L299.6,59.1L299,59.7L298,59.8L297.5,60.3L298.1,60.9L298.9,61.1L298.9,61.6L299.7,61.8L300.8,61.1L301.7,61.5L302.4,61.5L302.5,62.1L301.1,62.3L300.6,62.9L299.7,63.4L299.2,64.1L300.2,64.6L300.6,65.6L301.2,66.5L301.9,67.3L301.9,68.1L301.3,68.3L301.5,68.9L302.1,69.2L301.9,70L301.7,70.8L301.1,70.9L300.4,71.9L299.6,73.3L298.7,74.5L297.3,75.4L295.9,76.2L294.8,76.3L294.2,76.8L293.8,76.5L293.2,76.9L291.8,77.4L290.8,77.6L290.4,78.7L289.9,78.7L289.6,78L289.9,77.6L288.5,77.3L288,77.4L286.7,78.3L285.9,79.2L285.7,79.9L286.4,81L287.4,82.3L288.3,82.9L288.9,83.7L289.3,85.6L289.2,87.3L288.4,88L287.2,88.6L286.4,89.5L285.2,90.4L284.8,89.8L285.1,89.1L284.3,88.5L283.5,88.4L283.1,87.8L282.6,86.8L281.7,86.4L280.8,86.4L281,85.6L280.1,85.6L280,86.7L279.5,88.2L279.2,89L279.2,89.8L279.9,89.8L280.3,90.7L280.5,91.6L281,92.1L281.6,92.3L282.1,92.8L282.4,92.9L283,93.5L283.4,94.1L283.4,94.8L283.3,95.3L283.4,95.6L283.5,96.2L283.9,96.5L284.2,97.4L284.2,97.7L283.5,97.8L282.6,97L281.4,96.2L281.3,95.7L280.7,95.1L280.6,94.2L280.2,93.7L280.3,93L280.1,92.5L279.7,92.2L279.5,91.7L279,91.1L278.5,90.6L278.3,91.2L278.1,90.7L278.3,90L278.6,89.1L278.5,88.3L278.8,87.6L278.4,87L278.5,85.9L278.1,85.4L277.8,84.2L277.6,82.9L277.2,82.1L276.5,82.6L275.4,83.3L274.8,83.2L274.2,83L274.5,81.7L274.3,80.8L273.5,79.6L273.7,79.3L273.1,79.1L272.4,78.3L272.1,77.8L272,77.3L271.8,76.8L271.4,76.2L270.5,76.2L270.6,76.6L270.3,77.2L269.8,77L269.7,77.1L269.4,77L269,76.9L268.9,77.3L268.2,77.3L267,77.5L267,78.3L266.5,78.8L265.1,79.5L263.9,80.7L263.2,81.3L262.2,82L262.2,82.4L261.7,82.7L260.8,83L260.3,83.1L260,83.9L260.2,85.2L260.3,86L259.9,86.9L259.9,88.6L259.3,88.7L258.9,89.5L259.2,89.8L258.3,90.1L257.9,90.7L257.5,91L256.6,90.1L256.1,88.7L255.7,87.7L255.4,87.2L254.9,86.3L254.6,85L254.4,84.4L253.5,83L253.1,81.1L252.8,79.8L252.8,78.6L252.6,77.6L251.2,78.2L250.5,78.1L249.2,76.9L249.6,76.5L249.3,76.2L248.2,75.3L247.4,75.1L247.1,74.3L246.4,73.6L244.5,73.8L242.9,73.8L241.5,73.9L239.6,73.6L238.5,73.4L237.4,73.3L237,72L236.5,71.9L235.7,72L234.7,72.5L233.5,72.2L232.5,71.4L231.5,71.1L230.9,70.2L230.1,68.9L229.6,69L228.9,68.7L228.6,69.1L228,69L228.2,69.5L228.1,69.7L228.4,70.4L228.8,71.3L229.3,71.5L229.5,71.9L230.2,72.3L230.2,72.7L230.1,73.1L230.2,73.4L230.5,73.7L230.7,74L230.8,74.2L230.7,73.5L231,73L231.3,72.9L231.6,73.2L231.6,73.8L231.4,74.4L231.6,74.8L231.8,74.7L231.8,75L232.6,74.8L233.4,74.8L234,74.9L234.7,74.2L235.4,73.6L236.1,72.9L236.4,72.6L236.5,72.7L236.4,73.1L236.3,73.3L236.4,74.1L236.8,74.8L237.4,75.1L238.1,75.3L238.7,75.4L239.2,76L239.4,76.3L239.8,76.5L239.8,76.7L239.4,77.3L239.3,77.6L238.9,77.9L238.5,78.6L238,78.5L237.8,78.8L237.7,79.3L237.8,79.9L237.7,80.1L237.2,80.1L236.6,80.4L236.5,80.9L236.3,81.1L235.7,81.1L235.3,81.4L235.3,81.8L234.8,82.1L234.2,82L233.6,82.3L233.1,82.3L232.4,82.6L232.2,83.1L232.2,83.4L231.2,83.8L229.6,84.3L228.7,85L228.2,85.1L227.9,85L227.4,85.4L226.7,85.6L225.9,85.7L225.6,85.7L225.4,86L225.1,86L225,86.3L224.5,86.3L224.2,86.4L223.5,86.4L223.2,85.8L223.3,85.2L223.1,84.9L222.9,84.2L222.6,83.8L222.8,83.7L222.7,83.3L222.8,83.1L222.8,82.7L222.6,82.2L222.3,81.9L222.3,81.5L221.8,81.2L221.2,80.3L220.9,79.5L220.2,78.8L219.8,78.7L219.1,77.7L219,77L219.1,76.4L218.5,75.3L218,74.9L217.5,74.7L217.2,74.1L217.2,73.9L216.9,73.4L216.6,73.2L216.3,72.4L215.6,71.6L215.1,70.9L214.6,70.9L214.8,70.4L214.8,70L215,69.6L214.9,69.5L214.8,69.2L214.3,67.8L214.6,67.5L214.5,67.4L214.8,66.9L215,66.2L215.1,65.9L215.1,65.9L215.5,65.1L216,64.4L216,64.4L215.9,63.6L216.1,63.2L215.8,62.7L216.2,62.3L215.6,62.4L214.7,62.2L214,62.8L212.5,62.9L211.7,62.4L210.6,62.3L210.4,62.7L209.7,62.9L208.7,62.3L207.6,62.3L207,61.3L206.3,60.8L206.8,60L206.2,59.5L207.3,58.6L208.8,58.5L209.2,57.8L211.1,57.9L212.3,57.3L213.5,57L215.2,57L216.9,57.7L218.3,58.1L219.5,57.9L220.4,58L221.6,57.5L221.7,57L221.5,56.4L220.9,56L220.3,55.9L220,55.6L220.1,55.4L220.9,55.6L222.4,55.8L223.8,56.3L223.9,56.4L224.5,56.3L225.5,56.5L225.8,56.9L226.4,57.1L226.7,57.2L227.4,57.8L227.8,57.8L228,57.6L228.6,57.2L229.1,57.7L229.6,58.4L230.1,58.5L230.4,58.7L229.6,58.8L229.4,59.6L229.2,60L228.9,60.2L228.9,60.7L229.2,61.4L230.1,61.6L230.8,62.1L232.3,62.3L233.8,62L233.9,61.8L233.7,61.1L233.9,60L233.1,59.7L233.4,59L232.7,59L232.9,58.1L233.9,58.4L234.7,58L234,57.4L233.7,56.9L232.9,57.1L232.8,57.9L232.5,57.2L232.4,57L232.7,56.6L232.5,56.2L231.3,55.9L230.9,55L230.3,54.7L230.3,54.4L231.3,54.5L231.3,53.8L232.2,53.6L233,53.7L233.2,52.8L233,52.1L232,52.2L231.2,52L230,52.4L229.1,52.6L228.6,52.4L228.7,51.9L228.1,51.3L227.3,51.3L226.5,50.6L227,49.8L226.8,49.6L227.6,48.5L228.6,49.1L228.7,48.4L230.8,47.3L232.3,47.3L234.5,48L235.7,48.4L236.8,48L238.4,47.9L239.6,48.5L239.9,48.2L241.3,48.2L241.6,47.7L240,47L240.9,46.6L240.7,46.3L241.7,46L241,45.3L241.4,45L245.2,44.6L245.7,44.4L248.2,44L249.1,43.6L250.9,43.8L251.2,44.9L252.2,44.6L253.5,45L253.4,45.5L254.4,45.5L256.9,44.5L256.5,44.8L257.8,45.6L260,48.1L260.6,47.6L261.9,48.2L263.4,47.9L263.9,48.1L264.4,48.7L265.1,48.9L265.5,49.3L266.8,49.2L267.4,49.8L267.8,49.7L268.8,49.5L270.7,48.7L272.2,48.2L273.1,48.5L274.1,48.5L274.8,49L275.8,49L277.3,49.3L278.2,48.6L277.8,48L278.9,47L280,47.4L280.9,47.5L282.1,47.7L282.3,48.5L283.7,48.9L284.6,48.7L285.9,48.6L286.9,48.7L287.9,49.2L288.5,49.7L289.4,49.7L290.7,49.9L291.6,49.6L292.9,49.5L294.4,48.8L295,48.9L295.5,49.2ZM321,101.6L321,104.9L321,108.1L320.1,107.3L319.1,107.1L318.9,107.4L317.6,107.4L318,106.6L318.7,106.3L318.4,105.2L317.9,104.4L316,103.5L315.2,103.5L313.7,102.5L313.4,103L313,103.1L312.8,102.7L312.8,102.3L312,101.8L313.1,101.5L313.8,101.5L313.7,101.2L312.2,101.2L311.8,100.6L310.9,100.4L310.5,99.9L311.9,99.7L312.4,99.4L314,99.8L314.1,100.2L314.4,101.8L315.5,102.4L316.3,101.3L317.4,100.7L318.3,100.7L319.2,101.1L319.9,101.4ZM305,107.9L305.1,108.1L305.1,108.4L304.4,109.1L303.6,109.4L303.5,109.2L303.6,108.9L304,108.3ZM314.2,105.9L314.1,105.1L314.3,104.8L314.5,104.4L314.7,104.7L314.7,105.2ZM295.5,93.6L296.2,92.9L296.7,92.1L297.1,92.1L297.6,92.6L297.7,93L298.3,93.3L299.2,93.6L299.1,94L298.4,94L298.6,94.5L297.9,94.9L297.3,95.8L298,96.7L297.9,97.2L299,98.1L297.8,98.2L297.5,98.9L297.5,99.8L296.6,100.5L296.5,101.5L296.1,103L296,102.7L294.9,103.1L294.5,102.5L293.8,102.4L293.3,102.1L292.1,102.5L291.7,102L291,102L290.2,101.9L290.1,100.6L289.6,100.3L289.1,99.5L289,98.6L289.1,97.7L289.7,97L290.4,97.3L291.2,97.1L291.4,96.3L291.8,96.1L293,95.9L293.7,95.1L294.2,94.5L294.6,94.1ZM309.4,101.8L310.5,102.1L310.8,102.9L310,102.4L309.2,102.4L308.6,102.4L307.9,102.4L308.1,101.8ZM306.9,102.8L306.2,102.6L306,102.2L307,102.1L307.2,102.5ZM307.9,96.8L308,97.4L308.6,97.5L308.7,97.9L308.6,98.7L308.1,98.6L308,99.3L308.4,99.8L308.1,99.9L307.7,99.3L307.4,98L307.6,97.2ZM302.9,98.1L304.1,98.1L305.1,97.4L305.2,97.6L304.4,98.6L303.7,98.8L302.7,98.6L301.1,98.6L300.2,98.8L300,99.5L300.9,100.4L301.5,100L303.3,99.6L303.3,100.1L302.8,99.9L302.4,100.5L301.5,100.9L302.5,102.2L302.3,102.5L303.2,103.7L303.2,104.3L302.6,104.6L302.2,104.3L302.7,103.5L301.7,103.9L301.5,103.6L301.6,103.2L300.9,102.6L301,101.6L300.3,101.9L300.4,103.1L300.4,104.5L299.8,104.7L299.4,104.4L299.7,103.5L299.5,102.5L299.1,102.5L298.8,101.8L299.2,101.1L299.3,100.4L299.8,98.8L300,98.4L300.9,97.7L301.7,98ZM300.3,109.3L299,108.6L299.9,108.4L300.4,108.7L300.8,109L300.7,109.2ZM301.3,107.5L302,107.5L302.9,107.1L302.8,107.7L301.3,107.9L299.9,107.8L299.9,107.4L300.7,107.2ZM298.3,107.4L298.9,107.3L299.1,107.7L298,107.9L297.3,108L296.7,108L297.1,107.5L297.6,107.4L297.9,107.1ZM288.5,105.4L288.6,105.8L290.5,105.9L290.8,105.5L292.6,105.9L293,106.6L294.5,106.8L295.7,107.4L294.6,107.8L293.5,107.3L292.6,107.4L291.5,107.3L290.6,107.1L289.4,106.7L288.7,106.6L288.3,106.8L286.5,106.4L286.3,105.9L285.4,105.9L286.1,104.9L287.3,105L288.1,105.3ZM284.4,100.1L284.5,100.8L284.9,101.3L285.6,101.4L286.1,102.1L285.9,103.3L285.8,104.9L284.7,104.9L283.9,104L282.6,103.2L282.2,102.6L281.4,101.8L280.9,101.1L280.1,99.7L279.3,98.8L279,98L278.6,97.2L277.7,96.5L277.2,95.7L276.4,95.1L275.4,94L275.3,93.5L275.9,93.6L277.5,93.8L278.4,94.7L279.1,95.4L279.7,95.8L280.6,96.9L281.7,96.9L282.5,97.6L283.1,98.4L283.8,98.9L283.4,99.7L284,100.1ZM206.1,57.2L207.1,56.9L208,57L208.1,57.4L209,57.7L208.8,57.9L207.6,58L207.2,58.3L206.4,58.8L206,58.4L206.1,58.2L206.3,58.1L206.6,57.4ZM261.8,91.5L261.6,92.5L261.2,92.8L260.3,93L259.9,92.2L259.7,90.8L260.1,89.2L260.8,89.7L261.3,90.4ZM289.5,80.8L288.7,80.5L288.6,79.6L289.1,79.2L290.2,78.9L290.8,78.9L291,79.3L290.6,79.7L290.3,80.3ZM301.8,74.6L301.2,76.2L300.7,77L300.2,76.2L300.1,75.4L300.7,74.5L301.5,73.7L302,74ZM300.8,86.3L300.3,85.5L301.2,85.6L301.5,85.9L301.3,86.8ZM302.6,89L302.8,88.7L302.9,88.1L303.5,88.1L303.3,88.7L304.1,87.8L304,88.7L303.6,89.1L303.3,89.7L303,90L302.4,89.3ZM306.4,90.6L306.5,91.2L306.5,91.8L306.2,92.7L305.8,91.7L305.4,92.2L305.7,93L305.4,93.4L304.2,92.8L303.9,92.1L304.2,91.6L303.6,91.2L303.3,91.6L302.8,91.5L302.1,92.1L301.9,91.8L302.3,91L302.9,90.7L303.5,90.3L303.8,90.8L304.6,90.5L304.8,90L305.5,90L305.4,89.2L306.2,89.7L306.3,90.2ZM298.5,89.7L297.2,90.6L297.7,89.9L298.4,89.3L299,88.6L299.5,87.6L299.7,88.4L299,89ZM302.3,80.8L302.2,81.2L302.5,81.9L302.3,82.7L301.7,83.1L301.5,83.9L301.7,84.7L302.3,84.8L302.7,84.7L304,85.2L303.9,85.8L304.2,86L304.1,86.5L303.3,86L302.9,85.4L302.7,85.8L302,85.2L301.1,85.4L300.6,85.1L300.7,84.7L301,84.5L300.7,84.2L300.6,84.6L300.1,84L299.9,83.6L299.9,82.6L300.3,83L300.4,81.4L300.7,80.5L301.3,80.5L301.9,80.8L302.2,80.5ZM302,87.6L301.9,87.1L302.5,87.4L303.1,87.4L303.1,87.8L302.6,88.3L302,88.6L302,88.1ZM305.5,86.8L305.8,88L305,87.7L305,88L305.3,88.6L304.8,88.9L304.8,88.2L304.5,88.1L304.3,87.5L304.9,87.6L304.9,87.2L304.3,86.4L305.2,86.5ZM321.9,59.8L321,60.8L321,61.9L320.6,62.7L320.8,63.2L320.3,63.9L319,64.3L317.2,64.4L315.8,65.5L315.1,65.2L315.1,64.4L313.3,64.6L312.2,65.1L311,65.1L312,65.9L311.3,67.5L310.7,68L310.2,67.6L310.4,66.7L309.8,66.4L309.4,65.7L310.4,65.4L310.9,64.8L311.9,64.2L312.6,63.6L314.6,63.3L315.7,63.5L316.7,61.7L317.4,62.2L318.9,61.2L319.4,60.8L320.1,59.6L319.9,58.4L320.3,57.8L321.4,57.6L321.9,59ZM324.6,55L325.3,54.6L325.5,55.7L324.1,56L323.2,57L321.6,56.3L321.1,57.4L320,57.4L319.8,56.4L320.3,55.7L321.4,55.6L321.7,54.2L322,53.4L323.1,54.5L323.9,54.8ZM312.4,65.5L312.9,64.9L313.5,65.1L313.9,64.6L314.6,64.9L314.8,65.2L314.2,65.8L313.8,65.5L313.3,65.7L313,66.3L312.4,66ZM212.7,63.9L212.8,63.9L212.9,63.6L213.7,63.6L214.6,63.3L213.9,63.8L214,63.9L213.9,63.9L213.7,64L213.5,64L213.5,64L213.5,63.9L213.4,63.8L213.2,63.8L212.9,63.9Z", "South America": "M111.4,151.6L111.7,152.1L112.2,152.8L113.5,153.5L114.9,153.7L114.5,154.2L113.5,154.2L113,153.9L112.7,154.3L111.9,154.6L111.4,154.6L110.8,154.5L110,154.2L109,154.1L107.7,153.5L106.7,153L105.3,151.8L106.2,152L107.6,152.7L108.9,153.1L109.4,152.6L109.7,151.9L110.7,151.5ZM121.6,132.9L121.5,133.4L122.8,134.3L122.6,135L123.3,135.4L123.2,135.9L122.3,137.2L120.8,137.7L118.8,137.9L117.7,137.8L117.9,138.4L117.7,139.2L117.9,139.7L117.3,140L116.2,140.2L115.3,139.8L114.9,140.1L115,141.1L115.7,141.4L116.2,141L116.5,141.6L115.6,141.9L114.8,142.5L114.7,143.5L114.4,144L113.5,144L112.7,144.6L112.4,145.3L113.4,146L114.4,146.2L114,147.1L112.8,147.7L112.2,148.9L111.3,149.3L110.9,149.7L111.2,150.8L111.8,151.4L111.4,151.3L110.5,151.3L110.1,151.5L109.2,151.9L109,152.8L108.6,152.9L107.4,152.5L106.3,151.8L105.1,151.3L104.7,150.6L105,150L104.5,149.4L104.4,147.7L104.8,146.7L105.9,145.9L104.4,145.6L105.3,144.8L105.6,143.1L106.8,143.5L107.3,141.4L106.6,141.1L106.3,142.4L105.7,142.2L106,140.8L106.3,138.9L106.8,138.3L106.5,137.3L106.4,136.2L106.8,136.1L107.4,134.5L108.1,132.9L108.6,131.4L108.3,129.9L108.6,129.1L108.5,127.9L109.1,126.6L109.3,124.7L109.6,122.6L109.9,120.4L109.8,118.8L109.6,117.3L108.6,116.8L108.5,116.4L106.6,115.4L104.8,114.3L104,113.6L103.6,112.8L103.7,112.5L102.9,111.2L101.9,109.4L101,107.4L100.6,106.9L100.2,106.2L99.5,105.5L98.7,105.1L99.1,104.7L98.6,103.7L98.9,103L99.7,102.4L100.2,101.7L100,101.2L99.6,101.7L99,101.2L99.2,101L99.1,100.1L99.4,99.9L99.6,99.3L100,98.6L99.9,98.2L100.5,98L101.1,97.6L101,97.3L101.4,97.2L101.3,96.7L101.6,96.4L102.1,96.3L102.5,95.7L102.9,95.2L102.5,94.9L102.7,94.3L102.5,93.4L102.7,93.2L102.5,92.3L102.1,91.8L102.2,91.3L102.6,91.4L102.8,91.1L102.5,90.5L102.6,90.3L103.2,90.4L103.9,89.7L104.3,89.6L104.3,89.2L104.5,88.4L105.1,87.9L105.7,87.9L105.8,87.7L106.6,87.8L107.4,87.3L107.8,87L108.2,86.6L108.6,86.6L108.9,86.9L108.7,87.2L108.6,87.5L108.1,87.6L108.4,88L108.4,88.6L107.9,89.1L108.3,89.9L108.7,89.9L109,89.1L108.6,88.8L108.6,88L109.8,87.6L109.7,87.2L110.1,86.8L110.4,87.5L111.1,87.6L111.8,88.1L111.8,88.4L112.7,88.5L113.8,88.4L114.3,88.8L115.1,88.9L115.7,88.6L115.7,88.4L116.9,88.3L118.1,88.3L117.3,88.6L117.6,89.1L118.4,89.1L119.2,89.6L119.3,90.4L119.8,90.4L120.2,90.6L120.9,91L121.5,91.7L121.5,92.2L121.9,92.2L122.5,92.7L122.9,93L124.1,93.2L124.2,93L125,93L126,93.2L125.5,94.1L125.6,94.8L126,95.4L125.8,95.8L125.7,96.3L125.5,96.7L125.9,96.9L126.2,96.6L126.4,96.7L126.6,96.9L127.1,96.9L127.4,96.5L127.8,95.8L128.3,94.8L128.7,94.8L128.9,95.4L129.5,97.1L130,97.3L130.1,98L129.3,98.8L129.6,99.1L131.4,99.2L131.4,100.2L132.2,99.6L133.4,99.9L135.1,100.6L135.6,101.1L135.4,101.7L136.6,101.4L138.5,101.9L140,101.9L141.5,102.7L142.8,103.8L143.5,104.1L144.4,104.1L144.8,104.5L145.1,105.7L145.3,106.3L144.9,108L144.4,108.6L143,110L142.3,111.2L141.6,112L141.3,112.1L141,112.8L141.1,114.7L140.8,116.2L140.7,116.9L140.4,117.3L140.2,118.6L139.2,119.9L139.1,120.9L138.2,121.4L138,122L136.9,122L135.4,122.4L134.6,122.8L133.5,123.1L132.4,123.9L131.5,124.9L131.4,125.6L131.5,126.2L131.3,127.2L131.1,127.7L130.4,128.2L129.3,130L128.4,130.8L127.7,131.2L127.3,132.2L126.6,132.8L126.2,133.4L125.1,134L124.3,133.8L123.8,133.9L122.9,133.4L122.2,133.5ZM118.8,150.8L120,150.3L120.8,150.5L121.5,150.1L122.3,150.5L122,150.9L120.6,151.2L120.2,150.8L119.3,151.3Z", "Europe": "M273.8,18L275.9,17.7L277.9,18.3L280.2,19.2L279.9,20.1L277.8,20.2L275,20L273.3,19.6L272.5,18.9L271.2,18.7ZM282.8,19.7L285.4,20.3L285.1,20.7L279.4,21.1L281.3,19.8L282.1,19.7ZM318.8,22.9L321.5,22.9L325.1,23.4L324.3,24.2L320.6,24.2L319,24.4L317,23.7L317.5,23.1ZM328.2,23.7L330.7,23.9L329.6,24.3L328,24.2L326.1,23.8L326.4,23.5ZM319.9,25.6L320.8,25.2L322.1,25.1L323.5,25.5L323.6,25.8L322.1,25.8L320,25.7ZM224.8,18.4L226.8,18.2L228.3,18.2L228.5,18.5L229.1,18.2L230,18.1L231.5,18.3L231.1,18.5L229.8,18.6L228.9,18.7L228.8,18.8L227.6,19L226.5,18.8L227.1,18.4ZM0,30L0,30L2.5,30.8L5.1,31.8L5,32.4L5.7,32.7L5.4,31.9L8.1,32.1L10.1,33L9.1,33.5L7.5,33.6L7.4,34.5L7,34.7L6.1,34.7L5.3,34.4L4,34.1L3.8,33.6L2.8,33.5L1.6,33.6L1.1,33.3L1.3,32.9L0.1,33.1L0.6,33.6L0,34L0,34L0,30ZM360,34L360,34L358.7,34.5L357.4,34.4L358.3,34.9L358.9,35.7L359.4,36L359.5,36.4L359.2,36.7L357.4,36.5L354.6,37.2L353.7,37.3L352.1,38.1L350.7,38.7L350.3,39.1L348.9,38.4L346.3,39.2L345.8,38.8L344.9,39.3L343.5,39.1L343.2,39.8L342,40.8L342.1,41.2L343.2,41.4L343.1,42.8L342.1,42.9L341.7,43.7L342.1,44.1L340.4,44.7L340,45.8L338.5,46L338.2,47.1L336.8,48L336.4,47.3L336,45.8L335.4,43.6L335.9,42.2L336.8,41.6L336.8,41.2L338.4,40.9L340.1,39.7L341.9,38.7L343.7,37.9L344.5,36.4L343.3,36.5L342.7,37.4L340.1,38.5L339.3,37.2L336.7,37.6L334.2,39.2L335,39.9L332.8,40.1L331.3,40.2L331.3,39.5L329.8,39.3L328.5,39.8L325.5,39.7L322.2,40L319,41.9L315.1,44.3L316.7,44.4L317.2,45L318.2,45.2L318.8,44.7L319.9,44.8L321.3,45.9L321.4,46.8L320.6,47.8L320.5,49L320.1,50.6L318.6,52L318.2,52.7L316.9,53.9L315.5,55L314.9,55.6L313.5,56.2L312.9,56.2L312.3,55.7L310.9,56.4L310.8,56.8L310.6,56.6L310.6,56.1L311.1,56.1L311.3,54.9L311,54L311.9,53.7L313.1,53.9L313.8,52.9L314.1,51.8L314.5,51.4L315,50.5L313.4,50.8L312.5,51.2L311,51.2L310.6,50.3L309.4,49.6L307.7,49.2L307.3,48.3L306.9,47.6L306.6,47.2L305.9,46.2L305.1,45.8L303.6,45.5L302.2,45.6L301,45.7L300.2,46.2L300.7,46.5L300.7,47L300.2,47.4L299.3,48.4L299.3,48.9L297.9,49.5L296.7,49.1L295.5,49.2L295,48.9L294.4,48.8L292.9,49.5L291.6,49.6L290.7,49.9L289.4,49.7L288.5,49.7L287.9,49.2L286.9,48.7L285.9,48.6L284.6,48.7L283.7,48.9L282.3,48.5L282.1,47.7L280.9,47.5L280,47.4L278.9,47L277.8,48L278.2,48.6L277.3,49.3L275.8,49L274.8,49L274.1,48.5L273.1,48.5L272.2,48.2L270.7,48.7L268.8,49.5L267.8,49.7L267.4,49.8L266.8,49.2L265.5,49.3L265.1,48.9L264.4,48.7L263.9,48.1L263.4,47.9L261.9,48.2L260.6,47.6L260,48.1L257.8,45.6L256.5,44.8L256.9,44.5L254.4,45.5L253.4,45.5L253.5,45L252.2,44.6L251.2,44.9L250.9,43.8L249.1,43.6L248.2,44L245.7,44.4L245.2,44.6L241.4,45L241,45.3L241.7,46L240.7,46.3L240.9,46.6L240,47L241.6,47.7L241.3,48.2L239.9,48.2L239.6,48.5L238.4,47.9L236.8,48L235.7,48.4L234.5,48L232.3,47.3L230.8,47.3L228.7,48.4L228.6,49.1L227.6,48.5L226.8,49.6L227,49.8L226.5,50.6L227.3,51.3L228.1,51.3L228.7,51.9L228.6,52.4L229.1,52.6L228.6,53.2L227.7,53.4L226.7,54.4L227.6,55.3L227.5,56L228.6,57.2L228,57.6L227.8,57.8L227.4,57.8L226.7,57.2L226.4,57.1L225.8,56.9L225.5,56.5L224.5,56.3L223.9,56.4L223.8,56.3L222.4,55.8L220.9,55.6L220.1,55.4L220,55.6L218.7,54.7L217.5,54.3L216.7,53.8L217.4,53.6L218.2,52.8L217.7,52.4L219.1,52L219.1,51.7L218.2,51.9L217.4,52L216.8,52.3L215.8,52.4L215,52.7L215,53.3L215,53.3L215.5,53.6L216.5,53.5L216.3,53.9L215.2,54.1L213.9,54.6L213.3,54.4L213.5,54L212.5,53.7L212.6,53.5L213.6,53.1L213.4,53L213.3,52.9L211.7,52.7L211.7,52.3L210.7,52.4L210.4,53L209.6,53.7L209.6,54L209.1,54.2L208.8,54.1L208.6,55.3L208,55.7L207.7,56.4L208,57L207.1,56.9L206.1,57.2L206.6,57.4L206.3,58.1L206.1,58.2L205.4,58.1L204.9,58.1L203.7,58.3L204.4,58.9L203.9,59L203.3,59L202.8,58.5L202.6,58.7L202.9,59.3L203.4,59.8L203,60L203.5,60.5L204,60.8L204,61.3L203.1,61.1L203.4,61.6L202.8,61.7L203.2,62.6L202.5,62.6L201.7,62.2L201.3,61.4L201.1,60.7L200.7,60.2L200.2,59.7L200.2,59.4L200,59.3L200,59.1L199.4,58.7L199.3,58.3L199.4,57.6L199.5,57.3L199.4,57.1L199.2,57L198.9,56.7L198.4,56.5L197.5,56.2L196.9,55.8L196,55.5L195.2,54.8L195.4,54.7L194.9,54.3L194.9,53.9L194.3,53.8L194,54.2L193.7,53.9L193.7,53.5L193.7,53.5L193.9,53.4L193.1,53.3L192.3,53.6L192.4,54.1L192.3,54.4L192.6,54.9L193.5,55.4L194,56.2L195.1,57L195.9,57L196.2,57.3L195.9,57.5L196.8,57.8L197.5,58.1L198.4,58.6L198.5,58.8L198.3,59.2L197.7,58.7L196.9,58.6L196.5,59.2L197.2,59.6L197.1,60.1L196.6,60.2L196.1,61L195.7,61.1L195.7,60.8L195.9,60.2L196.1,60L195.7,59.5L195.4,59L195,58.8L194.7,58.4L194.1,58.2L193.6,57.8L192.9,57.7L192.1,57.3L191.2,56.6L190.5,56.1L190.2,55.1L189.7,55L188.9,54.6L188.4,54.8L187.8,55.2L187.4,55.3L186.5,55.9L184.6,55.6L183.1,55.9L183,56.5L183,57.1L182.1,57.8L180.8,58L180.7,58.3L180.1,58.9L179.7,59.7L180.1,60.3L179.5,60.7L179.3,61.4L178.6,61.6L177.9,62.3L176.6,62.3L175.6,62.3L175,62.7L174.6,63.1L174.1,63L173.8,62.6L173.5,62.1L172.5,61.9L172.1,62.2L171.6,62L171.1,62.1L171.3,61.3L171.2,60.7L170.7,60.6L170.5,60.3L170.6,59.6L171,59.2L171,58.8L171.2,58.2L171.2,57.8L171,57.5L171,57.1L171,56.4L170.6,56L172,55.3L173.2,55.4L174.6,55.4L175.7,55.6L176.5,55.5L178.1,55.6L178.6,55L178.8,53L177.8,51.9L177,51.4L175.5,51L175.4,50.3L176.7,50.1L178.4,50.4L178.1,49.2L179,49.7L181.3,48.9L181.6,48.1L182.5,47.9L183.3,47.7L183.8,47.4L184.7,45.9L186.1,45.5L186.9,45.5L187.1,45.3L187.9,45.3L188.1,45.5L188.8,45L188.6,44.6L188.5,44L188.1,43.5L188.1,42.5L188.3,42.2L188.5,41.9L189.4,41.8L189.8,41.6L190.6,41.3L190.5,41.8L190.3,42.1L190.4,42.4L190.9,42.5L190.7,42.9L190.4,42.8L189.6,43.5L189.9,44L189.9,44.4L190.9,44.6L190.9,45L192,44.8L192.5,44.5L193.6,44.9L194.1,45.2L194.8,44.9L196.4,44.5L197.6,44.1L198.6,44.3L198.7,44.6L199.7,44.6L199.7,44.6L199.9,44.1L201.3,43.8L201.1,43L201.1,42.2L201.6,41.6L202.5,41.2L203.3,42L204.1,42L204.3,41.2L204.4,40.6L204.1,40.7L203.4,40.4L203.3,39.8L204.6,39.5L205.9,39.4L206.9,39.6L208,39.5L209.1,39L208.1,38.5L206.3,38.6L204.5,38.9L202.9,39.2L202.3,38.6L201.3,38.3L201.5,37.3L201.1,36.4L201.5,35.8L202.4,35.2L204.7,34.1L205.4,33.9L205.3,33.5L203.9,33L202.2,33.3L201.2,34L201.4,34.6L199.8,35.4L197.8,36.3L197.1,37.7L197.8,38.4L198.8,38.9L197.9,40L196.8,40.3L196.4,42L195.9,42.9L194.7,42.8L194.1,43.6L192.9,43.6L192.6,42.7L191.8,41.6L191,40.1L190.4,39.5L188.4,40.7L187,40.9L185.7,40.4L185.3,39.3L185,37L185.9,36.4L188.6,35.5L190.5,34.5L192.4,33.1L194.8,31.2L196.4,30.4L199.2,29.2L201.4,28.7L203,28.8L204.5,28L206.4,28L208.2,27.8L211.3,28.5L210,28.8L211.1,29.4L212.1,29.1L213.8,29.7L216.5,29.9L220.3,31.1L221.1,31.5L221.1,32.2L220,32.7L218.4,33L213.9,32.2L213.2,32.4L214.8,33.1L214.9,33.6L214.9,34.6L216.2,34.9L217,35.1L217.1,34.7L216.5,34.2L217.2,33.9L219.6,34.5L220.4,34.2L219.8,33.5L222.1,32.5L223,32.6L224,32.9L224.5,32.2L223.7,31.6L224.2,31L223.5,30.4L226.3,30.8L226.8,31.3L225.6,31.4L225.6,32L226.3,32.3L227.9,32.1L228.1,31.5L230.2,31L233.7,30.1L234.5,30.2L233.5,30.8L234.7,30.9L235.4,30.6L237.3,30.5L238.8,30.1L239.9,30.7L241.1,30.1L240,29.5L240.6,29.1L243.5,29.5L244.9,29.8L248.5,30.9L249.2,30.4L248.2,29.9L248.1,29.6L246.9,29.5L247.3,29.1L246.7,28.3L246.7,28L248.5,27.1L249.2,26.2L249.9,26L252.6,26.2L252.8,26.8L251.8,27.6L252.5,27.9L252.8,28.6L252.6,30L253.7,30.6L253.2,31.3L251.3,32.7L252.4,32.8L252.8,32.5L253.9,32.2L254.2,31.7L255.1,31.2L254.5,30.7L254.9,30L253.8,29.9L253.6,29.4L254.4,28.4L253.1,27.6L254.9,26.9L254.7,26.2L255.2,26.1L255.7,26.7L255.3,27.7L256.4,27.8L255.9,27.1L257.6,26.7L259.7,26.7L261.5,27.3L260.6,26.4L260.5,25.4L262.2,25.1L264.7,25.2L266.8,25.1L266,24.5L267.2,23.9L268.3,23.9L270.3,23.4L272.9,23.2L273.2,23L275.9,22.9L276.7,23.1L278.9,22.6L280.8,22.6L281,22.1L282,21.7L284.4,21.3L286.1,21.6L284.7,21.9L287,22L287.2,22.5L288.2,22.3L291.1,22.3L293.3,22.8L294.1,23.2L293.9,23.7L292.8,24L290.2,24.5L289.4,24.8L290.6,25L292.1,25.2L293,25L293.5,25.7L294,25.4L295.6,25.2L298.8,25.4L299,25.9L303.2,26L303.3,25.3L305.4,25.4L307,25.4L308.6,26L309.1,26.6L308.5,27L309.7,27.8L311.3,28.2L312.3,27.2L313.9,27.6L315.6,27.3L317.5,27.7L318.2,27.4L319.9,27.5L319.1,26.6L320.5,26.2L329.5,26.8L330.4,27.4L333,28.2L337,28L339,28.1L339.8,28.5L339.7,29.3L340.9,29.6L342.3,29.4L344.1,29.3L345.9,29.5L347.8,29.4L349.6,30.3L350.8,30L350,29.3L350.5,28.9L353.6,29.2L355.7,29.1L358.6,29.6L360,30L360,34ZM233.5,25.2L235.9,24.4L235.6,23.9L237.9,23.4L241.2,22.7L244.5,22.6L246.2,22.2L248.2,22.1L248.9,22.5L248.2,22.8L244.6,23.3L241.6,23.7L238.5,24.7L237,25.7L235.4,26.6L235.6,27.5L237.5,28.3L236.9,28.4L233.7,28.2L233.4,27.8L231.6,27.5L231.5,27L232.5,26.8L232.4,26.2L234.4,25.4ZM322.9,45.3L323.3,46.3L323.2,47.2L323.6,48.3L324.7,50L323.2,49.7L322.6,51.1L323.5,52.2L323.5,52.9L322.7,52.3L322.1,53L321.9,52.2L322,51.2L321.9,50.1L322.1,49.4L322.2,48L321.6,47.1L321.7,45.7L322.6,45.2L322.2,44.8L322.7,44.6ZM360,28.2L358.9,28.2L358.7,27.9L360,27.5L360,28.2ZM0,27.5L0,27.5L0,27.5L0.1,27.4L1,27.4L2.4,27.7L2.3,27.9L1.3,28.1L0,28.2L0,28.2L0,27.5ZM195.1,19.3L195.5,19L197,18.9L198.3,19.3L201.5,20L199,20.4L198.5,21.2L197.6,21.4L197.1,22.2L195.9,22.2L193.8,21.6L194.7,21.3L193.2,21L191.2,20.1L190.4,19.3L193.2,19L193.7,19.3ZM207.4,18.9L205.9,19.5L203,19.6L200.1,19.4L199.9,19.2L198.5,19.1L197.4,18.7L200.5,18.4L201.9,18.6L202.9,18.3L205.4,18.6ZM204.7,21.1L202.5,21.6L200.7,21.3L201.4,21.1L200.8,20.7L202.9,20.5L203.3,20.9ZM128.3,94.8L127.8,95.8L127.4,96.5L127.1,96.9L126.6,96.9L126.4,96.7L126.2,96.6L125.9,96.9L125.5,96.7L125.7,96.3L125.8,95.8L126,95.4L125.6,94.8L125.5,94.1L126,93.2L126.4,93.4L127.1,93.6L128.2,94.4ZM188.7,56.4L189.4,56L189.6,56.8L189.2,57.6L188.8,57.4L188.5,56.7ZM206.3,63.7L206.2,64L204.7,64.1L204.7,63.9L203.5,63.7L203.7,63.3L204.2,63.6L205,63.6L205.8,63.6L205.7,63.8ZM173.8,45.1L174,45.8L173.2,46.7L171.4,47.3L170,47.2L170.8,46.1L170.3,45.1L171.7,44.3L172.4,43.9L173.3,43.8L174.3,44.4ZM194.8,60.9L195.5,60.8L195.2,61.6L195.3,61.9L195.1,62.4L194.3,62L193.8,61.9L192.4,61.4L192.6,60.9L193.7,61ZM188.7,58.1L189.2,57.8L189.8,58.5L189.7,59.8L189.2,59.8L188.8,60.1L188.4,59.8L188.4,58.6L188.2,58ZM192.4,42.9L192.7,43.4L192.1,44.2L191,43.6L190.9,43.2ZM176.9,45.6L176.9,45.6L177.1,45L176.4,44.4L176.4,44.4L175.2,44.2L174.9,43.9L175.3,43.5L175,43.2L174.4,43.7L174.4,42.7L173.8,42.2L174.2,41.2L175,40.4L175.8,40.4L177,40.4L175.9,41.4L176.9,41.3L178,41.3L177.8,42.1L176.9,43L177.9,43.1L178,43.2L178.9,44.4L179.6,44.5L180.2,45.7L180.5,46.1L181.7,46.3L181.6,46.9L181,47.2L181.4,47.7L180.5,48.2L179.2,48.2L177.5,48.5L177,48.3L176.4,48.8L175.5,48.7L174.8,49L174.2,48.8L175.7,47.8L176.6,47.6L176.6,47.6L175,47.4L174.7,47L175.8,46.7L175.2,46.2L175.4,45.5ZM165.5,32.5L165.3,33.2L166.4,33.9L165.1,34.6L162.2,35.3L161.3,35.5L160,35.4L157.2,35L158.2,34.6L156,34.1L157.8,33.9L157.8,33.6L155.7,33.4L156.3,32.7L157.9,32.6L159.4,33.3L160.9,32.7L162.2,33L163.8,32.5ZM212.7,63.9L212.9,63.9L213.2,63.8L213.4,63.8L213.5,63.9L213.5,64L213.5,64L213.7,64L213.9,63.9L214,63.9L214,64L213,64.4L212.5,64.3L212.3,63.9Z"};
  const ANCH = {"North America": [80, 54], "South America": [122, 115], "Europe": [198, 47], "Africa": [200, 93], "Asia": [272, 57], "Oceania": [315, 123]};
  const ORDER = ['North America', 'South America', 'Europe', 'Africa', 'Asia', 'Oceania'];
  const KO = {'Africa':'아프리카','Asia':'아시아','Europe':'유럽','North America':'북미',
    'Oceania':'오세아니아','South America':'남미','Unknown':'미확인'};
  const isKo = () => (typeof LANG !== 'undefined' && LANG === 'ko');
  const nm = r => isKo() ? (KO[r] || r) : r;
  function counts(){
    const c = {};
    for(const a of AG){
      const r = a.region || REGION[a.country] || 'Unknown';
      c[r] = (c[r] || 0) + 1;
    }
    return c;
  }
  function paint(){
    const c = counts();
    const total = AG.length;
    const unk = c.Unknown || 0;
    /* each continent is shaded by how many agencies it holds - darker is more - on a
       log scale, so one country's hundred does not wash every other continent out */
    const top = Math.max(1, ...ORDER.map(r => c[r] || 0));
    const shade = n => n ? 'rgba(90,44,87,' + (0.16 + 0.78 * Math.log(n + 1) / Math.log(top + 1)).toFixed(3) + ')' : '';
    const shapes = ORDER.map(r => '<path class="wmc" data-r="' + r + '" d="' + PATHS[r] + '"' +
      ((c[r] || 0) ? ' style="--wmf:' + shade(c[r]) + '"' : ' data-zero="1"') +
      '><title>' + nm(r) + ' \u2014 ' + (c[r] || 0) + '</title></path>').join('');
    const ranked = ORDER.slice().sort((a, b) => (c[b] || 0) - (c[a] || 0));
    const pins = ORDER.map(r => {
      const n = c[r] || 0;
      const [x, y] = ANCH[r];
      const w = 13 + String(n).length * 7.6;
      return '<g class="wmp" data-r="' + r + '"' + (n ? '' : ' data-zero="1"') +
        ' transform="translate(' + x + ',' + y + ')" tabindex="0" role="button" ' +
        'aria-label="' + nm(r) + ': ' + n + '">' +
        '<title>' + nm(r) + ' — ' + n + (isKo() ? '개 에이전시' : (n === 1 ? ' agency' : ' agencies')) +
        '</title><rect x="' + (-w / 2) + '" y="-10" width="' + w + '" height="20" rx="10"/>' +
        '<text y="4.3">' + n + '</text></g>';
    }).join('');
    void pins;
    box.innerHTML =
      '<div class="wmhd"><b>' + (isKo() ? '대륙별 에이전시' : 'Agencies by continent') + '</b>' +
      '<s>' + total + '</s></div>' +
      '<div class="wmbody"><svg class="wmsvg" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="false">' +
      shapes + '</svg>' +
      '<div class="wmleg">' + ranked.map(r => '<button type="button" class="wml" data-r="' + r + '"' +
        ((c[r] || 0) ? '' : ' data-zero="1"') + '><i></i><span>' + nm(r) + '</span><b>' + (c[r] || 0) +
        '</b></button>').join('') +
      (unk ? '<span class="wml wml--unk" title="' + (isKo() ? '국가 미확인' : 'Country not stated') + '">' +
        '<span>' + nm('Unknown') + '</span><b>' + unk + '</b></span>' : '') + '</div></div>';
  }
  function go(r){
    if(!r) return;
    document.querySelectorAll('input[data-f="region"]').forEach(i => { i.checked = (i.value === r); });
    const one = document.querySelector('input[data-f="region"][value="' + r + '"]');
    try{ setView('dir'); }catch(e){}
    if(one) one.dispatchEvent(new Event('input', {bubbles: true}));
    else { try{ refresh(); }catch(e){} }
    const pane = document.getElementById('pane-dir');
    try{ (pane || document.body).scrollIntoView({behavior: 'smooth', block: 'start'}); }catch(e){}
  }
  const hit = e => { const t = e.target.closest('[data-r]'); return t && !t.dataset.zero ? t.dataset.r : null; };
  /* the widget is the door to the Atlas: a continent opens it on that continent */
  box.addEventListener('click', e => { const r = hit(e); if(window.atlasOpen) window.atlasOpen(r); else go(r); });
  box.addEventListener('keydown', e => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const r = hit(e);
    e.preventDefault(); if(window.atlasOpen) window.atlasOpen(r); else if(r) go(r);
  });
  /* hover a pin, a shape or a legend row and the continent lights in all three places */
  box.addEventListener('pointerover', e => {
    const t = e.target.closest('[data-r]');
    box.querySelectorAll('[data-r]').forEach(x => x.classList.toggle('on', !!t && x.dataset.r === t.dataset.r));
  });
  box.addEventListener('pointerleave', () => box.querySelectorAll('.on').forEach(x => x.classList.remove('on')));
  paint();
  window.WMAPPAINT = paint;
  /* the language switch re-renders text; repaint the map's own words with it */
  const lb = document.getElementById('langbtn');
  if(lb) lb.addEventListener('click', () => setTimeout(paint, 0));
})();

/* ---- the menu slides away ----
   One button, top left. Closed, the page takes the whole width; the choice is kept in
   this browser so the dashboard opens the way it was left. */
(function navToggle(){
  const b = document.getElementById('navtoggle');
  if(!b) return;
  const wide = () => window.matchMedia('(min-width:881px)').matches;
  const set = shut => {
    document.body.classList.toggle('navshut', shut);
    b.setAttribute('aria-expanded', String(!shut));
    const t = shut ? 'Show the menu' : 'Hide the menu';
    b.title = t; b.setAttribute('aria-label', t);
  };
  /* a drawer over the page starts closed every time */
  document.body.classList.add('navnoanim');
  set(true);
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('navnoanim')));
  b.addEventListener('click', e => { e.stopPropagation(); set(!document.body.classList.contains('navshut')); });
  /* a click anywhere outside the drawer closes it */
  document.addEventListener('click', e => {
    if(!wide() || document.body.classList.contains('navshut')) return;
    if(e.target.closest('.views,.hgroup,#navtoggle')) return;
    set(true);
  });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && wide() && !document.body.classList.contains('navshut')) set(true);
  });
  /* picking a section closes it - unless the click ended a drag to reorder */
  const views = document.getElementById('views');
  if(views) views.addEventListener('click', e => {
    if(!wide() || e.defaultPrevented) return;
    if(e.target.closest('button[role="tab"]')) setTimeout(() => set(true), 120);
  });
})();

/* ================= the Directory, as a file =================
   Everything the current search and sidebar would show - region, sex, tier, interest,
   measurement bounds and the search box - saved as one HTML page. A page on your own
   machine may load each agency's photograph, which this published page may not. */
function dirExportRows(){
  readBounds();
  const term = q.value.trim().toLowerCase();
  const regions = checked('region'), tiers = checked('tier'), sexes = checked('sex');
  const marks = checked('mark');
  const byMeas = !!(BND && BND.any);
  const seen = new Set(), out = [];
  for(const a of AG){
    const region = a.region || REGION[a.country] || 'Unknown';
    if(regions.length && !regions.includes(a.region)) continue;
    if(!illuAtOk(a)) continue;
    for(const b of a.boards){
      if(tiers.length && !tiers.includes(b.t)) continue;
      if(sexes.length && !sexes.includes(b.g)) continue;
      for(const m of b.m){
        const raw = m[1];
        const href = raw.charAt(0) === '|' ? raw.slice(1) : b.p + raw;
        const key = normKey(href);
        if(seen.has(key)) continue;
        seen.add(key);
        if(mdelIs(key)) continue;
        if(marks.length && !marks.includes(MARKS.get(key) || '')) continue;
        const nm = m[0] || '(unnamed)';
        if(term && !(nm + ' ' + a.name + ' ' + a.city + ' ' + a.country + ' ' + b.d)
                      .toLowerCase().includes(term)) continue;
        const rec = measRec(key) || null;
        if(byMeas){
          if(!rec) continue;
          const v = recOf(rec);
          if(!inRange(v.ht, BND.ht[0], BND.ht[1]) || !inRange(v.bu, BND.bu[0], BND.bu[1]) ||
             !inRange(v.wa, BND.wa[0], BND.wa[1]) || !inRange(v.hp, BND.hp[0], BND.hp[1]) ||
             !inRange(v.sh, BND.sh[0], BND.sh[1])) continue;
        }
        let minor = false;
        try{ minor = isMinor(key); }catch(e){}
        let ig = '';
        try{ ig = igFor(key, nm) || ''; }catch(e){}
        out.push({nm: nm, href: href, ag: a.name, dom: a.domain, city: a.city || '',
          country: a.country || '', region: region, div: b.d, tier: b.t, g: b.g,
          ht: rec ? rec[0] : null, bu: rec ? rec[1] : null, wa: rec ? rec[2] : null,
          hp: rec ? rec[3] : null, eu: rec ? rec[4] : null, us: rec ? rec[5] : null,
          ph: (!minor && rec && rec[6]) ? rec[6] : '', minor: minor,
          ig: ig ? String(ig).replace(/^@+/, '') : '', lamp: MARKS.get(key) || ''});
      }
    }
  }
  return out;
}
function dirExportLabel(){
  const bits = [];
  const add = (lab, arr) => { if(arr.length) bits.push(lab + ': ' + arr.join(', ')); };
  add('Region', checked('region'));
  add('Sex', checked('sex').map(x => SEXWORD[x] || x));
  add('Board', checked('tier').map(x => TIER[x] || x));
  add('Agency type', checked('atype').map(x => ILLU_AT[x] || x));
  add('Vote', checked('mark').map(x => ({g: 'Approved', y: 'Voting', r: 'Cancelled'})[x] || x));
  if(BND && BND.any){
    const r = (k, l) => { const p = BND[k]; if(p && (p[0] != null || p[1] != null))
      bits.push(l + ' ' + (p[0] != null ? p[0] : '') + '–' + (p[1] != null ? p[1] : '')); };
    r('ht', 'Height'); r('bu', 'Bust'); r('wa', 'Waist'); r('hp', 'Hips'); r('sh', 'Shoe');
  }
  const t = q.value.trim();
  if(t) bits.push('Search: “' + t + '”');
  return bits;
}
function dirExportHTML(rows, bits){
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c =>
    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const day = localDay(new Date());
  rows = rows.slice().sort((x, y) => COLL(x.country, y.country) || COLL(x.ag, y.ag) || COLL(x.nm, y.nm));
  const fig = r => {
    const f = [];
    const put = (l, v) => { if(v != null && v !== '') f.push('<span><i>' + l + '</i>' + e(v) + '</span>'); };
    put('HT', r.ht); put(r.g === 'M' ? 'CH' : 'B', r.bu); put('W', r.wa); put('H', r.hp);
    if(r.eu != null || r.us != null)
      f.push('<span><i>SH</i>' + e([r.eu != null ? r.eu + ' EU' : '', r.us != null ? r.us + ' US' : '']
        .filter(Boolean).join(' / ')) + '</span>');
    return f.length ? '<div class="m">' + f.join('') + '</div>' : '<div class="m none">not measured yet</div>';
  };
  const card = r => '<article class="c" data-s="' + e((r.nm + ' ' + r.ag + ' ' + r.city + ' ' + r.country +
      ' ' + r.div).toLowerCase()) + '" data-ht="' + (r.ht == null ? '' : r.ht) + '">' +
    (r.ph ? '<a class="ph" href="' + e(r.href) + '" target="_blank" rel="noopener"><img src="' + e(r.ph) +
        '" alt="' + e(r.nm) + '" loading="lazy" referrerpolicy="no-referrer" ' +
        'onerror="this.closest(\'.ph\').classList.add(\'none\');this.remove()"></a>'
      : '<a class="ph none" href="' + e(r.href) + '" target="_blank" rel="noopener"><span>' +
        (r.minor ? 'under 18 · no photo kept' : 'open profile for photos') + '</span></a>') +
    '<div class="b">' + (r.lamp ? '<i class="lamp ' + r.lamp + '"></i>' : '') +
      '<h3><a href="' + e(r.href) + '" target="_blank" rel="noopener">' + e(r.nm) + '</a></h3>' +
      '<p class="ag">' + e(r.ag) + (r.city ? ' · ' + e(r.city) : '') + '</p>' +
      '<p class="dv">' + e([SEXWORD[r.g] || '', TIER[r.tier] || '', r.div].filter(Boolean).join(' · ')) + '</p>' +
      fig(r) +
      '<p class="lk">' + (r.ig ? '<a href="https://www.instagram.com/' + e(r.ig) + '/" target="_blank" ' +
        'rel="noopener">@' + e(r.ig) + '</a>' : '') +
        '<a href="' + e(r.href) + '" target="_blank" rel="noopener">profile ↗</a></p>' +
    '</div></article>';
  let body = '', lastC = null;
  for(const r of rows){
    if(r.country !== lastC){
      if(lastC !== null) body += '</div></section>';
      const n = rows.filter(x => x.country === r.country).length;
      body += '<section class="s" data-c="' + e(r.country) + '"><h2>' + e(r.country || 'Country not stated') +
        '<b>' + n + (n === 1 ? ' model' : ' models') + '</b></h2><div class="g">';
      lastC = r.country;
    }
    body += card(r);
  }
  if(lastC !== null) body += '</div></section>';
  const withPh = rows.filter(r => r.ph).length, withM = rows.filter(r => r.ht != null).length;
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Illuménoctis — ' + e(bits.length ? bits.join(' · ') : 'Directory') + ' — ' + day + '</title><style>' +
    ':root{--paper:#F5F5F7;--surf:#fff;--ink:#17151C;--mut:#6C6875;--faint:#9D99A6;--line:#E5E3E9;' +
    '--acc:#6A2C66;--wash:#F4EAF3}' +
    '*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);' +
    'font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Malgun Gothic",sans-serif;' +
    'font-variant-numeric:tabular-nums}' +
    '.w{max-width:1440px;margin:0 auto;padding:26px 20px 60px}' +
    'header{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px 20px;margin-bottom:18px}' +
    'h1{margin:0;font-size:18px;letter-spacing:.24em;text-transform:uppercase}' +
    '.sub{margin:4px 0 0;color:var(--mut);font-size:12.5px}.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
    '.chips span{background:var(--wash);color:var(--acc);border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600}' +
    '.tools{margin-left:auto;display:flex;gap:8px}.tools input,.tools select{font:inherit;padding:8px 12px;' +
    'border:1px solid var(--line);border-radius:10px;background:#fff;min-width:0}.tools input{width:240px}' +
    '.s{margin-top:22px}h2{display:flex;align-items:baseline;gap:10px;margin:0 0 10px;font-size:17px}' +
    'h2 b{font-size:12px;font-weight:500;color:var(--mut)}' +
    '.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}' +
    '.c{background:var(--surf);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;' +
    'flex-direction:column;transition:box-shadow .15s}.c:hover{box-shadow:0 10px 26px -12px rgba(20,16,28,.3)}' +
    '.ph{display:block;aspect-ratio:3/4;background:#ECE9F0;overflow:hidden}' +
    '.ph img{width:100%;height:100%;object-fit:cover;object-position:50% 20%;display:block}' +
    '.ph.none{display:grid;place-items:center;color:var(--faint);font-size:11px;text-decoration:none;' +
    'text-align:center;padding:10px}' +
    '.b{padding:10px 12px 12px;position:relative}h3{margin:0;font-size:14.5px;padding-right:14px}' +
    'h3 a{color:inherit;text-decoration:none}h3 a:hover{color:var(--acc)}' +
    '.lamp{position:absolute;right:12px;top:14px;width:9px;height:9px;border-radius:50%}' +
    '.lamp.g{background:#22D45F}.lamp.y{background:#EFBC16}.lamp.r{background:#FF3B47}' +
    '.ag{margin:2px 0 0;font-size:12px;color:var(--mut)}.dv{margin:2px 0 0;font-size:10.5px;color:var(--faint);' +
    'text-transform:uppercase;letter-spacing:.04em}' +
    '.m{display:flex;flex-wrap:wrap;gap:2px 10px;margin-top:8px;font-size:12px}' +
    '.m i{font-style:normal;font-size:9.5px;color:var(--faint);margin-right:3px;letter-spacing:.05em}' +
    '.m.none{color:var(--faint);font-size:11px}' +
    '.lk{display:flex;gap:10px;margin:8px 0 0;font-size:12px}.lk a{color:var(--acc);text-decoration:none}' +
    '.lk a:hover{text-decoration:underline}.empty{padding:40px;text-align:center;color:var(--mut)}' +
    '@media print{.tools{display:none}.c{break-inside:avoid}}' +
    '</style></head><body><div class="w"><header><div><h1>Illuménoctis</h1>' +
    '<p class="sub">' + rows.length.toLocaleString() + (rows.length === 1 ? ' model' : ' models') + ' · ' +
      withM.toLocaleString() + ' measured · ' + withPh.toLocaleString() + ' with a photo link · saved ' + day +
      ' · photos load from each agency’s own site</p>' +
    '<div class="chips">' + (bits.length ? bits.map(b => '<span>' + e(b) + '</span>').join('')
      : '<span>Whole Directory — no filters</span>') + '</div></div>' +
    '<div class="tools"><input id="f" type="search" placeholder="Filter by name, agency, city…">' +
    '<select id="o"><option value="c">Sort: country</option><option value="n">Sort: name</option>' +
    '<option value="h">Sort: tallest first</option></select></div></header>' +
    (rows.length ? '<main id="all">' + body + '</main>' : '<p class="empty">No models match this search.</p>') +
    '</div><script>(function(){var f=document.getElementById("f"),o=document.getElementById("o"),' +
    'all=document.getElementById("all");if(!all)return;var secs=[].slice.call(all.querySelectorAll(".s"));' +
    'var cards=[].slice.call(all.querySelectorAll(".c"));' +
    'function filt(){var t=f.value.trim().toLowerCase();cards.forEach(function(c){c.hidden=!!t&&c.dataset.s.indexOf(t)<0;});' +
    'secs.forEach(function(s){s.hidden=!s.querySelector(".c:not([hidden])");});}' +
    'function sort(){var v=o.value;if(v==="c"){secs.forEach(function(s){s.style.display="";all.appendChild(s);});' +
    'var x=document.getElementById("flat");if(x)x.remove();cards.forEach(function(c){c._home&&c._home.appendChild(c);});return;}' +
    'cards.forEach(function(c){if(!c._home)c._home=c.parentNode;});var g=document.getElementById("flat");' +
    'if(!g){g=document.createElement("div");g.id="flat";g.className="g";all.prepend(g);}' +
    'secs.forEach(function(s){s.style.display="none";});var l=cards.slice();' +
    'l.sort(v==="n"?function(a,b){return a.querySelector("h3").textContent.localeCompare(b.querySelector("h3").textContent);}' +
    ':function(a,b){return (+b.dataset.ht||0)-(+a.dataset.ht||0);});l.forEach(function(c){g.appendChild(c);});}' +
    'f.addEventListener("input",filt);o.addEventListener("change",sort);})();</' + 'script></body></html>';
}
(function dirExportBtn(){
  const btn = document.getElementById('dirxbtn'), say = document.getElementById('dirxsay');
  if(!btn) return;
  const tell = t => { if(say) say.textContent = t; };
  btn.addEventListener('click', async () => {
    if(btn.disabled) return;
    btn.disabled = true;
    const label = btn.querySelector('span'), was = label.textContent;
    label.textContent = 'Preparing…';
    try{
      /* the figures and photo links live in the page's store; read them first */
      if(measState === 'idle') await loadMeas();
      let n = 0;
      while(measState === 'loading' && n++ < 200) await new Promise(r => setTimeout(r, 100));
      const rows = dirExportRows(), bits = dirExportLabel();
      const html = dirExportHTML(rows, bits);
      const slug = (bits.length ? bits.join('-') : 'directory').toLowerCase()
        .replace(/[^a-z0-9À-￿]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'directory';
      const fn = 'illumenoctis-' + slug + '-' + localDay(new Date()) + '.html';
      if(DOWN){
        await DOWN.save({filename: fn, data: html});
      }else{
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([html], {type: 'text/html'}));
        a.download = fn; document.body.appendChild(a); a.click(); a.remove();
      }
      tell('Saved ' + rows.length.toLocaleString() + (rows.length === 1 ? ' model' : ' models') + ' — ' + fn);
      label.textContent = 'Saved';
    }catch(err){
      label.textContent = (err && err.code === 'declined') ? 'Cancelled' : 'Could not save';
      if(!(err && err.code === 'declined')) tell('The file could not be saved here. Try again from the published page.');
    }
    setTimeout(() => { label.textContent = was; btn.disabled = false; }, 2200);
  });
})();

/* ---- the top band stays put ----
   Its height changes with the window and with the signed-in bar, so it is measured and
   handed to the sticky filter column and work log, which then start just below it. */
(function stickyHead(){
  const h = document.querySelector('header');
  if(!h) return;
  const set = () => {
    const px = Math.round(h.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--hdrh', px + 'px');
  };
  set();
  try{ new ResizeObserver(set).observe(h); }catch(e){ window.addEventListener('resize', set); }
  const onScroll = () => document.body.classList.toggle('hdrstuck', window.scrollY > 4);
  window.addEventListener('scroll', onScroll, {passive: true});
  onScroll();
})();
