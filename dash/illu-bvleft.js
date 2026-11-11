/* ==================== The opened booking card: three zones (redesign, 1.2.93) ====================
   The approved picture puts a column on the left of the opened card:
   - how many of the card's details are filled, with what is still missing;
   - the five stages as a checklist (done ✓, being worked on, not started) - press one to
     open its notes, choices and files on the right;
   - the next action: the first stage not done, with Mark done.
   The middle (the model's files) and the right (Profile / MD / Details) stay as they are. */
(function(){
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const STG = [['email', 'Email', '이메일'], ['guar', 'Guarantee Type', '개런티 유형'], ['contract', 'Contract', '계약'], ['visa', 'Visa', '비자'], ['flight', 'Flight', '항공권']];
  const DET = [['ht', 'Height', '키'], ['bu', 'Bust', '가슴'], ['wa', 'Waist', '허리'], ['hp', 'Hips', '엉덩이'], ['eu', 'Shoes', '신발'], ['wt', 'Weight', '몸무게'],
    ['dob', 'Date of birth', '생년월일'], ['nat', 'Nationality', '국적'], ['hcol', 'Hair color', '머리 색'], ['htyp', 'Hair type', '머리 형태'], ['ecol', 'Eye color', '눈 색'],
    ['exp', 'Experience', '경력'], ['ppn', 'Passport #', '여권 번호'], ['ppi', 'Passport issued', '여권 발급일'], ['ppe', 'Passport expires', '여권 만료일'],
    ['cfrom', 'Coming from', '출발 국가'], ['avd', 'Availability (days)', '가능 기간'], ['avf', 'Available from', '가능 시작일'],
    ['ind', 'Entry date', '입국일'], ['inf', 'Entry flight', '입국 항공편'], ['outd', 'Departure date', '출국일'], ['outf', 'Departure flight', '출국 항공편']];
  const lightOf = (c, k) => { const st = (c.s && c.s[k]) || {}; return (st.p === 'g' || st.p === 'y') ? st.p : (st.d ? 'g' : ''); };
  const has = v => v != null && String(v).trim() !== '';
  function details(c){
    let f = {}; try{ f = bkFacts(c) || {}; }catch(e){}
    const miss = [];
    for(const [k, en, ko] of DET){
      const v = ['ht', 'bu', 'wa', 'hp', 'eu'].includes(k) ? f[k] : c[k];
      if(!has(v)) miss.push(L(en, ko));
    }
    return {n: DET.length - miss.length, of: DET.length, miss};
  }
  function note(c, k){
    const st = (c.s && c.s[k]) || {};
    const GT = {no: L('No Guarantee', '노 개런티'), cond: L('Condition Guarantee', '컨디션 개런티'), net: L('Net Guarantee', '넷 개런티')};
    if(k === 'guar' && GT[c.gty]) return GT[c.gty];
    if(k === 'visa' && c.vty) return c.vty === 'e6' ? 'E-6' : 'C-4';
    if(k === 'contract' && Array.isArray(c.ctlog) && c.ctlog.length) return L('Contract made ', '계약서 작성 ') + String(c.ctlog[c.ctlog.length - 1].at || '').slice(0, 10);
    const lines = String(st.t || '').split('\n').map(x => x.trim()).filter(Boolean);
    return lines.length ? lines[lines.length - 1] : '';
  }
  function html(c){
    const d = details(c);
    const pct = d.n / d.of;
    let cur = STG.findIndex(([k]) => lightOf(c, k) !== 'g');
    let h = '<div class="bvlp bvldet"><span class="bvlring" style="--p:' + pct + '"><b>' + d.n + '/' + d.of + '</b></span><div><b>' +
      H(L(d.n + ' of ' + d.of + ' details filled', d.of + '개 중 ' + d.n + '개 입력')) + '</b>' +
      (d.miss.length ? '<div class="bvlmut">' + H(L('Missing: ', '누락: ') + d.miss.slice(0, 5).join(', ') + (d.miss.length > 5 ? L(' and ' + (d.miss.length - 5) + ' more', ' 외 ' + (d.miss.length - 5) + '개') : '')) + '</div>' : '') + '</div></div>';
    /* 1.2.109: the stay (Arrival/Departure) and the model's notes, from illu-arr.js */
    try{ if(window.__illuArrStay) h += window.__illuArrStay(c); }catch(e){}
    h += '<div class="bvlp"><div class="bvlk">' + L('Stages', '단계') + '</div>' + STG.map(([k, en, ko], i) => {
      const l = lightOf(c, k), n = note(c, k);
      const open = typeof bv !== 'undefined' && bv && bv.pane === k;
      return '<button type="button" class="bvlstep ' + (l === 'g' ? 'd' : l === 'y' ? 'n' : '') + (open ? ' on' : '') + '" data-bvlsec="' + k + '">' +
        '<i>' + (l === 'g' ? '✓' : (i + 1)) + '</i><span><b>' + H(L(en, ko)) + '</b><small>' + H(n || (l === 'y' ? L('In process', '진행 중') : l === 'g' ? L('Done', '완료') : L('Not started', '시작 전'))) + '</small></span></button>';
    }).join('') + '</div>';
    if(cur >= 0){
      const [k, en, ko] = STG[cur];
      h += '<div class="bvlp"><div class="bvlk">' + L('Next action', '다음 할 일') + '</div><p class="bvlnext">' + H(L(en, ko)) +
        (lightOf(c, k) === 'y' ? ' · ' + L('in process', '진행 중') : ' · ' + L('not started', '시작 전')) + '</p>' +
        '<div class="bvlbtns"><button type="button" class="bvlb" data-bvlsec="' + k + '">' + L('Open', '열기') + '</button>' +
        '<button type="button" class="bvlb p" data-bvldone="' + k + '">' + L('Mark done', '완료 표시') + '</button></div></div>';
    }else h += '<div class="bvlp"><div class="bvlk">' + L('Next action', '다음 할 일') + '</div><p class="bvlnext">' + L('Every stage is done — mark the card COMPLETED.', '모든 단계 완료 — 카드를 완료로 옮기세요.') + '</p></div>';
    return h;
  }
  /* 1.2.105: the old Cards board is gone, so the card's status and its Delete live here (user, 8 Nov 2026) */
  let arm = '';
  function status(c){
    let cur = 'proc'; try{ cur = bkStOf(c); }catch(e){}
    const S = [['proc', 'Processing', '진행 중'], ['done', 'Completed', '완료'], ['canc', 'Cancelled', '취소']];
    return '<div class="bvlp"><div class="bvlk">' + L('Status', '상태') + '</div><div class="bvlst" role="group">' +
      S.map(([k, en, ko]) => '<button type="button" class="bvls ' + k + '" data-bvlmove="' + k + '" aria-pressed="' + (cur === k) + '">' + H(L(en, ko)) + '</button>').join('') + '</div>' +
      '<button type="button" class="bvldel' + (arm === c.id ? ' arm' : '') + '" data-bvldel>' + H(arm === c.id ? L('Press again to delete this card', '한 번 더 누르면 이 카드를 삭제합니다') : L('Delete this card', '이 카드 삭제')) + '</button></div>';
  }
  function paint(){
    if(typeof bv === 'undefined' || !bv) return;
    const c = BOOK.get(bv.id); if(!c) return;
    const body = document.querySelector('.bv .bvbody'); if(!body) return;
    let a = body.querySelector(':scope > .bvleft');
    if(!a){ a = document.createElement('aside'); a.className = 'bvleft'; a.setAttribute('aria-label', 'Stages'); body.insertBefore(a, body.firstChild); }
    body.classList.add('bvl3');
    const h = html(c) + status(c);
    if(a.__h !== h){ a.__h = h; a.innerHTML = h; }
  }
  window.__illuBvLeft = paint;
  try{
    const o = window.bvDraw;
    if(typeof o === 'function' && !o.__bl){ const w = function(){ const r = o.apply(this, arguments); try{ paint(); }catch(e){} return r; }; w.__bl = true; window.bvDraw = w; }
    const o2 = window.renderBook;
    if(typeof o2 === 'function' && !o2.__bl){ const w2 = function(){ const r = o2.apply(this, arguments); try{ paint(); }catch(e){} return r; }; w2.__bl = true; window.renderBook = w2; }
  }catch(e){}
  document.addEventListener('click', async e => {
    const mv = e.target.closest && e.target.closest('.bvleft [data-bvlmove]');
    const dl = e.target.closest && e.target.closest('.bvleft [data-bvldel]');
    if(!mv && !dl) return;
    e.preventDefault(); e.stopPropagation();
    try{ if(!SIGNED()){ nudgeSignIn(); return; } }catch(er){}
    const id = typeof bv !== 'undefined' && bv ? bv.id : ''; if(!id) return;
    if(mv){ try{ bkMoveTo(id, mv.dataset.bvlmove); }catch(er){} paint(); return; }
    if(arm !== id){ arm = id; paint(); setTimeout(() => { if(arm === id){ arm = ''; paint(); } }, 4000); return; }
    arm = '';
    try{ bvClose(); }catch(er){}
    try{ await dropBook(id); }catch(er){}
    try{ refresh(); }catch(er){}
  });
  document.addEventListener('click', e => {
    const s = e.target.closest && e.target.closest('.bvleft [data-bvlsec]');
    const d = e.target.closest && e.target.closest('.bvleft [data-bvldone]');
    if(!s && !d) return;
    e.preventDefault(); e.stopPropagation();
    if(typeof bv === 'undefined' || !bv) return;
    if(d){ try{ const st = BOOK.get(bv.id).s || {}; const k = d.dataset.bvldone; const now = (st[k] && (st[k].p || (st[k].d ? 'g' : ''))) || ''; if(now !== 'g') bkStage(bv.id, k, 'g'); }catch(er){} paint(); try{ bvDraw(); }catch(er){} return; }
    bv.pane = bv.pane === s.dataset.bvlsec ? '' : s.dataset.bvlsec;
    try{ bvDraw(); }catch(er){}
    paint();
  }, true);
  /* typed details update the count */
  document.addEventListener('input', e => { if(e.target && e.target.closest && e.target.closest('.bv')) setTimeout(paint, 0); });
  try{ new MutationObserver(paint).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']}); }catch(e){}

  const css = document.createElement('style');
  css.textContent = `
.bv:not(.bvmax) .bvbody.bvl3{grid-template-columns:250px minmax(0,1fr) clamp(360px,27vw,470px)!important}
.bv.bvsidewide:not(.bvmax) .bvbody.bvl3{grid-template-columns:250px minmax(0,1fr) min(50%,820px)!important}
.bv.bvsideoff:not(.bvmax) .bvbody.bvl3{grid-template-columns:250px minmax(0,1fr)!important}
.bv.bvmax .bvleft{display:none}
.bvleft{border-right:1px solid var(--line);background:var(--surf2,#f6f4f8);padding:12px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;min-height:0;font-family:var(--sans,Inter,system-ui,sans-serif);color:var(--ink)}
.bvleft .bvlp{background:var(--surf);border:1px solid var(--line);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:6px}
.bvleft .bvldet{flex-direction:row;align-items:center;gap:10px}
.bvleft .bvlring{--p:0;width:46px;height:46px;border-radius:50%;flex:none;display:grid;place-items:center;background:conic-gradient(var(--acc) calc(var(--p)*360deg),var(--line) 0)}
.bvleft .bvlring b{width:38px;height:38px;border-radius:50%;background:var(--surf);display:grid;place-items:center;font-size:11px}
.bvleft .bvldet>div>b{font-size:13px}
.bvleft .bvlmut{font-size:11.5px;color:var(--faint);margin-top:2px}
.bvleft .bvlk{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--faint)}
.bvleft .bvlstep{display:flex;gap:10px;align-items:flex-start;width:100%;border:0;background:none;padding:6px 4px;border-radius:8px;text-align:left;font:inherit;color:inherit;cursor:pointer}
.bvleft .bvlstep:hover,.bvleft .bvlstep.on{background:var(--surf2,#f4ecf2)}
.bvleft .bvlstep i{width:24px;height:24px;border-radius:50%;flex:none;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:700;border:2px solid var(--line);color:var(--faint);box-sizing:border-box}
.bvleft .bvlstep.d i{background:#3f9b62;border-color:#3f9b62;color:#fff}
.bvleft .bvlstep.n i{border-color:#e0a400;color:#7a5200;background:#fff3d6}
.bvleft .bvlstep span{display:flex;flex-direction:column;min-width:0}
.bvleft .bvlstep b{font-size:13px}
.bvleft .bvlstep small{font-size:11.5px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px}
.bvleft .bvlnext{margin:0;font-size:13px;font-weight:600}
.bvleft .bvlbtns{display:flex;gap:6px;flex-wrap:wrap}
.bvleft .bvlb{height:32px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--surf);font:inherit;font-size:12.5px;font-weight:600;color:var(--ink);cursor:pointer}
.bvleft .bvlb.p{background:var(--acc);border-color:var(--acc);color:#fff}
.bvleft .bvlst{display:flex;border:1px solid var(--line);border-radius:9px;padding:2px;gap:2px;background:var(--surf2,#f4ecf2)}
.bvleft .bvls{flex:1;height:30px;border:0;border-radius:7px;background:none;font:inherit;font-size:12px;font-weight:600;color:var(--mut);cursor:pointer}
/* 1.2.112: the three never overlap - side by side when they fit, one under another when the column is narrow */
.bvleft .bvls{min-width:0;padding:0 6px;white-space:nowrap}
.bvleft .bvlp{container-type:inline-size}
@container (max-width:250px){.bvleft .bvlst{flex-direction:column}.bvleft .bvls{flex:none;height:28px}}
.bvleft .bvls[aria-pressed="true"].proc{background:#C68A00;color:#fff}.bvleft .bvls[aria-pressed="true"].done{background:var(--ivg,#1EE07F);color:#0b3d23}.bvleft .bvls[aria-pressed="true"].canc{background:var(--ivr,#FF3F6C);color:#fff}
.bvleft .bvldel{margin-top:8px;width:100%;height:30px;border:1px dashed var(--line);border-radius:8px;background:none;font:inherit;font-size:12px;color:var(--mut);cursor:pointer}
.bvleft .bvldel:hover{border-color:#C81E48;color:#C81E48}
.bvleft .bvldel.arm{border-style:solid;border-color:#C81E48;background:#C81E48;color:#fff}
@media (max-width:1100px){.bvleft{display:none}.bv:not(.bvmax) .bvbody.bvl3{grid-template-columns:minmax(0,1fr) clamp(360px,27vw,470px)!important}}
`;
  document.head.appendChild(css);
})();

/* ==================== The opened card never stays half-drawn (1.2.116) ====================
   A report: the card's left and middle columns stopped drawing part-way down (white below),
   while the right column kept going; closing the card fixed it. The layout itself was right
   every time it was measured - it was the picture on the screen that went stale. Two things:
   - the dark glass behind the card no longer blurs the whole page (a full-window blur layer is
     what the graphics card most often fails to redraw after the window changes size);
   - whenever the window is resized, maximised, made full screen, or comes back into view, the
     open card is redrawn from scratch. */
(function(){
  const bv = document.querySelector('.bv'); if(!bv) return;
  const st = document.createElement('style');
  st.textContent = '.bv{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;background:rgba(18,14,24,.7)!important}' +
    '.bv .bvp.bvheal,.bv .bvp.bvheal .bvbody>*{will-change:transform}';
  document.head.appendChild(st);
  let t = 0, n = 0;
  function heal(){
    if(bv.hidden) return; const p = bv.querySelector('.bvp'); if(!p) return;
    p.classList.add('bvheal'); void p.offsetHeight;
    requestAnimationFrame(() => requestAnimationFrame(() => { p.classList.remove('bvheal'); void p.offsetHeight; n++; window.__illuBvHeals = n; }));
  }
  const soon = () => { clearTimeout(t); t = setTimeout(heal, 150); };
  addEventListener('resize', soon); addEventListener('focus', soon); addEventListener('pageshow', soon);
  document.addEventListener('visibilitychange', () => { if(!document.hidden) soon(); });
  document.addEventListener('fullscreenchange', soon);
  if(window.ResizeObserver){ const ro = new ResizeObserver(soon); const p = bv.querySelector('.bvp'); if(p) ro.observe(p); }
  new MutationObserver(() => { if(!bv.hidden) soon(); }).observe(bv, {attributes: true, attributeFilter: ['hidden', 'class']});
  window.__illuBvHeal = heal;
  /* 1.2.119: the real cause, found on the path the user named (Booking card > Profile > Notes > Contract): opening a
     stage put the cursor in its notes box, and the browser scrolled the whole card up inside its frame to show it -
     the frame cannot scroll, so the columns looked cut off and nothing could bring them back. The notes box now takes
     the cursor without moving anything (s03), and the card's frame is put back at once if anything ever scrolls it. */
  { const P = bv.querySelector('.bvp'); if(P) P.addEventListener('scroll', () => { if(P.scrollTop || P.scrollLeft){ P.scrollTop = 0; P.scrollLeft = 0; } }); }
})();

/* ==================== The Stages tab on the opened card (1.2.120) ====================
   Profile · MD · Stages · Details. The five stages in one list - number or ✓, name, what it says so far, its
   state (or how many contract parts are missing) - and the stage you open unfolds right there. */
(function(){
  const st = document.createElement('style');
  st.textContent = `
.bvside .bvvw .bvvwn{font-style:normal;font:700 10px var(--sans,inherit);background:#D5536B;color:#fff;border-radius:8px;padding:1px 5px;margin-left:5px;vertical-align:1px}
.bvside .bvvw[aria-pressed="true"] .bvvwn{background:#fff;color:#A8323C}
.bvside .stgl{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:10px 12px 12px;display:flex;flex-direction:column;gap:8px}
.bvside .stgi{border:1px solid var(--line);border-radius:12px;background:var(--paper2,var(--surf,#fff));flex:none}
.bvside .stgi.open{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc)}
.bvside .stgh{display:flex;align-items:center;gap:10px;width:100%;border:0;background:none;padding:10px 12px;cursor:pointer;text-align:left;color:var(--ink);font:inherit}
.bvside .stgh:hover .stgt b{color:var(--acc)}
.bvside .stgn{flex:none;width:26px;height:26px;border-radius:50%;border:1.5px solid var(--line);display:grid;place-items:center;font:600 12px var(--mono,monospace);color:var(--mut)}
.bvside .stgi[data-p="g"] .stgn{background:#2E8A55;border-color:#2E8A55;color:#fff}
.bvside .stgi[data-p="y"] .stgn{border-color:#E9B949;color:#9A6F14}
.bvside .stgt{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.3}
.bvside .stgt b{font-size:14px;font-weight:600}
.bvside .stgt small{font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bvside .stgp{flex:none;font-size:11px;font-weight:600;border-radius:999px;padding:2px 9px;background:var(--surf2,#f1eff6);color:var(--mut);white-space:nowrap}
.bvside .stgi[data-p="g"] .stgp{background:#E2F1E7;color:#24603A}
.bvside .stgi[data-p="y"] .stgp{background:#F8EDD4;color:#8A6212}
.bvside .stgp.miss{background:#FDE3E7!important;color:#A8323C!important}
.bvside .stgc{flex:none;width:16px;height:16px;fill:none;stroke:var(--faint);stroke-width:2;transition:transform .2s}
.bvside .stgi.open .stgc{transform:rotate(180deg)}
.bvside .stgb{padding:0 12px 12px}
.bvside .stgone{display:flex;flex-direction:column;gap:10px}
.bvside .stgnav{display:flex;align-items:center;gap:10px;padding:2px 0}
.bvside .stgnav .stgnt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.bvside .stgnav small{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
.bvside .stgnav b{font:600 18px/1.2 var(--sans);color:var(--ink)}
.bvside .stgar{width:34px;height:34px;flex:none;border:1px solid var(--line);border-radius:10px;background:var(--surf,#fff);color:var(--ink);font:600 18px/1 var(--sans);cursor:pointer;display:grid;place-items:center;padding:0}
.bvside .stgar:hover{border-color:var(--acc);color:var(--acc)}
.bvside .stgsw1{align-self:flex-start}
.bvside .stgone .stgi.open{border:0;box-shadow:none;background:none}
.bvside .stgone .stgb{padding:0}
.bvside .ctpanel,.bvside .ctpanel .ctrow{text-align:left}
.bvside .ctpanel .ctrow{align-items:stretch}
.bvside .ctpanel .ctrow > span{justify-content:flex-start}
.bvside .stgb .bvnotep{display:block;height:auto!important;min-height:0!important;overflow:visible!important;padding:0!important}
.bvside .stgb .bvnbar,.bvside .stgb .bvnchips{display:none!important}
.bvside .stgb .bvnsec{border:0!important;padding:0!important;background:none!important;height:auto!important;display:flex;flex-direction:column;gap:10px}
.bvside .stgb .bvntext{min-height:110px!important;height:auto;flex:none!important}
.bvside .stgb .bvnsec{align-items:stretch!important;text-align:left}
/* 1.2.126: the stage box's own status stripe (green = done, amber = in process) is not drawn in the Stages tab - the row above already says it, and with no inner padding it sat on top of the text */
.bvside .stgb .bksec::before{display:none!important}
.bvside .stgb .bksec .bksh{padding-left:0!important}
.bvside .stgb .bvnsec > *{width:100%;max-width:100%;align-self:stretch!important}
.bvhd .bvstpl{position:relative}
.bvhd .bvstm{position:absolute;top:-7px;right:-9px;min-width:17px;height:17px;border-radius:9px;background:#D5536B;color:#fff;font:700 10px var(--sans,inherit);display:grid;place-items:center;padding:0 4px;z-index:2;pointer-events:none}
.bvside .stgsw{display:flex;gap:4px;background:var(--surf2,#f1eff6);border:1px solid var(--line);border-radius:999px;padding:3px;margin:0 0 10px;width:max-content;max-width:100%}
.bvside .stgsb{display:flex;align-items:center;gap:6px;border:0;background:none;border-radius:999px;padding:6px 12px;min-height:32px;font:inherit;font-size:12.5px;font-weight:600;color:var(--ink2,var(--ink));cursor:pointer;white-space:nowrap}
.bvside .stgsb i{width:9px;height:9px;border-radius:50%;border:1.5px solid var(--faint,#9c93a9);flex:none}
.bvside .stgsb.y i{background:#E0A400;border-color:#E0A400}.bvside .stgsb.g i{background:#2E8A55;border-color:#2E8A55}
.bvside .stgsb[aria-checked="true"]{background:var(--card,#fff);box-shadow:0 1px 3px rgba(40,10,50,.18);color:var(--ink)}
.bvside .stgsb:focus-visible{outline:2px solid var(--acc);outline-offset:1px}
@media (prefers-reduced-motion:reduce){.bvside .stgc{transition:none}}
`;
  document.head.appendChild(st);
})();
