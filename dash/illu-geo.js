/* ================= Agencies at their street address =================
   Every agency with a street address on file but no map position gets one from
   OpenStreetMap (main process, one request a second, answers kept). A position is used only
   when it is a building or a street AND it names a word of the agency's own street, so a
   wrong guess ("4, Voorimehe" for "Hobujaama tn 4") is thrown away rather than pinned.
   Positions are saved as ordinary atlas pins (docs geo/<domain>, by: 'geocoder'), so every
   computer sees them and the atlas's own rule applies: a pin set by hand always wins, and a
   pin stops counting when the address is changed. Addresses that find nothing are noted
   (docs geofail/<domain>) and not asked again for 30 days. Runs on the owner's computer. */
(function(){
  'use strict';
  if(!window.illu || !window.illu.geocode) return;
  const MONTH = 30 * 864e5;
  const FAIL = new Map();
  let running = false, stop = false;
  const idOf = d => String(d).replace(/[^A-Za-z0-9_.~:@+-]/g, '_').slice(0, 180);
  const fold = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
  const STOP = new Set(['street', 'road', 'avenue', 'strasse', 'str', 'rue', 'calle', 'via', 'avenida', 'the', 'and', 'floor', 'suite',
    'building', 'house', 'tower', 'center', 'centre', 'office', 'north', 'south', 'east', 'west', 'tanav', 'ulica', 'plaza', 'place', 'lane', 'drive']);
  function clean(s){
    return String(s || '').replace(/\([^)]*\)/g, ' ').replace(/\bc\/o\b[^,\d]*/gi, ' ')
      .replace(/\b(suite|ste\.?|floor|fl\.?|unit|studio|apt\.?|office|room|level|etage|piso|andar)\s*[\w-]+/gi, ' ')
      .replace(/#\s*\w+/g, ' ').replace(/\btn\b/g, 'tänav').replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').replace(/^[\s,]+|[\s,]+$/g, '').trim();
  }
  /* the words of the street itself: what a right answer has to contain */
  const streetWords = a => fold(a).split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !/^\d+$/.test(w) && !STOP.has(w));
  function queries(addr, city, country){
    const a = clean(addr);
    const withPlace = x => x + (city && !fold(x).includes(fold(city)) ? ', ' + city : '') + (country && !fold(x).includes(fold(country)) ? ', ' + country : '');
    const fromNum = a.replace(/^[^\d,]*?(?=\d)/, '');
    const first = a.split(',')[0];
    const q = [withPlace(a)];
    if(/[a-z]{3}/i.test(fromNum.replace(/\d+/g, ''))) q.push(withPlace(fromNum));
    if(first !== a) q.push(withPlace(first));
    return [...new Set(q)];
  }
  function accept(hit, words){
    if(!hit || !(hit.rank >= 26)) return false;
    const hay = fold(hit.name + ' ' + Object.values(hit.a || {}).join(' '));
    return words.length ? words.some(w => hay.includes(w)) : false;
  }
  async function one(a, addr){
    const words = streetWords(clean(addr));
    for(const q of queries(addr, a.city, a.country)){
      const r = await illu.geocode(q);
      if(r && r.error) return {error: r.error};
      const hit = (r && r.hits || []).find(h => accept(h, words));
      if(hit){
        const ad = hit.a || {};
        return {lat: hit.lat, lng: hit.lng, city: ad.city || ad.town || ad.village || ad.municipality || '', q, rank: hit.rank, name: hit.name};
      }
    }
    return {error: 'no building or street found for this address'};
  }
  async function run(){
    if(running || stop) return;
    try{ if(!isAdmin()) return; }catch(e){ return; }
    if(typeof DB === 'undefined' || !DB || !window.ATLAS_API || typeof ADDR === 'undefined' || !ADDR.size) return;
    running = true;
    try{
      try{
        const snap = await DB.collection('geofail').limit(5000).get();
        for(const d0 of (snap.docs || snap || [])){ const x = docOf(d0); if(x && x.d) FAIL.set(x.d, x); }
      }catch(e){}
      const seen = new Set(), todo = [];
      for(const a of AG){
        const d = a.domain;
        if(!d || seen.has(d)) continue; seen.add(d);
        const addr = (ADDR.get(d) || '').trim();
        if(addr.length < 4) continue;
        let pins = null; try{ pins = ATLAS_API.pinsOf(d); }catch(e){}
        if(pins && pins.some(p => p.pr === 'a')) continue;               // already at its address
        const f = FAIL.get(d);
        if(f && f.a === addr && Date.now() - (+new Date(f.at) || 0) < MONTH) continue;
        todo.push(a);
      }
      let done = 0;
      for(const a of todo){
        if(stop) break;
        try{ if(!isAdmin()) break; }catch(e){ break; }
        const addr = (ADDR.get(a.domain) || '').trim();
        const r = await one(a, addr);
        if(r.error && /^geocoder (429|403|5)/.test(r.error)) break;          // told to slow down: stop for today
        if(r.error && window.illuTransient && window.illuTransient(r.error)) break;   // offline or no answer: nothing is marked, tried next time
        if(r.lat != null){
          const rec = {d: a.domain, a: addr, p: [[r.lat, r.lng, r.city || '', a.country || '']], by: 'geocoder', src: 'OpenStreetMap Nominatim', q: r.q, at: new Date().toISOString()};
          try{ await DB.doc('geo/' + idOf(a.domain)).set(rec); }catch(e){}
          try{ ATLAS_API.addGeo(a.domain, rec); }catch(e){}
          if(++done % 10 === 0) try{ ATLAS_API.redraw(); }catch(e){}
        }else{
          const rec = {d: a.domain, a: addr, error: r.error, at: new Date().toISOString()};
          FAIL.set(a.domain, rec);
          try{ await DB.doc('geofail/' + idOf(a.domain)).set(rec); }catch(e){}
        }
      }
      try{ ATLAS_API.redraw(); }catch(e){}
    }finally{ running = false; }
  }
  window.__illuGeo = {run, stop: () => { stop = true; }, queries, streetWords, accept, clean};
  /* after the page and the directory have settled; again every day the program stays open */
  setTimeout(run, 90000);
  setInterval(run, 24 * 3600e3);
})();
