/* ================= Photos the cards could not show =================
   A card shows no photograph when the scan never wrote down a photo link for that model,
   or when the link it wrote down no longer opens (the agency renamed or moved the file).
   For those cards - only the ones on screen - the program reads the model's own page on
   the agency site (no browser, no tokens), takes the photograph it finds there, shows it,
   and writes the new link down for everyone (docs plink/<id>).
   A model nothing can be found for is written down once (docs pfail/<id>) and not tried
   again for a week; Settings-free, no retry loops.
   Backup copy: a model someone has put a lamp on gets a small copy of the photograph saved
   in the program's own store (the same "Photo saved" copy as dropping a picture on the card),
   so the card still has a face if the agency takes the picture down. */
(function(){
  'use strict';
  if(!window.illu || !window.illu.findPhoto) return;
  const PLINK = new Map(), PFAIL = new Map(), BROKEN = new Set(), TRIED = new Set(), WAIT = new Map();
  const WEEK = 7 * 864e5;
  const SHARED = new Set(), PLINKSINGLE = new Set();
  const SWEPT = new Map();
  /* 1.2.112: a photo picked by hand from the model's slideshow as her card photo (docs pmain/<id> {k, u, by, at}).
     It wins over every photo the crawler found; a photo saved onto the card (dropped / pasted / chosen file) still wins over it. */
  const PMAIN = new Map();
  /* shown through the program's own image loader (it sends the agency page as the referrer, like the slideshow does) */
  const pmSrc = pm => pm && pm.u ? (window.illu && window.illu.modelPhotos ? 'illuimg://p/' + encodeURIComponent(pm.u) + '?r=' + encodeURIComponent(pm.r || '') + '&w=1000' : pm.u) : '';
  let ready = false;
  const idOf = k => 'p' + hkey(k).slice(1);
  /* 1.2.138 (user, 11 Nov 2026: photos missing on the booking cards): some agencies (Q Model Management) give
     photo links that stop working after a few days (signed links: X-Amz-Expires, Expires=...). Such a link is
     not trusted once it has run out, and a photo found through one is kept as the program's own saved copy. */
  function expiryOf(u){
    const s = String(u || ''); let q; try{ q = new URL(s).searchParams; }catch(e){ return 0; }
    const ad = q.get('X-Amz-Date'), ae = q.get('X-Amz-Expires');
    if(ad && ae){ const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(ad); if(m) return Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]) + (+ae) * 1000; }
    const ex = q.get('Expires') || q.get('expires'); if(ex && /^\d{9,11}$/.test(ex)) return +ex * 1000;
    const se = q.get('se'); if(se && q.get('sig')){ const t = Date.parse(se); if(t) return t; }
    return 0;
  }
  const expiring = u => expiryOf(u) > 0;
  const expired = u => { const t = expiryOf(u); return t > 0 && t < Date.now() + 3600e3; };
  window.__illuPhotoExpired = expired;

  async function load(){
    for(let i = 0; i < 60 && (typeof DB === 'undefined' || !DB); i++) await new Promise(r => setTimeout(r, 500));
    if(typeof DB === 'undefined' || !DB) return;
    try{
      const [a, b, c, d] = await Promise.all([DB.collection('plink').limit(10000).get(), DB.collection('pfail').limit(10000).get(),
        DB.collection('plinkb').limit(5000).get(), DB.collection('psweep').limit(5000).get()]);
      /* board sweeps first, single finds on top (they are newer and aimed at one model) */
      for(const x0 of (c.docs || c || [])){
        const x = docOf(x0); if(!x || !x.e) continue;
        const uses = new Map(); for(const u of Object.values(x.e)) uses.set(u, (uses.get(u) || 0) + 1);
        for(const [k, u] of Object.entries(x.e)) if(u && !expired(u) && uses.get(u) < 3 && !/dummy|no[-_ ]?image|placeholder|cover_error|default/i.test(u)) PLINK.set(k, u);
      }
      for(const x0 of (d.docs || d || [])){ const x = docOf(x0); if(x && x.b) SWEPT.set(x.b, x); }
      for(const d of (a.docs || a || [])){ const x = docOf(d); if(x && x.k && x.u && !expired(x.u)){ PLINK.set(x.k, x.u); PLINKSINGLE.add(x.k); } }
      for(const d of (b.docs || b || [])){ const x = docOf(d); if(x && x.k) PFAIL.set(x.k, x); }
    }catch(e){}
    try{ const m = await DB.collection('pmain').limit(10000).get(); for(const d of (m.docs || m || [])){ const x = docOf(d); if(x && x.k && x.u) PMAIN.set(x.k, {u: x.u, r: x.r || ''}); } }catch(e){}
    /* someone else picks a card photo: it shows here too */
    try{ DB.collection('pmain').onSnapshot(sn => { const seen = new Map(); for(const d of (sn.docs || [])){ const x = docOf(d); if(x && x.k && x.u) seen.set(x.k, {u: x.u, r: x.r || ''}); }
      const ch = new Set(); for(const [k, v] of seen) if((PMAIN.get(k) || {}).u !== v.u){ PMAIN.set(k, v); ch.add(k); } for(const k of [...PMAIN.keys()]) if(!seen.has(k)){ PMAIN.delete(k); ch.add(k); }
      ch.forEach(k => paintCell(k, true)); }, () => {}); }catch(e){}
    ready = true;
    document.querySelectorAll('.litpic[data-pic]').forEach(c => { if(!c.querySelector('img') && PLINK.has(c.dataset.pic)) paintCell(c.dataset.pic); });
    scan();
  }

  /* the cards read their photo through litFacts: a link found here wins over a missing
     or broken one */
  const litFacts0 = window.litFacts;
  window.litFacts = litFacts = function(m){
    const f = litFacts0(m);
    const pm = PMAIN.get(m.key);
    /* 1.2.140: on the phone, a card photo that is a file on the PC (bk.<id>, not yet uploaded by the PC) is shown from her
       Dropbox folder instead (1. BOOK), when this phone is signed in to Dropbox; otherwise the agency's photo */
    if(pm && window.illu && window.illu.web && /^\/_blob\/bk\./.test(pm.u)){ const cv = window.__illuMatCover ? window.__illuMatCover(m.key) : ''; if(cv){ f.photo = cv; return f; } return f; }
    if(pm && !expired(pm.u)){ f.photo = pmSrc(pm); return f; }
    if(f.photo && expired(f.photo)) f.photo = '';
    const u = PLINK.get(m.key);
    if(u && (!f.photo || BROKEN.has(f.photo))) f.photo = u;
    return f;
  };

  function hrefOf(key){
    try{ agIndex(); const h = AGOF && AGOF.get(key); if(h) return h[2]; }catch(e){}
    return /^https?:/i.test(key) ? key : '';
  }
  function nmOf(cell){
    const row = cell.closest('.litrow');
    const a = row && row.querySelector('.rnm');
    return a ? a.textContent.trim() : '';
  }
  function paintCell(key, force){
    document.querySelectorAll('.litpic[data-pic="' + CSS.escape(key) + '"]').forEach(cell => {
      if(cell.classList.contains('has')) return;
      if(force && cell.closest('.d2card')){ const im = cell.querySelector(':scope > img'), u2 = pmSrc(PMAIN.get(key)) || (litFacts0({key}) || {}).photo || PLINK.get(key) || ''; if(im && PMAIN.has(key) && !im.dataset.orig) im.dataset.orig = im.getAttribute('src') || '';
        if(im && !PMAIN.has(key) && im.dataset.orig){ im.src = im.dataset.orig; delete im.dataset.orig; return; }   /* back to the photo the card had */
        if(u2){ if(im) im.src = u2; else cell.insertAdjacentHTML('afterbegin', '<img class="agimg" alt="" referrerpolicy="no-referrer" decoding="async" src="' + String(u2).replace(/"/g, '&quot;') + '">'); } return; }   // the open card keeps its slideshow; only its picture changes
      let u = pmSrc(PMAIN.get(key)) || PLINK.get(key); if(!u && force){ try{ u = (litFacts0({key: key, g: '?'}) || {}).photo || ''; }catch(e){} }
      try{ cell.outerHTML = picCell(key, nmOf(cell), u || ''); }catch(e){}
    });
  }
  function note(key, text){
    document.querySelectorAll('.litpic[data-pic="' + CSS.escape(key) + '"]').forEach(cell => {
      if(cell.querySelector('img')) return;
      let n = cell.querySelector('.illupf');
      if(!n){ cell.insertAdjacentHTML('beforeend', '<span class="illupf"></span>'); n = cell.querySelector('.illupf'); }
      n.textContent = text;
      cell.classList.toggle('illuwait', /Finding/.test(text));
    });
  }
  const lit = key => { try{ return !!lampOf(key); }catch(e){ return false; } };

  async function find(key){
    if(!ready || !key || TRIED.has(key) || WAIT.has(key) || BPEND.has(key)) return;
    if(PICS.get(key)) return;
    const f0 = PFAIL.get(key);
    if(f0 && Date.now() - (+new Date(f0.at) || 0) < WEEK){ note(key, 'No photo on the agency site'); return; }
    const page = hrefOf(key);
    if(!page){ TRIED.add(key); return; }
    WAIT.set(key, 1); note(key, 'Finding the photo…');
    let r;
    try{ r = await illu.findPhoto(page); }catch(e){ r = {error: String(e && e.message || e)}; }
    WAIT.delete(key); TRIED.add(key);
    /* a single-page site answers every model's link with the same page, so the same picture
       comes back for different models: that picture is nobody's, and none of them is kept */
    const hostOf = u => { try{ return new URL(u).host.replace(/^www\./, ''); }catch(e){ return ''; } };
    if(r && r.url){
      let twin = null; const hk = hostOf(key);
      for(const [k2, u2] of PLINK){ if(u2 === r.url && k2 !== key && hostOf(k2) === hk){ twin = [k2, u2]; break; } }   // no copy of the whole list
      if(twin){
        SHARED.add(r.url);
        if(PLINKSINGLE.has(twin[0])){ PLINK.delete(twin[0]); PLINKSINGLE.delete(twin[0]); try{ await DB.doc('plink/' + idOf(twin[0])).delete(); }catch(e){} paintCell(twin[0]); }
        r = {error: 'the site shows the same picture for every model'};
      }else if(SHARED.has(r.url)) r = {error: 'the site shows the same picture for every model'};
    }
    if(r && r.url){
      PLINK.set(key, r.url); PLINKSINGLE.add(key);
      try{ await DB.doc('plink/' + idOf(key)).set({k: key, u: r.url, how: r.how || '', page: page, at: new Date().toISOString(), by: ME || ''}); }catch(e){}
      if(PFAIL.has(key)){ PFAIL.delete(key); try{ await DB.doc('pfail/' + idOf(key)).delete(); }catch(e){} }
      paintCell(key);
      if(lit(key) || expiring(r.url) || BKKEYS().has(key)) backup(key);
    }else{
      const err = (r && r.error) || 'unknown';
      /* the network failed, not the site: not written down for everyone, so it is tried again */
      if(window.illuTransient && window.illuTransient(err)){ note(key, 'No photo on the agency site'); return; }
      const rec = {k: key, page: page, error: err, at: new Date().toISOString(), by: ME || ''};
      PFAIL.set(key, rec);
      try{ await DB.doc('pfail/' + idOf(key)).set(rec); }catch(e){}
      note(key, 'No photo on the agency site');
    }
  }

  /* backup copies, one at a time */
  const BQ = [], BDONE = new Set(); let bBusy = false;
  function backup(key){
    if(BDONE.has(key) || PICS.get(key) || BQ.includes(key)) return;
    BQ.push(key); bPump();
  }
  async function bPump(){
    if(bBusy) return; bBusy = true;
    while(BQ.length){
      const key = BQ.shift(); BDONE.add(key);
      if(PICS.get(key)) continue;
      let url = PLINK.get(key);
      if(!url){ try{ const f = litFacts({key: key, g: '?'}); url = f.photo; }catch(e){} }
      if(!url || BROKEN.has(url) || expired(url)){ if(url && expired(url) && !TRIED.has(key)){ BDONE.delete(key); find(key); } continue; }
      try{
        const r = await illu.photoThumb(url, hrefOf(key));
        if(r && r.jpeg){
          /* stored quietly: no page redraw, only this model's cards change */
          if(!ASSETS){ try{ ASSETS = await use('assets'); }catch(e){} }
          if(!ASSETS) break;
          const res = await ASSETS.upload(new File([r.jpeg], 'photo.jpg', {type: 'image/jpeg'}));
          if(res && res.id && !PICS.get(key)){
            PICS.set(key, res.id);
            await savePicShard(key);
            try{ window.__illuPipe && window.__illuPipe.render(); }catch(e){}
            try{ window.__illuTodayRender && window.__illuTodayRender(); }catch(e){}
            try{ window.__illuVoteChanged && window.__illuVoteChanged(); }catch(e){}
            document.querySelectorAll('.litpic[data-pic="' + CSS.escape(key) + '"]').forEach(cell => {
              try{ cell.outerHTML = picCell(key, nmOf(cell), ''); }catch(e){}
            });
          }
        }
      }catch(e){}
    }
    bBusy = false;
  }
  /* lit models with no saved copy yet get one, gently, after the page settles */
  function backupLit(){
    try{
      const keys = new Set();
      if(typeof MARKS !== 'undefined') for(const [k, v] of MARKS) if(v) keys.add(k);
      if(typeof PEERMARKS !== 'undefined') for(const [, mk] of PEERMARKS) if(mk && mk.e) for(const [k, v] of mk.e) if(v) keys.add(k);
      for(const k of keys) if(!PICS.get(k)) backup(k);
    }catch(e){}
  }

  /* a link that does not open: note it and look again */
  document.addEventListener('error', e => {
    const img = e.target;
    if(!img || !img.classList || !img.classList.contains('agimg')) return;
    const cell = img.closest('.litpic[data-pic]');
    if(!cell) return;
    const src = img.dataset.orig || img.getAttribute('src');
    BROKEN.add(src);
    cell.classList.add('imgfail');
    const key = cell.dataset.pic;
    if(PLINK.get(key) === src) return;   // the found one failed too
    if(PLINK.has(key)){ paintCell(key); return; }            // the board sweep already has a newer one
    find(key);
  }, true);

  /* empty cards on screen */
  const io = new IntersectionObserver(ents => {
    for(const en of ents){
      if(!en.isIntersecting) continue;
      io.unobserve(en.target);
      const cell = en.target;
      if(cell.querySelector('img')) continue;
      find(cell.dataset.pic);
    }
  }, {rootMargin: '300px'});
  let scanT = 0;
  function scan(){
    scanT = 0;
    if(!ready) return;
    document.querySelectorAll('.litpic[data-pic]:not([data-pfo])').forEach(c => {
      c.setAttribute('data-pfo', '1');
      if(!c.querySelector('img')) io.observe(c);
    });
  }
  new MutationObserver(() => { if(!scanT) scanT = setTimeout(scan, 250); })
    .observe(document.body, {childList: true, subtree: true});

  const css = document.createElement('style');
  css.textContent = '.litpic .illupf{position:absolute;left:0;right:0;bottom:14px;text-align:center;font-size:10.5px;letter-spacing:.04em;opacity:.7;padding:0 10px;pointer-events:none}' +
    '@keyframes illushim{0%{background-position:-180% 0}100%{background-position:280% 0}}' +
    '.litpic:has(.agimg):not(.gotimg):not(.imgfail),.litpic.illuwait{background-image:linear-gradient(100deg,transparent 30%,color-mix(in srgb,var(--surf,#fff) 70%,transparent) 50%,transparent 70%)!important;background-size:60% 100%!important;background-repeat:no-repeat!important;background-position:50% 0!important}' +
    '.litpic:has(.agimg):not(.gotimg):not(.imgfail) .picfall,.litpic.illuwait .picfall{visibility:hidden}' +
    '.litpic .agimg{transition:opacity .25s ease!important}' +
    '@media (prefers-reduced-motion:reduce){.litpic{animation:none!important}}';
  document.head.appendChild(css);

  /* ---- board sweep: every board page read once a week, a picture for every model on it.
     Runs on the owner's computer, one board at a time, a few seconds apart. ---- */
  const isOwner = () => { try{ return isAdmin(); }catch(e){ return false; } };
  let sweeping = false, stopSweep = false;
  function boardList(){
    const out = [];
    for(const a of AG) for(const b of (a.boards || [])){
      if(!b.u || !b.m || !b.m.length) continue;
      const hrefs = b.m.map(m => m[1].charAt(0) === '|' ? m[1].slice(1) : b.p + m[1]).filter(h => /^https?:/i.test(h));
      if(!hrefs.length) continue;
      let missing = 0;
      for(const h of hrefs){ const k = normKey(h); if(PLINK.has(k) || PICS.get(k)) continue; let f = null; try{ f = litFacts0({key: k, g: '?'}); }catch(e){} if(!f || !f.photo) missing++; }
      const pairs = b.m.map(m => [m[1].charAt(0) === '|' ? m[1].slice(1) : b.p + m[1], m[0] || '']).filter(x => /^https?:/i.test(x[0]));
      out.push({id: 'b' + hkey(b.u).slice(1), u: b.u, ag: a.name, hrefs, pairs, missing});
    }
    return out;
  }
  /* one board page read: every model on it gets its picture, saved for everyone */
  const BPEND = new Set(), BREAD = new Map();
  function readBoard(x, now){
    if(BREAD.has(x.id)) return BREAD.get(x.id);
    const keys = x.hrefs.map(normKey);
    keys.forEach(k => BPEND.add(k));
    const job = (async () => {
      let r;
      try{ r = await illu.boardPhotos(x.u, x.pairs || x.hrefs, now); }catch(e){ r = {error: String(e && e.message || e)}; }
      const e = {};
      if(r && r.photos) for(const [h, u] of Object.entries(r.photos)) if(u) e[normKey(h)] = u;
      const n = Object.keys(e).length;
      const rec = {b: x.id, u: x.u, ag: x.ag, at: new Date().toISOString(), models: x.hrefs.length, got: n,
                   error: (r && r.error) || (n ? '' : (r && r.links ? 'no pictures beside the model links' : 'no model links on the page'))};
      const passing = !n && rec.error && window.illuTransient && window.illuTransient(rec.error);   // offline / no answer: read again next sweep
      if(!passing){ SWEPT.set(x.id, rec);
        try{ await DB.doc('psweep/' + x.id).set(rec); }catch(err){} }
      if(n){
        try{ await DB.doc('plinkb/' + x.id).set({u: x.u, at: rec.at, e}); }catch(err){}
        for(const [k, u] of Object.entries(e)){
          const had = PLINK.get(k); PLINK.set(k, u);
          if(had !== u) document.querySelectorAll('.litpic[data-pic="' + CSS.escape(k) + '"]').forEach(c => { if(!c.classList.contains('has') && !c.classList.contains('gotimg')) paintCell(k); });
        }
      }
      keys.forEach(k => BPEND.delete(k));
      /* the few the board had no picture for: try their own pages, if they are on screen */
      for(const k of keys) if(!e[k]) document.querySelectorAll('.litpic[data-pic="' + CSS.escape(k) + '"]').forEach(c => { if(!c.querySelector('img')) find(k); });
      return n;
    })().finally(() => BREAD.delete(x.id));
    BREAD.set(x.id, job);
    return job;
  }
  /* an agency opened on screen: its boards are read now, ahead of the weekly sweep */
  function boardNow(a){
    if(!a || !window.illu.boardPhotos) return;
    const t = Date.now();
    for(const b of (a.boards || [])){
      if(!b.u || !b.m || !b.m.length) continue;
      const id = 'b' + hkey(b.u).slice(1), s0 = SWEPT.get(id);
      if(s0 && t - (+new Date(s0.at) || 0) < WEEK) continue;
      const hrefs = b.m.map(m => m[1].charAt(0) === '|' ? m[1].slice(1) : b.p + m[1]).filter(h => /^https?:/i.test(h));
      const missing = hrefs.filter(h => { const k = normKey(h); if(PLINK.has(k) || PICS.get(k)) return false; let f = null; try{ f = litFacts0({key: k, g: '?'}); }catch(e){} return !f || !f.photo; }).length;
      if(!missing) continue;
      const pairs = b.m.map(m => [m[1].charAt(0) === '|' ? m[1].slice(1) : b.p + m[1], m[0] || '']).filter(x => /^https?:/i.test(x[0]));
      readBoard({id, u: b.u, ag: a.name, hrefs, pairs}, true);
    }
  }
  async function sweep(){
    if(sweeping || !isOwner() || !window.illu.boardPhotos) return;
    sweeping = true;
    try{
      const now = Date.now();
      const due = boardList().filter(x => { const s0 = SWEPT.get(x.id); return !s0 || now - (+new Date(s0.at) || 0) > WEEK; })
        .sort((p, q) => q.missing - p.missing);
      for(const x of due){
        if(!isOwner() || stopSweep) break;
        await readBoard(x, false);
        await new Promise(res => setTimeout(res, 4000));
      }
    }finally{ sweeping = false; }
  }

  /* every agency photo goes through the program's small-picture cache: the first view fetches
     and shrinks it once, every later view opens it straight from this computer */
  if(window.illu && typeof picCell === 'function'){
    const picCell0 = picCell;
    window.picCell = picCell = function(key, nm, src){
      const html = picCell0(key, nm, src);
      if(!src || !/^https?:/i.test(src)) return html;
      const ref = hrefOf(key);
      const via = 'illuimg://p/' + encodeURIComponent(src) + (ref ? '?r=' + encodeURIComponent(ref) : '');
      return html.replace('<img class="agimg" src="' + esc(src) + '"', '<img class="agimg" data-orig="' + esc(src) + '" fetchpriority="high" src="' + esc(via) + '"');
    };
  }
  /* a check-up note every minute while pictures are on screen (docs diag/<id>): what the photo
     cache did and what the cards show, so a picture problem can be looked at from anywhere */
  /* (every 10 minutes, and only when the window is in front - it was every minute, all day) */
  if(window.illu && window.illu.imgStat){
    setInterval(async () => {
      if(document.hidden) return;
      try{
        const cells = [...document.querySelectorAll('.litpic[data-pic]')].filter(c => c.offsetParent);
        if(!cells.length) return;
        const imgs = cells.map(c => c.querySelector('img.agimg')).filter(Boolean);
        const st = await window.illu.imgStat();
        const dom = {cells: cells.length, withImg: imgs.length, shown: cells.filter(c => c.classList.contains('gotimg')).length,
          failed: cells.filter(c => c.classList.contains('imgfail')).length,
          complete: imgs.filter(i => i.complete && i.naturalWidth > 0).length, broken: imgs.filter(i => i.complete && !i.naturalWidth).length,
          waiting: imgs.filter(i => !i.complete).length, lazy: imgs.filter(i => i.loading === 'lazy').length,
          sample: imgs.slice(0, 3).map(i => String(i.getAttribute('src') || '').slice(0, 220))};
        const id = (typeof ME !== 'undefined' && ME ? String(ME).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) : 'anon') || 'anon';
        await DB.doc('diag/' + id).set({at: new Date().toISOString(), view: typeof VIEW !== 'undefined' ? VIEW : '', dom, cache: st});
      }catch(e){}
    }, 600000);
  }
  /* pick a photo as the card photo / go back to the one the crawler found */
  /* a photo only this computer can open (one of the booking folder's files, /_blob/bk.…) or one whose link runs
     out is saved as the program's own copy first, so every computer and phone shows the same card photo */
  async function stash(url, page){
    try{
      if(!ASSETS){ try{ ASSETS = await use('assets'); }catch(e){} }
      if(!ASSETS) return '';
      let blob = null;
      if(/^\/_blob\/bk\./.test(url)){ const r = await fetch(url); if(r.ok) blob = await r.blob(); }
      else if(/^https?:/i.test(url) && illu.photoThumb){ const r = await illu.photoThumb(url, page || ''); if(r && r.jpeg) blob = new Blob([r.jpeg], {type: 'image/jpeg'}); }
      if(!blob || !blob.size || !/^image\//i.test(blob.type || 'image/jpeg')) return '';
      const res = await ASSETS.upload(new File([blob], 'photo.' + ((blob.type || '').split('/')[1] || 'jpg').replace('jpeg', 'jpg'), {type: blob.type || 'image/jpeg'}));
      return res && res.id ? '/_blob/' + res.id : '';
    }catch(e){ return ''; }
  }
  const needsStash = u => /^\/_blob\/bk\./.test(String(u || '')) || expiring(u);
  async function setMain(key, url, page){
    if(!key || !url) return false;
    if(needsStash(url)){ const kept = await stash(url, page); if(kept) url = kept; }
    PMAIN.set(key, {u: url, r: page || ''}); paintCell(key, true);
    try{ await DB.doc('pmain/' + idOf(key)).set({k: key, u: url, r: page || '', by: ME || '', at: new Date().toISOString()}); }catch(e){ console.error('pmain', e); return false; }
    return true;
  }
  async function clearMain(key){
    if(!PMAIN.has(key)) return;
    PMAIN.delete(key); paintCell(key, true);
    try{ await DB.doc('pmain/' + idOf(key)).delete(); }catch(e){ console.error('pmain', e); }
  }
  window.__illuPhoto = {PMAIN, setMain, clearMain, PLINK, PFAIL, SWEPT, find, backup, sweep, boardList, boardNow, readBoard, stop: () => { stopSweep = true; }};
  /* the booking cards' models (they need a face on every computer and phone) */
  function BKKEYS(){ const out = new Set(); try{ if(typeof BOOK !== 'undefined') for(const c of BOOK.values()) if(c && c.k && !c.ph) out.add(c.k); }catch(e){} return out; }
  async function repairBooked(){
    /* earlier card photos only this computer could open, or with links that run out: saved once as the program's copy */
    for(const [k, pm] of [...PMAIN]){
      if(!needsStash(pm.u)) continue;
      if(/^\/_blob\/bk\./.test(pm.u)){ try{ const r = await fetch(pm.u, {method: 'HEAD'}); if(!r.ok) continue; }catch(e){ continue; } }
      else if(expired(pm.u)) continue;
      const kept = await stash(pm.u, pm.r); if(!kept) continue;
      PMAIN.set(k, {u: kept, r: pm.r || ''});
      try{ await DB.doc('pmain/' + idOf(k)).set({k, u: kept, r: pm.r || '', by: ME || '', at: new Date().toISOString()}); }catch(e){}
      paintCell(k, true);
    }
    for(const k of BKKEYS()){
      if(PICS.get(k)) continue;
      const pm = PMAIN.get(k); if(pm && !needsStash(pm.u)) continue;
      let ph = ''; try{ ph = (litFacts({key: k, g: '?'}) || {}).photo || ''; }catch(e){}
      if(!ph) find(k);
      else if(expiring(ph) || /^https?:/i.test(ph)) backup(k);
    }
  }
  window.__illuPhoto.repairBooked = repairBooked; window.__illuPhoto.expiryOf = expiryOf; window.__illuPhoto.stash = stash;
  load().then(() => { if(window.illu && window.illu.photoThumb && !window.illu.web) setTimeout(repairBooked, 8000); setTimeout(backupLit, 15000); setTimeout(sweep, 60000); setInterval(sweep, 6 * 3600e3); });
})();
