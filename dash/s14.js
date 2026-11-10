
/* the row lights on booking cards: caught before the Lumen lamp handler ever sees them */
(function(){
  function hit(e){
    const i = e.target.closest && e.target.closest('[data-bklamp]');
    if(!i) return false;
    e.preventDefault(); e.stopPropagation();
    const [bid, to] = i.dataset.bklamp.split('|');
    try{ bkMoveTo(bid, to); }catch(err){}
    return true;
  }
  document.addEventListener('click', hit, true);
  document.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' ') hit(e); }, true);
  /* the Lumen lamps' hover peers and counts are not drawn on these */
  document.addEventListener('mouseover', e => { if(e.target.closest && e.target.closest('.bkmk')) e.stopPropagation(); }, true);
})();
