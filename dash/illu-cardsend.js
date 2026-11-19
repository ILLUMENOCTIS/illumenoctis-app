/* 1.2.261 (user, 19 Nov 2026: "I also want to be able to send a link of a single/multiple model cards to a USER. Currently
   there is only a Shared link for the voting board"):

   Send model cards to a user (someone on the team with a program sign-in).
   - One card: the ✈ button on her card's side panel (next to ♥), wherever the card opens (Directory, boards, Team Vote,
     booking card photo view).
   - Several (1.2.262): "Add to send list" in each card's side panel; the bar at the bottom / "Send N cards…" in the
     panel / "Send cards" next to "Share vote link" open the same window with the list.
   - The window: the cards (× to take one out), who it is for (ticks), an optional note, Send. Copy link / Copy
     message + link for KakaoTalk or anywhere else.
   - Saved as docs cshare/<id> {by, at, to:[ids], k:[keys], m:[{k, nm, ag}], note}. The people it is for get it in the
     bell (and a pop-up when the program is open, and a phone alert where alerts are on). The link opens the phone app
     (sign-in with their own name + PIN) on "Cards from <name>": the cards as the boards show them; a photo opens her
     full card. The person who sent it sees "You sent …" in their own bell.
   Nothing about the model changes; the cards are only shown. */
(function(){
  'use strict';
  if(window.__illuCSend) return; window.__illuCSend = true;
  const ko = () => { try{ return LANG === 'ko'; }catch(e){ return false; } };
  const L = (en, k) => ko() ? k : en;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const me = () => { try{ return ME || ''; }catch(e){ return ''; } };
  const signed = () => { try{ return typeof SIGNED === 'function' ? SIGNED() : !!me(); }catch(e){ return false; } };
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const pname = p => { try{ const r = PEOPLE.get(p) || (typeof GONEID !== 'undefined' && GONEID.get(p)); return r ? r.n : ''; }catch(e){ return ''; } };
  const people = () => { try{ return [...PEOPLE.keys()].filter(p => UUID.test(p) && !(typeof GONEID !== 'undefined' && GONEID.has(p)) && (typeof realPid !== 'function' || realPid(p) === p)).sort((a, b) => pname(a).localeCompare(pname(b))); }catch(e){ return []; } };
  const disc = p => { try{ return idDisc(p, 'ivdisc xs') || ''; }catch(e){ return ''; } };
  const APP = 'https://illumenoctis.github.io/illumenoctis-app/dash/index.html';
  const linkOf = id => APP + '#cards=' + id;
  const SENDI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/></svg>';
  const kinfo = k => { try{ return (window.__illuKInfo && window.__illuKInfo(k)) || {key: k}; }catch(e){ return {key: k}; } };
  function photoOf(k, nm){
    let u = '';
    try{ if(window.__illuMatCover) u = window.__illuMatCover(k) || ''; }catch(e){}
    try{ if(!u && typeof litFacts === 'function') u = (litFacts({key: (typeof normKey === 'function' ? normKey(k) : k), nm}) || {}).photo || ''; }catch(e){}
    try{ if(!u){ const im = document.querySelector('article.uc[data-uck="' + CSS.escape(k) + '"] img, article.uc[data-ivk="' + CSS.escape(k) + '"] img'); if(im) u = im.currentSrc || im.src || ''; } }catch(e){}
    if(u && /^https?:/i.test(u)){ if(window.illu && window.illu.modelPhotos && !window.illu.web) u = 'illuimg://p/' + encodeURIComponent(u) + '?r=' + encodeURIComponent(k) + '&w=200'; else if(window.__illuSmall) u = window.__illuSmall(u, 160); }
    return u;
  }
  const keyOfCard = a => a ? (a.dataset.uck || a.dataset.ivk || a.dataset.cbkey || '') : '';

  /* ---------- the send list (1.2.262, user: "I would actually prefer it to be somewhere on the sidepanel of the card") ----------
     No ticks on the cards themselves (they already carry the date, timer, email sign, arrows and name). Her side panel has
     "Add to send list" (tick box) under her name; the list is kept on this computer until it is sent or cleared. While it
     has cards, a bar at the bottom says how many (hidden while a full card view is open - the panel says it there) with
     Send to… / Clear, and the panel has "Send N cards…". "Send cards" next to Share vote link opens the list. */
  let SEL = [];
  try{ const v = JSON.parse(localStorage.getItem('illu.csend.list') || '[]'); if(Array.isArray(v)) SEL = v.filter(x => typeof x === 'string').slice(0, 60); }catch(e){}
  const keepSel = () => { try{ localStorage.setItem('illu.csend.list', JSON.stringify(SEL.slice(0, 60))); }catch(e){} };
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  let HINT = 0;
  window.__illuSendBtn = k => '<button type="button" class="pnfav pnsend" data-cssend="' + E(k) + '" title="' + E(L('Send only her card to a user', '이 카드만 사용자에게 보내기')) + '" aria-label="' + E(L('Send only her card to a user', '이 카드만 사용자에게 보내기')) + '">' + SENDI + '</button>';
  const rowInner = k => { const on = SEL.includes(k), n = SEL.length;
    return '<button type="button" class="cspick' + (on ? ' on' : '') + '" data-cspick="' + E(k) + '" aria-pressed="' + on + '"><span class="csbox">' + CHECK + '</span>' + E(on ? L('On the send list', '보낼 목록에 있음') : L('Add to send list', '보낼 목록에 추가')) + '</button>' +
      (n ? '<button type="button" class="cslist" data-csgo>' + SENDI + E(L('Send ' + n + (n === 1 ? ' card' : ' cards') + '…', n + '장 보내기…')) + '</button>' : ''); };
  window.__illuSendRow = k => '<div class="pnsendrow" data-csrow="' + E(k) + '">' + rowInner(k) + '</div>';
  const selBtnInner = () => SENDI + E(L('Send cards', '카드 보내기')) + (SEL.length ? ' <s class="csn">' + SEL.length + '</s>' : '');
  window.__illuSendSelBtn = () => '<button type="button" class="ivbtn ivshare csselb' + (SEL.length ? ' on' : '') + '" data-csmode title="' + E(L('The cards on your send list (add a card from its side panel)', '보낼 목록의 카드 (카드 옆 패널에서 추가)')) + '">' + selBtnInner() + '</button>';
  function sync(){
    document.querySelectorAll('[data-csrow]').forEach(r => { r.innerHTML = rowInner(r.dataset.csrow); });
    document.querySelectorAll('[data-csmode]').forEach(b => { b.innerHTML = selBtnInner(); b.classList.toggle('on', !!SEL.length); });
    tray();
  }
  function toggle(k){ const i = SEL.indexOf(k); if(i >= 0) SEL.splice(i, 1); else SEL.push(k); keepSel(); sync(); }
  function tray(){
    let t = document.getElementById('cstray');
    const hint = Date.now() < HINT;
    if(!SEL.length && !hint){ if(t) t.remove(); return; }
    if(!t){ t = document.createElement('div'); t.id = 'cstray'; t.setAttribute('role', 'region'); t.setAttribute('aria-label', L('Send list', '보낼 목록')); document.body.appendChild(t); }
    const n = SEL.length;
    t.innerHTML = '<span class="csti">' + SENDI + '</span><span class="cstt"><b>' + (n ? E(L(n + (n === 1 ? ' card' : ' cards') + ' on the send list', '보낼 목록 ' + n + '장')) : E(L('Your send list is empty', '보낼 목록이 비어 있습니다'))) + '</b><small>' + E(L('Open a card and press “Add to send list” in its side panel', '카드를 열고 옆 패널에서 “보낼 목록에 추가”를 누르세요')) + '</small></span>' +
      (n ? '<button type="button" class="csb pri" data-csgo>' + E(L('Send to…', '보내기…')) + '</button><button type="button" class="csb" data-csclear>' + E(L('Clear', '비우기')) + '</button>' : '<button type="button" class="csb" data-cshintx>' + E(L('OK', '확인')) + '</button>');
  }
  setTimeout(sync, 1500);
  const inUi = t => t.closest && t.closest('#cstray,#csdlg,#csview');

  /* ---------- the Send window ---------- */
  let DLG = null;
  function openDlg(keys){
    if(!signed()){ try{ nudgeSignIn(); }catch(e){} return; }
    DLG = {keys: [...new Set(keys)], to: new Set(), note: '', id: '', sent: null, busy: false, msg: '', list: keys.length > 1 || (keys.length === 1 && SEL.includes(keys[0]))};
    drawDlg();
  }
  function drawDlg(){
    let m = document.getElementById('csdlg');
    if(!DLG){ if(m) m.remove(); return; }
    if(!m){ m = document.createElement('div'); m.id = 'csdlg'; m.className = 'csm'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); document.body.appendChild(m); }
    const ta = m.querySelector('textarea'); if(ta) DLG.note = ta.value;
    const ppl = people().filter(p => p !== me());
    const n = DLG.keys.length;
    const cards = DLG.keys.map(k => { const i = kinfo(k), ph = photoOf(k, i.nm);
      return '<div class="cscard"><span class="csph">' + (ph ? '<img src="' + E(ph) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '') + '<i>' + E(String(i.nm || '?').split(/\s+/).map(w => w[0] || '').join('').slice(0, 2)) + '</i></span>' +
        '<span class="csnm"><b>' + E(i.nm || k) + '</b><small>' + E(i.ag || '') + '</small></span>' +
        (DLG.sent ? '' : '<button type="button" class="csx" data-csrm="' + E(k) + '" aria-label="' + E(L('Take out', '빼기')) + '">×</button>') + '</div>'; }).join('');
    const sentTo = DLG.sent ? DLG.sent.to.map(pname).filter(Boolean) : [];
    m.innerHTML = '<div class="csp"><div class="csh"><b>' + E(DLG.sent ? L('Sent', '보냈습니다') : L('Send ' + n + (n === 1 ? ' card' : ' cards') + ' to a user', n + '장을 사용자에게 보내기')) + '</b><button type="button" class="csxx" data-csclose aria-label="' + E(L('Close', '닫기')) + '">×</button></div>' +
      '<div class="cscards">' + cards + '</div>' +
      (DLG.sent ? '' : '<button type="button" class="csadd" data-csmore>+ ' + E(L('Add more cards', '카드 더 고르기')) + '</button>') +
      (DLG.sent
        ? '<p class="csok">✓ ' + E(sentTo.length ? L('Sent to ' + sentTo.join(', ') + '. It shows in their bell, and as an alert on phones with alerts on.', sentTo.join(', ') + '님께 보냈습니다. 알림 벨과, 알림을 켠 휴대폰에 표시됩니다.') : L('Link made. Anyone on the team who opens it (after signing in) sees these cards.', '링크를 만들었습니다. 링크를 연 팀원은 로그인 후 이 카드들을 봅니다.')) + '</p>'
        : '<div class="csl"><span>' + E(L('Who is it for?', '누구에게 보내나요?')) + '</span>' + (ppl.length > 1 ? '<button type="button" class="csall' + (ppl.every(p => DLG.to.has(p)) ? ' on' : '') + '" data-csall>' + E(L('Everyone', '모두')) + '</button>' : '') + '</div>' +
          '<div class="csps">' + (ppl.length ? ppl.map(p => '<label class="cspp"><input type="checkbox" data-csp="' + E(p) + '"' + (DLG.to.has(p) ? ' checked' : '') + '>' + disc(p) + '<b>' + E(pname(p)) + '</b></label>').join('') : '<p class="csmut">' + E(L('Nobody else on the team has a sign-in yet. Copy the link instead.', '아직 다른 팀원 계정이 없습니다. 링크를 복사하세요.')) + '</p>') + '</div>' +
          '<label class="csl" for="csnote"><span>' + E(L('Note (optional)', '메모 (선택)')) + '</span></label><textarea id="csnote" rows="2" maxlength="500" placeholder="' + E(L('e.g. Which of these for the Seoul job?', '예: 서울 촬영에 누가 좋을까요?')) + '">' + E(DLG.note) + '</textarea>') +
      (DLG.msg ? '<p class="csmut cserr">' + E(DLG.msg) + '</p>' : '') +
      /* 1.2.263 (user: "the 3 sending methods seem redundant"): one Send, and one small "copy / share a link" for KakaoTalk */
      '<div class="csa">' + (DLG.sent ? '<button type="button" class="csb pri" data-csclose>' + E(L('Done', '완료')) + '</button>' : '<button type="button" class="csb pri" data-cssendgo' + (DLG.to.size && !DLG.busy ? '' : ' disabled') + '>' + SENDI + E(DLG.busy ? L('Sending…', '보내는 중…') : DLG.to.size ? L('Send to ' + DLG.to.size + (DLG.to.size === 1 ? ' person' : ' people'), DLG.to.size + '명에게 보내기') : L('Send', '보내기')) + '</button>') +
        '</div>' +
      '<button type="button" class="csalt" ' + (navigator.share && window.illu && window.illu.web ? 'data-csnative' : 'data-cscopy="msg"') + '>' + E(navigator.share && window.illu && window.illu.web ? L('Or share a link (KakaoTalk, messages…)', '또는 링크 공유 (카카오톡, 메시지…)') : L('Or copy a link to paste in KakaoTalk', '또는 카카오톡에 붙여 넣을 링크 복사')) + '</button>' +
      '<p class="csmut sm">' + E(L('The link opens the phone app; they sign in with their own name and PIN. Nothing about the models changes.', '링크는 휴대폰 앱에서 열리며, 받는 사람은 자기 이름과 PIN으로 로그인합니다. 모델 정보는 바뀌지 않습니다.')) + '</p>' +
      '<textarea class="csht" aria-hidden="true" tabindex="-1"></textarea></div>';
  }
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  async function save(){
    if(!DLG) return null;
    const ta = document.querySelector('#csdlg textarea#csnote'); if(ta) DLG.note = ta.value;
    if(!DLG.id) DLG.id = newId();
    const v = {by: me(), at: new Date().toISOString(), to: [...DLG.to], k: DLG.keys.slice(0, 60), m: DLG.keys.slice(0, 60).map(k => { const i = kinfo(k); return {k, nm: String(i.nm || '').slice(0, 80), ag: String(i.ag || '').slice(0, 80)}; }), note: String(DLG.note || '').trim().slice(0, 500)};
    if(typeof DB === 'undefined' || !DB) throw new Error(L('Not connected', '연결되지 않음'));
    await DB.doc('cshare/' + DLG.id).set(v);
    ALL.set(DLG.id, Object.assign({id: DLG.id}, v)); NOTED.add(DLG.id);
    return v;
  }
  async function send(){
    if(!DLG || !DLG.to.size || DLG.busy) return;
    DLG.busy = true; DLG.msg = ''; drawDlg();
    try{
      const v = await save();
      DLG.sent = v;
      if(DLG.list){ SEL = SEL.filter(k => !DLG.keys.includes(k)); keepSel(); sync(); }   /* sent: off the send list */
      try{ const sb = window.__illuSb; if(sb && sb.functions) sb.functions.invoke('illu-push', {body: {kind: 'share', id: DLG.id}}).catch(() => {}); }catch(e){}
    }catch(e){ DLG.msg = L('Could not send: ', '보내지 못했습니다: ') + String(e && e.message || e); }
    DLG.busy = false; drawDlg();
    try{ window.__illuNotifRepaint && window.__illuNotifRepaint(); }catch(e){}
  }
  function msgOf(id, v){
    const nms = (v.m || []).map(x => x.nm).filter(Boolean);
    return L('ILLUMÉNOCTIS — ' + (pname(v.by) || '') + ' sent you ' + nms.length + (nms.length === 1 ? ' model card' : ' model cards') + ': ' + nms.slice(0, 8).join(', ') + (nms.length > 8 ? '…' : ''),
      'ILLUMÉNOCTIS — ' + (pname(v.by) || '') + '님이 모델 카드 ' + nms.length + '장을 보냈습니다: ' + nms.slice(0, 8).join(', ') + (nms.length > 8 ? '…' : '')) + (v.note ? '\n“' + v.note + '”' : '') + '\n' + linkOf(id);
  }
  function copy(txt, btn, host){
    const done = () => { if(!btn) return; const o = btn.textContent; btn.textContent = L('Copied ✓', '복사됨 ✓'); setTimeout(() => { if(btn.isConnected) btn.textContent = o; }, 1400); };
    const fb = () => { const t = host && host.querySelector('.csht'); if(!t) return; t.value = txt; t.select(); try{ document.execCommand('copy'); done(); }catch(e){} };
    try{ (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(done, fb); }catch(e){ fb(); }
  }

  document.addEventListener('click', async e => {
    const t = e.target; if(!t.closest) return;
    const one = t.closest('[data-cssend]'); if(one){ e.preventDefault(); e.stopPropagation(); openDlg([one.dataset.cssend]); return; }
    const md = t.closest('[data-csmode]'); if(md){ e.preventDefault(); e.stopPropagation(); if(!signed()){ try{ nudgeSignIn(); }catch(err){} return; } if(SEL.length) openDlg(SEL.slice()); else { HINT = Date.now() + 8000; tray(); setTimeout(tray, 8100); } return; }
    const pk = t.closest('[data-cspick]'); if(pk){ e.preventDefault(); e.stopPropagation(); toggle(pk.dataset.cspick); return; }
    const go = t.closest('[data-csgo]'); if(go && !t.closest('#csdlg')){ e.preventDefault(); e.stopPropagation(); if(SEL.length) openDlg(SEL.slice()); return; }
    if(t.closest('#cstray')){
      if(t.closest('[data-csclear]')){ SEL = []; keepSel(); sync(); return; }
      if(t.closest('[data-cshintx]')){ HINT = 0; tray(); return; }
      return;
    }
    const m = t.closest('#csdlg'); if(!m || !DLG) return;
    if(t === m || t.closest('[data-csclose]')){ DLG = null; drawDlg(); return; }
    const rm = t.closest('[data-csrm]'); if(rm){ DLG.keys = DLG.keys.filter(k => k !== rm.dataset.csrm); if(DLG.list){ SEL = SEL.filter(k => k !== rm.dataset.csrm); keepSel(); sync(); } if(!DLG.keys.length){ DLG = null; } drawDlg(); return; }
    if(t.closest('[data-csmore]')){ for(const k of DLG.keys) if(!SEL.includes(k)) SEL.push(k); keepSel(); DLG = null; drawDlg(); closeView(); HINT = Date.now() + 8000; sync(); setTimeout(tray, 8100); return; }   /* keep these on the send list; add more from other cards' side panels */
    const cb = t.closest('input[data-csp]'); if(cb){ cb.checked ? DLG.to.add(cb.dataset.csp) : DLG.to.delete(cb.dataset.csp); drawDlg(); return; }
    if(t.closest('[data-csall]')){ const ppl = people().filter(p => p !== me()); if(ppl.every(p => DLG.to.has(p))) DLG.to = new Set(); else DLG.to = new Set(ppl); drawDlg(); return; }
    if(t.closest('[data-cssendgo]')){ send(); return; }
    const cp = t.closest('[data-cscopy]');
    if(cp){
      const wasId = DLG.id;
      try{ if(!DLG.sent) await save(); }catch(err){ DLG.msg = String(err && err.message || err); drawDlg(); return; }
      const v = DLG.sent || ALL.get(DLG.id) || {by: me(), m: []};
      const txt = cp.dataset.cscopy === 'msg' ? msgOf(DLG.id, v) : linkOf(DLG.id);
      if(!wasId){ drawDlg(); const b2 = document.querySelector('#csdlg [data-cscopy="' + cp.dataset.cscopy + '"]'); copy(txt, b2, document.getElementById('csdlg')); }
      else copy(txt, cp, m);
      return;
    }
    if(t.closest('[data-csnative]')){ try{ if(!DLG.sent) await save(); const v = DLG.sent || ALL.get(DLG.id); navigator.share({title: 'ILLUMÉNOCTIS', text: msgOf(DLG.id, v).replace(/\n\S+$/, ''), url: linkOf(DLG.id)}).catch(() => {}); drawDlg(); }catch(err){} return; }
  }, true);
  document.addEventListener('input', e => { if(e.target && e.target.id === 'csnote' && DLG) DLG.note = e.target.value; });
  document.addEventListener('keydown', e => {
    if(e.key !== 'Escape') return;
    if(document.getElementById('csview')){ closeView(); return; }
    if(DLG){ DLG = null; drawDlg(); return; }
  });

  /* ---------- what was sent: the bell, a pop-up, and "Cards from …" ---------- */
  const ALL = new Map();
  const NOTED = new Set();
  let BASE = 0;
  try{ const s = JSON.parse(localStorage.getItem('illu.csend.seen') || 'null'); if(s && s.base){ BASE = s.base; (s.ids || []).forEach(x => NOTED.add(x)); } }catch(e){}
  if(!BASE){ BASE = Date.now() - 3 * 864e5; }
  const keepSeen = () => { try{ localStorage.setItem('illu.csend.seen', JSON.stringify({base: BASE, ids: [...NOTED].slice(-300)})); }catch(e){} };
  keepSeen();
  const docData = d => { try{ return typeof docOf === 'function' ? docOf(d) : d.data(); }catch(e){ return null; } };
  const docId = d => { try{ return d.id || (d.ref && d.ref.id) || String(d.path || '').split('/').pop() || ''; }catch(e){ return ''; } };
  let READY = false;
  (function listen(){
    if(typeof DB === 'undefined' || !DB){ setTimeout(listen, 900); return; }
    try{ DB.collection('cshare').onSnapshot(sn => {
      const fresh = [];
      ALL.clear();
      for(const d of (sn.docs || [])){ const v = docData(d), id = docId(d); if(!v || !id || !Array.isArray(v.k)) continue; ALL.set(id, Object.assign({id}, v));
        if(!NOTED.has(id) && v.by !== me() && (v.to || []).includes(me()) && Date.parse(v.at || 0) > BASE){ NOTED.add(id); fresh.push(Object.assign({id}, v)); } }
      READY = true;
      if(fresh.length){ keepSeen(); tell(fresh); }
      try{ window.__illuNotifRepaint && window.__illuNotifRepaint(); }catch(e){}
      route();
    }, () => {}); }catch(e){ console.warn('cshare', e); }
  })();
  function tell(list){
    try{ window.__illuChime && window.__illuChime(); }catch(e){}
    const x = list[list.length - 1], n = (x.k || []).length;
    try{ window.__illuSysNote && window.__illuSysNote(L((pname(x.by) || 'Someone') + ' sent you ' + n + (n === 1 ? ' model card' : ' model cards'), (pname(x.by) || '누군가') + '님이 모델 카드 ' + n + '장을 보냈습니다'),
      (x.m || []).map(m => m.nm).filter(Boolean).slice(0, 6).join(', ') + (x.note ? '\n“' + x.note + '”' : ''), () => view(x.id)); }catch(e){}
  }
  const mine = () => [...ALL.values()].filter(v => (v.to || []).includes(me()) || v.by === me()).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const prevExtra = window.__illuNotifExtra;
  window.__illuNotifExtra = () => {
    let base = []; try{ base = prevExtra ? prevExtra() || [] : []; }catch(e){}
    const pad = n => String(n).padStart(2, '0');
    return base.concat(mine().slice(0, 15).map(v => { const d = new Date(v.at), n = (v.k || []).length, nms = (v.m || []).map(m => m.nm).filter(Boolean);
      const ts = isNaN(d) ? '' : d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      const head = v.by === me() ? L('You sent ' + n + (n === 1 ? ' card' : ' cards') + ' to ', '보낸 카드 ' + n + '장 → ') + '<b>' + E((v.to || []).map(pname).filter(Boolean).join(', ') || L('a link', '링크')) + '</b>'
        : '<b>' + E(pname(v.by) || '?') + '</b>' + L(' sent you ' + n + (n === 1 ? ' card' : ' cards'), '님이 카드 ' + n + '장을 보냈습니다');
      return {ts, who: v.by === me() ? '' : v.by, html: '📨 ' + head + ': ' + E(nms.slice(0, 3).join(', ') + (nms.length > 3 ? '…' : '')) + (v.note ? ' · “' + E(v.note.slice(0, 80)) + '”' : '') + ' <button type="button" class="alnb" data-csview="' + E(v.id) + '">' + L('Open', '열기') + '</button>'};
    }));
  };
  function closeView(){ const v = document.getElementById('csview'); if(v) v.remove(); document.body.classList.remove('csviewing'); }
  function view(id){
    const v = ALL.get(id); if(!v) return false;
    closeView();
    const m = document.createElement('div'); m.id = 'csview'; m.className = 'csm csv'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    const d = new Date(v.at), when = isNaN(d) ? '' : d.toLocaleString(ko() ? 'ko-KR' : 'en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
    const cards = (v.k || []).map((k, i) => { let h = ''; try{ h = window.__illuMcard ? window.__illuMcard(k) : ''; }catch(e){}
      if(!h){ const x = (v.m || [])[i] || {}; h = '<article class="uc csfb" data-ivk="' + E(k) + '"><div class="ucimg"></div><div class="csfbt"><b>' + E(x.nm || k) + '</b><small>' + E(x.ag || '') + '</small></div></article>'; }
      return '<div class="ivcw">' + h + '</div>'; }).join('');
    const to = (v.to || []).map(pname).filter(Boolean);
    m.innerHTML = '<div class="csp csvp"><div class="csh"><b>' + E(v.by === me() ? L('Cards you sent', '보낸 카드') : L('Cards from ', '') + (pname(v.by) || '?') + L('', '님이 보낸 카드')) + '</b><button type="button" class="csxx" data-csvclose aria-label="' + E(L('Close', '닫기')) + '">×</button></div>' +
      '<p class="csmut">' + E(when + ' · ' + (v.k || []).length + L((v.k || []).length === 1 ? ' card' : ' cards', '장') + (to.length ? ' · ' + L('to ', '받는 사람: ') + to.join(', ') : '')) + '</p>' +
      (v.note ? '<p class="csnote">“' + E(v.note) + '”</p>' : '') +
      '<div class="ivgrid tight csvg">' + cards + '</div></div>';
    document.body.appendChild(m); document.body.classList.add('csviewing');
    return true;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-csview]'); if(b){ e.preventDefault(); e.stopPropagation(); view(b.dataset.csview); return; }
    const m = e.target.closest && e.target.closest('#csview'); if(!m) return;
    if(e.target === m || e.target.closest('[data-csvclose]')){ closeView(); return; }
    if(e.target.closest('button,a,input,textarea,select,label,.vmk')) return;
    const ph = e.target.closest('.ucimg,.ucph,.ucov'); const a = e.target.closest('article.uc');
    if(ph && a){ const k = keyOfCard(a); if(k && window.__illuOpenK){ e.preventDefault(); e.stopPropagation(); window.__illuOpenK(k, ph); } }
  });
  /* the link: …/dash/index.html#cards=<id> */
  let WANT = '', WANTAT = 0;
  function route(){
    const mm = String(location.hash || '').match(/cards=([a-z0-9]+)/i);
    if(mm){ WANT = mm[1]; WANTAT = Date.now(); try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){} }
    if(!WANT) return;
    if(view(WANT)){ WANT = ''; return; }
    if(READY && signed() && Date.now() - WANTAT > 30000){ WANT = ''; try{ toast && toast(L('That link’s cards were not found.', '링크의 카드를 찾지 못했습니다.')); }catch(e){} }
  }
  addEventListener('hashchange', route);
  setTimeout(route, 1500); setInterval(() => { if(WANT) route(); }, 3000);
  window.__illuCardSend = {openDlg, toggle, view, state: () => ({SEL: SEL.slice(), DLG, n: ALL.size})};

  /* ---------- looks ---------- */
  const css = document.createElement('style');
  css.textContent = `
.pn2 .pnsend svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round}
.pn2 .pnsend:hover{color:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57)}
.csselb svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round}
.csselb.on{background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57);color:#fff}
body.illufvon #cstray,body.d2carding #cstray,body.d2fullcard #cstray{display:none}   /* a card is open: its side panel shows the list there */
.pnsendrow{display:flex;flex-wrap:wrap;gap:6px;margin:-4px 0 12px}
.cspick{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line,#e6e0ea);background:var(--surf,#fff);color:var(--ink,#1b1724);border-radius:10px;padding:6px 11px 6px 8px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;min-height:34px}
.cspick .csbox{width:18px;height:18px;border-radius:5px;border:2px solid var(--line,#cfc4d6);display:grid;place-items:center;flex:none}
.cspick .csbox svg{width:13px;height:13px;fill:none;stroke:#fff;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round;opacity:0}
.cspick.on{border-color:var(--acc,#5A2C57);background:var(--wash,#f3e8f2);color:var(--acc,#5A2C57)}
.cspick.on .csbox{background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57)}.cspick.on .csbox svg{opacity:1}
.cslist{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--acc,#5A2C57);background:var(--acc,#5A2C57);color:#fff;border-radius:10px;padding:6px 11px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;min-height:34px}
.cslist svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linejoin:round}
.csselb .csn{text-decoration:none;font-size:11px;background:#fff;color:var(--acc,#5A2C57);border-radius:9px;padding:0 6px;margin-left:2px}
@media (pointer:coarse){.cspick,.cslist{min-height:44px}}
#cstray{position:fixed;z-index:8500;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:10px;background:var(--surf,#fff);color:var(--ink,#1b1724);border:1px solid var(--line,#e6e0ea);border-radius:14px;padding:10px 12px;box-shadow:0 16px 40px rgba(20,10,30,.28);max-width:calc(100vw - 24px)}
#cstray .csti{width:34px;height:34px;border-radius:10px;background:var(--wash,#f3e8f2);color:var(--acc,#5A2C57);display:grid;place-items:center;flex:none}
#cstray .csti svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linejoin:round}
#cstray .cstt{display:flex;flex-direction:column;min-width:0}
#cstray .cstt b{font-size:14px}#cstray .cstt small{font-size:11.5px;color:var(--mut,#7a7086)}
.csb{border:1px solid var(--line,#e6e0ea);background:var(--surf,#fff);color:var(--ink,#1b1724);border-radius:10px;padding:8px 13px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;min-height:38px;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.csb.pri{background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57);color:#fff}
.csb:disabled{opacity:.45;cursor:default}
.csb svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linejoin:round}
.csm{position:fixed;inset:0;z-index:9000;background:rgba(20,14,30,.5);display:grid;place-items:center;padding:16px}
.csm.csv{z-index:3900}   /* under her full view (4000), which opens from it */
.csp{width:480px;max-width:100%;max-height:calc(100vh - 32px);overflow:auto;background:var(--surf,#fff);color:var(--ink,#1b1724);border-radius:16px;padding:18px;box-shadow:0 30px 70px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:12px;text-align:left}
.csh{display:flex;align-items:center;justify-content:space-between;gap:10px}.csh b{font-size:17px}
.csxx{border:0;background:none;font-size:24px;line-height:1;cursor:pointer;color:var(--mut,#7a7086);padding:2px 6px}
.cscards{display:flex;flex-direction:column;gap:6px;max-height:240px;overflow:auto}
.cscard{display:flex;align-items:center;gap:10px;border:1px solid var(--line,#e6e0ea);border-radius:10px;padding:6px 8px}
.csph{position:relative;width:38px;height:48px;border-radius:7px;overflow:hidden;background:linear-gradient(160deg,#4a3046,#231623);flex:none;display:grid;place-items:center}
.csph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.csph i{font-style:normal;font-size:12px;font-weight:700;color:rgba(255,255,255,.7)}
.csnm{display:flex;flex-direction:column;min-width:0;flex:1}.csnm b{font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.csnm small{font-size:11.5px;color:var(--mut,#7a7086);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.csx{border:0;background:none;color:var(--mut,#7a7086);font-size:20px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:8px}.csx:hover{background:var(--wash,#f3e8f2);color:#A8323C}
.csadd{align-self:flex-start;border:1px dashed var(--line,#d9cfe0);background:none;border-radius:10px;padding:7px 12px;font:inherit;font-size:13px;font-weight:600;color:var(--acc,#5A2C57);cursor:pointer}
.csl{display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut,#7a7086);margin:0}
.csall{border:1px solid var(--line,#e6e0ea);background:none;border-radius:99px;padding:3px 10px;font:inherit;font-size:11.5px;cursor:pointer;color:var(--ink,#1b1724);text-transform:none;letter-spacing:0}.csall.on{background:var(--acc,#5A2C57);border-color:var(--acc,#5A2C57);color:#fff}
.csps{display:flex;flex-direction:column;gap:6px}
.cspp{display:flex;align-items:center;gap:9px;border:1px solid var(--line,#e6e0ea);border-radius:10px;padding:8px 10px;cursor:pointer}
.cspp input{width:17px;height:17px;accent-color:var(--acc,#5A2C57)}
#csdlg textarea#csnote{width:100%;box-sizing:border-box;border:1px solid var(--line,#e6e0ea);border-radius:10px;padding:8px 10px;font:inherit;font-size:13.5px;resize:vertical;background:var(--surf,#fff);color:inherit}
.csa{display:flex;gap:8px;flex-wrap:wrap}
.csalt{align-self:center;border:0;background:none;padding:4px 6px;font:inherit;font-size:12.5px;color:var(--mut,#7a7086);text-decoration:underline;text-underline-offset:3px;cursor:pointer}.csalt:hover{color:var(--acc,#5A2C57)}
.csa .csb.pri{flex:1;justify-content:center;min-height:44px;font-size:14px}
.csu{border:1px dashed var(--line,#e6e0ea);border-radius:10px;padding:8px 10px;font-family:ui-monospace,Consolas,monospace;font-size:12px;word-break:break-all;user-select:all}
.csmut{margin:0;color:var(--mut,#7a7086);font-size:13px}.csmut.sm{font-size:12px}.cserr{color:#A8323C}
.csok{margin:0;color:#1F7A4D;font-weight:600;font-size:13.5px}
.csht{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.csvp{width:min(1180px,100%);max-height:calc(100vh - 32px)}
.csnote{margin:0;font-size:14px;line-height:1.5;border-left:3px solid var(--acc,#5A2C57);padding:4px 10px;background:var(--wash,#f7f0f6);border-radius:0 8px 8px 0}
.csvg{margin-top:4px}
.csfb .csfbt{padding:10px;display:flex;flex-direction:column}.csfb .csfbt small{color:var(--mut,#7a7086)}
@media (max-width:760px){
  #cstray{left:8px;right:8px;transform:none;bottom:calc(78px + env(safe-area-inset-bottom,0px));flex-wrap:wrap}
  #cstray{flex-wrap:nowrap;gap:8px;padding:8px}
  #cstray .cstt{flex:1 1 auto}
  #cstray .cstt small{display:none}
  #cstray .csti{display:none}
  .csm{place-items:end center;padding:0}
  .csp{width:100%;max-height:92vh;border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px))}
  .csvp{max-height:96vh}
  .csb{min-height:44px}
}
`;
  document.head.appendChild(css);
})();
