/* 1.2.201 (user, 15 Nov 2026): "Comp" - her comp sheet for clients, a tab of its own on the booking card
   (Profile · MD · Stages · Details · Comp).
   - Pick a profile photo, six angle photos (Front, 45° left, Left side, 45° right, Right side, Back) and a video:
     from her Dropbox folder, from this computer (Desktop BOOKING, the Z: drive, Browse), or Upload from any device.
   - "I don't want the files being saved onto the program": only WHERE each file is goes on the card
     (c.comp = {m, a: {f, l4, l, r4, r, b}, v, vl, vlr}, each {p: 'dbx'|'pc'|'z'|'zsrc', r: path inside her folder}).
     An upload goes into HER Dropbox folder (1. BOOK / 3. VIDEOS). A file browsed on this computer without the
     "copy to Dropbox" tick is used only while the program is open (kept nowhere).
   - "Download PDF": two A4 pages in the approved layout (demo200/sheet.html). Photos are put in at high resolution so
     the client can zoom in; the video is a view-only Dropbox link to that one file. */
(function(){
  'use strict';
  if(window.__illuComp) return; window.__illuComp = true;
  if(typeof bvDrawSide !== 'function' || typeof bvSide === 'undefined') return;
  const H = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
  const WEB = !!(window.illu && window.illu.web);
  const ANG = [['f', 'Front'], ['l4', '45° left'], ['l', 'Left side'], ['r4', '45° right'], ['r', 'Right side'], ['b', 'Back']];
  const IMGX = /\.(jpe?g|png|webp|gif|heic|heif)$/i, VIDX = /\.(mp4|mov|m4v|webm)$/i;
  const nm = c => String(c.nm || '').trim();
  const first = c => nm(c);
  const fold = c => bvFolderName(c);

  /* ---------- what is chosen: on the card (shared), plus this-session-only picks ---------- */
  const LOCAL = new Map();                       // card id -> {slot: {p:'mem', r:key}}
  const MEM = new Map();                         // key -> {url, name, blob}
  const compOf = c => {
    const o = JSON.parse(JSON.stringify((c && c.comp && typeof c.comp === 'object') ? c.comp : {}));
    o.a = o.a || {};
    const L = LOCAL.get(c.id) || {};
    for(const k in L){ if(k === 'm' || k === 'v') o[k] = L[k]; else o.a[k] = L[k]; }
    /* 1.2.303: vx = a pasted video link (WeTransfer, Drive, Vimeo...) kept beside the video file; vl/vlr = the view-only Dropbox
       link of the file itself. An older pasted link (vl without vlr) counts as vx. */
    if(!o.vx && o.vl && !o.vlr) o.vx = o.vl;
    if(o.vl && !o.vlr) delete o.vl;
    return o;
  };
  /* 1.2.302 (user, 27 Nov 2026: "when inputting a photo in the slots on the comp sheet, it tends to reset back to the top
     of the page ... make it not do that"): saving a photo, video or link redraws the booking window - every scrolled part of
     it (and the page) is put back where it was, for the redraws that follow the save */
  function holdScroll(){
    const root = (typeof bvEl !== 'undefined' && bvEl) || document.body;
    const all = () => [...root.querySelectorAll('*')];
    const keep = []; const ws = window.scrollY;
    all().forEach(el => { if(el.scrollTop > 0){ const cls = String(el.className || ''); keep.push([cls, all().filter(x => String(x.className || '') === cls).indexOf(el), el.scrollTop]); } });
    if(!keep.length && !ws) return;
    let stop = 0;
    const put = () => { const els = all();
      for(const [cls, i, top] of keep){ const same = els.filter(x => String(x.className || '') === cls); const el = same[i] || same[0];
        if(el && el.scrollHeight > el.clientHeight && Math.abs(el.scrollTop - top) > 2) el.scrollTop = top; }
      if(ws && Math.abs(window.scrollY - ws) > 2) window.scrollTo(0, ws); };
    const mo = new MutationObserver(() => { requestAnimationFrame(put); if(!stop) stop = setTimeout(() => mo.disconnect(), 600); });
    mo.observe(root, {childList: true, subtree: true});
    setTimeout(() => mo.disconnect(), 4000);
  }
  window.__illuHoldScroll = holdScroll;
  function setSlot(c, slot, ref, extra){
    holdScroll();
    const loc = Object.assign({}, LOCAL.get(c.id) || {});
    delete loc[slot];
    const cp = (c.comp && typeof c.comp === 'object') ? JSON.parse(JSON.stringify(c.comp)) : {};
    cp.a = cp.a || {};
    if(ref && ref.p === 'mem'){ loc[slot] = ref; if(slot === 'm' || slot === 'v') delete cp[slot]; else delete cp.a[slot]; }
    else if(slot === 'm' || slot === 'v'){ if(ref) cp[slot] = ref; else delete cp[slot]; }
    else { if(ref) cp.a[slot] = ref; else delete cp.a[slot]; }
    if(slot === 'v'){ if(cp.vl && !cp.vlr && !cp.vx) cp.vx = cp.vl; delete cp.vl; delete cp.vlr; if(extra && extra.vl){ cp.vl = extra.vl; if(extra.vlr) cp.vlr = extra.vlr; } }
    LOCAL.set(c.id, loc);
    c.comp = cp;
    try{ saveBook(c.id, true); }catch(e){}
  }
  function setLink(c, url, rel){
    holdScroll();
    const cp = (c.comp && typeof c.comp === 'object') ? JSON.parse(JSON.stringify(c.comp)) : {};
    if(rel){ if(url){ cp.vl = url; cp.vlr = rel; } else { delete cp.vl; delete cp.vlr; } }
    else { if(cp.vl && !cp.vlr) delete cp.vl; if(url) cp.vx = url; else delete cp.vx; }
    c.comp = cp; try{ saveBook(c.id, true); }catch(e){}
  }

  /* ---------- her folders ---------- */
  const LIST = new Map();                        // card|place -> {at, r}
  async function listing(c, place, fresh){
    const k = c.id + '|' + place, o = LIST.get(k);
    if(!fresh && o && Date.now() - o.at < 120000) return o.r;
    let r;
    try{
      if(!(window.illu && window.illu.bookingFiles)) r = {ok: false, why: 'not available here'};
      else if(place === 'zsrc'){ r = c.zsrc ? await window.illu.bookingFiles('zsrc', c.zsrc, first(c)) : {ok: true, found: false}; }
      else r = await window.illu.bookingFiles(place, fold(c), first(c));
    }catch(e){ r = {ok: false, why: String(e && e.message || e)}; }
    LIST.set(k, {at: Date.now(), r: r || {ok: false}});
    return r || {ok: false};
  }
  const low = s => String(s || '').replace(/\\/g, '/').normalize('NFC').toLowerCase();
  async function urlOf(c, ref){
    if(!ref) return '';
    if(ref.p === 'mem'){ const m = MEM.get(ref.r); return m ? m.url : ''; }
    const L = await listing(c, ref.p);
    const f = L && L.ok && (L.files || []).find(x => low(x.rel) === low(ref.r));
    return f ? '/_blob/' + f.rid : '';
  }
  const baseName = r => String(r || '').split(/[\\/]/).pop();

  /* ---------- the panel ---------- */
  const slotH = (c, key, cap, ref, vid) => {
    const id = 'cmps-' + key;
    return '<div class="cmpslot' + (ref ? ' has' : '') + (vid ? ' vid' : '') + '" data-cmpslot="' + key + '" data-cmpcap="' + H(cap) + '" tabindex="0" role="button" ' +
      'title="' + H(ref ? cap + ' · ' + baseName(ref.r) + ' — click to change' : 'Choose the ' + cap.toLowerCase()) + '" id="' + id + '">' +
      (ref ? '<span class="cmpph" data-cmpref></span><span class="cmpcap">' + H(cap) + '</span><button type="button" class="cmpx" data-cmpx="' + key + '" aria-label="Remove the ' + H(cap) + '">✕</button>'
           : '<span><i class="cmpplus">+</i>' + H(cap) + '</span>') + '</div>';
  };
  function panel(c){
    const o = compOf(c);
    const nA = ANG.filter(([k]) => o.a[k]).length;
    /* 1.2.303 (user, 27 Nov 2026: "a slot by the video for people attach a link in case the video file is too big") */
    const vfile = o.v ? (o.vl && o.vlr === o.v.r ? '<p class="cmphint cmpok">✓ The client sees this video only.</p>' : '<p class="cmphint">The view-only link is made when the PDF is made. <button type="button" class="cmplk" data-cmpmk>Make it now</button></p>')
      : '<p class="cmphint">The client clicks it in the PDF to watch it in their browser.</p>';
    const vl = '<div class="cmpvl"><label class="cmpvlab" for="cmpvx-' + H(c.id) + '">Video link</label><p class="cmphint">Too big to upload? Paste a link (WeTransfer, Google Drive, Vimeo, YouTube…)</p>' +
      '<div class="cmpvlrow"><input class="cmpin" type="url" id="cmpvx-' + H(c.id) + '" placeholder="https://" value="' + H(o.vx || '') + '" data-cmpvx><button type="button" class="cmpbtn" data-cmpvxsave>Save</button></div>' +
      '<p class="cmphint cmpvxmsg">' + (o.vx ? (o.v ? 'Kept with the video. The PDF uses the video file; this link is the spare.' : '✓ The PDF opens this link.') : '') + '</p></div>';
    return '<div class="bvprof cmpp">' +
      '<div class="cmplab">Profile photo</div>' +
      '<div class="cmprow">' + slotH(c, 'm', 'Profile photo', o.m) +
        '<p class="cmphint">The big photo on page 1. Her card photo is used when this is left empty.<br><br>Hands, feet and every other detail come from the Profile and MD tabs by themselves.</p></div>' +
      '<div class="cmplab">Angle photos <em>' + nA + ' of 6</em></div>' +
      '<div class="cmpang">' + ANG.map(([k, l]) => slotH(c, k, l, o.a[k])).join('') + '</div>' +
      '<div class="cmplab">Video</div>' +
      '<div class="cmpvid"><div class="cmpvf">' + slotH(c, 'v', 'Video', o.v, true) + vfile + '</div>' + vl + '</div>' +
      '<div class="cmpbtns"><button type="button" class="cmpbtn" data-cmpdl>Download PDF</button><button type="button" class="cmpbtn o" data-cmppv>Preview</button></div>' +
      '<p class="cmpmsg" aria-live="polite"></p><p class="cmphint cmpkeep" aria-live="polite">' + (PDFREL.has(c.id) ? '✓ Kept in her Dropbox folder › ' + H(PDFREL.get(c.id).replace(/\//g, ' › ')) + ' <button type="button" class="cmpbtn o" data-cmpcl>Copy client link</button>' : '') + '</p>' +
      '<p class="cmpnote">Only where each file is gets saved on her card — the photos and video stay in her folder.</p></div>';
  }
  async function fillThumbs(c){
    const o = compOf(c);
    for(const el of bvSide.querySelectorAll('.cmpslot.has')){
      const k = el.dataset.cmpslot, ref = k === 'm' || k === 'v' ? o[k] : o.a[k];
      const u = await urlOf(c, ref), ph = el.querySelector('[data-cmpref]'); if(!ph) continue;
      if(!u){ ph.classList.add('miss'); ph.textContent = 'Not found: ' + baseName(ref && ref.r); continue; }
      if(k === 'v'){ const v = document.createElement('video'); v.muted = true; v.preload = 'metadata'; v.playsInline = true; v.src = u + '#t=1'; ph.appendChild(v); }
      else if(/\.hei[cf]$/i.test(ref.r)){ ph.textContent = baseName(ref.r); ph.classList.add('miss'); heicThumb(u).then(t => { if(t){ ph.textContent = ''; ph.classList.remove('miss'); ph.style.backgroundImage = 'url("' + t + '")'; } }); }
      else ph.style.backgroundImage = 'url("' + u.replace(/"/g, '%22') + '")';
    }
  }
  const HEICT = new Map();
  async function heicThumb(u){
    if(HEICT.has(u)) return HEICT.get(u);
    try{ const b = await (await fetch(u)).blob(); const h = await bvLib('heic'); let out = await h({blob: b, toType: 'image/jpeg', quality: 0.8}); if(Array.isArray(out)) out = out[0]; const t = URL.createObjectURL(out); HEICT.set(u, t); return t; }catch(e){ return ''; }
  }

  /* the fifth tab: the side panel draws as before, then Comp is added */
  const draw0 = bvDrawSide;
  bvDrawSide = function(c, got){
    const comp = bv && bv.view === 'c';
    draw0.apply(this, arguments);
    try{
      const tabs = bvSide.querySelector('.bvvws');
      if(tabs && !tabs.querySelector('[data-bvview="c"]')) tabs.insertAdjacentHTML('beforeend', '<button type="button" class="bvvw" data-bvview="c" aria-pressed="' + comp + '" title="Comp sheet for clients (PDF)">Comp</button>');
      if(!comp) return;
      tabs.querySelectorAll('[data-bvview]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bvview === 'c')));
      const h3 = bvSide.querySelector('.bvsh');
      const pu = h3 && h3.querySelector('.bvpuni'); if(pu) pu.remove();
      const src = bvSide.querySelector('.bvsrc');
      for(const el of [...bvSide.children]) if(el !== h3 && el !== src) el.remove();
      (h3 || bvSide.firstChild).insertAdjacentHTML('afterend', panel(c));
      fillThumbs(c);
    }catch(e){}
  };
  /* the click comes here before the side panel's own handler (which knows only the first four) */
  document.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target : null; if(!t || !bv || !bvSide.contains(t)) return;
    if(t.closest('[data-bvview="c"]')){ e.stopPropagation(); e.preventDefault(); bv.pane = ''; const was = bv.view; bv.view = 'c';
      if(was === 'm'){ const cc = BOOK.get(bv.id); if(cc) try{ bvDrawStage(cc, BVLOAD.get(bv.id)); }catch(er){} }
      bvSideRefresh(true); return; }
    if(bv.view !== 'c' || !t.closest('.cmpp')) return;
    const c = BOOK.get(bv.id); if(!c) return;
    const x = t.closest('[data-cmpx]');
    if(x){ e.stopPropagation(); setSlot(c, x.dataset.cmpx, null); bvSideRefresh(true); return; }
    const s = t.closest('[data-cmpslot]');
    if(s){ e.stopPropagation(); openPicker(c, s.dataset.cmpslot, s.dataset.cmpcap); return; }
    if(t.closest('[data-cmplink]')){ e.stopPropagation(); pasteLink(c); return; }
    if(t.closest('[data-cmpvxsave]')){ e.stopPropagation(); const inp = bvSide.querySelector('[data-cmpvx]'), m = bvSide.querySelector('.cmpvxmsg'); const v = inp ? inp.value.trim() : '';
      if(v && !/^https?:\/\/\S+$/i.test(v)){ if(m) m.textContent = 'A link starts with https:// — please paste the whole link.'; if(inp) inp.focus(); return; }
      setLink(c, v, ''); bvSideRefresh(true); return; }
    if(t.closest('[data-cmpmk]')){ e.stopPropagation(); makeLink(c, compOf(c).v); return; }
    if(t.closest('[data-cmpdl]')){ e.stopPropagation(); run(c, 'pdf', t.closest('[data-cmpdl]')); return; }
    if(t.closest('[data-cmpcl]')){ e.stopPropagation(); clientLink(c); return; }
    if(t.closest('[data-cmppv]')){ e.stopPropagation(); run(c, 'pv', t.closest('[data-cmppv]')); return; }
  }, true);
  document.addEventListener('keydown', e => {
    if((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('.cmpslot')){ e.preventDefault(); e.target.click(); }
  });
  const msg = t => { const m = bvSide.querySelector('.cmpmsg'); if(m) m.textContent = t || ''; };

  /* ---------- the video link: view-only, this one file ---------- */
  async function makeLink(c, ref){
    if(!ref || ref.p !== 'dbx'){ msg('A link can be made only for a video in her Dropbox folder — or paste a link.'); return; }
    if(!(window.illu && window.illu.bookingShareFile)){ pasteLink(c, 'Making links is not available here'); return; }
    msg('Making the view-only link…');
    let r; try{ r = await window.illu.bookingShareFile(fold(c), first(c), ref.r); }catch(e){ r = {ok: false, why: String(e && e.message || e)}; }
    if(r && r.ok && r.url){ setLink(c, r.url, ref.r); bvSideRefresh(true); msg('Link ready — the client sees this video only.'); return; }
    const why = !r ? '' : r.need === 'connect' ? 'Dropbox is not connected (Settings › Dropbox)' : r.scope ? 'the Dropbox app may not make links yet (sharing permission)' : r.nofolder ? 'her Dropbox folder was not found' : (r.why || '');
    pasteLink(c, 'The link could not be made' + (why ? ': ' + why : ''));
  }
  function pasteLink(c, why){
    const o = compOf(c);
    const d = sheet('Video link', '<div class="cmpup">' + (why ? '<p class="cmpwarn">' + H(why) + '.</p>' : '') +
      '<p>Paste the link the client should open (a Dropbox, YouTube, Vimeo or Google Drive link to the video).</p>' +
      '<input class="cmpin" type="url" placeholder="https://" value="' + H(o.vx || '') + '" data-cmpurl>' +
      '<div class="cmpbtns"><button type="button" class="cmpbtn" data-cmpsave>Save link</button>' + (o.vx ? '<button type="button" class="cmpbtn o" data-cmpclear>Remove link</button>' : '') + '</div></div>', null);
    const inp = d.querySelector('[data-cmpurl]'); setTimeout(() => inp.focus(), 50);
    d.querySelector('[data-cmpsave]').onclick = () => { const v = inp.value.trim(); if(v && !/^https?:\/\//i.test(v)){ inp.focus(); return; } setLink(c, v, ''); close(); bvSideRefresh(true); };
    const cl = d.querySelector('[data-cmpclear]'); if(cl) cl.onclick = () => { setLink(c, '', ''); close(); bvSideRefresh(true); };
  }

  /* ---------- the chooser ---------- */
  let DIM = null;
  function close(){ if(DIM){ DIM.remove(); DIM = null; } }
  function sheet(title, body, srcs){
    close();
    DIM = document.createElement('div'); DIM.className = 'cmpdim';
    DIM.innerHTML = '<div class="cmpsheet" role="dialog" aria-label="' + H(title) + '"><div class="cmpsh"><b>' + H(title) + '</b><button type="button" class="cmpcx" aria-label="Close">×</button></div>' +
      (srcs ? '<div class="cmpsrc">' + srcs + '</div>' : '') + '<div class="cmpsb">' + body + '</div></div>';
    DIM.addEventListener('click', e => { if(e.target === DIM || e.target.closest('.cmpcx')) close(); });
    document.body.appendChild(DIM);
    return DIM;
  }
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && DIM){ e.stopPropagation(); close(); } }, true);
  function openPicker(c, slot, cap){
    const vid = slot === 'v';
    const S = [['dbx', 'Her Dropbox folder']].concat(WEB ? [] : [['pc', 'Z: drive']]).concat([['up', 'Upload']]);
    const d = sheet('Choose: ' + cap, '', S.map(([k, l], i) => '<button type="button" data-cmpsrc="' + k + '"' + (i ? '' : ' class="on"') + '>' + l + '</button>').join(''));
    const sb = d.querySelector('.cmpsb');
    const show = k => { d.querySelectorAll('[data-cmpsrc]').forEach(b => b.classList.toggle('on', b.dataset.cmpsrc === k)); drawSrc(c, slot, vid, k, sb); };
    d.querySelectorAll('[data-cmpsrc]').forEach(b => b.onclick = () => show(b.dataset.cmpsrc));
    show('dbx');
  }
  const kindOk = (rel, vid) => (vid ? VIDX : IMGX).test(rel);
  function grid(place, files, vid){
    const by = new Map();
    for(const f of files){ const parts = f.rel.replace(/\\/g, '/').split('/'); const g = parts.length > 1 ? parts.slice(0, -1).join(' › ') : '(her folder)'; if(!by.has(g)) by.set(g, []); by.get(g).push(f); }
    const order = [...by.keys()].sort((a, b) => { const p = s => /book/i.test(s) ? 0 : /snap/i.test(s) ? 1 : /video/i.test(s) ? 2 : 3; return p(a) - p(b) || a.localeCompare(b); });
    return order.map(g => '<div class="cmpfold">' + H(g) + '</div><div class="cmppick' + (vid ? ' v' : '') + '">' + by.get(g).slice(0, 120).map(f =>
      '<button type="button" data-cmpplace="' + place + '" data-cmprel="' + H(f.rel) + '" title="' + H(baseName(f.rel)) + '">' +
      (vid ? '<video muted preload="metadata" playsinline src="/_blob/' + H(f.rid) + '#t=1"></video>' : /\.hei[cf]$/i.test(f.rel) ? '' : '<img loading="lazy" decoding="async" alt="" src="/_blob/' + H(f.rid) + '">') +
      '<span>' + H(baseName(f.rel)) + '</span></button>').join('') + '</div>').join('');
  }
  async function drawSrc(c, slot, vid, k, sb){
    if(k === 'up') return drawUpload(c, slot, vid, sb, false);
    sb.innerHTML = '<p class="cmphint">Looking…</p>';
    const places = k === 'dbx' ? [['dbx', 'Dropbox']] : [['pc', 'Z: › ILLUMENOCTIS › Booking']].concat(c.zsrc ? [['zsrc', 'Z: › her office folder']] : []);
    let html = '';
    for(const [p, label] of places){
      const L = await listing(c, p, true);
      if(!L || !L.ok){
        if(L && L.need === 'connect') html += '<div class="cmpup"><b>Dropbox is not connected' + (WEB ? ' on this phone' : '') + '.</b><br>' + (window.illu && window.illu.dropboxConnect ? '<button type="button" class="cmpbtn" data-cmpconnect>Connect Dropbox</button>' : 'Connect it in Settings › Dropbox.') + '</div>';
        else if(k === 'dbx') html += '<p class="cmphint">' + H(label) + ': ' + H((L && L.why) || 'could not be read') + '</p>';
        continue;
      }
      const files = (L.files || []).filter(f => kindOk(f.rel, vid) && !/passport|여권|visa|비자|contract|계약|statement|ticket|e-?ticket/i.test(f.rel));   /* her documents never show here */
      if(!L.found){ if(k === 'dbx') html += '<p class="cmphint">Her Dropbox folder (' + H(fold(c)) + ') was not found. Use Upload to start it.</p>'; continue; }
      if(!files.length){ if(k === 'dbx') html += '<p class="cmphint">No ' + (vid ? 'videos' : 'photos') + ' in her Dropbox folder yet.</p>'; continue; }
      html += (k === 'pc' ? '<div class="cmpwhere">' + H(label) + '</div>' : '') + grid(p, files, vid);
    }
    if(k === 'pc'){
      if(!html) html = '<p class="cmphint">Nothing for her in the BOOKING folders on this computer.</p>';
      html += '<div class="cmpup"><b>Somewhere else on this computer?</b><br><button type="button" class="cmpbtn o" data-cmpbrowse>Browse this computer…</button>' +
        '<br><label class="cmptick"><input type="checkbox" data-cmpcopy checked> also put a copy in her Dropbox folder</label>' +
        '<small>Without the tick the file is read from where it is, only while the program is open — nothing is copied into the program. With it, the team and the phones can use it too' + (vid ? ', and the client gets a link.' : '.') + '</small></div>';
    }
    sb.innerHTML = html;
    const cn = sb.querySelector('[data-cmpconnect]'); if(cn) cn.onclick = () => { try{ window.illu.dropboxConnect(); }catch(e){} };
    sb.querySelectorAll('[data-cmprel]').forEach(b => b.onclick = () => pickFile(c, slot, vid, b.dataset.cmpplace, b.dataset.cmprel));
    const br = sb.querySelector('[data-cmpbrowse]'); if(br) br.onclick = () => chooseFile(vid, f => { const cp = sb.querySelector('[data-cmpcopy]'); gotFile(c, slot, vid, f, !cp || cp.checked); });
  }
  function drawUpload(c, slot, vid, sb){
    const w = vid ? 'video' : 'photo';
    sb.innerHTML = '<div class="cmpup cmpdrop"><b>Drop a ' + w + ' here</b><br>or choose one from the phone, tablet or computer you are using.<br><button type="button" class="cmpbtn" data-cmpchoose>Choose a ' + w + '</button>' +
      '<small>It is saved into her Dropbox folder (' + (vid ? '3. VIDEOS' : '1. BOOK') + '), not into the program.</small></div>';
    sb.querySelector('[data-cmpchoose]').onclick = () => chooseFile(vid, f => gotFile(c, slot, vid, f, true));
    const dz = sb.querySelector('.cmpdrop');
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if(f) gotFile(c, slot, vid, f, true); });
  }
  function chooseFile(vid, cb){
    const i = document.createElement('input'); i.type = 'file'; i.accept = vid ? 'video/*,.mov,.mp4,.m4v' : 'image/*,.heic,.heif';
    i.style.display = 'none'; document.body.appendChild(i);
    i.onchange = () => { const f = i.files && i.files[0]; i.remove(); if(f) cb(f); };
    i.click();
  }
  function sayIn(t){ const sb = DIM && DIM.querySelector('.cmpsb'); if(sb) sb.innerHTML = '<p class="cmphint">' + H(t) + '</p>'; }
  async function gotFile(c, slot, vid, f, copy){
    if(!kindOk(f.name, vid) && !(vid ? /^video\//.test(f.type) : /^image\//.test(f.type))){ sayIn('That is not a ' + (vid ? 'video' : 'photo') + '.'); return; }
    if(copy && window.illu && window.illu.bookingPut){
      sayIn('Putting ' + f.name + ' into her Dropbox folder…');
      let r; try{ r = await window.illu.bookingPut('dbx', fold(c), first(c), vid ? '3. VIDEOS' : '1. BOOK', f.name, WEB ? f : await f.arrayBuffer(), ''); }catch(e){ r = {ok: false, why: String(e && e.message || e)}; }
      if(r && r.ok){
        LIST.delete(c.id + '|dbx');
        const ref = {p: 'dbx', r: (r.sub ? r.sub + '/' : '') + r.name};
        close(); setSlot(c, slot, ref); bvSideRefresh(true);
        if(vid) makeLink(c, ref); else msg(f.name + ' is in her Dropbox folder (' + (r.sub || '') + ').');
        return;
      }
      const why = r && r.need === 'connect' ? 'Dropbox is not connected' : (r && r.why) || '';
      memPick(c, slot, f); close(); bvSideRefresh(true);
      msg('It could not go into her Dropbox folder' + (why ? ' (' + why + ')' : '') + ' — it is used for this PDF only, while the program is open.' + (vid ? ' Paste a link for the client.' : ''));
      return;
    }
    memPick(c, slot, f); close(); bvSideRefresh(true);
    msg(f.name + ' is used from this computer while the program is open — nothing was copied.' + (vid ? ' Paste a link so the client can watch it.' : ''));
  }
  function memPick(c, slot, f){
    const key = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    MEM.set(key, {url: URL.createObjectURL(f), name: f.name, blob: f});
    setSlot(c, slot, {p: 'mem', r: key});
  }
  async function pickFile(c, slot, vid, place, rel){
    if(place === 'dbx'){ close(); setSlot(c, slot, {p: 'dbx', r: rel}); bvSideRefresh(true); if(vid) makeLink(c, {p: 'dbx', r: rel}); return; }
    /* a video on this computer needs a copy in Dropbox for the client's link */
    if(vid){
      sayIn('Putting the video into her Dropbox folder so the client can watch it…');
      try{ const u = await urlOf(c, {p: place, r: rel}); const b = await (await fetch(u)).blob(); return gotFile(c, slot, vid, new File([b], baseName(rel), {type: b.type || 'video/mp4'}), true); }
      catch(e){ close(); setSlot(c, slot, {p: place, r: rel}); bvSideRefresh(true); msg('The video could not be copied to Dropbox — paste a link for the client.'); return; }
    }
    close(); setSlot(c, slot, {p: place, r: rel}); bvSideRefresh(true);
  }

  /* ---------- the PDF ---------- */
  const has = v => v != null && String(v).trim() !== '';
  const cap1 = s => String(s || '').trim().replace(/(^|[\s\-\/(,])(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
  const LT = 'ABCDEFGH';
  const SPOTS = typeof EARSPOTS !== 'undefined' ? EARSPOTS : ['Lobe', 'Upper lobe', 'Helix', 'Tragus', 'Conch', 'Daith', 'Rook', 'Industrial'];
  const PTS = typeof EARPTS !== 'undefined' ? EARPTS : [[46,119], [33,104], [16,44], [74,69], [54,73], [57,50], [37,42], [45,20.5]];
  function pparse(txt){
    const n = SPOTS.map(() => 0);
    String(txt || '').split(',').map(s => s.trim()).filter(Boolean).forEach(p => {
      const m = p.match(/^(.*?)\s*(?:[×x*]\s*(\d+))?$/i);
      const k = (m ? m[1] : p).trim().toLowerCase(), q = m && m[2] ? Math.max(1, +m[2]) : 1;
      const i = SPOTS.findIndex(s => s.toLowerCase() === k); if(i >= 0) n[i] += q;
    });
    return n;
  }
  function earSvg(n, flip){
    const lines = (typeof EARSVG_LINES !== 'undefined' ? EARSVG_LINES : '').replace('class="earskin"', 'fill="#F5E6DF" stroke="none"');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" width="300" height="420"><g' + (flip ? ' transform="translate(90 0) scale(-1 1)"' : '') + '>' +
      '<g fill="none" stroke="#6A5862" stroke-width="1.3" stroke-linecap="round">' + lines + '</g></g>' +
      PTS.map(([x, y], i) => { const X = flip ? 90 - x : x, k = n[i] || 0;
        return '<g transform="translate(' + X + ',' + y + ')">' + (k ? '<circle r="8.5" fill="#6E2E5E" stroke="#fff" stroke-width="1.2"/><text y="3.2" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="9" fill="#fff">' + LT[i] + '</text>' +
          (k > 1 ? '<g transform="translate(8,-8)"><circle r="5.6" fill="#E07B1A" stroke="#fff" stroke-width="1"/><text y="2.4" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="7" fill="#fff">' + k + '</text></g>' : '') : '<circle r="1.6" fill="#D8CFD9"/>') + '</g>'; }).join('') + '</svg>';
  }
  const dParse = v => { const m = String(v || '').trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/); return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : null; };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dWords = v => { const d = dParse(v); return d ? d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear() : String(v || ''); };
  const today = () => { const d = new Date(); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };

  function facts(c){
    const lu = bkLU(c), su = bkSU(c), wu = bkWU(c), g = c.g === 'M' ? 'M' : 'F';
    const num = v => { const x = parseFloat(v); return isNaN(x) ? null : x; };
    const L = v => { const x = num(v); return x == null ? null : lu === 'in' ? [String(cmToIn(x)), 'in'] : [String(x), 'cm']; };
    const eu = num(c.eu);
    const shoe = su === 'mm' ? (eu != null ? [String(euToMm(eu)), 'mm'] : null) : su === 'us' ? (has(c.us) ? [String(c.us), 'US'] : eu != null ? [String(Math.round((eu - (g === 'M' ? 33 : 31)) * 10) / 10), 'US'] : null)
      : (eu != null ? [String(c.eu), 'EU'] : has(c.us) ? [String(c.us), 'US'] : null);
    const mline = [['Height', L(c.ht)], [g === 'M' ? 'Chest' : 'Bust', L(c.bu)], ['Waist', L(c.wa)], ['Hips', L(c.hp)], ['Shoe', shoe]].filter(x => x[1]);
    let age = ''; try{ age = ageFrom(c.dob); }catch(e){} if(age === '' || age == null) age = has(c.age) ? String(c.age) : '';
    const kg = num(c.wt);
    const wt = kg == null ? '' : wu === 'lb' ? Math.round(kg / 0.45359237) + ' lb' : kg + ' kg';
    const tn = has(c.ttn) ? String(c.ttn).trim() : '', tl = has(c.ttl) ? String(c.ttl).trim() : '';
    const tat = !tn && !tl ? '' : tn === '0' && !tl ? 'None' : [tn ? tn + (tn === '1' ? ' tattoo' : ' tattoos') : '', tl].filter(Boolean).join(' · ');
    const pl = pparse(c.pll), pr = pparse(c.prl);
    const tot = (n, f) => { const s = n.reduce((a, b) => a + b, 0); if(s) return s; const t = parseInt(c[f], 10); return isNaN(t) ? 0 : t; };
    const nl = tot(pl, 'pln'), nr = tot(pr, 'prn'), pknown = has(c.pll) || has(c.prl) || has(c.pln) || has(c.prn);
    const pier = !pknown ? '' : nl + nr === 0 ? 'None' : (nl + nr) + ' · Left ' + nl + ' · Right ' + nr;
    let ctry = []; try{ ctry = beenList(c); }catch(e){}
    const ind = has(c.ind) ? dWords(c.ind) : '', outd = has(c.outd) ? dWords(c.outd) : '';
    const a = dParse(c.ind), b = dParse(c.outd);
    const stay = has(c.stay) ? String(c.stay) : a && b && b > a ? (Math.round((b - a) / 86400000) + 1) + ' days' : has(c.avd) ? c.avd + ' days' : '';
    const F = [['Age', age], ['Nationality', has(c.nat) ? cap1(c.nat) : ''], ['Experience', has(c.exp) ? String(c.exp) : ''], ['Eye color', has(c.ecol) ? cap1(c.ecol) : ''],
      ['Hair', [has(c.hcol) ? cap1(c.hcol) : '', has(c.htyp) ? cap1(c.htyp) : ''].filter(Boolean).join(' · ')], ['Weight', wt], ['Tattoos', tat], ['Piercings', pier]].filter(x => x[1] !== '' && x[1] != null);
    /* measurement detail: the rows that are filled in */
    const md = (c.md && typeof c.md === 'object') ? c.md : {};
    const SEC = (typeof BVMDSEC !== 'undefined' ? BVMDSEC : []).map(([key, title, pic, list]) => [key === 'fb' ? 'Full body' : title, list.map(([nums, nm0, f]) => {
      const name = (f === 'bu' && g === 'M') ? 'Chest (fullest part)' : nm0;
      let v = null, u = lu;
      if(f === 'wt'){ if(kg != null){ v = String(wu === 'lb' ? Math.round(kg / 0.45359237) : kg); u = wu; } }
      else if(f === 'eu'){ if(shoe){ v = shoe[0]; u = shoe[1]; } }
      else { const raw = typeof BVMDCARD !== 'undefined' && BVMDCARD[f] ? c[f] : md[f]; const x = num(raw); v = x == null ? (has(raw) ? String(raw) : null) : String(lu === 'in' ? cmToIn(x) : x); }
      return v == null ? null : [nums[0], name, v, u];
    }).filter(Boolean)]);
    let rings = '';
    try{ const R = (c.ring && typeof c.ring === 'object') ? c.ring : {}; const U = {us: 'US', eu: 'EU', jp: 'JP', uk: 'UK', mm: 'mm'}[c.ringu] || 'US';
      const F5 = [['t', 'Thumb'], ['i', 'Index'], ['m', 'Middle'], ['r', 'Ring'], ['p', 'Little']];
      const one = s => { const r = R[s] || {}; return F5.filter(([k]) => has(r[k])).map(([k, n]) => n + ' ' + r[k]).join(', '); };
      const l = one('L'), r = one('R'); if(l || r) rings = [l ? 'Left: ' + l : '', r ? 'Right: ' + r : ''].filter(Boolean).join(' · ') + ' (' + U + ')'; }catch(e){}
    const hph = (c.hph && typeof c.hph === 'object') ? c.hph : {}, fph = (c.fph && typeof c.fph === 'object') ? c.fph : {};
    const hf = [[hph.l, 'Left hand · front'], [hph.r, 'Right hand · front'], [hph.lb, 'Left hand · back'], [hph.rb, 'Right hand · back'], [fph.l, 'Left foot'], [fph.r, 'Right foot']].filter(x => x[0]).map(x => ['/_blob/' + x[0], x[1]]);
    return {mline, F, ctry, pl, pr, nl, nr, pknown, ind, outd, stay, SEC, rings, hf};
  }

  const CSS = `
.cmpdoc{position:fixed;left:-30000px;top:0;z-index:-1;font-family:'CompSans',Arial,sans-serif;color:#1D1A21;font-size:16px;line-height:1.2;letter-spacing:0;text-align:left;font-weight:400}
.cmpdoc *{box-sizing:border-box;border-radius:0;box-shadow:none;outline:0;min-width:0;max-width:none;float:none;text-shadow:none}
.cmpdoc .zcpg{width:210mm;height:297mm;padding:13mm 16mm 0;position:relative;overflow:hidden;background:#fff}
.cmpdoc .zctop{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:3.5mm;border-bottom:1px solid #1D1A21;margin-bottom:6mm}
.cmpdoc .zcbrand{font:400 13px 'CompSerif',Georgia,serif;letter-spacing:.34em}
.cmpdoc .zcbrand small{display:block;font:500 6.5px 'CompSans',Arial,sans-serif;letter-spacing:.28em;color:#857D8C;margin-top:1.2mm}
.cmpdoc .zcref{font-size:7px;color:#857D8C;text-align:right;letter-spacing:.16em;text-transform:uppercase;line-height:1.7}
.cmpdoc .zcfoot{position:absolute;left:16mm;right:16mm;bottom:9mm;display:flex;justify-content:space-between;font-size:6.5px;color:#B3ABB8;letter-spacing:.12em;text-transform:uppercase}
.cmpdoc .zclab{display:flex;align-items:center;gap:3mm;font-size:7px;letter-spacing:.24em;text-transform:uppercase;font-weight:600;color:#6E2E5E;margin:0 0 2.6mm}
.cmpdoc .zclab::after{content:'';flex:1;height:1px;background:#E8E3EC}
.cmpdoc .zcsec{margin-top:4mm}
.cmpdoc .zchero{display:grid;grid-template-columns:52mm 1fr;gap:8mm;align-items:stretch}
.cmpdoc .zcph{width:52mm;min-height:69mm;border-radius:1.5mm;overflow:hidden;background:#F7F4F8;position:relative}
.cmpdoc h1{font:400 28px/1.04 'CompSerif',Georgia,serif;margin:0 0 2mm;letter-spacing:.01em}
.cmpdoc .zcagy{font-size:7.5px;letter-spacing:.22em;text-transform:uppercase;color:#857D8C;margin-bottom:3mm}
.cmpdoc .zcagy b{color:#6E2E5E;font-weight:600}
.cmpdoc .zcmline{display:flex;margin-bottom:3mm;border:1px solid #E8E3EC;border-radius:1.5mm;overflow:hidden}
.cmpdoc .zcmline span{flex:1;padding:1.6mm 2mm;display:flex;align-items:baseline;gap:1.2mm;font:400 13px 'CompSerif',Georgia,serif;white-space:nowrap}
.cmpdoc .zcmline span+span{border-left:1px solid #E8E3EC}
.cmpdoc .zcmline i{font:600 5.8px 'CompSans',Arial,sans-serif;font-style:normal;letter-spacing:.16em;text-transform:uppercase;color:#857D8C}
.cmpdoc .zcmline u{text-decoration:none;font:500 6.5px 'CompSans',Arial,sans-serif;color:#857D8C}
.cmpdoc .zcfacts{display:grid;grid-template-columns:1fr 1fr;column-gap:7mm;align-content:start}
.cmpdoc .zcf{padding:1.5mm 0;border-top:1px solid #E8E3EC}
.cmpdoc .zcf span{display:block;font-size:6.5px;letter-spacing:.2em;text-transform:uppercase;color:#857D8C;margin-bottom:.5mm}
.cmpdoc .zcf b{font-size:9.8px;font-weight:600}
.cmpdoc .zcf.zcw{grid-column:1/-1}
.cmpdoc .zcduo{display:grid;grid-template-columns:1fr 1fr;gap:6mm;align-items:stretch}
.cmpdoc .zcduo.zcone{grid-template-columns:1fr}
.cmpdoc .zcduo>.zcsec{display:flex;flex-direction:column}
.cmpdoc .zcdates{display:grid;grid-template-columns:1fr;gap:1.8mm;flex:1}
.cmpdoc .zcdates div{background:#F7F4F8;border-radius:1.5mm;padding:1.8mm 3.2mm;display:flex;align-items:center;justify-content:space-between}
.cmpdoc .zcdates span{font-size:6.5px;letter-spacing:.2em;text-transform:uppercase;color:#857D8C}
.cmpdoc .zcdates b{font-size:11px;font-weight:600}
.cmpdoc .zcpier{display:grid;width:100%;flex:1;grid-template-columns:auto 1fr;gap:4mm;align-items:center;background:#F7F4F8;border-radius:1.5mm;padding:3mm 4mm}
.cmpdoc .zcears{display:flex;gap:2mm}
.cmpdoc .zcears figure{margin:0;text-align:center}
.cmpdoc .zcear{width:17mm;height:23.8mm;position:relative}
.cmpdoc .zcears figcaption{font-size:6.5px;letter-spacing:.2em;text-transform:uppercase;color:#857D8C;font-weight:600;margin-top:1mm}
.cmpdoc .zcptab{width:100%;border-collapse:collapse;font-size:8.5px}
.cmpdoc .zcptab th{font-size:6.5px;letter-spacing:.2em;text-transform:uppercase;color:#857D8C;font-weight:600;text-align:left;padding:0 0 1.6mm;border-bottom:1px solid #E2DBE5}
.cmpdoc .zcptab th.zcn,.cmpdoc .zcptab td.zcn{text-align:center;width:10mm}
.cmpdoc .zcptab td{padding:1.6mm 0;border-bottom:1px solid #ECE6EE}
.cmpdoc .zcptab td:first-child{white-space:nowrap}
.cmpdoc .zcptab tbody tr:last-child td{border-bottom:0}
.cmpdoc .zcptab td i{display:inline-block;text-align:center;line-height:3.9mm;width:3.9mm;height:3.9mm;border-radius:50%;background:#6E2E5E;color:#fff;font:600 6.3px/3.9mm 'CompSans',Arial,sans-serif;font-style:normal;margin-right:2mm;vertical-align:middle}
.cmpdoc .zcptab td.zcn{font-weight:600}.cmpdoc .zcptab td.zcz{color:#B3ABB8;font-weight:400}
.cmpdoc .zcptab tfoot td{font-weight:600;border-top:1px solid #E2DBE5;border-bottom:0;padding-top:1.8mm}
.cmpdoc .zcpnone{font-size:9px;color:#857D8C}
.cmpdoc .zcmdg{display:grid;grid-template-columns:1fr 1fr;gap:0 8mm}
.cmpdoc .zcgsp{height:2.6mm}
.cmpdoc .zcgrp h3{margin:0 0 .4mm;font-size:6.3px;letter-spacing:.2em;text-transform:uppercase;font-weight:600;color:#1D1A21;padding-bottom:1mm;border-bottom:1px solid #1D1A21}
.cmpdoc .zcrow{display:grid;grid-template-columns:5mm 1fr auto;align-items:center;padding:.95mm 0;border-bottom:1px solid #E8E3EC;font-size:8px}
.cmpdoc .zcrow i{width:3.6mm;height:3.6mm;border-radius:50%;background:#2F6DB5;color:#fff;font:600 5.6px/3.6mm 'CompSans',Arial,sans-serif;font-style:normal;text-align:center}
.cmpdoc .zcrow b{font-weight:600}.cmpdoc .zcrow b small{color:#857D8C;font-weight:500;margin-left:.6mm;font-size:6.3px}
.cmpdoc .zcrow.zcrg{grid-template-columns:1fr;font-size:7.6px;color:#4E4755}
.cmpdoc .zchf{display:grid;grid-template-columns:repeat(6,1fr);gap:3mm}
.cmpdoc .zchf figure,.cmpdoc .zcgal figure{margin:0}
.cmpdoc .zcim{aspect-ratio:3/4;border-radius:1.2mm;overflow:hidden;background:#F7F4F8;position:relative}
.cmpdoc .zchf figcaption{font-size:5.8px;letter-spacing:.14em;text-transform:uppercase;color:#4E4755;font-weight:600;margin-top:1.1mm;text-align:center}
.cmpdoc .zcgal{display:grid;grid-template-columns:repeat(3,1fr);gap:3.5mm 4mm;width:146mm;margin:0 auto}
.cmpdoc .zcgal .zcim{border-radius:1.5mm}
.cmpdoc .zcgal figcaption{font-size:6.6px;letter-spacing:.18em;text-transform:uppercase;color:#4E4755;font-weight:600;margin-top:1.6mm;text-align:center}
.cmpdoc .zcvid{display:flex;flex-direction:column;align-items:center;text-align:center;gap:3mm}
.cmpdoc .zcvid .zcfr{display:block;position:relative;width:112mm;aspect-ratio:16/9;border-radius:1.5mm;overflow:hidden;background:#3a3238}
.cmpdoc .zcvid .zcplay{position:absolute;left:50%;top:50%;width:14mm;height:14mm;margin:-7mm 0 0 -7mm;border-radius:50%;background:rgba(255,255,255,.92);z-index:2}
.cmpdoc .zcvid .zcplay::after{content:'';position:absolute;left:5.6mm;top:4mm;border-left:4.6mm solid #6E2E5E;border-top:3mm solid transparent;border-bottom:3mm solid transparent}
.cmpdoc .zcvid .zclen{position:absolute;right:2mm;bottom:2mm;background:rgba(0,0,0,.6);color:#fff;font-size:7px;font-weight:600;padding:.8mm 1.8mm;border-radius:1mm;letter-spacing:.06em;z-index:2}
.cmpdoc .zcvid h4{margin:0 0 1mm;font-size:10.5px;font-weight:600}
.cmpdoc .zcvid p{margin:0 0 1.5mm;font-size:7.6px;color:#857D8C;line-height:1.6}
.cmpdoc .zcvid .zcgo{display:inline-block;margin-top:1mm;font-size:7px;letter-spacing:.2em;text-transform:uppercase;font-weight:600;color:#6E2E5E;border-bottom:1px solid #6E2E5E;padding-bottom:.5mm}
.cmpdoc .zcnote{font-size:7px;color:#857D8C;text-align:center;margin-top:5mm}
.cmpdoc [data-pimg] img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.cmpdoc [data-pimg].fit img{object-fit:contain}
.cmpdoc.zcshot [data-pimg] img{visibility:hidden}
.cmpdoc .zcvpi{border-radius:1.5mm}
.cmpdoc.zccap{left:0;top:0;z-index:-5;pointer-events:none}
`;
  function addCss(){
    if(document.getElementById('cmpdoccss')) return;
    const s = document.createElement('style'); s.id = 'cmpdoccss';
    s.textContent = "@font-face{font-family:'CompSerif';font-weight:400;src:url(../fonts/bodoni-moda-latin-400-normal.woff2) format('woff2')}" +
      "@font-face{font-family:'CompSerif';font-weight:400;src:url(../fonts/bodoni-moda-latin-ext-400-normal.woff2) format('woff2');unicode-range:U+0100-024F,U+1E00-1EFF}" +
      [400, 500, 600].map(w => "@font-face{font-family:'CompSans';font-weight:" + w + ";src:url(../fonts/ibm-plex-sans-latin-" + w + "-normal.woff2) format('woff2')}@font-face{font-family:'CompSans';font-weight:" + w + ";src:url(../fonts/ibm-plex-sans-latin-ext-" + w + "-normal.woff2) format('woff2');unicode-range:U+0100-024F,U+1E00-1EFF}").join('') + CSS;
    document.head.appendChild(s);
  }

  /* one picture: a JPEG (or PNG) no bigger than MAXPX on its long side, turned the right way up */
  const MAXPX = 2400;
  async function loadPic(u){
    if(!u) return null;
    try{
      let b = await (await fetch(u)).blob();
      if(/hei[cf]/i.test(b.type) || /\.hei[cf]/i.test(u)){ const h = await bvLib('heic'); let o = await h({blob: b, toType: 'image/jpeg', quality: 0.92}); b = Array.isArray(o) ? o[0] : o; }
      const bmp = await createImageBitmap(b, {imageOrientation: 'from-image'});
      const k = Math.min(1, MAXPX / Math.max(bmp.width, bmp.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height); bmp.close && bmp.close();
      const png = /png/i.test(b.type);
      const data = cv.toDataURL(png ? 'image/png' : 'image/jpeg', 0.9);
      return {data, fmt: png ? 'PNG' : 'JPEG', w: cv.width, h: cv.height};
    }catch(e){ return null; }
  }
  async function svgPic(svg){
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const cv = document.createElement('canvas'); cv.width = 300; cv.height = 420; cv.getContext('2d').drawImage(img, 0, 0, 300, 420);
    return {data: cv.toDataURL('image/png'), fmt: 'PNG', w: 300, h: 420};
  }
  async function poster(u){
    if(!u) return {pic: null, len: ''};
    return new Promise(res => {
      const v = document.createElement('video'); let done = false;
      const fin = (pic, len) => { if(done) return; done = true; clearTimeout(t); v.removeAttribute('src'); try{ v.load(); }catch(e){} res({pic, len}); };
      const t = setTimeout(() => fin(null, ''), 12000);
      v.muted = true; v.preload = 'auto'; v.playsInline = true; v.crossOrigin = 'anonymous';
      v.onloadedmetadata = () => { try{ v.currentTime = Math.min(1.5, (v.duration || 2) / 3); }catch(e){ fin(null, ''); } };
      v.onseeked = () => {
        try{ const k = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight)); const cv = document.createElement('canvas'); cv.width = Math.round(v.videoWidth * k); cv.height = Math.round(v.videoHeight * k);
          cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
          const d = Math.round(v.duration || 0); fin({data: cv.toDataURL('image/jpeg', 0.88), fmt: 'JPEG', w: cv.width, h: cv.height}, d ? Math.floor(d / 60) + ':' + String(d % 60).padStart(2, '0') : ''); }
        catch(e){ fin(null, ''); }
      };
      v.onerror = () => fin(null, '');
      v.src = u;
    });
  }

  async function build(c, say){
    addCss();
    const o = compOf(c), F = facts(c);
    say('Gathering the photos…');
    const PICS = [];                                         // index -> pic
    const ph = async (u, fit) => { const p = await loadPic(u); PICS.push(p ? Object.assign(p, {fit: !!fit}) : null); return PICS.length - 1; };
    let heroU = await urlOf(c, o.m);
    if(!heroU){ try{ heroU = bkPhoto(c) || ''; }catch(e){} }
    const hero = await ph(heroU);
    const hf = []; for(const [u, l] of F.hf) hf.push([await ph(u), l]);
    const angles = []; for(const [k, l] of ANG){ if(!o.a[k]) continue; say('Gathering the photos… ' + l); const u = await urlOf(c, o.a[k]); if(u) angles.push([await ph(u), l]); }
    let vid = null;
    /* 1.2.303: the video file first (its view-only Dropbox link, made now if it has none), then the pasted link */
    let vurl = o.v && o.vl && o.vlr === o.v.r ? o.vl : '';
    if(o.v && !vurl && o.v.p === 'dbx' && window.illu && window.illu.bookingShareFile){ say('Making the video link…'); try{ const r = await window.illu.bookingShareFile(fold(c), first(c), o.v.r); if(r && r.ok && r.url){ vurl = r.url; setLink(c, r.url, o.v.r); } }catch(e){} }
    if(!vurl) vurl = o.vx || '';
    if(o.v || vurl){ say('Reading the video…'); const u = await urlOf(c, o.v); const pv = await poster(u); if(pv.pic) PICS.push(pv.pic); vid = {pic: pv.pic ? PICS.length - 1 : -1, len: pv.len, url: vurl}; }
    const earL = PICS.push(await svgPic(earSvg(F.pl, true))) - 1, earR = PICS.push(await svgPic(earSvg(F.pr, false))) - 1;
    const pimg = (i, cls) => '<div class="' + cls + '" data-pimg="' + i + '"' + (PICS[i] && PICS[i].fit ? '' : '') + '>' + (PICS[i] ? '<img alt="" src="' + PICS[i].data + '">' : '') + '</div>';
    const page2 = angles.length || vid;
    const pages = page2 ? 2 : 1;
    const top = r => '<div class="zctop"><div class="zcbrand">MDI MODEL MANAGEMENT<small>Seoul · South Korea</small></div><div class="zcref">' + r + '</div></div>';
    const cell = v => '<td class="n' + (v ? '' : ' z') + '">' + (v || '–') + '</td>';
    const rows = SPOTS.map((s, i) => [i, s, F.pl[i], F.pr[i]]).filter(r => r[2] || r[3]);
    const pierBox = !F.pknown ? '' : '<div class="zcsec"><div class="zclab">Piercings</div><div class="zcpier"><div class="zcears"><figure>' + pimg(earL, 'zcear') + '<figcaption>Left</figcaption></figure><figure>' + pimg(earR, 'zcear') + '<figcaption>Right</figcaption></figure></div>' +
      (rows.length ? '<table class="zcptab"><thead><tr><th>Spot</th><th class="zcn">Left</th><th class="zcn">Right</th></tr></thead><tbody>' +
        rows.map(r => '<tr><td><i>' + LT[r[0]] + '</i>' + H(r[1]) + '</td>' + cell(r[2]) + cell(r[3]) + '</tr>').join('') +
        '</tbody><tfoot><tr><td>Total</td><td class="zcn">' + F.nl + '</td><td class="zcn">' + F.nr + '</td></tr></tfoot></table>'
        : '<div class="zcpnone">' + (F.nl + F.nr ? 'Left ' + F.nl + ' · Right ' + F.nr + ' (spots not noted)' : 'No piercings') + '</div>') + '</div></div>';
    const D = [['Entry date', F.ind], ['Departure date', F.outd], ['Length of stay', F.stay]].filter(x => x[1]);
    const stayBox = D.length ? '<div class="zcsec"><div class="zclab">Stay in Korea</div><div class="zcdates">' + D.map(x => '<div><span>' + x[0] + '</span><b>' + H(x[1]) + '</b></div>').join('') + '</div></div>' : '';
    const grp = s => '<div class="zcgrp"><h3>' + H(s[0]) + '</h3>' + s[1].map(r => '<div class="zcrow"><i>' + r[0] + '</i><span>' + H(r[1]) + '</span><b>' + H(r[2]) + '<small>' + H(r[3]) + '</small></b></div>').join('') + '</div>';
    const S = F.SEC.filter(s => s[1].length || (s[0] === 'Arm & hand' && F.rings));
    for(const s of S) if(s[0] === 'Arm & hand' && F.rings) s.rg = 1;
    const grp2 = s => grp(s).replace(/<\/div>$/, (s.rg ? '<div class="zcrow zcrg">Ring size · ' + H(F.rings) + '</div>' : '') + '</div>');
    const left = S.filter(s => s[0] === 'Full body'), right = S.filter(s => s[0] !== 'Full body');
    const mdH = S.length ? '<div class="zcsec"><div class="zclab">Measurement detail</div><div class="zcmdg"><div>' + left.map(grp2).join('') + '</div><div>' + right.map(grp2).join('<div class="zcgsp"></div>') + '</div></div></div>' : '';
    const hfH = hf.length ? '<div class="zcsec"><div class="zclab">Hands &amp; feet</div><div class="zchf">' + hf.map(([i, l]) => '<figure>' + pimg(i, 'zcim') + '<figcaption>' + H(l) + '</figcaption></figure>').join('') + '</div></div>' : '';
    const ctry = F.ctry.map(x => x.c + (x.t ? ' (' + x.t + ')' : '')).join(' · ');
    const p1 = '<section class="zcpg">' + top('Model profile') +
      '<div class="zchero">' + pimg(hero, 'zcph') + '<div><h1>' + H(nm(c)) + '</h1>' + (has(c.ag) ? '<div class="zcagy">Mother agency · <b>' + H(c.ag) + '</b></div>' : '') +
      (F.mline.length ? '<div class="zcmline">' + F.mline.map(([k, v]) => '<span><i>' + k + '</i>' + H(v[0]) + '<u>' + v[1] + '</u></span>').join('') + '</div>' : '') +
      '<div class="zcfacts">' + F.F.map(([k, v]) => '<div class="zcf"><span>' + k + '</span><b>' + H(v) + '</b></div>').join('') +
      (ctry ? '<div class="zcf zcw"><span>Countries worked in</span><b>' + H(ctry) + '</b></div>' : '') + '</div></div></div>' +
      (pierBox || stayBox ? '<div class="zcduo' + (pierBox && stayBox ? '' : ' zcone') + '">' + pierBox + stayBox + '</div>' : '') +
      mdH + hfH +
      '<div class="zcfoot"><span>MDI Model Management · mdient.com · +82-2-2068-4431</span><span>1 / ' + pages + '</span></div></section>';
    const p2 = !page2 ? '' : '<section class="zcpg">' + top(H(nm(c)) + '<br>Photos &amp; video') +
      (angles.length ? '<div class="zclab">Profile photos</div><div class="zcgal">' + angles.map(([i, l]) => '<figure>' + pimg(i, 'zcim') + '<figcaption>' + H(l) + '</figcaption></figure>').join('') + '</div>' : '') +
      (vid ? '<div class="zcsec"><div class="zclab">Video</div><div class="zcvid"><div class="zcfr" data-link="v">' + (vid.pic >= 0 ? pimg(vid.pic, 'zcvpi') : '') + '<span class="zcplay"></span>' + (vid.len ? '<span class="zclen">' + vid.len + '</span>' : '') + '</div>' +
        '<div class="zcvt"><h4>Introduction video</h4><p>' + (vid.url ? 'Click the picture to watch it in your browser' : 'Video link to follow') + '</p>' + (vid.url ? '<span class="zcgo" data-link="v">Watch video</span>' : '') + '</div></div></div>' : '') +
      (angles.length ? '<div class="zcnote">All photos are kept at high resolution — zoom in on any of them to see the detail.</div>' : '') +
      '<div class="zcfoot"><span>MDI Model Management · mdient.com</span><span>2 / 2</span></div></section>';
    const box = document.createElement('div'); box.className = 'cmpdoc'; box.innerHTML = p1 + p2;
    document.body.appendChild(box);
    box.querySelectorAll('.zcvpi').forEach(el => { el.style.cssText = 'position:absolute;inset:0'; });
    try{ await document.fonts.load("400 28px CompSerif"); await document.fonts.load("600 10px CompSans"); await document.fonts.load("400 10px CompSans"); await document.fonts.load("500 10px CompSans"); }catch(e){}
    await Promise.all([...box.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
    return {box, PICS, vid, name: nm(c)};
  }

  async function toPdf(B, say){
    const [J, h2c] = await Promise.all([bvLib('mkpdf').then(x => x.jsPDF), bvLib('h2c')]);
    const doc = new J({unit: 'mm', format: 'a4', orientation: 'portrait', compress: true});
    const pgs = [...B.box.querySelectorAll('.zcpg')];
    B.box.classList.add('zcshot', 'zccap');
    for(let n = 0; n < pgs.length; n++){
      say('Making the PDF… page ' + (n + 1) + ' of ' + pgs.length);
      pgs.forEach((p, i) => { p.style.display = i === n ? '' : 'none'; });       // one page at a time, at the top of the screen
      const pg = pgs[n], R = pg.getBoundingClientRect(), k = 210 / R.width;
      const cv = await h2c(pg, {scale: 3, backgroundColor: '#ffffff', logging: false, useCORS: false, scrollX: 0, scrollY: 0, width: R.width, height: R.height, windowWidth: Math.max(window.innerWidth, 1000), windowHeight: Math.max(window.innerHeight, 1300)});
      if(n) doc.addPage('a4', 'portrait');
      doc.addImage(cv.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      /* the photos on top, sharp: cropped to their box like on screen (cover), with the box's rounded corners */
      for(const el of pg.querySelectorAll('[data-pimg]')){
        const p = B.PICS[+el.dataset.pimg]; if(!p) continue;
        const r = el.getBoundingClientRect(); if(!r.width || !r.height) continue;
        const x = (r.left - R.left) * k, y = (r.top - R.top) * k, w = r.width * k, h = r.height * k;
        const contain = el.classList.contains('zcear');
        const s = contain ? Math.min(w / p.w, h / p.h) : Math.max(w / p.w, h / p.h);
        const iw = p.w * s, ih = p.h * s;
        const rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) * k || 0;
        doc.saveGraphicsState();
        if(rad) doc.roundedRect(x, y, w, h, rad, rad, null); else doc.rect(x, y, w, h, null);
        doc.clip(); doc.discardPath();
        doc.addImage(p.data, p.fmt, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih, undefined, 'FAST');
        doc.restoreGraphicsState();
      }
      /* the play button and length go back over the video picture */
      for(const el of pg.querySelectorAll('.zcvid .zcfr')){
        const r = el.getBoundingClientRect(), x = (r.left - R.left) * k, y = (r.top - R.top) * k, w = r.width * k, h = r.height * k;
        if(B.vid && B.vid.pic >= 0){
          doc.setFillColor(255, 255, 255); doc.circle(x + w / 2, y + h / 2, 7, 'F');
          doc.setFillColor(110, 46, 94); doc.triangle(x + w / 2 - 1.8, y + h / 2 - 3, x + w / 2 - 1.8, y + h / 2 + 3, x + w / 2 + 2.8, y + h / 2, 'F');
          if(B.vid.len){ doc.setFillColor(40, 34, 40); doc.roundedRect(x + w - 12.5, y + h - 7, 10.5, 5, 1, 1, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.text(B.vid.len, x + w - 7.25, y + h - 3.6, {align: 'center'}); }
        }
      }
      if(B.vid && B.vid.url) for(const el of pg.querySelectorAll('[data-link="v"]')){
        const r = el.getBoundingClientRect(); doc.link((r.left - R.left) * k, (r.top - R.top) * k, r.width * k, r.height * k, {url: B.vid.url});
      }
    }
    B.box.classList.remove('zcshot', 'zccap'); pgs.forEach(p => { p.style.display = ''; });
    doc.setProperties({title: B.name + ' — Model profile', author: 'MDI Model Management', creator: 'ILLUMENOCTIS'});
    return doc.output('blob');
  }

  /* 1.2.303 (user, 27 Nov 2026: "what if I want to send this completed file with images/videos for them to view? and keep as a file?"
     - "to clients"): every PDF made is also kept in her Dropbox folder (1. BOOK › Comp sheet; a new version never replaces an older
     one), and "Copy client link" gives a view-only link to that one PDF - for an email instead of a big attachment. */
  const PDFREL = new Map();          // card id -> path of the last kept PDF inside her folder
  async function keepPdf(c, fname, blob){
    if(!(window.illu && window.illu.bookingPut)) return;
    let r = null; try{ r = await window.illu.bookingPut('dbx', fold(c), first(c), '1. BOOK', fname, WEB ? blob : await blob.arrayBuffer(), 'Comp sheet'); }catch(e){ r = {ok: false, why: String(e && e.message || e)}; }
    const m = bvSide.querySelector('.cmpkeep'); if(!m) return;
    if(r && r.ok){ const rel = (r.sub || '1. BOOK/Comp sheet') + '/' + r.name; PDFREL.set(c.id, rel);
      m.innerHTML = '✓ Kept in her Dropbox folder › ' + H(rel.replace(/\//g, ' › ')) + ' <button type="button" class="cmpbtn o" data-cmpcl>Copy client link</button>'; }
    else m.textContent = 'The PDF could not be kept in her Dropbox folder' + (r && r.why ? ' (' + r.why + ')' : r && r.need === 'connect' ? ' (Dropbox is not connected)' : '') + '.';
  }
  async function clientLink(c){
    const rel = PDFREL.get(c.id), m = bvSide.querySelector('.cmpkeep'); if(!rel || !m) return;
    let r = null; try{ r = await window.illu.bookingShareFile(fold(c), first(c), rel); }catch(e){ r = {ok: false, why: String(e && e.message || e)}; }
    if(!(r && r.ok && r.url)){ m.insertAdjacentHTML('beforeend', '<span class="cmpwarn"> The link could not be made' + (r && r.why ? ': ' + H(r.why) : '') + '.</span>'); return; }
    let copied = false; try{ await navigator.clipboard.writeText(r.url); copied = true; }catch(e){}
    m.innerHTML = '✓ Kept in her Dropbox folder › ' + H(rel.replace(/\//g, ' › ')) + '<br>' + (copied ? 'Client link copied — paste it into your email. ' : 'Client link: ') +
      '<input class="cmpin" readonly value="' + H(r.url) + '" aria-label="Client link" onclick="this.select()"><span class="cmphint">Anyone with this link can open this PDF only — nothing else in Dropbox.</span>';
  }
  let BUSY = false;
  async function run(c, what, btn){
    if(BUSY) return; BUSY = true; if(btn) btn.classList.add('busy');
    let B = null;
    try{
      B = await build(c, msg);
      if(what === 'pv'){ preview(B); B = null; msg(''); return; }
      const blob = await toPdf(B, msg);
      const fname = nm(c) + ' - Model profile.pdf';
      if(typeof DOWN !== 'undefined' && DOWN) await DOWN.save({filename: fname, data: blob});
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a); a.click(); a.remove(); }
      msg('PDF ready — ' + fname + ' (' + (blob.size / 1048576).toFixed(1) + ' MB)');
      window.__illuCompLast = blob;
      keepPdf(c, fname, blob);
    }catch(e){ msg('The PDF could not be made' + (e && e.message ? ' — ' + e.message : '')); }
    finally{ if(B && B.box) B.box.remove(); BUSY = false; if(btn) btn.classList.remove('busy'); }
  }
  function preview(B){
    const d = sheet('Preview — ' + B.name, '', null);
    d.classList.add('cmppv');
    const sb = d.querySelector('.cmpsb');
    B.box.classList.remove('cmpdoc'); B.box.classList.add('cmpdoc', 'cmpshow');
    sb.appendChild(B.box);
    const fit = () => { const w = sb.clientWidth - 8, s = Math.min(1, w / B.box.querySelector('.zcpg').offsetWidth); B.box.style.setProperty('--s', s); };
    fit(); window.addEventListener('resize', fit);
    const obs = new MutationObserver(() => { if(!document.body.contains(d)){ window.removeEventListener('resize', fit); obs.disconnect(); } });
    obs.observe(document.body, {childList: true});
  }
  /* html2canvas from the program's own copy */
  try{ if(typeof BVLIBS !== 'undefined' && !BVLIBS.h2c) BVLIBS.h2c = [['html2canvas@1.4.1/dist/html2canvas.min.js'], 'html2canvas']; }catch(e){}
  window.__illuCompBuild = async (c, what) => { const B = await build(c, () => {}); if(what === 'pdf'){ try{ return await toPdf(B, () => {}); } finally{ B.box.remove(); } } return B; };

  const st = document.createElement('style');
  st.textContent = `
.cmpp{display:flex;flex-direction:column;gap:12px;padding-bottom:10px}
.cmplab{display:flex;align-items:center;gap:8px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--acc,#6b2a5e);margin-top:4px}
.cmplab::after{content:'';flex:1;height:1px;background:var(--line,#e5dfe9)}
.cmplab em{font-style:normal;font-weight:600;letter-spacing:0;text-transform:none;color:var(--mut,#8a8291)}
.cmprow{display:grid;grid-template-columns:96px 1fr;gap:14px;align-items:start}
.cmpslot{position:relative;border-radius:10px;border:1.5px dashed var(--line,#e5dfe9);background:var(--surf2,#f6f3f8);display:grid;place-items:center;cursor:pointer;color:var(--mut,#8a8291);font-size:11.5px;font-weight:600;text-align:center;overflow:hidden;aspect-ratio:3/4;padding:6px;transition:border-color .15s}
.cmpslot:hover,.cmpslot:focus-visible{border-color:var(--acc,#6b2a5e);outline:none}
.cmpslot.has{border-style:solid;border-color:transparent;padding:0}
.cmpslot .cmpph{position:absolute;inset:0;background:#3a3238 center/cover no-repeat}
.cmpslot .cmpph video{width:100%;height:100%;object-fit:cover;display:block}
.cmpslot .cmpph.miss{display:grid;place-items:center;background:var(--surf2,#f6f3f8);color:var(--mut,#8a8291);font-size:10px;padding:6px;word-break:break-all}
.cmpslot .cmpcap{position:absolute;left:0;right:0;bottom:0;padding:14px 6px 5px;background:linear-gradient(transparent,rgba(20,12,24,.6));color:#fff;font-size:10px;letter-spacing:.04em}
.cmpplus{font-size:20px;line-height:1;display:block;margin-bottom:4px;color:var(--faint,#b3abb8);font-style:normal}
.cmpx{position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;background:rgba(20,12,24,.6);color:#fff;font-size:12px;display:grid;place-items:center;border:0;cursor:pointer;z-index:2}
.cmpang{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.cmpang .cmpslot{font-size:10px;padding:3px}.cmpang .cmpplus{font-size:16px;margin-bottom:2px}
.bvsidewide .cmpang,.cmpang{container-type:inline-size}
@media (max-width:760px){.cmpang{grid-template-columns:repeat(3,1fr)}.cmpx{width:28px;height:28px}}
.cmpvid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}
@media (max-width:640px){.cmpvid{grid-template-columns:1fr}}
.cmpvf,.cmpvl{min-width:0}
.cmpvlab{display:block;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--mut,#8a8291)}
.cmpvl .cmphint{margin:2px 0 6px}
.cmpvlrow{display:flex;gap:6px;align-items:center}.cmpvlrow .cmpin{margin:0;min-width:0;flex:1}
.cmpvid .cmpslot{aspect-ratio:16/9;max-width:240px}
.cmpvid .cmpslot.has .cmpph::after{content:'';position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(255,255,255,.92)}
.cmpvid .cmpslot.has .cmpph::before{content:'';position:absolute;left:50%;top:50%;margin:-7px 0 0 -3px;border-left:11px solid var(--acc,#6b2a5e);border-top:7px solid transparent;border-bottom:7px solid transparent;z-index:1}
.cmphint{font-size:12px;color:var(--mut,#8a8291);line-height:1.5;margin:6px 0 0}
.cmphint.cmpok{color:#2E8A57}
.cmplk{border:0;background:none;padding:0;font:inherit;font-weight:600;color:var(--acc,#6b2a5e);cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.cmpbtns{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
.cmpbtn{font:600 13px var(--sans,inherit);border-radius:999px;padding:9px 16px;border:1.5px solid var(--acc,#6b2a5e);background:var(--acc,#6b2a5e);color:#fff;cursor:pointer;min-height:38px}
.cmpbtn.o{background:transparent;color:var(--acc,#6b2a5e)}
.cmpbtn.busy{opacity:.6;pointer-events:none}
.cmpmsg{font-size:12px;color:var(--ink2,#494154);margin:0;min-height:1em}
.cmpnote{font-size:11px;color:var(--faint,#9c93a9);margin:0}
.cmpdim{position:fixed;inset:0;background:rgba(20,12,24,.45);display:flex;align-items:flex-end;justify-content:center;z-index:100000;padding:16px}
@media (min-width:640px){.cmpdim{align-items:center}}
.cmpsheet{background:var(--surf,#fff);color:var(--ink,#1b1724);border-radius:16px;width:100%;max-width:600px;max-height:min(84vh,720px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(20,10,30,.3)}
.cmppv .cmpsheet{max-width:860px;max-height:92vh}
.cmpsh{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--line,#e5dfe9)}
.cmpsh b{font-size:15px}.cmpcx{border:0;background:transparent;font-size:22px;color:var(--mut,#8a8291);cursor:pointer;min-width:36px;min-height:36px}
.cmpsrc{display:flex;gap:6px;padding:10px 16px 0;flex-wrap:wrap}
.cmpsrc button{font:600 12.5px var(--sans,inherit);border:1.5px solid var(--line,#e5dfe9);background:transparent;color:var(--mut,#8a8291);border-radius:999px;padding:6px 12px;cursor:pointer;min-height:34px}
.cmpsrc button.on{border-color:var(--acc,#6b2a5e);color:var(--acc,#6b2a5e);background:color-mix(in srgb,var(--acc,#6b2a5e) 8%,transparent)}
.cmpsb{overflow:auto;padding:12px 16px 16px}
.cmpwhere{font-size:12px;font-weight:700;margin:10px 0 2px}
.cmpfold{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mut,#8a8291);margin:6px 0 8px}
.cmppick{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px;margin-bottom:12px}
.cmppick button{aspect-ratio:3/4;border-radius:8px;border:2px solid transparent;background:#3a3238;cursor:pointer;position:relative;padding:0;overflow:hidden}
.cmppick.v button{aspect-ratio:16/9}
.cmppick button img,.cmppick button video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cmppick button:hover,.cmppick button:focus-visible{border-color:var(--acc,#6b2a5e);outline:none}
.cmppick button span{position:absolute;left:0;right:0;bottom:0;padding:10px 4px 3px;font-size:9px;color:#fff;font-weight:600;background:linear-gradient(transparent,rgba(0,0,0,.6));text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cmpup{border:1.5px dashed var(--line,#e5dfe9);border-radius:12px;padding:22px 16px;text-align:center;color:var(--mut,#8a8291);font-size:13px;line-height:1.6;margin-top:8px}
.cmpup.over{border-color:var(--acc,#6b2a5e)}
.cmpup b{color:var(--ink,#1b1724)}.cmpup .cmpbtn{margin-top:10px}.cmpup small{display:block;margin-top:8px;font-size:11.5px}
.cmpup p{margin:0 0 10px}.cmpwarn{color:#8A3A2C}
.cmptick{display:inline-flex;gap:6px;align-items:center;margin-top:8px;font-size:12.5px;color:var(--ink,#1b1724);cursor:pointer}
.cmpin{width:100%;font:inherit;font-size:14px;padding:9px 12px;border:1.5px solid var(--line,#e5dfe9);border-radius:10px;background:var(--surf,#fff);color:inherit;margin-bottom:6px}
.cmpdoc.cmpshow{position:static;left:auto;z-index:auto;display:flex;flex-direction:column;align-items:center;gap:12px;zoom:var(--s,1)}
.cmpdoc.cmpshow .zcpg{box-shadow:0 2px 12px rgba(20,10,30,.18)}
`;
  document.head.appendChild(st);
})();
