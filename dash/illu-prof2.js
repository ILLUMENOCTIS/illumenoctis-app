/* 1.2.201 (user, 15 Nov 2026, approved demos "Profile Gender Options" 1 + "Profile Piercings Options" B):
   - Booking card Profile, in this order: Name | Agency · City | Country · Age | Date of birth · Gender | Eye color ·
     Hair color | Hair type · Experience | Countries worked in · Tattoos | Where · Left ear | Right ear.
   - Gender reads like every other field ("Female"); clicking it opens a small menu: Female / Male / Not stated.
     The same menu is used wherever the gender is set (booking card, model side panel, New card window).
   - Piercings: two cells, Left ear | Right ear ("2 · Lobe, Helix"); clicking either opens the ear chart below them. */
(function(){
  'use strict';
  if(window.__illuProf2) return; window.__illuProf2 = true;
  const KO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => KO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
  const WORD = g => g === 'F' ? L('Female', '여성') : g === 'M' ? L('Male', '남성') : L('Not stated', '미표기');

  /* ---------- the Gender menu (one for the whole program) ---------- */
  const PICK = {};                                   // context -> function(button, value)
  window.__illuGenderPick = (ctx, fn) => { PICK[ctx] = fn; };
  window.__illuGenderHtml = (g, ctx, key, ro) => '<span class="gmn"><button type="button" class="gmv' + (g === 'F' || g === 'M' ? '' : ' ph') + '" data-gmctx="' + H(ctx) + '" data-gmkey="' + H(key || '') + '" data-gmval="' + H(g || '') + '" aria-haspopup="menu" aria-expanded="false"' + (ro ? ' disabled title="' + H(L('Sign in to edit', '편집하려면 로그인')) + '"' : '') + '>' +
    '<span>' + H(WORD(g)) + '</span><i class="gmc" aria-hidden="true"></i></button></span>';
  let MENU = null, FROM = null;
  /* under the button (above it near the bottom of the screen); it follows the button while the panel scrolls */
  function place(){
    if(!MENU || !FROM) return;
    const r = FROM.getBoundingClientRect();
    if(!FROM.isConnected || r.bottom < 0 || r.top > window.innerHeight){ closeMenu(); return; }
    const mh = MENU.offsetHeight, mw = MENU.offsetWidth, below = r.bottom + 4 + mh < window.innerHeight;
    MENU.style.left = Math.max(8, Math.min(r.left - 6, window.innerWidth - mw - 8)) + 'px';
    MENU.style.top = (below ? r.bottom + 4 : Math.max(8, r.top - mh - 4)) + 'px';
  }
  function closeMenu(){ if(MENU){ MENU.remove(); MENU = null; } if(FROM){ FROM.setAttribute('aria-expanded', 'false'); try{ FROM.focus({preventScroll: true}); }catch(e){} FROM = null; } }
  function openMenu(btn){
    closeMenu();
    FROM = btn; btn.setAttribute('aria-expanded', 'true');
    const cur = btn.dataset.gmval || '';
    MENU = document.createElement('div'); MENU.className = 'gmm'; MENU.setAttribute('role', 'menu');
    MENU.innerHTML = [['F', L('Female', '여성')], ['M', L('Male', '남성')], ['', L('Not stated', '미표기')]].map(([v, t]) =>
      '<button type="button" role="menuitemradio" data-gmset="' + v + '" aria-checked="' + (cur === v) + '">' + H(t) + '</button>').join('');
    document.body.appendChild(MENU);
    place();
    const on = MENU.querySelector('[aria-checked="true"]') || MENU.querySelector('button'); try{ on.focus({preventScroll: true}); }catch(e){}
  }
  document.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target : null; if(!t) return;
    const b = t.closest('.gmv');
    if(b){ e.preventDefault(); e.stopPropagation(); if(b.disabled){ try{ nudgeSignIn(b); }catch(er){} return; } if(FROM === b) closeMenu(); else openMenu(b); return; }
    if(MENU && !t.closest('.gmm')) closeMenu();
  }, true);
  /* the menu floats on top of everything: its presses must not count as a click outside a panel (which closes it) */
  ['pointerdown', 'mousedown', 'touchstart'].forEach(ev => window.addEventListener(ev, e => { if(e.target && e.target.closest && e.target.closest('.gmm, .gmv')) e.stopPropagation(); }, {capture: true, passive: true}));
  window.addEventListener('click', e => {
    const s = e.target && e.target.closest && e.target.closest('.gmm [data-gmset]'); if(!s) return;
    e.preventDefault(); e.stopPropagation();
    const btn = FROM, v = s.dataset.gmset; closeMenu();
    if(btn && PICK[btn.dataset.gmctx]) try{ PICK[btn.dataset.gmctx](btn, v); }catch(er){}
  }, true);
  document.addEventListener('keydown', e => {
    if(!MENU) return;
    if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); closeMenu(); return; }
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); const bs = [...MENU.querySelectorAll('button')], i = bs.indexOf(document.activeElement); bs[(i + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus(); }
  }, true);
  window.addEventListener('resize', () => { if(MENU) place(); });
  document.addEventListener('scroll', () => { if(MENU) place(); }, true);

  /* the booking card: the same save as the old Female / Male buttons (illu-pipe.js) */
  window.__illuGenderPick('bv', (btn, v) => {
    try{ if(!SIGNED()){ nudgeSignIn(); return; } }catch(er){}
    const id = (typeof bv !== 'undefined' && bv) ? bv.id : ''; const c = id && BOOK.get(id); if(!c) return;
    c.g = v;
    try{ saveBook(id, true); }catch(er){}
    try{ renderBook(); }catch(er){}
    try{ bvDraw(); }catch(er){}
  });

  /* ---------- the booking card's Profile ---------- */
  const qn = s => { const m = String(s).match(/[×x*]\s*(\d+)\s*$/i); return m ? Math.max(1, +m[1]) : 1; };
  function earVal(c, lf, nf){
    const list = String(c[lf] || '').split(',').map(s => s.trim()).filter(Boolean);
    let n = list.reduce((a, s) => a + qn(s), 0);
    if(!n){ const t = parseInt(c[nf], 10); if(!isNaN(t)) n = t; }
    return {n, spots: list.join(', ')};
  }
  function earCell(c, k){
    const lf = k === 'L' ? 'pll' : 'prl', nf = k === 'L' ? 'pln' : 'prn', v = earVal(c, lf, nf);
    const lab = k === 'L' ? L('Left ear', '왼쪽 귀') : L('Right ear', '오른쪽 귀');
    return '<div class="bvpc bvearc"><dt>' + lab + '</dt><dd><button type="button" class="bvearv" data-bvear="' + k + '" aria-expanded="false" title="' + H(L('Show the ear chart', '귀 그림 보기')) + '">' +
      (v.n ? '<span class="n">' + v.n + '</span>' + (v.spots ? '<span class="s">\u00a0·\u00a0' + H(v.spots) + '</span>' : '') : '<span class="ph">' + H(L('None', '없음')) + '</span>') + '</button></dd></div>';
  }
  function refreshEars(sec, c){
    const row = sec.querySelector('.bvearrow'); if(!row) return;
    const open = !!(sec.querySelector('.bvpzrow .pzdet') || {}).open;
    row.innerHTML = earCell(c, 'L') + earCell(c, 'R');
    row.querySelectorAll('[data-bvear]').forEach(b => b.setAttribute('aria-expanded', String(open)));
    row.classList.toggle('open', open);
  }
  function tidy(){
    if(typeof bv === 'undefined' || !bv) return;
    const c = BOOK.get(bv.id); if(!c) return;
    const sec = document.querySelector('.bvside .bvsec--prof'); if(!sec) return;
    const dl = sec.querySelector('dl.bvpl'); if(!dl || dl.dataset.p2) return;
    const ro = !(typeof SIGNED === 'function' && SIGNED());
    const rowOf = re => { const d = [...dl.querySelectorAll(':scope > div > dt, :scope > div > .bvpc > dt')].find(x => re.test(x.textContent.trim())); return d ? d.closest('dl > div') : null; };
    const R = {
      name: rowOf(/^(name|이름)$/i), city: rowOf(/^(city|도시)$/i), age: rowOf(/^(age|나이)$/i),
      sex: (dl.querySelector('.bvsex') || {closest: () => null}).closest('dl > div'), eye: rowOf(/^(eye colou?r|눈)/i),
      hair: rowOf(/^(hair colou?r|머리)/i), exp: rowOf(/^(experience|경력)/i), tat: rowOf(/^(tattoos|타투)/i), pier: (dl.querySelector('.pzdet') || {closest: () => null}).closest('dl > div')
    };
    /* Gender beside Eye color (the hidden Weight cell stays where it is) */
    if(R.eye){
      const g = document.createElement('div'); g.className = 'bvpc bvgc';
      g.innerHTML = '<dt>' + H(L('Gender', '성별')) + '</dt><dd>' + window.__illuGenderHtml(c.g, 'bv', c.id, ro) + '</dd>';
      R.eye.insertBefore(g, R.eye.firstChild); R.eye.classList.add('bvgrow');
    }
    if(R.sex) R.sex.remove();
    /* Left ear | Right ear, the chart under them */
    let earRow = null;
    if(R.pier){
      earRow = document.createElement('div'); earRow.className = 'bvpr2 bvearrow';
      R.pier.classList.add('bvpzrow');
      const det = R.pier.querySelector('.pzdet');
      R.pier.classList.toggle('on', !!(det && det.open));
      if(det && !det.__p2){ det.__p2 = true;
        det.addEventListener('toggle', () => { R.pier.classList.toggle('on', det.open); refreshEars(sec, BOOK.get(bv.id) || c); });
        new MutationObserver(() => { const cc = BOOK.get(det.dataset.pzbk); if(cc) refreshEars(sec, cc); }).observe(det, {childList: true, subtree: true, characterData: true});
      }
    }
    const order = [R.name, R.city, R.age, R.eye, R.hair, R.exp, R.tat, earRow, R.pier].filter(Boolean);
    dl.prepend(...order);
    if(earRow) refreshEars(sec, c);
    dl.dataset.p2 = '1';
  }
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('.bvside [data-bvear]'); if(!b) return;
    e.preventDefault();
    const det = document.querySelector('.bvside .bvpzrow .pzdet'); if(!det) return;
    det.open = !det.open;
    try{ localStorage.setItem('illum.pieropen', det.open ? '1' : '0'); }catch(er){}
    if(det.open) setTimeout(() => { try{ det.scrollIntoView({block: 'nearest', behavior: 'smooth'}); }catch(er){} }, 30);
  });
  function hook(name){
    try{
      const f = window[name]; if(typeof f !== 'function' || f.__p2) return false;
      const w = function(){ const r = f.apply(this, arguments); try{ tidy(); }catch(e){} return r; };
      w.__p2 = true; window[name] = w;
      if(name === 'bvDrawSide') bvDrawSide = w; else if(name === 'bvDraw') bvDraw = w;
      return true;
    }catch(e){ return false; }
  }
  hook('bvDrawSide'); hook('bvDraw');

  const st = document.createElement('style');
  st.textContent = `
.gmn{display:inline-flex;min-width:0}
.gmv{display:inline-flex;align-items:center;gap:8px;border:0;background:none;padding:0;margin:0;font:inherit;font-size:14px;line-height:1.3;color:var(--ink,#211C26);cursor:pointer;min-width:0;max-width:100%;text-align:left}
.gmv span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gmv.ph{color:var(--faint,#B3ABB8);font-style:italic}
.gmv:disabled{cursor:default}
.gmv:hover:not(:disabled) .gmc,.gmv[aria-expanded="true"] .gmc{border-color:var(--acc,#6B2A5E)}
.gmv:focus-visible{outline:2px solid var(--acc,#6B2A5E);outline-offset:3px;border-radius:4px}
.gmc{flex:none;width:6px;height:6px;border-right:1.6px solid var(--mut,#7A7283);border-bottom:1.6px solid var(--mut,#7A7283);transform:rotate(45deg);margin-top:-4px;transition:transform .15s}
.gmv[aria-expanded="true"] .gmc{transform:rotate(-135deg);margin-top:2px}
.gmv:disabled .gmc{display:none}
.gmm{position:fixed;z-index:2147483000;background:var(--surf,#fff);border:1px solid var(--line,#ECE7F0);border-radius:10px;box-shadow:0 8px 24px rgba(20,10,30,.16);padding:4px;min-width:160px;display:flex;flex-direction:column}
.gmm button{border:0;background:none;text-align:left;font:inherit;font-size:13.5px;color:var(--ink,#211C26);padding:8px 10px;border-radius:7px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:34px}
.gmm button:hover,.gmm button:focus-visible{background:var(--surf2,#F7F5F9);outline:none}
.gmm button[aria-checked="true"]{color:var(--acc,#6B2A5E);font-weight:600}
.gmm button[aria-checked="true"]::after{content:'';width:9px;height:5px;border-left:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(-45deg) translateY(-2px)}
@media (max-width:760px){.gmm button{min-height:44px;font-size:15px}}
@media (prefers-reduced-motion:reduce){.gmc{transition:none}}
.bvside.bvside.bvside .bvsec--prof dl.bvpl > .bvpr2.bvgrow > .bvpc{grid-column:auto!important}
.bvside.bvside.bvside .bvsec--prof dl.bvpl > .bvpr2.bvgrow > .bvpc--wt{display:none!important}
.bvside .bvsec--prof .bvgc dd{display:flex;align-items:center;overflow:visible}
.bvside.bvside.bvside .bvsec--prof dl.bvpl > .bvpzrow{display:none!important}
.bvside.bvside.bvside .bvsec--prof dl.bvpl > .bvpzrow.on{display:block!important;height:auto!important;min-height:0!important;padding:0 0 8px!important;border-top:0!important}
.bvside.bvside.bvside .bvsec--prof dl.bvpl > .bvpzrow.on > dt{display:none!important}
.bvside.bvside.bvside .bvsec--prof dl.bvpl > .bvpzrow.on > dd{margin:0!important;width:100%}
.bvside .bvpzrow .pzdet > summary{display:none!important}
.bvside .bvpzrow .pzdet[open] > .bvpier{border-radius:9px!important;border-top:1px solid color-mix(in srgb,var(--acc) 28%,var(--line))!important}
.bvearv{display:flex;align-items:baseline;gap:0;border:0;background:none;padding:0;margin:0;font:inherit;font-size:14px;line-height:1.3;color:var(--ink,#211C26);cursor:pointer;min-width:0;max-width:100%;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bvearv .n{font-variant-numeric:tabular-nums}
.bvearv .s{color:var(--mut,#7A7283);overflow:hidden;text-overflow:ellipsis}
.bvearv .ph{color:var(--faint,#B3ABB8);font-style:italic}
.bvearv:hover .n,.bvearv:hover .ph{color:var(--acc,#6B2A5E)}
.bvearv:focus-visible{outline:2px solid var(--acc,#6B2A5E);outline-offset:3px;border-radius:4px}
.bvearrow.open .bvearc{background:color-mix(in srgb,var(--acc,#6B2A5E) 5%,transparent)}
`;
  document.head.appendChild(st);
})();
