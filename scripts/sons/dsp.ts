// Outils de traitement du son, en TypeScript pur (aucune dépendance) : mixer, couper, filtrer, boucler.
// Servent seulement au monteur de sons (`npm run sons`), jamais à l'appli.
// On ne génère pas de son ici : on transforme des bases libres de droits (voir sources.ts et docs/sons.md).
// Un son = un Float32Array d'échantillons entre -1 et 1, à 44 100 Hz.

export const SR = 44100;

export type Son = Float32Array;
/** Son stéréo : canal gauche, canal droit. */
export interface Stereo {
  g: Son;
  d: Son;
}

export type TypeFiltre = 'passe-bas' | 'passe-haut' | 'passe-bande' | 'cloche';

/** Un nombre fixe, ou une courbe qui dépend du temps (en secondes). */
export type Valeur = number | ((t: number) => number);

const val = (v: Valeur, t: number): number => (typeof v === 'number' ? v : v(t));

/** Tampon de silence de `duree` secondes. */
export function silence(duree: number): Son {
  return new Float32Array(Math.max(1, Math.round(duree * SR)));
}

/** Fondu d'entrée et de sortie (en secondes). */
export function fondus(s: Son, entree: number, sortie: number): Son {
  const ne = Math.min(s.length, Math.round(entree * SR));
  const ns = Math.min(s.length, Math.round(sortie * SR));
  for (let i = 0; i < ne; i++) s[i] *= i / ne;
  for (let i = 0; i < ns; i++) s[s.length - 1 - i] *= i / ns;
  return s;
}

/** Ajoute `source` dans `dest` à partir de `debut` secondes (ce qui dépasse est coupé). */
export function ajouter(dest: Son, source: Son, debut = 0, gain = 1): Son {
  const o = Math.round(debut * SR);
  const n = Math.min(source.length, dest.length - o);
  for (let i = Math.max(0, -o); i < n; i++) dest[o + i] += source[i] * gain;
  return dest;
}

/** Change la vitesse de lecture (×0,5 = une octave plus grave et deux fois plus long). */
export function vitesse(s: Son, facteur: number): Son {
  const out = new Float32Array(Math.floor(s.length / facteur));
  for (let i = 0; i < out.length; i++) {
    const x = i * facteur;
    const k = Math.floor(x);
    const f = x - k;
    out[i] = (s[k] ?? 0) * (1 - f) + (s[k + 1] ?? 0) * f;
  }
  return out;
}

/**
 * Filtre le son. La fréquence de coupure peut bouger dans le temps (balayage, LFO).
 * `q` : résonance. `gainDb` : seulement pour le type « cloche » (égaliseur).
 */
export function filtre(s: Son, type: TypeFiltre, freq: Valeur, q = 0.707, gainDb = 0): Son {
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const calculer = (f: number) => {
    const w = (2 * Math.PI * Math.min(Math.max(f, 10), SR * 0.45)) / SR;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    const A = 10 ** (gainDb / 40);
    let a0: number;
    switch (type) {
      case 'passe-bas':
        b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2;
        a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
        break;
      case 'passe-haut':
        b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
        a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
        break;
      case 'passe-bande':
        b0 = alpha; b1 = 0; b2 = -alpha;
        a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
        break;
      case 'cloche':
        b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A;
        a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A;
        break;
    }
    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  };
  const variable = typeof freq !== 'number';
  calculer(val(freq, 0));
  for (let i = 0; i < s.length; i++) {
    if (variable && i % 32 === 0) calculer(val(freq, i / SR));
    const x = s[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    s[i] = y;
  }
  return s;
}

/** Réverbération de type Freeverb. Renvoie le son « mouillé » en stéréo (le sec n'y est pas). */
export function reverbStereo(s: Son, taille = 0.85, amorti = 0.3, queue = 3): Stereo {
  const longueur = s.length + Math.round(queue * SR);
  const entree = new Float32Array(longueur);
  entree.set(s);
  const canal = (ecart: number): Son => {
    const out = new Float32Array(longueur);
    const peignes = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((n) => {
      const l = Math.round(((n + ecart) * SR) / 44100);
      return { buf: new Float32Array(l), k: 0, filtre: 0 };
    });
    const passeTout = [556, 441, 341, 225].map((n) => ({ buf: new Float32Array(Math.round(((n + ecart) * SR) / 44100)), k: 0 }));
    for (let i = 0; i < longueur; i++) {
      const x = entree[i] * 0.015;
      let y = 0;
      for (const c of peignes) {
        const sortie = c.buf[c.k];
        c.filtre = sortie * (1 - amorti) + c.filtre * amorti;
        c.buf[c.k] = x + c.filtre * taille;
        c.k = (c.k + 1) % c.buf.length;
        y += sortie;
      }
      for (const a of passeTout) {
        const b = a.buf[a.k];
        a.buf[a.k] = y + b * 0.5;
        a.k = (a.k + 1) % a.buf.length;
        y = b - y;
      }
      out[i] = y;
    }
    return out;
  };
  return { g: canal(0), d: canal(23) };
}

/** Réverbération mono : son sec + son mouillé (le tampon s'allonge de la queue). */
export function reverb(s: Son, mix = 0.3, taille = 0.85, amorti = 0.3, queue = 3): Son {
  const r = reverbStereo(s, taille, amorti, queue);
  const out = new Float32Array(r.g.length);
  for (let i = 0; i < out.length; i++) out[i] = (s[i] ?? 0) * (1 - mix * 0.5) + ((r.g[i] + r.d[i]) / 2) * mix;
  return out;
}

/**
 * Boucle sans couture pour un son continu (drone, vent) : on génère `longueur + fondu`
 * secondes, puis la fin est fondue sur le début (fondu enchaîné à puissance constante).
 */
export function boucleFondue(s: Son, longueur: number, fondu: number): Son {
  const L = Math.round(longueur * SR);
  const C = Math.round(fondu * SR);
  const out = s.slice(0, L);
  for (let i = 0; i < C; i++) {
    const x = i / C;
    out[i] = s[i] * Math.sin((x * Math.PI) / 2) + (s[L + i] ?? 0) * Math.cos((x * Math.PI) / 2);
  }
  return out;
}

/**
 * Prépare un fichier en boucle : 1 s de la fin collée avant, 1 s du début collée après.
 * Le décalage que les encodeurs MP3 ajoutent en tête tombe ainsi dans du vrai son :
 * l'appli boucle de MARGE à MARGE + longueur et n'entend jamais de trou.
 */
export const MARGE_BOUCLE = 1;
export function avecMarges(s: Son): Son {
  const m = Math.round(MARGE_BOUCLE * SR);
  const out = new Float32Array(s.length + 2 * m);
  out.set(s.subarray(s.length - m), 0);
  out.set(s, m);
  out.set(s.subarray(0, m), m + s.length);
  return out;
}
