/* ==================== Her own material on every card (1.2.132) ====================
   What the user asked for (10 Nov 2026): "the downloaded files into Dropbox only show in the booking card,
   I want it to show on the voting card on Today's Board and also on all the cards on the Opus Board."
   - A model with a booking card has a folder (this computer and Dropbox): 1. BOOK / 2. SNAPS / 3. VIDEOS.
   - Her cards on Today and the Opus boards take their photo from 1. BOOK (then 2. SNAPS) when the card has
     no photograph of its own, and opening the card shows those photos first, then the agency's.
   - The folder is read the same way the booking window reads it (Dropbox first, then this computer), kept
     for a few minutes, and read again when files are added. Program only (the web version has no folders). */
(function(){
  if(window.__illuMatOn) return; window.__illuMatOn = true;
  const can = () => !!(window.illu && window.illu.bookingFiles);
  const IMG = /\.(jpe?g|png|webp|gif|bmp)$/i, VID = /\.(mp4|mov|m4v|webm)$/i;
  const TTL = 5 * 60 * 1000;
  const M = new Map();          // key -> {at, photos: [url], busy}
  const cardOf = k => { try{ return bkForKey(k); }catch(e){ return null; } };
  const tabOf = rel => { const t = String(rel).split('/')[0].replace(/^\d+\s*\.?\s*/, '').toLowerCase(); return t === 'book' ? 'book' : /^snap|^pola/.test(t) ? 'snaps' : /^video/.test(t) ? 'videos' : ''; };
  const order = rel => ({book: 0, snaps: 1, videos: 2})[tabOf(rel)] ?? 3;
  async function read(k){
    const c = cardOf(k); if(!c || !can()) return [];
    let name = ''; try{ name = bvFolderName(c); }catch(e){ return []; }
    const first = String(c.nm || '').trim();
    let r = null;
    try{ r = await window.illu.bookingFiles('dbx', name, first); }catch(e){ r = null; }
    if(!r || !r.ok || !r.found || !(r.files || []).some(f => IMG.test(f.rel))){ try{ const r2 = await window.illu.bookingFiles('pc', name, first); if(r2 && r2.ok && r2.found) r = r2; }catch(e){} }
    if(!r || !r.ok || !r.found) return [];
    return (r.files || []).filter(f => f.rid && ((IMG.test(f.rel) && order(f.rel) < 2) || (VID.test(f.rel) && tabOf(f.rel) === 'videos')))
      .sort((a, b) => order(a.rel) - order(b.rel) || String(a.rel).localeCompare(String(b.rel), undefined, {numeric: true}))
      .slice(0, 300).map(f => ({u: '/_blob/' + f.rid, t: tabOf(f.rel)}));
  }
  function load(k){
    const e = M.get(k) || {at: 0, photos: []};
    if(e.busy || Date.now() - e.at < TTL) return e;
    e.busy = true; M.set(k, e);
    read(k).then(ph => {
      const changed = JSON.stringify(ph) !== JSON.stringify(e.photos);
      e.photos = ph; e.at = Date.now(); e.busy = false;
      if(changed){ try{ window.__illuVoteChanged && window.__illuVoteChanged(); }catch(err){} try{ window.__illuTodayRender && window.__illuTodayRender(); }catch(err){} }
    }, () => { e.busy = false; e.at = Date.now(); });
    return e;
  }
  /* the cover for a card: the first BOOK photo, or '' (and starts reading if it has not yet) */
  window.__illuMatCover = k => { if(!k || !can() || !cardOf(k)) return ''; const e = load(k); const p = (e.photos || []).find(x => x.t !== 'videos'); return p ? p.u : ''; };
  /* every photo, for the photo viewer */
  window.__illuMatPhotos = async (k, all) => {
    if(!k || !can() || !cardOf(k)) return [];
    const e = M.get(k);
    const pick = ph => all ? ph : ph.filter(x => x.t !== 'videos').map(x => x.u);
    if(e && e.photos.length && Date.now() - e.at < TTL) return pick(e.photos);
    const ph = await read(k); M.set(k, {at: Date.now(), photos: ph}); return pick(ph);
  };
  /* files added to a folder: read again */
  try{ const old = window.illu.onBookingChanged; if(old){ /* the booking window owns the listener; refresh ours on its change by expiring the cache */ } }catch(e){}
  setInterval(() => { for(const e of M.values()) if(Date.now() - e.at > TTL) e.at = 0; }, 60000);
  window.__illuMatForget = k => { if(k) M.delete(k); else M.clear(); };
})();
