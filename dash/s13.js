
(function(){
  const main = document.getElementById('main'); if(!main) return;
  const OPEN = new Set();
  const domOf = box => { const a = AG[+box.dataset.i]; return a ? a.domain : ''; };
  function paint(box, on){
    box.dataset.cts = on ? '1' : '0';
    const b = box.querySelector('.agctsbtn'); if(b) b.setAttribute('aria-expanded', String(on));
  }
  main.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('.agctsbtn');
    if(!btn) return;
    e.stopPropagation(); e.preventDefault();
    const box = btn.closest('.ag'); if(!box) return;
    const d = domOf(box), on = box.dataset.cts !== '1';
    if(on) OPEN.add(d); else OPEN.delete(d);
    if(on && box.dataset.open !== '1'){
      box.dataset.open = '1';
      const car = box.querySelector('.agcar'); if(car) car.textContent = '−';
      try{ agFill(box); }catch(err){}
    }
    paint(box, on);
    if(on){ const c = box.querySelector('.agbody>.cts'); if(c) requestAnimationFrame(() => { try{ c.scrollIntoView({block: 'nearest', behavior: 'smooth'}); }catch(err){} }); }
  }, true);
  /* a redraw keeps the address panels that were open */
  new MutationObserver(() => {
    if(!OPEN.size) return;
    main.querySelectorAll('.ag').forEach(box => { if(OPEN.has(domOf(box)) && box.dataset.open === '1' && box.dataset.cts !== '1') paint(box, true); });
  }).observe(main, {childList: true});
})();
