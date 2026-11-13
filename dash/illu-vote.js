/* ==================== Favourites (♡) and the team vote (1.2.98) ====================
   What the user asked for (7 Nov 2026), tried first in the Studio demo:
   - Lumen is a personal board: the ♡ on any card puts the model there, with the time it was
     picked. It starts empty for everyone.
   - Communicatus is the shared favourites board: everyone's picks, by person, in the order
     they were picked.
   - The two lamps are a vote: ✓ Go and ✕ Pass. The first lamp anyone presses opens a vote for
     the whole team; every member votes; the majority decides. Majority Go -> Approved, where the
     card waits for a final confirmation before it goes to Booking; majority Pass -> Cancelled.
   - A tie goes to the Tie-breaker board: the tied round is shown with names, the team leaves
     notes, everyone votes again (another anonymous round), until there is a majority.
   - The vote is anonymous until it is complete; then the card's side panel shows who voted
     Go and who voted Pass.
   - Cards waiting for your vote glow, and are listed on Today, oldest first.
   - Whoever confirms a card into Booking is in charge of that booking card.
   Where it is kept (shared through the program's database, no new tables):
     fav/<person id>    {e: {modelKey: {at, nm, ag}}}            each person writes only their own
     vote/<person id>   {e: {modelKey: {"1": "g", "2": "r"}}, t: {modelKey: {"1": time}}}
     vopen/<hash>       {k, nm, ag, href, by, at, voters: [ids], base, conf: {by, at}, re: [{by, at, from}]}
     vnote/<person id>  {e: {hash: [{t, at, r}]}}
   The old lamps (pmarks/marks, the Backlog) are left exactly as they are. */
(function(){
  if(window.__illuVote) return; window.__illuVote = true;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const me = () => { try{ return ME || null; }catch(e){ return null; } };
  const nowIso = () => new Date().toISOString();
  const pad = n => String(n).padStart(2, '0');
  function when(iso){
    if(!iso) return '';
    const d = new Date(iso); if(isNaN(d)) return '';
    const t = pad(d.getHours()) + ':' + pad(d.getMinutes());
    const today = new Date(); const same = d.toDateString() === today.toDateString();
    if(same) return L('Today', '오늘') + ' · ' + t;
    try{ return d.toLocaleDateString(isKO() ? 'ko-KR' : 'en-GB', {day: 'numeric', month: 'short'}) + ' · ' + t; }catch(e){ return t; }
  }
  function dayLabel(iso){
    const d = new Date(iso); if(isNaN(d)) return '';
    try{ return d.toLocaleDateString(isKO() ? 'ko-KR' : 'en-GB', {weekday: 'long', day: 'numeric', month: 'long'}); }catch(e){ return iso.slice(0, 10); }
  }
  /* a model key is a web address; a document id must be one plain word */
  function hash(s){ let h = 0x811c9dc5; s = String(s); for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } let h2 = 5381; for(let i = 0; i < s.length; i++) h2 = (Math.imul(h2, 33) ^ s.charCodeAt(i)) >>> 0; return (h >>> 0).toString(36) + h2.toString(36); }
  /* the team = everyone with a program sign-in (an ID made by signing up: a uuid). Old dashboard IDs
     that nobody has taken over yet (p…) would otherwise hold every vote open for good. */
  const SIGNEDID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function people(){
    try{ return [...PEOPLE.keys()].filter(p => realPid(p) === p && SIGNEDID.test(p) && !(typeof GONEID !== 'undefined' && GONEID.has(p))).sort((a, b) => pname(a).localeCompare(pname(b))); }catch(e){ return []; }
  }
  window.__illuVoters = () => people().map(pname);
  function pname(p){ try{ const r = PEOPLE.get(p) || (typeof GONEID !== 'undefined' && GONEID.get(p)); return r ? r.n : ''; }catch(e){ return ''; } }
  function disc(p, sz){ try{ return (idDisc(p, 'ivdisc' + (sz ? ' ' + sz : '')) || ''); }catch(e){ return ''; } }

  /* ---------- the shared data ---------- */
  const FAV = new Map();      // pid -> Map key -> {at, nm, ag}
  const VT = new Map();       // pid -> {e: {key: {n: v}}, t: {key: {n: iso}}}
  const OPEN = new Map();     // hash -> vopen doc
  const NOTE = new Map();     // pid -> {hash: [{t, at, r}]}
  const NOTEX = new Map();    // pid -> {hash: {'<writer>|<at>': {t, at} | {del: 1, at}}}  (1.2.129: edits to anyone's note, kept in the editor's own doc)
  const MOM = new Map();      // hash -> mother/<hash> {k, ag, dom, by, at}: her mother agency (1.2.133)
  const PRE = new Map();      // hash -> vpre doc {k, gty, amt, per, avf, avd, by, at}: guarantee + availability typed on a vote card before Booking (1.2.129)
  let ready = 0;
  let PUBNOW = {};            // vpub/board .c: {hash: {ph, m}} what the phone vote page shows for each card (1.2.129)
  let DBX = null;
  function db(){ if(DBX) return DBX; try{ if(typeof DB !== 'undefined') DBX = DB; }catch(e){} return DBX; }
  /* 1.2.157 (user, 12 Nov 2026, approved demo): what an agency said - not available / not for Korea / on hold (maybe later).
     docs avail/<hash> {k, nm, ag, t: no|nokr|later, why, from, at, remind, by}. Shown on her card everywhere, in the
     Directory names, on her card's panel (where it is set or cleared), and on the Unavailable / On hold board. */
  const AV = new Map();
  const AVT = {no: ['Not available', '불가', '#A3283F'], nokr: ['Not for Korea', '한국 불가', '#A3283F'], later: ['On hold', '보류', '#C97916']};
  function availOf(k){ if(!k) return null; const v = AV.get(hash(k)); return v && v.t ? v : null; }
  window.__illuAvailOf = availOf;
  window.__illuAvailSet = (k, o) => { if(!k) return; const v = Object.assign({k, at: nowIso(), by: me()}, o); AV.set(hash(k), v); save('avail/' + hash(k), v); changed(); };
  window.__illuAvailLabel = (v, short) => { if(!v || !AVT[v.t]) return ''; const t = AVT[v.t]; let s = L(t[0], t[1]); if(v.t === 'later' && v.remind){ const d = new Date(v.remind); if(!isNaN(d)) s += ' · ' + d.toLocaleDateString(isKO() ? 'ko-KR' : 'en-GB', {month: 'short', year: short ? undefined : 'numeric'}); } return s; };
  window.__illuAvailColor = v => (v && AVT[v.t]) ? AVT[v.t][2] : '';
  function availSec(k, a, can){
    const v = availOf(k), ed = AVED === k;
    const btn = (t, l) => '<button type="button" class="avb' + (v && v.t === t ? ' on ' + t : '') + '" data-avset="' + t + '"' + (can ? '' : ' disabled') + '>' + l + '</button>';
    return '<section class="pns avsec">' + pnSecH(L('Agency said', '에이전시 답변')) +
      (v ? '<div class="avnow ' + v.t + '"><b>' + H(window.__illuAvailLabel(v)) + '</b>' + (v.why ? '<span>“' + H(v.why) + '”</span>' : '') + '<small>' + H([v.from, v.at ? new Date(v.at).toLocaleDateString(isKO() ? 'ko-KR' : 'en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '', v.by ? pname(v.by) : ''].filter(Boolean).join(' · ')) + '</small></div>' : '') +
      (ed ? '<div class="aved"><input data-mxin="avwhy" placeholder="' + H(L('What the agency said (e.g. exclusive with another Seoul agency)', '에이전시가 한 말 (예: 다른 서울 에이전시와 독점)')) + '" value="' + H((v && v.why) || '') + '">' +
        (AVPICK === 'later' ? '<label>' + L('Ask again from', '다시 물어볼 날') + ' <input type="month" data-mxin="avrem" value="' + H(((v && v.remind) || '').slice(0, 7)) + '"></label>' : '') +
        '<div class="avbs"><button type="button" class="ivbtn" data-avok>' + L('Save', '저장') + '</button><button type="button" class="ivbtn" data-avno>' + L('Back', '뒤로') + '</button></div></div>'
        : '<div class="avbs">' + btn('no', L('Not available', '불가')) + btn('nokr', L('Not for Korea', '한국 불가')) + btn('later', L('On hold', '보류')) + (v ? '<button type="button" class="avb clr" data-avclr' + (can ? '' : ' disabled') + '>' + L('Available again', '다시 가능') + '</button>' : '') + '</div>') + '</section>';
  }
  let AVED = '', AVPICK = '';
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('.mx [data-avset],.mx [data-avok],.mx [data-avno],.mx [data-avclr]'); if(!t) return;
    e.preventDefault(); e.stopPropagation(); if(!signedIn()) return;
    const box = t.closest('.mx'), k = box.dataset.mxk, ab = (() => { try{ return JSON.parse(box.dataset.mxab || 'null') || {}; }catch(er){ return {}; } })();
    if(t.dataset.avset){ AVED = k; AVPICK = t.dataset.avset; changed(); setTimeout(() => { const i = document.querySelector('.mx [data-mxin="avwhy"]'); if(i) i.focus(); }, 30); return; }
    if(t.hasAttribute('data-avno')){ AVED = ''; changed(); return; }
    if(t.hasAttribute('data-avclr')){ const h = hash(k); AV.delete(h); save('avail/' + h, {k, t: '', at: nowIso(), by: me()}); changed(); return; }
    if(t.hasAttribute('data-avok')){
      const why = ((box.querySelector('[data-mxin="avwhy"]') || {}).value || '').trim().slice(0, 300), rem = ((box.querySelector('[data-mxin="avrem"]') || {}).value || '');
      const m = info(k), o = {k, nm: ab.nm || m.nm || '', ag: ab.ag || m.ag || '', t: AVPICK, why, from: L('Set by hand', '직접 입력'), at: nowIso(), remind: AVPICK === 'later' && rem ? rem + '-01' : '', by: me()};
      AV.set(hash(k), o); save('avail/' + hash(k), o); AVED = ''; changed();
    }
  }, true);
  function listen(){
    const d = db(); if(!d){ setTimeout(listen, 300); return; }
    d.collection('fav').onSnapshot(s => { FAV.clear(); for(const x of s.docs){ const v = x.data() || {}; const m = new Map(); for(const k in (v.e || {})) m.set(k, v.e[k]); FAV.set(x.id, m); } ready |= 1; changed(); }, () => {});
    d.collection('vote').onSnapshot(s => { VT.clear(); for(const x of s.docs){ const v = x.data() || {}; VT.set(x.id, {e: Object.assign({}, v.e || {}), t: Object.assign({}, v.t || {})}); } ready |= 2; changed(); }, () => {});
    d.collection('vopen').onSnapshot(s => { OPEN.clear(); for(const x of s.docs){ const v = x.data(); if(v && v.k) OPEN.set(x.id, v); } ready |= 4; changed(); }, () => {});
    d.collection('vpub').onSnapshot(s => { for(const x of s.docs) if(x.id === 'board'){ const v = x.data() || {}; PUBNOW = Object.assign({}, v.c || {}); } }, () => {});
    d.collection('mother').onSnapshot(s => { MOM.clear(); for(const x of s.docs){ const v = x.data(); if(v && v.k && v.ag) MOM.set(x.id, v); } changed(); }, () => {});
    d.collection('avail').onSnapshot(s => { AV.clear(); for(const x of s.docs){ const v = x.data(); if(v && v.k && v.t) AV.set(x.id, v); } changed(); }, () => {});
    d.collection('vpre').onSnapshot(s => { PRE.clear(); for(const x of s.docs){ const v = x.data(); if(v && v.k) PRE.set(x.id, v); } changed(); }, () => {});
    d.collection('vnote').onSnapshot(s => { NOTE.clear(); for(const x of s.docs){ const v = x.data() || {}; NOTE.set(x.id, Object.assign({}, v.e || {})); NOTEX.set(x.id, Object.assign({}, v.x || {})); } changed(); }, () => {});
  }
  /* one write at a time per document, newest state wins */
  const WQ = new Map();
  function save(path, body){
    const d = db(); if(!d) return Promise.resolve();
    const prev = WQ.get(path) || Promise.resolve();
    const p = prev.then(() => d.doc(path).set(body)).catch(e => { console.error('vote save', path, e); say(L('Could not save — check the connection and try again.', '저장하지 못했습니다 — 연결을 확인하고 다시 해 보세요.')); });
    WQ.set(path, p); return p;
  }
  const myFav = () => FAV.get(me()) || new Map();
  function saveMyFav(m){ const e = {}; for(const [k, v] of m) e[k] = v; FAV.set(me(), m); return save('fav/' + me(), {e, at: nowIso()}); }
  function myVt(){ let v = VT.get(me()); if(!v){ v = {e: {}, t: {}}; VT.set(me(), v); } return v; }
  function saveMyVt(){ const v = myVt(); return save('vote/' + me(), {e: v.e, t: v.t, at: nowIso()}); }

  /* ---------- what a vote stands at, worked out from everyone's own votes ---------- */
  function voteOf(pid, k, r){ const v = VT.get(pid); return v && v.e[k] ? v.e[k][String(r)] || '' : ''; }
  /* 1.2.122 (user, 9 Nov 2026): "When a new user login is created or deleted, change the voting number accordingly."
     - a deleted login drops out of every vote (its vote no longer counts);
     - a new login joins every vote still open, so the count goes up (3 -> 4) and the vote waits for them too;
     - a vote that was already decided before the login was created stays decided, and a confirmed one never changes.
     When a login was created comes from the people table (created_at); a login whose date is not known yet only
     joins votes that are still open. */
  const JOIN = new Map();     // pid -> ISO time the login was created
  let joinTried = 0;
  async function loadJoin(){
    joinTried = Date.now();
    try{ const sb = window.__illuSb; if(!sb || !sb.from) return;
      const { data, error } = await sb.from('people').select('id,created_at'); if(error || !Array.isArray(data)) return;
      let ch = false; for(const r of data){ if(r && r.id && r.created_at && JOIN.get(r.id) !== r.created_at){ JOIN.set(r.id, r.created_at); ch = true; } }
      if(ch) changed();
    }catch(e){}
  }
  window.__illuVoteJoin = m => { for(const k in m) JOIN.set(k, m[k]); changed(); };
  window.__illuVoteDebug = k => { const st = stateOf(k); return st ? {open: st.open, n: st.n, of: st.of, res: st.res || '', needMe: needMe(st), voters: st.voters.map(pname)} : null; };
  let peopleSig = '';
  function baseVoters(o){
    const live = new Set(people());
    const list = (o.voters && o.voters.length ? o.voters : people()).map(p => { try{ return realPid(p); }catch(e){ return p; } });
    return [...new Set(list)].filter(p => live.has(p));
  }
  function votersOf(o, k){
    const vs = baseVoters(o);
    if(!k || o.conf) return vs;
    const extra = people().filter(p => !vs.includes(p)).sort((a, b) => String(JOIN.get(a) || '~').localeCompare(String(JOIN.get(b) || '~')));
    for(const p of extra){
      const s = tally(o, k, vs);
      if(s && !s.open){ const j = JOIN.get(p); if(!j || String(j) > String(s.at)) continue; }
      vs.push(p);
    }
    return vs;
  }
  function stateOf(k){
    const o = onVote(k); if(!o) return null;
    const sig = people().join(); if(sig !== peopleSig){ peopleSig = sig; if(Date.now() - joinTried > 5000) setTimeout(loadJoin, 0); }
    return tally(o, k, votersOf(o, k));
  }
  function tally(o, k, vs){
    const hist = [];
    let r = o.base || 1;
    for(let guard = 0; guard < 50; guard++){
      const g = vs.filter(p => voteOf(p, k, r) === 'g'), x = vs.filter(p => voteOf(p, k, r) === 'r');
      const n = g.length + x.length;
      if(!vs.length || n < vs.length) return {o, k, h: hash(k), voters: vs, round: r, n, of: vs.length, g: g.length, r: x.length, mine: voteOf(me(), k, r), open: true, hist, at: hist.length ? hist[hist.length - 1].at : o.at};
      const at = vs.map(p => ((VT.get(p) || {}).t || {})[k]).map(t => t && t[String(r)]).filter(Boolean).sort().pop() || o.at;
      if(g.length === x.length){ hist.push({round: r, g, x, at}); r++; continue; }
      return {o, k, h: hash(k), voters: vs, round: r, n, of: vs.length, g: g.length, r: x.length, mine: voteOf(me(), k, r), open: false, res: g.length > x.length ? 'appr' : 'cxl', gp: g, xp: x, at, hist};
    }
    return null;
  }
  /* 1.2.117 (user, 9 Nov 2026): the ♡ only puts a model in My Favorites. A card is on the Team Vote when someone
     presses Send to Team Vote (a vopen document), and comes off when the person who sent it presses Take off
     (vopen.off). Hearts from before this version were votes already, so a card ♥'d before LEGACY_CUT with no
     vopen of its own stays on the vote, sent by whoever ♥'d it first - nothing on the board disappears. */
  const LEGACY_CUT = '2026-11-09T03:00:00.000Z';
  function legacyO(k){
    const ls = []; for(const [p, m] of FAV){ const v = m.get(k); if(v && v.at && String(v.at) < LEGACY_CUT) ls.push({p, at: v.at, nm: v.nm, ag: v.ag}); }
    if(!ls.length) return null;
    ls.sort((a, b) => String(a.at).localeCompare(String(b.at)));
    return {k, nm: ls[0].nm || '', ag: ls[0].ag || '', href: /^https?:/i.test(k) ? k : '', by: ls[0].p, at: ls[0].at, voters: null, base: 1, legacy: true};
  }
  function onVote(k){ const o = OPEN.get(hash(k)) || legacyO(k); return o && !o.off ? o : null; }
  function legacyKeys(){ const s = new Set(); for(const m of FAV.values()) for(const k of m.keys()) if(!OPEN.has(hash(k)) && legacyO(k)) s.add(k); return [...s]; }
  const needMe = st => !!st && st.open && !st.mine && st.voters.includes(me());
  function allStates(){ const out = []; for(const o of OPEN.values()){ const s = stateOf(o.k); if(s) out.push(s); } for(const k of legacyKeys()){ const s = stateOf(k); if(s) out.push(s); } return out; }
  /* the old "lamp" questions now ask where the vote stands: Approved g, voting y, Cancelled r */
  window.__illuVoteLamp = k => { if(!k) return ''; const o = onVote(k); if(!o) return ''; const s = stateOf(k); return !s ? '' : s.open ? 'y' : s.res === 'appr' ? 'g' : 'r'; };
  window.__illuVoteMarkVals = () => allStates().map(s => s.open ? 'y' : s.res === 'appr' ? 'g' : 'r');
  /* 1.2.130 (user, 10 Nov 2026: "both options"): the whole-program person filter (litWho in the dashboard).
     The boards show only that person's cards: the cards they sent to the vote, their favorites. */
  const gWho = () => { try{ return (typeof litWho !== 'undefined' && litWho) || ''; }catch(e){ return ''; } };
  const gw = st => !gWho() || st.o.by === gWho();
  window.__illuWhoHas = (pid, k) => { if(!pid || !k) return false; if((FAV.get(pid) || new Map()).has(k)) return true; const o = OPEN.get(hash(k)); return !!(o && o.by === pid && !o.off); };
  window.__illuWhoCounts = pid => ({fav: (FAV.get(pid) || new Map()).size, vote: allStates().filter(s => s.o.by === pid && (s.open || !s.o.off)).length});
  /* 1.2.129: + New card (illu-newcard.js) hands a new card to one of the three places */
  window.__illuVoteAct = {fav: (k, a) => { if(!myFav().has(k)) toggleFav(k, a); }, vote: (k, a) => sendVote(k, a), book: (k, a) => sendBook(k, a), on: k => !!onVote(k)};
  /* 1.2.149: for Favorite Agencies - each person's favourites, and the cards each person sent to the vote */
  window.__illuFavsOf = pid => [...(FAV.get(pid) || new Map())].map(([k, v]) => ({k, nm: (v && v.nm) || '', ag: (v && v.ag) || '', at: (v && v.at) || ''}));
  window.__illuFavPeople = () => [...FAV.keys()];
  window.__illuVoteSent = () => { const out = []; for(const o of OPEN.values()) if(o && o.k && !o.off) out.push({k: o.k, nm: o.nm || '', ag: o.ag || '', by: o.by || '', at: o.at || ''}); return out; };
  window.__illuModelInfo = k => { try{ const i = info(k); return {nm: i.nm || '', ag: i.ag || '', href: i.href || ''}; }catch(e){ return {}; } };
  window.__illuVoteState = k => { const s = stateOf(k); return !s ? '' : s.open ? (s.hist.length ? 'tie' : 'open') : s.res; };

  /* ---------- actions ---------- */
  function info(k){
    let i = null; try{ if(typeof agIndex === 'function') agIndex(); }catch(e){}
    try{ i = typeof keyInfo === 'function' ? keyInfo(k) : null; }catch(e){}
    const snap = (OPEN.get(hash(k))) || [...FAV.values()].map(m => m.get(k)).find(Boolean) || {};
    /* 1.2.158: a booking card with no Directory page (the models from the agency server) answers for itself */
    let bc = null; try{ bc = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : (!i && typeof bkForKey === 'function' ? bkForKey(k) : null); }catch(e){}
    const bi = bc ? {nm: bc.nm || '', ag: bc.ag || '', city: bc.city || '', country: bc.nat || bc.country || ''} : {};
    return Object.assign({key: k, nm: snap.nm || bi.nm || '', ag: snap.ag || bi.ag || '', href: snap.href || (/^https?:/i.test(k) ? k : '')}, bi, i || {}, {key: k});
  }
  function signedIn(){ try{ if(!SIGNED()){ nudgeSignIn(); return false; } }catch(e){ return false; } return true; }
  function cast(k, v, about){
    if(!signedIn()) return;
    const h = hash(k);
    let o = onVote(k);
    if(!o){ say(L('Send her to the Team Vote first.', '먼저 팀 투표로 보내세요.')); return; }
    if(o.legacy){
      const m = info(k);
      o = {k, nm: o.nm || (about && about.nm) || m.nm || '', ag: o.ag || m.ag || (about && about.ag) || '', href: m.href || o.href || '', by: o.by, at: o.at, voters: people(), base: 1};
      OPEN.set(h, o); save('vopen/' + h, o);
    }
    const st = stateOf(k);
    if(!st || !st.open){ say(L('This vote is closed.', '이 투표는 끝났습니다.')); return; }
    if(!st.voters.includes(me())){ say(L('You were not a member when this vote opened.', '이 투표가 열릴 때 멤버가 아니었습니다.')); return; }
    const mv = myVt(), r = String(st.round);
    mv.e[k] = Object.assign({}, mv.e[k] || {}); mv.t[k] = Object.assign({}, mv.t[k] || {});
    if(mv.e[k][r] === v){ delete mv.e[k][r]; delete mv.t[k][r]; changed(); saveMyVt(); say(L('Your vote is taken back.', '내 투표를 취소했습니다.')); return; }
    mv.e[k][r] = v; mv.t[k][r] = nowIso();
    changed(); saveMyVt();
    const after = stateOf(k);
    const nm = (after && after.o.nm) || '';
    if(after && !after.open) say(L('Vote made — and it was the last one. ' + nm + ': ' + (after.res === 'appr' ? 'Approved' : 'Cancelled') + ' ' + after.g + '–' + after.r, '투표 완료 — 마지막 표였습니다. ' + nm + ': ' + (after.res === 'appr' ? '승인' : '취소') + ' ' + after.g + '–' + after.r), null, v);
    else if(after && after.round > st.round) say(L('Tie — ' + nm + ' goes to the Tie-breaker for round ' + after.round, '동점 — ' + nm + ', 타이브레이커 ' + after.round + '라운드로'));
    else if(after) say(L('Vote made — you voted ' + (v === 'g' ? 'Go' : 'Pass') + (nm ? ' on ' + nm : '') + ' · ' + after.n + ' of ' + after.of + ' have voted. Only you can see your vote until everyone has voted.', '투표 완료 — ' + (nm ? nm + ': ' : '') + (v === 'g' ? '찬성' : '반대') + ' · ' + after.of + '명 중 ' + after.n + '명 투표. 모두 투표할 때까지 내 선택은 나만 봅니다.'), null, v);
  }
  /* the highest round anyone has voted in on this card - a card sent again starts after it, so old votes don't count */
  function lastRound(k){ let r = 0; for(const v of VT.values()){ const e = v.e && v.e[k]; if(e) for(const n in e) r = Math.max(r, +n || 0); } return r; }
  /* 1.2.156 (user, 12 Nov 2026, approved demo "Someone else is already on her"): who else is working on a model -
     her booking card in someone else's charge (Processing or Completed). Same model = same key, or the same first name
     at the same agency (cards brought in by hand carry no key). */
  const lcs = s => String(s || '').trim().toLowerCase();
  const first = s => lcs(s).split(/\s+/)[0] || '';
  function bookersOf(k, nm, ag){
    const out = []; let all = []; try{ all = [...BOOK.values()]; }catch(e){}
    const f = first(nm), a = lcs(ag);
    for(const c of all){ if(!c || c.st === 'canc' || !c.by) continue;
      if((k && c.k && c.k === k) || (f && first(c.nm) === f && sameNm(nm, c.nm) && !twoPages(k, c.k) && a && (lcs(c.ag) === a || (c.agd && a.includes(lcs(c.agd).split('.')[0]))))) out.push(c); }
    return out;
  }
  /* 1.2.168 (user, 13 Nov 2026: Alina Polukhina was taken for Alina B - "Some models will have the same first name. Make sure
     you don't mix up the models"): same first name is not enough. A second name has to agree ("Alina B" = "Alina Bron",
     not "Alina Polukhina"), and two different profile pages on the same agency site are two different girls. */
  function sameNm(x, y){
    const t = s => lcs(s).replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean), a = t(x), b = t(y);
    if(!a.length || !b.length || a[0] !== b[0]) return false;
    if(a.length < 2 || b.length < 2) return true;
    const p = a[1], q = b[1]; return p.startsWith(q) || q.startsWith(p);
  }
  function twoPages(k1, k2){
    try{ if(!/^https?:/i.test(k1 || '') || !/^https?:/i.test(k2 || '')) return false;
      const u = new URL(k1), v = new URL(k2), h = x => x.hostname.replace(/^www\./, '');
      return h(u) === h(v) && u.pathname.replace(/\/+$/, '') !== v.pathname.replace(/\/+$/, ''); }catch(e){ return false; }
  }
  window.__illuSameNm = sameNm;
  function workOf(k, nm, ag){
    const m = info(k); nm = nm || m.nm; ag = ag || m.ag;
    const c = bookersOf(k, nm, ag).find(x => x.by !== me()); if(!c) return null;
    let them = ''; try{ const l = (c.em && c.em.list) || []; const e = l.slice().sort((p, q) => String(q.dt).localeCompare(String(p.dt)))[0]; if(e) them = e.dir === 'in' ? (e.name || e.addr || '') : ''; }catch(e){}
    return {c, by: c.by, who: pname(c.by), what: c.st === 'done' ? 'booked' : 'booking', since: (() => { const d = new Date(c.at || ''); return isNaN(d) ? '' : d.toLocaleDateString(isKO() ? 'ko-KR' : 'en-GB', {day: 'numeric', month: 'short'}); })(), them};
  }
  window.__illuWorkOf = workOf;
  /* 1.2.170: liked by someone on the team AND her booking card is in progress -> the purple ring on her card */
  window.__illuBkRing = (k, nm, ag) => {
    if(!k) return null;
    let liked = false; try{ for(const [, m] of FAV) if(m && m.has && m.has(k)){ liked = true; break; } }catch(e){}
    if(!liked) return null;
    const c = bookersOf(k, nm || '', ag || '').find(x => x.st === 'proc' || !x.st); if(!c) return null;
    let st = ''; try{ st = window.__illuBkStage ? window.__illuBkStage(c) : ''; }catch(e){}
    return {who: pname(c.by), st};
  };
  /* two of us on the same model: her booking card in one person's charge while another sent her to the Team Vote, or two
     booking cards of the same girl in different hands */
  window.__illuOverlaps = () => {
    const out = [], seen = new Set(); let all = []; try{ all = [...BOOK.values()].filter(c => c && c.st === 'proc' && c.by); }catch(e){}
    for(const c of all){
      const others = bookersOf(c.k, c.nm, c.ag).filter(x => x !== c && x.by !== c.by && x.st === 'proc');
      for(const o of others){ const key = [c.id, o.id].sort().join('|'); if(seen.has(key)) continue; seen.add(key); out.push({nm: c.nm, ag: c.ag, a: c, b: o, people: [c.by, o.by], why: 'two booking cards'}); }
      if(c.k){ const v = onVote(c.k); if(v && v.by && v.by !== c.by){ const key = c.id + '|vote'; if(!seen.has(key)){ seen.add(key); out.push({nm: c.nm, ag: c.ag, a: c, people: [c.by, v.by], why: 'vote'}); } } }
    }
    return out;
  };
  const WK = {k: '', go: null};
  function workAsk(k, w, go, verb){
    WK.k = k; WK.go = go;
    let box = document.getElementById('illuwk'); if(!box){ box = document.createElement('div'); box.id = 'illuwk'; document.body.appendChild(box); }
    box.innerHTML = '<div class="wkveil" data-wkx></div><div class="wkdlg" role="dialog" aria-modal="true"><h4>' + H(L(w.who + ' is already working on ' + (w.c.nm || 'her'), w.who + '님이 이미 ' + (w.c.nm || '') + ' 작업 중입니다')) + '</h4>' +
      '<p>' + H(L((w.what === 'booked' ? 'Booked' : 'Booking card') + ' since ' + w.since + (w.them ? ' · talking to ' + w.them : '') + ' at ' + (w.c.ag || 'her agency') + '.', (w.what === 'booked' ? '부킹 완료' : '부킹 카드') + ' · ' + w.since + (w.them ? ' · ' + w.them + '와 연락 중' : '') + ' · ' + (w.c.ag || ''))) + '</p>' +
      '<div class="wkb"><button type="button" class="wkp" data-wkopen>' + H(L('Open her booking card', '부킹 카드 열기')) + '</button><button type="button" data-wkmsg>' + H(L('Message ' + w.who, w.who + '님에게 메시지')) + '</button><button type="button" class="wkm" data-wkgo>' + H(L(verb + ' anyway', '그래도 ' + verb)) + '</button></div>' +
      '<small>' + H(L('"' + verb + ' anyway" lets ' + w.who + ' know too, so nobody writes twice without knowing.', '그래도 진행하면 ' + w.who + '님에게도 알립니다.')) + '</small></div>';
    box.hidden = false; try{ box.querySelector('[data-wkopen]').focus(); }catch(e){}
  }
  document.addEventListener('click', e => {
    const box = document.getElementById('illuwk'); if(!box || box.hidden || !box.contains(e.target)) return;
    const w = workOf(WK.k);
    if(e.target.closest('[data-wkx]')){ box.hidden = true; return; }
    if(e.target.closest('[data-wkopen]')){ box.hidden = true; try{ if(w) bvOpenFor(w.c.id); }catch(er){} return; }
    if(e.target.closest('[data-wkmsg]')){ box.hidden = true; try{ if(window.__illuChatTo) window.__illuChatTo(w.by, (w.c.nm || '') + ' — '); else if(window.__illuGo) window.__illuGo('chat'); }catch(er){} return; }
    if(e.target.closest('[data-wkgo]')){ box.hidden = true; const go = WK.go; WK.go = null; try{ if(w) save('wknote/' + hash(WK.k) + '-' + Date.now().toString(36), {k: WK.k, nm: w.c.nm || '', to: w.by, by: me(), at: nowIso(), bid: w.c.id}); }catch(er){} if(go) go(); }
  }, true);
  document.addEventListener('keydown', e => { const box = document.getElementById('illuwk'); if(e.key === 'Escape' && box && !box.hidden) box.hidden = true; });
  function sendVote(k, about, sure){
    if(!signedIn()) return;
    if(onVote(k)){ say(L('She is on the Team Vote already.', '이미 팀 투표에 있습니다.')); return; }
    if(!sure){ const w = workOf(k, about && about.nm, about && about.ag); if(w){ workAsk(k, w, () => sendVote(k, about, true), L('Send to Team Vote', '팀 투표로 보내기')); return; } }
    const h = hash(k), m = info(k), was = OPEN.get(h);
    const o = {k, nm: (about && about.nm) || m.nm || (was && was.nm) || '', ag: m.ag || (about && about.ag) || (was && was.ag) || '', href: m.href || '', by: me(), at: nowIso(), voters: people(), base: lastRound(k) + 1};
    OPEN.set(h, o); save('vopen/' + h, o); changed();
    try{ window.__illuUndo && window.__illuUndo.push(L((o.nm || 'She') + ' sent to the Team Vote', (o.nm || '') + ' 팀 투표로 보냄'), () => takeOff(k)); }catch(e){}
    say(L((o.nm || 'She') + ' is on the Team Vote — the team is asked to vote.', (o.nm || '') + ' — 팀 투표로 보냈습니다. 팀에게 투표를 요청합니다.'), () => { try{ window.__illuGo && window.__illuGo('team'); }catch(e){} }, null, L('Open Team Vote', '팀 투표 열기'));
  }
  function canTakeOff(st){ return !!st && st.open && (st.o.by === me() || adminMe()); }
  function takeOff(k){
    if(!signedIn()) return;
    const st = stateOf(k); if(!canTakeOff(st)) return;
    const h = hash(k), before = OPEN.get(h) || null;
    const o = Object.assign({}, st.o, {off: {by: me(), at: nowIso(), round: st.round}}); delete o.legacy;
    if(!o.voters) o.voters = st.voters;
    OPEN.set(h, o); save('vopen/' + h, o); ASK = ''; changed();
    say(L((o.nm || 'She') + ' is off the Team Vote. She stays in My Favorites.', (o.nm || '') + ' — 팀 투표에서 뺐습니다. 내 즐겨찾기에는 남아 있습니다.'), () => {
      const back = before ? Object.assign({}, before) : Object.assign({}, st.o, {off: null}); delete back.off; delete back.legacy; if(!back.voters) back.voters = st.voters;
      OPEN.set(h, back); save('vopen/' + h, back); changed();
    });
  }
  let ASK = '';
  function offBox(k, st){
    st = st || stateOf(k); if(!canTakeOff(st)) return '';
    if(ASK !== k) return '<button type="button" class="ivoff" data-ivoff="' + H(k) + '">' + L('Take off Team Vote', '팀 투표에서 빼기') + '</button>';
    const others = st.voters.filter(p => p !== me() && voteOf(p, k, st.round)).map(pname);
    return '<div class="ivask"><span>' + H(others.length ? L(others.join(', ') + (others.length > 1 ? ' have' : ' has') + ' voted already. Take her off and clear the votes?', others.join(', ') + ' 님이 이미 투표했습니다. 빼고 투표를 지울까요?') : L('Take her off the Team Vote?', '팀 투표에서 뺄까요?')) + ' ' + H(L('She stays in My Favorites.', '내 즐겨찾기에는 남습니다.')) + '</span>' +
      '<div><button type="button" class="ivbtn red" data-ivoffyes="' + H(k) + '">' + L('Take off', '빼기') + '</button><button type="button" class="ivbtn" data-ivoffno>' + L('Keep it', '그대로 두기') + '</button></div></div>';
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-ivoff],[data-ivoffyes],[data-ivoffno]'); if(!t) return;
    e.preventDefault(); e.stopPropagation();
    if(t.dataset.ivoff != null){ ASK = t.dataset.ivoff; changed(); rerender(); }
    else if(t.dataset.ivoffyes != null) takeOff(t.dataset.ivoffyes);
    else { ASK = ''; changed(); rerender(); }
  }, true);
  function rerender(){ for(const p of PAGES.values()){ p.el.__h = ''; p.render(); } try{ window.__illuTodayRender && window.__illuTodayRender(); }catch(e){} }
  function toggleFav(k, about){
    if(!signedIn()) return;
    const m = new Map(myFav());
    if(m.has(k)){ const was = m.get(k); m.delete(k); saveMyFav(m); changed();
      say(L('Removed from My Favorites', '내 즐겨찾기에서 뺐습니다'), () => { const n = new Map(myFav()); n.set(k, was); saveMyFav(n); changed(); }); return; }
    const i = info(k);
    m.set(k, {at: nowIso(), nm: (about && about.nm) || i.nm || '', ag: i.ag || (about && about.ag) || ''});
    saveMyFav(m); changed();
    try{ window.__illuUndo && window.__illuUndo.push(L('♥ Added to My Favorites', '♥ 내 즐겨찾기에 추가'), () => { const n = new Map(myFav()); n.delete(k); saveMyFav(n); changed(); }); }catch(e){}
    if(onVote(k)) say(L('♥ Added to My Favorites', '♥ 내 즐겨찾기에 추가했습니다'));
    else say(L('♥ Added to My Favorites', '♥ 내 즐겨찾기에 추가했습니다'), () => sendVote(k, about), null, L('Send to Team Vote', '팀 투표로 보내기'));
  }
  function confirmBook(k){
    if(!signedIn()) return;
    const st = stateOf(k); if(!st || st.open || st.res !== 'appr') return;
    const i = info(k);
    let c = null;
    try{ c = bkForKey(k); }catch(e){}
    if(!c){ try{ c = bookFromModel(k, st.o.nm || i.nm || '', i.ag || st.o.ag || '', i.city || '', i.country || ''); }catch(e){ console.error(e); } }
    /* 1.2.129: already on Booking (sent without a vote) - the card and whoever is in charge stay as they are */
    if(!c) return;
    try{ remember('book', k, c.nm || k, c.ag || '', k); }catch(e){}
    const o = Object.assign({}, st.o, {conf: {by: me(), at: nowIso(), bid: c.id}});
    OPEN.set(st.h, o); save('vopen/' + st.h, o);
    try{ renderBook(); }catch(e){}
    changed();
    say(L((c.nm || '') + ' is on the Booking board — you are in charge of her card.', (c.nm || '') + ' — 부킹 보드로 옮겼습니다. 이 카드는 내가 담당합니다.'));
  }
  function reopen(k){
    if(!signedIn()) return;
    const st = stateOf(k); if(!st || st.open) return;
    const o = Object.assign({}, st.o, {base: st.round + 1, voters: people(), re: (st.o.re || []).concat([{by: me(), at: nowIso(), from: st.round}])});
    delete o.conf;
    OPEN.set(st.h, o); save('vopen/' + st.h, o); changed();
    say(L('Vote reopened — everyone votes again.', '투표를 다시 열었습니다 — 모두 다시 투표합니다.'));
  }
  /* my own notes doc keeps my notes (e) and my edits to anyone's notes (x) */
  function saveNotes(){ return save('vnote/' + me(), {e: NOTE.get(me()) || {}, x: NOTEX.get(me()) || {}, at: nowIso()}); }
  const adminMe = () => { try{ return !!isAdmin(); }catch(e){ return false; } };
  function addNote(k, t){
    if(!signedIn()) return;
    const h = hash(k), st = stateOf(k);
    const mine = Object.assign({}, NOTE.get(me()) || {});
    mine[h] = (mine[h] || []).concat([{t: String(t).slice(0, 2000), at: nowIso(), r: st ? st.round : 1}]);
    NOTE.set(me(), mine); saveNotes(); changed();
  }
  function notesAll(k){
    const h = hash(k), out = [];
    for(const [p, e] of NOTE) for(const n of (e[h] || [])) out.push(Object.assign({p}, n));
    /* 1.2.129: the newest edit of each note, by whoever made it, is what everyone sees; a removal hides it */
    const ed = new Map();
    for(const [by, x] of NOTEX) for(const id in (x[h] || {})){ const v = x[h][id]; if(v && v.at && (!ed.has(id) || String(v.at) > String(ed.get(id).at))) ed.set(id, Object.assign({by}, v)); }
    const res = [];
    for(const n of out){ const v = ed.get(n.p + '|' + n.at); if(v && v.del) continue; if(v && v.t != null){ n.o = n.t; n.t = v.t; n.ed = {by: v.by, at: v.at}; } res.push(n); }
    return res.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  }
  /* edit anyone's note (everyone may); remove anyone's note or link (the admin may; everyone may remove their own) */
  function setX(k, id, v){
    const h = hash(k), x = Object.assign({}, NOTEX.get(me()) || {}); x[h] = Object.assign({}, x[h] || {});
    const before = x[h][id];
    if(v) x[h][id] = v; else delete x[h][id];
    if(!Object.keys(x[h]).length) delete x[h];
    NOTEX.set(me(), x); saveNotes(); changed();
    return before;
  }
  function editNote(k, p, at, t){
    if(!signedIn()) return false;
    t = String(t || '').trim().slice(0, 2000); if(!t) return false;
    const n = notesAll(k).find(x => x.p === p && x.at === at); if(!n || n.u) return false;
    if(n.t === t) return true;
    const id = p + '|' + at, before = setX(k, id, {t, at: nowIso()});
    say(L('Note edited', '메모를 고쳤습니다'), () => setX(k, id, before || null));
    return true;
  }
  function canDrop(p){ return p === me() || adminMe(); }
  function dropAny(k, p, at){
    if(!signedIn() || !canDrop(p)) return;
    if(p === me()) return dropMine(k, at);
    const n = notesAll(k).find(x => x.p === p && x.at === at); if(!n) return;
    const id = p + '|' + at, before = setX(k, id, {del: 1, at: nowIso()});
    say(n.u ? L('Link removed', '링크를 지웠습니다') : L('Note removed', '메모를 지웠습니다'), () => setX(k, id, before || null));
  }
  let NTED = '';
  /* one note, the same in the photo viewer's panel and on the Team Vote: who, when, edited, and its buttons */
  function noteBtns(k, n){
    const can = (() => { try{ return !!SIGNED(); }catch(e){ return false; } })();
    return (can ? '<button type="button" class="mxe" data-nted="' + H(n.p + '|' + n.at) + '" data-ntk="' + H(k) + '">' + L('Edit', '수정') + '</button>' : '') +
      (can && canDrop(n.p) ? '<button type="button" class="mxx" data-ntdel="' + H(n.p + '|' + n.at) + '" data-ntk="' + H(k) + '" aria-label="' + H(L('Remove this note', '이 메모 지우기')) + '">×</button>' : '');
  }
  function noteBody(k, n){
    const id = n.p + '|' + n.at;
    if(NTED === k + '#' + id) return '<div class="mxedit"><textarea data-ntin="' + H(id) + '" data-ntk="' + H(k) + '" rows="3">' + H(n.t) + '</textarea><div><button type="button" class="mxb pri" data-ntsave="' + H(id) + '" data-ntk="' + H(k) + '">' + L('Save', '저장') + '</button><button type="button" class="mxb" data-ntcancel>' + L('Cancel', '취소') + '</button></div></div>';
    return '<p>' + H(n.t) + '</p>' + (n.ed ? '<span class="mxed">' + H(L('edited by ' + pname(n.ed.by) + ' · ' + when(n.ed.at), pname(n.ed.by) + ' 수정 · ' + when(n.ed.at))) + '</span>' : '');
  }
  function noteFind(k, id){ const i = id.indexOf('|'); return notesAll(k).find(x => x.p === id.slice(0, i) && x.at === id.slice(i + 1)); }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-nted],[data-ntdel],[data-ntsave],[data-ntcancel]'); if(!t) return;
    e.preventDefault(); e.stopPropagation();
    const d = t.dataset, k = d.ntk;
    if(d.ntcancel != null){ NTED = ''; changed(); rerender(); return; }
    if(d.nted){ if(!signedIn()) return; NTED = k + '#' + d.nted; changed(); rerender(); setTimeout(() => { const i = document.querySelector('textarea[data-ntin="' + CSS.escape(d.nted) + '"]'); if(i){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 60); return; }
    if(d.ntdel){ const n = noteFind(k, d.ntdel); if(n) dropAny(k, n.p, n.at); return; }
    if(d.ntsave){ const n = noteFind(k, d.ntsave), i = t.closest('.mxedit').querySelector('textarea'); if(n && i && editNote(k, n.p, n.at, i.value)){ NTED = ''; changed(); rerender(); } return; }
  }, true);
  document.addEventListener('keydown', e => {
    const i = e.target; if(!i || !i.matches || !i.matches('textarea[data-ntin]')) return;
    if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); NTED = ''; changed(); rerender(); }
    else if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); const b = i.closest('.mxedit').querySelector('[data-ntsave]'); if(b) b.click(); }
  }, true);
  /* links are kept with the notes (vnote/<person>), as entries with a u - the note lists leave them out */
  function notesOf(k){ return notesAll(k).filter(n => !n.u); }
  function linksOf(k){ return notesAll(k).filter(n => n.u); }

  /* ---------- 1.2.126 (user, 10 Nov 2026): the photo viewer's details panel ----------
     - Send to Booking straight away, without a team vote (a vote she is on is closed as "sent to Booking");
     - notes on the model, written right there (the same notes the team sees on the Team Vote);
     - links that belong to the model or her agency (Instagram, another agency, models.com…), with a label. */
  function addLink(k, u, t){
    if(!signedIn()) return false;
    u = String(u || '').trim(); if(!u) return false;
    if(!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u.replace(/^\/+/, '');
    try{ const x = new URL(u); if(!/^https?:$/.test(x.protocol) || !x.hostname.includes('.')) return false; }catch(e){ return false; }
    const h = hash(k), mine = Object.assign({}, NOTE.get(me()) || {});
    mine[h] = (mine[h] || []).concat([{u: u.slice(0, 1000), t: String(t || '').trim().slice(0, 120), at: nowIso()}]);
    NOTE.set(me(), mine); saveNotes(); changed(); return true;
  }
  function dropMine(k, at){
    if(!signedIn()) return;
    const h = hash(k), mine = Object.assign({}, NOTE.get(me()) || {});
    const before = mine[h] || [], kept = before.filter(n => n.at !== at); if(kept.length === before.length) return;
    const gone = before.find(n => n.at === at);
    if(kept.length) mine[h] = kept; else delete mine[h];
    NOTE.set(me(), mine); saveNotes(); changed();
    say(gone && gone.u ? L('Link removed', '링크를 지웠습니다') : L('Note removed', '메모를 지웠습니다'), () => {
      const m2 = Object.assign({}, NOTE.get(me()) || {}); m2[h] = (m2[h] || []).concat([gone]).sort((a, b) => String(a.at).localeCompare(String(b.at)));
      NOTE.set(me(), m2); saveNotes(); changed(); });
  }
  function sendBook(k, about){
    if(!signedIn()) return;
    let c = null; try{ c = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : bkForKey(k); }catch(e){}
    if(c){ if(c.by && c.by !== me()){ const w = workOf(k); if(w){ workAsk(k, w, null, L('Open', '열기')); const g = document.querySelector('#illuwk [data-wkgo]'); if(g) g.hidden = true; return; } } say(L((c.nm || 'She') + ' is on the Booking board already.', (c.nm || '') + ' — 이미 부킹 보드에 있습니다.')); return; }
    const i = info(k), a = about || {};
    try{ c = bookFromModel(k, a.nm || i.nm || '', a.ag || i.ag || '', a.city || i.city || '', a.country || i.country || ''); }catch(e){ console.error(e); }
    if(!c) return;
    try{ remember('book', k, c.nm || k, c.ag || '', k); }catch(e){}
    const st = stateOf(k);
    if(st){ const o = Object.assign({}, st.o); delete o.legacy; if(!o.voters) o.voters = st.voters;
      /* 1.2.129 (user, 10 Nov 2026): a vote she is on carries on - only an Approved one waiting for its confirmation is marked done */
      if(!st.open && st.res === 'appr' && !o.conf){ o.conf = {by: me(), at: nowIso(), bid: c.id}; OPEN.set(st.h, o); save('vopen/' + st.h, o); } }
    MXASK = '';
    try{ renderBook(); }catch(e){}
    changed();
    say(L((c.nm || '') + ' is on the Booking board — you are in charge of her card.', (c.nm || '') + ' — 부킹 보드로 보냈습니다. 이 카드는 내가 담당합니다.'), () => { try{ bvOpenFor(c.id); }catch(e){} }, null, L('Open card', '카드 열기'));
  }
  let MXASK = '', GFASK = '', MXAGE = '';
  /* her age: the booking card's date of birth or age, else what was typed on her card before she was booked */
  function ageInfo(k, c){
    const p = c ? null : (preOf(k) || {});
    const dob = String((c ? c.dob : p.dob) || '').trim(), typed = String((c ? c.age : p.age) || '').trim();
    let fromDob = '', dobTxt = '';
    try{ if(dob && typeof dobParse === 'function'){ const q = dobParse(dob); if(q){ fromDob = String(ageFrom(dob)); dobTxt = typeof dobWords === 'function' ? dobWords(q) : dob; } } }catch(e){}
    return {age: fromDob !== '' && fromDob !== 'undefined' ? fromDob : typed, dob, typed, dobTxt};
  }
  window.__illuSetAge = (k, age, dob) => { if(!k) return; age = String(age || '').replace(/[^\d]/g, '').slice(0, 3); dob = String(dob || '').trim(); if(!age && !dob) return;
    let c = null; try{ c = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : bkForKey(k); }catch(e){} if(c){ c.age = age; c.dob = dob; saveBook(c.id, true); changed(); } else savePre(k, {age, dob}); };
  /* Enter in either box saves (the editor is a form; Save is its submit button) */
  document.addEventListener('submit', e => { const f = e.target; if(!f || !f.matches || !f.matches('form[data-pnagef]')) return; e.preventDefault(); const b = f.querySelector('[data-pnageok]'); if(b) b.click(); }, true);
  window.__illuAgeCell = k => { if(!k) return ''; let c = null; try{ c = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : bkForKey(k); }catch(e){} const A = ageInfo(k, c), lock = !!A.dobTxt;
    return '<span class="mxc mxage" data-f="age"><i>' + L('AGE', '나이') + '</i><input class="mxi mxagei" type="text" inputmode="numeric" maxlength="3" data-agek="' + H(k) + '" value="' + H(A.age) + '" placeholder="–" aria-label="' + H(L('Age', '나이')) + '"' +
      (lock ? ' readonly title="' + H(L('Born ', '생년월일 ') + A.dobTxt + L(' — change the date of birth on her card', ' — 카드에서 생년월일을 바꾸세요')) + '"' : ' title="' + H(L('Her age — type it here', '나이 — 여기에 입력')) + '"') + (signedIn() ? '' : ' disabled') + '></span>'; };
  document.addEventListener('change', e => { const i = e.target; if(!i || !i.matches || !i.matches('.mxagei') || i.readOnly) return;
    const k = i.dataset.agek, v = i.value.replace(/[^\d]/g, '').slice(0, 3); let c = null; try{ c = bkForKey(k); }catch(er){}
    if(c){ c.age = v; saveBook(c.id, true); changed(); } else savePre(k, {age: v}); });
  window.__illuAgeOf = k => { let c = null; try{ c = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : bkForKey(k); }catch(e){} return ageInfo(k, c).age; };
  /* a link's buttons: Get files (the link's book / snaps / videos into her Booking folder - 1.2.129, an option, never automatic) and remove */
  function linkBtns(k, n, c){
    const can = (() => { try{ return !!SIGNED(); }catch(e){ return false; } })();
    let b = '';
    if(window.illu && illu.getFilesPlan && /^https?:/i.test(n.u) && !/instagram\.com|tiktok\.com|facebook\.com|youtube\.com|youtu\.be/i.test(n.u)) b += '<button type="button" class="mxg" data-mxget="' + H(n.u) + '" title="' + H(L('Save the book, snaps and videos at this link into her Booking folder (Dropbox)', '이 링크의 북·스냅·영상을 부킹 폴더(Dropbox)에 저장')) + '">' + L('Get files', '파일 받기') + '</button>';
    if(can && canDrop(n.p)) b += '<button type="button" class="mxx" data-mxdel="' + H(n.p + '|' + n.at) + '" aria-label="' + H(L('Remove this link', '이 링크 지우기')) + '">×</button>';
    return b;
  }
  function getFilesFor(k, u){
    let c = null; try{ c = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : bkForKey(k); }catch(e){}
    if(!c) return;
    if(!(window.illu && illu.getFilesPlan) || !window.__illuGetFiles){ say(L('Getting files works in the ILLUMENOCTIS program on a computer.', '파일 받기는 컴퓨터의 ILLUMENOCTIS 프로그램에서 됩니다.')); return; }
    window.__illuGetFiles(u, c.id);
  }
  const hostOf = u => { try{ return new URL(u).hostname.replace(/^www\./, ''); }catch(e){ return u; } };
  /* ===== 1.2.129: one side panel for every expanded card (user, 10 Nov 2026: "make a universal same side panel")
     Top to bottom, the same everywhere except the Booking board's own cards: name, agency and board; the
     measurements; where she is (nothing yet / on the Team Vote / on the Booking board); the agency; notes; links. */
  function factsOf(k){
    let i = {}, f = {};
    try{ if(typeof agIndex === 'function') agIndex(); }catch(e){}
    try{ i = (typeof keyInfo === 'function' && keyInfo(k)) || {}; }catch(e){}
    try{ f = (typeof litFacts === 'function' && litFacts(Object.assign({key: k}, i))) || {}; }catch(e){}
    /* 1.2.158: measurements typed on her booking card fill what the Directory does not have */
    try{ const bc = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : (typeof bkForKey === 'function' ? bkForKey(k) : null);
      if(bc){ const fb = (typeof bkFacts === 'function' && bkFacts(bc)) || {}; f = Object.assign({}, f); for(const x of ['ht', 'bu', 'wa', 'hp', 'eu', 'us', 'wt']) if(f[x] == null && fb[x] != null) f[x] = fb[x];
        if(!i.name && !i.nm) i = Object.assign({nm: bc.nm, ag: bc.ag, country: bc.nat || ''}, i); } }catch(e){}
    return {i, f};
  }
  const num = v => v == null || v === '' || isNaN(+v) ? null : Math.round(+v * 10) / 10;
  function idSec(k, a, c){
    const {i, f} = a.facts || factsOf(k);
    const sex = (a.f && a.f.g) || f.g, div = a.div || i.div || '', tier = (a.f && a.f.tier) || f.tier || i.t || '';
    const chips = [sex === 'F' ? L('Female', '여성') : sex === 'M' ? L('Male', '남성') : '', div, tier && tier !== 'unlabelled' && String(div).toLowerCase() !== String(tier).toLowerCase() ? tier : ''].filter(Boolean);
    const nf = t => /new ?face|development/i.test(t);
    const place = [a.city, a.country].filter(Boolean).join(', ');
    const F = Object.assign({}, f, a.f || {});
    const ms = [['ht', L('Height', '신장'), 'cm'], ['bu', L('Bust', '가슴'), 'cm'], ['wa', L('Waist', '허리'), 'cm'], ['hp', L('Hips', '엉덩이'), 'cm'], ['eu', L('Shoe EU', '신발 EU'), ''], ['us', L('Shoe US', '신발 US'), '']];
    const wt = c && c.wt !== '' && c.wt != null && !isNaN(parseFloat(c.wt)) ? parseFloat(c.wt) : null;
    if(wt != null) ms.push(['wt', L('Weight', '몸무게'), 'kg']);
    return '<div class="pnid"><h2>' + H(a.nm || i.nm || '') + '</h2>' +
      (a.ag ? (a.agRef ? '<button type="button" class="pnag" data-pnag="' + H(a.agRef) + '" title="' + H(L('Open this agency in the Directory', '디렉터리에서 이 에이전시 열기')) + '">' + H(a.ag) + ' ›</button>' : '<p class="pnag">' + H(a.ag) + '</p>') : '') +
      (place ? '<p class="pnpl">' + H(place) + '</p>' : '') +
      (chips.length ? '<div class="pnchips">' + chips.map(t => '<span class="pnchip' + (nf(t) ? ' nf' : '') + '">' + H(t) + '</span>').join('') + '</div>' : '') + '</div>' +
      '<div class="pnms' + (ms.length > 6 ? ' seven' : '') + '">' + ms.map(([key, l, u]) => { const v = key === 'wt' ? wt : num(F[key]); return '<div' + (v == null ? ' class="no"' : '') + '><small>' + H(l) + '</small><b>' + (v == null ? '–' : H(v) + (u ? '<em>' + u + '</em>' : '')) + '</b></div>'; }).join('') + '</div>' +
      (a.readNote || '');
  }
  function statusSec(k, a, c, st, can, nm){
    const ask = MXASK === k ? '<div class="mxask"><p>' + H(L('Send ' + nm + ' to the Booking board without a vote? You will be in charge of her card.', nm + ' — 투표 없이 부킹 보드로 보낼까요? 이 카드는 내가 담당합니다.')) +
      (st && st.open ? ' ' + H(L('Her Team Vote carries on.', '팀 투표는 계속 진행됩니다.')) : '') + '</p><div><button type="button" class="mxb pri" data-mxsendyes>' + L('Send to Booking', '부킹으로 보내기') + '</button><button type="button" class="mxb" data-mxsendno>' + L('Cancel', '취소') + '</button></div></div>' : '';
    const voteBtns = () => '<div class="pnvote"><button type="button" class="pnv g' + (st.mine === 'g' ? ' on' : '') + '" data-pnv="g"' + (can ? '' : ' disabled') + ' aria-pressed="' + (st.mine === 'g') + '">✓ ' + L('Go', '찬성') + '</button><button type="button" class="pnv r' + (st.mine === 'r' ? ' on' : '') + '" data-pnv="r"' + (can ? '' : ' disabled') + ' aria-pressed="' + (st.mine === 'r') + '">✕ ' + L('Pass', '반대') + '</button></div>';
    const bar = () => '<div class="pnbar">' + st.voters.map((p, i) => '<i class="' + (i < st.n ? 'in' : '') + '"></i>').join('') + '</div>';
    const openLine = () => '<div class="pnh"><span class="pndot v"></span><b>' + H(L('Team Vote · ' + st.n + ' of ' + st.of + ' voted', '팀 투표 · ' + st.of + '명 중 ' + st.n + '명')) + '</b><span class="pnr">' + (st.hist.length ? H(L('Round ' + st.round, st.round + '라운드')) + ' · ' : '') + H(when(st.hist.length ? st.hist[st.hist.length - 1].at : st.o.at)) + '</span></div>' + bar() + voteBtns() +
      '<p class="mxhint">' + (st.mine ? H(st.mine === 'g' ? L('You voted Go. ', '내 투표: 찬성. ') : L('You voted Pass. ', '내 투표: 반대. ')) : st.voters.includes(me()) ? '<b class="pnwait">' + L('Waiting for your vote. ', '내 투표를 기다리는 중. ') + '</b>' : '') + H(L('Votes stay hidden until all ' + st.of + ' have voted.', '모두(' + st.of + '명) 투표할 때까지 보이지 않습니다.')) + '</p>' + (st.hist.length ? rounds(st) : '');
    const doneLine = () => '<div class="pnh"><span class="pndot ' + (st.res === 'appr' ? 'ok' : 'x') + '"></span><b>' + H(st.res === 'appr' ? L('Team Vote: Approved ' + st.g + '–' + st.r, '팀 투표: 승인 ' + st.g + '–' + st.r) : L('Team Vote: Cancelled ' + st.g + '–' + st.r, '팀 투표: 취소 ' + st.g + '–' + st.r)) + '</b><span class="pnr">' + H(when(st.at)) + '</span></div>' +
      '<p class="mxhint">' + H(L('Go: ', '찬성: ') + (st.gp.map(pname).join(', ') || '–') + ' · ' + L('Pass: ', '반대: ') + (st.xp.map(pname).join(', ') || '–')) + '</p>';
    let h;
    if(c){
      let who = ''; try{ const p = PEOPLE.get(c.by); who = p ? p.n : ''; }catch(e){}
      h = '<div class="pnst book"><div class="pnh"><span class="pndot b"></span><b>' + L('On the Booking board', '부킹 보드에 있음') + '</b>' + (who ? '<span class="pnr">' + H(L('in charge: ', '담당: ') + who) + '</span>' : '') + '</div>' +
        '<button type="button" class="mxb pri pnfull" data-mxopen="' + H(c.id) + '">' + L('Open booking card →', '부킹 카드 열기 →') + '</button>';
      /* the team can still vote on a model who went to Booking without one */
      if(st && st.open) h += '<div class="pnsub">' + openLine() + '</div>';
      else if(st && !st.o.off) h += '<div class="pnsub">' + doneLine() + (st.res !== 'appr' ? '<p class="mxhint">' + L('Her booking card stays where it is.', '부킹 카드는 그대로 둡니다.') + '</p>' : '') + '</div>';
      else h += '<div class="pnsub"><button type="button" class="mxb" data-mxvote' + (can ? '' : ' disabled') + '>' + L('Send to Team Vote', '팀 투표로 보내기') + '</button><p class="mxhint">' + L('She stays on the Booking board while the team votes.', '팀이 투표하는 동안 부킹 보드에 그대로 있습니다.') + '</p></div>';
      return h + '</div>';
    }
    if(st && st.open){
      return '<div class="pnst vote">' + openLine() + (ask || '<button type="button" class="mxb" data-mxsend' + (can ? '' : ' disabled') + '>' + L('Send to Booking', '부킹으로 보내기') + '</button>') + '</div>';
    }
    if(st && !st.o.off){
      h = '<div class="pnst ' + (st.res === 'appr' ? 'ok' : 'x') + '">' + doneLine();
      if(st.res === 'appr') h += st.o.conf ? '' : '<button type="button" class="mxb pri pnfull" data-ivconf="' + H(k) + '"' + (can ? '' : ' disabled') + '>' + L('Final confirmation → Booking', '최종 확정 → 부킹') + '</button><p class="mxhint">' + L('Whoever confirms is in charge of the booking card.', '확정한 사람이 부킹 카드를 담당합니다.') + '</p>';
      else h += '<div class="pnrow"><button type="button" class="mxb" data-ivre="' + H(k) + '"' + (can ? '' : ' disabled') + '>' + L('Reopen the vote', '투표 다시 열기') + '</button>' + (ask ? '' : '<button type="button" class="mxb" data-mxsend' + (can ? '' : ' disabled') + '>' + L('Send to Booking', '부킹으로 보내기') + '</button>') + '</div>' + ask;
      return h + '</div>';
    }
    return '<div class="pnst"><div class="pnh"><span class="pndot"></span><b>' + L('Not on the Team Vote', '팀 투표 전') + '</b></div>' +
      (ask || '<div class="pnrow"><button type="button" class="mxb" data-mxvote' + (can ? '' : ' disabled') + '>' + L('Send to Team Vote', '팀 투표로 보내기') + '</button><button type="button" class="mxb pri" data-mxsend' + (can ? '' : ' disabled') + '>' + L('Send to Booking', '부킹으로 보내기') + '</button></div>' +
        '<p class="mxhint">' + L('Send to Booking skips the vote; the team can still vote afterwards.', '부킹으로 보내면 투표 없이 넘어가고, 나중에 투표할 수도 있습니다.') + '</p>') + '</div>';
  }
  function agencySec(k, a){
    const rows = [];
    if(a.href) rows.push([L('Profile', '프로필'), '<a href="' + H(a.href) + '" target="_blank" rel="noopener">' + L('Open on the agency’s site ↗', '에이전시 사이트에서 열기 ↗') + '</a>']);
    if(a.nPhotos) rows.push([L('Photos', '사진'), H(L(a.nPhotos + ' from the agency’s page', '에이전시 페이지 사진 ' + a.nPhotos + '장'))]);
    if(a.boards) rows.push([L('Boards', '보드'), H(a.boards)]);
    let chip = ''; try{ chip = a.href && typeof ctsChip === 'function' ? ctsChip(a.href, a.ag || '') : ''; }catch(e){}
    if(chip) rows.push([L('Contact', '연락처'), '<span class="pnct">' + chip + '</span>']);
    if(a.ig) rows.push(['Instagram', '<a href="https://www.instagram.com/' + H(String(a.ig).replace(/^@/, '')) + '/" target="_blank" rel="noopener">@' + H(String(a.ig).replace(/^@/, '')) + ' ↗</a>']);
    if(!rows.length) return '';
    return '<section class="mxs"><h3>' + L('Agency', '에이전시') + '</h3><dl class="pnkv">' + rows.map(r => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('') + '</dl></section>';
  }
  function notesSec(k, nm, can){
    const ns = notesOf(k);
    return '<section class="mxs"><h3>' + L('Notes', '메모') + (ns.length ? ' <span>' + ns.length + '</span>' : '') + '</h3>' +
      (ns.length ? '<ul class="mxl">' + ns.map(n => '<li><div class="mxw">' + disc(n.p, 'xs') + '<b>' + H(pname(n.p)) + '</b><span>' + H(when(n.at)) + '</span><i class="mxsp"></i>' + noteBtns(k, n) + '</div>' + noteBody(k, n) + '</li>').join('') + '</ul>' : '<p class="mxhint">' + L('No notes yet.', '아직 메모가 없습니다.') + '</p>') +
      (can ? '<div class="mxin"><textarea data-mxin="note" rows="2" placeholder="' + H(L('Write a note about ' + nm + '…', nm + '에 대한 메모…')) + '"></textarea><button type="button" class="mxb pri" data-mxnote>' + L('Add', '추가') + '</button></div>' : '') + '</section>';
  }
  function linksSec(k, c, can){
    const ls = linksOf(k), MAT = window.__illuMaterials;
    return '<section class="mxs"><h3>' + L('Links', '링크') + (ls.length ? ' <span>' + ls.length + '</span>' : '') + '</h3>' +
      (ls.length ? '<ul class="mxl">' + ls.map(n => '<li class="lk"><a href="' + H(n.u) + '" target="_blank" rel="noopener">' + H(n.t || hostOf(n.u)) + ' ↗</a><span class="mxu">' + H(n.t ? hostOf(n.u) + ' · ' : '') + H(pname(n.p)) + '</span>' + linkBtns(k, n, c) + (MAT ? MAT.linkRow(k, n.u) : '') + '</li>').join('') + '</ul>' : '<p class="mxhint">' + L('Instagram, another agency, a Drive folder or package — any page about her.', '인스타그램, 다른 에이전시, 드라이브 폴더나 패키지 등 모델 관련 페이지.') + '</p>') +
      (ls.length && MAT ? MAT.linksHint(k) : '') +
      (can ? '<div class="mxin lk"><input data-mxin="url" type="url" inputmode="url" placeholder="https://…"><input data-mxin="lab" type="text" placeholder="' + H(L('Label (optional)', '이름 (선택)')) + '"><button type="button" class="mxb pri" data-mxlink>' + L('Add link', '링크 추가') + '</button></div><p class="mxerr" hidden></p>' : '') + '</section>';
  }

  /* ---------- 1.2.129 (user, 10 Nov 2026): Guarantee Type, amount and availability typed on a vote card ----------
     Kept in vpre/<hash> (shared, anyone signed in can type it). When she goes to Booking - by Final confirmation,
     Send to Booking or from the Directory - it is copied onto her new booking card (only into empty boxes), so
     nothing is typed twice. Once she has a booking card, the booking card is where it is changed. */
  const PGTY = [['no', 'No Guarantee', '노 개런티'], ['cond', 'Condition Guarantee', '컨디션 개런티'], ['net', 'Net Guarantee', '넷 개런티']];
  const preOf = k => k ? PRE.get(hash(k)) || null : null;
  window.__illuVotePre = preOf;
  const commas = v => { const n = String(v == null ? '' : v).replace(/[^\d]/g, ''); return n ? (+n).toLocaleString('en-US') : ''; };
  function savePre(k, patch){
    if(!signedIn()) return;
    const h = hash(k), o = Object.assign({k}, PRE.get(h) || {}, patch, {by: me(), at: nowIso()});
    PRE.set(h, o); save('vpre/' + h, o); changed();
  }
  function carryPre(c, k){
    try{ const mo = momOf(k); if(c && mo && mo.ag && (!c.ag || String(c.ag).trim().toLowerCase() !== mo.ag.toLowerCase())){ c.ag = mo.ag; saveBook(c.id, true); } }catch(e){}
    const p = preOf(k); if(!c || !p) return;
    const empty = v => v == null || String(v).trim() === '';
    let ch = 0;
    if(p.gty && empty(c.gty)){ c.gty = p.gty; ch = 1; }
    const g = c.gty || p.gty;
    if(p.amt && g === p.gty){
      if(g === 'net' && empty(c.ctguar)){ c.ctguar = p.amt; c.ctgmode = p.per === 'month' ? 'month' : 'term'; ch = 1; }
      if(g === 'cond' && empty(c.ctgm)){ c.ctgm = p.amt; ch = 1; }
    }
    if(p.avf && empty(c.avf)){ c.avf = p.avf; ch = 1; }
    if(p.age && empty(c.age)){ c.age = p.age; ch = 1; }
    if(p.dob && empty(c.dob)){ c.dob = p.dob; ch = 1; }
    /* the agency's reply goes into the Email stage's own notes (the card's My notes) */
    if(p.entry || p.anote){ c.s = c.s || {}; c.s.email = c.s.email || {}; if(empty(c.s.email.t)){ c.s.email.t = [p.entry ? L('Entry: ', '입국: ') + p.entry : '', p.anote || ''].filter(Boolean).join('\n'); ch = 1; } }
    /* 1.2.136: the stay is the contract length (one number) */
    if(p.avd && empty(c.ctdays) && firstNum(p.avd)){ c.ctdays = firstNum(p.avd); ch = 1; }
    if(p.jobs && g === 'cond' && empty(c.ctjobs)){ c.ctjobs = p.jobs; ch = 1; }
    if(ch){ try{ saveBook(c.id, true); }catch(e){ console.error(e); } }
  }
  function wrapBook(){
    try{
      if(typeof bookFromModel !== 'function'){ setTimeout(wrapBook, 300); return; }
      if(bookFromModel.__pre) return;
      const orig = bookFromModel;
      const w = function(key){ const c = orig.apply(this, arguments); try{ carryPre(c, key); }catch(e){ console.error(e); } return c; };
      w.__pre = true; window.bookFromModel = w;
    }catch(e){ setTimeout(wrapBook, 300); }
  }
  wrapBook();
  function preSec(k, c, can){
    if(c) return '';
    const p = preOf(k) || {}, g = p.gty || '';
    const dis = can ? '' : ' disabled';
    const amtLab = g === 'cond' ? L('Full guarantee per month (₩)', '월 개런티 전액 (₩)') : L('Guarantee amount (₩)', '개런티 금액 (₩)');
    return '<section class="mxs mxpre"><h3>' + L('Guarantee & availability', '개런티 · 가능 기간') + '</h3>' +
      '<div class="mxpt" role="radiogroup" aria-label="' + H(L('Guarantee Type', '개런티 유형')) + '">' + PGTY.map(([v, en, ko]) => '<button type="button" role="radio" aria-checked="' + (g === v) + '" class="mxpo' + (g === v ? ' on' : '') + '" data-prety="' + v + '"' + dis + '>' + H(L(en, ko)) + '</button>').join('') + '</div>' +
      (g === 'net' || g === 'cond' ? '<label class="mxpf"><span>' + H(amtLab) + '</span><input data-mxin="pre-amt" inputmode="numeric" placeholder="0" value="' + H(p.amt || '') + '"' + dis + '></label>' +
        (g === 'net' ? '<div class="mxpt sm" role="radiogroup">' + [['term', L('Whole term', '전체 기간')], ['month', L('Per month', '월')]].map(([v, t]) => '<button type="button" role="radio" aria-checked="' + ((p.per === 'month') === (v === 'month')) + '" class="mxpo' + ((p.per === 'month') === (v === 'month') ? ' on' : '') + '" data-preper="' + v + '"' + dis + '>' + t + '</button>').join('') + '</div>' : '') : '') +
      '<div class="mxp2"><label class="mxpf"><span>' + L('Available from', '가능 시작일') + '</span><input data-mxin="pre-avf" placeholder="DD/MM/YYYY" value="' + H(p.avf || '') + '"' + dis + '></label>' +
      '<label class="mxpf"><span>' + L('Length of stay (days)', '체류 기간 (일)') + '</span><input data-mxin="pre-avd" placeholder="' + H(L('e.g. 60–90', '예: 60–90')) + '" value="' + H(p.avd || '') + '"' + dis + '></label></div>' +
      '<div class="mxp2"><label class="mxpf"><span>' + L('Age', '나이') + '</span><input data-mxin="pre-age" inputmode="numeric" placeholder="—" value="' + H(p.age || '') + '"' + dis + '></label>' +
      '<label class="mxpf"><span>' + L('Entry window', '입국 시기') + '</span><input data-mxin="pre-entry" placeholder="' + H(L('e.g. mid-Dec, being confirmed', '예: 12월 중순, 확인 중')) + '" value="' + H(p.entry || '') + '"' + dis + '></label></div>' +
      '<label class="mxpf"><span>' + L('Agency notes', '에이전시 메모') + '</span><textarea data-mxin="pre-anote" rows="2" placeholder="' + H(L('What the agency said - e.g. active in Europe and North America with several agencies', '에이전시 답변 - 예: 유럽·북미 여러 에이전시 활동')) + '"' + dis + '>' + H(p.anote || '') + '</textarea></label>' +
      '<p class="mxhint">' + (p.by && p.at ? H(L('Last typed by ', '마지막 입력: ') + pname(p.by) + ' · ' + when(p.at) + '. ') : '') + L('Goes onto her booking card when she moves to Booking.', '부킹으로 넘어가면 부킹 카드에 그대로 옮겨집니다.') + '</p></section>';
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.mx [data-prety],.mx [data-preper]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    const k = b.closest('.mx').dataset.mxk; if(!k) return;
    if(b.dataset.prety){ const cur = (preOf(k) || {}).gty; savePre(k, {gty: cur === b.dataset.prety ? '' : b.dataset.prety}); return; }
    savePre(k, {per: b.dataset.preper === 'month' ? 'month' : 'term'});
  }, true);
  document.addEventListener('change', e => {
    const t = e.target; if(!t || !t.dataset || !/^pre-/.test(t.dataset.mxin || '') || !t.closest('.mx')) return;
    const k = t.closest('.mx').dataset.mxk; if(!k) return;
    const f = t.dataset.mxin.slice(4);
    let v = t.value.trim();
    if(f === 'amt') v = commas(v);
    if(f === 'age') v = v.replace(/[^\d]/g, '').slice(0, 2);
    if(f === 'avd'){ const m = v.match(/(\d+)\s*(?:[-–~to]+\s*(\d+))?/); v = m ? (m[2] && m[2] !== m[1] ? m[1] + '–' + m[2] : m[1]) : ''; }
    if(f === 'avf'){ const m = v.replace(/\s/g, '').match(/^(\d{1,2})[\/.\-]?(\d{1,2})[\/.\-]?(\d{4})$/); if(m) v = String(+m[1]).padStart(2, '0') + '/' + String(+m[2]).padStart(2, '0') + '/' + m[3]; }
    t.value = v; savePre(k, {[f]: v});
  }, true);
  /* ===== 1.2.130 (user, 10 Nov 2026: "a lot going on ... repetitive ... UI/UX design PLEASE"; approved Side Panel Demo)
     One clean panel: photo, name, ONE agency link (her page on the agency's site), one line of place · sex · board;
     one row of measurements in the top bar's units (one shoe size); Status with its action as a link; guarantee
     folded to one line; the agency's photos / contact / Instagram as small buttons; Notes and Links as two tabs. */
  const PTAB = new Map(), PEDIT = new Set();
  const uLen = (v, ht) => { try{ return window.__illuLen ? window.__illuLen(v, ht) : (v == null ? null : String(v)); }catch(e){ return null; } };
  const uShoe = (eu, us, g) => { try{ return window.__illuShoe ? window.__illuShoe(eu, us, g) : (eu == null ? null : String(eu)); }catch(e){ return null; } };
  const uS = () => { try{ return window.__illuShoeUnit ? window.__illuShoeUnit() : 'EU'; }catch(e){ return 'EU'; } };
  const uL = ht => { try{ return window.__illuLenUnit ? window.__illuLenUnit(ht) : 'cm'; }catch(e){ return 'cm'; } };
  /* ---------- 1.2.133 (user, 10 Nov 2026): her Mother Agency ----------
     "this agency is the Mother Agency for Houston. She is also listed on another agency. Allow me to select the
     title of Mother Agency for the Model." Chosen in the side panel: "This agency is her mother agency", or another
     agency picked from the Directory. A MOTHER tag shows on her cards and in the panel; ✉ in the panel writes to
     the mother agency; her booking card takes the mother agency's name. Kept in mother/<hash> (shared). */
  const momOf = k => k ? MOM.get(hash(k)) || null : null;
  const lc = v => String(v || '').trim().toLowerCase();
  window.__illuMother = (k, ag) => { const m = momOf(k); return !!(m && ag && lc(m.ag) === lc(ag)); };
  window.__illuMotherOf = momOf;
  const MOMED = new Set();
  function setMom(k, ag, dom){
    if(!signedIn()) return;
    const h = hash(k), prev = MOM.get(h) || null;
    const apply = v => { if(v){ MOM.set(h, v); save('mother/' + h, v); } else { MOM.delete(h); save('mother/' + h, {k, ag: '', by: me(), at: nowIso(), cleared: 1}); } changed(); };
    const v = ag ? {k, ag: String(ag).trim(), dom: dom || '', by: me(), at: nowIso()} : null;
    apply(v);
    try{ let c = bkForKey(k); if(c && v && lc(c.ag) !== lc(v.ag)){ c.ag = v.ag; saveBook(c.id, true); } }catch(e){}
    try{ window.__illuUndo && window.__illuUndo.push(L('Mother agency', '마더 에이전시'), () => apply(prev)); }catch(e){}
  }
  function momBox(k, a){
    const m = momOf(k), ag = a.ag || '', can = signedIn();
    const same = m && lc(m.ag) === lc(ag);
    if(!MOMED.has(k)){
      if(same) return can ? '<button type="button" class="pnlk pnmomset" data-momed>' + L('Change mother agency', '마더 에이전시 변경') + '</button>' : '';
      if(m) return '<p class="pnmomo">' + L('Mother agency: ', '마더 에이전시: ') + '<b>' + H(m.ag) + '</b>' + (can ? ' <button type="button" class="pnlk" data-momed>' + L('Change', '변경') + '</button>' : '') + '</p>';
      return can ? '<button type="button" class="pnlk pnmomset" data-momed>' + L('Set mother agency', '마더 에이전시 지정') + '</button>' : '';
    }
    const names = (() => { try{ return [...new Set(AG.map(x => x.name))].sort((x, y) => x.localeCompare(y)); }catch(e){ return []; } })();
    return '<div class="pnmomed"><button type="button" class="mxb' + (same ? ' pri' : '') + '" data-momthis>' + H(L('This agency (' + ag + ')', '이 에이전시 (' + ag + ')')) + '</button>' +
      '<div class="pnmomr"><input data-mxin="mom-ag" list="pnmomdl" placeholder="' + H(L('Or another agency…', '또는 다른 에이전시…')) + '" value="' + H(m && !same ? m.ag : '') + '"><datalist id="pnmomdl">' + names.map(n => '<option value="' + H(n) + '">').join('') + '</datalist><button type="button" class="mxb pri" data-momsave>' + L('Save', '저장') + '</button></div>' +
      '<div class="pnmomr">' + (m ? '<button type="button" class="pnlk" data-momclr>' + L('Remove mother agency', '마더 에이전시 해제') + '</button>' : '') + '<button type="button" class="pnlk" data-momed>' + L('Close', '닫기') + '</button></div></div>';
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('.mx [data-momed],.mx [data-momthis],.mx [data-momsave],.mx [data-momclr]'); if(!t) return;
    e.preventDefault(); e.stopPropagation();
    const box = t.closest('.mx'), k = box.dataset.mxk; if(!k) return;
    const ab = (() => { try{ return JSON.parse(box.dataset.mxab || '{}'); }catch(err){ return {}; } })();
    if(t.dataset.momed != null){ if(MOMED.has(k)) MOMED.delete(k); else MOMED.add(k); changed(); return; }
    if(t.dataset.momthis != null){ const i = info(k); const ag = ab.ag || i.ag || ''; let dom = ''; try{ const hit = AG.find(x => lc(x.name) === lc(ag)); dom = hit ? hit.domain || '' : ''; }catch(err){} MOMED.delete(k); setMom(k, ag, dom); return; }
    if(t.dataset.momsave != null){ const v = (box.querySelector('[data-mxin="mom-ag"]') || {}).value || ''; if(!v.trim()) return; let dom = ''; try{ const hit = AG.find(x => lc(x.name) === lc(v)); dom = hit ? hit.domain || '' : ''; }catch(err){} MOMED.delete(k); setMom(k, v.trim(), dom); return; }
    if(t.dataset.momclr != null){ MOMED.delete(k); setMom(k, '', ''); }
  }, true);
  /* 1.2.168 (user, 13 Nov 2026): like the agency from the side panel -> it goes to Favorite Agencies (the same ★ list as the Directory / Atlas) */
  function agDomOf(a, ag, href){
    let A = []; try{ A = AG || []; }catch(e){}
    const lc = x => String(x || '').trim().toLowerCase().replace(/^www\./, '');
    const has = d => d && A.some(x => lc(x.domain) === d);
    if(has(lc(a.agRef))) return lc(a.agRef);
    if(ag){ const n = lc(ag); const x = A.find(x => lc(x.name) === n); if(x) return lc(x.domain); }
    try{ const h = lc(new URL(href).hostname); const x = A.find(x => h === lc(x.domain) || h.endsWith('.' + lc(x.domain))); if(x) return lc(x.domain); }catch(e){}
    return '';
  }
  window.__illuAgDomOf = agDomOf;
  function agFavBtn(a, ag, href){
    if(!window.ATLFAV) return ''; const d = agDomOf(a, ag, href); if(!d) return '';
    const on = ATLFAV.has(d);
    return '<button type="button" class="pnagfav' + (on ? ' on' : '') + '" data-pnagfav="' + H(d) + '" data-pnagnm="' + H(ag) + '" aria-pressed="' + on + '" aria-label="' + H(on ? L(ag + ' is in Favorite Agencies — click to remove', ag + ' 즐겨찾는 에이전시에 있음 — 누르면 뺍니다') : L('Add ' + ag + ' to Favorite Agencies', ag + ' 즐겨찾는 에이전시에 추가')) + '" title="' + H(on ? L('In Favorite Agencies — click to remove', '즐겨찾는 에이전시에 있음 — 누르면 뺍니다') : L('Add this agency to Favorite Agencies', '이 에이전시를 즐겨찾는 에이전시에 추가')) + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg></button>';
  }
  function pnHead(k, a, c, fav){
    const {i, f} = a.facts || factsOf(k);
    const F = Object.assign({}, f, a.f || {});
    const sex = F.g || (c && c.sex) || '';
    const tier = (a.f && a.f.tier) || f.tier || i.t || '';
    const TL = {newfaces: L('New faces', '뉴 페이스'), development: L('Development', '디벨롭먼트'), main: L('Main', '메인'), direct: L('Direct', '다이렉트')};
    const place = [a.city || i.city, a.country || i.country].filter(Boolean).join(', ');
    const meta = [place, sex === 'F' ? L('Female', '여성') : sex === 'M' ? L('Male', '남성') : '', TL[tier] || (tier && tier !== 'unlabelled' ? tier : '')].filter(Boolean).join(' · ');
    let pic = ''; try{ const id = typeof PICS !== 'undefined' && PICS.get(k); let src = id ? picURL(id) : (F.photo || ''); if(src && window.__illuSmall && /^https?:/i.test(src)) src = window.__illuSmall(src, 300); if(src) pic = '<img src="' + H(src) + '" alt="" referrerpolicy="no-referrer" decoding="async" loading="lazy">'; }catch(e){}
    const href = a.href || i.href || '';
    const ag = a.ag || i.ag || '';
    const agH = ag ? (href ? '<a class="pnagl" href="' + H(href) + '" target="_blank" rel="noopener" title="' + H(L('Her page on the agency’s site', '에이전시 사이트의 모델 페이지')) + '">' + H(ag) + ' ↗</a>'
      : (a.agRef ? '<button type="button" class="pnagl" data-pnag="' + H(a.agRef) + '" title="' + H(L('Open this agency in the Directory', '디렉터리에서 이 에이전시 열기')) + '">' + H(ag) + ' ›</button>' : '<span class="pnagl">' + H(ag) + '</span>')) : '';
    const mom = (() => { try{ return window.__illuMother && window.__illuMother(k, ag); }catch(e){ return false; } })();
    /* 1.2.168 (user, 13 Nov 2026): her name opens her page on the agency's site */
    const pg = href || (/^https?:\/\//i.test(k || '') && !/instagram\.com/i.test(k) ? k : '');
    const nmTxt = H(a.nm || i.nm || '');
    return '<div class="pnhd"><div class="pnth">' + pic + '</div><div class="pnhm"><h2>' + (pg ? '<a class="pnnml" href="' + H(pg) + '" target="_blank" rel="noopener" title="' + H(L('Open her page on the agency’s site', '에이전시 사이트에서 모델 페이지 열기')) + '">' + nmTxt + '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3L5 11"/></svg></a>' : nmTxt) + '</h2>' +
      '<div class="pnagr">' + agH + agFavBtn(a, ag, href) + (mom ? '<span class="pnmom">' + L('Mother', '마더') + '</span>' : '') + '</div>' +
      (meta ? '<p class="pnmeta">' + H(meta) + '</p>' : '') + momBox(k, a) + '</div>' +
      '<button type="button" class="pnfav' + (fav ? ' on' : '') + '" data-pnfav aria-pressed="' + fav + '" title="' + H(fav ? L('In My Favorites — click to remove', '내 즐겨찾기 — 누르면 뺍니다') : L('Add to My Favorites', '내 즐겨찾기에 추가')) + '">' + HEART + '</button></div>' +
      (a.readNote || '');
  }
  function pnMeas(k, a, c){
    const {f} = a.facts || factsOf(k);
    const F = Object.assign({}, f, a.f || {});
    const g = F.g || '';
    const cell = (lab, v, u) => '<div' + (v == null ? ' class="no"' : '') + '><small>' + H(lab) + '</small><b>' + (v == null ? '–' : H(v)) + (v != null && u ? '<em>' + H(u) + '</em>' : '') + '</b></div>';
    /* 1.2.140 (user, 11 Nov 2026: "I need a part to input the age on the cards (not just on the booking cards)"): Age sits
       with the measurements on every card; tap it to type the age or the date of birth. With a booking card it is the
       booking card's own Age / Date of birth (the contract and visa read those); before that it is kept with her card
       and goes onto the booking card when she is booked. */
    const A = ageInfo(k, c), can = signedIn();
    const ageCell = '<button type="button" class="pnage' + (A.age === '' ? ' no' : '') + '" data-pnage' + (can ? '' : ' disabled') + ' aria-label="' + H(L('Age — tap to change', '나이 — 눌러서 바꾸기')) + '" title="' + H(A.dobTxt ? L('Born ', '생년월일 ') + A.dobTxt : L('Tap to type her age or date of birth', '눌러서 나이나 생년월일 입력')) + '"><small>' + L('Age', '나이') + '</small><b>' + (A.age === '' ? '–' : H(A.age)) + '</b></button>';
    const ed = MXAGE === k && can ? '<form class="pnaged" data-pnagef><label><span>' + L('Age', '나이') + '</span><input data-mxin="age-v" inputmode="numeric" placeholder="–" value="' + H(A.typed) + '"></label>' +
      '<label><span>' + L('Date of birth', '생년월일') + '</span><input data-mxin="age-dob" placeholder="DD/MM/YYYY" value="' + H(A.dob) + '"></label>' +
      '<p>' + L('With a date of birth the age works itself out. The same age is on her booking card, contract and visa.', '생년월일을 넣으면 나이가 자동으로 계산됩니다. 부킹 카드·계약서·비자에도 같은 나이가 들어갑니다.') + '</p>' +
      '<div><button type="button" class="mxb" data-pnagex>' + L('Cancel', '취소') + '</button><button type="submit" class="mxb pri" data-pnageok>' + L('Save', '저장') + '</button></div></form>' : '';
    return '<div class="pnmr pnmr6">' + cell(L('Height', '신장'), uLen(F.ht, true), uL(true)) + cell(L('Bust', '가슴'), uLen(F.bu), uL()) + cell(L('Waist', '허리'), uLen(F.wa), uL()) +
      cell(L('Hips', '엉덩이'), uLen(F.hp), uL()) + cell(L('Shoe', '신발'), uShoe(F.eu, F.us, g), uS()) + ageCell + '</div>' + ed;
  }
  function pnSecH(title, right){ return '<div class="pnsh"><h3>' + title + '</h3>' + (right || '') + '</div>'; }
  function pnStatus(k, a, c, st, can, nm){
    const ask = MXASK === k ? '<div class="mxask"><p>' + H(L('Send ' + nm + ' to the Booking board? You will be in charge of her card.', nm + ' — 부킹 보드로 보낼까요? 이 카드는 내가 담당합니다.')) +
      (st && st.open ? ' ' + H(L('Her Team Vote carries on.', '팀 투표는 계속 진행됩니다.')) : '') + '</p><div><button type="button" class="mxb pri" data-mxsendyes>' + L('Send to Booking', '부킹으로 보내기') + '</button><button type="button" class="mxb" data-mxsendno>' + L('Cancel', '취소') + '</button></div></div>' : '';
    const voteBox = () => '<div class="pnvb' + (st.mine ? ' done' : '') + '"><div class="pnvh"><b>' + H(L('Team Vote · ' + st.n + ' of ' + st.of, '팀 투표 · ' + st.of + '명 중 ' + st.n + '명')) + '</b><span>' +
      (st.hist.length ? H(L('Round ' + st.round, st.round + '라운드')) + ' · ' : '') + H(when(st.hist.length ? st.hist[st.hist.length - 1].at : st.o.at)) + '</span></div>' +
      '<div class="pnbar">' + st.voters.map((p, i) => '<i class="' + (i < st.n ? 'in' : '') + '"></i>').join('') + '</div>' +
      '<div class="pnvote"><button type="button" class="pnv g' + (st.mine === 'g' ? ' on' : '') + '" data-pnv="g"' + (can ? '' : ' disabled') + ' aria-pressed="' + (st.mine === 'g') + '">✓ ' + L('Go', '찬성') + '</button><button type="button" class="pnv r' + (st.mine === 'r' ? ' on' : '') + '" data-pnv="r"' + (can ? '' : ' disabled') + ' aria-pressed="' + (st.mine === 'r') + '">✕ ' + L('Pass', '반대') + '</button></div>' +
      '<p>' + (st.mine ? H(st.mine === 'g' ? L('You voted Go. ', '내 투표: 찬성. ') : L('You voted Pass. ', '내 투표: 반대. ')) : st.voters.includes(me()) ? '<b>' + L('Waiting for your vote. ', '내 투표를 기다리는 중. ') + '</b>' : '') + H(L('Votes stay hidden until all ' + st.of + ' have voted.', '모두(' + st.of + '명) 투표할 때까지 보이지 않습니다.')) + '</p></div>';
    const doneBox = () => '<div class="pnvb ' + (st.res === 'appr' ? 'ok' : 'x') + '"><div class="pnvh"><b>' + H(st.res === 'appr' ? L('Approved ' + st.g + '–' + st.r, '승인 ' + st.g + '–' + st.r) : L('Cancelled ' + st.g + '–' + st.r, '취소 ' + st.g + '–' + st.r)) + '</b><span>' + H(when(st.at)) + '</span></div>' +
      '<p>' + H(L('Go: ', '찬성: ') + (st.gp.map(pname).join(', ') || '–') + ' · ' + L('Pass: ', '반대: ') + (st.xp.map(pname).join(', ') || '–')) + '</p></div>';
    const link = (attr, t, dis) => '<button type="button" class="pnlk" ' + attr + (dis ? ' disabled' : '') + '>' + t + '</button>';
    let right = '', body = '';
    if(c){
      let who = ''; try{ const p = PEOPLE.get(c.by); who = p ? p.n : ''; }catch(e){}
      right = link('data-mxopen="' + H(c.id) + '"', L('Open booking card →', '부킹 카드 열기 →'));
      body = '<div class="pnbk"><span>' + L('On the Booking board', '부킹 보드에 있음') + '</span>' + (who ? '<span>' + H(L('in charge: ', '담당: ') + who) + '</span>' : '') + '</div>';
      if(st && st.open) body += voteBox();
      else if(st && !st.o.off) body += doneBox();
      else body += '<div class="pnrow">' + link('data-mxvote', L('Send to Team Vote', '팀 투표로 보내기'), !can) + '</div>';
    }else if(st && st.open){
      right = ask ? '' : link('data-mxsend', L('Send to Booking →', '부킹으로 보내기 →'), !can);
      body = ask + voteBox();
    }else if(st && !st.o.off){
      body = doneBox();
      if(st.res === 'appr') body += st.o.conf ? '' : '<button type="button" class="mxb pri pnfull" data-ivconf="' + H(k) + '"' + (can ? '' : ' disabled') + '>' + L('Final confirmation → Booking', '최종 확정 → 부킹') + '</button>';
      else { right = ask ? '' : link('data-mxsend', L('Send to Booking →', '부킹으로 보내기 →'), !can); body += ask + '<div class="pnrow"><button type="button" class="mxb" data-ivre="' + H(k) + '"' + (can ? '' : ' disabled') + '>' + L('Reopen the vote', '투표 다시 열기') + '</button></div>'; }
    }else{
      body = ask || '<div class="pnrow"><button type="button" class="mxb" data-mxvote' + (can ? '' : ' disabled') + '>' + L('Send to Team Vote', '팀 투표로 보내기') + '</button><button type="button" class="mxb pri" data-mxsend' + (can ? '' : ' disabled') + '>' + L('Send to Booking', '부킹으로 보내기') + '</button></div>';
    }
    return '<section class="pns">' + pnSecH(L('Status', '상태'), right) + body + '</section>';
  }
  const MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const shortDate = v => { const m = String(v || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(!m) return v; const y = +m[3], now = new Date().getFullYear(); return (+m[1]) + ' ' + (isKO() ? (+m[2]) + '월' : MONS[+m[2] - 1]) + (y !== now && y !== now + 1 ? ' ' + y : ''); };
  function gSummary(k, c, compact){
    let g = {}, amt = '', sub = '', av = '', stay = '', ctd = '';
    const GN = {no: L('No Guarantee', '노 개런티'), cond: L('Condition Guarantee', '컨디션 개런티'), net: L('Net Guarantee', '넷 개런티')};
    const short = v => { const n = +String(v || '').replace(/[^\d]/g, ''); return n >= 1e6 ? '₩' + (Math.round(n / 1e5) / 10) + 'M' : n ? '₩' + n.toLocaleString('en-US') : ''; };
    if(c){
      g.gty = c.gty || '';
      if(g.gty === 'net' && c.ctguar){ amt = short(c.ctguar) + (c.ctgmode === 'month' ? '/mo' : ''); }
      if(g.gty === 'cond' && c.ctgm) amt = short(c.ctgm) + '/mo';
      av = c.avf || ''; stay = c.avd || ''; ctd = String(c.ctdays || '').replace(/[^\d]/g, '');
    }else{
      const p = preOf(k) || {}; g.gty = p.gty || '';
      if(p.amt && (g.gty === 'net' || g.gty === 'cond')) amt = short(p.amt) + (g.gty === 'cond' || p.per === 'month' ? '/mo' : '');
      av = p.avf || ''; stay = p.avd || '';
    }
    let gH;
    if(g.gty === 'no') gH = '<b>' + L('None', '없음') + '</b><span class="sub">' + GN.no + '</span>';
    else if(g.gty) gH = (amt ? '<b>' + H(amt) + '</b>' : '<b class="no">' + L('Amount not set', '금액 미정') + '</b>') + '<span class="sub' + (g.gty === 'cond' ? ' cond' : '') + '">' + GN[g.gty] + '</span>';
    else gH = '<b class="no">' + L('Not set', '미정') + '</b><span class="sub">&nbsp;</span>';
    let ex = '';
    if(!compact){ const p = c ? {} : (preOf(k) || {}); const age = c ? (c.age || '') : (p.age || ''), entry = c ? '' : (p.entry || ''), an = c ? '' : (p.anote || '');
      const bits = [age ? L('Age ', '나이 ') + age : '', entry ? L('Entry ', '입국 ') + entry : ''].filter(Boolean);
      if(bits.length || an) ex = '<div class="pnkvx">' + (bits.length ? '<span>' + H(bits.join(' · ')) + '</span>' : '') + (an ? '<p>' + H(an) + '</p>' : '') + '</div>'; }
    return ex ? '<div class="pnkvw">' + gSummary2() + ex + '</div>' : gSummary2();
    function gSummary2(){ return '<div class="pnkv"><div><small>' + L('Guarantee', '개런티') + '</small>' + gH + '</div><div><small>' + L('Available', '가능') + '</small>' + (av ? '<b title="' + H(av) + '">' + H(compact ? shortDate(av) : av) + '</b>' : '<b class="no">' + L('Not set', '미정') + '</b>') + '<span class="sub' + (stay ? '' : ' no') + '">' + (stay ? H(L('Stay ', '체류 ') + String(stay).replace('-', '–') + L(' days', '일')) : ctd ? H(L('Contract ', '계약 ') + ctd + L(' days', '일')) : H(L('Stay not set', '체류 미정'))) + '</span></div></div>'; }
  }
  /* ===== 1.2.136 (user, 11 Nov 2026; approved "Vote Card Final Design"): Guarantee & availability is typed right in the
     side panel - no Edit step. Guarantee type, amount (whole term / per month), the Condition figures and the stay are
     her booking card CONTRACT's own data (the same boxes); before she has a booking card they wait in vpre/ and go into
     the contract when the card is made. "Available" is a rough estimate in words ("mid-Dec") - never in the contract.
     Contract starts and the other contract details stay on the booking card. Stay is one number (60 / 90, or typed). */
  const firstNum = v => ((String(v == null ? '' : v).match(/\d+/) || [''])[0]).slice(0, 3);
  function gOf(k, c){
    if(c) return {gty: c.gty || '', amt: c.ctguar || '', mode: c.ctgmode === 'month' ? 'month' : 'term', cgm: c.ctgm || '', jobs: c.ctjobs || '', days: firstNum(c.ctdays || c.avd), avf: c.avf || ''};
    const p = preOf(k) || {};
    return {gty: p.gty || '', amt: p.gty === 'cond' ? '' : (p.amt || ''), mode: p.per === 'month' ? 'month' : 'term', cgm: p.gty === 'cond' ? (p.amt || '') : (p.cgm || ''), jobs: p.jobs || '', days: firstNum(p.avd), avf: p.avf || ''};
  }
  const GFIELD = {gty: 'gty', amt: 'ctguar', mode: 'ctgmode', cgm: 'ctgm', jobs: 'ctjobs', days: 'ctdays', avf: 'avf'};
  function gSet(k, f, v){
    if(!signedIn()) return;
    let c = null; try{ c = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : bkForKey(k); }catch(e){}
    const before = gOf(k, c); if(String(before[f] || '') === String(v || '')) return;
    const nm = (c && c.nm) || info(k).nm || '';
    if(c){
      const fld = GFIELD[f], old = c[fld];
      c[fld] = v;
      try{ saveBook(c.id, true); }catch(e){ console.error(e); }
      try{ window.__illuUndo && window.__illuUndo.push(nm + L(' · guarantee & availability', ' · 개런티 · 가능 기간'), () => { const cc = bkForKey(k); if(!cc) return; cc[fld] = old; saveBook(cc.id, true); changed(); try{ renderBook(); }catch(e){} }); }catch(e){}
      try{ renderBook(); }catch(e){}
    }else{
      const p0 = Object.assign({}, preOf(k) || {});
      const patch = f === 'gty' ? {gty: v} : f === 'amt' ? {amt: v} : f === 'cgm' ? {amt: v} : f === 'mode' ? {per: v} : f === 'jobs' ? {jobs: v} : f === 'days' ? {avd: v} : {avf: v};
      savePre(k, patch);
      try{ window.__illuUndo && window.__illuUndo.push(nm + L(' · guarantee & availability', ' · 개런티 · 가능 기간'), () => { const h = hash(k); PRE.set(h, p0); save('vpre/' + h, p0); changed(); }); }catch(e){}
      return;
    }
    changed();
  }
  const LNI = '<svg class="gsln" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
  function pnGuar(k, c, can){
    const g = gOf(k, c), dis = can ? '' : ' disabled';
    const cell = (show, lab, body, extra, cls) => '<label class="gscell' + (cls ? ' ' + cls : '') + '">' + '<small>' + (show ? LNI : '') + H(lab) + '</small><span class="gsval">' + body + '</span>' + (extra || '') + '</label>';
    const inp = (f, val, ph, attrs) => '<input data-gin="' + f + '" value="' + H(val) + '" placeholder="' + H(ph) + '"' + (attrs || '') + dis + '>';
    let rows = '';
    if(g.gty === 'net') rows += cell(1, L('Guarantee', '개런티'), '<span class="gscur">₩</span>' + inp('amt', g.amt, L('Amount', '금액'), ' inputmode="numeric"') +
      '<span class="gstog" role="group" aria-label="' + H(L('Amount is for', '금액 기준')) + '">' + [['term', L('Term', '전체')], ['month', L('Month', '월')]].map(([v, t]) => '<button type="button" data-gmode="' + v + '" aria-pressed="' + (g.mode === v) + '"' + dis + '>' + t + '</button>').join('') + '</span>');
    if(g.gty === 'cond') rows += cell(1, L('Per month', '월'), '<span class="gscur">₩</span>' + inp('cgm', g.cgm, L('Full guarantee', '월 개런티 전액'), ' inputmode="numeric"')) +
      cell(1, L('If', '조건'), inp('jobs', g.jobs, '5', ' inputmode="numeric" class="gsjobs"') + '<span class="gsunit">' + L('full-day jobs / 30 days', '풀데이 잡 / 30일') + '</span>');
    if(g.gty === 'no') rows += '<div class="gscell none"><small>' + L('Guarantee', '개런티') + '</small><span class="gsval">' + L('None. Nothing to fill in.', '없음. 입력할 것이 없습니다.') + '</span></div>';
    /* 1.2.171 (user: "title name AVAILABILITY & GUARANTEE ... Stay on top. Then Available ... Then Guarantee Type at the end"):
       Stay and Available in the first box, then the guarantee type with its own boxes under it */
    const grows = rows; rows = '';
    rows += cell(1, L('Stay', '체류'), inp('days', g.days, '–', ' inputmode="numeric" class="gsdays" style="width:' + (Math.max(2, (g.days || '–').length) + 0.6) + 'ch"') + '<span class="gsunit">' + L('days', '일') + '</span>',
      '<span class="gschips">' + ['60', '90'].map(d => '<button type="button" data-gdays="' + d + '" aria-pressed="' + (g.days === d) + '"' + dis + '>' + d + L(' days', '일') + '</button>').join('') + '</span>');
    rows += cell(0, L('Available', '가능'), inp('avf', g.avf, '', ' maxlength="40"'), '<span class="gsestn">' + L('Rough estimate. Not in the contract.', '대략적인 예상. 계약서에는 들어가지 않습니다.') + '</span>', 'est');
    let ex = '';
    if(!c){ const p = preOf(k) || {}; const bits = [p.age ? L('Age ', '나이 ') + p.age : '', p.entry ? L('Entry ', '입국 ') + p.entry : ''].filter(Boolean);
      if(bits.length || p.anote) ex = '<div class="pnkvx">' + (bits.length ? '<span>' + H(bits.join(' · ')) + '</span>' : '') + (p.anote ? '<p>' + H(p.anote) + '</p>' : '') + '</div>'; }
    return '<section class="pns gs">' + pnSecH(L('Availability & guarantee', '가능 기간 · 개런티'), '<span class="gssync" title="' + H(c ? L('The same boxes as her booking card contract', '부킹 카드 계약서와 같은 칸') : L('Goes into her contract when she has a booking card', '부킹 카드가 생기면 계약서로 들어갑니다')) + '">' + LNI + (c ? L('Same as contract', '계약서와 동일') : L('Goes into her contract', '계약서로 연결')) + '</span>') +
      '<div class="gsbox">' + rows + '</div>' +
      '<div class="gssub">' + LNI + H(L('Guarantee type', '개런티 유형')) + '</div>' +
      '<div class="gsseg" role="group" aria-label="' + H(L('Guarantee type', '개런티 유형')) + '">' + [['net', L('Net', '넷')], ['cond', L('Condition', '컨디션')], ['no', L('No guarantee', '노 개런티')]].map(([v, t]) => '<button type="button" data-ggty="' + v + '" aria-pressed="' + (g.gty === v) + '"' + dis + '>' + t + '</button>').join('') + '</div>' +
      (grows ? '<div class="gsbox">' + grows + '</div>' : '') + ex + '</section>';
  }
  /* typing: saved when the box is left (or Enter), so the panel never redraws under the cursor */
  const gKey = el => { const m = el && el.closest && el.closest('.mx'); return m ? m.dataset.mxk : ''; };
  function gClean(f, v){
    v = String(v == null ? '' : v).trim();
    if(f === 'amt' || f === 'cgm') return commas(v);
    if(f === 'days') return firstNum(v);
    if(f === 'jobs') return firstNum(v).slice(0, 2);
    return v.replace(/\s+/g, ' ').slice(0, 40);
  }
  document.addEventListener('input', e => {
    const t = e.target; if(!t || !t.dataset || !t.dataset.gin) return;
    if(t.dataset.gin === 'days'){ const v = firstNum(t.value); if(t.value !== v) t.value = v; t.style.width = (Math.max(2, (t.value || t.placeholder).length) + 0.6) + 'ch'; }
    if(t.dataset.gin === 'jobs'){ const v = firstNum(t.value).slice(0, 2); if(t.value !== v) t.value = v; }
  }, true);
  document.addEventListener('change', e => {
    const t = e.target; if(!t || !t.dataset || !t.dataset.gin) return;
    const k = gKey(t); if(!k) return;
    const v = gClean(t.dataset.gin, t.value); t.value = v; gSet(k, t.dataset.gin, v);
  }, true);
  document.addEventListener('keydown', e => {
    const t = e.target; if(!t || !t.dataset || !t.dataset.gin || e.key !== 'Enter') return;
    e.preventDefault(); t.blur();
  }, true);
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.mx [data-ggty],.mx [data-gmode],.mx [data-gdays]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    const k = gKey(b); if(!k) return;
    const a = document.activeElement; if(a && a.dataset && a.dataset.gin && a.closest('.mx') === b.closest('.mx')){ gSet(k, a.dataset.gin, gClean(a.dataset.gin, a.value)); }
    if(b.dataset.ggty) gSet(k, 'gty', b.dataset.ggty);
    else if(b.dataset.gmode) gSet(k, 'mode', b.dataset.gmode === 'month' ? 'month' : 'term');
    else gSet(k, 'days', b.dataset.gdays);
  }, true);
  window.__illuGuar = {get: (k) => { let c = null; try{ c = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : bkForKey(k); }catch(e){} return gOf(k, c); }, set: gSet};
  function pnAgency(k, a){
    const pills = [];
    if(a.nPhotos) pills.push('<span class="pnpill">' + H(L(a.nPhotos + ' photos', '사진 ' + a.nPhotos + '장')) + '</span>');
    let chip = ''; try{ chip = (a.href || a.agRef) && typeof ctsChip === 'function' ? ctsChip(a.href || ('https://' + a.agRef), a.ag || '') : ''; }catch(e){}
    const mo = momOf(k);
    if(mo && mo.dom && lc(mo.ag) !== lc(a.ag)){ let mc = ''; try{ mc = typeof ctsChip === 'function' ? ctsChip('https://' + mo.dom, mo.ag) : ''; }catch(e){} if(mc){ pills.push('<span class="pnct pnmomct" title="' + H(L('Write to her mother agency', '마더 에이전시에 메일')) + '"><em>' + L('Mother', '마더') + '</em>' + mc + '</span>'); chip = ''; } }
    if(chip) pills.push('<span class="pnct">' + chip + '</span>');
    if(a.ig) pills.push('<a class="pnpill" href="https://www.instagram.com/' + H(String(a.ig).replace(/^@/, '')) + '/" target="_blank" rel="noopener">@' + H(String(a.ig).replace(/^@/, '')) + ' ↗</a>');
    if(!pills.length) return '';
    return '<section class="pns">' + pnSecH(L('Agency', '에이전시')) + '<div class="pnpills">' + pills.join('') + '</div></section>';
  }
  function pnTabs(k, c, nm, can){
    const gfa = GFASK && GFASK.split('\n')[0] === k ? '<div class="mxask"><p>' + H(L('Get files puts ' + nm + ' on the Booking board (her Team Vote carries on), makes her folder and saves the book, snaps and videos into it. You will be in charge of her card.', nm + ' — 부킹 보드에 올리고(팀 투표는 계속), 폴더를 만들어 북·스냅·영상을 저장합니다. 이 카드는 내가 담당합니다.')) + '</p><div><button type="button" class="mxb pri" data-gfyes>' + L('Put on Booking and get files', '부킹에 올리고 파일 받기') + '</button><button type="button" class="mxb" data-gfno>' + L('Cancel', '취소') + '</button></div></div>' : '';
    if(gfa) PTAB.set(k, 'links');
    const t = PTAB.get(k) === 'links' ? 'links' : 'notes';
    const ns = notesOf(k).length, ls = linksOf(k).length;
    const tab = (v, lab, n) => '<button type="button" role="tab" data-ptab="' + v + '" aria-selected="' + (t === v) + '">' + lab + (n ? ' <s>' + n + '</s>' : '') + '</button>';
    const inner = (t === 'notes' ? notesSec(k, nm, can) : linksSec(k, c, can)).replace(/^<section class="mxs"><h3>.*?<\/h3>/, '<div class="mxs">').replace(/<\/section>$/, '</div>');
    return '<section class="pns"><div class="pntabs" role="tablist">' + tab('notes', L('Notes', '메모'), ns) + tab('links', L('Links', '링크'), ls) + '</div>' + gfa + inner + '</section>';
  }
  function modelPanel(k, about){
    if(!k) return '';
    const can = signedIn(), a = about || {}, nm = a.nm || info(k).nm || L('her', '모델');
    let c = null; try{ c = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : bkForKey(k); }catch(e){}
    const st = stateOf(k), fav = myFav().has(k);
    const facts = factsOf(k), aa = Object.assign({facts}, a);
    return '<div class="mx pn pn2" data-mxk="' + H(k) + '" data-mxab="' + H(JSON.stringify({nm: a.nm || '', ag: a.ag || '', city: a.city || '', country: a.country || ''})) + '">' +
      pnHead(k, aa, c, fav) + pnMeas(k, aa, c) + pnStatus(k, aa, c, st, can, nm) + pnGuar(k, c, can) + pnAgency(k, aa) + availSec(k, aa, can) + pnTabs(k, c, nm, can) + '</div>';
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('.mx [data-ptab],.mx [data-pedit]'); if(!t) return;
    e.preventDefault(); e.stopPropagation();
    const k = t.closest('.mx').dataset.mxk; if(!k) return;
    if(t.dataset.ptab) PTAB.set(k, t.dataset.ptab);
    else { if(PEDIT.has(k)) PEDIT.delete(k); else PEDIT.add(k); }
    changed();
  }, true);
  window.__illuModelPanel = modelPanel;
  /* the older block (Booking / Notes / Links) - kept for anything that still asks for it */
  function extras(k, about){
    if(!k) return '';
    const can = signedIn(), a = about || {}, nm = a.nm || info(k).nm || L('her', '모델');
    let c = null; try{ c = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : bkForKey(k); }catch(e){}
    return '<div class="mx" data-mxk="' + H(k) + '" data-mxab="' + H(JSON.stringify({nm: a.nm || '', ag: a.ag || '', city: a.city || '', country: a.country || ''})) + '">' +
      statusSec(k, a, c, stateOf(k), can, nm) + availSec(k, a, can) + notesSec(k, nm, can) + linksSec(k, c, can) + '</div>';
  }
  window.__illuModelExtras = extras;
  /* 1.2.129: paint the Booking / Notes / Links block into any card's panel; what is being typed (a note, a link,
     a note being edited) and the cursor survive the repaint */
  window.__illuMxPaint = (host, html) => {
    if(!host || host.__mxh === html) return;
    const keep = [...host.querySelectorAll('[data-mxin],[data-ntin]')].map(n => ({sel: n.dataset.mxin ? '[data-mxin="' + n.dataset.mxin + '"]' : '[data-ntin="' + CSS.escape(n.dataset.ntin) + '"]', v: n.value, f: n === document.activeElement, a: n.selectionStart || 0, b: n.selectionEnd || 0}));
    host.__mxh = html; host.innerHTML = html;
    for(const x of keep){ const n = host.querySelector(x.sel); if(!n) continue; n.value = x.v; if(x.f){ try{ n.focus({preventScroll: true}); n.setSelectionRange(x.a, x.b); }catch(e){} } }
  };
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('.mx [data-pnage],.mx [data-pnagex],.mx [data-pnageok],.mx [data-pnv],.mx [data-pnfav],.mx [data-pnag],.mx [data-pnagfav],.mx [data-mxvote],.mx [data-mxget],.mx [data-mxsend],.mx [data-mxsendyes],.mx [data-mxsendno],.mx [data-gfyes],.mx [data-gfno],.mx [data-mxnote],.mx [data-mxlink],.mx [data-mxdel],.mx [data-mxopen]'); if(!t) return;
    e.preventDefault(); e.stopPropagation();
    const box = t.closest('.mx'), k = box.dataset.mxk, d = t.dataset;
    if(d.mxsend != null){ if(!signedIn()) return; MXASK = k; changed(); return; }
    if(d.pnv){ if(!signedIn()) return; const ab = (() => { try{ return JSON.parse(box.dataset.mxab || 'null'); }catch(err){ return null; } })(); cast(k, d.pnv, ab || {}); return; }
    if(d.pnfav != null){ const ab = (() => { try{ return JSON.parse(box.dataset.mxab || 'null'); }catch(err){ return null; } })(); toggleFav(k, ab || {}); return; }
    if(d.pnagfav){ if(!signedIn() || !window.ATLFAV) return; const dom = d.pnagfav, nm = d.pnagnm || dom; const added = ATLFAV.toggle(dom);
      try{ window.__illuFavAg && window.__illuFavAg.render && window.__illuFavAg.render(); }catch(err){} changed();
      say(added ? L(nm + ' added to Favorite Agencies', nm + ' — 즐겨찾는 에이전시에 추가했습니다') : L(nm + ' removed from Favorite Agencies', nm + ' — 즐겨찾는 에이전시에서 뺐습니다'), () => { ATLFAV.toggle(dom); try{ window.__illuFavAg && window.__illuFavAg.render && window.__illuFavAg.render(); }catch(err){} changed(); }); return; }
    if(d.pnag){ if(window.__illuDirGoAg) window.__illuDirGoAg(d.pnag); return; }
    if(d.mxvote != null){ const ab = (() => { try{ return JSON.parse(box.dataset.mxab || 'null'); }catch(err){ return null; } })(); sendVote(k, ab); return; }
    if(d.mxget){ let c0 = null; try{ c0 = bkForKey(k); }catch(err){}
      /* 1.2.130 (user, 10 Nov 2026): Get files from any card - she goes onto the Booking board first (her vote carries on) */
      if(!c0){ if(!signedIn()) return; GFASK = k + '\n' + d.mxget; changed(); return; }
      getFilesFor(k, d.mxget); return; }
    if(d.gfyes != null){ const [gk, gu] = GFASK.split('\n'); GFASK = ''; const ab = (() => { try{ return JSON.parse(box.dataset.mxab || 'null'); }catch(err){ return null; } })();
      sendBook(gk, ab); let n = 0; const go = () => { let c1 = null; try{ c1 = bkForKey(gk); }catch(err){} if(c1){ getFilesFor(gk, gu); return; } if(++n < 30) setTimeout(go, 100); }; setTimeout(go, 100); return; }
    if(d.gfno != null){ GFASK = ''; changed(); return; }
    if(d.mxsendno != null){ MXASK = ''; changed(); return; }
    if(d.pnage != null){ MXAGE = MXAGE === k ? '' : k; changed(); setTimeout(() => { const i = document.querySelector('[data-mxin="age-v"]'); if(i) try{ i.focus(); i.select(); }catch(er){} }, 30); return; }
    if(d.pnagex != null){ MXAGE = ''; changed(); return; }
    if(d.pnageok != null){
      const av = ((box.querySelector('[data-mxin="age-v"]') || {}).value || '').replace(/[^\d]/g, '').slice(0, 3), dv = ((box.querySelector('[data-mxin="age-dob"]') || {}).value || '').trim();
      if(dv && typeof dobParse === 'function' && !dobParse(dv)){ const i = box.querySelector('[data-mxin="age-dob"]'); if(i){ i.setCustomValidity && i.setCustomValidity('DD/MM/YYYY'); i.reportValidity && i.reportValidity(); i.style.borderColor = '#C0303C'; } return; }
      let c = null; try{ c = bkForKey(k); }catch(err){}
      if(c){ c.age = av; c.dob = dv; saveBook(c.id, true); } else savePre(k, {age: av, dob: dv});
      MXAGE = ''; changed(); try{ window.__illuRefreshCards && window.__illuRefreshCards(); }catch(err){} return; }
    if(d.mxsendyes != null){ const ab = (() => { try{ return JSON.parse(box.dataset.mxab || 'null'); }catch(err){ return null; } })(); sendBook(k, ab); return; }
    if(d.mxopen){ try{ const fv = document.getElementById('illufv'); if(fv && !fv.hidden){ const x = fv.querySelector('.fvx'); if(x) x.click(); } }catch(err){} try{ bvOpenFor(d.mxopen); }catch(err){} return; }
    if(d.mxdel){ const i = d.mxdel.indexOf('|'); dropAny(k, d.mxdel.slice(0, i), d.mxdel.slice(i + 1)); return; }
    if(d.mxnote != null){ const i = box.querySelector('[data-mxin="note"]'), v = i && i.value.trim(); if(!v) return; i.value = ''; addNote(k, v); return; }
    if(d.mxlink != null){ const u = box.querySelector('[data-mxin="url"]'), lb = box.querySelector('[data-mxin="lab"]'), er = box.querySelector('.mxerr');
      if(addLink(k, u && u.value, lb && lb.value)){ u.value = ''; if(lb) lb.value = ''; if(er) er.hidden = true; }
      else if(er){ er.textContent = L('That does not look like a web address — e.g. instagram.com/name', '웹 주소가 아닌 것 같습니다 — 예: instagram.com/name'); er.hidden = false; }
      return; }
  }, true);
  document.addEventListener('keydown', e => {
    const i = e.target; if(!i || !i.closest || !i.closest('.mx')) return;
    if(e.key === 'Enter' && !e.shiftKey && (i.dataset.mxin === 'note' || i.dataset.mxin === 'url' || i.dataset.mxin === 'lab')){ e.preventDefault(); const b = i.closest('.mxs').querySelector(i.dataset.mxin === 'note' ? '[data-mxnote]' : '[data-mxlink]'); if(b) b.click(); }
  }, true);

  /* ---------- the lamps on every card: ♡, ✓ Go, ✕ Pass, and how many have voted ---------- */
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.3A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.8c0 5.7-7.5 10.3-7.5 10.3z"/></svg>';
  function foot(k, nm, meta, url){
    if(!k) return '';
    const st = stateOf(k), fav = myFav().has(k);
    const heart = '<button type="button" class="ivh' + (fav ? ' on' : '') + '" data-ivfav title="' + H(fav ? L('In My Favorites since ', '내 즐겨찾기에 추가: ') + when(myFav().get(k).at) + L(' — click to remove', ' — 누르면 뺍니다') : L('Add to My Favorites', '내 즐겨찾기에 추가')) + '" aria-pressed="' + fav + '" aria-label="' + H(L('Favourite', '즐겨찾기')) + '">' + HEART + '</button>';
    let right;
    if(!st){
      right = fav ? '<button type="button" class="ivsend" data-ivsend title="' + H(L('Ask the team to vote on her', '팀에게 투표를 요청합니다')) + '">' + L('Send to Team Vote', '팀 투표로 보내기') + '</button>' : '';
    }else if(!st.open){
      right = '<span class="ivres ' + st.res + '" title="' + H(L('Open the card to see who voted what', '카드를 열면 누가 어떻게 투표했는지 보입니다')) + '">' + (st.res === 'appr' ? '✓ ' + L('Approved', '승인') : '✕ ' + L('Cancelled', '취소')) + ' <b>' + st.g + '–' + st.r + '</b></span>';
    }else{
      const mine = st ? st.mine : '';
      const lamp = (v, t) => '<i class="ivl ' + v + (mine === v ? ' on' : '') + '" data-ivv="' + v + '" role="button" tabindex="0" title="' + H(t) + '" aria-pressed="' + (mine === v) + '"></i>';
      right = lamp('g', L('Go — vote to book', '찬성 — 부킹에 찬성')) + lamp('r', L('Pass — vote against', '반대 — 부킹에 반대')) +
        (st ? (st.hist.length ? '<span class="ivtb" title="' + H(L('Tie-breaker, round ' + st.round, '타이브레이커 ' + st.round + '라운드')) + '">TB' + st.round + '</span>' : '') +
          '<span class="ivc" title="' + H(L(st.n + ' of ' + st.of + ' have voted — names stay hidden until everyone has voted', st.of + '명 중 ' + st.n + '명 투표 — 모두 투표할 때까지 이름은 보이지 않습니다')) + '">' + st.n + '/' + st.of + '</span>' : '');
    }
    /* 1.2.103: the circles glow while the team still has to vote (from the moment someone puts the model in
       their Favorites); a decided card glows green (Approved) or red (Cancelled) and its circles stop glowing */
    const glow = st ? (st.open ? ' open' + (st.mine ? ' voted' : '') : ' ' + st.res) : '';
    /* 1.2.107: data-at = when the card went up for the vote (the clock and the speed of the glow count from it);
       "late" = 3 hours or more and I still have not voted -> Vote Now */
    const at = (!st || st.open) ? startAt(k, st) : '', need = needK(k, st);
    return '<span class="vmk' + (need ? ' need' : '') + (need && at && ageH(at) >= 3 ? ' late' : '') + glow + '" data-mk="' + H(k) + '"' + (at ? ' data-at="' + H(at) + '"' : '') + ' data-nm="' + H(nm || '') + '" data-meta="' + H(meta || '') + '" data-url="' + H(url || '') + '">' + heart + noteBtn(k) + '<span class="ivsp"></span>' + right + '</span>';
  }
  /* 1.2.175 (user: "when something is written in the notes section, have a note cursor appear by the heart ... light tone
     yellow. selecting/clicking on the note will open up the important note that needs to be read"): a yellow note
     beside the heart when the team has written notes on her; it opens them */
  function noteBtn(k){
    let ns = []; try{ ns = notesOf(k).filter(n => String(n.t || '').trim()); }catch(e){}
    if(!ns.length) return '';
    return '<button type="button" class="ivnt" data-ivnt="' + H(k) + '" title="' + H(L(ns.length + (ns.length === 1 ? ' note' : ' notes') + ' — click to read', '메모 ' + ns.length + '개 — 눌러서 읽기')) + '" aria-label="' + H(L('Read the notes', '메모 읽기')) + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8.5 11h7M8.5 14.5h7M8.5 18h4"/></svg>' + (ns.length > 1 ? '<b>' + ns.length + '</b>' : '') + '</button>';
  }
  let NTPOP = null;
  function closeNotePop(){ if(NTPOP){ NTPOP.remove(); NTPOP = null; } }
  function openNotePop(btn){
    closeNotePop();
    const k = btn.dataset.ivnt; let ns = []; try{ ns = notesOf(k).filter(n => String(n.t || '').trim()).sort((a, b) => String(b.at).localeCompare(String(a.at))); }catch(e){}
    let nm = ''; try{ nm = (btn.closest('.vmk') || {}).dataset ? btn.closest('.vmk').dataset.nm || '' : ''; if(!nm) nm = info(k).nm || ''; }catch(e){}
    const d = document.createElement('div'); d.id = 'ivntpop'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', L('Notes', '메모'));
    d.innerHTML = '<div class="ivnth"><b>' + H(L('Notes', '메모')) + (nm ? ' · ' + H(nm) : '') + '</b><button type="button" data-ivntx aria-label="' + H(L('Close', '닫기')) + '">×</button></div>' +
      ns.map(n => '<div class="ivntn"><div class="ivntm"><b>' + H(pname(n.p)) + '</b> <span>' + H(when(n.at)) + '</span></div><p>' + H(n.t) + '</p>' + (n.ed ? '<span class="ivnte">' + H(L('edited by ' + pname(n.ed.by), pname(n.ed.by) + ' 수정')) + '</span>' : '') + '</div>').join('');
    document.body.appendChild(d); NTPOP = d;
    const r = btn.getBoundingClientRect(), w = Math.min(340, innerWidth - 24);
    d.style.width = w + 'px';
    d.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left - 8)) + 'px';
    const h = d.offsetHeight; d.style.top = (r.bottom + 8 + h > innerHeight - 8 ? Math.max(8, r.top - h - 8) : r.bottom + 8) + 'px';
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-ivnt]');
    if(b){ e.preventDefault(); e.stopPropagation(); if(NTPOP && NTPOP.__k === b.dataset.ivnt){ closeNotePop(); return; } openNotePop(b); if(NTPOP) NTPOP.__k = b.dataset.ivnt; return; }
    if(NTPOP && (e.target.closest('[data-ivntx]') || !e.target.closest('#ivntpop'))) closeNotePop();
  }, true);
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && NTPOP){ e.stopPropagation(); closeNotePop(); } }, true);
  addEventListener('scroll', closeNotePop, true);
  window.__illuVoteLamps = foot;
  window.__illuVoteMine = k => { const s = stateOf(k); return s ? s.mine || '' : ''; };
  /* repaint every footer of one model in place */
  function repaint(k){
    let list = [];
    try{ list = document.querySelectorAll('.vmk[data-mk="' + CSS.escape(k) + '"]'); }catch(e){}
    list.forEach(b => { const n = document.createElement('span'); n.innerHTML = foot(k, b.dataset.nm, b.dataset.meta, b.dataset.url); const nb = n.firstChild; if(nb && nb.outerHTML !== b.outerHTML) b.replaceWith(nb); });
  }
  function repaintAll(){ document.querySelectorAll('.vmk[data-mk]').forEach(b => repaint(b.dataset.mk)); }
  /* clicks: in the capture phase, so a card or link underneath never sees them */
  function onClick(e){
    const box = e.target.closest && e.target.closest('.vmk[data-mk]'); if(!box) return;
    e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    const k = box.dataset.mk;
    const nb = e.target.closest('[data-ivnt]'); if(nb){ if(NTPOP && NTPOP.__k === nb.dataset.ivnt){ closeNotePop(); return; } openNotePop(nb); if(NTPOP) NTPOP.__k = nb.dataset.ivnt; return; }
    if(NTPOP) closeNotePop();
    if(e.target.closest('[data-ivfav]')){ toggleFav(k, {nm: box.dataset.nm, ag: String(box.dataset.meta || '').split(' · ')[0]}); return; }
    if(e.target.closest('[data-ivsend]')){ sendVote(k, {nm: box.dataset.nm, ag: String(box.dataset.meta || '').split(' · ')[0]}); return; }
    const l = e.target.closest('[data-ivv]'); if(l){ cast(k, l.dataset.ivv, {nm: box.dataset.nm, ag: String(box.dataset.meta || '').split(' · ')[0]}); return; }
  }
  window.addEventListener('click', onClick, true);
  ['pointerdown', 'mousedown'].forEach(t => window.addEventListener(t, e => { if(e.target.closest && e.target.closest('.vmk[data-mk]') && e.button === 0) e.stopPropagation(); }, true));
  window.addEventListener('keydown', e => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const l = e.target.closest && e.target.closest('.vmk [data-ivv]'); if(!l) return;
    e.preventDefault(); e.stopPropagation(); const box = l.closest('.vmk'); cast(box.dataset.mk, l.dataset.ivv, {nm: box.dataset.nm});
  }, true);

  /* ---------- the vote, inside a card's details panel ---------- */
  function panel(k){
    if(!k) return '';
    const st = stateOf(k), favBy = people().filter(p => (FAV.get(p) || new Map()).has(k));
    /* 1.2.108 (user, 8 Nov 2026): the opened card no longer repeats the vote (no "No vote yet", no second set of
       circles, no "Favorite of") - the card's own footer and its top strip carry it. Only a finished vote keeps
       its result here (who voted Go / Pass, Confirm or Reopen), and a tie its earlier rounds. */
    if(!st) return '';
    if(st.open) return st.hist.length ? '<div class="ivp"><div class="ivph">' + L('Tie-breaker', '타이브레이커') + '</div>' + rounds(st) + '</div>' : '';
    let h = '<div class="ivp"><div class="ivph">' + L('Vote', '투표') + '</div>';
    if(!st){
      h += '<p class="ivmut">' + L('No vote yet. The first ✓ Go or ✕ Pass opens one for the whole team.', '아직 투표가 없습니다. 처음 누르는 ✓ 찬성 또는 ✕ 반대가 팀 투표를 엽니다.') + '</p><div class="ivrow">' + foot(k, info(k).nm) + '</div>';
    }else if(st.open){
      h += '<div class="ivbox open"><div class="ivrow"><b>' + L(st.n + ' of ' + st.of + ' have voted', st.of + '명 중 ' + st.n + '명 투표') + '</b><span class="ivsp"></span><span class="ivmut sm">' + (st.hist.length ? L('Round ' + st.round, st.round + '라운드') + ' · ' : '') + L('opened ', '시작 ') + H(when(st.hist.length ? st.hist[st.hist.length - 1].at : st.o.at)) + '</span></div>' +
        '<div class="ivbar">' + st.voters.map((p, i) => '<i class="' + (i < st.n ? 'in' : '') + '"></i>').join('') + '</div>' +
        '<p class="ivmut sm">' + L('Who voted what stays hidden until all ' + st.of + ' have voted.', '모두(' + st.of + '명) 투표할 때까지 누가 어떻게 투표했는지는 보이지 않습니다.') + '</p>' +
        '<div class="ivrow">' + (st.mine ? '<span class="ivtag ' + st.mine + '">' + (st.mine === 'g' ? L('You voted Go', '내 투표: 찬성') : L('You voted Pass', '내 투표: 반대')) + '</span>' : (st.voters.includes(me()) ? '<span class="ivbeacon">' + L('Waiting for your vote', '내 투표를 기다리는 중') + '</span>' : '')) + '<span class="ivsp"></span>' + foot(k, st.o.nm) + '</div></div>';
    }else{
      const side = (list, v) => '<div><span class="ivtag ' + v + '">' + (v === 'g' ? '✓ ' + L('Go', '찬성') : '✕ ' + L('Pass', '반대')) + ' · ' + list.length + '</span>' + list.map(p => '<div class="ivwho">' + disc(p) + H(pname(p)) + (p === st.o.by ? ' <span class="ivmut">· ' + L('sent it to the vote', '투표로 보냄') + '</span>' : '') + '</div>').join('') + '</div>';
      h += '<div class="ivbox done ' + st.res + '"><div class="ivrow"><b class="ivrt">' + (st.res === 'appr' ? L('Approved', '승인') : L('Cancelled', '취소')) + ' ' + st.g + '–' + st.r + '</b><span class="ivsp"></span><span class="ivmut sm">' + L('decided ', '결정 ') + H(when(st.at)) + '</span></div>' +
        '<div class="ivsides">' + side(st.gp, 'g') + side(st.xp, 'r') + '</div>' +
        (st.res === 'appr' ? (st.o.conf ? '<p class="ivmut sm">' + L('Confirmed by ', '확정: ') + '<b>' + H(pname(st.o.conf.by)) + '</b> · ' + H(when(st.o.conf.at)) + L(' — in Booking; ' + pname(st.o.conf.by) + ' is in charge.', ' — 부킹 중, 담당: ' + pname(st.o.conf.by)) + '</p>'
          : '<button type="button" class="ivbtn pri" data-ivconf="' + H(k) + '">' + L('Final confirmation → Booking', '최종 확정 → 부킹') + '</button><p class="ivmut sm">' + L('Whoever confirms is in charge of the booking card until it is complete.', '확정한 사람이 부킹 카드가 끝날 때까지 담당합니다.') + '</p>')
          : '<button type="button" class="ivbtn" data-ivre="' + H(k) + '">' + L('Reopen the vote', '투표 다시 열기') + '</button>') + '</div>';
    }
    if(st && st.hist.length) h += '<div class="ivph">' + L('Tie-breaker', '타이브레이커') + '</div>' + rounds(st);
    if(false) h += '<div class="ivph">' + L('Favorite of', '즐겨찾기한 사람') + '</div>' + (favBy.length ? favBy.map(p => '<div class="ivwho">' + disc(p) + H(pname(p)) + ' <span class="ivmut">♥ ' + H(when(FAV.get(p).get(k).at)) + '</span></div>').join('') : '<p class="ivmut sm">' + L('Nobody yet.', '아직 없습니다.') + '</p>');
    return h + '</div>';
  }
  function rounds(st){
    return st.hist.map(x => '<div class="ivround"><div class="ivrow"><b>' + L('Round ' + x.round + ' · tied ' + x.g.length + '–' + x.x.length, x.round + '라운드 · 동점 ' + x.g.length + '–' + x.x.length) + '</b><span class="ivsp"></span><span class="ivmut sm">' + H(when(x.at)) + '</span></div><div class="ivsides">' +
      '<div><span class="ivtag g">✓ ' + L('Go', '찬성') + '</span>' + x.g.map(p => '<div class="ivwho">' + disc(p) + H(pname(p)) + '</div>').join('') + '</div>' +
      '<div><span class="ivtag r">✕ ' + L('Pass', '반대') + '</span>' + x.x.map(p => '<div class="ivwho">' + disc(p) + H(pname(p)) + '</div>').join('') + '</div></div></div>').join('');
  }
  window.__illuVotePanel = panel;
  document.addEventListener('click', e => {
    const c = e.target.closest && e.target.closest('[data-ivconf]'); if(c){ e.preventDefault(); e.stopPropagation(); confirmBook(c.dataset.ivconf); return; }
    const r = e.target.closest && e.target.closest('[data-ivre]'); if(r){ e.preventDefault(); e.stopPropagation(); reopen(r.dataset.ivre); return; }
  }, true);
  /* the Directory's open card and its full view get the vote panel under the details */
  function fillPanels(){
    document.querySelectorAll('[data-ivpanel]').forEach(n => { const h = panel(n.dataset.ivpanel); if(n.__h !== h){ n.__h = h; n.innerHTML = h; } });
    const card = document.querySelector('.d2card'); if(!card) return;
    const mk = card.querySelector('.vmk[data-mk]'); if(!mk) return;
    const host = card.querySelector('.d2slfx') || card.querySelector('.litcard'); if(!host) return;
    let n = card.querySelector(':scope [data-ivpanel]');
    if(!n || n.dataset.ivpanel !== mk.dataset.mk){ if(n) n.remove(); n = document.createElement('div'); n.dataset.ivpanel = mk.dataset.mk; n.className = 'ivpwrap'; host.appendChild(n); }
    const h = panel(mk.dataset.mk); if(n.__h !== h){ n.__h = h; n.innerHTML = h; }
  }
  let fpT = 0;
  try{ new MutationObserver(() => { if(!fpT) fpT = requestAnimationFrame(() => { fpT = 0; if(document.querySelector('.d2card .vmk:not([data-ivdone])')) fillPanels(); }); }).observe(document.body, {childList: true, subtree: true}); }catch(e){}

  /* ---------- when anything changes: redraw what shows it ---------- */
  let cT = 0;
  function changed(){
    if(cT) return;
    cT = requestAnimationFrame(() => {
      cT = 0;
      /* the first time all votes are in: anything drawn before with the old lamps is drawn again */
      if(ready === 7 && !changed.once){ changed.once = true; try{ if(document.querySelector('.mk[data-mk]')) refresh(); }catch(e){} }
      repaintAll(); fillPanels();
      for(const [id, p] of PAGES) if(p.el && !p.el.hidden) p.render();
      try{ if(document.body.classList.contains('shtoday') && window.__illuTodayRender) window.__illuTodayRender(); }catch(e){}
      document.body.classList.toggle('ivwait', waiting().length > 0);
      for(const fn of (window.__illuVoteFns || [])) try{ fn(); }catch(e){}
      try{ window.__illuAlertsCheck && window.__illuAlertsCheck(); }catch(e){}
      try{ window.__illuShellRepaint && window.__illuShellRepaint(); }catch(e){}
      try{ window.__illuFvRepaint && window.__illuFvRepaint(); }catch(e){}
      pubSoon();
    });
  }
  window.__illuVoteChanged = changed;
  /* 1.2.129 (user, 10 Nov 2026): the Team Vote on a phone or browser without the program (web vote page).
     That page can't read the Directory, so the program puts each open card's photo address and measurements
     in vpub/board. A program that can't see a photo keeps the one another program already put there. */
  let pubT = 0;
  function pubSoon(){ if(pubT) return; pubT = setTimeout(() => { pubT = 0; try{ publishBoard(); }catch(e){} }, 4000); }
  /* 1.2.171 (user: "the photo isn't appearing from the shared link to vote. allow me look through all the photos
     available on the slideshow from the link"): each open card's photos for the vote page - her BOOK (then SNAPS)
     from her booking folder, saved once as the program's own copies (1400 px) because only this computer can open
     them, and the photos on her agency page. Gathered once a session per card, then published with the card. */
  const GAL = new Map();     // hash -> {ps, sm, at, busy, done}
  let GALQ = Promise.resolve();   // one card at a time
  async function shrinkUp(url){
    let ASSETS = null; try{ ASSETS = await (window.claude && window.claude.use ? window.claude.use('assets') : null); }catch(e){}
    if(!ASSETS) return '';
    const r = await fetch(url); if(!r.ok) return '';
    const b0 = await r.blob(); if(!b0.size || (b0.type && !/^image\//i.test(b0.type))) return '';
    let b = b0;
    try{ const bmp = await createImageBitmap(b0); const z = Math.min(1, 1400 / Math.max(bmp.width, bmp.height)); const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * z); cv.height = Math.round(bmp.height * z); cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height); b = (await new Promise(res => cv.toBlob(res, 'image/jpeg', .85))) || b0; }catch(e){}
    const res = await ASSETS.upload(new File([b], 'vote.jpg', {type: b.type || 'image/jpeg'}));
    return res && res.id ? '/_blob/' + res.id : '';
  }
  async function gather(k, h, old){
    const g = {ps: [], sm: Object.assign({}, (old && old.sm) || {}), at: Date.now(), busy: true, done: false}; GAL.set(h, g);
    const out = [];
    try{
      if(window.__illuMatPhotos){
        const mat = (await window.__illuMatPhotos(k, true)) || [];
        let pick = mat.filter(x => x.t === 'book'); if(!pick.length) pick = mat.filter(x => x.t === 'snaps');
        for(const x of pick.slice(0, 15)){
          const rel = x.r || x.u;
          if(/^https:/i.test(x.u)){ out.push(x.u); continue; }
          if(!/^\/_blob\/bk\./.test(x.u)){ out.push(x.u.split('?')[0]); continue; }
          let id = g.sm[rel];
          if(!id){ try{ id = await shrinkUp(x.u.split('?')[0]); }catch(e){ id = ''; } if(id) g.sm[rel] = id; }
          if(id) out.push(id);
        }
      }
    }catch(e){}
    try{
      let href = ''; try{ href = (info(k) || {}).url || ''; }catch(e){}
      if(!href){ const o = OPEN.get(h); href = (o && o.href) || ''; }
      if(!href && /^https?:/i.test(k)) href = k;
      if(href && /^https?:/i.test(href) && window.illu && window.illu.modelPhotos){
        const r = await window.illu.modelPhotos(href);
        if(r && !r.why) for(const p of (r.photos || []).slice(0, 25)){ const u = p && p.url || p; if(/^https:\/\//i.test(u || '')) out.push(u); }
      }
    }catch(e){}
    g.ps = [...new Set(out)].slice(0, 40); g.busy = false; g.done = true; g.at = Date.now();
    pubSoon();
  }
  window.__illuVoteGal = GAL;
  function publishBoard(){
    if(ready !== 7 || !me()) return;
    try{ if(!SIGNED()) return; }catch(e){ return; }
    const c = {};
    for(const st of allStates()){
      if(!st.open) continue;
      const h = st.h, old = PUBNOW[h] || {};
      let f = {}; try{ f = factsOf(st.k).f || {}; }catch(e){}
      const gal = GAL.get(h), ps = gal && gal.done ? gal.ps : (old.ps || []), sm = Object.assign({}, old.sm || {}, (gal && gal.sm) || {});
      /* 1.2.171: a stored photo (/_blob/<id>) opens on the vote page too; one only this computer has is replaced by its stored copy */
      let ph = /^https:\/\//i.test(f.photo || '') || /^\/_blob\/(?!bk\.)[A-Za-z0-9._-]+/.test(f.photo || '') ? String(f.photo).split('?')[0] : (old.ph || '');
      if(!ph && ps.length) ph = ps[0];
      const m = {}; for(const key of ['ht', 'bu', 'wa', 'hp', 'eu', 'us']){ const v = num(f[key]); if(v != null) m[key] = v; else if(old.m && old.m[key] != null) m[key] = old.m[key]; }
      c[h] = {ph, m}; if(ps.length) c[h].ps = ps; if(Object.keys(sm).length) c[h].sm = sm;
      if(!gal || (!gal.busy && Date.now() - gal.at > 6 * 3600 * 1000)){ GAL.set(h, {ps: (gal && gal.ps) || old.ps || [], sm: Object.assign({}, old.sm || {}), at: Date.now(), busy: true, done: !!gal}); const k0 = st.k, o0 = old; GALQ = GALQ.then(() => gather(k0, h, o0)).catch(() => {}); }
    }
    if(JSON.stringify(c) === JSON.stringify(PUBNOW)) return;
    PUBNOW = c; save('vpub/board', {c, at: nowIso(), by: me()});
  }

  /* ---------- messages ---------- */
  const T = document.createElement('div'); T.id = 'ivtoast'; T.hidden = true; T.setAttribute('role', 'status');
  let tT = 0;
  function say(s, undo, thumb, act){
    if(!T.isConnected) document.body.appendChild(T);
    T.innerHTML = (thumb ? '<span class="ivthumb ' + (thumb === 'r' ? 'r' : 'g') + '" aria-hidden="true"><i></i></span>' : '') + H(s) + (undo ? '<button type="button" data-ivundo>' + H(act || L('Undo', '되돌리기')) + '</button>' : '');
    T.hidden = false; T.__undo = undo || null;
    if(undo && !act) try{ window.__illuUndo && window.__illuUndo.push(s, () => { if(T.__undo === undo){ T.__undo = null; T.hidden = true; } undo(); }); }catch(e){}
    clearTimeout(tT); tT = setTimeout(() => { T.hidden = true; T.__undo = null; }, undo ? 8000 : 4200);
  }
  T.addEventListener('click', e => { if(e.target.closest('[data-ivundo]') && T.__undo){ const u = T.__undo; T.__undo = null; T.hidden = true; u(); } });

  /* ---------- the pages: Lumen, Communicatus, Approved, Tie-breaker, Cancelled ---------- */
  const PAGES = new Map();
  const card = k => { const m = info(k); let h = ''; try{ h = window.__illuCard ? window.__illuCard(m) : ''; }catch(e){ h = ''; } return h.replace('<article class="uc"', '<article class="uc" data-ivk="' + H(k) + '"'); };
  /* 1.2.105 (user, 8 Nov 2026): every vote board is one grid over the whole width, and each card says who
     ♥'d it first - the person who put it up for the vote (or who opened the vote, when nobody ♥'d it) */
  function likesOf(k){ const out = []; for(const [p, m] of FAV) if(m.has(k)) out.push({p, at: m.get(k).at}); out.sort((a, b) => String(a.at).localeCompare(String(b.at))); return out; }
  /* 1.2.107 (user, 8 Nov 2026): the card shows the date it went up for the vote and a clock that counts
     from 00:00:00 from that moment; after 3 hours without my vote it says Vote Now, and the glow speeds up
     from one wave every 8 s to one every 2 s over those 3 hours */
  function firstLikeAt(k){ const ls = likesOf(k); return ls.length ? ls[0].at : ''; }
  function startAt(k, st){ const o = st ? st.o : onVote(k); return o ? o.at || '' : ''; }
  const ageH = iso => { const t = Date.parse(iso); return isNaN(t) ? 0 : Math.max(0, (Date.now() - t) / 36e5); };
  const needK = (k, st) => !!st && needMe(st);
  function dfmt(iso){ const d = new Date(iso); if(isNaN(d)) return ''; let ds = ''; try{ ds = d.toLocaleDateString(isKO() ? 'ko-KR' : 'en-GB', {day: 'numeric', month: 'short'}); }catch(e){ ds = iso.slice(5, 10); } return ds + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function clk(iso){ let s = Math.floor(ageH(iso) * 3600); const d = Math.floor(s / 86400); s -= d * 86400; const t = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60); return d ? (isKO() ? d + '일 ' : d + (d === 1 ? ' day ' : ' days ')) + t : t; }
  function firstMark(k){
    const o = onVote(k); const p = o ? o.by : '';
    if(!p) return '';
    const at = startAt(k, stateOf(k));
    return '<span class="ivtop"><span class="ivfirst" title="' + H(L('Sent to the Team Vote by ' + pname(p) + ' ' + (at ? dfmt(at) : ''), '팀 투표로 보낸 사람: ' + pname(p) + ' ' + (at ? dfmt(at) : ''))) + '">' + disc(p, 'xs') + '<b>' + H(pname(p)) + '</b></span></span>';
  }
  /* the live part: every second, each open vote's clock, its Vote Now ribbon and the speed of its glow */
  const CLKI = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>';
  function rate(b){ const r = 8 / (8 - 6 * Math.min(ageH(b.dataset.at) / 3, 1)); b.querySelectorAll('.ivl').forEach(x => { try{ x.getAnimations().forEach(a => { if(Math.abs(a.playbackRate - r) > .002){ if(a.updatePlaybackRate) a.updatePlaybackRate(r); else a.playbackRate = r; } }); }catch(e){} }); }
  function tick(){
    document.querySelectorAll('.vmk[data-at]').forEach(b => {
      const uc = b.closest('.uc'); if(!uc || !uc.offsetParent) return;
      const at = b.dataset.at, h = ageH(at), late = b.classList.contains('need') && h >= 3;
      if(b.classList.contains('open') && !b.classList.contains('voted')) rate(b);
      if(b.classList.contains('late') !== late) b.classList.toggle('late', late);
      const ph = uc.querySelector('.ucimg') || uc.querySelector('.ucph'); if(!ph) return;
      /* 1.2.107 (user, 8 Nov 2026): the date and the live clock in one strip across the top of the photo;
         after 3 hours without my vote the strip turns amber and says "Vote" before the clock */
      let sp = ph.querySelector(':scope > .ivstrip');
      if(!sp){ sp = document.createElement('div'); sp.className = 'ivstrip'; sp.innerHTML = '<span class="ivsd"><b></b><i></i></span><span class="ivsv">' + L('Vote', '투표') + '</span><span class="ivclk">' + CLKI + '<b></b></span>'; ph.appendChild(sp); }
      if(sp.__at !== at){ sp.__at = at; const d = new Date(at); let ds = ''; try{ ds = d.toLocaleDateString(isKO() ? 'ko-KR' : 'en-GB', {day: 'numeric', month: 'short'}); }catch(e){} sp.querySelector('.ivsd b').textContent = ds; sp.querySelector('.ivsd i').textContent = ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); sp.title = L('On the vote since ', '투표에 오른 시각: ') + dfmt(at); }
      if(sp.classList.contains('late') !== late) sp.classList.toggle('late', late);
      const t = clk(at), cb = sp.querySelector('.ivclk b'); if(cb.textContent !== t) cb.textContent = t;
      /* the time of day only when it fits whole - never cut in half */
      const key = sp.clientWidth + '|' + late + '|' + t.length; if(sp.__fit !== key){ sp.__fit = key; const sd = sp.querySelector('.ivsd'); sd.classList.remove('cut', 'cut2'); if(sd.scrollWidth > sd.clientWidth + 1){ sd.classList.add('cut'); if(sd.scrollWidth > sd.clientWidth + 1) sd.classList.add('cut2'); } }
    });
    /* a card whose vote is decided (or that left the vote) loses its clock and ribbon */
    document.querySelectorAll('.uc .ivstrip').forEach(x => { const uc = x.closest('.uc'); if(uc && !uc.querySelector('.vmk[data-at]')) x.remove(); });
  }
  setInterval(tick, 1000);
  /* a glow that starts (a card drawn, a page shown) gets its speed at once, not up to a second later */
  document.addEventListener('animationstart', e => { if(e.animationName !== 'ivwave') return; const b = e.target.closest && e.target.closest('.vmk[data-at]'); if(b && !b.classList.contains('voted')) rate(b); }, true);
  /* 1.2.130 (user, 10 Nov 2026; Today Cards Demo): under every card on Today and the Opus boards, one compact
     block - agency (Mother), measurements with one shoe size on the right, guarantee + availability, and where
     she is on the Booking board. The photo keeps only her name. */
  const STG = [['email', L('Email', '이메일')], ['guar', L('Guarantee', '개런티')], ['contract', L('Contract', '계약')], ['visa', L('Visa', '비자')], ['flight', L('Flight', '항공권')]];
  function stageChip(c){
    if(!c) return '';
    if(c.st === 'canc') return '<div class="ivdst x"><span>' + L('Booking cancelled', '부킹 취소') + '</span></div>';
    for(const [k, lab] of STG){
      const st = (c.s && c.s[k]) || {}; const pv = (st.p === 'g' || st.p === 'y') ? st.p : (st.d ? 'g' : '');
      if(pv !== 'g') return '<div class="ivdst ' + k + (pv === 'y' ? ' on' : '') + '"><span>' + H(lab) + ' · ' + (pv === 'y' ? L('in progress', '진행 중') : L('not started', '시작 전')) + '</span></div>';
    }
    return '<div class="ivdst ok"><span>' + L('All stages done', '모든 단계 완료') + '</span></div>';
  }
  function det(k){
    const i = info(k), {f} = factsOf(k), g = f.g || '';
    let c = null; try{ c = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : bkForKey(k); }catch(e){}
    const mom = (() => { try{ return window.__illuMother && window.__illuMother(k, i.ag); }catch(e){ return false; } })();
    const v = (x, h) => { const n = parseFloat(x); const t = uLen(isNaN(n) ? x : (uL(h) === 'cm' ? Math.round(n) : n), h); return t == null ? '–' : H(t); };
    const sh = uShoe(f.eu, f.us, g);
    return '<div class="ivdet"><div class="ivdag"><b>' + H(i.ag || '') + '</b>' + (mom ? '<span class="pnmom">' + L('Mother', '마더') + '</span>' : '') + '</div>' +
      '<div class="ivdms"><span><b>' + v(f.ht, 1) + '</b><i>·</i>' + v(f.bu) + '<i>/</i>' + v(f.wa) + '<i>/</i>' + v(f.hp) + (uL() === 'in' ? '<small>in</small>' : '') + '</span><span class="ivdsh" title="' + H(L('Shoe size', '신발 사이즈')) + '">' + (sh == null ? '–' : H(sh)) + '<small>' + H(uS()) + '</small></span></div>' +
      gSummary(k, c, true).replace('class="pnkv"', 'class="pnkv ivdkv"') + stageChip(c) + '</div>';
  }
  /* 1.2.132: her own BOOK photo (Dropbox / this computer) when the card has no photograph of its own */
  const matCover = (k, h) => { let u = ''; try{ if(typeof PICS !== 'undefined' && PICS.get(k)) return h; u = window.__illuMatCover ? window.__illuMatCover(k) : ''; }catch(e){} return u ? h.replace(/(<div class="d2t ucph"[^>]*>)/, '$1<img class="ivmat" src="' + H(u) + '" alt="" decoding="async" loading="lazy">') : h; };
  const mcard = k => matCover(k, card(k)).replace('<div class="ucov">', firstMark(k) + '<div class="ucov">').replace(/<\/article>$/, det(k) + '</article>');
  /* the line that explains a board folds away behind a small button (user, 8 Nov 2026) */
  const about = (id, en, ko) => { const open = VS['ab_' + id] === '1';
    return '<div class="ivabout' + (open ? ' open' : '') + '"><button type="button" class="ivabtn" data-ivset="ab_' + id + '=' + (open ? '0' : '1') + '" aria-expanded="' + open + '"><i>i</i>' + L('How this board works', '이 보드 사용법') + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>' + (open ? '<p class="ivnote">' + L(en, ko) + '</p>' : '') + '</div>'; };
  function pageEl(id){
    const el = document.createElement('div'); el.id = 'pane-' + id; el.className = 'pane ivpage'; el.hidden = true;
    el.addEventListener('click', e => {
      if(e.target.closest('.vmk')) return;
      const ph = phOf(e);
      if(ph){ const a = ph.closest('[data-ivk]'); if(a){ e.preventDefault(); e.stopPropagation(); openFull(a.dataset.ivk, ph); } return; }
      const b = e.target.closest('[data-ivset]'); if(b){ const sv = b.dataset.ivset, ix = sv.indexOf('='), kk = sv.slice(0, ix), v = sv.slice(ix + 1); VS[kk] = v; saveVS(); PAGES.get(id).render(); return; }
      const nb = e.target.closest('[data-ivnote]'); if(nb){ const k = nb.dataset.ivnote, inp = el.querySelector('textarea[data-ivnotein="' + CSS.escape(k) + '"]'); const t = inp && inp.value.trim(); if(!t){ if(inp) inp.focus(); return; } addNote(k, t); inp.value = ''; return; }
    });
    el.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey && e.target.matches && e.target.matches('textarea[data-ivnotein]')){ e.preventDefault(); const k = e.target.dataset.ivnotein, t = e.target.value.trim(); if(t){ addNote(k, t); e.target.value = ''; } } });
    return el;
  }
  /* 1.2.133 (user, 10 Nov 2026: "I can't click on the photo for it to expand"): a photo that did not load left its box
     0 px high, so the click fell on the dark frame around it. The whole photo area opens her - frame, strip and all -
     except its own small buttons and links. */
  const phOf = e => { const t = e.target; if(!t.closest || t.closest('button, a, input, textarea, select, [data-piccopy], [data-picdel]')) return null; return t.closest('.uc .ucph') || t.closest('.uc .ucimg'); };
  function openFull(k, ph){
    const im = ph && ph.querySelector('img'); const first = im && im.naturalWidth ? (im.currentSrc || im.src) : '';
    const m = info(k);
    if(window.illuPhotoFull) window.illuPhotoFull(first, m.nm || '', m.href || '', k, '');
  }
  let VS = {}; try{ VS = JSON.parse(localStorage.getItem('illu.ivview') || '{}') || {}; }catch(e){ VS = {}; }
  const saveVS = () => { try{ localStorage.setItem('illu.ivview', JSON.stringify(VS)); }catch(e){} };
  const seg = (key, opts) => '<div class="ivseg">' + opts.map(([v, l]) => '<button type="button" class="' + ((VS[key] || opts[0][0]) === v ? 'on' : '') + '" data-ivset="' + key + '=' + v + '">' + H(l) + '</button>').join('') + '</div>';
  const fresh = (VS_k, list) => (VS[VS_k] || 'old') === 'new' ? list.reverse() : list;
  function stPill(k){
    const st = stateOf(k);
    if(!st) return '<span class="ivst none">' + L('Not on the Team Vote', '팀 투표에 없음') + '</span>';
    if(st.open) return '<span class="ivst ' + (needMe(st) ? 'me' : 'others') + '">' + (st.hist.length ? L('Tie-breaker · ', '타이브레이커 · ') : '') + (needMe(st) ? L('Waiting for your vote', '내 투표 대기') : L('Waiting for others', '다른 사람 대기')) + ' · ' + st.n + '/' + st.of + whoRow(st) + '</span>';
    return '<span class="ivst ' + st.res + '">' + (st.res === 'appr' ? L('Approved', '승인') : L('Cancelled', '취소')) + ' ' + st.g + '–' + st.r + '</span>';
  }
  /* 1.2.149 (user, 12 Nov 2026, approved demo "Who still has to vote"): on every card that is on the vote, the members
     who have voted (face with a tick) and the ones still to vote (faded), with their names - only WHO voted, never how,
     until everyone has voted */
  function whoRow(st){
    /* 1.2.151 (user: "too messy and taking up too much space"): one small line of faces right after the status -
       solid = has voted, faded = still to vote; the names show on hover */
    if(!st || !st.open || !st.voters || !st.voters.length) return '';
    const nm = p => p === me() ? L('You', '나') : (pname(p) || '?');
    const done = st.voters.filter(p => voteOf(p, st.k, st.round)), wait = st.voters.filter(p => !voteOf(p, st.k, st.round));
    const tip = (done.length ? L('Voted: ', '투표함: ') + done.map(nm).join(', ') : '') + (done.length && wait.length ? '\n' : '') + (wait.length ? L('Waiting for: ', '대기 중: ') + wait.map(nm).join(', ') : '');
    return '<span class="ivvf" title="' + H(tip) + '" aria-label="' + H(tip) + '">' + done.concat(wait).map(p => '<span class="ivwf' + (done.includes(p) ? '' : ' wait') + '">' + disc(p, 'xs') + '</span>').join('') + '</span>';
  }
  { const st = document.createElement('style'); st.textContent = `
/* 1.2.153 (user: "this part is overlapping"): faces side by side with a gap, never on top of each other; they go under the words when the card is narrow */
.ivst:has(.ivvf){display:inline-flex;flex-wrap:wrap;align-items:center;column-gap:6px;row-gap:3px;white-space:normal;max-width:100%;box-sizing:border-box}
.ivst .ivvf{display:inline-flex!important;align-items:center;gap:3px;margin-left:0;flex:none}
.ivvf .ivwf{display:inline-flex;margin:0}
.ivvf .ivdisc{position:static!important;inset:auto!important;margin:0!important;transform:none!important;width:15px!important;height:15px!important;font-size:7px!important;line-height:15px!important;box-shadow:none}
.ivvf .ivwf.wait{opacity:.35;filter:grayscale(.6)}`; document.head.appendChild(st); }
  const capDisc = p => disc(p, 'xs');
  function add(id, label, render, count, title){
    const el = pageEl(id);
    const p = {el, render: () => { if(el.hidden) return; const h = render(); if(el.__h !== h){ el.__h = h; el.innerHTML = h; } tick(); }, count};
    PAGES.set(id, p);
    function mount(){
      const ref = document.getElementById('pane-arr');
      if(!ref || !window.__illuShellAdd){ setTimeout(mount, 200); return; }
      ref.parentNode.insertBefore(el, ref);
      window.__illuShellAdd(id, {label, title, el, count, show: () => { el.__h = ''; p.render(); /* 1.2.147: a photo check-up note 6 s and 30 s after a board opens (dark Favorites cards on the owner PC) */ clearTimeout(el.__dg); clearTimeout(el.__dg2); el.__dg = setTimeout(() => { try{ window.__illuDiagNow && window.__illuDiagNow(); }catch(e){} }, 6000); el.__dg2 = setTimeout(() => { try{ window.__illuDiagNow && window.__illuDiagNow(); }catch(e){} }, 30000); }});
    }
    mount();
  }
  const empty = (big, small) => '<div class="ivempty"><div class="ivei">♡</div><b>' + H(big) + '</b><p>' + H(small) + '</p></div>';
  /* Lumen: my own favourites */
  add('fav', ['My Favorites', '내 즐겨찾기'], () => {
    const fw = gWho() && gWho() !== me() ? gWho() : '', favSrc = fw ? (FAV.get(fw) || new Map()) : myFav();
    const list = fresh('lsort', [...favSrc].map(([k, v]) => ({k, at: v.at})).sort((a, b) => String(a.at).localeCompare(String(b.at))));
    const head = '<div class="ivhead"><span class="ivbig">' + list.length + '</span><span class="ivkick">' + (fw ? H(L(pname(fw) + '’s favorites', pname(fw) + '의 즐겨찾기')) : L('Your favorites', '내 즐겨찾기')) + '</span><span class="ivdot"></span><span class="ivkick">' + L('Only you see this board', '나만 보는 보드') + '</span><span class="ivsp"></span>' +
      seg('lsort', [['new', L('Newest first', '최신 순')], ['old', L('Oldest first', '오래된 순')]]) + '<button type="button" class="ivlink" data-ivgo="team">' + L('Team Vote →', '팀 투표 →') + '</button></div>';
    if(!list.length) return head + empty(L('My Favorites is empty', '내 즐겨찾기가 비어 있습니다'), L('Tap the ♡ on any card — in Suggestiones, the Directory or Compare boards — and the model lands here. Press Send to Team Vote on her card when you want the team to vote.', '추천, 디렉터리, 보드 비교의 아무 카드에서 ♡를 누르면 여기에 들어옵니다. 팀 투표를 받으려면 카드의 팀 투표로 보내기를 누르세요.'));
    return head + '<div class="ivgrid ivtv">' + list.map(x => '<div class="ivcw">' + mcard(x.k) + '<div class="ivcap">♥ ' + H(when(x.at)) + '</div>' + stPill(x.k) + offBox(x.k) + '</div>').join('') + '</div>';
  }, () => myFav().size || '', ['Favorites', '즐겨찾기']);
  /* 1.2.146 (user, 12 Nov 2026): Member Favorites - every member's favourites on one board. A model two or more
     members liked is marked (a plum ring and "♥ N members" on her photo); under each card, who liked her and when. */
  function memberFavs(){
    const by = new Map();
    for(const [p, m] of FAV){ if(!m || !m.size) continue; for(const [k, v] of m){ let e = by.get(k); if(!e){ e = {k, who: [], at: ''}; by.set(k, e); } e.who.push({p, at: (v && v.at) || ''}); if(String((v && v.at) || '') > e.at) e.at = (v && v.at) || ''; } }
    for(const e of by.values()) e.who.sort((a, b) => String(a.at).localeCompare(String(b.at)));
    return [...by.values()];
  }
  /* 1.2.149 (user, 12 Nov 2026, approved demo "Compare favorites per member"; "I want to be able to categorize by USER
     and compare likes between users ... a toggle filter to choose multiple users at once"): Compare members - a list
     that opens and closes to pick any number of members (All members / Clear / Done); each picked member gets a column
     of their favorites (Side by side) or a ✓ column (Table). "Liked by 2+ of them" keeps only the shared ones, which
     are outlined everywhere. Each model shows where her vote stands: who voted (solid) and who is still to vote (faded),
     or the result. */
  const mfMembers = () => people().filter(p => (FAV.get(p) || new Map()).size || p === me());
  function mfPicked(){ const all = mfMembers(); let v = String(VS.mfp == null ? '' : VS.mfp); if(v === '') return all.slice(0, 3); if(v === '-') return []; return v.split(',').filter(p => all.includes(p)); }
  function mfSetPicked(list){ const all = mfMembers(); VS.mfp = list.length ? list.filter(p => all.includes(p)).join(',') : '-'; saveVS(); }
  const mfThumb = k => { let u = ''; try{ u = (factsOf(k).f || {}).photo || ''; }catch(e){} if(!u) return ''; if(/^https?:/i.test(u) && window.illu && window.illu.modelPhotos && !window.illu.web) u = 'illuimg://p/' + encodeURIComponent(u) + '?r=' + encodeURIComponent(info(k).href || '') + '&w=300'; else if(/^https?:/i.test(u) && window.__illuSmall) u = window.__illuSmall(u, 200); return u; };
  const mfMs = k => { const f = factsOf(k).f || {}; const n = x => x == null || x === '' || isNaN(+x) ? '–' : String(Math.round(+x * 10) / 10); return n(f.ht) + ' · ' + n(f.bu) + ' / ' + n(f.wa) + ' / ' + n(f.hp); };
  function mfVote(k){
    const st = stateOf(k); if(!st) return '';
    if(!st.open) return '<span class="mfvt"><span class="mfvb ' + st.res + '">' + (st.res === 'appr' ? L('Approved', '승인') : L('Cancelled', '취소')) + ' ' + st.g + '–' + st.r + '</span></span>';
    const f = p => { const ok = !!voteOf(p, st.k, st.round); return '<span class="mfva' + (ok ? '' : ' wait') + '" title="' + H((p === me() ? L('You', '나') : pname(p)) + (ok ? L(' has voted', ' 투표 완료') : L(' has not voted yet', ' 아직 투표 안 함'))) + '">' + disc(p, 'xs') + '</span>'; };
    return '<span class="mfvt"><span class="mfvb open">' + (st.hist.length ? L('Tie-breaker', '타이브레이커') : L('Team Vote', '팀 투표')) + ' · ' + st.n + '/' + st.of + '</span>' + st.voters.map(f).join('') + '</span>';
  }
  function mfCompare(){
    const all = mfMembers(), picked = mfPicked(), shared = VS.mfshow === 'shared';
    const nm = p => p === me() ? L('You', '나') : (pname(p) || '?');
    const favOf = p => [...(FAV.get(p) || new Map())].map(([k, v]) => ({k, at: (v && v.at) || '', nm: (v && v.nm) || '', ag: (v && v.ag) || ''})).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const likedBy = new Map(); for(const p of picked) for(const x of favOf(p)) likedBy.set(x.k, (likedBy.get(x.k) || 0) + 1);
    const nShared = [...likedBy.values()].filter(n => n > 1).length;
    const open = !!VS.mfdd;
    const label = !picked.length ? L('Pick members', '멤버 선택') : picked.length === all.length ? L('All members', '모든 멤버') : picked.map(nm).join(', ');
    const dd = '<div class="mfdd"><button type="button" class="mfddb" data-mfdd aria-haspopup="listbox" aria-expanded="' + open + '"><span class="mfddf">' + picked.slice(0, 5).map(p => disc(p, 'xs')).join('') + '</span><span class="mfddl">' + H(label) + '</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6') + '"/></svg></button>' +
      (open ? '<div class="mfddp" role="listbox" aria-multiselectable="true" aria-label="' + H(L('Members', '멤버')) + '">' +
        '<button type="button" class="mfddo" role="option" data-mfall aria-selected="' + (picked.length === all.length) + '"><span class="mfcb">' + (picked.length === all.length ? '✓' : '') + '</span><b>' + L('All members', '모든 멤버') + '</b></button><div class="mfddsep"></div>' +
        all.map(p => { const on = picked.includes(p); return '<button type="button" class="mfddo" role="option" data-mfpick="' + H(p) + '" aria-selected="' + on + '"><span class="mfcb">' + (on ? '✓' : '') + '</span>' + disc(p, 'xs') + '<b>' + H(nm(p)) + '</b><s>' + (FAV.get(p) || new Map()).size + ' ' + L('favorites', '즐겨찾기') + '</s></button>'; }).join('') +
        '<div class="mfddft"><button type="button" class="mflnk" data-mfclear>' + L('Clear', '지우기') + '</button><button type="button" class="mfok" data-mfdd>' + L('Done', '완료') + '</button></div></div>' : '') + '</div>';
    const bar = '<div class="mfbar">' + dd + '<span class="mfsum">' + H(picked.length ? L(picked.length + (picked.length === 1 ? ' member · ' : ' members · ') + nShared + ' liked by 2+ of them', picked.length + '명 · ' + nShared + '명은 2명 이상이 좋아함') : L('Pick the members to compare from the list', '비교할 멤버를 목록에서 고르세요')) + '</span><span class="ivsp"></span>' +
      seg('mfview', [['side', L('Side by side', '나란히')], ['table', L('Table', '표')]]) + seg('mfshow', [['all', L('All their favorites', '모든 즐겨찾기')], ['shared', L('Liked by 2+ of them', '2명 이상')]]) + '</div>';
    if(!picked.length) return bar + empty(L('No member picked', '선택한 멤버 없음'), L('Open the list above and tick the members whose favorites you want to compare.', '위 목록을 열어 비교할 멤버를 고르세요.'));
    const mini = x => { const n = likedBy.get(x.k) || 0, i = info(x.k), th = mfThumb(x.k), others = n > 1 ? picked.filter(p => (FAV.get(p) || new Map()).has(x.k)) : [];
      return '<div class="mfmini' + (n > 1 ? ' sh' : '') + '" data-mfopen="' + H(x.k) + '" role="button" tabindex="0" title="' + H(L('Open her photos', '사진 보기')) + '"><span class="mfph">' + (th ? '<img src="' + H(th) + '" alt="" loading="lazy" decoding="async">' : '') + '</span><span class="mfmt"><b>' + H(i.nm || x.nm || '') + '</b><span>' + H(i.ag || x.ag || '') + '</span><span class="mfms">' + H(mfMs(x.k)) + '</span>' + mfVote(x.k) + '</span>' + (n > 1 ? '<span class="mftag" title="' + H(others.map(nm).join(', ')) + '">♥ ' + n + '</span>' : '') + '</div>'; };
    if((VS.mfview || 'side') === 'table'){
      const keys = [...likedBy.keys()].filter(k => !shared || likedBy.get(k) > 1).sort((a, b) => (likedBy.get(b) - likedBy.get(a)) || String(info(a).nm || '').localeCompare(String(info(b).nm || '')));
      if(!keys.length) return bar + empty(L('Nothing to show', '표시할 것 없음'), L('None of these members liked the same model yet.', '아직 같은 모델을 좋아한 멤버가 없습니다.'));
      return bar + '<div class="mftw"><table class="mft"><thead><tr><th class="l">' + L('Model', '모델') + '</th>' + picked.map(p => '<th><span class="mfth">' + disc(p, 'xs') + H(nm(p)) + '</span></th>').join('') + '<th>' + L('Liked by', '좋아함') + '</th></tr></thead><tbody>' +
        keys.map(k => { const i = info(k), th = mfThumb(k), n = likedBy.get(k); return '<tr class="' + (n > 1 ? 'sh' : '') + '"><td class="l"><span class="mftm" data-mfopen="' + H(k) + '" role="button" tabindex="0"><span class="mfph sm">' + (th ? '<img src="' + H(th) + '" alt="" loading="lazy">' : '') + '</span><span class="mfmt"><b>' + H(i.nm || '') + '</b><span>' + H((i.ag || '') + ' · ' + mfMs(k)) + '</span>' + mfVote(k) + '</span></span></td>' +
          picked.map(p => { const v = (FAV.get(p) || new Map()).get(k); return '<td>' + (v ? '<span class="mfyes" title="' + H(when(v.at)) + '">♥</span>' : '<span class="mfno">–</span>') + '</td>'; }).join('') + '<td><b>' + n + '</b></td></tr>'; }).join('') + '</tbody></table></div>';
    }
    return bar + '<div class="mfcols" style="--mfn:' + picked.length + '">' + picked.map(p => { const items = favOf(p).filter(x => !shared || (likedBy.get(x.k) || 0) > 1);
      return '<section class="mfcol"><div class="mfch">' + disc(p, 'sm') + '<b>' + H(nm(p)) + '</b><span>' + items.length + ' ' + L('favorites', '즐겨찾기') + '</span></div><div class="mfcl">' + (items.length ? items.map(mini).join('') : '<p class="mfnone">' + (shared ? L('No favorite shared with the others', '다른 멤버와 겹치는 즐겨찾기 없음') : L('No favorites yet', '아직 즐겨찾기 없음')) + '</p>') + '</div></section>'; }).join('') + '</div>';
  }
  document.addEventListener('click', e => {
    const t = e.target; if(!t || !t.closest) return;
    const pg = t.closest('#pane-mfav'); if(!pg) { if(VS.mfdd && !t.closest('.mfdd')){ VS.mfdd = false; const P = PAGES.get('mfav'); if(P) P.render(); } return; }
    const P = PAGES.get('mfav'); const re = () => { if(P) P.render(); };
    if(t.closest('[data-mfdd]')){ e.preventDefault(); VS.mfdd = !VS.mfdd; re(); return; }
    const pk = t.closest('[data-mfpick]'); if(pk){ e.preventDefault(); const cur = mfPicked(), p = pk.dataset.mfpick; mfSetPicked(cur.includes(p) ? cur.filter(x => x !== p) : cur.concat([p])); re(); return; }
    if(t.closest('[data-mfall]')){ e.preventDefault(); const all = mfMembers(); mfSetPicked(mfPicked().length === all.length ? [] : all); re(); return; }
    if(t.closest('[data-mfclear]')){ e.preventDefault(); mfSetPicked([]); re(); return; }
    const op = t.closest('[data-mfopen]'); if(op){ e.preventDefault(); const k = op.dataset.mfopen, m = info(k), im = op.querySelector('img'); if(window.illuPhotoFull) window.illuPhotoFull(im && im.naturalWidth ? (im.currentSrc || im.src) : '', m.nm || '', m.href || '', k, ''); return; }
    if(VS.mfdd && !t.closest('.mfdd')){ VS.mfdd = false; re(); }
  });
  { const st = document.createElement('style'); st.textContent = `
.mfbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:4px 0 16px}
.mfdd{position:relative}
.mfddb{display:flex;align-items:center;gap:10px;height:42px;min-width:260px;max-width:460px;padding:0 12px;border:1px solid var(--line,#E7E2EC);border-radius:12px;background:var(--surf,#fff);color:var(--ink,#211C26);font:500 13.5px var(--sans,Inter,system-ui,sans-serif);cursor:pointer}
.mfddb[aria-expanded="true"]{border-color:var(--acc,#5A2C57);box-shadow:0 0 0 3px rgba(90,44,87,.12)}
.mfddb svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;margin-left:auto;flex:none}
.mfddf{display:flex}.mfddf .ivdisc{margin-left:-5px;box-shadow:0 0 0 2px var(--surf,#fff)}.mfddf .ivdisc:first-child{margin-left:0}
.mfddl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mfddp{position:absolute;left:0;top:48px;z-index:60;width:300px;max-height:420px;overflow:auto;background:var(--surf,#fff);border:1px solid var(--line,#E7E2EC);border-radius:14px;box-shadow:0 18px 44px rgba(20,10,30,.2);padding:6px;display:flex;flex-direction:column;gap:2px}
.mfddo{display:flex;align-items:center;gap:10px;border:0;background:none;border-radius:9px;padding:8px;cursor:pointer;text-align:left;font:13.5px var(--sans,Inter,system-ui,sans-serif);color:var(--ink,#211C26)}
.mfddo:hover{background:var(--surf2,#F6F2F7)}.mfddo b{font-weight:600;flex:1}.mfddo s{text-decoration:none;font-size:12px;color:var(--mut,#8A8093)}
.mfcb{width:18px;height:18px;border-radius:5px;border:1.5px solid #CDBFD0;display:grid;place-items:center;font-size:12px;color:#fff;flex:none}
.mfddo[aria-selected="true"] .mfcb{background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57)}
.mfddsep{height:1px;background:var(--line,#EEE9F1);margin:4px 2px}
.mfddft{display:flex;justify-content:space-between;align-items:center;padding:8px 6px 4px;border-top:1px solid var(--line,#EEE9F1);margin-top:4px}
.mflnk{border:0;background:none;color:var(--acc,#5A2C57);font:600 13px var(--sans,Inter,system-ui,sans-serif);cursor:pointer}
.mfok{border:0;background:var(--acc,#5A2C57);color:#fff;border-radius:9px;height:32px;padding:0 14px;font:600 13px var(--sans,Inter,system-ui,sans-serif);cursor:pointer}
.mfsum{font-size:13px;color:var(--mut,#6D6577)}
.mfcols{display:grid;grid-template-columns:repeat(var(--mfn,3),minmax(230px,1fr));gap:16px;align-items:start;overflow-x:auto;padding-bottom:6px}
.mfcol{background:var(--surf2,#FBF9FC);border:1px solid var(--line,#EEE9F1);border-radius:16px;padding:12px;min-width:0}
.mfcol .mfch{display:flex;align-items:center;gap:8px;margin-bottom:10px;position:static}.mfcol .mfch b{font-size:15px}.mfcol .mfch span{font-size:12px;color:var(--mut,#8A8093);margin-left:auto;white-space:nowrap}
.mfcl{display:flex;flex-direction:column;gap:8px}
.mfmini{display:flex;gap:10px;align-items:center;padding:8px;height:96px;box-sizing:border-box;overflow:hidden;flex:none;border:1px solid var(--line,#EEE9F1);border-radius:12px;background:var(--surf,#fff);cursor:pointer;position:relative;min-width:0}
.mfmini:hover{border-color:#C9B6CB}
.mfmini.sh,.mft tr.sh td{box-shadow:inset 0 0 0 1.5px var(--acc,#5A2C57);background:#FCF8FC}
.mfph{width:46px;height:60px;border-radius:8px;flex:none;overflow:hidden;background:#EDE7F0}.mfph.sm{width:36px;height:46px}
.mfph img{width:100%;height:100%;object-fit:cover;object-position:50% 20%;display:block}
.mfmt{display:flex;flex-direction:column;gap:1px;min-width:0;font-size:12px;color:var(--mut,#6D6577)}
.mfmt b{font-size:13px;color:var(--ink,#211C26);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mfmini .mfmt{flex:1}.mfmini .mfmt > b{padding-right:44px}
.mfmt > span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mftag{position:absolute;right:8px;top:8px;font-size:10.5px;font-weight:700;color:#fff;background:var(--acc,#5A2C57);border-radius:999px;padding:2px 7px}
.mfvt{display:flex;align-items:center;gap:4px;flex-wrap:nowrap;overflow:hidden;white-space:nowrap;margin-top:3px}
.mfvt .mfvb{flex:none}.mfvt .mfva{flex:none;margin-left:-3px}
.mfvb{font-weight:700;border-radius:999px;padding:1px 7px;font-size:10.5px}
.mfvb.open{background:#FFF4E5;color:#9A5B12}.mfvb.appr{background:#E8F7EA;color:#2F7A3D}.mfvb.cxl{background:#FBE9EC;color:#A3283F}
.mfva{display:inline-flex}.mfva .ivdisc{position:static!important;margin:0!important;width:16px!important;height:16px!important;font-size:7.5px!important}
.mfva.wait{opacity:.4;filter:grayscale(.4)}
.mftw{overflow:auto;border:1px solid var(--line,#EEE9F1);border-radius:14px;background:var(--surf,#fff)}
.mft{width:100%;border-collapse:collapse}
.mft th,.mft td{padding:8px 10px;text-align:center;border-bottom:1px solid var(--line,#F0ECF2);font-size:13px}
.mft th{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut,#8A8093);position:sticky;top:0;background:var(--surf,#fff)}
.mft .l{text-align:left}
.mfth{display:inline-flex;align-items:center;gap:6px}
.mftm{display:flex;align-items:center;gap:10px;cursor:pointer}
.mfyes{color:#D2557A;font-size:16px}.mfno{color:#C9C0CD}
.mfnone{font-size:13px;color:var(--mut,#8A8093);margin:6px 2px}
@media (max-width:760px){.mfcols{grid-template-columns:1fr}.mfddb{min-width:0;width:100%}.mfdd{flex:1 1 100%}}`; document.head.appendChild(st); }
  /* 1.2.152 (user, 12 Nov 2026): "a New Board called CURRENT/ON-STAY ... the models that are currently On-Stay".
     A booking card is on stay when it carries stay {a: arrival 'YYYY-MM-DD', d: days} and today is inside it (or stay.on is
     set by hand). Each card: photo, name, agency, figures, arrival · days · leaving · days left (a bar), and who is in charge.
     The card opens her booking files (the same viewer as the Booking board). */
  const stayDay = s2 => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s2 || '')); return m ? Date.UTC(+m[1], m[2] - 1, +m[3]) : NaN; };
  const today0 = () => { const n = new Date(); return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()); };
  function stayOf(c){
    const st = c && c.stay; if(!st) return null;
    /* 1.2.158 (user, 12 Nov 2026: "The E-Ticket is the actual arrival/departure date"): the flight dates on her card
       (Arrival / Departure board) come first; the stay from the contract fills in what they do not say */
    const dmy = v => { const m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? Date.UTC(+m[3], +m[2] - 1, +m[1]) : NaN; };
    const fa = dmy(c.ind), fo = c.outtbd ? NaN : dmy(c.outd);
    const a = !isNaN(fa) ? fa : stayDay(st.a);
    if(isNaN(a) && !st.on) return null;
    const d = !isNaN(fo) && !isNaN(a) && fo >= a ? Math.round((fo - a) / 864e5) + 1 : (+st.d || 0);
    const end = !isNaN(a) && d ? a + (d - 1) * 864e5 : NaN, t = today0();
    const on = st.on === true || (!isNaN(a) && t >= a && (isNaN(end) || t <= end));
    const left = isNaN(end) ? null : Math.round((end - t) / 864e5), done = isNaN(a) ? null : Math.round((t - a) / 864e5) + 1;
    return {a, d, end, on, left, done, up: !isNaN(a) && t < a};
  }
  const fmtD = ms => { if(isNaN(ms)) return '–'; const x = new Date(ms); const M = L(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][x.getUTCMonth()], (x.getUTCMonth() + 1) + '월'); return isKO() ? M + ' ' + x.getUTCDate() + '일' : x.getUTCDate() + ' ' + M + ' ' + x.getUTCFullYear(); };
  function stayCards(){ try{ return [...BOOK.values()].map(c => ({c, s: stayOf(c)})).filter(x => x.s && (x.s.on || x.s.up)); }catch(e){ return []; } }
  window.__illuStayOf = stayOf;
  add('stay', ['Current / On-Stay', '현재 / 체류 중'], () => {
    const list = stayCards();
    const who = VS.stwho || '';
    const ppl = [...new Set(list.map(x => x.c.by).filter(Boolean))];
    const shown = list.filter(x => !who || x.c.by === who).sort((p, q) => (p.s.up - q.s.up) || ((p.s.left == null ? 1e9 : p.s.left) - (q.s.left == null ? 1e9 : q.s.left)));
    const nOn = list.filter(x => x.s.on).length, nUp = list.filter(x => x.s.up).length;
    const head = '<div class="ivhead"><span class="ivbig">' + nOn + '</span><span class="ivkick">' + L('models on stay now', '명 체류 중') + '</span>' + (nUp ? '<span class="ivdot"></span><span class="ivkick">' + nUp + ' ' + L('arriving soon', '명 입국 예정') + '</span>' : '') + '<span class="ivsp"></span>' +
      (ppl.length > 1 ? '<div class="ivseg"><button type="button" class="' + (!who ? 'on' : '') + '" data-ivset="stwho=">' + L('Everyone', '전체') + '</button>' + ppl.map(p => '<button type="button" class="' + (who === p ? 'on' : '') + '" data-ivset="stwho=' + H(p) + '">' + H(pname(p) || '?') + '</button>').join('') + '</div>' : '') + '</div>';
    if(!shown.length) return head + empty(L('No one on stay', '체류 중인 모델 없음'), L('A booking card shows here from her arrival day to her last day. Set the arrival date and the days of stay on her booking card.', '부킹 카드에 입국일과 체류 일수를 넣으면 입국일부터 마지막 날까지 여기에 표시됩니다.'));
    return head + '<div class="stgrid">' + shown.map(({c, s: st}) => {
      let ph = ''; try{ ph = typeof bkPhoto === 'function' ? bkPhoto(c) : ''; }catch(e){}
      if(!ph){ try{ ph = (window.__illuMatCover && (window.__illuMatCover(c.k || ('bid:' + c.id)) || (c.k ? window.__illuMatCover('bid:' + c.id) : ''))) || ''; }catch(e){} }
      if(ph && /^https?:/i.test(ph) && window.illu && window.illu.modelPhotos && !window.illu.web) ph = 'illuimg://p/' + encodeURIComponent(ph) + '?r=' + encodeURIComponent(c.k || '') + '&w=600';
      const pct = st.d && st.done != null ? Math.max(0, Math.min(100, Math.round(st.done / st.d * 100))) : 0;
      const n1 = v => v == null || v === '' || isNaN(+v) ? '–' : String(Math.round(+v * 10) / 10);
      const late = st.left != null && st.left <= 14 && st.on;
      return '<article class="stc' + (st.up ? ' up' : '') + '" data-stopen="' + H(c.id) + '" role="button" tabindex="0" title="' + H(L('Open her booking files', '부킹 파일 열기')) + '">' +
        '<div class="stph" data-stph="' + H(c.id) + '" title="' + H(L('Her photos — pick the card photo here', '사진 보기 — 여기서 카드 사진을 고를 수 있어요')) + '">' + (ph ? '<img src="' + H(ph) + '" alt="" loading="lazy" decoding="async">' : '<span class="stnoph">' + H((c.nm || '?').charAt(0)) + '</span>') +
          '<span class="stbadge ' + (st.up ? 'up' : 'on') + '">' + (st.up ? L('Arriving', '입국 예정') : L('On stay', '체류 중')) + '</span>' +
          (c.by ? '<span class="stby" title="' + H(L('In charge: ', '담당: ') + (pname(c.by) || '')) + '">' + disc(c.by, 'xs') + '</span>' : '') +
          '<b class="stnm">' + H(c.nm || '') + '</b></div>' +
        '<div class="stbd"><span class="stag">' + (() => { let ref = c.agd || ''; try{ if(!ref && typeof AG !== 'undefined'){ const lc = x => String(x || '').trim().toLowerCase(); const m = AG.find(x => lc(x.name) === lc(c.ag)); if(m) ref = m.domain || m.name; } }catch(e){} return ref ? '<a href="#" class="stagl" data-stag="' + H(ref) + '" title="' + H(L('Open this agency in the Directory', '디렉터리에서 이 에이전시 열기')) + '">' + H(c.ag || '') + '</a>' : H(c.ag || ''); })() + (c.nat ? ' · ' + H(c.nat) : '') + '</span>' +
          '<span class="stms"><b>' + n1(c.ht) + '</b> · ' + n1(c.bu) + ' / ' + n1(c.wa) + ' / ' + n1(c.hp) + ' · ' + n1(c.eu) + ' EU</span>' +
          '<div class="stdt"><span><i>' + L('Arrived', '입국') + '</i>' + H(fmtD(st.a)) + '</span><span><i>' + L('Stay', '체류') + '</i>' + (st.d ? st.d + L(' days', '일') : '–') + '</span><span><i>' + L('Leaves', '출국') + '</i>' + H(fmtD(st.end)) + '</span></div>' +
          '<div class="stbar"><i style="width:' + pct + '%"></i></div>' +
          '<span class="stleft' + (late ? ' late' : '') + '">' + (st.up ? L('Arrives in ' + Math.round((st.a - today0()) / 864e5) + ' days', Math.round((st.a - today0()) / 864e5) + '일 후 입국') : st.left == null ? '' : st.left === 0 ? L('Last day today', '오늘 마지막 날') : L(st.left + ' days left · day ' + st.done + ' of ' + st.d, st.left + '일 남음 · ' + st.d + '일 중 ' + st.done + '일째')) + '</span>' +
          '<button type="button" class="stwho" data-bkhand="' + H(c.id) + '" title="' + H(L('Hand this card to someone else', '다른 사람에게 넘기기')) + '">' + (c.by ? L('In charge: ', '담당: ') + '<b>' + H(pname(c.by) || '') + '</b>' : L('No one in charge', '담당자 없음')) + ' ▾</button>' +
        '</div></article>';
    }).join('') + '</div>';
  }, () => stayCards().filter(x => x.s.on).length || '', ['Current / On-Stay', '현재 / 체류 중']);
  document.addEventListener('click', e => { const g = e.target.closest && e.target.closest('[data-stag]'); if(!g) return; e.preventDefault(); e.stopPropagation(); try{ if(window.__illuDirGoAg) window.__illuDirGoAg(g.dataset.stag); }catch(er){} }, true);
  /* 1.2.155: her photo opens her photos (her folder + her agency page), where the card photo can be changed */
  document.addEventListener('click', e => { const p = e.target.closest && e.target.closest('[data-stph]'); if(!p || e.target.closest('[data-stag]')) return; e.preventDefault(); e.stopPropagation();
    let c = null; try{ c = BOOK.get(p.dataset.stph); }catch(er){} if(!c) return; const im = p.querySelector('img');
    try{ window.illuPhotoFull(im ? (im.currentSrc || im.src) : '', c.nm || '', c.k || '', c.k || ('bid:' + c.id), c.id); }catch(er){} }, true);
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('[data-stopen]'); if(!a) return; e.preventDefault(); try{ if(typeof bvOpenFor === 'function') bvOpenFor(a.dataset.stopen); }catch(er){} });
  /* 1.2.156 (user, 12 Nov 2026: "On Today's Board, I want a sub board of Current/On-Stay that is also in the Opus Board"):
     the same cards, small, in one row on Today - leaving soonest first; the whole board one click away */
  window.__illuStayStrip = () => {
    const list = stayCards(); if(!list.length) return '';
    const sh = list.slice().sort((p, q) => (p.s.up - q.s.up) || ((p.s.left == null ? 1e9 : p.s.left) - (q.s.left == null ? 1e9 : q.s.left)));
    const nOn = list.filter(x => x.s.on).length, nUp = list.length - nOn;
    return '<section class="shstay"><div class="shsth"><h3>' + L('Current / On-Stay', '현재 / 체류 중') + '</h3><span class="shtag g">' + nOn + '</span>' + (nUp ? '<span class="shmut sm">+ ' + nUp + ' ' + L('arriving', '입국 예정') + '</span>' : '') + '<button type="button" class="shlink" data-shgo="stay" style="margin-left:auto">' + L('Board', '보드') + ' →</button></div>' +
      '<div class="shstrow">' + sh.map(({c, s: st}) => {
        let ph = ''; try{ ph = typeof bkPhoto === 'function' ? bkPhoto(c) : ''; }catch(e){}
        if(!ph){ try{ ph = (window.__illuMatCover && (window.__illuMatCover(c.k || ('bid:' + c.id)) || (c.k ? window.__illuMatCover('bid:' + c.id) : ''))) || ''; }catch(e){} }
        if(ph && /^https?:/i.test(ph) && window.illu && window.illu.modelPhotos && !window.illu.web) ph = 'illuimg://p/' + encodeURIComponent(ph) + '?r=' + encodeURIComponent(c.k || '') + '&w=300';
        const pct = st.d && st.done != null ? Math.max(0, Math.min(100, Math.round(st.done / st.d * 100))) : 0, late = st.on && st.left != null && st.left <= 14;
        const t = st.up ? L('in ' + Math.round((st.a - today0()) / 864e5) + 'd', Math.round((st.a - today0()) / 864e5) + '일 후') : st.left === 0 ? L('last day', '마지막 날') : L(st.left + 'd left', st.left + '일 남음');
        return '<button type="button" class="shstc' + (st.up ? ' up' : '') + (late ? ' late' : '') + '" data-stopen="' + H(c.id) + '" title="' + H((c.nm || '') + ' · ' + (c.ag || '') + (c.by ? ' · ' + L('In charge: ', '담당: ') + (pname(c.by) || '') : '')) + '">' +
          '<span class="shstp">' + (ph ? '<img src="' + H(ph) + '" alt="" loading="lazy" decoding="async" data-shini="' + H((c.nm || '?').charAt(0)) + '">' : '<i>' + H((c.nm || '?').charAt(0)) + '</i>') + (c.by ? '<span class="shstby">' + disc(c.by, 'xs') + '</span>' : '') + '</span>' +
          '<b>' + H(c.nm || '') + '</b><small>' + H(c.ag || '') + '</small><span class="shstb"><i style="width:' + (st.up ? 0 : pct) + '%"></i></span><em>' + H(t) + '</em></button>';
      }).join('') + '</div></section>';
  };
  { const st2 = document.createElement('style'); st2.textContent = `
.shstay{margin-top:16px;background:var(--card,#fff);border:1px solid var(--line,#E7E2EC);border-radius:16px;padding:12px 14px 14px}
.shsth{display:flex;align-items:center;gap:8px;margin-bottom:10px}.shsth h3{margin:0;font-size:14px}
.shstay .shtag.g{background:#E3F4EA;color:#1F7A47;border-radius:999px;padding:1px 8px;font-size:11.5px;font-weight:700}
.shstrow{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:10px}
.shstc{border:0;background:none;padding:0;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:2px;min-width:0;font:inherit;color:inherit}
.shstp{position:relative;display:block;width:100%;aspect-ratio:3/4;border-radius:10px;overflow:hidden;background:#E9E3EC}
.shstp img{width:100%;height:100%;object-fit:cover;object-position:50% 20%;display:block}.shstp i{display:grid;place-items:center;height:100%;font-style:normal;font-weight:700;color:#9A8FA3;font-size:22px}
.shstby{position:absolute;right:5px;top:5px}
.shstc b{font-size:12px;letter-spacing:.02em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}
.shstc small{font-size:10.5px;color:var(--mut,#6D6577);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.shstb{display:block;height:4px;border-radius:2px;background:#EEE9F1;overflow:hidden;margin-top:3px}.shstb i{display:block;height:100%;background:#5A2C57}
.shstc em{font-style:normal;font-size:11px;font-weight:600;color:#3A3340}.shstc.late em{color:#B4532A}.shstc.up em{color:#2E7DB0}
.shstc:hover .shstp img{filter:brightness(1.05)}`; document.head.appendChild(st2); }
  document.addEventListener('keydown', e => { if(e.key !== 'Enter') return; const a = e.target.closest && e.target.closest('[data-stopen]'); if(!a) return; e.preventDefault(); try{ if(typeof bvOpenFor === 'function') bvOpenFor(a.dataset.stopen); }catch(er){} });
  { const st = document.createElement('style'); st.textContent = `
.stgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px}
.stc{background:var(--surf,#fff);border:1px solid var(--line,#E7E2EC);border-radius:16px;overflow:hidden;cursor:pointer;display:flex;flex-direction:column;box-shadow:0 10px 26px -20px rgba(40,20,50,.4)}
.stc:hover{border-color:#C9B6CB}
.stc.up{opacity:.85}
.stph{position:relative;height:300px;background:#1a141d;cursor:zoom-in}
.stph img{width:100%;height:100%;object-fit:cover;object-position:50% 20%;display:block}
.stnoph{display:grid;place-items:center;height:100%;font-size:54px;font-weight:700;color:rgba(255,255,255,.3)}
.stph::after{content:"";position:absolute;left:0;right:0;bottom:0;height:90px;background:linear-gradient(rgba(12,8,16,0),rgba(12,8,16,.75));pointer-events:none}
.stnm{position:absolute;left:12px;bottom:10px;z-index:1;color:#fff;font-size:16px;letter-spacing:.03em;text-transform:uppercase}
.stbadge{position:absolute;left:10px;top:10px;z-index:1;font-size:10.5px;font-weight:800;letter-spacing:.05em;border-radius:999px;padding:3px 9px;text-transform:uppercase}
.stbadge.on{background:#2E9E5B;color:#fff}.stbadge.up{background:#FFF4E5;color:#9A5B12}
.stby{position:absolute;right:10px;top:10px;z-index:1}
.stby .ivdisc{box-shadow:0 0 0 2px #fff}
.stbd{padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px;font-size:12.5px}
.stagl{color:inherit;text-decoration:none}.stagl:hover{text-decoration:underline}
.stag{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--acc,#5A2C57);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stms{color:var(--ink2,#3A3340)}
.stdt{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;border:1px solid var(--line,#EEE9F1);border-radius:10px;padding:6px 8px}
.stdt span{display:flex;flex-direction:column;font-weight:600;font-size:12px}
.stdt i{font-style:normal;font-size:9.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--mut,#8A8093)}
.stbar{height:6px;border-radius:3px;background:var(--surf2,#EFEAF2);overflow:hidden}
.stbar i{display:block;height:100%;background:var(--acc,#5A2C57);border-radius:3px}
.stleft{font-weight:600;color:var(--ink2,#3A3340)}.stleft.late{color:#B02F48}
.stwho{color:var(--mut,#6D6577);font-size:12px;border:0;background:none;padding:2px 4px;border-radius:6px;cursor:pointer;font-family:inherit;text-align:left}.stwho:hover{background:rgba(90,44,87,.07)}
.avsec .avbs{display:flex;gap:6px;flex-wrap:wrap}.avsec .avb{border:1px solid var(--line,#E1D9E6);background:var(--surf,#fff);color:inherit;border-radius:999px;padding:5px 11px;font:600 12px inherit;cursor:pointer}
.avsec .avb.on.no,.avsec .avb.on.nokr{background:#A3283F;border-color:#A3283F;color:#fff}.avsec .avb.on.later{background:#C97916;border-color:#C97916;color:#fff}.avsec .avb.clr{color:#2E7D4F}
.avnow{border-radius:10px;padding:8px 10px;margin:4px 0 8px;display:flex;flex-direction:column;gap:2px;background:#FBECEF;color:#6E1A2C}.avnow.later{background:#FDF1E1;color:#7A4A09}.avnow small{opacity:.8}
.aved{display:flex;flex-direction:column;gap:6px}.aved input{border:1px solid var(--line,#E1D9E6);border-radius:8px;padding:7px 9px;font:inherit;background:var(--surf,#fff);color:inherit}
.avcap{border-radius:10px;padding:7px 9px;margin-top:6px;display:flex;flex-direction:column;gap:2px;background:#FBECEF;color:#6E1A2C;font-size:12px}.avcap.later{background:#FDF1E1;color:#7A4A09}
/* 1.2.169 (user, 13 Nov 2026: "is there anything we can do to make the cards all the same size?"): on the Unavailable / On hold
   board every card is as tall as the tallest in its row, the agency's note sits at the same place under each one, 3 lines at most */
.ivunav{grid-auto-rows:1fr}.ivunav>.ivcw{height:100%}.ivunav>.ivcw>:first-child{flex:1 1 auto;display:flex;flex-direction:column}
.ivunav>.ivcw>.avcap{flex:none;height:96px;overflow:hidden;margin-top:0}
.ivunav>.ivcw>.avcap>*{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}.ivunav>.ivcw>.avcap>span,.ivunav>.ivcw>.avcap>q,.ivunav>.ivcw>.avcap>i{-webkit-line-clamp:2}.ivunav>.ivcw>.avcap>small{-webkit-line-clamp:1}.avcap small{opacity:.8}
#illuwk{position:fixed;inset:0;z-index:9500;display:grid;place-items:center}#illuwk[hidden]{display:none}
#illuwk .wkveil{position:absolute;inset:0;background:rgba(20,12,24,.35)}
#illuwk .wkdlg{position:relative;width:min(440px,calc(100vw - 32px));background:var(--surf,#fff);color:var(--ink,#211C26);border-radius:14px;box-shadow:0 24px 60px -20px rgba(20,10,30,.55);padding:16px;display:flex;flex-direction:column;gap:9px}
#illuwk h4{margin:0;font-size:15px}#illuwk p{margin:0;line-height:1.5;color:var(--ink,#3A3340)}#illuwk small{color:var(--mut,#6D6577);font-size:11.5px}
#illuwk .wkb{display:flex;gap:6px;flex-wrap:wrap}#illuwk .wkb button{border:1px solid var(--line,#E1D9E6);background:var(--surf,#fff);color:inherit;border-radius:999px;padding:7px 13px;font:600 12.5px inherit;cursor:pointer}
#illuwk .wkb .wkp{background:#5A2C57;border-color:#5A2C57;color:#fff}#illuwk .wkb .wkm{color:var(--mut,#6D6577)}.stwho b{color:var(--ink,#211C26)}`; document.head.appendChild(st); }
  add('mfav', ['Member Favorites', '멤버 즐겨찾기'], () => {
    let list = memberFavs();
    const multi = list.filter(e => e.who.length > 1).length;
    if((VS.mfwho || 'all') === 'multi') list = list.filter(e => e.who.length > 1);
    if((VS.mfwho || 'all') === 'cmp') list = list.filter(e => e.who.some(w => mfPicked().includes(w.p)));
    if((VS.mfsort || 'most') === 'most') list.sort((a, b) => (b.who.length - a.who.length) || String(b.at).localeCompare(String(a.at)));
    else list.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const head = '<div class="ivhead"><span class="ivbig">' + list.length + '</span><span class="ivkick">' + L('Every member’s favorites', '모든 멤버의 즐겨찾기') + '</span><span class="ivdot"></span><span class="ivkick">' + H(L(multi + ' liked by more than one', multi + '명은 2명 이상이 좋아함')) + '</span><span class="ivsp"></span>' +
      seg('mfwho', [['all', L('Everyone', '전체')], ['multi', L('Liked by 2+', '2명 이상')], ['cmp', L('Compare members', '멤버 비교')]]) + ((VS.mfwho || 'all') === 'cmp' ? '' : seg('mfsort', [['most', L('Most liked', '많이 좋아한 순')], ['new', L('Newest', '최신 순')]])) + '</div>';
    if((VS.mfwho || 'all') === 'cmp') return head + mfCompare();
    if(!list.length) return head + empty(L('No favorites yet', '아직 즐겨찾기가 없습니다'), L('When any member taps the ♡ on a card, the model shows here with who liked her.', '멤버가 카드의 ♡를 누르면 누가 좋아했는지와 함께 여기에 나옵니다.'));
    const mine = myFav();
    return head + '<div class="ivgrid ivtv">' + list.map(e => {
      const n = e.who.length, rib = n > 1 ? '<span class="ivmrib">♥ ' + n + ' ' + L('members', '명') + '</span>' : '';
      const card = mcard(e.k).replace('<div class="ucimg">', '<div class="ucimg">' + rib);
      const names = e.who.map(w => w.p === me() ? L('You', '나') : (pname(w.p) || '?'));
      return '<div class="ivcw' + (n > 1 ? ' ivmulti' : '') + '" data-mfn="' + n + '">' + card +
        '<div class="ivcap ivmwho" title="' + H(e.who.map(w => (w.p === me() ? L('You', '나') : pname(w.p)) + ' · ' + when(w.at)).join('\n')) + '"><span class="ivmdiscs">' + e.who.slice(0, 6).map(w => disc(w.p, 'xs')).join('') + '</span><span class="ivmnames">' + H(names.join(', ')) + '</span></div>' +
        '<div class="ivcap">♥ ' + H(when(e.at)) + (mine.has(e.k) ? ' · ' + L('in your favorites', '내 즐겨찾기에 있음') : '') + '</div>' + stPill(e.k) + '</div>';
    }).join('') + '</div>';
  }, () => memberFavs().length || '', ['Member Favorites', '멤버 즐겨찾기']);
  /* the Team Vote: every card someone sent. 1.2.117 (user, 9 Nov 2026): two tabs - Waiting for my vote, and
     I voted (a card moves there the moment I vote); the same two tabs are on Today */
  const myAt = k => { const t = ((VT.get(me()) || {}).t || {})[k]; return t ? Object.values(t).sort().pop() || '' : ''; };
  const myVoted = () => allStates().filter(s => s.mine).sort((a, b) => String(myAt(b.k)).localeCompare(String(myAt(a.k))));
  function votedCap(st){
    const v = st.mine;
    return '<div class="ivcap ivvc"><span class="ivst ' + (v === 'g' ? 'appr' : 'cxl') + '">' + (v === 'g' ? L('You voted Go', '내 투표: 찬성') : L('You voted Pass', '내 투표: 반대')) + '</span>' +
      (st.open ? ' ' + stPill(st.k) : '') + '</div>' + ''   /* 1.2.153: the 'Changed your mind?' hint removed (user, 12 Nov 2026) */;
  }
  add('team', ['Team Vote', '팀 투표'], () => {
    const ppl = people(), pick = VS.cwho && ppl.includes(VS.cwho) ? VS.cwho : '';
    const tab = VS.vsub === 'done' ? 'done' : 'to';
    const all = allStates().filter(st => st.open || st.mine);
    const by = st => (!pick || st.o.by === pick) && gw(st);
    const to = allStates().filter(needMe).filter(by).sort((a, b) => (VS.corder || 'old') === 'new' ? String(b.o.at).localeCompare(String(a.o.at)) : String(a.o.at).localeCompare(String(b.o.at)));
    const vd = myVoted().filter(by);
    const chip = (v, lab, n) => '<button type="button" class="ivchip' + ((VS.cwho || 'all') === v ? ' on' : '') + '" data-ivset="cwho=' + H(v) + '">' + lab + (n != null ? ' <span>' + n + '</span>' : '') + '</button>';
    const head = '<div class="ivhead"><span class="ivbig">' + allStates().filter(s => s.open).length + '</span><span class="ivkick">' + L('Faces up for the team vote', '팀 투표에 오른 얼굴') + '</span><span class="ivdot"></span>' +
      chip('all', L('Everyone', '모두')) + ppl.map(p => chip(p, capDisc(p) + H(pname(p)), all.filter(s => s.o.by === p).length)).join('') +
      '<span class="ivsp"></span>' + '<button type="button" class="ivbtn ivshare" data-ivshare>' + SHAREI + L('Share vote link', '투표 링크 보내기') + '</button>' + (tab === 'to' ? seg('corder', [['old', L('Oldest first', '오래된 순')], ['new', L('Newest first', '최신 순')]]) : '') + '</div>' +
      subTabs('vsub', tab, to.length, vd.length);
    const cw = st => '<div class="ivcw">' + mcard(st.k) + (tab === 'to' ? '<div class="ivcap">' + H(L('Sent by ', '보낸 사람: ') + pname(st.o.by) + ' · ' + when(st.o.at)) + '</div>' + stPill(st.k) : votedCap(st)) + offBox(st.k, st) + '</div>';
    const list = tab === 'to' ? to : vd;
    return head + (list.length ? '<div class="ivgrid ivtv">' + list.map(cw).join('') + '</div>'
      : tab === 'to' ? empty(L('Nothing waiting for your vote', '내 투표를 기다리는 카드가 없습니다'), L('When someone presses Send to Team Vote on a card, it shows here for you to vote on. Cards you voted on are under I voted.', '누군가 카드에서 팀 투표로 보내기를 누르면 여기에 보입니다. 투표한 카드는 내가 투표한 카드에 있습니다.'))
      : empty(L('You have not voted yet', '아직 투표한 카드가 없습니다'), L('Vote on a card and it moves here.', '투표하면 카드가 여기로 옵니다.')));
  }, () => allStates().filter(needMe).length || '');
  function subTabs(key, tab, nTo, nDone){
    const b = (v, lab, n) => '<button type="button" role="tab" data-ivset="' + key + '=' + v + '" aria-selected="' + (tab === v) + '">' + lab + ' <b>' + n + '</b></button>';
    return '<div class="ivsub" role="tablist">' + b('to', L('Waiting for my vote', '내 투표 대기'), nTo) + b('done', L('I voted', '내가 투표한 카드'), nDone) + '</div>';
  }
  /* Approved: waiting for the final confirmation */
  const decided = res => allStates().filter(s => !s.open && s.res === res).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const resCap = s => '<div class="ivcap"><b class="ivrt ' + s.res + '">' + (s.res === 'appr' ? L('Approved', '승인') : L('Cancelled', '취소')) + ' ' + s.g + '–' + s.r + '</b> · ' + H(when(s.at)) + '</div>';
  add('appr', ['Approved', '승인'], () => {
    const L1 = decided('appr').filter(gw), wait = L1.filter(s => !s.o.conf), done = L1.filter(s => s.o.conf);
    return about('appr', 'The team voted these in. Each waits here for a final confirmation before it goes to the Booking board; whoever confirms is in charge of the booking card. Open a photo to see who voted Go and who voted Pass.', '팀이 찬성한 카드입니다. 최종 확정을 기다렸다가 부킹 보드로 갑니다. 확정한 사람이 그 부킹 카드를 담당합니다. 사진을 열면 누가 찬성/반대했는지 보입니다.') +
      '<div class="ivsec"><h3>' + L('Waiting for final confirmation', '최종 확정 대기') + '</h3><span class="ivpill">' + wait.length + '</span></div>' +
      (wait.length ? '<div class="ivgrid ivtv">' + wait.map(s => '<div class="ivcw">' + mcard(s.k) + resCap(s) + '<button type="button" class="ivbtn pri wide" data-ivconf="' + H(s.k) + '" title="' + H(L('Whoever confirms is in charge of the booking card until it is complete', '확정한 사람이 부킹 카드를 담당합니다')) + '">' + L('Confirm → Booking · I’ll take charge', '확정 → 부킹 · 내가 담당') + '</button></div>').join('') + '</div>' : '<div class="ivempty sm">' + L('Nothing waiting. When the team votes a card in, it lands here.', '대기 중인 카드가 없습니다. 팀이 찬성하면 여기로 옵니다.') + '</div>') +
      (done.length ? '<div class="ivsec"><h3>' + L('Sent to Booking', '부킹으로 보냄') + '</h3><span class="ivpill">' + done.length + '</span></div><div class="ivgrid">' + done.map(s => '<div class="ivcw">' + mcard(s.k) + resCap(s) + '<div class="ivcap">' + capDisc(s.o.conf.by) + ' ' + L('In charge: ', '담당: ') + '<b>' + H(pname(s.o.conf.by)) + '</b> · ' + H(when(s.o.conf.at)) + '</div></div>').join('') + '</div>' : '');
  }, () => decided('appr').filter(s => !s.o.conf).length || '');
  /* Tie-breaker */
  const ties = () => allStates().filter(s => s.open && s.hist.length).sort((a, b) => String(a.hist[0].at).localeCompare(String(b.hist[0].at)));
  add('tie', ['Tie-breaker', '타이브레이커'], () => {
    const list = ties().filter(gw);
    return about('tie', 'A vote that ends in a tie comes here. The tied round is finished, so it shows who voted what. Talk it over in the notes, then everyone votes again; the new round stays anonymous until all have voted. Another tie starts another round.', '동점으로 끝난 투표가 여기로 옵니다. 끝난 라운드는 누가 어떻게 투표했는지 보입니다. 메모로 의논한 뒤 모두 다시 투표하며, 새 라운드는 모두 투표할 때까지 익명입니다. 또 동점이면 다음 라운드가 열립니다.') +
      (list.length ? '<div class="ivgrid ivtv">' + list.map(s => {
        const ns = notesOf(s.k), open = VS.tbk === s.k;
        const cell = '<div class="ivcw' + (open ? ' ivsel' : '') + '">' + mcard(s.k) + '<div class="ivcap"><span class="ivtbt">TB' + s.round + '</span> ' + H(L(s.n + ' of ' + s.of + ' voted', s.of + '명 중 ' + s.n + '명')) + '</div>' +
          '<button type="button" class="ivbtn wide' + (open ? ' on' : '') + '" data-ivset="tbk=' + (open ? '' : H(s.k)) + '">' + (open ? L('Hide the round and notes', '라운드·메모 닫기') : L('Round & notes', '라운드·메모') + (ns.length ? ' · ' + ns.length : '')) + '</button></div>';
        if(!open) return cell;
        /* the opened card's round and notes run the whole width under its row */
        return cell + '<section class="ivtbx"><div class="ivrow"><h3>' + H(s.o.nm || info(s.k).nm) + '</h3><span class="ivpill">' + L('Round ' + s.round, s.round + '라운드') + '</span><span class="ivsp"></span>' +
          (needMe(s) ? '<span class="ivbeacon">' + L('Waiting for your vote', '내 투표를 기다리는 중') + '</span>' : '<span class="ivmut sm">' + L('You voted · waiting for ' + (s.of - s.n) + ' more', '투표함 · ' + (s.of - s.n) + '명 남음') + '</span>') + '</div>' +
          '<div class="ivbar">' + s.voters.map((p, i) => '<i class="' + (i < s.n ? 'in' : '') + '"></i>').join('') + '</div>' +
          '<div class="ivtbg"><div>' + rounds(s) + '</div><div><div class="ivph">' + L('Team notes', '팀 메모') + '</div>' +
          (ns.length ? ns.map(n => '<div class="ivnoteln">' + disc(n.p) + '<div class="ivnb"><div class="mxw"><b>' + H(pname(n.p)) + '</b> <span class="ivmut sm">' + H(when(n.at)) + (n.r ? ' · R' + n.r : '') + '</span><i class="mxsp"></i>' + noteBtns(s.k, n) + '</div>' + noteBody(s.k, n) + '</div></div>').join('') : '<p class="ivmut sm">' + L('No notes yet. Say why you lean one way.', '아직 메모가 없습니다. 어느 쪽인지 이유를 남겨 주세요.') + '</p>') +
          '<div class="ivrow ivnin"><textarea rows="1" data-ivnotein="' + H(s.k) + '" placeholder="' + H(L('Add a note for the team…', '팀에게 메모 남기기…')) + '"></textarea><button type="button" class="ivbtn" data-ivnote="' + H(s.k) + '">' + L('Post', '올리기') + '</button></div></div></div></section>';
      }).join('') + '</div>' : '<div class="ivempty sm">' + L('No ties to break. When a vote ends level, the card comes here for the team to decide together.', '동점 투표가 없습니다. 투표가 동점으로 끝나면 팀이 함께 정하도록 여기로 옵니다.') + '</div>');
  }, () => ties().length || '');
  /* Cancelled */
  /* 1.2.157 (approved demo): one board, sorted inside by the reason */
  add('unav', ['Unavailable / On hold', '불가 / 보류'], () => {
    const all = [...AV.values()].filter(v => v.t && AVT[v.t]);
    const cat = ['all', 'no', 'nokr', 'later'].includes(VS.avc) ? VS.avc : 'all';
    const list = all.filter(v => cat === 'all' || v.t === cat).sort((p, q) => String(q.at).localeCompare(String(p.at)));
    const chipA = (k2, en, ko) => { const n = all.filter(v => k2 === 'all' || v.t === k2).length; return '<button type="button" class="' + (cat === k2 ? 'on' : '') + '" data-ivset="avc=' + k2 + '">' + L(en, ko) + ' · ' + n + '</button>'; };
    return '<div class="ivhead"><div class="ivseg">' + chipA('all', 'All', '전체') + chipA('no', 'Not available', '불가') + chipA('nokr', 'Not for Korea', '한국 불가') + chipA('later', 'On hold', '보류') + '</div><span class="ivsp"></span><span class="ivkick">' + H(cat === 'later' ? L('Not now, but a chance later — with the date to ask again', '지금은 안 되지만 나중에 가능 — 다시 물어볼 날짜와 함께') : cat === 'nokr' ? L('The agency will not place her in Korea', '에이전시가 한국에는 보내지 않습니다') : cat === 'no' ? L('Not available at all', '전혀 불가') : L('Every model an agency said no or not now to', '에이전시가 불가 또는 보류라고 한 모델')) + '</span></div>' +
      (list.length ? '<div class="ivgrid ivtv ivunav">' + list.map(v => '<div class="ivcw">' + (info(v.k).nm ? mcard(v.k) : (() => { try{ return (window.__illuCard({key: v.k, nm: v.nm || '', ag: v.ag || '', href: v.k}) || ''); }catch(e){ return ''; } })()) + '<div class="avcap ' + v.t + '" title="' + H(v.why || '') + '"><b>' + H(window.__illuAvailLabel(v)) + '</b>' + (v.why ? '<span>“' + H(v.why) + '”</span>' : '') + '<small>' + H([v.from, v.at ? new Date(v.at).toLocaleDateString(isKO() ? 'ko-KR' : 'en-GB', {day: 'numeric', month: 'short'}) : ''].filter(Boolean).join(' · ')) + '</small></div></div>').join('') + '</div>'
        : empty(L('No one here', '없음'), L('When an agency says she is not available, not for Korea, or maybe later, open her card and set it under "Agency said". She shows here and is marked on every board.', '에이전시가 불가, 한국 불가, 보류라고 하면 카드의 "에이전시 답변"에서 설정하세요. 여기와 모든 보드에 표시됩니다.')));
  }, () => [...AV.values()].filter(v => v.t && AVT[v.t]).length || '');
  add('cxl', ['Cancelled', '취소'], () => {
    const list = decided('cxl').filter(gw);
    return about('cxl', 'The team voted these out. Open a photo to see the result; reopen the vote if something changes.', '팀이 반대한 카드입니다. 사진을 열면 결과가 보이고, 사정이 바뀌면 투표를 다시 열 수 있습니다.') +
      (list.length ? '<div class="ivgrid ivtv">' + list.map(s => '<div class="ivcw">' + mcard(s.k) + resCap(s) + '<button type="button" class="ivbtn wide" data-ivre="' + H(s.k) + '">' + L('Reopen the vote', '투표 다시 열기') + '</button></div>').join('') + '</div>' : '<div class="ivempty sm">' + L('Nothing cancelled yet.', '아직 취소된 카드가 없습니다.') + '</div>');
  }, () => decided('cxl').length || '');
  document.addEventListener('click', e => { const g = e.target.closest && e.target.closest('[data-ivgo]'); if(g && window.__illuGo){ e.preventDefault(); window.__illuGo(g.dataset.ivgo); } });

  /* ---------- Today: waiting for your vote ---------- */
  /* waiting for me: open votes I have not voted on, and cards someone has ♥'d that nobody has voted on yet
     (they glow on every board too - the whole team has to vote on them) */
  function waiting(){
    const out = allStates().filter(needMe).map(st => ({k: st.k, st, at: startAt(st.k, st)}));
    return out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  }
  window.__illuVoteWaiting = () => waiting().length;
  /* for Data Analytics: everything the favourites and the votes know, read-only */
  window.__illuVoteData = () => ({fav: FAV, votes: VT, open: OPEN, states: allStates(), people: people(), info, pname});
  window.__illuVoteOnChange = fn => { (window.__illuVoteFns = window.__illuVoteFns || []).push(fn); };
  function todayBox(){
    /* 1.2.107 (user, 8 Nov 2026): no rows per day - a few filters and one grid, most urgent first, 24 at a time;
       a Vote Now banner when anything has waited 3 hours or more for my vote */
    const all = waiting().filter(x => gw(x.st)).map(x => Object.assign(x, {h: ageH(x.at)}));
    const lateN = all.filter(x => x.h >= 3).length;
    const tf = ['all', 'now', 'today', 'week', 'older'].includes(VS.tf) ? VS.tf : 'all', ts = VS.ts || 'urg', tn = Math.max(24, +VS.tn || 24);
    const inF = (f, x) => f === 'all' ? true : f === 'now' ? x.h >= 3 : f === 'today' ? x.h < 24 : f === 'week' ? x.h < 168 : x.h >= 168;
    let list = all.filter(x => inF(tf, x));
    if(ts === 'new') list.sort((a, b) => a.h - b.h); else list.sort((a, b) => (ts === 'urg' ? ((b.h >= 3) - (a.h >= 3)) : 0) || (b.h - a.h));
    const mineDone = allStates().filter(s => s.open && s.mine).length;
    const chip = (f, lab) => '<button type="button" class="ivtf' + (f === 'now' ? ' hot' : '') + '" data-ivset="tf=' + f + '" aria-pressed="' + (tf === f) + '">' + (f === 'now' ? '<i></i>' : '') + lab + ' <s>' + all.filter(x => inF(f, x)).length + '</s></button>';
    const opt = (v, lab) => '<option value="' + v + '"' + (ts === v ? ' selected' : '') + '>' + lab + '</option>';
    setTimeout(tick, 0);
    const tab = VS.tsub === 'done' ? 'done' : 'to', vd = myVoted().filter(gw), vn = Math.max(24, +VS.vn || 24);
    const doneH = vd.length ? '<div class="ivgrid tight ivtg">' + vd.slice(0, vn).map(st => '<div class="ivcw">' + mcard(st.k) + votedCap(st) + offBox(st.k, st) + '</div>').join('') + '</div>' +
        (vd.length > vn ? '<button type="button" class="ivmore" data-ivset="vn=' + (vn + 24) + '">' + L('Show ' + Math.min(24, vd.length - vn) + ' more', Math.min(24, vd.length - vn) + '장 더 보기') + '</button>' : '')
      : '<div class="ivempty sm">' + L('You have not voted on anything yet. Vote on a card and it moves here.', '아직 투표한 카드가 없습니다. 투표하면 카드가 여기로 옵니다.') + '</div>';
    /* 1.2.138 (user, 11 Nov 2026: "this part is taking up too much space. Don't need that Waiting for your vote. I already
       have the golden bar telling me. the [team] description should be able to viewed by clicking/touching"):
       one row - the two tabs (they carry the counts), an ⓘ that opens the team note, Share vote link, Team Vote */
    return '<section class="ivtoday' + (all.length ? ' glow' : '') + '"><div class="ivrow ivth ivth2">' + subTabs('tsub', tab, all.length, vd.length) + '<span class="ivsp"></span>' +
      '<details class="ivinfo"><summary title="' + H(L('How the Team Vote works', '팀 투표 방법')) + '" aria-label="' + H(L('How the Team Vote works', '팀 투표 방법')) + '">i</summary><p class="ivmut sm ivtnote">' + L('Team: ', '팀: ') + H(people().map(pname).join(', ')) + ' · ' + L('the majority decides; your vote stays private until everyone has voted.', '다수결 · 모두 투표할 때까지 내 선택은 나만 봅니다.') + (mineDone ? ' · ' + L('<b>' + mineDone + '</b> you voted on are waiting for the others.', '내가 투표한 <b>' + mineDone + '</b>건은 다른 사람을 기다립니다.') : '') + '</p></details>' +
      '<button type="button" class="ivbtn ivshare ivtshare" data-ivshare>' + SHAREI + L('Share vote link', '투표 링크 보내기') + '</button>' +
      (lateN ? '' : '<button type="button" class="ivgo" data-ivgo="team">' + L('Team Vote', '팀 투표') + ' <span aria-hidden="true">→</span></button>') + '</div>' +
      (lateN ? '<div class="ivnowb"><span class="ivnbi">' + CLKI + '</span><div class="ivnbt"><b>' + L('Vote Now — ' + lateN + (lateN === 1 ? ' card needs' : ' cards need') + ' you', '지금 투표 — ' + lateN + '장이 내 투표를 기다립니다') + '</b><span>' + L('They have waited 3 hours or more. The team can’t decide without you.', '3시간 이상 기다렸습니다. 내 투표가 있어야 팀이 정할 수 있습니다.') + '</span></div><div class="ivnbb"><button type="button" data-ivset="tf=now">' + L('Show them', '보기') + '</button><button type="button" data-ivgo="team">' + L('Go to Team Vote', '팀 투표로 가기') + ' <span aria-hidden="true">→</span></button></div></div>' : '') +
      (tab === 'done' ? doneH : (all.length ? '<div class="ivtbar"><div class="ivtfs">' + chip('all', L('All', '전체')) + chip('now', L('Vote Now', '지금 투표')) + chip('today', L('Today', '오늘')) + chip('week', L('This week', '이번 주')) + chip('older', L('Older', '이전')) + '</div><span class="ivsp"></span>' +
        '<select class="ivts" data-ivsort aria-label="' + H(L('Order', '순서')) + '">' + opt('urg', L('Most urgent first', '급한 순')) + opt('new', L('Newest first', '최신 순')) + opt('old', L('Oldest first', '오래된 순')) + '</select></div>' : '') +
      (list.length ? '<div class="ivgrid tight ivtg">' + list.slice(0, tn).map(x => '<div class="ivcw">' + mcard(x.k) + offBox(x.k, x.st) + '</div>').join('') + '</div>' +
          (list.length > tn ? '<button type="button" class="ivmore" data-ivset="tn=' + (tn + 24) + '">' + L('Show ' + Math.min(24, list.length - tn) + ' more · ' + (list.length - tn) + ' left', Math.min(24, list.length - tn) + '장 더 보기 · ' + (list.length - tn) + '장 남음') + '</button>' : '')
        : '<div class="ivempty sm">' + (all.length ? L('Nothing here — try another filter.', '여기에는 없습니다 — 다른 필터를 눌러 보세요.') : L('You are all caught up — nothing is waiting for your vote.', '모두 처리했습니다 — 내 투표를 기다리는 카드가 없습니다.')) + '</div>')) + '</section>';
  }
  window.__illuVoteToday = todayBox;
  /* 1.2.114: the pop-up alerts (illu-alerts.js) ask which open votes need me; null until every vote has loaded */
  window.__illuVoteAlerts = () => {
    if(ready !== 7 || !me()) return null;
    return allStates().filter(needMe).map(st => {
      const re = (st.o.re || []).slice(-1)[0], i = info(st.k), by = re ? re.by : st.o.by;
      return {id: st.h + ':' + st.round, h: st.h, k: st.k, nm: st.o.nm || i.nm || '', ag: st.o.ag || i.ag || '', by, byN: pname(by), mineUp: by === me(),
        at: st.at || st.o.at, round: st.round, tie: st.hist.length > 0, n: st.n, of: st.of, card: card(st.k)};
    });
  };
  window.__illuVoteCast = (k, v) => cast(k, v);
  document.addEventListener('change', e => { const s = e.target.closest && e.target.closest('select[data-ivsort]'); if(!s) return; VS.ts = s.value; saveVS(); try{ window.__illuTodayRender && window.__illuTodayRender(); }catch(er){} });
  window.__illuVoteToggleHook = (el, e) => { const b = e.target.closest('[data-ivset]'); if(b){ const sv = b.dataset.ivset, ix = sv.indexOf('='), kk = sv.slice(0, ix), v = sv.slice(ix + 1); VS[kk] = v; if(kk === 'tf') delete VS.tn; saveVS(); return true; } const ph = phOf(e); if(ph){ const a = ph.closest('[data-ivk]'); if(a){ openFull(a.dataset.ivk, ph); return true; } } return false; };

  /* ---------- the look ---------- */
  /* ---------- Share vote link (1.2.129, user 10 Nov 2026) ----------
     "send the voting board link, and any cards that need voting can be selected from there" - one link to the
     Team Vote on the phone app's web address. The people it is for can be ticked; then only they are listed
     on the sign-in. They sign in with their own PIN (once per phone) and vote on every card waiting for them. */
  const VOTEURL = 'https://illumenoctis.github.io/illumenoctis-app/vote/';
  const SHAREI = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8l7.4-4.4M8.3 13.2l7.4 4.4"/></svg>';
  let SHSEL = new Set();
  function shareUrl(){ const ns = people().filter(p => SHSEL.has(p)).map(pname).filter(Boolean); return VOTEURL + (ns.length ? '#n=' + ns.map(encodeURIComponent).join(',') : ''); }
  function shareMsg(){ const n = allStates().filter(s => s.open).length; return L('ILLUMÉNOCTIS · Team Vote — ' + n + (n === 1 ? ' card is' : ' cards are') + ' up for the vote. Sign in with your name and PIN, then vote:', 'ILLUMÉNOCTIS · 팀 투표 — ' + n + '장이 투표에 올라와 있습니다. 이름과 PIN으로 로그인한 뒤 투표하세요:') + '\n' + shareUrl(); }
  function shareDraw(){
    let m = document.getElementById('ivshm');
    if(!m){ m = document.createElement('div'); m.id = 'ivshm'; m.className = 'ivshm'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); document.body.appendChild(m);
      m.addEventListener('click', e => {
        if(e.target === m || e.target.closest('[data-shx]')){ m.remove(); return; }
        const cb = e.target.closest('input[data-shp]'); if(cb){ cb.checked ? SHSEL.add(cb.dataset.shp) : SHSEL.delete(cb.dataset.shp); shareDraw(); return; }
        if(e.target.closest('[data-shall]')){ SHSEL = new Set(); shareDraw(); return; }
        const cp = e.target.closest('[data-shcopy]');
        if(cp){ const txt = cp.dataset.shcopy === 'msg' ? shareMsg() : shareUrl(); const done = () => { const o = cp.textContent; cp.textContent = L('Copied ✓', '복사됨 ✓'); setTimeout(() => { cp.textContent = o; }, 1400); };
          try{ (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(done, () => { const ta = m.querySelector('textarea'); ta.value = txt; ta.select(); try{ document.execCommand('copy'); done(); }catch(err){} }); }catch(err){} return; }
        if(e.target.closest('[data-shnative]')){ try{ navigator.share({title: 'ILLUMÉNOCTIS · Team Vote', text: shareMsg().replace(/\n\S+$/, ''), url: shareUrl()}).catch(() => {}); }catch(err){} return; }
      });
      document.addEventListener('keydown', function esc(e){ if(e.key === 'Escape' && document.getElementById('ivshm')){ document.getElementById('ivshm').remove(); } });
    }
    /* 1.2.165 (user: "I want my USER ID - Paul to be on the list too to be able to vote from a different device"): me too, first, marked (you) */
    const ppl = people().slice().sort((a, b) => (a === me() ? -1 : b === me() ? 1 : 0));
    const open = allStates().filter(s => s.open);
    const waitFor = p => open.filter(s => s.voters.includes(p) && !voteOf(p, s.k, s.round)).length;
    m.innerHTML = '<div class="ivshp"><div class="ivshh"><b>' + L('Share the Team Vote', '팀 투표 링크 보내기') + '</b><button type="button" class="ivshx" data-shx aria-label="' + L('Close', '닫기') + '">×</button></div>' +
      '<p class="ivshd">' + L('One link to the Team Vote. They sign in with their own name and PIN (once on each phone) and vote on every card waiting for them, in any browser. Their votes show here at once.', '팀 투표 링크 하나입니다. 받은 사람은 자기 이름과 PIN으로 로그인(기기마다 한 번)한 뒤, 브라우저에서 자기 투표를 기다리는 모든 카드에 투표합니다. 투표는 바로 여기에 반영됩니다.') + '</p>' +
      '<div class="ivshl"><span>' + L('Who is it for?', '누구에게 보내나요?') + '</span><button type="button" class="ivshall' + (SHSEL.size ? '' : ' on') + '" data-shall>' + L('Everyone', '모두') + '</button></div>' +
      '<div class="ivshps">' + ppl.map(p => { const w = waitFor(p); return '<label class="ivshpp"><input type="checkbox" data-shp="' + H(p) + '"' + (SHSEL.has(p) ? ' checked' : '') + '>' + capDisc(p) + '<b>' + H(pname(p)) + (p === me() ? ' <small style="font-weight:500;opacity:.65">' + L('(you — for your other phone)', '(나 — 다른 기기용)') + '</small>' : '') + '</b><span class="ivshn' + (w ? ' wt' : '') + '">' + (w ? L(w + ' to vote', w + '장 대기') : L('nothing to vote', '대기 없음')) + '</span></label>'; }).join('') + '</div>' +
      '<div class="ivshu">' + H(shareUrl()) + '</div>' +
      '<div class="ivsha"><button type="button" class="ivbtn pri" data-shcopy="msg">' + L('Copy message + link', '메시지 + 링크 복사') + '</button><button type="button" class="ivbtn" data-shcopy="url">' + L('Copy link', '링크 복사') + '</button>' + (navigator.share ? '<button type="button" class="ivbtn" data-shnative>' + L('Share…', '공유…') + '</button>' : '') + '</div>' +
      '<p class="ivshd sm">' + L(SHSEL.size ? 'Only the people ticked are listed on the sign-in. ' : 'Everyone on the team is listed on the sign-in. ', SHSEL.size ? '선택한 사람만 로그인 목록에 나옵니다. ' : '팀 전원이 로그인 목록에 나옵니다. ') + L('Paste it into KakaoTalk, WhatsApp or a text message.', '카카오톡, 왓츠앱, 문자에 붙여 넣으세요.') + '</p>' +
      '<textarea aria-hidden="true" tabindex="-1" class="ivsht"></textarea></div>';
  }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-ivshare]'); if(b){ e.preventDefault(); e.stopPropagation(); shareDraw(); } }, true);
  window.__illuShareVote = shareDraw;
  const css = document.createElement('style');
  css.textContent = `
.ivshare{display:inline-flex;align-items:center;gap:6px}.ivshare svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8}
.ivshm{position:fixed;inset:0;z-index:9000;background:rgba(20,14,30,.5);display:grid;place-items:center;padding:16px}
.ivshp{width:460px;max-width:100%;max-height:calc(100vh - 32px);overflow:auto;background:var(--surf,#fff);color:var(--ink);border-radius:16px;padding:18px;box-shadow:0 30px 70px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:12px}
.ivshh{display:flex;align-items:center;justify-content:space-between}.ivshh b{font-size:17px}
.ivshx{border:0;background:none;font-size:24px;line-height:1;cursor:pointer;color:var(--mut);padding:2px 6px}
.ivshd{margin:0;color:var(--mut);font-size:13px}.ivshd.sm{font-size:12px}
.ivshl{display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}
.ivshall{border:1px solid var(--line);background:none;border-radius:99px;padding:3px 10px;font:inherit;font-size:11.5px;cursor:pointer;color:var(--ink)}.ivshall.on{background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57);color:#fff}
.ivshps{display:flex;flex-direction:column;gap:6px}
.ivshpp{display:flex;align-items:center;gap:9px;border:1px solid var(--line);border-radius:10px;padding:8px 10px;cursor:pointer}
.ivshpp input{width:17px;height:17px;accent-color:var(--acc,#5A2C57)}
.ivshpp .ivshn{margin-left:auto;font-size:12px;color:var(--mut)}.ivshpp .ivshn.wt{color:#B7791F;font-weight:600}
.ivshu{border:1px dashed var(--line);border-radius:10px;padding:8px 10px;font-family:ui-monospace,Consolas,monospace;font-size:12px;word-break:break-all;user-select:all}
.ivsha{display:flex;gap:8px;flex-wrap:wrap}
.ivsht{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.mx{display:flex;flex-direction:column;gap:14px;margin-top:6px;padding-top:12px;border-top:1px solid var(--line)}
.mxs{display:flex;flex-direction:column;gap:7px}
.mxs h3{margin:0;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--faint,#9c93a9);display:flex;gap:6px;align-items:center}
.mxs h3 span{font-size:10px;letter-spacing:0;background:var(--wash,#efe6ef);color:var(--acc,#5A2C57);border-radius:8px;padding:0 6px}
.mxb{border:1px solid var(--line);background:var(--surf,#fff);color:var(--ink);border-radius:9px;padding:7px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;min-height:36px;align-self:flex-start}
.mxb.pri{background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57);color:#fff}
.mxb:disabled{opacity:.5;cursor:default}
.mxhint{margin:0;font-size:12px;color:var(--mut)}
.mxok{margin:0;font-size:13px;color:#1F7A4D;font-weight:600}
.mxask{border:1px solid var(--acc,#5A2C57);background:var(--wash,#f3e8f2);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px}
.mxask p{margin:0;font-size:12.5px;line-height:1.45}.mxask div{display:flex;gap:6px;flex-wrap:wrap}
.mxl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.mxl li{border:1px solid var(--line);border-radius:9px;padding:7px 9px;background:var(--surf,#fff);min-width:0}
.mxl li p{margin:3px 0 0;font-size:13px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}
.mxw{display:flex;align-items:center;gap:6px;font-size:12px}.mxw span{color:var(--mut)}
.mxx{margin-left:auto;border:0;background:none;color:var(--faint,#9c93a9);font-size:16px;line-height:1;cursor:pointer;padding:0 2px}
.mxx:hover{color:#A8323C}
.mxl li.lk{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px}
.mxl li.lk a{font-size:13px;font-weight:600;color:var(--acc,#5A2C57);text-decoration:none;overflow-wrap:anywhere}
.mxl li.lk a:hover{text-decoration:underline}
.mxu{font-size:11.5px;color:var(--mut);overflow-wrap:anywhere}
.mx .mxl li,.mx .mxl li *{text-transform:none!important;letter-spacing:normal!important}
.mxl li.lk .mxx{order:3}
.mxsp{flex:1}
/* 1.2.129: the shared side panel */
.mx.pn{display:flex;flex-direction:column;gap:14px;margin-top:0;padding-top:0;border-top:0}
.mx.pn>.mxs{border-top:1px solid var(--line);padding-top:12px;margin:0}
.pntop{display:flex;align-items:center;gap:8px;min-height:30px}
.pnfav{width:32px;height:32px;border-radius:9px;border:1px solid var(--line);background:var(--surf);display:grid;place-items:center;color:var(--mut);cursor:pointer;flex:none;padding:0}
.pnfav svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2}
.pnfav.on{color:#C2416B;border-color:#F0C9D6;background:#FCEFF3}.pnfav.on svg{fill:currentColor}
.pnid h2{margin:0;font:600 22px/1.2 var(--sans);letter-spacing:-.01em;color:var(--ink);overflow-wrap:anywhere}
.pnag{display:inline-block;margin:3px 0 0;padding:0;border:0;background:none;font:600 14px var(--sans);color:var(--acc);cursor:pointer;text-align:left}
p.pnag{cursor:default}
.pnpl{margin:1px 0 0;font-size:13px;color:var(--mut)}
.pnchips{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.pnchip{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:3px 8px;border-radius:99px;background:var(--surf2,#f4f2f7);color:var(--mut)}
.pnchip.nf{background:#E8F1E0;color:#3E6B2A}
.pnms{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.pnms div{padding:7px 4px 8px;text-align:center;border-right:1px solid var(--line);border-bottom:1px solid var(--line);min-width:0}
.pnms div:nth-child(3n){border-right:0}
.pnms:not(.seven) div:nth-last-child(-n+3){border-bottom:0}
.pnms.seven div:last-child{grid-column:1/-1;border-bottom:0;border-right:0}
.pnms.seven div:nth-last-child(-n+4):not(:last-child){border-bottom:1px solid var(--line)}
.pnms small{display:block;font-size:9.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--faint)}
.pnms b{font-size:15px;font-weight:600;color:var(--ink)}.pnms b em{font-style:normal;font-size:10.5px;color:var(--faint);font-weight:500;margin-left:2px}
.pnms .no b{color:var(--faint);font-weight:400}
.pnst{border:1px solid var(--line);border-radius:12px;padding:11px 12px;display:flex;flex-direction:column;gap:9px}
.pnst.vote{border-color:#E4D3E3;background:#FBF6FB}
.pnst.book{border-color:#CFE5D4;background:#F3FAF4}
.pnst.ok{border-color:#CFE5D4}.pnst.x{border-color:#EBC5C9;background:#FDF6F6}
.pnh{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink)}
.pnh b{font-weight:700}
.pnr{margin-left:auto;color:var(--mut);font-size:12px;white-space:nowrap}
.pndot{width:8px;height:8px;border-radius:50%;background:var(--faint);flex:none}
.pndot.v{background:#B05AA9;box-shadow:0 0 0 4px rgba(176,90,169,.15)}
.pndot.b,.pndot.ok{background:#3E8A50;box-shadow:0 0 0 4px rgba(62,138,80,.15)}
.pndot.x{background:#A8323C}
.pnbar{display:flex;gap:3px}.pnbar i{flex:1;height:5px;border-radius:3px;background:#E6DCE6}.pnbar i.in{background:#B05AA9}
.pnvote{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pnv{border:1.5px solid var(--line);background:var(--surf);border-radius:10px;padding:8px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;min-height:40px}
.pnv.g{color:#2F6B3E;border-color:#BFD9C5}.pnv.r{color:#A8323C;border-color:#EBC5C9}
.pnv.g.on{background:#2F6B3E;color:#fff;border-color:#2F6B3E}.pnv.r.on{background:#A8323C;color:#fff;border-color:#A8323C}
.pnv:disabled{opacity:.5;cursor:default}
.pnwait{color:#8a3d84}
.pnrow{display:flex;gap:8px;flex-wrap:wrap}.pnrow .mxb{flex:1}
.pnfull{width:100%}
.pnsub{border-top:1px solid rgba(0,0,0,.06);padding-top:9px;display:flex;flex-direction:column;gap:8px}
.pnkv{display:grid;grid-template-columns:76px minmax(0,1fr);gap:7px 10px;margin:0;font-size:13px}
.pnkv dt{color:var(--faint);font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding-top:2px}
.pnkv dd{margin:0;min-width:0;overflow-wrap:anywhere}.pnkv a{color:var(--acc);font-weight:600;text-decoration:none}
.pnct{display:inline-flex;gap:6px;flex-wrap:wrap}
.pnct .agmail,.pnct .agtel{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:8px;padding:2px 9px;font-size:12px;font-weight:600;color:var(--acc);cursor:pointer;background:var(--surf)}
@media (pointer:coarse){.pnv,.pnfav{min-height:44px}.pnfav{width:44px}}
.mxw .mxx{margin-left:0}
.mxe,.mxg{border:1px solid var(--line);background:none;color:var(--mut);border-radius:7px;padding:2px 8px;font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;min-height:26px}
.mxe:hover,.mxg:hover{color:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57)}
.mxl li.lk .mxg{order:2;margin-left:auto}
.mxed{display:block;font-size:11px;color:var(--faint,#9c93a9);margin-top:2px}
.mxedit{display:flex;flex-direction:column;gap:6px;margin-top:5px}
.mxedit textarea{width:100%;box-sizing:border-box;border:1px solid var(--acc,#5A2C57);border-radius:8px;padding:7px 9px;font:inherit;font-size:13px;resize:vertical;background:var(--surf,#fff);color:var(--ink)}
.mxedit div{display:flex;gap:6px}
.ivnb{flex:1;min-width:0}.ivnb p{margin:2px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
@media (pointer:coarse){.mxe,.mxg{min-height:34px;padding:4px 11px}.mxx{min-width:34px;min-height:34px}}
.mxpt{display:flex;flex-wrap:wrap;gap:6px}
.mxpo{min-height:30px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:var(--surf,#fff);font:inherit;font-size:12.5px;font-weight:600;color:var(--ink);cursor:pointer}
.mxpo.on{border-color:var(--acc,#5A2C57);background:var(--acc,#5A2C57);color:#fff}
.mxpo:disabled{opacity:.55;cursor:default}
.mxpt.sm .mxpo{min-height:26px;font-size:11.5px;padding:0 10px}
.mxpf{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.mxpf span{font-size:11.5px;color:var(--mut,#6D6577)}
.mxpf input{min-width:0;border:1px solid var(--line);border-radius:9px;padding:7px 9px;font:inherit;font-size:13px;background:var(--surf,#fff);color:var(--ink);font-variant-numeric:tabular-nums}
.mxp2{display:grid;grid-template-columns:1.6fr 1fr;gap:8px}
@media (pointer:coarse){.mxpo{min-height:36px}.mxpf input{min-height:38px;font-size:16px}}
.mxin{display:flex;gap:6px;align-items:flex-end}
.mxin textarea,.mxin input{flex:1;min-width:0;border:1px solid var(--line);border-radius:9px;padding:7px 9px;font:inherit;font-size:13px;background:var(--surf,#fff);color:var(--ink);resize:vertical}
.mxin.lk{flex-wrap:wrap}.mxin.lk input[data-mxin="url"]{flex:1 1 100%}
.mxerr{margin:0;font-size:12px;color:#A8323C}
.ivsub{display:flex;gap:4px;background:var(--surf2,#f1eff6);border:1px solid var(--line,#e6e0ea);border-radius:999px;padding:3px;width:max-content;max-width:100%;overflow-x:auto;margin:2px 0 10px}
.ivsub button{border:0;background:none;border-radius:999px;padding:6px 14px;cursor:pointer;color:var(--ink2,#494154);font:inherit;font-size:13px;font-weight:600;white-space:nowrap}
.ivsub button[aria-selected="true"]{background:var(--acc,#5A2C57);color:#fff}
.ivsub b{font-family:var(--mono);font-size:11px;font-weight:500;opacity:.85;margin-left:2px}
.vmk .ivsend{margin-left:auto;border:1px solid var(--acc,#5A2C57);color:var(--acc,#5A2C57);background:none;border-radius:999px;padding:5px 10px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap;min-height:30px}
.vmk .ivsend:hover{background:var(--wash,#EDE3EE)}
.ivoff{border:1px dashed var(--line,#e6e0ea);background:none;border-radius:8px;padding:6px;font:inherit;font-size:12px;cursor:pointer;color:var(--ink2,#494154);width:100%}
.ivoff:hover{border-color:#A8323C;color:#A8323C}
.ivask{border:1px solid #A8323C;background:color-mix(in srgb,#A8323C 9%,var(--surf,#fff));border-radius:8px;padding:8px;font-size:12px;display:flex;flex-direction:column;gap:6px}
.ivask div{display:flex;gap:6px;flex-wrap:wrap}
.ivbtn.red{background:#A8323C;border-color:#A8323C;color:#fff}
.ivcap.ivvc,.ivcap.ivmut{white-space:normal;flex-wrap:wrap;overflow:visible;line-height:1.35}
:root{--bea:#E3BE72}
.vmk{display:flex;align-items:center;gap:6px;flex:1;min-width:0}
.vmk .ivsp,.ivp .ivsp,.ivrow .ivsp,.ivhead .ivsp{flex:1}
.vmk .ivnt{height:28px;min-width:28px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;gap:2px;flex:none;border:1px solid #F0DC8A;background:#FFF4C2;color:#9A7400;cursor:pointer;padding:0 6px;margin-left:2px;transition:transform .15s}
.vmk .ivnt:hover{transform:scale(1.08);background:#FFEC99}
.vmk .ivnt svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linejoin:round;stroke-linecap:round}
.vmk .ivnt b{font-size:11px;font-weight:700}
#ivntpop{position:fixed;z-index:9000;background:#FFFBE6;border:1px solid #F0DC8A;border-radius:12px;box-shadow:0 14px 40px -12px rgba(60,45,0,.35);padding:10px 12px;max-height:60vh;overflow:auto;color:#3B2F00;font:13px/1.5 var(--sans,system-ui)}
#ivntpop .ivnth{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}
#ivntpop .ivnth b{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#7A5C00}
#ivntpop .ivnth button{border:0;background:none;font-size:18px;line-height:1;cursor:pointer;color:#7A5C00;padding:2px 4px}
#ivntpop .ivntn{padding:7px 0;border-top:1px solid #F3E6A8}
#ivntpop .ivntn:first-of-type{border-top:0}
#ivntpop .ivntm{font-size:11.5px;color:#7A6A2A}#ivntpop .ivntm b{color:#3B2F00}
#ivntpop p{margin:2px 0 0;white-space:pre-wrap;word-break:break-word}
#ivntpop .ivnte{font-size:11px;color:#9A8A4A}
.vmk .ivh{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;flex:none;border:0;background:none;color:var(--faint,#8a8090);cursor:pointer;padding:0;transition:transform .15s,color .15s}
.vmk .ivh svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8}
.vmk .ivh:hover{color:#D5536B;transform:scale(1.1)}
.vmk .ivh.on{color:#D5536B}.vmk .ivh.on svg{fill:currentColor}
.vmk .ivl{width:32px;height:32px;flex:none;border-radius:50%;border:1.5px solid var(--line,#e6e0ea);background:var(--surf,#fff);display:grid;place-items:center;font-style:normal;cursor:pointer;box-sizing:border-box;transition:background .15s,border-color .15s}
/* 1.2.105 (user, 8 Nov 2026): a green thumbs up for Go, a red thumbs down for Pass */
.vmk .ivl::after{content:"";width:15px;height:15px;background:currentColor;-webkit-mask:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z'/></svg>\") center/contain no-repeat;mask:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z'/></svg>\") center/contain no-repeat}
.vmk .ivl.g{color:var(--ivg2)}.vmk .ivl.r{color:var(--ivr2)}.vmk .ivl.r::after{transform:rotate(180deg) translateY(-1px)}
.vmk .ivl:hover{border-color:currentColor}
.vmk .ivl.g.on{background:var(--ivg);border-color:var(--ivg);box-shadow:0 0 10px 1px color-mix(in srgb,var(--ivg) 55%,transparent)}.vmk .ivl.r.on{background:var(--ivr);border-color:var(--ivr);box-shadow:0 0 10px 1px color-mix(in srgb,var(--ivr) 55%,transparent)}
.vmk .ivl.g.on{color:#173300}.vmk .ivl.r.on{color:#fff}
/* 1.2.104 (user, 8 Nov 2026): a lighter neon green and red for the votes, the glows and the decided cards */
/* the neon lime of the example the user sent, and a red to match it */
:root{--ivg:#7CFF2B;--ivr:#FF2D4B;--ivg2:#52D10C;--ivr2:#F21C3D;--ivgt:#3B8F07;--ivrt:#C40F2E}
/* once I have voted, my circles stop pulsing (the others still have to vote, but not me) */
.vmk.open.voted .ivl{animation:none!important}
.vmk.open.voted .ivl:not(.on){box-shadow:none!important;border-color:var(--line,#e6e0ea)!important}
/* the glow pulsates: it breathes out and back (user, 7 Nov 2026) */
/* 1.2.106 (user, 8 Nov 2026): a slow glow in and out, like a power generator charging - it builds, holds, fades */
/* 1.2.107 (user, 8 Nov 2026): one smooth wave - green dims exactly as red rises, no pause at the top or the bottom.
   The base is one wave every 8 s; the program speeds each card up to one every 2 s over 3 hours (tick, above) */
@keyframes ivwave{0%,100%{box-shadow:0 0 0 3px color-mix(in srgb,var(--ivc) 48%,transparent),0 0 16px 4px color-mix(in srgb,var(--ivc) 62%,transparent),0 0 34px 10px color-mix(in srgb,var(--ivc) 24%,transparent),inset 0 0 8px 1px color-mix(in srgb,var(--ivc) 45%,transparent)}50%{box-shadow:0 0 0 1px color-mix(in srgb,var(--ivc) 16%,transparent),0 0 2px 0 color-mix(in srgb,var(--ivc) 12%,transparent),0 0 0 0 transparent,inset 0 0 0 0 transparent}}
.vmk.open .ivl{border-width:2px}
.vmk.open .ivl.g{--ivc:var(--ivg);border-color:var(--ivg);animation:ivwave 8s cubic-bezier(.37,0,.63,1) infinite}
.vmk.open .ivl.r{--ivc:var(--ivr);border-color:var(--ivr);animation:ivwave 8s cubic-bezier(.37,0,.63,1) infinite -4s}
.vmk.open .ivl.on{animation:none;box-shadow:none}
/* the pulse stays on in the program's light mode too (user, 8 Nov 2026: the circles must pulsate) - only a handful of circles, it costs little */
.vmk .ivc{font:600 10.5px/1 var(--mono,ui-monospace,monospace);color:var(--faint,#8a8090);flex:none}
.vmk .ivtb,.ivtbt{font:700 10px/1 var(--mono,ui-monospace,monospace);color:#8A6410;background:#FBF0D6;border-radius:5px;padding:3px 5px;flex:none}
.ivres{display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 9px;border-radius:999px;font-size:11.5px;font-weight:600;white-space:nowrap;flex:none}
.ivres b{font-variant-numeric:tabular-nums}
.ivres.appr{background:color-mix(in srgb,var(--ivg) 18%,var(--surf,#fff));color:var(--ivgt)}.ivres.cxl{background:color-mix(in srgb,var(--ivr) 16%,var(--surf,#fff));color:var(--ivrt)}
/* the card: only the name and the measurements on the photo; ♡ left, the vote right */
.uc .ucft:has(.vmk) em{display:none}
.uc .ucft:has(.vmk){padding:0 8px}
.uc .ucov .ucag{display:none}
.uc .ucov b{text-transform:uppercase;letter-spacing:.02em}
/* a card waiting for my vote glows */
/* 1.2.103: a decided card glows green or red (the circles glow while the vote is open, above) */
.uc:has(.vmk.appr){box-shadow:0 0 0 2px var(--ivg),0 0 22px 4px color-mix(in srgb,var(--ivg) 55%,transparent)!important}
.uc:has(.vmk.cxl){box-shadow:0 0 0 2px var(--ivr),0 0 22px 4px color-mix(in srgb,var(--ivr) 55%,transparent)!important}
.d2card:not(.d2full):has(.ivbox.done.appr){box-shadow:0 0 0 3px var(--ivg),0 0 40px 8px color-mix(in srgb,var(--ivg) 50%,transparent),0 30px 70px rgba(0,0,0,.3)!important}
.d2card:not(.d2full):has(.ivbox.done.cxl){box-shadow:0 0 0 3px var(--ivr),0 0 40px 8px color-mix(in srgb,var(--ivr) 50%,transparent),0 30px 70px rgba(0,0,0,.3)!important}
@keyframes ivbeam{0%,100%{box-shadow:0 0 0 1px var(--bea),0 0 10px rgba(227,190,114,.35)}50%{box-shadow:0 0 0 2px var(--bea),0 0 26px 4px rgba(227,190,114,.6)}}
.ivbeacon{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;background:#FBF0D6;color:#8A6410;font-size:12px;font-weight:600;white-space:nowrap}
.ivbeacon::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--bea);animation:ivdot 1.6s ease-in-out infinite}
.ivbeacon.dot{width:10px;height:10px;padding:0;background:var(--bea);border-radius:50%;animation:ivdot 1.6s ease-in-out infinite}.ivbeacon.dot::before{display:none}
@keyframes ivdot{0%,100%{box-shadow:0 0 0 0 rgba(227,190,114,.7)}50%{box-shadow:0 0 0 7px rgba(227,190,114,0)}}
@media (prefers-reduced-motion:reduce){.vmk.open .ivl,.ivbeacon,.ivbeacon::before{animation:none}.vmk.open .ivl:not(.on){box-shadow:0 0 0 3px color-mix(in srgb,var(--ivc) 40%,transparent)}}
/* the vote panel */
.ivp{display:flex;flex-direction:column;gap:8px;margin:10px 0;font-family:var(--sans,Inter,system-ui,sans-serif);color:var(--ink)}
.ivph{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--acc);margin-top:6px}
.ivmut{color:var(--faint,#8a8090)}.ivmut.sm,.ivp .sm,.ivpage .sm{font-size:12.5px}
.ivp p{margin:0}
.ivrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ivp .ivrow .vmk{flex:0 0 auto}
.ivbox{border:1px solid var(--line);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;background:var(--surf)}
.ivbox.open{border-color:var(--bea)}.ivbox.done.appr{border-color:var(--ivg)}.ivbox.done.cxl{border-color:var(--ivr)}
.ivrt{font-size:15px}.ivrt.appr,.ivbox.appr .ivrt{color:#24603a}.ivrt.cxl,.ivbox.cxl .ivrt{color:#9c2018}
.ivbar{display:flex;gap:4px;margin:4px 0}.ivbar i{flex:1;height:6px;border-radius:3px;background:var(--line)}.ivbar i.in{background:var(--bea)}
.ivsides{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ivtag{display:inline-flex;align-items:center;gap:4px;border-radius:7px;padding:2px 8px;font-size:12px;font-weight:600;margin-bottom:4px}
.ivtag.g{background:color-mix(in srgb,var(--ivg) 18%,var(--surf,#fff));color:var(--ivgt)}.ivtag.r{background:color-mix(in srgb,var(--ivr) 16%,var(--surf,#fff));color:var(--ivrt)}
.ivwho{display:flex;align-items:center;gap:7px;font-size:13px;padding:3px 0}
.ivdisc{width:22px;height:22px;border-radius:50%;flex:none;display:inline-grid;place-items:center;font-style:normal;font-size:10px;font-weight:700;background:var(--idbg);color:var(--idfg)}
.ivdisc.xs{width:18px;height:18px;font-size:9px;vertical-align:-4px}.ivdisc.lg{width:38px;height:38px;font-size:15px}
.ivround{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surf);margin-bottom:8px}
.ivbtn{min-height:34px;padding:0 14px;border-radius:9px;border:1px solid var(--line);background:var(--surf);font:inherit;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer}
.ivbtn.pri{background:var(--acc);border-color:var(--acc);color:#fff}.ivbtn.wide{width:100%}
.ivbtn:hover{border-color:var(--acc)}
.ivpwrap{margin-top:8px}.ivpwrap:empty{display:none}
#illufv .fvside .ivp{margin-top:14px}
/* pages */
.ivpage{padding:10px 0 40px;display:flex;flex-direction:column;gap:14px;font-family:var(--sans,Inter,system-ui,sans-serif);color:var(--ink)}
.ivpage[hidden]{display:none}
.ivth2{flex-wrap:wrap;gap:8px;align-items:center}
.ivth2 .ivsub{margin:0}
.ivinfo{position:relative}
.ivinfo>summary{list-style:none;width:30px;height:30px;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center;cursor:pointer;font:italic 700 14px/1 Georgia,serif;color:var(--mut);background:var(--surf)}
.ivinfo>summary::-webkit-details-marker{display:none}
.ivinfo[open]>summary{border-color:var(--acc);color:var(--acc)}
.ivinfo>p{position:absolute;z-index:30;right:0;top:36px;width:min(320px,80vw);margin:0;padding:12px 14px;background:var(--surf);border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 30px rgba(20,10,30,.18)}
.ivhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ivbig{font-size:30px;font-weight:300;line-height:1;color:var(--acc)}
.ivkick{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--faint)}
.ivdot{width:4px;height:4px;border-radius:50%;background:var(--line2,var(--line))}
.ivseg{display:inline-flex;background:var(--surf);border:1px solid var(--line);border-radius:10px;padding:3px;gap:2px}
.ivseg button{border:0;background:none;font:inherit;font-size:12.5px;font-weight:600;color:var(--faint);padding:0 11px;border-radius:7px;min-height:28px;cursor:pointer}
.ivseg button.on{background:var(--acc);color:#fff}
.ivchip{display:inline-flex;align-items:center;gap:6px;height:32px;border:1px solid var(--line);background:var(--surf);border-radius:999px;padding:0 12px 0 6px;font:inherit;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer}
.ivchip span{font-weight:500;color:var(--faint);font-size:12px}
.ivchip.on{border-color:var(--acc);background:var(--wash,#f4ecf2);color:var(--acc)}
.ivlink{border:0;background:none;color:var(--acc);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.ivgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(186px,1fr));gap:16px}
.ivgrid.tight{grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}
.ivcw{display:flex;flex-direction:column;gap:5px;min-width:0}
.ivmulti .uc{box-shadow:0 0 0 2px var(--acc,#5A2C57),0 10px 24px -12px rgba(90,44,87,.45)!important}
.ivmrib{position:absolute;left:8px;top:34px;z-index:6;display:inline-flex;align-items:center;gap:4px;padding:4px 9px;border-radius:999px;background:var(--acc,#5A2C57);color:#fff;font-size:11.5px;font-weight:700;letter-spacing:.02em;box-shadow:0 4px 12px rgba(0,0,0,.25);pointer-events:none}
.ivmwho{gap:6px;color:var(--mut)}.ivmdiscs{display:inline-flex;flex:none}.ivmdiscs > *{margin-left:-5px;box-shadow:0 0 0 2px var(--surf,#fff);border-radius:50%}.ivmdiscs > *:first-child{margin-left:0}
.ivmulti .ivmwho{color:var(--acc,#5A2C57);font-weight:600}.ivmnames{overflow:hidden;text-overflow:ellipsis}
.ivcap{font-size:12px;color:var(--faint);display:flex;align-items:center;gap:5px;padding:0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ivst{align-self:flex-start;margin:0 4px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px;background:var(--surf2,#f3f3f4);color:var(--faint)}
.ivst.me{background:#FBF0D6;color:#8A6410}.ivst.appr{background:color-mix(in srgb,var(--ivg) 18%,var(--surf,#fff));color:var(--ivgt)}.ivst.cxl{background:color-mix(in srgb,var(--ivr) 16%,var(--surf,#fff));color:var(--ivrt)}
.ivlane{border:1px solid var(--line);border-radius:16px;padding:14px 16px;background:var(--surf)}
.ivlh{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.ivlanes{display:grid;grid-auto-flow:column;grid-auto-columns:186px;gap:14px;overflow-x:auto;padding:6px 4px 10px;scroll-snap-type:x proximity}
.ivlanes>.ivcw{scroll-snap-align:start}
.ivnone{margin:0 0 4px 50px}
.ivnote{margin:0;max-width:880px;border-left:3px solid var(--acc);background:var(--surf);padding:10px 14px;border-radius:0 10px 10px 0;font-size:13.5px;line-height:1.5}
.ivsec{display:flex;align-items:center;gap:10px;margin-top:6px}.ivsec h3{margin:0;font-size:15px;font-weight:700}
.ivpill{display:inline-flex;align-items:center;border-radius:7px;padding:2px 8px;font-size:12px;font-weight:600;background:var(--surf2,#f4ecf2);color:var(--acc)}
.ivpill.gold{background:#FBF0D6;color:#8A6410}
.ivempty{border:1px dashed var(--line2,var(--line));border-radius:16px;padding:50px 20px;text-align:center;color:var(--faint);font-size:13.5px}
.ivempty.sm{padding:26px 20px}.ivempty b{color:var(--ink);display:block;margin-bottom:6px;font-size:15px}.ivempty p{margin:0 auto;max-width:520px}
.ivei{font-size:30px;margin-bottom:6px}
.ivtbrow{display:grid;grid-template-columns:200px minmax(0,1fr);gap:18px;border:1px solid var(--line);border-radius:16px;padding:14px;background:var(--surf)}
.ivtbrow.need{border-color:var(--bea);box-shadow:0 0 0 1px rgba(227,190,114,.5),0 0 22px rgba(227,190,114,.18)}
.ivtbm h3{margin:0;font-size:18px;font-weight:600}
.ivtbg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:16px}
.ivnoteln{display:flex;gap:8px;padding:6px 0;font-size:13px;border-bottom:1px solid var(--line)}
.ivnin textarea{flex:1;min-height:34px;resize:vertical;border:1px solid var(--line);border-radius:9px;padding:7px 10px;background:var(--surf);color:var(--ink);font:13px var(--sans,inherit);box-sizing:border-box}
/* Today */
.ivtoday{background:none;border:0;border-radius:0;padding:4px 0 0;display:flex;flex-direction:column;gap:6px;min-width:0;box-sizing:border-box}
.ivtoday h3{margin:0;font-size:17px;font-weight:700}
.ivtoday .ivth{gap:10px}
.ivtoday .ivtnote{margin:0}
.ivtoday .ivgrid.tight{grid-template-columns:repeat(auto-fill,minmax(176px,1fr));gap:16px}
.ivgo{height:32px;border:1px solid color-mix(in srgb,var(--acc,#5A2C57) 40%,var(--line));background:color-mix(in srgb,var(--acc,#5A2C57) 8%,var(--surf,#fff));color:var(--acc,#5A2C57);border-radius:999px;padding:0 14px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
.ivgo span{transition:transform .2s}.ivgo:hover span{transform:translateX(3px)}
.ivgo:hover{background:var(--acc,#5A2C57);color:#fff}
.ivtoday>p{margin:0}
.ivabout{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.ivabtn{display:inline-flex;align-items:center;gap:7px;height:30px;border:1px solid var(--line);border-radius:999px;background:var(--surf);padding:0 12px 0 6px;font:inherit;font-size:12.5px;font-weight:600;color:var(--mut);cursor:pointer}
.ivabtn i{width:18px;height:18px;border-radius:50%;display:inline-grid;place-items:center;font:italic 700 11px/1 Georgia,serif;background:var(--surf2,#f4ecf2);color:var(--acc)}
.ivabtn svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2.5;transition:transform .2s}
.ivabout.open .ivabtn svg{transform:rotate(180deg)}
.ivabtn:hover{color:var(--acc);border-color:color-mix(in srgb,var(--acc) 40%,var(--line))}
.ivtbx{grid-column:1/-1;border:1px solid var(--bea);border-radius:14px;padding:14px 16px;background:var(--surf);display:flex;flex-direction:column;gap:8px}
.ivtbx h3{margin:0;font-size:16px}
.ivcw.ivsel .uc{outline:2px solid var(--bea);outline-offset:2px}
.ivbtn.on{border-color:var(--bea)}
.ivtop{position:absolute;z-index:3;left:8px;top:8px;right:8px;display:flex;flex-direction:column;align-items:flex-start;gap:4px;pointer-events:none}
.ivfirst{display:inline-flex;align-items:center;gap:5px;max-width:100%;box-sizing:border-box;background:rgba(18,12,22,.58);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);color:#fff;border-radius:999px;font-size:11px;line-height:1.2;pointer-events:auto}
.ivfirst{padding:2px 9px 2px 2px}
.ivfirst b{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.ivfirst s{text-decoration:none;opacity:.75;font-weight:600}
.ivstrip{position:absolute;z-index:4;left:0;right:0;top:0;height:28px;padding:0 6px 0 9px;box-sizing:border-box;display:flex;align-items:center;gap:6px;background:linear-gradient(rgba(12,8,16,.74),rgba(12,8,16,.5));-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);color:#fff;font-size:11px;white-space:nowrap;pointer-events:auto}
.ivsd{flex:1 1 auto;min-width:0;overflow:hidden;display:flex}.ivsd.cut i{display:none}.ivsd.cut2 b{visibility:hidden}.ivsd b{font-weight:700;flex:none}.ivsd i{font-style:normal;opacity:.8;overflow:hidden}
.ivsv{display:none;flex:none;font-weight:800;letter-spacing:.06em;text-transform:uppercase;font-size:10.5px}
.ivclk{flex:none;display:inline-flex;align-items:center;gap:4px;padding:2px 7px 2px 6px;border-radius:999px;background:rgba(255,255,255,.16);font-variant-numeric:tabular-nums}
.ivclk b{font-weight:700;letter-spacing:.02em}
.ivclk svg,.ivnbi svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;flex:none}
.ivstrip.late{background:linear-gradient(90deg,#FFB13D,#FF9F1A);color:#2A1600;-webkit-backdrop-filter:none;backdrop-filter:none}
.ivstrip.late .ivsv{display:inline}
.ivstrip.late .ivclk{background:#2A1600;color:#FFD27A}
.uc :has(> .ivstrip) > .ivtop{top:36px}
/* narrow cards (phone, small size): the strip tightens so the clock always fits */
.uc .ucimg:has(> .ivstrip){container-type:inline-size}
@container (max-width:190px){.ivstrip{padding:0 4px 0 7px;gap:4px;font-size:10.5px}.ivclk{padding:2px 6px 2px 5px;gap:3px}.ivstrip.late .ivclk svg{display:none}.ivsv{letter-spacing:.03em;font-size:10px}}
@container (max-width:150px){.ivstrip{font-size:10px;padding:0 3px 0 5px;gap:3px}.ivclk svg{display:none}.ivclk{padding:2px 5px}}
.uc .ucimg:has(> .ivtop) > .ucbadge{left:auto;right:8px}.uc .ucimg:has(> .ivstrip) > .ucbadge{top:36px}
.uc:has(.vmk.late){box-shadow:0 0 0 2px #FF9F1A,0 10px 26px -10px rgba(224,120,0,.6)!important}
.ivnowb{display:flex;align-items:center;gap:12px;border-radius:14px;padding:10px 14px;color:#2A1600;background:linear-gradient(100deg,#FFD27A,#FFB13D 55%,#FF9F1A);box-shadow:0 8px 24px -12px rgba(224,120,0,.7);position:relative;overflow:hidden;margin-top:4px}
.ivnowb::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.45) 50%,transparent 70%);transform:translateX(-100%);animation:ivsheen 3.2s ease-in-out infinite;pointer-events:none}
@keyframes ivsheen{60%,100%{transform:translateX(100%)}}
.ivnbi{width:34px;height:34px;border-radius:50%;background:#2A1600;color:#FFB13D;display:grid;place-items:center;flex:none}.ivnbi svg{width:17px;height:17px}
.ivnbt{flex:1;min-width:0;display:flex;flex-direction:column}.ivnbt b{font-size:14px}.ivnbt span{font-size:12.5px}
.ivnbb{display:flex;gap:8px;flex:none;position:relative;z-index:1}
.ivnowb button{height:34px;border:0;border-radius:10px;background:#2A1600;color:#FFD27A;padding:0 14px;font:inherit;font-size:12.5px;font-weight:800;white-space:nowrap;cursor:pointer;position:relative;z-index:1}
.ivtbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:6px}
.ivtfs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;min-width:0}.ivtfs::-webkit-scrollbar{display:none}
.ivtf{flex:none;height:32px;border:1px solid var(--line);background:var(--surf);border-radius:999px;padding:0 12px;font:inherit;font-size:12.5px;font-weight:600;color:var(--ink);display:inline-flex;align-items:center;gap:6px;cursor:pointer}
.ivtf s{text-decoration:none;font-size:11.5px;color:var(--faint);font-variant-numeric:tabular-nums}
.ivtf[aria-pressed="true"]{background:var(--acc);border-color:var(--acc);color:#fff}.ivtf[aria-pressed="true"] s{color:inherit;opacity:.8}
.ivtf.hot{border-color:color-mix(in srgb,#FF9F1A 60%,var(--line))}.ivtf.hot i{width:7px;height:7px;border-radius:50%;background:#FF9F1A}
.ivts{height:32px;border:1px solid var(--line);border-radius:9px;background:var(--surf);color:var(--ink);font:inherit;font-size:12.5px;padding:0 8px}
.ivtg{margin-top:6px}
.ivmore{margin:10px auto 0;display:block;height:34px;border:1px solid var(--line);background:var(--surf);border-radius:999px;padding:0 16px;font:inherit;font-size:12.5px;font-weight:600;color:var(--ink);cursor:pointer}
@media (max-width:620px){.ivnowb{flex-wrap:wrap}.ivnbt{flex-basis:calc(100% - 46px)}.ivnbb{width:100%}.ivnowb button{flex:1}.ivts{margin-left:auto}.ivtoday .ivgrid.tight,.ivgrid.ivtv{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
@media (prefers-reduced-motion:reduce){.ivnowb::after{animation:none}}
.ivgrid.ivtv{grid-template-columns:repeat(auto-fill,minmax(176px,1fr));gap:16px}
.ivgh{display:flex;align-items:center;gap:8px;margin:8px 0 2px;font-size:13px}
.mkkey{display:none!important}
.ivgh::after{content:"";flex:1;height:1px;background:var(--line)}
#ivtoast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:9800;background:#1B1420;color:#fff;font:500 13.5px/1.4 var(--sans,Inter,system-ui,sans-serif);padding:11px 16px;border-radius:12px;box-shadow:0 12px 34px rgba(0,0,0,.28);display:flex;align-items:center;gap:12px;max-width:min(640px,calc(100vw - 32px))}
#ivtoast[hidden]{display:none}
#ivtoast:not([hidden]){animation:ivtin .32s cubic-bezier(.22,1.3,.36,1)}
@keyframes ivtin{from{opacity:0;transform:translateX(-50%) translateY(14px) scale(.96)}to{opacity:1;transform:translateX(-50%)}}
#ivtoast .ivthumb{width:30px;height:30px;border-radius:50%;flex:none;display:inline-grid;place-items:center;transform-origin:70% 80%;animation:ivthumb 1.1s cubic-bezier(.3,1.5,.4,1) both}
#ivtoast .ivthumb.g{background:var(--ivg);box-shadow:0 0 14px 2px color-mix(in srgb,var(--ivg) 70%,transparent);color:#173300}
#ivtoast .ivthumb.r{background:var(--ivr);box-shadow:0 0 14px 2px color-mix(in srgb,var(--ivr) 70%,transparent);color:#fff}
#ivtoast .ivthumb i{width:17px;height:17px;background:currentColor;-webkit-mask:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z'/></svg>\") center/contain no-repeat;mask:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z'/></svg>\") center/contain no-repeat}
#ivtoast .ivthumb.r i{transform:rotate(180deg)}
@keyframes ivthumb{0%{transform:scale(0) rotate(-30deg)}35%{transform:scale(1.35) rotate(10deg)}55%{transform:scale(.95) rotate(-12deg)}70%{transform:scale(1.08) rotate(8deg)}85%{transform:scale(1) rotate(-4deg)}100%{transform:scale(1) rotate(0)}}
@media (prefers-reduced-motion:reduce){#ivtoast,#ivtoast .ivthumb{animation:none!important}}
#ivtoast button{border:0;background:none;color:var(--bea);font:inherit;font-weight:700;cursor:pointer}
@media (max-width:900px){.ivtbrow,.ivtbg{grid-template-columns:1fr}}
`;
  document.head.appendChild(css);

  function start(){ if(!db()){ setTimeout(start, 300); return; } listen(); }
  /* the language switch: every page drawn again in the other language */
  try{ new MutationObserver(() => { for(const p of PAGES.values()) p.el.__h = ''; changed(); }).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']}); }catch(e){}
  start();
  /* the people list arrives a little after start: draw again then */
  [1500, 5000].forEach(t => setTimeout(changed, t));

  /* 1.2.130: the clean side panel (Side Panel Demo, approved 10 Nov 2026) */
  const pncss = document.createElement('style');
  pncss.textContent = `
/* 1.2.148: the photo frame fills the card's photo area (position:relative here left it 0 px high, so every photo on My / Member Favorites, Team Vote and Today was dark) */.ivcw .uc .ucph,.uc .ucimg > .ucph.d2t{position:absolute;inset:0;height:auto}.uc .ucimg{position:relative}.uc .ucimg > .ucph:has(> .ivmat){position:absolute;inset:0;height:auto}.uc .ucimg,.uc .ucimg .ivstrip,.uc .ucimg .litpic[data-pic]{cursor:pointer}/* 11 Nov 2026: her Book photo fills the whole photo area - it sat inside the agency photo's box, 0 px high when that photo fails */.uc .ucimg .ivmat{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 20%;z-index:1;pointer-events:none;background:#1b1724}
.ivcw .uc .ucov .ucag,.ivcw .uc .ucov .ucmx{display:none}
/* 1.2.132 (user): cards keep one size, so zooming out shows more of them and zooming in fewer - about 5 a row at 100% */
.ivgrid,.ivgrid.ivtv,.ivgrid.tight,.ivtoday .ivgrid.tight{grid-template-columns:repeat(auto-fill,minmax(var(--ivcw,240px),1fr));gap:14px}
@media (max-width:620px){.ivgrid,.ivgrid.ivtv,.ivgrid.tight,.ivtoday .ivgrid.tight{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
@media (max-width:620px){.ivdet{padding:7px 7px 8px;gap:5px}.ivdkv>div{padding:4px 6px}.ivdkv b{font-size:11.5px}.ivdkv .sub{font-size:10px}.ivdms{font-size:11.5px}.ivdms i{margin:0 1px}}
.ivdet{padding:8px 9px 9px;display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--line)}
.ivdag{display:flex;align-items:center;gap:6px;min-width:0}
.ivdag b{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--acc);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ivdet .pnmom{flex:none;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--acc);background:var(--wash,#EDE3EE);border-radius:4px;padding:1px 5px}
.ivdms{display:flex;align-items:baseline;font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap;min-width:0}
.ivdms>span:first-child{color:var(--mut);overflow:hidden;text-overflow:ellipsis;min-width:0}.ivdms b{color:var(--ink);font-weight:700}.ivdms i{font-style:normal;color:var(--faint);margin:0 2px}
.ivdms small{font-size:9.5px;color:var(--faint);font-weight:600;margin-left:2px}
.ivdsh{margin-left:auto;padding-left:7px;border-left:1px solid var(--line);font-weight:700;flex:none}
.ivdkv{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line);border-radius:9px;overflow:hidden}
.ivdkv>div{padding:5px 8px;min-width:0}.ivdkv>div+div{border-left:1px solid var(--line)}
.ivdkv small{display:block;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.ivdkv b{display:block;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ivdkv b.no{color:var(--faint);font-weight:500}
.ivdkv .sub{display:block;font-size:10.5px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ivdkv .sub.cond{color:var(--hold,#84610F);font-weight:600}
.ivdst{display:flex;font-size:11px;font-weight:600;border-radius:7px;padding:4px 7px;background:var(--surf2,#F1EFF6);color:var(--mut)}
.ivdst.email{background:#E9EEFA;color:#3B5BA9}.ivdst.guar{background:var(--holdbg,#F4EBD5);color:var(--hold,#84610F)}.ivdst.ok{background:var(--okbg,#DFECE4);color:var(--ok,#2E6845)}.ivdst.x{background:var(--nobg,#FBEAEC);color:var(--no,#A8323C)}
html[data-theme="dim"] .ivdst.email,html[data-theme="dark"] .ivdst.email{background:#1D2740;color:#9DB5F0}
/* 1.2.130 (user): no blinking on the vote circles */
.vmk.open .ivl.g,.vmk.open .ivl.r{animation:none!important;box-shadow:none!important}
.ivtshare{margin-left:auto}.ivtshare+.ivgo{margin-left:8px}
.pn2 .pnmomset{margin:4px 0 0;font-size:12px}
.pn2 .pnmomo{margin:4px 0 0;font-size:12px;color:var(--mut)}.pn2 .pnmomo b{color:var(--ink)}.pn2 .pnmomo .pnlk{margin-left:6px;font-size:12px}
.pn2 .pnmomed{display:flex;flex-direction:column;gap:6px;margin-top:6px;padding:8px;border:1px solid var(--line);border-radius:10px;background:var(--surf2,#F1EFF6)}
.pn2 .pnmomr{display:flex;gap:6px;align-items:center}.pn2 .pnmomr input{flex:1;min-width:0;border:1px solid var(--line);border-radius:8px;padding:6px 8px;font:inherit;font-size:13px;background:var(--surf,#fff);color:var(--ink)}
.pn2 .pnmomr .pnlk{margin-left:0;margin-right:10px}
.pn2 .pnmomct{display:inline-flex;align-items:center;gap:5px}.pn2 .pnmomct em{font-style:normal;font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--acc);background:var(--wash,#EDE3EE);border-radius:4px;padding:1px 5px}
.pn2 .pnkvx{display:flex;flex-direction:column;gap:3px;padding:7px 10px;border:1px solid var(--line);border-top:0;border-radius:0 0 10px 10px;font-size:12px;color:var(--mut)}
.pn2 .pnkvx span{font-weight:600;color:var(--ink)}.pn2 .pnkvx p{margin:0;white-space:pre-wrap}
.pn2 .pnkvw .pnkv{border-radius:10px 10px 0 0}
.pn2 .mxpf textarea{min-width:0;border:1px solid var(--line);border-radius:9px;padding:7px 9px;font:inherit;font-size:13px;background:var(--surf,#fff);color:var(--ink);resize:vertical}
.mx.pn2{display:flex;flex-direction:column;gap:0}
.pn2 .pnhd{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:12px;align-items:start;padding:2px 0 12px}
.pn2 .pnth{width:64px;aspect-ratio:3/4;border-radius:10px;overflow:hidden;background:var(--wash,#EDE3EE)}
.pn2 .pnth .litpic,.pn2 .pnth img{display:block;width:100%;height:100%;object-fit:cover;pointer-events:none}
.pn2 .pnth button,.pn2 .pnth .picx,.pn2 .pnth .piccp{display:none!important}
.pn2 .pnhm{min-width:0}
.pn2 .pnhm h2{margin:0;font-size:18px;line-height:1.2;text-wrap:balance;overflow-wrap:anywhere}
.pn2 .pnagr{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:3px}.pn2 .pnagr{flex-wrap:nowrap}.pn2 .pnagr .pnagl{min-width:0}.pn2 .pnagr .pnagfav{margin-left:0}
.pn2 .pnagl{border:0;background:none;padding:0;font:inherit;font-size:13px;font-weight:600;color:var(--acc);text-decoration:none;cursor:pointer;text-align:left}
.pn2 .pnagl:hover{text-decoration:underline}
.pn2 .pnagfav{flex:none;width:24px;height:24px;border-radius:50%;border:1px solid var(--line);background:var(--surf);color:var(--faint);display:inline-grid;place-items:center;padding:0;cursor:pointer;vertical-align:middle;margin-left:6px}
.pn2 .pnagfav svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2}
.pn2 .pnagfav:hover{color:#C2185B;border-color:#E9A3BC}
.pn2 .pnagfav.on{color:#C2185B;border-color:#E9A3BC;background:#FCE9F0}.pn2 .pnagfav.on svg{fill:currentColor}
.pn2 .pnagfav:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.pn2 .pnnml{color:inherit;text-decoration:none}.pn2 .pnnml svg{width:12px;height:12px;margin-left:5px;vertical-align:1px;fill:none;stroke:currentColor;stroke-width:1.8;opacity:.45}
.pn2 .pnnml:hover{text-decoration:underline;text-underline-offset:3px}.pn2 .pnnml:hover svg{opacity:1}.pn2 .pnnml:focus-visible{outline:2px solid var(--acc);outline-offset:2px;border-radius:4px}
.pn2 span.pnagl{color:var(--ink2,var(--ink));cursor:default}
.pn2 .pnmom{font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--acc);background:var(--wash,#EDE3EE);border-radius:4px;padding:1px 6px}
.pn2 .pnmeta{margin:3px 0 0;font-size:12px;color:var(--mut)}
.pn2 .pnfav{position:static;width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:var(--surf,#fff);display:grid;place-items:center;cursor:pointer;color:var(--mut);padding:0}
.pn2 .pnfav svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8}
.pn2 .pnfav.on{color:#E5484D;border-color:#F0AEB4}.pn2 .pnfav.on svg{fill:currentColor}
.pn2 .pnmr{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-bottom:4px}
.pn2 .pnmr>div{padding:7px 3px;text-align:center;min-width:0}
.pn2 .pnmr>div+div{border-left:1px solid var(--line)}
.pn2 .pnmr small{display:block;font-size:9.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pn2 .pnmr b{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.pn2 .pnmr em{font-style:normal;font-size:10px;font-weight:500;color:var(--faint);margin-left:1px}
.pn2 .pnmr .no b{color:var(--faint);font-weight:500}
.pn2 .pnmr.pnmr6{grid-template-columns:repeat(6,minmax(0,1fr))}
/* 1.2.170 (user, 13 Nov 2026: "numbers are overlapping on this card" - 176.5 / 81.3 / 59.8 / 87.8): the figure shrinks to fit its box, never past it */
.pn2 .pnmr>div,.pn2 .pnmr .pnage{container-type:inline-size;overflow:hidden}
.pn2 .pnmr b{display:inline-block;max-width:100%;font-size:clamp(10.5px,21cqw,15px);letter-spacing:-.01em}
.pn2 .pnmr em{font-size:clamp(8px,12cqw,10px)}
.mxc.mxage .mxagei{width:3ch;text-align:center}
.pn2 .pnmr .pnage{border:0;border-left:1px solid var(--line);background:none;padding:7px 3px;text-align:center;min-width:0;font:inherit;color:inherit;cursor:pointer}
.pn2 .pnmr .pnage:hover:not(:disabled){background:var(--surf2,#F6F3F8)}
.pn2 .pnmr .pnage:disabled{cursor:default}
.pn2 .pnmr .pnage.no b{color:var(--faint);font-weight:500}
.pn2 .pnaged{display:grid;grid-template-columns:90px minmax(0,1fr);gap:8px 10px;border:1px solid var(--line);background:var(--surf2,#FAF8FB);border-radius:12px;padding:10px 12px;margin:6px 0 4px}
.pn2 .pnaged label{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--mut)}
.pn2 .pnaged input{height:36px;box-sizing:border-box;border:1px solid var(--line);border-radius:9px;padding:0 10px;font:500 14px var(--sans);color:var(--ink);background:var(--surf,#fff);min-width:0}
.pn2 .pnaged p{grid-column:1/-1;margin:0;font-size:12px;color:var(--mut);line-height:1.45}
.pn2 .pnaged > div{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px}
.pn2 .pns{display:flex;flex-direction:column;gap:8px;padding:12px 0;border-top:1px solid var(--line)}
.pn2 .pns:first-of-type{border-top:0}
.pn2 .pnsh{display:flex;align-items:center;gap:8px;min-height:22px}
.pn2 .pnsh h3{margin:0;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
.pn2 .pnlk{margin-left:auto;border:0;background:none;padding:2px 0;font:inherit;font-size:12.5px;font-weight:600;color:var(--acc);cursor:pointer}
.pn2 .pnrow .pnlk{margin-left:0}
.pn2 .pnlk:disabled{opacity:.5;cursor:default}
.pn2 .pnbk{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 10px;background:var(--okbg,#DFECE4);color:var(--ok,#2E6845);border-radius:10px;padding:8px 10px;font-size:12.5px;font-weight:600}
.pn2 .pnvb{background:var(--holdbg,#F4EBD5);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px}
.pn2 .pnvb.ok{background:var(--okbg,#DFECE4)}.pn2 .pnvb.x{background:var(--nobg,#FBEAEC)}
.pn2 .pnvh{display:flex;align-items:baseline;gap:8px;font-size:13px}
.pn2 .pnvh b{color:var(--hold,#84610F)}.pn2 .pnvb.ok .pnvh b{color:var(--ok,#2E6845)}.pn2 .pnvb.x .pnvh b{color:var(--no,#A8323C)}
.pn2 .pnvh span{margin-left:auto;font-size:11.5px;color:var(--mut);white-space:nowrap}
.pn2 .pnbar{display:flex;gap:3px}.pn2 .pnbar i{flex:1;height:5px;border-radius:3px;background:var(--line)}.pn2 .pnbar i.in{background:var(--hold,#84610F)}
.pn2 .pnvote{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pn2 .pnvb p{margin:0;font-size:12px;color:var(--mut)}.pn2 .pnvb p b{color:var(--hold,#84610F)}
.pn2 .pnkv{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.pn2 .pnkv>div{padding:7px 10px;min-width:0}.pn2 .pnkv>div+div{border-left:1px solid var(--line)}
.pn2 .pnkv small{display:block;font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.pn2 .pnkv b{display:block;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pn2 .pnkv b.no{color:var(--faint);font-weight:500}
.pn2 .pnkv .sub{display:block;font-size:11px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pn2 .pnkv .sub.no{color:var(--faint)}.ivdet .pnkv .sub{white-space:normal;text-overflow:clip;line-height:1.3}.pn2 .pnkv .sub.cond{color:var(--hold,#84610F);font-weight:600}
.pn2 .pnpills{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.pn2 .pnpill{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:4px 10px;font-size:12px;font-weight:600;color:var(--ink);text-decoration:none;background:var(--surf,#fff)}
.pn2 a.pnpill{color:var(--acc)}
.pn2 .pntabs{display:flex;gap:4px;background:var(--surf2,#F4F1F6);border:1px solid var(--line);border-radius:10px;padding:3px}
.pn2 .pntabs button{flex:1;border:0;background:none;border-radius:8px;padding:6px;font:inherit;font-size:12.5px;font-weight:600;color:var(--mut);cursor:pointer;min-height:32px}
.pn2 .pntabs button[aria-selected="true"]{background:var(--surf,#fff);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.1)}
.pn2 .pntabs s{text-decoration:none;font-size:11px;color:var(--acc);margin-left:3px}
.pn2 .mxs{gap:7px}
/* 1.2.136 Guarantee & availability, typed in place (approved Vote Card Final Design) */
.pn2 .gs .pnsh{gap:6px}.pn2 .gs .pnsh h3{white-space:nowrap;min-width:0;letter-spacing:.06em}
.pn2 .gssub{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--mut);margin:12px 0 6px;display:flex;align-items:center;gap:5px}
.pn2 .gs .gssync{display:inline-flex;align-items:center;gap:3px;font-size:10.5px;color:var(--ok,#2E7D4F);white-space:nowrap}
.pn2 .gsln{width:11px;height:11px;stroke:var(--ok,#2E7D4F);fill:none;stroke-width:2.2;flex:none}
.pn2 .gsseg{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;padding:3px;border:1px solid var(--line);border-radius:10px;background:var(--surf2,var(--wash));margin-bottom:8px}.pn2 .gsseg:last-child{margin-bottom:0}
.pn2 .gsseg button{font:inherit;font-size:12.5px;font-weight:600;border:0;background:none;color:var(--mut);border-radius:7px;padding:6px 2px;cursor:pointer}
.pn2 .gsseg button[aria-pressed="true"]{background:var(--acc);color:var(--on-acc,#fff)}
.pn2 .gsbox{border:1px solid var(--line);border-radius:12px;overflow:hidden}
.pn2 .gscell{display:grid;grid-template-columns:86px minmax(0,1fr);align-items:center;gap:4px 8px;padding:8px 11px;border-top:1px solid var(--line);cursor:text;min-height:42px;margin:0}
.pn2 .gscell:first-child{border-top:0}
.pn2 .gscell:hover{background:var(--surf2,var(--wash))}
.pn2 .gscell > small{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--mut);display:flex;align-items:center;gap:5px}
.pn2 .gsval{display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:wrap}
.pn2 .gsval input{font:inherit;font-size:14.5px;font-weight:600;color:var(--ink,inherit);background:transparent;border:0;border-bottom:1.5px dashed transparent;border-radius:0;padding:2px 0;min-width:0;flex:1 1 70px;width:100%;font-variant-numeric:tabular-nums;box-shadow:none}
.pn2 .gsval input.gsdays,.pn2 .gsval input.gsjobs{flex:none}
.pn2 .gsval input.gsjobs{width:3ch}
.pn2 .gsval input::placeholder{color:var(--faint);font-weight:500}
.pn2 .gscell:hover .gsval input,.pn2 .gsval input:focus{border-bottom-color:var(--line)}
.pn2 .gsval input:focus{outline:0;border-bottom:1.5px solid var(--acc)}
.pn2 .gscur{font-size:14.5px;font-weight:600;color:var(--mut)}
.pn2 .gsunit{font-size:12.5px;color:var(--mut)}
.pn2 .gstog{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden;flex:none}
.pn2 .gstog button{font:inherit;font-size:11px;font-weight:600;border:0;background:none;color:var(--mut);padding:2px 8px;cursor:pointer}
.pn2 .gstog button[aria-pressed="true"]{background:var(--acc);color:var(--on-acc,#fff)}
.pn2 .gschips{display:flex;gap:5px;grid-column:2}
.pn2 .gschips button{font:inherit;font-size:11.5px;border:1px solid var(--line);background:var(--surf);color:var(--mut);border-radius:999px;padding:1px 9px;cursor:pointer}
.pn2 .gschips button[aria-pressed="true"]{border-color:var(--acc);color:var(--acc);font-weight:600}
.pn2 .gscell.est,.pn2 .gscell.est:hover{background:var(--holdbg,#F6EED8)}
.pn2 .gscell.est > small,.pn2 .gsestn{color:var(--hold,#84610F)}
.pn2 .gsestn{grid-column:2;font-size:11px;margin-top:-2px}
.pn2 .gscell.none{cursor:default}.pn2 .gscell.none .gsval{color:var(--faint);font-size:13px}
.pn2 .gs button:disabled,.pn2 .gs input:disabled{cursor:default;opacity:.7}
.pn2 .gs .pnkvx{margin-top:8px}
.pn2 .mxpre{display:flex;flex-direction:column;gap:7px}
`;
  document.head.appendChild(pncss);
  /* 1.2.132 (user, 10 Nov 2026): 5 cards a row at the normal zoom (100%); zooming out makes the cards smaller and
     brings more onto each row, zooming in fewer. The card width is set from what the board's width would be at 100%. */
  let ZF = 1;
  const zRead = () => { try{ if(window.illu && window.illu.zoom) window.illu.zoom(null).then(v => { if(v && Math.abs(v - ZF) > 0.001){ ZF = v; fitGrids(); } }).catch(() => {}); }catch(e){} };
  function fitGrids(){
    for(const g of document.querySelectorAll('.ivgrid')){
      const w = g.clientWidth; if(!w) continue;
      const cw = Math.max(140, Math.floor((w * ZF - 4 * 14) / 5));
      if(g.__cw !== cw){ g.__cw = cw; g.style.setProperty('--ivcw', cw + 'px'); }
    }
  }
  let fitT = 0; const fitSoon = () => { if(!fitT) fitT = requestAnimationFrame(() => { fitT = 0; fitGrids(); }); };
  try{ new MutationObserver(fitSoon).observe(document.body, {childList: true, subtree: true}); }catch(e){}
  addEventListener('resize', () => { zRead(); fitSoon(); });
  zRead(); setInterval(zRead, 3000);
  window.__illuFitGrids = () => { zRead(); fitGrids(); };
  /* a photo that does not load leaves the plain tile, not a broken-image icon */
  document.addEventListener('error', e => { const t = e.target; if(t && t.tagName === 'IMG' && t.closest && t.closest('.pnth, .ivdet')) t.remove(); }, true);
})();
/* 1.2.138 (user, 11 Nov 2026: "I'm unable click&drag&drop, copy/paste photos, load a saved photo from my device
   onto the main photo of the card. This was used to be available"): on the cards outside Suggestiones and the
   Directory (Today, Team Vote, My Favorites, Approved, Tie-breaker, Cancelled) a photo dropped on the card's
   picture was ignored, and since 1.2.133 a click opens the photo viewer, so there was no way to pick a file.
   - drop a picture file on the card's photo: it becomes her card photo (the same saved photo as everywhere);
   - "Change photo" on the photo (shown on hover, always on touch screens) opens the device's picker;
   - paste (Ctrl+V) while pointing at the photo keeps working;
   - the booking window's photo also takes a paste while the pointer is on it. */
(function(){
  const own = el => !!(el && el.closest && !el.closest('.d2card') && (el.closest('#lmain') || el.closest('#pane-arr')));   // those two have their own handlers (the open card has none)
  const cellOf = t => { const c = t && t.closest ? (t.closest('.uc .litpic[data-pic]') || t.closest('.d2card .litpic[data-pic]')) : null; return c && !own(c) ? c : null; };
  const signed = () => { try{ if(!SIGNED()){ nudgeSignIn(); return false; } }catch(e){} return true; };
  const put = (k, f) => { if(!k || !f || !/^image\//i.test(f.type || '')) return false; if(!signed()) return false; try{ setPic(k, f); return true; }catch(e){ return false; } };
  document.addEventListener('dragover', e => { const c = cellOf(e.target); if(!c) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; c.classList.add('over'); }, true);
  document.addEventListener('dragleave', e => { const c = cellOf(e.target); if(c) c.classList.remove('over'); }, true);
  document.addEventListener('drop', e => {
    const c = cellOf(e.target); if(!c) return;
    e.preventDefault(); e.stopPropagation(); c.classList.remove('over');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    put(c.dataset.pic, f);
  }, true);
  /* the Change photo button: added to every vote card photo as cards are drawn */
  const CAM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  function addBtns(){
    document.querySelectorAll('.uc .ucimg').forEach(im => {
      if(im.querySelector(':scope > .ucchg') || own(im)) return;
      const c = im.querySelector('.litpic[data-pic]'); if(!c) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ucchg'; b.dataset.ucchg = c.dataset.pic;
      const ko = typeof LANG !== 'undefined' && LANG === 'ko';
      b.title = ko ? '사진 바꾸기 — 기기에서 사진 선택 (사진을 끌어다 놓거나 붙여넣어도 됩니다)' : 'Change photo — choose one from this device (or drop / paste a picture on it)';
      b.setAttribute('aria-label', ko ? '사진 바꾸기' : 'Change photo');
      b.innerHTML = CAM + '<span>' + (ko ? '사진' : 'Photo') + '</span>';
      im.appendChild(b);
    });
  }
  let t = 0; new MutationObserver(() => { if(!t) t = requestAnimationFrame(() => { t = 0; addBtns(); }); }).observe(document.body, {childList: true, subtree: true});
  addBtns();
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-ucchg]'); if(!b) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if(!signed()) return;
    const k = b.dataset.ucchg;
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; if(f) put(k, f); });
    inp.click();
  }, true);
  /* paste on the booking window's photo */
  let overFace = false;
  document.addEventListener('pointerover', e => { overFace = !!(e.target.closest && e.target.closest('.bv .bvface')); }, true);
  /* on the window, ahead of the booking window's own paste (which files a pasted picture into the folder) */
  addEventListener('paste', e => {
    if(!overFace) return;
    const ae = document.activeElement; if(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
    const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(i => i.kind === 'file' && /^image\//i.test(i.type || ''));
    const f = it && it.getAsFile(); if(!f) return;
    e.preventDefault(); e.stopPropagation();
    try{ if(typeof bv !== 'undefined' && bv && bv.id && typeof setBookPic === 'function'){ Promise.resolve(setBookPic(bv.id, f)).then(() => { try{ bvDraw(); }catch(er){} }); } }catch(er){}
  }, true);
  const css = document.createElement('style');
  css.textContent = `.uc .ucimg .ucchg{position:absolute;top:8px;right:8px;z-index:4;display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:999px;border:0;background:rgba(20,12,24,.62);color:#fff;font:600 11.5px/1 var(--sans,Inter,system-ui,sans-serif);cursor:pointer;opacity:0;transition:opacity .15s;backdrop-filter:blur(4px)}
.uc .ucimg .ucchg svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round}
.uc .ucimg:hover .ucchg,.uc .ucimg .ucchg:focus-visible{opacity:1}
.uc .ucimg .ucchg:hover{background:var(--acc,#5A2C57)}
@media (pointer:coarse){.uc .ucimg .ucchg{opacity:.92;height:30px}}
.uc .litpic.over{outline:3px dashed var(--acc,#5A2C57);outline-offset:-6px}`;
  document.head.appendChild(css);
})();
