/* ==================== The new frame (redesign, 1.2.91) ====================
   What the user approved in the redesign pictures (6 Nov 2026):
   - a menu down the left, always there, in five groups: Today · Find · Shortlist ·
     Booking · Records, each page with its count;
   - the slim bar along the top keeps the page's own buttons, and gains one search box
     (Ctrl K) that finds pages, booking cards, agencies, models and cities;
   - a new home page, Today: the clocks, the booking cards in Processing at the stage
     they are on, what changed since yesterday, and what the team has been doing.
   Nothing underneath changes: every page is still drawn by the code that drew it before.
   The menu presses the same tab buttons the old menu had, so everything those buttons
   did (counts, loading measurements, remembering the page) still happens. */
(function(){
  if(window.__illuShell) return; window.__illuShell = true;
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const $ = s => document.querySelector(s);
  const B = document.body;

  /* ---------- the menu ---------- */
  const IC = {
    today: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9h11v-9"/>',
    arr: '<path d="M12 3.5l2.4 5 5.4.7-4 3.8 1 5.4L12 15.8 7.2 18.4l1-5.4-4-3.8 5.4-.7z"/>',
    dir: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    atl: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.5 3.6 5.3 3.6 8.5s-1.2 6-3.6 8.5c-2.4-2.5-3.6-5.3-3.6-8.5s1.2-6 3.6-8.5z"/>',
    ig: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.8" cy="7.2" r=".6"/>',
    lit: '<circle cx="12" cy="10" r="5"/><path d="M9.5 18.5h5M10.5 21h3"/>',
    com: '<circle cx="9" cy="9" r="3.2"/><circle cx="16.5" cy="10.5" r="2.6"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M14.5 15.2c2.6-.4 4.9.9 5.6 3.8"/>',
    bk: '<rect x="3.5" y="6" width="17" height="13" rx="2.5"/><path d="M8.5 6V4.5h7V6M3.5 11.5h17"/>',
    cmp: '<rect x="4" y="4" width="7" height="9" rx="1.5"/><rect x="13" y="4" width="7" height="5" rx="1.5"/><rect x="13" y="11" width="7" height="9" rx="1.5"/><rect x="4" y="15" width="7" height="5" rx="1.5"/>',
    more: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
    bkl: '<path d="M6 4h10.5A1.5 1.5 0 0 1 18 5.5v13a1.5 1.5 0 0 1-1.5 1.5H6z"/><path d="M9.5 8.5h5M9.5 12h5M9.5 15.5h3"/>',
    404: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.2M12 17v.2"/>',
    bld: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><path d="M4 20 20 4"/>',
    ana: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'
  };
  /* 1.2.98 (user, 7 Nov 2026, from the Studio demo): one icon per place. Atlas holds the Map, the Directory,
     Compare boards and Instagram; Opus holds Lumen, Communicatus, the vote boards, Booking and Compositus.
     A place with several pages shows them as tabs along the top and remembers the last one. */
  const GROUPS = {
    'g-atlas': {label: ['Atlas', '아틀라스'], icon: 'atl', tabs: ['atl', 'dir', 'cmpb', 'ig', 'favag']},
    'g-opus': {label: ['Opus', '오푸스'], icon: 'bk', tabs: ['fav', 'mfav', 'team', 'appr', 'tie', 'cxl', 'unav', 'bk', 'stay', 'cmp']},
    /* 1.2.177 (user, 13 Nov 2026: "combine these 2 and name it more ... choose when selecting the icon"): Backlog and
       404 · Blind spots are one rail button, More; pointing at it (or clicking / tapping) opens a small menu */
    'g-more': {label: ['More', '더보기'], icon: 'more', tabs: ['bkl', '404', 'bld']}
  };
  const TABLAB = {atl: ['Map', '지도'], bkl: ['Backlog', '백로그'], '404': ['404 · Left their board', '404 · 보드에서 내려감'], bld: ['Blind spots', '크롤 불가']};
  const TABSUB = {bkl: ['Hidden agencies and model cards', '숨긴 에이전시와 모델 카드'], '404': ['Profiles agencies took down', '에이전시가 내린 프로필'], bld: ['Sites the crawler cannot read', '크롤러가 읽지 못하는 사이트']};
  const groupOf = v => Object.keys(GROUPS).find(g => GROUPS[g].tabs.includes(v)) || '';
  /* 1.2.183 (user, 13 Nov 2026: "combining these boards and having sub-boards for them ... that row has too many sub-boards",
     approved demo): Opus's 10 boards in 4 tabs, the boards inside each as a framed second row. A tab's number adds up
     its boards; orange when a vote waits for you. Each tab remembers the board last opened in it. */
  const SETS = {
    'g-opus': [
      {id: 'favs', label: ['Favorites', '즐겨찾기'], icon: 'fav', tabs: ['fav', 'mfav'], sub: {fav: ['Mine', '내 즐겨찾기'], mfav: ['Members', '멤버']}},
      {id: 'vote', label: ['Team Vote', '팀 투표'], icon: 'team', tabs: ['team', 'tie', 'appr', 'cxl'], sub: {team: ['Voting', '투표 중'], tie: ['Tie-breaker', '타이브레이커'], appr: ['Approved', '승인'], cxl: ['Cancelled', '취소']}, hot: true},
      {id: 'bkg', label: ['Booking', '부킹'], icon: 'bk', tabs: ['bk', 'unav', 'stay'], sub: {bk: ['Booking cards', '부킹 카드'], unav: ['Unavailable / On hold', '불가 / 보류'], stay: ['Current / On-Stay', '현재 / 체류 중']}},
      {id: 'cmp', label: null, icon: 'cmp', tabs: ['cmp'], sub: {}}
    ]
  };
  const setOf = (g, v) => (SETS[g] || []).find(s => s.tabs.includes(v)) || null;
  const setLast = s => { try{ const v = localStorage.getItem('illu.shset.' + s.id); if(v && s.tabs.includes(v) && exists(v)) return v; }catch(e){} return s.tabs.find(exists) || s.tabs[0]; };
  window.__illuShellSets = SETS;
  const MENU = [
    [null, [['today', 'Today', '오늘']]],
    [null, [['arr'], ['g-atlas'], ['g-opus'], ['arrd'], ['ana'], ['g-more']]]
  ];
  /* two pages under one menu entry, with tabs at the top (approved pictures: "Mine (Lumen) · Everyone
     (Communicatus)" and "404 · Blind spots") */
  const PAIRS = {lit: ['lit', 'com'], com: ['lit', 'com'], 404: ['404', 'bld'], bld: ['404', 'bld']};
  const PAIRLAB = {lit: ['Mine (Lumen)', '내 램프 (루멘)'], com: ['Everyone (Communicatus)', '모두 (코뮤니카투스)'], 404: ['404 · left their board', '404 · 보드에서 내려감'], bld: ['Blind spots', '크롤 불가']};
  /* pages the program did not have before (Compare boards...): registered by their own scripts */
  const EXTRA = new Map();
  window.__illuShellAdd = (id, o) => { EXTRA.set(id, o); later(); };
  /* 1.2.109: Arrival/Departure - a calendar with a plane */
  IC.arrd = '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="m9 15.5 2.2-.6 2.4-2.6 1.3.3-1.3 2.4 1.9.4.6-.6.7.3-.6 1.2-1.4.3"/>';
  IC.cmpb = '<rect x="3.5" y="5" width="7.5" height="14" rx="1.5"/><rect x="13" y="5" width="7.5" height="14" rx="1.5"/>';
  const rail = document.createElement('nav');
  rail.id = 'shrail'; rail.setAttribute('aria-label', 'Main menu');
  const LH = '<svg class="shlh" viewBox="0 0 40 100" aria-hidden="true"><circle cx="20" cy="3.2" r="2.3"/><path d="M20 5.4 29.6 17H10.4Z"/><rect class="shlhlamp" x="12.6" y="17" width="14.8" height="11"/><rect x="8.4" y="28" width="23.2" height="3.5"/><path d="M13.4 31.5C12.6 50 11.2 71 9 88h22c-2.2-17-3.6-38-4.4-56.5Z"/><rect class="shlhband" x="9.8" y="56" width="20.4" height="3.2"/><path d="M6.6 88h26.8l2.6 7.6H4Z"/><rect x="1.6" y="95.6" width="36.8" height="4.4"/></svg>';
  IC.fav = '<path d="M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.6 12 20 12 20z"/>';
  IC.team = IC.com;
  IC.appr = '<circle cx="12" cy="12" r="8.5"/><path d="m8 12.2 2.8 2.8L16 9.5"/>';
  IC.tie = '<path d="M12 4v16M7.5 20h9M4.5 8h15M7 8l-3 6a3 3 0 0 0 6 0zM17 8l-3 6a3 3 0 0 0 6 0z"/>';
  IC.cxl = '<circle cx="12" cy="12" r="8.5"/><path d="m9 9 6 6M15 9l-6 6"/>';
  function railHTML(){
    let h = '<button type="button" class="shbrand" data-shv="today" aria-label="Illuménoctis — Today"><i class="shbeam"></i><i class="shglow"></i>' + LH + '</button>';
    for(const [g, items] of MENU){
      if(g) h += '<div class="shgrp">' + H(L(g[0], g[1])) + '</div>';
      for(const it of items){
        const v = it[0], gi = GROUPS[v];
        h += '<button type="button" class="shnv" data-shv="' + v + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + (IC[gi ? gi.icon : v] || '') + '</svg>' +
          '<span class="shnl"></span><em class="shnc"></em><i class="shdot"></i>' + (v === 'g-more' ? '<b class="shmorel">' + H(L('More', '더보기')) + '</b>' : '') + '</button>';
      }
    }
    const cl = false && window.illu && window.illu.claudeToggle ? '<button type="button" class="shnv shclaude" data-clbtn="1" aria-label="Claude"><span class="shclg" aria-hidden="true">✦</span><span class="shnl">Claude</span></button>' : '';
    h += '<div class="shfoot">' + cl + '<button type="button" class="shnv shsearch" data-shk><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="shnl"></span><kbd>Ctrl K</kbd></button></div>';
    return h;
  }
  /* the label and count come from the old tab button, so a translation or a renamed tab shows here too */
  function tabText(v){
    if(TABLAB[v]) return L(TABLAB[v][0], TABLAB[v][1]);
    const ex = EXTRA.get(v); if(ex) return L(ex.label[0], ex.label[1]);
    if(v === 'today') return L('Today', '오늘');
    const b = document.getElementById('v-' + v); if(!b) return '';
    let t = ''; for(const n of b.childNodes) if(n.nodeType === 3) t += n.textContent;
    t = t.trim() || b.textContent.replace((b.querySelector('.vn') || {}).textContent || '', '').trim();
    if(v === 'arr' && /^(Updates|업데이트)$/.test(t)) t = 'Suggestiones';
    return t;
  }
  /* only the number: "1038 agencies" reads 1038 in the menu, the words would push the name out */
  function tabCount(v){
    const ex = EXTRA.get(v); if(ex) return ex.count ? String(ex.count() || '') : '';
    const n = document.getElementById('vn-' + v); if(!n) return ''; const t = n.textContent.trim(); const m = t.match(/^[\d][\d,.\s·]*/); return m ? m[0].trim() : (t.length <= 6 ? t : '');
  }
  const exists = v => v === 'today' || EXTRA.has(v) || !!document.getElementById('v-' + v);
  const lastOf = g => { try{ const v = localStorage.getItem('illu.shlast.' + g); if(v && GROUPS[g].tabs.includes(v) && exists(v)) return v; }catch(e){} return GROUPS[g].tabs.find(exists) || GROUPS[g].tabs[0]; };
  let page = 'today';
  function paintRail(){
    if(!rail.firstChild || rail.dataset.lang !== String(isKO())){ rail.innerHTML = railHTML(); rail.dataset.lang = String(isKO()); }
    const wait = window.__illuVoteWaiting ? window.__illuVoteWaiting() : 0;
    rail.querySelectorAll('.shnv[data-shv]').forEach(b => {
      const v = b.dataset.shv, gi = GROUPS[v];
      b.hidden = gi ? !gi.tabs.some(exists) : !exists(v);
      const lab = gi ? L(gi.label[0], gi.label[1]) : tabText(v);
      let c = gi ? '' : (v === 'today' ? '' : tabCount(v));
      const l = b.querySelector('.shnl'); if(l.textContent !== lab) l.textContent = lab;
      b.setAttribute('aria-label', lab + (c ? ' (' + c + ')' : ''));
      const beacon = (v === 'today' || v === 'g-opus') && wait > 0;
      b.classList.toggle('has', beacon || (v === 'g-opus' && (() => { try{ return [...BOOK.values()].some(x => !(x.st === 'done' || x.st === 'canc')); }catch(e){ return false; } })()));
      b.classList.toggle('beacon', beacon);
      b.title = beacon ? L(wait + ' waiting for your vote', '내 투표 대기 ' + wait) : '';
      const e = b.querySelector('.shnc'); if(e.textContent !== c) e.textContent = c;
      const on = gi ? gi.tabs.includes(page) : v === page;
      if(b.classList.contains('on') !== on){ b.classList.toggle('on', on); if(on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
    });
    const s = rail.querySelector('.shsearch .shnl'); if(s) s.textContent = L('Search', '검색');
    /* the Claude button keeps the open/closed look of the old one (illu-claude.js paints every [data-clbtn]) */
    const c0 = document.querySelector('.viewbar [data-clbtn]'), c1 = rail.querySelector('.shclaude');
    if(c0 && c1 && c1.getAttribute('aria-pressed') !== c0.getAttribute('aria-pressed')) c1.setAttribute('aria-pressed', c0.getAttribute('aria-pressed') || 'false');
  }
  window.__illuShellRepaint = () => later();
  /* 1.2.129: which page is showing, for the + New card button (illu-newcard.js) */
  window.__illuPageNow = () => showing ? 'today' : page;
  /* the name beside the icon, on hover or keyboard focus */
  const tip = document.createElement('div'); tip.id = 'shtip'; tip.setAttribute('role', 'tooltip');
  function showTip(b){
    const lab = (b.querySelector('.shnl') || {}).textContent || '', c = (b.querySelector('.shnc') || {}).textContent || '';
    if(!lab){ hideTip(); return; }
    tip.innerHTML = H(lab) + (c ? '<small>' + H(c) + '</small>' : '');
    if(!tip.isConnected) document.body.appendChild(tip);
    const r = b.getBoundingClientRect();
    tip.style.left = (r.right + 10) + 'px'; tip.style.top = (r.top + r.height / 2 - tip.offsetHeight / 2) + 'px';
    tip.classList.add('on');
  }
  function hideTip(){ tip.classList.remove('on'); }
  rail.addEventListener('mouseover', e => { const b = e.target.closest('.shnv'); if(b) showTip(b); });
  rail.addEventListener('mouseleave', hideTip);
  rail.addEventListener('focusin', e => { const b = e.target.closest('.shnv'); if(b) showTip(b); });
  rail.addEventListener('focusout', hideTip);
  rail.addEventListener('click', hideTip);
  let rt = 0; const later = () => { if(!rt) rt = requestAnimationFrame(() => { rt = 0; paintRail(); paintTop(); paintSub(); }); };
  function paintSub(){
    let bar = document.getElementById('shsub');
    const g = showing ? '' : groupOf(page);
    if(!g){ if(bar) bar.hidden = true; const b2 = document.getElementById('shsub2'); if(b2) b2.hidden = true; return; }
    try{ localStorage.setItem('illu.shlast.' + g, page); }catch(e){}
    const host = document.getElementById('fbar') || document.getElementById('pane-arr'); if(!host) return;
    if(!bar){ bar = document.createElement('nav'); bar.id = 'shsub'; bar.setAttribute('role', 'tablist');
      bar.addEventListener('click', e => { const t = e.target.closest('[data-shsub],[data-shset]'); if(!t) return;
        let v = t.dataset.shsub;
        if(t.dataset.shset){ const s = (SETS[groupOf(page)] || []).find(x => x.id === t.dataset.shset); if(!s) return; v = setLast(s); }
        goingFromShell = true; try{ go(v); } finally { goingFromShell = false; } }); }
    if(bar.nextElementSibling !== host) host.parentNode.insertBefore(bar, host);
    bar.hidden = false;
    const sets = SETS[g], cur = sets ? setOf(g, page) : null;
    let h;
    if(sets){
      try{ if(cur) localStorage.setItem('illu.shset.' + cur.id, page); }catch(e){}
      const num = x => { const n = parseInt(String(tabCount(x) || '').replace(/[^\d]/g, ''), 10); return isNaN(n) ? 0 : n; };
      let wait = 0; try{ wait = window.__illuVoteWaiting ? window.__illuVoteWaiting() : 0; }catch(e){}
      h = sets.filter(s => s.tabs.some(exists)).map(s => {
        const one = s.tabs.filter(exists), lab = s.label ? L(s.label[0], s.label[1]) : tabText(one[0]), on = s === cur;
        const tot = one.reduce((a, x) => a + num(x), 0), hot = s.hot && wait > 0;
        return '<button type="button" role="tab" data-shset="' + s.id + '" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + (IC[s.icon] || IC[one[0]] || '') + '</svg><span>' + H(lab) + '</span>' +
          (hot ? '<em class="hot" title="' + H(L(wait + ' waiting for your vote', '내 투표 대기 ' + wait)) + '">' + wait + '</em>' : tot ? '<em>' + tot + '</em>' : '') + '</button>';
      }).join('');
    } else h = GROUPS[g].tabs.filter(exists).map(x => { const c = tabCount(x); return '<button type="button" role="tab" data-shsub="' + x + '" aria-selected="' + (x === page) + '" class="' + (x === page ? 'on' : '') + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + (IC[x] || '') + '</svg><span>' + H(tabText(x)) + '</span>' + (c ? '<em>' + H(c) + '</em>' : '') + '</button>'; }).join('');
    if(bar.__h !== h){ bar.__h = h; bar.innerHTML = h; }
    /* the boards inside the tab: a framed row under it */
    let b2 = document.getElementById('shsub2');
    const inner = cur ? cur.tabs.filter(exists) : [];
    if(inner.length < 2){ if(b2) b2.hidden = true; return; }
    if(!b2){ b2 = document.createElement('nav'); b2.id = 'shsub2'; b2.setAttribute('role', 'tablist');
      b2.addEventListener('click', e => { const t = e.target.closest('[data-shsub]'); if(t){ goingFromShell = true; try{ go(t.dataset.shsub); } finally { goingFromShell = false; } } }); }
    if(b2.previousElementSibling !== bar) bar.parentNode.insertBefore(b2, bar.nextSibling);
    b2.hidden = false;
    const h2 = inner.map(x => { const c = tabCount(x), lb = cur.sub[x] ? L(cur.sub[x][0], cur.sub[x][1]) : tabText(x), hot = x === 'tie' && /^[1-9]/.test(String(c || ''));
      return '<button type="button" role="tab" data-shsub="' + x + '" aria-selected="' + (x === page) + '" class="' + (x === page ? 'on' : '') + '"><span>' + H(lb) + '</span>' + (c ? '<em' + (hot ? ' class="hot"' : '') + '>' + H(c) + '</em>' : '') + '</button>'; }).join('');
    if(b2.__h !== h2){ b2.__h = h2; b2.innerHTML = h2; }
  }

  /* ---------- moving between pages ---------- */
  function curView(){ try{ return VIEW; }catch(e){ return 'arr'; } }
  let extra = '';
  function leaveExtra(){
    if(!extra) return;
    const o = EXTRA.get(extra); extra = ''; B.classList.remove('shextra');
    if(o && o.el){ o.el.hidden = true; o.el.classList.remove('shcur'); }
  }
  function showExtra(v){
    const o = EXTRA.get(v); if(!o) return;
    leaveToday(); leaveExtra();
    extra = v; page = v; B.classList.add('shextra');
    if(o.el){ o.el.hidden = false; o.el.classList.add('shcur'); }
    try{ localStorage.setItem('illu.shpage', v); }catch(e){}
    try{ o.show && o.show(); }catch(e){}
    later(); window.scrollTo(0, 0);
  }
  function go(v){
    if(GROUPS[v]){ go(lastOf(v)); return; }
    if(v === 'today'){ leaveExtra(); showToday(); return; }
    if(EXTRA.has(v)){ showExtra(v); return; }
    const b = document.getElementById('v-' + v);
    leaveToday(); leaveExtra();
    page = v;
    /* always press the tab, even when it is already the current one: coming back from Today or a new page,
       the page must draw itself again (Suggestiones showed no cards otherwise) */
    if(b) b.click();
    else try{ setView(v); }catch(e){}
    try{ localStorage.setItem('illu.shpage', v); }catch(e){}
    later();
    window.scrollTo(0, 0);
  }
  window.__illuGo = go;
  /* anything else that changes the page (a link inside a page, the old buttons) also leaves Today */
  try{
    const sv = window.setView;
    if(typeof sv === 'function' && !sv.__sh){
      const w = function(v){ const r = sv.apply(this, arguments); if(extra){ leaveExtra(); } if(!showing){ page = curView(); } later(); return r; };
      w.__sh = true; window.setView = w;
    }
  }catch(e){}
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#views [role="tab"]');
    if(t && (showing || extra) && !goingFromShell){ leaveToday(); leaveExtra(); page = t.id.slice(2); later(); }
  }, true);
  let goingFromShell = false;
  rail.addEventListener('click', e => {
    if(e.target.closest('[data-shk]')){ openK(); return; }
    if(e.target.closest('.shbrand')) setTimeout(flare, 60);
    const b = e.target.closest('[data-shv]'); if(!b) return;
    if(b.dataset.shv === 'g-more'){ e.preventDefault(); if(moreEl && !moreEl.hidden && moreEl.__by === 'click') closeMore(); else openMore(b, 'click'); return; }
    goingFromShell = true; try{ go(b.dataset.shv); } finally { goingFromShell = false; }
  });
  /* ---------- 1.2.177: the More menu (Backlog · 404 · Blind spots) ---------- */
  let moreEl = null, moreT = 0;
  const phoneRail = () => { const r = rail.getBoundingClientRect(); return r.width > r.height; };
  function moreHTML(){
    const g = GROUPS['g-more'];
    return '<div class="shmh">' + H(L('More', '더보기')) + '</div>' + g.tabs.filter(exists).map(v => { const c = tabCount(v), sub = TABSUB[v];
      return '<button type="button" role="menuitem" class="shmi' + (v === page ? ' on' : '') + '" data-shmore="' + v + '"><span class="shmic"><svg viewBox="0 0 24 24" aria-hidden="true">' + (IC[v] || '') + '</svg></span>' +
        '<span class="shmt"><b>' + H(tabText(v)) + '</b>' + (sub ? '<small>' + H(L(sub[0], sub[1])) + '</small>' : '') + '</span>' + (c ? '<em>' + H(c) + '</em>' : '') + '</button>'; }).join('') +
      (phoneRail() ? '<button type="button" class="shmclose" data-shmclose>' + H(L('Close', '닫기')) + '</button>' : '');
  }
  function openMore(b, by){
    clearTimeout(moreT); hideTip();
    if(!moreEl){
      moreEl = document.createElement('div'); moreEl.id = 'shmore'; moreEl.setAttribute('role', 'menu'); moreEl.hidden = true; document.body.appendChild(moreEl);
      moreEl.addEventListener('click', e => { if(e.target === moreEl || e.target.closest('[data-shmclose]')){ closeMore(); return; }
        const t = e.target.closest('[data-shmore]'); if(!t) return; closeMore(); goingFromShell = true; try{ go(t.dataset.shmore); } finally { goingFromShell = false; } });
      moreEl.addEventListener('mouseenter', () => clearTimeout(moreT));
      moreEl.addEventListener('mouseleave', () => { if(moreEl.__by === 'hover') moreT = setTimeout(closeMore, 250); });
    }
    moreEl.innerHTML = '<div class="shmbox">' + moreHTML() + '</div>';
    moreEl.__by = by; moreEl.hidden = false;
    const sheet = phoneRail(); moreEl.classList.toggle('sheet', sheet);
    const box = moreEl.firstChild;
    if(!sheet){ const r = b.getBoundingClientRect(); box.style.left = (r.right + 10) + 'px'; box.style.top = Math.max(8, Math.min(innerHeight - box.offsetHeight - 8, r.top - 8)) + 'px'; }
    else { box.style.left = ''; box.style.top = ''; }
    b.setAttribute('aria-expanded', 'true');
    const f = box.querySelector('[data-shmore]'); if(by !== 'hover' && f) try{ f.focus({preventScroll: true}); }catch(e){}
  }
  function closeMore(){ clearTimeout(moreT); if(!moreEl || moreEl.hidden) return; moreEl.hidden = true; const b = rail.querySelector('[data-shv="g-more"]'); if(b) b.setAttribute('aria-expanded', 'false'); }
  rail.addEventListener('mouseover', e => { const b = e.target.closest('[data-shv="g-more"]'); if(b && !phoneRail() && (!moreEl || moreEl.hidden)) openMore(b, 'hover'); else if(b) clearTimeout(moreT); });
  rail.addEventListener('mouseout', e => { const b = e.target.closest('[data-shv="g-more"]'); if(b && moreEl && moreEl.__by === 'hover' && !(e.relatedTarget && moreEl.contains(e.relatedTarget))) moreT = setTimeout(closeMore, 250); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && moreEl && !moreEl.hidden){ closeMore(); const b = rail.querySelector('[data-shv="g-more"]'); if(b) b.focus(); } });
  document.addEventListener('mousedown', e => { if(moreEl && !moreEl.hidden && !moreEl.contains(e.target) && !(e.target.closest && e.target.closest('[data-shv="g-more"]'))) closeMore(); }, true);

  /* ---------- Today ---------- */
  let showing = false, pane = null, ckHome = null;
  function ensurePane(){
    if(pane) return pane;
    const ref = document.getElementById('pane-arr');
    pane = document.createElement('div');
    pane.id = 'pane-today'; pane.className = 'pane shtoday'; pane.hidden = true;
    if(ref && ref.parentNode) ref.parentNode.insertBefore(pane, ref); else document.body.appendChild(pane);
    pane.addEventListener('click', onTodayClick);
    return pane;
  }
  function showToday(){
    ensurePane();
    showing = true; page = 'today';
    B.classList.add('shtoday');
    pane.hidden = false;
    try{ localStorage.setItem('illu.shpage', 'today'); }catch(e){}
    renderToday();
    later();
    window.scrollTo(0, 0);
  }
  function leaveToday(){
    if(!showing) return;
    showing = false; B.classList.remove('shtoday');
    { const ab = document.getElementById('abck'); if(ab && ab.__t0 != null){ ab.title = ab.__t0; ab.__t0 = null; ab.classList.remove('shwoff'); } }
    if(pane) pane.hidden = true;
    putClocksBack();
  }
  /* the clocks and the continent map live on Today now: the same element, moved, so it keeps ticking */
  function takeClocks(slot){
    const ck = document.querySelector('.ckrow'); if(!ck || !slot) return;
    if(!ckHome){ ckHome = {p: ck.parentNode, n: ck.nextSibling}; }
    if(ck.parentNode !== slot) slot.appendChild(ck);
  }
  function putClocksBack(){
    const ck = document.querySelector('.ckrow'); if(!ck || !ckHome) return;
    if(ck.parentNode !== ckHome.p){ try{ ckHome.p.insertBefore(ck, ckHome.n && ckHome.n.parentNode === ckHome.p ? ckHome.n : null); }catch(e){ ckHome.p.appendChild(ck); } }
  }
  const pad = n => String(n).padStart(2, '0');
  const dayStr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const STG = [['email', 'Email', '이메일'], ['guar', 'Guarantee', '개런티'], ['contract', 'Contract', '계약'], ['visa', 'Visa', '비자'], ['flight', 'Flight', '항공권']];
  function stageOf(c){
    const s = c.s || {};
    let done = 0; for(const [k] of STG) if(s[k] && s[k].d) done++;
    const at = STG.find(([k]) => !(s[k] && s[k].d));
    if(!at) return {done, i: -1};
    const x = s[at[0]] || {};
    const note = String(x.t || '').split('\n').map(l => l.trim()).filter(Boolean);
    return {done, i: STG.indexOf(at), k: at[0], lab: L(at[1], at[2]), busy: x.p === 'y', note: note.length ? note[note.length - 1] : ''};
  }
  function people(pid){ try{ const p = PEOPLE.get(pid); return p ? p.n : ''; }catch(e){ return ''; } }
  function disc(pid){ try{ return idDisc(pid, 'shdisc') || ''; }catch(e){ return ''; } }
  function photoOf(c){ try{ return (window.__illuBkPic ? window.__illuBkPic(c, 200) : bkPhoto(c)) || ''; }catch(e){ return ''; } }
  function inProc(){
    let all = []; try{ all = [...BOOK.values()]; }catch(e){}
    const me = (() => { try{ return ME; }catch(e){ return null; } })();
    /* 1.2.98: whoever confirmed a card into Booking is in charge of it - Today lists my own cards,
       then the cards nobody has taken (user, 7 Nov 2026) */
    return all.filter(c => !(c.st === 'done' || c.st === 'canc') && (!c.by || c.by === me))
      .sort((a, b) => ((b.by === me) - (a.by === me)) || ((b.o || 0) - (a.o || 0)));
  }
  function counts(){
    const now = new Date(), y = new Date(now); y.setDate(y.getDate() - 1);
    const ys = dayStr(y);
    let lamps = 0; const who = new Set();
    try{ for(const e of BLOG){ if(String(e.ts) >= ys && (e.v === 'g' || e.v === 'y' || e.v === 'r')){ lamps++; who.add(e.p); } } }catch(e){}
    let gone = 0, goneAll = 0;
    try{ for(const r of MDEL.values()){ if(r.st !== 'del') continue; goneAll++; if(String(r.at || '').slice(0, 10) >= ys) gone++; } }catch(e){}
    let opened = 0;
    try{ for(const c of BOOK.values()){ if(c.at && dayStr(new Date(c.at)) >= ys) opened++; } }catch(e){}
    return {lamps, who: who.size, gone, goneAll, opened, ys};
  }
  function greet(){
    const h = new Date().getHours();
    return h < 12 ? L('Good morning', '좋은 아침입니다') : h < 18 ? L('Good afternoon', '좋은 오후입니다') : L('Good evening', '좋은 저녁입니다');
  }
  function dateLine(){
    try{ return new Date().toLocaleDateString(isKO() ? 'ko-KR' : 'en-GB', {weekday: 'long', day: 'numeric', month: 'long'}); }catch(e){ return ''; }
  }
  const VERB = {g: ['lit', '초록불', 'g', 'Interested', '관심'], y: ['put on amber', '보류', 'y', 'Pending', '보류'], r: ['ruled out', '제외', 'r', 'Ruled out', '제외'], x: ['cleared the lamp on', '램프 해제', '', '', '']};
  function teamRows(){
    let rows = []; try{ rows = BLOG.slice(-8).reverse(); }catch(e){}
    if(!rows.length) return '<p class="shmut">' + L('Nothing in the backlog yet.', '아직 백로그가 비어 있습니다.') + '</p>';
    return rows.map(e => {
      const v = VERB[e.v] || VERB.x;
      const tag = v[2] ? '<span class="shtag ' + v[2] + '">' + H(L(v[3], v[4])) + '</span>' : '';
      const when = String(e.ts || '').replace(/^(\d{4})-(\d\d)-(\d\d) /, (m, Y, M, D) => (Y + '-' + M + '-' + D === dayStr(new Date()) ? '' : D + '/' + M + ' '));
      return '<div class="shact">' + disc(e.p) + '<div><b>' + H(people(e.p) || '?') + '</b> ' + H(isKO() ? '' : v[0]) + ' <b>' + H(e.nm || '') + '</b> ' + tag +
        '<div class="shmut sm">' + H([e.ag, when].filter(Boolean).join(' · ')) + '</div></div></div>';
    }).join('');
  }
  /* 1.2.156 (approved demo): two of us on the same model - shown to both people at the top of Needs my action */
  function ovRows(){
    let ov = []; try{ ov = window.__illuOverlaps ? window.__illuOverlaps() : []; }catch(e){}
    let me = null; try{ me = ME; }catch(e){}
    ov = ov.filter(o => o.people.includes(me)); if(!ov.length) return '';
    const nm = p => { try{ const r = PEOPLE.get(p); return r ? r.n : ''; }catch(e){ return ''; } };
    return ov.slice(0, 4).map(o => '<div class="shov"><i></i><div><b>' + H(L('Two of us on ' + (o.nm || 'the same model'), (o.nm || '') + ' — 두 명이 같은 모델 작업 중')) + '</b><span>' + H((o.ag || '') + ' · ' + o.people.map(nm).join(' & ') + ' · ' + (o.why === 'vote' ? L(nm(o.people[0]) + ' has her booking card, ' + nm(o.people[1]) + ' sent her to the Team Vote', nm(o.people[0]) + ' 부킹 카드, ' + nm(o.people[1]) + ' 팀 투표') : L('two booking cards', '부킹 카드 2장'))) + '</span>' +
      '<div class="shovb"><button type="button" class="shlink" data-shbk="' + H(o.a.id) + '">' + L('Open her card', '카드 열기') + '</button>' + (o.b ? '<button type="button" class="shlink" data-shbk="' + H(o.b.id) + '">' + L('Open the other card', '다른 카드 열기') + '</button>' : '') + '</div></div></div>').join('');
  }
  function bookRows(list){
    if(!list.length) return '<p class="shmut">' + L('Nothing in your charge right now.', '지금 내가 담당하는 카드가 없습니다.') + ' <button type="button" class="shlink" data-shgo="bk">' + L('Booking board', '부킹 보드') + ' →</button></p>';
    let me = null; try{ me = ME; }catch(e){}
    return list.slice(0, 6).map(c => {
      const st = stageOf(c), ph = photoOf(c);
      const ini = '<i>' + H(String(c.nm || '?').charAt(0)) + '</i>';
      const pic = ph ? '<img src="' + H(ph) + '" alt="" loading="lazy" referrerpolicy="no-referrer" data-shini="' + H(String(c.nm || '?').charAt(0)) + '">' : ini;
      const line = st.i < 0 ? L('Every stage done — ready to mark Completed', '모든 단계 완료 — 완료로 옮길 수 있습니다')
        : st.lab + ' · ' + (st.busy ? L('in process', '진행 중') : L('not started', '시작 전')) + (st.note ? ' — ' + st.note : '');
      return '<button type="button" class="shbk" data-shbk="' + H(c.id) + '"><span class="shpic">' + pic + '</span><span class="shbkt"><span><b>' + H(c.nm || L('(no name)', '(이름 없음)')) + '</b>' +
        (c.ag ? ' <span class="shmut">· ' + H(c.ag) + '</span>' : '') + '</span>' +
        '<span class="shmut sm shclip">' + (c.by ? '' : '<b class="shnone">' + L('No one in charge', '담당자 없음') + '</b> · ') + H(line) + '</span></span>' +
        '<span class="shring" title="' + H(L(st.done + ' of 5 stages done', '5단계 중 ' + st.done + '단계 완료')) + '" style="--p:' + (st.done / 5) + '"><b>' + st.done + '/5</b></span></button>';
    }).join('') + (list.length > 6 ? '<button type="button" class="shlink" data-shgo="bk">' + L('All ' + list.length + ' in Processing', '진행 중 ' + list.length + '건 모두 보기') + ' →</button>' : '');
  }
  function picks(){
    const R = window.__illuPicks; if(!R) return '';
    let out = [];
    try{
      const busy = k => { try{ return !!lampOf(k) || inBooking(k); }catch(e){ return false; } };
      /* the three best-scored women and the three best-scored men, by the Korean-market bands */
      const all = R.kr().filter(m => !busy(m.key)).map(m => ({m, s: R.score(m)})).filter(x => x.s != null)
        .sort((a, b) => b.s - a.s || a.m.nm.localeCompare(b.m.nm));
      out = all.filter(x => x.m.g !== 'M').slice(0, 3).concat(all.filter(x => x.m.g === 'M').slice(0, 3)).map(x => x.m);
    }catch(e){ out = []; }
    if(!out.length) return '';
    /* the same card as everywhere else (illu-dir2.js); the photo opens the Korean-market list */
    return '<div class="shkick" style="margin-top:6px">' + L('Korean-market picks', '한국 시장 추천') + '</div><div class="shpicks">' +
      out.map(m => { let h = ''; try{ h = window.__illuCard ? window.__illuCard(m, {kor: true}) : ''; }catch(e){} return h.replace('<article class="uc"', '<article class="uc" data-shkor'); }).join('') + '</div>';
  }
  function dirStats(){
    let ags = 0, profiles = 0;
    try{ const N = window.__illuNets ? window.__illuNets() : []; ags = N.length; for(const n of N) for(const b of n.boards) profiles += (b.m || []).length; }catch(e){}
    const f = n => n.toLocaleString(isKO() ? 'ko-KR' : 'en-GB');
    return '<div class="shkick" style="margin-top:8px">' + L('Directory', '디렉터리') + '</div>' +
      '<div class="shrow"><span>' + L('Profiles on boards', '보드의 프로필') + '</span><b>' + f(profiles) + '</b></div>';
  }
  function renderToday(){
    if(!pane || !showing) return;
    const list = inProc();
    let all = 0; try{ all = [...BOOK.values()].filter(c => !(c.st === 'done' || c.st === 'canc')).length; }catch(e){}
    let nm = ''; try{ const r = meRec(); nm = r ? r.n : ''; }catch(e){}
    const sub = all
      ? L(all + (all === 1 ? ' booking card is' : ' booking cards are') + ' in Processing.', '진행 중인 부킹 카드 ' + all + '건.')
      : L('No booking cards in Processing.', '진행 중인 부킹 카드가 없습니다.');
    /* 7 Nov 2026 (user): date, the greeting right under it, the clocks moved up; the vote box and
       Needs my action side by side - no Open Booking or Search buttons */
    const W = wid();
    const tg = (k, on, en, ko, ic) => '<button type="button" class="shwt' + (on ? ' on' : '') + '" data-shwid="' + k + '" aria-pressed="' + on + '" title="' + H(on ? L('Hide ', '숨기기: ') : L('Show ', '보이기: ')) + H(L(en, ko)) + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ic + '</svg><span>' + H(L(en, ko)) + '</span><i>' + (on ? '▾' : '▸') + '</i></button>';
    /* 1.2.114 (user, 9 Nov 2026): the side panel goes up beside the greeting; it sits under the clocks and the map
       while they are open and moves back up when they close. It is split in two: Needs my action on top,
       Arriving / Departing in the next 7 days below (the Arrival/Departure board's colours). On a phone the
       two halves are tabs. */
    const ckOn = W.clk || W.map;
    const h =
      '<div class="shlay' + (ckOn ? '' : ' noclk') + '">' +
      '<div class="shclk' + (W.clk ? '' : ' noclk') + (W.map ? '' : ' nomap') + (ckOn ? '' : ' none') + '" id="shclk"></div>' +
      '<div class="shhead"><div><div class="shkick">' + H(dateLine()) + '</div><h2>' + H(greet() + (nm ? ', ' + nm : '')) + ' <span class="shsub2">— ' + H(sub) + '</span></h2></div></div>' +
      '<div class="shmainc">' + (window.__illuVoteToday ? window.__illuVoteToday() : '<div></div>') + '</div>'   /* 1.2.158 (user): the On-Stay row taken off Today again - the board stays in Opus */ +
      sidePanel(list) +
      '</div>';
    /* the clocks are a live element: lift them out before the page is redrawn, or they go with it */
    if(pane.__h !== h){ pane.__h = h; const sc = [...pane.querySelectorAll('.shscr')].map(e => e.scrollTop); putClocksBack(); pane.innerHTML = h; pane.querySelectorAll('.shscr').forEach((e, i) => { if(sc[i]) e.scrollTop = sc[i]; }); }
    takeClocks(pane.querySelector('#shclk'));
    { const ab = document.getElementById('abck'); if(ab){ if(ab.__t0 == null) ab.__t0 = ab.title; ab.classList.toggle('shwoff', !(W.clk || W.map)); ab.title = W.clk || W.map ? L('Hide the clocks and the map', '시계와 지도 숨기기') : L('Show the clocks and the map', '시계와 지도 보이기'); } }
    /* a photo that does not open shows the initial instead of a broken picture */
    pane.querySelectorAll('img[data-shini]').forEach(im => { if(im.__sh) return; im.__sh = 1; im.addEventListener('error', () => { const i = document.createElement('i'); i.textContent = im.dataset.shini; im.replaceWith(i); }); });
    try{ if(measState === 'idle') loadMeas(); }catch(e){}
    sizeSide();
  }
  window.__illuTodayRender = () => renderToday();
  /* ---------- the side panel (1.2.114) ---------- */
  const SP = {tab: 'act', f: 'all', day: -1};
  try{ const v = JSON.parse(localStorage.getItem('illu.shside') || '{}') || {}; if(v.tab === 'ad') SP.tab = 'ad'; if(['a', 'd'].includes(v.f)) SP.f = v.f; }catch(e){}
  const keepSP = () => { try{ localStorage.setItem('illu.shside', JSON.stringify({tab: SP.tab, f: SP.f})); }catch(e){} };
  function soon(){ try{ return window.__illuArrSoon ? window.__illuArrSoon(7) : []; }catch(e){ return []; } }
  function sidePanel(list){
    const ev = soon();
    const tabs = '<div class="shtabs" role="tablist">' +
      '<button type="button" role="tab" data-shtab="act" aria-selected="' + (SP.tab === 'act') + '">' + L('Needs my action', '내가 처리할 일') + '<b>' + list.length + '</b></button>' +
      '<button type="button" role="tab" data-shtab="ad" aria-selected="' + (SP.tab === 'ad') + '">' + L('Arriving/Departing', '입국/출국') + '<b>' + ev.length + '</b></button>' + (SP.tab === 'act' ? '<button type="button" class="shinfo shtabi" data-shinfo aria-expanded="' + !!SP.info + '" aria-label="' + H(L('What is this list?', '이 목록은?')) + '" title="' + H(L('What is this list?', '이 목록은?')) + '">i</button>' : '') + '</div>';
    return '<aside class="shside" id="shside" aria-label="' + H(L('Side panel', '사이드 패널')) + '">' + tabs +
      '<section class="shhalf" data-shh="act"' + (SP.tab === 'act' ? '' : ' data-off') + '><div class="shph"><h3>' + L('Needs my action', '내가 처리할 일') + ' ' + '<button type="button" class="shinfo" data-shinfo aria-expanded="' + !!SP.info + '" aria-label="' + H(L('What is this list?', '이 목록은?')) + '" title="' + H(L('What is this list?', '이 목록은?')) + '">i</button>' + '</h3><span class="shtag y">' + list.length + '</span></div>' +
        (SP.info ? '<div class="shinfop" role="note">' + L('Booking cards you are in charge of, at the stage each is on — then cards nobody has taken yet.', '내가 담당하는 부킹 카드와 현재 단계 — 그다음 담당자가 없는 카드.') + '</div>' : '') + '<div class="shscr">' + ovRows() + bookRows(list) + '</div></section>' +
      '<section class="shhalf" data-shh="ad"' + (SP.tab === 'ad' ? '' : ' data-off') + '>' + adHalf(ev) + '</section></aside>';
  }
  function adHalf(ev){
    const B = window.__illuArrBits || {}, T = new Date(); T.setHours(0, 0, 0, 0);
    const loc = isKO() ? 'ko-KR' : 'en-GB';
    let wk = '';
    for(let i = 0; i < 7; i++){
      const d = new Date(T.getFullYear(), T.getMonth(), T.getDate() + i), e = ev.filter(x => x.day === i);
      const wd = i === 0 ? L('TODAY', '오늘') : d.toLocaleDateString(loc, {weekday: 'short'}).toUpperCase();
      wk += '<button type="button" class="shwd' + (i === 0 ? ' today' : '') + (d.getDay() === 0 ? ' sun' : d.getDay() === 6 ? ' sat' : '') + '" data-shday="' + i + '" aria-pressed="' + (SP.day === i) + '" title="' + H(d.toLocaleDateString(loc, {weekday: 'long', day: 'numeric', month: 'long'}) + ' · ' + L(e.filter(x => x.k === 'a').length + ' arriving, ' + e.filter(x => x.k === 'd').length + ' departing', '도착 ' + e.filter(x => x.k === 'a').length + ' · 출국 ' + e.filter(x => x.k === 'd').length)) + '">' +
        '<small>' + H(wd) + '</small><b>' + d.getDate() + '</b><span>' + e.map(x => '<i class="' + x.k + '"></i>').join('') + '</span></button>';
    }
    const chip = (k, en, ko) => '<button type="button" class="shchip" data-shf="' + k + '" aria-pressed="' + (SP.f === k) + '">' + L(en, ko) + '</button>';
    const L2 = ev.filter(x => (SP.f === 'all' || x.k === SP.f) && (SP.day < 0 || x.day === SP.day));
    const row = x => {
      const c = x.m.c, ph = B.photo ? B.photo(c) : '';
      const pic = ph ? '<img src="' + H(ph) + '" alt="" loading="lazy" referrerpolicy="no-referrer" data-shini="' + H(String(x.m.nm || '?').charAt(0)) + '">' : '<i>' + H(String(x.m.nm || '?').charAt(0)) + '</i>';
      const dd = x.day === 0 ? L('Today', '오늘') : 'D-' + x.day;
      const tm = x.hasT ? x.t : L('time not set', '시간 미입력');
      return '<button type="button" class="shad ' + x.k + (x.at <= Date.now() && x.hasT ? ' past' : x.day <= 1 ? ' soon' : '') + '" data-shbk="' + H(c.id) + '">' +
        '<span class="shpic">' + pic + '</span>' +
        '<span class="shadt"><span class="shclip"><b>' + H(x.m.nm) + '</b>' + (x.m.ag ? ' <span class="shmut sm">· ' + H(x.m.ag) + '</span>' : '') + '</span>' +
        '<span class="shadc"><span class="adg net shv">' + H(B.VIS ? B.VIS(x.m.vty) : '') + '</span>' + (B.guarChip ? B.guarChip(c) : '') + '</span>' +
        '<span class="shadf"><b>' + H((B.wdS ? B.wdS(x.at) : '') + ' ' + (B.fmt ? B.fmt(x.at) : '') + ' · ' + tm) + '</b>' + (x.f.no || x.ap ? ' ' + (x.k === 'a' ? '✈ ' : '↗ ') + H([x.f.no, x.ap].filter(Boolean).join(' · ')) : '') + '</span></span>' +
        '<span class="shadw"><b>' + dd + '</b><span class="shadcd">' + (x.at <= Date.now() && x.hasT ? (x.k === 'a' ? L('Arrived', '도착함') : L('Departed', '출국함')) : (x.k === 'a' ? L('Arrives ', '도착 ') : L('Departs ', '출국 ')) + '<span data-adcd="' + x.at.getTime() + '">' + L('in ', '') + (B.cdown ? B.cdown(x.at) : '') + L('', ' 후') + '</span>') + '</span></span></button>';
    };
    const A = L2.filter(x => x.k === 'a'), D = L2.filter(x => x.k === 'd');
    const body = (A.length ? '<div class="shadg">' + L('Arriving · soonest first', '도착 · 빠른 순') + '</div>' + A.map(row).join('') : '') +
      (D.length ? '<div class="shadg">' + L('Departing · soonest first', '출국 · 빠른 순') + '</div>' + D.map(row).join('') : '') ||
      '<p class="shmut sm" style="margin:6px 4px">' + (SP.day >= 0 ? L('No one arrives or departs that day.', '그날 도착하거나 출국하는 모델이 없습니다.') : L('No one arrives or departs in the next 7 days.', '앞으로 7일 동안 도착하거나 출국하는 모델이 없습니다.')) + '</p>';
    return '<div class="shph"><h3>' + L('Arriving / Departing · next 7 days', '입국 / 출국 · 앞으로 7일') + '</h3><span class="shtag y">' + ev.length + '</span></div>' +
      '<div class="shweek">' + wk + '</div><div class="shchips">' + chip('all', 'All', '전체') + chip('a', 'Arriving', '도착') + chip('d', 'Departing', '출국') +
      '<button type="button" class="shlink" data-shgo="arrd" style="margin-left:auto">' + L('Board', '보드') + ' →</button></div><div class="shscr">' + body + '</div>';
  }
  /* the panel reaches down to the bottom of the window; its halves scroll on their own */
  function sizeSide(){
    const sd = pane && pane.querySelector('#shside'); if(!sd) return;
    if(innerWidth <= 1100){ sd.style.height = ''; return; }
    let sp = sd.parentElement; while(sp && sp !== document.body && !/(auto|scroll)/.test(getComputedStyle(sp).overflowY)) sp = sp.parentElement;
    const top = sd.getBoundingClientRect().top + (sp && sp !== document.body ? sp.scrollTop : scrollY) - (sp && sp !== document.body ? sp.getBoundingClientRect().top : 0);
    const vh = sp && sp !== document.body ? sp.clientHeight : innerHeight;
    sd.style.height = Math.max(520, Math.round(vh - top - 22)) + 'px';
  }
  addEventListener('resize', () => { if(showing) sizeSide(); });
  /* when the clocks open or close, the panel slides to its new place instead of jumping */
  function slideSide(fn){
    const sd = pane && pane.querySelector('#shside'), y0 = sd ? sd.getBoundingClientRect().top : null;
    fn();
    const s2 = pane && pane.querySelector('#shside'); if(!s2 || y0 == null) return;
    const dy = y0 - s2.getBoundingClientRect().top; if(!dy || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try{ s2.animate([{transform: 'translateY(' + dy + 'px)'}, {transform: 'none'}], {duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)'}); }catch(e){}
  }
  function wid(){ let w = {}; try{ w = JSON.parse(localStorage.getItem('illu.shwid') || '{}') || {}; }catch(e){} return {clk: w.clk !== false, map: w.map !== false}; }
  function setWid(k){ const w = wid(); w[k] = !w[k]; try{ localStorage.setItem('illu.shwid', JSON.stringify(w)); }catch(e){} slideSide(renderToday); }
  /* the clock icon in the top bar opens and closes the widgets on Today too (user, 7 Nov 2026):
     both open -> both closed; anything closed -> both open */
  function setAllWid(){ const w = wid(), open = !(w.clk && w.map); try{ localStorage.setItem('illu.shwid', JSON.stringify({clk: open, map: open})); }catch(e){} slideSide(renderToday); }
  window.addEventListener('click', e => {
    if(!showing || !e.target.closest || !e.target.closest('#abck')) return;
    e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    setAllWid();
  }, true);
  function onTodayClick(e){
    if(e.target.closest('.vmk')) return;
    const wt = e.target.closest('[data-shwid]'); if(wt){ setWid(wt.dataset.shwid); return; }
    if(e.target.closest('[data-shinfo]')){ SP.info = !SP.info; renderToday(); return; }
    if(SP.info && !e.target.closest('.shinfop')){ SP.info = false; renderToday(); }
    const tb = e.target.closest('[data-shtab]'); if(tb){ SP.tab = tb.dataset.shtab; keepSP(); renderToday(); return; }
    const fc = e.target.closest('[data-shf]'); if(fc){ SP.f = fc.dataset.shf; keepSP(); renderToday(); return; }
    const dy = e.target.closest('[data-shday]'); if(dy){ const i = +dy.dataset.shday; SP.day = SP.day === i ? -1 : i; renderToday(); return; }
    if(window.__illuVoteToggleHook && window.__illuVoteToggleHook(pane, e)){ renderToday(); return; }
    const k = e.target.closest('[data-shk]'); if(k){ openK(); return; }
    const g = e.target.closest('[data-shgo]'); if(g){ go(g.dataset.shgo); return; }
    const b = e.target.closest('[data-shbk]'); if(b){ openBooking(b.dataset.shbk); return; }
    if(e.target.closest('[data-shkor] .ucph')){ try{ localStorage.setItem('illu.rctab', 'kor'); }catch(er){} go('arr');
      setTimeout(() => { const t = document.querySelector('#pane-arr [data-rctab="kor"]'); if(t && t.getAttribute('aria-selected') !== 'true') t.click(); }, 300); }
  }
  function openBooking(id){
    go('bk');
    /* the Booking board opens the card itself (illu-pipe.js) */
    if(window.__illuOpenBkCard && document.body.classList.contains('bkpipeon')){ setTimeout(() => window.__illuOpenBkCard(id), 150); return; }
    let n = 0;
    const look = () => {
      const el = document.querySelector('#pane-bk [data-bkid="' + CSS.escape(id) + '"]');
      if(el){ try{ el.scrollIntoView({block: 'center', behavior: 'smooth'}); }catch(er){} el.classList.add('shflash'); setTimeout(() => el.classList.remove('shflash'), 2200);
        /* the board redraws as it opens: if this card was replaced, mark the new one */
        if(n < 28) setTimeout(() => { if(!el.isConnected){ n++; look(); } }, 350); return; }
      if(++n < 30) setTimeout(look, 100);
    };
    setTimeout(look, 120);
  }
  window.__illuOpenBooking = openBooking;
  setInterval(() => { if(showing && !document.hidden) renderToday(); }, 30000);

  /* ---------- the top bar ---------- */
  /* the ILLUMÉNOCTIS wordmark moved from Today into the top bar (user, 7 Nov 2026); a click lights the lamp */
  const WMH = '<h1 class="wm" role="button" tabindex="0" aria-label="Illuménoctis — Today"><i class="beam"></i><span class="wmtxt">' + LH.replace('class="shlh"', 'class="lh"').replace('shlhlamp', 'lhlamp').replace('shlhband', 'lhband') + 'lluménoctis</span></h1>';
  function flare(){ const w = document.querySelector('#shwm .wm'); if(!w) return; w.classList.remove('fire'); void w.offsetWidth; w.classList.add('fire'); setTimeout(() => w.classList.remove('fire'), 900); }
  function paintTop(){
    const abi = document.querySelector('#appbar .abi'); if(!abi) return;
    let w = document.getElementById('shwm');
    if(!w){ w = document.createElement('span'); w.id = 'shwm'; w.innerHTML = WMH; abi.insertBefore(w, abi.firstChild);
      w.addEventListener('click', () => { flare(); goingFromShell = true; try{ go('today'); } finally { goingFromShell = false; } });
      w.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); w.click(); } }); }
    let t = document.getElementById('shtitle');
    if(!t){ t = document.createElement('b'); t.id = 'shtitle'; w.after(t); }
    const ex = extra && EXTRA.get(extra);
    const tl = ex && (ex.title || ex.label);
    const tt = ex ? L(tl[0], tl[1]) : L('Today', '오늘'); if(t.textContent !== tt) t.textContent = tt;
    let k = document.getElementById('shkbtn');
    if(!k){
      k = document.createElement('button'); k.type = 'button'; k.id = 'shkbtn';
      const tools = document.getElementById('abtools');
      abi.insertBefore(k, tools || abi.querySelector('.abr'));
      k.addEventListener('click', openK);
    }
    const kh = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span>' + H(L('Search models, agencies or pages', '모델, 에이전시, 페이지 검색')) + '</span><kbd>Ctrl K</kbd>';
    if(k.__h !== kh){ k.__h = kh; k.innerHTML = kh; }
  }

  /* ---------- Ctrl K ---------- */
  const K = document.createElement('div');
  K.id = 'shk'; K.hidden = true; K.setAttribute('role', 'dialog'); K.setAttribute('aria-modal', 'true'); K.setAttribute('aria-label', 'Search');
  K.innerHTML = '<div class="shkbox"><div class="shkin"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
    '<input type="text" id="shkq" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div><div class="shkres" id="shkres" role="listbox"></div></div>';
  let kSel = 0, kItems = [];
  function openK(){
    K.hidden = false; B.classList.add('shkon');
    const q = K.querySelector('#shkq'); q.placeholder = L('Type a model, an agency, a city, a booking card or a page…', '모델, 에이전시, 도시, 부킹 카드 또는 페이지 입력…');
    q.value = ''; kSearch(''); setTimeout(() => q.focus(), 0);
  }
  function closeK(){ K.hidden = true; B.classList.remove('shkon'); }
  function kSearch(q){
    const SB = window.__illuSB;
    const sq = s => SB ? SB.squash(s) : String(s || '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '');
    const t = sq(q);
    const out = [];
    /* pages */
    for(const [, items] of MENU) for(const it of items){
      const v = it[0]; if(GROUPS[v]) continue; const ex = EXTRA.get(v); if(v !== 'today' && !ex && !document.getElementById('v-' + v)) continue;
      const lab = v === 'today' ? L('Today', '오늘') : ex ? L(ex.label[0], ex.label[1]) : tabText(v);
      if(!t || sq(lab).includes(t) || sq(v).includes(t)) out.push({g: L('Pages', '페이지'), main: lab, sub: '', act: () => go(v)});
    }
    for(const g in GROUPS) for(const v of GROUPS[g].tabs) if(exists(v)){ const lab = tabText(v); if(!t || sq(lab).includes(t) || sq(v).includes(t)) out.push({g: L('Pages', '페이지'), main: lab, sub: L(GROUPS[g].label[0], GROUPS[g].label[1]), act: () => go(v)}); }
    if(t.length >= 2){
      /* booking cards */
      let bk = []; try{ bk = [...BOOK.values()]; }catch(e){}
      const ST = {done: L('Completed', '완료'), canc: L('Cancelled', '취소'), proc: L('Processing', '진행 중')};
      bk.filter(c => sq(c.nm).includes(t) || sq(c.ag).includes(t)).slice(0, 5).forEach(c => out.push({g: L('Booking cards', '부킹 카드'), main: c.nm || '', sub: [c.ag, ST[c.st === 'done' || c.st === 'canc' ? c.st : 'proc']].filter(Boolean).join(' · '), act: () => openBooking(c.id)}));
      if(SB){
        let I = null; try{ I = SB.index(); }catch(e){}
        if(I){
          I.ags.filter(x => x.s.includes(t)).sort((p, r) => (p.s.startsWith(t) ? 0 : 1) - (r.s.startsWith(t) ? 0 : 1) || p.s.length - r.s.length).slice(0, 5)
            .forEach(x => out.push({g: L('Agencies', '에이전시'), main: x.nt.name, sub: x.nt.offices.map(o => o.city).filter(Boolean).slice(0, 3).join(' · '), act: () => toDir(() => SB.goAgency(x.nt.domain || x.nt.name))}));
          const seen = new Set(); let n = 0;
          for(const m of I.mods){ if(n >= 6) break; if(m.s.startsWith(t) && !seen.has(m.s + m.a.domain)){ seen.add(m.s + m.a.domain); n++;
            out.push({g: L('Models', '모델'), main: m.nm, sub: m.a.name + (m.a.city ? ' · ' + m.a.city : ''), act: () => toDir(() => SB.goAgency(m.a.domain || m.a.name, m.key || ''))}); } }
          I.cities.filter(c => sq(c.c).startsWith(t)).sort((p, r) => r.n - p.n).slice(0, 3)
            .forEach(c => out.push({g: L('Cities', '도시'), main: c.c, sub: (c.co ? c.co + ' · ' : '') + c.n + L(c.n === 1 ? ' agency' : ' agencies', '개 에이전시'), act: () => toDir(() => SB.setSearch(c.c))}));
        }
      }
    }
    kItems = out; kSel = 0; paintK(q);
  }
  function toDir(fn){ go('dir'); let n = 0; const w = () => { if(document.getElementById('d2q')){ setTimeout(fn, 60); return; } if(++n < 40) setTimeout(w, 100); }; w(); }
  function paintK(q){
    const box = K.querySelector('#shkres');
    if(!kItems.length){ box.innerHTML = '<p class="shkn">' + H(L('Nothing found for “' + q + '”.', '“' + q + '”에 대한 결과가 없습니다.')) + '</p>'; return; }
    let g = '', h = '';
    kItems.forEach((it, i) => {
      if(it.g !== g){ g = it.g; h += '<div class="shkg">' + H(g) + '</div>'; }
      h += '<button type="button" class="shki' + (i === kSel ? ' on' : '') + '" role="option" aria-selected="' + (i === kSel) + '" data-ki="' + i + '"><b>' + H(it.main) + '</b><small>' + H(it.sub) + '</small></button>';
    });
    box.innerHTML = h;
    const on = box.querySelector('.shki.on'); if(on) on.scrollIntoView({block: 'nearest'});
  }
  function pickK(i){ const it = kItems[i]; if(!it) return; closeK(); it.act(); }
  K.addEventListener('input', e => { if(e.target.id === 'shkq') kSearch(e.target.value); });
  K.addEventListener('click', e => { const b = e.target.closest('[data-ki]'); if(b){ pickK(+b.dataset.ki); return; } if(e.target === K) closeK(); });
  K.addEventListener('keydown', e => {
    if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); closeK(); return; }
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); if(!kItems.length) return; kSel = (kSel + (e.key === 'ArrowDown' ? 1 : -1) + kItems.length) % kItems.length; paintK(K.querySelector('#shkq').value); return; }
    if(e.key === 'Enter'){ e.preventDefault(); pickK(kSel); }
  });
  document.addEventListener('keydown', e => {
    if((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')){ e.preventDefault(); if(K.hidden) openK(); else closeK(); }
  }, true);

  /* ---------- the look ---------- */
  const css = document.createElement('style');
  css.textContent = `
:root{--shrail:72px}
/* the menu: icons only on white; the page's name appears beside the icon on hover (user, 6 Nov 2026) */
#shrail{position:fixed;left:0;top:0;bottom:0;width:var(--shrail);z-index:60;background:var(--surf,#fff);border-right:1px solid var(--line,#ececee);padding:14px 0 12px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:4px;overflow-y:auto;scrollbar-width:none;font-family:var(--sans,Inter,system-ui,sans-serif)}
#shrail::-webkit-scrollbar{display:none}
/* the lighthouse on top of the menu: its lamp lights and the beam turns on hover (as in the Studio demo) */
#shrail .shbrand{width:52px;height:54px;margin:0 0 6px;display:grid;place-items:center;position:relative;perspective:200px;perspective-origin:50% 30%;flex:none;border:0;background:none;padding:0;cursor:pointer;border-radius:12px}
#shrail .shbrand .shlh{height:40px;width:16px;fill:var(--ink);position:relative;z-index:1;transition:filter .3s}
#shrail .shbrand .shlhlamp{fill:var(--acc);transition:fill .3s}
#shrail .shbrand .shlhband{fill:var(--surf,#fff)}
#shrail .shbrand .shbeam{position:absolute;left:50%;top:15px;width:120px;height:24px;margin-top:-12px;pointer-events:none;z-index:0;opacity:0;transform-origin:0 50%;background:linear-gradient(90deg,rgba(227,190,114,.95) 0%,rgba(227,190,114,.5) 35%,rgba(227,190,114,0) 100%);clip-path:polygon(0 42%,100% 0,100% 100%,0 58%);filter:blur(1px);transition:opacity .35s}
#shrail .shbrand .shglow{position:absolute;left:50%;top:15px;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;pointer-events:none;opacity:0;background:radial-gradient(circle,rgba(227,190,114,.95),rgba(227,190,114,0) 70%);transition:opacity .35s}
#shrail .shbrand:hover .shbeam,#shrail .shbrand:focus-visible .shbeam{opacity:1;animation:lhsweep 3s linear infinite}
#shrail .shbrand:hover .shglow,#shrail .shbrand:focus-visible .shglow{opacity:1}
#shrail .shbrand:hover .shlhlamp,#shrail .shbrand:focus-visible .shlhlamp{fill:#E3BE72}
#shrail .shbrand:hover .shlh{filter:drop-shadow(0 0 3px rgba(227,190,114,.6))}
#shrail{overflow-x:visible}
/* the wordmark in the top bar */
#shwm{display:flex;align-items:center;margin-right:10px;flex:none}
#shwm .wm{font-family:var(--disp);font-variation-settings:"opsz" 96;font-weight:400;font-size:21px;letter-spacing:.155em;text-transform:uppercase;color:var(--ink);display:inline-block;position:relative;padding:.12em 0 6px .04em;margin:0 -.155em 0 0;white-space:nowrap;line-height:1;cursor:pointer;user-select:none}
#shwm .wm .lh{height:.84em;width:.336em;display:inline-block;vertical-align:baseline;fill:currentColor;margin-right:.03em;overflow:visible}
#shwm .wm .lhlamp{fill:var(--acc)}#shwm .wm .lhband{fill:var(--paper)}
#shwm .wmtxt{position:relative;z-index:1}
#shwm .beam{position:absolute;z-index:0;pointer-events:none;left:.21em;right:-.01em;top:.05em;height:.95em;clip-path:polygon(0% 19%,100% 0%,100% 100%,0% 33%);background:linear-gradient(96deg,rgba(124,76,120,.26) 0%,rgba(124,76,120,.17) 24%,rgba(124,76,120,.1) 55%,rgba(124,76,120,.04) 82%,rgba(124,76,120,0) 100%);filter:blur(6px);transform-origin:0% 26%}
#shwm .wm::after{content:"";position:absolute;left:.06em;right:.155em;bottom:0;height:1.5px;border-radius:2px;background:var(--acc);box-shadow:0 0 4px rgba(90,44,87,.45),0 0 14px rgba(90,44,87,.28)}
#shwm .wm::before{content:"";position:absolute;left:.06em;right:.155em;bottom:-1px;height:4px;border-radius:4px;pointer-events:none;opacity:0;z-index:2;filter:blur(1px);background:linear-gradient(90deg,rgba(255,240,205,0) 0%,rgba(255,240,205,0) 38%,rgba(255,244,216,.96) 47%,rgba(228,172,92,.78) 53%,rgba(255,240,205,0) 62%,rgba(255,240,205,0) 100%);background-size:260% 100%;background-position:-40% 0}
#shwm .wm:hover{filter:brightness(1.07)}
#shwm .wm:focus-visible{outline:2px solid var(--acc);outline-offset:5px;border-radius:6px}
#shwm .wm.fire .lhlamp{animation:lampflare .66s ease-out}
#shwm .wm.fire .lh{animation:lhglow .66s ease-out}
#shwm .wm.fire .beam{animation:beamsweep .82s cubic-bezier(.3,.12,.22,1)}
#shwm .wm.fire::after{animation:rulepulse .82s ease-out}
#shwm .wm.fire::before{animation:rulespark .82s cubic-bezier(.42,0,.26,1)}
@media (prefers-reduced-motion:reduce){#shwm .wm.fire .lhlamp,#shwm .wm.fire .lh,#shwm .wm.fire .beam,#shwm .wm.fire::after,#shwm .wm.fire::before{animation:none}}
@media (max-width:1180px){#shwm{display:none}}
#shrail .shgrp{width:28px;height:1px;background:var(--line,#ececee);margin:8px 0;padding:0;font-size:0;overflow:hidden}
#shrail .shnv{position:relative;display:grid;place-items:center;width:48px;height:48px;min-height:0;padding:0;border:0;border-radius:14px;background:none;color:var(--ink,#111);cursor:pointer;flex:none}
#shrail .shnv[hidden]{display:none}
#shrail .shnv svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#shrail .shnv .shnl,#shrail .shnv em,#shrail .shsearch kbd{display:none}
#shrail .shnv:hover{background:var(--surf2,#f3f3f4)}
#shrail .shnv.on{background:var(--wash,#f1f1f2);color:var(--acc)}
#shrail .shnv.on svg{stroke-width:2.3}
#shrail .shnv:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
#shrail .shnv .shdot{position:absolute;top:8px;right:8px;min-width:8px;height:8px;border-radius:999px;background:var(--acc);border:2px solid var(--surf,#fff);display:none}
#shrail .shnv.has .shdot{display:block}
#shrail .shnv.beacon .shdot{background:#E3BE72;width:10px;height:10px;animation:ivdot 1.6s ease-in-out infinite}
#shrail .shfoot{margin-top:auto;padding-top:12px;display:flex;flex-direction:column;gap:4px}
#shrail .shclaude .shclg{font-size:20px;line-height:1;color:#d97757}
#shrail .shclaude[aria-pressed="true"]{background:#6b2a5e}#shrail .shclaude[aria-pressed="true"] .shclg{color:#ffd2c2}
body.sh2 .viewbar{display:none!important}
#shtip{position:fixed;z-index:9500;pointer-events:none;background:#111;color:#fff;font:600 13px/1 var(--sans,Inter,system-ui,sans-serif);padding:9px 12px;border-radius:10px;white-space:nowrap;box-shadow:0 6px 20px rgba(0,0,0,.18);opacity:0;transform:translateX(-4px);transition:opacity .12s,transform .12s}
#shtip.on{opacity:1;transform:none}
#shtip small{font-weight:500;opacity:.65;margin-left:6px}
body.sh2 #navtoggle,body.sh2 #navnow,body.sh2 .views,body.sh2 .hgroup,body.sh2 #ababout .q{display:none!important}
body.sh2 .w{padding-left:calc(var(--shrail) + 24px)!important;padding-right:24px!important;max-width:none!important}
body.sh2 #appbar{left:var(--shrail)!important;right:0!important;width:auto!important;padding-left:0!important}
body.sh2 #appbar .abi{padding-left:20px!important}
/* 1.2.115: on a phone the main menu is a bar along the bottom (thumb reach), the page uses the full width */
@media (max-width:760px){
  :root{--shrail:0px}
  #shrail{top:auto;bottom:0;left:0;right:0;width:auto;height:calc(60px + env(safe-area-inset-bottom,0px));padding:5px max(8px,env(safe-area-inset-left,0px)) env(safe-area-inset-bottom,0px);flex-direction:row;align-items:center;justify-content:flex-start;gap:2px;overflow-x:auto;overflow-y:hidden;border-right:0;border-top:1px solid var(--line,#ececee);box-shadow:0 -6px 18px -12px rgba(0,0,0,.25)}
  #shrail .shbrand,#shrail .shgrp{display:none}
  #shrail .shfoot{margin:0 0 0 auto;padding:0;flex-direction:row;gap:2px}
  #shrail .shnv{width:50px;height:50px}
  body.sh2 .w{padding-left:max(12px,env(safe-area-inset-left,0px))!important;padding-right:max(12px,env(safe-area-inset-right,0px))!important;padding-bottom:calc(80px + env(safe-area-inset-bottom,0px))!important}
  body.sh2 #appbar .abi{padding-left:10px!important;overflow-x:auto;scrollbar-width:none}
  body.sh2 #appbar .abi::-webkit-scrollbar{display:none}
  #illual{top:calc(58px + env(safe-area-inset-top,0px))}
  #illuwp{bottom:calc(70px + env(safe-area-inset-bottom,0px))!important}
}
body.sh2 #ababout>span{display:none!important}
body.sh2:not(.shtoday) #shkbtn{flex:0 0 auto;min-width:0}
body.sh2:not(.shtoday) #shkbtn span{display:none}
body.shtoday #abck.shwoff{opacity:.55}
body.shextra #appbar #ababout,body.shextra #appbar #abtools,body.shextra #appbar .abflt,body.shextra #fbar,body.shextra .shell .pane:not(.shcur),body.shextra .mkkey{display:none!important}
body.shextra #appbar #shtitle{display:block}
/* the tabs of a place (Atlas, Opus, 404): one row under the top bar, as in the Studio demo */
#shrail .shnv[data-shv="g-more"]{height:56px;grid-template-rows:auto auto;align-content:center;gap:1px}
#shrail .shnv[data-shv="g-more"] .shmorel{display:block;font:600 10px/1 var(--sans,Inter,system-ui,sans-serif);letter-spacing:.02em}
#shrail .shnv[data-shv="g-more"][aria-expanded="true"]{background:color-mix(in srgb,var(--acc,#6b2a63) 12%,var(--surf,#fff));color:var(--acc,#6b2a63)}
#shmore{position:fixed;inset:0;z-index:9400;pointer-events:none}
#shmore[hidden]{display:none}
#shmore .shmbox{position:fixed;pointer-events:auto;width:300px;background:var(--surf,#fff);border:1px solid var(--line,#e5e3e9);border-radius:14px;box-shadow:0 16px 40px -12px rgba(27,23,36,.35);padding:8px;display:flex;flex-direction:column;gap:2px;font-family:var(--sans,Inter,system-ui,sans-serif);color:var(--ink)}
#shmore .shmh{font-size:11px;font-weight:700;letter-spacing:.1em;color:var(--mut,#6c6875);padding:6px 10px 4px;text-transform:uppercase}
#shmore .shmi{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:8px 10px;border:0;border-radius:10px;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer}
#shmore .shmi:hover,#shmore .shmi:focus-visible,#shmore .shmi.on{background:color-mix(in srgb,var(--acc,#6b2a63) 7%,var(--surf,#fff));outline:0}
#shmore .shmic{width:36px;height:36px;border-radius:10px;flex:none;display:grid;place-items:center;background:color-mix(in srgb,var(--acc,#6b2a63) 11%,var(--surf,#fff));color:var(--acc,#6b2a63)}
#shmore .shmic svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
#shmore .shmt{display:flex;flex-direction:column;gap:2px;flex-grow:1;min-width:0}#shmore .shmt b{font-size:14px;font-weight:600}#shmore .shmt small{font-size:12px;color:var(--mut,#6c6875)}
#shmore .shmi em{font-style:normal;font-size:12px;font-weight:700;color:var(--acc,#6b2a63);background:color-mix(in srgb,var(--acc,#6b2a63) 11%,transparent);padding:3px 9px;border-radius:999px}
#shmore.sheet{pointer-events:auto;background:rgba(23,21,28,.42)}
#shmore.sheet .shmbox{left:0!important;right:0;bottom:0;top:auto!important;width:auto;border-radius:18px 18px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom,0px))}
#shmore.sheet .shmi{min-height:60px}
#shmore .shmclose{margin-top:6px;min-height:48px;border-radius:12px;border:1px solid var(--line,#e5e3e9);background:var(--surf,#fff);font:inherit;font-size:15px;color:inherit;cursor:pointer}
#shsub{display:flex;align-items:center;gap:4px;margin:0 0 14px;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none;font-family:var(--sans,Inter,system-ui,sans-serif)}
#shsub::-webkit-scrollbar{display:none}
#shsub[hidden]{display:none}
#shsub button{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 12px;border:0;border-bottom:2px solid transparent;background:none;font:inherit;font-size:13.5px;font-weight:500;color:var(--mut,var(--faint));white-space:nowrap;cursor:pointer;margin-bottom:-1px}
#shsub button svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
#shsub button em{font:500 11px var(--mono,ui-monospace,monospace);font-style:normal;color:var(--faint);background:var(--surf2,#f3f3f4);border-radius:6px;padding:1px 6px}
#shsub button:hover{color:var(--ink)}
#shsub button.on{color:var(--ink);border-bottom-color:var(--ink)}
#shsub button.on svg{color:var(--acc)}
#shsub button.on em{background:var(--wash,#f4ecf2);color:var(--acc)}
#shsub button em.hot,#shsub2 button em.hot{background:#FDE7D6;color:#B4540A}
#shsub2{display:flex;gap:4px;flex-wrap:wrap;width:fit-content;max-width:100%;margin:-4px 0 14px;padding:4px;border:1px solid var(--line);border-radius:12px;background:var(--surf2,#f6f4f7);font-family:var(--sans,Inter,system-ui,sans-serif)}
#shsub2[hidden]{display:none}
#shsub2 button{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 12px;border:0;border-radius:9px;background:none;font:inherit;font-size:12.5px;font-weight:600;color:var(--mut,var(--faint));cursor:pointer;white-space:nowrap}
#shsub2 button:hover{color:var(--ink)}
#shsub2 button.on{background:var(--surf,#fff);color:var(--ink);box-shadow:0 1px 3px rgba(30,20,40,.12)}
#shsub2 button em{font:500 11px var(--mono,ui-monospace,monospace);font-style:normal;color:var(--faint);background:var(--surf,#fff);border-radius:6px;padding:1px 6px}
#shsub2 button.on em{background:var(--wash,#f4ecf2);color:var(--acc)}
@media (max-width:760px){#shsub2{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;width:auto}#shsub2::-webkit-scrollbar{display:none}}
#appbar #shtitle{display:none;font-size:18px;font-weight:700;color:var(--ink);padding:0 6px 0 4px;white-space:nowrap}
body.shtoday #appbar #shtitle{display:block}
body.shtoday #appbar #ababout,body.shtoday #appbar #abtools,body.shtoday #appbar .abflt,body.shtoday #fbar,body.shtoday .shell .pane:not(#pane-today),body.shtoday .mkkey{display:none!important}
#shkbtn{flex:0 1 330px;min-width:150px;height:34px;display:flex;align-items:center;gap:8px;padding:0 10px;border:1px solid var(--line);border-radius:10px;background:var(--surf2,var(--surf));color:var(--faint);font:inherit;font-size:13px;cursor:pointer;text-align:left;box-sizing:border-box}
#shkbtn span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#shkbtn svg{width:15px;height:15px;flex:none;fill:none;stroke:currentColor;stroke-width:2}
#shkbtn kbd,.shbtn kbd{font:600 10.5px/1 var(--sans,inherit);border:1px solid var(--line);border-radius:5px;padding:3px 5px;background:var(--surf);color:var(--faint)}
#shkbtn:hover{border-color:var(--acc);color:var(--ink)}
/* Today */
#pane-today{padding:18px 0 40px;display:flex;flex-direction:column;gap:18px;font-family:var(--sans,Inter,system-ui,sans-serif);color:var(--ink)}
#pane-today[hidden]{display:none}
.shtoday .shhead{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px}
.shtoday .shhead h2{font-size:27px;font-weight:700;margin:2px 0 4px;letter-spacing:0}
.shtoday .shhead p{margin:0}
.shtoday .shbtns{display:flex;gap:8px;flex-wrap:wrap}
.shtoday .shbtn{min-height:40px;padding:0 16px;border-radius:10px;border:1px solid var(--line);background:var(--surf);font:inherit;font-size:14px;font-weight:600;color:var(--ink);display:inline-flex;align-items:center;gap:8px;cursor:pointer}
.shtoday .shbtn svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2}
.shtoday .shbtn.p{background:var(--acc);border-color:var(--acc);color:#fff}
.shtoday .shbtn.p kbd{background:transparent;color:#fff;border-color:rgba(255,255,255,.45)}
.shtoday .shkick{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--faint)}
.shtoday .shmut{color:var(--faint)}
.shov{display:flex;gap:9px;align-items:flex-start;border:1px solid #F3C9A6;background:#FFF6EE;border-radius:12px;padding:9px 10px;margin:0 0 8px}.shov>i{flex:none;width:8px;height:8px;border-radius:50%;background:#C2410C;margin-top:5px}.shov b{display:block;font-size:13px}.shov span{display:block;font-size:12px;color:var(--faint)}.shovb{display:flex;gap:10px;margin-top:4px}
.shtoday .sm{font-size:12.5px}
.shtoday .shclk .ckrow{margin:0}
.shtoday .shgrid2{display:grid;grid-template-columns:minmax(0,1fr) clamp(300px,24vw,380px);gap:18px;align-items:start}
/* 1.2.114: the Today layout - the side panel beside the greeting, under the clocks while they are open */
.shtoday .shlay{display:grid;grid-template-columns:minmax(0,1fr) clamp(320px,26vw,410px);grid-template-areas:"clk clk" "head side" "main side";grid-template-rows:auto auto 1fr;gap:16px 18px;align-items:start}
.shtoday .shlay.noclk{grid-template-areas:"head side" "main side";grid-template-rows:auto 1fr}
.shtoday .shlay>.shclk{grid-area:clk;min-width:0}.shtoday .shlay>.shhead{grid-area:head;min-width:0}.shtoday .shlay>.shmainc{grid-area:main;min-width:0}
.shtoday .shside{grid-area:side;align-self:stretch;min-height:0;display:flex;flex-direction:column;background:var(--surf);border:1px solid var(--line);border-radius:14px;overflow:hidden;box-sizing:border-box}
.shtoday .shhalf{flex:1 1 0;min-height:0;display:flex;flex-direction:column;gap:8px;padding:14px 14px 0}
.shtoday .shhalf[data-shh="act"]{flex:0 1 auto;max-height:50%}
.shtoday .shhalf+.shhalf{border-top:1px solid var(--line)}
.shtoday .shhalf>p{margin:0}
.shtoday .shscr{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:7px;padding:0 2px 12px;overscroll-behavior:contain}
.shtoday .shtabs{display:none}
.shtoday .shweek{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
.shtoday .shwd{border:1px solid var(--line);border-radius:9px;padding:5px 0 6px;background:var(--surf);font:inherit;color:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0}
.shtoday .shwd small{font-size:9.5px;font-weight:700;letter-spacing:.05em;color:var(--faint);white-space:nowrap}
.shtoday .shwd b{font-size:13px;font-variant-numeric:tabular-nums}
.shtoday .shwd span{display:flex;gap:3px;min-height:6px;flex-wrap:wrap;justify-content:center}
.shtoday .shwd span i{width:6px;height:6px;border-radius:50%;background:#1F8A55}.shtoday .shwd span i.d{background:#C2334D}
.shtoday .shwd.today{border-color:var(--acc);background:var(--wash,#f4ecf2)}
.shtoday .shwd.sun small{color:#C2334D}.shtoday .shwd.sat small{color:#3B6FD8}
.shtoday .shwd[aria-pressed="true"]{outline:2px solid var(--acc);outline-offset:-1px}
.shtoday .shwd:hover{border-color:var(--acc)}
.shtoday .shchips{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.shtoday .shchip{border:1px solid var(--line);background:var(--surf);border-radius:999px;padding:4px 11px;font:inherit;font-size:12px;font-weight:600;color:var(--faint);cursor:pointer}
.shtoday .shchip[aria-pressed="true"]{background:var(--acc);border-color:var(--acc);color:#fff}
.shtoday .shadg{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:var(--faint);padding:4px 2px 0}
.shtoday .shad{--k:#1F8A55;--ks:#E6F5EC;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;width:100%;padding:8px 10px 8px 8px;border:1px solid var(--line);border-left:4px solid var(--k);border-radius:11px;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer;box-sizing:border-box}
.shtoday .shad.d{--k:#C2334D;--ks:#FCE9ED}
html[data-theme="dark"] .shtoday .shad,html[data-theme="dim"] .shtoday .shad{--k:#6FD39C;--ks:#1C3A2A}
html[data-theme="dark"] .shtoday .shad.d,html[data-theme="dim"] .shtoday .shad.d{--k:#F28B9E;--ks:#3D2128}
.shtoday .shad:hover{border-color:var(--acc);border-left-color:var(--k)}
.shtoday .shad.soon{box-shadow:0 0 0 2px rgba(227,190,114,.75)}
.shtoday .shad.past{opacity:.6}
.shtoday .shad .shpic{width:38px;height:48px}
.shtoday .shadt{display:flex;flex-direction:column;gap:2px;min-width:0}
.shtoday .shadt>.shclip>b{font-size:13.5px}
.shtoday .shadc{display:flex;gap:4px;min-width:0;flex-wrap:wrap}
.shtoday .shadc .adg{flex:none;max-width:100%}
.shtoday .shadf{font-size:11.5px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.shtoday .shadf b{color:var(--ink);font-weight:600}
.shtoday .shadw{display:flex;flex-direction:column;align-items:flex-end;gap:3px;text-align:right}
.shtoday .shadw>b{font-size:18px;font-weight:800;color:var(--k);font-variant-numeric:tabular-nums;line-height:1}
.shtoday .shadcd{font-size:10.5px;font-weight:700;border-radius:6px;padding:1px 6px;background:var(--ks);color:var(--k);white-space:nowrap;font-variant-numeric:tabular-nums}
@media (max-width:1100px){
  .shtoday .shlay,.shtoday .shlay.noclk{grid-template-columns:minmax(0,1fr);grid-template-areas:"clk" "head" "main" "side";grid-template-rows:none}
  .shtoday .shlay.noclk{grid-template-areas:"head" "main" "side"}
  .shtoday .shhalf{flex:none}.shtoday .shscr{max-height:none;overflow:visible}
}
@media (max-width:760px){
  .shtoday .shtabs{display:flex;gap:4px;padding:6px 6px 0;border-bottom:1px solid var(--line)}
  .shtoday .shtabs button{flex:1;min-height:44px;border:0;background:none;font:inherit;font-size:13px;font-weight:700;color:var(--faint);border-bottom:2.5px solid transparent;cursor:pointer;white-space:nowrap;padding:8px 4px}
  .shtoday .shtabs button[aria-selected="true"]{color:var(--acc);border-bottom-color:var(--acc)}
  .shtoday .shtabs b{font-size:11px;border-radius:7px;padding:1px 6px;background:#fff3d6;color:#7a5200;margin-left:5px}
  .shtoday .shhalf[data-off]{display:none}.shtoday .shhalf+.shhalf{border-top:0}
  .shtoday .shhalf>.shph{display:none}
  .shtoday .shtabs .shtabi{display:inline-grid;align-self:center;margin:0 4px 4px}.shtoday .shinfop{top:6px}
  .shtoday .shwd{min-height:52px}.shtoday .shchip{min-height:36px;padding:6px 14px}
  .shtoday .shad{padding:8px;grid-template-columns:auto minmax(0,1fr)}
  .shtoday .shadw{grid-column:1/-1;flex-direction:row;align-items:center;justify-content:space-between;border-top:1px dashed var(--line);padding-top:6px}
  .shtoday .shadw>b{font-size:16px}
}
.shtoday .shwbar{display:flex;gap:6px;justify-content:flex-end;align-self:flex-start;margin-top:14px}
.shtoday .shwt{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border:1px solid var(--line);border-radius:999px;background:var(--surf);color:var(--faint);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.shtoday .shwt svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.shtoday .shwt i{font-style:normal;font-size:10px}
.shtoday .shwt.on{color:var(--ink)}
.shtoday .shwt:hover{border-color:var(--acc);color:var(--acc)}
.shtoday .shclk.noclk .clocks{display:none!important}
.shtoday .shclk.nomap .wmap{display:none!important}
.shtoday .shclk.none{display:none}
.shtoday .shclk.noclk .ckrow{justify-content:flex-start}
@media (max-width:1100px){.shtoday .shgrid2{grid-template-columns:1fr}}
.shtoday .shsub2{font-size:15px;font-weight:400;color:var(--faint)}
.shtoday .shnone{color:#9a6a00;font-weight:600}
.shtoday .shgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:18px;align-items:start}
.shtoday .shpanel{background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:10px;min-width:0;box-sizing:border-box}
.shtoday .shph{display:flex;justify-content:space-between;align-items:center;gap:8px}
.shtoday .shph h3{font-size:15px;font-weight:700;margin:0;display:flex;align-items:center;gap:6px}
.shtoday .shinfo{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--faint);background:none;color:var(--faint);font:italic 700 12px/1 Georgia,'Times New Roman',serif;display:inline-grid;place-items:center;padding:0;cursor:pointer;flex:none}
.shtoday .shinfo:hover,.shtoday .shinfo[aria-expanded="true"]{border-color:var(--acc);color:var(--acc)}
.shtoday .shinfo:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.shtoday .shtabi{display:none}
.shtoday .shhalf{position:relative}
.shtoday .shinfop{position:absolute;z-index:5;top:44px;left:14px;right:14px;background:var(--surf);border:1px solid var(--line);border-radius:10px;box-shadow:0 10px 28px -10px rgba(30,15,40,.35);padding:10px 12px;font-size:12.5px;line-height:1.45;color:var(--ink)}
.shtoday .shpanel>p{margin:0}
.shtoday .shtag{display:inline-flex;align-items:center;border-radius:7px;padding:2px 8px;font-size:12px;font-weight:600;background:var(--surf2,#f4ecf2);color:var(--acc)}
.shtoday .shtag.g{background:#e6f3ea;color:#24603a}.shtoday .shtag.y{background:#fff3d6;color:#7a5200}.shtoday .shtag.r{background:#fbe7e5;color:#9c2018}
.shtoday .shbk{display:flex;gap:12px;align-items:center;width:100%;padding:8px;border:1px solid var(--line);border-radius:12px;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer;box-sizing:border-box}
.shtoday .shbk:hover{border-color:var(--acc)}
.shtoday .shpic{width:44px;height:56px;border-radius:9px;overflow:hidden;flex:none;background:var(--surf2,#eee);display:grid;place-items:center}
.shtoday .shpic img{width:100%;height:100%;object-fit:cover;display:block}
.shtoday .shpic i{font-style:normal;font-weight:700;color:var(--faint)}
.shtoday .shbkt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.shtoday .shclip{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.shtoday .shring{--p:0;width:40px;height:40px;border-radius:50%;flex:none;display:grid;place-items:center;background:conic-gradient(var(--acc) calc(var(--p)*360deg),var(--line) 0)}
.shtoday .shring b{width:32px;height:32px;border-radius:50%;background:var(--surf);display:grid;place-items:center;font-size:11px}
.shtoday .shlink{border:0;background:none;color:var(--acc);font:inherit;font-size:13px;font-weight:600;cursor:pointer;padding:4px 0;text-align:left}
.shtoday .shtiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.shtoday .shtile{display:flex;flex-direction:column;gap:2px;text-align:left;background:var(--surf2,#f6f4f8);border:1px solid transparent;border-radius:12px;padding:12px;font:inherit;color:inherit;cursor:pointer}
.shtoday .shtile:hover{border-color:var(--acc)}
.shtoday .shtile b{font-size:24px;line-height:1.2}
.shtoday .shpicks{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:10px}
.shtoday .shpick{display:flex;flex-direction:column;gap:3px;border:0;background:none;padding:0;font:inherit;color:inherit;text-align:left;cursor:pointer;min-width:0}
.shtoday .shpick img,.shtoday .shpick i{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:10px;background:var(--surf2,#eee);display:block}
.shtoday .shpick b{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.shtoday .shpick .sm{font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.shtoday .shact{display:flex;gap:10px;align-items:flex-start;font-size:13.5px}
.shtoday .shact .shdisc{width:26px;height:26px;border-radius:50%;flex:none;display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:700;background:var(--idbg);color:var(--idfg)}
.shtoday .shrow{display:flex;justify-content:space-between;font-size:13.5px}
.shflash{outline:3px solid var(--acc)!important;outline-offset:3px;transition:outline-color .3s}
/* Ctrl K */
#shk{position:fixed;inset:0;z-index:9000;background:rgba(20,14,22,.42);display:flex;justify-content:center;align-items:flex-start;padding-top:12vh}
#shk[hidden]{display:none}
#shk .shkbox{width:min(640px,calc(100vw - 32px));background:var(--surf,#fff);color:var(--ink);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.3);overflow:hidden;font-family:var(--sans,Inter,system-ui,sans-serif)}
#shk .shkin{display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid var(--line)}
#shk .shkin svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;color:var(--faint);flex:none}
#shk input{flex:1;height:54px;border:0;background:none;font:inherit;font-size:16px;color:var(--ink);outline:none}
#shk kbd{font:600 10.5px/1 var(--sans,inherit);border:1px solid var(--line);border-radius:5px;padding:3px 5px;color:var(--faint)}
#shk .shkres{max-height:min(60vh,520px);overflow-y:auto;padding:6px}
#shk .shkg{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:var(--faint);padding:10px 10px 4px}
#shk .shki{display:flex;align-items:baseline;gap:10px;width:100%;min-height:40px;padding:8px 10px;border:0;border-radius:9px;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer;box-sizing:border-box}
#shk .shki b{font-size:14px;font-weight:600}
#shk .shki small{font-size:12.5px;color:var(--faint);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#shk .shki.on,#shk .shki:hover{background:var(--surf2,#f4ecf2)}
#shk .shki.on b{color:var(--acc)}
#shk .shkn{padding:16px;color:var(--faint);margin:0}
@media (max-width:1100px){
  #shkbtn span{display:none}#shkbtn{flex:0 0 auto;min-width:0}
}
`;
  document.head.appendChild(css);

  /* ---------- start ---------- */
  function start(){
    if(!document.getElementById('views') || !document.querySelector('#appbar .abi')){ setTimeout(start, 200); return; }
    document.body.appendChild(rail); document.body.appendChild(K);
    B.classList.add('sh2');
    paintRail(); paintTop();
    try{ new MutationObserver(later).observe(document.getElementById('views'), {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-selected', 'hidden']}); }catch(e){}
    /* the language switch redraws the menu in the other language */
    try{ new MutationObserver(() => { later(); if(showing) renderToday(); }).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']}); }catch(e){}
    /* the clocks moved to Today: on every other page they start folded (the clock button in the top bar still shows them) - set once */
    try{ if(!localStorage.getItem('illu.shck')){ localStorage.setItem('illu.shck', '1'); const ab = document.getElementById('abck'); if(ab && !B.classList.contains('ckmin')) ab.click(); } }catch(e){}
    showToday();
    /* 1.2.139: the current design is drawn - take the start-up screen away (index.html head) */
    requestAnimationFrame(() => requestAnimationFrame(() => { document.documentElement.classList.add('shready'); setTimeout(() => { const b = document.getElementById('illuboot'); if(b) b.remove(); }, 400); }));
    /* the data arrives a little after the page: draw Today again as it lands */
    [800, 2500, 6000, 12000].forEach(t => setTimeout(() => { if(showing) renderToday(); }, t));
  }
  start();
})();
/* 1.2.167: Esc closes the "i" explanation on Today's side panel */
document.addEventListener('keydown', e => { if(e.key === 'Escape' && document.querySelector('.shinfop')){ const b = document.querySelector('[data-shinfo]'); if(b) b.click(); } });
