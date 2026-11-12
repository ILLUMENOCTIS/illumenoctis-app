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
    /* 1.2.165: why it was cancelled */
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
    let ph = ''; try{ ph = (window.__illuBkPic ? window.__illuBkPic(c, 200) : bkPhoto(c)) || ''; }catch(e){}
    const ml = measLine(c);
    const bar = STG.map(([k, en, ko]) => { const l = lightOf(c, k); return '<button type="button" class="bpseg ' + (l === 'g' ? 'd' : l === 'y' ? 'n' : '') + '" data-bpseg="' + H(c.id + '|' + k) + '" title="' + H(L(en + ': ' + SNAME[l || 'o'][0] + ' — press to change', ko + ': ' + SNAME[l || 'o'][1] + ' — 눌러서 바꾸기')) + '" aria-label="' + H(L(en + ': ' + SNAME[l || 'o'][0], ko + ': ' + SNAME[l || 'o'][1])) + '"><i></i></button>'; }).join('');
    let who = ''; try{ const p = PEOPLE.get(c.by); who = p ? p.n : ''; }catch(e){}
    function crDate(c){ const d = c.at ? new Date(c.at) : null; if(!d || isNaN(d)) return '';
      const ko = isKO(), y = d.getFullYear() !== new Date().getFullYear();
      const sh = ko ? (y ? String(d.getFullYear()).slice(2) + '.' : '') + (d.getMonth() + 1) + '.' + d.getDate() : d.getDate() + ' ' + d.toLocaleString('en-GB', {month: 'short'}) + (y ? ' ' + String(d.getFullYear()).slice(2) : '');
      const full = d.toLocaleDateString(ko ? 'ko-KR' : 'en-GB', {day: 'numeric', month: 'long', year: 'numeric'});
      return '<span class="bpcr" title="' + H(L('Card created ' + full, '카드 생성일 ' + full)) + '"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>' + H(sh) + '</span>'; }
    return '<article class="bpc" draggable="true" data-bpc="' + H(c.id) + '" tabindex="0" title="' + H(L('Open the card', '카드 열기')) + '">' +
      '<div class="bpside">' + '<div class="bppic">' + (ph ? '<img src="' + H(ph) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span>' + H(String(c.nm || '?').charAt(0)) + '</span>') + '</div>' + crDate(c) + '</div>' +
      '<div class="bpbody"><div class="bpag">' + H(c.ag || L('Agency not set', '에이전시 없음')) + '</div><b>' + H(c.nm || L('(no name)', '(이름 없음)')) + '</b>' +
      '<div class="bpmx">' + H(ml || L('Measurements missing', '사이즈 없음')) + '</div>' +
      '<div class="bpbar" role="group" aria-label="' + H(L('Stages', '단계')) + '">' + bar + '</div>' +
      '<div class="bptags">' + tags(c, i).map(([cl, t]) => '<span class="bptag' + (cl ? ' bpt' + cl : '') + '" title="' + H(cl === 'r' && c.cxl ? t + (c.cxl.why && c.cxl.r !== 'own' ? ' — ' + c.cxl.why : '') : t) + '">' + H(t) + '</span>').join('') + (who ? '<button type="button" class="bpwho" data-bkhand="' + H(c.id) + '" title="' + H(L('In charge of this card — click to hand it to someone else', '이 카드 담당 — 눌러서 다른 사람에게 넘기기')) + '">' + H(L('In charge: ', '담당: ') + who) + ' ▾</button>' : '<button type="button" class="bpwho none" data-bkhand="' + H(c.id) + '">' + H(L('No one in charge', '담당자 없음')) + ' ▾</button>') + '</div></div></article>';
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
    let h = '<div class="bphead"><div class="bptabs" role="tablist">' + tab('proc', 'Processing', '진행 중', P.length) + tab('done', 'Completed', '완료', D.length) + tab('canc', 'Cancelled', '취소', C.length) + '</div>' +
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
        h += list.length ? '<div class="bpgrid">' + list.map(c => '<div class="bprw">' + cardHTML(c, Math.min(stageIdx(c), 4)) + (S.tab === 'canc' && c.cxl && window.__illuCxlLabel ? (() => { const t = window.__illuCxlLabel(c.cxl), f = t + (c.cxl.why && c.cxl.r !== 'own' ? ' — ' + c.cxl.why : ''); return '<div class="bpwhy" title="' + H(f) + '"><b>' + H(L('Why: ', '사유: ')) + '</b>' + H(f) + '</div>'; })() : '') + (S.tab === 'canc' || S.tab === 'done' ? '<button type="button" class="bprev" data-bprevive="' + H(c.id) + '">↺ ' + H(L('Back to Processing', '진행 중으로 되돌리기')) + '</button>' : '') + '</div>').join('') + '</div>'
          : '<p class="bpempty big">' + H(S.tab === 'done' ? L('Nothing completed yet.', '완료된 카드가 없습니다.') : L('Nothing cancelled.', '취소된 카드가 없습니다.')) + '</p>';
        /* 1.2.159: deleted cards, kept so they can come back */
        if(S.tab === 'canc' && TRASH.size) h += '<div class="bptrash"><h4>' + H(L('Deleted cards', '삭제된 카드')) + ' · ' + TRASH.size + '</h4><div class="bptl">' + [...TRASH.values()].sort((p, q) => String(q.at).localeCompare(String(p.at))).map(t => '<div class="bpti"><b>' + H((t.c && t.c.nm) || '?') + '</b><span>' + H(((t.c && t.c.ag) || '') + ' · ' + L('deleted ', '삭제 ') + String(t.at || '').slice(0, 10) + (t.by && PEOPLE.get(t.by) ? ' · ' + PEOPLE.get(t.by).n : '')) + '</span><button type="button" class="bprev" data-bprestore="' + H(t.c && t.c.id) + '">↺ ' + H(L('Restore', '되살리기')) + '</button></div>').join('') + '</div></div>';
      }
    }
    if(box.__h !== h){ box.__h = h; box.innerHTML = h; }
  }
  const TRASH = new Map();
  (function lt(){ if(typeof DB === 'undefined' || !DB){ setTimeout(lt, 900); return; } try{ DB.collection('bktrash').onSnapshot(sn => { TRASH.clear(); for(const x of (sn.docs || [])){ const v = typeof docOf === 'function' ? docOf(x) : x.data(); if(v && v.c && v.c.id && !v.back && !BOOK.has(v.c.id)) TRASH.set(v.c.id, v); } render(); }, () => {}); }catch(e){} })();
  document.addEventListener('click', async e => {
    const r = e.target.closest && e.target.closest('#bkpipe [data-bprevive], #bkpipe [data-bprestore]'); if(!r) return;
    e.preventDefault(); e.stopPropagation();
    try{ if(typeof SIGNED === 'function' && !SIGNED()){ if(typeof nudgeSignIn === 'function') nudgeSignIn(); return; } }catch(er){}
    if(r.dataset.bprevive){ try{ bkMoveTo(r.dataset.bprevive, 'proc'); }catch(er){} S.tab = 'proc'; render(); return; }
    const t = TRASH.get(r.dataset.bprestore); if(!t) return;
    const c = JSON.parse(JSON.stringify(t.c)); BOOK.set(c.id, c);
    try{ await DB.doc('book/' + c.id).set(c); }catch(er){}
    try{ await DB.doc('bktrash/' + c.id).set(Object.assign({}, t, {back: {by: ME || '', at: new Date().toISOString()}})); }catch(er){}
    TRASH.delete(c.id); try{ renderBook(); }catch(er){} render();
  }, true);
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
#bkpipe .bptabs{display:inline-flex;background:var(--surf);border:1px solid var(--line);border-radius:10px;padding:3px;gap:2px}
#bkpipe .bptabs button{border:0;background:none;font:inherit;font-size:13px;font-weight:600;color:var(--faint);padding:0 13px;border-radius:7px;min-height:32px;cursor:pointer}
#bkpipe .bptabs button.on{background:var(--acc);color:#fff}
/* 1.2.166: framed tabs so Processing / Completed / Cancelled are easy to spot */
#bkpipe .bptabs{border:1.5px solid color-mix(in srgb,var(--acc) 35%,var(--line));padding:4px;gap:4px;box-shadow:0 1px 3px rgba(40,20,50,.08)}
#bkpipe .bptabs button{border:1px solid var(--line);background:var(--surf);color:var(--ink);opacity:.85;min-height:34px;padding:0 14px}
#bkpipe .bptabs button:hover{border-color:var(--acc);opacity:1}
#bkpipe .bptabs button.on{border-color:var(--acc);opacity:1;box-shadow:0 2px 6px -2px color-mix(in srgb,var(--acc) 60%,transparent)}
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
#bkpipe .bpside{display:flex;flex-direction:column;align-items:center;gap:5px;flex:none}#bkpipe .bpcr{flex:none;display:inline-flex;align-items:center;gap:3px;font-size:10.5px;font-weight:600;color:var(--faint);white-space:nowrap}#bkpipe .bpcr svg{width:11px;height:11px}#bkpipe .bpag{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
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
#bkpipe .bpwhy{font-size:11.5px;color:#8A1F33;background:#FBECEF;border-radius:8px;padding:4px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}#bkpipe .bprw{min-width:0;display:flex;flex-direction:column;gap:4px}#bkpipe .bprev{align-self:flex-start;border:1px solid var(--line,#E1D9E6);background:var(--surf,#fff);color:var(--acc,#5A2C57);border-radius:999px;padding:5px 11px;font:600 12px inherit;font-family:inherit;cursor:pointer}
#bkpipe .bptrash{margin-top:18px;border-top:1px solid var(--line,#E7E2EC);padding-top:12px}#bkpipe .bptrash h4{margin:0 0 8px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}#bkpipe .bptl{display:flex;flex-direction:column;gap:6px}#bkpipe .bpti{display:flex;align-items:center;gap:10px;border:1px dashed var(--line,#E1D9E6);border-radius:10px;padding:8px 10px}#bkpipe .bpti span{flex:1;color:var(--faint);font-size:12px}
#bkpipe .bptags{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
#bkpipe .bptag{font-size:11px;font-weight:600;border-radius:6px;padding:1px 6px;background:var(--surf2,#f4ecf2);color:var(--acc)}
/* 1.2.156: bare .w / .g collided with other rules and blew the tag up (user: "the yellow portion is too big") */
#bkpipe .bptag.bptr{background:#FBECEF;color:#8A1F33;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#bkpipe .bptag.bptw{background:#fff3d6;color:#7a5200}#bkpipe .bptag.bptg{background:#e6f3ea;color:#24603a}
#bkpipe .bptag{width:auto;height:auto;flex:none;line-height:1.5}
#bkpipe .bpwho{font-size:11px;color:var(--faint);margin-left:auto;border:0;background:none;padding:2px 4px;border-radius:6px;cursor:pointer;font-family:inherit}#bkpipe .bpwho:hover{background:var(--surf2,#f4ecf2);color:var(--fg,#211C26)}
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

/* 1.2.156 (user, 12 Nov 2026: "I am in charge of the card/model, allow me to pass the responsibility to another USER so they
   can continue working on the model"): click "In charge" on a booking card (Booking board, On-Stay board, the card itself)
   -> choose the person -> confirm. The person in charge (or anyone, when no one is) can hand it over. Kept in c.bylog. */
(function(){
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const nm = p => { try{ const r = PEOPLE.get(p); return r ? r.n : ''; }catch(e){ return ''; } };
  const disc = p => { try{ return idDisc(p) || ''; }catch(e){ return ''; } };
  let box = null, cur = null;
  function close(){ if(box){ box.remove(); box = null; cur = null; } }
  function place(anchor){
    const r = anchor.getBoundingClientRect(), w = 260;
    let x = Math.min(innerWidth - w - 12, Math.max(12, r.right - w)), y = r.bottom + 6;
    if(y + 300 > innerHeight) y = Math.max(12, r.top - 306);
    box.style.left = x + 'px'; box.style.top = y + 'px';
  }
  function draw(){
    if(!box || !cur) return;
    let c = null; try{ c = BOOK.get(cur.id); }catch(e){} if(!c){ close(); return; }
    let me = ''; try{ me = ME || ''; }catch(e){}
    const can = !c.by || c.by === me;
    let ppl = []; try{ ppl = [...PEOPLE.keys()].filter(p => p !== c.by && !(typeof GONEID !== 'undefined' && GONEID.has && GONEID.has(p))); }catch(e){}
    ppl.sort((a, b) => nm(a).localeCompare(nm(b)));
    if(cur.to){
      box.innerHTML = '<b class="bkhh">' + H(L('Hand ' + (c.nm || 'this card') + ' to ' + nm(cur.to) + '?', (c.nm || '이 카드') + '를 ' + nm(cur.to) + '님에게 넘길까요?')) + '</b>' +
        '<p class="bkhp">' + H(L(nm(cur.to) + ' will be in charge from now on: the card, her emails and the next steps. ' + (c.by ? nm(c.by) + ' stops being in charge.' : ''), '이제 ' + nm(cur.to) + '님이 카드, 메일, 다음 단계를 담당합니다.' + (c.by ? ' ' + nm(c.by) + '님은 담당에서 빠집니다.' : ''))) + '</p>' +
        '<div class="bkhb"><button type="button" class="bkhgo" data-bkhgo>' + H(L('Hand over', '넘기기')) + '</button><button type="button" data-bkhback>' + H(L('Back', '뒤로')) + '</button></div>';
      return;
    }
    box.innerHTML = '<b class="bkhh">' + H(L('In charge', '담당')) + ': ' + H(c.by ? nm(c.by) : L('no one', '없음')) + '</b>' +
      (can ? '<p class="bkhp">' + H(L('Hand this card to:', '이 카드를 넘길 사람:')) + '</p>' + ppl.map(p => '<button type="button" class="bkhpp" data-bkhto="' + H(p) + '">' + disc(p) + '<span>' + H(nm(p)) + '</span></button>').join('')
        : '<p class="bkhp">' + H(L('Only ' + nm(c.by) + ' can hand this card to someone else.', nm(c.by) + '님만 이 카드를 다른 사람에게 넘길 수 있습니다.')) + '</p>') +
      (Array.isArray(c.bylog) && c.bylog.length ? '<div class="bkhl">' + c.bylog.slice(-3).reverse().map(x => '<span>' + H((x.from ? nm(x.from) : L('no one', '없음')) + ' → ' + nm(x.to) + ' · ' + String(x.at || '').slice(0, 10)) + '</span>').join('') + '</div>' : '');
  }
  function open(id, anchor){
    close(); cur = {id, to: ''};
    box = document.createElement('div'); box.className = 'bkhand'; box.setAttribute('role', 'dialog');
    document.body.appendChild(box); draw(); place(anchor);
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-bkhand]');
    if(t){ e.preventDefault(); e.stopPropagation(); if(cur && cur.id === t.dataset.bkhand) close(); else open(t.dataset.bkhand, t); return; }
    if(!box || !box.contains(e.target)){ if(box) close(); return; }
    e.stopPropagation();
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.bkhto){ cur.to = b.dataset.bkhto; draw(); return; }
    if(b.hasAttribute('data-bkhback')){ cur.to = ''; draw(); return; }
    if(b.hasAttribute('data-bkhgo')){
      try{ if(typeof SIGNED === 'function' && !SIGNED()){ if(typeof nudgeSignIn === 'function') nudgeSignIn(); return; } }catch(er){}
      const c = BOOK.get(cur.id); if(!c) return close();
      let me = ''; try{ me = ME || ''; }catch(er){}
      if(c.by && c.by !== me) return close();
      c.bylog = (Array.isArray(c.bylog) ? c.bylog : []).concat([{from: c.by || '', to: cur.to, at: new Date().toISOString(), who: me}]).slice(-20);
      c.by = cur.to;
      try{ saveBook(c.id, true); }catch(er){}
      close();
      try{ renderBook(); }catch(er){} try{ window.__illuVoteChanged && window.__illuVoteChanged(); }catch(er){} try{ window.__illuTodayRender && window.__illuTodayRender(); }catch(er){} try{ window.__illuPipe && window.__illuPipe.render(); }catch(er){}
    }
  }, true);
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && box) close(); });
  addEventListener('resize', close);
  const css = document.createElement('style');
  css.textContent = `.bkhand{position:fixed;z-index:9000;width:260px;max-height:300px;overflow:auto;background:var(--surf,#fff);color:var(--fg,#211C26);border:1px solid var(--line,#E1D9E6);border-radius:12px;box-shadow:0 18px 40px -16px rgba(40,20,50,.45);padding:10px;display:flex;flex-direction:column;gap:4px;font-size:13px}
.bkhand .bkhh{font-size:13px}.bkhand .bkhp{margin:2px 0 4px;color:var(--mut,#6D6577);font-size:12px;line-height:1.45}
.bkhand .bkhpp{display:flex;align-items:center;gap:8px;border:0;background:none;padding:6px;border-radius:8px;cursor:pointer;text-align:left;font:inherit;color:inherit}
.bkhand .bkhpp:hover,.bkhand .bkhpp:focus-visible{background:var(--surf2,#f4ecf2)}
.bkhand .bkhb{display:flex;gap:6px}.bkhand .bkhb button{border:1px solid var(--line,#E1D9E6);background:var(--surf,#fff);border-radius:999px;padding:6px 12px;font:600 12.5px inherit;cursor:pointer;color:inherit}
.bkhand .bkhb .bkhgo{background:#5A2C57;border-color:#5A2C57;color:#fff}
.bkhand .bkhl{border-top:1px solid var(--line,#EEE9F1);margin-top:4px;padding-top:6px;display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--mut,#6D6577)}`;
  document.head.appendChild(css);
})();

/* 1.2.165 (user, 12 Nov 2026, approved demo): cancelling a booking asks why. The reason (and a note) stays on her card
   (c.cxl {r, why, by, at}) and shows on the Cancelled tab; three reasons can also mark her card everywhere
   ("Agency said": Not for Korea / Not available / On hold). Back to Processing keeps the last reason in c.cxlold. */
(function(){
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const R = [
    ['dates', ['The dates or timing don’t work', '날짜 또는 일정이 맞지 않음'], ['She isn’t available when we need her, or the travel dates don’t fit.', '필요한 시기에 가능하지 않거나 이동 날짜가 맞지 않습니다.'], ''],
    ['guar', ['We couldn’t agree on the guarantee', '개런티 조건 합의 불가'], ['The agency and we could not agree on the guarantee or contract terms.', '에이전시와 개런티 또는 계약 조건을 합의하지 못했습니다.'], ''],
    ['nokr', ['The agency won’t place her in Korea', '에이전시가 한국에 보내지 않음'], ['They don’t send her to Korea, or not at this time.', '한국에는 보내지 않거나, 지금은 보내지 않습니다.'], 'nokr'],
    ['krag', ['She’s booked with another Korean agency', '다른 한국 에이전시와 계약'], ['Another agency in Korea has confirmed her.', '한국의 다른 에이전시가 확정했습니다.'], 'no'],
    ['lost', ['We lost contact with the booker / agent', '부커 / 에이전트와 연락 두절'], ['No reply after several follow-ups.', '여러 번 연락했지만 답이 없습니다.'], 'later'],
    ['own', ['Other reason', '기타 사유'], ['Please write the reason below.', '아래에 사유를 적어 주세요.'], '']
  ];
  const MARK = {nokr: ['Not for Korea', '한국 불가'], no: ['Not available (with another Korean agency)', '불가 (다른 한국 에이전시)'], later: ['On hold — ask again later', '보류 — 나중에 다시 문의']};
  window.__illuCxlLabel = x => { const r = R.find(y => y[0] === (x && x.r)); return r ? (x.r === 'own' && x.why ? x.why.slice(0, 60) : L(r[1][0], r[1][1])) : L('Cancelled', '취소'); };
  const S = {bid: '', go: null, r: '', why: '', mark: true};
  function box(){ let b = document.getElementById('bkcxl'); if(!b){ b = document.createElement('div'); b.id = 'bkcxl'; document.body.appendChild(b); } return b; }
  function draw(){
    const b = box(); let c = null; try{ c = BOOK.get(S.bid); }catch(e){} if(!c){ b.hidden = true; return; }
    const r = R.find(x => x[0] === S.r), need = S.r === 'own';
    b.hidden = false;
    b.innerHTML = '<div class="cxveil" data-cxkeep></div><div class="cxdlg" role="dialog" aria-modal="true" aria-labelledby="cxt"><h3 id="cxt">' + H(L('Why is ' + (c.nm || 'this model') + '’s booking being cancelled?', (c.nm || '이 모델') + ' 부킹을 취소하는 이유는 무엇인가요?')) + '</h3>' +
      '<p class="cxsub">' + H(L('Choose the main reason. It stays on her card so the team knows what happened.', '주요 사유를 선택하세요. 카드에 남아 팀이 상황을 알 수 있습니다.')) + '</p>' +
      '<fieldset><legend>' + H(L('Reason', '사유')) + '</legend>' + R.map(x => '<label class="cxopt' + (S.r === x[0] ? ' on' : '') + '"><input type="radio" name="cxr" value="' + x[0] + '"' + (S.r === x[0] ? ' checked' : '') + '><span><b>' + H(L(x[1][0], x[1][1])) + '</b><small>' + H(L(x[2][0], x[2][1])) + '</small></span></label>').join('') + '</fieldset>' +
      '<label class="cxlab" for="cxwhy">' + H(need ? L('What happened? (required)', '무슨 일이 있었나요? (필수)') : L('Anything to add? (optional)', '덧붙일 내용 (선택)')) + '</label><textarea id="cxwhy" rows="3" maxlength="400">' + H(S.why) + '</textarea>' +
      (r && r[3] ? '<label class="cxmark ' + r[3] + '"><input type="checkbox" id="cxmk"' + (S.mark ? ' checked' : '') + '><span><b>' + H(L('Also mark her card: ', '카드에도 표시: ') + L(MARK[r[3]][0], MARK[r[3]][1])) + '</b><small>' + H(L('Shown on her card on every board, so nobody asks the agency again by mistake.', '모든 보드의 카드에 표시되어 실수로 다시 문의하지 않게 합니다.')) + '</small></span></label>' : '') +
      '<div class="cxacts"><button type="button" data-cxkeep>' + H(L('Keep it in Processing', '진행 중으로 유지')) + '</button><button type="button" class="cxgo" data-cxgo' + (!S.r || (need && !S.why.trim()) ? ' disabled' : '') + '>' + H(L('Cancel the booking', '부킹 취소')) + '</button></div></div>';
  }
  function ask(bid, go){ S.bid = bid; S.go = go; S.r = ''; S.why = ''; S.mark = true; draw(); setTimeout(() => { const i = document.querySelector('#bkcxl input[name=cxr]'); if(i) i.focus(); }, 30); }
  document.addEventListener('change', e => {
    const t = e.target; if(!t.closest || !t.closest('#bkcxl')) return;
    if(t.name === 'cxr'){ S.r = t.value; S.mark = true; draw(); if(S.r === 'own'){ const w = document.getElementById('cxwhy'); if(w) w.focus(); } }
    if(t.id === 'cxmk') S.mark = t.checked;
  }, true);
  document.addEventListener('input', e => { if(e.target.id !== 'cxwhy') return; S.why = e.target.value; const g = document.querySelector('#bkcxl [data-cxgo]'); if(g) g.disabled = !S.r || (S.r === 'own' && !S.why.trim()); }, true);
  document.addEventListener('click', e => {
    const b = document.getElementById('bkcxl'); if(!b || b.hidden || !b.contains(e.target)) return;
    if(e.target.closest('[data-cxkeep]')){ e.preventDefault(); b.hidden = true; S.go = null; return; }
    if(e.target.closest('[data-cxgo]')){ e.preventDefault();
      let c = null; try{ c = BOOK.get(S.bid); }catch(er){} if(!c || !S.r) return;
      let me = ''; try{ me = ME || ''; }catch(er){}
      const r = R.find(x => x[0] === S.r);
      c.cxl = {r: S.r, why: S.why.trim(), by: me, at: new Date().toISOString()};
      if(r && r[3] && S.mark && window.__illuAvailSet){ try{ window.__illuAvailSet(c.k || ('bid:' + c.id), {nm: c.nm || '', ag: c.ag || '', t: r[3], why: L(r[1][0], r[1][1]) + (S.why.trim() ? ' — ' + S.why.trim() : ''), from: L('Booking cancelled', '부킹 취소'), remind: ''}); }catch(er){} }
      const go = S.go; S.go = null; b.hidden = true; if(go) go();
    }
  }, true);
  document.addEventListener('keydown', e => { const b = document.getElementById('bkcxl'); if(e.key === 'Escape' && b && !b.hidden){ e.stopPropagation(); b.hidden = true; S.go = null; } }, true);
  /* every way a card is cancelled goes through here */
  function wrap(){
    if(typeof bkMoveTo !== 'function' || typeof bkDropInto !== 'function'){ setTimeout(wrap, 300); return; }
    if(window.__cxlWrapped) return; window.__cxlWrapped = true;
    const mv = bkMoveTo, dr = bkDropInto;
    window.bkMoveTo = function(bid, to){ const c = BOOK.get(bid); if(to === 'canc' && c && bkStOf(c) !== 'canc'){ ask(bid, () => mv(bid, to)); return false; }
      if(c && to !== 'canc' && bkStOf(c) === 'canc' && c.cxl){ c.cxlold = c.cxl; delete c.cxl; } return mv(bid, to); };
    window.bkDropInto = function(bid, to, overId, before){ const c = BOOK.get(bid); if(to === 'canc' && c && bkStOf(c) !== 'canc'){ ask(bid, () => dr(bid, to, overId, before)); return; }
      if(c && to !== 'canc' && bkStOf(c) === 'canc' && c.cxl){ c.cxlold = c.cxl; delete c.cxl; } return dr(bid, to, overId, before); };
  }
  wrap();
  window.__illuCxlAsk = ask;
  const css = document.createElement('style');
  css.textContent = `#bkcxl{position:fixed;inset:0;z-index:9300;display:grid;place-items:center;padding:16px}#bkcxl[hidden]{display:none}
#bkcxl .cxveil{position:absolute;inset:0;background:rgba(20,12,24,.45)}
#bkcxl .cxdlg{position:relative;width:min(520px,100%);max-height:calc(100vh - 40px);overflow:auto;background:var(--surf,#fff);color:var(--ink,#211C26);border-radius:16px;box-shadow:0 30px 70px -20px rgba(20,10,30,.55);padding:20px;display:flex;flex-direction:column;gap:12px;font-size:14px}
#bkcxl h3{margin:0;font-size:17px}#bkcxl .cxsub{margin:-6px 0 0;color:var(--mut,#6D6577);font-size:13px;line-height:1.45}
#bkcxl fieldset{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}#bkcxl legend{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--mut,#6D6577);margin-bottom:6px}
#bkcxl .cxopt{display:flex;align-items:flex-start;gap:10px;border:1px solid var(--line,#E7E2EC);border-radius:10px;padding:9px 11px;cursor:pointer}#bkcxl .cxopt:hover,#bkcxl .cxopt.on{border-color:#5A2C57}#bkcxl .cxopt.on{background:rgba(90,44,87,.07)}
#bkcxl .cxopt input{margin-top:2px;accent-color:#5A2C57}#bkcxl .cxopt b{display:block;font-size:13.5px;font-weight:600}#bkcxl .cxopt small{color:var(--mut,#6D6577);font-size:12px}
#bkcxl .cxlab{font-size:12px;font-weight:600;color:var(--mut,#6D6577)}#bkcxl textarea{border:1px solid var(--line,#E7E2EC);border-radius:10px;padding:9px 11px;font:inherit;color:inherit;background:var(--surf,#fff);resize:vertical}
#bkcxl .cxmark{display:flex;gap:10px;align-items:flex-start;border-radius:10px;padding:10px 11px;background:#FBECEF}#bkcxl .cxmark.later{background:#FDF1E1}#bkcxl .cxmark input{margin-top:2px;accent-color:#5A2C57}#bkcxl .cxmark b{font-size:13px}#bkcxl .cxmark small{display:block;color:var(--mut,#6D6577);font-size:12px;margin-top:2px}
#bkcxl .cxacts{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}#bkcxl .cxacts button{border:1px solid var(--line,#E7E2EC);background:var(--surf,#fff);color:inherit;border-radius:999px;padding:8px 16px;font:600 13px inherit;font-family:inherit;cursor:pointer}
#bkcxl .cxacts .cxgo{background:#A3283F;border-color:#A3283F;color:#fff}#bkcxl .cxacts .cxgo:disabled{opacity:.45;cursor:not-allowed}`;
  document.head.appendChild(css);
})();
