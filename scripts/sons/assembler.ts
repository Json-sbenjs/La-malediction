// Monte les sons de l'appli (public/sons/) à partir des bases libres de droits.
//
//   npm run sons                   → tous les sons, puis CREDITS.md
//   npm run sons -- role_spectre   → seulement ceux nommés
//
// 1. télécharge chaque source utilisée dans .cache/sons-sources/ (une seule fois, hors dépôt) ;
// 2. monte les couches décrites dans montages.ts (extraits, volumes, fondus, filtres) ;
// 3. met chaque son au même volume perçu que les autres de son canal ;
// 4. encode en MP3 (il faut ffmpeg) ;
// 5. réécrit la partie « Sons » de CREDITS.md à partir des sources utilisées.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { SONS, TOUS_LES_SONS, type IdSon } from '../../src/web/sons-catalogue.ts';
import { SR, ajouter, avecMarges, boucleFondue, filtre, fondus, reverb, vitesse, type Son } from './dsp.ts';
import { MONTAGES, type Couche } from './montages.ts';
import { CREDIT_OCULUS, SOURCES, type IdSource } from './sources.ts';

const RACINE = join(import.meta.dirname, '../..');
const CACHE = join(RACINE, '.cache/sons-sources');

// ─── Sources : téléchargement et décodage ─────────────────────────────

function cheminCache(id: IdSource): string {
  const extension = SOURCES[id].url.split('.').pop()!.split('?')[0];
  return join(CACHE, `${id}.${extension}`);
}

async function telecharger(id: IdSource): Promise<void> {
  const fichier = cheminCache(id);
  if (existsSync(fichier)) return;
  mkdirSync(CACHE, { recursive: true });
  const reponse = await fetch(SOURCES[id].url, { headers: { 'User-Agent': 'Mozilla/5.0 (generateur de sons)' } });
  if (!reponse.ok) throw new Error(`${id} : téléchargement impossible (${reponse.status}) ${SOURCES[id].url}`);
  writeFileSync(fichier, Buffer.from(await reponse.arrayBuffer()));
}

const decodes = new Map<IdSource, Son[]>();

/** Source décodée en stéréo 44,1 kHz (deux canaux, même pour une source mono). */
function decoder(id: IdSource): Son[] {
  let canaux = decodes.get(id);
  if (!canaux) {
    const brut = execFileSync('ffmpeg', ['-v', 'error', '-i', cheminCache(id), '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], {
      maxBuffer: 1 << 30,
    });
    const tout = new Float32Array(brut.buffer, brut.byteOffset, brut.byteLength / 4);
    const n = tout.length / 2;
    const g = new Float32Array(n);
    const d = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      g[i] = tout[2 * i];
      d[i] = tout[2 * i + 1];
    }
    canaux = [g, d];
    decodes.set(id, canaux);
  }
  return canaux;
}

// ─── Montage ──────────────────────────────────────────────────────────

/** Extrait d'une couche, prêt à être placé (un tableau par canal). */
function extrait(couche: Couche, nbCanaux: number): Son[] {
  const source = decoder(couche.source);
  const longueurSource = source[0].length;
  const debut = Math.round((couche.depuis ?? 0) * SR);
  const n = couche.duree === undefined ? longueurSource - debut : Math.round(couche.duree * SR);
  let canaux = source.map((c) => {
    const out = new Float32Array(Math.max(0, n));
    for (let i = 0; i < out.length; i++) {
      const k = debut + i;
      out[i] = couche.enBoucle ? c[k % longueurSource] : (c[k] ?? 0);
    }
    return out;
  });
  if (nbCanaux === 1) {
    const mono = new Float32Array(canaux[0].length);
    for (let i = 0; i < mono.length; i++) mono[i] = (canaux[0][i] + canaux[1][i]) / 2;
    canaux = [mono];
  }
  return canaux.map((c) => {
    let s = couche.vitesse ? vitesse(c, couche.vitesse) : c;
    if (couche.passeHaut) s = filtre(s, 'passe-haut', couche.passeHaut);
    if (couche.passeBas) s = filtre(s, 'passe-bas', couche.passeBas);
    fondus(s, couche.fonduEntree ?? 0.003, couche.fonduSortie ?? 0.01);
    if (couche.gain !== undefined) for (let i = 0; i < s.length; i++) s[i] *= couche.gain;
    return s;
  });
}

function monter(id: IdSon): Son[] {
  const montage = MONTAGES[id];
  const nbCanaux = SONS[id].canal === 'effet' ? 1 : 2;
  const couches = montage.couches.map((couche) => ({ debut: couche.a ?? 0, canaux: extrait(couche, nbCanaux) }));
  const duree = Math.max(...couches.map((c) => c.debut + c.canaux[0].length / SR));
  let canaux: Son[] = Array.from({ length: nbCanaux }, () => new Float32Array(Math.ceil(duree * SR)));
  for (const { debut, canaux: c } of couches) c.forEach((s, k) => ajouter(canaux[k], s, debut));
  if (montage.reverb) canaux = canaux.map((s) => reverb(s, montage.reverb, 0.85, 0.4, 1.5));
  return canaux;
}

// ─── Niveau, fin, boucles ─────────────────────────────────────────────

/** Pic maximal autorisé, tous canaux confondus (marge pour l'encodage MP3). */
const PIC_MAX_DB = -1;
/** Volume perçu visé par défaut selon le canal (LUFS). */
const NIVEAU_PAR_CANAL = { musique: -18, ambiance: -20, effet: -19 } as const;

/**
 * Volume perçu approché (en dB) : moyenne quadratique sur les tranches de 50 ms qui comptent
 * (on ignore celles à plus de 30 dB sous la plus forte), après un passe-haut qui imite
 * l'oreille, moins sensible aux graves (idée de la norme LUFS, en plus simple).
 */
function volumePercu(canaux: Son[]): number {
  const mono = new Float32Array(canaux[0].length);
  for (const c of canaux) for (let i = 0; i < mono.length; i++) mono[i] += c[i] / canaux.length;
  filtre(mono, 'passe-haut', 120);
  const taille = Math.round(0.05 * SR);
  const tranches: number[] = [];
  for (let debut = 0; debut + taille <= mono.length; debut += taille) {
    let somme = 0;
    for (let i = debut; i < debut + taille; i++) somme += mono[i] * mono[i];
    tranches.push(somme / taille);
  }
  if (tranches.length === 0) tranches.push(mono.reduce((a, x) => a + x * x, 0) / mono.length);
  const max = Math.max(...tranches);
  const gardees = tranches.filter((t) => t > max / 1000);
  return 10 * Math.log10(gardees.reduce((a, b) => a + b, 0) / gardees.length);
}

/** Au plus, de combien chaque passe du limiteur peut écraser les pics (dB) pour atteindre le volume voulu. */
const LIMITATION_MAX_DB = 9;

/**
 * Limiteur de pics : baisse le volume juste le temps d'un pic (anticipation 3 ms, retour en 80 ms),
 * pour que les sons très percussifs (hache, coup sourd, tic-tac) sonnent aussi fort que les autres.
 */
function limiter(canaux: Son[], plafond: number): void {
  const n = canaux[0].length;
  const avance = Math.round(0.003 * SR);
  const retour = Math.exp(-1 / (0.08 * SR));
  const besoin = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let pic = 0;
    for (const c of canaux) pic = Math.max(pic, Math.abs(c[i]));
    besoin[i] = pic > plafond ? plafond / pic : 1;
  }
  // Le gain descend AVANT le pic (anticipation) et remonte doucement après.
  const gain = new Float32Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    if (besoin[i] < 1) for (let k = Math.max(0, i - avance); k <= i; k++) gain[k] = Math.min(gain[k], besoin[i] ** ((i - k) / avance === 0 ? 1 : 1 - (i - k) / (avance + 1)));
  }
  let g = 1;
  for (let i = 0; i < n; i++) {
    g = gain[i] < g ? gain[i] : 1 - (1 - g) * retour;
    g = Math.min(g, gain[i] < 1 ? gain[i] : g);
    for (const c of canaux) c[i] *= g;
  }
}

/**
 * Volume perçu en LUFS (norme EBU R128, mesuré par ffmpeg), comme les plateformes audio.
 * Les sons de moins de 0,6 s sont trop courts pour la norme : on garde alors l'estimation maison.
 */
function volume(canaux: Son[], dossierTemp: string): number {
  if (canaux[0].length / SR >= 0.6) {
    const temp = join(dossierTemp, 'mesure.wav');
    writeFileSync(temp, wav(canaux));
    // ffmpeg écrit la mesure sur la sortie d'erreur : « I: -18.3 LUFS » dans le résumé final.
    const { stderr } = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', temp, '-af', 'ebur128', '-f', 'null', '-'], {
      encoding: 'utf8',
    });
    const mesure = /Summary:[\s\S]*?I:\s+(-?[\d.]+) LUFS/.exec(stderr);
    if (mesure && Number(mesure[1]) > -69) return Number(mesure[1]);
  }
  return volumePercu(canaux);
}

function mettreAuNiveau(canaux: Son[], niveauDb: number, dossierTemp: string): void {
  const plafond = 10 ** (PIC_MAX_DB / 20);
  // Plusieurs passes : limiter un pic fait aussi baisser un peu le volume perçu, on corrige ensuite.
  for (let passe = 0; passe < 4; passe++) {
    let pic = 0;
    for (const c of canaux) for (let i = 0; i < c.length; i++) pic = Math.max(pic, Math.abs(c[i]));
    if (pic === 0 || !Number.isFinite(pic)) throw new Error('son vide ou invalide');
    const voulu = 10 ** ((niveauDb - volume(canaux, dossierTemp)) / 20);
    const k = Math.min(voulu, (plafond / pic) * 10 ** (LIMITATION_MAX_DB / 20));
    if (passe > 0 && Math.abs(20 * Math.log10(k)) < 0.3) return;
    for (const c of canaux) for (let i = 0; i < c.length; i++) c[i] *= k;
    if (pic * k > plafond) limiter(canaux, plafond);
  }
}

/** Coupe le silence du début et de la fin (sous −50 dB) : le son part dès qu'on touche. */
function rogner(canaux: Son[]): Son[] {
  const seuil = 10 ** (-50 / 20);
  const fort = (i: number) => canaux.some((c) => Math.abs(c[i]) > seuil);
  let debut = 0;
  while (debut < canaux[0].length - 1 && !fort(debut)) debut++;
  let fin = canaux[0].length - 1;
  while (fin > debut && !fort(fin)) fin--;
  debut = Math.max(0, debut - Math.round(0.002 * SR));
  fin = Math.min(canaux[0].length, fin + Math.round(0.05 * SR));
  return canaux.map((c) => fondus(c.slice(debut, fin), 0.002, 0.03));
}

// ─── Fichiers ─────────────────────────────────────────────────────────

/** Fichier WAV 16 bits (1 ou 2 canaux). */
function wav(canaux: Son[]): Buffer {
  const n = canaux[0].length;
  const octets = n * canaux.length * 2;
  const b = Buffer.alloc(44 + octets);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + octets, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(canaux.length, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * canaux.length * 2, 28);
  b.writeUInt16LE(canaux.length * 2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(octets, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (const c of canaux) {
      b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, c[i])) * 32767), o);
      o += 2;
    }
  }
  return b;
}

function assembler(id: IdSon, dossierTemp: string): void {
  const def = SONS[id];
  const montage = MONTAGES[id];
  let canaux = monter(id);
  if (def.boucle === undefined) {
    canaux = rogner(canaux);
  } else {
    const fondu = montage.fondu ?? 3;
    const voulu = def.boucle + fondu;
    if (canaux[0].length / SR < voulu - 0.01) throw new Error(`${id} : le montage doit durer au moins ${voulu} s`);
    canaux = canaux.map((c) => boucleFondue(c, def.boucle!, fondu));
  }
  mettreAuNiveau(canaux, montage.niveau ?? NIVEAU_PAR_CANAL[def.canal], dossierTemp);
  if (def.boucle !== undefined) canaux = canaux.map(avecMarges);

  const temp = join(dossierTemp, `${id}.wav`);
  writeFileSync(temp, wav(canaux));
  const sortie = join(RACINE, 'public', def.fichier);
  mkdirSync(dirname(sortie), { recursive: true });
  const debit = def.canal === 'musique' ? '160k' : def.canal === 'ambiance' ? '128k' : '96k';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', temp, '-codec:a', 'libmp3lame', '-b:a', debit, sortie]);
  console.log(`✓ ${def.fichier}  (${(canaux[0].length / SR).toFixed(1)} s, ${canaux.length === 1 ? 'mono' : 'stéréo'})`);
}

// ─── Crédits ──────────────────────────────────────────────────────────

const DEBUT_CREDITS = '<!-- sons:debut (écrit par npm run sons, ne pas modifier à la main) -->';
const FIN_CREDITS = '<!-- sons:fin -->';

/** Réécrit la liste des sources dans CREDITS.md, entre les deux marqueurs. */
function ecrireCredits(): void {
  const utilisations = new Map<IdSource, IdSon[]>();
  for (const id of TOUS_LES_SONS) {
    for (const couche of MONTAGES[id].couches) {
      const liste = utilisations.get(couche.source) ?? [];
      if (!liste.includes(id)) liste.push(id);
      utilisations.set(couche.source, liste);
    }
  }
  const lignes = [...utilisations.entries()]
    .sort(([a], [b]) => SOURCES[a].auteur.localeCompare(SOURCES[b].auteur) || SOURCES[a].titre.localeCompare(SOURCES[b].titre))
    .map(([source, sons]) => {
      const s = SOURCES[source];
      return `| ${s.titre} | ${s.auteur} | [source](${s.page}) | ${s.licence} | oui (coupé, volume) | ${sons.map((x) => `\`${x}\``).join(', ')} |`;
    });
  const bloc = [
    DEBUT_CREDITS,
    '',
    '| Son de base | Auteur | Source | Licence | Modifié | Utilisé dans |',
    '|---|---|---|---|---|---|',
    ...lignes,
    '',
    `Sons du pack Oculus : ${CREDIT_OCULUS}`,
    '',
    FIN_CREDITS,
  ].join('\n');
  const chemin = join(RACINE, 'CREDITS.md');
  const texte = readFileSync(chemin, 'utf8');
  const a = texte.indexOf(DEBUT_CREDITS);
  const b = texte.indexOf(FIN_CREDITS);
  if (a < 0 || b < 0) throw new Error('CREDITS.md : marqueurs sons:debut / sons:fin introuvables');
  writeFileSync(chemin, texte.slice(0, a) + bloc + texte.slice(b + FIN_CREDITS.length));
  console.log(`✓ CREDITS.md (${lignes.length} sources)`);
}

// ─── Lancement ────────────────────────────────────────────────────────

const demandes = process.argv.slice(2);
const inconnus = demandes.filter((d) => !(d in SONS));
if (inconnus.length > 0) {
  console.error(`Sons inconnus : ${inconnus.join(', ')}\nSons possibles : ${TOUS_LES_SONS.join(', ')}`);
  process.exit(1);
}
const aFaire = demandes.length > 0 ? (demandes as IdSon[]) : TOUS_LES_SONS;
const sourcesUtiles = new Set(aFaire.flatMap((id) => MONTAGES[id].couches.map((c) => c.source)));
for (const source of sourcesUtiles) await telecharger(source);

const dossierTemp = mkdtempSync(join(tmpdir(), 'malediction-sons-'));
try {
  for (const id of aFaire) assembler(id, dossierTemp);
} finally {
  rmSync(dossierTemp, { recursive: true, force: true });
}
if (demandes.length === 0) ecrireCredits();
