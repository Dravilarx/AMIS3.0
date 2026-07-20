// Service worker mínimo del Asistente AMIS.
// Solo lo justo para que el navegador ofrezca "agregar a pantalla de inicio"
// (instalable). Sin caché offline sofisticado: deja pasar las peticiones a la red.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* passthrough: la red maneja la petición */ });
