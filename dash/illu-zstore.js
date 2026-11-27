/* 1.2.304 (user, 27 Nov 2026): where a model's files are kept.
   - "Z:\1. 현재모델 - save files/folders the way it does in dropbox ... Don't save/create any files on the computer/mobile device
     anymore. Only do it, if Z:\1. 현재모델 is inaccessible" · "Let's also store all the material inside Z:\ILLUMENOCTIS\Booking" ·
     "only have the models that have all the stages completed" in Z:\1. 현재모델 · "use the office folder ... If files are already
     here, move a copy of those files into the dropbox" · files put in beforehand (Z: or Dropbox) are found and copied across,
     "but don't put on the card".
   The program (main.js) does the copying; this page tells it, every 30 minutes, which booking cards there are (name, nationality,
   completed or not, her office folder) and which models' files were erased (cancelled - never copied anywhere again). A card the
   program links to her office folder gets it written on the card (c.zsrc), so every computer uses the same folder. PC program only. */
(function(){
  'use strict';
  if(window.__illuZstore) return; window.__illuZstore = true;
  if(!(window.illu && window.illu.zstore) || window.illu.web) return;
  const stOf = c => { try{ return typeof bkStOf === 'function' ? bkStOf(c) : c.st; }catch(e){ return c && c.st; } };
  let BUSY = false, LAST = null;
  async function tell(){
    if(BUSY) return LAST;
    if(typeof BOOK === 'undefined' || !BOOK || !BOOK.size) return null;
    if(!(window.__illuDxcReady && window.__illuDxcReady())) return null;          // the erased list must be known first
    BUSY = true;
    try{
      const cards = [];
      for(const c of BOOK.values()){
        if(!c || !c.id || c.del) continue;
        const st = stOf(c); if(st === 'canc') continue;
        let folder = ''; try{ folder = bvFolderName(c); }catch(e){}
        if(!folder) continue;
        cards.push({id: c.id, folder, first: String(c.nm || '').trim(), nm: String(c.nm || '').trim(), nat: String(c.nat || c.country || '').trim(), zsrc: c.zsrc || '', done: st === 'done'});
      }
      const gone = window.__illuDxcGone ? window.__illuDxcGone() : [];
      const r = await window.illu.zstore(cards, gone);
      LAST = r;
      if(r && r.ok && Array.isArray(r.links)) for(const l of r.links){
        const c = BOOK.get(l.id); if(!c || c.zsrc) continue;
        c.zsrc = l.zsrc;
        try{ if(typeof SIGNED !== 'function' || SIGNED()) saveBook(c.id, true); }catch(e){}
      }
      return r;
    }catch(e){ console.warn('zstore', e); return null; }
    finally{ BUSY = false; }
  }
  window.__illuZstoreTell = tell;
  setTimeout(function tick(){ tell().finally(() => setTimeout(tick, LAST ? 30 * 60e3 : 60e3)); }, 45e3);
})();
