/**
 * Taille des sièges selon le nombre de joueurs : plus il y a de monde,
 * plus les sièges sont petits pour ne pas se chevaucher (voir .salle.dense dans style.css).
 */
export function densite(nbJoueurs: number): '' | 'dense' | 'tres-dense' {
  if (nbJoueurs >= 16) return 'tres-dense';
  if (nbJoueurs >= 11) return 'dense';
  return '';
}
