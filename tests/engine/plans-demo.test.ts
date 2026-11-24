import { describe, expect, it } from 'vitest';
import { validerPlan } from '../../src/engine/plans';
import { PLANS_DEMO } from '../../src/web/plans-demo';

describe('plans de démonstration', () => {
  it.each(PLANS_DEMO.map((p) => [p.id, p] as const))('%s est valide', (_, plan) => {
    expect(validerPlan(plan)).toEqual([]);
  });
});
