// Générateur de salle et ajustement avant la partie : rester appuyé sur un siège,
// puis le faire glisser pour le placer comme dans la vraie salle. Un appui court reste un simple toucher
// (échange de rôles dans le générateur, choix du siège dans l'ajustement).

/** Durée d'appui avant de pouvoir déplacer un siège (ms). */
const APPUI_LONG = 350;
/** Si le doigt bouge plus que ça avant la fin de l'appui long, ce n'est pas un déplacement. */
const TOLERANCE = 10;

/**
 * Passage d'un point de l'écran à une position du plan (0 à 100).
 * C'est l'inverse du placement des sièges dans style.css (.siege) :
 *   left = 4 % + x × 0,92 %   et   top = 8 % + y × 0,84 %
 */
function versPlan(salle: HTMLElement, clientX: number, clientY: number): { x: number; y: number } {
  const cadre = salle.getBoundingClientRect();
  const gauche = ((clientX - cadre.left) / cadre.width) * 100;
  const haut = ((clientY - cadre.top) / cadre.height) * 100;
  const borne = (v: number) => Math.min(100, Math.max(0, v));
  return { x: borne((gauche - 4) / 0.92), y: borne((haut - 8) / 0.84) };
}

let ignorerClic = false;

/** Vrai juste après un déplacement : le clic qui suit ne doit pas compter comme un échange de rôles. */
export function clicApresDeplacement(): boolean {
  const resultat = ignorerClic;
  ignorerClic = false;
  return resultat;
}

/**
 * Active le déplacement des sièges marqués `data-deplacable="<numéro du siège>"` dans `racine`.
 * `deplace` reçoit le numéro du siège et sa nouvelle position quand on le lâche
 * (null si le geste est interrompu : il suffit alors de réafficher).
 */
export function activerDeplacement(
  racine: HTMLElement,
  deplace: (numero: number, position: { x: number; y: number } | null) => void,
): void {
  racine.addEventListener('pointerdown', (evt) => {
    const siege = (evt.target as HTMLElement).closest<HTMLElement>('[data-deplacable]');
    const salle = siege?.closest<HTMLElement>('.salle');
    if (!siege || !salle || evt.button !== 0) return;

    const depart = { x: evt.clientX, y: evt.clientY };
    let saisi = false;
    let position: { x: number; y: number } | null = null;

    const minuterie = window.setTimeout(() => {
      saisi = true;
      siege.classList.add('saisi');
      siege.setPointerCapture(evt.pointerId);
    }, APPUI_LONG);

    const bouger = (e: PointerEvent) => {
      if (e.pointerId !== evt.pointerId) return;
      if (!saisi) {
        if (Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > TOLERANCE) finir(false);
        return;
      }
      e.preventDefault();
      position = versPlan(salle, e.clientX, e.clientY);
      siege.style.setProperty('--x', String(position.x));
      siege.style.setProperty('--y', String(position.y));
    };

    const finir = (valider: boolean) => {
      window.clearTimeout(minuterie);
      racine.removeEventListener('pointermove', bouger);
      racine.removeEventListener('pointerup', lacher);
      racine.removeEventListener('pointercancel', annuler);
      if (!saisi) return;
      siege.classList.remove('saisi');
      ignorerClic = true; // le clic qui suit le lâcher n'est pas un échange de rôles
      deplace(Number(siege.dataset.deplacable), valider ? position : null);
    };
    const lacher = (e: PointerEvent) => e.pointerId === evt.pointerId && finir(true);
    const annuler = (e: PointerEvent) => e.pointerId === evt.pointerId && finir(false);

    racine.addEventListener('pointermove', bouger);
    racine.addEventListener('pointerup', lacher);
    racine.addEventListener('pointercancel', annuler);
  });

  // Appui long sur iPad : pas de menu contextuel ni de loupe sur les sièges déplaçables.
  racine.addEventListener('contextmenu', (evt) => {
    if ((evt.target as HTMLElement).closest('[data-deplacable]')) evt.preventDefault();
  });
}
