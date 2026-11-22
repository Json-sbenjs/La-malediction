import { PLANS, validerPlan, type Plan } from './plans';
import { ROLES } from './roles';
import type { EtatPartie, Joueur } from './types';

/** Salles pour lesquelles au moins un plan existe (écran « choix du plan »). */
export function sallesDisponibles(plans: Plan[] = PLANS): string[] {
  return [...new Set(plans.map((p) => p.salle))];
}

/** Nombres de joueurs prévus pour une salle, du plus petit au plus grand. */
export function nombresDeJoueurs(salle: string, plans: Plan[] = PLANS): number[] {
  return plans
    .filter((p) => p.salle === salle)
    .map((p) => p.nbJoueurs)
    .sort((a, b) => a - b);
}

/** Le MJ choisit la salle + le nombre de joueurs → on charge le plan. */
export function choisirPlan(salle: string, nbJoueurs: number, plans: Plan[] = PLANS): Plan {
  const plan = plans.find((p) => p.salle === salle && p.nbJoueurs === nbJoueurs);
  if (!plan) {
    throw new Error(`Aucun plan pour la salle « ${salle} » à ${nbJoueurs} joueurs`);
  }
  return plan;
}

/**
 * Crée la partie à partir d'un plan : un joueur par siège, le rôle vient du siège.
 * `prenoms` est facultatif : prenoms[0] = siège 1, etc. (null = pas de prénom).
 * La partie démarre à la première nuit.
 */
export function creerPartie(plan: Plan, prenoms: (string | null)[] = []): EtatPartie {
  const erreurs = validerPlan(plan);
  if (erreurs.length > 0) {
    throw new Error(`Plan « ${plan.id} » invalide : ${erreurs.join(' ; ')}`);
  }
  if (prenoms.length > plan.nbJoueurs) {
    throw new Error(`${prenoms.length} prénoms pour ${plan.nbJoueurs} joueurs`);
  }

  const joueurs: Joueur[] = [...plan.sieges]
    .sort((a, b) => a.numero - b.numero)
    .map((siege) => ({
      id: siege.numero,
      nom: prenoms[siege.numero - 1]?.trim() || null,
      role: siege.role,
      camp: ROLES[siege.role].camp,
      vivant: true,
      revele: false,
      statuts: { occupe: false, protege: false },
      memoire: { pouvoirUtilise: false, pouvoirPerdu: false, derniereCible: null, lien: null },
    }));

  // Si l'Alpha est une carte posée sur un siège, son porteur l'est d'office.
  // Sinon, le village l'élira le premier jour.
  const porteurAlpha = joueurs.find((j) => j.role === 'alpha');

  return {
    planId: plan.id,
    joueurs,
    phase: { type: 'nuit', numero: 1, etape: 0 },
    alpha: porteurAlpha?.id ?? null,
    victimeSpectres: null,
    sauveeParSainte: false,
    empoisonne: null,
    decisions: [],
    infoMJ: null,
  };
}
