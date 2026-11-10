/* ==================== Speed ====================
   1. The old Directory list (46,000 elements) was still built once when the program opened,
      hidden, before the new Directory took over - every redraw of the page paid for it.
      It is emptied here; the new Directory draws its own list when the tab is opened.
   2. Light mode, on its own where the computer draws without graphics acceleration or the
      page cannot keep up (fewer than 40 frames a second at rest): the moving effects
      (lighthouse sweep, drifting photos, scrolling names, pulsing dots, glass blur) stop.
      Everything else stays the same. localStorage illu.lite = '1' / '0' forces it on / off.
   3. A short speed report per computer (docs perf/<id>): graphics acceleration, processor,
      memory, screen, frames per second, how long the busiest moments took - so a slow
      computer can be looked at with real numbers instead of guesses. */
(function(){
  /* 1 */
  const clearOld = () => { try{ if(typeof VIEW !== 'undefined' && VIEW !== 'dir'){ const m = document.getElementById('main'); if(m && m.querySelector('.rgnsec, .ag')) m.textContent = ''; } }catch(e){} };
  clearOld(); setTimeout(clearOld, 1500);

  /* the page's own errors, the last few, for the report */
  const ERRS = [];
  addEventListener('error', e => { ERRS.push(new Date().toISOString().slice(11, 19) + ' ' + String(e.message || e.error || '').slice(0, 160) + ' @' + String(e.filename || '').split('/').pop() + ':' + (e.lineno || '')); if(ERRS.length > 20) ERRS.shift(); });
  addEventListener('unhandledrejection', e => { ERRS.push(new Date().toISOString().slice(11, 19) + ' promise: ' + String((e.reason && (e.reason.message || e.reason)) || '').slice(0, 160)); if(ERRS.length > 20) ERRS.shift(); });
  /* long tasks: how often the page froze, and for how long */
  const LT = {n: 0, ms: 0, worst: 0, since: Date.now()};
  try{ new PerformanceObserver(l => { for(const e of l.getEntries()){ LT.n++; LT.ms += e.duration; LT.worst = Math.max(LT.worst, e.duration); } }).observe({type: 'longtask', buffered: true}); }catch(e){}
  const fps = (ms) => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if(performance.now() - t0 < ms) requestAnimationFrame(f); else res(Math.round(n / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(f); });

  /* 2 */
  const B = document.body.classList;
  const force = (() => { try{ return localStorage.getItem('illu.lite'); }catch(e){ return null; } })();
  let SYS = null, why = '';
  const lite = (on, reason) => { if(force === '0') on = false; if(force === '1') on = true; B.toggle('illulite', !!on); why = on ? (force === '1' ? 'forced' : reason) : ''; };
  lite(force === '1', 'forced');
  (async () => {
    try{ if(window.illu && window.illu.sysInfo) SYS = await window.illu.sysInfo(); }catch(e){}
    const g = SYS && SYS.gpu || {};
    const soft = /disabled|software|unavailable/i.test(String(g.gpu_compositing || '')) || /disabled|software|unavailable/i.test(String(g.rasterization || ''));
    if(soft){ lite(true, 'no graphics acceleration'); return; }
    /* otherwise: measure at rest, twice, once things have settled */
    await new Promise(r => setTimeout(r, 20000));
    if(document.hidden) return;
    const a = await fps(2000); await new Promise(r => setTimeout(r, 3000)); const b = await fps(2000);
    if(Math.max(a, b) < 40) lite(true, 'slow drawing (' + Math.max(a, b) + ' fps)');
  })();

  /* 3 */
  let sent = 0;
  async function report(){
    try{
      if(document.hidden || typeof DB === 'undefined' || !DB || typeof ME === 'undefined' || !ME) return;
      try{ if(window.illu && window.illu.sysInfo) SYS = await window.illu.sysInfo(); }catch(e){}
      const f = await fps(1500);
      const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
      const doc = {at: new Date().toISOString(), ver: (SYS && SYS.version) || '', view: typeof VIEW !== 'undefined' ? VIEW : '', fps: f,
        lt: {n: LT.n, ms: Math.round(LT.ms), worst: Math.round(LT.worst), mins: Math.round((Date.now() - LT.since) / 60000)},
        mainLag: SYS && SYS.main ? SYS.main : null, errs: ERRS.slice(-6),
        heapMB: mem, nodes: document.getElementsByTagName('*').length, lite: B.contains('illulite') ? why : '',
        cores: navigator.hardwareConcurrency || null, dpr: devicePixelRatio, win: innerWidth + 'x' + innerHeight, sys: SYS || null,
        boot: (() => { try{ const n = performance.getEntriesByType('navigation')[0]; return n ? Math.round(n.loadEventEnd || n.domContentLoadedEventEnd) : null; }catch(e){ return null; } })()};
      await DB.doc('perf/' + ME).set(doc); sent++;
      LT.n = 0; LT.ms = 0; LT.worst = 0; LT.since = Date.now(); ERRS.length = 0;
    }catch(e){}
  }
  setTimeout(report, 90000); setInterval(report, 10 * 60000);
  window.__illuPerf = {report, LT, sys: () => SYS, why: () => why};

  const css = document.createElement('style');
  css.textContent = `
body.illulite *,body.illulite *::before,body.illulite *::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
body.illulite .lhbeam,body.illulite .rnmi,body.illulite .d2card .litpic img,body.illulite .litcam.finding,body.illulite [class*="live"],body.illulite [class*="idl"]{animation-iteration-count:1!important}
body.illulite *{scroll-behavior:auto!important}
/* no blur to see through: the glass bars become the page's own solid colour */
body.illulite{--frost:var(--paper)!important}
`;
  document.head.appendChild(css);
})();
