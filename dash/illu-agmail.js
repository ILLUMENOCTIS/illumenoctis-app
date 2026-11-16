/* 1.2.204 (user, 16 Nov 2026, approved demo "Agency Email History"): "I've already sent out an email to this agency
   regarding a different model. I need some sort of marker that will show me when I contacted them in regards to whichever
   model from the past."
   - The agency's contact window gets "Emailed before": every email the team sent to the agency, newest first - the date,
     who sent it, which models it was about, to which address, and whether they replied.
   - Under each contact's address, the last email sent to that person.
   - Read from the emails already on the booking cards (their Email tab); nothing new is stored, no AI is used.
   - An agency with two web addresses (Wave Management / The Wall: wavemanagement.it and thewallmodels.com) counts as one:
     the web addresses of its saved contacts belong to it.
   The "Which email?" window (illu-ext.js) uses the same history to mark the models already emailed about. */
(function(){
  'use strict';
  if(window.__illuAgHist) return;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
  const lc = s => String(s || '').trim().toLowerCase();
  const FREE = /^(gmail|googlemail|naver|daum|hanmail|kakao|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|mac|aol|gmx|mail|yandex|qq|163|126|foxmail|proton|protonmail)\./i;
  const MINE = /@mdient\.com$/i;
  const hostOf = a => lc(a).split('@')[1] || '';
  const domOfCard = c => lc(c.agd || (/^https?:/i.test(c.k || '') ? c.k : '')).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[\/?#].*$/, '');
  const dkey = dt => { const m = String(dt || '').match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/); return m ? m[3] + m[2] + m[1] + (m[4] || '00').padStart(2, '0') + (m[5] || '00') : ''; };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = dt => { const m = String(dt || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/); if(!m) return ''; return (+m[1]) + ' ' + MON[+m[2] - 1] + (+m[3] !== new Date().getFullYear() ? ' ' + m[3] : ''); };
  const AGL = () => (typeof AG !== 'undefined' && Array.isArray(AG)) ? AG : [];
  const contactsOf = dom => { try{ return ((typeof CONTACTS !== 'undefined' && CONTACTS.get(dom)) || []).filter(c => c && c.e && /@/.test(c.e)); }catch(e){ return []; } };
  /* the web addresses of one agency: its own, and the ones its saved contacts write from (not free mail, not ours) */
  function doms(dom){
    const d = lc(dom), out = new Set(d ? [d] : []);
    for(const c of contactsOf(dom)){ const h = hostOf(c.e).replace(/^www\./, ''); if(h && !FREE.test(h) && !MINE.test('@' + h)) out.add(h); }
    return [...out];
  }
  const inDoms = (a, D) => { const h = hostOf(a); return !!h && D.some(d => h === d || h.endsWith('.' + d)); };
  /* the people: who sent it - the program records it when an email goes out from it; else "(Paul)" in the sender name */
  const pn = id => { try{ const r = PEOPLE.get(id) || (typeof GONEID !== 'undefined' && GONEID.get(id)); return r ? r.n : ''; }catch(e){ return ''; } };
  function whoOf(c, e){
    const by = c.emby && c.emby[e.k]; if(by) return pn(by) || '';
    const m = String(e.name || '').match(/\(([^)]{1,30})\)\s*$/); return m ? m[1].trim() : '';
  }
  const cards = () => { try{ return typeof BOOK !== 'undefined' ? [...BOOK.values()].filter(Boolean) : []; }catch(e){ return []; } };
  const EM = () => window.__illuEmail || {};
  const emOf = c => (EM().emOf ? EM().emOf(c) : ((c.em && Array.isArray(c.em.list)) ? c.em : {list: []}));
  const thread = s => EM().threadKey ? EM().threadKey(s) : lc(s).replace(/^((re|fw|fwd)\s*:\s*)+/i, '');
  const excl = (c, e) => { try{ return !!(EM().excluded && EM().excluded(c, e)); }catch(er){ return false; } };
  /* 1.2.205: the team's mail with the agency in Hiworks (not only what is on booking cards). The PC program looks it up
     when the agency's window opens (at most every 15 minutes) and keeps it in docs aghist/<domain> so phones show it too:
     {s: [{no, dt, to, subject, ms: [{key, nm}], who, read}], i: [{no, dt, from, subject}], at}. The models of an email are
     found by her page link in the text, or her full name - never a first name alone (two girls can share one). */
  const HW = new Map(), BUSY = new Set(), TRIED = new Map();
  const dbOk = () => { try{ return typeof DB !== 'undefined' && DB && typeof ME !== 'undefined' && ME; }catch(e){ return false; } };
  const nk = u => { try{ return normKey(u); }catch(e){ return u; } };
  const reEsc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function modelsIn(e, dom){
    const all = (window.__illuAgModels ? window.__illuAgModels(dom) : []).map(m => ({key: m.key, nm: m.nm}));
    for(const c of cards()) if(c.k) all.push({key: nk(c.k), nm: c.nm || ''});
    const byKey = new Map(all.map(m => [m.key, m]));
    const out = new Map();
    for(const u of e.links || []){ const m = byKey.get(nk(u)); if(m) out.set(m.key, m); }
    const txt = ' ' + String(e.subject || '') + '\n' + String(e.text || '') + ' ';
    const keysOf = new Map(); for(const m of all){ const n = lc(m.nm).replace(/\s+/g, ' '); if(!keysOf.has(n)) keysOf.set(n, new Set()); keysOf.get(n).add(m.key); }
    for(const m of all){
      const nm = String(m.nm || '').trim(); if(out.has(m.key) || nm.split(/\s+/).length < 2) continue;      // full names only
      if(keysOf.get(lc(nm).replace(/\s+/g, ' ')).size > 1) continue;                                        // two models share this name: never guess
      if(new RegExp('(^|[^\\p{L}])' + reEsc(nm) + '(?![\\p{L}])', 'iu').test(txt)) out.set(m.key, m);
    }
    return [...out.values()].map(m => ({key: m.key, nm: m.nm}));
  }
  async function hwLoad(dom){
    if(!dom || BUSY.has(dom) || !dbOk()) return; BUSY.add(dom);
    try{
      let d = HW.get(dom);
      if(!d){ try{ const g = await DB.doc('aghist/' + dom).get(); d = g && g.exists ? g.data() : null; }catch(e){} d = d || {s: [], i: [], at: ''}; HW.set(dom, d); soon(); }
      const can = window.illu && window.illu.hiworksAgency && !window.illu.web;
      if(!can || (d.at && Date.now() - Date.parse(d.at) < 15 * 60e3) || Date.now() - (TRIED.get(dom) || 0) < 15 * 60e3) return;
      TRIED.set(dom, Date.now());
      const addrs = contactsOf(dom).map(c => lc(c.e)).filter(a => !MINE.test(a)), D = doms(dom);
      const have = (d.s || []).filter(x => x.read).map(x => String(x.no));
      const r = await window.illu.hiworksAgency(addrs, D, ME, have);
      if(!r || !r.ok) return;
      const old = new Map((d.s || []).map(x => [String(x.no), x]));
      const s = r.sent.map(e => {
        const o = old.get(String(e.no));
        if(o && o.read && !e.read) return o;
        const m = String(e.name || '').match(/\(([^)]{1,30})\)\s*$/);
        return {no: e.no, dt: e.dt, to: e.to.concat(e.cc || []).filter(a => !MINE.test(a)), subject: e.subject, ms: e.read ? modelsIn(e, dom) : (o ? o.ms : []), who: m ? m[1].trim() : '', read: e.read ? 1 : 0};
      });
      d = {s, i: r.ins.map(x => ({no: x.no, dt: x.dt, from: x.from, subject: x.subject})), at: r.at, by: ME};
      HW.set(dom, d); soon();
      try{ await DB.doc('aghist/' + dom).set(d); }catch(e){ console.error('aghist save', e); }
    }catch(e){ console.error('aghist', e); }
    finally{ BUSY.delete(dom); }
  }
  window.__illuAgHwLoad = hwLoad;
  /* the history of one agency */
  function hist(dom){
    const D = doms(dom), a = AGL().find(x => lc(x.domain) === lc(dom)), agn = lc(a && a.name);
    const addrs = new Set(contactsOf(dom).map(c => lc(c.e)));
    const mine = cards().filter(c => {
      const cd = domOfCard(c); if(cd && D.some(d => cd === d || cd.endsWith('.' + d))) return true;
      if(agn && lc(c.ag) === agn) return true;
      return emOf(c).list.some(e => e.dir === 'in' && (addrs.has(lc(e.addr)) || inDoms(e.addr, D)));
    });
    const by = new Map(), ins = [];
    for(const c of mine){
      const key = c.k || ('bid:' + c.id);
      for(const e of emOf(c).list){
        if(!e || excl(c, e)) continue;
        if(e.dir === 'in'){ if(!MINE.test(lc(e.addr))) ins.push({t: thread(e.subject), d: dkey(e.dt), dt: e.dt}); continue; }
        const to = (e.to || []).map(lc).filter(x => !MINE.test(x));
        if(to.length && !to.some(x => addrs.has(x) || inDoms(x, D))) continue;            // written to someone else
        let r = by.get(e.k);
        if(!r){ r = {k: e.k, dt: e.dt, d: dkey(e.dt), to, subject: e.subject || '', t: thread(e.subject), ms: [], who: ''}; by.set(e.k, r); }
        if(!r.ms.some(m => m.key === key)) r.ms.push({key, nm: c.nm || ''});
        if(!r.who) r.who = whoOf(c, e);
      }
    }
    /* 1.2.205: and what Hiworks has */
    const hw = HW.get(dom);
    if(hw){
      for(const x of hw.i || []) ins.push({t: thread(x.subject), d: dkey(x.dt), dt: x.dt});
      for(const x of hw.s || []){
        const k = 'hw:' + x.no, to = (x.to || []).map(lc).filter(a => !MINE.test(a));
        if(to.length && !to.some(a => addrs.has(a) || inDoms(a, D))) continue;
        let r = by.get(k);
        if(!r){ r = {k, dt: x.dt, d: dkey(x.dt), to, subject: x.subject || '', t: thread(x.subject), ms: [], who: x.who || ''}; by.set(k, r); }
        for(const m of x.ms || []) if(!r.ms.some(y => y.key === m.key)) r.ms.push({key: m.key, nm: m.nm});
        if(!r.who && x.who) r.who = x.who;
        if(!r.to.length) r.to = to;
      }
    }
    const list = [...by.values()].sort((p, q) => q.d.localeCompare(p.d));
    /* a reply belongs to the newest email of the same thread sent before it (many inquiries share one subject line) */
    for(const r of list) r.rep = '';
    for(const i of ins.slice().sort((p, q) => p.d.localeCompare(q.d))){
      if(!i.t) continue;
      const r = list.filter(x => x.t === i.t && x.d < i.d).sort((p, q) => q.d.localeCompare(p.d))[0];
      if(r && !r.rep) r.rep = i.dt;
    }
    const byAddr = new Map(), byModel = new Map();
    for(const r of list){ for(const t of r.to) if(!byAddr.has(t)) byAddr.set(t, r); for(const m of r.ms) if(!byModel.has(m.key)) byModel.set(m.key, r); }
    const cardOf = new Map(mine.map(c => [c.k || ('bid:' + c.id), c]));
    return {doms: D, list, byAddr, byModel, cards: mine, cardOf};
  }
  window.__illuAgHist = hist;
  window.__illuAgDoms = doms;
  window.__illuAgDay = day;
  const cap = s => String(s || '').toLowerCase().replace(/(^|[\s\-'])(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
  const short = (ms, subj) => ms.length ? cap(ms[0].nm) + (ms.length > 1 ? ' +' + (ms.length - 1) : '') : String(subj || '').slice(0, 40);
  const COLS = ['#E9C6DE', '#C9D6F2', '#CDE8D2', '#F2DCC2', '#DCD3F0', '#F0CFCF'];
  const col = s => { let h = 0; for(const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return COLS[h % COLS.length]; };
  /* ---- the contact window ---- */
  let OPENALL = false;
  function paint(){
    const m = document.getElementById('ctmodal'); if(!m || m.dataset.on !== '1') return;
    const box = m.querySelector('.ctbox .cts[data-dom]'); if(!box) return;
    const dom = box.dataset.dom; hwLoad(dom);
    const H = hist(dom);
    const body = m.querySelector('.ctbbody');
    let st = body.querySelector('.illuhist');
    const sig = dom + '|' + OPENALL + '|' + H.list.map(r => r.k + r.rep + r.ms.length + r.who).join(',');
    if(!H.list.length){ if(st) st.remove(); }
    else if(!st || st.dataset.sig !== sig){
      const show = OPENALL ? H.list : H.list.slice(0, 5);
      const html = '<h4>Emailed before <em>· ' + H.list.length + (H.list.length === 1 ? ' email' : ' emails') + ' · last ' + E(day(H.list[0].dt)) + '</em></h4><div class="ihl">' +
        show.map(r => '<span class="ihdt">' + E(day(r.dt)) + '</span>' +
          (r.who ? '<span class="ihwho" style="--c:' + col(r.who) + '" title="' + E(r.who) + '">' + E(r.who.charAt(0).toUpperCase()) + '</span>' : '<span class="ihwho none" title="Sent from booking1@mdient.com">·</span>') +
          '<span class="ihm">' + (r.ms.length ? '<b>' + E(r.ms.map(x => String(x.nm).toUpperCase()).join(', ')) + '</b>' : '<i title="No model named in this email">' + E(r.subject || '(no subject)') + '</i>') + (r.to.length ? ' <span>· to ' + E(r.to.join(', ')) + '</span>' : '') + '</span>' +
          '<span class="ihst ' + (r.rep ? 'rep' : 'wait') + '">' + (r.rep ? 'Replied ' + E(day(r.rep)) : 'No reply yet') + '</span>').join('') + '</div>' +
        (H.list.length > 5 ? '<button type="button" class="ihmore" data-ihmore>' + (OPENALL ? 'Show fewer' : 'Show all ' + H.list.length) + '</button>' : '');
      if(!st){ st = document.createElement('section'); st.className = 'illuhist'; st.setAttribute('aria-label', 'Emailed before'); body.prepend(st); }
      st.innerHTML = html; st.dataset.sig = sig;
    }
    /* under each address: the last email sent to that person */
    box.querySelectorAll('.ctrow').forEach(row => {
      const inp = row.querySelector('.ctf-e'); const a = lc(inp && inp.value);
      const r = a ? H.byAddr.get(a) : null;
      let el = row.querySelector('.illuctl');
      if(!r){ if(el) el.remove(); return; }
      const t = day(r.dt) + ' · ' + short(r.ms, r.subject) + ' · ' + (r.rep ? 'replied' : 'no reply');
      if(!el){ el = document.createElement('span'); el.className = 'illuctl'; row.appendChild(el); }
      if(el.textContent !== t){ el.textContent = t; el.classList.toggle('wait', !r.rep); el.title = (r.who ? r.who + ' emailed' : 'Emailed') + ' about ' + r.ms.map(x => x.nm).join(', ') + ' on ' + day(r.dt); }
    });
  }
  let T = 0; const soon = () => { if(T) return; T = setTimeout(() => { T = 0; try{ paint(); }catch(e){ console.error(e); } }, 30); };
  (function watch(){
    const m = document.getElementById('ctmodal'); if(!m){ setTimeout(watch, 800); return; }
    new MutationObserver(muts => { if(muts.some(x => [...x.addedNodes].some(n => n.nodeType === 1 && !(n.classList && (n.classList.contains('illuctl') || n.classList.contains('illuhist')))))) soon(); }).observe(m, {childList: true, subtree: true});
    new MutationObserver(() => { OPENALL = false; soon(); }).observe(m, {attributes: true, attributeFilter: ['data-on']});
    m.addEventListener('input', e => { if(e.target.closest('.ctf-e')) soon(); });
    m.addEventListener('click', e => { if(e.target.closest('[data-ihmore]')){ OPENALL = !OPENALL; soon(); } });
  })();
  window.__illuAgHistPaint = soon;
  /* the person who sends an email from the program is kept with the email (Hiworks shows only booking1@) */
  window.__illuEmBy = (c, no) => { try{ const me = typeof ME !== 'undefined' ? ME : ''; if(!c || !no || !me) return; c.emby = Object.assign({}, c.emby || {}, {['hw:' + String(no).replace(/^.*\//, '')]: me}); }catch(e){} };
  const st = document.createElement('style');
  st.textContent = `
.illuhist{border:1px solid var(--line);border-radius:10px;padding:10px 12px 11px;margin:0 0 14px;background:var(--surf)}
.illuhist h4{margin:0 0 8px;font-family:var(--mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);font-weight:600}
.illuhist h4 em{font-style:normal;letter-spacing:.02em;text-transform:none;font-family:var(--sans);font-size:11.5px;color:var(--faint)}
.illuhist .ihl{display:grid;grid-template-columns:auto auto minmax(0,1fr) auto;gap:6px 10px;align-items:center;font-size:12.5px}
.illuhist .ihdt{font-family:var(--mono);font-size:11px;color:var(--mut);white-space:nowrap}
.illuhist .ihwho{width:20px;height:20px;border-radius:50%;background:var(--c);color:#3a2a38;font-size:10px;font-weight:700;display:grid;place-items:center}
.illuhist .ihwho.none{background:var(--line2,#eee);color:var(--faint)}
.illuhist .ihm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.illuhist .ihm b{font-weight:650;letter-spacing:.02em}.illuhist .ihm i{font-style:normal;color:var(--ink2,var(--ink))}.illuhist .ihm span{color:var(--faint)}
.illuhist .ihst{font-size:11px;font-weight:600;border-radius:999px;padding:2px 9px;white-space:nowrap}
.illuhist .ihst.rep{background:#E3F4E8;color:#23794A}.illuhist .ihst.wait{background:#FBEFD9;color:#9A5B12}
.illuhist .ihmore{margin-top:8px;border:0;background:none;color:var(--acc);font:600 12px var(--sans);cursor:pointer;padding:2px 0}
.ctrow .illuctl{grid-column:4;grid-row:2;padding-left:9px;font-size:11px;color:#23794A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:-2px}
.ctrow .illuctl.wait{color:#9A5B12}
@media (max-width:820px){.ctrow .illuctl{grid-column:2/4;grid-row:4;padding-left:2px;margin-top:0}.ctrow:has(.illuctl) .ctf-p{grid-row:5}
.illuhist .ihl{grid-template-columns:auto auto minmax(0,1fr)}.illuhist .ihst{grid-column:3;justify-self:start;margin-top:-4px}}
html[data-theme="dim"] .illuhist .ihst.rep,html[data-theme="dark"] .illuhist .ihst.rep{background:#1E3324;color:#8FD3A4}html[data-theme="dim"] .illuhist .ihst.wait,html[data-theme="dark"] .illuhist .ihst.wait{background:#3A2E18;color:#E7B76A}html[data-theme="dim"] .ctrow .illuctl,html[data-theme="dark"] .ctrow .illuctl{color:#8FD3A4}html[data-theme="dim"] .ctrow .illuctl.wait,html[data-theme="dark"] .ctrow .illuctl.wait{color:#E7B76A}
`;
  document.head.appendChild(st);
})();
