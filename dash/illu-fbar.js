/* ==================== Filters across the top ====================
   The filters that sat in the left column now run across the top of every board, drawn
   like the Directory's bar: search, one button per filter (its choices drop down under
   it, with their counts), the measurements in a second row, the count and Reset on the
   right. It sits under the clocks, or in their place when the clocks are hidden. The
   Filters button in the top bar folds it up and down, the way the side panels fold in and
   out; open or folded is remembered.
   Nothing about filtering changes: the very same boxes and fields are moved into the
   bar, so every list keeps reading them as before. The Directory keeps its own bar,
   which folds the same way. */
(function(){
  const side = document.querySelector('.shell > .side');
  if(!side) return;
  const KEY = 'illu.fbaroff';
  const OWNBAR = {dir: '#d2bar'};                        // tabs whose own bar is the filter bar
  const NOBAR = new Set(['cmp', 'ana']);                        // Suggestiones has the bar too (user, 2026-11-05)                 // tabs with no filters of this kind
  const V = () => (typeof VIEW !== 'undefined' ? VIEW : document.body.dataset.view || '');
  const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const SRCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';
  const ls = {get(){ try{ return localStorage.getItem(KEY) === '1'; }catch(e){ return false; } },
              set(v){ try{ localStorage.setItem(KEY, v ? '1' : '0'); }catch(e){} }};

  /* ---------- the bar ---------- */
  const bar = document.createElement('section');
  bar.id = 'fbar'; bar.className = 'fbcol'; bar.setAttribute('aria-label', 'Search and filters');
  bar.innerHTML = '<div class="fbr1"></div><div class="fbr2"><b class="fbml">MEASUREMENTS</b></div>';
  const r1 = bar.querySelector('.fbr1'), r2 = bar.querySelector('.fbr2');
  const hold = document.createElement('div'); hold.hidden = true; hold.className = 'fbhold';
  bar.appendChild(hold);
  const pop = document.createElement('div'); pop.className = 'fbpop'; pop.hidden = true;
  document.body.appendChild(pop);

  const q = document.getElementById('q');
  const qGroup = q ? q.closest('.fgroup') : null;
  /* search: the sidebar's own box */
  if(q){
    const lab = document.createElement('label'); lab.className = 'fbq';
    lab.innerHTML = SRCH; lab.appendChild(q);
    q.placeholder = q.placeholder || 'Name, agency, city…';
    r1.appendChild(lab);
  }
  /* one button per filter group, in the order they stood */
  const groups = [...side.querySelectorAll(':scope > .fgroup')].filter(g => g.id !== 'f-meas' && g !== qGroup);
  if(qGroup) qGroup.hidden = true;
  const btns = new Map();
  for(const g of groups){
    const lab = g.querySelector('.flabel');
    const name = lab ? lab.textContent.trim() : g.id;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'fbf'; b.dataset.fbg = g.id;
    b.setAttribute('aria-haspopup', 'true'); b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<span class="fbfn"></span><span class="fbfv"></span>' + CHEV;
    b.querySelector('.fbfn').textContent = name;
    r1.appendChild(b);
    btns.set(g.id, {b, g});
    hold.appendChild(g);
  }
  const sp = document.createElement('span'); sp.className = 'fbsp'; r1.appendChild(sp);
  /* count and Reset from the foot of the old column */
  const cnt = document.getElementById('count'), reset = document.getElementById('reset');
  if(cnt){ cnt.classList.add('fbcnt'); r1.appendChild(cnt); }
  if(reset){ reset.classList.add('fbreset'); r1.appendChild(reset); }

  /* measurements: the same fields, laid out as min – max pairs */
  const meas = document.getElementById('f-meas');
  if(meas){
    const unitOf = k => {
      if(k === 'ht') return () => { const p = meas.querySelector('[data-useg="ht"] [aria-pressed="true"]'); return p ? (p.dataset.u === 'ft' ? 'ft·in' : 'cm') : 'cm'; };
      if(k === 's') return () => { const p = document.querySelector('#shoeunit [aria-pressed="true"]'); return p ? p.dataset.u.toUpperCase() : 'EU'; };
      return () => { const p = meas.querySelector('[data-useg="bw"] [aria-pressed="true"]'); return p ? p.dataset.u : 'cm'; };
    };
    for(const [k, label] of [['ht', 'HT'], ['b', 'B'], ['w', 'W'], ['h', 'H'], ['s', 'SH']]){
      const lo = meas.querySelector('input[data-m="' + k + '-lo"]'), hi = meas.querySelector('input[data-m="' + k + '-hi"]');
      if(!lo || !hi) continue;
      const box = document.createElement('span'); box.className = 'fbm'; box.dataset.fbm = k;
      box.innerHTML = '<b>' + label + '</b>';
      box.appendChild(lo); const dash = document.createElement('i'); dash.textContent = '–'; box.appendChild(dash); box.appendChild(hi);
      const u = document.createElement('em'); u.className = 'fbmu'; box.appendChild(u);
      box.__unit = unitOf(k);
      r2.appendChild(box);
    }
    /* the unit switches, each labelled */
    const segs = [['HT', meas.querySelector('[data-useg="ht"]')], ['B·W·H', meas.querySelector('[data-useg="bw"]')], ['Shoe', document.getElementById('shoeunit')]];
    for(const [l, s] of segs){
      if(!s) continue;
      const w = document.createElement('span'); w.className = 'fbu';
      const t = document.createElement('b'); t.textContent = l; w.appendChild(t); w.appendChild(s);
      r2.appendChild(w);
    }
    /* the notes about units and bounds: one small (i), read on hover or click */
    const hints = document.createElement('span'); hints.className = 'fbhints'; hints.tabIndex = 0;
    hints.setAttribute('role', 'button'); hints.setAttribute('aria-label', 'About the measurements');
    hints.innerHTML = '<i class="fbhi">i</i><span class="fbhtx"></span>';
    const htx = hints.querySelector('.fbhtx');
    for(const id of ['uhint', 'mhint', 'mhint2']){ const h = document.getElementById(id); if(h) htx.appendChild(h); }
    hints.addEventListener('click', e => { e.stopPropagation(); hints.classList.toggle('open'); });
    document.addEventListener('pointerdown', e => { if(!hints.contains(e.target)) hints.classList.remove('open'); }, true);
    r2.appendChild(hints);
    hold.appendChild(meas);
  }

  /* the page hides whole groups on some tabs (no measurements on a blind board...): the
     bar follows - the button goes, and the measurements row with its group */
  const measRow = () => { if(meas) r2.hidden = meas.hidden; };
  if(meas) try{ new MutationObserver(measRow).observe(meas, {attributes: true, attributeFilter: ['hidden']}); }catch(e){}
  measRow();
  /* in the page from the start, so everything that looks the fields up finds them */
  const col0 = side.nextElementSibling;
  if(col0) col0.insertBefore(bar, col0.querySelector(':scope > .pane'));
  bar.hidden = true;

  /* ---------- the Filters button, in the top bar ---------- */
  const FUNNEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6.2 7.4V18l-3.6 2v-7.6z"/></svg>';
  const tab = document.createElement('button');
  tab.type = 'button'; tab.className = 'abflt';
  tab.innerHTML = '<i class="abflti">' + FUNNEL + '</i><span class="abfltl">Filters</span><s class="fbtogn"></s><i class="abfltc">' + CHEV + '</i>';
  function putTab(){
    const abr = document.querySelector('#appbar .abr');
    if(!abr){ setTimeout(putTab, 400); return; }
    if(tab.parentNode !== abr) abr.insertBefore(tab, abr.firstElementChild);   // the top bar orders it (illu-abar.js)
  }
  putTab();
  try{ new MutationObserver(() => { if(!tab.isConnected) putTab(); })
    .observe(document.getElementById('appbar') || document.body, {childList: true, subtree: true}); }catch(e){}

  /* ---------- where it goes ---------- */
  const col = side.nextElementSibling;                  // the main column
  function place(){
    const v = V();
    const own = OWNBAR[v] ? document.querySelector(OWNBAR[v]) : null;
    const target = own || (NOBAR.has(v) ? null : bar);
    document.body.classList.toggle('fbon', !NOBAR.has(v));
    if(!own && !NOBAR.has(v) && col){
      const first = col.querySelector(':scope > .pane');
      if(bar.parentNode !== col || bar.nextElementSibling !== first) col.insertBefore(bar, first);
    }
    bar.hidden = !!own || NOBAR.has(v);
    if(target){
      if(!target.classList.contains('fbcol')) target.classList.add('fbcol');
      tab.hidden = false;
      fold(ls.get(), target, true);
    } else tab.hidden = true;
    paint();
  }
  /* folding: the bar's height runs between its own height and nothing */
  function fold(shut, target, instant){
    target = target || curBar();
    if(!target) return;
    closePop();
    const was = target.classList.contains('fbshut');
    if(instant || was === shut){
      target.classList.toggle('fbshut', shut);
      target.style.height = '';
    } else {
      const h0 = target.getBoundingClientRect().height;
      target.classList.add('fbanim');
      target.classList.toggle('fbshut', shut);
      target.style.height = '';
      const h1 = shut ? 0 : target.getBoundingClientRect().height;
      target.style.height = h0 + 'px';
      target.getBoundingClientRect();
      target.style.height = h1 + 'px';
      const done = () => { target.classList.remove('fbanim'); target.style.height = ''; target.removeEventListener('transitionend', end); };
      const end = e => { if(e.target === target && e.propertyName === 'height') done(); };
      target.addEventListener('transitionend', end);
      setTimeout(done, 450);
    }
    tab.setAttribute('aria-expanded', String(!shut));
    tab.classList.toggle('shut', shut);
    tab.title = shut ? 'Show the filters under the clocks' : 'Hide the filters';
    tab.setAttribute('aria-label', tab.title);
  }
  const curBar = () => { const v = V(); return OWNBAR[v] ? document.querySelector(OWNBAR[v]) : (NOBAR.has(v) ? null : bar); };
  tab.addEventListener('click', e => { e.preventDefault(); const s = !ls.get(); ls.set(s); fold(s); });

  /* ---------- a filter's choices, dropping down under its button ---------- */
  let openId = '';
  function openPop(id){
    const it = btns.get(id); if(!it) return;
    if(openId === id){ closePop(); return; }
    closePop();
    openId = id;
    pop.appendChild(it.g);
    pop.hidden = false;
    it.b.setAttribute('aria-expanded', 'true');
    const r = it.b.getBoundingClientRect();
    const w = Math.max(240, pop.offsetWidth);
    pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
    pop.style.top = (r.bottom + 6) + 'px';
    pop.style.maxHeight = Math.max(200, innerHeight - r.bottom - 24) + 'px';
  }
  function closePop(){
    if(!openId) return;
    const it = btns.get(openId);
    if(it){ hold.appendChild(it.g); it.b.setAttribute('aria-expanded', 'false'); }
    openId = ''; pop.hidden = true;
  }
  r1.addEventListener('click', e => {
    const b = e.target.closest('[data-fbg]');
    if(b){ e.preventDefault(); openPop(b.dataset.fbg); }
  });
  document.addEventListener('pointerdown', e => {
    if(!openId) return;
    if(pop.contains(e.target) || (e.target.closest && e.target.closest('[data-fbg]'))) return;
    closePop();
  }, true);
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && openId){ e.stopPropagation(); const b = btns.get(openId).b; closePop(); b.focus(); } }, true);
  addEventListener('resize', closePop);
  addEventListener('scroll', () => { if(openId){ const it = btns.get(openId); const r = it.b.getBoundingClientRect(); pop.style.top = (r.bottom + 6) + 'px'; pop.style.left = Math.max(8, Math.min(innerWidth - pop.offsetWidth - 8, r.left)) + 'px'; } }, true);

  /* ---------- what each button says: how many are ticked, and which ---------- */
  function paint(){
    let active = 0;
    for(const [, {b, g}] of btns){
      /* Korea fit only steers the old Updates list; Suggestiones has its own heights */
      b.hidden = g.hidden || (g.id === 'f-kfit' && V() === 'arr');
      if(b.hidden) continue;
      const on = [...g.querySelectorAll('input[type="checkbox"]:checked')];
      const nums = [...g.querySelectorAll('input[type="number"]')].filter(i => i.value !== '');
      const n = on.length + (nums.length ? 1 : 0);
      if(n) active++;
      b.classList.toggle('on', !!n);
      const v = b.querySelector('.fbfv');
      const txt = on.length === 1 ? (on[0].closest('label').querySelector('span') || {}).textContent || '' : on.length > 1 ? String(on.length) : nums.length ? 'set' : '';
      v.textContent = txt ? ' · ' + txt : '';
    }
    r2.querySelectorAll('.fbm').forEach(m => {
      const set = [...m.querySelectorAll('input')].some(i => i.value !== '');
      m.classList.toggle('on', set);
      if(set) active++;
      const u = m.querySelector('.fbmu'); if(u && m.__unit) u.textContent = m.__unit();
    });
    if(q && q.value.trim()) active++;
    const own = OWNBAR[V()] ? document.querySelector(OWNBAR[V()]) : null;
    if(own){
      active = own.querySelectorAll('.d2chip').length;
      own.querySelectorAll('.d2m').forEach(m => { if([...m.querySelectorAll('input')].some(i => i.value !== '')) active++; });
      const oq = own.querySelector('input[type="search"]'); if(oq && oq.value.trim()) active++;
    }
    const n = tab.querySelector('.fbtogn'); n.textContent = active ? String(active) : '';
  }
  /* only changes to the filters themselves (or the Directory's bar) repaint the buttons - not typing in a note or a booking */
  const ours = e => e.target && e.target.closest && e.target.closest('#fbar, .fbpop, .fbhold, #d2bar');
  let pT = 0; const later = () => { if(!pT) pT = setTimeout(() => { pT = 0; paint(); }, 0); };
  document.addEventListener('change', e => { if(ours(e)) later(); }, true);
  document.addEventListener('input', e => { if(ours(e)) later(); }, true);
  document.addEventListener('click', e => { if(e.target.closest && (e.target.closest('#fbar') || e.target.closest('.fbpop'))) setTimeout(paint, 0); }, true);
  try{ new MutationObserver(paint).observe(hold, {attributes: true, subtree: true, attributeFilter: ['hidden']}); }catch(e){}

  /* follow the tabs */
  let lastV = null;
  const watch = () => { const v = V(); if(v !== lastV){ lastV = v; closePop(); place(); } };
  try{ new MutationObserver(watch).observe(document.body, {attributes: true, attributeFilter: ['data-view']}); }catch(e){}
  /* the Directory builds its bar when it first opens */
  try{ new MutationObserver(() => { const v = V(); const o = OWNBAR[v] && document.querySelector(OWNBAR[v]); if(o && !o.classList.contains('fbcol')) place(); })
    .observe(document.getElementById('pane-dir') || document.body, {childList: true}); }catch(e){}
  place();

  const css = document.createElement('style');
  css.textContent = `
body.fbon .shell.shell>.side{display:none!important}
body.fbon .shell.shell{grid-template-columns:minmax(0,1fr)!important}
body.fbon .shell.shell>*{grid-column:1/-1}
body.fbon #sidebtn{display:none!important}
#fbar{position:relative;z-index:20;margin:12px 0 0;background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 1px 2px rgba(27,23,36,.05),0 10px 24px -18px rgba(27,23,36,.25);box-sizing:border-box}
#fbar[hidden]{display:none!important}
body.ckmin #fbar,body.ckmin #d2bar.fbcol{margin-top:4px}
#fbar .fbr1,#fbar .fbr2{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#fbar .fbr2[hidden]{display:none}
#fbar .fbsp{flex-grow:1}
/* 1.2.143 (user, 12 Nov 2026): the count and Reset sit right after the last filter (Measurements), not at the far right */
#fbar .fbr1 > .fbsp{order:1}
#fbar .fbq{display:flex;align-items:center;gap:8px;height:36px;width:280px;box-sizing:border-box;padding:0 12px;border-radius:9px;border:1px solid transparent;background:var(--surf2)}
#fbar .fbq svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;opacity:.6;flex:none}
#fbar .fbq input{border:0!important;outline:0;flex-grow:1;font:inherit;font-size:13.5px;background:transparent!important;color:inherit;min-width:0;height:auto;padding:0!important;box-shadow:none!important}
#fbar .fbf{display:inline-flex;align-items:center;gap:4px;height:36px;padding:0 12px;border-radius:9px;border:1px solid transparent;background:var(--surf2);color:inherit;font:inherit;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap}
#fbar .fbf[hidden]{display:none}
#fbar .fbf svg{width:10px;height:10px;fill:none;stroke:currentColor;stroke-width:2.5;margin-left:2px;transition:transform .2s}
#fbar .fbf[aria-expanded="true"] svg{transform:rotate(180deg)}
#fbar .fbf .fbfv{font-weight:400;opacity:.75}
#fbar .fbf.on{border-color:color-mix(in srgb,var(--acc) 35%,transparent);background:var(--wash);color:var(--acc)}
#fbar .fbf:hover{border-color:var(--line)}
#fbar .fbcnt{font-size:12px;color:var(--mut);white-space:nowrap;flex:none;width:auto!important;min-width:0!important;text-align:right}
#fbar .fbreset{height:34px;padding:0 14px;border-radius:9px;border:1px solid var(--line);background:var(--surf);color:var(--ink2);font:inherit;font-size:12.5px;cursor:pointer}
#fbar .fbreset:hover{border-color:var(--acc);color:var(--acc)}
#fbar .fbml{font-size:10.5px;letter-spacing:.08em;opacity:.7;margin-right:2px}
#fbar .fbm{display:inline-flex;align-items:center;gap:4px;height:34px;padding:0 9px;border-radius:9px;border:1px solid transparent;background:var(--surf2)}
#fbar .fbm.on{border-color:color-mix(in srgb,var(--acc) 35%,transparent);background:var(--wash)}
#fbar .fbm b{font-size:10.5px;letter-spacing:.08em;opacity:.7}
#fbar .fbm input{width:44px;border:0!important;outline:0;background:transparent!important;font:inherit;font-size:13px;text-align:center;color:inherit;-moz-appearance:textfield;padding:0!important;height:auto;box-shadow:none!important}
#fbar .fbm input::-webkit-inner-spin-button,#fbar .fbm input::-webkit-outer-spin-button{display:none}
#fbar .fbm i{opacity:.5;font-style:normal}
#fbar .fbm em{font-style:normal;font-size:11px;opacity:.6;min-width:14px}
#fbar .fbu{display:inline-flex;align-items:center;gap:6px;margin-left:4px}
#fbar .fbu>b{font-size:10.5px;letter-spacing:.06em;opacity:.6;font-weight:600}
#fbar .fbu .seg{margin:0}
#fbar .fbhints{position:relative;display:inline-flex;align-items:center;margin-left:2px;cursor:help;outline:0}
#fbar .fbhi{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;border:1px solid var(--line);font:italic 600 11px/1 Georgia,serif;color:var(--mut);background:var(--surf)}
#fbar .fbhints:hover .fbhi,#fbar .fbhints.open .fbhi,#fbar .fbhints:focus-visible .fbhi{border-color:var(--acc);color:var(--acc)}
#fbar .fbhtx{display:none;position:absolute;z-index:30;top:26px;right:-8px;width:360px;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--surf);box-shadow:0 14px 34px rgba(0,0,0,.14);font-size:11.5px;line-height:1.5;color:var(--ink2)}
#fbar .fbhints:hover .fbhtx,#fbar .fbhints.open .fbhtx,#fbar .fbhints:focus-visible .fbhtx{display:block}
#fbar .fbhtx .mhint{margin:0 0 6px;color:var(--ink2);opacity:1}
#fbar .fbhtx .mhint:last-child{margin:0}
#fbar .fbhtx .mhint:empty{display:none}
.fbpop{position:fixed;z-index:1200;min-width:240px;max-width:340px;overflow:auto;border-radius:12px;border:1px solid var(--line);background:var(--surf);box-shadow:0 14px 34px rgba(0,0,0,.14);padding:8px 10px;box-sizing:border-box}
.fbpop[hidden]{display:none}
.fbpop .fgroup{margin:0;padding:0;border:0;background:none;box-shadow:none}
.fbpop .fgroup>.flabel{display:none}
.fbpop .opt{border-radius:8px;padding:6px 6px}
.fbpop .opt:hover{background:color-mix(in srgb,var(--acc) 8%,transparent)}
/* folding, up and down */
.fbcol{transition:height .32s cubic-bezier(.3,.7,.2,1),padding .32s cubic-bezier(.3,.7,.2,1),margin .32s,border-color .32s,opacity .25s}
.fbcol.fbanim{overflow:hidden}
.fbcol.fbshut{height:0!important;padding-top:0!important;padding-bottom:0!important;border-width:0!important;margin-top:0!important;overflow:hidden;opacity:0;box-shadow:none!important;pointer-events:none}
.fbcol.fbanim.fbshut{border-width:1px!important}
.fbcol.fbshut+*{margin-top:0}
#appbar .abflt{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 10px 0 9px;margin-right:4px;border-radius:999px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.75),rgba(255,255,255,0)),var(--surf);color:var(--ink2);font:600 11.5px var(--sans);letter-spacing:.08em;text-transform:uppercase;cursor:pointer;box-shadow:0 1px 2px rgba(27,23,36,.06);transition:background .2s,color .2s,border-color .2s,box-shadow .2s;flex:none}
#appbar .abflt[hidden]{display:none}
#appbar .abflt:hover{border-color:color-mix(in srgb,var(--acc) 45%,var(--line));color:var(--acc);box-shadow:0 2px 8px -2px rgba(90,44,87,.25)}
#appbar .abflt .abflti{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:color-mix(in srgb,var(--acc) 10%,transparent);color:var(--acc);font-style:normal}
#appbar .abflt .abflti svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round}
#appbar .abflt .abfltc{display:inline-flex;font-style:normal;opacity:.6}
#appbar .abflt .abfltc svg{width:10px;height:10px;fill:none;stroke:currentColor;stroke-width:2.6;transform:rotate(180deg);transition:transform .32s}
#appbar .abflt.shut .abfltc svg{transform:none}
#appbar .abflt[aria-expanded="true"]{background:color-mix(in srgb,var(--acc) 9%,var(--surf));border-color:color-mix(in srgb,var(--acc) 35%,var(--line));color:var(--acc)}
#appbar .abflt[aria-expanded="true"] .abflti{background:var(--acc);color:#fff}
#appbar .abflt .fbtogn{text-decoration:none;display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--acc,#6b2a63);color:#fff;font-size:10px;font-weight:700;letter-spacing:0;box-sizing:border-box}
#appbar .abflt .fbtogn:empty{display:none}
/* a narrower window: the button keeps its icon and number, and nothing in the bar overlaps */
@media (max-width:1399px){#appbar .abflt .abfltl,#appbar .abflt .abfltc{display:none}#appbar .abflt{padding:0 7px;gap:5px}}
#appbar .abtools,#appbar #abtools{min-width:0;overflow:hidden}
`;
  document.head.appendChild(css);
})();
