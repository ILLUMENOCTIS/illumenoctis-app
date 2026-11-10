/* ================= small layout fixes (1.2.18) =================
   - Atlas: a click outside the map (and its side list and search) puts the map back into
     the "Agencies by continent" widget it grew out of, and returns to the page you were on.
   - Atlas: the search card lines up with the clock above it and the map beside it. */
(function(){
  'use strict';
  let prev = null;
  const open0 = window.atlasOpen;
  if(typeof open0 === 'function'){
    window.atlasOpen = function(){ if(VIEW !== 'atl') prev = VIEW; return open0.apply(this, arguments); };
  }
  /* remember the page before the Atlas however it was reached */
  let last = typeof VIEW !== 'undefined' ? VIEW : 'arr';
  setInterval(() => { if(VIEW !== 'atl') last = VIEW; }, 400);

  const INSIDE = '#atlmap, #atlside, .atl, aside.side, #appbar, #abdrawer, #abtip, .views, #navtoggle, nav, #wmap, .illustreet, [role="dialog"], .modal, #ctmodal, .ctbox, #msgdock, #msgpanel, .rail, button, a, input, select, textarea, label';
  let closing = false;
  function closeAtlas(){
    if(closing) return;
    const back = prev || last || 'dir';
    const m = document.getElementById('atlmap'), wm = document.getElementById('wmap');
    const go = () => { closing = false; prev = null; const b = document.getElementById('v-' + back); if(b) b.click(); else try{ setView(back); }catch(e){} };
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(m && wm && m.animate && !calm){
      const from = m.getBoundingClientRect(), to = wm.getBoundingClientRect();
      if(from.width && to.width){
        closing = true;
        m.style.zIndex = '60';
        const an = m.animate([{transform: 'none', opacity: 1, borderRadius: '9px'},
          {transform: 'translate(' + (to.left - from.left) + 'px,' + (to.top - from.top) + 'px) scale(' + (to.width / from.width) + ',' + (to.height / from.height) + ')', opacity: .4, borderRadius: '18px'}],
          {duration: 420, easing: 'cubic-bezier(.4,0,.6,1)'});
        an.onfinish = an.oncancel = () => { m.style.zIndex = ''; go(); };
        return;
      }
    }
    go();
  }
  window.atlasClose = closeAtlas;
  document.addEventListener('pointerdown', e => {
    if(typeof VIEW === 'undefined' || VIEW !== 'atl' || e.button !== 0) return;
    if(!e.target.closest || e.target.closest(INSIDE)) return;
    /* only clicks on the page itself, not on something that opened on top of it */
    const pane = document.getElementById('pane-atl');
    if(pane && pane.hidden) return;
    closeAtlas();
  });

  /* page zoom: − 100% + in the top bar (Ctrl + / Ctrl − / Ctrl 0 and Ctrl + wheel do the same) */
  if(window.illu && window.illu.zoom){
    const put = () => {
      const r = document.querySelector('#appbar .abr');
      if(!r){ setTimeout(put, 500); return; }
      if(document.getElementById('illuzoom')) return;
      const z = document.createElement('div');
      z.id = 'illuzoom'; z.setAttribute('role', 'group'); z.setAttribute('aria-label', 'Page zoom');
      z.innerHTML = '<button type="button" data-z="-" title="Zoom out (Ctrl −)" aria-label="Zoom out">−</button><button type="button" data-z="0" class="zv" title="Back to 100% (Ctrl 0)">100%</button><button type="button" data-z="+" title="Zoom in (Ctrl +)" aria-label="Zoom in">+</button>';
      r.insertBefore(z, r.firstChild);
      const show = v => { const b = z.querySelector('.zv'); if(b) b.textContent = Math.round((v || 1) * 100) + '%'; };
      let cur = 1;
      window.illu.zoom(null).then(v => { cur = v; show(v); }).catch(() => {});
      if(window.illu.onZoom) window.illu.onZoom(v => { cur = v; show(v); });
      z.addEventListener('click', e => {
        const b = e.target.closest('[data-z]'); if(!b) return;
        const d = b.dataset.z, nz = d === '0' ? 1 : cur + (d === '+' ? 0.1 : -0.1);
        window.illu.zoom(nz).then(v => { cur = v; show(v); });
      });
    };
    put();
  }

  (function(){ const st = document.createElement('style');
    st.textContent = '.bvside.bvside.bvside.bvside .bvsec > dl.bvpl > .bvexcw.bvexcw > .bvpc{align-self:start!important;justify-content:flex-start!important;height:auto!important;padding-top:4px!important}.bvside.bvside.bvside.bvside .bvsec > dl.bvpl > .bvexcw.bvexcw{height:auto!important;max-height:none!important;flex:0 0 auto!important;min-height:calc(var(--bvrow,44px) * var(--bvw,1))}.bv .bvside .bvexcw{display:grid!important;grid-template-columns:1fr 1fr!important;gap:0 10px;align-items:start}.bv .bvside .bvexcw>.bvpc{min-width:0;grid-column:auto!important;align-self:start!important;justify-content:flex-start!important}.bv .bvside .bvexcw .bvbn{display:flex;flex-wrap:wrap;gap:4px;align-items:center}.bv .bvside .bvexcw .bvbnadd{min-width:70px;flex:1}.bv .bvside .bvexcw,.bv .bvside .bvexcw>.bvpc,.bv .bvside .bvexcw>.bvpc>dd{height:auto!important;max-height:none!important;overflow:visible!important;white-space:normal!important}.bvside.bvside.bvside.bvside .bvprof .bvsec .bvexcw.bvexcw .bvpc.bvpc dd,.bvside.bvside.bvside.bvside .bvprof .bvsec .bvexcw.bvexcw .bvpc.bvpc dd > *,.bv .bvside .bvside .bvexcw .bvbn,.bv .bvside .bvexcw .bvbn,.bv .bvside .bvexcw dd{flex-wrap:wrap!important;white-space:normal!important;height:auto!important;max-height:none!important;overflow:visible!important}';
    document.head.appendChild(st); })();
  /* ---------- Booking side panel: passport rows in Travel, "Country", and the panel filled evenly ---------- */
  (function(){
    if(typeof bvDrawSide !== 'function' || typeof bvDraw !== 'function') return;
    const KO = () => typeof LANG !== 'undefined' && LANG === 'ko';
    const svg = s => 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linejoin="round">' + s + '</svg>') + '")';
    const IC_PASS = svg('<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10.5" r="3.2"/><path d="M8.5 17h7"/>');
    const IC_DATE = svg('<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4M9 15l2 2 4-4"/>');
    const e = v => String(v == null ? '' : v).replace(/[&<>"']/g, m => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[m]);
    function passport(){
      if(typeof bv === 'undefined' || !bv) return;
      const c = BOOK.get(bv.id); if(!c) return;
      if(typeof SIGNED === 'function' && SIGNED() && splitExp(c)){ setTimeout(() => { try{ bvSideRefresh(true); }catch(e){} }, 0); return; }
      const dl = document.querySelector('.bvside .bvsec--trv dl'); if(!dl || dl.querySelector('.bvpp')) return;
      const rows = [...dl.children];
      const find = (re, k) => rows.find(r => re.test(((r.querySelector('dt') || {}).textContent || '').trim())) || rows[k];
      const rC = find(/^(countries|country|국가)/i, 0), rA = find(/^(availability|가능)/i, 1), rE = find(/^(entry|입국)/i, 2), rD = find(/^(departure|출국)/i, 3);
      const ro = !(typeof SIGNED === 'function' && SIGNED());
      const lock = ro ? ' readonly title="Sign in to edit"' : '';
      const L = (en, ko) => KO() ? ko : en;
      const inp = (f, ph, cls) => '<input class="bvin' + (cls ? ' ' + cls : '') + '" data-bk="' + e(c.id) + '" data-bf="' + f + '" placeholder="' + ph + '" value="' + e(c[f]) + '"' + lock + (f === 'ppn' ? ' maxlength="20" autocomplete="off" spellcheck="false"' : '') + '>';
      /* Travel in the same two-column shape as Profile: label above value, one pair per row */
      const cell = (lab, node) => { const d = document.createElement('div'); d.className = 'bvpc'; d.innerHTML = '<dt>' + lab + '</dt><dd></dd>';
        const dd = d.querySelector('dd'); if(typeof node === 'string') dd.innerHTML = node; else if(node) dd.appendChild(node); return d; };
      const pair = (...cells) => { const d = document.createElement('div'); d.className = 'bvpr2 bvtpr'; cells.forEach(x => d.appendChild(x)); return d; };
      const ddOf = r => { const dd = r && r.querySelector('dd'); if(!dd) return ''; const f = document.createDocumentFragment(); while(dd.firstChild) f.appendChild(dd.firstChild); return f; };
      const ins = r => r ? [...r.querySelectorAll('input')] : [];
      const [eD, eF] = ins(rE), [dD, dF] = ins(rD);
      const out = [
        pair(cell(L('Passport #', '여권 번호'), inp('ppn', 'e.g. 05A1234567', 'bvpp')), cell(L('Nationality', '국적'), '<input class="bvin bvcfrom bvnat" data-bk="' + e(c.id) + '" data-bf="nat" data-cpick="1" autocomplete="off" spellcheck="false" placeholder="' + L('Choose a country', '국가 선택') + '" value="' + e(ccFix(typeof capWord === 'function' ? capWord(String(c.nat || '').trim()) : (c.nat || ''))) + '"' + lock + '>')),
        pair(cell(L('Passport issued', '여권 발급일'), inp('ppi', 'DD/MM/YYYY')), cell(L('Passport expires', '여권 만료일'), inp('ppe', 'DD/MM/YYYY'))),
        pair(cell(L('Availability', '가능 기간'), ddOf(rA)),
          cell(L('Coming from', '출발 국가'), '<input class="bvin bvcfrom" data-bk="' + e(c.id) + '" data-bf="cfrom" data-cpick="1" autocomplete="off" spellcheck="false" placeholder="' + L('Choose a country', '국가 선택') + '" value="' + e(ccFix(c.cfrom)) + '"' + lock + '>')),
        pair(cell(L('Entry date', '입국일'), eD || ''), cell(L('Entry flight', '입국 항공편'), eF || '')),
        pair(cell(L('Departure date', '출국일'), dD || ''), cell(L('Departure flight', '출국 항공편'), dF || ''))
      ];
      /* the countries she has worked in (the card's COUNTRIES list, c.bn): chips to remove, a box to add one.
         They sit in Profile beside Experience - years on the left, countries on the right (user, 2026-11-06) */
      const cwCell = cell(L('Countries worked in', '활동 국가'), (function(){
          const bn = (typeof beenList === 'function' ? beenList(c) : []);
          return '<span class="bvbn">' + bn.map((x, i) => '<span class="bvbnc" title="' + e(ccFix(x.c) + (x.t ? ' · ' + x.t : '')) + '">' + e(ccFix(x.c)) + (x.t ? '<u>' + e(x.t) + '</u>' : '') +
            (ro ? '' : '<button type="button" class="bvbnx" data-bvbnx="' + e(c.id) + '|' + i + '" aria-label="' + L('Remove ', '삭제 ') + e(ccFix(x.c)) + '">×</button>') + '</span>').join('') +
            (ro ? '' : '<input class="bvin bvbnadd" data-cpick="1" data-cpadd="' + e(c.id) + '" autocomplete="off" spellcheck="false" placeholder="' + (bn.length ? L('+ add', '+ 추가') : L('+ add a country', '+ 국가 추가')) + '">') + '</span>';
        })());
      cwCell.classList.add('bvcw');
      dl.innerHTML = ''; out.forEach(x => dl.appendChild(x)); countryList();
      /* Profile's Nationality is the same field: same official name, same type-to-search list */
      /* Nationality is asked once, in Travel: Profile's copy goes and Experience takes its whole row */
      document.querySelectorAll('.bvside .bvsec--prof input[data-bf="nat"]').forEach(x => { const cl = x.closest('.bvpc'); if(cl && cl.parentElement && cl.parentElement.children.length > 1) cl.remove(); });
      document.querySelectorAll('.bvside .bvsec--prof input[data-bf="nat"]').forEach(x => { x.value = ccFix(x.value); x.dataset.cpick = '1'; x.classList.add('bvcfrom'); x.setAttribute('autocomplete', 'off'); x.placeholder = L('Choose a country', '국가 선택'); });
      dl.querySelectorAll('.bvfl').forEach(x => x.classList.add('bvflw'));
      /* Experience (left half) + Countries worked in (right half), in Profile */
      const exIn = document.querySelector('.bvside .bvsec--prof input[data-bf="exp"]');
      const exCell = exIn && exIn.closest('.bvpc');
      if(exCell && exCell.parentElement){
        const row = exCell.parentElement;
        [...row.children].forEach(x => { if(x !== exCell) x.remove(); });
        row.classList.add('bvexcw');
        row.appendChild(cwCell);
      } else {
        /* no Experience row to sit beside (should not happen): keep the list at the end of Travel */
        dl.appendChild(pair(cwCell));
      }
    }
    /* every country, for "Country" and "Coming from": the program's own list (the same one the card's
       COUNTRIES chips use), so a country is spelled the same everywhere - e.g. "Turkey", not "Türkiye" */
    function countryList(){
      if(document.getElementById('worldcc') || typeof WORLD === 'undefined') return;
      const dl = document.createElement('datalist'); dl.id = 'worldcc';
      dl.innerHTML = WORLD.map(n => '<option value="' + e(n) + '"></option>').join('');
      document.body.appendChild(dl);
    }
    /* the country names each state uses for itself (UN official names, as on its passport), plus
       the everyday names people type - so 'Turkey' finds Türkiye and 'South Korea' finds Republic of Korea */
    const OFFICIAL = ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia (Plurinational State of)", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei Darussalam", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Côte d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czechia", "Democratic People's Republic of Korea", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran (Islamic Republic of)", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Lao People's Democratic Republic", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia (Federated States of)", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands (Kingdom of the)", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Republic of Korea", "Republic of Moldova", "Romania", "Russian Federation", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syrian Arab Republic", "Tajikistan", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Türkiye", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom of Great Britain and Northern Ireland", "United Republic of Tanzania", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela (Bolivarian Republic of)", "Viet Nam", "Yemen", "Zambia", "Zimbabwe", "Holy See", "State of Palestine", "Kosovo", "Taiwan", "Hong Kong SAR, China", "Macao SAR, China"].sort((x, y) => x.localeCompare(y));
    const AKA = {"Türkiye": ["Turkey", "Turkiye", "Türkiye Cumhuriyeti", "Republic of Turkey"], "Republic of Korea": ["South Korea", "Korea", "Korea, South", "ROK", "대한민국", "한국"], "Democratic People's Republic of Korea": ["North Korea", "DPRK", "Korea, North"], "United States of America": ["USA", "US", "United States", "America", "U.S.A."], "United Kingdom of Great Britain and Northern Ireland": ["United Kingdom", "UK", "Great Britain", "Britain", "England", "Scotland", "Wales", "Northern Ireland"], "Russian Federation": ["Russia"], "Viet Nam": ["Vietnam"], "Iran (Islamic Republic of)": ["Iran"], "Syrian Arab Republic": ["Syria"], "Lao People's Democratic Republic": ["Laos", "Lao PDR"], "Republic of Moldova": ["Moldova"], "United Republic of Tanzania": ["Tanzania"], "Bolivia (Plurinational State of)": ["Bolivia"], "Venezuela (Bolivarian Republic of)": ["Venezuela"], "Brunei Darussalam": ["Brunei"], "Cabo Verde": ["Cape Verde"], "Côte d'Ivoire": ["Ivory Coast", "Cote d'Ivoire", "Cote dIvoire"], "Czechia": ["Czech Republic"], "Eswatini": ["Swaziland"], "North Macedonia": ["Macedonia"], "Netherlands (Kingdom of the)": ["Netherlands", "Holland", "The Netherlands"], "Micronesia (Federated States of)": ["Micronesia"], "Timor-Leste": ["East Timor"], "Myanmar": ["Burma"], "Democratic Republic of the Congo": ["DR Congo", "DRC", "Congo-Kinshasa"], "Congo": ["Republic of the Congo", "Congo-Brazzaville"], "State of Palestine": ["Palestine"], "Holy See": ["Vatican", "Vatican City"], "China": ["People's Republic of China", "PRC", "P.R. China"], "Taiwan": ["Republic of China", "Chinese Taipei"], "Hong Kong SAR, China": ["Hong Kong"], "Macao SAR, China": ["Macao", "Macau"], "Bahamas": ["The Bahamas"], "Gambia": ["The Gambia"], "Guinea-Bissau": ["Guinea Bissau"], "Sao Tome and Principe": ["São Tomé and Príncipe"], "United Arab Emirates": ["UAE", "Emirates"], "Kyrgyzstan": ["Kyrgyz Republic"], "Slovakia": ["Slovak Republic"]};
    const ckey = v => String(v || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.’']/g, '').replace(/\s+/g, ' ');
    const OFFKEY = new Map(); for(const n of OFFICIAL){ OFFKEY.set(ckey(n), n); for(const a of (AKA[n] || [])) OFFKEY.set(ckey(a), n); }
    /* Experience holds the time only; countries written into it ("5 years (Japan, Korea, Italy, France)")
       go to Countries worked in (decided 1.2.89; cards filled before that, or typed by hand, are moved
       here when the card is opened or Experience is edited). Only names the country list knows are
       moved; anything else stays in Experience as written. */
    function splitExp(c){
      const ex = String(c && c.exp || ''); if(!ex.trim()) return false;
      const found = [];
      for(const seg of ex.split(/[(),;:\/\n]|\band\b|&|·/i)){
        const t = seg.trim().replace(/^(in|incl\.?|including)\s+/i, ''); if(t.length < 2) continue;
        const off = OFFKEY.get(ckey(t)); if(off) found.push([t, off]);
      }
      if(!found.length) return false;
      let rest = ex;
      for(const [t] of found) rest = rest.replace(t, '');
      rest = rest.replace(/(^|\s)(and|&)(?=\s|$|[,;:)])/gi, ' ').replace(/\(\s*[,;·\s]*\)/g, '').replace(/\(\s*[,;·\s]*$/g, '').replace(/[,;·]\s*(?=[,;·)]|$)/g, '').replace(/\(\s*[,;·]+/g, '(').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s{2,}/g, ' ').replace(/^[\s,;:·]+|[\s,;:·(]+$/g, '').trim();
      const list = beenList(c);
      for(const [, off] of found) if(!list.some(x => ccFix(x.c) === off)) list.push({c: off, t: ''});
      c.bn = list; c.exp = rest;
      try{ saveBook(c.id, true); }catch(e){}
      return true;
    }
    window.__illuSplitExp = c => splitExp(c);
    document.addEventListener('change', ev => {
      const t = ev.target; if(!t || !t.matches || !t.matches('input[data-bf="exp"],textarea[data-bf="exp"]')) return;
      setTimeout(() => { const c = BOOK.get(t.dataset.bk || (typeof bv !== 'undefined' && bv && bv.id)); if(c && splitExp(c)){ try{ renderBook(); }catch(e){} try{ bvSideRefresh(true); }catch(e){} } }, 0);
    });
    const ccFix = v => { const t = String(v || '').trim(); return OFFKEY.get(ckey(t)) || t; };
    /* Nationality and Coming from: a type-to-search country list of our own (the built-in one could
       not be scrolled while searching). Type to narrow it, scroll it with the wheel, arrows + Enter or a
       click to pick, Esc to close. A typed spelling (turkiye, usa, uk ...) is folded onto the list's name. */
    let pk = null, pkIn = null, pkAt = -1;
    const pkClose = () => { if(pk){ pk.remove(); pk = null; } pkIn = null; pkAt = -1; };
    /* adding a country to the worked-in list (official name; the same country twice is kept once) */
    window.__illuCcFix = v => ccFix(v);                    // the official country name (used by Fill from Claude's answer)
    function bnAdd(id, v){
      v = ccFix(v).slice(0, 40); if(!v) return;
      const c = BOOK.get(id); if(!c) return;
      if(!(typeof SIGNED === 'function' && SIGNED())){ try{ nudgeSignIn(); }catch(err){} return; }
      const list = beenList(c);
      if(!list.some(x => ccFix(x.c) === v && !x.t)) list.push({c: v, t: ''});
      c.bn = list; saveBook(c.id, true);
      try{ renderBook(); }catch(err){} try{ bvSideRefresh(true); }catch(err){}
      setTimeout(() => { const n = document.querySelector('.bvside .bvbnadd'); if(n) try{ n.focus({preventScroll: true}); }catch(err){} }, 60);
    }
    document.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('[data-bvbnx]'); if(!b) return; ev.preventDefault(); ev.stopPropagation();
      const [id, i] = b.dataset.bvbnx.split('|'); const c = BOOK.get(id); if(!c) return;
      if(!(typeof SIGNED === 'function' && SIGNED())){ try{ nudgeSignIn(); }catch(err){} return; }
      const list = beenList(c); list.splice(+i, 1); c.bn = list; saveBook(c.id, true);
      try{ renderBook(); }catch(err){} try{ bvSideRefresh(true); }catch(err){} }, true);
    const pkSet = (inp, v) => { if(inp.readOnly) return;
      if(inp.dataset.cpadd){ inp.value = ''; if(String(v || '').trim()) bnAdd(inp.dataset.cpadd, v); return; }
      inp.value = v; inp.dispatchEvent(new Event('input', {bubbles: true}));
      /* the same field elsewhere in the panel (Nationality also sits in Profile) shows it at once */
      document.querySelectorAll('.bvside input[data-bk="' + inp.dataset.bk + '"][data-bf="' + inp.dataset.bf + '"]').forEach(x => { if(x !== inp) x.value = v; }); };
    /* matches: names that start with what was typed, then everyday names that do (shown beside it), then
       names containing it */
    const pkList = q => { const k = ckey(q); if(!k) return OFFICIAL.map(n => ({n}));
      const st = [], ak = [], inn = [];
      for(const n of OFFICIAL){ const l = ckey(n); const a = (AKA[n] || []).find(x => ckey(x).startsWith(k));
        if(l.startsWith(k)) st.push({n}); else if(a) ak.push({n, a}); else if(l.includes(k) || (AKA[n] || []).some(x => ckey(x).includes(k))) inn.push({n}); }
      return st.concat(ak, inn); };
    const pkMark = () => { if(!pk) return; [...pk.children].forEach((o, i) => o.classList.toggle('on', i === pkAt));
      const o = pk.children[pkAt]; if(o){ const top = o.offsetTop, bot = top + o.offsetHeight; if(top < pk.scrollTop) pk.scrollTop = top; else if(bot > pk.scrollTop + pk.clientHeight) pk.scrollTop = bot - pk.clientHeight; } };
    const pkOpen = (inp, all) => {
      if(inp.readOnly) return;
      if(!pk){ pk = document.createElement('div'); pk.className = 'bvcpick'; pk.setAttribute('role', 'listbox'); document.body.appendChild(pk);
        pk.addEventListener('pointerdown', ev => { ev.preventDefault(); const o = ev.target.closest('[data-cp]'); if(o && pkIn){ const i = pkIn; pkSet(i, o.dataset.cp); pkClose(); i.blur(); } }); }
      pkIn = inp;
      const names = pkList(all ? '' : inp.value);
      pk.innerHTML = names.length ? names.map(x => '<div class="bvcpo" data-cp="' + e(x.n) + '" title="' + e(x.n) + '">' + e(x.n) + (x.a ? '<small>' + e(x.a) + '</small>' : '') + '</div>').join('') : '<div class="bvcpx">' + (KO() ? '일치하는 국가 없음' : 'No country matches') + '</div>';
      const cur = names.findIndex(x => x.n === inp.value); pkAt = all ? cur : (names.length ? 0 : -1);
      const r = inp.getBoundingClientRect(), h = Math.min(240, names.length * 30 + 8 || 38);
      const below = innerHeight - r.bottom - 8 >= h || r.top < h + 8;
      pk.style.left = Math.round(Math.min(r.left - 6, innerWidth - Math.max(r.width + 12, 200) - 8)) + 'px';
      pk.style.width = Math.round(Math.max(r.width + 12, 200)) + 'px';
      pk.style.top = Math.round(below ? r.bottom + 4 : r.top - h - 4) + 'px';
      pk.style.maxHeight = '240px';
      pk.scrollTop = 0; pkMark();
    };
    document.addEventListener('focusin', ev => { const t = ev.target; if(t && t.dataset && t.dataset.cpick){ t.__cpOld = t.value; pkOpen(t, true); } });
    document.addEventListener('pointerdown', ev => { const t = ev.target; if(t && t.dataset && t.dataset.cpick && document.activeElement === t && !pk) pkOpen(t, true); });
    document.addEventListener('input', ev => { const t = ev.target; if(t && t.dataset && t.dataset.cpick && ev.isTrusted) pkOpen(t, false); });
    document.addEventListener('keydown', ev => {
      const t = ev.target; if(!t || !t.dataset || !t.dataset.cpick) return;
      if(!pk && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')){ pkOpen(t, true); ev.preventDefault(); return; }
      if(!pk) return;
      const n = pk.querySelectorAll('[data-cp]').length;
      if(ev.key === 'ArrowDown'){ pkAt = Math.min(n - 1, pkAt + 1); pkMark(); ev.preventDefault(); }
      else if(ev.key === 'ArrowUp'){ pkAt = Math.max(0, pkAt - 1); pkMark(); ev.preventDefault(); }
      else if(ev.key === 'Enter'){ const o = pk.querySelectorAll('[data-cp]')[pkAt]; if(o){ pkSet(t, o.dataset.cp); } pkClose(); t.blur(); ev.preventDefault(); ev.stopPropagation(); }
      else if(ev.key === 'Escape'){ if(t.__cpOld != null && t.value !== t.__cpOld) pkSet(t, t.__cpOld); pkClose(); t.blur(); ev.preventDefault(); ev.stopPropagation(); }
    }, true);
    document.addEventListener('focusout', ev => { const t = ev.target; if(!t || !t.dataset || !t.dataset.cpick) return;
      if(pkIn === t) pkClose();
      /* "+ add": only a real country is added - a few letters typed and left are cleared, not added */
      if(t.dataset.cpadd){ const k = OFFKEY.get(ckey(t.value)); if(k) pkSet(t, k); else t.value = ''; return; }
      const v = ccFix(t.value); if(v !== t.value) pkSet(t, v);
      else if(t.value !== t.__cpOld) pkSet(t, t.value); });
    addEventListener('resize', pkClose); document.addEventListener('scroll', ev => { if(pk && !pk.contains(ev.target)) pkClose(); }, true);
    /* Nationality in Profile and Travel are the same field: typing in one shows in the other */
    document.addEventListener('input', ev => { const t = ev.target; if(!t || !t.matches || !t.matches('.bvside input[data-bf="nat"]') || t.dataset.cpick) return;
      document.querySelectorAll('.bvside input.bvnat[data-bk="' + t.dataset.bk + '"]').forEach(x => { x.value = t.value; }); });
    /* the passport number keeps letters and digits only, in capitals */
    document.addEventListener('input', ev => {
      const t = ev.target; if(!t || !t.classList || !t.classList.contains('bvpp')) return;
      const v = t.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if(v !== t.value){ const p = t.selectionStart; t.value = v; try{ t.setSelectionRange(Math.min(p, v.length), Math.min(p, v.length)); }catch(err){} }
    }, true);
    /* every row in the panel gets the same height: the free height is shared evenly between all the
       rows of Next step, Measurements, Profile and Travel (never below a readable minimum; a small
       window scrolls instead) */
    /* Rows at a comfortable, fixed height again and the panel scrolls (user, 2026-11-06: "I don't want
       anything to look condensed, so let's revert back to being able to scroll up and down").
       The squeeze-everything-to-fit layout below (evenRows) is no longer used. */
    const ROWH = 48;
    function roomyRows(){
      const pr = document.querySelector('.bvside .bvprof:not(.bvdet)'); if(!pr) return;
      pr.classList.remove('bvtight'); pr.classList.add('bvroomy');
      pr.style.setProperty('--bvrow', ROWH + 'px');
      [...pr.children].forEach(sc => { if(sc.classList.contains('bvsec')) sc.style.setProperty('--bvw', 1); });
    }
    function evenRows(){
      const pr = document.querySelector('.bvside .bvprof:not(.bvdet)'); if(!pr) return;
      const secs = [...pr.children].filter(x => x.classList.contains('bvsec')); if(!secs.length) return;
      let units = 0, fixed = 0;
      const cs = getComputedStyle(pr); fixed += parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      secs.forEach((sc, i) => {
        const h = sc.querySelector('.bvsech'); fixed += h ? h.offsetHeight : 0;
        if(i < secs.length - 1) fixed += parseFloat(getComputedStyle(sc).marginBottom) || 0;
        fixed += 2;                                              // the section's border
        const dl = sc.querySelector(':scope > dl'); const mx = sc.querySelector('.bvpmx');
        /* weights: Travel gets a little more height per row, Next step, Measurements and Profile a little less */
        const w = 1;                                            // every row in every section the same height (user, 2026-11-04)
        sc.style.setProperty('--bvw', w);
        sc.__u = (dl ? dl.children.length : mx ? 2 : 1.25) * w;
        units += sc.__u;
      });
      /* first guess, then correct by what is really left over (paddings and borders inside the sections) */
      /* a row never gets shorter than its label + value need (40px normally, 31px in the tighter
         setting used on short windows); below that the panel scrolls instead of squeezing text together */
      let raw = Math.floor((pr.clientHeight - fixed) / units);
      if(pr.classList.contains('bvtight') !== (raw < 36)){
        pr.classList.toggle('bvtight', raw < 36);
        /* the tighter setting also shortens the section headers and gaps: measure those again */
        fixed = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        secs.forEach((sc, i) => { const h = sc.querySelector('.bvsech'); fixed += (h ? h.offsetHeight : 0) + 2 + (i < secs.length - 1 ? (parseFloat(getComputedStyle(sc).marginBottom) || 0) : 0); });
      }
      const MIN = raw < 36 ? 30 : 36;
      if(raw < 36){ units = 0; secs.forEach(sc => { sc.style.setProperty('--bvw', 1); const dl = sc.querySelector(':scope > dl'); const mx = sc.querySelector('.bvpmx'); units += dl ? dl.children.length : mx ? 2 : 1.25; }); }   // tight: every row the same
      let per = Math.max(MIN, Math.floor((pr.clientHeight - fixed) / units));
      const contentH = () => { const last = pr.lastElementChild; if(!last) return 0;
        return last.getBoundingClientRect().bottom - pr.getBoundingClientRect().top + pr.scrollTop + parseFloat(cs.paddingBottom); };
      for(let k = 0; k < 5; k++){
        pr.style.setProperty('--bvrow', per + 'px');
        const d = pr.clientHeight - contentH();                    // > 0: room left, < 0: too tall
        if(d >= 0 && d < units) break;
        const np = Math.max(MIN, Math.floor(per + d / units));
        if(np === per){ if(d < 0 && per > MIN){ per--; continue; } break; }
        per = np;
      }
    }
    let evenRO = null;
    const watch = () => roomyRows();
    const _d = bvDraw; bvDraw = function(){ const r = _d.apply(this, arguments); try{ passport(); watch(); }catch(err){} return r; };
    const _s = bvDrawSide; bvDrawSide = function(){ const r = _s.apply(this, arguments); try{ passport(); watch(); }catch(err){} return r; };
  })();
  /* ---------- Booking card: the side panel button closes and opens the panel (user, 2026-11-04) ----------
     Closed, the photo display takes the whole width; a tab at the same top-right spot opens it again.
     Remembered on this computer. (It used to widen the panel instead.) */
  (function(){
    if(typeof bvSideWBtn !== 'function' || typeof bvEl === 'undefined' || !bvEl) return;
    const KO = () => typeof LANG !== 'undefined' && LANG === 'ko';
    const IC_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7l5 5-5 5M14 12H5M19 5v14"/></svg>';
    const IC_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 7 5 12l5 5M5 12h9M19 5v14"/></svg>';
    bvEl.classList.remove('bvsidewide');
    try{ localStorage.removeItem('illum.bvsidew'); if(localStorage.getItem('illum.bvsideoff') === '1') bvEl.classList.add('bvsideoff'); }catch(e){}
    const tCl = () => KO() ? '패널 닫기' : 'Close the panel', tOp = () => KO() ? '패널 열기' : 'Open the panel';
    bvSideWBtn = function(){ return '<button type="button" class="bvsw" data-bvsidew title="' + tCl() + '" aria-label="' + tCl() + '" aria-expanded="true">' + IC_CLOSE + '</button>'; };
    function tab(){
      const body = bvEl.querySelector('.bvbody'); if(!body) return null;
      let t = body.querySelector(':scope > .bvsidetab');
      if(!t){ t = document.createElement('button'); t.type = 'button'; t.className = 'bvsidetab'; t.setAttribute('data-bvsideopen', ''); t.innerHTML = IC_OPEN; body.appendChild(t); }
      t.title = tOp(); t.setAttribute('aria-label', tOp()); return t;
    }
    bvSideWide = function(){
      const off = !bvEl.classList.contains('bvsideoff');
      bvEl.classList.toggle('bvsideoff', off);
      try{ localStorage.setItem('illum.bvsideoff', off ? '1' : '0'); }catch(e){}
      tab();
      if(!off) try{ bvSideRefresh(true); }catch(e){}
      try{ if(bv && bv.view !== 'm' && bvPhotoEl()) setTimeout(bvZoomApply, 60); }catch(e){}
      const f = off ? bvEl.querySelector('.bvsidetab') : bvEl.querySelector('[data-bvsidew]'); if(f) try{ f.focus({preventScroll: true}); }catch(e){}
    };
    document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-bvsideopen]'); if(!t) return; e.preventDefault(); e.stopPropagation(); bvSideWide(); }, true);
    tab();
  })();
  /* ---------- Atlas: the agencies panel opens and closes from a tab on its edge (user, 2026-11-04) ----------
     the same tab as the Directory's list: › tucks the panel away so the map fills the width, ‹ brings it back.
     Remembered on this computer. */
  (function(){
    const KEY = 'illu.atlsideoff';
    function put(){
      const atl = document.querySelector('.atl'), side = document.getElementById('atlside');
      if(!atl || !side){ setTimeout(put, 400); return; }
      let off = false; try{ off = localStorage.getItem(KEY) === '1'; }catch(e){}
      let t = atl.querySelector(':scope > .atltog');
      if(!t){ t = document.createElement('button'); t.type = 'button'; t.className = 'atltog'; atl.appendChild(t); }
      let draw = () => {
        const o = atl.classList.contains('atlsideoff');
        t.setAttribute('aria-expanded', String(!o));
        t.title = o ? 'Show the agencies panel' : 'Hide the agencies panel to see more of the map';
        t.innerHTML = o ? '<span class="atltogi">‹</span><span class="atltogl">Agencies</span>' : '<span class="atltogi">›</span>';
      };
      /* the tab follows the panel's real width (and hides when the window stacks map and panel) */
      const place = () => { const o = atl.classList.contains('atlsideoff');
        const cols = getComputedStyle(atl).gridTemplateColumns.split(' ').filter(Boolean).length;
        t.style.display = (!o && cols < 2) ? 'none' : '';
        t.style.right = o ? '0px' : (side.offsetWidth + 'px'); };
      const _draw = draw; draw = () => { _draw(); place(); };
      if(window.ResizeObserver) new ResizeObserver(place).observe(atl);
      atl.classList.toggle('atlsideoff', off); draw();
      t.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        const o = !atl.classList.contains('atlsideoff');
        atl.classList.toggle('atlsideoff', o); draw();
        try{ localStorage.setItem(KEY, o ? '1' : '0'); }catch(err){}
        /* the map takes the new width and frames the same place again */
        try{ window.dispatchEvent(new Event('resize')); }catch(err){}
      });
    }
    put();
  })();
  /* ---------- Work log: a notepad for each day (user, 2026-11-04) ----------
     A switch under the calendar: Work log | Notes. Notes shows a notepad for the day picked on the
     calendar (today when none is picked); every day can be picked for notes, even one with nothing
     logged. Days with a note get a small dot on the calendar. Saved as you type to dnotes/<id>_<day>. */
  (function(){
    if(typeof renderLog !== 'function') return;
    const rail = document.getElementById('rail'), cal = document.getElementById('lcal'); if(!rail || !cal) return;
    const KO = () => typeof LANG !== 'undefined' && LANG === 'ko';
    const L = (en, ko) => KO() ? ko : en;
    const N = {mode: 'log', notes: new Map(), loaded: false, day: '', t: 0};
    try{ N.mode = localStorage.getItem('illu.railmode') === 'note' ? 'note' : 'log'; }catch(e){}
    const seg = document.createElement('div'); seg.className = 'lmode'; seg.setAttribute('role', 'tablist');
    seg.innerHTML = '<button type="button" data-lm="log" role="tab"></button><button type="button" data-lm="note" role="tab"></button>';
    cal.after(seg);
    const pad = document.createElement('div'); pad.className = 'lnote'; pad.hidden = true;
    pad.innerHTML = '<div class="lnhd"><b class="lnday"></b><span class="lnsaved" aria-live="polite"></span></div><textarea class="lnta" spellcheck="true"></textarea><div class="lnfoot"></div>';
    const foot = rail.querySelector('.lfoot'); (foot || rail).before ? (foot ? foot.before(pad) : rail.appendChild(pad)) : rail.appendChild(pad);
    const ta = pad.querySelector('.lnta');
    const todayIso = () => (typeof localDay === 'function' ? localDay(new Date()) : new Date().toISOString().slice(0, 10));
    const curDay = () => (typeof lday !== 'undefined' && lday) || todayIso();
    const signed = () => typeof SIGNED === 'function' && SIGNED() && typeof ME !== 'undefined' && ME;
    const nice = d => { try{ const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString(KO() ? 'ko-KR' : 'en-GB', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}); }catch(e){ return d; } };
    async function load(){
      if(N.loaded || typeof DB === 'undefined' || !DB || !signed()) return;
      N.loaded = true;
      try{
        const snap = await DB.collection('dnotes').limit(10000).get();
        for(const d of ((snap && snap.docs) ? snap.docs : (snap || []))){
          const v = docOf(d), id = String(d.id || (v && v.id) || '');
          if(!v || (v.pid && v.pid !== ME) || (!v.pid && !id.startsWith(ME + '_'))) continue;
          if(v.day) N.notes.set(v.day, String(v.t || ''));
        }
      }catch(e){ N.loaded = false; }
      after();
    }
    /* one waiting save per day: typing on another day, or Refresh, never drops the last words */
    const WAIT = new Map();                  // day -> {t: timer, text}
    async function write(day, text){
      try{ await DB.doc('dnotes/' + ME + '_' + day).set({pid: ME, day, t: text, at: new Date().toISOString()});
        pad.querySelector('.lnsaved').textContent = L('Saved', '저장됨'); }
      catch(e){ pad.querySelector('.lnsaved').textContent = L('Could not save - it will try again as you type', '저장하지 못했습니다'); }
      dots();
    }
    function save(day, text){
      if(!signed() || !DB) return;
      N.notes.set(day, text);
      pad.querySelector('.lnsaved').textContent = L('Saving…', '저장 중…');
      const w = WAIT.get(day); if(w) clearTimeout(w.t);
      WAIT.set(day, {text, t: setTimeout(() => { WAIT.delete(day); write(day, text); }, 600)});
    }
    /* anything still waiting is written now (before Refresh rebuilds the page) */
    window.__illuNotesFlush = () => Promise.all([...WAIT].map(([day, w]) => { clearTimeout(w.t); WAIT.delete(day); return write(day, w.text); }));
    function dots(){
      cal.querySelectorAll('button[data-d]').forEach(b => {
        const has = !!(N.notes.get(b.dataset.d) || '').trim();
        b.classList.toggle('ntd', has);
        if(N.mode === 'note'){ b.disabled = false; if(!b.classList.contains('has')) b.title = b.dataset.d + (has ? L(' — note', ' — 메모') : L(' — no note yet', '')); }
      });
      if(N.mode === 'note') cal.querySelectorAll('button.calnav').forEach(b => { b.disabled = false; });
    }
    function after(){
      const note = N.mode === 'note';
      seg.querySelector('[data-lm="log"]').textContent = L('Work log', '작업 기록');
      seg.querySelector('[data-lm="note"]').textContent = L('Notes', '메모');
      seg.querySelectorAll('button').forEach(b => { const on = b.dataset.lm === N.mode; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-selected', String(on)); });
      ['lchips', 'lstat', 'llist'].forEach(id => { const el = document.getElementById(id); if(el) el.hidden = note; });
      if(foot) foot.hidden = note;
      pad.hidden = !note;
      const day = curDay();
      pad.querySelector('.lnday').textContent = nice(day) + (day === todayIso() ? L(' · today', ' · 오늘') : '');
      ta.placeholder = L('Write anything to remember for this day…', '이 날 기억할 내용을 적어 두세요…');
      ta.readOnly = !signed();
      pad.querySelector('.lnfoot').textContent = signed() ? L('Only you see your notes. Pick another day on the calendar for its page.', '메모는 본인만 봅니다. 달력에서 다른 날을 고르면 그날의 메모가 열립니다.') : L('Sign in to write notes.', '메모를 쓰려면 로그인하세요.');
      if(day !== N.day || document.activeElement !== ta){ if(day !== N.day) pad.querySelector('.lnsaved').textContent = ''; N.day = day; ta.value = N.notes.get(day) || ''; }
      dots();
      if(note) load();
    }
    ta.addEventListener('input', () => save(N.day, ta.value));
    seg.addEventListener('click', e => {
      const b = e.target.closest('[data-lm]'); if(!b) return;
      N.mode = b.dataset.lm; try{ localStorage.setItem('illu.railmode', N.mode); }catch(err){}
      after(); if(N.mode === 'note') setTimeout(() => { try{ ta.focus({preventScroll: true}); }catch(err){} }, 30);
    });
    /* a day without log entries can be picked for its notes */
    cal.addEventListener('click', e => {
      if(N.mode !== 'note') return;
      const d = e.target.closest && e.target.closest('button[data-d]');
      if(d && !d.classList.contains('has')){ e.stopImmediatePropagation(); try{ lday = (lday === d.dataset.d) ? null : d.dataset.d; if(lday) lmonth = null; }catch(err){} renderLog(); }
      const nv = e.target.closest && e.target.closest('button.calnav');
      if(nv){ e.stopImmediatePropagation(); try{ const n = calY * 12 + calM + (+nv.dataset.go); calY = Math.floor(n / 12); calM = ((n % 12) + 12) % 12; if(String(calY) !== lyear){ lyear = String(calY); lmonth = null; lday = null; } }catch(err){} renderLog(); }
    }, true);
    const _rl = renderLog;
    renderLog = function(){ const r = _rl.apply(this, arguments); try{ after(); }catch(e){} return r; };
    after(); load();
  })();
  /* ---------- one "Full screen" button for every board (Directory board, Recommendations, Atlas) ----------
     the same four-corner mark, label and place in the board's own header; Esc always comes back */
  (function(){
    const IN = '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', OUT = '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>';
    function atl(){
      const map = document.getElementById('atlmap'), box = map && map.closest('.atl');
      if(!map || !box || typeof window.atlasSetMax !== 'function'){ setTimeout(atl, 500); return; }
      let b = map.querySelector(':scope > .atlfs');
      if(!b){ b = document.createElement('button'); b.type = 'button'; b.className = 'illufs atlfs'; map.appendChild(b);
        b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); window.atlasSetMax(!box.classList.contains('atlmax')); }); }
      const draw = () => { const on = box.classList.contains('atlmax');
        b.setAttribute('aria-pressed', String(on)); b.title = on ? 'Exit full screen (Esc)' : 'Show the Atlas on the whole screen';
        b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (on ? OUT : IN) + '</svg><span>' + (on ? 'Exit full screen' : 'Full screen') + '</span>'; };
      draw(); new MutationObserver(draw).observe(box, {attributes: true, attributeFilter: ['class']});
    }
    atl();
  })();
  /* the page's own background colour (it differs per theme), for things that must sit on the same ground */
  /* (written only when it changes, and only theme changes are watched: it used to set itself off again
     and again, three times a second, for as long as the program ran) */
  (function(){ let last = ''; const upd = () => { try{ const c = getComputedStyle(document.body).backgroundColor; if(c !== last){ last = c; document.documentElement.style.setProperty('--illupagebg', c); } }catch(e){} };
    upd(); setTimeout(upd, 600); const mo = new MutationObserver(() => setTimeout(upd, 300));
    mo.observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'data-theme']}); mo.observe(document.body, {attributes: true, attributeFilter: ['class', 'data-theme']}); })();
  /* ---------- Lumen / Communicatus: Full screen, the same button as the other boards ---------- */
  (function(){
    const IN = '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', OUT = '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>';
    const pane = document.getElementById('pane-lit'); if(!pane) return;
    const on = () => document.body.classList.contains('litfull');
    function put(){
      const bar = pane.querySelector('.board'); if(!bar) return;
      let b = bar.querySelector(':scope > .litfs');
      if(!b){ b = document.createElement('button'); b.type = 'button'; b.className = 'illufs litfs'; bar.appendChild(b); }
      const f = on(); b.setAttribute('aria-pressed', String(f)); b.title = f ? 'Exit full screen (Esc)' : 'Show this page on the whole screen';
      const h = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (f ? OUT : IN) + '</svg><span>' + (f ? 'Exit full screen' : 'Full screen') + '</span>';
      if(b.innerHTML !== h) b.innerHTML = h;
    }
    function set(f){ document.body.classList.toggle('litfull', !!f); put(); if(!f) try{ window.scrollTo(0, 0); }catch(e){} }
    document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.litfs'); if(!b) return; e.preventDefault(); e.stopPropagation(); set(!on()); }, true);
    document.addEventListener('keydown', e => {
      if(e.key !== 'Escape' || !on()) return;
      const a = document.activeElement; if(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
      if(typeof bvEl !== 'undefined' && bvEl && !bvEl.hidden) return;            // a booking card open on top goes first
      set(false);
    });
    /* the bar is redrawn with the list: put the button back each time; leave full screen with the page */
    new MutationObserver(() => put()).observe(pane, {childList: true, subtree: false});
    const lm = document.getElementById('lmain'); if(lm) new MutationObserver(() => put()).observe(lm, {childList: true});
    setInterval(() => { if(on() && pane.hidden) set(false); }, 700);
    put();
  })();
  /* ---------- Full screen on every tab (user, 2026-11-04) ----------
     One button in the top bar, on every tab. It does the same as the page's own Full screen where a page
     has one (Atlas, Suggestiones, Lumen/Communicatus, Directory = Maximize) and otherwise lifts the tab's
     page over the whole window. Esc, the same button, or the "Exit full screen" pill bring it back. */
  (function(){
    const IN = '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', OUT = '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>';
    const V = () => (typeof VIEW !== 'undefined' ? VIEW : '');
    const atlBox = () => { const m = document.getElementById('atlmap'); return m && m.closest('.atl'); };
    const OWN = {
      atl: {get: () => { const b = atlBox(); return !!(b && b.classList.contains('atlmax')); }, set: on => { if(window.atlasSetMax) atlasSetMax(on); }},
      arr: {get: () => !!(window.__rcFull && __rcFull()), set: on => { if(window.__rcFull) __rcFull(on); }},
      lit: {get: () => document.body.classList.contains('litfull'), set: on => { const b = document.querySelector('.litfs'); if(b && on !== document.body.classList.contains('litfull')) b.click(); else document.body.classList.toggle('litfull', on); }},
      dir: {get: () => !!(window.__d2Max && __d2Max()), set: on => { if(window.__d2Max) __d2Max(on); }}
    };
    OWN.com = OWN.lit;
    const gen = {get: () => document.body.classList.contains('illupf'), set: on => { document.body.classList.toggle('illupf', on); document.body.dataset.pfv = on ? V() : ''; try{ dispatchEvent(new Event('resize')); }catch(e){} }};
    const cur = () => OWN[V()] || gen;
    const isOn = () => cur().get();
    function set(on){ cur().set(!!on); paint(); }
    window.illuFullScreen = set;
    let btn = null, pill = null;
    /* drawn again only when the state changes (it was redrawn twice a second, which woke every
       page watcher and put the button's English title back over the Korean one) */
    let painted = null;
    function paint(){
      const on = isOn();
      if(btn && painted !== on){
        painted = on;
        btn.setAttribute('aria-pressed', String(on)); const t = on ? 'Exit full screen (Esc)' : 'Full screen'; btn.title = t; btn.setAttribute('aria-label', t);
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (on ? OUT : IN) + '</svg>'; }
      const ph = !(on && cur() === gen);
      if(pill && pill.hidden !== ph) pill.hidden = ph;
    }
    function put(){
      const abr = document.querySelector('#appbar .abr'); if(!abr){ setTimeout(put, 400); return; }
      btn = document.createElement('button'); btn.type = 'button'; btn.className = 'abib abfs'; abr.insertBefore(btn, abr.firstChild);
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); set(!isOn()); });
      pill = document.createElement('button'); pill.type = 'button'; pill.className = 'illufs illupfx'; pill.hidden = true;
      pill.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + OUT + '</svg><span>Exit full screen</span>';
      pill.addEventListener('click', () => set(false)); document.body.appendChild(pill);
      paint();
    }
    put();
    document.addEventListener('keydown', e => {
      if(e.key !== 'Escape' || !gen.get()) return;
      const a = document.activeElement; if(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
      if(typeof bvEl !== 'undefined' && bvEl && !bvEl.hidden) return;
      gen.set(false); paint();
    });
    /* changing tab leaves the generic full screen; the page buttons and this one always agree */
    let lastV = V();
    setInterval(() => { const v = V(); if(v !== lastV){ if(gen.get()) gen.set(false); lastV = v; } paint(); }, 500);
  })();
  const css = document.createElement('style');
  css.textContent = `
/* Atlas: the search card as wide as the clock above it, and level with the map */
body[data-view="atl"] .shell>.side{padding-right:0!important;padding-top:4px!important}
.mkkey b:not([class]){width:auto!important;height:auto!important;border-radius:0!important;display:inline!important;background:none!important;box-shadow:none!important;font-weight:700;color:inherit}
/* Booking card fold tab (the down arrow beside OPEN): light plum instead of grey, in the page's own accent */
.bkfoldtab{background:color-mix(in srgb,var(--acc) 12%,var(--surf));border-color:color-mix(in srgb,var(--acc) 30%,var(--line));color:var(--acc)}
.bkfoldtab::before{border-left-color:color-mix(in srgb,var(--acc) 30%,var(--line));border-right-color:color-mix(in srgb,var(--acc) 30%,var(--line))}
.bkfoldtab:hover{background:color-mix(in srgb,var(--acc) 22%,var(--surf));color:var(--acc)}

/* Travel: countries worked in - chips in one line (scrolls sideways when there are many), then the add box */
.bvside .bvbn{display:flex;align-items:center;gap:5px;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;white-space:nowrap}
.bvside .bvbn::-webkit-scrollbar{display:none}
.bvside .bvbnc{flex:none;display:inline-flex;align-items:center;gap:3px;height:20px;padding:0 4px 0 9px;border-radius:999px;font-size:12px;line-height:20px;color:var(--ink);
  background:color-mix(in srgb,var(--acc) 7%,var(--surf));border:1px solid color-mix(in srgb,var(--acc) 18%,var(--line))}
.bvside .bvbnc u{text-decoration:none;color:var(--mut);font-size:11px;margin-left:3px}
.bvside .bvbnx{width:16px;height:16px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--mut);font-size:13px;line-height:16px;cursor:pointer}
.bvside .bvbnx:hover{background:color-mix(in srgb,var(--acc) 16%,transparent);color:var(--acc)}
.bvside.bvside .bvsec .bvpl .bvbnadd.bvbnadd{flex:1 0 90px;min-width:90px;width:auto!important;padding-right:0!important;background:none!important}
/* Atlas: agencies panel tab (open: on the panel's edge; closed: on the map's right edge) */
.atl{position:relative}
.atltog{position:absolute;z-index:20;right:370px;top:50%;transform:translateY(-50%);width:17px;padding:10px 0 9px;border:1px solid var(--line);border-right:0;border-radius:10px 0 0 10px;
  background:var(--surf,#fff);color:var(--acc,#6b2a63);font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;box-shadow:-3px 2px 8px rgba(27,23,36,.1)}
.atltog:hover{background:var(--acc,#6b2a63);color:#fff;border-color:var(--acc,#6b2a63)}
.atltogi{font-size:17px;line-height:1;font-weight:600}
.atltogl{writing-mode:vertical-rl;transform:rotate(180deg);font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.atl.atl.atlsideoff{grid-template-columns:minmax(0,1fr)!important;column-gap:0!important}
.atl.atlsideoff #atlside{display:none!important}
.atl.atlsideoff .atltog{right:0}
/* Work log | Notes */
.lmode{display:flex;margin:10px 13px 0;padding:3px;border-radius:10px;background:var(--surf2);border:1px solid var(--line)}
.lmode button{flex:1;height:28px;border:0;border-radius:8px;background:transparent;color:var(--mut);font:600 12px var(--sans);cursor:pointer}
.lmode button[aria-pressed="true"]{background:var(--surf);color:var(--acc);box-shadow:0 1px 3px rgba(27,23,36,.12)}
.lnote{flex:1;display:flex;flex-direction:column;min-height:220px;padding:10px 13px 12px;gap:8px}
.lnote[hidden]{display:none!important}
.lnhd{display:flex;align-items:baseline;gap:8px}
.lnhd b{font:600 13px var(--sans);color:var(--ink)}
.lnsaved{margin-left:auto;font-size:11px;color:var(--faint)}
.lnta{flex:1;min-height:180px;resize:none;border:1px solid var(--line);border-radius:10px;padding:12px 13px;font:14px/1.6 var(--sans);color:var(--ink);
  background:repeating-linear-gradient(transparent 0 calc(1.6em - 1px),color-mix(in srgb,var(--acc) 9%,transparent) calc(1.6em - 1px) 1.6em) var(--surf);background-attachment:local;background-position:0 12px;outline:none}
.lnta:focus{border-color:color-mix(in srgb,var(--acc) 45%,var(--line));box-shadow:0 0 0 3px color-mix(in srgb,var(--acc) 12%,transparent)}
.lnta::placeholder{color:var(--faint);font-style:italic}
.lnfoot{font-size:11px;color:var(--faint)}
#lcal button.cd.ntd{position:relative}
#lcal button.cd.ntd::after{content:"";position:absolute;left:50%;bottom:2px;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:#D9A92B}
/* the left menu, when it slides out, lies on top of everything on the page (user, 2026-11-04):
   its bar is lifted above the page, and the Directory / Atlas edge tabs tuck under it */
body:not(.navshut) *:has(> .viewbar #views){z-index:1000!important}
body:not(.navshut) .d2tog,body:not(.navshut) .atltog{z-index:1!important}
.illufs{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px 0 10px;border:1px solid var(--line);border-radius:999px;background:var(--surf);color:var(--ink2);font:500 12.5px var(--sans);cursor:pointer;flex:none;transition:border-color .2s,color .2s,background .2s}
.illufs svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.illufs:hover,.illufs[aria-pressed="true"]{border-color:var(--acc);color:var(--acc);background:color-mix(in srgb,var(--acc) 7%,var(--surf))}
#atlmap > .atlfs{position:absolute;top:14px;left:14px;z-index:6;box-shadow:0 2px 8px -3px rgba(27,23,36,.2)}
#atlmap .atlzmax{display:none!important}
body.litfull #pane-lit{position:fixed!important;inset:0!important;z-index:90!important;overflow:auto!important;background:var(--illupagebg,var(--paper));padding:16px 22px 30px;box-sizing:border-box}
body.litfull{overflow:hidden}
.board > .litfs{margin-left:auto}
/* the sidebar's bottom line (counts + Reset) sits on its own ground, so the filters scrolling under it never show through */
.side .sticks{background:var(--illupagebg,var(--paper));box-shadow:0 -14px 14px -6px var(--illupagebg,var(--paper));z-index:3;padding-top:6px}
/* Booking board cards are lit like the Lumen cards: the lamp's colour runs round the edge and glows underneath (user, 2026-11-04) */
.bkcard.bkcard:has(.bknmrow .mk i.g.on){border-color:transparent!important;background:linear-gradient(var(--paper),var(--paper)) padding-box,linear-gradient(145deg,rgba(34,212,95,.88),rgba(34,212,95,.18) 46%,rgba(34,212,95,.64)) border-box!important;box-shadow:0 1px 2px rgba(27,23,36,.06),0 9px 24px -11px rgba(21,130,60,.52),inset 0 1px 0 rgba(255,255,255,.7)!important}
.bkcard.bkcard:has(.bknmrow .mk i.g.on):hover{background:linear-gradient(var(--surf2),var(--surf2)) padding-box,linear-gradient(145deg,rgba(34,212,95,1),rgba(34,212,95,.32) 46%,rgba(34,212,95,.84)) border-box!important;box-shadow:0 2px 5px rgba(27,23,36,.08),0 18px 40px -14px rgba(21,130,60,.58),inset 0 1px 0 rgba(255,255,255,.85)!important}
.bkcard.bkcard:has(.bknmrow .mk i.y.on){border-color:transparent!important;background:linear-gradient(var(--paper),var(--paper)) padding-box,linear-gradient(145deg,rgba(239,188,22,.88),rgba(239,188,22,.18) 46%,rgba(239,188,22,.64)) border-box!important;box-shadow:0 1px 2px rgba(27,23,36,.06),0 9px 24px -11px rgba(154,118,8,.48),inset 0 1px 0 rgba(255,255,255,.7)!important}
.bkcard.bkcard:has(.bknmrow .mk i.y.on):hover{background:linear-gradient(var(--surf2),var(--surf2)) padding-box,linear-gradient(145deg,rgba(239,188,22,1),rgba(239,188,22,.32) 46%,rgba(239,188,22,.84)) border-box!important;box-shadow:0 2px 5px rgba(27,23,36,.08),0 18px 40px -14px rgba(154,118,8,.54),inset 0 1px 0 rgba(255,255,255,.85)!important}
.bkcard.bkcard:has(.bknmrow .mk i.r.on){border-color:transparent!important;background:linear-gradient(var(--paper),var(--paper)) padding-box,linear-gradient(145deg,rgba(255,59,71,.70),rgba(255,59,71,.14) 46%,rgba(255,59,71,.46)) border-box!important;box-shadow:0 1px 2px rgba(27,23,36,.06),0 9px 24px -11px rgba(150,30,36,.40),inset 0 1px 0 rgba(255,255,255,.7)!important}
.bkcard.bkcard:has(.bknmrow .mk i.r.on):hover{background:linear-gradient(var(--surf2),var(--surf2)) padding-box,linear-gradient(145deg,rgba(255,59,71,.9),rgba(255,59,71,.24) 46%,rgba(255,59,71,.64)) border-box!important;box-shadow:0 2px 5px rgba(27,23,36,.08),0 18px 40px -14px rgba(150,30,36,.46),inset 0 1px 0 rgba(255,255,255,.85)!important}
/* generic full screen: the tab's page over the whole window */
body.illupf{overflow:hidden}
body.illupf .shell > .pane:not([hidden]),body.illupf #pane-bk:not([hidden]),body.illupf #pane-bld:not([hidden]),body.illupf #pane-ig:not([hidden]),body.illupf #pane-bkl:not([hidden]),body.illupf #pane-404:not([hidden]),body.illupf #pane-cmp:not([hidden]){position:fixed!important;inset:0!important;z-index:90!important;overflow:auto!important;background:var(--illupagebg,var(--paper));padding:58px 22px 30px!important;margin:0!important;box-sizing:border-box;max-width:none!important;width:auto!important}
.illupfx{position:fixed;top:14px;right:16px;z-index:2147483001;box-shadow:0 6px 18px -8px rgba(27,23,36,.4)}
.illupfx[hidden]{display:none!important}
#appbar .abfs svg{width:17px;height:17px}
#appbar .abfs[aria-pressed="true"]{color:var(--acc)}
/* booking card, side panel closed: the photos take the whole width */
.bv.bv.bvsideoff .bvbody{grid-template-columns:minmax(0,1fr)!important}
.bv.bv.bvsideoff .bvside{display:none!important}
.bv .bvbody{position:relative}
.bvsidetab{display:none}
.bv.bvsideoff .bvsidetab{display:grid;place-items:center;position:absolute;top:10px;right:12px;z-index:30;width:30px;height:28px;padding:0;border-radius:8px;cursor:pointer;
  border:1px solid color-mix(in srgb,var(--acc) 30%,var(--line));background:color-mix(in srgb,var(--acc) 12%,var(--surf));color:var(--acc);box-shadow:0 2px 8px -2px rgba(27,23,36,.18)}
.bv.bvsideoff .bvsidetab:hover{background:color-mix(in srgb,var(--acc) 22%,var(--surf))}
.bvsidetab svg{width:16px;height:16px}
/* roomy rows (1.2.88): every row 48px, the panel scrolls; long values may take two lines */
.bvside.bvside.bvside .bvprof.bvroomy:not(.bvdet){overflow-y:auto!important;overscroll-behavior:contain}
.bvside.bvside.bvside .bvprof.bvroomy > .bvsec.bvsec{margin-bottom:12px!important;flex:none!important}
.bvside.bvside.bvside .bvprof.bvroomy .bvsec .bvpc.bvpc.bvpc{padding-top:6px!important;padding-bottom:5px!important;gap:3px!important;justify-content:center}
.bvside.bvside.bvside .bvprof.bvroomy .bvsec .bvin.bvin.bvin{height:22px!important;line-height:22px!important}
.bvside.bvside.bvside .bvprof.bvroomy .bvsec .bvpc.bvpc dd,.bvside.bvside.bvside .bvprof.bvroomy .bvsec .bvpc.bvpc dd > *{line-height:22px!important;max-height:22px}
/* equal rows: every row is --bvrow tall (set by evenRows) */
/* short windows: the same layout with less air inside each row, so label and value never overlap */
.bvside.bvside.bvside .bvprof.bvtight .bvsec.bvsec{margin-bottom:6px!important}
.bvside.bvside.bvside .bvprof.bvtight .bvsech.bvsech{padding-top:4px!important;padding-bottom:4px!important}
.bvside.bvside.bvside .bvprof.bvtight .bvsec .bvpc.bvpc.bvpc{padding-top:1px!important;padding-bottom:0!important;gap:1px!important;justify-content:center}
.bvside.bvside.bvside .bvprof.bvtight .bvsec .bvpc.bvpc dt{line-height:10px!important}
.bvside.bvside.bvside .bvprof.bvtight .bvsec .bvpc.bvpc dd,.bvside.bvside.bvside .bvprof.bvtight .bvsec .bvpc.bvpc dd > *{line-height:17px!important;min-height:0!important;max-height:17px}
.bvside.bvside.bvside .bvprof.bvtight .bvsec .bvin.bvin.bvin{height:17px!important;padding-top:0!important;padding-bottom:0!important;line-height:17px!important}
.bvside.bvside.bvside .bvprof.bvtight .bvsec .bvpmx > *{padding-top:1px!important;padding-bottom:1px!important;justify-content:center}
/* every Travel and Profile value stays on one line (the full text shows on hover) */
.bvside.bvside .bvsec .bvpc dd{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.bvside.bvside .bvsec .bvpc dd *{white-space:nowrap}
/* the booking board card no longer repeats what the opened card shows: to-fill-in, age/DOB, EXP,
   countries, availability, entry and departure (user, 2026-11-04) */
.bkcard .bkmissrow,.bkcard .bkdob,.bkcard .bkxtra{display:none!important}
.bvside.bvside.bvside .bvprof:not(.bvdet) > .bvsec.bvsec{flex:none!important;gap:0!important}
.bvside.bvside.bvside .bvsec > dl.bvpl > *{flex:none!important;height:calc(var(--bvrow,44px) * var(--bvw,1))!important;box-sizing:border-box!important}
.bvside.bvside.bvside .bvsec .bvpmx{grid-auto-rows:calc(var(--bvrow,44px) * var(--bvw,1))!important;grid-template-rows:repeat(2,calc(var(--bvrow,44px) * var(--bvw,1)))!important}
.bvside.bvside.bvside .bvsec .bvpmx > *{height:auto!important;min-height:0!important;padding-top:2px!important;padding-bottom:2px!important}
.bvside.bvside.bvside .bvnx.bvnx{flex:none!important;height:calc(var(--bvrow,44px) * 1.25)!important;box-sizing:border-box!important;padding-top:4px!important;padding-bottom:4px!important}
.bvside.bvside.bvside .bvsec > dl.bvpl > .bvpr2 > .bvpc{height:100%!important;box-sizing:border-box!important}
/* Travel pairs look exactly like Profile pairs */
.bvside .bvtpr .bvin{width:100%;min-width:0}
.bvside .bvtpr .bvflw{width:100%!important;text-transform:uppercase}
.bvside .bvtpr .bvflw::placeholder{text-transform:none}
.bvside .bvsec--trv .bvpr2 > .bvpc:only-child,.bvside .bvsec--prof .bvpr2 > .bvpc:only-child{grid-column:1 / -1}
/* rows: label + value need 36px (value box 20px), the same in every section */
.bvside.bvside.bvside .bvprof:not(.bvtight) .bvsec .bvin.bvin.bvin{height:20px!important;line-height:20px!important}
.bvside.bvside.bvside .bvprof:not(.bvtight) .bvsec .bvpc.bvpc.bvpc{padding-top:3px!important;padding-bottom:2px!important;justify-content:center}
.bvside.bvside.bvside .bvprof:not(.bvtight) .bvsec .bvpc.bvpc dd,.bvside.bvside.bvside .bvprof:not(.bvtight) .bvsec .bvpc.bvpc dd > *{line-height:20px!important;max-height:20px}
.bvside.bvside .bvsec .bvpl .bvcfrom[data-cpick]{padding-right:18px!important;cursor:text;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M2 3.5l3 3 3-3' fill='none' stroke='%23000' stroke-opacity='.35' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 2px center/10px!important}
.bvcpick{position:fixed;z-index:9999;overflow-y:auto;overscroll-behavior:contain;background:var(--surf,#fff);border:1px solid color-mix(in srgb,var(--acc,#7b3f77) 22%,transparent);border-radius:10px;box-shadow:0 10px 28px -8px rgba(27,23,36,.28),0 2px 6px rgba(27,23,36,.08);padding:4px;font:13px var(--sans,inherit)}
.bvcpo{height:30px;line-height:30px;padding:0 10px;border-radius:6px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink,#1b1724)}
.bvcpo:hover,.bvcpo.on{background:color-mix(in srgb,var(--acc,#7b3f77) 11%,transparent);color:var(--acc,#7b3f77)}
.bvcpo small{margin-left:8px;font-size:11px;color:var(--faint)}
.bvcpx{padding:8px 10px;color:var(--faint);font-style:italic}
/* example text in empty boxes: lighter and fainter, so it is not mistaken for something filled in */
.bvside.bvside .bvin::placeholder,.bvside.bvside input::placeholder{color:var(--faint)!important;opacity:.45!important;font-weight:300!important}
.bvside .bvcfrom{background:transparent!important;border:0!important;box-shadow:none!important;width:100%}
.bvside .bvcfrom::-webkit-calendar-picker-indicator{opacity:.35;cursor:pointer}
.bvside .bvcfrom:hover::-webkit-calendar-picker-indicator{opacity:.7}
/* passport dates: captions beside their boxes */
.bvppd{display:grid!important;grid-template-columns:auto 1fr auto 1fr;align-items:center;gap:6px}
.bvppd label{display:contents}
.bvppd i{font:600 8.5px var(--mono);letter-spacing:.1em;color:var(--faint);font-style:normal;text-transform:uppercase}
.bvppd .bvin{width:100%;min-width:0}
.bvpp{width:100%;text-transform:uppercase;letter-spacing:.04em}.bvpp::placeholder{text-transform:none;letter-spacing:0}
/* compact side panel: everything fits without scrolling */
.bvside.bvside.bvside .bvprof:not(.bvdet){padding:10px 14px 8px!important}
.bvside.bvside.bvside .bvsec.bvsec{margin-bottom:8px!important}
.bvside.bvside.bvside .bvsech.bvsech{padding:6px 12px!important}
.bvside.bvside.bvside .bvsech.bvsech b{font-size:10px!important;letter-spacing:.14em!important}
.bvside.bvside.bvside .bvnx.bvnx{padding:7px 12px!important;gap:8px!important}
.bvside.bvside.bvside .bvnx.bvnx b{font-size:13px!important}.bvside.bvside.bvside .bvnx.bvnx em{font-size:11px!important}
.bvside.bvside.bvside .bvnx.bvnx button{height:28px!important;padding:0 11px!important;font-size:12px!important}
.bvside.bvside.bvside .bvpmx > *{padding:5px 4px 6px!important;gap:0!important}
.bvside.bvside.bvside .bvpmx > * :is(dt,i,small,em){font-size:8.5px!important}
.bvside.bvside.bvside .bvpmx > * :is(dd,b,input,span){font-size:14px!important}
.bvside.bvside.bvside .bvpr2.bvpr2{padding:0!important}
.bvside.bvside.bvside .bvpc.bvpc{padding:4px 12px 5px!important;gap:1px!important}
.bvside.bvside.bvside .bvpc.bvpc dt,.bvside.bvside.bvside .bvpr.bvpr dt{font-size:8.5px!important;letter-spacing:.09em!important}
.bvside.bvside.bvside .bvpc.bvpc dd,.bvside.bvside.bvside .bvpc .bvin.bvin,.bvside.bvside.bvside .bvpr.bvpr dd,.bvside.bvside.bvside .bvpr .bvin.bvin,.bvside.bvside.bvside .bvpch span{font-size:13px!important}
.bvside.bvside.bvside .bvpc .bvin.bvin,.bvside.bvside.bvside .bvpr .bvin.bvin{padding:1px 0!important;line-height:1.35!important}
.bvside.bvside.bvside .bvpr.bvpr{padding:4px 12px!important;min-height:0!important}
.bvside.bvside.bvside .bvpch span{padding:0 8px!important}
/* passport dates: the two captions sit beside their boxes, on one line */
.bvside.bvside.bvside .bvppd{grid-template-columns:auto 1fr auto 1fr!important;align-items:center;gap:6px!important}
.bvside.bvside.bvside .bvppd label{display:contents!important}
.bvside.bvside.bvside .bvppd i{font-size:8px!important}
.bvside.bvside.bvside .bvprof .bvsec .bvpc.bvpc{padding:3px 12px 4px!important}
.bvside.bvside.bvside .bvprof .bvsec .bvpr.bvpr{padding:3px 12px!important}
.bvside.bvside.bvside .bvprof .bvsec .bvin.bvin{font-size:13px!important;padding:0!important;line-height:1.3!important;height:20px!important}
.bvside.bvside.bvside .bvprof .bvsec dd span{line-height:1.3!important}
.bvside.bvside.bvside .bvprof .bvsec .bvpmx > *{padding:4px 4px 5px!important}
.bvside.bvside.bvside .bvprof .bvsec .bvpmx > * b{font-size:14px!important;line-height:1.25!important}
/* fill the panel: sections share the height by how many rows they hold, rows share their section's height */
.bvside.bvside.bvside .bvprof:not(.bvdet){display:flex!important;flex-direction:column!important}
.bvside.bvside.bvside .bvprof:not(.bvdet) > .bvsec.bvsec{display:flex!important;flex-direction:column!important;flex:1 0 auto!important;margin-bottom:10px!important}
.bvside.bvside.bvside .bvprof:not(.bvdet) > .bvsec.bvsec:last-child{margin-bottom:0!important}
.bvside.bvside.bvside .bvprof > .bvnext.bvnext{flex-grow:1.2!important}
.bvside.bvside.bvside .bvprof > .bvsec--mx.bvsec--mx{flex-grow:2.4!important}
.bvside.bvside.bvside .bvprof > .bvsec--prof.bvsec--prof{flex-grow:6!important}
.bvside.bvside.bvside .bvprof > .bvsec--trv.bvsec--trv{flex-grow:6!important}
.bvside.bvside.bvside .bvsec > :not(.bvsech){flex:1 0 auto!important}
.bvside.bvside.bvside .bvsec > dl.bvpl{display:flex!important;flex-direction:column!important}
.bvside.bvside.bvside .bvsec > dl.bvpl > *{flex:1 0 auto!important}
.bvside.bvside.bvside .bvsec .bvpr.bvpr{align-content:center!important}
.bvside.bvside.bvside .bvsec .bvpr2.bvpr2{align-items:stretch!important}
.bvside.bvside.bvside .bvsec .bvpc.bvpc{justify-content:center!important}
.bvside.bvside.bvside .bvsec .bvpmx{display:grid!important;grid-auto-rows:1fr!important}
.bvside.bvside.bvside .bvsec .bvpmx > *{justify-content:center!important}
.bvside.bvside.bvside .bvnx.bvnx{flex:1 0 auto!important}
/* a little roomier type than the compact version */
.bvside.bvside.bvside .bvprof .bvsec .bvin.bvin,.bvside.bvside.bvside .bvpc dd,.bvside.bvside.bvside .bvpr dd{font-size:14px!important}
.bvside.bvside.bvside .bvprof .bvsec .bvin.bvin{height:22px!important}
.bvside.bvside.bvside .bvpc dt,.bvside.bvside.bvside .bvpr dt{font-size:9px!important}
.bvside.bvside.bvside .bvprof .bvsec .bvpmx > * b{font-size:15px!important}
.bvside.bvside.bvside .bvsech.bvsech b{font-size:10.5px!important}
.bvside.bvside.bvside .bvprof:not(.bvdet) > .bvsec.bvsec{align-items:stretch!important}
.bvside.bvside.bvside .bvsec > *{width:auto!important;align-self:stretch!important}
.bvside.bvside.bvside .bvsec .bvpmx{grid-template-columns:repeat(3,minmax(0,1fr))!important}
.bvside.bvside.bvside .bvnx.bvnx{justify-content:flex-start!important}

#illuzoom{display:inline-flex;align-items:center;height:30px;border:1px solid var(--line);border-radius:999px;overflow:hidden;margin-right:8px;background:var(--surf)}
#illuzoom button{border:0;background:transparent;color:inherit;font:inherit;font-size:13px;height:30px;padding:0 10px;cursor:pointer}
#illuzoom button:hover{background:var(--surf2)}
#illuzoom .zv{font-size:11.5px;font-weight:600;min-width:46px;border-left:1px solid var(--line);border-right:1px solid var(--line)}
`;
  (document.body || document.head).appendChild(css);
})();
