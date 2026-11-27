# Sons

Les sons de l'assistant du MJ : musique de fond, ambiances nuit / jour, un son par rôle, un son par événement
et un retour sonore sur chaque bouton. Ils ne changent aucune règle du jeu, seulement ce qu'on entend.

## Principes

- **Tout est synthétisé par le code** (`scripts/sons/`), sans échantillon extérieur : aucune licence à gérer, aucun crédit
  à donner (voir `CREDITS.md`). On peut tout régénérer à l'identique.
- **La musique de fond est remplaçable par le MJ** : écran d'accueil → *Sons* → *Choisir ma musique*. Le fichier
  (par exemple « Intro » de John Carpenter, Cody Carpenter et Daniel Davies, acheté par le MJ) reste **sur la tablette**
  (IndexedDB). Il n'est jamais mis dans le dépôt ni sur le site publié : c'est une œuvre protégée par le droit d'auteur.
  Sans fichier choisi, l'appli joue sa musique d'origine, composée pour le projet dans le même esprit (synthés analogiques
  années 80, basse pulsée, arpège, nappe, cloches), sans reprendre la mélodie de personne.
- **Feedback** : un son qui monte = positif (valider, choisir), un son qui descend = négatif (erreur, retirer).
- **Le son démarre au premier toucher** : les navigateurs (Safari sur iPad) interdisent le son avant un geste.
- **Hors ligne** : le service worker (`public/sw.js`) garde tous les sons en cache.
- **Réglages** (écran d'accueil, carte *Sons*) : volume de la musique, de l'ambiance et des effets ; bouton 🔊 / 🔇 dans la
  barre pendant la partie. Ils sont gardés dans le navigateur.
- Sur iPad, le son passe même avec l'interrupteur « silencieux » (Safari 17 et plus).

## Feuille de sons (« cue sheet »)

Le catalogue qui fait foi est `src/web/sons-catalogue.ts`. Tous les fichiers sont des MP3 dans `public/sons/`,
créés par `npm run sons`. Source : création originale du projet.

### Musique, ambiances, interface, événements

| Moment | Type | Ce qu'on entend | Fichier |
|---|---|---|---|
| Toute la session (dès le premier toucher) | musique (boucle de 57,6 s) | Musique de fond originale, synthés analogiques années 80 : basse pulsée, arpège, nappe, cloches. Remplaçable par le fichier du MJ. | `sons/musique/musique_fond.mp3` |
| Nuit d'explication et nuits | ambiance (boucle de 40 s) | Nuit : drone métallique en secondes mineures, vent, grillons lointains. | `sons/ambiance/amb_nuit.mp3` |
| Jours (élection, vote) | ambiance (boucle de 40 s) | Jour : vent léger, oiseaux au loin. | `sons/ambiance/amb_jour.mp3` |
| Tout bouton sans son propre | interface | Clic de bois sec, très court : tout bouton sans son propre. | `sons/ui/ui_clic.mp3` |
| Choisir un siège, une salle, un nombre, un votant | interface | Pincement qui monte : un siège, une salle, un nombre est choisi. | `sons/ui/ui_selection.mp3` |
| Retirer un choix, annuler une voix | interface | Pincement qui descend : choix retiré. | `sons/ui/ui_deselection.mp3` |
| Action validée sans son propre | interface | Deux notes qui montent : action validée sans son propre. | `sons/ui/ui_valider.mp3` |
| Action refusée, trop de sièges choisis | interface | Deux notes graves qui descendent : action refusée. | `sons/ui/ui_erreur.mp3` |
| « ↶ Annuler » | interface | Souffle à l'envers (rembobinage) : « Annuler ». | `sons/ui/ui_annuler.mp3` |
| Salle enregistrée ou ajoutée, lien copié, musique choisie | interface | Petit arpège de cloches : salle ajoutée, enregistrée, lien copié. | `sons/ui/ui_succes.mp3` |
| « Tirer les rôles » (salle sur mesure) | interface | Cartes battues : tirage des rôles de la salle sur mesure. | `sons/ui/ui_tirage.mp3` |
| Siège déplacé (salle sur mesure) | interface | Frottement doux : un siège est déplacé. | `sons/ui/ui_glisser.mp3` |
| Une voix posée pendant le vote | interface | Coup de plume et petit tambour : une voix est posée au vote. | `sons/ui/ui_voix.mp3` |
| « Commencer la partie » | transition | Gong grave et souffle qui monte : la partie commence. | `sons/transitions/tr_debut_partie.mp3` |
| Passage du jour à la nuit | transition | Nappe qui descend, cloche grave, hibou : la nuit tombe. | `sons/transitions/tr_nuit_tombe.mp3` |
| Passage à un jour (fin de nuit, jour 0) | transition | Nappe qui monte et carillon clair : le village se réveille. | `sons/transitions/tr_jour_se_leve.mp3` |
| Fin de nuit avec des morts | effet | Glas : trois coups de cloche grave, il y a des morts cette nuit. | `sons/sfx/sfx_glas.mp3` |
| Fin de nuit sans mort | effet | Accord doux et apaisé : personne n'est mort cette nuit. | `sons/sfx/sfx_nuit_calme.mp3` |
| Mort pendant le jour (vote, Main Noire…) | effet | Un coup de glas et un souffle : un joueur meurt pendant le jour. | `sons/sfx/sfx_mort.mp3` |
| Vote qui condamne | effet | Trois coups de tambour : le vote condamne quelqu'un. | `sons/sfx/sfx_verdict.mp3` |
| Vote sans éliminé | effet | Coup sourd qui retombe : personne n'est éliminé. | `sons/sfx/sfx_aucun_elimine.mp3` |
| Alpha élu ou successeur désigné | effet | Courte fanfare de cuivres : l'Alpha est élu. | `sons/sfx/sfx_couronne.mp3` |
| L'Oracle désigne un joueur | effet | Scintillement de cristal : le rôle est montré à l'Oracle. | `sons/sfx/sfx_revelation.mp3` |
| Info secrète d'un pouvoir de nuit (Instinct) | effet | Murmure soufflé : une info secrète pour le MJ. | `sons/sfx/sfx_murmure.mp3` |
| Victoire des Pèlerins | fin de partie | Cloches et cuivres en majeur : victoire des Pèlerins. | `sons/fin/fin_pelerins.mp3` |
| Victoire des Spectres | fin de partie | Accord grave distordu et grand rire de clown : victoire des Spectres. | `sons/fin/fin_spectres.mp3` |
| Victoire d'un solitaire, de la Trinité ou des Doubles | fin de partie | Boîte à musique désaccordée : victoire d'un solitaire ou d'un groupe. | `sons/fin/fin_solitaire.mp3` |
| Personne ne gagne | fin de partie | Vent et un seul coup de glas : personne ne gagne. | `sons/fin/fin_personne.mp3` |

### Réveil des rôles

Joué quand le rôle est présenté (nuit d'explication), quand il se réveille la nuit, et pour les décisions liées à une mort
(Usurpateur, Main Noire, successeur de l'Alpha, Sacrifié, Bourreau). L'élection de l'Alpha joue le son de l'Alpha.

| Rôle | Ce qu'on entend | Fichier |
|---|---|---|
| spectre | Ricanement de clown qui fait peur, doublé d'une voix grave, boîte à musique fausse. | `sons/roles/role_spectre.mp3` |
| originel | Rire de clown grave et lent, grondement : le premier des Spectres. | `sons/roles/role_originel.mp3` |
| maudit | Grognement distordu puis hurlement de bête. | `sons/roles/role_maudit.mp3` |
| pelerin | Bâton de marche sur la pierre et clochette. | `sons/roles/role_pelerin.mp3` |
| devoue | Harpe qui monte, douce et sincère. | `sons/roles/role_devoue.mp3` |
| oracle | Verre de cristal qui chante. | `sons/roles/role_oracle.mp3` |
| protecteur | Bouclier frappé, métal qui résonne. | `sons/roles/role_protecteur.mp3` |
| courtisane | Glissando de harpe et clochette. | `sons/roles/role_courtisane.mp3` |
| instinct | Battements de cœur. | `sons/roles/role_instinct.mp3` |
| sainte | Chœur céleste en majeur. | `sons/roles/role_sainte.mp3` |
| vipere | Sifflement de serpent et crécelle. | `sons/roles/role_vipere.mp3` |
| main-noire | Accord grave et sec, souffle sombre. | `sons/roles/role_main-noire.mp3` |
| anatheme | Cloche jouée à l'envers. | `sons/roles/role_anatheme.mp3` |
| adepte | Bol chantant tibétain. | `sons/roles/role_adepte.mp3` |
| usurpateur | Lame tirée du fourreau. | `sons/roles/role_usurpateur.mp3` |
| alpha | Appel de cor. | `sons/roles/role_alpha.mp3` |
| trinite | Trois cloches qui forment un accord. | `sons/roles/role_trinite.mp3` |
| doubles | Deux pincements identiques qui se répondent. | `sons/roles/role_doubles.mp3` |
| augure | Croassements de corbeau. | `sons/roles/role_augure.mp3` |
| inquisiteur | Plume qui gratte et cachet de cire. | `sons/roles/role_inquisiteur.mp3` |
| medium | Thérémine de séance, voix d'outre-tombe. | `sons/roles/role_medium.mp3` |
| enchanteur | Pluie d'étincelles magiques et berceuse. | `sons/roles/role_enchanteur.mp3` |
| sacrifie | Cloche grave et chœur qui retombe. | `sons/roles/role_sacrifie.mp3` |
| bourreau | Coup de hache sur le billot. | `sons/roles/role_bourreau.mp3` |
| sectaire | Psalmodie de moines. | `sons/roles/role_sectaire.mp3` |
| envouteur | Flûte de charmeur. | `sons/roles/role_envouteur.mp3` |
| necromancien | Grondement de crypte et os qui s'entrechoquent. | `sons/roles/role_necromancien.mp3` |
| revenant | Râle de mort-vivant. | `sons/roles/role_revenant.mp3` |

### Ordre des sons après une action du MJ

`src/web/sons-evenements.ts` (testé par `tests/web/sons-evenements.test.ts`) enchaîne, dans l'ordre :

1. ce que l'action produit : verdict ou « aucun éliminé », couronne, révélation de l'Oracle, murmure d'une info secrète ;
2. les morts et la phase : fin de nuit → *le village se réveille*, puis glas (ou accord calme) ; mort pendant le jour → glas
   court ; passage à la nuit → *la nuit tombe* ;
3. le réveil du rôle suivant, ou le son de fin de partie.

Exemple, vote qui condamne : verdict → mort → la nuit tombe → réveil de la Courtisane.
Après l'Oracle, le rôle suivant ne sonne qu'en fermant la révélation (« Continuer »).
Un nouveau lot coupe le précédent en douceur : si le MJ passe vite les étapes, les réveils ne s'empilent pas.

## Le code

| Fichier | Rôle |
|---|---|
| `src/web/sons-catalogue.ts` | liste des sons : identifiant, fichier, canal (musique / ambiance / effet), durée de boucle, description |
| `src/web/sons-evenements.ts` | quel son pour quel changement de la partie (sans DOM, testé) |
| `src/web/sons.ts` | lecteur Web Audio : volumes, boucles sans couture, lots d'effets, musique du MJ |
| `src/web/musique-perso.ts` | garde la musique choisie par le MJ dans le navigateur |
| `scripts/sons/dsp.ts` | boîte à outils de synthèse : oscillateurs, filtres, réverb, chorus, boucles |
| `scripts/sons/recettes.ts` | une recette par son |
| `scripts/sons/generer.ts` | génère les MP3 (volume perçu homogène, fin coupée, marges des boucles) |

Les boucles (musique, ambiances) ont **1 s de marge** de chaque côté dans le fichier (la fin collée avant, le début collé
après) : le décalage que l'encodage MP3 ajoute en tête tombe dans du vrai son, et l'appli boucle de 1 s à 1 s + durée, sans
trou.

## Changer ou ajouter un son

Il faut Node 20+ et **ffmpeg** (`sudo apt install ffmpeg`, ou `brew install ffmpeg`).

1. Ajouter (ou modifier) l'entrée dans `src/web/sons-catalogue.ts`, et sa recette dans `scripts/sons/recettes.ts`.
2. Générer seulement ce son :

   ```bash
   npm run sons -- role_spectre
   ```

   ou tous les sons :

   ```bash
   npm run sons
   ```

3. Nouveau fichier : l'ajouter à la liste `SONS` de `public/sw.js` (un test le vérifie).
4. Le déclencher depuis `sons-evenements.ts` (événement de la partie) ou `main.ts` (bouton), et ajouter un test.
5. Mettre à jour la feuille de sons ci-dessus, puis lancer `npm test` et `npm run build`.

**Remplacer un son par un enregistrement** (Audacity, banque de sons) : l'exporter en MP3 au même nom et au même endroit,
noter la source et la licence dans `CREDITS.md` (pas de licence « NC » si le projet peut être vendu), et retirer sa recette
pour qu'un `npm run sons` ne l'écrase pas.
