
/* ---- tattoos and ear piercings, typed on the Profile view and kept on the card ----
   ttn / ttl: how many tattoos and where. pln / pll, prn / prl: how many piercings in the
   left and right ear and where on the ear; the place names can be tapped in. */
const EARSPOTS = ['Lobe', 'Upper lobe', 'Helix', 'Tragus', 'Conch', 'Daith', 'Rook', 'Industrial'];
const bvv = (c, f) => (c[f] == null ? '' : String(c[f]));
function bvTatCnt(c, ro){
  return '<input class="bvin bvtcnt" inputmode="numeric" data-bk="' + esc(c.id) + '" data-bf="ttn" placeholder="0" aria-label="How many tattoos" value="' + esc(bvv(c, 'ttn')) + '"' + (ro ? ' readonly title="Sign in to edit"' : '') + '>';
}
function bvTatLoc(c, ro){
  return '<input class="bvin bvtloc" data-bk="' + esc(c.id) + '" data-bf="ttl" placeholder="e.g. left wrist, upper back" aria-label="Where the tattoos are" value="' + esc(bvv(c, 'ttl')) + '"' + (ro ? ' readonly title="Sign in to edit"' : '') + '>';
}
function bvTatHtml(c, ro){
  const R = ro ? ' readonly title="Sign in to edit"' : '';
  return '<span class="bvtat"><input class="bvin bvcnt" inputmode="numeric" data-bk="' + esc(c.id) + '" data-bf="ttn" placeholder="0" aria-label="How many tattoos" value="' + esc(bvv(c, 'ttn')) + '"' + R + '>' +
    '<input class="bvin bvloc" data-bk="' + esc(c.id) + '" data-bf="ttl" placeholder="Where — e.g. left wrist, upper back" aria-label="Where the tattoos are" value="' + esc(bvv(c, 'ttl')) + '"' + R + '></span>';
}
/* a right ear seen from the side, face to the right; the left ear is the same drawing turned */
const EARSVG_LINES = '<path class="earskin" d="M68,34 C71,17 59,5 43,6 C23,8 10,29 12,54 C13,71 21,83 27,95 C31,104 29,112 33,121 C39,133 57,134 62,124 C65,117 62,110 66,104 C69,98 73,94 72,86 C71,80 75,77 77,72 C79,66 75,62 72,60 C67,57 64,52 66,46 C67,41 67,37 68,34 Z"/>' +
  '<path d="M63,31 C64,19 55,12 44,13 C29,15 19,31 20,52 C21,68 28,80 34,92"/>' +
  '<path d="M34,92 C38,82 42,70 43,58 C44,46 50,35 58,30"/><path d="M43,52 C40,43 35,36 29,32"/>' +
  '<path d="M45,60 C51,55 60,57 63,64 C66,72 62,84 53,87 C48,89 44,86 42,82"/><path d="M66,46 C60,47 54,50 50,55"/>' +
  '<path d="M42,82 C44,88 50,93 57,92"/>';
/* where each numbered spot sits on that drawing */
const EARPTS = [[46,119], [33,104], [16,44], [74,69], [54,73], [57,50], [37,42], [45,20.5]];
function earSvg(lf, have, ro, flip){
  const on = i => have.includes(EARSPOTS[i].toLowerCase());
  return '<svg class="earsvg" viewBox="0 0 100 140" role="group" aria-label="Ear diagram">' +
    '<g' + (flip ? ' transform="translate(90 0) scale(-1 1)"' : '') + '><g class="earline">' + EARSVG_LINES + '</g>' +
    '<line class="earind' + (on(7) ? ' on' : '') + '" x1="30" y1="14" x2="60" y2="27"/></g>' +
    EARPTS.map(([x, y], i) => {
      const X = flip ? 90 - x : x;
      return '<g class="earpt' + (on(i) ? ' on' : '') + '" transform="translate(' + X + ',' + y + ')"' + (ro ? '' : ' data-earspot="' + lf + '|' + EARSPOTS[i] + '" role="button" tabindex="0"') +
        ' aria-pressed="' + on(i) + '"><title>' + (i + 1) + ' · ' + EARSPOTS[i] + '</title><circle r="5.6"/><text y="2.2">' + (i + 1) + '</text></g>';
    }).join('') + '</svg>';
}
function bvPierSummary(c){
  const one = (s, nf, lf) => { const n = bvv(c, nf).trim(), l = bvv(c, lf).trim(); return (n || l) ? s + ' ' + (n || '?') : ''; };
  const t = [one('L', 'pln', 'pll'), one('R', 'prn', 'prl')].filter(Boolean).join(' · ');
  return t || 'none noted';
}
function bvPierHtml(c, ro){
  const R = ro ? ' readonly title="Sign in to edit"' : '';
  let open = false; try{ open = localStorage.getItem('illum.pieropen') === '1'; }catch(e){}
  const ear = (side, nf, lf, flip) => {
    const have = bvv(c, lf).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    return '<div class="bvear">' + earSvg(lf, have, ro, flip) + '<div class="bvearr"><b>' + side + '</b>' +
      '<span class="bvearin"><input class="bvin bvcnt" inputmode="numeric" data-bk="' + esc(c.id) + '" data-bf="' + nf + '" placeholder="0" aria-label="' + side + ': how many piercings" value="' + esc(bvv(c, nf)) + '"' + R + '>' +
      '<input class="bvin bvloc" data-bk="' + esc(c.id) + '" data-bf="' + lf + '" placeholder="Where on the ear" aria-label="' + side + ': where" value="' + esc(bvv(c, lf)) + '"' + R + '></span>' +
      '<span class="bvearch">' + EARSPOTS.map((s, i) => '<button type="button" data-earspot="' + lf + '|' + s + '" aria-pressed="' + have.includes(s.toLowerCase()) + '"' + (ro ? ' disabled' : '') + '><i>' + (i + 1) + '</i>' + s + '</button>').join('') + '</span></div></div>';
  };
  return '<details class="bvpdet"' + (open ? ' open' : '') + '><summary><span class="bvpsum">' + esc(bvPierSummary(c)) + '</span><i class="bvpcar" aria-hidden="true"></i></summary>' +
    '<div class="bvpier">' + ear('Left ear', 'pln', 'pll', true) + ear('Right ear', 'prn', 'prl', false) + '</div></details>';
}
document.addEventListener('click', e => {
  const s = e.target.closest && e.target.closest('.bvpdet>summary');
  if(s) s.parentElement.dataset.user = '1';
}, true);
/* the open/closed state is kept, so a redraw does not fold it away */
document.addEventListener('toggle', e => {
  if(e.target && e.target.classList && e.target.classList.contains('bvpdet')){
    try{ localStorage.setItem('illum.pieropen', e.target.open ? '1' : '0'); }catch(_){}
    /* the slide-in plays when somebody opens it, never when the panel is redrawn */
    if(e.target.open && e.target.dataset.user === '1'){ e.target.classList.add('bvpanim'); }
    e.target.dataset.user = '';
  }
}, true);
function bvTatText(c){
  const n = bvv(c, 'ttn').trim(), l = bvv(c, 'ttl').trim();
  if(!n && !l) return null;
  if(n === '0' && !l) return 'None';
  return esc([n ? n + (n === '1' ? ' tattoo' : ' tattoos') : '', l].filter(Boolean).join(' · '));
}
function bvPierText(c){
  const one = (side, nf, lf) => { const n = bvv(c, nf).trim(), l = bvv(c, lf).trim();
    if(!n && !l) return ''; return side + ': ' + [n || '', l ? (n ? '(' + l + ')' : l) : ''].filter(Boolean).join(' '); };
  const s = [one('Left ear', 'pln', 'pll'), one('Right ear', 'prn', 'prl')].filter(Boolean);
  return s.length ? esc(s.join(' · ')) : null;
}
/* a place on the ear tapped in or out of the list beside it */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-earspot]');
  if(!b) return;
  e.preventDefault(); e.stopPropagation();
  if(!SIGNED()){ try{ nudgeSignIn(b); }catch(_){} return; }
  const [lf, spot] = b.dataset.earspot.split('|');
  const ear = b.closest('.bvear'), inp = ear && ear.querySelector('.bvloc[data-bf="' + lf + '"]');
  if(!inp) return;
  let parts = inp.value.split(',').map(s => s.trim()).filter(Boolean);
  const i = parts.findIndex(p => p.toLowerCase() === spot.toLowerCase());
  if(i >= 0) parts.splice(i, 1); else parts.push(spot);
  inp.value = parts.join(', ');
  ear.querySelectorAll('[data-earspot="' + lf + '|' + spot + '"]').forEach(x => { x.setAttribute('aria-pressed', String(i < 0)); x.classList.toggle('on', i < 0); });
  inp.dispatchEvent(new Event('input', {bubbles: true}));
  const sum = ear.closest('.bvpdet') && ear.closest('.bvpdet').querySelector('.bvpsum');
  const c = BOOK.get(inp.dataset.bk); if(sum && c) sum.textContent = bvPierSummary(c);
}, true);
document.addEventListener('keydown', e => {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const g = e.target.closest && e.target.closest('.earpt[data-earspot]');
  if(!g) return;
  e.preventDefault(); g.dispatchEvent(new MouseEvent('click', {bubbles: true}));
}, true);
/* typed place names light the matching buttons */
document.addEventListener('input', e => {
  const inp = e.target;
  if(!inp || !inp.matches || !inp.matches('.bvear .bvloc')) return;
  const have = inp.value.split(',').map(s => s.trim().toLowerCase());
  inp.closest('.bvear').querySelectorAll('[data-earspot]').forEach(b => {
    const on = have.includes(b.dataset.earspot.split('|')[1].toLowerCase());
    b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); });
});
document.addEventListener('input', e => {
  const inp = e.target;
  if(!inp || !inp.matches || !inp.matches('.bvear input')) return;
  const sum = inp.closest('.bvpdet') && inp.closest('.bvpdet').querySelector('.bvpsum');
  const c = BOOK.get(inp.dataset.bk); if(sum && c) sum.textContent = bvPierSummary(c);
});
