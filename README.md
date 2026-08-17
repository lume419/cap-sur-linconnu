# Cap sur l'Inconnu

Générateur de road trip mystère : tirage au sort d'un itinéraire réel (jusqu'à 21 jours, 15 villes),
avec de vraies communes françaises, de vrais points d'intérêt (OpenStreetMap), de vrais tarifs de
péage (VINCI Autoroutes) et une carte de France projetée depuis le contour officiel (IGN).

Anciennement un artefact Claude autonome (un seul fichier HTML) ; ce dossier est la même application
restructurée en petit projet Node.js statique, prête à héberger sur un serveur privé.

## Structure

```
cap-sur-linconnu/
├── package.json
├── server.js              # serveur Express minimal, sert public/ tel quel
├── public/
│   ├── index.html
│   ├── css/style.css
│   ├── js/app.js          # toute la logique (client-side, aucun état côté serveur)
│   └── data/
│       ├── communes.txt        # ~35 000 communes (nom, population, coordonnées, codes postaux)
│       ├── featured.txt        # ~300 communes avec de vrais points d'intérêt nommés (OSM)
│       ├── france-map.json     # contour simplifié de la France + paramètres de projection
│       └── toll-reference.json # 54 liaisons péage réelles ayant servi à calculer le tarif €/km
│                                # (non chargé par l'app — conservé comme référence/source)
```

Le serveur ne fait que servir des fichiers statiques : pas de base de données, pas de session, pas de
donnée utilisateur conservée. Toute la génération d'itinéraire se fait dans le navigateur.

## Démarrer en local

```bash
npm install
npm start
```

Puis ouvrez `http://localhost:3000`. Le port peut être changé via la variable d'environnement `PORT`.

## Déployer sur un serveur privé

N'importe quelle méthode standard de déploiement Node.js convient, par exemple :

**Avec PM2** (garde le process vivant, redémarre au reboot) :
```bash
npm install -g pm2
pm2 start server.js --name cap-sur-linconnu
pm2 save
pm2 startup
```

**Avec un reverse proxy** (nginx ou Caddy) devant Express, pour le HTTPS et le nom de domaine — le
serveur Express n'écoute que sur `127.0.0.1:3000` (ou le `PORT` choisi), le proxy fait le reste.

Comme l'app sert des fichiers statiques, elle fonctionne aussi tout aussi bien derrière n'importe quel
serveur de fichiers statiques (nginx seul, Caddy seul, etc.) en pointant directement sur `public/` —
`server.js` n'est là que par simplicité.

## Différences avec la version « artefact Claude »

- Les données (communes, points d'intérêt, contour de carte) ne sont plus embarquées dans un seul
  fichier HTML géant : elles sont chargées via `fetch()` au démarrage depuis `public/data/`. Le champ
  « Ville de départ » reste désactivé le temps du chargement (quelques dizaines de ms en local).
- Un serveur privé n'a plus la contrainte CSP d'un artefact Claude (qui bloque tout chargement
  d'image externe). Les liens « Photos » / « Wikipédia » pourraient donc devenir de vraies vignettes
  intégrées (`<img>`) si vous le souhaitez — ce n'est pas fait ici pour rester fidèle à la version
  d'origine, mais c'est une amélioration facile à ajouter dans `app.js` (fonction `buildPhotoLinks`
  et son usage dans `renderDays`).
- Aucune autre limite technique d'artefact ne s'applique plus : vous pourriez par exemple ajouter un
  vrai backend (API Airbnb si vous obtenez un accès, cache serveur des données OpenStreetMap pour les
  rafraîchir périodiquement, etc.) sans les contraintes précédentes.

## Sources des données

- Communes : [geo.api.gouv.fr](https://geo.api.gouv.fr) (IGN / Etalab, licence ouverte).
- Points d'intérêt : [OpenStreetMap](https://www.openstreetmap.org) via l'API Overpass, © les
  contributeurs d'OpenStreetMap, licence [ODbL](https://opendatacommons.org/licenses/odbl/).
- Contour de la France : [gregoiredavid/france-geojson](https://github.com/gregoiredavid/france-geojson)
  (dérivé IGN).
- Tarifs de péage : guides tarifaires officiels [VINCI Autoroutes](https://www.vinci-autoroutes.com)
  (ASF, Cofiroute — voir `public/data/toll-reference.json` pour le détail des 54 liaisons utilisées).

Toutes ces données sont figées au moment de la génération de ce projet (2026). Pour les rafraîchir,
relancez les mêmes sources et remplacez les fichiers dans `public/data/`.
