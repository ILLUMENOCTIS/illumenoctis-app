/* ==================== 1.2.141: the phone's Back button (user, 12 Nov 2026) ====================
   "when I push the back button on the android mobile, it completely takes me off the app. I simply want to backtrack
   to my previous step, get out of the view of the card, so I can go back to the current board/sub-board/section".
   Every layer that opens (a card's full view, the photo viewer, the booking window, the new card, a sheet, the top
   panel) and every change of page puts one step in the browser's history; Back closes the top layer, or goes back to
   the page before. Only when nothing is open and no page is left does Back leave the app. Phone / web only. */
(function(){
  if(!(window.illu && window.illu.web)) return;
  const vis = e => !!e && e.isConnected && !e.hidden && getComputedStyle(e).display !== 'none';
  const click = sel => { const b = document.querySelector(sel); if(b){ b.click(); return true; } return false; };
  /* top first: what is drawn above what */
  const LAYERS = [
    ['newcard', () => vis(document.getElementById('ncm')), () => click('#ncm [data-ncx]')],
    ['favsheet', () => !!document.querySelector('#pane-favag .fgsheet'), () => click('#pane-favag .fgveil')],
    ['viewer', () => vis(document.getElementById('illufv')), () => click('#illufv .fvx')],
    ['booking', () => { const b = document.querySelector('body > .bv, .bv'); return !!b && !b.hidden; }, () => { try{ bvClose(); return true; }catch(e){ return false; } }],
    ['card', () => !!document.querySelector('.d2card'), () => click('.d2card .d2x') || (window.__illuCardClose && (window.__illuCardClose(), true))],
    ['drawer', () => { const d = document.getElementById('abdrawer'); return !!d && d.classList.contains('open'); }, () => click('#abdrawer [data-abclose]')],
    ['more', () => vis(document.getElementById('abmorep')), () => click('#abmore')],
    ['typelist', () => !!document.querySelector('#pane-arr .rcddl'), () => click('#pane-arr .rcddb')]
  ];
  const openNow = () => LAYERS.filter(l => { try{ return l[1](); }catch(e){ return false; } }).map(l => l[0]);
  const pageNow = () => {
    const B = document.body; if(!B) return '';
    if(B.classList.contains('shtoday')) return 'today';
    const x = document.querySelector('.pane.shcur:not([hidden])'); if(x && B.classList.contains('shextra')) return x.id.replace(/^pane-/, '');
    return B.dataset.view || '';
  };
  let open = [], page = '', hist = [], skipPop = 0, byBack = false, ready = false;
  function tick(){
    const o = openNow(), p = pageNow();
    if(!ready){ if(p){ ready = true; open = o; page = p; try{ history.replaceState({illu: 0}, ''); }catch(e){} } return; }
    if(p && p !== page){
      if(byBack) byBack = false; else { hist.push(page); if(hist.length > 30) hist.shift(); try{ history.pushState({illu: 'p'}, ''); }catch(e){} }
      page = p;
    }
    if(o.length > open.length){ for(let i = open.length; i < o.length; i++) try{ history.pushState({illu: 'l'}, ''); }catch(e){} }
    else if(o.length < open.length){
      const n = open.length - o.length;
      if(byBack) byBack = false;
      else { skipPop += n; try{ history.go(-n); }catch(e){ skipPop = 0; } }      // closed with its own ✕: take its step out of the history too
    }
    open = o;
  }
  addEventListener('popstate', () => {
    if(skipPop > 0){ skipPop--; return; }
    const o = openNow();
    if(o.length){
      const top = LAYERS.find(l => l[0] === o[0]);
      byBack = true; let done = false; try{ done = top[2](); }catch(e){}
      if(!done) byBack = false;
      setTimeout(tick, 0); return;
    }
    if(hist.length){ const to = hist.pop(); byBack = true; try{ window.__illuGo && window.__illuGo(to); }catch(e){ byBack = false; } setTimeout(tick, 0); }
  });
  new MutationObserver(() => { clearTimeout(tick.t); tick.t = setTimeout(tick, 60); }).observe(document.documentElement, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'data-view']});
  setInterval(tick, 700);
  window.__illuBack = {state: () => ({open, page, hist: hist.slice(), skipPop})};
})();
