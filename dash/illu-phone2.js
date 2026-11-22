/* ==================== 1.2.274: phone layout (user, 22 Nov 2026) ====================
   Phones only (max-width 760px); the computer program looks and works as before.
   - Today: the greeting is one compact line (short date, "Good morning, Paul", the Processing count as a button);
     "MDI MODEL MANAGEMENT BOOKING" and the empty space under the top bar are gone (user chose "D").
   - Top bar: every button the same rounded square, evenly spaced, closer to the top of the screen ("E1").
   - Team Vote: Remind is a small bell with the count up in the Team Vote / Emails tab row, so it no longer takes a
     row of its own; "Booking Emails" reads "Emails" on a phone ("R1").
   - Directory: search and one Filters button; the other controls (MDI Agency Contacts, Region, Country, ...,
     Maximize, Sort, Download) open in a sheet from the bottom. The start screen is region tiles ("P2", illu-dir2.js).
   - Atlas map: the count bubbles are sized to the phone's map (s18.js).
   1.2.275: no greeting (the Processing count is on the Booking button), "1 new" as a small number on the Emails tab,
   the Team Vote order as a ⇅ button in the chip row, and the Emails header as option C.
   1.2.276: ↗ on the Team Vote tab (no separate button), Waiting / I voted / Approved / Cancelled as one list button,
   the Team Vote board's count · Everyone ▾ · Remind (· ⇅ order) in one line, and the top tab rows fitted to the screen. */
(function(){
  'use strict';
  const PH = () => { try{ return matchMedia('(max-width:760px)').matches; }catch(e){ return false; } };
  const KO = () => { try{ return document.documentElement.lang === 'ko' || (window.illuLang && window.illuLang() === 'ko'); }catch(e){ return false; } };
  const L = (en, ko) => KO() ? ko : en;

  const css = `
.shhdph,#d2phflt,#d2phsheet,#d2phveil,.ivdd,.ivcos{display:none}
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
  /* 1.2.275: the greeting line is gone on phones; the Processing count is on the Booking button */
  #pane-today .shhdph{display:none!important}
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

  /* ==== 1.2.275 (user, 22 Nov 2026) ==== */
  /* Processing count on the Booking button (bottom bar) */
  #shrail .shnv[data-shv="g-opus"].has .shdot[data-n]:not([data-n="0"]){top:2px!important;right:6px!important;min-width:18px!important;width:auto!important;height:18px!important;border-radius:9px!important;background:var(--acc,#6B2A67);border:2px solid var(--surf,#fff);padding:0 4px;box-sizing:border-box;display:grid!important;place-items:center;animation:none!important}
  #shrail .shnv[data-shv="g-opus"].has .shdot[data-n]:not([data-n="0"])::after{content:attr(data-n);color:#fff;font:700 10.5px/1 Inter,system-ui,sans-serif}
  #shrail .shnv[data-shv="g-opus"].beacon .shdot[data-n]:not([data-n="0"]){background:#E3BE72}
  #shrail .shnv[data-shv="g-opus"].beacon .shdot[data-n]:not([data-n="0"])::after{color:#3a2a06}
  /* "1 new" becomes a small number on the Emails tab's envelope */
  .bemsw button{position:relative}
  .bemsw .bemnewn{position:absolute!important;top:1px;left:12px;min-width:15px!important;height:15px!important;padding:0 4px!important;margin:0!important;border-radius:8px!important;font-size:0!important;line-height:15px!important;text-align:center;box-shadow:0 0 0 2px var(--surf,#fff);z-index:2}
  .bemsw .bemnewn::before{content:attr(data-n);font-size:10px;font-weight:700}
  .bemwrap .bemsw{padding-right:96px}
  /* Team Vote: the order is a small ⇅ button at the end of the chips, one row on every phone */
  #pane-today .ivtbar{flex-wrap:nowrap!important;align-items:center!important;gap:clamp(5px,1.6vw,8px)!important}
  #pane-today .ivtbar .ivtfs{flex:1 1 auto!important;min-width:0!important;overflow-x:auto!important;flex-wrap:nowrap!important;scrollbar-width:none;gap:3px!important;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 14px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 14px),transparent)}
  #pane-today .ivtbar .ivtfs::-webkit-scrollbar{display:none}
  #pane-today .ivtbar .ivtfs>*{padding:0 clamp(4px,1.9vw,8px)!important;font-size:clamp(10px,3.25vw,12.5px)!important;height:34px!important;gap:clamp(2px,1vw,4px)!important;flex:none!important;white-space:nowrap!important}
  #pane-today .ivtbar .ivtfs>.ivtfz{display:none!important}
  #pane-today .ivtbar .ivsp{display:none!important}
  #pane-today .ivtbar .ivts{flex:none!important;width:clamp(34px,10vw,40px)!important;min-width:clamp(34px,10vw,40px)!important;height:36px!important;padding:0!important;border-radius:11px!important;color:transparent!important;-webkit-appearance:none;appearance:none;background:var(--surf,#fff) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B2A67' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4'/%3E%3C/svg%3E") center/18px no-repeat!important;border:1px solid var(--line,#EADFEA)!important}
  #pane-today .ivtbar .ivts option{color:var(--ink,#1B141B)}
  /* Emails header (option C): number tiles, search + ↻, Mine / Everyone, then All / Reply in / No reply yet as tabs */
  #bem .bemtools{display:flex!important;flex-wrap:wrap!important;gap:8px!important;margin:2px 0 8px!important}
  #bem .bemtools .bemsp{display:none!important}
  #bem .bemtot{order:1;width:100%;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px!important}
  #bem .bemtot span{display:flex;flex-direction:column;align-items:center;background:var(--chip,#FAF7FA);border:1px solid var(--line,#F0E7F0);border-radius:12px;padding:7px 4px;font-size:11px;color:var(--dim,#8F8794);min-width:0}
  #bem .bemtot span b{font-size:18px;line-height:1.2}
  #bem .bemsearch{order:2;flex:1 1 calc(100% - 48px)!important;min-width:0!important;max-width:calc(100% - 48px)!important;height:40px;border-radius:12px;box-sizing:border-box}
  #bem .bemupd{order:3;flex:none;width:40px;height:40px;padding:0!important;justify-content:center;border-radius:12px!important;font-size:0!important;gap:0!important;border-color:var(--line,#EADFEA)!important}
  #bem .bemupd svg{width:17px!important;height:17px!important}
  #bem .bemwhos{order:4;flex:1 1 200px!important;min-width:0;display:flex!important;border-radius:12px;height:40px;box-sizing:border-box;align-items:stretch}
  #bem .bemwhos button{flex:1 1 0!important;justify-content:center!important;font-size:14px!important;padding:0 6px!important;min-width:0}
  #bem .bemrep{display:none!important}
  #bem .bemfdd{order:5;display:block!important;flex:none}
  #bem .bemfddb{height:40px;border-radius:12px;border:1px solid var(--line,#EADFEA);background:var(--surf,#fff);padding:0 10px;display:flex;align-items:center;gap:4px;font:inherit;font-size:14px;color:var(--ink,#3B2F3B);cursor:pointer;white-space:nowrap}
  #bem .bemfddb[aria-expanded="true"]{border-color:var(--acc,#6B2A67);background:var(--accsoft,#F3ECF3)}
  #bem .bemfddb svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
  #bem .bemfddl{position:absolute;right:0;top:46px;z-index:30;min-width:190px;background:var(--surf,#fff);border:1px solid var(--line,#E7E2EC);border-radius:12px;box-shadow:0 14px 34px rgba(20,10,30,.18);padding:6px;display:flex;flex-direction:column;gap:2px}
  #bem .bemfddl button{border:0;background:none;border-radius:8px;padding:10px 12px;font:inherit;font-size:14px;color:var(--ink,#211C26);text-align:left;display:flex;justify-content:space-between;gap:16px;cursor:pointer}
  #bem .bemfddl button s{text-decoration:none;color:var(--dim,#8F8794);font-weight:600}
  #bem .bemfddl button[aria-selected="true"]{background:var(--acc,#6B2A67);color:#fff;font-weight:600}
  #bem .bemfddl button[aria-selected="true"] s{color:#EBD8EA}
  #bem .bemhint .bemlive,#bem .bemhint .bemhtxt{display:none!important}
  #bem .bemhint{margin:0!important}

  /* ==== 1.2.276 (user, 22 Nov 2026: "C + 2 + A", and the tab rows must fit) ==== */
  /* C: an ↗ on the Team Vote tab opens the board; the separate "Team Vote →" button goes */
  .bemtvgo{display:inline-grid!important;place-items:center;width:20px;height:20px;margin-left:6px;border-radius:6px;background:var(--accsoft,#F3ECF3);color:var(--acc,#6B2A67);font-size:12px;line-height:1}
  .bemwrap .ivrow.ivth>.ivgo{display:none!important}
  /* list buttons (shared) */
  .ivdd{position:relative;display:block!important}
  .ivddb{width:100%;height:40px;border-radius:12px;border:1px solid var(--line,#EADFEA);background:var(--surf,#fff);display:flex;align-items:center;gap:6px;padding:0 12px;font:inherit;font-size:14px;font-weight:600;color:var(--ink,#1B141B);cursor:pointer;white-space:nowrap}
  .ivddb[aria-expanded="true"]{border-color:var(--acc,#6B2A67)}
  .ivddb b{color:#C2410C;font-weight:700}
  .ivddb svg{margin-left:auto;width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;flex:none}
  .ivddl{position:absolute;left:0;right:0;top:46px;z-index:40;background:var(--surf,#fff);border:1px solid var(--line,#E7E2EC);border-radius:12px;box-shadow:0 14px 34px rgba(20,10,30,.18);padding:6px;display:flex;flex-direction:column;gap:2px;min-width:190px}
  .ivddo{border:0;background:none;border-radius:8px;padding:11px 12px;font:inherit;font-size:14.5px;color:var(--ink,#211C26);text-align:left;display:flex;align-items:center;gap:8px;cursor:pointer}
  .ivddo b{margin-left:auto;color:var(--dim,#8F8794);font-weight:600}
  .ivddo[aria-selected="true"]{background:var(--acc,#6B2A67);color:#fff;font-weight:600}
  .ivddo[aria-selected="true"] b{color:#fff}
  /* 2: Today - Waiting for my vote / I voted / Approved / Cancelled as one list button */
  .bemwrap .ivrow.ivth{flex-wrap:nowrap!important;align-items:center!important;gap:8px!important}
  .bemwrap .ivrow.ivth>.ivsub{display:none!important}
  .bemwrap .ivrow.ivth>.ivdd{flex:1 1 auto;min-width:0}
  /* 1.2.279: nothing waiting - said in the button (green), no empty box */
  .bemwrap .ivddb b.ivok{color:#1E8E5A}
  #pane-today .ivempty0{display:none!important}
  /* A: Team Vote board - count, Everyone ▾ and Remind in one line */
  #pane-team .ivhead{flex-wrap:nowrap!important;align-items:center!important;gap:8px!important}
  #pane-team .ivhead>.ivchip,#pane-team .ivhead>.ivdot,#pane-team .ivhead>.ivseg{display:none!important}
  #pane-team .ivhead>.ivbig{flex:none}
  #pane-team .ivhead>.ivkick{flex:1 1 auto;min-width:0;white-space:normal!important;line-height:1.25;font-size:10.5px!important}
  #pane-team .ivhead>.ivsp{display:none!important}
  #pane-team .ivhead>.ivdd{flex:none}
  #pane-team .ivhead>.ivdd .ivddb{width:auto;background:var(--accsoft,#F6EEF5);border-color:#D9C4D8;color:var(--acc,#5A2C57);padding:0 10px 0 12px;gap:6px}
  #pane-team .ivhead>.ivdd .ivddl{left:auto;right:0}
  #pane-team .ivhead>.ivremind{flex:none;font-size:0!important;padding:0 9px!important;height:40px!important;min-height:40px!important;gap:3px!important;border-radius:12px!important}
  #pane-team .ivhead>.ivremind b{font-size:11.5px!important}
  #pane-team .ivhead>.ivremind svg{width:17px!important;height:17px!important}
  #pane-team .ivhead>.ivcos{display:block!important;flex:none;width:40px;min-width:40px;height:40px;padding:0;border-radius:12px;color:transparent;-webkit-appearance:none;appearance:none;background:var(--surf,#fff) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B2A67' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4'/%3E%3C/svg%3E") center/18px no-repeat;border:1px solid var(--line,#EADFEA)}
  #pane-team .ivhead>.ivcos option{color:var(--ink,#1B141B)}
  /* the two tab rows at the top of a page fit the screen (no sliding, nothing cut off).
     1.2.277: only rows the page shows ([hidden] rows stay hidden - 1.2.276 showed the Team Vote rows on every page),
     and only rows of 4 tabs or fewer (Atlas's 5 tabs keep sliding) */
  #shsub:not([hidden]):not(:has(> :nth-child(5))){display:flex!important;overflow:hidden!important;gap:0!important}
  #shsub:not([hidden]):not(:has(> :nth-child(5))) > *{flex:1 1 auto!important;min-width:0!important;justify-content:center!important;padding-left:clamp(2px,1vw,8px)!important;padding-right:clamp(2px,1vw,8px)!important;font-size:clamp(11.5px,3.5vw,14.5px)!important;gap:clamp(3px,1vw,6px)!important;white-space:nowrap!important}
  #shsub:not([hidden]):not(:has(> :nth-child(5))) > * svg{display:none!important}
  #shsub2:not([hidden]):not(:has(> :nth-child(5))){display:flex!important;overflow:hidden!important;gap:2px!important}
  #shsub2:not([hidden]):not(:has(> :nth-child(5))) > button{flex:1 1 auto!important;min-width:0!important;justify-content:center!important;padding-left:clamp(3px,1.2vw,8px)!important;padding-right:clamp(3px,1.2vw,8px)!important;font-size:clamp(10.5px,3.15vw,13.5px)!important;gap:clamp(2px,1vw,5px)!important;white-space:nowrap!important}
  #shsub2:not([hidden]):not(:has(> :nth-child(5))) > button em{font-size:clamp(10px,2.9vw,12px)!important;padding:0 clamp(3px,1.2vw,6px)!important}
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
