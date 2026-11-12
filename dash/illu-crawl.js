/* ================= The measurement crawler (owner's computer) =================
   Works through a list of agencies (docs crawlq/<list>), one agency at a time on each of two
   lanes, and for every model on the agency's Women / Men / New faces / Development boards
   reads the profile page once for her measurements and photo.
   - Agencies whose boards are already known: only models without measurements are read.
   - Agencies with no boards yet (or whose stored model links are broken): the home page is
     read for its board links, the boards for their model links, then the profiles.
   Boards read (user, 2026-11-04): Women / Female / Girls and Men / Male / Boys (main, new
   faces, development), New faces, Development, Talent and plain Model boards. Plus-size /
   curve, kids / teens, classic and the like are never read.
   The agency's own contact details (address, e-mail, phone) are read from its website too
   and added to contacts/<domain> only where the agency's card has nothing yet.
   Everything found is saved for everyone as soon as it is found, in small pieces:
     meas/c<agency id>   the measurements (the Directory reads every meas/ document)
     crawlb/<agency id>  boards the crawler found or re-read (the sign-in screen merges them)
     crawl/<agency id>   how it went: done / failed, counts, the reason
   A failed agency is not retried; it waits on the list in crawl/. */
(function(){
  'use strict';
  if(!window.illu || !window.illu.crawlProfile) return;
  const isOwner = () => { try{ return isAdmin(); }catch(e){ return false; } };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const LS = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} } };
  const C = { busy: false, paused: LS.get('illu.crawl.pause') === '1', list: null, done: 0, total: 0, lanes: {}, found: 0, read: 0, t0: 0, last: '' };
  window.__illuCrawl = C;

  /* ---------- which boards matter ---------- */
  const OUT = /plus|curv|kid|child|junior|teen|petit|influenc|actor|actress|creative|artist|classic|mature|silver|sport|fitness|hair|make-?up|stylist|photograph|blog|news|about|contact|become|apply|casting|event|agency|team|instagram|facebook|tiktok|login|privacy|cookie|imprint|impressum|legal|shop|search|lifestyle|commercial|celebrit|parts|special|tattoo|career|job|press|polic|terms|faq|book-?now|video|portfolio-pdf/i;
  const FEM = /(^|[^a-z])(women|woman|female|femmes?|donne|donna|mujer(es)?|damen|frauen|kobiety|dames|ladies|girls|девушк|женщ|жінк|kadın|naiset|kvinder|kvinnor|vrouwen)([^a-z]|$)/i;
  const MAS = /(^|[^a-z])(men|man|male|hommes?|uomini|uomo|hombres?|herren|männer|maenner|mezczyzni|mężczyźni|heren|boys|gentlemen|мужчин|парни|чоловік|erkek|miehet|mænd|män|mannen)([^a-z]|$)/i;
  const TAL = /(^|[^a-z])(talents?|talenti|talentos?|talente)([^a-z]|$)/i;
  const MODB = /(^|[^a-z])(models?|modelle|mod[eè]les|modelos|modelli|mannequins|модели)([^a-z]|$)/i;
  const NEWF = /new[\s_-]*faces?|newfaces|development|(^|[^a-z])dev([^a-z]|$)|scouting|future|fresh|nuov[ie]|nuevos?|neue|nouveaux|nowe|new[\s_-]*wonders|newcomers?/i;
  function classify(href, text){
    let path = ''; try{ path = decodeURIComponent(new URL(href).pathname); }catch(e){ return null; }
    const hay = (text || '') + ' ' + path.replace(/[\/_-]+/g, ' ');
    if(OUT.test(hay)) return null;
    if(!path.replace(/\/+/g, '')) return null;                 // the home page itself
    const f = FEM.test(hay), m = MAS.test(hay), nf = NEWF.test(hay), tal = TAL.test(hay), mb = MODB.test(hay);
    if(!f && !m && !nf && !tal && !mb) return null;
    /* a Talent or Model board on its own must name itself: the link's last folder or its
       words are the board word ("/models", "Our talents") - not a model page under /models/ */
    if(!f && !m && !nf){
      const last = (path.split('/').filter(Boolean).pop() || '').replace(/[_-]+/g, ' ');
      const w = String(text || '').trim();
      const BW = /^(our |all |the )?(models?|modelle|mod[eè]les|modelos|modelli|mannequins|talents?|talenti|talentos?|talente|модели)( board)?$/i;
      if(!BW.test(last) && !BW.test(w)) return null;
    }
    /* a Talent board or a plain Model board says nothing of the sex: kept as "not stated"
       (x marks it as wanted even so) - the sex is never guessed */
    return {g: f && !m ? 'F' : m && !f ? 'M' : '?', t: nf ? (/dev/i.test(hay) ? 'development' : 'newfaces') : tal && !f && !m ? 'unlabelled' : 'main',
      x: !f && !m && !nf ? (tal ? 'talent' : 'model') : undefined, d: (text || path).trim().slice(0, 60)};
  }
  const WANT_T = new Set(['main', 'newfaces', 'development', 'unlabelled']);
  const boardWanted = b => b && WANT_T.has(b.t || 'unlabelled') && !/curv|plus/i.test(b.d || '') && (b.g === 'F' || b.g === 'M' || b.t === 'newfaces' || b.t === 'development' || !!b.x);
  const hrefOf = (b, m) => m[1].charAt(0) === '|' ? m[1].slice(1) : b.p + m[1];
  /* a board is read again when most of its links are broken, or most of its "names" are really the
     measurements (2026-11-05: sites that put the measurements table inside the model's link -
     BIRDS, MGM, ROW... - were stored as "HEIGHT 178 cm / 5'10" BUST ..." instead of the name) */
  const MEASNAME = /\b(height|bust|chest|waist|hips?|shoes?)\b|\d{2,3}\s*cm\b/i;
  const broken = b => b.m.length && (b.m.filter(m => /\/null\//.test(hrefOf(b, m))).length > b.m.length / 2 ||
    b.m.filter(m => MEASNAME.test(String(m[0] || ''))).length > b.m.length / 3 ||
    /* listed without names (picture-only links, the name beside them - Contrebande): read again */
    b.m.filter(m => !String(m[0] || '').trim()).length > b.m.length / 3);

  /* ---------- saving, in small pieces ---------- */
  async function save(path, data){ for(let k = 0; k < 3; k++){ try{ await DB.doc(path).set(data); return true; }catch(e){ await wait(2000 * (k + 1)); } } return false; }
  async function read(path){ try{ const s = await DB.doc(path).get(); return s && s.exists ? s.data() : null; }catch(e){ return null; } }

  /* ---------- the agency's contact details ----------
     Added to the agency's card only where it has nothing yet: a new e-mail address, a phone
     number nobody has typed, a street address when the card has none. Nothing already there
     is changed or removed. */
  async function mergeContacts(a, r){
    const dom = a.domain; if(!dom || !r || r.error) return null;
    const path = ctsDoc(dom);
    const cur = (await read(path)) || {};
    const rows = Array.isArray(cur.c) ? cur.c.filter(Boolean).map(ctsClean) : [];
    const ph = Array.isArray(cur.ph) ? cur.ph.filter(Boolean) : [];
    const dg = v => String(v || '').replace(/[^\d]/g, '');
    const haveE = new Set(rows.map(x => x.e.toLowerCase()).filter(Boolean));
    const haveP = rows.map(x => dg(x.p)).concat(ph.map(x => dg(x.v))).filter(Boolean);
    const same = (x, y) => x === y || (x.length >= 8 && y.length >= 8 && (x.endsWith(y.slice(-8)) || y.endsWith(x.slice(-8))) && Math.abs(x.length - y.length) <= 3);
    const got = {e: 0, p: 0, a: false};
    for(const e of (r.emails || []).slice(0, 6)) if(!haveE.has(e)){ rows.push({e: e, n: '', r: 'From the website', p: ''}); haveE.add(e); got.e++; }
    for(const p of (r.phones || []).slice(0, 3)){ const d = dg(p); if(d && !haveP.some(x => same(x, d))){ rows.push({e: '', n: 'Main line', r: 'From the website', p: p}); haveP.push(d); got.p++; } }
    let addr = String(cur.a || '').trim();
    if(!addr && r.address){ addr = r.address; got.a = true; }
    if(got.e || got.p || got.a){
      await save(path, Object.assign({}, cur, {d: cur.d || dom, c: rows, ph: ph, a: addr}));
      try{ CONTACTS.set(dom, rows); ADDR.set(dom, addr); if(typeof repaintContacts === 'function') repaintContacts(); }catch(e){}
    }
    return got;
  }

  /* ---------- one agency ---------- */
  async function agency(a, lane){
    const L = C.lanes[lane] = {name: a.name, step: 'starting', read: 0, of: 0, ok: 0};
    const t0 = Date.now();
    const st = {state: 'running', name: a.name, at: new Date().toISOString(), boards: 0, models: 0, read: 0, measured: 0, gone: 0, nomeas: 0, errors: 0, found: [], error: '', ver: 1};
    /* contact details first: worth having even when the boards cannot be read */
    if(illu.crawlContacts){
      const home0 = a.site || (a.domain ? 'https://' + a.domain : '');
      if(home0){
        L.step = 'reading contact details';
        try{ const r = await illu.crawlContacts(home0); const g = await mergeContacts(a, r);
          st.contacts = r && r.error ? {error: r.error} : {emails: (r.emails || []).length, phones: (r.phones || []).length, address: !!r.address, added: g, pages: r.pages || []}; }
        catch(e){ st.contacts = {error: String(e && e.message || e).slice(0, 120)}; }
      }
    }
    let boards = a.boards.filter(boardWanted);
    const brk = boards.filter(broken);
    /* no boards, or the stored links are broken: find the boards on the agency's own site */
    if(!boards.length || brk.length){
      L.step = 'finding boards';
      const found = [];
      const reread = [];
      for(const b of brk){ const r = await illu.crawlBoard(b.u); if(r && r.models && r.models.length >= 3) reread.push({u: b.u, d: b.d, g: b.g, t: b.t, m: r.models.map(([h, n]) => [n || '', '|' + h])}); }
      if(!a.boards.length){
        const home = a.site || (a.domain ? 'https://' + a.domain : '');
        if(!home){ st.state = 'failed'; st.error = 'no website'; }
        else {
          const r = await illu.crawlLinks(home);
          if(!r || r.error){ st.state = 'failed'; st.error = 'home page: ' + ((r && r.error) || 'no answer'); }
          else {
            let host = ''; try{ host = new URL(r.at || home).host.replace(/^www\./, ''); }catch(e){}
            const seen = new Set();
            const cand = [];
            for(const [h, t] of r.links || []){
              let u; try{ u = new URL(h); }catch(e){ continue; }
              if(u.host.replace(/^www\./, '') !== host) continue;
              const k = u.href.replace(/[#?].*$/, '').replace(/\/$/, ''); if(seen.has(k)) continue;
              const c = classify(u.href, t); if(!c) continue;
              seen.add(k); cand.push(Object.assign({u: u.href.replace(/#.*$/, '')}, c));
            }
            /* a board's own model pages carry the board's word too (/girls/camille): keep the
               board, drop the pages under it, shallowest first */
            const pth = u => { try{ return new URL(u).pathname.replace(/\/$/, ''); }catch(e){ return u; } };
            cand.sort((x, y) => pth(x.u).split('/').length - pth(y.u).split('/').length);
            for(let i = cand.length - 1; i >= 0; i--) if(cand.some((o, j) => j !== i && pth(o.u) && pth(cand[i].u).startsWith(pth(o.u) + '/'))) cand.splice(i, 1);
            st.found = cand.slice(0, 14).map(c => c.d + ' ' + c.u);
            const have = new Set();
            for(const c of cand.slice(0, 14)){
              L.step = 'reading board ' + c.d;
              const br = await illu.crawlBoard(c.u);
              const ms = (br && br.models || []).filter(([h]) => !have.has(h) && !OUT.test(h));
              if(ms.length < 3) continue;
              ms.forEach(([h]) => have.add(h));
              found.push(Object.assign({u: c.u, d: c.d, g: c.g, t: c.t}, c.x ? {x: c.x} : {}, {m: ms.map(([h, n]) => [n || '', '|' + h])}));
            }
            if(!found.length){ st.state = 'failed'; st.error = cand.length ? 'boards found but no model links on them (' + cand.length + ')' : 'no Women / Men / New faces / Development / Talent / Model board found on the home page'; }
          }
        }
      }
      const add = reread.concat(found);
      if(add.length){
        /* boards read again replace their old copy; the agency's other crawled boards stay */
        const prevB = await read('crawlb/' + a.id);
        const keep = (prevB && Array.isArray(prevB.boards) ? prevB.boards : []).filter(o => !add.some(n => n.u === o.u));
        await save('crawlb/' + a.id, {boards: keep.concat(add), at: new Date().toISOString(), name: a.name});
        for(const nb of add){ const i = a.boards.findIndex(o => o.u === nb.u); const b = Object.assign({p: ''}, nb, {crawled: true}); if(i >= 0) a.boards[i] = b; else a.boards.push(b); }
        window.__illuAGv = (window.__illuAGv || 0) + 1;      // the Directory rebuilds its lists from the new boards
        boards = a.boards.filter(boardWanted).filter(b => !broken(b));
      }
    }
    st.boards = boards.length;
    if(st.state !== 'failed'){
      /* the profiles not measured yet */
      const todo = [], seen = new Set();
      /* the same model on several boards (London and Paris) is read once */
      const core = window.__illuCoreOf || (h => h);
      const person = new Map();
      for(const b of boards) for(const m of b.m){
        const h = hrefOf(b, m); if(!/^https?:/i.test(h)) continue;
        const k = normKey(h); if(seen.has(k)) continue; seen.add(k);
        const pk = String(m[0] || '').toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/g, '') + '|' + core(h);
        const rec = MEAS.get(k), done = !!(rec && (rec[0] != null || rec[1] != null));   // 1.2.146: only a shoe size on file (2pm.dk) is read again
        const p = person.get(pk) || {done: false, todo: null};
        if(done) p.done = true; else if(!p.todo) p.todo = [k, h];
        person.set(pk, p);
      }
      for(const p of person.values()) if(!p.done && p.todo) todo.push(p.todo);
      st.models = seen.size;
      L.of = todo.length; L.step = 'reading profiles';
      const prev = await read('meas/c' + a.id);
      const E = Object.assign({}, (prev && prev.e) || {});
      let since = 0;
      for(const [k, h] of todo){
        while(C.paused) await wait(2000);
        const r = await illu.crawlProfile(h);
        st.read++; L.read++; C.read++;
        if(r && r.ok && r.rec){ E[k] = r.rec; if(window.__measPut) window.__measPut(k, r.rec); else MEAS.set(k, r.rec); st.measured++; L.ok++; C.found++; since++; }
        else if(r && r.gone) st.gone++;
        else if(r && /no measurements/.test(r.error || '')) st.nomeas++;
        else st.errors++;
        /* the agency's pages give nothing: stop early rather than read hundreds of pages */
        if(st.read === 25 && !st.measured && st.errors >= 25){ st.state = 'failed'; st.error = 'stopped: the first 25 profiles did not answer (network) ' + (r && r.error || ''); break; }
        if(st.read === 25 && !st.measured){ st.state = 'failed'; st.error = 'no measurements found on the first 25 profiles (' + (r && r.error || '') + ')'; break; }
        if(since >= 30){ since = 0; await save('meas/c' + a.id, {e: E, at: new Date().toISOString(), name: a.name}); }
        await wait(600);
      }
      if(since || Object.keys(E).length) await save('meas/c' + a.id, {e: E, at: new Date().toISOString(), name: a.name});
      if(st.state !== 'failed') st.state = 'done';
    }
    st.ms = Date.now() - t0; st.at = new Date().toISOString();
    /* a network failure is tried again on later runs - three times at most, then it stays failed and is
       shown in the note like any other failure */
    if(st.state === 'failed' && window.illuTransient && window.illuTransient(st.error)){
      let prev = null; try{ prev = await read('crawl/' + a.id); }catch(e){}
      st.tries = ((prev && prev.state === 'failed' && prev.tries) || 0) + 1;
    }
    await save('crawl/' + a.id, st);
    C.last = a.name + ': ' + (st.state === 'done' ? st.measured + ' measured of ' + st.read + ' read' : 'failed - ' + st.error);
    delete C.lanes[lane];
    return st;
  }

  /* ---------- the list ---------- */
  /* only one computer crawls a list: the one holding crawllock/<list>, which it renews every
     minute. Another computer that wakes up later sees a fresh lock and waits; a lock not renewed
     for 4 minutes (that computer closed or slept) can be taken over. */
  let ME_ID = LS.get('illu.crawl.me'); if(!ME_ID){ ME_ID = 'c' + Math.random().toString(36).slice(2, 10); LS.set('illu.crawl.me', ME_ID); }
  C.me = ME_ID;
  async function takeLock(listId){
    const l = await read('crawllock/' + listId);
    if(l && l.by !== ME_ID && Date.now() - (+new Date(l.beat) || 0) < 240000) return false;
    await save('crawllock/' + listId, {by: ME_ID, beat: new Date().toISOString()});
    await wait(1500);
    const l2 = await read('crawllock/' + listId);
    return !!(l2 && l2.by === ME_ID);
  }
  async function run(listId){
    if(C.busy || !isOwner()) return;
    C.busy = true; C.t0 = Date.now();
    let beat = 0;
    try{
      if(!(await takeLock(listId))){ C.waiting = true; paint(); setTimeout(() => run(listId), 300000); return; }
      C.waiting = false;
      beat = setInterval(() => save('crawllock/' + listId, {by: ME_ID, beat: new Date().toISOString()}), 60000);
      const q = await read('crawlq/' + listId);
      if(!q || !Array.isArray(q.ids)) return;
      C.list = listId; C.total = q.ids.length; C.done = 0; C.found = 0; C.read = 0;
      if(measState === 'idle') await loadMeas();
      for(let n = 0; n < 40 && measState === 'loading'; n++) await wait(500);
      const byId = new Map(AG.map(a => [String(a.id), a]));
      const left = [];
      for(const id of q.ids){
        const s = await read('crawl/' + id);
        if(s && (s.state === 'done' || (s.state === 'failed' && (!(window.illuTransient && window.illuTransient(s.error)) || (s.tries || 0) >= 3)))){ C.done++; continue; }
        const a = byId.get(String(id)); if(a) left.push(a); else C.done++;
      }
      paint();
      /* two lanes, never the same site on both */
      const lane = async n => {
        while(left.length){
          const a = left.shift();
          /* done meanwhile by another computer (after a takeover): skip it */
          const s0 = await read('crawl/' + a.id); if(s0 && (s0.state === 'done' || (s0.state === 'failed' && (!(window.illuTransient && window.illuTransient(s0.error)) || (s0.tries || 0) >= 3)))){ C.done++; continue; }
          try{ await agency(a, n); }catch(e){ await save('crawl/' + a.id, {state: 'failed', name: a.name, error: 'stopped: ' + String(e && e.message || e).slice(0, 120), at: new Date().toISOString()}); }
          C.done++; paint();
          try{ if(VIEW === 'dir') refresh(); }catch(e){}
        }
      };
      await Promise.all([lane(0), lane(1)]);
      await save('crawlq/' + listId, Object.assign({}, q, {finished: new Date().toISOString(), took: Math.round((Date.now() - C.t0) / 60000) + ' min'}));
    } finally { if(beat) clearInterval(beat); if(!C.waiting) save('crawllock/' + listId, {by: ME_ID, beat: '1970-01-01T00:00:00Z', released: new Date().toISOString()}); C.busy = false; paint(); }
  }
  window.__illuCrawl.start = run;
  window.__illuCrawl.pause = on => { C.paused = on; LS.set('illu.crawl.pause', on ? '1' : ''); paint(); };

  /* ---------- a small status card for the owner ---------- */
  let box = null, DISMISSED = false, DONEAT = 0, WASBUSY = false;
  function paint(){
    if(!isOwner()) return;
    if(!box){
      box = document.createElement('div'); box.id = 'illucrawl';
      box.innerHTML = '<b>Measurement crawl</b><span class="cl1"></span><span class="cl2"></span><button type="button" class="clp"></button><button type="button" class="clx" aria-label="Close" title="Close">×</button>';
      document.body.appendChild(box);
      box.querySelector('.clx').addEventListener('click', () => { DISMISSED = true; paint(); });
      box.querySelector('.clp').addEventListener('click', () => window.__illuCrawl.pause(!C.paused));
    }
    /* temporary (user, 2026-11-04): a finished crawl's note goes after 8 seconds, and × closes it any time;
       it comes back when a new crawl starts */
    if(C.busy && !WASBUSY){ DISMISSED = false; DONEAT = 0; }
    WASBUSY = !!C.busy;
    if(!C.busy && C.total && !DONEAT) DONEAT = Date.now();
    const doneLong = !C.busy && DONEAT && Date.now() - DONEAT > 8000;
    box.hidden = DISMISSED || doneLong || (!C.busy && !C.total && !C.waiting);
    box.querySelector('.cl1').textContent = C.waiting ? 'Another computer is crawling this list - waiting' : (C.done + ' of ' + C.total + ' agencies') + (C.busy ? '' : ' · finished') + ' · ' + C.found.toLocaleString() + ' measured';
    box.querySelector('.cl2').textContent = Object.values(C.lanes).map(l => l.name + (l.of ? ' ' + l.read + '/' + l.of : ' · ' + l.step)).join('  ·  ') || C.last;
    box.querySelector('.clp').textContent = C.paused ? 'Resume' : 'Pause';
    box.querySelector('.clp').hidden = !C.busy;
  }
  setInterval(paint, 3000);
  const css = document.createElement('style');
  css.textContent = '#illucrawl{position:fixed;right:16px;bottom:34px;z-index:95;display:flex;flex-direction:column;gap:2px;max-width:420px;padding:10px 14px;border-radius:12px;background:var(--surf);border:1px solid var(--line);box-shadow:0 10px 30px rgba(0,0,0,.14);font-size:12px;color:var(--ink)}' +
    '#illucrawl b{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--acc)}#illucrawl .cl2{color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#illucrawl{padding-right:34px!important}#illucrawl .clx{position:absolute;right:6px;top:6px;width:22px;height:22px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--mut);font-size:16px;line-height:22px;cursor:pointer}#illucrawl .clx:hover{background:var(--surf2);color:var(--acc)}' +
    '#illucrawl .clp{position:absolute;right:34px;top:8px;border:1px solid var(--line);background:var(--surf2);border-radius:999px;font:inherit;font-size:11px;padding:2px 10px;cursor:pointer;color:inherit}';
  document.head.appendChild(css);
  /* starts on its own on the owner's computer, a minute after the program opens */
  setTimeout(() => { if(isOwner()) run('eu1'); }, 60000);
})();
