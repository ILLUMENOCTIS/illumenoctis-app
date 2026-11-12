/* ---- lamp priority (2026-11-04, user rules) ----
   1. Whoever lights a lamp on a model FIRST holds the card. Only that person's lamp
      decides where the card is filed: Interested, Pending or Ruled out - on Lumen and
      on Communicatus alike.
   2. Anyone else's lamp on the same model only lights their own lamp (their vote);
      it never moves the card.
   3. When the holder puts their own lamp out, the card passes to whoever lit next.
   4. Removing the card ("remove" on Lumen / Communicatus) is for the holder only, and
      for Paul always. It puts out EVERY lamp on that model, so the next lamp lit
      starts a new holder.
   "First" = the moment a lamp was first lit, kept to the millisecond in pmarks/<id>.f.
   Lamps lit before this existed fall back to the day-and-minute already stored (t). */
(function(){
  const PAUL = '3944423e-bc9c-45d6-a510-1a897e52ae92';
  const FIRST = new Map();
  let LOADED = false;                        // the lamp records have been read from the store once                  // pid -> Map(key -> ms first lit)
  const isPaul = () => !!ME && (ME === PAUL ||
    String((PEOPLE.get(ME) || {}).n || '').trim().toLowerCase() === 'paul');
  const tms = s => { if(!s) return Infinity; const x = Date.parse(String(s).replace(' ', 'T'));
    return isNaN(x) ? Infinity : x; };
  function firstAt(pid, key){
    const f = FIRST.get(pid); if(f && f.has(key)) return f.get(key);
    const mk = PEERMARKS.get(pid) || {};
    const t = (pid === ME ? MARKAT.get(key) : null) || (mk.t && mk.t.get(key));
    if(t) return tms(t);
    return tms(mk.m && mk.m.get(key));
  }
  /* who holds this model, and with which lamp */
  function holder(key){
    let best = null;
    const see = (pid, v) => {
      if(!v) return;
      const at = firstAt(pid, key);
      if(!best || at < best.at || (at === best.at && pid < best.pid)) best = {pid: pid, v: v, at: at};
    };
    for(const [pid, mk] of PEERMARKS){
      if(!PEOPLE.has(pid) || pid === ME) continue;
      see(pid, mk.e.get(key));
    }
    if(ME && PEOPLE.has(ME)) see(ME, MARKS.get(key));
    return best;
  }
  window.lampHolder = holder;
  /* the card's lamp for everyone = the holder's lamp */
  boardMarks = function(){
    if(SHAREDC) return SHAREDC;
    const keys = new Set();
    for(const [pid, mk] of PEERMARKS) if(PEOPLE.has(pid) && pid !== ME) for(const k of mk.e.keys()) keys.add(k);
    for(const k of MARKS.keys()) keys.add(k);
    const out = new Map();
    for(const k of keys){ const h = holder(k); if(h) out.set(k, h.v); }
    /* lit before IDs existed and nobody has lit them since */
    if(ME) for(const [k, v] of LEGACY.e) if(!out.has(k)) out.set(k, v);
    SHAREDC = out;
    return out;
  };
  /* Lumen still lists only the models YOU lit, but files each under the holder's lamp */
  sharedMarks = function(){
    if(!PRIV()) return boardMarks();
    const b = boardMarks(), out = new Map();
    for(const [k, v] of MARKS) out.set(k, b.get(k) || v);
    return out;
  };
  /* keep the first-lit moment, to the millisecond, beside the lamp itself */
  const myFirst = () => { let f = ME ? FIRST.get(ME) : null; if(!f){ f = new Map(); if(ME) FIRST.set(ME, f); } return f; };
  const setMark0 = setMark;
  setMark = async function(key, val, about){
    const had = MARKS.get(key) || null;
    const willBe = had === val ? null : val;
    if(SIGNED() && ME){
      if(!had && willBe) myFirst().set(key, Date.now());
      if(had && !willBe) myFirst().delete(key);
    }
    return setMark0(key, val, about);
  };
  const saveMyMarks0 = saveMyMarks;
  saveMyMarks = async function(key){
    if(!DB || !SIGNED()) return;
    if(!ME) return saveMyMarks0(key);
    const e = {}, t = {}, mm = {}, f = {};
    const ex = myLampRec(), mf = myFirst();
    /* the store not read yet (a lamp pressed in the first moments): the first-lit times already
       stored are kept, never replaced by an empty list */
    if(!LOADED){
      try{ const cur = docOf(await DB.doc('pmarks/' + ME).get()); const cf = (cur && cur.f) || {};
        for(const [k, v] of Object.entries(cf)) if(typeof v === 'number' && !mf.has(k)) mf.set(k, v); }catch(err){}
    }
    for(const [k, v] of MARKS) e[k] = v;
    for(const [k, v] of MARKAT) t[k] = v;
    for(const [k, v] of ex.m) if(MARKS.has(k)) mm[k] = v;
    for(const [k, v] of mf) if(MARKS.has(k)) f[k] = v;
    PEERMARKS.set(ME, {e: new Map(MARKS), t: new Map(MARKAT), m: ex.m});
    try{ await DB.doc('pmarks/' + ME).set({e: e, t: t, m: mm, f: f}); }catch(err){}
  };
  /* Read every lamp record first, then swap it in at once - the page's own loader empties
     the map before it reads, and for that moment nobody looked like the holder. */
  loadPeerMarks = async function(){
    if(!DB) return;
    const keepMine = ME && FIRST.get(ME) && (Date.now() - (LIVE.mineAt || 0)) < (typeof LIVEHOLD !== 'undefined' ? LIVEHOLD : 4000);
    const mineF = keepMine ? new Map(FIRST.get(ME)) : null;
    let snap;
    try{ snap = await DB.collection('pmarks').limit(20000).get(); }catch(e){ return; }
    const next = new Map(), nextF = new Map();
    for(const d of ((snap && snap.docs) ? snap.docs : (snap || []))){
      const v = docOf(d);
      const pid = realPid(d.id);
      if(GONEID.has(pid)) continue;
      const cur = next.get(pid) || {e: new Map(), t: new Map(), m: new Map()};
      for(const [k, x] of Object.entries((v && v.e) || {})) if(x && !cur.e.has(k)) cur.e.set(k, x);
      for(const [k, x] of Object.entries((v && v.t) || {})) if(x && !cur.t.has(k)) cur.t.set(k, x);
      for(const [k, x] of Object.entries((v && v.m) || {})) if(x && !cur.m.has(k)) cur.m.set(k, x);
      next.set(pid, cur);
      const f = nextF.get(pid) || new Map();
      for(const [k, x] of Object.entries((v && v.f) || {})) if(typeof x === 'number' && !f.has(k)) f.set(k, x);
      nextF.set(pid, f);
    }
    PEERMARKS.clear(); for(const [k, v] of next) PEERMARKS.set(k, v);
    LOADED = true;
    FIRST.clear(); for(const [k, v] of nextF) FIRST.set(k, v);
    if(mineF) FIRST.set(ME, mineF);
    sharedDirty();
  };
  /* your own lamp lights; the holder's lamp (the one the card is filed under) shows as
     the team lamp when it is not yours */
  function fixBox(box){
    const key = box.dataset.mk; if(!key) return;
    const eff = lampOf(key), mine = MARKS.get(key) || '';
    box.querySelectorAll('i[data-v]').forEach(i => {
      const v = i.dataset.v;
      const on = (!!eff && v === eff) || (!!mine && v === mine);
      const team = !!eff && v === eff && mine !== eff;
      if(i.classList.contains('on') !== on) i.classList.toggle('on', on);
      if(i.classList.contains('team') !== team) i.classList.toggle('team', team);
      const vote = !!mine && v === mine && v !== eff;
      if(i.classList.contains('vote') !== vote) i.classList.toggle('vote', vote);
    });
    const h = eff ? holder(key) : null;
    const who = h && PEOPLE.get(h.pid);
    const tip = who ? (h.pid === ME ? 'You lit this first - your lamp decides where the card goes'
                                    : who.n + ' lit this first - their lamp decides where the card goes') : '';
    if(box.dataset.holder !== tip){ box.dataset.holder = tip; if(tip) box.setAttribute('data-holdtip', tip); else box.removeAttribute('data-holdtip'); }
  }
  function fixAll(root){
    (root || document).querySelectorAll('.mk[data-mk]').forEach(fixBox);
  }
  window.lampFix = fixAll;
  const paintMark0 = paintMark;
  paintMark = function(key){
    const r = paintMark0(key);
    try{ document.querySelectorAll('.mk[data-mk="' + CSS.escape(key) + '"]').forEach(fixBox); }catch(e){}
    return r;
  };
  /* only what was just drawn is looked at (it used to repaint every lamp in the page each time) */
  let fixT = 0, roots = new Set();
  const mo = new MutationObserver(ms => {
    for(const m of ms) for(const n of m.addedNodes){
      if(n.nodeType === 1 && (n.matches('.mk') || (n.firstElementChild && n.querySelector('.mk')))) roots.add(n);
    }
    if(roots.size && !fixT) fixT = setTimeout(() => { fixT = 0; const rs = roots; roots = new Set();
      for(const r of rs){ if(!r.isConnected) continue; try{ if(r.matches('.mk[data-mk]')) fixBox(r); else fixAll(r); }catch(e){} } }, 0);
  });
  try{ mo.observe(document.body, {childList: true, subtree: true}); }catch(e){}
  const st = document.createElement('style');
  st.textContent = '.mk i.vote::after{opacity:1}';
  document.head.appendChild(st);

  /* ---- removing the card: holder or Paul; it puts out everybody's lamp ---- */
  let armed = '';
  async function clearAll(key, nm){
    const tasks = [];
    for(const [pid, mk] of PEERMARKS){
      if(pid === ME || !mk.e.has(key)) continue;
      mk.e.delete(key); mk.t.delete(key); if(mk.m) mk.m.delete(key);
      const f = FIRST.get(pid); if(f) f.delete(key);
      /* that person's record as it is in the store NOW, with only this one lamp taken out - so a
         lamp they lit a moment ago (not yet seen here) is not wiped with it */
      tasks.push((async () => {
        let cur = null;
        try{ cur = docOf(await DB.doc('pmarks/' + pid).get()); }catch(e){ cur = null; }
        if(!cur){
          cur = {e: {}, t: {}, m: {}, f: {}};
          for(const [k, v] of mk.e) cur.e[k] = v;
          for(const [k, v] of mk.t) cur.t[k] = v;
          if(mk.m) for(const [k, v] of mk.m) if(mk.e.has(k)) cur.m[k] = v;
          if(f) for(const [k, v] of f) if(mk.e.has(k)) cur.f[k] = v;
        }
        for(const part of ['e', 't', 'm', 'f']){ if(cur[part] && typeof cur[part] === 'object') delete cur[part][key]; }
        await DB.doc('pmarks/' + pid).set({e: cur.e || {}, t: cur.t || {}, m: cur.m || {}, f: cur.f || {}});
      })().catch(() => {}));
    }
    await Promise.all(tasks);
    sharedDirty();
    const mine = MARKS.get(key);
    if(mine) await setMark(key, mine, {nm: nm || '', url: key});   // your own lamp, logged as usual
    else { refresh(); }
  }
  window.addEventListener('click', e => {
    const d = e.target.closest && e.target.closest('[data-litdel]');
    if(!d || !SIGNED()) return;
    const k = d.dataset.litdel;
    const h = holder(k);
    if(!h) return;                                  // nobody has lit it: the page's own rule-out stands
    const mayRemove = h.pid === ME || isPaul();
    e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    if(!mayRemove){
      const who = (PEOPLE.get(h.pid) || {}).n || 'the person who lit it first';
      try{ siteToast(typeof LANG !== 'undefined' && LANG === 'ko' ? who + ' 님(처음 램프를 켠 사람) 또는 Paul만 이 카드를 삭제할 수 있습니다'
        : 'Only ' + who + ' (lit this first) or Paul can remove this card'); }catch(err){}
      return;
    }
    if(armed !== k){
      armed = k; litArm = k; refresh();
      setTimeout(() => { if(armed === k){ armed = ''; litArm = ''; refresh(); } }, 4000);
      return;
    }
    armed = ''; litArm = '';
    clearAll(k, d.dataset.nm).then(() => refresh(), () => refresh());
  }, true);
})();
