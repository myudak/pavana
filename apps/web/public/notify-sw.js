// Pavana notification service worker — DEMO.
// It only shows notifications that the open page asks for and focuses the app when
// one is clicked. No fetch handler (nothing is cached) and no `push` handler yet:
// real Web Push from the server is tracked in docs/backlog.md.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c);
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
