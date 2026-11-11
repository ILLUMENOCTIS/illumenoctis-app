/* ==================== Units in the top bar (1.2.130) ====================
   What the user asked for (10 Nov 2026): a measurement converter in the top bar, next to Filters;
   "I only need 1 shoe size. The filter on the top bar I asked for earlier should allow this to convert."
   - One button in the top bar ("cm · EU"); it opens two switches: Lengths cm / in, Shoe EU / US / UK.
   - Cards, the side panel and the board details all read one shoe size and lengths in that unit.
   - Lengths also set the sidebar's own unit (height in ft′in″ and bust / waist / hips in inches), so the
     filter bounds and the figures never disagree.
   - Kept per computer (localStorage), like the other display choices. */
(function(){
  if(window.__illuUnits) return; window.__illuUnits = true;
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  let U = {len: 'cm', shoe: 'EU'};
  try{ const s = JSON.parse(localStorage.getItem('illu.units') || 'null'); if(s){ if(s.len === 'in') U.len = 'in'; if(['EU', 'US', 'UK'].includes(s.shoe)) U.shoe = s.shoe; } }catch(e){}
  const num = v => { if(v == null || v === '') return null; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
  window.__illuU = () => ({len: U.len, shoe: U.shoe});
  /* a length (cm in) as text in the chosen unit; height in feet and inches */
  window.__illuLen = (v, isHt) => {
    const n = num(v); if(n == null) return null;
    if(U.len === 'cm') return String(Math.round(n * 10) / 10);
    const i = n / 2.54;
    if(isHt){ let f = Math.floor(i / 12), r = Math.round(i - f * 12); if(r === 12){ f++; r = 0; } return f + '′' + r + '″'; }
    return String(Math.round(i * 2) / 2);
  };
  window.__illuLenUnit = isHt => U.len === 'cm' ? 'cm' : (isHt ? '' : 'in');
  /* one shoe size: EU from the card; US either as published or worked out; UK worked out */
  window.__illuShoe = (eu, us, g) => {
    const e = num(eu), u = num(us), men = g === 'M';
    if(U.shoe === 'EU'){ if(e != null) return String(e); if(u != null) return String(Math.round(u + (men ? 33 : 30.5))); return null; }
    if(e == null) return U.shoe === 'US' && u != null ? String(u) : null;
    const uk = Math.round((e - (men ? 34 : 33)) * 2) / 2;
    if(U.shoe === 'UK') return String(uk);
    return u != null ? String(u) : String(uk + (men ? 1 : 2.5));
  };
  window.__illuShoeUnit = () => U.shoe;

  function apply(){
    try{ localStorage.setItem('illu.units', JSON.stringify(U)); }catch(e){}
    /* the sidebar's own length unit follows */
    try{
      const want = U.len === 'in' ? 'in' : 'cm';
      if(typeof bwU !== 'undefined' && bwU !== want){ try{ convertLengthBounds(lenUnit, want); }catch(e){} bwU = lenUnit = want; }
      if(typeof htU !== 'undefined') htU = U.len === 'in' ? 'ft' : 'cm';
      try{ paintUnits(); paintUnitHint(); }catch(e){}
      try{ saveUnits(); }catch(e){}
      try{ refresh(); }catch(e){}
    }catch(e){}
    paint();
    try{ window.__illuVoteChanged && window.__illuVoteChanged(); }catch(e){}
    try{ window.__illuTodayRender && window.__illuTodayRender(); }catch(e){}
    try{ window.__illuFvRepaint && window.__illuFvRepaint(); }catch(e){}
    try{ document.dispatchEvent(new CustomEvent('illu:units', {detail: window.__illuU()})); }catch(e){}
  }
  /* start in step with the sidebar when nothing is saved yet */
  setTimeout(() => { try{ if(!localStorage.getItem('illu.units') && typeof bwU !== 'undefined' && bwU === 'in') U.len = 'in'; }catch(e){} apply(); }, 1500);

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'abun'; btn.id = 'abun'; btn.setAttribute('aria-haspopup', 'dialog');
  const RULER = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/></svg>';
  function paint(){
    btn.innerHTML = RULER + '<span>' + U.len + ' · ' + U.shoe + '</span>';
    btn.title = L('Units: lengths and shoe size', '단위: 길이와 신발 사이즈');
    const p = document.getElementById('abunp');
    if(p) p.querySelectorAll('[data-un]').forEach(b => { const [k, v] = b.dataset.un.split('='); const on = U[k] === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  }
  paint();
  function put(){
    const abr = document.querySelector('#appbar .abr');
    if(!abr){ setTimeout(put, 400); return; }
    if(btn.parentNode !== abr) abr.insertBefore(btn, abr.firstElementChild);   // the top bar orders it (illu-abar.js)
  }
  put();
  try{ new MutationObserver(() => { if(!btn.isConnected) put(); }).observe(document.getElementById('appbar') || document.body, {childList: true, subtree: true}); }catch(e){}
  function close(){ const p = document.getElementById('abunp'); if(p) p.remove(); btn.setAttribute('aria-expanded', 'false'); }
  function open(){
    close();
    const p = document.createElement('div'); p.id = 'abunp'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', L('Units', '단위'));
    p.innerHTML = '<div class="aburow"><span>' + L('Lengths', '길이') + '</span><div class="abuseg"><button type="button" data-un="len=cm">cm</button><button type="button" data-un="len=in">in</button></div></div>' +
      '<div class="aburow"><span>' + L('Shoe', '신발') + '</span><div class="abuseg"><button type="button" data-un="shoe=EU">EU</button><button type="button" data-un="shoe=US">US</button><button type="button" data-un="shoe=UK">UK</button></div></div>' +
      '<p>' + L('Every card, the side panel and the filters use these.', '모든 카드, 사이드 패널, 필터에 적용됩니다.') + '</p>';
    document.body.appendChild(p);
    const r = btn.getBoundingClientRect();
    p.style.top = Math.round(r.bottom + 8) + 'px';
    p.style.left = Math.round(Math.max(8, Math.min(innerWidth - p.offsetWidth - 8, r.left))) + 'px';
    btn.setAttribute('aria-expanded', 'true');
    paint();
  }
  btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if(document.getElementById('abunp')) close(); else open(); });
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#abunp [data-un]');
    if(b){ e.preventDefault(); const [k, v] = b.dataset.un.split('='); if(U[k] !== v){ U[k] = v; apply(); } return; }
    if(!(e.target.closest && e.target.closest('#abunp'))) close();
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') close(); });

  const css = document.createElement('style');
  css.textContent = `
#appbar .abr>.abun{height:34px;box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;padding:0 11px 0 9px;border-radius:999px;border:1px solid var(--line);background:var(--surf);color:var(--ink);font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap;font-variant-numeric:tabular-nums}
#appbar .abr>.abun svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round}
#appbar .abr>.abun:hover,#appbar .abr>.abun[aria-expanded="true"]{border-color:var(--acc)}
@media (max-width:700px){#appbar .abr>.abun span{display:none}#appbar .abr>.abun{width:34px;padding:0;justify-content:center}}
#abunp{position:fixed;z-index:9700;background:var(--paper,#fff);color:var(--ink);border:1px solid var(--line);border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.18);padding:10px 12px;display:flex;flex-direction:column;gap:8px;min-width:230px}
#abunp .aburow{display:flex;align-items:center;gap:10px;justify-content:space-between}
#abunp .aburow>span{font-size:12px;color:var(--mut)}
#abunp .abuseg{display:inline-flex;background:var(--surf2,#f4f1f6);border:1px solid var(--line);border-radius:9px;padding:2px}
#abunp .abuseg button{border:0;background:none;font:inherit;font-size:12.5px;font-weight:700;padding:5px 11px;border-radius:7px;color:var(--mut);cursor:pointer;min-height:30px}
#abunp .abuseg button.on{background:var(--acc);color:#fff}
#abunp p{margin:0;font-size:11.5px;color:var(--faint)}
`;
  document.head.appendChild(css);
})();
