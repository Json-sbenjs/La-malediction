// Service worker : l'appli continue de marcher sans réseau (salle sans Wi-Fi).
// Stratégie : réseau d'abord, et on garde une copie ; sans réseau, on sert la copie.
const CACHE = 'malediction-v4';
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
// Sons (public/sons, liste vérifiée par tests/web/sons-fichiers.test.ts) : la partie se joue sans réseau.
const SONS = [
  './sons/musique/musique_fond.mp3',
  './sons/ambiance/amb_jour.mp3', './sons/ambiance/amb_nuit.mp3',
  './sons/ui/ui_annuler.mp3', './sons/ui/ui_clic.mp3', './sons/ui/ui_deselection.mp3', './sons/ui/ui_erreur.mp3',
  './sons/ui/ui_glisser.mp3', './sons/ui/ui_selection.mp3', './sons/ui/ui_succes.mp3', './sons/ui/ui_tirage.mp3',
  './sons/ui/ui_valider.mp3', './sons/ui/ui_voix.mp3',
  './sons/transitions/tr_debut_partie.mp3', './sons/transitions/tr_jour_se_leve.mp3',
  './sons/transitions/tr_nuit_tombe.mp3',
  './sons/sfx/sfx_aucun_elimine.mp3', './sons/sfx/sfx_couronne.mp3', './sons/sfx/sfx_glas.mp3',
  './sons/sfx/sfx_mort.mp3', './sons/sfx/sfx_murmure.mp3', './sons/sfx/sfx_nuit_calme.mp3',
  './sons/sfx/sfx_revelation.mp3', './sons/sfx/sfx_verdict.mp3',
  './sons/fin/fin_pelerins.mp3', './sons/fin/fin_personne.mp3', './sons/fin/fin_solitaire.mp3',
  './sons/fin/fin_spectres.mp3',
  './sons/roles/role_adepte.mp3', './sons/roles/role_alpha.mp3', './sons/roles/role_anatheme.mp3',
  './sons/roles/role_augure.mp3', './sons/roles/role_bourreau.mp3', './sons/roles/role_courtisane.mp3',
  './sons/roles/role_devoue.mp3', './sons/roles/role_doubles.mp3', './sons/roles/role_enchanteur.mp3',
  './sons/roles/role_envouteur.mp3', './sons/roles/role_inquisiteur.mp3', './sons/roles/role_instinct.mp3',
  './sons/roles/role_main-noire.mp3', './sons/roles/role_maudit.mp3', './sons/roles/role_medium.mp3',
  './sons/roles/role_necromancien.mp3', './sons/roles/role_oracle.mp3', './sons/roles/role_originel.mp3',
  './sons/roles/role_pelerin.mp3', './sons/roles/role_protecteur.mp3', './sons/roles/role_revenant.mp3',
  './sons/roles/role_sacrifie.mp3', './sons/roles/role_sainte.mp3', './sons/roles/role_sectaire.mp3',
  './sons/roles/role_spectre.mp3', './sons/roles/role_trinite.mp3', './sons/roles/role_usurpateur.mp3',
  './sons/roles/role_vipere.mp3',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([...BASE, ...SONS])));
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
