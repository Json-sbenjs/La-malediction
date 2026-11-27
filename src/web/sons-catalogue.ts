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
  /** Ce qu'on doit entendre : sert de cahier des charges au générateur. */
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
    "Musique de fond originale, synthés analogiques années 80 : basse pulsée, arpège, nappe, cloches. Remplaçable par le fichier du MJ.",
    57.6,
  ),
  amb_nuit: son('ambiance', 'amb_nuit', 'ambiance', 'Nuit : drone métallique en secondes mineures, vent, grillons lointains.', 40),
  amb_jour: son('ambiance', 'amb_jour', 'ambiance', 'Jour : vent léger, oiseaux au loin.', 40),

  // Interface
  ui_clic: son('ui', 'ui_clic', 'effet', 'Clic de bois sec, très court : tout bouton sans son propre.'),
  ui_selection: son('ui', 'ui_selection', 'effet', 'Pincement qui monte : un siège, une salle, un nombre est choisi.'),
  ui_deselection: son('ui', 'ui_deselection', 'effet', 'Pincement qui descend : choix retiré.'),
  ui_valider: son('ui', 'ui_valider', 'effet', 'Deux notes qui montent : action validée sans son propre.'),
  ui_erreur: son('ui', 'ui_erreur', 'effet', 'Deux notes graves qui descendent : action refusée.'),
  ui_annuler: son('ui', 'ui_annuler', 'effet', 'Souffle à l\'envers (rembobinage) : « Annuler ».'),
  ui_succes: son('ui', 'ui_succes', 'effet', 'Petit arpège de cloches : salle ajoutée, enregistrée, lien copié.'),
  ui_tirage: son('ui', 'ui_tirage', 'effet', 'Cartes battues : tirage des rôles de la salle sur mesure.'),
  ui_glisser: son('ui', 'ui_glisser', 'effet', 'Frottement doux : un siège est déplacé.'),
  ui_voix: son('ui', 'ui_voix', 'effet', 'Coup de plume et petit tambour : une voix est posée au vote.'),

  // Transitions de phase
  tr_debut_partie: son('transitions', 'tr_debut_partie', 'effet', 'Gong grave et souffle qui monte : la partie commence.'),
  tr_nuit_tombe: son('transitions', 'tr_nuit_tombe', 'effet', 'Nappe qui descend, cloche grave, hibou : la nuit tombe.'),
  tr_jour_se_leve: son('transitions', 'tr_jour_se_leve', 'effet', 'Nappe qui monte et carillon clair : le village se réveille.'),

  // Événements de la partie
  sfx_glas: son('sfx', 'sfx_glas', 'effet', 'Glas : trois coups de cloche grave, il y a des morts cette nuit.'),
  sfx_nuit_calme: son('sfx', 'sfx_nuit_calme', 'effet', 'Accord doux et apaisé : personne n\'est mort cette nuit.'),
  sfx_mort: son('sfx', 'sfx_mort', 'effet', 'Un coup de glas et un souffle : un joueur meurt pendant le jour.'),
  sfx_verdict: son('sfx', 'sfx_verdict', 'effet', 'Trois coups de tambour : le vote condamne quelqu\'un.'),
  sfx_aucun_elimine: son('sfx', 'sfx_aucun_elimine', 'effet', 'Coup sourd qui retombe : personne n\'est éliminé.'),
  sfx_couronne: son('sfx', 'sfx_couronne', 'effet', 'Courte fanfare de cuivres : l\'Alpha est élu.'),
  sfx_revelation: son('sfx', 'sfx_revelation', 'effet', 'Scintillement de cristal : le rôle est montré à l\'Oracle.'),
  sfx_murmure: son('sfx', 'sfx_murmure', 'effet', 'Murmure soufflé : une info secrète pour le MJ.'),

  // Fin de partie
  fin_pelerins: son('fin', 'fin_pelerins', 'effet', 'Cloches et cuivres en majeur : victoire des Pèlerins.'),
  fin_spectres: son('fin', 'fin_spectres', 'effet', 'Accord grave distordu et hurlement : victoire des Spectres.'),
  fin_solitaire: son('fin', 'fin_solitaire', 'effet', 'Boîte à musique désaccordée : victoire d\'un solitaire ou d\'un groupe.'),
  fin_personne: son('fin', 'fin_personne', 'effet', 'Vent et un seul coup de glas : personne ne gagne.'),
} satisfies Record<string, DefSon>;

/** Son joué au réveil (ou à la présentation) de chaque rôle. */
export const DESCRIPTION_ROLES: Record<RoleId, string> = {
  spectre: 'Plainte de fantôme qui glisse, souffle glacé.',
  originel: 'Plainte plus grave et grognement : le premier des Spectres.',
  maudit: 'Grognement distordu puis hurlement de bête.',
  pelerin: 'Bâton de marche sur la pierre et clochette.',
  devoue: 'Harpe qui monte, douce et sincère.',
  oracle: 'Verre de cristal qui chante.',
  protecteur: 'Bouclier frappé, métal qui résonne.',
  courtisane: 'Glissando de harpe et clochette.',
  instinct: 'Battements de cœur.',
  sainte: 'Chœur céleste en majeur.',
  vipere: 'Sifflement de serpent et crécelle.',
  'main-noire': 'Accord grave et sec, souffle sombre.',
  anatheme: 'Cloche jouée à l\'envers.',
  adepte: 'Bol chantant tibétain.',
  usurpateur: 'Lame tirée du fourreau.',
  alpha: 'Appel de cor.',
  trinite: 'Trois cloches qui forment un accord.',
  doubles: 'Deux pincements identiques qui se répondent.',
  augure: 'Croassements de corbeau.',
  inquisiteur: 'Plume qui gratte et cachet de cire.',
  medium: 'Thérémine de séance, voix d\'outre-tombe.',
  enchanteur: 'Pluie d\'étincelles magiques et berceuse.',
  sacrifie: 'Cloche grave et chœur qui retombe.',
  bourreau: 'Coup de hache sur le billot.',
  sectaire: 'Psalmodie de moines.',
  envouteur: 'Flûte de charmeur.',
  necromancien: 'Grondement de crypte et os qui s\'entrechoquent.',
  revenant: 'Râle de mort-vivant.',
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
