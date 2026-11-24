// Le jour : élection de l'Alpha si besoin, choix des morts (jours pairs), puis vote du village
// (Alpha ×2, marque de l'Inquisiteur, morts qui votent, Sacrifié, second vote du Bourreau).
import { sauterBourreauMort, tuer } from './mort';
import { debutDeNuit } from './nuit';
import { nomJoueur, trouverJoueur, verifierCible, vivants } from './outils';
import type { Action, Etape, EtatPartie, JoueurId } from './types';

type PhaseJour = Extract<EtatPartie['phase'], { type: 'jour' }>;

function alphaVivant(etat: EtatPartie): JoueurId | null {
  if (etat.alpha === null) return null;
  return trouverJoueur(etat, etat.alpha).vivant ? etat.alpha : null;
}

function morts(etat: EtatPartie): JoueurId[] {
  return etat.joueurs.filter((j) => !j.vivant).map((j) => j.id);
}

/** Jours pairs (2, 4, 6…), les morts peuvent participer : le MJ choisit pour tous s'ils parlent ou votent. */
export function jourDesMorts(numero: number): boolean {
  return numero > 0 && numero % 2 === 0;
}

/** Qui vote aujourd'hui : les vivants, plus les morts un jour pair où le MJ les a fait voter. */
export function votantsDuJour(etat: EtatPartie): JoueurId[] {
  const ids = vivants(etat).map((j) => j.id);
  return etat.voteDesMorts === 'voter' ? [...ids, ...morts(etat)] : ids;
}

export function etapeJour(etat: EtatPartie, phase: PhaseJour): Etape {
  const ids = vivants(etat).map((j) => j.id);
  const alpha = alphaVivant(etat);
  if (alpha === null) {
    return { type: 'election-alpha', numero: phase.numero, candidats: ids };
  }
  if (jourDesMorts(phase.numero) && etat.voteDesMorts === null && morts(etat).length > 0) {
    return { type: 'morts-du-jour', numero: phase.numero, morts: morts(etat) };
  }
  // On ne vote que contre un vivant, même quand les morts votent.
  return { type: 'vote', numero: phase.numero, votants: votantsDuJour(etat), ciblesPossibles: ids, alpha };
}

export interface ResultatVote {
  /** Nombre de voix par joueur visé. */
  compte: Record<JoueurId, number>;
  /** Joueur éliminé, ou null en cas d'égalité ou sans vote. */
  elimine: JoueurId | null;
}

/**
 * Compte les voix : `votes[votant] = cible` (null = abstention).
 * La voix de l'Alpha compte double. Le joueur marqué par l'Inquisiteur part avec une voix.
 * Un jour pair où le MJ les fait voter, les morts votent aussi (1 voix chacun).
 * Égalité en tête → personne n'est éliminé.
 */
export function compterVotes(etat: EtatPartie, votes: Record<JoueurId, JoueurId | null>): ResultatVote {
  const ids = vivants(etat).map((j) => j.id);
  const votants = votantsDuJour(etat);
  const alpha = alphaVivant(etat);
  const compte: Record<JoueurId, number> = {};
  if (etat.marque !== null && ids.includes(etat.marque)) compte[etat.marque] = 1;

  for (const [cle, cible] of Object.entries(votes)) {
    const votant = Number(cle);
    if (!votants.includes(votant)) throw new Error(`Le siège ${votant} ne peut pas voter`);
    if (cible === null) continue;
    verifierCible(ids, cible, `Le siège ${votant}`);
    compte[cible] = (compte[cible] ?? 0) + (votant === alpha ? 2 : 1);
  }

  const max = Math.max(0, ...Object.values(compte));
  const enTete = Object.keys(compte)
    .map(Number)
    .filter((id) => compte[id] === max);
  return { compte, elimine: max > 0 && enTete.length === 1 ? enTete[0] : null };
}

export function appliquerJour(etat: EtatPartie, phase: PhaseJour, action: Action): EtatPartie {
  const etape = etapeJour(etat, phase);

  if (etape.type === 'election-alpha') {
    // Jour 0 : on peut repousser l'élection au premier jour (« Élire plus tard »).
    if (phase.numero === 0 && action.type === 'passer') {
      return { ...debutDeNuit(etat, 1), infoMJ: "Pas d'Alpha pour l'instant : élection au premier jour" };
    }
    if (action.type !== 'elire-alpha') throw new Error("Il faut d'abord élire l'Alpha");
    verifierCible(etape.candidats, action.cible, 'Le village');
    const info = `${nomJoueur(trouverJoueur(etat, action.cible))} est élu Alpha`;
    // Jour 0 : l'élection faite, la partie commence par la première nuit.
    if (phase.numero === 0) return { ...debutDeNuit({ ...etat, alpha: action.cible }, 1), infoMJ: info };
    return { ...etat, alpha: action.cible, infoMJ: info };
  }

  if (etape.type === 'morts-du-jour') {
    if (action.type !== 'morts-du-jour') throw new Error("Choisis d'abord si les morts parlent ou votent");
    return {
      ...etat,
      voteDesMorts: action.choix,
      infoMJ:
        action.choix === 'voter'
          ? 'Aujourd\'hui, les morts votent (1 voix chacun) et se taisent'
          : 'Aujourd\'hui, les morts peuvent parler, mais ne votent pas',
    };
  }

  let elimine: JoueurId | null;
  switch (action.type) {
    case 'vote':
      elimine = compterVotes(etat, action.votes).elimine;
      break;
    case 'eliminer':
      verifierCible(
        vivants(etat).map((j) => j.id),
        action.cible,
        'Le village',
      );
      elimine = action.cible;
      break;
    case 'passer':
      elimine = null;
      break;
    default:
      throw new Error("C'est l'heure du vote du village");
  }

  let suivant: EtatPartie = structuredClone(etat);
  suivant.marque = null; // la marque ne vaut que pour le premier vote
  suivant.infoMJ =
    elimine === null
      ? "Personne n'est éliminé par le vote"
      : `Le village condamne ${nomJoueur(trouverJoueur(suivant, elimine))}`;

  if (elimine !== null) {
    // Le Sacrifié peut mourir à la place du condamné : on lui demande avant de tuer.
    const sacrifie = vivants(suivant).find(
      (j) => j.role === 'sacrifie' && !j.memoire.pouvoirUtilise && j.id !== elimine,
    );
    if (sacrifie) suivant.decisions.push({ type: 'sacrifice', sacrifie: sacrifie.id, condamne: elimine });
    else {
      tuer(suivant, elimine);
      suivant.infoMJ = `Le village élimine ${nomJoueur(trouverJoueur(suivant, elimine))}`;
    }
  }

  // Le Bourreau peut déclencher un second vote : on reste au jour en attendant sa réponse.
  const bourreau = vivants(suivant).find((j) => j.role === 'bourreau' && !j.memoire.pouvoirUtilise);
  if (bourreau) {
    suivant.decisions.push({ type: 'bourreau', bourreau: bourreau.id, numero: phase.numero });
    return sauterBourreauMort(suivant);
  }
  const info = suivant.infoMJ;
  return { ...debutDeNuit(suivant, phase.numero + 1), infoMJ: info };
}
