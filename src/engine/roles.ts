import type { Camp, RoleId } from './types';

/** Quand un rôle est appelé la nuit. Union discriminée sur `type`. */
export type Reveil =
  | { type: 'jamais' }
  /** Nuit d'explication seulement : reconnaissances et choix (modèle, mentor). */
  | { type: 'explication'; rang: number }
  | { type: 'chaque-nuit'; rang: number };

export interface RoleDef {
  id: RoleId;
  nom: string;
  /** Camp au début de la partie. */
  camp: Camp;
  /** Le camp peut changer en cours de partie (Anathème, Adepte, Trinité). */
  campVariable: boolean;
  /** Nombre de cartes dans la boîte (planche des cartes). */
  cartes: number;
  reveil: Reveil;
  /** Pouvoir utilisable une seule fois dans la partie. */
  usageUnique: boolean;
  description: string;
  /** Rôle créé en cours de partie, jamais posé sur un siège (le Revenant). */
  jamaisDistribue?: true;
}

/**
 * Registre des 28 rôles du jeu.
 * Les rangs de réveil sont une PROPOSITION : à vérifier avec la section
 * « Nuit Type » du diagramme de flux dans le FigJam.
 * Ordre d'une nuit : Courtisane 10, Protecteur 20, Oracle 30, Médium 33, Inquisiteur 36,
 * Instinct 40, Enchanteur 45, Spectres 50, Originel 52, Maudit 55, Sainte 60, Vipère 70,
 * Sectaire 80, Envoûteur 85, Nécromancien 90.
 * Nuit d'explication (avant la partie) : Spectres (reconnaissance), Doubles 10, Trinité 12,
 * Anathème 20, Adepte 30.
 */
export const ROLES: Record<RoleId, RoleDef> = {
  spectre: {
    id: 'spectre',
    nom: 'Spectre',
    camp: 'spectres',
    campVariable: false,
    cartes: 4,
    reveil: { type: 'chaque-nuit', rang: 50 },
    usageUnique: false,
    description: 'Se réveille chaque nuit avec les autres Spectres pour dévorer un Pèlerin.',
  },
  pelerin: {
    id: 'pelerin',
    nom: 'Pèlerin',
    camp: 'pelerins',
    campVariable: false,
    cartes: 6,
    reveil: { type: 'jamais' },
    usageUnique: false,
    description: 'Habitant ordinaire, sans pouvoir. Vote chaque jour pour éliminer un suspect.',
  },
  oracle: {
    id: 'oracle',
    nom: "L'Oracle",
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'chaque-nuit', rang: 30 },
    usageUnique: false,
    description: "Chaque nuit, découvre la véritable identité d'un joueur de son choix.",
  },
  protecteur: {
    id: 'protecteur',
    nom: 'Le Protecteur',
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'chaque-nuit', rang: 20 },
    usageUnique: false,
    description:
      "Chaque nuit, protège un joueur de l'attaque des Spectres (pas deux nuits de suite la même personne).",
  },
  courtisane: {
    id: 'courtisane',
    nom: 'La Courtisane',
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'chaque-nuit', rang: 10 },
    usageUnique: false,
    description:
      "Appelée parmi les premiers, « occupe » un joueur : il ne se réveille pas et n'utilise pas son pouvoir cette nuit. Un Spectre occupé ne participe pas à l'attaque. Pas deux nuits de suite la même personne.",
  },
  instinct: {
    id: 'instinct',
    nom: "L'Instinct",
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'chaque-nuit', rang: 40 },
    usageUnique: false,
    description:
      "Chaque nuit, désigne 3 joueurs. Si l'un d'eux est Spectre, il garde son pouvoir ; sinon il le perd définitivement.",
  },
  sainte: {
    id: 'sainte',
    nom: 'La Sainte',
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'chaque-nuit', rang: 60 },
    usageUnique: true,
    description: 'Possède UNE potion de guérison (sauve la victime des Spectres). Une seule fois dans la partie.',
  },
  vipere: {
    id: 'vipere',
    nom: 'La Vipère',
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'chaque-nuit', rang: 70 },
    usageUnique: true,
    description: 'Possède UNE potion de mort (empoisonne un joueur de son choix). Une seule fois dans la partie.',
  },
  'main-noire': {
    id: 'main-noire',
    nom: 'La Main Noire',
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'jamais' },
    usageUnique: false,
    description: 'À sa mort, élimine immédiatement un autre joueur de son choix.',
  },
  anatheme: {
    id: 'anatheme',
    nom: "L'Anathème",
    camp: 'pelerins',
    campVariable: true,
    cartes: 1,
    reveil: { type: 'explication', rang: 20 },
    usageUnique: false,
    description:
      'Choisit un modèle au début de la partie. Si le modèle meurt, il bascule dans le camp des Spectres. Sinon, il joue avec les Pèlerins.',
  },
  adepte: {
    id: 'adepte',
    nom: "L'Adepte",
    camp: 'pelerins',
    campVariable: true,
    cartes: 1,
    reveil: { type: 'explication', rang: 30 },
    usageUnique: false,
    description:
      'Désigne secrètement un mentor. À sa mort, hérite de son rôle avec tous les pouvoirs réinitialisés (sans la mémoire). Si le mentor est Spectre, bascule chez les Spectres.',
  },
  usurpateur: {
    id: 'usurpateur',
    nom: "L'Usurpateur",
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'jamais' },
    usageUnique: true,
    description: "Avant qu'un rôle dévoilé ne meure, peut prendre sa place et son rôle.",
  },
  alpha: {
    id: 'alpha',
    nom: "L'Alpha",
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'jamais' },
    usageUnique: false,
    description: 'Élu par le village. Son vote compte double. À sa mort, il désigne son successeur.',
  },
  trinite: {
    id: 'trinite',
    nom: 'La Trinité',
    camp: 'trinite',
    campVariable: true,
    cartes: 3,
    reveil: { type: 'explication', rang: 12 },
    usageUnique: false,
    description:
      "Les 3 membres se reconnaissent pendant la nuit d'explication. Tant qu'ils sont 3 en vie, ils gagnent uniquement entre eux. Dès qu'un membre meurt, ils basculent chez les Pèlerins.",
  },
  devoue: {
    id: 'devoue',
    nom: 'Le Dévoué',
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'jamais' },
    usageUnique: false,
    description: "Pèlerin sans pouvoir, mais sa carte est révélée à tous dès le début : un point de confiance pour le village.",
  },
  augure: {
    id: 'augure',
    nom: "L'Augure",
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'jamais' },
    usageUnique: false,
    description: "Peut espionner les Spectres pendant la nuit, mais risque d'être repéré et tué.",
  },
  inquisiteur: {
    id: 'inquisiteur',
    nom: "L'Inquisiteur",
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'chaque-nuit', rang: 36 },
    usageUnique: false,
    description:
      'Chaque nuit, marque secrètement un joueur : le lendemain, ce joueur démarre le vote avec une voix déjà contre lui.',
  },
  medium: {
    id: 'medium',
    nom: 'Le Médium',
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'chaque-nuit', rang: 33 },
    usageUnique: false,
    description:
      'Chaque nuit, en silence, pointe un mort puis un vivant. Le mort répond par un mime sur le vivant désigné.',
  },
  enchanteur: {
    id: 'enchanteur',
    nom: "L'Enchanteur",
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'chaque-nuit', rang: 45 },
    usageUnique: true,
    description:
      'Une fois dans la partie, endort les Spectres : ils ne se réveillent pas et ne tuent personne cette nuit-là.',
  },
  originel: {
    id: 'originel',
    nom: "L'Originel",
    camp: 'spectres',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'chaque-nuit', rang: 52 },
    usageUnique: true,
    description:
      'Spectre. Une fois par partie, transforme la victime des Spectres en nouveau Spectre au lieu de la tuer.',
  },
  maudit: {
    id: 'maudit',
    nom: 'Le Maudit',
    camp: 'maudit',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'chaque-nuit', rang: 55 },
    usageUnique: false,
    description:
      'Se réveille avec les Spectres. Une nuit sur deux, peut éliminer un Spectre. Gagne seul s\'il est le dernier survivant.',
  },
  sacrifie: {
    id: 'sacrifie',
    nom: 'Le Sacrifié',
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'jamais' },
    usageUnique: true,
    description: 'Après le vote, peut se manifester et mourir à la place du condamné, en révélant son rôle.',
  },
  bourreau: {
    id: 'bourreau',
    nom: 'Le Bourreau',
    camp: 'pelerins',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'jamais' },
    usageUnique: true,
    description: 'Une fois dans la partie, déclenche un second vote le même jour, par un signe convenu avec le MJ.',
  },
  doubles: {
    id: 'doubles',
    nom: 'Les Doubles',
    camp: 'doubles',
    campVariable: true,
    cartes: 2,
    reveil: { type: 'explication', rang: 10 },
    usageUnique: false,
    description:
      "Les 2 Doubles se reconnaissent pendant la nuit d'explication et gagnent seules tant qu'elles sont 2. Dès qu'une meurt, la survivante passe chez les Pèlerins.",
  },
  sectaire: {
    id: 'sectaire',
    nom: 'Le Sectaire',
    camp: 'sectaire',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'chaque-nuit', rang: 80 },
    usageUnique: false,
    description:
      'Chaque nuit, enrôle un joueur, qui ne peut plus le viser et doit voter comme lui. Gagne seul quand tous les vivants sont enrôlés.',
  },
  envouteur: {
    id: 'envouteur',
    nom: "L'Envoûteur",
    camp: 'envouteur',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'chaque-nuit', rang: 85 },
    usageUnique: false,
    description: 'Chaque nuit, charme 2 joueurs. Gagne seul quand tous les vivants sont charmés.',
  },
  necromancien: {
    id: 'necromancien',
    nom: 'Le Nécromancien',
    camp: 'necromancien',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'chaque-nuit', rang: 90 },
    usageUnique: true,
    description:
      'Une seule fois, ressuscite un mort en Revenant. Gagne seul, ou avec son Revenant si les deux sont en vie à la fin.',
  },
  revenant: {
    id: 'revenant',
    nom: 'Le Revenant',
    camp: 'necromancien',
    campVariable: false,
    cartes: 1,
    reveil: { type: 'jamais' },
    usageUnique: false,
    description:
      'Mort ressuscité par le Nécromancien : revient publiquement, sans pouvoir, avec un seul but : faire gagner le Nécromancien.',
    jamaisDistribue: true,
  },
};
export function getRole(id: RoleId): RoleDef {
  return ROLES[id];
}

/** Rôles appelés chaque nuit de la partie, triés par rang de réveil. */
export function rolesDeLaNuit(): RoleDef[] {
  return parRang('chaque-nuit');
}

/**
 * Rôles appelés pendant la nuit d'explication, triés par rang.
 * (Les Spectres s'y reconnaissent aussi : voir premiere-nuit.ts.)
 */
export function rolesDeLExplication(): RoleDef[] {
  return parRang('explication');
}

function parRang(type: 'chaque-nuit' | 'explication'): RoleDef[] {
  return Object.values(ROLES)
    .filter((r) => r.reveil.type === type)
    .sort((a, b) => rang(a) - rang(b));
}

function rang(role: RoleDef): number {
  return role.reveil.type === 'jamais' ? Infinity : role.reveil.rang;
}
