// Service worker minim: necesar ca telefonul să accepte instalarea ca aplicație.
// Nu păstrează nimic în memorie — pagina și datele vin mereu proaspete.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // lasă browserul să facă cererea normal
