// Effets à la mort : Usurpateur, Main Noire, Anathème, Adepte, successeur de l'Alpha.
import { nomJoueur, trouverJoueur, verifierCible, vivants } from './outils';
import { ROLES } from './roles';
import type { Action, Decision, Etape, EtatPartie, Joueur, JoueurId } from './types';

function memoireNeuve(): Joueur['memoire'] {
  return { pouvoirUtilise: false, pouvoirPerdu: false, derniereCible: null, lien: null };
}

/** L'Adepte hérite du rôle de son mentor, pouvoirs remis à neuf, sans la mémoire. */
function heriter(adepte: Joueur, mentor: Joueur): void {
  adepte.role = mentor.role;
  adepte.camp = mentor.camp === 'spectres' ? 'spectres' : ROLES[mentor.role].camp;
  adepte.memoire = memoireNeuve();
}

/** Effets liés au rôle du mort (sautés si l'Usurpateur lui prend son rôle). */
function effetsDuRole(etat: EtatPartie, mort: Joueur): void {
  if (mort.role === 'main-noire') {
    etat.decisions.push({ type: 'main-noire', tireur: mort.id });
  }
}

/**
 * Tue un joueur et prépare les effets de sa mort.
 * ⚠ Modifie `etat` : à appeler sur une copie (structuredClone).
 */
export function tuer(etat: EtatPartie, id: JoueurId): void {
  const mort = trouverJoueur(etat, id);
  if (!mort.vivant) return;
  mort.vivant = false;
  mort.revele = true;

  // Effets automatiques
  for (const j of vivants(etat)) {
    if (j.memoire.lien !== id) continue;
    if (j.role === 'anatheme') j.camp = 'spectres';
    else if (j.role === 'adepte') heriter(j, mort);
  }

  // Effets qui demandent un choix du MJ
  const usurpateur = vivants(etat).find((j) => j.role === 'usurpateur' && !j.memoire.pouvoirUtilise);
  if (usurpateur) {
    etat.decisions.push({ type: 'usurpateur', usurpateur: usurpateur.id, mort: id });
  } else {
    effetsDuRole(etat, mort);
  }
  if (etat.alpha === id) {
    etat.decisions.push({ type: 'alpha-successeur', ancien: id });
  }
}

function ciblesDecision(etat: EtatPartie, decision: Decision): JoueurId[] {
  switch (decision.type) {
    case 'usurpateur':
      return [decision.mort];
    case 'main-noire':
    case 'alpha-successeur':
      return vivants(etat).map((j) => j.id);
  }
}

export function etapeDecision(etat: EtatPartie, decision: Decision): Etape {
  return { type: 'decision', decision, ciblesPossibles: ciblesDecision(etat, decision) };
}

/** Traite la première décision de la file. */
export function appliquerDecision(etat: EtatPartie, action: Action): EtatPartie {
  const suivant: EtatPartie = structuredClone(etat);
  const decision = suivant.decisions.shift();
  if (!decision) throw new Error('Aucune décision en attente');
  const cibles = ciblesDecision(etat, decision);
  suivant.infoMJ = null;

  switch (decision.type) {
    case 'usurpateur': {
      const mort = trouverJoueur(suivant, decision.mort);
      if (action.type !== 'passer' && action.type !== 'usurpateur-remplacer') {
        throw new Error("C'est au tour de l'Usurpateur");
      }
      const cible = action.type === 'usurpateur-remplacer' ? action.cible : null;
      if (cible === null) {
        // Il refuse : les effets du rôle du mort s'appliquent normalement.
        effetsDuRole(suivant, mort);
        break;
      }
      verifierCible(cibles, cible, "L'Usurpateur");
      const usurpateur = trouverJoueur(suivant, decision.usurpateur);
      usurpateur.role = mort.role;
      usurpateur.camp = mort.camp;
      usurpateur.memoire = memoireNeuve();
      suivant.infoMJ = `${nomJoueur(usurpateur)} prend le rôle de ${nomJoueur(mort)} : ${ROLES[mort.role].nom}`;
      break;
    }

    case 'main-noire':
      if (action.type === 'passer') break;
      if (action.type !== 'main-noire-tirer') throw new Error("C'est au tour de la Main Noire");
      verifierCible(cibles, action.cible, 'La Main Noire');
      tuer(suivant, action.cible);
      suivant.infoMJ = `La Main Noire élimine ${nomJoueur(trouverJoueur(suivant, action.cible))}`;
      break;

    case 'alpha-successeur':
      if (action.type === 'passer') {
        suivant.alpha = null; // le village élira un nouvel Alpha
        break;
      }
      if (action.type !== 'alpha-successeur') throw new Error("C'est à l'Alpha de désigner son successeur");
      verifierCible(cibles, action.cible, "L'Alpha");
      suivant.alpha = action.cible;
      break;
  }

  return suivant;
}
