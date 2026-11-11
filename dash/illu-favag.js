/* ==================== Atlas › Favorite Agencies (1.2.140, the user's approved demo, 11 Nov 2026) ====================
   "Favorite Agencies sub-board in Atlas: drag to reorder (hold and move on mobile); team favorites; who on the team is in
   contact with whom (booker/director) and on which model; a list of agencies more than one of us is in contact with,
   with the contact history." and: "a better design to keep record of who is in contact with who and when."
   - My favorites: the ★ agencies (the same list as the ★ in the Directory and the Map), in my own order.
   - Team favorites: everyone's ★ agencies.
   - Shared: every agency two or more of us are in contact with.
   Contacts come from the booking cards (who is handling her, and her Hiworks emails: who wrote, to whom, when) and from
   contacts logged by hand (docs agcontact/<id>). On the PC: agencies down, the team across, a box where a person is in
   contact; the chosen agency's who-talks-to-whom and log on the right. On a phone: one line per person on each agency,
   and the log slides up. */
(function(){
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const lc = s => String(s || '').trim().toLowerCase();
  const PH = () => matchMedia('(max-width:760px), (pointer:coarse) and (max-width:1024px)').matches;
  const S = {tab: (() => { try{ return localStorage.getItem('illu.favag.tab') || 'mine'; }catch(e){ return 'mine'; } })(), who: '', sel: '', sheet: '', log: false};
  const HAND = new Map();          // id -> {d, an, who, them, role, what, at, by}
  const PREFS = new Map();         // pid -> [domains]
  const pane = document.createElement('div');
  pane.id = 'pane-favag'; pane.className = 'pane'; pane.hidden = true;

  /* ---------- data ---------- */
  const agList = () => { try{ return AG || []; }catch(e){ return []; } };
  function agOf(nameOrDom){
    const v = lc(nameOrDom); if(!v) return null;
    const A = agList();
    return A.find(a => lc(a.domain) === v) || A.find(a => lc(a.name) === v) || null;
  }
  const keyOfAg = (name, dom) => { const a = dom ? agOf(dom) : agOf(name); return a ? lc(a.domain) : (name ? 'name:' + lc(name) : ''); };
  function infoOf(k){
    if(k.startsWith('name:')) return {k, name: k.slice(5).replace(/\b\w/g, c => c.toUpperCase()), place: ''};
    const a = agOf(k) || {};
    return {k, name: a.name || k, place: [a.city, a.country].filter(Boolean).join(', ')};
  }
  const people = () => { const out = []; try{ for(const [pid, p] of PEOPLE){ if(typeof MERGED !== 'undefined' && MERGED.has(pid)) continue; if(p && p.n) out.push(pid); } }catch(e){} return out; };
  const colOf = pid => { let c = 'lilac'; try{ c = (PEOPLE.get(pid) || {}).c || 'lilac'; }catch(e){} let x = null; try{ x = IDC[c]; }catch(e){} return x || {bg: '#C7B6E6', fg: '#3E2C59'}; };
  const nmOf = pid => { try{ return (PEOPLE.get(pid) || {}).n || '?'; }catch(e){ return '?'; } };
  const meId = () => { try{ return ME || ''; }catch(e){ return ''; } };
  /* "DD/MM/YYYY HH:MM" or ISO -> a sortable number and a short label */
  function when(v){
    const s = String(v || '').trim(); if(!s) return {t: 0, s: ''};
    let d = null, m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if(m) d = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)); else { const x = new Date(s); if(!isNaN(x)) d = x; }
    if(!d) return {t: 0, s: s.slice(0, 10)};
    const now = new Date(), day = 864e5, diff = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / day);
    const lab = diff <= 0 ? L('today', '오늘') : diff === 1 ? L('yesterday', '어제') : diff < 7 ? L(diff + ' days ago', diff + '일 전') : d.toLocaleDateString(isKO() ? 'ko-KR' : 'en-GB', {day: 'numeric', month: 'short'});
    return {t: d.getTime(), s: lab, fresh: diff < 7};
  }
  function build(){
    const C = new Map();          // agency key -> Map(pid -> {them, role, w, about})
    const LOG = new Map();        // agency key -> [{w, who, them, what, how}]
    const put = (k, pid, them, role, w, about, what, how) => {
      if(!k || !pid) return;
      if(!C.has(k)) C.set(k, new Map());
      const m = C.get(k), o = m.get(pid);
      if(!o || w.t >= o.w.t) m.set(pid, {them: them || (o && o.them) || '', role: role || (o && o.role) || '', w, about: about || (o && o.about) || ''});
      if(what){ if(!LOG.has(k)) LOG.set(k, []); LOG.get(k).push({w, who: pid, them, what, how}); }
    };
    try{
      for(const c of BOOK.values()){
        if(!c || !c.ag || !c.by) continue;
        const k = keyOfAg(c.ag, c.agd || ''); const em = c.em && Array.isArray(c.em.list) ? c.em.list : [];
        if(!em.length){ put(k, c.by, '', L('Booking', '부킹'), when(c.at), c.nm || '', c.nm ? (c.nm + ' — ' + L('booking card', '부킹 카드')) : '', L('Booking card', '부킹 카드')); continue; }
        for(const e of em){
          const them = e.dir === 'in' ? (e.name || e.addr || '') : ((e.to || [])[0] || '');
          put(k, c.by, them, '', when(e.dt), c.nm || '', (c.nm ? c.nm + ' — ' : '') + (e.subject || L('email', '이메일')), e.dir === 'in' ? L('Hiworks · received', '하이웍스 · 받음') : L('Hiworks · sent', '하이웍스 · 보냄'));
        }
      }
    }catch(e){}
    for(const x of HAND.values()){
      const k = x.d || keyOfAg(x.an, ''); put(k, x.who, x.them || '', x.role || '', when(x.at), x.what || '', x.what || L('contact', '연락'), L('By hand', '직접 기록') + (x.by && x.by !== x.who ? ' · ' + nmOf(x.by) : ''));
    }
    for(const l of LOG.values()) l.sort((a, b) => b.w.t - a.w.t);
    return {C, LOG};
  }
  /* ---------- the shared database ---------- */
  const db = () => { try{ return DB || null; }catch(e){ return null; } };
  function listen(){
    const d = db(); if(!d){ setTimeout(listen, 500); return; }
    try{ d.collection('agcontact').onSnapshot(sn => { HAND.clear(); for(const x of (sn.docs || [])){ const v = typeof docOf === 'function' ? docOf(x) : x.data(); if(v && v.who) HAND.set(x.id, v); } paint(); }, () => {}); }catch(e){}
    try{ d.collection('atlpref').onSnapshot(sn => { PREFS.clear(); for(const x of (sn.docs || [])){ const v = typeof docOf === 'function' ? docOf(x) : x.data(); if(v && Array.isArray(v.f)) PREFS.set(x.id, v.f); } paint(); }, () => {}); }catch(e){}
  }
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  async function saveHand(o){ const d = db(); if(!d) return false; const id = rid(); const doc = Object.assign({}, o, {by: meId(), at: o.at || new Date().toISOString()}); HAND.set(id, doc); paint(); try{ await d.doc('agcontact/' + id).set(doc); return true; }catch(e){ console.error(e); return false; } }

  /* ---------- drawing ---------- */
  const av = (pid, sz) => { const c = colOf(pid); return '<span class="fgav" style="background:' + c.bg + ';color:' + c.fg + (sz ? ';width:' + sz + 'px;height:' + sz + 'px' : '') + '">' + H(nmOf(pid).charAt(0).toUpperCase()) + '</span>'; };
  function rowsFor(D){
    let ks;
    const fav = (window.ATLFAV && ATLFAV.list()) || [];
    if(S.tab === 'mine') ks = fav.map(lc);
    else if(S.tab === 'shared') ks = [...D.C.entries()].filter(([, m]) => m.size > 1).sort((a, b) => Math.max(...[...b[1].values()].map(x => x.w.t)) - Math.max(...[...a[1].values()].map(x => x.w.t))).map(([k]) => k);
    else ks = [];
    return ks;
  }
  function cols(D){
    /* the people with any contact, me first; at most 8 across */
    const used = new Set(); for(const m of D.C.values()) for(const p of m.keys()) used.add(p);
    const me = meId(), all = people().filter(p => used.has(p) || p === me);
    all.sort((a, b) => (a === me ? -1 : b === me ? 1 : nmOf(a).localeCompare(nmOf(b))));
    return all.slice(0, 8);
  }
  function head(D){
    const nShared = [...D.C.values()].filter(m => m.size > 1).length, nMine = ((window.ATLFAV && ATLFAV.list()) || []).length;
    const tab = (k, l) => '<button type="button" data-fgtab="' + k + '" aria-pressed="' + (S.tab === k) + '">' + l + '</button>';
    const ppl = cols(D);
    return '<div class="fghd"><div class="fgseg" role="tablist">' + tab('mine', L('My favorites', '내 즐겨찾기') + ' · ' + nMine) + tab('shared', L('Shared', '공유') + ' · ' + nShared) + tab('team', L('Team favorites', '팀 즐겨찾기')) + '</div>' +
      (S.tab !== 'team' ? '<div class="fgwho"><span>' + L('Show who:', '사람:') + '</span><button type="button" data-fgwho="" aria-pressed="' + !S.who + '">' + L('Everyone', '모두') + '</button>' +
        ppl.map(p => { const c = colOf(p); return '<button type="button" data-fgwho="' + H(p) + '" aria-pressed="' + (S.who === p) + '" style="--pc:' + c.bg + ';--pf:' + c.fg + '">' + av(p, 20) + '<b>' + H(nmOf(p)) + '</b></button>'; }).join('') + '</div>' : '') + '</div>';
  }
  function cellHTML(x, pid){
    if(!x) return '<div class="fgcell off"></div>';
    const c = colOf(pid), dim = S.who && S.who !== pid;
    return '<div class="fgcell' + (x.w.fresh ? ' fresh' : '') + (dim ? ' dim' : '') + '" style="--pc:' + c.bg + ';--pf:' + c.fg + '" title="' + H(nmOf(pid) + ' → ' + (x.them || '?') + (x.role ? ' · ' + x.role : '') + (x.about ? ' · ' + x.about : '')) + '">' +
      '<b>' + H(x.them || L('in contact', '연락 중')) + '</b><span>' + H(x.role || (x.about ? x.about : '')) + '</span><em>' + H(x.w.s) + '</em></div>';
  }
  function pcHTML(D){
    const ks = rowsFor(D), P = cols(D);
    if(!S.sel || !ks.includes(S.sel)) S.sel = ks[0] || '';
    const gridCols = '28px minmax(180px,1fr) repeat(' + P.length + ',minmax(86px,104px)) 76px';
    const rows = ks.map((k, i) => {
      const I = infoOf(k), m = D.C.get(k) || new Map(), n = m.size, last = Math.max(0, ...[...m.values()].map(x => x.w.t));
      return '<div class="fgrow' + (k === S.sel ? ' on' : '') + '" data-fgk="' + H(k) + '" style="grid-template-columns:' + gridCols + '">' +
        (S.tab === 'mine' ? '<button type="button" class="fggrip" data-fggrip="' + i + '" aria-label="' + L('Drag to change the order', '끌어서 순서 바꾸기') + '" title="' + L('Drag to change the order', '끌어서 순서 바꾸기') + '">⋮⋮</button>' : '<span class="fgn">' + (i + 1) + '</span>') +
        '<button type="button" class="fgag" data-fgsel="' + H(k) + '"><span><b>' + H(I.name) + '</b>' + (n > 1 ? '<i class="fgsh">' + L(n + ' of us', n + '명') + '</i>' : '') + '</span><small>' + H(I.place) + '</small></button>' +
        P.map(p => cellHTML(m.get(p), p)).join('') + '<span class="fglast">' + H(last ? when(new Date(last).toISOString()).s : '—') + '</span></div>';
    }).join('');
    const empty = S.tab === 'mine' ? L('No favorite agencies yet. Tap ★ on any agency in the Directory or on the Map and it comes here.', '즐겨찾는 에이전시가 없습니다. 디렉터리나 지도에서 ★를 누르면 여기에 들어옵니다.')
      : L('No agency has two or more of us in contact yet.', '두 명 이상이 연락 중인 에이전시가 아직 없습니다.');
    return '<div class="fgmain"><div class="fgtable"><div class="fgrow fghead" style="grid-template-columns:' + gridCols + '"><span></span><span class="fglab">' + L('Agency', '에이전시') + '</span>' +
      P.map(p => '<span class="fgph' + (S.who && S.who !== p ? ' dim' : '') + '">' + av(p) + '<b>' + H(nmOf(p)) + '</b></span>').join('') + '<span class="fglab r">' + L('Last', '최근') + '</span></div>' +
      '<div class="fgbody">' + (rows || '<p class="fgempty">' + H(empty) + '</p>') + '</div>' +
      '<div class="fgfoot"><span>' + L('A coloured box = that person is in contact: who at the agency, their role, and when they last talked.', '색 칸 = 그 사람이 연락 중: 에이전시 담당자, 역할, 마지막 연락.') + '</span><span class="fgkey"><i class="k1"></i>' + L('this week', '이번 주') + '<i class="k2"></i>' + L('older', '이전') + '</span></div></div>' +
      side(D, S.sel) + '</div>';
  }
  function side(D, k){
    if(!k) return '<aside class="fgside"><p class="fgempty">' + L('Choose an agency.', '에이전시를 고르세요.') + '</p></aside>';
    const I = infoOf(k), m = D.C.get(k) || new Map(), log = (D.LOG.get(k) || []).slice(0, 30);
    return '<aside class="fgside"><div class="fgsh1"><div><b>' + H(I.name) + '</b>' + (m.size > 1 ? '<i class="fgsh">' + L(m.size + ' of us in contact', m.size + '명 연락 중') + '</i>' : '') + '</div><small>' + H(I.place) + '</small></div>' +
      '<div class="fgsec"><span class="fglab">' + L('Who talks to whom', '누가 누구와') + '</span>' +
      ([...m.entries()].sort((a, b) => b[1].w.t - a[1].w.t).map(([p, x]) => '<div class="fglink">' + av(p) + '<span><b>' + H(nmOf(p)) + '</b> <i>→</i> <b>' + H(x.them || '?') + '</b>' + (x.role ? ' <s>· ' + H(x.role) + '</s>' : '') + (x.about ? '<small>' + H(x.about) + '</small>' : '') + '</span><em>' + H(x.w.s) + '</em></div>').join('') ||
        '<p class="fgempty">' + L('No one on the team is in contact yet.', '아직 연락 중인 사람이 없습니다.') + '</p>') + '</div>' +
      '<div class="fgsec fglogs"><span class="fglab">' + L('Contact log · newest first', '연락 기록 · 최신순') + '</span><div class="fgtl">' +
      (log.map(h => '<div class="fgev">' + av(h.who) + '<div><small><b>' + H(h.w.s) + '</b> · ' + H(h.how) + '</small><span><b>' + H(nmOf(h.who)) + '</b> <i>→</i> ' + H(h.them || '?') + '</span><p>' + H(h.what) + '</p></div></div>').join('') || '<p class="fgempty">' + L('Nothing logged yet.', '기록이 없습니다.') + '</p>') + '</div></div>' +
      (S.log === k ? logForm(k) : '<div class="fgact"><button type="button" class="fgbtn" data-fglog="' + H(k) + '">+ ' + L('Log a contact by hand', '연락 직접 기록') + '</button>' + (k.startsWith('name:') ? '' : '<button type="button" class="fgbtn pri" data-fgdir="' + H(k) + '">' + L('Open in Directory', '디렉터리에서 열기') + '</button>') + '</div>') + '</aside>';
  }
  function logForm(k){
    const me = meId(), P = people();
    return '<form class="fglogf" data-fglogf="' + H(k) + '"><b>' + L('Log a contact', '연락 기록') + '</b>' +
      '<label><span>' + L('Who on the team', '팀원') + '</span><select name="who">' + P.map(p => '<option value="' + H(p) + '"' + (p === me ? ' selected' : '') + '>' + H(nmOf(p)) + '</option>').join('') + '</select></label>' +
      '<label><span>' + L('Their person at the agency', '에이전시 담당자') + '</span><input name="them" placeholder="' + L('e.g. Anna', '예: Anna') + '" required></label>' +
      '<label><span>' + L('Role', '역할') + '</span><select name="role">' + ['Booker', 'Director', 'Scout', 'Accounts', 'Other'].map(r => '<option>' + r + '</option>').join('') + '</select></label>' +
      '<label><span>' + L('About (model, subject)', '내용 (모델, 주제)') + '</span><input name="what" placeholder="' + L('e.g. Polina — availability', '예: Polina — 가능 기간') + '"></label>' +
      '<div class="fgact"><button type="button" class="fgbtn" data-fglogx>' + L('Cancel', '취소') + '</button><button type="submit" class="fgbtn pri">' + L('Save', '저장') + '</button></div></form>';
  }
  function teamHTML(){
    const P = people().filter(p => (PREFS.get(p) || []).length);
    if(!P.length) return '<p class="fgempty">' + L('No one has a favorite agency yet.', '아직 즐겨찾는 에이전시가 없습니다.') + '</p>';
    return '<div class="fgteam">' + P.map(p => '<div class="fgtc"><div class="fgtch">' + av(p, 30) + '<b>' + H(nmOf(p)) + '</b><span class="fgcnt">★ ' + PREFS.get(p).length + '</span></div>' +
      PREFS.get(p).slice(0, 12).map(d => { const I = infoOf(lc(d)); return '<button type="button" class="fgtr" data-fgdir="' + H(lc(d)) + '"><span>' + H(I.name) + '</span><small>' + H(I.place) + '</small></button>'; }).join('') + '</div>').join('') + '</div>';
  }
  function phoneHTML(D){
    const ks = rowsFor(D);
    const cards = ks.map((k, i) => {
      const I = infoOf(k), m = D.C.get(k) || new Map();
      const lanes = [...m.entries()].sort((a, b) => b[1].w.t - a[1].w.t).map(([p, x]) => { const c = colOf(p);
        return '<div class="fglane' + (S.who && S.who !== p ? ' dim' : '') + '" style="background:' + c.bg + ';color:' + c.fg + '"><span class="fgav" style="background:#fff;color:' + c.fg + '">' + H(nmOf(p).charAt(0).toUpperCase()) + '</span><span><b>' + H(nmOf(p)) + '</b> <i>→</i> <b>' + H(x.them || '?') + '</b>' + (x.role ? ' · ' + H(x.role) : '') + (x.about ? '<small>' + H(x.about) + '</small>' : '') + '</span><em>' + H(x.w.s) + '</em></div>'; }).join('');
      return '<div class="fgpc' + (m.size > 1 ? ' sh' : '') + '" data-fgk="' + H(k) + '"><button type="button" class="fgpch" data-fgsheet="' + H(k) + '"' + (S.tab === 'mine' ? ' data-fghold="' + i + '"' : '') + '><span class="fgn">' + (i + 1) + '</span><span class="fgpcn"><b>' + H(I.name) + '</b><small>' + H(I.place) + '</small></span>' + (m.size > 1 ? '<i class="fgsh">' + L(m.size + ' of us', m.size + '명') + '</i>' : '') + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>' +
        '<div class="fglanes">' + (lanes || '<span class="fgnone">' + L('No one in contact yet', '아직 연락 없음') + '</span>') + '</div></div>';
    }).join('');
    const sheet = S.sheet ? '<button type="button" class="fgveil" data-fgsheetx aria-label="' + L('Close', '닫기') + '"></button><div class="fgsheet"><span class="fggrab"></span>' + side(D, S.sheet) + '</div>' : '';
    return (S.tab === 'mine' && ks.length > 1 ? '<p class="fghint">' + L('Hold an agency, then move it to change the order.', '에이전시를 길게 누른 뒤 옮기면 순서가 바뀝니다.') + '</p>' : '') +
      '<div class="fgpcs">' + (cards || '<p class="fgempty">' + (S.tab === 'mine' ? L('No favorite agencies yet. Tap ★ on any agency in the Directory and it comes here.', '즐겨찾는 에이전시가 없습니다. 디렉터리에서 ★를 누르면 여기에 들어옵니다.') : L('No agency has two or more of us in contact yet.', '두 명 이상이 연락 중인 에이전시가 아직 없습니다.')) + '</p>') + '</div>' + sheet;
  }
  let pT = 0;
  function paint(){ if(pane.hidden || pT) return; pT = requestAnimationFrame(() => { pT = 0; render(); }); }
  function render(){
    if(pane.hidden) return;
    const D = build(), ph = PH();
    const h = '<div class="fgwrap' + (ph ? ' fgphone' : '') + '">' + head(D) + (S.tab === 'team' ? teamHTML() : ph ? phoneHTML(D) : pcHTML(D)) + '</div>';
    if(pane.__h === h) return;
    const keep = pane.querySelector('.fglogf'), kv = keep ? [...keep.elements].map(x => [x.name, x.value]) : null;
    pane.__h = h; pane.innerHTML = h;
    if(kv){ const f = pane.querySelector('.fglogf'); if(f) for(const [n, v] of kv){ if(f.elements[n]) f.elements[n].value = v; } }
  }
  /* ---------- clicks ---------- */
  pane.addEventListener('click', e => {
    if(drag && drag.moved) return;
    const t = e.target.closest('button'); if(!t) return;
    const d = t.dataset;
    if(d.fgtab){ S.tab = d.fgtab; S.sheet = ''; S.log = false; try{ localStorage.setItem('illu.favag.tab', S.tab); }catch(er){} render(); return; }
    if(d.fgwho != null){ S.who = d.fgwho; render(); return; }
    if(d.fgsel){ S.sel = d.fgsel; S.log = false; render(); return; }
    if(d.fgsheet){ if(Date.now() - (drag0 || 0) < 400) return; S.sheet = d.fgsheet; S.log = false; render(); return; }
    if(d.fgsheetx != null){ S.sheet = ''; S.log = false; render(); return; }
    if(d.fglog){ S.log = d.fglog; render(); setTimeout(() => { const i = pane.querySelector('.fglogf [name=them]'); if(i) i.focus(); }, 30); return; }
    if(d.fglogx != null){ S.log = false; render(); return; }
    if(d.fgdir){ try{ if(window.__illuDirGoAg) window.__illuDirGoAg(d.fgdir); else if(window.__illuGo) window.__illuGo('dir'); }catch(er){} return; }
  });
  pane.addEventListener('submit', async e => {
    const f = e.target.closest('form.fglogf'); if(!f) return; e.preventDefault();
    const k = f.dataset.fglogf, I = infoOf(k), v = n => (f.elements[n] && f.elements[n].value || '').trim();
    if(!v('them')){ f.elements.them.focus(); return; }
    const ok = await saveHand({d: k, an: I.name, who: v('who'), them: v('them'), role: v('role'), what: v('what')});
    if(ok){ S.log = false; render(); }
  });
  /* ---------- drag to reorder (PC: the ⋮⋮ grip; phone: hold the agency, then move) ---------- */
  let drag = null, drag0 = 0, holdT = 0;
  function startDrag(row, y){
    const list = [...pane.querySelectorAll(PH() ? '.fgpc' : '.fgbody .fgrow')];
    drag = {row, list, y0: y, i0: list.indexOf(row), to: list.indexOf(row), moved: false, h: row.getBoundingClientRect().height};
    row.classList.add('fgdrag'); pane.classList.add('fgdragging');
    try{ navigator.vibrate && navigator.vibrate(12); }catch(e){}
  }
  pane.addEventListener('pointerdown', e => {
    if(S.tab !== 'mine') return;
    const g = e.target.closest('[data-fggrip]');
    if(g && e.pointerType !== 'touch'){ e.preventDefault(); startDrag(g.closest('.fgrow'), e.clientY); return; }
    const hb = e.target.closest('[data-fghold]');
    if(hb && e.pointerType === 'touch'){ const y = e.clientY; clearTimeout(holdT); holdT = setTimeout(() => { startDrag(hb.closest('.fgpc'), y); }, 380);
      const cancel = ev => { if(!drag && Math.abs(ev.clientY - y) > 8){ clearTimeout(holdT); } }; pane.addEventListener('pointermove', cancel, {once: true}); }
  });
  document.addEventListener('pointermove', e => {
    if(!drag) return;
    const dy = e.clientY - drag.y0; if(Math.abs(dy) > 3) drag.moved = true;
    drag.row.style.transform = 'translateY(' + dy + 'px)';
    /* where it would land */
    let to = drag.i0;
    drag.list.forEach((r, i) => { if(r === drag.row) return; const b = r.getBoundingClientRect(), mid = b.top + b.height / 2; if(i > drag.i0 && e.clientY > mid) to = Math.max(to, i); if(i < drag.i0 && e.clientY < mid) to = Math.min(to, i); });
    drag.to = to;
    drag.list.forEach((r, i) => { if(r === drag.row) return; r.style.transform = (drag.i0 < to && i > drag.i0 && i <= to) ? 'translateY(-' + (drag.h + 8) + 'px)' : (drag.i0 > to && i < drag.i0 && i >= to) ? 'translateY(' + (drag.h + 8) + 'px)' : ''; });
  }, {passive: true});
  pane.addEventListener('touchmove', e => { if(drag) e.preventDefault(); }, {passive: false});
  const endDrag = () => {
    clearTimeout(holdT);
    if(!drag) return; const D0 = drag; drag = null; drag0 = Date.now();
    D0.list.forEach(r => r.style.transform = ''); D0.row.classList.remove('fgdrag'); pane.classList.remove('fgdragging');
    if(D0.moved && D0.to !== D0.i0 && window.ATLFAV){
      const ids = ATLFAV.list(); const [x] = ids.splice(D0.i0, 1); ids.splice(D0.to, 0, x); ATLFAV.order(ids);
    }
    pane.__h = ''; render();
  };
  document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);
  window.__illuFavAg = {render, build, S, saveHand};

  /* ---------- style ---------- */
  const st = document.createElement('style');
  st.textContent = `
#pane-favag{padding:6px 2px 24px}
#pane-favag .fghd{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 14px}
#pane-favag .fgseg{display:inline-flex;background:var(--surf2,#F1EDF4);border-radius:999px;padding:3px;gap:2px}
#pane-favag .fgseg button{border:0;background:none;border-radius:999px;padding:8px 14px;font:600 13px var(--sans);color:var(--ink2,#4A4352);cursor:pointer;white-space:nowrap}
#pane-favag .fgseg button[aria-pressed="true"]{background:var(--surf,#fff);color:var(--acc,#5A2C57);box-shadow:0 1px 3px rgba(30,10,40,.12)}
#pane-favag .fgwho{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-left:auto}
#pane-favag .fgwho > span{font-size:12.5px;color:var(--mut)}
#pane-favag .fgwho button{height:32px;display:inline-flex;align-items:center;gap:6px;border-radius:999px;border:1px solid var(--line);background:var(--surf,#fff);padding:0 10px 0 4px;font:600 12.5px var(--sans);color:var(--ink2,#4A4352);cursor:pointer}
#pane-favag .fgwho button:first-of-type{padding:0 12px}
#pane-favag .fgwho button[aria-pressed="true"]{background:var(--pc,var(--acc,#5A2C57));border-color:var(--pf,var(--acc,#5A2C57));color:var(--pf,#fff)}
#pane-favag .fgwho button:first-of-type[aria-pressed="true"]{background:var(--acc,#5A2C57);color:#fff}
#pane-favag .fgav{width:26px;height:26px;border-radius:50%;display:inline-grid;place-items:center;font:700 11px var(--sans);flex:none}
#pane-favag .fgmain{display:flex;gap:16px;align-items:flex-start}
#pane-favag .fgtable{flex:1;min-width:0;background:var(--surf,#fff);border:1px solid var(--line);border-radius:16px;overflow:hidden}
#pane-favag .fgrow{display:grid;align-items:stretch;gap:0;padding:4px 14px;min-height:72px;border-bottom:1px solid var(--line2,#F3EFF5);transition:transform .15s ease}
#pane-favag .fgrow.on{background:var(--accbg,#F7F2F8);box-shadow:inset 3px 0 0 var(--acc,#5A2C57)}
#pane-favag .fghead{min-height:0;padding:12px 14px 10px;align-items:end;border-bottom:1px solid var(--line)}
#pane-favag .fglab{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
#pane-favag .fglab.r{text-align:right}
#pane-favag .fgph{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:12px}
#pane-favag .fgph.dim{opacity:.3}
#pane-favag .fggrip{border:0;background:none;color:var(--faint,#A69DB2);cursor:grab;font-size:15px;letter-spacing:-2px;padding:0;touch-action:none}
#pane-favag .fgn{align-self:center;color:var(--faint,#A69DB2);font-weight:700;font-size:12px}
#pane-favag .fgag{border:0;background:none;text-align:left;cursor:pointer;font:inherit;color:inherit;display:flex;flex-direction:column;justify-content:center;gap:3px;min-width:0;padding:0 10px 0 2px}
#pane-favag .fgag > span{display:flex;align-items:center;gap:6px;min-width:0}
#pane-favag .fgag b{font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pane-favag .fgag small{font-size:11.5px;color:var(--mut)}
#pane-favag .fgsh{flex:none;font-style:normal;font-size:10.5px;font-weight:700;color:#8A5A00;background:#FFF1D6;border-radius:999px;padding:2px 7px}
#pane-favag .fgcell{margin:6px 3px;border-radius:10px;padding:6px 8px;display:flex;flex-direction:column;gap:1px;justify-content:center;min-width:0;background:color-mix(in srgb,var(--pc) 40%,#fff);color:var(--pf);border:1px solid #EFEAF2}
#pane-favag .fgcell.fresh{background:var(--pc);border-color:color-mix(in srgb,var(--pf) 20%,transparent)}
#pane-favag .fgcell.dim{opacity:.25}
#pane-favag .fgcell.off{background:none;border:1px dashed var(--line);opacity:.7}
#pane-favag .fgcell b{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pane-favag .fgcell span{font-size:10.5px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#pane-favag .fgcell em{font-style:normal;font-size:10.5px;font-weight:600;white-space:nowrap}
#pane-favag .fglast{align-self:center;text-align:right;font-size:12px;color:var(--mut)}
#pane-favag .fgfoot{display:flex;gap:16px;align-items:center;padding:10px 14px;font-size:11.5px;color:var(--mut);flex-wrap:wrap}
#pane-favag .fgkey{margin-left:auto;display:inline-flex;align-items:center;gap:6px}
#pane-favag .fgkey i{width:10px;height:10px;border-radius:3px;display:inline-block;margin-left:8px}
#pane-favag .fgkey .k1{background:var(--acc,#5A2C57)}#pane-favag .fgkey .k2{background:#C9B5C7}
#pane-favag .fgempty{padding:24px 16px;color:var(--mut);font-size:13px;margin:0}
#pane-favag .fgside{width:400px;flex:none;background:var(--surf,#fff);border:1px solid var(--line);border-radius:16px;display:flex;flex-direction:column;position:sticky;top:12px;max-height:calc(100vh - 140px);overflow:auto}
#pane-favag .fgsh1{padding:16px 18px 12px;border-bottom:1px solid var(--line2,#EEE9F1);display:flex;flex-direction:column;gap:4px}
#pane-favag .fgsh1 > div{display:flex;align-items:center;gap:8px}#pane-favag .fgsh1 b{font-size:18px}#pane-favag .fgsh1 small{font-size:12.5px;color:var(--mut)}
#pane-favag .fgsec{padding:14px 18px;display:flex;flex-direction:column;gap:8px;border-bottom:1px solid var(--line2,#EEE9F1)}
#pane-favag .fglink{display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 10px;border-radius:12px;background:var(--surf2,#FAF8FB);border:1px solid var(--line2,#EFEAF2);font-size:13px}
#pane-favag .fglink i,#pane-favag .fgev i,#pane-favag .fglane i{font-style:normal;opacity:.55}
#pane-favag .fglink s{text-decoration:none;color:var(--mut)}
#pane-favag .fglink small{display:block;font-size:11.5px;color:var(--mut)}
#pane-favag .fglink em{font-style:normal;font-size:11.5px;font-weight:600;color:var(--ink2,#4A4352)}
#pane-favag .fgtl{position:relative;display:flex;flex-direction:column;gap:12px;padding-left:2px}
#pane-favag .fgtl::before{content:'';position:absolute;left:14px;top:6px;bottom:6px;width:2px;background:var(--line2,#EEE9F1)}
#pane-favag .fgev{display:grid;grid-template-columns:26px minmax(0,1fr);gap:10px;position:relative}
#pane-favag .fgev .fgav{box-shadow:0 0 0 3px var(--surf,#fff);align-self:start;position:relative;z-index:1;width:26px;height:26px}
#pane-favag .fgev small{font-size:11.5px;color:var(--mut)}#pane-favag .fgev small b{color:var(--ink)}
#pane-favag .fgev > div > span{display:block;font-size:13px}#pane-favag .fgev p{margin:2px 0 0;font-size:12.5px;color:var(--ink2,#4A4352)}
#pane-favag .fgact{display:flex;gap:8px;padding:12px 18px}
#pane-favag .fgbtn{flex:1;height:38px;border-radius:10px;border:1px solid var(--line);background:var(--surf,#fff);font:600 13px var(--sans);color:var(--acc,#5A2C57);cursor:pointer;padding:0 12px}
#pane-favag .fgbtn.pri{flex:none;background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57);color:#fff}
#pane-favag .fglogf{display:flex;flex-direction:column;gap:8px;padding:14px 18px}
#pane-favag .fglogf label{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--mut)}
#pane-favag .fglogf input,#pane-favag .fglogf select{height:36px;border:1px solid var(--line);border-radius:9px;padding:0 10px;font:500 14px var(--sans);color:var(--ink);background:var(--surf,#fff)}
#pane-favag .fglogf .fgact{padding:4px 0 0}
#pane-favag .fgteam{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
#pane-favag .fgtc{background:var(--surf,#fff);border:1px solid var(--line);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:6px}
#pane-favag .fgtch{display:flex;align-items:center;gap:10px;margin-bottom:4px}#pane-favag .fgtch b{font-size:15px}
#pane-favag .fgcnt{margin-left:auto;font-size:11.5px;font-weight:600;background:var(--accbg,#F3ECF3);color:var(--acc,#5A2C57);border-radius:999px;padding:1px 7px}
#pane-favag .fgtr{border:0;border-top:1px solid var(--line2,#F0EBF3);background:none;display:flex;justify-content:space-between;gap:8px;padding:8px 0 2px;font:13px var(--sans);color:var(--ink);cursor:pointer;text-align:left}
#pane-favag .fgtr small{color:var(--mut);font-size:12px}
#pane-favag .fgdrag{position:relative;z-index:5;box-shadow:0 14px 30px rgba(30,10,40,.18);background:var(--surf,#fff);transition:none!important}
#pane-favag.fgdragging{user-select:none}
/* phone */
#pane-favag .fgphone .fghd{flex-direction:column;align-items:stretch;gap:8px}
#pane-favag .fgphone .fgseg{display:flex}#pane-favag .fgphone .fgseg button{flex:1;padding:9px 6px}
#pane-favag .fgphone .fgwho{margin:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
#pane-favag .fgphone .fgwho > span{display:none}
#pane-favag .fgphone .fgwho button{height:40px;flex:none}
#pane-favag .fghint{font-size:11.5px;color:var(--mut);margin:0 0 8px}
#pane-favag .fgpcs{display:flex;flex-direction:column;gap:10px}
#pane-favag .fgpc{background:var(--surf,#fff);border:1px solid var(--line);border-radius:16px;display:flex;flex-direction:column;transition:transform .15s ease}
#pane-favag .fgpc.sh{border-color:#F0D49A}
#pane-favag .fgpch{border:0;background:none;padding:12px 12px 8px;display:flex;align-items:center;gap:8px;text-align:left;cursor:pointer;font:inherit;color:inherit;touch-action:pan-y;-webkit-user-select:none;user-select:none}
#pane-favag .fgpch svg{width:16px;height:16px;fill:none;stroke:var(--faint,#A69DB2);stroke-width:2}
#pane-favag .fgpcn{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}#pane-favag .fgpcn b{font-size:15px}#pane-favag .fgpcn small{font-size:11.5px;color:var(--mut)}
#pane-favag .fglanes{display:flex;flex-direction:column;gap:4px;padding:0 10px 10px}
#pane-favag .fglane{display:flex;align-items:center;gap:9px;padding:7px 9px;border-radius:11px;font-size:12.5px;line-height:1.3}
#pane-favag .fglane.dim{opacity:.3}
#pane-favag .fglane > span:nth-child(2){flex:1;min-width:0}
#pane-favag .fglane small{display:block;font-size:11.5px;opacity:.8}
#pane-favag .fglane em{font-style:normal;font-size:11px;font-weight:700;white-space:nowrap}
#pane-favag .fgnone{font-size:12px;color:var(--faint,#A69DB2);padding:2px 4px 4px}
#pane-favag .fgveil{position:fixed;inset:0;border:0;background:rgba(33,28,38,.4);z-index:80}
#pane-favag .fgsheet{position:fixed;left:0;right:0;bottom:0;max-height:78vh;overflow:auto;background:var(--surf,#fff);border-radius:20px 20px 0 0;z-index:81;box-shadow:0 -12px 40px rgba(20,10,30,.25);padding-bottom:env(safe-area-inset-bottom,0px)}
#pane-favag .fggrab{display:block;width:40px;height:4px;border-radius:2px;background:#D9D2DE;margin:8px auto 2px}
#pane-favag .fgsheet .fgside{width:auto;border:0;border-radius:0;position:static;max-height:none}
@media (prefers-reduced-motion:reduce){#pane-favag .fgrow,#pane-favag .fgpc{transition:none}}`;
  document.head.appendChild(st);

  function mount(){
    const ref = document.getElementById('pane-arr');
    if(!ref || !window.__illuShellAdd){ setTimeout(mount, 200); return; }
    ref.parentNode.insertBefore(pane, ref);
    window.__illuShellAdd('favag', {label: ['★ Favorite Agencies', '★ 즐겨찾는 에이전시'], el: pane, count: () => ((window.ATLFAV && ATLFAV.list()) || []).length || '', show: () => { try{ window.ATLFAV && ATLFAV.load(); }catch(e){} pane.__h = ''; render(); }});
    listen();
  }
  mount();
  addEventListener('resize', () => paint());
  try{ new MutationObserver(paint).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']}); }catch(e){}
  /* the favourites change from the Directory / the Map */
  setInterval(() => { if(!pane.hidden && !drag){ paint(); } }, 2500);
})();
