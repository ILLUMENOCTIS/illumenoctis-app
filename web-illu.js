var LZString=function(){var r=String.fromCharCode,o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",e={};function t(r,o){if(!e[r]){e[r]={};for(var n=0;n<r.length;n++)e[r][r.charAt(n)]=n}return e[r][o]}var i={compressToBase64:function(r){if(null==r)return"";var n=i._compress(r,6,function(r){return o.charAt(r)});switch(n.length%4){default:case 0:return n;case 1:return n+"===";case 2:return n+"==";case 3:return n+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(n){return t(o,r.charAt(n))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(r){return null==r?"":""==r?null:i._decompress(r.length,16384,function(o){return r.charCodeAt(o)-32})},compressToUint8Array:function(r){for(var o=i.compress(r),n=new Uint8Array(2*o.length),e=0,t=o.length;e<t;e++){var s=o.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null==o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;e<t;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(r){return null==r?"":i._compress(r,6,function(r){return n.charAt(r)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(o){return t(n,r.charAt(o))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(r,o,n){if(null==r)return"";var e,t,i,s={},u={},a="",p="",c="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<r.length;i+=1)if(a=r.charAt(i),Object.prototype.hasOwnProperty.call(s,a)||(s[a]=f++,u[a]=!0),p=c+a,Object.prototype.hasOwnProperty.call(s,p))c=p;else{if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++),s[p]=f++,c=String(a)}if(""!==c){if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==o-1){d.push(n(m));break}v++}return d.join("")},decompress:function(r){return null==r?"":""==r?null:i._decompress(r.length,32768,function(o){return r.charCodeAt(o)})},_decompress:function(o,n,e){var t,i,s,u,a,p,c,l=[],f=4,h=4,d=3,m="",v=[],g={val:e(0),position:n,index:1};for(t=0;t<3;t+=1)l[t]=t;for(s=0,a=Math.pow(2,2),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 2:return""}for(l[3]=c,i=c,v.push(c);;){if(g.index>o)return"";for(s=0,a=Math.pow(2,d),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(c=s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 2:return v.join("")}if(0==f&&(f=Math.pow(2,d),d++),l[c])m=l[c];else{if(c!==h)return null;m=i+i.charAt(0)}v.push(m),l[h++]=i+m.charAt(0),i=m,0==--f&&(f=Math.pow(2,d),d++)}}};return i}();"function"==typeof define&&define.amd?define(function(){return LZString}):"undefined"!=typeof module&&null!=module?module.exports=LZString:"undefined"!=typeof angular&&null!=angular&&angular.module("LZString",[]).factory("LZString",function(){return LZString});
/* ILLUMÉNOCTIS on the web (phone app / browser): what the computer program's window.illu gives,
   for the things a browser can do. Everything the program does on the computer itself (Booking folders,
   Dropbox, Hiworks, the crawler, the photo viewer's local cache) is simply not offered here. */
(function () {
  'use strict';
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  window.illu = {
    web: true,
    info: async () => ({ version: window.ILLU_WEB_VERSION || '', platform: 'web', arch: '', dark: matchMedia('(prefers-color-scheme: dark)').matches }),
    /* The whole Directory (27,000+ models) is too big for the phone's storage as plain text, so it is
       kept squeezed (about a sixth of the size) and opened again when the dashboard starts. */
    setDir: async d => {
      const txt = JSON.stringify(d || {});
      try { localStorage.removeItem('illu.web.dir'); } catch (e) {}
      let z = ''; try { z = LZString.compressToUTF16(txt); } catch (e) {}
      for (const st of [localStorage, sessionStorage]) { try { st.setItem('illu.web.dirz', z); return true; } catch (e) {} }
      window.__illuDirFail = txt.length; return false;
    },
    dirSync: () => {
      const none = { ag: [], admin: '', me: '' };
      try {
        const z = (() => { try { return localStorage.getItem('illu.web.dirz') || sessionStorage.getItem('illu.web.dirz'); } catch (e) { return null; } })();
        if (z) return JSON.parse(LZString.decompressFromUTF16(z) || 'null') || none;
        return JSON.parse(LS.get('illu.web.dir') || 'null') || none;
      } catch (e) { return none; }
    },
    /* the sign-in is handed to the service worker, which fetches the stored photographs (/_blob/…) with it */
    setToken: async t => { try { if (t && 'caches' in window) { const c = await caches.open('illu-auth'); await c.put('/__illu_token', new Response(t)); } } catch (e) {} return true; },
    setReferers: async () => 0,
    openExternal: async u => { try { window.open(u, '_blank', 'noopener'); } catch (e) {} },
    save: async (name, bytes) => {
      try {
        const b = new Blob([bytes]); const a = document.createElement('a');
        a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
        return { ok: true, path: name };
      } catch (e) { return { ok: false, error: String(e) }; }
    }
  };
  /* 1.2.137 (user, 11 Nov 2026: "my biggest issue was that the photos didn't appear during the slideshow"):
     a phone browser may not read an agency's page, so the Supabase function model-photos reads it and
     gives back the photo addresses (the same reading the computer program does). Signed-in members only. */
  const GAL = new Map();
  window.illu.modelPhotos = async page => {
    page = String(page || '');
    if (!/^https?:\/\//i.test(page)) return { photos: [], why: 'nolink' };
    if (GAL.has(page)) return GAL.get(page);
    const job = (async () => {
      const C = window.ILLU_CONFIG || {}, sb = window.__illuSb;
      let tk = ''; try { const { data } = await sb.auth.getSession(); tk = (data && data.session && data.session.access_token) || ''; } catch (e) {}
      if (!tk || !C.url) return { photos: [], why: 'none' };
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 25000);
      try {
        const r = await fetch(C.url + '/functions/v1/model-photos', { method: 'POST', signal: ctl.signal,
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk, apikey: C.key }, body: JSON.stringify({ page }) });
        const j = await r.json().catch(() => ({}));
        return j && Array.isArray(j.photos) ? j : { photos: [], why: 'none' };
      } catch (e) { return { photos: [], why: 'none' }; } finally { clearTimeout(t); }
    })();
    GAL.set(page, job); job.then(v => { if (!v.photos.length) setTimeout(() => GAL.delete(page), 60000); });
    while (GAL.size > 300) GAL.delete(GAL.keys().next().value);
    return job;
  };
  /* agency sites often refuse their photos to other sites; a photo asked for with no referrer is usually allowed */
  try { const m = document.createElement('meta'); m.name = 'referrer'; m.content = 'no-referrer'; (document.head || document.documentElement).appendChild(m); } catch (e) {}
  /* keep the service worker's copy of the sign-in fresh (it is renewed about every hour) */
  async function tok() { try { const sb = window.__illuSb; if (!sb) return; const { data } = await sb.auth.getSession(); if (data && data.session) await window.illu.setToken(data.session.access_token); } catch (e) {} }
  setTimeout(tok, 3000); setInterval(tok, 4 * 60 * 1000);
  addEventListener('visibilitychange', () => { if (!document.hidden) tok(); });
  /* 1.2.138 (user, 11 Nov 2026 - phone screenshots: the viewer's thumbnails stayed blank): an agency's photos are
     full size (Ego: 10-40 seconds each, tested), and 81 of them at once starve a phone's connection. On the phone
     the strip, the card slideshow and the big photo use a shrunk copy from the free image service images.weserv.nl
     (about 7 KB a thumbnail, tested); if that ever fails the picture falls back to the agency's own file. */
  window.__illuSmall = (u, w) => {
    u = String(u || '');
    if (!/^https?:\/\//i.test(u) || /images\.weserv\.nl|supabase\.co|\/_blob\//.test(u) || /\.(gif|svg)(\?|$)/i.test(u)) return u;
    return 'https://images.weserv.nl/?url=' + encodeURIComponent(u) + '&w=' + (w || 400) + '&we&output=jpg&q=' + ((w || 400) > 900 ? 82 : 72) + '&default=' + encodeURIComponent(u);
  };
  /* the cards' agency photos go through the same service (smaller, and agencies that refuse other sites still show) */
  /* applied as soon as the card code has loaded (build_web puts web-after-s02.js right after s02.js), so the first
     drawing of the cards already uses the small copies; again at DOMContentLoaded in case */
  window.__illuWrapPhotos = () => {
    if (window.__illuWrapped || typeof window.picCell !== 'function') return; window.__illuWrapped = true;
    /* the booking cards' photos (Booking board, Today, the booking window) likewise */
    if (typeof window.bkPhoto === 'function') { const bp0 = window.bkPhoto; window.bkPhoto = function (c) { const u = bp0.apply(this, arguments); return /^https?:/i.test(u || '') ? window.__illuSmall(u, 600) : u; }; }
    const pc0 = window.picCell;
    window.picCell = function (key, nm, src) {
      const h = pc0.apply(this, arguments);
      return h.replace(/<img class="agimg"([^>]*?) src="(https?:[^"]+)"/, (m, a, u) => { const raw = u.replace(/&amp;/g, '&'); return '<img class="agimg"' + a + ' src="' + window.__illuSmall(raw, 700).replace(/&/g, '&amp;') + '"'; });
    };
  };
  addEventListener('DOMContentLoaded', () => window.__illuWrapPhotos());
  addEventListener('error', e => { const i = e.target; if (i && i.tagName === 'IMG') { const s = i.getAttribute('src') || ''; if (/images\.weserv\.nl/.test(s)) { e.stopImmediatePropagation(); try { i.src = new URL(s).searchParams.get('url'); } catch (er) {} } } }, true);
  /* a photograph the phone cannot open (files kept only on the office computer) shows a quiet blank, not a broken picture */
  const BLANK = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 40"><rect width="30" height="40" fill="#EDE7F0"/><circle cx="15" cy="15" r="6" fill="#D8CDDE"/><path d="M4 40c1-9 6-13 11-13s10 4 11 13z" fill="#D8CDDE"/></svg>');
  addEventListener('error', e => { const i = e.target; if (i && i.tagName === 'IMG' && !i.dataset.illublank && i.getAttribute('src') !== BLANK) { i.dataset.illublank = '1'; i.src = BLANK; } }, true);
  /* phone layout fixes (Suggestiones header, the bottom menu fitting the screen) */
  addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent =
    '@media (max-width:760px){.rchd{flex-wrap:wrap;gap:10px!important}.rchd>div:first-child{flex:1 1 100%!important}.rchd .rc2tabs{display:flex;flex-wrap:nowrap;width:100%}.rchd .rc2tabs button{flex:1;white-space:nowrap;padding:0 8px}.rchd>.rcnav{margin-left:0!important}.rchd>.illufs span{display:none}' +
    '#shrail{gap:0!important}#shrail .shnv{flex:1 1 0;min-width:40px;width:auto!important;max-width:56px}#shrail .shfoot{margin-left:0!important}}'; document.head.appendChild(st); });
  /* 1.2.137 (user, 11 Nov 2026: "have the program restart on its own on mobile without me having to exit or
     close the app"): the app checks the published version every 5 minutes and whenever it comes back to the
     screen; a newer one reloads the app by itself - straight away when it is in the background, otherwise
     after a short "Updating" note, and never while something is being typed. */
  (function autoUpdate(){
    const root = new URL((document.currentScript && document.currentScript.src) || location.href).href.replace(/web-illu\.js.*$/, '');
    let busy = false, waiting = '';
    const typing = () => { const a = document.activeElement; return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable)); };
    /* a reload that still came back with the old version (a phone or network cache) is not repeated for
       10 minutes, so the app can never get stuck reloading */
    const tried = v => { try { const t = JSON.parse(sessionStorage.getItem('illu.upd') || 'null'); return t && t.v === v && Date.now() - t.at < 600000; } catch (e) { return false; } };
    const reload = v => { try { sessionStorage.setItem('illu.upd', JSON.stringify({ v, at: Date.now() })); } catch (e) {} location.reload(); };
    const go = v => {
      if (tried(v)) return;
      if (document.hidden) { reload(v); return; }
      if (typing()) { waiting = v; return; }
      let n = document.getElementById('illuupd');
      if (!n) { n = document.createElement('div'); n.id = 'illuupd'; n.setAttribute('role', 'status');
        n.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%);z-index:2147483647;background:#5A2C57;color:#fff;font:600 13px/1.2 Inter,system-ui,sans-serif;padding:9px 16px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.25)';
        document.body.appendChild(n); }
      n.textContent = (document.documentElement.lang === 'ko' ? '새 버전 ' + v + '(으)로 업데이트 중…' : 'Updating to ' + v + '…');
      setTimeout(() => reload(v), 1500);
    };
    async function check(){
      if (busy || !navigator.onLine) return; busy = true;
      try {
        const r = await fetch(root + 'version.txt?t=' + Date.now(), { cache: 'no-store' });
        const v = r.ok ? (await r.text()).trim() : '';
        const have = String(window.ILLU_WEB_VERSION || '');
        if (v && have && /^\d+(\.\d+)+$/.test(v) && v !== have) go(v);
      } catch (e) {} finally { busy = false; }
    }
    window.__illuUpdateCheck = check;
    /* tell the service worker which version runs, so it drops the files it kept for older ones */
    try { navigator.serviceWorker && navigator.serviceWorker.ready.then(reg => { const w = navigator.serviceWorker.controller || reg.active; if (w && window.ILLU_WEB_VERSION) w.postMessage({ illuVer: String(window.ILLU_WEB_VERSION) }); }); } catch (e) {}
    setInterval(check, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    addEventListener('online', check); addEventListener('pageshow', check);
    document.addEventListener('focusout', () => setTimeout(() => { if (waiting && !typing()) { const v = waiting; waiting = ''; go(v); } }, 300));
    setTimeout(check, 20000);
  })();
  /* the service worker carries the push alerts; it lives at the app's root */
  if ('serviceWorker' in navigator) {
    const root = new URL((document.currentScript && document.currentScript.src) || location.href).href.replace(/web-illu\.js.*$/, '');
    addEventListener('load', () => { navigator.serviceWorker.register(root + 'sw.js', { scope: root }).catch(() => {}); });
  }
})();
