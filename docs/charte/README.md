# La Malédiction des Spectres

Charte graphique de l'assistant du maître du jeu de **La Malédiction des Spectres**, un loup-garou maison de 8 à 25 joueurs. L'appli tourne sur iPad, dans une salle souvent sombre, entre les mains d'un MJ qui lit à voix haute et touche l'écran sans le regarder longtemps. Tout part des cartes du jeu : peintures médiévales sombres, or vieilli, rouge sang, fond noir-vert du verso.

## L'esprit

- **Fidèle aux cartes.** L'appli doit ressembler au jeu posé sur la table, pas à une appli générique. Les couleurs, le blason et les illustrations viennent tous des cartes.
- **Lisible à la bougie.** Fond sombre, texte parchemin très contrasté, grandes tailles. Une consigne se lit d'un coup d'œil, à un mètre.
- **Le MJ, pas le décor.** Les effets restent discrets : la seule animation de la charte est la bascule nuit / jour. L'ambiance vient des images et de la typo, pas d'effets.

## Le nom

- Nom complet : **La Malédiction des Spectres** (accueil, titre de l'onglet, manifeste).
- Nom court : **Malédiction** (sous l'icône de l'iPad).
- Dans l'appli, on écrit **Pèlerin**. La carte imprimée garde son orthographe « PELLERIN ».

## Le logo : le blason

Le blason du verso des cartes (groupe d'assets **Logos**) : un écu partagé, chevaliers à gauche et spectres à droite, une épée au milieu.

- Toujours sur `fond` ou `surface`, jamais sur une image ou sur du clair.
- Hauteur minimale 48px. En dessous, il devient une tache : n'utiliser alors que le nom en onciale.
- Garder autour une marge égale à un quart de sa largeur.
- Ne pas le recolorer, le déformer, l'entourer ni lui ajouter d'ombre.
- **Icône iPad** (`icone-ipad.png`) : le blason centré, à 80 % de la hauteur, sur `fond` nuit.
- Le titre circulaire du verso reste propre aux cartes ; dans l'appli, le nom s'écrit en ligne sous le blason, en onciale `or`.

## Les couleurs

Deux thèmes, la **Nuit** (par défaut) et le **Jour**. La palette est la même ; seuls les fonds changent : noir-vert bleuté la nuit, brun chaud le jour.

| Rôle | Jeton | Emploi |
|---|---|---|
| Fond | `fond`, `surface`, `surface-haute` | page, panneaux, sièges et boutons secondaires |
| Texte | `encre`, `encre-douce` | parchemin clair ; secondaire pour les légendes |
| Marque | `or`, `or-vif`, `sur-or` | titres, blason, bouton principal, sélection |
| Camps | `or` (Pèlerins), `sang` (Spectres), `vert-de-gris` (Trinité, Doubles), `encre` (solitaires : Maudit, Sectaire, Envoûteur, Nécromancien) | bordure de 2px des sièges |
| États | `eveil`, `info-*`, `erreur-*` | joueur qui agit, info secrète du MJ, action refusée |

Règles :
- **Un seul bouton `or` par panneau** : l'action principale (Valider, Le village se réveille). Les autres boutons restent en `surface-haute`.
- **Le rouge veut dire Spectre ou mort.** Ne jamais l'utiliser pour décorer ni pour un bouton.
- **Un siège mort** passe en niveaux de gris à 35 % d'opacité, avec 💀. Sa bordure de camp reste visible.
- Les camps se distinguent aussi par la clarté (or clair, vert-de-gris moyen, sang plus sombre), pas seulement par la teinte.

## La typographie

Deux familles, toutes deux sur Google Fonts. Dans l'appli, on les embarque (paquets `@fontsource`) pour qu'elles marchent hors ligne.

- **Uncial Antiqua** (`onciale`) : l'écriture du verso. Titres seulement : nom du jeu, phase, nom du rôle, intertitres. Jamais pour une phrase.
- **EB Garamond** (`texte`) : une police de livre ancien très lisible, pour tout le reste. La consigne lue à voix haute est la plus grande (23px) ; rien en dessous de 14px, sauf la légende des sièges à 16 joueurs et plus (voir « La salle »).
- Les noms imprimés sur les cartes, en gothique blanc cerné de noir, restent propres aux cartes. L'appli ne les imite pas.
- Les chiffres (numéros de sièges, voix) sont alignés en tableau (`tabular-nums`).

## Les illustrations

Les 28 illustrations des cartes (groupe d'assets **Illustrations**), en 512 × 512 WebP.

- **Au réveil d'un rôle** : l'illustration en grand en haut du panneau, coins `arrondi-siege`, ombre `ombre-carte`, puis le nom du rôle en onciale.
- **Sur les sièges** : une vignette ronde, cadrée sur le haut de l'image (le visage). Elle rétrécit avec le nombre de joueurs.
- Ne jamais écrire sur une illustration ni la recadrer en bandeau : on la montre comme une carte.
- Un rôle sans illustration (rôle futur) affiche le blason à la place.

## La salle

Les sièges suivent le plan de la salle (tour de table, table rectangulaire, tables en U) et rétrécissent quand la salle se remplit :
- **jusqu'à 10 joueurs** : numéro, vignette, prénom, rôle et état ;
- **de 11 à 15 joueurs** : le prénom remplace le nom du rôle (la vignette montre le rôle) ;
- **16 joueurs et plus** : vignette et numéro côte à côte, une seule ligne de texte. C'est la seule exception à la taille minimale de 14px : la légende peut descendre jusqu'à 11px pour que les sièges ne se chevauchent pas.

## Nuit et jour

L'appli change de thème avec la phase : la **Nuit** pendant les réveils, le **Jour** dès que le MJ valide « Le village se réveille », jusqu'à la nuit suivante. La bascule est un fondu des couleurs de fond en 600ms. On n'anime rien d'autre, et le fondu est coupé si l'iPad demande moins d'animations.

## Les pictogrammes

Les états d'un siège s'affichent en petits symboles : 👑 Alpha, 🛡️ protégé, 💤 occupé, 🪶 marqué par l'Inquisiteur, ⛓️ enrôlé par le Sectaire, 🎵 charmé par l'Envoûteur, 💀 mort. On les garde pour l'instant, car ils sont lisibles et sans ambiguïté. Une version gravée, dans le style du blason, pourra les remplacer plus tard.

## La voix

- **Consignes au présent**, telles que le MJ les lit : « L'Oracle se réveille et désigne… ».
- **Aides au MJ en tutoiement**, courtes : « Touche un siège sur le plan. »
- **Boutons à l'infinitif ou en courte phrase**, qui disent ce qui se passe : « Valider », « Le village se réveille », « Ne pas utiliser la potion ».
- **Erreurs** : dire quoi faire. « La Courtisane ne peut pas viser le siège 3 », pas « Erreur ».
