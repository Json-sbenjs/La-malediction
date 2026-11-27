// Lecteur de sons de l'appli (Web Audio). Trois volumes réglables : musique, ambiance, effets.
//
// - Les navigateurs (Safari sur iPad surtout) n'autorisent le son qu'après un geste :
//   `debloquerAudio()` est appelé à chaque clic, et tout démarre au premier.
// - Effets : fichiers décodés en mémoire, lecture immédiate.
// - Musique et ambiances : boucles sans couture (voir MARGE_BOUCLE dans sons-catalogue.ts).
// - Musique du MJ : son propre fichier (musique-perso.ts), lu en continu par un <audio>.
// Le choix des sons selon la partie est dans sons-evenements.ts.
import { lireMusiquePerso, enregistrerMusiquePerso, oublierMusiquePerso } from './musique-perso';
import { MARGE_BOUCLE, MORCEAUX, SONS, type Canal, type IdMorceau, type IdSon } from './sons-catalogue';
import type { SonPrevu } from './sons-evenements';

export interface Reglages {
  /** Volumes de 0 à 100 (0 = coupé). */
  musique: number;
  ambiance: number;
  effets: number;
  /** Tout couper d'un coup (bouton de la barre pendant la partie). */
  muet: boolean;
  /** Nom du fichier de musique choisi par le MJ (null = une musique d'origine). */
  musiquePerso: string | null;
  /** Musique d'origine choisie (quand le MJ n'a pas mis son propre fichier). */
  morceau: IdMorceau;
}

const CLE_REGLAGES = 'malediction:sons';
const REGLAGES_DEFAUT: Reglages = { musique: 50, ambiance: 60, effets: 80, muet: false, musiquePerso: null, morceau: MORCEAUX[0].id };

/** Durée des fondus entre deux ambiances ou deux musiques (s). */
const FONDU = 2.5;

function lireReglages(): Reglages {
  try {
    const lus = { ...REGLAGES_DEFAUT, ...(JSON.parse(localStorage.getItem(CLE_REGLAGES) ?? '{}') as Partial<Reglages>) };
    // Morceau inconnu (ancienne version de l'appli) : on reprend celui par défaut.
    if (!MORCEAUX.some((m) => m.id === lus.morceau)) lus.morceau = REGLAGES_DEFAUT.morceau;
    return lus;
  } catch {
    return { ...REGLAGES_DEFAUT };
  }
}

const reglages = lireReglages();

function ecrireReglages(): void {
  try {
    localStorage.setItem(CLE_REGLAGES, JSON.stringify(reglages));
  } catch {
    // Stockage indisponible : les réglages durent jusqu'à la fermeture.
  }
}

export function lesReglages(): Readonly<Reglages> {
  return reglages;
}

// ─── Graphe audio ─────────────────────────────────────────────────────

interface Graphe {
  ctx: AudioContext;
  maitre: GainNode;
  bus: Record<Canal, GainNode>;
  /** Fondu de la musique selon la phase (coupée le jour), après le réglage de volume du MJ. */
  phaseMusique: GainNode;
}

let graphe: Graphe | null = null;
const tampons = new Map<IdSon, Promise<AudioBuffer>>();

/** Ce qui joue en boucle : une source et son fondu. */
interface Boucle {
  id: string;
  gain: GainNode;
  arreter: () => void;
  /** Relance la lecture si le navigateur l'a bloquée (musique du MJ lue par un <audio>). */
  reprendre?: () => void;
}
let ambiance: Boucle | null = null;
let musique: Boucle | null = null;
/** Ambiance voulue par l'écran (appliquée dès que le son est débloqué). */
let ambianceVoulue: IdSon | null = null;
/** La musique doit-elle s'entendre ? (non le jour : voir musiqueDe dans sons-evenements.ts) */
let musiqueVoulue = true;
/** Sources du dernier lot d'effets : un nouveau lot les coupe (on ne superpose pas deux réveils). */
let lotEnCours: AudioBufferSourceNode[] = [];
/** Nombre de sons demandés : main.ts s'en sert pour savoir si un clic a déjà son propre son. */
let demandes = 0;

function volume(canal: Canal): number {
  const v = canal === 'musique' ? reglages.musique : canal === 'ambiance' ? reglages.ambiance : reglages.effets;
  return (v / 100) ** 2; // courbe plus naturelle pour l'oreille
}

function appliquerVolumes(): void {
  if (!graphe) return;
  const t = graphe.ctx.currentTime;
  graphe.maitre.gain.setTargetAtTime(reglages.muet ? 0 : 1, t, 0.05);
  for (const canal of ['musique', 'ambiance', 'effet'] as Canal[]) {
    graphe.bus[canal].gain.setTargetAtTime(volume(canal), t, 0.05);
  }
}

function url(fichier: string): string {
  return `${import.meta.env.BASE_URL}${fichier}`;
}

function charger(id: IdSon): Promise<AudioBuffer> {
  let p = tampons.get(id);
  if (!p && graphe) {
    const { ctx } = graphe;
    p = fetch(url(SONS[id].fichier))
      .then((r) => {
        if (!r.ok) throw new Error(`son introuvable : ${SONS[id].fichier}`);
        return r.arrayBuffer();
      })
      .then((octets) => ctx.decodeAudioData(octets));
    // En cas d'échec (hors ligne, fichier absent), on réessaiera la prochaine fois.
    p.catch(() => tampons.delete(id));
    tampons.set(id, p);
  }
  return p ?? Promise.reject(new Error('son pas encore débloqué'));
}

/**
 * À appeler dans chaque geste du MJ (clic) : crée et réveille le contexte audio,
 * puis lance la musique et l'ambiance voulues.
 */
export function debloquerAudio(): void {
  if (!graphe) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    // iPad : jouer même si l'interrupteur « silencieux » est activé (Safari 17+).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
    const ctx = new Ctx();
    const maitre = ctx.createGain();
    maitre.connect(ctx.destination);
    const bus = {} as Record<Canal, GainNode>;
    for (const canal of ['musique', 'ambiance', 'effet'] as Canal[]) {
      bus[canal] = ctx.createGain();
      bus[canal].connect(maitre);
    }
    // Musique : bus → fondu de phase → maître.
    const phaseMusique = ctx.createGain();
    phaseMusique.gain.value = musiqueVoulue ? 1 : 0;
    bus.musique.disconnect();
    bus.musique.connect(phaseMusique);
    phaseMusique.connect(maitre);
    graphe = { ctx, maitre, bus, phaseMusique };
    appliquerVolumes();
    // Les sons d'interface sont préchargés : ils doivent répondre tout de suite.
    for (const id of Object.keys(SONS) as IdSon[]) if (id.startsWith('ui_')) void charger(id).catch(() => {});
  }
  if (graphe.ctx.state !== 'running') void graphe.ctx.resume();
  if (!musique) void lancerMusique();
  else musique.reprendre?.();
  if (ambiance?.id !== ambianceVoulue) changerAmbiance();
}

// Écran éteint ou appli en arrière-plan : on met le son en pause.
document.addEventListener('visibilitychange', () => {
  if (!graphe) return;
  if (document.visibilityState === 'hidden') void graphe.ctx.suspend();
  else void graphe.ctx.resume().catch(() => {});
});

// ─── Effets ───────────────────────────────────────────────────────────

function jouerTampon(tampon: AudioBuffer, quand: number): AudioBufferSourceNode | null {
  if (!graphe) return null;
  const source = graphe.ctx.createBufferSource();
  source.buffer = tampon;
  source.connect(graphe.bus.effet);
  source.start(quand);
  return source;
}

/** Joue un son d'interface (clic, sélection…), sans couper les autres. */
export function jouerEffet(id: IdSon): void {
  demandes++;
  if (!graphe || reglages.effets === 0) return;
  const { ctx } = graphe;
  void charger(id)
    .then((t) => jouerTampon(t, ctx.currentTime))
    .catch(() => {});
}

/**
 * Joue une suite de sons de la partie (transition, mort, réveil d'un rôle…).
 * Le lot précédent s'arrête en douceur : en passant vite les étapes, les réveils ne s'empilent pas.
 */
export function jouerLot(lot: SonPrevu[]): void {
  if (lot.length === 0) return;
  demandes++;
  if (!graphe || reglages.effets === 0) return;
  const { ctx } = graphe;
  for (const source of lotEnCours) {
    try {
      source.stop(ctx.currentTime + 0.05);
    } catch {
      // Déjà arrêtée.
    }
  }
  const lotActuel: AudioBufferSourceNode[] = [];
  lotEnCours = lotActuel;
  const depart = ctx.currentTime + 0.06;
  for (const { son, delai } of lot) {
    void charger(son)
      .then((t) => {
        if (lotEnCours !== lotActuel) return; // un lot plus récent est arrivé pendant le chargement
        const quand = Math.max(depart + delai, ctx.currentTime);
        const source = jouerTampon(t, quand);
        if (source) lotActuel.push(source);
      })
      .catch(() => {});
  }
}

/** Nombre de sons demandés depuis le début (sert à éviter un double son sur un même clic). */
export function nombreDeSonsDemandes(): number {
  return demandes;
}

// ─── Boucles : musique et ambiance ────────────────────────────────────

/** Démarre une boucle (fichier préparé avec ses marges) avec un fondu d'entrée. */
function boucleDeTampon(id: IdSon, tampon: AudioBuffer, canal: Canal): Boucle {
  const { ctx, bus } = graphe!;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(bus[canal]);
  const source = ctx.createBufferSource();
  source.buffer = tampon;
  source.loop = true;
  source.loopStart = MARGE_BOUCLE;
  source.loopEnd = MARGE_BOUCLE + (SONS[id].boucle ?? tampon.duration - 2 * MARGE_BOUCLE);
  source.connect(gain);
  source.start(ctx.currentTime, MARGE_BOUCLE);
  gain.gain.setTargetAtTime(1, ctx.currentTime, FONDU / 3);
  return { id, gain, arreter: () => source.stop() };
}

/** Coupe une boucle avec un fondu de sortie. */
function eteindre(boucle: Boucle | null): void {
  if (!boucle || !graphe) return;
  const t = graphe.ctx.currentTime;
  boucle.gain.gain.cancelScheduledValues(t);
  boucle.gain.gain.setTargetAtTime(0, t, FONDU / 4);
  setTimeout(() => {
    boucle.arreter();
    boucle.gain.disconnect();
  }, FONDU * 1000 + 500);
}

/** Musique audible ou non selon la phase : fondu de sortie le jour, fondu d'entrée la nuit. */
export function definirMusique(audible: boolean): void {
  if (audible === musiqueVoulue) return;
  musiqueVoulue = audible;
  if (graphe) graphe.phaseMusique.gain.setTargetAtTime(audible ? 1 : 0, graphe.ctx.currentTime, FONDU / 3);
}

/** Ambiance voulue par l'écran (null = aucune). Fondu enchaîné si elle change. */
export function definirAmbiance(id: 'amb_nuit' | 'amb_jour' | null): void {
  ambianceVoulue = id;
  if (graphe && ambiance?.id !== id) changerAmbiance();
}

function changerAmbiance(): void {
  const id = ambianceVoulue;
  eteindre(ambiance);
  ambiance = null;
  if (!id || !graphe) return;
  // Place réservée tout de suite : pas de double démarrage pendant le chargement.
  const reservee: Boucle = { id, gain: graphe.ctx.createGain(), arreter: () => {} };
  ambiance = reservee;
  void charger(id)
    .then((t) => {
      if (ambiance !== reservee) return; // l'écran a changé pendant le chargement
      ambiance = boucleDeTampon(id, t, 'ambiance');
    })
    .catch(() => {
      if (ambiance === reservee) ambiance = null;
    });
}

/** Lance la musique : celle du MJ s'il en a choisi une, sinon la musique d'origine. */
async function lancerMusique(): Promise<void> {
  if (!graphe) return;
  const reservee: Boucle = { id: 'chargement', gain: graphe.ctx.createGain(), arreter: () => {} };
  musique = reservee;
  const perso = reglages.musiquePerso ? await lireMusiquePerso() : null;
  if (musique !== reservee) return;
  if (perso) {
    musique = boucleDeFichier(perso.fichier);
    return;
  }
  try {
    const id = reglages.morceau;
    const t = await charger(id);
    if (musique === reservee) musique = boucleDeTampon(id, t, 'musique');
  } catch {
    if (musique === reservee) musique = null;
  }
}

/** Musique du MJ : lue par un <audio> en boucle (un morceau entier ne tient pas décodé en mémoire). */
function boucleDeFichier(fichier: Blob): Boucle {
  const { ctx, bus } = graphe!;
  const lien = URL.createObjectURL(fichier);
  const audio = new Audio(lien);
  audio.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  ctx.createMediaElementSource(audio).connect(gain);
  gain.connect(bus.musique);
  void audio.play().catch(() => {});
  gain.gain.setTargetAtTime(1, ctx.currentTime, FONDU / 3);
  return {
    id: 'perso',
    gain,
    arreter: () => {
      audio.pause();
      URL.revokeObjectURL(lien);
    },
    reprendre: () => {
      if (audio.paused) void audio.play().catch(() => {});
    },
  };
}

function relancerMusique(): void {
  eteindre(musique);
  musique = null;
  if (graphe) void lancerMusique();
}

// ─── Réglages (écran d'accueil et barre de la partie) ────────────────

export function reglerVolume(canal: 'musique' | 'ambiance' | 'effets', valeur: number): void {
  reglages[canal] = Math.max(0, Math.min(100, Math.round(valeur)));
  ecrireReglages();
  appliquerVolumes();
}

export function basculerMuet(): void {
  reglages.muet = !reglages.muet;
  ecrireReglages();
  appliquerVolumes();
}

/** Le MJ choisit sa musique de fond (ex. le morceau de son choix, depuis la tablette). */
export async function choisirMusiquePerso(fichier: File): Promise<void> {
  await enregistrerMusiquePerso(fichier);
  reglages.musiquePerso = fichier.name;
  ecrireReglages();
  relancerMusique();
}

/** Choisir une des musiques d'origine (et oublier le fichier du MJ s'il y en avait un). */
export async function choisirMorceau(id: IdMorceau): Promise<void> {
  if (reglages.musiquePerso) await oublierMusiquePerso();
  reglages.musiquePerso = null;
  reglages.morceau = id;
  ecrireReglages();
  relancerMusique();
}
