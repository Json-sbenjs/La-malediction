// Écran « salle sur mesure » : le MJ choisit le nombre de joueurs, la forme et les rôles,
// l'appli tire les rôles sur les sièges, il peut retoucher puis enregistrer.
import {
  FORMES,
  MIN_JOUEURS,
  ROLES,
  compositionConseillee,
  deplacerSiege,
  echangerRoles,
  genererPlan,
  maxJoueursPossible,
  totalComposition,
  type Composition,
  type Forme,
  type Plan,
  type RoleId,
} from '../engine';
import { densite } from './densite';
import { SI_PAS_D_IMAGE } from './images';

export interface EtatGenerateur {
  salle: string;
  nbJoueurs: number;
  forme: Forme;
  composition: Composition;
  plan: Plan | null;
  /**
   * Positions des sièges déplacés à la main (dans l'ordre des sièges).
   * Un nouveau tirage les garde ; changer la forme ou le nombre de joueurs les oublie.
   */
  positions: Plan['sieges'][number]['position'][] | null;
  /** Premier siège touché pour un échange de rôles. */
  siegeChoisi: number | null;
  erreur: string | null;
}

export function nouveauGenerateur(): EtatGenerateur {
  return {
    salle: '',
    nbJoueurs: 10,
    forme: 'ovale',
    composition: compositionConseillee(10),
    plan: null,
    positions: null,
    siegeChoisi: null,
    erreur: null,
  };
}

/** Ordre d'affichage des rôles dans l'éditeur de composition. */
const ORDRE_ROLES: RoleId[] = [
  'spectre', 'pelerin', 'oracle', 'protecteur', 'sainte', 'courtisane', 'instinct', 'vipere',
  'main-noire', 'anatheme', 'adepte', 'usurpateur', 'trinite', 'alpha',
  'devoue', 'augure', 'inquisiteur', 'medium', 'enchanteur', 'sacrifie', 'bourreau', 'doubles',
  'originel', 'maudit', 'sectaire', 'envouteur', 'necromancien',
];

function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function bouton(texte: string, attrs: string, classe = ''): string {
  return `<button type="button" class="${classe}" ${attrs}>${texte}</button>`;
}

function ligneRole(g: EtatGenerateur, role: RoleId): string {
  const def = ROLES[role];
  const n = g.composition[role] ?? 0;
  // La Trinité va par 3 et les Doubles par 2 : le groupe entier ou rien.
  const pas = role === 'trinite' || role === 'doubles' ? def.cartes : 1;
  return `
    <li class="ligne-role camp-${def.camp}">
      <img class="vignette" src="${import.meta.env.BASE_URL}roles/${role}.webp" alt="" ${SI_PAS_D_IMAGE}>
      <span class="nom-role">${echapper(def.nom)}</span>
      <span class="compteur">
        ${bouton('−', `data-gen-moins="${role}" data-pas="${pas}" ${n === 0 ? 'disabled' : ''}`, 'rond')}
        <strong>${n}</strong>
        ${bouton('+', `data-gen-plus="${role}" data-pas="${pas}" ${n + pas > def.cartes ? 'disabled' : ''}`, 'rond')}
      </span>
      <span class="max">/ ${def.cartes}</span>
    </li>`;
}

function apercu(plan: Plan, choisi: number | null): string {
  const sieges = plan.sieges
    .map(
      (s) => `
      <button type="button" class="siege actif camp-${ROLES[s.role].camp} ${choisi === s.numero ? 'choisi' : ''}"
        data-gen-siege="${s.numero}" data-deplacable style="--x:${s.position.x};--y:${s.position.y}">
        <img class="vignette" src="${import.meta.env.BASE_URL}roles/${s.role}.webp" alt="" draggable="false" ${SI_PAS_D_IMAGE}>
        <span class="num">${s.numero}</span>
        <span class="role">${echapper(ROLES[s.role].nom)}</span>
      </button>`,
    )
    .join('');
  return `<section class="salle ${densite(plan.nbJoueurs)}" aria-label="Aperçu de la salle">${sieges}</section>`;
}

export function ecranGenerateur(g: EtatGenerateur): string {
  const total = totalComposition(g.composition);
  const juste = total === g.nbJoueurs;
  const max = maxJoueursPossible();

  return `
    <header class="barre">
      <span class="phase">🛠️ Salle sur mesure</span>
      ${bouton('Annuler', 'data-gen-fermer', 'discret')}
    </header>
    <main class="generateur">
      <section class="carte">
        <h2>Nom de la salle</h2>
        <input class="champ" data-gen-salle value="${echapper(g.salle)}" placeholder="ex. Salle des fêtes" autocomplete="off">

        <h2>Nombre de joueurs</h2>
        <div class="compteur grand">
          ${bouton('−', `data-gen-nb="-1" ${g.nbJoueurs <= MIN_JOUEURS ? 'disabled' : ''}`, 'rond')}
          <strong>${g.nbJoueurs}</strong>
          ${bouton('+', `data-gen-nb="1" ${g.nbJoueurs >= max ? 'disabled' : ''}`, 'rond')}
          <span class="max">de ${MIN_JOUEURS} à ${max}</span>
        </div>

        <h2>Forme de la salle</h2>
        <div class="choix-ligne">${FORMES.map((f) =>
          bouton(f.nom, `data-gen-forme="${f.id}"`, f.id === g.forme ? 'actif' : ''),
        ).join('')}</div>
      </section>

      <section class="carte">
        <h2>Rôles <span class="${juste ? 'ok' : 'attention'}">${total} / ${g.nbJoueurs}</span></h2>
        <ul class="roles">${ORDRE_ROLES.map((r) => ligneRole(g, r)).join('')}</ul>
        ${bouton('Composition conseillée', 'data-gen-conseil')}
      </section>

      <section class="carte">
        <h2>Tirage des rôles sur les sièges</h2>
        ${bouton(g.plan ? 'Mélanger à nouveau' : 'Tirer les rôles', `data-gen-tirer ${juste ? '' : 'disabled'}`, 'principal')}
        ${juste ? '' : `<p class="attention">Il faut autant de rôles que de joueurs.</p>`}
        ${
          g.plan
            ? `<p>Touche deux sièges pour échanger leurs rôles. Reste appuyé sur un siège pour le déplacer et le placer comme dans la vraie salle.</p>
               ${apercu(g.plan, g.siegeChoisi)}`
            : ''
        }
      </section>

      ${g.erreur ? `<p class="erreur">${echapper(g.erreur)}</p>` : ''}
      ${bouton('Enregistrer la salle', `data-gen-enregistrer ${g.plan ? '' : 'disabled'}`, 'principal')}
    </main>`;
}

export type ResultatClic = { type: 'fermer' } | { type: 'enregistrer'; plan: Plan } | null;

/** Traite un clic sur l'écran du générateur. Modifie `g`. */
export function clicGenerateur(g: EtatGenerateur, d: DOMStringMap): ResultatClic {
  g.erreur = null;
  const pas = Number(d.pas ?? 1);

  if (d.genFermer !== undefined) return { type: 'fermer' };

  if (d.genNb !== undefined) {
    g.nbJoueurs = Math.min(maxJoueursPossible(), Math.max(MIN_JOUEURS, g.nbJoueurs + Number(d.genNb)));
    g.composition = compositionConseillee(g.nbJoueurs);
    g.plan = null;
    g.positions = null;
  } else if (d.genForme !== undefined) {
    g.forme = d.genForme as Forme;
    g.positions = null; // nouvelle forme : on repart de sa disposition
    if (g.plan) g.plan = tirer(g);
  } else if (d.genPlus !== undefined) {
    const role = d.genPlus as RoleId;
    g.composition = { ...g.composition, [role]: (g.composition[role] ?? 0) + pas };
    g.plan = null;
  } else if (d.genMoins !== undefined) {
    const role = d.genMoins as RoleId;
    g.composition = { ...g.composition, [role]: Math.max(0, (g.composition[role] ?? 0) - pas) };
    g.plan = null;
  } else if (d.genConseil !== undefined) {
    g.composition = compositionConseillee(g.nbJoueurs);
    g.plan = null;
  } else if (d.genTirer !== undefined) {
    g.plan = tirer(g);
    g.siegeChoisi = null;
  } else if (d.genSiege !== undefined && g.plan) {
    const n = Number(d.genSiege);
    if (g.siegeChoisi === null) g.siegeChoisi = n;
    else {
      if (g.siegeChoisi !== n) g.plan = echangerRoles(g.plan, g.siegeChoisi, n);
      g.siegeChoisi = null;
    }
  } else if (d.genEnregistrer !== undefined && g.plan) {
    if (!g.salle.trim()) {
      g.erreur = 'Donne un nom à la salle';
      return null;
    }
    const nom = g.salle.trim();
    return { type: 'enregistrer', plan: { ...g.plan, salle: nom, id: `${nom}-${g.plan.nbJoueurs}` } };
  }
  return null;
}

/** Tire les rôles ; on garde un nom provisoire tant que la salle n'est pas nommée. */
function tirer(g: EtatGenerateur): Plan | null {
  try {
    return genererPlan({
      salle: g.salle.trim() || 'Sans nom',
      forme: g.forme,
      composition: g.composition,
      positions: g.positions ?? undefined,
    });
  } catch (e) {
    g.erreur = e instanceof Error ? e.message : String(e);
    return null;
  }
}

/** Le MJ a lâché un siège à un nouvel endroit : on le garde pour les prochains tirages. */
export function deplacerDansGenerateur(g: EtatGenerateur, numero: number, position: { x: number; y: number }): void {
  if (!g.plan) return;
  g.plan = deplacerSiege(g.plan, numero, position);
  g.positions = g.plan.sieges.map((s) => s.position);
}
