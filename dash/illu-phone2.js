/* ==================== 1.2.274: phone layout (user, 22 Nov 2026) ====================
   Phones only (max-width 760px); the computer program looks and works as before.
   - Today: the greeting is one compact line (short date, "Good morning, Paul", the Processing count as a button);
     "MDI MODEL MANAGEMENT BOOKING" and the empty space under the top bar are gone (user chose "D").
   - Top bar: every button the same rounded square, evenly spaced, closer to the top of the screen ("E1").
   - Team Vote: Remind is a small bell with the count up in the Team Vote / Emails tab row, so it no longer takes a
     row of its own; "Booking Emails" reads "Emails" on a phone ("R1").
   - Directory: search and one Filters button; the other controls (MDI Agency Contacts, Region, Country, ...,
     Maximize, Sort, Download) open in a sheet from the bottom. The start screen is region tiles ("P2", illu-dir2.js).
   - Atlas map: the count bubbles are sized to the phone's map (s18.js). */
(function(){
  'use strict';
  const PH = () => { try{ return matchMedia('(max-width:760px)').matches; }catch(e){ return false; } };
  const KO = () => { try{ return document.documentElement.lang === 'ko' || (window.illuLang && window.illuLang() === 'ko'); }catch(e){ return false; } };
  const L = (en, ko) => KO() ? ko : en;

  const css = `
.shhdph,#d2phflt,#d2phsheet,#d2phveil{display:none}
.bemwrap{position:relative}
@media (max-width:760px){
  /* ---- top bar (E1) ---- */
  html body #appbar{margin-top:-14px!important;border-radius:0!important;background:transparent!important}
  html body #appbar .abi{height:46px!important;padding:0 2px 0 4px!important}
  html body #appbar #shtitle{font-size:22px!important}
  html body #appbar .abr{gap:6px!important;align-items:center!important}
  html body #appbar .abi .abr>button:not(#zz),html body #appbar .abi #abflt:not(#zz),html body #appbar .abi #abtools .abnew[data-abproxy="dirxbtn"]:not(#zz){width:34px!important;min-width:34px!important;height:34px!important;padding:0!important;margin:0!important;border-radius:11px!important;border:1px solid var(--line,#EEE6EE)!important;box-shadow:none!important;place-items:center!important;justify-content:center!important;align-items:center!important}
  html body #appbar .abr>button svg,html body #appbar #abflt svg{width:17px!important;height:17px!important}
  html body #appbar .abi #abnc:not(#zz){border-color:transparent!important}
  html body #appbar .abi .abr>#abme:not(#zz){width:30px!important;min-width:30px!important;height:30px!important;border-radius:999px!important;margin:0 2px!important}
  /* ---- Today greeting (D) ---- */
  #pane-today{padding-top:2px!important}
  #pane-today .shlay{row-gap:4px!important}
  #pane-today .shhead{display:none!important}
  #pane-today .shhdph{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 8px;min-width:0}
  .shhdpt{min-width:0}
  .shkick2{font-size:11px;letter-spacing:.1em;color:var(--dim,#8F8794);font-weight:600}
  .shgr2{display:block;font-size:19px;font-weight:700;color:var(--ink,#141014);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .shpill{flex:none;display:inline-flex;align-items:center;gap:4px;padding:6px 11px;border-radius:999px;border:0;background:var(--accsoft,#F3ECF3);color:var(--acc,#6B2A67);font:inherit;font-size:13px;font-weight:500;white-space:nowrap;cursor:pointer}
  .shpill b{font-weight:700}
  .shpill svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.8}
  /* ---- Remind up in the tab row (R1) ---- */
  .bemwb{display:none}
  .bemwrap .bemsw button{padding-left:9px!important;padding-right:9px!important}
  #pane-dir .d2s-p{padding-top:6px!important;margin-top:0!important}
  #pane-dir .d2s-p .d2st{padding-top:0!important;margin-top:0!important}
  .bemwrap .bemsw{padding-right:112px}
  .bemwrap .ivrow.ivth>.ivinfo{position:absolute!important;top:7px;right:72px;z-index:3;margin:0!important}
  .bemwrap .ivrow.ivth>.ivinfo>summary{width:28px!important;height:28px!important}
  .bemwrap .ivrow.ivth>.ivremind{position:absolute!important;top:4px;right:0;z-index:3;font-size:0!important;padding:0 9px!important;height:34px!important;min-height:34px!important;gap:3px!important;margin:0!important}
  .bemwrap .ivrow.ivth>.ivremind b{font-size:11px!important}
  .bemwrap .ivrow.ivth>.ivremind svg{width:17px!important;height:17px!important}
  .bemwrap .ivrow.ivth>.ivsp{display:none!important}
  /* ---- Directory: search + Filters ---- */
  #d2bar .d2r1{flex-wrap:nowrap!important;gap:8px!important}
  #d2bar .d2r1 .d2q{flex:1 1 auto!important;min-width:0!important}
  #d2bar .d2r1>:not(.d2q):not(#d2phflt){display:none!important}
  #d2phflt{display:inline-flex!important;flex:none;align-items:center;gap:6px;height:42px;padding:0 12px;border-radius:12px;border:1px solid var(--line,#EADFEA);background:var(--surf,#fff);font:inherit;font-size:14px;color:var(--ink,#3B2F3B);cursor:pointer}
  #d2phflt svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
  #d2phflt em{font-style:normal;min-width:18px;height:18px;border-radius:9px;background:var(--acc,#6B2A67);color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;padding:0 5px}
  #d2phflt em:empty{display:none}
  #d2phveil.on{display:block;position:fixed;inset:0;background:rgba(20,10,20,.35);z-index:9000}
  #d2phsheet.on{display:block;position:fixed;left:0;right:0;bottom:0;z-index:9001;background:var(--surf,#fff);border-radius:20px 20px 0 0;padding:6px 16px calc(22px + env(safe-area-inset-bottom,0px));box-shadow:0 -8px 30px rgba(0,0,0,.15);max-height:80vh;overflow-y:auto}
  #d2phsheet .d2phh{display:flex;justify-content:space-between;align-items:center;padding:12px 2px 10px}
  #d2phsheet .d2phh b{font-size:17px}
  #d2phsheet .d2phh button{border:0;background:none;color:var(--acc,#6B2A67);font:inherit;font-weight:600;font-size:15px;padding:6px 2px;cursor:pointer}
  #d2phsheet .d2phb{display:flex;flex-wrap:wrap;gap:8px;padding:4px 0 6px}
  #d2phsheet .d2phb>*{display:inline-flex!important}
  #d2phsheet .d2phb .d2sort{width:100%;align-items:center;gap:8px}
  #d2phsheet .d2phb .d2sort select{flex:1;min-width:0}
  #d2phsheet .d2phdl{width:100%;justify-content:center;height:40px;border-radius:12px;border:1px solid var(--line,#EADFEA);background:none;font:inherit;font-size:14px;color:var(--ink,#3B2F3B);margin-top:6px;cursor:pointer}
  #d2bar.d2phon{z-index:9000!important}
  #d2phsheet.on{bottom:var(--d2phnav,0px)!important}
  #d2phsheet .fpscroll{display:flex!important;flex-wrap:wrap!important;gap:8px!important;overflow:visible!important;width:100%;mask-image:none!important;-webkit-mask-image:none!important}
  #d2phsheet .fpscroll>*{flex:none!important}
  #d2bar.d2phon #d2pop:not([hidden]){position:fixed!important;left:12px!important;right:12px!important;top:auto!important;bottom:calc(var(--d2phnav,0px) + 12px)!important;width:auto!important;max-width:none!important;max-height:55vh!important;overflow-y:auto!important;z-index:9003!important;transform:none!important}
}`;
  const st = document.createElement('style'); st.id = 'illu-phone2-css'; st.textContent = css; document.head.appendChild(st);

  /* ---------- Directory Filters sheet: the real controls move into it while it is open, and back afterwards ---------- */
  let back = [];
  function activeCount(r1){
    let n = 0;
    r1.querySelectorAll('.d2f').forEach(b => { if(b.getAttribute('aria-pressed') === 'true') n++; const v = b.querySelector('.d2fv'); if(v && v.textContent.trim()) n++; });
    return n;
  }
  function ensureBtn(){
    const r1 = document.querySelector('#d2bar .d2r1'); if(!r1) return;
    let b = document.getElementById('d2phflt');
    if(!b){
      b = document.createElement('button'); b.type = 'button'; b.id = 'd2phflt';
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg><span></span><em></em>';
      const q = r1.querySelector('.d2q'); if(q) q.after(b); else r1.prepend(b);
    }
    b.querySelector('span').textContent = L('Filters', '필터');
    const n = activeCount(r1); const em = b.querySelector('em'); const t = n ? String(n) : ''; if(em.textContent !== t) em.textContent = t;
  }
  function open(){
    const r1 = document.querySelector('#d2bar .d2r1'); if(!r1 || !document.getElementById('d2bar')) return;
    let v = document.getElementById('d2phveil'), sh = document.getElementById('d2phsheet');
    /* inside the Directory's bar, so its own click handling keeps working on the moved controls */
    const host = document.getElementById('d2bar');
    if(!v){ v = document.createElement('div'); v.id = 'd2phveil'; v.addEventListener('click', close); }
    if(!sh){ sh = document.createElement('div'); sh.id = 'd2phsheet'; sh.setAttribute('role', 'dialog'); }
    host.appendChild(v); host.appendChild(sh);
    sh.innerHTML = '<div class="d2phh"><b>' + L('Filters', '필터') + '</b><button type="button" data-d2phdone>' + L('Done', '완료') + '</button></div><div class="d2phb"></div>';
    const body = sh.querySelector('.d2phb');
    back = [];
    for(const el of [...r1.children]){
      if(el.classList.contains('d2q') || el.id === 'd2phflt' || el.classList.contains('d2sp')) continue;
      const mark = document.createComment('d2ph'); el.before(mark); back.push([el, mark]); body.appendChild(el);
    }
    const dl = document.querySelector('#abtools .abnew[data-abproxy="dirxbtn"]');
    if(dl && dl.offsetParent){ const d = document.createElement('button'); d.type = 'button'; d.className = 'd2phdl'; d.textContent = '↓ ' + L('Download this list', '이 목록 다운로드'); d.addEventListener('click', () => { close(); dl.click(); }); body.appendChild(d); }
    sh.querySelector('[data-d2phdone]').addEventListener('click', close);
    const nav = document.getElementById('shrail'); const nh = nav && nav.offsetParent ? Math.max(0, innerHeight - nav.getBoundingClientRect().top) : 0;
    host.style.setProperty('--d2phnav', nh + 'px'); host.classList.add('d2phon');
    v.classList.add('on'); sh.classList.add('on');
    try{ history.pushState({d2ph: 1}, ''); }catch(e){}
  }
  function close(){
    const v = document.getElementById('d2phveil'), sh = document.getElementById('d2phsheet');
    for(const [el, mark] of back){ if(mark.parentNode){ mark.replaceWith(el); } }
    back = [];
    if(v) v.classList.remove('on'); if(sh) sh.classList.remove('on');
    { const h = document.getElementById('d2bar'); if(h) h.classList.remove('d2phon'); }
    const pop = document.getElementById('d2pop'); if(pop && !pop.hidden){ try{ document.body.click(); }catch(e){} }
    ensureBtn();
  }
  window.__illuD2PhClose = close;
  addEventListener('popstate', () => { if(back.length) close(); });
  document.addEventListener('click', e => {
    if(e.target.closest && e.target.closest('#d2phflt')){ e.preventDefault(); open(); return; }
    /* Maximize closes the sheet first */
    if(back.length && e.target.closest && e.target.closest('#d2phsheet [data-d2max]')) setTimeout(close, 0);
  }, true);
  setInterval(() => { if(PH() && !document.hidden) ensureBtn(); }, 1500);
  setTimeout(ensureBtn, 400);
  addEventListener('resize', () => { if(!PH() && back.length) close(); });
})();
