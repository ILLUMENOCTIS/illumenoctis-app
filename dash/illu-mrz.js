/* ==================== 1.2.140: reading a passport picture (user, 11 Nov 2026) ====================
   "if I have the passport image and I put it in the PASSPORT folder, I want the option for you to examine the image,
   and input the data (birthdate, passport issued/expiration date) passport number, Country of Origin? onto the
   necessary parts of the Contract and Visa documents."
   The two machine-readable lines at the bottom of the photo page (ICAO 9303, TD3) carry the passport number,
   country, date of birth, sex, expiry and name, each number with a check digit - so a misread is caught. The date
   of issue is not in those lines: it is looked for in the printed text and marked to check. Reading is done on
   this computer (tesseract.js, Apache-2.0, in vendor/tess) - nothing is sent anywhere. */
(function(root){
  const ISO = 'ABWAWAFGAFAGOAOAIAAIALAAXALBALANDADAREAEARGARARMAMASMASATAAQATFTFATGAGAUSAUAUTATAZEAZBDIBIBELBEBENBJBESBQBFABFBGDBDBGRBGBHRBHBHSBSBIHBABLMBLBLRBYBLZBZBMUBMBOLBOBRABRBRBBBBRNBNBTNBTBVTBVBWABWCAFCFCANCACCKCCCHECHCHLCLCHNCNCIVCICMRCMCODCDCOGCGCOKCKCOLCOCOMKMCPVCVCRICRCUBCUCUWCWCXRCXCYMKYCYPCYCZECZDEUDEDJIDJDMADMDNKDKDOMDODZADZECUECEGYEGERIERESHEHESPESESTEEETHETFINFIFJIFJFLKFKFRAFRFROFOFSMFMGABGAGBDGBGBNGBGBOGBGBPGBGBRGBGBSGBGEOGEGGYGGGHAGHGIBGIGINGNGLPGPGMBGMGNBGWGNQGQGRCGRGRDGDGRLGLGTMGTGUFGFGUMGUGUYGYHKGHKHMDHMHNDHNHRVHRHTIHTHUNHUIDNIDIMNIMINDINIOTIOIRLIEIRNIRIRQIQISLISISRILITAITJAMJMJEYJEJORJOJPNJPKAZKZKENKEKGZKGKHMKHKIRKIKNAKNKORKRKWTKWLAOLALBNLBLBRLRLBYLYLCALCLIELILKALKLSOLSLTULTLUXLULVALVMACMOMAFMFMARMAMCOMCMDAMDMDGMGMDVMVMEXMXMHLMHMKDMKMLIMLMLTMTMMRMMMNEMEMNGMNMNPMPMOZMZMRTMRMSRMSMTQMQMUSMUMWIMWMYSMYMYTYTNAMNANCLNCNERNENFKNFNGANGNICNINIUNUNLDNLNORNONPLNPNRUNRNZLNZOMNOMPAKPKPANPAPCNPNPERPEPHLPHPLWPWPNGPGPOLPLPRIPRPRKKPPRTPTPRYPYPSEPSPYFPFQATQAREURERKSXKROURORUSRURWARWSAUSASDNSDSENSNSGPSGSGSGSSHNSHSJMSJSLBSBSLESLSLVSVSMRSMSOMSOSPMPMSRBRSSSDSSSTPSTSURSRSVKSKSVNSISWESESWZSZSXMSXSYCSCSYRSYTCATCTCDTDTGOTGTHATHTJKTJTKLTKTKMTMTLSTLTONTOTTOTTTUNTNTURTRTUVTVTWNTWTZATZUGAUGUKRUAUMIUMURYUYUSAUSUZBUZVATVAVCTVCVENVEVGBVGVIRVIVNMVNVUTVUWLFWFWSMWSYEMYEZAFZAZMBZMZWEZW';
  const I3 = {}; for(let i = 0; i < ISO.length; i += 5) I3[ISO.slice(i, i + 3)] = ISO.slice(i + 3, i + 5);
  I3.D = 'DE'; I3.D__ = 'DE';
  const val = ch => ch === '<' ? 0 : /[0-9]/.test(ch) ? +ch : /[A-Z]/.test(ch) ? ch.charCodeAt(0) - 55 : -1;
  const cdig = s => { let t = 0; const w = [7, 3, 1]; for(let i = 0; i < s.length; i++){ const v = val(s[i]); if(v < 0) return -1; t += v * w[i % 3]; } return t % 10; };
  /* what OCR mixes up: in a number field letters become digits, in a letter field digits become letters */
  const TO_D = {O: '0', Q: '0', D: '0', U: '0', I: '1', L: '1', T: '1', Z: '2', S: '5', B: '8', G: '6'};
  const TO_A = {'0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B', '6': 'G'};
  const dig = s => s.split('').map(c => TO_D[c] || c).join('');
  const alp = s => s.split('').map(c => TO_A[c] || c).join('');
  const clean = s => String(s || '').toUpperCase().replace(/[«‹(\[{]/g, '<').replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, '');
  function yy(s, future){
    const y = +s.slice(0, 2), m = +s.slice(2, 4), d = +s.slice(4, 6); if(!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return '';
    const nowY = new Date().getFullYear() % 100;
    const full = future ? 2000 + y : (y > nowY ? 1900 + y : 2000 + y);
    const p = n => (n < 10 ? '0' : '') + n;
    return p(d) + '/' + p(m) + '/' + full;
  }
  /* a number field with its check digit: try the read as it is, then with the usual OCR swaps */
  function fix(field, check){
    const opts = [field, dig(field)];
    for(const f of opts){ const c = dig(check); if(/^\d$/.test(c) && cdig(f) === +c) return {v: f, ok: true}; }
    return {v: dig(field), ok: false};
  }
  function parseTD3(l1, l2){
    l1 = clean(l1).padEnd(44, '<').slice(0, 44); l2 = clean(l2).padEnd(44, '<').slice(0, 44);
    if(!/^P/.test(l1)) return null;
    const issuer = alp(l1.slice(2, 5)).replace(/</g, '');
    const nm = l1.slice(5).replace(/<+$/, '');
    const [sur, giv] = nm.split('<<');
    const no = fix(l2.slice(0, 9), l2[9]), dob = fix(l2.slice(13, 19), l2[19]), exp = fix(l2.slice(21, 27), l2[27]);
    const nat = alp(l2.slice(10, 13)).replace(/</g, '');
    const sex = /[MF]/.test(l2[20]) ? l2[20] : '';
    const okAll = no.ok && dob.ok && exp.ok;
    return {
      ppn: no.v.replace(/</g, ''), natCode: nat, issuer, sex,
      dob: yy(dob.v, false), ppe: yy(exp.v, true),
      sur: alp(sur || '').replace(/</g, ' ').trim(), given: alp(giv || '').replace(/</g, ' ').replace(/\s+/g, ' ').trim(),
      checks: {ppn: no.ok, dob: dob.ok, ppe: exp.ok}, ok: okAll
    };
  }
  /* the two lines: the longest runs with < in them near the bottom; or any line starting P< and the line after it */
  function findMRZ(text){
    const L = String(text || '').split(/\n/).map(clean).filter(s => s.length >= 30);
    let best = null;
    for(let i = 0; i < L.length - 1; i++){
      const a = L[i], b = L[i + 1];
      if(/^P[A-Z<]/.test(a) && /</.test(a) && /\d{6}/.test(dig(b))){ const r = parseTD3(a, b); if(r && (!best || (r.ok && !best.ok))) best = r; }
    }
    return best;
  }
  const MON = {JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12, JANV: 1, FEVR: 2, MARS: 3, AVR: 4, MAI: 5, JUIN: 6, JUIL: 7, AOUT: 8, SEPT: 9, DEC_: 12};
  const p2 = n => (n < 10 ? '0' : '') + n;
  /* every date written on the page (14.03.2004, 14/03/2004, 14 MAR 2004, 14 MAR/MARS 2004) */
  function datesIn(text){
    const out = [], T = String(text || '').toUpperCase();
    for(const m of T.matchAll(/\b(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*((?:19|20)\d{2})\b/g)) out.push({d: +m[1], m: +m[2], y: +m[3], at: m.index});
    for(const m of T.matchAll(/\b(\d{1,2})\s+([A-Z]{3,4})(?:\s*\/\s*[A-Z]{3,5})?\s+((?:19|20)\d{2}|\d{2})\b/g)){ const mo = MON[m[2]] || MON[m[2].slice(0, 3)]; if(mo) out.push({d: +m[1], m: mo, y: m[3].length === 2 ? 2000 + +m[3] : +m[3], at: m.index}); }
    return out.filter(x => x.d >= 1 && x.d <= 31 && x.m >= 1 && x.m <= 12).map(x => Object.assign(x, {s: p2(x.d) + '/' + p2(x.m) + '/' + x.y}));
  }
  /* the date of issue: the date printed after an "issue" label, or the one 5 or 10 years (less a day) before expiry */
  function issueDate(text, r){
    const T = String(text || '').toUpperCase(), ds = datesIn(text).filter(x => x.s !== r.dob && x.s !== r.ppe);
    const lab = T.search(/ISSU|DÉLIVR|DELIVR|EMISS|AUSSTELL|ВЫДАЧ|발급/);
    if(lab >= 0){ const after = ds.filter(x => x.at > lab).sort((a, b) => a.at - b.at)[0]; if(after) return {v: after.s, sure: true}; }
    if(r.ppe){ const [d, m, y] = r.ppe.split('/').map(Number); for(const yrs of [10, 5]){ const hit = ds.find(x => x.y === y - yrs && Math.abs((x.m * 31 + x.d) - (m * 31 + d)) <= 2); if(hit) return {v: hit.s, sure: false}; } }
    const old = ds.filter(x => x.y <= new Date().getFullYear()).sort((a, b) => b.y - a.y)[0];
    return old ? {v: old.s, sure: false} : {v: '', sure: false};
  }
  function country(code){
    const a2 = I3[code]; if(!a2) return code;
    try{ return new Intl.DisplayNames(['en'], {type: 'region'}).of(a2) || code; }catch(e){ return code; }
  }
  function fromText(full, mrzText){
    const r = findMRZ(mrzText) || findMRZ(full); if(!r) return null;
    const iss = issueDate(full, r);
    return Object.assign(r, {ppi: iss.v, ppiSure: iss.sure, nat: country(r.natCode), name: [r.sur, r.given].filter(Boolean).join(' ')});
  }
  const api = {cdig, parseTD3, findMRZ, datesIn, issueDate, country, fromText};
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.__illuMRZ = api;
})(typeof window !== 'undefined' ? window : globalThis);
