import type { EtatPartie, Joueur, JoueurId } from './types';

/** « Paul (siège 3) » ou « siège 3 ». */
export function nomJoueur(joueur: Joueur): string {
  return joueur.nom ? `${joueur.nom} (siège ${joueur.id})` : `siège ${joueur.id}`;
}

export function trouverJoueur(etat: EtatPartie, id: JoueurId): Joueur {
  const joueur = etat.joueurs.find((j) => j.id === id);
  if (!joueur) throw new Error(`Siège ${id} inconnu`);
  return joueur;
}

export function vivants(etat: EtatPartie): Joueur[] {
  return etat.joueurs.filter((j) => j.vivant);
}

/** Lève une erreur si `cible` n'est pas dans la liste autorisée. */
export function verifierCible(ciblesPossibles: JoueurId[], cible: JoueurId, qui: string): void {
  if (!ciblesPossibles.includes(cible)) {
    throw new Error(`${qui} ne peut pas viser le siège ${cible}`);
  }
}
