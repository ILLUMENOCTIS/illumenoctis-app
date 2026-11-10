/* The Claude side panel, from the program's side (user, 2026-11-05).
   - ✦ Claude in the top bar (and in the Booking window): opens / closes the panel.
   - Send to Claude (Booking window): puts a request about this model in Claude's message box -
     card details, what is missing, and what to answer with. The person presses Send.
   - Fill from Claude's answer: finds Claude's answer block (ILLU-FILL-BEGIN … ILLU-FILL-END) for
     THIS card, shows every field old -> new with a tick box, and saves only what is ticked.
   Nothing is filled without being seen first. */
(function(){
  'use strict';
  if(!(window.illu && window.illu.claudeToggle)) return;
  const ko = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const T = (en, k) => ko() ? k : en;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
  let OPEN = false;
  const paint = () => document.querySelectorAll('[data-clbtn]').forEach(b => { b.setAttribute('aria-pressed', String(OPEN)); });
  illu.onClaudeState(s => { OPEN = !!(s && s.open); paint(); });
  illu.claudeState().then(s => { OPEN = !!(s && s.open); paint(); }).catch(() => {});

  /* ---- the fields Claude may fill: answer key -> card field, label, kind ---- */
  const F = [
    ['height_cm', 'ht', 'Height (cm)', '키 (cm)', 'num'], ['bust_cm', 'bu', 'Bust (cm)', '가슴 (cm)', 'num'],
    ['waist_cm', 'wa', 'Waist (cm)', '허리 (cm)', 'num'], ['hips_cm', 'hp', 'Hips (cm)', '엉덩이 (cm)', 'num'],
    ['shoe_eu', 'eu', 'Shoes (EU)', '신발 (EU)', 'num'], ['weight_kg', 'wt', 'Weight (kg)', '몸무게 (kg)', 'num'],
    ['date_of_birth', 'dob', 'Date of birth', '생년월일', 'date'], ['nationality', 'nat', 'Nationality', '국적', 'txt'],
    ['hair_color', 'hcol', 'Hair color', '머리 색', 'txt'], ['hair_type', 'htyp', 'Hair type', '머리 형태', 'txt'],
    ['eye_color', 'ecol', 'Eye color', '눈 색', 'txt'], ['experience', 'exp', 'Experience', '경력', 'txt'],
    ['passport_no', 'ppn', 'Passport #', '여권 번호', 'txt'], ['passport_issued', 'ppi', 'Passport issued', '여권 발급일', 'date'],
    ['passport_expires', 'ppe', 'Passport expires', '여권 만료일', 'date'], ['coming_from', 'cfrom', 'Coming from', '출발 국가', 'txt'],
    ['available_days', 'avd', 'Availability (days)', '가능 기간 (일)', 'int'], ['available_from', 'avf', 'Available from', '가능 시작일', 'date'],
    ['entry_date', 'ind', 'Entry date', '입국일', 'date'], ['entry_flight', 'inf', 'Entry flight', '입국 항공편', 'txt'],
    ['departure_date', 'outd', 'Departure date', '출국일', 'date'], ['departure_flight', 'outf', 'Departure flight', '출국 항공편', 'txt']
  ];
  const cardVal = (c, f) => c[f] == null ? '' : String(c[f]);
  const normDate = v => { const m = String(v).trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/); if(m) return m[1].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[3];
    const y = String(v).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/); return y ? y[3] + '/' + y[2] + '/' + y[1] : null; };
  function clean(kind, v){
    if(v == null || v === '') return null;
    if(kind === 'num'){ const x = parseFloat(String(v).replace(',', '.')); return isNaN(x) || x <= 0 ? null : Math.round(x * 10) / 10; }
    if(kind === 'int'){ const x = parseInt(v, 10); return isNaN(x) || x <= 0 ? null : x; }
    if(kind === 'date') return normDate(v);
    const s = String(v).trim().slice(0, 80); return s || null;
  }

  /* ---- the request ---- */
  function request(c){
    const have = [], miss = [];
    for(const [k, f, en] of F){ const v = cardVal(c, f); (v !== '' ? have : miss).push(v !== '' ? en + ': ' + v : en); }
    const place = [c.city, c.country].filter(Boolean).join(', ');
    return [
      'ILLUMENOCTIS booking card — please help with this model.',
      'Model: ' + (c.nm || '?') + ' · Mother agency: ' + (c.ag || '?') + (place ? ' (' + place + ')' : ''),
      'On the card now: ' + (have.join('; ') || 'nothing yet'),
      'Missing: ' + (miss.join(', ') || 'nothing'),
      '',
      '1. Find every email about this model or with this agency in Hiworks, received and sent (https://mails.office.hiworks.com/list/all?page=1&all=<name> and /list/sent?page=1&all=<name>). Read only: do not send, reply, delete, move or change anything, and do not open unread emails (opening marks them read) - count them instead. If you cannot open Hiworks, use the emails I paste here.',
      '2. Summarise them: how many, the date of the first and the last, and the main points (availability, measurements, guarantee/terms, travel, documents). Write every summary twice: in English ("email_summary", "summary") and in Korean ("email_summary_ko", "summary_ko").',
      '3. List every email (received and sent) under "emails": date and time, in or out, sender name and address, to and cc addresses, subject, a one-line summary, its attachments and links (photo, video, pdf, zip or link with the full address - Google Drive, Mediaslide, WeTransfer, Dropbox), and its Hiworks address (/view/...). Count the unread ones you did not open in "unread".',
      '4. Pick out any card details found in the emails or attachments. Put each in its own field: "experience" is the time only (e.g. "5 years"); the countries she has worked in go in "countries_worked" as a list of country names.',
      'End your answer with this block inside a code block (```), filled with only what you found (dates DD/MM/YYYY, cm, kg, EU shoe size, no guesses):',
      'ILLU-FILL-BEGIN',
      JSON.stringify({card: c.id, email_count: 0, first_email: 'DD/MM/YYYY', last_email: 'DD/MM/YYYY', email_summary: '', email_summary_ko: '', unread: 0,
        emails: [{date: 'DD/MM/YYYY HH:MM', dir: 'in', from_name: '', from: '', to: [], cc: [], subject: '', summary: '', summary_ko: '', files: [{kind: 'link', name: '', url: ''}], hiworks: '/view/all/0'}], height_cm: null, bust_cm: null, waist_cm: null, hips_cm: null, shoe_eu: null, weight_kg: null,
        date_of_birth: null, nationality: null, hair_color: null, hair_type: null, eye_color: null, experience: null, passport_no: null, passport_issued: null, passport_expires: null,
        countries_worked: [], coming_from: null, available_days: null, available_from: null, entry_date: null, entry_flight: null, departure_date: null, departure_flight: null}),
      'ILLU-FILL-END'
    ].join('\n');
  }
  /* the last answer block on the page that is for this card and reads as data */
  function findBlock(text, id){
    const re = /ILLU-FILL-BEGIN([\s\S]*?)ILLU-FILL-END/g;
    let m, best = null, other = null;
    while((m = re.exec(text))){
      let body = m[1].trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      /* claude.ai shows the answer with "curly" quotes (and sometimes \" for a closing quote) -
         checked on the live chat 06/11/2026; put the plain quotes back before reading it */
      body = body.replace(/\\"/g, '"').replace(/[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g, '"').replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'");
      const a = body.indexOf('{'), b = body.lastIndexOf('}');
      if(a < 0 || b < a) continue;
      let j = null; try{ j = JSON.parse(body.slice(a, b + 1)); }catch(e){ continue; }
      if(!j || typeof j !== 'object') continue;
      if(j.card === id){ if(j.email_count === 0 && j.first_email === 'DD/MM/YYYY') continue;   // the request's own empty form
        best = j; } else other = j;
    }
    return best ? {j: best} : other ? {wrong: other.card} : null;
  }

  /* ---- buttons ---- */
  const GLYPH = '<span class="clg" aria-hidden="true">✦</span>';
  /* 1.2.112: the Claude panel is taken out (user, 8 Nov 2026: "I have to sign in every single time I use it").
     The buttons are no longer made; the rest of this file stays only for the shared window styles other parts use. */
  const OFF = true;
  function topButton(){
    if(OFF) return;
    if(document.querySelector('.viewbar [data-clbtn]')) return;
    const vb = document.querySelector('.viewbar'); if(!vb) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'clbtn'; b.dataset.clbtn = '1'; b.title = T('Open or close Claude', 'Claude 열기 / 닫기');
    b.innerHTML = GLYPH + '<span>Claude</span>';
    vb.appendChild(b); paint();
  }
  function bvButtons(){
    if(OFF) return;
    const act = document.querySelector('.bv .bvhd .bvact');
    if(!act || act.querySelector('[data-clsend]')) return;
    const box = document.createElement('span'); box.className = 'clbv';
    box.innerHTML = '<button type="button" class="bvbtn clsend" data-clsend title="' + E(T('Put a request about this model in Claude’s box (you press Send)', '이 모델에 대한 요청을 Claude 입력창에 넣습니다 (보내기는 직접)')) + '">' + GLYPH + T('Send to Claude', 'Claude에게 보내기') + '</button>' +
      '<button type="button" class="bvbtn clfill" data-clfill title="' + E(T('Read Claude’s answer and show what it would fill', 'Claude의 답을 읽어 채울 내용을 보여줍니다')) + '">' + T('Fill from Claude’s answer', 'Claude 답으로 채우기') + '</button>';
    act.insertBefore(box, act.firstChild);
    try{ if(typeof bv !== 'undefined' && bv && READY.has(bv.id)) box.querySelector('[data-clfill]').classList.add('clready'); }catch(e){}
  }
  new MutationObserver(() => { topButton(); bvButtons(); }).observe(document.documentElement, {childList: true, subtree: true});
  topButton();

  /* messages about Claude show as a note at the top of the window (the line at the bottom was
     easy to miss - user, 2026-11-06) */
  let toastT = 0;
  const say = t => {
    let el = document.querySelector('.cltoast');
    if(!el){ el = document.createElement('div'); el.className = 'cltoast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 7000);
    try{ bvSay(t); }catch(e){}
  };
  document.addEventListener('click', async e => {
    const t = e.target.closest && e.target.closest('[data-clbtn],[data-clsend],[data-clfill],[data-clx],[data-clok]');
    if(!t) return;
    e.preventDefault(); e.stopPropagation();
    if(t.dataset.clbtn){ const r = await illu.claudeToggle().catch(() => null); OPEN = !!(r && r.open); paint(); return; }
    const c = typeof bv !== 'undefined' && bv && BOOK.get(bv.id);
    if(t.hasAttribute('data-clsend')){
      if(!c) return;
      t.disabled = true;
      /* what is already on the page for this card, so only a new answer counts */
      let base = ''; try{ const r0 = await illu.claudeRead(); const f0 = r0 && r0.ok && findBlock(r0.text, c.id); base = f0 && f0.j ? JSON.stringify(f0.j) : ''; }catch(e){}
      const r = await illu.claudeSend(request(c)).catch(err => ({ok: false, why: String(err && err.message || err)}));
      t.disabled = false;
      say(r && r.ok ? T('The request is in Claude’s box — press Send there. The answer comes onto the card for you to check when Claude finishes.', '요청이 Claude 입력창에 들어갔습니다 — 보내기를 누르세요. Claude가 답하면 확인할 수 있게 카드로 가져옵니다.')
                    : T('Could not put it in Claude: ', 'Claude에 넣지 못했습니다: ') + (r && r.why || ''));
      if(r && r.ok) watch(c.id, base);
      return;
    }
    if(t.hasAttribute('data-clfill')){
      if(!c) return;
      const r = await illu.claudeRead().catch(() => null);
      if(!r || !r.ok){ say(T('Open Claude first (✦ Claude)', '먼저 Claude를 여세요 (✦ Claude)')); return; }
      const f = findBlock(r.text, c.id);
      if(!f){ say(T('No answer for this model yet — Claude’s answer must end with the ILLU-FILL block', '아직 이 모델에 대한 답이 없습니다 — Claude의 답 끝에 ILLU-FILL 블록이 있어야 합니다')); return; }
      if(f.wrong){ say(T('Claude’s answer on screen is for another card', '화면의 Claude 답은 다른 카드에 대한 것입니다')); return; }
      READY.delete(c.id); document.querySelectorAll('[data-clfill]').forEach(b => b.classList.remove('clready'));
      review(c, f.j); return;
    }
    if(t.hasAttribute('data-clx')){ const m = document.querySelector('.clmod'); if(m) m.remove(); return; }
    if(t.hasAttribute('data-clok')) apply(t);
  }, true);

  /* ---- the answer comes to the card by itself (user, 2026-11-06: "I thought the information was
     supposed to go onto the card"): after Send to Claude the program looks at the panel every few
     seconds; when Claude's answer for this card is complete (its ILLU-FILL block is there and
     unchanged for two looks), the check-and-save window opens on its own. Nothing is saved before
     the person presses Save. ---- */
  const WATCH = new Map();     // card id -> {base, last, same, until, t}
  function watch(id, base){
    const old = WATCH.get(id); if(old) clearTimeout(old.t);
    const w = {base, last: '', same: 0, until: Date.now() + 30 * 60e3};
    WATCH.set(id, w);
    const tick = async () => {
      if(WATCH.get(id) !== w) return;
      if(Date.now() > w.until){ WATCH.delete(id); return; }
      let f = null; try{ const r = await illu.claudeRead(); f = r && r.ok ? findBlock(r.text, id) : null; }catch(e){}
      const sig = f && f.j ? JSON.stringify(f.j) : '';
      if(sig && sig !== w.base){
        if(sig === w.last) w.same++; else { w.last = sig; w.same = 0; }
        if(w.same >= 1){
          WATCH.delete(id);
          const c = BOOK.get(id);
          if(c && typeof bv !== 'undefined' && bv && bv.id === id && !document.querySelector('.clmod')){ review(c, f.j); return; }
          READY.set(id, f.j);
          document.querySelectorAll('[data-clfill]').forEach(b => b.classList.add('clready'));
          try{ say(T('Claude’s answer for ', 'Claude의 답이 준비됨: ') + (c && c.nm || '') + T(' is ready — press Fill from Claude’s answer', ' — Claude 답으로 채우기를 누르세요')); }catch(e){}
          return;
        }
      }
      w.t = setTimeout(tick, 3000);
    };
    w.t = setTimeout(tick, 4000);
  }
  const READY = new Map();
  window.__illuClaudeWatch = () => [...WATCH.keys()];

  /* ---- what would change, to tick ---- */
  function review(c, j){
    const rows = [];
    for(const [k, f, en, kr, kind] of F){
      const nv = clean(kind, j[k]); if(nv == null) continue;
      const ov = cardVal(c, f);
      if(String(nv) === ov) continue;
      rows.push({f, label: T(en, kr), ov, nv, tick: ov === ''});
    }
    /* countries worked in: only the ones not on the card yet, added as chips */
    const fixC = v => (window.__illuCcFix ? window.__illuCcFix(v) : String(v || '').trim());
    const haveC = new Set((typeof beenList === 'function' ? beenList(c) : (Array.isArray(c.bn) ? c.bn : [])).map(x => fixC(x && x.c || x).toLowerCase()));
    const addC = [...new Set((Array.isArray(j.countries_worked) ? j.countries_worked : String(j.countries_worked || '').split(/[,;]\s*/)).map(x => fixC(String(x || '').slice(0, 60))).filter(Boolean))].filter(x => !haveC.has(x.toLowerCase()));
    if(addC.length) rows.push({f: '__bn', label: T('Countries worked in', '활동 국가'), ov: haveC.size ? T('(keeps ', '(기존 ') + haveC.size + T(')', '개 유지)') : '', nv: addC.join(', '), add: addC, tick: true});
    const n = parseInt(j.email_count, 10);
    const first = normDate(j.first_email || ''), last = normDate(j.last_email || '');
    const sum = String((ko() && j.email_summary_ko) || j.email_summary || '').trim();
    const emailTxt = (n > 0 || sum) ? (T('Emails', '이메일') + (n > 0 ? ' ' + n : '') + (first ? ' · ' + first + (last && last !== first ? ' – ' + last : '') : '') + '\n' + sum).trim() : '';
    const EM = window.__illuEmail ? window.__illuEmail.fromAnswer(j) : null;
    const newN = EM ? window.__illuEmail.countNew(c, EM) : 0;
    const old = document.querySelector('.clmod'); if(old) old.remove();
    const m = document.createElement('div'); m.className = 'clmod'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="clbox"><h3>' + GLYPH + T('Fill from Claude’s answer', 'Claude 답으로 채우기') + ' · ' + E(c.nm || '') + '</h3>' +
      '<p class="clsub">' + T('Ticked lines are saved on the card. Empty fields are ticked; a field that already has something is not — tick it to replace.', '체크한 줄만 카드에 저장됩니다. 빈 칸은 체크되어 있고, 이미 값이 있는 칸은 바꾸려면 체크하세요.') + '</p>' +
      (rows.length ? '<table class="cltab"><tr><th></th><th>' + T('Field', '항목') + '</th><th>' + T('On the card', '카드 값') + '</th><th>' + T('From Claude', 'Claude 값') + '</th></tr>' +
        rows.map((r, i) => '<tr><td><input type="checkbox" data-cli="' + i + '"' + (r.tick ? ' checked' : '') + '></td><td>' + E(r.label) + '</td><td class="clold">' + (r.ov === '' ? '–' : E(r.ov)) + '</td><td class="clnew">' + E(r.nv) + '</td></tr>').join('') + '</table>'
        : '<p class="clsub">' + T('No new card details in the answer.', '답에 새 카드 정보가 없습니다.') + '</p>') +
      (EM ? '<label class="clem"><input type="checkbox" data-clem checked> ' + T('Put the emails in the Email section', '이메일을 Email 섹션에 넣기') + ' — ' + EM.list.length + T(' emails', '통') + (newN ? ' (' + newN + T(' new', '통 새로') + ')' : T(', nothing new', ', 새 메일 없음')) + '<pre>' + E(emailTxt) + '</pre></label>'
        : emailTxt ? '<label class="clem"><input type="checkbox" data-clem checked> ' + T('Add the email summary to the Email section', '이메일 요약을 Email 섹션에 추가') + '<pre>' + E(emailTxt) + '</pre></label>' : '') +
      '<div class="clbtns"><button type="button" class="bvbtn" data-clx>' + T('Cancel', '취소') + '</button><button type="button" class="bvbtn clokb" data-clok>' + T('Save ticked', '체크한 항목 저장') + '</button></div></div>';
    m.__rows = rows; m.__email = emailTxt; m.__id = c.id; m.__em = EM;
    document.body.appendChild(m);
  }
  function apply(btn){
    const m = btn.closest('.clmod'); if(!m) return;
    const c = BOOK.get(m.__id); if(!c){ m.remove(); return; }
    if(typeof SIGNED === 'function' && !SIGNED()){ try{ nudgeSignIn(); }catch(e){} return; }
    let n = 0;
    m.querySelectorAll('[data-cli]').forEach(x => { if(!x.checked) return; const r = m.__rows[+x.dataset.cli];
      if(r.f === '__bn'){ const list = typeof beenList === 'function' ? beenList(c) : (Array.isArray(c.bn) ? c.bn.slice() : []); for(const v of r.add) list.push({c: v, t: ''}); c.bn = list; n++; return; }
      c[r.f] = r.nv; n++; });
    const em = m.querySelector('[data-clem]');
    if(em && em.checked && m.__em && window.__illuEmail){ window.__illuEmail.merge(c, m.__em); n++; }
    else if(em && em.checked && m.__email){
      const had = (c.s && typeof c.s === 'object' && !Array.isArray(c.s)) ? c.s : {};
      const cur = (had.email && had.email.t) || '';
      const d = new Date(), stamp = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
      const add = '— Claude, ' + stamp + ' —\n' + m.__email;
      c.s = Object.assign({}, had, {email: Object.assign({}, had.email, {t: cur ? cur.replace(/\s+$/, '') + '\n\n' + add : add})});
      n++;
    }
    m.remove();
    if(!n) return;
    saveBook(c.id);
    try{ bvSideRefresh(true); }catch(e){}
    try{ const mx = document.querySelector('.bv .bvhd .bvmx'); if(mx) mx.innerHTML = bvFigures(c); }catch(e){}
    try{ if(typeof renderBook === 'function') renderBook(); }catch(e){}
    say(T('Saved on the card: ', '카드에 저장: ') + n);
  }
  window.__illuClaude = {request, findBlock, review};

  const st = document.createElement('style');
  st.textContent = [
    '.clbtn{display:inline-flex;align-items:center;gap:6px;margin-left:auto;border:1px solid #6b2a5e;background:#fff;color:#6b2a5e;border-radius:999px;padding:5px 13px;font:inherit;font-weight:600;cursor:pointer;white-space:nowrap}',
    '.clbtn[aria-pressed="true"]{background:#6b2a5e;color:#fff}',
    '.clg{color:#d97757;font-size:1.05em}.clbtn[aria-pressed="true"] .clg{color:#ffd2c2}',
    '.bv .clbv{display:inline-flex;gap:6px;margin-right:6px}.bv .clsend,.bv .clfill{white-space:nowrap}.bv .clsend .clg{margin-right:5px}',
    '.clmod{position:fixed;inset:0;z-index:2147483000;background:rgba(20,16,24,.45);display:grid;place-items:center}',
    '.clbox{background:#fff;color:#222;border-radius:14px;max-width:640px;width:calc(100% - 40px);max-height:84vh;overflow:auto;padding:18px 20px;box-shadow:0 20px 60px rgba(0,0,0,.3)}',
    '.clbox h3{margin:0 0 6px;font-size:16px}.clbox .clg{margin-right:6px}.clsub{margin:0 0 10px;color:#666;font-size:12.5px}',
    '.cltab{border-collapse:collapse;width:100%;font-size:13px;margin-bottom:10px}.cltab th{text-align:left;font-weight:600;color:#888;font-size:11px;letter-spacing:.06em;text-transform:uppercase;padding:4px 6px}',
    '.cltab td{border-top:1px solid #eee;padding:6px}.clold{color:#999}.clnew{font-weight:600}',
    '.clem{display:block;font-size:13px;margin:6px 0 10px}.clem pre{white-space:pre-wrap;background:#f6f4f8;border-radius:8px;padding:8px 10px;margin:6px 0 0;font:12.5px/1.45 inherit;max-height:180px;overflow:auto}',
    '.bv .clfill.clready{background:#6b2a5e!important;color:#fff!important;border-color:#6b2a5e!important;animation:clpulse 1.6s ease-in-out infinite}@keyframes clpulse{50%{box-shadow:0 0 0 5px rgba(107,42,94,.25)}}',
    '.cltoast{position:fixed;top:14px;left:50%;transform:translate(-50%,-8px);z-index:2147483001;max-width:min(560px,calc(100vw - 32px));background:#2a1f2a;color:#fff;border-radius:10px;padding:10px 16px;font-size:13px;line-height:1.4;box-shadow:0 8px 30px rgba(0,0,0,.25);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}.cltoast.on{opacity:1;transform:translate(-50%,0)}',
    '.clbtns{display:flex;justify-content:flex-end;gap:8px}.clokb{background:#6b2a5e!important;color:#fff!important;border-color:#6b2a5e!important}'
  ].join('\n');
  document.head.appendChild(st);
})();
