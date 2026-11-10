
/* the backlog's date: jump to the week it falls in (or the nearest earlier day with anything on it) */
function kJump(day){
  const days = [...new Set(BLOG.map(r => String(r.ts).slice(0, 10)))].sort();
  if(!day || !days.length) return;
  if(days.indexOf(day) < 0){ const before = days.filter(x => x <= day); day = before.length ? before[before.length - 1] : days[0]; }
  if(day) kGoWeek(weekOf(day), day);
}
document.getElementById('kmain').addEventListener('change', e => {
  const d = e.target.closest && e.target.closest('.kdate');
  if(d && d.value){ kJump(d.value); return; }
});
document.getElementById('kmain').addEventListener('keydown', e => {
  const t = e.target.closest && e.target.closest('.kdtx');
  if(!t || e.key !== 'Enter') return;
  const day = kDayOf(t.value);
  if(day && day.length === 10) kJump(day);
  else{ t.classList.add('bad'); setTimeout(() => t.classList.remove('bad'), 900); }
});
document.getElementById('kmain').addEventListener('click', e => {
  const c = e.target.closest && e.target.closest('.kcal');
  if(!c) return;
  const d = c.parentElement.querySelector('.kdate');
  try{ d.showPicker(); }catch(err){ d.focus(); d.click(); }
});
/* a new search starts from the newest week */
document.getElementById('q').addEventListener('input', () => { try{ KWEEK = null; }catch(e){} });

/* ======== pages for every long list ========
   The Updates tab shows a week at a time. Every other long list now breaks into pages
   the same way, under the same pager: agencies within a part of the world, blind spots,
   the Lumen / Communicatus sections and the booking rows. A list only gets a pager once
   it is longer than one page. */
(function(){
  const LISTS = [
    {root: 'bmain',  group: '.rgnsec .rgnbody', item: '.bag',     size: 20, key: g => 'bld:' + (g.closest('.rgnsec').dataset.rgl || '')},
    {root: 'lmain',  group: '.litsec .litres',  item: '.litrow',  size: 24, key: g => (typeof VIEW !== 'undefined' ? VIEW : '') + ':' + ((g.closest('.litsec').className.match(/litsec--(\w)/) || [])[1] || '')},
    {root: 'bkmain', group: '.bkband .bkgrid',  item: '.bkcard',  size: 24, key: g => 'bk:' + (g.closest('.bkband').dataset.bkdrop || '')},
    {root: 'igmain', group: null,               item: '.igrow',   size: 30, key: () => 'ig'},
  ];
  const PAGE = new Map();
  const pagerHtml = (key, i, n, size, total) => {
    if(n < 2) return '';
    const want = new Set([0, n - 1]);
    for(let j = i - 2; j <= i + 2; j++) if(j >= 0 && j < n) want.add(j);
    const idx = [...want].sort((a, b) => a - b);
    let nums = '', prev = -1;
    for(const j of idx){
      if(prev >= 0 && j - prev > 1) nums += '<span class="apgap">…</span>';
      nums += '<button type="button" class="apn" data-pgk="' + key + '" data-pg="' + j + '"' + (j === i ? ' aria-current="page"' : '') + '>' + (j + 1) + '</button>';
      prev = j;
    }
    const a = i * size + 1, b = Math.min(total, (i + 1) * size);
    return '<nav class="apager bot lpager" data-pgk="' + key + '" aria-label="Pages">' +
      '<span class="apw"><b>' + a + '–' + b + '</b> of ' + total + '</span>' +
      '<button type="button" data-pgk="' + key + '" data-pg="' + (i - 1) + '"' + (i > 0 ? '' : ' disabled') + '>← Previous</button>' + nums +
      '<button type="button" data-pgk="' + key + '" data-pg="' + (i + 1) + '"' + (i < n - 1 ? '' : ' disabled') + '>Next →</button></nav>';
  };
  let busy = false;
  function apply(L){
    const root = document.getElementById(L.root); if(!root) return;
    busy = true;
    try{
      root.querySelectorAll('.lpager').forEach(x => x.remove());
      const groups = L.group ? [...root.querySelectorAll(L.group)] : [root];
      for(const g of groups){
        const items = [...g.querySelectorAll(L.item)].filter(x => !x.closest('.lpager'));
        const key = L.key(g);
        const n = Math.ceil(items.length / L.size);
        let i = Math.min(PAGE.get(key) || 0, Math.max(0, n - 1));
        /* an opened agency keeps its page */
        items.forEach((it, j) => { it.hidden = n > 1 && Math.floor(j / L.size) !== i; });
        /* a country heading with nothing left on this page goes too */
        g.querySelectorAll('.ctygrp').forEach(cg => {
          const any = [...cg.querySelectorAll(L.item)].some(x => !x.hidden);
          cg.hidden = !any;
          const h = cg.previousElementSibling; if(h && h.classList.contains('cty')) h.hidden = !any;
        });
        if(n > 1) (L.group ? g : root).insertAdjacentHTML(L.group ? 'afterend' : 'beforeend', pagerHtml(key, i, n, L.size, items.length));
      }
    }finally{ busy = false; try{ L.obs && L.obs.takeRecords(); }catch(e){} }
  }
  function applyAll(){ for(const L of LISTS) apply(L); }
  for(const L of LISTS){
    const root = document.getElementById(L.root); if(!root) continue;
    let t = 0;
    L.obs = new MutationObserver(() => { if(busy) return; clearTimeout(t); t = setTimeout(() => apply(L), 0); });
    L.obs.observe(root, {childList: true, subtree: true});
    root.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('button[data-pgk]');
      if(!b || b.disabled) return;
      e.preventDefault(); e.stopPropagation();
      PAGE.set(b.dataset.pgk, Math.max(0, +b.dataset.pg));
      apply(L);
      const nav = root.querySelector('.lpager[data-pgk="' + CSS.escape(b.dataset.pgk) + '"]');
      const head = nav && (nav.previousElementSibling && nav.previousElementSibling.closest('.rgnsec,.litsec,.bkband') || nav.closest('.rgnsec,.litsec,.bkband')) ;
      const target = head || nav;
      if(target){
        const hd = document.querySelector('header');
        const off = hd ? Math.max(0, hd.getBoundingClientRect().bottom) : 0;
        window.scrollBy(0, target.getBoundingClientRect().top - off - 12);
      }
    }, true);
  }
  document.getElementById('q').addEventListener('input', () => { PAGE.clear(); });
  window.pagesApply = applyAll;
  setTimeout(applyAll, 0);
})();
