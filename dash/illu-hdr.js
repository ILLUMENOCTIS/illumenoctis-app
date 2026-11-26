/* 1.2.289 (user, 26 Nov 2026: "make it cleaner and more efficient regarding space ... move the filter up on the same row as
   'Booking cards' and 'On-Stay'" -> option A, style A1: "Let's go with A1 and I want it to be like this throughout all the
   boards"): on every board with board tabs (Favorites: Mine / Members, Team Vote: Voting ... Cancelled, Booking: Booking cards /
   On-Stay) the tabs are a dark purple bar, and that board's own controls (the filters, or the sort and people buttons) sit on the
   same row to the right of it instead of on rows of their own. Filters are white chips under a small FILTER label, so they read
   apart from the board tabs. Phones keep the rows stacked (no room side by side). Only how things are laid out changes. */
(function(){
  if(window.__illuHdr) return; window.__illuHdr = true;
  const css = `
  /* 1.2.290 (user: "let's change this back to the previous setting"): the board tabs are back to their light look; they keep
     their place beside the board's controls. */
  /* 1.2.290 (user: "the filter in the 'New Faces & Development' Board, 'Directory' Board, and 'Booking' Board are all different.
     make it the same universal design"): one filter bar everywhere - a white box as tall as the board tabs (44 px), a FILTER
     label, the search field, grey filter buttons the same size as the tabs' buttons, then the count, Reset and (Directory)
     Maximize and Sort on the right. Nothing slides out of sight: what does not fit goes on to a second line. */
  #fbar .fbr1::before,#d2bar .d2r1::before{content:"FILTER";flex:none;align-self:center;font:700 10px/1 var(--sans,system-ui);letter-spacing:.14em;color:#9A8F9E;margin:0 4px 0 4px}
  @media (min-width:761px){
    #fbar.fpbar:not(.hdrside),#d2bar.fpbar{margin:12px 0 0!important}
    #fbar.fpbar,#d2bar.fpbar{background:var(--surf,#fff)!important;border:1px solid var(--line,#E7E2EA)!important;border-radius:14px!important;box-shadow:0 1px 2px rgba(27,23,36,.05)!important;padding:4px 6px!important;min-height:44px;box-sizing:border-box;gap:6px!important}
    #fbar .fbr1,#d2bar .d2r1{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:6px!important;row-gap:6px!important;min-height:34px}
    #fbar .fpscroll,#d2bar .fpscroll{display:flex!important;flex-wrap:wrap!important;overflow:visible!important;gap:6px!important;max-width:100%}
    #fbar .fbq,#d2bar .d2q{flex:0 1 240px!important;min-width:170px;height:34px!important;box-sizing:border-box;border-radius:9px!important;background:var(--surf2,#F4F1F5)!important;border:1px solid transparent!important;padding:0 10px!important;display:flex;align-items:center;gap:7px}
    #fbar .fbq input,#d2bar .d2q input{background:transparent!important;border:0!important;font-size:13px!important;min-width:0;flex:1;width:auto!important;max-width:none!important}
    #fbar .fbq svg,#d2bar .d2q svg{width:15px!important;height:15px!important;flex:none}
    #fbar .fbf,#d2bar .d2f{height:34px!important;box-sizing:border-box;padding:0 11px!important;border-radius:9px!important;background:var(--surf2,#F4F1F5)!important;border:1px solid transparent!important;font-size:12.5px!important;font-weight:500!important;white-space:nowrap}
    #fbar .fbf:hover,#d2bar .d2f:hover{border-color:var(--line,#E7E2EA)!important}
    #fbar .fbf[aria-expanded="true"],#d2bar .d2f[aria-expanded="true"],#fbar .fbf.on,#d2bar .d2f.on,#fbar .fbf.act,#d2bar .d2f.act,#d2bar .d2f[aria-pressed="true"]{background:#F3E7F2!important;border-color:#E2C9DF!important;color:#5A2C57!important}
    #fbar .fbsp,#d2bar .d2sp{flex:1 1 0!important;min-width:0}
    #fbar .fbcnt{font-size:12px;color:var(--mut,#6D6577);white-space:nowrap;margin:0 2px}
    #fbar .fbreset,#d2bar .d2maxb{height:34px!important;box-sizing:border-box;border-radius:9px!important;background:transparent!important;border:1px solid var(--line,#E7E2EA)!important;padding:0 12px!important;font-size:12.5px!important;font-weight:500!important}
    #d2bar .d2sort{height:34px!important;display:flex;align-items:center;gap:6px;font-size:12.5px}
    #d2bar .d2sort select{height:34px!important;border-radius:9px!important;border:1px solid var(--line,#E7E2EA)!important;background:var(--surf,#fff)!important;font-size:12.5px!important}
    /* 1.2.289 (user: "I want to make sure it isn't hidden"): when the window is too narrow for every filter on the tabs' line,
       the filters go on to a second line instead of sliding out of sight */
    #shsub2:not([hidden]) + #fbar.hdrside .fbr1{flex-wrap:wrap!important;row-gap:8px}
    #shsub2:not([hidden]) + #fbar.hdrside .fpscroll{flex-wrap:wrap!important;overflow:visible!important;max-width:100%;row-gap:8px}
    #shsub2:not([hidden]) + #fbar.hdrside input{max-width:230px}
    #shsub2:not([hidden]) + #fbar.hdrside .fbq,#shsub2:not([hidden]) + #fbar.hdrside label:has(input){flex:1 1 150px!important;min-width:140px!important;max-width:240px}
  }`;
  const st = document.createElement('style'); st.id = 'illu-hdr'; st.textContent = css; document.head.appendChild(st);
  /* what sits beside the tabs: the filter bar right after them, or the open board's top row of buttons. It is moved up onto
     the tabs' line (and right of them) with margins, so everything after it simply follows below, as before. */
  const wide = () => matchMedia('(min-width:761px)').matches;
  let SIDE = null;
  const undo = () => { if(SIDE){ SIDE.style.marginTop = SIDE.style.marginLeft = SIDE.style.minHeight = ''; SIDE.classList.remove('hdrside'); SIDE = null; } };
  function fix(){
    const t = document.getElementById('shsub2');
    if(!t || t.hidden || !t.offsetParent || !wide()){ undo(); return; }
    let side = null;
    const fb = document.getElementById('fbar');
    if(fb && !fb.hidden && fb.offsetParent && fb.previousElementSibling === t) side = fb;
    else {
      const pane = [...document.querySelectorAll('.pane')].find(p => !p.hidden && p.offsetParent);
      const h = pane && [...pane.querySelectorAll('.ivhead')].find(x => x.offsetParent);
      /* only a top row that really is the first thing on the board */
      /* no row of buttons: a small first line such as "How this board works" goes beside the tabs instead */
      if(!h && pane){ let c = [...pane.children].find(y => y.offsetParent && y.getBoundingClientRect().height > 2); while(c && c.children.length === 1 && c.firstElementChild.offsetParent) c = c.firstElementChild; if(c && c.getBoundingClientRect().height <= 56 && !c.querySelector('article, .uc, img')) side = c; }
      if(h){ let x = h, ok = true; while(x && x !== pane){ if(x.previousElementSibling && [...x.parentElement.children].slice(0, [...x.parentElement.children].indexOf(x)).some(y => y.offsetParent && y.getBoundingClientRect().height > 2)) { ok = false; break; } x = x.parentElement; } if(ok) side = h; }
    }
    if(side !== SIDE) undo();
    if(!side) return;
    SIDE = side; side.classList.add('hdrside');
    side.style.marginTop = side.style.marginLeft = side.style.minHeight = '';
    const cs = getComputedStyle(side), mt = parseFloat(cs.marginTop) || 0, ml = parseFloat(cs.marginLeft) || 0;
    const tb = t.getBoundingClientRect(), sb = side.getBoundingClientRect();
    if(sb.height < tb.height) side.style.minHeight = Math.ceil(tb.height) + 'px';
    const sh = Math.max(sb.height, tb.height);
    const want = sh > tb.height + 6 ? tb.top : tb.top + (tb.height - sh) / 2;
    side.style.marginTop = Math.round(mt + want - sb.top) + 'px';
    side.style.marginLeft = Math.round(ml + tb.right + 14 - sb.left) + 'px';
    if(sb.height < tb.height) side.style.alignItems = side.style.alignItems || '';
  }
  let q = 0; const later = () => { if(q) return; q = requestAnimationFrame(() => { q = 0; try{ fix(); }catch(e){} }); };
  new MutationObserver(ms => { for(const m of ms) if(m.addedNodes.length || m.removedNodes.length){ later(); return; } }).observe(document.body, {childList: true, subtree: true});
  new MutationObserver(later).observe(document.body, {attributes: true, subtree: true, attributeFilter: ['hidden', 'data-view']});
  addEventListener('resize', later); setTimeout(later, 500);
})();
