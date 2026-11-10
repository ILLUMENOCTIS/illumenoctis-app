/* ==================== Right-click ====================
   A right-click on a photograph - a card, the slideshow, a tile, the booking viewer -
   offers Copy image and Save image as… (the menu itself is the program's, see main.js).
   A right-click never acts on the page: it does not close a card, step a slideshow or
   pick anything. And the click that closes the menu again is not passed on either, so
   you carry on exactly where you were. */
(function(){
  /* the picture under the pointer, even when something see-through lies over it */
  function picAt(x, y){
    const els = document.elementsFromPoint(x, y);
    for(const el of els){
      if(el.id === 'illutip') continue;
      if(el.tagName === 'IMG' && (el.currentSrc || el.src) && el.naturalWidth) return {src: el.currentSrc || el.src, alt: el.alt || ''};
      if(el.tagName === 'CANVAS' && el.width > 40){ try{ return {src: el.toDataURL('image/png'), alt: el.getAttribute('aria-label') || ''}; }catch(e){} }
      if(el.tagName === 'VIDEO') return null;
      const bg = getComputedStyle(el).backgroundImage;
      const m = bg && /url\(["']?([^"')]+)["']?\)/.exec(bg);
      if(m && !/^data:image\/svg/.test(m[1]) && el.getBoundingClientRect().width > 60) return {src: m[1], alt: ''};
      /* stop at the first solid thing that is not a picture holder */
      if(el.matches && el.matches('button, a, input, textarea, select, label')) return null;
    }
    return null;
  }
  /* the model's name, for the file name */
  function nameNear(x, y){
    const el = document.elementFromPoint(x, y);
    const card = el && el.closest && el.closest('.d2card, .bkcard, .litrow, .bv, .rccard, article, li');
    if(!card) return '';
    const n = card.querySelector('.rnm, .bvnm, .bknm, .nm, h2');
    return n ? (n.textContent || '').trim().slice(0, 80) : '';
  }
  let pick = null;
  window.__illuCtxPick = () => pick;
  /* "Choose a photo file…" from the menu: the same picker a click on an empty photo opens */
  window.__illuChoosePic = key => { try{ picFor = key; picInput.click(); }catch(e){} };
  addEventListener('contextmenu', e => {
    const t = e.target;
    if(t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName))){ pick = null; return; }
    pick = picAt(e.clientX, e.clientY);
    if(pick){ pick.name = nameNear(e.clientX, e.clientY) || pick.alt; }
    /* a photo slot that takes a photo of your own: the menu also offers choosing a file */
    const slot = document.elementsFromPoint(e.clientX, e.clientY).map(el => el.closest && el.closest('.litpic[data-pic]')).find(Boolean);
    if(slot && typeof SIGNED === 'function' && SIGNED() && typeof ASSETS !== 'undefined' && ASSETS){ pick = pick || {src: '', alt: '', name: ''}; pick.pic = slot.dataset.pic; }
  }, true);

  /* right button: never acts on the page */
  const RIGHT = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'auxclick'];
  for(const ev of RIGHT) addEventListener(ev, e => { if(e.button === 2) e.stopImmediatePropagation(); }, true);
  /* the click that only closes the menu is not passed on */
  window.__illuCtxAt = 0; window.__illuCtxOpen = 0;
  const eat = e => {
    const now = Date.now(), open = window.__illuCtxOpen;
    if((open && now - open < 120000) || now - (window.__illuCtxAt || 0) < 350){ e.stopImmediatePropagation(); e.preventDefault(); }
  };
  for(const ev of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) addEventListener(ev, eat, true);
})();
