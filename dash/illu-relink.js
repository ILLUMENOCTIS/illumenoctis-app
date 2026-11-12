/* ================= Moved model pages (1.2.169) =================
   User, 13 Nov 2026: "this is the proper link for the model. The link on the card sent me to [the agency's home page].
   ... go through the other models related to this website and double check to make sure the photos and links are all
   correct."
   An agency can move every model page to a new address (Boss Models, Nov 2026: /joburg/women/development/<id>/<name>
   became /johannesburg/futurewave/women/<id>/<name>). The model keeps her key (votes, likes, notes stay with her); only
   where her link opens changes:
     mlinkb/<hash(domain)>  {d, e: {oldKey: newUrl}, at, n, how}   found from the agency's own sitemap
     mlink/<hash(key)>      {f: oldKey, t: newUrl, by, at}           pasted by hand (wins)
   - her name / "↗" links and her photos follow the new address;
   - when her photos say her page moved, the agency's sitemap is read once a day (the program's own reader) and every
     model of that agency is matched: the same profile number = the same girl. A name match alone is used only when the
     name is unique on both sides AND her stored photo already comes from that new profile number - never a guess;
   - when no new address is found, the photo view asks for it ("Paste her new link"). */
(function(){
  'use strict';
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const nk = u => { try{ return typeof normKey === 'function' ? normKey(u) : u; }catch(e){ return u; } };
  const hash = s => { let h = 5381, g = 2166136261; s = String(s); for(let i = 0; i < s.length; i++){ const c = s.charCodeAt(i); h = ((h << 5) + h + c) | 0; g = Math.imul(g ^ c, 16777619); } return (h >>> 0).toString(36) + (g >>> 0).toString(36); };
  const db = () => { try{ return typeof DB !== 'undefined' ? DB : null; }catch(e){ return null; } };
  const me = () => { try{ return ME || ''; }catch(e){ return ''; } };
  const AUTO = new Map(), HAND = new Map();       // oldKey -> newUrl
  const linkOf = k => { const x = nk(k); return HAND.get(x) || AUTO.get(x) || ''; };
  window.__illuLinkOf = linkOf;
  function listen(){
    const d = db(); if(!d){ setTimeout(listen, 400); return; }
    d.collection('mlinkb').onSnapshot(s => { AUTO.clear(); for(const x of s.docs){ const v = x.data() || {}; for(const k in (v.e || {})) if(v.e[k]) AUTO.set(k, v.e[k]); } paint(); }, () => {});
    d.collection('mlink').onSnapshot(s => { HAND.clear(); for(const x of s.docs){ const v = x.data() || {}; if(v.f && v.t) HAND.set(v.f, v.t); } paint(); }, () => {});
  }
  listen();
  function paint(){ try{ if(window.__illuFvNow && window.__illuFvNow()) { const b = document.getElementById('illumv'); if(b && !b.hidden) drawAsk(); } }catch(e){} }

  /* ---------- her links follow the new address ---------- */
  function fix(a){
    const h = a.getAttribute('href'); if(!h || !/^https?:/i.test(h)) return;
    const t = linkOf(h); if(t && t !== h){ a.dataset.illuOld = h; a.setAttribute('href', t); }
  }
  ['pointerdown', 'click', 'auxclick', 'keydown'].forEach(ev => document.addEventListener(ev, e => { const a = e.target.closest && e.target.closest('a[href]'); if(a) fix(a); }, true));

  /* ---------- her photos follow it too; a page that moved is looked up ---------- */
  const TRIED = new Map();
  const domOf = u => { try{ return new URL(u).host.replace(/^www\./, '').toLowerCase(); }catch(e){ return ''; } };
  const LS = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} } };
  if(window.illu && window.illu.modelPhotos && !window.illu.__relinkWrapped){
    const orig = window.illu.modelPhotos.bind(window.illu);
    window.illu.__relinkWrapped = true;
    window.illu.modelPhotos = async page => {
      const t = linkOf(page);
      const r = await orig(t || page);
      if(r && r.why === 'moved' && !t){
        const dom = domOf(page);
        await relinkOnce(dom);
        const t2 = linkOf(page);
        if(t2) return orig(t2);
        try{ window.__illuMovedAsk && window.__illuMovedAsk(page); }catch(e){}
      }
      return r;
    };
  }
  function relinkOnce(dom){
    if(!dom) return Promise.resolve(null);
    if(TRIED.has(dom)) return TRIED.get(dom);
    const day = new Date().toISOString().slice(0, 10);
    if(LS.get('illu.relink.' + dom) === day) return Promise.resolve(null);
    const p = relink(dom).then(r => { LS.set('illu.relink.' + dom, day); return r; }, () => null);
    TRIED.set(dom, p); return p;
  }

  /* ---------- matching an agency's old addresses to its new ones ---------- */
  const idsOf = u => { let p = ''; try{ p = decodeURIComponent(new URL(u).pathname); }catch(e){} return (p.match(/\d{4,}/g) || []); };
  const slugOf = u => { let p = ''; try{ p = decodeURIComponent(new URL(u).pathname); }catch(e){} const seg = p.split('/').filter(Boolean).pop() || ''; return seg.toLowerCase().replace(/\d{4,}/g, '').replace(/[^a-z0-9]+/g, ''); };
  const segs = u => { try{ return new URL(u).pathname.toLowerCase().split('/').filter(Boolean); }catch(e){ return []; } };
  const near = (a, b) => { const x = segs(a), y = new Set(segs(b)); let n = 0; for(const s of x) if(y.has(s) || [...y].some(t => t.length > 3 && (t.includes(s) || s.includes(t)))) n++; return n; };
  function oldOf(dom){
    const out = new Map(); let A = []; try{ A = AG || []; }catch(e){}
    for(const a of A){ if(String(a.domain || '').toLowerCase().replace(/^www\./, '') !== dom) continue;
      for(const b of a.boards || []) for(const m of b.m || []){ const raw = String(m[1] || ''); const h = raw.charAt(0) === '|' ? raw.slice(1) : (b.p || '') + raw; if(/^https?:/i.test(h)) out.set(nk(h), {h, nm: m[0] || ''}); } }
    return out;
  }
  function photoOf(k){ try{ const r = MEAS.get(k); if(r && r[6]) return String(r[6]); }catch(e){} try{ if(typeof PLINK !== 'undefined' && PLINK.get(k)) return String(PLINK.get(k)); }catch(e){} return ''; }
  function match(olds, news){
    const byId = new Map(), bySlug = new Map(), newSet = new Set(news.map(nk));
    for(const u of news){ for(const id of idsOf(u)){ if(!byId.has(id)) byId.set(id, []); byId.get(id).push(u); } const s = slugOf(u); if(s){ if(!bySlug.has(s)) bySlug.set(s, []); bySlug.get(s).push(u); } }
    const oldSlug = new Map(); for(const [, o] of olds){ const s = slugOf(o.h); oldSlug.set(s, (oldSlug.get(s) || 0) + 1); }
    const e = {}, st = {same: 0, id: 0, name: 0, none: 0, unsure: 0};
    for(const [k, o] of olds){
      if(newSet.has(k)){ st.same++; continue; }
      const ids = idsOf(o.h), s = slugOf(o.h);
      let c = []; for(const id of ids) c = c.concat(byId.get(id) || []);
      /* the profile number alone is not enough when the name on the new address is another girl's */
      c = c.filter(u => !s || !slugOf(u) || slugOf(u) === s || slugOf(u).includes(s) || s.includes(slugOf(u)));
      let how = 'id';
      if(!c.length && s && s.length >= 4 && (bySlug.get(s) || []).length && oldSlug.get(s) === 1){
        const cand = bySlug.get(s), cid = new Set(cand.flatMap(idsOf));
        if(cid.size === 1){ const ph = photoOf(k); const nid = [...cid][0];
          if(ph && new RegExp('(^|[^0-9])' + nid + '([^0-9]|$)').test(ph)){ c = cand; how = 'name'; } else { st.unsure++; continue; } }
        else { st.unsure++; continue; }
      }
      if(!c.length){ st.none++; continue; }
      c.sort((x, y) => near(o.h, y) - near(o.h, x));
      e[k] = c[0]; st[how]++;
    }
    return {e, st};
  }
  window.__illuRelinkMatch = match;
  async function relink(dom){
    if(!(window.illu && window.illu.siteModels)) return null;
    const r = await window.illu.siteModels(dom);
    if(!r || !r.ok || !r.urls || !r.urls.length) return {dom, why: (r && r.why) || 'no sitemap'};
    const olds = oldOf(dom); if(!olds.size) return {dom, why: 'no models'};
    const {e, st} = match(olds, r.urls);
    const n = Object.keys(e).length;
    for(const k in e) AUTO.set(k, e[k]);
    if(n){ const d = db(); if(d) try{ await d.doc('mlinkb/' + hash(dom)).set({d: dom, e, at: new Date().toISOString(), by: me(), n, st, how: 'sitemap'}); }catch(er){} }
    try{ console.log('[relink]', dom, JSON.stringify(st)); }catch(er){}
    return {dom, n, st};
  }
  window.__illuRelink = relink;

  /* ---------- no new address found: ask for it in her photo view ---------- */
  let ASK = '';
  window.__illuMovedAsk = k => { ASK = k; drawAsk(); };
  function drawAsk(){
    const fv = document.getElementById('illufv'); if(!fv || fv.hidden || !ASK) return;
    let b = document.getElementById('illumv');
    if(!b){ b = document.createElement('div'); b.id = 'illumv'; fv.appendChild(b); }
    const now = window.__illuFvNow ? window.__illuFvNow() : null;
    if(now && now.key && nk(now.key) !== nk(ASK) && nk(now.url || '') !== nk(ASK)){ b.hidden = true; return; }
    if(linkOf(ASK)){ b.hidden = true; return; }
    b.hidden = false;
    b.innerHTML = '<p><b>' + H(L('Her page moved on the agency’s site.', '에이전시 사이트에서 모델 페이지 주소가 바뀌었습니다.')) + '</b> ' + H(L('Paste her new link so her photos and links open the right page.', '새 링크를 붙여넣으면 사진과 링크가 맞는 페이지로 열립니다.')) + '</p>' +
      '<form data-mvf><input type="url" required placeholder="https://…" aria-label="' + H(L('Her new link', '새 링크')) + '"><button type="submit">' + H(L('Save', '저장')) + '</button><button type="button" data-mvx aria-label="' + H(L('Close', '닫기')) + '">✕</button></form>';
  }
  document.addEventListener('submit', async e => {
    const f = e.target; if(!f.matches || !f.matches('#illumv form[data-mvf]')) return; e.preventDefault();
    const v = f.querySelector('input').value.trim(); if(!/^https?:\/\/\S+\.\S+/.test(v) || !ASK) return;
    const from = nk(ASK); HAND.set(from, v);
    const d = db(); if(d) try{ await d.doc('mlink/' + hash(from)).set({f: from, t: v, by: me(), at: new Date().toISOString()}); }catch(er){}
    const b = document.getElementById('illumv'); if(b) b.hidden = true;
    /* her photo view opens again, now from the new page */
    try{ const n = window.__illuFvNow && window.__illuFvNow(); if(n && window.illuPhotoFull) window.illuPhotoFull('', n.nm || '', n.url || '', n.key || '', ''); }catch(er){}
  }, true);
  document.addEventListener('click', e => { if(e.target.closest && e.target.closest('#illumv [data-mvx]')){ const b = document.getElementById('illumv'); if(b) b.hidden = true; ASK = ''; } }, true);
  const css = document.createElement('style');
  css.textContent = '#illumv{position:absolute;left:50%;top:60px;transform:translateX(-50%);z-index:30;width:min(520px,calc(100% - 32px));background:#fff;color:#211C26;border-radius:14px;box-shadow:0 18px 40px -12px rgba(0,0,0,.5);padding:12px 14px;font-size:13px}#illumv[hidden]{display:none}' +
    '#illumv p{margin:0 0 8px;line-height:1.45}#illumv form{display:flex;gap:6px}#illumv input{flex:1;min-width:0;border:1px solid #E7E2EC;border-radius:999px;padding:7px 12px;font:inherit}' +
    '#illumv button{border:1px solid #5A2C57;background:#5A2C57;color:#fff;border-radius:999px;padding:7px 14px;font:600 13px inherit;font-family:inherit;cursor:pointer}#illumv button[data-mvx]{background:#fff;color:#5A2C57;padding:7px 10px}';
  document.head.appendChild(css);
})();
