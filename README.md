# Cap sur l'Inconnu

Générateur de road trip mystère : tirage au sort d'un itinéraire réel (jusqu'à 21 jours, 15 villes),
avec de vraies communes (France, Andorre, Espagne, Portugal, Belgique, Pays-Bas, Luxembourg, Suisse,
Allemagne, Italie, Autriche — voir "Pays couverts" plus bas pour l'ajout d'un nouveau pays), de vrais points
d'intérêt (OpenStreetMap), de vrais tarifs de péage, de vraies traversées en ferry pour la Corse/les
Baléares/les Canaries/la Sardaigne/la Sicile (voir "Ferries" plus bas) et une carte interactive
(Leaflet + tuiles OpenStreetMap). Interface disponible en français, anglais, espagnol, portugais,
néerlandais, allemand, luxembourgeois, italien, romanche, bas-allemand, sorabe, frison du Nord, sarde,
frioulan et ladin (voir "Langues" plus bas).

Anciennement un artefact Claude autonome (un seul fichier HTML) ; ce dossier est la même application
restructurée en petit projet Node.js statique, prête à héberger sur un serveur privé.

## Structure

```
cap-sur-linconnu/
├── package.json
├── server.js              # Express : sert public/ tel quel + une route GET /api/photo
├── scripts/
│   ├── build-country-communes.js  # génère public/data/communes-XX.txt pour un nouveau pays (GeoNames)
│   └── build-aliases.js           # génère public/data/aliases-XX.txt (noms multilingues, GeoNames)
├── public/
│   ├── index.html
│   ├── mentions-legales.html
│   ├── politique-confidentialite.html
│   ├── og-image.png       # carte de partage (Open Graph/Twitter Card), 1200×630
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── css/style.css
│   ├── js/app.js          # toute la génération d'itinéraire (client-side)
│   ├── js/i18n.js         # dictionnaire de traduction + sélecteur de langue (voir "Langues")
│   ├── js/theme.js        # bascule clair/sombre/auto, partagée par les 3 pages
│   ├── vendor/leaflet/    # Leaflet (BSD-2-Clause), hébergé localement — moteur de la carte du parcours
│   └── data/
│       ├── communes.txt        # ~35 000 communes françaises (nom, population, coordonnées, codes postaux, département)
│       ├── communes-ad.txt     # ~60 lieux andorrans, même format (voir "Pays couverts")
│       ├── communes-es.txt     # ~29 000 lieux espagnols, même format
│       ├── communes-pt.txt     # ~16 500 lieux portugais, même format
│       ├── communes-be.txt     # ~12 500 lieux belges, même format
│       ├── aliases-ad.txt      # noms alternatifs multilingues (voir "Langues") pour l'Andorre
│       ├── aliases-es.txt      # idem pour l'Espagne (~1 700 alias)
│       ├── aliases-pt.txt      # idem pour le Portugal
│       ├── aliases-be.txt      # idem pour la Belgique
│       ├── communes-nl.txt     # ~7 000 lieux néerlandais, même format
│       ├── aliases-nl.txt      # idem pour les Pays-Bas
│       ├── communes-lu.txt     # ~640 lieux luxembourgeois, même format
│       ├── aliases-lu.txt      # idem pour le Luxembourg (alias FR/DE/LB/... vers le nom canonique)
│       ├── communes-ch.txt     # ~11 400 lieux suisses, même format
│       ├── aliases-ch.txt      # idem pour la Suisse (alias FR/DE/IT/RM/... vers le nom canonique)
│       ├── communes-de.txt     # ~77 000 lieux allemands, même format
│       ├── aliases-de.txt      # idem pour l'Allemagne (alias FR/EN/NDS/HSB/FRR/... vers le nom canonique)
│       ├── communes-it.txt     # ~61 800 lieux italiens, même format
│       ├── aliases-it.txt      # idem pour l'Italie (alias FR/EN/SC/FUR/... vers le nom canonique)
│       ├── communes-at.txt     # ~20 000 lieux autrichiens, même format
│       ├── aliases-at.txt      # idem pour l'Autriche (alias FR/EN/ES/IT/... vers le nom canonique)
│       ├── featured.txt        # ~300 communes françaises avec de vrais points d'intérêt nommés (OSM)
│       └── toll-reference.json # 54 liaisons péage françaises réelles ayant servi à calculer le tarif €/km
│                                # (non chargé par l'app — conservé comme référence/source)
```

Le serveur sert les fichiers statiques et quatre routes dynamiques : `GET /api/photo?name=…&dept=…
&country=…&lang=…`, qui va chercher une vraie photo sur Wikipédia — dans la langue du VISITEUR
(`lang`), pas celle de la commune (voir plus bas), `GET /api/pois?lat=…&lon=…&country=…`, qui va
chercher de vrais points d'intérêt sur OpenStreetMap autour d'une commune (voir "Activités
réelles"), `GET /api/hike?name=…`, qui va chercher de vraies randonnées balisées sur Visorando pour
une commune française (voir "Randonnées réelles"), et `POST /api/export-pdf`, qui génère le PDF
téléchargeable de l'itinéraire affiché (voir "Export PDF"). Pas de base de données, pas de session,
pas de donnée utilisateur conservée au-delà de la réponse — juste un petit cache en mémoire pour
les trois premières routes.

## Pays couverts

Un pays à la fois plutôt que tout d'un coup — France, Andorre, Espagne, Portugal, Belgique, Pays-Bas,
Luxembourg, Suisse, Allemagne, Italie et Autriche pour l'instant, d'autres viendront. Chaque pays
ajoute deux à trois choses, indépendamment des autres :

1. **Un fichier `public/data/communes-XX.txt`** (même format compact que `communes.txt` — voir
   `scripts/build-country-communes.js`, qui télécharge et convertit les données publiques
   [GeoNames](https://www.geonames.org) — licence CC-BY 4.0 — pour le pays demandé : population,
   coordonnées, codes postaux, nom de région). Chargé au démarrage de l'app comme les autres
   (`COUNTRIES` dans `app.js`), fusionné dans le même tableau de communes que la France — une ville
   espagnole ou portugaise se cherche, se tire au sort et se compare aux autres exactement comme
   une ville française.
2. **Un réglage péage** (`TOLL_RATE_BY_COUNTRY` dans `app.js` — un pays sans réseau autoroutier à
   péage significatif, comme l'Andorre ou le Luxembourg, a `hasToll:false` : aucun montant n'est
   jamais affiché pour ce pays plutôt que d'en inventer un). L'Allemagne a aussi `hasToll:false`,
   pour la même raison — l'Autobahn est réellement gratuite pour tous les véhicules modélisés ici,
   seuls les poids lourds ≥3,5 t paient une redevance (LKW-Maut), hors du périmètre de l'app. La
   Suisse et l'Autriche ont `hasToll:false` pour une raison différente, tous les deux : leur réseau
   autoroutier est payant, via une vignette à prix fixe (Suisse : 40 CHF/an ; Autriche : de 12,80 €
   pour 10 jours à 106,80 €/an, asfinag.at) plutôt qu'un péage par trajet — aucun barème €/km ou
   CHF/km ne peut en dériver, et l'app ne simule pas un abonnement (voir le commentaire de
   `COUNTRIES` dans `app.js` pour le détail). L'Italie, elle, a un vrai réseau à péage classique avec
   barrière comme la France — `hasToll:true`, tarif dérivé du barème officiel Autostrade per l'Italia
   2026 (0,086 €/km retenu, entre les tarifs plaine/montagne). Pour la Suisse et l'Autriche (champ
   `vignette` dans `COUNTRIES`, un objet `{url}` pointant vers la boutique OFFICIELLE — via.admin.ch,
   shop.asfinag.at — jamais un revendeur tiers), l'itinéraire affiche un petit rappel « pensez à la
   commander avant de partir » avec un lien direct, une seule fois par pays même si le trajet y
   repasse plusieurs fois (`shownVignetteCountries` dans `renderDays`, web et PDF).
3. **Une devise** (`currency` dans `COUNTRIES`, `app.js` — EUR par défaut si absent). Seule la
   Suisse en a besoin pour l'instant (`CHF`) : elle détermine le plafond de prix affiché pour le
   logement (`BUDGET_PRICE_MAX`, un jeu de valeurs par devise, pas une simple conversion au taux de
   change) et la devise des liens de recherche Airbnb/Booking générés — jamais le péage/ferry, qui
   ne sont de toute façon jamais calculés pour un pays hors zone euro pour l'instant.

La carte du parcours (Leaflet + tuiles OpenStreetMap, voir plus bas) n'a besoin d'aucun réglage par
pays : les tuiles couvrent nativement le monde entier, il suffit que les nouvelles communes aient
des coordonnées valides.

Optionnel : **des alias multilingues** pour saisir une ville dans une autre langue que son nom
local (voir "Langues" ci-dessous, `scripts/build-aliases.js`) — non disponible pour la France (ses
communes viennent de geo.api.gouv.fr, pas de GeoNames, aucun identifiant commun pour les relier aux
noms alternatifs GeoNames).

## Langues

Interface traduite en français, anglais, espagnol, portugais, néerlandais, allemand, luxembourgeois,
italien, romanche, bas-allemand, sorabe, frison du Nord, sarde, frioulan et ladin (`public/js/i18n.js`
— dictionnaire à plat par langue + petit moteur `t(clé, variables)`/`tl(clé)` pour les listes). Le
luxembourgeois est arrivé avec le Luxembourg (voir "Pays couverts") : c'est sa 3ᵉ langue officielle,
aux côtés du français et de l'allemand déjà couverts. L'italien et le romanche sont arrivés avec la
Suisse, ses 3ᵉ et 4ᵉ langues officielles (français et allemand déjà couverts) — le romanche
(~40 000 locuteurs, Grisons) est traduit en rumantsch grischun (forme écrite standardisée).

Le bas-allemand, le sorabe et le frison du Nord sont arrivés avec l'Allemagne : trois de ses sept
langues régionales/minoritaires reconnues par la charte européenne (les trois autres — danois,
frison saterlandais, romani — restent hors périmètre pour l'instant, soit parce qu'une langue
nationale d'un pays non couvert n'a pas la même légitimité qu'une langue propre à un pays déjà
couvert, soit par absence de forme écrite standard unique). Le bas-allemand (plattdüütsch,
~2 à 5 millions de locuteurs, nord de l'Allemagne) est la mieux dotée en ressources des trois — niveau
de confiance comparable au luxembourgeois. Le sorabe (~20 000 locuteurs, Saxe/Brandebourg) est traité
comme une SEULE langue dans le sélecteur bien que GeoNames distingue haut-sorabe et bas-sorabe (voir
`scripts/build-aliases.js`, `LANG_OUTPUT_REMAP`) ; le frison du Nord (~10 000 locuteurs,
Schleswig-Holstein, dialecte Mooring) est très fragmenté en variantes locales. Ces deux dernières ont
un niveau de confiance nettement plus faible que les autres langues du projet : très peu de ressources
numériques disponibles pour vérifier le vocabulaire de langues aussi minoritaires — comme pour le
romanche, une relecture par un locuteur natif reste recommandée avant de considérer ces blocs comme
définitifs.

Le sarde, le frioulan et le ladin sont arrivés avec l'Italie : trois de ses douze langues minoritaires
reconnues (loi 482/1999) — les neuf autres (allemand du Tyrol du Sud, français/franco-provençal du
Val d'Aoste, slovène, croate, grec, albanais, catalan, occitan) restent hors périmètre, soit parce
qu'elles sont déjà des langues nationales d'un autre pays (le français n'a pas plus de légitimité
"italienne" que "française"), soit parce qu'elles ne concernent que de minuscules enclaves. Le sarde
(sardu, limba sarda comuna, ~1 à 1,5 million de locuteurs — la langue régionale la plus parlée
d'Italie) et le frioulan (furlan, ~600 000 locuteurs) ont un niveau de confiance comparable au
bas-allemand. Le ladin (~30 000 locuteurs, Dolomites, forme écrite ladin dolomitan) a un niveau de
confiance plus faible, comme le sorabe/frison du Nord — et n'a, en plus, AUCUN alias de ville : les
91 entrées "lld" du fichier GeoNames alternateNamesV2 italien pointent toutes vers des sommets/massifs
alpins, pas vers des communes, contrairement au sarde/frioulan qui ont une vraie toponymie de
localités. Le ladin reste une langue d'interface complète, seule la recherche de ville par son nom
ladin n'est pas possible (comme pour la France, qui n'a aucun alias du tout).

L'Autriche, elle, n'a apporté aucune nouvelle langue : ses 6 langues minoritaires reconnues
(Volksgruppengesetz — croate du Burgenland, tchèque, hongrois, romani, slovaque, slovène) sont
toutes déjà des langues nationales d'un pays voisin non encore couvert (croate, tchèque, hongrois,
slovaque, slovène), sauf le romani qui n'a pas de forme écrite standard unique — exactement les deux
mêmes motifs d'exclusion déjà appliqués aux 9 langues minoritaires italiennes ci-dessus. L'allemand,
déjà couvert (voir le Luxembourg et l'Allemagne plus haut), reste sa seule langue officielle.

Bouton de sélection à côté du bouton de thème, avec un champ de recherche (pensé pour accueillir
d'autres langues sans devenir illisible) ; le choix est mémorisé (`localStorage`, comme le thème)
et, à défaut, détecté depuis la langue du navigateur. Un changement de langue en cours de session
retraduit aussi bien le formulaire qu'un itinéraire déjà affiché, sans le retirer au sort (voir
l'écouteur `i18n:langchange` dans `app.js`) — un `leg.__poiUpgradeStarted` (même principe que
`leg.__hikePromise`, déjà utilisé pour les randonnées) garantit qu'aucun ré-affichage ne redemande
Overpass/Visorando ni ne reconsomme la file de points d'intérêt partagée entre les jours d'un même
séjour.

Les pages de mentions légales et de politique de confidentialité restent pour l'instant uniquement
en français (texte juridique dense, hors du périmètre de ce premier passage).

**Saisir une ville dans une autre langue** (ex. "Anvers" plutôt que "Antwerpen", "Séville" plutôt
que "Sevilla") : `scripts/build-aliases.js` télécharge le fichier GeoNames `alternateNamesV2` par
pays (noms alternatifs déjà étiquetés par langue ISO — la source faite pour ce besoin, plutôt qu'une
petite table maintenue à la main) et produit `public/data/aliases-XX.txt` (une ligne par alias :
`langue;alias;nom canonique`). Chargés au démarrage comme les fichiers de communes, ils élargissent
simplement la recherche (`searchCommunes` dans `app.js`) : un alias reconnu, dans n'importe laquelle
des langues couvertes, résout vers la commune réelle avec son vrai nom local — jamais l'alias saisi,
qui n'était qu'un moyen de la trouver.

Les activités (points d'intérêt OpenStreetMap) et les photos (Wikipédia) fonctionnent déjà pour
n'importe quel pays sans réglage supplémentaire — seule l'extraction de la section "Lieux et
monuments" d'un article Wikipédia (voir "Activités réelles") reste, pour l'instant, spécifique au
français (conventions de titres de section propres à Wikipédia FR) ; les randonnées Visorando
restent, elles, propres à la France (pas de couverture internationale chez eux).

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

- **Désambiguïsation par région** : plusieurs communes partagent le même nom (trois « Thoiry »
  françaises, par exemple). Le serveur essaie d'abord `"Nom (Région)"` — la convention de Wikipédia
  pour ces homonymes — avant `"Nom"` seul, et renvoie « pas de photo » plutôt qu'une image
  potentiellement fausse si la page reste une page d'homonymie. « Région » vient de la table
  `DEPARTMENTS` pour la France, et directement des données pour les autres pays (voir "Pays
  couverts").
- **Langue du visiteur, pas celle de la commune** : l'article Wikipédia consulté (et donc la photo
  et le lien renvoyés) est dans la langue du navigateur du visiteur (`VISITOR_LANG` côté client,
  `lang` transmis à `/api/photo`) — une commune espagnole s'affiche en espagnol pour un visiteur
  hispanophone, en français pour un visiteur francophone, etc.
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
- **En complément d'Overpass, pour les communes françaises** (voir "Pays couverts" : conventions de
  section propres à Wikipédia en français, pas encore adaptées aux autres langues), l'app essaie
  aussi de lire la section « Lieux et monuments » (ou « Patrimoine ») de l'article Wikipédia de la
  commune elle-même, quand elle existe : souvent plus riche et déjà sourcée (base Mérimée...), et
  parfois déjà illustrée via une galerie de photos — y compris pour des lieux qui n'ont pas leur
  propre article Wikipédia (donc introuvables par la photo habituelle), comme une petite église ou
  chapelle de village. Les deux sources sont combinées et dédoublonnées par nom.
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

## Ferries

Une île n'est jamais reliée au continent par la route : le moteur de distance (vol d'oiseau × 1,17,
voir `roadDistanceKm` dans `app.js`) n'a par nature aucune idée de la mer. Sans ce qui suit, un
trajet pouvait "traverser" la Méditerranée ou l'Atlantique comme une route normale, silencieusement
faux. Décoché par défaut (comme "Autoroutes à péage autorisées", juste au-dessus dans le
formulaire) — le tirage au sort reste alors confiné à la même masse continentale du début à la fin.

- **Coché**, le tirage peut inclure la **Corse**, les **Baléares**, les **Canaries**, les **îles
  Wadden** (Pays-Bas — Texel, Vlieland, Terschelling, Ameland, Schiermonnikoog), la **Sardaigne**
  ou la **Sicile**, reliées au continent par une vraie ligne de ferry réelle (durée et tarif fixes
  par ligne, voir `FERRY_ROUTES` dans `app.js` — pas un calcul au km/heure comme la route, un ferry
  ne va pas plus vite avec un moteur plus puissant). Fonctionne pour tous les modes de transport, y
  compris le vélo (tarif piéton avec vélo, moins cher qu'une place véhicule) — contrairement au
  péage autoroutier, qui lui reste interdit au vélo. Pour les îles Wadden spécifiquement, un seul
  tarif (celui de TESO/Texel, la ligne la plus "classique" en voiture) est réutilisé pour les
  quatre autres — leurs traversées réelles (Doeksen, Wagenborg) sont nettement plus chères et
  l'accès en voiture souvent plus restreint en pratique : approximation plus grossière que pour la
  Corse/les Baléares/les Canaries sur ces quatre-là spécifiquement. La Sicile est un cas à part
  parmi les traversées longues : le détroit de Messine ne fait que ~3 km, une traversée courte
  (~20-25 min) bien plus proche du profil des îles Wadden que de la Corse — aucun pont routier
  n'existe à ce jour (2026), le projet "ponte sullo Stretto di Messina" étant encore au stade de
  l'autorisation administrative (mise en service visée au plus tôt 2033-2034).
- **Volontairement pas d'avion**, même pour les Canaries (la traversée la plus longue, ~40h) : le
  principe d'un road trip est de garder SON véhicule tout du long, ce qu'un ferry permet et un vol
  non. Concrètement, ça exclut les **Açores et Madère** : aucune ligne maritime régulière n'existe
  aujourd'hui entre le Portugal continental et ces archipels — seulement des projets/annonces
  politiques (2025-2026), rien d'opérationnel. Ces communes restent accessibles comme point de
  départ (recherche manuelle) mais jamais comme étape reliée au reste d'un itinéraire, même avec
  les ferries activés — l'absence d'entrée dans `FERRY_ROUTES` pour ces archipels suffit à les
  exclure, sans code spécifique.
- La détection "cette commune est sur quelle masse continentale" (`landmassOf` dans `app.js`) est
  exacte pour la France (le code département distingue déjà la Corse, 2A/2B), pour les Pays-Bas
  (chaque île Wadden est sa propre commune, le champ région y est directement son nom) et pour
  l'Italie (comparaison exacte à la liste des provinces de Sardaigne/Sicile, le champ région y étant
  un nom de province en clair) ; par coordonnées pour l'Espagne/le Portugal (le champ région de ces
  deux pays n'étant pas exploitable pour ça — voir "Pays couverts" ci-dessus).
- Limite connue : les petites îles françaises sans pont ni département propre (Belle-Île, Ouessant,
  Groix...) ne sont pas détectées individuellement et restent traitées comme le continent le plus
  proche — un cas rare (quelques dizaines de communes sur ~35 000) laissé de côté pour l'instant.
  De même, les 9 îles de l'archipel des Açores sont regroupées sous une seule étiquette : un trajet
  qui resterait entièrement dans les Açores pourrait proposer un trajet routier entre deux îles
  différentes de l'archipel, alors qu'il faudrait en réalité un bateau/avion inter-îles — un cas
  qui ne peut survenir qu'en partant soi-même d'une commune des Açores (jamais depuis le continent,
  voir plus haut), donc rare en pratique.

## Export PDF

Le bouton "Exporter cet itinéraire en PDF" (entre le journal de bord et le sac à préparer, une fois
un itinéraire tiré) télécharge directement un vrai fichier `.pdf` — pas de fenêtre d'impression du
navigateur à gérer soi-même. Le client envoie l'état actuel du voyage tel qu'affiché à l'écran
(POI réels et randonnée Visorando déjà résolus, si trouvés) à `POST /api/export-pdf`, qui met en
page le document avec [pdfkit](https://pdfkit.org/) (pur JavaScript, sans binaire externe type
Chromium — adapté à un hébergement mutualisé) et le renvoie en réponse, sans rien conserver côté
serveur. Le PDF inclut de vrais liens cliquables vers les randonnées Visorando et les recherches
Airbnb/Booking.

## Thème clair / sombre

Le contrôle "Auto / Clair / Sombre" en haut de chaque page (index, mentions légales, politique de
confidentialité) permet de forcer un thème, en plus du choix automatique selon la préférence système
du visiteur (`prefers-color-scheme`, déjà géré par `style.css`). Le choix est mémorisé dans le
`localStorage` du navigateur (`js/theme.js`, partagé par les trois pages) — jamais envoyé au
serveur. Un petit script identique et synchrone, exécuté dans le `<head>` de chaque page avant le
chargement de la feuille de style, applique le choix mémorisé pour éviter un flash du mauvais thème
au chargement.

## Référencement (SEO)

- `robots.txt` autorise l'exploration du site, bloque `/api/` et `/data/` (routes techniques et
  fichiers de données bruts, pas des pages), et pointe vers `sitemap.xml`.
- `sitemap.xml` liste les trois pages du site.
- Chaque page a son propre `<title>`, sa méta description, un lien `rel="canonical"`, ainsi que les
  balises Open Graph / Twitter Card (voir carte de partage ci-dessus). La page d'accueil porte en
  plus des données structurées [schema.org](https://schema.org) (`WebApplication`), les deux pages
  légales un `WebPage` plus léger.

## Sources des données

- Communes françaises : [geo.api.gouv.fr](https://geo.api.gouv.fr) (IGN / Etalab, licence ouverte).
- Communes andorranes/espagnoles/portugaises/belges/néerlandaises/luxembourgeoises/suisses/allemandes/italiennes/autrichiennes : [GeoNames](https://www.geonames.org)
  (licence [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/)) — voir "Pays couverts" ci-dessus.
- Alias multilingues de ces mêmes communes : GeoNames `alternateNamesV2` (même licence CC-BY 4.0) —
  voir "Langues" ci-dessus.
- Points d'intérêt : [OpenStreetMap](https://www.openstreetmap.org) via l'API Overpass — figés dans
  `featured.txt` pour ~300 communes françaises, interrogés en direct via `/api/pois` pour les autres
  (voir "Activités réelles" ci-dessus), dans tous les pays couverts — © les contributeurs
  d'OpenStreetMap, licence [ODbL](https://opendatacommons.org/licenses/odbl/).
- Fond de carte : tuiles [OpenStreetMap](https://www.openstreetmap.org) standard, chargées via
  [Leaflet](https://leafletjs.com) (licence BSD-2-Clause, hébergé localement) — © les contributeurs
  d'OpenStreetMap, licence ODbL.
- Tarifs de péage : guides tarifaires officiels [VINCI Autoroutes](https://www.vinci-autoroutes.com)
  (France — voir `public/data/toll-reference.json` pour le détail des 54 liaisons utilisées),
  [Autopistas/Abertis](https://www.autopistas.com) (Espagne), [Ascendi](https://www.ascendi.pt) /
  [Via Verde](https://www.vialivre.pt) (Portugal), [Autostrade per l'Italia](https://www.autostrade.it)
  (Italie) — voir "Pays couverts" pour la méthode de calcul hors de France (échantillon plus
  restreint que pour la France).
- Photos et région de désambiguïsation : [Wikipédia](https://www.wikipedia.org) (API REST, dans la
  langue du visiteur — voir "Pays couverts" — images sous licence Wikimedia Commons, crédit affiché
  sous chaque photo) ; [geo.api.gouv.fr](https://geo.api.gouv.fr) pour les codes département français.
- Randonnées : [Visorando](https://www.visorando.com) (France uniquement) — nom, distance, durée et
  difficulté affichés à titre indicatif, lien direct vers leur page pour le tracé complet (voir
  "Randonnées réelles" ci-dessus).
- Tarifs et durées de ferry : [Corsica Linea](https://www.corsicalinea.com) / [Corsica
  Ferries](https://www.corsica-ferries.fr) (Corse), [Baleària](https://www.balearia.com) (Baléares),
  [Naviera Armas/Baleària Canarias](https://armastrasmediterranea.com) (Canaries),
  [TESO](https://www.teso.nl) (îles Wadden), [Moby](https://www.moby.it)/[Tirrenia](https://www.tirrenia.it)
  (Sardaigne), [Caronte & Tourist](https://www.carontetourist.it) (Sicile, détroit de Messine) — voir
  "Ferries" ci-dessus pour la méthode (un ordre de grandeur indicatif par ligne, comme pour les
  péages, pas un tarif garanti).

Toutes ces données sont figées au moment de la génération de ce projet (2026). Pour les rafraîchir,
relancez les mêmes sources et remplacez les fichiers dans `public/data/`.
