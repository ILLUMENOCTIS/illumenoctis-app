/* 1.2.247 (user, 18 Nov 2026 - MC2 card named "Dark blond": "the name on the card is incorrect ... I also want to be able to
   edit the name of the model on the card"):
   - a ✎ beside the model's name on her opened card: type the right name, Save (Enter) - or Cancel (Esc).
   - the name is shared with everyone (docs mname/<model hash> {k, n, by, at}) and wins over the name read from the board,
     everywhere the program shows her (cards, lists, the opened card, searches). Saving it empty puts the board's name back.
   - a later read of the agency's board does not undo it: the chosen name is put back on top after every board change. */
(function(){
  'use strict';
  if(window.__illuNameEdit) return; window.__illuNameEdit = true;
  const NM = new Map();                         // model key -> chosen name
  const ORIG = new Map();                       // model key -> the board's own name (to put back)
  const nk = k => { try{ return normKey(k); }catch(e){ return k; } };
  const hsh = s => { let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const ko = () => { try{ return LANG === 'ko'; }catch(e){ return false; } };      // 1.2.248: isKo is not global - LANG is
  const L = (en, k) => ko() ? k : en;
  let lastV = -1;
  /* ".../model/julia-svensson/" -> "Julia Svensson"; ".../646-katya-k" -> "Katya K" */
  function slugName(href){
    let seg = ''; try{ seg = decodeURIComponent(new URL(href).pathname.split('/').filter(Boolean).pop() || ''); }catch(e){ return ''; }
    seg = seg.replace(/\.[a-z]{2,5}$/i, '').replace(/^\d+[-_]/, '').replace(/[-_]+\d*$/, m => /\d/.test(m) ? '' : m);
    const w = seg.split(/[-_+\s]+/).filter(x => x && !/^\d+$/.test(x));
    if(!w.length || w.join('').length < 2) return '';
    return w.map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join(' ').slice(0, 80);
  }
  window.__illuSlugName = slugName;
  const LEAD = /^\s*(?:more\s+(?:info(?:rmation)?|details)\s+(?:about|on|for)|(?:view|see|open)\s+(?:the\s+)?(?:full\s+)?(?:profile|portfolio|book|model|details)(?:\s+(?:of|for))?|read\s+more\s+(?:about)?|discover|meet)\s*[:\-–—]?\s+/i;
  function cleanName(n){ const s = String(n || ''); const c = s.replace(LEAD, '').trim(); return c.length >= 2 ? c : s; }
  window.__illuCleanName = cleanName;
  /* the chosen names onto the Directory's own lists (AG boards), and the board's name back where a choice was cleared */
  function apply(){
    if(typeof AG === 'undefined' || !Array.isArray(AG)) return 0;
    let n = 0;
    for(const a of AG) for(const b of (a.boards || [])) for(const m of (b.m || [])){
      if(!Array.isArray(m) || !m[1]) continue;
      const href = m[1].charAt(0) === '|' ? m[1].slice(1) : (b.p || '') + m[1];
      let k = ''; try{ k = normKey(href); }catch(e){ continue; }
      const want = NM.get(k);
      if(want){ if(!ORIG.has(k)) ORIG.set(k, m[0] || ''); if(m[0] !== want){ m[0] = want; n++; } }
      else if(ORIG.has(k) && m[0] !== ORIG.get(k)){ m[0] = ORIG.get(k); n++; }
      /* 1.2.267 (user, 20 Nov 2026 - Yuli Group cards named "MORE INFORMATION ABOUT NIVA ISAY"): the words of the
         agency's link ("More information about", "View profile", …) are not part of her name */
      { const cn = cleanName(m[0]); if(cn !== m[0] && cn){ m[0] = cn; n++; } }
      /* 1.2.264 (user: "name not showing up" - Julia Svensson, Le troch): a board row read with no name gets one from her page address */
      if(!String(m[0] || '').trim()){ const sn = slugName(href); if(sn){ m[0] = sn; n++; } }
    }
    for(const k of [...ORIG.keys()]) if(!NM.has(k)) ORIG.delete(k);
    return n;
  }
  let rd = 0;
  function redraw(force){ clearTimeout(rd); rd = setTimeout(() => {
    const n = apply();
    if(!n && !force) { lastV = window.__illuAGv || 0; return; }
    try{ KEYINFO = null; }catch(e){} try{ AGOF = null; }catch(e){} try{ DIRSUB = ''; }catch(e){}
    try{ window.__illuAGv = (window.__illuAGv || 0) + 1; }catch(e){}
    lastV = window.__illuAGv || 0;
    try{ typeof refresh === 'function' && refresh(); }catch(e){}
    try{ window.__illuVoteRerender && window.__illuVoteRerender(); }catch(e){}
  }, 200); }
  /* 1.2.267: booking cards made from such a row show her name without the link words (on screen; the card keeps what
     was saved until someone saves it again) */
  setInterval(() => {
    try{
      if(typeof BOOK === 'undefined') return;
      let n = 0; for(const c of BOOK.values()) if(c && c.nm){ const cn = cleanName(c.nm); if(cn !== c.nm){ c.nm = cn; n++; } }
      if(n){ try{ typeof renderBook === 'function' && renderBook(); }catch(e){} try{ window.__illuVoteRerender && window.__illuVoteRerender(); }catch(e){} }
    }catch(e){}
  }, 4000);
  /* boards read again (the crawler, the sign-in list) come with the board's names: put the chosen ones back */
  setInterval(() => { if((window.__illuAGv || 0) !== lastV) redraw(false); }, 3000);   /* 1.2.264: also for rows with no name */
  (function listen(){
    if(typeof DB === 'undefined' || !DB){ setTimeout(listen, 800); return; }
    try{
      DB.collection('mname').onSnapshot(sn => {
        const seen = new Map();
        for(const d of (sn.docs || [])){ let v = null; try{ v = typeof docOf === 'function' ? docOf(d) : d.data(); }catch(e){} if(v && v.k && v.n) seen.set(v.k, String(v.n).slice(0, 80)); }
        NM.clear(); for(const [k, v] of seen) NM.set(k, v);
        redraw(true);
      }, () => {});
    }catch(e){}
  })();
  async function setName(k, name){
    const key = nk(k); if(!key) return false;
    try{ if(typeof SIGNED === 'function' && !SIGNED()){ typeof nudgeSignIn === 'function' && nudgeSignIn(); return false; } }catch(e){}
    const n = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const orig = ORIG.has(key) ? ORIG.get(key) : null;
    const clear = !n || (orig != null && n === orig);
    if(clear) NM.delete(key); else NM.set(key, n);
    try{
      if(clear) await DB.doc('mname/' + hsh(key)).delete();
      else await DB.doc('mname/' + hsh(key)).set({k: key, n, by: (typeof ME !== 'undefined' && ME) || '', at: new Date().toISOString()});
    }catch(e){ console.error('mname', e); return false; }
    redraw(true); return true;
  }
  window.__illuSetName = setName;
  window.__illuNameOrig = k => { const key = nk(k); return ORIG.has(key) ? ORIG.get(key) : null; };
  /* the ✎ beside her name on the opened card (illu-vote.js pnHead) */
  window.__illuNameEditHtml = (k, nm) => '<button type="button" class="pnnmed" data-pnnmed="' + esc(k) + '" data-pnnmv="' + esc(nm) + '" title="' + esc(L('Edit her name', '이름 수정')) + '" aria-label="' + esc(L('Edit her name', '이름 수정')) + '"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5l3 3L5 14H2v-3z"/></svg></button>';
  function openEditor(btn){
    const h2 = btn.closest('h2'); if(!h2 || h2.querySelector('.pnnmf')) return;
    const k = btn.dataset.pnnmed, cur = btn.dataset.pnnmv || '';
    const orig = window.__illuNameOrig(k);
    const f = document.createElement('form'); f.className = 'pnnmf';
    f.innerHTML = '<input type="text" maxlength="80" autocomplete="off" spellcheck="false" aria-label="' + esc(L('Her name', '모델 이름')) + '" value="' + esc(cur) + '">' +
      '<span class="pnnmb"><button type="submit" class="pri">' + esc(L('Save', '저장')) + '</button><button type="button" data-pnnmx>' + esc(L('Cancel', '취소')) + '</button></span>' +
      (orig != null && orig !== cur ? '<small>' + esc(L('On the agency’s board: ', '보드 이름: ')) + esc(orig || '—') + ' · ' + esc(L('save it empty to use that name', '비워서 저장하면 보드 이름으로 돌아갑니다')) + '</small>' : '');
    h2.hidden = true; h2.after(f);
    const inp = f.querySelector('input'); inp.focus(); inp.select();
    const close = () => { f.remove(); h2.hidden = false; };
    f.addEventListener('submit', async e => { e.preventDefault(); const v = inp.value; f.querySelectorAll('button,input').forEach(x => x.disabled = true);
      const ok = await setName(k, v); if(!ok){ f.querySelectorAll('button,input').forEach(x => x.disabled = false); inp.focus(); return; } close(); });
    f.querySelector('[data-pnnmx]').addEventListener('click', close);
    inp.addEventListener('keydown', e => { if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); } });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-pnnmed]'); if(!b) return;
    e.preventDefault(); e.stopPropagation(); openEditor(b);
  }, true);
  const st = document.createElement('style');
  st.textContent = '.pn2 .pnhm h2 .pnnmed{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;margin-left:4px;vertical-align:-3px;border:0;border-radius:6px;background:transparent;color:inherit;opacity:.4;cursor:pointer;padding:0}' +
    '.pn2 .pnhm h2 .pnnmed:hover,.pn2 .pnhm h2 .pnnmed:focus-visible{opacity:1;background:var(--chip,rgba(0,0,0,.06))}.pn2 .pnnmed svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linejoin:round}' +
    '.pn2 .pnnmf{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 4px}.pn2 .pnnmf input{flex:1 1 180px;min-width:0;font:inherit;font-size:16px;font-weight:600;padding:6px 9px;border:1px solid var(--line,#ccc);border-radius:8px;background:var(--surf,#fff);color:inherit}' +
    '.pn2 .pnnmb{display:flex;gap:6px}.pn2 .pnnmf button{font:inherit;font-size:13px;padding:6px 12px;border-radius:8px;border:1px solid var(--line,#ccc);background:var(--surf,#fff);color:inherit;cursor:pointer}' +
    '.pn2 .pnnmf button.pri{background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57);color:#fff}.pn2 .pnnmf small{flex-basis:100%;opacity:.65;font-size:12px}';
  document.head.appendChild(st);
})();
