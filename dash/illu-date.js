/* Dates everywhere (user, 2026-11-05): "when the numbers are inputted, the slash appears".
   Any box that asks for DD/MM/YYYY (by its placeholder, or a known date field) puts the slashes in
   as the digits are typed: 1 7 0 5 2 0 0 4 -> 17/05/2004. Deleting works as usual (a deleted slash
   is not put straight back), pasting "17.05.2004" or "17052004" comes out the same, and a box that
   already holds words ("17 May 2004") is left alone. Runs before the boxes' own save, so what is
   saved is the slashed date. */
(function(){
  'use strict';
  const FIELDS = new Set(['dob', 'ind', 'outd', 'avf', 'ppi', 'ppe']);
  const isDateBox = el => el && el.tagName === 'INPUT' && (!el.type || el.type === 'text' || el.type === 'search') && !el.readOnly &&
    (/\bDD\s*\/\s*MM\s*\/\s*YYYY\b/i.test(el.placeholder || '') || (el.dataset && FIELDS.has(el.dataset.bf)) || el.dataset.date === '1');
  function fmt(v){
    const d = String(v).replace(/\D/g, '').slice(0, 8);
    if(d.length <= 2) return d;
    if(d.length <= 4) return d.slice(0, 2) + '/' + d.slice(2);
    return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
  }
  document.addEventListener('input', e => {
    const el = e.target;
    if(!isDateBox(el)) return;
    const v = el.value;
    if(!/^[\d\/.\-]*$/.test(v)) return;                     // words or spaces ("3 May 2026"): leave as typed
    if(e.inputType && /^delete/.test(e.inputType)) return;         // backspace / delete: as typed
    const f = fmt(v);
    if(f === v) return;
    /* keep the caret after the same number of digits */
    const pos = el.selectionStart == null ? v.length : el.selectionStart;
    const digitsBefore = v.slice(0, pos).replace(/\D/g, '').length;
    el.value = f;
    let p = 0, n = 0; while(p < f.length && n < digitsBefore){ if(/\d/.test(f[p])) n++; p++; }
    if(f[p] === '/' && n === digitsBefore && digitsBefore < 8) p++;
    try{ el.setSelectionRange(p, p); }catch(err){}
  }, true);
  /* and the keyboard shows numbers on touch screens */
  const mark = root => { try{ root.querySelectorAll('input').forEach(el => { if(isDateBox(el) && !el.getAttribute('inputmode')){ el.setAttribute('inputmode', 'numeric'); el.setAttribute('maxlength', '10'); } }); }catch(e){} };
  new MutationObserver(ms => { for(const m of ms) for(const n of m.addedNodes) if(n.nodeType === 1) mark(n); }).observe(document.documentElement, {childList: true, subtree: true});
  mark(document);
  window.__illuDateFmt = fmt;
})();
