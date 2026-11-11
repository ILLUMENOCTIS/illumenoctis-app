/* ==================== Ctrl + Z: undo (1.2.132) ====================
   What the user asked for (10 Nov 2026): "I want the CTRL + Z control to allow me to undo my actions on the program".
   - Ctrl + Z (Cmd + Z on a Mac) undoes the last action, then the one before, up to 50.
   - While typing in a box, Ctrl + Z undoes the typing in that box, as always. Once the box is left, Ctrl + Z puts
     the whole box back the way it was.
   - What can be undone: every action that already offers "Undo" (favorites, notes, links, taking a card off the
     vote, removing an agency...), and every change on a booking card - its boxes, its stage lights, Processing /
     Completed / Cancelled, dragging it on the Booking board.
   - A small note says what was undone. Nothing is undone silently. */
(function(){
  if(window.__illuUndoOn) return; window.__illuUndoOn = true;
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const STACK = [];
  const push = (label, fn) => { if(typeof fn !== 'function') return; STACK.push({label: label || L('Last change', '마지막 변경'), fn, at: Date.now()}); if(STACK.length > 50) STACK.shift(); };
  window.__illuUndo = {push, size: () => STACK.length, pop: () => run()};
  function note(t){
    let n = document.getElementById('undonote');
    if(!n){ n = document.createElement('div'); n.id = 'undonote'; n.setAttribute('role', 'status'); document.body.appendChild(n); }
    n.textContent = t; n.hidden = false; clearTimeout(note.t); note.t = setTimeout(() => { n.hidden = true; }, 3500);
  }
  function run(){
    const u = STACK.pop();
    if(!u){ note(L('Nothing to undo', '되돌릴 것이 없습니다')); return; }
    try{ u.fn(); note(L('Undone: ', '되돌림: ') + u.label); }catch(e){ console.error(e); note(L('Could not undo that', '되돌리지 못했습니다')); }
  }
  const typing = el => !!(el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !/^(checkbox|radio|button|submit|range|color|file)$/i.test(el.type || '')) || (el && el.isContentEditable));
  addEventListener('keydown', e => {
    if(!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || String(e.key).toLowerCase() !== 'z') return;
    if(typing(document.activeElement)) return;               // the box's own undo
    e.preventDefault(); e.stopPropagation();
    run();
  }, true);

  /* ---------- booking cards ---------- */
  const card = bid => { try{ return BOOK.get(bid) || null; }catch(e){ return null; } };
  const clone = o => JSON.parse(JSON.stringify(o || {}));
  function bidOf(el){
    if(!el || !el.closest) return '';
    const a = el.closest('[data-bk]'); if(a && a.dataset.bk) return a.dataset.bk;
    const b = el.closest('[data-bkid]'); if(b && b.dataset.bkid) return b.dataset.bkid;
    for(const k of ['bkstage', 'bpset', 'bpseg', 'ctset', 'ctgbk', 'bkst', 'bvst']){ const x = el.closest('[data-' + k + ']'); if(x){ const v = x.dataset[k] || ''; const id = v.split('|')[0]; if(card(id)) return id; } }
    const c = el.closest('[data-ctype]'); if(c){ const id = (c.dataset.ctype || '').split('|')[0]; if(card(id)) return id; }
    try{ if(typeof bv !== 'undefined' && bv && bv.id && el.closest('.bv')) return bv.id; }catch(e){}
    return '';
  }
  function diffPush(bid, before, label){
    const c = card(bid); if(!c || !before) return;
    const now = clone(c), keys = new Set([...Object.keys(before), ...Object.keys(now)]), back = {};
    for(const k of keys) if(JSON.stringify(before[k]) !== JSON.stringify(now[k])) back[k] = before[k];
    if(!Object.keys(back).length) return;
    const nm = c.nm || L('booking card', '부킹 카드');
    push(label || (nm + L(' · booking card change', ' · 부킹 카드 변경')), () => {
      const cur = card(bid); if(!cur) return;
      for(const k in back){ if(back[k] === undefined) delete cur[k]; else cur[k] = clone({v: back[k]}).v; }
      try{ saveBook(bid, true); }catch(e){}
      try{ renderBook(); }catch(e){}
      try{ if(typeof bv !== 'undefined' && bv && bv.id === bid && typeof bvDraw === 'function') bvDraw(); }catch(e){}
      try{ window.__illuPipe && window.__illuPipe.render(); }catch(e){}
    });
  }
  const BOOKUI = '.bv, #bkpipe, .bkcard, #pane-bk, #bpmenu, .ctpanel';
  /* a press on a booking control: what the card was just before, compared just after */
  let PRESS = null;
  document.addEventListener('pointerdown', e => {
    if(!e.target.closest || !e.target.closest(BOOKUI)) return;
    if(typing(e.target)) return;
    const bid = bidOf(e.target); if(!bid) return;
    PRESS = {bid, before: clone(card(bid)), t: Date.now()};
  }, true);
  document.addEventListener('click', () => {
    const p = PRESS; PRESS = null; if(!p) return;
    setTimeout(() => { if(STACK.length && STACK[STACK.length - 1].at >= p.t) return; diffPush(p.bid, p.before); }, 350);
  }, true);
  /* a box: what it held when the cursor went in, compared when it is changed */
  const FOCUS = new WeakMap();
  document.addEventListener('focusin', e => {
    const t = e.target; if(!typing(t) || !t.closest(BOOKUI)) return;
    const bid = bidOf(t); if(bid) FOCUS.set(t, {bid, before: clone(card(bid))});
  }, true);
  document.addEventListener('change', e => {
    const t = e.target, f = FOCUS.get(t); if(!f) return;
    setTimeout(() => { diffPush(f.bid, f.before); FOCUS.set(t, {bid: f.bid, before: clone(card(f.bid))}); }, 400);
  }, true);
  /* moving cards between Processing / Completed / Cancelled, or dragging them on the board */
  function wrapMoves(){
    try{
      if(typeof bkMoveTo !== 'function' || typeof bkDropInto !== 'function'){ setTimeout(wrapMoves, 400); return; }
      if(bkMoveTo.__u) return;
      const snapAll = () => { const m = new Map(); for(const c of BOOK.values()) m.set(c.id, {st: c.st, o: c.o}); return m; };
      const restore = m => { for(const [id, v] of m){ const c = card(id); if(!c) continue; if(c.st !== v.st || c.o !== v.o){ c.st = v.st; c.o = v.o; try{ saveBook(id, true); }catch(e){} } } try{ renderBook(); }catch(e){} try{ window.__illuPipe && window.__illuPipe.render(); }catch(e){} };
      const m0 = bkMoveTo, d0 = bkDropInto;
      const wm = function(bid){ const s = snapAll(); PRESS = null; const r = m0.apply(this, arguments); if(r) push((card(bid) || {}).nm + L(' · moved', ' · 이동'), () => restore(s)); return r; };
      const wd = function(bid){ const s = snapAll(); PRESS = null; const r = d0.apply(this, arguments); push((card(bid) || {}).nm + L(' · moved', ' · 이동'), () => restore(s)); return r; };
      wm.__u = wd.__u = true; window.bkMoveTo = wm; window.bkDropInto = wd;
    }catch(e){ setTimeout(wrapMoves, 400); }
  }
  wrapMoves();

  const css = document.createElement('style');
  css.textContent = '#undonote{position:fixed;left:50%;transform:translateX(-50%);top:calc(70px + env(safe-area-inset-top,0px));z-index:2147483002;background:#1b1724;color:#fff;border-radius:10px;padding:8px 14px;font-size:13px;box-shadow:0 12px 30px rgba(0,0,0,.3);max-width:calc(100vw - 32px)}';
  document.head.appendChild(css);
})();
