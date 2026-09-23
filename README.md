# Cap sur l'inconnu

Générateur de road-trip mystère. Vous donnez une ville de départ, une durée, un budget et un moyen de
transport ; le site tire un itinéraire que vous ne découvrez qu'une fois lancé, et vous le donne en PDF.

**En ligne : [road.lume419.fr](https://road.lume419.fr)**

---

## Ce qu'il y a dedans

| | |
|---|---|
| Lieux | **4 982 745**, dans 239 pays et territoires |
| Noms alternatifs | **1 792 776** — chercher une ville dans sa propre langue |
| Langues d'interface | **161**, PDF compris |
| Liaisons de ferry | **699**, avec leur tarif et leur source |
| Péages | barèmes de 17 pays, grille de 1 699 cases |
| Bornes de recharge | 222 512 points (Open Charge Map) |

Toutes ces données sont **réelles et sourcées**. Le projet ne publie aucun chiffre inventé : quand une
donnée manque, elle est absente plutôt qu'estimée, et la limite est écrite dans le
[CHANGELOG](CHANGELOG.md).

---

## Ce que le moteur sait faire

- **Tirer un itinéraire** qui tient dans la durée demandée, avec un temps de route plausible par pays.
- **Ne pas traverser la mer en voiture** : les masses terrestres sont modélisées, et un ferry réel est
  nécessaire pour changer d'île.
- **Chiffrer le voyage** : hébergement selon le budget, péages en fourchette (borne basse « probable »,
  borne haute « possible »), ferries, vignettes, recharges électriques.
- **Éviter les zones déconseillées** (359 règles, 94 pays, d'après France Diplomatie), en option.
- **Respecter les restrictions locales** : autoroutes interdites aux motos, ZFE, ZTL, zones à faibles
  émissions.
- **Exporter en PDF** dans les 161 langues, écritures arabe, hébraïque, CJK et indiennes comprises.

---

## Démarrer en local

```bash
npm install
npm start
```

`npm install` reconstruit les fichiers dérivés (bundles de données, index de recherche) — comptez
2 à 4 minutes. Le site écoute ensuite sur le port 3000.

```bash
npm test          # suite complète
npm run test:full # + les générateurs, reproduction à l'octet près
```

---

## Structure

```
server.js                  serveur Express : API, fichiers statiques, export PDF
lib/
  trip-engine.js           moteur de tirage (synchrone) et recherche de ville
  search-index.js          index de recherche précalculé sur disque
  trip-pdf.js              mise en page du PDF
  pdf-service.js           file d'attente et fil de travail de l'export
  land-grid.js             grille terre/mer
  toll-grid.js             grille de péage
  ferry-ports.js           ports géolocalisés (généré)
public/
  index.html  js/  css/    le site
  data/                    lieux et noms alternatifs, un fichier par pays
scripts/                   générateurs hors ligne (un par région du monde)
tests/                     suite de tests — voir tests/README.md
```

### Format des données

`public/data/communes-XX.txt`, une ligne par lieu :

```
population;longitude,latitude;code1,code2;région;nom[;commune]
```

Le 6e champ est facultatif et n'existe qu'en France : c'est la commune à laquelle un lieu-dit est
rattaché. Une ligne à cinq champs se lit exactement comme avant son introduction.

`public/data/aliases-XX.txt`, une ligne par nom alternatif :

```
langue;alias;nom publié
```

---

## Sources

- **Lieux** : [GeoNames](https://www.geonames.org) (CC BY 4.0) pour le monde ;
  [geo.api.gouv.fr](https://geo.api.gouv.fr) (IGN / Etalab) pour les communes françaises, complétées
  par les lieux-dits GeoNames.
- **Cartes** : [OpenStreetMap](https://www.openstreetmap.org) (ODbL) — tuiles, quais de ferry,
  contours d'îles ; [Natural Earth](https://www.naturalearthdata.com) (domaine public).
- **Photos** : [Wikimedia Commons](https://commons.wikimedia.org).
- **Bornes de recharge** : [Open Charge Map](https://openchargemap.org) (ODbL).
- **Zones à tension** : [France Diplomatie](https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/).
- **Ferries et péages** : sites des opérateurs et des concessionnaires, cités ligne par ligne dans
  `scripts/ferry-ports/` et `scripts/toll-reference.json`.

Les crédits complets figurent dans les [mentions légales](public/mentions-legales.html) du site.

---

## Déploiement

Hébergement mutualisé o2switch (cPanel + Passenger) :

1. `git pull`
2. **Run NPM Install** depuis cPanel — reconstruit bundles et index
3. **Restart**

Le serveur redémarre en ~30 s si l'index est à jour, en ~3 min s'il doit le reconstruire (ce qu'il
fait tout seul dès qu'un fichier de données a changé).

---

## Historique

Toutes les modifications, par date et avec leurs chiffres mesurés :
**[CHANGELOG.md](CHANGELOG.md)**.

Les limites connues — ce qui est mesuré, écrit, et volontairement non corrigé — y figurent à la date
où elles ont été établies.

> Ce README remplace une version de ~6 900 lignes qui racontait chaque passe d'audit. Le code y
> renvoie encore à 67 endroits, sous des formes comme « voir README, section *Onzième passe
> d'audit* » ou « *Pays couverts* » : ces sections sont désormais dans le CHANGELOG, à leur date.
> Les renvois n'ont pas été réécrits en masse — une substitution automatique aurait produit des
> renvois tout aussi faux.

---

## Licence

Projet privé. Les données conservent la licence de leur source (voir ci-dessus).
