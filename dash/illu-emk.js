/* 1.2.251 (user, 18 Nov 2026 - approved demo v9 "Same email on every card", claude/booking-emails-board-demo-2026-11-18.md):
   "this should all be linked to the cards throughout all the boards".
   Every model card on every board (Favorites, Team Vote, Today, Booking, Directory, New Faces, Suggestiones, Compare...)
   gets a small ✉ marker on her photo when an email about her is on record - the same record the Booking Emails board
   reads (window.__illuEmRec, illu-bemail.js):
     plum "✉ 18 Nov" = emailed, no reply yet · green "✉ Reply in" = the agency answered, your turn ·
     amber "✉ Waiting" = they answered before, our latest email waits · dashed "✉ Opened" = the ✉ window was opened in
     Hiworks, no sent email on record.
   Click it: the agency, status, last email, address and counts, with "Open conversation" (Today › Booking Emails, that
   agency's row open). The marker sits on the photo, so no card changes size. Read only. */
(function(){
  'use strict';
  if(window.__illuEmk) return; window.__illuEmk = true;
  const ko = () => { try{ return LANG === 'ko'; }catch(e){ return false; } };
  const L = (en, k) => ko() ? k : en;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const REC = () => window.__illuEmRec || null;
  const MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
  const KEYATTR = '__emk';

  function label(i){
    if(i.st === 'replied') return L('Reply in', '답장 옴');
    if(i.st === 'waiting') return L('Waiting', '답 기다림');
    if(i.st === 'opened') return L('Opened', '작성만');
    return i.last ? i.day(i.last) : L('Emailed', '메일 보냄');
  }
  function markHTML(i, small){
    return '<button type="button" class="emk ' + i.st + (small ? ' sm' : '') + '" data-emk="1" title="' + E(L('Email: ', '이메일: ') + i.ag + ' — ' + i.label) + '" aria-label="' + E(L('Email: ', '이메일: ') + i.ag + ' — ' + i.label) + '">' + MAIL + (small ? '' : '<span>' + E(label(i)) + '</span>') + '</button>';
  }
  /* where her photo is on each kind of card */
  function targets(k){
    const out = [], q = s => { try{ return document.querySelectorAll(s); }catch(e){ return []; } };
    const ks = new Set([k]); try{ ks.add(normKey(k)); }catch(e){}
    for(const x of ks){
      const v = CSS.escape(x);
      for(const u of q('article.uc[data-uck="' + v + '"] > .ucimg')) out.push([u, false]);
    }
    return out;
  }
  function bookTargets(){
    const out = [];
    let cards = []; try{ cards = document.querySelectorAll('article.bkcard[data-bkid]'); }catch(e){}
    for(const a of cards){ let c = null; try{ c = BOOK.get(a.dataset.bkid); }catch(e){} const p = a.querySelector('.bkpic'); if(c && c.k && p) out.push([p, true, c.k]); }
    return out;
  }
  function place(host, i, small, k){
    let el = host.querySelector(':scope > .emk');
    const want = i.st + '|' + label(i) + '|' + i.key;
    if(el && el[KEYATTR] === want) return;
    if(el) el.remove();
    host.insertAdjacentHTML('beforeend', markHTML(i, small));
    el = host.querySelector(':scope > .emk'); el[KEYATTR] = want; el.__emkKey = k;
    if(getComputedStyle(host).position === 'static') host.style.position = 'relative';
    /* a strip across the top of the photo (Team Vote's date and clock): sit under it */
    if(!small){
      let top = 8;
      for(const ch of host.children){
        if(ch === el || ch.classList.contains('ucph')) continue;
        const cs = getComputedStyle(ch); if(cs.position !== 'absolute' || cs.display === 'none') continue;
        const r = ch.getBoundingClientRect(), hr = host.getBoundingClientRect();
        if(hr.width && r.width > hr.width * .7 && r.top - hr.top < 4 && r.height < 60) top = Math.max(top, r.height + 6);
      }
      el.style.top = top + 'px';
    }
  }
  let BUSY = false, LASTV = '';
  /* 1.2.255 (user, 18 Nov 2026: "I also don't think it's necessary to show the 'Waiting' for the email once the card has
     been cancelled"): a model whose booking card is cancelled has no marker */
  function cancelled(k){ try{ const c = /^bid:/.test(k) ? BOOK.get(k.slice(4)) : (typeof bkForKey === 'function' ? bkForKey(k) : null); return !!(c && (c.st === 'canc' || (typeof bkStOf === 'function' && bkStOf(c) === 'canc'))); }catch(e){ return false; } }
  function pass(){
    BUSY = false;
    const R = REC(); if(!R) return;
    const keys = R.keys(); LASTV = R.ver();
    const seen = new Set();
    /* 1.2.271 (the speed report from Paul's computer: this pass was the slowest job, up to 0.24 s): the cards on the page
       are read once and matched to the email record, instead of searching the whole page once for every model on record */
    const byKey = new Map();
    for(const k of keys){ byKey.set(k, k); try{ const n = normKey(k); if(n && !byKey.has(n)) byKey.set(n, k); }catch(e){} }
    const okK = new Map();
    for(const u of document.querySelectorAll('article.uc[data-uck] > .ucimg')){
      const k = byKey.get(u.parentElement.dataset.uck); if(!k) continue;
      let ok = okK.get(k); if(ok === undefined){ const i = R.of(k); ok = i && !cancelled(k) ? i : null; okK.set(k, ok); }
      if(ok){ place(u, ok, false, k); seen.add(u); }
    }
    for(const [host, small, k] of bookTargets()){ const i = R.of(k); if(i && !cancelled(k)){ place(host, i, small, k); seen.add(host); } }
    /* a card that no longer has an email on record (or was redrawn for another model) loses its marker */
    for(const el of document.querySelectorAll('.emk')){ if(!seen.has(el.parentElement)) el.remove(); }
  }
  function soon(){ if(BUSY) return; BUSY = true; setTimeout(() => { try{ pass(); }catch(e){ BUSY = false; console.warn('email markers', e); } }, 250); }
  const mo = new MutationObserver(ms => { for(const m of ms){ if(m.addedNodes.length && [...m.addedNodes].some(n => n.nodeType === 1 && !(n.classList && n.classList.contains('emk')))){ soon(); return; } } });
  function start(){ if(!document.body){ setTimeout(start, 200); return; } mo.observe(document.body, {childList: true, subtree: true}); soon(); }
  start();
  setInterval(() => { const R = REC(); if(R && R.ver() !== LASTV) soon(); }, 4000);

  /* ---------- the popover ---------- */
  function close(){ document.querySelectorAll('.emkpop,.emkbg').forEach(x => x.remove()); }
  function open(btn){
    const R = REC(); if(!R) return;
    const i = R.of(btn.__emkKey); if(!i) return;
    close();
    const bg = document.createElement('div'); bg.className = 'emkbg';
    const p = document.createElement('div'); p.className = 'emkpop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', L('Email', '이메일'));
    const line = (k, v) => '<div class="emkln"><span>' + E(k) + '</span><b>' + E(v) + '</b></div>';
    p.innerHTML = '<h4>' + E(i.ag) + '</h4><div class="emksub">' + E(i.others ? L('Asked about with ' + i.others + ' other model' + (i.others === 1 ? '' : 's'), '다른 모델 ' + i.others + '명과 함께 문의') : L('Asked about on her own', '단독 문의')) + '</div>' +
      line(L('Status', '상태'), i.label) +
      (i.last ? line(L('Last sent', '마지막 발송'), i.day(i.last) + ' · ' + i.hm(i.last) + (i.by.length ? ' · ' + i.by.join(', ') : '')) : (i.opened ? line(L('Opened', '작성 창'), i.day(i.opened) + ' · ' + i.hm(i.opened)) : '')) +
      (i.lastIn ? line(L('Last reply', '마지막 답장'), i.day(i.lastIn.t) + ' · ' + i.hm(i.lastIn.t)) : '') +
      line(L('To', '받는 사람'), i.to || '—') +
      line(L('Emails', '메일'), i.sent + L(' sent · ', ' 보냄 · ') + i.recv + L(' received', ' 받음')) +
      '<div class="emkact"><button type="button" class="emkgo" data-emkgo>' + L('Open conversation', '대화 열기') + '</button><button type="button" class="emkx" data-emkx>' + L('Close', '닫기') + '</button></div>';
    document.body.appendChild(bg); document.body.appendChild(p);
    bg.addEventListener('click', close);
    p.addEventListener('click', e => { if(e.target.closest('[data-emkgo]')){ close(); R.open(i.key); } else if(e.target.closest('[data-emkx]')) close(); });
    if(innerWidth > 760){
      const rc = btn.getBoundingClientRect(), W = 290, H = p.offsetHeight;
      const left = Math.min(Math.max(12, rc.left), innerWidth - W - 12); let top = rc.bottom + 8;
      if(top + H > innerHeight - 12) top = Math.max(12, rc.top - H - 8);
      p.style.left = left + 'px'; p.style.top = top + 'px';
    }
    const f = p.querySelector('.emkgo'); if(f) f.focus({preventScroll: true});
  }
  window.__illuEmkOpen = () => !!document.querySelector('.emkpop');
  window.__illuEmkClose = close;
  /* the marker's click must not open the card underneath */
  const stop = e => { const b = e.target.closest && e.target.closest('.emk'); if(!b) return false; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return b; };
  for(const ev of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'dblclick']) document.addEventListener(ev, e => { stop(e); }, true);
  document.addEventListener('click', e => { const b = stop(e); if(b) open(b); }, true);
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && document.querySelector('.emkpop')){ e.preventDefault(); e.stopPropagation(); close(); } }, true);
  addEventListener('resize', () => { if(innerWidth > 760) close(); });
  document.addEventListener('scroll', e => { if(innerWidth > 760 && document.querySelector('.emkpop') && !(e.target.closest && e.target.closest('.emkpop'))) close(); }, {passive: true, capture: true});

  const st = document.createElement('style');
  st.textContent = `
.emk{position:absolute;left:8px;top:8px;z-index:9;display:inline-flex;align-items:center;gap:5px;border:0;border-radius:7px;padding:4px 8px 4px 7px;font:700 11px/1.2 Inter,system-ui,sans-serif;color:#fff;background:#6d2561;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.25);white-space:nowrap;max-width:calc(100% - 16px)}
.emk span{overflow:hidden;text-overflow:ellipsis}
.emk svg{width:12px;height:12px;flex:none;fill:none;stroke:currentColor;stroke-width:2.4}
.emk.replied{background:#2e8b57}.emk.waiting{background:#b7791f}
.emk.opened{background:rgba(20,14,20,.58);outline:1.5px dashed rgba(255,255,255,.85);outline-offset:-3px}
.emk:hover{filter:brightness(1.1)}
.emk:focus-visible{outline:2px solid #fff;outline-offset:1px}
.emk.sm{left:auto;right:3px;top:3px;padding:3px;border-radius:6px}
.emk.sm svg{width:11px;height:11px}
.emkbg{position:fixed;inset:0;z-index:9998}
.emkpop{position:fixed;z-index:9999;width:290px;background:var(--surf,#fff);color:var(--ink,inherit);border:1px solid var(--line,#ece6ec);border-radius:14px;box-shadow:0 12px 32px rgba(30,10,30,.2);padding:13px 14px;font-size:12.5px}
.emkpop h4{margin:0 0 2px;font-size:13.5px}
.emksub{color:var(--dim,#8b8189);font-size:11.5px;margin-bottom:8px}
.emkln{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-top:1px solid var(--line,#ece6ec)}
.emkln span{color:var(--dim,#8b8189);flex:none}.emkln b{font-weight:500;text-align:right;overflow-wrap:anywhere}
.emkact{display:flex;gap:8px;margin-top:10px}
.emkgo,.emkx{border:1px solid var(--acc,#6d2561);border-radius:999px;padding:6px 12px;font:inherit;font-size:12px;cursor:pointer}
.emkgo{background:var(--acc,#6d2561);color:#fff}.emkx{background:none;color:var(--acc,#6d2561)}
@media (max-width:760px){
  .emkbg{background:rgba(20,10,20,.35)}
  .emkpop{left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));top:auto;width:auto;padding:14px}
  .emk{font-size:10px;padding:3px 6px}
}`;
  document.head.appendChild(st);
})();
