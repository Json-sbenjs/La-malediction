import { describe, expect, it } from 'vitest';
import { appliquer, etapeSuivante, type Etape, type EtatPartie } from '../../src/engine';
import { debutDeNuit, ordreDeNuit } from '../../src/engine/nuit';
import { PLAN_NUIT, nouvellePartie, planDeTest } from './aides';

function reveil(etat: EtatPartie): Extract<Etape, { type: 'reveil' }> {
  const etape = etapeSuivante(etat);
  if (etape.type !== 'reveil') throw new Error(`attendu un réveil, reçu ${etape.type}`);
  return etape;
}

describe('ordre de réveil', () => {
  it('seulement les rôles présents, dans le bon ordre', () => {
    const etat = nouvellePartie(PLAN_NUIT);
    expect(ordreDeNuit(etat, 2)).toEqual(['courtisane', 'protecteur', 'oracle', 'instinct', 'spectre']);
  });

  it("la nuit 1 est une nuit normale : les reconnaissances ont eu lieu pendant l'explication", () => {
    const plan = planDeTest(['trinite', 'trinite', 'trinite', 'spectre', 'spectre', 'oracle', 'pelerin', 'pelerin']);
    expect(ordreDeNuit(nouvellePartie(plan), 1)).toEqual(['oracle', 'spectre']);
  });

  it('la première étape réveille la Courtisane', () => {
    const etape = reveil(nouvellePartie(PLAN_NUIT));
    expect(etape.role).toBe('courtisane');
    expect(etape.acteurs).toEqual([1]);
    expect(etape.ciblesPossibles).not.toContain(1);
  });
});

describe('« si en vie » / « si occupé »', () => {
  it('un rôle mort est sauté', () => {
    let etat = nouvellePartie(PLAN_NUIT);
    etat.joueurs[0].vivant = false; // Courtisane morte
    expect(reveil(etat).role).toBe('protecteur');
  });

  it('un rôle occupé par la Courtisane est sauté', () => {
    let etat = nouvellePartie(PLAN_NUIT);
    etat = appliquer(etat, { type: 'courtisane-occuper', cible: 2 }); // occupe le Protecteur
    expect(reveil(etat).role).toBe('oracle');
  });

  it("un Spectre occupé ne participe pas à l'attaque", () => {
    let etat = nouvellePartie(PLAN_NUIT);
    etat = appliquer(etat, { type: 'courtisane-occuper', cible: 5 });
    etat = appliquer(etat, { type: 'passer' }); // Protecteur
    etat = appliquer(etat, { type: 'passer' }); // Oracle
    etat = appliquer(etat, { type: 'passer' }); // Instinct
    const etape = reveil(etat);
    expect(etape.role).toBe('spectre');
    expect(etape.acteurs).toEqual([6]);
  });

  it("si le seul Spectre est occupé, il n'y a pas d'attaque", () => {
    const plan = planDeTest(['courtisane', 'spectre', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin']);
    let etat = nouvellePartie(plan);
    etat = appliquer(etat, { type: 'courtisane-occuper', cible: 2 });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'resolution-nuit', numero: 1 });
  });
});

describe('rôles de nuit', () => {
  it('le Protecteur protège', () => {
    let etat = nouvellePartie(PLAN_NUIT);
    etat = appliquer(etat, { type: 'passer' });
    etat = appliquer(etat, { type: 'protecteur-proteger', cible: 7 });
    expect(etat.joueurs[6].statuts.protege).toBe(true);
  });

  it('le Protecteur ne protège pas deux nuits de suite la même personne', () => {
    let etat = nouvellePartie(PLAN_NUIT);
    etat = appliquer(etat, { type: 'passer' });
    etat = appliquer(etat, { type: 'protecteur-proteger', cible: 7 });
    etat = debutDeNuit(etat, 2);
    etat = appliquer(etat, { type: 'passer' });
    expect(reveil(etat).ciblesPossibles).not.toContain(7);
    expect(() => appliquer(etat, { type: 'protecteur-proteger', cible: 7 })).toThrow();
    // Deux nuits plus tard, c'est de nouveau permis.
    etat = appliquer(etat, { type: 'protecteur-proteger', cible: 8 });
    etat = debutDeNuit(etat, 3);
    etat = appliquer(etat, { type: 'passer' });
    expect(reveil(etat).ciblesPossibles).toContain(7);
  });

  it('la Courtisane ne vise pas deux nuits de suite la même personne', () => {
    let etat = nouvellePartie(PLAN_NUIT);
    etat = appliquer(etat, { type: 'courtisane-occuper', cible: 7 });
    etat = debutDeNuit(etat, 2);
    expect(reveil(etat).ciblesPossibles).not.toContain(7);
  });

  it("l'Oracle voit le bon rôle", () => {
    let etat = nouvellePartie(PLAN_NUIT, [null, null, null, null, 'Max']);
    etat = appliquer(etat, { type: 'passer' });
    etat = appliquer(etat, { type: 'passer' });
    etat = appliquer(etat, { type: 'oracle-voir', cible: 5 });
    expect(etat.infoMJ).toBe('Max (siège 5) est Spectre');
  });

  it("l'Instinct garde son pouvoir s'il trouve un Spectre", () => {
    let etat = nouvellePartie(PLAN_NUIT);
    for (let i = 0; i < 3; i++) etat = appliquer(etat, { type: 'passer' });
    etat = appliquer(etat, { type: 'instinct-designer', cibles: [5, 7, 8] });
    expect(etat.joueurs[3].memoire.pouvoirPerdu).toBe(false);
    expect(etat.infoMJ).toMatch(/garde/);
  });

  it("l'Instinct perd son pouvoir sinon, et n'est plus réveillé", () => {
    let etat = nouvellePartie(PLAN_NUIT);
    for (let i = 0; i < 3; i++) etat = appliquer(etat, { type: 'passer' });
    etat = appliquer(etat, { type: 'instinct-designer', cibles: [7, 8, 9] });
    expect(etat.joueurs[3].memoire.pouvoirPerdu).toBe(true);
    etat = debutDeNuit(etat, 2);
    for (let i = 0; i < 3; i++) etat = appliquer(etat, { type: 'passer' });
    expect(reveil(etat).role).toBe('spectre');
  });

  it("l'Instinct doit désigner 3 joueurs différents", () => {
    let etat = nouvellePartie(PLAN_NUIT);
    for (let i = 0; i < 3; i++) etat = appliquer(etat, { type: 'passer' });
    expect(() => appliquer(etat, { type: 'instinct-designer', cibles: [7, 7, 8] })).toThrow(/différents/);
  });

  it('les Spectres désignent leur victime, pas un autre Spectre', () => {
    let etat = nouvellePartie(PLAN_NUIT);
    for (let i = 0; i < 4; i++) etat = appliquer(etat, { type: 'passer' });
    expect(reveil(etat).ciblesPossibles).not.toContain(6);
    expect(() => appliquer(etat, { type: 'spectres-attaquer', cible: 6 })).toThrow();
    etat = appliquer(etat, { type: 'spectres-attaquer', cible: 9 });
    expect(etat.victimeSpectres).toBe(9);
    expect(etapeSuivante(etat)).toMatchObject({ type: 'resolution-nuit', numero: 1 });
  });

  it("refuse l'action d'un autre rôle que celui réveillé", () => {
    const etat = nouvellePartie(PLAN_NUIT);
    expect(() => appliquer(etat, { type: 'oracle-voir', cible: 5 })).toThrow(/Courtisane/);
  });

  it("ne modifie pas l'état d'origine", () => {
    const etat = nouvellePartie(PLAN_NUIT);
    appliquer(etat, { type: 'courtisane-occuper', cible: 7 });
    expect(etat.joueurs[6].statuts.occupe).toBe(false);
    expect(etat.phase).toEqual({ type: 'nuit', numero: 1, etape: 0 });
  });

  it('debutDeNuit efface les statuts de la nuit précédente', () => {
    let etat = nouvellePartie(PLAN_NUIT);
    etat = appliquer(etat, { type: 'courtisane-occuper', cible: 7 });
    etat = debutDeNuit(etat, 2);
    expect(etat.joueurs[6].statuts.occupe).toBe(false);
    expect(etat.phase).toEqual({ type: 'nuit', numero: 2, etape: 0 });
  });
});
