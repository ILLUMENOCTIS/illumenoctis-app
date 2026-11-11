/* ==================== Booking as a pipeline (redesign, 1.2.93) ====================
   The Booking page opens as the board in the approved picture: three tabs (Processing ·
   Completed · Cancelled) and, for Processing, five columns - Email, Guarantee Type,
   Contract, Visa, Flight. A card sits in the column of the first stage that is not done
   yet, with a five-part bar showing which stages are done (green) and which one is being
   worked on (amber). Dragging a card to another column marks every stage before that
   column done, and the stages from that column on not done - the same lights the card
   itself has. Clicking a card opens it. "Cards" shows the board as it was before. */
(function(){
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const STG = [['email', 'Email', '이메일'], ['guar', 'Guarantee Type', '개런티 유형'], ['contract', 'Contract', '계약'], ['visa', 'Visa', '비자'], ['flight', 'Flight', '항공권']];
  const KEY = 'illu.bkpipe', TABK = 'illu.bkpipetab', MINEK = 'illu.bkpipemine';
  const get = (k, d) => { try{ const v = localStorage.getItem(k); return v == null ? d : v; }catch(e){ return d; } };
  const set = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
  /* 1.2.105 (user, 8 Nov 2026): only the new board - the old Cards view is gone */
  const S = {on: true, tab: get(TABK, 'proc'), mine: get(MINEK, '0') === '1'};

  const SNAME = {o: ['Not started', '시작 전'], y: ['In process', '진행 중'], g: ['Done', '완료']};
  const lightOf = (c, k) => { const st = (c.s && c.s[k]) || {}; return (st.p === 'g' || st.p === 'y') ? st.p : (st.d ? 'g' : ''); };
  function stageIdx(c){ for(let i = 0; i < STG.length; i++) if(lightOf(c, STG[i][0]) !== 'g') return i; return STG.length; }
  const n1 = v => v == null || v === '' || isNaN(+v) ? null : Math.round(+v * 10) / 10;
  function measLine(c){
    let f = {}; try{ f = bkFacts(c) || {}; }catch(e){}
    const ht = n1(f.ht), bu = n1(f.bu), wa = n1(f.wa), hp = n1(f.hp), eu = n1(f.eu);
    if(ht == null && bu == null && wa == null && hp == null) return '';
    return [ht, [bu, wa, hp].map(x => x == null ? '–' : x).join('-'), eu].filter(x => x != null && x !== '').join(' · ');
  }
  /* small notes on the card, only from what the card holds */
  function tags(c, i){
    const out = [];
    /* 1.2.130: still on the Team Vote (sent to Booking, or Get files, before the vote ended) */
    try{ if(c.k && window.__illuVoteState && /^(open|tie)$/.test(window.__illuVoteState(c.k))) out.push(['w', L('Team Vote still open', '팀 투표 진행 중')]); }catch(e){}
    const GT = {no: L('No Guarantee', '노 개런티'), cond: L('Condition', '컨디션'), net: L('Net Guarantee', '넷 개런티')};
    if(c.gty && GT[c.gty]) out.push(['', GT[c.gty]]);
    if(c.vty) out.push(['', c.vty === 'e6' ? 'E-6' : 'C-4']);
    if(Array.isArray(c.ctlog) && c.ctlog.length) out.push(['g', L('Contract made', '계약서 작성됨')]);
    else if(i === 2 && (c.gty === 'net' || c.gty === 'no')){ try{ const b = window.__illuContract && window.__illuContract.build(c); if(b && !b.ok) out.push(['w', L(b.bad.size + ' missing for the contract', '계약서 ' + b.bad.size + '개 누락')]); }catch(e){} }
    if(i === 3 && !String(c.ppn || '').trim()) out.push(['w', L('Passport number missing', '여권 번호 없음')]);
    if(i === 4 && !String(c.ind || '').trim()) out.push(['w', L('Entry date missing', '입국일 없음')]);
    return out;
  }
  function cardHTML(c, i){
    let ph = ''; try{ ph = bkPhoto(c) || ''; }catch(e){}
    const ml = measLine(c);
    const bar = STG.map(([k, en, ko]) => { const l = lightOf(c, k); return '<button type="button" class="bpseg ' + (l === 'g' ? 'd' : l === 'y' ? 'n' : '') + '" data-bpseg="' + H(c.id + '|' + k) + '" title="' + H(L(en + ': ' + SNAME[l || 'o'][0] + ' — press to change', ko + ': ' + SNAME[l || 'o'][1] + ' — 눌러서 바꾸기')) + '" aria-label="' + H(L(en + ': ' + SNAME[l || 'o'][0], ko + ': ' + SNAME[l || 'o'][1])) + '"><i></i></button>'; }).join('');
    let who = ''; try{ const p = PEOPLE.get(c.by); who = p ? p.n : ''; }catch(e){}
    return '<article class="bpc" draggable="true" data-bpc="' + H(c.id) + '" tabindex="0" title="' + H(L('Open the card', '카드 열기')) + '">' +
      '<div class="bppic">' + (ph ? '<img src="' + H(ph) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span>' + H(String(c.nm || '?').charAt(0)) + '</span>') + '</div>' +
      '<div class="bpbody"><div class="bpag">' + H(c.ag || L('Agency not set', '에이전시 없음')) + '</div><b>' + H(c.nm || L('(no name)', '(이름 없음)')) + '</b>' +
      '<div class="bpmx">' + H(ml || L('Measurements missing', '사이즈 없음')) + '</div>' +
      '<div class="bpbar" role="group" aria-label="' + H(L('Stages', '단계')) + '">' + bar + '</div>' +
      '<div class="bptags">' + tags(c, i).map(([cl, t]) => '<span class="bptag ' + cl + '">' + H(t) + '</span>').join('') + (who ? '<span class="bpwho" title="' + H(L('In charge of this card', '이 카드 담당')) + '">' + H(L('In charge: ', '담당: ') + who) + '</span>' : '<span class="bpwho none">' + H(L('No one in charge', '담당자 없음')) + '</span>') + '</div></div></article>';
  }
  function rowsNow(){
    let all = []; try{ all = bkSorted(); }catch(e){ return []; }
    let term = ''; try{ term = (q.value || '').trim().toLowerCase(); }catch(e){}
    let me = null; try{ me = ME; }catch(e){}
    return all.filter(c => { try{ if(!bkPasses(c, term)) return false; }catch(e){} return !S.mine || c.by === me; });
  }
  function render(){
    const pane = document.getElementById('pane-bk'), main = document.getElementById('bkmain');
    if(!pane || !main) return;
    let box = document.getElementById('bkpipe');
    if(!box){ box = document.createElement('div'); box.id = 'bkpipe'; main.parentNode.insertBefore(box, main); }
    document.body.classList.toggle('bkpipeon', S.on);
    const rows = rowsNow();
    const of = k => rows.filter(c => bkStOf(c) === k);
    const P = of('proc'), D = of('done'), C = of('canc');
    const tab = (k, en, ko, n) => '<button type="button" role="tab" aria-selected="' + (S.tab === k) + '" class="' + (S.tab === k ? 'on' : '') + '" data-bptab="' + k + '">' + H(L(en, ko)) + ' · ' + n + '</button>';
    let h = '<div class="bphead"><div class="bpseg" role="tablist">' + tab('proc', 'Processing', '진행 중', P.length) + tab('done', 'Completed', '완료', D.length) + tab('canc', 'Cancelled', '취소', C.length) + '</div>' +
      '<div class="bpright"><button type="button" class="bpchip' + (S.mine ? ' on' : '') + '" data-bpmine aria-pressed="' + S.mine + '">' + L('Only mine', '내 카드만') + '</button>' +
      '</div></div>';
    if(S.on){
      if(S.tab === 'proc'){
        h += '<div class="bpcols">' + STG.map(([k, en, ko], i) => {
          const list = P.filter(c => Math.min(stageIdx(c), 4) === i);
          return '<section class="bpcol" data-bpcol="' + i + '"><div class="bpch"><span>' + (i + 1) + ' · ' + H(L(en, ko)) + '</span><s>' + list.length + '</s></div>' +
            (list.length ? list.map(c => cardHTML(c, i)).join('') : '<p class="bpempty">' + H(i === 0 ? L('New cards start here', '새 카드는 여기서 시작합니다') : L('Drag a card here when the stage before is done', '앞 단계가 끝나면 카드를 여기로 끌어 오세요')) + '</p>') + '</section>';
        }).join('') + '</div>';
        const allDone = P.filter(c => stageIdx(c) >= 5);
        if(allDone.length) h += '<p class="bpnote">' + H(L(allDone.length + ' card(s) have every stage done and are still in Processing — open one and press COMPLETED.', allDone.length + '개 카드가 모든 단계를 마쳤지만 아직 진행 중입니다 — 카드를 열어 완료를 누르세요.')) + '</p>';
      }else{
        const list = S.tab === 'done' ? D : C;
        h += list.length ? '<div class="bpgrid">' + list.map(c => cardHTML(c, Math.min(stageIdx(c), 4))).join('') + '</div>'
          : '<p class="bpempty big">' + H(S.tab === 'done' ? L('Nothing completed yet.', '완료된 카드가 없습니다.') : L('Nothing cancelled.', '취소된 카드가 없습니다.')) + '</p>';
      }
    }
    if(box.__h !== h){ box.__h = h; box.innerHTML = h; }
  }
  window.__illuPipe = {render, stageIdx, S};
  try{
    const o = window.renderBook;
    if(typeof o === 'function' && !o.__bp){ const w = function(){ const r = o.apply(this, arguments); try{ render(); }catch(e){} return r; }; w.__bp = true; window.renderBook = w; }
  }catch(e){}

  /* move a card to column i: stages before i done, the rest not done */
  function moveTo(bid, i){
    const c = BOOK.get(bid); if(!c) return;
    try{ if(!SIGNED()){ nudgeSignIn(); return; } }catch(e){}
    const had = (c.s && typeof c.s === 'object' && !Array.isArray(c.s)) ? c.s : {};
    const ns = Object.assign({}, had);
    STG.forEach(([k], j) => {
      const st = (had[k] && typeof had[k] === 'object') ? had[k] : {};
      const now = lightOf(c, k);
      /* the column it lands in is the stage being worked on: amber if it had been done */
      const want = j < i ? 'g' : j === i ? (now === 'g' ? 'y' : now) : (now === 'g' ? '' : now);
      ns[k] = Object.assign({}, st, {p: want, d: want === 'g'});
    });
    c.s = ns;
    try{ saveBook(bid, true); }catch(e){}
    try{ renderBook(); }catch(e){ render(); }
  }
  /* 1.2.123 (user, 9 Nov 2026): any stage can be put back - Done -> In process or Not started - even after it
     was completed, from the booking board (press a part of the five-part bar) and from the Stages tab on the
     card. Putting a stage back on a Completed booking moves it back to Processing. */
  function setStage(bid, k, v){
    const c = BOOK.get(bid); if(!c) return;
    if(typeof SIGNED === 'function' && !SIGNED()){ try{ nudgeSignIn(); }catch(e){} return; }
    v = v === 'g' || v === 'y' ? v : '';
    const had = (c.s && typeof c.s === 'object' && !Array.isArray(c.s)) ? c.s : {};
    const st = (had[k] && typeof had[k] === 'object') ? had[k] : {};
    const was = lightOf(c, k); if(was === v) return;
    const ns = Object.assign({}, had); ns[k] = Object.assign({}, st, {p: v, d: v === 'g'});
    c.s = ns;
    let moved = false;
    if(v !== 'g' && c.st === 'done'){ try{ moved = bkMoveTo(bid, 'proc'); }catch(e){} }
    if(!moved){ try{ saveBook(bid, true); }catch(e){} try{ renderBook(); }catch(e){ render(); } }
    try{ if(typeof bv !== 'undefined' && bv && bv.id === bid) bvDraw(); }catch(e){}
    const nm = (STG.find(x => x[0] === k) || [k, k, k]);
    toast(L(nm[1] + ' is now ' + SNAME[v || 'o'][0].toLowerCase() + (moved ? ' — the booking is back in Processing.' : '.'), nm[2] + ' → ' + SNAME[v || 'o'][1] + (moved ? ' — 부킹이 진행 중으로 돌아갔습니다.' : '')));
  }
  window.__illuSetStage = setStage;
  let menu = null, toastT = 0;
  function toast(t){
    let n = document.getElementById('bptoast'); if(!n){ n = document.createElement('div'); n.id = 'bptoast'; n.setAttribute('role', 'status'); document.body.appendChild(n); }
    n.textContent = t; n.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { n.hidden = true; }, 3500);
  }
  /* the menu stays next to the part of the bar it belongs to, even while the board scrolls */
  function place(){
    if(!menu) return; const btn = menu.__a;
    if(!btn || !btn.isConnected){ closeMenu(); return; }
    const r = btn.getBoundingClientRect(), w = menu.offsetWidth, h = menu.offsetHeight;
    if(r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth){ closeMenu(); return; }
    let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8), y = r.bottom + 6;
    if(y + h > innerHeight - 8) y = Math.max(8, r.top - h - 6);
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
  }
  function closeMenu(){ if(menu){ menu.remove(); menu = null; } }
  function openMenu(btn){
    closeMenu();
    const [bid, k] = btn.dataset.bpseg.split('|'); const c = BOOK.get(bid); if(!c) return;
    const nm = STG.find(x => x[0] === k), now = lightOf(c, k) || 'o';
    menu = document.createElement('div'); menu.id = 'bpmenu'; menu.setAttribute('role', 'menu');
    menu.innerHTML = '<div class="bpmh"><b>' + H(L(nm[1], nm[2])) + '</b><span>' + H(c.nm || '') + '</span></div>' +
      [['o', ''], ['y', 'y'], ['g', 'g']].map(([s, v]) => '<button type="button" role="menuitemradio" aria-checked="' + (now === s) + '" class="bpmi ' + s + '" data-bpset="' + H(bid + '|' + k + '|' + v) + '"><i></i>' + H(L(SNAME[s][0], SNAME[s][1])) + (now === s ? '<em>✓</em>' : '') + '</button>').join('');
    document.body.appendChild(menu); menu.__a = btn; place();
    const first = menu.querySelector('[aria-checked="true"]') || menu.querySelector('button'); if(first) first.focus({preventScroll: true});
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-bpseg],[data-bpset]');
    if(!t){ if(menu && !(e.target.closest && e.target.closest('#bpmenu'))) closeMenu(); return; }
    e.preventDefault(); e.stopPropagation();
    if(t.dataset.bpseg){ openMenu(t); return; }
    const [bid, k, v] = t.dataset.bpset.split('|'); closeMenu(); setStage(bid, k, v);
  }, true);
  document.addEventListener('keydown', e => { if(menu && e.key === 'Escape'){ e.stopPropagation(); closeMenu(); } }, true);
  addEventListener('resize', () => requestAnimationFrame(place)); document.addEventListener('scroll', () => requestAnimationFrame(place), true);
  function openCard(bid){
    try{ if(typeof bvOpenFor === 'function' && bvOpenFor(bid)) return; }catch(e){}
    /* the booking window opens every card now, with or without a photograph (the old Cards board is gone) */
  }
  window.__illuOpenBkCard = openCard;
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#bkpipe [data-bptab],#bkpipe [data-bpview],#bkpipe [data-bpmine],#bkpipe [data-bpc]'); if(!t) return;
    if(t.dataset.bptab){ S.tab = t.dataset.bptab; set(TABK, S.tab); render(); return; }
    if(t.hasAttribute('data-bpmine')){ S.mine = !S.mine; set(MINEK, S.mine ? '1' : '0'); render(); return; }
    if(t.dataset.bpc) openCard(t.dataset.bpc);
  });
  document.addEventListener('keydown', e => { const t = e.target.closest && e.target.closest('#bkpipe [data-bpc]'); if(t && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); openCard(t.dataset.bpc); } });
  let drag = '';
  document.addEventListener('dragstart', e => { const t = e.target.closest && e.target.closest('#bkpipe [data-bpc]'); if(!t) return; drag = t.dataset.bpc; t.classList.add('drag'); try{ e.dataTransfer.setData('text/plain', drag); e.dataTransfer.effectAllowed = 'move'; }catch(er){} });
  document.addEventListener('dragend', () => { drag = ''; document.querySelectorAll('#bkpipe .drag,#bkpipe .over').forEach(x => x.classList.remove('drag', 'over')); });
  document.addEventListener('dragover', e => { if(!drag) return; const col = e.target.closest && e.target.closest('#bkpipe [data-bpcol]'); if(!col) return; e.preventDefault(); document.querySelectorAll('#bkpipe .over').forEach(x => { if(x !== col) x.classList.remove('over'); }); col.classList.add('over'); });
  document.addEventListener('drop', e => { if(!drag) return; const col = e.target.closest && e.target.closest('#bkpipe [data-bpcol]'); if(!col) return; e.preventDefault(); const id = drag; drag = ''; moveTo(id, +col.dataset.bpcol); });
  /* the language switch and the filters redraw it */
  try{ new MutationObserver(() => render()).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']}); }catch(e){}
  document.addEventListener('input', e => { if(typeof VIEW !== 'undefined' && VIEW === 'bk' && e.target && !e.target.closest('#pane-bk .bkcard, .bv, .ctpanel')) setTimeout(render, 50); });

  const css = document.createElement('style');
  css.textContent = `
body.bkpipeon #bkmain{display:none!important}
#bkpipe{display:flex;flex-direction:column;gap:14px;margin:4px 0 16px;font-family:var(--sans,Inter,system-ui,sans-serif);color:var(--ink)}
#bkpipe .bphead{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px}
#bkpipe .bpright{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#bkpipe .bpseg{display:inline-flex;background:var(--surf);border:1px solid var(--line);border-radius:10px;padding:3px;gap:2px}
#bkpipe .bpseg button{border:0;background:none;font:inherit;font-size:13px;font-weight:600;color:var(--faint);padding:0 13px;border-radius:7px;min-height:32px;cursor:pointer}
#bkpipe .bpseg button.on{background:var(--acc);color:#fff}
#bkpipe .bpchip{height:34px;border:1px solid var(--line);background:var(--surf);border-radius:999px;padding:0 14px;font:inherit;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer}
#bkpipe .bpchip.on{border-color:var(--acc);color:var(--acc)}
#bkpipe .bpcols{display:grid;grid-template-columns:repeat(5,minmax(200px,1fr));gap:12px;overflow-x:auto;padding-bottom:6px;align-items:start}
#bkpipe .bpcol{background:var(--surf2,#f4f1f6);border:1px solid var(--line);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:10px;min-height:220px;box-sizing:border-box}
#bkpipe .bpcol.over{border-color:var(--acc);box-shadow:inset 0 0 0 2px var(--acc)}
#bkpipe .bpch{display:flex;justify-content:space-between;align-items:center;font-size:12px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;color:var(--faint);padding:2px 4px}
#bkpipe .bpch s{text-decoration:none;background:var(--surf);border-radius:999px;padding:1px 8px;color:var(--ink);font-size:12px}
#bkpipe .bpgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
#bkpipe .bpc{display:flex;gap:10px;background:var(--surf);border:1px solid var(--line);border-radius:12px;padding:9px;cursor:pointer;min-width:0}
#bkpipe .bpc:hover,#bkpipe .bpc:focus-visible{border-color:var(--acc);outline:none}
#bkpipe .bpc.drag{opacity:.45}
#bkpipe .bppic{width:56px;height:72px;border-radius:9px;overflow:hidden;flex:none;background:var(--surf2,#eee);display:grid;place-items:center;font-weight:700;color:var(--faint)}
#bkpipe .bppic img{width:100%;height:100%;object-fit:cover;display:block}
#bkpipe .bpbody{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
#bkpipe .bpag{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#bkpipe .bpbody b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#bkpipe .bpmx{font-size:12px;color:var(--faint);font-variant-numeric:tabular-nums}
#bkpipe .bpbar{display:flex;gap:3px;margin:0 0 -2px}
#bkpipe .bpseg{flex:1;min-width:0;height:16px;padding:0;border:0;background:none;cursor:pointer;display:flex;align-items:center;border-radius:4px}
#bkpipe .bpseg i{display:block;width:100%;height:5px;border-radius:3px;background:var(--line);transition:height .12s}
#bkpipe .bpseg:hover i,#bkpipe .bpseg:focus-visible i{height:8px}
#bkpipe .bpseg:focus-visible{outline:2px solid var(--acc);outline-offset:1px}
#bkpipe .bpseg.d i{background:#3f9b62}#bkpipe .bpseg.n i{background:#e0a400}
@media (pointer:coarse){#bkpipe .bpseg{height:24px}#bkpipe .bpseg i{height:7px}}
#bpmenu{position:fixed;z-index:9600;min-width:190px;background:var(--surf,#fff);color:var(--ink);border:1px solid var(--line);border-radius:12px;box-shadow:0 16px 40px -12px rgba(30,10,40,.4);padding:6px;display:flex;flex-direction:column;gap:2px}
#bpmenu .bpmh{padding:4px 8px 6px;display:flex;flex-direction:column;line-height:1.25}
#bpmenu .bpmh b{font-size:13px}#bpmenu .bpmh span{font-size:11.5px;color:var(--mut)}
#bpmenu .bpmi{display:flex;align-items:center;gap:9px;border:0;background:none;border-radius:8px;padding:8px 10px;min-height:38px;font:inherit;font-size:13px;color:inherit;cursor:pointer;text-align:left}
#bpmenu .bpmi:hover,#bpmenu .bpmi:focus-visible{background:var(--wash,#f3e8f2);outline:none}
#bpmenu .bpmi i{width:10px;height:10px;border-radius:50%;border:1.5px solid var(--line);flex:none}
#bpmenu .bpmi.y i{background:#e0a400;border-color:#e0a400}#bpmenu .bpmi.g i{background:#3f9b62;border-color:#3f9b62}
#bpmenu .bpmi em{margin-left:auto;font-style:normal;color:var(--acc);font-weight:700}
#bpmenu .bpmi[aria-checked="true"]{font-weight:700}
#bptoast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(20px + env(safe-area-inset-bottom,0px));z-index:9601;background:#1b1724;color:#fff;border-radius:10px;padding:9px 14px;font-size:13px;box-shadow:0 12px 30px rgba(0,0,0,.3);max-width:calc(100vw - 32px);pointer-events:none}
@media (prefers-reduced-motion:reduce){#bkpipe .bpseg i{transition:none}}
#bkpipe .bptags{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
#bkpipe .bptag{font-size:11px;font-weight:600;border-radius:6px;padding:1px 6px;background:var(--surf2,#f4ecf2);color:var(--acc)}
#bkpipe .bptag.w{background:#fff3d6;color:#7a5200}#bkpipe .bptag.g{background:#e6f3ea;color:#24603a}
#bkpipe .bpwho{font-size:11px;color:var(--faint);margin-left:auto}
#bkpipe .bpwho.none{color:#9a6a00;font-weight:600}
#bkpipe .bpempty{margin:6px 4px;font-size:12.5px;color:var(--faint)}
#bkpipe .bpempty.big{font-size:14px;padding:30px;text-align:center}
#bkpipe .bpnote{margin:0;font-size:13px;color:#7a5200}
`;
  document.head.appendChild(css);
  setTimeout(() => { try{ render(); }catch(e){} }, 300);
})();
/* 1.2.105 (user, 8 Nov 2026): the old Cards board is gone. A new card opens straight in the booking
   window with its Name field ready to type in; the window's header follows the name as it is typed. */
(function(){
  window.addEventListener('click', e => {
    if(!e.target.closest || !(e.target.closest('#bknew') || e.target.closest('#bknew2') || e.target.closest('.abnew'))) return;
    const before = new Set(); try{ for(const k of BOOK.keys()) before.add(k); }catch(err){}
    let n = 0;
    const look = () => {
      let id = ''; try{ for(const k of BOOK.keys()) if(!before.has(k)) id = k; }catch(err){}
      if(!id){ if(++n < 20) setTimeout(look, 100); return; }
      try{ window.__illuOpenBkCard(id); }catch(err){}
      setTimeout(() => { const i = document.querySelector('.bvin[data-bk="' + CSS.escape(id) + '"][data-bf="nm"]'); if(i){ try{ i.focus(); }catch(err){} } }, 250);
    };
    setTimeout(look, 60);
  }, true);
  document.addEventListener('input', e => {
    const el = e.target; if(!el || !el.classList || !el.classList.contains('bvin')) return;
    const f = el.dataset.bf; if(!['nm', 'ag', 'city', 'country'].includes(f)) return;
    let c = null; try{ c = BOOK.get(el.dataset.bk); }catch(err){}
    if(!c) return;
    const h = document.querySelector('.bvnm'), a = document.querySelector('.bvag');
    if(h && f === 'nm') h.textContent = c.nm || 'Unnamed';
    if(a && f !== 'nm') a.textContent = [c.ag, [c.city, c.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
    try{ window.__illuPipe.render(); }catch(err){}
  });
})();
/* 1.2.105: the photograph is set in the booking window itself - click the small picture at the top left to
   choose one, or drop a photo on it (it was on the old Cards board) */
(function(){
  const bid = () => (typeof bv !== 'undefined' && bv) ? bv.id : '';
  const redraw = () => { try{ if(typeof bvDraw === 'function' && bid()) bvDraw(); }catch(e){} };
  async function setPic(f){
    const id = bid(); if(!id || !f) return;
    try{ await setBookPic(id, f); }catch(e){}
    redraw();
  }
  document.addEventListener('click', e => {
    const f = e.target.closest && e.target.closest('.bv .bvface'); if(!f) return;
    try{ if(!SIGNED()){ nudgeSignIn(); return; } }catch(er){}
    e.preventDefault(); e.stopPropagation();
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', () => { const x = inp.files && inp.files[0]; if(x) setPic(x); });
    inp.click();
  }, true);
  document.addEventListener('dragover', e => { if(e.target.closest && e.target.closest('.bv .bvface')){ e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
  document.addEventListener('drop', e => { const f = e.target.closest && e.target.closest('.bv .bvface'); if(!f) return; e.preventDefault(); e.stopPropagation(); const x = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if(x) setPic(x); }, true);
  const css = document.createElement('style');
  css.textContent = `.bv .bvface{cursor:pointer;position:relative}
.bv .bvface:empty::after{content:"+ photo";position:absolute;inset:0;display:grid;place-items:center;font:600 10.5px var(--sans,Inter,system-ui,sans-serif);color:var(--mut);text-align:center}
.bv .bvface:hover{outline:2px solid var(--acc,#5A2C57);outline-offset:1px}`;
  document.head.appendChild(css);
})();
/* 1.2.105: Female / Male is chosen in the booking window (it was on the old Cards board) */
(function(){
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.bv [data-bvsex]'); if(!b) return;
    e.preventDefault();
    try{ if(!SIGNED()){ nudgeSignIn(); return; } }catch(er){}
    const id = (typeof bv !== 'undefined' && bv) ? bv.id : ''; const c = id && BOOK.get(id); if(!c) return;
    c.g = c.g === b.dataset.bvsex ? '' : b.dataset.bvsex;
    try{ saveBook(id, true); }catch(er){}
    try{ renderBook(); }catch(er){}
    try{ bvDraw(); }catch(er){}
  });
  const css = document.createElement('style');
  css.textContent = `.bv .bvsex{display:inline-flex;border:1px solid var(--line);border-radius:8px;padding:2px;gap:2px}
.bv .bvsex button{border:0;background:none;border-radius:6px;padding:3px 10px;font:inherit;font-size:12px;font-weight:600;color:var(--mut);cursor:pointer}
.bv .bvsex button[aria-pressed="true"]{background:var(--acc,#5A2C57);color:#fff}`;
  document.head.appendChild(css);
})();
