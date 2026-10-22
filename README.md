# La Malédiction

Dans ce jeu de bluff et de rôles cachés, les pèlerins doivent démasquer et éliminer les spectres infiltrés parmi eux avant d'être tous maudits. De 8 à 25 joueurs.

Ce dépôt contient l'**assistant du maître du jeu** : une appli qui guide le MJ pendant la partie.

- **Distribution des rôles** : composition recommandée selon le nombre de joueurs, modifiable, puis tirage au sort.
- **Déroulé nuit/jour guidé** : l'appli appelle chaque rôle dans l'ordre et propose les cibles autorisées.
- **Votes et éliminations**, avec les pouvoirs déclenchés à la mort (chasseur, amoureux…).
- **Historique** complet de la partie, exportable en `.txt`.
- **Sauvegarde automatique** : on peut fermer l'appli et reprendre la partie.

## Utilisation

Il faut [Node.js](https://nodejs.org) 20 ou plus récent.

```bash
npm install
npm run cli      # partie dans le terminal (tests)
npm run dev      # interface tablette/PC sur http://localhost:5173
npm test         # tests du moteur
npm run build    # version installable dans dist/
```

`npm run dev` affiche aussi une adresse réseau (`http://192.168.x.x:5173`) pour ouvrir l'appli sur une tablette connectée au même Wi-Fi.

Dans le terminal, à chaque étape : `h` affiche l'historique, `j` les joueurs, `q` sauvegarde et quitte. La partie est enregistrée dans `partie.json`.

## Installer sur tablette

L'interface est une PWA : une fois installée, elle se lance comme une vraie appli, en plein écran et hors ligne, sans PC.

1. Sur GitHub : **Settings → Pages → Source : GitHub Actions** (à faire une seule fois).
2. Chaque push sur `main` publie l'appli sur `https://json-sbenjs.github.io/La-malediction/`.
3. Sur la tablette, ouvre cette adresse puis **« Ajouter à l'écran d'accueil »** (Safari : bouton Partager ; Chrome : menu ⋮).

## Ajouter un rôle maison

Tous les rôles sont dans [`src/engine/roles.ts`](src/engine/roles.ts). Pour en ajouter un, il suffit d'ajouter une entrée : le moteur, le terminal et la tablette s'adaptent tout seuls.

```ts
{
  id: "exorciste",
  name: "Exorciste",
  camp: "pelerins",
  description: "Une fois par partie, bannit un joueur la nuit.",
  power: 4,           // équilibrage : + aide les pèlerins, − aide les spectres
  priority: 7,        // ordre d'ajout dans les recommandations
  minPlayers: 12,     // proposé seulement à partir de 12 joueurs
  wake: {
    order: 40,        // ordre de réveil (cupidon 10, protecteur 20, voyante 30, spectres 50, sorcière 60)
    frequency: "every-night",   // "first-night", "even-nights", "odd-nights"
    abilities: [
      { id: "bannir", label: "Bannir", effect: "kill", targets: 1, targetRule: "not-self", uses: 1, optional: true },
    ],
  },
}
```

Les effets disponibles :

| Effet | Ce qu'il fait |
|---|---|
| `kill` | tue la cible à la fin de la nuit (`unstoppable: true` ignore protections et soins) |
| `protect` | la cible ne peut pas mourir cette nuit (`noRepeatTarget: true` interdit la même cible deux nuits de suite) |
| `heal` | sauve une victime de la nuit (à combiner avec `targetRule: "night-victims"`) |
| `inspect` | montre au MJ le rôle de la cible |
| `link` | lie deux joueurs : si l'un meurt, l'autre aussi |
| `mark` | effet géré à la main par le MJ, simplement noté dans l'historique |

Un pouvoir déclenché à la mort se déclare avec `onDeath` (voir le Chasseur). Les camps et leurs conditions de victoire sont dans le même fichier.

Les rôles fournis (Voyante, Sorcière, Chasseur, Protecteur, Cupidon, Ermite maudit) sont des exemples de départ, à remplacer par les rôles de la maison.

## Organisation du code

```
src/engine/   moteur du jeu en TypeScript pur (rôles, nuits, votes, victoire, recommandations)
src/cli/      interface terminal
src/web/      interface tablette/PC (PWA)
```

Le moteur est le même pour les deux interfaces : une partie testée dans le terminal se déroule exactement pareil sur la tablette.
