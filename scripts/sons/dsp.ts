// Boîte à outils de synthèse sonore, en TypeScript pur (aucune dépendance).
// Sert seulement au générateur de sons (`npm run sons`), jamais à l'appli.
// Un son = un Float32Array d'échantillons entre -1 et 1, à 44 100 Hz.

export const SR = 44100;

export type Son = Float32Array;
/** Son stéréo : canal gauche, canal droit. */
export interface Stereo {
  g: Son;
  d: Son;
}

/** Un nombre fixe, ou une courbe qui dépend du temps (en secondes). */
export type Valeur = number | ((t: number) => number);

const val = (v: Valeur, t: number): number => (typeof v === 'number' ? v : v(t));

/** Tampon de silence de `duree` secondes. */
export function silence(duree: number): Son {
  return new Float32Array(Math.max(1, Math.round(duree * SR)));
}

/** Hasard reproductible (même graine = même son à chaque génération). */
export function hasard(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fréquence d'une note MIDI (69 = la 440 Hz). */
export const note = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

// ─── Oscillateurs ──────────────────────────────────────────────────────

export type Onde = 'sinus' | 'scie' | 'carre' | 'triangle';

/** Correction anti-repliement (polyBLEP) pour les ondes à angles vifs. */
function blep(p: number, dt: number): number {
  if (p < dt) {
    const x = p / dt;
    return x + x - x * x - 1;
  }
  if (p > 1 - dt) {
    const x = (p - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

/** Oscillateur de `duree` secondes ; la fréquence peut varier (glissando, vibrato). */
export function oscillateur(onde: Onde, duree: number, freq: Valeur, phase = 0): Son {
  const s = silence(duree);
  let p = phase % 1;
  let tri = 0;
  for (let i = 0; i < s.length; i++) {
    const f = val(freq, i / SR);
    const dt = Math.min(0.49, Math.abs(f) / SR);
    switch (onde) {
      case 'sinus':
        s[i] = Math.sin(2 * Math.PI * p);
        break;
      case 'scie':
        s[i] = 2 * p - 1 - blep(p, dt);
        break;
      case 'carre':
        s[i] = (p < 0.5 ? 1 : -1) + blep(p, dt) - blep((p + 0.5) % 1, dt);
        break;
      case 'triangle': {
        // Carré intégré : triangle propre.
        const carre = (p < 0.5 ? 1 : -1) + blep(p, dt) - blep((p + 0.5) % 1, dt);
        tri = dt * carre + (1 - dt) * tri;
        s[i] = tri * 4;
        break;
      }
    }
    p += f / SR;
    p -= Math.floor(p);
  }
  return s;
}

/** Plusieurs oscillateurs légèrement désaccordés (« unison ») : son large et vivant. */
export function unisson(onde: Onde, duree: number, freq: Valeur, voix = 3, ecartCents = 12, graine = 1): Son {
  const alea = hasard(graine);
  const s = silence(duree);
  for (let v = 0; v < voix; v++) {
    const decal = voix === 1 ? 0 : (v / (voix - 1) - 0.5) * 2 * ecartCents;
    const k = 2 ** (decal / 1200);
    ajouter(s, oscillateur(onde, duree, (t) => val(freq, t) * k, alea()), 0, 1 / Math.sqrt(voix));
  }
  return s;
}

/** Bruit blanc. */
export function bruit(duree: number, graine = 7): Son {
  const alea = hasard(graine);
  const s = silence(duree);
  for (let i = 0; i < s.length; i++) s[i] = alea() * 2 - 1;
  return s;
}

/** Bruit « rose » (plus doux, plus naturel que le blanc : vent, souffle). */
export function bruitRose(duree: number, graine = 11): Son {
  const blanc = bruit(duree, graine);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < blanc.length; i++) {
    const w = blanc[i];
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    blanc[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return blanc;
}

/** Corde pincée (Karplus-Strong) : harpe, luth. */
export function corde(duree: number, freq: number, amorti = 0.996, graine = 3): Son {
  const alea = hasard(graine);
  const s = silence(duree);
  const n = Math.max(2, Math.round(SR / freq));
  const ligne = new Float32Array(n);
  for (let i = 0; i < n; i++) ligne[i] = alea() * 2 - 1;
  let k = 0;
  for (let i = 0; i < s.length; i++) {
    const suivant = (k + 1) % n;
    const v = ligne[k];
    ligne[k] = amorti * 0.5 * (ligne[k] + ligne[suivant]);
    s[i] = v;
    k = suivant;
  }
  return s;
}

/**
 * Cloche, verre, métal : somme de partiels inharmoniques qui décroissent.
 * `partiels` = [rapport de fréquence, volume, durée de décroissance en s].
 */
export function cloche(duree: number, freq: number, partiels: [number, number, number][]): Son {
  const s = silence(duree);
  for (const [rapport, volume, tau] of partiels) {
    const f = freq * rapport;
    if (f >= SR / 2) continue;
    for (let i = 0; i < s.length; i++) {
      const t = i / SR;
      s[i] += volume * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / tau);
    }
  }
  // Fondu de sortie : une cloche coupée net à la fin de son tampon fait un clic.
  return fondus(attaque(s, 0.002), 0, Math.min(0.25, duree * 0.3));
}

/** Partiels d'une cloche d'église (hum, fondamentale, tierce mineure, quinte, octave…). */
export const PARTIELS_CLOCHE: [number, number, number][] = [
  [0.5, 0.5, 4.5],
  [1, 1, 3],
  [1.19, 0.6, 2.2],
  [1.5, 0.4, 1.8],
  [2, 0.5, 1.5],
  [2.52, 0.25, 0.9],
  [3.01, 0.2, 0.6],
  [4.1, 0.12, 0.35],
];

/** Partiels d'un verre de cristal (aigu, pur, très long). */
export const PARTIELS_VERRE: [number, number, number][] = [
  [1, 1, 2.5],
  [2.76, 0.35, 1.2],
  [5.4, 0.15, 0.5],
  [8.93, 0.07, 0.25],
];

/** Partiels d'un objet métallique frappé (bouclier, lame). */
export const PARTIELS_METAL: [number, number, number][] = [
  [1, 1, 0.9],
  [1.47, 0.7, 0.7],
  [2.09, 0.6, 0.5],
  [2.56, 0.45, 0.4],
  [3.39, 0.35, 0.3],
  [4.18, 0.25, 0.2],
  [5.6, 0.2, 0.12],
];

// ─── Enveloppes et volume ──────────────────────────────────────────────

/** Multiplie le son par une courbe de volume. */
export function volume(s: Son, gain: Valeur): Son {
  for (let i = 0; i < s.length; i++) s[i] *= val(gain, i / SR);
  return s;
}

/** Attaque linéaire, tenue, puis relâchement exponentiel jusqu'à la fin du tampon. */
export function enveloppe(s: Son, attaqueS: number, decroissanceS: number, tenue = 0): Son {
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    let g: number;
    if (t < attaqueS) g = t / attaqueS;
    else if (t < attaqueS + tenue) g = 1;
    else g = Math.exp(-(t - attaqueS - tenue) / decroissanceS);
    s[i] *= g;
  }
  return s;
}

/** Attaque très courte au début (évite le clic de départ). */
export function attaque(s: Son, duree = 0.005): Son {
  const n = Math.min(s.length, Math.round(duree * SR));
  for (let i = 0; i < n; i++) s[i] *= i / n;
  return s;
}

/** Fondu d'entrée et de sortie (en secondes). */
export function fondus(s: Son, entree: number, sortie: number): Son {
  const ne = Math.min(s.length, Math.round(entree * SR));
  const ns = Math.min(s.length, Math.round(sortie * SR));
  for (let i = 0; i < ne; i++) s[i] *= i / ne;
  for (let i = 0; i < ns; i++) s[s.length - 1 - i] *= i / ns;
  return s;
}

/** Joue un son à l'envers. */
export function inverser(s: Son): Son {
  return s.slice().reverse();
}

// ─── Mixage ────────────────────────────────────────────────────────────

/** Ajoute `source` dans `dest` à partir de `debut` secondes (ce qui dépasse est coupé). */
export function ajouter(dest: Son, source: Son, debut = 0, gain = 1): Son {
  const o = Math.round(debut * SR);
  const n = Math.min(source.length, dest.length - o);
  for (let i = Math.max(0, -o); i < n; i++) dest[o + i] += source[i] * gain;
  return dest;
}

/** Place un son mono dans l'espace stéréo (−1 gauche, 0 centre, 1 droite). */
export function ajouterStereo(dest: Stereo, source: Son, debut = 0, gain = 1, pan = 0): Stereo {
  const angle = ((pan + 1) * Math.PI) / 4;
  ajouter(dest.g, source, debut, gain * Math.cos(angle));
  ajouter(dest.d, source, debut, gain * Math.sin(angle));
  return dest;
}

export function silenceStereo(duree: number): Stereo {
  return { g: silence(duree), d: silence(duree) };
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

// ─── Filtres (biquad RBJ) ──────────────────────────────────────────────

export type TypeFiltre = 'passe-bas' | 'passe-haut' | 'passe-bande' | 'cloche';

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

// ─── Effets ────────────────────────────────────────────────────────────

/** Saturation douce (tanh) : chaleur, grain analogique. */
export function saturer(s: Son, drive: number): Son {
  const k = Math.tanh(drive);
  for (let i = 0; i < s.length; i++) s[i] = Math.tanh(s[i] * drive) / k;
  return s;
}

/** Écrêtage dur : distorsion agressive. */
export function ecreter(s: Son, drive: number, seuil = 0.6): Son {
  for (let i = 0; i < s.length; i++) s[i] = Math.max(-seuil, Math.min(seuil, s[i] * drive)) / seuil;
  return s;
}

/** Écho : `temps` en secondes, `retour` entre 0 et 1. */
export function echo(s: Son, temps: number, retour: number, mix = 0.35): Son {
  const n = Math.round(temps * SR);
  const ligne = new Float32Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const retard = i >= n ? ligne[i - n] : 0;
    ligne[i] = s[i] + retard * retour;
    s[i] = s[i] + retard * mix;
  }
  return s;
}

/**
 * Chorus à retour : avec beaucoup de retour (80–90 %), il donne le son métallique
 * des drones d'horreur (vidéo C du skill sound-design-jeu).
 */
export function chorus(s: Son, delaiMs = 12, profondeurMs = 4, freqLfo = 0.3, retour = 0.5, mix = 0.5): Son {
  const taille = Math.round(((delaiMs + profondeurMs) / 1000) * SR) + 4;
  const ligne = new Float32Array(taille);
  let k = 0;
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    const d = ((delaiMs + profondeurMs * Math.sin(2 * Math.PI * freqLfo * t)) / 1000) * SR;
    const pos = (k - d + taille * 2) % taille;
    const a = Math.floor(pos);
    const f = pos - a;
    const lu = ligne[a] * (1 - f) + ligne[(a + 1) % taille] * f;
    ligne[k] = s[i] + lu * retour;
    s[i] = s[i] * (1 - mix) + lu * mix;
    k = (k + 1) % taille;
  }
  return s;
}

/** Compresseur simple : tient le niveau (sons d'ambiance, chorus à fort retour). */
export function compresser(s: Son, seuilDb = -18, ratio = 4, relache = 0.15): Son {
  const seuil = 10 ** (seuilDb / 20);
  const coefA = Math.exp(-1 / (0.005 * SR));
  const coefR = Math.exp(-1 / (relache * SR));
  let niveau = 0;
  for (let i = 0; i < s.length; i++) {
    const x = Math.abs(s[i]);
    niveau = x > niveau ? coefA * niveau + (1 - coefA) * x : coefR * niveau + (1 - coefR) * x;
    if (niveau > seuil) s[i] *= (seuil * (niveau / seuil) ** (1 / ratio)) / niveau;
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

/** Ajoute une réverbération à un son stéréo (envoi à `mix`). */
export function reverbSurStereo(s: Stereo, mix = 0.3, taille = 0.85, amorti = 0.3, queue = 3): Stereo {
  const mono = new Float32Array(s.g.length);
  for (let i = 0; i < mono.length; i++) mono[i] = (s.g[i] + s.d[i]) / 2;
  const r = reverbStereo(mono, taille, amorti, queue);
  const g = new Float32Array(r.g.length);
  const d = new Float32Array(r.d.length);
  for (let i = 0; i < g.length; i++) {
    g[i] = (s.g[i] ?? 0) + r.g[i] * mix;
    d[i] = (s.d[i] ?? 0) + r.d[i] * mix;
  }
  return { g, d };
}

// ─── Boucles sans couture ──────────────────────────────────────────────

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
 * Boucle sans couture pour une musique en mesures : ce qui dépasse la longueur
 * (queues de réverb, notes tenues) est replié sur le début.
 */
export function boucleRepliee(s: Son, longueur: number): Son {
  const L = Math.round(longueur * SR);
  const out = s.slice(0, L);
  for (let i = L; i < s.length; i++) out[i % L] += s[i];
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
