// Garde-fou : chaque son du catalogue a son fichier, et le service worker les garde hors ligne.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SONS, TOUS_LES_SONS } from '../../src/web/sons-catalogue';
import { MONTAGES } from '../../scripts/sons/montages';
import { SOURCES } from '../../scripts/sons/sources';

const PUBLIC = join(import.meta.dirname, '../../public');

function fichiersMp3(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? fichiersMp3(join(dossier, e.name)) : e.name.endsWith('.mp3') ? [join(dossier, e.name)] : [],
  );
}

describe('fichiers de sons', () => {
  it.each(TOUS_LES_SONS)('%s a son fichier dans public/', (id) => {
    expect(existsSync(join(PUBLIC, SONS[id].fichier)), SONS[id].fichier).toBe(true);
  });

  it("aucun fichier de son n'est oublié dans le catalogue", () => {
    const attendus = new Set(TOUS_LES_SONS.map((id) => SONS[id].fichier));
    const enTrop = fichiersMp3(join(PUBLIC, 'sons'))
      .map((f) => relative(PUBLIC, f).split('\\').join('/'))
      .filter((f) => !attendus.has(f));
    expect(enTrop).toEqual([]);
  });

  it('le service worker met chaque son en cache (partie sans réseau)', () => {
    const sw = readFileSync(join(PUBLIC, 'sw.js'), 'utf8');
    const absents = TOUS_LES_SONS.filter((id) => !sw.includes(`'./${SONS[id].fichier}'`));
    expect(absents).toEqual([]);
  });

  it('les sons en boucle ont une longueur de boucle', () => {
    for (const id of ['musique_veillee', 'musique_requiem', 'musique_sorcellerie', 'amb_nuit', 'amb_jour'] as const) expect(SONS[id].boucle).toBeGreaterThan(0);
  });

  it('chaque son est monté à partir de bases déclarées, sous licence libre', () => {
    for (const id of TOUS_LES_SONS) {
      expect(MONTAGES[id].couches.length, id).toBeGreaterThan(0);
      for (const couche of MONTAGES[id].couches) {
        expect(SOURCES[couche.source], `${id} → ${couche.source}`).toBeDefined();
        expect(['CC0 1.0', 'CC BY 4.0']).toContain(SOURCES[couche.source].licence);
      }
    }
  });

  it('chaque base utilisée est créditée dans CREDITS.md (relancer npm run sons sinon)', () => {
    const credits = readFileSync(join(import.meta.dirname, '../../CREDITS.md'), 'utf8');
    const oublies = [...new Set(TOUS_LES_SONS.flatMap((id) => MONTAGES[id].couches.map((c) => c.source)))].filter(
      (source) => !credits.includes(`| ${SOURCES[source].titre} | ${SOURCES[source].auteur} |`),
    );
    expect(oublies).toEqual([]);
  });
});
