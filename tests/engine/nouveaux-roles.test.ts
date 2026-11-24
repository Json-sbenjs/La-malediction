// Les 14 rôles ajoutés après la deadline : un ou plusieurs scénarios par rôle.
import { describe, expect, it } from 'vitest';
import { appliquer, creerPartie, etapeSuivante, type EtatPartie, type RoleId } from '../../src/engine';
import { verifierVictoire } from '../../src/engine/victoire';
import { finirNuit, jouerJusquA, jouerNuit, planDeTest } from './aides';

const pelerins = (n: number): RoleId[] => Array.from({ length: n }, () => 'pelerin');
/** Une partie sur un plan : siège 1, 2, 3… dans l'ordre des rôles donnés. */
const partie = (roles: RoleId[]) => creerPartie(planDeTest(roles));
/** Passe au jour (Alpha élu au siège donné) puis applique un vote rapide. */
function auVote(etat: EtatPartie, alpha: number): EtatPartie {
  return appliquer(etat, { type: 'elire-alpha', cible: alpha });
}

describe('Dévoué', () => {
  it('révélé à tous dès le début', () => {
    const etat = partie(['devoue', 'spectre', ...pelerins(6)]);
    expect(etat.joueurs[0].revele).toBe(true);
    expect(etat.infoMJ).toBe('Annonce à tous : siège 1 est le Dévoué');
  });
});

describe('Augure', () => {
  it("ne se réveille pas : il espionne pendant le réveil des Spectres", () => {
    const etat = partie(['augure', 'spectre', ...pelerins(6)]);
    expect(etapeSuivante(etat)).toMatchObject({ type: 'reveil', role: 'spectre' });
  });
});

describe('Inquisiteur', () => {
  const ROLES: RoleId[] = ['inquisiteur', 'spectre', ...pelerins(6)];

  it('marque un joueur : une voix contre lui au vote', () => {
    let etat = finirNuit(partie(ROLES), { inquisiteur: { type: 'inquisiteur-marquer', cible: 5 } });
    expect(etat.marque).toBe(5);
    etat = auVote(etat, 3);
    // 1 voix (marque) + 1 (siège 4) contre 5 ; 1 voix contre 6 → 5 est éliminé.
    etat = appliquer(etat, { type: 'vote', votes: { 4: 5, 7: 6 } });
    expect(etat.joueurs[4].vivant).toBe(false);
  });

  it('sans aucun vote, le marqué part quand même avec sa voix', () => {
    let etat = finirNuit(partie(ROLES), { inquisiteur: { type: 'inquisiteur-marquer', cible: 5 } });
    etat = appliquer(auVote(etat, 3), { type: 'vote', votes: {} });
    expect(etat.joueurs[4].vivant).toBe(false);
  });

  it('ne peut pas se marquer lui-même', () => {
    const etat = jouerJusquA(partie(ROLES), 'inquisiteur');
    expect(() => appliquer(etat, { type: 'inquisiteur-marquer', cible: 1 })).toThrow();
  });
});

describe('Médium', () => {
  it("ne se réveille que s'il y a un mort", () => {
    const etat = partie(['medium', 'spectre', ...pelerins(6)]);
    expect(etapeSuivante(etat)).toMatchObject({ role: 'spectre' });
    etat.joueurs[4].vivant = false;
    expect(etapeSuivante(etat)).toMatchObject({ role: 'medium', ciblesPossibles: [] });
  });
});

describe('Enchanteur', () => {
  const ROLES: RoleId[] = ['enchanteur', 'spectre', 'spectre', ...pelerins(5)];

  it('endort les Spectres : personne ne meurt, une seule fois', () => {
    let etat = jouerNuit(partie(ROLES), { enchanteur: { type: 'enchanteur-enchanter', utiliser: true } });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'resolution-nuit', morts: [] });
    etat = appliquer(etat, { type: 'passer' });
    etat = appliquer(auVote(etat, 4), { type: 'passer' });
    // Nuit 2 : pouvoir utilisé, il ne se réveille plus ; les Spectres si.
    expect(etapeSuivante(etat)).toMatchObject({ role: 'spectre' });
  });

  it("s'il ne l'utilise pas, les Spectres se réveillent", () => {
    const etat = jouerJusquA(partie(ROLES), 'spectre', {
      enchanteur: { type: 'enchanteur-enchanter', utiliser: false },
    });
    expect(etapeSuivante(etat)).toMatchObject({ role: 'spectre', acteurs: [2, 3] });
  });
});

describe('Originel', () => {
  const ROLES: RoleId[] = ['originel', 'spectre', 'protecteur', 'sainte', ...pelerins(4)];

  it('transforme la victime en Spectre au lieu de la tuer', () => {
    let etat = jouerJusquA(partie(ROLES), 'originel', { spectre: { type: 'spectres-attaquer', cible: 5 } });
    expect(etapeSuivante(etat)).toMatchObject({ role: 'originel', ciblesPossibles: [5] });
    etat = appliquer(etat, { type: 'originel-infecter', utiliser: true });
    // La Sainte n'a plus de victime à sauver.
    expect(etapeSuivante(etat)).toMatchObject({ role: 'sainte', ciblesPossibles: [] });
    etat = appliquer(appliquer(etat, { type: 'sainte-sauver', utiliser: false }), { type: 'passer' });
    expect(etat.joueurs[4]).toMatchObject({ vivant: true, camp: 'spectres', role: 'pelerin' });
    expect(etat.infoMJ).toMatch(/En secret : siège 5 est devenu Spectre/);
  });

  it("l'Originel est un Spectre : il se réveille avec eux", () => {
    expect(etapeSuivante(partie(ROLES))).toMatchObject({ role: 'protecteur' });
    const etat = jouerJusquA(partie(ROLES), 'spectre');
    expect(etapeSuivante(etat)).toMatchObject({ acteurs: [1, 2] });
  });

  it('le Protecteur empêche la transformation', () => {
    const etat = finirNuit(partie(ROLES), {
      protecteur: { type: 'protecteur-proteger', cible: 5 },
      spectre: { type: 'spectres-attaquer', cible: 5 },
      originel: { type: 'originel-infecter', utiliser: true },
    });
    expect(etat.joueurs[4]).toMatchObject({ vivant: true, camp: 'pelerins' });
  });

  it('un plan avec seulement l\'Originel comme Spectre est valide', () => {
    expect(() => partie(['originel', 'oracle', ...pelerins(6)])).not.toThrow();
  });
});

describe('Maudit', () => {
  const ROLES: RoleId[] = ['maudit', 'spectre', 'spectre', ...pelerins(5)];

  it('se réveille avec les Spectres, qui ne peuvent pas le viser', () => {
    const etape = etapeSuivante(partie(ROLES));
    expect(etape).toMatchObject({ role: 'spectre', acteurs: [1, 2, 3] });
    if (etape.type === 'reveil') expect(etape.ciblesPossibles).not.toContain(1);
  });

  it('ne dévore pas la nuit 1, mais la nuit 2', () => {
    let etat = jouerNuit(partie(ROLES));
    expect(etapeSuivante(etat)).toMatchObject({ type: 'resolution-nuit' });
    etat = appliquer(auVote(appliquer(etat, { type: 'passer' }), 4), { type: 'passer' });
    etat = jouerJusquA(etat, 'maudit');
    expect(etapeSuivante(etat)).toMatchObject({ role: 'maudit', ciblesPossibles: [2, 3] });
    etat = appliquer(etat, { type: 'maudit-devorer', cible: 2 });
    etat = appliquer(etat, { type: 'passer' });
    expect(etat.joueurs[1].vivant).toBe(false);
  });

  it('gagne seul, et empêche les Spectres de gagner', () => {
    const etat = partie(ROLES);
    for (const j of etat.joueurs) j.vivant = [1, 2].includes(j.id);
    expect(verifierVictoire(etat)).toBeNull();
    etat.joueurs[1].vivant = false;
    expect(verifierVictoire(etat)).toEqual({ gagnants: 'maudit' });
  });
});

describe('Sacrifié', () => {
  const ROLES: RoleId[] = ['sacrifie', 'spectre', 'spectre', ...pelerins(5)];

  it('meurt à la place du condamné, en révélant son rôle', () => {
    let etat = auVote(finirNuit(partie(ROLES)), 4);
    etat = appliquer(etat, { type: 'eliminer', cible: 5 });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'decision', decision: { type: 'sacrifice', sacrifie: 1, condamne: 5 } });
    etat = appliquer(etat, { type: 'sacrifice', accepter: true });
    expect(etat.joueurs[0]).toMatchObject({ vivant: false, revele: true });
    expect(etat.joueurs[4].vivant).toBe(true);
    expect(etat.phase).toMatchObject({ type: 'nuit', numero: 2 });
  });

  it("s'il ne se manifeste pas, le condamné meurt", () => {
    let etat = appliquer(auVote(finirNuit(partie(ROLES)), 4), { type: 'eliminer', cible: 5 });
    etat = appliquer(etat, { type: 'sacrifice', accepter: false });
    expect(etat.joueurs[4].vivant).toBe(false);
    expect(etat.joueurs[0].vivant).toBe(true);
  });

  it("on ne lui demande rien s'il est lui-même condamné", () => {
    const etat = appliquer(auVote(finirNuit(partie(ROLES)), 4), { type: 'eliminer', cible: 1 });
    expect(etat.joueurs[0].vivant).toBe(false);
    expect(etat.decisions).toEqual([]);
  });
});

describe('Bourreau', () => {
  const ROLES: RoleId[] = ['bourreau', 'spectre', 'spectre', ...pelerins(5)];

  it('déclenche un second vote le même jour, une seule fois', () => {
    let etat = appliquer(auVote(finirNuit(partie(ROLES)), 4), { type: 'eliminer', cible: 5 });
    expect(etat.joueurs[4].vivant).toBe(false);
    expect(etapeSuivante(etat)).toMatchObject({ type: 'decision', decision: { type: 'bourreau', bourreau: 1 } });
    etat = appliquer(etat, { type: 'second-vote', accepter: true });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'vote', numero: 1 });
    etat = appliquer(etat, { type: 'eliminer', cible: 6 });
    // Pouvoir utilisé : directement la nuit suivante.
    expect(etat.phase).toMatchObject({ type: 'nuit', numero: 2 });
    expect(etat.joueurs[5].vivant).toBe(false);
  });

  it("s'il refuse, la nuit commence", () => {
    let etat = appliquer(auVote(finirNuit(partie(ROLES)), 4), { type: 'passer' });
    etat = appliquer(etat, { type: 'second-vote', accepter: false });
    expect(etat.phase).toMatchObject({ type: 'nuit', numero: 2 });
  });

  it("si le Bourreau est éliminé au vote, pas de second vote", () => {
    const etat = appliquer(auVote(finirNuit(partie(ROLES)), 4), { type: 'eliminer', cible: 1 });
    expect(etat.decisions).toEqual([]);
    expect(etat.phase).toMatchObject({ type: 'nuit', numero: 2 });
  });

  it('sa question passe après le tir de la Main Noire', () => {
    let etat = partie(['bourreau', 'spectre', 'main-noire', ...pelerins(5)]);
    etat = appliquer(auVote(finirNuit(etat), 4), { type: 'eliminer', cible: 3 });
    expect(etat.decisions.map((d) => d.type)).toEqual(['main-noire', 'bourreau']);
  });

  it('si le vote termine la partie, on ne lui demande rien', () => {
    let etat = partie(['bourreau', 'spectre', ...pelerins(6)]);
    etat = appliquer(auVote(finirNuit(etat), 4), { type: 'eliminer', cible: 2 });
    expect(etapeSuivante(etat)).toEqual({ type: 'fin', gagnants: 'pelerins' });
  });
});

describe('Doubles', () => {
  const ROLES: RoleId[] = ['doubles', 'doubles', 'spectre', ...pelerins(5)];

  it('se reconnaissent la première nuit', () => {
    let etat = partie(ROLES);
    expect(etapeSuivante(etat)).toMatchObject({ role: 'doubles', acteurs: [1, 2] });
    etat = appliquer(etat, { type: 'passer' });
    expect(etat.infoMJ).toBe('Doubles : siège 1, siège 2');
  });

  it('à la 1re mort, la survivante passe Pèlerins', () => {
    const etat = finirNuit(partie(ROLES), { spectre: { type: 'spectres-attaquer', cible: 1 } });
    expect(etat.joueurs[1].camp).toBe('pelerins');
  });

  it('gagnent seules si elles sont les 2 dernières', () => {
    const etat = partie(ROLES);
    for (const j of etat.joueurs) j.vivant = j.id <= 2;
    expect(verifierVictoire(etat)).toEqual({ gagnants: 'doubles' });
  });

  it('un plan avec une seule Double est refusé', () => {
    expect(() => partie(['doubles', 'spectre', ...pelerins(6)])).toThrow(/Doubles/);
  });
});

describe('Sectaire', () => {
  const ROLES: RoleId[] = ['sectaire', 'spectre', 'oracle', ...pelerins(5)];

  it('enrôle un joueur chaque nuit, qui lui est montré', () => {
    const etat = finirNuit(partie(ROLES), { sectaire: { type: 'sectaire-enroler', cible: 3 } });
    expect(etat.joueurs[2].statuts.enrole).toBe(true);
  });

  it('un enrôlé ne peut plus le viser avec son pouvoir', () => {
    let etat = finirNuit(partie(ROLES), { sectaire: { type: 'sectaire-enroler', cible: 3 } });
    etat = appliquer(auVote(etat, 4), { type: 'passer' });
    const etape = etapeSuivante(etat);
    expect(etape).toMatchObject({ role: 'oracle' });
    if (etape.type === 'reveil') expect(etape.ciblesPossibles).not.toContain(1);
  });

  it('sa mort libère les enrôlés', () => {
    let etat = finirNuit(partie(ROLES), { sectaire: { type: 'sectaire-enroler', cible: 3 } });
    etat = appliquer(auVote(etat, 4), { type: 'eliminer', cible: 1 });
    expect(etat.joueurs[2].statuts.enrole).toBe(false);
  });

  it('gagne seul quand tous les vivants sont enrôlés', () => {
    const etat = partie(ROLES);
    for (const j of etat.joueurs) j.vivant = [1, 2, 3].includes(j.id);
    etat.joueurs[1].statuts.enrole = true;
    expect(verifierVictoire(etat)).toBeNull();
    etat.joueurs[2].statuts.enrole = true;
    expect(verifierVictoire(etat)).toEqual({ gagnants: 'sectaire' });
  });
});

describe('Envoûteur', () => {
  const ROLES: RoleId[] = ['envouteur', 'spectre', ...pelerins(6)];

  it('charme 2 joueurs chaque nuit, jamais deux fois le même', () => {
    let etat = jouerJusquA(partie(ROLES), 'envouteur');
    expect(() => appliquer(etat, { type: 'envouteur-charmer', cibles: [3] })).toThrow(/2 joueur/);
    etat = appliquer(etat, { type: 'envouteur-charmer', cibles: [3, 4] });
    expect([etat.joueurs[2].statuts.charme, etat.joueurs[3].statuts.charme]).toEqual([true, true]);
    etat = appliquer(auVote(appliquer(etat, { type: 'passer' }), 5), { type: 'passer' });
    etat = jouerJusquA(etat, 'envouteur');
    const etape = etapeSuivante(etat);
    if (etape.type === 'reveil') expect(etape.ciblesPossibles).not.toContain(3);
  });

  it('gagne seul quand tous les vivants sont charmés', () => {
    const etat = partie(ROLES);
    for (const j of etat.joueurs) j.vivant = [1, 2, 3].includes(j.id);
    etat.joueurs[1].statuts.charme = true;
    etat.joueurs[2].statuts.charme = true;
    expect(verifierVictoire(etat)).toEqual({ gagnants: 'envouteur' });
  });
});

describe('Nécromancien et Revenant', () => {
  const ROLES: RoleId[] = ['necromancien', 'spectre', 'spectre', ...pelerins(5)];

  it('ne se réveille pas tant que personne n\'est mort', () => {
    const etat = jouerNuit(partie(ROLES), { spectre: { type: 'spectres-attaquer', cible: 5 } });
    expect(etapeSuivante(etat)).toMatchObject({ type: 'resolution-nuit' });
  });

  it('ressuscite un mort en Revenant, une seule fois', () => {
    let etat = finirNuit(partie(ROLES), { spectre: { type: 'spectres-attaquer', cible: 5 } });
    etat = appliquer(auVote(etat, 4), { type: 'passer' });
    etat = jouerJusquA(etat, 'necromancien', { spectre: { type: 'spectres-attaquer', cible: 6 } });
    expect(etapeSuivante(etat)).toMatchObject({ role: 'necromancien', ciblesPossibles: [5] });
    etat = appliquer(etat, { type: 'necromancien-ressusciter', cible: 5 });
    expect(etat.joueurs[4]).toMatchObject({ vivant: true, revele: true, role: 'revenant', camp: 'necromancien' });
    expect(etat.infoMJ).toMatch(/Montre-lui le Nécromancien : siège 1/);
  });

  it('gagne seul ou avec son Revenant ; le Revenant seul ne gagne pas', () => {
    const etat = partie(ROLES);
    for (const j of etat.joueurs) j.vivant = [1, 5].includes(j.id);
    Object.assign(etat.joueurs[4], { role: 'revenant', camp: 'necromancien' });
    expect(verifierVictoire(etat)).toEqual({ gagnants: 'necromancien' });
    etat.joueurs[0].vivant = false;
    expect(verifierVictoire(etat)).toEqual({ gagnants: null });
  });

  it('le Revenant ne se pose pas sur un siège', () => {
    expect(() => partie(['revenant', 'spectre', ...pelerins(6)])).toThrow(/ne se pose pas/);
  });
});
