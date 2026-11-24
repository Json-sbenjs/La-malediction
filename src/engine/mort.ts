// Effets à la mort : Usurpateur, Main Noire, Anathème, Adepte, successeur de l'Alpha,
// Trinité et Doubles qui se dissolvent, Sectaire dont les enrôlés sont libérés.
// Décisions liées au vote : Sacrifié (mourir à la place du condamné), Bourreau (second vote).
import { debutDeNuit } from './nuit';
import { nomJoueur, trouverJoueur, verifierCible, vivants } from './outils';
import { ROLES } from './roles';
import type { Action, Decision, Etape, EtatPartie, Joueur, JoueurId } from './types';

function memoireNeuve(): Joueur['memoire'] {
  return { pouvoirUtilise: false, pouvoirPerdu: false, derniereCible: null, lien: null };
}

/**
 * L'Adepte hérite du rôle de son mentor, pouvoirs remis à neuf, sans la mémoire.
 * Il prend aussi le camp du mentor (Spectres si le mentor était Spectre).
 */
function heriter(adepte: Joueur, mentor: Joueur): void {
  adepte.role = mentor.role;
  adepte.camp = mentor.camp;
  adepte.memoire = memoireNeuve();
}

/**
 * Trinité et Doubles : dès qu'un membre meurt, le groupe solitaire se dissout.
 * Les survivants (et le mort) basculent chez les Pèlerins.
 */
function dissoudreGroupe(etat: EtatPartie, mort: Joueur): void {
  if (mort.camp !== 'trinite' && mort.camp !== 'doubles') return;
  const groupe = mort.camp;
  for (const j of etat.joueurs) {
    if (j.camp === groupe) j.camp = 'pelerins';
  }
}

/** Le Sectaire meurt : tous ses enrôlés sont libérés. */
function libererEnroles(etat: EtatPartie, mort: Joueur): void {
  if (mort.role !== 'sectaire') return;
  for (const j of etat.joueurs) j.statuts.enrole = false;
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
  dissoudreGroupe(etat, mort);
  libererEnroles(etat, mort);
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
  garderBourreauEnDernier(etat);
}

/** La décision du Bourreau passe toujours après les effets des morts du vote. */
function garderBourreauEnDernier(etat: EtatPartie): void {
  const bourreau = etat.decisions.filter((d) => d.type === 'bourreau');
  etat.decisions = [...etat.decisions.filter((d) => d.type !== 'bourreau'), ...bourreau];
}

/**
 * Si la prochaine décision est celle d'un Bourreau mort entre-temps, on la saute :
 * pas de second vote, la nuit suivante commence.
 */
export function sauterBourreauMort(etat: EtatPartie): EtatPartie {
  const premiere = etat.decisions[0];
  if (premiere?.type !== 'bourreau' || trouverJoueur(etat, premiere.bourreau).vivant) return etat;
  const reste = { ...etat, decisions: etat.decisions.slice(1) };
  return { ...debutDeNuit(reste, premiere.numero + 1), infoMJ: etat.infoMJ };
}

function ciblesDecision(etat: EtatPartie, decision: Decision): JoueurId[] {
  switch (decision.type) {
    case 'usurpateur':
      return [decision.mort];
    case 'main-noire':
    case 'alpha-successeur':
      return vivants(etat).map((j) => j.id);
    case 'sacrifice':
    case 'bourreau':
      return [];
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

    case 'sacrifice': {
      if (action.type !== 'sacrifice' && action.type !== 'passer') throw new Error("C'est au tour du Sacrifié");
      const accepte = action.type === 'sacrifice' && action.accepter;
      const sacrifie = trouverJoueur(suivant, decision.sacrifie);
      if (accepte) {
        sacrifie.memoire.pouvoirUtilise = true;
        tuer(suivant, decision.sacrifie);
        suivant.infoMJ = `${nomJoueur(sacrifie)} se sacrifie et meurt à la place de ${nomJoueur(
          trouverJoueur(suivant, decision.condamne),
        )}`;
      } else {
        tuer(suivant, decision.condamne);
        suivant.infoMJ = `Le village élimine ${nomJoueur(trouverJoueur(suivant, decision.condamne))}`;
      }
      break;
    }

    case 'bourreau': {
      if (action.type !== 'second-vote' && action.type !== 'passer') throw new Error("C'est au tour du Bourreau");
      if (action.type === 'second-vote' && action.accepter) {
        // Second vote : on reste au jour, le Bourreau a utilisé son pouvoir.
        trouverJoueur(suivant, decision.bourreau).memoire.pouvoirUtilise = true;
        suivant.infoMJ = 'Le Bourreau déclenche un second vote';
      } else {
        return debutDeNuit(suivant, decision.numero + 1);
      }
      break;
    }
  }

  return sauterBourreauMort(suivant);
}
