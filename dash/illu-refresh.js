/* ==================== Refresh (top bar) ====================
   One press brings the whole program up to date: the directory, every shared list (lamps,
   bookings, contacts, logs, notes...), the booking folders on this computer and in Dropbox,
   the model photo galleries, and any program update waiting in the Updates folder or
   published by the owner. The page is rebuilt from the start - the same way it is built
   when the program opens - and comes back on the same tab, at the same place, with the
   booking viewer open again if it was. Anything being typed is saved first. */
(function(){
  const KEY = 'illu.refresh';
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>';
  const ss = {
    get(){ try{ return JSON.parse(sessionStorage.getItem(KEY) || 'null'); }catch(e){ return null; } },
    set(v){ try{ sessionStorage.setItem(KEY, JSON.stringify(v)); }catch(e){} },
    del(){ try{ sessionStorage.removeItem(KEY); }catch(e){} }
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  let busy = false, btn = null;
  async function refreshAll(){
    if(busy) return;
    busy = true;
    if(btn){ btn.classList.add('spin'); btn.disabled = true; btn.title = 'Refreshing…'; }
    try{
      /* whatever is being typed is saved first */
      try{ const ae = document.activeElement; if(ae && ae.blur && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) ae.blur(); }catch(e){}
      const t0 = Date.now();
      while(Date.now() - t0 < 4000){
        let pending = 0;
        try{ if(typeof BKSAVE !== 'undefined') pending += BKSAVE.size; }catch(e){}
        if(!pending) break;
        await sleep(150);
      }
      try{ if(window.__illuNotesFlush) await window.__illuNotesFlush(); }catch(e){}   // a note still being typed
      await sleep(250);
      /* where we are, so the rebuilt page opens in the same place */
      const st = {at: Date.now(), y: Math.round(window.scrollY || 0)};
      try{ st.view = VIEW; }catch(e){}
      try{
        if(bv && typeof bvEl !== 'undefined' && !bvEl.hidden){
          const got = BVLOAD.get(bv.id);
          st.bv = {id: bv.id, tab: bv.tab, i: bv.i, src: got && got.loc ? got.loc : '', choose: !!bv.choose};
        }
      }catch(e){}
      ss.set(st);
      /* the program's own part: galleries, the Updates folder, published updates */
      try{ if(window.illu && window.illu.refreshAll) await window.illu.refreshAll(); }catch(e){}
      /* the page is built again from the start, directory included */
      location.replace('../index.html');
    }catch(e){
      busy = false;
      if(btn){ btn.classList.remove('spin'); btn.disabled = false; btn.title = 'Refresh'; }
    }
  }
  window.illuRefreshAll = refreshAll;

  /* after a Refresh: back to the same tab, place and viewer */
  async function restore(){
    const st = ss.get();
    if(!st) return;
    ss.del();
    if(Date.now() - (st.at || 0) > 120000) return;            // an old note: ignore it
    const t0 = Date.now();
    while(Date.now() - t0 < 60000){
      try{ if(typeof logReady !== 'undefined' && logReady) break; }catch(e){}
      await sleep(150);
    }
    await sleep(200);
    try{ if(st.view && typeof setView === 'function' && st.view !== VIEW) setView(st.view); }catch(e){}
    await sleep(150);
    try{ if(st.y) window.scrollTo(0, st.y); }catch(e){}
    if(st.bv && st.bv.id){
      try{
        const c = BOOK.get(st.bv.id);
        if(c && bvOpenFor(st.bv.id)){
          if(st.bv.src && !st.bv.choose && typeof bvOpenSrc === 'function'){
            await bvOpenSrc(c, st.bv.src);
            const got = BVLOAD.get(c.id);
            if(got && got.groups && (got.groups.get(st.bv.tab) || []).length){
              bv.tab = st.bv.tab; bv.i = Math.min(st.bv.i || 0, got.groups.get(st.bv.tab).length - 1); bvDraw();
            }
          }
        }
      }catch(e){}
    }
    try{ if(window.__illuToast) window.__illuToast('Up to date'); }catch(e){}
  }
  restore();

  /* the button: in the top bar, just before Full screen, drawn the same way */
  function put(){
    const fs = document.querySelector('#appbar .abr .abfs');
    if(!fs){ setTimeout(put, 400); return; }
    if(btn && btn.isConnected) return;                   // the top bar puts it in its place (illu-abar.js)
    if(!btn){
      btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'abib abrf';
      btn.title = 'Refresh everything (F5)';
      btn.setAttribute('aria-label', 'Refresh');
      btn.innerHTML = ICON;
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); refreshAll(); });
    }
    fs.parentNode.insertBefore(btn, fs);
  }
  put();
  try{
    new MutationObserver(() => { if(!btn || !btn.isConnected) put(); })
      .observe(document.getElementById('appbar') || document.body, {childList: true, subtree: true});
  }catch(e){}
  /* F5 / Ctrl+R do the same Refresh instead of a bare reload */
  addEventListener('keydown', e => {
    if(e.key === 'F5' || ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'r' || e.key === 'R'))){
      const t = e.target;
      if(t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName)) && e.key !== 'F5') return;
      e.preventDefault(); refreshAll();
    }
  }, true);

  const css = document.createElement('style');
  css.textContent = '#appbar .abrf svg{width:17px;height:17px}' +
    '#appbar .abrf.spin svg{animation:abrfspin .8s linear infinite}' +
    '#appbar .abrf:disabled{opacity:1;cursor:progress}' +
    '@keyframes abrfspin{to{transform:rotate(360deg)}}';
  (document.head || document.body).appendChild(css);
})();
