
/* ---- speed ----
   1. The search box redraws the tab once typing pauses, not on every key: four letters
      typed quickly used to redraw a full Updates week four times over.
   2. The Atlas map is prepared in a quiet moment after the page loads, so opening the
      Atlas tab is instant the first time too. */
(function(){
  const q = document.getElementById('q');
  if(!q) return;
  let t = 0, pass = false;
  window.addEventListener('input', e => {
    if(e.target !== q || pass) return;
    e.stopImmediatePropagation();
    clearTimeout(t);
    t = setTimeout(() => { pass = true; try{ q.dispatchEvent(new Event('input', {bubbles: true})); } finally { pass = false; } }, 160);
  }, true);
  /* Enter or leaving the box does not wait */
  q.addEventListener('keydown', e => { if(e.key === 'Enter' && t){ clearTimeout(t); t = 0; pass = true; try{ q.dispatchEvent(new Event('input', {bubbles: true})); } finally { pass = false; } } });
})();
(function(){
  const go = () => { try{ if(window.atlasPrebuild) window.atlasPrebuild(); }catch(e){} };
  const later = () => ('requestIdleCallback' in window) ? requestIdleCallback(go, {timeout: 8000}) : setTimeout(go, 3000);
  if(document.readyState === 'complete') setTimeout(later, 2500); else addEventListener('load', () => setTimeout(later, 2500));
})();
