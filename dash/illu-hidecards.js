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
  /* 1.2.211: a model someone else hides (or shows again) leaves (or comes back to) every board here too, right away -
     before, the hidden list was read once when the program started */
  const redraw = () => {
    try{ typeof refresh === 'function' && refresh(); }catch(e){}
    try{ typeof renderArrivals === 'function' && renderArrivals(); }catch(e){}
    try{ window.__illuVoteRerender && window.__illuVoteRerender(); }catch(e){}
    try{ window.__illuRecoRender && window.__illuRecoRender(); }catch(e){}
  };
  (function live(){
    let db = null; try{ db = typeof DB !== 'undefined' ? DB : null; }catch(e){}
    if(!db || !db.collection || typeof MDEL === 'undefined'){ setTimeout(live, 1500); return; }
    let first = true, sig = '';
    try{ db.collection('mdel').onSnapshot(sn => {
      const docs = (sn && sn.docs) || [];
      const s2 = docs.map(d => { const v = typeof docOf === 'function' ? docOf(d) : d.data(); return v && v.k ? v.k + ':' + v.st : ''; }).sort().join('|');
      if(s2 === sig) return; sig = s2;
      for(const d of docs){ const v = typeof docOf === 'function' ? docOf(d) : d.data(); if(v && v.k) MDEL.set(v.k, v); }
      try{ if(typeof DIRSUB !== 'undefined') DIRSUB = ''; }catch(e){}
      if(first){ first = false; return; }
      setTimeout(redraw, 50);
    }, () => {}); }catch(e){}
  })();
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
          try{ window.__illuRecoRender && window.__illuRecoRender(); }catch(e){}   /* 1.2.211: New Face & Development */
        }, 50);
        return r;
      };
      mdelSet.__hid = true;
    }
  }catch(e){}
})();
