// Nuit d'explication : les rôles de la partie un par un (reconnaissances et choix au passage), puis l'Alpha.
import { describe, expect, it } from 'vitest';
import { appliquer, creerPartie, etapeSuivante, type EtatPartie } from '../../src/engine';
import { demarrer, planDeTest } from './aides';

const PLAN = planDeTest([
  'trinite', 'trinite', 'trinite', 'anatheme', 'adepte', 'spectre', 'spectre', 'oracle', 'doubles', 'doubles', 'maudit',
]);

/** Les étapes de l'explication, rôle par rôle, en passant tout (et en choisissant le siège 8). */
function parcourir(etat: EtatPartie): string[] {
  const vus: string[] = [];
  let suivant = etat;
  while (suivant.phase.type === 'explication') {
    const etape = etapeSuivante(suivant);
    if (etape.type !== 'explication') throw new Error(etape.type);
    vus.push(`${etape.rang}/${etape.total} ${etape.role} ${etape.mode}`);
    suivant =
      etape.role === 'anatheme'
        ? appliquer(suivant, { type: 'anatheme-choisir-modele', cible: 8 })
        : etape.role === 'adepte'
          ? appliquer(suivant, { type: 'adepte-choisir-mentor', cible: 8 })
          : appliquer(suivant, { type: 'passer' });
  }
  return vus;
}

describe("nuit d'explication", () => {
  it('passe les rôles de la partie un par un, seulement eux, dans l\'ordre du jeu', () => {
    const etat = creerPartie(PLAN);
    expect(etat.phase).toEqual({ type: 'explication', etape: 0 });
    // Nuit d'explication (Spectres, Doubles, Trinité, Anathème, Adepte), puis l'ordre des réveils.
    expect(parcourir(etat)).toEqual([
      '1/7 spectre reconnaissance',
      '2/7 doubles reconnaissance',
      '3/7 trinite reconnaissance',
      '4/7 anatheme choix',
      '5/7 adepte choix',
      '6/7 oracle presentation',
      '7/7 maudit presentation',
    ]);
  });

  it('ordre complet : réveils de la nuit, puis les rôles sans réveil', () => {
    const etat = creerPartie(
      planDeTest([
        'pelerin', 'alpha', 'main-noire', 'sainte', 'augure', 'spectre', 'courtisane', 'oracle', 'bourreau', 'vipere',
        'protecteur', 'devoue',
      ]),
    );
    expect(parcourir(etat).map((e) => e.split(' ')[1])).toEqual([
      'spectre', 'courtisane', 'protecteur', 'oracle', 'augure', 'sainte', 'vipere',
      'pelerin', 'devoue', 'alpha', 'main-noire', 'bourreau',
    ]);
  });

  it('au passage des Spectres, toute la meute se reconnaît, Maudit compris', () => {
    const etat = creerPartie(PLAN);
    expect(etapeSuivante(etat)).toMatchObject({
      type: 'explication', role: 'spectre', nombre: 2, mode: 'reconnaissance', acteurs: [6, 7, 11],
    });
    expect(appliquer(etat, { type: 'passer' }).infoMJ).toBe('Spectres : siège 6, siège 7, siège 11');
  });

  it("sans carte Spectre, la reconnaissance se fait au passage de l'Originel", () => {
    const etat = creerPartie(planDeTest(['originel', 'oracle', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin']));
    // L'Originel ouvre l'explication avec la reconnaissance de la meute.
    expect(parcourir(etat)).toEqual(['1/3 originel reconnaissance', '2/3 oracle presentation', '3/3 pelerin presentation']);
  });

  it("l'Anathème et l'Adepte choisissent à leur passage, et c'est obligatoire", () => {
    let etat = creerPartie(PLAN);
    for (let i = 0; i < 3; i++) etat = appliquer(etat, { type: 'passer' }); // Spectres, Doubles, Trinité
    expect(etapeSuivante(etat)).toMatchObject({ role: 'anatheme', mode: 'choix' });
    expect(() => appliquer(etat, { type: 'passer' })).toThrow(/doit faire son choix/);
    expect(() => appliquer(etat, { type: 'anatheme-choisir-modele', cible: 4 })).toThrow();
    etat = appliquer(etat, { type: 'anatheme-choisir-modele', cible: 8 });
    expect(etat.joueurs[3].memoire.lien).toBe(8);
    expect(etat.infoMJ).toBe('siège 4 a choisi pour modèle siège 8');
    etat = appliquer(etat, { type: 'adepte-choisir-mentor', cible: 6 });
    expect(etat.joueurs[4].memoire.lien).toBe(6);
  });

  it("personne ne meurt et personne n'attaque pendant l'explication", () => {
    const etat = creerPartie(PLAN);
    expect(() => appliquer(etat, { type: 'spectres-attaquer', cible: 8 })).toThrow(/passer/);
    expect(demarrer(creerPartie(PLAN)).joueurs.every((j) => j.vivant)).toBe(true);
  });

  it("après le dernier rôle : élection de l'Alpha (jour 0)", () => {
    let etat = creerPartie(PLAN);
    parcourir(etat);
    while (etat.phase.type === 'explication') {
      const etape = etapeSuivante(etat);
      etat = etape.type === 'explication' && etape.mode === 'choix'
        ? appliquer(etat, etape.role === 'anatheme'
            ? { type: 'anatheme-choisir-modele', cible: 8 }
            : { type: 'adepte-choisir-mentor', cible: 8 })
        : appliquer(etat, { type: 'passer' });
    }
    expect(etat.phase).toEqual({ type: 'jour', numero: 0 });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'election-alpha', numero: 0 });
  });

  it('Alpha élu au jour 0, puis la première nuit, normale', () => {
    const etat = demarrer(creerPartie(PLAN), { alpha: 8 });
    expect(etat.alpha).toBe(8);
    expect(etat.phase).toEqual({ type: 'nuit', numero: 1, etape: 0 });
    expect(etat.infoMJ).toBe('siège 8 est élu Alpha');
    expect(etapeSuivante(etat)).toMatchObject({ type: 'reveil', role: 'oracle' });
  });

  it("élection repoussée : le village élit l'Alpha le premier jour", () => {
    const etat = demarrer(creerPartie(PLAN));
    expect(etat.alpha).toBeNull();
    expect(etat.phase).toEqual({ type: 'nuit', numero: 1, etape: 0 });
  });

  it("si l'Alpha est une carte posée sur un siège, pas d'élection", () => {
    let etat = creerPartie(planDeTest(['alpha', 'spectre', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'oracle']));
    // Rôles en jeu : Spectre, Oracle, Pèlerin, Alpha.
    for (let i = 0; i < 4; i++) etat = appliquer(etat, { type: 'passer' });
    expect(etat.phase).toEqual({ type: 'nuit', numero: 1, etape: 0 });
  });
});
