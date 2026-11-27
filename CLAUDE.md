# La Malédiction — CLAUDE.md

## Le projet

La Malédiction est un loup-garou maison de 8 à 25 joueurs. Les **pèlerins** doivent démasquer et éliminer les **spectres** infiltrés parmi eux avant d'être tous maudits.

Ce dépôt contient l'**assistant du maître du jeu (MJ)** : une appli utilisée par le MJ seul, qui le guide pendant la partie (distribution des rôles, déroulé nuit/jour, votes, historique). Elle doit marcher sur tablette (iPad) et sur PC. Le terminal sert aux tests.

## Qui travaille sur le projet

Le projet est maintenu dans un cadre d'entreprise. Il doit pouvoir évoluer **sans son auteur d'origine** : un développeur de l'équipe, seul ou avec Claude, doit pouvoir ajouter ou changer une fonctionnalité en lisant uniquement le dépôt et le FigJam.

- **Claude peut écrire le code** (moteur, interface, tests, doc) et faire les commits sur la branche de travail.
- Tout changement doit laisser le projet **compréhensible par quelqu'un qui le découvre** : code lisible, noms explicites en français pour le métier du jeu (rôles, nuits, votes), doc à jour.
- En cas de doute sur une règle du jeu, ne pas l'inventer : regarder le FigJam, puis `docs/`, et sinon poser la question.

## Architecture : le FigJam fait foi, `docs/` le reprend

L'architecture des actions (rôles, ordre de réveil, effets, déroulé de la partie) se conçoit d'abord dans le FigJam **malediction** :
https://www.figma.com/board/xRPHkwHb3IT2knM3Vhf3ff

- On pose l'archi dans le FigJam **avant** de coder une fonctionnalité.
- Elle est aussi écrite dans le dépôt, dans `docs/` (règles des rôles, ordre de réveil, déroulé d'une partie, choix d'architecture), pour qu'on puisse travailler sans accès au FigJam.
- Le FigJam, `docs/` et le code doivent dire la même chose. Si l'un s'écarte des autres, le signaler et remettre les trois d'accord dans le même changement.

## Règles pour changer une fonctionnalité

1. Vérifier ce que disent le FigJam et `docs/` sur la fonctionnalité.
2. Mettre à jour le FigJam et `docs/` si la règle change.
3. Écrire ou adapter les **tests Vitest** du moteur qui décrivent le comportement attendu.
4. Coder le changement.
5. Lancer les tests et le typage avant de commiter.
6. Message de commit clair, en français, qui dit **quoi** et **pourquoi**.

## Branches

- `main` : le nouveau départ, repris de zéro le 20/11/2026.
- `ancien-code` : l'ancienne version. Elle sert **de référence** (comparer, retrouver une idée), pas de base de travail.
  Pour lire un ancien fichier : `git show ancien-code:chemin/du/fichier`

## Sons

- **On part toujours d'une base** : un son existant libre de droits (CC0 de préférence, CC BY avec crédit). Ne pas générer
  de sons de zéro. Bases repérées : `docs/sons-sources.md` ; marche à suivre : `docs/sons.md`.
- Chaque son venu d'ailleurs est noté dans `CREDITS.md` (titre, auteur, URL, licence, modifié oui / non).
- Jamais de musique du commerce dans le dépôt (elle serait publiée sur GitHub Pages).

## Stack

- TypeScript strict, Node 20+ pour le terminal et les tests.
- Interface tablette en web app installable (PWA), avec Vite.
- Tests du moteur avec Vitest.
- **Contrainte forte :** le moteur du jeu (rôles, nuits, votes, victoire) doit rester en TypeScript « pur », sans `fs`, `readline` ni `process`, parce que Node ne tourne pas sur un iPad. Le terminal et l'interface web utilisent le même moteur.

## Communication

- Toujours en français, ton direct.
- Étapes concrètes avec les commandes exactes.
- Réponses courtes et pratiques.
