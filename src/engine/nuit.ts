import { nomJoueur, trouverJoueur, verifierCible, vivants } from './outils';
import { CHOIX_OBLIGATOIRE, choisirLien, ciblesPremiereNuit, reconnaissance } from './premiere-nuit';
import { mortsDeLaNuit, resoudreNuit } from './resolution-nuit';
import { ROLES, rolesQuiSeReveillent } from './roles';
import type { Action, Etape, EtatPartie, Joueur, JoueurId, RoleId } from './types';

type EtapeReveil = Extract<Etape, { type: 'reveil' }>;
type PhaseNuit = Extract<EtatPartie['phase'], { type: 'nuit' }>;

/** Action attendue pour chaque rôle de nuit déjà codé. Les autres ne peuvent que « passer » pour l'instant. */
const ACTION_DU_ROLE: Partial<Record<RoleId, Action['type']>> = {
  courtisane: 'courtisane-occuper',
  protecteur: 'protecteur-proteger',
  oracle: 'oracle-voir',
  instinct: 'instinct-designer',
  spectre: 'spectres-attaquer',
  sainte: 'sainte-sauver',
  vipere: 'vipere-empoisonner',
  inquisiteur: 'inquisiteur-marquer',
  enchanteur: 'enchanteur-enchanter',
  originel: 'originel-infecter',
  maudit: 'maudit-devorer',
  sectaire: 'sectaire-enroler',
  envouteur: 'envouteur-charmer',
  necromancien: 'necromancien-ressusciter',
  ...CHOIX_OBLIGATOIRE,
};

/** Groupes qui se reconnaissent la première nuit (le MJ valide avec « passer »). */
const GROUPES: Partial<Record<RoleId, string>> = { trinite: 'Trinité', doubles: 'Doubles' };

/** Ordre de réveil de la nuit : seulement les rôles présents dans la partie. */
export function ordreDeNuit(etat: EtatPartie, numero: number): RoleId[] {
  const presents = new Set<RoleId>(etat.joueurs.map((j) => j.role));
  // Les Spectres se réveillent dès qu'il existe un joueur du camp (Originel, victime infectée…).
  if (etat.joueurs.some((j) => j.camp === 'spectres' || j.role === 'maudit')) presents.add('spectre');
  return rolesQuiSeReveillent(numero === 1)
    .map((r) => r.id)
    .filter((id) => presents.has(id));
}

/**
 * « si en vie » → « si occupé » → pouvoir encore disponible.
 * Les Spectres : tous les vivants du camp Spectres (Anathème basculé, Originel, infectés)
 * et le Maudit, qui se réveille avec eux. Personne ne se réveille si l'Enchanteur les a endormis.
 */
export function acteurs(etat: EtatPartie, role: RoleId, numero: number): JoueurId[] {
  // Conditions propres à certains rôles, avant de regarder les joueurs.
  const morts = etat.joueurs.some((j) => !j.vivant);
  const endormi = etat.enchantement && (role === 'spectre' || role === 'originel' || role === 'maudit');
  if (endormi) return [];
  if (role === 'originel' && etat.victimeSpectres === null) return []; // rien à transformer
  if (role === 'maudit' && numero % 2 !== 0) return []; // une nuit sur deux : les nuits paires
  if ((role === 'medium' || role === 'necromancien') && !morts) return []; // il faut un mort

  const unique = ROLES[role].usageUnique;
  const estDuRole = (j: Joueur) =>
    role === 'spectre' ? j.camp === 'spectres' || j.role === 'maudit' : j.role === role;
  return vivants(etat)
    .filter(
      (j) =>
        estDuRole(j) &&
        !j.statuts.occupe &&
        !j.memoire.pouvoirPerdu &&
        !(unique && j.memoire.pouvoirUtilise),
    )
    .map((j) => j.id);
}

/** Qui le rôle a le droit de viser cette nuit. */
export function ciblesPossibles(etat: EtatPartie, role: RoleId, numero: number): JoueurId[] {
  const quiAgit = acteurs(etat, role, numero);
  const cibles = ciblesDuRole(etat, role, numero, quiAgit);
  // Un enrôlé ne peut jamais viser le Sectaire avec son pouvoir.
  const enroles = quiAgit.some((id) => etat.joueurs.find((j) => j.id === id)?.statuts.enrole);
  if (!enroles) return cibles;
  const sectaires = etat.joueurs.filter((j) => j.role === 'sectaire').map((j) => j.id);
  return cibles.filter((id) => !sectaires.includes(id));
}

function ciblesDuRole(etat: EtatPartie, role: RoleId, numero: number, quiAgit: JoueurId[]): JoueurId[] {
  const enVie = vivants(etat);
  const saufActeurs = enVie.filter((j) => !quiAgit.includes(j.id));
  const ciblePrecedente = (): JoueurId | null => {
    const acteur = etat.joueurs.find((j) => j.id === quiAgit[0]);
    const derniere = acteur?.memoire.derniereCible;
    return derniere && derniere.nuit === numero - 1 ? derniere.cible : null;
  };

  switch (role) {
    case 'spectre':
      // Les Spectres ne visent ni un des leurs ni le Maudit (qui se réveille avec eux).
      return enVie.filter((j) => j.camp !== 'spectres' && j.role !== 'maudit').map((j) => j.id);
    case 'originel':
      return etat.victimeSpectres === null ? [] : [etat.victimeSpectres];
    case 'maudit':
      return enVie.filter((j) => j.camp === 'spectres').map((j) => j.id);
    case 'inquisiteur':
      return saufActeurs.map((j) => j.id);
    case 'sectaire':
      return saufActeurs.filter((j) => !j.statuts.enrole).map((j) => j.id);
    case 'envouteur':
      return saufActeurs.filter((j) => !j.statuts.charme).map((j) => j.id);
    case 'necromancien':
      return etat.joueurs.filter((j) => !j.vivant).map((j) => j.id);
    case 'courtisane': {
      const interdite = ciblePrecedente();
      return saufActeurs.filter((j) => j.id !== interdite).map((j) => j.id);
    }
    case 'protecteur': {
      const interdite = ciblePrecedente();
      return enVie.filter((j) => j.id !== interdite).map((j) => j.id);
    }
    case 'sainte':
      // La Sainte ne peut sauver que la victime des Spectres.
      return etat.victimeSpectres === null ? [] : [etat.victimeSpectres];
    case 'oracle':
    case 'instinct':
    case 'vipere':
      return saufActeurs.map((j) => j.id);
    case 'anatheme':
    case 'adepte':
      return ciblesPremiereNuit(etat, quiAgit);
    case 'trinite':
    case 'doubles':
    case 'medium':
    case 'enchanteur':
      return [];
    default:
      return enVie.map((j) => j.id);
  }
}

/**
 * Cherche la prochaine étape de la nuit à partir de `phase.etape`.
 * Un rôle sans acteur (mort, occupé, pouvoir perdu ou déjà utilisé) est sauté.
 */
function trouverEtape(etat: EtatPartie, phase: PhaseNuit): { index: number; etape: EtapeReveil } | null {
  const ordre = ordreDeNuit(etat, phase.numero);
  for (let index = phase.etape; index < ordre.length; index++) {
    const role = ordre[index];
    const quiAgit = acteurs(etat, role, phase.numero);
    if (quiAgit.length > 0) {
      return {
        index,
        etape: { type: 'reveil', role, acteurs: quiAgit, ciblesPossibles: ciblesPossibles(etat, role, phase.numero) },
      };
    }
  }
  return null;
}

export function etapeNuit(etat: EtatPartie, phase: PhaseNuit): Etape {
  return (
    trouverEtape(etat, phase)?.etape ?? { type: 'resolution-nuit', numero: phase.numero, morts: mortsDeLaNuit(etat) }
  );
}

/** Remet à zéro ce qui ne dure qu'une nuit et repart du premier rôle. */
export function debutDeNuit(etat: EtatPartie, numero: number): EtatPartie {
  return {
    ...etat,
    // Occupé et protégé ne durent qu'une nuit ; enrôlé et charmé restent.
    joueurs: etat.joueurs.map((j) => ({ ...j, statuts: { ...j.statuts, occupe: false, protege: false } })),
    phase: { type: 'nuit', numero, etape: 0 },
    victimeSpectres: null,
    sauveeParSainte: false,
    empoisonne: null,
    enchantement: false,
    infecte: null,
    victimeMaudit: null,
    marque: null,
    infoMJ: null,
  };
}

/** Applique l'action du MJ pour le rôle réveillé. Ne modifie pas `etat` : renvoie un nouvel état. */
export function appliquerNuit(etat: EtatPartie, phase: PhaseNuit, action: Action): EtatPartie {
  const trouve = trouverEtape(etat, phase);
  if (!trouve) {
    if (action.type !== 'passer') throw new Error('Fin de nuit : valider la résolution avec « passer »');
    return resoudreNuit(etat, phase.numero);
  }
  const { index, etape } = trouve;
  const nomRole = ROLES[etape.role].nom;
  const attendue = ACTION_DU_ROLE[etape.role];
  if (action.type !== 'passer' && action.type !== attendue) {
    throw new Error(`Action « ${action.type} » impossible : c'est au tour de ${nomRole}`);
  }
  if (action.type === 'passer' && CHOIX_OBLIGATOIRE[etape.role]) {
    throw new Error(`${nomRole} doit faire son choix`);
  }

  const suivant: EtatPartie = structuredClone(etat);
  suivant.phase = { ...phase, etape: index + 1 };
  suivant.infoMJ = null;
  const joueur = (id: JoueurId) => trouverJoueur(suivant, id);
  const acteur = joueur(etape.acteurs[0]);
  const viser = (cible: JoueurId) => verifierCible(etape.ciblesPossibles, cible, nomRole);

  switch (action.type) {
    case 'courtisane-occuper':
      viser(action.cible);
      joueur(action.cible).statuts.occupe = true;
      acteur.memoire.derniereCible = { nuit: phase.numero, cible: action.cible };
      break;

    case 'protecteur-proteger':
      viser(action.cible);
      joueur(action.cible).statuts.protege = true;
      acteur.memoire.derniereCible = { nuit: phase.numero, cible: action.cible };
      break;

    case 'oracle-voir': {
      viser(action.cible);
      const cible = joueur(action.cible);
      suivant.infoMJ = `${nomJoueur(cible)} est ${ROLES[cible.role].nom}`;
      break;
    }

    case 'instinct-designer': {
      const cibles = action.cibles;
      if (new Set(cibles).size !== 3) {
        throw new Error("L'Instinct doit désigner 3 joueurs différents");
      }
      cibles.forEach(viser);
      const trouveSpectre = cibles.some((c) => joueur(c).camp === 'spectres');
      if (trouveSpectre) {
        suivant.infoMJ = "L'Instinct garde son pouvoir : il y a un Spectre parmi les 3";
      } else {
        acteur.memoire.pouvoirPerdu = true;
        suivant.infoMJ = "L'Instinct perd son pouvoir : aucun Spectre parmi les 3";
      }
      break;
    }

    case 'spectres-attaquer':
      if (action.cible !== null) viser(action.cible);
      suivant.victimeSpectres = action.cible;
      break;

    case 'sainte-sauver':
      if (!action.utiliser) break;
      if (etat.victimeSpectres === null) throw new Error("Pas de victime à sauver cette nuit");
      suivant.sauveeParSainte = true;
      acteur.memoire.pouvoirUtilise = true;
      break;

    case 'vipere-empoisonner':
      if (action.cible === null) break;
      viser(action.cible);
      suivant.empoisonne = action.cible;
      acteur.memoire.pouvoirUtilise = true;
      break;

    case 'anatheme-choisir-modele':
    case 'adepte-choisir-mentor':
      viser(action.cible);
      suivant.infoMJ = choisirLien(suivant, acteur, action.cible);
      break;

    case 'inquisiteur-marquer':
      viser(action.cible);
      suivant.marque = action.cible;
      suivant.infoMJ = `${nomJoueur(joueur(action.cible))} est marqué : une voix contre lui au vote`;
      break;

    case 'enchanteur-enchanter':
      if (!action.utiliser) break;
      suivant.enchantement = true;
      acteur.memoire.pouvoirUtilise = true;
      suivant.infoMJ = 'Les Spectres sont endormis : ils ne se réveillent pas cette nuit';
      break;

    case 'originel-infecter': {
      if (!action.utiliser) break;
      const victime = etat.victimeSpectres;
      if (victime === null) throw new Error('Pas de victime à transformer');
      suivant.infecte = victime;
      suivant.victimeSpectres = null; // elle ne meurt pas : elle sera transformée au matin
      acteur.memoire.pouvoirUtilise = true;
      suivant.infoMJ = `${nomJoueur(joueur(victime))} sera transformé en Spectre (sauf s'il est protégé)`;
      break;
    }

    case 'maudit-devorer':
      if (action.cible === null) break;
      viser(action.cible);
      suivant.victimeMaudit = action.cible;
      break;

    case 'sectaire-enroler': {
      viser(action.cible);
      const cible = joueur(action.cible);
      cible.statuts.enrole = true;
      suivant.infoMJ = `Réveille ${nomJoueur(cible)} et montre-lui le Sectaire : ${nomJoueur(acteur)}`;
      break;
    }

    case 'envouteur-charmer': {
      const cibles = action.cibles;
      const attendu = Math.min(2, etape.ciblesPossibles.length);
      if (cibles.length !== attendu || new Set(cibles).size !== cibles.length) {
        throw new Error(`L'Envoûteur doit charmer ${attendu} joueur(s) différent(s)`);
      }
      cibles.forEach(viser);
      for (const c of cibles) joueur(c).statuts.charme = true;
      suivant.infoMJ = `Charmés : ${cibles.map((c) => nomJoueur(joueur(c))).join(', ')}`;
      break;
    }

    case 'necromancien-ressusciter': {
      if (action.cible === null) break;
      viser(action.cible);
      const revenant = joueur(action.cible);
      revenant.vivant = true;
      revenant.revele = true;
      revenant.role = 'revenant';
      revenant.camp = 'necromancien';
      revenant.memoire = { pouvoirUtilise: false, pouvoirPerdu: false, derniereCible: null, lien: null };
      revenant.statuts = { occupe: false, protege: false, enrole: false, charme: false };
      acteur.memoire.pouvoirUtilise = true;
      suivant.infoMJ =
        `${nomJoueur(revenant)} revient en Revenant (à annoncer au matin). ` +
        `Montre-lui le Nécromancien : ${nomJoueur(acteur)}`;
      break;
    }

    case 'passer': {
      // Reconnaissance (Trinité, Doubles) : le MJ a montré les membres, on continue.
      const groupe = GROUPES[etape.role];
      if (groupe) suivant.infoMJ = `${groupe} : ${reconnaissance(suivant, etape.acteurs)}`;
      break;
    }
  }

  return suivant;
}
