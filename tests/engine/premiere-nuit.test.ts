import { describe, expect, it } from 'vitest';
import { appliquer, creerPartie, etapeSuivante } from '../../src/engine';
import { finirNuit, planDeTest } from './aides';

const PLAN = planDeTest([
  'trinite', 'trinite', 'trinite', 'anatheme', 'adepte', 'spectre', 'spectre', 'oracle', 'pelerin', 'pelerin',
]);

describe('première nuit', () => {
  it("ordre : Trinité, Anathème, Adepte, puis la nuit normale", () => {
    let etat = creerPartie(PLAN);
    expect(etapeSuivante(etat)).toMatchObject({ type: 'reveil', role: 'trinite', acteurs: [1, 2, 3], ciblesPossibles: [] });
    etat = appliquer(etat, { type: 'passer' });
    expect(etat.infoMJ).toBe('Trinité : siège 1, siège 2, siège 3');
    expect(etapeSuivante(etat)).toMatchObject({ role: 'anatheme' });
    etat = appliquer(etat, { type: 'anatheme-choisir-modele', cible: 9 });
    expect(etapeSuivante(etat)).toMatchObject({ role: 'adepte' });
    etat = appliquer(etat, { type: 'adepte-choisir-mentor', cible: 6 });
    expect(etapeSuivante(etat)).toMatchObject({ role: 'oracle' });
  });

  it("l'Anathème choisit son modèle", () => {
    let etat = creerPartie(PLAN);
    etat = appliquer(etat, { type: 'passer' });
    etat = appliquer(etat, { type: 'anatheme-choisir-modele', cible: 9 });
    expect(etat.joueurs[3].memoire.lien).toBe(9);
    expect(etat.infoMJ).toBe('siège 4 a choisi pour modèle siège 9');
  });

  it("l'Adepte peut choisir un Spectre comme mentor", () => {
    let etat = creerPartie(PLAN);
    etat = appliquer(etat, { type: 'passer' });
    etat = appliquer(etat, { type: 'anatheme-choisir-modele', cible: 9 });
    etat = appliquer(etat, { type: 'adepte-choisir-mentor', cible: 6 });
    expect(etat.joueurs[4].memoire.lien).toBe(6);
    expect(etat.infoMJ).toMatch(/mentor siège 6/);
  });

  it("le choix est obligatoire, et pas soi-même", () => {
    let etat = creerPartie(PLAN);
    etat = appliquer(etat, { type: 'passer' });
    expect(() => appliquer(etat, { type: 'passer' })).toThrow(/doit faire son choix/);
    expect(() => appliquer(etat, { type: 'anatheme-choisir-modele', cible: 4 })).toThrow();
  });

  it("à partir de la nuit 2, plus de réveil « première nuit »", () => {
    let etat = finirNuit(creerPartie(PLAN), {
      anatheme: { type: 'anatheme-choisir-modele', cible: 9 },
      adepte: { type: 'adepte-choisir-mentor', cible: 8 },
    });
    etat = appliquer(etat, { type: 'elire-alpha', cible: 8 });
    etat = appliquer(etat, { type: 'passer' });
    expect(etat.phase).toMatchObject({ type: 'nuit', numero: 2 });
    expect(etapeSuivante(etat)).toMatchObject({ role: 'oracle' });
  });
});
