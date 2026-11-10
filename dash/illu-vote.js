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
  let ready = 0;
  let DBX = null;
  function db(){ if(DBX) return DBX; try{ if(typeof DB !== 'undefined') DBX = DB; }catch(e){} return DBX; }
  function listen(){
    const d = db(); if(!d){ setTimeout(listen, 300); return; }
    d.collection('fav').onSnapshot(s => { FAV.clear(); for(const x of s.docs){ const v = x.data() || {}; const m = new Map(); for(const k in (v.e || {})) m.set(k, v.e[k]); FAV.set(x.id, m); } ready |= 1; changed(); }, () => {});
    d.collection('vote').onSnapshot(s => { VT.clear(); for(const x of s.docs){ const v = x.data() || {}; VT.set(x.id, {e: Object.assign({}, v.e || {}), t: Object.assign({}, v.t || {})}); } ready |= 2; changed(); }, () => {});
    d.collection('vopen').onSnapshot(s => { OPEN.clear(); for(const x of s.docs){ const v = x.data(); if(v && v.k) OPEN.set(x.id, v); } ready |= 4; changed(); }, () => {});
    d.collection('vnote').onSnapshot(s => { NOTE.clear(); for(const x of s.docs){ const v = x.data() || {}; NOTE.set(x.id, Object.assign({}, v.e || {})); } changed(); }, () => {});
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
  window.__illuVoteState = k => { const s = stateOf(k); return !s ? '' : s.open ? (s.hist.length ? 'tie' : 'open') : s.res; };

  /* ---------- actions ---------- */
  function info(k){
    let i = null; try{ if(typeof agIndex === 'function') agIndex(); }catch(e){}
    try{ i = typeof keyInfo === 'function' ? keyInfo(k) : null; }catch(e){}
    const snap = (OPEN.get(hash(k))) || [...FAV.values()].map(m => m.get(k)).find(Boolean) || {};
    return Object.assign({key: k, nm: snap.nm || '', ag: snap.ag || '', href: snap.href || (/^https?:/i.test(k) ? k : '')}, i || {}, {key: k});
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
  function sendVote(k, about){
    if(!signedIn()) return;
    if(onVote(k)){ say(L('She is on the Team Vote already.', '이미 팀 투표에 있습니다.')); return; }
    const h = hash(k), m = info(k), was = OPEN.get(h);
    const o = {k, nm: (about && about.nm) || m.nm || (was && was.nm) || '', ag: m.ag || (about && about.ag) || (was && was.ag) || '', href: m.href || '', by: me(), at: nowIso(), voters: people(), base: lastRound(k) + 1};
    OPEN.set(h, o); save('vopen/' + h, o); changed();
    say(L((o.nm || 'She') + ' is on the Team Vote — the team is asked to vote.', (o.nm || '') + ' — 팀 투표로 보냈습니다. 팀에게 투표를 요청합니다.'), () => { try{ window.__illuGo && window.__illuGo('team'); }catch(e){} }, null, L('Open Team Vote', '팀 투표 열기'));
  }
  function canTakeOff(st){ return !!st && st.open && st.o.by === me(); }
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
    else { try{ c.by = me(); saveBook(c.id, true); }catch(e){} }
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
  function addNote(k, t){
    if(!signedIn()) return;
    const h = hash(k), st = stateOf(k);
    const mine = Object.assign({}, NOTE.get(me()) || {});
    mine[h] = (mine[h] || []).concat([{t: String(t).slice(0, 2000), at: nowIso(), r: st ? st.round : 1}]);
    NOTE.set(me(), mine); save('vnote/' + me(), {e: mine, at: nowIso()}); changed();
  }
  function notesAll(k){ const h = hash(k), out = []; for(const [p, e] of NOTE) for(const n of (e[h] || [])) out.push(Object.assign({p}, n)); return out.sort((a, b) => String(a.at).localeCompare(String(b.at))); }
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
    NOTE.set(me(), mine); save('vnote/' + me(), {e: mine, at: nowIso()}); changed(); return true;
  }
  function dropMine(k, at){
    if(!signedIn()) return;
    const h = hash(k), mine = Object.assign({}, NOTE.get(me()) || {});
    const before = mine[h] || [], kept = before.filter(n => n.at !== at); if(kept.length === before.length) return;
    const gone = before.find(n => n.at === at);
    if(kept.length) mine[h] = kept; else delete mine[h];
    NOTE.set(me(), mine); save('vnote/' + me(), {e: mine, at: nowIso()}); changed();
    say(gone && gone.u ? L('Link removed', '링크를 지웠습니다') : L('Note removed', '메모를 지웠습니다'), () => {
      const m2 = Object.assign({}, NOTE.get(me()) || {}); m2[h] = (m2[h] || []).concat([gone]).sort((a, b) => String(a.at).localeCompare(String(b.at)));
      NOTE.set(me(), m2); save('vnote/' + me(), {e: m2, at: nowIso()}); changed(); });
  }
  function sendBook(k, about){
    if(!signedIn()) return;
    let c = null; try{ c = bkForKey(k); }catch(e){}
    if(c){ say(L((c.nm || 'She') + ' is on the Booking board already.', (c.nm || '') + ' — 이미 부킹 보드에 있습니다.')); return; }
    const i = info(k), a = about || {};
    try{ c = bookFromModel(k, a.nm || i.nm || '', a.ag || i.ag || '', a.city || i.city || '', a.country || i.country || ''); }catch(e){ console.error(e); }
    if(!c) return;
    try{ remember('book', k, c.nm || k, c.ag || '', k); }catch(e){}
    const st = stateOf(k);
    if(st){ const o = Object.assign({}, st.o); delete o.legacy; if(!o.voters) o.voters = st.voters;
      if(st.open) o.off = {by: me(), at: nowIso(), round: st.round, why: 'booking', bid: c.id};
      else if(st.res === 'appr' && !o.conf) o.conf = {by: me(), at: nowIso(), bid: c.id};
      if(st.open || (st.res === 'appr' && !st.o.conf)){ OPEN.set(st.h, o); save('vopen/' + st.h, o); } }
    MXASK = '';
    try{ renderBook(); }catch(e){}
    changed();
    say(L((c.nm || '') + ' is on the Booking board — you are in charge of her card.', (c.nm || '') + ' — 부킹 보드로 보냈습니다. 이 카드는 내가 담당합니다.'), () => { try{ bvOpenFor(c.id); }catch(e){} }, null, L('Open card', '카드 열기'));
  }
  let MXASK = '';
  const hostOf = u => { try{ return new URL(u).hostname.replace(/^www\./, ''); }catch(e){ return u; } };
  function extras(k, about){
    if(!k) return '';
    const can = signedIn(), a = about || {}, nm = a.nm || info(k).nm || L('her', '모델');
    let c = null; try{ c = bkForKey(k); }catch(e){}
    const st = stateOf(k);
    let h = '<div class="mx" data-mxk="' + H(k) + '">';
    /* Booking */
    h += '<section class="mxs"><h3>' + L('Booking', '부킹') + '</h3>';
    if(c){ let who = ''; try{ const p = PEOPLE.get(c.by); who = p ? p.n : ''; }catch(e){}
      h += '<p class="mxok">✓ ' + L('On the Booking board', '부킹 보드에 있음') + (who ? ' · ' + L('in charge: ', '담당: ') + H(who) : '') + '</p><button type="button" class="mxb" data-mxopen="' + H(c.id) + '">' + L('Open booking card →', '부킹 카드 열기 →') + '</button>'; }
    else if(MXASK === k) h += '<div class="mxask"><p>' + H(L('Send ' + nm + ' to the Booking board without a vote? You will be in charge of her card.', nm + ' — 투표 없이 부킹 보드로 보낼까요? 이 카드는 내가 담당합니다.')) +
      (st && st.open ? ' ' + H(L('Her Team Vote closes as "sent to Booking".', '팀 투표는 "부킹으로 보냄"으로 닫힙니다.')) : '') + '</p><div><button type="button" class="mxb pri" data-mxsendyes>' + L('Send to Booking', '부킹으로 보내기') + '</button><button type="button" class="mxb" data-mxsendno>' + L('Cancel', '취소') + '</button></div></div>';
    else h += '<button type="button" class="mxb pri" data-mxsend' + (can ? '' : ' disabled') + '>' + L('Send to Booking', '부킹으로 보내기') + '</button><p class="mxhint">' + L('Straight to the Booking board — no team vote needed.', '팀 투표 없이 바로 부킹 보드로.') + '</p>';
    h += '</section>';
    /* Notes */
    const ns = notesOf(k);
    h += '<section class="mxs"><h3>' + L('Notes', '메모') + (ns.length ? ' <span>' + ns.length + '</span>' : '') + '</h3>' +
      (ns.length ? '<ul class="mxl">' + ns.map(n => '<li><div class="mxw">' + disc(n.p, 'xs') + '<b>' + H(pname(n.p)) + '</b><span>' + H(when(n.at)) + '</span>' + (n.p === me() ? '<button type="button" class="mxx" data-mxdel="' + H(n.at) + '" aria-label="' + H(L('Remove this note', '이 메모 지우기')) + '">×</button>' : '') + '</div><p>' + H(n.t) + '</p></li>').join('') + '</ul>' : '<p class="mxhint">' + L('No notes yet.', '아직 메모가 없습니다.') + '</p>') +
      (can ? '<div class="mxin"><textarea data-mxin="note" rows="2" placeholder="' + H(L('Write a note about ' + nm + '…', nm + '에 대한 메모…')) + '"></textarea><button type="button" class="mxb pri" data-mxnote>' + L('Add', '추가') + '</button></div>' : '') + '</section>';
    /* Links */
    const ls = linksOf(k);
    h += '<section class="mxs"><h3>' + L('Links', '링크') + (ls.length ? ' <span>' + ls.length + '</span>' : '') + '</h3>' +
      (ls.length ? '<ul class="mxl">' + ls.map(n => '<li class="lk"><a href="' + H(n.u) + '" target="_blank" rel="noopener">' + H(n.t || hostOf(n.u)) + ' ↗</a><span class="mxu">' + H(n.t ? hostOf(n.u) + ' · ' : '') + H(pname(n.p)) + '</span>' + (n.p === me() ? '<button type="button" class="mxx" data-mxdel="' + H(n.at) + '" aria-label="' + H(L('Remove this link', '이 링크 지우기')) + '">×</button>' : '') + '</li>').join('') + '</ul>' : '<p class="mxhint">' + L('Instagram, another agency, models.com — any page about her or her agency.', '인스타그램, 다른 에이전시, models.com 등 모델이나 에이전시 관련 페이지.') + '</p>') +
      (can ? '<div class="mxin lk"><input data-mxin="url" type="url" inputmode="url" placeholder="https://…"><input data-mxin="lab" type="text" placeholder="' + H(L('Label (optional)', '이름 (선택)')) + '"><button type="button" class="mxb pri" data-mxlink>' + L('Add link', '링크 추가') + '</button></div><p class="mxerr" hidden></p>' : '') + '</section>';
    return h + '</div>';
  }
  window.__illuModelExtras = extras;
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('.mx [data-mxsend],.mx [data-mxsendyes],.mx [data-mxsendno],.mx [data-mxnote],.mx [data-mxlink],.mx [data-mxdel],.mx [data-mxopen]'); if(!t) return;
    e.preventDefault(); e.stopPropagation();
    const box = t.closest('.mx'), k = box.dataset.mxk, d = t.dataset;
    if(d.mxsend != null){ if(!signedIn()) return; MXASK = k; changed(); return; }
    if(d.mxsendno != null){ MXASK = ''; changed(); return; }
    if(d.mxsendyes != null){ const ab = window.__illuMxAbout ? window.__illuMxAbout() : null; sendBook(k, ab); return; }
    if(d.mxopen){ try{ const fv = document.getElementById('illufv'); if(fv && !fv.hidden){ const x = fv.querySelector('.fvx'); if(x) x.click(); } }catch(err){} try{ bvOpenFor(d.mxopen); }catch(err){} return; }
    if(d.mxdel){ dropMine(k, d.mxdel); return; }
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
    return '<span class="vmk' + (need ? ' need' : '') + (need && at && ageH(at) >= 3 ? ' late' : '') + glow + '" data-mk="' + H(k) + '"' + (at ? ' data-at="' + H(at) + '"' : '') + ' data-nm="' + H(nm || '') + '" data-meta="' + H(meta || '') + '" data-url="' + H(url || '') + '">' + heart + '<span class="ivsp"></span>' + right + '</span>';
  }
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
    });
  }
  window.__illuVoteChanged = changed;

  /* ---------- messages ---------- */
  const T = document.createElement('div'); T.id = 'ivtoast'; T.hidden = true; T.setAttribute('role', 'status');
  let tT = 0;
  function say(s, undo, thumb, act){
    if(!T.isConnected) document.body.appendChild(T);
    T.innerHTML = (thumb ? '<span class="ivthumb ' + (thumb === 'r' ? 'r' : 'g') + '" aria-hidden="true"><i></i></span>' : '') + H(s) + (undo ? '<button type="button" data-ivundo>' + H(act || L('Undo', '되돌리기')) + '</button>' : '');
    T.hidden = false; T.__undo = undo || null;
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
  const mcard = k => card(k).replace('<div class="ucov">', firstMark(k) + '<div class="ucov">');
  /* the line that explains a board folds away behind a small button (user, 8 Nov 2026) */
  const about = (id, en, ko) => { const open = VS['ab_' + id] === '1';
    return '<div class="ivabout' + (open ? ' open' : '') + '"><button type="button" class="ivabtn" data-ivset="ab_' + id + '=' + (open ? '0' : '1') + '" aria-expanded="' + open + '"><i>i</i>' + L('How this board works', '이 보드 사용법') + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>' + (open ? '<p class="ivnote">' + L(en, ko) + '</p>' : '') + '</div>'; };
  function pageEl(id){
    const el = document.createElement('div'); el.id = 'pane-' + id; el.className = 'pane ivpage'; el.hidden = true;
    el.addEventListener('click', e => {
      if(e.target.closest('.vmk')) return;
      const ph = e.target.closest('.uc .ucph');
      if(ph){ const a = ph.closest('[data-ivk]'); if(a){ e.preventDefault(); e.stopPropagation(); openFull(a.dataset.ivk, ph); } return; }
      const b = e.target.closest('[data-ivset]'); if(b){ const sv = b.dataset.ivset, ix = sv.indexOf('='), kk = sv.slice(0, ix), v = sv.slice(ix + 1); VS[kk] = v; saveVS(); PAGES.get(id).render(); return; }
      const nb = e.target.closest('[data-ivnote]'); if(nb){ const k = nb.dataset.ivnote, inp = el.querySelector('textarea[data-ivnotein="' + CSS.escape(k) + '"]'); const t = inp && inp.value.trim(); if(!t){ if(inp) inp.focus(); return; } addNote(k, t); inp.value = ''; return; }
    });
    el.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey && e.target.matches && e.target.matches('textarea[data-ivnotein]')){ e.preventDefault(); const k = e.target.dataset.ivnotein, t = e.target.value.trim(); if(t){ addNote(k, t); e.target.value = ''; } } });
    return el;
  }
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
    if(st.open) return '<span class="ivst ' + (needMe(st) ? 'me' : 'others') + '">' + (st.hist.length ? L('Tie-breaker · ', '타이브레이커 · ') : '') + (needMe(st) ? L('Waiting for your vote', '내 투표 대기') : L('Waiting for others', '다른 사람 대기')) + ' · ' + st.n + '/' + st.of + '</span>';
    return '<span class="ivst ' + st.res + '">' + (st.res === 'appr' ? L('Approved', '승인') : L('Cancelled', '취소')) + ' ' + st.g + '–' + st.r + '</span>';
  }
  const capDisc = p => disc(p, 'xs');
  function add(id, label, render, count, title){
    const el = pageEl(id);
    const p = {el, render: () => { if(el.hidden) return; const h = render(); if(el.__h !== h){ el.__h = h; el.innerHTML = h; } tick(); }, count};
    PAGES.set(id, p);
    function mount(){
      const ref = document.getElementById('pane-arr');
      if(!ref || !window.__illuShellAdd){ setTimeout(mount, 200); return; }
      ref.parentNode.insertBefore(el, ref);
      window.__illuShellAdd(id, {label, title, el, count, show: () => { el.__h = ''; p.render(); }});
    }
    mount();
  }
  const empty = (big, small) => '<div class="ivempty"><div class="ivei">♡</div><b>' + H(big) + '</b><p>' + H(small) + '</p></div>';
  /* Lumen: my own favourites */
  add('fav', ['My Favorites', '내 즐겨찾기'], () => {
    const list = fresh('lsort', [...myFav()].map(([k, v]) => ({k, at: v.at})).sort((a, b) => String(a.at).localeCompare(String(b.at))));
    const head = '<div class="ivhead"><span class="ivbig">' + list.length + '</span><span class="ivkick">' + L('Your favorites', '내 즐겨찾기') + '</span><span class="ivdot"></span><span class="ivkick">' + L('Only you see this board', '나만 보는 보드') + '</span><span class="ivsp"></span>' +
      seg('lsort', [['new', L('Newest first', '최신 순')], ['old', L('Oldest first', '오래된 순')]]) + '<button type="button" class="ivlink" data-ivgo="team">' + L('Team Vote →', '팀 투표 →') + '</button></div>';
    if(!list.length) return head + empty(L('My Favorites is empty', '내 즐겨찾기가 비어 있습니다'), L('Tap the ♡ on any card — in Suggestiones, the Directory or Compare boards — and the model lands here. Press Send to Team Vote on her card when you want the team to vote.', '추천, 디렉터리, 보드 비교의 아무 카드에서 ♡를 누르면 여기에 들어옵니다. 팀 투표를 받으려면 카드의 팀 투표로 보내기를 누르세요.'));
    return head + '<div class="ivgrid ivtv">' + list.map(x => '<div class="ivcw">' + mcard(x.k) + '<div class="ivcap">♥ ' + H(when(x.at)) + '</div>' + stPill(x.k) + offBox(x.k) + '</div>').join('') + '</div>';
  }, () => myFav().size || '', ['Favorites', '즐겨찾기']);
  /* the Team Vote: every card someone sent. 1.2.117 (user, 9 Nov 2026): two tabs - Waiting for my vote, and
     I voted (a card moves there the moment I vote); the same two tabs are on Today */
  const myAt = k => { const t = ((VT.get(me()) || {}).t || {})[k]; return t ? Object.values(t).sort().pop() || '' : ''; };
  const myVoted = () => allStates().filter(s => s.mine).sort((a, b) => String(myAt(b.k)).localeCompare(String(myAt(a.k))));
  function votedCap(st){
    const v = st.mine;
    return '<div class="ivcap ivvc"><span class="ivst ' + (v === 'g' ? 'appr' : 'cxl') + '">' + (v === 'g' ? L('You voted Go', '내 투표: 찬성') : L('You voted Pass', '내 투표: 반대')) + '</span>' +
      (st.open ? ' ' + stPill(st.k) : '') + '</div>' + (st.open ? '<div class="ivcap ivmut sm">' + L('Changed your mind? Press the other circle until everyone has voted.', '마음이 바뀌면 모두 투표하기 전까지 다른 동그라미를 누르세요.') + '</div>' : '');
  }
  add('team', ['Team Vote', '팀 투표'], () => {
    const ppl = people(), pick = VS.cwho && ppl.includes(VS.cwho) ? VS.cwho : '';
    const tab = VS.vsub === 'done' ? 'done' : 'to';
    const all = allStates().filter(st => st.open || st.mine);
    const by = st => !pick || st.o.by === pick;
    const to = allStates().filter(needMe).filter(by).sort((a, b) => (VS.corder || 'old') === 'new' ? String(b.o.at).localeCompare(String(a.o.at)) : String(a.o.at).localeCompare(String(b.o.at)));
    const vd = myVoted().filter(by);
    const chip = (v, lab, n) => '<button type="button" class="ivchip' + ((VS.cwho || 'all') === v ? ' on' : '') + '" data-ivset="cwho=' + H(v) + '">' + lab + (n != null ? ' <span>' + n + '</span>' : '') + '</button>';
    const head = '<div class="ivhead"><span class="ivbig">' + allStates().filter(s => s.open).length + '</span><span class="ivkick">' + L('Faces up for the team vote', '팀 투표에 오른 얼굴') + '</span><span class="ivdot"></span>' +
      chip('all', L('Everyone', '모두')) + ppl.map(p => chip(p, capDisc(p) + H(pname(p)), all.filter(s => s.o.by === p).length)).join('') +
      '<span class="ivsp"></span>' + (tab === 'to' ? seg('corder', [['old', L('Oldest first', '오래된 순')], ['new', L('Newest first', '최신 순')]]) : '') + '</div>' +
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
    const L1 = decided('appr'), wait = L1.filter(s => !s.o.conf), done = L1.filter(s => s.o.conf);
    return about('appr', 'The team voted these in. Each waits here for a final confirmation before it goes to the Booking board; whoever confirms is in charge of the booking card. Open a photo to see who voted Go and who voted Pass.', '팀이 찬성한 카드입니다. 최종 확정을 기다렸다가 부킹 보드로 갑니다. 확정한 사람이 그 부킹 카드를 담당합니다. 사진을 열면 누가 찬성/반대했는지 보입니다.') +
      '<div class="ivsec"><h3>' + L('Waiting for final confirmation', '최종 확정 대기') + '</h3><span class="ivpill">' + wait.length + '</span></div>' +
      (wait.length ? '<div class="ivgrid ivtv">' + wait.map(s => '<div class="ivcw">' + mcard(s.k) + resCap(s) + '<button type="button" class="ivbtn pri wide" data-ivconf="' + H(s.k) + '" title="' + H(L('Whoever confirms is in charge of the booking card until it is complete', '확정한 사람이 부킹 카드를 담당합니다')) + '">' + L('Confirm → Booking · I’ll take charge', '확정 → 부킹 · 내가 담당') + '</button></div>').join('') + '</div>' : '<div class="ivempty sm">' + L('Nothing waiting. When the team votes a card in, it lands here.', '대기 중인 카드가 없습니다. 팀이 찬성하면 여기로 옵니다.') + '</div>') +
      (done.length ? '<div class="ivsec"><h3>' + L('Sent to Booking', '부킹으로 보냄') + '</h3><span class="ivpill">' + done.length + '</span></div><div class="ivgrid">' + done.map(s => '<div class="ivcw">' + mcard(s.k) + resCap(s) + '<div class="ivcap">' + capDisc(s.o.conf.by) + ' ' + L('In charge: ', '담당: ') + '<b>' + H(pname(s.o.conf.by)) + '</b> · ' + H(when(s.o.conf.at)) + '</div></div>').join('') + '</div>' : '');
  }, () => decided('appr').filter(s => !s.o.conf).length || '');
  /* Tie-breaker */
  const ties = () => allStates().filter(s => s.open && s.hist.length).sort((a, b) => String(a.hist[0].at).localeCompare(String(b.hist[0].at)));
  add('tie', ['Tie-breaker', '타이브레이커'], () => {
    const list = ties();
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
          (ns.length ? ns.map(n => '<div class="ivnoteln">' + disc(n.p) + '<div><b>' + H(pname(n.p)) + '</b> <span class="ivmut sm">' + H(when(n.at)) + (n.r ? ' · R' + n.r : '') + '</span><div>' + H(n.t) + '</div></div></div>').join('') : '<p class="ivmut sm">' + L('No notes yet. Say why you lean one way.', '아직 메모가 없습니다. 어느 쪽인지 이유를 남겨 주세요.') + '</p>') +
          '<div class="ivrow ivnin"><textarea rows="1" data-ivnotein="' + H(s.k) + '" placeholder="' + H(L('Add a note for the team…', '팀에게 메모 남기기…')) + '"></textarea><button type="button" class="ivbtn" data-ivnote="' + H(s.k) + '">' + L('Post', '올리기') + '</button></div></div></div></section>';
      }).join('') + '</div>' : '<div class="ivempty sm">' + L('No ties to break. When a vote ends level, the card comes here for the team to decide together.', '동점 투표가 없습니다. 투표가 동점으로 끝나면 팀이 함께 정하도록 여기로 옵니다.') + '</div>');
  }, () => ties().length || '');
  /* Cancelled */
  add('cxl', ['Cancelled', '취소'], () => {
    const list = decided('cxl');
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
    const all = waiting().map(x => Object.assign(x, {h: ageH(x.at)}));
    const lateN = all.filter(x => x.h >= 3).length;
    const tf = ['all', 'now', 'today', 'week', 'older'].includes(VS.tf) ? VS.tf : 'all', ts = VS.ts || 'urg', tn = Math.max(24, +VS.tn || 24);
    const inF = (f, x) => f === 'all' ? true : f === 'now' ? x.h >= 3 : f === 'today' ? x.h < 24 : f === 'week' ? x.h < 168 : x.h >= 168;
    let list = all.filter(x => inF(tf, x));
    if(ts === 'new') list.sort((a, b) => a.h - b.h); else list.sort((a, b) => (ts === 'urg' ? ((b.h >= 3) - (a.h >= 3)) : 0) || (b.h - a.h));
    const mineDone = allStates().filter(s => s.open && s.mine).length;
    const chip = (f, lab) => '<button type="button" class="ivtf' + (f === 'now' ? ' hot' : '') + '" data-ivset="tf=' + f + '" aria-pressed="' + (tf === f) + '">' + (f === 'now' ? '<i></i>' : '') + lab + ' <s>' + all.filter(x => inF(f, x)).length + '</s></button>';
    const opt = (v, lab) => '<option value="' + v + '"' + (ts === v ? ' selected' : '') + '>' + lab + '</option>';
    setTimeout(tick, 0);
    const tab = VS.tsub === 'done' ? 'done' : 'to', vd = myVoted(), vn = Math.max(24, +VS.vn || 24);
    const doneH = vd.length ? '<div class="ivgrid tight ivtg">' + vd.slice(0, vn).map(st => '<div class="ivcw">' + mcard(st.k) + votedCap(st) + offBox(st.k, st) + '</div>').join('') + '</div>' +
        (vd.length > vn ? '<button type="button" class="ivmore" data-ivset="vn=' + (vn + 24) + '">' + L('Show ' + Math.min(24, vd.length - vn) + ' more', Math.min(24, vd.length - vn) + '장 더 보기') + '</button>' : '')
      : '<div class="ivempty sm">' + L('You have not voted on anything yet. Vote on a card and it moves here.', '아직 투표한 카드가 없습니다. 투표하면 카드가 여기로 옵니다.') + '</div>';
    return '<section class="ivtoday' + (all.length ? ' glow' : '') + '"><div class="ivrow ivth"><span class="ivbeacon dot"></span><h3>' + L('Waiting for your vote', '내 투표를 기다리는 카드') + '</h3><span class="ivpill gold">' + all.length + '</span><span class="ivsp"></span>' +
      /* a shortcut straight to the Team Vote board (user, 8 Nov 2026) */
      /* 1.2.108 (user, 8 Nov 2026): when the Vote Now banner shows, the Team Vote shortcut sits on it as "Go to Team Vote" */
      (lateN ? '' : '<button type="button" class="ivgo" data-ivgo="team">' + L('Team Vote', '팀 투표') + ' <span aria-hidden="true">→</span></button>') + '</div>' +
      '<p class="ivmut sm ivtnote">' + L('Team: ', '팀: ') + H(people().map(pname).join(', ')) + ' · ' + L('the majority decides; your vote stays private until everyone has voted.', '다수결 · 모두 투표할 때까지 내 선택은 나만 봅니다.') + (mineDone ? ' · ' + L('<b>' + mineDone + '</b> you voted on are waiting for the others.', '내가 투표한 <b>' + mineDone + '</b>건은 다른 사람을 기다립니다.') : '') + '</p>' +
      subTabs('tsub', tab, all.length, vd.length) +
      (lateN ? '<div class="ivnowb"><span class="ivnbi">' + CLKI + '</span><div class="ivnbt"><b>' + L('Vote Now — ' + lateN + (lateN === 1 ? ' card needs' : ' cards need') + ' you', '지금 투표 — ' + lateN + '장이 내 투표를 기다립니다') + '</b><span>' + L('They have waited 3 hours or more. The team can’t decide without you.', '3시간 이상 기다렸습니다. 내 투표가 있어야 팀이 정할 수 있습니다.') + '</span></div><div class="ivnbb"><button type="button" data-ivset="tf=now">' + L('Show them', '보기') + '</button><button type="button" data-ivgo="team">' + L('Go to Team Vote', '팀 투표로 가기') + ' <span aria-hidden="true">→</span></button></div></div>' : '') +
      (tab === 'done' ? doneH : (all.length ? '<div class="ivtbar"><div class="ivtfs">' + chip('all', L('All', '전체')) + chip('now', L('Vote Now', '지금 투표')) + chip('today', L('Today', '오늘')) + chip('week', L('This week', '이번 주')) + chip('older', L('Older', '이전')) + '</div><span class="ivsp"></span>' +
        '<select class="ivts" data-ivsort aria-label="' + H(L('Order', '순서')) + '">' + opt('urg', L('Most urgent first', '급한 순')) + opt('new', L('Newest first', '최신 순')) + opt('old', L('Oldest first', '오래된 순')) + '</select></div>' : '') +
      (list.length ? '<div class="ivgrid tight ivtg">' + list.slice(0, tn).map(x => '<div class="ivcw">' + mcard(x.k) + '</div>').join('') + '</div>' +
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
  window.__illuVoteToggleHook = (el, e) => { const b = e.target.closest('[data-ivset]'); if(b){ const sv = b.dataset.ivset, ix = sv.indexOf('='), kk = sv.slice(0, ix), v = sv.slice(ix + 1); VS[kk] = v; if(kk === 'tf') delete VS.tn; saveVS(); return true; } const ph = e.target.closest('.uc .ucph'); if(ph){ const a = ph.closest('[data-ivk]'); if(a){ openFull(a.dataset.ivk, ph); return true; } } return false; };

  /* ---------- the look ---------- */
  const css = document.createElement('style');
  css.textContent = `
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
})();
