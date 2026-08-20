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
├── server.js              # Express : sert public/ tel quel + une route GET /api/photo
├── public/
│   ├── index.html
│   ├── mentions-legales.html
│   ├── politique-confidentialite.html
│   ├── css/style.css
│   ├── js/app.js          # toute la génération d'itinéraire (client-side)
│   └── data/
│       ├── communes.txt        # ~35 000 communes (nom, population, coordonnées, codes postaux, département)
│       ├── featured.txt        # ~300 communes avec de vrais points d'intérêt nommés (OSM)
│       ├── france-map.json     # contour simplifié de la France + paramètres de projection
│       └── toll-reference.json # 54 liaisons péage réelles ayant servi à calculer le tarif €/km
│                                # (non chargé par l'app — conservé comme référence/source)
```

Le serveur sert les fichiers statiques et quatre routes dynamiques : `GET /api/photo?name=…&dept=…`,
qui va chercher une vraie photo sur Wikipédia (voir plus bas), `GET /api/pois?lat=…&lon=…`, qui va
chercher de vrais points d'intérêt sur OpenStreetMap autour d'une commune (voir "Activités
réelles"), `GET /api/hike?name=…`, qui va chercher une vraie randonnée balisée sur Visorando pour
une commune (voir "Randonnées réelles"), et `POST /api/export-pdf`, qui génère le PDF téléchargeable
de l'itinéraire affiché (voir "Export PDF"). Pas de base de données, pas de session, pas de donnée
utilisateur conservée au-delà de la réponse — juste un petit cache en mémoire pour les trois
premières routes.

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

**Sur hébergement mutualisé avec Apache/cPanel** (ex. o2switch, "Setup Node.js App" via Passenger) :
Apache expose alors généralement la racine du projet, pas seulement `public/` — `server.js`,
`package.json` et `package-lock.json` deviennent consultables publiquement en clair si rien ne les
bloque explicitement (vérifiable avec `curl -I https://votre-domaine/server.js` : un `200` confirme
le problème). Voir `.htaccess-security-block.txt` à la racine du dépôt pour un bloc de règles à
ajouter — **pas à copier en écrasant** — au `.htaccess` généré par cPanel (qui contient les
directives Passenger nécessaires au fonctionnement de l'app). Ce même fichier explique aussi
pourquoi `public/data/*.txt`/`*.json` ne sont volontairement pas bloqués : ce sont les données que
le navigateur charge lui-même au démarrage de l'app.

## Photos réelles

Un artefact Claude ne peut charger aucune image externe (CSP) ; sur ce serveur, cette limite n'existe
plus. Chaque étape affiche donc une vraie photo (récupérée via `GET /api/photo`, qui interroge
l'API REST de Wikipédia côté serveur et met le résultat en cache 24h en mémoire) plutôt qu'un simple
lien à ouvrir. Points notables de l'implémentation :

- **Désambiguïsation par département** : plusieurs communes françaises partagent le même nom (trois
  « Thoiry », par exemple). Le serveur essaie d'abord `"Nom (Département)"` — la convention de
  Wikipédia pour ces homonymes — avant `"Nom"` seul, et renvoie « pas de photo » plutôt qu'une image
  potentiellement fausse si la page reste une page d'homonymie.
- Pas de clé API requise (l'API REST de Wikipédia est publique et gratuite).
- Si aucune photo n'existe pour une commune (petits villages sans page dédiée), la tuile retombe sur
  un lien de recherche d'images classique — jamais d'image cassée.

Aucune autre limite technique d'artefact ne s'applique plus non plus : vous pourriez par exemple
ajouter un vrai backend (API Airbnb si vous obtenez un accès, rafraîchissement périodique des données
OpenStreetMap, etc.) sans les contraintes précédentes.

## Activités réelles

`featured.txt` ne couvre que ~300 communes sur 35 000 (voir les notes dans `public/js/app.js` sur le
biais géographique que ça causait pour la sélection de destination — corrigé). Plutôt que d'inventer
une activité générique pour les 34 700 autres, l'app interroge en tâche de fond l'API Overpass
(OpenStreetMap) au moment où une commune est tirée, pour la commune précise choisie — même famille de
catégories que celles ayant servi à constituer `featured.txt` à l'origine (musées, châteaux,
monuments, points de vue, réserves naturelles...). Points notables :

- Interrogé une seule fois par commune (cache serveur 14 jours) : la plupart des affichages
  bénéficient du cache dès qu'une commune a été tirée une première fois, par n'importe quel visiteur.
- Trois miroirs Overpass publics essayés en série (overpass.openstreetmap.fr — hébergé en France,
  le plus rapide/fiable en test —, puis overpass-api.de, puis overpass.kumi.systems en dernier
  recours) — ces instances publiques peuvent être lentes ou temporairement saturées ; c'est sans
  gravité ici car la requête part après l'affichage initial du trajet (activités génériques), jamais
  avant. Si rien ne répond, les activités génériques restent affichées telles quelles — pas d'erreur
  visible. Un garde-fou revérifie aussi la distance réelle de chaque résultat (Overpass garantit que
  la *géométrie* d'un lieu croise le rayon demandé, pas que son centre calculé y reste — une grande
  zone comme une réserve naturelle peut avoir un centre à des dizaines de km du point concerné).
- **En complément d'Overpass**, l'app essaie aussi de lire la section « Lieux et monuments » (ou
  « Patrimoine ») de l'article Wikipédia de la commune elle-même, quand elle existe : souvent plus
  riche et déjà sourcée (base Mérimée...), et parfois déjà illustrée via une galerie de photos —
  y compris pour des lieux qui n'ont pas leur propre article Wikipédia (donc introuvables par la
  photo habituelle), comme une petite église ou chapelle de village. Les deux sources sont combinées
  et dédoublonnées par nom.
- Chaque lieu réel trouvé tente ensuite sa propre photo Wikipédia (voir "Photos réelles" ci-dessus),
  sauf s'il en a déjà une via la galerie de l'article de la commune — aucune image n'est stockée sur
  le serveur, juste des liens vers Wikimedia Commons.

## Randonnées réelles

Quand aucun point d'intérêt de plein air (point de vue, cascade, réserve naturelle...) n'a été
trouvé pour la suggestion "balade" d'une journée, l'app tente de la remplacer par une vraie
randonnée balisée trouvée sur [Visorando](https://www.visorando.com), plutôt que de garder une
formule générique du type « Randonnée ou balade dans les environs ». Pour ne pas réutiliser leur
travail sans le créditer :

- Seuls le **nom**, le **lien**, la **distance**, la **durée** et la **difficulté** de la
  randonnée sont récupérés (des faits, pas leur texte de description, ni leur trace GPS, ni leurs
  photos) — voir `extractVisorandoHikes` dans `server.js`.
- La carte affichée dans l'app est un vrai lien cliquable (`<a target="_blank">`) qui **renvoie
  directement vers la page de cette randonnée précise** sur visorando.com (jamais vers une page de
  recherche), avec une mention explicite « Source : Visorando » sur la carte elle-même.
- `robots.txt` de visorando.com autorise la lecture de ces pages publiques (seule leur API interne,
  `component=webservices`, est explicitement exclue — non utilisée ici).
- Mis en cache serveur 14 jours par commune, avec le même principe que pour les activités
  Overpass : un échec réseau n'est jamais mis en cache (on retentera au prochain tirage), seul un
  « pas de page trouvée pour cette commune » légitime l'est.
- Si Visorando ne renvoie rien pour la commune tirée, la formule générique reste affichée telle
  quelle — aucune erreur visible.

## Export PDF

Le bouton "Exporter cet itinéraire en PDF" (entre le journal de bord et le sac à préparer, une fois
un itinéraire tiré) télécharge directement un vrai fichier `.pdf` — pas de fenêtre d'impression du
navigateur à gérer soi-même. Le client envoie l'état actuel du voyage tel qu'affiché à l'écran
(POI réels et randonnée Visorando déjà résolus, si trouvés) à `POST /api/export-pdf`, qui met en
page le document avec [pdfkit](https://pdfkit.org/) (pur JavaScript, sans binaire externe type
Chromium — adapté à un hébergement mutualisé) et le renvoie en réponse, sans rien conserver côté
serveur. Le PDF inclut de vrais liens cliquables vers les randonnées Visorando et les recherches
Airbnb/Booking.

## Sources des données

- Communes : [geo.api.gouv.fr](https://geo.api.gouv.fr) (IGN / Etalab, licence ouverte).
- Points d'intérêt : [OpenStreetMap](https://www.openstreetmap.org) via l'API Overpass — figés dans
  `featured.txt` pour ~300 communes, interrogés en direct via `/api/pois` pour les autres (voir
  "Activités réelles" ci-dessus) — © les contributeurs d'OpenStreetMap, licence
  [ODbL](https://opendatacommons.org/licenses/odbl/).
- Contour de la France : [gregoiredavid/france-geojson](https://github.com/gregoiredavid/france-geojson)
  (dérivé IGN).
- Tarifs de péage : guides tarifaires officiels [VINCI Autoroutes](https://www.vinci-autoroutes.com)
  (ASF, Cofiroute — voir `public/data/toll-reference.json` pour le détail des 54 liaisons utilisées).
- Photos et département de désambiguïsation : [Wikipédia](https://fr.wikipedia.org) (API REST,
  images sous licence Wikimedia Commons — crédit affiché sous chaque photo) ;
  [geo.api.gouv.fr](https://geo.api.gouv.fr) pour les codes département.
- Randonnées : [Visorando](https://www.visorando.com) — nom, distance, durée et difficulté
  affichés à titre indicatif, lien direct vers leur page pour le tracé complet (voir "Randonnées
  réelles" ci-dessus).

Toutes ces données sont figées au moment de la génération de ce projet (2026). Pour les rafraîchir,
relancez les mêmes sources et remplacez les fichiers dans `public/data/`.
