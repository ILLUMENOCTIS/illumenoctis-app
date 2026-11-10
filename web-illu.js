/* ILLUMÉNOCTIS on the web (phone app / browser): what the computer program's window.illu gives,
   for the things a browser can do. Everything the program does on the computer itself (Booking folders,
   Dropbox, Hiworks, the crawler, the photo viewer's local cache) is simply not offered here. */
(function () {
  'use strict';
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  window.illu = {
    web: true,
    info: async () => ({ version: window.ILLU_WEB_VERSION || '', platform: 'web', arch: '', dark: matchMedia('(prefers-color-scheme: dark)').matches }),
    setDir: async d => { LS.set('illu.web.dir', JSON.stringify(d || {})); return true; },
    dirSync: () => { try { return JSON.parse(LS.get('illu.web.dir') || 'null') || { ag: [], admin: '', me: '' }; } catch (e) { return { ag: [], admin: '', me: '' }; } },
    setToken: async () => true,
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
  /* the service worker carries the push alerts; it lives at the app's root */
  if ('serviceWorker' in navigator) {
    const root = new URL((document.currentScript && document.currentScript.src) || location.href).href.replace(/web-illu\.js.*$/, '');
    addEventListener('load', () => { navigator.serviceWorker.register(root + 'sw.js', { scope: root }).catch(() => {}); });
  }
})();
