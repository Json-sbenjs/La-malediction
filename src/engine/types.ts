// Types du moteur de jeu. Aucune dépendance au navigateur ou à Node :
// le même code tourne dans le terminal (CLI) et sur tablette (PWA).

export type CampId = string;
export type RoleId = string;
export type PlayerId = number;

export interface Camp {
  id: CampId;
  name: string;
  /**
   * Comment ce camp gagne :
   * - "eliminate-hostiles" : il ne reste plus aucun joueur d'un camp hostile
   * - "parity"             : ses membres vivants sont au moins aussi nombreux que les autres
   * - "last-standing"      : il est le seul joueur encore en vie
   */
  victory: "eliminate-hostiles" | "parity" | "last-standing";
  /** Camps dont la présence empêche la victoire "eliminate-hostiles". */
  hostiles?: CampId[];
}

/**
 * Effets connus du moteur. Un rôle maison combine ces briques.
 * - kill    : la cible meurt à la fin de la nuit (ou tout de suite hors nuit)
 * - protect : la cible ne peut pas mourir cette nuit (sauf poison "unstoppable")
 * - heal    : sauve une victime de la nuit déjà désignée
 * - inspect : le MJ voit le rôle de la cible (à montrer au joueur)
 * - link    : lie les cibles (amoureux) : si l'une meurt, l'autre aussi
 * - mark    : effet géré à la main par le MJ, simplement noté dans l'historique
 */
export type EffectKind = "kill" | "protect" | "heal" | "inspect" | "link" | "mark";

export type TargetRule =
  | "any-alive" // n'importe quel joueur vivant
  | "not-self" // n'importe quel joueur vivant sauf soi
  | "night-victims" // uniquement les victimes prévues cette nuit
  | "other-camp"; // joueurs vivants qui ne sont pas du même camp

export interface Ability {
  id: string;
  label: string;
  effect: EffectKind;
  /** Nombre de cibles à choisir. */
  targets: number;
  targetRule: TargetRule;
  /** Nombre d'utilisations par partie (absent = illimité). */
  uses?: number;
  /** Le MJ peut passer sans utiliser le pouvoir. */
  optional: boolean;
  /** Interdit de choisir la même cible que la fois précédente (ex. protecteur). */
  noRepeatTarget?: boolean;
  /** Pour "kill" : ignore les protections et les soins. */
  unstoppable?: boolean;
  /** Texte libre noté dans l'historique pour l'effet "mark". */
  note?: string;
}

export type Frequency = "every-night" | "first-night" | "even-nights" | "odd-nights";

export interface RoleDefinition {
  id: RoleId;
  name: string;
  camp: CampId;
  description: string;
  /** Réveil individuel la nuit. Absent = ne se réveille pas seul. */
  wake?: {
    order: number;
    frequency: Frequency;
    abilities: Ability[];
  };
  /** Pouvoir déclenché quand le joueur meurt (ex. chasseur). */
  onDeath?: Ability;
  /**
   * Poids pour l'équilibrage : positif = aide les pèlerins, négatif = aide les spectres.
   * Un pèlerin simple vaut 1, un spectre environ -6.
   */
  power: number;
  /** Nombre minimum de joueurs pour proposer ce rôle. */
  minPlayers?: number;
  /** Nombre maximum d'exemplaires dans une partie (défaut 1, sauf rôles "de base"). */
  max?: number;
  /** Ordre de priorité pour la recommandation (plus petit = ajouté en premier). */
  priority?: number;
}

/** Réveil collectif : tous les joueurs vivants d'un camp agissent ensemble. */
export interface GroupWake {
  id: string;
  label: string;
  camp: CampId;
  order: number;
  frequency: Frequency;
  abilities: Ability[];
}

export interface RuleSet {
  name: string;
  camps: Camp[];
  roles: RoleDefinition[];
  groupWakes: GroupWake[];
  /** Rôle de base du village utilisé pour compléter la composition. */
  fillerRole: RoleId;
  /** Rôle de base du camp adverse (spectre simple). */
  hostileRole: RoleId;
  minPlayers: number;
  maxPlayers: number;
}

export interface Player {
  id: PlayerId;
  name: string;
  role: RoleId;
  alive: boolean;
  /** Utilisations restantes par capacité (clé = id de capacité). */
  usesLeft: Record<string, number>;
  /** Dernière cible par capacité (pour noRepeatTarget). */
  lastTargets: Record<string, PlayerId[]>;
}

export type Phase = "night" | "day" | "over";

export interface HistoryEntry {
  turn: number;
  phase: Phase;
  text: string;
}

export type DeathCause = "spectres" | "kill" | "vote" | "link" | "death-ability" | "mj";

export interface PendingKill {
  target: PlayerId;
  cause: DeathCause;
  source: string;
  unstoppable: boolean;
}

/** Un réveil à traiter pendant la nuit : un rôle individuel ou un groupe. */
export interface WakeSlot {
  key: string; // "role:<id>" ou "group:<id>"
  order: number;
}

export interface GameState {
  rulesName: string;
  players: Player[];
  turn: number;
  phase: Phase;
  /** Réveils restants cette nuit. */
  nightQueue: WakeSlot[];
  pendingKills: PendingKill[];
  protectedIds: PlayerId[];
  /** Joueurs liés (amoureux), par paires. */
  links: [PlayerId, PlayerId][];
  /** Morts dont le pouvoir "onDeath" n'a pas encore été résolu. */
  deathTriggers: PlayerId[];
  /** Morts annoncés au lever du jour. */
  lastNightDeaths: PlayerId[];
  /** Info à montrer au MJ avant de continuer (ex. résultat d'une inspection). */
  info?: string;
  /** Faut-il annoncer les morts de la nuit avant le vote ? */
  dawnPending: boolean;
  winner?: { camp: CampId | "lovers" | "none"; text: string };
  history: HistoryEntry[];
}

// ---- Étapes exposées aux interfaces (CLI / web) ----

export interface Candidate {
  id: PlayerId;
  name: string;
}

export type Step =
  | { kind: "info"; title: string; message: string }
  | {
      kind: "night-wake";
      title: string;
      /** Joueurs concernés (pour que le MJ sache qui réveiller). */
      actors: Candidate[];
      abilities: { ability: Ability; candidates: Candidate[]; usesLeft?: number }[];
    }
  | { kind: "dawn"; title: string; deaths: Candidate[] }
  | { kind: "death-ability"; title: string; actor: Candidate; ability: Ability; candidates: Candidate[] }
  | { kind: "day-vote"; title: string; candidates: Candidate[] }
  | { kind: "game-over"; title: string; message: string };

/** Réponse du MJ à une étape "night-wake" : cibles choisies par capacité (absent = passer). */
export type WakeInput = Record<string, PlayerId[]>;

export type StepInput =
  | { kind: "ack" }
  | { kind: "night-wake"; choices: WakeInput }
  | { kind: "death-ability"; targets: PlayerId[] }
  | { kind: "day-vote"; eliminated: PlayerId | null };
