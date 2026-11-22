// Résolution de la nuit : attaque des Spectres, protection, Sainte, Vipère.
import { tuer } from './mort';
import { nomJoueur, trouverJoueur } from './outils';
import type { EtatPartie, JoueurId } from './types';

/** Qui meurt à la fin de la nuit (sans rien modifier). */
export function mortsDeLaNuit(etat: EtatPartie): JoueurId[] {
  const morts: JoueurId[] = [];

  const victime = etat.victimeSpectres;
  if (victime !== null) {
    const j = trouverJoueur(etat, victime);
    if (j.vivant && !j.statuts.protege && !etat.sauveeParSainte) morts.push(victime);
  }

  // La protection ne bloque que l'attaque des Spectres, pas le poison.
  const poison = etat.empoisonne;
  if (poison !== null && !morts.includes(poison) && trouverJoueur(etat, poison).vivant) {
    morts.push(poison);
  }

  return morts;
}

/** Applique les morts de la nuit et passe au jour du même numéro. */
export function resoudreNuit(etat: EtatPartie, numero: number): EtatPartie {
  const suivant: EtatPartie = structuredClone(etat);
  const morts = mortsDeLaNuit(etat);
  for (const id of morts) tuer(suivant, id);

  suivant.phase = { type: 'jour', numero };
  suivant.infoMJ =
    morts.length === 0
      ? "Personne n'est mort cette nuit"
      : `Morts de la nuit : ${morts.map((id) => nomJoueur(trouverJoueur(suivant, id))).join(', ')}`;
  return suivant;
}
