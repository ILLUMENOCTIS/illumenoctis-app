/* 1.2.285 (user, 24 Nov 2026: "I want to be able to view the slideshow of the agency website photos as well in the
   slideshow. I'm unable to view it from the booking card"): the booking card's file room gets a "Website" tab beside
   Book / Snaps / Videos. It shows her photos from her page on the agency's website as a slideshow in the room itself
   (‹ › or the arrow keys, the strip along the bottom, Full screen for the big viewer). It is also offered on the
   "Where would you like to view her files?" screen and on an empty folder, so there is always something to look at.
   Photos hidden earlier (Hide this photo) stay hidden. Nothing is saved or downloaded. */
(function(){
  'use strict';
  if(window.__illuBkAg) return; window.__illuBkAg = true;
  if(typeof bvDraw !== 'function' || typeof bvDrawStage !== 'function') return;
  const ko = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const T = (en, k) => ko() ? k : en;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
  const pc = () => !!(window.illu && window.illu.modelPhotos && !window.illu.web);
  const big = (u, ref) => pc() ? 'illuimg://p/' + encodeURIComponent(u) + '?r=' + encodeURIComponent(ref || '') + '&nc=1&w=2000' : (window.__illuSmall ? window.__illuSmall(u, 1400) : u);
  const thumb = (u, ref) => pc() ? 'illuimg://p/' + encodeURIComponent(u) + '?r=' + encodeURIComponent(ref || '') + '&w=300' : (window.__illuSmall ? window.__illuSmall(u, 300) : u);
  const hrefOf = c => { const k = String((c && c.k) || ''); return /^https?:\/\//i.test(k) ? k : ''; };
  /* her photos, read once per page and kept for this visit */
  const CACHE = new Map();     // href -> {st:'wait'|'ok', ps:[url], p:Promise}
  function load(c){
    const h = hrefOf(c);
    if(!h) return Promise.resolve([]);
    const have = CACHE.get(h);
    if(have) return have.st === 'ok' ? Promise.resolve(have.ps) : have.p;
    const rec = {st: 'wait', ps: []};
    rec.p = (async () => {
      let ps = [];
      try{ const r = window.illu && window.illu.modelPhotos ? await window.illu.modelPhotos(h) : null; ps = ((r && r.photos) || []).map(p => (p && p.url) || p).filter(u => typeof u === 'string' && /^https?:/i.test(u)); }catch(e){ ps = []; }
      /* a phone with no page reader: the agency photos the program published for her */
      if(!ps.length){ try{ const g = window.__illuPubGal && (window.__illuPubGal(typeof normKey === 'function' ? normKey(h) : h) || window.__illuPubGal('bid:' + c.id)); ps = ((g && g.ps) || []).filter(u => /^https:/i.test(u)); }catch(e){} }
      /* the card's own photo, when the page gives nothing */
      if(!ps.length){ try{ const f = typeof bkPhoto === 'function' ? bkPhoto(c) : ''; const m = String(f || '').match(/^illuimg:\/\/p\/([^?#]+)/); const raw = m ? decodeURIComponent(m[1]) : f; if(/^https?:/i.test(raw || '')) ps = [raw]; }catch(e){} }
      const seen = new Set();
      ps = ps.filter(u => { if(seen.has(u)) return false; seen.add(u); return !(window.__illuPhotoHidden && window.__illuPhotoHidden(h, u)); });
      rec.st = 'ok'; rec.ps = ps;
      return ps;
    })();
    CACHE.set(h, rec);
    return rec.p;
  }
  const count = c => { const r = CACHE.get(hrefOf(c)); return r && r.st === 'ok' ? r.ps.length : null; };
  const ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>';
  const offer = c => { if(!hrefOf(c)) return ''; const n = count(c);
    return '<div class="bvbtns bkagoffer"><button type="button" class="bvbtn" data-bkagopen>' + ICO + T('Agency website photos', '에이전시 웹사이트 사진') + '<s class="bvcnt">' + (n == null ? '…' : n) + '</s></button></div>'; };

  /* ---------- the tab ---------- */
  function addTab(){
    if(!bv || typeof bvTabs === 'undefined') return;
    const c = BOOK.get(bv.id); if(!c) return;
    bvTabs.querySelectorAll('.bkagtab').forEach(x => x.remove());
    if(!hrefOf(c)) return;
    const n = count(c);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'bvtab bkagtab' + (n === 0 ? ' empty' : ''); b.setAttribute('role', 'tab'); b.dataset.bkag = '1';
    b.setAttribute('aria-selected', String(!!bv.ag)); b.title = T('Her photos on the agency’s website', '에이전시 웹사이트의 사진');
    b.innerHTML = E(T('Website', '웹사이트')) + '<s>' + (n == null ? '…' : n) + '</s>';
    const vid = bvTabs.querySelector('[data-bvtab="3. VIDEOS"]');
    if(vid) vid.after(b); else bvTabs.appendChild(b);
    if(bv.ag){ bvTabs.querySelectorAll('[data-bvtab],[data-bvmail]').forEach(x => x.setAttribute('aria-selected', 'false')); }
    if(n == null) load(c).then(() => { if(bv && bv.id === c.id) addTab(); });
  }
  const _draw = bvDraw;
  bvDraw = function(){ _draw.apply(this, arguments); try{ addTab(); }catch(e){ console.warn('website tab', e); } };
  const _stage = bvDrawStage;
  bvDrawStage = function(c, got){
    if(bv && bv.ag && c){ try{ bvStopMedia(); }catch(e){} draw(c); return; }
    const r = _stage.apply(this, arguments);
    /* the choose screen and an empty folder offer her website photos too */
    try{ if(c && hrefOf(c) && !(bv && bv.mail)){
      const note = bvStage.querySelector('.bvnote');
      if(note && !bvStage.querySelector('.bvmedia') && !note.querySelector('.bkagoffer')){
        note.insertAdjacentHTML('beforeend', offer(c));
        if(count(c) == null) load(c).then(() => { const s = bvStage.querySelector('.bkagoffer .bvcnt'); if(s && bv && bv.id === c.id) s.textContent = count(c); });
      }
    } }catch(e){}
    return r;
  };

  /* ---------- the slideshow ---------- */
  let SEQ = 0;
  async function draw(c){
    const my = ++SEQ, h = hrefOf(c);
    if(!h){ bvStage.innerHTML = '<div class="bvnote"><h3>' + E(T('Website', '웹사이트')) + '</h3>' + E(T('This card has no page on the agency’s website.', '이 카드에는 에이전시 웹사이트 페이지가 없습니다.')) + '</div>'; return; }
    if(count(c) == null) bvStage.innerHTML = '<div class="bvnote"><h3>' + E(c.nm || '') + '</h3>' + E(T('Reading her photos from the agency’s website…', '에이전시 웹사이트에서 사진을 읽는 중…')) + '</div>';
    const ps = await load(c);
    if(my !== SEQ || !bv || !bv.ag || bv.id !== c.id) return;
    try{ addTab(); }catch(e){}
    if(!ps.length){
      bvStage.innerHTML = '<div class="bvnote"><h3>' + E(T('Website', '웹사이트')) + '</h3>' + E(T('No photos could be read from her page on the agency’s website.', '에이전시 웹사이트 페이지에서 사진을 읽지 못했습니다.')) +
        '<div class="bvbtns"><a class="bvbtn" href="' + E(h) + '" target="_blank" rel="noopener">' + E(T('Open her page', '페이지 열기')) + '</a></div></div>';
      return;
    }
    if(!(bv.agi >= 0) || bv.agi >= ps.length) bv.agi = 0;
    const i = bv.agi;
    bvStage.classList.remove('bvtwo');
    bvStage.innerHTML = '<div class="bvmedia bkagm"><img class="bkagimg" alt="" src="' + E(big(ps[i], h)) + '"></div>' +
      '<button type="button" class="bvnav bvnav--p" data-bkagstep="-1" aria-label="Previous"' + (ps.length > 1 ? '' : ' disabled') + '>‹</button>' +
      '<button type="button" class="bvnav bvnav--n" data-bkagstep="1" aria-label="Next"' + (ps.length > 1 ? '' : ' disabled') + '>›</button>' +
      '<div class="bvtool"><span class="bvcount">' + (i + 1) + '/' + ps.length + '</span><i class="bvsep"></i>' +
        '<button type="button" class="bvtb bkagfull" data-bkagfull title="' + E(T('Full screen', '전체 화면')) + '" aria-label="' + E(T('Full screen', '전체 화면')) + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div>' +
      '<div class="bvcap"><b>' + E(T('Agency website', '에이전시 웹사이트')) + '</b><span>' + E((() => { try{ return new URL(h).host.replace(/^www\./, ''); }catch(e){ return ''; } })()) + '</span></div>' +
      (ps.length > 1 ? '<div class="bvstrip bkagstrip" role="listbox" aria-label="' + E(T('All her website photos', '웹사이트 사진 전체')) + '">' +
        ps.map((u, k) => '<button type="button" class="bvst bkagst" data-bkagi="' + k + '" aria-current="' + (k === i) + '"><img alt="" loading="lazy" src="' + E(thumb(u, h)) + '"><em>' + (k + 1) + '</em></button>').join('') + '</div>' : '');
    const cur = bvStage.querySelector('.bkagst[aria-current="true"]');
    if(cur) try{ cur.scrollIntoView({block: 'nearest', inline: 'center'}); }catch(e){}
  }
  function step(d){
    if(!bv || !bv.ag) return; const c = BOOK.get(bv.id); if(!c) return;
    const n = count(c) || 0; if(n < 2) return;
    bv.agi = ((bv.agi || 0) + d + n) % n; draw(c);
  }
  /* a picture that does not load leaves the slideshow */
  document.addEventListener('error', e => {
    const t = e.target; if(!t || t.tagName !== 'IMG' || !bv || !bv.ag || !bvStage.contains(t)) return;
    const c = BOOK.get(bv.id); const rec = c && CACHE.get(hrefOf(c)); if(!rec || rec.st !== 'ok') return;
    let k = -1;
    if(t.classList.contains('bkagimg')) k = bv.agi || 0;
    else { const b = t.closest('.bkagst'); if(b) k = +b.dataset.bkagi; }
    if(k < 0 || rec.ps.length < 2) return;
    rec.ps.splice(k, 1); if(bv.agi >= rec.ps.length) bv.agi = rec.ps.length - 1;
    draw(c);
  }, true);

  document.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target : null; if(!t || !bv || typeof bvEl === 'undefined' || !bvEl.contains(t)) return;
    const c = BOOK.get(bv.id); if(!c) return;
    if(t.closest('[data-bkag]') || t.closest('[data-bkagopen]')){ e.preventDefault(); e.stopPropagation(); bv.ag = true; bv.mail = false; bv.choose = false; bvDraw(); return; }
    /* any other tab, Email, Dropbox or a folder: back to the files as before */
    if(bv.ag && (t.closest('[data-bvtab]') || t.closest('[data-bvmail]') || t.closest('[data-bvdbx]') || t.closest('[data-bvpick]'))){
      bv.ag = false; try{ if(t.closest('[data-bvtab]') && !BVLOAD.get(bv.id)) bv.choose = true; }catch(err){} return; }
    if(!bv.ag) return;
    const s = t.closest('[data-bkagstep]'); if(s){ e.preventDefault(); e.stopPropagation(); step(+s.dataset.bkagstep); return; }
    const g = t.closest('[data-bkagi]'); if(g){ e.preventDefault(); e.stopPropagation(); bv.agi = +g.dataset.bkagi; draw(c); return; }
    if(t.closest('[data-bkagfull]') || t.closest('.bkagimg')){
      e.preventDefault(); e.stopPropagation();
      const rec = CACHE.get(hrefOf(c)); const u = rec && rec.ps[bv.agi || 0];
      try{ if(window.illuPhotoFull) window.illuPhotoFull(u ? big(u, hrefOf(c)) : '', c.nm || '', hrefOf(c), c.k || ('bid:' + c.id), c.id); }catch(er){}
    }
  }, true);
  /* ← → in the room move through her website photos while that tab is open */
  document.addEventListener('keydown', e => {
    if(!bv || !bv.ag || typeof bvEl === 'undefined' || bvEl.hidden) return;
    if(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if(document.getElementById('illufv') && !document.getElementById('illufv').hidden) return;
    if(e.key === 'ArrowRight' || e.key === 'ArrowLeft'){ e.preventDefault(); e.stopImmediatePropagation(); step(e.key === 'ArrowRight' ? 1 : -1); }
    else if(!e.ctrlKey && !e.metaKey && /^[gGrR2+=_0-]$/.test(e.key)) e.stopImmediatePropagation();     // grid, rotate and zoom are for the folder files
  }, true);
  /* a card opened fresh starts on her files, as before */
  if(typeof bvOpenFor === 'function'){ const _open = bvOpenFor; bvOpenFor = function(id){ const r = _open.apply(this, arguments); try{ if(bv){ bv.ag = false; bv.agi = 0; const c = BOOK.get(id); if(c) load(c).then(() => { if(bv && bv.id === id) addTab(); }); } }catch(e){} return r; }; }

  const st = document.createElement('style');
  st.textContent =
    '.bkagm{display:flex;align-items:center;justify-content:center}' +
    '.bkagm .bkagimg{max-width:100%;max-height:100%;object-fit:contain;cursor:zoom-in;user-select:none}' +
    '.bkagst{overflow:hidden;position:relative}.bkagst img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.bkagst em{position:absolute;right:3px;bottom:2px;font-style:normal;font-size:10px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.7)}' +
    '.bkagst[aria-current="true"]{outline:2px solid var(--acc,#6E2A6B);outline-offset:1px}' +
    '.bkagoffer{margin-top:10px}.bkagoffer .bvbtn{display:inline-flex;align-items:center;gap:7px}' +
    '.bkagoffer svg,.bkagfull svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}';
  document.head.appendChild(st);
})();
