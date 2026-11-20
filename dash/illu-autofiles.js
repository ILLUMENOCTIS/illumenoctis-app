/* 1.2.260 (user, 18 Nov 2026: "when the email arrives with the material, I want you to be able to do it without me having
   to manually do it myself" · "through Hiworks" · run on Update + every morning · "Any model with a booking card" ·
   "read only emails pertaining to the model cards and leave it read" · zips sorted by their folder names ·
   "I also want a clear indication/notification somewhere to show that a new email has arrived. I also want to be able to
   handle the downloads from the links here as well"):

   Automatic material pickup, PC program only.
   - For every booking card that is not cancelled, deleted or hidden: each material link (WeTransfer, Google Drive,
     Mediaslide package) in an email RECEIVED on her card that was not picked up before is planned with the same
     Get files code (illu.getFilesPlan) and saved, every file ticked, to this computer + Dropbox, in her booking folder:
     photos to the folder the link / zip folder names say (default 1. BOOK), videos to 3. VIDEOS. Never overwrites
     (same name + same size = skipped; a different file with the same name gets " (2)").
   - A link that is on two or more cards' emails goes to the one card whose name is in the link's title, its folder
     names or the email subject. If that is still not clear, nothing is saved and the link is marked "Which model?" -
     the person chooses with Get files.
   - Each link is done once for everyone: card field gf[link] = {at, by, st:'ok'|'fail'|'which', saved, same, failed,
     title, why}; a claim doc autof/<id> keeps two computers from doing the same link at the same time.
   - Runs: after "Update from Hiworks" on the Booking Emails board, after the 5-minute new-email watcher puts a new email
     on a card, and once each morning (the first computer with the program open after 07:00 KST; claim doc autof/morning).
   - What came in: a toast, the bell, and the link chips in the Booking Emails conversation (illu-bemail.js).
   Nothing is sent or deleted; Hiworks is only read. */
(function(){
  'use strict';
  if(window.__illuAutoF) return; window.__illuAutoF = true;
  const ko = () => { try{ return LANG === 'ko'; }catch(e){ return false; } };
  const L = (en, k) => ko() ? k : en;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const me = () => { try{ return ME || ''; }catch(e){ return ''; } };
  const can = () => !!(window.illu && illu.getFilesPlan && illu.getFilesRun && !illu.web);
  const isGet = u => { try{ return !!(window.__illuIsGet && window.__illuIsGet(u)); }catch(e){ return false; } };
  const hid = k => { try{ return !!(k && window.__illuHidK && window.__illuHidK(k)); }catch(e){ return false; } };
  const live = c => !!(c && c.id && !c.del && c.st !== 'canc' && !hid(c.k));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const h32 = s => { let a = 2166136261, b = 5381; s = String(s); for(let i = 0; i < s.length; i++){ const x = s.charCodeAt(i); a = Math.imul(a ^ x, 16777619) >>> 0; b = ((b << 5) + b + x) >>> 0; } return a.toString(36) + b.toString(36); };
  const fold = s => String(s || '').replace(/ł/g, 'l').replace(/Ł/g, 'L').replace(/ø/gi, 'o').replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const words = s => fold(s).split(/[^a-z0-9]+/).filter(Boolean);
  const emOf = c => (c && c.em && Array.isArray(c.em.list)) ? c.em.list : [];
  const excluded = (c, e) => { try{ return !!(window.__illuEmail && window.__illuEmail.excluded && window.__illuEmail.excluded(c, e)); }catch(err){ return false; } };

  /* the material links in the emails she was SENT (an agency's email), newest first */
  function linksOf(c){
    const out = [], seen = new Set();
    for(const e of emOf(c)){
      if(e.dir !== 'in' || excluded(c, e)) continue;
      for(const f of (e.files || [])) if(f && f.url && isGet(f.url) && !seen.has(f.url)){ seen.add(f.url); out.push({url: f.url, e}); }
    }
    return out;
  }
  const doneOf = (c, u) => (c && c.gf && typeof c.gf === 'object') ? c.gf[u] : null;
  /* whose material: her full name, or her first name as a word, in the text */
  function hits(c, text){
    const w = words(c.nm), t = ' ' + words(text).join(' ') + ' ';
    if(!w.length) return 0;
    if(t.includes(' ' + w.join(' ') + ' ')) return 2;
    return w[0].length >= 3 && t.includes(' ' + w[0] + ' ') ? 1 : 0;
  }
  const planTexts = P => [P.title || '', ...(P.groups || []).map(g => g.name || ''), ...(P.groups || []).flatMap(g => (g.files || []).slice(0, 200).map(f => (f.sub || '') + ' ' + (f.name || '')))];
  /* another model named in the files (a first name of a model on the same agency's boards, or on any booking card) while
     hers appears nowhere: returns that name, else '' */
  function otherModel(c, texts){
    if(texts.some(t => hits(c, t))) return '';
    const mine = new Set(words(c.nm));
    const t = ' ' + texts.map(x => words(x).join(' ')).join(' ') + ' ';
    const host = (() => { try{ return new URL(c.k).hostname.replace(/^www\./, ''); }catch(e){ return ''; } })();
    const names = new Set();
    try{ for(const a of AG){ const same = host && (String(a.d || a.domain || a.w || '').includes(host) || (a.boards || []).some(b => String(b.p || '').includes(host)));
      if(!same) continue; for(const b of (a.boards || [])) for(const m of (b.m || [])){ const w = words(m[0])[0]; if(w && w.length >= 4 && !mine.has(w)) names.add(w); } } }catch(e){}
    try{ for(const x of BOOK.values()){ const w = words(x && x.nm)[0]; if(w && w.length >= 4 && !mine.has(w)) names.add(w); } }catch(e){}
    for(const n of names) if(t.includes(' ' + n + ' ')) return n.charAt(0).toUpperCase() + n.slice(1);
    return '';
  }
  function pickOwner(cards, texts){
    const sc = cards.map(c => texts.reduce((a, t) => Math.max(a, hits(c, t)), 0));
    const top = Math.max(...sc); if(!top) return null;
    const best = cards.filter((c, i) => sc[i] === top);
    return best.length === 1 ? best[0] : null;
  }
  /* claim: a doc with my name; wait and read it back - only the computer whose name stayed does the work */
  async function claim(id, ttlMin){
    if(typeof DB === 'undefined' || !DB) return true;
    const doc = DB.doc('autof/' + id), now = Date.now();
    const rd = async () => { try{ const d = await doc.get(); return (typeof docOf === 'function' ? docOf(d) : (d && d.data ? d.data() : d)) || null; }catch(e){ return null; } };
    const cur = await rd();
    if(cur && cur.by && cur.by !== me() && now - Date.parse(cur.at || 0) < ttlMin * 60000) return false;
    const mine = {by: me(), at: new Date(now).toISOString(), n: Math.random().toString(36).slice(2, 8)};
    try{ await doc.set(mine); }catch(e){ return true; }
    await sleep(1800);
    const back = await rd();
    return !back || (back.by === mine.by && back.n === mine.n);
  }

  /* bell + toast */
  const LOGK = 'illu.autof.log';
  const logRead = () => { try{ return JSON.parse(localStorage.getItem(LOGK) || '[]') || []; }catch(e){ return []; } };
  function logAdd(x){ const l = logRead(); l.unshift(x); try{ localStorage.setItem(LOGK, JSON.stringify(l.slice(0, 30))); }catch(e){} }
  const prevExtra = window.__illuNotifExtra;
  window.__illuNotifExtra = () => {
    let base = []; try{ base = prevExtra ? prevExtra() || [] : []; }catch(e){}
    const pad = n => String(n).padStart(2, '0');
    return base.concat(logRead().slice(0, 15).map(l => { const d = new Date(l.at);
      const ts = isNaN(d) ? '' : d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      const what = l.st === 'ok' ? L('📥 Material saved for ', '📥 자료 저장: ') + '<b>' + E(l.nm) + '</b> · ' + E(L(l.saved + ' new files' + (l.same ? ', ' + l.same + ' already there' : ''), '새 파일 ' + l.saved + '개' + (l.same ? ', 이미 있음 ' + l.same : '')))
        : l.st === 'which' ? L('📥 Material link — which model? ', '📥 자료 링크 — 어느 모델? ') + '<b>' + E(l.nm) + '</b>'
        : L('📥 Could not save material for ', '📥 자료 저장 못 함: ') + '<b>' + E(l.nm) + '</b>' + (l.why ? ' · ' + E(l.why) : '');
      return {ts, who: '', html: what + (l.title ? ' · ' + E(l.title) : '') + (l.cid ? ' <button type="button" class="alnb" data-afopen="' + E(l.cid) + '">' + L('Open', '열기') + '</button>' : '')};
    }));
  };
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-afopen]'); if(!b) return; e.preventDefault(); e.stopPropagation(); try{ if(typeof bvOpenFor === 'function') bvOpenFor(b.dataset.afopen); }catch(err){} }, true);
  function tell(x){
    logAdd(x);
    try{ window.__illuChime && window.__illuChime(); }catch(e){}
    const t = x.st === 'ok' ? L('Material saved · ' + x.nm, x.nm + ' 자료 저장됨') : x.st === 'which' ? L('Material link — which model?', '자료 링크 — 어느 모델인가요?') : L('Material not saved · ' + x.nm, x.nm + ' 자료 저장 못 함');
    const b = x.st === 'ok' ? L(x.saved + ' new files' + (x.same ? ' · ' + x.same + ' already there' : '') + ' → ' + (x.folder || ''), '새 파일 ' + x.saved + '개' + (x.same ? ' · 이미 있음 ' + x.same : '') + ' → ' + (x.folder || ''))
      : x.st === 'which' ? L('The link is on more than one model’s emails. Open Booking Emails and press Get files.', '여러 모델 메일에 있는 링크입니다. 부킹 이메일에서 파일 받기를 누르세요.') : (x.why || '');
    try{ window.__illuSysNote && window.__illuSysNote(t, b, () => { try{ typeof bvOpenFor === 'function' && bvOpenFor(x.cid); }catch(e){} }); }catch(e){}
    try{ window.__illuNotifRepaint && window.__illuNotifRepaint(); }catch(e){}
  }

  function mark(c, u, v){
    c.gf = Object.assign({}, (c.gf && typeof c.gf === 'object') ? c.gf : {});
    c.gf[u] = v;
    const ks = Object.keys(c.gf); if(ks.length > 40) for(const k of ks.sort((a, b) => String(c.gf[a].at).localeCompare(String(c.gf[b].at))).slice(0, ks.length - 40)) delete c.gf[k];
    try{ saveBook(c.id, true); }catch(e){}
  }
  const STATE = {busy: false, last: null};
  window.__illuAutoFilesBusy = () => STATE.busy;

  /* one link for one card: plan, take everything, save to this computer + Dropbox */
  async function take(c, u, P){
    const folder = (typeof bvFolderName === 'function') ? bvFolderName(c) : String(c.nm || '');
    const groups = [];
    for(const g of (P.groups || [])){
      const by = new Map();
      for(const f of (g.files || [])){ const t = f.tab2 || g.tab || '1. BOOK'; if(!by.has(t)) by.set(t, []); const o = Object.assign({}, f); delete o.off; delete o.tab2; by.get(t).push(o); }
      for(const [t, files] of by) groups.push({name: g.name, tab: t, main: g.main, files});
    }
    if(!groups.length) return {st: 'fail', why: L('nothing to download at the link', '링크에 받을 파일 없음')};
    const job = 'af' + Date.now();
    const r = await illu.getFilesRun(job, {folder, first: String(c.nm || '').trim()}, groups, ['pc', 'dbx']).catch(e => ({ok: false, failed: [String(e && e.message || e)]}));
    const failed = (r && r.failed) || [];
    const ok = r && r.ok !== false && ((r.saved || 0) + (r.same || 0)) > 0;
    return {st: ok ? 'ok' : 'fail', saved: r.saved || 0, same: r.same || 0, failed: failed.length, why: ok ? (failed.length ? failed.length + L(' not saved', '개 저장 못 함') : '') : String(failed[0] || L('could not download', '받지 못함')).slice(0, 160), folder, dbx: (r.where && r.where.dbx) || null};
  }

  /* cards: the cards to look at (default: every live booking card). Returns {done, which, failed} */
  async function run(cards, why){
    if(!can() || STATE.busy) return null;
    STATE.busy = true;
    const res = {done: 0, which: 0, failed: 0, files: 0};
    try{
      let all = []; try{ all = [...BOOK.values()].filter(live); }catch(e){}
      const look = (cards && cards.length ? cards : all).filter(live);
      /* every card each link is on (so a shared link is decided once) */
      const on = new Map();
      for(const c of all) for(const x of linksOf(c)){ if(!on.has(x.url)) on.set(x.url, []); on.get(x.url).push({c, e: x.e}); }
      const todo = [];
      for(const c of look) for(const x of linksOf(c)) if(!doneOf(c, x.url) && !todo.some(t => t.u === x.url)) todo.push({u: x.url});
      for(const t of todo){
        const list = (on.get(t.u) || []).filter(o => !(o.c.gf && o.c.gf[t.u]));
        if(!list.length) continue;
        if(!await claim(h32(t.u), 30)) continue;
        /* fresh copy of the card(s) - someone may have done it meanwhile */
        const cs = list.map(o => { try{ return BOOK.get(o.c.id) || o.c; }catch(e){ return o.c; } }).filter(c => live(c) && !doneOf(c, t.u));
        if(!cs.length) continue;
        let owner = cs.length === 1 ? cs[0] : null;
        const first = owner ? String(owner.nm || '').trim() : '';
        let P = await illu.getFilesPlan(t.u, first).catch(e => ({ok: false, why: String(e && e.message || e)}));
        if(!owner && P && P.ok){
          const texts = [P.title || '', ...(P.groups || []).map(g => g.name || ''), ...(P.groups || []).flatMap(g => (g.files || []).slice(0, 60).map(f => (f.sub || '') + ' ' + (f.name || '')))];
          owner = pickOwner(cs, texts) || pickOwner(cs, list.map(o => (o.e.subject || '') + ' ' + (o.e.summary || '')));
          if(owner && /mediaslide/i.test(t.u)) P = await illu.getFilesPlan(t.u, String(owner.nm || '').trim()).catch(e => ({ok: false, why: String(e && e.message || e)}));
        }
        const at = new Date().toISOString();
        /* 1.2.268 (user, 20 Nov 2026: "There are also photos and videos of a different model in Illia's card" - a Mazer
           package of KARYNA, sent in the ILLIA email thread, was saved into Illia's folder): before saving, the files must
           not name another model while never naming her. If they do, nothing is saved and the link asks who it is for. */
        if(owner && P && P.ok){
          const other = otherModel(owner, planTexts(P));
          if(other){
            mark(owner, t.u, {at, by: me(), st: 'which', title: P.title || '', why: L('the files are named ' + other + ', not ' + (owner.nm || ''), '파일 이름이 ' + other + '입니다 (' + (owner.nm || '') + ' 아님)'), with: [owner.id]});
            res.which++; tell({at, st: 'which', nm: owner.nm || '', cid: owner.id, title: P.title || '', why: other});
            continue;
          }
        }
        if(!owner){
          for(const c of cs) mark(c, t.u, {at, by: me(), st: 'which', title: P && P.title || '', with: cs.map(x => x.id)});
          res.which++; tell({at, st: 'which', nm: cs.map(c => c.nm).join(' / '), cid: cs[0].id, title: P && P.title || ''});
          continue;
        }
        let v;
        if(!P || !P.ok) v = {st: 'fail', why: String(P && P.why || L('could not read the link', '링크를 읽지 못함')).slice(0, 160)};
        else v = await take(owner, t.u, P);
        mark(owner, t.u, Object.assign({at: new Date().toISOString(), by: me(), title: P && P.title || '', src: P && P.source || ''}, v));
        for(const c of cs) if(c !== owner) mark(c, t.u, {at, by: me(), st: 'other', to: owner.id, nm: owner.nm || ''});
        if(v.st === 'ok'){ res.done++; res.files += v.saved || 0; } else res.failed++;
        if(v.st !== 'ok' || v.saved) tell(Object.assign({at, nm: owner.nm || '', cid: owner.id, title: P && P.title || ''}, v));
        try{ if(typeof bv !== 'undefined' && bv && bv.id === owner.id && typeof bvOpenSrc === 'function') bvOpenSrc(owner, 'dbx', true); }catch(e){}
      }
    } catch(e){ console.warn('autofiles', e); }
    finally { STATE.busy = false; STATE.last = {at: new Date().toISOString(), why, res}; try{ window.__illuBEmailRedraw && window.__illuBEmailRedraw(); }catch(e){} }
    return res;
  }
  window.__illuAutoFiles = run;
  window.__illuAutoFilesOf = (c, u) => doneOf(c, u);

  /* the morning run: the first computer with the program open after 07:00 (Korea time) runs Update from Hiworks once a
     day, which reads every booking card's mail (opening only unread mail about her) and then picks up the material */
  const kday = () => { const d = new Date(Date.now() + 9 * 3600000); return {d: d.toISOString().slice(0, 10), h: d.getUTCHours()}; };
  async function morning(){
    if(!can() || !me()) return;
    try{ if(typeof BOOK === 'undefined' || !BOOK.size) return; }catch(e){ return; }
    const {d, h} = kday(); if(h < 7) return;
    let mk = ''; try{ mk = localStorage.getItem('illu.autof.morning') || ''; }catch(e){}
    if(mk === d) return;
    /* 1.2.268: a computer that could not run it (not signed in to Hiworks) tries again after an hour, not every 15 minutes -
       each try was two saves (82 a day) */
    let tried = 0; try{ tried = +(localStorage.getItem('illu.autof.tried') || 0); }catch(e){}
    if(Date.now() - tried < 60 * 60000) return;
    if(typeof DB !== 'undefined' && DB){
      let cur = null; try{ const x = await DB.doc('autof/morning').get(); cur = typeof docOf === 'function' ? docOf(x) : null; }catch(e){}
      if(cur && cur.d === d && cur.done){ try{ localStorage.setItem('illu.autof.morning', d); }catch(e){} return; }
      if(cur && cur.d === d && cur.by !== me() && Date.now() - Date.parse(cur.at || 0) < 40 * 60000) return;   // someone else is running it (or just tried)
      const mine = {d, by: me(), at: new Date().toISOString(), n: Math.random().toString(36).slice(2, 8)};
      try{ await DB.doc('autof/morning').set(mine); }catch(e){ return; }
      await sleep(2500);
      try{ const b = typeof docOf === 'function' ? docOf(await DB.doc('autof/morning').get()) : mine; if(b && b.n !== mine.n) return; }catch(e){}
    }
    let ok = false;
    try{ localStorage.setItem('illu.autof.tried', String(Date.now())); }catch(e){}
    try{ if(window.__illuBEmailUpdate) ok = await window.__illuBEmailUpdate({auto: true}); }catch(e){}
    if(ok){ try{ localStorage.setItem('illu.autof.morning', d); }catch(e){} }   // not signed in to Hiworks: tried again in 15 minutes
    try{ if(typeof DB !== 'undefined' && DB) await DB.doc('autof/morning').set({d, by: me(), at: new Date().toISOString(), done: !!ok}); }catch(e){}
  }
  if(can()){ setTimeout(morning, 90000); setInterval(morning, 15 * 60000); }
  window.__illuAutoTest = {linksOf, hits, pickOwner, otherModel, planTexts, claim, morning, run, state: () => STATE};
})();
