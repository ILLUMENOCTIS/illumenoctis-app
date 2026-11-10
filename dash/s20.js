
/* ================= Directory: one region at a time, countries that fold =================
   The Directory opens as a list of regions. Clicking a region shows that region alone,
   its countries listed and folded; clicking a country unfolds its agencies beneath it.
   A search unfolds every country that has a match, so nothing found is hidden. */
var DIRFOCUS = null;
const CTYOPEN = new Set();
/* one country opened from the list takes the page to itself: the others step aside, it
   moves to the top, and folding it puts the list back where you were */
let CTYSOLO = null, CTYRET = null;
function dirStickyH(){
  let h = 0;
  document.querySelectorAll('#appbar, .w > header').forEach(x => {
    const st = getComputedStyle(x);
    if(st.position === 'fixed' || st.position === 'sticky'){ const r = x.getBoundingClientRect(); h = Math.max(h, r.bottom); }
  });
  return Math.max(0, Math.round(h));
}
function dirShape(){
  const secs = [...main.querySelectorAll('.rgnsec[data-rgl]')];
  if(!secs.length) return;
  const term = (q.value || '').trim();
  /* one region chosen in the sidebar's Region filter counts as chosen here too */
  const only = secs.length === 1 ? secs[0].dataset.rgl : null;
  /* a search that finds nothing in the chosen region shows where it did find things,
     and the chosen region comes back when the search is cleared */
  const focus = (DIRFOCUS && secs.some(s => s.dataset.rgl === DIRFOCUS)) ? DIRFOCUS : only;
  for(const s of secs){
    const on = s.dataset.rgl === focus;
    s.hidden = !!focus && !on;
    s.dataset.open = on ? '1' : '0';
    const head = s.querySelector('.rgn');
    if(head){
      head.setAttribute('aria-expanded', String(on));
      head.title = on ? 'Back to all regions' : 'Show only ' + s.dataset.rgl;
      const car = head.querySelector('.rgncar'); if(car) car.textContent = on ? '−' : '+';
    }
    for(const c of s.querySelectorAll('.cty')){
      const g = c.nextElementSibling;
      if(!g || !g.classList.contains('ctygrp')) continue;
      const key = s.dataset.rgl + '|' + c.textContent.replace(/\d+$/, '').trim();
      c.dataset.ck = key;
      const solo = !term && CTYSOLO;
      const open = !!term || (solo ? key === CTYSOLO : CTYOPEN.has(key));
      g.hidden = !open;
      c.hidden = !!solo && key !== CTYSOLO;
      c.classList.add('ctyfold');
      c.setAttribute('role', 'button'); c.tabIndex = 0;
      c.setAttribute('aria-expanded', String(open));
      c.title = open ? 'Fold these agencies away' : 'Show these agencies';
      if(!c.querySelector('.ctycar')) c.insertAdjacentHTML('afterbegin', '<span class="ctycar" aria-hidden="true"></span>');
    }
  }
  let bar = main.querySelector('.dfocbar');
  if(focus && !only){
    if(!bar){
      const first = main.querySelector('.rgnsec');
      first.insertAdjacentHTML('beforebegin', '<div class="dfocbar"><button type="button" data-dfocback>‹ All regions</button><span></span></div>');
      bar = main.querySelector('.dfocbar');
    }
    bar.querySelector('span').textContent = 'Showing ' + focus + ' only · click a country to see its agencies';
  } else if(bar) bar.remove();
}
new MutationObserver(() => { if(main.querySelector('.rgnsec .cty:not(.ctyfold)') || (main.querySelector('.rgnsec') && !main.querySelector('.rgnsec[data-open]'))) dirShape(); })
  .observe(main, {childList: true});
function dirFocus(rg){
  CTYSOLO = null; CTYRET = null;
  { const sp = document.querySelector('.ctysp'); if(sp) sp.remove(); }
  DIRFOCUS = rg;
  dirShape();
  try{ main.scrollIntoView({block: 'start', behavior: 'smooth'}); }catch(e){}
}
function ctyToggle(c){
  const k = c.dataset.ck, g = c.nextElementSibling;
  if(!k || !g) return;
  const open = g.hidden;
  if(open) CTYOPEN.add(k); else CTYOPEN.delete(k);
  const term = (q.value || '').trim();
  if(!term){
    if(open){
      if(!CTYSOLO) CTYRET = window.scrollY;
      if(CTYSOLO && CTYSOLO !== k) CTYOPEN.delete(CTYSOLO);
      CTYSOLO = k;
      dirShape();
      const top = c.getBoundingClientRect().top + window.scrollY - dirStickyH() - 10;
      /* a short list still lets the country reach the top: room is made under it */
      let sp = document.querySelector('.ctysp');
      if(!sp){ sp = document.createElement('div'); sp.className = 'ctysp'; sp.setAttribute('aria-hidden', 'true'); document.body.appendChild(sp); }
      sp.style.height = '0px';
      let hgt = 0;
      for(let i = 0; i < 3; i++){
        const maxY = document.documentElement.scrollHeight - window.innerHeight;
        if(maxY >= top - 1) break;
        hgt += Math.ceil(top - maxY); sp.style.height = hgt + 'px';
      }
      window.scrollTo({top: Math.max(0, top), behavior: 'smooth'});
    }else if(CTYSOLO === k){
      CTYSOLO = null;
      const back = CTYRET; CTYRET = null;
      const sp = document.querySelector('.ctysp'); if(sp) sp.remove();
      dirShape();
      if(back != null) window.scrollTo({top: back, behavior: 'auto'});
    }
  }
  g.hidden = !open;
  c.setAttribute('aria-expanded', String(open));
  c.title = open ? 'Fold these agencies away' : 'Show these agencies';
  if(open){ g.classList.remove('ctyin'); void g.offsetWidth; g.classList.add('ctyin'); }
}
main.addEventListener('click', e => {
  const back = e.target.closest && e.target.closest('[data-dfocback]');
  if(back){ e.stopPropagation(); dirFocus(null); return; }
  const head = e.target.closest && e.target.closest('.rgnsec .rgn');
  if(head){
    e.stopPropagation();
    const rg = head.closest('.rgnsec').dataset.rgl;
    dirFocus(DIRFOCUS === rg ? null : rg);
    return;
  }
  const c = e.target.closest && e.target.closest('.rgnsec .cty.ctyfold');
  if(c){ e.stopPropagation(); ctyToggle(c); }
}, true);
main.addEventListener('keydown', e => {
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const head = e.target.closest && e.target.closest('.rgnsec .rgn');
  const c = e.target.closest && e.target.closest('.rgnsec .cty.ctyfold');
  if(!head && !c) return;
  e.preventDefault(); e.stopPropagation();
  if(head){ const rg = head.closest('.rgnsec').dataset.rgl; dirFocus(DIRFOCUS === rg ? null : rg); }
  else ctyToggle(c);
}, true);
/* the region tiles above the list lead into the same one-region view */
main.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('.dtile[data-dtile]');
  if(!t) return;
  e.stopPropagation();
  dirFocus(t.dataset.dtile);
}, true);
try{ dirShape(); }catch(e){}
