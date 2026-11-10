
/* ======== Light / Dim / Dark: the switch ======== */
(function(){
  const KEY = 'illum.theme';
  const IC = {
    light: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/></svg>',
    dim: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path class="fl" d="M12 4a8 8 0 0 1 0 16z"/></svg>',
    sepia: '<svg viewBox="0 0 24 24"><path d="M3 17h18M6 21h12"/><path d="M7 17a5 5 0 0 1 10 0"/><path d="M12 6.5v2M5.6 10.6l1.4 1.4M18.4 10.6L17 12"/></svg>'};
  IC.dim = '<svg viewBox="0 0 24 24"><path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z"/></svg>';
  const ko = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const NAME = {light: ['Light mode', '라이트 모드'], dim: ['Dim mode', '딤 모드'], sepia: ['Sepia mode', '세피아 모드']};
  function cur(){ const t = document.documentElement.dataset.theme; return t === 'dim' || t === 'sepia' ? t : 'light'; }
  function apply(t){
    if(t === 'dark') t = 'dim';
    if(t === 'dim' || t === 'sepia') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
    try{ localStorage.setItem(KEY, t); }catch(e){}
    paint();
  }
  function paint(){
    const g = document.getElementById('abtheme'); if(!g) return;
    g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === cur())));
  }
  window.themeSet = apply;
  function mount(){
    const r = document.querySelector('#appbar .abr');
    if(!r) return false;
    if(document.getElementById('abtheme')) return true;
    const g = document.createElement('div');
    g.id = 'abtheme'; g.setAttribute('role', 'group'); g.setAttribute('aria-label', ko() ? '화면 모드' : 'Display mode');
    g.innerHTML = ['light', 'sepia', 'dim'].map(t => '<button type="button" data-theme="' + t + '" title="' +
      NAME[t][ko() ? 1 : 0] + '" aria-label="' + NAME[t][ko() ? 1 : 0] + '">' + IC[t] + '</button>').join('');
    g.addEventListener('click', e => { const b = e.target.closest('button[data-theme]'); if(b) apply(b.dataset.theme); });
    const lang = r.querySelector('.ablang');
    r.insertBefore(g, lang || null);
    paint();
    return true;
  }
  if(!mount()){ const t = setInterval(() => { if(mount()) clearInterval(t); }, 300); setTimeout(() => clearInterval(t), 15000); }
})();

/* ======== the booking view, rebuilt over its old frame ======== */
(function(){
  if(typeof bvDraw !== 'function') return;
  const FOLDER = '<svg viewBox="0 0 24 24"><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></svg>';
  const CHEV = '<svg viewBox="0 0 24 24" style="width:12px;height:12px"><path d="M6 9l6 6 6-6"/></svg>';
  const IC = {
    countries: 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.6 3.6 5.4 3.6 8.5S14.4 17.9 12 20.5c-2.4-2.6-3.6-5.4-3.6-8.5S9.6 6.1 12 3.5z"/></svg>') + '")',
    avail: 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8"><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></svg>') + '")',
    entry: 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linejoin="round"><path d="M2.5 19.5h19M4 14.5l3-1 3 2.5 5-2 5-2.5a1.6 1.6 0 0 0-1.3-2.9L13.5 10 8 5.5 6 6.3l3.4 5.2-3.7 1.4L4 11.6l-1.5.6z"/></svg>') + '")',
    depart: 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linejoin="round"><path d="M2.5 19.5h19M3.5 11.5l3.4 3.6 5.6-1.2 6.3-2.6a1.6 1.6 0 0 0-.8-3.1l-4.6 1L8.2 4.5 6.3 5l2.6 5.4-3.9.8-1.4-1.6-1.6.4z"/></svg>') + '")'
  };
  const T = s => { try{ const D = curDict(); return D && D[s] != null ? D[s] : s; }catch(e){ return s; } };
  const pretty = t => String(t).replace(/^\d+\.\s*/, '').toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase());
  function current(c){
    for(let i = 0; i < BKSEC.length; i++){ const o = bvStageOf(c, BKSEC[i][0]); if(o.pv !== 'g') return {i, k: BKSEC[i][0], label: BKSEC[i][1], pv: o.pv, nf: o.nf}; }
    return null;
  }
  function trk(c){
    const box = bvHd.querySelector('.bvtrk'); if(!box) return;
    if(bvSteps.parentNode !== box) box.appendChild(bvSteps);
    const cu = current(c);
    const l = box.querySelector('.bvtrkl');
    if(l) l.innerHTML = cu ? T('Stage') + ' ' + (cu.i + 1) + ' ' + T('of') + ' ' + BKSEC.length + '<b>' + esc(T(cu.label)) + '</b>'
                           : T('Stages') + '<b>' + esc(T('All done')) + '</b>';
    bvSteps.querySelectorAll('.bvstp').forEach((p, i) => p.classList.toggle('cur', !!cu && i === cu.i));
  }
  function head(c){
    const src = bkPhoto(c);
    let age = '';
    try{ age = ageFrom(c.dob); }catch(e){}
    if(age === '' || age == null) age = (c.age == null || c.age === '') ? '' : c.age;
    const place = [c.city, c.country].filter(Boolean).join(', ');
    const sub = [place, age !== '' ? age + ' ' + T('yrs') : ''].filter(Boolean).join(' · ');
    const got = BVLOAD.get(c.id);
    bvHd.innerHTML =
      '<span class="bvface">' + (src ? '<img src="' + esc(src) + '" alt="">' : '') + '</span>' +
      '<div class="bvwho"><h2 class="bvnm">' + esc(c.nm || 'Unnamed') + '</h2>' +
      '<div class="bvag">' + (c.ag ? '<b>' + esc(c.ag) + '</b>' : '') + esc(sub) + '</div></div>' +
      '<div class="bvact"><div class="bvtrk"><div class="bvtrkl"></div></div>' +
        /* the same EN / 한 switch as the top bar */
        '<div class="bvlang2" role="group" aria-label="Language">' +
          '<button type="button" data-bvlang="en" aria-pressed="' + (LANG !== 'ko') + '">EN</button>' +
          '<button type="button" data-bvlang="ko" aria-pressed="' + (LANG === 'ko') + '">\ud55c</button></div>' +
        '<span class="bvfiles"><button type="button" class="bvbtn bvfbtn" data-bvfiles aria-expanded="false" ' +
          'aria-haspopup="true">' + FOLDER + T('Files') + CHEV + '</button>' +
          '<div class="bvfmenu" hidden role="menu">' +
            '<button type="button" class="bvbtn" data-bvpick role="menuitem">' +
              T(got && got.src !== 'dbx' ? 'Reload folder' : 'Open folder on this computer') + '</button>' +
            '<button type="button" class="bvbtn" data-bvdbx role="menuitem">' + T('Show the Dropbox folder') + '</button>' +
          '</div></span>' +
        '<button type="button" class="bvx" aria-label="Close" title="Close (Esc)">×</button></div>';
    trk(c);
  }
  function tabs(){
    const bs = [...bvTabs.querySelectorAll('[data-bvtab]')];
    if(!bs.length || bvTabs.querySelector('.bvtg')) return;
    bs.forEach(b => { const tn = b.firstChild; if(tn && tn.nodeType === 3) tn.nodeValue = T(pretty(b.dataset.bvtab)); });
    const g1 = document.createElement('span'); g1.className = 'bvtg'; g1.textContent = T('Portfolio');
    bvTabs.insertBefore(g1, bs[0]);
    if(bs[3]){
      const sp = document.createElement('i'); sp.className = 'bvtsep';
      const g2 = document.createElement('span'); g2.className = 'bvtg'; g2.textContent = T('Documents');
      bvTabs.insertBefore(sp, bs[3]); bvTabs.insertBefore(g2, bs[3]);
    }
  }
  function side(c){
    const prof = bvSide.querySelector('.bvprof');
    if(!prof || prof.classList.contains('bvdet') || prof.querySelector('.bvsec')) return;
    const mx = prof.querySelector('.bvpmx'), dl = prof.querySelector('dl.bvpl');
    const uni = prof.querySelector('.bvpuni') || bvSide.querySelector('.bvsh .bvpuni');
    const sec = (cls, title, right) => { const d = document.createElement('div'); d.className = 'bvsec ' + cls;
      d.innerHTML = '<div class="bvsech"><b>' + esc(T(title)) + '</b></div>';
      if(right) d.firstChild.appendChild(right); return d; };
    const first = document.createComment('top'); prof.insertBefore(first, prof.firstChild);
    /* next step */
    const cu = current(c);
    const nx = sec('bvnext', 'Next step');
    const sp = document.createElement('span'); sp.textContent = cu ? (cu.i + 1) + ' / ' + BKSEC.length : '✓';
    nx.firstChild.appendChild(sp);
    const row = document.createElement('div'); row.className = 'bvnx';
    row.innerHTML = cu
      ? '<span class="dot' + (cu.pv === 'y' ? '' : ' no') + '"></span><div><b>' + esc(T(cu.label)) + '</b><em>' +
        esc(T(cu.pv === 'y' ? 'In process' : 'Not started')) + (cu.nf ? ' · ' + cu.nf + ' ' + T(cu.nf === 1 ? 'file' : 'files') : '') +
        '</em></div><button type="button" class="bvopen" data-bvsec="' + cu.k + '">' + esc((typeof LANG !== 'undefined' && LANG === 'ko') ? T(cu.label) + ' 열기' : 'Open ' + cu.label) + '</button>' +
        '<button type="button" class="bvdone" data-bvdone="' + esc(c.id) + '|' + cu.k + '">' + esc(T('Mark done')) + '</button>'
      : '<span class="dot" style="background:#2E8A55"></span><div><b>' + esc(T('All five stages are done')) + '</b></div>';
    nx.appendChild(row);
    prof.insertBefore(nx, first);
    /* measurements */
    if(mx){
      const ms = sec('bvsec--mx', 'Measurements', uni || null);
      prof.insertBefore(ms, first); ms.appendChild(mx); mx.hidden = false;
    }
    prof.querySelectorAll('.bvpuni').forEach(u => { if(!u.closest('.bvsech')) u.remove(); });
    if(dl){
      /* profile: the paired fields and age; travel: where and when */
      const rows = [...dl.children];
      const travel = rows.filter(r => r.classList.contains('bvpr') && /Countries|Availability|Entry|Departure|국가|가능|입국|출국/.test((r.querySelector('dt') || {}).textContent || ''));
      const ps = sec('bvsec--prof', 'Profile'); prof.insertBefore(ps, first); ps.appendChild(dl);
      dl.querySelectorAll('.bvpc').forEach(pc => { if(pc.querySelector('.bvwt')) pc.classList.add('bvpc--wt'); });
      if(travel.length){
        const ts = sec('bvsec--trv', 'Travel'); prof.insertBefore(ts, first);
        const dl2 = document.createElement('dl'); dl2.className = 'bvpl'; ts.appendChild(dl2);
        const icons = [IC.countries, IC.avail, IC.entry, IC.depart];
        travel.forEach((r, i) => { r.style.setProperty('--ic', icons[i] || IC.avail); dl2.appendChild(r); });
      }
    }
    first.remove();
  }
  const _draw = bvDraw;
  bvDraw = function(){
    _draw.apply(this, arguments);
    if(!bv) return;
    const c = BOOK.get(bv.id); if(!c) return;
    try{ head(c); tabs(); side(c); }catch(e){ console.warn('bv redesign', e); }
    if(typeof LANG !== 'undefined' && LANG !== 'en') try{ langWalk(bvHd); langWalk(bvTabs); }catch(e){}
  };
  const _side = bvDrawSide;
  bvDrawSide = function(c){
    _side.apply(this, arguments);
    try{ side(c); }catch(e){ console.warn('bv side', e); }
  };
  const _ref = bvSideRefresh;
  bvSideRefresh = function(){
    _ref.apply(this, arguments);
    if(!bv) return;
    const c = BOOK.get(bv.id); if(c) try{ trk(c); }catch(e){}
  };
  /* the files menu, mark done, and letting go of a picked photo */
  bvEl.addEventListener('click', e => {
    const t = e.target.closest ? e.target : null; if(!t || !bv) return;
    const fb = t.closest('[data-bvfiles]');
    const menu = bvHd.querySelector('.bvfmenu');
    if(fb){ e.stopPropagation(); const o = menu.hidden; menu.hidden = !o; fb.setAttribute('aria-expanded', String(o)); return; }
    if(menu && !menu.hidden && !t.closest('.bvfmenu')){ menu.hidden = true; const b = bvHd.querySelector('[data-bvfiles]'); if(b) b.setAttribute('aria-expanded', 'false'); }
    else if(menu && !menu.hidden && t.closest('.bvfmenu .bvbtn')) setTimeout(() => { menu.hidden = true; }, 0);
    const dn = t.closest('[data-bvdone]');
    if(dn){
      e.stopPropagation();
      if(typeof SIGNED === 'function' && !SIGNED()){ try{ nudgeSignIn(dn); }catch(err){} return; }
      const [bid, k] = dn.dataset.bvdone.split('|');
      bkStage(bid, k, 'g');
      setTimeout(() => { if(bv) bvDraw(); }, 30);
      return;
    }
    const op = t.closest('.bvnx [data-bvsec]');
    if(op){ e.stopPropagation(); bv.pane = op.dataset.bvsec; bvSideRefresh(true); return; }
    if(bv.sel != null && !(t.closest('.bvsp[data-bvsel]') && t.closest('img, canvas, video, .bvfile')) && !t.closest('.bvtool, .bvpdfm')) bvPick(null);
  });
  Object.assign(KO, {'Files': '파일', 'Show the Dropbox folder': '드롭박스 폴더 보기', 'Portfolio': '포트폴리오',
    'Documents': '서류', 'Book': '북', 'Snaps': '스냅', 'Videos': '영상', 'Passport': '여권', 'Contract': '계약서',
    'Visa': '비자', 'Airline Ticket': '항공권', 'Statement': '진술서', 'Next step': '다음 단계', 'Measurements': '사이즈',
    'Profile': '프로필', 'Travel': '여행', 'Mark done': '완료로 표시', 'Notes': '메모', 'In process': '진행 중',
    'Not started': '시작 전', 'Stage': '단계', 'of': '/', 'Stages': '단계', 'All done': '모두 완료',
    'All five stages are done': '다섯 단계가 모두 끝났습니다', 'yrs': '세', 'file': '파일', 'files': '파일',
    'Light mode': '라이트 모드', 'Dim mode': '딤 모드', 'Dark mode': '다크 모드'});
})();
