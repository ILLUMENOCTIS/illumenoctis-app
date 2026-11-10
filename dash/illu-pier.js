/* Piercings with letters A-H and a count for each spot (user, 2026-11-05: "replace the numbers
   with letters A-H; clicking a letter, you can input how many piercings they have per part").
   Kept on the booking card as before, so everything that reads it still works:
     pll / prl  the spots, "Lobe ×2, Upper lobe, Helix" (no ×n = one)
     pln / prn  the ear's total, worked out from the spots
   Old cards ("Lobe, Upper lobe" and a typed total) read as one in each named spot. */
(function(){
  'use strict';
  if(typeof EARSPOTS === 'undefined' || typeof bvPierHtml !== 'function') return;
  const LT = 'ABCDEFGH';
  const SP = EARSPOTS;                                   // Lobe, Upper lobe, Helix, Tragus, Conch, Daith, Rook, Industrial
  const ko = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const T = s => (ko() && typeof KO !== 'undefined' && KO[s]) || s;
  const E = s => (typeof esc === 'function' ? esc(s) : String(s));
  let SEL = '';                                          // last spot tapped: "pll|2"

  /* "Lobe ×2, Upper lobe" -> [2, 1, 0, ...]; anything not a known spot is kept aside */
  function parse(txt){
    const n = SP.map(() => 0), other = [];
    String(txt || '').split(',').map(s => s.trim()).filter(Boolean).forEach(p => {
      const m = p.match(/^(.*?)\s*(?:[×x*]\s*(\d+))?$/i);
      const nm = (m ? m[1] : p).trim().toLowerCase(), k = m && m[2] ? Math.max(1, +m[2]) : 1;
      const i = SP.findIndex(s => s.toLowerCase() === nm);
      if(i >= 0) n[i] += k; else other.push(p);
    });
    return {n, other};
  }
  function write(n, other){
    return SP.map((s, i) => n[i] ? s + (n[i] > 1 ? ' ×' + n[i] : '') : '').filter(Boolean).concat(other || []).join(', ');
  }
  /* an old card whose total was typed but no spot named still shows that total */
  function total(c, nf, n){ const s = n.reduce((a, b) => a + b, 0); if(s) return s; const t = parseInt(c[nf], 10); return isNaN(t) ? 0 : t; }

  const LINES = typeof EARSVG_LINES !== 'undefined' ? EARSVG_LINES : '';
  const PTS = typeof EARPTS !== 'undefined' ? EARPTS : [];
  function earSvg(lf, n, ro, flip){
    return '<svg class="pzear" viewBox="0 0 100 140" role="group" aria-label="' + E(T('Ear diagram')) + '">' +
      '<g' + (flip ? ' transform="translate(90 0) scale(-1 1)"' : '') + '><g class="earline">' + LINES + '</g></g>' +
      PTS.map(([x, y], i) => {
        const X = flip ? 90 - x : x, k = n[i] || 0;
        return '<g class="pzpt' + (k ? ' on' : '') + (SEL === lf + '|' + i ? ' sel' : '') + '" transform="translate(' + X + ',' + y + ')"' +
          (ro ? '' : ' data-pzadd="' + lf + '|' + i + '" role="button" tabindex="0"') + '><title>' + LT[i] + ' · ' + E(T(SP[i])) + (k ? ' · ' + k : '') + '</title>' +
          '<circle r="6.4"/><text y="2.5">' + LT[i] + '</text>' +
          (k > 1 ? '<g class="pzbd" transform="translate(6,-6)"><circle r="4.8"/><text y="2">' + k + '</text></g>' : '') + '</g>';
      }).join('') + '</svg>';
  }
  function earBlock(c, side, nf, lf, flip, ro){
    const {n} = parse(c[lf]);
    const tot = total(c, nf, n);
    const words = n.map((k, i) => k ? LT[i] + ' ' + T(SP[i]) + (k > 1 ? ' ×' + k : '') : '').filter(Boolean).join(' · ');
    const dis = ro ? ' disabled' : '';
    return '<section class="pzside" data-pzear="' + lf + '"><div class="pzsh"><b>' + E(T(side)) + '</b><span class="pztot"><em>' + tot + '</em> ' +
      E(ko() ? '개' : (tot === 1 ? 'piercing' : 'piercings')) + '</span>' +
      (ro ? '' : '<button type="button" class="pzclr1" data-pzclr="' + lf + '"' + (tot ? '' : ' disabled') + '>' + E(T('Clear this ear')) + '</button>') + '</div>' +
      '<div class="pzbody">' + earSvg(lf, n, ro, flip) + '<div class="pzgrid">' + SP.map((s, i) => {
        const k = n[i] || 0;
        return '<div class="pzcell' + (k ? ' on' : '') + (SEL === lf + '|' + i ? ' sel' : '') + '">' +
          '<button type="button" class="pzlt" data-pzadd="' + lf + '|' + i + '" title="' + E(T('Add one')) + ' · ' + E(T(s)) + '"' + dis + '>' + LT[i] + '</button>' +
          '<span class="pznm">' + E(T(s)) + '</span>' +
          '<span class="pzst"><button type="button" data-pzdel="' + lf + '|' + i + '" aria-label="' + E(T('One less')) + ' · ' + E(T(s)) + '"' + (k && !ro ? '' : ' disabled') + '>−</button>' +
          '<b>' + k + '</b><button type="button" data-pzadd="' + lf + '|' + i + '" aria-label="' + E(T('One more')) + ' · ' + E(T(s)) + '"' + dis + '>+</button></span></div>';
      }).join('') + '</div></div>' +
      (words ? '<p class="pzsum">' + E(words) + '</p>' : '<p class="pzsum none">' + E(ro ? T('None noted') : T('Tap a letter to add one')) + '</p>') + '</section>';
  }
  /* 1.2.117 (user, 9 Nov 2026): a Clear all for the ear selection - both ears at once, or one ear; undo for 8 s */
  const anyEar = c => total(c, 'pln', parse(c.pll).n) + total(c, 'prn', parse(c.prl).n) > 0;
  function allBar(c, ro){
    if(ro) return '';
    const u = UNDO.get(c.id);
    return '<div class="pzbar">' + (u ? '<span class="pzundo">' + E(T(u.lab)) + '</span><button type="button" class="pzclr" data-pzundo>' + E(T('Undo')) + '</button>'
      : '<button type="button" class="pzclr" data-pzclr="all"' + (anyEar(c) ? '' : ' disabled') + '>' + E(T('Clear all')) + '</button>') + '</div>';
  }
  const UNDO = new Map();      // booking id -> {was: {pll, pln, prl, prn}, lab, t}
  function redraw(det, c){
    const ro = typeof SIGNED === 'function' && !SIGNED();
    const box = det.querySelector('.pzpier'); if(!box) return;
    box.innerHTML = allBar(c, ro) + earBlock(c, 'Left ear', 'pln', 'pll', true, ro) + earBlock(c, 'Right ear', 'prn', 'prl', false, ro);
    const sum = det.querySelector('.bvpsum'); if(sum) sum.textContent = bvPierSummary(c);
  }
  function clearEars(btn, which){
    const det = btn.closest('.pzdet'), c = det && typeof BOOK !== 'undefined' && BOOK.get(det.dataset.pzbk); if(!c) return;
    if(typeof SIGNED === 'function' && !SIGNED()){ try{ nudgeSignIn(btn); }catch(e){} return; }
    const was = {pll: c.pll || '', pln: c.pln || '', prl: c.prl || '', prn: c.prn || ''};
    const keepOther = lf => parse(c[lf]).other;              // anything typed that is not a known spot stays
    if(which !== 'prl'){ c.pll = write(SP.map(() => 0), keepOther('pll')); c.pln = ''; }
    if(which !== 'pll'){ c.prl = write(SP.map(() => 0), keepOther('prl')); c.prn = ''; }
    SEL = '';
    const old = UNDO.get(c.id); if(old) clearTimeout(old.t);
    const lab = which === 'all' ? 'Both ears cleared' : which === 'pll' ? 'Left ear cleared' : 'Right ear cleared';
    UNDO.set(c.id, {was, lab, t: setTimeout(() => { UNDO.delete(c.id); const d = document.querySelector('.pzdet[data-pzbk="' + CSS.escape(c.id) + '"]'); if(d) redraw(d, c); }, 8000)});
    try{ saveBook(c.id); }catch(e){}
    redraw(det, c);
  }
  function undoClear(btn){
    const det = btn.closest('.pzdet'), c = det && typeof BOOK !== 'undefined' && BOOK.get(det.dataset.pzbk); if(!c) return;
    const u = UNDO.get(c.id); if(!u) return; clearTimeout(u.t); UNDO.delete(c.id);
    Object.assign(c, u.was); try{ saveBook(c.id); }catch(e){}
    redraw(det, c);
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('.pzdet [data-pzclr], .pzdet [data-pzundo]'); if(!t) return;
    e.preventDefault(); e.stopPropagation(); if(t.disabled) return;
    if(t.dataset.pzundo != null) undoClear(t); else clearEars(t, t.dataset.pzclr);
  }, true);
  window.bvPierHtml = function(c, ro){
    let open = false; try{ open = localStorage.getItem('illum.pieropen') === '1'; }catch(e){}
    return '<details class="bvpdet pzdet"' + (open ? ' open' : '') + ' data-pzbk="' + E(c.id) + '"><summary><span class="bvpsum">' + E(bvPierSummary(c)) + '</span><i class="bvpcar" aria-hidden="true"></i></summary>' +
      '<div class="bvpier pzpier">' + allBar(c, ro) + earBlock(c, 'Left ear', 'pln', 'pll', true, ro) + earBlock(c, 'Right ear', 'prn', 'prl', false, ro) + '</div></details>';
  };
  /* the summary bar reads the worked-out totals */
  window.bvPierSummary = function(c){
    const one = (s, nf, lf) => { const t = total(c, nf, parse(c[lf]).n); return t ? s + ' ' + t : ''; };
    const t = [one('L', 'pln', 'pll'), one('R', 'prn', 'prl')].filter(Boolean).join(' · ');
    return t;                                   // nothing noted: the bar is left blank (user, 2026-11-06)
  };

  function change(btn, d){
    const det = btn.closest('.pzdet'), c = det && typeof BOOK !== 'undefined' && BOOK.get(det.dataset.pzbk);
    if(!c) return;
    if(typeof SIGNED === 'function' && !SIGNED()){ try{ nudgeSignIn(btn); }catch(e){} return; }
    const [lf, si] = (btn.dataset.pzadd || btn.dataset.pzdel).split('|'), i = +si;
    const nf = lf === 'pll' ? 'pln' : 'prn';
    const p = parse(c[lf]);
    /* an old card with a typed total and no spots: start from what is shown */
    p.n[i] = Math.max(0, Math.min(20, (p.n[i] || 0) + d));
    c[lf] = write(p.n, p.other);
    const s = p.n.reduce((a, b) => a + b, 0);
    c[nf] = s ? String(s) : '';
    SEL = lf + '|' + i;
    try{ saveBook(c.id); }catch(e){}
    /* redraw only this panel, in place, so it stays open and the page does not jump */
    const ro = typeof SIGNED === 'function' && !SIGNED();
    const sec = det.querySelector('.pzside[data-pzear="' + lf + '"]');
    if(sec){ const tmp = document.createElement('div'); tmp.innerHTML = earBlock(c, lf === 'pll' ? 'Left ear' : 'Right ear', nf, lf, lf === 'pll', ro); sec.replaceWith(tmp.firstChild); }
    det.querySelectorAll('.pzside').forEach(x => { if(x.dataset.pzear !== lf) x.querySelectorAll('.sel').forEach(y => y.classList.remove('sel')); });
    const sum = det.querySelector('.bvpsum'); if(sum) sum.textContent = bvPierSummary(c);
    { const u = UNDO.get(c.id); if(u){ clearTimeout(u.t); UNDO.delete(c.id); } const bar = det.querySelector('.pzbar'); if(bar){ const tb = document.createElement('div'); tb.innerHTML = allBar(c, ro); if(tb.firstChild) bar.replaceWith(tb.firstChild); } }
    const again = det.querySelector('[data-pzear="' + lf + '"] ' + (btn.dataset.pzdel ? '[data-pzdel="' : '.pzst [data-pzadd="') + lf + '|' + i + '"]');
    if(again && document.activeElement === document.body) try{ again.focus({preventScroll: true}); }catch(e){}
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('.pzdet [data-pzadd], .pzdet [data-pzdel]');
    if(!t) return;
    e.preventDefault(); e.stopPropagation();
    if(t.disabled) return;
    change(t, t.dataset.pzdel ? -1 : 1);
  }, true);
  document.addEventListener('keydown', e => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const g = e.target.closest && e.target.closest('.pzpt[data-pzadd]');
    if(!g) return;
    e.preventDefault(); change(g, 1);
  }, true);

  const css = document.createElement('style');
  css.textContent = [
    '.bv .pzpier{display:flex;flex-direction:column;gap:8px;padding:2px 0 4px}',
    '.bv .pzbar{display:flex;justify-content:flex-end;align-items:center;gap:8px}',
    '.bv .pzclr{border:1px solid #A8323C;color:#A8323C;background:none;border-radius:999px;padding:4px 12px;font:600 12px var(--sans,inherit);cursor:pointer;min-height:28px}',
    '.bv .pzclr:hover:not([disabled]){background:color-mix(in srgb,#A8323C 10%,transparent)}.bv .pzclr[disabled]{opacity:.35;cursor:default}',
    '.bv .pzclr[data-pzundo]{border-color:var(--acc);color:var(--acc)}.bv .pzundo{font-size:12px;color:var(--mut)}',
    '.bv .pzclr1{margin-left:auto;border:0;background:none;color:var(--mut);font:12px var(--sans,inherit);text-decoration:underline;cursor:pointer;padding:0 2px}',
    '.bv .pzclr1[disabled]{opacity:.35;cursor:default}.bv .pzclr1:hover:not([disabled]){color:#A8323C}',
    '.bv .pzside{border:1px solid var(--line);border-radius:10px;padding:9px 9px 7px;background:var(--surf,#fff)}',
    '.bv .pzsh{display:flex;gap:8px;align-items:baseline;margin-bottom:5px}',
    '.bv .pzsh b{font:600 10px var(--sans,inherit);letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}',
    '.bv .pztot{font-size:12px;color:var(--mut)}.bv .pztot em{font-style:normal;font-size:16px;font-weight:600;color:var(--acc);margin-right:2px}',
    '.bv .pzbody{display:flex;gap:6px;align-items:center}',
    '.bv .pzear{width:76px;flex:none;overflow:visible}',
    '.bv .pzear .earline path{fill:none;stroke:#5A4652;stroke-width:1.4;stroke-linecap:round}.bv .pzear .earline .earskin{fill:#F6E3DA}',
    '.bv .pzpt{cursor:pointer}.bv .pzpt>circle{fill:#fff;stroke:var(--faint,#b3a9b1);stroke-width:1}',
    '.bv .pzpt>text{font:600 7px var(--sans,sans-serif);text-anchor:middle;fill:var(--mut);pointer-events:none}',
    '.bv .pzpt:hover>circle{stroke:var(--acc);stroke-width:1.6}',
    '.bv .pzpt.on>circle{fill:var(--acc);stroke:var(--acc)}.bv .pzpt.on>text{fill:#fff}',
    '.bv .pzpt.sel>circle{stroke:#E9B949;stroke-width:2.4}',
    '.bv .pzbd circle{fill:#E9B949;stroke:#fff;stroke-width:1}.bv .pzbd text{font:700 6px var(--sans,sans-serif);text-anchor:middle;fill:#231B22}',
    '.bv .pzgrid{flex:1;min-width:0;display:grid;grid-template-columns:1fr 1fr;gap:4px}',
    '.bv .pzcell{display:flex;align-items:center;gap:4px;border:1px solid var(--line);border-radius:8px;padding:3px 3px 3px 4px;min-width:0;background:var(--surf,#fff);transition:background .12s,border-color .12s}',
    '.bv .pzlt{flex:none;width:19px;height:19px;border-radius:50%;display:grid;place-items:center;font:700 10.5px var(--sans,inherit);border:1px solid var(--faint,#b3a9b1);color:var(--mut);background:transparent;padding:0;cursor:pointer}',
    '.bv .pzlt:hover:not([disabled]){border-color:var(--acc);color:var(--acc)}',
    '.bv .pznm{flex:1;min-width:0;font-size:11px;letter-spacing:-.01em;line-height:1.12;white-space:normal;overflow-wrap:anywhere;color:var(--mut)}',
    '.bv .pzst{display:flex;align-items:center;gap:1px;flex:none}',
    '.bv .pzst button{width:16px;height:19px;border:0;border-radius:5px;background:transparent;color:var(--acc);font:600 13px var(--sans,inherit);padding:0;line-height:1;cursor:pointer}',
    '.bv .pzst button:hover:not([disabled]){background:color-mix(in srgb,var(--acc) 14%,transparent)}',
    '.bv .pzcell:not(.on) .pzst button[data-pzdel]{display:none}',
    '.bv .pzst button[disabled]{cursor:default;opacity:.35}',
    '.bv .pzst b{min-width:12px;text-align:center;font-size:12px;font-weight:600;color:var(--faint,#b3a9b1);font-variant-numeric:tabular-nums}',
    '.bv .pzcell.on{border-color:color-mix(in srgb,var(--acc) 35%,var(--line));background:color-mix(in srgb,var(--acc) 6%,var(--surf,#fff))}',
    '.bv .pzcell.on .pzlt{background:var(--acc);border-color:var(--acc);color:#fff}.bv .pzcell.on .pznm{color:var(--ink);font-weight:500}',
    '.bv .pzcell.on .pzst b{color:var(--acc)}.bv .pzcell.on .pzst button{background:color-mix(in srgb,var(--acc) 10%,transparent)}',
    '.bv .pzcell.sel{box-shadow:0 0 0 2px #E9B949}',
    '.bv .pzsum{margin:7px 2px 0;font-size:12px;color:var(--ink)}.bv .pzsum.none{color:var(--faint,#b3a9b1);font-style:italic}',
    /* the opened box from illu-bkfix gets out of the way of the new layout */
    '.bv .bvpdet[open] > .bvpier.pzpier{border:0!important;padding:0!important;background:none!important}'
  ].join('\n');
  document.head.appendChild(css);
  try{ if(typeof KO !== 'undefined') Object.assign(KO, {'Left ear': '왼쪽 귀', 'Right ear': '오른쪽 귀', 'Tap a letter to add one': '글자를 눌러 추가하세요', 'Add one': '하나 추가', 'One more': '하나 더', 'One less': '하나 빼기', 'None noted': '기록 없음', 'Ear diagram': '귀 그림', 'Clear all': '모두 지우기', 'Clear this ear': '이 귀 지우기', 'Undo': '되돌리기', 'Both ears cleared': '양쪽 귀를 지웠습니다', 'Left ear cleared': '왼쪽 귀를 지웠습니다', 'Right ear cleared': '오른쪽 귀를 지웠습니다'}); }catch(e){}
})();
