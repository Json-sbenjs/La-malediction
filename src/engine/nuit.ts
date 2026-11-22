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
};

/** « Paul (siège 3) » ou « siège 3 ». */
export function nomJoueur(joueur: Joueur): string {
  return joueur.nom ? `${joueur.nom} (siège ${joueur.id})` : `siège ${joueur.id}`;
}

/** Ordre de réveil de la nuit : seulement les rôles présents dans la partie. */
export function ordreDeNuit(etat: EtatPartie, numero: number): RoleId[] {
  const presents = new Set(etat.joueurs.map((j) => j.role));
  return rolesQuiSeReveillent(numero === 1)
    .map((r) => r.id)
    .filter((id) => presents.has(id));
}

/** « si en vie » → « si occupé » → pouvoir encore disponible. */
export function acteurs(etat: EtatPartie, role: RoleId): JoueurId[] {
  const unique = ROLES[role].usageUnique;
  return etat.joueurs
    .filter(
      (j) =>
        j.role === role &&
        j.vivant &&
        !j.statuts.occupe &&
        !j.memoire.pouvoirPerdu &&
        !(unique && j.memoire.pouvoirUtilise),
    )
    .map((j) => j.id);
}

/** Qui le rôle a le droit de viser cette nuit. */
export function ciblesPossibles(etat: EtatPartie, role: RoleId, numero: number): JoueurId[] {
  const quiAgit = acteurs(etat, role);
  const vivants = etat.joueurs.filter((j) => j.vivant);
  const ciblePrecedente = (): JoueurId | null => {
    const acteur = etat.joueurs.find((j) => j.id === quiAgit[0]);
    const derniere = acteur?.memoire.derniereCible;
    return derniere && derniere.nuit === numero - 1 ? derniere.cible : null;
  };

  switch (role) {
    case 'spectre':
      return vivants.filter((j) => j.role !== 'spectre').map((j) => j.id);
    case 'courtisane': {
      const interdite = ciblePrecedente();
      return vivants.filter((j) => !quiAgit.includes(j.id) && j.id !== interdite).map((j) => j.id);
    }
    case 'protecteur': {
      const interdite = ciblePrecedente();
      return vivants.filter((j) => j.id !== interdite).map((j) => j.id);
    }
    case 'oracle':
    case 'instinct':
      return vivants.filter((j) => !quiAgit.includes(j.id)).map((j) => j.id);
    default:
      return vivants.map((j) => j.id);
  }
}

/**
 * Cherche la prochaine étape de la nuit à partir de `phase.etape`.
 * Un rôle sans acteur (mort, occupé, pouvoir perdu) est sauté.
 */
function trouverEtape(etat: EtatPartie, phase: PhaseNuit): { index: number; etape: EtapeReveil } | null {
  const ordre = ordreDeNuit(etat, phase.numero);
  for (let index = phase.etape; index < ordre.length; index++) {
    const role = ordre[index];
    const quiAgit = acteurs(etat, role);
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
  return trouverEtape(etat, phase)?.etape ?? { type: 'resolution-nuit', numero: phase.numero };
}

/** Remet à zéro ce qui ne dure qu'une nuit et repart du premier rôle. */
export function debutDeNuit(etat: EtatPartie, numero: number): EtatPartie {
  return {
    ...etat,
    joueurs: etat.joueurs.map((j) => ({ ...j, statuts: { occupe: false, protege: false } })),
    phase: { type: 'nuit', numero, etape: 0 },
    victimeSpectres: null,
    infoMJ: null,
  };
}

function verifierCible(etape: EtapeReveil, cible: JoueurId): void {
  if (!etape.ciblesPossibles.includes(cible)) {
    throw new Error(`${ROLES[etape.role].nom} ne peut pas viser le siège ${cible}`);
  }
}

/** Applique l'action du MJ pour le rôle réveillé. Ne modifie pas `etat` : renvoie un nouvel état. */
export function appliquerNuit(etat: EtatPartie, phase: PhaseNuit, action: Action): EtatPartie {
  const trouve = trouverEtape(etat, phase);
  if (!trouve) {
    throw new Error('Résolution de la nuit : pas encore codée (semaine 3)');
  }
  const { index, etape } = trouve;
  const attendue = ACTION_DU_ROLE[etape.role];
  if (action.type !== 'passer' && action.type !== attendue) {
    throw new Error(`Action « ${action.type} » impossible : c'est au tour de ${ROLES[etape.role].nom}`);
  }

  const suivant: EtatPartie = structuredClone(etat);
  suivant.phase = { ...phase, etape: index + 1 };
  suivant.infoMJ = null;
  const joueur = (id: JoueurId): Joueur => {
    const j = suivant.joueurs.find((x) => x.id === id);
    if (!j) throw new Error(`Siège ${id} inconnu`);
    return j;
  };
  const acteur = joueur(etape.acteurs[0]);

  switch (action.type) {
    case 'courtisane-occuper':
      verifierCible(etape, action.cible);
      joueur(action.cible).statuts.occupe = true;
      acteur.memoire.derniereCible = { nuit: phase.numero, cible: action.cible };
      break;

    case 'protecteur-proteger':
      verifierCible(etape, action.cible);
      joueur(action.cible).statuts.protege = true;
      acteur.memoire.derniereCible = { nuit: phase.numero, cible: action.cible };
      break;

    case 'oracle-voir': {
      verifierCible(etape, action.cible);
      const cible = joueur(action.cible);
      suivant.infoMJ = `${nomJoueur(cible)} est ${ROLES[cible.role].nom}`;
      break;
    }

    case 'instinct-designer': {
      const cibles = action.cibles;
      if (new Set(cibles).size !== 3) {
        throw new Error("L'Instinct doit désigner 3 joueurs différents");
      }
      cibles.forEach((c) => verifierCible(etape, c));
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
      if (action.cible !== null) verifierCible(etape, action.cible);
      suivant.victimeSpectres = action.cible;
      break;

    case 'passer':
      break;
  }

  return suivant;
}
