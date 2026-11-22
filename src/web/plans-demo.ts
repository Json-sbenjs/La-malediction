// Plans de DÉMONSTRATION, pour tester l'interface tant que les vrais plans
// ne sont pas saisis (le générateur de salle sur mesure arrive en semaine 5).
import { disposer } from '../engine/generateur';
import type { Plan, RoleId } from '../engine';

/** Tour de table, avec la même disposition que le générateur de salle. */
function enOvale(id: string, roles: RoleId[]): Plan {
  const positions = disposer('ovale', roles.length);
  return {
    id,
    salle: 'Démo',
    nbJoueurs: roles.length,
    sieges: roles.map((role, i) => ({ numero: i + 1, role, position: positions[i] })),
  };
}

export const PLANS_DEMO: Plan[] = [
  enOvale('demo-8', ['spectre', 'oracle', 'pelerin', 'protecteur', 'spectre', 'sainte', 'pelerin', 'pelerin']),
  enOvale('demo-10', [
    'courtisane', 'spectre', 'oracle', 'pelerin', 'instinct',
    'protecteur', 'spectre', 'sainte', 'vipere', 'pelerin',
  ]),
  enOvale('demo-12', [
    'courtisane', 'spectre', 'protecteur', 'pelerin', 'oracle', 'main-noire',
    'spectre', 'instinct', 'sainte', 'pelerin', 'vipere', 'pelerin',
  ]),
  enOvale('demo-15', [
    'trinite', 'spectre', 'courtisane', 'anatheme', 'oracle', 'trinite', 'spectre', 'protecteur',
    'adepte', 'sainte', 'trinite', 'spectre', 'vipere', 'usurpateur', 'main-noire',
  ]),
];
