import type { RoleId, RuleSet } from "./types.js";

export type Composition = Record<RoleId, number>;

export interface Recommendation {
  composition: Composition;
  balance: number;
  verdict: string;
}

/** Écart de puissance toléré autour de 0 lors de l'ajout des rôles spéciaux. */
const TOLERANCE = 4;

export function hostileCount(players: number): number {
  return Math.max(1, Math.round(players / 4.2));
}

export function balanceOf(rules: RuleSet, composition: Composition): number {
  let total = 0;
  for (const [roleId, count] of Object.entries(composition)) {
    total += (findRole(rules, roleId)?.power ?? 0) * count;
  }
  return total;
}

export function verdictFor(balance: number): string {
  if (balance < -8) return "Très favorable aux spectres";
  if (balance < -TOLERANCE) return "Avantage spectres";
  if (balance <= TOLERANCE) return "Équilibré";
  if (balance <= 8) return "Avantage pèlerins";
  return "Très favorable aux pèlerins";
}

/**
 * Propose une composition pour `players` joueurs.
 * `enabled` limite les rôles spéciaux autorisés (par défaut : tous).
 */
export function recommend(rules: RuleSet, players: number, enabled?: RoleId[]): Recommendation {
  const filler = findRole(rules, rules.fillerRole)!;
  const hostiles = hostileCount(players);
  const composition: Composition = { [rules.hostileRole]: hostiles };
  let balance = balanceOf(rules, composition) + filler.power * (players - hostiles);
  let used = hostiles;

  const specials = rules.roles
    .filter((r) => r.priority !== undefined && r.id !== rules.fillerRole && r.id !== rules.hostileRole)
    .filter((r) => (r.minPlayers ?? 0) <= players)
    .filter((r) => !enabled || enabled.includes(r.id))
    .sort((a, b) => a.priority! - b.priority!);

  for (const role of specials) {
    if (used >= players) break;
    const next = balance + role.power - filler.power;
    if (Math.abs(next) > TOLERANCE && Math.abs(next) >= Math.abs(balance)) continue;
    composition[role.id] = 1;
    balance = next;
    used++;
  }

  if (players > used) composition[rules.fillerRole] = players - used;
  return { composition, balance, verdict: verdictFor(balance) };
}

/** Vérifie une composition modifiée à la main par le MJ. Renvoie la liste des problèmes. */
export function checkComposition(rules: RuleSet, composition: Composition, players: number): string[] {
  const problems: string[] = [];
  const total = Object.values(composition).reduce((a, b) => a + b, 0);
  if (total !== players) problems.push(`La composition compte ${total} rôles pour ${players} joueurs.`);
  if (players < rules.minPlayers || players > rules.maxPlayers) {
    problems.push(`Le jeu se joue de ${rules.minPlayers} à ${rules.maxPlayers} joueurs.`);
  }
  for (const [roleId, count] of Object.entries(composition)) {
    const role = findRole(rules, roleId);
    if (!role) {
      problems.push(`Rôle inconnu : ${roleId}.`);
      continue;
    }
    if (count > (role.max ?? 1)) problems.push(`${role.name} : ${role.max ?? 1} exemplaire(s) maximum.`);
  }
  const campsPresent = new Set(
    Object.entries(composition)
      .filter(([, n]) => n > 0)
      .map(([id]) => findRole(rules, id)?.camp),
  );
  const filler = findRole(rules, rules.fillerRole)!;
  const hostile = findRole(rules, rules.hostileRole)!;
  if (!campsPresent.has(hostile.camp)) problems.push("Il faut au moins un spectre.");
  if (!campsPresent.has(filler.camp)) problems.push("Il faut au moins un pèlerin.");
  return problems;
}

function findRole(rules: RuleSet, id: RoleId) {
  return rules.roles.find((r) => r.id === id);
}
