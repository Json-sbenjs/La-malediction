import { describe, expect, it } from 'vitest';
import { appliquer, creerPartie, etapeSuivante } from '../../src/engine';
import { PLAN_COMPLET, finirNuit, jouerJusquA, jouerNuit } from './aides';

const partie = () => creerPartie(PLAN_COMPLET);

describe('résolution de la nuit', () => {
  it('la victime des Spectres meurt', () => {
    const etat = finirNuit(partie(), { spectre: { type: 'spectres-attaquer', cible: 10 } });
    expect(etat.joueurs[9].vivant).toBe(false);
    expect(etat.joueurs[9].revele).toBe(true);
    expect(etat.phase).toEqual({ type: 'jour', numero: 1 });
    expect(etat.infoMJ).toBe('Morts de la nuit : siège 10');
  });

  it("le MJ voit les morts avant de valider", () => {
    const etat = jouerNuit(partie(), { spectre: { type: 'spectres-attaquer', cible: 10 } });
    expect(etapeSuivante(etat)).toEqual({ type: 'resolution-nuit', numero: 1, morts: [10] });
  });

  it('le Protecteur bloque l\'attaque', () => {
    const etat = finirNuit(partie(), {
      protecteur: { type: 'protecteur-proteger', cible: 10 },
      spectre: { type: 'spectres-attaquer', cible: 10 },
    });
    expect(etat.joueurs[9].vivant).toBe(true);
    expect(etat.infoMJ).toBe("Personne n'est mort cette nuit");
  });

  it('la Sainte sauve la victime, une seule fois', () => {
    let etat = finirNuit(partie(), {
      spectre: { type: 'spectres-attaquer', cible: 10 },
      sainte: { type: 'sainte-sauver', utiliser: true },
    });
    expect(etat.joueurs[9].vivant).toBe(true);
    expect(etat.joueurs[6].memoire.pouvoirUtilise).toBe(true);

    etat = appliquer(etat, { type: 'elire-alpha', cible: 3 });
    etat = appliquer(etat, { type: 'passer' }); // pas de vote
    etat = jouerNuit(etat, { spectre: { type: 'spectres-attaquer', cible: 11 } });
    // La Sainte n'a plus de potion : elle n'est pas réveillée.
    expect(etapeSuivante(etat)).toMatchObject({ type: 'resolution-nuit', morts: [11] });
  });

  it('la Sainte ne voit que la victime, et ne peut rien faire sans victime', () => {
    const avecVictime = jouerJusquA(partie(), 'sainte', { spectre: { type: 'spectres-attaquer', cible: 10 } });
    expect(etapeSuivante(avecVictime)).toMatchObject({ role: 'sainte', ciblesPossibles: [10] });

    const sansVictime = jouerJusquA(partie(), 'sainte', { spectre: { type: 'spectres-attaquer', cible: null } });
    expect(etapeSuivante(sansVictime)).toMatchObject({ role: 'sainte', ciblesPossibles: [] });
    expect(() => appliquer(sansVictime, { type: 'sainte-sauver', utiliser: true })).toThrow(/Pas de victime/);
  });

  it('le poison de la Vipère tue, même un joueur protégé', () => {
    const etat = finirNuit(partie(), {
      protecteur: { type: 'protecteur-proteger', cible: 11 },
      vipere: { type: 'vipere-empoisonner', cible: 11 },
    });
    expect(etat.joueurs[10].vivant).toBe(false);
    expect(etat.joueurs[7].memoire.pouvoirUtilise).toBe(true);
  });

  it('victime et empoisonné : deux morts', () => {
    const etat = finirNuit(partie(), {
      spectre: { type: 'spectres-attaquer', cible: 10 },
      vipere: { type: 'vipere-empoisonner', cible: 11 },
    });
    expect(etat.joueurs.filter((j) => !j.vivant).map((j) => j.id)).toEqual([10, 11]);
  });

  it('victime empoisonnée en plus : une seule mort', () => {
    const etat = jouerNuit(partie(), {
      spectre: { type: 'spectres-attaquer', cible: 10 },
      vipere: { type: 'vipere-empoisonner', cible: 10 },
    });
    expect(etapeSuivante(etat)).toMatchObject({ morts: [10] });
  });
});
