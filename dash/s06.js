
(function(){
  const LH = '<svg viewBox="0 0 40 100" aria-hidden="true"><circle cx="20" cy="3.2" r="2.3"/><path d="M20 5.4 29.6 17H10.4Z"/><rect class="nvlamp" x="12.6" y="17" width="14.8" height="11"/><rect x="8.4" y="28" width="23.2" height="3.5"/><path d="M13.4 31.5C12.6 50 11.2 71 9 88h22c-2.2-17-3.6-38-4.4-56.5Z"/><rect x="9.8" y="56" width="20.4" height="3.2" fill="var(--surf)"/><path d="M6.6 88h26.8l2.6 7.6H4Z"/><rect x="1.6" y="95.6" width="36.8" height="4.4"/></svg>';
  const IC = {
    bell:'<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 004 0"/></svg>',
    msg:'<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/></svg>',
    log:'<svg viewBox="0 0 24 24"><path d="M6 3.8h10.5a1.5 1.5 0 0 1 1.5 1.5v13.4a1.5 1.5 0 0 1-1.5 1.5H6z"/><path d="M6 3.8v16.4M9.4 8.4h5.4M9.4 11.6h5.4M9.4 14.8h3.4"/></svg>'};
  const GLOBE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.9 5.8 3.9 9s-1.3 6.2-3.9 9c-2.6-2.8-3.9-5.8-3.9-9S9.4 5.8 12 3z"/></svg>';
  const bar = document.createElement('div');
  bar.id = 'appbar';
  bar.innerHTML = '<div class="abi"><button class="ababout" id="ababout" aria-expanded="false" title="What this page is for">' +
    '<i class="q">?</i><b id="abtitle">Updates</b><span>About this page</span>' +
    '<svg viewBox="0 0 12 12"><path d="M2 4l4 4 4-4"/></svg></button><div id="abtip" hidden></div><div id="abtools"></div><div class="abr">' +
    '<div class="abon" id="abon" title="Signed in right now"></div><span class="absep"></span>' +
    '<button class="abib" data-abp="notif" title="Notifications" aria-label="Notifications">' + IC.bell + '<i id="abnn"></i></button>' +
    '<button class="abib" data-abp="msg" title="Messages" aria-label="Messages">' + IC.msg + '<i id="abmn"></i></button>' +
    '<button class="abib" data-abp="log" title="Work log" aria-label="Work log">' + IC.log + '</button><span class="absep"></span>' +
    '<div class="ablang" role="group" aria-label="Language"><button data-ablang="en" aria-pressed="true">EN</button><button data-ablang="ko" aria-pressed="false">한</button></div>' +
    '<button class="abglobe" id="abglobe" data-abproxy="langmore" title="All languages" aria-label="All languages"></button>' +
    '<button class="abme" id="abme" title="Your ID"></button></div></div>';
  /* the bar heads the main column, so the filter column rises to meet the clocks */
  const main = document.querySelector('.shell > .side + *') || document.querySelector('.shell > :nth-child(2)');
  if(main) main.insertBefore(bar, main.firstChild); else document.body.insertBefore(bar, document.body.firstChild);
  const hdr = document.querySelector('header');
  const stick = () => { const st = hdr && getComputedStyle(hdr).position === 'sticky';
    const ck = document.querySelector('.ckrow');
    const h = ck && hdr ? ck.getBoundingClientRect().bottom - hdr.getBoundingClientRect().top : (hdr ? hdr.getBoundingClientRect().height : 0);
    bar.style.top = (st ? Math.round(h) + 10 : 8) + 'px'; };
  stick(); addEventListener('resize', stick); setTimeout(stick, 1500);
  const ABOUT = {
    'v-arr':'<p><b>Suggestiones</b> shows 50 models at a time from the whole Directory: women 167–179 cm and men 183–191 cm (measured height).</p><p><b>Refresh</b> brings 50 you have not been shown yet. Every ID goes through the list in its own random order, models new to the Directory come first, and once everyone has been shown it starts over.</p><p>Open a photo for the model’s card (slideshow, full view, lamps), and <b>Full screen</b> for the whole window.</p>',
    'v-dir':'<p><b>Directory</b> lists every agency the dashboard watches, grouped by region and country. Open an agency to see its boards and models, and its contacts.</p><p><b>Download this list</b> saves every model your search and filters show — photos, measurements and links — as a page you open in your browser.</p>',
    'v-bld':'<p><b>Blind spots</b> are boards the scan cannot read on its own. Each one links straight to the agency page so it can be checked by hand.</p>',
    'v-ig':'<p><b>Instagram</b> keeps the model and agency accounts you follow, matched to their cards.</p>',
    'v-lit':'<p><b>Lumen</b> holds the models you have lit: green to book, amber to keep in mind, red ruled out. Only your own lamps show here; everyone’s are in Communicatus.</p><p><b>Import photos</b> picks many files at once and matches them by filename — name each after the model (Alicia_Ostrowski.jpg). You can also drop an image straight onto a card, or click a card’s empty slot. <b>Contact sheet</b> saves the list as a page you open from your computer, where agency photos load.</p>',
    'v-com':'<p><b>Communicatus</b> shows every ID’s lamps together, so the team can see who is interested in whom.</p>',
    'v-bk':'<p><b>Booking</b> holds the models actually in play — the ones being talked about with their mother agency. A card moves here from Updates or Lumen with everything already known about them, or starts blank and you fill it in.</p><p>Three rows: <b>processing</b> while it is live, <b>completed</b> once it is closed, <b>cancelled</b> if it falls through. Press one of the three labels on a card, or drag the card, to move it. Each card has five stages; press the light beside a stage to turn it amber while it is being worked on and green once it is done.</p>',
    'v-atl':'<p><b>Atlas</b> puts every agency on a map. Click a region to see its countries, then a country to see its agencies, with how many models each has, women and men. Pins stand only where a street address is on file in the agency’s contacts; <b>Set pin</b> places one by hand.</p>',
    'v-cmp':'<p><b>Compositus</b> builds a composite card from a model’s photos and measurements.</p>',
    'v-bkl':'<p><b>Backlog</b> is every lamp anyone has set, in the order it happened, filed under whoever set it. Nothing here can be edited: change the lamp and the change files itself as its own line.</p>',
    'v-404':'<p><b>404</b> lists profiles an agency has taken down. They are filed rather than deleted, because a model who leaves a board has usually signed somewhere else.</p>'};
  const ABOUT_KO = {
    'v-arr':'<p><b>Suggestiones</b>는 전체 디렉터리에서 한 번에 50명을 보여줍니다: 여성 167–179 cm, 남성 183–191 cm(측정된 키).</p><p><b>새로고침</b>을 누르면 아직 보지 않은 50명이 나옵니다. ID마다 자기만의 무작위 순서로 전체를 돌며, 디렉터리에 새로 들어온 모델이 먼저 나오고, 모두 본 뒤에는 처음부터 다시 시작합니다.</p><p>사진을 열면 모델 카드(슬라이드쇼, 전체 보기, 램프)가 나오고, <b>전체 화면</b>으로 창 전체에 볼 수 있습니다.</p>',
    'v-dir':'<p><b>디렉터리</b>는 대시보드가 지켜보는 모든 에이전시를 지역·국가별로 보여줍니다. 에이전시를 열면 보드, 모델, 연락처를 볼 수 있습니다.</p><p><b>이 목록 다운로드</b>는 검색과 필터에 맞는 모든 모델을 사진·사이즈·링크와 함께 브라우저에서 여는 페이지로 저장합니다.</p>',
    'v-bld':'<p><b>크롤 불가</b>는 스캔이 스스로 읽지 못하는 보드입니다. 각각 에이전시 페이지로 바로 연결되어 직접 확인할 수 있습니다.</p>',
    'v-ig':'<p><b>인스타그램</b>은 팔로우하는 모델·에이전시 계정을 카드와 연결해 관리합니다.</p>',
    'v-lit':'<p><b>루멘</b>은 내가 램프를 켠 모델입니다: 초록은 부킹, 주황은 검토 중, 빨강은 제외. 내 램프만 보이고, 모두의 램프는 코뮤니카투스에 있습니다.</p><p><b>사진 가져오기</b>는 여러 파일을 한 번에 골라 파일 이름으로 매칭합니다 — 파일 이름을 모델 이름으로 하세요 (Alicia_Ostrowski.jpg). 카드에 이미지를 바로 끌어다 놓거나 카드의 빈 칸을 클릭해도 됩니다. <b>컨택트 시트</b>는 목록을 내 컴퓨터에서 여는 페이지로 저장하며, 그 페이지에서는 에이전시 사진이 보입니다.</p>',
    'v-com':'<p><b>코뮤니카투스</b>는 모든 ID의 램프를 함께 보여줘서, 팀에서 누가 어떤 모델에 관심 있는지 알 수 있습니다.</p>',
    'v-bk':'<p><b>부킹</b>은 실제로 진행 중인 모델, 즉 디렉터리와 이야기 중인 모델을 담습니다. 업데이트나 루멘에서 이미 아는 정보와 함께 카드가 옮겨오거나, 빈 카드로 시작해 직접 채웁니다.</p><p>세 줄: 진행 중이면 <b>진행 중</b>, 마감되면 <b>완료</b>, 무산되면 <b>취소</b>. 카드의 세 라벨 중 하나를 누르거나 카드를 끌어서 옮깁니다. 카드마다 다섯 단계가 있고, 단계 옆 불을 누르면 작업 중일 때 주황, 끝나면 초록이 됩니다.</p>',
    'v-atl':'<p><b>아틀라스</b>는 모든 에이전시를 지도에 표시합니다. 지역, 국가 순으로 눌러 에이전시별 모델 수(여성/남성)를 확인하세요.</p>',
    'v-cmp':'<p><b>콤포지투스</b>는 모델의 사진과 사이즈로 컴카드를 만듭니다.</p>',
    'v-bkl':'<p><b>백로그</b>는 누군가 켠 모든 램프를 일어난 순서대로, 켠 사람별로 보여줍니다. 여기서는 수정할 수 없습니다: 램프를 바꾸면 그 변경이 새 줄로 기록됩니다.</p>',
    'v-404':'<p><b>404</b>는 에이전시가 내린 프로필 목록입니다. 보드에서 빠진 모델은 보통 다른 곳과 계약했기 때문에 삭제하지 않고 기록해 둡니다.</p>'};
  const isKo = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const T = s => { try{ const D = curDict(); return D && D[s] != null ? D[s] : s; }catch(e){ return s; } };
  const setH = (el, h) => { if(el && el.__h !== h){ el.__h = h; el.innerHTML = h; } };
  const tip = () => document.getElementById('abtip');
  function curTab(){ const s = document.querySelector('#views > button[aria-selected="true"]'); return s ? s.id : 'v-arr'; }
  const dr = document.createElement('aside');
  dr.id = 'abdrawer';
  dr.innerHTML = '<div class="abdh"><button class="abdt" data-abp="notif">Notifications <s>3</s></button>' +
    '<button class="abdt" data-abp="msg">Messages</button><button class="abdt" data-abp="log">Work log</button>' +
    '<button class="abdx" data-abclose aria-label="Close panel">×</button></div><div class="abdb">' +
    '<div class="abpane" data-pane="notif"></div><div class="abpane" data-pane="msg"></div><div class="abpane" data-pane="log"></div></div>';
  document.body.appendChild(dr);
  const move = () => {
    const rail = document.getElementById('rail'), dock = document.getElementById('msgdock');
    if(rail && rail.parentNode !== dr.querySelector('[data-pane=log]')) dr.querySelector('[data-pane=log]').appendChild(rail);
    if(dock && dock.parentNode !== dr.querySelector('[data-pane=msg]')) dr.querySelector('[data-pane=msg]').appendChild(dock);
  };
  move(); setTimeout(move, 800);
  let open = null;
  function show(p){
    open = p; dr.classList.toggle('open', !!p);
    dr.querySelectorAll('.abpane').forEach(x => x.classList.toggle('on', x.dataset.pane === p));
    dr.querySelectorAll('.abdt').forEach(x => x.setAttribute('aria-selected', String(x.dataset.abp === p)));
    bar.querySelectorAll('.abib').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.abp === p)));
    if(p === 'msg'){ try{ if(typeof CHATOPEN !== 'undefined' && !CHATOPEN) toggleChat(true); }catch(e){} }
  }
  window.abShow = show;
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-abp],[data-abclose],[data-abtab],#ablogo,#abme,[data-ablang],#ababout,[data-abproxy]');
    if(!t){ if(!e.target.closest || !e.target.closest('#abtip')){ const a = document.getElementById('ababout'); if(a && a.getAttribute('aria-expanded') === 'true'){ a.setAttribute('aria-expanded','false'); tip().hidden = true; } } return; }
    if(t.id === 'ababout'){ const o = t.getAttribute('aria-expanded') !== 'true'; t.setAttribute('aria-expanded', String(o)); tip().hidden = !o;
      if(o) tip().innerHTML = (isKo() && ABOUT_KO[curTab()]) || ABOUT[curTab()] || ''; return; }
    if(t.dataset.abproxy){ const o = document.getElementById(t.dataset.abproxy); if(o) o.click(); return; }
    if(t.dataset.abp){ show(open === t.dataset.abp && t.classList.contains('abib') ? null : t.dataset.abp); return; }
    if(t.hasAttribute('data-abclose')){ show(null); return; }
    if(t.dataset.abtab){ const b = document.getElementById(t.dataset.abtab); if(b) b.click(); setTimeout(paint, 50); return; }
    if(t.id === 'ablogo'){ const b = document.getElementById('v-arr'); if(b) b.click(); setTimeout(paint, 50); return; }
    if(t.id === 'abme'){ const b = document.getElementById('idme'); if(b) b.click(); return; }
    if(t.dataset.ablang){ try{ setLang(t.dataset.ablang); }catch(e){} setTimeout(paint, 30); }
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && open) show(null); });
  /* this tab's own buttons and counts, shown in the bar; the originals stay in the page,
     hidden, and the bar's copies press them */
  const TOOLS = {
    'v-bk':  {hide:'.bkbar', b:[['bknew','+ Create a new card','abnew'],['stoopen',null,'abfiles']], count:() => txt('.bkbar .bkcount')},
    'v-arr': {hide:'.arrbar', b:[], count:() => ''},
    'v-lit': {hide:'.litbar:not(.arrbar)', b:[['litsheet','Contact sheet ↓','abnew'],['lumenfolder','Import photos…','abfiles']],
              count:() => { const s = document.querySelector('.litbar:not(.arrbar) > span'); return s ? (s.textContent.match(/^\d+ of \d+ with a photograph/) || [''])[0] : ''; }},
    'v-dir': {hide:'#dirx, .dirsum', b:[['dirxbtn','Download this list ↓','abnew']],
              count:() => { const d = document.querySelector('.dirsum'); if(!d) return '';
                const b = d.querySelector('b'), s = d.querySelector('s'); return (b ? b.textContent + ' agencies' : '') + (s ? ' · ' + s.textContent : ''); }}
  };
  function txt(sel){ const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function tools(){
    const box = document.getElementById('abtools'), v = curTab(), cfg = TOOLS[v];
    { const abv = cfg ? v.slice(2) : ''; if(document.body.dataset.abv !== abv) document.body.dataset.abv = abv; }
    if(!cfg){ setH(box, ''); return; }
    let html = '<span class="absep2"></span>';
    for(const [id, label, cls] of cfg.b){
      const o = document.getElementById(id); if(!o) continue;
      html += '<button class="' + cls + (o.classList.contains('full') ? ' full' : '') + '" data-abproxy="' + id + '"' +
        (o.title ? ' title="' + esc(o.title) + '"' : '') + '>' + esc(label || o.textContent.trim()) + '</button>';
    }
    const c = cfg.count(); if(c) html += '<span class="abcount">' + esc(c) + '</span>';
    setH(box, html);
  }
  /* Notifications: the latest morning scan, plus what everyone else has done (their lamps,
     from the Backlog), newest first. The badge counts what arrived since you last looked. */
  let SEEN = ''; try{ SEEN = localStorage.getItem('illum.notseen') || ''; }catch(e){}
  function notes(){
    const box = dr.querySelector('[data-pane=notif]');
    const items = [];
    try{
      const days = [...RUNS.keys()].sort().reverse();
      for(const d of days.slice(0, 3)){ const r = RUNS.get(d) || {};
        if(r.boards) items.push({ts: d + ' 05:00', who: '', html: 'Morning scan · ' + r.boards + ' boards · <b>' + (r.found || 0) + ' new</b>'}); }
    }catch(e){}
    try{
      for(const r of BLOG.slice(-40)){
        if(!r || r.p === ME) continue;
        const pp = PEOPLE.get(r.p) || GONEID.get(r.p); const verb = KVERB[r.v] || ['marked', ''];
        const KV = {g: ' 초록불을 켰습니다', y: ' 주황불로 보류했습니다', r: ' 제외했습니다', x: ' 램프를 껐습니다'};
        items.push({ts: String(r.ts || ''), who: r.p, html: isKo()
          ? '<b>' + esc(pp ? pp.n : '누군가') + '</b> · <b>' + esc(r.nm || r.k || '') + '</b>' + (KV[r.v] || ' 표시했습니다')
          : '<b>' + esc(pp ? pp.n : 'Someone') + '</b> ' + verb[0] + ' <b>' + esc(r.nm || r.k || '') + '</b>' + (verb[1] ? ' ' + verb[1] : '')});
      }
    }catch(e){}
    try{ for(const x of (window.__illuNotifExtra ? window.__illuNotifExtra() : [])) items.push(x); }catch(e){}
    items.sort((a, b) => b.ts.localeCompare(a.ts));
    const list = items.slice(0, 25);
    const fresh = list.filter(x => x.ts > SEEN).length;
    { const nn = document.getElementById('abnn'), ft = fresh ? String(fresh) : ''; if(nn.textContent !== ft) nn.textContent = ft;
    const tab = dr.querySelector('.abdt[data-abp=notif] s'); if(tab && tab.textContent !== ft) tab.textContent = ft; }
    const today = new Date().toISOString().slice(0, 10);
    const html = list.length ? list.map(x => '<div class="abnote">' + (x.who ? idDisc(x.who) : '<span class="sys">&#8635;</span>') +
      '<span>' + x.html + '</span><em>' + esc(x.ts.slice(0, 10) === today ? x.ts.slice(11, 16) : x.ts.slice(5, 10)) + '</em></div>').join('')
      : '<div class="abnote"><span>Nothing new yet. Morning scans and what others on the team do will show up here.</span></div>';
    setH(box, html);
    if(open === 'notif' && list.length && list[0].ts > SEEN){ SEEN = list[0].ts; try{ localStorage.setItem('illum.notseen', SEEN); }catch(e){} }
  }
  window.__illuNotifRepaint = () => { try{ notes(); }catch(e){} };
  function paint(){
    try{ tools(); }catch(e){}
    const cur = document.getElementById(curTab());
    if(cur){ const c = cur.cloneNode(true); const v = c.querySelector('.vn'); if(v) v.remove();
      const tt = document.getElementById('abtitle'), nt = cur.id === 'v-dir' ? T('Directory') : c.textContent.trim();
      if(tt.__t !== nt){ tt.__t = nt; tt.textContent = nt; } }
    const tabs = [];
    if(false) document.getElementById('abtabs').innerHTML = tabs.map(b => {
      const nm = b.cloneNode(true); const vn = nm.querySelector('.vn'); const n = vn ? (vn.textContent.match(/\d[\d,]*/) || [''])[0] : ''; if(vn) vn.remove();
      const label = b.id === 'v-dir' ? 'Directory' : nm.textContent.trim();
      return '<button class="abtab" role="tab" data-abtab="' + b.id + '" aria-selected="' + b.getAttribute('aria-selected') + '">' + label + '<s>' + n + '</s></button>';
    }).join('');
    const on = document.getElementById('abon');
    const live = (typeof ONLINE !== 'undefined' ? [...ONLINE] : []).filter(p => typeof PEOPLE !== 'undefined' && PEOPLE.has(p));
    if(typeof ME !== 'undefined' && ME && !live.includes(ME)) live.unshift(ME);
    setH(on, live.map(p => idDisc(p)).join('') + '<span><b>' + live.length + '</b>' + (isKo() ? '명 접속 중' : ' here now') + '</span>');
    const me = (typeof ME !== 'undefined' && ME && PEOPLE.get(ME));
    setH(document.getElementById('abme'), me ? idDisc(ME) + '<span class="bnm">' + esc(me.n) + '</span>' : 'Sign in');
    const lg = typeof LANG !== 'undefined' ? LANG : 'en';
    bar.querySelectorAll('[data-ablang]').forEach(x => { const p = String(x.dataset.ablang === lg); if(x.getAttribute('aria-pressed') !== p) x.setAttribute('aria-pressed', p); });
    const gb = document.getElementById('abglobe'); if(gb){ const other = lg !== 'en' && lg !== 'ko';
      const h = GLOBE + (other ? '<em>' + esc(typeof langNative === 'function' ? langNative(lg) : lg) + '</em>' : '');
      setH(gb, h); if(gb.getAttribute('aria-pressed') !== String(other)) gb.setAttribute('aria-pressed', String(other)); }
    const mn = document.getElementById('msgn'), amn = document.getElementById('abmn'), mt = mn ? mn.textContent : ''; if(amn.textContent !== mt) amn.textContent = mt;
    notes();
  }
  window.abPaint = paint;
  setInterval(paint, 700); document.addEventListener('click', () => setTimeout(paint, 60)); setTimeout(paint, 300);
})();
