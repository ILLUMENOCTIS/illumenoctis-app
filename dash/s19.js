
/* ================= Directory favourites =================
   A heart beside each agency, the same favourites the Atlas keeps (one list per ID).
   The Favorites page lists them numbered, in the order you drag them into. */
var DIRFAV = false;
const DFHEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3s-7.6-4.6-9.3-9.6C1.6 7.4 3.7 4.2 7 4.2c2 0 3.6 1.1 5 2.9 1.4-1.8 3-2.9 5-2.9 3.3 0 5.4 3.2 4.3 6.5-1.7 5-9.3 9.6-9.3 9.6z"/></svg>';
const dfList = () => { try{ return window.ATLFAV ? ATLFAV.list() : []; }catch(e){ return []; } };
function dirFavTabs(){
  const n = dfList().filter(d => AG.some(a => a.domain === d)).length;
  return '<div class="dftabs" role="tablist"><button type="button" role="tab" data-dftab="all" aria-selected="' + !DIRFAV + '">All agencies</button>' +
    '<button type="button" role="tab" data-dftab="fav" aria-selected="' + DIRFAV + '">' + DFHEART + 'Directory favorites<b>' + n + '</b></button></div>';
}
function dirFavRender(rows){
  const fav = dfList(), at = new Map(fav.map((d, i) => [d, i]));
  const l = rows.filter(r => at.has(r.a.domain)).sort((p, q) => at.get(p.a.domain) - at.get(q.a.domain));
  const wasOpen = [...main.querySelectorAll('.ag[data-open="1"]')].map(b => AG[+b.dataset.i]).filter(Boolean);
  const more = fav.filter(d => AG.some(a => a.domain === d)).length - l.length;
  main.innerHTML = dirFavTabs() +
    '<div class="dfhd"><h2>Directory favorites</h2><p><b>' + l.length + '</b> ' + (l.length === 1 ? 'agency' : 'agencies') +
      ' · drag a number to change the order' + (more > 0 ? ' · ' + more + ' hidden by the filters or search' : '') + '</p></div>' +
    (l.length ? '<section class="dfsec"><div class="ctygrp">' + DIRTH + l.map(dirAgRow).join('') + '</div></section>'
      : '<div class="nomatch"><h2>No favorites yet</h2><p>Tap the heart beside any agency — here or on the Atlas map — and it is kept on this page, in the order you choose.</p></div>');
  for(const a of wasOpen){
    const box = main.querySelector('.ag[data-i="' + AG.indexOf(a) + '"]');
    if(!box) continue;
    box.dataset.open = '1';
    const car = box.querySelector('.agcar'); if(car) car.textContent = '−';
    try{ agFill(box); }catch(e){}
  }
  dirFavDecorate();
  if(VIEW === 'dir') countEl.textContent = l.length + (l.length === 1 ? ' favorite' : ' favorites');
}
/* every agency row gets its heart; on the Favorites page also its number */
function dirFavDecorate(){
  const fav = dfList();
  const rows = [...main.querySelectorAll('.ag[data-i]')];
  rows.forEach((box, i) => {
    const a = AG[+box.dataset.i]; if(!a) return;
    const l1 = box.querySelector('.agl1'); if(!l1) return;
    let hb = l1.querySelector('.dfheart');
    const on = fav.includes(a.domain);
    if(!hb){
      l1.insertAdjacentHTML('afterbegin', '<button type="button" class="dfheart" data-dfheart>' + DFHEART + '</button>');
      hb = l1.querySelector('.dfheart');
    }
    hb.classList.toggle('on', on);
    hb.setAttribute('aria-pressed', String(on));
    hb.title = on ? 'Remove from favorites' : 'Add to favorites';
    hb.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + a.name + (on ? ' from favorites' : ' to favorites'));
    if(DIRFAV){
      let num = l1.querySelector('.dfnum');
      if(!num){ l1.insertAdjacentHTML('afterbegin', '<span class="dfnum" title="Drag to change the order"></span>'); num = l1.querySelector('.dfnum'); }
      num.textContent = i + 1;
      box.classList.add('dford');
    }
  });
}
new MutationObserver(() => { if(VIEW === 'dir' && main.querySelector('.ag[data-i] .agl1:not(:has(.dfheart))')) dirFavDecorate(); })
  .observe(main, {childList: true});
/* clicks: a heart toggles, a tab switches - neither opens the agency card */
main.addEventListener('click', e => {
  if(DFDRAGJUST){ DFDRAGJUST = false; e.stopPropagation(); e.preventDefault(); return; }
  const hb = e.target.closest && e.target.closest('[data-dfheart]');
  if(hb){
    e.stopPropagation(); e.preventDefault();
    const a = AG[+hb.closest('.ag').dataset.i];
    if(!a || !window.ATLFAV) return;
    ATLFAV.toggle(a.domain);
    if(DIRFAV) refresh();
    else { dirFavDecorate(); const t = main.querySelector('.dftabs'); if(t) t.outerHTML = dirFavTabs(); }
    return;
  }
  const tb = e.target.closest && e.target.closest('[data-dftab]');
  if(tb){
    e.stopPropagation();
    DIRFAV = tb.dataset.dftab === 'fav';
    refresh();
    try{ main.scrollIntoView({block: 'nearest'}); }catch(_){}
  }
}, true);
/* dragging a favourite to a new place: by its number on a touch screen, by the whole
   row head with a mouse */
let DFDRAGJUST = false;
(function(){
  let d = null;
  main.addEventListener('pointerdown', e => {
    if(!DIRFAV || e.button !== 0) return;
    const box = e.target.closest('.ag.dford');
    if(!box || !e.target.closest('.agh') || e.target.closest('button,a,input')) return;
    if(e.pointerType === 'touch' && !e.target.closest('.dfnum')) return;
    d = {box, id: e.pointerId, y: e.clientY, on: false, ty: 0};
  });
  main.addEventListener('pointermove', e => {
    if(!d || e.pointerId !== d.id) return;
    if(!d.on){
      if(Math.abs(e.clientY - d.y) < 6) return;
      d.on = true; d.top = d.box.getBoundingClientRect().top;
      try{ d.box.setPointerCapture(d.id); }catch(_){}
      d.box.classList.add('dfdragging'); document.body.classList.add('dfreordering');
    }
    e.preventDefault();
    const grp = d.box.parentElement;
    const sibs = [...grp.querySelectorAll('.ag.dford')].filter(x => x !== d.box);
    let before = null;
    for(const s of sibs){ const r = s.getBoundingClientRect(); if(e.clientY < r.top + r.height / 2){ before = s; break; } }
    const last = sibs[sibs.length - 1];
    if(before){ if(before.previousElementSibling !== d.box) grp.insertBefore(d.box, before); }
    else if(last && last.nextElementSibling !== d.box) last.after(d.box);
    const natural = d.box.getBoundingClientRect().top - d.ty;
    d.ty = (e.clientY - d.y) - (natural - d.top);
    d.box.style.transform = 'translateY(' + d.ty + 'px)';
    [...grp.querySelectorAll('.ag.dford')].forEach((x, i) => { const n = x.querySelector('.dfnum'); if(n) n.textContent = i + 1; });
    if(e.clientY < 50) scrollBy(0, -14); else if(e.clientY > innerHeight - 50) scrollBy(0, 14);
  });
  const stop = e => {
    if(!d || (e && e.pointerId !== d.id)) return;
    const was = d.on, box = d.box; d = null;
    if(!was) return;
    DFDRAGJUST = true; setTimeout(() => { DFDRAGJUST = false; }, 0);
    box.classList.remove('dfdragging'); box.style.transform = ''; document.body.classList.remove('dfreordering');
    const ids = [...box.parentElement.querySelectorAll('.ag.dford')].map(x => (AG[+x.dataset.i] || {}).domain).filter(Boolean);
    if(window.ATLFAV) ATLFAV.order(ids);
  };
  main.addEventListener('pointerup', stop);
  main.addEventListener('pointercancel', stop);
})();
/* the list belongs to whoever is signed in: fetch it as soon as the page knows who */
(function wait(n){
  if(window.ATLFAV && typeof ME !== 'undefined' && ME){ ATLFAV.load(); return; }
  if(n < 60) setTimeout(() => wait(n + 1), 500);
})(0);
