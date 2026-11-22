import { describe, expect, it } from 'vitest';
import { appliquer, creerPartie, etapeSuivante, type EtatPartie } from '../../src/engine';
import { PLAN_COMPLET, finirNuit, jouerNuit, planDeTest } from './aides';

const auVote = (etat: EtatPartie, alpha = 3) => appliquer(finirNuit(etat), { type: 'elire-alpha', cible: alpha });

describe('Main Noire', () => {
  it('à sa mort, elle élimine un joueur de son choix', () => {
    let etat = finirNuit(creerPartie(PLAN_COMPLET), { spectre: { type: 'spectres-attaquer', cible: 9 } });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'decision', decision: { type: 'main-noire', tireur: 9 } });
    expect(() => appliquer(etat, { type: 'elire-alpha', cible: 3 })).toThrow(/Main Noire/);
    etat = appliquer(etat, { type: 'main-noire-tirer', cible: 5 });
    expect(etat.joueurs[4].vivant).toBe(false);
    expect(etat.infoMJ).toBe('La Main Noire élimine siège 5');
    expect(etapeSuivante(etat)).toMatchObject({ type: 'election-alpha' });
  });

  it('elle tire aussi si elle meurt au vote', () => {
    let etat = auVote(creerPartie(PLAN_COMPLET));
    etat = appliquer(etat, { type: 'vote', votes: { 1: 9 } });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'decision', decision: { type: 'main-noire' } });
    etat = appliquer(etat, { type: 'main-noire-tirer', cible: 6 });
    expect(etat.joueurs[5].vivant).toBe(false);
    expect(etapeSuivante(etat)).toMatchObject({ type: 'reveil', role: 'courtisane' });
  });
});

describe("successeur de l'Alpha", () => {
  it("l'Alpha mort désigne son successeur", () => {
    let etat = auVote(creerPartie(PLAN_COMPLET), 10);
    etat = appliquer(etat, { type: 'vote', votes: { 1: 10 } });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'decision', decision: { type: 'alpha-successeur', ancien: 10 } });
    etat = appliquer(etat, { type: 'alpha-successeur', cible: 11 });
    expect(etat.alpha).toBe(11);
  });

  it("s'il passe, le village réélit un Alpha", () => {
    let etat = auVote(creerPartie(PLAN_COMPLET), 10);
    etat = appliquer(etat, { type: 'vote', votes: { 1: 10 } });
    etat = appliquer(etat, { type: 'passer' });
    etat = finirNuit(etat);
    expect(etapeSuivante(etat)).toMatchObject({ type: 'election-alpha', numero: 2 });
  });
});

describe('Anathème', () => {
  const PLAN = planDeTest(['anatheme', 'spectre', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin']);

  it('si son modèle meurt, il bascule chez les Spectres et se réveille avec eux', () => {
    let etat = creerPartie(PLAN);
    etat.joueurs[0].memoire.lien = 3; // modèle = siège 3 (choisi en première nuit, semaine 4)
    etat = finirNuit(etat, { spectre: { type: 'spectres-attaquer', cible: 3 } });
    expect(etat.joueurs[0].camp).toBe('spectres');

    etat = appliquer(etat, { type: 'elire-alpha', cible: 4 });
    etat = appliquer(etat, { type: 'passer' });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'reveil', role: 'spectre', acteurs: [1, 2] });
  });

  it("sinon il reste Pèlerin", () => {
    let etat = creerPartie(PLAN);
    etat.joueurs[0].memoire.lien = 3;
    etat = finirNuit(etat, { spectre: { type: 'spectres-attaquer', cible: 4 } });
    expect(etat.joueurs[0].camp).toBe('pelerins');
  });
});

describe('Adepte', () => {
  it('hérite du rôle de son mentor, pouvoirs remis à neuf', () => {
    const plan = planDeTest(['adepte', 'spectre', 'sainte', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin']);
    let etat = creerPartie(plan);
    etat.joueurs[0].memoire.lien = 3;
    etat.joueurs[2].memoire.pouvoirUtilise = true;
    etat = finirNuit(etat, { spectre: { type: 'spectres-attaquer', cible: 3 } });
    expect(etat.joueurs[0]).toMatchObject({ role: 'sainte', camp: 'pelerins' });
    expect(etat.joueurs[0].memoire.pouvoirUtilise).toBe(false);
  });

  it('si le mentor était un Spectre, il bascule chez les Spectres', () => {
    const plan = planDeTest(['adepte', 'spectre', 'spectre', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin']);
    let etat = creerPartie(plan);
    etat.joueurs[0].memoire.lien = 2;
    etat = auVote(etat, 4);
    etat = appliquer(etat, { type: 'vote', votes: { 4: 2, 5: 2 } });
    expect(etat.joueurs[0]).toMatchObject({ role: 'spectre', camp: 'spectres' });
  });
});

describe('Usurpateur', () => {
  const PLAN = planDeTest(['usurpateur', 'spectre', 'main-noire', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin']);

  it('il prend le rôle du mort, qui ne déclenche plus son effet', () => {
    let etat = finirNuit(creerPartie(PLAN), { spectre: { type: 'spectres-attaquer', cible: 3 } });
    expect(etapeSuivante(etat)).toMatchObject({
      type: 'decision',
      decision: { type: 'usurpateur', usurpateur: 1, mort: 3 },
      ciblesPossibles: [3],
    });
    etat = appliquer(etat, { type: 'usurpateur-remplacer', cible: 3 });
    expect(etat.joueurs[0].role).toBe('main-noire');
    expect(etapeSuivante(etat)).toMatchObject({ type: 'election-alpha' });
  });

  it("s'il refuse, l'effet du mort s'applique", () => {
    let etat = finirNuit(creerPartie(PLAN), { spectre: { type: 'spectres-attaquer', cible: 3 } });
    etat = appliquer(etat, { type: 'usurpateur-remplacer', cible: null });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'decision', decision: { type: 'main-noire', tireur: 3 } });
  });

  it("il ne peut usurper que le mort qu'on lui propose", () => {
    const etat = finirNuit(creerPartie(PLAN), { spectre: { type: 'spectres-attaquer', cible: 3 } });
    expect(() => appliquer(etat, { type: 'usurpateur-remplacer', cible: 4 })).toThrow();
  });
});

it('jouerNuit est utilisable sans action', () => {
  expect(etapeSuivante(jouerNuit(creerPartie(PLAN_COMPLET)))).toMatchObject({ type: 'resolution-nuit', morts: [] });
});
