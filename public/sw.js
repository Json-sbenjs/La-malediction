// Service worker : l'appli continue de marcher sans réseau (salle sans Wi-Fi).
// Stratégie : réseau d'abord, et on garde une copie ; sans réseau, on sert la copie.
const CACHE = 'malediction-v1';
const BASE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request)
      .then((reponse) => {
        const copie = reponse.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copie));
        return reponse;
      })
      .catch(() =>
        caches.match(e.request).then((r) => r ?? (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined)),
      ),
  );
});
