// Première nuit : reconnaissances (Trinité, Spectres), modèle de l'Anathème, mentor de l'Adepte.
// L'ordre de réveil vient de roles.ts : les rôles « première nuit » passent avant la nuit normale.
import { nomJoueur, trouverJoueur } from './outils';
import type { Action, EtatPartie, Joueur, JoueurId, RoleId } from './types';

/** Rôles qui doivent faire un choix la première nuit (pas le droit de « passer »). */
export const CHOIX_OBLIGATOIRE: Partial<Record<RoleId, Action['type']>> = {
  anatheme: 'anatheme-choisir-modele',
  adepte: 'adepte-choisir-mentor',
};

/** Modèle / mentor : n'importe quel autre joueur vivant (un Spectre compris). */
export function ciblesPremiereNuit(etat: EtatPartie, acteurs: JoueurId[]): JoueurId[] {
  return etat.joueurs.filter((j) => j.vivant && !acteurs.includes(j.id)).map((j) => j.id);
}

/** Texte de reconnaissance pour le MJ : qui sont les membres du groupe. */
export function reconnaissance(etat: EtatPartie, membres: JoueurId[]): string {
  return membres.map((id) => nomJoueur(trouverJoueur(etat, id))).join(', ');
}

/**
 * Enregistre le modèle de l'Anathème ou le mentor de l'Adepte.
 * ⚠ Modifie `acteur` : à appeler sur une copie de l'état.
 */
export function choisirLien(etat: EtatPartie, acteur: Joueur, cible: JoueurId): string {
  acteur.memoire.lien = cible;
  const quoi = acteur.role === 'anatheme' ? 'modèle' : 'mentor';
  return `${nomJoueur(acteur)} a choisi pour ${quoi} ${nomJoueur(trouverJoueur(etat, cible))}`;
}
