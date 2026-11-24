import { describe, expect, it } from 'vitest';
import {
  compositionConseillee,
  disposer,
  echangerRoles,
  genererPlan,
  maxJoueursPossible,
  melanger,
  totalComposition,
  type Forme,
} from '../../src/engine/generateur';
import { validerPlan } from '../../src/engine/plans';
import { ROLES } from '../../src/engine/roles';
import type { RoleId } from '../../src/engine/types';

/** Générateur pseudo-aléatoire reproductible (pour des tests stables). */
function graine(n: number): () => number {
  let x = n;
  return () => {
    x = (x * 1103515245 + 12345) % 2 ** 31;
    return x / 2 ** 31;
  };
}

describe('composition conseillée', () => {
  it('de 8 à 25 joueurs', () => {
    expect(maxJoueursPossible()).toBe(25);
    expect(() => compositionConseillee(26)).toThrow();
    expect(() => compositionConseillee(7)).toThrow();
  });

  it.each(Array.from({ length: 18 }, (_, i) => i + 8))('%i joueurs : bon total, cartes respectées', (nb) => {
    const compo = compositionConseillee(nb);
    expect(totalComposition(compo)).toBe(nb);
    for (const [role, n] of Object.entries(compo) as [RoleId, number][]) {
      expect(n).toBeLessThanOrEqual(ROLES[role].cartes);
    }
    expect(compo.spectre).toBeGreaterThanOrEqual(2);
    if (compo.trinite !== undefined) expect(compo.trinite).toBe(3);
    if (compo.doubles !== undefined) expect(compo.doubles).toBe(2);
    expect(compo.revenant).toBeUndefined();
  });

  it('8 joueurs : 2 Spectres, Oracle, Protecteur, Sainte, 3 Pèlerins', () => {
    expect(compositionConseillee(8)).toEqual({ spectre: 2, oracle: 1, protecteur: 1, sainte: 1, pelerin: 3 });
  });
});

describe('disposition', () => {
  it.each<Forme>(['ovale', 'rectangle', 'u'])('%s : n sièges dans le plan, pas deux au même endroit', (forme) => {
    for (const n of [8, 15, 24]) {
      const pos = disposer(forme, n);
      expect(pos).toHaveLength(n);
      for (const p of pos) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(100);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(100);
      }
      expect(new Set(pos.map((p) => `${p.x};${p.y}`)).size).toBe(n);
    }
  });
});

describe('genererPlan', () => {
  it('crée un plan valide avec les bons rôles', () => {
    const composition = compositionConseillee(12);
    const plan = genererPlan({ salle: 'Grenier', forme: 'u', composition, alea: graine(1) });
    expect(plan.id).toBe('Grenier-12');
    expect(plan.nbJoueurs).toBe(12);
    expect(validerPlan(plan)).toEqual([]);
    const compte: Record<string, number> = {};
    for (const s of plan.sieges) compte[s.role] = (compte[s.role] ?? 0) + 1;
    expect(compte).toEqual(composition);
  });

  it('le tirage dépend du hasard, mais est reproductible', () => {
    const options = { salle: 'A', forme: 'ovale' as const, composition: compositionConseillee(15) };
    const roles = (g: number) => genererPlan({ ...options, alea: graine(g) }).sieges.map((s) => s.role);
    expect(roles(1)).toEqual(roles(1));
    expect(roles(1)).not.toEqual(roles(2));
  });

  it('refuse une composition injouable ou une salle sans nom', () => {
    expect(() => genererPlan({ salle: 'A', forme: 'ovale', composition: { pelerin: 6, oracle: 1, sainte: 1 } })).toThrow(
      /Spectre/,
    );
    expect(() => genererPlan({ salle: ' ', forme: 'ovale', composition: compositionConseillee(8) })).toThrow(/nom/);
  });

  it('on peut échanger deux rôles à la main', () => {
    const plan = genererPlan({ salle: 'A', forme: 'ovale', composition: compositionConseillee(8), alea: graine(3) });
    const [a, b] = [plan.sieges[0].role, plan.sieges[1].role];
    const modifie = echangerRoles(plan, 1, 2);
    expect([modifie.sieges[0].role, modifie.sieges[1].role]).toEqual([b, a]);
    expect(plan.sieges[0].role).toBe(a); // l'original ne bouge pas
  });
});

it('melanger garde les mêmes éléments', () => {
  expect(melanger([1, 2, 3, 4, 5], graine(7)).sort()).toEqual([1, 2, 3, 4, 5]);
});
