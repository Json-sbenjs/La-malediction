import type { Camp, RoleId } from './types';

/** Quand un rôle est appelé la nuit. Union discriminée sur `type`. */
export type Reveil =
  | { type: 'jamais' }
  | { type: 'premiere-nuit'; rang: number }
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
}

/**
 * Registre des rôles présents sur les plans de salle.
 * Les rangs de réveil sont une PROPOSITION : à vérifier avec la section
 * « Nuit Type » du diagramme de flux dans le FigJam.
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
    reveil: { type: 'premiere-nuit', rang: 20 },
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
    reveil: { type: 'premiere-nuit', rang: 30 },
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
    reveil: { type: 'premiere-nuit', rang: 10 },
    usageUnique: false,
    description:
      "Les 3 membres se reconnaissent la première nuit. Tant qu'ils sont 3 en vie, ils gagnent uniquement entre eux. Dès qu'un membre meurt, ils basculent chez les Pèlerins.",
  },
};

export function getRole(id: RoleId): RoleDef {
  return ROLES[id];
}

/**
 * Rôles appelés à une nuit, triés par rang de réveil.
 * Première nuit : d'abord les rôles « première nuit » (reconnaissances,
 * modèle, mentor), puis la nuit normale.
 * Le filtre « si en vie / si occupé » se fera dans nuit.ts, avec l'état.
 */
export function rolesQuiSeReveillent(premiereNuit: boolean): RoleDef[] {
  const tous = Object.values(ROLES);
  const parRang = (type: Reveil['type']) =>
    tous
      .filter((r) => r.reveil.type === type)
      .sort((a, b) => rang(a) - rang(b));

  const chaqueNuit = parRang('chaque-nuit');
  return premiereNuit ? [...parRang('premiere-nuit'), ...chaqueNuit] : chaqueNuit;
}

function rang(role: RoleDef): number {
  return role.reveil.type === 'jamais' ? Infinity : role.reveil.rang;
}
