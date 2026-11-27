// Partage des salles sur mesure entre appareils (ex. créée sur PC, jouée sur la tablette).
// Sur l'appareil qui partage : un QR code qui contient le lien de la salle.
// Sur l'appareil qui reçoit : « Scanner une salle » (caméra), ou le lien collé à la main.
import qrcode from 'qrcode-generator';
import jsQR from 'jsqr';
import { PARAM_PARTAGE, encoderPlan, type Plan } from '../engine';

function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Lien qui ouvre l'appli et ajoute la salle : https://…/#salle=<code>. */
export function lienDePartage(plan: Plan): string {
  const base = new URL(import.meta.env.BASE_URL, location.href);
  base.hash = `${PARAM_PARTAGE}=${encoderPlan(plan)}`;
  return base.href;
}

/** Plein écran avec le QR code de la salle, à scanner depuis la tablette. */
export function ecranPartage(plan: Plan, info: string | null): string {
  const qr = qrcode(0, 'M');
  qr.addData(lienDePartage(plan));
  qr.make();
  return `
    <main class="plein-ecran partage" aria-label="Partager la salle">
      <h1 class="titre-plein-ecran">Partager la salle</h1>
      <p class="sous-titre">${echapper(plan.salle)} · ${plan.nbJoueurs} joueurs</p>
      <div class="qr" role="img" aria-label="QR code de la salle">${qr.createSvgTag({ margin: 4, scalable: true })}</div>
      <p class="aide">Sur la tablette, ouvre l'appli, touche « Scanner une salle » et vise ce code.</p>
      ${info ? `<p class="info">${echapper(info)}</p>` : ''}
      <div class="boutons">
        <button type="button" data-copier-lien>Copier le lien</button>
        <button type="button" class="principal" data-fermer-partage>Fermer</button>
      </div>
    </main>`;
}

/** Plein écran du scanner : la caméra, et le lien à coller si la caméra ne marche pas. */
export function ecranScanner(erreur: string | null): string {
  return `
    <main class="plein-ecran scanner" aria-label="Scanner une salle">
      <h1 class="titre-plein-ecran">Scanner une salle</h1>
      <p class="aide">Vise le QR code affiché sur l'autre appareil.</p>
      <video class="camera" playsinline muted></video>
      ${erreur ? `<p class="erreur">${echapper(erreur)}</p>` : ''}
      <label class="coller">
        <span>Ou colle le lien de la salle :</span>
        <input class="champ" data-lien-salle placeholder="https://…#salle=…" autocomplete="off">
      </label>
      <div class="boutons">
        <button type="button" data-importer-lien>Ajouter la salle</button>
        <button type="button" data-fermer-scanner>Annuler</button>
      </div>
    </main>`;
}

let arreterCamera: (() => void) | null = null;

/** Coupe la caméra (en quittant le scanner, ou avant de la relancer). */
export function arreterScan(): void {
  arreterCamera?.();
  arreterCamera = null;
}

/**
 * Lance la caméra arrière dans `video` et lit les QR codes en continu.
 * `trouve` reçoit le texte du premier QR code lu ; `echec` un message si la caméra est refusée.
 */
export async function demarrerScan(
  video: HTMLVideoElement,
  trouve: (texte: string) => void,
  echec: (message: string) => void,
): Promise<void> {
  arreterScan();
  if (!navigator.mediaDevices?.getUserMedia) {
    echec("Pas de caméra disponible ici : colle le lien de la salle.");
    return;
  }
  let flux: MediaStream;
  try {
    flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  } catch {
    echec("La caméra est refusée ou absente : autorise-la dans les réglages, ou colle le lien de la salle.");
    return;
  }
  let actif = true;
  let image = 0;
  arreterCamera = () => {
    actif = false;
    cancelAnimationFrame(image);
    flux.getTracks().forEach((t) => t.stop());
  };
  video.srcObject = flux;
  await video.play().catch(() => undefined);

  const toile = document.createElement('canvas');
  const contexte = toile.getContext('2d', { willReadFrequently: true });
  const lire = () => {
    if (!actif || !contexte) return;
    if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      // Image réduite : plus rapide à analyser, et largement assez nette pour un QR code.
      const echelle = Math.min(1, 640 / video.videoWidth);
      toile.width = Math.round(video.videoWidth * echelle);
      toile.height = Math.round(video.videoHeight * echelle);
      contexte.drawImage(video, 0, 0, toile.width, toile.height);
      const pixels = contexte.getImageData(0, 0, toile.width, toile.height);
      const code = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'dontInvert' });
      if (code?.data) {
        arreterScan();
        trouve(code.data);
        return;
      }
    }
    image = requestAnimationFrame(lire);
  };
  image = requestAnimationFrame(lire);
}
