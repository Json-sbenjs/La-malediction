import { describe, expect, it } from 'vitest';
import {
  ajouterSiege,
  cartesRestantes,
  changerRole,
  creerPartie,
  equilibreSpectres,
  placeLibre,
  retirerSiege,
  validerPlan,
} from '../../src/engine';
import { PLAN_COMPLET, planDeTest } from './aides';

// PLAN_COMPLET (12) : 1 Courtisane, 2 Protecteur, 3 Oracle, 4 Instinct, 5-6 Spectres,
// 7 Sainte, 8 Vipère, 9 Main Noire, 10-12 Pèlerins.

describe('ajuster une salle avant de lancer la partie', () => {
  it('retirer un siège : les suivants sont renumérotés et gardent leur place', () => {
    const plan = {
      ...PLAN_COMPLET,
      sieges: PLAN_COMPLET.sieges.map((s) => ({ ...s, position: { x: s.numero * 5, y: 10 } })),
    };
    const ajuste = retirerSiege(plan, 4);
    expect(ajuste.nbJoueurs).toBe(11);
    expect(ajuste.id).toBe('Test-11');
    expect(ajuste.sieges.map((s) => s.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(ajuste.sieges[3]).toEqual({ numero: 4, role: 'spectre', position: { x: 25, y: 10 } });
    expect(ajuste.sieges.some((s) => s.role === 'instinct')).toBe(false);
    expect(validerPlan(ajuste)).toEqual([]);
    expect(PLAN_COMPLET.nbJoueurs).toBe(12); // le plan d'origine n'est pas modifié
  });

  it('15 joueurs prévus, 13 présents : on retire deux sièges et la partie se lance', () => {
    const plan15 = planDeTest([
      'spectre', 'spectre', 'spectre', 'oracle', 'protecteur', 'sainte', 'vipere',
      'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'courtisane', 'instinct', 'main-noire',
    ]);
    const plan13 = retirerSiege(retirerSiege(plan15, 15), 9);
    expect(plan13.nbJoueurs).toBe(13);
    expect(creerPartie(plan13).joueurs).toHaveLength(13);
  });

  it('pas moins de 8 joueurs', () => {
    const plan8 = planDeTest(['spectre', 'spectre', 'oracle', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin']);
    expect(() => retirerSiege(plan8, 1)).toThrow(/au moins 8/);
    expect(() => retirerSiege(PLAN_COMPLET, 99)).toThrow(/inconnu/);
  });

  it('ajouter un siège : numéro suivant, rôle choisi, place libre', () => {
    const ajuste = ajouterSiege(PLAN_COMPLET, 'pelerin');
    expect(ajuste.nbJoueurs).toBe(13);
    expect(ajuste.id).toBe('Test-13');
    expect(ajuste.sieges[12]).toMatchObject({ numero: 13, role: 'pelerin' });
    expect(validerPlan(ajuste)).toEqual([]);
  });

  it("ajouter : pas un rôle dont toutes les cartes sont posées, ni le Revenant", () => {
    expect(cartesRestantes(PLAN_COMPLET, 'oracle')).toBe(0);
    expect(() => ajouterSiege(PLAN_COMPLET, 'oracle')).toThrow(/déjà posées/);
    expect(() => ajouterSiege(PLAN_COMPLET, 'revenant')).toThrow(/ne se pose pas/);
  });

  it('pas plus de 25 joueurs', () => {
    let plan = PLAN_COMPLET;
    const roles = ['pelerin', 'pelerin', 'pelerin', 'spectre', 'spectre', 'augure', 'medium',
      'inquisiteur', 'enchanteur', 'sacrifie', 'bourreau', 'devoue', 'alpha'] as const;
    for (const role of roles) plan = ajouterSiege(plan, role);
    expect(plan.nbJoueurs).toBe(25);
    expect(() => ajouterSiege(plan, 'adepte')).toThrow(/25 joueurs au maximum/);
  });

  it('la place libre est loin des sièges existants', () => {
    const plan = planDeTest(['spectre', 'spectre', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin']);
    plan.sieges.forEach((s, i) => (s.position = { x: 10 + i, y: 10 }));
    const place = placeLibre(plan);
    expect(Math.hypot(place.x - 10, place.y - 10)).toBeGreaterThan(80);
  });

  it("changer le rôle d'un siège", () => {
    const ajuste = changerRole(PLAN_COMPLET, 6, 'pelerin');
    expect(ajuste.sieges[5].role).toBe('pelerin');
    expect(changerRole(PLAN_COMPLET, 6, 'spectre')).toBe(PLAN_COMPLET); // même rôle : rien ne change
    expect(() => changerRole(PLAN_COMPLET, 10, 'oracle')).toThrow(/déjà posées/);
  });

  it('un plan à moitié ajusté est refusé au lancement (Trinité incomplète)', () => {
    const plan = planDeTest(['spectre', 'spectre', 'trinite', 'trinite', 'trinite', 'pelerin', 'pelerin', 'pelerin', 'pelerin']);
    const ajuste = retirerSiege(plan, 5);
    expect(validerPlan(ajuste)).toContain('La Trinité : il faut 3 membres');
    expect(() => creerPartie(ajuste)).toThrow(/Trinité/);
  });

  it('aide à l’équilibre : Spectres prévus et conseillés', () => {
    expect(equilibreSpectres(PLAN_COMPLET)).toEqual({ actuels: 2, conseilles: 3 });
  });
});
