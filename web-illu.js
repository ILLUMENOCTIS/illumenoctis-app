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
  /* keep the service worker's copy of the sign-in fresh (it is renewed about every hour) */
  async function tok() { try { const sb = window.__illuSb; if (!sb) return; const { data } = await sb.auth.getSession(); if (data && data.session) await window.illu.setToken(data.session.access_token); } catch (e) {} }
  setTimeout(tok, 3000); setInterval(tok, 4 * 60 * 1000);
  addEventListener('visibilitychange', () => { if (!document.hidden) tok(); });
  /* a photograph the phone cannot open (files kept only on the office computer) shows a quiet blank, not a broken picture */
  const BLANK = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 40"><rect width="30" height="40" fill="#EDE7F0"/><circle cx="15" cy="15" r="6" fill="#D8CDDE"/><path d="M4 40c1-9 6-13 11-13s10 4 11 13z" fill="#D8CDDE"/></svg>');
  addEventListener('error', e => { const i = e.target; if (i && i.tagName === 'IMG' && !i.dataset.illublank && i.getAttribute('src') !== BLANK) { i.dataset.illublank = '1'; i.src = BLANK; } }, true);
  /* phone layout fixes (Suggestiones header, the bottom menu fitting the screen) */
  addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent =
    '@media (max-width:760px){.rchd{flex-wrap:wrap;gap:10px!important}.rchd>div:first-child{flex:1 1 100%!important}.rchd .rc2tabs{display:flex;flex-wrap:nowrap;width:100%}.rchd .rc2tabs button{flex:1;white-space:nowrap;padding:0 8px}.rchd>.rcnav{margin-left:0!important}.rchd>.illufs span{display:none}' +
    '#shrail{gap:0!important}#shrail .shnv{flex:1 1 0;min-width:40px;width:auto!important;max-width:56px}#shrail .shfoot{margin-left:0!important}}'; document.head.appendChild(st); });
  /* the service worker carries the push alerts; it lives at the app's root */
  if ('serviceWorker' in navigator) {
    const root = new URL((document.currentScript && document.currentScript.src) || location.href).href.replace(/web-illu\.js.*$/, '');
    addEventListener('load', () => { navigator.serviceWorker.register(root + 'sw.js', { scope: root }).catch(() => {}); });
  }
})();
