// Outils partagés par les tests (ce n'est pas un fichier de test).
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
