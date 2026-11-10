/* ==================== Compare boards (redesign, 1.2.94) ====================
   The user asked to see several boards at once, with every layout to choose from
   (6 Nov 2026). Up to six boards from any agencies:
   - Side by side: one column per board, 2 or 1 photos across;
   - One mixed grid: every model together, each marked with the board it is on;
   - Rows: one row per board, scrolling sideways.
   For all boards: hide models already lit, only models on 2 or more of the boards,
   and (side by side) scroll the columns together. A model on another of the chosen
   boards says so on the photo ("Also London"). Every card is the same size.
   1.2.103 (user, 7 Nov 2026): the chosen boards sit on one line as small chips; "+ Add a board" opens a
   finder (browse by region and country, Recent, the team's ♥ agencies, or search by agency, city, country or
   board); the three "for all boards" switches are under Options; side by side, each board's column fits as
   many cards as there is room for (S/M/L sets the card size, the same everywhere); a photo opens the card
   right here, over the boards (⤢ full view, the dark x puts it back). Nothing is "lit" any more: the option
   hides the models I have voted on. */
(function(){
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const KEY = 'illu.cmpb';
  const load = () => { try{ return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }catch(e){ return {}; } };
  const st = Object.assign({boards: [], lay: 'side', size: 'm', hideLit: false, multi: false, sync: true, n: 40, recent: []}, load());
  st.n = 40;
  const save = () => { try{ localStorage.setItem(KEY, JSON.stringify({boards: st.boards, lay: st.lay, size: st.size, hideLit: st.hideLit, multi: st.multi, sync: st.sync, recent: st.recent})); }catch(e){} };
  const pk = {tab: 'browse', rg: '', co: '', kind: 'all', sort: 'az', q: '', n: 80};
  const COLORS = ['#6b2a5e', '#2f6f8f', '#8a6a1e', '#3f7d4e', '#9c3d3d', '#5b4f9c'];
  const sq = s => { try{ return window.__illuSB.squash(s); }catch(e){ return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); } };
  const B = () => window.__illuBoards;
  const pane = document.createElement('div');
  pane.id = 'pane-cmpb'; pane.className = 'pane'; pane.hidden = true;
  const IC = {x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    opt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    q: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'};

  /* a chosen board: {k: network key, u: board address} */
  function findBoard(ref){
    const N = B() ? B().nets() : [];
    const n = N.find(x => x.key === ref.k); if(!n) return null;
    const b = n.boards.find(x => String(x.u || '').replace(/\/$/, '') === ref.u) || null;
    return b ? {n, b} : null;
  }
  function label(n, b){
    const city = (b.off && b.off.city) || (n.offices[0] && n.offices[0].city) || '';
    return {ag: n.name, city, board: b.d || (b.g === 'M' ? L('men', '남성') : b.g === 'F' ? L('women', '여성') : L('board', '보드'))};
  }
  /* the kind of board, for the finder's chips: new faces, development, men, women */
  const kindOf = b => b.t === 'newfaces' || /new\s*face/i.test(b.d || '') ? 'new' : b.t === 'development' || /develop/i.test(b.d || '') ? 'dev' : (b.g === 'M' || /(^|\W)(men|male|man)(\W|$)/i.test(b.d || '')) ? 'men' : 'women';
  const KINDS = [['all', 'All boards', '전체 보드'], ['women', 'Women', '여성'], ['men', 'Men', '남성'], ['new', 'New faces', '뉴 페이스'], ['dev', 'Development', '디벨롭먼트']];
  function modelsFor(n, b){
    const o = n.offices[0] || {};
    try{ return B().modelsOf({name: n.name, city: (b.off && b.off.city) || o.city || '', country: (b.off && b.off.country) || o.country || '', domain: n.domain}, [b]).filter(m => { try{ return !isMinor(m.key); }catch(e){ return true; } }); }catch(e){ return []; }
  }
  /* the same model: the same name at the same agency (two agencies can each have an "Alina") */
  const idOf = (m, s) => { const n = sq(m.nm); return n ? n + '|' + s.n.key : ''; };
  const voted = k => { try{ return !!(window.__illuVoteMine && window.__illuVoteMine(k)); }catch(e){ return false; } };
  function data(){
    const sel = st.boards.map(findBoard).map((x, i) => x ? Object.assign(x, {i, ref: st.boards[i], c: COLORS[i % COLORS.length], lab: label(x.n, x.b)}) : null).filter(Boolean);
    for(const s of sel) s.ms = modelsFor(s.n, s.b);
    /* who is on more than one of these boards, by name */
    const on = new Map();
    for(const s of sel) for(const m of s.ms){ const k = idOf(m, s); if(!k) continue; if(!on.has(k)) on.set(k, new Set()); on.get(k).add(s.i); }
    for(const s of sel) s.show = s.ms.filter(m => (!st.hideLit || !voted(m.key)) && (!st.multi || (on.get(idOf(m, s)) || new Set()).size > 1));
    return {sel, on};
  }
  let MODELS = new Map();
  function tile(m, s, D, mixed){
    const others = [...(D.on.get(idOf(m, s)) || [])].filter(i => i !== s.i).map(i => D.sel.find(x => x.i === i)).filter(Boolean);
    /* Mixed shows a model once, even when she is on several of the chosen boards (user, 8 Nov 2026):
       one dot per board, and the boards named on the photo */
    const also = mixed ? (others.length ? '<em class="cbalso" title="' + H([s].concat(others).map(o => o.lab.board || o.lab.ag).join(' + ')) + '">' + H(L('On ' + (others.length + 1) + ' boards', (others.length + 1) + '개 보드')) + '</em>' : '')
      : others.length ? '<em class="cbalso">' + H(L('Also ', '다른 보드: ') + others.map(o => o.lab.board || o.lab.ag).join(', ')) + '</em>' : '';
    const dot = mixed ? '<span class="cbdots">' + [s].concat(others).map(o => '<i style="background:' + o.c + '"></i>').join('') + '</span>' : '';
    let h = '';
    try{ h = window.__illuCard(m); }catch(e){ h = ''; }
    if(!h) return '';
    MODELS.set(m.key, m);
    return h.replace('<article class="uc"', '<article class="uc" data-cbkey="' + H(m.key) + '"').replace('<div class="ucov">', also + dot + '<div class="ucov">');
  }
  const colHead = s => '<div class="cbch"><i style="background:' + s.c + '"></i><b>' + H(s.lab.ag) + '</b><span>' + H([s.lab.city, s.lab.board].filter(Boolean).join(' · ') + ' · ' + (s.show.length !== s.ms.length ? s.show.length + ' / ' : '') + s.ms.length) + '</span></div>';
  function render(){
    if(pane.hidden) return;
    const D = data();
    MODELS = new Map();
    const nOpt = (st.hideLit ? 1 : 0) + (st.multi ? 1 : 0);
    let h = '<div class="cbbar"><div class="cbchips">' + D.sel.map(s => '<span class="cbchip" title="' + H(s.lab.ag + ' · ' + s.lab.board) + '"><i style="background:' + s.c + '"></i><span class="cbct"><b>' + H(s.lab.ag) + '</b><span>' + H([s.lab.city, s.lab.board].filter(Boolean).join(' · ') + ' · ' + s.ms.length) + '</span></span><button type="button" data-cbrm="' + s.i + '" aria-label="' + H(L('Remove this board', '이 보드 빼기')) + '">' + IC.x + '</button></span>').join('') +
      (st.boards.length < 6 ? '<button type="button" class="cbadd" data-cbadd aria-haspopup="dialog">+ ' + L('Add a board', '보드 추가') + '</button>' : '') + '</div>' +
      '<div class="cbtools"><div class="cbseg" role="group" aria-label="' + H(L('Layout', '보기')) + '">' +
      [['side', 'Columns', '열'], ['mix', 'Mixed', '섞어서'], ['rows', 'Rows', '줄']].map(([k, en, ko]) => '<button type="button" data-cblay="' + k + '" aria-pressed="' + (st.lay === k) + '">' + L(en, ko) + '</button>').join('') + '</div>' +
      '<div class="cbseg" role="group" aria-label="' + H(L('Card size', '카드 크기')) + '">' + [['s', 'Small cards', '작은 카드'], ['m', 'Medium cards', '중간 카드'], ['l', 'Large cards', '큰 카드']].map(([k, en, ko]) => '<button type="button" data-cbsize="' + k + '" aria-pressed="' + (st.size === k) + '" title="' + H(L(en, ko)) + '">' + k.toUpperCase() + '</button>').join('') + '</div>' +
      '<button type="button" class="cbib" data-cbopt aria-haspopup="true">' + IC.opt + '<span class="cblab">' + L('Options', '옵션') + '</span>' + (nOpt ? '<span class="cbn">' + nOpt + '</span>' : '') + '</button></div></div>';
    h += '<div class="cbpov" id="cbpov" hidden></div>';
    let body;
    if(!D.sel.length){
      body = '<div class="cbempty"><b>' + L('Pick the boards to compare', '비교할 보드를 고르세요') + '</b><p>' + L('Press “+ Add a board”. Browse by region and country, see the boards you used before, or search by agency, city, country or board. Up to six.', '“+ 보드 추가”를 누르세요. 지역·국가로 둘러보거나, 전에 쓴 보드를 보거나, 에이전시·도시·국가·보드 이름으로 찾을 수 있습니다. 최대 6개.') + '</p></div>';
    }else if(st.lay === 'side'){
      body = '<div class="cbcols' + (st.sync ? ' sync' : '') + '" style="--cbn:' + D.sel.length + '">' + D.sel.map(s =>
        '<section class="cbcol">' + colHead(s) + '<div class="cbg">' + s.show.slice(0, st.n).map(m => tile(m, s, D, false)).join('') +
        (s.show.length > st.n ? '<button type="button" class="cbmore" data-cbmore>' + L('Show more', '더 보기') + '</button>' : '') + '</div></section>').join('') + '</div>';
    }else if(st.lay === 'rows'){
      body = '<div class="cbrows">' + D.sel.map(s => '<section class="cbrow">' + colHead(s) + '<div class="cbr">' + s.show.slice(0, st.n).map(m => tile(m, s, D, false)).join('') + '</div></section>').join('') + '</div>';
    }else{
      /* mixed: take the boards in turn so every board is seen from the top */
      const all = [], max = Math.max(...D.sel.map(s => s.show.length));
      const seen = new Set();
      for(let j = 0; j < max && all.length < st.n * D.sel.length; j++) for(const s of D.sel){ const m = s.show[j]; if(!m) continue; const id = idOf(m, s) || m.key; if(seen.has(id)) continue; seen.add(id); all.push([m, s]); }
      body = '<div class="cbmix">' + all.map(([m, s]) => tile(m, s, D, true)).join('') + '</div>' + (D.sel.some(s => s.show.length > st.n) ? '<button type="button" class="cbmore" data-cbmore>' + L('Show more', '더 보기') + '</button>' : '');
    }
    h += '<div class="cbbody" data-size="' + st.size + '">' + body + '</div>';
    if(pane.__h !== h){
      const pov = pane.querySelector('#cbpov'), keep = pov && !pov.hidden ? {html: pov.innerHTML, kind: pov.dataset.kind, q: (pov.querySelector('#cbq') || {}).value} : null;
      const solo = pane.querySelector('.d2solo');
      const tops = [...pane.querySelectorAll('.cbg')].map(g => g.scrollTop);
      pane.__h = h; pane.innerHTML = h;
      if(solo) pane.appendChild(solo);                       /* an open card stays open */
      pane.querySelectorAll('.cbg').forEach((g, i) => { if(tops[i]) g.scrollTop = tops[i]; });
      if(keep){ if(keep.kind === 'add') finder(true); else options(); }
    }
    fit();
  }
  /* the columns fill the window below the bar; each scrolls on its own (or together) */
  function fit(){
    const b = pane.querySelector('.cbbody'); if(!b) return;
    const top = b.getBoundingClientRect().top;
    b.style.setProperty('--cbh', Math.max(320, Math.round(innerHeight - top - 14)) + 'px');
  }
  addEventListener('resize', () => { if(!pane.hidden) fit(); });

  /* ---------- the board finder ---------- */
  let FIND = null;
  function finderData(){
    const N = B() ? B().nets().filter(n => !B().removed(n) && n.boards.length) : [];
    const favBy = new Map(), openBy = new Map();
    try{ const V = window.__illuVoteData && window.__illuVoteData(); if(V) for(const m of V.fav.values()) for(const k of m.keys()){ let ag = ''; try{ const i = keyInfo(k); ag = i && i.ag; }catch(e){} if(!ag){ const x = m.get(k); ag = x && x.ag; } if(ag){ const a = sq(ag); favBy.set(a, (favBy.get(a) || 0) + 1); } } }catch(e){}
    try{ for(const r of allRows()) if(r.kind === 'agency'){ const a = sq(r.name); openBy.set(a, (openBy.get(a) || 0) + (r.n || 1)); } }catch(e){}
    return N.map(n => { const o = n.offices[0] || {}; const nm = sq(n.name);
      const rg = o.region && o.region !== 'Unknown' ? o.region : (typeof REGION !== 'undefined' && REGION[o.country]) || 'Unknown';
      return {n, city: o.city || '', co: o.country || '', rg, fav: favBy.get(nm) || 0, op: openBy.get(nm) || 0, size: n.boards.reduce((t, b) => t + ((b.m || []).length), 0),
        hay: [n.name, ...n.offices.map(x => x.city + ' ' + x.country), ...n.boards.map(b => b.d || '')].join(' ').toLowerCase()}; });
  }
  const RGO = ['Europe', 'North America', 'South America', 'Asia', 'Oceania', 'Africa', 'Middle East', 'Unknown'];
  const rgL = r => r === 'Unknown' ? L('Region not stated', '지역 미상') : r;
  function finderBody(){
    if(!FIND) FIND = finderData();
    const t = pk.q.trim().toLowerCase();
    const kOK = b => pk.kind === 'all' || kindOf(b) === pk.kind;
    const all = FIND.filter(x => x.n.boards.some(kOK));
    const mark = v => { v = String(v || ''); if(!t) return H(v); const i = v.toLowerCase().indexOf(t); return i < 0 ? H(v) : H(v.slice(0, i)) + '<mark>' + H(v.slice(i, i + t.length)) + '</mark>' + H(v.slice(i + t.length)); };
    const sortF = (x, y) => pk.sort === 'big' ? y.size - x.size : pk.sort === 'fav' ? (y.fav - x.fav) || (y.op - x.op) || x.n.name.localeCompare(y.n.name) : x.n.name.localeCompare(y.n.name);
    const row = (x, only) => '<div class="cbfr"><div class="cbfh"><b>' + mark(x.n.name) + '</b><span>' + mark([x.city, x.co].filter(Boolean).join(', ')) + '</span><em>' +
      (x.fav ? '<i class="cbfv" title="' + H(L('Models the team put in Favorites', '팀이 즐겨찾기한 모델')) + '">♥ ' + x.fav + '</i>' : '') + (x.op ? '<i title="' + H(L('Times opened in the Directory', 'Directory에서 연 횟수')) + '">' + L('opened ', '열람 ') + x.op + '×</i>' : '') + '</em></div><div class="cbfbs">' +
      x.n.boards.filter(b => kOK(b) && (!only || only.has(String(b.u || '').replace(/\/$/, '')))).map(b => { const u = String(b.u || '').replace(/\/$/, ''); const on = st.boards.some(r => r.k === x.n.key && r.u === u);
        return '<button type="button" data-cbpk="' + H(x.n.key) + '" data-cbpu="' + H(u) + '"' + (on || st.boards.length >= 6 ? ' disabled' : '') + '><span class="cbk k-' + kindOf(b) + '"></span>' + mark(label(x.n, b).board) + ' <s>' + (b.m || []).length + '</s>' + (on ? ' ✓' : '') + '</button>'; }).join('') + '</div></div>';
    const lst = (arr, head) => '<div class="cbfl wide">' + (head ? '<div class="cbplab">' + head + '</div>' : '') + (arr.length ? arr.slice(0, pk.n).map(x => row(x)).join('') + (arr.length > pk.n ? '<button type="button" class="cbmore" data-cbfmore>' + L('Show more', '더 보기') + ' (' + (arr.length - pk.n) + ')</button>' : '') : '<p class="cbmut">' + L('Nothing here with that kind of board.', '그런 보드가 없습니다.') + '</p>') + '</div>';
    const kl = pk.kind !== 'all' ? (KINDS.find(k => k[0] === pk.kind) || [])[1] : '';
    if(t){
      const r = all.filter(x => x.hay.includes(t)).sort(sortF);
      return lst(r, r.length + L(' agencies match “', '개 에이전시 · “') + H(pk.q) + L('”', '”') + (kl ? ' · ' + H(L(kl + ' boards only', kl + ' 보드만')) + ' <button type="button" class="cblink" data-cbkind="all">' + L('Show all boards', '모든 보드 보기') + '</button>' : ''));
    }
    if(pk.tab === 'recent'){
      const rec = st.recent.slice().reverse(), seen = new Set(), out = [];
      for(const r of rec){ if(seen.has(r.k)) continue; const x = all.find(y => y.n.key === r.k); if(!x) continue; seen.add(r.k); out.push(row(x, new Set(rec.filter(z => z.k === r.k).map(z => z.u)))); }
      const most = all.filter(x => x.op).sort((x, y) => y.op - x.op).slice(0, 8);
      return '<div class="cbfl wide"><div class="cbplab">' + L('Boards you compared before', '전에 비교한 보드') + '</div>' + (out.join('') || '<p class="cbmut">' + L('None yet — the boards you add will be kept here.', '아직 없습니다 — 추가한 보드가 여기에 남습니다.') + '</p>') +
        '<div class="cbplab">' + L('Agencies opened most in the Directory', 'Directory에서 가장 많이 연 에이전시') + '</div>' + (most.map(x => row(x)).join('') || '<p class="cbmut">—</p>') + '</div>';
    }
    if(pk.tab === 'fav') return lst(all.filter(x => x.fav).sort((x, y) => y.fav - x.fav || y.op - x.op), L('Agencies with models the team ♥', '팀이 ♥한 모델이 있는 에이전시'));
    const rgs = RGO.filter(r => all.some(x => x.rg === r)).concat([...new Set(all.map(x => x.rg))].filter(r => !RGO.includes(r)));
    if(!pk.rg || !rgs.includes(pk.rg)) pk.rg = rgs[0] || '';
    const inR = all.filter(x => x.rg === pk.rg);
    const cos = [...new Set(inR.map(x => x.co || ''))].sort((a, b) => (a ? 0 : 1) - (b ? 0 : 1) || a.localeCompare(b));
    if(pk.co && !cos.includes(pk.co)) pk.co = '';
    const list = inR.filter(x => !pk.co || x.co === pk.co).sort(sortF);
    return '<div class="cbtree">' + rgs.map(r => '<button type="button" class="cbtr' + (r === pk.rg ? ' on' : '') + '" data-cbrg="' + H(r) + '">' + H(rgL(r)) + '<s>' + all.filter(x => x.rg === r).length + '</s></button>' +
      (r === pk.rg ? '<div class="cbtcos"><button type="button" class="cbtc' + (!pk.co ? ' on' : '') + '" data-cbco="">' + L('All countries', '모든 국가') + '<s>' + inR.length + '</s></button>' + cos.map(c => '<button type="button" class="cbtc' + (c === pk.co ? ' on' : '') + '" data-cbco="' + H(c) + '">' + H(c || L('Country not stated', '국가 미상')) + '<s>' + inR.filter(x => x.co === c).length + '</s></button>').join('') + '</div>' : '')).join('') + '</div>' +
      lst(list, '').replace('cbfl wide', 'cbfl');
  }
  function finder(keep){
    const box = pane.querySelector('#cbpov'); if(!box) return;
    if(!keep){ FIND = null; pk.n = 80; }
    box.hidden = false; box.dataset.kind = 'add'; box.className = 'cbpov cbfind';
    box.innerHTML = '<div class="cbfhd"><div class="cbsr">' + IC.q + '<input type="text" id="cbq" placeholder="' + H(L('Agency, city, country or board…', '에이전시, 도시, 국가 또는 보드…')) + '" autocomplete="off" value="' + H(pk.q) + '" aria-label="' + H(L('Search agencies', '에이전시 찾기')) + '"></div><button type="button" class="cbib" data-cbpx>' + L('Done', '완료') + '</button></div>' +
      '<div class="cbftabs"><div class="cbseg" role="group">' + [['browse', 'Browse', '둘러보기'], ['recent', 'Recent', '최근'], ['fav', 'Team ♥', '팀 ♥']].map(([k, en, ko]) => '<button type="button" data-cbtab="' + k + '" aria-pressed="' + (pk.tab === k && !pk.q.trim()) + '">' + L(en, ko) + '</button>').join('') + '</div>' +
      '<div class="cbkinds">' + KINDS.map(([k, en, ko]) => '<button type="button" data-cbkind="' + k + '" aria-pressed="' + (pk.kind === k) + '">' + (k === 'all' ? '' : '<span class="cbk k-' + k + '"></span>') + L(en, ko) + '</button>').join('') + '</div>' +
      '<label class="cbsort">' + L('Sort', '정렬') + ' <select id="cbsort"><option value="az"' + (pk.sort === 'az' ? ' selected' : '') + '>A–Z</option><option value="big"' + (pk.sort === 'big' ? ' selected' : '') + '>' + L('Most models', '모델 많은 순') + '</option><option value="fav"' + (pk.sort === 'fav' ? ' selected' : '') + '>' + L('Team ♥', '팀 ♥') + '</option></select></label></div>' +
      '<div class="cbfbody" id="cbfbody">' + finderBody() + '</div>';
    place(box, pane.querySelector('[data-cbadd]') || pane.querySelector('.cbchips'), 760);
    if(!keep) setTimeout(() => { const i = box.querySelector('#cbq'); if(i) i.focus(); }, 0);
  }
  function finderRefresh(){ const b = pane.querySelector('#cbfbody'); if(!b) return; const y = b.scrollTop; b.innerHTML = finderBody(); b.scrollTop = y;
    pane.querySelectorAll('[data-cbtab]').forEach(x => x.setAttribute('aria-pressed', pk.tab === x.dataset.cbtab && !pk.q.trim()));
    pane.querySelectorAll('[data-cbkind]').forEach(x => x.setAttribute('aria-pressed', pk.kind === x.dataset.cbkind)); }
  function options(){
    const box = pane.querySelector('#cbpov'); if(!box) return;
    box.hidden = false; box.dataset.kind = 'opt'; box.className = 'cbpov cbopts';
    box.innerHTML = '<div class="cbplab">' + L('For all boards', '모든 보드에') + '</div>' +
      [['hideLit', 'Hide models I’ve voted on', '내가 투표한 모델 숨기기'], ['multi', 'Only models on 2+ of these boards', '2개 이상 보드에 있는 모델만'], ['sync', 'Scroll columns together', '열 함께 스크롤']].map(([k, en, ko]) => '<button type="button" class="cbopt" data-cbtog="' + k + '" aria-pressed="' + !!st[k] + '"><span class="cbsw"></span>' + L(en, ko) + '</button>').join('');
    const a = pane.querySelector('[data-cbopt]'); place(box, a, 300, true);
  }
  function place(box, a, w, right){
    const P = pane.getBoundingClientRect(), R = a ? a.getBoundingClientRect() : P;
    const width = Math.min(w, P.width - 8);
    box.style.width = width + 'px';
    box.style.top = (R.bottom - P.top + 6) + 'px';
    const x = right ? R.right - P.left - width : R.left - P.left;
    box.style.left = Math.max(4, Math.min(x, P.width - width - 4)) + 'px';
    box.style.maxHeight = Math.max(260, innerHeight - R.bottom - 16) + 'px';
  }
  const closePov = () => { const b = pane.querySelector('#cbpov'); if(b){ b.hidden = true; b.innerHTML = ''; b.dataset.kind = ''; } };

  pane.addEventListener('input', e => { if(e.target.id === 'cbq'){ pk.q = e.target.value; pk.n = 80; finderRefresh(); } });
  pane.addEventListener('change', e => { if(e.target.id === 'cbsort'){ pk.sort = e.target.value; finderRefresh(); } });
  pane.addEventListener('click', e => {
    if(e.target.closest('.d2solo')) return;                  /* the open card handles its own clicks */
    if(e.target.closest('.uc .vmk')) return;                 /* ♥ and the votes: handled by the card itself */
    const ph = e.target.closest('.uc .ucph');
    if(ph){ const a = ph.closest('.uc'); const m = MODELS.get(a.dataset.cbkey); if(m && window.__illuCardOpen){ e.preventDefault(); closePov(); window.__illuCardOpen(m); } return; }
    const t = e.target.closest('button'); const pov = pane.querySelector('#cbpov');
    if(!t){ if(pov && !pov.hidden && !e.target.closest('#cbpov')) closePov(); return; }
    const d = t.dataset;
    if(d.cblay){ st.lay = d.cblay; st.n = 40; save(); render(); return; }
    if(d.cbsize){ st.size = d.cbsize; save(); render(); return; }
    if(t.hasAttribute('data-cbopt')){ if(pov && pov.dataset.kind === 'opt' && !pov.hidden) closePov(); else options(); return; }
    if(d.cbtog){ st[d.cbtog] = !st[d.cbtog]; t.setAttribute('aria-pressed', !!st[d.cbtog]); save(); pane.__h = ''; render(); return; }
    if(d.cbrm != null){ st.boards.splice(+d.cbrm, 1); save(); render(); return; }
    if(t.hasAttribute('data-cbadd')){ if(pov && pov.dataset.kind === 'add' && !pov.hidden) closePov(); else finder(false); return; }
    if(t.hasAttribute('data-cbpx')){ closePov(); return; }
    if(d.cbtab){ pk.tab = d.cbtab; pk.q = ''; pk.n = 80; const q = pane.querySelector('#cbq'); if(q) q.value = ''; finderRefresh(); return; }
    if(d.cbkind){ pk.kind = d.cbkind; pk.n = 80; finderRefresh(); return; }
    if(d.cbrg != null){ pk.rg = d.cbrg; pk.co = ''; pk.n = 80; finderRefresh(); return; }
    if(d.cbco != null){ pk.co = d.cbco; pk.n = 80; finderRefresh(); return; }
    if(t.hasAttribute('data-cbfmore')){ pk.n += 80; finderRefresh(); return; }
    if(d.cbpk){ if(st.boards.length < 6 && !st.boards.some(x => x.k === d.cbpk && x.u === d.cbpu)){ st.boards.push({k: d.cbpk, u: d.cbpu}); st.recent = st.recent.filter(x => !(x.k === d.cbpk && x.u === d.cbpu)).concat([{k: d.cbpk, u: d.cbpu}]).slice(-24); save(); }
      render(); if(st.boards.length >= 6) closePov(); else { const p = pane.querySelector('#cbpov'); if(p && p.hidden) finder(true); else { finderRefresh(); place(p, pane.querySelector('[data-cbadd]') || pane.querySelector('.cbchips'), 760); } } return; }
    if(t.hasAttribute('data-cbmore')){ st.n += 40; render(); return; }
    if(pov && !pov.hidden && !e.target.closest('#cbpov')) closePov();
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !pane.hidden && !document.querySelector('#pane-cmpb .d2solo')){ const p = pane.querySelector('#cbpov'); if(p && !p.hidden){ e.preventDefault(); closePov(); } } });
  document.addEventListener('pointerdown', e => { if(pane.hidden) return; const p = pane.querySelector('#cbpov'); if(p && !p.hidden && !e.target.closest('#cbpov') && !e.target.closest('[data-cbadd],[data-cbopt]')) closePov(); }, true);
  /* scroll the side-by-side columns together */
  let syncing = false;
  pane.addEventListener('scroll', e => {
    if(!st.sync || syncing || !e.target.classList || !e.target.classList.contains('cbg')) return;
    syncing = true; const y = e.target.scrollTop;
    pane.querySelectorAll('.cbcols.sync .cbg').forEach(g => { if(g !== e.target) g.scrollTop = y; });
    requestAnimationFrame(() => { syncing = false; });
  }, true);
  try{ new MutationObserver(() => { if(!pane.hidden){ pane.__h = ''; render(); } }).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']}); }catch(e){}
  try{ new MutationObserver(() => { if(pane.hidden && pane.querySelector('.d2solo') && window.__illuCardReset) window.__illuCardReset(); }).observe(pane, {attributes: true, attributeFilter: ['hidden']}); }catch(e){}
  window.__illuCmpb = {st, render, data, pk, finder: () => finder(false)};

  function mount(){
    const ref = document.getElementById('pane-arr');
    if(!ref || !window.__illuShellAdd){ setTimeout(mount, 200); return; }
    ref.parentNode.insertBefore(pane, ref);
    window.__illuShellAdd('cmpb', {label: ['Compare boards', '보드 비교'], el: pane, count: () => st.boards.length || '', show: () => { pane.__h = ''; render(); }});
  }
  mount();

  const css = document.createElement('style');
  css.textContent = `
#pane-cmpb{position:relative;padding:8px 0 0;display:flex;flex-direction:column;gap:8px;font-family:var(--sans,Inter,system-ui,sans-serif);color:var(--ink)}
#pane-cmpb[hidden]{display:none}
#pane-cmpb > :not(.d2solo) button{font:inherit;color:inherit;cursor:pointer}
#pane-cmpb > :not(.d2solo) svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}
#pane-cmpb .cbbar{display:flex;align-items:center;gap:8px;min-width:0}
#pane-cmpb .cbchips{display:flex;align-items:center;gap:6px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}
#pane-cmpb .cbchips::-webkit-scrollbar{display:none}
#pane-cmpb .cbchip{flex:none;display:inline-flex;align-items:center;gap:7px;height:34px;max-width:270px;padding:0 4px 0 10px;border:1px solid var(--line);border-radius:9px;background:var(--surf)}
#pane-cmpb .cbchip > i{width:8px;height:8px;border-radius:50%;flex:none}
#pane-cmpb .cbct{display:flex;flex-direction:column;line-height:1.15;min-width:0}
#pane-cmpb .cbct b{font-size:11.5px;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pane-cmpb .cbct span{font-size:11px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pane-cmpb .cbchip button{width:24px;height:24px;border:0;border-radius:6px;background:none;color:var(--faint);display:grid;place-items:center;flex:none}
#pane-cmpb .cbchip button:hover{background:var(--surf2,#f4ecf2);color:var(--ink)}
#pane-cmpb .cbadd{flex:none;height:34px;border:1px dashed color-mix(in srgb,var(--acc) 55%,var(--line));background:color-mix(in srgb,var(--acc) 7%,var(--surf));color:var(--acc)!important;border-radius:9px;padding:0 12px;font-size:12.5px!important;font-weight:600;white-space:nowrap}
#pane-cmpb .cbtools{display:flex;align-items:center;gap:6px;flex:none}
#pane-cmpb .cbseg{display:inline-flex;background:var(--surf2,#f4ecf2);border:1px solid var(--line);border-radius:10px;padding:3px;gap:2px;flex:none}
#pane-cmpb .cbseg button{border:0;background:none;font-size:12.5px;font-weight:600;color:var(--faint)!important;padding:0 10px;border-radius:7px;min-height:28px;white-space:nowrap}
#pane-cmpb .cbseg button[aria-pressed="true"]{background:var(--surf);color:var(--ink)!important;box-shadow:0 1px 3px rgba(20,10,30,.14)}
#pane-cmpb .cbib{height:34px;border:1px solid var(--line);background:var(--surf);border-radius:9px;padding:0 10px;font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
#pane-cmpb .cbn{background:var(--acc);color:#fff;border-radius:999px;font-size:10.5px;min-width:17px;height:17px;display:inline-grid;place-items:center;padding:0 4px}
#pane-cmpb .cbmut{font-size:12.5px;color:var(--faint)}
#pane-cmpb .cbempty{background:var(--surf);border:1px dashed var(--line);border-radius:14px;padding:40px;text-align:center}
#pane-cmpb .cbempty p{color:var(--faint);margin:6px auto 0;max-width:520px}
#pane-cmpb .cbmore{grid-column:1/-1;justify-self:center;align-self:center;height:32px;border:1px solid var(--line);background:var(--surf);border-radius:999px;padding:0 14px;font-size:12.5px;font-weight:600;margin:6px 0}
/* the boards */
#pane-cmpb .cbbody{--cw:180px}
#pane-cmpb .cbbody[data-size="s"]{--cw:148px}#pane-cmpb .cbbody[data-size="l"]{--cw:224px}
#pane-cmpb .cbcols{height:var(--cbh,70vh);display:grid;grid-template-columns:repeat(var(--cbn),minmax(0,1fr));gap:10px}
#pane-cmpb .cbcol{min-width:0;min-height:0;display:flex;flex-direction:column;background:color-mix(in srgb,var(--surf2,#f4ecf2) 70%,transparent);border-radius:12px}
#pane-cmpb .cbch{flex:none;display:flex;align-items:center;gap:8px;padding:8px 12px 6px;font-size:11.5px;min-width:0}
#pane-cmpb .cbch i{width:8px;height:8px;border-radius:50%;flex:none}
#pane-cmpb .cbch b{letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:none;max-width:60%}
#pane-cmpb .cbch span{color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
#pane-cmpb .cbg{flex:1;min-height:0;overflow:auto;padding:4px 10px 10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--cw),1fr));grid-auto-rows:max-content;gap:10px;align-content:start}
#pane-cmpb .cbrows{display:flex;flex-direction:column;gap:10px;max-height:var(--cbh,70vh);overflow:auto}
#pane-cmpb .cbrow{background:color-mix(in srgb,var(--surf2,#f4ecf2) 70%,transparent);border-radius:12px;padding-bottom:10px}
#pane-cmpb .cbr{display:grid;grid-auto-flow:column;grid-auto-columns:var(--cw);gap:10px;overflow-x:auto;padding:4px 10px}
#pane-cmpb .cbmix{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--cw),1fr));grid-auto-rows:max-content;gap:12px;padding:4px}
#pane-cmpb .uc{min-width:0}
#pane-cmpb .uc .ucph{cursor:zoom-in}
#pane-cmpb .cbalso{position:absolute;z-index:2;left:8px;top:8px;max-width:calc(100% - 60px);font-style:normal;font-size:11px;font-weight:700;background:rgba(255,255,255,.92);color:var(--acc);border-radius:6px;padding:2px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pane-cmpb .cbdots{position:absolute;z-index:2;top:8px;right:8px;display:flex;gap:3px}
#pane-cmpb .cbdots i{width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-sizing:border-box}
/* popovers: the finder and Options */
#pane-cmpb .cbpov{position:absolute;z-index:40;background:var(--surf);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 44px rgba(20,10,30,.22);padding:10px;display:flex;flex-direction:column;gap:4px;overflow:hidden}
#pane-cmpb .cbpov[hidden]{display:none}
#pane-cmpb .cbplab{font-size:10.5px;letter-spacing:.1em;font-weight:700;color:var(--faint);padding:8px 4px 2px;text-transform:uppercase}
#pane-cmpb .cbplab .cblink{text-transform:none;letter-spacing:0}
#pane-cmpb .cblink{border:0;background:none;color:var(--acc)!important;font-weight:600;font-size:12px;padding:0 4px}
#pane-cmpb .cbopt{display:flex;align-items:center;gap:10px;padding:8px 6px;border-radius:8px;font-size:13px;width:100%;border:0;background:none;text-align:left}
#pane-cmpb .cbopt:hover{background:var(--surf2,#f4ecf2)}
#pane-cmpb .cbsw{width:30px;height:18px;border-radius:999px;background:var(--line);position:relative;flex:none;transition:background .15s}
#pane-cmpb .cbsw::after{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .15s}
#pane-cmpb .cbopt[aria-pressed="true"] .cbsw{background:var(--acc)}
#pane-cmpb .cbopt[aria-pressed="true"] .cbsw::after{transform:translateX(12px)}
#pane-cmpb .cbfind{padding:0}
#pane-cmpb .cbfhd{display:flex;gap:8px;padding:10px 10px 6px}
#pane-cmpb .cbsr{position:relative;flex:1}
#pane-cmpb .cbsr svg{position:absolute;left:10px;top:11px;color:var(--faint)}
#pane-cmpb .cbsr input{width:100%;box-sizing:border-box;height:36px;border:1px solid var(--line);border-radius:9px;padding:0 10px 0 32px;font:inherit;font-size:13.5px;background:var(--surf2,#f4ecf2);color:var(--ink)}
#pane-cmpb .cbftabs{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:0 10px 8px;border-bottom:1px solid var(--line)}
#pane-cmpb .cbkinds{display:flex;gap:4px;flex-wrap:wrap}
#pane-cmpb .cbkinds button{border:1px solid var(--line);background:var(--surf);border-radius:999px;padding:4px 10px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:5px;color:var(--faint)!important;white-space:nowrap;flex:none}
#pane-cmpb .cbkinds button[aria-pressed="true"]{background:color-mix(in srgb,var(--acc) 10%,var(--surf));border-color:var(--acc);color:var(--acc)!important}
#pane-cmpb .cbsort{margin-left:auto;font-size:12px;color:var(--faint);display:inline-flex;align-items:center;gap:6px}
#pane-cmpb .cbsort select{height:28px;border:1px solid var(--line);border-radius:8px;background:var(--surf);color:var(--ink);font:inherit;font-size:12px;padding:0 6px}
#pane-cmpb .cbk{width:8px;height:8px;border-radius:2px;display:inline-block;flex:none}
#pane-cmpb .k-women{background:#c2557a}#pane-cmpb .k-men{background:#3d6fb0}#pane-cmpb .k-new{background:#d79a1f}#pane-cmpb .k-dev{background:#3f8a5c}
#pane-cmpb .cbfbody{flex:1;min-height:0;display:grid;grid-template-columns:210px minmax(0,1fr);overflow:hidden}
#pane-cmpb .cbtree{border-right:1px solid var(--line);overflow:auto;padding:8px 6px;display:flex;flex-direction:column;gap:2px;background:color-mix(in srgb,var(--surf2,#f4ecf2) 60%,transparent)}
#pane-cmpb .cbtr,#pane-cmpb .cbtc{border:0;background:none;text-align:left;border-radius:8px;display:flex;align-items:center;gap:8px;padding:7px 9px;font-size:13px;font-weight:600}
#pane-cmpb .cbtr s,#pane-cmpb .cbtc s{text-decoration:none;margin-left:auto;font-size:11.5px;color:var(--faint);font-weight:500;font-variant-numeric:tabular-nums}
#pane-cmpb .cbtr.on{background:var(--surf);box-shadow:0 1px 3px rgba(20,10,30,.1)}
#pane-cmpb .cbtcos{display:flex;flex-direction:column;gap:1px;padding:2px 0 6px 10px}
#pane-cmpb .cbtc{font-weight:500;padding:5px 9px;font-size:12.5px;color:var(--faint)!important}
#pane-cmpb .cbtc.on{color:var(--acc)!important;background:color-mix(in srgb,var(--acc) 10%,transparent)}
#pane-cmpb .cbfl{overflow:auto;padding:4px 12px 12px;display:flex;flex-direction:column}
#pane-cmpb .cbfl.wide{grid-column:1/-1}
#pane-cmpb .cbfr{padding:8px 2px;border-bottom:1px solid var(--line)}
#pane-cmpb .cbfh{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
#pane-cmpb .cbfh b{font-size:13px}#pane-cmpb .cbfh span{font-size:12px;color:var(--faint)}
#pane-cmpb .cbfh em{margin-left:auto;font-style:normal;font-size:11.5px;color:var(--faint);display:inline-flex;gap:8px}
#pane-cmpb .cbfh em i{font-style:normal}#pane-cmpb .cbfv{color:#D5536B}
#pane-cmpb .cbfbs{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
#pane-cmpb .cbfbs button{height:28px;border:1px solid var(--line);border-radius:8px;background:var(--surf);font-size:12px;padding:0 9px;display:inline-flex;align-items:center;gap:6px}
#pane-cmpb .cbfbs button s{text-decoration:none;color:var(--faint);font-variant-numeric:tabular-nums}
#pane-cmpb .cbfbs button:not(:disabled):hover{border-color:var(--acc);color:var(--acc)}
#pane-cmpb .cbfbs button:disabled{opacity:.5;cursor:default}
#pane-cmpb mark{background:rgba(215,154,31,.32);color:inherit;border-radius:3px;padding:0 1px}
/* a phone or a narrow window: the chips get their own line, one board at a time (swipe to the next) */
@media (max-width:760px){
  #pane-cmpb .cbbar{flex-wrap:wrap}
  #pane-cmpb .cbchips{order:2;flex-basis:100%}
  #pane-cmpb .cbtools{margin-left:auto}
  #pane-cmpb .cblab{display:none}
  #pane-cmpb .cbseg button{padding:0 8px}
  #pane-cmpb .cbbody{--cw:140px}#pane-cmpb .cbbody[data-size="s"]{--cw:112px}#pane-cmpb .cbbody[data-size="l"]{--cw:170px}
  #pane-cmpb .cbcols{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:calc(100% - 28px);overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
  #pane-cmpb .cbcol{scroll-snap-align:center}
  #pane-cmpb .cbfind{position:fixed!important;left:0!important;right:0;bottom:0;top:auto!important;width:auto!important;height:88vh;max-height:88vh!important;border-radius:20px 20px 0 0;z-index:200}
  #pane-cmpb .cbfbody{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}
  #pane-cmpb .cbtree{flex-direction:row;overflow-x:auto;border-right:0;border-bottom:1px solid var(--line);padding:6px}
  #pane-cmpb .cbtr{flex:none}#pane-cmpb .cbtr.on{display:none}
  #pane-cmpb .cbtcos{flex-direction:row;padding:0;gap:4px;flex:none}
  #pane-cmpb .cbtc{flex:none;border:1px solid var(--line);border-radius:999px;background:var(--surf)}
  #pane-cmpb .cbkinds{flex-wrap:nowrap;overflow-x:auto;max-width:100%}
  #pane-cmpb .cbsort{margin-left:0}
}
`;
  document.head.appendChild(css);
})();
