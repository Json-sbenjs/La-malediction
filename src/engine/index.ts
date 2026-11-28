// Porte d'entrée du moteur : l'interface (tablette ou terminal) n'utilise que ce fichier.
import { creerPartie as creer } from './mise-en-place';
import { appliquerDecision, etapeDecision } from './mort';
import { appliquerNuit, etapeNuit } from './nuit';
import { appliquerExplication, etapeExplication } from './premiere-nuit';
import type { Plan } from './plans';
import type { Action, Etape, EtatPartie } from './types';
import { verifierVictoire } from './victoire';
import { appliquerJour, etapeJour } from './vote';

export type * from './types';
export type { Plan, Siege } from './plans';
export { PLANS, validerPlan } from './plans';
export { ROLES, getRole } from './roles';
export { choisirPlan, nombresDeJoueurs, sallesDisponibles } from './mise-en-place';
export { nomJoueur } from './outils';
export { compterMainsLevees, compterVotes, mortsVotent, votantsDuJour, type ResultatVote } from './vote';

/** Crée une partie à partir d'un plan (prénoms facultatifs, dans l'ordre des sièges). */
export function creerPartie(plan: Plan, prenoms?: (string | null)[]): EtatPartie {
  return creer(plan, prenoms);
}

/** Ce que le MJ doit faire maintenant. Les décisions liées à une mort passent avant tout. */
export function etapeSuivante(etat: EtatPartie): Etape {
  const phase = etat.phase;
  if (phase.type === 'fin') return { type: 'fin', gagnants: phase.gagnants };
  if (etat.decisions.length > 0) return etapeDecision(etat, etat.decisions[0]);
  switch (phase.type) {
    case 'explication':
      // Une explication finie passe tout de suite au jour 0 ou à la nuit 1 : jamais null ici.
      return etapeExplication(etat, phase)!;
    case 'nuit':
      return etapeNuit(etat, phase);
    case 'jour':
      return etapeJour(etat, phase);
  }
}

/** Applique une action du MJ et renvoie le nouvel état (l'ancien n'est pas modifié). */
export function appliquer(etat: EtatPartie, action: Action): EtatPartie {
  const phase = etat.phase;
  if (phase.type === 'fin') throw new Error('La partie est terminée');

  let suivant: EtatPartie;
  if (etat.decisions.length > 0) suivant = appliquerDecision(etat, action);
  else if (phase.type === 'explication') suivant = appliquerExplication(etat, phase, action);
  else if (phase.type === 'nuit') suivant = appliquerNuit(etat, phase, action);
  else suivant = appliquerJour(etat, phase, action);

  // Victoire : vérifiée dès que les décisions liées aux morts sont réglées
  // (la proposition de second vote du Bourreau n'empêche pas la partie de se finir).
  if (suivant.decisions.every((d) => d.type === 'bourreau')) {
    const victoire = verifierVictoire(suivant);
    if (victoire) suivant = { ...suivant, decisions: [], phase: { type: 'fin', gagnants: victoire.gagnants } };
  }
  return suivant;
}
export {
  FORMES,
  compositionConseillee,
  deplacerSiege,
  echangerRoles,
  genererPlan,
  maxJoueursPossible,
  totalComposition,
  type Composition,
  type Forme,
} from './generateur';
export { MAX_JOUEURS, MIN_JOUEURS, compterRoles } from './plans';
export {
  ajouterSiege,
  cartesRestantes,
  changerRole,
  equilibreSpectres,
  placeLibre,
  retirerSiege,
} from './ajustement';
export { PARAM_PARTAGE, decoderPlan, encoderPlan } from './partage';
export { LIMITE_HISTORIQUE, annuler, memoriser, type Historique } from './historique';
