// Types de base du moteur de La Malédiction.
// Règle d'or : ce fichier (et tout src/engine/) reste en TypeScript pur,
// sans fs, readline, process ni DOM, pour tourner aussi sur l'iPad.

/**
 * Identifiant d'un rôle.
 * Pour l'instant : uniquement les rôles présents sur les plans de salle (P1).
 * Les rôles « après la deadline » (Dévoué, Augure, Inquisiteur, Médium,
 * Enchanteur, Originel, Maudit, Sacrifié, Bourreau, Doubles, Sectaire,
 * Envoûteur, Nécromancien / Revenant) seront ajoutés ici plus tard.
 */
export type RoleId =
  | 'spectre'
  | 'pelerin'
  | 'oracle'
  | 'protecteur'
  | 'courtisane'
  | 'instinct'
  | 'sainte'
  | 'vipere'
  | 'main-noire'
  | 'anatheme'
  | 'adepte'
  | 'usurpateur'
  | 'alpha'
  | 'trinite';

/**
 * Camp avec lequel un joueur peut gagner.
 * Le camp d'un joueur peut changer en cours de partie
 * (Anathème dont le modèle meurt, Adepte héritant d'un Spectre,
 * Trinité qui se dissout à la 1re mort).
 */
export type Camp = 'pelerins' | 'spectres' | 'trinite';

/** Numéro du siège = identifiant du joueur (le rôle est lié au siège). */
export type JoueurId = number;

/** États temporaires ou durables posés sur un joueur. */
export interface Statuts {
  /** Occupé par la Courtisane : ne se réveille pas cette nuit. */
  occupe: boolean;
  /** Protégé par le Protecteur cette nuit. */
  protege: boolean;
}

/** Ce que le rôle d'un joueur doit retenir d'une nuit à l'autre. */
export interface Memoire {
  /** Pouvoir à usage unique déjà utilisé (Sainte, Vipère, Usurpateur). */
  pouvoirUtilise: boolean;
  /** Pouvoir perdu définitivement (Instinct qui rate). */
  pouvoirPerdu: boolean;
  /** Dernière cible et sa nuit : interdit de viser la même deux nuits de suite (Protecteur, Courtisane). */
  derniereCible: { nuit: number; cible: JoueurId } | null;
  /** Joueur lié : modèle de l'Anathème, mentor de l'Adepte. */
  lien: JoueurId | null;
}

export interface Joueur {
  id: JoueurId;
  /** Prénom facultatif saisi par le MJ. */
  nom: string | null;
  role: RoleId;
  camp: Camp;
  vivant: boolean;
  /** Rôle connu de tous (révélé à la mort, etc.). */
  revele: boolean;
  statuts: Statuts;
  memoire: Memoire;
}

/**
 * Où en est la partie. Union discriminée sur `type`.
 * La première nuit, c'est `nuit` avec `numero: 1`.
 * `etape` = position dans l'ordre de réveil (voir nuit.ts).
 */
export type Phase =
  | { type: 'nuit'; numero: number; etape: number }
  | { type: 'jour'; numero: number }
  /** gagnants = null : tout le monde est mort, personne ne gagne. */
  | { type: 'fin'; gagnants: Camp | null };

/**
 * Choix que le MJ doit faire suite à une mort, avant de continuer la partie.
 * Elles sont traitées dans l'ordre (file d'attente).
 */
export type Decision =
  | { type: 'usurpateur'; usurpateur: JoueurId; mort: JoueurId }
  | { type: 'main-noire'; tireur: JoueurId }
  | { type: 'alpha-successeur'; ancien: JoueurId };

export interface EtatPartie {
  /** Identifiant du plan de salle utilisé. */
  planId: string;
  joueurs: Joueur[];
  phase: Phase;
  /** Joueur qui porte l'Alpha (vote compté double), s'il y en a un. */
  alpha: JoueurId | null;
  /** Victime désignée par les Spectres pendant la nuit en cours. */
  victimeSpectres: JoueurId | null;
  /** La Sainte a utilisé sa potion de guérison cette nuit. */
  sauveeParSainte: boolean;
  /** Joueur empoisonné par la Vipère cette nuit. */
  empoisonne: JoueurId | null;
  /** Choix en attente suite à des morts (prioritaires sur tout le reste). */
  decisions: Decision[];
  /** Info à transmettre en secret par le MJ (résultat de l'Oracle, de l'Instinct…). */
  infoMJ: string | null;
}

/** Ce que le MJ doit faire maintenant. Renvoyé par `etapeSuivante(etat)`. */
export type Etape =
  | {
      type: 'reveil';
      role: RoleId;
      /** Joueurs de ce rôle qui peuvent agir (vivants, pas occupés, pouvoir dispo). */
      acteurs: JoueurId[];
      /** Joueurs qu'ils ont le droit de viser. */
      ciblesPossibles: JoueurId[];
    }
  /** Fin de nuit : le MJ voit qui meurt, puis valide avec `passer`. */
  | { type: 'resolution-nuit'; numero: number; morts: JoueurId[] }
  /** Un choix lié à une mort (Usurpateur, Main Noire, successeur de l'Alpha). */
  | { type: 'decision'; decision: Decision; ciblesPossibles: JoueurId[] }
  | { type: 'election-alpha'; numero: number; candidats: JoueurId[] }
  | { type: 'vote'; numero: number; votants: JoueurId[]; ciblesPossibles: JoueurId[]; alpha: JoueurId }
  | { type: 'fin'; gagnants: Camp | null };

/**
 * Ce que le MJ peut faire. Union discriminée sur `type` :
 * `appliquer(etat, action)` fera un `switch (action.type)`.
 * Liste de départ, à compléter avec nuit.ts / vote.ts / mort.ts.
 */
export type Action =
  // Nuit
  | { type: 'courtisane-occuper'; cible: JoueurId }
  | { type: 'protecteur-proteger'; cible: JoueurId }
  | { type: 'oracle-voir'; cible: JoueurId }
  | { type: 'instinct-designer'; cibles: [JoueurId, JoueurId, JoueurId] }
  | { type: 'spectres-attaquer'; cible: JoueurId | null }
  | { type: 'sainte-sauver'; utiliser: boolean }
  | { type: 'vipere-empoisonner'; cible: JoueurId | null }
  // Première nuit
  | { type: 'anatheme-choisir-modele'; cible: JoueurId }
  | { type: 'adepte-choisir-mentor'; cible: JoueurId }
  // Jour
  | { type: 'elire-alpha'; cible: JoueurId }
  | { type: 'vote'; votes: Record<JoueurId, JoueurId | null> }
  /** Vote rapide : le MJ désigne directement le joueur éliminé, sans saisir chaque voix. */
  | { type: 'eliminer'; cible: JoueurId }
  // Effets à la mort
  | { type: 'main-noire-tirer'; cible: JoueurId }
  | { type: 'alpha-successeur'; cible: JoueurId }
  | { type: 'usurpateur-remplacer'; cible: JoueurId | null }
  // Général : ne rien faire, ou valider l'étape (ex. résolution de la nuit)
  | { type: 'passer' };
