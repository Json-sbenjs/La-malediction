// Les sons de base (libres de droits) à partir desquels on monte les sons de l'appli.
// Règle du projet : on part toujours d'une base, on ne génère pas de sons de zéro (docs/sons.md).
// Chaque source dit d'où elle vient et sous quelle licence : CREDITS.md est écrit à partir de cette liste.

export type Licence = 'CC0 1.0' | 'CC BY 4.0';

export interface Source {
  /** Adresse de téléchargement du fichier. */
  url: string;
  titre: string;
  auteur: string;
  licence: Licence;
  /** Page où la licence a été vérifiée. */
  page: string;
}

const brut = (depot: string, chemin: string) =>
  `https://raw.githubusercontent.com/${depot}/main/${chemin.split('/').map(encodeURIComponent).join('/')}`;

const OCULUS_PAGE = 'https://github.com/facebookincubator/Meta-open-sound/tree/main/corpora/oculus-audio-pack';
/** Phrase de crédit exigée par la licence du pack Oculus (CC BY 4.0). */
export const CREDIT_OCULUS =
  '"Oculus Audio Pack 01" by Oculus VR, LLC (https://developers.meta.com/vr/downloads/package/oculus-audio-pack-1/), licensed under CC BY 4.0. Files renamed to the UCS naming convention; OGG previews transcoded from the original WAVs.';

const oculus = (fichier: string): Source => ({
  url: brut('facebookincubator/Meta-open-sound', `corpora/oculus-audio-pack/ogg/${fichier}.ogg`),
  titre: fichier,
  auteur: 'Oculus VR, LLC',
  licence: 'CC BY 4.0',
  page: OCULUS_PAGE,
});

const guitare = (corde: string, note: string): Source => ({
  url: brut('facebookincubator/Meta-open-sound', `systems/instruments/meta-nylon-guitar/ogg/INSGuitarNylon_${corde}_Vel01Finger_${note}_01.ogg`),
  titre: `Meta Nylon Guitar ${note}`,
  auteur: 'Meta Creative Audio',
  licence: 'CC0 1.0',
  page: 'https://github.com/facebookincubator/Meta-open-sound',
});

const piano = (note: string): Source => ({
  url: brut('facebookincubator/Meta-open-sound', `systems/instruments/meta-piano/ogg/INSPiano_Vel03_${note}_01.ogg`),
  titre: `Meta Piano ${note}`,
  auteur: 'Meta Creative Audio',
  licence: 'CC0 1.0',
  page: 'https://github.com/facebookincubator/Meta-open-sound',
});

const kenney = (fichier: string): Source => ({
  url: brut('Boyquotes/kenney-rpg-audio-for-godot', `addons/kenney rpg audio/${fichier}.ogg`),
  titre: `RPG Audio — ${fichier}`,
  auteur: 'Kenney (kenney.nl)',
  licence: 'CC0 1.0',
  page: 'https://github.com/Boyquotes/kenney-rpg-audio-for-godot',
});

/** Son de Freesound en CC0 (licence vérifiée sur sa page) ; on prend l'aperçu MP3 « hq ». */
const freesound = (id: number, apercu: string, titre: string, auteur: string): Source => ({
  url: `https://cdn.freesound.org/previews/${apercu}-hq.mp3`,
  titre,
  auteur,
  licence: 'CC0 1.0',
  page: `https://freesound.org/s/${id}/`,
});

const musiqueCC0 = (chemin: string, titre: string, auteur: string, page: string): Source => ({
  url: brut('SoundSafari/CC0-1.0-Music', chemin),
  titre,
  auteur,
  licence: 'CC0 1.0',
  page,
});

export const SOURCES = {
  // Musique
  // Musiques (sombres, en mineur). freepd.com : tout son catalogue est dans le domaine public.
  creepyHallow: musiqueCC0('freepd.com/Creepy Hallow.mp3', 'Creepy Hallow', 'freepd.com', 'https://freepd.com/'),
  evilIncoming: musiqueCC0('freepd.com/Evil Incoming.mp3', 'Evil Incoming', 'freepd.com', 'https://freepd.com/'),
  hauntedHouses: musiqueCC0(
    'freemusicarchive.org/HoliznaCC0 - Haunted Houses.mp3',
    'Haunted Houses',
    'HoliznaCC0',
    'https://freemusicarchive.org/music/holiznacc0/',
  ),
  burtsRequiem: musiqueCC0("freepd.com/Burt's Requiem.mp3", "Burt's Requiem", 'freepd.com', 'https://freepd.com/'),

  // Ambiances
  foretNuit: oculus('AMBForst_Night_LOOP_01'),
  droneCreepy1: oculus('DSGNDron_DroneCreepy_OS_01'),
  droneCreepy2: oculus('DSGNDron_DroneCreepy_OS_02'),
  ventOiseaux: oculus('WINDVege_LightWindTreesBirds_LOOP_01'),

  // Interface
  clicBois: oculus('UIClick_WoodConfirm_OS_01'),
  ouvrirBois: oculus('UIClick_WoodOpen_OS_01'),
  fermerBois: oculus('UIClick_WoodClose_OS_01'),
  retourBois: oculus('UIClick_WoodBack_OS_01'),
  erreurBois: oculus('UIAlert_WoodError_OS_01'),
  confirmerMagique: oculus('UIClick_MagicalConfirm_OS_01'),
  carillonMonte: oculus('UIMisc_BelltreeUp_OS_01'),
  livreFeuillete1: kenney('book_flip_1'),
  livreFeuillete2: kenney('book_flip_2'),
  livreFeuillete3: kenney('book_flip_3'),
  tissu: kenney('cloth_1'),
  livrePose: kenney('book_place_1'),

  // Transitions et événements
  stingHorreur: freesound(513329, '513/513329_8644110', 'horrorsting4', 'shelbyshark'),
  hibou: freesound(465697, '465/465697_9159316', 'Owl Hoot', 'Breviceps'),
  carillonVent: oculus('MUSCChim_WindChimes_LOOP_01'),
  carillonVent2: oculus('MUSCChim_WindChimes_LOOP_02'),
  glas: freesound(329324, '329/329324_2060528', 'funeral bell-cloche funèbre', 'aoristos'),
  guitarePositive: oculus('MUSCStngr_AcousticGuitarPositive_OS_01'),
  impactCreepy1: oculus('DSGNImpt_ImpactCreepyReverb_OS_01'),
  impactCreepy2: oculus('DSGNImpt_ImpactCreepyReverb_OS_02'),
  caisseClaire: oculus('MUSCStngr_MarchingSnare_OS_01'),
  perteMaillet: oculus('MUSCStngr_LossMallet_OS_01'),
  niveauOrchestre: oculus('MUSCStngr_LevelUpOrchestral_OS_01'),
  sort1: oculus('MAGSpel_MagicSpell_OS_01'),
  sort2: oculus('MAGSpel_MagicSpell_OS_02'),
  chuchotements: oculus('VOXWhsp_WhispersCreepy_OS_01'),
  chuchotementsReverb: oculus('VOXWhsp_WhispersCreepyReverb_OS_01'),
  victoireOrchestre: oculus('MUSCStngr_VictoryOrchestral_OS_01'),
  defaiteOrchestre: oculus('MUSCStngr_LossOrchestral_OS_01'),
  rireMalefique: oculus('VOXLaff_EvilLaugh_OS_01'),
  cordesCreepy: oculus('MUSCStr_StringsCreepy_OS_01'),
  orgueCreepy: oculus('MUSCKeyd_PipeOrganCreepy_OS_01'),

  // Rôles
  rireGeant: oculus('CREAHmn_GiantLaugh_OS_01'),
  creature: oculus('CREAMnstr_CreatureCreepy_OS_01'),
  pasTerre: oculus('FEETHmn_ShoeDirtWalk_OS_01'),
  epees: oculus('WEAPSwrd_SwordClash_OS_01'),
  battementCoeur: freesound(248147, '248/248147_2522406', 'Heart beat synthetic with loop', 'afleetingspeck'),
  choeurCathedrale: freesound(131113, '131/131113_623488', '06 Speyer Cathedral Choir in Eastern Choir', 'blaukreuz'),
  serpent: freesound(553374, '553/553374_3940234', 'Snake Hiss', 'xoiziox'),
  grincement: oculus('WOODFric_CreaksCreepyReverb_OS_01'),
  epeeFrotte: oculus('WEAPSwrd_SwordScrape_OS_01'),
  cor: freesound(69206, '69/69206_993824', 'Hunt Horn', 'Countrychap999'),
  cliquetisMetal: kenney('metal_click'),
  corbeau: {
    url: brut('zuujis-cc0/opengameart-sound-effect', 'crow/crow_0.ogg'),
    titre: 'Crow',
    auteur: 'fvcalderan (OpenGameArt)',
    licence: 'CC0 1.0',
    page: 'https://opengameart.org/content/crow',
  },
  papierDechire: oculus('PAPRRip_PaperTear_OS_01'),
  livreFerme: kenney('book_close'),
  sortMagique: {
    url: brut('EternityForest/Free-SFX', 'JaggedStone/Magic Spell SFX/magical_1.opus'),
    titre: 'Magic Spell SFX — magical_1',
    auteur: 'JaggedStone (OpenGameArt)',
    licence: 'CC0 1.0',
    page: 'https://opengameart.org/content/magic-spell-sfx',
  },
  criMort: oculus('VOXMale_Male01DeathScream_OS_01'),
  hache: oculus('WEAPAxe_WoodCutAxe_OS_01'),
  orgueNonne: freesound(240208, '240/240208_3595093', 'Nun singing and playing organ, distant, spooky, ethereal', 'jackjewers'),
  horloge: oculus('CLOCKTick_ClockCreepyReverb_OS_01'),
  os: oculus('GOREBone_BonesBreaking_OS_01'),
  chaines: oculus('CHAINMvmt_ChainsCreepy_OS_01'),
  rale: oculus('VOXMale_GroanCreepy_OS_01'),

  // Notes d'instruments (arpèges du Dévoué, de la Courtisane, accord de la Trinité)
  guitareD3: guitare('StringD', 'D3'),
  guitareFs3: guitare('StringD', 'Fs3'),
  guitareA3: guitare('StringG', 'A3'),
  guitareD4: guitare('StringB', 'D4'),
  guitareFs4: guitare('StringHighE', 'Fs4'),
  guitareA4: guitare('StringHighE', 'A4'),
  guitareE4: guitare('StringB', 'E4'),
  guitareG4: guitare('StringHighE', 'G4'),
  guitareB4: guitare('StringHighE', 'B4'),
  guitareD5: guitare('StringHighE', 'D5'),
  pianoD3: piano('D3'),
  pianoF3: piano('F3'),
  pianoA3: piano('A3'),
} satisfies Record<string, Source>;

export type IdSource = keyof typeof SOURCES;
