/* 1.2.180 (user, 13 Nov 2026: "Notes should be able to be translated into Korean"): every note written on a model (side
   panel / Team Vote notes) and on a booking card (NOTES) gets its Korean. Claude translates new and edited notes every
   hour (a scheduled task) into docs notetr/<v + model hash | b + card id> {e: {note id: {s: text it translated, ko, at}}}.
   Under each note: "한국어" opens the Korean (open by itself when the program is in Korean). A note already in Korean
   needs nothing; a note not translated yet says so. When a note is edited, its old Korean is not shown (s must match). */
(function(){
  'use strict';
  if(window.__illuNoteTr) return; window.__illuNoteTr = true;
  const TR = new Map();                 // doc id -> {note id: {s, ko, at}}
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
  const isKo = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const hangul = t => { const s = String(t || '').replace(/\s+/g, ''); if(!s) return true; const k = (s.match(/[가-힣ㄱ-ㆎ]/g) || []).length; return k / s.length > 0.3; };
  const plain = t => !/[A-Za-zÀ-ɏЀ-ӿ]/.test(String(t || ''));     // only numbers, signs or emoji
  /* 1.2.193 (user, 14 Nov 2026: "Let's go with the Google translate inside the program"): "한국어" asks Google Translate
     (through the program) the moment it is opened, shows the Korean, and keeps it in notetr so the team's other computers
     and phones show it without asking again. A Korean already kept for this exact text is shown at once. */
  const PEND = new Map();               // "doc|id" -> {doc, id, text}
  window.__illuTr = function(doc, id, text){
    const t = String(text || '').trim();
    if(!t || hangul(t) || plain(t)) return '';
    const r = (TR.get(doc) || {})[id];
    const key = doc + '|' + id;
    if(r && r.ko && String(r.s || '').trim() === t)
      return '<details class="ntr"' + (isKo() ? ' open' : '') + '><summary>한국어</summary><p>' + E(r.ko) + '</p></details>';
    if(!(window.illu && window.illu.translate))                              // web / phone: no Google here - the old line stays
      return '<span class="ntrw">' + (isKo() ? '한국어 번역 준비 중 (매시간 번역)' : 'Korean coming — notes are translated every hour') + '</span>';
    PEND.set(key, {doc, id, text: t});
    return '<details class="ntr" data-ntrk="' + E(key) + '"' + (isKo() ? ' open' : '') + '><summary>한국어</summary><p class="ntrl">' + (isKo() ? '번역 중…' : 'Translating…') + '</p></details>';
  };
  async function fill(el){
    if(!el || el.dataset.ntrbusy) return;
    const job = PEND.get(el.dataset.ntrk); if(!job) return;
    el.dataset.ntrbusy = '1';
    const p = el.querySelector('p');
    let r = null; try{ r = await window.illu.translate(job.text, 'ko'); }catch(e){ r = {ok: false, why: String(e && e.message || e)}; }
    if(!r || !r.ok){ if(p) p.textContent = (isKo() ? '번역하지 못했습니다: ' : 'Could not translate: ') + ((r && r.why) || ''); delete el.dataset.ntrbusy; return; }
    if(p){ p.textContent = r.text; p.classList.remove('ntrl'); }
    const cur = Object.assign({}, TR.get(job.doc) || {}); cur[job.id] = {s: job.text, ko: r.text, at: new Date().toISOString(), by: 'google'}; TR.set(job.doc, cur);
    try{ await DB.doc('notetr/' + job.doc).set({e: cur}); }catch(e){}
  }
  document.addEventListener('toggle', e => { const d = e.target; if(d && d.matches && d.matches('details.ntr[data-ntrk]') && d.open) fill(d); }, true);
  /* in Korean the Korean is open from the start: ask for the ones on screen */
  setInterval(() => { if(!isKo()) return; document.querySelectorAll('details.ntr[data-ntrk][open]:not([data-ntrbusy])').forEach(d => { if(d.querySelector('.ntrl')) fill(d); }); }, 1500);
  let painted = 0;
  function repaint(){
    clearTimeout(painted); painted = setTimeout(() => {
      try{ window.__illuVoteRerender && window.__illuVoteRerender(); }catch(e){}
      try{ typeof bvSideRefresh === 'function' && bvSideRefresh(); }catch(e){}
      try{ window.__illuArrRender && window.__illuArrRender(); }catch(e){}
    }, 300);
  }
  (function listen(){
    if(typeof DB === 'undefined' || !DB){ setTimeout(listen, 800); return; }
    try{
      DB.collection('notetr').onSnapshot(sn => {
        for(const d of (sn.docs || [])){ let v = null; try{ v = typeof docOf === 'function' ? docOf(d) : d.data(); }catch(e){} TR.set(d.id, (v && v.e) || {}); }
        repaint();
      }, () => {});
    }catch(e){}
  })();
  const css = document.createElement('style');
  css.textContent = '.ntr{margin:3px 0 0;font-size:12px}.ntr summary{display:inline-block;cursor:pointer;color:var(--acc,#6b2a5e);font-weight:600;font-size:11px;list-style:none;border:1px solid currentColor;border-radius:99px;padding:0 7px;line-height:17px}.ntr summary::-webkit-details-marker{display:none}' +
    '.ntr[open] summary{background:var(--acc,#6b2a5e);color:#fff;border-color:var(--acc,#6b2a5e)}.ntr p{margin:4px 0 0;padding:6px 9px;border-radius:8px;background:rgba(107,42,94,.07);white-space:pre-wrap;line-height:1.5}.ntr p.ntrl{color:var(--mut,#8a8291);background:none}.ntrw{display:block;margin-top:3px;font-size:10.5px;color:var(--mut,#8a8291)}';
  document.head.appendChild(css);
})();
