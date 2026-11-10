/* ILLUMÉNOCTIS service worker: shows the push alerts (votes, the 7:00 arrivals / departures) and opens
   the app where the alert points. It does not cache pages, so the app is always the newest version. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
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
