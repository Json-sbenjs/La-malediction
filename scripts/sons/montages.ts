// Montage de chaque son de l'appli à partir des bases libres de droits (sources.ts).
// Un montage = des couches : un extrait d'une source, placé à un moment, avec son volume et ses fondus.
// Pour changer un son : changer son montage, puis `npm run sons -- <id>` (voir docs/sons.md).
import type { IdSon } from '../../src/web/sons-catalogue.ts';
import type { IdSource } from './sources.ts';

export interface Couche {
  source: IdSource;
  /** Début de l'extrait dans la source (s). 0 par défaut. */
  depuis?: number;
  /** Durée de l'extrait (s). Jusqu'à la fin de la source par défaut. */
  duree?: number;
  /** Lire la source en boucle pour atteindre `duree` (sources « LOOP »). */
  enBoucle?: boolean;
  /** Où placer l'extrait dans le son final (s). 0 par défaut. */
  a?: number;
  /** Volume de la couche (1 = inchangé). */
  gain?: number;
  /** Vitesse de lecture : 0,85 = un peu plus grave et plus lent. */
  vitesse?: number;
  fonduEntree?: number;
  fonduSortie?: number;
  /** Coupe les graves sous cette fréquence (Hz). */
  passeHaut?: number;
  /** Coupe les aigus au-dessus de cette fréquence (Hz) : son lointain, étouffé. */
  passeBas?: number;
}

export interface Montage {
  couches: Couche[];
  /** Réverbération ajoutée au mélange (0 à 1). */
  reverb?: number;
  /** Sons en boucle : durée du fondu enchaîné entre la fin et le début (s). */
  fondu?: number;
  /** Volume perçu visé (dB), sinon celui du canal (voir assembler.ts). */
  niveau?: number;
}

const c = (source: IdSource, options: Omit<Couche, 'source'> = {}): Couche => ({ source, ...options });

/** Une suite de notes jouées l'une après l'autre (arpège). */
const arpege = (notes: IdSource[], ecart: number, duree: number, gain = 1): Couche[] =>
  notes.map((source, i) => c(source, { a: i * ecart, duree, fonduSortie: duree * 0.4, gain }));

export const MONTAGES: Record<IdSon, Montage> = {
  // ── Musique et ambiances (en boucle) ──
  // Retro Synths a un motif de 8 s, régulier de 16 s à 196 s : boucle de 96 s calée sur ce motif.
  musique_fond: { couches: [c('retroSynths', { depuis: 16, duree: 100 })], fondu: 4 },
  amb_nuit: {
    couches: [c('foretNuit', { enBoucle: true, duree: 48 }), c('droneCreepy2', { depuis: 4, duree: 48, gain: 0.35 })],
    fondu: 4,
  },
  amb_jour: { couches: [c('ventOiseaux', { duree: 73.9 })], fondu: 3.9 },

  // ── Interface ──
  ui_clic: { couches: [c('clicBois')], niveau: -27 },
  ui_selection: { couches: [c('ouvrirBois')], niveau: -26 },
  ui_deselection: { couches: [c('fermerBois')], niveau: -27 },
  ui_valider: { couches: [c('confirmerMagique')], niveau: -24 },
  ui_erreur: { couches: [c('erreurBois')], niveau: -23 },
  ui_annuler: { couches: [c('retourBois')], niveau: -25 },
  ui_succes: { couches: [c('carillonMonte', { duree: 2.5, fonduSortie: 1 })], niveau: -23 },
  ui_tirage: {
    couches: [c('livreFeuillete1'), c('livreFeuillete2', { a: 0.12 }), c('livreFeuillete3', { a: 0.24 })],
    niveau: -25,
  },
  ui_glisser: { couches: [c('tissu')], niveau: -29 },
  ui_voix: { couches: [c('livrePose')], niveau: -24 },

  // ── Transitions ──
  tr_debut_partie: { couches: [c('stingHorreur', { depuis: 0.8, duree: 7, fonduSortie: 3 })] },
  tr_nuit_tombe: {
    couches: [
      c('droneCreepy1', { duree: 6, fonduEntree: 1, fonduSortie: 2, gain: 0.6 }),
      c('hibou', { a: 1, passeBas: 3000 }),
    ],
    reverb: 0.2,
  },
  tr_jour_se_leve: { couches: [c('carillonVent', { duree: 5, fonduEntree: 0.3, fonduSortie: 2 })] },

  // ── Événements ──
  // Le glas de aoristos sonne toutes les 7 s : 2 coups pour les morts de la nuit, 1 pour une mort le jour.
  sfx_glas: { couches: [c('glas', { depuis: 0.4, duree: 12, fonduSortie: 4 })] },
  sfx_nuit_calme: { couches: [c('guitarePositive')], niveau: -21 },
  sfx_mort: {
    couches: [c('impactCreepy1', { gain: 0.5 }), c('glas', { depuis: 7.3, duree: 5, fonduSortie: 3 })],
  },
  sfx_verdict: { couches: [c('caisseClaire')] },
  sfx_aucun_elimine: { couches: [c('perteMaillet')], niveau: -22 },
  sfx_couronne: { couches: [c('niveauOrchestre')] },
  sfx_revelation: { couches: [c('sort1')] },
  sfx_murmure: { couches: [c('chuchotements', { duree: 3, fonduSortie: 1 })], niveau: -23 },

  // ── Fin de partie ──
  fin_pelerins: { couches: [c('victoireOrchestre')] },
  fin_spectres: { couches: [c('cordesCreepy', { gain: 0.7 }), c('rireMalefique', { a: 0.5 })] },
  fin_solitaire: { couches: [c('orgueCreepy', { duree: 6, fonduSortie: 2 })] },
  fin_personne: {
    couches: [c('defaiteOrchestre'), c('glas', { depuis: 7.3, duree: 5, a: 2.5, gain: 0.6, fonduSortie: 3 })],
  },

  // ── Réveil des rôles ──
  role_spectre: { couches: [c('rireMalefique')] },
  role_originel: { couches: [c('rireGeant', { depuis: 0.15, duree: 2.9, fonduSortie: 0.4 })] },
  role_maudit: { couches: [c('creature')] },
  role_pelerin: { couches: [c('pasTerre'), c('pasTerre', { a: 0.5, gain: 0.9 })] },
  role_devoue: { couches: arpege(['guitareD3', 'guitareFs3', 'guitareA3', 'guitareD4', 'guitareFs4'], 0.15, 2.5) },
  role_oracle: { couches: [c('sort2')] },
  role_protecteur: { couches: [c('epees')] },
  role_courtisane: { couches: arpege(['guitareE4', 'guitareG4', 'guitareB4', 'guitareD5'], 0.09, 2) },
  role_instinct: { couches: [c('battementCoeur', { duree: 2.4, fonduSortie: 0.3 })] },
  role_sainte: { couches: [c('choeurCathedrale', { depuis: 68, duree: 4.5, fonduEntree: 0.5, fonduSortie: 1.5 })] },
  role_vipere: { couches: [c('serpent', { depuis: 0.3, duree: 2.5, fonduSortie: 0.4 })] },
  'role_main-noire': { couches: [c('grincement')] },
  role_anatheme: { couches: [c('impactCreepy2')] },
  role_adepte: { couches: [c('carillonVent2', { duree: 4, fonduEntree: 0.3, fonduSortie: 1.5 })] },
  role_usurpateur: { couches: [c('epeeFrotte')] },
  role_alpha: { couches: [c('cor', { duree: 3.5, fonduSortie: 1 })] },
  role_trinite: { couches: arpege(['pianoD3', 'pianoF3', 'pianoA3'], 0.35, 3.5) },
  role_doubles: { couches: [c('cliquetisMetal'), c('cliquetisMetal', { a: 0.25, gain: 0.6 })] },
  role_augure: { couches: [c('corbeau'), c('corbeau', { a: 0.7, gain: 0.8 })] },
  role_inquisiteur: { couches: [c('papierDechire'), c('livreFerme', { a: 0.9 })] },
  role_medium: { couches: [c('chuchotementsReverb', { duree: 4, fonduSortie: 1.5 })] },
  role_enchanteur: { couches: [c('sortMagique')] },
  role_sacrifie: {
    couches: [
      c('glas', { depuis: 7.3, duree: 5, vitesse: 0.85, fonduSortie: 2 }),
      c('criMort', { a: 0.3, gain: 0.5, passeBas: 1800 }),
    ],
    reverb: 0.3,
  },
  role_bourreau: { couches: [c('hache', { duree: 1, fonduSortie: 0.3 })] },
  role_sectaire: { couches: [c('orgueNonne', { depuis: 152, duree: 5, fonduEntree: 0.5, fonduSortie: 1.5 })] },
  role_envouteur: { couches: [c('horloge', { duree: 4, fonduSortie: 1 })] },
  role_necromancien: { couches: [c('chaines', { gain: 0.7 }), c('os', { a: 0.8 })] },
  role_revenant: { couches: [c('rale', { depuis: 0.2, duree: 4.6, fonduSortie: 0.8 })] },
};
