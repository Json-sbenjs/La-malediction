// Quel son jouer, et quand : traduit un changement de la partie en une suite de sons.
// Module sans DOM ni Web Audio (testé par tests/web/sons-evenements.test.ts) ;
// c'est sons.ts qui joue réellement les sons.
import { etapeSuivante, type Action, type Camp, type Etape, type EtatPartie } from '../engine';
import { idSonRole, type IdSon } from './sons-catalogue';

/** Un son à jouer `delai` secondes après le début du lot. */
export interface SonPrevu {
  son: IdSon;
  delai: number;
}

/** Temps laissé à chaque son avant le suivant du même lot (en secondes). */
const PAUSE: Partial<Record<IdSon, number>> = {
  tr_debut_partie: 3,
  tr_nuit_tombe: 3,
  tr_jour_se_leve: 2,
  sfx_glas: 4,
  sfx_nuit_calme: 2,
  sfx_verdict: 1,
  sfx_aucun_elimine: 1,
  sfx_mort: 2.2,
  sfx_couronne: 1.5,
  sfx_murmure: 1,
};

/** Fabrique un lot : chaque son part après la pause du précédent. */
function enchainer(sons: IdSon[]): SonPrevu[] {
  let t = 0;
  return sons.map((son) => {
    const prevu = { son, delai: t };
    t += PAUSE[son] ?? 1.5;
    return prevu;
  });
}

/** Son de réveil (ou de présentation) de l'étape : le rôle qui agit. */
export function sonDeLEtape(etape: Etape): IdSon | null {
  switch (etape.type) {
    case 'explication':
    case 'reveil':
      return idSonRole(etape.role);
    case 'election-alpha':
      return 'role_alpha';
    case 'decision':
      switch (etape.decision.type) {
        case 'usurpateur':
          return 'role_usurpateur';
        case 'main-noire':
          return 'role_main-noire';
        case 'alpha-successeur':
          return 'role_alpha';
        case 'sacrifice':
          return 'role_sacrifie';
        case 'bourreau':
          return 'role_bourreau';
      }
      return null;
    default:
      // Vote, fin de nuit : la transition de phase a déjà son son ; la fin a sonDeFin.
      return null;
  }
}

/** Son de fin de partie selon les gagnants. */
export function sonDeFin(gagnants: Camp | null): IdSon {
  if (gagnants === null) return 'fin_personne';
  if (gagnants === 'pelerins') return 'fin_pelerins';
  if (gagnants === 'spectres') return 'fin_spectres';
  return 'fin_solitaire';
}

/** Ambiance de fond : la nuit (explication comprise) ou le jour ; rien hors partie et à la fin. */
export function ambianceDe(etat: EtatPartie | null): 'amb_nuit' | 'amb_jour' | null {
  switch (etat?.phase.type) {
    case 'explication':
    case 'nuit':
      return 'amb_nuit';
    case 'jour':
      return 'amb_jour';
    default:
      return null;
  }
}

/**
 * La musique de fond s'entend hors partie et la nuit (explication comprise) ; elle s'efface le jour
 * et à la fin de la partie, où l'on n'entend que l'ambiance et les effets (choix du MJ).
 */
export function musiqueDe(etat: EtatPartie | null): boolean {
  const phase = etat?.phase.type;
  return phase !== 'jour' && phase !== 'fin';
}

/** Sons du lancement d'une partie : le gong, puis le premier rôle à présenter. */
export function sonsDebutPartie(etat: EtatPartie): SonPrevu[] {
  const premier = sonDeLEtape(etapeSuivante(etat));
  return enchainer(premier ? ['tr_debut_partie', premier] : ['tr_debut_partie']);
}

/** Deux étapes identiques (même phase, même contenu) : pas de nouveau son de réveil. */
function memeEtape(a: EtatPartie, b: EtatPartie): boolean {
  return JSON.stringify([a.phase, a.decisions, etapeSuivante(a)]) === JSON.stringify([b.phase, b.decisions, etapeSuivante(b)]);
}

/**
 * Sons à jouer après une action du MJ, dans l'ordre :
 * ce que l'action produit (verdict, couronne, révélation…), les morts, le changement de phase,
 * puis le réveil du rôle suivant (ou la fin de partie).
 */
export function sonsDuChangement(avant: EtatPartie, action: Action, apres: EtatPartie): SonPrevu[] {
  const sons: IdSon[] = [];
  const etapeAvant = etapeSuivante(avant);
  const morts = apres.joueurs.filter((j) => !j.vivant && avant.joueurs.some((a) => a.id === j.id && a.vivant)).length;
  const pa = avant.phase;
  const pb = apres.phase;
  const finDeNuit = pa.type === 'nuit' && pb.type !== 'nuit';

  // 1. Ce que l'action produit.
  if (action.type === 'vote' || action.type === 'eliminer') {
    const condamne = morts > 0 || apres.decisions.some((d) => d.type === 'sacrifice');
    sons.push(condamne ? 'sfx_verdict' : 'sfx_aucun_elimine');
  } else if (action.type === 'passer' && etapeAvant.type === 'vote') {
    sons.push('sfx_aucun_elimine');
  } else if (action.type === 'elire-alpha' || action.type === 'alpha-successeur') {
    sons.push('sfx_couronne');
  } else if (action.type === 'oracle-voir') {
    sons.push('sfx_revelation');
  }
  // Info secrète donnée par un pouvoir de nuit (Instinct…) ; l'Oracle a déjà sa révélation.
  const infoSecrete = etapeAvant.type === 'reveil' && apres.infoMJ !== null && apres.infoMJ !== avant.infoMJ;
  if (infoSecrete && action.type !== 'oracle-voir') sons.push('sfx_murmure');

  // 2. Les morts et le changement de phase.
  if (finDeNuit) {
    // Le village se réveille, puis on annonce s'il y a des morts.
    if (pb.type !== 'fin') sons.push('tr_jour_se_leve');
    sons.push(morts > 0 ? 'sfx_glas' : 'sfx_nuit_calme');
  } else if (morts > 0) {
    sons.push('sfx_mort');
  }
  if (pb.type === 'fin') return enchainer([...sons, sonDeFin(pb.gagnants)]);

  const changePhase = pa.type !== pb.type || ('numero' in pa && 'numero' in pb && pa.numero !== pb.numero);
  if (changePhase && !finDeNuit) {
    if (pb.type === 'nuit') sons.push('tr_nuit_tombe');
    if (pb.type === 'jour') sons.push('tr_jour_se_leve');
  }

  // 3. Le rôle suivant se réveille. Après l'Oracle, on attend la fin de la révélation (voir main.ts).
  if (action.type !== 'oracle-voir' && !memeEtape(avant, apres)) {
    const suivant = sonDeLEtape(etapeSuivante(apres));
    if (suivant) sons.push(suivant);
  }
  return enchainer(sons);
}
