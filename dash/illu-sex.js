/* 1.2.193 (user, 14 Nov 2026: "When it comes to sex (male/female) since some websites don't have them labeled, I need to be
   able to edit the sex on the card if need be in order to categorize them"):
   - the sex on a model's card (side panel, under her name) can be set or changed: Female / Male / Not stated.
   - the choice is shared with everyone (docs msex/<model hash> {k, g, by, at}) and wins over the board's own label
     everywhere the program reads a model's sex (cards, side panel, Directory lists and Women / Men filters, analytics). */
(function(){
  'use strict';
  if(window.__illuSexEdit) return; window.__illuSexEdit = true;
  const MS = new Map();                         // model key -> 'F' | 'M' | '?'
  const nk = k => { try{ return normKey(k); }catch(e){ return k; } };
  const hsh = s => { let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const sexOf = k => { if(!k) return ''; return MS.get(k) || MS.get(nk(k)) || ''; };
  window.__illuSexOf = sexOf;
  /* every place that asks keyInfo() for a model gets the chosen sex */
  function wrap(){
    if(typeof keyInfo !== 'function'){ setTimeout(wrap, 300); return; }
    if(keyInfo.__sex) return;
    const o = keyInfo;
    const w = function(k){ const r = o.apply(this, arguments); const g = sexOf(k) || (r && r.href ? sexOf(r.href) : ''); return r && g ? Object.assign({}, r, {g}) : r; };
    w.__sex = true; for(const p in o) try{ w[p] = o[p]; }catch(e){}
    window.keyInfo = w;
  }
  wrap();
  let rd = 0;
  const redraw = () => { clearTimeout(rd); rd = setTimeout(() => {
    try{ window.__illuAGv = (window.__illuAGv || 0) + 1; }catch(e){}
    try{ typeof refresh === 'function' && refresh(); }catch(e){}
    try{ window.__illuVoteRerender && window.__illuVoteRerender(); }catch(e){}
  }, 250); };
  (function listen(){
    if(typeof DB === 'undefined' || !DB){ setTimeout(listen, 800); return; }
    try{
      DB.collection('msex').onSnapshot(sn => {
        for(const d of (sn.docs || [])){ let v = null; try{ v = typeof docOf === 'function' ? docOf(d) : d.data(); }catch(e){} if(v && v.k) MS.set(v.k, v.g === 'F' || v.g === 'M' ? v.g : '?'); }
        redraw();
      }, () => {});
    }catch(e){}
  })();
  async function setSex(k, g){
    const key = nk(k); if(!key) return false;
    try{ if(typeof SIGNED === 'function' && !SIGNED()){ typeof nudgeSignIn === 'function' && nudgeSignIn(); return false; } }catch(e){}
    MS.set(key, g);
    try{ await DB.doc('msex/' + hsh(key)).set({k: key, g, by: (typeof ME !== 'undefined' && ME) || '', at: new Date().toISOString()}); }catch(e){ return false; }
    redraw(); return true;
  }
  window.__illuSetSex = setSex;
})();
