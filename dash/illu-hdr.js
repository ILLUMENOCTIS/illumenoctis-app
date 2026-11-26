/* 1.2.289 (user, 26 Nov 2026: "make it cleaner and more efficient regarding space ... move the filter up on the same row as
   'Booking cards' and 'On-Stay'" -> option A, style A1: "Let's go with A1 and I want it to be like this throughout all the
   boards"): on every board with board tabs (Favorites: Mine / Members, Team Vote: Voting ... Cancelled, Booking: Booking cards /
   On-Stay) the tabs are a dark purple bar, and that board's own controls (the filters, or the sort and people buttons) sit on the
   same row to the right of it instead of on rows of their own. Filters are white chips under a small FILTER label, so they read
   apart from the board tabs. Phones keep the rows stacked (no room side by side). Only how things are laid out changes. */
(function(){
  if(window.__illuHdr) return; window.__illuHdr = true;
  const css = `
  #shsub2:not([hidden]){background:#4E2349!important;border-color:#4E2349!important;box-shadow:0 1px 2px rgba(40,10,40,.18)}
  #shsub2 button{color:#E9DCEB!important}
  #shsub2 button:hover{color:#fff!important}
  #shsub2 button.on{background:#fff!important;color:#4E2349!important;box-shadow:0 1px 3px rgba(0,0,0,.18)!important}
  #shsub2 button em{background:rgba(255,255,255,.16)!important;color:#F4E8F5!important}
  #shsub2 button.on em{background:#F3E7F2!important;color:#6E2A6B!important}
  #shsub2 button em.hot{background:#FDE7D6!important;color:#B4540A!important}
  /* filters: white chips under a FILTER label */
  #fbar .fbf,#d2bar .fbf{background:#fff!important;border:1px solid #E4DDE8!important}
  #fbar input[type=search],#fbar input[type=text],#fbar .fbq input,#d2bar input[type=search],#d2bar input[type=text]{background:#fff!important}
  #fbar .fbr1::before,#d2bar .fbr1::before{content:"FILTER";flex:none;align-self:center;font:700 10px/1 var(--sans,system-ui);letter-spacing:.14em;color:#9A8F9E;margin:0 2px 0 2px}
  @media (min-width:761px){
    #shsub2:not([hidden]) + #fbar.hdrside{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important}
    /* 1.2.289 (user: "I want to make sure it isn't hidden"): when the window is too narrow for every filter on the tabs' line,
       the filters go on to a second line instead of sliding out of sight */
    #shsub2:not([hidden]) + #fbar.hdrside .fbr1{flex-wrap:wrap!important;row-gap:8px}
    #shsub2:not([hidden]) + #fbar.hdrside .fpscroll{flex-wrap:wrap!important;overflow:visible!important;max-width:100%;row-gap:8px}
    #shsub2:not([hidden]) + #fbar.hdrside input{max-width:230px}
    #shsub2:not([hidden]) + #fbar.hdrside .fbq,#shsub2:not([hidden]) + #fbar.hdrside label:has(input){flex:1 1 180px;min-width:160px;max-width:260px}
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
