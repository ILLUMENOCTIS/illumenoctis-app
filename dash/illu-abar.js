/* ==================== The top bar: order and size ====================
   Every control on the right of the top bar is put in one order, in groups with a thin
   line between them, and drawn at one height:
     what is on the page      Filters · Refresh
     how it is shown          clocks · full screen · zoom
     who is here              signed in now
     messages                 notifications · messages · work log
     settings and you         light/dark · EN/한 · all languages · your ID
   Pieces added by other parts of the program land anywhere; this puts them in place
   whenever the bar changes, and does nothing when they already are. */
(function(){
  const GROUPS = [
    ['.abflt', '.abrf'],
    ['#abck', '.abfs', '#illuzoom'],
    ['#abon'],
    ['[data-abp="notif"]', '[data-abp="msg"]', '[data-abp="log"]'],
    ['#abtheme', '.ablang', '#abglobe', '#abme']
  ];
  /* the Refresh icon, drawn like the clock beside it: a ring with a plum centre */
  const RF = '<svg class="abrfi" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.6 10.2A6.8 6.8 0 1 0 17.9 15.6"/><path d="M18.9 5.6v4.8h-4.8"/>' +
    '<circle class="abrfpin" cx="12" cy="12" r="1.15"/></svg>';
  function icon(){
    const b = document.querySelector('#appbar .abrf');
    if(b && !b.querySelector('.abrfi')) b.innerHTML = RF;
  }
  let busy = false;
  function order(){
    const abr = document.querySelector('#appbar .abr');
    if(!abr || busy) return;
    icon();
    const want = [];
    for(const g of GROUPS){
      const els = g.map(s => abr.querySelector(':scope > ' + s)).filter(Boolean);
      if(els.length) want.push(els);
    }
    /* anything else someone added: kept, after the last group */
    const known = new Set(want.flat());
    const extra = [...abr.children].filter(e => !known.has(e) && !e.classList.contains('absep'));
    /* the order as it should be, separators between groups */
    const seq = [];
    want.forEach((els, i) => { if(i) seq.push('sep'); seq.push(...els); });
    seq.push(...extra);
    /* already right? leave it alone */
    const now = [...abr.children];
    const same = now.length === seq.length && seq.every((x, i) => x === 'sep' ? now[i].classList.contains('absep') : now[i] === x);
    if(same) return;
    busy = true;
    try{
      const seps = [...abr.querySelectorAll(':scope > .absep')];
      const frag = document.createDocumentFragment();
      for(const x of seq){
        if(x === 'sep'){ let s = seps.pop(); if(!s){ s = document.createElement('span'); s.className = 'absep'; } frag.appendChild(s); }
        else frag.appendChild(x);
      }
      for(const s of seps) s.remove();
      abr.appendChild(frag);
    } finally { busy = false; }
  }
  let t = 0;
  const later = () => { if(!t) t = requestAnimationFrame(() => { t = 0; order(); }); };
  function start(){
    const abr = document.querySelector('#appbar .abr');
    if(!abr){ setTimeout(start, 300); return; }
    order();
    try{ new MutationObserver(later).observe(abr, {childList: true}); }catch(e){}
  }
  start();

  /* one height for everything in the bar: 34 px; icons 18 px, same line weight */
  const css = document.createElement('style');
  css.textContent = `
#appbar .abr{gap:6px}
#appbar .abr>.absep{width:1px;height:22px;margin:0 4px;background:var(--line);flex:none}
#appbar .abr>.abib{width:34px;height:34px;min-width:34px;padding:0;border-radius:10px;display:inline-grid;place-items:center;box-sizing:border-box;position:relative}
#appbar .abr>.abib svg{width:18px!important;height:18px!important;stroke-width:1.8!important}
#appbar .abr>#abck svg{stroke-width:1.7!important}
#appbar .abrf .abrfi{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round}
#appbar .abrf .abrfi .abrfpin{fill:var(--acc);stroke:none}
#appbar .abrf:hover .abrfi{color:var(--acc)}
#appbar .abrf.spin .abrfi{animation:abrfspin .8s linear infinite}
#appbar .abr>.abflt{height:34px;box-sizing:border-box}
#appbar .abr>.abflt .abflti{width:22px;height:22px}
#appbar .abr>.abon{height:34px;box-sizing:border-box;border-radius:999px;padding:0 12px 0 4px}
#appbar .abr>#illuzoom{height:34px;box-sizing:border-box;margin:0;border-radius:999px}
#appbar .abr>#illuzoom button{height:32px;font-size:13px;padding:0 11px}
#appbar .abr>#illuzoom .zv{font-size:12px}
#appbar .abr>#abtheme{height:34px;box-sizing:border-box;border-radius:999px;align-items:stretch}
#appbar .abr>#abtheme button{height:auto;min-width:32px;padding:0 9px;display:inline-grid;place-items:center}
#appbar .abr>#abtheme button svg{width:16px;height:16px}
#appbar .abr>.ablang{height:34px;box-sizing:border-box;border-radius:999px;align-items:stretch;background:var(--surf)}
#appbar .abr>.ablang button{height:auto;padding:0 12px;font:600 12px/1 var(--sans);display:inline-grid;place-items:center}
#appbar .abr>.abglobe{height:34px;min-width:34px;box-sizing:border-box;border-radius:999px;padding:0 9px}
#appbar .abr>.abglobe svg{width:17px;height:17px}
#appbar .abr>.abme{height:34px;box-sizing:border-box;border-radius:999px;display:inline-flex;align-items:center}
`;
  document.head.appendChild(css);
})();

/* ==================== Full screen uses the whole monitor ====================
   Whenever any view is in full screen - a card's full view, a board, Lumen, the Atlas,
   Suggestiones, the Directory, the booking viewer made big, or any tab - the program
   window itself goes full screen too, so nothing of the desktop is left around it.
   Leaving the view (Esc, the button) gives the window back as it was. */
(function(){
  if(!(window.illu && window.illu.osFullscreen)) return;
  const B = document.body.classList;
  const full = () => B.contains('d2fullcard') || B.contains('d2bfull') || B.contains('litfull') || B.contains('illupf') || B.contains('illufvon') ||
    !!document.querySelector('.atl.atlmax, .bv.bvmax:not([hidden])') ||
    !!(window.__rcFull && window.__rcFull()) || !!(window.__d2Max && window.__d2Max());
  let was = false, t = 0;
  const check = () => { t = 0; const on = full(); if(on !== was){ was = on; window.illu.osFullscreen(on).catch(() => {}); } };
  const later = () => { if(!t) t = requestAnimationFrame(check); };
  try{ new MutationObserver(later).observe(document.body, {attributes: true, subtree: true, attributeFilter: ['class', 'hidden']}); }catch(e){}
  addEventListener('keyup', e => { if(e.key === 'Escape') later(); });
})();
