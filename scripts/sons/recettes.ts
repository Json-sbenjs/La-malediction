// Recettes des sons de La Malédiction : un son par entrée du catalogue (src/web/sons-catalogue.ts).
// Tout est synthétisé ici, sans aucun échantillon extérieur : pas de licence à gérer.
// Pour changer un son : modifier sa recette, puis `npm run sons` (voir docs/sons.md).
import type { IdSon } from '../../src/web/sons-catalogue.ts';
import {
  PARTIELS_CLOCHE,
  PARTIELS_METAL,
  PARTIELS_VERRE,
  SR,
  ajouter,
  ajouterStereo,
  attaque,
  boucleFondue,
  boucleRepliee,
  bruit,
  bruitRose,
  chorus,
  cloche,
  compresser,
  corde,
  echo,
  enveloppe,
  filtre,
  fondus,
  hasard,
  inverser,
  note,
  oscillateur,
  reverb,
  reverbStereo,
  reverbSurStereo,
  saturer,
  silence,
  silenceStereo,
  unisson,
  volume,
  type Son,
  type Stereo,
  type Valeur,
} from './dsp.ts';

export interface Recette {
  fabriquer: () => Son | Stereo;
  /**
   * Volume perçu visé en dB (voir generer.ts). Par défaut : selon le canal du son.
   * Les sons d'interface sont plus discrets que les réveils des rôles.
   */
  niveau?: number;
}

// ─── Briques communes ─────────────────────────────────────────────────

/** Partiels d'un glockenspiel / piano électrique : clochettes de l'interface. */
const PARTIELS_GLOCK: [number, number, number][] = [
  [1, 1, 0.8],
  [2, 0.35, 0.4],
  [3, 0.15, 0.2],
  [4.2, 0.08, 0.1],
];

const glock = (freq: number, duree = 1.2): Son => cloche(duree, freq, PARTIELS_GLOCK);

/** Cloche d'église (glas, carillon). */
const clocheEglise = (freq: number, duree = 5): Son => cloche(duree, freq, PARTIELS_CLOCHE);

/** Corde pincée filtrée (harpe). */
function harpe(freq: number, duree = 1.5): Son {
  return attaque(filtre(corde(duree, freq, 0.997, Math.round(freq)), 'passe-bas', 3500));
}

/** Coup de tambour grave : sinus qui chute vite + attaque de bruit. */
function tambour(freqHaut: number, freqBas: number, duree = 0.6, graine = 5): Son {
  const corps = oscillateur('sinus', duree, (t) => freqBas + (freqHaut - freqBas) * Math.exp(-t / 0.04));
  enveloppe(corps, 0.002, duree / 4);
  const peau = filtre(bruit(duree, graine), 'passe-bas', 2000);
  enveloppe(peau, 0.001, 0.02);
  return ajouter(corps, peau, 0, 0.5);
}

/** Souffle filtré qui balaie (whoosh). */
function souffle(duree: number, de: number, a: number, graine = 9, q = 1.5): Son {
  const s = filtre(bruitRose(duree, graine), 'passe-bande', (t) => de + (a - de) * (t / duree), q);
  return volume(s, (t) => Math.sin((Math.PI * t) / duree) ** 2);
}

/** Cuivre (cor, fanfare) : scies désaccordées, filtre qui s'ouvre à l'attaque. */
function cuivre(freq: number, duree: number, graine = 2): Son {
  const vib = (t: number) => freq * (1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t / 0.3));
  const s = unisson('scie', duree, vib, 3, 8, graine);
  filtre(s, 'passe-bas', (t) => 600 + 2200 * (1 - Math.exp(-t / 0.08)) * Math.exp(-t / 1.5), 1.2);
  return fondus(enveloppe(s, 0.04, 10, duree - 0.2), 0.001, 0.15);
}

/** Voyelles : formants [fréquence, largeur (q), volume]. */
const VOYELLE_A: [number, number, number][] = [[700, 6, 1], [1220, 8, 0.5], [2600, 10, 0.25]];
const VOYELLE_OU: [number, number, number][] = [[300, 5, 1], [870, 7, 0.4], [2240, 10, 0.15]];
const VOYELLE_EU: [number, number, number][] = [[500, 5, 1], [1000, 7, 0.5], [2400, 10, 0.2]];

/** Fait « chanter » une source (scie, bruit) sur une voyelle. */
function formants(source: Son, voyelle: [number, number, number][]): Son {
  const s = silence(source.length / SR);
  for (const [f, q, g] of voyelle) ajouter(s, filtre(source.slice(), 'passe-bande', f, q), 0, g);
  return s;
}

/** Voix de chœur sur une voyelle, avec vibrato. */
function voix(freq: Valeur, duree: number, voyelle = VOYELLE_A, graine = 4): Son {
  const f = (t: number) => (typeof freq === 'number' ? freq : freq(t)) * (1 + 0.006 * Math.sin(2 * Math.PI * 5 * t + graine));
  return formants(unisson('scie', duree, f, 3, 10, graine), voyelle);
}

/** Accord de chœur (plusieurs voix). */
function choeur(notes: number[], duree: number, voyelle = VOYELLE_A, glisse = 0): Son {
  const s = silence(duree);
  notes.forEach((n, i) => {
    const f = note(n);
    ajouter(s, voix((t) => f * 2 ** ((glisse * t) / duree / 12), duree, voyelle, i + 1), 0, 1 / notes.length);
  });
  return enveloppe(s, 0.5, 10, duree - 1.2);
}

/** Pas de bois (clic, coup de bâton). */
function bois(freq: number, duree = 0.15, graine = 13): Son {
  const s = filtre(bruit(duree, graine), 'passe-bande', freq, 4);
  enveloppe(s, 0.0005, 0.012);
  const corps = enveloppe(oscillateur('sinus', duree, freq / 3), 0.0005, 0.02);
  return ajouter(s, corps, 0, 0.6);
}

/** Petites étincelles de verre au hasard entre `de` et `a` secondes. */
function etincelles(duree: number, nombre: number, de: number, a: number, graine: number): Son {
  const alea = hasard(graine);
  const s = silence(duree);
  for (let i = 0; i < nombre; i++) {
    const t = de + (a - de) * Math.sqrt(alea());
    const f = 2000 + alea() * 5000;
    ajouter(s, cloche(0.6, f, PARTIELS_VERRE.map(([r, v, tau]) => [r, v, tau * 0.15])), t, 0.3 + alea() * 0.5);
  }
  return s;
}

/** Grillons : groupes de 3 stridulations aiguës. */
function grillon(debut: number, s: Son, alea: () => number, gain: number): void {
  const f = 4300 + alea() * 600;
  for (let k = 0; k < 3; k++) {
    const chant = enveloppe(oscillateur('sinus', 0.03, f), 0.003, 0.008);
    ajouter(s, chant, debut + k * 0.035, gain);
  }
}

/** Gazouillis d'oiseau : 3 à 6 petits glissandos rapides. */
function oiseau(debut: number, s: Son, alea: () => number, gain: number): void {
  const base = 2500 + alea() * 1800;
  const n = 3 + Math.floor(alea() * 4);
  for (let k = 0; k < n; k++) {
    const monte = alea() < 0.6;
    const d = 0.05 + alea() * 0.05;
    const chant = oscillateur('sinus', d, (t) => base * (monte ? 1 + 0.5 * (t / d) : 1.5 - 0.5 * (t / d)));
    volume(chant, (t) => Math.sin((Math.PI * t) / d));
    ajouter(s, chant, debut + k * (d + 0.03 + alea() * 0.05), gain);
  }
}

/** Vent : bruit rose qui passe dans un filtre qui bouge lentement. */
function vent(duree: number, centre: number, ecart: number, graine: number, periode: number): Son {
  const s = filtre(bruitRose(duree, graine), 'passe-bande', (t) => centre + ecart * Math.sin((2 * Math.PI * t) / periode), 1.2);
  return volume(s, (t) => 0.6 + 0.4 * Math.sin((2 * Math.PI * t) / (periode * 0.7) + graine));
}

/** Petit mixage : additionne des [son, début, volume]. */
function mix(duree: number, ...couches: [Son, number, number][]): Son {
  const s = silence(duree);
  for (const [c, debut, g] of couches) ajouter(s, c, debut, g);
  return s;
}

// ─── Musique de fond (originale, style synthés années 80) ─────────────

/**
 * Composition originale en ré mineur, 100 BPM, 24 mesures (57,6 s) qui bouclent.
 * Grille : Rém – Si♭ – Solm – La, répétée.
 * 1-4 basse + nappe · 5-8 + arpège · 9-16 + batterie + cloches · 17-20 pause · 21-24 tout.
 */
function musiqueFond(): Stereo {
  const BPM = 100;
  const temps = 60 / BPM;
  const mesure = temps * 4;
  const NB = 24;
  const longueur = mesure * NB;
  const out = silenceStereo(longueur + 6);
  const reverbEnvoi = silenceStereo(longueur + 6);
  const alea = hasard(42);

  // Accords : fondamentale (MIDI) et notes de l'accord.
  const ACCORDS = [
    { basse: 38, notes: [62, 65, 69] }, // Rém
    { basse: 34, notes: [58, 62, 65] }, // Si♭
    { basse: 31, notes: [55, 58, 62] }, // Solm
    { basse: 33, notes: [57, 61, 64] }, // La
  ];
  const actif = (m: number, partie: 'basse' | 'nappe' | 'arpege' | 'batterie' | 'cloches') => {
    const section = m < 4 ? 0 : m < 8 ? 1 : m < 16 ? 2 : m < 20 ? 3 : 4;
    const table = {
      basse: [1, 1, 1, 0, 1],
      nappe: [1, 1, 1, 1, 1],
      arpege: [0, 1, 1, 1, 1],
      batterie: [0, 0, 1, 0, 1],
      cloches: [0, 0, 1, 1, 1],
    };
    return table[partie][section] === 1;
  };

  // Mélodie des cloches sur 4 mesures : [temps, note MIDI, durée en temps].
  const MELODIE: [number, number, number][] = [
    [0, 69, 2], [2, 74, 1], [3, 72, 1],
    [4, 65, 2], [6, 70, 1], [7, 69, 1],
    [8, 67, 2], [10, 74, 1], [11, 70, 1],
    [12, 69, 3], [15, 73, 1],
  ];
  const REPONSE: [number, number, number][] = [
    [0, 74, 1.5], [1.5, 72, 0.5], [2, 69, 2],
    [4, 70, 1.5], [5.5, 69, 0.5], [6, 65, 2],
    [8, 67, 1], [9, 70, 1], [10, 74, 2],
    [12, 76, 2], [14, 73, 1], [15, 69, 1],
  ];

  for (let m = 0; m < NB; m++) {
    const debut = m * mesure;
    const accord = ACCORDS[m % 4];

    // Basse pulsée en croches, filtre qui claque.
    if (actif(m, 'basse')) {
      const motif = [0, 0, 12, 0, 0, 12, 0, 10];
      motif.forEach((ecart, k) => {
        const d = temps / 2;
        const s = unisson('scie', d * 1.2, note(accord.basse + ecart), 2, 6, m * 8 + k);
        filtre(s, 'passe-bas', (t) => 180 + 1100 * Math.exp(-t / 0.05), 3);
        fondus(enveloppe(s, 0.003, 0.12), 0, 0.02);
        ajouterStereo(out, saturer(s, 1.6), debut + k * d, 0.55, 0);
      });
    }

    // Nappe : accord tenu sur la mesure, filtre qui respire (période = 1/4 de la boucle).
    if (actif(m, 'nappe')) {
      for (const n of accord.notes) {
        const s = unisson('scie', mesure + 1.2, note(n - 12), 5, 14, m * 3 + n);
        filtre(s, 'passe-bas', (t) => 700 + 400 * Math.sin((2 * Math.PI * (debut + t)) / (longueur / 4)), 0.9);
        enveloppe(s, 0.6, 0.5, mesure - 0.4);
        ajouterStereo(out, s, debut, 0.09, (n % 3) - 1);
        ajouterStereo(reverbEnvoi, s, debut, 0.06, 0);
      }
    }

    // Arpège en doubles croches, onde carrée, écho pointé.
    if (actif(m, 'arpege')) {
      const suite = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 2, 3, 1];
      suite.forEach((idx, k) => {
        const n = idx === 3 ? accord.notes[0] + 12 : accord.notes[idx];
        const d = temps / 4;
        const s = oscillateur('carre', d * 1.5, note(n));
        filtre(s, 'passe-bas', 1800 + 600 * Math.sin((2 * Math.PI * (debut + k * d)) / (longueur / 2)), 1.5);
        fondus(enveloppe(s, 0.002, 0.07), 0, 0.01);
        const pan = k % 2 === 0 ? -0.5 : 0.5;
        ajouterStereo(out, s, debut + k * d, 0.08, pan);
        ajouterStereo(reverbEnvoi, s, debut + k * d, 0.05, 0);
        // Écho à la croche pointée, de l'autre côté.
        ajouterStereo(out, s, debut + k * d + temps * 0.75, 0.035, -pan);
      });
    }

    // Batterie : grosse caisse, caisse claire à grosse réverb (années 80), charleston.
    if (actif(m, 'batterie')) {
      for (const b of [0, 2, 2.5]) ajouterStereo(out, tambour(150, 48, 0.5, m + b), debut + b * temps, 0.5, 0);
      for (const b of [1, 3]) {
        const claire = mix(
          0.4,
          [enveloppe(filtre(bruit(0.4, m * 4 + b), 'passe-bande', 1800, 0.8), 0.001, 0.07), 0, 1],
          [enveloppe(oscillateur('triangle', 0.4, 190), 0.001, 0.05), 0, 0.5],
        );
        ajouterStereo(out, claire, debut + b * temps, 0.22, 0);
        ajouterStereo(reverbEnvoi, claire, debut + b * temps, 0.4, 0);
      }
      for (let k = 0; k < 8; k++) {
        const ch = enveloppe(filtre(bruit(0.08, m * 16 + k), 'passe-haut', 7000), 0.001, k % 2 ? 0.015 : 0.03);
        ajouterStereo(out, ch, debut + (k * temps) / 2, 0.08 + alea() * 0.02, 0.3);
      }
    }

    // Cloches : mélodie, puis sa réponse.
    if (actif(m, 'cloches') && m % 4 === 0) {
      const phrase = m % 8 === 0 ? MELODIE : REPONSE;
      for (const [b, n, duree] of phrase) {
        const s = cloche(duree * temps + 1.5, note(n), [
          [1, 1, 1.4],
          [2, 0.3, 0.6],
          [3.01, 0.15, 0.3],
          [4.2, 0.06, 0.15],
        ]);
        ajouterStereo(out, s, debut + b * temps, 0.12, 0.2);
        ajouterStereo(reverbEnvoi, s, debut + b * temps, 0.12, 0);
        ajouterStereo(out, s, debut + b * temps + temps * 1.5, 0.035, -0.6);
      }
    }
  }

  const reverbe = reverbSurStereo(reverbEnvoi, 1, 0.88, 0.4, 4);
  const g = silence(longueur + 10);
  const d = silence(longueur + 10);
  ajouter(g, out.g);
  ajouter(d, out.d);
  ajouter(g, reverbe.g, 0, 0.8);
  ajouter(d, reverbe.d, 0, 0.8);
  return { g: boucleRepliee(g, longueur), d: boucleRepliee(d, longueur) };
}

// ─── Ambiances (boucles de 40 s) ───────────────────────────────────────

const LONGUEUR_AMBIANCE = 40;
const FONDU_AMBIANCE = 6;

/** Nuit : drone d'horreur (méthode Vital de la vidéo C, refaite en code) + vent + grillons. */
function ambianceNuit(): Stereo {
  const duree = LONGUEUR_AMBIANCE + FONDU_AMBIANCE;
  // 1. Deux sinus en seconde mineure (la / si♭), le 2e en 3 voix désaccordées, pitch qui ondule.
  const drone = oscillateur('sinus', duree, note(45));
  ajouter(drone, unisson('sinus', duree, (t) => note(46) * (1 + 0.003 * Math.sin((2 * Math.PI * t) / 23)), 3, 9, 21), 0, 0.9);
  ajouter(drone, oscillateur('sinus', duree, note(57)), 0, 0.3);
  // 2. Chorus à fort retour : la couleur métallique.
  chorus(drone, 9, 3, 0.13, 0.85, 1);
  compresser(drone, -20, 4);
  // 3. Distorsion après un filtre qui pousse le haut-médium.
  filtre(drone, 'cloche', 600, 1.5, 9);
  saturer(drone, 4);
  // 4. Filtre résonant qui bouge très lentement (LFO).
  filtre(drone, 'passe-bas', (t) => 650 + 450 * Math.sin((2 * Math.PI * t) / 17), 4);
  filtre(drone, 'passe-haut', 45);
  // 5. Réverb lavée, aigus coupés.
  const r = reverbStereo(drone, 0.9, 0.6, 1);
  const g = filtre(r.g.slice(0, drone.length), 'passe-bas', 2500);
  const d = filtre(r.d.slice(0, drone.length), 'passe-bas', 2500);
  const s: Stereo = { g: silence(duree), d: silence(duree) };
  ajouter(s.g, g, 0, 0.6);
  ajouter(s.d, d, 0, 0.6);
  ajouterStereo(s, drone, 0, 0.12, 0);

  // Vent, un peu différent à gauche et à droite.
  ajouter(s.g, vent(duree, 380, 220, 31, 13), 0, 0.5);
  ajouter(s.d, vent(duree, 420, 250, 37, 11), 0, 0.5);

  // Grillons lointains.
  const alea = hasard(5);
  const grillonsG = silence(duree);
  const grillonsD = silence(duree);
  for (let t = 0.5; t < duree - 1; t += 0.5 + alea() * 1.4) {
    grillon(t, alea() < 0.5 ? grillonsG : grillonsD, alea, 0.04 + alea() * 0.04);
  }
  ajouter(s.g, filtre(grillonsG, 'passe-haut', 3000));
  ajouter(s.d, filtre(grillonsD, 'passe-haut', 3000));

  return { g: boucleFondue(s.g, LONGUEUR_AMBIANCE, FONDU_AMBIANCE), d: boucleFondue(s.d, LONGUEUR_AMBIANCE, FONDU_AMBIANCE) };
}

/** Jour : vent léger dans les feuilles et oiseaux au loin. */
function ambianceJour(): Stereo {
  const duree = LONGUEUR_AMBIANCE + FONDU_AMBIANCE;
  const s = silenceStereo(duree);
  ajouter(s.g, vent(duree, 900, 400, 41, 9), 0, 0.35);
  ajouter(s.d, vent(duree, 1000, 450, 43, 10), 0, 0.35);
  // Feuillage : bruit aigu qui frémit.
  const feuilles = filtre(bruit(duree, 47), 'passe-haut', 5000);
  volume(feuilles, (t) => 0.05 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.21 * t) * Math.sin(2 * Math.PI * 0.07 * t)));
  ajouterStereo(s, feuilles, 0, 1, 0);

  const alea = hasard(8);
  const oiseaux = silence(duree);
  for (let t = 0.8; t < duree - 2; t += 1.8 + alea() * 3.5) oiseau(t, oiseaux, alea, 0.15 + alea() * 0.15);
  const r = reverb(oiseaux, 0.5, 0.8, 0.5, 1).slice(0, oiseaux.length);
  ajouterStereo(s, r, 0, 0.9, -0.4);
  const oiseaux2 = silence(duree);
  for (let t = 2.3; t < duree - 2; t += 2.5 + alea() * 4) oiseau(t, oiseaux2, alea, 0.1 + alea() * 0.1);
  ajouterStereo(s, reverb(oiseaux2, 0.6, 0.8, 0.5, 1).slice(0, oiseaux2.length), 0, 0.7, 0.6);

  return { g: boucleFondue(s.g, LONGUEUR_AMBIANCE, FONDU_AMBIANCE), d: boucleFondue(s.d, LONGUEUR_AMBIANCE, FONDU_AMBIANCE) };
}

// ─── Les recettes ──────────────────────────────────────────────────────

export const RECETTES: Record<IdSon, Recette> = {
  musique_fond: { fabriquer: musiqueFond },
  amb_nuit: { fabriquer: ambianceNuit },
  amb_jour: { fabriquer: ambianceJour },

  // ── Interface : courts et discrets ──
  ui_clic: {
    niveau: -27,
    fabriquer: () => mix(0.1, [bois(2400, 0.1), 0, 1]),
  },
  ui_selection: {
    niveau: -26,
    fabriquer: () => {
      const s = oscillateur('triangle', 0.25, (t) => 620 + 300 * Math.min(1, t / 0.06));
      return enveloppe(s, 0.003, 0.06);
    },
  },
  ui_deselection: {
    niveau: -27,
    fabriquer: () => {
      const s = oscillateur('triangle', 0.25, (t) => 920 - 300 * Math.min(1, t / 0.06));
      return enveloppe(s, 0.003, 0.05);
    },
  },
  ui_valider: {
    niveau: -24,
    fabriquer: () => reverb(mix(0.8, [glock(note(76), 0.8), 0, 0.8], [glock(note(81), 0.8), 0.08, 1]), 0.2, 0.7, 0.4, 0.6),
  },
  ui_erreur: {
    niveau: -23,
    fabriquer: () => {
      const a = enveloppe(filtre(oscillateur('carre', 0.2, note(57)), 'passe-bas', 900), 0.003, 0.08, 0.06);
      const b = enveloppe(filtre(oscillateur('carre', 0.3, note(53)), 'passe-bas', 700), 0.003, 0.1, 0.08);
      return mix(0.5, [a, 0, 1], [b, 0.13, 1]);
    },
  },
  ui_annuler: {
    niveau: -25,
    fabriquer: () => {
      const rebobine = inverser(enveloppe(filtre(bruitRose(0.45, 3), 'passe-bande', (t) => 3000 - 4000 * t, 2), 0.002, 0.12));
      return mix(0.55, [rebobine, 0, 0.8], [inverser(glock(note(76), 0.45)), 0.02, 0.4]);
    },
  },
  ui_succes: {
    niveau: -23,
    fabriquer: () =>
      reverb(
        mix(1.2, ...[74, 78, 81, 86].map((n, i): [Son, number, number] => [glock(note(n), 1), i * 0.07, 0.7 + i * 0.1])),
        0.25,
        0.75,
        0.4,
        0.8,
      ),
  },
  ui_tirage: {
    niveau: -25,
    fabriquer: () => {
      const s = silence(0.7);
      const alea = hasard(17);
      let t = 0;
      for (let k = 0; k < 16; k++) {
        const flic = enveloppe(filtre(bruit(0.04, 100 + k), 'passe-bande', 2500 + alea() * 2500, 2), 0.0005, 0.006);
        ajouter(s, flic, t, 0.6 + alea() * 0.4);
        t += 0.035 - k * 0.0012;
      }
      return ajouter(s, bois(900, 0.12, 3), t + 0.06, 1);
    },
  },
  ui_glisser: {
    niveau: -29,
    fabriquer: () => souffle(0.3, 700, 1600, 19, 2),
  },
  ui_voix: {
    niveau: -24,
    fabriquer: () => {
      const plume = enveloppe(filtre(bruit(0.12, 23), 'passe-bande', 5000, 2), 0.01, 0.03);
      return mix(0.4, [plume, 0, 0.5], [tambour(240, 110, 0.3, 29), 0.06, 1]);
    },
  },

  // ── Transitions ──
  tr_debut_partie: {
    fabriquer: () => {
      const monte = inverser(reverb(enveloppe(filtre(bruitRose(0.3, 51), 'passe-bas', 3000), 0.001, 0.08), 1, 0.9, 0.3, 1.2));
      const gong = cloche(6, 82, [
        [1, 1, 4], [1.52, 0.7, 3], [2.03, 0.6, 2.5], [2.61, 0.4, 2], [3.4, 0.3, 1.4], [4.27, 0.2, 1],
      ]);
      volume(gong, (t) => 1 + 0.15 * Math.sin(2 * Math.PI * 3 * t) * Math.exp(-t));
      const boom = tambour(90, 38, 2.5, 53);
      return reverb(mix(7, [monte, 0, 0.5], [gong, monte.length / SR, 1], [boom, monte.length / SR, 0.9]), 0.35, 0.9, 0.4, 2);
    },
  },
  tr_nuit_tombe: {
    fabriquer: () => {
      const duree = 4;
      const nappe = silence(duree);
      for (const n of [50, 53, 57]) {
        ajouter(nappe, unisson('scie', duree, (t) => note(n) * 2 ** (-t / duree / 12), 4, 12, n), 0, 0.3);
      }
      filtre(nappe, 'passe-bas', (t) => 2200 * Math.exp(-t / 1.2) + 250, 1.2);
      enveloppe(nappe, 0.4, 1.2, 1.5);
      const hou = (): Son => {
        const h = oscillateur('sinus', 0.45, (t) => 390 - 50 * (t / 0.45));
        ajouter(h, filtre(bruitRose(0.45, 61), 'passe-bande', 400, 3), 0, 0.3);
        return volume(h, (t) => Math.sin((Math.PI * t) / 0.45) ** 1.5);
      };
      const hibou = mix(1.4, [hou(), 0, 0.8], [hou(), 0.55, 1]);
      return reverb(
        mix(6, [nappe, 0, 1], [clocheEglise(note(38), 5), 0.3, 0.9], [filtre(hibou, 'passe-bas', 1500), 2.2, 0.5]),
        0.4,
        0.9,
        0.4,
        2,
      );
    },
  },
  tr_jour_se_leve: {
    fabriquer: () => {
      const duree = 3.5;
      const nappe = silence(duree);
      for (const n of [50, 54, 57, 62]) ajouter(nappe, unisson('scie', duree, note(n), 4, 10, n), 0, 0.25);
      filtre(nappe, 'passe-bas', (t) => 300 + 2600 * (t / duree) ** 1.5, 1);
      enveloppe(nappe, 1.5, 0.6, 1.2);
      const carillon = mix(
        3.5,
        ...[74, 78, 81, 86].map((n, i): [Son, number, number] => [clocheEglise(note(n), 3), i * 0.28, 0.5]),
      );
      return reverb(mix(5.5, [nappe, 0, 0.8], [carillon, 1.2, 0.8]), 0.35, 0.88, 0.4, 2);
    },
  },

  // ── Événements ──
  sfx_glas: {
    fabriquer: () =>
      reverb(mix(8, [clocheEglise(110, 5), 0, 1], [clocheEglise(110, 5), 1.8, 0.9], [clocheEglise(110, 5), 3.6, 0.95]), 0.35, 0.9, 0.4, 2),
  },
  sfx_nuit_calme: {
    niveau: -21,
    fabriquer: () => {
      const s = silence(3.5);
      for (const n of [62, 66, 69, 74]) {
        ajouter(s, enveloppe(oscillateur('sinus', 3.5, note(n)), 0.6, 0.8, 1.2), 0, 0.25);
      }
      return reverb(mix(4, [s, 0, 1], [glock(note(86), 2), 0.5, 0.25]), 0.4, 0.85, 0.4, 1.5);
    },
  },
  sfx_mort: {
    fabriquer: () => {
      const vent = souffle(2.5, 1200, 250, 71, 1.2);
      return reverb(mix(5, [clocheEglise(98, 5), 0, 1], [vent, 0.3, 0.5]), 0.35, 0.9, 0.4, 2);
    },
  },
  sfx_verdict: {
    fabriquer: () =>
      reverb(
        mix(2.2, [tambour(130, 60, 0.8, 81), 0, 0.7], [tambour(130, 60, 0.8, 82), 0.38, 0.8], [tambour(120, 50, 1.2, 83), 0.76, 1]),
        0.3,
        0.85,
        0.4,
        1.5,
      ),
  },
  sfx_aucun_elimine: {
    niveau: -22,
    fabriquer: () => {
      const descend = enveloppe(oscillateur('triangle', 1, (t) => 330 - 150 * t), 0.01, 0.3);
      return reverb(mix(1.2, [tambour(100, 50, 0.6, 91), 0, 0.8], [filtre(descend, 'passe-bas', 1200), 0.05, 0.6]), 0.3, 0.8, 0.4, 1);
    },
  },
  sfx_couronne: {
    fabriquer: () => {
      const t = 0.16;
      const fanfare = mix(
        3,
        [cuivre(note(62), t * 0.9), 0, 0.7],
        [cuivre(note(62), t * 0.9), t, 0.7],
        [cuivre(note(69), t * 0.9), t * 2, 0.8],
        [cuivre(note(62), 1.6), t * 3, 0.5],
        [cuivre(note(66), 1.6), t * 3, 0.5],
        [cuivre(note(74), 1.6), t * 3, 0.6],
      );
      return reverb(mix(3.5, [fanfare, 0, 1], [glock(note(86), 1.5), t * 3, 0.3]), 0.3, 0.85, 0.4, 1.5);
    },
  },
  sfx_revelation: {
    fabriquer: () => {
      const monte = inverser(reverb(enveloppe(filtre(bruitRose(0.2, 101), 'passe-haut', 3000), 0.001, 0.05), 1, 0.85, 0.3, 0.8));
      const verre = cloche(2.5, note(88), PARTIELS_VERRE);
      return reverb(mix(3, [monte, 0, 0.4], [etincelles(3, 20, 0.2, 1.2, 103), 0, 0.6], [verre, 0.85, 0.7]), 0.35, 0.85, 0.4, 1.5);
    },
  },
  sfx_murmure: {
    niveau: -23,
    fabriquer: () => {
      const alea = hasard(107);
      const syllabes = Array.from({ length: 9 }, () => alea());
      const souffleVoix = formants(bruit(1.6, 109), VOYELLE_EU);
      volume(souffleVoix, (t) => {
        const k = Math.floor(t * 6);
        return (syllabes[k % 9] ?? 0) * Math.sin(Math.PI * ((t * 6) % 1)) * Math.min(1, (1.6 - t) * 3);
      });
      return reverb(filtre(souffleVoix, 'passe-haut', 800), 0.4, 0.8, 0.4, 1);
    },
  },

  // ── Fin de partie ──
  fin_pelerins: {
    fabriquer: () => {
      const accords = [[62, 66, 69], [67, 71, 74], [69, 73, 76], [62, 66, 69, 74]];
      const s = silence(6);
      accords.forEach((acc, i) => {
        const d = i === 3 ? 2.6 : 0.55;
        for (const n of acc) ajouter(s, cuivre(note(n), d, n + i), i * 0.6, 0.35);
      });
      ajouter(s, clocheEglise(note(74), 4), 1.8, 0.5);
      ajouter(s, clocheEglise(note(86), 3), 1.95, 0.3);
      return reverb(s, 0.35, 0.88, 0.4, 2);
    },
  },
  fin_spectres: {
    fabriquer: () => {
      const grave = silence(5);
      for (const n of [26, 27, 33]) ajouter(grave, unisson('scie', 5, note(n), 4, 18, n), 0, 0.4);
      filtre(grave, 'passe-bas', (t) => 200 + 1200 * Math.exp(-t / 1.5), 3);
      saturer(grave, 3);
      enveloppe(grave, 0.05, 1.5, 1.5);
      const plainte = voix((t) => 300 + 250 * Math.sin(Math.min(1, t / 2.5) * Math.PI * 0.6), 3, VOYELLE_OU, 9);
      volume(plainte, (t) => Math.sin((Math.PI * t) / 3));
      chorus(plainte, 10, 4, 0.5, 0.6, 0.5);
      return reverb(mix(6, [grave, 0, 1], [plainte, 0.8, 0.6], [tambour(80, 30, 2, 111), 0, 1]), 0.45, 0.9, 0.4, 2);
    },
  },
  fin_solitaire: {
    fabriquer: () => {
      const melodie = [86, 89, 93, 91, 89, 88, 86, 85, 86];
      const s = silence(5);
      melodie.forEach((n, i) => {
        // Boîte à musique un peu fausse : chaque note légèrement désaccordée.
        const fausse = note(n) * (1 + (i % 2 ? 0.006 : -0.004));
        ajouter(s, cloche(2, fausse, [[1, 1, 1.2], [3.9, 0.2, 0.2], [9.2, 0.05, 0.05]]), i * 0.32 * (1 + i * 0.04), 0.5);
      });
      return reverb(s, 0.35, 0.85, 0.4, 2);
    },
  },
  fin_personne: {
    fabriquer: () => {
      const v = vent(6, 350, 200, 121, 4);
      fondus(v, 1, 2);
      return reverb(mix(7, [v, 0, 0.7], [clocheEglise(87, 6), 1, 1]), 0.4, 0.9, 0.4, 2);
    },
  },

  // ── Rôles : un son de réveil chacun ──
  role_spectre: {
    fabriquer: () => {
      const plainte = voix((t) => 480 + 220 * Math.sin(Math.PI * Math.min(1, t / 2.4)) - 120 * Math.max(0, t - 1.6), 2.6, VOYELLE_OU, 3);
      volume(plainte, (t) => Math.sin((Math.PI * t) / 2.6) ** 1.5);
      chorus(plainte, 11, 5, 0.4, 0.6, 0.5);
      const glace = filtre(bruitRose(2.6, 131), 'passe-haut', 2500);
      volume(glace, (t) => 0.3 * Math.sin((Math.PI * t) / 2.6));
      return reverb(mix(3, [plainte, 0, 1], [glace, 0, 0.6]), 0.5, 0.9, 0.4, 2);
    },
  },
  role_originel: {
    fabriquer: () => {
      const plainte = voix((t) => 280 + 140 * Math.sin(Math.PI * Math.min(1, t / 2.4)), 2.6, VOYELLE_OU, 5);
      volume(plainte, (t) => Math.sin((Math.PI * t) / 2.6) ** 1.5);
      chorus(plainte, 13, 5, 0.3, 0.7, 0.5);
      const grogne = oscillateur('scie', 1.8, (t) => 58 + 6 * Math.sin(2 * Math.PI * 7 * t));
      volume(grogne, (t) => (0.6 + 0.4 * Math.sin(2 * Math.PI * 23 * t)) * Math.sin((Math.PI * t) / 1.8));
      saturer(filtre(grogne, 'passe-bas', 450, 2), 3);
      return reverb(mix(3.2, [grogne, 0, 0.8], [plainte, 0.4, 0.9]), 0.45, 0.9, 0.4, 2);
    },
  },
  role_maudit: {
    fabriquer: () => {
      const grogne = formants(oscillateur('scie', 1, (t) => 70 + 10 * Math.sin(2 * Math.PI * 9 * t)), VOYELLE_EU);
      volume(grogne, (t) => (0.6 + 0.4 * Math.sin(2 * Math.PI * 27 * t)) * Math.sin((Math.PI * t) / 1));
      saturer(grogne, 4);
      const hurle = voix((t) => (t < 0.5 ? 300 + 300 * (t / 0.5) : 600 - 120 * ((t - 0.5) / 1.8)), 2.3, VOYELLE_OU, 7);
      volume(hurle, (t) => Math.min(1, t / 0.2) * Math.min(1, (2.3 - t) / 0.8));
      saturer(hurle, 1.5);
      return reverb(mix(3.6, [grogne, 0, 1], [hurle, 0.9, 0.8]), 0.45, 0.9, 0.4, 2);
    },
  },
  role_pelerin: {
    fabriquer: () => {
      const pas = (g: number) => enveloppe(filtre(bruit(0.15, g), 'passe-bas', 1500), 0.005, 0.03);
      return reverb(
        mix(2.6, [bois(600, 0.2, 141), 0, 1], [pas(143), 0.22, 0.4], [bois(600, 0.2, 145), 0.5, 0.9], [pas(147), 0.72, 0.4], [glock(1320, 1.8), 1, 0.4]),
        0.3,
        0.8,
        0.4,
        1.2,
      );
    },
  },
  role_devoue: {
    fabriquer: () =>
      reverb(mix(2.5, ...[62, 66, 69, 74, 78].map((n, i): [Son, number, number] => [harpe(note(n), 1.8), i * 0.13, 0.6])), 0.35, 0.85, 0.4, 1.5),
  },
  role_oracle: {
    fabriquer: () => {
      const verre = mix(3, [cloche(3, 1320, PARTIELS_VERRE), 0, 0.7], [cloche(3, 1323.5, PARTIELS_VERRE), 0, 0.7]);
      const frotte = oscillateur('sinus', 3, 1320);
      volume(frotte, (t) => 0.4 * Math.min(1, t / 1.2) * (0.8 + 0.2 * Math.sin(2 * Math.PI * 4 * t)) * Math.min(1, (3 - t) / 0.6));
      return reverb(mix(3, [verre, 0, 1], [frotte, 0, 0.6]), 0.4, 0.88, 0.4, 1.5);
    },
  },
  role_protecteur: {
    fabriquer: () => {
      const choc = cloche(2.2, 330, PARTIELS_METAL);
      const corps = tambour(140, 80, 0.5, 151);
      return reverb(mix(2.5, [choc, 0, 1], [corps, 0, 0.8]), 0.3, 0.85, 0.4, 1.5);
    },
  },
  role_courtisane: {
    fabriquer: () => {
      const gamme = [62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81];
      return reverb(
        mix(
          2.6,
          ...gamme.map((n, i): [Son, number, number] => [harpe(note(n), 1.4), i * 0.04, 0.35]),
          [cloche(1.8, 2640, PARTIELS_GLOCK), 0.6, 0.4],
        ),
        0.4,
        0.85,
        0.4,
        1.5,
      );
    },
  },
  role_instinct: {
    fabriquer: () => {
      const coup = (f: number, g: number) => filtre(tambour(f * 1.6, f, 0.3, g), 'passe-bas', 300);
      return mix(2.2, [coup(55, 161), 0, 1], [coup(62, 162), 0.2, 0.7], [coup(55, 163), 0.95, 1], [coup(62, 164), 1.15, 0.7]);
    },
  },
  role_sainte: {
    fabriquer: () => reverb(choeur([62, 66, 69, 74], 3.4, VOYELLE_A), 0.5, 0.9, 0.4, 2),
  },
  role_vipere: {
    fabriquer: () => {
      const siffle = filtre(filtre(bruit(1.6, 171), 'passe-haut', 4000), 'passe-bande', 6500, 1.2);
      volume(siffle, (t) => Math.min(1, t / 0.25) * Math.min(1, (1.6 - t) / 0.4) * (0.8 + 0.2 * Math.sin(2 * Math.PI * 11 * t)));
      const crecelle = filtre(bruit(0.8, 173), 'passe-bande', 3500, 1.5);
      volume(crecelle, (t) => (Math.sin(2 * Math.PI * 28 * t) > 0.3 ? 1 : 0.05) * Math.min(1, (0.8 - t) / 0.3));
      return reverb(mix(2.6, [crecelle, 0, 0.6], [siffle, 0.6, 1]), 0.25, 0.8, 0.4, 1);
    },
  },
  'role_main-noire': {
    fabriquer: () => {
      const accord = silence(3);
      for (const n of [38, 39, 45]) {
        ajouter(accord, cloche(3, note(n), [[1, 1, 1.4], [2, 0.5, 0.7], [3, 0.3, 0.4], [4, 0.15, 0.25]]), 0, 0.5);
      }
      saturer(accord, 1.5);
      return reverb(mix(3.2, [accord, 0, 1], [souffle(1.8, 900, 180, 181, 1.2), 0.15, 0.6]), 0.45, 0.9, 0.5, 2);
    },
  },
  role_anatheme: {
    fabriquer: () => {
      const envers = inverser(reverb(clocheEglise(note(57), 2), 0.6, 0.85, 0.3, 0.5));
      return mix(envers.length / SR + 1, [envers, 0, 1], [tambour(90, 45, 1, 191), envers.length / SR, 0.7]);
    },
  },
  role_adepte: {
    fabriquer: () => {
      const bol = (f: number) => cloche(3.6, f, [[1, 1, 6], [2.71, 0.4, 4], [5.15, 0.2, 2], [8.4, 0.08, 1]]);
      const s = mix(3.6, [bol(220), 0, 0.6], [bol(221.8), 0, 0.6]);
      volume(s, (t) => Math.min(1, t / 0.35));
      return reverb(s, 0.3, 0.85, 0.4, 1.5);
    },
  },
  role_usurpateur: {
    fabriquer: () => {
      const lame = filtre(bruit(0.6, 201), 'passe-bande', (t) => 2000 + 6000 * (t / 0.6), 8);
      volume(lame, (t) => Math.min(1, t / 0.1) * Math.min(1, (0.6 - t) / 0.05));
      const tinte = cloche(1.5, 1850, PARTIELS_METAL.map(([r, v, tau]) => [r, v, tau * 1.5]));
      return reverb(mix(2.2, [lame, 0, 0.8], [tinte, 0.55, 0.6]), 0.3, 0.85, 0.4, 1.2);
    },
  },
  role_alpha: {
    fabriquer: () => reverb(mix(2.6, [cuivre(note(57), 0.45, 211), 0, 1], [cuivre(note(62), 1.4, 213), 0.5, 1]), 0.4, 0.9, 0.4, 1.5),
  },
  role_trinite: {
    fabriquer: () =>
      reverb(mix(3.2, [clocheEglise(note(62), 3), 0, 0.6], [clocheEglise(note(65), 3), 0.35, 0.6], [clocheEglise(note(69), 3), 0.7, 0.6]), 0.4, 0.88, 0.4, 1.5),
  },
  role_doubles: {
    fabriquer: () =>
      reverb(
        mix(2.2, [harpe(note(69)), 0, 0.8], [harpe(note(69)), 0.28, 0.8], [harpe(note(76)), 0.85, 0.6], [harpe(note(76)), 1.13, 0.6]),
        0.3,
        0.85,
        0.4,
        1.2,
      ),
  },
  role_augure: {
    fabriquer: () => {
      const croa = (g: number) => {
        const s = oscillateur('scie', 0.28, (t) => 520 - 120 * (t / 0.28) + 25 * Math.sin(2 * Math.PI * 70 * t));
        ajouter(s, bruit(0.28, g), 0, 0.35);
        const f = formants(s, [[1000, 4, 1], [1800, 6, 0.6], [3000, 8, 0.2]]);
        return volume(f, (t) => Math.min(1, t / 0.02) * Math.exp(-t / 0.15));
      };
      return reverb(mix(2, [croa(221), 0, 1], [croa(222), 0.42, 0.85], [croa(223), 0.84, 0.7]), 0.4, 0.9, 0.4, 1.5);
    },
  },
  role_inquisiteur: {
    fabriquer: () => {
      const trait = (g: number) => {
        const s = filtre(bruit(0.18, g), 'passe-bande', 5200, 3);
        return volume(s, (t) => Math.sin((Math.PI * t) / 0.18) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 60 * t)));
      };
      const cachet = mix(0.6, [tambour(160, 90, 0.5, 231), 0, 1], [bois(700, 0.2, 233), 0, 0.5]);
      return reverb(mix(1.9, [trait(234), 0, 0.5], [trait(235), 0.22, 0.5], [trait(236), 0.44, 0.5], [cachet, 0.85, 1]), 0.25, 0.8, 0.4, 1);
    },
  },
  role_medium: {
    fabriquer: () => {
      const notes = [74, 69, 77, 76];
      const f = (t: number) => {
        const x = Math.min(notes.length - 1, t / 0.8);
        const k = Math.floor(x);
        const glisse = Math.min(1, (x - k) * 4);
        const a = note(notes[k]);
        const b = note(notes[Math.min(notes.length - 1, k + 1)]);
        const base = x >= notes.length - 1 ? a : a + (b - a) * Math.max(0, glisse - 0.75) * 4;
        return base * (1 + 0.02 * Math.sin(2 * Math.PI * 6 * t));
      };
      const theremine = oscillateur('sinus', 3.4, f);
      ajouter(theremine, oscillateur('sinus', 3.4, (t) => f(t) * 2), 0, 0.15);
      volume(theremine, (t) => Math.min(1, t / 0.3) * Math.min(1, (3.4 - t) / 0.6));
      chorus(theremine, 15, 6, 0.3, 0.4, 0.4);
      return reverb(theremine, 0.5, 0.9, 0.4, 2);
    },
  },
  role_enchanteur: {
    fabriquer: () => {
      const berceuse = mix(
        3,
        ...[81, 77, 74].map((n, i): [Son, number, number] => [enveloppe(oscillateur('sinus', 1.2, note(n)), 0.05, 0.4), 0.9 + i * 0.45, 0.4]),
      );
      return reverb(mix(3.2, [etincelles(3, 30, 0, 1.6, 241), 0, 0.7], [berceuse, 0, 1]), 0.45, 0.88, 0.4, 1.5);
    },
  },
  role_sacrifie: {
    fabriquer: () => reverb(mix(3.8, [clocheEglise(note(38), 4), 0, 0.9], [choeur([62, 65, 69], 3, VOYELLE_A, -4), 0.4, 0.6]), 0.45, 0.9, 0.4, 2),
  },
  role_bourreau: {
    fabriquer: () => {
      const elan = souffle(0.3, 400, 2400, 251, 1.5);
      const impact = mix(
        1.2,
        [tambour(110, 55, 1, 253), 0, 1],
        [enveloppe(filtre(bruit(0.3, 255), 'passe-bande', 1500, 1.5), 0.001, 0.04), 0, 0.8],
        [bois(800, 0.25, 257), 0.005, 0.7],
      );
      return reverb(mix(2.2, [elan, 0, 0.6], [impact, 0.28, 1]), 0.3, 0.85, 0.4, 1.2);
    },
  },
  role_sectaire: {
    fabriquer: () => {
      const psalmodie = (t: number) => (t < 1.2 ? note(50) : t < 2 ? note(48) : note(50));
      const s = mix(3.4, [voix(psalmodie, 3.4, VOYELLE_OU, 11), 0, 0.7], [voix((t) => psalmodie(t) / 2, 3.4, VOYELLE_OU, 13), 0, 0.5]);
      fondus(s, 0.3, 0.6);
      return reverb(s, 0.55, 0.9, 0.4, 2);
    },
  },
  role_envouteur: {
    fabriquer: () => {
      const melodie = [74, 75, 78, 79, 78, 75, 74];
      const s = silence(3.2);
      melodie.forEach((n, i) => {
        const d = i === melodie.length - 1 ? 1 : 0.32;
        const fl = oscillateur('sinus', d + 0.1, (t) => note(n) * (1 + 0.012 * Math.sin(2 * Math.PI * 6 * t) * Math.min(1, t / 0.15)));
        ajouter(fl, filtre(bruit(d + 0.1, 260 + i), 'passe-bande', note(n) * 2, 6), 0, 0.15);
        ajouter(s, enveloppe(fl, 0.03, 10, d - 0.05), i * 0.32, 0.5);
      });
      return reverb(fondus(s, 0, 0.3), 0.4, 0.85, 0.4, 1.5);
    },
  },
  role_necromancien: {
    fabriquer: () => {
      const grondement = filtre(bruitRose(3, 271), 'passe-bas', 130, 1.2);
      ajouter(grondement, oscillateur('sinus', 3, 41), 0, 0.3);
      volume(grondement, (t) => Math.sin((Math.PI * t) / 3));
      const os = silence(3);
      const alea = hasard(273);
      for (let k = 0; k < 22; k++) ajouter(os, bois(1200 + alea() * 1400, 0.08, 280 + k), 0.6 + alea() * 1.2, 0.3 + alea() * 0.4);
      return reverb(mix(3.2, [grondement, 0, 1], [os, 0, 0.7]), 0.4, 0.9, 0.4, 1.5);
    },
  },
  role_revenant: {
    fabriquer: () => {
      const rale = formants(
        unisson('scie', 2.4, (t) => 95 - 25 * (t / 2.4) + 4 * Math.sin(2 * Math.PI * 5 * t), 2, 20, 291),
        VOYELLE_EU,
      );
      volume(rale, (t) => Math.sin((Math.PI * t) / 2.4) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 1.6 * t)));
      saturer(rale, 2.5);
      return reverb(echo(rale, 0.18, 0.2, 0.2), 0.4, 0.88, 0.4, 1.5);
    },
  },
};
