/* ==================== + New card (1.2.129) ====================
   What the user asked for (10 Nov 2026): "allow me to create a card on the Opus Board. Have the
   Create a new card on the top bar available. Also on Today's Board as well" - and the cards made
   this way must be whole, the same as every other card on every board.
   - A "+ New card" button in the top bar, shown on Today and on every Opus page.
   - The form: photograph, name, agency, city, country, female / male, the link to her page, and
     height · bust · waist · hips · shoe. It ends with three choices (user: choose each time):
     ♡ My Favorites, Send to Team Vote, or Booking.
   - The card is an ordinary model card: everything the boards draw for a model (name, agency,
     place, photograph, measurements, lamps, vote, side panel, booking) comes from the same places
     as for a model found by the crawler:
       mcard/<id>   {k, nm, ag, city, country, g, href, by, at}   who she is (shared, live)
       photos       her photograph (the same store as a photograph dropped on any card)
       medits       her measurements (the same store as figures typed on any card)
     keyInfo() - the program's "who is this model" - also answers for these keys, so every board
     that knows a model by its key knows her.
   - If the link is to a model already in the Directory, her existing card is used: nothing is
     made twice. */
(function(){
  if(window.__illuNewCard) return; window.__illuNewCard = true;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const me = () => { try{ return ME || ''; }catch(e){ return ''; } };
  const MC = new Map();          // key -> mcard doc
  const rid = () => { const a = new Uint8Array(8); crypto.getRandomValues(a); return [...a].map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 14); };
  function fnv(s){ let h = 0x811c9dc5; s = String(s); for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }
  const nk = u => { try{ return normKey(u); }catch(e){ return u; } };

  /* ---------- who she is: the shared list, and keyInfo answering for it ---------- */
  function listen(){
    let d = null; try{ d = DB; }catch(e){}
    if(!d){ setTimeout(listen, 400); return; }
    d.collection('mcard').onSnapshot(s => {
      MC.clear();
      for(const x of s.docs){ const v = x.data(); if(v && v.k && !v.x) MC.set(v.k, Object.assign({id: x.id}, v)); }
      try{ window.__illuShellRepaint && window.__illuShellRepaint(); }catch(e){}
      try{ window.__illuTodayRender && window.__illuTodayRender(); }catch(e){}
      try{ if(typeof refresh === 'function') refresh(); }catch(e){}
    }, () => {});
  }
  listen();
  const asInfo = v => ({nm: v.nm || '', ag: v.ag || '', city: v.city || '', country: v.country || '', div: '', g: v.g || '?', t: '', href: v.href || '', own: 1});
  function wrapKeyInfo(){
    if(typeof keyInfo !== 'function'){ setTimeout(wrapKeyInfo, 300); return; }
    if(keyInfo.__mc) return;
    const orig = keyInfo;
    const w = function(k){
      const r = orig.apply(this, arguments); if(r) return r;
      const v = MC.get(k) || (k ? MC.get(nk(k)) : null);
      return v ? asInfo(v) : null;
    };
    w.__mc = true; window.keyInfo = w;
  }
  wrapKeyInfo();
  window.__illuMcard = k => MC.get(k) || null;

  /* ---------- the button in the top bar ---------- */
  const PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'abnc'; btn.id = 'abnc';
  function label(){ const t = L('New card', '새 카드'); btn.innerHTML = PLUS + '<span>' + H(t) + '</span>'; btn.title = L('Create a new card', '새 카드 만들기'); btn.setAttribute('aria-label', btn.title); btn.dataset.lang = String(isKO()); }
  label();
  const OPUS = new Set(['today', 'fav', 'team', 'appr', 'tie', 'cxl', 'bk', 'cmp', 'lit', 'com']);
  function pageNow(){ try{ if(window.__illuPageNow) return window.__illuPageNow(); }catch(e){} try{ return VIEW; }catch(e){ return ''; } }
  function put(){
    const abr = document.querySelector('#appbar .abr');
    if(!abr){ setTimeout(put, 400); return; }
    if(btn.parentNode !== abr) abr.insertBefore(btn, abr.firstElementChild);   // the top bar orders it (illu-abar.js)
  }
  function tick(){
    if(!btn.isConnected) put();
    const show = OPUS.has(pageNow());
    if(btn.hidden === show) btn.hidden = !show;
    if(btn.dataset.lang !== String(isKO())) label();
  }
  put(); setInterval(tick, 400); tick();
  btn.addEventListener('click', e => { e.preventDefault(); open(); });

  /* ---------- the form ---------- */
  let photo = null, photoURL = '';
  const MS = [['ht', 'Height', '신장', 'cm'], ['bu', 'Bust', '가슴', 'cm'], ['wa', 'Waist', '허리', 'cm'], ['hp', 'Hips', '엉덩이', 'cm'], ['eu', 'Shoe', '신발', 'EU']];
  function agencies(){ try{ return [...new Set(AG.map(a => a.name))].sort((a, b) => a.localeCompare(b)); }catch(e){ return []; } }
  function open(){
    try{ if(typeof SIGNED === 'function' && !SIGNED()){ try{ nudgeSignIn(btn); }catch(e){} return; } }catch(e){}
    close();
    photo = null; photoURL = '';
    const m = document.createElement('div');
    m.id = 'ncm'; m.className = 'ncm'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'ncmh');
    m.innerHTML = '<div class="ncp">' +
      '<div class="nchd"><h2 id="ncmh">' + L('New card', '새 카드') + '</h2><button type="button" class="ncx" data-ncx aria-label="' + H(L('Close', '닫기')) + '">×</button></div>' +
      '<div class="ncbody">' +
        '<label class="ncph" data-ncph tabindex="0" title="' + H(L('Choose or drop a photograph', '사진을 선택하거나 끌어다 놓기')) + '"><input type="file" accept="image/*" data-ncfile hidden><span class="ncphi">' + L('+ Photo', '+ 사진') + '</span></label>' +
        '<div class="ncf">' +
          '<label class="ncl full"><span>' + L('Name', '이름') + ' <b>*</b></span><input data-nc="nm" autocomplete="off" required></label>' +
          '<label class="ncl full"><span>' + L('Agency', '에이전시') + '</span><input data-nc="ag" list="ncags" autocomplete="off"><datalist id="ncags">' + agencies().map(a => '<option value="' + H(a) + '">').join('') + '</datalist></label>' +
          '<label class="ncl"><span>' + L('City', '도시') + '</span><input data-nc="city" autocomplete="off"></label>' +
          '<label class="ncl"><span>' + L('Country', '국가') + '</span><input data-nc="country" autocomplete="off"></label>' +
          '<div class="ncl full"><span>' + L('Female / Male', '여성 / 남성') + '</span><div class="ncseg" role="radiogroup">' +
            '<button type="button" role="radio" aria-checked="true" class="on" data-ncg="F">' + L('Female', '여성') + '</button><button type="button" role="radio" aria-checked="false" data-ncg="M">' + L('Male', '남성') + '</button></div></div>' +
          '<label class="ncl full"><span>' + L('Link to her page (optional)', '모델 페이지 링크 (선택)') + '</span><input data-nc="href" type="url" inputmode="url" placeholder="https://…" autocomplete="off"></label>' +
        '</div>' +
        '<div class="ncms">' + MS.map(([k, en, ko, u]) => '<label><span>' + L(en, ko) + '</span><input data-ncm="' + k + '" inputmode="decimal" placeholder="—"><em>' + u + '</em></label>').join('') + '</div>' +
        '<p class="ncerr" data-ncerr hidden></p>' +
      '</div>' +
      '<div class="ncft"><span class="ncq">' + L('Put her on:', '보낼 곳:') + '</span>' +
        '<button type="button" class="ncb" data-ncgo="fav">♡ ' + L('My Favorites', '내 즐겨찾기') + '</button>' +
        '<button type="button" class="ncb" data-ncgo="vote">' + L('Send to Team Vote', '팀 투표로 보내기') + '</button>' +
        '<button type="button" class="ncb pri" data-ncgo="book">' + L('Booking', '부킹') + '</button></div>' +
      '</div>';
    document.body.appendChild(m);
    setTimeout(() => { const i = m.querySelector('[data-nc="nm"]'); if(i) i.focus(); }, 30);
  }
  function close(){ const m = document.getElementById('ncm'); if(m) m.remove(); if(photoURL){ try{ URL.revokeObjectURL(photoURL); }catch(e){} photoURL = ''; } }
  function setPhoto(f){
    if(!f || !/^image\//i.test(f.type || '')) return;
    photo = f; if(photoURL){ try{ URL.revokeObjectURL(photoURL); }catch(e){} }
    photoURL = URL.createObjectURL(f);
    const ph = document.querySelector('#ncm [data-ncph]'); if(!ph) return;
    ph.style.backgroundImage = 'url("' + photoURL + '")'; ph.classList.add('has');
    const s = ph.querySelector('.ncphi'); if(s) s.textContent = L('Change photo', '사진 바꾸기');
  }
  const num = v => { const n = parseFloat(String(v || '').replace(',', '.')); return isNaN(n) ? null : Math.round(n * 10) / 10; };
  function err(t){ const e = document.querySelector('#ncm [data-ncerr]'); if(e){ e.textContent = t; e.hidden = !t; } }

  async function make(dest){
    const m = document.getElementById('ncm'); if(!m) return;
    const v = f => ((m.querySelector('[data-nc="' + f + '"]') || {}).value || '').trim();
    const nm = v('nm'); if(!nm){ err(L('Type her name first.', '먼저 이름을 입력하세요.')); m.querySelector('[data-nc="nm"]').focus(); return; }
    let href = v('href');
    if(href && !/^https?:\/\//i.test(href)) href = 'https://' + href;
    if(href && !/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(href)){ err(L('That link does not look like a web address.', '링크가 웹 주소가 아닌 것 같습니다.')); return; }
    const g = (m.querySelector('[data-ncg].on') || {}).dataset ? m.querySelector('[data-ncg].on').dataset.ncg : 'F';
    const about = {nm, ag: v('ag'), city: v('city'), country: v('country')};
    /* her key: the link when there is one (the same key the crawler would give her), otherwise a new one */
    let k = href ? nk(href) : '', known = false;
    if(k){ try{ const i = keyInfo(k); known = !!(i && !i.own); }catch(e){} }
    if(!k) k = 'https://card.illumenoctis.app/' + rid();
    m.querySelectorAll('button').forEach(b => b.disabled = true);
    err('');
    try{
      if(!known && !MC.has(k)){
        const id = href ? 'u' + fnv(k) : k.split('/').pop();
        const doc = {k, nm, ag: about.ag, city: about.city, country: about.country, g, href: href || '', by: me(), at: new Date().toISOString()};
        MC.set(k, Object.assign({id}, doc));
        await DB.doc('mcard/' + id).set(doc);
      }
      /* the figures, into the same store as figures typed on any card */
      for(const [f] of MS){ const n = num((m.querySelector('[data-ncm="' + f + '"]') || {}).value); if(n != null) try{ mxSet(k, f, n); }catch(e){} }
      try{ flushEdits(); }catch(e){}
      if(photo) try{ setPic(k, photo); }catch(e){ console.error(e); }
      const A = window.__illuVoteAct;
      if(dest === 'fav' && A) A.fav(k, about);
      else if(dest === 'vote' && A) A.vote(k, about);
      else if(dest === 'book' && A) A.book(k, about);
      photo = null; photoURL = '';
      close();
      try{ window.__illuGo && window.__illuGo(dest === 'fav' ? 'fav' : dest === 'vote' ? 'team' : 'bk'); }catch(e){}
    }catch(e){
      console.error(e);
      err(L('Could not save — check the connection and try again.', '저장하지 못했습니다 — 연결을 확인하고 다시 해 보세요.'));
      m.querySelectorAll('button').forEach(b => b.disabled = false);
    }
  }
  window.__illuNewCardOpen = open;

  document.addEventListener('click', e => {
    const m = e.target.closest && e.target.closest('#ncm'); if(!m) return;
    if(e.target === m || e.target.closest('[data-ncx]')){ e.preventDefault(); close(); return; }
    const gb = e.target.closest('[data-ncg]');
    if(gb){ e.preventDefault(); m.querySelectorAll('[data-ncg]').forEach(b => { const on = b === gb; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }); return; }
    const go = e.target.closest('[data-ncgo]'); if(go){ e.preventDefault(); make(go.dataset.ncgo); return; }
  });
  document.addEventListener('change', e => { const f = e.target.closest && e.target.closest('#ncm [data-ncfile]'); if(f && f.files && f.files[0]) setPhoto(f.files[0]); });
  document.addEventListener('keydown', e => {
    if(!document.getElementById('ncm')) return;
    if(e.key === 'Escape'){ e.preventDefault(); close(); }
    else if(e.key === 'Enter' && e.target.closest && e.target.closest('#ncm .ncph')){ e.preventDefault(); e.target.querySelector('input').click(); }
  });
  ['dragover', 'drop'].forEach(t => document.addEventListener(t, e => {
    const ph = e.target.closest && e.target.closest('#ncm [data-ncph]'); if(!ph) return;
    e.preventDefault();
    if(t === 'drop' && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) setPhoto(e.dataTransfer.files[0]);
  }));
  document.addEventListener('paste', e => {
    if(!document.getElementById('ncm')) return;
    const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(x => /^image\//.test(x.type));
    if(it){ e.preventDefault(); setPhoto(it.getAsFile()); }
  });

  const css = document.createElement('style');
  css.textContent = `
#abtools [data-abproxy="bknew"]{display:none!important}
#appbar .abr>.abnc{height:34px;box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;padding:0 13px 0 10px;border-radius:999px;border:0;background:var(--acc,#5A2C57);color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
#appbar .abr>.abnc[hidden]{display:none}
#appbar .abr>.abnc svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
#appbar .abr>.abnc:hover{filter:brightness(1.12)}
@media (max-width:700px){#appbar .abr>.abnc{padding:0;width:34px;justify-content:center}#appbar .abr>.abnc span{display:none}}
.ncm{position:fixed;inset:0;z-index:2147483000;background:rgba(20,14,24,.45);display:grid;place-items:center;padding:16px}
.ncp{background:var(--surf,#fff);color:var(--ink,#211C26);border-radius:18px;width:min(560px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden}
.nchd{display:flex;align-items:center;padding:14px 16px 8px}
.nchd h2{margin:0;font-size:17px;flex:1}
.ncx{border:0;background:none;font-size:24px;line-height:1;width:36px;height:36px;border-radius:10px;cursor:pointer;color:var(--mut,#6D6577)}
.ncbody{overflow:auto;padding:4px 16px 12px;display:grid;grid-template-columns:150px 1fr;gap:12px 14px}
.ncph{grid-row:span 1;aspect-ratio:3/4;border:1.5px dashed var(--line,#E7E2EC);border-radius:12px;display:grid;place-items:end center;cursor:pointer;background:var(--wash,#F4F1F6) center/cover no-repeat;padding:8px;box-sizing:border-box}
.ncph.has{border-style:solid}
.ncphi{font-size:12.5px;font-weight:700;color:var(--acc,#5A2C57);background:var(--surf,#fff);border-radius:999px;padding:4px 10px}
.ncf{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;min-width:0}
.ncl{display:flex;flex-direction:column;gap:3px;min-width:0}
.ncl.full{grid-column:1/-1}
.ncl>span,.ncms span{font-size:11.5px;color:var(--mut,#6D6577)}
.ncl b{color:#C0303C}
.ncl input,.ncms input{min-width:0;border:1px solid var(--line,#E7E2EC);border-radius:9px;padding:8px 10px;font:inherit;font-size:14px;background:var(--surf,#fff);color:var(--ink,#211C26)}
.ncl input:focus,.ncms input:focus{outline:2px solid var(--acc,#5A2C57);outline-offset:-1px}
.ncseg{display:flex;gap:6px}
.ncseg button{flex:1;min-height:34px;border:1px solid var(--line,#E7E2EC);border-radius:999px;background:var(--surf,#fff);font:inherit;font-size:13px;font-weight:600;color:var(--ink,#211C26);cursor:pointer}
.ncseg button.on{background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57);color:#fff}
.ncms{grid-column:1/-1;display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.ncms label{display:flex;flex-direction:column;gap:3px;min-width:0;position:relative}
.ncms input{padding-right:26px;font-variant-numeric:tabular-nums}
.ncms em{position:absolute;right:8px;bottom:9px;font-style:normal;font-size:10.5px;color:var(--faint,#9C93A9);pointer-events:none}
.ncerr{grid-column:1/-1;margin:0;color:#C0303C;font-size:13px}
.ncft{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 16px calc(14px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line,#E7E2EC)}
.ncq{font-size:12.5px;color:var(--mut,#6D6577);margin-right:auto}
.ncb{min-height:38px;padding:0 14px;border-radius:12px;border:1px solid var(--acc,#5A2C57);background:var(--surf,#fff);color:var(--acc,#5A2C57);font:inherit;font-size:13.5px;font-weight:700;cursor:pointer}
.ncb.pri{background:var(--acc,#5A2C57);color:#fff}
.ncb:disabled{opacity:.5;cursor:default}
@media (max-width:560px){
  .ncm{padding:0;place-items:stretch}
  .ncp{width:100%;max-height:none;height:100%;border-radius:0}
  .ncbody{grid-template-columns:110px 1fr}
  .ncf{grid-template-columns:1fr}
  .ncms{grid-template-columns:repeat(3,1fr)}
  .ncq{flex-basis:100%}
  .ncb{flex:1}
  .ncl input,.ncms input{font-size:16px}
}
@media (prefers-color-scheme:dark){.ncphi{background:rgba(0,0,0,.5);color:#fff}}
`;
  document.head.appendChild(css);
})();
