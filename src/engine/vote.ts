// Le jour : élection de l'Alpha si besoin, puis vote du village (Alpha ×2).
import { tuer } from './mort';
import { debutDeNuit } from './nuit';
import { nomJoueur, trouverJoueur, verifierCible, vivants } from './outils';
import type { Action, Etape, EtatPartie, JoueurId } from './types';

type PhaseJour = Extract<EtatPartie['phase'], { type: 'jour' }>;

function alphaVivant(etat: EtatPartie): JoueurId | null {
  if (etat.alpha === null) return null;
  return trouverJoueur(etat, etat.alpha).vivant ? etat.alpha : null;
}

export function etapeJour(etat: EtatPartie, phase: PhaseJour): Etape {
  const ids = vivants(etat).map((j) => j.id);
  const alpha = alphaVivant(etat);
  if (alpha === null) {
    return { type: 'election-alpha', numero: phase.numero, candidats: ids };
  }
  return { type: 'vote', numero: phase.numero, votants: ids, ciblesPossibles: ids, alpha };
}

export interface ResultatVote {
  /** Nombre de voix par joueur visé. */
  compte: Record<JoueurId, number>;
  /** Joueur éliminé, ou null en cas d'égalité ou sans vote. */
  elimine: JoueurId | null;
}

/**
 * Compte les voix : `votes[votant] = cible` (null = abstention).
 * La voix de l'Alpha compte double. Égalité en tête → personne n'est éliminé.
 */
export function compterVotes(etat: EtatPartie, votes: Record<JoueurId, JoueurId | null>): ResultatVote {
  const ids = vivants(etat).map((j) => j.id);
  const alpha = alphaVivant(etat);
  const compte: Record<JoueurId, number> = {};

  for (const [cle, cible] of Object.entries(votes)) {
    const votant = Number(cle);
    if (!ids.includes(votant)) throw new Error(`Le siège ${votant} ne peut pas voter`);
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
    if (action.type !== 'elire-alpha') throw new Error("Il faut d'abord élire l'Alpha");
    verifierCible(etape.candidats, action.cible, 'Le village');
    return { ...etat, alpha: action.cible, infoMJ: `${nomJoueur(trouverJoueur(etat, action.cible))} est élu Alpha` };
  }

  if (action.type !== 'vote' && action.type !== 'passer') {
    throw new Error("C'est l'heure du vote du village");
  }
  const { elimine } = action.type === 'vote' ? compterVotes(etat, action.votes) : { elimine: null };

  let suivant: EtatPartie = structuredClone(etat);
  if (elimine !== null) tuer(suivant, elimine);
  suivant = debutDeNuit(suivant, phase.numero + 1);
  suivant.infoMJ =
    elimine === null
      ? "Personne n'est éliminé par le vote"
      : `Le village élimine ${nomJoueur(trouverJoueur(suivant, elimine))}`;
  return suivant;
}
