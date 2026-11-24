// Nuit d'explication (« première nuit » du FigJam), avant que la partie commence :
// 1. le MJ présente tous les rôles en jeu ;
// 2. reconnaissances : les Spectres (avec l'Originel et le Maudit), les Doubles, la Trinité ;
// 3. l'Anathème choisit son modèle, l'Adepte son mentor.
// Personne ne meurt. Ensuite : jour 0 (élection de l'Alpha), puis la première vraie nuit.
import { debutDeNuit } from './nuit';
import { nomJoueur, trouverJoueur, verifierCible, vivants } from './outils';
import { ROLES, rolesDeLExplication } from './roles';
import type { Action, Etape, EtatPartie, JoueurId, RoleId } from './types';

type PhaseExplication = Extract<EtatPartie['phase'], { type: 'explication' }>;
type EtapeReveil = Extract<Etape, { type: 'reveil' }>;

/** Rôles qui doivent faire un choix (pas le droit de « passer »). */
const CHOIX: Partial<Record<RoleId, Action['type']>> = {
  anatheme: 'anatheme-choisir-modele',
  adepte: 'adepte-choisir-mentor',
};

/** Groupes qui se reconnaissent : le MJ valide avec « passer ». */
const GROUPES: Partial<Record<RoleId, string>> = { spectre: 'Spectres', doubles: 'Doubles', trinite: 'Trinité' };

/** Les rôles en jeu et leur nombre, dans l'ordre du registre (écran de présentation). */
export function rolesEnJeu(etat: EtatPartie): { role: RoleId; nombre: number }[] {
  const compte = new Map<RoleId, number>();
  for (const j of etat.joueurs) compte.set(j.role, (compte.get(j.role) ?? 0) + 1);
  return (Object.keys(ROLES) as RoleId[])
    .filter((role) => compte.has(role))
    .map((role) => ({ role, nombre: compte.get(role)! }));
}

/** Ordre des réveils de la nuit d'explication : Spectres d'abord, puis Doubles, Trinité, Anathème, Adepte. */
export function ordreExplication(etat: EtatPartie): RoleId[] {
  const presents = new Set(etat.joueurs.map((j) => j.role));
  const ordre: RoleId[] = [];
  if (etat.joueurs.some((j) => j.camp === 'spectres' || j.role === 'maudit')) ordre.push('spectre');
  for (const r of rolesDeLExplication()) if (presents.has(r.id)) ordre.push(r.id);
  return ordre;
}

/** Qui se réveille : pour les Spectres, tout le camp et le Maudit (qui fait semblant d'en être). */
function membres(etat: EtatPartie, role: RoleId): JoueurId[] {
  return vivants(etat)
    .filter((j) => (role === 'spectre' ? j.camp === 'spectres' || j.role === 'maudit' : j.role === role))
    .map((j) => j.id);
}

/** Modèle / mentor : n'importe quel autre joueur (un Spectre compris). */
function cibles(etat: EtatPartie, role: RoleId, quiAgit: JoueurId[]): JoueurId[] {
  if (!CHOIX[role]) return [];
  return vivants(etat)
    .filter((j) => !quiAgit.includes(j.id))
    .map((j) => j.id);
}

/** Prochain réveil à partir de `phase.etape` (l'étape 0 est la présentation des rôles). */
function trouverReveil(etat: EtatPartie, phase: PhaseExplication): { index: number; etape: EtapeReveil } | null {
  const ordre = ordreExplication(etat);
  for (let index = Math.max(0, phase.etape - 1); index < ordre.length; index++) {
    const role = ordre[index];
    const quiAgit = membres(etat, role);
    if (quiAgit.length > 0) {
      return { index, etape: { type: 'reveil', role, acteurs: quiAgit, ciblesPossibles: cibles(etat, role, quiAgit) } };
    }
  }
  return null;
}

/** Étape en cours de la nuit d'explication, ou null si elle est finie. */
export function etapeExplication(etat: EtatPartie, phase: PhaseExplication): Etape | null {
  if (phase.etape === 0) return { type: 'presentation', roles: rolesEnJeu(etat) };
  return trouverReveil(etat, phase)?.etape ?? null;
}

/** Applique l'action du MJ pendant la nuit d'explication. */
export function appliquerExplication(etat: EtatPartie, phase: PhaseExplication, action: Action): EtatPartie {
  let suivant: EtatPartie = structuredClone(etat);
  suivant.infoMJ = null;

  if (phase.etape === 0) {
    if (action.type !== 'passer') throw new Error('Présente les rôles, puis continue avec « passer »');
    suivant.phase = { type: 'explication', etape: 1 };
  } else {
    const trouve = trouverReveil(etat, phase);
    if (!trouve) throw new Error("La nuit d'explication est finie");
    const { index, etape } = trouve;
    const nomRole = ROLES[etape.role].nom;
    const attendue = CHOIX[etape.role];

    if (attendue) {
      if (action.type !== attendue) throw new Error(`${nomRole} doit faire son choix`);
      if (action.type !== 'anatheme-choisir-modele' && action.type !== 'adepte-choisir-mentor') return etat;
      verifierCible(etape.ciblesPossibles, action.cible, nomRole);
      const acteur = trouverJoueur(suivant, etape.acteurs[0]);
      acteur.memoire.lien = action.cible;
      const quoi = etape.role === 'anatheme' ? 'modèle' : 'mentor';
      suivant.infoMJ = `${nomJoueur(acteur)} a choisi pour ${quoi} ${nomJoueur(trouverJoueur(suivant, action.cible))}`;
    } else {
      if (action.type !== 'passer') throw new Error(`${nomRole} : reconnaissance, continue avec « passer »`);
      const noms = etape.acteurs.map((id) => nomJoueur(trouverJoueur(suivant, id))).join(', ');
      suivant.infoMJ = `${GROUPES[etape.role] ?? nomRole} : ${noms}`;
    }
    suivant.phase = { type: 'explication', etape: index + 2 };
  }

  if (etapeExplication(suivant, suivant.phase as PhaseExplication) === null) suivant = finExplication(suivant);
  return suivant;
}

/** Fin de l'explication : élection de l'Alpha (jour 0), ou directement la première nuit si l'Alpha est une carte. */
function finExplication(etat: EtatPartie): EtatPartie {
  if (etat.alpha !== null) return { ...debutDeNuit(etat, 1), infoMJ: etat.infoMJ };
  return { ...etat, phase: { type: 'jour', numero: 0 } };
}
