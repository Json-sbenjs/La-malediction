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
│   ├── ajustement.ts  modifier le plan avant de lancer : retirer / ajouter un rôle ou un siège, mélanger
│   ├── premiere-nuit.ts  reconnaissances, modèle de l'Anathème, mentor de l'Adepte
│   ├── nuit.ts      ordre de réveil, « si en vie » / « si occupé », rôles de nuit
│   ├── resolution-nuit.ts  morts de la nuit : attaque, protection, Sainte, Vipère
│   ├── mort.ts      effets à la mort : Main Noire, Anathème, Adepte, Usurpateur, Alpha, Trinité
│   ├── vote.ts      élection de l'Alpha, vote du village (Alpha ×2), voix par voix ou à main levée
│   ├── victoire.ts  conditions de victoire
│   ├── generateur.ts  salle sur mesure : composition conseillée, formes, tirage des rôles
│   ├── historique.ts  annuler la dernière action (états précédents gardés)
│   ├── outils.ts    petites fonctions partagées (trouverJoueur, vivants…)
│   └── index.ts     porte d'entrée : creerPartie, etapeSuivante, appliquer
└── web/             interface tablette (Vite)
    ├── main.ts      écrans : choix du plan, plan cliquable, nuit guidée, jour + vote
    ├── consignes.ts textes du MJ et saisie de chaque rôle
    ├── generateur.ts  écran « salle sur mesure »
    ├── ajustement.ts  écran « Modifier la salle » (joueurs en plus ou en moins)
    ├── composants-salle.ts  compteurs de rôles et aperçu du plan, communs aux deux écrans
    ├── plans-demo.ts  plans de démonstration (en attendant les vrais)
    └── style.css
tests/
└── engine/          tests Vitest du moteur, un fichier par module
    ├── aides.ts         outils partagés (planDeTest, jouerNuit, finirNuit…)
    ├── roles.test.ts, plans.test.ts, mise-en-place.test.ts
    ├── nuit.test.ts, resolution-nuit.test.ts, mort.test.ts
    ├── vote.test.ts, vote-main-levee.test.ts, victoire.test.ts, premiere-nuit.test.ts, trinite.test.ts
    ├── nouveaux-roles.test.ts   les 14 rôles ajoutés après la deadline
    ├── historique.test.ts   annuler la dernière action
    ├── plans-demo.test.ts, generateur.test.ts, ajustement.test.ts
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

Tableau des rôles repris du FigJam **malediction**. Chaque rôle est codé dans `src/engine/roles.ts`.

| Rôle (Loups-Garous de Thiercelieux) | Rôle (Malédiction) | Camp / Victoire | Descriptif du rôle dans la Malédiction | Cartes |
| --- | --- | --- | --- | :---: |
| Simple Villageois | **Pèlerin** | Pèlerins | Habitant ordinaire du village, sans pouvoir particulier. Vote chaque jour pour éliminer un suspect. | 6 |
| Simple Villageois | **Le Dévoué** | Pèlerins | Pèlerin sans pouvoir, mais sa carte est révélée à tous dès le début de la partie. Tout le monde sait qu'il est innocent : il devient un point de confiance pour le village. | 1 |
| Voyante | **L'Oracle** | Pèlerins | Chaque nuit, découvre la véritable identité d'un joueur de son choix. | 1 |
| Sorcière | **La Sainte** | Pèlerins | Possède UNE potion de guérison (sauve la victime des Spectres). Pouvoir utilisable une seule fois dans la partie. | 1 |
| Sorcière (variante) | **La Vipère** | Pèlerins | Possède UNE potion de mort (empoisonne un joueur de son choix). Pouvoir utilisable une seule fois dans la partie. C'est le pendant maléfique de la Sainte. | 1 |
| Chasseur | **La Main Noire** | Pèlerins | À sa mort, élimine immédiatement un autre joueur de son choix. | 1 |
| Petite Fille | **L'Augure** | Pèlerins | Peut espionner les Spectres pendant la nuit, mais risque d'être repéré et tué. | 1 |
| Maire / Capitaine | **L'Alpha** | Pèlerins | Élu par le village. Son vote compte double. À sa mort, il désigne son successeur. | 1 |
| Salvateur | **Le Protecteur** | Pèlerins | Chaque nuit, protège un joueur de l'attaque des Spectres (interdit deux nuits de suite sur la même personne). | 1 |
| Renard | **L'Instinct** | Pèlerins | Chaque nuit, désigne 3 joueurs. Si l'un d'eux est Spectre, il garde son pouvoir ; sinon il le perd définitivement. | 1 |
| Servante Dévouée | **L'Usurpateur** | Pèlerins | Avant qu'un rôle dévoilé ne meure, peut prendre sa place et son rôle. | 1 |
| Juge Bègue | **Le Bourreau** | Pèlerins | Peut déclencher un second vote dans la même journée grâce à un signe convenu avec le maître du jeu. | 1 |
| Trois Frères | **La Trinité** | Solitaire → Pèlerins | Les 3 membres de la Trinité se reconnaissent la première nuit. Tant que les 3 sont en vie, ils forment un camp Solitaire et peuvent gagner UNIQUEMENT entre eux (condition : être les seuls survivants à la fin, tous les autres camps éliminés). Dès qu'UN seul membre meurt, le camp Solitaire se dissout : les survivants ne peuvent plus gagner en tant que Trinité, mais basculent dans le camp Pèlerins et peuvent gagner avec eux. | 3 |
| Deux Sœurs | **Les Doubles** | Solitaire → Pèlerins | Les 2 membres des Doubles se reconnaissent la première nuit. Tant que les 2 sont en vie, elles forment un camp Solitaire et peuvent gagner UNIQUEMENT entre elles (condition : être les seules survivantes à la fin, tous les autres camps éliminés). Dès qu'UN seul membre meurt, le camp Solitaire se dissout : la survivante ne peut plus gagner en tant que Double, mais bascule dans le camp Pèlerins et peut gagner avec eux. | 2 |
| Corbeau | **L'Inquisiteur** | Pèlerins | Chaque nuit, désigne secrètement un joueur. Le lendemain, ce joueur démarre le vote du village avec un vote déjà inscrit contre lui (jeton/bille visible). L'Inquisiteur reste anonyme — seule la marque est visible. Le joueur marqué peut se défendre normalement. | 1 |
| Chaman | **Le Médium** | Pèlerins | Chaque nuit, en silence total, le Médium pointe d'abord un mort, puis un vivant. Le mort répond UNIQUEMENT par mime (pouce levé/baissé/balancement, ou mime libre) pour donner son intuition sur l'identité du vivant désigné. Aucune voix, aucun mot. | 1 |
| — | **L'Enchanteur** | Pèlerins | Chaque nuit, le maître du jeu lui demande s'il veut activer son pouvoir. S'il accepte, les Spectres ne se réveillent pas et ne tuent personne cette nuit-là. Tous les autres pouvoirs nocturnes continuent normalement. Pouvoir utilisable UNE SEULE fois dans la partie. | 1 |
| — | **La Courtisane** | Pèlerins | Appelée parmi les premiers chaque nuit, désigne un joueur qu'elle « occupe » : ce joueur ne se réveille pas et n'utilise pas son pouvoir cette nuit-là. Si elle occupe un Spectre, celui-ci ne participe pas à l'attaque (peut bloquer toute l'attaque s'il est seul). Interdit de désigner deux nuits de suite la même personne. Elle-même reste vulnérable, sans aucune protection. | 1 |
| — | **Le Sacrifié** | Pèlerins | À la fin du vote du village, une fois la cible désignée, peut se manifester pour interrompre l'exécution et mourir À LA PLACE du condamné. Choix totalement libre (peut sacrifier sa vie pour n'importe qui). Au moment du sacrifice, il annonce et révèle publiquement son rôle. Pouvoir utilisable une seule fois (puisqu'il meurt). | 1 |
| Loup-Garou | **Le Spectre** | Spectres | Se réveille chaque nuit avec les autres Spectres pour dévorer un Pèlerin. | 4 |
| Infect Père des Loups | **L'Originel** | Spectres | Une fois par partie, peut transformer un Pèlerin (la victime des Spectres cette nuit-là) en nouveau Spectre au lieu de le tuer. | 1 |
| Loup-Garou Blanc | **Le Maudit** | Solitaire | Toutes les deux nuits, peut éliminer un autre Spectre. Doit être le SEUL Spectre survivant à la fin pour gagner. | 1 |
| Enfant Sauvage | **L'Anathème** | Variable | Choisit un modèle au début de la partie. Si le modèle meurt, il bascule dans le camp des Spectres. Sinon, il joue avec les Pèlerins. | 1 |
| — | **L'Adepte** | Variable | Désigne secrètement un mentor parmi les autres joueurs (le mentor ne sait pas qu'il a été choisi). À la mort de son mentor, l'Adepte hérite de son rôle avec TOUS LES POUVOIRS RÉINITIALISÉS À PLEIN (potions consommées redeviennent disponibles), mais SANS la mémoire ni les informations accumulées. Peut désigner un Spectre comme mentor : à sa mort, l'Adepte bascule alors dans le camp des Spectres. | 1 |
| — | **Le Nécromancien** | Solitaire | Camp à part. Chaque nuit, le maître du jeu lui demande s'il veut activer son pouvoir. UNE SEULE résurrection dans toute la partie : choisit n'importe quel mort qui revient en jeu sous la forme du Revenant. Gagne SEUL, ou AVEC son Revenant si les deux sont vivants à la fin. S'il meurt sans avoir ressuscité, son pouvoir est perdu. | 1 |
| — | **Le Revenant** | Solitaire | Rôle créé en cours de partie par la résurrection du Nécromancien (n'est pas distribué au début). Le Revenant revient en jeu PUBLIQUEMENT, perd son ancien rôle et ses pouvoirs, mais conserve toute sa mémoire du jeu. Le maître du jeu lui révèle qui est le Nécromancien. Son seul but : faire gagner le Nécromancien, par tous les moyens (orienter les votes, désigner des suspects ou rester discret). | 1 |
| — | **Le Sectaire** | Solitaire | Camp à part. Chaque nuit, enrôle automatiquement un joueur dans sa secte (refus impossible). Le maître du jeu révèle à l'enrôlé QUI est le Sectaire (mais pas les autres membres). Les enrôlés continuent à utiliser leur rôle normalement, MAIS ne peuvent jamais viser le Sectaire avec leur pouvoir et DOIVENT voter comme lui au vote du village. Existence d'une secte connue de tous (dans les règles), mais aucune annonce d'enrôlement. Les enrôlés sont tenus au silence ; les non-enrôlés peuvent enquêter ouvertement. Si le Sectaire est tué, tous les enrôlés sont libérés. Gagne SEUL quand tous les vivants sont enrôlés. | 1 |
| Joueur de Flûte | **L'Envoûteur** | Solitaire | Camp à part. Chaque nuit, charme 2 joueurs. Gagne SEUL si tous les joueurs vivants sont charmés. | 1 |

## Branches

- `main` : le nouveau départ, repris de zéro le 20/11/2026.
- `ancien-code` : l'ancienne version, gardée seulement comme référence.
