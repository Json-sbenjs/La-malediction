import { ROLES } from './roles';
import type { RoleId } from './types';

export const MIN_JOUEURS = 8;
export const MAX_JOUEURS = 25;

/** Un siège de la salle. Le rôle est lié au siège, pas au joueur. */
export interface Siege {
  /** Numéro du siège, de 1 à nbJoueurs. Sert d'identifiant au joueur. */
  numero: number;
  role: RoleId;
  /** Position sur le plan cliquable, en % de la largeur / hauteur (0 à 100). */
  position: { x: number; y: number };
}

/** Plan préparé à l'avance : une salle + un nombre de joueurs. */
export interface Plan {
  id: string;
  /** Nom de la salle (ex. « Malédiction », « Clown »). */
  salle: string;
  nbJoueurs: number;
  sieges: Siege[];
}

/**
 * Les plans de salle réellement utilisés.
 * À REMPLIR par Benj (tâche S1–S2) : un plan par salle et par nombre de joueurs.
 */
export const PLANS: Plan[] = [];

export function plansPourSalle(salle: string, plans: Plan[] = PLANS): Plan[] {
  return plans.filter((p) => p.salle === salle);
}

export function trouverPlan(salle: string, nbJoueurs: number, plans: Plan[] = PLANS): Plan | undefined {
  return plans.find((p) => p.salle === salle && p.nbJoueurs === nbJoueurs);
}

/** Nombre de sièges par rôle sur un plan. */
export function compterRoles(plan: Plan): Partial<Record<RoleId, number>> {
  const compte: Partial<Record<RoleId, number>> = {};
  for (const siege of plan.sieges) {
    compte[siege.role] = (compte[siege.role] ?? 0) + 1;
  }
  return compte;
}

/** Vérifie qu'un plan est jouable. Renvoie la liste des erreurs (vide = OK). */
export function validerPlan(plan: Plan): string[] {
  const erreurs: string[] = [];

  if (plan.nbJoueurs < MIN_JOUEURS || plan.nbJoueurs > MAX_JOUEURS) {
    erreurs.push(`nbJoueurs doit être entre ${MIN_JOUEURS} et ${MAX_JOUEURS} (reçu ${plan.nbJoueurs})`);
  }
  if (plan.sieges.length !== plan.nbJoueurs) {
    erreurs.push(`${plan.sieges.length} sièges pour ${plan.nbJoueurs} joueurs`);
  }

  const numeros = plan.sieges.map((s) => s.numero).sort((a, b) => a - b);
  const attendus = plan.sieges.map((_, i) => i + 1);
  if (numeros.join(',') !== attendus.join(',')) {
    erreurs.push('les sièges doivent être numérotés de 1 à nbJoueurs, sans doublon');
  }

  for (const siege of plan.sieges) {
    const { x, y } = siege.position;
    if (x < 0 || x > 100 || y < 0 || y > 100) {
      erreurs.push(`siège ${siege.numero} : position hors du plan`);
    }
  }

  const compte = compterRoles(plan);
  for (const [role, nb] of Object.entries(compte) as [RoleId, number][]) {
    const max = ROLES[role].cartes;
    if (nb > max) {
      erreurs.push(`${ROLES[role].nom} : ${nb} sièges mais seulement ${max} carte(s)`);
    }
  }
  if (!compte.spectre) {
    erreurs.push('il faut au moins un Spectre');
  }
  if (compte.trinite !== undefined && compte.trinite !== ROLES.trinite.cartes) {
    erreurs.push(`la Trinité doit avoir ${ROLES.trinite.cartes} membres`);
  }

  return erreurs;
}
