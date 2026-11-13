/* 1.2.177 (user, 13 Nov 2026: "Give me an up to date design for this board as well", approved demo "More menu and the
   404 board"): the 404 · Left their board page, redrawn. Same data (GONE: model key -> {t, nm, ag, co}); the search box
   in the top bar still narrows it. New: three counts (left a board / this week / were someone's favorite), a
   "Favorites only" switch, date bars, a small greyed photo, the name no longer struck through, and on each row
   "Find her" (a web search for her name and agency, to see where she went). */
(function(){
  'use strict';
  if(typeof renderGone !== 'function') return;
  const KO = () => { try{ return LANG === 'ko'; }catch(e){ return false; } };
  const L = (en, ko) => KO() ? ko : en;
  let favOnly = false;
  function favKeys(){
    const s = new Set();
    try{ for(const pid of (window.__illuFavPeople ? window.__illuFavPeople() : [])) for(const f of window.__illuFavsOf(pid)) s.add(f.k); }catch(e){}
    try{ for(const k of [...s]) s.add(normKey(k)); }catch(e){}
    return s;
  }
  const dayLabel = d => {
    try{
      const today = localDay(new Date()), yest = localDay(new Date(Date.now() - 864e5));
      if(d === today) return L('Today', '오늘'); if(d === yest) return L('Yesterday', '어제');
      const x = new Date(d + 'T12:00:00');
      return isNaN(x) ? d : x.toLocaleDateString(KO() ? 'ko-KR' : 'en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'});
    }catch(e){ return d; }
  };
  /* no name was kept: the last real word of her address ("…/Development/WILDA/Portfolio" -> "WILDA") */
  function nameFromUrl(u){
    try{ const segs = decodeURIComponent(new URL(u).pathname).split('/').filter(Boolean).filter(x => !/^(portfolio|book|polaroids?|digitals?|index\.html?|profile|model|models|women|men|main|development|new-?faces?|mainboard|board)$/i.test(x));
      const last = segs[segs.length - 1] || ''; return last.replace(/^\d+[-_]/, '').replace(/[-_]+/g, ' ').replace(/\.\w+$/, '').trim(); }catch(e){ return ''; }
  }
  function photo(k, nm){
    try{ const f = litFacts({key: k, nm}); return picCell(k, nm, f && f.photo); }catch(e){ return ''; }
  }
  const CSS = `
.gn{display:flex;flex-direction:column;gap:14px;font-family:var(--sans,Inter,system-ui,sans-serif)}
.gnhd{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap}
.gnti{flex:1 1 360px;display:flex;flex-direction:column;gap:4px}
.gnti h2{margin:0;font-size:24px;font-weight:700;color:var(--ink)}
.gnti p{margin:0;font-size:13.5px;color:var(--mut);line-height:1.5;max-width:720px}
.gnst{display:flex;gap:10px;flex-wrap:wrap}
.gnst div{display:flex;flex-direction:column;padding:10px 16px;border-radius:12px;background:var(--surf,#fff);border:1px solid var(--line);min-width:110px}
.gnst b{font-size:22px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums}.gnst span{font-size:12px;color:var(--mut)}
.gnst .fav{background:color-mix(in srgb,var(--acc,#6b2a63) 8%,var(--surf,#fff));border-color:color-mix(in srgb,var(--acc,#6b2a63) 22%,transparent)}
.gnst .fav b,.gnst .fav span{color:var(--acc,#6b2a63)}
.gnbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.gnfav{min-height:38px;padding:0 14px;border-radius:10px;border:1px solid var(--line);background:var(--surf,#fff);font:inherit;font-size:13px;color:inherit;cursor:pointer}
.gnfav[aria-pressed="true"]{background:var(--acc,#6b2a63);border-color:var(--acc,#6b2a63);color:#fff;font-weight:600}
.gnsp{flex-grow:1}.gnn{font-size:12.5px;color:var(--mut)}
.gnlist{background:var(--surf,#fff);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.gnday{display:flex;align-items:center;gap:10px;padding:10px 20px;background:color-mix(in srgb,var(--acc,#6b2a63) 4%,var(--surf,#fff));border-bottom:1px solid var(--line);position:sticky;top:0;z-index:1}
.gnday b{font-size:13px;font-weight:700;color:var(--ink)}.gnday span{font-size:12px;color:var(--mut)}
.gnrow{display:grid;grid-template-columns:40px minmax(0,1fr) minmax(0,220px) 130px 56px 112px;align-items:center;gap:14px;padding:9px 20px;border-bottom:1px solid color-mix(in srgb,var(--line) 60%,transparent)}
.gnrow:last-child{border-bottom:0}.gnrow:hover{background:color-mix(in srgb,var(--acc,#6b2a63) 3%,var(--surf,#fff))}
.gnph{width:40px;height:50px;border-radius:6px;overflow:hidden;background:var(--surf2,#f3f3f4);filter:grayscale(.7);opacity:.85}
.gnph .litpic,.gnph img{width:100%!important;height:100%!important;object-fit:cover;display:block}
.gnph .litpic *{font-size:0}
.gnnm{display:flex;flex-direction:column;gap:2px;min-width:0}
.gnnm b{font-size:14px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gnnm i{font-style:normal;align-self:flex-start;font-size:11px;font-weight:700;color:var(--acc,#6b2a63);background:color-mix(in srgb,var(--acc,#6b2a63) 10%,transparent);padding:2px 8px;border-radius:999px}
.gnnm s{display:none;text-decoration:none;font-size:12.5px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gnag{font-size:13px;color:var(--ink2,#38383e);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gnco{font-size:12.5px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gnt{font-size:12px;color:var(--faint,#8a8592);font-variant-numeric:tabular-nums}
.gnfind{justify-self:end;display:inline-flex;align-items:center;min-height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--line);font-size:12px;font-weight:600;color:var(--acc,#6b2a63);text-decoration:none;white-space:nowrap;opacity:0}
.gnrow:hover .gnfind,.gnfind:focus-visible{opacity:1}.gnfind:hover{background:var(--acc,#6b2a63);color:#fff;border-color:var(--acc,#6b2a63)}
.gnempty{padding:28px 20px;font-size:14px;color:var(--mut)}
@media (max-width:760px){
  .gnrow{grid-template-columns:40px minmax(0,1fr) auto;padding:10px 14px}
  .gnst{flex-wrap:nowrap}
  .gnag,.gnco,.gnt{display:none}.gnnm s{display:block}
  .gnfind{opacity:1;min-height:40px}
  .gnst{width:100%}.gnst div{min-width:0;flex:1 1 0;padding:8px 12px}.gnst b{font-size:18px}
}`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  renderGone = function(){
    const pane = document.getElementById('gmain');
    if(!pane) return;
    const vn = document.getElementById('vn-404');
    if(vn) vn.textContent = GONE.size ? GONE.size : '';
    const favs = favKeys();
    const all = [...GONE.entries()].map(([k, g]) => ({k, t: g.t || '', nm: g.nm || nameFromUrl(k), ag: g.ag || '', co: g.co || '', fav: favs.has(k)}));
    const week = Date.now() - 7 * 864e5;
    const nWeek = all.filter(r => { const d = Date.parse(r.t); return !isNaN(d) && d >= week; }).length;
    const nFav = all.filter(r => r.fav).length;
    const term = (q && q.value || '').trim().toLowerCase();
    let rows = all.filter(r => !term || (r.nm + ' ' + r.ag + ' ' + r.co).toLowerCase().includes(term));
    if(favOnly) rows = rows.filter(r => r.fav);
    rows.sort((a, b) => String(b.t).localeCompare(String(a.t)));
    if(VIEW === '404') countEl.textContent = rows.length + L(' shown', '명 표시') + (rows.length === all.length ? '' : L(' of ', ' / ') + all.length);
    let h = '<div class="gn"><div class="gnhd"><div class="gnti"><h2>' + L('Left their board', '보드에서 내려간 모델') + '</h2><p>' +
      L('Profiles an agency took down since the last read. Kept, not deleted — a name that leaves a board has often signed somewhere else.', '지난번 이후 에이전시가 내린 프로필입니다. 삭제하지 않고 보관합니다 — 보드에서 내려간 모델은 다른 곳과 계약했을 때가 많습니다.') + '</p></div>' +
      '<div class="gnst"><div><b>' + all.length + '</b><span>' + L('left a board', '보드에서 내려감') + '</span></div><div><b>' + nWeek + '</b><span>' + L('this week', '이번 주') + '</span></div>' +
      '<div class="fav"><b>' + nFav + '</b><span>' + L('were favorites', '즐겨찾기였던 모델') + '</span></div></div></div>' +
      '<div class="gnbar"><button type="button" class="gnfav" data-gnfav aria-pressed="' + favOnly + '">♥ ' + L('Favorites only', '즐겨찾기만') + '</button><span class="gnsp"></span><span class="gnn">' +
      rows.length + L(' shown · newest first', '명 · 최신순') + '</span></div>';
    if(!all.length) h += '<div class="gnlist"><div class="gnempty">' + L('Nothing has left a board yet. When a profile disappears between reads it shows here, with the day it went.', '아직 보드에서 내려간 모델이 없습니다. 프로필이 사라지면 날짜와 함께 여기에 표시됩니다.') + '</div></div>';
    else if(!rows.length) h += '<div class="gnlist"><div class="gnempty">' + (favOnly ? L('None of these were favorites.', '즐겨찾기였던 모델이 없습니다.') : L('Nothing matches that. Clear the search to see all ', '일치하는 항목이 없습니다. 검색을 지우면 전체 ') + all.length + L('.', '명을 볼 수 있습니다.')) + '</div></div>';
    else {
      const byDay = new Map();
      for(const r of rows){ const d = String(r.t).slice(0, 10) || 'Undated'; if(!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(r); }
      h += '<div class="gnlist">';
      for(const [d, list] of byDay){
        h += '<div class="gnday"><b>' + esc(d === 'Undated' ? L('Undated', '날짜 없음') : dayLabel(d)) + '</b><span>' + list.length + L(' left', '명') + '</span></div>';
        h += list.map(r => {
          const nm = r.nm || r.k, find = 'https://www.google.com/search?q=' + encodeURIComponent('"' + (r.nm || '') + '" model ' + (r.ag || ''));
          return '<div class="gnrow"><span class="gnph" aria-hidden="true">' + photo(r.k, r.nm) + '</span>' +
            '<span class="gnnm"><b title="' + esc(nm) + '">' + esc(nm) + '</b>' + (r.fav ? '<i>♥ ' + L('favorite', '즐겨찾기') + '</i>' : '') + '<s>' + esc([r.ag, r.co].filter(Boolean).join(' · ')) + '</s></span>' +
            '<span class="gnag">' + esc(r.ag) + '</span><span class="gnco">' + esc(r.co) + '</span>' +
            '<span class="gnt">' + esc(String(r.t).slice(11, 16)) + '</span>' +
            (r.nm ? '<a class="gnfind" href="' + esc(find) + '" target="_blank" rel="noopener noreferrer" title="' + esc(L('Search the web for where she went', '어디로 갔는지 웹에서 찾기')) + '">' + L('Find her ↗', '찾아보기 ↗') + '</a>' : '<span></span>') + '</div>';
        }).join('');
      }
      h += '</div>';
    }
    pane.innerHTML = h + '</div>';
  };
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-gnfav]'); if(!b) return;
    favOnly = !favOnly; renderGone();
  });
  try{ if(VIEW === '404') renderGone(); }catch(e){}
})();
