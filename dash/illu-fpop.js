/* ==================== Filters on one line (1.2.103) ====================
   The user asked for a cleaner, more compact filter bar (7 Nov 2026, shown in the demo first):
   search plus one button per filter, all on one line. The measurements row (HT, B, W, H, SH and
   the unit switches) moves into one "Measurements" button whose popover holds the very same
   fields - nothing about filtering changes, every list still reads the same inputs. A filter in
   use shows its value on its button and a small x to clear it.
   It works on the shared bar (#fbar: Booking list, Favorites, Suggestiones...) and on the
   Directory's own bar (#d2bar). On a phone or a narrow window the buttons scroll sideways on
   their own line under the search, and the popovers come up from the bottom as sheets. */
(function(){
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const RULER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15l12-12 6 6-12 12z"/><path d="M7 11l2 2M10 8l2 2M13 5l2 2"/></svg>';
  const fire = el => { el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); };

  function enhance(cfg){
    const bar = document.querySelector(cfg.bar); if(!bar || bar.__fpop) return !!bar;
    const r1 = bar.querySelector(cfg.r1), r2 = bar.querySelector(cfg.r2);
    if(!r1 || !r2) return false;
    bar.__fpop = true;
    bar.classList.add('fpbar');
    /* the Measurements button, after the other filter buttons */
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = cfg.btnClass + ' fpmb'; btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = RULER + '<span class="fpml"></span><span class="fpmv"></span><span class="fpmx" role="button" tabindex="0" hidden></span>' + CHEV;
    const sp = r1.querySelector(cfg.spacer);
    r1.insertBefore(btn, sp || null);
    /* the filter buttons share one strip that scrolls sideways when the window is too narrow */
    const strip = document.createElement('span'); strip.className = 'fpscroll';
    const q = r1.querySelector(cfg.search);
    r1.insertBefore(strip, q ? q.nextSibling : r1.firstChild);
    const before = x => !sp || !!(x.compareDocumentPosition(sp) & Node.DOCUMENT_POSITION_FOLLOWING);
    [...r1.children].filter(x => x !== strip && x !== q && x.matches(cfg.btnSel) && before(x)).forEach(x => strip.appendChild(x));
    /* things that sat in the second row and belong on the first */
    (cfg.lift || []).forEach(s => { const x = r2.querySelector(s); if(x) r1.insertBefore(x, sp ? sp.nextSibling : null); });
    /* the row becomes the popover: a title, the fields one per line, the units, Clear and Done */
    r2.classList.add('fpm');
    const head = document.createElement('div'); head.className = 'fpmh';
    head.innerHTML = '<b class="fpmt"></b><span class="fpmhs"></span>';
    r2.insertBefore(head, r2.firstChild);
    const units = document.createElement('div'); units.className = 'fpmu';
    const foot = document.createElement('div'); foot.className = 'fpmf';
    foot.innerHTML = '<button type="button" class="fpclr"></button><button type="button" class="fpok"></button>';
    [...r2.querySelectorAll(cfg.units)].forEach(u => units.appendChild(u));
    head.after(units);
    r2.appendChild(foot);
    const old = r2.querySelector(cfg.oldLabel); if(old) old.hidden = true;
    const boxes = () => [...r2.querySelectorAll(cfg.box)];
    const words = () => {
      btn.querySelector('.fpml').textContent = L('Measurements', '치수');
      r2.querySelector('.fpmt').textContent = L('Measurements', '치수');
      r2.querySelector('.fpmhs').textContent = L('min – max', '최소 – 최대');
      foot.querySelector('.fpclr').textContent = L('Clear', '지우기');
      foot.querySelector('.fpok').textContent = L('Done', '완료');
    };
    words();
    const summary = () => boxes().map(b => {
      const i = b.querySelectorAll('input'); const lo = i[0] && i[0].value, hi = i[1] && i[1].value;
      if(!lo && !hi) return '';
      const k = (b.querySelector('b') || {}).textContent || '';
      return k + ' ' + (lo && hi ? lo + '–' + hi : lo ? '≥ ' + lo : '≤ ' + hi);
    }).filter(Boolean).join(' · ');
    function paint(){
      const s = summary();
      btn.classList.toggle('on', !!s); btn.classList.toggle('fpon', !!s);
      btn.querySelector('.fpmv').textContent = s ? ': ' + s : '';
      const x = btn.querySelector('.fpmx'); x.hidden = !s; x.textContent = '✕'; x.setAttribute('aria-label', L('Clear the measurements', '치수 지우기'));
      btn.hidden = !!r2.hidden && !r2.classList.contains('fpopen') && cfg.followHidden;
      if(cfg.followHidden) btn.hidden = r2.__off === true;
    }
    function open(){
      words();
      r2.classList.add('fpopen'); btn.setAttribute('aria-expanded', 'true'); bar.classList.add('fpup');
      if(innerWidth > 760){
        const B = bar.getBoundingClientRect(), R = btn.getBoundingClientRect();
        const w = Math.min(420, B.width - 16);
        r2.style.width = w + 'px';
        r2.style.left = Math.max(8, Math.min(R.left - B.left, B.width - w - 8)) + 'px';
        r2.style.top = (R.bottom - B.top + 6) + 'px';
      }else{
        /* a sheet along the bottom of the window, whatever the bar sits in */
        r2.style.top = ''; r2.style.left = '0px'; r2.style.width = innerWidth + 'px';
        const r = r2.getBoundingClientRect(); if(Math.abs(r.left) > 0.5) r2.style.left = (-r.left) + 'px';
      }
      const f = r2.querySelector('input'); if(f) try{ f.focus({preventScroll: true}); }catch(e){}
    }
    function close(){ if(!r2.classList.contains('fpopen')) return; r2.classList.remove('fpopen'); btn.setAttribute('aria-expanded', 'false'); bar.classList.remove('fpup'); }
    const clearAll = () => { r2.querySelectorAll(cfg.box + ' input').forEach(i => { if(i.value !== ''){ i.value = ''; fire(i); } }); paint(); };
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if(e.target.closest('.fpmx')){ clearAll(); close(); return; }
      r2.classList.contains('fpopen') ? close() : open();
    });
    foot.addEventListener('click', e => { if(e.target.closest('.fpclr')){ clearAll(); } else if(e.target.closest('.fpok')) close(); });
    document.addEventListener('pointerdown', e => { if(!r2.classList.contains('fpopen')) return; if(r2.contains(e.target) || btn.contains(e.target)) return; close(); }, true);
    document.addEventListener('keydown', e => { if(e.key === 'Escape' && r2.classList.contains('fpopen')){ e.stopPropagation(); close(); btn.focus(); } }, true);
    addEventListener('resize', close);
    r2.addEventListener('input', () => setTimeout(paint, 0));
    r2.addEventListener('click', () => setTimeout(paint, 0));
    /* the page hides the whole measurements row on tabs with no measurements: the button follows */
    try{ new MutationObserver(() => { r2.__off = r2.hidden; if(r2.hidden) close(); paint(); }).observe(r2, {attributes: true, attributeFilter: ['hidden']}); }catch(e){}
    r2.__off = r2.hidden;
    /* a filter in use: a small x on its button clears it (the shared bar's checkbox groups) */
    if(cfg.clearGroups){
      const deco = () => r1.querySelectorAll('[data-fbg]').forEach(b => {
        let x = b.querySelector('.fpx');
        if(!x){ x = document.createElement('span'); x.className = 'fpx'; x.setAttribute('role', 'button'); x.tabIndex = 0; x.textContent = '✕'; b.insertBefore(x, b.querySelector('svg')); }
        x.hidden = !b.classList.contains('on'); x.setAttribute('aria-label', L('Clear this filter', '이 필터 지우기'));
      });
      r1.addEventListener('click', e => {
        const x = e.target.closest('.fpx'); if(!x) return;
        e.preventDefault(); e.stopImmediatePropagation();
        const b = x.closest('[data-fbg]'), g = document.getElementById(b.dataset.fbg);
        if(g){ g.querySelectorAll('input[type="checkbox"]:checked').forEach(c => { c.checked = false; fire(c); }); g.querySelectorAll('input[type="number"]').forEach(i => { if(i.value !== ''){ i.value = ''; fire(i); } }); }
        setTimeout(deco, 0);
      }, true);
      try{ new MutationObserver(deco).observe(r1, {attributes: true, subtree: true, attributeFilter: ['class']}); }catch(e){}
      deco();
    }
    try{ new MutationObserver(() => { words(); paint(); }).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']}); }catch(e){}
    document.addEventListener('change', e => { if(e.target.closest && e.target.closest(cfg.bar)) setTimeout(paint, 0); }, true);
    paint();
    return true;
  }
  const CFG = [
    {bar: '#fbar', r1: '.fbr1', r2: '.fbr2', btnClass: 'fbf', search: '.fbq', btnSel: '.fbf', spacer: '.fbsp', units: '.fbu, .fbhints', box: '.fbm', oldLabel: '.fbml', followHidden: true, clearGroups: true},
    {bar: '#d2bar', r1: '.d2r1', r2: '.d2r2', btnClass: 'd2f', search: '.d2q', btnSel: '.d2f:not(.d2maxb)', spacer: '.d2sp', units: '.d2seg', box: '.d2m', oldLabel: '.d2ml', lift: ['#d2chips'], followHidden: false}
  ];
  const tick = () => { let all = true; for(const c of CFG) if(!enhance(c)) all = false; return all; };
  if(!tick()){ const mo = new MutationObserver(() => { if(tick()) mo.disconnect(); }); mo.observe(document.body, {childList: true, subtree: true}); }

  const css = document.createElement('style');
  css.textContent = `
/* one line: the bar's first row no longer wraps; the buttons scroll sideways if the window is too narrow */
#fbar.fpbar,#d2bar.fpbar{position:relative}
/* while its popover is open the bar sits above the side rail, so the sheet is not cut off on a phone */
#fbar.fpbar.fpup,#d2bar.fpbar.fpup{z-index:1300!important}
#fbar.fpbar .fbr1,#d2bar.fpbar .d2r1{flex-wrap:nowrap;min-width:0}
#fbar.fpbar .fbr1>*,#d2bar.fpbar .d2r1>*{flex-shrink:0}
#fbar.fpbar .fbq,#d2bar.fpbar .d2q{flex-shrink:1;min-width:160px}
.fpbar .fpscroll{display:flex;gap:8px;align-items:center;flex:0 1 auto!important;min-width:0;overflow-x:auto;scrollbar-width:none}
.fpbar .fpscroll::-webkit-scrollbar{display:none}
.fpbar .fpscroll>*{flex-shrink:0}
#fbar.fpbar{gap:0;padding-top:10px;padding-bottom:10px}
#d2bar.fpbar{gap:0}
.fpbar .fpmb svg:first-child{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round;margin-right:2px;opacity:.75;transform:none!important}
.fpbar .fpmv{font-weight:400;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fpbar .fpmb.fpon{border-color:color-mix(in srgb,var(--acc) 35%,transparent);background:var(--wash);color:var(--acc)}
.fpbar .fpmx,.fpbar .fpx{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;font-size:10px;line-height:1;margin-left:2px;cursor:pointer}
.fpbar .fpmx[hidden],.fpbar .fpx[hidden]{display:none}
.fpbar .fpmx:hover,.fpbar .fpx:hover{background:color-mix(in srgb,var(--acc) 16%,transparent)}
.fpbar .fbf.on .fpx+svg,.fpbar .fpmb.fpon svg:last-child{display:none}
/* the measurements popover */
.fpbar .fpm{display:none!important}
.fpbar .fpm.fpopen{display:flex!important;flex-direction:column;align-items:stretch;flex-wrap:nowrap;gap:6px;position:absolute;z-index:60;background:var(--surf);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 44px rgba(20,10,30,.22);padding:12px;box-sizing:border-box}
.fpbar .fpm[hidden]{display:none!important}
.fpm .fpmh{display:flex;align-items:baseline;justify-content:space-between}
.fpm .fpmt{font-size:13.5px}
.fpm .fpmhs{font-size:11.5px;color:var(--mut)}
.fpm .fpmu{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:2px 0 8px;border-bottom:1px solid var(--line);margin-bottom:2px}
.fpm .fpmu .fbu{margin-left:0}
.fpbar .fpm .fbm,.fpbar .fpm .d2m{display:grid!important;grid-template-columns:56px minmax(0,1fr) 14px minmax(0,1fr) 34px;align-items:center;gap:6px;height:auto!important;padding:3px 0!important;background:none!important;border:0!important}
#fbar .fpm .fbm b,#d2bar .fpm .d2m b{font-size:12px!important;letter-spacing:.04em;opacity:1!important}
#fbar .fpm .fbm input,#d2bar .fpm .d2m input{width:100%!important;height:32px!important;border:1px solid var(--line)!important;border-radius:8px!important;background:var(--surf2)!important;text-align:left!important;padding:0 9px!important;box-sizing:border-box;font-size:13px}
#fbar .fpm .fbm.on input,#d2bar .fpm .d2m.on input{border-color:color-mix(in srgb,var(--acc) 45%,var(--line))!important}
#fbar .fpm .fbm i,#d2bar .fpm .d2m i{text-align:center}
#fbar .fpm .fbm em,#d2bar .fpm .d2m em{font-size:11.5px}
#d2bar .fpm .d2fit{margin:4px 0 0;font-size:12px;color:var(--mut)}
#d2bar.fpbar .d2q{flex:0 1 260px}
.fpm .fpmf{display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--line);margin-top:4px}
.fpm .fpmf button{border:0;background:none;font:inherit;font-size:12.5px;font-weight:600;color:var(--acc);cursor:pointer;padding:6px 4px}
.fpm .fpmf .fpok{background:var(--acc);color:#fff;border-radius:8px;padding:6px 14px}
.fpm .fbhints{margin-left:auto}
.fpm .fbhtx{right:0;left:auto;width:300px}
/* a phone or a narrow window: search on its own line, the buttons scroll sideways under it,
   and the measurements (and each filter's choices) come up from the bottom */
@media (max-width:760px){
  #fbar.fpbar .fbr1,#d2bar.fpbar .d2r1{flex-wrap:wrap}
  .fpbar .fpscroll{flex-basis:100%!important}
  #fbar.fpbar .fbq,#d2bar.fpbar .d2q{width:100%!important;flex-basis:100%}
  #fbar.fpbar .fbsp,#d2bar.fpbar .d2sp{display:none}
  .fpbar .fpm.fpopen{position:fixed!important;right:auto;bottom:0;top:auto!important;max-height:86vh;overflow:auto;border-radius:20px 20px 0 0;z-index:1300;padding:14px 16px 18px}
  .fpm .fpmf .fpok{flex:1;margin-left:12px;height:42px;border-radius:11px}
  .fbpop{left:0!important;right:0;bottom:0;top:auto!important;max-width:none!important;width:auto;border-radius:20px 20px 0 0!important;max-height:70vh!important;padding:12px 16px 18px!important}
}
`;
  document.head.appendChild(css);
})();
