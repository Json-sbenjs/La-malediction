// Partage d'une salle sur mesure d'un appareil à l'autre (PC → tablette) :
// le plan est transformé en un court texte, mis dans un lien puis dans un QR code.
import { validerPlan, type Plan } from './plans';
import { ROLES } from './roles';
import type { RoleId } from './types';

/** Nom du paramètre du lien de partage : https://…/#salle=<code>. */
export const PARAM_PARTAGE = 'salle';

/** Version du format : à augmenter si on change la forme du contenu. */
const VERSION = 1;

/** Contenu partagé : le minimum pour reconstruire le plan. */
interface Contenu {
  v: number;
  /** Nom de la salle. */
  s: string;
  /** Rôle de chaque siège, dans l'ordre des numéros. */
  r: RoleId[];
  /** Positions x puis y de chaque siège, en dixièmes de % (entiers, plus courts). */
  p: number[];
}

/** Transforme un plan en code à mettre dans un lien. */
export function encoderPlan(plan: Plan): string {
  const sieges = [...plan.sieges].sort((a, b) => a.numero - b.numero);
  const contenu: Contenu = {
    v: VERSION,
    s: plan.salle,
    r: sieges.map((s) => s.role),
    p: sieges.flatMap((s) => [Math.round(s.position.x * 10), Math.round(s.position.y * 10)]),
  };
  return versBase64Url(JSON.stringify(contenu));
}

/**
 * Reconstruit un plan à partir d'un code, ou d'un lien de partage complet.
 * Lève une erreur claire si le code est abîmé ou ne décrit pas une salle valide.
 */
export function decoderPlan(texte: string): Plan {
  const code = extraireCode(texte.trim());
  let contenu: Contenu;
  try {
    contenu = JSON.parse(depuisBase64Url(code)) as Contenu;
  } catch {
    throw new Error("Ce code n'est pas une salle de la Malédiction");
  }
  if (contenu?.v !== VERSION) throw new Error("Cette salle vient d'une autre version de l'appli");
  const { s: salle, r: roles, p: positions } = contenu;
  if (typeof salle !== 'string' || !salle.trim()) throw new Error('La salle partagée n’a pas de nom');
  if (!Array.isArray(roles) || !Array.isArray(positions) || positions.length !== roles.length * 2) {
    throw new Error('La salle partagée est incomplète');
  }
  const inconnu = roles.find((r) => !(r in ROLES));
  if (inconnu !== undefined) throw new Error(`Rôle inconnu dans la salle partagée : ${String(inconnu)}`);
  if (positions.some((n) => typeof n !== 'number' || !Number.isFinite(n))) {
    throw new Error('La salle partagée est incomplète');
  }

  const nom = salle.trim();
  const plan: Plan = {
    id: `${nom}-${roles.length}`,
    salle: nom,
    nbJoueurs: roles.length,
    sieges: roles.map((role, i) => ({
      numero: i + 1,
      role,
      position: { x: positions[2 * i] / 10, y: positions[2 * i + 1] / 10 },
    })),
  };
  const erreurs = validerPlan(plan);
  if (erreurs.length > 0) throw new Error(`Salle partagée invalide : ${erreurs.join(' ; ')}`);
  return plan;
}

/** Accepte le code seul, ou un lien qui contient « salle=<code> ». */
function extraireCode(texte: string): string {
  const trouve = texte.match(new RegExp(`[#?&]${PARAM_PARTAGE}=([A-Za-z0-9_-]+)`));
  return trouve ? trouve[1] : texte;
}

// Base64 « pour les liens » : + et / remplacés par - et _, sans = final.
// Le nom de la salle peut avoir des accents : on passe par l'UTF-8.
function versBase64Url(texte: string): string {
  const octets = new TextEncoder().encode(texte);
  let binaire = '';
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function depuisBase64Url(code: string): string {
  const base64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const binaire = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binaire, (c) => c.charCodeAt(0)));
}
