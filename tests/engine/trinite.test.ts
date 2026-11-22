import { describe, expect, it } from 'vitest';
import { appliquer, creerPartie, etapeSuivante } from '../../src/engine';
import { finirNuit, planDeTest } from './aides';

const PLAN = planDeTest(['trinite', 'trinite', 'trinite', 'spectre', 'pelerin', 'pelerin', 'pelerin', 'pelerin']);

describe('Trinité', () => {
  it('au départ, ses 3 membres forment un camp à part', () => {
    const etat = creerPartie(PLAN);
    expect(etat.joueurs.slice(0, 3).map((j) => j.camp)).toEqual(['trinite', 'trinite', 'trinite']);
  });

  it('à la 1re mort, elle se dissout : les survivants passent Pèlerins', () => {
    const etat = finirNuit(creerPartie(PLAN), { spectre: { type: 'spectres-attaquer', cible: 2 } });
    expect(etat.joueurs.slice(0, 3).map((j) => j.camp)).toEqual(['pelerins', 'pelerins', 'pelerins']);
  });

  it('dissoute, elle gagne avec les Pèlerins', () => {
    let etat = finirNuit(creerPartie(PLAN), { spectre: { type: 'spectres-attaquer', cible: 2 } });
    etat = appliquer(etat, { type: 'elire-alpha', cible: 1 });
    etat = appliquer(etat, { type: 'vote', votes: { 1: 4 } });
    expect(etapeSuivante(etat)).toEqual({ type: 'fin', gagnants: 'pelerins' });
  });

  it('soudée, elle gagne seule quand les 3 sont les seuls survivants', () => {
    let etat = creerPartie(PLAN);
    for (const j of etat.joueurs) j.vivant = [1, 2, 3, 4].includes(j.id);
    etat = finirNuit(etat, { spectre: { type: 'spectres-attaquer', cible: null } });
    etat = appliquer(etat, { type: 'elire-alpha', cible: 1 });
    etat = appliquer(etat, { type: 'vote', votes: { 1: 4, 2: 4, 3: 4 } });
    expect(etapeSuivante(etat)).toEqual({ type: 'fin', gagnants: 'trinite' });
  });

  it('soudée, elle empêche la victoire des Pèlerins', () => {
    let etat = finirNuit(creerPartie(PLAN));
    etat = appliquer(etat, { type: 'elire-alpha', cible: 5 });
    etat = appliquer(etat, { type: 'vote', votes: { 5: 4 } }); // le seul Spectre meurt
    expect(etat.phase).toMatchObject({ type: 'nuit', numero: 2 });
    expect(etapeSuivante(etat).type).not.toBe('fin');
  });
});
