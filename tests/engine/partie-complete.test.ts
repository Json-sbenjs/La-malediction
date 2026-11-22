// ★ JALON semaine 3 : une partie complète, de la mise en place à la victoire.
import { describe, expect, it } from 'vitest';
import { appliquer, creerPartie, etapeSuivante } from '../../src/engine';
import { PLAN_COMPLET, planDeTest } from './aides';

describe('partie complète', () => {
  it('les Pèlerins gagnent en deux nuits', () => {
    const prenoms = ['Léa', 'Paul', 'Inès', 'Hugo', 'Max', 'Zoé', 'Lina', 'Noé', 'Tom', 'Emma', 'Jade', 'Louis'];
    let etat = creerPartie(PLAN_COMPLET, prenoms);

    // ── Nuit 1 ──────────────────────────────────────────
    expect(etapeSuivante(etat)).toMatchObject({ type: 'reveil', role: 'courtisane' });
    etat = appliquer(etat, { type: 'courtisane-occuper', cible: 10 });
    etat = appliquer(etat, { type: 'protecteur-proteger', cible: 3 });
    etat = appliquer(etat, { type: 'oracle-voir', cible: 5 });
    expect(etat.infoMJ).toBe('Max (siège 5) est Spectre');
    etat = appliquer(etat, { type: 'instinct-designer', cibles: [5, 10, 11] });
    expect(etat.infoMJ).toMatch(/garde/);
    expect(etapeSuivante(etat)).toMatchObject({ type: 'reveil', role: 'spectre', acteurs: [5, 6] });
    etat = appliquer(etat, { type: 'spectres-attaquer', cible: 12 });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'reveil', role: 'sainte', ciblesPossibles: [12] });
    etat = appliquer(etat, { type: 'sainte-sauver', utiliser: false });
    etat = appliquer(etat, { type: 'vipere-empoisonner', cible: null });
    expect(etapeSuivante(etat)).toEqual({ type: 'resolution-nuit', numero: 1, morts: [12] });
    etat = appliquer(etat, { type: 'passer' });
    expect(etat.infoMJ).toBe('Morts de la nuit : Louis (siège 12)');

    // ── Jour 1 ──────────────────────────────────────────
    etat = appliquer(etat, { type: 'elire-alpha', cible: 3 });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'vote', numero: 1, alpha: 3 });
    etat = appliquer(etat, { type: 'vote', votes: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 3, 6: 3, 7: 5 } });
    expect(etat.infoMJ).toBe('Le village élimine Max (siège 5)');

    // ── Nuit 2 ──────────────────────────────────────────
    expect(etat.phase).toEqual({ type: 'nuit', numero: 2, etape: 0 });
    etat = appliquer(etat, { type: 'courtisane-occuper', cible: 11 });
    etat = appliquer(etat, { type: 'protecteur-proteger', cible: 7 });
    etat = appliquer(etat, { type: 'oracle-voir', cible: 6 });
    etat = appliquer(etat, { type: 'instinct-designer', cibles: [6, 10, 11] });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'reveil', role: 'spectre', acteurs: [6] });
    etat = appliquer(etat, { type: 'spectres-attaquer', cible: 9 });
    etat = appliquer(etat, { type: 'sainte-sauver', utiliser: false });
    etat = appliquer(etat, { type: 'vipere-empoisonner', cible: 6 });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'resolution-nuit', morts: [9, 6] });
    etat = appliquer(etat, { type: 'passer' });

    // ── Matin 2 : la Main Noire tire, puis victoire ─────
    expect(etapeSuivante(etat)).toMatchObject({ type: 'decision', decision: { type: 'main-noire', tireur: 9 } });
    etat = appliquer(etat, { type: 'passer' });
    expect(etapeSuivante(etat)).toEqual({ type: 'fin', gagnants: 'pelerins' });
    expect(() => appliquer(etat, { type: 'passer' })).toThrow(/terminée/);
  });

  it('les Spectres gagnent quand tous les autres sont morts', () => {
    const plan = planDeTest(['spectre', 'spectre', 'oracle', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin']);
    let etat = creerPartie(plan);
    // Fin de partie : il ne reste que les 2 Spectres et le Pèlerin du siège 4.
    for (const j of etat.joueurs) j.vivant = [1, 2, 4].includes(j.id);
    etat = appliquer(etat, { type: 'spectres-attaquer', cible: 4 });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'resolution-nuit', morts: [4] });
    etat = appliquer(etat, { type: 'passer' });
    expect(etapeSuivante(etat)).toEqual({ type: 'fin', gagnants: 'spectres' });
  });
});
