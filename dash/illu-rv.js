/* ================= Directory: model cards and Recently viewed =================
   1. An opened agency shows its models as the same cards the Lumen page uses (photo,
      lamps, measurements, Instagram, booking), not as a list of names. "Names" in the
      board header switches back to the short list; the choice is remembered.
   2. A third Directory tab, "Recently viewed": the agencies you opened and the models
      you clicked, newest first, from your own work log. Agencies are the usual Directory
      rows (they open the same way); models are the usual cards. */
(function(){
  'use strict';
  const LSK = 'illu.dirview';
  let NAMES = false;
  try{ NAMES = localStorage.getItem(LSK) === 'names'; }catch(e){}
  const PAGE = 120;                       // cards drawn per board before "Show all"
  window.DIRREC = false;
  let recAg = 30, recMd = 60;

  const hrefOf = (b, m) => m[1].charAt(0) === '|' ? m[1].slice(1) : b.p + m[1];
  function needMeas(){ try{ if(measState === 'idle') loadMeas(); }catch(e){} }
  function cardFor(a, b, m, opts){
    const href = hrefOf(b, m);
    return modelCard({key: normKey(href), nm: m[0] || '(unnamed)', href: href, ag: a.name,
                      city: a.city || '', country: a.country || '', div: b.d || '', g: b.g || '?', t: b.t || ''}, opts || {});
  }
  function boardCards(a, b, all){
    const ms = b.m.filter(m => !mdelIs(normKey(hrefOf(b, m))));
    const shown = all ? ms : ms.slice(0, PAGE);
    return '<div class="litres illucards">' + shown.map(m => cardFor(a, b, m)).join('') + '</div>' +
      (ms.length > shown.length ? '<button type="button" class="illumore" data-illuall>Show all ' + ms.length.toLocaleString() + ' models</button>' : '');
  }
  const viewBtn = () => '<span class="illuview" role="group" aria-label="Show models as">' +
    '<button type="button" data-illuview="cards" aria-pressed="' + !NAMES + '">Cards</button>' +
    '<button type="button" data-illuview="names" aria-pressed="' + NAMES + '">Names</button></span>';

  /* the agency body: same contacts block and board headers, cards in place of names */
  const agFillNames = window.agFill;
  window.agFill = agFill = function(box){
    if(NAMES){
      agFillNames(box);
      const body = box.querySelector('.agbody');
      if(body) body.querySelectorAll('.bdh').forEach(h => { if(!h.querySelector('.illuview')) h.insertAdjacentHTML('beforeend', viewBtn()); });
      return;
    }
    const a = AG[+box.dataset.i];
    if(!a) return;
    const body = box.querySelector('.agbody');
    if(body.dataset.filled === '1') return;
    needMeas();
    const bs = boardsFor(a, checked('tier'), checked('sex'));
    body.innerHTML = contactsBlock(a.domain) + bs.map((b, j) =>
      '<div class="bd" data-illub="' + a.boards.indexOf(b) + '"><div class="bdh"><b>' + esc(b.d) + '</b>' +
      '<span class="tierchip" data-t="' + esc(b.t) + '">' + esc(TIER[b.t] || b.t) + '</span>' + viewBtn() +
      '<a href="' + esc(b.u) + '" target="_blank" rel="noopener noreferrer">open board &rarr;</a>' +
      '</div>' + boardCards(a, b, false) + '</div>').join('');
    body.dataset.filled = '1';
    markSeen();
    /* the photos of this agency's boards are looked up now, not when the weekly sweep gets here */
    try{ if(window.__illuPhoto) window.__illuPhoto.boardNow(a); }catch(e){}
  };

  function refill(){
    document.querySelectorAll('.ag[data-open="1"] .agbody').forEach(body => {
      body.dataset.filled = '';
      try{ agFill(body.closest('.ag')); }catch(e){}
    });
  }
  document.addEventListener('click', e => {
    const v = e.target.closest && e.target.closest('[data-illuview]');
    if(v){
      e.preventDefault(); e.stopPropagation();
      NAMES = v.dataset.illuview === 'names';
      try{ localStorage.setItem(LSK, NAMES ? 'names' : 'cards'); }catch(err){}
      refill();
      return;
    }
    const more = e.target.closest && e.target.closest('[data-illuall]');
    if(more){
      e.preventDefault(); e.stopPropagation();
      const bd = more.closest('.bd[data-illub]'), box = more.closest('.ag');
      const a = box && AG[+box.dataset.i], b = a && a.boards[+bd.dataset.illub];
      if(!b) return;
      more.previousElementSibling.remove();
      more.outerHTML = boardCards(a, b, true);
      markSeen();
      return;
    }
    const rm = e.target.closest && e.target.closest('[data-illurecmore]');
    if(rm){
      e.preventDefault(); e.stopPropagation();
      if(rm.dataset.illurecmore === 'ag') recAg += 30; else recMd += 60;
      refresh();
      return;
    }
    /* the tabs: s19 decides All / Favorites; this only says whether Recently viewed is on */
    const tb = e.target.closest && e.target.closest('[data-dftab]');
    if(tb){ window.DIRREC = tb.dataset.dftab === 'rec'; if(window.DIRREC){ recAg = 30; recMd = 60; } }
  }, true);

  /* The Recently viewed tab is switched off for now (the user asked to remove it); its code
     stays below, unused, so it can come back. */
  /* your own trail, newest first, one entry per agency / model */
  let RC = null, RCAT = 0;
  function recent(){
    if(RC && Date.now() - RCAT < 1500) return RC;
    const ag = [], md = [], seenA = new Set(), seenM = new Set();
    let rows = [];
    try{ rows = allRows(); }catch(e){ rows = []; }
    for(const r of rows){
      if(r.who && r.who.length && ME && r.who.indexOf(ME) < 0) continue;
      if(r.kind === 'agency'){
        const a = agOfRow(r);
        if(!a || seenA.has(a.domain)) continue;
        seenA.add(a.domain); ag.push({a: a, day: r.day, when: r.when});
      }else if(r.kind === 'model' && r.url){
        const k = normKey(r.url);
        if(seenM.has(k)) continue;
        seenM.add(k); md.push({k: k, r: r, day: r.day, when: r.when});
      }
    }
    RC = {ag: ag, md: md}; RCAT = Date.now();
    return RC;
  }
  window.__illuRecent = () => { try{ return recent(); }catch(e){ return {ag: [], md: []}; } };
  function agOfRow(r){
    const nm = r.name;
    let a = AG.find(x => x.name === nm && (!r.meta || !x.city || String(r.meta).indexOf(x.city) >= 0));
    if(!a && r.url){ try{ const j = AGHOST.get(hostOfKey(normKey(r.url))); if(j !== undefined) a = AG[j]; }catch(e){} }
    return a || AG.find(x => x.name === nm) || null;
  }
  function modelOf(x){
    try{ agIndex(); }catch(e){}
    const hit = AGOF && AGOF.get(x.k);
    if(hit){
      const a = AG[hit[0]];
      for(const b of a.boards) for(const m of b.m)
        if(normKey(hrefOf(b, m)) === x.k)
          return {key: x.k, nm: m[0] || x.r.name || '(unnamed)', href: hrefOf(b, m), ag: a.name, city: a.city || '',
                  country: a.country || '', div: b.d || '', g: b.g || '?', t: b.t || ''};
    }
    return {key: x.k, nm: x.r.name || '(unnamed)', href: x.r.url, ag: x.r.ag || '', city: '', country: '', div: '', g: '?', t: ''};
  }
  const stamp = x => 'Viewed ' + x.day + (x.when ? ' ' + x.when : '');

  const dirRecRenderOff = function(rows){
    needMeas();
    RC = null;
    const R = recent();
    const byAg = new Map(rows.map(r => [r.a, r]));
    /* agencies come folded: one opened elsewhere stays folded here; one you open on
       this page stays open when the page redraws */
    const wasOpen = main.querySelector('.illurecmd, .illurech')
      ? [...main.querySelectorAll('.ag[data-open="1"]')].map(b => AG[+b.dataset.i]).filter(Boolean) : [];
    const agl = R.ag.filter(x => byAg.has(x.a));
    const hidden = R.ag.length - agl.length;
    const ags = agl.slice(0, recAg).map(x => dirAgRow(byAg.get(x.a)).replace('<span class="agl2">',
      '<span class="agl2"><span class="illuseen" title="' + esc(stamp(x)) + '">' + esc(stamp(x)) + '</span>')).join('');
    const mds = R.md.slice(0, recMd).map(x => modelCard(modelOf(x), {day: stamp(x), dayTitle: 'When you last opened this model'})).join('');
    main.innerHTML = dirFavTabs() +
      '<div class="dfhd"><h2>Recently viewed</h2><p>The agencies you opened and the models you clicked, newest first' +
        (hidden > 0 ? ' · ' + hidden + ' ' + (hidden === 1 ? 'agency' : 'agencies') + ' hidden by the filters or search' : '') + '</p></div>' +
      '<h3 class="illurech">Agencies <s>' + agl.length + '</s></h3>' +
      (agl.length ? '<section class="dfsec"><div class="ctygrp">' + DIRTH + ags + '</div></section>' +
          (agl.length > recAg ? '<button type="button" class="illumore" data-illurecmore="ag">Show more agencies</button>' : '')
        : '<div class="nomatch"><p>No agencies opened yet. Open any agency in All agencies and it is kept here.</p></div>') +
      '<h3 class="illurech">Models <s>' + R.md.length + '</s></h3>' +
      (R.md.length ? '<div class="litres illucards illurecmd">' + mds + '</div>' +
          (R.md.length > recMd ? '<button type="button" class="illumore" data-illurecmore="md">Show more models</button>' : '')
        : '<div class="nomatch"><p>No models opened yet. Click a model’s name on any card or list and they are kept here.</p></div>');
    for(const a of wasOpen){
      const box = main.querySelector('.ag[data-i="' + AG.indexOf(a) + '"]');
      if(!box) continue;
      box.dataset.open = '1';
      const car = box.querySelector('.agcar'); if(car) car.textContent = '−';
      try{ agFill(box); }catch(e){}
    }
    try{ dirFavDecorate(); }catch(e){}
    markSeen();
    if(VIEW === 'dir') countEl.textContent = agl.length + (agl.length === 1 ? ' agency' : ' agencies') + ' · ' +
      R.md.length + (R.md.length === 1 ? ' model' : ' models');
  };

  const css = document.createElement('style');
  css.textContent =
    '.agbody .illucards{margin:6px 0 14px}' +

    '.bdh .illuview{display:inline-flex;margin-left:auto;margin-right:10px;border:1px solid var(--line);border-radius:999px;overflow:hidden}' +
    '.bdh .illuview button{font:inherit;font-size:11px;padding:2px 10px;border:0;background:transparent;color:inherit;opacity:.65;cursor:pointer}' +
    '.bdh .illuview button[aria-pressed="true"]{background:var(--line);opacity:1}' +
    '.illumore{display:block;margin:4px auto 16px;font:inherit;font-size:12px;padding:6px 16px;border:1px solid var(--line);border-radius:999px;background:transparent;color:inherit;cursor:pointer}' +
    '.illurech{font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin:18px 0 8px;opacity:.8}' +
    '.illurech s{text-decoration:none;opacity:.6;margin-left:6px;font-weight:400}' +
    '.illuseen{font-size:11px;opacity:.6;margin-right:8px;white-space:nowrap}' +
    '.dftabs [data-dftab="rec"] svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;margin-right:6px;vertical-align:-2px}';
  document.head.appendChild(css);
})();
