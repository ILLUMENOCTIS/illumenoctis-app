/* Booking window, documents (PDF, Word, Excel, PowerPoint, text) - user, 2026-11-05:
   - zoom inside the document, not the whole window: − / % / + in the toolbar, Ctrl + wheel or
     Ctrl +/- over the document, + and - keys; a PDF is drawn again at the new size so it stays sharp
   - Edit: opens the real file (in its Dropbox / BOOKING folder) in this computer's own program for
     it - Word, Excel, PowerPoint, the PDF editor - with every tool they have; saving there saves the
     file in place, and this window shows the new version by itself. */
(function(){
  'use strict';
  if(typeof bvDrawStage !== 'function') return;
  const DOCS = new Set(['pdf', 'docx', 'sheet', 'pptx', 'text', 'doc']);
  const ko = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const T = (en, k) => ko() ? k : en;
  let Z = 1, ZKEY = '', drawnZ = 1, reT = 0;
  const cur = () => { try{ const L = bvList(); return L[bv.i] || null; }catch(e){ return null; } };
  const keyOf = f => f ? bv.id + '|' + bv.tab + '|' + f.name : '';
  const kindOf = f => { try{ return bvKind(f); }catch(e){ return ''; } };
  const appName = f => { const n = String(f && f.name || '').toLowerCase();
    if(/\.(docx?|rtf|odt)$/.test(n)) return 'Word'; if(/\.(xlsx|xlsm|xlsb|xls|csv|ods)$/.test(n)) return 'Excel';
    if(/\.(pptx?|odp)$/.test(n)) return 'PowerPoint'; if(/\.pdf$/.test(n)) return T('PDF editor', 'PDF 편집기'); return T('its program', '연결 프로그램'); };
  const PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';

  /* a PDF is drawn again at the new size (the page and its words grow, sharp); until then the old
     drawing is scaled so the change shows at once. Word, Excel, PowerPoint and text scale as they are. */
  const isPdf = () => kindOf(cur()) === 'pdf';
  function apply(){
    const d = bvStage && bvStage.querySelector('.bvdoc');
    if(d){
      if(isPdf()){ d.style.setProperty('--bvdz', '1'); d.style.setProperty('--bvdzt', String(Z / drawnZ)); }
      else { d.style.setProperty('--bvdz', String(Z)); d.style.setProperty('--bvdzt', '1'); }
      d.classList.toggle('bvdzon', Z !== 1);
    }
    const lab = bvStage && bvStage.querySelector('.bvdzlab'); if(lab) lab.textContent = Math.round(Z * 100) + '%';
    const o = bvStage && bvStage.querySelector('[data-bvdz="-"]'); if(o) o.disabled = Z <= 0.5;
    const i = bvStage && bvStage.querySelector('[data-bvdz="+"]'); if(i) i.disabled = Z >= 4;
  }
  function redrawSoon(){
    clearTimeout(reT);
    if(!isPdf() || Math.abs(Z - drawnZ) < 0.01) return;
    const d = bvStage.querySelector('.bvdoc');
    /* the point in the middle of the view stays in the middle */
    const cy = d ? (d.scrollTop + d.clientHeight / 2) / Math.max(1, d.scrollHeight) : 0, cx = d ? (d.scrollLeft + d.clientWidth / 2) / Math.max(1, d.scrollWidth) : 0.5;
    reT = setTimeout(async () => {
      const c = bv && BOOK.get(bv.id); if(!c) return;
      window.__bvDZ = Z; const want = Z;
      await bvDrawStage(c, BVLOAD.get(c.id));
      drawnZ = want; apply();
      const t0 = Date.now();
      /* the pages arrive one after another: keep the same middle point until they are all there */
      let lastH = -1;
      const back = () => { const d2 = bvStage.querySelector('.bvdoc');
        if(d2 && d2.scrollHeight !== lastH){ lastH = d2.scrollHeight; d2.scrollTop = cy * d2.scrollHeight - d2.clientHeight / 2; d2.scrollLeft = cx * d2.scrollWidth - d2.clientWidth / 2; }
        if(Date.now() - t0 < 3000) setTimeout(back, 120); };
      back();
    }, 260);
  }
  function zoom(d){
    const f = cur(); if(!f || !DOCS.has(kindOf(f))) return false;
    const steps = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
    if(d === '0') Z = 1;
    else { let i = steps.findIndex(s => s >= Z - 0.001); if(i < 0) i = steps.length - 1;
      Z = d === '+' ? steps[Math.min(steps.length - 1, steps[i] > Z + 0.001 ? i : i + 1)] : steps[Math.max(0, steps[i] < Z - 0.001 ? i : i - 1)]; }
    /* the middle of the view stays the middle while it grows or shrinks */
    const dd = bvStage.querySelector('.bvdoc');
    const cx = dd && dd.scrollWidth > dd.clientWidth ? (dd.scrollLeft + dd.clientWidth / 2) / dd.scrollWidth : 0.5;
    const cy = dd && dd.scrollHeight > dd.clientHeight ? (dd.scrollTop + dd.clientHeight / 2) / dd.scrollHeight : 0;
    apply();
    if(dd){ dd.scrollLeft = cx * dd.scrollWidth - dd.clientWidth / 2; if(cy) dd.scrollTop = cy * dd.scrollHeight - dd.clientHeight / 2; }
    redrawSoon(); return true;
  }
  window.__bvDocZoom = zoom;

  function tools(){
    if(!bv || bvEl.hidden) return;
    const f = cur(), kd = kindOf(f), tool = bvStage.querySelector('.bvtool');
    if(!f || !tool || !DOCS.has(kd)) return;
    if(keyOf(f) !== ZKEY){ ZKEY = keyOf(f); Z = 1; drawnZ = 1; window.__bvDZ = 1; }
    else if(isPdf()) drawnZ = window.__bvDZ || 1;
    if(!tool.querySelector('.bvdzw')){
      const w = document.createElement('span'); w.className = 'bvdzw';
      w.innerHTML = '<button type="button" class="bvtb" data-bvdz="-" title="' + T('Zoom out (−)', '축소 (−)') + '" aria-label="' + T('Zoom out', '축소') + '">' + BVZOUTSVG + '</button>' +
        '<button type="button" class="bvdzlab" data-bvdz="0" title="' + T('Back to 100%', '100%로') + '">100%</button>' +
        '<button type="button" class="bvtb" data-bvdz="+" title="' + T('Zoom in (+)', '확대 (+)') + '" aria-label="' + T('Zoom in', '확대') + '">' + BVZINSVG + '</button><i class="bvsep"></i>';
      const sep = tool.querySelectorAll('.bvsep'); const at = sep[sep.length - 1];
      if(at && at.nextSibling) tool.insertBefore(w, at.nextSibling); else tool.appendChild(w);
    }
    const g0 = BVLOAD.get(bv.id);
    if(f._rid && g0 && g0.loc === 'dbx' && window.illu && window.illu.dropboxWeb && !tool.querySelector('[data-bvedweb]')){
      const b = document.createElement('button'); b.type = 'button'; b.className = 'bvtb bvedit bvedweb'; b.dataset.bvedweb = '';
      b.title = T('Edit here, in ILLUMENOCTIS (Dropbox: ', '여기서 편집 (Dropbox: ') + (/\.pdf$/i.test(f.name) ? T('PDF editor', 'PDF 편집기') : appName(f) + T(' for the web', ' 웹')) + T(') — saves into the same Dropbox file', ') — 같은 Dropbox 파일에 저장');
      b.innerHTML = PEN + '<span>' + T('Edit here', '여기서 편집') + '</span>';
      tool.appendChild(b);
    }
    if(f._rid && window.illu && window.illu.bookingEdit && !tool.querySelector('[data-bvedit]')){
      const b = document.createElement('button'); b.type = 'button'; b.className = 'bvtb bvedit'; b.dataset.bvedit = '';
      b.title = T('Edit in ', '편집: ') + appName(f) + T(' — saves straight into the folder', ' — 저장하면 폴더에 바로 저장됩니다');
      b.innerHTML = PEN + '<span>' + (/\.pdf$/i.test(f.name) ? 'Acrobat' : appName(f)) + '</span>';
      b.classList.add('bvedapp');
      tool.appendChild(b);
    }
    apply();
  }
  const draw0 = bvDrawStage;
  window.bvDrawStage = function(){
    const r = draw0.apply(this, arguments);
    try{ tools(); }catch(e){}
    Promise.resolve(r).then(() => { try{ tools(); }catch(e){} });
    return r;
  };

  bvEl.addEventListener('click', e => {
    const z = e.target.closest && e.target.closest('[data-bvdz]');
    if(z){ e.preventDefault(); e.stopPropagation(); zoom(z.dataset.bvdz); return; }
    const ew = e.target.closest && e.target.closest('[data-bvedweb]');
    if(ew){
      e.preventDefault(); e.stopPropagation();
      const f = cur(); if(!f || !f._rid) return;
      if(typeof SIGNED === 'function' && !SIGNED()){ try{ nudgeSignIn(ew); }catch(err){} return; }
      ew.disabled = true;
      Promise.resolve(illu.dropboxWeb(f._rid)).then(r => { ew.disabled = false;
        try{ bvSay(r && r.ok ? T('Opened in the Dropbox window — sign in there the first time; saving there saves the Dropbox file', 'Dropbox 창에서 열었습니다 — 처음 한 번 로그인하세요. 저장하면 Dropbox 파일에 저장됩니다')
          : r && r.why === 'not in Dropbox' ? T('This file is not in the Dropbox folder', '이 파일은 Dropbox 폴더에 없습니다') : T('Could not open: ', '열 수 없습니다: ') + (r && r.why || '')); }catch(err){} }, () => { ew.disabled = false; });
      return;
    }
    const ed = e.target.closest && e.target.closest('[data-bvedit]');
    if(ed){
      e.preventDefault(); e.stopPropagation();
      const f = cur(); if(!f || !f._rid) return;
      if(typeof SIGNED === 'function' && !SIGNED()){ try{ nudgeSignIn(ed); }catch(err){} return; }
      ed.disabled = true;
      Promise.resolve(illu.bookingEdit(f._rid)).then(r => {
        ed.disabled = false;
        try{ bvSay(r && r.ok ? T('Opened in ', '열었습니다: ') + appName(f) + T(' — save there and the change shows here', ' — 저장하면 여기에 바로 반영됩니다')
          : r && r.why === 'gone' ? T('The file has moved — press Refresh', '파일이 옮겨졌습니다 — 새로고침을 누르세요')
          : T('Could not open: ', '열 수 없습니다: ') + (r && r.why || '')); }catch(err){}
      }, () => { ed.disabled = false; });
    }
  }, true);
  /* Ctrl + wheel over a document zooms the document (the program sends it here instead of zooming the window) */
  document.addEventListener('pointerover', e => {
    const on = !!(e.target.closest && e.target.closest('.bv .bvdoc')) && !!bv && !bvEl.hidden;
    if(on !== !!window.__illuZoomDoc){ window.__illuZoomDoc = on; try{ window.__illuZoomSend && window.__illuZoomSend(); }catch(err){} }
  });
  bvStage.addEventListener('wheel', e => {
    if(!(e.ctrlKey || e.metaKey) || !(e.target.closest && e.target.closest('.bvdoc'))) return;
    if(window.illu && window.illu.zoomTarget) return;       // the program sends it as a zoom step
    e.preventDefault(); zoom(e.deltaY < 0 ? '+' : '-');
  }, {passive: false});
  document.addEventListener('keydown', e => {
    if(!bv || bvEl.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    const ae = document.activeElement; if(ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || ae.isContentEditable)) return;
    const f = cur(); if(!f || !DOCS.has(kindOf(f))) return;
    if(e.key === '+' || e.key === '='){ if(zoom('+')) e.preventDefault(); }
    else if(e.key === '-' || e.key === '_'){ if(zoom('-')) e.preventDefault(); }
  }, true);
  /* the file was saved in Word / Excel / ...: show the new version, on the same file */
  if(window.illu && window.illu.onBookingChanged) window.illu.onBookingChanged(x => {
    const c = bv && BOOK.get(bv.id), g = c && BVLOAD.get(c.id); if(!c || !g || !g.loc || typeof bvOpenSrc !== 'function') return;
    const name = x && x.name, tab = bv.tab;
    clearTimeout(window.__bvChgT);
    window.__bvChgT = setTimeout(async () => {
      await bvOpenSrc(c, g.loc, true);
      if(!bv || bv.id !== c.id) return;
      bv.tab = tab; const L = bvList(), j = L.findIndex(f => f.name === name); if(j >= 0) bv.i = j;
      try{ bvMsgNext = T('Saved changes shown · ', '저장된 내용을 반영했습니다 · ') + name; }catch(e){}
      bvDraw();
    }, 900);
  });
  const css = document.createElement('style');
  css.textContent = '.bv .bvmedia .bvdoc canvas{max-height:none!important;height:auto!important;object-fit:fill!important}.bv .bvdoc>*{zoom:var(--bvdz,1)}.bv .bvdoc--pdf>canvas{zoom:var(--bvdzt,1)}.bv .bvdoc.bvdzon>*,.bv .bvdoc.bvdzon canvas{max-width:none!important;flex-shrink:0}.bv .bvdoc.bvdzon{align-items:flex-start!important;justify-content:flex-start!important}' +
    '.bv .bvtool .bvedit,.bv .bvtool .bvedit span,.bv .bvtool .bvedit svg{color:#fff!important;opacity:1!important;stroke:#fff}' +
    '.bv .bvdzw{display:inline-flex;align-items:center;gap:2px}' +
    '.bv .bvdzlab{min-width:46px;border:0;background:transparent;font:500 12px var(--mono,monospace);color:inherit;cursor:pointer;padding:0 2px;font-variant-numeric:tabular-nums}' +
    '.bv .bvdzlab:hover{text-decoration:underline}' +
    '.bv .bvedit{width:auto!important;padding:0 10px 0 8px!important;gap:5px;display:inline-flex;align-items:center;background:var(--acc,#6b2a63)!important;color:#fff!important;border-radius:8px}' +
    '.bv .bvedit span{font:600 12px var(--sans,inherit);white-space:nowrap}.bv .bvedit svg{width:15px;height:15px}' +
    '.bv .bvedit:hover{filter:brightness(1.12)}.bv .bvtool .bvedit.bvedapp{background:var(--surf,#fff)!important;color:var(--acc,#6b2a63)!important;border:1px solid color-mix(in srgb,var(--acc,#6b2a63) 40%,transparent)}.bv .bvtool .bvedit.bvedapp span,.bv .bvtool .bvedit.bvedapp svg{color:var(--acc,#6b2a63)!important;stroke:var(--acc,#6b2a63)}.bv .bvtool .bvedit+.bvedit{margin-left:4px}';
  document.head.appendChild(css);
})();
