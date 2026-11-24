// Historique de la partie : pour annuler la dernière action du MJ.
// Le moteur ne modifie jamais un état : `appliquer` en renvoie un nouveau.
// Il suffit donc de garder les états précédents et de revenir au dernier.
import type { EtatPartie } from './types';

/** Nombre d'actions qu'on peut annuler d'affilée (de quoi couvrir une nuit et un jour chargés). */
export const LIMITE_HISTORIQUE = 100;

/** Les états précédents, du plus ancien au plus récent. */
export type Historique = EtatPartie[];

/** Mémorise l'état d'avant une action. Les plus anciens sont oubliés au-delà de la limite. */
export function memoriser(historique: Historique, avant: EtatPartie): Historique {
  return [...historique, avant].slice(-LIMITE_HISTORIQUE);
}

/** Revient à l'état d'avant la dernière action. null s'il n'y a rien à annuler. */
export function annuler(historique: Historique): { etat: EtatPartie; historique: Historique } | null {
  if (historique.length === 0) return null;
  return { etat: historique[historique.length - 1], historique: historique.slice(0, -1) };
}
