// Plans de DÉMONSTRATION, pour tester l'interface tant que les vrais plans
// ne sont pas saisis (le générateur de salle sur mesure arrive en semaine 5).
import type { Plan, RoleId } from '../engine';

/** Place les sièges en ovale, siège 1 en haut, dans le sens des aiguilles d'une montre. */
function enOvale(id: string, roles: RoleId[]): Plan {
  const n = roles.length;
  return {
    id,
    salle: 'Démo',
    nbJoueurs: n,
    sieges: roles.map((role, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return {
        numero: i + 1,
        role,
        position: { x: Math.round(50 + 42 * Math.cos(angle)), y: Math.round(50 + 40 * Math.sin(angle)) },
      };
    }),
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
