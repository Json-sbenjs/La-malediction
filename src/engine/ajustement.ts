// Ajuster une salle juste avant de lancer la partie : les groupes de clients annoncent 15 joueurs
// et arrivent à 13 ou à 16. Le MJ part du plan prévu, retire ou ajoute des sièges, change un rôle,
// puis lance la partie (et peut enregistrer le plan ajusté comme une nouvelle salle).
// Le plan obtenu est vérifié par validerPlan au moment de lancer, pas à chaque retouche :
// on peut passer par un état incomplet (ex. Trinité à 2 le temps de changer le 3e rôle).
import { compositionConseillee, maxJoueursPossible, melanger } from './generateur';
import { MAX_JOUEURS, MIN_JOUEURS, compterRoles, type Plan, type Siege } from './plans';
import { ROLES } from './roles';
import type { RoleId } from './types';

/** Recalcule l'identifiant d'un plan après un changement du nombre de sièges. */
function avecSieges(plan: Plan, sieges: Siege[]): Plan {
  return { ...plan, id: `${plan.salle}-${sieges.length}`, nbJoueurs: sieges.length, sieges };
}

/**
 * Retire un siège (un joueur absent). Les sièges suivants sont renumérotés
 * (le 8 devient le 7…) et gardent leur place sur le plan.
 */
export function retirerSiege(plan: Plan, numero: number): Plan {
  if (!plan.sieges.some((s) => s.numero === numero)) throw new Error('Siège inconnu');
  if (plan.sieges.length <= MIN_JOUEURS) throw new Error(`Il faut au moins ${MIN_JOUEURS} joueurs`);
  const sieges = [...plan.sieges]
    .sort((a, b) => a.numero - b.numero)
    .filter((s) => s.numero !== numero)
    .map((s, i) => ({ ...s, numero: i + 1 }));
  return avecSieges(plan, sieges);
}

/** Nombre de cartes encore libres pour un rôle sur ce plan (0 = le rôle est complet). */
export function cartesRestantes(plan: Plan, role: RoleId): number {
  return ROLES[role].cartes - (compterRoles(plan)[role] ?? 0);
}

/**
 * Place libre pour un nouveau siège : parmi une grille de points du plan,
 * celui qui est le plus loin de tous les sièges existants.
 */
export function placeLibre(plan: Plan): Siege['position'] {
  let meilleure = { x: 50, y: 50 };
  let distanceMax = -1;
  for (let x = 5; x <= 95; x += 5) {
    for (let y = 5; y <= 95; y += 5) {
      const proche = Math.min(
        ...plan.sieges.map((s) => Math.hypot(s.position.x - x, s.position.y - y)),
      );
      if (proche > distanceMax) {
        distanceMax = proche;
        meilleure = { x, y };
      }
    }
  }
  return meilleure;
}

/**
 * Ajoute un siège (un joueur en plus) avec le rôle choisi par le MJ.
 * Il prend le numéro suivant et se pose à une place libre ; le MJ peut ensuite le déplacer.
 */
export function ajouterSiege(plan: Plan, role: RoleId, position: Siege['position'] = placeLibre(plan)): Plan {
  if (plan.sieges.length >= Math.min(MAX_JOUEURS, maxJoueursPossible())) {
    throw new Error(`${MAX_JOUEURS} joueurs au maximum`);
  }
  if (ROLES[role].jamaisDistribue) throw new Error(`${ROLES[role].nom} ne se pose pas sur un siège`);
  if (cartesRestantes(plan, role) <= 0) throw new Error(`Toutes les cartes « ${ROLES[role].nom} » sont déjà posées`);
  return avecSieges(plan, [...plan.sieges, { numero: plan.sieges.length + 1, role, position }]);
}

/** Change le rôle d'un siège (ex. retirer un Spectre de trop en le passant Pèlerin). */
export function changerRole(plan: Plan, numero: number, role: RoleId): Plan {
  const siege = plan.sieges.find((s) => s.numero === numero);
  if (!siege) throw new Error('Siège inconnu');
  if (siege.role === role) return plan;
  if (ROLES[role].jamaisDistribue) throw new Error(`${ROLES[role].nom} ne se pose pas sur un siège`);
  if (cartesRestantes(plan, role) <= 0) throw new Error(`Toutes les cartes « ${ROLES[role].nom} » sont déjà posées`);
  return { ...plan, sieges: plan.sieges.map((s) => (s.numero === numero ? { ...s, role } : s)) };
}

/** La Trinité va par 3 et les Doubles par 2 : on les ajoute ou les retire en entier. */
export function tailleGroupe(role: RoleId): number {
  return role === 'trinite' || role === 'doubles' ? ROLES[role].cartes : 1;
}

/**
 * Ajoute un rôle (compteur « + » de l'écran Modifier la salle) : un siège de plus avec ce rôle,
 * ou tout le groupe pour la Trinité et les Doubles.
 */
export function ajouterRole(plan: Plan, role: RoleId): Plan {
  if (cartesRestantes(plan, role) < tailleGroupe(role)) {
    throw new Error(`Toutes les cartes « ${ROLES[role].nom} » sont déjà posées`);
  }
  let resultat = plan;
  for (let i = 0; i < tailleGroupe(role); i++) resultat = ajouterSiege(resultat, role);
  return resultat;
}

/**
 * Retire un rôle (compteur « − ») : le siège de ce rôle qui a le plus grand numéro, pour renuméroter
 * le moins de sièges possible (tout le groupe pour la Trinité et les Doubles).
 * Renvoie aussi les numéros retirés, dans l'ordre où on les a retirés (pour décaler les prénoms).
 */
export function retirerRole(plan: Plan, role: RoleId): { plan: Plan; retires: number[] } {
  const nombre = plan.sieges.filter((s) => s.role === role).length;
  if (nombre === 0) throw new Error(`Aucun siège « ${ROLES[role].nom} » à retirer`);
  let resultat = plan;
  const retires: number[] = [];
  for (let i = 0; i < Math.min(tailleGroupe(role), nombre); i++) {
    const dernier = Math.max(...resultat.sieges.filter((s) => s.role === role).map((s) => s.numero));
    resultat = retirerSiege(resultat, dernier);
    retires.push(dernier);
  }
  return { plan: resultat, retires };
}

/** Tire à nouveau les rôles au hasard sur les sièges, sans bouger les sièges. */
export function melangerRoles(plan: Plan, alea: () => number = Math.random): Plan {
  const roles = melanger(
    plan.sieges.map((s) => s.role),
    alea,
  );
  return { ...plan, sieges: plan.sieges.map((s, i) => ({ ...s, role: roles[i] })) };
}

/** Spectres prévus sur le plan, et le nombre conseillé pour ce nombre de joueurs (aide à l'équilibre). */
export function equilibreSpectres(plan: Plan): { actuels: number; conseilles: number | null } {
  const compte = compterRoles(plan);
  const actuels = (compte.spectre ?? 0) + (compte.originel ?? 0);
  try {
    return { actuels, conseilles: compositionConseillee(plan.nbJoueurs).spectre ?? 0 };
  } catch {
    return { actuels, conseilles: null }; // nombre de joueurs hors des limites
  }
}

/** Même salle et même nombre de joueurs : c'est le même plan sur l'écran de choix. */
function memePlace(a: Plan, b: Plan): boolean {
  return a.salle === b.salle && a.nbJoueurs === b.nbJoueurs;
}

/**
 * « Valider la salle » : la salle modifiée remplace la salle de base.
 * Renvoie la nouvelle liste de salles : l'ancienne est retirée, ainsi qu'une autre salle
 * du même nom au nouveau nombre de joueurs (l'interface demande avant de l'écraser).
 * L'identifiant suit le nom et le nombre de joueurs (`Salle-13`).
 */
export function remplacerSalle(plans: Plan[], ancienne: Plan, modifiee: Plan): Plan[] {
  const nouvelle: Plan = { ...modifiee, salle: ancienne.salle, id: `${ancienne.salle}-${modifiee.nbJoueurs}` };
  return [...plans.filter((p) => !memePlace(p, ancienne) && !memePlace(p, nouvelle)), nouvelle];
}
