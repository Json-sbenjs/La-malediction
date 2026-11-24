import { describe, expect, it } from 'vitest';
import { appliquer, creerPartie, etapeSuivante, type Action, type EtatPartie } from '../../src/engine';
import { LIMITE_HISTORIQUE, annuler, memoriser, type Historique } from '../../src/engine/historique';
import { PLAN_COMPLET, nouvellePartie } from './aides';

/** Joue une action en mémorisant l'état d'avant, comme le fait l'appli. */
function jouer(etat: EtatPartie, historique: Historique, action: Action) {
  return { etat: appliquer(etat, action), historique: memoriser(historique, etat) };
}

describe('annuler la dernière action', () => {
  it('rien à annuler au début', () => {
    expect(annuler([])).toBeNull();
  });

  it("revient exactement à l'état d'avant", () => {
    const depart = nouvellePartie(PLAN_COMPLET);
    let { etat, historique } = jouer(depart, [], { type: 'courtisane-occuper', cible: 10 });
    ({ etat, historique } = jouer(etat, historique, { type: 'protecteur-proteger', cible: 3 }));
    expect(etapeSuivante(etat)).toMatchObject({ role: 'oracle' });

    const retour = annuler(historique)!;
    expect(etapeSuivante(retour.etat)).toMatchObject({ role: 'protecteur' });
    expect(retour.etat.joueurs[2].statuts.protege).toBe(false);
    expect(retour.historique).toHaveLength(1);

    const retour2 = annuler(retour.historique)!;
    expect(retour2.etat).toEqual(depart);
    expect(annuler(retour2.historique)).toBeNull();
  });

  it('annule une mort (le vote rapide)', () => {
    let etat = nouvellePartie(PLAN_COMPLET);
    etat = appliquer(etat, { type: 'passer' }); // on avance un peu
    let historique: Historique = [];
    ({ etat, historique } = jouer(etat, historique, { type: 'passer' }));
    const avant = etat;
    // On joue jusqu'au jour puis on élimine directement le siège 10.
    while (etapeSuivante(etat).type === 'reveil') ({ etat, historique } = jouer(etat, historique, { type: 'passer' }));
    ({ etat, historique } = jouer(etat, historique, { type: 'passer' })); // résolution
    ({ etat, historique } = jouer(etat, historique, { type: 'elire-alpha', cible: 3 }));
    ({ etat, historique } = jouer(etat, historique, { type: 'eliminer', cible: 10 }));
    expect(etat.joueurs[9].vivant).toBe(false);
    const retour = annuler(historique)!;
    expect(retour.etat.joueurs[9].vivant).toBe(true);
    expect(etapeSuivante(retour.etat)).toMatchObject({ type: 'vote' });
    expect(avant.joueurs[9].vivant).toBe(true);
  });

  it(`garde au plus ${LIMITE_HISTORIQUE} états`, () => {
    const etat = creerPartie(PLAN_COMPLET);
    let historique: Historique = [];
    for (let i = 0; i < LIMITE_HISTORIQUE + 20; i++) historique = memoriser(historique, etat);
    expect(historique).toHaveLength(LIMITE_HISTORIQUE);
  });
});
