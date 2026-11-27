import { describe, expect, it } from 'vitest';
import { genererPlan, compositionConseillee, deplacerSiege, type Forme } from '../../src/engine/generateur';
import { PARAM_PARTAGE, decoderPlan, encoderPlan } from '../../src/engine/partage';

function graine(n: number): () => number {
  let x = n;
  return () => {
    x = (x * 1103515245 + 12345) % 2 ** 31;
    return x / 2 ** 31;
  };
}

function salle(nb: number, nom = 'Salle des fêtes', forme: Forme = 'ovale') {
  return genererPlan({ salle: nom, forme, composition: compositionConseillee(nb), alea: graine(nb) });
}

describe('partage d’une salle (QR code)', () => {
  it.each([8, 16, 25])('aller-retour à %i joueurs : même plan', (nb) => {
    const plan = salle(nb);
    expect(decoderPlan(encoderPlan(plan))).toEqual(plan);
  });

  it('garde les accents du nom de la salle', () => {
    const plan = salle(10, 'Salle Malédiction — étage');
    expect(decoderPlan(encoderPlan(plan)).salle).toBe('Salle Malédiction — étage');
  });

  it('garde un siège déplacé à la main', () => {
    const plan = deplacerSiege(salle(16), 4, { x: 12.3, y: 87.6 });
    expect(decoderPlan(encoderPlan(plan)).sieges[3].position).toEqual({ x: 12.3, y: 87.6 });
  });

  it('accepte le lien complet de partage', () => {
    const plan = salle(12);
    const lien = `https://json-sbenjs.github.io/La-malediction/#${PARAM_PARTAGE}=${encoderPlan(plan)}`;
    expect(decoderPlan(lien)).toEqual(plan);
  });

  it('le code ne contient que des caractères sûrs dans un lien', () => {
    expect(encoderPlan(salle(25))).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('reste assez court pour un QR code lisible, même à 25 joueurs', () => {
    expect(encoderPlan(salle(25)).length).toBeLessThan(1000);
  });

  it('refuse un code abîmé avec un message clair', () => {
    expect(() => decoderPlan('nimportequoi')).toThrow("Ce code n'est pas une salle de la Malédiction");
    const code = encoderPlan(salle(10));
    expect(() => decoderPlan(code.slice(0, 30))).toThrow();
  });

  it('refuse une salle qui ne respecte pas les règles des plans', () => {
    const faux = btoa(JSON.stringify({ v: 1, s: 'X', r: ['pelerin', 'pelerin'], p: [0, 0, 10, 10] }))
      .replace(/=+$/, '');
    expect(() => decoderPlan(faux)).toThrow('Salle partagée invalide');
  });

  it('refuse un rôle inconnu', () => {
    const faux = btoa(JSON.stringify({ v: 1, s: 'X', r: ['dragon'], p: [0, 0] })).replace(/=+$/, '');
    expect(() => decoderPlan(faux)).toThrow('Rôle inconnu');
  });
});

describe('déplacer un siège', () => {
  it('change seulement la position du siège visé', () => {
    const plan = salle(16);
    const deplace = deplacerSiege(plan, 5, { x: 40, y: 60 });
    expect(deplace.sieges[4].position).toEqual({ x: 40, y: 60 });
    expect(deplace.sieges[4].role).toBe(plan.sieges[4].role);
    expect(deplace.sieges.filter((_, i) => i !== 4)).toEqual(plan.sieges.filter((_, i) => i !== 4));
    expect(plan.sieges[4].position).not.toEqual({ x: 40, y: 60 }); // l'ancien plan n'est pas modifié
  });

  it('garde le siège dans le plan et arrondit au dixième', () => {
    const plan = deplacerSiege(salle(10), 1, { x: -20, y: 133.456 });
    expect(plan.sieges[0].position).toEqual({ x: 0, y: 100 });
    expect(deplacerSiege(plan, 1, { x: 33.333, y: 66.666 }).sieges[0].position).toEqual({ x: 33.3, y: 66.7 });
  });

  it('refuse un siège qui n’existe pas', () => {
    expect(() => deplacerSiege(salle(10), 11, { x: 1, y: 1 })).toThrow('Siège inconnu');
  });

  it('un nouveau tirage garde les positions placées à la main', () => {
    const plan = deplacerSiege(salle(16), 2, { x: 5, y: 5 });
    const positions = plan.sieges.map((s) => s.position);
    const nouveau = genererPlan({
      salle: 'Salle des fêtes', forme: 'ovale', composition: compositionConseillee(16), alea: graine(99), positions,
    });
    expect(nouveau.sieges.map((s) => s.position)).toEqual(positions);
  });

  it('si le nombre de sièges change, on repart de la forme', () => {
    const positions = salle(16).sieges.map((s) => s.position);
    const nouveau = genererPlan({ salle: 'S', forme: 'ovale', composition: compositionConseillee(17), positions });
    expect(nouveau.sieges).toHaveLength(17);
    expect(nouveau.sieges.map((s) => s.position)).not.toEqual(positions);
  });
});
