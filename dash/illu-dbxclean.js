/* ==================== 1.2.283: Dropbox files of models who are out ====================
   User, 24 Nov 2026: "when a model card becomes 'Unavailable' or 'Not Available' or 'Cancelled' (from Team Vote), I want all
   the folders/files in the Dropbox regarding that model to be erased to free up space. Keep the files/folders in Dropbox for
   models that are on hold". Chosen (24 Nov): Not available, Not for Korea, Cancelled in Team Vote and a cancelled booking card
   all count; 7 days after the status is set; Dropbox only (the office PC's Desktop copy stays).
   - A model counts when she is out for one of those reasons and nothing says otherwise: not On hold, no open vote, no booking
     card that is still in progress or completed.
   - Her card says "Dropbox files erased in N days" with Keep files; Keep stops it (and can be undone).
   - The Admin's program does the erasing (Dropbox › ILLUMENOCTIS › BOOKING › her folder, and her photos / booking files in
     MEDIA) - they go to Dropbox's Deleted files, where they can be restored. Each erase is written down (docs dbxdel/<id>). */
(function(){
  'use strict';
  if(window.__illuDxc) return; window.__illuDxc = true;
  const DAYS = 7, DAY = 864e5;
  const ko = () => { try{ return LANG === 'ko'; }catch(e){ return false; } };
  const L = (en, k) => ko() ? k : en;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const REC = new Map();   // id -> {k, st: 'keep'|'done', at, by, ...}
  const idOf = k => 'x' + String(k).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36) + String(k).length.toString(36);
  const VD = () => { try{ return window.__illuVoteData ? window.__illuVoteData() : null; }catch(e){ return null; } };
  /* her booking card: by her page, or - when the card was made without it (e.g. "More information about Lihi Avraham") - by
     her name and agency (1.2.284: a card found only by name was missed on 24 Nov, so a model still in Processing counted as out) */
  const nn = s => String(s || '').normalize('NFC').toLowerCase().replace(/^more information about\s+/, '').replace(/\s+/g, ' ').trim();
  const ag1 = s => nn(s).split(/[\s-]+/).filter(w => !/^(the|models?|management|mgmt|agency|group)$/.test(w))[0] || nn(s);
  function cardsOf(k){
    const out = new Set();
    try{ const c = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : (typeof bkForKey === 'function' ? bkForKey(k) : null); if(c) out.add(c); }catch(e){}
    try{
      const V = VD(), i = V && V.info ? V.info(k) : {}; const n = nn(i.nm), a = ag1(i.ag);
      if(n) for(const c of BOOK.values()) if(c && c.id && !c.del && nn(c.nm) === n && (!a || ag1(c.ag) === a || nn(c.ag).includes(a))) out.add(c);
    }catch(e){}
    return [...out];
  }
  window.__illuCardsOf = cardsOf;
  const cardOf = k => { const l = cardsOf(k); return l.find(c => stOf(c) !== 'canc') || l[0] || null; };
  const stOf = c => { try{ return typeof bkStOf === 'function' ? bkStOf(c) : c.st; }catch(e){ return c && c.st; } };
  /* every model who is out, with why and since when */
  function outList(){
    const V = VD(); if(!V) return [];
    const by = new Map();
    const add = (k, why, at) => { if(!k) return; let e = by.get(k); if(!e){ e = {k, why: [], at: ''}; by.set(k, e); } if(!e.why.includes(why)) e.why.push(why); if(at && String(at) > e.at) e.at = String(at); };
    for(const s of V.states || []) if(!s.open && s.res === 'cxl') add(s.k, 'vote', s.at);
    const hold = new Set();
    for(const v of (V.av ? V.av.values() : [])){ if(!v || !v.k) continue; if(v.t === 'later') hold.add(v.k); else if(v.t === 'no' || v.t === 'nokr') add(v.k, v.t, v.at); }
    try{ for(const c of BOOK.values()) if(c && c.id && !c.del && stOf(c) === 'canc') add(c.k || ('bid:' + c.id), 'card', (c.cxl && c.cxl.at) || c.at || ''); }catch(e){}
    const openVote = new Set((V.states || []).filter(s => s.open).map(s => s.k));
    const out = [];
    for(const e of by.values()){
      if(hold.has(e.k) || openVote.has(e.k)) continue;                       // On hold, or the vote was reopened
      const c = cardOf(e.k); if(c && !c.del && stOf(c) !== 'canc') continue;  // her booking card is still going
      const t = Date.parse(e.at); e.due = (isNaN(t) ? Date.now() : t) + DAYS * DAY;
      e.id = idOf(e.k); e.rec = REC.get(e.id) || null; e.card = c;
      out.push(e);
    }
    return out;
  }
  /* 1.2.305 (lag): the card notes are redrawn from a list worked out at most every 5 s (it was worked out again for every new card on screen) */
  let OLC = null, OLT = 0;
  const outListC = () => { if(!OLC || Date.now() - OLT > 5000){ OLC = outList(); OLT = Date.now(); } return OLC; };
  window.__illuDxcList = outList;
  const of = k => outList().find(e => e.k === k) || null;
  /* the files to erase: her Dropbox folder (by its names) and her saved photos / booking files */
  function targets(e){
    const V = VD(), i = V && V.info ? V.info(e.k) : {};
    const names = [];
    const nm = s => String(s || '').trim();
    if(e.card){ try{ names.push(bvFolderName(e.card)); }catch(er){} }
    if(nm(i.nm) && nm(i.ag)) names.push(nm(i.nm) + ' - ' + nm(i.ag));
    const av = V && V.av ? [...V.av.values()].find(v => v && v.k === e.k) : null; if(av && nm(av.nm) && nm(av.ag)) names.push(nm(av.nm) + ' - ' + nm(av.ag));
    const ids = new Set();
    try{ const p = PICS.get(e.k); if(p && /^mp\./.test(String(p).replace(/^\/_blob\//, ''))) ids.add(String(p).replace(/^\/_blob\//, '')); }catch(er){}
    if(e.card){ for(const m of JSON.stringify(e.card).matchAll(/(?:mp|bf)\.[a-z0-9]{8,40}\.[a-z0-9]{2,5}/g)) ids.add(m[0]); }
    /* 1.2.304: her office folder in Z:\1. 현재모델, when her card is linked to one */
    const zsrcs = new Set(); try{ for(const c of cardsOf(e.k)) if(c && c.zsrc) zsrcs.add(String(c.zsrc)); }catch(er){}
    return {names: [...new Set(names.filter(Boolean))], ids: [...ids], zsrcs: [...zsrcs]};
  }
  /* records */
  async function load(){
    for(let i = 0; i < 60 && (typeof DB === 'undefined' || !DB); i++) await new Promise(r => setTimeout(r, 500));
    if(typeof DB === 'undefined' || !DB) return;
    try{ const sn = await DB.collection('dbxdel').limit(5000).get(); for(const d of (sn.docs || sn || [])){ const x = docOf(d); if(x && x.k) REC.set(d.id || idOf(x.k), x); } }catch(e){}
    try{ DB.collection('dbxdel').onSnapshot(sn => { REC.clear(); OLC = null; for(const d of (sn.docs || [])){ const x = docOf(d); if(x && x.k) REC.set(d.id || idOf(x.k), x); } paint(); }, () => {}); }catch(e){}
    LOADED = true; paint(); setTimeout(localRun, 20000);
  }
  let LOADED = false;
  const save = (id, x) => { REC.set(id, x); OLC = null; try{ return DB.doc('dbxdel/' + id).set(x); }catch(e){ return null; } };
  /* the Admin's program erases what is due (a computer with Dropbox), every 30 minutes */
  let BUSY = false;
  async function run(){
    if(BUSY || !(window.illu && window.illu.dbxErase) || window.illu.web) return;
    try{ if(typeof isAdmin !== 'function' || !isAdmin()) return; }catch(e){ return; }
    BUSY = true;
    try{
      for(const e of outList()){
        /* 1.2.304: an erase from before 1.2.304 (Dropbox only) is done again everywhere - Dropbox (her folder had come back from the
           Desktop copy), Z:\ILLUMENOCTIS\Booking, Z:\1. 현재모델 and this computer */
        if(e.due > Date.now() || (e.rec && (e.rec.st === 'keep' || (e.rec.st === 'done' && e.rec.v >= 304)))) continue;
        const t = targets(e); if(!t.names.length && !t.ids.length) continue;
        if(e.rec && e.rec.names) for(const n of e.rec.names) if(!t.names.includes(n)) t.names.push(n);
        let r = null; try{ r = await window.illu.dbxErase(t.names, t.ids, t.zsrcs); }catch(er){ r = {ok: false, why: String(er && er.message || er)}; }
        if(!r || !r.ok){ console.warn('dropbox erase', e.k, r && r.why); if(r && /no Dropbox|office PC copy/.test(r.why || '')) break; continue; }
        await save(e.id, {k: e.k, st: 'done', v: 304, at: (e.rec && e.rec.st === 'done' && e.rec.at) || new Date().toISOString(), again: e.rec && e.rec.st === 'done' ? new Date().toISOString() : undefined, by: (typeof ME !== 'undefined' && ME) || '', why: e.why, names: t.names, folders: r.folders || [], files: r.files || [], local: r.local || [], where: (r.where || '') + (r.local ? '+local' : '')});
      }
    }finally{ BUSY = false; }
    paint();
  }
  window.__illuDxcRun = run;
  /* 1.2.304: what the other parts need - the names of every model whose files were erased (illu-zstore.js) */
  window.__illuDxcGone = () => { const out = []; for(const x of REC.values()) if(x && x.st === 'done' && Array.isArray(x.names)) out.push(...x.names); return [...new Set(out)]; };
  window.__illuDxcReady = () => LOADED;
  /* every computer (not only the Admin's) puts its own Desktop copy of an erased model in the Recycle Bin, once */
  async function localRun(){
    if(!(window.illu && window.illu.localErase) || window.illu.web || !LOADED) return;
    let seen = {}; try{ seen = JSON.parse(localStorage.getItem('illu.dxc.local') || '{}') || {}; }catch(e){}
    const todo = [...REC.entries()].filter(([id, x]) => x && x.st === 'done' && Array.isArray(x.names) && seen[id] !== (x.again || x.at));
    if(!todo.length) return;
    for(const [id, x] of todo){ try{ const r = await window.illu.localErase(x.names); if(r && r.ok) seen[id] = x.again || x.at; }catch(e){} }
    try{ localStorage.setItem('illu.dxc.local', JSON.stringify(seen)); }catch(e){}
  }
  /* 1.2.284 (user, 24 Nov 2026: "if a model gets cancelled from the voting board, I want the booking cards to automatically go to
     the cancelled Board and I want the booking card to disappear from the Booking Board ... this also means that all the
     folders/files in Dropbox should be deleted for those specific models"): when her vote ends Cancelled, her booking card that is
     still in Processing moves to Cancelled ("Cancelled in Team Vote 1–4"); from there the Dropbox countdown above runs. Done once
     for each vote result - a card moved back to Processing by hand afterwards stays there. */
  function autoCancel(){
    const V = VD(); if(!V || typeof BOOK === 'undefined' || !window.__illuBkMoveRaw) return 0;
    if(typeof SIGNED === 'function' && !SIGNED()) return 0;
    let n = 0;
    for(const s of V.states || []){
      if(s.open || s.res !== 'cxl') continue;
      for(const c of cardsOf(s.k)){
        if(!c || c.del || stOf(c) !== 'proc' || c.vxo === s.at) continue;
        c.vxo = s.at;
        c.cxl = {r: 'vote', why: (s.g != null ? s.g + '–' + s.r : ''), by: '', at: new Date().toISOString(), vote: s.at};
        try{ window.__illuBkMoveRaw(c.id, 'canc'); n++; }catch(e){ console.warn('auto cancel', c.id, e); }
      }
    }
    if(n) paint();
    return n;
  }
  window.__illuAutoCancel = autoCancel;
  const kick = () => { try{ autoCancel(); }catch(e){} };
  try{ if(window.__illuVoteOnChange) window.__illuVoteOnChange(kick); }catch(e){}
  setTimeout(kick, 8000); setInterval(kick, 60000);
  /* ---------- the note on her card ---------- */
  const dd = t => { const d = new Date(t); return d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]; };
  function noteHTML(e){
    if(e.rec && e.rec.st === 'done') return '<div class="dxnote done">' + E(L('Files erased · ' + dd(e.rec.again || e.rec.at), '파일 삭제됨 · ' + dd(e.rec.again || e.rec.at))) + '</div>';
    if(e.rec && e.rec.st === 'keep') return '<div class="dxnote keep"><span>' + E(L('Files kept', '파일 보관')) + '</span><button type="button" data-dxund="' + E(e.k) + '">' + E(L('Undo', '취소')) + '</button></div>';
    const n = Math.max(0, Math.ceil((e.due - Date.now()) / DAY));
    return '<div class="dxnote" title="' + E(L('Her files in Dropbox, Z:\\ILLUMENOCTIS\\Booking, Z:\\1. 현재모델 and the computers', 'Dropbox, Z:\\ILLUMENOCTIS\\Booking, Z:\\1. 현재모델, 컴퓨터의 파일')) + '"><span>' + E(n ? L('Files erased in ' + n + (n === 1 ? ' day' : ' days') + ' (Dropbox, Z:, computers)', n + '일 후 파일 삭제 (Dropbox, Z:, 컴퓨터)') : L('Files erased today (Dropbox, Z:, computers)', '오늘 파일 삭제 (Dropbox, Z:, 컴퓨터)')) + '</span><button type="button" data-dxkeep="' + E(e.k) + '">' + E(L('Keep files', '파일 보관')) + '</button></div>';
  }
  const PANES = '#pane-cxl, #pane-unav, .ivtoday, #pane-bk, #pane-opus, .bv';
  let PT = 0;
  function paint(){
    clearTimeout(PT); PT = setTimeout(() => {
      const list = new Map(outListC().map(e => [e.k, e])), ids = new Map([...list.values()].filter(e => e.card).map(e => [e.card.id, e]));
      const hosts = [];
      document.querySelectorAll(PANES).forEach(p => {
        p.querySelectorAll('article.uc[data-ivk]').forEach(a => hosts.push([a, list.get(a.dataset.ivk)]));
        p.querySelectorAll('[data-bpc]').forEach(a => { if(a.closest('.bprw')) hosts.push([a, ids.get(a.dataset.bpc)]); });
      });
      for(const [a, e] of hosts){
        const w = a.closest('.ivcw, .bprw') || a.parentElement; if(!w) continue;
        let n = w.querySelector(':scope > .dxnote');
        if(!e){ if(n) n.remove(); continue; }
        const h = noteHTML(e); if(n && n.__h === h) continue;
        if(n) n.remove();
        a.insertAdjacentHTML('afterend', h); n = w.querySelector(':scope > .dxnote'); if(n) n.__h = h;
      }
    }, 300);
  }
  window.__illuDxcPaint = paint;
  document.addEventListener('click', ev => {
    const k1 = ev.target.closest && ev.target.closest('[data-dxkeep]'), k2 = ev.target.closest && ev.target.closest('[data-dxund]');
    if(!k1 && !k2) return; ev.preventDefault(); ev.stopPropagation();
    if(typeof SIGNED === 'function' && !SIGNED()){ try{ nudgeSignIn(); }catch(er){} return; }
    const k = (k1 || k2).getAttribute(k1 ? 'data-dxkeep' : 'data-dxund'), id = idOf(k);
    if(k1) save(id, {k, st: 'keep', at: new Date().toISOString(), by: (typeof ME !== 'undefined' && ME) || ''});
    else { REC.delete(id); OLC = null; try{ DB.doc('dbxdel/' + id).delete(); }catch(er){} }
    paint();
  }, true);
  const mo = new MutationObserver(ms => { for(const m of ms) for(const n of m.addedNodes) if(n.nodeType === 1 && !(n.classList && n.classList.contains('dxnote')) && (n.matches && (n.matches('article.uc, .bprw, .ivgrid, .bpgrid') || n.querySelector && n.querySelector('article.uc, .bprw')))){ paint(); return; } });
  const start = () => { if(!document.body){ setTimeout(start, 200); return; } mo.observe(document.body, {childList: true, subtree: true}); load(); setTimeout(run, 3 * 60e3); setInterval(run, 30 * 60e3); setInterval(paint, 60 * 60e3); };
  start();
  const st = document.createElement('style');
  st.textContent = `
.dxnote{display:flex;align-items:center;gap:8px;margin:6px 0 0;padding:6px 8px 6px 10px;border-radius:9px;background:#F6F1F7;color:#6d2561;font:600 11.5px/1.3 Inter,system-ui,sans-serif}
.dxnote span{flex:1;min-width:0}
.dxnote button{flex:none;border:1px solid currentColor;background:#fff;color:inherit;border-radius:999px;padding:3px 10px;font:600 11px Inter,system-ui,sans-serif;cursor:pointer}
.dxnote.keep{background:#EEF6F0;color:#23794A}.dxnote.done{background:#F2F0F3;color:#7a7280;font-weight:500}`;
  document.head.appendChild(st);
})();
