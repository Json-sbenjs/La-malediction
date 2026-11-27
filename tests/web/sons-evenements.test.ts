// Quel son la partie fait entendre, et quand (src/web/sons-evenements.ts).
import { describe, expect, it } from 'vitest';
import { ROLES, appliquer, creerPartie, etapeSuivante, type Action, type EtatPartie, type RoleId } from '../../src/engine';
import { SONS } from '../../src/web/sons-catalogue';
import { ambianceDe, musiqueDe, sonDeFin, sonDeLEtape, sonsDebutPartie, sonsDuChangement } from '../../src/web/sons-evenements';
import { PLAN_COMPLET, jouerNuit, nouvellePartie, planDeTest } from '../engine/aides';

/** Applique l'action et renvoie le nouvel état avec la liste des sons, dans l'ordre. */
function jouer(etat: EtatPartie, action: Action): { etat: EtatPartie; sons: string[] } {
  const apres = appliquer(etat, action);
  return { etat: apres, sons: sonsDuChangement(etat, action, apres).map((s) => s.son) };
}

describe('sons de la partie', () => {
  it('chaque rôle a son son de réveil', () => {
    for (const role of Object.keys(ROLES) as RoleId[]) {
      expect(SONS[`role_${role}`], role).toBeDefined();
    }
  });

  it('le lancement fait sonner le gong, puis le premier rôle présenté', () => {
    const etat = creerPartie(PLAN_COMPLET);
    const lot = sonsDebutPartie(etat);
    expect(lot.map((s) => s.son)).toEqual(['tr_debut_partie', 'role_spectre']);
    expect(lot[1].delai).toBeGreaterThan(lot[0].delai);
  });

  it('chaque réveil de la nuit annonce le rôle suivant', () => {
    const etat = nouvellePartie(PLAN_COMPLET);
    const { sons } = jouer(etat, { type: 'courtisane-occuper', cible: 10 });
    expect(sons).toEqual(['role_protecteur']);
  });

  it("après l'Oracle : la révélation seulement (le rôle suivant attend la fin de la révélation)", () => {
    let etat = nouvellePartie(PLAN_COMPLET);
    etat = appliquer(etat, { type: 'courtisane-occuper', cible: 10 });
    etat = appliquer(etat, { type: 'protecteur-proteger', cible: 3 });
    expect(jouer(etat, { type: 'oracle-voir', cible: 5 }).sons).toEqual(['sfx_revelation']);
  });

  it("une info secrète pour le MJ fait un murmure (l'Instinct)", () => {
    let etat = nouvellePartie(PLAN_COMPLET);
    etat = appliquer(etat, { type: 'courtisane-occuper', cible: 10 });
    etat = appliquer(etat, { type: 'protecteur-proteger', cible: 3 });
    etat = appliquer(etat, { type: 'oracle-voir', cible: 5 });
    expect(jouer(etat, { type: 'instinct-designer', cibles: [5, 10, 11] }).sons).toEqual(['sfx_murmure', 'role_spectre']);
  });

  it('fin de nuit avec un mort : le village se réveille, puis le glas, puis l’élection', () => {
    const etat = jouerNuit(nouvellePartie(PLAN_COMPLET), { spectre: { type: 'spectres-attaquer', cible: 12 } });
    expect(jouer(etat, { type: 'passer' }).sons).toEqual(['tr_jour_se_leve', 'sfx_glas', 'role_alpha']);
  });

  it('fin de nuit sans mort : un accord apaisé', () => {
    const etat = jouerNuit(nouvellePartie(PLAN_COMPLET), { spectre: { type: 'spectres-attaquer', cible: null } });
    expect(jouer(etat, { type: 'passer' }).sons).toEqual(['tr_jour_se_leve', 'sfx_nuit_calme', 'role_alpha']);
  });

  it("l'élection de l'Alpha sonne la fanfare", () => {
    const etat = appliquer(jouerNuit(nouvellePartie(PLAN_COMPLET)), { type: 'passer' });
    expect(jouer(etat, { type: 'elire-alpha', cible: 3 }).sons).toEqual(['sfx_couronne']);
  });

  it('le vote qui condamne : verdict, mort, puis la nuit tombe', () => {
    let etat = appliquer(jouerNuit(nouvellePartie(PLAN_COMPLET)), { type: 'passer' });
    etat = appliquer(etat, { type: 'elire-alpha', cible: 3 });
    const { sons } = jouer(etat, { type: 'vote', votes: { 1: 10, 2: 10, 3: 10 } });
    expect(sons).toEqual(['sfx_verdict', 'sfx_mort', 'tr_nuit_tombe', 'role_courtisane']);
  });

  it('personne n’est éliminé : un coup sourd, puis la nuit', () => {
    let etat = appliquer(jouerNuit(nouvellePartie(PLAN_COMPLET)), { type: 'passer' });
    etat = appliquer(etat, { type: 'elire-alpha', cible: 3 });
    expect(jouer(etat, { type: 'passer' }).sons).toEqual(['sfx_aucun_elimine', 'tr_nuit_tombe', 'role_courtisane']);
  });

  it('la mort de la Main Noire appelle son réveil', () => {
    const etat = jouerNuit(nouvellePartie(PLAN_COMPLET), { spectre: { type: 'spectres-attaquer', cible: 9 } });
    const { sons } = jouer(etat, { type: 'passer' });
    expect(sons).toEqual(['tr_jour_se_leve', 'sfx_glas', 'role_main-noire']);
  });

  it('la victoire des Spectres a son propre son', () => {
    const plan = planDeTest(['spectre', 'spectre', 'oracle', 'pelerin', 'pelerin', 'pelerin', 'pelerin', 'pelerin']);
    let etat = nouvellePartie(plan);
    for (const j of etat.joueurs) j.vivant = [1, 2, 4].includes(j.id);
    etat = jouerNuit(etat, { spectre: { type: 'spectres-attaquer', cible: 4 } });
    const { etat: fin, sons } = jouer(etat, { type: 'passer' });
    expect(etapeSuivante(fin)).toEqual({ type: 'fin', gagnants: 'spectres' });
    expect(sons).toEqual(['sfx_glas', 'fin_spectres']);
  });

  it('sons de fin selon les gagnants', () => {
    expect(sonDeFin('pelerins')).toBe('fin_pelerins');
    expect(sonDeFin('spectres')).toBe('fin_spectres');
    expect(sonDeFin('sectaire')).toBe('fin_solitaire');
    expect(sonDeFin('trinite')).toBe('fin_solitaire');
    expect(sonDeFin(null)).toBe('fin_personne');
  });

  it('les décisions liées aux morts ont le son de leur rôle', () => {
    const decision = (type: 'usurpateur' | 'sacrifice' | 'bourreau' | 'alpha-successeur') =>
      sonDeLEtape({ type: 'decision', decision: { type, usurpateur: 1, mort: 2, sacrifie: 1, condamne: 2, bourreau: 1, numero: 1, ancien: 1 } as never, ciblesPossibles: [] });
    expect(decision('usurpateur')).toBe('role_usurpateur');
    expect(decision('sacrifice')).toBe('role_sacrifie');
    expect(decision('bourreau')).toBe('role_bourreau');
    expect(decision('alpha-successeur')).toBe('role_alpha');
  });

  it('ambiance : nuit pendant l’explication et les nuits, jour le jour, rien hors partie', () => {
    const etat = creerPartie(PLAN_COMPLET);
    expect(ambianceDe(null)).toBeNull();
    expect(ambianceDe(etat)).toBe('amb_nuit');
    const jour = appliquer(jouerNuit(nouvellePartie(PLAN_COMPLET)), { type: 'passer' });
    expect(ambianceDe(jour)).toBe('amb_jour');
    expect(ambianceDe({ ...jour, phase: { type: 'fin', gagnants: 'pelerins' } })).toBeNull();
  });

  it('musique : hors partie et la nuit, pas le jour ni à la fin', () => {
    expect(musiqueDe(null)).toBe(true);
    expect(musiqueDe(creerPartie(PLAN_COMPLET))).toBe(true);
    expect(musiqueDe(nouvellePartie(PLAN_COMPLET))).toBe(true);
    const jour = appliquer(jouerNuit(nouvellePartie(PLAN_COMPLET)), { type: 'passer' });
    expect(musiqueDe(jour)).toBe(false);
    expect(musiqueDe({ ...jour, phase: { type: 'fin', gagnants: 'pelerins' } })).toBe(false);
  });
});
