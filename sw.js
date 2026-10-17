// Service worker: instalare ca aplicație + notificări push în fundal (Firebase Cloud Messaging).
self.window = self;
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');
importScripts('firebase-config.js');

try {
  firebase.initializeApp(self.FIREBASE_CONFIG);
  const messaging = firebase.messaging();
  // mesajele sunt "data-only": afișarea o facem noi, o singură dată
  messaging.onBackgroundMessage(function (payload) {
    const d = (payload && payload.data) || {};
    return self.registration.showNotification(d.titlu || 'MTC Transport', {
      body: d.text || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: d.id || undefined,
      data: { tab: d.tab || 'acasa', url: d.url || '' }
    });
  });
} catch (e) { /* fără push, dar aplicația merge normal */ }

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const d = event.notification.data || {};
  const target = (d.url || self.registration.scope + 'portal.html').split('#')[0] + '#tab=' + (d.tab || 'acasa');
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (const c of list) {
      if ('focus' in c) { c.postMessage({ type: 'open-tab', tab: d.tab || 'acasa' }); return c.focus(); }
    }
    return clients.openWindow(target);
  }));
});
