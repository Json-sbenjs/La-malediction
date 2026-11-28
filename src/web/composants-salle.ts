// Morceaux d'écran partagés par « Salle sur mesure » (generateur.ts) et « Modifier la salle » (ajustement.ts),
// pour que les deux écrans se ressemblent : ligne d'un rôle avec son compteur − / +, aperçu du plan.
import { ROLES, type Plan, type RoleId } from '../engine';
import { densite } from './densite';
import { SI_PAS_D_IMAGE } from './images';

/** Ordre d'affichage des rôles dans les compteurs de composition. */
export const ORDRE_ROLES: RoleId[] = [
  'spectre', 'pelerin', 'oracle', 'protecteur', 'sainte', 'courtisane', 'instinct', 'vipere',
  'main-noire', 'anatheme', 'adepte', 'usurpateur', 'trinite', 'alpha',
  'devoue', 'augure', 'inquisiteur', 'medium', 'enchanteur', 'sacrifie', 'bourreau', 'doubles',
  'originel', 'maudit', 'sectaire', 'envouteur', 'necromancien',
];

export function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function bouton(texte: string, attrs: string, classe = ''): string {
  return `<button type="button" class="${classe}" ${attrs}>${texte}</button>`;
}

/**
 * Ligne d'un rôle : vignette, nom, compteur − / + et nombre de cartes.
 * `prefixe` donne les attributs des boutons : `data-<prefixe>-moins="role"` et `data-<prefixe>-plus="role"`.
 */
export function ligneRole(prefixe: string, role: RoleId, n: number, plusPossible: boolean): string {
  const def = ROLES[role];
  // La Trinité va par 3 et les Doubles par 2 : le groupe entier ou rien.
  const pas = role === 'trinite' || role === 'doubles' ? def.cartes : 1;
  return `
    <li class="ligne-role camp-${def.camp}">
      <img class="vignette" src="${import.meta.env.BASE_URL}roles/${role}.webp" alt="" ${SI_PAS_D_IMAGE}>
      <span class="nom-role">${echapper(def.nom)}</span>
      <span class="compteur">
        ${bouton('−', `data-${prefixe}-moins="${role}" data-pas="${pas}" aria-label="Un ${echapper(def.nom)} de moins" ${n === 0 ? 'disabled' : ''}`, 'rond')}
        <strong>${n}</strong>
        ${bouton('+', `data-${prefixe}-plus="${role}" data-pas="${pas}" aria-label="Un ${echapper(def.nom)} de plus" ${plusPossible ? '' : 'disabled'}`, 'rond')}
      </span>
      <span class="max">/ ${def.cartes}</span>
    </li>`;
}

/**
 * Aperçu du plan : sièges touchables (`data-<prefixe>-siege`) et déplaçables par appui long.
 * `choisi` = siège touché en premier pour un échange de rôles.
 */
export function apercuSalle(prefixe: string, plan: Plan, choisi: number | null): string {
  const sieges = plan.sieges
    .map(
      (s) => `
      <button type="button" class="siege actif camp-${ROLES[s.role].camp} ${choisi === s.numero ? 'choisi' : ''}"
        data-${prefixe}-siege="${s.numero}" data-deplacable="${s.numero}" style="--x:${s.position.x};--y:${s.position.y}">
        <img class="vignette" src="${import.meta.env.BASE_URL}roles/${s.role}.webp" alt="" draggable="false" ${SI_PAS_D_IMAGE}>
        <span class="num">${s.numero}</span>
        <span class="role">${echapper(ROLES[s.role].nom)}</span>
      </button>`,
    )
    .join('');
  return `<section class="salle ${densite(plan.nbJoueurs)}" aria-label="Aperçu de la salle">${sieges}</section>`;
}
