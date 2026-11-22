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

## Organisation du code

```
src/
├── engine/          moteur du jeu, TypeScript pur
│   ├── types.ts     types de base : Joueur, Camp, RoleId, Phase, EtatPartie, Action
│   ├── roles.ts     registre des rôles : camp, cartes, réveil, usage unique
│   ├── plans.ts     plans de salle + validerPlan()
│   ├── mise-en-place.ts  choix salle + nb de joueurs → plan → creerPartie()
│   ├── nuit.ts      ordre de réveil, « si en vie » / « si occupé », rôles de nuit
│   ├── resolution-nuit.ts  morts de la nuit : attaque, protection, Sainte, Vipère
│   ├── mort.ts      effets à la mort : Main Noire, Anathème, Adepte, Usurpateur, Alpha
│   ├── vote.ts      élection de l'Alpha, vote du village (Alpha ×2)
│   ├── victoire.ts  conditions de victoire
│   ├── outils.ts    petites fonctions partagées (trouverJoueur, vivants…)
│   └── index.ts     porte d'entrée : creerPartie, etapeSuivante, appliquer
└── web/             interface tablette (PWA avec Vite)
    └── main.ts
tests/
└── engine/          tests Vitest du moteur, un fichier par module
    ├── aides.ts         outils partagés (planDeTest, jouerNuit, finirNuit…)
    ├── roles.test.ts, plans.test.ts, mise-en-place.test.ts
    ├── nuit.test.ts, resolution-nuit.test.ts, mort.test.ts
    ├── vote.test.ts, victoire.test.ts
    ├── partie-complete.test.ts   ★ jalon : une partie du début à la victoire
    └── purete.test.ts   vérifie que le moteur reste pur
asset/               planche des cartes (PDF)
```

### Principe

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
| S4 (14/12) | effets à la mort, première nuit, écrans tablette, Trinité |
| S5 (21/12) | écrans tablette. Jalon : partie réelle sur iPad |

Après la deadline : terminal de test, historique et annulation, et les autres rôles.

## Rôles déjà dans le registre

Spectre, Pèlerin, Oracle, Protecteur, Courtisane, Instinct, Sainte, Vipère, Main Noire, Anathème, Adepte, Usurpateur, Alpha, Trinité.

## Branches

- `main` : le nouveau départ, repris de zéro le 20/11/2026.
- `ancien-code` : l'ancienne version, gardée seulement comme référence.
