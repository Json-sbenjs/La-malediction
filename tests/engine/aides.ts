// Outils partagés par les tests (ce n'est pas un fichier de test).
import { appliquer, creerPartie, etapeSuivante, type Action, type EtatPartie } from '../../src/engine';
import type { Plan } from '../../src/engine/plans';
import type { RoleId } from '../../src/engine/types';

/** Fabrique un plan de test à partir d'une liste de rôles (siège 1, 2, 3…). */
export function planDeTest(roles: RoleId[], salle = 'Test'): Plan {
  return {
    id: `${salle}-${roles.length}`,
    salle,
    nbJoueurs: roles.length,
    sieges: roles.map((role, i) => ({ numero: i + 1, role, position: { x: 50, y: 50 } })),
  };
}

/**
 * Plan de 10 joueurs avec tous les rôles de nuit de la semaine 2.
 * Siège : 1 Courtisane, 2 Protecteur, 3 Oracle, 4 Instinct, 5-6 Spectres, 7-10 Pèlerins.
 */
export const PLAN_NUIT = planDeTest([
  'courtisane', 'protecteur', 'oracle', 'instinct', 'spectre',
  'spectre', 'pelerin', 'pelerin', 'pelerin', 'pelerin',
]);

/**
 * Plan de 12 joueurs pour les tests de la semaine 3.
 * 1 Courtisane, 2 Protecteur, 3 Oracle, 4 Instinct, 5-6 Spectres,
 * 7 Sainte, 8 Vipère, 9 Main Noire, 10-12 Pèlerins.
 */
export const PLAN_COMPLET = planDeTest([
  'courtisane', 'protecteur', 'oracle', 'instinct', 'spectre', 'spectre',
  'sainte', 'vipere', 'main-noire', 'pelerin', 'pelerin', 'pelerin',
]);

/**
 * Joue toutes les étapes de réveil de la nuit en cours.
 * Chaque rôle fait l'action donnée, ou « passer » s'il n'y en a pas.
 * S'arrête sur l'étape de résolution, sans la valider.
 */
export function jouerNuit(etat: EtatPartie, actions: Partial<Record<RoleId, Action>> = {}): EtatPartie {
  let suivant = etat;
  for (;;) {
    const etape = etapeSuivante(suivant);
    if (etape.type !== 'reveil') return suivant;
    suivant = appliquer(suivant, actions[etape.role] ?? { type: 'passer' });
  }
}

/** Comme jouerNuit, mais s'arrête quand c'est au tour de `role`. */
export function jouerJusquA(etat: EtatPartie, role: RoleId, actions: Partial<Record<RoleId, Action>> = {}): EtatPartie {
  let suivant = etat;
  for (;;) {
    const etape = etapeSuivante(suivant);
    if (etape.type !== 'reveil' || etape.role === role) return suivant;
    suivant = appliquer(suivant, actions[etape.role] ?? { type: 'passer' });
  }
}

/** Joue la nuit puis valide la résolution : on arrive au jour. */
export function finirNuit(etat: EtatPartie, actions: Partial<Record<RoleId, Action>> = {}): EtatPartie {
  return appliquer(jouerNuit(etat, actions), { type: 'passer' });
}

/** Choix faits pendant la nuit d'explication (par défaut : le premier joueur possible). */
export interface Depart {
  modele?: number;
  mentor?: number;
  /** Alpha élu au jour 0 ; sans valeur, l'élection est repoussée au premier jour. */
  alpha?: number;
}

/** Joue la nuit d'explication et le jour 0 : on arrive au début de la nuit 1. */
export function demarrer(etat: EtatPartie, depart: Depart = {}): EtatPartie {
  let suivant = etat;
  while (suivant.phase.type === 'explication') {
    const etape = etapeSuivante(suivant);
    if (etape.type === 'reveil' && etape.role === 'anatheme') {
      suivant = appliquer(suivant, { type: 'anatheme-choisir-modele', cible: depart.modele ?? etape.ciblesPossibles[0] });
    } else if (etape.type === 'reveil' && etape.role === 'adepte') {
      suivant = appliquer(suivant, { type: 'adepte-choisir-mentor', cible: depart.mentor ?? etape.ciblesPossibles[0] });
    } else {
      suivant = appliquer(suivant, { type: 'passer' });
    }
  }
  if (suivant.phase.type === 'jour' && suivant.phase.numero === 0) {
    suivant = appliquer(suivant, depart.alpha ? { type: 'elire-alpha', cible: depart.alpha } : { type: 'passer' });
  }
  return suivant;
}

/** Une partie prête à jouer : créée, nuit d'explication faite, au début de la nuit 1. */
export function nouvellePartie(plan: Plan, prenoms?: (string | null)[], depart: Depart = {}): EtatPartie {
  return demarrer(creerPartie(plan, prenoms), depart);
}
