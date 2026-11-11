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
    ['.abnc', '.abflt', '.abun', '.abrf'],
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

/* ==================== The top bar on a phone (1.2.138) ====================
   User, 11 Nov 2026: "the top bar on the mobile version makes me scroll to see the USER login, language, widgets,
   etc. ... I want to be able to see everything on the top bar. perhaps move the search bar somewhere else?"
   On a narrow screen (760 px or less) the bar keeps what is used all the time - the page name, New card,
   notifications, messages, Arrival/Departure and your ID (initial only) - and a "⋯" button opens a panel with the
   rest: units, refresh, clocks, full screen, zoom, theme, language. The search moves off the bar (the bottom bar
   has it). A wider window puts everything back. */
(function(){
  const MQ = matchMedia('(max-width:760px)');
  const MOVE = [['.abun', 'Units', '단위'], ['.abrf', 'Refresh', '새로고침'], ['#abck', 'Clocks and map', '시계와 지도'], ['.abfs', 'Full screen', '전체 화면'],
    ['#illuzoom', 'Zoom', '확대/축소'], ['#abtheme', 'Theme', '테마'], ['.ablang', 'Language', '언어'], ['#abglobe', 'All languages', '모든 언어']];
  const ko = () => typeof LANG !== 'undefined' && LANG === 'ko';
  let btn = null, pan = null, busy = false;
  function make(){
    if(btn) return;
    btn = document.createElement('button'); btn.type = 'button'; btn.id = 'abmore'; btn.className = 'abib abmore';
    btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';
    pan = document.createElement('div'); pan.id = 'abmorep'; pan.hidden = true; pan.setAttribute('role', 'dialog');
    (document.getElementById('appbar') || document.body).appendChild(pan);   /* inside the bar, so its icons keep the bar's look */
    btn.addEventListener('click', e => { e.stopPropagation(); toggle(pan.hidden); });
    document.addEventListener('pointerdown', e => { if(!pan.hidden && !pan.contains(e.target) && !btn.contains(e.target) && !e.target.closest('#abunp')) toggle(false); }, true);
    document.addEventListener('keydown', e => { if(e.key === 'Escape' && !pan.hidden) toggle(false); });
  }
  function toggle(on){
    if(!pan) return; pan.hidden = !on; btn.setAttribute('aria-expanded', String(on)); btn.classList.toggle('on', on);
    btn.title = ko() ? '더 보기' : 'More'; btn.setAttribute('aria-label', btn.title);
    if(on){ pan.querySelectorAll('.abmrow > span').forEach(sp => { const d = MOVE.find(m => m[0] === sp.dataset.sel); if(d) sp.textContent = ko() ? d[2] : d[1]; }); }
  }
  function apply(){
    const abr = document.querySelector('#appbar .abr'); if(!abr || busy) return;
    busy = true;
    try{
      make();
      if(MQ.matches){
        if(btn.parentNode !== abr) abr.appendChild(btn);
        for(const [sel, en, k] of MOVE){
          const el = abr.querySelector(':scope > ' + sel); if(!el) continue;
          let row = pan.querySelector('.abmrow[data-sel="' + sel + '"]');
          if(!row){ row = document.createElement('div'); row.className = 'abmrow'; row.dataset.sel = sel; row.innerHTML = '<span data-sel="' + sel + '">' + (ko() ? k : en) + '</span><div class="abmslot"></div>'; pan.appendChild(row); }
          row.querySelector('.abmslot').appendChild(el);
        }
        /* keep the panel's rows in the same order */
        MOVE.forEach(([sel]) => { const r = pan.querySelector('.abmrow[data-sel="' + sel + '"]'); if(r) pan.appendChild(r); });
        document.body.classList.add('abphone');
      }else{
        pan.querySelectorAll('.abmslot > *').forEach(el => abr.appendChild(el));
        pan.innerHTML = ''; if(btn.parentNode) btn.remove(); toggle(false);
        document.body.classList.remove('abphone');
      }
    } finally { busy = false; }
  }
  let t = 0; const later = () => { if(!t) t = requestAnimationFrame(() => { t = 0; apply(); }); };
  function start(){
    const abr = document.querySelector('#appbar .abr'); if(!abr){ setTimeout(start, 300); return; }
    apply();
    try{ new MutationObserver(later).observe(abr, {childList: true}); }catch(e){}
    try{ MQ.addEventListener('change', later); }catch(e){ try{ MQ.addListener(later); }catch(er){} }
  }
  start();
  const css = document.createElement('style');
  css.textContent = `
body.abphone #appbar #shkbtn,body.abphone #appbar .shkbtn{display:none!important}
body.abphone #appbar .abr{gap:4px;flex-wrap:nowrap}
body.abphone #appbar .abr>.absep{display:none}
body.abphone #appbar .abr>.abon{display:none}
body.abphone #appbar #abme .bnm{display:none}
body.abphone #appbar #abme{padding:0 2px;min-width:34px;justify-content:center}
#appbar .abmore svg{fill:currentColor!important;stroke:none!important;width:20px!important;height:20px!important}
#appbar .abmore svg circle{fill:currentColor!important}
#appbar .abmore.on{background:var(--wash,#F3ECF3);color:var(--acc,#5A2C57)}
#abmorep{position:fixed;z-index:3000;top:calc(env(safe-area-inset-top,0px) + 56px);right:10px;left:10px;max-width:420px;margin-left:auto;background:var(--surf,#fff);color:var(--ink,#211C26);border:1px solid var(--line,#E7E2EC);border-radius:16px;box-shadow:0 18px 44px rgba(20,10,30,.22);padding:6px 14px;font:500 14px/1.3 var(--sans,Inter,system-ui,sans-serif)}
#abmorep[hidden]{display:none}
#abmorep .abmrow{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:50px;border-bottom:1px solid var(--line,#E7E2EC)}
#abmorep .abmrow:last-child{border-bottom:0}
#abmorep .abmrow>span{color:var(--mut,#6D6577)}
#abmorep .abmslot{display:flex;align-items:center}
#abmorep .abmslot>*{height:36px;box-sizing:border-box}
#abmorep .abmslot>.abib{width:36px;min-width:36px;display:inline-grid;place-items:center;border-radius:10px}
#abmorep .abmslot svg{width:18px;height:18px}
#abmorep .abmslot>.abib,#abmorep .abmslot>.abun,#abmorep .abmslot>.abglobe{border:1px solid var(--line,#E7E2EC);background:var(--surf,#fff);color:var(--ink,#211C26);border-radius:10px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;font:600 13px/1 var(--sans,Inter,system-ui,sans-serif)}
#abmorep .abmslot>.abib{padding:0}
#abmorep .abmslot>.abib svg,#abmorep .abmslot>.abun svg,#abmorep .abmslot>.abglobe svg{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#abmorep .abmslot .abrfpin{fill:var(--acc,#5A2C57)!important;stroke:none!important}
#abmorep .abmslot>.ablang{display:inline-flex;border:1px solid var(--line,#E7E2EC);border-radius:999px;overflow:hidden;background:var(--surf,#fff)}
#abmorep .abmslot>.ablang button{border:0;background:none;padding:0 14px;font:600 13px/1 var(--sans,Inter,system-ui,sans-serif);color:var(--ink,#211C26)}
#abmorep .abmslot>.ablang button[aria-pressed="true"],#abmorep .abmslot>.ablang button.on{background:var(--acc,#5A2C57);color:#fff}
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
