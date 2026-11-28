# Déroulé d'une partie

Ce document reprend le diagramme de flux du FigJam **malediction**
(https://www.figma.com/board/xRPHkwHb3IT2knM3Vhf3ff, section « diagrame de flux »).
Le FigJam, ce document et le code (`src/engine/`) doivent dire la même chose.

Déroulé : **mise en place → nuit d'explication → élection de l'Alpha (jour 0) → nuit 1 → jour 1 → nuit 2 → …**
La victoire est vérifiée après chaque action du MJ qui peut tuer quelqu'un (fin de nuit, vote, effets de mort).
À toute étape, le MJ peut **annuler sa dernière action** (bouton « Annuler », `historique.ts`) : la partie revient exactement à l'état d'avant, jusqu'à 100 actions en arrière.

## 1. Mise en place — `mise-en-place.ts`, `generateur.ts`, `ajustement.ts`

1. Le MJ choisit la salle et le nombre de joueurs, ce qui charge un **plan de salle** (un rôle par siège).
   Il peut aussi utiliser la **salle sur mesure** : composition conseillée, forme de la salle (tour de table, table rectangulaire, U) et tirage des rôles.
   **Modifier la salle** (le groupe annoncé à 15 arrive à 13 ou à 16) : bouton « ✏️ Modifier la salle » sur l'écran de choix.
   L'écran ressemble à « Salle sur mesure » (mêmes compteurs et même aperçu, `src/web/composants-salle.ts`), mais part du plan prévu :
   - **Nombre de joueurs ce soir** (− / +, de 8 à 25) ;
   - **Rôles `total / joueurs`** : « − » retire le siège de ce rôle qui a le plus grand numéro (les sièges suivants sont renumérotés, les prénoms suivent),
     « + » ajoute un siège de ce rôle à une place libre. La Trinité et les Doubles s'ajoutent et se retirent en entier ;
   - **Plan** : toucher deux sièges échange leurs rôles, l'appui long déplace un siège, « Mélanger les rôles » retire les rôles sans bouger les sièges.
   L'appli ne choisit jamais à la place du MJ quel rôle enlever ou ajouter ; elle affiche les Spectres conseillés pour ce nombre de joueurs.
   « Valider pour ce soir » n'est possible qu'avec autant de rôles que de joueurs et un plan valide (`validerPlan`).
   Le plan modifié sert pour la partie de ce soir ; « Enregistrer comme salle » le garde comme salle sur mesure (même nom, nouveau nombre de joueurs).
   « Revenir au plan prévu » annule tout (prénoms compris).
2. Prénoms des joueurs : facultatifs.
3. Si le **Dévoué** est en jeu, le MJ montre sa carte à tout le monde.
4. Si l'**Alpha** est une carte posée sur un siège, son porteur est Alpha d'office.

## 2. Nuit d'explication — `premiere-nuit.ts`

Le MJ passe **un rôle à la fois**, et **seulement les rôles en jeu**, dans l'ordre où ils agiront. Personne ne meurt.

| Ordre | Rôles | Ce qui se passe |
| --- | --- | --- |
| 1 | la meute : Spectre, Originel, Maudit (le premier présent) | toute la meute se réveille et se reconnaît (le Maudit fait semblant d'en être) |
| 2 | Doubles, Trinité | les membres se réveillent et se reconnaissent |
| 3 | Anathème, Adepte | choisissent en secret leur modèle ou leur mentor (choix obligatoire) |
| 4 | rôles de la nuit, dans l'ordre de la Nuit Type (§ 3) | le MJ explique le rôle |
| 5 | Pèlerin, Dévoué, Alpha, Main Noire, Usurpateur, Sacrifié, Bourreau | rôles sans réveil (le jour, les morts) : le MJ les explique |

- Pour un groupe d'habitués, le bouton **« passer toute l'explication »** saute la nuit d'explication : pas de reconnaissance, pas de modèle ni de mentor.
- À la fin : **élection de l'Alpha** (jour 0), qu'on peut repousser au jour 1 (« élire plus tard »). Si l'Alpha est une carte, on va directement à la nuit 1.

## 3. Nuit Type — `nuit.ts`

Seuls les rôles en jeu sont appelés. Pour chaque rôle, dans cet ordre : **si en vie → si occupé → condition propre → action**.
Un rôle sans joueur qui peut agir (mort, occupé, pouvoir perdu ou déjà utilisé) est sauté.

| Rang | Rôle | Condition propre | Action |
| --- | --- | --- | --- |
| 10 | Courtisane | — | occupe un joueur (pas le même deux nuits de suite) |
| 20 | Protecteur | — | protège un joueur (pas le même deux nuits de suite) |
| 30 | Oracle | — | voit le rôle d'un joueur |
| 33 | Médium | au moins un mort | pointe un mort puis un vivant ; le mort mime |
| 36 | Inquisiteur | — | marque un joueur : une voix contre lui au vote du lendemain |
| 40 | Instinct | pouvoir pas perdu | désigne 3 joueurs : s'il n'y a aucun Spectre, il perd son pouvoir |
| 45 | Enchanteur | sort pas utilisé, veut l'utiliser | endort les Spectres (ni Spectres, ni Originel, ni Maudit cette nuit) |
| 50 | Spectres | pas endormis | désignent une victime |
| 52 | Originel | sort pas utilisé, il y a une victime | transforme la victime en Spectre au lieu de la tuer |
| 55 | Maudit | nuit paire, pas endormi | peut tuer un Spectre |
| 57 | Augure | pas occupée, Spectres pas endormis | elle a espionné pendant le réveil des Spectres ; le MJ dit si elle a été vue : si oui, elle meurt au matin, en plus de la victime, et rien ne la sauve (ni protection ni Sainte) |
| 60 | Sainte | sort pas utilisé, il y a une victime | sauve la victime des Spectres |
| 70 | Vipère | sort pas utilisé | empoisonne un joueur |
| 80 | Sectaire | — | enrôle un joueur non enrôlé ; le MJ lui montre le Sectaire |
| 85 | Envoûteur | — | charme 2 joueurs |
| 90 | Nécromancien | sort pas utilisé, au moins un mort | ressuscite un mort en Revenant ; le MJ lui montre le Nécromancien |

Un enrôlé ne peut jamais viser le Sectaire avec son pouvoir.

## 4. Fin de nuit — `resolution-nuit.ts`

- La victime des Spectres meurt, sauf si elle est protégée ou sauvée par la Sainte.
- Le Spectre visé par le Maudit meurt, sauf s'il est protégé.
- L'empoisonné meurt (la protection ne bloque pas le poison).
- L'Augure vue par les Spectres meurt (ni la protection ni la Sainte ne la sauvent).
- La victime de l'Originel devient Spectre en secret, sauf si elle est protégée.
- Puis : effets de mort (§ 5) et test de victoire.

## 5. Effets de mort — `mort.ts`

À chaque mort, le rôle est révélé, puis :

1. **Automatique** : la Trinité ou les Doubles se dissolvent (les survivants passent Pèlerins) ; si le Sectaire meurt, ses enrôlés sont libérés ; l'**Anathème** dont le modèle meurt passe Spectre ; l'**Adepte** dont le mentor meurt prend son rôle et son camp, avec les pouvoirs remis à neuf.
2. **Usurpateur en premier** (s'il est en vie et n'a pas encore servi) : il peut prendre le rôle du mort. S'il le prend, l'effet de mort de ce rôle ne se déclenche pas.
3. **Main Noire** (si l'Usurpateur n'a pas pris son rôle) : elle emporte un joueur.
4. **Alpha** : s'il meurt, il désigne son successeur (ou le village réélit).

## 6. Jour — `vote.ts`

1. Annonce des morts (rôles révélés) et de la marque de l'Inquisiteur.
2. S'il n'y a pas d'Alpha en vie : élection de l'Alpha.
3. **Les morts** :
   - **jours pairs** (2, 4, 6…) : ils **votent**, 1 voix chacun, uniquement contre un vivant (second vote du Bourreau compris) ;
   - **jours impairs** (1, 3, 5…) : ils **parlent** pendant la discussion, mais ne votent pas.
4. Discussion, puis **vote du village** : l'Alpha compte double, le joueur marqué part avec une voix, une égalité en tête n'élimine personne.
   Deux façons de saisir le vote (boutons en haut du panneau) :
   - **à main levée** (par défaut, `compterMainsLevees`) : le MJ touche un joueur et lui met directement le nombre de mains levées (boutons 0 à 10, ou − / +), puis passe au suivant.
     L'Alpha lève la main comme les autres : le MJ indique contre qui (« 👑 L'Alpha a levé la main contre… »), ce qui ajoute 1 voix (sa voix compte double).
     Il ne peut pas y avoir plus de mains que de votants (les morts comptent les jours pairs) ;
   - **voix par voix** (`compterVotes`) : le MJ touche un votant, puis le joueur qu'il vise.
   Le MJ peut aussi faire un **vote rapide** (il désigne directement l'éliminé).
5. **Sacrifié** : il peut mourir à la place du condamné (une fois).
6. Effets de mort du condamné (§ 5), puis test de victoire.
7. **Bourreau** : une fois dans la partie, il peut déclencher un second vote le même jour.
8. Sinon, on passe à la nuit suivante.

## 7. Victoire — `victoire.ts`

- **Sectaire** : en vie, et tous les autres vivants sont enrôlés.
- **Envoûteur** : en vie, et tous les autres vivants sont charmés.
- Sinon, un camp gagne quand tous les vivants en font partie : Pèlerins, Spectres, Trinité ou Doubles encore soudées, Maudit (seul survivant), Nécromancien (seul ou avec son Revenant ; le Revenant seul ne gagne pas).
- Tout le monde mort : personne ne gagne.

## Écarts encore ouverts

- **FigJam à mettre à jour** (bloqué par la limite d'appels Figma du forfait Starter) : nuit d'explication rôle par rôle, ordre de la Nuit Type ci-dessus, Nécromancien confirmé (à placer après l'Envoûteur), bloc « si l'Oracle en vie » de l'Originel à renommer, Sainte qui « sauve la victime », bloc de l'Adepte (« mentor » et non « modèle »), Usurpateur avant les autres effets, successeur de l'Alpha, Sacrifié, Bourreau, vote rapide, dissolution Trinité / Doubles, Sectaire, test de victoire après la nuit, sections « architecture du code » et « planning » à jour.
- **FigJam, aussi** : l'écran « Modifier la salle » avant le lancement (§ 1) et le vote à main levée (§ 6).
- **FigJam, aussi** : la question « l'Augure a-t-elle été vue ? » (rang 57) et les morts (ils votent les jours pairs, parlent les jours impairs).
