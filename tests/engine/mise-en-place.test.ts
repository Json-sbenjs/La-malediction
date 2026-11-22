import { describe, expect, it } from 'vitest';
import { choisirPlan, creerPartie, nombresDeJoueurs, sallesDisponibles } from '../../src/engine/mise-en-place';
import { PLAN_NUIT, planDeTest } from './aides';

const PLANS = [
  PLAN_NUIT,
  planDeTest(['spectre', 'spectre', 'oracle', 'protecteur', 'pelerin', 'pelerin', 'pelerin', 'pelerin'], 'Clown'),
  planDeTest(['spectre', 'spectre', 'oracle', 'protecteur', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'sainte'], 'Clown'),
];

describe('choix du plan', () => {
  it('liste les salles et les nombres de joueurs', () => {
    expect(sallesDisponibles(PLANS)).toEqual(['Test', 'Clown']);
    expect(nombresDeJoueurs('Clown', PLANS)).toEqual([8, 9]);
  });

  it('charge le plan demandé', () => {
    expect(choisirPlan('Clown', 9, PLANS).id).toBe('Clown-9');
  });

  it('refuse un plan qui n\'existe pas', () => {
    expect(() => choisirPlan('Clown', 12, PLANS)).toThrow(/Aucun plan/);
  });
});

describe('creerPartie', () => {
  it('un joueur par siège, le rôle vient du siège', () => {
    const etat = creerPartie(PLAN_NUIT);
    expect(etat.joueurs).toHaveLength(10);
    expect(etat.joueurs[0]).toMatchObject({ id: 1, role: 'courtisane', camp: 'pelerins', vivant: true });
    expect(etat.joueurs[4]).toMatchObject({ id: 5, role: 'spectre', camp: 'spectres' });
  });

  it('démarre à la première nuit', () => {
    expect(creerPartie(PLAN_NUIT).phase).toEqual({ type: 'nuit', numero: 1, etape: 0 });
  });

  it('prénoms facultatifs', () => {
    const etat = creerPartie(PLAN_NUIT, ['Léa', null, '  ']);
    expect(etat.joueurs.map((j) => j.nom).slice(0, 4)).toEqual(['Léa', null, null, null]);
  });

  it('refuse trop de prénoms', () => {
    expect(() => creerPartie(PLAN_NUIT, Array(11).fill('x'))).toThrow(/prénoms/);
  });

  it('refuse un plan invalide', () => {
    const plan = planDeTest(['pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'oracle', 'sainte']);
    expect(() => creerPartie(plan)).toThrow(/Spectre/);
  });
});
