/* ==================== 1.2.237: phone fixes (user, 18 Nov 2026, "Mobile troubleshoot") ====================
   Only for phone-width screens (max-width 760px); the computer program looks and works as before.
   - Tap outside an open list / explanation closes it (Back closes it too: illu-back.js).
   - The bottom bar holds the boards only and scrolls sideways with a finger; Search moved to the top bar.
   - Clocks: all of them at once in a small grid (tap a clock to change its city); the continent map widget is not
     shown on phones (the Atlas already has the map).
   - The page title ("New Face & Development") is one smaller line.
   - New Face & Development: For you / New faces & Development look like two clear choices; full screen has a Back bar;
     one "Clear history" button.
   - Directory: one column - the agency list, or the agency you opened (Back returns to the list). */
(function(){
  'use strict';
  const PH = () => { try{ return matchMedia('(max-width:760px)').matches; }catch(e){ return false; } };
  const KO = () => { try{ return document.documentElement.lang === 'ko' || (window.illuLang && window.illuLang() === 'ko'); }catch(e){ return false; } };
  const L = (en, ko) => KO() ? ko : en;

  const css = `
#phfsbar,#phagback{display:none}
/* the narrowest phones: no room for "Download this list" beside the title (a spreadsheet download is a computer task) */
@media (max-width:380px){ #appbar #abtools .abnew[data-abproxy="dirxbtn"]{display:none!important} }
/* narrow phones: the top bar's round buttons a little smaller and closer, so the page name has room */
@media (max-width:440px){
  #appbar .abi{gap:4px!important;padding-left:6px!important;padding-right:6px!important}
  #appbar .abr{gap:0!important}
  #appbar .abr>.abib,#appbar .abr>.abme,#appbar #abphsearch,#appbar #abmore,#appbar .abib{width:30px!important;min-width:30px!important;height:30px!important}
  #appbar #abflt{width:32px!important;min-width:32px!important}
  #appbar #ababout{padding-left:2px!important;padding-right:2px!important;gap:2px!important}
  #appbar #ababout .q{display:none!important}
}
@media (max-width:760px){
  /* the bottom bar: boards only, a finger slides it left and right */
  #shrail{touch-action:pan-x;overscroll-behavior-x:contain;scroll-snap-type:none;-webkit-overflow-scrolling:touch}
  #shrail .shnv{flex:none}
  #shrail .shfoot{display:none!important}
  #abphsearch{flex:none}
  /* the usage pill: a small dot in the corner while all is well (it covered buttons); the words show again when it is amber or red */
  #illuusage.float{left:auto!important;right:8px!important;bottom:calc(68px + env(safe-area-inset-bottom,0px))!important;z-index:55!important}
  #illuusage.float.green{font-size:9.5px!important;padding:2px 7px!important;gap:4px!important;opacity:.9}   /* 1.2.270: says Supabase */
  body.d2carding #illuusage.float,body.rcfull #illuusage.float{display:none!important}
  /* "Download this list" in the top bar: a small ↓ button on a phone (the title had no room) */
  #appbar #abtools{flex:0 0 auto!important;min-width:max-content!important;overflow:visible!important}
  #appbar #abtools .absep2{display:none!important}
  #abtools .abnew[data-abproxy="dirxbtn"]{font-size:0!important;width:34px!important;min-width:34px!important;height:34px!important;padding:0!important;border-radius:10px!important;display:inline-grid!important;place-items:center!important}
  #abtools .abnew[data-abproxy="dirxbtn"]::before{content:"↓";font-size:17px;font-weight:700;line-height:1}
  /* the big page names (Today, Arrival/Departure, Favorite Agencies): smaller on a phone, two lines at most */
  #appbar #shtitle{font-size:clamp(17px,5.4vw,22px)!important;line-height:1.1!important;white-space:normal!important;min-width:0!important;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;word-break:keep-all}
  body.shtoday #appbar #shtitle,body.shextra #appbar #shtitle{display:-webkit-box!important}
  /* the page title: one line, smaller */
  #appbar .abib,#appbar .abr>.abib,#appbar .abme{width:32px!important;min-width:32px!important;height:32px!important}
  #appbar .abr{gap:2px!important;flex:0 0 auto!important;width:auto!important;max-width:none!important;min-width:max-content!important}
  #ababout{overflow:hidden!important}
  #appbar #abflt{width:34px!important;min-width:34px!important;padding:0!important}
  #appbar [data-abp="log"]{display:none!important}   /* the Arrival/Departure shortcut: the bottom bar has the board */
  #ababout b#abtitle{font-size:15px!important;line-height:1.15!important;white-space:normal!important;letter-spacing:0!important;text-align:left;display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:normal;word-break:keep-all}
  #ababout{max-width:none!important;min-width:0!important;flex:0 1 auto!important}
  /* clocks: all at once, small; tap one to change it */
  #wmap,.shclk .wmap{display:none!important}
  #clocks.clocks{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px!important;overflow:visible!important;padding:0!important;height:auto!important}
  #clocks .clk{min-width:0!important;width:auto!important;height:auto!important;min-height:0!important;padding:7px 8px!important;border-radius:12px!important;display:flex!important;flex-direction:column;gap:1px;cursor:pointer}
  #clocks .clk .ckface,#clocks .clk .ckbar,#clocks .clk .ckst,#clocks .clk .ckgrip,#clocks .clk .ckdot{display:none!important}
  #clocks .clk .ckh,#clocks .clk .ckr,#clocks .clk .ckd{display:block!important;margin:0!important;padding:0!important;position:static!important}
  #clocks .clk .ckc{display:block;font-size:10.5px!important;letter-spacing:.06em!important;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #clocks .clk .ckc em{display:none!important}
  #clocks .clk .ckt{font-size:19px!important;line-height:1.15!important;display:flex!important;align-items:baseline;gap:3px}
  #clocks .clk .ckt svg{display:none!important}
  #clocks .clk .ckap b{font-size:9.5px!important}
  #clocks .clk .ckm,#clocks .clk .ckd{font-size:10.5px!important;line-height:1.2!important;display:inline!important}
  #clocks .clk .ckm{margin-left:4px!important}
  #clocks .clk .ckp{display:none!important}
  #clocks .clk.phedit{grid-column:1 / -1}
  #clocks .clk.phedit .ckp{display:flex!important;gap:6px;margin-top:6px!important;position:static!important}
  #clocks .clk.phedit .ckp select{flex:1;min-width:0;font-size:13px}
  .shclk,.ckrow{height:auto!important;min-height:0!important}
  /* New Face & Development: two clear choices */
  #pane-arr [role=tablist]{display:flex!important;gap:6px!important;padding:4px!important;border-radius:14px!important;background:var(--wash,#F3EEF5)!important;border:0!important}
  #pane-arr [data-rctab]{flex:1 1 0;min-width:0;white-space:normal!important;line-height:1.2!important;padding:9px 8px!important;border-radius:11px!important;font-size:13.5px!important;
    border:1.5px solid color-mix(in srgb,var(--acc,#5A2C57) 35%,transparent)!important;background:var(--surf,#fff)!important;color:var(--acc,#5A2C57)!important;text-align:center}
  #pane-arr [data-rctab][aria-selected="true"]{background:var(--acc,#5A2C57)!important;color:#fff!important;border-color:var(--acc,#5A2C57)!important;box-shadow:0 4px 12px -6px rgba(60,20,60,.6)}
  #pane-arr [data-rctab] s{text-decoration:none;opacity:.75}
  #pane-arr.rcphone .rcclr{display:none!important}
  #pane-arr.rcphone .rcph .rcclr{display:inline-flex!important}
  /* full screen: a bar with Back at the top */
  body.rcfull #phfsbar,body.atlmaxon #phfsbar,body.d2bfull #phfsbar{display:flex;position:fixed;left:0;right:0;top:0;z-index:100;height:calc(46px + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) 12px 0;align-items:center;
    background:color-mix(in srgb,var(--surf,#fff) 92%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid var(--line,#ececee);box-sizing:border-box}
  #phfsbar button{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px 0 8px;border-radius:999px;border:1px solid var(--line,#e2dbe5);background:var(--surf,#fff);color:var(--ink,#1d1722);font:600 14px var(--sans,Inter,system-ui,sans-serif)}
  #phfsbar svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  body.rcfull #pane-arr .rcwrap{top:calc(46px + env(safe-area-inset-top,0px))!important;height:auto!important}
  body.atlmaxon .atl.atlmax{padding-top:calc(46px + env(safe-area-inset-top,0px))!important}
  /* Directory: one column - the list, or the agency you opened */
  #pane-dir .d2wrap{height:auto!important;min-height:0!important;flex-direction:column}
  #pane-dir .d2wrap .d2list{width:100%!important;max-height:none!important;border-right:0!important;overflow:visible!important}
  #pane-dir .d2wrap:has(.d2panel .d2blank) .d2panel{display:none!important}
  #pane-dir .d2wrap:not(:has(.d2panel .d2blank)) .d2list{display:none!important}
  #pane-dir .d2wrap:not(:has(.d2panel .d2blank)) .d2panel{width:100%!important}
  #pane-dir .d2wrap:not(:has(.d2panel .d2blank)) #phagback{display:inline-flex;align-items:center;gap:6px;margin:8px 8px 0;height:34px;padding:0 14px 0 8px;border-radius:999px;border:1px solid var(--line,#e2dbe5);background:var(--surf,#fff);color:var(--acc,#5A2C57);font:600 14px var(--sans,Inter,system-ui,sans-serif);align-self:flex-start}
  #phagback svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
}`;
  const st = document.createElement('style'); st.id = 'illuphonecss'; st.textContent = css; document.head.appendChild(st);

  const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  /* full screen: the Back bar */
  const bar = document.createElement('div'); bar.id = 'phfsbar';
  bar.innerHTML = '<button type="button" data-phfsback>' + BACK + '<span></span></button>';
  document.body.appendChild(bar);
  const fsOff = () => {
    const B = document.body.classList;
    try{
      if(B.contains('rcfull') && window.__rcFull){ window.__rcFull(false); return; }
      if(B.contains('atlmaxon') && window.atlasSetMax){ window.atlasSetMax(false); return; }
      if(B.contains('d2bfull')) document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    }catch(e){}
  };
  bar.addEventListener('click', e => { if(e.target.closest('[data-phfsback]')){ e.preventDefault(); fsOff(); } });
  const label = () => { const s = bar.querySelector('span'); if(s) s.textContent = L('Exit full screen', '전체 화면 닫기'); };

  /* Search: from the bottom bar to the top bar */
  function moveSearch(){
    if(!PH()) return;
    const abi = document.querySelector('#appbar .abi'); if(!abi || document.getElementById('abphsearch')) return;
    const src = document.querySelector('#shrail .shsearch'); if(!src) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'abphsearch'; b.className = 'abib';
    b.setAttribute('aria-label', L('Search', '검색')); b.title = L('Search', '검색');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
    b.addEventListener('click', e => { e.preventDefault(); src.click(); });
    const me = abi.querySelector('.abme') || abi.querySelector('#abmore');
    if(me) me.parentNode.insertBefore(b, me); else abi.appendChild(b);
  }

  /* Directory: a Back button above the agency you opened */
  function dirBack(){
    const pan = document.querySelector('#pane-dir .d2panel'); if(!pan || pan.querySelector('#phagback')) return;
    if(pan.querySelector('.d2blank')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'phagback';
    b.innerHTML = BACK + '<span>' + L('All agencies', '에이전시 목록') + '</span>';
    b.addEventListener('click', e => { e.preventDefault(); try{ window.__illuDirAgClose && window.__illuDirAgClose(); }catch(err){} });
    pan.insertBefore(b, pan.firstChild);
  }

  /* the map's hint speaks of fingers on a phone */
  function mapHint(){ const h = document.querySelector('#pane-atl .atlhint'); if(!h || h.__ph) return; h.__ph = 1;
    h.textContent = L('Drag to turn the globe · pinch to zoom · Back steps out', '드래그로 지구본 회전 · 두 손가락으로 확대 · 뒤로 버튼으로 나가기'); }
  /* clocks: tap one to show its region / city lists */
  document.addEventListener('click', e => {
    if(!PH()) return;
    const c = e.target.closest && e.target.closest('#clocks .clk'); if(!c) return;
    if(e.target.closest('select, option, .ckp')) return;
    const on = !c.classList.contains('phedit');
    document.querySelectorAll('#clocks .clk.phedit').forEach(x => x.classList.remove('phedit'));
    if(on) c.classList.add('phedit');
  });

  /* tap outside an open list or explanation closes it */
  const POPS = [
    {open: () => { const b = document.getElementById('ababout'); return !!b && b.getAttribute('aria-expanded') === 'true'; }, inside: ['#abtip', '#ababout'], close: () => { const b = document.getElementById('ababout'); b && b.click(); }},
    {open: () => !!document.querySelector('.shinfop'), inside: ['.shinfop', '[data-shinfo]'], close: () => { const b = document.querySelector('[data-shinfo]'); b && b.click(); }},
    {open: () => { const p = document.getElementById('d2pop'); return !!p && !p.hidden && p.offsetParent !== null; }, inside: ['#d2pop', '[data-d2f]'], close: () => document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))},
    {open: () => !!document.querySelector('#pane-arr .rcddl'), inside: ['.rcdd'], close: () => { const b = document.querySelector('#pane-arr [data-rcdd]'); b && b.click(); }},
    {open: () => !!document.querySelector('#clocks .clk.phedit'), inside: ['#clocks .clk.phedit'], close: () => document.querySelectorAll('#clocks .clk.phedit').forEach(x => x.classList.remove('phedit'))}
  ];
  document.addEventListener('pointerdown', e => {
    if(!PH() || !e.target.closest) return;
    for(const p of POPS){
      let o = false; try{ o = p.open(); }catch(err){}
      if(!o || p.inside.some(s => e.target.closest(s))) continue;
      try{ p.close(); }catch(err){}
    }
  }, true);

  /* the page title gets smaller (down to 12px) until the top bar's buttons all fit on the screen */
  function fitTitle(){
    if(!PH()) return;
    const t = document.getElementById('abtitle'), abi = document.querySelector('#appbar .abi'); if(!t || !abi) return;
    t.style.removeProperty('font-size');
    let fs = parseFloat(getComputedStyle(t).fontSize) || 16;
    const ab = document.getElementById('ababout');
    const over = () => { const r = abi.getBoundingClientRect(); return (ab && ab.scrollWidth > ab.clientWidth + 1) || t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1 || abi.scrollWidth > abi.clientWidth + 1 || [...abi.querySelectorAll('button')].some(b => b.offsetParent && b.getBoundingClientRect().right > r.right + 1); };
    for(let i = 0; i < 16 && over() && fs > 11.5; i++){ fs -= 0.5; t.style.setProperty('font-size', fs + 'px', 'important'); }
  }
  /* a big page name that is one long word (Arrival/Departure) gets smaller until it fits */
  function slashBreak(){
    if(!PH()) return;
    const t = document.getElementById('shtitle'); if(!t || t.offsetParent === null) return;
    t.style.removeProperty('font-size');
    let fs = parseFloat(getComputedStyle(t).fontSize) || 20;
    for(let i = 0; i < 20 && (t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1) && fs > 14; i++){ fs -= 0.5; t.style.setProperty('font-size', fs + 'px', 'important'); }
  }
  addEventListener('resize', () => requestAnimationFrame(fitTitle));
  let t = 0;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { if(!PH()) return; moveSearch(); dirBack(); label(); mapHint(); requestAnimationFrame(() => { fitTitle(); slashBreak(); }); }, 80); })
    .observe(document.documentElement, {childList: true, subtree: true});
  setTimeout(() => { moveSearch(); dirBack(); label(); }, 500);
})();
