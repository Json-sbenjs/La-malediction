// Interface tablette du MJ. Elle n'a aucune règle du jeu :
// elle affiche `etapeSuivante(etat)` et renvoie les choix du MJ à `appliquer(etat, action)`.
import {
  PLANS,
  ROLES,
  appliquer,
  choisirPlan,
  compterMainsLevees,
  compterVotes,
  ajouterSiege,
  changerRole,
  deplacerSiege,
  retirerSiege,
  mortsVotent,
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
  type Historique,
  type Plan,
  type RoleId,
  annuler,
  decoderPlan,
  memoriser,
  PARAM_PARTAGE,
} from '../engine';
import { consigneReveil, modeSaisie } from './consignes';
import {
  clicGenerateur,
  deplacerDansGenerateur,
  ecranGenerateur,
  nouveauGenerateur,
  type EtatGenerateur,
} from './generateur';
import { activerDeplacement, clicApresDeplacement } from './deplacement';
import { blocAjustement, nouvelAjustement, type EtatAjustement } from './ajustement';
import { densite } from './densite';
import { SI_PAS_D_IMAGE } from './images';
import { arreterScan, demarrerScan, ecranPartage, ecranScanner, lienDePartage } from './partage';
import { PLANS_DEMO } from './plans-demo';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/600.css';
import '@fontsource/eb-garamond/700.css';
import '@fontsource/uncial-antiqua/400.css';
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

/**
 * Plans saisis dans le code (ou de démo s'il n'y en a pas), puis les salles sur mesure.
 * Une salle sur mesure enregistrée sous le même nom et le même nombre de joueurs remplace le plan du code.
 */
function tousLesPlans(): Plan[] {
  const code = (PLANS.length > 0 ? PLANS : PLANS_DEMO).filter((p) => !estPerso(p.salle, p.nbJoueurs));
  return [...code, ...plansPerso];
}

function estPerso(salle: string, nb: number): boolean {
  return plansPerso.some((p) => p.salle === salle && p.nbJoueurs === nb);
}

/** Ajoute (ou remplace) une salle sur mesure et la sélectionne sur l'écran de choix. */
function ajouterPlanPerso(plan: Plan): void {
  plansPerso = [...plansPerso.filter((p) => p.id !== plan.id), plan];
  ecrirePlansPerso();
  ui.salle = plan.salle;
  ui.nbJoueurs = plan.nbJoueurs;
  ui.prenoms = [];
}

/** Ajoute la salle d'un lien de partage (QR code scanné ou lien collé). Renvoie false si le lien est mauvais. */
function importerSalle(texte: string): boolean {
  try {
    const plan = decoderPlan(texte);
    const remplace = plansPerso.some((p) => p.id === plan.id);
    ajouterPlanPerso(plan);
    ui.info = `Salle « ${plan.salle} » à ${plan.nbJoueurs} joueurs ${remplace ? 'mise à jour' : 'ajoutée'}.`;
    ui.erreur = null;
    return true;
  } catch (e) {
    ui.erreur = e instanceof Error ? e.message : String(e);
    return false;
  }
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
  /** Rôle montré en plein écran à l'Oracle (null = rien à montrer). */
  revelation: JoueurId | null;
  /** États d'avant chaque action, pour « Annuler ». */
  historique: Historique;
  /** Salle montrée en QR code pour la partager (null = écran fermé). */
  partage: Plan | null;
  /** Écran « Scanner une salle » ouvert. */
  scanner: boolean;
  /** La caméra a été refusée : on ne la relance pas, il reste le lien à coller. */
  cameraEnPanne: boolean;
  /** Message de réussite sur l'écran de choix ou de partage (salle ajoutée, lien copié). */
  info: string | null;
  /** Plan retouché pour ce soir (joueurs en plus ou en moins), null = plan prévu tel quel. */
  ajustement: EtatAjustement | null;
  /** Saisie du vote : à main levée (nombre de mains par joueur) ou voix par voix (qui vote contre qui). */
  modeVote: 'mains' | 'voix';
  /** Vote à main levée : nombre de mains levées contre chaque joueur. */
  mains: Record<JoueurId, number>;
  /** Vote à main levée : joueur contre qui l'Alpha a levé la main (sa voix compte double). */
  voteAlpha: JoueurId | null;
  /** Vote à main levée : joueur touché, dont on saisit les mains. */
  cibleMains: JoueurId | null;
}

const ui: Ui = {
  etat: null,
  plan: null,
  generateur: null,
  revelation: null,
  historique: [],
  partage: null,
  scanner: false,
  cameraEnPanne: false,
  info: null,
  ajustement: null,
  modeVote: 'mains',
  mains: {},
  voteAlpha: null,
  cibleMains: null,
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
    if (ui.etat && ui.plan) {
      localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify({ etat: ui.etat, plan: ui.plan, historique: ui.historique }));
    }
    else localStorage.removeItem(CLE_SAUVEGARDE);
  } catch {
    // Stockage indisponible (navigation privée…) : tant pis, la partie reste en mémoire.
  }
}

function restaurer(): void {
  try {
    const brut = localStorage.getItem(CLE_SAUVEGARDE);
    if (!brut) return;
    const { etat, plan, historique } = JSON.parse(brut) as { etat: EtatPartie; plan: Plan; historique?: Historique };
    ui.etat = etat;
    ui.plan = plan;
    ui.historique = historique ?? [];
  } catch {
    // Sauvegarde illisible : on repart de zéro.
  }
}

/** Remet à zéro la saisie (sélection, votes) entre deux étapes. */
function viderSaisie(): void {
  ui.selection = [];
  ui.votes = {};
  ui.votant = null;
  ui.mains = {};
  ui.voteAlpha = null;
  ui.cibleMains = null;
  ui.erreur = null;
}

/** Revient à l'état d'avant la dernière action du MJ. */
function annulerDerniereAction(): void {
  const retour = annuler(ui.historique);
  if (!retour) return;
  ui.etat = retour.etat;
  ui.historique = retour.historique;
  ui.revelation = null;
  viderSaisie();
  sauvegarder();
  afficher();
}

function jouer(action: Action): void {
  if (!ui.etat) return;
  try {
    const avant = ui.etat;
    ui.etat = appliquer(avant, action);
    ui.historique = memoriser(ui.historique, avant);
    viderSaisie();
    sauvegarder();
    // L'Oracle a désigné quelqu'un : on montre son rôle en grand pour le lui faire voir.
    if (action.type === 'oracle-voir') ui.revelation = action.cible;
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

/** Illustration d'un rôle (cartes du jeu, dans public/roles). */
function image(role: string): string {
  return `${import.meta.env.BASE_URL}roles/${role}.webp`;
}

function illustration(role: string, alt: string): string {
  return `<img class="illustration" src="${image(role)}" alt="${echapper(alt)}" ${SI_PAS_D_IMAGE}>`;
}

/** Camp de départ d'un rôle, pour l'écran de présentation. */
const NOM_CAMP_ROLE: Record<Camp, string> = {
  pelerins: 'Pèlerins',
  spectres: 'Spectres',
  trinite: 'Solitaire, puis Pèlerins',
  doubles: 'Solitaire, puis Pèlerins',
  maudit: 'Solitaire',
  sectaire: 'Solitaire',
  envouteur: 'Solitaire',
  necromancien: 'Solitaire',
};

const VICTOIRE: Record<Camp, string> = {
  pelerins: 'Victoire des Pèlerins',
  spectres: 'Victoire des Spectres',
  trinite: 'Victoire de la Trinité',
  doubles: 'Victoire des Doubles',
  maudit: 'Victoire du Maudit',
  sectaire: 'Victoire du Sectaire',
  envouteur: "Victoire de l'Envoûteur",
  necromancien: 'Victoire du Nécromancien',
};
/** Carte affichée en fin de partie pour le camp gagnant. */
const IMAGE_CAMP: Record<Camp, string> = {
  pelerins: 'pelerin',
  spectres: 'spectre',
  trinite: 'trinite',
  doubles: 'doubles',
  maudit: 'maudit',
  sectaire: 'sectaire',
  envouteur: 'envouteur',
  necromancien: 'necromancien',
};

function nom(id: JoueurId): string {
  const j = ui.etat?.joueurs.find((x) => x.id === id);
  return echapper(j ? nomJoueur(j) : `siège ${id}`);
}

function bouton(texte: string, attrs: string, classe = ''): string {
  return `<button type="button" class="${classe}" ${attrs}>${texte}</button>`;
}

/** La partie est dans la nuit d'explication (avant la première nuit). */
function enExplication(): boolean {
  return ui.etat?.phase.type === 'explication';
}

function titrePhase(etat: EtatPartie): string {
  const p = etat.phase;
  if (p.type === 'explication') return "📜 Nuit d'explication";
  if (p.type === 'nuit') return p.numero === 1 ? '🌙 Première nuit' : `🌙 Nuit ${p.numero}`;
  if (p.type === 'jour') return p.numero === 0 ? "☀️ Élection de l'Alpha" : `☀️ Jour ${p.numero}`;
  return '🏁 Fin de partie';
}

/** Sièges que le MJ peut toucher à cette étape. */
function siegesActifs(etape: Etape): JoueurId[] {
  switch (etape.type) {
    case 'explication':
      return etape.ciblesPossibles;
    case 'reveil':
      return modeSaisie(etape.role, enExplication()).type === 'cibles' ? etape.ciblesPossibles : [];
    case 'decision':
      return etape.ciblesPossibles;
    case 'election-alpha':
      return etape.candidats;
    case 'vote':
      if (ui.modeVote === 'mains') return etape.ciblesPossibles;
      return ui.votant === null ? etape.votants : etape.ciblesPossibles;
    default:
      return [];
  }
}

function nombreACocher(etape: Etape): number {
  if (etape.type === 'reveil') {
    const mode = modeSaisie(etape.role, enExplication());
    return mode.type === 'cibles' ? Math.min(mode.nombre, etape.ciblesPossibles.length) : 0;
  }
  return 1;
}

// ─── Écran 1 : choix du plan ──────────────────────────────────────────

function ecranChoix(): string {
  const plans = tousLesPlans();
  const salles = sallesDisponibles(plans);
  const nombres = nombresDeJoueurs(ui.salle, plans);
  const nbCeSoir = ui.ajustement?.plan.nbJoueurs ?? ui.nbJoueurs;
  const champsPrenoms = Array.from({ length: nbCeSoir }, (_, i) => {
    const valeur = echapper(ui.prenoms[i] ?? '');
    return `<label class="prenom"><span>${i + 1}</span><input data-prenom="${i}" value="${valeur}" placeholder="Prénom (facultatif)" autocomplete="off"></label>`;
  }).join('');

  return `
    <main class="choix">
      <header class="entete">
        <img class="blason" src="${import.meta.env.BASE_URL}blason.webp" alt="Blason de la Malédiction des Spectres">
        <h1>La Malédiction des Spectres</h1>
        <p class="sous-titre">Assistant du maître du jeu</p>
      </header>
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
          ${bouton('📷 Scanner une salle', 'data-scanner')}
          ${estPerso(ui.salle, ui.nbJoueurs) ? bouton('Partager (QR code)', 'data-partager') : ''}
          ${estPerso(ui.salle, ui.nbJoueurs) ? bouton('Supprimer ce plan', 'data-supprimer-plan', 'discret') : ''}
        </div>
      </section>
      ${ui.info ? `<p class="info">${echapper(ui.info)}</p>` : ''}
      ${
        ui.ajustement
          ? blocAjustement(ui.ajustement)
          : ui.nbJoueurs > 0
            ? `<div>${bouton('✏️ Ajuster la partie (joueurs en plus ou en moins)', 'data-ajuster')}</div>`
            : ''
      }
      ${ui.nbJoueurs > 0 ? `<section class="carte"><h2>Prénoms</h2><div class="prenoms">${champsPrenoms}</div></section>` : ''}
      ${ui.erreur ? `<p class="erreur">${echapper(ui.erreur)}</p>` : ''}
      ${bouton(`Commencer la partie${nbCeSoir > 0 ? ` à ${nbCeSoir}` : ''}`, 'data-commencer', 'principal')}
    </main>`;
}

// ─── Écran 2 : la partie ──────────────────────────────────────────────

function siege(j: Joueur, etape: Etape, actifs: JoueurId[], compte: Record<JoueurId, number>): string {
  const pos = ui.plan?.sieges.find((s) => s.numero === j.id)?.position ?? { x: 50, y: 50 };
  const etat = ui.etat!;
  const acteur = (etape.type === 'reveil' || etape.type === 'explication') && etape.acteurs.includes(j.id);
  const classes = [
    'siege',
    `camp-${j.camp}`,
    j.vivant ? '' : 'mort',
    actifs.includes(j.id) ? 'actif' : '',
    ui.selection.includes(j.id) || ui.votant === j.id || ui.cibleMains === j.id ? 'choisi' : '',
    acteur ? 'acteur' : '',
  ].join(' ');
  const badges = [
    etat.alpha === j.id ? '👑' : '',
    j.statuts.protege ? '🛡️' : '',
    j.statuts.occupe ? '💤' : '',
    etat.marque === j.id ? '🪶' : '',
    j.statuts.enrole ? '⛓️' : '',
    j.statuts.charme ? '🎵' : '',
    j.vivant ? '' : '💀',
  ].join('');
  const vote = ui.votes[j.id];
  const infoVote = [
    vote !== undefined && vote !== null ? `<span class="fleche">→ ${vote}</span>` : '',
    compte[j.id] ? `<span class="voix">${compte[j.id]} voix</span>` : '',
  ].join('');

  return `
    <button type="button" class="${classes}" data-siege="${j.id}" style="--x:${pos.x};--y:${pos.y}"
      ${actifs.includes(j.id) || etape.type === 'vote' ? '' : 'tabindex="-1"'}>
      <img class="vignette" src="${image(j.role)}" alt="" ${SI_PAS_D_IMAGE}>
      <span class="num">${j.id}</span>
      <span class="nom">${echapper(j.nom ?? '')}</span>
      <span class="role">${echapper(ROLES[j.role].nom)}</span>
      <span class="badges">${badges}</span>
      ${infoVote}
    </button>`;
}

function nbVotesSaisis(): number {
  return Object.values(ui.votes).filter((v) => v !== null).length;
}

function totalMains(): number {
  return Object.values(ui.mains).reduce((total, n) => total + n, 0);
}

/** Vote voix par voix : toucher un votant, puis le joueur qu'il vise. */
function saisieVoixParVoix(): string {
  return `
    <p class="consigne">Touche un votant, puis le joueur qu'il vise. La voix de l'Alpha 👑 compte double.</p>
    <p>${
      ui.votant === null
        ? 'Touche un votant, ou directement le joueur à éliminer.'
        : `${nom(ui.votant)} vote contre… (touche-le à nouveau pour annuler)`
    }</p>
    ${
      ui.votant === null
        ? ''
        : `<div class="raccourci">
             <p>Vote rapide : pas besoin de saisir les voix.</p>
             ${bouton(`Éliminer directement ${nom(ui.votant)}`, `data-eliminer="${ui.votant}"`)}
           </div>`
    }`;
}

/** Nombres proposés d'un seul toucher pour les mains levées contre un joueur. */
const MAINS_RAPIDES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Vote à main levée : toucher un joueur, puis dire combien de mains se lèvent contre lui. */
function saisieMainsLevees(etape: Extract<Etape, { type: 'vote' }>): string {
  const nbVotants = etape.votants.length;
  const total = totalMains();
  const cible = ui.cibleMains;
  const alpha = etape.alpha;
  let saisie = '<p>Touche le joueur visé sur le plan, puis le nombre de mains levées contre lui.</p>';
  if (cible !== null) {
    const n = ui.mains[cible] ?? 0;
    const plein = total >= nbVotants;
    saisie = `
      <div class="mains">
        <p>Mains levées contre <strong>${nom(cible)}</strong> :</p>
        <div class="compteur grand">
          ${bouton('−', `data-mains-pas="-1" aria-label="Une main de moins" ${n === 0 ? 'disabled' : ''}`, 'rond')}
          <strong>${n}</strong>
          ${bouton('+', `data-mains-pas="1" aria-label="Une main de plus" ${plein ? 'disabled' : ''}`, 'rond')}
        </div>
        <div class="choix-ligne nombres">${MAINS_RAPIDES.filter((k) => k <= nbVotants)
          .map((k) => bouton(String(k), `data-mains="${k}" ${k - n > nbVotants - total ? 'disabled' : ''}`, k === n ? 'actif' : ''))
          .join('')}</div>
        ${bouton(
          `👑 L'Alpha (${nom(alpha)}) a levé la main contre ${nom(cible)}`,
          `data-vote-alpha="${cible}" aria-pressed="${ui.voteAlpha === cible}" ${n === 0 ? 'disabled' : ''}`,
          ui.voteAlpha === cible ? 'actif' : '',
        )}
        <div class="raccourci">
          <p>Vote rapide : pas besoin de compter.</p>
          ${bouton(`Éliminer directement ${nom(cible)}`, `data-eliminer="${cible}"`)}
        </div>
      </div>`;
  }
  return `
    <p class="consigne">Compte les mains levées contre chaque joueur. La voix de l'Alpha 👑 compte double : dis contre qui il a levé la main.</p>
    ${saisie}
    <p class="max">Mains comptées : ${total} sur ${nbVotants} votants.</p>`;
}

/** Erreur de saisie du vote en cours (trop de mains…), affichée sans bloquer l'écran. */
let erreurVote: string | null = null;

function panneau(etape: Etape, compte: Record<JoueurId, number>): string {
  const etat = ui.etat!;
  const choisis = ui.selection.map(nom).join(', ') || '—';
  const valider = (pret: boolean) => bouton('Valider', `data-valider ${pret ? '' : 'disabled'}`, 'principal');

  switch (etape.type) {
    case 'explication': {
      const def = ROLES[etape.role];
      const camp = def.campVariable && def.camp === 'pelerins' ? 'Variable' : NOM_CAMP_ROLE[def.camp];
      const contexte = {
        explication: true,
        augure: false,
        maudit: etat.joueurs.some((j) => j.role === 'maudit'),
      };
      // Pour la meute (Spectre, Originel ou Maudit qui lance la reconnaissance), la consigne des Spectres.
      const consigne =
        etape.mode === 'reconnaissance' && ['spectre', 'originel', 'maudit'].includes(etape.role)
          ? consigneReveil('spectre', contexte)
          : etape.mode === 'presentation'
            ? 'Explique ce rôle à la table.'
            : consigneReveil(etape.role, contexte);
      const qui = etape.acteurs.length > 0 ? `<p class="qui">${etape.acteurs.length > 1 ? 'Joueurs' : 'Joueur'} : ${etape.acteurs.map(nom).join(', ')}</p>` : '';
      const saisie =
        etape.mode === 'choix'
          ? `<p>Touche un siège sur le plan. Choix : <strong>${choisis}</strong></p>
             <div class="boutons">${valider(ui.selection.length === 1)}</div>`
          : `<div class="boutons">${bouton(
              etape.mode === 'reconnaissance' ? 'Reconnaissance faite' : etape.rang === etape.total ? 'Terminer' : 'Rôle suivant',
              'data-passer',
              'principal',
            )}</div>`;
      return `
        <p class="progression">Rôle ${etape.rang} sur ${etape.total}</p>
        ${illustration(etape.role, def.nom)}
        <h2 class="titre-role">${echapper(def.nom)}${etape.nombre > 1 ? ` <span class="nombre">× ${etape.nombre}</span>` : ''}</h2>
        <p class="camp-role">${camp}</p>
        <p class="regle">${echapper(def.description)}</p>
        <p class="consigne">${consigne}</p>
        ${qui}
        ${saisie}`;
    }
    case 'reveil': {
      const contexte = {
        explication: etat.phase.type === 'explication',
        augure: etat.joueurs.some((j) => j.vivant && j.role === 'augure'),
        maudit: etat.joueurs.some((j) => j.vivant && j.role === 'maudit'),
      };
      const mode = modeSaisie(etape.role, enExplication());
      const nombre = nombreACocher(etape);
      const qui = etape.acteurs.map(nom).join(', ');
      let saisie = '';
      if (mode.type === 'aucune') {
        saisie = `<div class="boutons">${bouton(mode.bouton, 'data-passer', 'principal')}</div>`;
      } else if (mode.type === 'sainte') {
        const victime = etape.ciblesPossibles[0];
        saisie =
          victime === undefined
            ? `<p>Pas de victime cette nuit.</p><div class="boutons">${bouton('Continuer', 'data-sainte="non"', 'principal')}</div>`
            : `<p>Victime : <strong>${nom(victime)}</strong></p>
               <div class="boutons">
                 ${bouton('Sauver la victime', 'data-sainte="oui"', 'principal')}
                 ${bouton('Ne pas utiliser la potion', 'data-sainte="non"')}
               </div>`;
      } else if (mode.type === 'oui-non') {
        const victime = etape.role === 'originel' ? etape.ciblesPossibles[0] : undefined;
        saisie = `
          ${victime === undefined ? '' : `<p>Victime : <strong>${nom(victime)}</strong></p>`}
          <div class="boutons">
            ${bouton(echapper(mode.oui.texte), 'data-oui-non="oui"', 'principal')}
            ${bouton(echapper(mode.non.texte), 'data-oui-non="non"')}
          </div>`;
      } else {
        const pret = nombre > 0 && ui.selection.length === nombre;
        const consigneSaisie =
          nombre === 0 ? 'Personne à désigner.' : `Touche ${nombre === 1 ? 'un siège' : `${nombre} sièges`} sur le plan.`;
        saisie = `
          <p>${consigneSaisie} Choix : <strong>${choisis}</strong></p>
          <div class="boutons">
            ${valider(pret)}
            ${mode.passer ? bouton(echapper(mode.passer.texte), 'data-passer-role') : ''}
          </div>`;
      }
      return `
        ${illustration(etape.role, ROLES[etape.role].nom)}
        <h2 class="titre-role">${echapper(ROLES[etape.role].nom)}</h2>
        <p class="consigne">${consigneReveil(etape.role, contexte)}</p>
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
        <div class="boutons">${bouton('Le village se réveille', 'data-passer', 'principal')}</div>`;

    case 'decision': {
      const d = etape.decision;
      if (d.type === 'usurpateur') {
        return `
          ${illustration('usurpateur', "L'Usurpateur")}
          <h2 class="titre-role">L'Usurpateur</h2>
          <p class="consigne">${nom(d.mort)} va mourir. ${nom(d.usurpateur)} veut-il prendre son rôle (${echapper(
            ROLES[etat.joueurs.find((j) => j.id === d.mort)!.role].nom,
          )}) ?</p>
          <div class="boutons">
            ${bouton('Il prend le rôle', `data-usurper="${d.mort}"`, 'principal')}
            ${bouton('Il refuse', 'data-passer')}
          </div>`;
      }
      if (d.type === 'sacrifice') {
        return `
          ${illustration('sacrifie', 'Le Sacrifié')}
          <h2 class="titre-role">Le Sacrifié</h2>
          <p class="consigne">Le village condamne ${nom(d.condamne)}. Le Sacrifié (${nom(
            d.sacrifie,
          )}) se manifeste-t-il pour mourir à sa place ?</p>
          <div class="boutons">
            ${bouton('Il se sacrifie', 'data-sacrifice="oui"', 'principal')}
            ${bouton('Non', 'data-sacrifice="non"')}
          </div>`;
      }
      if (d.type === 'bourreau') {
        return `
          ${illustration('bourreau', 'Le Bourreau')}
          <h2 class="titre-role">Le Bourreau</h2>
          <p class="consigne">Le Bourreau (${nom(d.bourreau)}) a-t-il fait le signe pour un second vote ? (une seule fois)</p>
          <div class="boutons">
            ${bouton('Second vote', 'data-second-vote="oui"', 'principal')}
            ${bouton('Non, la nuit tombe', 'data-second-vote="non"')}
          </div>`;
      }
      const titre = d.type === 'main-noire' ? 'La Main Noire' : "Successeur de l'Alpha";
      const texte =
        d.type === 'main-noire'
          ? `${nom(d.tireur)} meurt : la Main Noire élimine un joueur de son choix.`
          : `L'Alpha ${nom(d.ancien)} est mort : il désigne son successeur.`;
      return `
        ${illustration(d.type === 'main-noire' ? 'main-noire' : 'alpha', titre)}
        <h2 class="titre-role">${titre}</h2>
        <p class="consigne">${texte}</p>
        <p>Choix : <strong>${choisis}</strong></p>
        <div class="boutons">
          ${valider(ui.selection.length === 1)}
          ${bouton(d.type === 'main-noire' ? 'Ne tire pas' : 'Pas de successeur', 'data-passer')}
        </div>`;
    }

    case 'election-alpha':
      return `
        ${illustration('alpha', "L'Alpha")}
        <h2 class="titre-role">Élection de l'Alpha</h2>
        <p class="consigne">Le village élit son Alpha, le maire : son vote comptera double.${
          etape.numero === 0 ? ' Ensuite, la partie commence par la première nuit.' : ''
        }</p>
        <p>Élu : <strong>${choisis}</strong></p>
        <div class="boutons">
          ${valider(ui.selection.length === 1)}
          ${etape.numero === 0 ? bouton('Élire plus tard', 'data-passer') : ''}
        </div>`;

    case 'vote': {
      const classement = Object.entries(compte)
        .sort((a, b) => b[1] - a[1])
        .map(([id, n]) => `<li>${nom(Number(id))} : ${n} voix</li>`)
        .join('');
      const rappels = `
        ${
          etat.marque !== null && etat.joueurs.some((j) => j.id === etat.marque && j.vivant)
            ? `<p>🪶 Marque de l'Inquisiteur : ${nom(etat.marque)} part avec une voix contre lui.</p>`
            : ''
        }
        ${
          !etat.joueurs.some((j) => !j.vivant)
            ? ''
            : mortsVotent(etape.numero)
              ? `<p>🕯️ Jour pair : les morts votent aussi (1 voix chacun)${
                  ui.modeVote === 'mains' ? ', compte leurs mains' : ', touche-les comme les vivants'
                }.</p>`
              : '<p>🕯️ Jour impair : les morts peuvent parler, mais ne votent pas.</p>'
        }
        ${
          etat.joueurs.some((j) => j.vivant && j.statuts.enrole)
            ? '<p>⛓️ Les enrôlés doivent voter comme le Sectaire.</p>'
            : ''
        }`;
      const modes = `
        <div class="choix-ligne" role="group" aria-label="Façon de saisir le vote">
          ${bouton('✋ Main levée', 'data-mode-vote="mains"', ui.modeVote === 'mains' ? 'actif' : '')}
          ${bouton('👆 Voix par voix', 'data-mode-vote="voix"', ui.modeVote === 'voix' ? 'actif' : '')}
        </div>`;
      return `
        <h2>Vote du village</h2>
        ${modes}
        ${ui.modeVote === 'mains' ? saisieMainsLevees(etape) : saisieVoixParVoix()}
        ${rappels}
        ${classement ? `<ul class="classement">${classement}</ul>` : ''}
        ${erreurVote ? `<p class="attention">${echapper(erreurVote)}</p>` : ''}
        <div class="boutons">
          ${
            ui.modeVote === 'mains'
              ? bouton(
                  `Valider le vote (${totalMains()} mains)`,
                  `data-voter-mains ${totalMains() === 0 || erreurVote ? 'disabled' : ''}`,
                  'principal',
                )
              : bouton(
                  `Valider le vote (${nbVotesSaisis()})`,
                  `data-voter ${nbVotesSaisis() === 0 ? 'disabled' : ''}`,
                  'principal',
                )
          }
          ${bouton('Personne n\'est éliminé', 'data-passer')}
        </div>`;
    }

    case 'fin':
      return `
        ${
          etape.gagnants === null
            ? `<img class="blason-fin" src="${import.meta.env.BASE_URL}blason.webp" alt="">`
            : illustration(IMAGE_CAMP[etape.gagnants], VICTOIRE[etape.gagnants])
        }
        <h2 class="titre-role">Fin de la partie</h2>
        <p class="victoire ${etape.gagnants ?? ''}">${
          etape.gagnants === null ? 'Personne ne gagne' : VICTOIRE[etape.gagnants]
        }</p>
        <div class="boutons">${bouton('Nouvelle partie', 'data-nouvelle', 'principal')}</div>`;
  }
}

/** Plein écran pour montrer à l'Oracle le rôle du joueur qu'il a désigné. */
function ecranRevelation(id: JoueurId): string {
  const joueur = ui.etat!.joueurs.find((j) => j.id === id)!;
  const role = ROLES[joueur.role];
  return `
    <main class="revelation" aria-label="Rôle à montrer à l'Oracle">
      <p class="revelation-qui">${nom(id)}</p>
      <img class="revelation-carte" src="${image(joueur.role)}" alt="" ${SI_PAS_D_IMAGE}>
      <h1 class="revelation-role">${echapper(role.nom)}</h1>
      ${bouton('Continuer', 'data-fin-revelation', 'discret')}
    </main>`;
}

function ecranPartie(): string {
  const etat = ui.etat!;
  const etape = etapeSuivante(etat);
  const actifs = siegesActifs(etape);
  let compte: Record<JoueurId, number> = {};
  erreurVote = null;
  if (etape.type === 'vote') {
    try {
      compte =
        ui.modeVote === 'mains'
          ? compterMainsLevees(etat, ui.mains, ui.voteAlpha).compte
          : compterVotes(etat, ui.votes).compte;
    } catch (e) {
      // Saisie incomplète ou impossible : pas de compte, on dit pourquoi (vote à main levée).
      if (ui.modeVote === 'mains') erreurVote = e instanceof Error ? e.message : String(e);
    }
  }

  return `
    <header class="barre">
      <span class="phase">${titrePhase(etat)}</span>
      <span class="actions-barre">
        ${bouton('↶ Annuler', `data-annuler ${ui.historique.length === 0 ? 'disabled' : ''}`, 'discret')}
        ${etat.phase.type === 'explication' ? bouton("Passer l'explication", 'data-passer-explication', 'discret') : ''}
        ${bouton('Quitter', 'data-quitter', 'discret')}
      </span>
    </header>
    <main class="partie">
      <section class="salle ${densite(etat.joueurs.length)}" aria-label="Plan de la salle">
        ${etat.joueurs.map((j) => siege(j, etape, actifs, compte)).join('')}
      </section>
      <section class="panneau">
        ${panneau(etape, compte)}
        ${etat.infoMJ ? `<p class="info">ℹ️ ${echapper(etat.infoMJ)}</p>` : ''}
        ${ui.erreur ? `<p class="erreur">${echapper(ui.erreur)}</p>` : ''}
      </section>
    </main>`;
}

/** Thème de la charte : Nuit pendant les réveils et hors partie, Jour du matin à la nuit suivante. */
function themeVoulu(): 'nuit' | 'jour' {
  const phase = ui.generateur ? null : ui.etat?.phase.type;
  return phase === 'jour' || phase === 'fin' ? 'jour' : 'nuit';
}

const moinsDAnimations = window.matchMedia('(prefers-reduced-motion: reduce)');

function afficher(): void {
  if (!ui.scanner) arreterScan();
  app.innerHTML = ui.generateur
    ? ecranGenerateur(ui.generateur)
    : ui.partage
      ? ecranPartage(ui.partage, ui.info)
    : ui.scanner
      ? ecranScanner(ui.erreur)
    : ui.etat && ui.revelation !== null
      ? ecranRevelation(ui.revelation)
      : ui.etat
        ? ecranPartie()
        : ecranChoix();

  // Bascule nuit / jour : fondu de 600 ms (le fond de page change en douceur via le CSS).
  const theme = themeVoulu();
  const racine = document.documentElement;
  if (racine.dataset.theme !== theme) {
    const premiereFois = racine.dataset.theme === undefined;
    racine.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'jour' ? '#16130e' : '#0d1113');
    if (!premiereFois && !moinsDAnimations.matches) {
      app.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 600, easing: 'ease-out' });
    }
  }

  // Scanner : la caméra se (re)lance dans la vidéo qu'on vient d'afficher.
  const video = app.querySelector<HTMLVideoElement>('video.camera');
  if (ui.scanner && video && !ui.cameraEnPanne) {
    void demarrerScan(
      video,
      (texte) => {
        if (importerSalle(texte)) ui.scanner = false;
        afficher();
      },
      (message) => {
        ui.cameraEnPanne = true;
        ui.erreur = message;
        afficher();
      },
    );
  }
}

// ─── Clics ────────────────────────────────────────────────────────────

function toucherSiege(id: JoueurId): void {
  const etape = etapeSuivante(ui.etat!);
  if (etape.type === 'vote' && ui.modeVote === 'mains') {
    if (!etape.ciblesPossibles.includes(id)) return;
    ui.cibleMains = ui.cibleMains === id ? null : id;
    return;
  }
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
    case 'explication':
      if (etape.role === 'anatheme') jouer({ type: 'anatheme-choisir-modele', cible });
      if (etape.role === 'adepte') jouer({ type: 'adepte-choisir-mentor', cible });
      return;
    case 'reveil': {
      const mode = modeSaisie(etape.role, enExplication());
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

/**
 * Clics du bloc « Ajuster la partie » sur l'écran de choix. Renvoie true si le clic le concernait.
 * Les prénoms suivent les sièges : retirer le siège 7 fait remonter les prénoms des sièges 8, 9…
 */
function clicAjustement(d: DOMStringMap): boolean {
  if (d.ajuster !== undefined) {
    try {
      ui.ajustement = nouvelAjustement(choisirPlan(ui.salle, ui.nbJoueurs, tousLesPlans()), ui.prenoms);
    } catch (e) {
      ui.erreur = e instanceof Error ? e.message : String(e);
    }
    return true;
  }
  const a = ui.ajustement;
  if (!a) return false;
  ui.erreur = null;
  try {
    if (d.ajusterSiege !== undefined) {
      const n = Number(d.ajusterSiege);
      a.siegeChoisi = a.siegeChoisi === n ? null : n;
    } else if (d.retirerSiege !== undefined) {
      const n = Number(d.retirerSiege);
      a.plan = retirerSiege(a.plan, n);
      ui.prenoms.splice(n - 1, 1);
      a.siegeChoisi = null;
    } else if (d.ajouterSiege !== undefined) {
      const role = app.querySelector<HTMLSelectElement>('[data-role-ajout]')?.value as RoleId | undefined;
      a.plan = ajouterSiege(a.plan, role ?? a.roleAjout);
      a.siegeChoisi = a.plan.nbJoueurs; // on montre le nouveau siège
    } else if (d.annulerAjustement !== undefined) {
      ui.prenoms = a.prenomsPrevus;
      ui.ajustement = null;
    } else if (d.enregistrerAjustement !== undefined) {
      const plan = a.plan;
      const existe = tousLesPlans().some((p) => p.salle === plan.salle && p.nbJoueurs === plan.nbJoueurs);
      if (existe && !confirm(`Remplacer la salle « ${plan.salle} » à ${plan.nbJoueurs} joueurs ?`)) return true;
      const prenoms = ui.prenoms;
      ajouterPlanPerso(plan);
      ui.prenoms = prenoms; // on garde les prénoms déjà saisis
      ui.ajustement = null;
      ui.info = `Salle « ${plan.salle} » à ${plan.nbJoueurs} joueurs enregistrée.`;
    } else {
      return false;
    }
  } catch (e) {
    ui.erreur = e instanceof Error ? e.message : String(e);
  }
  return true;
}

app.addEventListener('click', (evt) => {
  if (clicApresDeplacement()) return; // fin d'un glisser de siège, pas un clic
  const el = (evt.target as HTMLElement).closest<HTMLElement>('button');
  if (!el || el.hasAttribute('disabled')) return;
  const d = el.dataset;

  if (d.annuler !== undefined) return annulerDerniereAction();

  // Révélation à l'Oracle : seul le bouton Continuer la ferme.
  if (d.finRevelation !== undefined) {
    ui.revelation = null;
    return afficher();
  }

  // Partage d'une salle (QR code) et scanner
  if (d.partager !== undefined) {
    ui.partage = plansPerso.find((p) => p.salle === ui.salle && p.nbJoueurs === ui.nbJoueurs) ?? null;
    ui.info = null;
    return afficher();
  }
  if (d.fermerPartage !== undefined) {
    ui.partage = null;
    ui.info = null;
    return afficher();
  }
  if (d.copierLien !== undefined && ui.partage) {
    const lien = lienDePartage(ui.partage);
    navigator.clipboard
      ?.writeText(lien)
      .then(() => (ui.info = 'Lien copié : envoie-le à la tablette (message, mail…).'))
      .catch(() => (ui.info = `Copie impossible. Le lien : ${lien}`))
      .finally(afficher);
    return;
  }
  if (d.scanner !== undefined) {
    ui.scanner = true;
    ui.cameraEnPanne = false;
    ui.erreur = null;
    ui.info = null;
    return afficher();
  }
  if (d.fermerScanner !== undefined) {
    ui.scanner = false;
    ui.erreur = null;
    return afficher();
  }
  if (d.importerLien !== undefined) {
    const lien = app.querySelector<HTMLInputElement>('[data-lien-salle]')?.value ?? '';
    if (importerSalle(lien)) ui.scanner = false;
    return afficher();
  }

  // Générateur de salle
  if (ui.generateur) {
    const resultat = clicGenerateur(ui.generateur, d);
    if (resultat?.type === 'enregistrer') ajouterPlanPerso(resultat.plan);
    if (resultat) ui.generateur = null;
    return afficher();
  }

  // Écran de choix
  if (!ui.etat) ui.info = null;
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
    ui.ajustement = null;
  } else if (d.nb !== undefined) {
    ui.nbJoueurs = Number(d.nb);
    ui.ajustement = null;
  } else if (!ui.etat && clicAjustement(d)) {
    // Bloc « Ajuster la partie » : traité dans clicAjustement.
  } else if (d.commencer !== undefined) {
    try {
      const plan = ui.ajustement?.plan ?? choisirPlan(ui.salle, ui.nbJoueurs, tousLesPlans());
      const prenoms = Array.from({ length: plan.nbJoueurs }, (_, i) => ui.prenoms[i] || null);
      ui.etat = creerPartie(plan, prenoms);
      ui.plan = plan;
      ui.historique = [];
      ui.ajustement = null;
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
      const mode = modeSaisie(etape.role, enExplication());
      if (mode.type === 'cibles' && mode.passer) return jouer(mode.passer.action);
    }
  } else if (d.sainte !== undefined) {
    return jouer({ type: 'sainte-sauver', utiliser: d.sainte === 'oui' });
  } else if (d.usurper !== undefined) {
    return jouer({ type: 'usurpateur-remplacer', cible: Number(d.usurper) });
  } else if (d.passerExplication !== undefined) {
    const sansChoix = ui.etat!.joueurs.some(
      (j) => (j.role === 'anatheme' || j.role === 'adepte') && j.memoire.lien === null,
    );
    const message =
      "Passer toute la nuit d'explication ?" +
      (sansChoix ? "\nL'Anathème et l'Adepte qui n'ont pas encore choisi joueront sans modèle ni mentor." : '');
    if (!confirm(message)) return;
    return jouer({ type: 'passer-explication' });
  } else if (d.ouiNon !== undefined) {
    const etape = etapeSuivante(ui.etat!);
    if (etape.type === 'reveil') {
      const mode = modeSaisie(etape.role, enExplication());
      if (mode.type === 'oui-non') return jouer(d.ouiNon === 'oui' ? mode.oui.action : mode.non.action);
    }
  } else if (d.sacrifice !== undefined) {
    return jouer({ type: 'sacrifice', accepter: d.sacrifice === 'oui' });
  } else if (d.secondVote !== undefined) {
    return jouer({ type: 'second-vote', accepter: d.secondVote === 'oui' });
  } else if (d.eliminer !== undefined) {
    return jouer({ type: 'eliminer', cible: Number(d.eliminer) });
  } else if (d.voter !== undefined) {
    return jouer({ type: 'vote', votes: ui.votes });
  } else if (d.voterMains !== undefined) {
    return jouer({ type: 'vote-main-levee', mains: ui.mains, voteAlpha: ui.voteAlpha });
  } else if (d.modeVote !== undefined) {
    // Changer de façon de saisir repart d'une saisie vide (les deux ne se mélangent pas).
    ui.modeVote = d.modeVote === 'voix' ? 'voix' : 'mains';
    viderSaisie();
  } else if ((d.mains !== undefined || d.mainsPas !== undefined) && ui.cibleMains !== null) {
    const cible = ui.cibleMains;
    const avant = ui.mains[cible] ?? 0;
    const n = Math.max(0, d.mains !== undefined ? Number(d.mains) : avant + Number(d.mainsPas));
    ui.mains = { ...ui.mains, [cible]: n };
    if (n === 0) delete ui.mains[cible];
    if (n === 0 && ui.voteAlpha === cible) ui.voteAlpha = null;
  } else if (d.voteAlpha !== undefined) {
    const cible = Number(d.voteAlpha);
    ui.voteAlpha = ui.voteAlpha === cible ? null : cible;
  } else if (d.quitter !== undefined) {
    if (!confirm('Abandonner la partie en cours ?')) return;
    ui.etat = null;
    ui.plan = null;
    ui.historique = [];
    viderSaisie();
    sauvegarder();
  } else if (d.nouvelle !== undefined) {
    ui.etat = null;
    ui.plan = null;
    ui.historique = [];
    viderSaisie();
    sauvegarder();
  }
  afficher();
});

// Générateur et ajustement : appui long sur un siège puis glisser pour le placer.
activerDeplacement(app, (numero, position) => {
  if (position && ui.generateur) deplacerDansGenerateur(ui.generateur, numero, position);
  else if (position && ui.ajustement && !ui.etat) {
    ui.ajustement.plan = deplacerSiege(ui.ajustement.plan, numero, position);
  }
  afficher();
});

// Ajustement : listes déroulantes des rôles (rôle du siège touché, rôle du siège à ajouter).
app.addEventListener('change', (evt) => {
  const el = evt.target as HTMLSelectElement;
  const a = ui.ajustement;
  if (!a) return;
  if (el.dataset.roleAjout !== undefined) a.roleAjout = el.value as RoleId;
  if (el.dataset.ajusterRole !== undefined && a.siegeChoisi !== null) {
    try {
      a.plan = changerRole(a.plan, a.siegeChoisi, el.value as RoleId);
      ui.erreur = null;
    } catch (e) {
      ui.erreur = e instanceof Error ? e.message : String(e);
    }
    afficher();
  }
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

/** Lien de partage ouvert directement (QR code scanné avec l'appareil photo) : on ajoute la salle. */
function importerDepuisLien(): void {
  if (!new RegExp(`[#?&]${PARAM_PARTAGE}=`).test(location.hash)) return;
  importerSalle(location.hash);
  history.replaceState(null, '', location.pathname + location.search);
}

restaurer();
importerDepuisLien();
afficher();
void garderEcranAllume();
