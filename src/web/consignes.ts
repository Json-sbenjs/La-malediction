// Textes lus par le MJ, et comment chaque rôle de nuit se joue à l'écran.
import type { Action, JoueurId, RoleId } from '../engine';

/** Ce que le MJ doit savoir de la table pour adapter la consigne. */
export interface ContexteConsigne {
  /** Nuit d'explication : les Spectres se reconnaissent sans attaquer. */
  explication: boolean;
  /** L'Augure est en vie : il peut espionner pendant le réveil des Spectres. */
  augure: boolean;
  /** Le Maudit est en vie : il se réveille avec les Spectres. */
  maudit: boolean;
}

export function consigneReveil(role: RoleId, contexte: ContexteConsigne): string {
  switch (role) {
    case 'trinite':
      return 'La Trinité se réveille et ses trois membres se reconnaissent.';
    case 'doubles':
      return 'Les Doubles se réveillent et se reconnaissent.';
    case 'medium':
      return 'Le Médium se réveille et, en silence, pointe un mort puis un vivant. Le mort répond par un mime.';
    case 'augure':
      return "L'Augure a-t-elle été vue par les Spectres pendant qu'elle espionnait ? Si oui, elle mourra au matin, quoi qu'il arrive.";
    case 'inquisiteur':
      return "L'Inquisiteur se réveille et marque un joueur : il aura une voix contre lui au vote.";
    case 'enchanteur':
      return "L'Enchanteur se réveille : veut-il endormir les Spectres cette nuit ? (une seule fois)";
    case 'originel':
      return "L'Originel reste éveillé : veut-il transformer la victime en Spectre au lieu de la tuer ? (une seule fois)";
    case 'maudit':
      return 'Le Maudit reste éveillé : veut-il éliminer un Spectre ?';
    case 'sectaire':
      return 'Le Sectaire se réveille et enrôle un joueur. Réveille ensuite l\'enrôlé pour lui montrer le Sectaire.';
    case 'envouteur':
      return "L'Envoûteur se réveille et charme 2 joueurs.";
    case 'necromancien':
      return 'Le Nécromancien se réveille : veut-il ressusciter un mort ? (une seule fois)';
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
    case 'spectre': {
      if (contexte.explication) {
        const maudit = contexte.maudit ? ' Le Maudit se réveille avec eux.' : '';
        return `Les Spectres se réveillent et se reconnaissent, sans attaquer.${maudit}`;
      }
      const base = 'Les Spectres se réveillent et désignent leur victime.';
      const maudit = contexte.maudit ? ' Le Maudit se réveille avec eux.' : '';
      const augure = contexte.augure ? " L'Augure peut espionner, les yeux entrouverts." : '';
      return base + maudit + augure;
    }
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
  | { type: 'cibles'; nombre: number; action: (cibles: JoueurId[]) => Action; passer: { texte: string; action: Action } | null }
  | { type: 'sainte' }
  /** Une question oui / non (Enchanteur, Originel). */
  | { type: 'oui-non'; oui: { texte: string; action: Action }; non: { texte: string; action: Action } };

export function modeSaisie(role: RoleId, explication = false): ModeSaisie {
  // Nuit d'explication : les Spectres ne font que se reconnaître.
  if (explication && role === 'spectre') return { type: 'aucune', bouton: 'Reconnaissance faite' };
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
    case 'doubles':
      return { type: 'aucune', bouton: 'Reconnaissance faite' };
    case 'medium':
      return { type: 'aucune', bouton: 'Consultation faite' };
    case 'inquisiteur':
      return une((cible) => ({ type: 'inquisiteur-marquer', cible }), { texte: 'Pas de marque', action: { type: 'passer' } });
    case 'enchanteur':
      return {
        type: 'oui-non',
        oui: { texte: 'Endormir les Spectres', action: { type: 'enchanteur-enchanter', utiliser: true } },
        non: { texte: 'Pas cette nuit', action: { type: 'enchanteur-enchanter', utiliser: false } },
      };
    case 'augure':
      return {
        type: 'oui-non',
        oui: { texte: 'Elle a été vue', action: { type: 'augure-vue', vue: true } },
        non: { texte: 'Pas vue', action: { type: 'augure-vue', vue: false } },
      };
    case 'originel':
      return {
        type: 'oui-non',
        oui: { texte: 'Transformer la victime', action: { type: 'originel-infecter', utiliser: true } },
        non: { texte: 'La laisser mourir', action: { type: 'originel-infecter', utiliser: false } },
      };
    case 'maudit':
      return une((cible) => ({ type: 'maudit-devorer', cible }), {
        texte: 'Personne',
        action: { type: 'maudit-devorer', cible: null },
      });
    case 'sectaire':
      return une((cible) => ({ type: 'sectaire-enroler', cible }));
    case 'envouteur':
      return {
        type: 'cibles',
        nombre: 2,
        action: (cibles) => ({ type: 'envouteur-charmer', cibles }),
        passer: { texte: 'Passer', action: { type: 'passer' } },
      };
    case 'necromancien':
      return une((cible) => ({ type: 'necromancien-ressusciter', cible }), {
        texte: 'Personne',
        action: { type: 'necromancien-ressusciter', cible: null },
      });
    default:
      return { type: 'aucune', bouton: 'Continuer' };
  }
}
