# Sources de sons libres de droits

Recherche du 27/11/2026 : dépôts et sites de sons libres qui collent au thème (horreur médiévale, nuit, spectres).
Règle du projet : **on part toujours d'un son existant** (une « base ») qu'on choisit, coupe et mixe ; on ne génère plus
de sons de zéro (voir `docs/sons.md`).

**Intégré le 27/11/2026** : les bases réellement utilisées, avec leur licence vérifiée, sont dans `scripts/sons/sources.ts`
et `CREDITS.md`. Les 4 manques de la recherche GitHub ont été comblés sur Freesound (CC0) : glas (« funeral bell-cloche
funèbre », aoristos), sifflement de serpent (« Snake Hiss », xoiziox), cor de chasse (« hunting-horn-bass », nanoPlink ; « Hunt Horn » de Countrychap999, une note tenue, a été écarté), et la
Trinité est faite de trois notes du piano Meta (CC0). Ce document garde la recherche et les autres pistes.

Avant d'intégrer un fichier : **vérifier la licence** dans le dépôt source, puis noter titre, auteur, URL, licence et
« modifié oui / non » dans `CREDITS.md`. Pas de licence « NC » (non commerciale) ni « SA » (partage à l'identique) sans
en parler d'abord.

## Les dépôts retenus

| Dépôt | Licence | Ce qu'il y a d'utile | Crédit |
|---|---|---|---|
| [facebookincubator/Meta-open-sound](https://github.com/facebookincubator/Meta-open-sound), dossier `corpora/oculus-audio-pack/ogg` | **CC BY 4.0** | 289 sons de jeu : rires (« EvilLaugh », géant, ogre, troll), chuchotements, drones, grincements, chaînes et horloge « creepy », forêt de nuit, vent et oiseaux, épées, hache, pas, clics d'interface en bois, jingles de victoire et de défaite, orgue et cordes « creepy », sort magique | **obligatoire**, phrase dans `ATTRIBUTION.md` du dépôt |
| Meta-open-sound, dossier `systems/instruments` | **CC0** | piano, guitare nylon et guitare acier note par note : pour une harpe / un arpège | non |
| [EternityForest/Free-SFX](https://github.com/EternityForest/Free-SFX) | **CC0** (racine) ; vérifier le README de chaque sous-dossier | ~1 100 sons en `.opus` : hululement de chouette, gémissements de fantôme (qubodup), marais, grillons, « horror sting », sorts magiques, pas, tissus | non (CC0) |
| [Boyquotes/kenney-rpg-audio-for-godot](https://github.com/Boyquotes/kenney-rpg-audio-for-godot) | **CC0** (pack « RPG Audio » de Kenney) | livres (ouvrir, feuilleter, poser), tissus, portes, grincements, couteau tiré, hache (« chop »), pièces, pas | non |
| [zuujis-cc0/opengameart-sound-effect](https://github.com/zuujis-cc0/opengameart-sound-effect) | **CC0** (copie d'OpenGameArt) | corbeau (`crow/crow_0.ogg`), pluie en boucle, cigales, 150 sons de combat | non |
| [Freesound](https://freesound.org) (filtre de licence « Creative Commons 0 ») | **CC0** (vérifier chaque son sur sa page) | énorme banque : cloches, animaux, voix, ambiances ; l'aperçu MP3 « hq » est téléchargeable sans compte | non (CC0) |
| [SoundSafari/CC0-1.0-Music](https://github.com/SoundSafari/CC0-1.0-Music) | **CC0** (corpus de ~7 000 morceaux du domaine public) | musique : **HoliznaCC0** (« Retro Synths », « Retro Soundtrack », « SomeWhere In The Dark », « Haunted Houses », « Halloween Soundscape »), **freepd.com** (« Cursed Intro », « Night in the Castle », « Dark Hallway », « Night Vigil », « Black Knight »), John Bartmann (« ominous-night », « murky-midnight ») ; sons Freesound CC0 (chœur de cathédrale, orgue, battement de cœur) | non, mais vérifier chaque morceau sur le site d'origine (le dépôt accepte les demandes de retrait) |

Écartés : [effacestudios/Royalty-Free-Music-Pack](https://github.com/effacestudios/Royalty-Free-Music-Pack) (style
pas adapté), [eliseintheclouds/witchy-things](https://github.com/eliseintheclouds/witchy-things) (très bon thème, mais
aucune licence : usage interdit sans accord de l'autrice), [onura46/Kaelin-Bougneit-CDDA-Music-Pack](https://github.com/onura46/Kaelin-Bougneit-CDDA-Music-Pack)
(CC BY-SA : partage à l'identique, à éviter), `triceam/Instant-Halloween` (pas de fichiers audio).

## Une base pour chaque son de l'appli

Chemins : `Oculus/` = `Meta-open-sound/corpora/oculus-audio-pack/ogg/`, `FreeSFX/` = `Free-SFX/`,
`Kenney/` = `kenney-rpg-audio-for-godot/addons/kenney rpg audio/`, `CC0Music/` = `CC0-1.0-Music/`.

### Musique et ambiances

| Son de l'appli | Base proposée | Autre choix |
|---|---|---|
| musique (4 au choix) | **freepd.com** « Creepy Hallow » (par défaut), « Evil Incoming », « Burt's Requiem » (domaine public), **HoliznaCC0** « Haunted Houses » (CC0) : lentes (40–46 BPM), en mineur, son grave ; aigus étouffés à 4 kHz | écartées : « Retro Synths », « Night Vigil », « WitchCraft » (pas assez sombres) ; « Lament for a Warrior's Soul », Requiem / Dies Irae de stripedgazelle, « Gothic » de SUPERARE, « Catacombae » (licence pas vérifiable à la source) |
| `amb_nuit` | `Oculus/AMBForst_Night_LOOP_01.ogg` (forêt la nuit) | + `Oculus/DSGNDron_DroneCreepy_OS_01.ogg` en dessous |
| `amb_jour` | `Oculus/WINDVege_LightWindTreesBirds_LOOP_01.ogg` | `Oculus/AMBForst_Forest_LOOP_01.ogg` |

### Interface

| Son | Base proposée |
|---|---|
| `ui_clic` | `Oculus/UIClick_WoodConfirm_OS_01.ogg` |
| `ui_selection` / `ui_deselection` | `Oculus/UIClick_WoodOpen_OS_01.ogg` / `UIClick_WoodClose_OS_01.ogg` |
| `ui_valider` | `Oculus/UIClick_MagicalConfirm_OS_01.ogg` |
| `ui_erreur` | `Oculus/UIAlert_WoodError_OS_01.ogg` |
| `ui_annuler` | `Oculus/UIClick_WoodBack_OS_01.ogg` |
| `ui_succes` | `Oculus/UIMisc_BelltreeUp_OS_01.ogg` |
| `ui_tirage` | `Kenney/book_flip_1.ogg` à `_3` (enchaînés) |
| `ui_glisser` | `Kenney/cloth_1.ogg` |
| `ui_voix` | `Kenney/book_place_1.ogg` |

### Transitions et événements

| Son | Base proposée |
|---|---|
| `tr_debut_partie` | `FreeSFX/Freesound/Stings/513329__shelbyshark__horrorsting4.opus` |
| `tr_nuit_tombe` | `FreeSFX/Freesound/Animals/465697__breviceps__owl-hoot.opus` sur `Oculus/DSGNDron_DroneCreepy_OS_02.ogg` |
| `tr_jour_se_leve` | `Oculus/MUSCChim_WindChimes_LOOP_01.ogg` (début, avec fondu) |
| `sfx_glas` | **à trouver** : pas de cloche d'église libre sur GitHub (piste : Freesound, filtre CC0) |
| `sfx_nuit_calme` | `Oculus/MUSCStngr_AcousticGuitarPositive_OS_01.ogg` |
| `sfx_mort` | `Oculus/DSGNImpt_ImpactCreepyReverb_OS_01.ogg` |
| `sfx_verdict` | `Oculus/MUSCStngr_MarchingSnare_OS_01.ogg` |
| `sfx_aucun_elimine` | `Oculus/MUSCStngr_LossMallet_OS_01.ogg` |
| `sfx_couronne` | `Oculus/MUSCStngr_LevelUpOrchestral_OS_01.ogg` |
| `sfx_revelation` | `Oculus/MAGSpel_MagicSpell_OS_01.ogg` |
| `sfx_murmure` | `Oculus/VOXWhsp_WhispersCreepy_OS_01.ogg` |
| `fin_pelerins` | `Oculus/MUSCStngr_VictoryOrchestral_OS_01.ogg` |
| `fin_spectres` | `Oculus/VOXLaff_EvilLaugh_OS_01.ogg` sur `Oculus/MUSCStr_StringsCreepy_OS_01.ogg` |
| `fin_solitaire` | `Oculus/MUSCKeyd_PipeOrganCreepy_OS_01.ogg` |
| `fin_personne` | `Oculus/MUSCStngr_LossOrchestral_OS_01.ogg` |

### Réveil des rôles

| Rôle | Base proposée |
|---|---|
| Spectre | `Oculus/VOXLaff_EvilLaugh_OS_01.ogg` (ricanement maléfique) |
| Originel | `Oculus/CREAHmn_GiantLaugh_OS_01.ogg` (rire grave) |
| Maudit | `Oculus/CREAMnstr_CreatureCreepy_OS_01.ogg` |
| Pèlerin | `Oculus/FEETHmn_ShoeDirtWalk_OS_01.ogg` |
| Dévoué | arpège de guitare nylon (`Meta-open-sound/systems/instruments/meta-nylon-guitar`, CC0) |
| Oracle | `Oculus/MAGSpel_MagicSpell_OS_02.ogg` |
| Protecteur | `Oculus/WEAPSwrd_SwordClash_OS_01.ogg` |
| Courtisane | arpège de guitare nylon (autre motif que le Dévoué) |
| Instinct | `CC0Music/freesound.org/248147__afleetingspeck__heart-beat-synthetic-with-loop.wav` |
| Sainte | `CC0Music/freesound.org/131113__blaukreuz__06-speyer-cathedral-choir-in-eastern-choir.wav` (extrait) |
| Vipère | **à trouver** : pas de sifflement de serpent libre trouvé |
| Main Noire | `Oculus/WOODFric_CreaksCreepyReverb_OS_01.ogg` |
| Anathème | `Oculus/DSGNImpt_ImpactCreepyReverb_OS_02.ogg` |
| Adepte | `Oculus/MUSCChim_WindChimes_LOOP_02.ogg` (extrait) |
| Usurpateur | `Kenney/draw_knife_1.ogg` ou `Oculus/WEAPSwrd_SwordScrape_OS_01.ogg` |
| Alpha | **à trouver** : pas d'appel de cor libre trouvé (en attendant : `Oculus/MUSCStngr_LevelUpOrchestral_OS_02.ogg`) |
| Trinité | à composer avec 3 notes de piano Meta (CC0) |
| Doubles | `Kenney/metal_click.ogg` doublé en écho |
| Augure | `zuujis-cc0/opengameart-sound-effect/crow/crow_0.ogg` (corbeau) |
| Inquisiteur | `Oculus/PAPRHndl_PaperTear_OS_01.ogg` ou `Kenney/book_close.ogg` |
| Médium | `Oculus/VOXWhsp_WhispersCreepyReverb_OS_01.ogg` |
| Enchanteur | `FreeSFX/JaggedStone/Magic Spell SFX/magical_1.opus` |
| Sacrifié | `Oculus/VOXMale_Male01DeathScream_OS_01.ogg` (au loin, avec réverb) |
| Bourreau | `Oculus/WEAPAxe_WoodCutAxe_OS_01.ogg` ou `Kenney/chop.ogg` |
| Sectaire | orgue ou chœur : `CC0Music/freesound.org/240208__jackjewers__nun-singing-and-playing-organ-distant-spooky-ethereal.aiff` |
| Envoûteur | `Oculus/CLOCKTick_ClockCreepyReverb_OS_01.ogg` (balancier d'hypnose) |
| Nécromancien | `Oculus/GOREBone_BonesBreaking_OS_01.ogg` + `Oculus/CHAINMvmt_ChainsCreepy_OS_01.ogg` |
| Revenant | `Oculus/VOXMale_GroanCreepy_OS_01.ogg` |

## Récupérer un fichier

Les dépôts sont gros (le corpus CC0 de musique fait ~40 Go) : ne pas les cloner en entier. Télécharger le fichier voulu
seul, par exemple :

```bash
curl -L -o rire.ogg "https://github.com/facebookincubator/Meta-open-sound/raw/main/corpora/oculus-audio-pack/ogg/VOXLaff_EvilLaugh_OS_01.ogg"
```

Puis le couper, le mixer et le convertir en MP3 (Audacity ou ffmpeg), le ranger au nom du catalogue dans `public/sons/`,
et le noter dans `CREDITS.md`.
