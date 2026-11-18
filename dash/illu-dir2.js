/* ================= The Directory, redrawn =================
   One pinned filter bar (search, Region, Country, Agency type, Board, Sex, favourites,
   sort) with a row of measurement ranges under it; a narrow agency list on the left; the
   chosen agency on the right as a grid of photographs, one tab per board. The + on a photo
   (or a click on it) opens the model's full card - lamps, name, figures, contacts, book -
   over the grid.
   The old sidebar's boxes stay the source of truth (hidden in this view): this bar ticks
   them, so every other tab and the export keep working exactly as before. */
(function(){

  'use strict';
  /* A model the agency site listed without a name (user, 2026-11-05: "why are some of the cards
     empty without names?"): the name is read from the profile address when it is written there
     (…/models/john-doe -> John Doe); an address of numbers or generic words gives no name. */
  const NOTNAME = /^(model|models|profile|portfolio|book|men|man|women|woman|mainboard|main|board|new|faces|newfaces|development|dev|talent|talents|view|index|detail|details|show|page|home|premier|elite|direct|commercial|curve|classic|image|images|gallery|en|fr|it|de|es|html?|php)$/i;
  function nameFromHref(href){
    let u; try{ u = new URL(href); }catch(e){ return ''; }
    const segs = u.pathname.split('/').filter(Boolean).map(x => { try{ return decodeURIComponent(x); }catch(e){ return x; } });
    for(let i = segs.length - 1; i >= 0 && i >= segs.length - 2; i--){
      /* the last part of the address; the one before it only when the last is a number, and only a two-word name */
      if(i < segs.length - 1 && !/^[\d\W_]+$/.test(segs[segs.length - 1])) break;
      const raw = segs[i].replace(/\.(html?|php|aspx?)$/i, '');
      const words = raw.split(/[-_+\s.]+/).filter(Boolean).filter(w => !/^\d+$/.test(w));
      if(!words.length || words.length > 4) continue;
      if(words.some(w => !/^\p{L}[\p{L}']*$/u.test(w))) continue;
      if(words.every(w => NOTNAME.test(w))) continue;
      if(i < segs.length - 1 && words.length < 2) continue;
      const nm = words.filter(w => !NOTNAME.test(w)).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      if(nm.length >= 2 && nm.length <= 40) return nm;
    }
    return '';
  }
  /* a "photo" that is the agency's logo or a stand-in picture, not the model */
  const STANDIN = /placeholder|no[-_]?(image|photo|picture|img)|default[-_.]|blank\.|logo|missing|dummy|spacer/i;
  window.__illuNameFromHref = nameFromHref;
  /* Europe in its four subregions (UN geoscheme; Turkey with the south) */
  const EUSUBS = ['Northern Europe', 'Western Europe', 'Southern Europe', 'Eastern Europe'];
  const EUSUB = (function(){ const m = new Map(); const add = (r, l) => l.forEach(c => m.set(c.toLowerCase(), r));
    add('Northern Europe', ['United Kingdom', 'UK', 'Great Britain', 'England', 'Scotland', 'Wales', 'Ireland', 'Sweden', 'Denmark', 'Norway', 'Finland', 'Estonia', 'Latvia', 'Lithuania', 'Iceland', 'Faroe Islands', 'Åland Islands', 'Guernsey', 'Jersey', 'Isle of Man']);
    add('Western Europe', ['France', 'Germany', 'Netherlands', 'The Netherlands', 'Holland', 'Belgium', 'Switzerland', 'Austria', 'Luxembourg', 'Monaco', 'Liechtenstein']);
    add('Southern Europe', ['Italy', 'Spain', 'Portugal', 'Greece', 'Serbia', 'San Marino', 'Croatia', 'Malta', 'Slovenia', 'Turkey', 'Türkiye', 'Cyprus', 'Albania', 'Montenegro', 'North Macedonia', 'Macedonia', 'Bosnia and Herzegovina', 'Andorra', 'Kosovo', 'N. Cyprus', 'Vatican City']);
    add('Eastern Europe', ['Russia', 'Poland', 'Ukraine', 'Czech Republic', 'Czechia', 'Hungary', 'Romania', 'Bulgaria', 'Slovakia', 'Belarus', 'Moldova', 'Georgia', 'Armenia', 'Azerbaijan']);
    return m; })();
  const subOf = (region, country) => region === 'Europe' ? (EUSUB.get(String(country || '').trim().toLowerCase()) || 'Europe') : region;
  window.illuEuSub = c => EUSUB.get(String(c || '').trim().toLowerCase()) || '';
  window.ILLU_EUSUBS = EUSUBS;
  const D2 = {fold: new Set((() => { try{ return JSON.parse(localStorage.getItem('illu.d2fold') || '[]'); }catch(e){ return []; } })()), bsel: new Set([0]), bmore: false, bopen: false, max: false, sel: -1, board: 0, country: new Set(), sort: 'place', sub: (() => { try{ return localStorage.getItem('illu.d2sub') || ''; }catch(e){ return ''; } })(), fav: false, names: false, open: '', shown: 200, listTop: 0};
  window.D2STATE = D2;
  /* agencies taken off the list (docs agdel/<agency id>): hidden from the Directory for everyone,
     never deleted, and can be put back from "Show removed" at the bottom of the list */
  const REMOVED = new Map();
  /* 1.2.211 (user, 16 Nov 2026: "allow all USERS to hide the model photos and model agencies"): everyone signed in (was the Admin, 1.2.177) */
  const canRemove = () => { try{ return typeof SIGNED === 'function' ? !!SIGNED() : true; }catch(e){ return false; } };
  async function loadRemoved(){
    try{ const snap = await DB.collection('agdel').limit(20000).get(); const ds = (snap && snap.docs) ? snap.docs : (snap || []);
      for(const d of ds){ const v = docOf(d); REMOVED.set(String(d.id), v || {}); } }catch(e){}
    try{ if(VIEW === 'dir') refresh(); }catch(e){}
  }
  setTimeout(loadRemoved, 1500);
  const isRemoved = a => a && a.id != null && REMOVED.has(String(a.id));
  for(const a of AG) if(a.removed && a.id != null && !REMOVED.has(String(a.id))) REMOVED.set(String(a.id), {});
  /* everywhere else (the Atlas, its counts) a removed agency is simply not there */
  const atOk0 = window.illuAtOk;
  if(typeof atOk0 === 'function') window.illuAtOk = a => !isRemoved(a) && atOk0(a);
  const okRaw = a => typeof atOk0 === 'function' ? atOk0(a) : true;

  /* ---------- one agency, several offices ----------
     Agencies that share a website are one network (Select London, Select Paris, Select Milano...):
     the Directory lists the network once, with its offices; every office keeps its own city, country
     and pin. Each board is filed under the office whose city (or country) it names, otherwise under
     the office it was found on. */
  const SKIPDOM = /^(instagram\.com|facebook\.com|linktr\.ee|wixsite\.com|blogspot\.com|google\.com|sites\.google\.com)$/i;
  const fold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const squash = s => fold(s).replace(/[^a-z0-9]+/g, '');
  const PLACEWORD = /^(la|ny|nyc|uk|usa|us|paris|london|milan|milano|miami|chicago|atlanta|toronto|sydney|madrid|barcelona|berlin|hamburg|munich|stockholm|copenhagen|new|york|city|los|angeles|spain|france|italy|germany|international|worldwide|europe|asia)$/i;
  function netName(mem, prim){
    const words = mem.map(a => String(a.name || '').trim().split(/\s+/));
    const base = words.find(w => w.join(' ') === String(prim.name || '').trim()) || words[0];
    let n = 0;
    while(n < base.length && words.every(w => w[n] && fold(w[n]) === fold(base[n]))) n++;
    let pre = base.slice(0, n);
    const cities = new Set(mem.flatMap(a => fold(a.city || '').split(/[\s,]+/)).concat(mem.flatMap(a => fold(a.country || '').split(/\s+/))));
    while(pre.length > 1 && (PLACEWORD.test(pre[pre.length - 1]) || cities.has(fold(pre[pre.length - 1])))) pre.pop();
    const t = pre.join(' ');
    if(t.length < 3 || /^(the|models?|model|management|mgmt|agency)$/i.test(t)) return prim.name;
    return t;
  }
  function officeOf(b, offices, owner){
    const text = squash((b.d || '') + ' ' + (b.u || ''));
    let best = null, bl = 0;
    for(const o of offices){
      const c = squash(String(o.city || '').split(',')[0]);
      if(c.length >= 3 && text.includes(c) && c.length > bl){ best = o; bl = c.length; }
    }
    if(!best) for(const o of offices){ const c = squash(o.country); if(c.length >= 4 && text.includes(c)){ best = o; break; } }
    return best || offices.find(o => o.a === owner) || offices[0];
  }
  let NETS = [], NETV = '';
  function nets(){
    let nb = 0; for(const a of AG) nb += a.boards.length;
    const v = AG.length + ':' + nb + ':' + (window.__illuAGv || 0) + ':' + (window.__illuMomV || 0);     // __illuAGv: bumped when boards are changed in place; __illuMomV: a mother agency was set
    if(v === NETV) return NETS;
    NETV = v;
    const by = new Map();
    AG.forEach((a, idx) => {
      const d = String(a.domain || '').toLowerCase().replace(/^www\./, '');
      const k = d && !SKIPDOM.test(d) ? d : 'id:' + (a.id != null ? a.id : 'x' + idx);
      if(!by.has(k)) by.set(k, []);
      by.get(k).push(a);
    });
    NETS = [];
    /* 1.2.211: a model whose mother agency is in the Directory is listed there (a "Mother agency" board) and not at the
       agency she was found at */
    let MV = null; try{ MV = window.__illuMomMoves ? window.__illuMomMoves() : null; }catch(e){ MV = null; }
    if(MV && !MV.size) MV = null;
    const moved = [];
    for(const [k, mem] of by){
      mem.sort((p, q) => q.boards.length - p.boards.length || String(p.name || '').length - String(q.name || '').length);
      const prim = mem[0];
      const offices = mem.map(a => ({a, city: a.city || '', country: a.country || '', region: a.region || 'Unknown'}));
      const seenU = new Set(), boards = [];
      for(const a of mem) for(const b of a.boards){
        const u = String(b.u || '').replace(/\/$/, '');
        if(u && seenU.has(u)) continue; if(u) seenU.add(u);
        const nb2 = Object.assign({}, b); nb2.off = officeOf(b, offices, a); nb2.src = b;
        if(MV && Array.isArray(b.m)){
          const keep = [];
          for(const m of b.m){ let mk = ''; try{ mk = Array.isArray(m) && m[1] ? normKey(hrefOf(b, m)) : ''; }catch(e){} const md = mk && MV.get(mk);
            if(md && md !== k){ moved.push({md, b, m, from: a.name}); } else keep.push(m); }
          if(keep.length !== b.m.length) nb2.m = keep;
        }
        boards.push(nb2);
      }
      NETS.push({i: NETS.length, key: k, name: mem.length > 1 ? netName(mem, prim) : prim.name, members: mem, offices, boards,
        domain: prim.domain || '', id: prim.id, at: prim.at || '', prim, added: mem.map(a => a.added || '').sort().pop() || ''});
    }
    if(moved.length){
      const byKey = new Map(NETS.map(n => [n.key, n]));
      for(const x of moved){
        const n = byKey.get(x.md); if(!n) continue;
        const g = x.b.g || '?', t = x.b.t || '';
        let vb = n.boards.find(b => b.mom && b.g === g && b.t === t);
        /* first in the agency's board list, so it is the board that opens */
        if(!vb){ vb = {d: 'Mother agency', u: '', p: '', g, t, m: [], mom: true, off: n.offices[0], src: null}; n.boards.splice(n.boards.filter(b => b.mom).length, 0, vb); }
        const m2 = x.m.slice(); m2[1] = '|' + hrefOf(x.b, x.m);
        if(!vb.m.some(y => y[1] === m2[1])) vb.m.push(m2);
      }
      for(const n of NETS){ const vs = n.boards.filter(b => b.mom); if(vs.length > 1) for(const b of vs) b.d = 'Mother agency · ' + (b.g === 'M' ? 'Men' : b.g === 'F' ? 'Women' : 'Models') + (b.t === 'nf' || b.t === 'newfaces' ? ' (new faces)' : ''); }
    }
    return NETS;
  }
  window.__illuNets = nets;
  /* 1.2.219 (user, 17 Nov 2026: "MDI Agency Contacts"): the agencies MDI signed models from (illu-mdi-data.js, read from
     the contracts in Y:\\★지난모델). A network is an MDI contact when one of its members is on that list. */
  let MDIN = null, MDINV = '', MDIDV = null, MDID = {};
  function mdiOf(n){
    if(!n) return null;
    if(MDINV !== NETV || !MDIN || MDIDV !== window.__illuMDIData){ MDINV = NETV; MDIN = new Map(); MDIDV = window.__illuMDIData; MDID = MDIDV || {}; }
    if(MDIN.has(n.i)) return MDIN.get(n.i);
    let o = null;
    for(const a of n.members || []){ const e = a && a.id != null ? MDID[String(a.id)] : null; if(!e) continue;
      if(!o) o = {a: e.a, y: [], m: []};
      for(const y of e.y || []) if(!o.y.includes(y)) o.y.push(y);
      for(const m of e.m || []) if(!o.m.includes(m)) o.m.push(m); }
    if(o){ o.y.sort(); o.toks = o.m.map(x => fold(x).split(/[^a-z0-9]+/).filter(Boolean)).filter(t => t.length >= 2); }
    MDIN.set(n.i, o); return o;
  }
  /* a model on the agency's board is one MDI signed when her full name (first and last) is the name on the contract;
     a first name alone never matches, so two models called Anastasia are never mixed up */
  function mdiModel(m, n){
    try{
      if(!n){ const w = wkIndex(); n = w && (w.get(m.key) || (m.keys || []).map(k => w.get(k)).find(Boolean)); }
      const o = mdiOf(n); if(!o || !o.toks.length) return false;
      const c = fold(String(m.nm || '')).split(/[^a-z0-9]+/).filter(Boolean); if(c.length < 2) return false;
      return o.toks.some(t => t.every(w => c.includes(w)) && c.every(w => t.includes(w) || w.length < 2));
    }catch(e){ return false; }
  }
  function mdiLabel(o){ const y = o.y.length ? (o.y[0] === o.y[o.y.length - 1] ? o.y[0] : o.y[0] + '–' + o.y[o.y.length - 1]) : ''; return 'MDI AGENCY CONTACT' + (o.m.length ? ' · ' + o.m.length + (o.m.length === 1 ? ' MODEL' : ' MODELS') : '') + (y ? ' · ' + y : ''); }
  window.__illuMDIOf = n => mdiOf(n);
  /* 1.2.224 (user, 17 Nov 2026: "go through the Hiworks emails and input the agencies that we're in contact with / received
     replies / emails received from model agencies and mark them in the MDI Agency Contacts"): each person's program reads
     their Hiworks mail list (illu-email.js, nothing opened) and keeps, per Directory agency, the mails sent and received
     (docs hwag/<person>). Here they are added up for the team: Replied = mail both ways, Emailed = we wrote and no mail
     came back, Received = they wrote to us only. */
  const HWAG = new Map(); let HWV = 0;
  (function hwListen(){ if(typeof DB === 'undefined' || !DB){ setTimeout(hwListen, 900); return; }
    try{ DB.collection('hwag').onSnapshot(sn => { const per = new Map();
      for(const x of (sn.docs || [])){ let v = null; try{ v = typeof docOf === 'function' ? docOf(x) : x.data(); }catch(e){} if(!v || !Array.isArray(v.list)) continue;
        for(const r of v.list){ const d = String(r.d || '').toLowerCase().replace(/^www\./, ''); if(!d) continue; const o = per.get(d) || {i: 0, o: 0, li: '', lo: '', who: new Set()};
          o.i += +r.i || 0; o.o += +r.o || 0; if(String(r.li || '') > o.li) o.li = String(r.li || ''); if(String(r.lo || '') > o.lo) o.lo = String(r.lo || ''); if(v.by) o.who.add(v.by); per.set(d, o); } }
      HWAG.clear(); per.forEach((v, k) => HWAG.set(k, v)); HWV++; MLN = null; try{ refresh(); }catch(e){} }, () => {}); }catch(e){}
  })();
  let MLN = null, MLNV = '';
  function mailOf(n){
    if(!n || !HWAG.size) return null;
    const v = NETV + '|' + HWV; if(MLNV !== v || !MLN){ MLNV = v; MLN = new Map(); }
    if(MLN.has(n.i)) return MLN.get(n.i);
    let o = null;
    for(const a of n.members || []){ const d = String(a.domain || '').toLowerCase().replace(/^www\./, ''); const x = d && HWAG.get(d); if(!x) continue;
      if(!o) o = {i: 0, o: 0, li: '', lo: '', who: new Set()}; o.i += x.i; o.o += x.o; if(x.li > o.li) o.li = x.li; if(x.lo > o.lo) o.lo = x.lo; x.who.forEach(w => o.who.add(w)); }
    if(o) o.st = o.i && o.o ? 'rep' : o.o ? 'sent' : 'recv';
    MLN.set(n.i, o); return o;
  }
  const MLL = {rep: ['Replied', '답장 받음'], sent: ['Emailed', '메일 보냄'], recv: ['Received', '메일 받음']};
  const mlDay = iso => { const t = Date.parse(iso || ''); return t ? new Date(t).toLocaleDateString(isKo() ? 'ko-KR' : 'en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : ''; };
  function mlTip(o){ return (o.o ? o.o + ' sent by us' + (o.lo ? ' (last ' + mlDay(o.lo) + ')' : '') : 'nothing sent by us') + ' · ' + (o.i ? o.i + ' received' + (o.li ? ' (last ' + mlDay(o.li) + ')' : '') : 'nothing received') + ' · from the Hiworks mail of ' + o.who.size + (o.who.size === 1 ? ' person' : ' people'); }
  function mdiKind(n){ const c = !!mdiOf(n), m = mailOf(n); return {c, m, any: c || !!m}; }
  function mdiPass(n){ const k = mdiKind(n); if(!k.any) return false; const f = D2.mdiK || ''; return !f || (f === 'c' ? k.c : !!(k.m && k.m.st === f)); }
  window.__illuMailOf = n => mailOf(n);
  /* 1.2.223 (user, 17 Nov 2026: "some sort of marker that mentions that the instagram, agency website/list has been newly
     added"): an agency added to the Directory in the last 14 days has a NEW tag with the day it was added */
  const NEWDAYS = 14;
  function newTag(iso, cls){
    const t = Date.parse(iso || ''); if(!t || Date.now() - t > NEWDAYS * 864e5) return '';
    const d = new Date(t), day = d.toLocaleDateString(isKo() ? 'ko-KR' : 'en-GB', {day: 'numeric', month: 'short'});
    return '<span class="newtag' + (cls ? ' ' + cls : '') + '" title="' + esc((isKo() ? '새로 추가됨 · ' : 'Newly added to the Directory · ') + day) + '">' + (isKo() ? 'NEW' : 'NEW') + '<i> · ' + esc(day) + '</i></span>';
  }
  window.__illuNewTag = newTag;
  window.__illuMDIModel = (m, n) => mdiModel(m, n);
  /* 1.2.194 (user, 14 Nov 2026, approved demo "A + B"): an agency row shows when the team is working on, or has worked on,
     one of its models - a coloured left edge (orange in progress, green worked with), the faces of the people and the
     status; inside the agency those models come first, newest first from the left, each with a corner tag */
  let WKI = null, WKIV = '';
  function wkIndex(){
    const ns = nets();
    if(WKIV !== NETV || !WKI){ WKIV = NETV; WKI = new Map();
      for(const n of ns) for(const b of n.boards) for(const m of (b.m || [])){ if(!Array.isArray(m) || !m[1]) continue; let k = ''; try{ k = normKey(hrefOf(b, m)); }catch(e){} if(k && !WKI.has(k)) WKI.set(k, n); } }
    return WKI;
  }
  let WKN = null, WKNT = 0;
  function wkByNet(fresh){
    if(!fresh && WKN && Date.now() - WKNT < 400) return WKN;
    let all = []; try{ all = window.__illuWorkedAll ? window.__illuWorkedAll() : []; }catch(e){}
    const idx = wkIndex(), out = new Map();
    for(const e of all){
      /* her address's own site first (the agency's domain), then the board she is on, then the agency name */
      let n = null; try{ const h = new URL(e.k).hostname.replace(/^www\./, '').toLowerCase(); n = NETS.find(x => x.key === h) || null; }catch(er){}
      if(!n) n = idx.get(e.key) || null;
      if(!n && e.ag){ const f = fold(e.ag).trim(); if(f) n = NETS.find(x => fold(x.name).trim() === f || x.members.some(a => fold(a.name).trim() === f)); }
      if(!n) continue;
      let w = out.get(n.i); if(!w){ w = {live: 0, done: 0, items: []}; out.set(n.i, w); }
      w.items.push(e); if(e.live) w.live++; else w.done++;
    }
    for(const w of out.values()) w.items.sort((p, q) => String(q.at).localeCompare(String(p.at)));
    WKN = out; WKNT = Date.now();
    return out;
  }
  window.__illuWkByNet = () => wkByNet(true);
  const wkFaces = (items, max) => { const ps = []; for(const e of items) if(e.who && !ps.includes(e.who)) ps.push(e.who); let h = ''; try{ h = ps.slice(0, max).map(p => window.__illuDiscOf ? window.__illuDiscOf(p) : '').join(''); }catch(e){} return h ? '<span class="wkavs">' + h + '</span>' : ''; };
  const wkWho = p => { try{ return (PEOPLE.get(p) || {}).n || ''; }catch(e){ return ''; } };
  function wkRow(w){
    if(!w) return {cls: '', html: '', tip: ''};
    const live = w.live > 0;
    const txt = live ? (w.live > 1 ? w.live + ' in progress' : 'In progress') : 'Worked with';
    return {cls: live ? ' wkl' : ' wkd', html: wkFaces(live ? w.items.filter(e => e.live) : w.items, 3) + '<em class="wkt"><i></i>' + txt + '</em>',
      tip: w.items.slice(0, 8).map(e => (e.nm || 'Model') + ' — ' + e.lab + (wkWho(e.who) ? ' (' + wkWho(e.who) + ')' : '')).join('\n') + (w.items.length > 8 ? '\n+' + (w.items.length - 8) + ' more' : '')};
  }
  const netRemoved = n => n.members.every(isRemoved);
  /* the Directory and the Recommendations page draw the same grid and card: look inside the one on screen */
  /* Compare boards is one of the shell's own pages (VIEW keeps the page that was open before it) */
  const CMPB = () => { const p = document.getElementById('pane-cmpb'); return !!p && !p.hidden; };
  const DV = () => CMPB() || VIEW === 'dir' || VIEW === 'arr';
  const ROOT = () => document.getElementById(CMPB() ? 'pane-cmpb' : VIEW === 'arr' ? 'pane-arr' : 'pane-dir') || document;
  const $ = s => (s.charAt(0) === '#' ? document.querySelector(s) : (ROOT().querySelector(s) || ((VIEW === 'arr' || CMPB()) && /^\.d2(card|body|veil|grid)/.test(s) ? null : document.querySelector(s))));
  const hrefOf = (b, m) => m[1].charAt(0) === '|' ? m[1].slice(1) : b.p + m[1];
  const FIL = [
    {f: 'region', label: 'Region'}, {f: 'country', label: 'Country'}, {f: 'atype', label: 'Agency type'},
    {f: 'tier', label: 'Board'}, {f: 'sex', label: 'Sex'}, {f: 'mark', label: 'Vote'}];
  const MEAS = [['HT', 'ht'], ['B', 'b'], ['W', 'w'], ['H', 'h'], ['SH', 's']];

  /* ---------- the bar (built once, kept while you type) ---------- */
  function bar(){
    let el = $('#d2bar');
    if(el) return el;
    const pane = $('#pane-dir'); if(!pane) return null;
    el = document.createElement('section');
    el.id = 'd2bar'; el.setAttribute('aria-label', 'Search and filters');
    el.innerHTML =
      '<div class="d2r1">' +
        '<label class="d2q"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>' +
        '<input type="search" id="d2q" placeholder="Search agency, city, email…" autocomplete="off" aria-label="Search the Directory"></label>' +
        '<button type="button" class="d2f d2mdif" data-d2mdi aria-pressed="false" title="Only the agencies MDI has signed models from (from the past contracts)"><i class="mdif" aria-hidden="true"></i>MDI Agency Contacts<em class="d2mdin"></em></button>' +
        FIL.map(x => '<button type="button" class="d2f" data-d2f="' + x.f + '" aria-haspopup="true" aria-expanded="false">' + x.label +
          '<span class="d2fv"></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>').join('') +
        '<button type="button" class="d2f d2fav" data-d2fav aria-pressed="false">♡ Favorites</button>' +
        '<span class="d2sp"></span>' +
        '<button type="button" class="d2f d2maxb" data-d2max aria-pressed="false" title="Give the Directory the whole window (Esc to go back)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg><span>Maximize</span></button>' +
        '<label class="d2sort">Sort <select id="d2sort"><option value="place">Region › Country (A–Z)</option><option value="name">Name A–Z</option><option value="models">Most models</option><option value="fits" hidden>Most that fit the measurements</option></select></label>' +
      '</div>' +
      '<div class="d2r2"><b class="d2ml">MEASUREMENTS</b>' +
        MEAS.map(([k, id]) => '<span class="d2m" data-d2m="' + id + '"><b>' + k + '</b>' +
          '<input type="number" inputmode="decimal" placeholder="min" aria-label="' + k + ' from" data-d2mi="' + id + '-lo">' +
          '<i>–</i><input type="number" inputmode="decimal" placeholder="max" aria-label="' + k + ' to" data-d2mi="' + id + '-hi"><em class="d2mu"></em></span>').join('') +
        '<span class="d2seg" role="group" aria-label="Units"><button type="button" data-d2u="cm">cm</button><button type="button" data-d2u="in">in</button></span>' +
        '<span class="d2fit" id="d2fit"></span>' +
        '<span class="d2chips" id="d2chips"></span>' +
      '</div>' +
      '<div class="d2pop" id="d2pop" hidden></div>';
    const main0 = $('#main');
    pane.insertBefore(el, main0);
    /* search: the sidebar's box is the one the rest of the program reads */
    const q0 = $('#q'), q1 = el.querySelector('#d2q');
    if(q0) q1.value = q0.value;
    q1.addEventListener('input', () => { if(q0){ q0.value = q1.value; q0.dispatchEvent(new Event('input', {bubbles: true})); } D2.shown = 200; });
    el.querySelector('#d2sort').addEventListener('change', e => { D2.sort = e.target.value; D2.listTop = 0; D2.keepTop = true; refresh(); });
    el.addEventListener('input', e => {
      const t = e.target.closest && e.target.closest('[data-d2mi]'); if(!t) return;
      const o = document.querySelector('input[data-m="' + t.dataset.d2mi + '"]');
      if(o){ o.value = t.value; o.dispatchEvent(new Event('input', {bubbles: true})); o.dispatchEvent(new Event('change', {bubbles: true})); }
      if(measState === 'idle') try{ loadMeas(); }catch(err){}
    });
    el.addEventListener('click', e => {
      const f = e.target.closest('[data-d2f]');
      if(f){ e.stopPropagation(); togglePop(f); return; }
      if(e.target.closest('[data-d2max]')){ setMax(!D2.max); return; }
      if(e.target.closest('[data-d2fav]')){ D2.fav = !D2.fav; D2.shown = 200; refresh(); return; }
      { const mk = e.target.closest('[data-d2mdik]'); if(mk){ D2.mdiK = mk.dataset.d2mdik; D2.shown = 200; D2.sel = -1; D2.listTop = 0; D2.keepTop = true; refresh(); return; } }
      if(e.target.closest('[data-d2mdi]')){ D2.mdi = !D2.mdi; if(!D2.mdi) D2.mdiK = ''; D2.shown = 200; D2.sel = -1; D2.listTop = 0; D2.keepTop = true; refresh(); return; }
      const u = e.target.closest('[data-d2u]');
      if(u){ const o = document.querySelector('[data-useg="bw"] [data-u="' + u.dataset.d2u + '"]'); if(o) o.click();
        const h = document.querySelector('[data-useg="ht"] [data-u="' + (u.dataset.d2u === 'in' ? 'ft' : 'cm') + '"]'); if(h) h.click();
        setTimeout(syncBar, 0); return; }
      const c = e.target.closest('[data-d2chip]');
      if(c){ dropChip(c.dataset.d2chip); return; }
      if(e.target.closest('[data-d2clear]')){ clearAll(); return; }
      const opt = e.target.closest('[data-d2opt]');
      if(opt){ pick(opt.dataset.d2opt, opt.dataset.v); return; }
    });
    /* the list is redrawn after each tick, so the clicked option is no longer in the page by the
       time this runs: that is still a click inside, and the list stays open for the next choice */
    document.addEventListener('click', e => { const p = $('#d2pop'); if(p && !p.hidden && document.contains(e.target) && !e.target.closest('#d2pop') && !e.target.closest('[data-d2f]')) closePop(); });
    return el;
  }
  /* the options of one filter, with the counts the sidebar already keeps */
  function opts(f){
    if(f === 'country'){
      const regions = checked('region'), n = new Map();
      for(const a of AG){
        if(isRemoved(a)) continue;
        if(regions.length && !regions.includes(a.region)) continue;
        const c = a.country || 'Unknown'; n.set(c, (n.get(c) || 0) + 1);
      }
      return [...n.entries()].sort((p, q) => COLL(p[0], q[0])).map(([v, c]) => ({v, l: v === 'Unknown' ? 'Not stated' : v, n: c, on: D2.country.has(v)}));
    }
    return [...document.querySelectorAll('input[data-f="' + f + '"]')].map(i => {
      const lab = i.closest('label');
      const l = lab ? (lab.querySelector('span:not(.oc)') || lab).textContent.trim() : i.value;
      const oc = lab && lab.querySelector('.oc');
      return {v: i.value, l, n: oc ? oc.textContent.trim() : '', on: i.checked};
    });
  }
  function togglePop(btn){
    const p = $('#d2pop');
    if(!p.hidden && p.dataset.f === btn.dataset.d2f){ closePop(); return; }
    p.dataset.f = btn.dataset.d2f;
    const list = opts(btn.dataset.d2f);
    p.innerHTML = '<div class="d2pl">' + (list.length ? list.map(o =>
      '<button type="button" class="d2o' + (o.on ? ' on' : '') + '" data-d2opt="' + esc(btn.dataset.d2f) + '" data-v="' + esc(o.v) + '" aria-pressed="' + o.on + '">' +
      '<i aria-hidden="true">' + (o.on ? '✓' : '') + '</i><span>' + esc(o.l) + '</span><s>' + esc(String(o.n)) + '</s></button>').join('')
      : '<p class="d2pe">Nothing to choose here.</p>') + '</div>';
    const r = btn.getBoundingClientRect(), b = $('#d2bar').getBoundingClientRect();
    p.style.left = Math.max(0, r.left - b.left) + 'px'; p.style.top = (r.bottom - b.top + 6) + 'px';
    p.hidden = false;
    document.querySelectorAll('[data-d2f]').forEach(x => x.setAttribute('aria-expanded', String(x === btn)));
  }
  function closePop(){ const p = $('#d2pop'); if(p) p.hidden = true; document.querySelectorAll('[data-d2f]').forEach(x => x.setAttribute('aria-expanded', 'false')); }
  function pick(f, v){
    if(f === 'country'){ if(D2.country.has(v)) D2.country.delete(v); else D2.country.add(v); }
    else{ const i = document.querySelector('input[data-f="' + f + '"][value="' + CSS.escape(v) + '"]'); if(i) i.click(); }
    D2.shown = 200; D2.sel = -1; D2.listTop = 0; D2.keepTop = true;
    refresh();
    const btn = document.querySelector('[data-d2f="' + f + '"]'); if(btn){ closePop(); togglePop(btn); }
  }
  function dropChip(id){
    const [f, v] = id.split('\u0001');
    if(f === 'meas'){ document.querySelectorAll('input[data-m^="' + v + '-"]').forEach(o => { o.value = ''; o.dispatchEvent(new Event('input', {bubbles: true})); }); syncBar(); refresh(); return; }
    if(f === 'fav'){ D2.fav = false; refresh(); return; }
    if(f === 'mdi'){ D2.mdi = false; D2.mdiK = ''; refresh(); return; }
    pick(f, v); closePop();
  }
  function clearAll(){
    D2.country.clear(); D2.fav = false; D2.mdi = false; D2.showAll = false; D2.sel = -1;
    document.querySelectorAll('input[data-f]:checked').forEach(i => i.click());
    document.querySelectorAll('input[data-m]').forEach(o => { if(o.value){ o.value = ''; o.dispatchEvent(new Event('input', {bubbles: true})); } });
    const q0 = $('#q'); if(q0 && q0.value){ q0.value = ''; q0.dispatchEvent(new Event('input', {bubbles: true})); }
    syncBar(); refresh();
  }
  /* the bar shows what is chosen: on the buttons, as chips, and in the boxes */
  function syncBar(fitInfo){
    const el = bar(); if(!el) return;
    if(fitInfo === undefined) fitInfo = D2.fitInfo; else D2.fitInfo = fitInfo;
    const chips = [];
    for(const x of FIL){
      const on = x.f === 'country' ? [...D2.country] : checked(x.f);
      const btn = el.querySelector('[data-d2f="' + x.f + '"]');
      const names = x.f === 'country' ? on : opts(x.f).filter(o => o.on).map(o => o.l);
      btn.classList.toggle('on', on.length > 0);
      btn.querySelector('.d2fv').textContent = on.length ? ' · ' + (names.length <= 2 ? names.join(', ') : names[0] + ' +' + (names.length - 1)) : '';
      (x.f === 'country' ? on.map(v => ({v, l: v})) : opts(x.f).filter(o => o.on)).forEach(o => chips.push({id: x.f + '\u0001' + o.v, l: o.l}));
    }
    el.querySelector('[data-d2fav]').classList.toggle('on', D2.fav);
    el.querySelector('[data-d2fav]').setAttribute('aria-pressed', String(D2.fav));
    if(D2.fav) chips.push({id: 'fav\u0001', l: 'Favorites'});
    { const mb = el.querySelector('[data-d2mdi]'); if(mb){ mb.classList.toggle('on', !!D2.mdi); mb.setAttribute('aria-pressed', String(!!D2.mdi));
        let c = 0; const kc = {c: 0, rep: 0, sent: 0, recv: 0}; try{ for(const n of nets()){ if(netRemoved(n)) continue; const k = mdiKind(n); if(!k.any) continue; c++; if(k.c) kc.c++; if(k.m) kc[k.m.st]++; } }catch(e){} mb.querySelector('.d2mdin').textContent = c ? ' ' + c : ''; D2.mdiKC = kc; } }
    if(D2.mdi) chips.push({id: 'mdi\u0001', l: 'MDI Agency Contacts'});
    for(const [k, id] of MEAS){
      const lo = document.querySelector('input[data-m="' + id + '-lo"]'), hi = document.querySelector('input[data-m="' + id + '-hi"]');
      const a = el.querySelector('[data-d2mi="' + id + '-lo"]'), b = el.querySelector('[data-d2mi="' + id + '-hi"]');
      if(lo && document.activeElement !== a && a.value !== lo.value) a.value = lo.value;
      if(hi && document.activeElement !== b && b.value !== hi.value) b.value = hi.value;
      const set = !!((lo && lo.value) || (hi && hi.value));
      el.querySelector('[data-d2m="' + id + '"]').classList.toggle('on', set);
      el.querySelector('[data-d2m="' + id + '"] .d2mu').textContent = id === 's' ? String(shoeUnit).toUpperCase() : (lenUnit === 'in' ? 'in' : 'cm');
    }
    const unit = lenUnit === 'in' ? 'in' : 'cm';
    el.querySelectorAll('[data-d2u]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.d2u === unit)));
    const fit = el.querySelector('#d2fit');
    fit.innerHTML = fitInfo ? fitInfo : '';
    el.querySelector('#d2chips').innerHTML = chips.map(c => '<span class="d2chip">' + esc(c.l) +
      '<button type="button" data-d2chip="' + esc(c.id) + '" aria-label="Remove ' + esc(c.l) + '">×</button></span>').join('') +
      (chips.length || BND && BND.any ? '<button type="button" class="d2clr" data-d2clear>Clear all</button>' : '') +
      /* 1.2.224: inside MDI Agency Contacts - contracts, or by Hiworks mail: replied / emailed / received */
      (D2.mdi ? '<span class="d2mdik" role="group" aria-label="MDI Agency Contacts">' + [['', 'All'], ['c', 'Contracts'], ['rep', '✉ Replied'], ['sent', '✉ Emailed'], ['recv', '✉ Received']].map(([k, l]) =>
        '<button type="button" data-d2mdik="' + k + '" aria-pressed="' + ((D2.mdiK || '') === k) + '"' + (k ? ' class="k-' + k + '"' : '') + '>' + l + (k && D2.mdiKC ? ' <s>' + (D2.mdiKC[k] || 0) + '</s>' : '') + '</button>').join('') + '</span>' : '');
    /* "most that fit" only means something once measurements are typed in */
    const fo = el.querySelector('#d2sort option[value="fits"]'), anyM = !!(BND && BND.any);
    if(fo){ fo.hidden = !anyM; fo.disabled = !anyM; if(!anyM && D2.sort === 'fits'){ D2.sort = 'place'; el.querySelector('#d2sort').value = 'place'; } }
    const q0 = $('#q'), q1 = el.querySelector('#d2q');
    if(q0 && document.activeElement !== q1 && q1.value !== q0.value) q1.value = q0.value;
  }

  /* ---------- who is on the list ---------- */
  function fits(key){
    const rec = measRec(key); if(!rec) return false;
    const v = recOf(rec);
    return inRange(v.ht, BND.ht[0], BND.ht[1]) && inRange(v.bu, BND.bu[0], BND.bu[1]) && inRange(v.wa, BND.wa[0], BND.wa[1]) &&
      inRange(v.hp, BND.hp[0], BND.hp[1]) && inRange(v.sh, BND.sh[0], BND.sh[1]);
  }
  /* the same model on two boards of one agency (London and Paris) is one person when her name and
     the end of her page address match: one card, one lamp, one set of measurements */
  const GENSEG = /^(portfolio|book|polaroids?|digitals?|index(\.\w+)?|profile|about|overview|info)$/i;
  function coreOf(href){
    let p = ''; try{ p = new URL(href).pathname + (new URL(href).hash.length > 4 ? '/' + new URL(href).hash.slice(1) : ''); }catch(e){ p = String(href); }
    const segs = p.split('/').filter(Boolean).map(x => { try{ return decodeURIComponent(x); }catch(e){ return x; } });
    let s = segs.pop() || '';
    if(GENSEG.test(s)) s = segs.pop() || s;
    s = s.replace(/\.(html?|php|aspx?|web)$/i, '');   /* 1.2.220: olya_lade.html and 11947-olya-lade.web are the same person */
    return fold(s).replace(/^\d+[-_]+/, '').replace(/[-_]+\d+$/, '').replace(/[^a-z0-9]+/g, '');
  }
  window.__illuCoreOf = coreOf;
  const hasMeas = k => { const r = measRec(k); return !!(r && r.slice(0, 6).some(v => v != null)); };
  const PC = new Map(); let PCV = '';
  function peopleCount(n, bs){
    if(PCV !== NETV){ PC.clear(); PCV = NETV; }
    const k = n.i + ':' + bs.map(b => n.boards.indexOf(b)).join(',');
    let c = PC.get(k);
    if(c === undefined){
      const ps = new Set();
      for(const b of bs) for(const m of b.m){ const href = hrefOf(b, m); if(mdelIs(normKey(href))) continue; ps.add(squash(m[0] || '') + '|' + coreOf(href)); }
      c = ps.size; PC.set(k, c);
    }
    return c;
  }
  function modelsOf(a, bs){
    const byP = new Map(), seen = new Set();
    for(const b of bs) for(const m of b.m){
      const href = hrefOf(b, m), key = normKey(href);
      if(mdelIs(key)) continue;
      const pk = squash(m[0] || '') + '|' + coreOf(href);
      let p = byP.get(pk);
      if(!p){ p = {nm: String(m[0] || '').trim() || nameFromHref(href) || '(unnamed)', al: [], boards: []}; byP.set(pk, p); }
      if(!seen.has(key)){ seen.add(key); p.al.push({key, href, b}); }
      if(!p.boards.includes(b)) p.boards.push(b);
    }
    const out = [];
    for(const p of byP.values()){
      if(!p.al.length) continue;
      /* the card follows the address that already has a lamp, else measurements, else the first */
      const c = p.al.find(x => lampOf(x.key)) || p.al.find(x => hasMeas(x.key)) || p.al[0];
      if(!hasMeas(c.key)){ const w = p.al.find(x => hasMeas(x.key)); if(w) MEAS.set(c.key, measRec(w.key)); }
      const off = (c.b.off || {});
      out.push({key: c.key, nm: p.nm, href: c.href, ag: a.name, city: off.city || a.city || '', country: off.country || a.country || '', div: c.b.d || '', g: (window.__illuSexOf && window.__illuSexOf(c.key)) || c.b.g || '?', t: c.b.t || '',     /* 1.2.193: a sex set on her card wins */
        b: c.b, boards: p.boards, keys: p.al.map(x => x.key)});
    }
    return out;
  }
  function rows(){
    const term = ((($('#q') || {}).value) || '').trim().toLowerCase();
    const regions = checked('region'), tiers = checked('tier'), sexes = checked('sex'), marks = checked('mark');
    const byMeas = !!(BND && BND.any) && measState === 'ready';
    const fav = D2.fav ? new Set((window.ATLFAV ? ATLFAV.list() : [])) : null;
    const placeF = regions.length || D2.country.size;
    const out = [];
    for(const n of nets()){
      if(netRemoved(n) !== !!D2.showRemoved) continue;
      const offs = D2.showRemoved ? n.offices : n.offices.filter(o => !isRemoved(o.a));
      if(!offs.some(o => okRaw(o.a))) continue;
      const offM = offs.filter(o => (!regions.length || regions.includes(o.region)) && (!D2.country.size || D2.country.has(o.country || 'Unknown')));
      if(!offM.length) continue;
      if(fav && !fav.has(n.domain)) continue;
      if(D2.mdi && !mdiPass(n)) continue;
      let bs = n.boards.filter(b => (!tiers.length || tiers.includes(b.t)) && (!sexes.length || sexes.includes(b.g)) && offs.includes(b.off));
      /* a country chosen: only that country's boards (a network with no board filed there still shows) */
      if(placeF){ const inM = bs.filter(b => offM.includes(b.off)); if(inM.length || !bs.length) bs = inM; }
      if(!bs.length && (n.boards.length || tiers.length || sexes.length) && !placeF) continue;
      if(term){
        const hay = (n.name + ' ' + n.members.map(a => a.name + ' ' + a.city + ' ' + a.country).join(' ') + ' ' + n.domain + ' ' + ctsHay(n.domain)).toLowerCase();
        if(!hay.includes(term)) continue;
      }
      /* 1.2.185 (user, 13 Nov 2026: "I'm unable to find ANM MANAGEMENT on the directory list"): ANM was there, but sixth -
         under agencies that only had "anm" inside a word or a web address (cosmopolit-anm-odel.com). An agency whose
         name matches comes first: the exact name, then names starting with it, then a word starting with it, then the rest */
      let rk = 9;
      if(term){ const t = fold(term), st = squash(term), nm = fold(n.name), sn = squash(n.name), wre = new RegExp('(^|[^a-z0-9])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const w0 = nm.split(/[^a-z0-9]+/).filter(Boolean);
        rk = nm === t || sn === st ? 0 : w0[0] === t || nm.startsWith(t + ' ') ? 1 : nm.startsWith(t) ? 2 : w0.includes(t) ? 3 : wre.test(nm) ? 4 : sn.startsWith(st) ? 5 : sn.includes(st) ? 6
          : n.members.some(a => fold(a.name).includes(t)) ? 7 : n.members.some(a => fold(a.city + ' ' + a.country).includes(t)) ? 8 : 9; }
      /* the full people list is only built when lamps or measurements decide; otherwise a cached count */
      let ms = null, cnt;
      if(marks.length || byMeas){
        ms = modelsOf(n, bs);
        if(marks.length) ms = ms.filter(m => marks.includes(lampOf(m.key) || ''));
        if(marks.length && !ms.length) continue;
        cnt = ms.length;
      } else cnt = peopleCount(n, bs);
      const fit = byMeas ? ms.filter(m => fits(m.key)).length : -1;
      if(byMeas && !fit) continue;
      /* sorted by place, a network appears under each country it has an office in */
      const groups = new Map();
      if(D2.sort === 'place') for(const o of offM){ const g = subOf(o.region || 'Unknown', o.country) + '\u0001' + (o.country || ''); if(!groups.has(g)) groups.set(g, []); groups.get(g).push(o); }
      else groups.set('', offM);
      for(const [g, os] of groups){
        const co = g ? os[0].country : '';
        const cities = [...new Set(os.map(o => String(o.city || '').split(',')[0]).filter(Boolean))];
        const allCities = [...new Set(offs.map(o => String(o.city || '').split(',')[0]).filter(Boolean))];
        const view = {name: n.name, domain: n.domain, id: n.id, at: n.at, boards: n.boards, net: n,
          city: cities.join(' · '), country: g ? co : [...new Set(os.map(o => o.country).filter(Boolean))].join(' · '),
          region: os[0].region, offices: offs, allCities};
        out.push({id: n.i + '|' + co, net: n, a: view, bs, n: cnt, fit, co, rg: subOf(os[0].region, os[0].country), rk});
      }
    }
    const coll = COLL;
    /* the four European subregions stay together, north - west - south - east */
    const rg = x => !x.rg || x.rg === 'Unknown' ? '\uffff' : EUSUBS.includes(x.rg) ? 'Europe\u0001' + EUSUBS.indexOf(x.rg) : x.rg;   // no region: at the end
    const ct = x => x.a.country || '\uffff';
    if(D2.sort === 'place') out.sort((p, q) => coll(rg(p), rg(q)) || coll(ct(p), ct(q)) || coll(p.a.name || '', q.a.name || ''));
    else if(D2.sort === 'name') out.sort((p, q) => coll(p.a.name, q.a.name));
    else if(D2.sort === 'fits' && byMeas) out.sort((p, q) => q.fit - p.fit || q.n - p.n);
    else out.sort((p, q) => q.n - p.n || coll(p.a.name, q.a.name));
    /* searching: the best name match leads (by place, its region and country come first, so the bars stay together) */
    if(term){
      if(D2.sort === 'place'){ const rb = new Map(), cb = new Map(), k = x => rg(x) + '\u0001' + ct(x);
        for(const x of out){ rb.set(rg(x), Math.min(rb.has(rg(x)) ? rb.get(rg(x)) : 9, x.rk)); cb.set(k(x), Math.min(cb.has(k(x)) ? cb.get(k(x)) : 9, x.rk)); }
        out.sort((p, q) => rb.get(rg(p)) - rb.get(rg(q)) || coll(rg(p), rg(q)) || cb.get(k(p)) - cb.get(k(q)) || coll(ct(p), ct(q)) || p.rk - q.rk); }
      else out.sort((p, q) => p.rk - q.rk); }
    /* subregion tabs: counts of agencies in each, before the tab narrows the list */
    const subN = new Map(EUSUBS.map(r => [r, new Set()])), euAll = new Set();
    for(const x of out) if(subN.has(x.rg)){ subN.get(x.rg).add(x.net); euAll.add(x.net); }
    const eu = {all: euAll.size, total: new Set(out.map(x => x.net)).size, n: EUSUBS.map(r => [r, subN.get(r).size]), on: ''};
    let fin = out;
    /* 1.2.219 (user, 17 Nov 2026: Grace Models (Russia) not found while the Western tab was on): a search looks in all
       of Europe; a tab clicked while that search is typed narrows it, and a new search starts from All again */
    const subOn = D2.sub && (!term || D2.subTerm === term);
    if(subOn && euAll.size && subN.has(D2.sub)){ fin = out.filter(x => x.rg === D2.sub); eu.on = D2.sub; }
    D2.entries = new Map(fin.map(x => [x.id, x]));
    return {list: fin, byMeas, nets: new Set(fin.map(x => x.net)).size, eu};
  }

  /* ---------- the page ---------- */
  function tile(m){ return ucard(m); }
  function tileOld(m){
    const f = litFacts(m), minor = isMinor(m.key), lamp = lampOf(m.key) || '';
    const pc = picCell(m.key, m.nm, minor ? '' : f.photo).replace('<img class="agimg"', '<img class="agimg" loading="lazy" decoding="async"').replace(' fetchpriority="high"', '');
    return '<div class="d2t" data-d2k="' + esc(m.key) + '">' + pc +
      '<span class="d2tn">' + esc(m.nm) + '</span>' +
      (lamp ? '<span class="d2tl" data-v="' + lamp + '" title="Lamp on"></span>' : '') +
      (m.boards && new Set(m.boards.map(b => b.off)).size > 1 ? '<span class="d2tb" title="On the boards of ' + new Set(m.boards.map(b => b.off)).size + ' offices">' + new Set(m.boards.map(b => b.off)).size + ' offices</span>' : '') +
      '<button type="button" class="d2plus" data-d2open="' + esc(m.key) + '" aria-label="Open ' + esc(m.nm) + '">+</button></div>';
  }
  function nameRow(m, a){
    return '<div class="mrow">' + lamps(m.key, m.nm, a.name + (a.city ? ' · ' + a.city : ''), m.href) +
      '<a class="mnm' + litClass(m.key) + '" data-ref="' + esc(m.href) + '" href="' + esc(m.href) + '" target="_blank" rel="noopener noreferrer">' + esc(m.nm) + '</a>' + (() => { try{ const v = window.__illuAvailOf && window.__illuAvailOf(m.key); return v ? '<span class="mav ' + esc(v.t) + '" title="' + esc(v.why || '') + '">' + esc(window.__illuAvailLabel(v, true)) + '</span>' : ''; }catch(e){ return ''; } })() + '</div>';
  }
  /* the boards as pills that wrap (never a sideways scroll): click one to show it, click
     more to add them, click a chosen one again to take it away; "All boards" clears the choice.
     A long list shows two rows and a "+ more" to open the rest. */
  function boardPills(tabs, all, byMeas){
    if(tabs.length < 2) return tabs.length ? '<span class="d2pill on solo">' + esc(tabs[0].l) + ' <s>' + tabs[0].ms.length + '</s></span>' : '';
    const cnt = t => (byMeas ? t.ms.filter(m => fits(m.key)).length + '/' : '') + t.ms.length;
    const LIM = 12;
    let vis = tabs;
    if(!D2.bmore && tabs.length > LIM) vis = tabs.filter((t, k) => k < LIM || D2.bsel.has(t.j));
    const pill = t => { const on = D2.bsel.has(t.j);
      return '<button type="button" class="d2pill' + (on ? ' on' : '') + '" data-d2tab="' + t.j + '" aria-pressed="' + on + '">' +
        (on ? '<i aria-hidden="true">✓</i>' : '') + esc(t.l) + ' <s>' + cnt(t) + '</s></button>'; };
    return '<button type="button" class="d2pill d2pall' + (D2.bsel.size ? '' : ' on') + '" data-d2tab="all" aria-pressed="' + !D2.bsel.size + '">All boards <s>' + (byMeas ? all.filter(m => fits(m.key)).length + '/' : '') + all.length + '</s></button>' +
      vis.map(pill).join('') +
      (tabs.length > LIM ? '<button type="button" class="d2pmore" data-d2bmore>' + (D2.bmore ? 'Show fewer' : '+ ' + (tabs.length - vis.length) + ' more') + '</button>' : '');
  }
  /* the boards as one "Boards" button: it opens a tick list grouped by office city (several can be
     ticked; none ticked = all boards); the ticked boards show as chips beside it, each with an x */
  function boardMenu(tabs, all, byMeas){
    if(tabs.length < 2) return boardPills(tabs, all, byMeas);
    const cnt = t => (byMeas ? t.ms.filter(m => fits(m.key)).length + '/' : '') + t.ms.length;
    const chosen = tabs.filter(t => D2.bsel.has(t.j));
    const sum = !chosen.length ? 'All ' + tabs.length + ' boards' : chosen.length === 1 ? chosen[0].l : chosen.length + ' boards';
    let h = '<div class="d2bwrap"><button type="button" class="d2bdd" data-d2bopen aria-haspopup="true" aria-expanded="' + !!D2.bopen + '"><b>Boards</b><em>' + esc(sum) + '</em>' +
      '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg></button>';
    if(D2.bopen){
      const groups = []; const at = new Map();
      for(const t of tabs){ const k = t.city || ''; if(!at.has(k)){ at.set(k, groups.length); groups.push({city: k, ts: []}); } groups[at.get(k)].ts.push(t); }
      const item = t => { const on = D2.bsel.has(t.j); return '<button type="button" class="d2bi' + (on ? ' on' : '') + '" data-d2tab="' + t.j + '" role="menuitemcheckbox" aria-checked="' + on + '"><i aria-hidden="true">' + (on ? '✓' : '') + '</i><span>' + esc(t.short || t.l) + '</span><s>' + cnt(t) + '</s></button>'; };
      h += '<div class="d2bmenu d2bm2" role="menu" aria-label="Boards">' +
        '<button type="button" class="d2bi d2ball' + (chosen.length ? '' : ' on') + '" data-d2tab="all" role="menuitemcheckbox" aria-checked="' + !chosen.length + '"><i aria-hidden="true">' + (chosen.length ? '' : '✓') + '</i><span>All boards</span><s>' + (byMeas ? all.filter(m => fits(m.key)).length + '/' : '') + all.length + '</s></button>' +
        groups.map(g => (g.city ? '<div class="d2bh">' + esc(g.city) + '</div>' : '') + g.ts.map(item).join('')).join('') + '</div>';
    }
    h += '</div>';
    if(chosen.length) h += chosen.map(t => '<button type="button" class="d2bc" data-d2tab="' + t.j + '" title="Take this board away">' + esc(t.l) + ' <s>' + cnt(t) + '</s><i aria-hidden="true">✕</i></button>').join('') +
      (chosen.length > 1 ? '<button type="button" class="d2bclr" data-d2tab="all">Clear</button>' : '');
    return h;
  }
  /* 1.2.177 (user, 13 Nov 2026: "a Hidden Agencies Sub-Board and a Sub-sub-Board ... Hidden Models"): the Admin's
     Hidden section at the end of the agency list. Hidden Agencies = the agencies taken off the list (agdel), shown in the
     list with Show again; Hidden Models = model cards taken off (mdel, st 'del'), shown on the right. */
  function hidModList(){ try{ return [...MDEL.entries()].filter(([k, v]) => v && v.st === 'del').map(([k, v]) => Object.assign({k}, v)).sort((p, q) => String(q.at || '').localeCompare(String(p.at || ''))); }catch(e){ return []; } }
  function hiddenNav(){
    const nA = new Set([...REMOVED.keys()]).size, nM = hidModList().length;
    return '<div class="d2hidsec">' +
      '<div class="d2hidbar"><svg class="d2hidi" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9"/><path d="M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg><b>HIDDEN</b></div>' +
      '<button type="button" class="d2ag d2hidrow' + (D2.showRemoved ? ' on' : '') + '" data-d2hidag aria-pressed="' + !!D2.showRemoved + '"><span class="d2agt"><b>Hidden Agencies</b><s>with all their boards</s></span><span class="d2agn"><b>' + nA + '</b></span></button>' +
      '<button type="button" class="d2ag d2hidrow d2hidsub' + (D2.hidMod ? ' on' : '') + '" data-d2hidmod aria-pressed="' + !!D2.hidMod + '"><span class="d2agt"><b><i aria-hidden="true">↳</i> Hidden Models</b><s>one by one, from any agency</s></span><span class="d2agn"><b>' + nM + '</b></span></button>' +
      ((D2.showRemoved || D2.hidMod) ? '<button type="button" class="d2showrm" data-d2hidback>← Back to the list</button>' : '') +
      '</div>';
  }
  function hidModPanel(){
    const L0 = hidModList();
    const when = t => { try{ return t ? new Date(t).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'}) : ''; }catch(e){ return ''; } };
    const who = id => { try{ return (PEOPLE.get(id) || {}).n || ''; }catch(e){ return ''; } };
    return '<div class="d2ph"><div class="d2ph1"><span class="d2hidt">Hidden</span><span class="d2pm">Not shown in the Directory, boards or search for anyone else · nothing is deleted</span></div>' +
      '<div class="d2ph2"><button type="button" class="d2pill" data-d2hidag>Hidden Agencies <s>' + REMOVED.size + '</s></button><span class="d2hidgt" aria-hidden="true">›</span><button type="button" class="d2pill on" data-d2hidmod aria-pressed="true">Hidden Models <s>' + L0.length + '</s></button></div></div>' +
      '<div class="d2body">' + (!L0.length ? '<div class="d2empty"><p>No hidden models. Hide a model with “Hide this model” at the bottom of her side panel.</p></div>' :
      '<div class="d2grid d2hidgrid">' + L0.map(m => {
        let pc = ''; try{ const f = litFacts({key: m.k, nm: m.nm, href: m.href}); pc = picCell(m.k, m.nm, f && f.photo); }catch(e){}
        return '<article class="uc d2hidcard"><div class="ucimg"><div class="ucph">' + pc + '</div><span class="d2hidtag">Hidden</span></div>' +
          '<div class="d2hidft"><b>' + esc(m.nm || m.k) + '</b><s>' + esc([m.ag, m.co].filter(Boolean).join(' · ')) + '</s>' +
          '<s>' + esc((m.why === 'gone' ? 'Left the board · ' : '') + 'hidden ' + when(m.at) + (who(m.by) ? ' by ' + who(m.by) : '')) + '</s>' +
          '<button type="button" class="d2hidshow" data-d2mshow="' + esc(m.k) + '">Show again</button></div></article>';
      }).join('') + '</div>') + '</div>';
  }
  function panel(r, byMeas){
    if(D2.hidMod && canRemove()) return hidModPanel();
    if(!r) return '<div class="d2blank" aria-label="No agency chosen"><p>Choose an agency on the left to see its models.</p>' +
      /* user, 2026-11-04: a way back to the start screen and its layouts A-F */
      '<div class="d2home"><button type="button" class="d2homeb" data-d2home title="Back to the start screen">\u2190 Start screen</button>' + styleSwitch() + '</div></div>';
    const a = r.a, bs = r.bs;
    const all = modelsOf(a, bs);
    const multi = new Set(bs.map(b => b.off)).size > 1;
    const tabs = bs.map((b, j) => {
      const city = b.off && b.off.city ? String(b.off.city).split(',')[0] : '';
      const l = b.d || 'Board';
      const cm = city ? l.match(new RegExp('^' + city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}])[\\s·\\-–]*', 'iu')) : null;
      const short = cm && l.length > cm[0].length ? l.slice(cm[0].length) : l;
      return {j, city: multi ? city : '', short: multi ? short : l, l: multi && city && !squash(l).includes(squash(city)) ? city + ' · ' + l : l, t: b.t, ms: all.filter(m => m.boards.includes(b))};
    });
    /* several boards can be chosen at once; none chosen means all of them */
    for(const j of [...D2.bsel]) if(!(j < bs.length)) D2.bsel.delete(j);
    const chosen = D2.bsel.size ? tabs.filter(t => D2.bsel.has(t.j)) : tabs;
    const cur = chosen.length === 1 ? chosen[0] : null;
    let ms = chosen.length === tabs.length ? all : all.filter(m => chosen.some(t => t.ms.includes(m)));
    /* 1.2.185 (user, 13 Nov 2026: "another filter, to type in the name of the model ... when opening up the agency roster"):
       a name box over the agency's models - it looks through all of the agency's boards, accents and spaces ignored */
    if(D2.mqFor !== r.id){ D2.mqFor = r.id; D2.mq = ''; }
    const mq = squash(D2.mq || '');
    if(mq) ms = all.filter(m => squash(m.nm).includes(mq) || fold(m.nm).split(/[^a-z0-9]+/).some(w => w && w.startsWith(fold(D2.mq).trim())));
    const marks = checked('mark');
    if(marks.length) ms = ms.filter(m => marks.includes(lampOf(m.key) || ''));
    const fitN = byMeas ? ms.filter(m => fits(m.key)) : null;
    if(byMeas) ms = fitN;
    /* 1.2.151 (user, 12 Nov 2026: "I thought the names/cards would be in alphabetical order?"): an agency's models A–Z by name */
    ms = ms.slice().sort((p, q) => COLL(String(p.nm || '').trim(), String(q.nm || '').trim()));
    /* 1.2.194: the models the team has worked on come first, the most recent first from the left */
    const wkm = new Map(); for(const e of ((wkByNet(true).get(r.net.i) || {}).items || [])) if(!wkm.has(e.key)) wkm.set(e.key, e);
    const wkOf = m => wkm.get(m.key) || (m.keys || []).map(k => wkm.get(k)).find(Boolean) || null;
    /* 1.2.219 (user, 17 Nov 2026: "cards that have been marked should have priority to show up on top ... when looking at the
       agency roster"; "Vote / booking status, Favorites, Notes, Hidden: never on top"; and "if the models we worked with ...
       are still available on the agency website ... show them at the top of the roster"): in this order -
       1 vote or booking in progress / approved / booked (a Cancelled one stays in its A–Z place), newest first;
       2 models MDI signed before (from the past contracts); 3 in My Favorites; 4 with team notes. Hidden cards are never drawn. */
    const vsOf = m => { try{ for(const k of [m.key].concat(m.keys || [])){ const v = window.__illuVoteState ? window.__illuVoteState(k) : ''; if(v) return v; } }catch(e){} return ''; };
    const live = m => { const w = wkOf(m), v = vsOf(m); if(v) return v === 'open' || v === 'tie' || v === 'appr'; return !!(w && !/cancel/i.test(String(w.lab || ''))); };
    const mk = m => { try{ return window.__illuCardMarks ? [m.key].concat(m.keys || []).map(k => window.__illuCardMarks(k)).reduce((p, q) => ({fav: p.fav || q.fav, note: p.note || q.note}), {fav: false, note: false}) : {}; }catch(e){ return {}; } };
    const G = [[], [], [], []], rest = [];
    for(const m of ms){ if(live(m)) G[0].push(m); else if(mdiModel(m, r.net)) G[1].push(m); else { const k = mk(m); if(k.fav) G[2].push(m); else if(k.note) G[3].push(m); else rest.push(m); } }
    G[0].sort((p, q) => String((wkOf(q) || {}).at || '').localeCompare(String((wkOf(p) || {}).at || '')));
    const GL = ['Vote · booking · newest first', 'Signed with MDI before', 'In My Favorites', 'With team notes'];
    const wkTop = [].concat(...G);
    ms = wkTop.concat(rest);
    const wkTile = m => ucard(m, {wk: wkOf(m), mdi: G[1].includes(m)});
    const isFav = window.ATLFAV && ATLFAV.has(a.domain);
    const mo = mdiOf(r.net);
    const head = '<div class="d2ph"><div class="d2ph1"><h2>' + esc(a.name) + '</h2>' + newTag(r.net.added, 'hd') + (function(){ const o = mailOf(r.net); return o ? '<span class="mlhd ' + o.st + '" title="' + esc(mlTip(o)) + '">✉ ' + (isKo() ? MLL[o.st][1] : MLL[o.st][0]).toUpperCase() + ' · ' + o.o + (isKo() ? ' 보냄 · ' : ' SENT · ') + o.i + (isKo() ? ' 받음' : ' RECEIVED') + ((o.li || o.lo) ? ' · ' + mlDay(o.li > o.lo ? o.li : o.lo).toUpperCase() : '') + '</span>' : ''; })() + (mo ? '<span class="mdihd" title="' + esc('On the MDI contracts as “' + mo.a + '”' + (mo.m.length ? ' — ' + mo.m.join(', ') : '')) + '">' + esc(mdiLabel(mo)) + '</span>' : '') + illuAtChips(a) +
      '<span class="d2pm">' + (a.domain ? '<a class="agsite" href="https://' + esc(a.domain) + '" target="_blank" rel="noopener noreferrer">' + esc(a.domain) + ' ↗</a> · ' : '') +
        (a.domain && !a.country ? '<button type="button" class="d2locset" data-d2loc="' + esc(a.domain) + '">+ Set country</button>' :
          (a.domain ? '<button type="button" class="d2locedit" data-d2loc="' + esc(a.domain) + '" title="Change the country or city">' : '<span>') + esc(a.offices && a.offices.length > 1 ? a.allCities.join(' · ') + ' · ' + a.offices.length + ' offices' : [a.city, a.country].filter(Boolean).join(', ')) + (a.domain ? '</button>' : '</span>')) + '</span>' +   /* 1.2.235 (user, 18 Nov 2026: "I only need to see the amount of models on the board once"): the count is on the board buttons only */
      '<span class="d2sp"></span><span class="agct">' + ctsChip(a.domain) + '</span>' +
      '<button type="button" class="d2hb' + (isFav ? ' on' : '') + '" data-d2heart aria-pressed="' + !!isFav + '">' + (isFav ? '♥' : '♡') + ' Favorite</button>' +
      (canRemove() && !D2.showRemoved ? '<button type="button" class="d2hb d2hideb" data-d2hideag="' + esc(r.id) + '" title="Hide this agency for everyone"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9"/><path d="M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg><span>Hide agency</span></button>' : '') +
      '</div>' +
      '<div class="d2ph2">' + boardMenu(tabs, all, byMeas) + '</div>' +
      '<div class="d2ph3"><label class="d2mq" title="Find a model at this agency by name (all of its boards)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>' +
        '<input type="search" id="d2mq" placeholder="Find a model by name…" autocomplete="off" spellcheck="false" aria-label="Find a model at this agency by name" value="' + esc(D2.mq || '') + '"></label>' +
      /* 1.2.235: a count here only while a search or the measurements narrow the list (the board buttons carry the totals) */
      (mq || byMeas ? '<span class="d2shown">' + (mq ? dirN(ms.length) + ' ' + (ms.length === 1 ? 'model' : 'models') + ' found · all ' + tabs.length + (tabs.length === 1 ? ' board' : ' boards')
        : dirN(ms.length) + ' fit' + (tabs.length > 1 ? ' · ' + (D2.bsel.size ? chosen.length + ' of ' + tabs.length + ' boards' : 'all ' + tabs.length + ' boards') : '')) + '</span>' : '') +
      (cur && !mq && bs[cur.j] && bs[cur.j].u ? '<a class="d2ob" href="' + esc(bs[cur.j].u) + '" target="_blank" rel="noopener noreferrer">Open board ↗</a>' : '') +
      '<span class="d2sp"></span>' +
      ((D2.pz || 1) !== 1 && !D2.names ? '<button type="button" class="d2pz" data-d2pz0 title="Photos back to normal size (Ctrl 0 over the photos)">Photos ' + Math.round(D2.pz * 100) + '% ✕</button>' : '') +
      '<button type="button" class="d2bfb illufs" data-d2bfull aria-pressed="' + !!D2.bfull + '" title="' + (D2.bfull ? 'Exit full screen (Esc)' : 'Show this board on the whole screen') + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + (D2.bfull ? '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>' : '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>') + '</svg><span>' + (D2.bfull ? 'Exit full screen' : 'Full screen') + '</span></button>' +
      '<span class="d2seg" role="group" aria-label="Show as"><button type="button" data-d2names="0" aria-pressed="' + !D2.names + '">Photos</button><button type="button" data-d2names="1" aria-pressed="' + D2.names + '">Names</button></span>' +
      '</div></div>';
    const body = !ms.length
      ? '<div class="d2empty"><p>' + (mq ? 'No model at ' + esc(a.name) + ' has a name with “' + esc(D2.mq.trim()) + '”.' : byMeas ? 'No model on this board fits the measurements.' : (a.boards.length ? 'No models on this board.' : 'Its boards have not been read yet.')) + '</p></div>'
      : D2.names ? '<div class="mlist d2names">' + ms.map(m => nameRow(m, a)).join('') + '</div>'
      : '<div class="d2grid">' + (wkTop.length ? G.map((g, i) => g.length ? '<div class="d2wkh' + (i === 1 ? ' mdih' : '') + '"><i></i>' + GL[i] + '</div>' + g.map(wkTile).join('') : '').join('') + (rest.length ? '<div class="d2wkh rest">Everyone else</div>' + rest.map(wkTile).join('') : '')
        : ms.map(wkTile).join('')) + '</div>';
    let pop = '';
    if(D2.open){
      const m = all.find(x => x.key === D2.open);
      if(m) D2.openM = m;
      if(m) pop = '<div class="d2veil" data-d2close aria-hidden="true"></div>' +
        '<div class="d2card cs-' + (D2.cardStyle || 'x') + '" role="dialog" aria-label="' + esc(m.nm) + '" title="Drag to move">' +
        '<div class="d2grip" aria-hidden="true"><i></i></div>' +
        '<button type="button" class="d2x" data-d2close aria-label="Close the card" title="Close (Esc)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg><span>Close</span></button>' + modelCard(m) +
        (m.boards && m.boards.length > 1 ? '<div class="d2on"><b>On ' + m.boards.length + ' boards</b>' + m.boards.map(b => { const t = tabs.find(t => bs[t.j] === b); return '<span>' + esc(t ? t.l : (b.d || 'Board')) + '</span>'; }).join('') + '</div>' : '') + '</div>';
      else D2.open = '';
    }
    return head + '<div class="d2body">' + body + pop + '</div>';
  }
  /* the list and the photos scroll inside their own columns; together they fill the window
     below the clocks and the filter bar, so the page itself does not need to scroll */
  function fitWrap(){
    const w = $('.d2wrap'); if(!w) return;
    const top = w.getBoundingClientRect().top + (D2.max ? 0 : scrollY);
    w.style.height = Math.max(D2.max ? 300 : 480, Math.round(innerHeight - top - (D2.max ? 16 : 46))) + 'px';
  }
  addEventListener('resize', () => { if(VIEW === 'dir') fitWrap(); });
  async function removeAg(n, id){
    if(!n || !canRemove()) return;   /* 1.2.177: only the Admin hides (user, 13 Nov 2026) */
    D2.confirm = null;
    const mem = n.members.filter(a => a.id != null && !isRemoved(a));
    const at = new Date().toISOString();
    for(const a of mem) REMOVED.set(String(a.id), {name: a.name, country: a.country || '', by: (typeof ME !== 'undefined' ? ME : ''), at});
    if(D2.sel && String(D2.sel).split('|')[0] === String(n.i)) D2.sel = -1;
    refresh();
    try{ for(const a of mem) await DB.doc('agdel/' + a.id).set(REMOVED.get(String(a.id))); }
    catch(e){ for(const a of mem) REMOVED.delete(String(a.id)); refresh(); toast('Could not hide ' + esc(n.name) + ' - try again.'); return; }
    D2.lastRemoved = {n, mem};
    toast('<b>' + esc(n.name) + '</b>' + (mem.length > 1 ? ' (' + mem.length + ' offices)' : '') + ' is hidden. It is under Hidden Agencies at the end of the list.', true);
  }
  async function restoreAg(n, mem){
    if(!n || !canRemove()) return;
    mem = mem || n.members.filter(a => a.id != null && isRemoved(a));
    for(const a of mem) REMOVED.delete(String(a.id));
    refresh();
    for(const a of mem){ try{ await DB.doc('agdel/' + a.id).delete(); }catch(e){} }
    toast('<b>' + esc(n.name) + '</b> is showing again.');
  }
  let toastT = 0;
  function toast(html, undo){
    let t = document.getElementById('d2toast');
    if(!t){ t = document.createElement('div'); t.id = 'd2toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = '<span>' + html + '</span>' + (undo ? '<button type="button" data-d2undo>Undo</button>' : '');
    t.hidden = false; clearTimeout(toastT); toastT = setTimeout(hideToast, 8000);
    if(undo) try{ const u = D2.lastRemoved; if(u && window.__illuUndo) window.__illuUndo.push(String(html).replace(/<[^>]+>/g, ''), () => { hideToast(); restoreAg(u.n, u.mem); }); }catch(e){}
  }
  function hideToast(){ const t = document.getElementById('d2toast'); if(t) t.hidden = true; }
  function narrowed(){
    const term = ((($('#q') || {}).value) || '').trim();
    return !!(D2.showRemoved || D2.showAll || term || D2.country.size || D2.fav || D2.mdi || (BND && BND.any) || document.querySelector('input[data-f]:checked'));
  }
  /* before any filter: a calm start - one tile per region to begin with, nothing loaded */
  /* ---------- the start screen: six layouts to choose from (A-F), remembered on this computer ---------- */
  const STYLES = [['a', 'Regions'], ['b', 'Search'], ['c', 'Share bar'], ['d', 'Your desk'], ['e', 'Map'], ['f', 'Photos']];
  try{ D2.startStyle = localStorage.getItem('illu.d2start') || 'a'; }catch(e){ D2.startStyle = 'a'; }
  if(!STYLES.some(x => x[0] === D2.startStyle)) D2.startStyle = 'a';
  let SC = null;                                   // region/country counts, kept until the directory changes
  function startCounts(){
    if(SC && SC.v === NETV) return SC;
    const R = new Map(); let un = 0, total = 0;
    for(const nt of nets()){
      const offs = nt.offices.filter(o => !isRemoved(o.a) && okRaw(o.a)); if(!offs.length) continue; total++;
      const seenR = new Set(), seenC = new Set();
      for(const o of offs){
        const r = o.region && o.region !== 'Unknown' ? o.region : '';
        if(!r){ if(!seenR.has('')){ seenR.add(''); un++; } continue; }
        if(!R.has(r)) R.set(r, {n: 0, c: new Map(), nets: []});
        const e = R.get(r);
        if(!seenR.has(r)){ seenR.add(r); e.n++; e.nets.push(nt); }
        const co = o.country || ''; if(co && !seenC.has(r + '|' + co)){ seenC.add(r + '|' + co); e.c.set(co, (e.c.get(co) || 0) + 1); }
      }
    }
    const regs = [...R.entries()].map(([r, e]) => ({r, n: e.n, nets: e.nets, cs: [...e.c.entries()].sort((p, q) => q[1] - p[1] || COLL(p[0], q[0]))}));
    SC = {v: NETV, regs, un, total};
    return SC;
  }
  function styleSwitch(){
    return '<div class="d2sty" role="group" aria-label="Start screen layout"><span>Layout</span>' + STYLES.map(([k, l]) =>
      '<button type="button" data-d2sty="' + k + '" aria-pressed="' + (D2.startStyle === k) + '" title="' + l + '">' + k.toUpperCase() + '</button>').join('') + '</div>';
  }
  const reg = (r, n, extra) => '<button type="button" class="' + (extra || 'd2rb') + '" data-d2start="' + esc(r) + '"><b>' + esc(r) + '</b><s>' + n.toLocaleString() + ' agencies</s></button>';
  const ctyChip = (c, r) => '<button type="button" class="d2sc" data-d2cty="' + esc(c) + '" data-d2cr="' + esc(r) + '">' + esc(c) + '</button>';
  const allLink = t => '<button type="button" class="d2all" data-d2showall>Or show all ' + t.toLocaleString() + ' agencies</button>';
  function startScreen(){
    const {regs, un, total} = startCounts();
    const byN = regs.slice().sort((p, q) => q.n - p.n);
    const az = regs.slice().sort((p, q) => COLL(p.r, q.r));
    const unBtn = un ? reg('Unknown', un).replace('<b>Unknown</b>', '<b>Region not stated</b>') : '';
    const st = D2.startStyle;
    let body = '';
    if(st === 'a'){
      body = '<h2>Where would you like to look?</h2><p>Pick a region, or jump straight to a country.</p><div class="d2sa">' +
        byN.map((x, k) => '<div class="d2sac' + (k === 0 && byN.length > 3 ? ' big' : '') + '"><button type="button" class="d2sah" data-d2start="' + esc(x.r) + '"><b>' + esc(x.r) + '</b><em>' + x.n.toLocaleString() + '</em></button>' +
          '<small>' + x.cs.length + (x.cs.length === 1 ? ' country' : ' countries') + '</small><div class="d2sach">' +
          x.cs.slice(0, k === 0 ? 8 : 3).map(([c]) => ctyChip(c, x.r)).join('') +
          (x.cs.length > (k === 0 ? 8 : 3) ? '<button type="button" class="d2sc more" data-d2start="' + esc(x.r) + '">+' + (x.cs.length - (k === 0 ? 8 : 3)) + '</button>' : '') + '</div></div>').join('') +
        (un ? '<div class="d2sac"><button type="button" class="d2sah" data-d2start="Unknown"><b>Region not stated</b><em>' + un + '</em></button><small>no address on file</small></div>' : '') +
        '</div>' + allLink(total);
    }else if(st === 'b'){
      body = '<h2>Find an agency, a city or a model</h2><p>Type a few letters; press Enter to search everything.</p>' +
        '<div class="d2sb"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>' +
        '<input id="d2sbq" type="search" autocomplete="off" placeholder="Agency, city or model name…" aria-label="Find an agency, a city or a model"></div>' +
        '<div class="d2sbs" id="d2sbs" role="listbox" hidden></div>' +
        '<div class="d2sbp">' + byN.map(x => reg(x.r, x.n, 'd2sbr')).join('') + (un ? reg('Unknown', un, 'd2sbr').replace('<b>Unknown</b>', '<b>Not stated</b>') : '') + '</div>' + allLink(total);
    }else if(st === 'c'){
      const shades = ['#5A2C57', '#743d70', '#8e5489', '#a76fa2', '#bd8db9', '#cfaacb', '#ddc4da'];
      body = '<h2>' + total.toLocaleString() + ' agencies worldwide</h2><p>Each block is a region, as wide as its share. Point at one to see its countries; click to open.</p>' +
        '<div class="d2scb">' + byN.map((x, k) => '<button type="button" data-d2start="' + esc(x.r) + '" data-d2hov="' + k + '" style="flex:' + x.n + ';background:' + shades[Math.min(k, shades.length - 1)] + (k >= 4 ? ';color:#3c1d39' : '') + '" title="' + esc(x.r) + ' · ' + x.n + '"><b>' + esc(x.n / total > .09 ? x.r : '') + '</b><s>' + x.n + '</s></button>').join('') +
          (un ? '<button type="button" data-d2start="Unknown" style="flex:' + un + ';background:#e8dbe6;color:#3c1d39" title="Region not stated · ' + un + '"><s>' + un + '</s></button>' : '') + '</div>' +
        '<div class="d2scl">' + byN.map(x => '<span>' + esc(x.r) + ' ' + Math.round(x.n / total * 100) + '%</span>').join('') + '</div>' +
        byN.map((x, k) => { const top = x.cs.slice(0, 8), mx = top.length ? top[0][1] : 1;
          return '<div class="d2scc" data-d2hc="' + k + '"' + (k ? ' hidden' : '') + '><h4>' + esc(x.r) + ' · ' + x.cs.length + (x.cs.length === 1 ? ' country' : ' countries') + '</h4>' +
            top.map(([c, n]) => '<button type="button" class="d2scr" data-d2cty="' + esc(c) + '" data-d2cr="' + esc(x.r) + '"><span>' + esc(c) + '</span><i style="width:' + Math.max(4, Math.round(n / mx * 100)) + '%"></i><s>' + n + '</s></button>').join('') + '</div>'; }).join('') +
        allLink(total);
    }else if(st === 'd'){
      const R = window.__illuRecent ? __illuRecent() : {ag: [], md: []};
      const fav = (window.ATLFAV ? ATLFAV.list() : []).map(d => AG.find(a => a.domain === d)).filter(Boolean).slice(0, 6);
      const when = x => { try{ return x.day ? x.day.replace(/^(\d{4})-(\d\d)-(\d\d)$/, '$3/$2/$1') : ''; }catch(e){ return ''; } };
      const greens = R.md.filter(x => (lampOf(x.k) || '') === 'g').slice(0, 5);
      const agBtn = (a, right) => '<button type="button" class="d2sdi" data-d2goag="' + esc(a.domain || a.name) + '"><b>' + esc(a.name) + '</b><small>' + esc(right || [a.city, a.country].filter(Boolean).join(', ')) + '</small></button>';
      body = '<div class="d2sd"><div class="d2sdb"><h4>Pick up where you left off</h4>' +
          (R.ag.length ? R.ag.slice(0, 6).map(x => agBtn(x.a, when(x))).join('') : '<p class="d2sdn">Agencies you open will show here.</p>') +
          '<h4>Your green lamps</h4>' +
          (greens.length ? greens.map(x => '<button type="button" class="d2sdi" data-d2goag="' + esc((x.r && x.r.meta || '').split(' · ')[0]) + '" data-d2gok="' + esc(x.k) + '"><span class="lamp"></span><b>' + esc(x.r.name || '') + '</b><small>' + esc(x.r.meta || '') + '</small></button>').join('') : '<p class="d2sdn">Models you light green will show here.</p>') +
        '</div><div class="d2sdb"><h4>♥ Favorite agencies</h4>' +
          (fav.length ? fav.map(a => agBtn(a)).join('') : '<p class="d2sdn">Press ♡ Favorite on an agency to keep it here.</p>') +
          '<h4>Or start by region</h4><div class="d2sdr">' + byN.map(x => reg(x.r, x.n)).join('') + unBtn + '</div>' + allLink(total) + '</div></div>';
    }else if(st === 'e'){
      const POS = {'Europe': [50, 34], 'North America': [21, 36], 'Asia': [78, 40], 'South America': [30, 76], 'Africa': [53, 74], 'Oceania': [84, 78]};
      const mx = byN.length ? byN[0].n : 1;
      body = '<h2>Choose a region</h2><p>Each bubble is as big as the number of agencies there.</p><div class="d2se">' +
        byN.map((x, k) => { const p = POS[x.r] || [12 + k * 14, 88]; const d = Math.round(64 + 150 * Math.sqrt(x.n / mx));
          return '<button type="button" class="d2seb" data-d2start="' + esc(x.r) + '" style="left:' + p[0] + '%;top:' + p[1] + '%;width:' + d + 'px;height:' + d + 'px;--k:' + k + '"><b>' + esc(x.r) + '</b><s>' + x.n + '</s></button>'; }).join('') +
        '</div>' + (un ? '<p class="d2sen"><button type="button" class="d2all" data-d2start="Unknown">Region not stated · ' + un + '</button></p>' : '') + allLink(total);
    }else{
      body = '<h2>Where would you like to look?</h2><p>Faces from each region’s boards.</p><div class="d2sf">' +
        byN.map(x => '<button type="button" class="d2sft" data-d2start="' + esc(x.r) + '"><span class="d2sfp">' + facesOf(x).map(m => '<i>' + m + '</i>').join('') + '</span><b>' + esc(x.r) + '</b><s>' + x.n.toLocaleString() + ' agencies</s></button>').join('') +
        '</div>' + allLink(total);
    }
    /* the layout switch sits in the start screen's top-right corner whatever the layout, so it never moves (user, 2026-11-04) */
    main.innerHTML = styleSwitch().replace('class="d2sty"', 'class="d2sty d2styfix"') + '<div class="d2wrap d2start d2s-' + st + '"><div class="d2st">' + body + '</div></div>';
    /* a model chosen from the start screen: only her card, in the middle of the window */
    if(D2.open && D2.solo && D2.solo.key === D2.open){
      const m = D2.solo; D2.openM = m;
      const box = document.createElement('div'); box.className = 'd2body d2solo';
      box.innerHTML = '<div class="d2veil" data-d2close aria-hidden="true"></div>' +
        '<div class="d2card cs-' + (D2.cardStyle || 'x') + '" role="dialog" aria-label="' + esc(m.nm) + '" title="Drag to move">' +
        '<div class="d2grip" aria-hidden="true"><i></i></div>' +
        '<button type="button" class="d2x" data-d2close aria-label="Close the card" title="Close (Esc)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg><span>Close</span></button>' + modelCard(m) +
        (m.boards && m.boards.length ? '<div class="d2on"><b>' + (m.boards.length > 1 ? 'On ' + m.boards.length + ' boards' : 'Board') + '</b>' + m.boards.map(b => '<span>' + esc(b.d || 'Board') + '</span>').join('') + '</div>' : '') + '</div>';
      main.appendChild(box);
      document.body.classList.add('d2carding');
      const C = box.querySelector('.d2card'); placeCard(C); cardEnter(C);
    }else{ if(D2.solo){ D2.solo = null; if(!narrowed()) D2.open = ''; } document.body.classList.remove('d2carding'); }
    fitWrap();
    syncBar('');
    if(VIEW === 'dir') countEl.textContent = AG.length + ' agencies';
    if(st === 'b' && !(D2.open && D2.solo)){ const q = $('#d2sbq'); if(q) try{ q.focus({preventScroll: true}); }catch(e){} }
  }
  /* F: four photos per region, from the region's largest agencies; worked out once, only when F is shown */
  const FACES = new Map();
  function facesOf(x){
    if(FACES.has(x.r) && FACES.get(x.r).v === NETV) return FACES.get(x.r).h;
    const out = [];
    const big = x.nets.slice().sort((p, q) => q.boards.length - p.boards.length).slice(0, 6);
    for(const nt of big){
      if(out.length >= 4) break;
      let ms = []; try{ ms = modelsOf(nt, nt.boards).slice(0, 40); }catch(e){}
      for(const m of ms){
        if(out.length >= 4) break;
        if(isMinor(m.key)) continue;
        const f = litFacts(m); if(!f.photo) continue;
        /* only the picture, at the address the program's photo cache gives it (no buttons inside the tile) */
        const tmp = document.createElement('div'); tmp.innerHTML = picCell(m.key, m.nm, f.photo);
        const im = tmp.querySelector('img'); const src = im && im.getAttribute('src'); if(!src) continue;
        out.push('<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">');
        break;                                     // one face per agency, so the four differ
      }
    }
    while(out.length < 4) out.push('');
    FACES.set(x.r, {v: NETV, h: out});
    return out;
  }
  /* B: suggestions as you type - cities, agencies, models (8 at most) */
  let SBI = null;
  function sbIndex(){
    if(SBI && SBI.v === NETV) return SBI;
    const cities = new Map(), ags = [], mods = [];
    for(const nt of nets()){
      for(const o of nt.offices){ if(isRemoved(o.a)) continue; const c = o.city || ''; if(c){ const k = c.toLowerCase(); const e = cities.get(k) || {c, co: o.country || '', n: 0}; e.n++; cities.set(k, e); } }
      ags.push({nt, s: squash(nt.name)});
    }
    for(const a of AG) for(const b of (a.boards || [])) for(const m of (b.m || [])){ const nm = Array.isArray(m) ? m[0] : (m && m.n); if(nm){ let key = ''; try{ key = normKey(hrefOf(b, m)); }catch(e){} mods.push({nm, a, key, s: squash(nm)}); } }
    SBI = {v: NETV, cities: [...cities.values()], ags, mods};
    return SBI;
  }
  function sbSuggest(q){
    const box = $('#d2sbs'); if(!box) return;
    const t = squash(q); if(t.length < 2){ box.hidden = true; box.innerHTML = ''; return; }
    const I = sbIndex();
    const cs = I.cities.filter(c => squash(c.c).startsWith(t)).sort((p, q) => q.n - p.n).slice(0, 3);
    const as = I.ags.filter(x => x.s.includes(t)).sort((p, q) => (p.s.startsWith(t) ? 0 : 1) - (q.s.startsWith(t) ? 0 : 1)).slice(0, 3);
    const seen = new Set(), ms = [];
    for(const m of I.mods){ if(ms.length >= 3) break; if(m.s.startsWith(t) && !seen.has(m.s + m.a.domain)){ seen.add(m.s + m.a.domain); ms.push(m); } }
    const it = (kind, main, sub, attrs) => '<button type="button" class="d2sbi" ' + attrs + '><i>' + kind + '</i><b>' + esc(main) + '</b><small>' + esc(sub) + '</small></button>';
    const html = cs.map(c => it('CITY', c.c, (c.co ? c.co + ' · ' : '') + c.n + (c.n === 1 ? ' agency' : ' agencies'), 'data-d2sq="' + esc(c.c) + '"')).join('') +
      as.map(x => it('AGENCY', x.nt.name, x.nt.offices.map(o => o.city).filter(Boolean).slice(0, 3).join(' · '), 'data-d2goag="' + esc(x.nt.domain || x.nt.name) + '"')).join('') +
      ms.map(m => it('MODEL', m.nm, m.a.name + (m.a.city ? ' · ' + m.a.city : ''), 'data-d2goag="' + esc(m.a.domain || m.a.name) + '"' + (m.key ? ' data-d2gok="' + esc(m.key) + '"' : ''))).join('');
    box.innerHTML = html || '<p class="d2sbn">Nothing starts with that — press Enter to search everything.</p>';
    box.hidden = false;
  }
  /* open an agency (by its website, else its name) from the start screen */
  /* 1.2.129: the shared panel's agency name opens that agency in the Directory, from any page */
  /* 1.2.210: from the side panel's "All N models" - after the agency opens, scroll to her card and outline it for a few seconds */
  /* put her card in the middle of the screen - by the screen, not by the list's own box (on a phone that box is short) */
  function fitCard(el){
    let p = el.parentElement;
    while(p && !(p.scrollHeight > p.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
    const r = el.getBoundingClientRect(), want = Math.max(70, (innerHeight - r.height) / 2), d = r.top - want;
    if(p) p.scrollTop += d; else window.scrollBy(0, d);
    const r2 = el.getBoundingClientRect(); if(r2.bottom > innerHeight || r2.top < 0) window.scrollBy(0, r2.top - want);
    const r3 = el.getBoundingClientRect(); if(r3.left < 0 || r3.right > innerWidth) try{ el.scrollIntoView({block: 'nearest', inline: 'center'}); }catch(e){}
  }
  function findCard(key){
    if(!key) return;
    let n = 0, until = 0, iv = 0;
    const sel = () => document.querySelector('.uc[data-uck="' + CSS.escape(key) + '"]');
    const mark = () => { const el = sel(); if(el && !el.classList.contains('ucfind')) el.classList.add('ucfind'); if(Date.now() > until){ clearInterval(iv); const e2 = sel(); if(e2) e2.classList.remove('ucfind'); } };
    let allB = false;
    const tick = () => {
      /* "All N models": show all the agency's boards, so her card is there whichever board she is on */
      if(!allB && D2.sel !== -1 && D2.bsel.size){ allB = true; D2.bsel.clear(); try{ refresh(); }catch(e){} setTimeout(tick, 150); return; }
      const el = sel();
      if(el && el.offsetParent){
        try{ el.scrollIntoView({block: 'center', behavior: 'smooth'}); }catch(e){ el.scrollIntoView(); }
        until = Date.now() + 4200; mark(); iv = setInterval(mark, 200);
        /* on a phone the list can still grow above her while photos come in: look again and scroll to her if she moved off the screen */
        for(const t of [700, 1500, 2600]) setTimeout(() => { const e3 = sel(); if(!e3) return; const r = e3.getBoundingClientRect(); if(r.top < 0 || r.bottom > innerHeight) try{ fitCard(e3); }catch(e){} }, t);   /* the grid may redraw while photos load - keep the outline on */
        return;
      }
      if(++n < 40) setTimeout(tick, 100);
    };
    setTimeout(tick, 500);
  }
  window.__illuDirGoAg = (ref, key) => {
    try{ const fv = document.getElementById('illufv'); if(fv && !fv.hidden){ const x = fv.querySelector('.fvx'); if(x) x.click(); } }catch(e){}
    try{ if(D2.open){ D2.open = ''; SL.full = false; SL.auto = ''; document.body.classList.remove('d2fullcard'); } }catch(e){}
    /* 1.2.218 (user, 17 Nov 2026: "All 156 models" from the side panel did not take them to the Directory): Team Vote, Favorites
       and the other boards are pages laid over the Directory, so the Directory was already the view underneath and nothing
       left the board in front of it. Leave whatever page is in front (and Today) as well. */
    const covered = document.body.classList.contains('shextra') || document.body.classList.contains('shtoday');
    if(typeof VIEW === 'undefined' || VIEW !== 'dir' || covered){ try{ window.__illuGo ? window.__illuGo('dir') : setView('dir'); }catch(e){} }
    /* on a phone the agency list takes half the width - hide it so her agency's cards fill the screen (the ‹ › tab brings it back) */
    try{ if(key && PHONE()) D2.listOff = true; }catch(e){}
    /* 1.2.211 (user, 16 Nov 2026: "the screen ended up freezing, or just not being able to direct me to the directory agency
       list"): the Directory was left on Hidden Agencies (and a region filter), so the agency could not be found and the
       blur of a closed card stayed on. Come back to the normal list; if filters still hide the agency, they are cleared. */
    try{ D2.showRemoved = false; D2.hidMod = false; D2.confirm = null; document.body.classList.remove('d2carding', 'd2closing', 'd2opening'); }catch(e){}
    setTimeout(() => { goAgency(ref, '', true); if(key) setTimeout(() => findCard(key), 400); }, 350);
  };
  function goAgency(ref, key, clearIfHidden){
    const a = AG.find(x => x.domain === ref) || AG.find(x => x.name === ref);
    const q = $('#d2q'); if(!q) return;
    q.value = a ? a.name : ref; q.dispatchEvent(new Event('input', {bubbles: true}));
    let tries = 0;
    const look = () => {
      const ent = D2.entries ? [...D2.entries.values()] : [];
      const x = (a && (ent.find(e => e.net.offices.some(o => o.a === a)) || ent.find(e => a.domain && e.net.domain === a.domain) || ent.find(e => e.net.offices.some(o => o.a && o.a.name === a.name)))) || (ent.length && new Set(ent.map(e => e.net)).size === 1 ? ent[0] : null);
      const row = x && document.querySelector('.d2ag[data-d2ag="' + CSS.escape(x.id) + '"]');
      if(row){ setTimeout(() => {                       // after the search's own redraw, choose it the normal way
          const r2 = document.querySelector('.d2ag[data-d2ag="' + CSS.escape(x.id) + '"]') || row;
          if(D2.sel !== x.id) r2.click();
          if(key) setTimeout(() => { if(D2.sel === x.id){ D2.open = key; refresh(); } }, 80);
        }, 250); return; }
      if(++tries < 20){ setTimeout(look, 50); return; }          // the list is still being redrawn for the search
      /* not in the list: the filters (region, country, board, favorites…) hide it - clear them once and look again */
      if(clearIfHidden){ try{ D2.fav = false; clearAll(); }catch(e){} goAgency(ref, key, false); }
    };
    setTimeout(look, 30);
  }
  /* the model name box: redraw the photos as you type, and keep typing in the box */
  document.addEventListener('input', e => { if(!e.target || e.target.id !== 'd2mq') return;
    const v = e.target.value, c = e.target.selectionStart; D2.mq = v; refresh();
    const n = document.getElementById('d2mq'); if(n && document.activeElement !== n){ n.focus(); try{ n.setSelectionRange(c, c); }catch(err){} } });
  document.addEventListener('keydown', e => { if(e.target && e.target.id === 'd2mq'){ e.stopPropagation(); if(e.key === 'Escape' && e.target.value){ e.preventDefault(); e.target.value = ''; e.target.dispatchEvent(new Event('input', {bubbles: true})); } } }, true);
  function setSearch(v){ const q = $('#d2q'); if(!q) return; q.value = v; q.dispatchEvent(new Event('input', {bubbles: true})); }
  /* the program's own search (Ctrl K, illu-shell.js) reads the same index and opens agencies the same way */
  /* Compare boards (illu-cmpb.js) reads the same agencies, boards and model lists */
  /* 1.2.210: the number of models the Directory shows for an agency (each person once, across its boards) - the side panel's "All N models" uses it */
  window.__illuDirCountOf = dom => { try{ const d = String(dom || '').toLowerCase().replace(/^www\./, ''); const n = nets().find(x => String(x.domain || '').toLowerCase().replace(/^www\./, '') === d || (x.offices || []).some(o => o.a && String(o.a.domain || '').toLowerCase() === d)); return n ? peopleCount(n, n.boards) : -1; }catch(e){ return -1; } };
  window.__illuBoards = {nets: () => nets(), modelsOf: (a, bs) => modelsOf(a, bs), removed: n => netRemoved(n)};
  window.__illuSB = {index: () => sbIndex(), goAgency: (r, k) => goAgency(r, k), setSearch: v => setSearch(v), squash: x => squash(x)};
  document.addEventListener('input', e => { if(e.target && e.target.id === 'd2sbq') sbSuggest(e.target.value); });
  document.addEventListener('keydown', e => { if(e.target && e.target.id === 'd2sbq' && e.key === 'Enter' && e.target.value.trim()){ e.preventDefault(); setSearch(e.target.value.trim()); } });
  document.addEventListener('pointerover', e => { const h = e.target.closest && e.target.closest('[data-d2hov]'); if(!h) return;
    document.querySelectorAll('.d2scc').forEach(c => { c.hidden = c.dataset.d2hc !== h.dataset.d2hov; }); });
  window.addEventListener('click', e => {
    if(VIEW !== 'dir' || !e.target.closest) return;
    const sy = e.target.closest('[data-d2sty]');
    if(sy){ e.preventDefault(); D2.startStyle = sy.dataset.d2sty; try{ localStorage.setItem('illu.d2start', D2.startStyle); }catch(err){}
      if(narrowed()){ D2.showRemoved = false; clearAll(); } else startScreen(); return; }
    if(e.target.closest('[data-d2home]')){ e.preventDefault(); D2.showRemoved = false; clearAll(); return; }
    const cy = e.target.closest('[data-d2cty]');
    if(cy){ e.preventDefault(); D2.country.clear(); pick('country', cy.dataset.d2cty); closePop(); return; }
    const sq = e.target.closest('[data-d2sq]');
    if(sq){ e.preventDefault(); setSearch(sq.dataset.d2sq); return; }
    const ga = e.target.closest('[data-d2goag]');
    if(ga && ga.dataset.d2gok){ const m = modelByKey(ga.dataset.d2gok); if(m){ e.preventDefault(); e.stopPropagation(); try{ document.activeElement && document.activeElement.blur(); }catch(err){} D2.solo = m; D2.open = m.key; D2.cardPos = null; startScreen(); return; } }
    if(ga){ e.preventDefault(); goAgency(ga.dataset.d2goag, ga.dataset.d2gok || ''); return; }
  }, true);
  /* a model named on the start screen (green lamps, search): find her card in the Directory */
  let MBK = null, MBKV = '';
  function modelByKey(key){
    nets();
    if(!MBK || MBKV !== NETV){ MBK = new Map(); MBKV = NETV;
      for(const n of NETS) for(const b of n.boards) for(const m of (b.m || [])){ try{ const k = normKey(hrefOf(b, m)); if(!MBK.has(k)) MBK.set(k, n); }catch(e){} } }
    const n = MBK.get(key); if(!n) return null;
    const o = n.offices[0] || {};
    const ms = modelsOf({name: n.name, city: o.city || '', country: o.country || '', domain: n.domain}, n.boards);
    return ms.find(m => m.key === key) || ms.find(m => (m.keys || []).includes(key)) || null;
  }
  /* the agency's board on the whole screen (user, 2026-11-04): header, boards and photos fill the window */
  function setBoardFull(on){
    D2.bfull = !!on; document.body.classList.toggle('d2bfull', D2.bfull);
    refresh();
  }
  setInterval(() => { if(D2.bfull && (VIEW !== 'dir' || !D2.sel || D2.sel === -1)){ D2.bfull = false; document.body.classList.remove('d2bfull'); }
    if(typeof RC !== 'undefined' && RC.full && VIEW !== 'arr'){ RC.full = false; document.body.classList.remove('rcfull'); } }, 700);
  window.__d2Max = on => { if(on === undefined) return !!D2.max; setMax(on); return D2.max; };
  /* leaving for another tab (a card moved to Booking, a menu tab): the open model card is put
     away at once, with its blur - it was being left open, invisible, behind the next tab */
  { const sv1 = setView;
    setView = function(v){
      if(v !== 'dir' && v !== 'arr' && (D2.open || document.body.classList.contains('d2carding'))){
        if(SL.full){ SL.full = false; SL.auto = ''; document.body.classList.remove('d2fullcard'); }
        D2.open = ''; D2.closing = false; D2.cardPos = null; D2.shownKey = ''; D2.solo = null;
        document.body.classList.remove('d2carding', 'd2closing', 'd2opening');
        document.querySelectorAll('.d2solo, .d2card, .d2veil').forEach(x => x.remove());
        document.querySelectorAll('.carding').forEach(x => x.classList.remove('carding'));
      }
      return sv1.apply(this, arguments);
    };
    window.setView = setView; }
  function setMax(on){
    D2.max = !!on;
    document.body.classList.toggle('d2max', D2.max);
    const b = document.querySelector('[data-d2max]');
    if(b){ b.setAttribute('aria-pressed', String(D2.max)); b.querySelector('span').textContent = D2.max ? 'Restore' : 'Maximize';
      b.querySelector('svg').innerHTML = D2.max ? '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>' : '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'; }
    try{ localStorage.setItem('illu.d2max', D2.max ? '1' : ''); }catch(e){}
    requestAnimationFrame(fitWrap);
  }
  /* a country's two-letter code (FR, IT…), from the browser's own list of country names */
  const CC = (function(){ const m = new Map();
    try{ const dn = new Intl.DisplayNames(['en'], {type: 'region'});
      for(let a = 65; a < 91; a++) for(let b = 65; b < 91; b++){ const c = String.fromCharCode(a, b); if(/^(EU|EZ|FX|UK|UN|QO|ZZ|X[A-Z]|DD|CS|VD|YU|SU|BU|ZR|TP|DY|NH|RH|YD|HV|AN|NT|QU|AA|CT|JT|MI|NQ|PC|PU|PZ|WK|FQ|BQ|IC|EA|DG|CP|TA|AC)$/.test(c)) continue; try{ const n = dn.of(c); if(n && n !== c && !m.has(n.toLowerCase())) m.set(n.toLowerCase(), c); }catch(e){} } }catch(e){}
    [['turkey','TR'],['türkiye','TR'],['czech republic','CZ'],['czechia','CZ'],['hong kong','HK'],['uk','GB'],['usa','US'],['united states of america','US'],['south korea','KR'],['korea','KR'],['russia','RU'],['holland','NL'],['the netherlands','NL'],['uae','AE'],['ivory coast','CI']].forEach(([k, v]) => m.set(k, v));
    return m; })();
  const ccOf = co => CC.get(String(co || '').trim().toLowerCase()) || '';
  /* the agency list folds away to give the photos the room; the choice is remembered */
  try{ D2.listOff = localStorage.getItem('illu.d2listoff') === '1'; }catch(e){}
  function setListOff(v){ D2.listOff = !!v; try{ localStorage.setItem('illu.d2listoff', D2.listOff ? '1' : ''); }catch(e){} refresh(); }
  window.__illuListOff = setListOff;
  document.addEventListener('keydown', e => { if(VIEW === 'dir' && (e.ctrlKey || e.metaKey) && e.key === '[' && narrowed()){ e.preventDefault(); setListOff(!D2.listOff); } });
  function regionBar(name, n, folded){
    return '<button type="button" class="d2rgn' + (folded ? ' fold' : '') + '" data-d2fold="' + esc(name) + '" aria-expanded="' + !folded + '">' +
      '<b>' + esc(name) + '</b><s>' + n.toLocaleString() + (n === 1 ? ' agency' : ' agencies') + '</s><i aria-hidden="true">' + (folded ? '▸' : '▾') + '</i></button>';
  }
  /* Favorites: a board of the favourite agencies, one bar each, in the favourites' own order.
     A bar opens to show that agency's photos (its boards, tiles and cards) right under it, and
     closes again; opening another closes the one before. */
  function favBoard(list, r, byMeas){
    const order = window.ATLFAV ? ATLFAV.list() : [], at = new Map(order.map((d, i) => [d, i]));
    const seen = new Set(), bars = [];
    for(const x of list){ if(seen.has(x.net.i)) continue; seen.add(x.net.i); bars.push(x); }
    bars.sort((p, q) => (at.has(p.net.domain) ? at.get(p.net.domain) : 1e9) - (at.has(q.net.domain) ? at.get(q.net.domain) : 1e9));
    const openNet = r ? r.net.i : -1;
    const models = bars.reduce((t, x) => t + x.n, 0);
    return '<div class="d2fb">' +
      '<div class="d2fbh"><span class="d2fbhi" aria-hidden="true">♥</span><h2>Favorite agencies</h2><span class="d2fbhn"><b>' + bars.length + '</b> ' + (bars.length === 1 ? 'agency' : 'agencies') + ' · ' + dirN(models) + ' models</span>' +
        '<span class="d2sp"></span><span class="d2fbhint">Click an agency to open its models; click again to close</span></div>' +
      (!bars.length ? '<div class="d2fbe"><p>No favorite agencies' + (order.length ? ' match these filters' : ' yet') + '.</p><p>Open an agency and press <b>♡ Favorite</b> to keep it here.</p></div>' :
      bars.map((x, k) => {
        const open = x.net.i === openNet, a = x.a;
        const where = a.offices && a.offices.length > 1 ? a.allCities.join(' · ') + ' · ' + a.offices.length + ' offices' : [a.city, a.country].filter(Boolean).join(', ');
        return '<div class="d2fbrow' + (open ? ' open' : '') + '">' +
          '<div class="d2fbbar" data-d2fbdom="' + esc(x.net.domain) + '"><button type="button" class="d2fbgo" data-d2fbar="' + esc(x.id) + '" aria-expanded="' + open + '">' +
            '<span class="d2fbn" title="Drag to change the order">' + (k + 1) + '</span><span class="d2fbt"><b>' + esc(a.name) + '</b><s>' + esc(where || 'Location not stated') + '</s></span>' +
            '<span class="d2fbm"><b>' + dirN(x.n) + '</b> ' + (x.n === 1 ? 'model' : 'models') + '</span>' +
            '<span class="d2fbc" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M3 4.5l3 3 3-3"/></svg></span></button>' +
            '<button type="button" class="d2fbx" data-d2fbx="' + esc(x.net.domain) + '" title="Remove from favorites" aria-label="Remove ' + esc(a.name) + ' from favorites">♥</button></div>' +
          (open ? '<div class="d2fbbody"><section class="d2panel" aria-label="' + esc(a.name) + '">' + panel(r, byMeas) + '</section></div>' : '') +
        '</div>';
      }).join('')) + '</div>';
  }
  /* the open favourite fills the window below whatever stays pinned at the top (clocks, top bar),
     so its bar is always in view to close it and the photos scroll inside */
  function pinnedBottom(){
    let b = 0;
    for(const e of document.querySelectorAll('#appbar, header, .htop, .ckrow')){ const cs = getComputedStyle(e); if(!/sticky|fixed/.test(cs.position) || cs.display === 'none') continue; const r = e.getBoundingClientRect(); if(r.top < 120 && r.bottom > b && r.bottom < innerHeight * .6) b = r.bottom; }
    return Math.max(0, b);
  }
  function fitFav(scroll){
    const row = document.querySelector('.d2fbrow.open'); if(!row) return;
    const P = row.querySelector('.d2fbbody .d2panel'), bar = row.querySelector('.d2fbbar'); if(!P || !bar) return;
    const top = pinnedBottom() + 8;
    P.style.height = Math.max(420, innerHeight - top - bar.offsetHeight - 14) + 'px';
    if(scroll){ const y = row.getBoundingClientRect().top + scrollY - top; window.scrollTo({top: Math.max(0, y), behavior: 'smooth'}); }
  }
  window.addEventListener('resize', () => { if(D2.fav) fitFav(false); });
  /* zooming only the photos: while the mouse is over the photo area, or it was the last thing
     clicked, Ctrl + wheel and Ctrl +/-/0 make the photo tiles bigger or smaller (the program
     sends the zoom here instead of zooming the whole page). Starts at 100% each time. */
  D2.pz = 1;
  (function(){
    const bridge = !!(window.illu && window.illu.zoomTarget);
    let hover = false, picked = false, sent = '';
    /* 1.2.246 (user, 18 Nov 2026 - New Face & Development full screen: "the top bar with the filters/selections ... I want
       the board to expand with only the cards"): the New Face page's grid (.rcbody .rc2grid) counts as the photo area too */
    const send = () => { const t = window.__illuZoomDoc || (DV() && (hover || picked) && (VIEW === 'arr' ? $('#pane-arr .rcbody .rc2grid') : $('.d2body .d2grid'))) ? 'photos' : 'page'; if(t !== sent){ sent = t; if(bridge) try{ illu.zoomTarget(t); }catch(e){} document.body.classList.toggle('d2pzon', t === 'photos'); } };
    document.addEventListener('pointerover', e => { const h = !!(e.target.closest && e.target.closest('.d2body')); if(h !== hover){ hover = h; send(); } });
    document.addEventListener('pointerdown', e => { picked = !!(e.target.closest && e.target.closest('.d2body')); send(); }, true);
    document.addEventListener('mouseleave', () => { hover = false; send(); });
    setInterval(send, 700); window.__illuZoomSend = send;                    // view changes, the photos going away
    window.__illuPhotoZoom = d => {
      if(window.__illuZoomDoc && window.__bvDocZoom){ window.__bvDocZoom(d); return; }
      const old = D2.pz || 1;
      D2.pz = d === '0' ? 1 : Math.max(.6, Math.min(2.6, Math.round(old * (d === '+' ? 1.15 : 1 / 1.15) * 100) / 100));
      if(Math.abs(D2.pz - 1) < .04) D2.pz = 1;
      if(D2.pz === old) return;
      const GB = () => VIEW === 'arr' ? $('#pane-arr .rcbody') : $('.d2body');     // the scroll box of the page in view
      const G = GB(), ratio = G && G.scrollHeight ? G.scrollTop / G.scrollHeight : 0;
      document.body.style.setProperty('--pz', String(D2.pz));
      refresh();
      const G2 = GB(); if(G2) G2.scrollTop = ratio * G2.scrollHeight;
    };
    if(bridge && illu.onPhotoZoom) illu.onPhotoZoom(d => window.__illuPhotoZoom(d));
  })();
  /* favourites keep the order you drag them into: hold a bar (or its number) and move it */
  (function(){
    let d = null, justDragged = 0;
    document.addEventListener('pointerdown', e => {
      if(!D2.fav || e.button !== 0 || !e.target.closest) return;
      const bar = e.target.closest('.d2fbbar'); if(!bar || e.target.closest('.d2fbx')) return;
      d = {row: bar.closest('.d2fbrow'), id: e.pointerId, y: e.clientY, on: false, ty: 0};
    });
    document.addEventListener('pointermove', e => {
      if(!d || e.pointerId !== d.id) return;
      if(!d.on){ if(Math.abs(e.clientY - d.y) < 6) return; d.on = true; d.top = d.row.getBoundingClientRect().top; d.row.classList.add('d2fbdrag'); document.body.classList.add('d2fbdragging'); }
      e.preventDefault();
      const box = d.row.parentElement, sibs = [...box.querySelectorAll('.d2fbrow')].filter(x => x !== d.row);
      let before = null; for(const x of sibs){ const r = x.getBoundingClientRect(); if(e.clientY < r.top + r.height / 2){ before = x; break; } }
      if(before){ if(before.previousElementSibling !== d.row) box.insertBefore(d.row, before); }
      else { const last = sibs[sibs.length - 1]; if(last && last.nextElementSibling !== d.row) last.after(d.row); }
      const natural = d.row.getBoundingClientRect().top - d.ty;
      d.ty = (e.clientY - d.y) - (natural - d.top);
      d.row.style.transform = 'translateY(' + d.ty + 'px)';
      [...box.querySelectorAll('.d2fbrow')].forEach((x, i) => { const n = x.querySelector('.d2fbn'); if(n) n.textContent = i + 1; });
      if(e.clientY < 80) scrollBy(0, -14); else if(e.clientY > innerHeight - 50) scrollBy(0, 14);
    });
    const stop = e => {
      if(!d || (e && e.pointerId !== d.id)) return;
      const was = d.on, row = d.row; d = null; if(!was) return;
      justDragged = Date.now();
      row.classList.remove('d2fbdrag'); row.style.transform = ''; document.body.classList.remove('d2fbdragging');
      const doms = [...row.parentElement.querySelectorAll('.d2fbbar[data-d2fbdom]')].map(x => x.dataset.d2fbdom);
      if(window.ATLFAV){ const rest = ATLFAV.list().filter(x => !doms.includes(x)); ATLFAV.order(doms.concat(rest)); }
    };
    document.addEventListener('pointerup', stop); document.addEventListener('pointercancel', stop);
    window.addEventListener('click', e => { if(justDragged && Date.now() - justDragged < 350 && e.target.closest && e.target.closest('.d2fbbar')){ e.stopPropagation(); e.preventDefault(); justDragged = 0; } }, true);
  })();
  window.dir2Render = function(){
    try{ if(BND && BND.any && measState === 'idle') loadMeas(); }catch(e){}
    const L = $('.d2list'); if(L && !D2.keepTop) D2.listTop = L.scrollTop; D2.keepTop = false;
    const G = $('.d2body'); const gTop = G ? G.scrollTop : 0;
    if(!narrowed()){ document.body.classList.remove('d2carding'); startScreen(); return; }
    const {list, byMeas, nets: nN, eu} = rows();
    let r = list.find(x => x.id === D2.sel);
    /* nothing opens on its own: no photos load until an agency is chosen */
    if(!r) D2.sel = -1;
    /* by place: a dark bar per region (folds and opens), a lighter bar per country */
    const place = D2.sort === 'place';
    const rgOf = x => x.rg && x.rg !== 'Unknown' ? x.rg : 'Region not stated';
    const rgN = new Map(), coN = new Map();
    if(place) for(const x of list){
      const r0 = rgOf(x); if(!rgN.has(r0)) rgN.set(r0, new Set()); rgN.get(r0).add(x.net);
      const c0 = r0 + '\u0001' + (x.co || ''); coN.set(c0, (coN.get(c0) || 0) + 1);
    }
    const searching = !!(((($('#q') || {}).value) || '').trim());   /* 1.2.185: a folded region does not hide what was searched for */
    const vis = place && !(eu && eu.on) && !searching ? list.filter(x => !D2.fold.has(rgOf(x))) : list;
    const shown = vis.slice(0, D2.shown);
    const WKR = wkByNet(true); let wr = null;
    let heads = [];
    if(place){
      /* folded regions still show their bar, in order */
      const order = [...rgN.keys()];
      heads = order;
    }
    const totalFit = byMeas ? list.reduce((s, x) => s + x.fit, 0) : 0;
    main.innerHTML = D2.fav ? favBoard(list, r, byMeas) : '<div class="d2wrapo">' +
      '<button type="button" class="d2tog" data-d2list aria-expanded="' + !D2.listOff + '" title="' + (D2.listOff ? 'Show the agency list (Ctrl [)' : 'Hide the agency list to see more photos (Ctrl [)') + '">' +
        (D2.listOff ? '<span class="d2togi">›</span><span class="d2togl">Agencies</span>' : '<span class="d2togi">‹</span>') + '</button>' +
      '<div class="d2wrap' + (D2.listOff ? ' listoff' : '') + '">' +
      '<nav class="d2list' + (eu && eu.on ? ' subon' : '') + '" aria-label="Agencies"><div class="d2lh" role="status" aria-live="polite"><b>' + nN.toLocaleString() + '</b><span>' + (nN === 1 ? 'agency' : 'agencies') +
        (D2.showRemoved ? ' hidden' : '') + '</span><em>' + (function(){ const ms = list.filter((x, k) => list.findIndex(y => y.net === x.net) === k).reduce((t, x) => t + x.n, 0);
          const nOff = list.filter((x, k) => list.findIndex(y => y.net === x.net) === k).reduce((t, x) => t + x.a.offices.length, 0);
          return (nOff > nN ? nOff.toLocaleString() + ' offices · ' : '') + ms.toLocaleString() + ' models'; })() + '</em>' +
        (eu && eu.all ? '<div class="d2sub" role="tablist" aria-label="Europe subregions">' +
          '<button type="button" role="tab" data-d2sub="" aria-selected="' + !eu.on + '"' + (!eu.on ? ' class="on"' : '') + '>All<i>' + eu.total.toLocaleString() + '</i></button>' +
          eu.n.map(([r0, k]) => '<button type="button" role="tab" data-d2sub="' + esc(r0) + '" aria-selected="' + (eu.on === r0) + '"' + (eu.on === r0 ? ' class="on"' : '') + (k ? '' : ' disabled') + '>' + esc(r0.replace(' Europe', '')) + '<i>' + k.toLocaleString() + '</i></button>').join('') +
          '</div>' : '') + '</div>' +
        shown.map((x, k) => {
          let h = '';
          if(place && eu && eu.on){
            const prev = shown[k - 1];
            if(!prev || (prev.co || '') !== (x.co || ''))
              h += '<div class="d2grp">' + (ccOf(x.co) ? '<i class="d2cc" aria-hidden="true">' + ccOf(x.co) + '</i>' : '') + '<b>' + esc(x.co || 'Country not stated') + '</b><u aria-hidden="true"></u><s>' + (coN.get(rgOf(x) + '\u0001' + (x.co || '')) || 0) + '</s></div>';
          } else if(place){
            const r0 = rgOf(x), prev = shown[k - 1];
            if(!prev || rgOf(prev) !== r0){
              /* folded regions that come before this one in the list */
              const i0 = heads.indexOf(r0), j0 = prev ? heads.indexOf(rgOf(prev)) : -1;
              for(let q = j0 + 1; q < i0; q++) h += regionBar(heads[q], rgN.get(heads[q]).size, true);
              h += regionBar(r0, rgN.get(r0).size, false);
            }
            if(!prev || rgOf(prev) !== r0 || (prev.co || '') !== (x.co || ''))
              h += '<div class="d2grp">' + (ccOf(x.co) ? '<i class="d2cc" aria-hidden="true">' + ccOf(x.co) + '</i>' : '') + '<b>' + esc(x.co || 'Country not stated') + '</b><u aria-hidden="true"></u><s>' + (coN.get(r0 + '\u0001' + (x.co || '')) || 0) + '</s></div>';
          }
          return h +
          (D2.confirm === x.id
            ? '<div class="d2agw d2conf"><span>Hide <b>' + esc(x.a.name) + '</b>? Its ' + dirN(x.n) + ' models stop showing for everyone. Nothing is deleted.</span><button type="button" class="d2cy" data-d2rmyes="' + esc(x.id) + '">Hide</button><button type="button" class="d2cn" data-d2rmno>Cancel</button></div>'
            : (wr = wkRow(D2.showRemoved ? null : WKR.get(x.net.i)), '') + '<div class="d2agw' + (D2.showRemoved ? ' rmd' : '') + (mdiOf(x.net) ? ' mdiw" title="MDI Agency Contact · ' + esc(mdiOf(x.net).a) : '') + '"><button type="button" class="d2ag' + (x === r ? ' on' : '') + wr.cls + '" data-d2ag="' + esc(x.id) + '"' + (wr.tip ? ' title="' + esc(wr.tip) + '"' : '') + '>' +
          '<span class="d2agt"><b>' + esc(x.a.name) + newTag(x.net.added) + '</b><s>' + (function(){ const o = mailOf(x.net); return o ? '<u class="mlt ' + o.st + '" title="' + esc(mlTip(o)) + '">✉ ' + (isKo() ? MLL[o.st][1] : MLL[o.st][0]) + '</u><u class="wksep">·</u>' : ''; })() + wr.html + (wr.html ? '<u class="wksep">·</u>' : '') + esc(([x.a.city, x.a.country].filter(Boolean).join(', ') || 'Location not stated') + (x.a.offices.length > 1 ? ' · ' + x.a.offices.length + ' offices' : '')) + '</s></span>' +
          '<span class="d2agn">' + (byMeas ? '<b>' + dirN(x.fit) + '</b><s>of ' + dirN(x.n) + '</s>' : '<b>' + dirN(x.n) + '</b>') + '</span></button>' +
          (!x.a.country && x.a.domain && !D2.showRemoved ? '<button type="button" class="d2locb" data-d2loc="' + esc(x.a.domain) + '" title="Set this agency’s country">+ Set country</button>' : '') +
          (canRemove() ? (D2.showRemoved ? '<button type="button" class="d2rs" data-d2restore="' + esc(x.id) + '">Show again</button>'
            : '<button type="button" class="d2rm" data-d2rm="' + esc(x.id) + '" title="Hide this agency" aria-label="Hide ' + esc(x.a.name) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9"/><path d="M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg></button>') : '') + '</div>');
        }).join('') +
        (place && !(eu && eu.on) ? (function(){ const last = shown[shown.length - 1]; const j0 = last ? heads.indexOf(rgOf(last)) : -1; let h = ''; if(vis.length <= shown.length) for(let q = j0 + 1; q < heads.length; q++) h += regionBar(heads[q], rgN.get(heads[q]).size, true); return h; })() : '') +
        (vis.length > shown.length ? '<button type="button" class="d2more" data-d2more>Show ' + Math.min(200, vis.length - shown.length) + ' more</button>' : '') +
        (!list.length ? '<p class="d2pe">' + (D2.showRemoved ? 'No hidden agency matches these filters.' : 'No agency matches these filters.') + '</p>' : '') +
        (canRemove() ? hiddenNav() : '') +
      '</nav>' +
      '<section class="d2panel" aria-label="' + (r ? esc(r.a.name) : 'Agency') + '">' + panel(r, byMeas) + '</section></div></div>';
    fitWrap(); if(D2.fav) fitFav(false);
    { const L3 = $('.d2list'), H = L3 && L3.querySelector('.d2lh'), R = L3 && L3.querySelector('.d2rgn:not(.fold)');
      if(H) L3.style.setProperty('--d2h', (H.offsetHeight - 6) + 'px'); if(R) L3.style.setProperty('--d2rh', R.offsetHeight + 'px'); }
    const L2 = $('.d2list'); if(L2) L2.scrollTop = D2.listTop;
    const G2 = $('.d2body'); if(G2 && r){ G2.scrollTop = gTop; const C = G2.querySelector('.d2card');
      if(C){ placeCard(C); cardEnter(C); } else D2.shownKey = '';
      G2.classList.toggle('carding', !!C); document.body.classList.toggle('d2carding', !!C); const V = G2.querySelector('.d2veil'); if(V) V.style.height = G2.scrollHeight + 'px'; }
    else if(!r) document.body.classList.remove('d2carding');   /* 1.2.211: no agency open = no card open - the blur goes */
    syncBar(byMeas ? '<b>' + totalFit.toLocaleString() + '</b> ' + (totalFit === 1 ? 'model fits' : 'models fit') + ' · in <b>' + list.length.toLocaleString() + '</b> ' + (list.length === 1 ? 'agency' : 'agencies') :
      (BND && BND.any && measState !== 'ready' ? 'Reading the measurements…' : ''));
    if(VIEW === 'dir') countEl.textContent = list.length + (list.length === 1 ? ' agency' : ' agencies');
    try{ if(r && window.__illuPhoto) __illuPhoto.boardNow(r.a); }catch(e){}
    markSeen();
  };

  /* an agency is put down by clicking it again or anywhere outside it (the empty part of the
     list, the empty part of the panel, the page around them); the panel goes blank */
  function deselect(){
    if(!D2.sel || D2.sel === -1) return;
    D2.sel = -1; D2.open = ''; D2.bopen = false; D2.keepTop = false;
    refresh();
  }
  /* user, 2026-11-04: with a card out, a click ANYWHERE outside it (blurred photos, the list, the bars,
     the clocks) puts it back - and only that: the click does not also open what was under it */
  let eatClick = 0;
  document.addEventListener('pointerdown', e => {
    if(!DV() || !D2.open || D2.closing || e.button !== 0 || !e.target.closest) return;
    if(e.target.closest('.d2card, [role="dialog"], #ctmodal, #msgdock, #msgpanel, #d2toast, .bvcpick, #illuzoom')) return;
    e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    eatClick = Date.now(); closeCard();
  }, true);
  window.addEventListener('click', e => { if(eatClick && Date.now() - eatClick < 700){ eatClick = 0; e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation(); } }, true);
  const KEEP = '.d2fbrow, .d2fbh, .d2rgn, .d2grp, #d2toast, .d2agw, .d2pill, .d2pmore, .d2ag, #d2bar, #d2pop, .d2ph, .d2t, .d2card, .d2bmenu, .d2names .mrow, .d2more, #appbar, #abdrawer, #abtip, .views, nav, [role="dialog"], #ctmodal, #msgdock, #msgpanel, a, button, input, select, textarea, label, i[data-v]';
  document.addEventListener('pointerdown', e => {
    if(VIEW !== 'dir' || !D2.sel || D2.sel === -1 || e.button !== 0 || !e.target.closest) return;
    if(e.target.closest(KEEP)) return;
    if(D2.open){ closeCard(); return; }   // first click closes what is open on top
    /* 1.2.144 (user, 12 Nov 2026): a click in the empty space between the photos only puts a card away - it never
       leaves the agency's board for the start screen (that made the search start over) */
  });
  /* the open card can be dragged anywhere over the photos (not by its buttons, lamps or fields);
     it stays where it was put while it is open, and opens in its usual place next time */
  /* the card floats over the window (not inside the photo column, which can be shorter than
     the card): centred over the photos, its top level with theirs, raised when needed so the
     whole card and its Close pill stay inside the window; on a very small window it is shrunk */
  /* the card sits in the middle of the window (not of the Directory), clear of the top bar; it is
     shrunk on a very small window so the whole card and its Close pill always fit. Where it really
     lands is measured and corrected, so a scrolled page or a moved panel cannot push it off screen. */
  /* ---------- the card comes alive (agreed 2026-11-04) ----------
     opens out of the tile that was clicked with a slight spring, closes back into it; the blur
     behind fades in and out; details fade up one after another; the photo drifts slowly. */
  const CALM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tileOf = k => k && $('.d2t[data-d2k="' + CSS.escape(k) + '"]');
  function fromTile(C, tile){
    const R = C.getBoundingClientRect(), T = tile.getBoundingClientRect();
    if(!T.width || T.bottom < 0 || T.top > innerHeight) return null;
    const s = T.width / R.width, H = C.offsetHeight;
    const dx = (T.left + T.width / 2) - (R.left + R.width / 2), dy = (T.top + T.height / 2) - (R.top + s * R.height / 2);
    return 'translateX(-50%) translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
  }
  function cardEnter(C){
    const k = D2.open;
    const fresh = D2.shownKey !== k, ph = fresh && PHONE();
    if(fresh){                                   // just opened (not a redraw while open)
      D2.shownKey = k; D2.openedAt = Date.now();
      document.body.classList.add('d2opening'); clearTimeout(D2.openT);
      D2.openT = setTimeout(() => document.body.classList.remove('d2opening'), 1200);
      if(!CALM() && !ph){
        /* user, 2026-11-04: the card appears right where it always sat (centre of the window), it no
           longer flies in from the tile - it grows in place with the same slight spring */
        const from = 'translateX(-50%) translateY(12px) scale(.9)';
        try{ C.animate([{transform: from, opacity: 0}, {transform: 'translateX(-50%)', opacity: 1}], {duration: 620, easing: 'cubic-bezier(.22,1.28,.36,1)'}); }catch(e){}
        const x = C.querySelector('.d2x');
        if(x && C.classList.contains('cs-c')) try{ x.animate([{transform: 'translateX(-50%) translateY(-14px) scale(.9)', opacity: 0}, {transform: 'translateX(-50%)', opacity: 1}], {duration: 420, delay: 180, easing: 'cubic-bezier(.22,1.28,.36,1)', fill: 'backwards'}); }catch(e){}
      }
    }
    try{ slideApply(C); }catch(e){}
    if(ph && !SL.full) try{ slFull(true); }catch(e){}
    /* the photo keeps drifting from where it was, even when the card is redrawn (a lamp click) */
    C.style.setProperty('--d2age', -((Date.now() - (D2.openedAt || Date.now())) % 28000) + 'ms');
    /* a lamp that was just lit pops */
    if(D2.popLamp && Date.now() - D2.popLamp.at < 700){
      const i = C.querySelector('.mk i[data-v="' + D2.popLamp.v + '"]'); if(i && i.classList.contains('on') && !i.classList.contains('d2pop')) i.classList.add('d2pop'); }
  }
  /* lamps are repainted in place too (not only by a redraw): the card is watched for a lamp turning
     on - only the card, and only for the moment after a lamp is pressed (it watched every class
     change in the whole page before) */
  const popMO = new MutationObserver(ms => { if(!D2.popLamp || Date.now() - D2.popLamp.at > 700) return;
    for(const m of ms){ const i = m.target; if(i.matches && i.matches('.d2card .mk i[data-v]') && i.dataset.v === D2.popLamp.v && i.classList.contains('on') && !i.classList.contains('d2pop')) i.classList.add('d2pop'); } });
  let popT = 0;
  document.addEventListener('pointerdown', e => { const i = e.target.closest && e.target.closest('.d2card .mk i[data-v]'); if(!i) return;
    D2.popLamp = {v: i.dataset.v, at: Date.now()};
    const card = i.closest('.d2card'); popMO.disconnect(); if(card) popMO.observe(card, {subtree: true, attributes: true, attributeFilter: ['class']});
    clearTimeout(popT); popT = setTimeout(() => popMO.disconnect(), 800); }, true);

  /* ---------- slideshow on the card + full view (user, 2026-11-04) ----------
     The model's other agency photos (book, polaroids...) read from the profile page and shown one
     by one on the card. Nothing is saved: they load live from the agency (illuimg ...&nc=1 keeps them
     in memory only). When the agency's page cannot be read, the card says so and links to the page.
     Full view fills the whole window: photo left on a dark ground with the thumbnails under it,
     the card's details on the right. ←/→ photos, F or double-click full view, Esc back. */
  const SL = {key: '', i: 0, photos: null, state: '', why: '', full: false, side: true};
  try{ SL.side = localStorage.getItem('illu.d2fullside') !== '0'; }catch(e){}
  const slImg = (u, w) => window.__illuSlideSrc ? window.__illuSlideSrc(u, w) : (window.illu && window.illu.web) ? (window.__illuSmall ? window.__illuSmall(u, w && w <= 400 ? 300 : 900) : u) : 'illuimg://p/' + encodeURIComponent(u) + '?r=' + encodeURIComponent((D2.openM && D2.openM.href) || '') + '&nc=1&w=' + (w || 1400);
/* 1.2.254 (user, 18 Nov 2026: "there are too many duplicate images on this slide. I'm seeing a lot of this on a lot of
     the images on the slideshows from numerous cards"): one picture often comes in many file names -
       Webflow    6880dd325b09f80e66ab2d52_aga-9.jpg, …-p-500.jpg, …-p-800.jpg … -p-3200.jpg (up to 8 of one photo)
       mediaslide profile-1788…-<md5>.jpg, large-1788…-<md5>.jpg, square-…
       WordPress  name-scaled-e1782379181793-600x891.jpg (an edited copy, in sizes)
       others     name_600x.jpg, name@2x.jpg, name-800w.jpg, Cloudinary /upload/w_600,c_fill/…, /tr:w-300/…
     samePic(u) gives one key for all of them (the picture's own id in its name when it has one); picRank(u) says which
     of them is the biggest - that one is kept, at the place the picture first appeared. */
  const PIC_SIZEWORD = /(^|[-_/])(large|medium|small|thumb|thumbnail|xlarge|xl|big|full|mini|crop|resized|preview|th|profile|square|portrait|original|orig|hires|hi|lo|web)(?=[-_./]|$)/gi;
  function picUnwrap(u){
    let s = String(u || '');
    try{ if(/^illuimg:/i.test(s)) s = decodeURIComponent(new URL(s).pathname.replace(/^\/+/, '')); }catch(e){}
    try{ if(/images\.weserv\.nl/i.test(s)) s = new URL(s).searchParams.get('url') || s; }catch(e){}
    return s;
  }
  function samePic(u){
    const s = picUnwrap(u);
    let x; try{ x = new URL(s); }catch(e){ return s; }
    const host = x.host.replace(/^www\./, '').toLowerCase();
    { const w = /wixstatic\.com$/i.test(host) && x.pathname.match(/\/media\/([^/]+)/); if(w) return 'wix:' + w[1].toLowerCase(); }
    let p = x.pathname; try{ p = decodeURIComponent(p); }catch(e){} p = p.toLowerCase();
    const hasId = /(?:^|[^0-9a-f])[0-9a-f]{24,64}(?![0-9a-f])/.test(p.slice(p.lastIndexOf('/') + 1));
    if(/\/upload\//.test(p)) p = p.replace(/\/(?:(?:w|h|c|g|q|f|ar|dpr|e|x|y|fl|b|o|r|t)_[a-z0-9.:]+,?)+\//g, '/');
    p = p.replace(/\/tr:[^/]+\//g, '/').replace(/\/(?:fit-in\/)?\d{2,4}x\d{2,4}\//g, '/').replace(/\/(?:w|h|width|height|size)[-_=]?\d{2,4}\//g, '/');
    p = p.replace(/\.(jpe?g|png|webp|avif)$/, '');
    for(let i = 0; i < 3; i++) p = p.replace(/-p-\d{3,4}$/, '').replace(/[-_]\d{2,4}x\d{0,4}$/, '').replace(/@\dx$/, '').replace(/-\d{3,4}w$/, '').replace(/-e\d{10,13}$/, '').replace(/-scaled$/, '');
    p = p.replace(PIC_SIZEWORD, '$1');
    /* a file named by the picture's own id (mediaslide, Webflow): the same name on another server or folder is the same picture;
       the rest of the name still counts (<her id>-1.jpg and <her id>-2.jpg are two pictures) */
    if(hasId) return 'id:' + p.slice(p.lastIndexOf('/') + 1);
    return host + p;
  }
  function picRank(u){
    const s = picUnwrap(u).replace(/[?#].*$/, '');
    const f = s.slice(s.lastIndexOf('/') + 1).toLowerCase();
    let m;
    if((m = f.match(/-p-(\d{3,4})\.[a-z]+$/))) return +m[1];
    if((m = f.match(/[-_](\d{2,4})x(\d{0,4})\.[a-z]+$/))) return +m[1];
    if((m = f.match(/-(\d{3,4})w\.[a-z]+$/))) return +m[1];
    if((m = f.match(/@(\d)x\.[a-z]+$/))) return 900 * +m[1];
    if((m = s.match(/[/,]w_(\d+)/))) return +m[1];
    if((m = f.match(/^(thumbnail|thumb|th|mini|small|square|medium|profile|portrait|large|big|xlarge|xl|full|original|hires)[-_]/))) return {thumbnail: 150, thumb: 150, th: 150, mini: 200, small: 400, square: 500, medium: 800, profile: 900, portrait: 900, large: 2000, big: 2000, xlarge: 2600, xl: 2600, full: 9000, original: 9999, hires: 9000}[m[1]];
    return 5000;                                       // the file itself, no size in its name
  }
  /* the list with every picture once (biggest copy, first place) */
  function onePerPic(list, urlOf){
    urlOf = urlOf || (x => x);
    const at = new Map(), out = [];
    for(const it of list){
      const u = urlOf(it); if(!u) continue;
      const k = samePic(u);
      if(!at.has(k)){ at.set(k, out.length); out.push(it); continue; }
      const j = at.get(k); if(picRank(u) > picRank(urlOf(out[j]))) out[j] = it;
    }
    return out;
  }
  window.__illuSamePic = samePic; window.__illuOnePerPic = onePerPic;
  const fileKey = u => { let p = String(u || ''); try{ if(/images\.weserv\.nl/.test(p)) p = new URL(p).searchParams.get('url') || p; }catch(e){} try{ p = decodeURIComponent(new URL(p.startsWith('illuimg:') ? decodeURIComponent(new URL(p).pathname.slice(1)) : p).pathname); }catch(e){}
    return p.toLowerCase().replace(/^.*\//, '').replace(/-\d{2,4}x\d{2,4}(?=\.)/, '').replace(/\.(jpe?g|png|webp|avif)$/, '').replace(/^(large|medium|small|thumb|xlarge)[-_]/, ''); };
  const SLWHY = {
    gone: ['This model’s page is no longer on the agency’s site', 'Check the agency’s site directly'],
    pdf: ['This agency shows its portfolios as a PDF', 'Open the agency page to see the photos'],
    blocked: ['The agency’s site does not let the program read its photos', 'Open the agency page to see the photos'],
    none: ['No other photos could be read from the agency’s page', 'Open the agency page to see the book, polaroids and videos'],
    one: ['The agency’s page has no other photos the program can show', 'Open the agency page to see more'],
    nolink: ['There is no profile link for this model', ''],
    off: ['The slideshow works in the ILLUMENOCTIS program', '']
  };
  const IC_FULL = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>';
  const IC_EXIT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5"/></svg>';
  /* 1.2.196: Undo of a hidden photo (its button, Ctrl + Z, or a hide by someone else) reads her slideshow again, staying on the same slide */
  document.addEventListener('illu-phide', () => { try{ const m = D2.openM; if(SL.self){ SL.self = false; return; } if(!D2.open || !m || SL.key !== m.key) return; if(SL.undo && window.__illuPhotoHidden && window.__illuPhotoHidden(SL.undo.page, SL.undo.url)) return; SL.undo = null; const i = SL.i; slLoad(m.key, m.href); SL.keepI = i; }catch(e){} });
  function slLoad(key, href){
    SL.key = key; SL.i = 0; SL.photos = null; SL.state = 'loading'; SL.why = '';
    if(!(window.illu && window.illu.modelPhotos)){ SL.state = 'none'; SL.why = 'off'; return; }
    if(!/^https?:/i.test(href || '')){ SL.state = 'none'; SL.why = 'nolink'; return; }
    window.illu.modelPhotos(href).then(r => {
      if(SL.key !== key) return;
      const C = $('.d2card'), main = C && C.querySelector('.litpic img');
      const mk = main ? fileKey(main.currentSrc || main.src) : '';
      const mainK = main ? samePic(main.dataset && main.dataset.orig || main.currentSrc || main.src) : '';
      /* 1.2.254: every picture once (the phone's reader too), and not the card's own photo again */
      const ph = onePerPic(((r && r.photos) || []).filter(x => x && x.url), x => x.url).filter(x => (!mk || fileKey(x.url) !== mk) && (!mainK || x.cat === 'Video' || samePic(x.url) !== mainK));
      SL.photos = ph; SL.state = ph.length ? 'ok' : 'none';
      /* 1.2.149: opened from a card that was on another photo - start on that photo */
      try{ const want = window.__illuTileIdx ? window.__illuTileIdx(key) : ''; if(want){ const j = ph.findIndex(x => fileKey(x.url) === fileKey(want)); if(j >= 0) SL.i = j + 1; } }catch(e){}
      if(SL.keepI != null){ SL.i = Math.min(SL.keepI, ph.length); SL.keepI = null; }
      SL.why = ph.length ? '' : ((r && r.why) && SLWHY[r.why] ? r.why : (r && r.photos && r.photos.length ? 'one' : 'none'));
      if(C) slideApply(C);
    }).catch(() => { if(SL.key === key){ SL.state = 'none'; SL.why = 'none'; const C = $('.d2card'); if(C) slideApply(C); } });
  }
  /* slide 0 is the card's own photo; 1.. are the agency's other pictures */
  const slN = () => 1 + ((SL.photos && SL.photos.length) || 0);
  function slGo(i){ const n = slN(); if(n < 2) return; SL.i = ((i % n) + n) % n; const C = $('.d2card'); if(C) slideApply(C); }
  /* 1.2.140 (user, 11 Nov 2026: "For mobile, I want to the card to directly just open without having to select the
     floating card again ... This goes for all cards in whichever board that has the floating function"):
     on a phone a tapped tile opens straight into the full card (slideshow + details); leaving it closes the card */
  { const st = document.createElement('style'); st.textContent = '@media (max-width:760px), (pointer:coarse) and (max-width:1024px){.d2card.d2full .d2slf{display:none!important}}'; document.head.appendChild(st); }
  function PHONE(){ return matchMedia('(max-width:760px), (pointer:coarse) and (max-width:1024px)').matches; }
  function slFull(on){
    /* 1.2.192 (user, 14 Nov 2026): "I want the cards to stop hovering and centering in the middle. I want the card to just
       go to Full Screen Mode" - a card opens in the full view, and leaving the full view closes it (no floating card) */
    if(!on && SL.full && D2.open){ closeCard(); return; }
    /* the details panel on the right always opens with the full view (user, 6 Nov 2026); its button
       still hides it for the moment, but that is no longer remembered */
    if(on && !SL.full) SL.side = true;
    SL.full = !!on; const C = $('.d2card');
    document.body.classList.toggle('d2fullcard', SL.full);
    if(C){ C.classList.toggle('d2full', SL.full); if(!SL.full){ C.style.left = ''; C.style.top = ''; placeCard(C); } slideApply(C); }
  }
  function slideApply(C){
    const m = D2.openM; if(!m || m.key !== D2.open) return;
    if(SL.key !== m.key) slLoad(m.key, m.href);
    if(SL.auto !== m.key){ SL.auto = m.key; SL.full = true; SL.side = true; document.body.classList.add('d2fullcard'); }
    C.classList.toggle('d2full', SL.full);
    C.classList.toggle('d2noside', SL.full && !SL.side);
    /* full view: a button to close and open the details panel, like the Booking window's side panel */
    let sb = C.querySelector(':scope > .d2slside');
    if(SL.full){
      if(!sb){ sb = document.createElement('button'); sb.type = 'button'; sb.className = 'd2slside'; sb.setAttribute('data-d2slside', ''); C.appendChild(sb); }
      const t = SL.side ? 'Close the panel' : 'Open the panel';
      sb.title = t; sb.setAttribute('aria-label', t); sb.setAttribute('aria-expanded', String(SL.side));
      sb.innerHTML = SL.side ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 7l5 5-5 5M14 12H5M19 5v14"/></svg>'
                             : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 7 5 12l5 5M5 12h9M19 5v14"/></svg>';
    }else if(sb) sb.remove();
    const pic = C.querySelector('.litpic'); if(!pic) return;
    /* the card photo: double-click for full view; a photo can still be dropped or pasted on it */
    if(pic.hasAttribute('data-pic')) pic.title = SL.full ? 'Double-click or Esc to go back to the card · drop or paste a photo to replace the card photo' : 'Click for full view · drop or paste a photo to replace the card photo · right-click to copy, save or choose a photo';
    let box = pic.querySelector(':scope > .d2sl');
    if(!box){ box = document.createElement('div'); box.className = 'd2sl'; pic.appendChild(box); }
    const n = slN(), i = Math.min(SL.i, n - 1), cur = i > 0 ? SL.photos[i - 1] : null;
    const enc = s2 => String(s2).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
    const full = SL.full;
    let h = '';
    /* 1.2.242: a film from her page plays in the slideshow (muted, looping; the sound and controls are on it) */
    const curV = !!cur && (cur.cat === 'Video' || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(cur.url || ''));
    if(cur && curV){ const old = pic.querySelector('.d2sl video.d2slv'); if(old && old.getAttribute('src') === cur.url) h += '<!--v-->'; else h += '<video class="d2sli d2slv" src="' + enc(cur.url) + '" autoplay muted loop playsinline controls controlslist="nofullscreen" disablepictureinpicture preload="metadata"></video>'; }
    else if(cur) h += '<img class="d2sli" alt="" src="' + enc(slImg(cur.url, full ? 2000 : 900)) + '" draggable="false">';
    h += '<button type="button" class="d2slf" data-d2slf aria-pressed="' + full + '" title="' + (full ? 'Exit full view · F or Esc' : 'Full view · F') + '" aria-label="' + (full ? 'Exit full view' : 'Full view') + '">' + (full ? IC_EXIT : IC_FULL) + '<span>' + (full ? 'Exit full view' : 'Full view') + '</span><kbd>F</kbd></button>';
    /* 1.2.112: make the photo shown the card photo (only a link is kept - nothing is saved); back to the crawler's photo */
    const PH = window.__illuPhoto, picked = PH && PH.PMAIN && PH.PMAIN.get(m.key);
    if(cur && !curV && PH && PH.setMain) h += '<button type="button" class="d2slmain" data-d2slmain title="Show this photo on the model’s card, for everyone (the photo is not saved — only which one to show)">★ Use as card photo</button>';
    else if(!cur && picked && PH.clearMain) h += '<button type="button" class="d2slmain back" data-d2slunmain title="Go back to the photo the program found">↺ Back to the original photo</button>';
    /* 1.2.196 (user, 15 Nov 2026: "what happened to the hide photo function?"): since cards open straight in this full view
       (1.2.192) the "Not her - Hide" of the other photo viewer (1.2.174) was out of reach - it is here too now, for a photo
       from her agency page (slide 2 on; slide 1 is her card photo). Hidden for the whole team; the agency site is not changed. */
    if(SL.undo && Date.now() - SL.undo.at < 6000) h += '<button type="button" class="d2slhide und" data-d2slundo title="Put the photo back in her slideshow (Ctrl + Z works too)">✓ Photo hidden · <u>Undo</u></button>';
    else if(cur && window.__illuHidePhoto && /^https?:/i.test(m.href || '')) h += '<button type="button" class="d2slhide" data-d2slhide title="Hide this photo from the slideshows, for everyone (the agency site is not changed)">⊘ Hide</button>';
    /* 1.2.148: turn the photo shown (for everyone) */
    if(!curV && (cur || pic.querySelector(':scope > img')) && window.__illuRotBtns) h += window.__illuRotBtns('d2rot');
    if(n > 1){
      h += '<button type="button" class="d2sln prev" data-d2sl="-1" aria-label="Previous photo"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg></button>' +
        '<button type="button" class="d2sln next" data-d2sl="1" aria-label="Next photo"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg></button>' +
        '<div class="d2slc"><b>' + (i + 1) + ' / ' + n + '</b>' + (cur && cur.cat === 'Polaroids' ? '<span>Polaroids</span>' : '') + '</div>';
      if(n <= 14 && !full) h += '<div class="d2sld">' + Array.from({length: n}, (_, k) => '<i class="' + (k === i ? 'on' : '') + '"></i>').join('') + '</div>';
    }else if(SL.state === 'loading'){
      h += '<div class="d2slst"><i></i>Looking for more photos…</div>';
    }else if(SL.state === 'none' && SLWHY[SL.why]){
      const [t, a] = SLWHY[SL.why];
      h += '<div class="d2slno" role="note"><b>No slideshow</b><span>' + enc(t) + '</span>' +
        (a && m.href ? '<a href="' + enc(m.href) + '" target="_blank" rel="noopener noreferrer">' + enc(a) + ' ↗</a>' : '') + '</div>';
    }
    /* the film keeps playing while the buttons around it are redrawn */
    if(h.includes('<!--v-->')){ const v = box.querySelector('video.d2slv'); if(v) v.remove(); box.innerHTML = h; if(v) box.insertBefore(v, box.firstChild); } else box.innerHTML = h;
    pic.classList.toggle('d2slon', !!cur);
    /* full view: the thumbnails under the photo, and the profile link in the details */
    let strip = C.querySelector(':scope > .d2slstrip');
    if(full && n > 1){
      if(!strip){ strip = document.createElement('div'); strip.className = 'd2slstrip'; strip.setAttribute('aria-label', 'All photos'); C.appendChild(strip); }
      const main = pic.querySelector(':scope > img');
      const isVu = x => x.cat === 'Video' || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(x.url || '');
      const srcs = [main ? (main.currentSrc || main.src) : ''].concat(SL.photos.map(x => isVu(x) ? 'video:' + x.url : slImg(x.url, 240)));
      if(strip.dataset.n !== String(n) || strip.dataset.k !== SL.key){ strip.dataset.n = n; strip.dataset.k = SL.key;
        strip.innerHTML = srcs.map((u, k) => '<button type="button" class="d2slt" data-d2slt="' + k + '" aria-label="Photo ' + (k + 1) + '">' + (u && u.startsWith('video:') ? '<video muted preload="metadata" src="' + enc(u.slice(6)) + '#t=0.5"></video><i class="d2slplay" aria-hidden="true">▶</i>' : u ? '<img alt="" loading="lazy" src="' + enc(u) + '">' : '') + '</button>').join(''); }
      strip.querySelectorAll('.d2slt').forEach((b, k) => b.classList.toggle('on', k === i));
      const on = strip.querySelector('.d2slt.on'); if(on) try{ on.scrollIntoView({block: 'nearest', inline: 'nearest'}); }catch(e){}
    }else if(strip) strip.remove();
    let fx = C.querySelector('.litcard > .d2slfx');
    if(full){
      if(!fx){ fx = document.createElement('dl'); fx.className = 'd2slfx'; const lc = C.querySelector('.litcard'); if(lc){ const acts = lc.querySelector('.litacts'); lc.insertBefore(fx, acts || null); } }
      fx.innerHTML = '<dt>Profile</dt><dd>' + (m.href ? '<a href="' + enc(m.href) + '" target="_blank" rel="noopener noreferrer">Open on the agency’s site ↗</a>' : '—') + '</dd>' +
        '<dt>Photos</dt><dd>' + (SL.state === 'loading' ? 'Looking…' : n > 1 ? n + ' from the agency’s page' : 'Only the card photo' + (SL.why && SLWHY[SL.why] ? ' — ' + enc(SLWHY[SL.why][0].toLowerCase()) : '')) + '</dd>' +
        (m.boards && m.boards.length ? '<dt>Boards</dt><dd>' + m.boards.map(b => enc(b.d || 'Board')).join(' · ') + '</dd>' : '');
      mxPaint(C);
    }else if(fx) fx.remove();
    if(!full){ const w = C.querySelector('.d2mxw'); if(w) w.remove(); C.classList.remove('d2pnon'); }
  }
  /* 1.2.129 (user, 10 Nov 2026): the full view has the same Booking / Notes / Links as every other expanded card */
  function mxPaint(C){
    const m = D2.openM, lc = C && C.querySelector('.litcard'); if(!m || !lc || !window.__illuModelPanel || !window.__illuMxPaint) return;
    let w = lc.querySelector(':scope > .d2mxw');
    if(!w){ w = document.createElement('div'); w.className = 'd2mxw'; lc.insertBefore(w, lc.firstChild); }
    C.classList.add('d2pnon');
    const n = slN(), dom = (() => { try{ const hit = AG.find(x => x.name === m.ag); return hit ? (hit.domain || hit.name) : ''; }catch(e){ return ''; } })();
    window.__illuMxPaint(w, window.__illuModelPanel(m.key, {nm: m.nm || '', ag: m.ag || '', agRef: dom, city: m.city || '', country: m.country || '', href: m.href || '', nPhotos: n > 1 ? n : 0,
      boards: (m.boards || []).map(b => b.d || 'Board').filter((x, i, A) => A.indexOf(x) === i).join(' · '), div: m.div || ''}));
  }
  (window.__illuVoteFns = window.__illuVoteFns || []).push(() => { if(SL.full && D2.open){ const C = $('.d2card.d2full'); if(C) mxPaint(C); } });
  window.__illuSlide = () => ({key: SL.key, i: SL.i, n: slN(), state: SL.state, why: SL.why, full: SL.full});
  document.addEventListener('click', e => {
    if(!DV() || !D2.open || !e.target.closest) return;
    const a = e.target.closest('[data-d2sl]'); if(a){ e.preventDefault(); e.stopPropagation(); slGo(SL.i + (+a.dataset.d2sl)); return; }
    const t = e.target.closest('[data-d2slt]'); if(t){ e.preventDefault(); e.stopPropagation(); slGo(+t.dataset.d2slt); return; }
    if(e.target.closest('[data-d2slf]')){ e.preventDefault(); e.stopPropagation(); slFull(!SL.full); return; }
    const mb = e.target.closest('[data-d2slmain], [data-d2slunmain]');
    if(mb){ e.preventDefault(); e.stopPropagation(); const PH = window.__illuPhoto, m = D2.openM; if(!PH || !m) return;
      try{ if(typeof SIGNED === 'function' && !SIGNED()){ if(typeof nudgeSignIn === 'function') nudgeSignIn(); return; } }catch(err){}
      const cur = SL.i > 0 && SL.photos ? SL.photos[SL.i - 1] : null;
      Promise.resolve(mb.hasAttribute('data-d2slmain') && cur ? PH.setMain(m.key, cur.url, m.href) : PH.clearMain(m.key)).then(() => {
        /* the slideshow is read again: the new card photo is slide 1, the old one goes back among the others */
        const C = $('.d2card'); slLoad(m.key, m.href); SL.i = 0; if(C) slideApply(C);
      }); return; }
    if(e.target.closest('[data-d2slundo]')){ e.preventDefault(); e.stopPropagation(); const u = SL.undo; SL.undo = null; if(u && window.__illuUnhidePhoto) window.__illuUnhidePhoto(u.page, u.url); else { const C = $('.d2card'); if(C) slideApply(C); } return; }
    if(e.target.closest('[data-d2slhide]')){ e.preventDefault(); e.stopPropagation(); const m = D2.openM; if(!m || !window.__illuHidePhoto) return;
      try{ if(typeof SIGNED === 'function' && !SIGNED()){ if(typeof nudgeSignIn === 'function') nudgeSignIn(); return; } }catch(err){}
      const j = SL.i - 1, cur = j >= 0 && SL.photos ? SL.photos[j] : null; if(!cur) return;
      SL.self = true;
      window.__illuHidePhoto(m.href, cur.url);
      SL.photos.splice(j, 1); SL.i = Math.min(SL.i, slN() - 1); SL.undo = {page: m.href, url: cur.url, at: Date.now()};
      setTimeout(() => { const C2 = $('.d2card'); if(C2 && SL.undo && Date.now() - SL.undo.at >= 5900){ SL.undo = null; slideApply(C2); } }, 6100);
      const C = $('.d2card'); if(C) slideApply(C); return; }
    if(e.target.closest('[data-d2slside]')){ e.preventDefault(); e.stopPropagation(); SL.side = !SL.side; try{ localStorage.setItem('illu.d2fullside', SL.side ? '1' : '0'); }catch(err){} const C = $('.d2card'); if(C) slideApply(C); return; }
  }, true);
  /* the Directory card's photo takes a dropped or pasted photo like the Lumen cards do (it was never wired here) */
  try{ const pd = document.getElementById('pane-dir'); if(pd && typeof bindPicSurface === 'function' && !pd.__picbound){ pd.__picbound = true; bindPicSurface(pd); } }catch(e){}
  /* one click on the card photo opens the full view (user, 2026-11-04); a drag of the card is not a click.
     Choosing a photo file is on the right-click menu; dropping or pasting a photo works as before.
     (the card holds the pointer for dragging, so the photo is found by where the pointer was) */
  let pdx = null, fullAt = 0;
  const picAt = (x, y) => { const at = document.elementFromPoint(x, y); if(!at || !at.closest || at.closest('button, a, input')) return null; return at.closest('.d2card .litpic'); };
  window.addEventListener('pointerdown', e => { pdx = (e.button === 0 && DV() && D2.open) ? [e.clientX, e.clientY] : null; }, true);
  window.addEventListener('click', e => {
    if(e.button !== 0 || !DV() || !D2.open || !e.target.closest || !e.target.closest('.d2card')) return;
    /* a click on a control (or the details panel) is that control's, even one made by the program (no pointer place) */
    if(e.target.closest('.mx, button, a, input, select, textarea, label, form')) return;
    const cell = picAt(e.clientX, e.clientY); if(!cell) return;
    e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    if(pdx && Math.hypot(e.clientX - pdx[0], e.clientY - pdx[1]) > 6) return;      // the card was dragged
    if(!SL.full){ fullAt = Date.now(); slFull(true); }
  }, true);
  /* in full view a double-click goes back to the card (not the double-click that just opened it) */
  document.addEventListener('dblclick', e => { if(!DV() || !D2.open || !SL.full || Date.now() - fullAt < 700) return;
    if(picAt(e.clientX, e.clientY)) slFull(false); });
  document.addEventListener('keydown', e => {
    if(!DV() || !D2.open || e.ctrlKey || e.metaKey || e.altKey) return;
    const a = document.activeElement; if(a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
    if(e.key === 'ArrowRight'){ slGo(SL.i + 1); e.preventDefault(); }
    else if(e.key === 'ArrowLeft'){ slGo(SL.i - 1); e.preventDefault(); }
    else if(e.key === 'f' || e.key === 'F'){ slFull(!SL.full); e.preventDefault(); }
    else if(e.key === 'Escape' && SL.full){ slFull(false); e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  /* swipe in full view (the normal card is moved by dragging, so there the arrows do it) */
  { const st = document.createElement('style'); st.textContent = '@media (pointer:coarse){.d2card .litpic{touch-action:pan-y pinch-zoom}}'; document.head.appendChild(st); }
  let swx = null;
  /* 1.2.137: on a touch screen the card is not dragged, so a finger swipes the photos in the normal card too */
  let swEat = 0;
  document.addEventListener('pointerdown', e => { const tch = e.pointerType === 'touch'; if((SL.full || tch) && e.target.closest && e.target.closest(SL.full ? '.d2card.d2full .litpic' : '.d2card .litpic') && (tch ? !e.target.closest('a, .ht, [data-heart]') : !e.target.closest('button, a'))) swx = e.clientX; else swx = null; }, true);
  /* a swipe that started on the ‹ › arrows is a swipe, not also a tap on the arrow */
  document.addEventListener('click', e => { if(swEat && Date.now() - swEat < 500 && e.target.closest && e.target.closest('.d2card .litpic')){ e.preventDefault(); e.stopPropagation(); swEat = 0; } }, true);
  document.addEventListener('pointercancel', e => { if(swx === null || e.pointerType !== 'touch') return; const dx = (e.clientX || 0) - swx; swx = null; if(Math.abs(dx) > 50) slGo(SL.i + (dx < 0 ? 1 : -1)); }, true);
  document.addEventListener('pointerup', e => { if(swx === null) return; const dx = e.clientX - swx; swx = null; if(Math.abs(dx) > 50){ swEat = Date.now(); slGo(SL.i + (dx < 0 ? 1 : -1)); } }, true);
  /* a name too long for its pill rolls sideways inside it, like a ticker sign, instead of breaking onto
     two lines (user chose A, 2026-11-04). The pill keeps its lamp-coloured border; short names stay still. */
  function fitName(row){
    const a = row && row.querySelector(':scope > a.rnm'); if(!a || a.querySelector('.rnmw') || !row.offsetWidth) return;
    const mk = row.querySelector('.mk');
    a.style.whiteSpace = 'nowrap';
    const cs = getComputedStyle(a), pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    const gap = parseFloat(getComputedStyle(row).columnGap) || 8;
    const room = Math.floor(row.clientWidth - (mk ? mk.offsetWidth : 0) - gap - 4);
    const need = a.scrollWidth;
    if(need <= room + 1){ return; }
    const nm = a.textContent, e2 = t => String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
    a.classList.add('rnmq'); a.style.width = room + 'px'; a.title = nm;
    a.innerHTML = '<span class="rnmw"><span class="rnmi"><span>' + e2(nm) + '</span><span aria-hidden="true">' + e2(nm) + '</span></span></span>';
    const w = a.querySelector('.rnmi > span').offsetWidth;
    a.querySelector('.rnmi').style.animationDuration = Math.max(5, w / 32).toFixed(1) + 's';
  }
  /* every card in the program (Directory, Recommendations, Lumen, Booking...): checked when cards are drawn.
     Only rows that just arrived are looked at (not every row on every change - the clocks alone change
     the page every second); a row is checked once, and rows on a hidden tab wait until it is shown. */
  let fnT = 0, pend = new Set();
  const DONE = new WeakSet();
  /* read first (which names have broken onto a second line), then change only those - no layout thrash */
  const fitAll = () => { fnT = 0;
    const rows = pend; pend = new Set();
    const todo = [];
    for(const r of rows){
      if(!r.isConnected || DONE.has(r)) continue;
      const a = r.querySelector(':scope > a.rnm');
      if(!a || a.classList.contains('rnmq')){ DONE.add(r); continue; }
      if(!r.offsetWidth) continue;                               // not on screen yet: picked up when its tab opens
      DONE.add(r);
      const lh = parseFloat(getComputedStyle(a).lineHeight) || 18; if(a.getClientRects().length > 1 || a.offsetHeight > lh * 1.6) todo.push(r); }
    todo.forEach(r => { try{ fitName(r); }catch(e){} }); };
  const queue = r => { if(!DONE.has(r)) pend.add(r); };
  const kick = () => { if(pend.size && !fnT) fnT = requestAnimationFrame(fitAll); };
  new MutationObserver(ms => {
    for(const m of ms){
      if(!m.addedNodes.length) continue;
      const t = m.target;
      if(t.closest && t.closest('a.rnm')) continue;            // the ticker's own markup
      if(t.nodeType === 1){ const row = t.closest ? t.closest('.litr1') : null; if(row){ DONE.delete(row); queue(row); } }
      for(const n of m.addedNodes){
        if(n.nodeType !== 1) continue;
        if(n.classList && n.classList.contains('litr1')) queue(n);
        else if(n.firstElementChild) n.querySelectorAll('.litr1').forEach(queue);
      }
    }
    kick();
  }).observe(document.body, {childList: true, subtree: true});
  /* a tab coming into view, or a new window size: rows not yet measured are measured now */
  const sweep = () => { document.querySelectorAll('.litr1').forEach(queue); kick(); };
  try{ new MutationObserver(() => setTimeout(sweep, 60)).observe(document.body, {attributes: true, attributeFilter: ['data-view']}); }catch(e){}
  let rsT = 0; addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(sweep, 200); });
  setTimeout(sweep, 0);
  function closeCard(){
    if(!D2.open || D2.closing) return;
    const wasFull = SL.full; SL.auto = '';
    if(SL.full){ SL.full = false; SL.auto = ''; document.body.classList.remove('d2fullcard'); const F = $('.d2card.d2full'); if(F) F.classList.remove('d2full'); }
    const k = D2.open, C = $('.d2card');
    const done = () => {
      D2.closing = false; document.body.classList.remove('d2closing');
      D2.open = ''; D2.cardPos = null; D2.shownKey = '';
      /* Compare boards: the card was laid over the page - take it away, the page stays as it was */
      if(CMPB()){ D2.solo = null; document.querySelectorAll('#pane-cmpb .d2solo').forEach(x => x.remove()); document.body.classList.remove('d2carding'); return; }
      refresh();
      const t = tileOf(k), b = t && t.querySelector('.d2plus'); if(b) try{ b.focus({preventScroll: true}); }catch(e){}
    };
    if(!C || CALM() || wasFull){ done(); return; }
    D2.closing = true; document.body.classList.add('d2closing');
    const to = 'translateX(-50%) translateY(10px) scale(.94)';   // shrinks away in place
    const veil = $('.d2veil'); if(veil) veil.style.pointerEvents = 'none';
    try{ const a = C.animate([{transform: 'translateX(-50%)', opacity: 1}, {transform: to || 'translateX(-50%) scale(.94)', opacity: 0}], {duration: 280, easing: 'ease-in', fill: 'forwards'});
      a.onfinish = done; a.oncancel = done; setTimeout(() => { if(D2.closing) done(); }, 500); }
    catch(e){ done(); }
  }
  function cardBox(C){
    const H = C.offsetHeight, W = C.offsetWidth, extra = C.classList.contains('cs-c') ? 56 : (C.classList.contains('cs-f') ? 30 : 18), lift = C.classList.contains('cs-f') ? 30 : 0;
    const ab = document.getElementById('appbar'), minTop = Math.max(0, ab ? ab.getBoundingClientRect().bottom : 0) + 10 + lift;
    const room = innerHeight - 10 - minTop, k = H + extra > room ? Math.max(.55, room / (H + extra)) : 1;
    return {H, W, extra, minTop, k, maxTop: innerHeight - 10 - (H + extra) * k};
  }
  function placeCard(C){
    if(C.classList.contains('d2full')) return {x: 0, y: 0};
    /* the card settles a moment after it opens (photo, boards list): place it again when its size changes */
    if(!C.__ro && window.ResizeObserver){ C.__ro = new ResizeObserver(() => { if(!drag && C.isConnected) placeCard(C); }); C.__ro.observe(C); }
    const b = cardBox(C);
    C.style.scale = b.k === 1 ? '' : String(b.k);
    /* height: level with the top of the photos (as before), raised when needed to fit; across: the middle of the screen */
    const G = $('.d2body'), gTop = G ? G.getBoundingClientRect().top + 14 : b.minTop;
    const top = Math.max(b.minTop, Math.min(b.maxTop, gTop)), cx = innerWidth / 2;
    const pos = D2.cardPos || {x: 0, y: 0};
    const vy = Math.max(b.minTop, Math.min(b.maxTop, top + pos.y));
    const half = b.W * b.k / 2, vx = Math.max(half + 8 - cx, Math.min(innerWidth - half - 8 - cx, pos.x));
    C.style.left = cx + 'px'; C.style.top = vy + 'px'; C.style.marginLeft = vx + 'px';
    /* measure: if something around the card shifts it, move it back to where it should be
       (not while it is still flying in or out - its rect is the animation's then) */
    if(C.getAnimations && C.getAnimations().some(a => a.playState === 'running')){
      if(!C.__replaceAfter){ C.__replaceAfter = true; Promise.all(C.getAnimations().map(a => a.finished.catch(() => {}))).then(() => { C.__replaceAfter = false; if(C.isConnected && !D2.closing) placeCard(C); }); }
      C.__base = {top, cx}; return {x: vx, y: vy - top};
    }
    const r = C.getBoundingClientRect();
    const dy = vy - r.top, dx = (cx + vx) - (r.left + r.width / 2);
    C.__off = {x: 0, y: 0};
    if(Math.abs(dy) > 1 || Math.abs(dx) > 1){ C.__off = {x: -dx, y: -dy}; C.style.left = (cx + dx) + 'px'; C.style.top = (vy + dy) + 'px'; }
    C.__base = {top, cx};
    return {x: vx, y: vy - top};
  }
  /* once per frame at most: every scroll event used to write the card's place and read it back */
  let rpT = 0;
  const replace = () => { if(rpT || !D2.open) return; rpT = requestAnimationFrame(() => { rpT = 0; const C = $('.d2card'); if(C) placeCard(C); }); };
  window.addEventListener('resize', replace); window.addEventListener('scroll', replace, true);
  let drag = null;
  document.addEventListener('pointerdown', e => {
    const C = e.target.closest && e.target.closest('.d2card');
    if(!C || e.button !== 0 || C.classList.contains('d2full')) return;
    if(e.target.closest('button, a, input, select, textarea, label, i[data-v], [contenteditable], .mk, .litacts, .d2sl')) return;
    const p0 = D2.cardPos || {x: 0, y: 0};
    drag = {C, sx: e.clientX, sy: e.clientY, x0: p0.x, y0: p0.y, moved: false};
    C.setPointerCapture && C.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove', e => {
    if(!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if(!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    drag.moved = true; drag.C.classList.add('dragging');
    D2.cardPos = {x: drag.x0 + dx, y: drag.y0 + dy};
    D2.cardPos = placeCard(drag.C);      // kept inside the window
  });
  const endDrag = () => { if(drag){ drag.C.classList.remove('dragging'); if(drag.moved) D2.justDragged = Date.now(); drag = null; } };
  document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);
  /* a drag that ends over a photo is not a click on it */
  window.addEventListener('click', e => { if(D2.justDragged && Date.now() - D2.justDragged < 300){ e.stopPropagation(); e.preventDefault(); D2.justDragged = 0; } }, true);
  window.__illuCardStyle = v => { D2.cardStyle = v; refresh(); };
  /* ---------- clicks in the page ---------- */
  window.addEventListener('click', e => {
    if(VIEW === 'dir' && e.target.closest && e.target.closest('[data-d2bfull]')){ e.preventDefault(); setBoardFull(!D2.bfull); return; }
    if(DV() && e.target.closest && e.target.closest('[data-d2pz0]')){ e.preventDefault(); window.__illuPhotoZoom && __illuPhotoZoom('0'); return; }
    if(VIEW === 'dir' && e.target.closest && e.target.closest('[data-d2list]')){ e.preventDefault(); setListOff(!D2.listOff); return; }
    const fbx = VIEW === 'dir' && e.target.closest && e.target.closest('[data-d2fbx]');
    if(fbx){ e.preventDefault(); if(window.ATLFAV) ATLFAV.toggle(fbx.dataset.d2fbx); const x = D2.entries && D2.entries.get(D2.sel); if(x && x.net.domain === fbx.dataset.d2fbx){ D2.sel = -1; D2.open = ''; } refresh(); return; }
    const fbar = VIEW === 'dir' && e.target.closest && e.target.closest('[data-d2fbar]');
    if(fbar){ e.preventDefault(); const id = fbar.dataset.d2fbar;
      if(D2.sel === id){ D2.sel = -1; D2.open = ''; D2.bopen = false; refresh(); return; }
      D2.sel = id; D2.bsel = new Set(); D2.open = ''; D2.bopen = false; D2.cardPos = null; refresh();
      fitFav(true);
      const G = $('.d2body'); if(G) G.scrollTop = 0; return; }
    if(!DV() || !e.target.closest) return;
    if(e.target.closest('#pane-cmpb, #pane-today, .ivpage')) return;     /* the same card on other pages opens its own way */
    const t = e.target.closest('.d2t');
    if(t && !e.target.closest('a')){ e.preventDefault(); e.stopPropagation(); D2.open = t.dataset.d2k; D2.cardPos = null; refresh(); return; }
  }, true);
  document.addEventListener('click', e => {
    if(VIEW !== 'dir' || !e.target.closest) return;
    const ag = e.target.closest('[data-d2ag]');
    if(ag && ag.dataset.d2ag === D2.sel){ deselect(); return; }   // the chosen one again: put it down
    if(ag){
      D2.sel = ag.dataset.d2ag; D2.bmore = false; D2.open = ''; D2.bopen = false;
      const x = D2.entries && D2.entries.get(D2.sel), a = x ? x.a : null;
      /* chosen under a country: that country's boards are ticked to start with */
      D2.bsel = new Set([0]);
      if(x && x.co && new Set(x.bs.map(b => b.off)).size > 1){ const js = x.bs.map((b, j) => (b.off && b.off.country === x.co) ? j : -1).filter(j => j >= 0); if(js.length && js.length < x.bs.length) D2.bsel = new Set(js); }
      try{ if(a) remember('agency', 'agency:' + a.domain, a.name, [a.city, a.country].filter(Boolean).join(' · '), a.boards[0] ? a.boards[0].u : ''); }catch(err){}
      refresh();
      const G = $('.d2body'); if(G) G.scrollTop = 0;
      return;
    }
    const tb = e.target.closest('[data-d2tab]');
    if(e.target.closest('[data-d2bopen]')){ D2.bopen = !D2.bopen; refresh(); return; }
    if(D2.bopen && !e.target.closest('.d2bmenu')){ D2.bopen = false; refresh(); }
    if(e.target.closest('[data-d2bmore]')){ D2.bmore = !D2.bmore; refresh(); return; }
    if(tb){ if(!tb.closest('.d2bmenu')) D2.bopen = false; D2.open = '';
      if(tb.dataset.d2tab === 'all') D2.bsel.clear();
      else { const j = +tb.dataset.d2tab; if(D2.bsel.has(j)) D2.bsel.delete(j); else D2.bsel.add(j); }
      refresh(); const G = $('.d2body'); if(G) G.scrollTop = 0; return; }
    const nm = e.target.closest('[data-d2names]');
    if(nm){ D2.names = nm.dataset.d2names === '1'; refresh(); return; }
    if(e.target.closest('[data-d2close]') || (e.target.classList && e.target.classList.contains('d2body') && D2.open)){ closeCard(); return; }
    const rm = e.target.closest('[data-d2rm]');
    if(rm){ D2.confirm = rm.dataset.d2rm; refresh(); return; }
    if(e.target.closest('[data-d2rmno]')){ D2.confirm = null; refresh(); return; }
    const yes = e.target.closest('[data-d2rmyes]');
    if(yes){ const x = D2.entries && D2.entries.get(yes.dataset.d2rmyes); if(x) removeAg(x.net, x.id); return; }
    const rs = e.target.closest('[data-d2restore]');
    if(rs){ const x = D2.entries && D2.entries.get(rs.dataset.d2restore); if(x) restoreAg(x.net); return; }
    if(e.target.closest('[data-d2undo]')){ const u = D2.lastRemoved; hideToast(); if(u) restoreAg(u.n, u.mem); return; }
    if(e.target.closest('[data-d2showrm]')){ D2.showRemoved = !D2.showRemoved; D2.hidMod = false; D2.sel = -1; D2.listTop = 0; D2.keepTop = true; refresh(); return; }
    /* 1.2.177: Hidden Agencies › Hidden Models at the end of the agency list (Admin) */
    /* 1.2.211 (user: "I'm not able to see the names of the hidden agencies"): the search box and the filters were still on
       (e.g. "ANGER" + Europe), so the list said none matched - Hidden Agencies always lists all of them */
    if(e.target.closest('[data-d2hidag]')){ try{ const q = $('#d2q'); if(q && q.value){ q.value = ''; q.dispatchEvent(new Event('input', {bubbles: true})); } clearAll(); }catch(err){} D2.showRemoved = true; D2.hidMod = false; D2.sel = -1; D2.listTop = 0; D2.keepTop = true; refresh(); return; }
    if(e.target.closest('[data-d2hidmod]')){ D2.hidMod = true; D2.showRemoved = false; D2.sel = -1; D2.keepTop = true; refresh(); return; }
    if(e.target.closest('[data-d2hidback]')){ D2.hidMod = false; D2.showRemoved = false; D2.sel = -1; D2.listTop = 0; D2.keepTop = true; refresh(); return; }
    const ms0 = e.target.closest('[data-d2mshow]');
    if(ms0){ const k = ms0.dataset.d2mshow, rec = (typeof MDEL !== 'undefined' && MDEL.get(k)) || {}; ms0.disabled = true;
      mdelSet(k, {nm: rec.nm || '', ag: rec.ag || '', co: rec.co || '', href: rec.href || k}, false).then(ok => { if(ok) toast('<b>' + esc(rec.nm || 'She') + '</b> is showing again.'); else ms0.disabled = false; refresh(); }); return; }
    const hb0 = e.target.closest('[data-d2hideag]');
    if(hb0){ const x = D2.entries && D2.entries.get(hb0.dataset.d2hideag); if(!x) return;
      illumDialog({title: 'Hide ' + x.a.name + '?', ok: 'Hide agency', cancel: 'Cancel',
        body: '<p>Its ' + dirN(x.n) + ' models stop showing in the Directory, on the boards and in search for everyone.</p><p class="idlgnote">Nothing is deleted - lamps, notes and bookings are kept. Show it again from Hidden Agencies at the end of the agency list.</p>'})
        .then(ok => { if(ok) removeAg(x.net, x.id); }); return; }
    const sb = e.target.closest('[data-d2sub]');
    if(sb){ D2.sub = sb.dataset.d2sub || ''; D2.subTerm = ((($('#q') || {}).value) || '').trim().toLowerCase(); try{ localStorage.setItem('illu.d2sub', D2.sub); }catch(err){} D2.sel = -1; D2.listTop = 0; D2.keepTop = true; refresh(); return; }
    const fd = e.target.closest('[data-d2fold]');
    if(fd){ const r0 = fd.dataset.d2fold; if(D2.fold.has(r0)) D2.fold.delete(r0); else D2.fold.add(r0);
      try{ localStorage.setItem('illu.d2fold', JSON.stringify([...D2.fold])); }catch(err){}
      D2.keepTop = false; refresh(); return; }
    const st = e.target.closest('[data-d2start]');
    if(st){ pick('region', st.dataset.d2start); closePop(); return; }
    if(e.target.closest('[data-d2showall]')){ D2.showAll = true; refresh(); return; }
    if(e.target.closest('[data-d2more]')){ D2.shown += 200; refresh(); return; }
    const hb = e.target.closest('[data-d2heart]');
    if(hb){ const x = D2.entries && D2.entries.get(D2.sel); if(x && window.ATLFAV) ATLFAV.toggle(x.net.domain); refresh(); return; }
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && CMPB() && D2.open){ e.preventDefault(); if(SL.full) slFull(false); else closeCard(); return; } });
  /* 1.2.103: a card opened on Compare boards opens right there, over the boards (user, 7 Nov 2026):
     the same card as the Directory's - ⤢ for the full view, the dark x to put it back */
  window.__illuCardOpen = m => {
    if(!m || !m.key) return;
    const host = document.getElementById('pane-cmpb'); if(!host) return;
    host.querySelectorAll('.d2solo').forEach(x => x.remove());
    if(SL.full){ SL.full = false; SL.auto = ''; document.body.classList.remove('d2fullcard'); }
    D2.solo = m; D2.open = m.key; D2.openM = m; D2.cardPos = null;
    const box = document.createElement('div'); box.className = 'd2body d2solo';
    box.innerHTML = '<div class="d2veil" data-d2close aria-hidden="true"></div>' +
      '<div class="d2card cs-' + (D2.cardStyle || 'x') + '" role="dialog" aria-label="' + esc(m.nm) + '" title="Drag to move">' +
      '<div class="d2grip" aria-hidden="true"><i></i></div>' +
      '<button type="button" class="d2x" data-d2close aria-label="Close the card" title="Close (Esc)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg><span>Close</span></button>' + modelCard(m) +
      (m.boards && m.boards.length ? '<div class="d2on"><b>' + (m.boards.length > 1 ? 'On ' + m.boards.length + ' boards' : 'Board') + '</b>' + m.boards.map(b => '<span>' + esc(b.d || 'Board') + '</span>').join('') + '</div>' : '') + '</div>';
    host.appendChild(box);
    document.body.classList.add('d2carding');
    const C = box.querySelector('.d2card'); placeCard(C); cardEnter(C);
  };
  window.__illuCardClose = () => closeCard();
  /* leaving Compare boards with a card open: put it away at once */
  window.__illuCardReset = () => { if(SL.full){ SL.full = false; SL.auto = ''; document.body.classList.remove('d2fullcard'); }
    D2.open = ''; D2.closing = false; D2.cardPos = null; D2.shownKey = ''; D2.solo = null;
    document.body.classList.remove('d2carding', 'd2closing', 'd2opening'); document.querySelectorAll('#pane-cmpb .d2solo').forEach(x => x.remove()); };
  document.addEventListener('click', e => { if(!CMPB() || !D2.open || !e.target.closest) return;
    if(e.target.closest('#pane-cmpb [data-d2close]')){ e.preventDefault(); closeCard(); } });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !CMPB() && (VIEW === 'dir' || (VIEW === 'arr' && (D2.open || RC.full)))){
    const p = $('#d2pop');
    if(D2.open && SL.full){ slFull(false); } else if(D2.open){ closeCard(); } else if(D2.bfull && VIEW === 'dir'){ setBoardFull(false); } else if(RC.full && VIEW === 'arr'){ RC.full = false; document.body.classList.remove('rcfull'); recoRender(); } else if(D2.bopen){ D2.bopen = false; refresh(); } else if(p && !p.hidden) closePop(); else if(D2.max) setMax(false); } });
  /* the sidebar's filters changing outside the bar (Reset, another tab) */
  document.addEventListener('change', e => { if(e.target.matches && e.target.matches('input[data-f], input[data-m]')) setTimeout(() => syncBar(), 0); });


  /* ================= Recommendations (replaces the Updates board, user 2026-11-04) =================
     Up to 50 models from the whole Directory: women 167-179 cm, men 183-191 cm (measured height).
     Each ID goes through the list in its own random order, so different people cover different
     models. Refresh = the next 18 this ID has not been shown. When the list is used up it starts over
     in a new random order. Models the Directory gains in the meantime come first. What each ID has
     been shown is kept in recs/p-<id> (short fingerprints, not the addresses). Same grid and card as
     the Directory. */
  const RB = {F: [167, 179], M: [183, 191]}, RN = 50;
  const RC = {pool: null, pv: '', st: null, shown: [], loading: false, busy: false};
  /* 1.2.140 phone: how many cards in a row (1 or 2), remembered on this phone */
  function rcPer(){ if(!RC.per){ let v = 2; try{ v = +(localStorage.getItem('illu.rcper') || 2); }catch(e){} RC.per = v === 1 ? 1 : 2; } return RC.per; }
  /* the Both / New faces / Development list closes on a tap anywhere else */
  document.addEventListener('click', e => { if(RC.ddOpen && !(e.target.closest && e.target.closest('.rcdd'))){ RC.ddOpen = false; setTimeout(() => { if(VIEW === 'arr') recoRender(); }, 0); } }, true);
  /* 1.2.140 phone: the search and filter box above Suggestiones opens and closes (closed to start with) */
  function fbTog(){
    const fb = document.getElementById('fbar'); if(!fb) return;
    let t = fb.querySelector(':scope > .fbtog');
    if(!t){ t = document.createElement('button'); t.type = 'button'; t.className = 'fbtog'; fb.insertBefore(t, fb.firstChild);
      t.addEventListener('click', () => { const on = !fb.classList.contains('fbopen'); fb.classList.toggle('fbopen', on); t.setAttribute('aria-expanded', String(on)); paint(); }); }
    function paint(){ const c = document.getElementById('count'), n = c ? c.textContent.trim() : '', on = fb.classList.contains('fbopen');
      const q = document.getElementById('q'), act = (q && q.value.trim()) || fb.querySelector('.fbf.on, .fbf[aria-pressed="true"], .fbchip');
      const h = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg><b>Search &amp; filters</b>' + (n ? '<span>· ' + esc(n) + '</span>' : '') + (act ? '<i>on</i>' : '') + '<em></em><svg class="fbch" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (on ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6') + '"/></svg>';
      if(t.__h !== h){ t.__h = h; t.innerHTML = h; } t.setAttribute('aria-expanded', String(on)); }
    paint(); fbTog.paint = paint;
  }
  setInterval(() => { if(document.body.dataset.view === 'arr' && PHONE()){ if(!document.querySelector('#fbar > .fbtog')) fbTog(); else if(fbTog.paint) fbTog.paint(); } }, 700);
  { const st = document.createElement('style'); st.textContent = `
#fbar > .fbtog{display:none}
@media (max-width:760px), (pointer:coarse) and (max-width:1024px){
  body[data-view="arr"] #fbar > .fbtog{display:flex;align-items:center;gap:8px;width:100%;height:46px;border:0;background:none;padding:0 4px;font:500 14px var(--sans,Inter,system-ui,sans-serif);color:var(--ink,#211C26);cursor:pointer;text-align:left}
  body[data-view="arr"] #fbar > .fbtog svg{width:18px;height:18px;fill:none;stroke:var(--acc,#5A2C57);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}
  body[data-view="arr"] #fbar > .fbtog .fbch{stroke:var(--ink,#211C26)}
  body[data-view="arr"] #fbar > .fbtog b{font-weight:500}
  body[data-view="arr"] #fbar > .fbtog span{color:var(--mut,#6D6577);font-size:13px;white-space:nowrap}
  body[data-view="arr"] #fbar > .fbtog i{font-style:normal;font-size:11px;font-weight:700;color:var(--acc,#5A2C57);background:var(--accbg,#F3ECF3);border-radius:999px;padding:2px 7px}
  body[data-view="arr"] #fbar > .fbtog em{flex:1}
  body[data-view="arr"] #fbar:not(.fbopen) > :not(.fbtog){display:none!important}
  body[data-view="arr"] #fbar:not(.fbopen){padding-top:2px!important;padding-bottom:2px!important}
  #pane-arr.rcphone .rchd{padding-top:10px!important;padding-bottom:8px!important;gap:8px}
  #pane-arr.rcphone .rchd > div{display:flex;flex-direction:column;gap:10px;width:100%;min-width:0}
  #pane-arr.rcphone .rchd > .illufs, #pane-arr.rcphone .rchd > .rcbtn{display:none!important}
  #pane-arr .rcph{display:flex;align-items:center;gap:5px;position:relative;z-index:6}
  #pane-arr .rcph .rcsp{flex:1}
  #pane-arr .rcphb{width:40px;height:40px;flex:none;border:1px solid var(--line,#E7E2EC);border-radius:14px;background:var(--surf,#fff);display:grid;place-items:center;cursor:pointer;color:var(--ink,#211C26);padding:0}
  #pane-arr .rcphb svg,#pane-arr .rcper svg,#pane-arr .rcddb svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
  #pane-arr .rcper{display:flex;height:40px;box-sizing:border-box;border:1px solid var(--line,#E7E2EC);border-radius:14px;padding:3px;gap:2px;flex:none;background:var(--surf,#fff)}
  #pane-arr .rcper button{width:30px;border:0;border-radius:10px;background:none;color:var(--mut,#6D6577);display:grid;place-items:center;cursor:pointer;padding:0}
  #pane-arr .rcper button[aria-pressed="true"]{background:var(--acc,#5A2C57);color:#fff}
  #pane-arr .rcdd{position:relative;flex:none}
  #pane-arr .rcddb{height:40px;border-radius:14px;border:1px solid #D9CCDC;background:var(--surf,#fff);padding:0 9px;display:flex;align-items:center;gap:4px;font:600 13.5px var(--sans,Inter,system-ui,sans-serif);color:var(--acc,#5A2C57);cursor:pointer;white-space:nowrap}
  #pane-arr .rcddb[aria-expanded="true"]{border-color:var(--acc,#5A2C57);background:var(--accbg,#F3ECF3)}
  #pane-arr .rcddl{position:absolute;right:0;top:46px;min-width:140px;background:var(--surf,#fff);border:1px solid var(--line,#E7E2EC);border-radius:12px;box-shadow:0 14px 34px rgba(20,10,30,.18);padding:4px;display:flex;flex-direction:column;gap:2px;z-index:30}
  #pane-arr .rcddl button{border:0;background:none;border-radius:8px;padding:10px 12px;font:500 14px var(--sans,Inter,system-ui,sans-serif);color:var(--ink,#211C26);text-align:left;cursor:pointer;white-space:nowrap}
  #pane-arr .rcddl button[aria-selected="true"]{background:var(--acc,#5A2C57);color:#fff;font-weight:600}
  #pane-arr .rcph .rcbtn{height:40px;flex:none;padding:0 12px;white-space:nowrap;box-shadow:none}
  #pane-arr .rcph .rcclr{height:40px;margin-left:6px;padding:0 10px;font-size:12px}
  #pane-arr .rcph .rcclr.ask > span{display:none}
  #pane-arr.rcper2 .rc2grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
  #pane-arr.rcper1 .rc2grid{grid-template-columns:minmax(0,1fr)!important;gap:12px!important}
  /* full screen on the phone: only the cards and the row of buttons */
  body.rcfull #fbar, body.rcfull #appbar, body.rcfull #illubnav, body.rcfull .bnav{display:none!important}
}`; document.head.appendChild(st); }
  const fp = k => { let h = 2166136261; for(let i = 0; i < k.length; i++){ h ^= k.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const rkey = (seed, k) => { let h = 2166136261; const t = seed + '|' + k; for(let i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function recoPool2(){
    nets();
    const v2 = NETV + '|' + (typeof MEAS !== 'undefined' ? MEAS.size : 0) + '|' + (typeof EDITS !== 'undefined' ? EDITS.size : 0);
    if(RC.pool && RC.pv === v2) return RC.pool;
    const out = [], seen = new Set();
    for(const n of NETS){
      if(netRemoved(n)) continue;
      const bs = n.boards.filter(b => b.g === 'F' || b.g === 'M'); if(!bs.length) continue;
      const o = n.offices[0] || {};
      const a = {name: n.name, city: o.city || '', country: o.country || '', domain: n.domain};
      for(const m of modelsOf(a, bs)){
        if(seen.has(m.key)) continue;
        const r = measRec(m.key); const ht = r && +r[0];
        const band = RB[m.g]; if(!band || !ht || ht < band[0] || ht > band[1]) continue;
        try{ if(isMinor(m.key)) continue; }catch(e){}
        /* only models with a name and a photograph of them */
        if(!m.nm || m.nm === '(unnamed)') continue;
        const ph = (typeof PICS !== 'undefined' && PICS.get && PICS.get(m.key)) || (r && r[6]) || '';
        if(!ph || STANDIN.test(String(ph).split('?')[0])) continue;
        m.ph0 = String(ph).split('?')[0];
        seen.add(m.key); m.fp = fp(m.key); out.push(m);
      }
    }
    /* the same picture on three or more models is the agency's stand-in (a logo), not a photo */
    const uses = new Map(); for(const m of out) uses.set(m.ph0, (uses.get(m.ph0) || 0) + 1);
    for(let i = out.length - 1; i >= 0; i--) if(uses.get(out[i].ph0) >= 3) out.splice(i, 1);
    RC.pool = out; RC.pv = v2;
    return out;
  }
  async function recoLoadState(){
    if(RC.st) return RC.st;
    let d = null;
    try{ if(DB && ME) d = docOf(await DB.doc('recs/p-' + ME).get()); }catch(e){}
    const sp = x => new Set(String(x || '').split(',').filter(Boolean));
    RC.st = {round: (d && +d.round) || 1, seen: sp(d && d.seen), known: sp(d && d.known), shown: (d && Array.isArray(d.shown)) ? d.shown : [], hist: (d && Array.isArray(d.hist)) ? d.hist.filter(Array.isArray) : [], fresh: !d,
      /* 1.2.149: New faces & Development picks, newest last (fingerprints), and every model this person's list already knew */
      nfh: (d && Array.isArray(d.nfh)) ? d.nfh.map(x => String(x || '').split(',').filter(Boolean)).filter(x => x.length) : [], nfk: sp(d && d.nfk)};
    return RC.st;
  }
  /* one write at a time, and always the newest state (quick Refresh clicks must not land out of order) */
  let rcSaving = false, rcAgain = false;
  async function recoSave(){
    const st = RC.st; if(!st || !DB || !ME || !(typeof SIGNED === 'function' && SIGNED())) return;
    if(rcSaving){ rcAgain = true; return; }
    rcSaving = true;
    try{ do{ rcAgain = false;
      try{ await DB.doc('recs/p-' + ME).set({round: st.round, seen: [...st.seen].join(','), known: [...st.known].join(','), shown: (RC.sets && RC.sets.length ? RC.sets[RC.sets.length - 1] : RC.shown.map(m => m.key)), hist: RC.sets || [], nfh: (st.nfh || []).map(x => x.join(',')), nfk: [...(st.nfk || [])].join(','), at: new Date().toISOString()}); }catch(e){}
    }while(rcAgain); }finally{ rcSaving = false; }
  }
  /* Filters on Suggestiones (user, 2026-11-05: "apply a filter on the top bar when we go to the
     Suggestiones page"): the same top-bar filters as the other pages - search, sex, region, board
     tier, lamp, measurements - narrow which models are suggested. The set on screen shows the ones
     that pass, topped up from the models that pass and this ID has not seen yet. */
  function recoSig(){
    /* 1.2.147 (user, 12 Nov 2026: "I requested height 170-175cm but it doesn't seem to be filtering"): the bounds were only
       read from the Measurements boxes when the Directory redrew, so on Suggestiones a new height did nothing */
    try{ if(typeof readBounds === 'function') readBounds(); }catch(e){}
    const term = ((($('#q') || {}).value) || '').trim().toLowerCase();
    const byMeas = !!(typeof BND !== 'undefined' && BND && BND.any) && (typeof measState === 'undefined' || measState === 'ready');
    return {term, regions: checked('region'), countries: checked('country'), tiers: checked('tier'), sexes: checked('sex'), marks: checked('mark'), byMeas,
      key: [term, checked('region'), checked('country'), checked('tier'), checked('sex'), checked('mark'), byMeas ? JSON.stringify([BND.ht, BND.bu, BND.wa, BND.hp, BND.sh]) : ''].join('|')};
  }
  window.__illuRecoSig = () => { try{ const f = recoSig(); return {term: f.term, regions: f.regions, tiers: f.tiers, sexes: f.sexes, marks: f.marks, byMeas: f.byMeas, ht: typeof BND !== 'undefined' && BND ? BND.ht : null, tab: RC.tab, sub: RC.nfSub}; }catch(e){ return null; } };
  function recoOk(m, f){
    if(f.sexes.length && !f.sexes.includes(m.g)) return false;
    if(f.tiers.length && !f.tiers.includes(m.t || (m.b && m.b.t) || '')) return false;
    if(f.regions.length){ const o = (m.b && m.b.off) || {}; const rg = o.region || ''; if(!f.regions.includes(rg)) return false; }
    if(f.countries && f.countries.length){ const o = (m.b && m.b.off) || {}; const ct = o.country || m.country || 'Unknown'; if(!f.countries.includes(ct)) return false; }
    if(f.marks.length && !f.marks.includes(lampOf(m.key) || '')) return false;
    if(f.byMeas && !fits(m.key)) return false;
    if(f.term && !(m.nm + ' ' + m.ag + ' ' + m.city + ' ' + m.country).toLowerCase().includes(f.term)) return false;
    return true;
  }
  const recoActive = f => !!(f.term || f.regions.length || (f.countries && f.countries.length) || f.tiers.length || f.sexes.length || f.marks.length || f.byMeas);
  /* the next 18 for this ID */
  function recoNext(want){
    const RNW = want || RN;
    const f0 = recoSig();
    const pool = recoActive(f0) ? recoPool2().filter(m => recoOk(m, f0)) : recoPool2(), st = RC.st; if(!st) return [];
    if(!st.known.size) pool.forEach(m => st.known.add(m.fp));
    const seed = String(ME || 'anyone') + ':' + st.round;
    const pick = [], taken = new Set();
    const take = m => { pick.push(m); taken.add(m.fp); st.seen.add(m.fp); };
    /* new in the Directory since this round began: these first (in this ID's own random order) */
    pool.filter(m => !st.known.has(m.fp) && !st.seen.has(m.fp)).sort((p, q) => rkey(seed, p.key) - rkey(seed, q.key)).forEach(m => { if(pick.length < RNW){ take(m); st.known.add(m.fp); } });
    let order = pool.slice().sort((p, q) => rkey(seed, p.key) - rkey(seed, q.key));
    for(const m of order){ if(pick.length >= RNW) break; if(!st.seen.has(m.fp)) take(m); }
    if(pick.length < RNW && pool.length > pick.length){
      /* everyone has been shown: start over, in a new order */
      st.round++; st.seen = new Set(pick.map(m => m.fp)); st.known = new Set(pool.map(m => m.fp));
      const seed2 = String(ME || 'anyone') + ':' + st.round;
      order = pool.slice().sort((p, q) => rkey(seed2, p.key) - rkey(seed2, q.key));
      for(const m of order){ if(pick.length >= RNW) break; if(!taken.has(m.fp)) take(m); }
      RC.restarted = true;
    }
    return pick;
  }
  async function recoInit(){
    if(RC.loading) return; RC.loading = true;
    try{
      await recoLoadState();
      const pool = recoPool2(), by = new Map(pool.map(m => [m.key, m]));
      RC.shown = RC.st.shown.map(k => by.get(k)).filter(Boolean);
      if(!RC.shown.length && pool.length){ RC.shown = recoNext(); recoSave(); }
      else if(RC.shown.length < RN && pool.length > RC.shown.length){ RC.shown = RC.shown.concat(recoNext(RN - RC.shown.length)); recoSave(); }   // the page now shows more at a time
      /* earlier sets, to go back to (user, 2026-11-05: "a back button in case I missed a model from the first set") */
      const keys = RC.shown.map(m => m.key);
      RC.sets = RC.st.hist.length ? RC.st.hist.slice(-RCSETS) : [];
      if(!RC.sets.length || RC.sets[RC.sets.length - 1].join('|') !== keys.join('|')) RC.sets.push(keys);
      RC.sets = RC.sets.slice(-RCSETS); RC.at = RC.sets.length - 1;
    }finally{ RC.loading = false; }
    if(VIEW === 'arr') recoRender();
  }
  function recoRefresh(){
    if(!RC.st) return;
    RC.restarted = false; D2.open = ''; D2.cardPos = null;
    /* 1.2.219 (user, 17 Nov 2026: "I'm seeing a lot of the same models after selecting New picks"): with filters on, the
       models added to fill the set (RC.fx) were kept from one New picks to the next - they are dropped, and the new set is
       only models this person has not been shown */
    RC.fkey = ''; RC.fx = [];
    RC.shown = recoNext();
    RC.sets = (RC.sets || []).concat([RC.shown.map(m => m.key)]).slice(-RCSETS); RC.at = RC.sets.length - 1;
    recoSave();
    recoRender();
    const G = $('.d2body'); if(G) G.scrollTop = 0;
  }
  /* Back / Next through the sets already shown (nothing new is picked, nothing is marked again) */
  const RCSETS = 30;
  function recoStep(d){
    if(!RC.sets || !RC.sets.length) return;
    const at = Math.max(0, Math.min(RC.sets.length - 1, (RC.at == null ? RC.sets.length - 1 : RC.at) + d));
    if(at === RC.at) return;
    const by = new Map(recoPool2().map(m => [m.key, m]));
    RC.at = at; D2.open = ''; D2.cardPos = null; RC.restarted = false;
    RC.shown = RC.sets[at].map(k => by.get(k)).filter(Boolean);
    recoRender();
    const G = $('.d2body'); if(G) G.scrollTop = 0;
  }
  window.__illuRecoStep = recoStep;
  let rcFT = 0;
  const rcFilt = e => { const t = e.target; if(!t || !t.matches) return; if(typeof VIEW === 'undefined' || VIEW !== 'arr') return;
    if(!t.matches('#q, input[data-f], .fgroup input, #fbar input, #fbar select')) return;
    clearTimeout(rcFT); rcFT = setTimeout(() => { if(VIEW === 'arr') recoRender(); }, 120); };
  document.addEventListener('input', rcFilt, true); document.addEventListener('change', rcFilt, true);
  document.addEventListener('click', e => { if(e.target && e.target.closest && e.target.closest('#reset, .fbreset, [data-d2clear]') && typeof VIEW !== 'undefined' && VIEW === 'arr'){ clearTimeout(rcFT); rcFT = setTimeout(() => { if(VIEW === 'arr') recoRender(); }, 150); } }, true);
  /* ===== Suggestiones, New design (user approved 2026-11-06: "let's go with your design") =====
     Three lists under one header: For you (the existing rounds), Korean market (the program's own
     KFIT bands and scoring, 9 at a time) and New faces & Development (models on those boards).
     Cards are all the same size: photo, name, agency, measurements, and Yes / Maybe / No lamps. */
  try{ RC.tab = localStorage.getItem('illu.rctab') || 'you'; RC.nfSub = localStorage.getItem('illu.rcnfsub') || 'both'; }catch(e){ RC.tab = 'you'; RC.nfSub = 'both'; }
  /* 1.2.117 (user, 9 Nov 2026): the Korean market list is gone from Suggestiones - anyone left on it goes to For you */
  if(!['you', 'nf'].includes(RC.tab)) RC.tab = 'you';
  RC.nfN = 60; RC.nfPg = 0; RC.nfSeed = 1; RC.krSeen = new Set(); RC.krCur = null; RC.krKey = '';
  const NFT = ['newfaces', 'development'];
  function nfPool(){
    nets();
    const v = NETV + '|' + (typeof MEAS !== 'undefined' ? MEAS.size : 0) + '|' + (typeof PICS !== 'undefined' && PICS.size || 0);
    if(RC.nfp && RC.nfv === v) return RC.nfp;
    const out = [], seen = new Set();
    for(const n of NETS){
      if(netRemoved(n)) continue;
      const bs = n.boards.filter(b => NFT.includes(b.t)); if(!bs.length) continue;
      const o = n.offices[0] || {};
      const a = {name: n.name, city: o.city || '', country: o.country || '', domain: n.domain};
      for(const m of modelsOf(a, bs)){
        if(seen.has(m.key)) continue;
        try{ if(isMinor(m.key)) continue; }catch(e){}
        if(!m.nm || m.nm === '(unnamed)') continue;
        const r = measRec(m.key);
        const ph = (typeof PICS !== 'undefined' && PICS.get && PICS.get(m.key)) || (r && r[6]) || '';
        if(!ph || STANDIN.test(String(ph).split('?')[0])) continue;   /* no empty cards */
        seen.add(m.key); out.push(m);
      }
    }
    RC.nfp = out; RC.nfv = v;
    return out;
  }
  /* 1.2.149 (user, 12 Nov 2026): "have the oldest picks/page move further back on the page list. The newest picks should
     show first. The refresh button is to show newer models or models the user hasn't seen yet" - the list is this
     person's picks, newest first (each New picks is 60 more, models new to the Directory first, then ones not shown yet),
     and after them everyone not picked yet. Clear history starts again from nothing. */
  function nfOrder(){
    const all = nfPool(), st = RC.st;
    const seed = String(ME || 'anyone') + ':nf:' + RC.nfSeed;
    const rest = all.slice().sort((p, q) => rkey(seed, p.key) - rkey(seed, q.key));
    if(!st || !st.nfh || !st.nfh.length) return rest;
    const byFp = new Map(all.map(m => [m.fp || (m.fp = fp(m.key)), m]));
    const out = [], took = new Set();
    for(let i = st.nfh.length - 1; i >= 0; i--) for(const f of st.nfh[i]){ const m = byFp.get(f); if(m && !took.has(f)){ took.add(f); out.push(m); } }
    for(const m of rest) if(!took.has(m.fp)) out.push(m);
    return out;
  }
  function nfList(fs){
    return nfOrder().filter(m => (RC.nfSub === 'both' || m.t === RC.nfSub) && (!recoActive(fs) || recoOk(m, fs)));
  }
  function nfDraw(){
    const st = RC.st; if(!st) return 0;
    const fs = recoSig(), all = nfPool();
    all.forEach(m => { if(!m.fp) m.fp = fp(m.key); });
    const had = new Set(); (st.nfh || []).forEach(pg => pg.forEach(f => had.add(f)));
    const ok = m => !had.has(m.fp) && (RC.nfSub === 'both' || m.t === RC.nfSub) && (!recoActive(fs) || recoOk(m, fs));
    const seed = String(ME || 'anyone') + ':nf:' + ((st.nfh || []).length + 1);
    const cand = all.filter(ok).sort((p, q) => rkey(seed, p.key) - rkey(seed, q.key));
    const fresh = st.nfk && st.nfk.size ? cand.filter(m => !st.nfk.has(m.fp)) : [];
    const fs2 = new Set(fresh.map(m => m.fp));
    const pick = fresh.concat(cand.filter(m => !fs2.has(m.fp))).slice(0, 60).map(m => m.fp);
    if(!pick.length) return 0;
    st.nfh = (st.nfh || []).concat([pick]).slice(-40);
    st.nfk = new Set(all.map(m => m.fp));
    recoSave();
    return pick.length;
  }
  function recoClearHistory(){
    const st = RC.st; if(!st) return;
    st.nfh = []; st.nfk = new Set(); RC.nfGot = null; st.seen = new Set(); st.known = new Set(); st.hist = []; st.round = (st.round || 1) + 1;
    RC.sets = []; RC.fx = []; RC.fkey = ''; RC.nfPg = 0; RC.clearAsk = false; D2.open = '';
    RC.shown = recoNext();
    RC.sets = [RC.shown.map(m => m.key)]; RC.at = 0;
    nfDraw();
    recoSave(); recoRender();
    const G = $('.d2body'); if(G) G.scrollTop = 0;
  }
  function krPool(){
    nets();
    const v = NETV + '|' + (typeof MEAS !== 'undefined' ? MEAS.size : 0) + '|' + (typeof EDITS !== 'undefined' ? EDITS.size : 0);
    if(RC.krp && RC.krv === v) return RC.krp;
    const out = [], seen = new Set();
    for(const n of NETS){
      if(netRemoved(n)) continue;
      const bs = n.boards.filter(b => b.g === 'F' || b.g === 'M'); if(!bs.length) continue;
      const o = n.offices[0] || {};
      const a = {name: n.name, city: o.city || '', country: o.country || '', domain: n.domain};
      for(const m of modelsOf(a, bs)){
        if(seen.has(m.key)) continue;
        const r = measRec(m.key); if(!r || !(+r[0])) continue;
        try{ if(isMinor(m.key)) continue; }catch(e){}
        if(!m.nm || m.nm === '(unnamed)') continue;
        const ph = (typeof PICS !== 'undefined' && PICS.get && PICS.get(m.key)) || r[6] || '';
        if(!ph || STANDIN.test(String(ph).split('?')[0])) continue;
        seen.add(m.key); out.push(m);
      }
    }
    RC.krp = out; RC.krv = v;
    return out;
  }
  const KB = () => (typeof KFIT !== 'undefined' ? KFIT : {F: {ht: [167, 178], bu: [78, 86], wa: [56, 62], hp: [86, 92]}, M: {ht: [183, 191], bu: [86, 96], wa: [70, 78], hp: [88, 96]}});
  window.__illuPicks = {nf: () => nfPool(), kr: () => krPool(), score: m => krScore(m)};
  function krScore(m){
    const r = measRec(m.key); if(!r) return null;
    const band = KB()[m.g === 'M' ? 'M' : 'F'];
    const bs = (v, lo, hi) => { if(v == null || v === '' || isNaN(+v)) return null; v = +v; const mid = (lo + hi) / 2, half = (hi - lo) / 2; const d = Math.abs(v - mid) / half; if(d <= 1) return 1 - d * 0.5; if(d <= 1.6) return 0.5 * (1.6 - d) / 0.6; return 0; };
    const parts = [[bs(r[0], band.ht[0], band.ht[1]), 3], [bs(r[1], band.bu[0], band.bu[1]), 1], [bs(r[2], band.wa[0], band.wa[1]), 1], [bs(r[3], band.hp[0], band.hp[1]), 1]];
    let sum = 0, wt = 0, have = 0; for(const [sc, w] of parts){ if(sc === null) continue; sum += sc * w; wt += w; have++; }
    if(!wt || !sum) return null;
    return (sum / wt) * (0.72 + 0.28 * have / 4);
  }
  function krList(fs){
    if(RC.krCur && RC.krKey === fs.key){ const by = new Map(krPool().map(m => [m.key, m])); return RC.krCur.map(k => by.get(k)).filter(Boolean); }
    const busy = k => { try{ return !!lampOf(k) || (typeof inBooking === 'function' && inBooking(k)); }catch(e){ return false; } };
    const pick = krPool().filter(m => !RC.krSeen.has(m.key) && !busy(m.key) && (!recoActive(fs) || recoOk(m, fs)))
      .map(m => ({m, s: krScore(m)})).filter(x => x.s != null).sort((a, b) => b.s - a.s || a.m.nm.localeCompare(b.m.nm)).slice(0, 9).map(x => x.m);
    RC.krCur = pick.map(m => m.key); RC.krKey = fs.key;
    return pick;
  }
  const n1 = v => (v == null || v === '' || isNaN(+v)) ? null : Math.round(+v * 10) / 10;
  /* ===== The one card (user chose "B · Photo first", 6 Nov 2026) =====
     Used on Suggestiones, the Directory, Compare boards and Today. The photo fills the card;
     name, agency · city and the measurements (one line: height · bust/waist/hips · shoe) sit
     on a shade at the bottom of the photo; the board and the three lamps sit in a fixed footer,
     so nothing moves whatever the figures are. The photo still opens the model's card. */
  const isKo = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const TIERL = {main: ['Main board', '메인 보드'], newfaces: ['New face', '뉴 페이스'], development: ['Development', '디벨롭먼트'], direct: ['Direct', '다이렉트'], commercial: ['Commercial', '커머셜']};
  /* 1.2.147 (user, 12 Nov 2026: "why are the photos not appearing on the cards?" - My / Member Favorites on the PC):
     cards drawn for the vote and favourites boards kept the agency's own address in the photo, and the PC program
     refuses a picture asked straight from another site - only the program's photo cache (illuimg://) may fetch it.
     Every card photo on the PC now goes through the cache, whichever board draws the card. */
  const viaCache = (html, key, href) => {
    if(window.__noVia || !(window.illu && window.illu.modelPhotos && !window.illu.web)) return html;
    return html.replace(/<img class="agimg"([^>]*?) src="(https?:[^"]+)"/, (all, pre, src) => {
      const raw = src.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const ref = href || (/^https?:/i.test(String(key)) ? key : '');
      return '<img class="agimg"' + pre + ' data-orig="' + esc(raw) + '" src="' + esc('illuimg://p/' + encodeURIComponent(raw) + (ref ? '?r=' + encodeURIComponent(ref) : '')) + '"';
    });
  };
  /* 1.2.208 (user, 16 Nov 2026: "it all looks very different" - demo "Card Status Footer", option A): every status on a card
     is the same pill on the right of the footer - the initial of the person in charge, then the status in its colour
     (green approved / booked, orange booking, red cancelled). While the vote is open the Go / Pass buttons and the count
     stay (those are pressed) and nothing else is added. A decided vote that went on to booking is one pill:
     "(P) Booking ✓ 4-1". On a narrow card the words Approved / Cancelled drop and the score stays. */
  function footJoin(lm, wkFoot, wk){
    if(/class="ivl /.test(lm)) return lm;                                           // vote open: its own buttons only
    const r = lm.match(/<span class="ivres (appr|cxl)"[^>]*>[\s\S]*?<b>([^<]*)<\/b><\/span>/);
    if(!r && !wk) return lm + wkFoot;
    const face = (wkFoot.match(/<span class="wkavs">[\s\S]*?<\/span>/) || [''])[0];      // the initials are <i> discs inside
    const who = wk ? wkWho(wk.who) : '';
    const ko = isKo();
    let cls, body, tip;
    if(r && (!wk || wk.src !== 'book')){
      const ok = r[1] === 'appr';
      cls = ok ? 'ok' : 'bad';
      body = (ok ? '✓' : '✕') + '<span class="wd"> ' + (ok ? (ko ? '승인' : 'Approved') : (ko ? '취소' : 'Cancelled')) + '</span> <b>' + esc(r[2]) + '</b>';
      tip = (ok ? 'Approved ' : 'Cancelled ') + r[2] + (who ? ' · ' + who : '');
    }else{
      const lab = String(wk.lab || '');
      const canc = /Cancelled|취소/.test(lab), done = !wk.live && !canc;
      cls = canc ? 'bad' : done ? 'ok' : 'or';
      let txt = done ? lab.replace(/^Booked · /, 'Booked ').replace(/^부킹 완료 · /, '부킹 완료 ') : canc ? (ko ? '부킹 취소' : 'Booking cancelled') : (ko ? '부킹' : 'Booking');
      if(wk.src === 'vote' && !r) txt = lab.replace(/^Vote · /, '').replace(/^투표 · /, '');
      body = esc(txt) + (r && r[1] === 'appr' ? ' <b>✓ ' + esc(r[2]) + '</b>' : r ? ' <b>✕ ' + esc(r[2]) + '</b>' : '');
      const stage = wk.live ? lab.replace(/^Booking · |^부킹 · /, '').replace(/^Booking$|^부킹$/, '') : '';
      tip = (r ? (r[1] === 'appr' ? 'Approved ' : 'Cancelled ') + r[2] + ' → ' : '') + lab + (who ? ' · ' + who : '');
      if(stage) body += '<span class="wd2"> · ' + esc(stage) + '</span>';
    }
    /* 1.2.250 (user, 18 Nov 2026: "this is also overlapping" - "Send to Team Vote" under the "(P) Booking" pill): with a status
       pill on the footer the Send to Team Vote button is left out (it stays on her opened card, under Status) */
    lm = lm.replace(/<button type="button" class="ivsend"[\s\S]*?<\/button>/, '');
    return (r ? lm.replace(r[0], '') : lm) + '<span class="ucst ' + cls + '" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">' + face + '<span class="tx">' + body + '</span></span>';
  }
  /* 1.2.220 (user, 17 Nov 2026: "I want to know somehow that this is the Mother Agency for this model"): a card at her
     mother agency says so on the photo, above her name - whichever of her cards the mother agency was chosen on */
  function momTag(m){
    let on = false;
    try{ const f = window.__illuMotherInfo; if(f && m.ag) on = (m.keys && m.keys.length ? m.keys : [m.key]).some(x => { const r = f(x, m.ag); return !!(r && r.here); }); }catch(e){}   /* 1.2.231: the one resolver */
    return on ? '<span class="ucmomt">' + (isKo() ? '마더 에이전시' : 'Mother agency') + '</span>' : '';
  }
  function ucard(m, o){
    o = o || {};
    /* 1.2.211: a hidden model's card is never drawn on a board (Hidden Models draws its own cards) */
    try{ if(!o.showHidden && window.__illuIsHidden && window.__illuIsHidden(m)) return ''; }catch(e){}
    const f = litFacts(m), minor = isMinor(m.key);
    const pc = viaCache(picCell(m.key, m.nm, minor ? '' : f.photo), m.key, m.href).replace('<img class="agimg"', '<img class="agimg" loading="lazy" decoding="async"').replace(' fetchpriority="high"', '');
    const band = o.kor ? KB()[m.g === 'M' ? 'M' : 'F'] : null;
    const ht = n1(f.ht), bu = n1(f.bu), wa = n1(f.wa), hp = n1(f.hp), eu = n1(f.eu);
    /* 1.2.130: the top bar's units (cm / in, one shoe size); the band check still reads centimetres */
    const UL = (v, h) => { try{ return v == null ? null : (window.__illuLen ? window.__illuLen(v, h) : v); }catch(e){ return v; } };
    const shoeT = (() => { try{ return window.__illuShoe ? window.__illuShoe(f.eu, f.us, m.g) : eu; }catch(e){ return eu; } })(), shoeU = (() => { try{ return window.__illuShoeUnit ? window.__illuShoeUnit() : 'EU'; }catch(e){ return 'EU'; } })();
    const fg = (v, r) => '<span' + (band && r && v != null && v >= r[0] && v <= r[1] ? ' class="in"' : '') + '>' + (v == null ? '–' : v) + '</span>';
    const fgU = (v, r, h) => fg(v, r).replace(/>([^<]*)<\/span>$/, (x, t) => '>' + (v == null ? '–' : UL(v, h)) + '</span>');
    const mx = ht == null && bu == null && wa == null && hp == null
      ? '<span class="ucmx none">' + (isKo() ? '사이즈 없음' : 'No measurements') + '</span>'
      : '<span class="ucmx">' + fgU(ht, band && band.ht, 1) + '<i>·</i>' + fgU(bu, band && band.bu) + '<i>/</i>' + fgU(wa, band && band.wa) + '<i>/</i>' + fgU(hp, band && band.hp) + '<i>·</i><span>' + (shoeT == null ? '–' : shoeT) + '<small>' + shoeU + '</small></span></span>';
    /* 1.2.228: her mother agency, when one is set, is the agency the card names */
    let agM = m.ag || ''; try{ const mo = window.__illuMotherInfo && window.__illuMotherInfo(m.key, m.ag); if(mo) agM = mo.ag; }catch(e){}   /* 1.2.231: the one resolver */
    const meta = agM + (m.city && agM === (m.ag || '') ? ' · ' + m.city : '');
    const tl = TIERL[m.t] || null;
    const offices = m.boards ? new Set(m.boards.map(b => b.off)).size : 1;
    /* 1.2.170 (user, 13 Nov 2026, approved demo "A + C, 2 - shades of purple"): a liked model whose booking is in progress
       has a slowly moving purple ring and an "In booking · who" label - on the Directory, Suggestiones and every board */
    /* 1.2.172 (user: "let's get rid of the frame/border around the card when booking, it's too messy. let's revert
       back to the previous style"): the purple In-booking ring (1.2.170) is off; the cards look as before */
    const bk = null;
    /* 1.2.194: the corner tag on a model the team has worked on (Directory roster) */
    const wk = o.wk || null;
    /* 1.2.199 (user, 15 Nov 2026, demo "Smaller ways to show worked on" - "let's go with C"): nothing on the photo (it covered the
       Team Vote date + clock); the status sits on the line under the photo, next to the heart, in short words ("Vote 5/6",
       "Booked Nov"). When her vote buttons are on that line it is only the person's circle and the dot - the buttons and 5/6
       already tell the vote; pointing at it gives the whole status. */
    let wkTag = '', wkFoot = '';
    if(wk){
      let vOpen = wk.src === 'vote' && wk.live; try{ for(const k of [m.key, wk.k]){ const vs = k && window.__illuVoteState ? window.__illuVoteState(k) : ''; if(vs === 'open' || vs === 'tie') vOpen = true; } }catch(e){}
      const short = String(wk.lab || '').replace(/^Team Vote · (\d+) of (\d+)$/, 'Vote $1/$2').replace(/^Booked · /, 'Booked ').replace(/^Booking · Cancelled$/, 'Booking cancelled').replace(/^Vote · /, 'Vote ').replace(/^Booking · /, '');
      const tip = esc(wk.lab + (wkWho(wk.who) ? ' · ' + wkWho(wk.who) : ''));
      wkFoot = '<span class="ucwks ' + (wk.live ? 'l' : 'd') + (vOpen ? ' only' : '') + '" title="' + tip + '" aria-label="' + tip + '">' + wkFaces([wk], 1) + '<i></i>' + (vOpen ? '' : '<b>' + esc(short) + '</b>') + '</span>';
    }
    /* 1.2.219: a model MDI signed before (full name on a past contract with this agency) has the gold corner ribbon */
    const mdi = o.mdi != null ? !!o.mdi : mdiModel(m);
    return '<article class="uc' + (mdi ? ' ucmdi' : '') + (bk ? ' ucbk' : '') + (wk ? ' ucw-' + (wk.live ? 'l' : 'd') + (wk.src === 'vote' ? ' ucw-v' : '') : '') + '" data-uck="' + esc(m.key) + '">' + wkTag +
      (bk ? '<span class="ucbkt" title="' + esc((isKo() ? '부킹 진행 중 · ' : 'In booking · ') + bk.who + (bk.st ? ' · ' + bk.st : '')) + '">' + (isKo() ? '부킹 중 · ' : 'In booking · ') + esc(bk.who) + '</span>' : '') +
      (mdi ? '<span class="ucmdir" title="Signed with MDI before (past contract)">MDI</span>' : '') + '<div class="ucimg"><div class="d2t ucph" data-d2k="' + esc(m.key) + '" title="' + esc(m.nm) + '">' + pc + '</div>' +
      (minor || !/^https?:/i.test(m.href || '') ? '' : '<button type="button" class="ucarr l" data-ucarr="-1" aria-label="Previous photo">‹</button><button type="button" class="ucarr r" data-ucarr="1" aria-label="Next photo">›</button><span class="uccnt" aria-live="polite"></span>') +
      '<div class="ucov">' + momTag(m) + (() => { try{ const v = window.__illuAvailOf && window.__illuAvailOf(m.key); return v ? '<span class="ucav ' + esc(v.t) + '" title="' + esc(v.why || '') + '">' + (v.t === 'later' ? '⏳ ' : '⛔ ') + esc(window.__illuAvailLabel(v, true)) + '</span>' : ''; }catch(e){ return ''; } })() + ''/* 1.2.189 (user, 14 Nov 2026: "let's just completely get rid of this"): no "NAME · booking" label on cards */ + '<b>' + esc(m.nm) + '</b><span class="ucag">' + esc(meta) + '</span>' + mx + '</div>' +
      (offices > 1 ? '<span class="ucbadge">' + offices + (isKo() ? '개 오피스' : ' offices') + '</span>' : '') + '</div>' +
      '<div class="ucft' + (wkFoot ? ' haswk' : '') + '"><em>' + esc(tl ? (isKo() ? tl[1] : tl[0]) : (m.div || '')) + '</em>' + footJoin(lamps(m.key, m.nm, meta, m.href), wkFoot, wk) + '</div></article>';
  }
  window.__illuCard = (m, o) => ucard(m, o);
  /* 1.2.149 (user, 12 Nov 2026, approved demo "Browse her photos right on the card"): ‹ › on every model card go
     through her slideshow photos without opening the card; a click anywhere else on the photo still opens it - on the
     photo being looked at. ← → do the same while the mouse is over a card. Photos are read once per model
     (window.illu.modelPhotos, the same as the card's slideshow) and the card remembers where it was while it is redrawn. */
  const TS = new Map();   /* key -> {list:[url], i, state} */
  document.addEventListener('illu-phide', () => TS.clear());   /* 1.2.174: a photo hidden as "not her" leaves the card slideshows too */
  window.__illuTileIdx = k => { const t = TS.get(k); return t && t.list && t.i > 0 ? t.list[t.i] : ''; };
  const ucTileOf = el => el && el.closest && el.closest('.uc');
  const ucTileKey = u => u.dataset.uck || u.dataset.ivk || ((u.querySelector('[data-d2k]') || {}).dataset || {}).d2k || '';
  function ucTileHref(u, k){ try{ const i = typeof keyInfo === 'function' ? keyInfo(k) : null; if(i && i.href) return i.href; }catch(e){} return /^https?:/i.test(k) ? k : ''; }
  function ucTilePaint(u){
    const k = ucTileKey(u), t = TS.get(k); if(!t) return;
    const im = u.querySelector('.ucph img.ivmat') || u.querySelector('.ucph img'), cnt = u.querySelector('.uccnt');
    const n = t.list ? t.list.length : 0;
    if(cnt){ cnt.textContent = t.state === 'loading' ? '…' : n > 1 ? (t.i + 1) + ' / ' + n : t.state === 'none' ? '1 / 1' : ''; cnt.classList.toggle('on', !!cnt.textContent); }
    u.classList.toggle('ucfirst', !t.i); u.classList.toggle('uclast', !!n && t.i >= n - 1);
    if(!im || !n) return;
    if(!im.dataset.ucorig) im.dataset.ucorig = im.getAttribute('src') || '';
    const want = t.i ? (/^\/_blob\//.test(t.list[t.i]) ? t.list[t.i] : slImg(t.list[t.i], 900)) : im.dataset.ucorig;
    if(im.getAttribute('src') !== want){
      if(t.i && !im.dataset.orig0) im.dataset.orig0 = im.dataset.orig || '';
      im.dataset.orig = t.i ? t.list[t.i] : (im.dataset.orig0 || im.dataset.orig || '');
      im.src = want;
      const c = im.closest('.litpic'); if(c){ c.classList.remove('imgfail'); if(im.complete && im.naturalWidth > 1) c.classList.add('gotimg'); }
    }
  }
  async function ucTileStep(u, d){
    const k = ucTileKey(u); if(!k) return;
    let t = TS.get(k);
    if(!t){
      const im = u.querySelector('.ucph img.ivmat') || u.querySelector('.ucph img');
      const first = im ? (im.dataset.orig || im.currentSrc || im.src || '') : '';
      t = {list: first ? [first] : [], i: 0, state: 'loading'}; TS.set(k, t); ucTilePaint(u);
      const href = ucTileHref(u, k);
      try{
        if(!(window.illu && window.illu.modelPhotos) || !href) throw 0;
        const r = await window.illu.modelPhotos(href);
        const mk = fileKey(first);
        const fk = first ? samePic(first) : '';
        const more = onePerPic(((r && r.photos) || []).map(x => x.url || x).filter(Boolean)).filter(x => (!mk || fileKey(x) !== mk) && (!fk || samePic(x) !== fk));
        t.list = (first ? [first] : []).concat(more); t.state = t.list.length > 1 ? 'ok' : 'none';
      }catch(e){ t.state = 'none'; }
      document.querySelectorAll('.uc').forEach(x => { if(ucTileKey(x) === k) ucTilePaint(x); });
    }
    if(t.state === 'loading' || !t.list || t.list.length < 2){ ucTilePaint(u); return; }
    t.i = Math.max(0, Math.min(t.list.length - 1, t.i + d));
    document.querySelectorAll('.uc').forEach(x => { if(ucTileKey(x) === k) ucTilePaint(x); });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-ucarr]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    const u = ucTileOf(b); if(u) ucTileStep(u, +b.dataset.ucarr);
  }, true);
  /* nothing behind the arrows reacts to a press on them (a drag, the card's own photo handlers) */
  ['pointerdown', 'mousedown', 'dblclick'].forEach(ev => document.addEventListener(ev, e => { if(e.target.closest && e.target.closest('[data-ucarr]')) e.stopPropagation(); }, true));
  let ucHoverTile = null;
  document.addEventListener('mouseover', e => { ucHoverTile = ucTileOf(e.target); }, true);
  document.addEventListener('keydown', e => {
    if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if(!ucHoverTile || !ucHoverTile.isConnected || !ucHoverTile.matches(':hover')) return;
    const a = document.activeElement; if(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || (a && a.isContentEditable)) return;
    const fvw = document.getElementById('illufv'); if($('.d2card') || (fvw && !fvw.hidden)) return;
    if(!ucHoverTile.querySelector('[data-ucarr]')) return;
    e.preventDefault(); ucTileStep(ucHoverTile, e.key === 'ArrowLeft' ? -1 : 1);
  });
  { const st = document.createElement('style'); st.textContent = `
.uc .ucarr{position:absolute;top:42%;transform:translateY(-50%);z-index:6;width:34px;height:34px;border-radius:50%;border:0;padding:0 0 2px;background:rgba(255,255,255,.94);color:#211C26;font:700 20px/1 var(--sans,Inter,system-ui,sans-serif);display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.28);opacity:0;transition:opacity .15s,background .15s}
.uc .ucarr.l{left:8px}.uc .ucarr.r{right:8px}
.uc .ucarr:hover{background:#fff}
.uc .ucimg:hover .ucarr{opacity:1}
.uc.ucfirst .ucarr.l,.uc.uclast .ucarr.r{opacity:0!important;pointer-events:none}
.uc .uccnt{position:absolute;right:8px;top:8px;z-index:6;background:rgba(15,10,20,.62);color:#fff;border-radius:999px;padding:2px 8px;font:600 11px var(--sans,Inter,system-ui,sans-serif);display:none;pointer-events:none}
.uc .uccnt.on{display:block}
.ivcw .uc .uccnt{top:auto;bottom:40px;right:10px}
  #pane-arr .rcclr{height:38px;flex:none;padding:0 14px;border-radius:999px;border:1px solid var(--line,#E7E2EC);background:var(--surf,#fff);color:var(--ink2,#5b5263);font:600 13px var(--sans,Inter,system-ui,sans-serif);white-space:nowrap;cursor:pointer;margin-left:8px;align-self:center}
  #pane-arr .rcclr:hover{border-color:#C9475F;color:#B02F48}
  #pane-arr .rcclr.ask{display:inline-flex;align-items:center;gap:8px;cursor:default;border-color:#E9B9C3;background:#FFF5F7;color:#7A2335;padding:0 6px 0 12px}
  #pane-arr .rcclr.ask button{height:28px;border-radius:999px;padding:0 12px;font:600 12.5px var(--sans,Inter,system-ui,sans-serif);cursor:pointer;border:1px solid transparent}
  #pane-arr .rcclr .rcclry{background:#B02F48;color:#fff}
  #pane-arr .rcclr .rcclrn{background:transparent;border-color:#E9B9C3;color:#7A2335}
@media (pointer:coarse){.uc .ucarr{opacity:.85;width:30px;height:30px;font-size:18px}}`; document.head.appendChild(st); }
  /* a redrawn card keeps the photo it was on */
  setInterval(() => { if(!TS.size) return; document.querySelectorAll('.uc').forEach(u => { const t = TS.get(ucTileKey(u)); if(t && (t.i || t.state !== 'ok')) ucTilePaint(u); }); }, 600);
  let ucFitT = 0;
  const ucFitAll = () => { ucFitT = 0; document.querySelectorAll('.uc .ucmx:not(.tight):not(.none)').forEach(e => { if(e.scrollWidth > e.clientWidth + 1) e.classList.add('tight'); }); };
  try{ new MutationObserver(() => { if(!ucFitT) ucFitT = requestAnimationFrame(ucFitAll); }).observe(document.body, {childList: true, subtree: true}); }catch(e){}
  addEventListener('resize', () => { document.querySelectorAll('.uc .ucmx.tight').forEach(e => e.classList.remove('tight')); ucFitAll(); });
  /* the card's words (board, no measurements) follow the language switch */
  try{ new MutationObserver(() => { try{ if(VIEW === 'arr') recoRender(); else if(VIEW === 'dir') refresh(); }catch(e){} }).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']}); }catch(e){}
  function tile2(m, kor){ return ucard(m, {kor}); }
  window.__illuRecoRender = () => { try{ if(VIEW === 'arr') recoRender(); }catch(e){} };
  function tile2Old(m, kor){
    const f = litFacts(m), minor = isMinor(m.key);
    const pc = picCell(m.key, m.nm, minor ? '' : f.photo).replace('<img class="agimg"', '<img class="agimg" loading="lazy" decoding="async"').replace(' fetchpriority="high"', '');
    const band = KB()[m.g === 'M' ? 'M' : 'F'];
    const inb = (v, r) => v != null && v >= r[0] && v <= r[1] ? ' class="in"' : '';
    const fig = (lab, v, r) => v == null ? '' : '<span' + (kor && r ? inb(v, r) : '') + '>' + (lab ? lab + ' ' : '') + v + '</span>';
    const ht = n1(f.ht), bu = n1(f.bu), wa = n1(f.wa), hp = n1(f.hp), eu = n1(f.eu);
    const tierB = m.t === 'newfaces' ? '<span class="rc2tb">New face</span>' : m.t === 'development' ? '<span class="rc2tb dev">Development</span>' : '';
    const meta = m.ag + (m.city ? ' · ' + m.city : '');
    return '<article class="rc2c">' +
      '<div class="d2t rc2ph" data-d2k="' + esc(m.key) + '" title="Open ' + esc(m.nm) + '">' + pc + tierB + '</div>' +
      '<div class="rc2in"><b class="rc2n">' + esc(m.nm) + '</b><span class="rc2a">' + esc(meta) + '</span>' +
      '<span class="rc2m">' + (ht == null ? '<span>height not given</span>' : fig('', ht, band.ht) + fig('B', bu, band.bu) + fig('W', wa, band.wa) + fig('H', hp, band.hp) + (eu == null ? '' : '<span>' + eu + ' EU</span>')) + '</span>' +
      lamps(m.key, m.nm, meta, m.href) + '</div></article>';
  }
  function recoRender(){
    const pane = document.getElementById('pane-arr'); if(!pane) return;
    const ready = typeof measState === 'undefined' || measState === 'ready' || measState === 'off';
    if(typeof measState !== 'undefined' && measState === 'idle') try{ loadMeas(); }catch(e){}
    if(!RC.st && !RC.loading && ready) recoInit();
    const pool = ready ? recoPool2() : [];
    const st = RC.st;
    const seenN = st ? pool.filter(m => st.seen.has(m.fp)).length : 0;
    const F = pool.filter(m => m.g === 'F').length, M = pool.length - F;
    const fs = recoSig(), fon = recoActive(fs);
    const sub = 'Women ' + RB.F[0] + '–' + RB.F[1] + ' cm · men ' + RB.M[0] + '–' + RB.M[1] + ' cm · picked at random from the whole Directory';
    const prog = !ready ? 'Reading the measurements…' : !pool.length ? 'No measured model in these heights yet' :
      (pool.length.toLocaleString() + ' models fit (' + F.toLocaleString() + ' women, ' + M.toLocaleString() + ' men)' + (fon ? ' · ' + pool.filter(m => recoOk(m, fs)).length.toLocaleString() + ' match your filters' : '') + ' · ' + seenN.toLocaleString() + ' shown to you this round' + (st && st.round > 1 ? ' (round ' + st.round + ')' : '') + (RC.restarted ? ' · you have seen everyone, so it started over' : ''));
    let ms = ready ? RC.shown : [];
    if(ready && fon){
      ms = ms.filter(m => recoOk(m, fs));
      /* filters changed: the set is topped up with models that pass (once per change of filters);
         the set itself is not changed, so taking the filters off shows it as it was */
      if(RC.st && RC.fkey !== fs.key){
        RC.fkey = fs.key;
        RC.fx = ms.length < RN ? recoNext(RN - ms.length).filter(m => !ms.some(x => x.key === m.key)) : [];
        if(RC.fx.length) recoSave();
      }
      ms = ms.concat((RC.fx || []).filter(m => recoOk(m, fs) && !ms.some(x => x.key === m.key)));
    } else { RC.fkey = ''; RC.fx = []; }
    /* 1.2.211 (user, 16 Nov 2026: "I hid the card and the card still shows"): a hidden model leaves this board too - she is
       under Directory › Hidden › Hidden Models */
    const hidM = m => { try{ return !!(window.__illuIsHidden && window.__illuIsHidden(m)); }catch(e){ return false; } };
    ms = ms.filter(m => !hidM(m));
    const tab = RC.tab;
    let list = ms, strip = [], nfAll = [];
    if(ready && tab === 'kor') list = krList(fs);
    if(ready && RC.st && !(RC.st.nfh || []).length && nfPool().length) nfDraw();
    if(ready) nfAll = nfList(fs);
    /* 1.2.108 (user, 8 Nov 2026): pages of 60 instead of "Show more" growing the list downward */
    nfAll = nfAll.filter(m => !hidM(m));
    /* 1.2.219 (user, 17 Nov 2026: "I want the picks to be new ones I haven't seen"): page 1 is only the newest New picks -
       models not shown to this person before; when fewer are left than a page, only those, never older ones mixed in */
    const lastD = new Set(((RC.st && RC.st.nfh) || []).slice(-1)[0] || []);
    const nfNew = lastD.size ? nfAll.filter(m => lastD.has(m.fp)) : [], nfOld = lastD.size ? nfAll.filter(m => !lastD.has(m.fp)) : nfAll;
    const pgOf = i => !nfNew.length ? nfOld.slice(i * 60, i * 60 + 60) : i === 0 ? nfNew : nfOld.slice((i - 1) * 60, i * 60);
    const nfPages = Math.max(1, (nfNew.length ? 1 : 0) + Math.ceil(nfOld.length / 60)); if(RC.nfPg >= nfPages) RC.nfPg = nfPages - 1; if(!(RC.nfPg >= 0)) RC.nfPg = 0;
    if(tab === 'nf') list = pgOf(RC.nfPg).filter(m => !hidM(m));
    if(tab === 'you') strip = nfAll.slice(0, 12);
    const every = list.concat(strip.filter(m => !list.some(x => x.key === m.key)));
    RC.disp = list;
    if(D2.open && !every.some(m => m.key === D2.open)) D2.open = '';
    let pop = '';
    if(D2.open){
      const m = every.find(x => x.key === D2.open);
      D2.openM = m;
      pop = '<div class="d2veil" data-d2close aria-hidden="true"></div>' +
        '<div class="d2card cs-' + (D2.cardStyle || 'x') + '" role="dialog" aria-label="' + esc(m.nm) + '" title="Drag to move">' +
        '<div class="d2grip" aria-hidden="true"><i></i></div>' +
        '<button type="button" class="d2x" data-d2close aria-label="Close the card" title="Close (Esc)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg><span>Close</span></button>' + modelCard(m) +
        (m.boards && m.boards.length ? '<div class="d2on"><b>' + (m.boards.length > 1 ? 'On ' + m.boards.length + ' boards' : 'Board') + '</b>' + m.boards.map(b => '<span>' + esc(b.d || 'Board') + '</span>').join('') + '</div>' : '') + '</div>';
    }
    const body = !ready || RC.loading && !ms.length ? '<div class="d2empty"><p>' + (ready ? 'Choosing…' : 'Reading the measurements…') + '</p></div>'
      : !ms.length && fon ? '<div class="d2empty"><p>No suggested model matches these filters. Change or reset the filters.</p></div>'
      : !ms.length ? '<div class="d2empty"><p>No model in these heights has measurements yet.</p></div>'
      : '<div class="rc2grid">' + ms.map(m => tile2(m)).join('') + '</div>';
    const nfN = nfAll.length, nfF = nfAll.filter(m => m.t === 'newfaces').length;
    /* 1.2.140 (phone, the user's approved demo, 11 Nov 2026): no heading or description; one row - full screen, 1 / 2 cards
       in a row, then Both / New faces / Development as a list that opens downward, right beside New picks */
    const PH = PHONE();
    const subSeg = '<div class="rc2seg" role="group" aria-label="Board type">' + [['both', 'Both'], ['newfaces', 'New faces'], ['development', 'Development']].map(([k, l]) => '<button type="button" data-rcnf="' + k + '" aria-pressed="' + (RC.nfSub === k) + '">' + l + '</button>').join('') + '</div>';
    const body2 = !ready ? body
      : tab === 'kor' ? (list.length ? '<p class="rc2note">The best 9 by the Korean-market bands (women ' + KB().F.ht.join('–') + ' cm, men ' + KB().M.ht.join('–') + ' cm, plus bust, waist and hips). Green figures are inside the band. New picks shows the next 9.</p><div class="rc2grid">' + list.map(m => tile2(m, true)).join('') + '</div>' : '<div class="d2empty"><p>Nothing left to suggest for the Korean market under these filters. Change the filters, or press New picks to start again from the top.</p></div>')
      : tab === 'nf' ? (PH ? '' : '<div class="rc2bar"><span class="rc2note">' + nfN.toLocaleString() + ' models with a photo on New face and Development boards' + (fon ? ' match your filters' : '') + ' · your newest picks first · under 18s are never shown</span></div>') +
          (RC.nfGot === 0 ? '<p class="rcall">You have now seen all ' + nfN.toLocaleString() + ' models that match' + (fon ? ' these filters' : '') + ' — no new ones to pick. Change the filters, or press Clear history to start again.</p>'
            : RC.nfGot > 0 && RC.nfGot < 60 && RC.nfPg === 0 ? '<p class="rcall">Only ' + RC.nfGot + ' model' + (RC.nfGot === 1 ? '' : 's') + ' you have not seen yet' + (fon ? ' with these filters' : '') + ' — here they are. Older picks are on the next pages.</p>' : '') +
          (list.length ? '<div class="rc2grid">' + list.map(m => tile2(m)).join('') + '</div>' + (nfPages > 1 ? '<nav class="rc2pg" aria-label="Pages"><button type="button" class="rcnb" data-rcpg="' + (RC.nfPg - 1) + '"' + (RC.nfPg ? '' : ' disabled') + '>‹ Previous</button><span>Page <b>' + (RC.nfPg + 1).toLocaleString() + '</b> of ' + nfPages.toLocaleString() + ' · ' + (RC.nfPg * 60 + 1).toLocaleString() + '–' + (RC.nfPg * 60 + list.length).toLocaleString() + ' of ' + nfN.toLocaleString() + '</span><button type="button" class="rcnb" data-rcpg="' + (RC.nfPg + 1) + '"' + (RC.nfPg < nfPages - 1 ? '' : ' disabled') + '>Next page ›</button></nav>' : '') : '<div class="d2empty"><p>No model on these boards matches your filters.</p></div>')
      : body + (strip.length ? '<section class="rc2nf" aria-label="From New face and Development boards"><div class="rc2bar"><div><b>From New face &amp; Development boards</b><span class="rc2note">' + nfN.toLocaleString() + ' models · ' + nfF.toLocaleString() + ' New face · ' + (nfN - nfF).toLocaleString() + ' Development</span></div>' + subSeg + '<button type="button" class="rcnb" data-rctab="nf">See all</button></div><div class="rc2strip">' + strip.map(m => tile2(m)).join('') + '</div></section>' : '');
    const G0 = $('.d2body'), gTop = G0 ? G0.scrollTop : 0;
    const tabs = '<div class="rc2seg rc2tabs" role="tablist" aria-label="Lists">' +
      [['you', 'For you', ready ? ms.length : ''], ['nf', 'New faces & Development', ready ? nfN.toLocaleString() : '']].map(([k, l, n]) =>
        '<button type="button" role="tab" data-rctab="' + k + '" aria-selected="' + (tab === k) + '">' + esc(l) + (n !== '' ? ' <s>' + n + '</s>' : '') + '</button>').join('') + '</div>';
    const sub2 = tab === 'you' ? sub : tab === 'kor' ? 'Measured models from the whole Directory that best fit the Korean-market bands' : 'Models on the agencies\' New face and Development boards';
    const NFL = {both: 'Both', newfaces: 'New faces', development: 'Development'};
    /* Both / New faces / Development: a list that opens and closes (phone row; on the PC beside the two tabs - user, 12 Nov 2026) */
    const ddH = (tab === 'nf' ? '<span class="rcdd"><button type="button" class="rcddb" data-rcdd aria-haspopup="listbox" aria-expanded="' + !!RC.ddOpen + '">' + (NFL[RC.nfSub] || 'Both') + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (RC.ddOpen ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6') + '"/></svg></button>' +
        (RC.ddOpen ? '<span class="rcddl" role="listbox" aria-label="Board type">' + Object.keys(NFL).map(k => '<button type="button" role="option" data-rcnf="' + k + '" aria-selected="' + (RC.nfSub === k) + '">' + NFL[k] + '</button>').join('') + '</span>' : '') + '</span>' : '');
    const clearH = !ready ? '' : RC.clearAsk
      ? '<span class="rcclr ask" role="group" aria-label="Clear history"><span>Clear all your picks and start fresh?</span><button type="button" class="rcclry" data-rcclear>Clear</button><button type="button" class="rcclrn" data-rcclearno>Cancel</button></span>'
      : '<button type="button" class="rcclr" data-rcclear title="Forget every pick shown to you (For you and New faces &amp; Development) and start fresh">Clear history</button>';
    const phRow = !PH ? '' : '<div class="rcph">' +
      '<button type="button" class="rcphb" data-rcfull aria-pressed="' + !!RC.full + '" aria-label="' + (RC.full ? 'Exit full screen' : 'Full screen') + '" title="' + (RC.full ? 'Exit full screen' : 'Full screen') + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + (RC.full ? '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>' : '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>') + '</svg></button>' +
      '<span class="rcper" role="group" aria-label="Cards in a row">' + [1, 2].map(n => '<button type="button" data-rcper="' + n + '" aria-pressed="' + (rcPer() === n) + '" aria-label="' + n + (n === 1 ? ' card' : ' cards') + ' in a row" title="' + n + (n === 1 ? ' card' : ' cards') + ' in a row"><svg viewBox="0 0 24 24" aria-hidden="true">' + (n === 1 ? '<rect x="5" y="4" width="14" height="16" rx="2"/>' : '<rect x="3" y="4" width="7.5" height="16" rx="1.5"/><rect x="13.5" y="4" width="7.5" height="16" rx="1.5"/>') + '</svg></button>').join('') + '</span>' +
      '<span class="rcsp"></span>' +
      ddH +
      '<button type="button" class="rcbtn" data-rcref' + (!ready || !pool.length ? ' disabled' : '') + '>New picks</button>' + clearH + '</div>';
    pane.classList.toggle('rcper1', PH && rcPer() === 1); pane.classList.toggle('rcper2', PH && rcPer() === 2); pane.classList.toggle('rcphone', PH);
    pane.innerHTML = '<div class="rcwrap"><div class="rchd"><div>' + (PH ? '' : '<h2>' + (isKo() ? '뉴페이스 & 디벨롭먼트' : 'New Face &amp; Development') + '</h2>') + (PH ? tabs : '<div class="rctabrow">' + tabs + ddH + '</div>') + (PH ? phRow : '<p>' + esc(sub2) + '</p>' + (tab === 'you' ? '<p class="rcprog">' + esc(prog) + '</p>' : '')) + (tab === 'you' && RC.restarted ? '<p class="rcall">You had seen every model that matches — this set starts a new round, in a new order.</p>' : '') + '</div>' +
      '<button type="button" class="illufs" data-rcfull aria-pressed="' + !!RC.full + '" title="' + (RC.full ? 'Exit full screen (Esc)' : 'Show New Face & Development on the whole screen') + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + (RC.full ? '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>' : '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>') + '</svg><span>' + (RC.full ? 'Exit full screen' : 'Full screen') + '</span></button>' +
      (tab === 'you' && RC.sets && RC.sets.length > 1 ? '<div class="rcnav" role="group" aria-label="Your picks, newest first">' +
        '<button type="button" class="rcnb" data-rcstep="1"' + (RC.at < RC.sets.length - 1 ? '' : ' disabled') + ' title="Newer picks"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span>Newer</span></button>' +
        '<span class="rcset">Page <b>' + (RC.sets.length - RC.at) + '</b> of ' + RC.sets.length + (RC.at === RC.sets.length - 1 ? ' · newest' : '') + '</span>' +
        '<button type="button" class="rcnb" data-rcstep="-1"' + (RC.at > 0 ? '' : ' disabled') + ' title="Older picks"><span>Older</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div>' : '') +
      '<button type="button" class="rcbtn" data-rcref' + (!ready || !pool.length ? ' disabled' : '') + ' title="' + (tab === 'kor' ? 'Show the next 9 for the Korean market' : tab === 'nf' ? 'Draw the New face and Development models in a new order' : 'Show ' + RN + ' models you have not been shown yet') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>New picks</button>' + clearH + '</div>' +
      '<div class="d2body rcbody">' + body2 + pop + '</div></div>';
    try{ if(typeof countEl !== 'undefined' && countEl) countEl.textContent = ms.length ? ms.length + (isKo() ? '명' : ' models') : ''; }catch(e){}
    const vn = document.getElementById('vn-arr'); if(vn) vn.textContent = '';
    rcFit();
    const G2 = $('.d2body'); if(G2){ G2.scrollTop = gTop; const C = G2.querySelector('.d2card');
      if(C){ placeCard(C); cardEnter(C); } else D2.shownKey = '';
      G2.classList.toggle('carding', !!C); document.body.classList.toggle('d2carding', !!C); const V = G2.querySelector('.d2veil'); if(V) V.style.height = G2.scrollHeight + 'px'; }
  }
  /* the board reaches down to the bottom of the window (scrolls inside), whatever the window's height */
  function rcFit(){ const w = document.querySelector('#pane-arr .rcwrap'); if(!w || RC.full) { if(w) w.style.height = ''; return; }
    const top = w.getBoundingClientRect().top + scrollY; w.style.height = Math.max(520, Math.round(innerHeight - top - 46)) + 'px'; }
  addEventListener('resize', () => { if(VIEW === 'arr') rcFit(); });
  /* 1.2.237 (phone): Back closes an agency opened in the Directory and returns to the list */
  window.__illuDirAgOpen = () => { try{ return VIEW === 'dir' && D2.sel !== -1 && D2.sel != null && !!document.querySelector('#pane-dir .d2panel') && !document.querySelector('#pane-dir .d2panel .d2blank'); }catch(e){ return false; } };
  window.__illuDirAgClose = () => { try{ D2.sel = -1; D2.bopen = false; refresh(); return true; }catch(e){ return false; } };
  window.__rcFull = on => { if(on === undefined) return !!RC.full; RC.full = !!on; document.body.classList.toggle('rcfull', RC.full); if(VIEW === 'arr') recoRender(); return RC.full; };
  window.__illuReco = () => ({pool: (RC.pool || []).length, shown: RC.shown.map(m => m.key), disp: (RC.disp || []).map(m => [m.key, m.g]), round: RC.st && RC.st.round, seen: RC.st ? RC.st.seen.size : 0, known: RC.st ? RC.st.known.size : 0, restarted: !!RC.restarted});
  window.__illuRecoRefresh = recoRefresh;
  document.addEventListener('keydown', e => { if(VIEW !== 'arr' || !e.altKey || D2.open) return; if(e.key === 'ArrowLeft'){ e.preventDefault(); recoStep(1); } else if(e.key === 'ArrowRight'){ e.preventDefault(); recoStep(-1); } });
  { const st = document.createElement('style'); st.textContent =
    '.rcnav{display:flex;align-items:center;gap:6px;margin-left:auto;margin-right:4px}.rchd .rcnav+.rcbtn{margin-left:0!important}.rchd>.rcnav{flex:none;min-width:auto}' +
    '.rcnb{display:inline-flex;align-items:center;gap:4px;height:34px;padding:0 13px;border-radius:999px;border:1px solid color-mix(in srgb,var(--acc,#6b2a63) 35%,var(--line,#ddd));background:var(--surf,#fff);color:var(--acc,#6b2a63);font:inherit;font-size:13px;font-weight:600;cursor:pointer}' +
    '.rcnb svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.rcnb:hover:not([disabled]){background:color-mix(in srgb,var(--acc,#6b2a63) 8%,var(--surf,#fff))}' +
    '.rcnb[disabled]{opacity:.38;cursor:default}' +
    '.rcset{font-size:12.5px;color:var(--mut);white-space:nowrap;font-variant-numeric:tabular-nums}.rcset b{color:var(--ink)}' +
    '.rc2seg{display:inline-flex;flex-wrap:wrap;gap:2px;padding:3px;border:1px solid var(--line,#e3dde8);border-radius:11px;background:var(--surf,#fff)}' +
    '.rc2seg button{border:0;background:none;min-height:34px;padding:0 12px;border-radius:8px;font:inherit;font-size:13px;font-weight:600;color:var(--mut);cursor:pointer}' +
    '.rc2seg button s{text-decoration:none;font-weight:500;opacity:.8;margin-left:3px;font-variant-numeric:tabular-nums}' +
    '.rc2seg button[aria-selected="true"],.rc2seg button[aria-pressed="true"]{background:var(--acc,#6b2a63);color:#fff}' +
    '.rchd .rc2tabs{margin:6px 0 4px}' +
    '.rchd .rctabrow{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:6px 0 4px}.rchd .rctabrow .rc2tabs{margin:0}' +
    '#pane-arr:not(.rcphone) .rcdd{position:relative;flex:none}' +
    '#pane-arr:not(.rcphone) .rcddb{height:42px;border-radius:11px;border:1px solid var(--line,#e3dde8);background:var(--surf,#fff);padding:0 12px;display:flex;align-items:center;gap:6px;font:600 13px var(--sans,Inter,system-ui,sans-serif);color:var(--acc,#5A2C57);cursor:pointer;white-space:nowrap}' +
    '#pane-arr:not(.rcphone) .rcddb[aria-expanded="true"]{border-color:var(--acc,#5A2C57);background:var(--accbg,#F3ECF3)}' +
    '#pane-arr:not(.rcphone) .rcddb svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}' +
    '#pane-arr:not(.rcphone) .rcddl{position:absolute;left:0;top:48px;min-width:160px;background:var(--surf,#fff);border:1px solid var(--line,#E7E2EC);border-radius:12px;box-shadow:0 14px 34px rgba(20,10,30,.18);padding:4px;display:flex;flex-direction:column;gap:2px;z-index:30}' +
    '#pane-arr:not(.rcphone) .rcddl button{border:0;background:none;border-radius:8px;padding:9px 12px;font:500 13.5px var(--sans,Inter,system-ui,sans-serif);color:var(--ink,#211C26);text-align:left;cursor:pointer;white-space:nowrap}' +
    '#pane-arr:not(.rcphone) .rcddl button:hover{background:var(--surf2,#F4F0F6)}#pane-arr:not(.rcphone) .rcddl button[aria-selected="true"]{background:var(--acc,#5A2C57);color:#fff;font-weight:600}' +
    '#pane-arr .rc2grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(calc(190px * var(--pz,1)),1fr));gap:16px;padding:4px 2px 12px}' +
    '#pane-arr .rc2c{background:var(--surf,#fff);border:1px solid var(--line,#e6e0ea);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;min-width:0}' +
    '#pane-arr .rc2c .rc2ph.d2t{border-radius:0;box-shadow:none;transform:none!important}' +
    '#pane-arr .rc2tb{position:absolute;left:8px;top:8px;z-index:2;border-radius:8px;padding:1px 7px;font-size:11px;font-weight:700;background:rgba(255,255,255,.93);color:#6b2a5e}#pane-arr .rc2tb.dev{color:#2f4f86}' +
    '#pane-arr .rc2in{padding:10px 12px 12px;display:flex;flex-direction:column;gap:5px;min-width:0}' +
    '#pane-arr .rc2n{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#pane-arr .rc2a{font-size:12.5px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#pane-arr .rc2m{display:flex;flex-wrap:wrap;gap:4px;font-size:11.5px;font-variant-numeric:tabular-nums}' +
    '#pane-arr .rc2m span{border-radius:5px;padding:0 5px;background:var(--surf2,#f1edf3);color:var(--ink)}#pane-arr .rc2m span.in{background:#e5f2e9;color:#24603a;font-weight:600}' +
    '#pane-arr .rc2c .mk{display:flex!important;gap:5px;margin:3px 0 0;width:auto;height:auto;position:static;transform:none}' +
    '#pane-arr .rc2c .mk i[data-v]{flex:1;min-width:0;height:34px;border-radius:9px;border:1px solid var(--line,#e3dde8);background:var(--surf,#fff)!important;box-shadow:none!important;display:flex;align-items:center;justify-content:center;gap:5px;font-style:normal;font-size:12px;font-weight:600;color:var(--ink);cursor:pointer;margin:0;padding:0 2px;opacity:1;filter:none;transform:none;position:relative;width:auto}' +
    '#pane-arr .rc2c .mk i[data-v]::before{content:"";width:9px;height:9px;border-radius:50%;flex:none;position:static;display:block;opacity:1;transform:none;box-shadow:none}' +
    '#pane-arr .rc2c .mk i[data-v]::after{position:static;display:inline;opacity:1;background:none;transform:none;width:auto;height:auto;border:0;box-shadow:none}' +
    '#pane-arr .rc2c .mk i[data-v="g"]::before{background:#2f7a4a}#pane-arr .rc2c .mk i[data-v="g"]::after{content:"Yes"}' +
    '#pane-arr .rc2c .mk i[data-v="y"]::before{background:#c98a00}#pane-arr .rc2c .mk i[data-v="y"]::after{content:"Maybe"}' +
    '#pane-arr .rc2c .mk i[data-v="r"]::before{background:#b3261e}#pane-arr .rc2c .mk i[data-v="r"]::after{content:"No"}' +
    '#pane-arr .rc2c .mk i[data-v="g"].on{background:#e5f2e9!important;border-color:#2f7a4a;color:#24603a}' +
    '#pane-arr .rc2c .mk i[data-v="y"].on{background:#fff3d6!important;border-color:#c98a00;color:#7a5200}' +
    '#pane-arr .rc2c .mk i[data-v="r"].on{background:#fbe7e5!important;border-color:#b3261e;color:#9c2018}' +
    '#pane-arr .rc2bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:2px 0 12px}#pane-arr .rc2bar>div{display:flex;flex-direction:column;margin-right:auto}' +
    '#pane-arr .rcall{margin:6px 0 10px;padding:8px 12px;border-radius:10px;background:#FFF6D6;color:#6B5200;font-size:12.5px;font-weight:500}' +
    '#pane-arr .rc2note{font-size:12.5px;color:var(--mut);margin:0 0 10px}#pane-arr .rc2bar .rc2note{margin:0}' +
    '#pane-arr .rc2nf{margin:18px 2px 8px;padding:14px;border:1px solid var(--line,#e6e0ea);border-radius:16px;background:var(--surf,#fff)}' +
    '#pane-arr .rc2strip{display:grid;grid-auto-flow:column;grid-auto-columns:190px;gap:14px;overflow-x:auto;padding-bottom:6px}' +
    '#pane-arr .rc2more{margin:6px auto 0;display:flex}' +
    '#pane-arr .rc2pg{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;margin:14px auto 4px;font-size:13px;color:var(--faint,#8a8090)}#pane-arr .rc2pg b{color:var(--ink)}#pane-arr .rc2pg .rcnb:disabled{opacity:.4;cursor:default}' +
    'html[lang="ko"] #pane-arr .rc2c .mk i[data-v="g"]::after{content:"예"}html[lang="ko"] #pane-arr .rc2c .mk i[data-v="y"]::after{content:"보류"}html[lang="ko"] #pane-arr .rc2c .mk i[data-v="r"]::after{content:"아니오"}';
    document.head.appendChild(st); }
  try{ renderArrivals = recoRender; }catch(e){}
  /* the Yes / Maybe / No under each card are the program's own lamps */
  document.addEventListener('click', e => { if(!e.target.closest || !e.target.closest('.uc .mk')) return; try{ markClick(e); }catch(er){} }, true);
  document.addEventListener('click', e => {
    if(VIEW !== 'arr' || !e.target.closest) return;
    const tb2 = e.target.closest('[data-rctab]'); if(tb2){ e.preventDefault(); RC.tab = tb2.dataset.rctab; try{ localStorage.setItem('illu.rctab', RC.tab); }catch(er){} D2.open = ''; recoRender(); const G = $('.d2body'); if(G) G.scrollTop = 0; return; }
    const nfb = e.target.closest('[data-rcnf]'); if(nfb){ e.preventDefault(); RC.ddOpen = false; RC.nfGot = null; RC.nfSub = nfb.dataset.rcnf; RC.nfN = 60; RC.nfPg = 0; try{ localStorage.setItem('illu.rcnfsub', RC.nfSub); }catch(er){} recoRender(); return; }
    if(e.target.closest('[data-rcmore]')){ e.preventDefault(); RC.nfN += 60; recoRender(); return; }
    const pg = e.target.closest('[data-rcpg]'); if(pg){ e.preventDefault(); if(pg.disabled) return; RC.nfPg = Math.max(0, +pg.dataset.rcpg || 0); recoRender(); const G = $('.d2body'); if(G) G.scrollTop = 0; const P = $('#pane-arr'); if(P && P.scrollIntoView) P.scrollIntoView({block: 'start'}); return; }
    if(e.target.closest('[data-rcref]')){ e.preventDefault();
      if(RC.tab === 'kor'){ (RC.krCur || []).forEach(k => RC.krSeen.add(k)); const before = RC.krCur; RC.krCur = null; const fs = recoSig(); const nx = krList(fs);
        if(!nx.length && before && before.length){ RC.krSeen = new Set(); RC.krCur = null; } recoRender(); const G = $('.d2body'); if(G) G.scrollTop = 0; return; }
      if(RC.tab === 'nf'){ const got = nfDraw(); RC.nfGot = got; if(!got) RC.nfSeed++; RC.nfN = 60; RC.nfPg = 0; recoRender(); const G = $('.d2body'); if(G) G.scrollTop = 0; return; }
      recoRefresh(); return; }
    if(e.target.closest('[data-rcclear]')){ e.preventDefault(); if(!RC.clearAsk){ RC.clearAsk = true; recoRender(); clearTimeout(RC.clearT); RC.clearT = setTimeout(() => { if(RC.clearAsk){ RC.clearAsk = false; if(VIEW === 'arr') recoRender(); } }, 8000); return; } recoClearHistory(); return; }
    if(e.target.closest('[data-rcclearno]')){ e.preventDefault(); RC.clearAsk = false; recoRender(); return; }
    const stp = e.target.closest('[data-rcstep]'); if(stp){ e.preventDefault(); if(!stp.disabled) recoStep(+stp.dataset.rcstep); return; }
    if(e.target.closest('[data-rcfull]')){ e.preventDefault(); RC.full = !RC.full; RC.ddOpen = false; document.body.classList.toggle('rcfull', RC.full); recoRender(); return; }
    const per = e.target.closest('[data-rcper]'); if(per){ e.preventDefault(); try{ localStorage.setItem('illu.rcper', per.dataset.rcper); }catch(er){} RC.per = +per.dataset.rcper; recoRender(); return; }
    if(e.target.closest('[data-rcdd]')){ e.preventDefault(); RC.ddOpen = !RC.ddOpen; recoRender(); return; }
    if(e.target.closest('[data-d2close]') || (e.target.classList && e.target.classList.contains('d2body') && D2.open)){ closeCard(); return; }
  });
  /* the tab's name */
  (function nameTab(){
    const b = document.getElementById('v-arr'); if(!b){ setTimeout(nameTab, 300); return; }
    const vn = b.querySelector('.vn');
    const ko = typeof LANG !== 'undefined' && LANG === 'ko';
    const nm = ko ? '뉴페이스 & 디벨롭먼트' : 'New Face & Development';   /* 1.2.210: was Suggestiones */
    b.firstChild && b.firstChild.nodeType === 3 ? (b.firstChild.textContent = nm) : b.insertBefore(document.createTextNode(nm), vn || null);
  })();
  /* scrolling the photos: hover effects pause until the scroll stops */
  (function(){ let t = 0; document.addEventListener('scroll', e => { const g = e.target; if(!g || !g.classList || !g.classList.contains('d2body')) return;
    if(!g.classList.contains('d2scrolling')) g.classList.add('d2scrolling'); clearTimeout(t); t = setTimeout(() => g.classList.remove('d2scrolling'), 160); }, true); })();
  const css = document.createElement('style');
  css.textContent = `
html body[data-view="dir"] .shell.shell,html body[data-view="dir"][data-railoff] .shell.shell{grid-template-columns:minmax(0,1fr)!important}
html body[data-view="dir"] .shell.shell>.side,html body[data-view="dir"] .shell.shell>.rail{display:none!important}
html body[data-view="dir"] .shell.shell>*{grid-column:1/-1}
body:not([data-view="dir"]) #d2bar{display:none}
#pane-dir .dirx{display:none}
#d2bar{position:relative;z-index:20;margin-top:12px;background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 1px 2px rgba(27,23,36,.05),0 10px 24px -18px rgba(27,23,36,.25)}
#d2bar .d2r1,#d2bar .d2r2{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#d2bar .d2sp{flex-grow:1}
#d2bar .d2q{display:flex;align-items:center;gap:8px;height:36px;width:280px;box-sizing:border-box;padding:0 12px;border-radius:9px;border:1px solid transparent;background:var(--surf2)}
#d2bar .d2q svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;opacity:.6}
#d2bar .d2q input{border:0;outline:0;flex-grow:1;font:inherit;font-size:13.5px;background:transparent;color:inherit;min-width:0}
#d2bar .d2f{display:inline-flex;align-items:center;gap:4px;height:36px;padding:0 12px;border-radius:9px;border:1px solid transparent;background:var(--surf2);color:inherit;font:inherit;font-size:12.5px;font-weight:500;cursor:pointer}
#d2bar .d2f svg{width:10px;height:10px;fill:none;stroke:currentColor;stroke-width:2.5}
#d2bar .d2f .d2fv{font-weight:400;opacity:.75}
#d2bar .d2f.on{border-color:color-mix(in srgb,var(--acc) 35%,transparent);background:var(--wash);color:var(--acc)}
#d2bar .d2sort{font-size:12.5px;display:flex;gap:6px;align-items:center}
#d2bar .d2sort select{height:34px;border-radius:9px;border:1px solid transparent;background:var(--surf2);color:inherit;font:inherit;font-size:12.5px;padding:0 8px}
#d2bar .d2ml{font-size:10.5px;letter-spacing:.08em;opacity:.7;margin-right:2px}
#d2bar .d2m{display:inline-flex;align-items:center;gap:4px;height:34px;padding:0 9px;border-radius:9px;border:1px solid transparent;background:var(--surf2)}
#d2bar .d2m.on{border-color:color-mix(in srgb,var(--acc) 35%,transparent);background:var(--wash)}
#d2bar .d2m b{font-size:10.5px;letter-spacing:.08em;opacity:.7}
#d2bar .d2m input{width:44px;border:0;outline:0;background:transparent;font:inherit;font-size:13px;text-align:center;color:inherit;-moz-appearance:textfield}
#d2bar .d2m input::-webkit-inner-spin-button{display:none}
#d2bar .d2m i{opacity:.5;font-style:normal}#d2bar .d2m em{font-style:normal;font-size:11px;opacity:.6}
#d2bar .d2seg,.d2panel .d2seg{display:inline-flex;border:1px solid var(--line,#ddd5d8);border-radius:999px;overflow:hidden;height:30px}
#d2bar .d2seg button,.d2panel .d2seg button{border:0;padding:0 11px;background:var(--surf,#fff);font:inherit;font-size:11.5px;color:inherit;cursor:pointer}
#d2bar .d2seg button[aria-pressed="true"],.d2panel .d2seg button[aria-pressed="true"]{background:var(--acc);color:#fff;font-weight:600}
#d2bar .d2fit{font-size:12.5px;margin-left:6px}
#d2bar .d2chips{display:inline-flex;gap:6px;flex-wrap:wrap;align-items:center;margin-left:6px}
#d2bar .d2chip{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 4px 0 10px;border-radius:999px;background:color-mix(in srgb,var(--acc,#6b2a63) 12%,var(--surf,#fff));color:var(--acc,#6b2a63);font-size:12px;font-weight:500}
#d2bar .d2chip button{width:19px;height:19px;border-radius:50%;border:0;background:color-mix(in srgb,var(--acc,#6b2a63) 20%,var(--surf,#fff));color:inherit;cursor:pointer;line-height:1}
#d2bar .d2clr{border:0;background:transparent;color:var(--acc,#6b2a63);text-decoration:underline;font:inherit;font-size:12px;cursor:pointer}
#d2pop{position:absolute;z-index:40;min-width:240px;max-height:360px;overflow:auto;border-radius:12px;border:1px solid var(--line,#ddd5d8);background:var(--surf,#fff);box-shadow:0 14px 34px rgba(0,0,0,.14);padding:6px}
#d2pop .d2o{display:flex;width:100%;align-items:center;gap:8px;padding:7px 9px;border:0;background:transparent;border-radius:8px;font:inherit;font-size:13px;color:inherit;cursor:pointer;text-align:left}
#d2pop .d2o:hover{background:color-mix(in srgb,var(--acc,#6b2a63) 8%,transparent)}
#d2pop .d2o i{width:16px;height:16px;border-radius:4px;border:1px solid var(--line,#ccc);display:inline-flex;align-items:center;justify-content:center;font-style:normal;font-size:11px;color:var(--acc,#6b2a63)}
#d2pop .d2o span{flex-grow:1}#d2pop .d2o s{text-decoration:none;opacity:.6;font-size:12px}
.d2pe{opacity:.7;font-size:13px;padding:10px}
#pane-dir{position:relative}
.d2wrap{display:flex;gap:0;height:calc(100vh - 380px);min-height:520px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--surf);margin-top:12px;box-shadow:0 1px 2px rgba(27,23,36,.05),0 10px 24px -18px rgba(27,23,36,.25)}
/* option A (user, 2026-11-05): subregion tabs, solid country bars, bigger rows with count pills */
.d2sub{flex-basis:100%;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin-top:10px}
.d2sub button{font:inherit;display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 2px 6px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font-size:11px;font-weight:600;letter-spacing:0;text-transform:none;white-space:nowrap;min-width:0;overflow:hidden}
.d2sub button i{font-style:normal;font-size:14px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}
.d2sub button:hover:not([disabled]){background:rgba(255,255,255,.2)}
.d2sub button.on.on{background:#fff;color:var(--acc,#6b2a63);border-color:#fff}
.d2list.d2list .d2rgn b{font-size:13.5px;letter-spacing:.07em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.d2list.d2list .d2rgn s{white-space:nowrap}
.d2sub button[disabled]{opacity:.4;cursor:default}
.d2list.d2list .d2agw{margin:0 -8px}
.d2list.d2list .d2ag{padding-left:16px;padding-right:14px}
.d2list.subon .d2grp{top:var(--d2h,79px)}
.d2list.d2list{background:var(--surf,#fff);gap:0}
.d2list.d2list .d2grp{background:color-mix(in srgb,var(--acc,#6b2a63) 10%,var(--surf,#fff));border-bottom:0;padding:10px 16px}
.d2list.d2list .d2grp b{font-variant:normal;letter-spacing:0;font-size:15.5px}
.d2list.d2list .d2grp u{visibility:hidden}
.d2list.d2list .d2grp s{font-size:12.5px;font-weight:600;color:var(--ink)}
.d2list.d2list .d2agw{border-bottom:1px solid var(--line,#e6dfe3)}
.d2list.d2list .d2ag{border-radius:0;padding:11px 10px 11px 8px}
.d2list.d2list .d2agt b{font-size:14.5px;color:var(--ink)}
.d2list.d2list .d2agt s{font-size:12px;opacity:.75}
.d2list.d2list .d2agn b{font-size:12.5px;font-weight:700;color:var(--acc,#6b2a63);background:color-mix(in srgb,var(--acc,#6b2a63) 11%,transparent);padding:3px 10px;border-radius:999px;font-variant-numeric:tabular-nums}
.d2list.d2list .d2ag.on{background:var(--acc,#6b2a63);box-shadow:none;color:#fff}
.d2list.d2list .d2ag.on .d2agt b,.d2list.d2list .d2ag.on .d2agt s{color:#fff}
.d2list.d2list .d2ag.on .d2agn b{background:#fff;color:var(--acc,#6b2a63)}
.d2list.d2list .d2ag.on .d2agn s{color:#fff}
.d2list.d2list .d2ag:not(.on):hover{background:color-mix(in srgb,var(--acc,#6b2a63) 6%,var(--surf,#fff))}
.d2list{width:300px;flex-shrink:0;overflow-y:auto;border-right:1px solid var(--line,#ddd5d8);padding:6px 8px;box-sizing:border-box;display:flex;flex-direction:column;gap:2px;background:var(--surf2)}
.d2lh{position:sticky;top:-6px;z-index:3;margin:-6px -8px 4px;padding:12px 16px 11px;display:flex;flex-wrap:wrap;align-items:baseline;gap:0 7px;background:var(--acc);color:#fff;border-bottom:1px solid color-mix(in srgb,var(--acc) 70%,#000)}
.d2lh b{font-family:var(--disp,inherit);font-size:30px;font-weight:600;line-height:1;letter-spacing:-.01em}
.d2lh span{font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
.d2lh em{flex-basis:100%;margin-top:4px;font-style:normal;font-size:11.5px;opacity:.85}
.d2rgn{position:sticky;top:var(--d2h,79px);z-index:2;display:flex;align-items:baseline;gap:10px;width:calc(100% + 16px);margin:8px -8px 0;padding:12px 16px;border:0;background:#2A2027;color:#fff;font:inherit;text-align:left;cursor:pointer}
.d2rgn b{font-size:17px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.d2rgn s{text-decoration:none;font-size:11.5px;opacity:.75;flex-grow:1}
.d2rgn i{font-style:normal;font-size:13px;opacity:.85}
.d2rgn:hover{background:#3a2e37}
.d2rgn.fold{position:relative;top:auto;background:var(--surf);color:var(--ink);border-top:1px solid var(--line)}
.d2rgn.fold:hover{background:var(--wash)}
.d2grp{position:sticky;top:calc(var(--d2h,79px) + var(--d2rh,49px));z-index:1;margin:4px -8px 2px;padding:9px 16px 8px;display:flex;align-items:center;gap:9px;background:var(--surf,#fff);border-bottom:1px solid var(--line)}
.d2grp .d2cc{flex-shrink:0;font-style:normal;font-size:10.5px;font-weight:800;letter-spacing:.06em;line-height:1;color:#fff;background:var(--acc,#6b2a63);border-radius:5px;padding:4px 5px}
.d2grp b{font-size:15.5px;font-weight:700;color:var(--ink);font-variant:small-caps;letter-spacing:.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.d2grp u{flex-grow:1;min-width:12px;border-bottom:2px dotted color-mix(in srgb,var(--mut) 45%,transparent);align-self:flex-end;margin-bottom:6px;text-decoration:none}
.d2grp s{flex-shrink:0;text-decoration:none;font-size:11.5px;color:var(--mut)}
/* region bar: a fine pinstripe texture and a plum underline */
.d2rgn:not(.fold){background:#2A2027 repeating-linear-gradient(135deg,rgba(255,255,255,.07) 0 2px,transparent 2px 7px);box-shadow:inset 0 -3px 0 var(--acc,#6b2a63)}
.d2rgn:not(.fold):hover{background-color:#3a2e37}
/* the agency list folds away: a tab on its edge */
.d2wrap{position:relative}
.d2wrapo{position:relative}
.d2fb{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.d2fbh{display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:14px;background:var(--acc,#6b2a63);color:#fff}
.d2fbh h2{margin:0;font-size:20px;font-weight:600}.d2fbhi{font-size:18px}.d2fbhn{font-size:13px;opacity:.9}.d2fbhn b{font-size:15px}
.d2fbhint{font-size:12px;opacity:.75}
.d2fbe{padding:40px 20px;text-align:center;border:1px dashed var(--line);border-radius:14px;background:var(--surf);color:var(--mut)}.d2fbe p{margin:4px 0}
.d2fbrow{border:1px solid var(--line);border-radius:14px;background:var(--surf);overflow:hidden;box-shadow:0 1px 2px rgba(27,23,36,.05)}
.d2fbrow.open{border-color:color-mix(in srgb,var(--acc) 45%,var(--line));box-shadow:0 10px 28px -14px rgba(27,23,36,.35)}
.d2fbbar{display:flex;align-items:stretch}
.d2fbgo{flex-grow:1;display:flex;align-items:center;gap:14px;padding:12px 16px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;min-width:0}
.d2fbgo:hover{background:var(--surf2)}.d2fbrow.open .d2fbgo{background:color-mix(in srgb,var(--acc) 6%,var(--surf))}
.d2fbn{flex-shrink:0;width:28px;height:28px;border-radius:50%;background:color-mix(in srgb,var(--acc) 12%,var(--surf));color:var(--acc);font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center}
.d2fbrow.open .d2fbn{background:var(--acc);color:#fff}
.d2fbt{flex-grow:1;min-width:0;display:flex;flex-direction:column}.d2fbt b{font-size:15.5px;font-weight:600}.d2fbt s{text-decoration:none;font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d2fbm{flex-shrink:0;font-size:12.5px;color:var(--mut)}.d2fbm b{font-size:15px;color:var(--ink)}
.d2fbc{flex-shrink:0;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--acc)}
.d2fbc svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s}
.d2fbrow.open .d2fbc svg{transform:rotate(180deg)}
.d2fbx{flex-shrink:0;width:52px;border:0;border-left:1px solid var(--line);background:transparent;color:#c0457a;font-size:18px;cursor:pointer}.d2fbx:hover{background:#fbeef3}
.d2fbbody{border-top:1px solid var(--line)}
.d2fbn{cursor:grab}.d2fbdrag{position:relative;z-index:5;box-shadow:0 18px 40px rgba(27,23,36,.25)!important;opacity:.96}
body.d2fbdragging,body.d2fbdragging *{cursor:grabbing!important;user-select:none}
.d2fbbody .d2panel{height:640px;display:flex;flex-direction:column}
.d2fbbody .d2ph1 h2,.d2fbbody [data-d2heart]{display:none}
.d2tog{position:absolute;z-index:51;left:-21px;top:50%;transform:translateY(-50%);width:21px;height:48px;padding:0;border:1px solid var(--line);border-right:0;border-radius:10px 0 0 10px;background:var(--surf,#fff);color:var(--acc,#6b2a63);font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;box-shadow:-3px 2px 8px rgba(27,23,36,.1)}
.d2tog:hover{background:var(--acc,#6b2a63);color:#fff;border-color:var(--acc,#6b2a63)}
.d2togi{font-size:17px;line-height:1;font-weight:600}
.d2togl{writing-mode:vertical-rl;transform:rotate(180deg);font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.d2wrapo:has(.d2wrap.listoff) .d2tog{height:auto;padding:10px 0 9px}
body.d2max .d2tog{left:-17px;width:17px}
.d2wrap.listoff .d2list{display:none}

.d2agw{position:relative}
.d2tb{position:absolute;right:7px;top:7px;z-index:2;font-size:10px;font-weight:600;padding:2px 7px;border-radius:999px;background:rgba(255,255,255,.92);color:#2a2027}
.d2on{display:flex;flex-wrap:wrap;gap:5px;padding:10px 14px 14px;font-size:11.5px;border-top:1px solid var(--line)}
.d2on b{flex-basis:100%;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
.d2on span{padding:3px 9px;border-radius:999px;background:var(--surf2)}
.d2agw .d2rm{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:8px;border:0;background:var(--surf);color:var(--mut);cursor:pointer;opacity:0;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.d2agw .d2rm svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.d2agw:hover .d2rm,.d2agw .d2rm:focus-visible{opacity:1}.d2agw .d2rm:hover{color:var(--acc,#6b2a63)}
.d2agw:hover .d2agn{visibility:hidden}
.d2agw.rmd .d2ag{opacity:.55}
.d2agw .d2rs{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:1px solid var(--line);background:var(--surf);border-radius:999px;font:inherit;font-size:11.5px;padding:4px 10px;cursor:pointer;color:var(--acc)}
.d2hidsec{margin:12px -8px 0;display:flex;flex-direction:column}
.d2hidbar{display:flex;align-items:center;gap:8px;padding:12px 16px;background:#2A2027;color:#fff;box-shadow:inset 0 -3px 0 #8A8592}
.d2hidbar b{font-size:15px;font-weight:700;letter-spacing:.12em;flex-grow:1}.d2hidbar s{text-decoration:none;font-size:11.5px;opacity:.75}
.d2hidbar .d2hidi{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.d2list .d2hidrow{border-bottom:1px solid var(--line,#e6dfe3);border-radius:0;padding:11px 14px 11px 16px}
.d2list .d2hidrow.d2hidsub{padding-left:30px}.d2hidrow .d2agt b i{font-style:normal;opacity:.6;margin-right:4px}
.d2list .d2hidrow.on{background:var(--acc,#6b2a63);color:#fff}.d2list .d2hidrow.on .d2agt b,.d2list .d2hidrow.on .d2agt s{color:#fff}
.d2list .d2hidrow.on .d2agn b{background:#fff;color:var(--acc,#6b2a63)}
.d2hb.d2hideb{display:inline-flex;align-items:center;gap:6px}.d2hb.d2hideb svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.d2hb.d2hideb:hover{background:color-mix(in srgb,var(--acc,#6b2a63) 8%,var(--surf,#fff));border-color:color-mix(in srgb,var(--acc,#6b2a63) 30%,transparent)}
.d2hidt{font-size:18px;font-weight:700}.d2hidgt{color:var(--mut);margin:0 2px}
.d2hidcard .ucimg{position:relative}.d2hidcard .ucph img{filter:grayscale(.6);opacity:.8}
.d2hidtag{position:absolute;left:8px;top:8px;font-size:11px;font-weight:700;color:#fff;background:rgba(42,32,39,.82);padding:3px 8px;border-radius:999px}
.d2hidft{display:flex;flex-direction:column;gap:3px;padding:8px 10px 10px}.d2hidft b{font-size:13.5px}.d2hidft s{text-decoration:none;font-size:12px;color:var(--mut)}
.d2hidshow{margin-top:6px;min-height:34px;border:1px solid var(--line);background:var(--surf,#fff);border-radius:999px;font:inherit;font-size:12px;font-weight:600;color:var(--acc,#6b2a63);cursor:pointer}
.d2hidshow:hover{background:var(--acc,#6b2a63);color:#fff;border-color:var(--acc,#6b2a63)}
.d2conf{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px;border-radius:9px;background:color-mix(in srgb,var(--acc,#6b2a63) 9%,var(--surf,#fff));font-size:12.5px}
.d2conf span{flex-basis:100%}
.d2conf .d2cy{border:0;background:var(--acc,#6b2a63);color:#fff;border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;cursor:pointer}
.d2conf .d2cn{border:1px solid var(--line);background:var(--surf);border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;cursor:pointer;color:inherit}
.d2showrm{margin:10px 8px 4px;border:0;background:transparent;color:var(--mut);font:inherit;font-size:12px;text-decoration:underline;cursor:pointer;text-align:left}
#d2toast{position:fixed;left:50%;bottom:30px;transform:translateX(-50%);z-index:120;display:flex;gap:14px;align-items:center;padding:10px 16px;border-radius:12px;background:#2a2027;color:#fff;font-size:13px;box-shadow:0 12px 30px rgba(0,0,0,.25)}
#d2toast button{border:0;background:transparent;color:#f3c6e9;font:inherit;font-weight:600;cursor:pointer;text-decoration:underline}
.d2ag{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;width:100%}
.d2ag:hover{background:color-mix(in srgb,var(--surf,#fff) 80%,transparent)}
.d2ag.on{background:var(--surf,#fff);box-shadow:inset 3px 0 0 var(--acc,#6b2a63)}
.d2agt{display:flex;flex-direction:column;gap:1px;min-width:0;flex-grow:1}
.d2agt b{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d2agt s{text-decoration:none;font-size:11.5px;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d2agn{display:flex;flex-direction:column;align-items:flex-end}.d2agn b{font-size:14px;font-weight:500}.d2agn s{text-decoration:none;font-size:10.5px;opacity:.65}
.d2more{margin:8px;border:1px solid var(--line,#ddd5d8);border-radius:999px;background:var(--surf,#fff);padding:6px;font:inherit;font-size:12px;color:inherit;cursor:pointer}
.d2panel{flex-grow:1;min-width:0;display:flex;flex-direction:column}
.d2ph{position:relative;z-index:5;padding:14px 20px 10px;border-bottom:1px solid var(--line,#e4dde0);display:flex;flex-direction:column;gap:9px}
.d2ph1{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.d2ph2{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.d2bwrap{position:relative;margin-right:4px}
.d2bdd{display:inline-flex;align-items:center;gap:10px;height:36px;padding:0 13px 0 14px;border:1px solid var(--line);border-radius:12px;background:var(--surf);color:inherit;font:inherit;font-size:13px;cursor:pointer;max-width:420px}
.d2bdd b{font-weight:600}.d2bdd em{font-style:normal;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d2bdd svg{width:12px;height:12px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:transform .15s}
.d2bdd:hover{border-color:color-mix(in srgb,var(--acc) 40%,var(--line))}
.d2bdd[aria-expanded="true"]{border-color:var(--acc);box-shadow:0 0 0 3px color-mix(in srgb,var(--acc) 14%,transparent)}.d2bdd[aria-expanded="true"] svg{transform:rotate(180deg)}
.d2bmenu.d2bm2{top:calc(100% + 6px);width:340px;max-height:min(460px,60vh)}
.d2bh{padding:10px 9px 3px;font-size:10.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--acc)}
.d2bi{display:flex;width:100%;align-items:center;gap:9px;padding:6px 9px;border:0;border-radius:7px;background:transparent;color:inherit;font:inherit;font-size:13px;text-align:left;cursor:pointer}
.d2bi:hover{background:var(--surf2)}.d2bi.on{background:color-mix(in srgb,var(--acc) 7%,var(--surf))}
.d2bi i{width:15px;height:15px;flex-shrink:0;border:1.5px solid color-mix(in srgb,var(--mut) 45%,transparent);border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-style:normal;font-size:10px;line-height:1;color:#fff}
.d2bi.on i{background:var(--acc);border-color:var(--acc)}
.d2bi span{flex-grow:1}.d2bi s{text-decoration:none;color:var(--mut);font-size:12px}
.d2ball{font-weight:600;border-bottom:1px solid var(--line);border-radius:7px 7px 0 0;margin-bottom:2px}
.d2bc{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 9px 0 12px;border:0;border-radius:999px;background:var(--acc);color:#fff;font:inherit;font-size:12.5px;cursor:pointer}
.d2bc s{text-decoration:none;opacity:.75;font-size:11.5px}.d2bc i{font-style:normal;font-size:10px;opacity:.8;margin-left:2px}.d2bc:hover i{opacity:1}
.d2bclr{height:30px;padding:0 8px;border:0;background:transparent;color:var(--acc);font:inherit;font-size:12px;cursor:pointer}
.d2ph3{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.d2mq{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px;border:1px solid var(--line);border-radius:999px;background:var(--surf,#fff);flex:0 1 240px;min-width:170px}
.d2mq:focus-within{border-color:var(--acc);box-shadow:0 0 0 3px color-mix(in srgb,var(--acc) 18%,transparent)}
.d2mq svg{width:14px;height:14px;fill:none;stroke:var(--mut);stroke-width:2;stroke-linecap:round;flex:none}
.d2mq input{border:0;outline:0;background:transparent;font:inherit;font-size:13px;color:var(--ink);min-width:0;width:100%;padding:0}
@media (max-width:760px){.d2mq{flex:1 1 100%}}
.d2shown{font-size:12.5px;color:var(--mut)}
.d2pill{display:inline-flex;gap:5px;align-items:center;height:30px;padding:0 11px;border-radius:999px;border:1px solid var(--line);background:var(--surf);font:inherit;font-size:12px;font-weight:500;color:inherit;cursor:pointer}
.d2pill s{text-decoration:none;opacity:.6;font-weight:400}
.d2pill i{font-style:normal;font-size:11px}
.d2pill:hover{border-color:color-mix(in srgb,var(--acc) 40%,transparent)}
.d2pill.on{background:var(--acc);border-color:var(--acc);color:#fff}.d2pill.on s{opacity:.8}
.d2pill.solo{cursor:default}
.d2pmore{height:30px;padding:0 10px;border:0;background:transparent;color:var(--acc);font:inherit;font-size:12px;font-weight:500;cursor:pointer}
.d2ph2 .d2tab{flex-shrink:0}
.d2ph h2{margin:0;font-size:22px;font-weight:500}
.d2pm{font-size:12.5px;opacity:.85}
.d2sp{flex-grow:1}
.d2hb{height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--line,#ddd5d8);background:var(--surf,#fff);font:inherit;font-size:12px;color:inherit;cursor:pointer}
.d2hb.on{color:#b23a55;border-color:#e2b9c3}
.d2tab{display:inline-flex;gap:5px;align-items:center;height:30px;padding:0 11px;border-radius:999px;border:1px solid var(--line,#ddd5d8);background:var(--surf,#fff);font:inherit;font-size:12px;font-weight:500;color:inherit;cursor:pointer}
.d2tab s{text-decoration:none;opacity:.65;font-weight:400}
.d2tab.on{background:var(--acc,#6b2a63);border-color:var(--acc,#6b2a63);color:#fff}
.d2ob{font-size:12px;margin-right:6px;color:var(--acc);text-decoration:none;font-weight:500}.d2ob:hover{text-decoration:underline}
.d2body{flex-grow:1;overflow-y:auto;padding:14px 20px 20px;position:relative}
.d2grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(calc(150px * var(--pz,1)),1fr));gap:10px}
.d2pz{height:28px;margin-right:8px;padding:0 10px;border:1px solid color-mix(in srgb,var(--acc) 35%,var(--line));border-radius:999px;background:color-mix(in srgb,var(--acc) 7%,var(--surf));color:var(--acc);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.d2pz:hover{background:var(--acc);color:#fff}
.d2t{position:relative;aspect-ratio:3/4;border-radius:10px;overflow:hidden;background:var(--surf2);cursor:pointer}
/* tiles float slightly; under the mouse they rise, grow a touch and glow plum (user chose D, 2026-11-04).
   Shadows are static; only transform/box-shadow of the one hovered tile change. */
.d2grid{gap:14px!important;padding:4px 2px 10px}
.d2t{box-shadow:0 1px 2px rgba(27,23,36,.06),0 12px 22px -14px rgba(27,23,36,.35);transition:transform .25s cubic-bezier(.22,1.28,.36,1),box-shadow .25s ease;contain:paint}
/* while the photos scroll, tiles passing under the mouse do not rise (keeps scrolling smooth) */
.d2body.d2scrolling .d2t{pointer-events:none}
.d2body,.rcbody{overscroll-behavior:contain}
.d2t:hover,.d2t:focus-within{transform:translateY(-5px) scale(1.015);box-shadow:0 0 0 1px rgba(123,63,119,.22),0 20px 32px -14px rgba(58,24,56,.5),0 0 34px -8px rgba(123,63,119,.35);z-index:2}
@media (prefers-reduced-motion:reduce){.d2t{transition:none}.d2t:hover,.d2t:focus-within{transform:none}}
.d2t .litpic{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;margin:0!important;border-radius:0!important}
.d2t .litpic img{width:100%;height:100%;object-fit:cover}
.d2t .picfall,.d2t .picsrc,.d2t .picx,.d2t .piccopy,.d2t .illupf{display:none!important}
.d2tn{position:absolute;left:8px;right:40px;bottom:8px;font-size:11.5px;font-weight:600;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
/* no dark fade: on a tile with a photo the photo covers the name anyway; on a tile still
   without a photo the name is written plainly in dark letters */
.d2t::after{content:none}
.d2t .d2tn{color:var(--ink,#2A2027);text-shadow:none;font-weight:600}
.d2tl{position:absolute;left:8px;top:8px;width:12px;height:12px;border-radius:50%;border:2px solid #fff;z-index:2}
.d2tl[data-v="g"]{background:#2f8f5b}.d2tl[data-v="y"]{background:#d9a21b}.d2tl[data-v="r"]{background:#c0392b}
.d2plus{position:absolute;right:7px;bottom:7px;z-index:3;width:28px;height:28px;border-radius:50%;border:0;background:rgba(255,255,255,.94);color:#2a2027;font-size:16px;line-height:1;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.2)}
.d2t:hover .d2plus{transform:scale(1.08)}
.d2card{position:fixed;z-index:60;left:50%;top:18px;transform:translateX(-50%);transform-origin:50% 0;width:320px;max-width:calc(100% - 40px);border-radius:14px;background:var(--surf,#fff);box-shadow:0 20px 50px rgba(0,0,0,.25)}
.d2card .litrow{margin:0!important;box-shadow:none!important;width:auto!important;border-radius:0 0 14px 14px!important}
/* 1.2.108 (user, 8 Nov 2026): the top corners round like the bottom ones */
.d2card.cs-x .litrow{border-radius:14px!important}.d2card.cs-x .litpic{border-top-left-radius:13px!important;border-top-right-radius:13px!important}
.d2card .litpic{height:427px!important;min-height:0!important;max-height:427px!important;aspect-ratio:auto!important}
.d2card .litpic img{width:100%;height:100%;object-fit:cover;object-position:50% 20%}
/* ---------- slideshow on the card ---------- */
.d2card .litpic .d2sl{position:absolute;inset:0;z-index:2;pointer-events:none}
.d2card .litpic .d2sl > *{pointer-events:auto}
.d2card .litpic .d2sli{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 20%;pointer-events:none;animation:d2slin .35s ease both;background:var(--surf2,#F4F2F7)}
@keyframes d2slin{from{opacity:0}to{opacity:1}}
.uc.ucfind{box-shadow:0 0 0 3px var(--acc,#7a3cff),0 10px 28px -10px rgba(20,10,30,.45)!important;animation:ucfind 1.1s ease 3}
@keyframes ucfind{50%{box-shadow:0 0 0 6px var(--acc,#7a3cff),0 10px 28px -10px rgba(20,10,30,.45)}}
@media (prefers-reduced-motion:reduce){.uc.ucfind{animation:none}}
.d2card .litpic.d2slon > .picsrc,.d2card .litpic.d2slon > .piccopy{display:none!important}
.d2sln{position:absolute;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;border:0;padding:0;display:grid;place-items:center;cursor:pointer;
  background:rgba(255,255,255,.88);color:var(--ink,#1B1724);box-shadow:0 4px 12px -4px rgba(27,23,36,.4);opacity:0;transition:opacity .2s,transform .2s cubic-bezier(.22,1.28,.36,1)}
.d2sln svg{width:16px;height:16px}
.d2sln.prev{left:10px}.d2sln.next{right:10px}
.d2card .litpic:hover .d2sln,.d2sln:focus-visible{opacity:1}
.d2sln:hover{transform:translateY(-50%) scale(1.08)}
.d2slc{position:absolute;left:10px;top:44px;display:flex;gap:6px;align-items:center;color:#fff;font:600 11px var(--sans);letter-spacing:.05em;pointer-events:none!important}
.d2slc b{background:rgba(27,23,36,.5);padding:3px 8px;border-radius:999px;font-weight:600}
.d2slc span{text-shadow:0 1px 6px rgba(0,0,0,.5)}
.d2sld{position:absolute;left:0;right:0;bottom:40px;display:flex;justify-content:center;gap:5px;pointer-events:none!important}
.d2card .d2sld i{flex:none;display:block;width:6px!important;height:6px!important;margin:0!important;padding:0!important;border:0!important;border-radius:50%;background:rgba(255,255,255,.6);box-shadow:0 0 4px rgba(0,0,0,.25);transition:width .25s}
.d2card .d2sld i.on{width:16px!important;border-radius:999px;background:#fff}
/* full view button: the four-corner "full screen" mark everyone knows; label + key shown on hover */
.d2slf{position:absolute;left:10px;top:10px;height:28px;min-width:28px;padding:0 7px;border:0;border-radius:8px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;
  background:rgba(27,23,36,.46);color:#fff;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font:600 11.5px var(--sans);transition:background .2s,transform .2s cubic-bezier(.22,1.28,.36,1)}
.d2slf svg{width:14px;height:14px;flex:none}
.d2slf span,.d2slf kbd{display:none}
.d2slf kbd{font:600 10px var(--sans);padding:0 5px;border-radius:4px;border:1px solid rgba(255,255,255,.45);line-height:15px}
.d2slf:hover,.d2slf:focus-visible{background:rgba(27,23,36,.72);transform:translateY(-1px)}
.d2slf:hover span,.d2slf:hover kbd,.d2slf:focus-visible span,.d2slf:focus-visible kbd{display:inline}
.d2slst{position:absolute;left:50%;bottom:40px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;white-space:nowrap;
  background:rgba(27,23,36,.5);color:#fff;font:500 11px var(--sans);padding:4px 10px;border-radius:999px;pointer-events:none!important}
.d2slst i{width:9px;height:9px;border-radius:50%;border:1.6px solid rgba(255,255,255,.45);border-top-color:#fff;animation:d2spin .8s linear infinite}
@keyframes d2spin{to{transform:rotate(360deg)}}
/* the honest note when there is no slideshow */
.d2slno{position:absolute;left:10px;right:10px;bottom:38px;display:grid;gap:2px;padding:8px 11px;border-radius:10px;text-align:left;
  background:rgba(255,255,255,.92);color:var(--ink2,#494154);font:500 11.5px/1.35 var(--sans);box-shadow:0 6px 18px -8px rgba(27,23,36,.45)}
.d2slno b{font:600 10px var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--mut,#7A7186)}
.d2slno a{color:var(--acc,#5A2C57);font-weight:600;text-decoration:none}
.d2slno a:hover{text-decoration:underline}
/* ---------- full view: the whole window, like the Atlas and Booking windows ---------- */
body.d2fullcard .d2veil{background:#16121B!important}
html:has(body.d2fullcard),body.d2fullcard{overflow:hidden!important}
.d2card.d2card.d2full{position:fixed!important;inset:0!important;left:0!important;top:0!important;transform:none!important;scale:none!important;width:100vw!important;max-width:none!important;height:100vh!important;
  border-radius:0!important;box-shadow:none!important;border:0!important;z-index:200!important;display:grid!important;grid-template-columns:minmax(0,1fr) 360px;grid-template-rows:minmax(0,1fr) auto;overflow:hidden;animation:none!important;background:var(--surf,#fff)!important}
.d2card.d2full > .litrow{display:contents!important}
.d2card.d2full > .d2grip{display:none!important}
.d2card.d2full .litpic.litpic{grid-column:1;grid-row:1;height:auto!important;max-height:none!important;min-height:0!important;border-radius:0!important;background:#16121B!important}
.d2card.d2full .litpic > img,.d2card.d2full .litpic .d2sli{object-fit:contain!important;object-position:50% 50%!important;animation:none!important;background:#16121B}
.d2card.d2full .litpic::after{display:none!important}
.d2card.d2full .d2sln{opacity:1;width:44px;height:44px}
.d2card.d2full .d2sln.prev{left:18px}.d2card.d2full .d2sln.next{right:18px}
.d2card.d2full .d2slf{left:16px;top:16px;height:32px;padding:0 10px}
.d2card.d2full .d2slf span,.d2card.d2full .d2slf kbd{display:inline}
.d2card.d2full .d2slc{left:16px;top:58px}
.d2card.d2full .d2slno{left:50%;right:auto;bottom:24px;transform:translateX(-50%);max-width:420px}
.d2card.d2full .d2slstrip{grid-column:1;grid-row:2;display:flex;gap:8px;padding:10px 14px;background:#1E1924;overflow-x:auto;scrollbar-width:thin;scrollbar-color:#4A4052 transparent}
.d2slt{flex:none;width:56px;aspect-ratio:3/4;padding:0;border:2px solid transparent;border-radius:8px;overflow:hidden;background:#2A2230;cursor:pointer;opacity:.55;transition:opacity .2s,border-color .2s,transform .2s}
.d2slt img{width:100%;height:100%;object-fit:cover;display:block}
.d2slt{position:relative}.d2slt video{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}.d2slt .d2slplay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-style:normal;text-shadow:0 1px 4px rgba(0,0,0,.7);pointer-events:none}
.d2card .litpic video.d2slv{object-fit:contain!important;background:#16121B;pointer-events:auto}
.d2slt:hover{opacity:.85;transform:translateY(-2px)}
.d2slt.on{opacity:1;border-color:#fff}
.d2card.d2full .litxc{position:absolute!important;top:16px!important;right:376px!important;left:auto!important;z-index:5}
.d2card.d2full .litcard{grid-column:2;grid-row:1 / 3;overflow-y:auto;border-left:1px solid var(--line);padding:64px 22px 0!important;display:flex;flex-direction:column;text-align:left;animation:none!important}
.d2card.d2full .litcard > *{animation:none!important}
.d2card.d2full .litacts{margin-top:auto!important;position:sticky;bottom:0;background:var(--surf,#fff);border-top:1px solid var(--line);padding-top:12px!important;padding-bottom:14px!important}
.d2card.d2full > .d2on{position:absolute;right:0;bottom:64px;width:360px;box-sizing:border-box;padding:10px 22px;border-top:1px solid var(--line);background:var(--surf,#fff);display:none}
.d2card.d2full > .d2x{position:fixed!important;top:14px!important;right:14px!important;left:auto!important;bottom:auto!important;transform:none!important;z-index:210!important}
/* full view: the details panel closes and opens (button at the panel's top-left; when closed it waits beside Close) */
.d2card.d2full > .d2slside{position:absolute;top:16px;right:316px;z-index:6;width:30px;height:28px;padding:0;border-radius:8px;display:grid;place-items:center;cursor:pointer;
  border:1px solid color-mix(in srgb,var(--acc) 30%,var(--line));background:color-mix(in srgb,var(--acc) 12%,var(--surf));color:var(--acc);transition:background .2s,transform .2s cubic-bezier(.22,1.28,.36,1)}
.d2card.d2full > .d2slside:hover{background:color-mix(in srgb,var(--acc) 22%,var(--surf));transform:translateY(-1px)}
.d2card.d2full > .d2slside svg{width:16px;height:16px}
.d2card.d2card.d2full.d2noside{grid-template-columns:minmax(0,1fr) 0!important}
.d2card.d2full.d2noside .litcard,.d2card.d2full.d2noside > .d2on{display:none!important}
.d2card.d2full.d2noside > .d2slside{right:114px;box-shadow:0 2px 8px -2px rgba(0,0,0,.35)}
.d2card.d2full.d2noside .litxc{right:160px!important}
@media (max-width:760px){.d2card.d2full > .d2slside{display:none}}
.d2mxw{margin:0 0 14px}.d2mxw .mx{margin-top:0}
/* 1.2.129: in the full view the details are the shared panel only */
.d2card.d2full.d2pnon .litcard>*:not(.d2mxw){display:none!important}
.d2card.d2full.d2pnon .litcard{padding-top:52px!important}
.d2slfx{display:grid;grid-template-columns:auto 1fr;gap:9px 16px;margin:14px 0 14px;padding:14px 0 0;border-top:1px solid var(--line)}
.d2slfx dt{font:600 9.5px var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--faint);padding-top:2px}
.d2slfx dd{margin:0;font-size:13px;color:var(--ink2);min-width:0;overflow-wrap:anywhere}
.d2slfx a{color:var(--acc);font-weight:600;text-decoration:none}.d2slfx a:hover{text-decoration:underline}
@media (max-width:760px){
  .d2card.d2card.d2full{grid-template-columns:minmax(0,1fr);grid-template-rows:60vh auto auto;overflow-y:auto}
  .d2card.d2full .litpic.litpic{grid-row:1}.d2card.d2full .d2slstrip{grid-row:2}
  .d2card.d2full .litcard{grid-column:1;grid-row:3;border-left:0;overflow:visible;padding-top:22px!important}
  .d2card.d2full .litxc{right:16px!important}
}
/* 1.2.141 (user, 12 Nov): on the phone the full card is one page that scrolls under the finger: the info slides up over the photo and back down.
   .d2card{touch-action:none} (for dragging the small card on the PC) was blocking that, so the panel felt locked. */
@media (max-width:760px),(pointer:coarse) and (max-width:1024px){
  .d2card.d2card.d2full{touch-action:pan-y pinch-zoom!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;cursor:auto}
  .d2card.d2full .litcard,.d2card.d2full .litcard *{touch-action:pan-y pinch-zoom}
  .d2card.d2full .d2slstrip{touch-action:pan-x pan-y}
}
@media (prefers-reduced-motion:reduce){.d2card .litpic .d2sli,.d2slst i{animation:none!important}.d2sln,.d2slf,.d2slt{transition:none!important}}
/* ---------- Recommendations page: the Directory's grid, full width ---------- */
body[data-view="arr"] .shell.shell,html body[data-view="arr"][data-railoff] .shell.shell{grid-template-columns:minmax(0,1fr)!important}
body[data-view="arr"] .shell.shell>.side,html body[data-view="arr"] .shell.shell>.rail{display:none!important}
body[data-view="arr"] .shell.shell>*{grid-column:1/-1}
.rcwrap{display:flex;flex-direction:column;background:var(--surf,#fff);border:1px solid var(--line);border-radius:14px;overflow:hidden;height:calc(100vh - 330px);min-height:520px}
.rchd{display:flex;align-items:flex-start;gap:16px;padding:16px 20px 14px;border-bottom:1px solid var(--line)}
.rchd > div{flex:1;min-width:0}
.rchd h2{margin:0;font:600 19px var(--sans);color:var(--ink)}
.rchd p{margin:3px 0 0;font-size:12.5px;color:var(--mut)}
.rchd .rcprog{color:var(--ink2);font-size:12px}
.rcbtn{flex:none;display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 15px 0 12px;border:0;border-radius:999px;background:var(--acc);color:#fff;font:600 12.5px var(--sans);cursor:pointer;box-shadow:0 6px 14px -8px rgba(90,44,87,.7);transition:transform .2s cubic-bezier(.22,1.28,.36,1),background .2s}
.rcbtn svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .5s}
.rcbtn:hover{transform:translateY(-1px);background:var(--acc2,#7B3F77)}.rcbtn:hover svg{transform:rotate(180deg)}
.rcbtn:disabled{opacity:.5;cursor:default;transform:none}
.rchd{align-items:center}
body.rcfull #pane-arr .rcwrap{position:fixed!important;inset:0!important;z-index:90!important;height:100vh!important;min-height:0!important;border-radius:0!important;border:0!important}
body.rcfull .d2card{z-index:120!important}
.rcbody{flex:1;min-height:0;overflow:auto;position:relative;padding:14px 16px}
.d2solo{position:fixed!important;inset:0;z-index:58;overflow:visible!important;background:none!important;pointer-events:none}
.d2solo > *{pointer-events:auto}
.d2solo > .d2veil{position:fixed!important;inset:0;height:auto!important}
body.d2carding .d2start{filter:blur(4px) saturate(1.05);opacity:.85;transition:filter .45s ease,opacity .45s ease}
.d2bfb{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px 0 10px;border:1px solid var(--line);border-radius:999px;background:var(--surf);color:var(--ink2);font:500 12.5px var(--sans);cursor:pointer;transition:border-color .2s,color .2s,background .2s}
.d2bfb svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.d2bfb:hover,.d2bfb[aria-pressed="true"]{border-color:var(--acc);color:var(--acc);background:color-mix(in srgb,var(--acc) 7%,var(--surf))}
body.d2bfull #pane-dir .d2panel{position:fixed!important;inset:0!important;z-index:90!important;height:100vh!important;width:100vw!important;background:var(--surf);border-radius:0!important;margin:0!important}
body.d2bfull #pane-dir .d2tog{display:none!important}
body.d2bfull .d2card{z-index:120!important}
body.d2bfull .d2veil{z-index:110!important}
a.rnm.rnmq{display:inline-block!important;white-space:nowrap!important;overflow:hidden;vertical-align:middle;box-sizing:border-box;text-overflow:clip}
a.rnm.rnmq .rnmw{display:block;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 8px,#000 calc(100% - 8px),transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 8px,#000 calc(100% - 8px),transparent 100%)}
a.rnm.rnmq .rnmi{display:inline-flex;animation:rnmloop 8s linear infinite}
a.rnm.rnmq .rnmi > span{padding-right:26px}
a.rnm.rnmq:hover .rnmi{animation-play-state:paused}
@keyframes rnmloop{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){a.rnm.rnmq .rnmi{animation:none}a.rnm.rnmq .rnmi > span + span{display:none}a.rnm.rnmq .rnmw{text-overflow:ellipsis}}
.d2veil{position:absolute;left:0;right:0;top:0;z-index:9;background:color-mix(in srgb,var(--paper) 55%,transparent);backdrop-filter:blur(2px) saturate(.6);-webkit-backdrop-filter:blur(2px) saturate(.6);cursor:default}
.d2body.carding{overflow-y:auto}
.d2grid,.d2names,.d2list,.d2ph,#d2bar,.ckrow{transition:opacity .45s ease,filter .45s ease}
/* the blur fades in when a card opens (only then, not on every redraw while it is open) and out as it closes */
@keyframes d2blurin{from{filter:none;opacity:1}}
body.d2opening .d2body:has(> .d2card) .d2grid,body.d2opening .d2body:has(> .d2card) .d2names,
body.d2opening.d2carding .d2list,body.d2opening.d2carding .d2ph,body.d2opening.d2carding #d2bar,body.d2opening.d2carding .ckrow{animation:d2blurin .45s ease both}
body.d2closing .d2grid,body.d2closing .d2names,body.d2closing .d2list,body.d2closing .d2ph,body.d2closing #d2bar,body.d2closing .ckrow{filter:none!important;opacity:1!important;transition:opacity .3s ease,filter .3s ease!important}
body.d2closing .d2veil{opacity:0;transition:opacity .28s}
/* depth: layered shadow, a faint plum glow and a white line inside the top edge */
.d2card{background:linear-gradient(180deg,#fff,#FBF9FD)!important;box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 0 0 1px rgba(90,44,87,.06),0 2px 4px rgba(27,23,36,.06),0 12px 24px -8px rgba(27,23,36,.18),0 38px 70px -22px rgba(58,24,56,.42),0 0 46px -6px rgba(123,63,119,.28)!important}
.d2card .litrow{background:transparent!important}
/* the photo: a slow drift, a little brighter on hover, a soft fade at its bottom edge */
.d2card .litpic{overflow:hidden!important;position:relative}
.d2card .litpic img{animation:d2drift 14s ease-in-out var(--d2age,0ms) infinite alternate;transition:filter .35s ease;will-change:transform}
.d2card .litpic:hover img{filter:brightness(1.04) contrast(1.03)}
@keyframes d2drift{from{transform:scale(1.02) translateY(0)}to{transform:scale(1.09) translateY(-1.5%)}}
.d2card .litpic::after{content:"";position:absolute;left:0;right:0;bottom:0;height:56px;pointer-events:none;background:linear-gradient(rgba(251,249,253,0),rgba(251,249,253,.55));z-index:1}
/* the page's own hover shade (inset:0) pulled this fade up to the TOP of the photo on hover - a light bar.
   Pin it to the bottom, always shown, never changing on hover (user, 2026-11-04) */
.d2card .litpic.litpic::after{top:auto!important;bottom:0!important;inset:auto 0 0 0!important;height:56px!important;opacity:1!important;transition:none!important;background:linear-gradient(rgba(251,249,253,0),rgba(251,249,253,.55))!important}
/* details fade up one after another, only as the card opens */
@keyframes d2up{from{opacity:0;transform:translateY(8px)}}
body.d2opening .d2card .litcard > *{animation:d2up .42s cubic-bezier(.2,.8,.3,1) both}
body.d2opening .d2card .litcard > :nth-child(1){animation-delay:170ms}
body.d2opening .d2card .litcard > :nth-child(2){animation-delay:225ms}
body.d2opening .d2card .litcard > :nth-child(3){animation-delay:280ms}
body.d2opening .d2card .litcard > :nth-child(4){animation-delay:335ms}
body.d2opening .d2card .litcard > :nth-child(5){animation-delay:390ms}
body.d2opening .d2card .litcard > :nth-child(6){animation-delay:445ms}
body.d2opening .d2card .litcard > :nth-child(7){animation-delay:500ms}
body.d2opening .d2card .litcard > :nth-child(n+8){animation-delay:555ms}
/* everything you can press answers */
.d2card .mk i[data-v]{transition:transform .18s cubic-bezier(.3,1.6,.5,1),box-shadow .2s}
.d2card .mk i[data-v]:hover{transform:scale(1.18)}
.d2card .mk i.on.g,.d2card .mk i.on[data-v="g"]{box-shadow:0 0 0 2px rgba(34,212,95,.18),0 0 10px rgba(34,212,95,.55)}
.d2card .mk i.on.y,.d2card .mk i.on[data-v="y"]{box-shadow:0 0 0 2px rgba(239,188,22,.18),0 0 10px rgba(239,188,22,.55)}
.d2card .mk i.on.r,.d2card .mk i.on[data-v="r"]{box-shadow:0 0 0 2px rgba(255,59,71,.18),0 0 10px rgba(255,59,71,.5)}
@keyframes d2pop{0%{transform:scale(.7)}55%{transform:scale(1.32)}100%{transform:scale(1)}}
.d2card .mk i.d2pop{animation:d2pop .42s cubic-bezier(.3,1.6,.5,1)}
.d2card .litr2 .mxc{transition:background .15s;border-radius:6px}
.d2card .litr2 .mxc:hover{background:color-mix(in srgb,var(--acc) 6%,transparent)}
.d2card .litacts .litib > *{transition:transform .16s ease,background .16s ease;border-radius:7px}
.d2card .litacts .litib > *:hover{transform:translateY(-2px);background:color-mix(in srgb,var(--acc) 9%,transparent)}
.d2card .litacts .litib > *:active{transform:scale(.94)}
.d2card .tobook{position:relative;overflow:hidden;transition:transform .18s ease,box-shadow .18s ease}
.d2card .tobook:hover{transform:translateY(-1px);box-shadow:0 8px 18px -6px rgba(90,44,87,.55)}
.d2card .tobook::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:45%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.38),transparent);transform:skewX(-18deg);pointer-events:none}
.d2card .tobook:hover::after{animation:d2sheen .7s ease}
@keyframes d2sheen{to{left:130%}}
.d2card.cs-c .d2x{transition:transform .18s ease,box-shadow .18s ease,background .18s}
.d2card.cs-c .d2x:hover{transform:translateX(-50%) translateY(-2px);box-shadow:0 10px 20px rgba(0,0,0,.28)}
.d2card .d2x svg{transition:transform .25s ease}
.d2card .d2x:hover svg{transform:rotate(90deg)}
/* the red rule-out x: a drawn cross, centred in a 24px round button; on hover only the cross turns */
.d2card .litxc:not(.arm){width:24px!important;height:24px!important;padding:0!important;display:grid!important;place-items:center!important;transition:transform .18s ease}
.d2card .litxc:not(.arm) em{display:none!important}
.d2card .litxc svg{width:12px!important;height:12px!important;margin:0!important;transform-origin:50% 50%;transition:transform .25s ease}
.d2card .litxc svg path{stroke-width:1.8!important;stroke-linecap:round!important}
.d2card .litxc:not(.arm):hover{transform:scale(1.12)}
.d2card .litxc:not(.arm):hover svg{transform:rotate(90deg)}
@media (prefers-reduced-motion:reduce){
  .d2card .litpic img,body.d2opening .d2card .litcard > *,.d2card .mk i.d2pop,.d2card .tobook:hover::after,
  body.d2opening .d2body:has(> .d2card) .d2grid,body.d2opening.d2carding .d2list,body.d2opening.d2carding .d2ph,body.d2opening.d2carding #d2bar{animation:none!important}
  .d2card *{transition:none!important}
}
/* while a card is out, everything behind it goes soft and out of focus so the eye stays on the card */
.d2body:has(> .d2card) .d2grid,.d2body:has(> .d2card) .d2names{opacity:.85;filter:blur(4px) saturate(1.05)}
body.d2carding .d2list,body.d2carding .d2ph,body.d2carding #d2bar,body.d2carding .ckrow{opacity:.9;filter:blur(2px)}
.d2card{cursor:grab;touch-action:none}
.d2card.dragging{cursor:grabbing;box-shadow:0 30px 70px rgba(0,0,0,.32)!important;transition:none}
.d2card .d2grip{display:none}
.d2card .d2x{position:absolute;z-index:12;border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px;font:inherit}
.d2card .d2x svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round}
.d2card .d2x span{display:none}
/* A: a dark round button just outside the top-right corner */
.d2card.cs-a .d2x{right:-13px;top:-13px;width:30px;height:30px;border-radius:50%;background:#2A2027;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.25)}
.d2card.cs-a .d2x:hover{background:var(--acc)}
/* B: a slim grip bar to hold, the close at its right */
.d2card.cs-b .d2grip{display:flex;justify-content:center;align-items:center;height:16px;border-radius:14px 14px 0 0;background:var(--surf2)}
.d2card.cs-b .d2grip i{width:34px;height:4px;border-radius:4px;background:color-mix(in srgb,var(--mut) 45%,transparent)}
.d2card.cs-b .d2x{right:6px;top:1px;width:22px;height:14px;background:transparent;color:var(--mut)}
.d2card.cs-b .d2x svg{width:11px;height:11px}
.d2card.cs-b .d2x:hover{color:var(--acc)}
.d2card.cs-b .litrow,.d2card.cs-b .litpic{border-top-left-radius:0!important;border-top-right-radius:0!important}
/* C: a "Close" pill under the card, centred */
.d2card.cs-c .d2x{left:50%;bottom:-44px;transform:translateX(-50%);height:32px;padding:0 16px;border-radius:999px;background:#2A2027;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.25)}
.d2card.cs-c .d2x span{display:inline;font-size:12.5px;font-weight:600}
.d2card.cs-c{margin-bottom:56px}
/* D: a square button beside the card, level with its top, well clear of the rule-out mark */
.d2card.cs-d .d2x{right:-50px;top:0;width:38px;height:38px;border-radius:11px;background:var(--surf,#fff);color:var(--ink,#2A2027);border:1px solid var(--line);box-shadow:0 6px 18px rgba(0,0,0,.16)}
.d2card.cs-d .d2x svg{width:16px;height:16px}
.d2card.cs-d .d2x:hover{background:#2A2027;color:#fff}
/* E: a frosted round button on the photo's top-left corner (the rule-out mark keeps the right) */
.d2card.cs-e .d2x{left:10px;top:10px;width:32px;height:32px;border-radius:50%;background:rgba(24,16,22,.48);color:#fff;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 2px 8px rgba(0,0,0,.2)}
.d2card.cs-e .d2x:hover{background:rgba(24,16,22,.8)}
/* F: a "Close" tab standing on the card's top edge, at the left */
.d2card.cs-f{margin-top:30px}
.d2card.cs-f .d2x{left:18px;top:-29px;height:29px;padding:0 13px 0 11px;border-radius:10px 10px 0 0;background:var(--surf,#fff);color:var(--ink,#2A2027);box-shadow:0 -6px 12px rgba(0,0,0,.08)}
.d2card.cs-f .d2x span{display:inline;font-size:12px;font-weight:600}
.d2card.cs-f .d2x svg{width:12px;height:12px}
.d2card.cs-f .d2x:hover{color:var(--acc)}
/* G: a full-width "Close" bar along the bottom of the card */
.d2card.cs-g{display:flex;flex-direction:column}
.d2card.cs-g .d2x{position:static;order:9;width:100%;height:40px;border-top:1px solid var(--line);border-radius:0 0 14px 14px;background:var(--surf2);color:var(--ink,#2A2027)}
.d2card.cs-g .d2x span{display:inline;font-size:12.5px;font-weight:600;letter-spacing:.02em}
.d2card.cs-g .d2x svg{width:12px;height:12px}
.d2card.cs-g .d2x:hover{background:#2A2027;color:#fff}
.d2card.cs-g .litrow{border-radius:0!important}
.d2card.cs-g .d2on{order:8}
/* X (1.2.103, the default for every card): a dark round x on the photo's top-right corner - it only
   closes the card (the red "remove" x that sat there is gone) */
.d2card.cs-x .d2x{right:10px;top:10px;width:32px;height:32px;border-radius:50%;background:#2A2027;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.3)}
.d2card.cs-x .d2x svg{width:15px;height:15px}
.d2card.cs-x .d2x:hover{background:#000}
/* H: a slim plum strip to hold and drag, "Close" at its right */
.d2card.cs-h .d2grip{display:flex;align-items:center;height:30px;padding-left:14px;border-radius:14px 14px 0 0;background:var(--acc,#6b2a63)}
.d2card.cs-h .d2grip i{width:22px;height:10px;background:radial-gradient(circle,rgba(255,255,255,.7) 1.4px,transparent 1.6px) 0 0/5.5px 5px}
.d2card.cs-h .d2x{right:6px;top:3px;height:24px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,.14);color:#fff}
.d2card.cs-h .d2x span{display:inline;font-size:11.5px;font-weight:600}
.d2card.cs-h .d2x svg{width:11px;height:11px}
.d2card.cs-h .d2x:hover{background:rgba(255,255,255,.28)}
.d2card.cs-h .litrow,.d2card.cs-h .litpic{border-top-left-radius:0!important;border-top-right-radius:0!important}
.d2names{padding:0}
.d2maxb svg{width:14px!important;height:14px!important;stroke-width:2!important}
body.d2max #pane-dir{position:fixed;inset:0;z-index:90;background:var(--paper);padding:14px 18px;overflow:hidden;box-sizing:border-box}
body.d2max #d2bar{margin-top:0}
.d2start{align-items:center;justify-content:center}
.d2start{overflow:auto}
.d2st{position:relative;width:100%}
:has(> .d2sty.d2styfix){position:relative}
.d2start{padding-top:44px!important;box-sizing:border-box;align-items:safe center!important;justify-content:safe center!important}
.d2start > .d2st{margin-block:auto}
.d2sty.d2styfix{position:absolute;top:14px;right:16px;margin:0;z-index:3}
.d2s-a .d2st,.d2s-c .d2st,.d2s-e .d2st{max-width:960px}.d2s-b .d2st{max-width:760px}.d2s-d .d2st{max-width:1040px}.d2s-f .d2st{max-width:1180px}
.d2sty{display:flex;justify-content:flex-end;align-items:center;gap:3px;margin:-10px -6px 6px 0}
.d2sty span{font-size:11px;color:var(--mut);margin-right:5px}
.d2sty button{width:26px;height:24px;border:1px solid var(--line);border-radius:7px;background:var(--surf);color:var(--mut);font:600 11px var(--sans);cursor:pointer}
.d2sty button:hover{border-color:var(--acc);color:var(--acc)}
.d2sty button[aria-pressed="true"]{background:var(--acc);border-color:var(--acc);color:#fff}
/* A */
.d2sa{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;text-align:left}
.d2sac{background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:13px 15px 14px;display:flex;flex-direction:column;gap:2px}
.d2sac.big{grid-row:span 2}
.d2sah{display:flex;justify-content:space-between;align-items:baseline;border:0;background:transparent;padding:0;font:inherit;color:inherit;cursor:pointer;text-align:left}
.d2sah b{font-size:16px;font-weight:600}.d2sah em{font-style:normal;font-size:26px;font-weight:600;color:var(--acc)}
.d2sah:hover b{color:var(--acc)}
.d2sac small{font-size:11.5px;color:var(--mut);margin-bottom:8px}
.d2sach{display:flex;flex-wrap:wrap;gap:5px}
.d2sc{border:0;border-radius:999px;padding:3px 9px;background:color-mix(in srgb,var(--acc) 9%,var(--surf));color:var(--acc);font:500 11.5px var(--sans);cursor:pointer}
.d2sc:hover{background:var(--acc);color:#fff}.d2sc.more{background:transparent;border:1px dashed color-mix(in srgb,var(--acc) 35%,var(--line))}
/* B */
.d2sb{display:flex;align-items:center;gap:10px;height:58px;padding:0 18px;border-radius:16px;background:var(--surf);border:1.5px solid var(--acc);box-shadow:0 0 0 5px color-mix(in srgb,var(--acc) 10%,transparent)}
.d2sb svg{width:20px;height:20px;fill:none;stroke:var(--mut);stroke-width:2;flex:none}
.d2sb input{flex:1;border:0;outline:0;background:transparent;font:16px var(--sans);color:var(--ink);min-width:0}
.d2sbs{margin-top:6px;background:var(--surf);border:1px solid var(--line);border-radius:12px;padding:6px;text-align:left;box-shadow:0 10px 26px -14px rgba(27,23,36,.3)}
.d2sbi{display:flex;width:100%;align-items:baseline;gap:10px;padding:8px 10px;border:0;border-radius:8px;background:transparent;font:13px var(--sans);color:inherit;cursor:pointer;text-align:left}
.d2sbi:hover{background:color-mix(in srgb,var(--acc) 8%,var(--surf))}
.d2sbi i{font-style:normal;font-size:9.5px;font-weight:700;letter-spacing:.08em;color:var(--mut);width:58px;flex:none}
.d2sbi small{color:var(--mut)}.d2sbn{margin:6px 10px;font-size:13px;color:var(--mut)}
.d2sbp{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:20px}
.d2sbr{display:inline-flex;gap:5px;align-items:baseline;border:1px solid var(--line);background:var(--surf);border-radius:999px;padding:6px 13px;font:13px var(--sans);color:inherit;cursor:pointer}
.d2sbr s{text-decoration:none;color:var(--mut);font-size:12px}.d2sbr:hover{border-color:var(--acc);color:var(--acc)}
/* C */
.d2scb{display:flex;height:64px;border-radius:12px;overflow:hidden;margin-top:6px}
.d2scb button{border:0;min-width:24px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:0 10px;color:#fff;font:inherit;cursor:pointer;overflow:hidden;white-space:nowrap;transition:filter .12s}
.d2scb button:hover{filter:brightness(1.12)}.d2scb b{font-size:14px}.d2scb s{text-decoration:none;font-size:12px;opacity:.9}
.d2scl{display:flex;flex-wrap:wrap;gap:4px 14px;justify-content:center;margin:8px 0 16px;font-size:11.5px;color:var(--mut)}
.d2scc{background:var(--surf);border:1px solid var(--line);border-radius:12px;padding:14px 16px;text-align:left}
.d2scc h4{margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--acc)}
.d2scr{display:grid;grid-template-columns:170px 1fr 40px;gap:10px;align-items:center;width:100%;border:0;background:transparent;padding:4px 0;font:13px var(--sans);color:inherit;cursor:pointer;text-align:left}
.d2scr i{display:block;height:8px;border-radius:4px;background:color-mix(in srgb,var(--acc) 55%,var(--surf))}
.d2scr s{text-decoration:none;color:var(--mut);font-size:12px;text-align:right}.d2scr:hover span{color:var(--acc)}
/* D */
.d2sd{display:grid;grid-template-columns:1.1fr 1fr;gap:16px;text-align:left}
.d2sdb{background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.d2sdb h4{margin:6px 0 8px;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}
.d2sdb h4:not(:first-child){margin-top:18px}
.d2sdi{display:flex;width:100%;align-items:center;gap:10px;padding:8px 2px;border:0;border-bottom:1px solid var(--line2,var(--line));background:transparent;font:13px var(--sans);color:inherit;cursor:pointer;text-align:left}
.d2sdi b{flex:1;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.d2sdi small{color:var(--mut);flex:none}
.d2sdi:hover b{color:var(--acc)}
.d2sdi .lamp{width:9px;height:9px;border-radius:50%;background:var(--ngn,#22D45F);box-shadow:0 0 6px var(--ngn,#22D45F);flex:none}
.d2sdn{margin:2px 0 6px;font-size:12.5px;color:var(--mut)}
.d2sdr{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.d2sd .d2all{display:block;margin:14px auto 0}
/* E */
.d2se{position:relative;height:420px;margin-top:4px}
.d2seb{position:absolute;transform:translate(-50%,-50%);border:0;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;
  color:#fff;font:inherit;cursor:pointer;background:color-mix(in srgb,var(--acc) calc(100% - var(--k) * 11%),#fff);box-shadow:0 10px 24px -8px color-mix(in srgb,var(--acc) 55%,transparent);transition:transform .15s}
.d2seb:hover{transform:translate(-50%,-50%) scale(1.06)}.d2seb b{font-size:13px;padding:0 6px}.d2seb s{text-decoration:none;font-size:20px;font-weight:600}
.d2sen{margin:0}
/* F */
.d2sf{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}
.d2sft{position:relative;aspect-ratio:3/4.2;border:0;border-radius:14px;overflow:hidden;padding:0;background:var(--surf2);cursor:pointer;color:#fff;font:inherit;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;text-align:left}
.d2sfp{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:1px}
.d2sfp i{position:relative;overflow:hidden;background:var(--surf2)}
.d2sfp i img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 20%}
.d2sfp .litpic{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;margin:0!important;border-radius:0!important}
.d2sfp .litpic img{width:100%;height:100%;object-fit:cover}
.d2sfp :is(.picfall,.picsrc,.picx,.piccopy,.illupf){display:none!important}
.d2sft::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 45%,rgba(30,12,30,.78));pointer-events:none}
.d2sft b,.d2sft s{position:relative;z-index:1;padding:0 14px}.d2sft b{font-size:17px}.d2sft s{text-decoration:none;font-size:12px;opacity:.9;padding-bottom:13px}
.d2sft:hover{outline:2px solid var(--acc);outline-offset:2px}
@media (max-width:900px){.d2sa{grid-template-columns:1fr 1fr}.d2sd{grid-template-columns:1fr}}
.d2st{max-width:720px;text-align:center;padding:30px}
.d2st h2{margin:0 0 8px;font-size:22px;font-weight:500}
.d2st p{margin:0 0 22px;color:var(--mut);font-size:14px;line-height:1.5}
.d2rg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.d2rb{display:flex;flex-direction:column;gap:3px;align-items:flex-start;padding:14px 16px;border-radius:12px;border:1px solid var(--line);background:var(--surf2);color:inherit;font:inherit;cursor:pointer;text-align:left}
.d2rb:hover{border-color:color-mix(in srgb,var(--acc) 40%,transparent);background:var(--wash)}
.d2rb b{font-size:15px;font-weight:600}.d2rb s{text-decoration:none;font-size:12px;color:var(--mut)}
.d2all{margin-top:16px;border:0;background:transparent;color:var(--acc);font:inherit;font-size:13px;cursor:pointer;text-decoration:underline}
.d2bpick{position:relative;display:inline-flex;align-items:center;gap:10px}
.d2bbtn{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 12px;border-radius:9px;border:1px solid transparent;background:var(--surf2);color:inherit;font:inherit;font-size:13px;cursor:pointer;max-width:420px}
.d2bbtn i{font-style:normal;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
.d2bbtn b{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d2bbtn s{text-decoration:none;color:var(--mut);font-size:12px}
.d2bbtn svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2.5;flex-shrink:0}
.d2bbtn[aria-expanded="true"]{border-color:color-mix(in srgb,var(--acc) 35%,transparent);background:var(--wash)}
.d2bpick em{font-style:normal;font-size:12px;color:var(--mut)}
.d2bmenu{position:absolute;left:0;top:40px;z-index:30;width:360px;max-height:420px;overflow:auto;padding:6px;border-radius:12px;border:1px solid var(--line);background:var(--surf);box-shadow:0 14px 34px rgba(0,0,0,.14)}
.d2bg{padding:4px 0}.d2bg+.d2bg{border-top:1px solid var(--line)}
.d2bg>b{display:block;padding:6px 10px 4px;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
.d2bo{display:flex;width:100%;align-items:center;gap:8px;padding:7px 10px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:13px;text-align:left;cursor:pointer}
.d2bo:hover{background:var(--surf2)}.d2bo.on{background:var(--wash);color:var(--acc);font-weight:600}
.d2bo span{flex-grow:1}.d2bo s{text-decoration:none;color:var(--mut);font-size:12px;font-weight:400}
.d2blank{flex-grow:1;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center}
.d2home{display:flex;align-items:center;gap:12px}
.d2home .d2sty{margin:0}
.d2homeb{height:28px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:var(--surf);color:var(--acc);font:600 12px var(--sans);cursor:pointer}
.d2homeb:hover{border-color:var(--acc);background:color-mix(in srgb,var(--acc) 8%,var(--surf))}
.d2blank p{margin:0;font-size:13px;color:var(--faint,var(--mut));opacity:.75}
.d2empty{padding:40px 20px;text-align:center;opacity:.8}.d2empty h2{margin:0 0 6px;font-size:18px;font-weight:500}
@media (max-width:900px){.d2list{width:220px}.d2wrap{height:auto}}
`;
  (document.body || document.head).appendChild(css);
  /* the bar appears as soon as the Directory is opened */
  const init = () => { if(document.getElementById('pane-dir')){ bar(); try{ if(localStorage.getItem('illu.d2max')) setMax(true); }catch(e){} } else setTimeout(init, 300); };
  setInterval(() => { if(D2.max && VIEW !== 'dir'){ D2.max = false; document.body.classList.remove('d2max'); const b = document.querySelector('[data-d2max]'); if(b){ b.setAttribute('aria-pressed', 'false'); b.querySelector('span').textContent = 'Maximize'; } } }, 500);
  init();
})();

/* ===== the one card's look (1.2.95): "B · Photo first", chosen by the user 6 Nov 2026 ===== */
(function(){
  const css = document.createElement('style');
  css.textContent = `
.uc{container-type:inline-size;position:relative;display:flex;flex-direction:column;border-radius:16px;overflow:hidden;background:var(--surf,#fff);box-shadow:0 1px 2px rgba(20,10,30,.06),0 8px 22px -12px rgba(20,10,30,.28);min-width:0;contain:layout paint}
@property --ucbka{syntax:'<angle>';inherits:false;initial-value:0deg}
.uc.ucbk{padding:3px;background:conic-gradient(from var(--ucbka),#2A0F33,#6B2E7A,#B07CC6,#E6D3F0,#B07CC6,#6B2E7A,#2A0F33);animation:ucbkspin 5s linear infinite;contain:layout}
.uc.ucbk>.ucimg{border-radius:13px 13px 0 0;overflow:hidden}
.uc.ucbk>:not(.ucimg):not(.ucbkt){background-color:var(--surf,#fff)}
.uc.ucbk>:last-child{border-radius:0 0 13px 13px}
.uc .ucbkt{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:6;max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#fff;background:#4A1D57;border-radius:999px;padding:3px 9px;box-shadow:0 0 0 2px rgba(255,255,255,.85)}
@keyframes ucbkspin{to{--ucbka:360deg}}
@media (prefers-reduced-motion:reduce){.uc.ucbk{animation:none}}
.uc .ucimg{position:relative;aspect-ratio:3/4;background:#1a141d}
.uc .ucph.d2t{position:absolute;inset:0;aspect-ratio:auto;border-radius:0!important;box-shadow:none!important;transform:none!important;background:#1a141d}
.uc .ucph img{width:100%;height:100%;object-fit:cover;object-position:center 20%}
/* 1.2.192 (user, 14 Nov 2026, picked D of "Card Hover Styles"): on Suggestiones and the Directory a card under the mouse
   lifts a little, a soft pearl light runs slowly around its edge, the top of the photo gets a gloss and the photo zooms
   gently. Mouse only; nothing moves for "reduce motion". */
@property --ucrim{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes ucrim{to{--ucrim:360deg}}
.rc2grid .uc,.d2grid .uc{transition:transform .28s cubic-bezier(.2,.8,.2,1),box-shadow .28s ease}
.rc2grid .uc::after,.d2grid .uc::after{content:"";position:absolute;inset:0;z-index:6;border-radius:inherit;padding:2.5px;pointer-events:none;opacity:0;transition:opacity .3s;
  background:conic-gradient(from var(--ucrim),#E9C6DE,#fff,#C9B2F0,#fff,#F3D9B0,#fff,#E9C6DE);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}
.rc2grid .uc .ucimg::after,.d2grid .uc .ucimg::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0) 35%);opacity:0;transition:opacity .3s}
.rc2grid .uc .ucph img,.d2grid .uc .ucph img{transition:transform .6s cubic-bezier(.2,.8,.2,1)}
@media (hover:hover) and (pointer:fine){
  /* 1.2.195 (user, 14 Nov 2026, hover demo: "let's go with C"): a soft lilac glow instead of the pearl rim (D) */
  .rc2grid .uc:hover,.d2grid .uc:hover{transform:translateY(-4px);box-shadow:0 0 0 1px rgba(107,46,106,.25),0 0 22px 4px rgba(190,120,200,.45),0 14px 30px rgba(20,10,30,.18)}
  [data-theme="dark"] .rc2grid .uc:hover,[data-theme="dark"] .d2grid .uc:hover,[data-theme="dim"] .rc2grid .uc:hover,[data-theme="dim"] .d2grid .uc:hover{box-shadow:0 0 0 1px rgba(215,166,210,.35),0 0 24px 5px rgba(200,140,210,.38),0 14px 30px rgba(0,0,0,.4)}
  .rc2grid .uc:hover::after,.d2grid .uc:hover::after{opacity:0;animation:none}
  .rc2grid .uc:hover .ucimg::after,.d2grid .uc:hover .ucimg::after{opacity:1}
  .rc2grid .uc:hover .ucph img,.d2grid .uc:hover .ucph img{transform:scale(1.04)}
}
@media (prefers-reduced-motion:reduce){.rc2grid .uc:hover,.d2grid .uc:hover{transform:none}.rc2grid .uc:hover::after,.d2grid .uc:hover::after{animation:none}.rc2grid .uc:hover .ucph img,.d2grid .uc:hover .ucph img{transform:none}}
.uc .ucov{position:absolute;left:0;right:0;bottom:0;padding:44px 12px 10px;background:linear-gradient(rgba(10,6,14,0),rgba(10,6,14,.55) 45%,rgba(10,6,14,.82));color:#fff;pointer-events:none;display:flex;flex-direction:column;gap:1px;font-family:var(--sans,Inter,system-ui,sans-serif)}
.uc .ucov b{font-size:14.5px;font-weight:600;letter-spacing:-.005em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uc .ucag{font-size:12px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uc .ucmomt{display:inline-block;align-self:flex-start;margin:0 0 4px;font-size:9.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;line-height:1;padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.92);color:var(--acc)}
.uc .ucav{align-self:flex-start;display:inline-block;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#A3283F;color:#fff;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;margin-bottom:3px;text-shadow:none;letter-spacing:.02em;text-transform:uppercase}.uc .ucav.later{background:#C97916}
.mrow .mav{font-size:10px;font-weight:700;border-radius:999px;padding:1px 6px;margin-left:6px;background:#FBECEF;color:#A3283F;white-space:nowrap}.mrow .mav.later{background:#FDF1E1;color:#9A5A0A}
/* 1.2.186 (user, 14 Nov 2026, chose option B): the booking label smaller - 8.5px, medium weight, slimmer pill; an all-capitals name shows as Daniel */
.uc .ucwk{align-self:flex-start;display:inline-block;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#FFF1E6;color:#7A3B10;border-radius:999px;padding:1px 6px;font-size:8.5px;font-weight:600;margin-bottom:4px;text-shadow:none;letter-spacing:.01em;text-transform:none}
.uc .ucmx{align-self:flex-start;max-width:100%;box-sizing:border-box;margin-top:7px;display:inline-flex;align-items:baseline;gap:4px;font-size:12px;font-weight:500;letter-spacing:-.01em;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.16);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);white-space:nowrap;overflow:hidden;font-variant-numeric:tabular-nums}
.uc .ucmx i{font-style:normal;opacity:.5}
.uc .ucmx small{font-size:9.5px;opacity:.7;margin-left:2px;letter-spacing:.02em}
.uc .ucmx .in{color:#9be8b6;font-weight:700}
.uc .ucmx.none{opacity:.75;font-weight:400}
.uc .ucbadge{position:absolute;top:8px;left:8px;font-size:10.5px;font-weight:700;letter-spacing:.03em;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.9);color:var(--acc);pointer-events:none}
.uc .ucft{height:50px;flex:none;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 8px 0 12px;background:var(--surf,#fff);font-family:var(--sans,Inter,system-ui,sans-serif)}
.uc .ucft em{font-style:normal;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;color:var(--faint,#77707f);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.uc .ucft .mk{display:flex!important;gap:6px;flex:none;margin:0!important;position:static!important;transform:none!important;width:auto!important;height:auto!important;background:none!important;padding:0!important;border:0!important;box-shadow:none!important}
.uc .ucft .mk i[data-v]{width:32px!important;height:32px!important;min-width:0!important;flex:none!important;border-radius:50%!important;border:1.5px solid var(--line,#e6e0ea)!important;background:var(--surf,#fff)!important;box-shadow:none!important;display:grid!important;place-items:center;font-style:normal;font-size:0!important;cursor:pointer;margin:0!important;padding:0!important;position:relative;transform:none!important;transition:background .15s,border-color .15s}
.uc .ucft .mk i[data-v]::before{content:none!important;display:none!important}
.uc .ucft .mk i[data-v]::after{position:static!important;display:block!important;opacity:1!important;background:none!important;transform:none!important;width:auto!important;height:auto!important;border:0!important;box-shadow:none!important;font-size:14px!important;font-weight:700;line-height:1}
.uc .ucft .mk i[data-v="g"]::after{content:"\\2713"!important;color:#2f8a57}
.uc .ucft .mk i[data-v="y"]::after{content:"?"!important;color:#c68a00}
.uc .ucft .mk i[data-v="r"]::after{content:"\\2715"!important;color:#b4332b;font-size:12px!important}
.uc .ucft .mk i[data-v]:hover{border-color:currentColor!important}
.uc .ucft .mk i[data-v="g"].on{background:#2f8a57!important;border-color:#2f8a57!important}
.uc .ucft .mk i[data-v="y"].on{background:#c68a00!important;border-color:#c68a00!important}
.uc .ucft .mk i[data-v="r"].on{background:#b4332b!important;border-color:#b4332b!important}
.uc .ucft .mk i[data-v].on::after{color:#fff!important}
.uc .ucft .mk .lcn{display:none!important}
.uc .ucmx.tight{font-size:11px;gap:2px;padding:4px 7px}.uc .ucmx.tight small{display:none}
@container (max-width:176px){.uc .ucft em{display:none}.uc .ucft{justify-content:center;padding:0 6px}}
@container (max-width:150px){.uc .ucft .mk i[data-v]{width:28px!important;height:28px!important}.uc .ucov{padding:34px 9px 8px}.uc .ucmx{font-size:11px;padding:3px 7px}}
.d2grid:has(.uc){grid-template-columns:repeat(auto-fill,minmax(calc(186px * var(--pz,1)),1fr))!important;gap:16px!important}
/* 1.2.194 worked-on marking (A + B): agency rows and the roster */
.d2ag{position:relative}
.d2ag.wkl::before,.d2ag.wkd::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:0 3px 3px 0;background:var(--wkc)}
.d2ag.wkl{--wkc:#E07B1A;--wkt:#C2620C}.d2ag.wkd{--wkc:#2E8A57;--wkt:#2E8A57}
[data-theme="dark"] .d2ag.wkl,[data-theme="dim"] .d2ag.wkl{--wkt:#F0A960}[data-theme="dark"] .d2ag.wkd,[data-theme="dim"] .d2ag.wkd{--wkt:#7CD06A}
.d2ag.wkl .d2agt s,.d2ag.wkd .d2agt s{opacity:1;color:var(--mut,#6d6577)}
.d2ag.wkl .d2agt s,.d2ag.wkd .d2agt s{line-height:20px}
.d2agt s .wkavs{display:inline-flex;vertical-align:middle;margin:-2px 5px 0 0}
.wkavs .iddisc{width:17px;height:17px;font-size:8px;border-width:1.5px;margin-left:-5px;flex:none}
.wkavs .iddisc:first-child{margin-left:0}
.d2agt s .wkt{font-style:normal;font-weight:700;color:var(--wkt)}
.d2agt s .wkt i,.ucwkt>i{display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;margin-right:4px;vertical-align:1px}
.d2agt s .wksep{text-decoration:none;margin:0 4px}
.d2list .d2ag.on.wkl .d2agt s,.d2list .d2ag.on.wkd .d2agt s{color:#fff}.d2list .d2ag.on .d2agt s .wkt{color:#fff}
.d2wkh{grid-column:1/-1;display:flex;align-items:center;gap:7px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--acc,#6B2E6A);margin:2px 0 -4px}
.d2wkh i{width:7px;height:7px;border-radius:50%;background:#E07B1A}
.d2wkh.rest{color:var(--mut,#6d6577);margin-top:10px}
.d2wkh+.uc~.d2wkh:not(.rest){margin-top:10px}
.d2wkh.mdih{color:#9a7526}.d2wkh.mdih i{background:#c9a24a}
/* 1.2.219 MDI Agency Contacts: gold corner ribbon (option C, approved 17 Nov 2026) */
.d2agw.mdiw .d2ag{position:relative;overflow:hidden}
.d2agw.mdiw .d2ag:after{content:"MDI";position:absolute;top:9px;left:-21px;width:70px;transform:rotate(-45deg);background:#c9a24a;color:#fff;font:800 8px/14px Inter,system-ui,sans-serif;letter-spacing:.08em;text-align:center;box-shadow:0 1px 2px rgba(0,0,0,.2);pointer-events:none}
.d2agw.mdiw .d2agt{padding-left:10px}
.mdihd{position:relative;display:inline-flex;align-items:center;height:26px;padding:0 16px 0 11px;background:#c9a24a;color:#fff;font:700 11px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;white-space:nowrap;clip-path:polygon(0 0,100% 0,calc(100% - 9px) 50%,100% 100%,0 100%);max-width:100%;overflow:hidden;text-overflow:ellipsis;cursor:default}
.d2mdif{white-space:nowrap;flex:0 0 auto}
.d2mdik{display:inline-flex;align-items:center;gap:4px;margin-left:8px;flex-wrap:wrap}
.d2mdik button{border:1px solid var(--line,#e6dfe3);background:var(--surf,#fff);color:inherit;font:600 11.5px/1 Inter,system-ui,sans-serif;border-radius:999px;padding:5px 10px;cursor:pointer;white-space:nowrap}
.d2mdik button s{text-decoration:none;opacity:.6;font-weight:700}
.d2mdik button[aria-pressed="true"]{background:#c9a24a;border-color:#c9a24a;color:#fff}
.mlt{text-decoration:none;font-weight:700}.mlt.rep{color:#23794A}.mlt.sent{color:#1F5FBF}.mlt.recv{color:#8A6A00}
.d2list .d2ag.on .mlt{color:#fff}
.mlhd{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:999px;font:700 11px/1 Inter,system-ui,sans-serif;letter-spacing:.05em;white-space:nowrap;cursor:default}
.mlhd.rep{background:#E3F4E8;color:#23794A}.mlhd.sent{background:#E7F0FF;color:#1F5FBF}.mlhd.recv{background:#FFF6D6;color:#6B5200}
@media (max-width:760px){.mlhd{height:auto;min-height:22px;padding:3px 9px;white-space:normal;line-height:1.3;font-size:10px}}
.newtag{display:inline-flex;align-items:center;margin-left:7px;padding:1px 7px;border-radius:999px;background:#E7F0FF;color:#1F5FBF;font:800 10px/16px Inter,system-ui,sans-serif;letter-spacing:.06em;vertical-align:2px;white-space:nowrap}
.newtag i{font-style:normal;font-weight:600;letter-spacing:0;opacity:.8}
.newtag.hd{font-size:11px;line-height:20px;padding:2px 9px;vertical-align:0}
.d2ag.on .newtag{background:rgba(255,255,255,.9)}
@media (max-width:760px){.mdihd{height:auto;min-height:24px;padding:4px 16px 4px 9px;white-space:normal;line-height:1.3;font-size:10px}}
.d2mdif .mdif{display:inline-block;width:0;height:0;border-left:8px solid #c9a24a;border-bottom:8px solid transparent;margin-right:6px;vertical-align:1px}
.d2mdif .d2mdin{font-style:normal;opacity:.7;font-weight:700}
.d2mdif.on{background:#c9a24a;border-color:#c9a24a;color:#fff}.d2mdif.on .mdif{border-left-color:#fff}
.uc.ucmdi .ucmdir{position:absolute;top:12px;left:-26px;z-index:8;width:92px;transform:rotate(-45deg);background:#c9a24a;color:#fff;font:800 10px/18px Inter,system-ui,sans-serif;letter-spacing:.12em;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.3);pointer-events:none}
.uc .ucwkt{position:absolute;top:8px;left:8px;z-index:7;max-width:calc(100% - 16px);display:inline-flex;align-items:center;gap:4px;padding:3px 9px 3px 3px;border-radius:999px;background:rgba(255,255,255,.94);box-shadow:0 1px 4px rgba(20,10,30,.18);font:700 10.5px var(--sans,Inter,system-ui,sans-serif);white-space:nowrap;pointer-events:auto}
.uc .ucwkt.l{color:#C2620C}.uc .ucwkt.d{color:#2E8A57}
.uc .ucwkt>span:last-child{color:#2b2230;overflow:hidden;text-overflow:ellipsis}
.uc .ucwkt>i{margin-right:0}
.uc .ucwkt .wkavs .iddisc{width:18px;height:18px}
.uc .ucwkt:not(:has(.wkavs)){padding-left:8px}
.uc.ucw-l .ucbadge,.uc.ucw-d .ucbadge{top:38px}
/* 1.2.208: one status pill for every status (option A) */
.uc .ucft .ucst{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px 0 4px;border-radius:999px;margin-left:auto;min-width:0;flex:0 1 auto;max-width:100%;overflow:hidden;font:700 11.5px var(--sans,Inter,system-ui,sans-serif);white-space:nowrap;cursor:default;background:var(--stb);color:var(--stt)}
.uc .ucft .ucst.ok{--stb:#E3F4E8;--stt:#23794A}.uc .ucft .ucst.or{--stb:#FFF1E6;--stt:#C2620C}.uc .ucft .ucst.bad{--stb:#FBE7E6;--stt:#B4332B}
[data-theme="dark"] .uc .ucft .ucst.ok,[data-theme="dim"] .uc .ucft .ucst.ok{--stb:#1E3324;--stt:#8FD3A4}[data-theme="dark"] .uc .ucft .ucst.or,[data-theme="dim"] .uc .ucft .ucst.or{--stb:#3A2A18;--stt:#F0A960}[data-theme="dark"] .uc .ucft .ucst.bad,[data-theme="dim"] .uc .ucft .ucst.bad{--stb:#3A1F1E;--stt:#F08A80}
.uc .ucft .ucst .tx{overflow:hidden;text-overflow:ellipsis;min-width:0}.uc .ucft .ucst b{font-weight:600}
.uc .ucft .ucst:not(:has(.wkavs)){padding-left:9px}
.uc .ucft .ucst .wkavs{display:inline-flex;flex:none}.uc .ucft .ucst .wkavs .iddisc{width:18px;height:18px;font-size:8px}
.uc .ucft .ucst .wd2{font-weight:600;opacity:.85}
@container (max-width:188px){.uc .ucft .ucst .wd,.uc .ucft .ucst .wd2{display:none}.uc .ucft .ucst{gap:4px;padding-right:8px}}
/* 1.2.199 option C: the status on the line under the photo */
.uc .ucft .ucwks{display:inline-flex;align-items:center;gap:4px;min-width:0;flex:0 1 auto;margin-left:auto;font:600 11px var(--sans,Inter,system-ui,sans-serif);white-space:nowrap;cursor:default}
.uc .ucft .ucwks i{width:6px;height:6px;border-radius:50%;flex:none;background:#E07B1A}
.uc .ucft .ucwks.d i{background:#2E9A5F}
.uc .ucft .ucwks b{font-weight:700;overflow:hidden;text-overflow:ellipsis;min-width:0;color:#C2620C}
.uc .ucft .ucwks.d b{color:#2E8A57}
[data-theme="dark"] .uc .ucft .ucwks b,[data-theme="dim"] .uc .ucft .ucwks b{color:#F0A960}[data-theme="dark"] .uc .ucft .ucwks.d b,[data-theme="dim"] .uc .ucft .ucwks.d b{color:#7CD06A}
.uc .ucft .ucwks .wkavs .iddisc{width:16px;height:16px;font-size:7.5px}
.uc .ucft.haswk em:empty{display:none}
.uc .ucft.haswk{justify-content:flex-start}
/* 1.2.199 (user, 15 Nov 2026: "overlapping ... the booking label and the timeslot of when the card was activated"): on a card
   on the Team Vote the date + clock strip keeps the top of the photo; the tag sits just under it. The small circle of who sent
   her to the vote is not repeated when the tag is the vote's (it shows that person); on a booking tag it moves below the tag. */
.uc:has(.ucimg > .ivstrip) > .ucwkt{top:35px}
.uc.ucw-v .ivtop .ivfirst{display:none}
.uc.ucw-l:not(.ucw-v) .ucimg > .ivtop,.uc.ucw-d:not(.ucw-v) .ucimg > .ivtop{top:36px}
.uc.ucw-l:not(.ucw-v) .ucimg:has(> .ivstrip) > .ivtop,.uc.ucw-d:not(.ucw-v) .ucimg:has(> .ivstrip) > .ivtop{top:63px}
.uc:has(.ucimg > .ivstrip).ucw-l .ucbadge,.uc:has(.ucimg > .ivstrip).ucw-d .ucbadge{top:63px}
.uc.ucw-l .uccnt,.uc.ucw-d .uccnt{top:38px}
@container (max-width:150px){.uc .ucwkt{font-size:9.5px;padding-right:7px}}

/* 1.2.112: "Use as card photo" on a slide */
.d2sl .d2slmain{position:absolute;left:50%;transform:translateX(-50%);bottom:44px;z-index:4;height:30px;border:0;border-radius:999px;padding:0 14px;background:rgba(20,14,24,.78);color:#fff;font:600 12px var(--sans,Inter,system-ui,sans-serif);cursor:pointer;white-space:nowrap;backdrop-filter:blur(6px);box-shadow:0 4px 14px rgba(0,0,0,.25)}
.d2sl .d2slmain:hover{background:var(--acc,#5A2C57)}
.d2sl .d2slhide{position:absolute;left:12px;bottom:44px;z-index:4;height:30px;border:0;border-radius:999px;padding:0 13px;background:rgba(20,14,24,.62);color:#fff;font:600 12px var(--sans,Inter,system-ui,sans-serif);cursor:pointer;backdrop-filter:blur(6px)}
.d2sl .d2slhide:hover{background:#A3283F}
.d2card.d2full .d2sl .d2slhide{bottom:20px;left:16px}
@media (max-width:560px){.d2sl .d2slhide{bottom:82px}.d2card.d2full .d2sl .d2slhide{bottom:58px;left:12px}}
.d2sl .d2slhide.und{background:#2b2230}.d2sl .d2slhide.und:hover{background:var(--acc,#5A2C57)}.d2sl .d2slhide.und u{text-underline-offset:2px}
.d2sl .d2slmain.back{background:rgba(255,255,255,.88);color:#3a2c3f}
.d2card.d2full .d2sl .d2slmain{bottom:20px}
`;
  document.head.appendChild(css);
})();

/* 1.2.146 (user, 12 Nov 2026): "I asked to be able to input the Country for the agency in the event you weren't able to
   determine it". An agency with no country shows "+ Set country" on its row in the list and in its header; a placed
   agency's place in the header opens the same form to change it. Saved for everyone in agloc/<domain> (agLocSave,
   the same as the Contacts box fields); the region follows from the country. */
(function(){
  const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  function close(){ const p = document.getElementById('d2locpop'); if(p) p.remove(); }
  function open(btn){
    close();
    const dom = btn.dataset.d2loc; if(!dom) return;
    let v = {country: '', city: ''}; try{ v = agLocOf(dom); }catch(e){}
    const p = document.createElement('form'); p.id = 'd2locpop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Agency place');
    p.innerHTML = '<b>Where is this agency?</b><s>' + E(dom) + '</s>' +
      '<label><span>Country</span><input name="country" list="worldcc" autocomplete="off" placeholder="e.g. Denmark" value="' + E(v.country) + '"></label>' +
      '<label><span>City</span><input name="city" autocomplete="off" placeholder="e.g. Copenhagen" value="' + E(v.city) + '"></label>' +
      '<em class="d2locrg"></em><div class="d2locb2"><button type="button" class="d2locx">Cancel</button><button type="submit" class="d2locok">Save</button></div>';
    document.body.appendChild(p);
    const r = btn.getBoundingClientRect(), W = 300;
    p.style.left = Math.max(8, Math.min(innerWidth - W - 8, r.left)) + 'px';
    p.style.top = Math.max(8, Math.min(innerHeight - 260, r.bottom + 6)) + 'px';
    const c = p.querySelector('[name=country]'), rg = p.querySelector('.d2locrg');
    const paintRg = () => { try{ rg.textContent = c.value.trim() ? 'Region: ' + regionFor(worldName(c.value)) : ''; }catch(e){} };
    c.addEventListener('input', paintRg); paintRg(); c.focus(); c.select();
    p.querySelector('.d2locx').addEventListener('click', close);
    p.addEventListener('submit', async e => {
      e.preventDefault();
      const cv = c.value.trim(), ct = p.querySelector('[name=city]').value.trim();
      if(!cv){ c.focus(); return; }
      try{ if(typeof SIGNED === 'function' && !SIGNED()){ try{ nudgeSignIn(btn); }catch(_){} return; } }catch(_){}
      p.querySelector('.d2locok').disabled = true;
      try{ await agLocSave(dom, 'country', cv); await agLocSave(dom, 'city', ct); }catch(err){ console.error(err); }
      close();
    });
    p.addEventListener('keydown', e => { if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); } });
  }
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('[data-d2loc]');
    if(b){ e.stopPropagation(); return; }                // not the background click that closes cards or the board
    const p = document.getElementById('d2locpop'); if(p && !p.contains(e.target)) close();
  }, true);
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-d2loc]');
    if(b){ e.preventDefault(); e.stopPropagation(); open(b); }
  }, true);
  const st = document.createElement('style');
  st.textContent = `
.d2locset{border:1px dashed var(--acc,#5A2C57);background:var(--accbg,#F3ECF3);color:var(--acc,#5A2C57);font:600 12px var(--sans,Inter,system-ui,sans-serif);border-radius:999px;padding:2px 10px;cursor:pointer}
.d2locset:hover{background:var(--acc,#5A2C57);color:#fff}
.d2locedit{border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px}
.d2locedit:hover{color:var(--acc,#5A2C57)}
.d2agw .d2locb{position:absolute;right:44px;bottom:7px;z-index:2;border:1px dashed currentColor;background:var(--surf,#fff);color:var(--acc,#5A2C57);font:600 11px var(--sans,Inter,system-ui,sans-serif);border-radius:999px;padding:1px 8px;cursor:pointer;line-height:16px}
.d2agw .d2ag.on ~ .d2locb{border-color:#fff}
.d2agw .d2locb:hover{background:var(--acc,#5A2C57);color:#fff;border-style:solid}
#d2locpop{position:fixed;z-index:3000;width:300px;box-sizing:border-box;background:var(--surf,#fff);border:1px solid var(--line,#E7E2EC);border-radius:14px;box-shadow:0 18px 44px rgba(20,10,30,.22);padding:14px;display:flex;flex-direction:column;gap:9px;font:13px var(--sans,Inter,system-ui,sans-serif);color:var(--ink,#211C26)}
#d2locpop > s{text-decoration:none;color:var(--mut,#6D6577);font-size:12px;margin-top:-6px}
#d2locpop label{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--mut,#6D6577)}
#d2locpop input{height:36px;box-sizing:border-box;border:1px solid var(--line,#E7E2EC);border-radius:9px;padding:0 10px;font:500 14px var(--sans,Inter,system-ui,sans-serif);color:var(--ink,#211C26);background:var(--surf,#fff)}
#d2locpop input:focus{outline:2px solid var(--acc,#5A2C57);outline-offset:-1px}
#d2locpop .d2locrg{font-style:normal;font-size:12px;color:var(--acc,#5A2C57);min-height:14px}
#d2locpop .d2locb2{display:flex;gap:8px;justify-content:flex-end}
#d2locpop .d2locb2 button{height:34px;border-radius:9px;padding:0 14px;font:600 13px var(--sans,Inter,system-ui,sans-serif);cursor:pointer;border:1px solid var(--line,#E7E2EC);background:var(--surf,#fff);color:var(--ink,#211C26)}
#d2locpop .d2locb2 .d2locok{background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57);color:#fff}`;
  document.head.appendChild(st);
})();

/* 1.2.148 (user, 12 Nov 2026: "allow me to rotate the photos on all slideshow displays"): ⟲ ⟳ on the model card's
   slideshow (card and full view) and on the full-screen photo view of the other boards. A turn is kept for everyone in
   docs prot/<id> {u, r, by, at} - u is the photo's own address (without the program's cache wrapper or size), r is
   0/90/180/270 - and every picture of that photo on any board (card photo, slides, thumbnails) is shown turned. */
(function(){
  const ROT = new Map();
  /* the same photo, whichever size or wrapper it is asked in */
  function rkey(u){
    let s = String(u || '');
    const m = /^illuimg:\/\/p\/([^?]+)/.exec(s); if(m){ try{ s = decodeURIComponent(m[1]); }catch(e){} }
    const ws = /^https:\/\/images\.weserv\.nl\/\?url=([^&]+)/.exec(s); if(ws){ try{ s = decodeURIComponent(ws[1]); }catch(e){} }
    if(/^\/_blob\//.test(s)) return s.split('?')[0];
    const w = /static\.wixstatic\.com\/media\/([^/?#]+)/.exec(s); if(w) return 'wix:' + w[1];
    return s.replace(/^https?:\/\//i, '').split('#')[0].split('?')[0];
  }
  const idOf = k => { let h = 0x811c9dc5; for(let i = 0; i < k.length; i++){ h ^= k.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return 'r' + h.toString(36) + k.length.toString(36); };
  const keyOfImg = im => rkey(im.dataset.orig || im.getAttribute('src') || '');
  /* turned inside its own box: a quarter turn swaps width and height, so the picture is scaled to still fit (contain)
     or still fill (cover) the same box */
  function apply(im){
    if(!im || !im.isConnected) return;
    const r = ROT.get(keyOfImg(im)) || 0;
    const ew = im.offsetWidth, eh = im.offsetHeight;
    const sig = r + '|' + ew + 'x' + eh + '|' + im.naturalWidth;
    if(im.dataset.rotsig === sig) return;
    im.dataset.rotsig = sig;
    if(!r){ if(im.dataset.rotd){ im.style.removeProperty('transform'); im.style.removeProperty('transform-origin'); delete im.dataset.rotd; } return; }
    let s = 1;
    if(r % 180 && ew && eh){
      const fit = getComputedStyle(im).objectFit;
      if(fit === 'cover') s = Math.max(ew / eh, eh / ew);
      else if(im.naturalWidth && im.naturalHeight){
        const k = Math.min(ew / im.naturalWidth, eh / im.naturalHeight), cw = im.naturalWidth * k, ch = im.naturalHeight * k;
        s = Math.min(ew / ch, eh / cw);
      }else s = Math.min(ew / eh, eh / ew);
    }
    im.style.setProperty('transform', 'rotate(' + r + 'deg)' + (s !== 1 ? ' scale(' + s.toFixed(4) + ')' : ''), 'important');
    /* 1.2.241 (user, 18 Nov 2026: "when the photo rotates, it's not centered in the full screen"): the card photo zooms from
       20% down (its gentle zoom), so a turn swung it off to the top-left - a turned photo now always turns about its middle */
    im.style.setProperty('transform-origin', '50% 50%', 'important');
    im.dataset.rotd = '1';
  }
  const SEL = '.d2card .litpic img, #illufv .fvimg, #illufv .fvt img, .d2slstrip img, .litpic img.agimg, .litpic.has > img, .ucimg img';
  function applyAll(){ if(!ROT.size && !document.querySelector('[data-rotd]')) return; document.querySelectorAll(SEL).forEach(apply); }
  setInterval(applyAll, 700);
  addEventListener('resize', () => { document.querySelectorAll('[data-rotsig]').forEach(im => { delete im.dataset.rotsig; }); applyAll(); });
  document.addEventListener('load', e => { if(e.target && e.target.tagName === 'IMG' && e.target.matches(SEL)){ delete e.target.dataset.rotsig; apply(e.target); } }, true);
  /* the picture the ⟲ ⟳ buttons turn: the photo shown in that viewer */
  function shownImg(btn){
    const fv = btn.closest('#illufv'); if(fv){ const im = fv.querySelector('.fvimg'); return im && !im.hidden ? im : null; }
    const pic = btn.closest('.litpic'); if(!pic) return null;
    return pic.querySelector('.d2sl .d2sli') || pic.querySelector(':scope > img');
  }
  async function turn(im, d){
    const k = keyOfImg(im); if(!k) return;
    const r = (((ROT.get(k) || 0) + d) % 360 + 360) % 360;
    if(r) ROT.set(k, r); else ROT.delete(k);
    delete im.dataset.rotsig; applyAll();
    try{ if(typeof DB !== 'undefined' && DB) await DB.doc('prot/' + idOf(k)).set({u: k, r, by: typeof ME !== 'undefined' ? ME : '', at: new Date().toISOString()}); }catch(e){}
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-illurot]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    const im = shownImg(b); if(im) turn(im, +b.dataset.illurot || 90);
  }, true);
  const IC_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7v5h5"/><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/></svg>';
  const IC_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 7v5h-5"/><path d="M20.5 12a8.5 8.5 0 1 1-2.5-6"/></svg>';
  window.__illuRotBtns = cls => '<span class="illurot ' + (cls || '') + '"><button type="button" data-illurot="-90" title="Rotate left (for everyone)" aria-label="Rotate left">' + IC_L + '</button><button type="button" data-illurot="90" title="Rotate right (for everyone)" aria-label="Rotate right">' + IC_R + '</button></span>';
  window.__illuRot = {get: u => ROT.get(rkey(u)) || 0, key: rkey, apply, applyAll};
  (async function load(){
    for(let i = 0; i < 60 && (typeof DB === 'undefined' || !DB); i++) await new Promise(r => setTimeout(r, 500));
    if(typeof DB === 'undefined' || !DB) return;
    const take = docs => { const seen = new Map(); for(const d of docs || []){ let x = null; try{ x = typeof docOf === 'function' ? docOf(d) : (d && typeof d.data === 'function' ? d.data() : d); }catch(e){} if(x && x.u && +x.r) seen.set(x.u, +x.r % 360); } return seen; };
    try{ const s = await DB.collection('prot').limit(20000).get(); for(const [k, r] of take((s && s.docs) || s)) ROT.set(k, r); }catch(e){}
    applyAll();
    try{ DB.collection('prot').onSnapshot(sn => { const seen = take(sn.docs); ROT.clear(); for(const [k, r] of seen) ROT.set(k, r); document.querySelectorAll('[data-rotsig]').forEach(im => { delete im.dataset.rotsig; }); applyAll(); }, () => {}); }catch(e){}
  })();
  const st = document.createElement('style');
  st.textContent = `
.illurot{display:inline-flex;gap:4px}
.illurot button{width:32px;height:30px;border-radius:999px;border:0;display:grid;place-items:center;cursor:pointer;background:rgba(20,14,24,.78);color:#fff;padding:0}
.illurot button:hover{background:var(--acc,#5A2C57)}
.illurot svg{width:16px;height:16px}
.d2sl .illurot.d2rot{position:absolute;right:12px;bottom:44px;z-index:4;pointer-events:auto}
.d2card.d2full .d2sl .illurot.d2rot{bottom:20px}
#illufv .illurot.fvrot button{background:rgba(255,255,255,.14)}
#illufv .illurot.fvrot button:hover{background:rgba(255,255,255,.3)}
.d2sli,.fvimg,.litpic img{transition:transform .2s ease}`;
  document.head.appendChild(st);
})();
