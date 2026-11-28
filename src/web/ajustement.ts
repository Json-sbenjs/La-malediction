// Écran « Modifier la salle » : le groupe annoncé à 15 arrive à 13 ou à 16.
// Il ressemble à l'écran « Salle sur mesure » (mêmes compteurs de rôles, même aperçu du plan),
// mais part du plan prévu : on ne retire ou n'ajoute que ce qui change, les autres sièges restent en place.
// Les règles (limites, cartes disponibles, plan valide) sont dans src/engine/ajustement.ts.
import {
  MAX_JOUEURS,
  MIN_JOUEURS,
  ajouterRole,
  cartesRestantes,
  compterRoles,
  deplacerSiege,
  echangerRoles,
  equilibreSpectres,
  melangerRoles,
  retirerRole,
  tailleGroupe,
  validerPlan,
  type Plan,
  type RoleId,
} from '../engine';
import { ORDRE_ROLES, apercuSalle, bouton, echapper, ligneRole } from './composants-salle';

export interface EtatAjustement {
  /** Plan prévu, tel qu'il était avant toute modification. */
  prevu: Plan;
  /** Plan de ce soir, en cours de modification. */
  plan: Plan;
  /** Nombre de joueurs présents ce soir : il faut autant de rôles. */
  nbVise: number;
  /** Premier siège touché pour un échange de rôles. */
  siegeChoisi: number | null;
  /** Prénoms qui suivent les sièges (retirer le siège 7 fait remonter ceux des sièges 8, 9…). */
  prenoms: string[];
  /** Prénoms d'avant toute modification, remis si on revient au plan prévu. */
  prenomsPrevus: string[];
  erreur: string | null;
}

export function nouvelAjustement(prevu: Plan, prenoms: string[]): EtatAjustement {
  return {
    prevu,
    plan: structuredClone(prevu),
    nbVise: prevu.nbJoueurs,
    siegeChoisi: null,
    prenoms: [...prenoms],
    prenomsPrevus: [...prenoms],
    erreur: null,
  };
}

/** Le plan est prêt pour ce soir : autant de rôles que de joueurs, et jouable. */
export function ajustementPret(a: EtatAjustement): boolean {
  return a.plan.nbJoueurs === a.nbVise && validerPlan(a.plan).length === 0;
}

export function ecranAjustement(a: EtatAjustement): string {
  const { plan } = a;
  const total = plan.nbJoueurs;
  const juste = total === a.nbVise;
  const compte = compterRoles(plan);
  const { actuels, conseilles } = equilibreSpectres({ ...plan, nbJoueurs: a.nbVise });
  const erreurs = juste ? validerPlan(plan) : [];
  const pret = ajustementPret(a);
  const ecart = a.nbVise - a.prevu.nbJoueurs;

  const lignes = ORDRE_ROLES.map((r) => {
    const taille = tailleGroupe(r);
    const plusPossible = cartesRestantes(plan, r) >= taille && total + taille <= MAX_JOUEURS;
    return ligneRole('aj', r, compte[r] ?? 0, plusPossible);
  }).join('');

  return `
    <header class="barre">
      <span class="phase">✏️ Modifier la salle</span>
      ${bouton('Annuler', 'data-aj-fermer', 'discret')}
    </header>
    <main class="generateur">
      <section class="carte">
        <h2>Salle</h2>
        <p>${echapper(a.prevu.salle)} <span class="max">— prévue à ${a.prevu.nbJoueurs} joueurs</span></p>

        <h2>Nombre de joueurs ce soir</h2>
        <div class="compteur grand">
          ${bouton('−', `data-aj-nb="-1" aria-label="Un joueur de moins" ${a.nbVise <= MIN_JOUEURS ? 'disabled' : ''}`, 'rond')}
          <strong>${a.nbVise}</strong>
          ${bouton('+', `data-aj-nb="1" aria-label="Un joueur de plus" ${a.nbVise >= MAX_JOUEURS ? 'disabled' : ''}`, 'rond')}
          <span class="max">${ecart === 0 ? 'comme prévu' : `${ecart > 0 ? '+' : ''}${ecart} par rapport au plan`}</span>
        </div>
      </section>

      <section class="carte">
        <h2>Rôles <span class="${juste ? 'ok' : 'attention'}">${total} / ${a.nbVise}</span></h2>
        <p class="${conseilles === null || actuels === conseilles ? 'max' : 'attention'}">
          Spectres : ${actuels}${conseilles === null ? '' : ` — conseillé pour ${a.nbVise} joueurs : ${conseilles}`}
        </p>
        <p class="max">« − » retire le siège de ce rôle qui a le plus grand numéro ; « + » ajoute un siège à une place libre.</p>
        <ul class="roles">${lignes}</ul>
      </section>

      <section class="carte">
        <h2>Plan de la salle</h2>
        <p>Touche deux sièges pour échanger leurs rôles. Reste appuyé sur un siège pour le déplacer et le placer comme dans la vraie salle.</p>
        ${apercuSalle('aj', plan, a.siegeChoisi)}
        <div class="choix-ligne">
          ${bouton('Mélanger les rôles', 'data-aj-melanger')}
          ${bouton('Revenir au plan prévu', 'data-aj-reinitialiser', 'discret')}
        </div>
      </section>

      ${juste ? '' : `<p class="attention">Il faut autant de rôles que de joueurs : ${total < a.nbVise ? 'ajoute' : 'retire'} ${Math.abs(a.nbVise - total)} rôle${Math.abs(a.nbVise - total) > 1 ? 's' : ''}.</p>`}
      ${erreurs.length > 0 ? `<ul class="attention">${erreurs.map((e) => `<li>${echapper(e)}</li>`).join('')}</ul>` : ''}
      ${a.erreur ? `<p class="erreur">${echapper(a.erreur)}</p>` : ''}
      <div class="choix-ligne">
        ${bouton('Valider la salle', `data-aj-valider ${pret ? '' : 'disabled'}`, 'principal')}
      </div>
    </main>`;
}

export type ResultatAjustement = { type: 'fermer' } | { type: 'valider' } | null;

/** Traite un clic sur l'écran « Modifier la salle ». Modifie `a`. */
export function clicAjustement(a: EtatAjustement, d: DOMStringMap): ResultatAjustement {
  a.erreur = null;
  try {
    if (d.ajFermer !== undefined) return { type: 'fermer' };
    if (d.ajValider !== undefined && ajustementPret(a)) return { type: 'valider' };

    if (d.ajNb !== undefined) {
      a.nbVise = Math.min(MAX_JOUEURS, Math.max(MIN_JOUEURS, a.nbVise + Number(d.ajNb)));
    } else if (d.ajMoins !== undefined) {
      const { plan, retires } = retirerRole(a.plan, d.ajMoins as RoleId);
      for (const numero of retires) a.prenoms.splice(numero - 1, 1);
      a.plan = plan;
      a.siegeChoisi = null;
    } else if (d.ajPlus !== undefined) {
      a.plan = ajouterRole(a.plan, d.ajPlus as RoleId);
      a.siegeChoisi = null;
    } else if (d.ajSiege !== undefined) {
      const n = Number(d.ajSiege);
      if (a.siegeChoisi === null) a.siegeChoisi = n;
      else {
        if (a.siegeChoisi !== n) a.plan = echangerRoles(a.plan, a.siegeChoisi, n);
        a.siegeChoisi = null;
      }
    } else if (d.ajMelanger !== undefined) {
      a.plan = melangerRoles(a.plan);
      a.siegeChoisi = null;
    } else if (d.ajReinitialiser !== undefined) {
      a.plan = structuredClone(a.prevu);
      a.nbVise = a.prevu.nbJoueurs;
      a.prenoms = [...a.prenomsPrevus];
      a.siegeChoisi = null;
    }
  } catch (e) {
    a.erreur = e instanceof Error ? e.message : String(e);
  }
  return null;
}

/** Le MJ a lâché un siège à un nouvel endroit. */
export function deplacerDansAjustement(a: EtatAjustement, numero: number, position: { x: number; y: number }): void {
  a.plan = deplacerSiege(a.plan, numero, position);
}

/** Bandeau de l'écran de choix quand la salle a été modifiée pour ce soir. */
export function resumeAjustement(a: EtatAjustement): string {
  const ecart = a.plan.nbJoueurs - a.prevu.nbJoueurs;
  return `
    <section class="carte">
      <h2>Salle modifiée pour ce soir : ${a.plan.nbJoueurs} joueurs
        <span class="max">(prévue à ${a.prevu.nbJoueurs}${ecart === 0 ? '' : `, ${ecart > 0 ? '+' : ''}${ecart}`})</span></h2>
      <div class="choix-ligne">
        ${bouton('✏️ Reprendre la modification', 'data-modifier-salle')}
        ${bouton('Revenir au plan prévu', 'data-plan-prevu', 'discret')}
      </div>
    </section>`;
}

