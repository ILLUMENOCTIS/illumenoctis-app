/* 1.2.248 (user, 18 Nov 2026: "I want to send this sheet to the agency contact in order for them to fill in all the
   information ... and have them send it back to me" - "fill her card straight away"; photos and videos go to "dropbox and
   computer (for backup)"; "If the crawling already has the basic information, I want it to be filled in before sending").
   On the Comp tab: "Send to agency" makes a private link for this card (table comp_req, open 14 days). The agency opens it
   in any browser (web copy /comp/?t=...), fills in her profile, measurements, photos and video; the comp-form function puts
   it straight onto her card, and the files go from their browser straight into her Dropbox folder. A computer with the
   program then copies those files into Desktop/ILLUMENOCTIS/BOOKING/<her folder> as a backup, and the bell says it came. */
(function(){
  'use strict';
  if(window.__illuCompReq) return; window.__illuCompReq = true;
  if(typeof bvDrawSide !== 'function' || typeof bvSide === 'undefined') return;
  const H = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
  const SB = () => window.__sb;
  const CFG = window.ILLU_CONFIG || {};
  const FN = (CFG.url || '') + '/functions/v1/comp-form';
  const PAGE = 'https://illumenoctis.github.io/illumenoctis-app/comp/?t=';
  const DAYS = 14;
  const WEB = !!(window.illu && window.illu.web);
  const REQ = new Map();          // card id -> newest request row
  let ALL = [];                   // recent rows (for the bell and the backup)
  let DBX = null;                 // {ok, base} | {ok:false, why}
  const fmt = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'}) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const live = q => q && !q.closed && new Date(q.expires_at).getTime() > Date.now();
  const tok = () => { const a = new Uint8Array(24); crypto.getRandomValues(a); return Array.from(a, x => 'abcdefghijklmnopqrstuvwxyz0123456789'[x % 36]).join(''); };

  async function load(){
    const sb = SB(); if(!sb) return;
    try{
      const since = new Date(Date.now() - 45 * 864e5).toISOString();
      const {data} = await sb.from('comp_req').select('id,bid,nm,ag,dbx_folder,created_at,expires_at,closed,opened_at,submitted_at,sub_count,files,backup').gte('created_at', since).order('created_at', {ascending: false}).limit(500);
      if(!Array.isArray(data)) return;
      ALL = data; REQ.clear();
      for(const q of data) if(!REQ.has(q.bid)) REQ.set(q.bid, q);
    }catch(e){}
  }
  async function jwt(){ try{ const s = await SB().auth.getSession(); return s && s.data && s.data.session ? s.data.session.access_token : ''; }catch(e){ return ''; } }
  async function fnCall(body){
    const r = await fetch(FN, {method: 'POST', headers: {apikey: CFG.key || '', authorization: 'Bearer ' + await jwt(), 'content-type': 'application/json'}, body: JSON.stringify(body)});
    let j = null; try{ j = await r.json(); }catch(e){}
    return j || {ok: false, why: 'no answer (' + r.status + ')'};
  }
  async function dbxStatus(force){ if(DBX && !force) return DBX; try{ DBX = await fnCall({action: 'status'}); }catch(e){ DBX = {ok: false, why: String(e && e.message || e)}; } return DBX; }

  /* what the program already knows about her (the crawler's figures) - shown in the form where her card is empty */
  function prefillOf(c){
    const o = {};
    try{ const k = c.k || ''; if(k && typeof litFacts === 'function'){ const f = litFacts({key: k}) || {}; for(const x of ['ht', 'bu', 'wa', 'hp', 'eu', 'us']) if(f[x] != null && f[x] !== '' && !isNaN(parseFloat(f[x]))) o[x] = parseFloat(f[x]); } }catch(e){}
    try{ if(!c.ag && c.k && typeof keyInfo === 'function'){ const i = keyInfo(c.k) || {}; if(i.ag) o.ag = i.ag; } }catch(e){}
    return o;
  }
  async function make(c){
    const sb = SB(); if(!sb) throw new Error('sign in first');
    const row = {id: tok(), bid: c.id, nm: String(c.nm || '').trim(), ag: String(c.ag || '').trim(), dbx_folder: typeof bvFolderName === 'function' ? bvFolderName(c) : String(c.nm || ''),
      prefill: prefillOf(c), expires_at: new Date(Date.now() + DAYS * 864e5).toISOString()};
    const old = REQ.get(c.id);
    if(old && live(old)) await sb.from('comp_req').update({closed: true}).eq('id', old.id);
    const {error} = await sb.from('comp_req').insert(row);
    if(error) throw new Error(error.message);
    await load();
    return REQ.get(c.id);
  }

  /* ---------- the box on the Comp tab ---------- */
  function box(c){
    const q = REQ.get(c.id), url = q ? PAGE + q.id : '';
    let st = '';
    if(q && live(q)) st = q.submitted_at ? '✓ Received ' + H(fmt(q.submitted_at)) + (q.sub_count > 1 ? ' (' + q.sub_count + ' times)' : '') + ' — it is on her card'
      : q.opened_at ? 'Opened by the agency ' + H(fmt(q.opened_at)) + ' · not sent yet' : 'Not opened yet';
    const dbx = DBX && !DBX.ok ? '<p class="crqwarn">Photos and videos can\'t be uploaded yet: Dropbox is not connected for the form. ' +
      (window.illu && window.illu.dbxFormKey ? '<button type="button" class="cmplk" data-crqdbx>Connect Dropbox for agency uploads</button>' : 'Connect it from the program on the office computer.') + '</p>' : '';
    return '<div class="crq" data-crq="' + H(c.id) + '"><div class="cmplab">Agency form</div>' +
      (q && live(q)
        ? '<p class="cmphint">Send this private link to the agency contact. They fill in her profile, measurements, photos and video, and it goes straight onto this card. Open until ' + H(new Date(q.expires_at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})) + '.</p>' +
          '<div class="crqlink"><input readonly value="' + H(url) + '" aria-label="Link for the agency"><button type="button" class="cmpbtn" data-crqcopy>Copy link</button></div>' +
          '<p class="crqst' + (q.submitted_at ? ' ok' : '') + '">' + st + '</p>' +
          '<p class="crqact"><button type="button" class="cmplk" data-crqopen>Open the form</button> · <button type="button" class="cmplk" data-crqnew>New link</button> · <button type="button" class="cmplk" data-crqclose>Close the link</button></p>'
        : '<p class="cmphint">A private link the agency contact fills in from any browser — her profile, measurements, photos and video. What she already has on this card (and what the crawler found) is filled in for them.' +
          (q ? ' The last link ' + (q.closed ? 'was closed' : 'ran out') + (q.submitted_at ? ' (received ' + H(fmt(q.submitted_at)) + ')' : '') + '.' : '') + '</p>' +
          '<div class="cmpbtns"><button type="button" class="cmpbtn" data-crqmake>Send to agency…</button></div>') +
      dbx + '<p class="crqmsg" aria-live="polite"></p></div>';
  }
  const draw0 = bvDrawSide;
  bvDrawSide = function(c){
    draw0.apply(this, arguments);
    try{
      if(!bv || bv.view !== 'c' || !c) return;
      const p = bvSide.querySelector('.cmpp'); if(!p || p.querySelector('.crq')) return;
      const note = p.querySelector('.cmpnote');
      (note || p.lastChild).insertAdjacentHTML('beforebegin', box(c));
      if(!DBX) dbxStatus().then(() => { if(bv && bv.view === 'c' && bv.id === c.id) repaint(c); });
    }catch(e){}
  };
  function repaint(c){ const el = bvSide.querySelector('.crq'); if(!el) return; const t = document.createElement('div'); t.innerHTML = box(c); el.replaceWith(t.firstChild); }
  const say = (t, bad) => { const m = bvSide.querySelector('.crqmsg'); if(m){ m.textContent = t || ''; m.classList.toggle('bad', !!bad); } };

  document.addEventListener('click', async e => {
    const t = e.target && e.target.closest ? e.target.closest('[data-crqmake],[data-crqcopy],[data-crqopen],[data-crqnew],[data-crqclose],[data-crqdbx]') : null;
    if(!t || !bvSide.contains(t)) return;
    e.preventDefault(); e.stopPropagation();
    const c = bv && BOOK.get(bv.id); if(!c) return;
    try{ if(typeof SIGNED === 'function' && !SIGNED()){ say('Sign in first.', true); return; } }catch(er){}
    if(t.hasAttribute('data-crqmake') || t.hasAttribute('data-crqnew')){
      t.disabled = true; say('Making the link…');
      try{ await make(c); repaint(c); say('Link ready — copy it into your email to the agency.'); }catch(er){ say('Not made: ' + er.message, true); t.disabled = false; }
      return;
    }
    const q = REQ.get(c.id); if(!q && !t.hasAttribute('data-crqdbx')) return;
    if(t.hasAttribute('data-crqcopy')){
      const url = PAGE + q.id;
      try{ await navigator.clipboard.writeText(url); say('Copied.'); }catch(er){ const i = bvSide.querySelector('.crqlink input'); if(i){ i.focus(); i.select(); } say('Press Ctrl+C to copy.'); }
      return;
    }
    if(t.hasAttribute('data-crqopen')){ try{ if(window.illu && window.illu.openExternal) window.illu.openExternal(PAGE + q.id); else window.open(PAGE + q.id, '_blank', 'noopener'); }catch(er){} return; }
    if(t.hasAttribute('data-crqclose')){
      try{ await SB().from('comp_req').update({closed: true}).eq('id', q.id); await load(); repaint(c); say('Closed — the agency can no longer open it.'); }catch(er){ say('Not closed: ' + er.message, true); }
      return;
    }
    if(t.hasAttribute('data-crqdbx')){
      t.disabled = true; say('Connecting Dropbox… (sign in on dropbox.com if a page opens)');
      try{
        const k = await window.illu.dbxFormKey(true);
        if(!k || !k.ok) throw new Error((k && k.why) || 'Dropbox not connected');
        const r = await fnCall({action: 'connect', refresh: k.key});
        if(!r.ok) throw new Error(r.why || 'not saved');
        DBX = {ok: true, base: r.base}; repaint(c); say('Dropbox connected — uploads go to ' + r.base + '.');
      }catch(er){ say('Not connected: ' + er.message, true); t.disabled = false; }
    }
  }, true);

  /* ---------- backup: the files the agency sent, copied into this computer's BOOKING folder ---------- */
  let me = ''; try{ me = localStorage.getItem('illu.crawl.me') || ''; if(!me){ me = 'c' + Math.random().toString(36).slice(2, 10); localStorage.setItem('illu.crawl.me', me); } }catch(e){ me = 'c-anon'; }
  const NAME = {m: 'profile', f: 'front', l4: '45-left', l: 'left-side', r4: '45-right', r: 'right-side', b: 'back', v: 'video', hl: 'hand-front-left', hr: 'hand-front-right', hlb: 'hand-back-left', hrb: 'hand-back-right', fl: 'foot-left', fr: 'foot-right'};
  async function backup(){
    if(WEB || !(window.illu && window.illu.compBackup)) return;
    for(const q of ALL){
      if(!q.submitted_at || !q.files || (q.backup && q.backup[me] && q.backup[me] >= q.submitted_at)) continue;
      const items = Object.entries(q.files).map(([slot, x]) => x && x.path ? {path: x.path, sub: slot === 'v' ? '3. VIDEOS' : '1. BOOK',
        name: /^(m|f|l4|l|r4|r|b|v)$/.test(slot) ? x.path.split('/').pop() : 'comp-' + (NAME[slot] || slot) + '.' + String(x.path).split('.').pop()} : null).filter(Boolean);
      if(!items.length) continue;
      let r = null; try{ r = await window.illu.compBackup(q.dbx_folder || q.nm, items); }catch(e){}
      if(r && r.ok){ try{ await SB().from('comp_req').update({backup: Object.assign({}, q.backup || {}, {[me]: new Date().toISOString()})}).eq('id', q.id); }catch(e){} }
    }
  }

  /* ---------- the bell: an agency sent her details ---------- */
  const seenKey = 'illu.crq.seen';
  const prevExtra = window.__illuNotifExtra;
  window.__illuNotifExtra = () => {
    let base = []; try{ base = prevExtra ? prevExtra() || [] : []; }catch(e){}
    const pad = n => String(n).padStart(2, '0');
    return base.concat(ALL.filter(q => q.submitted_at && Date.now() - new Date(q.submitted_at).getTime() < 7 * 864e5).map(q => { const d = new Date(q.submitted_at);
      return {ts: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()), who: '',
        html: '📋 <b>' + H(q.ag || 'The agency') + '</b> sent <b>' + H(q.nm || 'her') + '</b>\'s details through the form <button type="button" class="alnb" data-crqcard="' + H(q.bid) + '">Open her card</button>'}; }));
  };
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-crqcard]'); if(!b) return; e.preventDefault(); e.stopPropagation(); try{ bvOpenFor(b.dataset.crqcard); }catch(er){} }, true);
  function note(text, bid){
    const el = document.createElement('div'); el.className = 'crqtoast'; el.setAttribute('role', 'status');
    el.innerHTML = '📋 ' + H(text) + ' <button type="button" data-crqcard="' + H(bid) + '">Open her card</button><button type="button" class="x" aria-label="Close">✕</button>';
    el.addEventListener('click', e => { if(e.target.closest('button')) setTimeout(() => el.remove(), 0); });
    document.body.appendChild(el); setTimeout(() => el.remove(), 20000);
  }
  function pop(){
    let seen = {}; try{ seen = JSON.parse(localStorage.getItem(seenKey) || '{}'); }catch(e){}
    let ch = false;
    for(const q of ALL) if(q.submitted_at && seen[q.id] !== q.submitted_at){
      if(seen.__init) note((q.ag || 'The agency') + ' sent ' + (q.nm || 'her') + '\'s details — they are on her card.', q.bid);
      seen[q.id] = q.submitted_at; ch = true;
    }
    if(!seen.__init){ seen.__init = 1; ch = true; }
    if(ch){ try{ localStorage.setItem(seenKey, JSON.stringify(seen)); }catch(e){} try{ window.__illuNotifRepaint && window.__illuNotifRepaint(); }catch(e){} }
  }

  async function tick(){
    await load(); pop(); backup();
    try{ if(bv && bv.view === 'c'){ const c = BOOK.get(bv.id); if(c) repaint(c); } }catch(e){}
  }
  setTimeout(tick, 8000); setInterval(tick, 120000);
  window.__illuCompReq = {load, make, box, backup, state: () => ({ALL, DBX, me})};

  const css = document.createElement('style');
  css.textContent = [
    '.crq{margin-top:14px;padding-top:12px;border-top:1px solid var(--line,#e6e0ea)}',
    '.crqlink{display:flex;gap:8px;align-items:center;margin:8px 0 4px}.crqlink input{flex:1;min-width:0;border:1px solid var(--line,#e6e0ea);border-radius:8px;padding:7px 9px;font:12px var(--mono,ui-monospace,monospace);background:var(--surf2,#f7f5f8);color:inherit}',
    '.crqst{margin:4px 0;font-size:12.5px;color:var(--mut,#6d6577)}.crqst.ok{color:#2E7D5B;font-weight:600}',
    '.crqact{margin:2px 0 0;font-size:12.5px;color:var(--mut,#6d6577)}',
    '.crqwarn{margin:8px 0 0;font-size:12.5px;color:#9A6A12}',
    '.crqtoast{position:fixed;right:18px;bottom:18px;z-index:9999;max-width:420px;background:#1F1A24;color:#fff;border-radius:12px;padding:12px 14px;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.3)}.crqtoast button{margin-left:8px;border:0;border-radius:999px;background:#fff;color:#1F1A24;font:600 12px inherit;padding:4px 10px;cursor:pointer}.crqtoast button.x{background:none;color:#fff;padding:2px 4px}',
    '.crqmsg{margin:6px 0 0;font-size:12.5px;color:var(--mut,#6d6577);min-height:1em}.crqmsg.bad{color:#B3261E}'
  ].join('\n');
  document.head.appendChild(css);
})();
