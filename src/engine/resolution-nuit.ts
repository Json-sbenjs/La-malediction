// Résolution de la nuit : attaque des Spectres, protection, Sainte, Vipère, Maudit, Originel.
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

  // Le Maudit dévore un Spectre ; le Protecteur peut l'en empêcher comme pour une attaque.
  const proie = etat.victimeMaudit;
  if (proie !== null && !morts.includes(proie)) {
    const j = trouverJoueur(etat, proie);
    if (j.vivant && !j.statuts.protege) morts.push(proie);
  }

  // La protection ne bloque pas le poison.
  const poison = etat.empoisonne;
  if (poison !== null && !morts.includes(poison) && trouverJoueur(etat, poison).vivant) {
    morts.push(poison);
  }

  return morts;
}

/** Joueur transformé en Spectre par l'Originel cette nuit (null si personne). */
export function transformationDeLaNuit(etat: EtatPartie): JoueurId | null {
  const id = etat.infecte;
  if (id === null) return null;
  const j = trouverJoueur(etat, id);
  return j.vivant && !j.statuts.protege && !mortsDeLaNuit(etat).includes(id) ? id : null;
}

/** Applique les morts de la nuit et passe au jour du même numéro. */
export function resoudreNuit(etat: EtatPartie, numero: number): EtatPartie {
  const suivant: EtatPartie = structuredClone(etat);
  const morts = mortsDeLaNuit(etat);
  for (const id of morts) tuer(suivant, id);

  // L'Originel : la victime rejoint les Spectres en secret (le Protecteur l'en protège).
  const infecte = transformationDeLaNuit(etat);
  if (infecte !== null) trouverJoueur(suivant, infecte).camp = 'spectres';

  suivant.phase = { type: 'jour', numero };
  suivant.infoMJ =
    morts.length === 0
      ? "Personne n'est mort cette nuit"
      : `Morts de la nuit : ${morts.map((id) => nomJoueur(trouverJoueur(suivant, id))).join(', ')}`;
  if (infecte !== null) {
    suivant.infoMJ += `. En secret : ${nomJoueur(trouverJoueur(suivant, infecte))} est devenu Spectre`;
  }
  return suivant;
}
