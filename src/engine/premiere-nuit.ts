// Nuit d'explication (« première nuit » du FigJam), avant que la partie commence.
// Le MJ passe les rôles de la partie un par un (seulement ceux qui sont en jeu), dans l'ordre où ils agiront
// (voir ordreDesRoles) :
// - il explique chaque rôle à la table ;
// - au passage des Spectres, des Doubles et de la Trinité, ils se réveillent et se reconnaissent ;
// - au passage de l'Anathème et de l'Adepte, ils choisissent leur modèle ou leur mentor.
// Personne ne meurt. Ensuite : jour 0 (élection de l'Alpha), puis la première vraie nuit.
import { debutDeNuit } from './nuit';
import { nomJoueur, trouverJoueur, verifierCible, vivants } from './outils';
import { ROLES, rolesDeLaNuit } from './roles';
import type { Action, Etape, EtatPartie, JoueurId, RoleId } from './types';

type PhaseExplication = Extract<EtatPartie['phase'], { type: 'explication' }>;
type EtapeExplication = Extract<Etape, { type: 'explication' }>;

/** Rôles qui doivent faire un choix (pas le droit de « passer »). */
const CHOIX: Partial<Record<RoleId, Action['type']>> = {
  anatheme: 'anatheme-choisir-modele',
  adepte: 'adepte-choisir-mentor',
};

/** Rôles du camp Spectres qui se réveillent ensemble ; le premier présent de la liste lance la reconnaissance. */
const FAMILLE_SPECTRES: RoleId[] = ['spectre', 'originel', 'maudit'];

/** Rôles qui ne se réveillent jamais : ils agissent le jour ou à une mort. Expliqués en dernier. */
const SANS_REVEIL: RoleId[] = ['pelerin', 'devoue', 'alpha', 'main-noire', 'usurpateur', 'sacrifie', 'bourreau'];

/**
 * L'ordre d'explication des rôles, pour raconter la partie dans l'ordre où elle se joue :
 * 1. ce qui se passe pendant la nuit d'explication : la meute des Spectres se reconnaît,
 *    puis Doubles, Trinité, Anathème (modèle), Adepte (mentor) ;
 * 2. une nuit de jeu, dans l'ordre des réveils ;
 * 3. les rôles sans réveil : le jour et les morts.
 */
export function ordreDesRoles(etat: EtatPartie): RoleId[] {
  const presents = new Set(etat.joueurs.map((j) => j.role));
  const meute = FAMILLE_SPECTRES.find((r) => presents.has(r)) ?? 'spectre';

  const nuit: RoleId[] = rolesDeLaNuit().map((r) => r.id);

  const ordre = [meute, 'doubles', 'trinite', 'anatheme', 'adepte', ...nuit, ...SANS_REVEIL] as RoleId[];
  const resultat = [...new Set(ordre)].filter((r) => presents.has(r));
  // Par sécurité, un rôle oublié dans les listes passe à la fin.
  for (const r of presents) if (!resultat.includes(r)) resultat.push(r);
  return resultat;
}

/** Les rôles en jeu et leur nombre, dans l'ordre d'explication. */
export function rolesEnJeu(etat: EtatPartie): { role: RoleId; nombre: number }[] {
  const compte = new Map<RoleId, number>();
  for (const j of etat.joueurs) compte.set(j.role, (compte.get(j.role) ?? 0) + 1);
  return ordreDesRoles(etat).map((role) => ({ role, nombre: compte.get(role)! }));
}

/** Ce que fait le rôle pendant l'explication, et qui se réveille. */
function deroule(etat: EtatPartie, role: RoleId): { mode: EtapeExplication['mode']; acteurs: JoueurId[] } {
  const porteurs = vivants(etat)
    .filter((j) => j.role === role)
    .map((j) => j.id);
  if (CHOIX[role]) return { mode: 'choix', acteurs: porteurs };
  if (role === 'doubles' || role === 'trinite') return { mode: 'reconnaissance', acteurs: porteurs };

  const premierSpectre = FAMILLE_SPECTRES.find((r) => etat.joueurs.some((j) => j.role === r));
  if (role === premierSpectre) {
    // Tout le camp Spectres se reconnaît, avec le Maudit qui fait semblant d'en être.
    const meute = vivants(etat)
      .filter((j) => j.camp === 'spectres' || j.role === 'maudit')
      .map((j) => j.id);
    return { mode: 'reconnaissance', acteurs: meute };
  }
  return { mode: 'presentation', acteurs: porteurs };
}

/** Étape en cours de la nuit d'explication, ou null si tous les rôles ont été passés. */
export function etapeExplication(etat: EtatPartie, phase: PhaseExplication): EtapeExplication | null {
  const roles = rolesEnJeu(etat);
  const enCours = roles[phase.etape];
  if (!enCours) return null;
  const { mode, acteurs } = deroule(etat, enCours.role);
  const ciblesPossibles =
    mode === 'choix'
      ? vivants(etat)
          .filter((j) => !acteurs.includes(j.id))
          .map((j) => j.id)
      : [];
  return {
    type: 'explication',
    role: enCours.role,
    nombre: enCours.nombre,
    rang: phase.etape + 1,
    total: roles.length,
    mode,
    acteurs,
    ciblesPossibles,
  };
}

/** Applique l'action du MJ pendant la nuit d'explication. */
export function appliquerExplication(etat: EtatPartie, phase: PhaseExplication, action: Action): EtatPartie {
  const etape = etapeExplication(etat, phase);
  if (!etape) throw new Error("La nuit d'explication est finie");
  let suivant: EtatPartie = structuredClone(etat);
  suivant.infoMJ = null;
  const nomRole = ROLES[etape.role].nom;

  // Le MJ saute toute l'explication : direction l'élection de l'Alpha (ou la première nuit).
  if (action.type === 'passer-explication') {
    const sansChoix = suivant.joueurs.filter((j) => (j.role === 'anatheme' || j.role === 'adepte') && j.memoire.lien === null);
    const fin = finExplication(suivant);
    return {
      ...fin,
      infoMJ:
        "Nuit d'explication passée" +
        (sansChoix.length > 0 ? ` : ${sansChoix.map((j) => ROLES[j.role].nom).join(' et ')} sans modèle ni mentor` : ''),
    };
  }

  if (etape.mode === 'choix') {
    if (action.type !== 'anatheme-choisir-modele' && action.type !== 'adepte-choisir-mentor') {
      throw new Error(`${nomRole} doit faire son choix`);
    }
    if (action.type !== CHOIX[etape.role]) throw new Error(`C'est au tour de ${nomRole}`);
    verifierCible(etape.ciblesPossibles, action.cible, nomRole);
    const acteur = trouverJoueur(suivant, etape.acteurs[0]);
    acteur.memoire.lien = action.cible;
    const quoi = etape.role === 'anatheme' ? 'modèle' : 'mentor';
    suivant.infoMJ = `${nomJoueur(acteur)} a choisi pour ${quoi} ${nomJoueur(trouverJoueur(suivant, action.cible))}`;
  } else {
    if (action.type !== 'passer') throw new Error(`${nomRole} : explication et reconnaissance, continue avec « passer »`);
    if (etape.mode === 'reconnaissance') {
      const groupe = FAMILLE_SPECTRES.includes(etape.role) ? 'Spectres' : nomRole;
      suivant.infoMJ = `${groupe} : ${etape.acteurs.map((id) => nomJoueur(trouverJoueur(suivant, id))).join(', ')}`;
    }
  }

  suivant.phase = { type: 'explication', etape: phase.etape + 1 };
  if (etapeExplication(suivant, suivant.phase as PhaseExplication) === null) suivant = finExplication(suivant);
  return suivant;
}

/** Fin de l'explication : élection de l'Alpha (jour 0), ou directement la première nuit si l'Alpha est une carte. */
function finExplication(etat: EtatPartie): EtatPartie {
  if (etat.alpha !== null) return { ...debutDeNuit(etat, 1), infoMJ: etat.infoMJ };
  return { ...etat, phase: { type: 'jour', numero: 0 } };
}
