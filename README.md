# La Malédiction — assistant du MJ

La Malédiction est un loup-garou maison de 8 à 25 joueurs. Les **pèlerins** doivent démasquer et éliminer les **spectres** infiltrés parmi eux avant d'être tous maudits.

Ce dépôt contient l'**assistant du maître du jeu** : une appli que le MJ utilise seul pour se faire guider pendant la partie (mise en place, nuits, votes, victoire). Elle doit tourner sur tablette (iPad) et sur PC.

## Démarrer

Il faut Node 20 ou plus.

```bash
npm install
```

```bash
npm test
```

| Commande | Rôle |
| --- | --- |
| `npm test` | lance tous les tests Vitest une fois |
| `npm run test:watch` | relance les tests à chaque modification |
| `npm run dev` | lance l'interface web en local (Vite) |
| `npm run build` | vérifie les types (`tsc`) puis construit l'appli dans `dist/` |
| `npm run preview` | sert la version construite |

### Sur l'iPad

- **En local** (même Wi-Fi) : `npm run dev -- --host`, puis ouvrir l'adresse « Network » affichée dans Safari.
- **En ligne** : chaque push sur `main` publie l'appli sur GitHub Pages (`.github/workflows/pages.yml`).
  À activer une fois dans GitHub : *Settings → Pages → Source : GitHub Actions*.
  Adresse : https://json-sbenjs.github.io/La-malediction/
- **Installer** : dans Safari, *Partager → Sur l'écran d'accueil*. L'appli marche ensuite sans réseau,
  la partie en cours est gardée si on la ferme, et l'écran ne se met pas en veille pendant la partie.

## Organisation du code

```
src/
├── engine/          moteur du jeu, TypeScript pur
│   ├── types.ts     types de base : Joueur, Camp, RoleId, Phase, EtatPartie, Action
│   ├── roles.ts     registre des rôles : camp, cartes, réveil, usage unique
│   ├── plans.ts     plans de salle + validerPlan()
│   ├── mise-en-place.ts  choix salle + nb de joueurs → plan → creerPartie()
│   ├── premiere-nuit.ts  reconnaissances, modèle de l'Anathème, mentor de l'Adepte
│   ├── nuit.ts      ordre de réveil, « si en vie » / « si occupé », rôles de nuit
│   ├── resolution-nuit.ts  morts de la nuit : attaque, protection, Sainte, Vipère
│   ├── mort.ts      effets à la mort : Main Noire, Anathème, Adepte, Usurpateur, Alpha, Trinité
│   ├── vote.ts      élection de l'Alpha, vote du village (Alpha ×2)
│   ├── victoire.ts  conditions de victoire
│   ├── generateur.ts  salle sur mesure : composition conseillée, formes, tirage des rôles
│   ├── historique.ts  annuler la dernière action (états précédents gardés)
│   ├── outils.ts    petites fonctions partagées (trouverJoueur, vivants…)
│   └── index.ts     porte d'entrée : creerPartie, etapeSuivante, appliquer
└── web/             interface tablette (Vite)
    ├── main.ts      écrans : choix du plan, plan cliquable, nuit guidée, jour + vote
    ├── consignes.ts textes du MJ et saisie de chaque rôle
    ├── generateur.ts  écran « salle sur mesure »
    ├── plans-demo.ts  plans de démonstration (en attendant les vrais)
    └── style.css
tests/
└── engine/          tests Vitest du moteur, un fichier par module
    ├── aides.ts         outils partagés (planDeTest, jouerNuit, finirNuit…)
    ├── roles.test.ts, plans.test.ts, mise-en-place.test.ts
    ├── nuit.test.ts, resolution-nuit.test.ts, mort.test.ts
    ├── vote.test.ts, victoire.test.ts, premiere-nuit.test.ts, trinite.test.ts
    ├── nouveaux-roles.test.ts   les 14 rôles ajoutés après la deadline
    ├── historique.test.ts   annuler la dernière action
    ├── plans-demo.test.ts, generateur.test.ts
    ├── partie-complete.test.ts   ★ jalon : une partie du début à la victoire
    └── purete.test.ts   vérifie que le moteur reste pur
public/              manifeste, service worker (hors ligne), icônes
asset/               planche des cartes (PDF)
```

### Principe

Déroulé d'une partie : **nuit d'explication** (seulement les rôles de la partie, un par un, dans l'ordre du jeu :
d'abord la meute des Spectres, les Doubles et la Trinité qui se reconnaissent, l'Anathème et l'Adepte qui choisissent
modèle et mentor ; puis les rôles de la nuit dans l'ordre des réveils ; enfin les rôles du jour et des morts ;
personne ne meurt) → **élection de l'Alpha** (le maire) →
**première nuit** → jour 1 (vote) → nuit 2…

Le moteur est une **machine à états** : l'état de la partie plus une action du MJ donnent un nouvel état. L'interface ne fait qu'afficher l'étape suivante et renvoyer les choix du MJ au moteur.

Porte d'entrée (`src/engine/index.ts`) :

- `creerPartie(plan, prenoms?)` crée la partie ;
- `etapeSuivante(etat)` dit ce que le MJ doit faire ;
- `appliquer(etat, action)` renvoie le nouvel état.

### Règle d'or

Rien dans `src/engine/` ne doit utiliser `fs`, `readline`, `process` ou le DOM, sinon le moteur ne tournera pas sur l'iPad. Le test `purete.test.ts` le vérifie automatiquement.

## Architecture et planning

Tout se conçoit d'abord dans le FigJam **malediction** (architecture, diagramme de flux, rôles, Gantt) :
https://www.figma.com/board/xRPHkwHb3IT2knM3Vhf3ff

Deadline : le 27/12. On code d'abord les rôles qui sont sur les plans de salle.

| Semaine | Contenu |
| --- | --- |
| S1 (23/11) | projet, types, rôles, plans de salle ✅ (plans à saisir) |
| S2 (30/11) | plans, mise en place, `index.ts`, nuit (ordre de réveil), rôles de nuit ✅ (plans à saisir) |
| S3 (07/12) | rôles de nuit, résolution de la nuit, vote, effets à la mort, victoire. Jalon : une partie complète dans les tests ✅ |
| S4 (14/12) | effets à la mort, première nuit, écrans tablette, Trinité ✅ |
| S5 (21/12) | écrans tablette (installable, hors ligne) ✅, générateur de salle sur mesure ✅. Jalon : partie réelle sur iPad (à jouer) |

Après la deadline : terminal de test. (Historique et annulation, les autres rôles : faits.)

## Rôles

Les 28 cartes du jeu sont codées (`src/engine/roles.ts`) :

- **Pèlerins** : Pèlerin, Dévoué, Oracle, Protecteur, Courtisane, Instinct, Sainte, Vipère, Main Noire, Augure, Médium,
  Inquisiteur, Enchanteur, Sacrifié, Bourreau, Usurpateur, Alpha.
- **Spectres** : Spectre, Originel.
- **Camp variable** : Anathème, Adepte.
- **Groupes solitaires qui deviennent Pèlerins** : Trinité, Doubles.
- **Solitaires** : Maudit, Sectaire, Envoûteur, Nécromancien (et son Revenant, créé en cours de partie).

## Branches

- `main` : le nouveau départ, repris de zéro le 20/11/2026.
- `ancien-code` : l'ancienne version, gardée seulement comme référence.
