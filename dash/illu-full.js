/* ==================== A click on a card photo: full screen ====================
   On every card outside the Directory (Lumen, Communicatus, Booking, Instagram...), a
   left click on the photo shows it full screen, over the whole monitor:
   - the photo itself, as large as it fits, with ‹ › (or the ← → keys, or a swipe);
   - along the bottom, every photo of the model from the agency site as small pictures,
     the one shown outlined - click any to jump to it;
   - on the right, a details panel (name, agency, place, measurements, the lamps, links),
     opened and closed with the tab on its edge - the same as the Directory's full view.
   Esc, × or a click beside the photo closes it, and you are exactly where you were.
   A photo of your own is still added by dropping or pasting it, or from the right-click
   menu ("Choose a photo file…"); the booking files open from the card's Open button.
   The Directory and Suggestiones cards have their own full view (illu-dir2.js). */
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const src = (u, ref, w) => (window.illu && window.illu.modelPhotos && !window.illu.web) ? 'illuimg://p/' + encodeURIComponent(u) + '?r=' + encodeURIComponent(ref || '') + '&nc=1&w=' + (w || 2000) : (window.__illuSmall ? window.__illuSmall(u, 1400) : u);
  const small = u => /[?&]w=\d+/.test(u) ? u.replace(/([?&]w=)\d+/, '$1300') : u;
  const SIDEK = 'illu.fvside';
  const narrow = () => matchMedia('(max-width:900px)').matches;
  /* a phone starts with the photo, the details closed; a computer remembers the last choice */
  let narrowOn = false;
  const sideOn = () => { if(narrow()) return narrowOn; try{ return localStorage.getItem(SIDEK) !== '0'; }catch(e){ return true; } };
  const box = document.createElement('div');
  box.id = 'illufv'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  box.innerHTML = '<div class="fvstage"><img class="fvimg" alt=""></div>' +
    '<button type="button" class="fvnav fvp" data-fv="-1" aria-label="Previous">‹</button><button type="button" class="fvnav fvn" data-fv="1" aria-label="Next">›</button>' +
    '<div class="fvtop"><b class="fvnm"></b><span class="fvct"></span><span class="fvmsg"></span><span class="fvmainw"></span><span class="fvtabs" role="group"></span></div>' +
    '<div class="fvstrip" aria-label="All photos"></div>' +
    '<aside class="fvside"></aside>' +
    '<button type="button" class="fvsidet" aria-label="Details"><span class="fvsti">›</span><span class="fvstl"></span></button>' +
    '<button type="button" class="fvx" aria-label="Close" title="Close (Esc)">×</button>';
  document.body.appendChild(box);
  const img = box.querySelector('.fvimg'), strip = box.querySelector('.fvstrip'), side = box.querySelector('.fvside');
  let S = null;                              // {photos:[url], i, name, ref, key}
  let seq = 0;
  function paintStrip(){
    const n = S.photos.length;
    box.classList.toggle('fvnostrip', n < 2);
    if(n < 2){ strip.innerHTML = ''; return; }
    if(strip.dataset.sig !== n + '|' + S.photos[0]){
      strip.dataset.sig = n + '|' + S.photos[0];
      strip.innerHTML = S.photos.map((u, k) => '<button type="button" class="fvt' + (S.vid && S.vid.has(u) ? ' vid' : '') + '" data-fvt="' + k + '" aria-label="' + (S.vid && S.vid.has(u) ? 'Video ' : 'Photo ') + (k + 1) + '">' + (S.vid && S.vid.has(u) ? '<span>▶</span>' : '<img alt="" loading="lazy" decoding="async" src="' + esc(small(u)) + '">') + '</button>').join('');
    }
    strip.querySelectorAll('.fvt').forEach((b, k) => b.classList.toggle('on', k === S.i));
    const on = strip.querySelector('.fvt.on'); if(on) try{ on.scrollIntoView({block: 'nearest', inline: 'center'}); }catch(e){}
  }
  function draw(){
    if(!S) return;
    const n = S.photos.length;
    const isV = u => !!(S.vid && S.vid.has(u));
    const cur = S.photos[S.i];
    let vid = box.querySelector('.fvvid');
    if(n && isV(cur)){ if(!vid){ vid = document.createElement('video'); vid.className = 'fvvid'; vid.controls = true; vid.playsInline = true; box.querySelector('.fvstage').appendChild(vid); } if(vid.getAttribute('src') !== cur) vid.src = cur; vid.hidden = false; img.hidden = true; }
    else { if(vid){ try{ vid.pause(); }catch(e){} vid.hidden = true; vid.removeAttribute('src'); } img.hidden = false; if(n) img.src = cur; }
    paintTabs();
    img.alt = S.name || '';
    box.querySelector('.fvnm').textContent = S.name || '';
    box.querySelector('.fvct').textContent = n > 1 ? (S.i + 1) + ' / ' + n : '';
    box.querySelectorAll('.fvnav').forEach(b => { b.hidden = n < 2; });
    /* 1.2.112: make the photo shown the card photo (a model card only - not a booking card) */
    const PH = window.__illuPhoto, mw = box.querySelector('.fvmainw');
    mw.innerHTML = !(PH && PH.setMain && S.key && !S.bid) ? '' : S.i > 0 && S.raw && S.raw[S.i] ? '<button type="button" class="fvmain" data-fvmain title="' + esc(L('Show this photo on the model’s card, for everyone (the photo is not saved — only which one to show)', '이 사진을 모델 카드에 표시합니다 (사진은 저장되지 않고, 어떤 사진을 보일지만 기록)')) + '">★ ' + esc(L('Use as card photo', '카드 사진으로 사용')) + '</button>'
      : S.i === 0 && PH.PMAIN.has(S.key) ? '<button type="button" class="fvmain back" data-fvunmain>↺ ' + esc(L('Back to the original photo', '원래 사진으로')) + '</button>' : '';
    paintStrip();
    paintSide();
  }
  /* ---------- the details panel ---------- */
  const LAMPS = () => [['g', L('Interested', '관심')], ['y', L('Pending', '보류')], ['r', L('Ruled out', '제외')]];
  function facts(){
    const k = S.key; let i = null, f = null, bk = null;
    try{ if(k && typeof agIndex === 'function') agIndex(); }catch(e){}
    try{ i = k && typeof keyInfo === 'function' ? keyInfo(k) : null; }catch(e){}
    /* a booking card made by hand has no board address: it is found by its own id */
    try{ bk = (S.bid && typeof BOOK !== 'undefined' && BOOK.get(S.bid)) || (k && typeof bkForKey === 'function' ? bkForKey(k) : null); }catch(e){}
    try{ f = bk ? bkFacts(bk) : (k && typeof litFacts === 'function' ? litFacts(Object.assign({key: k}, i || {})) : null); }catch(e){}
    return {i: i || {}, f: f || {}, bk};
  }
  function paintSide(){
    const on = sideOn();
    box.classList.toggle('fvnoside', !on);
    box.querySelector('.fvsti').textContent = on ? '›' : '‹';
    box.querySelector('.fvstl').textContent = L('Details', '정보');
    if(!on || !S){ side.innerHTML = ''; return; }
    const keep = [...side.querySelectorAll('[data-mxin],[data-ntin]')].map(n => [n.dataset.mxin ? '[data-mxin="' + n.dataset.mxin + '"]' : '[data-ntin="' + CSS.escape(n.dataset.ntin) + '"]', n.value, n === document.activeElement, n.selectionStart || 0, n.selectionEnd || 0]), sTop = side.scrollTop;
    const {i, f, bk} = facts();
    const nm = S.name || i.nm || (bk && bk.nm) || '';
    const ag = i.ag || (bk && bk.ag) || '';
    const place = [i.city || (bk && bk.city), i.country || (bk && bk.country)].filter(Boolean).join(', ');
    const sex = f.g === 'F' ? L('Women', '여성') : f.g === 'M' ? L('Men', '남성') : '';
    const cm = v => v == null ? '' : (Math.round(v * 10) / 10) + ' cm';
    const rows = [[L('Height', '신장'), cm(f.ht)], [L('Bust / chest', '가슴'), cm(f.bu)], [L('Waist', '허리'), cm(f.wa)], [L('Hips', '엉덩이'), cm(f.hp)],
      [L('Shoe', '신발'), [f.eu != null ? 'EU ' + f.eu : '', f.us != null ? 'US ' + f.us : ''].filter(Boolean).join(' · ')],
      [L('Weight', '몸무게'), bk && bk.wt !== '' && bk.wt != null && !isNaN(parseFloat(bk.wt)) ? parseFloat(bk.wt) + ' kg' : ''],
      [L('Board', '보드'), [sex, i.div || ''].filter(Boolean).join(' · ')], [L('Tier', '등급'), (() => { const t = f.tier || i.t || ''; return t && t !== 'unlabelled' && String(i.div || '').toLowerCase() !== String(t).toLowerCase() ? t : ''; })()]].filter(r => r[1]);
    /* 1.2.100 (user): the agency's name and every measurement there is. Figures the crawl does not have
       yet are read from the model's page on the agency site when the panel opens (once per model). */
    if(ag) rows.unshift([L('Agency', '에이전시'), ag]);
    const miss = S.key && S.ref && /^https?:/i.test(S.ref) && [f.bu, f.wa, f.hp, f.eu].some(v => v == null);
    if(miss) readFigures(S.key, S.ref);
    const READL = {busy: L('Reading the agency page for more measurements…', '에이전시 페이지에서 사이즈를 더 읽는 중…'), none: L('The agency page shows no more measurements.', '에이전시 페이지에 더 공개된 사이즈가 없습니다.'), fail: L('The agency page could not be read just now.', '지금은 에이전시 페이지를 읽을 수 없습니다.'), got: L('Measurements read from the agency page just now.', '방금 에이전시 페이지에서 사이즈를 읽었습니다.')};
    const rs = S.key && FIG.get(S.key), readNote = rs && READL[rs] ? '<p class="fvread' + (rs === 'busy' ? ' busy' : '') + '">' + esc(READL[rs]) + '</p>' : '';
    const mine = (S.key && typeof MARKS !== 'undefined' && MARKS.get(S.key)) || '';
    let eff = ''; try{ eff = S.key ? lampOf(S.key) : ''; }catch(e){}
    let who = ''; try{ const h = S.key && window.lampHolder ? window.lampHolder(S.key) : null; const p = h && PEOPLE.get(h.pid); if(p) who = h.pid === ME ? L('You lit this first', '내가 처음 켬') : L(p.n + ' lit this first', p.n + ' 님이 처음 켬'); }catch(e){}
    const signed = typeof SIGNED === 'function' && SIGNED();
    const href = S.ref && /^https?:/i.test(S.ref) ? S.ref : '';
    /* 1.2.129: every expanded card outside the Booking board shows the one shared panel */
    if(S.key && !S.bid && window.__illuModelPanel){
      let dom = ''; try{ const hit = (typeof AG !== 'undefined' ? AG : []).find(x => x.name === ag); dom = hit ? (hit.domain || hit.name) : ''; }catch(e){}
      const html = window.__illuModelPanel(S.key, {nm, ag, agRef: dom, city: i.city || (bk && bk.city) || '', country: i.country || (bk && bk.country) || '', href, nPhotos: S.photos.length > 1 ? S.photos.length : 0, boards: [sex, i.div || ''].filter(Boolean).join(' · '), f, readNote});
      if(side.__pnh !== html){ side.__pnh = html; side.innerHTML = html; }
      MXABOUT = {nm, ag, city: i.city || '', country: i.country || ''};
      for(const [k, v, f2, a2, b2] of keep){ const n = side.querySelector(k); if(!n) continue; n.value = v; if(f2){ try{ n.focus({preventScroll: true}); n.setSelectionRange(a2, b2); }catch(e){} } }
      side.scrollTop = sTop;
      return;
    }
    side.__pnh = '';
    side.innerHTML = '<div class="fvsh"><h2>' + esc(nm) + '</h2>' + (ag ? '<p class="fvag">' + esc(ag) + '</p>' : '') + (place ? '<p class="fvpl">' + esc(place) + '</p>' : '') + '</div>' +
      (S.key && window.__illuVotePanel ? window.__illuVotePanel(S.key) : '') +
      (S.key && signed && !window.__illuVotePanel ? '<div class="fvlamps" role="group" aria-label="Lamp">' + LAMPS().map(([v, l]) => '<button type="button" class="fvl fvl-' + v + (eff === v ? ' on' : '') + (mine === v ? ' mine' : '') + '" data-fvl="' + v + '" aria-pressed="' + (mine === v) + '"><i></i>' + esc(l) + '</button>').join('') + '</div>' +
        (who ? '<p class="fvwho">' + esc(who) + '</p>' : '') : '') +
      (rows.length ? '<dl class="fvfx">' + rows.map(r => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('') + '</dl>' : '<p class="fvnone">' + esc(L('No measurements published', '공개된 사이즈 없음')) + '</p>') + readNote +
      '<div class="fvlinks">' + (href ? '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(L('Agency page ↗', '에이전시 페이지 ↗')) + '</a>' : '') +
      (bk && bk.ig ? '<a href="https://www.instagram.com/' + esc(String(bk.ig).replace(/^@/, '')) + '/" target="_blank" rel="noopener">Instagram ↗</a>' : '') + '</div>' +
      '<p class="fvcount">' + (S.photos.length > 1 ? esc(L(S.photos.length + ' photos', '사진 ' + S.photos.length + '장')) : '') + '</p>' +
      /* 1.2.129 (user): every expanded card has Booking / Notes / Links - except the Booking board's own cards */
      (S.key && !S.bid && window.__illuModelExtras ? window.__illuModelExtras(S.key, {nm, ag, city: i.city || (bk && bk.city) || '', country: i.country || (bk && bk.country) || ''}) : '');
    MXABOUT = {nm, ag, city: i.city || (bk && bk.city) || '', country: i.country || (bk && bk.country) || ''};
    /* what was being typed stays, and so does the cursor */
    for(const [k, v, f, a, b] of keep){ const n = side.querySelector(k); if(!n) continue; n.value = v; if(f){ try{ n.focus({preventScroll: true}); n.setSelectionRange(a, b); }catch(e){} } }
    side.scrollTop = sTop;
  }
  let MXABOUT = null;
  window.__illuMxAbout = () => MXABOUT;
  window.__illuFvRepaint = () => { if(S && !box.hidden) paintSide(); };
  /* the figures the crawl is missing, read from the agency page (program only): kept for everyone in
     meas/p-<person> - the Directory reads every meas/ document - and in memory at once */
  const FIG = new Map();
  function readFigures(k, href){
    if(FIG.has(k) || !(window.illu && window.illu.crawlProfile)) return;
    FIG.set(k, 'busy');
    window.illu.crawlProfile(href).then(async r => {
      if(!(r && r.ok && r.rec)){ FIG.set(k, r && r.ok === false && !r.gone && /answer|network|timeout|fetch/i.test(r.error || '') ? 'fail' : 'none'); if(S && S.key === k) paintSide(); return; }
      const old = (typeof MEAS !== 'undefined' && MEAS.get(k)) || [];
      const rec = r.rec.map((v, j) => v == null || v === '' ? (old[j] == null ? null : old[j]) : v);
      if(/\.(mp4|m4v|mov|webm|ogv|avi|mkv|m3u8)(\?|#|$)/i.test(rec[6] || '')) rec[6] = old[6] && !/\.(mp4|m4v|mov|webm|ogv|avi|mkv|m3u8)(\?|#|$)/i.test(old[6]) ? old[6] : null;   // never a film as her photo
      const more = [1, 2, 3, 4].some(j => rec[j] != null && old[j] == null);
      FIG.set(k, more ? 'got' : 'none');
      try{ if(window.__measPut) window.__measPut(k, rec); else MEAS.set(k, rec); }catch(e){}
      try{ if(ME && typeof DB !== 'undefined'){ const ref = DB.doc('meas/p-' + ME); const cur = await ref.get(); const d = cur && cur.exists ? cur.data() : null; const e = Object.assign({}, (d && d.e) || {}); e[k] = rec; await ref.set({e, at: new Date().toISOString(), name: 'read from agency pages'}); } }catch(e){}
      if(S && S.key === k) paintSide();
      try{ document.querySelectorAll('.uc[data-uck="' + CSS.escape(k) + '"]').length && window.__illuVoteChanged && window.__illuVoteChanged(); }catch(e){}
    }).catch(() => { FIG.set(k, 'fail'); if(S && S.key === k) paintSide(); });
  }
  side.addEventListener('click', e => {
    const b = e.target.closest('[data-fvl]'); if(!b || !S || !S.key) return;
    e.preventDefault();
    Promise.resolve(setMark(S.key, b.dataset.fvl, {nm: S.name || '', url: S.ref || S.key})).then(paintSide, paintSide);
    setTimeout(paintSide, 30);
  });
  /* 1.2.138 (user, 11 Nov 2026: "when I slide down the information panel on the voting card, I want the card to slide
     down and eventually close if I slide all the way down, so the focus is on the slide-show view"): on a phone the
     details sheet follows the finger down when it is scrolled to its top; let go past a quarter of its height (or
     with a quick flick) and it closes, otherwise it springs back. */
  (function sheetDrag(){
    let y0 = 0, dy = 0, on = false, t0 = 0, top0 = false;
    side.addEventListener('touchstart', e => {
      if(!narrow() || !narrowOn || e.touches.length !== 1) { on = false; return; }
      if(e.target.closest('input, textarea, select, [contenteditable]')) { on = false; return; }
      y0 = e.touches[0].clientY; dy = 0; on = true; t0 = Date.now(); top0 = side.scrollTop <= 0;
    }, {passive: true});
    side.addEventListener('touchmove', e => {
      if(!on) return;
      const d = e.touches[0].clientY - y0;
      if(!top0 || side.scrollTop > 0 || (d <= 0 && dy <= 0)){ return; }   // scrolling the details as usual
      dy = Math.max(0, d);
      if(e.cancelable) e.preventDefault();
      side.style.transition = 'none'; side.style.transform = 'translateY(' + dy + 'px)';
    }, {passive: false});
    const end = () => {
      if(!on) return; on = false;
      side.style.transition = ''; side.style.transform = '';
      const fast = dy > 40 && Date.now() - t0 < 250;
      if(dy > side.offsetHeight * 0.25 || fast){ narrowOn = false; paintSide(); }
      dy = 0;
    };
    side.addEventListener('touchend', end); side.addEventListener('touchcancel', end);
  })();
  box.querySelector('.fvsidet').addEventListener('click', () => { if(narrow()) narrowOn = !narrowOn; else { try{ localStorage.setItem(SIDEK, sideOn() ? '0' : '1'); }catch(e){} } paintSide(); });
  box.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-fvmain], [data-fvunmain]'); if(!b || !S) return;
    e.preventDefault(); e.stopPropagation();
    try{ if(typeof SIGNED === 'function' && !SIGNED()){ if(typeof nudgeSignIn === 'function') nudgeSignIn(); return; } }catch(err){}
    const PH = window.__illuPhoto, key = S.key;
    if(b.hasAttribute('data-fvmain')){ const u = S.raw[S.i], shown = S.photos[S.i]; Promise.resolve(PH.setMain(key, u, S.ref)).then(ok => { if(!S || S.key !== key) return;
      /* the chosen photo becomes photo 1 */
      S.photos.splice(S.i, 1); S.raw.splice(S.i, 1); S.photos.unshift(shown); S.raw.unshift(u); S.i = 0; draw();
      box.querySelector('.fvmsg').textContent = ok ? L('Card photo changed', '카드 사진을 바꿨습니다') : L('Could not save — try again', '저장하지 못했습니다 — 다시 시도하세요'); }); }
    else Promise.resolve(PH.clearMain(key)).then(() => { if(S && S.key === key){ draw(); box.querySelector('.fvmsg').textContent = L('Back to the original photo', '원래 사진으로 돌아갔습니다'); } });
  }, true);
  strip.addEventListener('click', e => { const t = e.target.closest('[data-fvt]'); if(!t || !S) return; e.stopPropagation(); S.i = +t.dataset.fvt; draw(); });

  function open(first, name, href, key, bid){
    const my = ++seq; narrowOn = false;
    S = {photos: first ? [first] : [], raw: first ? [first] : [], i: 0, name, ref: href || '', bid: bid || '', key: key || (href && typeof normKey === 'function' ? normKey(href) : '')};
    strip.dataset.sig = '';
    box.hidden = false; document.body.classList.add('illufvon');
    box.querySelector('.fvmsg').textContent = '';
    draw();
    try{ box.querySelector('.fvx').focus({preventScroll: true}); }catch(e){}
    /* 1.2.133 (user, 10 Nov 2026): the folders saved in her booking folder (Book / Snaps / Videos) as tabs, as on the
       booking card, beside the agency's own photos. Her Book opens first when there is one. */
    S.src = {agency: S.photos.slice(), book: [], snaps: [], videos: []}; S.araw = S.raw.slice(); S.tab = 'agency';
    if(S.key && window.__illuMatPhotos){
      window.__illuMatPhotos(S.key, true).then(mat => {
        if(my !== seq || !S || !mat || !mat.length) return;
        for(const m of mat) if(S.src[m.t]) S.src[m.t].push(m.u);
        S.vid = new Set(S.src.videos);
        const t = S.src.book.length ? 'book' : S.src.snaps.length ? 'snaps' : S.src.videos.length ? 'videos' : 'agency';
        if(S.tab === 'agency') tabTo(t); else draw();
      }).catch(() => {});
    }
    /* the model's other photos, from the agency's page */
    if(href && /^https?:/i.test(href) && window.illu && window.illu.modelPhotos){
      box.querySelector('.fvmsg').textContent = L('Looking for more photos…', '사진을 더 찾는 중…');
      window.illu.modelPhotos(href).then(r => {
        if(my !== seq || !S) return;
        box.querySelector('.fvmsg').textContent = '';
        const more = ((r && r.photos) || []).map(p => src(p.url || p, href));
        if(more.length){
          S.src.agency = first ? [first].concat(more) : more;
          const raws = ((r && r.photos) || []).map(p => p.url || p); S.araw = first ? [first].concat(raws) : raws;
          if(S.tab === 'agency'){ const keep = S.photos[S.i]; S.photos = S.src.agency.slice(); S.raw = S.araw.slice(); S.i = Math.max(0, S.photos.indexOf(keep)); }
          draw();
        }
      }).catch(() => { if(my === seq) box.querySelector('.fvmsg').textContent = ''; });
    }
  }
  function tabTo(t){
    if(!S || !S.src || !S.src[t] || !S.src[t].length) return;
    S.tab = t; S.photos = S.src[t].slice(); S.raw = t === 'agency' ? S.araw.slice() : S.src[t].slice(); S.i = 0; strip.dataset.sig = '';
    draw();
  }
  function paintTabs(){
    const w = box.querySelector('.fvtabs'); if(!w) return;
    const sv = S && S.src; const own = sv && (sv.book.length || sv.snaps.length || sv.videos.length);
    if(!own){ w.innerHTML = ''; return; }
    const T = [['book', L('Book', '북')], ['snaps', L('Snaps', '스냅')], ['videos', L('Videos', '영상')], ['agency', L('Agency', '에이전시')]];
    w.innerHTML = T.filter(([k]) => sv[k].length).map(([k, lab]) => '<button type="button" data-fvtab="' + k + '" aria-pressed="' + (S.tab === k) + '">' + esc(lab) + ' <s>' + sv[k].length + '</s></button>').join('');
  }
  function close(){
    if(box.hidden) return;
    seq++; S = null; box.hidden = true; img.removeAttribute('src'); strip.innerHTML = ''; side.innerHTML = ''; side.__pnh = '';   /* 1.2.133: reopening the same card drew an empty panel */
    document.body.classList.remove('illufvon');
  }
  function step(d){ if(!S || S.photos.length < 2) return; S.i = (S.i + d + S.photos.length) % S.photos.length; draw(); }
  window.illuPhotoFull = open;

  /* which photo was clicked, and whose it is */
  function infoOf(cell){
    const pic = cell.querySelector('img');
    const first = pic && pic.naturalWidth ? (pic.currentSrc || pic.src) : '';
    const card = cell.closest('.litrow, .bkcard, article, li, .litcard, .igrow') || cell.parentElement;
    const link = card && (card.querySelector('a.bknmlink[href], a.rnm[href], a[data-ref]'));
    const href = link ? (link.getAttribute('href') || link.dataset.ref || '') : '';
    const nmEl = card && card.querySelector('.rnm, .bknm, .nm');
    const mk = card && card.querySelector('.mk[data-mk], .vmk[data-mk]');
    const bc = cell.closest('[data-bkid]');
    return {first, name: nmEl ? nmEl.textContent.trim() : (pic ? pic.alt : ''), href, key: (mk && mk.dataset.mk) || cell.dataset.pic || '', bid: bc ? bc.dataset.bkid : ''};
  }
  window.addEventListener('click', e => {
    if(e.button !== 0 || !e.target.closest) return;
    const cell = e.target.closest('.litpic, .bkpic');
    if(!cell || cell.closest('.d2card, .d2t, #illufv, .bv')) return;     // Directory / Suggestiones tiles open their card; the card has its own full view
    if(e.target.closest('button, a, input, [data-piccopy], [data-picdel]')) return;   // the small buttons on the photo keep their jobs
    e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    const f = infoOf(cell);
    if(!f.first && !f.href) return;                // an empty slot: nothing to show (drop, paste or right-click to add one)
    open(f.first, f.name, f.href, f.key, f.bid);
  }, true);
  window.addEventListener('keydown', e => {
    if(!box.hidden){
      if(e.target && e.target.closest && e.target.closest('#illufv input, #illufv textarea') && e.key !== 'Escape') return;   // typing a note or a link: the arrow keys move the cursor, not the photo
      if(e.key === 'Escape'){ e.preventDefault(); e.stopImmediatePropagation(); close(); }
      else if(e.key === 'ArrowRight'){ e.preventDefault(); e.stopImmediatePropagation(); step(1); }
      else if(e.key === 'ArrowLeft'){ e.preventDefault(); e.stopImmediatePropagation(); step(-1); }
      return;
    }
    if((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.litpic[data-pic], .bkpic') && !e.target.closest('.d2card, .d2t')){
      const f = infoOf(e.target.closest('.litpic, .bkpic'));
      if(f.first || f.href){ e.preventDefault(); e.stopImmediatePropagation(); open(f.first, f.name, f.href, f.key, f.bid); }
    }
  }, true);
  box.addEventListener('click', e => {
    const tb = e.target.closest('[data-fvtab]'); if(tb){ tabTo(tb.dataset.fvtab); return; }
    const n = e.target.closest('[data-fv]'); if(n){ step(+n.dataset.fv); return; }
    if(e.target.closest('.fvside, .fvsidet, .fvstrip, .fvtop')) return;           // the panel, the strip and the title keep the view open
    if(e.target.closest('.fvx') || !e.target.closest('.fvimg') || !onPhoto(e)) close();
  });
  /* the picture fills its frame "contain": a click in the dark around it is beside the photo */
  function onPhoto(e){
    const r = img.getBoundingClientRect(), w = img.naturalWidth, h = img.naturalHeight;
    if(!w || !h) return false;
    const k = Math.min(r.width / w, r.height / h), dw = w * k, dh = h * k;
    const x0 = r.left + (r.width - dw) / 2, y0 = r.top + (r.height - dh) / 2;
    return e.clientX >= x0 && e.clientX <= x0 + dw && e.clientY >= y0 && e.clientY <= y0 + dh;
  }
  let sx = null;
  box.querySelector('.fvstage').addEventListener('pointerdown', e => { sx = e.clientX; });
  box.addEventListener('pointerup', e => { if(sx == null) return; const dx = e.clientX - sx; sx = null; if(Math.abs(dx) > 60) step(dx < 0 ? 1 : -1); });
  /* language switched while open: the panel follows */
  try{ new MutationObserver(() => { if(S) paintSide(); }).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']}); }catch(e){}

  const css = document.createElement('style');
  css.textContent = `
#illufv{position:fixed;inset:0;z-index:4000;background:#120D16;display:block;--fvside:340px;--fvstrip:96px}
#illufv[hidden]{display:none}
#illufv.fvnoside{--fvside:0px}#illufv.fvnostrip{--fvstrip:0px}
#illufv .fvstage{position:absolute;top:56px;left:72px;right:calc(72px + var(--fvside));bottom:calc(20px + var(--fvstrip));transition:right .28s cubic-bezier(.22,1,.36,1)}
#illufv .fvimg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none}
#illufv .fvtop{position:absolute;left:24px;top:16px;right:calc(80px + var(--fvside));display:flex;align-items:baseline;gap:14px;color:#fff;font:500 13px var(--sans)}
#illufv .fvnm{font:600 15px var(--sans);letter-spacing:.02em}
#illufv .fvct{font:600 11.5px var(--sans);padding:2px 9px;border-radius:999px;background:rgba(255,255,255,.14)}
#illufv .fvct:empty,#illufv .fvmsg:empty{display:none}
#illufv .fvmsg{opacity:.7;font-size:12px}
#illufv .fvtabs{display:inline-flex;gap:4px;margin-left:10px;pointer-events:auto}
#illufv .fvtabs button{border:0;background:rgba(255,255,255,.12);color:#fff;border-radius:999px;padding:4px 11px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer}
#illufv .fvtabs button[aria-pressed="true"]{background:#fff;color:#1B1724}
#illufv .fvtabs s{text-decoration:none;opacity:.7;font-size:11px;margin-left:2px}
#illufv .fvvid{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
#illufv .fvt.vid span{display:grid;place-items:center;width:100%;height:100%;color:#fff;font-size:18px;background:#2a2230}
#illufv .fvx{position:absolute;right:18px;top:14px;z-index:3;width:38px;height:38px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:22px;line-height:1;cursor:pointer}
#illufv:not(.fvnoside) .fvx{background:var(--surf2,#F1EDF4);color:var(--ink,#1B1724)}
#illufv .fvx:hover{background:#2A2027;color:#fff}
#illufv .fvnav{position:absolute;top:calc(50% - var(--fvstrip) / 2);transform:translateY(-50%);width:48px;height:72px;border:0;border-radius:12px;background:rgba(255,255,255,.1);color:#fff;font-size:34px;line-height:1;cursor:pointer;transition:right .28s cubic-bezier(.22,1,.36,1)}
#illufv .fvnav:hover{background:rgba(255,255,255,.22)}
#illufv .fvnav[hidden]{display:none}
#illufv .fvp{left:14px}#illufv .fvn{right:calc(14px + var(--fvside))}
/* the strip of every photo, along the bottom */
#illufv .fvstrip{position:absolute;left:0;bottom:0;right:var(--fvside);height:var(--fvstrip);box-sizing:border-box;display:flex;gap:8px;align-items:center;justify-content:safe center;padding:10px 16px;background:#1E1924;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;scrollbar-color:#4A4052 transparent;transition:right .28s cubic-bezier(.22,1,.36,1)}
#illufv.fvnostrip .fvstrip{display:none}
#illufv .fvt{flex:none;height:100%;aspect-ratio:3/4;padding:0;border:2px solid transparent;border-radius:8px;overflow:hidden;background:#2A2230;cursor:pointer;opacity:.55;transition:opacity .2s,border-color .2s,transform .2s}
#illufv .fvt img{width:100%;height:100%;object-fit:cover;display:block}
#illufv .fvt:hover{opacity:.85;transform:translateY(-2px)}
#illufv .fvt.on{opacity:1;border-color:#fff}
/* the details panel, on the right */
#illufv .fvread{font-size:12px;color:var(--faint,#8a8090);margin:6px 0 0}#illufv .fvread.busy::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--acc,#5A2C57);margin-right:6px;animation:livepulse 1.2s ease-in-out infinite}
#illufv .fvside{position:absolute;top:0;right:0;bottom:0;width:340px;box-sizing:border-box;padding:64px 24px 24px;overflow-y:auto;background:var(--surf,#fff);color:var(--ink,#1B1724);border-left:1px solid var(--line,#E3DEEA);transform:translateX(0);transition:transform .28s cubic-bezier(.22,1,.36,1)}
#illufv.fvnoside .fvside{transform:translateX(100%)}
#illufv .fvsidet{position:absolute;z-index:2;top:50%;right:var(--fvside);transform:translateY(-50%);width:18px;padding:12px 0 10px;border:1px solid rgba(255,255,255,.18);border-right:0;border-radius:10px 0 0 10px;background:#2A2230;color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:7px;font:inherit;transition:right .28s cubic-bezier(.22,1,.36,1),background .2s}
#illufv:not(.fvnoside) .fvsidet{background:var(--surf,#fff);color:var(--acc,#5A2C57);border-color:var(--line,#E3DEEA)}
#illufv .fvsidet:hover{background:var(--acc,#5A2C57);color:#fff}
#illufv .fvsti{font-size:16px;line-height:1;font-weight:600}
#illufv .fvstl{writing-mode:vertical-rl;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
#illufv .fvsh h2{margin:0 0 4px;font:600 21px/1.2 var(--disp,var(--sans));color:var(--ink,#1B1724);overflow-wrap:anywhere}
#illufv .fvag{margin:0;font:600 13px var(--sans);color:var(--acc,#5A2C57)}
#illufv .fvpl{margin:2px 0 0;font-size:12.5px;color:var(--mut,#7A7186)}
#illufv .fvlamps{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:18px 0 6px}
#illufv .fvl{display:flex;flex-direction:column;align-items:center;gap:6px;padding:9px 4px 8px;border:1px solid var(--line,#E3DEEA);border-radius:10px;background:var(--surf,#fff);color:var(--ink2,#3A3344);font:600 11px var(--sans);cursor:pointer;transition:background .15s,border-color .15s}
#illufv .fvl i{width:14px;height:14px;border-radius:50%;border:2px solid var(--c);background:transparent}
#illufv .fvl-g{--c:#2FA55A}#illufv .fvl-y{--c:#E3A812}#illufv .fvl-r{--c:#D9534F}
#illufv .fvl:hover{border-color:var(--c)}
#illufv .fvl.on i{background:var(--c);box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 22%,transparent)}
#illufv .fvl.mine{border-color:var(--c);background:color-mix(in srgb,var(--c) 9%,var(--surf,#fff))}
#illufv .fvwho{margin:4px 0 0;font-size:11.5px;color:var(--mut,#7A7186)}
#illufv .fvfx{display:grid;grid-template-columns:auto 1fr;gap:9px 16px;margin:18px 0 14px;padding:14px 0 0;border-top:1px solid var(--line,#E3DEEA)}
#illufv .fvfx dt{font:600 9.5px var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--faint,#A69DB2);padding-top:2px}
#illufv .fvfx dd{margin:0;font-size:13px;color:var(--ink2,#3A3344)}
#illufv .fvnone{margin:18px 0;font-size:12.5px;color:var(--mut,#7A7186)}
#illufv .fvlinks{display:flex;gap:14px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--line,#E3DEEA)}
#illufv .fvlinks:empty{display:none}
#illufv .fvlinks a{color:var(--acc,#5A2C57);font:600 13px var(--sans);text-decoration:none}#illufv .fvlinks a:hover{text-decoration:underline}
#illufv .fvcount{margin:14px 0 0;font-size:11.5px;color:var(--faint,#A69DB2)}
/* 1.2.126: on a phone or a narrow window the details (with Booking, notes and links) are a sheet that slides up
   from the bottom; the Details button opens and closes it. It used to be hidden there altogether. */
@media (max-width:900px){
  #illufv{--fvside:0px}
  #illufv .fvside{top:auto;left:0;right:0;bottom:0;width:auto;max-height:76vh;border-left:0;border-radius:18px 18px 0 0;padding:22px max(18px,env(safe-area-inset-left,0px)) calc(20px + env(safe-area-inset-bottom,0px));box-shadow:0 -18px 40px rgba(0,0,0,.45);z-index:4;transition:transform .22s ease}
  #illufv.fvnoside .fvside{transform:translateY(105%)}
  #illufv .fvsidet{top:auto;right:auto;left:50%;bottom:calc(var(--fvstrip,0px) + 14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:auto;flex-direction:row;gap:6px;padding:9px 18px;border:1px solid rgba(255,255,255,.25);border-radius:999px;z-index:5;writing-mode:horizontal-tb}
  #illufv .fvsidet .fvstl{writing-mode:horizontal-tb;transform:none;font-size:13px;letter-spacing:.06em}
  #illufv .fvsidet .fvsti{transform:rotate(-90deg)}
  #illufv:not(.fvnoside) .fvsidet{bottom:calc(76vh + 10px);background:var(--surf,#fff);color:var(--ink,#211C26);border-color:var(--line,#E7E2EC)}
  #illufv:not(.fvnoside) .fvsidet *{color:inherit}
  #illufv:not(.fvnoside) .fvsidet .fvsti{transform:rotate(90deg)}
}
@media (max-width:900px) and (prefers-reduced-motion:reduce){#illufv .fvside{transition:none}}

#illufv .fvmain{border:0;border-radius:999px;height:28px;padding:0 13px;background:rgba(255,255,255,.14);color:#fff;font:600 12px var(--sans);cursor:pointer;white-space:nowrap;align-self:center}
#illufv .fvmain:hover{background:var(--acc,#5A2C57)}#illufv .fvmain.back{background:rgba(255,255,255,.85);color:#3a2c3f}
#illufv .fvmainw:empty{display:none}
`;
  document.head.appendChild(css);
})();
