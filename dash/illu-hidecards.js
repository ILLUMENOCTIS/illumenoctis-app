/* 1.2.178 (user, 13 Nov 2026: "When hiding a model, I want the card to be sent the Hidden destination and off the board.
   The decision to hide the model card is to no longer have to see the model card"): a model the Admin hid (docs mdel)
   no longer shows as a card on any board - Updates, Suggestiones, Lumen, Communicatus, Compare boards, Today, the
   team boards. She is kept under Directory › Hidden Agencies › Hidden Models, where Show again brings her back.
   Booking cards are not touched (the Booking board is work already in hand). */
(function(){
  'use strict';
  if(window.__illuHideCards) return; window.__illuHideCards = true;
  const keyOf = v => { try{ return v && /^https?:/i.test(v) ? normKey(v) : ''; }catch(e){ return ''; } };
  const hidden = m => {
    if(!m) return false;
    try{
      for(const v of [m.href, m.url, m.key]){ const k = keyOf(v); if(k && mdelIs(k)) return true; }
      if(m.key && mdelIs(m.key)) return true;
      if(m.key && window.__illuHidK && window.__illuHidK(m.key)) return true;
    }catch(e){}
    return false;
  };
  window.__illuIsHidden = hidden;
  /* the shared card (Directory tiles, team boards, Compare boards, search) */
  function wrapCard(){
    const o = window.__illuCard;
    if(typeof o !== 'function'){ setTimeout(wrapCard, 300); return; }
    if(o.__hid) return;
    const w = function(m, opt){ return (opt && opt.showHidden) || !hidden(m) ? o.apply(this, arguments) : ''; };
    w.__hid = true; window.__illuCard = w;
  }
  wrapCard();
  /* Updates, Suggestiones and Lumen cards */
  try{
    if(typeof modelCard === 'function' && !modelCard.__hid){
      const mc = modelCard;
      modelCard = function(m, opts){ return (opts && opts.showHidden) || !hidden(m) ? mc.apply(this, arguments) : ''; };
      modelCard.__hid = true;
    }
  }catch(e){}
  /* the morning's new faces: a hidden model is not counted either */
  try{
    if(typeof arrivalRows === 'function' && !arrivalRows.__hid){
      const ar = arrivalRows;
      arrivalRows = function(){ return ar.apply(this, arguments).filter(a => !(a && a.url && hidden({url: a.url}))); };
      arrivalRows.__hid = true;
    }
  }catch(e){}
  /* a board cell whose card was left out takes no room */
  const css = document.createElement('style');
  css.textContent = '.ivcw:not(:has(article)){display:none!important}';
  document.head.appendChild(css);
  /* the moment a model is hidden (or shown again) every board is drawn again */
  try{
    if(typeof mdelSet === 'function' && !mdelSet.__hid){
      const ms = mdelSet;
      mdelSet = async function(){
        const r = await ms.apply(this, arguments);
        setTimeout(() => {
          try{ typeof refresh === 'function' && refresh(); }catch(e){}
          try{ typeof renderArrivals === 'function' && renderArrivals(); }catch(e){}
          try{ window.__illuVoteRerender && window.__illuVoteRerender(); }catch(e){}
        }, 50);
        return r;
      };
      mdelSet.__hid = true;
    }
  }catch(e){}
})();
