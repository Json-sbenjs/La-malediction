// Interface tablette du MJ. Elle n'a aucune règle du jeu :
// elle affiche `etapeSuivante(etat)` et renvoie les choix du MJ à `appliquer(etat, action)`.
import {
  PLANS,
  ROLES,
  appliquer,
  choisirPlan,
  compterVotes,
  creerPartie,
  etapeSuivante,
  nombresDeJoueurs,
  nomJoueur,
  sallesDisponibles,
  type Action,
  type Camp,
  type Etape,
  type EtatPartie,
  type Joueur,
  type JoueurId,
  type Plan,
} from '../engine';
import { consigneReveil, modeSaisie } from './consignes';
import { clicGenerateur, ecranGenerateur, nouveauGenerateur, type EtatGenerateur } from './generateur';
import { PLANS_DEMO } from './plans-demo';
import './style.css';

const CLE_SAUVEGARDE = 'malediction:partie';
const CLE_PLANS = 'malediction:plans';

/** Salles créées avec le générateur, gardées dans le navigateur. */
let plansPerso: Plan[] = lirePlansPerso();

function lirePlansPerso(): Plan[] {
  try {
    return JSON.parse(localStorage.getItem(CLE_PLANS) ?? '[]') as Plan[];
  } catch {
    return [];
  }
}

function ecrirePlansPerso(): void {
  try {
    localStorage.setItem(CLE_PLANS, JSON.stringify(plansPerso));
  } catch {
    // Stockage indisponible : la salle reste disponible jusqu'à la fermeture.
  }
}

/** Plans saisis dans le code (ou de démo s'il n'y en a pas), puis les salles sur mesure. */
function tousLesPlans(): Plan[] {
  return [...(PLANS.length > 0 ? PLANS : PLANS_DEMO), ...plansPerso];
}

function estPerso(salle: string, nb: number): boolean {
  return plansPerso.some((p) => p.salle === salle && p.nbJoueurs === nb);
}

// ─── État de l'interface ──────────────────────────────────────────────

interface Ui {
  etat: EtatPartie | null;
  /** Plan de la partie en cours (positions des sièges). */
  plan: Plan | null;
  // Écran de choix
  salle: string;
  nbJoueurs: number;
  prenoms: string[];
  // Saisie en cours
  selection: JoueurId[];
  votes: Record<JoueurId, JoueurId | null>;
  votant: JoueurId | null;
  erreur: string | null;
  /** Écran du générateur ouvert (null = fermé). */
  generateur: EtatGenerateur | null;
}

const ui: Ui = {
  etat: null,
  plan: null,
  generateur: null,
  salle: sallesDisponibles(tousLesPlans())[0] ?? '',
  nbJoueurs: 0,
  prenoms: [],
  selection: [],
  votes: {},
  votant: null,
  erreur: null,
};
ui.nbJoueurs = nombresDeJoueurs(ui.salle, tousLesPlans())[0] ?? 0;

function sauvegarder(): void {
  try {
    if (ui.etat && ui.plan) localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify({ etat: ui.etat, plan: ui.plan }));
    else localStorage.removeItem(CLE_SAUVEGARDE);
  } catch {
    // Stockage indisponible (navigation privée…) : tant pis, la partie reste en mémoire.
  }
}

function restaurer(): void {
  try {
    const brut = localStorage.getItem(CLE_SAUVEGARDE);
    if (!brut) return;
    const { etat, plan } = JSON.parse(brut) as { etat: EtatPartie; plan: Plan };
    ui.etat = etat;
    ui.plan = plan;
  } catch {
    // Sauvegarde illisible : on repart de zéro.
  }
}

/** Remet à zéro la saisie (sélection, votes) entre deux étapes. */
function viderSaisie(): void {
  ui.selection = [];
  ui.votes = {};
  ui.votant = null;
  ui.erreur = null;
}

function jouer(action: Action): void {
  if (!ui.etat) return;
  try {
    ui.etat = appliquer(ui.etat, action);
    viderSaisie();
    sauvegarder();
  } catch (e) {
    ui.erreur = e instanceof Error ? e.message : String(e);
  }
  afficher();
}

// ─── Outils d'affichage ───────────────────────────────────────────────

const app = document.querySelector<HTMLDivElement>('#app')!;

function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const NOM_CAMP: Record<Camp, string> = { pelerins: 'Pèlerins', spectres: 'Spectres', trinite: 'Trinité' };

function nom(id: JoueurId): string {
  const j = ui.etat?.joueurs.find((x) => x.id === id);
  return echapper(j ? nomJoueur(j) : `siège ${id}`);
}

function bouton(texte: string, attrs: string, classe = ''): string {
  return `<button type="button" class="${classe}" ${attrs}>${texte}</button>`;
}

function titrePhase(etat: EtatPartie): string {
  const p = etat.phase;
  if (p.type === 'nuit') return p.numero === 1 ? '🌙 Première nuit' : `🌙 Nuit ${p.numero}`;
  if (p.type === 'jour') return `☀️ Jour ${p.numero}`;
  return '🏁 Fin de partie';
}

/** Sièges que le MJ peut toucher à cette étape. */
function siegesActifs(etape: Etape): JoueurId[] {
  switch (etape.type) {
    case 'reveil':
      return modeSaisie(etape.role).type === 'cibles' ? etape.ciblesPossibles : [];
    case 'decision':
      return etape.decision.type === 'usurpateur' ? [] : etape.ciblesPossibles;
    case 'election-alpha':
      return etape.candidats;
    case 'vote':
      return ui.votant === null ? etape.votants : etape.ciblesPossibles;
    default:
      return [];
  }
}

function nombreACocher(etape: Etape): number {
  if (etape.type === 'reveil') {
    const mode = modeSaisie(etape.role);
    return mode.type === 'cibles' ? mode.nombre : 0;
  }
  return 1;
}

// ─── Écran 1 : choix du plan ──────────────────────────────────────────

function ecranChoix(): string {
  const plans = tousLesPlans();
  const salles = sallesDisponibles(plans);
  const nombres = nombresDeJoueurs(ui.salle, plans);
  const champsPrenoms = Array.from({ length: ui.nbJoueurs }, (_, i) => {
    const valeur = echapper(ui.prenoms[i] ?? '');
    return `<label class="prenom"><span>${i + 1}</span><input data-prenom="${i}" value="${valeur}" placeholder="Prénom (facultatif)" autocomplete="off"></label>`;
  }).join('');

  return `
    <main class="choix">
      <h1>La Malédiction</h1>
      <p class="sous-titre">Assistant du maître du jeu</p>
      ${PLANS.length === 0 && plansPerso.length === 0 ? '<p class="note">Plans de démonstration : crée ta salle avec « Salle sur mesure ».</p>' : ''}
      <section class="carte">
        <h2>Salle</h2>
        <div class="choix-ligne">${salles
          .map((s) => bouton(echapper(s), `data-salle="${echapper(s)}"`, s === ui.salle ? 'actif' : ''))
          .join('')}</div>
        <h2>Nombre de joueurs</h2>
        <div class="choix-ligne">${nombres
          .map((n) => bouton(String(n), `data-nb="${n}"`, n === ui.nbJoueurs ? 'actif' : ''))
          .join('')}</div>
        <div class="choix-ligne">
          ${bouton('🛠️ Salle sur mesure', 'data-ouvrir-generateur')}
          ${estPerso(ui.salle, ui.nbJoueurs) ? bouton('Supprimer ce plan', 'data-supprimer-plan', 'discret') : ''}
        </div>
      </section>
      ${ui.nbJoueurs > 0 ? `<section class="carte"><h2>Prénoms</h2><div class="prenoms">${champsPrenoms}</div></section>` : ''}
      ${ui.erreur ? `<p class="erreur">${echapper(ui.erreur)}</p>` : ''}
      ${bouton('Commencer la partie', 'data-commencer', 'principal')}
    </main>`;
}

// ─── Écran 2 : la partie ──────────────────────────────────────────────

function siege(j: Joueur, etape: Etape, actifs: JoueurId[], compte: Record<JoueurId, number>): string {
  const pos = ui.plan?.sieges.find((s) => s.numero === j.id)?.position ?? { x: 50, y: 50 };
  const etat = ui.etat!;
  const acteur = etape.type === 'reveil' && etape.acteurs.includes(j.id);
  const classes = [
    'siege',
    `camp-${j.camp}`,
    j.vivant ? '' : 'mort',
    actifs.includes(j.id) ? 'actif' : '',
    ui.selection.includes(j.id) || ui.votant === j.id ? 'choisi' : '',
    acteur ? 'acteur' : '',
  ].join(' ');
  const badges = [
    etat.alpha === j.id ? '👑' : '',
    j.statuts.protege ? '🛡️' : '',
    j.statuts.occupe ? '💤' : '',
    j.vivant ? '' : '💀',
  ].join('');
  const vote = ui.votes[j.id];
  const infoVote = [
    vote !== undefined && vote !== null ? `<span class="fleche">→ ${vote}</span>` : '',
    compte[j.id] ? `<span class="voix">${compte[j.id]} voix</span>` : '',
  ].join('');

  return `
    <button type="button" class="${classes}" data-siege="${j.id}" style="left:${pos.x}%;top:${pos.y}%"
      ${actifs.includes(j.id) || etape.type === 'vote' ? '' : 'tabindex="-1"'}>
      <span class="num">${j.id}</span>
      <span class="nom">${echapper(j.nom ?? '')}</span>
      <span class="role">${echapper(ROLES[j.role].nom)}</span>
      <span class="badges">${badges}</span>
      ${infoVote}
    </button>`;
}

function panneau(etape: Etape, compte: Record<JoueurId, number>): string {
  const etat = ui.etat!;
  const choisis = ui.selection.map(nom).join(', ') || '—';
  const valider = (pret: boolean) => bouton('Valider', `data-valider ${pret ? '' : 'disabled'}`, 'principal');

  switch (etape.type) {
    case 'reveil': {
      const premiereNuit = etat.phase.type === 'nuit' && etat.phase.numero === 1;
      const mode = modeSaisie(etape.role);
      const qui = etape.acteurs.map(nom).join(', ');
      let saisie = '';
      if (mode.type === 'aucune') {
        saisie = bouton(mode.bouton, 'data-passer', 'principal');
      } else if (mode.type === 'sainte') {
        const victime = etape.ciblesPossibles[0];
        saisie =
          victime === undefined
            ? `<p>Pas de victime cette nuit.</p>${bouton('Continuer', 'data-sainte="non"', 'principal')}`
            : `<p>Victime : <strong>${nom(victime)}</strong></p>
               ${bouton('Sauver la victime', 'data-sainte="oui"', 'principal')}
               ${bouton('Ne pas utiliser la potion', 'data-sainte="non"')}`;
      } else {
        const pret = ui.selection.length === mode.nombre;
        saisie = `
          <p>Touche ${mode.nombre === 1 ? 'un siège' : '3 sièges'} sur le plan. Choix : <strong>${choisis}</strong></p>
          ${valider(pret)}
          ${mode.passer ? bouton(echapper(mode.passer.texte), 'data-passer-role') : ''}`;
      }
      return `
        <h2>${echapper(ROLES[etape.role].nom)}</h2>
        <p class="consigne">${consigneReveil(etape.role, premiereNuit)}</p>
        <p class="qui">${etape.acteurs.length > 1 ? 'Joueurs' : 'Joueur'} : ${qui}</p>
        ${saisie}`;
    }

    case 'resolution-nuit':
      return `
        <h2>Fin de la nuit</h2>
        <p class="consigne">${
          etape.morts.length === 0
            ? "Personne n'est mort cette nuit."
            : `Mort${etape.morts.length > 1 ? 's' : ''} de la nuit : <strong>${etape.morts.map(nom).join(', ')}</strong>`
        }</p>
        ${bouton('Le village se réveille', 'data-passer', 'principal')}`;

    case 'decision': {
      const d = etape.decision;
      if (d.type === 'usurpateur') {
        return `
          <h2>L'Usurpateur</h2>
          <p class="consigne">${nom(d.mort)} va mourir. ${nom(d.usurpateur)} veut-il prendre son rôle (${echapper(
            ROLES[etat.joueurs.find((j) => j.id === d.mort)!.role].nom,
          )}) ?</p>
          ${bouton('Il prend le rôle', `data-usurper="${d.mort}"`, 'principal')}
          ${bouton('Il refuse', 'data-passer')}`;
      }
      const titre = d.type === 'main-noire' ? 'La Main Noire' : "Successeur de l'Alpha";
      const texte =
        d.type === 'main-noire'
          ? `${nom(d.tireur)} meurt : la Main Noire élimine un joueur de son choix.`
          : `L'Alpha ${nom(d.ancien)} est mort : il désigne son successeur.`;
      return `
        <h2>${titre}</h2>
        <p class="consigne">${texte}</p>
        <p>Choix : <strong>${choisis}</strong></p>
        ${valider(ui.selection.length === 1)}
        ${bouton(d.type === 'main-noire' ? 'Ne tire pas' : 'Pas de successeur', 'data-passer')}`;
    }

    case 'election-alpha':
      return `
        <h2>Élection de l'Alpha</h2>
        <p class="consigne">Le village élit son Alpha : son vote comptera double.</p>
        <p>Élu : <strong>${choisis}</strong></p>
        ${valider(ui.selection.length === 1)}`;

    case 'vote': {
      const nbVotes = Object.values(ui.votes).filter((v) => v !== null).length;
      const classement = Object.entries(compte)
        .sort((a, b) => b[1] - a[1])
        .map(([id, n]) => `<li>${nom(Number(id))} : ${n} voix</li>`)
        .join('');
      return `
        <h2>Vote du village</h2>
        <p class="consigne">Touche un votant, puis le joueur qu'il vise. La voix de l'Alpha 👑 compte double.</p>
        <p>${ui.votant === null ? 'Touche un votant.' : `${nom(ui.votant)} vote contre… (touche-le à nouveau pour annuler)`}</p>
        ${classement ? `<ul class="classement">${classement}</ul>` : ''}
        ${bouton(`Valider le vote (${nbVotes})`, `data-voter ${nbVotes === 0 ? 'disabled' : ''}`, 'principal')}
        ${bouton('Personne n\'est éliminé', 'data-passer')}`;
    }

    case 'fin':
      return `
        <h2>Fin de la partie</h2>
        <p class="consigne victoire">${
          etape.gagnants === null ? 'Tout le monde est mort : personne ne gagne.' : `Victoire : ${NOM_CAMP[etape.gagnants]} !`
        }</p>
        ${bouton('Nouvelle partie', 'data-nouvelle', 'principal')}`;
  }
}

function ecranPartie(): string {
  const etat = ui.etat!;
  const etape = etapeSuivante(etat);
  const actifs = siegesActifs(etape);
  let compte: Record<JoueurId, number> = {};
  if (etape.type === 'vote') {
    try {
      compte = compterVotes(etat, ui.votes).compte;
    } catch {
      // Votes incomplets : on n'affiche pas de compte.
    }
  }

  return `
    <header class="barre">
      <span class="phase">${titrePhase(etat)}</span>
      ${bouton('Quitter', 'data-quitter', 'discret')}
    </header>
    <main class="partie">
      <section class="salle" aria-label="Plan de la salle">
        ${etat.joueurs.map((j) => siege(j, etape, actifs, compte)).join('')}
      </section>
      <section class="panneau">
        ${panneau(etape, compte)}
        ${etat.infoMJ ? `<p class="info">ℹ️ ${echapper(etat.infoMJ)}</p>` : ''}
        ${ui.erreur ? `<p class="erreur">${echapper(ui.erreur)}</p>` : ''}
      </section>
    </main>`;
}

function afficher(): void {
  app.innerHTML = ui.generateur ? ecranGenerateur(ui.generateur) : ui.etat ? ecranPartie() : ecranChoix();
}

// ─── Clics ────────────────────────────────────────────────────────────

function toucherSiege(id: JoueurId): void {
  const etape = etapeSuivante(ui.etat!);
  if (etape.type === 'vote') {
    if (ui.votant === null) {
      if (!etape.votants.includes(id)) return;
      if (ui.votes[id] !== undefined) delete ui.votes[id]; // re-toucher un votant annule son vote
      else ui.votant = id;
    } else if (id === ui.votant) {
      ui.votant = null;
    } else if (etape.ciblesPossibles.includes(id)) {
      ui.votes[ui.votant] = id;
      ui.votant = null;
    }
    return;
  }
  if (!siegesActifs(etape).includes(id)) return;
  const max = nombreACocher(etape);
  if (ui.selection.includes(id)) ui.selection = ui.selection.filter((x) => x !== id);
  else if (max === 1) ui.selection = [id];
  else if (ui.selection.length < max) ui.selection = [...ui.selection, id];
}

function valider(): void {
  const etape = etapeSuivante(ui.etat!);
  const [cible] = ui.selection;
  switch (etape.type) {
    case 'reveil': {
      const mode = modeSaisie(etape.role);
      if (mode.type === 'cibles') jouer(mode.action(ui.selection));
      return;
    }
    case 'decision':
      if (etape.decision.type === 'main-noire') jouer({ type: 'main-noire-tirer', cible });
      if (etape.decision.type === 'alpha-successeur') jouer({ type: 'alpha-successeur', cible });
      return;
    case 'election-alpha':
      jouer({ type: 'elire-alpha', cible });
      return;
  }
}

app.addEventListener('click', (evt) => {
  const el = (evt.target as HTMLElement).closest<HTMLElement>('button');
  if (!el || el.hasAttribute('disabled')) return;
  const d = el.dataset;

  // Générateur de salle
  if (ui.generateur) {
    const resultat = clicGenerateur(ui.generateur, d);
    if (resultat?.type === 'enregistrer') {
      const { plan } = resultat;
      plansPerso = [...plansPerso.filter((p) => p.id !== plan.id), plan];
      ecrirePlansPerso();
      ui.salle = plan.salle;
      ui.nbJoueurs = plan.nbJoueurs;
      ui.prenoms = [];
    }
    if (resultat) ui.generateur = null;
    return afficher();
  }

  // Écran de choix
  if (d.ouvrirGenerateur !== undefined) {
    ui.generateur = nouveauGenerateur();
  } else if (d.supprimerPlan !== undefined) {
    if (!confirm(`Supprimer le plan « ${ui.salle} » à ${ui.nbJoueurs} joueurs ?`)) return;
    plansPerso = plansPerso.filter((p) => !(p.salle === ui.salle && p.nbJoueurs === ui.nbJoueurs));
    ecrirePlansPerso();
    ui.salle = sallesDisponibles(tousLesPlans())[0] ?? '';
    ui.nbJoueurs = nombresDeJoueurs(ui.salle, tousLesPlans())[0] ?? 0;
  } else if (d.salle !== undefined) {
    ui.salle = d.salle;
    ui.nbJoueurs = nombresDeJoueurs(ui.salle, tousLesPlans())[0] ?? 0;
  } else if (d.nb !== undefined) {
    ui.nbJoueurs = Number(d.nb);
  } else if (d.commencer !== undefined) {
    try {
      const plan = choisirPlan(ui.salle, ui.nbJoueurs, tousLesPlans());
      const prenoms = Array.from({ length: plan.nbJoueurs }, (_, i) => ui.prenoms[i] || null);
      ui.etat = creerPartie(plan, prenoms);
      ui.plan = plan;
      viderSaisie();
      sauvegarder();
      void garderEcranAllume();
    } catch (e) {
      ui.erreur = e instanceof Error ? e.message : String(e);
    }
  }
  // Partie
  else if (d.siege !== undefined) {
    toucherSiege(Number(d.siege));
  } else if (d.valider !== undefined) {
    return valider();
  } else if (d.passer !== undefined) {
    return jouer({ type: 'passer' });
  } else if (d.passerRole !== undefined) {
    const etape = etapeSuivante(ui.etat!);
    if (etape.type === 'reveil') {
      const mode = modeSaisie(etape.role);
      if (mode.type === 'cibles' && mode.passer) return jouer(mode.passer.action);
    }
  } else if (d.sainte !== undefined) {
    return jouer({ type: 'sainte-sauver', utiliser: d.sainte === 'oui' });
  } else if (d.usurper !== undefined) {
    return jouer({ type: 'usurpateur-remplacer', cible: Number(d.usurper) });
  } else if (d.voter !== undefined) {
    return jouer({ type: 'vote', votes: ui.votes });
  } else if (d.quitter !== undefined) {
    if (!confirm('Abandonner la partie en cours ?')) return;
    ui.etat = null;
    ui.plan = null;
    viderSaisie();
    sauvegarder();
  } else if (d.nouvelle !== undefined) {
    ui.etat = null;
    ui.plan = null;
    viderSaisie();
    sauvegarder();
  }
  afficher();
});

app.addEventListener('input', (evt) => {
  const el = evt.target as HTMLInputElement;
  if (el.dataset.prenom !== undefined) ui.prenoms[Number(el.dataset.prenom)] = el.value;
  if (el.dataset.genSalle !== undefined && ui.generateur) ui.generateur.salle = el.value;
});

// ─── Tablette : écran allumé, appli installable et hors ligne ─────────

/** Empêche l'iPad de se mettre en veille pendant la partie (si le navigateur le permet). */
async function garderEcranAllume(): Promise<void> {
  try {
    if (ui.etat && document.visibilityState === 'visible' && 'wakeLock' in navigator) {
      await navigator.wakeLock.request('screen');
    }
  } catch {
    // Refusé (batterie faible…) : pas grave.
  }
}
document.addEventListener('visibilitychange', () => void garderEcranAllume());

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // Pas de service worker : l'appli marche, mais pas hors ligne.
  });
}

restaurer();
afficher();
void garderEcranAllume();
