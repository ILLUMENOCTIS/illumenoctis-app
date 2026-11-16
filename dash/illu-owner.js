/* ==================== Who is in charge of a model (1.2.210) ====================
   User, 16 Nov 2026: "when a USER likes and sends to vote/booking, that person is the person responsible to continue
   with the rest of the process. If someone changes/inputs information such as the Availability & Guarantee, send a
   notification to the original USER to let them know what has been changed. Also, when a different User tries to
   change/edit something, have a security measure to ask them if they're sure they want to go ahead with the changes."
   - The person in charge: whoever sent her to Booking (her booking card's owner); before that, whoever sent her to the
     Team Vote.
   - Someone else who starts to change her details (side panel: availability, stay, guarantee, age, mother agency;
     her booking card's fields) is asked first, once per model for 15 minutes: "This is Paul's model. Change anyway?"
   - What they change is sent to the person in charge (ownnote/<id>): a pop-up with a soft chime, the system
     notification when the program is behind other windows, and an entry under the bell. Changes made close together
     go in one message.
   - "Send anyway" (someone else already booking her, illu-vote.js) was saved as wknote/ but never shown - it is shown
     the same way now. */
(function(){
  'use strict';
  if(window.__illuOwner) return; window.__illuOwner = true;
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const me = () => { try{ return ME || ''; }catch(e){ return ''; } };
  const signed = () => { try{ return !!SIGNED(); }catch(e){ return false; } };
  const pn = pid => { try{ const p = PEOPLE.get(pid) || (typeof GONEID !== 'undefined' && GONEID.get(pid)); return (p && p.n) || ''; }catch(e){ return ''; } };
  const nowIso = () => new Date().toISOString();
  const nice = s => String(s || '').toLowerCase().replace(/(^|[\s\-'])(\p{L})/gu, (a, b, c) => b + c.toUpperCase());
  const save = (path, data) => { try{ return DB.doc(path).set(data); }catch(e){ return null; } };

  /* ---------- who is in charge ---------- */
  function ownerOfKey(k){ try{ return window.__illuOwnerOf ? window.__illuOwnerOf(k) : null; }catch(e){ return null; } }
  function ownerOfCard(bid){
    let c = null; try{ c = BOOK.get(bid); }catch(e){}
    if(!c || !c.by) return null;
    return {by: c.by, nm: c.nm || '', why: 'booking', bid: c.id, k: c.k || ''};
  }

  /* ---------- asking first ---------- */
  const OKUNTIL = new Map();   // model/card -> time the "change anyway" holds until
  const HOLD = 15 * 60 * 1000;
  const PANEL = '[data-gin],[data-ggty],[data-gmode],[data-gdays],[data-pnage],[data-momed],[data-momthis],[data-momsave],[data-momclr]';
  function whoFor(el){
    if(!el || !el.closest) return null;
    if(el.matches(PANEL)){ const m = el.closest('.mx'); const k = m && m.dataset.mxk; if(!k) return null; const o = ownerOfKey(k); return o ? Object.assign({key: 'k:' + (o.bid ? 'b' + o.bid : k), k}, o) : null; }
    if(el.matches('[data-bk][data-bf]') && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !el.readOnly && !el.disabled){ const o = ownerOfCard(el.dataset.bk); return o ? Object.assign({key: 'k:b' + o.bid}, o) : null; }
    return null;
  }
  const needAsk = w => w && w.by && w.by !== me() && signed() && !((OKUNTIL.get(w.key) || 0) > Date.now());
  let ASK = null;   // {w, el}
  function ask(w, el){
    ASK = {w, el};
    let box = document.getElementById('illuown'); if(!box){ box = document.createElement('div'); box.id = 'illuown'; document.body.appendChild(box); }
    const who = pn(w.by) || L('someone else', '다른 사람'), nm = nice(w.nm) || L('this model', '이 모델');
    const why = w.why === 'booking' ? L(who + ' sent ' + nm + ' to Booking and is in charge of her.', who + '님이 ' + nm + '을(를) 부킹으로 보냈고 담당자입니다.')
      : L(who + ' sent ' + nm + ' to the Team Vote and is in charge of her.', who + '님이 ' + nm + '을(를) 팀 투표에 올렸고 담당자입니다.');
    box.innerHTML = '<div class="owveil" data-owno></div><div class="owdlg" role="alertdialog" aria-modal="true" aria-labelledby="owt"><div class="owic" aria-hidden="true">' + H((who || '?').charAt(0).toUpperCase()) + '</div>' +
      '<h4 id="owt">' + H(L('This is ' + who + '’s model', who + '님 담당 모델입니다')) + '</h4><p>' + H(why) + '</p>' +
      '<p class="owsm">' + H(L('Change her details anyway? ' + who + ' will be told what you change.', '그래도 정보를 바꿀까요? 바꾼 내용은 ' + who + '님에게 알립니다.')) + '</p>' +
      '<div class="owb"><button type="button" data-owno>' + H(L('Cancel', '취소')) + '</button><button type="button" class="pri" data-owyes>' + H(L('Change anyway', '그래도 바꾸기')) + '</button></div></div>';
    box.hidden = false; try{ box.querySelector('[data-owno]:not(.owveil)').focus(); }catch(e){}
  }
  function done(yes){
    const box = document.getElementById('illuown'); if(box) box.hidden = true;
    const a = ASK; ASK = null; if(!a || !yes) return;
    OKUNTIL.set(a.w.key, Date.now() + HOLD);
    const el = a.el; if(!el || !el.isConnected) return;
    if(/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)){ try{ el.focus(); if(el.select && el.tagName !== 'SELECT') el.select(); }catch(e){} }
    else { try{ el.click(); }catch(e){} }
  }
  /* on the window, so it runs before the panel's own click handlers (they listen on the document) */
  window.addEventListener('click', e => {
    const box = document.getElementById('illuown');
    if(box && !box.hidden && box.contains(e.target)){ if(e.target.closest('[data-owyes]')) done(true); else if(e.target.closest('[data-owno]')) done(false); return; }
    const el = e.target.closest && e.target.closest(PANEL); if(!el || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    const w = whoFor(el); if(!needAsk(w)) return;
    e.preventDefault(); e.stopImmediatePropagation(); ask(w, el);
  }, true);
  /* typing boxes: asked when the box is entered (by mouse, finger or Tab), before anything can be typed */
  document.addEventListener('focusin', e => {
    const el = e.target; if(!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    const w = whoFor(el); if(!needAsk(w)) return;
    try{ el.blur(); }catch(er){}
    ask(w, el);
  }, true);
  document.addEventListener('keydown', e => { const box = document.getElementById('illuown'); if(box && !box.hidden && e.key === 'Escape'){ e.preventDefault(); done(false); } }, true);

  /* ---------- telling the person in charge ---------- */
  const PEND = new Map();   // owner|model -> {to, k, bid, nm, href, ch: Map field -> {f, a, b}}
  let FT = 0;
  function note(o, f, a, b){
    if(!o || !o.by || o.by === me() || !signed()) return;
    a = String(a == null ? '' : a).trim(); b = String(b == null ? '' : b).trim(); if(a === b) return;
    const id = o.by + '|' + (o.bid || o.k || '');
    let p = PEND.get(id); if(!p){ p = {to: o.by, k: o.k || '', bid: o.bid || '', nm: o.nm || '', href: o.href || '', ch: new Map()}; PEND.set(id, p); }
    const was = p.ch.get(f); p.ch.set(f, {f, a: was ? was.a : a, b});
    if(p.ch.get(f).a === b) p.ch.delete(f);
    clearTimeout(FT); FT = setTimeout(flush, 20000);
  }
  function flush(){
    clearTimeout(FT);
    for(const [id, p] of PEND){
      PEND.delete(id); if(!p.ch.size) continue;
      const d = {to: p.to, by: me(), k: p.k, bid: p.bid, nm: p.nm, href: p.href, ch: [...p.ch.values()], at: nowIso()};
      save('ownnote/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), d);
    }
  }
  window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', () => { if(document.hidden) flush(); });
  window.__illuOwnFlush = flush;
  /* side panel (illu-vote.js calls this with the field and its value before and after) */
  const GLAB = {gty: ['Guarantee', '개런티'], amt: ['Guarantee amount', '개런티 금액'], mode: ['Amount is for', '금액 기준'], cgm: ['Condition guarantee per month', '컨디션 개런티 (월)'], jobs: ['Condition jobs', '컨디션 잡 수'], days: ['Stay', '체류'], avf: ['Available', '가능'], age: ['Age', '나이'], mother: ['Mother agency', '마더 에이전시']};
  const GV = {net: 'Net', cond: 'Condition', no: 'None', term: 'Whole term', month: 'Per month'};
  window.__illuOwnNote = (k, f, a, b) => {
    const o = ownerOfKey(k); if(!o) return;
    const fmt = v => { v = String(v == null ? '' : v); if(f === 'gty' || f === 'mode') return GV[v] || v; if(f === 'days' && v) return v + ' days'; if((f === 'amt' || f === 'cgm') && v) return '₩' + v; return v; };
    let href = ''; try{ href = (window.__illuVoteInfo && window.__illuVoteInfo(k) || {}).url || ''; }catch(e){}
    note(Object.assign({href}, o, {k: o.k || k}), (GLAB[f] || [f])[0], fmt(a), fmt(b));
  };
  /* her booking card's typed fields: the value when the box was entered, and the card's value after it was saved */
  const labelOf = el => {
    const t = s => String(s || '').replace(/\s+/g, ' ').trim();
    let x = t(el.getAttribute('aria-label'));
    if(!x){ const lb = el.closest('label'); if(lb){ const c = lb.cloneNode(true); c.querySelectorAll('input,select,textarea,button').forEach(n => n.remove()); x = t(c.textContent); } }
    if(!x){ let s = el.previousElementSibling; while(s && !t(s.textContent)) s = s.previousElementSibling; if(s) x = t(s.textContent); }
    if(!x) x = t(el.placeholder);
    if(!x) x = String(el.dataset.bf || '').replace(/^ct/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
    return x.slice(0, 40);
  };
  const SNAP = new WeakMap();
  document.addEventListener('focusin', e => { const el = e.target; if(el && el.matches && el.matches('[data-bk][data-bf]')){ let c = null; try{ c = BOOK.get(el.dataset.bk); }catch(er){} if(c) SNAP.set(el, String(c[el.dataset.bf] == null ? '' : c[el.dataset.bf])); } }, true);
  const after = el => setTimeout(() => {
    if(!SNAP.has(el)) return;
    let c = null; try{ c = BOOK.get(el.dataset.bk); }catch(er){} if(!c) return;
    const a = SNAP.get(el), b = String(c[el.dataset.bf] == null ? '' : c[el.dataset.bf]);
    if(a === b) return; SNAP.set(el, b);
    const o = ownerOfCard(c.id); if(!o) return;
    note(o, labelOf(el), a, b);
  }, 400);
  document.addEventListener('change', e => { const el = e.target; if(el && el.matches && el.matches('[data-bk][data-bf]')) after(el); }, true);
  document.addEventListener('focusout', e => { const el = e.target; if(el && el.matches && el.matches('[data-bk][data-bf]')) after(el); }, true);

  /* ---------- the person in charge sees it ---------- */
  const NOTES = new Map();   // id -> {coll, ...doc}
  const SEENK = () => 'illu.ownseen.' + me();
  let SEEN = null;
  const seen = () => { if(SEEN && SEEN.who === me()) return SEEN.s; let s = []; try{ s = JSON.parse(localStorage.getItem(SEENK()) || '[]'); }catch(e){} SEEN = {who: me(), s: new Set(s)}; return SEEN.s; };
  const keepSeen = () => { try{ localStorage.setItem(SEENK(), JSON.stringify([...seen()].slice(-300))); }catch(e){} };
  const isNew = x => !x.seen && !seen().has(x.id) && Date.now() - new Date(x.at) < 14 * 864e5;
  function lines(x){
    if(x.coll === 'wknote') return [L('sent her on although you are booking her', '내가 부킹 중인데 진행했습니다')];
    return (x.ch || []).slice(0, 6).map(c => (c.f || '') + ': ' + (c.a || '–') + ' → ' + (c.b || '–'));
  }
  function title(x){
    const who = pn(x.by) || L('Someone', '누군가'), nm = nice(x.nm) || L('your model', '내 모델');
    return x.coll === 'wknote' ? L(who + ' went ahead with ' + nm, who + '님이 ' + nm + ' 진행') : L(who + ' changed ' + nm, who + '님이 ' + nm + ' 정보를 바꿨습니다');
  }
  function openIt(x){
    try{ if(x.bid && typeof bvOpenFor === 'function'){ bvOpenFor(x.bid); return; } }catch(e){}
    try{ if(x.k && window.illuPhotoFull) window.illuPhotoFull('', x.nm || '', x.href || '', x.k, ''); }catch(e){}
  }
  function markSeen(x){
    seen().add(x.id); keepSeen();
    try{ const d = Object.assign({}, x, {seen: nowIso()}); delete d.id; delete d.coll; save(x.coll + '/' + x.id, d); }catch(e){}
    try{ window.__illuNotifRepaint && window.__illuNotifRepaint(); }catch(e){}
  }
  const SHOWN = new Set();
  function pop(x){
    if(SHOWN.has(x.id) || !window.__illuAlertBox) return;
    SHOWN.add(x.id);
    const box = window.__illuAlertBox();
    const el = document.createElement('div'); el.className = 'alc own'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', title(x));
    el.innerHTML = '<div class="albar"></div><div class="alin"><span class="alpic"><i>' + H((pn(x.by) || '?').charAt(0).toUpperCase()) + '</i></span><div class="altx"><div class="alk">' + H(L('YOUR MODEL', '내 담당 모델')) + '</div>' +
      '<div class="alt">' + H(title(x)) + '</div><ul class="owch">' + lines(x).map(t => '<li>' + H(t) + '</li>').join('') + '</ul></div>' +
      '<button type="button" class="alx" data-ow="ok" aria-label="' + H(L('Close', '닫기')) + '">×</button></div>' +
      '<div class="alacts"><span class="alsp"></span><button type="button" class="albtn" data-ow="ok">' + H(L('OK', '확인')) + '</button>' + (x.bid || x.k ? '<button type="button" class="albtn pri" data-ow="open">' + H(L('Open her card', '카드 열기')) + '</button>' : '') + '</div>';
    el.addEventListener('click', e => { const b = e.target.closest('[data-ow]'); if(!b) return; markSeen(x); el.classList.add('out'); setTimeout(() => el.remove(), 220); if(b.dataset.ow === 'open') openIt(x); });
    box.prepend(el);
  }
  let first = true;
  function check(){
    if(!signed()) return;
    const mine = [...NOTES.values()].filter(x => x.to === me() && x.by !== me());
    const fresh = mine.filter(isNew).sort((p, q) => String(p.at).localeCompare(String(q.at)));
    const shown = fresh.filter(x => !SHOWN.has(x.id));
    shown.slice(-3).forEach(pop);
    if(shown.length){
      try{ window.__illuChime && window.__illuChime(); }catch(e){}
      const x = shown[shown.length - 1];
      try{ window.__illuSysNote && window.__illuSysNote(title(x), lines(x).join(' · '), () => openIt(x)); }catch(e){}
    }
    first = false;
    try{ window.__illuNotifRepaint && window.__illuNotifRepaint(); }catch(e){}
  }
  (function listen(){
    if(typeof DB === 'undefined' || !DB || !signed()){ setTimeout(listen, 1000); return; }
    for(const coll of ['ownnote', 'wknote']){
      try{ DB.collection(coll).onSnapshot(sn => {
        for(const id of [...NOTES.keys()]) if(NOTES.get(id).coll === coll) NOTES.delete(id);
        for(const d of (sn.docs || [])){ const v = typeof docOf === 'function' ? docOf(d) : d.data(); if(v && v.to) NOTES.set(d.id, Object.assign({}, v, {id: d.id, coll})); }
        clearTimeout(check.t); check.t = setTimeout(check, 600);
      }, () => {}); }catch(e){}
    }
  })();
  /* the bell: changes others made to my models (the last 14 days) */
  const prevExtra = window.__illuNotifExtra;
  window.__illuNotifExtra = () => {
    let out = []; try{ out = prevExtra ? prevExtra() || [] : []; }catch(e){}
    const pad = n => String(n).padStart(2, '0');
    for(const x of NOTES.values()){
      if(x.to !== me() || x.by === me() || Date.now() - new Date(x.at) > 14 * 864e5) continue;
      const d = new Date(x.at); if(isNaN(d)) continue;
      const ts = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      out.push({ts, who: x.by, html: '<b>' + H(title(x)) + '</b> · ' + H(lines(x).join(' · ')) + ' <button type="button" class="alnb" data-owre="' + H(x.id) + '">' + H(L('Open', '열기')) + '</button>'});
    }
    return out;
  };
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-owre]'); if(!b) return; e.preventDefault(); e.stopPropagation(); const x = NOTES.get(b.dataset.owre); if(x){ markSeen(x); openIt(x); } }, true);
  window.__illuOwnerTest = {notes: () => [...NOTES.values()], check, ok: OKUNTIL, pend: PEND};

  const css = document.createElement('style');
  css.textContent = `
#illuown{position:fixed;inset:0;z-index:9700;display:grid;place-items:center;font-family:var(--sans,Inter,system-ui,sans-serif)}
#illuown[hidden]{display:none}
#illuown .owveil{position:absolute;inset:0;background:rgba(20,12,28,.42)}
#illuown .owdlg{position:relative;width:min(400px,calc(100vw - 32px));background:var(--surf,#fff);color:var(--ink,#1b1724);border-radius:18px;padding:20px 20px 16px;box-shadow:0 24px 60px -18px rgba(40,10,50,.55);text-align:left}
#illuown .owic{width:40px;height:40px;border-radius:50%;background:var(--accbg,#F3ECF3);color:var(--acc,#5A2C57);display:grid;place-items:center;font-weight:800;font-size:17px;margin-bottom:10px}
#illuown h4{margin:0 0 6px;font-size:16.5px;font-weight:750}
#illuown p{margin:0 0 6px;font-size:13.5px;line-height:1.45;color:var(--ink2,#3d3646)}
#illuown .owsm{color:var(--mut,#6D6577);font-size:12.5px}
#illuown .owb{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;flex-wrap:wrap}
#illuown .owb button{border:1px solid var(--line,#e6e0ea);background:var(--surf,#fff);color:inherit;border-radius:999px;padding:8px 16px;font:inherit;font-size:13px;font-weight:650;cursor:pointer;min-height:38px}
#illuown .owb button.pri{background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57);color:#fff}
#illual .alc.own .albar{background:linear-gradient(90deg,var(--acc,#5A2C57),#E3BE72)}
#illual .alc.own .alk{color:var(--acc,#5A2C57)}
#illual .alc.own .alpic{height:48px;border-radius:50%}
#illual .owch{margin:5px 0 0;padding:0;list-style:none;font-size:12.5px;line-height:1.45;color:var(--ink2,#3d3646)}
#illual .owch li{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (max-width:760px){#illuown .owb button{min-height:44px;flex:1}}
`;
  document.head.appendChild(css);
})();
