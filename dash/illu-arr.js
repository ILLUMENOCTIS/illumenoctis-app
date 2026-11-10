/* ==================== Arrival/Departure (1.2.109; board redesigned 1.2.111) ====================
   What the user asked for (8 Nov 2026), tried first in the "Arrivals Calendar" demo:
   - The calendar in the side panel no longer shows the work log. It shows when each model arrives and
     leaves, from her booking card: Entry date -> Departure date. A model is on it once her arrival date is
     filled in AND confirmed (usually when the booking is completed). C-4 stays 60-90 days, E-6 up to 1 year.
   - Click a date: the list below shows the models in town that day as small cards (photo, name, agency,
     measurements, visa, length of stay). Click a model: her row lights up, the calendar fills her whole
     stay, and her booking card opens. Another row switches. Esc or a click outside clears it.
   - The list only shows models arriving / departing: In-Town, Arriving, Left.
   - An Arrival/Departure Board: the calendars fill the page (as many months as fit, or 2/4/6/12), every
     stay a bar; a side bar with the models; click one for her stay, notes and booking card.
   - Notes on each model.
   - Dates move: an arrival is delayed or brought forward, the departure is decided later, a model is sent
     home early. Every change is kept with who, when and why.
   - How many models are in town on any day / over any period, against "keep at least N" for the team.
   Kept on the booking card (book/<id>): indok (arrival confirmed), outtbd (departure not decided),
   early {at, why, by}, dlog [{at, by, what, why}], anotes [{at, by, t}]. The team's minimum: arrcfg/team {min}. */
(function(){
  if(window.__illuArr) return; window.__illuArr = true;
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const DAY = 864e5, pad = n => String(n).padStart(2, '0');
  const VLIM = {c4: 90, e6: 365};
  const COLORS = ['#7B5BD6', '#E0609A', '#2A9D8F', '#E08A2A', '#3A86D6', '#C2453A', '#5E9E3A', '#A0569E', '#C99A0F', '#3F7F99', '#D2691E', '#6A5ACD'];

  /* ---------- dates: the card keeps DD/MM/YYYY ---------- */
  const pd = s => { const m = String(s || '').trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/); if(!m) return null; const d = new Date(+m[3], +m[2] - 1, +m[1]); return isNaN(d) ? null : d; };
  const fd = d => pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  const iso = d => d ? d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) : '';
  const fromIso = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(+m[1], m[2] - 1, +m[3]) : null; };
  const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const key = d => d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
  const same = (a, b) => !!a && !!b && key(a) === key(b);
  const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const loc = () => isKO() ? 'ko-KR' : 'en-GB';
  const fmt = d => { try{ return d.toLocaleDateString(loc(), {day: 'numeric', month: 'short'}); }catch(e){ return fd(d); } };
  const fmtY = d => { try{ return d.toLocaleDateString(loc(), {day: 'numeric', month: 'short', year: 'numeric'}); }catch(e){ return fd(d); } };
  const days = (a, b) => Math.round((b - a) / DAY);
  const at = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString(loc(), {day: 'numeric', month: 'short'}) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };

  /* ---------- people ---------- */
  const me = () => { try{ return ME || ''; }catch(e){ return ''; } };
  const pname = p => { try{ const r = PEOPLE.get(p) || (typeof GONEID !== 'undefined' && GONEID.get(p)); return r ? r.n : ''; }catch(e){ return ''; } };
  const disc = p => { try{ return idDisc(p, 'addisc') || ''; }catch(e){ return ''; } };
  const signed = () => { try{ if(!SIGNED()){ nudgeSignIn(); return false; } }catch(e){ return false; } return true; };
  const hash = s => { let h = 5381; s = String(s); for(let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0; return h; };

  /* ---------- a stay, worked out from the card ----------
     plan = the departure expected: Departure date, else counted from the contract length (or Availability
            days); none -> not decided yet ("TBD", drawn up to the visa limit)
     out  = the day she actually leaves (sent home early -> that day)
     end  = the last day drawn (a cut-short stay still shows the rest of its plan, faded) */
  const stOf = c => { try{ return bkStOf(c); }catch(e){ return c.st || 'proc'; } };
  const isConf = c => !!pd(c.ind) && (!!c.indok || stOf(c) === 'done');
  function stay(c){
    const ind = pd(c.ind); if(!ind) return null;
    const vty = c.vty === 'e6' ? 'e6' : c.vty === 'c4' ? 'c4' : '';
    const lim = VLIM[vty || 'c4'];
    const len0 = parseInt(String(c.ctdays || c.avd || '').replace(/[^\d]/g, ''), 10);
    const outd = pd(c.outd);
    const plan = outd || (!c.outtbd && len0 > 0 ? addD(ind, len0 - 1) : null);
    const early = c.early && pd(c.early.at);
    const out = early || plan || addD(ind, lim - 1);
    const m = {id: c.id, c, nm: c.nm || L('(no name)', '(이름 없음)'), ag: c.ag || '', city: c.city || '', ctry: c.country || '', vty, ind, plan, early, out,
      end: early && plan && plan > early ? plan : out, tbd: !plan && !early, est: early ? 'early' : (!plan ? 'tbd' : outd ? '' : 'planned'),
      conf: isConf(c), col: COLORS[hash(c.id) % COLORS.length], fl: c.inf || '', flo: c.outf || ''};
    m.len = days(ind, out) + 1;
    m.over = m.len > lim;
    return m;
  }
  function stays(){
    const out = [];
    try{ for(const c of BOOK.values()){ if(stOf(c) === 'canc' || !isConf(c)) continue; const m = stay(c); if(m) out.push(m); } }catch(e){}
    return out.sort((a, b) => a.ind - b.ind || String(a.nm).localeCompare(String(b.nm)));
  }
  const inStay = (m, d) => d >= m.ind && d <= m.out;
  function status(m){
    const T = today();
    if(T < m.ind){ const n = days(T, m.ind); return ['soon', n === 1 ? L('Arrives tomorrow', '내일 도착') : L('Arrives in ' + n + ' days', n + '일 후 도착')]; }
    if(T > m.out) return ['gone', (m.early ? L('Left early ', '조기 출국 ') : L('Left ', '출국 ')) + fmt(m.out)];
    const day = days(m.ind, T) + 1;
    if(m.tbd) return ['here', L('Day ' + day + ' · leaving TBD', day + '일째 · 출국 미정')];
    const left = days(T, m.out);
    if(left <= 7) return ['leave', (left === 0 ? L('Leaves today', '오늘 출국') : L('Leaves in ' + left + (left === 1 ? ' day' : ' days'), left + '일 후 출국')) + (m.early ? L(' (early)', ' (조기)') : '')];
    return ['here', L('Day ' + day + ' of ' + m.len, m.len + '일 중 ' + day + '일째')];
  }
  const VIS = v => v === 'e6' ? 'E-6' : v === 'c4' ? 'C-4' : L('Visa ?', '비자 ?');
  function depTag(m){
    return m.est === 'early' ? '<span class="adest red" title="' + H(L('Sent home early', '조기 귀국')) + '">' + L('left early', '조기 출국') + '</span>'
      : m.est === 'tbd' ? '<span class="adest" title="' + H(L('No departure date yet - drawn up to the visa limit', '출국일 미정 - 비자 한도까지 표시')) + '">' + L('departure TBD', '출국 미정') + '</span>'
      : m.est === 'planned' ? '<span class="adest" title="' + H(L('No departure date yet - counted from the contract length', '출국일 없음 - 계약 기간으로 계산')) + '">' + L('planned', '예정') + '</span>' : '';
  }
  const facts = c => { try{ return bkFacts(c) || {}; }catch(e){ return {}; } };
  const photo = c => { try{ return bkPhoto(c) || ''; }catch(e){ return ''; } };
  const n1 = v => v == null ? '–' : (Math.round(v * 10) / 10);
  const thumb = (m, big) => { const p = photo(m.c); return '<span class="adthumb' + (big ? ' big' : '') + '" style="--c:' + m.col + '">' + (p ? '<img src="' + H(p) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<i>' + H(String(m.nm).charAt(0)) + '</i>') + '</span>'; };
  const moved = m => (m.c.dlog || []).some(x => x.k === 'ind');

  /* ---------- the team's minimum ---------- */
  const S = {date: null, pick: null, f: 'all', tab: 'log', y: 0, m: 0, by: 0, bm: 0, mn: 'fit', per: '90', from: null, to: null, edit: null, logOpen: '', all: new Set(), fromPanel: false, view: 'ov', home: 'cal', tls: 3, tl0: null, vy: 0, vm: 0, vday: null, apt: null, flt: null};
  try{ const v = JSON.parse(localStorage.getItem('illu.arrview') || '{}') || {}; if(v.mn) S.mn = v.mn; if(v.per) S.per = v.per; if(v.tab) S.tab = v.tab; if(v.home === 'tl') S.home = 'tl'; if([1, 3, 6].includes(v.tls)) S.tls = v.tls; }catch(e){}
  const keepView = () => { try{ localStorage.setItem('illu.arrview', JSON.stringify({tab: S.tab, home: S.home, tls: S.tls})); }catch(e){} };
  { const T = today(); S.y = T.getFullYear(); S.m = T.getMonth(); S.by = T.getFullYear(); S.bm = T.getMonth() - 1; if(S.bm < 0){ S.bm = 11; S.by--; } S.tl0 = new Date(T.getFullYear(), T.getMonth(), 1); S.vy = T.getFullYear(); S.vm = T.getMonth(); S.vday = T; }
  function db(){ try{ return typeof DB !== 'undefined' ? DB : null; }catch(e){ return null; } }
  /* ---------- how many are in town (the "keep at least" minimum and its chart were taken out, 8 Nov 2026) ---------- */
  /* the side panel: today's count and the next change, under the small calendar */
  function panelSum(all){
    const N = Date.now(), here = all.filter(m => arrAt(m) <= N && (m.tbd || depAt(m) > N)).length;
    const nx = all.map(m => ({k: 'a', at: arrAt(m), m})).concat(all.filter(m => !m.tbd).map(m => ({k: 'd', at: depAt(m), m}))).filter(x => x.at > N).sort((x, y) => x.at - y.at)[0];
    return '<div class="adhcm"><div><b>' + here + '</b> ' + L('in town now', '명 체류 중') + '</div>' + (nx ? '<div class="adnx ' + nx.k + '">' + (nx.k === 'a' ? '✈ ' : '↗ ') + L('Next: ', '다음: ') + '<b>' + H(first1(nx.m.nm)) + '</b> ' + (nx.k === 'a' ? L('arrives ', '도착 ') : L('leaves ', '출국 ')) + H(wdS(nx.at) + ' ' + fmt(nx.at)) + ' · ' + cdSpan(nx.at) + '</div>' : '') + '</div>';
  }

  /* ---------- notes on the model ---------- */
  function notesHtml(c, all){
    const ns = Array.isArray(c.anotes) ? c.anotes : [];
    const list = all || S.all.has(c.id) ? ns : ns.slice(-2);
    return '<div class="adnts">' + (ns.length > list.length ? '<button type="button" class="adnmore" data-adall="' + H(c.id) + '">' + L('Show all ' + ns.length + ' notes', '메모 ' + ns.length + '개 모두 보기') + '</button>' : '') +
      list.map(n => '<div class="adnt">' + disc(n.by) + '<div><b>' + H(pname(n.by) || '') + '</b> <span>' + H(at(n.at)) + '</span><p>' + H(n.t) + '</p></div></div>').join('') +
      (ns.length ? '' : '<p class="admut sm">' + L('No notes yet.', '아직 메모가 없습니다.') + '</p>') +
      '<form class="adnadd" data-adnote="' + H(c.id) + '"><input name="t" maxlength="2000" placeholder="' + H(L('Leave a note on ' + String(c.nm || '').split(' ')[0] + '’s card…', String(c.nm || '').split(' ')[0] + ' 카드에 메모 남기기…')) + '" autocomplete="off"><button type="submit">' + L('Add', '추가') + '</button></form></div>';
  }

  /* ---------- the stay box: on the booking card, and open under a model on the board ---------- */
  function stayBox(c, where){
    const m = stay(c), T = today();
    if(!m) return '<div class="adsbx"><p class="admut sm">' + L('Add the Entry date (Details) to put her on the Arrival/Departure calendar.', '입국일(Details)을 입력하면 입국/출국 달력에 올라갑니다.') + '</p></div>';
    const ed = S.edit && S.edit.id === c.id ? S.edit.k : '';
    let h = '<div class="addst"><div><span>' + L('Arrival', '도착') + '</span><b>' + fmtY(m.ind) + '</b>' + (m.fl ? '<em>' + H(m.fl) + '</em>' : '') + (m.conf ? '<em class="adcf">✓ ' + L('confirmed', '확정') + '</em>' : '<em class="adnc">' + L('not confirmed', '미확정') + '</em>') + '</div>' +
      '<div class="adlen"' + (m.over ? ' style="color:#C2453A" title="' + H(L('Longer than the visa allows', '비자 허용 기간 초과')) + '"' : '') + '><b>' + (m.tbd ? 'TBD' : m.len) + '</b><span>' + (m.tbd ? L('stay', '체류') : L('days', '일')) + '</span></div>' +
      '<div class="r"><span>' + L('Departure', '출국') + '</span><b>' + (m.tbd ? L('Not decided', '미정') : fmtY(m.out)) + '</b>' + (m.flo && !m.early ? '<em>' + H(m.flo) + '</em>' : '') + '<em>' + (depTag(m) || L('confirmed', '확정')) + '</em></div></div>';
    if(!m.conf) h += '<p class="adtip">' + L('She shows on the Arrival/Departure calendar once her arrival is confirmed.', '도착이 확정되면 입국/출국 달력에 표시됩니다.') + '</p><button type="button" class="adbtn pri" data-adconf="' + H(c.id) + '">✓ ' + L('Confirm arrival', '도착 확정') + '</button>';
    if(m.conf && m.tbd) h += '<p class="adtip">' + L('No departure date yet. The calendar draws her stay up to the ' + (m.vty === 'e6' ? 'E-6 limit (1 year)' : 'C-4 limit (90 days)') + ', faded at the end — set the date once it is known.', '출국일이 아직 없습니다. 달력에는 ' + (m.vty === 'e6' ? 'E-6 한도(1년)' : 'C-4 한도(90일)') + '까지 흐리게 표시됩니다 — 정해지면 날짜를 넣으세요.') + '</p>';
    if(m.over && !m.tbd) h += '<p class="adtip red">' + L('This stay is longer than a ' + VIS(m.vty) + ' visa allows.', '이 체류 기간은 ' + VIS(m.vty) + ' 비자 허용 기간보다 깁니다.') + '</p>';
    if(m.early) h += '<p class="adtip red">' + L('Sent home early on ', '조기 귀국: ') + '<b>' + fmtY(m.early) + '</b>' + (c.early.why ? ' — ' + H(c.early.why) : '') + (m.plan ? L('. She was planned until ' + fmt(m.plan) + '.', '. 원래 ' + fmt(m.plan) + '까지 예정.') : '.') + '</p>';
    if(ed === 'dates') h += '<form class="adform" data-adform="' + H(c.id) + '|dates"><div class="adfr"><label>' + L('Arrival', '도착') + '<input type="date" name="ind" value="' + iso(m.ind) + '" required></label><label>' + L('Departure', '출국') + '<input type="date" name="outd" value="' + iso(m.plan) + '" data-orig="' + iso(m.plan) + '"' + (m.tbd ? ' disabled' : '') + '></label></div>' +
      (!pd(c.outd) && m.plan ? '<p class="adtip">' + L('No departure date on the card yet — it is counted from the contract length, so it moves with the arrival. Pick a date to fix it.', '카드에 출국일이 없어 계약 기간으로 계산합니다 — 도착일이 바뀌면 같이 움직입니다. 날짜를 고르면 고정됩니다.') + '</p>' : '') +
      '<label class="adck"><input type="checkbox" name="tbd"' + (m.tbd ? ' checked' : '') + '> ' + L('Departure not decided yet', '출국일 미정') + '</label><input name="why" placeholder="' + H(L('Why did it change? (e.g. flight delayed)', '바뀐 이유 (예: 항공편 지연)')) + '" autocomplete="off">' +
      '<div class="adfa"><button type="button" data-adedit="">' + L('Cancel', '취소') + '</button><button type="submit" class="pri">' + L('Save the new dates', '새 날짜 저장') + '</button></div></form>';
    else if(ed === 'early') h += '<form class="adform early" data-adform="' + H(c.id) + '|early"><label>' + L('She leaves on', '출국일') + '<input type="date" name="at" value="' + iso(T < m.ind ? m.ind : T) + '" min="' + iso(m.ind) + '" required></label><input name="why" placeholder="' + H(L('Reason (kept on her card)', '사유 (카드에 남습니다)')) + '" autocomplete="off" required>' +
      '<div class="adfa"><button type="button" data-adedit="">' + L('Cancel', '취소') + '</button><button type="submit" class="pri red">' + L('Send home early', '조기 귀국') + '</button></div></form>';
    else if(m.conf) h += '<div class="adact"><button type="button" data-adedit="' + H(c.id) + '|dates">✎ ' + L('Change dates', '날짜 변경') + '</button>' + (m.early ? '<button type="button" data-adunearly="' + H(c.id) + '">' + L('Undo early leave', '조기 귀국 취소') + '</button>' : T > m.out ? '' : '<button type="button" class="red" data-adedit="' + H(c.id) + '|early">' + L('Send home early', '조기 귀국') + '</button>') + '</div>';
    const lg = Array.isArray(c.dlog) ? c.dlog : [];
    if(lg.length) h += '<div class="adlog' + (S.logOpen === c.id ? ' open' : '') + '"><button type="button" class="adlogt" data-adlog="' + H(c.id) + '" aria-expanded="' + (S.logOpen === c.id) + '">' + L('Date changes · ', '날짜 변경 · ') + lg.length + '</button>' +
      (S.logOpen === c.id ? lg.slice().reverse().map(x => '<div class="adlg">' + disc(x.by) + '<div><b>' + H(x.what) + '</b>' + (x.why ? '<p>' + H(x.why) + '</p>' : '') + '<span>' + H((pname(x.by) || '') + ' · ' + at(x.at)) + '</span></div></div>').join('') : '') + '</div>';
    if(m.conf && where !== 'board' && stOf(c) !== 'done' && c.indok) h += '<button type="button" class="adlink" data-adunconf="' + H(c.id) + '">' + L('Arrival not confirmed after all', '도착 확정 취소') + '</button>';
    return '<div class="adsbx">' + h + '</div>';
  }
  /* the booking card's left column shows it (illu-bvleft asks for it) */
  window.__illuArrStay = c => '<div class="bvlp adbvl"><div class="bvlk">' + L('Stay · Arrival/Departure', '체류 · 입국/출국') + '</div>' + stayBox(c, 'card') + '<div class="bvlk">' + L('Notes', '메모') + '</div>' + notesHtml(c, true) + '</div>';

  /* ---------- the small model card (one row) ---------- */
  function row(m){
    const [sc, st] = status(m), T = today(), prog = (sc === 'here' || sc === 'leave') && !m.tbd ? Math.min(100, Math.round(days(m.ind, T) / m.len * 100)) : 0, nn = (m.c.anotes || []).length;
    return '<button type="button" class="adrow' + (S.pick === m.id ? ' on' : '') + '" data-adpick="' + H(m.id) + '" style="--c:' + m.col + '">' + thumb(m) +
      '<span class="admid"><span class="adnm">' + H(m.nm) + (moved(m) ? ' <span class="admv" title="' + H(L('Arrival date changed', '도착일 변경됨')) + '">↻ ' + L('moved', '변경') + '</span>' : '') + '</span><span class="adag">' + H([m.ag, m.ctry].filter(Boolean).join(' · ')) + '</span>' +
        (nn ? '<span class="adnc2" title="' + H(L(nn + ' notes', '메모 ' + nn + '개')) + '">✎ ' + nn + '</span>' : '') + '<span class="admx"><span class="advis ' + (m.vty || 'none') + '">' + VIS(m.vty) + '</span>' + guarChip(m.c) + '</span></span>' +
      '<span class="adright"><span class="addays"' + (m.over ? ' style="color:#C2453A"' : '') + '>' + (m.tbd ? 'TBD' : m.len + '<small>' + L('days', '일') + '</small>') + '</span><span class="adrng">' + fmt(m.ind) + ' → ' + (m.tbd ? '?' : fmt(m.out)) + '</span>' + depTag(m) + '<span class="adstt ' + sc + '">' + H(st) + '</span></span>' +
      (prog ? '<span class="adprog"><i style="width:' + prog + '%"></i></span>' : '') + '</button>';
  }
  function groups(all, wrap, dd){
    const T = today();
    if(dd || S.date){
      const d = dd || S.date, here = all.filter(m => inStay(m, d));
      const lands = here.filter(m => same(m.ind, d)), leaves = here.filter(m => same(m.out, d) && !same(m.ind, d) && !m.tbd), rest = here.filter(m => !lands.includes(m) && !leaves.includes(m));
      return '<div class="adlh"><b>' + H(d.toLocaleDateString(loc(), {weekday: 'short', day: 'numeric', month: 'long'})) + '</b><span>' + L(here.length + ' in town', here.length + '명 체류') + '</span>' + (dd ? '' : '<span class="adsp"></span><button type="button" data-adclear>' + L('All dates ✕', '전체 날짜 ✕') + '</button>') + '</div>' +
        (here.length ? '' : '<p class="adempty">' + L('Nobody is in town on this day.', '이 날 체류 중인 모델이 없습니다.') + '</p>') +
        (lands.length ? '<div class="adgrp">' + L('Arriving this day', '이 날 도착') + '</div><div class="adrows">' + lands.map(wrap).join('') + '</div>' : '') +
        (leaves.length ? '<div class="adgrp">' + L('Leaving this day', '이 날 출국') + '</div><div class="adrows">' + leaves.map(wrap).join('') + '</div>' : '') +
        (rest.length ? '<div class="adgrp">' + L('Staying', '체류 중') + '</div><div class="adrows">' + rest.map(wrap).join('') + '</div>' : '');
    }
    const soon = all.filter(m => T < m.ind).sort((a, b) => a.ind - b.ind), now = all.filter(m => inStay(m, T)).sort((a, b) => a.out - b.out), gone = all.filter(m => T > m.out).sort((a, b) => b.out - a.out), leave = now.filter(m => !m.tbd && days(T, m.out) <= 30);
    const F = [['all', L('All', '전체'), all.length], ['now', L('In-Town', '체류 중'), now.length], ['soon', L('Arriving', '도착 예정'), soon.length], ['leave', L('Leaving', '출국 예정'), leave.length], ['gone', L('Left', '출국'), gone.length]];
    const sec = (k, t, arr) => (S.f === 'all' || S.f === k) && arr.length ? '<div class="adgrp">' + t + '</div><div class="adrows">' + arr.map(wrap).join('') + '</div>' : '';
    return '<div class="adchips">' + F.map(([k, l, n]) => '<button type="button" data-adf="' + k + '" aria-pressed="' + (S.f === k) + '">' + l + ' <s>' + n + '</s></button>').join('') + '</div>' +
      (all.length ? S.f === 'leave' ? (leave.length ? '<div class="adgrp">' + L('Leaving · next 30 days', '출국 예정 · 30일 안') + '</div><div class="adrows">' + leave.map(wrap).join('') + '</div>' : '<p class="adempty">' + L('Nobody leaves in the next 30 days.', '30일 안에 출국하는 모델이 없습니다.') + '</p>') : sec('now', L('In-Town · leaving first', '체류 중 · 출국 임박 순'), now) + sec('soon', L('Arriving · soonest first', '도착 예정 · 빠른 순'), soon) + sec('gone', L('Left', '출국'), gone)
        : '<p class="adempty">' + L('No model yet. A model shows here once her Entry date is filled in on the booking card and her arrival is confirmed.', '아직 없습니다. 부킹 카드에 입국일을 넣고 도착을 확정하면 여기에 표시됩니다.') + '</p>');
  }

  /* ---------- the side panel (the drawer's third tab) ---------- */
  function miniCal(all){
    const first = new Date(S.y, S.m, 1), start = addD(first, -first.getDay()), T = today();
    const pk = S.pick ? all.find(m => m.id === S.pick) : null;
    const wk = isKO() ? ['일', '월', '화', '수', '목', '금', '토'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    let h = '<div class="adch"><button type="button" class="adnav" data-admv="-1" aria-label="' + H(L('Previous month', '이전 달')) + '">‹</button><h3>' + H(first.toLocaleDateString(loc(), {month: 'long', year: 'numeric'})) + '</h3>' +
      (S.y !== T.getFullYear() || S.m !== T.getMonth() ? '<button type="button" class="adtoday" data-adtoday>' + L('Today', '오늘') + '</button>' : '') +
      '<button type="button" class="adnav" data-admv="1" aria-label="' + H(L('Next month', '다음 달')) + '">›</button></div><div class="adwk">' + wk.map(x => '<span>' + x + '</span>').join('') + '</div><div class="adgrid">';
    for(let i = 0; i < 42; i++){
      const d = addD(start, i); if(i >= 35 && d.getMonth() !== S.m) break;
      const lands = all.filter(m => same(m.ind, d)), leaves = all.filter(m => !m.tbd && same(m.out, d)), here = all.filter(m => inStay(m, d));
      let cls = 'add' + (d.getMonth() !== S.m ? ' out' : '') + (same(d, T) ? ' today' : '') + (S.date && same(d, S.date) ? ' sel' : '') + (lands.length && !pk ? ' arr' : '') + '';
      let band = '', tag = '', sty = '';
      if(pk && d >= pk.ind && d <= pk.out){ const a = same(d, pk.ind), z = same(d, pk.out); band = '<span class="adband' + (a ? ' a' : '') + (z ? ' z' : '') + '"></span>'; sty = ' style="--c:' + pk.col + '"';
        if(a || z){ cls += ' bs'; tag = '<span class="adtag">' + (a && z ? 'IN·OUT' : a ? 'IN' : pk.tbd ? 'TBD' : pk.early ? 'EARLY' : 'OUT') + '</span>'; } }
      const marks = lands.map(m => [m, '']).concat(leaves.map(m => [m, 'o']));
      const dots = pk ? '' : '<span class="addots">' + marks.slice(0, 3).map(([m, o]) => '<i class="' + o + '" style="--c:' + m.col + '"></i>').join('') + (marks.length > 3 ? '<s>+' + (marks.length - 3) + '</s>' : '') + '</span>';
      const t = d.toLocaleDateString(loc(), {weekday: 'short', day: 'numeric', month: 'short'}) + ' · ' + L(here.length + ' in town', here.length + '명 체류') + (lands.length ? L(' · arriving: ', ' · 도착: ') + lands.map(m => m.nm).join(', ') : '') + (leaves.length ? L(' · leaving: ', ' · 출국: ') + leaves.map(m => m.nm).join(', ') : '');
      h += '<button type="button" class="' + cls + '"' + sty + ' data-adday="' + d.getTime() + '" title="' + H(t) + '">' + band + '<span class="n">' + d.getDate() + '</span>' + dots + tag + '</button>';
    }
    h += '</div><div class="adleg"><span><i></i>' + L('Arrives', '도착') + '</span><span><i class="o"></i>' + L('Leaves', '출국') + '</span>' + (pk ? '<span class="adshow">' + L('Showing ', '표시: ') + '<b>' + H(pk.nm) + '</b> · ' + fmt(pk.ind) + ' → ' + (pk.tbd ? '?' : fmt(pk.out)) + '</span>' : '<span>' + L('Pick a model to see her whole stay', '모델을 고르면 전체 체류 기간이 보입니다') + '</span>') + '</div>';
    return h;
  }
  let P = null;
  function panelMount(){
    const pane = document.querySelector('#abdrawer [data-pane=log]'), rail = document.getElementById('rail');
    if(!pane || !rail || rail.parentNode !== pane){ setTimeout(panelMount, 400); return; }
    if(P && P.isConnected) return;
    P = document.createElement('div'); P.id = 'adpanel';
    rail.insertBefore(P, rail.firstChild);
    document.body.classList.add('adon');
    /* the drawer tab and the top-bar button are called Arrival/Departure now */
    /* (written only when it differs: the watcher below would otherwise set itself off for ever) */
    const lab = () => { const want = L('Arrival/Departure', '입국/출국'); const t = document.querySelector('#abdrawer .abdt[data-abp=log]'); if(t && t.textContent !== want) t.textContent = want;
      const b = document.querySelector('#appbar .abib[data-abp=log]'); if(b){ if(b.title !== want) b.title = want; if(b.getAttribute('aria-label') !== want) b.setAttribute('aria-label', want); } };
    lab(); setTimeout(lab, 1500);
    try{ new MutationObserver(lab).observe(document.querySelector('#abdrawer .abdh'), {childList: true, subtree: true, characterData: true}); }catch(e){}
    render();
  }
  function panel(){
    if(!P) return;
    const all = stays();
    const note = S.tab === 'notes';
    const h = '<div class="adph"><button type="button" class="adtob" data-adgo>' + L('Open the board →', '보드 열기 →') + '</button></div>' +
      '<div class="adcal' + (S.pick ? ' focus' : '') + '">' + miniCal(all) + panelSum(all) + '</div>' +
      '<div class="adtabs" role="tablist"><button type="button" role="tab" data-adtab="log" aria-selected="' + !note + '">' + L('Arrival/Departure', '입국/출국') + '</button><button type="button" role="tab" data-adtab="notes" aria-selected="' + note + '">' + L('Notes', '메모') + '</button></div>' +
      (note ? '<div class="adnotesp"></div>' : '<div class="adlist">' + groups(all, row) + '</div>');
    if(P.__h !== h){ const sc = P.closest('.abdb') || P.parentNode; const top = sc ? sc.scrollTop : 0; P.__h = h; P.innerHTML = h; if(sc) sc.scrollTop = top; fitSigns(P); }
    /* Notes: the day's own notepad (unchanged), for the day picked here */
    const pad = document.querySelector('#rail .lnote');
    if(note && pad){ const slot = P.querySelector('.adnotesp'); if(slot && pad.parentNode !== slot) slot.appendChild(pad);
      try{ lday = iso(S.date || today()); }catch(e){}
      const seg = document.querySelector('#rail .lmode [data-lm=note]'); if(seg && seg.getAttribute('aria-pressed') !== 'true') seg.click(); else { try{ renderLog(); }catch(e){} } }
    else if(pad && pad.parentNode !== document.getElementById('rail')){ const r = document.getElementById('rail'); if(r) r.appendChild(pad); pad.hidden = true; }
  }

  /* ---------- the board (1.2.111: redesigned from the "Arrival/Departure board v2" demo, 8 Nov 2026) ----------
     What the user asked for:
     - four labelled tiles instead of the chart: In town now · Arriving (countdown to the next arrival) ·
       Leaving (countdown to the next departure) · Next change (today's count and how each coming arrival /
       departure changes it - the user picked the list style "C"). The "keep at least" minimum is gone.
     - always 3 x 3 months (no 2/3/4/6/9/Fit switch, no squeezed months); click a month -> one full month
       written out like the Hiworks calendar; click a day -> that day's schedule.
     - appointments with a time (shared by the team: collection appt/<id>).
     - each model's arrival / departure flight: time, airport, terminal (card: inf / outf = flight number,
       arrfl / depfl = {t, ap, tm}).
     - a Timeline view (one bar per model), weeks Sunday -> Saturday, the days of the week on top.
     - picking a model in the timeline brings her card into view in the side bar, and the other way round.
     - the side bar: no measurements; the visa and the Guarantee contract (Net amount / Condition amount a
       month) on one line - a label that does not fit moves like a sign; the open card shows the terms.
     - every calendar starts on Sunday. */
  const PG = document.createElement('div'); PG.id = 'pane-arrd'; PG.className = 'pane adpage'; PG.hidden = true;
  const AIR = {ICN: ['Incheon', '인천'], GMP: ['Gimpo', '김포'], PUS: ['Gimhae (Busan)', '김해 (부산)'], CJU: ['Jeju', '제주'], TAE: ['Daegu', '대구'], CJJ: ['Cheongju', '청주']};
  const TERM = ['', 'T1', 'T2', 'Intl', 'Dom'];
  const termTxt = t => !t ? '' : /^T\d$/.test(t) ? L('Terminal ' + t.slice(1), '제' + t.slice(1) + '터미널') : t === 'Intl' ? L('International', '국제선') : t === 'Dom' ? L('Domestic', '국내선') : t;
  /* a flight: number from the card (Entry / Departure "flight #"), time / airport / terminal kept beside it */
  const flight = (c, k) => { const x = (k === 'a' ? c.arrfl : c.depfl) || {}; return {no: String((k === 'a' ? c.inf : c.outf) || '').trim(), t: x.t || '', ap: x.ap || '', tm: x.tm || ''}; };
  const apShort = f => f.ap ? f.ap + (f.tm ? ' ' + f.tm : '') : '';
  const apLong = f => f.ap ? ((AIR[f.ap] ? L(AIR[f.ap][0], AIR[f.ap][1]) : f.ap) + ' (' + f.ap + ')' + (f.tm ? ' · ' + termTxt(f.tm) : '')) : L('Airport not set', '공항 미입력');
  const atT = (d, hm, end) => { const m = String(hm || '').match(/^(\d{1,2}):(\d{2})/); return m ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), +m[1], +m[2]) : new Date(d.getFullYear(), d.getMonth(), d.getDate(), end ? 23 : 0, end ? 59 : 0); };
  const arrAt = m => atT(m.ind, flight(m.c, 'a').t, false);
  const depAt = m => atT(m.out, flight(m.c, 'd').t, true);
  function cdown(t){ let ms = t - Date.now(); if(ms <= 0) return L('now', '지금'); const d = Math.floor(ms / DAY); ms -= d * DAY; const h = Math.floor(ms / 36e5); ms -= h * 36e5; const mi = Math.floor(ms / 6e4);
    return d ? L(d + 'd ' + h + 'h', d + '일 ' + h + '시간') : h ? L(h + 'h ' + pad(mi) + 'm', h + '시간 ' + pad(mi) + '분') : L(mi + 'm', mi + '분'); }
  const cdSpan = (t, cls) => '<span class="' + (cls || 'adcd') + '" data-adcd="' + t.getTime() + '">' + L('in ', '') + cdown(t) + L('', ' 후') + '</span>';
  setInterval(() => document.querySelectorAll('[data-adcd]').forEach(e => { const v = L('in ', '') + cdown(new Date(+e.dataset.adcd)) + L('', ' 후'); if(e.textContent !== v) e.textContent = v; }), 30000);
  const wdS = d => d.toLocaleDateString(loc(), {weekday: 'short'});
  const dayLong = d => d.toLocaleDateString(loc(), {weekday: 'long', day: 'numeric', month: 'long'});
  const moName = (y, mo) => new Date(y, mo, 1).toLocaleDateString(loc(), {month: 'long', year: 'numeric'});
  const first1 = s => String(s || '').split(' ')[0];

  /* ---------- the guarantee contract (card fields from the contract panel: gty, ctguar, ctgm, ctjobs, ctglow) ---------- */
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[^\d.]/g, '')); return isNaN(n) ? null : n; };
  const won = v => num(v) == null ? '₩ ?' : '₩' + Math.round(num(v)).toLocaleString('en-US');
  function guarChip(c){
    if(c.gty === 'net') return '<span class="adg net" title="' + H(L('Net Guarantee — paid once the contract is completed', '넷 개런티 — 계약 완료 시 지급')) + '">' + L('Net ', '넷 ') + won(c.ctguar) + '</span>';
    if(c.gty === 'cond') return '<span class="adg cond" title="' + H(L('Condition Guarantee — the full amount only if the job target is met', '컨디션 개런티 — 잡 수를 채워야 전액')) + '">' + L('Condition ', '컨디션 ') + won(c.ctgm) + L('/mo', '/월') + '</span>';
    if(c.gty === 'no') return '<span class="adg no">' + L('No guarantee', '노 개런티') + '</span>';
    return '<span class="adg unset">' + L('Guarantee not set', '개런티 미정') + '</span>';
  }
  function guarBox(c, len){
    let b;
    if(c.gty === 'net') b = '<b>' + L('Net Guarantee · ', '넷 개런티 · ') + won(c.ctguar) + '</b><span>' + L('For the whole contract' + (len ? ' (' + len + ' days)' : '') + ', paid once the contract is completed.', '계약 전체 기간' + (len ? ' (' + len + '일)' : '') + ' 금액, 계약 완료 시 지급.') + '</span>';
    else if(c.gty === 'cond') b = '<b>' + L('Condition Guarantee · ' + won(c.ctgm) + ' a month', '컨디션 개런티 · 월 ' + won(c.ctgm)) + '</b><ul><li>' + L('Full <b>' + won(c.ctgm) + '</b> a month if she works <b>' + H(c.ctjobs || 5) + ' full-day jobs</b> in 30 days.', '30일 안에 <b>풀데이 잡 ' + H(c.ctjobs || 5) + '개</b>를 하면 월 <b>' + won(c.ctgm) + '</b> 전액.') + '</li><li>' + L('Fewer jobs: drops to <b>' + won(c.ctglow) + '</b> a month.', '잡 수가 모자라면 월 <b>' + won(c.ctglow) + '</b>로 내려갑니다.') + '</li></ul>';
    else if(c.gty === 'no') b = '<b>' + L('No Guarantee', '노 개런티') + '</b><span>' + L('No guarantee amount is paid.', '개런티 금액이 없습니다.') + '</span>';
    else b = '<b>' + L('Guarantee not set yet', '개런티 미정') + '</b><span>' + L('Choose the Guarantee Type on the booking card.', '부킹 카드에서 개런티 유형을 고르세요.') + '</span>';
    return '<div class="adgbox ' + H(c.gty || 'unset') + '"><span class="adgk">' + L('Guarantee contract', '개런티 계약') + '</span>' + b + '</div>';
  }
  /* a label too long for its space becomes a moving sign; it keeps moving (user, 8 Nov 2026) */
  function fitSigns(root){
    (root || document).querySelectorAll('.admx .adg').forEach(g => {
      const txt = g.dataset.t || g.textContent; g.dataset.t = txt;
      if(g.classList.contains('mq')){ g.classList.remove('mq'); g.textContent = txt; }
      if(!g.offsetParent || g.scrollWidth <= g.clientWidth + 1) return;
      const GAP = 28; g.classList.add('mq');
      g.innerHTML = '<span class="admq"><span>' + H(txt) + '</span><span aria-hidden="true">' + H(txt) + '</span></span>';
      const w = g.querySelector('.admq span').offsetWidth + GAP;
      g.style.setProperty('--gap', GAP + 'px'); g.style.setProperty('--shift', w + 'px'); g.style.setProperty('--dur', (w / 28).toFixed(1) + 's');
    });
  }

  /* ---------- appointments: shared by the team (appt/<id>) ---------- */
  const APPT = new Map();
  function listenAppt(){
    const d = db(); if(!d || !d.collection){ setTimeout(listenAppt, 500); return; }
    try{ d.collection('appt').onSnapshot(s => { APPT.clear(); for(const x of s.docs){ const v = x.data() || {}; if(v.d) APPT.set(x.id, Object.assign({id: x.id}, v)); } render(); }, () => {}); }catch(e){}
  }
  const apptsOn = d => [...APPT.values()].filter(a => a.d === iso(d)).sort((a, b) => String(a.t).localeCompare(String(b.t)));

  /* ---------- what happens on a day: arrivals, departures, appointments, in time order ---------- */
  function evts(all, d){
    const a = all.filter(m => same(m.ind, d)).map(m => ({k: 'a', t: flight(m.c, 'a').t, m, f: flight(m.c, 'a')}));
    const z = all.filter(m => !m.tbd && same(m.out, d)).map(m => ({k: 'd', t: flight(m.c, 'd').t, m, f: flight(m.c, 'd')}));
    const p = apptsOn(d).map(x => ({k: 'p', t: x.t || '', x, m: x.m ? all.find(m => m.id === x.m) : null}));
    return a.concat(z, p).sort((x, y) => (x.t || '99').localeCompare(y.t || '99'));
  }
  /* the four tiles */
  function tiles(all){
    const T = today(), N = Date.now(), here = all.filter(m => arrAt(m) <= N && (m.tbd || depAt(m) > N));
    const upA = all.filter(m => arrAt(m) > N).sort((a, b) => arrAt(a) - arrAt(b));
    const upD = all.filter(m => !m.tbd && depAt(m) > N && arrAt(m) <= N).sort((a, b) => depAt(a) - depAt(b));
    const a30 = upA.filter(m => days(T, m.ind) < 30).length, d30 = upD.filter(m => days(T, m.out) < 30).length;
    const chg = upA.map(m => ({k: 'a', at: arrAt(m), m, f: flight(m.c, 'a')})).concat(all.filter(m => !m.tbd && depAt(m) > N).map(m => ({k: 'd', at: depAt(m), m, f: flight(m.c, 'd')}))).sort((x, y) => x.at - y.at).slice(0, 3);
    let run = here.length; chg.forEach(c => { run += c.k === 'a' ? 1 : -1; c.n = run; });
    const whenTxt = (d, f) => wdS(d) + ' ' + fmt(d) + (f.t ? ' ' + f.t : '') + (apShort(f) ? ' · ' + apShort(f) : '');
    const nA = upA[0], nD = upD[0];
    return '<div class="adtiles">' +
      '<button type="button" class="adtile" data-adf="now"><span class="adtk"><i style="background:#1F8A55"></i>' + L('In town now', '지금 체류 중') + '</span><span class="adtv"><b>' + here.length + '</b><span>' + L('models in Korea today', '명 한국에 있음') + '</span></span><span class="adtn">' + (here.length ? here.slice(0, 4).map(m => H(first1(m.nm))).join(', ') + (here.length > 4 ? ' +' + (here.length - 4) : '') : L('Nobody yet', '아직 없음')) + '</span></button>' +
      '<button type="button" class="adtile arr" data-adf="soon"><span class="adtk"><i style="background:#1F8A55"></i>' + L('Arriving', '도착 예정') + '</span><span class="adtv"><b>' + a30 + '</b><span>' + L('in the next 30 days', '명 · 30일 안') + '</span></span>' +
        (nA ? '<span class="adtn">' + L('Next: ', '다음: ') + '<em>' + H(nA.nm) + '</em> ' + cdSpan(arrAt(nA)) + ' <u>· ' + H(whenTxt(nA.ind, flight(nA.c, 'a'))) + '</u></span>' : '<span class="adtn">' + L('No arrival booked', '예정된 도착 없음') + '</span>') + '</button>' +
      '<button type="button" class="adtile dep" data-adf="leave"><span class="adtk"><i style="background:#C2334D"></i>' + L('Leaving', '출국 예정') + '</span><span class="adtv"><b>' + d30 + '</b><span>' + L('in the next 30 days', '명 · 30일 안') + '</span></span>' +
        (nD ? '<span class="adtn">' + L('Next: ', '다음: ') + '<em>' + H(nD.nm) + '</em> ' + cdSpan(depAt(nD)) + ' <u>· ' + H(whenTxt(nD.out, flight(nD.c, 'd'))) + '</u></span>' : '<span class="adtn">' + L('No departure booked', '예정된 출국 없음') + '</span>') + '</button>' +
      '<div class="adtile nxt"><span class="adtk"><i style="background:var(--acc)"></i>' + L('Next change', '다음 변동') + '</span>' +
        (chg.length ? '<div class="adchg">' + chg.map(c => '<div class="' + c.k + '" title="' + H(c.m.nm + ' · ' + fmt(c.at) + (c.f.t ? ' ' + c.f.t : '') + ' · ' + (c.f.no ? c.f.no + ' · ' : '') + apLong(c.f)) + '"><i>' + (c.k === 'a' ? '✈' : '↗') + '</i><span><em>' + H(first1(c.m.nm)) + '</em> ' + (c.k === 'a' ? L('arrives', '도착') : L('leaves', '출국')) + ' <small>' + H(wdS(c.at) + ' ' + fmt(c.at) + (c.f.t ? ' ' + c.f.t : '')) + ' · ' + cdSpan(c.at, 'adcdp') + '</small></span><b>' + c.n + ' <small>' + L('in town', '명') + '</small></b></div>').join('') + '</div>'
          : '<span class="adtv"><b>' + here.length + '</b><span>' + L('models in town', '명 체류') + '</span></span><span class="adtn">' + L('No arrivals or departures booked', '예정된 도착·출국 없음') + '</span>') + '</div></div>';
  }

  /* ---------- 3 x 3 months ---------- */
  function mini(all, y, mo){
    const first = new Date(y, mo, 1), last = new Date(y, mo + 1, 0), start = addD(first, -first.getDay()), T = today(), pk = S.pick ? all.find(m => m.id === S.pick) : null;
    const nA = all.filter(m => m.ind >= first && m.ind <= last).length, nD = all.filter(m => !m.tbd && m.out >= first && m.out <= last).length;
    /* 1.2.125 (user, 10 Nov 2026): with "# in · # out", how many models are in town at some point that month */
    const nM = all.filter(m => m.ind <= last && m.out >= first).length;
    const wk = isKO() ? ['일', '월', '화', '수', '목', '금', '토'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    let h = '<button type="button" class="admini" data-admonth="' + y + '|' + mo + '" title="' + H(L('Open ', '열기: ') + moName(y, mo)) + '"><h3>' + H(moName(y, mo)) + '<span><span class="m" title="' + H(L('Models in town at some point this month', '이번 달에 체류하는 모델')) + '">' + L(nM + (nM === 1 ? ' model' : ' models'), '모델 ' + nM) + '</span> · <span class="a">' + L(nA + ' in', '도착 ' + nA) + '</span> · <span class="d">' + L(nD + ' out', '출국 ' + nD) + '</span></span></h3><div class="admwh">' + wk.map(x => '<span>' + x + '</span>').join('') + '</div><div class="admg">';
    for(let i = 0; i < 42; i++){
      const d = addD(start, i);   /* always 6 weeks, so the nine months are the same size */
      const o = d.getMonth() !== mo, here = o ? [] : all.filter(m => inStay(m, d)), a = !o && all.some(m => same(m.ind, d)), z = !o && all.some(m => !m.tbd && same(m.out, d)), p = !o && apptsOn(d).length;
      const band = pk && !o && inStay(pk, d);
      h += '<span class="admc' + (o ? ' o' : '') + (same(d, T) ? ' t' : '') + (i % 7 === 0 ? ' sun' : i % 7 === 6 ? ' sat' : '') + (band ? ' band' : '') + '"' + (band ? ' style="--c:' + pk.col + '"' : '') + '><span class="dt">' + (a ? '<i class="a"></i>' : '') + (z ? '<i class="d"></i>' : '') + (p ? '<i class="p"></i>' : '') + '</span><b>' + d.getDate() + '</b>' +
        /* 1.2.125 (user, 10 Nov 2026): no line under each day for every model in town - a stay is only drawn when you pick a model */
        '</span>';
    }
    return h + '</div></button>';
  }
  function overview(all){
    return '<div class="adov">' + Array.from({length: 9}, (_, i) => { const d = new Date(S.by, S.bm + i, 1); return mini(all, d.getFullYear(), d.getMonth()); }).join('') + '</div>';
  }

  /* ---------- one month, written out ---------- */
  function evChip(e){
    if(e.k === 'a') return '<span class="adev a" title="' + H(L('Arrives · ', '도착 · ') + e.m.nm + ' · ' + (e.f.no ? e.f.no + ' ' : '') + (e.f.t || '') + ' · ' + apLong(e.f)) + '"><i>✈</i><b>' + H(e.f.t || '--:--') + '</b><span>' + H(first1(e.m.nm)) + '</span><u>' + H(apShort(e.f)) + '</u></span>';
    if(e.k === 'd') return '<span class="adev d" title="' + H(L('Leaves · ', '출국 · ') + e.m.nm + ' · ' + (e.f.no ? e.f.no + ' ' : '') + (e.f.t || '') + ' · ' + apLong(e.f)) + '"><i>↗</i><b>' + H(e.f.t || '--:--') + '</b><span>' + H(first1(e.m.nm)) + '</span><u>' + H(apShort(e.f)) + '</u></span>';
    return '<span class="adev p" title="' + H((e.x.t || '') + (e.x.e ? '–' + e.x.e : '') + ' ' + (e.x.title || '') + (e.m ? ' · ' + e.m.nm : '') + (e.x.where ? ' · ' + e.x.where : '')) + '"><b>' + H(e.x.t || '') + '</b><span>' + H(e.x.title || '') + (e.m ? ' · ' + H(first1(e.m.nm)) : '') + '</span></span>';
  }
  function monthView(all){
    const first = new Date(S.vy, S.vm, 1), start = addD(first, -first.getDay()), T = today(), pk = S.pick ? all.find(m => m.id === S.pick) : null;
    const wn = isKO() ? ['일', '월', '화', '수', '목', '금', '토'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let h = '<div class="admview"><div class="admvh">' + wn.map(x => '<span>' + x + '</span>').join('') + '</div><div class="admvg">';
    for(let i = 0; i < 42; i++){
      const d = addD(start, i); if(i >= 35 && d.getMonth() !== S.vm) break;
      const o = d.getMonth() !== S.vm, n = all.filter(m => inStay(m, d)).length, ev = o ? [] : evts(all, d), band = pk && !o && inStay(pk, d);
      h += '<button type="button" class="addc2' + (o ? ' o' : '') + (same(d, T) ? ' t' : '') + (i % 7 === 0 ? ' sun' : i % 7 === 6 ? ' sat' : '') + (band ? ' band' : '') + (!o && !ev.length ? ' noev' : '') + '"' + (band ? ' style="--c:' + pk.col + '"' : '') + ' data-adopenday="' + d.getTime() + '" aria-label="' + H(dayLong(d) + ' · ' + L(n + ' in town', n + '명 체류') + ' · ' + L(ev.length + ' events', '일정 ' + ev.length + '개')) + '">' +
        '<span class="top"><b>' + d.getDate() + '</b><i class="wd">' + H(wdS(d)) + '</i>' + (o ? '' : '<small title="' + H(L('Models in Korea this day', '이 날 한국에 있는 모델')) + '">' + L(n + ' in town', n + '명') + '</small>') + '</span>' +
        ev.slice(0, 3).map(evChip).join('') + (ev.length > 3 ? '<span class="admore">+' + (ev.length - 3) + L(' more', '개 더') + '</span>' : '') + '</button>';
    }
    return h + '</div><div class="adlegend"><span><i class="a"></i>' + L('✈ arrival — flight time · airport', '✈ 도착 — 항공 시간 · 공항') + '</span><span><i class="d"></i>' + L('↗ departure', '↗ 출국') + '</span><span><i class="p"></i>' + L('appointment', '일정') + '</span><span>' + L('“4 in town” = models in Korea that day · click a day for its schedule', '“4명” = 그날 한국에 있는 모델 수 · 날짜를 누르면 일정') + '</span></div></div>';
  }

  /* ---------- one day ---------- */
  function apptForm(all, d){
    const a = S.apt === 'new' ? {t: '10:00', e: '', title: '', m: '', where: '', note: ''} : APPT.get(S.apt) || {};
    return '<form class="adaf" data-adaptform="' + H(S.apt) + '"><label>' + L('Start', '시작') + '<input type="time" name="t" value="' + H(a.t || '') + '" required></label><label>' + L('End', '끝') + '<input type="time" name="e" value="' + H(a.e || '') + '"></label>' +
      '<label class="w">' + L('Title', '제목') + '<input name="title" maxlength="200" value="' + H(a.title || '') + '" placeholder="' + H(L('e.g. Casting · Musinsa', '예: 캐스팅 · 무신사')) + '" required></label>' +
      '<label class="w2">' + L('Model', '모델') + '<select name="m"><option value="">' + L('— No model —', '— 모델 없음 —') + '</option>' + all.map(m => '<option value="' + H(m.id) + '"' + (a.m === m.id ? ' selected' : '') + '>' + H(m.nm) + (inStay(m, d) ? '' : L(' (not in town)', ' (체류 아님)')) + '</option>').join('') + '</select></label>' +
      '<label class="w">' + L('Place', '장소') + '<input name="where" maxlength="200" value="' + H(a.where || '') + '" placeholder="' + H(L('Address or studio', '주소 또는 스튜디오')) + '"></label>' +
      '<label class="w3">' + L('Note', '메모') + '<textarea name="note" maxlength="2000" placeholder="' + H(L('Anything to remember', '기억할 내용')) + '">' + H(a.note || '') + '</textarea></label>' +
      '<div class="adfa"><button type="button" data-adaptx>' + L('Cancel', '취소') + '</button><button type="submit" class="pri">' + (S.apt === 'new' ? L('Add appointment', '일정 추가') : L('Save', '저장')) + '</button></div></form>';
  }
  function dayView(all){
    const d = S.vday, ev = evts(all, d), here = all.filter(m => inStay(m, d));
    let h = '<div class="addv"><div class="adcard"><h4>' + L('Schedule', '일정') + '<span class="adsp"></span><button type="button" class="adpill pri" data-adapt="new">+ ' + L('Appointment', '일정') + '</button></h4>';
    if(S.apt) h += apptForm(all, d);
    h += '<div class="adsched">' + (ev.length ? ev.map(e => {
      if(e.k !== 'p') return '<div class="adit ' + e.k + '"><div class="tm">' + H(e.f.t || '--:--') + '<small>' + (e.k === 'a' ? L('Arrival', '도착') : L('Departure', '출국')) + '</small></div><div class="bd"><span class="who">' + thumb(e.m) + '<span><b>' + H(e.m.nm) + '</b><br><span>' + H(e.m.ag) + '</span></span></span>' +
        '<span class="fl">' + (e.f.no ? '<b>' + H(e.f.no) + '</b> · ' : '<span class="warn">' + L('Flight not set', '항공편 미입력') + '</span> · ') + H(apLong(e.f)) + '</span><span>' + (e.k === 'a' ? (e.m.tbd ? L('Departure not decided', '출국 미정') : L('Day 1 of ' + e.m.len + ' · leaves ' + fmt(e.m.out), e.m.len + '일 중 1일째 · ' + fmt(e.m.out) + ' 출국')) : L('Last day · ' + e.m.len + ' days in Korea', '마지막 날 · ' + e.m.len + '일 체류')) + '</span></div>' +
        '<div class="acts"><button type="button" data-adpick="' + H(e.m.id) + '" data-adside="1">' + L('Details', '상세') + '</button></div></div>';
      return '<div class="adit p"><div class="tm">' + H(e.x.t || '') + '<small>' + (e.x.e ? L('to ', '~ ') + H(e.x.e) : L('Appointment', '일정')) + '</small></div><div class="bd"><b>' + H(e.x.title || '') + '</b>' + (e.m ? '<span class="who">' + thumb(e.m) + '<span>' + H(e.m.nm) + '</span></span>' : '') + (e.x.where ? '<span>📍 ' + H(e.x.where) + '</span>' : '') + (e.x.note ? '<span>' + H(e.x.note) + '</span>' : '') + (e.x.by ? '<span class="by">' + H(pname(e.x.by)) + '</span>' : '') + '</div>' +
        '<div class="acts"><button type="button" data-adapt="' + H(e.x.id) + '">' + L('Edit', '수정') + '</button><button type="button" data-adaptdel="' + H(e.x.id) + '" aria-label="' + H(L('Delete', '삭제')) + '">✕</button></div></div>';
    }).join('') : '<p class="adempty">' + L('Nothing scheduled. Use “+ Appointment” to add one.', '일정이 없습니다. “+ 일정”으로 추가하세요.') + '</p>') + '</div></div>';
    h += '<div class="adcard"><h4>' + L('In town this day · ', '이 날 체류 · ') + here.length + '</h4><div class="adtown">' + (here.length ? here.map(m => '<button type="button" class="adtw" data-adpick="' + H(m.id) + '" data-adside="1">' + thumb(m) + '<span><span class="nm">' + H(m.nm) + '</span><br><span class="sm">' + H(m.ag) + '</span></span><span class="sm">' +
      (same(m.ind, d) ? '<b class="ga">' + L('arrives', '도착') + '</b>' : !m.tbd && same(m.out, d) ? '<b class="gd">' + L('leaves', '출국') + '</b>' : L('day ' + (days(m.ind, d) + 1) + (m.tbd ? '' : ' of ' + m.len), (m.tbd ? '' : m.len + '일 중 ') + (days(m.ind, d) + 1) + '일째')) + '</span></button>').join('') : '<p class="adempty">' + L('Nobody in town.', '체류 중인 모델이 없습니다.') + '</p>') + '</div></div></div>';
    return h;
  }

  /* ---------- the timeline: one row per model ---------- */
  const addM = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
  function timeline(all){
    const a = S.tl0, z = addM(a, S.tls), N = days(a, z), ix = d => days(a, d);
    const rows = all.filter(m => m.ind < z && m.end >= a);
    let mo = '', ml = '', dy = '', cnt = '', wk = '';
    for(let i = 0; i < N;){ let j = i + 1; while(j < N && addD(a, j).getDay() !== 0) j++;
      const p = addD(a, i), q = addD(a, j - 1), T = today(), now = T >= p && T <= q;
      wk += '<span class="' + (now ? 'now' : '') + '" style="left:calc(var(--dw) * ' + i + ');width:calc(var(--dw) * ' + (j - i) + ')" title="' + H(fmt(p) + (j - i > 1 ? ' – ' + fmt(q) : '')) + '">' + (j - i >= 3 ? p.getDate() + '–' + q.getDate() : '') + '</span>'; i = j; }
    for(let k = 0; k < S.tls; k++){ const f = addM(a, k);
      mo += '<span style="left:calc(var(--dw) * ' + ix(f) + ');width:calc(var(--dw) * ' + days(f, addM(a, k + 1)) + ')">' + H(moName(f.getFullYear(), f.getMonth())) + '</span>';
      if(k) ml += '<i class="adtlm" style="left:calc(var(--nw) + var(--dw) * ' + ix(f) + ')"></i>'; }
    const counts = Array.from({length: N}, (_, i) => all.filter(m => inStay(m, addD(a, i))).length), mx = Math.max(1, ...counts);
    for(let i = 0; i < N; i++){ const d = addD(a, i), w = d.getDay(), n = counts[i];
      dy += '<button type="button" class="' + (w === 6 ? 'sat' : w === 0 ? 'sun wk0' : '') + (same(d, today()) ? ' t' : '') + '" style="left:calc(var(--dw) * ' + i + ')" data-adopenday="' + d.getTime() + '" title="' + H(dayLong(d) + ' · ' + L(n + ' in town — open this day', n + '명 체류 — 이 날 열기')) + '"><small class="w3">' + H(wdS(d)) + '</small><small class="w1">' + H(wdS(d).charAt(0)) + '</small><span class="dn">' + d.getDate() + '</span></button>';
      cnt += '<i style="left:calc(var(--dw) * ' + i + ');height:' + Math.round(n / mx * 100) + '%"></i><span style="left:calc(var(--dw) * ' + i + ')" title="' + H(fmt(d) + ': ' + L(n + ' in town', n + '명 체류')) + '">' + n + '</span>'; }
    const body = rows.map(m => {
      const s0 = Math.max(0, ix(m.ind)), s1 = Math.min(N, ix(m.out) + 1), cl = m.ind < a, cr = m.out >= z, fa = flight(m.c, 'a'), fz = flight(m.c, 'd');
      const ap = [...APPT.values()].filter(x => x.m === m.id).map(x => ({x, d: fromIso(x.d)})).filter(o => o.d && o.d >= a && o.d < z).map(o => '<i class="adtlp" style="left:calc(var(--dw) * ' + (ix(o.d) + .5) + ')" title="' + H(fmt(o.d) + ' ' + (o.x.t || '') + ' · ' + (o.x.title || '')) + '"></i>').join('');
      const bar = s1 > s0 ? '<button type="button" class="adtlb' + (cl ? ' cl' : '') + (cr ? ' cr' : '') + (m.tbd ? ' tbd' : '') + '" data-adpick="' + H(m.id) + '" data-adtl="1" style="--c:' + m.col + ';left:calc(var(--dw) * ' + s0 + ' + 1px);width:calc(var(--dw) * ' + (s1 - s0) + ' - 2px)" title="' + H(m.nm + ' · ' + fmt(m.ind) + ' ' + fa.t + ' ' + apShort(fa) + ' → ' + (m.tbd ? L('departure not decided', '출국 미정') : fmt(m.out) + ' ' + fz.t + ' ' + apShort(fz)) + ' · ' + (m.tbd ? 'TBD' : L(m.len + ' days', m.len + '일'))) + '">' +
        (cl ? '<em>‹ ' + L('since ', '') + fmt(m.ind) + L('', '부터') + '</em>' : '<span class="fa">✈ ' + H(fa.t || '--:--') + (apShort(fa) ? ' ' + H(apShort(fa)) : '') + '</span>') + '<b>' + H(first1(m.nm)) + '</b><em>' + (m.tbd ? 'TBD' : L(m.len + ' days', m.len + '일')) + '</em>' +
        (cr ? '<em class="r">' + (m.tbd ? L('departure TBD ›', '출국 미정 ›') : L('until ', '') + fmt(m.out) + L(' ›', '까지 ›')) + '</em>' : '<span class="fd">' + (m.early ? L('EARLY ', '조기 ') : '') + '↗ ' + H(fz.t || '--:--') + (apShort(fz) ? ' ' + H(apShort(fz)) : '') + '</span>') + '</button>' : '';
      return '<div class="adtlr' + (S.pick === m.id ? ' on' : '') + '"><button type="button" class="adtln" data-adpick="' + H(m.id) + '" data-adtl="1">' + thumb(m) + '<span><b>' + H(m.nm) + '</b><small>' + VIS(m.vty) + ' · ' + (m.tbd ? 'TBD' : L(m.len + ' days', m.len + '일')) + '</small></span></button><div class="adtlt grid">' + bar + ap + '</div></div>';
    }).join('');
    const ti = ix(today()), nowL = ti >= 0 && ti < N ? '<i class="adtlnow" style="left:calc(var(--nw) + var(--dw) * ' + (ti + .5) + ' - 1px)"></i>' : '';
    return '<div class="adtlbar"><span class="adseg" role="group" aria-label="' + H(L('How much to show', '표시 기간')) + '">' + [1, 3, 6].map(k => '<button type="button" data-adtls="' + k + '" aria-pressed="' + (S.tls === k) + '">' + L(k + (k === 1 ? ' month' : ' months'), k + '개월') + '</button>').join('') + '</span>' +
      '<p class="adhint"><span><s></s>' + L('one bar per model: arrival → departure', '모델 한 명당 막대 하나: 도착 → 출국') + '</span><span><i style="background:#5B48C9"></i>' + L('appointment', '일정') + '</span><span>· ' + L('click a bar for flights and details · click a date to open that day', '막대를 누르면 항공·상세 · 날짜를 누르면 그날 일정') + '</span></p></div>' +
      '<div class="adtlw"><div class="adtl" style="--days:' + N + ';--dw:20px">' +
        '<div class="adtlh"><div class="adtln">' + L(rows.length + ' models', '모델 ' + rows.length + '명') + '</div><div class="adtlt"><div class="adtlmo">' + mo + '</div><div class="adtlwk">' + wk + '</div><div class="adtldy">' + dy + '</div></div></div>' +
        (rows.length ? body : '<div class="adtlr"><div class="adtln"></div><div class="adtlt"><p class="adempty">' + L('Nobody in Korea in these months.', '이 기간에 한국에 있는 모델이 없습니다.') + '</p></div></div>') +
        '<div class="adtlc"><div class="adtln">' + L('In town', '체류') + '</div><div class="adtlt">' + cnt + '</div></div>' + ml + nowL + '</div></div>';
  }
  function fitTl(){
    const w = PG.querySelector('.adtlw'), t = PG.querySelector('.adtl'); if(!w || !t) return;
    const nw = parseFloat(getComputedStyle(t).getPropertyValue('--nw')) || 190, N = +t.style.getPropertyValue('--days');
    const dw = Math.max(S.tls === 1 ? 26 : 9, (w.clientWidth - nw - 2) / N);
    t.style.setProperty('--dw', dw.toFixed(2) + 'px'); t.classList.toggle('dense', dw < 17); t.classList.toggle('wide', dw >= 26);
    if(S.tlScroll){ S.tlScroll = false; w.scrollLeft = Math.max(0, days(S.tl0, today()) * dw - 40); return true; }
    return false;
  }

  /* ---------- the side bar ---------- */
  function flightBox(m){
    const c = m.c, fa = flight(c, 'a'), fz = flight(c, 'd'), A = arrAt(m), Z = depAt(m), N = Date.now();
    let h = '<div class="adfl2"><div class="adflc a"><span>✈ ' + L('Arrival', '도착') + '</span><b>' + H(wdS(m.ind) + ' ' + fmt(m.ind) + ' · ' + (fa.t || '--:--')) + '</b><em>' + H((fa.no ? fa.no + ' · ' : '') + apLong(fa)) + '</em>' + (A > N ? cdSpan(A) : '') + '</div>' +
      '<div class="adflc d"><span>↗ ' + L('Departure', '출국') + '</span><b>' + (m.tbd ? L('Not decided', '미정') : H(wdS(m.out) + ' ' + fmt(m.out) + ' · ' + (fz.t || '--:--'))) + '</b><em>' + H((fz.no ? fz.no + ' · ' : L('Flight not set · ', '항공편 미입력 · ')) + apLong(fz)) + '</em>' + (!m.tbd && Z > N ? cdSpan(Z) : '') + '</div></div>';
    if(S.flt === m.id) h += '<form class="adff" data-adfltform="' + H(m.id) + '">' + [['a', fa], ['d', fz]].map(([k, f]) => '<h5 class="' + k + '">' + (k === 'a' ? '✈ ' + L('Arrival flight', '도착 항공편') : '↗ ' + L('Departure flight', '출국 항공편')) + '</h5><label>' + L('Flight', '항공편') + '<input name="' + k + 'no" maxlength="40" value="' + H(f.no) + '" placeholder="KE908"></label><label>' + L('Time', '시간') + '<input type="time" name="' + k + 't" value="' + H(f.t) + '"></label>' +
      '<label>' + L('Airport', '공항') + '<select name="' + k + 'ap"><option value="">—</option>' + Object.keys(AIR).map(x => '<option value="' + x + '"' + (f.ap === x ? ' selected' : '') + '>' + H(L(AIR[x][0], AIR[x][1]) + ' (' + x + ')') + '</option>').join('') + '</select></label><label>' + L('Terminal', '터미널') + '<select name="' + k + 'tm">' + TERM.map(x => '<option value="' + x + '"' + (f.tm === x ? ' selected' : '') + '>' + (x ? H(x) : '—') + '</option>').join('') + '</select></label>').join('') +
      '<div class="adfa"><button type="button" data-adfltx>' + L('Cancel', '취소') + '</button><button type="submit" class="pri">' + L('Save flights', '항공편 저장') + '</button></div></form>';
    else h += '<button type="button" class="adfled" data-adflt="' + H(m.id) + '">✎ ' + L('Flights · time · airport · terminal', '항공편 · 시간 · 공항 · 터미널') + '</button>';
    return h;
  }
  function srow(m){
    if(S.pick !== m.id) return row(m);
    return '<div class="adsx" style="--c:' + m.col + '">' + row(m) + '<div class="adsxb">' + guarBox(m.c, m.tbd ? 0 : m.len) + flightBox(m) + stayBox(m.c, 'board') + '<div class="addnh">' + L('Notes', '메모') + ((m.c.anotes || []).length ? ' · ' + m.c.anotes.length : '') + '</div>' + notesHtml(m.c) +
      '<button type="button" class="adopen" data-adopen="' + H(m.id) + '">' + L('Open booking card →', '부킹 카드 열기 →') + '</button></div></div>';
  }
  function side(all){
    if(S.view === 'day') return groups(all, srow, S.vday);
    if(S.view === 'month'){ const a = new Date(S.vy, S.vm, 1), z = new Date(S.vy, S.vm + 1, 0), list = all.filter(m => m.ind <= z && m.out >= a);
      return '<div class="adlh"><b>' + L('Available', '체류 가능') + '</b><span>' + H(a.toLocaleDateString(loc(), {month: 'long'})) + ' · ' + L(list.length + ' models', list.length + '명') + '</span></div>' + (list.length ? '<div class="adrows">' + list.map(srow).join('') + '</div>' : '<p class="adempty">' + L('Nobody in Korea this month.', '이 달에 한국에 있는 모델이 없습니다.') + '</p>'); }
    return groups(all, srow);
  }

  /* ---------- the page ---------- */
  function header(){
    const a = new Date(S.by, S.bm, 1), z = new Date(S.by, S.bm + 8, 1), tz = addM(S.tl0, S.tls - 1);
    const rng = (p, q) => p.toLocaleDateString(loc(), {month: 'short', year: 'numeric'}) + (p.getFullYear() === q.getFullYear() && p.getMonth() === q.getMonth() ? '' : ' – ' + q.toLocaleDateString(loc(), {month: 'short', year: 'numeric'}));
    const home = S.home === 'tl' ? L('Timeline', '타임라인') : L('9 months', '9개월');
    const seg = '<span class="adseg" role="group" aria-label="' + H(L('View', '보기')) + '"><button type="button" data-adhome="cal" aria-pressed="' + (S.home === 'cal') + '">▦ ' + L('Calendar', '달력') + '</button><button type="button" data-adhome="tl" aria-pressed="' + (S.home === 'tl') + '">☰ ' + L('Timeline', '타임라인') + '</button></span>';
    const crumbs = '<span class="adcrumbs">' + (S.view === 'ov' ? '<b>' + H(S.home === 'tl' ? rng(S.tl0, tz) : rng(a, z)) + '</b>' :
      '<button type="button" data-adview="ov">' + home + '</button> › ' + (S.view === 'month' ? '<b>' + H(moName(S.vy, S.vm)) + '</b>' : '<button type="button" data-adview="month">' + H(moName(S.vy, S.vm)) + '</button> › <b>' + H(dayLong(S.vday)) + '</b>')) + '</span>';
    const lab = S.view === 'day' ? [L('Previous day', '이전 날'), L('Next day', '다음 날')] : S.view === 'month' || S.home === 'tl' ? [L('Previous month', '이전 달'), L('Next month', '다음 달')] : [L('Earlier months', '이전 달'), L('Later months', '다음 달')];
    let tot = '';
    if(S.view === 'ov'){ try{
      const p0 = S.home === 'tl' ? new Date(S.tl0.getFullYear(), S.tl0.getMonth(), 1) : a, p1 = S.home === 'tl' ? new Date(tz.getFullYear(), tz.getMonth() + 1, 0) : new Date(S.by, S.bm + 9, 0);
      const al = stays(), tM = al.filter(m => m.ind <= p1 && m.out >= p0).length, tA = al.filter(m => m.ind >= p0 && m.ind <= p1).length, tD = al.filter(m => !m.tbd && m.out >= p0 && m.out <= p1).length;
      tot = '<span class="adtot" title="' + H(L('Totals for the months shown', '보이는 기간의 합계')) + '"><b>' + tM + '</b> ' + L(tM === 1 ? 'model' : 'models', '모델') + ' · <b class="a">' + tA + '</b> ' + L(tA === 1 ? 'arrival' : 'arrivals', '도착') + ' · <b class="d">' + tD + '</b> ' + L(tD === 1 ? 'departure' : 'departures', '출국') + '</span>';
    }catch(e){} }
    const leg = S.view === 'ov' && S.home === 'cal' ? '<p class="adhint adhleg"><span><i style="background:#1F8A55"></i>' + L('arrival', '도착') + '</span><span><i style="background:#C2334D"></i>' + L('departure', '출국') + '</span><span><i style="background:#5B48C9"></i>' + L('appointment', '일정') + '</span></p>' : '';
    return '<div class="adbdh"><h2>' + L('Arrival/Departure', '입국/출국') + '</h2>' + (S.view === 'ov' ? seg : '') + crumbs + tot + leg + '<span class="adsp"></span><div class="adbnav">' + (S.view !== 'ov' ? '<button type="button" class="adpill" data-adback>‹ ' + L('Back', '뒤로') + '</button>' : '') +
      '<button type="button" class="adnav" data-adbmv="-1" aria-label="' + H(lab[0]) + '">‹</button><button type="button" class="adtoday" data-adbtoday>' + L('Today', '오늘') + '</button><button type="button" class="adnav" data-adbmv="1" aria-label="' + H(lab[1]) + '">›</button></div></div>';
  }
  function board(){
    if(PG.hidden) return;
    const all = stays();
    if(!PG.querySelector('.adbd')) PG.innerHTML = '<div class="adbd"><div class="adbdhw"></div><div class="adtilesw"></div><div class="adbdw"><div class="adbmain"></div><aside class="addet"></aside></div></div>';
    const root = PG.querySelector('.adbd'), MAIN = PG.querySelector('.adbmain'), D = PG.querySelector('.addet');
    const phone = window.innerWidth < 760;
    if(!phone){ const top = root.getBoundingClientRect().top; let h = Math.max(480, window.innerHeight - Math.max(0, top) - 10); root.style.height = h + 'px';
      /* whatever sits below (the pane's padding) must not make the page scroll */
      const over = document.documentElement.scrollHeight - window.innerHeight; if(over > 0 && h - over >= 480){ h -= over; root.style.height = h + 'px'; } } else root.style.height = '';
    const tw = PG.querySelector('.adtlw'), tx = tw ? [tw.scrollLeft, tw.scrollTop] : null, keepD = D.scrollTop, keepM = MAIN.scrollTop;
    PG.querySelector('.adbdhw').innerHTML = header();
    PG.querySelector('.adtilesw').innerHTML = tiles(all);
    MAIN.className = 'adbmain v-' + S.view + (S.view === 'ov' ? ' h-' + S.home : '');
    MAIN.innerHTML = S.view === 'ov' ? (S.home === 'tl' ? timeline(all) : overview(all)) : S.view === 'month' ? monthView(all) : dayView(all);
    D.innerHTML = side(all);
    D.scrollTop = keepD; if(S.keepMain) MAIN.scrollTop = keepM; S.keepMain = false;
    const lg = PG.querySelector('.adhleg'); if(lg){ const kids = [...lg.children]; kids.forEach(k => k.hidden = false); for(let i = kids.length - 1; i > 0 && lg.scrollWidth > lg.clientWidth + 1; i--) kids[i].hidden = true; }   /* the legend drops its last items rather than being cut */
    const ov = PG.querySelector('.adov'); if(ov){ const mi = ov.querySelector('.admini'); ov.classList.toggle('tight', !!mi && mi.getBoundingClientRect().height < 190 && !phone); }
    const jumped = fitTl(); if(tx && !jumped){ const w = PG.querySelector('.adtlw'); if(w){ w.scrollLeft = tx[0]; w.scrollTop = tx[1]; } }
    fitSigns(PG);
    if(S.focusApt){ S.focusApt = false; const f = PG.querySelector('.adaf input[name=title]'); if(f) f.focus(); }
    syncPick();
  }
  /* picking a model in one place brings it into view in the other: timeline -> side bar, side bar -> timeline */
  function syncPick(){
    const from = S.from; S.from = null; if(!from || !S.pick || window.innerWidth < 760) return;
    const D = PG.querySelector('.addet');
    if(from === 'tl'){
      if(!D.querySelector('.adsx') && S.f !== 'all' && S.view === 'ov'){ S.f = 'all'; D.innerHTML = side(stays()); fitSigns(D); }
      const sx = D.querySelector('.adsx'); if(!sx) return;
      const top = sx.getBoundingClientRect().top - D.getBoundingClientRect().top + D.scrollTop;
      D.scrollTo({top: Math.max(0, top - Math.max(8, (D.clientHeight - sx.offsetHeight) / 2)), behavior: 'smooth'});
    } else if(from === 'side'){
      let w = PG.querySelector('.adtlw'), r = PG.querySelector('.adtlr.on'); if(!w) return;
      if(!r){ const m = stays().find(x => x.id === S.pick); if(!m) return; S.tl0 = new Date(m.ind.getFullYear(), m.ind.getMonth(), 1); board(); w = PG.querySelector('.adtlw'); r = PG.querySelector('.adtlr.on'); if(!w || !r) return; }
      const bar = r.querySelector('.adtlb'), wr = w.getBoundingClientRect(), rr = r.getBoundingClientRect(), nw = parseFloat(getComputedStyle(PG.querySelector('.adtl')).getPropertyValue('--nw')) || 190;
      const o = {top: Math.max(0, w.scrollTop + rr.top - wr.top - (w.clientHeight - r.offsetHeight) / 2), behavior: 'smooth'};
      if(bar){ const bl = bar.offsetLeft; if(bl < w.scrollLeft || bl > w.scrollLeft + w.clientWidth - nw - 60) o.left = Math.max(0, bl - 20); }
      w.scrollTo(o);
    }
  }
  function mountBoard(){
    const ref = document.getElementById('pane-arr');
    if(!ref || !window.__illuShellAdd){ setTimeout(mountBoard, 250); return; }
    ref.parentNode.insertBefore(PG, ref);
    window.__illuShellAdd('arrd', {label: ['Arrival/Departure', '입국/출국'], title: ['Arrival/Departure', '입국/출국'], el: PG,
      count: () => { const T = today(); return stays().filter(m => inStay(m, T)).length || ''; }, show: () => { S.tlScroll = S.home === 'tl'; requestAnimationFrame(board); }});
  }
  let rzT = 0; const onResize = () => { if(PG.hidden) return; clearTimeout(rzT); rzT = setTimeout(board, 60); };
  try{ new ResizeObserver(onResize).observe(PG); }catch(e){}
  window.addEventListener('resize', onResize);


  /* ---------- drawing everything ---------- */
  let rT = 0;
  function render(){ if(rT) return; rT = requestAnimationFrame(() => { rT = 0; try{ panel(); }catch(e){ console.error('arr panel', e); } try{ board(); }catch(e){ console.error('arr board', e); } try{ if(typeof bv !== 'undefined' && bv && window.__illuBvLeft) window.__illuBvLeft(); }catch(e){} }); }
  window.__illuArrRender = render;
  window.__illuArrStays = stays;
  /* 1.2.114: the Today board's lower side panel and the morning alerts ask for every arrival and departure
     from day `from` (0 = today) for `n` days, soonest first */
  window.__illuArrSoon = (n, from) => {
    const T = today(), A = addD(T, from || 0), Z = addD(T, (from || 0) + (n || 7)), out = [];
    for(const m of stays()){
      const fa = flight(m.c, 'a'), a = arrAt(m);
      if(m.ind >= A && m.ind < Z) out.push({k: 'a', at: a, day: days(T, m.ind), hasT: !!fa.t, t: fa.t, m, f: fa, ap: apShort(fa), apL: apLong(fa)});
      if(!m.tbd && m.out >= A && m.out < Z){ const fd2 = flight(m.c, 'd'); out.push({k: 'd', at: depAt(m), day: days(T, m.out), hasT: !!fd2.t, t: fd2.t, m, f: fd2, ap: apShort(fd2), apL: apLong(fd2), early: !!m.early}); }
    }
    return out.sort((x, y) => x.at - y.at);
  };
  window.__illuArrBits = {guarChip, VIS, photo, cdown, wdS, fmt, first1};

  /* ---------- changing a card ---------- */
  function touch(c){ try{ saveBook(c.id, true); }catch(e){} try{ renderBook(); }catch(e){} try{ if(typeof bv !== 'undefined' && bv && bv.id === c.id) bvDraw(); }catch(e){} render(); }
  function logIt(c, k, what, why){ c.dlog = (Array.isArray(c.dlog) ? c.dlog : []).concat([{k, what, why: why || '', by: me(), at: new Date().toISOString()}]); }
  function openCard(id){
    S.fromPanel = !!(P && P.closest('#abdrawer.open'));
    document.body.classList.toggle('adbv', S.fromPanel && window.innerWidth >= 760);
    if(S.fromPanel && window.innerWidth < 760){ try{ abShow(null); }catch(e){} S.reopen = true; }
    try{ window.__illuOpenBkCard(id); }catch(e){ console.error(e); }
  }
  /* when the booking card closes: the choice made from the side panel is cleared, and on a phone the panel comes back */
  function watchBv(){
    const el = typeof bvEl !== 'undefined' ? bvEl : document.querySelector('.bv');
    if(!el){ setTimeout(watchBv, 500); return; }
    new MutationObserver(() => { if(el.hidden){ document.body.classList.remove('adbv'); if(S.fromPanel){ S.fromPanel = false; S.pick = null; render(); } if(S.reopen){ S.reopen = false; try{ abShow('log'); }catch(e){} } } }).observe(el, {attributes: true, attributeFilter: ['hidden']});
  }

  document.addEventListener('click', e => {
    const t = e.target; if(!t.closest) return;
    const inMine = t.closest('#adpanel, #pane-arrd, .adbvl');
    if(!inMine){
      /* a click outside the panel / board (and not in the card) clears the choice */
      if((S.pick || S.date) && !t.closest('.bv, #abdrawer, #shrail, #appbar') && (PG.hidden === false || (P && P.closest('#abdrawer.open')))){ if(S.pick) S.pick = null; else S.date = null; S.edit = null; render(); }
      return;
    }
    const q = s => t.closest(s);
    let b;
    if((b = q('[data-admv]'))){ S.m += +b.dataset.admv; if(S.m < 0){ S.m = 11; S.y--; } if(S.m > 11){ S.m = 0; S.y++; } render(); return; }
    if(q('[data-adtoday]')){ const T = today(); S.y = T.getFullYear(); S.m = T.getMonth(); render(); return; }
    /* the board: where you are, and moving through it */
    if((b = q('[data-adbmv]'))){ const n = +b.dataset.adbmv;
      if(S.view === 'day'){ S.vday = addD(S.vday, n); S.vy = S.vday.getFullYear(); S.vm = S.vday.getMonth(); S.apt = null; }
      else if(S.view === 'month'){ const d = new Date(S.vy, S.vm + n, 1); S.vy = d.getFullYear(); S.vm = d.getMonth(); }
      else if(S.home === 'tl') S.tl0 = addM(S.tl0, n);
      else { const d = new Date(S.by, S.bm + n * 3, 1); S.by = d.getFullYear(); S.bm = d.getMonth(); }
      render(); return; }
    if(q('[data-adbtoday]')){ const T = today(); S.by = T.getFullYear(); S.bm = T.getMonth() - 1; if(S.bm < 0){ S.bm = 11; S.by--; } S.tl0 = new Date(T.getFullYear(), T.getMonth(), 1); S.tlScroll = true;
      S.vy = T.getFullYear(); S.vm = T.getMonth(); if(S.view === 'day'){ S.vday = T; S.apt = null; } render(); return; }
    if((b = q('[data-adhome]'))){ S.home = b.dataset.adhome; S.tlScroll = S.home === 'tl'; keepView(); render(); return; }
    if((b = q('[data-adtls]'))){ S.tls = +b.dataset.adtls; S.tlScroll = true; keepView(); render(); return; }
    if((b = q('[data-adview]'))){ S.view = b.dataset.adview; S.apt = null; S.flt = null; if(S.view === 'ov') S.tlScroll = S.home === 'tl'; render(); return; }
    if(q('[data-adback]')){ S.view = S.view === 'day' ? 'month' : 'ov'; S.apt = null; if(S.view === 'ov') S.tlScroll = S.home === 'tl'; render(); return; }
    if((b = q('[data-admonth]'))){ const [y, mo] = b.dataset.admonth.split('|').map(Number); S.vy = y; S.vm = mo; S.view = 'month'; render(); return; }
    if((b = q('[data-adopenday]'))){ const d = new Date(+b.dataset.adopenday); S.vday = d; S.vy = d.getFullYear(); S.vm = d.getMonth(); S.view = 'day'; S.apt = null; render(); return; }
    if((b = q('[data-adapt]'))){ if(!signed()) return; S.apt = b.dataset.adapt; S.focusApt = true; S.keepMain = true; render(); return; }
    if(q('[data-adaptx]')){ S.apt = null; S.keepMain = true; render(); return; }
    if((b = q('[data-adaptdel]'))){ if(!signed()) return; const id = b.dataset.adaptdel; if(!APPT.get(id)) return;
      /* two clicks: the first asks, the second deletes */
      if(b.dataset.sure !== '1'){ b.dataset.sure = '1'; b.textContent = L('Delete?', '삭제?'); b.classList.add('sure'); setTimeout(() => { if(b.isConnected){ b.dataset.sure = ''; b.textContent = '✕'; b.classList.remove('sure'); } }, 3000); return; }
      APPT.delete(id); S.keepMain = true; render(); try{ db().doc('appt/' + id).delete(); }catch(er){ console.error('appt', er); } return; }
    if((b = q('[data-adflt]'))){ if(!signed()) return; S.flt = b.dataset.adflt; render(); setTimeout(() => { const f = document.querySelector('.adff input'); if(f) f.focus(); }, 60); return; }
    if(q('[data-adfltx]')){ S.flt = null; render(); return; }
    if((b = q('[data-adday]'))){ const d = new Date(+b.dataset.adday); if(S.date && same(S.date, d)) S.date = null; else { S.date = d; if(t.closest('#adpanel') && d.getMonth() !== S.m){ S.m = d.getMonth(); S.y = d.getFullYear(); } } S.pick = null; S.edit = null; render(); return; }
    if(q('[data-adclear]')){ S.date = null; S.pick = null; render(); return; }
    if((b = q('[data-adf]'))){ S.f = b.dataset.adf; render(); return; }
    if((b = q('[data-adtab]'))){ S.tab = b.dataset.adtab; keepView(); render(); return; }
    if(q('[data-adgo]')){ try{ abShow(null); }catch(er){} try{ window.__illuGo && window.__illuGo('arrd'); }catch(er){} return; }
    if((b = q('[data-adopen]'))){ S.pick = b.dataset.adopen; openCard(b.dataset.adopen); return; }
    if((b = q('[data-adall]'))){ S.all.add(b.dataset.adall); render(); return; }
    if((b = q('[data-adlog]'))){ S.logOpen = S.logOpen === b.dataset.adlog ? '' : b.dataset.adlog; render(); return; }
    if((b = q('[data-adedit]'))){ const v = b.dataset.adedit; if(v && !signed()) return; S.edit = v ? {id: v.slice(0, v.lastIndexOf('|')), k: v.slice(v.lastIndexOf('|') + 1)} : null; render(); setTimeout(() => { const f = document.querySelector('.adform input'); if(f) f.focus(); }, 60); return; }
    if((b = q('[data-adconf]'))){ if(!signed()) return; const c = BOOK.get(b.dataset.adconf); if(!c) return; c.indok = {by: me(), at: new Date().toISOString()}; logIt(c, 'conf', L('Arrival confirmed · ', '도착 확정 · ') + fmt(pd(c.ind)), ''); touch(c); return; }
    if((b = q('[data-adunconf]'))){ if(!signed()) return; const c = BOOK.get(b.dataset.adunconf); if(!c) return; c.indok = null; logIt(c, 'conf', L('Arrival confirmation taken back', '도착 확정 취소'), ''); touch(c); return; }
    if((b = q('[data-adunearly]'))){ if(!signed()) return; const c = BOOK.get(b.dataset.adunearly); if(!c) return; const m = stay(c); c.early = null; logIt(c, 'early', L('Early leave undone · departure ', '조기 귀국 취소 · 출국 ') + (m && m.plan ? fmt(m.plan) : L('not decided', '미정')), ''); touch(c); return; }
    if(q('.adform, .adnadd, .adsxb, .adaf, .adff')) return;
    if((b = q('[data-adpick]'))){
      const id = b.dataset.adpick, onBoard = !!t.closest('#pane-arrd');
      if(onBoard){ S.pick = S.pick === id ? null : id; S.flt = null; S.edit = null; S.from = S.pick ? (b.dataset.adtl || b.dataset.adside ? 'tl' : t.closest('.addet') ? 'side' : null) : null; render(); return; }
      S.pick = id; S.edit = null;
      const m = stays().find(x => x.id === id); if(m && (!S.date || !inStay(m, S.date))){ S.y = m.ind.getFullYear(); S.m = m.ind.getMonth(); }
      render(); openCard(id); return;
    }
  });
  document.addEventListener('change', e => {
    const t = e.target; if(!t.closest) return;
    const ck = t.closest('.adform [name="tbd"]'); if(ck){ const o = ck.form.outd; o.disabled = ck.checked; if(ck.checked) o.value = ''; }
  });
  document.addEventListener('submit', e => {
    const t = e.target; if(!t.closest) return;
    const nf = t.closest('.adnadd');
    if(nf){ e.preventDefault(); if(!signed()) return; const v = (nf.t.value || '').trim(); if(!v){ nf.t.focus(); return; }
      const c = BOOK.get(nf.dataset.adnote); if(!c) return;
      c.anotes = (Array.isArray(c.anotes) ? c.anotes : []).concat([{t: v.slice(0, 2000), by: me(), at: new Date().toISOString()}]); S.all.add(c.id);
      nf.t.value = ''; touch(c); setTimeout(() => { const a = document.querySelector('.adnadd[data-adnote="' + CSS.escape(c.id) + '"] input'); if(a) a.focus(); }, 80); return; }
    const af = t.closest('.adaf');
    if(af){ e.preventDefault(); if(!signed()) return; const d = db(); if(!d) return;
      const v = {d: iso(S.vday), t: af.t.value, e: af.e.value, title: af.title.value.trim().slice(0, 200), m: af.m.value, where: af.where.value.trim().slice(0, 200), note: af.note.value.trim().slice(0, 2000)};
      if(!v.title){ af.title.focus(); return; }
      const isNew = S.apt === 'new', id = isNew ? 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) : S.apt, old = APPT.get(id) || {};
      const rec = Object.assign({}, old, v, isNew ? {by: me(), at: new Date().toISOString()} : {eby: me(), eat: new Date().toISOString()}); delete rec.id;
      APPT.set(id, Object.assign({id}, rec)); S.apt = null; S.keepMain = true; render();
      try{ d.doc('appt/' + id).set(rec); }catch(er){ console.error('appt', er); } return; }
    const ff = t.closest('.adff');
    if(ff){ e.preventDefault(); if(!signed()) return; const c = BOOK.get(ff.dataset.adfltform); if(!c) return;
      const was = [c.inf || '', JSON.stringify(c.arrfl || {}), c.outf || '', JSON.stringify(c.depfl || {})].join('|');
      c.inf = ff.ano.value.trim(); c.outf = ff.dno.value.trim();
      c.arrfl = {t: ff.at.value, ap: ff.aap.value, tm: ff.atm.value}; c.depfl = {t: ff.dt.value, ap: ff.dap.value, tm: ff.dtm.value};
      const now = [c.inf, JSON.stringify(c.arrfl), c.outf, JSON.stringify(c.depfl)].join('|');
      if(now !== was){ const fa = flight(c, 'a'), fz = flight(c, 'd'); logIt(c, 'flt', L('Flights · in ', '항공편 · 도착 ') + [fa.no, fa.t, apShort(fa)].filter(Boolean).join(' ') + L(' · out ', ' · 출국 ') + [fz.no, fz.t, apShort(fz)].filter(Boolean).join(' '), ''); }
      S.flt = null; touch(c); return; }
    const df = t.closest('.adform'); if(!df) return;
    e.preventDefault(); if(!signed()) return;
    const v = df.dataset.adform, id = v.slice(0, v.lastIndexOf('|')), k = v.slice(v.lastIndexOf('|') + 1), c = BOOK.get(id); if(!c) return;
    const m = stay(c), why = (df.why.value || '').trim();
    if(k === 'dates'){
      const ni = fromIso(df.ind.value), tbd = df.tbd.checked, no = tbd ? null : fromIso(df.outd.value);
      if(!ni) return;
      if(no && no < ni){ df.outd.setCustomValidity(L('The departure is before the arrival', '출국일이 도착일보다 빠릅니다')); df.outd.reportValidity(); setTimeout(() => df.outd.setCustomValidity(''), 2000); return; }
      if(m && !same(ni, m.ind)){ const dd = days(m.ind, ni); logIt(c, 'ind', L('Arrival ' + fmt(m.ind) + ' → ' + fmt(ni) + (dd > 0 ? ' (delayed ' + dd + ' days)' : ' (earlier by ' + (-dd) + ' days)'), '도착 ' + fmt(m.ind) + ' → ' + fmt(ni) + (dd > 0 ? ' (' + dd + '일 지연)' : ' (' + (-dd) + '일 앞당김)')), why); c.ind = fd(ni); }
      const before = m ? (m.tbd ? L('not decided', '미정') : fmt(m.plan || m.out)) : '';
      if(tbd && !(m && m.tbd)){ c.outd = ''; c.outtbd = true; logIt(c, 'outd', L('Departure ' + before + ' → not decided yet', '출국 ' + before + ' → 미정'), why); }
      else if(no && df.outd.value !== df.outd.dataset.orig){ c.outd = fd(no); c.outtbd = false; logIt(c, 'outd', L('Departure ' + before + ' → ' + fmt(no), '출국 ' + before + ' → ' + fmt(no)), why); }
      else if(!tbd && m && m.tbd && no){ c.outd = fd(no); c.outtbd = false; logIt(c, 'outd', L('Departure not decided → ' + fmt(no), '출국 미정 → ' + fmt(no)), why); }
    }else{
      const a = fromIso(df.at.value); if(!a) return;
      c.early = {at: fd(a), why, by: me(), on: new Date().toISOString()};
      logIt(c, 'early', L('Sent home early · leaves ' + fmt(a) + (m && m.plan ? ' (planned ' + fmt(m.plan) + ')' : ''), '조기 귀국 · ' + fmt(a) + ' 출국' + (m && m.plan ? ' (예정 ' + fmt(m.plan) + ')' : '')), why);
    }
    S.edit = null; S.logOpen = c.id; touch(c);
  });
  /* Esc: the open form, then the model, then the date (the booking card and other windows close themselves first) */
  window.addEventListener('keydown', e => {
    if(e.key !== 'Escape') return;
    const bvOpen = !!document.querySelector('.bv:not([hidden])');
    /* a card opened from the side panel: Esc closes the card only - the panel stays open for the next model */
    if(bvOpen && document.body.classList.contains('adbv') && !(e.target.closest && e.target.closest('.adform, .adnadd'))){
      if(document.querySelector('.bv.bvmax, .bv [role="dialog"]:not([hidden])')) return;
      e.preventDefault(); e.stopImmediatePropagation(); try{ bvClose(); }catch(er){} return; }
    if(bvOpen && !(e.target.closest && e.target.closest('.adbvl'))) return;
    const mine = (P && P.closest('#abdrawer.open')) || !PG.hidden || (e.target.closest && e.target.closest('.adbvl'));
    if(!mine) return;
    if(e.target.closest && e.target.closest('.adnadd') && e.target.value){ e.target.value = ''; e.preventDefault(); e.stopImmediatePropagation(); return; }
    const onBoard = !PG.hidden && !(P && P.closest('#abdrawer.open'));
    if(S.apt && onBoard){ S.apt = null; } else if(S.flt){ S.flt = null; } else if(S.edit){ S.edit = null; } else if(S.pick){ S.pick = null; }
    else if(onBoard && S.view === 'day'){ S.view = 'month'; } else if(onBoard && S.view === 'month'){ S.view = 'ov'; S.tlScroll = S.home === 'tl'; } else if(S.date){ S.date = null; } else return;
    e.preventDefault(); e.stopImmediatePropagation(); render();
  }, true);

  /* the cards change (typed, saved, or someone else's change arriving): draw again */
  function hook(){
    let ok = true;
    for(const n of ['renderBook', 'refresh']){
      const o = window[n]; if(typeof o !== 'function'){ ok = false; continue; }
      if(o.__ad) continue; const w = function(){ const r = o.apply(this, arguments); render(); return r; }; w.__ad = true; window[n] = w;
    }
    if(!ok) setTimeout(hook, 500);
  }
  try{ new MutationObserver(() => { P && (P.__h = ''); render(); }).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']}); }catch(e){}
  /* the day changes at midnight: everything counts from the new day */
  let lastDay = key(today()); setInterval(() => { const k = key(today()); if(k !== lastDay){ lastDay = k; render(); } }, 60000);

  /* ---------- the look ---------- */
  const css = document.createElement('style');
  css.textContent = `
body.adon #rail > :not(#adpanel):not(.lnote){display:none!important}
body.adon #rail .lnote{display:none}
#adpanel .adnotesp .lnote{display:flex!important}
#adpanel{display:flex;flex-direction:column;font-family:var(--sans,Inter,system-ui,sans-serif);color:var(--ink);min-height:0}
.adph{display:flex;justify-content:flex-end;padding:8px 12px 0}
.adtob,.adopen{height:30px;border:1px solid color-mix(in srgb,var(--acc) 35%,var(--line));background:var(--wash,#f4ecf2);color:var(--acc);border-radius:999px;padding:0 12px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.adtob:hover,.adopen:hover{background:var(--acc);color:#fff}
.adopen{border-radius:9px;height:34px;width:100%}
.adcal{padding:2px 12px 10px;border-bottom:1px solid var(--line)}
.adch{display:flex;align-items:center;gap:8px;padding:4px 2px 8px}
.adch h3{margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;flex:1;text-align:center}
.adnav{width:30px;height:30px;border-radius:50%;border:1px solid var(--line);background:var(--surf);display:grid;place-items:center;font-size:15px;line-height:1;cursor:pointer;color:var(--ink);padding:0}
.adtoday{height:28px;border:1px solid var(--line);border-radius:999px;background:var(--surf);padding:0 10px;font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;color:var(--ink)}
.adwk{display:grid;grid-template-columns:repeat(7,1fr);font-size:10.5px;font-weight:700;color:var(--faint);text-align:center;padding-bottom:4px}
.adgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.add{position:relative;height:46px;border:1px solid var(--line);border-radius:8px;background:var(--surf);padding:4px 0 0;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:var(--ink);font:inherit}
.add.out .n{opacity:.32}.add.out{border-color:color-mix(in srgb,var(--line) 50%,transparent);background:none}.add.today{border-color:var(--acc)}.add.sel{border-color:var(--acc)}
.add .n{position:relative;z-index:2;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:12.5px;font-variant-numeric:tabular-nums}
.add.today .n{box-shadow:inset 0 0 0 1.5px var(--acc);font-weight:700;color:var(--acc)}
.add.arr .n{background:color-mix(in srgb,var(--acc) 10%,transparent);font-weight:700}
.add.sel .n{background:var(--acc);color:#fff;box-shadow:none;font-weight:700}
.add:hover .n{background:var(--wash,#f4ecf2)}.add.sel:hover .n{background:var(--acc)}
.addots{position:relative;z-index:2;display:flex;gap:3px;justify-content:center;align-items:center;height:8px}
.addots i{width:7px;height:7px;border-radius:50%;background:var(--c)}.addots i.o{background:none;box-shadow:inset 0 0 0 1.6px var(--c)}
.addots s{text-decoration:none;font-size:9px;font-weight:700;color:var(--faint);line-height:1}
.add .adband{position:absolute;z-index:1;left:-3px;right:-3px;top:4px;height:26px;background:color-mix(in srgb,var(--c) 22%,transparent)}
.add .adband.a{left:50%}.add .adband.z{right:50%}
.add .adband.a::before,.add .adband.z::after{content:"";position:absolute;top:0;width:26px;height:26px;border-radius:50%;background:color-mix(in srgb,var(--c) 22%,transparent)}
.add .adband.a::before{left:-13px}.add .adband.z::after{right:-13px}
.add.bs .n{background:var(--c);color:#fff;font-weight:700}
.add .adtag{position:absolute;z-index:3;bottom:1px;font-size:8.5px;font-weight:800;letter-spacing:.04em;color:var(--c)}
.adleg{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11px;color:var(--faint);padding:8px 2px 0}
.adleg span{display:inline-flex;align-items:center;gap:5px}
.adleg i{width:8px;height:8px;border-radius:50%;background:var(--acc)}.adleg i.o{background:none;box-shadow:inset 0 0 0 1.6px var(--acc)}
.adleg .adshow{color:var(--ink)}
.adhcm{margin-top:8px;border-radius:10px;background:var(--surf2,#f6f3f8);padding:8px 10px;font-size:12px;display:flex;flex-direction:column;gap:3px}
.adhcm b{font-size:13px}.adhcm b.bad{color:#B3263E}
.adbad{color:#B3263E;font-weight:700}.adok{color:#1F7A44;font-weight:700}
.admut{color:var(--faint)}.admut.sm{font-size:12px;margin:0}
.adtabs{display:flex;margin:10px 12px 0;background:var(--surf2,#f6f3f8);border-radius:12px;padding:3px}
.adtabs button{flex:1;border:0;background:none;height:34px;border-radius:9px;font:inherit;font-weight:600;font-size:13px;color:var(--mut);cursor:pointer}
.adtabs button[aria-selected="true"]{background:var(--surf);color:var(--acc);box-shadow:0 1px 3px rgba(20,10,30,.12)}
.adnotesp{padding:6px 4px}
.adlist{padding-bottom:16px}
.adlh{display:flex;align-items:center;gap:8px;padding:12px 14px 6px}
.adlh b{font-size:12.5px}.adlh span{font-size:12px;color:var(--faint)}
.adsp{flex:1}
.adlh button{height:26px;border:1px solid var(--line);border-radius:999px;background:var(--surf);padding:0 10px;font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;color:var(--ink)}
.adchips{display:flex;gap:6px;padding:10px 14px 6px;overflow-x:auto;scrollbar-width:none}
.adchips::-webkit-scrollbar{display:none}
.adchips button{flex:none;height:30px;border:1px solid var(--line);background:var(--surf);border-radius:999px;padding:0 11px;font:inherit;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:5px;cursor:pointer;color:var(--ink)}
.adchips button s{text-decoration:none;color:var(--faint);font-size:11px}
.adchips button[aria-pressed="true"]{background:var(--acc);border-color:var(--acc);color:#fff}.adchips button[aria-pressed="true"] s{color:inherit;opacity:.8}
.adgrp{padding:8px 14px 4px;font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
.adrows{padding:0 8px;display:flex;flex-direction:column;gap:4px}
.adempty{padding:22px 16px;text-align:center;color:var(--faint);font-size:13px;margin:0}
.adrow{display:grid;grid-template-columns:50px minmax(0,1fr) auto;gap:10px;align-items:center;text-align:left;width:100%;border:1px solid transparent;background:none;border-radius:13px;padding:8px;cursor:pointer;font:inherit;color:var(--ink)}
.adrow:hover{background:var(--surf2,#f6f3f8)}
.adrow.on{background:var(--wash,#f4ecf2);border-color:color-mix(in srgb,var(--acc) 35%,transparent)}
.adthumb{width:50px;height:66px;border-radius:9px;position:relative;overflow:hidden;background:linear-gradient(160deg,#3a2c3f,#8a7a8f);flex:none;display:block}
.adthumb.big{width:62px;height:82px}
.adthumb img{width:100%;height:100%;object-fit:cover;object-position:center 20%;display:block}
.adthumb i{position:absolute;inset:0;display:grid;place-items:center;color:rgba(255,255,255,.6);font-style:normal;font-weight:800;font-size:20px}
.adthumb::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--c);z-index:1}
.admid{min-width:0;display:flex;flex-direction:column;gap:2px}
.adnm{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.adag{font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.admx{font-size:11.5px;color:var(--faint);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.admx b{color:var(--ink);font-weight:600}
.adnc2{font-size:10.5px;font-weight:700;color:var(--acc)}
.admv{font-size:10px;font-weight:700;color:#8A5200;background:#FFF1DA;border-radius:5px;padding:1px 5px;vertical-align:1px}
.advis{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:5px;font-size:10px;font-weight:800;letter-spacing:.04em;background:var(--surf2,#f3f0f5);color:var(--mut);margin-right:4px;vertical-align:1px}
.advis.c4{background:#E9F1FF;color:#2F5DAA}.advis.e6{background:#EAF7EF;color:#22784A}
.adright{display:flex;flex-direction:column;align-items:flex-end;gap:3px;min-width:80px}
.addays{font-size:17px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1}
.addays small{font-size:11px;font-weight:600;color:var(--faint);margin-left:2px}
.adrng{font-size:11px;color:var(--mut);white-space:nowrap;font-variant-numeric:tabular-nums}
.adest{font-size:10px;color:#C98A12;font-weight:700}.adest.red{color:#C2453A}
.adstt{font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:999px;white-space:nowrap}
.adstt.soon{background:#FFF1DA;color:#8A5200}.adstt.here{background:#E7F6EC;color:#1F7A44}.adstt.leave{background:#FDE8EC;color:#A3203B}.adstt.gone{background:var(--surf2,#f3f0f5);color:var(--faint)}
.adprog{grid-column:2/4;height:4px;border-radius:2px;background:var(--surf2,#efeaf2);overflow:hidden;margin-top:-2px}
.adprog i{display:block;height:100%;background:var(--c);border-radius:2px}
.addisc{width:22px;height:22px;border-radius:50%;flex:none;display:inline-grid;place-items:center;font-style:normal;font-size:10px;font-weight:700;background:var(--idbg);color:var(--idfg)}
/* stay box */
.adsbx{display:flex;flex-direction:column;gap:8px}
.addst{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;background:var(--surf2,#f6f3f8);border-radius:10px;padding:8px 10px}
.addst>div{display:flex;flex-direction:column;gap:1px;min-width:0}
.addst span{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);font-weight:700}
.addst b{font-size:13px;white-space:nowrap}
.addst em{font-style:normal;font-size:11px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.addst em.adcf{color:#1F7A44;font-weight:700;font-size:10.5px}.addst em.adnc{color:#C98A12;font-weight:700;font-size:10.5px}
.addst .r{text-align:right;align-items:flex-end}
.adlen{align-items:center;text-align:center}.adlen b{font-size:20px}
.adbvl .addst{grid-template-columns:1fr 1fr}.adbvl .adlen{grid-column:1/-1;order:-1;flex-direction:row!important;gap:6px;align-items:baseline!important;justify-content:center}
.adtip{margin:0;font-size:12px;line-height:1.45;color:var(--mut);background:var(--surf2,#f6f3f8);border-radius:9px;padding:7px 9px}
.adtip.red{color:#8F2333;background:#FDECEF}
.adact{display:flex;gap:6px;flex-wrap:wrap}
.adact button,.adbtn{flex:1;min-height:34px;border:1px solid var(--line);background:var(--surf);border-radius:9px;font:inherit;font-size:12.5px;font-weight:600;padding:0 10px;cursor:pointer;color:var(--ink)}
.adact button:hover{border-color:var(--acc);color:var(--acc)}
.adact button.red{color:#B3263E}.adact button.red:hover{border-color:#B3263E}
.adbtn.pri{background:var(--acc);border-color:var(--acc);color:#fff}
.adlink{border:0;background:none;color:var(--faint);font:inherit;font-size:11.5px;text-decoration:underline;cursor:pointer;align-self:flex-start;padding:0}
.adform{display:flex;flex-direction:column;gap:8px;background:var(--surf);border:1px solid color-mix(in srgb,var(--acc) 35%,var(--line));border-radius:11px;padding:10px}
.adform.early{border-color:#E9A3B0}
.adfr{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.adbvl .adfr{grid-template-columns:1fr}
.adform label{display:flex;flex-direction:column;gap:3px;font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--faint);text-transform:uppercase}
.adform input[type=date],.adform input[name=why]{height:36px;border:1px solid var(--line);border-radius:8px;padding:0 9px;background:var(--surf);color:var(--ink);font:inherit;font-size:13px;text-transform:none;letter-spacing:0;font-weight:500;min-width:0;box-sizing:border-box;width:100%}
.adform input:disabled{opacity:.45}
.adform .adck{flex-direction:row;align-items:center;gap:7px;text-transform:none;letter-spacing:0;font-size:12.5px;font-weight:600;color:var(--ink)}
.adform .adck input{width:16px;height:16px;accent-color:var(--acc)}
.adfa{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
.adfa button{min-height:34px;border:1px solid var(--line);background:var(--surf);border-radius:9px;padding:0 12px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;color:var(--ink)}
.adfa .pri{background:var(--acc);border-color:var(--acc);color:#fff}.adfa .pri.red{background:#C2334D;border-color:#C2334D}
.adlog{border-top:1px solid var(--line);padding-top:6px}
.adlogt{border:0;background:none;padding:0;font:inherit;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:var(--faint);cursor:pointer;display:flex;align-items:center;gap:6px}
.adlogt::before{content:"▸";transition:transform .15s}.adlog.open .adlogt::before{transform:rotate(90deg)}
.adlg{display:flex;gap:8px;padding:6px 0;font-size:12.5px;border-bottom:1px dashed var(--line)}
.adlg:last-child{border-bottom:0}
.adlg b{font-weight:600}.adlg p{margin:1px 0 0;color:var(--mut)}.adlg span{font-size:11px;color:var(--faint)}
.adnts{display:flex;flex-direction:column;gap:6px}
.adnt{display:flex;gap:8px;font-size:12.5px;line-height:1.4}
.adnt b{font-weight:700}.adnt span{color:var(--faint);font-size:11px}.adnt p{margin:1px 0 0;white-space:pre-wrap;word-break:break-word}
.adnmore{align-self:flex-start;border:0;background:none;color:var(--acc);font:inherit;font-size:12px;font-weight:600;padding:0;cursor:pointer}
.adnadd{display:flex;gap:6px}
.adnadd input{flex:1;min-width:0;height:34px;border:1px solid var(--line);border-radius:9px;padding:0 10px;background:var(--surf);color:var(--ink);font:inherit;font-size:12.5px}
.adnadd button{height:34px;border:0;border-radius:9px;background:var(--acc);color:#fff;padding:0 12px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}
.addnh{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:var(--faint)}
.adbvl{gap:8px!important}
/* the booking card opened from the side panel sits beside it, so another model can be picked */
@media (min-width:760px){body.adbv .bv{right:min(420px,100vw)!important}body.adbv #abdrawer{z-index:2001}}
/* the board */
html[data-theme="dark"] .advis.c4,html[data-theme="dim"] .advis.c4{background:#22314A;color:#9DBDF2}html[data-theme="dark"] .advis.e6,html[data-theme="dim"] .advis.e6{background:#1E3A2B;color:#8FD3AC}
html[data-theme="dark"] .adtip.red,html[data-theme="dim"] .adtip.red,html[data-theme="dark"] .adst.bad,html[data-theme="dim"] .adst.bad,html[data-theme="dark"] .adhc .adhcw button,html[data-theme="dim"] .adhc .adhcw button{background:#3A2026;color:#F3A9B6;border-color:#5A2E37}
html[data-theme="dark"] .adstt.soon,html[data-theme="dim"] .adstt.soon,html[data-theme="dark"] .admv,html[data-theme="dim"] .admv{background:#3B2E14;color:#F0C674}
html[data-theme="dark"] .adstt.here,html[data-theme="dim"] .adstt.here{background:#1E3A2B;color:#8FD3AC}html[data-theme="dark"] .adstt.leave,html[data-theme="dim"] .adstt.leave{background:#3A2026;color:#F3A9B6}
.adpage{padding:0!important}
.adpage[hidden]{display:none!important}
.adbd{display:flex;flex-direction:column;background:var(--paper,#f4f1f6);border:1px solid var(--line);border-radius:14px;overflow:hidden;font-family:var(--sans,Inter,system-ui,sans-serif);color:var(--ink);min-height:560px}
.adbdh{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:12px 16px;border-bottom:1px solid var(--line);background:var(--surf)}
.adbdh h2{margin:0;font-size:19px}
.adbdh .admut{font-size:12.5px}
.adseg{display:inline-flex;background:var(--surf2,#f6f3f8);border:1px solid var(--line);border-radius:10px;padding:3px;gap:2px}
.adseg button{border:0;background:transparent;border-radius:7px;padding:5px 10px;font:inherit;font-size:12.5px;font-weight:600;color:var(--mut);cursor:pointer;white-space:nowrap}
.adseg button[aria-pressed="true"]{background:var(--surf);color:var(--ink);box-shadow:0 1px 3px rgba(20,10,30,.14)}
.adbnav{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600}
.adbnav em{font-style:normal;color:var(--faint);font-weight:500}
.adbdw{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 400px}
.adbleft{display:flex;flex-direction:column;min-height:0;min-width:0}
.adhcbox{padding:12px 12px 0}
.adhctg{height:28px;border:1px solid var(--line);border-radius:999px;background:var(--surf);padding:0 11px;font:inherit;font-size:12px;font-weight:600;color:var(--mut);cursor:pointer;white-space:nowrap}
.adhctg:hover{color:var(--acc);border-color:var(--acc)}
.adhcfold{display:flex;align-items:center;gap:10px;background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:6px 8px 6px 4px}
.adhcfold .adhcm{margin:0;flex:1;flex-direction:row;flex-wrap:wrap;gap:4px 14px;background:none;padding:2px 8px}
.admo.compact{padding:6px 6px 3px}.admo.compact h3{font-size:13px;margin:0 3px 3px}.admo.compact .admwk{font-size:9.5px;padding-bottom:1px}
.admo.compact .addc{font-size:10.5px;padding:1px 3px 0}.admo.compact .addc span{height:14px;min-width:16px}
.admonths{flex:1;overflow:hidden;padding:12px;display:grid;gap:12px;min-height:0}
.admo{background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:8px 8px 4px;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.admo h3{margin:0 4px 6px;font-size:14px;display:flex;align-items:baseline;gap:8px}
.admo h3 span{font-size:11.5px;font-weight:500;color:var(--faint)}
.admwk{display:grid;grid-template-columns:repeat(7,1fr);font-size:10.5px;font-weight:700;color:var(--faint);text-align:center;padding-bottom:3px}
.adwks{flex:1;display:grid;grid-template-rows:repeat(6,minmax(0,1fr));min-height:0}
.adwkr{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));row-gap:2px;column-gap:3px;padding:2px 0;min-height:0;overflow:hidden;height:100%;box-sizing:border-box}
.adwkr.none{visibility:hidden}
.addc{border:1px solid var(--line);background:var(--surf);padding:2px 4px 0;font:inherit;font-size:11.5px;font-weight:500;color:var(--ink);display:flex;align-items:flex-start;justify-content:flex-end;border-radius:6px;cursor:pointer;font-variant-numeric:tabular-nums}
.addc.we{background:color-mix(in srgb,var(--surf2,#f3f0f5) 70%,var(--surf))}
.addc.out{border-color:color-mix(in srgb,var(--line) 50%,transparent);background:none}
.addc.today{border-color:var(--acc)}
.addc.out span{opacity:.3}
.addc span{display:inline-grid;place-items:center;min-width:20px;height:18px;border-radius:999px;padding:0 4px}
.addc.today span{background:var(--acc);color:#fff;font-weight:700}
.addc.sel{box-shadow:inset 0 0 0 2px var(--acc);background:var(--wash,#f4ecf2)}
.addc:hover{background:var(--wash,#f4ecf2)}
.addc s{text-decoration:none;font-size:9px;font-weight:700;color:var(--mut);align-self:flex-end;margin:0 2px 2px auto}
.adbar{position:relative;z-index:1;border:0;align-self:stretch;margin:0 -1px;padding:0 6px;background:var(--c);color:#fff;font:inherit;font-size:9px;line-height:12px;font-weight:700;display:flex;align-items:center;gap:3px;white-space:nowrap;overflow:hidden;text-align:left;transition:opacity .15s;cursor:pointer;min-height:0}
.adbar span{overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}
.adbar{margin:0 -2px}.adbar.s{border-top-left-radius:7px;border-bottom-left-radius:7px;margin-left:4px}
.adbar.e{border-top-right-radius:7px;border-bottom-right-radius:7px;margin-right:4px}
.adbar .pl,.adbar .ot{font-style:normal}.adbar .ot{font-size:7.5px;letter-spacing:.06em;opacity:.85}
.adbar.dim{opacity:.18}
.adbar.on{box-shadow:0 0 0 2px var(--surf),0 0 0 4px var(--c);z-index:2}
.adbar.thin{font-size:0;padding:0}.adbar.thin .pl,.adbar.thin .ot{display:none}
.adbar.tbd.e{background:linear-gradient(90deg,var(--c) 0 35%,color-mix(in srgb,var(--c) 25%,transparent));border-radius:0;margin-right:0}
.adbar.ghost{background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--c) 30%,transparent) 0 4px,color-mix(in srgb,var(--c) 12%,transparent) 4px 8px);color:var(--c);cursor:default}
.addet{overflow:auto;border-left:1px solid var(--line);background:var(--surf);padding:2px 6px 30px}
.addet .adrows{padding:0}
.adsx{border:1px solid color-mix(in srgb,var(--acc) 35%,transparent);border-radius:13px;background:var(--wash,#f4ecf2)}
.adsx .adrow{border:0;background:none}
.adsxb{padding:0 10px 10px;display:flex;flex-direction:column;gap:8px}
.adsxb .addst{background:var(--surf)}
/* headcount */
.adhc{background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:10px 12px 8px;display:flex;flex-direction:column;gap:8px}
.adhch{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;font-size:12px}
.adhch>b{font-size:14px}
.adhcr{display:inline-flex;align-items:center;gap:6px}
.adhcr input{height:30px;border:1px solid var(--line);border-radius:8px;padding:0 7px;background:var(--surf);color:var(--ink);font:inherit;font-size:12.5px}
.adhct{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--mut)}
.adhct b{min-width:22px;text-align:center;font-size:15px;color:var(--ink)}
.adhct button{width:28px;height:28px;border-radius:50%;border:1px solid var(--line);background:var(--surf);font-size:15px;line-height:1;display:grid;place-items:center;cursor:pointer;color:var(--ink);padding:0}
.adsts{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
.adst{background:var(--surf2,#f6f3f8);border-radius:10px;padding:6px 9px;display:flex;flex-direction:column;min-width:0}
.adst span{font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.adst b{font-size:20px;line-height:1.2;font-variant-numeric:tabular-nums}
.adst em{font-style:normal;font-size:11px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.adst.bad{background:#FDECEF}.adst.bad b,.adst.bad em{color:#B3263E}.adst.good em{color:#1F7A44}
.adhcc{position:relative;height:74px;display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:1px;align-items:end;padding-bottom:14px}
.adhcd{position:relative;height:100%;border:0;background:none;padding:0;display:flex;flex-direction:column-reverse;align-items:stretch;border-radius:2px;cursor:pointer}
.adhcd:hover{background:var(--surf2,#f3f0f5)}
.adhcd .hf{display:block;background:color-mix(in srgb,var(--acc) 70%,transparent);border-radius:2px 2px 0 0}
.adhcd .hs{display:block;background:color-mix(in srgb,var(--acc) 28%,transparent)}
.adhcd.low .hf{background:#E0586F}.adhcd.low .hs{background:#F2A9B6}
.adhcd.today{box-shadow:inset 0 -2px 0 var(--acc)}
.adhcd.sel{background:var(--wash,#f4ecf2);outline:1.5px solid var(--acc)}
.adhcd.m1{box-shadow:-1px 0 0 var(--line)}
.adhcd s{position:absolute;left:50%;bottom:-14px;transform:translateX(-50%);text-decoration:none;font-size:9px;color:var(--faint);white-space:nowrap}
.adhcl{position:absolute;left:0;right:0;height:0;border-top:1.5px dashed #E0586F;z-index:2;pointer-events:none;margin-bottom:14px}
.adhcl span{position:absolute;right:0;top:-15px;font-size:9.5px;font-weight:700;color:#C2334D;background:var(--surf);padding:0 3px}
.adhc .adhcw{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#B3263E;padding:0}
.adhc .adhcw button{height:26px;border:1px solid #F0B7C1;background:#FDECEF;color:#B3263E;border-radius:999px;padding:0 9px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer}
.adhc .adhcw span{font-weight:600;color:var(--faint)}
.adhcn{margin:0;font-size:11px;color:var(--faint);display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.adhcn i{display:inline-block;width:10px;height:10px;border-radius:2px}.adhcn .hf{background:color-mix(in srgb,var(--acc) 70%,transparent)}.adhcn .hs{background:color-mix(in srgb,var(--acc) 28%,transparent);margin-left:8px}
@media (max-width:1150px){.adbdw{grid-template-columns:minmax(0,1fr) 360px}.adsts{grid-template-columns:repeat(3,minmax(0,1fr))}}
/* phone */
@media (max-width:760px){
  .adbd{height:auto!important;border-radius:0;border-left:0;border-right:0}
  .adbdw{display:block}
  .admonths{overflow:visible;padding:10px;display:flex!important;flex-direction:column}
  .admo{overflow:visible}.adwks{display:block}.adwkr{min-height:40px}
  .addet{border-left:0;overflow:visible}
  .adbdh{padding:10px 12px}.adbdh h2{font-size:17px}.adbnav{width:100%;justify-content:space-between}
  .admseg [data-admn="9"],.admseg [data-admn="fit"]{display:none}
  .adsts{grid-template-columns:repeat(2,minmax(0,1fr))}
  .adhch .adseg{max-width:100%;overflow-x:auto;scrollbar-width:none}.adhch .adseg::-webkit-scrollbar{display:none}
  .adhcc{overflow-x:auto;grid-template-columns:repeat(var(--n),9px);height:84px}
  .adhct{width:100%}
  .adbar span{font-size:9.5px}.adbar .ot{display:none}
  .adfr{grid-template-columns:1fr}
  .adform input[type=date],.adform input[name=why],.adnadd input{height:42px;font-size:16px}
  .adact button,.adfa button,.adnadd button{min-height:40px}
  .adrow{grid-template-columns:46px minmax(0,1fr) auto;gap:9px}.adthumb{width:46px;height:60px}
  .add{height:42px}
}
/* ===== the board, 1.2.111 ===== */
.adbd{--ga:#1F8A55;--gas:#E6F5EC;--gd:#C2334D;--gds:#FCE9ED;--gp:#5B48C9;--gps:#EEEBFB}
html[data-theme="dark"] .adbd,html[data-theme="dim"] .adbd{--ga:#6FD39C;--gas:#1C3A2A;--gd:#F28B9E;--gds:#3D2128;--gp:#B2A6FF;--gps:#2B2647}
.adbdh .adcrumbs{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--mut);flex-wrap:wrap}
.adcrumbs button{border:0;background:none;padding:2px 4px;border-radius:6px;color:var(--acc);font:inherit;font-weight:600;cursor:pointer}
.adcrumbs button:hover{background:var(--wash,#f4ecf2)}.adcrumbs b{color:var(--ink)}
.adpill{height:32px;border:1px solid var(--line);border-radius:999px;background:var(--surf);padding:0 12px;font:inherit;font-size:12.5px;font-weight:600;white-space:nowrap;cursor:pointer;color:var(--ink)}
.adpill.pri{background:var(--acc);border-color:var(--acc);color:#fff}
.adtiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:12px 16px}
.adtile{background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:4px;min-width:0;text-align:left;font:inherit;color:var(--ink)}
button.adtile{cursor:pointer}button.adtile:hover{border-color:color-mix(in srgb,var(--acc) 40%,var(--line))}
.adtk{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.adtk i{width:9px;height:9px;border-radius:50%;flex:none}
.adtv{display:flex;align-items:baseline;gap:7px}.adtv b{font-size:26px;line-height:1.1;font-variant-numeric:tabular-nums}.adtv span{font-size:12.5px;color:var(--mut)}
.adtn{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.adtn em{font-style:normal;font-weight:700}.adtn u{text-decoration:none;color:var(--mut)}
.adcd{display:inline-block;font-variant-numeric:tabular-nums;font-weight:800;padding:1px 7px;border-radius:999px;font-size:12px;background:var(--wash,#f4ecf2);color:var(--acc)}
.adtile.arr .adcd,.adflc.a .adcd{background:var(--gas);color:var(--ga)}.adtile.dep .adcd,.adflc.d .adcd{background:var(--gds);color:var(--gd)}
.adchg{display:flex;flex-direction:column;gap:4px;margin-top:2px}
.adchg>div{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:8px;align-items:center}
.adchg i{font-style:normal;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:10px}
.adchg .a i{background:var(--gas);color:var(--ga)}.adchg .d i{background:var(--gds);color:var(--gd)}
.adchg>div>span{font-size:12px;min-width:0;line-height:1.25}.adchg em{font-style:normal;font-weight:700}
.adchg>div>span small{display:block;font-size:10.5px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.adchg .adcdp{font-variant-numeric:tabular-nums}
.adchg>div>b{font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;text-align:right;line-height:1}.adchg>div>b small{display:block;font-size:9.5px;font-weight:600;color:var(--faint)}
.adchg .a>b{color:var(--ga)}.adchg .d>b{color:var(--gd)}
.adbdw{border-top:1px solid var(--line)}
.adbmain{min-height:0;overflow:auto;padding:12px 16px 20px}
.adbmain.v-ov.h-tl{display:flex;flex-direction:column}
.adhint{font-size:12px;color:var(--faint);margin:0 0 10px;display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center}
.adhint span{display:inline-flex;align-items:center;gap:5px}.adhint i{width:8px;height:8px;border-radius:50%}.adhint s{width:16px;height:4px;border-radius:2px;background:var(--acc);text-decoration:none;display:inline-block}
/* 3 x 3 */
.adov{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.admini{background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:8px 8px 6px;text-align:left;display:flex;flex-direction:column;gap:4px;font:inherit;color:var(--ink);cursor:pointer;transition:border-color .15s,box-shadow .15s}
.admini:hover{border-color:color-mix(in srgb,var(--acc) 45%,var(--line));box-shadow:0 6px 20px -12px rgba(40,10,50,.35)}
.admini h3{margin:0 2px 2px;font-size:13.5px;display:flex;align-items:baseline;gap:8px}
.admini h3>span{font-size:11px;font-weight:600;color:var(--faint);margin-left:auto}.admini h3 .a{color:var(--ga)}.admini h3 .d{color:var(--gd)}.admini h3 .m{color:var(--ink)}
.adtot{font-size:12.5px;color:var(--mut);background:var(--surf2,#f1eff6);border:1px solid var(--line);border-radius:999px;padding:3px 11px;white-space:nowrap}.adtot b{color:var(--ink);font-weight:700}.adtot b.a{color:var(--ga)}.adtot b.d{color:var(--gd)}
.admwh{display:grid;grid-template-columns:repeat(7,1fr);font-size:9.5px;font-weight:700;color:var(--faint);text-align:center}
.admwh span:first-child{color:#D0453F}.admwh span:last-child{color:#3A6FD1}
.admg{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.admc{position:relative;height:34px;border:1px solid var(--line);border-radius:6px;background:var(--surf);padding:2px 4px;display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;font-size:11px;font-variant-numeric:tabular-nums}
.admc.o{opacity:.35;border-style:dashed}.admc.t{border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)}.admc.t b{color:var(--acc)}
.admc b{font-weight:600}.admc.sat b{color:#3A6FD1}.admc.sun b{color:#D0453F}
.admc .ln{display:flex;gap:2px;width:100%}.admc .ln i{height:4px;flex:1;border-radius:2px;background:var(--c)}
.admc .dt{position:absolute;left:3px;top:3px;display:flex;gap:2px}.admc .dt i{width:6px;height:6px;border-radius:50%}
.admc .dt .a{background:var(--ga)}.admc .dt .d{background:var(--gd)}.admc .dt .p{background:var(--gp)}
.admc.band{background:color-mix(in srgb,var(--c) 18%,var(--surf));border-color:color-mix(in srgb,var(--c) 40%,var(--line))}
/* one month */
.admview{display:flex;flex-direction:column;gap:6px;min-height:100%}
.admvh{display:grid;grid-template-columns:repeat(7,1fr);font-size:11.5px;font-weight:700;color:var(--faint);padding:0 2px}
.admvh span:first-child{color:#D0453F}.admvh span:last-child{color:#3A6FD1}
.admvg{flex:1;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-auto-rows:minmax(112px,1fr);gap:4px}
.addc2{border:1px solid var(--line);border-radius:10px;background:var(--surf);padding:6px 6px 5px;display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch;gap:3px;text-align:left;min-width:0;overflow:hidden;cursor:pointer;font:inherit;color:var(--ink)}
.addc2:hover{border-color:color-mix(in srgb,var(--acc) 45%,var(--line))}
.addc2.o{opacity:.4}.addc2.t{border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)}
.addc2 .top{display:flex;align-items:center;gap:6px}
.addc2 .top b{font-size:13px;font-weight:700;min-width:22px;height:22px;border-radius:999px;display:inline-grid;place-items:center;padding:0 5px}
.addc2.t .top b{background:var(--acc);color:#fff}.addc2.sat .top b{color:#3A6FD1}.addc2.sun .top b{color:#D0453F}.addc2.t.sat .top b,.addc2.t.sun .top b{color:#fff}
.addc2 .top .wd{display:none;font-style:normal;font-size:11.5px;color:var(--mut);font-weight:600}
.addc2 .top small{margin-left:auto;font-size:10.5px;color:var(--faint);font-weight:600;white-space:nowrap}
.addc2.band{background:color-mix(in srgb,var(--c) 12%,var(--surf));border-color:color-mix(in srgb,var(--c) 45%,var(--line))}
.adev{display:flex;align-items:center;gap:4px;font-size:11px;line-height:1.25;border-radius:6px;padding:2px 5px;white-space:nowrap;overflow:hidden;min-width:0}
.adev span{overflow:hidden;text-overflow:ellipsis;min-width:0}.adev b{font-weight:800;font-variant-numeric:tabular-nums;flex:none}
.adev i{flex:none;font-style:normal;font-size:10px}.adev u{text-decoration:none;opacity:.8;flex:none}
.adev.a{background:var(--gas);color:var(--ga)}.adev.d{background:var(--gds);color:var(--gd)}.adev.p{background:var(--gps);color:var(--gp)}
.admore{font-size:10.5px;font-weight:700;color:var(--mut);padding:0 4px}
.adlegend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11.5px;color:var(--mut);padding:2px 2px 0}
.adlegend span{display:inline-flex;align-items:center;gap:5px}.adlegend i{width:10px;height:10px;border-radius:3px}
.adlegend .a{background:var(--gas);box-shadow:inset 0 0 0 1px var(--ga)}.adlegend .d{background:var(--gds);box-shadow:inset 0 0 0 1px var(--gd)}.adlegend .p{background:var(--gps);box-shadow:inset 0 0 0 1px var(--gp)}
/* one day */
.addv{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:14px;align-items:start}
.adcard{background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:12px}
.adcard h4{margin:0 0 10px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);display:flex;align-items:center;gap:8px}
.adcard h4 button{text-transform:none;letter-spacing:0}
.adsched{display:flex;flex-direction:column;gap:8px}
.adit{display:grid;grid-template-columns:84px minmax(0,1fr) auto;gap:10px;align-items:start;border:1px solid var(--line);border-radius:12px;padding:9px 10px;position:relative}
.adit::before{content:"";position:absolute;left:-1px;top:10px;bottom:10px;width:3px;border-radius:2px}
.adit.a::before{background:var(--ga)}.adit.d::before{background:var(--gd)}.adit.p::before{background:var(--gp)}
.adit .tm{font-size:17px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.1}
.adit .tm small{display:block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-top:3px;color:var(--mut)}
.adit.a .tm small{color:var(--ga)}.adit.d .tm small{color:var(--gd)}.adit.p .tm small{color:var(--gp)}
.adit .bd{min-width:0;display:flex;flex-direction:column;gap:3px}.adit .bd b{font-size:14px}.adit .bd>span{font-size:12.5px;color:var(--mut)}
.adit .bd .fl{color:var(--ink)}.adit .bd .warn{color:#B26A00}.adit .bd .by{font-size:11px;color:var(--faint)}
.adit .who{display:flex;align-items:center;gap:7px;font-size:12.5px}.adit .who .adthumb,.adtw .adthumb{width:34px;height:44px;border-radius:7px}
.adit .acts{display:flex;gap:4px}
.adit .acts button{height:28px;border:1px solid var(--line);background:var(--surf);border-radius:8px;padding:0 9px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;color:var(--ink)}
.adit .acts button.sure{background:#C2334D;border-color:#C2334D;color:#fff}
.adtown{display:flex;flex-direction:column;gap:4px}
.adtw{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:9px;align-items:center;border:0;background:none;text-align:left;padding:5px;border-radius:10px;width:100%;font:inherit;color:var(--ink);cursor:pointer}
.adtw:hover{background:var(--surf2,#f6f3f8)}.adtw .nm{font-weight:700;font-size:13px}.adtw .sm{font-size:11.5px;color:var(--mut)}
.adtw .ga{color:var(--ga)}.adtw .gd{color:var(--gd)}
.adaf{display:grid;grid-template-columns:110px 110px minmax(0,1fr);gap:8px;border:1px solid color-mix(in srgb,var(--gp) 40%,var(--line));border-radius:12px;padding:10px;margin-bottom:10px}
.adaf label,.adff label{display:flex;flex-direction:column;gap:3px;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}
.adaf input,.adaf select,.adaf textarea,.adff input,.adff select{height:36px;border:1px solid var(--line);border-radius:8px;padding:0 9px;background:var(--surf);color:var(--ink);font:inherit;font-size:13px;text-transform:none;letter-spacing:0;font-weight:500;min-width:0;width:100%}
.adaf textarea{height:56px;padding:7px 9px;resize:vertical}
.adaf .w2{grid-column:span 2}.adaf .w3,.adaf .adfa{grid-column:1/-1}
/* the side bar additions */
.adfl2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.adflc{background:var(--surf);border:1px solid var(--line);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:2px;min-width:0}
.adflc>span:first-child{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.adflc.a>span:first-child{color:var(--ga)}.adflc.d>span:first-child{color:var(--gd)}
.adflc b{font-size:13.5px;font-variant-numeric:tabular-nums}.adflc em{font-style:normal;font-size:11.5px;color:var(--mut);line-height:1.35}
.adflc .adcd{align-self:flex-start;margin-top:2px}
.adfled{height:30px;border:1px solid var(--line);background:var(--surf);border-radius:8px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;color:var(--ink)}
.adff{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:var(--surf);border:1px solid var(--line);border-radius:10px;padding:8px}
.adff h5{grid-column:1/-1;margin:2px 0 0;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase}
.adff h5.a{color:var(--ga)}.adff h5.d{color:var(--gd)}.adff input,.adff select{height:32px;font-size:12.5px}.adff .adfa{grid-column:1/-1}
.adgbox{background:var(--surf);border:1px solid var(--line);border-left:3px solid var(--line);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:3px;font-size:12.5px}
.adgbox.net{border-left-color:#8A4C86}.adgbox.cond{border-left-color:#C98A1E}
.adgk{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.adgbox>b{font-size:13.5px}.adgbox>span:not(.adgk){color:var(--mut)}
.adgbox ul{margin:2px 0 0;padding-left:16px;color:var(--mut);display:flex;flex-direction:column;gap:2px}.adgbox ul b{color:var(--ink)}
.admid .admx{display:flex;flex-wrap:nowrap;gap:4px;white-space:nowrap;overflow:hidden;min-width:0;align-items:center}
.admx .advis{flex:none;margin-right:0}
.adg{display:inline-block;min-width:0;height:18px;line-height:18px;padding:0 6px;border-radius:5px;font-size:10px;font-weight:800;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.adg.net{background:#F3EAF2;color:#5A2C57}.adg.cond{background:#FFF2DC;color:#9A5B00}.adg.no{background:var(--surf2,#f6f3f8);color:var(--mut)}.adg.unset{background:transparent;color:var(--faint);border:1px dashed var(--line);line-height:16px}
html[data-theme="dark"] .adg.net,html[data-theme="dim"] .adg.net{background:#33263A;color:#E2C2DE}html[data-theme="dark"] .adg.cond,html[data-theme="dim"] .adg.cond{background:#3B2E14;color:#F0B35A}
/* moving sign: only labels that do not fit; they keep moving */
.adg.mq{text-overflow:clip;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 6px,#000 calc(100% - 10px),transparent);mask-image:linear-gradient(90deg,transparent 0,#000 6px,#000 calc(100% - 10px),transparent)}
.adg.mq .admq{display:inline-flex;gap:var(--gap);animation:admq var(--dur) linear infinite;animation-delay:1.2s}
@keyframes admq{from{transform:translateX(0)}to{transform:translateX(calc(-1 * var(--shift)))}}
.adnx{font-size:12px;color:var(--mut)}.adnx b{color:var(--ink)}.adnx.a{color:#1F8A55}.adnx.d{color:#C2334D}
/* timeline */
.adtlbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin:0 0 10px}.adtlbar .adhint{margin:0}
.adtlw{background:var(--surf);border:1px solid var(--line);border-radius:14px;overflow:auto;position:relative;flex:1;min-height:0}
.adtl{--nw:190px;position:relative;width:calc(var(--nw) + var(--dw) * var(--days));min-width:100%}
.adtlh,.adtlr,.adtlc{display:flex;position:relative}
.adtlh{position:sticky;top:0;z-index:3;background:var(--surf);border-bottom:1px solid var(--line)}
.adtlh .adtln,.adtlr .adtln,.adtlc .adtln{position:sticky;left:0;z-index:2;width:var(--nw);flex:none;background:var(--surf);border-right:1px solid var(--line)}
.adtlh .adtln{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);display:flex;align-items:flex-end;padding:0 10px 6px}
.adtlt{position:relative;flex:none;width:calc(var(--dw) * var(--days))}
.adtlmo{height:22px;position:relative}
.adtlmo span{position:absolute;top:0;height:22px;padding:4px 6px 0;font-size:11.5px;font-weight:700;border-left:1px solid var(--line);white-space:nowrap;overflow:hidden}
.adtlwk{display:none;height:20px;position:relative}.adtl.dense .adtlwk{display:block}
.adtlwk span{position:absolute;top:0;height:20px;border-left:1px solid var(--line);font-size:10.5px;font-weight:700;display:flex;align-items:center;justify-content:center;white-space:nowrap;overflow:hidden;font-variant-numeric:tabular-nums}
.adtlwk span.now{color:var(--acc)}
.adtldy{height:32px;position:relative}
.adtldy button{position:absolute;top:0;height:32px;width:var(--dw);border:0;background:none;padding:0;font:inherit;font-size:10.5px;color:var(--mut);font-variant-numeric:tabular-nums;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;cursor:pointer}
.adtldy button small{font-size:8.5px;color:var(--faint)}.adtldy small.w1{display:none}
.adtl:not(.wide) .adtldy small.w3{display:none}.adtl:not(.wide) .adtldy small.w1{display:block}
.adtldy button.sat,.adtldy button.sun{background:color-mix(in srgb,var(--surf2,#f6f3f8) 80%,transparent)}
.adtldy button.sat{color:#3A6FD1}.adtldy button.sun{color:#D0453F}
.adtldy button.t{color:#fff}.adtldy button.t::before{content:"";position:absolute;inset:2px 1px;border-radius:6px;background:var(--acc);z-index:-1}
.adtldy button:hover{background:var(--surf2,#f6f3f8)}
.adtl.dense .adtldy,.adtl.dense .adtldy button{height:18px}
.adtl.dense .adtldy small.w1{font-size:9px;font-weight:700}.adtl.dense .adtldy .dn{display:none}
.adtl.dense .adtldy button.wk0{box-shadow:inset 1px 0 0 var(--line)}
.adtlr{border-bottom:1px solid var(--line);min-height:46px}
.adtlr .adtln{display:flex;align-items:center;gap:8px;padding:5px 8px;border:0;border-right:1px solid var(--line);text-align:left;cursor:pointer;font:inherit;color:var(--ink)}
.adtlr .adtln:hover{background:var(--surf2,#f6f3f8)}
.adtlr .adtln .adthumb{width:28px;height:36px;border-radius:6px}.adtlr .adtln .adthumb i{font-size:13px}
.adtlr .adtln b{display:block;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.adtlr .adtln small{display:block;font-size:11px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.adtlr .adtln>span:last-child{min-width:0}
.adtlr.on,.adtlr.on .adtln{background:var(--wash,#f4ecf2)}
.adtlt.grid{background-image:repeating-linear-gradient(to right,transparent 0 calc(var(--dw) - 1px),color-mix(in srgb,var(--line) 70%,transparent) calc(var(--dw) - 1px) var(--dw))}
.adtl.dense .adtlt.grid{background-image:none}
.adtlm{position:absolute;top:0;bottom:0;width:1px;background:var(--line);pointer-events:none}
.adtlnow{position:absolute;top:0;bottom:0;width:2px;background:var(--acc);z-index:1;pointer-events:none;opacity:.8}
.adtlb{position:absolute;top:8px;height:30px;border-radius:8px;border:1px solid color-mix(in srgb,var(--c) 55%,transparent);background:color-mix(in srgb,var(--c) 20%,var(--surf));display:flex;align-items:center;gap:6px;padding:0 6px;font:inherit;font-size:11.5px;white-space:nowrap;overflow:hidden;cursor:pointer;color:var(--ink);text-align:left}
.adtlb:hover{background:color-mix(in srgb,var(--c) 30%,var(--surf))}
.adtlb.cl{border-top-left-radius:0;border-bottom-left-radius:0;border-left-style:dashed}
.adtlb.cr,.adtlb.tbd{border-top-right-radius:0;border-bottom-right-radius:0;border-right-style:dashed}
.adtlb .fa,.adtlb .fd{font-weight:800;font-variant-numeric:tabular-nums;font-size:11px;padding:1px 5px;border-radius:5px;flex:none}
.adtlb .fa{background:var(--gas);color:var(--ga)}.adtlb .fd{background:var(--gds);color:var(--gd);margin-left:auto}
.adtlb b{font-weight:700}.adtlb em{font-style:normal;color:var(--mut)}.adtlb em.r{margin-left:auto}
.adtlp{position:absolute;bottom:3px;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:var(--gp);border:1.5px solid var(--surf);z-index:1}
.adtlc{border-top:1px solid var(--line);background:var(--surf2,#f6f3f8);height:30px}
.adtlc .adtln{background:var(--surf2,#f6f3f8);font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);display:flex;align-items:center;padding:0 10px}
.adtlc .adtlt span{position:absolute;top:0;height:30px;width:var(--dw);display:grid;place-items:center;font-size:11px;font-weight:700;font-variant-numeric:tabular-nums}
.adtl.dense .adtlc .adtlt span{font-size:0}
.adtlc .adtlt i{position:absolute;bottom:0;width:var(--dw);background:color-mix(in srgb,var(--acc) 30%,transparent)}
@media (max-width:1150px){.adtiles{grid-template-columns:repeat(2,minmax(0,1fr))}.adov{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:760px){
  .adtiles{padding:10px;gap:8px}.adtile:first-child,.adtile.nxt{grid-column:1/-1}.adtv b{font-size:22px}.adtn{white-space:normal;line-height:1.4}
  .adbmain{overflow:visible;padding:10px}
  .adov{grid-template-columns:1fr}
  .admvh{display:none}.admvg{display:flex;flex-direction:column;gap:6px}
  .addc2.o,.addc2.noev{display:none}.addc2 .top .wd{display:inline}.adev{flex:1 1 auto}
  .addv{grid-template-columns:1fr}
  .adaf{grid-template-columns:1fr 1fr}.adaf .w,.adaf .w2,.adaf .w3{grid-column:1/-1}
  .adaf input,.adaf select,.adaf textarea,.adff input,.adff select{height:42px;font-size:16px}
  .adfl2{grid-template-columns:1fr}
  .adtl{--nw:112px}.adtlr .adtln .adthumb{display:none}.adtlw{max-height:70vh}
  .adbdh .adseg{order:3}
}
/* 1.2.112: the 3 x 3 fits the page (no scrolling), the small months fill their boxes */
.adtiles{padding:10px 16px;gap:10px}
.adtile{padding:8px 12px;gap:2px}.adtv b{font-size:22px}
.adchg{gap:3px;margin-top:3px}.adchg>div{grid-template-columns:18px minmax(0,1fr) auto;gap:7px}
.adchg i{width:18px;height:18px}
.adchg>div>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:18px}
.adchg>div>span small{display:inline;font-size:11px}
.adchg>div>b{font-size:14px;line-height:18px;white-space:nowrap}.adchg>div>b small{display:inline;font-size:10px}
.adbmain.v-ov.h-cal{display:flex;flex-direction:column;padding-top:8px;padding-bottom:12px}
.adbmain.v-ov.h-cal .adhint{margin-bottom:6px}
.adbmain.v-ov.h-cal .adov{flex:1;min-height:0;grid-template-rows:repeat(3,minmax(112px,1fr));gap:10px}
.admini{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;min-height:0;overflow:hidden;width:100%;padding:6px 8px 6px}
.admini>h3,.admini>.admwh,.admini>.admg{width:100%;box-sizing:border-box}
.admini h3{margin:0 0 1px;font-size:13px}
.admg{flex:1;min-height:0;grid-template-rows:repeat(6,minmax(0,1fr));gap:2px}
.admc{height:auto;min-height:0;padding:1px 4px;font-size:10.5px;overflow:hidden}
.admc .ln i{height:3px}
.addc2{width:100%}.addc2>.top{width:100%}
.admvg{grid-auto-rows:minmax(64px,1fr)}
@media (max-width:760px){.adbmain.v-ov.h-cal .adov{grid-template-rows:none}.admc{height:34px}.admg{grid-template-rows:none}}

.adhleg{margin:0;font-size:11.5px;gap:3px 12px;flex:1 1 0;min-width:0;flex-wrap:nowrap;overflow:hidden;white-space:nowrap}
.adbmain.v-ov.h-cal{padding-top:10px;padding-bottom:10px}
/* short screens: the small months lose their boxes, the dates and lines stay readable */
.adov.tight .admini{padding:5px 8px 5px}.adov.tight .admini h3{font-size:12.5px;margin:0}
.adov.tight .admwh{font-size:9px;line-height:11px}
.adov.tight .admg{gap:0 2px}
.adov.tight .admc{border:0;background:none;border-radius:4px;padding:0 3px;flex-direction:row;align-items:center;justify-content:flex-end;position:relative}
.adov.tight .admc b{font-size:10.5px;line-height:1;position:relative;z-index:1}
.adov.tight .admc .ln{position:absolute;left:2px;right:2px;bottom:0;gap:1px}.adov.tight .admc .ln i{height:2px}
.adov.tight .admc .dt{top:50%;transform:translateY(-50%);left:2px}.adov.tight .admc .dt i{width:5px;height:5px}
.adov.tight .admc.t{box-shadow:inset 0 0 0 1.5px var(--acc)}
.adov.tight .admc.o{opacity:.3}
.adov.tight .admc.band{background:color-mix(in srgb,var(--c) 22%,transparent)}
`;
  document.head.appendChild(css);

  panelMount(); mountBoard(); hook(); watchBv(); listenAppt();
  [800, 2500, 6000].forEach(t => setTimeout(render, t));
})();
