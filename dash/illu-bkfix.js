/* ==================== Booking: moving a model in, and the Profile's ear panel ====================
   1. "book →" on a model (Directory, Suggestiones, Lumen, Communicatus): the search typed on that
      tab is not carried over to Booking - it was hiding every other card ("1 of 9 bookings") and the
      new one could look missing. The new card is scrolled to and marked for a moment.
   2. Piercings on the booking viewer's Profile: the open/close bar has its own background and
      says what it does, and the opened ear panel takes its own room under the row (it used to
      spill over the fields above it). */
(function(){
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  window.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-tobook]');
    if(!t || !(typeof SIGNED === 'function' && SIGNED())) return;
    const key = t.dataset.tobook;
    const q = document.getElementById('q');
    if(q && q.value){ q.value = ''; try{ q.dispatchEvent(new Event('input', {bubbles: true})); }catch(err){} }
    const d2q = document.getElementById('d2q'); if(d2q) d2q.value = '';
    /* once Booking has drawn it: bring the card into view and mark it */
    let tries = 0;
    const look = () => {
      const c = typeof bkForKey === 'function' ? bkForKey(key) : null;
      const el = c && document.querySelector('.bkcard[data-bkid="' + CSS.escape(c.id) + '"]');
      if(el && typeof VIEW !== 'undefined' && VIEW === 'bk'){ try{ el.scrollIntoView({block: 'center', behavior: 'smooth'}); }catch(err){} el.classList.remove('bkflash'); void el.offsetWidth; el.classList.add('bkflash'); setTimeout(() => el.classList.remove('bkflash'), 2400); return; }
      if(++tries < 20) setTimeout(look, 150);
    };
    setTimeout(look, 250);
  }, true);

  const css = document.createElement('style');
  css.textContent = `
.bkcard.bkflash{animation:bkflash 2.2s ease-out}
@keyframes bkflash{0%,30%{box-shadow:0 0 0 3px var(--acc),0 18px 40px -18px rgba(0,0,0,.35)}100%{box-shadow:0 0 0 0 transparent}}
/* the piercings row: a real bar to open and close; opened, the row grows to hold the ears
   (every other Profile row keeps its even height) */
.bvside.bvside.bvside .bvsec > dl.bvpl > .bvpr:has(.bvpdet[open]){display:block!important;height:auto!important;min-height:0!important}
.bvside.bvside.bvside .bvsec > dl.bvpl > .bvpr:has(.bvpdet[open])>dt{padding:6px 0 4px!important}
.bvside.bvside.bvside .bvsec > dl.bvpl > .bvpr:has(.bvpdet[open])>dd{margin:0 0 6px!important;grid-column:auto!important;width:100%}
.bv .bvsec .bvpl .bvpr:has(.bvpdet[open]) .bvpdet>summary{padding-left:10px!important}
.bv .bvsec .bvpl .bvpr:has(.bvpdet){align-items:center!important}
.bv .bvsec .bvpl .bvpr:has(.bvpdet)>dt{padding-top:0!important}
.bvpdet>summary{padding-left:10px!important}
.bvpdet>summary{padding:4px 10px!important;border:1px solid color-mix(in srgb,var(--acc) 28%,var(--line));border-radius:9px;background:color-mix(in srgb,var(--acc) 7%,var(--surf));transition:background .15s,border-color .15s}
.bvpdet>summary:hover{background:color-mix(in srgb,var(--acc) 14%,var(--surf));border-color:var(--acc)}
.bvpdet>summary::after{content:"Show ears";order:2;margin-left:auto;font:600 11px var(--sans);letter-spacing:.04em;color:var(--acc)}
.bvpdet[open]>summary::after{content:"Hide"}
html[lang="ko"] .bvpdet>summary::after{content:"귀 보기"}
html[lang="ko"] .bvpdet[open]>summary::after{content:"닫기"}
.bvpdet>summary .bvpcar{order:3;border-color:var(--acc)!important;margin-left:8px!important}
.bvpdet[open]>summary{border-radius:9px 9px 0 0;border-bottom-color:transparent}
.bvpdet[open]>.bvpier{border:1px solid color-mix(in srgb,var(--acc) 28%,var(--line));border-top:0;border-radius:0 0 9px 9px;background:var(--surf);padding:12px 10px!important;box-sizing:border-box}
`;
  document.head.appendChild(css);
})();

/* the figures in the Booking window's header follow the measurement boxes as they are typed (user, 2026-11-05) */
document.addEventListener('input', function(e){
  var t = e.target; if(!t || !t.classList || !t.classList.contains('bvmxin')) return;
  setTimeout(function(){ try{ var c = bv && BOOK.get(bv.id); var mx = bvHd.querySelector('.bvmx'); if(c && mx) mx.innerHTML = bvFigures(c); }catch(err){} }, 0);
});

var __bvpcheCss = document.createElement('style');
__bvpcheCss.textContent = '.bv .bvavl{display:flex!important;gap:6px;align-items:center}.bv .bvavl .bvavd{flex:0 0 4.6em!important;width:4.6em!important;min-width:4.6em!important;max-width:4.6em!important}.bv .bvavl input:not(.bvavd){flex:1 1 auto!important;min-width:0!important;width:auto!important}';
document.head.appendChild(__bvpcheCss);
