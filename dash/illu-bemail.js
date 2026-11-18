/* 1.2.248 (user, 18 Nov 2026 - approved demo v6 "Booking Emails board", claude/booking-emails-board-demo-2026-11-18.md):
   Today's Board gets two sub-boards as tabs: Team Vote (unchanged) | Booking Emails.
   Booking Emails = one row per agency we emailed about models (2026 only), newest activity on top, no date sections:
     - the emails come from the booking cards' Email tabs (book.em.list - every inquiry sent through Hiworks lands there
       since 1.2.197); one email about several models is counted once;
     - inquiries only opened in Hiworks from the program (docs hwlog/<person>-<YYYY-MM>) with no sent email on record are
       listed too, as "opened, not confirmed sent" (dashed chip) - they are not counted as sent;
     - a row opens its conversation (All / Received / Sent, newest first, the one-line summary of each email);
     - a model chip opens her card: no booking card -> her model card; a booking card -> "Which card do you want to open?"
       (Booking card / Model card). Phone: the question is a bottom sheet.
   Read only: nothing here sends, opens or marks an email.
   1.2.251 (user, 18 Nov 2026 - approved demo v9, claude/booking-emails-board-demo-2026-11-18.md):
     - the models show as mini cards (photo, name, height; booking-card icon; dashed = not confirmed sent); on a phone one
       row per agency that scrolls sideways;
     - one shared email record (window.__illuEmRec): the booking cards' emails + the agency's Hiworks history kept by the
       "Emailed before" window (docs aghist/<domain>: sent mails with their models, and received mails of the same
       conversation) + the ✉ windows opened (hwlog). The ✉ marker on every model card (illu-emk.js) reads the same record;
     - hidden models (Admin Hide) leave the board;
     - "Update from Hiworks" (user: "an update Hiworks email that applies for all emails on the list"; PC program only):
       one press reads Hiworks for every booking card on the list and every Processing booking card (the card's own
       "Collect from Hiworks") and for every agency on the list (the "Emailed before" history), then redraws. Same rules
       as those buttons: unread mail is only listed, never opened; nothing is sent.
   1.2.252 (user, 18 Nov 2026: "allow me to delete the email selection from the list"):
     - a model's mini card has a small × (always shown on a phone): she leaves that agency's row, with the emails that
       were only about her; the agency row itself has "Remove from list" in its opened view;
     - the removal is for everyone (docs bemhide/<id>), with Undo for a few seconds and "Removed from the list (n)" under
       the list to put any of them back. Nothing in Hiworks or on her booking card is deleted - only this list;
     - a new email about her (or to that agency) after the removal brings her (the row) back on its own. */
(function(){
  'use strict';
  if(window.__illuBEmail) return; window.__illuBEmail = true;
  const ko = () => { try{ return LANG === 'ko'; }catch(e){ return false; } };
  const L = (en, k) => ko() ? k : en;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const nk = u => { try{ return normKey(u); }catch(e){ return String(u || ''); } };
  const FREE = /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|aol|proton|protonmail|naver|daum|hanmail|kakao|mail|yandex|qq|163|126|gmx|web)\.[a-z.]+$/i;
  const OWN = /(^|\.)mdient\.com$/i;
  const domOf = s => { s = String(s || '').trim().toLowerCase(); const at = s.lastIndexOf('@'); if(at >= 0) return s.slice(at + 1); try{ return new URL(/^https?:/.test(s) ? s : 'https://' + s).hostname.replace(/^www\./, ''); }catch(e){ return ''; } };
  const ST = {v: 'vote', who: 'me', f: 'any', q: '', open: new Set(), tv: {}};
  try{ const s = JSON.parse(localStorage.getItem('illu.bemail') || '{}') || {}; if(s.v === 'mail') ST.v = 'mail'; if(s.who === 'all') ST.who = 'all'; }catch(e){}
  const keep = () => { try{ localStorage.setItem('illu.bemail', JSON.stringify({v: ST.v, who: ST.who})); }catch(e){} };
  const me = () => { try{ return ME || ''; }catch(e){ return ''; } };
  const isGetU = u => { try{ return !!(window.__illuIsGet && window.__illuIsGet(u)); }catch(e){ return false; } };
  /* 1.2.260 (user: "a clear indication/notification somewhere to show that a new email has arrived"): a row whose newest
     received email came after this person last opened the row shows "New email"; opening the row clears it */
  const SEENK = 'illu.bemail.seen';
  let SEEN = null;
  try{ SEEN = JSON.parse(localStorage.getItem(SEENK) || 'null'); }catch(e){}
  if(!SEEN || typeof SEEN !== 'object' || !SEEN.base){ SEEN = {base: Date.now() - 864e5, r: {}}; try{ localStorage.setItem(SEENK, JSON.stringify(SEEN)); }catch(e){} }
  const newMail = r => !!(r.lastIn && r.lastIn > Math.max(SEEN.base, SEEN.r[r.key] || 0));
  function seenRow(r){ if(!r || !newMail(r)) return; SEEN.r[r.key] = Date.now(); const ks = Object.keys(SEEN.r); if(ks.length > 600) delete SEEN.r[ks[0]]; try{ localStorage.setItem(SEENK, JSON.stringify(SEEN)); }catch(e){} }
  const pname = p => { try{ const r = PEOPLE.get(p); return r && r.n ? r.n : ''; }catch(e){ return ''; } };

  /* ---------- the agencies ---------- */
  let AGD = null, AGDV = '';
  function agByDom(dom){
    if(!dom) return null;
    const v = (typeof AG !== 'undefined' ? AG.length : 0) + ':' + (window.__illuAGv || 0);
    if(!AGD || AGDV !== v){ AGDV = v; AGD = new Map(); try{ for(const a of AG){ const d = String(a.domain || '').toLowerCase().replace(/^www\./, ''); if(d && !AGD.has(d)) AGD.set(d, a); } }catch(e){} }
    if(AGD.has(dom)) return AGD.get(dom);
    const parts = dom.split('.'); for(let i = 1; i < parts.length - 1; i++){ const d = parts.slice(i).join('.'); if(AGD.has(d)) return AGD.get(d); }
    return null;
  }
  /* "18/11/2026 14:36" (the Email tab's own date) or an ISO time */
  function when(s){
    s = String(s || '');
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
    if(m) return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
    const d = new Date(s); return isNaN(d) ? null : d;
  }
  const Y0 = new Date(2026, 0, 1);

  /* ---------- removed from the list (1.2.252) ---------- */
  let HIDE = new Map(), EFF = [];
  const hid32 = s => { let h = 5381; s = String(s); for(let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
  const hideId = (rk, mk) => 'h' + hid32(rk + '|' + (mk || '')) + hid32((mk || '') + '#' + rk);
  (function hideListen(){
    if(typeof DB === 'undefined' || !DB){ setTimeout(hideListen, 900); return; }
    try{ DB.collection('bemhide').onSnapshot(sn => {
      const m = new Map();
      for(const d of (sn.docs || [])){ const v = docData(d); const id = docId(d); if(v && id && v.r) m.set(id, {id, r: String(v.r), dom: String(v.dom || ''), mk: String(v.mk || ''), k: v.k || '', nm: v.nm || '', ag: v.ag || '', by: v.by || '', at: Date.parse(v.at) || 0, seen: +v.seen || Date.parse(v.at) || 0}); }
      HIDE = m; DATAV++; if(document.getElementById('bemlist')) drawList();
    }, () => {}); }catch(e){ console.warn('bemhide', e); }
  })();
  function hideFor(r){ const out = []; for(const h of HIDE.values()) if(h.r === r.key || (h.dom && r.dom && h.dom.toLowerCase() === String(r.dom).toLowerCase())) out.push(h); return out; }

  /* ---------- the rows ---------- */
  let HW = [], HWAT = 0, HWBUSY = false, AGH = [], DATAV = 0;
  const docData = d => { try{ return typeof docOf === 'function' ? docOf(d) : d.data(); }catch(e){ return null; } };
  const docId = d => { try{ return d.id || (d.ref && d.ref.id) || String(d.path || '').split('/').pop() || ''; }catch(e){ return ''; } };
  function loadHw(force){
    if(HWBUSY || (!force && Date.now() - HWAT < 120000)) return Promise.resolve();
    if(typeof DB === 'undefined' || !DB) return Promise.resolve();
    HWBUSY = true;
    const a = DB.collection('hwlog').limit(500).get().then(sn => {
      const out = [];
      for(const d of (sn.docs || sn || [])){ const v = docData(d); if(!v || !Array.isArray(v.e)) continue;
        for(const r of v.e) if(Array.isArray(r) && r[3]) out.push({p: v.p || '', t: new Date(r[0]), dom: String(r[1] || ''), ag: String(r[2] || ''), mk: String(r[3] || '')}); }
      HW = out.filter(x => x.t >= Y0);
    }).catch(() => {});
    /* 1.2.251: the agencies' Hiworks history (written by the "Emailed before" window, illu-agmail.js) */
    const b = DB.collection('aghist').limit(500).get().then(sn => {
      const out = [];
      for(const d of (sn.docs || sn || [])){ const v = docData(d); const id = docId(d); if(!v || !id) continue; out.push({dom: String(id).toLowerCase(), s: Array.isArray(v.s) ? v.s : [], i: Array.isArray(v.i) ? v.i : []}); }
      AGH = out;
    }).catch(() => {});
    return Promise.all([a, b]).then(() => { HWAT = Date.now(); HWBUSY = false; DATAV++; draw(); });
  }
  function agByName(n){ n = String(n || '').trim().toLowerCase(); if(!n) return null; try{ return AG.find(a => String(a.name || '').trim().toLowerCase() === n) || null; }catch(e){ return null; } }
  function build(){
    const rows = new Map(), byName = new Map();
    /* the agency's name for a mail domain the Directory does not know: the name the program wrote down when the ✉ window
       was opened for that domain (hwlog), else the domain itself - never a model card's own agency (her card can name her
       mother agency while the email went to another one) */
    const hwName = new Map(); for(const h of HW) if(h.dom && h.dom.indexOf(':') < 0 && h.ag && !hwName.has(h.dom)) hwName.set(h.dom, h.ag);
    const rowFor = (dom, name) => {
      const a = agByDom(dom) || (!dom ? agByName(name) : null);
      const disp = a ? a.name : (dom && hwName.get(dom)) || name || dom || L('Unknown agency', '알 수 없는 에이전시');
      const nkey = String(disp).trim().toLowerCase();
      const key = a ? 'ag:' + String(a.domain || a.name).toLowerCase() : dom ? 'dom:' + dom : 'nm:' + nkey;
      let r = rows.get(key) || byName.get(nkey);         // one row per agency, whether it was found by its domain or by its name
      if(!r){ r = {key, ag: disp, dom: a ? String(a.domain || dom) : dom, to: '', toAt: 0, by: new Set(), models: new Map(), msgs: new Map(), opened: [], ope: []}; rows.set(key, r); byName.set(nkey, r); }
      return r;
    };
    const cards = new Map();
    try{ for(const c of BOOK.values()) if(c && c.k) cards.set(nk(c.k), c); }catch(e){}
    try{
      for(const c of BOOK.values()){
        const list = c && c.em && Array.isArray(c.em.list) ? c.em.list : []; if(!list.length) continue;
        const cdom = domOf(c.k);
        for(const x of list){
          const t = when(x.dt); if(!t || t < Y0) continue;
          const out = x.dir === 'out';
          let addr = '';
          if(out) addr = (Array.isArray(x.to) ? x.to : []).find(a => a && !OWN.test(domOf(a))) || '';
          else { addr = x.addr || ''; if(OWN.test(domOf(addr))) continue; }
          let dom = domOf(addr);
          const viaCard = !dom || FREE.test(dom);
          const r = viaCard ? rowFor(cdom, c.ag) : rowFor(dom, '');
          if(addr && t.getTime() >= r.toAt){ r.to = addr; r.toAt = t.getTime(); }
          if(c.by) r.by.add(c.by);
          const mk = nk(c.k);
          if(!r.models.has(mk)) r.models.set(mk, {k: c.k, nm: c.nm || '', ht: c.ht || '', bid: c.id, st: c.st || '', cardAg: c.ag || '', sent: false});
          if(out) r.models.get(mk).sent = true;
          const ek = x.k || (x.dt + '|' + x.dir + '|' + (x.subject || ''));
          let m = r.msgs.get(ek);
          if(!m){ m = {t, d: out ? 'out' : 'in', s: (ko() && x.summary_ko) || x.summary || x.subject || '', subj: x.subject || '', f: Array.isArray(x.files) ? x.files.length : 0, hw: x.hw || '', ms: new Set(), lk: [], cid: c.id}; r.msgs.set(ek, m); }
          m.ms.add(mk);
          /* 1.2.260: the material links in an agency's email (Get files / what the automatic pickup saved) */
          if(!out && m.lk) for(const f of (Array.isArray(x.files) ? x.files : [])) if(f && f.url && isGetU(f.url) && !m.lk.some(l => l.u === f.url)) m.lk.push({u: f.url, cid: c.id});
        }
      }
    }catch(e){ console.warn('booking emails', e); }
    /* 1.2.251: the agency's Hiworks history - inquiries sent from Hiworks that are not on a booking card yet (her models
       come from the email's links / full names, found by the "Emailed before" window), and the agency's answers in the
       same conversation (subject line) */
    const TK = s => { try{ return window.__illuEmail && window.__illuEmail.threadKey ? window.__illuEmail.threadKey(s) : String(s || '').replace(/^\s*((re|fw|fwd)\s*[:：]\s*)+/ig, '').trim().toLowerCase(); }catch(e){ return ''; } };
    const pidOf = n => { n = String(n || '').trim().toLowerCase(); if(!n) return ''; try{ for(const [id, p] of PEOPLE) if(p && String(p.n || '').trim().toLowerCase() === n) return id; }catch(e){} return ''; };
    for(const a of AGH){
      for(const s of a.s){
        const t = when(s.dt); if(!t || t < Y0) continue;
        const ms = Array.isArray(s.ms) ? s.ms.filter(m => m && m.key) : []; if(!ms.length) continue;
        const to = (Array.isArray(s.to) ? s.to : []).find(x => x && !OWN.test(domOf(x))) || '';
        const r = rowFor(domOf(to) && !FREE.test(domOf(to)) ? domOf(to) : a.dom, '');
        if(to && t.getTime() >= r.toAt){ r.to = to; r.toAt = t.getTime(); }
        const who = pidOf(s.who); if(who) r.by.add(who);
        const ek = 'hw:' + s.no;
        let m = r.msgs.get(ek);
        if(!m){ m = {t, d: 'out', s: s.subject || '', subj: s.subject || '', f: 0, hw: s.no ? '/view/all/' + s.no : '', ms: new Set(), hist: true}; r.msgs.set(ek, m); }
        for(const x of ms){
          const mk = nk(x.key); m.ms.add(mk);
          if(!r.models.has(mk)){ const c = cards.get(mk); r.models.set(mk, {k: c ? c.k : x.key, nm: (c && c.nm) || x.nm || '', ht: c ? (c.ht || '') : '', bid: c ? c.id : '', st: c ? (c.st || '') : '', cardAg: c ? (c.ag || '') : '', sent: true}); }
          else r.models.get(mk).sent = true;
          const cc = cards.get(mk); if(cc && cc.by) r.by.add(cc.by);
        }
      }
    }
    for(const a of AGH){
      const r = [...rows.values()].find(o => o.dom && (o.dom === a.dom || o.dom.endsWith('.' + a.dom) || a.dom.endsWith('.' + o.dom)));
      if(!r) continue;
      const ours = new Set([...r.msgs.values()].filter(m => m.d === 'out').map(m => TK(m.subj || m.s)).filter(Boolean));
      for(const x of a.i){
        const t = when(x.dt); if(!t || t < Y0) continue;
        const ek = 'hw:' + x.no; if(r.msgs.has(ek)) continue;
        const tk = TK(x.subject); if(!tk || ![...ours].some(o => tk === o || tk.startsWith(o))) continue;   // only answers to our inquiries, not their newsletters
        const firstOut = [...r.msgs.values()].filter(m => m.d === 'out').sort((p, q) => p.t - q.t)[0];
        if(firstOut && t < firstOut.t) continue;
        r.msgs.set(ek, {t, d: 'in', s: x.subject || '', subj: x.subject || '', f: 0, hw: x.no ? '/view/all/' + x.no : '', ms: new Set(), hist: true});
      }
    }
    /* opened in Hiworks from the program, with no sent email on record for that model at that agency */
    for(const h of HW){
      const mk = nk(h.mk); const r = rowFor(h.dom.indexOf(':') >= 0 ? '' : h.dom, h.ag);
      /* the ✉ window opened under the agency's name only (no mail domain): an email that did go out about her to an agency
         of the same name counts for it */
      if(h.dom.indexOf(':') >= 0 && [...rows.values()].some(o => o !== r && o.models.has(mk) && o.models.get(mk).sent && String(o.ag).toLowerCase().split(/\s+/)[0] === String(h.ag).toLowerCase().split(/\s+/)[0])) continue;
      if(h.p) r.by.add(h.p);
      const have = r.models.get(mk);
      if(have && have.sent) continue;
      if(!have){ const c = cards.get(mk); let nm = c ? c.nm : ''; let ht = c ? c.ht : '';
        if(!nm){ try{ const i = keyInfo(h.mk); if(i) nm = i.nm || ''; }catch(e){} }
        if(!nm){ const sl = decodeURIComponent(String(h.mk).replace(/[?#].*$/, '').replace(/\/(portfolio|book)?\/?$/i, '').split('/').pop() || ''); nm = sl.replace(/\.web$|\.html?$/i, '').replace(/^\d+-|-\d+$/g, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, z => z.toUpperCase()); }
        r.models.set(mk, {k: h.mk, nm, ht, bid: c ? c.id : '', st: c ? (c.st || '') : '', cardAg: c ? (c.ag || '') : h.ag, sent: false}); }
      r.opened.push(h.t); r.ope.push({t: h.t, mk});
      const mo = r.models.get(mk); if(mo) mo.lo = Math.max(mo.lo || 0, +h.t);
    }
    const now = Date.now(), today = new Date(); today.setHours(0, 0, 0, 0);
    const out = [];
    const hid = k => { try{ return !!(window.__illuHidK && window.__illuHidK(k)); }catch(e){ return false; } };
    const eff = [];
    for(const r of rows.values()){
      for(const [mk, m] of [...r.models]) if(hid(m.k)) r.models.delete(mk);   // 1.2.251: hidden models leave the board
      /* 1.2.252: removed from the list - until a newer email (or a newer ✉ window) about her / to that agency */
      /* the newest email / ✉ window known for the row and for each model: kept with a removal, so only a NEWER one
         brings it back (compared with what was known then, not with the clock) */
      r.rowLast = Math.max(0, ...[...r.msgs.values()].map(m => +m.t), ...r.opened.map(t => +t));
      const lastOf = mk => { let t = 0; for(const m of r.msgs.values()) if(m.ms.has(mk) && +m.t > t) t = +m.t; const mo = r.models.get(mk); if(mo && (mo.lo || 0) > t) t = mo.lo; return t; };
      r.lastOf = new Map([...r.models.keys()].map(mk => [mk, lastOf(mk)]));
      const hs = hideFor(r);
      if(hs.length && r.models.size){
        const whole = hs.filter(h => !h.mk && h.seen >= r.rowLast).pop();
        if(whole){ eff.push(Object.assign({}, whole, {nm: '', ag: r.ag, rk: r.key})); continue; }
        const gone = new Set();
        for(const h of hs) if(h.mk && r.models.has(h.mk) && h.seen >= r.lastOf.get(h.mk)){ eff.push(Object.assign({}, h, {nm: nmOf(r.models.get(h.mk)) || h.nm, ag: r.ag, rk: r.key})); r.models.delete(h.mk); gone.add(h.mk); }
        if(gone.size){
          for(const [ek, m] of [...r.msgs]) if(m.d === 'out' && m.ms.size && [...m.ms].every(x => gone.has(x))) r.msgs.delete(ek);   // the emails only about her
          r.opened = r.ope.filter(o => !gone.has(o.mk)).map(o => o.t);
        }
      }
      if(!r.models.size) continue;
      const ms = [...r.msgs.values()].sort((a, b) => a.t - b.t);
      r.list = ms; r.sent = ms.filter(m => m.d === 'out').length; r.recv = ms.filter(m => m.d === 'in').length;
      const lastO = r.opened.length ? new Date(Math.max(...r.opened.map(x => +x))) : null;
      r.last = ms.length ? ms[ms.length - 1] : null;
      r.at = Math.max(r.last ? +r.last.t : 0, lastO && !ms.length ? +lastO : 0);
      r.first = ms.length ? ms[0].t : lastO;
      r.isNew = !!(r.first && r.first >= today);
      { const li = ms.filter(m => m.d === 'in').pop(); r.lastIn = li ? +li.t : 0; r.newIn = ms.filter(m => m.d === 'in' && +m.t > Math.max(SEEN.base, SEEN.r[r.key] || 0)).length; }
      const lo = ms.filter(m => m.d === 'out').pop();
      r.days = lo ? Math.floor((now - lo.t) / 864e5) : 0;
      r.st = !ms.length ? 'opened' : r.last.d === 'in' ? 'replied' : r.recv ? 'waiting' : 'none';
      /* the model's card says another agency (her mother agency, another office): say so */
      const other = [...r.models.values()].map(m => m.cardAg).filter(a => a && a.toLowerCase() !== String(r.ag).toLowerCase() && !agSame(a, r));
      r.note = other.length === 1 && r.models.size === 1 ? L('Her card says ', '카드 에이전시: ') + other[0] : '';
      r.mine = r.by.has(me());
      out.push(r);
    }
    EFF = eff.sort((a, b) => b.at - a.at);
    return out.sort((a, b) => b.at - a.at);
  }
  function agSame(name, r){ try{ const a = AG.find(x => x.name === name); return !!(a && r.dom && String(a.domain || '').toLowerCase() === String(r.dom).toLowerCase()); }catch(e){ return false; } }

  /* ---------- the look ---------- */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hm = t => String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
  function day(t){ const d = new Date(t); d.setHours(0, 0, 0, 0); const n = new Date(); n.setHours(0, 0, 0, 0); const k = Math.round((n - d) / 864e5);
    return k === 0 ? L('Today', '오늘') : k === 1 ? L('Yesterday', '어제') : ko() ? (t.getMonth() + 1) + '월 ' + t.getDate() + '일' : t.getDate() + ' ' + MON[t.getMonth()]; }
  const ini = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const I = {
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    in: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 7L7 17M7 9v8h8"/></svg>',
    out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>',
    clip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/></svg>',
    chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    bk: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M8 5V3M16 5V3"/></svg>',
    md: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17c.8-2 2.2-3 4-3s3.2 1 4 3"/></svg>'
  };
  function stLabel(r){
    if(r.st === 'opened') return L('Not confirmed sent', '발송 미확인');
    if(r.st === 'replied') return L('Reply in · your turn', '답장 옴 · 내 차례');
    if(r.st === 'waiting') return L('Waiting on them', '상대 답 기다림');
    return r.days < 1 ? L('No reply yet', '아직 답장 없음') : L('No reply · ' + r.days + (r.days === 1 ? ' day' : ' days'), '답장 없음 · ' + r.days + '일');
  }
  let ROWS = [];
  function pool(){ return ST.who === 'me' ? ROWS.filter(r => r.mine) : ROWS; }
  function shown(){
    const q = ST.q.trim().toLowerCase();
    return pool().filter(r => {
      if(ST.f === 'replied' && !r.recv) return false;
      if(ST.f === 'open' && r.recv) return false;
      if(!q) return true;
      return String(r.ag).toLowerCase().includes(q) || String(r.to).toLowerCase().includes(q) || [...r.models.values()].some(m => String(m.nm).toLowerCase().includes(q));
    });
  }
  function thread(r){
    const v = ST.tv[r.key] || 'all';
    const ms = r.list.filter(m => v === 'all' || m.d === v).slice().reverse();
    const lastIn = r.list.filter(m => m.d === 'in' && m.hw).pop();
    return '<div class="bemthd"><div class="bemseg" role="group">' +
        [['all', L('All', '전체'), r.list.length], ['in', L('Received', '받은 메일'), r.recv], ['out', L('Sent', '보낸 메일'), r.sent]].map(([k, l, n]) => '<button type="button" data-bemtv="' + k + '" aria-pressed="' + (v === k) + '">' + l + ' <s>' + n + '</s></button>').join('') + '</div>' +
      '<span class="bemsp"></span>' +
      (lastIn ? '<a class="bembtn" href="https://mails.office.hiworks.com' + E(lastIn.hw) + '" target="_blank" rel="noopener">' + L('Reply in Hiworks', 'Hiworks에서 답장') + ' ↗</a>' : '') +
      (r.to ? '<span class="cts bemcts" data-dom="' + E(r.dom || domOf(r.to)) + '"><a class="ctmail bembtn fill" href="mailto:' + E(r.to) + '">' + L('Ask about another model', '다른 모델 문의하기') + '</a></span>' : '') +
      '<button type="button" class="bembtn bemdelrow" data-bemdelrow title="' + E(L('Takes this agency off the list for everyone. Nothing is deleted in Hiworks; a new email to them brings it back.', '모든 사람의 목록에서 이 에이전시를 뺍니다. Hiworks에서는 아무것도 지워지지 않으며, 새 메일을 보내면 다시 나타납니다.')) + '">' + XI + L('Remove from list', '목록에서 삭제') + '</button></div>' +
      (r.opened.length && !r.list.length ? '<p class="bemop">' + L('Opened in Hiworks from the program on ', '프로그램에서 Hiworks 작성 창을 연 날: ') + E(r.opened.map(t => day(t) + ' ' + hm(t)).slice(-3).join(', ')) + L(' — no sent email is on record yet. When it is sent, it shows here.', ' — 아직 보낸 메일 기록이 없습니다. 보내면 여기에 표시됩니다.') + '</p>' : '') +
      (ms.length ? '<div class="bemmsgs">' + ms.map(m => '<div class="bemmsg ' + m.d + '"><span class="bemdir">' + (m.d === 'in' ? I.in + L('Received', '받음') : I.out + L('Sent', '보냄')) + '</span>' +
          '<span class="bemwhen">' + E(day(m.t)) + ' · ' + hm(m.t) + '</span><span class="bemtxt">' + E(m.s || L('(no summary yet)', '(요약 없음)')) + '</span>' +
          '<span class="bematt">' + (m.f ? I.clip + m.f : '') + '</span>' + (m.lk && m.lk.length ? '<span class="bemlks">' + m.lk.map(lkChip).join('') + '</span>' : '') + '</div>').join('') + '</div>'
        : r.list.length ? '<div class="bemempty">' + (v === 'in' ? L('Nothing received from this agency yet.', '이 에이전시에서 받은 메일이 아직 없습니다.') : L('Nothing sent yet.', '보낸 메일이 아직 없습니다.')) + '</div>' : '');
  }
  /* 1.2.260: one material link - what the automatic pickup did with it, or Get files */
  function lkChip(l){
    let c = null; try{ c = BOOK.get(l.cid); }catch(e){}
    const g = c && c.gf && c.gf[l.u];
    const host = (() => { try{ return new URL(l.u).hostname.replace(/^www\./, ''); }catch(e){ return ''; } })();
    const nm = /drive\.google/.test(host) ? 'Google Drive' : /mediaslide/.test(host) ? 'Mediaslide' : /wetransfer|we\.tl/.test(host) ? 'WeTransfer' : host;
    const pc = !!(window.illu && window.illu.getFilesPlan && !window.illu.web);
    let st = '', cls = '';
    if(g && g.st === 'ok'){ cls = 'ok'; st = L('Saved ' + (g.saved || 0) + ' new' + (g.same ? ' · ' + g.same + ' already there' : '') + (g.failed ? ' · ' + g.failed + ' not saved' : '') + ' → ' + (g.folder || ''), '저장 ' + (g.saved || 0) + '개' + (g.same ? ' · 이미 있음 ' + g.same : '') + (g.failed ? ' · 저장 못 함 ' + g.failed : '') + ' → ' + (g.folder || '')); }
    else if(g && g.st === 'other') { cls = 'ok'; st = L('Saved for ' + (g.nm || ''), (g.nm || '') + ' 폴더에 저장됨'); }
    else if(g && g.st === 'which'){ cls = 'ask'; st = L('Which model? Choose who it is for', '어느 모델인가요? 받을 모델을 고르세요'); }
    else if(g && g.st === 'fail'){ cls = 'bad'; st = L('Not saved', '저장 못 함') + (g.why ? ' · ' + g.why : ''); }
    else if(c && (c.st === 'canc' || c.del)) st = L('Card cancelled — not picked up', '취소된 카드 — 받지 않음');
    else st = L('Not picked up yet', '아직 받지 않음');
    const when = g && g.at ? (() => { const t = new Date(g.at); return isNaN(t) ? '' : ' · ' + day(t) + ' ' + hm(t); })() : '';
    return '<span class="bemlk ' + cls + '" title="' + E(l.u) + '"><b>📥 ' + E(nm) + '</b><span class="bemlkst">' + E(st + when) + '</span>' +
      (!pc || !c ? '' : g && g.st === 'which' && Array.isArray(g.with) ? g.with.map(id => { let x = null; try{ x = BOOK.get(id); }catch(e){} return x ? '<button type="button" class="bembtn" data-bemget="' + E(l.u) + '" data-bemcid="' + E(id) + '">' + E(L('Get for ', '받기: ') + String(x.nm || '').split(/\s+/)[0]) + '</button>' : ''; }).join('')
        : '<button type="button" class="bembtn" data-bemget="' + E(l.u) + '" data-bemcid="' + E(g && g.st === 'other' && g.to ? g.to : l.cid) + '">' + (g && (g.st === 'ok' || g.st === 'other') ? L('Get again', '다시 받기') : L('Get files', '파일 받기')) + '</button>') +
      '<a class="bembtn" href="' + E(l.u) + '" target="_blank" rel="noopener">' + L('Open', '열기') + ' ↗</a></span>';
  }
  /* 1.2.251: her photo - the same one her cards show (booking card photo, else her agency photo), small */
  function photoOf(m){
    let u = '';
    try{ const c = m.bid && BOOK.get(m.bid); if(c && typeof bkPhoto === 'function') u = bkPhoto(c) || ''; }catch(e){}
    try{ if(!u && window.__illuMatCover) u = window.__illuMatCover(m.k) || (m.bid ? window.__illuMatCover('bid:' + m.bid) : '') || ''; }catch(e){}
    try{ if(!u && typeof litFacts === 'function') u = (litFacts({key: nk(m.k), nm: m.nm}) || {}).photo || ''; }catch(e){}
    if(u && /^https?:/i.test(u)){ if(window.illu && window.illu.modelPhotos && !window.illu.web) u = 'illuimg://p/' + encodeURIComponent(u) + '?r=' + encodeURIComponent(m.k) + '&w=200'; else if(window.__illuSmall) u = window.__illuSmall(u, 160); }
    return u;
  }
  /* her name as her cards show it: the booking card's name, else the Directory's (a name fixed with the ✎ is kept there) */
  const nmOf = m => { if(m.bid){ try{ const c = BOOK.get(m.bid); if(c && c.nm) return c.nm; }catch(e){} } try{ const i = keyInfo(m.k); if(i && i.nm) return i.nm; }catch(e){} return m.nm || ''; };
  const XI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>';
  const BKI = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18"/></svg>';
  /* her mini card (was a name chip in 1.2.248) */
  function chip(r, m, mk){
    const bk = !!m.bid, nm = nmOf(m), ph = photoOf(m), canc = m.st === 'canc';
    const tip = nm + (m.ht ? ' · ' + m.ht + ' cm' : '') + ' — ' + (m.sent ? (bk ? L('has a booking card — choose which card to open', '부킹 카드 있음 — 열 카드를 고르세요') : L('open her card', '모델 카드 열기')) : L('opened in Hiworks, not confirmed sent', 'Hiworks 작성 창만 열림, 발송 미확인'));
    return '<button type="button" class="bemmc' + (m.sent ? '' : ' unc') + '" data-bemmc="' + E(r.key) + '" data-bemmk="' + E(mk) + '" title="' + E(tip) + '">' +
      '<span class="bemph">' + (ph ? '<img src="' + E(ph) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') + '<i>' + E(ini(nm)) + '</i>' +
      (bk ? '<span class="bembk' + (canc ? ' canc' : '') + '" aria-label="' + E(L('has a booking card', '부킹 카드 있음')) + '">' + BKI + '</span>' : '') +
      '<span class="bemdel" role="button" tabindex="0" data-bemdel title="' + E(L('Remove ', '') + nm + L(' from this agency’s list', ' — 이 에이전시 목록에서 삭제')) + '" aria-label="' + E(L('Remove from list', '목록에서 삭제')) + '">' + XI + '</span></span>' +
      '<span class="bemmn">' + E(nm) + '</span><span class="bemmh">' + E(m.sent ? (m.ht ? m.ht + ' cm' : '') : L('not confirmed', '발송 미확인')) + '</span></button>';
  }
  function list(){
    const rs = shown();
    if(!ROWS.length) return '<div class="bemempty">' + L('No model inquiries emailed this year yet. Every model inquiry sent from Hiworks is added here automatically.', '올해 보낸 모델 문의 메일이 아직 없습니다. Hiworks로 보낸 모델 문의는 자동으로 여기에 추가됩니다.') + '</div>';
    if(!rs.length) return '<div class="bemempty">' + L('No agencies match.', '맞는 에이전시가 없습니다.') + '</div>';
    return '<div class="bemlh"><span>' + L('Agency', '에이전시') + '</span><span>' + L('Models inquired', '문의한 모델') + '</span><span class="r">' + L('Sent', '보냄') + '</span><span class="r">' + L('Received', '받음') + '</span><span>' + L('Last email', '마지막 메일') + '</span><span>' + L('Status', '상태') + '</span><span></span></div>' +
      rs.map(r => {
        const op = ST.open.has(r.key), by = [...r.by].map(pname).filter(Boolean);
        return '<div class="bemit' + (op ? ' open' : '') + (newMail(r) ? ' hasnew' : '') + '" data-bemrow="' + E(r.key) + '"><div class="bemrw" role="button" tabindex="0" aria-expanded="' + op + '">' +
          '<div class="bemagc"><div class="bemagn"><span>' + E(r.ag) + '</span>' + (r.isNew ? '<em class="bemnew">' + L('NEW', '신규') + '</em>' : '') + '</div>' + (newMail(r) ? '<div class="bemnewl"><em class="bemnewm" title="' + E(L('A new email from them since you last opened this', '마지막으로 연 뒤 새 메일이 왔습니다')) + '">' + I.mail + (r.newIn > 1 ? r.newIn + L(' new emails', '통 새 메일') : L('New email', '새 메일')) + '</em></div>' : '') +
            '<div class="bemags">' + by.map(n => '<span class="bemwho" title="' + E(L('Sent by ', '보낸 사람: ') + n) + '">' + E(n[0]) + '</span>').join('') + '<span class="bemaddr">' + E(r.to || r.dom) + '</span></div>' +
            (r.note ? '<div class="bemnote">' + E(r.note) + '</div>' : '') + '</div>' +
          '<div class="bemmodels">' + [...r.models.entries()].map(([mk, m]) => chip(r, m, mk)).join('') + '</div>' +
          '<div class="bemmeta"><span class="bemnum" data-l="' + E(L('sent', '보냄')) + '">' + r.sent + '</span>' +
            '<span class="bemnum ' + (r.recv ? 'g' : 'z') + '" data-l="' + E(L('received', '받음')) + '">' + r.recv + '</span>' +
            '<span class="bemlast">' + (r.last ? E(day(r.last.t)) + '<small>' + hm(r.last.t) + ' · ' + (r.last.d === 'in' ? L('from them', '상대가') : L('by us', '우리가')) + '</small>' : '—') + '</span>' +
            '<span class="bemst ' + r.st + '"' + (r.st === 'opened' ? ' title="' + E(L('The email window was opened in Hiworks from the program, but no sent email is on record yet', '프로그램에서 Hiworks 작성 창은 열었지만 보낸 메일 기록이 아직 없습니다')) + '"' : '') + '>' + E(stLabel(r)) + '</span></div>' +
          '<span class="bemchev">' + I.chev + '</span></div>' +
          (op ? '<div class="bemthread">' + thread(r) + '</div>' : '') + '</div>';
      }).join('');
  }
  function totals(){
    const p = pool(); let s = 0, rc = 0; const mm = new Set();
    for(const r of p){ s += r.sent; rc += r.recv; for(const k of r.models.keys()) mm.add(k); }
    return '<span><b>' + p.length + '</b> ' + L('agencies', '에이전시') + '</span><span><b>' + mm.size + '</b> ' + L('models', '모델') + '</span><span><b>' + s + '</b> ' + L('sent', '보냄') + '</span><span><b>' + rc + '</b> ' + L('received', '받음') + '</span>';
  }
  function board(){
    const p = pool();
    return '<div class="bemtools"><label class="bemsearch">' + I.search + '<input type="search" data-bemq placeholder="' + E(L('Search agency or model', '에이전시 또는 모델 검색')) + '" value="' + E(ST.q) + '"></label>' +
        '<div class="bemseg" role="group" aria-label="' + E(L('Whose emails', '누구의 메일')) + '"><button type="button" data-bemwho="me" aria-pressed="' + (ST.who === 'me') + '">' + L('Mine', '내 메일') + ' <s>' + ROWS.filter(r => r.mine).length + '</s></button><button type="button" data-bemwho="all" aria-pressed="' + (ST.who === 'all') + '">' + L('Everyone', '전체') + ' <s>' + ROWS.length + '</s></button></div>' +
        '<div class="bemseg" role="group" aria-label="' + E(L('Replies', '답장')) + '"><button type="button" data-bemf="any" aria-pressed="' + (ST.f === 'any') + '">' + L('All', '전체') + '</button><button type="button" data-bemf="replied" aria-pressed="' + (ST.f === 'replied') + '">' + L('Reply in', '답장 옴') + ' <s>' + p.filter(r => r.recv).length + '</s></button><button type="button" data-bemf="open" aria-pressed="' + (ST.f === 'open') + '">' + L('No reply yet', '답장 없음') + ' <s>' + p.filter(r => !r.recv).length + '</s></button></div>' +
        '<span class="bemsp"></span><div class="bemtot">' + totals() + '</div>' + updBtn() + '</div>' +
      '<div class="bemhint"><span class="bemlive"></span><span class="bemhtxt">' + L('Every model inquiry you send from Hiworks is added here automatically — newest activity on top.', 'Hiworks로 보낸 모델 문의는 자동으로 추가됩니다 — 최근 활동이 맨 위.') + '</span><span class="bemupdmsg" id="bemupdmsg">' + updMsg() + '</span></div>' +
      '<div class="bemlist" id="bemlist">' + list() + '</div><div id="bemrem">' + remPanel() + '</div>';
  }
  function remPanel(){
    if(!EFF.length) return '';
    return '<details class="bemrem"' + (ST.remOpen ? ' open' : '') + '><summary>' + L('Removed from the list', '목록에서 삭제됨') + ' <s>' + EFF.length + '</s></summary><div class="bemremls">' +
      EFF.map(h => { const t = new Date(h.at); const who = pname(h.by);
        return '<div class="bemremit"><span class="bemremn"><b>' + E(h.mk ? (h.nm || h.k) : L('Whole agency', '에이전시 전체')) + '</b> · ' + E(h.ag) + '</span>' +
          '<span class="bemremw">' + E(L('Removed ', '삭제 ') + day(t) + ' ' + hm(t) + (who ? ' · ' + who : '')) + '</span>' +
          '<button type="button" class="bembtn" data-bemrestore="' + E(h.id) + '">' + L('Put back', '되돌리기') + '</button></div>'; }).join('') + '</div></details>';
  }
  function tabs(){
    const n = ROWS.length, rep = ROWS.some(r => r.mine && r.st === 'replied'), nn = ROWS.filter(newMail).length;
    return '<div class="bemsw" role="tablist" aria-label="' + E(L('Today’s Board', '오늘의 보드')) + '">' +
      '<button type="button" role="tab" data-bemv="vote" aria-selected="' + (ST.v === 'vote') + '">' + L('Team Vote', '팀 투표') + '</button>' +
      '<button type="button" role="tab" data-bemv="mail" aria-selected="' + (ST.v === 'mail') + '">' + I.mail + L('Booking Emails', '부킹 이메일') + ' <s>' + n + '</s>' + (nn ? '<b class="bemnewn" title="' + E(L(nn + (nn === 1 ? ' agency has' : ' agencies have') + ' a new email', '새 메일이 온 에이전시 ' + nn + '곳')) + '">' + nn + ' ' + L('new', '새 메일') + '</b>' : rep ? '<i class="bemdot" title="' + E(L('A reply came in', '답장이 왔습니다')) + '"></i>' : '') + '</button></div>';
  }
  /* Today's main column: the tabs, then Team Vote as it was or the Booking Emails board */
  function wrap(){
    const orig = window.__illuVoteToday;
    if(typeof orig !== 'function'){ setTimeout(wrap, 300); return; }
    if(orig.__bem) return;
    const w = function(){
      loadHw(false);                                        // the tab's count includes them from the start
      ROWS = build();
      return '<div class="bemwrap">' + tabs() + (ST.v === 'mail' ? '<section class="bem" id="bem">' + board() + '</section>' : orig.apply(this, arguments)) + '</div>';
    };
    w.__bem = true; window.__illuVoteToday = w;
    try{ window.__illuTodayRender && window.__illuTodayRender(); }catch(e){}
  }
  wrap();
  function draw(){ try{ window.__illuTodayRender && window.__illuTodayRender(); }catch(e){} }
  /* the list only (typing in the search box keeps its place) */
  window.__illuBEmailRedraw = () => { if(document.getElementById('bemlist')) drawList(); };
  function drawList(){ const l = document.getElementById('bemlist'); if(!l){ draw(); return; } ROWS = build(); l.innerHTML = list(); const t = document.querySelector('#bem .bemtot'); if(t) t.innerHTML = totals(); const rp = document.getElementById('bemrem'); if(rp) rp.innerHTML = remPanel(); }
  window.__illuBEmailRows = () => { ROWS = build(); return ROWS; };

  /* 1.2.251: the shared email record - the newest agency row for each model, read by the ✉ marker on every card
     (illu-emk.js). Built again only when the booking cards' emails, the Hiworks history, hwlog or the signed-in person
     change. */
  let RECV = '', REC = null;
  function sig(){ let n = 0, b = 0; try{ b = BOOK.size; for(const c of BOOK.values()) n += c && c.em && Array.isArray(c.em.list) ? c.em.list.length : 0; }catch(e){} return b + ':' + n + ':' + DATAV + ':' + me(); }
  function rec(){
    const s = sig(); if(REC && s === RECV) return REC;
    loadHw(false);
    const rows = build(), by = new Map();
    for(const r of rows) for(const [mk, m] of r.models){ const o = by.get(mk); if(o && o.r.at >= r.at) continue; by.set(mk, {r, m, mk}); }
    REC = {rows, by}; RECV = s; return REC;
  }
  function info(x){
    if(!x) return null;
    const r = x.r, m = x.m, mk = x.mk;
    const outs = r.list.filter(e => e.d === 'out'), mine = outs.filter(e => e.ms && e.ms.has(mk));
    const last = (mine.length ? mine : outs).slice(-1)[0] || null;
    const st = !m.sent ? 'opened' : r.st;
    const by = [...r.by].map(pname).filter(Boolean);
    return {key: r.key, ag: r.ag, to: r.to || r.dom, st, label: !m.sent ? L('Not confirmed sent', '발송 미확인') : stLabel(r), sent: r.sent, recv: r.recv, last: last ? last.t : null, lastIn: r.list.filter(e => e.d === 'in').slice(-1)[0] || null,
      others: Math.max(0, r.models.size - 1), by, opened: r.opened.length ? new Date(Math.max(...r.opened.map(t => +t))) : null, day, hm};
  }
  window.__illuEmRec = {
    of: k => { try{ return info(rec().by.get(nk(k))); }catch(e){ console.warn('email record', e); return null; } },
    keys: () => { try{ return [...rec().by.values()].map(x => x.m.k).filter(Boolean); }catch(e){ return []; } },
    ver: () => { try{ rec(); }catch(e){} return RECV; },
    /* Open conversation: Today › Booking Emails with that agency's row open */
    open: key => {
      const R = rec(); const r = R.rows.find(x => x.key === key); if(!r) return;
      ST.v = 'mail'; ST.f = 'any'; ST.q = ''; ST.open.add(key); if(!r.by.has(me())) ST.who = 'all'; keep();
      try{ if(window.__illuGo) window.__illuGo('today'); }catch(e){}
      draw();
      let n = 0; const find = () => { const el = document.querySelector('#bem [data-bemrow="' + CSS.escape(key) + '"]'); if(el){ el.scrollIntoView({block: 'center', behavior: 'smooth'}); el.classList.add('bemflash'); setTimeout(() => el.classList.remove('bemflash'), 1800); } else if(++n < 12) setTimeout(find, 150); };
      setTimeout(find, 60);
    }
  };

  /* ---------- Update from Hiworks (PC program) ---------- */
  const canHw = () => !!(window.illu && window.illu.hiworksCollect && !window.illu.web && window.__illuEmail && window.__illuEmail.collect);
  let UPD = null, UPDLAST = null;
  try{ UPDLAST = JSON.parse(localStorage.getItem('illu.bemail.upd') || 'null'); }catch(e){}
  function updBtn(){
    if(!canHw()) return '';
    return '<button type="button" class="bemupd' + (UPD ? ' busy' : '') + '" data-bemupd title="' + E(L('Reads Hiworks for every model and agency on this list (and every Processing booking card): new emails and replies are added. Nothing is sent; unread mail is not opened.', '이 목록의 모든 모델과 에이전시(및 진행 중인 부킹 카드)에 대해 Hiworks를 읽어 새 메일과 답장을 추가합니다. 아무것도 보내지 않으며 안 읽은 메일은 열지 않습니다.')) + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>' +
      (UPD ? E(L('Updating ', '업데이트 중 ') + UPD.i + ' / ' + UPD.n + L(' · Stop', ' · 중지')) : L('Update from Hiworks', 'Hiworks에서 업데이트')) + '</button>';
  }
  function updMsg(){
    if(UPD) return E(UPD.now ? L('Reading Hiworks: ', 'Hiworks 읽는 중: ') + UPD.now : '');
    if(!UPDLAST || !canHw()) return '';
    const t = new Date(UPDLAST.at);
    return E(L('Last update ', '마지막 업데이트 ') + day(t) + ' ' + hm(t) + ' · ' + UPDLAST.msg) + (UPDLAST.signin ? ' <button type="button" class="bembtn" data-emsignin>' + L('Sign in to Hiworks', 'Hiworks 로그인') + '</button>' : '');
  }
  function updPaint(){ const b = document.querySelector('#bem [data-bemupd]'); if(b) b.outerHTML = updBtn(); const m = document.getElementById('bemupdmsg'); if(m) m.innerHTML = updMsg(); }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function update(opt){
    const auto = !!(opt && opt.auto);
    if(UPD){ if(!auto) UPD.stop = true; return false; }
    if(!canHw()) return false;
    const EM = window.__illuEmail;
    ROWS = build();
    const count = () => { let s = 0, r = 0; for(const x of build()) { s += x.sent; r += x.recv; } return [s, r]; };
    const [s0, r0] = count();
    const hid = k => { try{ return !!(window.__illuHidK && window.__illuHidK(k)); }catch(e){ return false; } };
    const ids = new Set();
    for(const r of ROWS) for(const m of r.models.values()) if(m.bid) ids.add(m.bid);
    /* 1.2.260 ("Any model with a booking card"): every booking card that is not cancelled, deleted or hidden */
    try{ for(const c of BOOK.values()) if(c && c.id && c.st !== 'canc' && !c.del && !(c.k && hid(c.k))) ids.add(c.id); }catch(e){}
    for(const id of [...ids]){ try{ const c = BOOK.get(id); if(!c || c.st === 'canc' || c.del) ids.delete(id); }catch(e){} }
    const doms = new Set();
    for(const r of ROWS){ const d = String(r.dom || '').toLowerCase(); if(d && d.indexOf(':') < 0 && !FREE.test(d) && !OWN.test(d)) doms.add(d); }
    UPD = {i: 0, n: ids.size + doms.size, stop: false, now: ''}; updPaint();
    let cardsDone = 0, agDone = 0, signin = false, fails = 0, booked = 0;
    /* 1.2.252: first my own Sent mail - an inquiry sent with her link gets her booking card (Email = In process) */
    try{ if(window.__illuCheckMine){ UPD.now = L('my sent mail', '내가 보낸 메일'); updPaint(); for(let w = 0; w < 20; w++){ const r = await window.__illuCheckMine(); if(r){ if(r.why === 'signin') signin = true; booked = (r.booked || []).length; break; } await sleep(1000); } } }catch(e){ fails++; }
    for(const id of ids){
      if(UPD.stop || signin) break;
      let c = null; try{ c = BOOK.get(id); }catch(e){} UPD.i++;
      if(!c){ continue; }
      UPD.now = (c.nm || '') + (c.ag ? ' · ' + c.ag : ''); updPaint();
      for(let w = 0; w < 120 && EM.busy && EM.busy(); w++) await sleep(500);      // a Collect someone started by hand
      /* 1.2.260 (user: "read only emails pertaining to the model cards and leave it read"): an unread email about her is opened (so its links can be read) and stays read */
      let r = null; try{ r = await EM.collect(c, true, {readNew: true}); }catch(e){ r = {ok: false}; }
      if(r && r.need === 'signin'){ signin = true; break; }
      if(r && r.ok) cardsDone++; else fails++;
    }
    if(!signin) for(const d of doms){
      if(UPD.stop) break;
      UPD.i++; UPD.now = d; updPaint();
      try{ if(window.__illuAgHwLoad && await window.__illuAgHwLoad(d, true)) agDone++; }catch(e){ fails++; }
    }
    /* 1.2.260: then the material in the emails is picked up */
    let af = null;
    if(!signin && !UPD.stop && window.__illuAutoFiles){ UPD.now = L('material links', '자료 링크'); updPaint(); for(let w = 0; w < 240 && window.__illuAutoFilesBusy && window.__illuAutoFilesBusy(); w++) await sleep(1000); try{ af = await window.__illuAutoFiles(null, auto ? 'morning' : 'update'); }catch(e){} }
    UPD.now = ''; updPaint();
    await loadHw(true);
    const [s1, r1] = count();
    const stopped = UPD.stop;
    UPD = null;
    const msg = signin ? L('Hiworks needs you to sign in once in the program.', 'Hiworks 로그인이 한 번 필요합니다.')
      : (stopped ? L('Stopped · ', '중지됨 · ') : '') + (booked ? L(booked + ' new booking ' + (booked === 1 ? 'card' : 'cards') + ' · ', '새 부킹 카드 ' + booked + '개 · ') : '') + L(cardsDone + ' cards and ' + agDone + ' agencies read · ' + Math.max(0, s1 - s0) + ' new sent · ' + Math.max(0, r1 - r0) + ' new received', '카드 ' + cardsDone + '개, 에이전시 ' + agDone + '곳 확인 · 새로 보낸 메일 ' + Math.max(0, s1 - s0) + ' · 새로 받은 메일 ' + Math.max(0, r1 - r0)) + (fails ? L(' · ' + fails + ' could not be read', ' · ' + fails + '개 읽지 못함') : '');
    const afMsg = af && (af.done || af.which || af.failed) ? ' · ' + L('material: ' + af.done + ' saved' + (af.which ? ', ' + af.which + ' need you' : '') + (af.failed ? ', ' + af.failed + ' failed' : ''), '자료: 저장 ' + af.done + (af.which ? ', 확인 필요 ' + af.which : '') + (af.failed ? ', 실패 ' + af.failed : '')) : '';
    UPDLAST = {at: new Date().toISOString(), msg: (auto ? L('Morning run · ', '아침 자동 실행 · ') : '') + msg + afMsg, signin}; try{ localStorage.setItem('illu.bemail.upd', JSON.stringify(UPDLAST)); }catch(e){}
    draw();
    return !signin;
  }
  window.__illuBEmailUpdate = update;

  /* ---------- remove / put back (1.2.252) ---------- */
  let UNDO = null;
  function undoBar(txt, id){
    document.querySelectorAll('.bemundo').forEach(x => x.remove()); clearTimeout(UNDO);
    const b = document.createElement('div'); b.className = 'bemundo'; b.setAttribute('role', 'status');
    b.innerHTML = '<span>' + E(txt) + '</span><button type="button" data-bemrestore="' + E(id) + '">' + L('Undo', '되돌리기') + '</button>';
    document.body.appendChild(b); UNDO = setTimeout(() => b.remove(), 8000);
  }
  function remove(r, mk){
    if(typeof DB === 'undefined' || !DB) return;
    const m = mk ? r.models.get(mk) : null; if(mk && !m) return;
    const id = hideId(r.key, mk || '');
    const seen = mk ? ((r.lastOf && r.lastOf.get(mk)) || 0) : (r.rowLast || 0);
    const v = {r: r.key, dom: String(r.dom || ''), mk: mk || '', k: m ? String(m.k || '') : '', nm: m ? nmOf(m) : '', ag: r.ag, by: me(), at: new Date().toISOString(), seen};
    HIDE.set(id, {id, r: v.r, dom: v.dom, mk: v.mk, k: v.k, nm: v.nm, ag: v.ag, by: v.by, at: Date.parse(v.at), seen}); DATAV++;
    if(!mk) ST.open.delete(r.key);
    drawList(); closePick();
    undoBar(mk ? L('Removed ' + v.nm + ' from ' + r.ag, v.nm + ' — ' + r.ag + ' 목록에서 삭제했습니다') : L('Removed ' + r.ag + ' from the list', r.ag + ' — 목록에서 삭제했습니다'), id);
    try{ DB.collection('bemhide').doc(id).set(v).catch(e => { console.warn('bemhide save', e); HIDE.delete(id); DATAV++; drawList(); }); }catch(e){ console.warn(e); }
  }
  function restore(id){
    document.querySelectorAll('.bemundo').forEach(x => x.remove());
    if(!HIDE.has(id)) return;
    const old = HIDE.get(id); HIDE.delete(id); DATAV++; drawList();
    try{ DB.collection('bemhide').doc(id).delete().catch(e => { console.warn('bemhide put back', e); HIDE.set(id, old); DATAV++; drawList(); }); }catch(e){ console.warn(e); }
  }
  window.__illuBEmailRemove = remove;

  /* ---------- which card ---------- */
  function closePick(){ document.querySelectorAll('.bempick,.bempickbg').forEach(x => x.remove()); document.querySelectorAll('.bemmc.on').forEach(x => x.classList.remove('on')); }
  function openModel(m){
    let inDir = false; try{ inDir = !!keyInfo(m.k); }catch(e){}
    if(!inDir){ try{ window.open(m.k, '_blank', 'noopener'); }catch(e){} return; }
    let ph = ''; try{ const id = PICS.get(nk(m.k)); if(id && typeof picURL === 'function') ph = picURL(id); }catch(e){}
    try{ if(window.illuPhotoFull) window.illuPhotoFull(ph, m.nm || '', m.k, nk(m.k), ''); }catch(e){ console.warn(e); }
  }
  function openBooking(m){ try{ if(window.__illuOpenBkCard) window.__illuOpenBkCard(m.bid); else if(typeof bvOpenFor === 'function') bvOpenFor(m.bid); }catch(e){ console.warn(e); } }
  function pick(btn){
    const r = ROWS.find(x => x.key === btn.dataset.bemmc); if(!r) return;
    const m = r.models.get(btn.dataset.bemmk); if(!m) return;
    if(!m.bid){ closePick(); openModel(m); return; }
    closePick(); btn.classList.add('on');
    let inDir = false; try{ inDir = !!keyInfo(m.k); }catch(e){}
    const canc = m.st === 'canc', done = m.st === 'done';
    const bg = document.createElement('div'); bg.className = 'bempickbg';
    const p = document.createElement('div'); p.className = 'bempick'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', L('Which card?', '어느 카드?'));
    p.innerHTML = '<h4>' + L('Which card do you want to open?', '어느 카드를 열까요?') + '<small>' + E(m.nm) + L(' has a booking card.', '님은 부킹 카드가 있습니다.') + '</small></h4>' +
      '<button type="button" class="bemopt" data-bemgo="bk"><span class="bemic">' + I.bk + '</span><span><b>' + L('Booking card', '부킹 카드') + '</b><span class="s">' + L('Profile, MD, stages, documents, email', '프로필, MD, 단계, 서류, 이메일') + '</span></span><span class="bemtg ' + (canc ? 'canc' : 'proc') + '">' + (canc ? L('Cancelled', '취소됨') : done ? L('Done', '완료') : L('In Booking', '부킹 중')) + '</span></button>' +
      '<button type="button" class="bemopt" data-bemgo="card"><span class="bemic">' + I.md + '</span><span><b>' + L('Model card', '모델 카드') + '</b><span class="s">' + (inDir ? L('Her card in the Directory · ', '디렉터리의 모델 카드 · ') + E(m.cardAg || r.ag) : L('Not in the Directory · opens her page on the agency’s site ↗', '디렉터리에 없음 · 에이전시 사이트의 모델 페이지 ↗')) + '</span></span></button>' +
      '<div class="bempickx"><button type="button" data-bemx>' + L('Cancel', '취소') + '</button></div>';
    document.body.appendChild(bg); document.body.appendChild(p);
    bg.addEventListener('click', closePick);
    p.addEventListener('click', e => { const o = e.target.closest('[data-bemgo]'); if(o){ closePick(); if(o.dataset.bemgo === 'bk') openBooking(m); else openModel(m); } else if(e.target.closest('[data-bemx]')) closePick(); });
    if(innerWidth > 760){
      const rc = btn.getBoundingClientRect(), W = 300, H = p.offsetHeight;
      let left = Math.min(Math.max(12, rc.left), innerWidth - W - 12), top = rc.bottom + 8;
      if(top + H > innerHeight - 12) top = Math.max(12, rc.top - H - 8);
      p.style.left = left + 'px'; p.style.top = top + 'px';
    }
    const f = p.querySelector('.bemopt'); if(f) f.focus({preventScroll: true});
  }
  window.__illuBEmailPickOpen = () => !!document.querySelector('.bempick');
  window.__illuBEmailPickClose = closePick;
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && document.querySelector('.bempick')){ e.preventDefault(); e.stopPropagation(); closePick(); } }, true);
  addEventListener('resize', () => { if(innerWidth > 760) closePick(); });
  document.addEventListener('scroll', e => { if(innerWidth > 760 && document.querySelector('.bempick') && !(e.target.closest && e.target.closest('.bempick'))) closePick(); }, {passive: true, capture: true});

  /* ---------- clicks ---------- */
  document.addEventListener('click', e => {
    const t = e.target; if(!t.closest) return;
    const tab = t.closest('[data-bemv]');
    if(tab){ e.preventDefault(); e.stopPropagation(); ST.v = tab.dataset.bemv; keep(); if(ST.v === 'mail') loadHw(true); draw(); return; }
    const ub = t.closest('.bemundo [data-bemrestore]'); if(ub){ e.preventDefault(); e.stopPropagation(); restore(ub.dataset.bemrestore); return; }
    if(!t.closest('#bem')) return;
    if(t.closest('.ctmail')) return;                          // Ask about another model: the program's own ✉ template window
    if(t.closest('a[href]')) return;                          // Reply in Hiworks (opens in the browser)
    const gb = t.closest('[data-bemget]'); if(gb){ e.preventDefault(); e.stopPropagation(); try{ window.__illuGetFiles && window.__illuGetFiles(gb.dataset.bemget, gb.dataset.bemcid); }catch(err){} return; }
    const up = t.closest('[data-bemupd]'); if(up){ e.preventDefault(); e.stopPropagation(); update(); return; }
    const dl = t.closest('[data-bemdel]'); if(dl){ e.preventDefault(); e.stopPropagation(); const mc = dl.closest('[data-bemmc]'); const r = mc && ROWS.find(x => x.key === mc.dataset.bemmc); if(r) remove(r, mc.dataset.bemmk); return; }
    const dr = t.closest('[data-bemdelrow]'); if(dr){ e.preventDefault(); e.stopPropagation(); const it = dr.closest('[data-bemrow]'); const r = it && ROWS.find(x => x.key === it.dataset.bemrow); if(r) remove(r, ''); return; }
    const rs = t.closest('[data-bemrestore]'); if(rs){ e.preventDefault(); e.stopPropagation(); restore(rs.dataset.bemrestore); return; }
    const sm = t.closest('.bemrem > summary'); if(sm){ e.preventDefault(); e.stopPropagation(); ST.remOpen = !ST.remOpen; const d = sm.parentElement; d.open = ST.remOpen; return; }
    const mc = t.closest('[data-bemmc]'); if(mc){ e.preventDefault(); e.stopPropagation(); pick(mc); return; }
    const w = t.closest('[data-bemwho]'); if(w){ e.stopPropagation(); ST.who = w.dataset.bemwho; keep(); draw(); return; }
    const f = t.closest('[data-bemf]'); if(f){ e.stopPropagation(); ST.f = f.dataset.bemf; draw(); return; }
    const tv = t.closest('[data-bemtv]'); if(tv){ e.stopPropagation(); const it = tv.closest('[data-bemrow]'); if(it){ ST.tv[it.dataset.bemrow] = tv.dataset.bemtv; drawList(); } return; }
    if(t.closest('.bemthread')) return;
    const it = t.closest('[data-bemrow]'); if(it && t.closest('.bemrw')){ e.stopPropagation(); const k = it.dataset.bemrow; if(ST.open.has(k)) ST.open.delete(k); else { ST.open.add(k); seenRow(ROWS.find(x => x.key === k)); try{ const tb = document.querySelector('.bemwrap [data-bemv="mail"]'); if(tb){ const w = document.createElement('div'); w.innerHTML = tabs(); const nb = w.querySelector('[data-bemv="mail"]'); if(nb) tb.innerHTML = nb.innerHTML; } }catch(err){} } drawList(); }
  }, true);
  document.addEventListener('keydown', e => { if((e.key === 'Enter' || e.key === ' ') && e.target.classList && (e.target.classList.contains('bemrw') || e.target.classList.contains('bemdel'))){ e.preventDefault(); e.stopPropagation(); e.target.click(); } }, true);
  /* a photo that does not load leaves her initials (the page's rules do not allow onerror= in the HTML) */
  document.addEventListener('error', e => { const im = e.target; if(im && im.tagName === 'IMG' && im.parentElement && im.parentElement.classList.contains('bemph')) im.remove(); }, true);
  document.addEventListener('input', e => { const q = e.target.closest && e.target.closest('[data-bemq]'); if(!q) return; ST.q = q.value; drawList(); });
  /* new emails on a booking card (Collect from Hiworks, the sent-mail check): redraw while the board is showing */
  let lastSig = '';
  setInterval(() => { if(ST.v !== 'mail' || !document.getElementById('bem')) return; let s = ''; try{ let n = 0; for(const c of BOOK.values()) n += c && c.em && Array.isArray(c.em.list) ? c.em.list.length : 0; s = BOOK.size + ':' + n; }catch(e){} if(s !== lastSig){ const first = !lastSig; lastSig = s; if(!first) drawList(); } }, 5000);

  const st = document.createElement('style');
  st.textContent = `
.bemwrap{min-width:0}
.bemsw{display:flex;align-items:center;gap:4px;border-bottom:1px solid var(--line);margin:0 0 12px;overflow-x:auto;scrollbar-width:none}
.bemsw button{display:flex;align-items:center;gap:8px;border:0;background:none;padding:11px 14px;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;white-space:nowrap;color:var(--dim);font:inherit;font-size:14px}
.bemsw button svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2}
.bemsw button[aria-selected="true"]{color:var(--ink,var(--fg));font-weight:600;border-bottom-color:var(--acc)}
.bemsw button s{text-decoration:none;font-size:11px;background:var(--chip,rgba(0,0,0,.05));color:var(--dim);border-radius:6px;padding:1px 6px;font-variant-numeric:tabular-nums}
.bemsw button[aria-selected="true"] s{background:var(--accs,rgba(109,37,97,.1));color:var(--acc)}
.bemsw .bemdot{width:7px;height:7px;border-radius:50%;background:#2e8b57}
.bem{container-type:inline-size;min-width:0}
.bemtools{display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px;margin:4px 0 10px}
.bemseg{display:inline-flex;gap:2px;background:var(--chip,rgba(0,0,0,.04));border:1px solid var(--line);border-radius:11px;padding:3px}
.bemseg button{border:0;background:none;padding:6px 11px;border-radius:8px;font:inherit;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;color:inherit}
.bemseg button s{text-decoration:none;font-size:11px;color:var(--dim);font-variant-numeric:tabular-nums}
.bemseg button[aria-pressed="true"]{background:var(--surf,#fff);box-shadow:0 1px 3px rgba(40,20,40,.12);font-weight:600}
.bemseg button[aria-pressed="true"] s{color:var(--acc)}
.bemsearch{display:flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:10px;padding:6px 11px;min-width:200px;flex:0 1 260px;color:var(--dim);background:var(--surf,#fff)}
.bemsearch svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;flex:none}
.bemsearch input{border:0;outline:0;background:none;width:100%;color:inherit;font:inherit;font-size:13px}
.bemsp{flex:1}
.bemtot{display:flex;gap:14px;font-size:12.5px;color:var(--dim);white-space:nowrap}
.bemtot b{color:var(--ink,var(--fg));font-variant-numeric:tabular-nums}
.bemhint{font-size:12px;color:var(--dim);display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin:0 0 10px}
.bemhtxt{flex:1 1 240px;min-width:0}
.bemupdmsg{margin-left:auto;display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap}
.bemupdmsg:empty{display:none}
.bemupd{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--acc);color:var(--acc);background:var(--surf,#fff);border-radius:999px;padding:6px 13px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap}
.bemupd svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.2}
.bemupd:hover{background:var(--accs,rgba(109,37,97,.08))}
.bemupd.busy{background:var(--acc);color:#fff}.bemupd.busy svg{animation:bemspin 1s linear infinite}
@keyframes bemspin{to{transform:rotate(360deg)}}
.bemlive{width:7px;height:7px;border-radius:50%;background:#2e8b57;box-shadow:0 0 0 3px rgba(46,139,87,.15);flex:none}
.bemlist{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--surf,#fff)}
.bemlh,.bemrw{display:grid;grid-template-columns:minmax(170px,1.1fr) minmax(250px,2.4fr) 52px 70px 96px 164px 22px;gap:12px;align-items:center;padding:0 14px}
.bemlh{height:36px;background:var(--bg2,rgba(0,0,0,.02));border-bottom:1px solid var(--line);font-size:10.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--dim)}
.bemlh .r{text-align:right}
.bemit{border-bottom:1px solid var(--line)}.bemit:last-child{border-bottom:0}
.bemit.bemflash>.bemrw{animation:bemflash 1.8s ease}
@keyframes bemflash{0%,45%{box-shadow:inset 0 0 0 2px var(--acc)}100%{box-shadow:inset 0 0 0 0 transparent}}
.bemrw{min-height:60px;padding-top:10px;padding-bottom:10px;cursor:pointer}
.bemrw:hover,.bemit.open>.bemrw{background:var(--bg2,rgba(0,0,0,.02))}
.bemrw:focus-visible{outline:2px solid var(--acc);outline-offset:-2px}
.bemagc{min-width:0}
.bemagn{font-weight:700;font-size:13.5px;display:flex;align-items:center;gap:7px;min-width:0}
.bemagn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bemnew{font-style:normal;font-size:9.5px;font-weight:800;letter-spacing:.06em;color:#fff;background:var(--acc);border-radius:4px;padding:2px 5px;flex:none}
.bemags{font-size:11.5px;color:var(--dim);margin-top:3px;display:flex;align-items:center;gap:5px;min-width:0}
.bemaddr{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bemwho{display:inline-grid;place-items:center;width:17px;height:17px;border-radius:50%;background:var(--accs,rgba(109,37,97,.1));color:var(--acc);font-size:9px;font-weight:700;flex:none}
.bemnote{font-size:11px;color:#b7791f;margin-top:3px}
.bemmodels{display:flex;flex-wrap:wrap;gap:8px;min-width:0}
.bemmc{display:flex;flex-direction:column;width:76px;flex:none;border:0;background:none;padding:0;text-align:left;cursor:pointer;color:inherit;font:inherit}
.bemph{position:relative;display:block;width:76px;aspect-ratio:3/4;border-radius:9px;overflow:hidden;background:linear-gradient(160deg,#5b4a58,#231b22);box-shadow:0 1px 3px rgba(40,20,40,.18);transition:transform .15s,box-shadow .15s}
.bemph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 20%;z-index:1}
.bemph i{position:absolute;inset:0;display:grid;place-items:center;font-style:normal;font-size:15px;font-weight:800;color:rgba(255,255,255,.6)}
.bemmc:hover .bemph,.bemmc.on .bemph,.bemmc:focus-visible .bemph{transform:translateY(-2px);box-shadow:0 0 0 2px var(--acc),0 6px 14px rgba(40,20,40,.22)}
.bemmc:focus-visible{outline:0}
.bembk{position:absolute;right:4px;top:4px;z-index:2;display:grid;place-items:center;width:17px;height:17px;border-radius:5px;background:var(--acc);color:#fff}
.bembk svg{width:10px;height:10px;fill:none;stroke:currentColor;stroke-width:2.6}
.bembk.canc{background:#8b8189}
.bemmn{margin-top:5px;font-size:11.5px;font-weight:600;line-height:1.25;width:76px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.bemmh{font-size:10.5px;color:var(--dim)}
.bemdel{position:absolute;left:4px;top:4px;z-index:3;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:rgba(20,10,20,.62);color:#fff;opacity:0;transition:opacity .15s,background .15s;cursor:pointer}
.bemdel svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2.8}
.bemmc:hover .bemdel,.bemmc:focus-within .bemdel{opacity:1}
.bemdel:hover,.bemdel:focus-visible{background:#b3261e;outline:0;opacity:1}
@media (hover:none){.bemdel{opacity:1;width:22px;height:22px}}
.bemdelrow{display:inline-flex;align-items:center;gap:5px;border-color:var(--line);color:var(--dim)}
.bemdelrow svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.4}
.bemdelrow:hover{border-color:#b3261e;color:#b3261e}
.bemrem{margin-top:10px;font-size:12.5px;color:var(--dim)}
.bemrem summary{cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:4px 2px;list-style:none}
.bemrem summary::-webkit-details-marker{display:none}
.bemrem summary::before{content:"▸";font-size:10px;transition:transform .15s}.bemrem[open] summary::before{transform:rotate(90deg)}
.bemrem summary s{text-decoration:none;font-size:11px;background:var(--chip,rgba(0,0,0,.05));border-radius:6px;padding:1px 6px}
.bemremls{border:1px solid var(--line);border-radius:12px;background:var(--surf,#fff);margin-top:6px}
.bemremit{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:9px 12px;border-bottom:1px solid var(--line)}.bemremit:last-child{border-bottom:0}
.bemremn{flex:1 1 220px;min-width:0;color:var(--ink,var(--fg));overflow-wrap:anywhere}
.bemremw{font-size:11.5px;white-space:nowrap}
.bemundo{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(20px + env(safe-area-inset-bottom,0px));z-index:9999;display:flex;align-items:center;gap:14px;max-width:calc(100vw - 32px);background:#2a1f29;color:#fff;border-radius:12px;padding:10px 12px 10px 16px;font-size:13px;box-shadow:0 10px 28px rgba(20,10,20,.3)}
.bemundo span{min-width:0;overflow-wrap:anywhere}
.bemundo button{border:0;background:none;color:#e9b8df;font:inherit;font-weight:700;cursor:pointer;padding:4px 6px;white-space:nowrap}
.bemmc.unc .bemph{outline:1.5px dashed var(--faint,#b3aab1);outline-offset:2px;filter:saturate(.6) brightness(.95)}
.bemmeta{display:contents}
.bemnum{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
.bemnum.z{color:var(--faint,#b3aab1);font-weight:500}.bemnum.g{color:#2e8b57}
.bemlast{font-size:12.5px}.bemlast small{display:block;color:var(--dim);font-size:11px}
.bemst{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;border-radius:999px;padding:4px 10px;white-space:nowrap;justify-self:start}
.bemst::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
.bemst.replied{background:rgba(46,139,87,.12);color:#2e8b57}
.bemst.waiting{background:rgba(183,121,31,.13);color:#b7791f}
.bemst.none,.bemst.opened{background:var(--chip,rgba(0,0,0,.05));color:var(--dim)}
.bemchev{color:var(--dim);transition:transform .18s}.bemchev svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2}
.bemit.open .bemchev{transform:rotate(90deg)}
.bemthread{padding:4px 14px 14px;background:var(--bg2,rgba(0,0,0,.02))}
.bemthd{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin:2px 0 10px}
.bembtn{border:1px solid var(--acc);color:var(--acc);background:var(--surf,#fff);border-radius:999px;padding:6px 12px;font-size:12px;cursor:pointer;white-space:nowrap;text-decoration:none;display:inline-block}
.bembtn.fill{background:var(--acc);color:#fff}
.bemthd .cts.bemcts{display:inline;border:0;background:none;padding:0;margin:0;box-shadow:none;border-radius:0}
/* the program's round ✉ style (.ctmail) must not shape this one */
.bemthd a.ctmail.bembtn{appearance:none;width:auto;height:auto;border-radius:999px;display:inline-block;padding:6px 12px;font-size:12px;line-height:normal;background:var(--acc);color:#fff;border:1px solid var(--acc);opacity:1;pointer-events:auto;text-decoration:none;white-space:nowrap}
.bemthd a.ctmail.bembtn:hover{filter:brightness(1.08);background:var(--acc)}
.bemop{font-size:12.5px;color:var(--dim);margin:0 0 8px;line-height:1.5}
.bemmsgs{display:flex;flex-direction:column;gap:6px}
.bemmsg{display:grid;grid-template-columns:84px 112px minmax(0,1fr) auto;gap:12px;align-items:center;background:var(--surf,#fff);border:1px solid var(--line);border-radius:10px;padding:9px 12px;font-size:12.5px}
.bemmsg.in{border-left:3px solid #2e8b57}.bemmsg.out{border-left:3px solid var(--line)}
.bemdir{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.bemdir svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.4}
.bemmsg.in .bemdir{color:#2e8b57}.bemmsg.out .bemdir{color:var(--dim)}
.bemwhen{color:var(--dim);font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}
.bemtxt{min-width:0;line-height:1.45;overflow-wrap:anywhere}
.bematt{color:var(--dim);font-size:11.5px;white-space:nowrap;display:flex;align-items:center;gap:4px}
.bematt svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2}
.bemlks{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px}
.bemlk{display:flex;align-items:center;flex-wrap:wrap;gap:6px 8px;border:1px solid var(--line);border-radius:8px;padding:5px 6px 5px 9px;font-size:12px;background:var(--bg2,rgba(0,0,0,.02));max-width:100%}
.bemlk b{font-weight:700;white-space:nowrap}
.bemlkst{color:var(--dim);min-width:0;overflow-wrap:anywhere}
.bemlk.ok{border-color:rgba(46,139,87,.45)}.bemlk.ok .bemlkst{color:#2e8b57}
.bemlk.ask{border-color:rgba(194,120,3,.5)}.bemlk.ask .bemlkst{color:#b26b00}
.bemlk.bad{border-color:rgba(192,57,43,.45)}.bemlk.bad .bemlkst{color:#c0392b}
.bemlk .bembtn{padding:3px 9px;font-size:11.5px}
.bemnewl{margin:3px 0 2px}
.bemnewm{font-style:normal;display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:800;color:#fff;background:#c2410c;border-radius:9px;padding:2px 8px;flex:none;white-space:nowrap}
.bemnewm svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2.2}
.bemit.hasnew>.bemrw{box-shadow:inset 3px 0 0 #c2410c}
.bemsw .bemnewn{font-weight:800;font-size:10.5px;color:#fff;background:#c2410c;border-radius:9px;padding:1px 7px;margin-left:2px}
.bemempty{padding:30px 16px;color:var(--dim);text-align:center}
.bempickbg{position:fixed;inset:0;z-index:9998}
.bempick{position:fixed;z-index:9999;width:300px;background:var(--surf,#fff);color:var(--ink,inherit);border:1px solid var(--line);border-radius:14px;box-shadow:0 12px 32px rgba(30,10,30,.18);padding:12px}
.bempick h4{margin:2px 4px 8px;font-size:13px;font-weight:600}
.bempick h4 small{display:block;font-weight:400;color:var(--dim);font-size:11.5px;margin-top:2px}
.bemopt{display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:1px solid var(--line);background:var(--surf,#fff);border-radius:11px;padding:10px 11px;cursor:pointer;margin-top:7px;font:inherit;color:inherit}
.bemopt:hover,.bemopt:focus-visible{border-color:var(--acc);background:var(--accs,rgba(109,37,97,.08));outline:0}
.bemic{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:var(--accs,rgba(109,37,97,.1));color:var(--acc);flex:none}
.bemic svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9}
.bemopt b{display:block;font-size:13px}.bemopt .s{display:block;font-size:11.5px;color:var(--dim);margin-top:1px}
.bemtg{margin-left:auto;font-size:10.5px;font-weight:700;border-radius:5px;padding:2px 6px;white-space:nowrap}
.bemtg.proc{background:rgba(46,139,87,.12);color:#2e8b57}.bemtg.canc{background:var(--chip,rgba(0,0,0,.05));color:var(--dim)}
.bempickx{display:flex;justify-content:flex-end;margin-top:8px}
.bempickx button{border:0;background:none;color:var(--dim);font:inherit;font-size:12px;cursor:pointer;padding:4px 6px}
@container (max-width:900px){
  .bemlh{display:none}
  .bemrw{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"ag chev" "mo mo" "meta meta";gap:8px 10px;padding:12px 14px}
  .bemagc{grid-area:ag}.bemmodels{grid-area:mo}.bemchev{grid-area:chev;align-self:start}
  .bemmeta{grid-area:meta;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-size:12px}
  .bemnum{text-align:left}.bemnum::after{content:attr(data-l);font-weight:500;color:var(--dim);margin-left:4px}
  .bemlast small{display:inline;margin-left:4px}
}
@container (max-width:560px){
  .bemmodels{flex-wrap:nowrap;overflow-x:auto;scroll-snap-type:x proximity;scroll-padding-inline:14px;margin:0 -14px;padding:2px 14px 4px;scrollbar-width:none}
  .bemmodels::-webkit-scrollbar{display:none}
  .bemmc{scroll-snap-align:start}
  .bemsearch{flex:1 1 100%;min-width:0}
  .bemtools .bemsp{display:none}
  .bemtot{width:100%;flex-wrap:wrap;gap:4px 14px}
  .bemmsg{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"dir when" "txt txt" "att att" "lk lk";gap:4px 10px}
  .bemdir{grid-area:dir}.bemwhen{grid-area:when;text-align:right}.bemtxt{grid-area:txt}.bematt{grid-area:att}.bemlks{grid-area:lk}
  .bemthread{padding:4px 10px 12px}
}
@media (max-width:760px){
  .bempickbg{background:rgba(20,10,20,.35)}
  .bempick{left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));top:auto;width:auto;padding:14px}
}`;
  document.head.appendChild(st);
})();
