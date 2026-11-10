/* ================= Street map, up close =================
   The atlas is drawn for countries and cities; it stops at about a city across. Zooming in
   further, or opening an agency, brings up a detailed street map in the same frame
   (MapLibre, map data © OpenStreetMap via OpenFreeMap, free and keyless) with every agency
   at its street address. Agencies with only a city on file share one marker at the city
   centre ("12 here by city only"). Zooming back out, "Back to the atlas", Esc, or any move
   in the atlas's own panel returns to the atlas. */
(function(){
  'use strict';
  const STYLE = dark => 'https://tiles.openfreemap.org/styles/' + (dark ? 'dark' : 'positron');
  let MAP = null, BOX = null, loading = null, openNow = false, MARKS = [];
  const isDark = () => /dark|dim/.test(document.documentElement.getAttribute('data-theme') || '') ||
    (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  const esc3 = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);

  function lib(){
    if(window.maplibregl) return Promise.resolve();
    if(loading) return loading;
    loading = new Promise((res, rej) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '../vendor/maplibre-gl.css'; document.head.appendChild(css);
      const s = document.createElement('script'); s.src = '../vendor/maplibre-gl-csp.js';
      s.onload = () => { try{ maplibregl.setWorkerUrl('../vendor/maplibre-gl-csp-worker.js'); }catch(e){} res(); };
      s.onerror = () => rej(new Error('map library did not load'));
      document.head.appendChild(s);
    });
    return loading;
  }
  function box(){
    if(BOX) return BOX;
    const host = document.getElementById('atlmap');
    BOX = document.createElement('div');
    BOX.className = 'illustreet'; BOX.hidden = true;
    BOX.innerHTML = '<div class="ilsmap"></div><button type="button" class="ilsback" title="Back to the atlas (Esc)">← Back to the atlas</button>' +
      '<div class="ilsnote"></div>';
    host.appendChild(BOX);
    BOX.querySelector('.ilsback').addEventListener('click', close);
    return BOX;
  }
  /* every agency the atlas knows, at its address; city-only ones grouped at the city centre */
  function points(){
    let rs = [];
    try{ rs = ATLAS_API.rows(); }catch(e){ return {exact: [], city: []}; }
    const exact = [], city = new Map();
    for(const r of rs) for(const p of (r.pins || [])){
      if(!isFinite(p.lat) || !isFinite(p.lng)) continue;
      if(p.pr === 'a') exact.push({d: r.d, nm: r.nm, lat: p.lat, lng: p.lng, addr: r.addr || '', n: r.n});
      else{
        const k = p.lat.toFixed(4) + ',' + p.lng.toFixed(4);
        if(!city.has(k)) city.set(k, {lat: p.lat, lng: p.lng, lb: p.lb || r.city || '', ag: []});
        city.get(k).ag.push({d: r.d, nm: r.nm});
      }
    }
    return {exact, city: [...city.values()]};
  }
  function pinEl(cls, label, title){
    const el = document.createElement('div');
    el.className = 'ilspin ' + cls;
    el.title = title || label;
    el.innerHTML = '<svg viewBox="-8 -22 16 23" width="22" height="31" style="width:22px;height:31px;display:block" aria-hidden="true"><path d="M0,0C-1.6,-4.6 -7,-8.2 -7,-13.4A7,7 0 1 1 7,-13.4C7,-8.2 1.6,-4.6 0,0Z"/><circle cx="0" cy="-13.4" r="2.7"/></svg>' +
      '<span>' + esc3(label) + '</span>';
    return el;
  }
  function paint(){
    MARKS.forEach(m => m.remove()); MARKS = [];
    const P = points(), sel = (window.ATLAS_STATE || {}).sel || '';
    for(const x of P.exact){
      const el = pinEl('ex' + (x.d === sel ? ' sel' : ''), x.nm, x.nm + (x.addr ? ' — ' + x.addr : ''));
      el.addEventListener('click', ev => { ev.stopPropagation(); pick(x.d); });
      MARKS.push(new maplibregl.Marker({element: el, anchor: 'bottom'}).setLngLat([x.lng, x.lat]).addTo(MAP));
    }
    for(const c of P.city){
      const many = c.ag.length > 1;
      const el = pinEl('city' + (c.ag.some(a => a.d === sel) ? ' sel' : ''), many ? c.ag.length + ' in ' + c.lb + ' · city only' : c.ag[0].nm + ' · city only',
        (many ? c.ag.length + ' agencies' : c.ag[0].nm) + ' with only a city on file — shown at the centre of ' + c.lb + '. They are listed in the panel.');
      el.addEventListener('click', ev => { ev.stopPropagation(); if(!many) pick(c.ag[0].d); });
      MARKS.push(new maplibregl.Marker({element: el, anchor: 'bottom'}).setLngLat([c.lng, c.lat]).addTo(MAP));
    }
    const ex = P.exact.length;
    BOX.querySelector('.ilsnote').textContent = ex + ' agencies at their street address · names show as you zoom in';
    labels();
  }
  function labels(){ if(BOX && MAP) BOX.classList.toggle('named', MAP.getZoom() >= 13.5); }
  function pick(d){
    try{ window.atlasSelect(d, false); }catch(e){}
  }
  async function open(lng, lat, zoom){
    try{ await lib(); }catch(e){ return; }
    box();
    BOX.hidden = false; openNow = true;
    document.getElementById('atlmap').classList.add('ilson');
    if(!MAP){
      MAP = new maplibregl.Map({container: BOX.querySelector('.ilsmap'), style: STYLE(isDark()), center: [lng, lat], zoom: zoom || 12,
        attributionControl: {compact: true}, dragRotate: false, pitchWithRotate: false});
      MAP.addControl(new maplibregl.NavigationControl({showCompass: false}), 'top-right');
      MAP.on('zoom', labels);
      MAP.on('zoomend', () => { if(openNow && MAP.getZoom() < 8.5) close(); });
      MAP.on('load', paint);
      window.__illuStreetMap = MAP;
    }else{
      MAP.resize();
      MAP.jumpTo({center: [lng, lat], zoom: zoom || 12});
      paint();
    }
  }
  function close(){
    if(!openNow) return;
    openNow = false;
    if(BOX) BOX.hidden = true;
    const m = document.getElementById('atlmap'); if(m) m.classList.remove('ilson');
  }
  /* an agency opened in the atlas: show it on the street map, at its address if it has one */
  function onSelect(r){
    if(!r || !r.pins) return;
    const p = r.pins.find(x => x.pr === 'a');
    /* only an agency at a street address: one with just a city stays on the atlas (its wheel) */
    if(!p){ if(openNow) setTimeout(paint, 50); return; }
    if(openNow && MAP){ MAP.flyTo({center: [p.lng, p.lat], zoom: Math.max(MAP.getZoom(), 15.5), speed: 1.4}); setTimeout(paint, 50); }
    else open(p.lng, p.lat, 15.5);
  }
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && openNow){ e.stopPropagation(); close(); } }, true);
  /* the atlas's own breadcrumbs and lists take you back to it */
  document.addEventListener('click', e => {
    if(!openNow) return;
    if(e.target.closest && e.target.closest('#atlside [data-go], #atlside [data-ct], #atlside [data-rg], #atlside .atlback, .atlzup')) close();
  }, true);
  const css = document.createElement('style');
  css.textContent =
    '#atlmap .illustreet{position:absolute;inset:0;z-index:5;border-radius:inherit;overflow:hidden;background:var(--surf)}' +
    '#atlmap.ilson > .atlctl,#atlmap.ilson > .atlhint,#atlmap.ilson > .atlnote{visibility:hidden}' +
    '.illustreet .ilsmap{position:absolute;inset:0}' +
    '.illustreet .ilsback{position:absolute;left:12px;top:12px;z-index:3;font:inherit;font-size:12px;padding:7px 14px;border-radius:999px;border:1px solid var(--line);background:var(--surf);color:inherit;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.08)}' +
    '.illustreet .ilsnote{position:absolute;left:12px;bottom:10px;z-index:3;font-size:11px;padding:4px 10px;border-radius:999px;background:color-mix(in srgb,var(--surf) 85%,transparent);opacity:.85;pointer-events:none}' +
    '.ilspin{display:flex;flex-direction:column;align-items:center;cursor:pointer;width:22px;height:31px;position:relative}' +
    '.ilspin svg{width:22px;height:31px;overflow:visible}' +
    '.ilspin path{fill:var(--acc,#6b3a7a);stroke:#fff;stroke-width:1.2}' +
    '.ilspin circle{fill:#fff}' +
    '.ilspin.city path{fill:#fff;stroke:var(--acc,#6b3a7a);stroke-width:1.6;stroke-dasharray:2 1.5}.ilspin.city circle{fill:var(--acc,#6b3a7a)}' +
    '.ilspin.sel path{fill:#e0a020}' +
    '.ilspin span{position:absolute;bottom:33px;left:50%;transform:translateX(-50%);text-transform:none;letter-spacing:0;white-space:nowrap;font-size:11.5px;font-weight:600;padding:2px 7px;border-radius:6px;background:color-mix(in srgb,var(--surf,#fff) 92%,transparent);box-shadow:0 1px 4px rgba(0,0,0,.12);display:none}' +
    '.illustreet.named .ilspin span,.ilspin:hover span,.ilspin.sel span,.ilspin.city span{display:block}' +
    '.ilspin:hover{z-index:2}';
  document.head.appendChild(css);
  window.illuStreet = {open, close, onSelect, isOpen: () => openNow, repaint: () => { if(openNow && MAP) paint(); }};
})();
