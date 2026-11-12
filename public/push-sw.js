self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === 'string' ? payload.title : 'EduVerse';
  const body = typeof payload.body === 'string'
    ? payload.body
    : 'มีการแจ้งเตือนใหม่เกี่ยวกับบุตรหลาน';
  const url = typeof payload.url === 'string' ? payload.url : '/';

  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requestedUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin)) {
        await client.focus();
        return;
      }
    }
    await self.clients.openWindow(requestedUrl);
  })());
});
