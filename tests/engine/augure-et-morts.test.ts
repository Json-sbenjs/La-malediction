// Deux règles ajoutées le 24/11 (docs/deroule-partie.md) : l'Augure vue par les Spectres, et le vote des morts.
import { describe, expect, it } from 'vitest';
import { appliquer, compterVotes, etapeSuivante, type EtatPartie, type RoleId } from '../../src/engine';
import { finirNuit, jouerJusquA, nouvellePartie, planDeTest } from './aides';

const pelerins = (n: number): RoleId[] => Array.from({ length: n }, () => 'pelerin');

describe('Augure', () => {
  // 1 Augure, 2-3 Spectres, 4 Protecteur, 5 Sainte, 6-10 Pèlerins
  const PLAN = planDeTest(['augure', 'spectre', 'spectre', 'protecteur', 'sainte', ...pelerins(5)]);

  it('après les Spectres, le MJ dit si elle a été vue', () => {
    const etat = jouerJusquA(nouvellePartie(PLAN), 'augure', { spectre: { type: 'spectres-attaquer', cible: 6 } });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'reveil', role: 'augure', acteurs: [1], ciblesPossibles: [] });
  });

  it('vue : elle meurt au matin, en plus de la victime', () => {
    const etat = finirNuit(nouvellePartie(PLAN), {
      spectre: { type: 'spectres-attaquer', cible: 6 },
      augure: { type: 'augure-vue', vue: true },
    });
    expect(etat.joueurs[0].vivant).toBe(false);
    expect(etat.joueurs[5].vivant).toBe(false);
  });

  it('vue : ni le Protecteur ni la Sainte ne la sauvent', () => {
    let etat = jouerJusquA(nouvellePartie(PLAN), 'sainte', {
      protecteur: { type: 'protecteur-proteger', cible: 1 },
      spectre: { type: 'spectres-attaquer', cible: 1 },
      augure: { type: 'augure-vue', vue: true },
    });
    etat = appliquer(etat, { type: 'sainte-sauver', utiliser: true });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'resolution-nuit', morts: [1] });
  });

  it('pas vue : il ne se passe rien', () => {
    const etat = finirNuit(nouvellePartie(PLAN), { augure: { type: 'augure-vue', vue: false } });
    expect(etat.joueurs[0].vivant).toBe(true);
  });

  it("Spectres endormis par l'Enchanteur : rien à espionner, pas de question", () => {
    const plan = planDeTest(['augure', 'spectre', 'spectre', 'enchanteur', ...pelerins(6)]);
    const etat = jouerJusquA(nouvellePartie(plan), 'augure', {
      enchanteur: { type: 'enchanteur-enchanter', utiliser: true },
    });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'resolution-nuit', morts: [] });
  });
});

describe('vote des morts (jours pairs)', () => {
  // 1-2 Spectres, 3-10 : Oracle, Protecteur et 6 Pèlerins
  const PLAN = planDeTest(['spectre', 'spectre', 'oracle', 'protecteur', ...pelerins(6)]);

  /** Jour 1 avec un mort la nuit (siège 10), vote rapide contre le siège 9, puis nuit 2 sans mort : jour 2. */
  function auJour2(): EtatPartie {
    let etat = finirNuit(nouvellePartie(PLAN, [], { alpha: 3 }), { spectre: { type: 'spectres-attaquer', cible: 10 } });
    etat = appliquer(etat, { type: 'eliminer', cible: 9 });
    return finirNuit(etat);
  }

  it("le jour 1 (impair), pas de question : on vote directement, sans les morts", () => {
    const etat = finirNuit(nouvellePartie(PLAN, [], { alpha: 3 }), { spectre: { type: 'spectres-attaquer', cible: 10 } });
    const etape = etapeSuivante(etat);
    expect(etape).toMatchObject({ type: 'vote', numero: 1 });
    if (etape.type === 'vote') expect(etape.votants).not.toContain(10);
  });

  it('le jour 2 (pair), le MJ choisit pour tous les morts avant le vote', () => {
    expect(etapeSuivante(auJour2())).toEqual({ type: 'morts-du-jour', numero: 2, morts: [9, 10] });
    expect(() => appliquer(auJour2(), { type: 'eliminer', cible: 5 })).toThrow(/morts parlent ou votent/);
  });

  it('« voter » : les morts votent (1 voix chacun), contre un vivant seulement', () => {
    const etat = appliquer(auJour2(), { type: 'morts-du-jour', choix: 'voter' });
    expect(etat.infoMJ).toBe("Aujourd'hui, les morts votent (1 voix chacun) et se taisent");
    const etape = etapeSuivante(etat);
    expect(etape).toMatchObject({ type: 'vote', numero: 2 });
    if (etape.type === 'vote') {
      expect(etape.votants).toEqual(expect.arrayContaining([9, 10]));
      expect(etape.ciblesPossibles).not.toContain(9);
    }
    // 2 morts + 1 vivant contre le siège 5, l'Alpha (2 voix) contre le siège 6 : le siège 5 part.
    expect(compterVotes(etat, { 9: 5, 10: 5, 4: 5, 3: 6 })).toEqual({ compte: { 5: 3, 6: 2 }, elimine: 5 });
    expect(() => compterVotes(etat, { 4: 10 })).toThrow(/ne peut pas viser/);
  });

  it('« parler » : les morts ne votent pas', () => {
    const etat = appliquer(auJour2(), { type: 'morts-du-jour', choix: 'parler' });
    const etape = etapeSuivante(etat);
    if (etape.type === 'vote') expect(etape.votants).not.toContain(10);
    expect(() => compterVotes(etat, { 10: 5 })).toThrow(/ne peut pas voter/);
  });

  it('le choix vaut pour la journée, puis repart à zéro la nuit', () => {
    let etat = appliquer(auJour2(), { type: 'morts-du-jour', choix: 'voter' });
    etat = appliquer(etat, { type: 'passer' });
    expect(etat.voteDesMorts).toBeNull();
    expect(etat.phase).toMatchObject({ type: 'nuit', numero: 3 });
  });

  it('jour pair sans aucun mort : pas de question', () => {
    let etat = finirNuit(nouvellePartie(PLAN, [], { alpha: 3 }));
    etat = finirNuit(appliquer(etat, { type: 'passer' }));
    expect(etapeSuivante(etat)).toMatchObject({ type: 'vote', numero: 2 });
  });
});
