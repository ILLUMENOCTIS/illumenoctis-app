/* 1.2.304 (user, 27 Nov 2026: "i'm unable to see Daniel" - "Daniel's email updates. or anyone else's updates. the email updates also
   need to be available for all of the USERS to see to be able to be on the same page" - "it needs to be seen also throughout all the
   boards" - "it's not just for Daniel, but for all USERS using their own individual Hiworks login account").
   Each person's program reads only that person's own Hiworks (Sent mail on start, after a Hiworks window closes, and now every
   10 minutes; the Update from Hiworks button; the morning run). What happened is written for everyone (docs hwstat/<person>:
   when it last read, when it last worked, and whether Hiworks wants that person to sign in again), and a small bar on every board
   shows each person's email updates - so a gap (someone's Hiworks signed out) shows the same day instead of going unseen.
   Read only: nothing is sent, nothing in Hiworks changes. A sign-in is always typed by the person themselves. */
(function(){
  'use strict';
  if(window.__illuHwStat) return; window.__illuHwStat = true;
  const ko = () => { try{ return LANG === 'ko'; }catch(e){ return false; } };
  const L = (en, k) => ko() ? k : en;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const me = () => { try{ return ME || ''; }catch(e){ return ''; } };
  const pname = p => { try{ const r = PEOPLE.get(p); return r && r.n ? r.n : ''; }catch(e){ return ''; } };
  const PC = !!(window.illu && window.illu.hiworksMine && !window.illu.web);
  const ST = new Map();                 // pid -> record
  let OPEN = false;
  try{ OPEN = localStorage.getItem('illu.hwstat.open') === '1'; }catch(e){}

  /* ---------- writing my own ---------- */
  async function report(kind, r){
    if(!PC || !me()) return;
    try{ if(typeof SIGNED === 'function' && !SIGNED()) return; }catch(e){ return; }
    if(typeof DB === 'undefined' || !DB) return;
    const now = new Date().toISOString(), old = ST.get(me()) || {};
    const signin = !!(r && (r.why === 'signin' || r.need === 'signin' || r.signin));
    const ok = !!r && !signin && !r.why;
    const x = Object.assign({}, old, {p: me(), at: now, kind, signin, why: signin ? 'signin' : (r && r.why ? String(r.why).slice(0, 120) : ''), ver: String(window.ILLU_WEB_VERSION || window.__illuVersion || '')});
    if(ok){ x.ok = now; x.read = (r && r.read) || 0; x.added = (r && r.added) || 0; }
    ST.set(me(), x); paint();
    try{ await DB.doc('hwstat/' + me()).set(x); }catch(e){}
  }
  window.__illuHwReport = report;
  /* the Sent-mail check (illu-ext.js) reports what it found; it also runs every 10 minutes now */
  function hook(){
    const f = window.__illuCheckMine; if(!f){ setTimeout(hook, 2000); return; }
    if(f.__hw) return;
    const g = async function(){ const r = await f.apply(this, arguments); if(r) report('sent', r); return r; };
    g.__hw = true; window.__illuCheckMine = g;
  }
  if(PC){ hook(); setInterval(() => { try{ if(window.__illuCheckMine) window.__illuCheckMine(); }catch(e){} }, 10 * 60e3); }

  /* ---------- everyone's, for everyone ---------- */
  (function listen(){
    if(typeof DB === 'undefined' || !DB){ setTimeout(listen, 800); return; }
    try{ DB.collection('hwstat').onSnapshot(sn => { ST.clear(); for(const d of (sn.docs || [])){ const v = typeof docOf === 'function' ? docOf(d) : d.data(); if(v && v.p) ST.set(v.p, v); } paint(); }, () => {}); }catch(e){}
  })();
  const DAY = 864e5;
  const when = iso => { const t = new Date(iso); if(isNaN(t)) return ''; const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const hm = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
    if(t >= d0) return hm; if(t >= d0 - DAY) return L('yesterday ', '어제 ') + hm;
    return t.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][t.getMonth()]; };
  function stateOf(x){
    if(x.signin) return 'bad';
    if(!x.ok) return 'bad';
    if(Date.now() - Date.parse(x.ok) > DAY) return 'old';
    return 'ok';
  }
  function paint(){
    let b = document.getElementById('hwstat');
    const rows = [...ST.values()].filter(x => pname(x.p)).sort((a, b) => pname(a.p).localeCompare(pname(b.p)));
    if(!rows.length){ if(b) b.remove(); const d0 = document.getElementById('hwdot'); if(d0) d0.remove(); return; }
    if(!b){ b = document.createElement('div'); b.id = 'hwstat'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
    const bad = rows.filter(x => stateOf(x) === 'bad');
    const line = x => { const s = stateOf(x), n = pname(x.p);
      const txt = s === 'ok' ? L('updated ', '업데이트 ') + when(x.ok)
        : x.signin ? L('needs to sign in to Hiworks', 'Hiworks 로그인 필요') + (x.ok ? L(' · last update ', ' · 마지막 ') + when(x.ok) : '')
        : x.ok ? L('last update ', '마지막 업데이트 ') + when(x.ok) : L('no update yet', '아직 업데이트 없음');
      return '<li class="' + s + '"><i></i><b>' + E(n) + '</b><span>' + E(txt) + '</span>' +
        (x.p === me() && x.signin && PC ? '<button type="button" data-hwsignin>' + L('Sign in', '로그인') + '</button>' : '') + '</li>'; };
    const head = bad.length ? '⚠ ' + L('Email updates: ', '메일 업데이트: ') + bad.map(x => pname(x.p)).join(', ') + L(bad.length === 1 ? ' is behind' : ' are behind', ' 지연')
      : '✉ ' + L('Email updates', '메일 업데이트') + ' · ' + rows.map(x => pname(x.p) + ' ' + (x.ok ? when(x.ok) : '—')).join(' · ');
    const listH = '<ul>' + rows.map(line).join('') + '</ul><p>' + E(L('Each person\'s program reads their own Hiworks mail; what it finds is shared with everyone.', '각자의 프로그램이 자신의 Hiworks 메일을 읽고, 찾은 내용은 모두에게 공유됩니다.')) + '</p>';
    /* 1.2.305 (user, 27 Nov 2026 - demo "Status in the side menu"): on a computer the email status is a small ✉ dot at the bottom of
       the left menu, beside the Supabase dot (amber with a mark when someone is behind); a click opens the list next to it. The bar at
       the bottom of the page is used only on a phone, or when the menu has no room for the dot. */
    const dot = railDot(bad.length > 0, head);
    const rail = !!dot;
    b.classList.toggle('bar', !rail); b.classList.toggle('pop', rail);
    const html = rail ? (OPEN ? '<div class="hwph">' + E(L('Email updates', '메일 업데이트')) + '</div>' + listH : '')
      : '<button type="button" class="hwhead' + (bad.length ? ' warn' : '') + '" data-hwtoggle aria-expanded="' + OPEN + '">' + E(head) + '</button>' + (OPEN ? listH : '');
    if(b.__h !== html){ b.innerHTML = html; b.__h = html; }
    b.hidden = rail && !OPEN;
    place();
  }
  function railDot(warn, head){
    const foot = document.querySelector('#shrail .shfoot');
    let d = document.getElementById('hwdot');
    const ok = innerWidth > 760 && foot && foot.getClientRects().length;
    if(!ok){ if(d) d.remove(); return null; }
    if(!d){ d = document.createElement('button'); d.type = 'button'; d.id = 'hwdot'; d.setAttribute('data-hwtoggle', ''); d.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><b></b>'; }
    const u = document.getElementById('illuusage');
    const after = u && u.parentElement === foot ? u.nextSibling : foot.firstChild;
    if(d.parentElement !== foot || d.previousSibling !== (u && u.parentElement === foot ? u : null)) foot.insertBefore(d, after);
    d.classList.toggle('warn', warn); d.title = head; d.setAttribute('aria-label', head); d.setAttribute('aria-expanded', String(OPEN));
    /* no room in the menu (a short window): back to the bar */
    const r = d.getBoundingClientRect(); if(!r.width || r.bottom > innerHeight + 2 || r.top < 0){ d.remove(); return null; }
    return d;
  }
  /* 1.2.305 (user, 27 Nov 2026: "there is overlapping going on here"): the bar sits to the right of the Supabase meter
     (bottom-left) instead of on top of it */
  let RO = null;
  function place(){
    const b = document.getElementById('hwstat'); if(!b) return;
    const d = document.getElementById('hwdot');
    if(d && b.classList.contains('pop')){ const r = d.getBoundingClientRect(), rl = document.getElementById('shrail'); const x = rl ? rl.getBoundingClientRect().right : 72;
      b.style.left = Math.round(x + 10) + 'px'; b.style.bottom = Math.max(8, Math.round(innerHeight - r.bottom)) + 'px'; return; }
    b.style.bottom = '';
    const u = document.querySelector('#illuusage.float');
    let left = '';
    if(u && u.getClientRects().length && innerWidth > 640){ const r = u.getBoundingClientRect(); if(r.width && innerHeight - r.bottom < 40) left = Math.round(r.right + 8) + 'px'; }
    if(b.style.left !== left) b.style.left = left;
    if(u && !RO && typeof ResizeObserver === 'function'){ RO = new ResizeObserver(place); RO.observe(u); }
  }
  addEventListener('resize', place);
  /* the left menu is drawn again now and then: the dot is put back */
  setInterval(() => { const f = document.querySelector('#shrail .shfoot'); if(ST.size && f && innerWidth > 760 && !document.getElementById('hwdot')) paint(); else place(); }, 2000);
  addEventListener('resize', () => paint());
  setInterval(paint, 60e3);
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#hwstat [data-hwtoggle], #hwstat [data-hwsignin], #hwdot'); if(!t){ if(OPEN && document.getElementById('hwdot') && !(e.target.closest && e.target.closest('#hwstat'))){ OPEN = false; paint(); } return; }
    e.preventDefault(); e.stopPropagation();
    if(t.hasAttribute('data-hwtoggle') || t.id === 'hwdot'){ OPEN = !OPEN; try{ localStorage.setItem('illu.hwstat.open', OPEN ? '1' : '0'); }catch(er){} paint(); return; }
    /* my own sign-in: the program's Hiworks window, where the person types their own password */
    (async () => { try{ if(window.illu && window.illu.hiworksSignin) await window.illu.hiworksSignin(); }catch(er){} setTimeout(() => { try{ window.__illuCheckMine && window.__illuCheckMine(); }catch(er){} }, 4000); })();
  }, true);
  try{ if(window.illu && window.illu.onHiworksSignedIn) window.illu.onHiworksSignedIn(() => setTimeout(() => { try{ window.__illuCheckMine && window.__illuCheckMine(); }catch(e){} }, 3000)); }catch(e){}
  const css = document.createElement('style');
  css.textContent = `
#hwstat{position:fixed;left:12px;bottom:12px;z-index:900;max-width:min(380px,calc(100vw - 24px));font:500 12px/1.35 Inter,system-ui,sans-serif;color:#3a2f3e}
#hwstat .hwhead{display:block;max-width:100%;border:1px solid #e3dbe6;background:rgba(255,255,255,.96);color:#6d6577;border-radius:999px;padding:5px 11px;font:600 11.5px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(40,20,50,.08);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#hwstat .hwhead.warn{background:#FFF4E5;border-color:#F0C27A;color:#8A5A00}
#hwstat ul{list-style:none;margin:6px 0 0;padding:8px 10px;background:#fff;border:1px solid #e3dbe6;border-radius:12px;box-shadow:0 8px 24px rgba(40,20,50,.12)}
#hwstat li{display:flex;align-items:center;gap:7px;padding:3px 0}
#hwstat li i{width:8px;height:8px;border-radius:50%;flex:none;background:#2E7D5B}
#hwstat li.old i{background:#C98A00}#hwstat li.bad i{background:#B3261E}
#hwstat li b{font-weight:600;min-width:64px}#hwstat li span{flex:1;min-width:0;color:#6d6577}
#hwstat li button{border:1px solid #6d2561;background:#fff;color:#6d2561;border-radius:999px;padding:2px 9px;font:600 11px Inter,system-ui,sans-serif;cursor:pointer}
#hwstat p{margin:6px 2px 0;padding:6px 8px;background:#fff;border-radius:9px;color:#8a8291;font-size:11px;border:1px solid #eee}
@media (min-width:641px){#hwstat{left:84px}}
#hwstat.pop{width:330px;max-width:calc(100vw - 100px);z-index:2147483000}
#hwstat.pop .hwph{background:#fff;border:1px solid #e3dbe6;border-bottom:0;border-radius:12px 12px 0 0;padding:8px 12px 0;font:600 11px Inter,system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#8a8291}
#hwstat.pop .hwph + ul{margin-top:0;border-top:0;border-radius:0 0 12px 12px}
#hwdot{position:relative;width:34px;height:34px;margin:0 auto 6px;flex:none;border-radius:50%;border:1px solid var(--line,#ececee);background:var(--surf,#fff);display:grid;place-items:center;cursor:pointer;padding:0;color:#6d6577}
#hwdot svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#hwdot b{position:absolute;right:-2px;top:-2px;width:11px;height:11px;border-radius:50%;background:#C98A00;border:2px solid var(--surf,#fff);display:none}
#hwdot.warn{background:#FFF4E5;border-color:#F0C27A;color:#8A5A00}#hwdot.warn b{display:block}
#hwdot[aria-expanded="true"]{box-shadow:0 0 0 3px rgba(109,37,97,.18)}
@media (max-width:640px){#hwstat{left:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px))}}`;
  document.head.appendChild(css);
})();
