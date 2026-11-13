/* ==================== Email in the booking card (1.2.178) ====================
   User, 13 Nov 2026:
   - "I want to be able to see all the emails that have gone back and forth regarding the model with the person in
     contact ... The side panel isn't big enough to view. I want to be able to view all the emails on the slideshow frame."
   - "is there any way I can see the whole contents of each email (I need to be able to see exactly what they wrote +
     summary)"
   - "Is there a way I can stay logged into Hiworks through this program and have you update me when there is a new
     incoming email from the person in contact in charge of the model? and I would like a notification whenever an
     incoming email does come in to show up."
   What this does:
   - an Email tab in the card's tab row (after the documents): the big frame shows her conversations on the left and the
     chosen conversation on the right - every email in full, oldest first, what Claude summarised at the top, each link
     once (on the email it first came in) with Get files, and unread emails as a line with "Read it here".
   - "Not her" takes a conversation off her card (it stays off after the next Collect); "Put it back" undoes it.
   - every 5 minutes the program looks at the newest mail from the contacts of the models on the Booking board (list lines
     only - nothing is opened or marked read). A new email about one of them: an alert in the program (and a Windows /
     Mac notification when the program is behind other windows), a soft chime, a line under the bell, and the email is
     put on her card. Hiworks stays signed in inside the program (each person's own sign-in, kept between restarts for as
     long as Hiworks allows). */
(function(){
  'use strict';
  if(window.__illuMail) return; window.__illuMail = true;
  if(typeof bvDraw !== 'function' || typeof bvDrawStage !== 'function') return;
  const ko = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const T = (en, k) => ko() ? k : en;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
  const EM = () => window.__illuEmail || {};
  const me = () => { try{ return ME || ''; }catch(e){ return ''; } };
  const dtKey = dt => { const m = String(dt || '').match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/); return m ? m[3] + m[2] + m[1] + (m[4] || '00').padStart(2, '0') + (m[5] || '00') : ''; };
  const dayOf = dt => { const m = String(dt || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/); if(!m) return ''; const d = new Date(+m[3], +m[2] - 1, +m[1]); try{ return d.toLocaleDateString(ko() ? 'ko-KR' : 'en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'}); }catch(e){ return m[1] + '/' + m[2] + '/' + m[3]; } };
  const timeOf = dt => (String(dt || '').match(/\s(\d{1,2}:\d{2})/) || [])[1] || '';
  const SOCIAL = /instagram\.com|tiktok\.com|facebook\.com|youtube\.com|youtu\.be|twitter\.com|x\.com\/|linkedin\.com|wa\.me|whatsapp|hiworks\.com|mdient\.com|google\.com\/maps|goo\.gl\/maps|t\.me\//i;

  /* ---------------- her conversations ---------------- */
  let MV = {cid: '', tk: '', q: '', f: 'all', quoted: {}, msg: '', busy: false, mob: 'list'};
  const PREF = /^\s*((re|fw|fwd|aw|wg|sv|tr|rv|답장|전달|회신)\s*(\[\d+\])?\s*[:：]\s*)+/i;
  function threads(c){
    const X = EM(); if(!X.emOf) return [];
    const em = X.emOf(c), ex = X.exOf(c), by = new Map();
    const get = (subj) => { const tk = X.threadKey(subj) || '(no subject)'; let t = by.get(tk); if(!t){ t = {tk, subj: X.cleanSubj(subj).replace(PREF, '') || T('(no subject)', '(제목 없음)'), list: [], unr: [], hid: !!ex[tk]}; by.set(tk, t); } return t; };
    for(const e of em.list) get(e.subject).list.push(e);
    for(const u of (em.unr || [])) get(u.subject).unr.push(u);
    const out = [...by.values()];
    for(const t of out){
      t.list.sort((a, b) => dtKey(a.dt).localeCompare(dtKey(b.dt)));
      const dts = t.list.map(e => e.dt).concat(t.unr.map(u => u.dt)).filter(Boolean).sort((a, b) => dtKey(a).localeCompare(dtKey(b)));
      t.first = dts[0] || ''; t.last = dts[dts.length - 1] || '';
      const seen = new Set(); t.links = 0;
      for(const e of t.list) for(const f of (e.files || [])) if(f.url && !seen.has(f.url)){ seen.add(f.url); t.links++; }
      const ins = t.list.filter(e => e.dir === 'in');
      t.who = ins.length ? (ins[ins.length - 1].name || ins[ins.length - 1].addr) : (t.list[0] ? (t.list[0].to || [])[0] || '' : (t.unr[0] || {}).name || '');
      t.lastE = t.list[t.list.length - 1] || null;
      const lk = t.lastE ? dtKey(t.lastE.dt) : '', ago = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); })();
      t.waiting = !!(t.lastE && t.lastE.dir === 'in' && !t.unr.length && lk.slice(0, 8) >= ago);     // their email is the last word, in the last 30 days
    }
    return out.sort((a, b) => dtKey(b.last).localeCompare(dtKey(a.last)));
  }
  /* what she wrote, and the earlier emails her email quotes underneath */
  function split(text){
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const QRE = [/^\s*On .{4,160}wrote:\s*$/i, /^\s*-{2,}\s*(Original Message|Forwarded message|원본 메일|전달된 메일)/i, /^\s*(From|보낸 사람|De|Von|От)\s*:\s*.+(@|\[)/i, /^.{0,120}\d{4}.{0,80}<[^>]+@[^>]+>.{0,20}:\s*$/, /^\s*>/, /^_{8,}\s*$/];
    for(let i = 0; i < lines.length; i++){
      if(QRE.some(r => r.test(lines[i]))){
        const own = lines.slice(0, i).join('\n').replace(/\n{3,}/g, '\n\n').trim();
        if(own.length >= 2) return {own, quoted: lines.slice(i).join('\n').trim()};
      }
    }
    return {own: String(text || '').replace(/\n{3,}/g, '\n\n').trim(), quoted: ''};
  }
  const linkify = s => E(s).replace(/(https?:\/\/[^\s<>"']+)/g, u => '<a href="' + u.replace(/[.,;:!?)]+$/, '') + '" target="_blank" rel="noopener">' + u + '</a>');
  const SUM = new Map();                 // card id -> {t: {thread key: {en, ko, wait, wait_ko, files, files_ko, n, at}}}
  async function sums(cid, fresh){
    if(!fresh && SUM.has(cid)) return SUM.get(cid);
    let d = null; try{ const sn = await DB.doc('mailsum/' + cid).get(); d = sn && sn.exists ? sn.data() : null; }catch(e){}
    const v = {t: (d && d.t) || {}}; SUM.set(cid, v); return v;
  }

  /* ---------------- drawing the frame ---------------- */
  const ICM = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';
  function tabBtn(c){
    const X = EM(); if(!X.emOf) return '';
    const em = X.emOf(c), ex = X.exOf(c);
    const n = em.list.filter(e => !ex[X.threadKey(e.subject)]).length, u = (em.unr || []).length;
    return '<span class="bvtg">' + T('Agency', '에이전시') + '</span><button type="button" class="bvtab mltab" role="tab" data-bvmail aria-selected="' + !!(bv && bv.mail) + '">' + T('Email', '이메일') + '<s>' + n + '</s>' + (u ? '<em class="mlnew" title="' + E(T(u + ' unread in Hiworks', '하이웍스에서 안 읽음 ' + u + '통')) + '">' + u + '</em>' : '') + '</button><i class="bvtsep"></i>';
  }
  function addTab(){
    if(!bv || typeof bvTabs === 'undefined') return;
    const c = BOOK.get(bv.id); if(!c) return;
    const old = bvTabs.querySelectorAll('.mltab, .mltabx'); old.forEach(x => x.remove());
    const box = document.createElement('span'); box.className = 'mltabx'; box.style.display = 'contents'; box.innerHTML = tabBtn(c);
    bvTabs.insertBefore(box, bvTabs.firstChild);     /* 1.2.179 (user, 13 Nov 2026: "Move the email to the far left") */
    if(bv.mail) bvTabs.querySelectorAll('[data-bvtab]').forEach(b => b.setAttribute('aria-selected', 'false'));
    try{ if(ko()) langWalk(box); }catch(e){}
  }
  const _draw = bvDraw;
  bvDraw = function(){ _draw.apply(this, arguments); try{ addTab(); }catch(e){ console.warn('mail tab', e); } };
  const _stage = bvDrawStage;
  bvDrawStage = function(c, got){
    if(bv && bv.mail && c){ try{ bvStopMedia(); }catch(e){} drawMail(c); return; }
    return _stage.apply(this, arguments);
  };

  async function drawMail(c){
    if(!bv || !c) return;
    if(MV.cid !== c.id){ MV = {cid: c.id, tk: '', q: '', f: 'all', quoted: {}, msg: '', busy: false, mob: 'list'}; }
    const X = EM();
    const ts = threads(c), shown = ts.filter(t => !t.hid);
    if(!MV.tk || !ts.some(t => t.tk === MV.tk)) MV.tk = (shown[0] || {}).tk || '';
    paint(c, ts, null, null);
    const [v, s] = await Promise.all([X.bodies ? X.bodies(c.id) : {b: {}}, sums(c.id)]);
    if(!bv || !bv.mail || bv.id !== c.id) return;
    paint(c, ts, v, s);
  }
  function paint(c, ts, v, s){
    const X = EM();
    const q = MV.q.trim().toLowerCase();
    const vis = ts.filter(t => !t.hid && (MV.f === 'all' || (MV.f === 'links' && t.links) || (MV.f === 'unread' && t.unr.length) || (MV.f === 'wait' && t.waiting)) &&
      (!q || (t.subj + ' ' + t.who + ' ' + t.list.map(e => (e.name || '') + ' ' + e.addr + ' ' + (e.summary || '') + ' ' + ((v && v.b[e.k]) || '')).join(' ')).toLowerCase().includes(q)));
    const hid = ts.filter(t => t.hid);
    const cur = ts.find(t => t.tk === MV.tk);
    const em = X.emOf ? X.emOf(c) : {list: []};
    const chip = (f, en, k, n) => '<button type="button" class="mlchip" data-mlf="' + f + '" aria-pressed="' + (MV.f === f) + '">' + T(en, k) + (n != null ? ' <b>' + n + '</b>' : '') + '</button>';
    const row = t => '<button type="button" class="mlrow' + (t.tk === MV.tk ? ' on' : '') + (t.hid ? ' hid' : '') + '" data-mlt="' + E(t.tk) + '">' +
      '<span class="mlr1"><span>' + E(t.who || '') + '</span><span>' + E(dayOf(t.last).replace(/^\w+,?\s*/, '')) + '</span></span>' +
      '<span class="mlr2">' + E(t.subj) + '</span>' +
      '<span class="mlr3">' + (t.list.length ? '<i>' + t.list.length + T(t.list.length === 1 ? ' email' : ' emails', '통') + '</i>' : '') + (t.unr.length ? '<i class="u">' + t.unr.length + T(' unread', ' 안 읽음') + '</i>' : '') + (t.links ? '<i class="l">' + t.links + T(t.links > 1 ? ' links' : ' link', ' 링크') + '</i>' : '') + (t.waiting ? '<i class="w">' + T('Your reply?', '답장 필요?') + '</i>' : '') + '</span></button>';
    const can = !!(window.illu && window.illu.hiworksCollect);
    const list = '<div class="mllist">' +
      '<div class="mllh"><input type="search" class="mlq" id="mlq" placeholder="' + E(T('Search her emails…', '이메일 검색…')) + '" value="' + E(MV.q) + '">' +
      '<div class="mlchips">' + chip('all', 'All', '전체', ts.filter(t => !t.hid).length) + chip('unread', 'Unread', '안 읽음', ts.filter(t => !t.hid && t.unr.length).length || null) + chip('links', 'Has links', '링크', null) + chip('wait', 'Your reply?', '답장 필요', null) + '</div>' +
      (can ? '<div class="mlcol"><button type="button" class="bvbtn" data-mlcollect' + (MV.busy ? ' disabled' : '') + '>' + (MV.busy ? T('Reading Hiworks…', 'Hiworks 읽는 중…') : T('Collect from Hiworks', 'Hiworks에서 가져오기')) + '</button><span class="mlst" id="mlst"></span></div>' : '') +
      (MV.msg ? '<p class="mlmsg">' + MV.msg + '</p>' : '') + '</div>' +
      '<div class="mlrows">' + (vis.length ? vis.map(row).join('') : '<p class="mlnone">' + (ts.length ? T('Nothing matches.', '맞는 이메일이 없습니다.') : T('No emails on her card yet.', '아직 이메일이 없습니다.') + (can ? '<br>' + T('Press Collect from Hiworks.', 'Hiworks에서 가져오기를 누르세요.') : '')) + '</p>') +
      (hid.length ? '<details class="mlhid"' + (cur && cur.hid ? ' open' : '') + '><summary>' + T('Not her', '이 모델 아님') + ' · ' + hid.length + '</summary>' + hid.map(row).join('') + '</details>' : '') + '</div></div>';
    const read = cur ? reader(c, cur, v, s) : '<div class="mlread mlempty"><div>' + ICM + '<p>' + E(T('Her emails with ' + (c.ag || 'her agency') + ' show here, every email in full.', (c.ag || '에이전시') + '와 주고받은 이메일이 여기에 전부 보입니다.')) + '</p></div></div>';
    bvStage.innerHTML = '<div class="mlw' + (MV.mob === 'read' && cur ? ' mlrd' : '') + '">' + list + read + '</div>';
    hwStatus();
    const qi = bvStage.querySelector('#mlq');
    if(qi && MV.qfocus){ qi.focus(); const n = qi.value.length; try{ qi.setSelectionRange(n, n); }catch(e){} MV.qfocus = false; }
  }
  function reader(c, t, v, s){
    const X = EM();
    const sm = s && s.t ? s.t[t.tk] : null;
    const seen = new Set();
    let day = '';
    const msgs = t.list.map(e => {
      let h = '';
      const d = dayOf(e.dt); if(d !== day){ day = d; h += '<div class="mlday">' + E(d) + '</div>'; }
      const body = v ? v.b[e.k] : null;
      const sp = body ? split(body) : null;
      const files = (e.files || []).filter(f => f.kind !== 'link' && !f.url);
      const links = (e.files || []).filter(f => f.url && !seen.has(f.url) && (seen.add(f.url), true));
      const ql = MV.quoted[e.k];
      h += '<article class="mlm ' + (e.dir === 'in' ? 'in' : 'out') + '">' +
        '<header><b>' + E(e.dir === 'in' ? (e.name || e.addr) : T('You (MDI)', '나 (MDI)')) + '</b><span>' + E(timeOf(e.dt)) + '</span></header>' +
        '<div class="mlad">' + E(e.dir === 'in' ? (e.name ? e.addr : '') : (e.to || []).length ? 'to ' + e.to.join(', ') : '') + ((e.cc || []).length ? ' · cc ' + E(e.cc.join(', ')) : '') + '</div>' +
        (sp ? '<div class="mltx">' + linkify(sp.own) + '</div>' + (sp.quoted ? '<button type="button" class="mlqb" data-mlqt="' + E(e.k) + '">' + (ql ? T('Hide the earlier emails quoted here', '인용된 이전 메일 숨기기') : T('Show the earlier emails quoted here', '인용된 이전 메일 보기')) + '</button>' + (ql ? '<div class="mltx mlqt">' + linkify(sp.quoted) + '</div>' : '') : '')
           : v ? '<div class="mltx">' + E(e.summary || '') + (e.summary && e.summary.length >= 195 ? ' …' : '') + '</div>'
           : '<div class="mltx mlload">' + E(e.summary || '') + '</div>') +
        (files.length ? '<div class="mlfs">' + files.map(f => '<span class="mlf">📎 ' + E(f.name) + '</span>').join('') + '</div>' : '') +
        (links.length ? '<div class="mllk">' + links.map(f => { let host = ''; try{ host = new URL(f.url).hostname.replace(/^www\./, ''); }catch(err){}
          const lab = /drive\.google/.test(host) ? 'Google Drive' : /mediaslide/.test(host) ? 'Mediaslide' : /wetransfer|we\.tl/.test(host) ? 'WeTransfer' : /dropbox/.test(host) ? 'Dropbox' : /mega\.nz/.test(host) ? 'MEGA' : /netwalk/.test(host) ? 'Netwalk' : host;
          return '<div class="mll"><span class="mlli">' + E(lab.charAt(0).toUpperCase()) + '</span><span class="mllu"><b>' + E(lab) + '</b><small>' + E(f.url.replace(/^https?:\/\//, '')) + '</small></span>' +
            (!SOCIAL.test(f.url) ? '<button type="button" class="bvbtn mlget" data-emget="' + E(f.url) + '">' + T('Get files', '파일 받기') + '</button>' : '') + '<a class="mlopen" href="' + E(f.url) + '" target="_blank" rel="noopener" title="' + E(T('Open the link', '링크 열기')) + '">↗</a></div>'; }).join('') + '</div>' : '') +
        (e.hw ? '<a class="mlhw" href="https://mails.office.hiworks.com' + E(e.hw) + '" target="_blank" rel="noopener">' + T('Open in Hiworks', 'Hiworks에서 열기') + ' ↗</a>' : '') +
        '</article>';
      return h;
    }).join('');
    const unr = t.unr.map(u => '<article class="mlm in mlun"><header><b>' + E(u.name || u.addr) + '</b><span>' + E(dayOf(u.dt) + ' ' + timeOf(u.dt)) + '</span></header>' +
      '<div class="mlad">' + E(u.addr) + '</div><p class="mlnote">' + T('Unread in Hiworks — not opened, so it stays unread there.', 'Hiworks에서 아직 안 읽은 메일 — 열지 않아 그대로 안 읽음으로 남아 있습니다.') + '</p>' +
      '<div class="mlunb">' + (window.illu && window.illu.hiworksRead ? '<button type="button" class="bvbtn bvbtn--acc" data-mlreadno="' + E(u.no) + '">' + T('Read it here', '여기서 읽기') + '</button><small>' + T('It is then marked read in Hiworks too.', 'Hiworks에서도 읽음으로 바뀝니다.') + '</small>' : '') +
      '<a class="mlhw" href="https://mails.office.hiworks.com/view/all/' + E(u.no) + '" target="_blank" rel="noopener">' + T('Open in Hiworks', 'Hiworks에서 열기') + ' ↗</a></div></article>').join('');
    const nIn = t.list.filter(e => e.dir === 'in').length;
    const sumH = sm ? '<section class="mlsum">' +
        '<div><i>' + T('Where it stands', '현재 상황') + '</i><p>' + E(ko() && sm.ko ? sm.ko : sm.en || '') + '</p></div>' +
        (sm.wait || sm.wait_ko ? '<div><i>' + T('Waiting on', '기다리는 것') + '</i><p>' + E(ko() && sm.wait_ko ? sm.wait_ko : sm.wait || '') + '</p></div>' : '') +
        (sm.files || sm.files_ko ? '<div><i>' + T('Files', '파일') + '</i><p>' + E(ko() && sm.files_ko ? sm.files_ko : sm.files || '') + '</p></div>' : '') +
        '<footer>✦ ' + E(T('Summary by Claude', 'Claude 요약')) + (sm.at ? ' · ' + E(new Date(sm.at).toLocaleString(ko() ? 'ko-KR' : 'en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})) : '') + (sm.n && sm.n < t.list.length ? ' · ' + E(T((t.list.length - sm.n) + ' newer email(s) not in it yet', '최근 ' + (t.list.length - sm.n) + '통은 아직 반영 안 됨')) : '') + '</footer></section>'
      : '<section class="mlsum mlsum0"><p>' + E(T('No summary yet. Claude reads her new emails and writes one here every few hours (English and Korean).', '아직 요약이 없습니다. Claude가 몇 시간마다 새 이메일을 읽고 여기에 요약을 씁니다 (영어·한국어).')) + '</p></section>';
    const people = [...new Set(t.list.filter(e => e.dir === 'in').map(e => (e.name ? e.name + ' ' : '') + '<' + e.addr + '>'))].slice(0, 4).join(', ');
    return '<div class="mlread">' +
      '<div class="mlhd"><button type="button" class="mlback" data-mlback aria-label="' + E(T('Back to her conversations', '대화 목록으로')) + '">‹</button><div class="mlhdt"><h3>' + E(t.subj) + '</h3><p>' + E(people || t.who || '') + ' · ' + E(T(t.list.length + ' emails (' + nIn + ' received)', t.list.length + '통 (받음 ' + nIn + ')')) + (t.first ? ' · ' + E(dayOf(t.first)) + (t.first !== t.last ? ' – ' + E(dayOf(t.last)) : '') : '') + '</p></div>' +
        '<div class="mlhda">' + (t.hid ? '<button type="button" class="bvbtn" data-mlunhide="' + E(t.tk) + '">' + T('Put it back on her card', '다시 카드에 넣기') + '</button>' : '<button type="button" class="bvbtn" data-mlhide="' + E(t.tk) + '" title="' + E(T('This conversation is about another model', '다른 모델에 대한 대화입니다')) + '">' + T('Not her', '이 모델 아님') + '</button>') +
        (t.lastE && t.lastE.hw ? '<a class="bvbtn" href="https://mails.office.hiworks.com' + E(t.lastE.hw) + '" target="_blank" rel="noopener">' + T('Reply in Hiworks', 'Hiworks에서 답장') + ' ↗</a>' : '') + '</div></div>' +
      (t.hid ? '<p class="mlhidn">' + E(T('Marked "Not her" — this conversation is kept off her card and her counts.', '"이 모델 아님"으로 표시됨 — 카드와 숫자에서 빠집니다.')) + '</p>' : sumH) +
      (v && t.list.some(e => !v.b[e.k]) ? '<p class="mlpart">' + E(T('Some emails here show only their first lines. Press Collect from Hiworks to bring in the whole texts.', '일부 이메일은 앞부분만 보입니다. Hiworks에서 가져오기를 누르면 전체 내용이 들어옵니다.')) + '</p>' : '') +
      '<div class="mlthread">' + msgs + unr + '</div>' +
      '<div class="mlfoot">' + E(T('Each email is also saved as a page in her folder 9. EMAIL (this computer, Dropbox and Z:).', '각 이메일은 모델 폴더 9. EMAIL에도 저장됩니다 (이 컴퓨터, Dropbox, Z:).')) + '</div></div>';
  }
  async function hwStatus(){
    const el = bvStage.querySelector('#mlst'); if(!el || !(window.illu && illu.hiworksStatus)) return;
    let st = null; try{ st = await illu.hiworksStatus(me()); }catch(e){}
    if(!el.isConnected) return;
    if(st && st.signed){ const w = WS.at ? new Date(WS.at) : null; el.innerHTML = '<i class="mldot"></i>' + E(T('Hiworks signed in', 'Hiworks 로그인됨')) + (w ? ' · ' + E(T('checked ', '확인 ')) + E(w.toLocaleTimeString(ko() ? 'ko-KR' : 'en-GB', {hour: '2-digit', minute: '2-digit'})) : ''); }
    else el.innerHTML = '<button type="button" class="bvbtn" data-emsignin>' + T('Sign in to Hiworks', 'Hiworks 로그인') + '</button>';
  }
  window.__illuMailRedraw = () => { try{ if(bv && bv.mail){ const c = BOOK.get(bv.id); if(c) drawMail(c); addTab(); } else if(bv) addTab(); }catch(e){} };
  function openMail(cid, tk){
    try{
      if(!bv || bv.id !== cid){ if(typeof bvOpenFor === 'function') bvOpenFor(cid); }
      if(!bv) return;
      bv.mail = true; bv.choose = false; if(tk) MV = {cid, tk, q: '', f: 'all', quoted: {}, msg: '', busy: false, mob: 'read'};
      bvDraw();
    }catch(e){ console.warn('open mail', e); }
  }
  window.__illuOpenMail = openMail;

  /* ---------------- clicks ---------------- */
  document.addEventListener('click', async e => {
    const t = e.target.closest ? e.target : null; if(!t) return;
    if(t.closest('[data-emopenbig]') && bv){ e.preventDefault(); e.stopPropagation(); bv.mail = true; bv.choose = false; bvDraw(); return; }
    if(!bv || typeof bvEl === 'undefined' || !bvEl.contains(t)) return;
    const c = BOOK.get(bv.id); if(!c) return;
    if(t.closest('[data-bvmail]')){ e.preventDefault(); e.stopPropagation(); bv.mail = true; bv.choose = false; bvDraw(); return; }
    if(t.closest('[data-bvtab]') && bv.mail){ bv.mail = false; try{ if(!BVLOAD.get(bv.id)) bv.choose = true; }catch(err){} }        // the folder tabs work as before
    if(!bv.mail) return;
    const g = (sel) => t.closest(sel);
    let b;
    if((b = g('[data-mlt]'))){ e.preventDefault(); MV.tk = b.dataset.mlt; MV.mob = 'read'; drawMail(c); const r = bvStage.querySelector('.mlread'); if(r) r.scrollTop = 0; return; }
    if(g('[data-mlback]')){ e.preventDefault(); MV.mob = 'list'; drawMail(c); return; }
    if((b = g('[data-mlf]'))){ e.preventDefault(); MV.f = b.dataset.mlf; drawMail(c); return; }
    if((b = g('[data-mlqt]'))){ e.preventDefault(); MV.quoted[b.dataset.mlqt] = !MV.quoted[b.dataset.mlqt]; drawMail(c); return; }
    if((b = g('[data-mlhide]')) || (b = g('[data-mlunhide]'))){
      e.preventDefault();
      try{ if(!SIGNED()){ nudgeSignIn(); return; } }catch(err){}
      const tk = b.dataset.mlhide || b.dataset.mlunhide, ex = Object.assign({}, (c.emx && typeof c.emx === 'object') ? c.emx : {});
      if(b.dataset.mlhide) ex[tk] = {by: me(), at: new Date().toISOString()}; else delete ex[tk];
      c.emx = ex; try{ saveBook(c.id, true); }catch(err){}
      if(b.dataset.mlhide){ const nx = threads(c).find(x => !x.hid); MV.tk = nx ? nx.tk : ''; MV.mob = 'list'; }
      drawMail(c); addTab(); try{ bvSideRefresh(true); }catch(err){} return;
    }
    if(g('[data-mlcollect]')){
      e.preventDefault(); const X = EM(); if(!X.collect || MV.busy) return;
      MV.busy = true; MV.msg = ''; drawMail(c);
      const r = await X.collect(c, true);
      MV.busy = false;
      MV.msg = !r ? '' : r.need === 'signin' ? E(T('Hiworks needs you to sign in once in the program.', 'Hiworks 로그인이 한 번 필요합니다.')) + ' <button type="button" class="bvbtn" data-emsignin>' + T('Sign in to Hiworks', 'Hiworks 로그인') + '</button>'
        : !r.ok ? E(T('Could not read Hiworks: ', 'Hiworks를 읽지 못했습니다: ') + (r.why || ''))
        : E(T(r.kept + ' of her emails · ' + r.n + ' new' + (r.skipped ? ' · ' + r.skipped + ' about other models left out' : ''), r.kept + '통 · 새로 ' + r.n + '통' + (r.skipped ? ' · 다른 모델 ' + r.skipped + '통 제외' : '')));
      try{ SUM.delete(c.id); }catch(err){}
      drawMail(c); addTab(); return;
    }
    if((b = g('[data-mlreadno]'))){
      e.preventDefault(); const X = EM(); if(!X.readOne) return;
      b.disabled = true; b.textContent = T('Opening…', '여는 중…');
      const r = await X.readOne(c, b.dataset.mlreadno);
      if(!r || !r.ok){ MV.msg = E(r && r.need === 'signin' ? T('Sign in to Hiworks first.', '먼저 Hiworks에 로그인하세요.') : T('Could not open it: ', '열지 못했습니다: ') + ((r && r.why) || '')); }
      drawMail(c); addTab(); return;
    }
  }, true);
  document.addEventListener('input', e => {
    if(!(e.target && e.target.id === 'mlq') || !bv || !bv.mail) return;
    MV.q = e.target.value; MV.qfocus = true;
    clearTimeout(MV.qt); MV.qt = setTimeout(() => { const c = BOOK.get(bv.id); if(c) drawMail(c); }, 160);
  });

  /* ---------------- new email from a model's contact ---------------- */
  const WS = {at: '', busy: false};
  const SK = () => 'illu.mailw.' + me();
  const stRead = () => { try{ return JSON.parse(localStorage.getItem(SK()) || 'null') || null; }catch(e){ return null; } };
  const stKeep = v => { try{ localStorage.setItem(SK(), JSON.stringify(v)); }catch(e){} };
  function contacts(){
    const X = EM(), map = new Map();
    if(!X.agAddrs) return map;
    let cards = []; try{ cards = [...BOOK.values()]; }catch(e){}
    /* the models still in hand first: their emails are the ones that matter */
    cards.sort((a, b) => String(b.up || b.at || '').localeCompare(String(a.up || a.at || '')));
    for(const c of cards){
      if(!c || !c.nm) continue;
      let A; try{ A = X.agAddrs(c); }catch(e){ continue; }
      for(const a of A.addrs){ if(!map.has(a)) map.set(a, []); map.get(a).push(c); }
      if(map.size >= 60) break;
    }
    return map;
  }
  async function watch(){
    if(WS.busy || !(window.illu && illu.hiworksNew) || !me()) return;
    try{ if(typeof BOOK === 'undefined' || !BOOK.size) return; }catch(e){ return; }
    WS.busy = true;
    try{
      const map = contacts(); if(!map.size) return;
      const r = await illu.hiworksNew([...map.keys()], me()).catch(() => null);
      if(!r || !r.ok) return;
      WS.at = r.at || new Date().toISOString();
      let s = stRead();
      const first = !s;
      if(!s) s = {base: WS.at, seen: {}, log: []};
      const fresh = [];
      for(const m of r.list){
        if(s.seen[m.no]) continue;
        s.seen[m.no] = 1;
        const when = new Date(String(m.at || '').replace(' ', 'T'));
        if(first || (!isNaN(when) && when < new Date(s.base))) continue;     // only what came in after the watch began
        const X = EM();
        const cs = (map.get(m.addr) || []).filter(c => { try{ return X.nameOk(c, m.subject, '') && !X.exOf(c)[X.threadKey(m.subject)]; }catch(e){ return false; } });
        if(!cs.length) continue;
        fresh.push({m, c: cs[0]});
      }
      const ks = Object.keys(s.seen); if(ks.length > 4000) for(const k of ks.slice(0, ks.length - 3000)) delete s.seen[k];
      for(const x of fresh) s.log.unshift({no: x.m.no, cid: x.c.id, nm: x.c.nm || '', ag: x.c.ag || '', who: x.m.name || x.m.addr, subject: x.m.subject, at: x.m.at});
      s.log = s.log.slice(0, 30);
      stKeep(s);
      for(const x of fresh.slice(0, 4)) alertBox(x);
      if(fresh.length){
        try{ window.__illuChime && window.__illuChime(); }catch(e){}
        const one = fresh[0];
        try{ window.__illuSysNote && window.__illuSysNote(fresh.length > 1 ? T(fresh.length + ' new emails about your models', '모델 관련 새 이메일 ' + fresh.length + '통') : T('New email about ' + (one.c.nm || ''), (one.c.nm || '') + ' 관련 새 이메일'),
          fresh.slice(0, 3).map(x => (x.m.name || x.m.addr) + ' — ' + x.m.subject).join('\n'), () => openMail(one.c.id, (EM().threadKey || (v => v))(one.m.subject))); }catch(e){}
        try{ window.__illuNotifRepaint && window.__illuNotifRepaint(); }catch(e){}
        /* put the new emails on her card (unread ones as a line; nothing is opened) */
        const done = new Set();
        for(const x of fresh){ if(done.has(x.c.id)) continue; done.add(x.c.id); try{ await EM().collect(x.c, true); }catch(e){} }
        window.__illuMailRedraw();
      }
    } finally { WS.busy = false; }
  }
  function alertBox(x){
    const BOX = window.__illuAlertBox && window.__illuAlertBox(); if(!BOX) return;
    const el = document.createElement('div'); el.className = 'alc mlal'; el.setAttribute('role', 'alertdialog');
    let ph = ''; try{ ph = typeof bkPhoto === 'function' ? bkPhoto(x.c) : ''; }catch(e){}
    const nm = x.c.nm || T('her', '모델');
    const d = new Date(String(x.m.at).replace(' ', 'T'));
    el.innerHTML = '<div class="albar"></div><div class="alin"><span class="alpic">' + (ph ? '<img src="' + E(ph) + '" alt="" referrerpolicy="no-referrer">' : '<i>✉</i>') + '</span>' +
      '<div class="altx"><div class="alk">' + T('NEW EMAIL', '새 이메일') + '</div><div class="alt">' + E(T((x.m.name || x.m.addr) + ' wrote about ' + nm, (x.m.name || x.m.addr) + ' — ' + nm + ' 관련 메일')) + '</div>' +
      '<div class="als">' + E([x.m.subject, x.c.ag, isNaN(d) ? '' : d.toLocaleTimeString(ko() ? 'ko-KR' : 'en-GB', {hour: '2-digit', minute: '2-digit'})].filter(Boolean).join(' · ')) + '</div></div>' +
      '<button type="button" class="alx" data-alm="x" aria-label="' + E(T('Later', '나중에')) + '">×</button></div>' +
      '<div class="alacts"><span class="alsp"></span><button type="button" class="albtn" data-alm="x">' + T('Later', '나중에') + '</button><button type="button" class="albtn pri" data-alm="open">' + T('Open her emails', '이메일 보기') + '</button></div>';
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-alm]'); if(!b) return;
      el.classList.add('out'); setTimeout(() => el.remove(), 220);
      if(b.dataset.alm === 'open') openMail(x.c.id, (EM().threadKey || (v => v))(x.m.subject));
    });
    BOX.prepend(el);
    while(BOX.children.length > 4) BOX.lastElementChild.remove();
  }
  /* the bell keeps the latest new emails */
  const prevExtra = window.__illuNotifExtra;
  window.__illuNotifExtra = () => {
    let base = []; try{ base = prevExtra ? prevExtra() || [] : []; }catch(e){}
    const s = stRead(); if(!s || !s.log) return base;
    const pad = n => String(n).padStart(2, '0');
    return base.concat(s.log.slice(0, 15).map(l => { const d = new Date(String(l.at).replace(' ', 'T'));
      return {ts: isNaN(d) ? '' : d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()), who: '',
        html: '✉ <b>' + E(l.who) + '</b> ' + E(T('wrote about ', '— ')) + '<b>' + E(l.nm) + '</b>' + E(T('', ' 관련 메일')) + ' · ' + E(l.subject) + ' <button type="button" class="alnb" data-almopen="' + E(l.cid) + '" data-almtk="' + E((EM().threadKey || (v => v))(l.subject)) + '">' + T('Open', '열기') + '</button>'}; }));
  };
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-almopen]'); if(!b) return; e.preventDefault(); e.stopPropagation(); openMail(b.dataset.almopen, b.dataset.almtk); }, true);
  if(window.illu && illu.hiworksNew){ setTimeout(watch, 25000); setInterval(watch, 5 * 60000); }
  window.__illuMailTest = {threads, split, watch, openMail, state: () => MV};

  /* ---------------- looks ---------------- */
  const css = document.createElement('style');
  css.textContent = [
    '.bvtabs .mltab .mlnew{font-style:normal;margin-left:5px;background:#c2410c;color:#fff;border-radius:9px;padding:0 6px;font-size:10.5px;font-weight:700}',
    '.bv .bvstage:has(.mlw){position:relative;overflow:hidden;padding:0!important;background:var(--surf,#fff)!important;color:var(--ink,#1b1724)!important}',
    '.mlw{position:absolute;inset:0;display:grid;grid-template-columns:minmax(250px,320px) minmax(0,1fr);background:var(--surf,#fff);color:var(--ink,#1b1724);text-align:left;font-size:13.5px}',
    '.mllist{display:flex;flex-direction:column;min-height:0;border-right:1px solid var(--line,#e6e0ea)}',
    '.mllh{padding:12px;display:flex;flex-direction:column;gap:8px;border-bottom:1px solid var(--line,#e6e0ea)}',
    '.mlq{border:1px solid var(--line,#e2dce6);border-radius:8px;padding:7px 10px;font:inherit;font-size:13px;background:var(--surf,#fff);color:inherit}',
    '.mlchips{display:flex;flex-wrap:wrap;gap:5px}.mlchip{border:1px solid var(--line,#e2dce6);background:none;border-radius:99px;padding:2px 9px;font:inherit;font-size:11.5px;color:var(--mut,#6d6577);cursor:pointer}',
    '.mlchip[aria-pressed="true"]{background:#f3e9f2;border-color:#6b2a5e;color:#6b2a5e;font-weight:600}.mlchip b{font-weight:700}',
    '.mlcol{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.mlst{font-size:11.5px;color:var(--mut,#6d6577);display:inline-flex;align-items:center;gap:5px}.mldot{width:7px;height:7px;border-radius:50%;background:#2E8A55;display:inline-block}',
    '.mlmsg{margin:0;font-size:12px;color:var(--mut,#6d6577)}.mlmsg .bvbtn{margin-left:4px}',
    '.mlrows{overflow:auto;min-height:0;flex:1}.mlnone{padding:18px 14px;color:var(--mut,#6d6577);font-size:12.5px;margin:0}',
    '.mlrow{display:flex;flex-direction:column;gap:2px;width:100%;text-align:left;border:0;border-bottom:1px solid var(--line,#efeaf2);background:none;padding:11px 14px;font:inherit;color:inherit;cursor:pointer}',
    '.mlrow:hover{background:#faf7fb}.mlrow.on{background:#f3e9f2}.mlrow.hid{opacity:.6}',
    '.mlr1{display:flex;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--mut,#6d6577)}.mlr1 span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mlr2{font-weight:600;font-size:13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.mlr3{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px}.mlr3 i{font-style:normal;font-size:10.5px;font-weight:600;padding:1px 7px;border-radius:99px;background:#f1eef4;color:#6d6577}',
    '.mlr3 i.u{background:#fde8dc;color:#c2410c}.mlr3 i.l{background:#e5f3ea;color:#2E8A55}.mlr3 i.w{background:#fbf1e1;color:#a16207}',
    '.mlhid summary{padding:10px 14px;font-size:12px;color:var(--mut,#6d6577);cursor:pointer}',
    '.mlread{overflow:auto;min-height:0;padding:16px 24px 28px;display:flex;flex-direction:column;gap:14px}',
    '.mlempty{align-items:center;justify-content:center;text-align:center;color:var(--mut,#6d6577)}.mlempty svg{width:34px;height:34px;fill:none;stroke:currentColor;stroke-width:1.5}',
    '.mlhd{display:flex;align-items:flex-start;gap:12px}.mlhdt{flex:1;min-width:0}.mlhd h3{margin:0;font-size:17px;line-height:1.3}.mlhd p{margin:3px 0 0;font-size:12px;color:var(--mut,#6d6577)}',
    '.mlhda{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.mlhda a.bvbtn{text-decoration:none}.mlback{display:none}',
    '.mlhidn{margin:0;font-size:12.5px;color:#a16207;background:#fbf1e1;border-radius:8px;padding:8px 12px}',
    '.mlsum{border:1px solid #6b2a5e;background:#f7eff6;border-radius:12px;padding:12px 14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px 16px}',
    '.mlsum i{display:block;font-style:normal;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6b2a5e;font-weight:700;margin-bottom:2px}.mlsum p{margin:0;font-size:12.8px;line-height:1.5}',
    '.mlsum footer{grid-column:1/-1;font-size:11px;color:var(--mut,#6d6577)}.mlsum0{border-style:dashed;background:none;display:block}.mlsum0 p{color:var(--mut,#6d6577)}',
    '.mlthread{display:flex;flex-direction:column;gap:10px}.mlday{text-align:center;font-size:11px;font-weight:600;letter-spacing:.05em;color:var(--mut,#8a8291);margin-top:4px}',
    '.mlm{max-width:min(720px,88%);border-radius:14px;padding:10px 14px;display:flex;flex-direction:column;gap:5px}',
    '.mlm.in{align-self:flex-start;background:#f4f2f6;border-top-left-radius:4px}.mlm.out{align-self:flex-end;background:#f3e9f2;border-top-right-radius:4px}',
    '.mlm header{display:flex;justify-content:space-between;gap:14px;font-size:12px;color:var(--mut,#6d6577)}.mlm header b{color:var(--ink,#1b1724);font-weight:650}',
    '.mlad{font-size:11px;color:var(--mut,#8a8291);margin-top:-3px;overflow-wrap:anywhere}',
    '.mltx{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13.3px;line-height:1.55}.mltx a{color:#6b2a5e}.mlqt{border-left:3px solid #ddd2e0;padding-left:10px;color:#6d6577;font-size:12.5px}.mlload{color:#888}',
    '.mlqb{align-self:flex-start;border:0;background:none;color:#6b2a5e;font:inherit;font-size:11.5px;padding:0;cursor:pointer;text-decoration:underline}',
    '.mlnote{margin:0;font-size:11.5px;color:#a16207}.mlfs{display:flex;flex-wrap:wrap;gap:5px}.mlf{font-size:11.5px;background:#fff;border:1px solid #e6e2ea;border-radius:6px;padding:1px 7px}',
    '.mllk{display:flex;flex-direction:column;gap:6px}.mll{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e6e2ea;border-radius:10px;padding:7px 9px}',
    '.mlli{width:28px;height:28px;border-radius:7px;background:#e5f3ea;color:#2E8A55;display:grid;place-items:center;font-weight:700;font-size:12px;flex:none}',
    '.mllu{flex:1;min-width:0;display:flex;flex-direction:column;font-size:12px}.mllu small{color:#8a8291;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mlopen{color:#8a8291;text-decoration:none;font-size:15px;padding:0 4px}.mlhw{align-self:flex-start;font-size:11.5px;color:#6b2a5e;text-decoration:none}',
    '.mlun{border:1px dashed #e8b9a0;background:#fff8f4}.mlunb{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.mlunb small{color:#8a8291;font-size:11px}',
    '.mlpart{margin:0;font-size:12px;color:#a16207;background:#fbf1e1;border-radius:8px;padding:7px 12px}.mlad:empty{display:none}',
    '.mlfoot{font-size:11px;color:var(--mut,#8a8291);border-top:1px solid var(--line,#efeaf2);padding-top:10px}',
    'html[data-theme="dim"] .mlm.in{background:#2c2734}html[data-theme="dim"] .mlm.out,html[data-theme="dim"] .mlrow.on,html[data-theme="dim"] .mlsum{background:#3a2a3c}html[data-theme="dim"] .mll,html[data-theme="dim"] .mlf{background:#26222e;border-color:#463e51}html[data-theme="dim"] .mlrow:hover{background:#2c2734}',
    '#illual .alc.mlal .alpic i{font-style:normal}',
    '@media (max-width:760px){.mlw{grid-template-columns:1fr}.mlw .mlread{display:none}.mlw.mlrd .mllist{display:none}.mlw.mlrd .mlread{display:flex;padding:12px 14px 24px}',
    '.mlback{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;border:1px solid var(--line,#e2dce6);background:none;font-size:20px;line-height:1;color:inherit;flex:none}.mlhd{flex-wrap:wrap}.mlhda{width:100%;justify-content:flex-start}',
    '.mlm{max-width:94%}.mlrow{padding:12px 14px;min-height:44px}.mlchip{padding:5px 11px}.mlhda .bvbtn,.mlget,.mlunb .bvbtn{min-height:40px}}'
  ].join('\n');
  document.head.appendChild(css);
})();
