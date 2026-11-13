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
  /* 1.2.152: 'bid:<booking card id>' for cards with no Directory model (the models brought in from the agency server) */
  const cardOf = k => { try{ if(/^bid:/.test(k)) return (typeof BOOK !== 'undefined' && BOOK.get(k.slice(4))) || null; return bkForKey(k); }catch(e){ return null; } };
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
      .slice(0, 300).map(f => ({u: '/_blob/' + f.rid + (window.illu && window.illu.web && !VID.test(f.rel) ? '?w=1400' : ''), t: tabOf(f.rel), r: f.rel}));
  }
  function load(k){
    const e = M.get(k) || {at: 0, photos: []};
    if(e.busy || Date.now() - e.at < TTL) return e;
    e.busy = true; M.set(k, e);
    read(k).then(ph => {
      const changed = JSON.stringify(ph) !== JSON.stringify(e.photos);
      e.photos = ph; e.at = Date.now(); e.busy = false;
      if(changed){ try{ window.__illuVoteChanged && window.__illuVoteChanged(); }catch(err){} try{ window.__illuTodayRender && window.__illuTodayRender(); }catch(err){} clearTimeout(window.__illuMatRT); window.__illuMatRT = setTimeout(() => { try{ window.__illuArrRender && window.__illuArrRender(); }catch(err){} try{ window.__illuPipe && window.__illuPipe.render(); }catch(err){} }, 300); }
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
  window.__illuMatForget = k => { M.delete(k); try{ window.__illuVoteChanged && window.__illuVoteChanged(); }catch(e){} };
  /* files added to a folder: read again */
  try{ const old = window.illu.onBookingChanged; if(old){ /* the booking window owns the listener; refresh ours on its change by expiring the cache */ } }catch(e){}
  setInterval(() => { for(const e of M.values()) if(Date.now() - e.at > TTL) e.at = 0; }, 60000);
  /* 1.2.155 (user, 12 Nov 2026: "allow me to change the main photo on the card even though the booking has been completed"):
     the chosen card photo of a booking card is kept as c.pcv = 'f:<file in her folder>' or 'u:<photo address on her agency page>' */
  const bkKey = c => c && (c.k || ('bid:' + c.id));
  window.__illuMatRel = (k, u) => { const e = M.get(k); const p = e && (e.photos || []).find(x => x.u === u); return p ? p.r : ''; };
  window.__illuBkCover = c => {
    const v = c && c.pcv; if(!v) return '';
    if(v.slice(0, 2) === 'u:') return v.slice(2);
    if(v.slice(0, 2) !== 'f:' || !can()) return '';
    const k = bkKey(c); if(!cardOf(k)) return '';
    const e = load(k), rel = v.slice(2); const p = (e.photos || []).find(x => x.r === rel); return p ? p.u : '';
  };
  /* 1.2.159 (user: "photos are also not appearing"): one photo for a booking card everywhere - the picked card photo,
     her agency photo, or the first photo in her folder (this computer or Dropbox) */
  window.__illuBkPic = (c, w) => {
    if(!c) return ''; let ph = '';
    try{ ph = (typeof bkPhoto === 'function' && bkPhoto(c)) || ''; }catch(e){}
    if(!ph){ try{ ph = window.__illuMatCover(c.k || ('bid:' + c.id)) || (c.k ? window.__illuMatCover('bid:' + c.id) : '') || ''; }catch(e){} }
    if(ph && /^https?:/i.test(ph) && window.illu && window.illu.modelPhotos && !window.illu.web) ph = 'illuimg://p/' + encodeURIComponent(ph) + '?r=' + encodeURIComponent(c.k || '') + '&w=' + (w || 300);
    return ph;
  };
  window.__illuMatForget = k => { if(k) M.delete(k); else M.clear(); };
})();
