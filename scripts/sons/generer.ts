// Génère tous les sons de l'appli dans public/sons/ à partir des recettes.
//
//   npm run sons                  → tous les sons
//   npm run sons -- role_spectre  → seulement ceux nommés
//
// Il faut ffmpeg (encodage MP3, le seul format que l'iPad lit partout).
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { SONS, TOUS_LES_SONS, type IdSon } from '../../src/web/sons-catalogue.ts';
import { SR, avecMarges, filtre, fondus, type Son, type Stereo } from './dsp.ts';
import { RECETTES } from './recettes.ts';

const RACINE = join(import.meta.dirname, '../..');

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
      b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, c[i] ?? 0)) * 32767), o);
      o += 2;
    }
  }
  return b;
}

/** Pic maximal autorisé, tous canaux confondus (marge pour l'encodage MP3). */
const PIC_MAX_DB = -1;

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
  const max = Math.max(...tranches);
  const gardees = tranches.filter((t) => t > max / 1000);
  return 10 * Math.log10(gardees.reduce((a, b) => a + b, 0) / gardees.length);
}

/** Met le son au volume perçu voulu, sans dépasser PIC_MAX_DB. */
function mettreAuNiveau(canaux: Son[], niveauDb: number): void {
  let pic = 0;
  for (const c of canaux) for (let i = 0; i < c.length; i++) pic = Math.max(pic, Math.abs(c[i]));
  if (pic === 0 || !Number.isFinite(pic)) throw new Error('son vide ou invalide');
  const gainVolume = 10 ** ((niveauDb - volumePercu(canaux)) / 20);
  const gainPic = 10 ** (PIC_MAX_DB / 20) / pic;
  const k = Math.min(gainVolume, gainPic);
  for (const c of canaux) for (let i = 0; i < c.length; i++) c[i] *= k;
}

/** Volume perçu par défaut selon le canal. */
const NIVEAU_PAR_CANAL = { musique: -17, ambiance: -21, effet: -19 } as const;

/** Coupe le silence de la fin (sous −60 dB), puis met un petit fondu pour éviter le « plop ». */
function couperFin(canaux: Son[]): Son[] {
  const seuil = 10 ** (-60 / 20);
  let fin = 0;
  for (const c of canaux) for (let i = c.length - 1; i > fin; i--) if (Math.abs(c[i]) > seuil) { fin = i; break; }
  const longueur = Math.min(canaux[0].length, fin + Math.round(0.05 * SR));
  return canaux.map((c) => fondus(c.slice(0, longueur), 0, 0.03));
}

function generer(id: IdSon, dossierTemp: string): void {
  const def = SONS[id];
  const recette = RECETTES[id];
  const debut = Date.now();
  const brut: Son | Stereo = recette.fabriquer();
  let canaux: Son[] = brut instanceof Float32Array ? [brut] : [brut.g, brut.d];
  mettreAuNiveau(canaux, recette.niveau ?? NIVEAU_PAR_CANAL[def.canal]);
  canaux = def.boucle === undefined ? couperFin(canaux) : canaux.map(avecMarges);

  const temp = join(dossierTemp, `${id}.wav`);
  writeFileSync(temp, wav(canaux));
  const sortie = join(RACINE, 'public', def.fichier);
  mkdirSync(dirname(sortie), { recursive: true });
  const debit = def.canal === 'musique' ? '160k' : def.canal === 'ambiance' ? '128k' : '96k';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', temp, '-codec:a', 'libmp3lame', '-b:a', debit, sortie]);
  const duree = (canaux[0].length / SR).toFixed(1);
  console.log(`✓ ${def.fichier}  (${duree} s, ${canaux.length === 1 ? 'mono' : 'stéréo'}, ${Date.now() - debut} ms)`);
}

const demandes = process.argv.slice(2);
const inconnus = demandes.filter((d) => !(d in SONS));
if (inconnus.length > 0) {
  console.error(`Sons inconnus : ${inconnus.join(', ')}\nSons possibles : ${TOUS_LES_SONS.join(', ')}`);
  process.exit(1);
}
const dossierTemp = mkdtempSync(join(tmpdir(), 'malediction-sons-'));
try {
  for (const id of demandes.length > 0 ? (demandes as IdSon[]) : TOUS_LES_SONS) generer(id, dossierTemp);
} finally {
  rmSync(dossierTemp, { recursive: true, force: true });
}
