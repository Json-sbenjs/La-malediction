import { describe, expect, it } from 'vitest';
import { creerPartie } from '../../src/engine';
import { verifierVictoire } from '../../src/engine/victoire';
import { PLAN_COMPLET, planDeTest } from './aides';

function avecMorts(morts: number[], plan = PLAN_COMPLET) {
  const etat = creerPartie(plan);
  for (const j of etat.joueurs) if (morts.includes(j.id)) j.vivant = false;
  return etat;
}

describe('victoire', () => {
  it('personne ne gagne en début de partie', () => {
    expect(verifierVictoire(creerPartie(PLAN_COMPLET))).toBeNull();
  });

  it('les Pèlerins gagnent quand tous les Spectres sont morts', () => {
    expect(verifierVictoire(avecMorts([5, 6]))).toEqual({ gagnants: 'pelerins' });
  });

  it('les Spectres gagnent quand il ne reste que des Spectres', () => {
    expect(verifierVictoire(avecMorts([1, 2, 3, 4, 7, 8, 9, 10, 11, 12]))).toEqual({ gagnants: 'spectres' });
  });

  it('un Anathème basculé compte comme Spectre', () => {
    const etat = avecMorts([5, 6]);
    etat.joueurs[0].camp = 'spectres';
    expect(verifierVictoire(etat)).toBeNull();
  });

  it('la Trinité encore soudée empêche la victoire des Pèlerins', () => {
    const plan = planDeTest(['trinite', 'trinite', 'trinite', 'spectre', 'pelerin', 'pelerin', 'pelerin', 'pelerin']);
    expect(verifierVictoire(avecMorts([4], plan))).toBeNull();
    expect(verifierVictoire(avecMorts([4, 5, 6, 7, 8], plan))).toEqual({ gagnants: 'trinite' });
  });

  it('tout le monde mort : personne ne gagne', () => {
    expect(verifierVictoire(avecMorts([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toEqual({ gagnants: null });
  });
});
