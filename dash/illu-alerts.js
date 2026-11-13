/* ==================== Alerts (1.2.114) ====================
   User, 9 Nov 2026:
   - when someone puts a model up for the team vote, a message pops up telling me my vote is needed; I can vote
     in it, open Team Vote, or choose Later (the alert then waits in the bell). A soft chime plays.
   - every morning at 7:00 an alert lists the models arriving or departing that day; a model who arrives or
     departs before 7:00 is announced the day before at 7:00 instead. The same soft chime.
   - on a Windows or Mac computer the alert also shows as a system notification when the program is not in
     front (minimised or behind another window).
   Phones get the same alerts through the phone app (push), not from here. */
(function(){
  if(window.__illuAlerts) return; window.__illuAlerts = true;
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const pad = n => String(n).padStart(2, '0');
  const me = () => { try{ return ME || ''; }catch(e){ return ''; } };
  const signed = () => { try{ return !!SIGNED(); }catch(e){ return false; } };
  const dayKey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const MORNING = 7;   // 07:00, the computer's own time (the team works in Korea)

  /* what this person has already been shown, kept on this computer */
  const SK = () => 'illu.alerts.' + me();
  let ST = null;
  function st(){ if(ST && ST.who === me()) return ST; let v = {}; try{ v = JSON.parse(localStorage.getItem(SK()) || '{}') || {}; }catch(e){} ST = {who: me(), v: v.v || {}, m: v.m || {}, md: v.md || ''}; return ST; }
  function keep(){ const s = st(); try{ localStorage.setItem(SK(), JSON.stringify({v: s.v, m: s.m, md: s.md})); }catch(e){} }

  /* ---------- the soft chime: two gentle bell notes ---------- */
  let AC = null;
  function chime(){
    try{
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if(AC.state === 'suspended') AC.resume();
      const t0 = AC.currentTime + 0.02;
      [[880, 0, .10], [1318.5, .18, .085], [1760, .18, .025]].forEach(([f, t, v]) => {
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t0 + t); g.gain.linearRampToValueAtTime(v, t0 + t + .015); g.gain.exponentialRampToValueAtTime(.0001, t0 + t + 1.1);
        o.connect(g).connect(AC.destination); o.start(t0 + t); o.stop(t0 + t + 1.2);
      });
    }catch(e){}
  }
  window.__illuChime = chime;

  /* ---------- the system notification (Windows / Mac) when the program is not in front ---------- */
  function sysNote(title, body, onClick){
    try{
      if(document.hasFocus() && !document.hidden) return;
      if(typeof Notification === 'undefined') return;
      const go = () => { const n = new Notification(title, {body, silent: true}); n.onclick = () => { try{ window.illu && window.illu.focusWin && window.illu.focusWin(); }catch(e){} try{ window.focus(); }catch(e){} if(onClick) onClick(); }; };
      if(Notification.permission === 'granted') go();
      else if(Notification.permission !== 'denied') Notification.requestPermission().then(p => { if(p === 'granted') go(); });
    }catch(e){}
  }

  /* ---------- the pop-up box ---------- */
  const BOX = document.createElement('div'); BOX.id = 'illual'; BOX.setAttribute('aria-live', 'polite');
  const mount = () => { if(!BOX.isConnected) document.body.appendChild(BOX); };
  /* 1.2.178: the new-email alerts (illu-mail.js) use the same box, chime and system notification */
  window.__illuAlertBox = () => { mount(); return BOX; };
  window.__illuSysNote = (t, b, f) => sysNote(t, b, f);
  const THUMB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>';
  const photoOf = html => { const m = String(html || '').match(/<img[^>]*\ssrc="([^"]+)"/); return m ? m[1].replace(/&amp;/g, '&') : ''; };
  const ago = iso => { const s = Math.max(0, (Date.now() - new Date(iso)) / 1000); if(isNaN(s)) return ''; if(s < 90) return L('just now', '방금'); const m = Math.round(s / 60); if(m < 60) return L(m + ' min ago', m + '분 전'); const h = Math.round(m / 60); if(h < 24) return L(h + ' h ago', h + '시간 전'); const d = Math.round(h / 24); return L(d + (d === 1 ? ' day ago' : ' days ago'), d + '일 전'); };
  const nice = s => String(s || '').toLowerCase().replace(/(^|[\s\-'])(\p{L})/gu, (a, b, c) => b + c.toUpperCase());
  const SHOWN = new Map();   // alert id -> element
  function close(id){ const el = SHOWN.get(id); if(el){ el.classList.add('out'); setTimeout(() => el.remove(), 220); SHOWN.delete(id); } }

  function voteBox(x){
    if(SHOWN.has(x.id)) return;
    mount();
    const el = document.createElement('div'); el.className = 'alc vote'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', L('Your vote is needed', '투표가 필요합니다'));
    const ph = photoOf(x.card), nm = nice(x.nm) || L('A model', '모델');
    const who = x.byN || L('Someone', '누군가');
    const title = x.tie ? L(nm + ' is tied — vote again (round ' + x.round + ')', nm + ' 동점 — 다시 투표 (' + x.round + '라운드)') : L(who + ' put ' + nm + ' up for the team vote', who + '님이 ' + nm + '을(를) 팀 투표에 올렸습니다');
    el.innerHTML = '<div class="albar"></div><div class="alin"><span class="alpic">' + (ph ? '<img src="' + H(ph) + '" alt="" referrerpolicy="no-referrer"">' : '<i>' + H(nm.charAt(0)) + '</i>') + '</span>' +
      '<div class="altx"><div class="alk">' + (x.tie ? L('TIE-BREAKER', '타이브레이커') : L('YOUR VOTE IS NEEDED', '투표가 필요합니다')) + '</div><div class="alt">' + H(title) + '</div>' +
      '<div class="als">' + H([x.ag, L(x.n + ' of ' + x.of + ' have voted', x.of + '명 중 ' + x.n + '명 투표'), ago(x.at)].filter(Boolean).join(' · ')) + '</div></div>' +
      '<button type="button" class="alx" data-al="later" aria-label="' + H(L('Later', '나중에')) + '" title="' + H(L('Later — it waits under the bell', '나중에 — 종 아이콘에 남아 있습니다')) + '">×</button></div>' +
      '<div class="alacts"><button type="button" class="alv g" data-al="g" aria-label="Go" title="' + H(L('Go', '찬성')) + '">' + THUMB + '</button><button type="button" class="alv r" data-al="r" aria-label="Pass" title="' + H(L('Pass', '반대')) + '">' + THUMB + '</button><span class="alsp"></span>' +
      '<button type="button" class="albtn" data-al="later">' + L('Later', '나중에') + '</button><button type="button" class="albtn pri" data-al="open">' + L('Open Team Vote', '팀 투표 열기') + '</button></div><div class="alok"></div>';
    { const im = el.querySelector('.alpic img'); if(im) im.addEventListener('error', () => { const i = document.createElement('i'); i.textContent = nm.charAt(0); im.replaceWith(i); }); }
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-al]'); if(!b) return;
      const a = b.dataset.al, s = st();
      if(a === 'g' || a === 'r'){
        try{ window.__illuVoteCast(x.k, a); }catch(er){}
        s.v[x.id] = 'voted'; keep();
        el.classList.add('done'); el.querySelector('.alok').textContent = L('Vote made — ' + (a === 'g' ? 'Go' : 'Pass') + ' on ' + nm + '. Only you can see it until everyone has voted.', '투표 완료 — ' + nm + ': ' + (a === 'g' ? '찬성' : '반대') + '. 모두 투표할 때까지 나만 봅니다.');
        setTimeout(() => close(x.id), 2600); return;
      }
      s.v[x.id] = 'later'; keep(); close(x.id); paintBell();
      if(a === 'open'){ try{ window.__illuGo && window.__illuGo('team'); }catch(er){} }
    });
    SHOWN.set(x.id, el); BOX.prepend(el);
    while(BOX.children.length > 3){ const last = BOX.lastElementChild; const id = [...SHOWN].find(([, v]) => v === last); if(id) SHOWN.delete(id[0]); last.remove(); }
    return title;
  }
  function sumBox(list){
    mount();
    const id = 'sum'; if(SHOWN.has(id)) close(id);
    const el = document.createElement('div'); el.className = 'alc vote'; el.setAttribute('role', 'alertdialog');
    el.innerHTML = '<div class="albar"></div><div class="alin"><span class="alpic"><i>' + list.length + '</i></span><div class="altx"><div class="alk">' + L('YOUR VOTE IS NEEDED', '투표가 필요합니다') + '</div><div class="alt">' +
      H(L(list.length + ' models are waiting for your vote', list.length + '명의 모델이 내 투표를 기다립니다')) + '</div><div class="als">' + H(list.slice(0, 4).map(x => nice(x.nm)).join(', ') + (list.length > 4 ? ' …' : '')) + '</div></div>' +
      '<button type="button" class="alx" data-al="later" aria-label="' + H(L('Later', '나중에')) + '">×</button></div><div class="alacts"><span class="alsp"></span><button type="button" class="albtn" data-al="later">' + L('Later', '나중에') + '</button><button type="button" class="albtn pri" data-al="open">' + L('Open Team Vote', '팀 투표 열기') + '</button></div>';
    el.addEventListener('click', e => { const b = e.target.closest('[data-al]'); if(!b) return; const s = st(); for(const x of list) s.v[x.id] = 'later'; keep(); close(id); paintBell(); if(b.dataset.al === 'open'){ try{ window.__illuGo && window.__illuGo('team'); }catch(er){} } });
    SHOWN.set(id, el); BOX.prepend(el);
  }

  /* ---------- votes: check whenever a vote changes ---------- */
  let first = true;
  function checkVotes(){
    if(!signed()) return;
    let list; try{ list = window.__illuVoteAlerts ? window.__illuVoteAlerts() : null; }catch(e){ list = null; }
    if(!list) return;
    const s = st(), open = new Set(list.map(x => x.id));
    /* a vote that closed, or that I voted on elsewhere, takes its alert away */
    for(const id of [...SHOWN.keys()]) if(id !== 'sum' && id !== 'morn' && !open.has(id)) close(id);
    let changed = false;
    for(const id of Object.keys(s.v)) if(!open.has(id)){ delete s.v[id]; changed = true; }
    const fresh = list.filter(x => !x.mineUp && !s.v[x.id]);
    if(fresh.length){
      if(first && fresh.length > 3) sumBox(fresh);
      else fresh.forEach(voteBox);
      for(const x of fresh) s.v[x.id] = 'shown';
      changed = true;
      chime();
      const one = fresh[0];
      sysNote(fresh.length > 1 ? L(fresh.length + ' models need your vote', '투표할 모델 ' + fresh.length + '명') : L('Your vote is needed', '투표가 필요합니다'),
        fresh.length > 1 ? fresh.slice(0, 4).map(x => nice(x.nm)).join(', ') : L((one.byN || 'Someone') + ' put ' + nice(one.nm) + ' up for the team vote', (one.byN || '누군가') + '님이 ' + nice(one.nm) + '을(를) 팀 투표에 올렸습니다'));
    }
    first = false;
    if(changed) keep();
    paintBell();
  }
  window.__illuAlertsCheck = () => { clearTimeout(checkVotes.t); checkVotes.t = setTimeout(checkVotes, 400); };

  /* ---------- the bell: votes still waiting for me ---------- */
  window.__illuNotifExtra = () => {
    let list; try{ list = window.__illuVoteAlerts ? window.__illuVoteAlerts() : null; }catch(e){ list = null; }
    if(!list) return [];
    return list.filter(x => !x.mineUp).map(x => {
      const d = new Date(x.at), ts = isNaN(d) ? '' : dayKey(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      return {ts, who: x.by, html: H(L((x.byN || 'Someone') + ' put ', (x.byN || '누군가') + '님이 ')) + '<b>' + H(nice(x.nm)) + '</b>' + H(L(' up for the team vote — your vote is needed', '을(를) 팀 투표에 올렸습니다 — 투표가 필요합니다')) +
        ' <button type="button" class="alnb" data-alre="' + H(x.id) + '">' + L('Vote', '투표') + '</button>'};
    });
  };
  function paintBell(){ try{ window.__illuNotifRepaint && window.__illuNotifRepaint(); }catch(e){} }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-alre]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    let list = []; try{ list = window.__illuVoteAlerts() || []; }catch(er){}
    const x = list.find(y => y.id === b.dataset.alre); if(x){ voteBox(x); }
  }, true);

  /* ---------- the morning alert: arriving / departing today (and before 7:00 tomorrow) ---------- */
  function morning(){
    if(!signed() || !window.__illuArrSoon) return;
    try{ if(typeof BOOK === 'undefined' || !BOOK.size) return; }catch(e){ return; }
    const N = new Date(); if(N.getHours() < MORNING) return;
    const s = st(), today = dayKey(N);
    if(s.md === today) return;
    let ev = []; try{ ev = window.__illuArrSoon(2) || []; }catch(e){ return; }
    const early = x => x.hasT && String(x.t) < pad(MORNING) + ':00';
    const idOf = x => x.k + '|' + x.m.id + '|' + dayKey(x.at);
    /* today: everything not already announced yesterday; tomorrow: only what happens before 7:00 */
    const list = ev.filter(x => (x.day === 0 || (x.day === 1 && early(x))) && !s.m[idOf(x)]);
    s.md = today;
    for(const k of Object.keys(s.m)) if(s.m[k] < dayKey(new Date(N.getFullYear(), N.getMonth(), N.getDate() - 3))) delete s.m[k];
    for(const x of list) s.m[idOf(x)] = today;
    keep();
    if(!list.length) return;
    mornBox(list);
    chime();
    const a = list.filter(x => x.day === 0 && x.k === 'a').length, d = list.filter(x => x.day === 0 && x.k === 'd').length, tm = list.filter(x => x.day === 1).length;
    sysNote(L('Arriving / departing today', '오늘 입국 / 출국'), list.map(x => (x.k === 'a' ? '✈ ' : '↗ ') + x.m.nm + ' ' + (x.day === 1 ? L('tomorrow ', '내일 ') : '') + (x.hasT ? x.t : '')).join(' · ') || (a + ' / ' + d + ' / ' + tm));
  }
  function mornBox(list){
    mount();
    const id = 'morn'; if(SHOWN.has(id)) close(id);
    const B = window.__illuArrBits || {};
    const A = list.filter(x => x.k === 'a'), D = list.filter(x => x.k === 'd');
    const row = x => '<button type="button" class="alrow ' + x.k + '" data-albk="' + H(x.m.c.id) + '"><b>' + (x.k === 'a' ? '✈' : '↗') + '</b><span><em>' + H(x.m.nm) + '</em><small>' +
      H((x.day === 1 ? L('Tomorrow ', '내일 ') : L('Today ', '오늘 ')) + (x.hasT ? x.t : L('(time not set)', '(시간 미입력)')) + (x.f.no ? ' · ' + x.f.no : '') + (x.ap ? ' · ' + x.ap : '')) + '</small></span></button>';
    const el = document.createElement('div'); el.className = 'alc morn'; el.setAttribute('role', 'alertdialog');
    const hr = new Date().getHours();
    el.innerHTML = '<div class="albar"></div><div class="alin"><span class="alpic sun"><i>☀</i></span><div class="altx"><div class="alk">' + (hr < 12 ? L('GOOD MORNING', '좋은 아침입니다') : L('TODAY', '오늘')) + '</div><div class="alt">' +
      H(L((A.length ? A.length + ' arriving' : '') + (A.length && D.length ? ', ' : '') + (D.length ? D.length + ' departing' : ''), (A.length ? '도착 ' + A.length + '명' : '') + (A.length && D.length ? ', ' : '') + (D.length ? '출국 ' + D.length + '명' : ''))) + '</div>' +
      '<div class="als">' + L('Before 7:00 tomorrow is included, so nothing early is missed.', '내일 오전 7시 전 일정도 함께 알려드립니다.') + '</div></div><button type="button" class="alx" data-al="x" aria-label="' + H(L('Close', '닫기')) + '">×</button></div>' +
      '<div class="alrows">' + A.map(row).join('') + D.map(row).join('') + '</div><div class="alacts"><span class="alsp"></span><button type="button" class="albtn" data-al="x">' + L('Close', '닫기') + '</button><button type="button" class="albtn pri" data-al="board">' + L('Arrival/Departure Board', '입국/출국 보드') + '</button></div>';
    el.addEventListener('click', e => {
      const r = e.target.closest('[data-albk]'); if(r){ close(id); try{ window.__illuOpenBooking && window.__illuOpenBooking(r.dataset.albk); }catch(er){} return; }
      const b = e.target.closest('[data-al]'); if(!b) return;
      close(id); if(b.dataset.al === 'board'){ try{ window.__illuGo && window.__illuGo('arrd'); }catch(er){} }
    });
    SHOWN.set(id, el); BOX.prepend(el);
  }
  setInterval(morning, 60000);
  setTimeout(morning, 15000);
  setTimeout(() => window.__illuAlertsCheck(), 4000);
  /* test hooks */
  window.__illuAlertsTest = {morning: () => { const s = st(); s.md = ''; s.m = {}; keep(); morning(); }, reset: () => { localStorage.removeItem(SK()); ST = null; first = true; }, state: () => st()};

  const css = document.createElement('style');
  css.textContent = `
#illual{position:fixed;top:calc(64px + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));z-index:9500;display:flex;flex-direction:column;gap:10px;width:min(370px,calc(100vw - 32px));pointer-events:none;font-family:var(--sans,Inter,system-ui,sans-serif)}
#illual .alc{pointer-events:auto;background:var(--surf,#fff);color:var(--ink,#1b1724);border:1px solid var(--line,#e6e0ea);border-radius:16px;box-shadow:0 18px 44px -16px rgba(40,10,50,.5);overflow:hidden;animation:alin .45s cubic-bezier(.2,.9,.3,1.2)}
#illual .alc.out{opacity:0;transform:translateY(-8px);transition:opacity .2s,transform .2s}
@keyframes alin{from{transform:translateY(-14px) scale(.96);opacity:0}to{transform:none;opacity:1}}
#illual .albar{height:4px;background:linear-gradient(90deg,var(--ivg,#7CFF2B),#E3BE72,var(--ivr,#FF2D4B))}
#illual .alc.morn .albar{background:linear-gradient(90deg,#1F8A55,#E3BE72,#C2334D)}
#illual .alin{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;padding:12px 12px 6px 14px;align-items:start}
#illual .alpic{width:48px;height:60px;border-radius:9px;overflow:hidden;background:var(--surf2,#f4f1f6);display:grid;place-items:center;flex:none}
#illual .alpic img{width:100%;height:100%;object-fit:cover;display:block}
#illual .alpic i{font-style:normal;font-weight:800;font-size:18px;color:var(--acc,#5A2C57)}
#illual .alpic.sun{background:#FFF3D6}#illual .alpic.sun i{color:#B7791F;font-size:22px}
#illual .alk{font-size:10.5px;letter-spacing:.12em;font-weight:800;color:#B7791F}
#illual .alt{font-size:14px;font-weight:700;line-height:1.35;margin-top:2px}
#illual .als{font-size:12px;color:var(--faint,#8c8794);margin-top:3px;line-height:1.4}
#illual .alx{border:0;background:none;cursor:pointer;color:var(--faint,#8c8794);font-size:20px;line-height:1;min-width:32px;min-height:32px;border-radius:8px}
#illual .alx:hover{background:var(--surf2,#f4f1f6)}
#illual .alacts{display:flex;align-items:center;gap:8px;padding:6px 14px 13px;flex-wrap:wrap}
#illual .alsp{flex:1}
#illual .albtn{border:1px solid var(--line,#e6e0ea);background:var(--surf,#fff);color:inherit;border-radius:999px;padding:7px 13px;font:inherit;font-size:12.5px;font-weight:650;cursor:pointer;min-height:34px}
#illual .albtn.pri{background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57);color:#fff}
#illual .alv{width:38px;height:38px;border-radius:50%;border:1.5px solid var(--line,#e6e0ea);background:var(--surf,#fff);display:grid;place-items:center;cursor:pointer}
#illual .alv svg{width:16px;height:16px;fill:currentColor}
#illual .alv.g{color:var(--ivg2,#52D10C)}#illual .alv.r{color:var(--ivr2,#F21C3D)}#illual .alv.r svg{transform:rotate(180deg)}
#illual .alv.g:hover{background:var(--ivg,#7CFF2B);border-color:var(--ivg,#7CFF2B);color:#173300}#illual .alv.r:hover{background:var(--ivr,#FF2D4B);border-color:var(--ivr,#FF2D4B);color:#fff}
#illual .alok{display:none;padding:0 14px 13px;font-size:12.5px;font-weight:700;color:#1F8A55}
#illual .alc.done .alacts{display:none}#illual .alc.done .alok{display:block}
#illual .alrows{display:flex;flex-direction:column;gap:6px;padding:4px 14px 2px;max-height:240px;overflow-y:auto}
#illual .alrow{display:flex;gap:10px;align-items:center;border:1px solid var(--line,#e6e0ea);border-left:4px solid #1F8A55;border-radius:10px;padding:7px 10px;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer}
#illual .alrow.d{border-left-color:#C2334D}
#illual .alrow>b{font-size:15px;color:#1F8A55}#illual .alrow.d>b{color:#C2334D}
#illual .alrow span{display:flex;flex-direction:column;min-width:0}#illual .alrow em{font-style:normal;font-weight:700;font-size:13px}#illual .alrow small{font-size:11.5px;color:var(--faint,#8c8794)}
.alnb{border:1px solid var(--acc,#5A2C57);background:none;color:var(--acc,#5A2C57);border-radius:999px;padding:1px 9px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;margin-left:4px}
@media (max-width:760px){
  #illual{left:max(10px,env(safe-area-inset-left,0px));right:max(10px,env(safe-area-inset-right,0px));width:auto;top:calc(58px + env(safe-area-inset-top,0px))}
  #illual .alv{width:44px;height:44px}#illual .albtn{min-height:42px;padding:8px 15px}#illual .alx{min-width:42px;min-height:42px}
}
@media (prefers-reduced-motion:reduce){#illual .alc{animation:none}}
`;
  document.head.appendChild(css);
})();
