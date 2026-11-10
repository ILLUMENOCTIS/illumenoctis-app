/* ==================== Data Analytics — one-page dashboard (1.2.102) ====================
   User, 7 Nov 2026: analytics about the agencies and the models, by Day, Week, Month or Year;
   on ONE full page, straightforward, with filters on the side to save space, easy to move
   around in, and usable on a phone (filters fold into a button, cards stack). Pie charts, a
   height histogram (women / men, selected or booked models) and a world map of where the
   selected / booked models are (by the agency's country), like the sales-dashboard example.
   What it shows:
   - tiles: selected by me, selected by the team, approved, cancelled, booked, agencies reviewed;
   - trend over time (selected / approved / cancelled / booked);
   - world map: models per country (selected or booked, women / men by the Sex filter);
   - pies: women / men, vote outcome, region;
   - histogram: heights, women and men;
   - by person; agencies reviewed the most; and a tabbed table: who selected which model
     (with measurements and averages) · when models were booked · measurement summary.
   Sources (read only): illu-vote.js (favourites, votes), BOOK + bkFacts, the work log
   (allRows(), agencies opened in the Directory), keyInfo / litFacts, the Atlas map data. */
(function(){
  if(typeof setView !== 'function') return;
  const isKO = () => typeof LANG !== 'undefined' && LANG === 'ko';
  const L = (en, ko) => isKO() ? ko : en;
  const H = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  const LSK = 'illu.ana3';
  const ls = {get(){ try{ return JSON.parse(localStorage.getItem(LSK) || '{}') || {}; }catch(e){ return {}; } },
              set(v){ try{ localStorage.setItem(LSK, JSON.stringify(v)); }catch(e){} }};
  try{ if(typeof KO !== 'undefined') Object.assign(KO, {'Data Analytics': '데이터 분석'}); }catch(e){}

  /* ---------- the tab: menu button and pane ---------- */
  const views = document.querySelector('.views') || document.getElementById('views');
  const ref = document.getElementById('v-404');
  const btn = document.createElement('button');
  btn.id = 'v-ana'; btn.setAttribute('role', 'tab'); btn.setAttribute('aria-selected', 'false');
  btn.innerHTML = 'Data Analytics<span class="vn" id="vn-ana"></span>';
  if(views) views.insertBefore(btn, ref || null);
  const col = document.querySelector('.shell > .side + *') || document.querySelector('.shell > :nth-child(2)');
  const pane = document.createElement('div');
  pane.className = 'pane'; pane.id = 'pane-ana'; pane.hidden = true;
  pane.innerHTML = '<div class="ad" id="ana"></div>';
  const lastPane = document.getElementById('pane-atl') || document.getElementById('pane-cmp');
  if(lastPane && lastPane.parentNode) lastPane.parentNode.insertBefore(pane, lastPane.nextSibling); else if(col) col.appendChild(pane);
  const root = pane.querySelector('#ana');
  btn.addEventListener('click', () => setView('ana'));
  const sv0 = setView;
  setView = function(v){
    const r = sv0.apply(this, arguments);
    const on = v === 'ana';
    pane.hidden = !on; btn.setAttribute('aria-selected', String(on));
    if(on){ try{ paintTabBtn('ana'); }catch(e){} draw(); }
    return r;
  };
  window.setView = setView;

  /* ---------- filters ---------- */
  const S0 = ls.get();
  const F = {gran: S0.gran || 'm', who: S0.who || 'all', sex: S0.sex || 'all', set: S0.set || 'sel', region: S0.region || 'all', tab: S0.tab || 'models', fopen: false};
  const save = () => ls.set({gran: F.gran, who: F.who, sex: F.sex, set: F.set, region: F.region, tab: F.tab});

  /* ---------- time ---------- */
  const pad = n => String(n).padStart(2, '0');
  const dstr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const toDate = v => { if(!v) return null; if(/^\d{4}-\d\d-\d\d$/.test(v)) return new Date(v + 'T12:00:00'); const d = new Date(v); return isNaN(d) ? null : d; };
  const monday = d => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  function bucketOf(d){
    if(!d) return '';
    if(F.gran === 'd') return dstr(d);
    if(F.gran === 'w') return dstr(monday(d));
    if(F.gran === 'm') return d.getFullYear() + '-' + pad(d.getMonth() + 1);
    return String(d.getFullYear());
  }
  function buckets(){
    const now = new Date(), out = [];
    if(F.gran === 'd'){ for(let i = 29; i >= 0; i--){ const d = new Date(now); d.setDate(d.getDate() - i); out.push(dstr(d)); } }
    else if(F.gran === 'w'){ const m = monday(now); for(let i = 11; i >= 0; i--){ const d = new Date(m); d.setDate(d.getDate() - 7 * i); out.push(dstr(d)); } }
    else if(F.gran === 'm'){ for(let i = 11; i >= 0; i--){ const d = new Date(now.getFullYear(), now.getMonth() - i, 15); out.push(d.getFullYear() + '-' + pad(d.getMonth() + 1)); } }
    else { for(let y = now.getFullYear() - 4; y <= now.getFullYear(); y++) out.push(String(y)); }
    return out;
  }
  function bucketLabel(b){
    try{
      const loc = isKO() ? 'ko-KR' : 'en-GB';
      if(F.gran === 'd') return new Date(b + 'T12:00:00').toLocaleDateString(loc, {day: 'numeric', month: 'short'});
      if(F.gran === 'w') return new Date(b + 'T12:00:00').toLocaleDateString(loc, {day: 'numeric', month: 'short'});
      if(F.gran === 'm') return new Date(b + '-15T12:00:00').toLocaleDateString(loc, {month: 'short'});
    }catch(e){}
    return b;
  }
  const PERIODL = () => ({d: L('Last 30 days', '최근 30일'), w: L('Last 12 weeks', '최근 12주'), m: L('Last 12 months', '최근 12개월'), y: L('Last 5 years', '최근 5년')}[F.gran]);

  /* ---------- the map data (the Atlas's own world shapes) ---------- */
  let GEO = null;
  function geo(){
    if(GEO) return GEO;
    GEO = {ok: false, paths: [], byName: new Map(), region: new Map()};
    try{
      const lib = window.ATLASLIB || (typeof ATLASLIB !== 'undefined' ? ATLASLIB : null);
      const el = document.getElementById('atltopo2') || document.getElementById('atltopo'), ct = document.getElementById('atlctab');
      if(!lib || !el || !ct) return GEO;
      const topo = JSON.parse(el.textContent), ctab = JSON.parse(ct.textContent);
      const fc = lib.feature(topo, topo.objects.countries);
      const proj = lib.geoNaturalEarth1().fitExtent([[2, 2], [598, 298]], {type: 'Sphere'}), path = lib.geoPath(proj);
      for(const f of fc.features){ if(String(f.id) === '010') continue; const t = ctab[f.id] || [String(f.id), '']; const d = path(f); if(!d) continue;
        const x = {nm: t[0], rg: t[1], d}; GEO.paths.push(x); GEO.byName.set(norm(t[0]), x); GEO.region.set(norm(t[0]), t[1]); }
      GEO.ok = GEO.paths.length > 0;
    }catch(e){ console.error('analytics map', e); }
    return GEO;
  }
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  const ALIAS = {usa: 'unitedstatesofamerica', unitedstates: 'unitedstatesofamerica', uk: 'unitedkingdom', southkorea: 'southkorea', korea: 'southkorea', czechrepublic: 'czechia', turkiye: 'turkey', holland: 'netherlands'};
  function countryShape(c){ const g = geo(); const n = norm(c); return g.byName.get(n) || g.byName.get(ALIAS[n] || '') || null; }
  function regionOf(c){ if(!c) return 'Unknown'; try{ if(typeof REGION !== 'undefined' && REGION[c]) return REGION[c]; }catch(e){} const s = countryShape(c); return (s && s.rg) || 'Unknown'; }

  /* ---------- the facts ---------- */
  const pname = p => { try{ const r = PEOPLE.get(p) || (typeof GONEID !== 'undefined' && GONEID.get(p)); return r ? r.n : '?'; }catch(e){ return '?'; } };
  const disc = p => { try{ return idDisc(p, 'add') || ''; }catch(e){ return ''; } };
  const meNow = () => { try{ return ME; }catch(e){ return null; } };
  function facts(k, snap){
    let i = null, f = null;
    try{ if(typeof agIndex === 'function') agIndex(); }catch(e){}
    try{ i = keyInfo(k); }catch(e){}
    try{ f = litFacts(Object.assign({key: k}, i || {})); }catch(e){}
    i = i || {}; f = f || {};
    const g = f.g === 'F' || f.g === 'M' ? f.g : (i.g === 'F' || i.g === 'M' ? i.g : '?');
    const country = i.country || '';
    return {k, nm: i.nm || (snap && snap.nm) || '', ag: i.ag || (snap && snap.ag) || '', country, rg: regionOf(country), g, ht: f.ht, bu: f.bu, wa: f.wa, hp: f.hp, eu: f.eu};
  }
  function data(){
    const V = window.__illuVoteData ? window.__illuVoteData() : null;
    const sel = [];
    if(V) for(const [p, m] of V.fav) for(const [k, x] of m) sel.push({p, k, at: x.at, d: toDate(x.at), snap: x});
    const voted = [];
    /* votes stay anonymous until everyone has voted (user, 8 Nov 2026): another person's vote in a round that
       is still open is not counted here - only my own, and every finished round */
    const openRound = new Map(); if(V) for(const st of V.states) if(st.open) openRound.set(st.k, String(st.round));
    let meId = ''; try{ meId = ME; }catch(e){}
    if(V) for(const [p, x] of V.votes) for(const k in (x.e || {})) for(const r in x.e[k]){ if(p !== meId && openRound.get(k) === String(r)) continue; voted.push({p, k, v: x.e[k][r], d: toDate(((x.t || {})[k] || {})[r])}); }
    let book = []; try{ book = [...BOOK.values()]; }catch(e){}
    const bk = book.map(c => { let f = {}; try{ f = bkFacts(c) || {}; }catch(e){} return {c, k: c.k || '', nm: c.nm || '', ag: c.ag || '', by: c.by || '', st: c.st || 'proc', d: toDate(c.at), country: c.country || '', rg: regionOf(c.country), g: f.g === 'F' || f.g === 'M' ? f.g : (c.g === 'F' || c.g === 'M' ? c.g : '?'), ht: f.ht, bu: f.bu, wa: f.wa, hp: f.hp, eu: f.eu}; });
    let rows = []; try{ rows = allRows(); }catch(e){}
    const views = rows.filter(r => r.kind === 'agency').map(r => ({ag: r.name, meta: r.meta, n: r.n || 1, who: r.who || [], d: toDate(r.day), country: String(r.meta || '').split(' · ').pop()}));
    return {V, ppl: V ? V.people : [], sel, states: V ? V.states : [], voted, bk, views};
  }

  /* ---------- charts ---------- */
  const C = {sel: '#7B3F77', appr: '#2F8A57', cxl: '#C0392B', open: '#C68A00', book: '#3F6FB5', F: '#C2477E', M: '#3F6FB5', '?': '#A69DB2',
    rg: {'Europe': '#7B3F77', 'North America': '#3D6FB6', 'Asia': '#2A9D8F', 'South America': '#E08E2B', 'Africa': '#5B9B3C', 'Oceania': '#D9654B', 'Unknown': '#A69DB2'}};
  const RGN = r => ({'Europe': L('Europe', '유럽'), 'North America': L('North America', '북미'), 'Asia': L('Asia', '아시아'), 'South America': L('South America', '남미'), 'Africa': L('Africa', '아프리카'), 'Oceania': L('Oceania', '오세아니아'), 'Unknown': L('Not stated', '미상')})[r] || r;
  const SEXL = () => ({F: L('Women', '여성'), M: L('Men', '남성'), '?': L('Not stated', '미기재')});
  function line(bks, series){
    const narrow = root.clientWidth < 760, W = narrow ? 420 : 1000, Hh = narrow ? 230 : 210, P = 30, n = bks.length;
    let max = 1; for(const s of series) for(const b of bks) max = Math.max(max, s.c.get(b) || 0);
    const step = max <= 5 ? 1 : Math.ceil(max / 4), top = Math.ceil(max / step) * step;
    const x = i => P + 10 + (n === 1 ? 0 : i * (W - P - 24) / (n - 1)), y = v => Hh - 24 - (v / top) * (Hh - 40);
    let g = '';
    for(let v = 0; v <= top; v += step) g += '<line x1="' + P + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '" class="adgl"/><text x="' + (P - 6) + '" y="' + (y(v) + 4) + '" class="adax" text-anchor="end">' + v + '</text>';
    const every = Math.ceil(n / (narrow ? 6 : 12));
    bks.forEach((b, i) => { if(i % every === 0) g += '<text x="' + x(i) + '" y="' + (Hh - 6) + '" class="adax" text-anchor="middle">' + H(bucketLabel(b)) + '</text>'; });
    for(const s of series){
      const pts = bks.map((b, i) => [x(i), y(s.c.get(b) || 0), s.c.get(b) || 0, b]);
      g += '<polyline points="' + pts.map(p => p[0] + ',' + p[1]).join(' ') + '" fill="none" stroke="' + s.color + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
      g += pts.map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (p[2] ? 3.6 : 2.2) + '" fill="' + (p[2] ? s.color : '#fff') + '" stroke="' + s.color + '" stroke-width="1.6"><title>' + H(bucketLabel(p[3]) + ' · ' + s.label + ': ' + p[2] + (s.nm && s.nm.get(p[3]) ? '\n' + s.nm.get(p[3]).slice(0, 12).join('\n') : '')) + '</title></circle>' + (p[2] && n <= (narrow ? 6 : 12) ? '<text x="' + p[0] + '" y="' + (p[1] - 8) + '" class="adval" text-anchor="middle" fill="' + s.color + '">' + p[2] + '</text>' : '')).join('');
    }
    return '<svg class="adsvg adline" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="' + H(series.map(s => s.label).join(', ')) + '">' + g + '</svg>' +
      '<div class="adleg">' + series.map(s => '<span><i style="background:' + s.color + '"></i>' + H(s.label) + ' <b>' + s.total + '</b></span>').join('') + '</div>';
  }
  function pie(parts, label){
    const tot = parts.reduce((s, p) => s + p.n, 0);
    if(!tot) return '<div class="adpie"><svg viewBox="0 0 120 120" class="adsvg"><circle cx="60" cy="60" r="44" fill="none" stroke="var(--line)" stroke-width="18"/><text x="60" y="64" text-anchor="middle" class="adpn">0</text></svg><p class="adnone">' + L('No data yet', '데이터 없음') + '</p></div>';
    let a0 = -Math.PI / 2, g = '';
    for(const p of parts){ if(!p.n) continue; const a1 = a0 + p.n / tot * Math.PI * 2;
      if(p.n === tot){ g += '<circle cx="60" cy="60" r="44" fill="none" stroke="' + p.color + '" stroke-width="18"><title>' + H(p.label + ': ' + p.n + ' (100%)') + '</title></circle>'; }
      else { const l = a1 - a0 > Math.PI ? 1 : 0, P = a => [60 + 44 * Math.cos(a), 60 + 44 * Math.sin(a)], s = P(a0), e = P(a1);
        g += '<path d="M' + s[0].toFixed(2) + ' ' + s[1].toFixed(2) + ' A44 44 0 ' + l + ' 1 ' + e[0].toFixed(2) + ' ' + e[1].toFixed(2) + '" fill="none" stroke="' + p.color + '" stroke-width="18"><title>' + H(p.label + ': ' + p.n + ' (' + Math.round(p.n / tot * 100) + '%)') + '</title></path>'; }
      a0 = a1; }
    return '<div class="adpie"><svg viewBox="0 0 120 120" class="adsvg" role="img" aria-label="' + H(label) + '">' + g + '<text x="60" y="58" text-anchor="middle" class="adpn">' + tot + '</text><text x="60" y="74" text-anchor="middle" class="adpl">' + H(L('models', '모델')) + '</text></svg>' +
      '<ul class="adpleg">' + parts.filter(p => p.n).map(p => '<li><i style="background:' + p.color + '"></i>' + H(p.label) + '<b>' + p.n + '</b><small>' + Math.round(p.n / tot * 100) + '%</small></li>').join('') + '</ul></div>';
  }
  function hist(list){
    const vals = list.map(x => ({g: x.g, v: parseFloat(x.ht)})).filter(x => !isNaN(x.v) && x.v > 120 && x.v < 220 && (x.g === 'F' || x.g === 'M'));
    if(!vals.length) return '<p class="adnone">' + L('No heights for these models yet.', '이 모델들의 키 정보가 아직 없습니다.') + '</p>';
    const lo = Math.floor(Math.min(...vals.map(x => x.v)) / 2.5) * 2.5, hi = Math.max(...vals.map(x => x.v));
    const bins = []; for(let b = lo; b <= hi; b += 2.5) bins.push(b);
    const cnt = g => bins.map(b => vals.filter(x => x.g === g && x.v >= b && x.v < b + 2.5).length);
    const f = cnt('F'), m = cnt('M'), max = Math.max(1, ...f, ...m);
    const W = 420, Hh = 190, P = 26, bw = (W - P - 6) / bins.length, y = v => Hh - 22 - v / max * (Hh - 36);
    let g = '<line x1="' + P + '" x2="' + W + '" y1="' + y(0) + '" y2="' + y(0) + '" class="adgl"/><text x="' + (P - 5) + '" y="' + (y(max) + 4) + '" class="adax" text-anchor="end">' + max + '</text>';
    bins.forEach((b, i) => {
      const x0 = P + 3 + i * bw, w = Math.max(2, (bw - 3) / 2);
      if(f[i]) g += '<rect x="' + x0 + '" y="' + y(f[i]) + '" width="' + w + '" height="' + (y(0) - y(f[i])) + '" rx="1.5" fill="' + C.F + '"><title>' + H(SEXL().F + ' ' + b + '–' + (b + 2.5) + ' cm: ' + f[i]) + '</title></rect>';
      if(m[i]) g += '<rect x="' + (x0 + w) + '" y="' + y(m[i]) + '" width="' + w + '" height="' + (y(0) - y(m[i])) + '" rx="1.5" fill="' + C.M + '"><title>' + H(SEXL().M + ' ' + b + '–' + (b + 2.5) + ' cm: ' + m[i]) + '</title></rect>';
      if(i % Math.ceil(bins.length / 8) === 0) g += '<text x="' + x0 + '" y="' + (Hh - 6) + '" class="adax">' + b + '</text>';
    });
    const avg = g2 => { const a = vals.filter(x => x.g === g2).map(x => x.v); return a.length ? (Math.round(a.reduce((s, v) => s + v, 0) / a.length * 10) / 10) + ' cm' : '—'; };
    return '<svg class="adsvg adhist" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Heights">' + g + '</svg>' +
      '<div class="adleg"><span><i style="background:' + C.F + '"></i>' + SEXL().F + ' · ' + L('avg ', '평균 ') + avg('F') + '</span><span><i style="background:' + C.M + '"></i>' + SEXL().M + ' · ' + L('avg ', '평균 ') + avg('M') + '</span></div>';
  }
  function map(list){
    const g = geo();
    const by = new Map(), unk = []; for(const x of list){ const s = countryShape(x.country); if(s) by.set(s.nm, (by.get(s.nm) || 0) + 1); else unk.push(x); }
    const max = Math.max(1, ...by.values());
    const shade = n => 'rgba(90,44,87,' + (0.22 + 0.73 * Math.log(n + 1) / Math.log(max + 1)).toFixed(3) + ')';
    const svg = g.ok ? '<svg class="adsvg admap" viewBox="0 0 600 300" role="img" aria-label="' + H(L('Models by country', '국가별 모델')) + '">' +
      g.paths.map(p => { const n = by.get(p.nm) || 0; return '<path d="' + p.d + '" fill="' + (n ? shade(n) : 'var(--admapl,#E9E5EE)') + '"><title>' + H(p.nm + (n ? ': ' + n : '')) + '</title></path>'; }).join('') + '</svg>'
      : '<p class="adnone">' + L('Map not available.', '지도를 쓸 수 없습니다.') + '</p>';
    const top = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return svg + '<div class="adml"><span class="admg"><i></i>' + L('fewer', '적음') + ' → ' + L('more', '많음') + '</span>' + top.map(([c, n]) => '<span>' + H(c) + ' <b>' + n + '</b></span>').join('') + (unk.length ? '<span class="admut">' + L(unk.length + ' with no country', '국가 미상 ' + unk.length) + '</span>' : '') + '</div>';
  }
  function hbars(list, color){
    if(!list.length) return '<p class="adnone">' + L('Nothing in this period yet.', '이 기간에는 아직 없습니다.') + '</p>';
    const max = Math.max(1, ...list.map(x => x.n));
    return '<div class="adhb">' + list.map(x => '<div class="adhbr"><span class="adhbl" title="' + H(x.label + (x.sub ? ' · ' + x.sub : '')) + '">' + H(x.label) + (x.sub ? ' <small>' + H(x.sub) + '</small>' : '') + '</span><span class="adhbt"><i style="width:' + (x.n / max * 100) + '%;background:' + color + '"></i></span><b>' + x.n + '</b></div>').join('') + '</div>';
  }
  const num = v => { const x = parseFloat(v); return isNaN(x) ? null : x; };
  const r1 = v => v == null ? '—' : String(Math.round(v * 10) / 10);
  function stat(vals){ const a = vals.map(num).filter(v => v != null).sort((p, q) => p - q); if(!a.length) return null; const n = a.length, avg = a.reduce((s, v) => s + v, 0) / n, med = n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; return {n, min: a[0], avg, med, max: a[n - 1]}; }

  /* ---------- the page ---------- */
  function draw(){
    if(pane.hidden) return;
    const D = data(), bks = buckets(), inRange = d => !!d && bks.includes(bucketOf(d));
    const me = meNow(), who = F.who === 'me' ? me : F.who;
    const fx = new Map(); const fact = (k, snap) => { if(!fx.has(k)) fx.set(k, facts(k, snap)); return fx.get(k); };
    const keep = f => (F.sex === 'all' || f.g === F.sex) && (F.region === 'all' || f.rg === F.region);
    const whoOk = p => !who || who === 'all' || p === who;
    /* the period's events, filtered */
    const selAll = D.sel.filter(x => inRange(x.d) && keep(fact(x.k, x.snap)));
    const sel = selAll.filter(x => whoOk(x.p));
    const mine = selAll.filter(x => x.p === me);
    const decided = D.states.filter(s => !s.open && inRange(toDate(s.at)) && keep(fact(s.k, s.o)));
    const appr = decided.filter(s => s.res === 'appr'), cxl = decided.filter(s => s.res === 'cxl');
    const openNow = D.states.filter(s => s.open && keep(fact(s.k, s.o)));
    const bk = D.bk.filter(b => inRange(b.d) && keep(b) && whoOk(b.by));
    const viewsIn = D.views.filter(v => inRange(v.d) && (!who || who === 'all' || v.who.includes(who)) && (F.region === 'all' || regionOf(v.country) === F.region));
    const uniqK = list => [...new Set(list.map(x => x.k))];
    const selModels = uniqK(sel).map(k => fact(k));
    /* the set the map, the pies, the histogram and the measurements look at */
    const SET = F.set === 'book' ? bk.map(b => b.k ? Object.assign({}, fact(b.k), {g: b.g, ht: b.ht != null ? b.ht : fact(b.k).ht, country: b.country || fact(b.k).country, rg: b.rg}) : b) : selModels;
    const setL = F.set === 'book' ? L('booked models', '부킹한 모델') : L('selected models', '선택한 모델');
    /* trend */
    const cnt = (list, dOf, nm) => { const c = new Map(), names = new Map(); for(const x of list){ const b = bucketOf(dOf(x)); c.set(b, (c.get(b) || 0) + 1); const a = names.get(b) || []; a.push(nm(x)); names.set(b, a); } return {c, nm: names, total: list.length}; };
    const t1 = cnt(sel, x => x.d, x => fact(x.k).nm + ' — ' + pname(x.p)), t2 = cnt(appr, s => toDate(s.at), s => fact(s.k, s.o).nm), t3 = cnt(cxl, s => toDate(s.at), s => fact(s.k, s.o).nm), t4 = cnt(bk, b => b.d, b => b.nm);
    /* agencies reviewed */
    const agSeen = new Map(); for(const v of viewsIn){ const x = agSeen.get(v.ag) || {n: 0, sub: v.country}; x.n += v.n; agSeen.set(v.ag, x); }
    const agList = [...agSeen.entries()].map(([label, x]) => ({label, sub: x.sub, n: x.n})).sort((a, b) => b.n - a.n).slice(0, 6);
    /* people */
    const ppl = D.ppl.length ? D.ppl : [...new Set(D.sel.map(x => x.p))];
    const when = iso => { const d = toDate(iso); if(!d) return ''; try{ return d.toLocaleDateString(isKO() ? 'ko-KR' : 'en-GB', {day: 'numeric', month: 'short'}) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }catch(e){ return iso; } };
    const tile = (lab, n, sub, color, icon) => '<div class="adt"><span class="adti" style="color:' + color + ';background:' + color + '1A"><svg viewBox="0 0 24 24" aria-hidden="true">' + icon + '</svg></span><div><span class="adtl">' + H(lab) + '</span><b>' + n + '</b><span class="adts">' + H(sub) + '</span></div></div>';
    const IC = {heart: '<path d="M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.6 12 20 12 20z"/>', team: '<circle cx="9" cy="9" r="3.2"/><circle cx="16.5" cy="10.5" r="2.6"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M14.5 15.2c2.6-.4 4.9.9 5.6 3.8"/>', ok: '<circle cx="12" cy="12" r="8.5"/><path d="m8 12.2 2.8 2.8L16 9.5"/>', no: '<circle cx="12" cy="12" r="8.5"/><path d="m9 9 6 6M15 9l-6 6"/>', bk: '<rect x="3.5" y="6" width="17" height="13" rx="2.5"/><path d="M8.5 6V4.5h7V6M3.5 11.5h17"/>', ag: '<path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-6h6v6"/>'};
    const seg = (k, opts, cls) => '<div class="adseg' + (cls ? ' ' + cls : '') + '">' + opts.map(([v, l]) => '<button type="button" class="' + (F[k] === v ? 'on' : '') + '" data-ad="' + k + '=' + v + '" aria-pressed="' + (F[k] === v) + '">' + l + '</button>').join('') + '</div>';
    const opt = (k, v, l, n) => '<button type="button" class="adopt' + (F[k] === v ? ' on' : '') + '" data-ad="' + k + '=' + H(v) + '" aria-pressed="' + (F[k] === v) + '"><span>' + l + '</span>' + (n != null ? '<small>' + n + '</small>' : '') + '</button>';
    const rgN = r => D.sel.filter(x => inRange(x.d) && fact(x.k).rg === r).length + D.bk.filter(b => inRange(b.d) && b.rg === r).length;
    const nAct = (F.who !== 'all') + (F.sex !== 'all') + (F.region !== 'all');
    /* the filter panel */
    const side = '<aside class="adside' + (F.fopen ? ' open' : '') + '" aria-label="' + H(L('Filters', '필터')) + '">' +
      '<div class="adsh"><b>' + L('Filters', '필터') + '</b>' + (nAct ? '<button type="button" class="adclr" data-ad="clear=1">' + L('Clear', '지우기') + '</button>' : '') + '</div>' +
      '<div class="adfg"><span class="adfl">' + L('Period', '기간') + '</span>' + seg('gran', [['d', L('Day', '일')], ['w', L('Week', '주')], ['m', L('Month', '월')], ['y', L('Year', '년')]], 'full') + '<small class="adfs">' + H(PERIODL()) + '</small></div>' +
      '<div class="adfg"><span class="adfl">' + L('Models', '모델') + '</span>' + seg('set', [['sel', L('Selected', '선택')], ['book', L('Booked', '부킹')]], 'full') + '<small class="adfs">' + L('for the map, pies, heights and measurements', '지도·원형·키·사이즈 기준') + '</small></div>' +
      '<div class="adfg"><span class="adfl">' + L('Person', '사람') + '</span>' + opt('who', 'all', L('Everyone', '모두')) + opt('who', 'me', L('Me', '나')) + ppl.filter(p => p !== me).map(p => opt('who', p, disc(p) + H(pname(p)))).join('') + '</div>' +
      '<div class="adfg"><span class="adfl">' + L('Sex', '성별') + '</span>' + seg('sex', [['all', L('All', '모두')], ['F', L('Women', '여성')], ['M', L('Men', '남성')]], 'full') + '</div>' +
      '<div class="adfg"><span class="adfl">' + L('Region', '지역') + '</span>' + opt('region', 'all', L('All regions', '모든 지역')) + ['Europe', 'North America', 'Asia', 'South America', 'Africa', 'Oceania'].map(r => opt('region', r, '<i class="adrd" style="background:' + C.rg[r] + '"></i>' + H(RGN(r)), rgN(r))).join('') + '</div>' +
      '</aside>';
    /* tabs in the big table card: three tables in one place */
    const byModel = new Map(); for(const x of sel){ const m = byModel.get(x.k) || {k: x.k, snap: x.snap, who: []}; m.who.push(x); byModel.set(x.k, m); }
    const models = [...byModel.values()].map(m => { const f = fact(m.k, m.snap), st = D.states.find(s => s.k === m.k) || null, b = D.bk.find(b => b.k === m.k) || null; return {m, f, st, b, first: m.who.map(x => x.at).sort()[0]}; })
      .sort((a, b) => b.m.who.length - a.m.who.length || String(a.first).localeCompare(String(b.first)));
    const stTxt = (st, b) => b ? '<span class="adst book">' + L('Booked', '부킹') + ' · ' + H(when(b.c.at)) + '</span>' : !st ? '<span class="adst">' + L('No vote', '투표 없음') + '</span>' : st.open ? '<span class="adst open">' + L('Voting', '투표 중') + ' ' + st.n + '/' + st.of + '</span>' : '<span class="adst ' + st.res + '">' + (st.res === 'appr' ? L('Approved', '승인') : L('Cancelled', '취소')) + ' ' + st.g + '–' + st.r + '</span>';
    const mxCells = f => [f.ht, f.bu, f.wa, f.hp, f.eu].map(v => '<td class="n">' + r1(num(v)) + '</td>').join('');
    const avgRow = (list, g) => { const a = list.filter(x => x.g === g); if(!a.length) return ''; return '<tr class="avg"><td colspan="3">' + L('Average · ', '평균 · ') + H(SEXL()[g]) + ' (' + a.length + ')</td>' + ['ht', 'bu', 'wa', 'hp', 'eu'].map(k => { const s = stat(a.map(x => x[k])); return '<td class="n">' + (s ? r1(s.avg) : '—') + '</td>'; }).join('') + '<td colspan="2"></td></tr>'; };
    const STN = {proc: L('Processing', '진행 중'), done: L('Completed', '완료'), canc: L('Cancelled', '취소')};
    let tbl = '';
    if(F.tab === 'models') tbl = models.length ? '<table class="adtab"><thead><tr><th>' + L('Model', '모델') + '</th><th>' + L('Agency', '에이전시') + '</th><th>' + L('Sex', '성별') + '</th><th class="n">' + L('Ht', '키') + '</th><th class="n">' + L('Bust', '가슴') + '</th><th class="n">' + L('Waist', '허리') + '</th><th class="n">' + L('Hips', '엉덩이') + '</th><th class="n">' + L('Shoe', '신발') + '</th><th>' + L('Selected by', '선택한 사람') + '</th><th>' + L('Vote / booking', '투표 / 부킹') + '</th></tr></thead><tbody>' +
        models.map(x => '<tr><td><b>' + H(x.f.nm || '?') + '</b></td><td>' + H(x.f.ag) + '<small> ' + H(x.f.country) + '</small></td><td><i class="adsx" style="background:' + C[x.f.g] + '"></i>' + H(SEXL()[x.f.g]) + '</td>' + mxCells(x.f) + '<td class="adby">' + x.m.who.slice().sort((a, b) => String(a.at).localeCompare(String(b.at))).map(w => '<span title="' + H(pname(w.p) + ' ♥ ' + when(w.at)) + '">' + disc(w.p) + '<small>' + H(when(w.at)) + '</small></span>').join('') + '</td><td>' + stTxt(x.st, x.b) + '</td></tr>').join('') +
        avgRow(models.map(x => x.f), 'F') + avgRow(models.map(x => x.f), 'M') + '</tbody></table>' : '<p class="adnone">' + L('Nobody has selected a model in this period yet — tap ♡ on a card.', '이 기간에는 아직 고른 모델이 없습니다 — 카드의 ♡를 누르세요.') + '</p>';
    else if(F.tab === 'book'){ const list = bk.slice().sort((a, b) => (b.d || 0) - (a.d || 0));
      tbl = list.length ? '<table class="adtab"><thead><tr><th>' + L('Booked on', '부킹 날짜') + '</th><th>' + L('Model', '모델') + '</th><th>' + L('Agency', '에이전시') + '</th><th>' + L('Sex', '성별') + '</th><th class="n">' + L('Ht', '키') + '</th><th>' + L('In charge', '담당') + '</th><th>' + L('Status', '상태') + '</th></tr></thead><tbody>' +
        list.map(b => '<tr><td>' + H(when(b.c.at)) + '</td><td><b>' + H(b.nm) + '</b></td><td>' + H(b.ag) + '<small> ' + H(b.country) + '</small></td><td><i class="adsx" style="background:' + C[b.g] + '"></i>' + H(SEXL()[b.g]) + '</td><td class="n">' + r1(num(b.ht)) + '</td><td>' + (b.by ? disc(b.by) + H(pname(b.by)) : '—') + '</td><td><span class="adst ' + (b.st === 'done' ? 'appr' : b.st === 'canc' ? 'cxl' : 'book') + '">' + H(STN[b.st] || STN.proc) + '</span></td></tr>').join('') + '</tbody></table>' : '<p class="adnone">' + L('No booking cards in this period.', '이 기간에는 부킹 카드가 없습니다.') + '</p>'; }
    else if(F.tab === 'people') tbl = '<table class="adtab"><thead><tr><th>' + L('Person', '사람') + '</th><th class="n">' + L('Selected ♥', '선택 ♥') + '</th><th class="n">' + L('Go', '찬성') + '</th><th class="n">' + L('Pass', '반대') + '</th><th class="n">' + L('Confirmed → Booking', '부킹 확정') + '</th><th class="n">' + L('In charge now', '현재 담당') + '</th><th class="n">' + L('Agencies opened', '에이전시 열람') + '</th></tr></thead><tbody>' +
      ppl.map(p => { const vt = D.voted.filter(x => x.p === p && inRange(x.d));
        return '<tr' + (p === me ? ' class="me"' : '') + '><td class="nw">' + disc(p) + H(pname(p)) + (p === me ? ' <small>(' + L('you', '나') + ')</small>' : '') + '</td><td class="n">' + selAll.filter(x => x.p === p).length + '</td><td class="n">' + vt.filter(x => x.v === 'g').length + '</td><td class="n">' + vt.filter(x => x.v === 'r').length + '</td><td class="n">' + D.states.filter(s => s.o.conf && s.o.conf.by === p && inRange(toDate(s.o.conf.at))).length + '</td><td class="n">' + D.bk.filter(b => b.by === p && b.st !== 'done' && b.st !== 'canc').length + '</td><td class="n">' + D.views.filter(v => inRange(v.d) && v.who.includes(p)).reduce((s, v) => s + v.n, 0) + '</td></tr>'; }).join('') + '</tbody></table>';
    else tbl = '<div class="adms">' + ['F', 'M'].map(g => { const a = SET.filter(x => x.g === g);
        return '<div><h4 style="color:' + C[g] + '">' + H(SEXL()[g]) + ' <small>' + a.length + ' ' + H(setL) + '</small></h4><table class="adtab"><thead><tr><th></th><th class="n">n</th><th class="n">' + L('min', '최소') + '</th><th class="n">' + L('avg', '평균') + '</th><th class="n">' + L('median', '중앙값') + '</th><th class="n">' + L('max', '최대') + '</th></tr></thead><tbody>' +
          [['ht', L('Height', '신장'), 'cm'], ['bu', L('Bust / chest', '가슴'), 'cm'], ['wa', L('Waist', '허리'), 'cm'], ['hp', L('Hips', '엉덩이'), 'cm'], ['eu', L('Shoe', '신발'), 'EU']].map(([k, lab, u]) => { const s = stat(a.map(x => x[k])); return '<tr><td>' + H(lab) + ' <small>' + u + '</small></td>' + (s ? '<td class="n">' + s.n + '</td><td class="n">' + r1(s.min) + '</td><td class="n"><b>' + r1(s.avg) + '</b></td><td class="n">' + r1(s.med) + '</td><td class="n">' + r1(s.max) + '</td>' : '<td class="n" colspan="5">—</td>') + '</tr>'; }).join('') + '</tbody></table></div>'; }).join('') + '</div>';
    const tabs = [['models', L('Who selected which model', '누가 어떤 모델을 골랐나'), models.length], ['book', L('When models were booked', '부킹 시기'), bk.length], ['people', L('By person', '사람별'), ppl.length], ['meas', L('Measurements', '사이즈'), null]];
    /* the page */
    const h = side +
      '<div class="admain">' +
        '<div class="adtop"><div><h2>' + L('Models and agencies', '모델과 에이전시') + ' <span class="adk">' + H(PERIODL()) + (nAct ? ' · ' + L(nAct + ' filter' + (nAct > 1 ? 's' : '') + ' on', '필터 ' + nAct + '개') : '') + '</span></h2></div><span class="adsp"></span>' +
          '<button type="button" class="adfbtn" data-ad="fopen=' + (F.fopen ? '0' : '1') + '" aria-expanded="' + F.fopen + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>' + L('Filters', '필터') + (nAct ? ' <b>' + nAct + '</b>' : '') + '</button>' +
          seg('gran', [['d', L('Day', '일')], ['w', L('Week', '주')], ['m', L('Month', '월')], ['y', L('Year', '년')]], 'adtopseg') + '</div>' +
        '<div class="adtiles">' +
          tile(L('Selected by me', '내가 고른 모델'), uniqK(mine).length, L('♥ this period', '이 기간 ♥'), C.sel, IC.heart) +
          tile(who && who !== 'all' && who !== me ? L('Selected by ', '선택: ') + pname(who) : L('Selected by the team', '팀이 고른 모델'), uniqK(sel).length, L(sel.length + ' ♥ in all', '♥ 총 ' + sel.length), C.sel, IC.team) +
          tile(L('Approved', '승인'), appr.length, L(openNow.length + ' still voting', '투표 중 ' + openNow.length), C.appr, IC.ok) +
          tile(L('Cancelled', '취소'), cxl.length, L('by the team', '팀 결정'), C.cxl, IC.no) +
          tile(L('Booked', '부킹'), bk.length, L(bk.filter(b => b.st === 'done').length + ' completed', '완료 ' + bk.filter(b => b.st === 'done').length), C.book, IC.bk) +
          tile(L('Agencies reviewed', '살펴본 에이전시'), agSeen.size, L(viewsIn.reduce((s, v) => s + v.n, 0) + ' times opened', viewsIn.reduce((s, v) => s + v.n, 0) + '회 열람'), '#5A2C57', IC.ag) +
        '</div>' +
        '<div class="adgrid">' +
          '<section class="adc ad-trend"><div class="adch"><h3>' + L('Selected, approved, cancelled and booked', '선택 · 승인 · 취소 · 부킹 추이') + '</h3></div>' +
            line(bks, [{label: L('Selected', '선택'), color: C.sel, c: t1.c, nm: t1.nm, total: t1.total}, {label: L('Approved', '승인'), color: C.appr, c: t2.c, nm: t2.nm, total: t2.total}, {label: L('Cancelled', '취소'), color: C.cxl, c: t3.c, nm: t3.nm, total: t3.total}, {label: L('Booked', '부킹'), color: C.book, c: t4.c, nm: t4.nm, total: t4.total}]) + '</section>' +
          '<section class="adc ad-map"><div class="adch"><h3>' + L('Where they are', '국가별') + '</h3><span>' + H(setL) + (F.sex !== 'all' ? ' · ' + H(SEXL()[F.sex]) : '') + ' · ' + L('agency country', '에이전시 국가') + '</span></div>' + map(SET) + '</section>' +
          '<section class="adc ad-p1"><div class="adch"><h3>' + L('Women and men', '여성과 남성') + '</h3><span>' + H(setL) + '</span></div>' + pie(['F', 'M', '?'].map(g => ({label: SEXL()[g], n: SET.filter(x => x.g === g).length, color: C[g]})), 'sex') + '</section>' +
          '<section class="adc ad-p2"><div class="adch"><h3>' + L('Vote outcome', '투표 결과') + '</h3><span>' + L('decided this period · open now', '이 기간 결정 · 현재 진행') + '</span></div>' + pie([{label: L('Approved', '승인'), n: appr.length, color: C.appr}, {label: L('Cancelled', '취소'), n: cxl.length, color: C.cxl}, {label: L('Still voting', '투표 중'), n: openNow.length, color: C.open}], 'votes') + '</section>' +
          '<section class="adc ad-p3"><div class="adch"><h3>' + L('By region', '지역별') + '</h3><span>' + H(setL) + '</span></div>' + pie(Object.keys(C.rg).map(r => ({label: RGN(r), n: SET.filter(x => x.rg === r).length, color: C.rg[r]})), 'regions') + '</section>' +
          '<section class="adc ad-hist"><div class="adch"><h3>' + L('Heights', '키 분포') + '</h3><span>' + H(setL) + ' · 2.5 cm</span></div>' + hist(SET) + '</section>' +
          '<section class="adc ad-ag"><div class="adch"><h3>' + L('Agencies reviewed the most', '가장 많이 본 에이전시') + '</h3><span>' + L('opened in the Directory', '디렉터리 열람') + '</span></div>' + hbars(agList, '#5A2C57') + '</section>' +
          '<section class="adc ad-tab"><div class="adtabs" role="tablist">' + tabs.map(([v, l, n]) => '<button type="button" role="tab" aria-selected="' + (F.tab === v) + '" class="' + (F.tab === v ? 'on' : '') + '" data-ad="tab=' + v + '">' + H(l) + (n != null ? ' <small>' + n + '</small>' : '') + '</button>').join('') + '</div><div class="adscroll">' + tbl + '</div></section>' +
        '</div>' +
      '</div>';
    if(root.__h !== h){ root.__h = h; root.innerHTML = h; }
  }
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-ad]'); if(!b) return;
    const [k, v] = b.dataset.ad.split('=');
    if(k === 'clear'){ F.who = 'all'; F.sex = 'all'; F.region = 'all'; }
    else if(k === 'fopen') F.fopen = v === '1';
    else F[k] = v;
    save(); draw();
  });
  window.__illuAnaDraw = draw;
  let rw = 0; addEventListener('resize', () => { clearTimeout(rw); rw = setTimeout(() => { root.__h = ''; draw(); }, 200); });
  let lt = 0; const kick = () => { if(pane.hidden) return; clearTimeout(lt); lt = setTimeout(draw, 300); };
  (function hook(n){ if(window.__illuVoteOnChange){ window.__illuVoteOnChange(kick); return; } if(n < 100) setTimeout(() => hook(n + 1), 200); })(0);
  try{ new MutationObserver(() => { root.__h = ''; kick(); }).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']}); }catch(e){}
  try{ const r0 = refresh; refresh = function(){ if(typeof VIEW !== 'undefined' && VIEW === 'ana'){ try{ sharedDirty(); counts(); }catch(e){} kick(); return; } return r0.apply(this, arguments); }; window.refresh = refresh; }catch(e){}

  const css = document.createElement('style');
  css.textContent = `
#v-ana{--ico:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 20V10M10 20V4M16 20v-7M22 20H2'/%3E%3C/svg%3E")}
body[data-view="ana"] .shell.shell>.side{display:none!important}
body[data-view="ana"] .shell.shell{grid-template-columns:minmax(0,1fr)!important}
body[data-view="ana"] .shell.shell>*{grid-column:1/-1}
.ad{display:grid;grid-template-columns:230px minmax(0,1fr);gap:16px;padding:4px 0 8px;font-family:var(--sans,Inter,system-ui,sans-serif);color:var(--ink);align-items:start}
.ad *{box-sizing:border-box}
.ad .adside{position:sticky;top:64px;background:var(--surf);border:1px solid var(--line);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:14px;max-height:calc(100vh - 80px);overflow:auto}
.ad .adsh{display:flex;align-items:center;justify-content:space-between}.ad .adsh b{font-size:14px}
.ad .adclr{border:0;background:none;color:var(--acc);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;padding:4px}
.ad .adfg{display:flex;flex-direction:column;gap:5px}
.ad .adfl{font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;font-weight:700;color:var(--faint)}
.ad .adfs{font-size:11px;color:var(--faint)}
.ad .adopt{display:flex;align-items:center;gap:7px;width:100%;min-height:32px;border:1px solid transparent;border-radius:9px;background:none;font:inherit;font-size:13px;color:var(--ink);cursor:pointer;padding:3px 8px;text-align:left}
.ad .adopt span{flex:1;min-width:0;display:flex;align-items:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ad .adopt small{color:var(--faint);font-size:11.5px}
.ad .adopt:hover{background:var(--surf2,#f6f4f8)}
.ad .adopt.on{background:var(--wash,#f4ecf2);border-color:var(--acc);color:var(--acc);font-weight:600}
.ad .adrd{width:9px;height:9px;border-radius:3px;margin-right:7px;flex:none;display:inline-block}
.ad .add{width:20px;height:20px;border-radius:50%;flex:none;display:inline-grid;place-items:center;font-style:normal;font-size:9px;font-weight:700;background:var(--idbg);color:var(--idfg);margin-right:6px;vertical-align:middle}
.ad .adseg{display:inline-flex;background:var(--surf2,#f4f3f6);border-radius:10px;padding:3px;gap:2px}
.ad .adseg.full{display:flex}.ad .adseg.full button{flex:1;padding:0 4px;min-width:0}
.ad .adseg button{border:0;background:none;font:inherit;font-size:12.5px;font-weight:600;color:var(--faint);padding:0 11px;border-radius:7px;min-height:30px;cursor:pointer;white-space:nowrap}
.ad .adseg button.on{background:var(--surf);color:var(--acc);box-shadow:0 1px 3px rgba(20,10,30,.12)}
.ad .admain{display:flex;flex-direction:column;gap:10px;min-width:0}
.ad .adtop{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ad .adtop h2{margin:2px 0 0;font-size:22px;font-weight:700}
.ad .adk{margin-left:8px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--faint)}
.ad .adsp{flex:1}
.ad .adfbtn{display:none;align-items:center;gap:6px;height:34px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:var(--surf);font:inherit;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer}
.ad .adfbtn svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
.ad .adfbtn b{background:var(--acc);color:#fff;border-radius:999px;font-size:11px;padding:1px 7px}
.ad .adtiles{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.ad .adt{background:var(--surf);border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:flex;gap:12px;align-items:center;min-width:0;box-shadow:0 1px 2px rgba(20,10,30,.04)}
.ad .adt>div{min-width:0;display:flex;flex-direction:column}
.ad .adti{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;flex:none}
.ad .adti svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.ad .adtl{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ad .adt b{font-size:26px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}
.ad .adts{font-size:11.5px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ad .adgrid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px}
.ad .adc{background:var(--surf);border:1px solid var(--line);border-radius:16px;padding:14px 16px;min-width:0;box-shadow:0 1px 2px rgba(20,10,30,.04);display:flex;flex-direction:column}
.ad .ad-trend{grid-column:span 7}.ad .ad-map{grid-column:span 5}
.ad .ad-trend,.ad .ad-map{height:250px}
.ad .ad-trend .adline,.ad .ad-map .admap{flex:1 1 0;min-height:0;height:100%!important;width:100%}
.ad .ad-p1,.ad .ad-p2,.ad .ad-p3{grid-column:span 3}.ad .ad-hist{grid-column:span 3}
.ad .ad-ag{grid-column:span 4}.ad .ad-tab{grid-column:span 8}
.ad .adch{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.ad .adch h3{margin:0;font-size:14px;font-weight:700}.ad .adch span{font-size:11.5px;color:var(--faint)}
.ad .adsvg{width:100%;height:auto;display:block}
.ad .adhist{max-height:150px}
.ad .adtop h2{font-size:20px}
.ad .ad-p1,.ad .ad-p2,.ad .ad-p3,.ad .ad-hist{min-height:0}
.ad .adpie svg{width:100px}
.ad .adt{padding:10px 12px}
.ad .adgl{stroke:var(--line);stroke-width:1}.ad .adax{font-size:11px;fill:var(--faint)}.ad .adval{font-size:10.5px;font-weight:700}
.ad .adleg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--faint);margin-top:6px}
.ad .adleg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}.ad .adleg b{color:var(--ink);margin-left:2px}
.ad .adpie{display:flex;align-items:center;gap:12px;flex:1}
.ad .adpie svg{width:108px;flex:none}
.ad .adpn{font-size:22px;font-weight:700;fill:var(--ink)}.ad .adpl{font-size:10px;fill:var(--faint)}
.ad .adpleg{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px;font-size:12.5px;min-width:0;flex:1}
.ad .adpleg li{display:flex;align-items:center;gap:6px;white-space:nowrap}
.ad .adpleg i{width:9px;height:9px;border-radius:3px;flex:none}.ad .adpleg b{margin-left:auto;font-variant-numeric:tabular-nums}.ad .adpleg small{color:var(--faint);width:34px;text-align:right}
.ad .admap{height:220px;flex:1;min-height:0}
.ad .admap path{stroke:var(--surf,#fff);stroke-width:.4}
.ad .admap path:hover{stroke:var(--acc);stroke-width:1}
.ad .adml{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;margin-top:6px}.ad .adml b{color:var(--acc)}
.ad .admg i{display:inline-block;width:44px;height:8px;border-radius:4px;background:linear-gradient(90deg,rgba(90,44,87,.22),rgba(90,44,87,.95));margin-right:6px}
.ad .admg,.ad .admut{color:var(--faint)}
.ad .adhb{display:flex;flex-direction:column;gap:7px}
.ad .adhbr{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) 34px;gap:10px;align-items:center;font-size:12.5px}
.ad .adhbl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ad .adhbl small{color:var(--faint)}
.ad .adhbt{height:9px;background:var(--surf2,#f3f3f4);border-radius:5px;overflow:hidden}.ad .adhbt i{display:block;height:100%;border-radius:5px}
.ad .adhbr b{text-align:right;font-variant-numeric:tabular-nums}
.ad .adtabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin:-4px -4px 8px;overflow-x:auto;scrollbar-width:none}
.ad .adtabs button{border:0;border-bottom:2px solid transparent;background:none;font:inherit;font-size:13px;font-weight:600;color:var(--faint);padding:6px 10px 9px;cursor:pointer;white-space:nowrap;margin-bottom:-1px}
.ad .adtabs button.on{color:var(--ink);border-bottom-color:var(--acc)}.ad .adtabs small{font-weight:500;color:var(--faint)}
.ad .adscroll{max-height:205px;overflow:auto}
.ad .adtab{width:100%;border-collapse:collapse;font-size:12.5px}
.ad .adtab th{position:sticky;top:0;background:var(--surf);font-size:10px;letter-spacing:.07em;text-transform:uppercase;font-weight:700;color:var(--faint);text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);white-space:nowrap}
.ad .adtab td{padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:middle}
.ad .adtab .n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.ad .adtab td.nw{white-space:nowrap}
.ad .adtab small{color:var(--faint)}
.ad .adtab tr.me td{background:var(--wash,#f8f2f7)}
.ad .adtab tr.avg td{font-weight:700;background:var(--surf2,#f6f4f8)}
.ad .adsx{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
.ad .adby{display:flex;flex-wrap:wrap;gap:8px}.ad .adby span{display:inline-flex;align-items:center;white-space:nowrap}.ad .adby small{font-size:11px}
.ad .adst{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px;background:var(--surf2,#f3f3f4);color:var(--faint);white-space:nowrap}
.ad .adst.appr{background:#e6f3ea;color:#24603a}.ad .adst.cxl{background:#fbe7e5;color:#9c2018}.ad .adst.book{background:#E6EEF8;color:#2C5592}.ad .adst.open{background:#FBF0D6;color:#8A6410}
.ad .adms{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px}.ad .adms h4{margin:0 0 6px;font-size:13.5px}.ad .adms h4 small{color:var(--faint);font-weight:500}
.ad .adnone{color:var(--faint);font-size:12.5px;margin:6px 0}
@media (max-width:1500px){.ad .adtiles{grid-template-columns:repeat(3,minmax(0,1fr))}.ad .ad-p1,.ad .ad-p2,.ad .ad-p3{grid-column:span 4}.ad .ad-hist{grid-column:span 6}.ad .ad-ag{grid-column:span 6}.ad .ad-tab{grid-column:span 12}}
@media (max-width:1100px){.ad{grid-template-columns:minmax(0,1fr)}.ad .adside{display:none;position:static;max-height:none}.ad .adside.open{display:flex;order:0}.ad .adfbtn{display:inline-flex}.ad .adside{order:2}.ad .admain{order:1}
  .ad .ad-trend,.ad .ad-map{grid-column:span 12}}
@media (max-width:760px){.ad .adtiles{grid-template-columns:repeat(2,minmax(0,1fr))}.ad .adti{display:none}.ad .ad-trend,.ad .ad-map{height:auto}.ad .ad-trend .adline,.ad .ad-map .admap{height:auto!important;flex:none}.ad .adtl{white-space:normal}.ad .adgrid>*{grid-column:span 12!important}.ad .adtopseg{display:none}.ad .adt b{font-size:22px}.ad .adside{order:0}}
`;
  document.head.appendChild(css);
})();
