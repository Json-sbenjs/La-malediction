import { describe, expect, it } from 'vitest';
import { ROLES, getRole, rolesQuiSeReveillent } from '../../src/engine/roles';

describe('registre des rôles', () => {
  it("chaque entrée a l'id de sa clé", () => {
    for (const [cle, role] of Object.entries(ROLES)) {
      expect(role.id).toBe(cle);
    }
  });

  it('les 28 cartes du jeu sont dans le registre', () => {
    expect(Object.keys(ROLES)).toHaveLength(28);
    expect(getRole('doubles').cartes).toBe(2);
    expect(getRole('revenant').jamaisDistribue).toBe(true);
  });

  it('respecte le nombre de cartes de la planche', () => {
    expect(getRole('spectre').cartes).toBe(4);
    expect(getRole('pelerin').cartes).toBe(6);
    expect(getRole('trinite').cartes).toBe(3);
    expect(getRole('oracle').cartes).toBe(1);
  });

  it('pouvoirs à usage unique', () => {
    const uniques = Object.values(ROLES)
      .filter((r) => r.usageUnique)
      .map((r) => r.id)
      .sort();
    expect(uniques).toEqual([
      'bourreau', 'enchanteur', 'necromancien', 'originel', 'sacrifie', 'sainte', 'usurpateur', 'vipere',
    ]);
  });

  it("Anathème, Adepte, Trinité et Doubles peuvent changer de camp", () => {
    const variables = Object.values(ROLES)
      .filter((r) => r.campVariable)
      .map((r) => r.id)
      .sort();
    expect(variables).toEqual(['adepte', 'anatheme', 'doubles', 'trinite']);
  });

  it("deux rôles d'une même nuit n'ont pas le même rang", () => {
    for (const type of ['chaque-nuit', 'premiere-nuit'] as const) {
      const rangs = Object.values(ROLES).flatMap((r) =>
        r.reveil.type === type ? [r.reveil.rang] : [],
      );
      expect(new Set(rangs).size).toBe(rangs.length);
    }
  });
});

describe('ordre de réveil', () => {
  it("nuit normale : la Courtisane d'abord, la Sainte après les Spectres", () => {
    const ordre = rolesQuiSeReveillent(false).map((r) => r.id);
    expect(ordre[0]).toBe('courtisane');
    expect(ordre.indexOf('sainte')).toBeGreaterThan(ordre.indexOf('spectre'));
    expect(ordre).not.toContain('anatheme');
    expect(ordre).not.toContain('pelerin');
  });

  it('première nuit : reconnaissances et choix avant la nuit normale', () => {
    const ordre = rolesQuiSeReveillent(true).map((r) => r.id);
    expect(ordre.slice(0, 4)).toEqual(['trinite', 'doubles', 'anatheme', 'adepte']);
    expect(ordre).toContain('spectre');
  });
});
