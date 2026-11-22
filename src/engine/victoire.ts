// Conditions de victoire.
import { vivants } from './outils';
import type { Camp, EtatPartie } from './types';

/**
 * Un camp gagne quand tous les vivants sont de ce camp :
 * - Pèlerins : plus aucun Spectre (ni Trinité encore soudée) en vie ;
 * - Spectres : il ne reste que des Spectres ;
 * - Trinité : ses membres sont les seuls survivants.
 * Renvoie null si la partie continue ; { gagnants: null } si tout le monde est mort.
 */
export function verifierVictoire(etat: EtatPartie): { gagnants: Camp | null } | null {
  const enVie = vivants(etat);
  if (enVie.length === 0) return { gagnants: null };
  const camps = new Set(enVie.map((j) => j.camp));
  return camps.size === 1 ? { gagnants: enVie[0].camp } : null;
}
