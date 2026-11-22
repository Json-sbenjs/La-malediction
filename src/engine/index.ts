// Porte d'entrée du moteur : l'interface (tablette ou terminal) n'utilise que ce fichier.
import { creerPartie as creer } from './mise-en-place';
import { appliquerNuit, etapeNuit } from './nuit';
import type { Plan } from './plans';
import type { Action, Etape, EtatPartie } from './types';

export type * from './types';
export type { Plan, Siege } from './plans';
export { PLANS, validerPlan } from './plans';
export { ROLES, getRole } from './roles';
export { choisirPlan, nombresDeJoueurs, sallesDisponibles } from './mise-en-place';
export { nomJoueur } from './nuit';

/** Crée une partie à partir d'un plan (prénoms facultatifs, dans l'ordre des sièges). */
export function creerPartie(plan: Plan, prenoms?: (string | null)[]): EtatPartie {
  return creer(plan, prenoms);
}

/** Ce que le MJ doit faire maintenant. */
export function etapeSuivante(etat: EtatPartie): Etape {
  const phase = etat.phase;
  switch (phase.type) {
    case 'nuit':
      return etapeNuit(etat, phase);
    case 'jour':
      return { type: 'jour', numero: phase.numero };
    case 'fin':
      return { type: 'fin', gagnants: phase.gagnants };
  }
}

/** Applique une action du MJ et renvoie le nouvel état (l'ancien n'est pas modifié). */
export function appliquer(etat: EtatPartie, action: Action): EtatPartie {
  const phase = etat.phase;
  switch (phase.type) {
    case 'nuit':
      return appliquerNuit(etat, phase, action);
    case 'jour':
      throw new Error('Le jour et le vote : pas encore codés (semaine 3)');
    case 'fin':
      throw new Error('La partie est terminée');
  }
}
