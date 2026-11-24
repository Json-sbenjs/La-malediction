// Conditions de victoire.
import { vivants } from './outils';
import type { Camp, EtatPartie } from './types';

/**
 * Qui a gagné ? Renvoie null si la partie continue ; { gagnants: null } si tout le monde est mort.
 *
 * - Sectaire : il est en vie et tous les autres vivants sont enrôlés.
 * - Envoûteur : il est en vie et tous les autres vivants sont charmés.
 * - Sinon, un camp gagne quand tous les vivants en font partie :
 *   Pèlerins (plus de Spectre ni de solitaire), Spectres, Trinité ou Doubles encore soudées,
 *   Maudit (seul survivant), Nécromancien (seul ou avec son Revenant).
 *   Le Revenant ne gagne pas sans son Nécromancien.
 */
export function verifierVictoire(etat: EtatPartie): { gagnants: Camp | null } | null {
  const enVie = vivants(etat);
  if (enVie.length === 0) return { gagnants: null };

  const sectaire = enVie.find((j) => j.role === 'sectaire');
  if (sectaire && enVie.every((j) => j.id === sectaire.id || j.statuts.enrole)) return { gagnants: 'sectaire' };

  const envouteur = enVie.find((j) => j.role === 'envouteur');
  if (envouteur && enVie.every((j) => j.id === envouteur.id || j.statuts.charme)) return { gagnants: 'envouteur' };

  const camps = new Set(enVie.map((j) => j.camp));
  if (camps.size !== 1) return null;
  const camp = enVie[0].camp;
  if (camp === 'necromancien' && !enVie.some((j) => j.role === 'necromancien')) return { gagnants: null };
  return { gagnants: camp };
}
