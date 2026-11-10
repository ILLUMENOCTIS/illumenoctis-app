/* Booking window: a file dropped or pasted onto a folder tab is saved straight into that model's
   folder - the Dropbox one when the window shows Dropbox, the one on this computer when it shows
   that (user, 2026-11-05). Files added the old way (kept online, "yellow dot = waiting to be copied")
   are copied into the folder the first time the window opens it, and the dot goes.
   Without the program's folder access (a browser) the old way stays. */
(function(){
  'use strict';
  if(!(window.illu && window.illu.bookingPut) || typeof bvAddFiles !== 'function') return;
  const oldAdd = bvAddFiles, oldOpen = typeof bvOpenSrc === 'function' ? bvOpenSrc : null;
  const ko = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const say = t => { try{ bvSay(t); }catch(e){} };
  const srcOf = c => { const g = BVLOAD.get(c.id); return g && g.loc ? g.loc : 'dbx'; };
  const place = src => src === 'dbx' ? 'Dropbox' : (ko() ? '이 컴퓨터' : 'this computer');
  let busy = false;

  window.bvAddFiles = async function(files){
    if(!bv || !files || !files.length) return;
    const c = BOOK.get(bv.id); if(!c) return;
    if(typeof SIGNED === 'function' && !SIGNED()){ say(ko() ? '파일을 추가하려면 먼저 로그인하세요' : 'Sign in to add files'); return; }
    if(busy){ say(ko() ? '앞의 파일을 아직 저장하는 중입니다' : 'Still saving the last files'); return; }
    const src = srcOf(c), tab = bv.tab, id = c.id;
    busy = true;
    const saved = []; let fail = '';
    try{
      for(let k = 0; k < files.length; k++){
        const f = files[k];
        say((ko() ? place(src) + '에 저장하는 중… ' : 'Saving to ' + place(src) + '… ') + (k + 1) + ' / ' + files.length + ' — ' + f.name);
        let r = null;
        try{ r = await illu.bookingPut(src, bvFolderName(c), String(c.nm || '').trim(), tab, f.name, await f.arrayBuffer()); }catch(e){ r = {ok: false, why: String(e && e.message || e)}; }
        if(r && r.ok){ saved.push(r); } else fail = f.name + (r && r.why ? ' (' + r.why + ')' : '');
      }
    } finally { busy = false; }
    /* no Dropbox on this computer at all: keep it the old way so nothing is lost */
    if(!saved.length && src === 'dbx' && /no Dropbox|no ILLUMENOCTIS/i.test(fail)) return oldAdd(files);
    if(!bv || bv.id !== id) return;
    bv.tab = tab;
    if(saved.length && oldOpen) await oldOpen(c, src, true);
    if(!bv || bv.id !== id) return;
    bv.tab = tab;
    const last = saved.length ? saved[saved.length - 1].name : '';
    const L = bvList(), j = last ? L.findIndex(f => f.name === last) : -1;
    if(j >= 0) bv.i = j;
    const fold = saved[0] ? saved[0].folder + ' › ' + saved[0].sub : tab;
    bvMsgNext = saved.length
      ? (ko() ? saved.length + '개를 ' + place(src) + '에 저장했습니다 · ' + fold : saved.length + ' saved to ' + place(src) + ' · ' + fold) + (fail ? (ko() ? ' · 실패: ' : ' · failed: ') + fail : '')
      : (ko() ? '저장하지 못했습니다: ' : 'Could not save: ') + fail;
    bvDraw();
  };

  /* the files waiting with a yellow dot go into the folder that is open now; once a file is in
     the folder, complete (same name and size), its online copy is deleted and its row removed
     (user, 2026-11-05: "do both") - the folder copy is the one everyone uses */
  const doing = new Set();
  const idsOf = r => (typeof attIds === 'function') ? attIds(r) : (r.w === 2 && Array.isArray(r.ids) ? r.ids : [r.i]);
  async function copyWaiting(c, src){
    if(doing.has(c.id) || typeof attGet !== 'function') return;
    const rows = BVADD.get(c.id) || [];
    if(!rows.length || !(typeof SIGNED === 'function' && SIGNED())) return;
    doing.add(c.id);
    let copied = 0; const done = new Set();
    const nm = bvFolderName(c), first = String(c.nm || '').trim();
    try{
      for(const r of rows){
        if(!r || !r.i) continue;
        try{
          if(!r.pc){
            const u8 = await attGet(r);
            const x = await illu.bookingPut(src, nm, first, r.tab, r.n, u8);
            if(!(x && x.ok)) continue;
            r.pc = 1; if(x.name && x.name !== r.n) r.n = x.name; copied++;
          }
          /* only when the folder really has it, complete */
          const h = illu.bookingHas ? await illu.bookingHas(src, nm, first, r.tab, r.n, r.s) : null;
          if(!(h && h.ok && h.has)) continue;
          let gone = true;
          for(const id of idsOf(r)){ try{ await ASSETS.delete(id); }catch(e){ gone = false; } }
          if(gone) done.add(r.i);
        }catch(e){}
      }
      if(copied || done.size){
        try{ const d = docOf(await DB.doc('bvadd/' + c.id).get()); let all = (d && Array.isArray(d.e)) ? d.e : rows.slice();
          for(const r of all){ const w = rows.find(x => x.i === r.i); if(w && w.pc){ r.pc = 1; r.n = w.n; } }
          all = all.filter(r => !done.has(r.i));
          LIVE.add.set(c.id, Date.now()); await DB.doc('bvadd/' + c.id).set({e: all, at: Date.now()}); BVADD.set(c.id, all); }catch(e){}
        if(bv && bv.id === c.id && oldOpen){ await oldOpen(c, src, true);
          if(copied){ bvMsgNext = ko() ? '기다리던 파일 ' + copied + '개를 ' + place(src) + '에 저장했습니다' : copied + ' waiting file' + (copied === 1 ? '' : 's') + ' saved to ' + place(src); bvDraw(); } }
      }
    } finally { doing.delete(c.id); }
  }
  if(oldOpen){
    window.bvOpenSrc = async function(c, src, keepTab){
      const r = await oldOpen.apply(this, arguments);
      try{ const g = c && BVLOAD.get(c.id); if(g && g.loc === src) setTimeout(() => copyWaiting(c, src), 0); }catch(e){}
      return r;
    };
  }
  window.__bvCopyWaiting = copyWaiting;
})();
