// Musique de fond choisie par le MJ (un fichier de sa tablette), gardée dans le navigateur (IndexedDB).
// Le fichier ne quitte jamais l'appareil : il n'est ni dans le dépôt ni sur le site publié.

const BASE = 'malediction';
const MAGASIN = 'fichiers';
const CLE = 'musique-fond';

export interface MusiquePerso {
  nom: string;
  fichier: Blob;
}

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((resoudre, rejeter) => {
    const demande = indexedDB.open(BASE, 1);
    demande.onupgradeneeded = () => demande.result.createObjectStore(MAGASIN);
    demande.onsuccess = () => resoudre(demande.result);
    demande.onerror = () => rejeter(demande.error);
  });
}

async function transaction<T>(mode: IDBTransactionMode, faire: (m: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await ouvrir();
  try {
    return await new Promise<T>((resoudre, rejeter) => {
      const demande = faire(db.transaction(MAGASIN, mode).objectStore(MAGASIN));
      demande.onsuccess = () => resoudre(demande.result as T);
      demande.onerror = () => rejeter(demande.error);
    });
  } finally {
    db.close();
  }
}

/** La musique choisie par le MJ, ou null (stockage vide ou indisponible). */
export async function lireMusiquePerso(): Promise<MusiquePerso | null> {
  try {
    return (await transaction<MusiquePerso | undefined>('readonly', (m) => m.get(CLE))) ?? null;
  } catch {
    return null;
  }
}

export async function enregistrerMusiquePerso(fichier: File): Promise<void> {
  const musique: MusiquePerso = { nom: fichier.name, fichier };
  await transaction('readwrite', (m) => m.put(musique, CLE));
}

export async function oublierMusiquePerso(): Promise<void> {
  try {
    await transaction('readwrite', (m) => m.delete(CLE));
  } catch {
    // Rien à oublier.
  }
}
