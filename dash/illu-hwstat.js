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
    if(!rows.length){ if(b) b.remove(); return; }
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
    const html = '<button type="button" class="hwhead' + (bad.length ? ' warn' : '') + '" data-hwtoggle aria-expanded="' + OPEN + '">' + E(head) + '</button>' +
      (OPEN ? '<ul>' + rows.map(line).join('') + '</ul><p>' + E(L('Each person\'s program reads their own Hiworks mail; what it finds is shared with everyone.', '각자의 프로그램이 자신의 Hiworks 메일을 읽고, 찾은 내용은 모두에게 공유됩니다.')) + '</p>' : '');
    if(b.__h !== html){ b.innerHTML = html; b.__h = html; }
    place();
  }
  /* 1.2.305 (user, 27 Nov 2026: "there is overlapping going on here"): the bar sits to the right of the Supabase meter
     (bottom-left) instead of on top of it */
  let RO = null;
  function place(){
    const b = document.getElementById('hwstat'); if(!b) return;
    const u = document.querySelector('#illuusage.float');
    let left = '';
    if(u && u.getClientRects().length && innerWidth > 640){ const r = u.getBoundingClientRect(); if(r.width && innerHeight - r.bottom < 40) left = Math.round(r.right + 8) + 'px'; }
    if(b.style.left !== left) b.style.left = left;
    if(u && !RO && typeof ResizeObserver === 'function'){ RO = new ResizeObserver(place); RO.observe(u); }
  }
  addEventListener('resize', place);
  setInterval(place, 2000);
  setInterval(paint, 60e3);
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#hwstat [data-hwtoggle], #hwstat [data-hwsignin]'); if(!t) return;
    e.preventDefault(); e.stopPropagation();
    if(t.hasAttribute('data-hwtoggle')){ OPEN = !OPEN; try{ localStorage.setItem('illu.hwstat.open', OPEN ? '1' : '0'); }catch(er){} paint(); return; }
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
@media (max-width:640px){#hwstat{left:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px))}}`;
  document.head.appendChild(css);
})();
