/* ================= Wrong photos in the slideshow (1.2.174) =================
   User, 13 Nov 2026: "There are times when an image on the card slideshow are not the correct photos of the model.
   ... if from agency website just have the option to delete from my view so that photo no longer appears in the
   slideshow, or from whichever source (from dropbox [completely delete the image, video] from that source)".
   - A photo from her agency page: "Hide" keeps it out of every slideshow in the program (the agency's site is not
     changed). Kept for the team in phide/<hash(her page)> {k, u: [photo addresses], by, at}. Undo brings it back.
   - A file from her own folder (Dropbox / this computer / Z:): "Delete" (illu-full.js) removes the file itself. */
(function(){
  'use strict';
  if(window.__illuPhideOn) return; window.__illuPhideOn = true;
  const nk = u => { try{ return typeof normKey === 'function' ? normKey(u) : String(u || ''); }catch(e){ return String(u || ''); } };
  const hash = s => { let h = 5381, g = 2166136261; s = String(s); for(let i = 0; i < s.length; i++){ const c = s.charCodeAt(i); h = ((h << 5) + h + c) | 0; g = Math.imul(g ^ c, 16777619); } return (h >>> 0).toString(36) + (g >>> 0).toString(36); };
  const db = () => { try{ return typeof DB !== 'undefined' ? DB : null; }catch(e){ return null; } };
  const me = () => { try{ return ME || ''; }catch(e){ return ''; } };
  /* the same photo, whatever wrapper or size suffix is around it */
  const pk = u => { u = String(u || ''); try{ const m = u.match(/^illuimg:\/\/p\/([^?]+)/); if(m) u = decodeURIComponent(m[1]); const w = u.match(/images\.weserv\.nl\/\?url=([^&]+)/); if(w) u = decodeURIComponent(w[1]); }catch(e){}
    return u.replace(/^https?:\/\/(www\.)?/i, '').split('#')[0].replace(/\?.*$/, '').toLowerCase(); };
  const HID = new Map();     // nk(page) -> Set(pk(photo))
  function listen(){
    const d = db(); if(!d){ setTimeout(listen, 400); return; }
    d.collection('phide').onSnapshot(s => { HID.clear(); for(const x of s.docs){ const v = (typeof docOf === 'function' ? docOf(x) : x.data()) || {}; if(v.k) HID.set(v.k, new Set((v.u || []).map(pk))); } try{ document.dispatchEvent(new CustomEvent('illu-phide')); }catch(e){} }, () => {});
  }
  listen();
  const hidden = (page, u) => { const s = HID.get(nk(page)); return !!(s && s.has(pk(u))); };
  window.__illuPhotoHidden = hidden;
  async function setHide(page, u, on){
    const k = nk(page), id = 'phide/' + hash(k);
    const s = new Set(HID.get(k) || []); on ? s.add(pk(u)) : s.delete(pk(u)); HID.set(k, s);
    try{ document.dispatchEvent(new CustomEvent('illu-phide')); }catch(e){}
    const d = db(); if(!d) return false;
    try{ await d.doc(id).set({k, u: [...s], by: me(), at: new Date().toISOString()}); return true; }catch(e){ console.error('phide', e); return false; }
  }
  window.__illuHidePhoto = (page, u) => {
    const p = setHide(page, u, true);
    try{ window.__illuUndo && window.__illuUndo.push('Photo hidden', () => setHide(page, u, false)); }catch(e){}
    return p;
  };
  window.__illuUnhidePhoto = (page, u) => setHide(page, u, false);
  /* every list of her agency photos leaves the hidden ones out (viewer, card slideshows, the vote link) */
  if(window.illu && window.illu.modelPhotos && !window.illu.__phideWrapped){
    const orig = window.illu.modelPhotos.bind(window.illu);
    window.illu.__phideWrapped = true;
    window.illu.modelPhotos = async page => {
      const r = await orig(page);
      if(r && Array.isArray(r.photos) && HID.get(nk(page))) return Object.assign({}, r, {photos: r.photos.filter(p => !hidden(page, p && p.url || p))});
      return r;
    };
  }
})();
