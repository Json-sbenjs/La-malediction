// Textes lus par le MJ, et comment chaque rôle de nuit se joue à l'écran.
import type { Action, JoueurId, RoleId } from '../engine';

export function consigneReveil(role: RoleId, premiereNuit: boolean): string {
  switch (role) {
    case 'trinite':
      return 'La Trinité se réveille et ses trois membres se reconnaissent.';
    case 'anatheme':
      return "L'Anathème se réveille et désigne son modèle.";
    case 'adepte':
      return "L'Adepte se réveille et désigne secrètement son mentor.";
    case 'courtisane':
      return "La Courtisane se réveille et désigne le joueur qu'elle occupe cette nuit.";
    case 'protecteur':
      return 'Le Protecteur se réveille et désigne le joueur qu\'il protège.';
    case 'oracle':
      return "L'Oracle se réveille et désigne le joueur dont il veut connaître l'identité.";
    case 'instinct':
      return "L'Instinct se réveille et désigne 3 joueurs.";
    case 'spectre':
      return premiereNuit
        ? 'Les Spectres se réveillent, se reconnaissent et désignent leur victime.'
        : 'Les Spectres se réveillent et désignent leur victime.';
    case 'sainte':
      return 'La Sainte se réveille. Montre-lui la victime : veut-elle utiliser sa potion ?';
    case 'vipere':
      return "La Vipère se réveille : veut-elle empoisonner quelqu'un ?";
    default:
      return 'Ce rôle se réveille.';
  }
}

/** Comment le MJ saisit le choix d'un rôle de nuit. */
export type ModeSaisie =
  | { type: 'aucune'; bouton: string }
  | { type: 'cibles'; nombre: 1 | 3; action: (cibles: JoueurId[]) => Action; passer: { texte: string; action: Action } | null }
  | { type: 'sainte' };

export function modeSaisie(role: RoleId): ModeSaisie {
  const une = (
    action: (cible: JoueurId) => Action,
    passer: { texte: string; action: Action } | null = { texte: 'Passer', action: { type: 'passer' } },
  ): ModeSaisie => ({ type: 'cibles', nombre: 1, action: ([c]) => action(c), passer });

  switch (role) {
    case 'trinite':
      return { type: 'aucune', bouton: 'Reconnaissance faite' };
    case 'anatheme':
      return une((cible) => ({ type: 'anatheme-choisir-modele', cible }), null);
    case 'adepte':
      return une((cible) => ({ type: 'adepte-choisir-mentor', cible }), null);
    case 'courtisane':
      return une((cible) => ({ type: 'courtisane-occuper', cible }));
    case 'protecteur':
      return une((cible) => ({ type: 'protecteur-proteger', cible }));
    case 'oracle':
      return une((cible) => ({ type: 'oracle-voir', cible }));
    case 'spectre':
      return une((cible) => ({ type: 'spectres-attaquer', cible }), {
        texte: "Pas d'attaque",
        action: { type: 'spectres-attaquer', cible: null },
      });
    case 'vipere':
      return une((cible) => ({ type: 'vipere-empoisonner', cible }), {
        texte: 'Pas de poison',
        action: { type: 'vipere-empoisonner', cible: null },
      });
    case 'instinct':
      return {
        type: 'cibles',
        nombre: 3,
        action: ([a, b, c]) => ({ type: 'instinct-designer', cibles: [a, b, c] }),
        passer: { texte: 'Passer', action: { type: 'passer' } },
      };
    case 'sainte':
      return { type: 'sainte' };
    default:
      return { type: 'aucune', bouton: 'Continuer' };
  }
}
