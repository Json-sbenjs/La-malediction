// Écran de choix, bloc « Ajuster la partie » : le groupe annoncé à 15 arrive à 13 ou à 16.
// Le MJ part du plan prévu, retire ou ajoute des sièges, change un rôle, puis lance la partie.
// Les règles (limites, cartes disponibles, plan valide) sont dans src/engine/ajustement.ts.
import {
  MAX_JOUEURS,
  MIN_JOUEURS,
  ROLES,
  cartesRestantes,
  equilibreSpectres,
  validerPlan,
  type Plan,
  type RoleId,
} from '../engine';
import { densite } from './densite';
import { SI_PAS_D_IMAGE } from './images';

export interface EtatAjustement {
  /** Plan de ce soir, retouché à partir du plan prévu. */
  plan: Plan;
  /** Nombre de joueurs du plan prévu (pour afficher « prévu : 15 »). */
  prevus: number;
  /** Siège touché pour changer son rôle ou le retirer. */
  siegeChoisi: number | null;
  /** Rôle du prochain siège ajouté. */
  roleAjout: RoleId;
  /** Prénoms saisis avant d'ajuster, remis tels quels si le MJ revient au plan prévu. */
  prenomsPrevus: string[];
}

export function nouvelAjustement(plan: Plan, prenoms: string[]): EtatAjustement {
  return {
    plan: structuredClone(plan),
    prevus: plan.nbJoueurs,
    siegeChoisi: null,
    roleAjout: 'pelerin',
    prenomsPrevus: [...prenoms],
  };
}

/** Rôles qu'on peut poser sur un siège, dans l'ordre de la fiche des rôles. */
const ROLES_POSABLES = (Object.keys(ROLES) as RoleId[]).filter((r) => !ROLES[r].jamaisDistribue);

function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function bouton(texte: string, attrs: string, classe = ''): string {
  return `<button type="button" class="${classe}" ${attrs}>${texte}</button>`;
}

/** Liste déroulante des rôles : seulement ceux qui ont encore une carte libre (plus le rôle actuel). */
function choixRole(plan: Plan, attrs: string, actuel: RoleId): string {
  const options = ROLES_POSABLES.filter((r) => r === actuel || cartesRestantes(plan, r) > 0)
    .map((r) => `<option value="${r}" ${r === actuel ? 'selected' : ''}>${echapper(ROLES[r].nom)}</option>`)
    .join('');
  return `<select class="champ" ${attrs}>${options}</select>`;
}

function apercu(plan: Plan, choisi: number | null): string {
  const sieges = plan.sieges
    .map(
      (s) => `
      <button type="button" class="siege actif camp-${ROLES[s.role].camp} ${choisi === s.numero ? 'choisi' : ''}"
        data-ajuster-siege="${s.numero}" data-deplacable="${s.numero}" style="--x:${s.position.x};--y:${s.position.y}">
        <img class="vignette" src="${import.meta.env.BASE_URL}roles/${s.role}.webp" alt="" draggable="false" ${SI_PAS_D_IMAGE}>
        <span class="num">${s.numero}</span>
        <span class="role">${echapper(ROLES[s.role].nom)}</span>
      </button>`,
    )
    .join('');
  return `<section class="salle ${densite(plan.nbJoueurs)}" aria-label="Plan de la partie">${sieges}</section>`;
}

/** Le bloc d'ajustement, affiché sous le choix de la salle. */
export function blocAjustement(a: EtatAjustement): string {
  const { plan } = a;
  const n = plan.nbJoueurs;
  const ecart = n - a.prevus;
  const { actuels, conseilles } = equilibreSpectres(plan);
  const erreurs = validerPlan(plan);
  const choisi = plan.sieges.find((s) => s.numero === a.siegeChoisi);
  // Le rôle à ajouter doit encore avoir une carte libre : sinon on propose le premier disponible.
  const roleAjout =
    cartesRestantes(plan, a.roleAjout) > 0 ? a.roleAjout : ROLES_POSABLES.find((r) => cartesRestantes(plan, r) > 0);

  return `
    <section class="carte ajustement">
      <h2>Partie de ce soir : ${n} joueurs
        <span class="max">(prévu : ${a.prevus}${ecart === 0 ? '' : `, ${ecart > 0 ? '+' : ''}${ecart}`})</span></h2>
      <p class="${conseilles === null || actuels === conseilles ? '' : 'attention'}">
        Spectres : ${actuels}${conseilles === null ? '' : ` — conseillé pour ${n} joueurs : ${conseilles}`}
      </p>
      <p>Touche un siège pour changer son rôle ou le retirer. Reste appuyé pour le déplacer.</p>
      ${apercu(plan, a.siegeChoisi)}
      ${
        choisi
          ? `<div class="outils-siege">
               <strong>Siège ${choisi.numero}</strong>
               ${choixRole(plan, 'data-ajuster-role aria-label="Rôle du siège"', choisi.role)}
               ${bouton('Retirer ce siège', `data-retirer-siege="${choisi.numero}" ${n <= MIN_JOUEURS ? 'disabled' : ''}`)}
             </div>`
          : ''
      }
      <div class="outils-siege">
        ${roleAjout ? choixRole(plan, 'data-role-ajout aria-label="Rôle du siège ajouté"', roleAjout) : ''}
        ${bouton('+ Ajouter un siège', `data-ajouter-siege ${n >= MAX_JOUEURS || !roleAjout ? 'disabled' : ''}`)}
      </div>
      ${n <= MIN_JOUEURS ? `<p class="max">${MIN_JOUEURS} joueurs au minimum.</p>` : ''}
      ${
        erreurs.length > 0
          ? `<ul class="attention">${erreurs.map((e) => `<li>${echapper(e)}</li>`).join('')}</ul>`
          : ''
      }
      <div class="choix-ligne">
        ${bouton('Revenir au plan prévu', 'data-annuler-ajustement', 'discret')}
        ${bouton('Enregistrer comme salle', `data-enregistrer-ajustement ${erreurs.length > 0 ? 'disabled' : ''}`)}
      </div>
    </section>`;
}
