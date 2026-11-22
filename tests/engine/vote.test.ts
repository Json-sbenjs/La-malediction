import { describe, expect, it } from 'vitest';
import { appliquer, compterVotes, creerPartie, etapeSuivante, type EtatPartie } from '../../src/engine';
import { PLAN_COMPLET, finirNuit, planDeTest } from './aides';

/** Partie au jour 1, personne n'est mort, Alpha = siège 3. */
function auVote(): EtatPartie {
  const etat = finirNuit(creerPartie(PLAN_COMPLET));
  return appliquer(etat, { type: 'elire-alpha', cible: 3 });
}

describe('le jour', () => {
  it("le premier jour, on élit d'abord l'Alpha", () => {
    const etat = finirNuit(creerPartie(PLAN_COMPLET));
    expect(etapeSuivante(etat)).toMatchObject({ type: 'election-alpha', numero: 1 });
    expect(() => appliquer(etat, { type: 'vote', votes: {} })).toThrow(/Alpha/);
  });

  it("si l'Alpha est une carte du plan, pas d'élection", () => {
    const plan = planDeTest(['alpha', 'spectre', 'spectre', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin']);
    const etat = finirNuit(creerPartie(plan));
    expect(etapeSuivante(etat)).toMatchObject({ type: 'vote', alpha: 1 });
  });

  it("puis c'est le vote", () => {
    expect(etapeSuivante(auVote())).toMatchObject({ type: 'vote', alpha: 3, votants: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] });
  });
});

describe('compterVotes', () => {
  it('la majorité élimine', () => {
    expect(compterVotes(auVote(), { 1: 5, 2: 5, 4: 6 })).toEqual({ compte: { 5: 2, 6: 1 }, elimine: 5 });
  });

  it("la voix de l'Alpha compte double", () => {
    // 2 voix contre 6, mais l'Alpha (3) vote 5 → 2 contre 2... + 1 = 3
    expect(compterVotes(auVote(), { 1: 6, 2: 6, 3: 5, 4: 5 }).elimine).toBe(5);
  });

  it('égalité : personne', () => {
    expect(compterVotes(auVote(), { 1: 5, 2: 6 }).elimine).toBeNull();
  });

  it('abstentions et aucun vote', () => {
    expect(compterVotes(auVote(), { 1: null }).elimine).toBeNull();
    expect(compterVotes(auVote(), {}).elimine).toBeNull();
  });

  it('un mort ne vote pas, on ne vote pas contre un mort', () => {
    const etat = auVote();
    etat.joueurs[11].vivant = false;
    expect(() => compterVotes(etat, { 12: 5 })).toThrow(/ne peut pas voter/);
    expect(() => compterVotes(etat, { 1: 12 })).toThrow(/ne peut pas viser/);
  });
});

describe('après le vote', () => {
  it("l'éliminé meurt et la nuit suivante commence", () => {
    const etat = appliquer(auVote(), { type: 'vote', votes: { 1: 10, 2: 10 } });
    expect(etat.joueurs[9].vivant).toBe(false);
    expect(etat.phase).toEqual({ type: 'nuit', numero: 2, etape: 0 });
    expect(etat.infoMJ).toBe('Le village élimine siège 10');
    expect(etapeSuivante(etat)).toMatchObject({ type: 'reveil', role: 'courtisane' });
  });

  it("l'Alpha reste en place d'un jour à l'autre", () => {
    let etat = appliquer(auVote(), { type: 'passer' });
    etat = finirNuit(etat);
    expect(etapeSuivante(etat)).toMatchObject({ type: 'vote', numero: 2, alpha: 3 });
  });
});
