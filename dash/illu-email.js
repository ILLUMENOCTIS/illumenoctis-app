/* The Email section of a booking card (user, 2026-11-05): "a summary of all the emails per
   e-mail / count of emails / which emails have which files / date … through Hiworks".
   Two tabs: "Hiworks emails" (filled from Claude's answer - totals, summary, people, every email
   newest first with its files and links) and "My notes" (the card's own text box, as before).
   Links to Google Drive folders and Mediaslide packages get "Get files": the photos and videos
   are sorted into 1. BOOK / 2. SNAPS / 3. VIDEOS and saved on this computer and in Dropbox. */
(function(){
  'use strict';
  if(typeof bvStagePane !== 'function') return;
  const ko = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const T = (en, k) => ko() ? k : en;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
  let TAB = 'hw';                       // 'hw' | 'notes'
  let WHO = '';                         // people filter (address)
  const GLYPH = '<span class="clg" aria-hidden="true">✦</span>';

  /* ---- the data: c.em = {at, summary, unread, list:[{k, dt, dir, name, addr, to, cc, subject, summary, files, hw}]} ---- */
  const dtKey = dt => { const m = String(dt || '').match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/); return m ? m[3] + m[2] + m[1] + (m[4] || '00').padStart(2, '0') + (m[5] || '00') : ''; };
  const normDT = v => { const s = String(v || '').trim(); let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:[ T,]+(\d{1,2}):(\d{2}))?/);
    if(m) return m[1].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[3] + (m[4] ? ' ' + m[4].padStart(2, '0') + ':' + m[5] : '');
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : ''; };
  const arr = v => Array.isArray(v) ? v.map(x => String(x || '').trim()).filter(Boolean).slice(0, 20) : (v ? String(v).split(/[,;]\s*/).filter(Boolean).slice(0, 20) : []);
  const keyOf = e => e.hw ? 'hw:' + e.hw.replace(/^\/view\/[a-z]+\//, '') : 'd:' + dtKey(e.dt) + '|' + String(e.subject || '').toLowerCase().slice(0, 60);
  function fromAnswer(j){
    if(!j || !Array.isArray(j.emails)) return null;
    const list = [];
    for(const x of j.emails){
      if(!x || typeof x !== 'object') continue;
      const dt = normDT(x.date); if(!dt) continue;                     // the request's own empty example has no real date
      const files = (Array.isArray(x.files) ? x.files : []).map(f => ({kind: String(f && f.kind || '').toLowerCase().slice(0, 10), name: String(f && f.name || '').slice(0, 120), url: /^https?:\/\//i.test(String(f && f.url || '')) ? String(f.url).slice(0, 600) : ''}))
        .filter(f => f.name || f.url).slice(0, 40);
      const e = {dt, dir: /^out|sent/i.test(String(x.dir || '')) ? 'out' : 'in', name: String(x.from_name || '').slice(0, 80), addr: String(x.from || '').toLowerCase().slice(0, 120),
        to: arr(x.to).map(a => a.toLowerCase()), cc: arr(x.cc).map(a => a.toLowerCase()), subject: String(x.subject || '').slice(0, 200), summary: String(x.summary || '').slice(0, 400), summary_ko: String(x.summary_ko || '').slice(0, 400), files, body: String(x.body || '').slice(0, 30000),
        hw: /^\/view\/[a-z]+\/\d+$/.test(String(x.hiworks || '')) && !/\/0$/.test(x.hiworks) ? String(x.hiworks) : ''};
      e.k = keyOf(e); list.push(e);
    }
    if(!list.length && !j.email_summary) return null;
    return {list, summary: String(j.email_summary || '').slice(0, 1200), summary_ko: String(j.email_summary_ko || '').slice(0, 1200), unread: Math.max(0, parseInt(j.unread, 10) || 0)};
  }
  /* the summaries in Korean when the program is in Korean (Claude writes both; user, 2026-11-06) */
  const sumOf = o => (ko() && o && o.summary_ko) ? o.summary_ko : (o && o.summary) || '';
  const emOf = c => (c.em && typeof c.em === 'object' && Array.isArray(c.em.list)) ? c.em : {list: []};
  function countNew(c, EM){ const have = new Set(emOf(c).list.map(e => e.k)); return EM.list.filter(e => !have.has(e.k)).length; }
  /* only adds and refreshes: an email already on the card is updated, nothing is taken away */
  function merge(c, EM){
    const cur = emOf(c), by = new Map(cur.list.map(e => [e.k, e]));
    for(const e of EM.list) by.set(e.k, Object.assign({}, by.get(e.k) || {}, e));
    const list = [...by.values()].sort((a, b) => dtKey(b.dt).localeCompare(dtKey(a.dt)));
    c.em = {at: new Date().toISOString(), by: EM.by || 'Claude', summary: EM.summary || cur.summary || '', summary_ko: EM.summary_ko || cur.summary_ko || '', unread: EM.unread, list, unr: Array.isArray(EM.unr) ? EM.unr : (cur.unr || [])};
  }
  window.__illuEmail = {fromAnswer, countNew, merge};
  /* 1.2.133 (user, 10 Nov 2026): "Collect from Hiworks" - the program searches her name in received and sent mail
     (read only; unread emails are counted, not opened) and fills this tab. Sign-in: once, in the program's Hiworks
     window, typed by the person. */
  const hwMe = () => { try{ return ME || ''; }catch(e){ return ''; } };
  let HWBUSY = false, HWMSG = '';
  /* ---- 1.2.178 (user, 13 Nov 2026): "searching via the contact email + model name would be the better way to filter the
     emails. If there are models with similar names, you can also check by model agency ... we can differentiate them by
     their last names"; "I need to be able to see exactly what they wrote + summary"; 9. EMAIL keeps a record of each email.
     - Hers = written with her agency (its contacts, its web address, or an address already in her emails) AND her first
       name in the subject or text, and when her card has a second name (or initial), the name written after her first
       name must agree with it ("Malika A" is not "Malika Mubarakshina").
     - A conversation marked "Not her" stays off her card, also after the next Collect (c.emx).
     - The whole text of each email is kept apart from the card (docs mailtx/<card id>) and shown in the Email tab.
     - Each email is saved once as a page in 9. EMAIL / <conversation> on this computer, in Dropbox and on Z:. ---- */
  const MYDOM = /@mdient\.com$/i;
  const threadKey = subj => String(subj || '').replace(/\s*(AI\s*Summary\s*)?Translation\s*$/i, '').replace(/^\s*((re|fw|fwd|aw|wg|sv|tr|rv|r|답장|전달|회신)\s*(\[\d+\])?\s*[:：]\s*)+/i, '').replace(/^\s*((re|fw|fwd)\s*[:：]\s*)+/ig, '').replace(/\s+/g, ' ').trim().toLowerCase();
  /* her agency's web address: the card's agency domain, or the host of her page on the agency's site */
  const domOf = c => String(c.agd || (/^https?:/i.test(c.k || '') ? c.k : '') || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[\/?#].*$/, '');
  const exOf = c => (c.emx && typeof c.emx === 'object') ? c.emx : {};
  const excluded = (c, e) => !!exOf(c)[threadKey(e.subject)];
  function agAddrs(c){
    const dom = domOf(c), out = new Set();
    try{ for(const r of ((typeof CONTACTS !== 'undefined' && CONTACTS.get(dom)) || [])) if(r && r.e) out.add(String(r.e).trim().toLowerCase()); }catch(e){}
    for(const a of (Array.isArray(c.emc) ? c.emc : [])) out.add(String(a).trim().toLowerCase());
    for(const e of emOf(c).list) if(e.dir === 'in' && e.addr && !excluded(c, e) && (!dom || e.addr.endsWith('@' + dom) || e.addr.endsWith('.' + dom))) out.add(e.addr);
    return {dom, addrs: [...out].filter(a => a.includes('@') && !MYDOM.test(a))};
  }
  const nameParts = c => { const p = String(c.nm || '').trim().toLowerCase().replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean); return {first: p[0] || '', last: p.length > 1 ? p[p.length - 1] : ''}; };
  const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const COMMONW = /^(is|was|and|has|had|have|will|would|can|could|from|for|to|in|at|on|the|with|who|she|her|our|your|this|that|did|does|as|or|but|not|also|just|now|still|today|tomorrow|available|arrives|arrived|arriving|leaves|left|book|snaps|polas|polaroids|digitals|video|videos|measurements|update|news|details|info|please|thank|thanks|dear|hi|hello|x+|re|fw|fwd|mdi|model|models|management|agency|in|out)$/;
  function nameOk(c, subject, text){
    const {first, last} = nameParts(c); if(first.length < 2) return true;
    const t = (String(subject || '') + ' \n ' + String(text || '')).toLowerCase();
    if(!new RegExp('(^|[^\\p{L}])' + rx(first) + '(?=$|[^\\p{L}])', 'u').test(t)) return false;
    if(!last) return true;
    if(t.includes(first + ' ' + last)) return true;
    const after = [...t.matchAll(new RegExp('(?:^|[^\\p{L}])' + rx(first) + '[ \\t]+(\\p{L}{1,})', 'gu'))].map(m => m[1]).filter(w => !COMMONW.test(w));
    if(!after.length) return true;
    return after.some(w => w.startsWith(last) || (last.length > 1 && last.startsWith(w)));
  }
  function agOk(c, e, A){
    if(!A.dom && !A.addrs.length) return true;                       // nothing known about her agency: her name decides
    const ps = [e.addr].concat(e.to || [], e.cc || []).map(x => String(x || '').toLowerCase());
    if(ps.some(p => A.addrs.includes(p) || (A.dom && (p.endsWith('@' + A.dom) || p.endsWith('.' + A.dom))))) return true;
    const agw = String(c.ag || '').toLowerCase().split(/[^a-z0-9а-яё]+/i).filter(w => w.length > 2 && !/^(model|models|management|mgmt|agency|group|the)$/i.test(w));
    const t = (String(e.subject || '') + ' ' + String(e.body || e.summary || '')).toLowerCase();
    return agw.length > 0 && agw.every(w => t.includes(w));
  }
  /* the whole texts, kept apart from the card */
  const BODY = new Map();               // card id -> {b: {key: text}}
  async function bodies(cid, fresh){
    if(!fresh && BODY.has(cid)) return BODY.get(cid);
    let d = null; try{ const sn = await DB.doc('mailtx/' + cid).get(); d = sn && sn.exists ? sn.data() : null; }catch(e){}
    const v = {b: Object.assign({}, (d && d.b) || {})}; BODY.set(cid, v); return v;
  }
  async function keepBodies(cid, list){
    const add = list.filter(e => e.body).map(e => [e.k, e.body]); if(!add.length) return;     // taken now: the card's copy drops the text straight after
    const v = await bodies(cid, true); let ch = false;
    for(const [k, b] of add){ if(v.b[k] !== b){ v.b[k] = b; ch = true; } }
    if(ch) try{ await DB.doc('mailtx/' + cid).set({b: v.b, at: new Date().toISOString()}); }catch(e){}
  }
  /* 9. EMAIL: one page per email, in a folder per conversation - written once; the same file already there is skipped */
  const recName = s => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 80) || 'Email';
  const cleanSubj = subj => String(subj || '').replace(/\s*(AI\s*Summary\s*)?Translation\s*$/i, '').replace(/\s*AI\s*Summary\s*$/i, '').trim();
  const convName = subj => recName(cleanSubj(subj).replace(/^\s*((re|fw|fwd|aw|wg|sv|tr|rv|답장|전달|회신)\s*(\[\d+\])?\s*[:：]\s*)+/i, '') || 'No subject');
  function recHtml(c, e, body){
    const X = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[ch]);
    const row = (k, v) => v ? '<tr><td>' + k + '</td><td>' + X(v) + '</td></tr>' : '';
    const att = (e.files || []).filter(f => f.kind !== 'link').map(f => X(f.name)).join(', ');
    const lk = (e.files || []).filter(f => f.url).map(f => '<li><a href="' + X(f.url) + '">' + X(f.url) + '</a></li>').join('');
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + X(e.subject) + '</title><style>body{font:14px/1.55 -apple-system,"Segoe UI",sans-serif;max-width:780px;margin:28px auto;padding:0 18px;color:#222}h2{font-size:18px;margin:0 0 10px}table{font-size:13px;color:#555;border-collapse:collapse}td{padding:2px 12px 2px 0;vertical-align:top}td:first-child{color:#999}pre{white-space:pre-wrap;word-wrap:break-word;font:inherit;margin:0}hr{border:0;border-top:1px solid #e6e1e8;margin:14px 0}.f{color:#999;font-size:12px}</style></head><body>' +
      '<h2>' + X(e.subject || '(no subject)') + '</h2><table>' + row('Date', e.dt) + row(e.dir === 'in' ? 'Received from' : 'Sent by', (e.name ? e.name + ' ' : '') + '<' + e.addr + '>') + row('To', (e.to || []).join(', ')) + row('Cc', (e.cc || []).join(', ')) + row('Attachments', att) + '</table><hr><pre>' + X(body || e.summary || '') + '</pre>' +
      (lk ? '<hr><b>Links</b><ul>' + lk + '</ul>' : '') + '<hr><p class="f">Saved by ILLUMÉNOCTIS from Hiworks · ' + X(c.nm || '') + ' · ' + X(c.ag || '') + (e.hw ? ' · https://mails.office.hiworks.com' + X(e.hw) : '') + '</p></body></html>';
  }
  const REC = cid => { try{ return new Set(JSON.parse(localStorage.getItem('illu.emrec.' + cid) || '[]')); }catch(e){ return new Set(); } };
  let RECBUSY = Promise.resolve();
  function records(c){
    if(!(window.illu && illu.bookingPut)) return;
    RECBUSY = RECBUSY.then(async () => {
      const done = REC(c.id), v = await bodies(c.id);
      const todo = emOf(c).list.filter(e => !excluded(c, e) && v.b[e.k] && !done.has(e.k)); if(!todo.length) return;
      let z = false; try{ const st = illu.zbookStatus ? await illu.zbookStatus() : null; z = !!(st && st.there); }catch(e){}
      const where = ['pc', 'dbx'].concat(z ? ['z'] : []);
      const folder = typeof bvFolderName === 'function' ? bvFolderName(c) : (c.nm + ' - ' + c.ag), first = String(c.nm || '').trim();
      for(const e of todo){
        const m = e.dt.match(/^(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2})?:?(\d{2})?/);
        const when = m ? m[3] + '-' + m[2] + '-' + m[1] + ' ' + (m[4] || '00') + '.' + (m[5] || '00') : 'undated';
        const fname = recName(when + ' ' + (e.dir === 'in' ? 'IN ' + (e.name || e.addr.split('@')[0]) : 'OUT' + ((e.to || [])[0] ? ' to ' + e.to[0].split('@')[0] : ''))) + '.html';
        const data = new TextEncoder().encode(recHtml(c, e, v.b[e.k]));
        let ok = true;
        for(const w of where){ const r = await illu.bookingPut(w, folder, first, '9. EMAIL', fname, data, convName(e.subject)).catch(err => ({ok: false})); if(!(r && r.ok) && w === 'pc') ok = false; }
        if(ok){ done.add(e.k); try{ localStorage.setItem('illu.emrec.' + c.id, JSON.stringify([...done].slice(-3000))); }catch(err){} }
      }
    }).catch(() => {});
  }
  /* emails from Hiworks -> only hers, whole texts kept apart, the card updated, the records written */
  function takeIn(c, r){
    const A = agAddrs(c);
    const EM = fromAnswer({emails: r.emails || [], unread: r.unread || 0, email_summary: ''}) || {list: [], summary: '', unread: r.unread || 0};
    /* "about other models" counts only emails that name her first name but turn out to be another girl or agency;
       the agency's other mail (read because it came from her contacts) is simply not hers */
    const {first: fn} = nameParts(c), fre = fn.length > 1 ? new RegExp('(^|[^\\p{L}])' + rx(fn) + '(?=$|[^\\p{L}])', 'u') : null;
    let skipped = 0;
    EM.list = EM.list.filter(e => { const ok = recent(c, e) && agOk(c, e, A) && nameOk(c, e.subject, e.body || e.summary); if(!ok && fre && fre.test((String(e.subject || '') + ' ' + String(e.body || e.summary || '')).toLowerCase())) skipped++; return ok; });
    EM.unr = (r.unr || []).filter(u => recent(c, u) && agOk(c, {addr: u.addr, to: u.to || [], cc: [], subject: u.subject}, A) && nameOk(c, u.subject, '') && !exOf(c)[threadKey(u.subject)]);
    EM.unread = EM.unr.length;
    const n = countNew(c, EM);
    keepBodies(c.id, EM.list).then(() => records(c));
    for(const e of EM.list) delete e.body;
    EM.by = 'program'; merge(c, EM);
    const pruned = prune(c, A);
    try{ saveBook(c.id, true); }catch(e){}
    return {n, skipped: skipped + pruned, kept: emOf(c).list.length};
  }
  /* 1.2.186 (user, 14 Nov 2026, Malika A: "these emails and everything to the prior dates don't pertain to this Malika"):
     emails put on a card before 1.2.178 were matched by her first name only, so another Malika's old conversations
     (another agency, 2021-2022) stayed on her card - merge() only ever adds. Now every Collect looks again at what is
     on the card: a conversation in which no email is with her agency (its contacts, its web address, or her agency's
     name in the text) and none names her is taken off the card. A conversation with her agency stays whole, our own
     replies included. Nothing is taken off when nothing is known about her agency. */
  /* 1.2.186 (user, 14 Nov 2026): "base it off the email contact address related to the model, the agency name, model and
     recent timeline. There are cases when we book the models several months ahead in advance, but it is unnecessary to
     have to backtrack so far back." An email more than 6 months older than her booking card is not about this booking. */
  const BACK_MONTHS = 6;
  function since(c){ const d = new Date(c.at || ''); if(isNaN(d)) return ''; d.setMonth(d.getMonth() - BACK_MONTHS); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); }
  const recent = (c, e) => { const s0 = since(c); return !s0 || dtKey(e.dt).slice(0, 8) >= s0; };
  function prune(c, A){
    let cur = emOf(c); if(!cur.list.length) return 0;
    const n0 = cur.list.length, fresh = cur.list.filter(e => recent(c, e));
    if(fresh.length !== n0){ c.em = Object.assign({}, cur, {list: fresh}); cur = emOf(c); }
    if(!A.dom && !(Array.isArray(c.emc) && c.emc.length)) return n0 - cur.list.length;   /* the agency rule only when her agency's web address or contacts are known */
    const ok = new Set();
    /* our own email sent since her card was made also keeps its conversation (Hiworks gives no "to" for sent mail) */
    const made = (() => { const d = new Date(c.at || ''); return isNaN(d) ? '' : d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); })();
    for(const e of cur.list){
      if(agOk(c, e, A) && nameOk(c, e.subject, e.summary)) ok.add(threadKey(e.subject));
      else if(made && (e.dir === 'out' || MYDOM.test(e.addr || '')) && dtKey(e.dt).slice(0, 8) >= made && nameOk(c, e.subject, e.summary)) ok.add(threadKey(e.subject));
    }
    const keep = cur.list.filter(e => ok.has(threadKey(e.subject)));
    if(keep.length !== cur.list.length) c.em = Object.assign({}, cur, {list: keep});
    return n0 - keep.length;
  }
  async function collect(c, quiet){
    if(!c || HWBUSY) return null;
    HWBUSY = true; HWMSG = ''; if(!quiet) redraw();
    const A = agAddrs(c), {first} = nameParts(c);
    let have = []; try{ const v = await bodies(c.id, true); have = emOf(c).list.filter(e => v.b[e.k] && /^hw:\d+$/.test(e.k)).map(e => e.k.slice(3)); }catch(e){}
    let r = null; try{ r = await window.illu.hiworksCollect(String(c.nm || '').trim(), hwMe(), {addrs: A.addrs, first, have}); }catch(e){ r = {ok: false, why: String(e && e.message || e)}; }
    HWBUSY = false;
    if(r && r.need === 'signin'){ HWMSG = E(T('Hiworks needs you to sign in once in the program.', 'Hiworks 로그인이 한 번 필요합니다.')) + ' <button type="button" class="bvbtn" data-emsignin>' + T('Sign in to Hiworks', 'Hiworks 로그인') + '</button> ' + E(T('Then press Collect again.', '그다음 다시 가져오기를 누르세요.')); redraw(); return r; }
    if(!r || !r.ok){ HWMSG = E(T('Could not read Hiworks: ', 'Hiworks를 읽지 못했습니다: ') + ((r && r.why) || '')); redraw(); return r; }
    const t = takeIn(c, r);
    HWMSG = E(t.kept || r.unread ? T(t.kept + ' of her emails · ' + t.n + ' new on the card' + (t.skipped ? ' · ' + t.skipped + ' about other models left out' : '') + ((c.em.unr || []).length ? ' · ' + c.em.unr.length + ' unread (not opened)' : ''), t.kept + '통 · 새로 ' + t.n + '통' + (t.skipped ? ' · 다른 모델 ' + t.skipped + '통 제외' : '') + ((c.em.unr || []).length ? ' · 안 읽음 ' + c.em.unr.length + '통(열지 않음)' : ''))
      : T('No emails found for ' + (c.nm || '') + ' with ' + (c.ag || 'her agency') + (t.skipped ? ' (' + t.skipped + ' about other models left out)' : ''), (c.nm || '') + ' 관련 메일이 없습니다'));
    redraw(); try{ window.__illuMailRedraw && window.__illuMailRedraw(); }catch(e){}
    return Object.assign({ok: true}, t);
  }
  /* "Read it here": one unread email, opened because the person asked (it is then read in Hiworks too) */
  async function readOne(c, no){
    const r = await window.illu.hiworksRead(no, hwMe()).catch(e => ({ok: false, why: String(e && e.message || e)}));
    if(!r || !r.ok) return r;
    const EM = fromAnswer({emails: [r.email]}); if(!EM) return {ok: false, why: 'empty'};
    await keepBodies(c.id, EM.list); for(const e of EM.list) delete e.body;
    EM.by = 'program'; EM.unr = (emOf(c).unr || []).filter(u => String(u.no) !== String(no)); EM.unread = EM.unr.length;
    merge(c, EM); try{ saveBook(c.id, true); }catch(e){}
    records(c);
    return {ok: true};
  }
  window.__illuEmail = Object.assign(window.__illuEmail || {}, {fromAnswer, countNew, merge, collect, readOne, threadKey, cleanSubj, excluded, exOf, bodies, records, agAddrs, nameOk, emOf, busy: () => HWBUSY});
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-emcollect],[data-emsignin],[data-emcts]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    if(b.hasAttribute('data-emsignin')){ try{ window.illu.hiworksSignin(); }catch(err){} return; }
    if(b.hasAttribute('data-emcts')){ HWMSG = E(T('Reading your Hiworks mail list… this can take a few minutes.', 'Hiworks 메일 목록을 읽는 중… 몇 분 걸릴 수 있습니다.')); redraw();
      Promise.resolve(window.__illuHwContacts && window.__illuHwContacts(true)).then(r => { HWMSG = r && r.ok ? E(T(r.contacts + ' new agency contacts, ' + r.agencies + ' new agencies added · ' + r.dupes + ' already there · ' + r.mails + ' emails read', '새 연락처 ' + r.contacts + '개, 새 에이전시 ' + r.agencies + '곳 · 이미 있음 ' + r.dupes + ' · ' + r.mails + '통 확인')) : r && r.need === 'signin' ? E(T('Sign in to Hiworks first.', '먼저 Hiworks에 로그인하세요.')) + ' <button type="button" class="bvbtn" data-emsignin>' + T('Sign in to Hiworks', 'Hiworks 로그인') + '</button>' : E(T('Could not read Hiworks: ', 'Hiworks를 읽지 못했습니다: ') + ((r && (r.why || r.err)) || '')); redraw(); }); return; }
    const c = typeof bv !== 'undefined' && bv && BOOK.get(bv.id); collect(c);
  }, true);

  /* ---- drawing ---- */
  const isGet = u => /drive\.google\.com\/(drive\/(u\/\d+\/)?folders|file\/d|open\?|uc\?)|\.mediaslide\.com\/package\/view\//i.test(String(u || ''));
  const fileChip = f => {
    const ic = f.kind === 'link' || (f.url && !f.name) ? '🔗' : f.kind === 'video' ? '🎬' : f.kind === 'pdf' ? '📄' : '📎';
    const host = (() => { try{ return new URL(f.url).hostname.replace(/^www\./, ''); }catch(e){ return ''; } })();
    const label = f.name || (/drive\.google/.test(host) ? 'Google Drive' : /mediaslide/.test(host) ? 'Mediaslide package' : /wetransfer|we\.tl/.test(host) ? 'WeTransfer' : /dropbox/.test(host) ? 'Dropbox' : host || 'link');
    return '<span class="emf' + (f.url ? ' emlk' : '') + '">' + ic + ' ' + E(label) +
      (f.url && isGet(f.url) ? '<button type="button" class="emget" data-emget="' + E(f.url) + '">' + T('Get files', '파일 받기') + '</button>' : '') +
      (f.url ? '<a class="emopen" href="' + E(f.url) + '" target="_blank" rel="noopener" title="' + E(f.url) + '">↗</a>' : '') + '</span>';
  };
  function people(list){
    const P = new Map();
    const add = (addr, name, k) => { if(!addr) return; const p = P.get(addr) || {addr, name: '', in: 0, out: 0, cc: 0}; if(name && !p.name) p.name = name; p[k]++; P.set(addr, p); };
    for(const e of list){ if(e.dir === 'in') add(e.addr, e.name, 'in'); else for(const a of e.to) add(a, '', 'out'); for(const a of e.cc) add(a, '', 'cc'); }
    return [...P.values()].sort((a, b) => (b.in + b.out) - (a.in + a.out) || b.cc - a.cc).slice(0, 12);
  }
  function hwHtml(c){
    const em = emOf(c), L = em.list.filter(e => !excluded(c, e));     // 1.2.178: "Not her" conversations stay off
    const shown = WHO ? L.filter(e => e.addr === WHO || e.to.includes(WHO) || e.cc.includes(WHO)) : L;
    const rin = L.filter(e => e.dir === 'in').length, rout = L.length - rin, nf = L.reduce((a, e) => a + e.files.length, 0);
    const first = L.length ? L[L.length - 1].dt.slice(0, 10) : '', last = L.length ? L[0].dt.slice(0, 10) : '';
    const upd = em.at ? new Date(em.at) : null;
    const updTxt = upd ? String(upd.getDate()).padStart(2, '0') + '/' + String(upd.getMonth() + 1).padStart(2, '0') + '/' + upd.getFullYear() + ' ' + String(upd.getHours()).padStart(2, '0') + ':' + String(upd.getMinutes()).padStart(2, '0') : '';
    const P = people(L);
    /* 1.2.168 (user, 13 Nov 2026): the agency's ✉ / ☎ here too - ✉ opens its contacts, a contact's ✉ writes through Hiworks about her */
    let chip = ''; try{ const ref = /^https?:/i.test(c.k || '') ? c.k : (c.agd ? 'https://' + String(c.agd).replace(/^https?:\/\//, '') : ''); chip = typeof ctsChip === 'function' && (ref || c.ag) ? ctsChip(ref, c.ag || '') : ''; }catch(e){}
    return '<div class="emhw">' +
      (chip ? '<div class="emmail" data-emfor="' + E(c.id) + '"><span>' + T('Email ', '이메일 ') + '<b>' + E(c.ag || '') + '</b></span>' + chip + '</div>' : '') +
      '<div class="emsum">' +
        '<div class="emk"><div><i>' + T('Emails', '이메일') + '</i><b>' + L.length + '</b></div><div><i>' + T('Received', '받음') + '</i><b>' + rin + '</b></div><div><i>' + T('Sent', '보냄') + '</i><b>' + rout + '</b></div><div><i>' + T('Files', '파일') + '</i><b>' + nf + '</b></div></div>' +
        (L.length || em.summary ? '<p class="emov">' + (first ? '<b>' + E(first === last ? first : first + ' – ' + last) + '.</b> ' : '') + E(sumOf(em)) + '</p>'
          : '<p class="emov emnone">' + T('No emails on this card yet.', '이 카드에는 아직 이메일이 없습니다.') + '</p>') +
        '<button type="button" class="bvbtn emopenbig" data-emopenbig>' + T('Open all emails in the big view', '큰 화면에서 이메일 모두 보기') + (((emOf(c).unr || []).length) ? ' · ' + emOf(c).unr.length + T(' unread', ' 안 읽음') : '') + '</button>' + '<div class="emupd"><span>' + (updTxt ? T('Updated ', '업데이트 ') + E(updTxt) + (em.by === 'program' ? '' : T(' · by Claude', ' · Claude')) + (em.unread ? ' · ' + em.unread + T(' unread not opened', '통 안 읽음(열지 않음)') : '') : '') + '</span>' +
          (window.illu && window.illu.hiworksCollect ? '<button type="button" class="bvbtn emcol" data-emcollect' + (HWBUSY ? ' disabled' : '') + '>' + (HWBUSY ? T('Reading Hiworks…', 'Hiworks 읽는 중…') : T('Collect from Hiworks', 'Hiworks에서 가져오기')) + '</button>' : '') + (window.illu && window.illu.hiworksContacts ? '<button type="button" class="bvbtn emcol" data-emcts title="' + E(T('Reads your Hiworks mail list (addresses only) and adds every agency contact to the Directory, never twice', 'Hiworks 메일 목록(주소만)을 읽고 에이전시 연락처를 디렉터리에 추가합니다 (중복 없음)')) + '">' + T('Update agency contacts from my Hiworks', '내 Hiworks에서 에이전시 연락처 가져오기') + '</button>' : '') +
          '</div>' + (HWMSG ? '<p class="emcolm">' + HWMSG + '</p>' : '') +   /* 1.2.133: the program reads Hiworks itself */
      '</div>' +
      (P.length ? '<div class="emppl">' + T('People', '사람') + '</div><div class="empp"><button type="button" data-emwho="" aria-pressed="' + (!WHO) + '">' + T('All', '전체') + ' <em>' + L.length + '</em></button>' +
        P.map(p => '<button type="button" data-emwho="' + E(p.addr) + '" aria-pressed="' + (WHO === p.addr) + '" title="' + E(p.addr) + '">' + E(p.name ? p.name + ' · ' + p.addr : p.addr) + ' <em>' +
          [p.in ? p.in + T(' in', ' 받음') : '', p.out ? p.out + T(' out', ' 보냄') : '', p.cc ? 'cc ' + p.cc : ''].filter(Boolean).join(' · ') + '</em></button>').join('') + '</div>' : '') +
      '<div class="emtl">' + shown.map(e => '<div class="eme"><div class="emd"><b>' + E(e.dt.slice(0, 5)) + '</b>' + E(e.dt.slice(11)) + '<s>' + E(e.dt.slice(6, 10)) + '</s></div><div>' +
        '<span class="emdir ' + (e.dir === 'in' ? 'i' : 'o') + '">' + (e.dir === 'in' ? T('RECEIVED', '받음') : T('SENT', '보냄')) + '</span>' +
        '<span class="emwho">' + E(e.dir === 'in' ? (e.name || e.addr) : T('to ', '받는 사람 ') + (e.to[0] || '')) + '</span>' +
        (e.hw ? '<a class="emhwl" href="https://mails.office.hiworks.com' + E(e.hw) + '" target="_blank" rel="noopener" title="' + T('Open in Hiworks', '하이웍스에서 열기') + '">Hiworks ↗</a>' : '') +
        '<div class="emsubj">' + E(e.subject) + '</div>' + (sumOf(e) ? '<div class="emtxt">' + E(sumOf(e)) + '</div>' : '') +
        (e.files.length ? '<div class="emfs">' + e.files.map(fileChip).join('') + '</div>' : '') + '</div></div>').join('') + '</div>' +
      '<div class="emlink"><input type="url" class="emlinkin" placeholder="' + T('Paste a Google Drive or Mediaslide link…', 'Google Drive 또는 Mediaslide 링크 붙여넣기…') + '" spellcheck="false"><button type="button" class="bvbtn" data-emgetin>' + T('Get files', '파일 받기') + '</button></div>' +
    '</div>';
  }
  const old = bvStagePane;
  window.bvStagePane = function(c, k){
    const h = old.apply(this, arguments);
    if(k !== 'email') return h;
    const n = emOf(c).list.length;
    const seg = '<div class="emseg" role="tablist"><button type="button" data-emtab="hw" aria-pressed="' + (TAB === 'hw') + '">' + T('Hiworks emails', 'Hiworks 이메일') + (n ? ' · ' + n : '') + '</button>' +
      '<button type="button" data-emtab="notes" aria-pressed="' + (TAB === 'notes') + '">' + T('My notes', '내 메모') + '</button></div>';
    /* the tabs go under the stage chips; the notes box (and its files) stay as they are, under "My notes" */
    let out = h.replace(/(<\/div>)(<textarea class="bvntext")/, '$1' + seg + (TAB === 'hw' ? hwHtml(c) : '') + '$2');
    if(TAB === 'hw') out = out.replace('<textarea class="bvntext"', '<textarea hidden class="bvntext"').replace('<div class="bvnfiles">', '<div class="bvnfiles" hidden>');
    return out;
  };
  const redraw = () => { try{ bvSideRefresh(true); }catch(e){} };

  /* ---- Get files ---- */
  let JOB = null;
  async function getFiles(link, cid){
    const c = cid ? BOOK.get(cid) : (typeof bv !== 'undefined' && bv && BOOK.get(bv.id)); if(!c) return;
    if(!(window.illu && illu.getFilesPlan)){ alertBox(T('Getting files works in the ILLUMENOCTIS program', '파일 받기는 ILLUMENOCTIS 프로그램에서 됩니다')); return; }
    const m = modal('<h3>' + T('Get files', '파일 받기') + '</h3><p class="clsub">' + T('Reading the link…', '링크를 읽는 중…') + '</p>');
    const P = await illu.getFilesPlan(link, String(c.nm || '').trim()).catch(e => ({ok: false, why: String(e && e.message || e)}));
    if(!m.isConnected) return;
    if(!P.ok){ m.querySelector('.clbox').innerHTML = '<h3>' + T('Get files', '파일 받기') + '</h3><p class="clsub">' + E(P.why) + '</p><div class="clbtns"><button type="button" class="bvbtn" data-clx>' + T('Close', '닫기') + '</button></div>'; return; }
    const opts = t => ['1. BOOK', '2. SNAPS', '3. VIDEOS', ''].map(x => '<option value="' + x + '"' + (x === t ? ' selected' : '') + '>' + (x ? x.replace('2. SNAPS', '2. SNAPS / POLAS') : T('— leave out —', '— 받지 않음 —')) + '</option>').join('');
    m.querySelector('.clbox').innerHTML = '<h3>' + T('Get files', '파일 받기') + ' · ' + E(c.nm || '') + '</h3>' +
      '<p class="clsub">' + E(P.source) + ' · <b>' + E(P.title || '') + '</b>' + (P.models > 1 ? ' · ' + T('package of ', '패키지 모델 ') + P.models + T(' models; this model’s book', '명 중 이 모델') : '') + '</p>' +
      tiles(P) +      '<p class="clsub">' + T('Videos always go to 3. VIDEOS. Subfolders are kept. A file already there is skipped; nothing is replaced or deleted.', '영상은 항상 3. VIDEOS로 갑니다. 하위 폴더는 유지됩니다. 이미 있는 파일은 건너뛰며, 어떤 것도 덮어쓰거나 지우지 않습니다.') + '</p>' +
      '<div class="gfwhere"><span class="gfwt">' + T('Save to', '저장 위치') + ' · <b>' + E(bvFolderName(c)) + '</b></span><label><input type="checkbox" data-gfw="pc" checked> ' + T('This computer (Desktop › ILLUMENOCTIS › BOOKING)', '이 컴퓨터 (바탕화면 › ILLUMENOCTIS › BOOKING)') + '</label> <label><input type="checkbox" data-gfw="dbx" checked> Dropbox</label> <label class="gfz" hidden><input type="checkbox" data-gfw="z" checked> ' + T('Z: drive (ILLUMENOCTIS › Booking)', 'Z: 드라이브 (ILLUMENOCTIS › Booking)') + '</label></div>' +
      '<p class="gfsum">' + E(T(P.groups.reduce((a, g) => a + (g.tab ? g.files.length : 0), 0) + ' of ' + P.groups.reduce((a, g) => a + g.files.length, 0) + ' files will be saved', P.groups.reduce((a, g) => a + g.files.length, 0) + '개 중 ' + P.groups.reduce((a, g) => a + (g.tab ? g.files.length : 0), 0) + '개를 저장합니다')) + '</p>' +
      '<div class="gfprog" hidden><div class="gfbar"><i></i></div><span class="gfnow"></span></div>' +
      '<div class="clbtns"><button type="button" class="bvbtn" data-clx>' + T('Cancel', '취소') + '</button><button type="button" class="bvbtn clokb" data-gfgo>' + T('Get files', '파일 받기') + '</button></div>';
    m.__plan = P; m.__card = c.id;
    /* 1.2.173: the office Z: drive, when this computer can reach it (otherwise the box is not shown and not used) */
    const zl = m.querySelector('.gfz');
    if(zl){ const zi = zl.querySelector('input'); zi.checked = false; Promise.resolve(window.illu && illu.zbookStatus ? illu.zbookStatus() : null).then(st => { if(st && st.there && zl.isConnected){ zl.hidden = false; zi.checked = true; } }).catch(() => {}); }
  }
  /* 1.2.178 (user, 13 Nov 2026: "sometimes you mistake the wrong files or you don't download all the necessary contents
     that I want/need" -> "Show check first, and to what destination"): every file found at the link is shown as a small
     picture under the folder it would go to. Tap a picture to leave it out; its letter (B / S / V) moves it to Book,
     Snaps or Videos. Nothing is saved until Get files is pressed; afterwards the window says what was found, what was
     saved where and which files could not be saved. */
  const THUMB = f => f.how === 'drive' && f.id ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(f.id) + '&sz=w240'
    : f.how === 'url' && /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(f.url || '') ? f.url : '';
  const isVid = f => /\.(mp4|mov|m4v|webm|avi|mkv|wmv|3gp)$/i.test(f.name || f.url || '');
  const TABL = {'1. BOOK': 'B', '2. SNAPS': 'S', '3. VIDEOS': 'V'};
  function tiles(P){
    return '<div class="gfgs">' + P.groups.map((g, i) => {
      const on = g.files.filter(f => !f.off).length;
      return '<section class="gfg"><div class="gfgh"><b>' + E(g.name || T('Files', '파일')) + '</b><span class="gfgn">' + (g.files[0] && g.files[0].how === 'zip' ? T('all photos, as one zip', '사진 전체 (zip)') : on + T(' of ', ' / ') + g.files.length) + '</span>' +
        '<select data-gfg="' + i + '" aria-label="' + E(T('Folder for ', '폴더: ') + (g.name || '')) + '">' + ['1. BOOK', '2. SNAPS', '3. VIDEOS', ''].map(x => '<option value="' + x + '"' + (x === g.tab ? ' selected' : '') + '>' + (x ? x.replace('2. SNAPS', '2. SNAPS / POLAS') : T('— leave out —', '— 받지 않음 —')) + '</option>').join('') + '</select>' +
        (!g.tab ? '<span class="gfq">' + T('choose a folder', '폴더 선택') + '</span>' : '') +
        (g.files.length > 1 && g.files[0].how !== 'zip' ? '<button type="button" class="gfall" data-gfall="' + i + '">' + (on === g.files.length ? T('Leave all out', '모두 빼기') : T('Take all', '모두 받기')) + '</button>' : '') + '</div>' +
        '<div class="gft">' + g.files.slice(0, 400).map((f, j) => {
          const th = THUMB(f), t = f.tab2 || g.tab, v = isVid(f);
          return '<div class="gfc' + (f.off ? ' off' : '') + '"><button type="button" class="gfi" data-gft="' + i + ':' + j + '" aria-pressed="' + !f.off + '" title="' + E((f.sub ? f.sub + '/' : '') + (f.name || f.url || '')) + '">' +
            (th ? '<img src="' + E(th) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="gfph">' + (f.how === 'zip' ? 'ZIP' : v ? '▶' : E(((f.name || '').split('.').pop() || 'file').slice(0, 4).toUpperCase())) + '</span>') +
            '<i class="gfck" aria-hidden="true">' + (f.off ? '' : '✓') + '</i></button>' +
            (!v && f.how !== 'zip' ? '<button type="button" class="gfb" data-gfb="' + i + ':' + j + '" title="' + E(T('Folder: ', '폴더: ') + (t || '—') + T(' — press to change', ' — 눌러서 바꾸기')) + '">' + (TABL[t] || '–') + '</button>' : '') +
            '<span class="gfn">' + E(f.name || '') + '</span></div>';
        }).join('') + (g.files.length > 400 ? '<p class="clsub">' + (g.files.length - 400) + T(' more files in this folder are taken too.', '개 파일도 함께 받습니다.') + '</p>' : '') + '</div></section>';
    }).join('') + '</div>';
  }
  function retile(m){
    const P = m.__plan; if(!P) return;
    m.querySelectorAll('[data-gfg]').forEach(s => { P.groups[+s.dataset.gfg].tab = s.value; });
    const box = m.querySelector('.gfgs'); if(!box) return;
    const top = box.scrollTop; box.outerHTML = tiles(P); const nb = m.querySelector('.gfgs'); if(nb) nb.scrollTop = top;
    const n = P.groups.reduce((a, g) => a + g.files.filter(f => !f.off && (f.tab2 || g.tab)).length, 0), all = P.groups.reduce((a, g) => a + g.files.length, 0);
    const sm = m.querySelector('.gfsum'); if(sm) sm.textContent = T(n + ' of ' + all + ' files will be saved', all + '개 중 ' + n + '개를 저장합니다');
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('.clmod [data-gft],.clmod [data-gfb],.clmod [data-gfall]'); if(!t) return;
    e.preventDefault(); e.stopPropagation();
    const m = t.closest('.clmod'), P = m && m.__plan; if(!P || m.__job) return;
    if(t.dataset.gfall != null){ const g = P.groups[+t.dataset.gfall]; const allOn = g.files.every(f => !f.off); g.files.forEach(f => { f.off = allOn; }); retile(m); return; }
    const [i, j] = (t.dataset.gft || t.dataset.gfb).split(':').map(Number), g = P.groups[i], f = g && g.files[j]; if(!f) return;
    if(t.dataset.gft != null) f.off = !f.off;
    else { const order = ['1. BOOK', '2. SNAPS', '3. VIDEOS'], cur = f.tab2 || g.tab, nx = order[(order.indexOf(cur) + 1) % 3]; f.tab2 = nx === g.tab ? '' : nx; }
    retile(m);
  }, true);
  document.addEventListener('change', e => { const s = e.target.closest && e.target.closest('.clmod [data-gfg]'); if(s){ const m = s.closest('.clmod'); if(m && m.__plan && !m.__job) retile(m); } }, true);
  /* 1.2.129: the photo viewer's Links use the same Get files, for the model's booking card */
  window.__illuGetFiles = (link, cid) => getFiles(link, cid);
  async function go(m){
    const P = m.__plan, c = BOOK.get(m.__card); if(!P || !c) return;
    m.querySelectorAll('[data-gfg]').forEach(s => { P.groups[+s.dataset.gfg].tab = s.value; });
    const where = [...m.querySelectorAll('[data-gfw]')].filter(x => x.checked).map(x => x.dataset.gfw);
    if(!where.length){ const w = m.querySelector('.gfwhere'); if(w){ w.classList.add('gfneed'); setTimeout(() => w.classList.remove('gfneed'), 1400); } return; }
    /* 1.2.178: only the ticked files, each in the folder chosen for it */
    const groups = [];
    for(const g of P.groups){
      const by = new Map();
      for(const f of g.files){ if(f.off) continue; const t = f.tab2 || g.tab; if(!t) continue; if(!by.has(t)) by.set(t, []); by.get(t).push({how: f.how, id: f.id, url: f.url, name: f.name, sub: f.sub}); }
      for(const [t, files] of by) groups.push({name: g.name, tab: t, main: g.main, files});
    }
    if(!groups.length) return;
    m.__chosen = groups.reduce((a, g) => a + g.files.length, 0);
    JOB = 'gf' + Date.now();
    m.__job = JOB;
    m.querySelectorAll('select,input,.gfi,.gfb,.gfall').forEach(x => x.disabled = true);
    m.querySelector('.gfprog').hidden = false;
    const b = m.querySelector('[data-gfgo]'); b.textContent = T('Stop', '중지'); b.dataset.gfstop = '1'; b.removeAttribute('data-gfgo'); b.classList.remove('clokb');
    m.querySelector('[data-clx]').hidden = true;
    const r = await illu.getFilesRun(JOB, {folder: bvFolderName(c), first: String(c.nm || '').trim()}, groups, where).catch(e => ({ok: false, failed: [String(e && e.message || e)]}));
    JOB = null;
    if(m.isConnected){
      const w = r.where || {};
      const line = k => w[k] ? (k === 'pc' ? T('This computer', '이 컴퓨터') : k === 'z' ? T('Z: drive', 'Z: 드라이브') : 'Dropbox') + ': ' + w[k].saved + T(' saved', '개 저장') + (w[k].same ? ', ' + w[k].same + T(' already there', '개 이미 있음') : '') + (w[k].failed ? ', ' + w[k].failed + T(' not saved', '개 저장 못 함') + (w[k].why ? ' (' + E(w[k].why) + ')' : '') : '') : '';
      m.querySelector('.clbox').innerHTML = '<h3>' + (r.stopped ? T('Stopped', '중지됨') : T('Done', '완료')) + '</h3>' +
        '<p class="clsub"><b>' + E(T('Chosen: ' + (m.__chosen || 0) + ' files · saved ' + (r.saved || 0) + ' · already there ' + (r.same || 0) + ' · not saved ' + ((r.failed || []).length), '선택 ' + (m.__chosen || 0) + '개 · 저장 ' + (r.saved || 0) + ' · 이미 있음 ' + (r.same || 0) + ' · 저장 못 함 ' + ((r.failed || []).length))) + '</b><br>' + E(T('A zip counts as one file here; the photos inside it are counted as saved.', 'zip은 여기서 1개로 셉니다. 안의 사진은 저장 개수에 들어갑니다.')) + '</p><p class="clsub">' + where.map(line).filter(Boolean).join('<br>') + '</p>' +
        ((r.failed || []).length ? '<div class="clsub gfbad"><b>' + T('Could not get these ' + r.failed.length + ' (you can open the link and save them by hand):', '받지 못한 ' + r.failed.length + '개 (링크를 열어 직접 저장할 수 있습니다):') + '</b><ul>' + r.failed.slice(0, 40).map(x => '<li>' + E(x) + '</li>').join('') + '</ul>' + (r.failed.length > 40 ? '…' : '') + '</div>' : '') +
        '<div class="clbtns"><button type="button" class="bvbtn clokb" data-clx>' + T('Close', '닫기') + '</button></div>';
    }
    /* the folder on screen shows what came in */
    try{ const g = BVLOAD.get(c.id); if(bv && bv.id === c.id && typeof bvOpenSrc === 'function') bvOpenSrc(c, g && g.loc ? g.loc : (where.includes('dbx') ? 'dbx' : 'pc'), true); }catch(e){}
  }
  if(window.illu && illu.onGetFiles) illu.onGetFiles(s => {
    const m = document.querySelector('.clmod'); if(!m || m.__job !== s.job) return;
    const bar = m.querySelector('.gfbar i'), now = m.querySelector('.gfnow');
    if(bar) bar.style.width = (s.total ? Math.round(100 * s.done / s.total) : 0) + '%';
    if(now) now.textContent = s.done + ' / ' + s.total + T(' · saved ', ' · 저장 ') + s.saved + (s.same ? T(' · already there ', ' · 이미 있음 ') + s.same : '') + ' · ' + (s.bytes > 1048576 ? (s.bytes / 1048576).toFixed(1) + ' MB' : Math.round(s.bytes / 1024) + ' KB') + (s.now ? ' · ' + s.now : '');
  });
  function modal(inner){
    const o = document.querySelector('.clmod'); if(o) o.remove();
    const m = document.createElement('div'); m.className = 'clmod'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="clbox">' + inner + '</div>'; document.body.appendChild(m); return m;
  }
  function alertBox(t){ modal('<p class="clsub">' + E(t) + '</p><div class="clbtns"><button type="button" class="bvbtn" data-clx>OK</button></div>'); }

  document.addEventListener('click', async e => {
    const t = e.target.closest && e.target.closest('[data-emtab],[data-emwho],[data-emup],[data-emget],[data-emgetin],[data-gfgo],[data-gfstop]');
    if(!t) return;
    e.preventDefault(); e.stopPropagation();
    if(t.dataset.emtab){ TAB = t.dataset.emtab; redraw(); return; }
    if(t.hasAttribute('data-emwho')){ WHO = t.dataset.emwho; redraw(); return; }
    if(t.hasAttribute('data-emup')){ const b = document.querySelector('.bv [data-clsend]'); if(b) b.click(); return; }
    if(t.dataset.emget){ getFiles(t.dataset.emget); return; }
    if(t.hasAttribute('data-emgetin')){ const v = (t.parentNode.querySelector('.emlinkin') || {}).value || ''; if(v.trim()) getFiles(v.trim()); return; }
    if(t.hasAttribute('data-gfgo')){ go(t.closest('.clmod')); return; }
    if(t.hasAttribute('data-gfstop')){ const m = t.closest('.clmod'); if(m && m.__job) illu.getFilesStop(m.__job); t.disabled = true; t.textContent = T('Stopping…', '중지 중…'); }
  }, true);
  document.addEventListener('keydown', e => { if(e.key === 'Enter' && e.target && e.target.classList && e.target.classList.contains('emlinkin')){ e.preventDefault(); const v = e.target.value.trim(); if(v) getFiles(v); } }, true);

  const st = document.createElement('style');
  st.textContent = [
    '.bv .emseg{display:flex;background:#f1eff4;border-radius:8px;padding:2px;margin:8px 0 10px}.bv .emseg button{flex:1;border:0;background:none;padding:6px;border-radius:6px;font:inherit;font-size:12px;color:#666;cursor:pointer}',
    '.bv .emseg button[aria-pressed="true"]{background:#fff;color:#1d1b22;box-shadow:0 1px 2px rgba(0,0,0,.1);font-weight:600}',
    '.bv .emmail{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px;padding:8px 10px;border:1px solid #ebe8f0;border-radius:12px;background:#fff}.bv .emmail>span:first-child{margin-right:auto;color:#6d6577}.bv .emmail b{color:#211c26;font-weight:600}' + '.bv .emhw{font-size:12.5px;overflow:auto}.bv .emsum{border:1px solid #ebe8f0;border-radius:12px;padding:9px 10px;background:#faf9fc}',
    '.bv .emk{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:7px}.bv .emk div{background:#fff;border:1px solid #eee;border-radius:8px;padding:5px 7px}.bv .emk i{display:block;font-style:normal;font-size:9.5px;letter-spacing:.08em;color:#888;text-transform:uppercase}.bv .emk b{font-size:15px}',
    '.bv .emov{margin:0 0 4px;color:#333;line-height:1.45}.bv .emnone{color:#777}.bv .emupd{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:#888;margin-top:6px}.bv .emup{white-space:nowrap}.bv .emup .clg{margin-right:4px}',
    '.bv .emppl{margin:10px 0 4px;font-size:10px;letter-spacing:.1em;color:#888;text-transform:uppercase;font-weight:600}.bv .empp{display:flex;flex-wrap:wrap;gap:5px}.bv .empp button{border:1px solid #e3dfe8;background:#fff;border-radius:8px;padding:3px 8px;font:inherit;font-size:11.5px;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bv .empp button em{font-style:normal;color:#888;margin-left:4px}.bv .empp button[aria-pressed="true"]{border-color:#6b2a5e;background:#f6eff4}',
    '.bv .emtl{margin-top:6px}.bv .eme{display:grid;grid-template-columns:48px 1fr;gap:8px;padding:8px 2px;border-top:1px solid #f0eef3}.bv .emd{font-size:11px;color:#666;line-height:1.3}.bv .emd b{display:block;color:#1d1b22;font-size:12.5px}.bv .emd s{display:block;text-decoration:none;color:#aaa;font-size:10px}',
    '.bv .emdir{display:inline-block;font-size:9.5px;font-weight:700;letter-spacing:.06em;border-radius:4px;padding:0 5px;margin-right:6px}.bv .emdir.i{background:#e8f1fb;color:#2b62a6}.bv .emdir.o{background:#eef7ec;color:#3c7a2f}',
    '.bv .emwho{font-weight:600}.bv .emhwl{float:right;font-size:11px;color:#6b2a5e;text-decoration:none}.bv .emsubj{color:#555;font-size:11.5px;margin:1px 0 2px}.bv .emtxt{color:#333}',
    '.bv .emfs{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.bv .emf{display:inline-flex;align-items:center;gap:5px;font-size:11px;border-radius:6px;padding:1px 6px;background:#f3f1f6;border:1px solid #e6e2ea;max-width:100%}.bv .emf.emlk{background:#fff7ee;border-color:#f1d9bd}',
    '.bv .emget{border:1px solid #6b2a5e;background:#fff;color:#6b2a5e;border-radius:5px;font:inherit;font-size:10.5px;font-weight:600;padding:0 6px;cursor:pointer}.bv .emopen{color:#999;text-decoration:none}',
    '.bv .emlink{display:flex;gap:6px;margin:10px 0 4px}.bv .emlinkin{flex:1;min-width:0;border:1px solid #ddd;border-radius:8px;padding:5px 8px;font:inherit;font-size:12px}',
    '.gfgs{display:flex;flex-direction:column;gap:12px;max-height:46vh;overflow:auto;margin:6px 0 10px;padding-right:4px}.gfgh{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;margin-bottom:6px}.gfgh b{font-weight:650}.gfgn{color:#777}.gfgh select{font:inherit;font-size:12px;padding:2px 4px;margin-left:auto}',
    '.gfall{border:1px solid #ddd;background:#fff;border-radius:6px;font:inherit;font-size:11px;padding:1px 7px;cursor:pointer}.gft{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:8px}',
    '.gfc{position:relative;display:flex;flex-direction:column;gap:2px;min-width:0}.gfi{position:relative;display:block;width:100%;aspect-ratio:3/4;border:2px solid #6b2a5e;border-radius:8px;overflow:hidden;padding:0;background:#f1eef4;cursor:pointer}',
    '.gfi img{width:100%;height:100%;object-fit:cover;display:block}.gfph{display:grid;place-items:center;width:100%;height:100%;font-size:13px;font-weight:700;color:#6d6577}',
    '.gfck{position:absolute;top:4px;right:4px;width:18px;height:18px;border-radius:50%;background:#6b2a5e;color:#fff;font-style:normal;font-size:11px;display:grid;place-items:center}',
    '.gfc.off .gfi{border-color:#ddd;opacity:.35}.gfc.off .gfck{background:#fff;border:1px solid #bbb}.gfb{position:absolute;left:4px;top:4px;min-width:22px;height:22px;border-radius:6px;border:0;background:rgba(255,255,255,.92);color:#6b2a5e;font:inherit;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.2)}',
    '.gfn{font-size:10px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gfsum{margin:0 0 8px;font-size:12.5px;font-weight:600}.gfwt{flex-basis:100%;font-size:12.5px}.gfneed{outline:2px solid #c2410c;border-radius:6px}.gfbad ul{margin:4px 0 0;padding-left:18px;max-height:160px;overflow:auto}',
    '@media (max-width:760px){.gft{grid-template-columns:repeat(auto-fill,minmax(92px,1fr))}.gfb{min-width:30px;height:30px}.gfgs{max-height:50vh}}',
    '.gftab select{font:inherit;font-size:12.5px;padding:2px 4px}.gfq{color:#b0006a;font-size:11px}.gfwhere{font-size:12.5px;margin:6px 0 10px;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center}',
    '.gfprog{margin:0 0 10px}.gfbar{height:6px;background:#eee;border-radius:3px;overflow:hidden}.gfbar i{display:block;height:100%;width:0;background:#6b2a5e;transition:width .2s}.gfnow{display:block;font-size:11.5px;color:#666;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gfbad{color:#b0006a}'
  ].join('\n');
  document.head.appendChild(st);
  /* 1.2.129: the window these boxes open in (.clmod / .clbox) was styled only by illu-claude.js, which does
     not run where the Claude button is not offered (the web / phone version) - there the box sat unstyled at
     the bottom of the page, under the photo viewer. The same rules, here, so the window is always a window. */
  const st2 = document.createElement('style');
  st2.textContent = '.clmod{position:fixed;inset:0;z-index:2147483000;background:rgba(20,16,24,.45);display:grid;place-items:center}' +
    '.clbox{background:#fff;color:#222;border-radius:14px;max-width:640px;width:calc(100% - 40px);max-height:84vh;overflow:auto;padding:18px 20px;box-shadow:0 20px 60px rgba(0,0,0,.3);box-sizing:border-box}' +
    '.clbox h3{margin:0 0 6px;font-size:16px}.clsub{margin:0 0 10px;color:#666;font-size:12.5px}.clbtns{display:flex;justify-content:flex-end;gap:8px}';
  document.head.insertBefore(st2, document.head.firstChild);
  const st3 = document.createElement('style'); st3.textContent = '.emupd{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.emupd .emcol{margin-left:auto}.emcolm{margin:6px 0 0;font-size:12.5px;color:var(--mut)}.emcolm .bvbtn{margin:0 4px}'; document.head.appendChild(st3);
  /* ...and its Close / OK button works there too (illu-claude.js handles it in the program) */
  if(!(window.illu && window.illu.claudeToggle)) document.addEventListener('click', e => { const x = e.target.closest && e.target.closest('.clmod [data-clx]'); if(!x) return; e.preventDefault(); const m = x.closest('.clmod'); if(m) m.remove(); });
})();

/* 1.2.158 (user, 12 Nov 2026): "Connect Hiworks to all users. Allow them to login using their own Hiworks ID. Once they
   log in, go through their email and collect all the agency lists/contacts and add them to the directory. Watch for
   duplicates. Add the agency websites according to their names. Also according to their user login, when they click
   on the email cursor to send an email."
   - The program tells its Hiworks side who is signed in here, so sign-in, Collect and compose use that person's own
     Hiworks ID (program only; the phone has no Hiworks).
   - After a person's Hiworks sign-in (and then once a day) their mail is read - addresses only, from the mail list -
     and every agency address is added to that agency's contacts: never twice (an address already anywhere is
     skipped). An agency that is not in the Directory yet is added with its website from its email domain
     (docs agextra/<domain>, marked "from Hiworks"). Free mail (gmail, naver ...) and services (no-reply, google ...)
     are left out. */
(function(){
  /* the agencies added from Hiworks show on the phone too; only the reading needs the program */
  const has = () => !!(window.illu && window.illu.hiworksUser && window.illu.hiworksContacts);
  const me = () => { try{ return ME || ''; }catch(e){ return ''; } };
  let told = null;
  const tell = () => { if(!has()) return; const m = me(); if(m !== told){ told = m; try{ window.illu.hiworksUser(m); }catch(e){} if(m) setTimeout(() => autoRun(), 8000); } };
  setInterval(tell, 3000); tell();
  const FREE = /^(gmail|googlemail|naver|yahoo|hotmail|outlook|live|msn|icloud|me|mac|mail|yandex|ya|daum|hanmail|nate|gmx|web|t-online|protonmail|proton|pm|qq|163|126|aol|ukr|bk|inbox|list|rambler|seznam|wp|o2|libero|virgilio|orange|free|laposte|sfr|wanadoo|btinternet|sky|comcast|verizon|att|kakao|hanmir|empas|zoho|yahoo\.co|mail\.ru)\./i;
  const NOISE = /(google|facebook|instagram|meta|linkedin|amazon|apple|microsoft|paypal|hiworks|gabia|naver|kakao|notion|dropbox|zoom|slack|adobe|canva|figma|github|mailchimp|sendgrid|stripe|shopify|wix|squarespace|godaddy|cafe24|coupang|airbnb|booking\.com|agoda|expedia|uber|grab|spotify|netflix|youtube|tiktok|twitter|x\.com|pinterest|wetransfer|docusign|hellosign|smartstore|anthropic|claude|openai|supabase|firecrawl|magnific|mediaslide)/i;
  const BOT = /^(no-?reply|do-?not-?reply|mailer|notifications?|news(letter)?|info-?mail|bounce|postmaster|support@hiworks)/i;
  const MODELY = /model|agenc|inquir|availab|package|new ?face|booking|option|casting|placement|mother|guarantee|contract|stay|digitals|polaroid|snaps|book|show ?package|talent|scout|mgmt|management/i;
  const regDom = d => { const p = String(d || '').toLowerCase().split('.'); if(p.length <= 2) return p.join('.'); const two = p.slice(-2).join('.'); return /^(co|com|net|org|ac|or|ne|go)\.[a-z]{2}$/.test(two) ? p.slice(-3).join('.') : two; };
  function agFor(dom){ try{ return AG.find(a => a.domain && (lc(a.domain) === dom || lc(a.domain).endsWith('.' + dom) || dom.endsWith('.' + lc(a.domain)) || regDom(a.domain) === dom)); }catch(e){ return null; } }
  const lc = s => String(s || '').trim().toLowerCase();
  function guessName(dom, rows){
    for(const r of rows){ const n = String(r.n || ''); const m = n.match(/[|\/@–-]\s*([^|\/@–-]*(model|mgmt|management|agency|talent)[^|\/@–-]*)$/i) || n.match(/^([^|\/]*(model|mgmt|management|agency|talent)[^|\/]*)$/i); if(m) return m[1].trim().replace(/\s+/g, ' ').slice(0, 60); }
    const stem = dom.split('.')[0].replace(/[-_]+/g, ' ');
    return stem.replace(/\b\w/g, c => c.toUpperCase()).replace(/mgmt\b/i, 'Mgmt').replace(/models\b/i, 'Models');
  }
  /* the agencies added from Hiworks (or by hand) join the Directory list */
  const EXTRA = new Map();
  function applyExtra(){
    let added = 0;
    try{ for(const v of EXTRA.values()){ if(!v.domain || AGALL.some(a => lc(a.domain) === lc(v.domain))) continue;
      const id = 200000 + EXTRA.size + AGALL.length; AGALL.push({id, name: v.name || v.domain, domain: v.domain, country: v.country || '', city: v.city || '', region: v.region || '', boards: [], site: v.website || ('https://' + v.domain), n: 0, at: '', tiers: [], sexes: [], __o: {country: v.country || '', city: v.city || '', region: v.region || ''}, src: v.src || 'hiworks'}); added++; }
      if(added){ if(typeof agApply === 'function') agApply(); try{ refresh(); }catch(e){} } }catch(e){}
  }
  (function listen(){ if(typeof DB === 'undefined' || !DB){ setTimeout(listen, 800); return; }
    try{ DB.collection('agextra').onSnapshot(sn => { for(const x of (sn.docs || [])){ const v = typeof docOf === 'function' ? docOf(x) : x.data(); if(v && v.domain) EXTRA.set(lc(v.domain), v); } applyExtra(); }, () => {}); }catch(e){}
  })();
  let busy = false;
  async function run(manual){
    if(!has()) return {ok: false, why: 'Hiworks works in the program on the computer'};
    if(busy) return {ok: false, why: 'busy'}; const m = me(); if(!m) return {ok: false, why: 'not signed in to the program'};
    busy = true;
    try{
      const r = await window.illu.hiworksContacts(m);
      if(!r || !r.ok) return r || {ok: false};
      const all = new Set(); try{ for(const rows of CONTACTS.values()) for(const c of rows) if(c.e) all.add(lc(c.e)); }catch(e){}
      const byDom = new Map(); let free = 0, noise = 0;
      for(const o of r.list){
        const a = lc(o.a), local = a.split('@')[0], full = a.split('@')[1] || '', dom = regDom(full);
        if(!dom || BOT.test(local) || NOISE.test(full)){ noise++; continue; }
        if(FREE.test(full)){ free++; continue; }
        const ag = agFor(dom);
        if(!ag && !o.s.some(x => MODELY.test(x))) { noise++; continue; }
        const key = ag ? lc(ag.domain) : dom;
        if(!byDom.has(key)) byDom.set(key, {ag, rows: []});
        byDom.get(key).rows.push(o);
      }
      let addC = 0, addA = 0, dupe = 0; const newAgs = [];
      for(const [dom, g] of byDom){
        const list = (CONTACTS.get(dom) || []).slice(); let ch = false;
        for(const o of g.rows.sort((p, q) => q.k - p.k)){
          if(all.has(lc(o.a))){ dupe++; continue; }
          list.push(ctsClean({e: o.a, n: o.n || '', r: '', p: ''})); all.add(lc(o.a)); addC++; ch = true;
        }
        if(ch){ CONTACTS.set(dom, list); try{ await saveContacts(dom); }catch(e){} try{ paintCtsChip(dom); }catch(e){} }
        if(!g.ag && !EXTRA.has(dom) && !AGALL.some(a => lc(a.domain) === dom)){
          const v = {domain: dom, name: guessName(dom, g.rows), website: 'https://' + dom, country: '', city: '', src: 'hiworks', by: m, at: new Date().toISOString(), n: g.rows.length};
          EXTRA.set(dom, v); newAgs.push(v.name); addA++;
          try{ await DB.doc('agextra/' + dom.replace(/[^a-z0-9.-]/g, '_')).set(v); }catch(e){}
        }
      }
      applyExtra();
      const sum = {ok: true, mails: r.seen, contacts: addC, agencies: addA, dupes: dupe, free, skipped: noise, newAgs: newAgs.slice(0, 40), at: new Date().toISOString()};
      try{ localStorage.setItem('illu.hwcts.' + m, JSON.stringify(sum)); }catch(e){}
      try{ await DB.doc('hwscan/' + m).set(sum); }catch(e){}
      if(manual || addC || addA){ try{ (window.__illuToast || window.toast || (() => {}))(L2('Hiworks: ' + addC + ' new agency contacts' + (addA ? ', ' + addA + ' new agencies in the Directory' : '') + ' (' + r.seen + ' emails read, nothing twice)', 'Hiworks: 새 연락처 ' + addC + '개' + (addA ? ', 새 에이전시 ' + addA + '곳' : '') + ' (' + r.seen + '통 확인, 중복 없음)')); }catch(e){} }
      return sum;
    } finally { busy = false; }
  }
  const L2 = (en, ko) => (typeof LANG !== 'undefined' && LANG === 'ko') ? ko : en;
  async function autoRun(){
    const m = me(); if(!m) return;
    let last = null; try{ last = JSON.parse(localStorage.getItem('illu.hwcts.' + m) || 'null'); }catch(e){}
    if(last && Date.now() - new Date(last.at).getTime() < 22 * 3600e3) return;
    let st = null; try{ st = await window.illu.hiworksStatus(m); }catch(e){}
    if(st && st.signed) run(false);
  }
  try{ window.illu && window.illu.onHiworksSignedIn && window.illu.onHiworksSignedIn(() => setTimeout(() => run(true), 1500)); }catch(e){}
  window.__illuHwContacts = run;
})();
