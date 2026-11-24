// Nuit d'explication : présentation des rôles, reconnaissances, modèle et mentor, puis élection de l'Alpha.
import { describe, expect, it } from 'vitest';
import { appliquer, creerPartie, etapeSuivante } from '../../src/engine';
import { demarrer, planDeTest } from './aides';

const PLAN = planDeTest([
  'trinite', 'trinite', 'trinite', 'anatheme', 'adepte', 'spectre', 'spectre', 'oracle', 'doubles', 'doubles', 'maudit',
]);

describe("nuit d'explication", () => {
  it('commence par la présentation des rôles en jeu', () => {
    const etat = creerPartie(PLAN);
    expect(etat.phase).toEqual({ type: 'explication', etape: 0 });
    expect(etapeSuivante(etat)).toEqual({
      type: 'presentation',
      roles: [
        { role: 'spectre', nombre: 2 },
        { role: 'oracle', nombre: 1 },
        { role: 'anatheme', nombre: 1 },
        { role: 'adepte', nombre: 1 },
        { role: 'trinite', nombre: 3 },
        { role: 'maudit', nombre: 1 },
        { role: 'doubles', nombre: 2 },
      ],
    });
  });

  it('ordre : Spectres (et le Maudit), Doubles, Trinité, Anathème, Adepte', () => {
    let etat = appliquer(creerPartie(PLAN), { type: 'passer' });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'reveil', role: 'spectre', acteurs: [6, 7, 11] });
    etat = appliquer(etat, { type: 'passer' });
    expect(etat.infoMJ).toBe('Spectres : siège 6, siège 7, siège 11');
    expect(etapeSuivante(etat)).toMatchObject({ role: 'doubles', acteurs: [9, 10] });
    etat = appliquer(etat, { type: 'passer' });
    expect(etapeSuivante(etat)).toMatchObject({ role: 'trinite', acteurs: [1, 2, 3], ciblesPossibles: [] });
    etat = appliquer(etat, { type: 'passer' });
    expect(etat.infoMJ).toBe('Trinité : siège 1, siège 2, siège 3');
    expect(etapeSuivante(etat)).toMatchObject({ role: 'anatheme' });
    etat = appliquer(etat, { type: 'anatheme-choisir-modele', cible: 8 });
    expect(etat.joueurs[3].memoire.lien).toBe(8);
    expect(etat.infoMJ).toBe('siège 4 a choisi pour modèle siège 8');
    etat = appliquer(etat, { type: 'adepte-choisir-mentor', cible: 6 });
    expect(etat.joueurs[4].memoire.lien).toBe(6);
    // Fin de l'explication : élection de l'Alpha au jour 0.
    expect(etat.phase).toEqual({ type: 'jour', numero: 0 });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'election-alpha', numero: 0 });
  });

  it("le choix de l'Anathème est obligatoire, et pas lui-même", () => {
    let etat = creerPartie(PLAN);
    for (let i = 0; i < 4; i++) etat = appliquer(etat, { type: 'passer' });
    expect(etapeSuivante(etat)).toMatchObject({ role: 'anatheme' });
    expect(() => appliquer(etat, { type: 'passer' })).toThrow(/doit faire son choix/);
    expect(() => appliquer(etat, { type: 'anatheme-choisir-modele', cible: 4 })).toThrow();
  });

  it("personne ne meurt et personne n'attaque pendant l'explication", () => {
    let etat = appliquer(creerPartie(PLAN), { type: 'passer' });
    expect(() => appliquer(etat, { type: 'spectres-attaquer', cible: 8 })).toThrow(/reconnaissance/);
    etat = demarrer(creerPartie(PLAN));
    expect(etat.joueurs.every((j) => j.vivant)).toBe(true);
  });

  it('Alpha élu au jour 0, puis la première nuit commence', () => {
    const etat = demarrer(creerPartie(PLAN), { alpha: 8 });
    expect(etat.alpha).toBe(8);
    expect(etat.phase).toEqual({ type: 'nuit', numero: 1, etape: 0 });
    expect(etat.infoMJ).toBe('siège 8 est élu Alpha');
    // La première nuit est une nuit normale : plus de reconnaissance ni de choix de modèle.
    expect(etapeSuivante(etat)).toMatchObject({ type: 'reveil', role: 'oracle' });
  });

  it("élection repoussée : le village élit l'Alpha le premier jour", () => {
    const etat = demarrer(creerPartie(PLAN));
    expect(etat.alpha).toBeNull();
    expect(etat.phase).toEqual({ type: 'nuit', numero: 1, etape: 0 });
  });

  it("si l'Alpha est une carte posée sur un siège, pas d'élection", () => {
    let etat = creerPartie(planDeTest(['alpha', 'spectre', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'oracle']));
    etat = appliquer(etat, { type: 'passer' }); // présentation
    etat = appliquer(etat, { type: 'passer' }); // Spectres
    expect(etat.phase).toEqual({ type: 'nuit', numero: 1, etape: 0 });
  });
});
