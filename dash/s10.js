
(function(){
  if(typeof bvEl === 'undefined') return;
  const P = bvEl.querySelector('.bvp');
  const KEY = 'illum.bvwin';
  const MINW = 640, MINH = 420;
  const ko = () => typeof LANG !== 'undefined' && LANG === 'ko';
  let geo = null, full = false;
  try{ geo = JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){}
  try{ full = localStorage.getItem(KEY + '.full') === '1'; }catch(e){}
  if(!geo || !(geo.w > 0)) geo = null;
  const small = () => innerWidth <= 900;
  const save = () => { try{ localStorage.setItem(KEY, JSON.stringify(geo)); localStorage.setItem(KEY + '.full', full ? '1' : '0'); }catch(e){} };
  function clamp(g){
    const W = innerWidth, H = innerHeight;
    g.w = Math.round(Math.min(Math.max(g.w, MINW), W)); g.h = Math.round(Math.min(Math.max(g.h, MINH), H));
    g.x = Math.round(Math.min(Math.max(g.x, 120 - g.w), W - 120));   // always keep a piece to grab
    g.y = Math.round(Math.min(Math.max(g.y, 0), H - 56));            // the header never leaves the screen
    return g;
  }
  const ICON_FULL = '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  const ICON_REST = '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
  function paintBtn(){
    const b = bvEl.querySelector('.bvwbtn'); if(!b) return;
    const t = full ? (ko() ? '원래 크기로' : 'Restore window size') : (ko() ? '전체 화면' : 'Full screen');
    b.innerHTML = full ? ICON_REST : ICON_FULL; b.title = t; b.setAttribute('aria-label', t);
    b.setAttribute('aria-pressed', String(full));
  }
  function apply(){
    const fl = !!geo && !full && !small();
    bvEl.classList.toggle('bvwfull', full && !small());
    bvEl.classList.toggle('bvfloat', fl);
    if(fl){ clamp(geo); P.style.left = geo.x + 'px'; P.style.top = geo.y + 'px'; P.style.width = geo.w + 'px'; P.style.height = geo.h + 'px'; }
    else P.style.left = P.style.top = P.style.width = P.style.height = '';
    paintBtn();
    window.dispatchEvent(new Event('resize'));
  }
  function setFull(on){ full = on; save(); apply(); }
  window.bvWinFull = setFull;
  /* the full-screen button sits beside the close button, whenever the header is drawn */
  function ensureBtn(){
    const hd = bvEl.querySelector('.bvhd'); const x = hd && hd.querySelector('.bvx');
    if(!x || hd.querySelector('.bvwbtn')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'bvwbtn';
    b.addEventListener('click', e => { e.stopPropagation(); setFull(!full); });
    x.parentNode.insertBefore(b, x); paintBtn();
  }
  new MutationObserver(ensureBtn).observe(bvEl.querySelector('.bvhd'), {childList: true, subtree: true});
  /* every time it opens, the window comes up in the middle of the screen, at the size it had */
  new MutationObserver(() => { if(!bvEl.hidden){ ensureBtn();
    if(geo){ geo.x = Math.round((innerWidth - geo.w) / 2); geo.y = Math.round((innerHeight - geo.h) / 2); save(); }
    apply();
    /* and it starts at the top, not where the last model was scrolled to */
    const top = () => bvEl.querySelectorAll('.bvside .bvprof, .mdstage').forEach(x => { x.scrollTop = 0; });
    top(); requestAnimationFrame(top); setTimeout(top, 120); } }).observe(bvEl, {attributes: true, attributeFilter: ['hidden']});
  ['n','s','e','w','ne','nw','se','sw'].forEach(d => {
    const h = document.createElement('div'); h.className = 'bvrz'; h.dataset.rz = d; h.setAttribute('aria-hidden', 'true'); P.appendChild(h);
  });
  const rectNow = () => { const r = P.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width, h: r.height}; };
  const NODRAG = 'button,a,input,select,textarea,label,[role=button],[role=menu],[role=menuitem],.bvtrk,.bvfmenu,.bvrz';
  let op = null;
  bvEl.addEventListener('pointerdown', e => {
    if(e.button !== 0 || small() || bvEl.classList.contains('bvmax')) return;
    const t = e.target;
    const rz = t.closest && t.closest('.bvrz');
    const hd = !rz && t.closest && t.closest('.bvhd');
    if(!rz && !(hd && !t.closest(NODRAG))) return;
    if(rz && full) return;
    e.preventDefault();
    let start = full ? null : rectNow();
    op = {kind: rz ? rz.dataset.rz : 'move', sx: e.clientX, sy: e.clientY, g: start, id: e.pointerId, moved: false, cap: rz || P};
  });
  bvEl.addEventListener('pointermove', e => {
    if(!op || e.pointerId !== op.id) return;
    const dx = e.clientX - op.sx, dy = e.clientY - op.sy;
    if(!op.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
    if(!op.moved){
      op.moved = true; bvEl.classList.add('bvdrag'); try{ op.cap.setPointerCapture(op.id); }catch(x){}
      if(!op.g){
        /* pulling a full-screen window by its header brings it back to its own size, under the pointer */
        const g = geo ? {...geo} : {w: Math.min(1400, innerWidth - 80), h: Math.min(900, innerHeight - 80)};
        g.x = op.sx - g.w * (op.sx / innerWidth); g.y = Math.max(0, op.sy - 28);
        full = false; geo = clamp(g); save(); apply(); op.g = rectNow();
      }
    }
    const g = {...op.g}, k = op.kind;
    if(k === 'move'){ g.x += dx; g.y += dy; }
    else{
      if(k.includes('e')) g.w = op.g.w + dx;
      if(k.includes('s')) g.h = op.g.h + dy;
      if(k.includes('w')){ g.w = Math.max(MINW, op.g.w - dx); g.x = op.g.x + op.g.w - g.w; if(g.x < 0){ g.w += g.x; g.x = 0; } }
      if(k.includes('n')){ g.h = Math.max(MINH, op.g.h - dy); g.y = op.g.y + op.g.h - g.h; if(g.y < 0){ g.h += g.y; g.y = 0; } }
      if(k.includes('e')) g.w = Math.min(Math.max(MINW, g.w), innerWidth - g.x);
      if(k.includes('s')) g.h = Math.min(Math.max(MINH, g.h), innerHeight - g.y);
    }
    geo = g; full = false; apply();
  });
  const end = e => {
    if(!op || (e && e.pointerId !== op.id)) return;
    bvEl.classList.remove('bvdrag');
    if(op.moved){
      save();
      /* the click that ends a drag is not a click on whatever lies under the pointer -
         above all not on the dimmed backdrop, which would close the window */
      const eat = ev => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener('click', eat, {capture: true, once: true});
      setTimeout(() => window.removeEventListener('click', eat, {capture: true}), 0);
    }
    op = null;
  };
  bvEl.addEventListener('pointerup', end); bvEl.addEventListener('pointercancel', end);
  /* a double click on the header goes full screen and back, as a window does */
  bvEl.addEventListener('dblclick', e => {
    const t = e.target;
    if(small() || !t.closest || !t.closest('.bvhd') || t.closest(NODRAG)) return;
    setFull(!full);
  });
  window.addEventListener('resize', () => {
    if(bvEl.hidden || !geo || full || small()) return;
    const before = JSON.stringify(geo); clamp(geo);
    if(JSON.stringify(geo) !== before){ P.style.left = geo.x + 'px'; P.style.top = geo.y + 'px'; P.style.width = geo.w + 'px'; P.style.height = geo.h + 'px'; }
  });
})();
