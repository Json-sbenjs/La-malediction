// Générateur de salle sur mesure : composition conseillée, disposition des sièges, tirage des rôles.
import { MAX_JOUEURS, MIN_JOUEURS, validerPlan, type Plan, type Siege } from './plans';
import { ROLES } from './roles';
import type { RoleId } from './types';

export type Composition = Partial<Record<RoleId, number>>;

/** Forme de la salle : tour de table, table rectangulaire, tables en U. */
export type Forme = 'ovale' | 'rectangle' | 'u';

export const FORMES: { id: Forme; nom: string }[] = [
  { id: 'ovale', nom: 'Tour de table' },
  { id: 'rectangle', nom: 'Table rectangulaire' },
  { id: 'u', nom: 'Tables en U' },
];

/** Rôles spéciaux ajoutés dans cet ordre quand il y a de la place (la Trinité prend 3 places). */
const PRIORITE: RoleId[] = [
  'oracle', 'protecteur', 'sainte', 'courtisane', 'instinct', 'vipere',
  'main-noire', 'anatheme', 'adepte', 'usurpateur', 'trinite', 'alpha',
];

/** Nombre total de cartes disponibles : le plus grand plan possible avec les rôles codés. */
export function maxJoueursPossible(): number {
  return Math.min(
    MAX_JOUEURS,
    Object.values(ROLES).reduce((total, r) => total + r.cartes, 0),
  );
}

export function totalComposition(compo: Composition): number {
  return Object.values(compo).reduce((total, n) => total + (n ?? 0), 0);
}

/**
 * Composition conseillée pour un nombre de joueurs.
 * Environ 1 Spectre pour 4,5 joueurs (entre 2 et 4), un tiers de Pèlerins,
 * le reste en rôles spéciaux par ordre de priorité. Le MJ peut ensuite la modifier.
 */
export function compositionConseillee(nbJoueurs: number): Composition {
  if (nbJoueurs < MIN_JOUEURS || nbJoueurs > maxJoueursPossible()) {
    throw new Error(`Entre ${MIN_JOUEURS} et ${maxJoueursPossible()} joueurs avec les rôles disponibles`);
  }
  const spectres = Math.min(ROLES.spectre.cartes, Math.max(2, Math.round(nbJoueurs / 4.5)));
  const reste = nbJoueurs - spectres;
  const visee = Math.min(ROLES.pelerin.cartes, Math.ceil(reste * 0.35));

  // On part du nombre de Pèlerins visé ; si les rôles spéciaux ne tombent pas juste
  // (la Trinité prend 3 places d'un coup), on essaie avec moins de Pèlerins.
  for (let pelerins = visee; pelerins >= 0; pelerins--) {
    const compo = remplir(spectres, pelerins, reste - pelerins);
    if (compo) return compo;
  }
  throw new Error('Pas assez de cartes pour ce nombre de joueurs');
}

/** Remplit `places` rôles spéciaux par priorité, complète en Pèlerins. null si impossible. */
function remplir(spectres: number, pelerins: number, places: number): Composition | null {
  const compo: Composition = { spectre: spectres };
  for (const role of PRIORITE) {
    const taille = ROLES[role].cartes; // la Trinité arrive entière (3)
    if (taille <= places) {
      compo[role] = taille;
      places -= taille;
    }
  }
  const total = pelerins + places;
  if (total > ROLES.pelerin.cartes) return null;
  if (total > 0) compo.pelerin = total;
  return compo;
}

/** Points d'un chemin, en coordonnées réelles (la salle fait 4 × 3). */
type Point = { x: number; y: number };

const CHEMINS: Record<Forme, { points: Point[]; ferme: boolean }> = {
  ovale: { points: [], ferme: true }, // calculé à part (ellipse)
  rectangle: {
    points: [{ x: 0.5, y: 0.45 }, { x: 3.5, y: 0.45 }, { x: 3.5, y: 2.55 }, { x: 0.5, y: 2.55 }],
    ferme: true,
  },
  // Les angles du U sont coupés en biais : deux sièges ne se retrouvent pas coin contre coin.
  u: {
    points: [
      { x: 0.3, y: 0.3 }, { x: 0.3, y: 2.45 }, { x: 0.55, y: 2.7 },
      { x: 3.45, y: 2.7 }, { x: 3.7, y: 2.45 }, { x: 3.7, y: 0.3 },
    ],
    ferme: false,
  },
};

/** Répartit n points à égale distance le long d'une ligne brisée. */
function lelongDe(points: Point[], ferme: boolean, n: number): Point[] {
  const segments = points.map((p, i) => [p, points[(i + 1) % points.length]] as const);
  if (!ferme) segments.pop();
  const longueurs = segments.map(([a, b]) => Math.hypot(b.x - a.x, b.y - a.y));
  const total = longueurs.reduce((s, l) => s + l, 0);
  const pas = ferme ? total / n : total / Math.max(1, n - 1);

  return Array.from({ length: n }, (_, i) => {
    let d = i * pas;
    for (let s = 0; s < segments.length; s++) {
      if (d <= longueurs[s] || s === segments.length - 1) {
        const [a, b] = segments[s];
        const t = longueurs[s] === 0 ? 0 : Math.min(1, d / longueurs[s]);
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      d -= longueurs[s];
    }
    return points[0];
  });
}

/** L'ovale du tour de table, approché par 120 points (en partant du haut). */
function ellipse(): Point[] {
  return Array.from({ length: 120 }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / 120;
    return { x: 2 + 1.78 * Math.cos(angle), y: 1.5 + 1.28 * Math.sin(angle) };
  });
}

/** Positions des sièges (en % du plan), siège 1 en haut à gauche, dans le sens des aiguilles d'une montre. */
export function disposer(forme: Forme, n: number): Siege['position'][] {
  const reels =
    forme === 'ovale'
      ? lelongDe(ellipse(), true, n) // même distance entre deux sièges tout autour
      : lelongDe(CHEMINS[forme].points, CHEMINS[forme].ferme, n);

  return reels.map((p) => ({ x: Math.round((p.x / 4) * 1000) / 10, y: Math.round((p.y / 3) * 1000) / 10 }));
}

/** Mélange de Fisher-Yates. `alea` renvoie un nombre dans [0, 1[ (Math.random par défaut). */
export function melanger<T>(liste: T[], alea: () => number = Math.random): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

export interface OptionsGenerateur {
  salle: string;
  forme: Forme;
  composition: Composition;
  /** Pour des tirages reproductibles dans les tests. */
  alea?: () => number;
}

/** Crée un plan : un siège par carte, les rôles tirés au hasard sur les sièges. */
export function genererPlan({ salle, forme, composition, alea }: OptionsGenerateur): Plan {
  const nom = salle.trim();
  if (!nom) throw new Error('Donne un nom à la salle');

  const roles = (Object.entries(composition) as [RoleId, number][]).flatMap(([role, nb]) =>
    Array.from({ length: nb }, () => role),
  );
  const tires = melanger(roles, alea);
  const positions = disposer(forme, tires.length);

  const plan: Plan = {
    id: `${nom}-${tires.length}`,
    salle: nom,
    nbJoueurs: tires.length,
    sieges: tires.map((role, i) => ({ numero: i + 1, role, position: positions[i] })),
  };
  const erreurs = validerPlan(plan);
  if (erreurs.length > 0) throw new Error(erreurs.join(' ; '));
  return plan;
}

/** Échange les rôles de deux sièges (retouche à la main après le tirage). */
export function echangerRoles(plan: Plan, a: number, b: number): Plan {
  const roleA = plan.sieges.find((s) => s.numero === a)?.role;
  const roleB = plan.sieges.find((s) => s.numero === b)?.role;
  if (!roleA || !roleB) throw new Error('Siège inconnu');
  return {
    ...plan,
    sieges: plan.sieges.map((s) =>
      s.numero === a ? { ...s, role: roleB } : s.numero === b ? { ...s, role: roleA } : s,
    ),
  };
}
