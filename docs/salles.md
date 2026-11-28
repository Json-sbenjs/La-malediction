# Salles sur mesure : créer, placer, partager

Une **salle** est un plan préparé à l'avance : un nom, un nombre de joueurs, et pour chaque siège un rôle et une position sur le plan. Les joueurs s'assoient où ils veulent ; le rôle est lié au siège.

## Créer une salle (écran « Salle sur mesure »)

1. Nom de la salle, nombre de joueurs (8 à 25), forme : tour de table, table rectangulaire ou tables en U.
2. Composition des rôles (conseillée au départ, modifiable).
3. « Tirer les rôles » : les rôles sont tirés au hasard sur les sièges, disposés selon la forme.
4. Retouches :
   - **Toucher deux sièges** échange leurs rôles.
   - **Rester appuyé sur un siège** (environ 1/3 de seconde) puis le faire glisser le **déplace** : on le place comme dans la vraie salle. Le siège saisi est entouré d'`or-vif`.
5. « Enregistrer la salle » : elle est gardée dans l'appareil (`localStorage`, clé `malediction:plans`).

Règles des positions :
- Une position est en % du plan (0 à 100), arrondie au dixième (`deplacerSiege` dans `src/engine/generateur.ts`).
- « Mélanger à nouveau » tire de nouveaux rôles **sans bouger** les sièges déplacés à la main.
- Changer la **forme** ou le **nombre de joueurs** oublie les déplacements : on repart de la disposition de la forme.
- La correspondance entre position et écran est la même partout (`.siege` dans `style.css`, et `versPlan` dans `src/web/deplacement.ts` qui fait l'inverse).

## Modifier une salle le soir même

Si le groupe n'a pas le nombre prévu, pas besoin de recréer une salle : écran de choix → « ✏️ Modifier la salle ».
Même écran que « Salle sur mesure », mais on part du plan prévu : on règle le nombre de joueurs, puis les rôles avec − / +
jusqu'à avoir autant de rôles que de joueurs (détail dans `deroule-partie.md`, § 1), et on valide la salle.
« Valider la salle » le garde pour la partie de ce soir seulement (il n'est pas enregistré comme nouvelle salle).

## Partager une salle (QR code)

Les salles sont gardées par appareil. Pour passer une salle d'un appareil à un autre (ex. créée sur PC, jouée sur l'iPad) :

1. Sur l'appareil qui a la salle : écran de choix → sélectionner la salle → **« Partager (QR code) »**.
2. Sur la tablette : ouvrir l'appli → **« Scanner une salle »** → viser le QR code. La salle est ajoutée et sélectionnée.

Autres façons de recevoir la salle :
- **Copier le lien** sur le PC, l'envoyer à la tablette (message, mail) et le coller dans « Scanner une salle ».
- Scanner le QR code avec l'appareil photo de la tablette : le lien s'ouvre dans le **navigateur**. Sur iPad, l'appli installée sur l'écran d'accueil a son propre stockage : la salle n'y apparaît pas. Il faut donc scanner **depuis l'appli**.

Si une salle du même nom et du même nombre de joueurs existe déjà sur la tablette, elle est **remplacée** (message « mise à jour »).

### Format du lien

`https://<adresse de l'appli>/#salle=<code>`, où `<code>` est le plan en JSON compact, encodé en base64 « pour les liens » (`src/engine/partage.ts`) :

```json
{ "v": 1, "s": "Salle Clown", "r": ["spectre", "pelerin", "…"], "p": [123, 456, "…"] }
```

- `v` : version du format (à augmenter si on change ce contenu).
- `s` : nom de la salle ; `r` : rôle de chaque siège dans l'ordre des numéros ; `p` : x puis y de chaque siège, en dixièmes de %.
- À l'import, le plan est vérifié avec `validerPlan` : un lien abîmé ou une salle impossible est refusé avec un message clair.
- À 25 joueurs, le lien fait moins de 1 000 caractères : le QR code reste lisible à l'écran.

Le QR code est foncé sur clair (modules `fond` sur parchemin `encre`) pour que tous les appareils photo le lisent. La caméra demande l'autorisation de l'appareil et ne marche qu'en HTTPS (GitHub Pages) ou sur `localhost`.

Bibliothèques : `qrcode-generator` (création du QR code) et `jsqr` (lecture par la caméra), incluses dans l'appli pour marcher hors ligne.
