/* ==================== Contracts on the booking card (1.2.92; No Guarantee added 1.2.93) ====================
   What the user asked for (6 Nov 2026):
   - the Guarantee stage is called "Guarantee Type", with three types:
       No Guarantee · Condition Guarantee · Net Guarantee;
   - the Visa stage has a Visa type: C-4 or E-6;
   - once the guarantee is agreed, the contract is made from the company's own Excel
     contract, filled in from the card, and kept in the model's "5. CONTRACT" folder
     (this computer and Dropbox) as the Excel file and the PDF that goes to the agency.
   The Contract stage shows every detail the contract needs, which ones are still
   missing, and one button that makes both files once nothing is missing. The Excel file
   opens in Excel to be checked; the signed copy that comes back goes in the same folder.
   Templates so far: Net Guarantee. The other contracts are added as the user sends them. */
(function(){
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

  /* ---------- the stage names and the two type choices ---------- */
  try{ const g = BKSEC.find(x => x[0] === 'guar'); if(g) g[1] = 'Guarantee Type'; }catch(e){}
  try{ Object.assign(KO, {'Guarantee Type': '개런티 유형'}); }catch(e){}
  const GTY = [['no', 'No Guarantee', '노 개런티'], ['cond', 'Condition Guarantee', '컨디션 개런티'], ['net', 'Net Guarantee', '넷 개런티']];
  const GTIP = {
    no: ['No guarantee amount is paid.', '개런티 금액이 없습니다.'],
    cond: ['The model must work the agreed number of jobs (e.g. 5 FD) to get the full guarantee; if not, it drops to the amount agreed for the contract.', '모델이 합의된 잡 수(예: 5 FD)를 채워야 개런티 전액을 받고, 못 채우면 계약 시 합의한 금액으로 내려갑니다.'],
    net: ['The model is paid the agreed amount once the contract is completed.', '계약 기간이 끝나면 합의된 금액을 지급합니다.']
  };
  const VTY = [['c4', 'C-4 visa', 'C-4 비자'], ['e6', 'E-6 visa', 'E-6 비자']];
  function typeRow(c, field, list, label){
    const v = c[field] || '';
    return '<div class="ctype" data-ctype="' + H(c.id) + '|' + field + '"><span class="ctlab">' + H(label) + '</span>' +
      list.map(([k, en, ko]) => '<button type="button" class="ctopt' + (v === k ? ' on' : '') + '" aria-pressed="' + (v === k) + '" data-ctset="' + H(c.id) + '|' + field + '|' + k + '">' + H(L(en, ko)) + '</button>').join('') +
      (field === 'gty' && GTIP[v] ? '<p class="cthint">' + H(L(GTIP[v][0], GTIP[v][1])) + '</p>' : '') + '</div>';
  }

  /* ---------- what the Net Guarantee contract needs ---------- */
  const MON = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
  function pdate(s){
    const m = String(s || '').trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/); if(!m) return null;
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    return d.getDate() === +m[1] && d.getMonth() === +m[2] - 1 ? d : null;
  }
  const money = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[^\d.]/g, '')); return isNaN(n) ? null : n; };
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const num1 = v => { const n = parseFloat(v); return isNaN(n) ? null : Math.round(n * 10) / 10; };
  const has = v => v != null && String(v).trim() !== '';
  /* each row: card field, label, where its value comes from when the contract box is empty */
  /* which contracts the program can make, by Guarantee Type (the user's own Excel files, in app/templates) */
  const KINDS = {net: {en: 'Net Guarantee contract', ko: '넷 개런티 계약서', file: 'MDI_CONTRACT_GUAR_Net_Guarantee_'}, no: {en: 'No Guarantee contract', ko: '노 개런티 계약서', file: 'MDI_CONTRACT_No_Guarantee_'}, cond: {en: 'Condition Guarantee contract', ko: '컨디션 개런티 계약서', file: 'MDI_CONTRACT_GUAR_Condition_'}};
  function rows(c){
    const kind = c.gty;
    let f = {}; try{ f = bkFacts(c) || {}; }catch(e){}
    const ag = String(c.ag || '');
    return [
      {k: 'ctfn', en: 'Model full name (as on the passport)', ko: '모델 전체 이름 (여권과 동일)', ph: c.nm || ''},
      {k: 'nat', en: 'Nationality', ko: '국적', shared: true},
      {k: 'ppn', en: 'Passport number', ko: '여권 번호', shared: true},
      {k: 'ctsex', en: 'Female or male (her / his)', ko: '여성 / 남성', auto: f.g === 'F' ? 'F' : f.g === 'M' ? 'M' : '', sel: [['F', L('Female', '여성')], ['M', L('Male', '남성')]]},
      {k: 'ctag', en: 'Mother agency', ko: '마더 에이전시', auto: ag},
      {k: 'ctad1', en: 'Mother agency address, line 1', ko: '마더 에이전시 주소 1'},
      {k: 'ctad2', en: 'Mother agency address, line 2 (city, country, postcode)', ko: '마더 에이전시 주소 2 (도시, 국가, 우편번호)'},
      /* 1.2.127 (user, 10 Nov 2026): the two contract dates start empty and are typed in by hand - no "today", no date from the card */
      {k: 'ctdate', en: 'Date the agreement is made', ko: '계약서 작성일', date: true},
      {k: 'ctst', en: 'Contract starts', ko: '계약 시작일', date: true},
      {k: 'ctdays', en: 'Contract length (days)', ko: '계약 기간 (일)', auto: c.avd || ''},
      /* 1.2.127 (user, 10 Nov 2026): the guarantee is typed either for the whole term or per month (ctgmode) - the contract always states the whole term */
      c.ctgmode === 'month' ? {k: 'ctguar', en: 'Guarantee amount (₩, per month)', ko: '개런티 금액 (₩, 월)', money: true, only: 'net', gmode: true}
        : {k: 'ctguar', en: 'Guarantee amount (₩, whole term)', ko: '개런티 금액 (₩, 전체 기간)', money: true, only: 'net', gmode: true},
      {k: 'ctgm', en: 'Full guarantee per month (₩)', ko: '월 개런티 전액 (₩)', money: true, only: 'cond'},
      {k: 'ctjobs', en: 'Full-day jobs needed in 30 days', ko: '30일 내 필요한 풀데이 잡 수', auto: '5', only: 'cond'},
      {k: 'ctglow', en: 'Guarantee per month if fewer jobs (₩)', ko: '잡 수 미달 시 월 개런티 (₩)', money: true, only: 'cond', auto: (() => { const v = parseFloat(String(c.ctgm || '').replace(/[^\d.]/g, '')); return isNaN(v) ? '' : Math.round(v / 2).toLocaleString('en-US'); })()},
      {k: 'ctpm', en: 'Model share %', ko: '모델 비율 %', auto: '50'},
      {k: 'ctpa', en: 'Agency share %', ko: '에이전시 비율 %', auto: '40'},
      {k: 'ctpo', en: 'Mother agency share %', ko: '마더 에이전시 비율 %', auto: '10'},
      {k: 'ctacc', en: 'Accommodation per month (₩)', ko: '숙소 월 비용 (₩)', auto: '800,000', money: true},
      {k: 'cttr', en: 'Transportation per month (₩)', ko: '교통비 월 (₩)', auto: '400,000', money: true},
      {k: 'ctpick', en: 'Airport pickup (₩)', ko: '공항 픽업 (₩)', auto: '50,000', money: true},
      {k: 'ctpock', en: 'Weekly pocket money (₩)', ko: '주간 용돈 (₩)', auto: '100,000', money: true},
      {k: 'ctflt', en: 'Round-trip flight (₩) — leave empty if not stated', ko: '왕복 항공권 (₩) — 없으면 비워 두기', money: true, opt: true},
      {k: 'cthl', en: 'Hair length (e.g. SHORT, MIDDLE, LONG)', ko: '머리 길이 (예: SHORT, MIDDLE, LONG)'},
      {k: 'hcol', en: 'Hair color', ko: '머리 색', shared: true},
      {k: 'ctht', en: 'Height (cm)', ko: '키 (cm)', auto: f.ht != null ? String(num1(f.ht)) : ''},
      {k: 'ctwt', en: 'Weight (kg) — optional', ko: '몸무게 (kg) — 선택', auto: has(c.wt) ? String(num1(c.wt)) : '', only: 'net', opt: true},
      {k: 'ctbu', en: 'Bust (cm)', ko: '가슴 (cm)', auto: f.bu != null ? String(num1(f.bu)) : ''},
      {k: 'ctwa', en: 'Waist (cm)', ko: '허리 (cm)', auto: f.wa != null ? String(num1(f.wa)) : ''},
      {k: 'cthp', en: 'Hips (cm)', ko: '엉덩이 (cm)', auto: f.hp != null ? String(num1(f.hp)) : ''},
      {k: 'cteu', en: 'Shoe size (EU)', ko: '신발 (EU)', auto: f.eu != null ? String(num1(f.eu)) : ''}
    ].filter(r => !r.only || r.only === kind).map(r => GKEYS.has(r.k) && gcur(c) !== 'KRW' ? Object.assign({}, r, {en: r.en.replace('₩', curSym(gcur(c)) + ' ' + gcur(c)), ko: r.ko.replace('₩', curSym(gcur(c)) + ' ' + gcur(c))}) : r);
  }
  /* ---------- 1.2.128 (user, 10 Nov 2026): the guarantee in any currency - Korean Won, US Dollar and Euro first,
     then every other currency. Only the guarantee: the rest of the contract stays in won. The contract's
     guarantee sentence says the chosen currency ("€ 9,000 Euros"); today's rate to won is shown beside it. */
  const CUR1 = ['KRW', 'USD', 'EUR'];
  const curAll = (() => { let l = []; try{ l = Intl.supportedValuesOf('currency'); }catch(e){} if(!l.length) l = ['KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'CHF', 'CAD', 'AUD', 'HKD', 'SGD', 'TWD', 'THB', 'VND', 'RUB', 'UAH', 'KZT', 'BYN', 'PLN', 'CZK', 'HUF', 'RON', 'SEK', 'NOK', 'DKK', 'TRY', 'BRL', 'MXN', 'ZAR', 'INR', 'PHP', 'IDR', 'MYR', 'NZD', 'AED']; return l; })();
  const curName = (code, lang) => { try{ return new Intl.DisplayNames([lang || 'en'], {type: 'currency'}).of(code) || code; }catch(e){ return code; } };
  const curSym = code => { if(code === 'KRW') return '₩'; try{ const p = new Intl.NumberFormat('en', {style: 'currency', currency: code, currencyDisplay: 'narrowSymbol'}).formatToParts(1).find(x => x.type === 'currency'); return p ? p.value : code; }catch(e){ return code; } };
  /* the words after the amount in the contract: "Korean Won", "US Dollars", "Euros" */
  const curWords = code => { if(code === 'KRW') return 'Korean Won';
    try{ const p = new Intl.NumberFormat('en', {style: 'currency', currency: code, currencyDisplay: 'name'}).formatToParts(2).filter(x => x.type === 'currency').map(x => x.value).join('').trim();
      return p ? p.replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase()) : code; }catch(e){ return code; } };
  const gcur = c => /^[A-Z]{3}$/.test(c.ctgcur || '') ? c.ctgcur : 'KRW';
  const GKEYS = new Set(['ctguar', 'ctgm', 'ctglow']);
  /* today's rate to won (European Central Bank figures, free, no key), kept for the day */
  const RATE = new Map();
  function rateOf(code){
    if(code === 'KRW') return 1;
    const day = new Date().toISOString().slice(0, 10), k = code + '|' + day, had = RATE.get(k);
    if(had !== undefined) return had;
    try{ const v = JSON.parse(localStorage.getItem('illu.rate.' + k) || 'null'); if(v && v.r){ RATE.set(k, v); return v; } }catch(e){}
    RATE.set(k, null);
    fetch('https://api.frankfurter.app/latest?from=' + code + '&to=KRW').then(r => r.ok ? r.json() : null).then(j => {
      const r = j && j.rates && j.rates.KRW; if(!r) return;
      const v = {r, d: j.date || day}; RATE.set(k, v); try{ localStorage.setItem('illu.rate.' + k, JSON.stringify(v)); }catch(e){}
      document.querySelectorAll('.ctpanel[data-ctp]').forEach(p => repaint(p.dataset.ctp));
    }).catch(() => {});
    return null;
  }
  function wonNote(c, amount){
    const code = gcur(c); if(code === 'KRW' || amount == null) return '';
    const v = rateOf(code); if(!v || !v.r) return '';
    const dd = String(v.d || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1');
    return L(' · ≈ ₩' + fmt(amount * v.r) + ' at the ' + dd + ' rate (1 ' + code + ' = ₩' + fmt(v.r) + ')', ' · ≈ ₩' + fmt(amount * v.r) + ' (' + dd + ' 환율, 1 ' + code + ' = ₩' + fmt(v.r) + ')');
  }
  /* a monthly guarantee times the term: 90 days = 3 months */
  const guarTerm = (c, m, days) => m == null ? null : c.ctgmode === 'month' ? Math.round(m * (days > 0 ? days : 0) / 30) : m;
  const guarMonth = (c, m, days) => m == null ? null : c.ctgmode === 'month' ? m : (days > 0 ? Math.round(m * 30 / days) : null);
  function curPick(c){
    const cur = gcur(c), lang = L('en', 'ko');
    const opt = code => '<option value="' + code + '"' + (code === cur ? ' selected' : '') + '>' + H(code + ' · ' + curName(code, lang) + (curSym(code) !== code ? ' (' + curSym(code) + ')' : '')) + '</option>';
    const rest = curAll.filter(x => !CUR1.includes(x)).sort((a, b) => curName(a, lang).localeCompare(curName(b, lang)));
    return '<label class="ctcur"><span>' + H(L('Currency', '통화')) + '</span><select data-ctgcur="' + H(c.id) + '">' + CUR1.map(opt).join('') + '<option disabled>──────────</option>' + rest.map(opt).join('') + '</select></label>';
  }
  function guarNote(c){
    const dv = has(c.ctdays) ? c.ctdays : c.avd, days = parseInt(dv, 10), m = money(c.ctguar);
    if(m == null || !(days > 0)) return (c.ctgmode === 'month' ? L('The contract states the whole term: this × the months.', '계약서에는 전체 기간 금액이 들어갑니다: 이 금액 × 개월 수.') : '') + wonNote(c, m).replace(/^ · /, '');
    const mo = Math.round(days / 30 * 10) / 10;
    const S = curSym(gcur(c)), tot = guarTerm(c, m, days);
    return (c.ctgmode === 'month'
      ? L('= ' + S + fmt(tot) + ' for the whole term (' + days + ' days, ' + mo + ' months) — this goes in the contract', '= 전체 기간(' + days + '일, ' + mo + '개월) ' + S + fmt(tot) + ' — 계약서에 들어가는 금액')
      : L('= about ' + S + fmt(guarMonth(c, m, days)) + ' a month (' + days + ' days, ' + mo + ' months)', '= 월 약 ' + S + fmt(guarMonth(c, m, days)) + ' (' + days + '일, ' + mo + '개월)')) + wonNote(c, tot);
  }
  /* the value used: what is typed in the contract box, else what the card already knows */
  const val = (c, r) => has(c[r.k]) ? String(c[r.k]).trim() : (r.auto != null ? String(r.auto).trim() : '');
  function build(c){
    const R = rows(c), V = {}, bad = new Set();
    for(const r of R){ V[r.k] = val(c, r); if(!r.opt && !has(V[r.k])) bad.add(r.k); }
    const ad = pdate(V.ctdate), st = pdate(V.ctst), days = parseInt(V.ctdays, 10);
    if(has(V.ctdate) && !ad) bad.add('ctdate');
    if(has(V.ctst) && !st) bad.add('ctst');
    if(has(V.ctdays) && !(days > 0)) bad.add('ctdays');
    if('ctjobs' in V && has(V.ctjobs) && !(parseInt(V.ctjobs, 10) > 0)) bad.add('ctjobs');
    if('ctglow' in V && money(V.ctglow) != null && money(V.ctgm) != null && money(V.ctglow) > money(V.ctgm)) bad.add('ctglow');
    for(const k of ['ctguar', 'ctgm', 'ctglow', 'ctacc', 'cttr', 'ctpick', 'ctpock']) if(k in V && has(V[k]) && money(V[k]) == null) bad.add(k);
    for(const k of ['ctht', 'ctwt', 'ctbu', 'ctwa', 'cthp', 'cteu']) if(k in V && has(V[k]) && num1(V[k]) == null) bad.add(k);
    const pm = parseFloat(V.ctpm), pa = parseFloat(V.ctpa), po = parseFloat(V.ctpo);
    let warn = '';
    if(!isNaN(pm) && !isNaN(pa) && !isNaN(po) && Math.abs(pm + pa + po - 100) > 0.01){ bad.add('ctpm'); bad.add('ctpa'); bad.add('ctpo'); warn = L('The three shares must add up to 100%.', '세 비율의 합이 100%여야 합니다.'); }
    if(bad.size) return {ok: false, R, V, bad, warn};
    /* the end date: the start date plus the term, less one day (19 Sep + 90 days = 17 Dec, as in the signed contract) */
    const en = new Date(st); en.setDate(en.getDate() + days - 1);
    const months = Math.round(days / 30 * 10) / 10;
    const mo = months + (months === 1 ? ' month' : ' months');
    const up = s => String(s).toUpperCase();
    const tokens = {
      ADAY: String(ad.getDate()), AMONTH: MON[ad.getMonth()], AYEAR: String(ad.getFullYear()),
      MODEL: up(V.ctfn), NATION: up(V.nat), PASSPORT: up(V.ppn), HISHER: V.ctsex === 'M' ? 'his' : 'her', MOTHER: up(V.ctag),
      ADDR1: up(V.ctad1), ADDR2: up(V.ctad2),
      DAYS: String(days), SDAY: String(st.getDate()), SMONTH: MON[st.getMonth()], SYEAR: String(st.getFullYear()),
      EDAY: String(en.getDate()), EMONTH: MON[en.getMonth()], EYEAR: String(en.getFullYear()),
      GUAR: 'ctguar' in V ? fmt(guarTerm(c, money(V.ctguar), days)) : '', MONTHS: mo,
      GCUR: gcur(c), GCUR_SYM: curSym(gcur(c)), GCUR_NAME: curWords(gcur(c)),
      GUARM: 'ctgm' in V ? fmt(money(V.ctgm)) : '', GUARMS: 'ctgm' in V ? fmt(money(V.ctgm)).replace(/,/g, ' ') : '',
      GUARLOWS: 'ctglow' in V ? fmt(money(V.ctglow)).replace(/,/g, ' ') : '', JOBS: 'ctjobs' in V ? String(parseInt(V.ctjobs, 10)) : '',
      GPCT: 'ctglow' in V && money(V.ctgm) ? String(Math.round(money(V.ctglow) / money(V.ctgm) * 1000) / 10) : '',
      PMODEL: String(pm), PAGENCY: String(pa), PMOTHER: String(po),
      HTMIN: String(Math.round(num1(V.ctht))), HAIRLEN: up(V.cthl), HAIRCOL: up(V.hcol), HTWT: 'ctwt' in V ? (has(V.ctwt) ? num1(V.ctht) + ' / ' + num1(V.ctwt) : String(num1(V.ctht))) : '', HT: String(num1(V.ctht))
    };
    const acc = money(V.ctacc), tr = money(V.cttr);
    const nums = {E39: Math.round(acc * months), G39: acc, E40: Math.round(tr * months), G40: tr, E41: money(V.ctpick), E42: money(V.ctpock),
      };
    /* the measurement row: row 55 on the Net and No Guarantee contracts, 57 on Condition (it has one more article above) */
    const mr = c.gty === 'cond' ? 57 : 55;
    nums['G' + mr] = num1(V.ctbu); nums['H' + mr] = num1(V.ctwa); nums['I' + mr] = num1(V.cthp); nums['J' + mr] = num1(V.cteu);
    if(has(V.ctflt) && money(V.ctflt) != null) nums.E38 = money(V.ctflt);
    return {ok: true, R, V, bad, tokens, nums, end: en, months};
  }


  /* ---------- minors: the Affidavit of Parental Consent goes with the contract (user, 6 Nov 2026) ---------- */
  function isMinorCard(c){
    try{ if(c.k && typeof isMinor === 'function' && isMinor(c.k)) return true; }catch(e){}
    const dob = pdate(c.dob); if(!dob) return false;
    const at = pdate(c.ctst || c.ind || c.avf) || new Date();
    let age = at.getFullYear() - dob.getFullYear(); if(at.getMonth() < dob.getMonth() || (at.getMonth() === dob.getMonth() && at.getDate() < dob.getDate())) age--;
    return age < 18;
  }
  const ord = n => { n = +n; const t = n % 100; return (t >= 11 && t <= 13) ? 'th' : ({1: 'st', 2: 'nd', 3: 'rd'})[n % 10] || 'th'; };
  /* the model's side is filled from the card; the parent's name, passport, address and the
     emergency contacts are left blank for the parent to write in */
  function affTokens(c){
    const b = build(c), V = b.V, up = s => String(s || '').toUpperCase();
    const st = pdate(V.ctst), days = parseInt(V.ctdays, 10), ad = pdate(V.ctdate);
    const en = st && days > 0 ? new Date(st.getFullYear(), st.getMonth(), st.getDate() + days - 1) : null;
    const t = {MODEL: up(V.ctfn), NATION: up(V.nat), PASSPORT: up(V.ppn), MOTHER: up(V.ctag), DAYS: days > 0 ? String(days) : ''};
    if(st){ t.SMONTH = MON[st.getMonth()]; t.SDAYN = String(st.getDate()); t.SSUF = ord(st.getDate()); t.SYEAR = String(st.getFullYear()); }
    if(en){ t.EMONTH = MON[en.getMonth()]; t.EDAYN = String(en.getDate()); t.ESUF = ord(en.getDate()); t.EYEAR = String(en.getFullYear()); }
    if(ad){ t.DMONTH = MON[ad.getMonth()]; t.DDAY = String(ad.getDate()); t.DYEAR = String(ad.getFullYear()); }
    return t;
  }

  /* ---------- the panel inside the Contract stage ---------- */
  const SAY = new Map();       // card id -> last message
  function panel(c){
    const gty = c.gty || '';
    let h = '<div class="ctpanel" data-ctp="' + H(c.id) + '">';
    if(!gty){
      h += '<p class="ctnote">' + L('Choose the Guarantee Type in the stage above first — the contract follows it.', '먼저 위 단계에서 개런티 유형을 선택하세요 — 계약서는 그에 따라 정해집니다.') + '</p></div>';
      return h;
    }
    if(!KINDS[gty]){
      const nm = (GTY.find(x => x[0] === gty) || [])[1];
      h += '<p class="ctnote">' + H(L('The ' + nm + ' contract has not been added to the program yet. Send it to Claude and it will fill in the same way as the others.', nm + ' 계약서는 아직 프로그램에 추가되지 않았습니다. Claude에게 보내 주시면 다른 계약서와 같은 방식으로 채워집니다.')) + '</p></div>';
      return h;
    }
    const b = build(c);
    const miss = b.R.filter(r => b.bad.has(r.k));
    h += '<div class="cthead"><b>' + L(KINDS[gty].en, KINDS[gty].ko) + '</b><span class="ctcount ' + (miss.length ? 'y' : 'g') + '" data-ctcount>' +
      H(miss.length ? L(miss.length + ' missing', miss.length + '개 누락') : L('Ready', '준비 완료')) + '</span></div>';
    h += missBar(miss, b.R.some(r => r.k === 'ctwt'));
    h += '<div class="ctgrid">' + b.R.map(r => {
      const typed = has(c[r.k]), v = typed ? c[r.k] : '';
      const auto = !typed && has(r.auto) ? r.auto : '';
      const ph = auto ? auto : (r.ph ? r.ph : (r.date ? 'DD/MM/YYYY' : ''));
      const input = r.sel
        ? '<select data-bk="' + H(c.id) + '" data-bf="' + r.k + '"><option value="">' + H(auto ? L('As the card says', '카드 기준') + ' (' + (auto === 'M' ? L('Male', '남성') : L('Female', '여성')) + ')' : '—') + '</option>' +
            r.sel.map(([k, t]) => '<option value="' + k + '"' + (v === k ? ' selected' : '') + '>' + H(t) + '</option>').join('') + '</select>'
        : '<input type="text" data-bk="' + H(c.id) + '" data-bf="' + r.k + '" value="' + H(v) + '" placeholder="' + H(ph) + '"' + (r.date ? ' data-date="1"' : '') + '>';
      const pick = (r.k === 'ctguar' || r.k === 'ctgm') ? curPick(c) : '';
      if(r.gmode) return pick + '<div class="ctrow ctgrow' + (b.bad.has(r.k) ? ' miss' : '') + '" data-ctk="' + r.k + '"><span>' + H(L(r.en, r.ko)) + '</span>' +
        '<div class="ctgsw" role="radiogroup" aria-label="' + H(L('Guarantee typed as', '개런티 입력 방식')) + '">' +
          [['term', L('Whole term', '전체 기간')], ['month', L('Per month', '월')]].map(([m, t]) => '<button type="button" role="radio" aria-checked="' + ((c.ctgmode === 'month') === (m === 'month')) + '" data-ctgmode="' + m + '" data-ctgbk="' + H(c.id) + '">' + t + '</button>').join('') + '</div>' +
        input + '<em class="ctgx" data-ctgx>' + H(guarNote(c)) + '</em></div>';
      return pick + '<label class="ctrow' + (b.bad.has(r.k) ? ' miss' : '') + '" data-ctk="' + r.k + '"><span>' + H(L(r.en, r.ko)) +
        (r.shared ? '<em>' + L('card', '카드') + '</em>' : auto ? '<em>' + (r.k === 'ctdate' ? L('today', '오늘') : L('from the card', '카드에서')) + '</em>' : '') +
        (auto && b.bad.has(r.k) ? '<em class="ctbad">' + (r.date ? L('not a DD/MM/YYYY date — type it here', 'DD/MM/YYYY 날짜가 아님 — 여기에 입력') : L('check this', '확인 필요')) + '</em>' : '') + '</span>' + input + ((r.k === 'ctgm' || r.k === 'ctglow') && gcur(c) !== 'KRW' ? '<em class="ctgx" data-ctgw="' + r.k + '">' + H(wonNote(c, money(c[r.k])).replace(/^ · /, '')) + '</em>' : '') + '</label>';
    }).join('') + '</div>';
    if(b.warn) h += '<p class="ctwarn">' + H(b.warn) + '</p>';
    if(b.ok) h += '<p class="ctsum">' + H(L('Runs ' + b.V.ctst + ' to ' + pad(b.end.getDate()) + '/' + pad(b.end.getMonth() + 1) + '/' + b.end.getFullYear() + ' · ' + b.months + ' months' + (b.tokens.GUAR ? ' · guarantee ' + b.tokens.GCUR_SYM + b.tokens.GUAR : '') + (b.tokens.GUARM ? ' · ₩' + b.tokens.GUARM + ' a month with ' + b.tokens.JOBS + ' full days, else ₩' + b.tokens.GUARLOWS.replace(/ /g, ',') : ''),
      b.V.ctst + ' ~ ' + pad(b.end.getDate()) + '/' + pad(b.end.getMonth() + 1) + '/' + b.end.getFullYear() + ' · ' + b.months + '개월' + (b.tokens.GUAR ? ' · 개런티 ' + b.tokens.GCUR_SYM + b.tokens.GUAR : '') + (b.tokens.GUARM ? ' · 풀데이 ' + b.tokens.JOBS + '회 시 월 ₩' + b.tokens.GUARM + ', 미달 시 ₩' + b.tokens.GUARLOWS.replace(/ /g, ',') : ''))) + '</p>';
    h += '<div class="ctbtns"><button type="button" class="ctmake" data-ctmake="' + H(c.id) + '"' + (b.ok ? '' : ' data-ctwait="1"') + '>' +
      L('Make the contract (Excel + PDF)', '계약서 만들기 (엑셀 + PDF)') + '</button>' +
      '<button type="button" class="ctopen" data-ctfolder="' + H(c.id) + '">' + L('Open the CONTRACT folder', 'CONTRACT 폴더 열기') + '</button></div>';
    if(isMinorCard(c)) h += '<div class="ctaff"><b>' + L('Minor model: Affidavit of Parental Consent', '미성년 모델: 부모 동의서') + '</b><span>' +
      L('Made together with the contract, with the model\u2019s details filled in. The parent or legal guardian fills in their own details and signs.', '계약서와 함께 만들어지며 모델 정보가 채워집니다. 부모 또는 법정 후견인이 본인 정보를 적고 서명합니다.') + '</span>' +
      '<button type="button" class="ctopen" data-ctaff="' + H(c.id) + '">' + L('Make the affidavit only (Word + PDF)', '동의서만 만들기 (워드 + PDF)') + '</button></div>';
    if(!b.ok) h += '<p class="ctnote">' + H(L('Still needed: ', '아직 필요한 항목: ') + miss.map(r => L(r.en, r.ko).replace(/ \(.*\)$/, '')).join(', ')) + '</p>';
    const log = Array.isArray(c.ctlog) ? c.ctlog.slice(-4).reverse() : [];
    if(log.length) h += '<div class="ctlog">' + log.map(x => '<div class="ctlogr"><span>' + H(x.at || '') + (x.who ? ' · ' + H(x.who) : '') + '</span>' +
      (x.x ? '<button type="button" data-ctfile="' + H(c.id) + '|' + H(x.x) + '" title="' + H(x.x) + '">' + L('Open Excel', '엑셀 열기') + '</button>' : '') +
      (x.p ? '<button type="button" data-ctfile="' + H(c.id) + '|' + H(x.p) + '" title="' + H(x.p) + '">' + L('Open PDF', 'PDF 열기') + '</button>' : (x.x ? '<em>' + L('no PDF', 'PDF 없음') + '</em>' : '')) +
      (x.ad ? '<button type="button" data-ctfile="' + H(c.id) + '|' + H(x.ad) + '" title="' + H(x.ad) + '">' + L('Affidavit (Word)', '동의서 (워드)') + '</button>' : '') +
      (x.ap ? '<button type="button" data-ctfile="' + H(c.id) + '|' + H(x.ap) + '" title="' + H(x.ap) + '">' + L('Affidavit (PDF)', '동의서 (PDF)') + '</button>' : '') + '</div>').join('') + '</div>';
    const say = SAY.get(c.id);
    h += '<p class="ctsay" role="status" data-ctsay>' + (say ? H(say) : '') + '</p></div>';
    return h;
  }
  /* repaint one card's panel in place, keeping the box being typed in */
  function repaint(bid){
    const c = BOOK.get(bid); if(!c) return;
    document.querySelectorAll('.ctpanel[data-ctp="' + CSS.escape(bid) + '"]').forEach(p => {
      const b = build(c), miss = b.R.filter(r => b.bad.has(r.k));
      p.querySelectorAll('.ctrow').forEach(r => r.classList.toggle('miss', b.bad.has(r.dataset.ctk)));
      const n = p.querySelector('[data-ctcount]'); if(n){ n.textContent = miss.length ? L(miss.length + ' missing', miss.length + '개 누락') : L('Ready', '준비 완료'); n.className = 'ctcount ' + (miss.length ? 'y' : 'g'); }
      const gx = p.querySelector('[data-ctgx]'); if(gx) gx.textContent = guarNote(c);
      p.querySelectorAll('[data-ctgw]').forEach(x => { x.textContent = wonNote(c, money(c[x.dataset.ctgw])).replace(/^ · /, ''); });
      const mk = p.querySelector('[data-ctmake]'); if(mk){ mk.disabled = false; if(b.ok) mk.removeAttribute('data-ctwait'); else mk.setAttribute('data-ctwait', '1'); }
      const mb = p.querySelector('[data-ctmiss]'); const nb = document.createElement('div'); nb.innerHTML = missBar(miss, b.R.some(r => r.k === 'ctwt'));
      if(mb && nb.firstChild) mb.replaceWith(nb.firstChild); else if(mb) mb.remove(); else if(nb.firstChild){ const hd = p.querySelector('.cthead'); if(hd) hd.after(nb.firstChild); }
      try{ window.__illuCtMiss && window.__illuCtMiss(bid, miss.length); }catch(e){}
    });
  }
  document.addEventListener('input', e => { const t = e.target; if(t && t.dataset && t.dataset.bk && t.closest && t.closest('.ctpanel')) setTimeout(() => repaint(t.dataset.bk), 0); });
  document.addEventListener('change', e => {
    const sel = e.target.closest && e.target.closest('.ctpanel [data-ctgcur]'); if(!sel) return;
    e.stopPropagation();
    if(typeof SIGNED === 'function' && !SIGNED()){ try{ nudgeSignIn(sel); }catch(er){} return; }
    const c = BOOK.get(sel.dataset.ctgcur); if(!c) return;
    c.ctgcur = sel.value === 'KRW' ? '' : sel.value;
    try{ saveBook(c.id, true); }catch(er){}
    try{ if(typeof bvSideRefresh === 'function') bvSideRefresh(true); }catch(er){}
    document.querySelectorAll('.ctpanel[data-ctp="' + CSS.escape(c.id) + '"]').forEach(p => { p.querySelectorAll('.ctrow[data-ctk]').forEach(r => { if(['ctguar', 'ctgm', 'ctglow'].includes(r.dataset.ctk)){ const sp = r.querySelector(':scope > span'); const row = rows(c).find(x => x.k === r.dataset.ctk); if(sp && row) sp.firstChild.textContent = L(row.en, row.ko); } }); });
    repaint(c.id);
  }, true);
  /* whole term / per month: the amount already typed is turned into the other one, so the contract does not change */
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.ctpanel [data-ctgmode]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    if(typeof SIGNED === 'function' && !SIGNED()){ try{ nudgeSignIn(b); }catch(er){} return; }
    const c = BOOK.get(b.dataset.ctgbk), to = b.dataset.ctgmode; if(!c || (c.ctgmode === 'month') === (to === 'month')) return;
    const days = parseInt(has(c.ctdays) ? c.ctdays : c.avd, 10), m = money(c.ctguar);
    if(m != null && days > 0) c.ctguar = fmt(to === 'month' ? Math.round(m * 30 / days) : Math.round(m * days / 30));
    c.ctgmode = to === 'month' ? 'month' : 'term';
    try{ saveBook(c.id, true); }catch(er){}
    const row = b.closest('.ctgrow'), inp = row && row.querySelector('input');
    row.querySelectorAll('[data-ctgmode]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    const lab = row.querySelector(':scope > span'); if(lab){ const rr = rows(c).find(x => x.k === 'ctguar'); if(rr) lab.textContent = L(rr.en, rr.ko); }
    if(inp) inp.value = has(c.ctguar) ? c.ctguar : '';
    repaint(c.id);
  }, true);
  document.addEventListener('change', e => { const t = e.target; if(t && t.dataset && t.dataset.bk && t.closest && t.closest('.ctpanel')) setTimeout(() => repaint(t.dataset.bk), 0); });

  /* what one stage shows above its notes: the type choice, or the contract panel */
  function extra(c, k){
    if(k === 'guar') return typeRow(c, 'gty', GTY, L('Guarantee Type', '개런티 유형'));
    if(k === 'visa') return typeRow(c, 'vty', VTY, L('Visa type', '비자 유형'));
    if(k === 'contract') return panel(c);
    return '';
  }
  window.__illuContract = {build, rows, extra, GTY, VTY};
  /* the opened card (viewer) shows one stage at a time on its right: the same choices and panel go there */
  try{
    const o2 = window.bvStagePane;
    if(typeof o2 === 'function' && !o2.__ct){
      const w2 = function(c, k){ let h = o2.apply(this, arguments); try{ const x = extra(c, k); if(x) h = h.replace('<textarea class="bvntext"', '<div class="bvctx">' + x + '</div><textarea class="bvntext"'); }catch(e){} return h; };
      w2.__ct = true; window.bvStagePane = w2;
    }
  }catch(e){}
  /* ---------- drawing it into the stages ---------- */
  try{
    const orig = window.bkSecsHtml;
    if(typeof orig === 'function' && !orig.__ct){
      const w = function(c){
        let h = orig.apply(this, arguments);
        try{
          const id = H(c.id);
          const at = sec => '<textarea data-bk="' + id + '" data-sec="' + sec + '"';
          if(h.includes(at('guar'))) h = h.replace(at('guar'), typeRow(c, 'gty', GTY, L('Guarantee Type', '개런티 유형')) + at('guar'));
          if(h.includes(at('visa'))) h = h.replace(at('visa'), typeRow(c, 'vty', VTY, L('Visa type', '비자 유형')) + at('visa'));
          if(h.includes(at('contract'))) h = h.replace(at('contract'), panel(c) + at('contract'));
        }catch(e){}
        return h;
      };
      w.__ct = true; window.bkSecsHtml = w;
    }
  }catch(e){}

  /* ---------- buttons ---------- */
  const folderOf = c => { try{ return bvFolderName(c); }catch(e){ return String(c.nm || ''); } };
  function setType(bid, field, k){
    const c = BOOK.get(bid); if(!c) return;
    try{ if(!SIGNED()){ nudgeSignIn(); return; } }catch(e){}
    c[field] = c[field] === k ? '' : k;
    try{ saveBook(bid, true); }catch(e){}
    try{ renderBook(); }catch(e){}
    try{ if(typeof bv !== 'undefined' && bv && bv.id === bid && typeof bvDraw === 'function') bvDraw(); }catch(e){}
    document.querySelectorAll('[data-ctype="' + CSS.escape(bid + '|' + field) + '"]').forEach(box => {
      box.outerHTML = typeRow(c, field, field === 'gty' ? GTY : VTY, field === 'gty' ? L('Guarantee Type', '개런티 유형') : L('Visa type', '비자 유형'));
    });
    if(field === 'gty') document.querySelectorAll('.ctpanel[data-ctp="' + CSS.escape(bid) + '"]').forEach(p => { p.outerHTML = panel(c); });
    try{ window.__illuBvLeft && window.__illuBvLeft(); }catch(e){}
  }
  function say(bid, s){ SAY.set(bid, s); document.querySelectorAll('.ctpanel[data-ctp="' + CSS.escape(bid) + '"] [data-ctsay]').forEach(x => { x.textContent = s; }); }
  /* 1.2.119 (user, 9 Nov 2026): every part still to fill is light red/pink, the count is kept at the top, and a
     notice says to fill them in (weight is optional). "Show me" / Make the contract go to the first one. */
  function missBar(miss, wt){
    if(!miss.length) return '';
    return '<div class="ctmiss" data-ctmiss role="status"><span class="ctmissn">' + miss.length + '</span><span class="ctmisst"><b>' +
      H(L(miss.length === 1 ? '1 part still needs to be filled in' : miss.length + ' parts still need to be filled in', '아직 ' + miss.length + '개 항목을 채워야 합니다')) + '</b>' +
      H(L('They are marked in pink below.' + (wt ? ' Weight is optional.' : ''), '아래 분홍색으로 표시된 칸입니다.' + (wt ? ' 몸무게는 선택입니다.' : ''))) + '</span>' +
      '<button type="button" data-ctgo>' + H(L('Show me', '보기')) + '</button></div>';
  }
  function showMissing(bid, fromMake){
    const p = document.querySelector('.bv .ctpanel[data-ctp="' + CSS.escape(bid) + '"]') || document.querySelector('.ctpanel[data-ctp="' + CSS.escape(bid) + '"]'); if(!p) return;
    const r = p.querySelector('.ctrow.miss'); if(!r) return;
    const box = r.closest('.bvside .bvprof') || r.closest('.bvside') || null;
    /* scroll only the panel the form is in - never the card's frame */
    let sc = r.parentElement; while(sc && sc !== document.body){ const o = getComputedStyle(sc).overflowY; if((o === 'auto' || o === 'scroll') && sc.scrollHeight > sc.clientHeight + 1) break; sc = sc.parentElement; }
    if(sc && sc !== document.body){ const top = r.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 60; sc.scrollTo({top: Math.max(0, top), behavior: 'smooth'}); }
    r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash');
    const inp = r.querySelector('input,select'); if(inp) try{ inp.focus({preventScroll: true}); }catch(e){}
    if(fromMake){ const b = build(BOOK.get(bid)), n = b.R.filter(x => b.bad.has(x.k)).length; say(bid, L('Fill in the ' + n + (n === 1 ? ' part' : ' parts') + ' marked in pink first, then make the contract.', '분홍색으로 표시된 ' + n + '개 항목을 먼저 채운 뒤 계약서를 만드세요.')); }
  }
  document.addEventListener('click', e => { const g = e.target.closest && e.target.closest('.ctpanel [data-ctgo]'); if(!g) return; e.preventDefault(); e.stopPropagation(); showMissing(g.closest('.ctpanel').dataset.ctp, false); }, true);
  async function make(bid, btn){
    const c = BOOK.get(bid); if(!c) return;
    const b = build(c); if(!b.ok){ repaint(bid); showMissing(bid, true); return; }
    if(!(window.illu && illu.contractMake)){ say(bid, L('Contracts are made in the ILLUMENOCTIS program on the computer.', '계약서는 컴퓨터의 ILLUMENOCTIS 프로그램에서 만듭니다.')); return; }
    if(btn){ btn.disabled = true; btn.textContent = L('Making… (Excel is saving the PDF)', '만드는 중… (엑셀이 PDF 저장 중)'); }
    try{
      const kind = KINDS[c.gty] ? c.gty : ''; if(!kind) return;
      const r = await illu.contractMake(kind, b.tokens, b.nums, true);
      if(!r || !r.ok){ say(bid, L('Could not make the contract: ', '계약서를 만들지 못했습니다: ') + (r && (r.missing ? r.missing.join(', ') : r.why) || '?')); return; }
      const base = (KINDS[kind].file + b.tokens.MODEL).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
      const nm = folderOf(c), first = String(c.nm || '').trim();
      const put = async (fname, data) => {
        const out = {};
        for(const src of ['pc', 'dbx']){ try{ out[src] = await illu.bookingPut(src, nm, first, 'contract', fname, data); }catch(e){ out[src] = {ok: false, why: String(e && e.message || e)}; } }
        return out;
      };
      const px = await put(base + '.xlsx', r.xlsx);
      const pp = r.pdf ? await put(base + '.pdf', r.pdf) : null;
      const xn = px.pc && px.pc.ok ? px.pc.name : '', pn = pp && pp.pc && pp.pc.ok ? pp.pc.name : '';
      let who = ''; try{ const p = PEOPLE.get(ME); who = p ? p.n : ''; }catch(e){}
      const d = new Date();
      const entry = {at: today() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()), who, x: xn, p: pn};
      let aff = null;
      if(isMinorCard(c)){ try{ aff = await makeAff(c, put); if(aff && !aff.why){ entry.ad = aff.ad; entry.ap = aff.ap; } }catch(e){ aff = {why: String(e && e.message || e)}; } }
      c.ctlog = (Array.isArray(c.ctlog) ? c.ctlog : []).concat([entry]).slice(-20);
      try{ saveBook(bid, true); }catch(e){}
      const where = s => s && s.ok ? L('saved', '저장됨') : L('not saved', '저장 안 됨') + (s && s.why ? ' (' + s.why + ')' : '');
      let msg = L('Excel: this computer ', '엑셀: 이 컴퓨터 ') + where(px.pc) + ', Dropbox ' + where(px.dbx) + '. ';
      msg += r.pdf ? L('PDF: this computer ', 'PDF: 이 컴퓨터 ') + where(pp.pc) + ', Dropbox ' + where(pp.dbx) + '.'
        : L('The PDF could not be made (', 'PDF를 만들지 못했습니다 (') + (r.pdfWhy || '?').slice(0, 160) + L('). Open the Excel file and use File › Save as › PDF.', '). 엑셀 파일을 열어 파일 › 다른 이름으로 저장 › PDF를 사용하세요.');
      if(aff) msg += aff.why ? L(' The affidavit could not be made: ', ' 동의서를 만들지 못했습니다: ') + aff.why : L(' Affidavit of Parental Consent: saved' + (aff.ap ? ', with its PDF.' : ' (Word only).'), ' 부모 동의서: 저장됨' + (aff.ap ? ' (PDF 포함).' : ' (워드만).'));
      SAY.set(bid, msg);
      document.querySelectorAll('.ctpanel[data-ctp="' + CSS.escape(bid) + '"]').forEach(p => { p.outerHTML = panel(c); });
      try{ window.__illuBvLeft && window.__illuBvLeft(); }catch(e){}
    } finally {
      document.querySelectorAll('[data-ctmake="' + CSS.escape(bid) + '"]').forEach(x => { x.textContent = L('Make the contract (Excel + PDF)', '계약서 만들기 (엑셀 + PDF)'); x.disabled = false; if(build(c).ok) x.removeAttribute('data-ctwait'); else x.setAttribute('data-ctwait', '1'); });
    }
  }
  async function makeAff(c, put){
    const r = await illu.contractMake('aff', affTokens(c), {}, true);
    if(!r || !r.ok) return {why: r && r.why || '?'};
    const base = ('AFFIDAVIT_OF_PARENTAL_CONSENT_' + (affTokens(c).MODEL || String(c.nm || '').toUpperCase())).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
    const pd = await put(base + '.docx', r.docx), pp = r.pdf ? await put(base + '.pdf', r.pdf) : null;
    return {ad: pd.pc && pd.pc.ok ? pd.pc.name : '', ap: pp && pp.pc && pp.pc.ok ? pp.pc.name : '', pd, pp, pdfWhy: r.pdfWhy};
  }
  async function affOnly(bid, btn){
    const c = BOOK.get(bid); if(!c || !(window.illu && illu.contractMake)) return;
    if(btn){ btn.disabled = true; }
    try{
      const nm = folderOf(c), first = String(c.nm || '').trim();
      const put = async (fname, data) => { const out = {}; for(const src of ['pc', 'dbx']){ try{ out[src] = await illu.bookingPut(src, nm, first, 'contract', fname, data); }catch(e){ out[src] = {ok: false, why: String(e && e.message || e)}; } } return out; };
      const a = await makeAff(c, put);
      if(a.why){ say(bid, L('Could not make the affidavit: ', '동의서를 만들지 못했습니다: ') + a.why); return; }
      let who = ''; try{ const p = PEOPLE.get(ME); who = p ? p.n : ''; }catch(e){}
      const d = new Date();
      c.ctlog = (Array.isArray(c.ctlog) ? c.ctlog : []).concat([{at: today() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()), who, ad: a.ad, ap: a.ap}]).slice(-20);
      try{ saveBook(bid, true); }catch(e){}
      SAY.set(bid, L('Affidavit saved in 5. CONTRACT', '동의서를 5. CONTRACT에 저장했습니다') + (a.ap ? '' : L(' (the PDF could not be made: open the Word file and save it as PDF).', ' (PDF를 만들지 못했습니다: 워드 파일을 열어 PDF로 저장하세요).')));
      document.querySelectorAll('.ctpanel[data-ctp="' + CSS.escape(bid) + '"]').forEach(p => { p.outerHTML = panel(c); });
    } finally { if(btn) btn.disabled = false; }
  }
  async function openIt(bid, fname){
    const c = BOOK.get(bid); if(!c || !(window.illu && illu.bookingOpen)) return;
    const r = await illu.bookingOpen(folderOf(c), String(c.nm || '').trim(), 'contract', fname || '');
    if(!r || !r.ok) say(bid, L('Could not open it: ', '열 수 없습니다: ') + (r && r.why || '?'));
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-ctset],[data-ctmake],[data-ctfolder],[data-ctfile],[data-ctaff]'); if(!t) return;
    e.preventDefault(); e.stopPropagation();
    if(t.dataset.ctset){ const [bid, f, k] = t.dataset.ctset.split('|'); setType(bid, f, k); return; }
    if(t.dataset.ctmake){ make(t.dataset.ctmake, t); return; }
    if(t.dataset.ctaff){ affOnly(t.dataset.ctaff, t); return; }
    if(t.dataset.ctfolder){ openIt(t.dataset.ctfolder, ''); return; }
    if(t.dataset.ctfile){ const i = t.dataset.ctfile.indexOf('|'); openIt(t.dataset.ctfile.slice(0, i), t.dataset.ctfile.slice(i + 1)); }
  }, true);

  const css = document.createElement('style');
  css.textContent = `
.ctype{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 8px}
.ctype .ctlab{font-size:11px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;color:var(--faint);margin-right:4px}
.ctype .ctopt{height:30px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:var(--surf);font:inherit;font-size:12.5px;font-weight:600;color:var(--ink);cursor:pointer}
.ctype .ctopt.on{border-color:var(--acc);background:var(--acc);color:#fff}
.ctype .cthint{flex:1 1 100%;margin:2px 0 0;font-size:12px;color:var(--faint)}
.bvctx{padding:0 0 4px}
.ctpanel,.bvctx .ctype{text-align:left}
.ctpanel .ctrow em.ctbad{color:#9c2018}
.ctpanel{border:1px solid var(--line);border-radius:12px;padding:12px;margin:0 0 10px;background:var(--surf);display:flex;flex-direction:column;gap:8px}
.ctpanel .cthead{display:flex;justify-content:space-between;align-items:center;gap:8px}
.ctpanel .ctcount{font-size:12px;font-weight:700;border-radius:7px;padding:2px 8px}
.ctpanel .ctcount.y{background:#FDE3E7;color:#A8323C}.ctpanel .ctcount.g{background:#e6f3ea;color:#24603a}
.ctpanel .ctgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:6px 10px}
.ctpanel .ctrow{display:flex;flex-direction:column;gap:3px;font-size:11.5px;color:var(--faint)}
.ctpanel .ctrow span{display:flex;gap:6px;align-items:baseline}
.ctpanel .ctrow em{font-style:normal;font-size:10px;color:var(--acc)}
.ctpanel .ctrow input,.ctpanel .ctrow select{height:30px;border:1px solid var(--line);border-radius:8px;padding:0 8px;font:inherit;font-size:13px;color:var(--ink);background:var(--surf);min-width:0}
.ctpanel .ctrow.miss input,.ctpanel .ctrow.miss select{border-color:#E58A96;background:#FDECEF}
.ctpanel .ctrow.miss span{color:#A8323C}
.ctpanel .ctrow.flash input,.ctpanel .ctrow.flash select{animation:ctflash 1.2s ease 2}
@keyframes ctflash{0%,100%{box-shadow:0 0 0 0 rgba(213,83,107,0)}50%{box-shadow:0 0 0 4px rgba(213,83,107,.35)}}
@media (prefers-reduced-motion:reduce){.ctpanel .ctrow.flash input,.ctpanel .ctrow.flash select{animation:none;box-shadow:0 0 0 3px rgba(213,83,107,.35)}}
.ctpanel .ctmiss{display:flex;align-items:center;gap:10px;border:1px solid #F0B7BF;background:#FDF1F3;border-radius:10px;padding:8px 10px;margin:2px 0 8px}
.ctpanel .ctmissn{flex:none;min-width:26px;height:26px;border-radius:13px;background:#D5536B;color:#fff;display:grid;place-items:center;font-weight:700;font-size:13px;padding:0 6px}
.ctpanel .ctmisst{flex:1;min-width:0;display:flex;flex-direction:column;font-size:12px;color:#7A2A36;line-height:1.35}
.ctpanel .ctmisst b{font-size:13px;color:#A8323C}
.ctpanel .ctmiss button{flex:none;border:1px solid #D5536B;background:#fff;color:#A8323C;border-radius:999px;padding:4px 12px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.ctpanel .ctmake[data-ctwait]{opacity:.55}
.ctpanel .ctgrow{display:flex;flex-direction:column;gap:5px}
.ctpanel .ctgsw{display:inline-flex;gap:3px;background:var(--surf2,#f1eff6);border:1px solid var(--line);border-radius:999px;padding:3px;align-self:flex-start}
.ctpanel .ctgsw button{border:0;background:none;border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;font-weight:600;color:var(--ink2,var(--ink));cursor:pointer;min-height:28px}
.ctpanel .ctgsw button[aria-checked="true"]{background:var(--acc,#5A2C57);color:#fff}
.ctpanel .ctgx{font-style:normal;font-size:11.5px;color:var(--mut);line-height:1.4}
.ctpanel .ctcur{grid-column:1/-1;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--mut)}
.ctpanel .ctcur select{flex:1;min-width:0;max-width:320px;border:1px solid var(--line);border-radius:8px;padding:6px 8px;font:inherit;font-size:13px;background:var(--surf,#fff);color:var(--ink)}
.ctpanel .ctbtns{display:flex;flex-wrap:wrap;gap:8px}
.ctpanel .ctmake{height:36px;padding:0 14px;border:0;border-radius:9px;background:var(--acc);color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.ctpanel .ctmake:disabled{opacity:.45;cursor:not-allowed}
.ctpanel .ctopen,.ctpanel .ctlogr button{height:36px;padding:0 12px;border:1px solid var(--line);border-radius:9px;background:var(--surf);font:inherit;font-size:12.5px;font-weight:600;color:var(--ink);cursor:pointer}
.ctpanel .ctlogr{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:var(--faint)}
.ctpanel .ctlogr button{height:28px;font-size:12px}
.ctpanel .ctnote,.ctpanel .ctsum,.ctpanel .ctsay,.ctpanel .ctwarn{margin:0;font-size:12.5px;color:var(--faint)}
.ctpanel .ctwarn{color:#9c2018}
.ctpanel .ctaff{display:flex;flex-direction:column;gap:6px;border-top:1px dashed var(--line);padding-top:8px}
.ctpanel .ctaff span{font-size:12px;color:var(--faint)}
.ctpanel .ctaff button{align-self:flex-start}
.ctpanel .ctsum{color:var(--ink);font-weight:600}
`;
  document.head.appendChild(css);
})();
