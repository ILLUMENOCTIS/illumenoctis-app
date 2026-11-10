
/* When the side panel is drawn again - a change saved, someone else's edit arriving -
   it keeps its place: the same scroll position, so a click on the ear or a unit button
   never sends it back to the top. */
(function(){
  const o = bvDrawSide;
  bvDrawSide = function(){
    const p = bvSide.querySelector('.bvprof');
    const t = p ? p.scrollTop : 0, t2 = bvSide.scrollTop;
    const r = o.apply(this, arguments);
    const q = bvSide.querySelector('.bvprof');
    const put = () => { if(q && t) q.scrollTop = t; if(t2) bvSide.scrollTop = t2; };
    put(); requestAnimationFrame(put);
    return r;
  };
})();
/* An edit made in the panel is already on screen, so the copy of it that comes back from
   the store is not drawn again while you are still working there - that redraw is what
   made the ear blink. Once the panel has been left alone for a few seconds it catches up
   with anything that arrived from someone else meanwhile. */
(function(){
  let touch = 0, owed = 0;
  const mark = () => { touch = Date.now(); };
  ['pointerdown', 'keydown', 'input'].forEach(ev => bvSide.addEventListener(ev, mark, true));
  /* only the redraw that follows a save arriving back from the store waits; a click on a
     unit switch or a tab still redraws at once */
  let live = false;
  const ol = liveRedraw;
  liveRedraw = function(){ live = true; try{ return ol.apply(this, arguments); } finally { live = false; } };
  const o = bvSideRefresh;
  bvSideRefresh = function(force){
    const quiet = Date.now() - touch;
    if(!force && live && quiet < 4000){
      clearTimeout(owed);
      owed = setTimeout(() => bvSideRefresh(), 4000 - quiet + 50);
      return;
    }
    return o.apply(this, arguments);
  };
})();
