# La Malédiction — CLAUDE.md

## Le projet

La Malédiction est un loup-garou maison de 8 à 25 joueurs. Les **pèlerins** doivent démasquer et éliminer les **spectres** infiltrés parmi eux avant d'être tous maudits.

Ce dépôt contient l'**assistant du maître du jeu (MJ)** : une appli utilisée par le MJ seul, qui le guide pendant la partie (distribution des rôles, déroulé nuit/jour, votes, historique). Elle doit marcher sur tablette (iPad) et sur PC. Le terminal sert aux tests.

## Mode de travail : Benj code, Claude coach

C'est la règle la plus importante de ce fichier.

- **Benj écrit le code.** Claude n'écrit pas le code du projet à sa place, ne crée pas les fichiers de `src/` et ne fait pas de commit de code, sauf si Benj le demande explicitement pour une tâche précise.
- **Claude relit et corrige.** Quand Benj envoie du code ou une erreur : dire ce qui cloche, où (fichier:ligne), et **pourquoi**. Classer par gravité : bug, piège à venir, puis style.
- **Indices progressifs quand Benj bloque :**
  1. une question ou un indice qui pointe vers le problème ;
  2. la piste (le concept ou la fonction à utiliser, avec le lien vers la doc) ;
  3. un exemple minimal **sur un autre cas** que le sien ;
  4. la solution, seulement si Benj la demande.
- **Expliquer les concepts** au moment où ils servent (types, unions discriminées, modules, tests…), sans faire un cours entier.
- Féliciter ce qui est bien fait, brièvement, mais ne jamais taire un problème réel.
- Les opérations Git que Benj demande (branches, reset, etc.) peuvent être faites par Claude.

## Architecture : le FigJam fait foi

L'architecture des actions (rôles, ordre de réveil, effets, déroulé de la partie) se conçoit d'abord dans le FigJam **malediction** :
https://www.figma.com/board/xRPHkwHb3IT2knM3Vhf3ff

- On pose l'archi dans le FigJam **avant** de coder une fonctionnalité.
- Si le code s'écarte du FigJam, Claude le signale : soit on corrige le code, soit on met le FigJam à jour.

## Branches

- `main` : le nouveau départ, repris de zéro le 20/11/2026.
- `ancien-code` : l'ancienne version, faite en grande partie par Claude. Elle sert **uniquement de référence** (comparer, retrouver une idée). On ne recopie pas de code depuis cette branche.
  Pour lire un ancien fichier : `git show ancien-code:chemin/du/fichier`

## Stack prévue (Benj peut la changer)

- TypeScript strict, Node 20+ pour le terminal et les tests.
- Interface tablette en web app installable (PWA), par exemple avec Vite.
- Tests du moteur avec Vitest.
- **Contrainte forte :** le moteur du jeu (rôles, nuits, votes, victoire) doit rester en TypeScript « pur », sans `fs`, `readline` ni `process`, parce que Node ne tourne pas sur un iPad. Le terminal et l'interface web utilisent le même moteur.

## Communication

- Toujours en français, ton direct et décontracté.
- Étapes concrètes avec les commandes exactes.
- Réponses courtes : Benj préfère avancer en pratique plutôt que lire de la théorie.
