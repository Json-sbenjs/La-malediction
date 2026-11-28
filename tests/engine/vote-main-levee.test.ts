import { describe, expect, it } from 'vitest';
import { appliquer, compterMainsLevees, etapeSuivante, type EtatPartie } from '../../src/engine';
import { PLAN_COMPLET, finirNuit, nouvellePartie } from './aides';

/** Partie au jour 1, personne n'est mort, 12 votants, Alpha = siège 3. */
function auVote(): EtatPartie {
  return appliquer(finirNuit(nouvellePartie(PLAN_COMPLET)), { type: 'elire-alpha', cible: 3 });
}

describe('vote à main levée', () => {
  it('le MJ met directement 3 voix contre un joueur et 4 contre un autre', () => {
    expect(compterMainsLevees(auVote(), { 5: 3, 6: 4 }, null)).toEqual({ compte: { 5: 3, 6: 4 }, elimine: 6 });
  });

  it("l'Alpha a levé la main : sa voix compte double", () => {
    // 4 contre 4, mais l'Alpha est dans les mains contre 5 → 5 contre 4.
    expect(compterMainsLevees(auVote(), { 5: 4, 6: 4 }, 5)).toEqual({ compte: { 5: 5, 6: 4 }, elimine: 5 });
  });

  it("l'Alpha doit être compté dans les mains contre sa cible", () => {
    expect(() => compterMainsLevees(auVote(), { 6: 4 }, 5)).toThrow(/Alpha a levé la main/);
  });

  it('égalité ou aucune main : personne', () => {
    expect(compterMainsLevees(auVote(), { 5: 3, 6: 3 }, null).elimine).toBeNull();
    expect(compterMainsLevees(auVote(), {}, null).elimine).toBeNull();
    expect(compterMainsLevees(auVote(), { 5: 0 }, null)).toEqual({ compte: {}, elimine: null });
  });

  it('la marque de l’Inquisiteur ajoute une voix', () => {
    const etat = { ...auVote(), marque: 6 };
    expect(compterMainsLevees(etat, { 5: 3, 6: 3 }, null)).toEqual({ compte: { 5: 3, 6: 4 }, elimine: 6 });
  });

  it('pas plus de mains que de votants, pas contre un mort, pas de nombre bizarre', () => {
    expect(() => compterMainsLevees(auVote(), { 5: 7, 6: 6 }, null)).toThrow(/13 mains levées pour 12 votants/);
    expect(() => compterMainsLevees(auVote(), { 5: -1 }, null)).toThrow(/invalide/);
    expect(() => compterMainsLevees(auVote(), { 5: 1.5 }, null)).toThrow(/invalide/);
    const etat = auVote();
    etat.joueurs[11].vivant = false;
    expect(() => compterMainsLevees(etat, { 12: 2 }, null)).toThrow(/ne peut pas viser/);
  });

  it('les jours pairs, les morts lèvent la main aussi', () => {
    const etat = auVote();
    etat.joueurs[11].vivant = false;
    etat.phase = { type: 'jour', numero: 2 };
    // 11 vivants + 1 mort = 12 votants.
    expect(compterMainsLevees(etat, { 5: 12 }, null).elimine).toBe(5);
    etat.phase = { type: 'jour', numero: 1 };
    expect(() => compterMainsLevees(etat, { 5: 12 }, null)).toThrow(/12 mains levées pour 11 votants/);
  });

  it("appliquer : l'éliminé meurt et la nuit suivante commence", () => {
    const etat = appliquer(auVote(), { type: 'vote-main-levee', mains: { 10: 4, 11: 3 }, voteAlpha: null });
    expect(etat.joueurs[9].vivant).toBe(false);
    expect(etat.phase).toEqual({ type: 'nuit', numero: 2, etape: 0 });
    expect(etat.infoMJ).toBe('Le village élimine siège 10');
  });

  it("appliquer : les effets à la mort s'appliquent (Main Noire)", () => {
    const etat = appliquer(auVote(), { type: 'vote-main-levee', mains: { 9: 5 }, voteAlpha: 9 });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'decision', decision: { type: 'main-noire', tireur: 9 } });
  });
});
