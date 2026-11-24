import { describe, expect, it } from 'vitest';
import { PLANS, compterRoles, trouverPlan, validerPlan } from '../../src/engine/plans';
import { planDeTest } from './aides';
import type { RoleId } from '../../src/engine/types';

const HUIT: RoleId[] = [
  'spectre', 'spectre', 'oracle', 'protecteur',
  'sainte', 'pelerin', 'pelerin', 'alpha',
];

describe('validerPlan', () => {
  it('accepte un plan correct', () => {
    expect(validerPlan(planDeTest(HUIT))).toEqual([]);
  });

  it('refuse moins de 8 joueurs', () => {
    expect(validerPlan(planDeTest(HUIT.slice(0, 7)))).not.toEqual([]);
  });

  it('refuse plus de cartes que la boîte', () => {
    const plan = planDeTest([...HUIT.slice(0, 3), 'spectre', 'spectre', 'spectre', 'pelerin', 'pelerin']);
    expect(validerPlan(plan).join()).toMatch(/Spectre/);
  });

  it('refuse un plan sans Spectre', () => {
    const plan = planDeTest(HUIT.map((r) => (r === 'spectre' ? 'pelerin' : r)));
    expect(validerPlan(plan)).toContain('il faut au moins un Spectre');
  });

  it('refuse une Trinité incomplète', () => {
    const plan = planDeTest([...HUIT.slice(0, 6), 'trinite', 'trinite']);
    expect(validerPlan(plan).join()).toMatch(/Trinité/);
  });

  it('refuse des numéros de siège en double', () => {
    const plan = planDeTest(HUIT);
    plan.sieges[1].numero = 1;
    expect(validerPlan(plan).join()).toMatch(/numérotés/);
  });

  it('refuse un nbJoueurs qui ne colle pas aux sièges', () => {
    const plan = { ...planDeTest(HUIT), nbJoueurs: 9 };
    expect(validerPlan(plan).join()).toMatch(/8 sièges pour 9 joueurs/);
  });
});

describe('outils', () => {
  it('compte les rôles', () => {
    expect(compterRoles(planDeTest(HUIT))).toEqual({
      spectre: 2, oracle: 1, protecteur: 1, sainte: 1, pelerin: 2, alpha: 1,
    });
  });

  it('trouve un plan par salle et nombre de joueurs', () => {
    const plans = [planDeTest(HUIT, 'Clown')];
    expect(trouverPlan('Clown', 8, plans)?.id).toBe('Clown-8');
    expect(trouverPlan('Clown', 9, plans)).toBeUndefined();
  });

  it('tous les plans saisis sont valides', () => {
    for (const plan of PLANS) {
      expect(validerPlan(plan), plan.id).toEqual([]);
    }
  });
});
