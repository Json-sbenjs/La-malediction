// Catalogue des sons de l'appli : un identifiant → un fichier dans public/sons/.
// Pas de DOM ici : le générateur (`npm run sons`) et les tests lisent aussi ce fichier.
// La feuille de sons complète (quand chaque son joue, et pourquoi) est dans docs/sons.md.
import type { RoleId } from '../engine';

/** Bus de volume : la musique et les effets se règlent (et se coupent) séparément. */
export type Canal = 'musique' | 'ambiance' | 'effet';

export interface DefSon {
  /** Chemin depuis public/ (ex. « sons/ui/ui_clic.mp3 »). */
  fichier: string;
  canal: Canal;
  /**
   * Sons en boucle : longueur de la boucle en secondes. Le fichier a une marge de
   * MARGE_BOUCLE seconde de chaque côté (voir scripts/sons/dsp.ts, `avecMarges`).
   */
  boucle?: number;
  /** Ce qu'on entend (repris dans docs/sons.md). Le montage est dans scripts/sons/montages.ts. */
  description: string;
}

/** Marge (en s) avant et après la boucle dans les fichiers en boucle. */
export const MARGE_BOUCLE = 1;

const son = (dossier: string, id: string, canal: Canal, description: string, boucle?: number): DefSon => ({
  fichier: `sons/${dossier}/${id}.mp3`,
  canal,
  description,
  ...(boucle === undefined ? {} : { boucle }),
});

const SONS_FIXES = {
  // Musique et ambiances (en boucle)
  musique_fond: son(
    'musique',
    'musique_fond',
    'musique',
    "Retro Synths (HoliznaCC0) : synthés rétro années 80, boucle de 96 s calée sur le motif. Remplaçable par le fichier du MJ.",
    96,
  ),
  amb_nuit: son('ambiance', 'amb_nuit', 'ambiance', "Nuit : forêt de nuit (insectes, bruissements) et drone inquiétant en dessous.", 44),
  amb_jour: son('ambiance', 'amb_jour', 'ambiance', "Jour : vent léger dans les arbres, oiseaux.", 70),

  // Interface
  ui_clic: son('ui', 'ui_clic', 'effet', "Clic de bois : tout bouton sans son propre."),
  ui_selection: son('ui', 'ui_selection', 'effet', "Bois qui s'ouvre : un siège, une salle, un nombre est choisi."),
  ui_deselection: son('ui', 'ui_deselection', 'effet', "Bois qui se ferme : choix retiré."),
  ui_valider: son('ui', 'ui_valider', 'effet', "Confirmation magique : action validée sans son propre."),
  ui_erreur: son('ui', 'ui_erreur', 'effet', "Alerte en bois : action refusée."),
  ui_annuler: son('ui', 'ui_annuler', 'effet', "Retour en bois : « Annuler »."),
  ui_succes: son('ui', 'ui_succes', 'effet', "Carillon qui monte : salle ajoutée, enregistrée, lien copié."),
  ui_tirage: son('ui', 'ui_tirage', 'effet', "Pages feuilletées : tirage des rôles de la salle sur mesure."),
  ui_glisser: son('ui', 'ui_glisser', 'effet', "Froissement de tissu : un siège est déplacé."),
  ui_voix: son('ui', 'ui_voix', 'effet', "Livre posé : une voix est posée au vote."),

  // Transitions de phase
  tr_debut_partie: son('transitions', 'tr_debut_partie', 'effet', "Coup d'horreur et longue résonance : la partie commence."),
  tr_nuit_tombe: son('transitions', 'tr_nuit_tombe', 'effet', "Drone inquiétant et hululement de chouette : la nuit tombe."),
  tr_jour_se_leve: son('transitions', 'tr_jour_se_leve', 'effet', "Carillon à vent : le village se réveille."),

  // Événements de la partie
  sfx_glas: son('sfx', 'sfx_glas', 'effet', "Glas : deux coups de cloche funèbre, il y a des morts cette nuit."),
  sfx_nuit_calme: son('sfx', 'sfx_nuit_calme', 'effet', "Petite phrase de guitare apaisée : personne n'est mort cette nuit."),
  sfx_mort: son('sfx', 'sfx_mort', 'effet', "Impact sombre et un coup de cloche funèbre : un joueur meurt pendant le jour."),
  sfx_verdict: son('sfx', 'sfx_verdict', 'effet', "Roulement de caisse claire : le vote condamne quelqu'un."),
  sfx_aucun_elimine: son('sfx', 'sfx_aucun_elimine', 'effet', "Notes de maillet qui retombent : personne n'est éliminé."),
  sfx_couronne: son('sfx', 'sfx_couronne', 'effet', "Fanfare d'orchestre : l'Alpha est élu."),
  sfx_revelation: son('sfx', 'sfx_revelation', 'effet', "Sort magique : le rôle est montré à l'Oracle."),
  sfx_murmure: son('sfx', 'sfx_murmure', 'effet', "Chuchotements inquiétants : une info secrète pour le MJ."),

  // Fin de partie
  fin_pelerins: son('fin', 'fin_pelerins', 'effet', "Fanfare de victoire d'orchestre : victoire des Pèlerins."),
  fin_spectres: son('fin', 'fin_spectres', 'effet', "Cordes inquiétantes et rire maléfique : victoire des Spectres."),
  fin_solitaire: son('fin', 'fin_solitaire', 'effet', "Orgue inquiétant : victoire d'un solitaire ou d'un groupe."),
  fin_personne: son('fin', 'fin_personne', 'effet', "Phrase d'orchestre de défaite et coup de glas : personne ne gagne."),
} satisfies Record<string, DefSon>;

/** Son joué au réveil (ou à la présentation) de chaque rôle. */
export const DESCRIPTION_ROLES: Record<RoleId, string> = {
  spectre: "Rire maléfique.",
  originel: "Rire grave de géant : le premier des Spectres.",
  maudit: "Créature inquiétante qui grogne.",
  pelerin: "Deux pas sur la terre.",
  devoue: "Arpège de guitare qui monte, doux et sincère.",
  oracle: "Sort magique scintillant.",
  protecteur: "Choc d'épées.",
  courtisane: "Arpège de guitare léger.",
  instinct: "Battements de cœur.",
  sainte: "Chœur de cathédrale.",
  vipere: "Sifflement de serpent.",
  'main-noire': "Grincement de bois inquiétant.",
  anatheme: "Impact sombre qui résonne.",
  adepte: "Carillon à vent.",
  usurpateur: "Lame qui frotte.",
  alpha: "Appel de cor de chasse.",
  trinite: "Trois notes de piano qui forment un accord.",
  doubles: "Deux cliquetis métalliques qui se répondent.",
  augure: "Croassements de corbeau.",
  inquisiteur: "Papier déchiré et livre refermé.",
  medium: "Chuchotements d'outre-tombe.",
  enchanteur: "Sort magique.",
  sacrifie: "Coup de cloche funèbre et cri lointain.",
  bourreau: "Coup de hache.",
  sectaire: "Chant et orgue lointains, dans une église.",
  envouteur: "Tic-tac d'horloge inquiétant (balancier d'hypnose).",
  necromancien: "Chaînes et os qui craquent.",
  revenant: "Râle de mort-vivant.",
};

export type IdSonRole = `role_${RoleId}`;

export const idSonRole = (role: RoleId): IdSonRole => `role_${role}`;

const SONS_ROLES = Object.fromEntries(
  (Object.keys(DESCRIPTION_ROLES) as RoleId[]).map((role) => [
    idSonRole(role),
    son('roles', idSonRole(role), 'effet', DESCRIPTION_ROLES[role]),
  ]),
) as Record<IdSonRole, DefSon>;

export type IdSon = keyof typeof SONS_FIXES | IdSonRole;

/** Tous les sons de l'appli. */
export const SONS: Record<IdSon, DefSon> = { ...SONS_FIXES, ...SONS_ROLES };

export const TOUS_LES_SONS = Object.keys(SONS) as IdSon[];
