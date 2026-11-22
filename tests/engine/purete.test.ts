// Garde-fou : le moteur doit tourner sur l'iPad, donc pas de Node ni de DOM.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DOSSIER = join(import.meta.dirname, '../../src/engine');
const INTERDITS = [
  /from ['"](node:)?(fs|readline|path|child_process)['"]/,
  /\bprocess\./,
  /\b(document|window|localStorage)\b/,
];

const fichiers = readdirSync(DOSSIER).filter((f) => f.endsWith('.ts'));

describe('moteur pur', () => {
  it.each(fichiers)("%s n'utilise ni Node ni le DOM", (fichier) => {
    const code = readFileSync(join(DOSSIER, fichier), 'utf8');
    for (const motif of INTERDITS) {
      expect(code, `${fichier} contient ${motif}`).not.toMatch(motif);
    }
  });
});
