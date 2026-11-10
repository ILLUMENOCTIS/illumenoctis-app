/* ILLUMÉNOCTIS service worker: shows the push alerts (votes, the 7:00 arrivals / departures) and opens
   the app where the alert points. It does not cache pages, so the app is always the newest version. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
/* Android Chrome offers "Install app" only when the app can open without a connection, so the start
   page is kept and shown when there is no signal; everything else always comes fresh from the internet. */
const START = 'illu-start-v1';
/* stored photographs (/_blob/<id>): fetched from the shared database with the person's sign-in, kept on the phone */
self.window = self; try { importScripts('config.js'); } catch (e) {}
async function blob(id) {
  const kept = await caches.open('illu-blob'), hit = await kept.match('/_blob/' + id); if (hit) return hit;
  if (!/^[A-Za-z0-9._-]{4,120}$/.test(id) || id.startsWith('bk.')) return new Response('', { status: 404 });
  const t = await (await caches.open('illu-auth')).match('/__illu_token'); const tk = t ? await t.text() : '';
  const C = self.ILLU_CONFIG || {}; if (!tk || !C.url) return new Response('', { status: 401 });
  const r = await fetch(C.url + '/storage/v1/object/authenticated/assets/' + encodeURIComponent(id), { headers: { Authorization: 'Bearer ' + tk, apikey: C.key } });
  if (!r.ok) return new Response('', { status: r.status });
  const out = new Response(await r.blob(), { headers: { 'content-type': r.headers.get('content-type') || 'application/octet-stream', 'cache-control': 'max-age=31536000' } });
  try { await kept.put('/_blob/' + id, out.clone()); } catch (e) {}
  return out;
}
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin === self.location.origin && u.pathname.startsWith('/_blob/')) { e.respondWith(blob(decodeURIComponent(u.pathname.slice(7)))); return; }
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && new URL(e.request.url).pathname.endsWith('/index.html')) { const c = r.clone(); caches.open(START).then(x => x.put(e.request, c)).catch(() => {}); }
    return r;
  }).catch(async () => (await caches.match(e.request)) || (await caches.match(new URL('./index.html', self.registration.scope).href)) ||
    new Response('<!doctype html><meta name=viewport content="width=device-width"><body style="font:16px system-ui;padding:40px;text-align:center">ILLUMÉNOCTIS needs an internet connection.</body>', { headers: { 'content-type': 'text/html; charset=utf-8' } })));
});
self.addEventListener('push', e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (er) { m = { title: 'ILLUMÉNOCTIS', body: e.data ? e.data.text() : '' }; }
  const base = self.registration.scope;
  e.waitUntil(self.registration.showNotification(m.title || 'ILLUMÉNOCTIS', {
    body: m.body || '', tag: m.tag || undefined, renotify: !!m.tag,
    icon: base + 'icons/icon-192.png', badge: base + 'icons/badge-96.png',
    data: { url: new URL(m.url || './dash/index.html', base).href }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if (c.url.startsWith(self.registration.scope)) { try { await c.navigate(url); } catch (er) {} return c.focus(); } }
    return self.clients.openWindow(url);
  })());
});
