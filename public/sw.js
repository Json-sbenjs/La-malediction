// Service worker : l'appli continue de marcher sans réseau (salle sans Wi-Fi).
// Stratégie : réseau d'abord, et on garde une copie ; sans réseau, on sert la copie.
const CACHE = 'malediction-v2';
// Page, icônes, blason et illustrations des cartes : tout est là dès la première visite.
const BASE = [
  './', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './blason.webp',
  './roles/adepte.webp', './roles/alpha.webp', './roles/anatheme.webp', './roles/augure.webp',
  './roles/bourreau.webp', './roles/courtisane.webp', './roles/devoue.webp', './roles/doubles.webp',
  './roles/enchanteur.webp', './roles/envouteur.webp', './roles/inquisiteur.webp', './roles/instinct.webp',
  './roles/main-noire.webp', './roles/maudit.webp', './roles/medium.webp', './roles/necromancien.webp',
  './roles/oracle.webp', './roles/originel.webp', './roles/pelerin.webp', './roles/protecteur.webp',
  './roles/revenant.webp', './roles/sacrifie.webp', './roles/sainte.webp', './roles/sectaire.webp',
  './roles/spectre.webp', './roles/trinite.webp', './roles/usurpateur.webp', './roles/vipere.webp',
];

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
