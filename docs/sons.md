# Sons

Les sons de l'assistant du MJ : musique de fond, ambiances nuit / jour, un son par rôle, un son par événement
et un retour sonore sur chaque bouton. Ils ne changent aucune règle du jeu, seulement ce qu'on entend.

## Principes

- **Règle : on part toujours d'une base.** Chaque son est monté à partir de sons existants libres de droits (CC0 de
  préférence, CC BY avec crédit) : on choisit, on coupe, on superpose, on règle le volume. On ne génère pas de sons de zéro.
  Les dépôts et sites où chercher sont dans `docs/sons-sources.md`.
- **Licences et crédits** : chaque base est déclarée dans `scripts/sons/sources.ts` (adresse, auteur, licence, page où la
  licence a été vérifiée). `npm run sons` en déduit le tableau de `CREDITS.md`. Le pack Oculus (CC BY 4.0) exige un crédit :
  il est dans `CREDITS.md` et dans l'appli (écran d'accueil, carte *Sons*).
- **La musique de fond est remplaçable par le MJ** : écran d'accueil → *Sons* → *Choisir ma musique*. Le fichier
  (par exemple « Intro » de John Carpenter, Cody Carpenter et Daniel Davies, acheté par le MJ) reste **sur la tablette**
  (IndexedDB). Il n'est jamais mis dans le dépôt ni sur le site publié : c'est une œuvre protégée par le droit d'auteur.
  Sans fichier choisi, l'appli joue « Retro Synths » de HoliznaCC0 (CC0), dans l'esprit synthés années 80.
- **Même volume pour tous** : chaque son est réglé à un volume perçu commun (norme EBU R128, mesurée par ffmpeg) :
  environ −19 LUFS pour les effets et réveils, −18 pour la musique, −20 pour les ambiances ; l'interface est plus discrète.
- **Feedback** : un son qui monte = positif (valider, choisir), un son qui descend = négatif (erreur, retirer).
- **Le son démarre au premier toucher** : les navigateurs (Safari sur iPad) interdisent le son avant un geste.
- **Hors ligne** : le service worker (`public/sw.js`) garde tous les sons en cache.
- **Réglages** (écran d'accueil, carte *Sons*) : volume de la musique, de l'ambiance et des effets ; bouton 🔊 / 🔇 dans la
  barre pendant la partie. Ils sont gardés dans le navigateur.
- Sur iPad, le son passe même avec l'interrupteur « silencieux » (Safari 17 et plus).

## Feuille de sons (« cue sheet »)

Le catalogue qui fait foi est `src/web/sons-catalogue.ts`, le montage de chaque son est dans `scripts/sons/montages.ts`.
Tous les fichiers sont des MP3 dans `public/sons/`, montés par `npm run sons`.

### Musique, ambiances, interface, événements

| Moment | Ce qu'on entend | Base(s) | Fichier |
|---|---|---|---|
| Toute la session (dès le premier toucher) | Retro Synths (HoliznaCC0) : synthés rétro années 80, boucle de 96 s calée sur le motif. Remplaçable par le fichier du MJ. | Retro Synths (HoliznaCC0, CC0 1.0) | `sons/musique/musique_fond.mp3` |
| Nuit d'explication et nuits | Nuit : forêt de nuit (insectes, bruissements) et drone inquiétant en dessous. | AMBForst_Night_LOOP_01 (Oculus VR, LLC, CC BY 4.0) + DSGNDron_DroneCreepy_OS_02 (Oculus VR, LLC, CC BY 4.0) | `sons/ambiance/amb_nuit.mp3` |
| Jours (élection, vote) | Jour : vent léger dans les arbres, oiseaux. | WINDVege_LightWindTreesBirds_LOOP_01 (Oculus VR, LLC, CC BY 4.0) | `sons/ambiance/amb_jour.mp3` |
| Tout bouton sans son propre | Clic de bois : tout bouton sans son propre. | UIClick_WoodConfirm_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/ui/ui_clic.mp3` |
| Choisir un siège, une salle, un nombre, un votant | Bois qui s'ouvre : un siège, une salle, un nombre est choisi. | UIClick_WoodOpen_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/ui/ui_selection.mp3` |
| Retirer un choix, annuler une voix | Bois qui se ferme : choix retiré. | UIClick_WoodClose_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/ui/ui_deselection.mp3` |
| Action validée sans son propre | Confirmation magique : action validée sans son propre. | UIClick_MagicalConfirm_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/ui/ui_valider.mp3` |
| Action refusée, trop de sièges choisis | Alerte en bois : action refusée. | UIAlert_WoodError_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/ui/ui_erreur.mp3` |
| « ↶ Annuler » | Retour en bois : « Annuler ». | UIClick_WoodBack_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/ui/ui_annuler.mp3` |
| Salle enregistrée ou ajoutée, lien copié, musique choisie | Carillon qui monte : salle ajoutée, enregistrée, lien copié. | UIMisc_BelltreeUp_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/ui/ui_succes.mp3` |
| « Tirer les rôles » (salle sur mesure) | Pages feuilletées : tirage des rôles de la salle sur mesure. | RPG Audio — book_flip_1 (Kenney (kenney.nl), CC0 1.0) + RPG Audio — book_flip_2 (Kenney (kenney.nl), CC0 1.0) + RPG Audio — book_flip_3 (Kenney (kenney.nl), CC0 1.0) | `sons/ui/ui_tirage.mp3` |
| Siège déplacé (salle sur mesure) | Froissement de tissu : un siège est déplacé. | RPG Audio — cloth_1 (Kenney (kenney.nl), CC0 1.0) | `sons/ui/ui_glisser.mp3` |
| Une voix posée pendant le vote | Livre posé : une voix est posée au vote. | RPG Audio — book_place_1 (Kenney (kenney.nl), CC0 1.0) | `sons/ui/ui_voix.mp3` |
| « Commencer la partie » | Coup d'horreur et longue résonance : la partie commence. | horrorsting4 (shelbyshark, CC0 1.0) | `sons/transitions/tr_debut_partie.mp3` |
| Passage du jour à la nuit | Drone inquiétant et hululement de chouette : la nuit tombe. | DSGNDron_DroneCreepy_OS_01 (Oculus VR, LLC, CC BY 4.0) + Owl Hoot (Breviceps, CC0 1.0) | `sons/transitions/tr_nuit_tombe.mp3` |
| Passage à un jour (fin de nuit, jour 0) | Carillon à vent : le village se réveille. | MUSCChim_WindChimes_LOOP_01 (Oculus VR, LLC, CC BY 4.0) | `sons/transitions/tr_jour_se_leve.mp3` |
| Fin de nuit avec des morts | Glas : deux coups de cloche funèbre, il y a des morts cette nuit. | funeral bell-cloche funèbre (aoristos, CC0 1.0) | `sons/sfx/sfx_glas.mp3` |
| Fin de nuit sans mort | Petite phrase de guitare apaisée : personne n'est mort cette nuit. | MUSCStngr_AcousticGuitarPositive_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/sfx/sfx_nuit_calme.mp3` |
| Mort pendant le jour (vote, Main Noire…) | Impact sombre et un coup de cloche funèbre : un joueur meurt pendant le jour. | DSGNImpt_ImpactCreepyReverb_OS_01 (Oculus VR, LLC, CC BY 4.0) + funeral bell-cloche funèbre (aoristos, CC0 1.0) | `sons/sfx/sfx_mort.mp3` |
| Vote qui condamne | Roulement de caisse claire : le vote condamne quelqu'un. | MUSCStngr_MarchingSnare_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/sfx/sfx_verdict.mp3` |
| Vote sans éliminé | Notes de maillet qui retombent : personne n'est éliminé. | MUSCStngr_LossMallet_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/sfx/sfx_aucun_elimine.mp3` |
| Alpha élu ou successeur désigné | Fanfare d'orchestre : l'Alpha est élu. | MUSCStngr_LevelUpOrchestral_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/sfx/sfx_couronne.mp3` |
| L'Oracle désigne un joueur | Sort magique : le rôle est montré à l'Oracle. | MAGSpel_MagicSpell_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/sfx/sfx_revelation.mp3` |
| Info secrète d'un pouvoir de nuit (Instinct) | Chuchotements inquiétants : une info secrète pour le MJ. | VOXWhsp_WhispersCreepy_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/sfx/sfx_murmure.mp3` |
| Victoire des Pèlerins | Fanfare de victoire d'orchestre : victoire des Pèlerins. | MUSCStngr_VictoryOrchestral_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/fin/fin_pelerins.mp3` |
| Victoire des Spectres | Cordes inquiétantes et rire maléfique : victoire des Spectres. | MUSCStr_StringsCreepy_OS_01 (Oculus VR, LLC, CC BY 4.0) + VOXLaff_EvilLaugh_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/fin/fin_spectres.mp3` |
| Victoire d'un solitaire, de la Trinité ou des Doubles | Orgue inquiétant : victoire d'un solitaire ou d'un groupe. | MUSCKeyd_PipeOrganCreepy_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/fin/fin_solitaire.mp3` |
| Personne ne gagne | Phrase d'orchestre de défaite et coup de glas : personne ne gagne. | MUSCStngr_LossOrchestral_OS_01 (Oculus VR, LLC, CC BY 4.0) + funeral bell-cloche funèbre (aoristos, CC0 1.0) | `sons/fin/fin_personne.mp3` |

### Réveil des rôles

Joué quand le rôle est présenté (nuit d'explication), quand il se réveille la nuit, et pour les décisions liées à une mort
(Usurpateur, Main Noire, successeur de l'Alpha, Sacrifié, Bourreau). L'élection de l'Alpha joue le son de l'Alpha.

| Rôle | Ce qu'on entend | Base(s) | Fichier |
|---|---|---|---|
| spectre | Rire maléfique. | VOXLaff_EvilLaugh_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_spectre.mp3` |
| originel | Rire grave de géant : le premier des Spectres. | CREAHmn_GiantLaugh_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_originel.mp3` |
| maudit | Créature inquiétante qui grogne. | CREAMnstr_CreatureCreepy_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_maudit.mp3` |
| pelerin | Deux pas sur la terre. | FEETHmn_ShoeDirtWalk_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_pelerin.mp3` |
| devoue | Arpège de guitare qui monte, doux et sincère. | Meta Nylon Guitar D3 (Meta Creative Audio, CC0 1.0) + Meta Nylon Guitar Fs3 (Meta Creative Audio, CC0 1.0) + Meta Nylon Guitar A3 (Meta Creative Audio, CC0 1.0) + Meta Nylon Guitar D4 (Meta Creative Audio, CC0 1.0) + Meta Nylon Guitar Fs4 (Meta Creative Audio, CC0 1.0) | `sons/roles/role_devoue.mp3` |
| oracle | Sort magique scintillant. | MAGSpel_MagicSpell_OS_02 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_oracle.mp3` |
| protecteur | Choc d'épées. | WEAPSwrd_SwordClash_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_protecteur.mp3` |
| courtisane | Arpège de guitare léger. | Meta Nylon Guitar E4 (Meta Creative Audio, CC0 1.0) + Meta Nylon Guitar G4 (Meta Creative Audio, CC0 1.0) + Meta Nylon Guitar B4 (Meta Creative Audio, CC0 1.0) + Meta Nylon Guitar D5 (Meta Creative Audio, CC0 1.0) | `sons/roles/role_courtisane.mp3` |
| instinct | Battements de cœur. | Heart beat synthetic with loop (afleetingspeck, CC0 1.0) | `sons/roles/role_instinct.mp3` |
| sainte | Chœur de cathédrale. | 06 Speyer Cathedral Choir in Eastern Choir (blaukreuz, CC0 1.0) | `sons/roles/role_sainte.mp3` |
| vipere | Sifflement de serpent. | Snake Hiss (xoiziox, CC0 1.0) | `sons/roles/role_vipere.mp3` |
| main-noire | Grincement de bois inquiétant. | WOODFric_CreaksCreepyReverb_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_main-noire.mp3` |
| anatheme | Impact sombre qui résonne. | DSGNImpt_ImpactCreepyReverb_OS_02 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_anatheme.mp3` |
| adepte | Carillon à vent. | MUSCChim_WindChimes_LOOP_02 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_adepte.mp3` |
| usurpateur | Lame qui frotte. | WEAPSwrd_SwordScrape_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_usurpateur.mp3` |
| alpha | Appel de cor de chasse. | Hunt Horn (Countrychap999, CC0 1.0) | `sons/roles/role_alpha.mp3` |
| trinite | Trois notes de piano qui forment un accord. | Meta Piano D3 (Meta Creative Audio, CC0 1.0) + Meta Piano F3 (Meta Creative Audio, CC0 1.0) + Meta Piano A3 (Meta Creative Audio, CC0 1.0) | `sons/roles/role_trinite.mp3` |
| doubles | Deux cliquetis métalliques qui se répondent. | RPG Audio — metal_click (Kenney (kenney.nl), CC0 1.0) | `sons/roles/role_doubles.mp3` |
| augure | Croassements de corbeau. | Crow (fvcalderan (OpenGameArt), CC0 1.0) | `sons/roles/role_augure.mp3` |
| inquisiteur | Papier déchiré et livre refermé. | PAPRRip_PaperTear_OS_01 (Oculus VR, LLC, CC BY 4.0) + RPG Audio — book_close (Kenney (kenney.nl), CC0 1.0) | `sons/roles/role_inquisiteur.mp3` |
| medium | Chuchotements d'outre-tombe. | VOXWhsp_WhispersCreepyReverb_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_medium.mp3` |
| enchanteur | Sort magique. | Magic Spell SFX — magical_1 (JaggedStone (OpenGameArt), CC0 1.0) | `sons/roles/role_enchanteur.mp3` |
| sacrifie | Coup de cloche funèbre et cri lointain. | funeral bell-cloche funèbre (aoristos, CC0 1.0) + VOXMale_Male01DeathScream_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_sacrifie.mp3` |
| bourreau | Coup de hache. | WEAPAxe_WoodCutAxe_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_bourreau.mp3` |
| sectaire | Chant et orgue lointains, dans une église. | Nun singing and playing organ, distant, spooky, ethereal (jackjewers, CC0 1.0) | `sons/roles/role_sectaire.mp3` |
| envouteur | Tic-tac d'horloge inquiétant (balancier d'hypnose). | CLOCKTick_ClockCreepyReverb_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_envouteur.mp3` |
| necromancien | Chaînes et os qui craquent. | CHAINMvmt_ChainsCreepy_OS_01 (Oculus VR, LLC, CC BY 4.0) + GOREBone_BonesBreaking_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_necromancien.mp3` |
| revenant | Râle de mort-vivant. | VOXMale_GroanCreepy_OS_01 (Oculus VR, LLC, CC BY 4.0) | `sons/roles/role_revenant.mp3` |

### Ordre des sons après une action du MJ

`src/web/sons-evenements.ts` (testé par `tests/web/sons-evenements.test.ts`) enchaîne, dans l'ordre :

1. ce que l'action produit : verdict ou « aucun éliminé », couronne, révélation de l'Oracle, murmure d'une info secrète ;
2. les morts et la phase : fin de nuit → *le village se réveille*, puis glas (ou accord calme) ; mort pendant le jour → un
   coup de glas ; passage à la nuit → *la nuit tombe* ;
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
| `scripts/sons/sources.ts` | les bases : adresse, titre, auteur, licence, page vérifiée |
| `scripts/sons/montages.ts` | le montage de chaque son : extraits, placement, volume, fondus, filtres |
| `scripts/sons/assembler.ts` | télécharge les bases (cache `.cache/`, hors dépôt), monte, règle le volume, encode en MP3, écrit les crédits |
| `scripts/sons/dsp.ts` | outils de traitement : mixer, filtrer, fondus, vitesse, réverb, boucles |

Les boucles (musique, ambiances) ont **1 s de marge** de chaque côté dans le fichier (la fin collée avant, le début collé
après) : le décalage que l'encodage MP3 ajoute en tête tombe dans du vrai son, et l'appli boucle de 1 s à 1 s + durée, sans
trou. Le raccord de la boucle est un fondu enchaîné (`fondu` du montage).

## Changer ou ajouter un son

Il faut Node 20+, **ffmpeg** (`sudo apt install ffmpeg`, ou `brew install ffmpeg`) et un accès à Internet (la première fois,
pour télécharger les bases).

1. Trouver une base libre (pistes : `docs/sons-sources.md`), **vérifier sa licence sur sa page**, et l'ajouter à
   `scripts/sons/sources.ts`.
2. Nouveau son : l'ajouter au catalogue `src/web/sons-catalogue.ts`, et à la liste `SONS` de `public/sw.js` (un test vérifie
   les deux).
3. Écrire son montage dans `scripts/sons/montages.ts` (extrait, placement, volume, fondus).
4. Monter seulement ce son pour l'écouter :

   ```bash
   npm run sons -- role_spectre
   ```

5. Quand il convient, tout remonter (ça réécrit aussi `CREDITS.md`) :

   ```bash
   npm run sons
   ```

6. Le déclencher depuis `sons-evenements.ts` (événement de la partie) ou `main.ts` (bouton), et ajouter un test.
7. Mettre à jour la feuille de sons ci-dessus, puis lancer `npm test` et `npm run build`.

Pour retoucher un son à la main (Audacity), partir des fichiers téléchargés dans `.cache/sons-sources/`, et reporter le
résultat dans le montage pour qu'un `npm run sons` ne l'écrase pas.
