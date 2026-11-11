/* ILLUMÉNOCTIS phone app: Dropbox (1.2.140).
   User, 11 Nov 2026: "I should be able to view the photos from the slideshow on the card that is connect to the
   Dropbox account that opens up the images/photos/videos, for me to view on the mobile as well" - each phone signs
   in to the company Dropbox once (the person types the sign-in on dropbox.com themselves).
   - Sign-in: OAuth 2 with PKCE for the "ILLUMENOCTIS MDI" Dropbox app (the app key only, no secret), the same app
     the computer program uses. Dropbox sends the phone back to <app>/dbx/ (that address is listed in the app's
     settings on dropbox.com), which finishes the sign-in and returns to where the person was.
   - What is kept on the phone: Dropbox's refresh key (localStorage 'illu.dbx'). Nothing is uploaded or deleted.
   - window.illu.bookingFiles('dbx', folderName, firstName): the model's BOOKING folder, found exactly as the
     computer finds it (illu-mat.js shows 1. BOOK / 2. SNAPS / 3. VIDEOS on her cards and in the viewer).
     Each file gets an address /_blob/bk.<id>; the service worker (sw.js) fetches it from Dropbox with the
     phone's key - photos as Dropbox's own preview in the size asked (?w=), videos through a short-lived link. */
(function () {
  'use strict';
  if (!window.illu || !window.illu.web) return;
  const APP_KEY = 'bdw50m1dscm4pva';
  const BASE_WANT = '/ILLUMENOCTIS/BOOKING';
  /* this file sits at the app's root (<app>/web-dbx.js), loaded by dash/ and dbx/ */
  const APPROOT = new URL((document.currentScript && document.currentScript.src) || location.href).href.replace(/web-dbx\.js.*$/, '');
  const REDIRECT = APPROOT + 'dbx/';
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
  const S = () => { try { return JSON.parse(LS.get('illu.dbx') || 'null'); } catch (e) { return null; } };
  const save = s => LS.set('illu.dbx', JSON.stringify(s));
  const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const form = o => Object.entries(o).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');

  async function connect() {
    const verifier = b64u(crypto.getRandomValues(new Uint8Array(48)));
    const challenge = b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const state = b64u(crypto.getRandomValues(new Uint8Array(16)));
    LS.set('illu.dbx.pkce', JSON.stringify({ verifier, state, back: location.href, at: Date.now() }));
    location.href = 'https://www.dropbox.com/oauth2/authorize?' + form({ client_id: APP_KEY, response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256', redirect_uri: REDIRECT, token_access_type: 'offline', state });
    return { ok: true, leaving: true };
  }
  async function tokenCall(body) {
    const r = await fetch('https://api.dropboxapi.com/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.error || ('HTTP ' + r.status));
    return j;
  }
  /* the /dbx/ page calls this with Dropbox's answer */
  async function finish(params) {
    const p = (() => { try { return JSON.parse(LS.get('illu.dbx.pkce') || 'null'); } catch (e) { return null; } })();
    if (!p) throw new Error('the sign-in was not started on this phone');
    if (params.get('error')) throw new Error(params.get('error_description') || params.get('error'));
    if (params.get('state') !== p.state) throw new Error('the sign-in did not match (start it again)');
    const j = await tokenCall({ code: params.get('code') || '', grant_type: 'authorization_code', code_verifier: p.verifier, client_id: APP_KEY, redirect_uri: REDIRECT });
    const s = { refresh: j.refresh_token, access: j.access_token, exp: Date.now() + (j.expires_in || 14400) * 1000 - 60000, account: j.account_id || '' };
    save(s); LS.del('illu.dbx.pkce');
    try { const a = await api('users/get_current_account', null); s.name = (a.name && a.name.display_name) || ''; s.email = a.email || ''; save(s); } catch (e) {}
    try { await findBase(true); } catch (e) {}
    return { ok: true, back: p.back || (APPROOT + 'dash/index.html') };
  }
  async function token() {
    const s = S(); if (!s || !s.refresh) throw Object.assign(new Error('Dropbox is not connected on this phone'), { need: 'connect' });
    if (s.access && s.exp > Date.now()) return s.access;
    const j = await tokenCall({ grant_type: 'refresh_token', refresh_token: s.refresh, client_id: APP_KEY });
    s.access = j.access_token; s.exp = Date.now() + (j.expires_in || 14400) * 1000 - 60000; save(s);
    pushToken(s.access, s.exp);
    return s.access;
  }
  /* the service worker reads the current key from the phone's cache (it cannot read localStorage) */
  async function pushToken(t, exp) { try { const c = await caches.open('illu-auth'); await c.put('/__illu_dbx', new Response(JSON.stringify({ t, exp }))); } catch (e) {} }
  async function api(ep, body) {
    const t = await token();
    const r = await fetch('https://api.dropboxapi.com/2/' + ep, { method: 'POST', headers: Object.assign({ Authorization: 'Bearer ' + t }, body === null ? {} : { 'Content-Type': 'application/json' }), body: body === null ? undefined : JSON.stringify(body) });
    const txt = await r.text(); let j = {}; try { j = JSON.parse(txt); } catch (e) { j = { error_summary: txt }; }
    if (!r.ok) throw Object.assign(new Error(j.error_summary || ('HTTP ' + r.status)), { summary: j.error_summary || '', status: r.status });
    return j;
  }
  async function meta(p) { try { return await api('files/get_metadata', { path: p }); } catch (e) { if (/not_found/.test(e.summary || '')) return null; throw e; } }
  async function listAll(p, recursive, max) {
    let j = await api('files/list_folder', { path: p, recursive: !!recursive, limit: 2000 }); const out = j.entries.slice();
    while (j.has_more && out.length < (max || 6000)) { j = await api('files/list_folder/continue', { cursor: j.cursor }); out.push(...j.entries); }
    return out;
  }
  async function findBase(force) {
    const s = S(); if (s && s.base && !force) return s.base;
    let base = ''; const m = await meta(BASE_WANT); if (m && m['.tag'] === 'folder') base = m.path_display;
    if (!base) {
      try {
        const r = await api('files/search_v2', { query: 'ILLUMENOCTIS', options: { filename_only: true, max_results: 50 } });
        for (const h of (r.matches || [])) { const md = h.metadata && h.metadata.metadata; if (!md || md['.tag'] !== 'folder' || !/^illumenoctis$/i.test(md.name)) continue; const b = await meta(md.path_lower + '/booking'); if (b && b['.tag'] === 'folder') { base = b.path_display; break; } }
      } catch (e) {}
    }
    const s2 = S(); if (s2 && base) { s2.base = base; save(s2); }
    return base;
  }
  /* the folder of one model - the same rules as the computer (app/main.js webFindDir) */
  const bkClean = s => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 120);
  const bkNorm = s => String(s || '').normalize('NFC').toLowerCase().replace(/[‐-―]/g, '-').replace(/\s+/g, ' ').trim();
  const TABRE = /^\d*\s*\.?\s*(book|snaps|videos|passport|contract|visa|airline ticket|statement)$/i;
  let ROOTDIRS = { at: 0, base: '', list: [] };
  async function rootDirs(base) {
    if (ROOTDIRS.base === base && Date.now() - ROOTDIRS.at < 120000) return ROOTDIRS.list;
    const list = (await listAll(base, false)).filter(e => e['.tag'] === 'folder').map(e => e.name);
    ROOTDIRS = { at: Date.now(), base, list }; return list;
  }
  async function findDir(base, name, first) {
    const dirs = await rootDirs(base);
    const want = bkNorm(bkClean(name));
    const hit = dirs.find(d => bkNorm(d) === want); if (hit) return base + '/' + hit;
    const f = bkNorm(first).split(/[\s-]+/)[0] || ''; if (f.length < 2) return null;
    const fits = [];
    for (const d of dirs.filter(d => bkNorm(d).split(/[\s-]+/).includes(f))) { try { if ((await listAll(base + '/' + d, false)).some(x => x['.tag'] === 'folder' && TABRE.test(x.name.trim()))) fits.push(d); } catch (e) {} }
    return fits.length === 1 ? base + '/' + fits[0] : null;
  }
  async function hash(s) { const d = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 32); }
  async function bookingFiles(src, name, first) {
    if (src !== 'dbx') return { ok: false, why: 'this phone has no folders of its own' };
    if (!S()) return { ok: false, need: 'connect' };
    let base = ''; try { base = await findBase(); } catch (e) { return { ok: false, why: 'Dropbox: ' + (e.summary || e.message) }; }
    if (!base) return { ok: false, why: 'no ILLUMENOCTIS › BOOKING folder in this Dropbox' };
    let dir; try { dir = await findDir(base, name, first); } catch (e) { return { ok: false, why: 'Dropbox: ' + (e.summary || e.message) }; }
    if (!dir) return { ok: true, found: false, root: 'Dropbox' + base, want: bkClean(name), web: true };
    let ents; try { ents = await listAll(dir, true, 6000); } catch (e) { return { ok: false, why: 'Dropbox: ' + (e.summary || e.message) }; }
    const low = dir.toLowerCase() + '/', files = [], map = {};
    for (const e of ents) {
      if (e['.tag'] !== 'file' || files.length >= 3000 || !String(e.path_lower || '').startsWith(low)) continue;
      const rel = e.path_display.slice(dir.length + 1), parts = rel.split('/');
      if (parts.length > 5 || parts.some(x => x.startsWith('.')) || /^(desktop\.ini|thumbs\.db|~\$.*)$/i.test(e.name)) continue;
      const rid = 'bk.' + await hash('web|' + e.path_lower + '|' + e.rev);
      map[rid] = { p: e.path_lower, n: e.name };
      files.push({ rel, size: e.size, mtime: Date.parse(e.server_modified || e.client_modified) || 0, rid });
    }
    /* the service worker learns which Dropbox file each address is */
    try { const c = await caches.open('illu-auth'); const old = await c.match('/__illu_bkmap'); const m = old ? await old.json() : {}; Object.assign(m, map); const keys = Object.keys(m); if (keys.length > 20000) for (const k of keys.slice(0, keys.length - 20000)) delete m[k]; await c.put('/__illu_bkmap', new Response(JSON.stringify(m))); } catch (e) {}
    try { await token().then(t => pushToken(t, (S() || {}).exp || 0)); } catch (e) {}
    return { ok: true, found: true, web: true, folder: dir.split('/').pop(), root: 'Dropbox' + base, files };
  }
  window.illu.bookingFiles = bookingFiles;
  window.illu.dropboxConnect = connect;
  window.illu.dropboxStatus = async () => { const s = S(); return s ? { connected: true, name: s.name || '', email: s.email || '', base: s.base || '' } : { connected: false }; };
  window.illu.dropboxDisconnect = async () => { LS.del('illu.dbx'); try { const c = await caches.open('illu-auth'); await c.delete('/__illu_dbx'); await c.delete('/__illu_bkmap'); } catch (e) {} return { ok: true }; };
  window.__illuDbxFinish = finish;
  window.__illuDbxApi = api;
  /* keep the service worker's key fresh while the app is open */
  if (S()) token().then(t => pushToken(t, (S() || {}).exp || 0)).catch(() => {});
})();
