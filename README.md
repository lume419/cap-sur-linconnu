# Cap sur l'Inconnu

Générateur de road trip mystère : tirage au sort d'un itinéraire réel (jusqu'à 21 jours, 15 villes),
avec de vrais lieux dans 239 pays et territoires (`COUNTRIES` dans `public/js/trip-data.js` — voir
"Pays couverts" plus bas pour l'ajout d'un nouveau pays), de vrais points d'intérêt (OpenStreetMap),
de vrais tarifs de péage, de vraies traversées en ferry (voir "Ferries" plus bas) et une carte
interactive (Leaflet + tuiles OpenStreetMap). Interface disponible en 161 langues (`SUPPORTED` dans
`public/js/i18n.js`, voir "Langues" plus bas).

Anciennement un artefact Claude autonome (un seul fichier HTML) ; ce dossier est la même application
restructurée en projet Node.js (Express) — pages statiques, recherche de ville et tirage côté serveur —,
prête à héberger sur un serveur privé.

## Structure

```
cap-sur-linconnu/
├── package.json
├── server.js              # Express : pages de public/ (sauf /data/, en 404) + routes /api/ (liste plus bas)
├── lib/
│   ├── trip-engine.js     # moteur côté serveur : recherche de ville et tirage d'itinéraire
│   ├── search-index.js    # index de recherche sur disque (cache/search-index/, voir plus bas)
│   ├── land-grid.js       # grille terre/eau lib/land-grid.bin (voir "Pas de route à travers la mer")
│   ├── toll-grid.js       # où le péage existe vraiment (data/toll-grid.json, OpenStreetMap)
│   ├── pdf-text.js        # mise en page du PDF : polices Noto, écritures RTL, coupure des lignes
│   └── ferry-ports.js     # GÉNÉRÉ par scripts/build-ferry-ports.js : ports des liaisons de ferry
├── data/                  # données NON servies au navigateur (bloquées côté Apache et par Node)
│   ├── charging-stations.txt  # bornes de recharge Open Charge Map (voiture électrique)
│   ├── hiking.json            # portails de randonnée par pays (scripts/build-hiking-data.js)
│   ├── toll-grid.json         # cases de 0,25° où une autoroute à péage existe (scripts/build-toll-grid.js)
│   └── road-factor-osrm.json  # relevé des 128 itinéraires OSRM qui fixent ROAD_FACTOR et les vitesses
├── scripts/
│   ├── build-toll-grid.js         # data/toll-grid.json : autoroutes à péage réelles (Overpass/OSM)
│   ├── measure-road-factor.js     # mesure ROAD_FACTOR et la vitesse moyenne sur de vrais itinéraires OSRM
│   ├── build-country-communes.js  # génère public/data/communes-XX.txt pour un nouveau pays (GeoNames)
│   ├── build-aliases.js           # génère public/data/aliases-XX.txt (noms multilingues, GeoNames)
│   ├── parse-ba-wiki-postal.js    # BOSNIE-HERZÉGOVINE SEULEMENT : extrait la liste Wikipedia des
│   │                                # codes postaux (GeoNames n'en a aucun pour ce pays, voir plus bas)
│   ├── build-ba-communes.js       # BOSNIE-HERZÉGOVINE SEULEMENT : rapproche par NOM (pas par
│   │                                # coordonnées) les communes GeoNames des codes Wikipedia
│   └── build-ba-aliases.js        # BOSNIE-HERZÉGOVINE SEULEMENT : alias multilingues, même principe
├── public/
│   ├── index.html
│   ├── mentions-legales.html
│   ├── politique-confidentialite.html
│   ├── og-image.png       # carte de partage (Open Graph/Twitter Card), 1200×630
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── css/style.css
│   ├── js/app.js          # interface : formulaire, appels /api/, rendu de l'itinéraire et de la carte
│   ├── js/trip-data.js    # tables partagées navigateur/serveur : COUNTRIES, péages, ferries, îles
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
│       │                        # (catalan compris — rattrapage catalan/basque/galicien/occitan,
│       │                        # voir "Langues")
│       ├── aliases-es.txt      # idem pour l'Espagne (basque et catalan compris depuis le rattrapage)
│       ├── aliases-pt.txt      # idem pour le Portugal (mirandais compris depuis le rattrapage)
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
│       ├── communes-sm.txt     # 24 lieux saint-marinais, même format
│       ├── aliases-sm.txt      # idem pour Saint-Marin (alias FR/EN/ES/IT/PT/DE/RM)
│       ├── communes-li.txt     # 67 lieux liechtensteinois, même format
│       ├── aliases-li.txt      # idem pour le Liechtenstein (1 alias : Gamprin-Bendern)
│       ├── communes-mc.txt     # 1 lieu (Monaco lui-même — micro-Etat, pas de subdivision GeoNames)
│       ├── aliases-mc.txt      # idem pour Monaco (1 alias : "Mùnegu", nom monégasque)
│       ├── communes-mt.txt     # 191 lieux maltais (Malte + Gozo), même format
│       ├── aliases-mt.txt      # idem pour Malte (alias FR/EN/ES/IT/DE/PT/NDS/MT/...)
│       ├── communes-gg.txt     # 246 lieux guernesiais, même format (Sercq exclue, voir "Ferries")
│       ├── aliases-gg.txt      # idem pour Guernesey
│       ├── communes-je.txt     # 84 lieux jersiais, même format
│       ├── aliases-je.txt      # idem pour Jersey (alias FR/EN/DE/NRF-JE/...)
│       ├── communes-cz.txt     # ~16 400 lieux tchèques, même format (Prague/Plzeň corrigés)
│       ├── aliases-cz.txt      # idem pour la République tchèque (allemand en tête)
│       ├── communes-pl.txt     # ~45 400 lieux polonais, même format (Warszawa/Łódź/Bielsko-Biała corrigés)
│       ├── aliases-pl.txt      # idem pour la Pologne (alias FR/EN/DE/CSB/RUE/...)
│       ├── communes-sk.txt     # ~4 985 lieux slovaques, même format (aucune correction nécessaire)
│       ├── aliases-sk.txt      # idem pour la Slovaquie (hongrois en tête, rusyn dans l'est du pays)
│       ├── communes-hu.txt     # ~10 050 lieux hongrois, même format (aucune correction nécessaire)
│       ├── aliases-hu.txt      # idem pour la Hongrie (allemand en tête)
│       ├── communes-si.txt     # ~6 559 lieux slovènes, même format (aucune correction nécessaire)
│       ├── aliases-si.txt      # idem pour la Slovénie (dont l'italien de la côte istrienne)
│       ├── communes-hr.txt     # ~11 323 lieux croates, même format (48 noms corrigés Ð->Đ, voir
│       │                        # scripts/build-country-communes.js, confusion de caractère GeoNames)
│       ├── aliases-hr.txt      # idem pour la Croatie (dont l'italien d'Istrie et de Dalmatie)
│       ├── communes-ba.txt     # 374 lieux bosniens SEULEMENT (codes postaux Wikipedia, pas GeoNames
│       │                        # — voir "Pays couverts" et scripts/build-ba-communes.js)
│       ├── aliases-ba.txt      # idem pour la Bosnie-Herzégovine
│       ├── communes-gb.txt     # 34 195 lieux britanniques, même format (codes postaux "outward"
│       │                        # GeoNames — districts, pas des codes complets, voir "Pays couverts")
│       ├── aliases-gb.txt      # idem pour le Royaume-Uni (doublons gallois/gaéliques/corniques
│       │                        # mal étiquetés "br"/"ca"/"eu"/... écartés, voir le
│       │                        # commentaire CELTIC_PROBE_LANGS dans scripts/build-aliases.js)
│       ├── communes-ie.txt     # 7 181 lieux irlandais, même format (codes postaux GeoNames très
│       │                        # grossiers pour l'Irlande — 139 "routing keys" Eircode nationaux
│       │                        # seulement, contre 27 450 districts au Royaume-Uni ; huit exonymes
│       │                        # anglais corrigés, voir NAME_OVERRIDES dans build-country-communes.js)
│       ├── aliases-ie.txt      # idem pour l'Irlande (irlandais/Gaeilge en tête)
│       ├── communes-im.txt     # 43 lieux mannois, même format (aucune correction de nom nécessaire)
│       ├── aliases-im.txt      # idem pour l'île de Man (mannois/Gaelg en tête)
│       ├── …                   # un communes-XX.txt et un aliases-XX.txt par pays : 239 fichiers d'alias
│       │                        # (France comprise), 1 718 291 alias au total au 18/09/2026 — voir
│       │                        # "Noms alternatifs dans toutes les langues, pour tous les pays"
│       ├── featured.txt        # ~300 communes françaises avec de vrais points d'intérêt nommés (OSM)
│       └── toll-reference.json # 38 liaisons de péage françaises vérifiées, qui fixent le tarif €/km (7e audit)
│                                # (non chargé par l'app — conservé comme référence/source)
```

Le serveur sert les fichiers statiques et sept routes dynamiques : `GET /api/search-city` et
`POST /api/generate-trip` (recherche de ville et tirage, voir "Recherche et tirage aléatoire côté
serveur"), `GET /api/status` (état du démarrage, voir "Dépannage de l'hébergement"),
`GET /api/photo?name=…&dept=…
&country=…&lang=…`, qui va chercher une vraie photo sur Wikipédia — dans la langue du VISITEUR
(`lang`), pas celle de la commune (voir plus bas), `GET /api/pois?lat=…&lon=…&country=…`, qui va
chercher de vrais points d'intérêt sur OpenStreetMap autour d'une commune (voir "Activités
réelles"), `GET /api/hike?name=…&lat=…&lon=…&country=…&lang=…`, qui va chercher de vraies
randonnées balisées pour un lieu de n'importe quel pays couvert — coordonnées valides et pays connu
exigés : Visorando dans les neuf pays qu'il couvre (France, Royaume-Uni, Allemagne, Belgique,
Espagne, Suisse, Italie, Autriche, Portugal), sinon itinéraires balisés OpenStreetMap (voir
"Randonnées réelles" et "Randonnées dans le monde entier"), et `POST /api/export-pdf`, qui génère le PDF
téléchargeable de l'itinéraire affiché (voir "Export PDF"). Pas de base de données, pas de session,
pas de donnée utilisateur conservée au-delà de la réponse — juste un petit cache en mémoire pour
les routes photo, activités et randonnées.

## Pays couverts

**239 pays et territoires** sont couverts (`COUNTRIES` dans `public/js/trip-data.js`). Les premiers
ont été ajoutés un par un — France, Andorre, Espagne, Portugal, Belgique, Pays-Bas,
Luxembourg, Suisse, Allemagne, Italie, Autriche, Saint-Marin, Liechtenstein, Monaco, Malte, Guernesey,
Jersey, République tchèque, Pologne, Slovaquie, Hongrie, Slovénie, Croatie, Bosnie-Herzégovine,
Royaume-Uni, Irlande, île de Man, Danemark, Norvège, Suède, Finlande, îles Åland, Monténégro, Albanie,
Kosovo, Serbie, Macédoine du Nord, Grèce, Bulgarie, Roumanie, Lettonie, Lituanie, Estonie, le
Vatican, l'Islande, les îles Féroé, Gibraltar, la Moldavie, la Biélorussie, l'Ukraine, la Turquie,
la Géorgie, l'Arménie, l'Azerbaïdjan, la Syrie, Chypre, le Liban, Israël, la Palestine, la Jordanie,
l'Égypte et la Libye —, les suivants par lots régionaux (Maghreb, Afrique, Russie, péninsule
Arabique, Asie, Océanie, Amériques, Antarctique : voir les sections datées plus bas). Chaque pays
ajoute deux à trois choses, indépendamment des autres :

1. **Un fichier `public/data/communes-XX.txt`** (même format compact que `communes.txt` — voir
   `scripts/build-country-communes.js`, qui télécharge et convertit les données publiques
   [GeoNames](https://www.geonames.org) — licence CC-BY 4.0 — pour le pays demandé : population,
   coordonnées, codes postaux, nom de région). Chargé au démarrage du serveur comme les autres
   (`COUNTRIES` dans `public/js/trip-data.js`), fusionné dans le même tableau de communes que la France — une ville
   espagnole ou portugaise se cherche, se tire au sort et se compare aux autres exactement comme
   une ville française. **Exception, la Bosnie-Herzégovine** : GeoNames n'a AUCUN fichier de codes
   postaux pour ce pays (`export/zip/BA.zip` répond 404 — vérifié, un cas inédit parmi tous les pays
   ci-dessus). `scripts/build-country-communes.js` n'a donc pas pu servir tel quel : trois scripts
   dédiés (`parse-ba-wiki-postal.js`, `build-ba-communes.js`, `build-ba-aliases.js`) reconstruisent
   à la place de VRAIS codes postaux depuis la liste [Wikipedia "Postal codes in Bosnia and
   Herzegovina"](https://en.wikipedia.org/wiki/Postal_codes_in_Bosnia_and_Herzegovina) (sourcée BH
   Pošta/HP Mostar/Pošte Srpske, les trois opérateurs postaux du pays — licence CC-BY-SA 4.0, voir
   "Sources des données"), rapprochée des communes GeoNames par NOM plutôt que par coordonnées (le
   fichier Wikipedia n'a pas de coordonnées). Rapprocher par nom seul est risqué dès qu'un même nom
   de village existe à plusieurs endroits du pays — très fréquent en Bosnie-Herzégovine, vérifié
   ("Zabrđe" désigne 8 lieux distincts, jusqu'à 157 km d'écart) : `build-ba-communes.js` n'assigne
   donc un code postal que si UNE SEULE commune de ce nom a une population connue nettement
   dominante (ex. Zenica, 164 423 hab. contre 0 pour ses deux homonymes) ou si tous les homonymes
   sont à moins de 15 km les uns des autres (probablement le même lieu, plusieurs points GeoNames
   décalés) — sinon le nom est écarté EN BLOC plutôt que deviné. Résultat : 374 communes retenues sur
   582 entrées de codes postaux extraites de Wikipedia, avec 92 noms écartés pour ambiguïté et 71
   entrées Wikipedia sans commune GeoNames correspondante (souvent des bureaux/guichets de poste
   plutôt que de vrais lieux distincts, ex. "Mostar-Avenija", "Mostar-CIPS") — une couverture
   nettement plus modeste que les autres pays, mais entièrement fondée sur de vraies données plutôt
   que sur une correspondance devinée. Choix explicite de l'utilisateur (voir historique des
   commits) : reconstruire malgré ce travail supplémentaire plutôt que d'ajouter les communes sans
   code postal ou de reporter le pays. **Le Danemark**, lui, n'a demandé aucun traitement spécial —
   pipeline standard, 7 080 communes retenues sur 7 109 lieux bruts. Deux corrections `NAME_OVERRIDES`
   seulement (échantillon des 30 plus grandes communes du pays, reste déjà bon y compris les caractères
   æ/ø/å) : "Copenhagen" (exonyme anglais, remplacé par le danois "København") et "Århus" (pas un
   exonyme cette fois mais une orthographe danoise PÉRIMÉE — la ville a officiellement repris
   l'orthographe historique "Aarhus" le 1er janvier 2011, abandonnant le "Å" adopté en 1948 —
   remplacée par "Aarhus", déjà la forme utilisée par le reste du dump pour cette même ville).
   **La Norvège**, elle aussi, n'a demandé aucun traitement spécial — pipeline standard, 12 080
   communes retenues sur 13 192 lieux bruts (le dump brut GeoNames le plus volumineux traité par ce
   script jusqu'ici, 71 Mo, largement dû aux dizaines de milliers de lieux-dits norvégiens présents
   dans le gazetteer). AUCUNE correction `NAME_OVERRIDES` nécessaire (échantillon des 30 plus grandes
   communes du pays déjà bon, y compris les caractères æ/ø/å — Ålesund, Tønsberg, Tromsø...).
   **La Suède**, elle, a demandé une seule correction — 24 310 communes retenues sur 27 976 lieux
   bruts. Un cas `NAME_OVERRIDES` (échantillon des 30 plus grandes communes du pays déjà bon, y
   compris å/ä/ö — Stockholm, Malmö, Uppsala, Linköping, Örebro, Umeå... déjà bons) : "Gothenburg"
   (exonyme anglais, remplacé par le suédois "Göteborg" — deuxième ville du pays).
   **La Finlande**, dernier pays de la série nordique, a demandé DEUX fichiers plutôt qu'un : 23 869
   communes finlandaises (`communes-fi.txt`) et, séparément, 330 communes des **îles Åland**
   (`communes-ax.txt`) — l'archipel a son propre code pays GeoNames "AX", distinct de "FI" (même
   logique que Guernesey/Jersey/l'île de Man pour le Royaume-Uni), et le fichier de codes postaux
   officiel finlandais ne le couvre PAS du tout (vérifié : aucune entrée Mariehamn/Ahvenanmaa dans
   FI.zip) — `AX.zip`, dédié, comble ce vide. Deux corrections `NAME_OVERRIDES` côté Finlande
   (échantillon des 80 plus grandes communes déjà bon — Helsinki, Espoo, Tampere, Vantaa, Oulu,
   Turku... déjà bons) : "Hyvinge" -> "Hyvinkää" (nom suédois sans légitimité locale, commune jamais
   à majorité suédophone) et "Sibbo" -> "Sipoo" (Uusimaa, repassée à majorité FINNOPHONE au 1er
   janvier 2023 — stat.fi, 65,3% finnophone fin 2025 — le nom suédois n'est donc plus le nom de la
   majorité actuelle). Ces deux corrections ont volontairement laissé INTACTES plusieurs communes à
   majorité RÉELLEMENT suédophone conservées sous leur nom suédois par GeoNames (Raseborg/Raasepori
   ~64%, Jakobstad/Pietarsaari ~66%, Korsholm/Mustasaari ~68%, Väståboland/Länsi-Turunmaa) — la
   Finlande étant officiellement bilingue finnois/suédois, GeoNames respecte ici correctement la
   langue localement dominante commune par commune, un cas de figure inédit parmi tous les pays
   couverts jusqu'ici. Côté Åland, une exclusion par nom (`AX_EXCLUDE_NAMES`, même mécanisme que
   `SARK_EXCLUDE_NAMES` pour Sercq) : "Yomala", doublon manifeste de la commune "Jomala" (même
   identifiant administratif, coordonnées à ~2 km, très probable confusion Y/J côté GeoNames),
   écartée plutôt que renommée — un simple renommage ne l'aurait pas fusionnée avec la vraie entrée
   au dédoublonnage (coordonnées trop éloignées pour la grille ~1 km utilisée).
   **Le Monténégro, l'Albanie et le Kosovo**, ajoutés ensemble dans un même passage, ont chacun demandé
   un traitement très différent. **L'Albanie** : pipeline standard, 4 017 communes retenues sur 4 156
   lieux bruts, une seule correction `NAME_OVERRIDES` ("Tirana" exonyme anglais -> "Tiranë", cohérente
   avec le reste du dump — "Bashkia Tiranë"). **Le Monténégro et le Kosovo**, eux, rejoignent la
   Bosnie-Herzégovine dans le petit groupe des pays SANS fichier de codes postaux GeoNames
   (export/zip/ME.zip et XK.zip -> 404, vérifié) — mais ni l'un ni l'autre n'a pu réutiliser la
   solution de la Bosnie (liste Wikipedia "Postal codes in Bosnia and Herzegovina") telle quelle :
   - Pour le **Monténégro**, AUCUNE liste Wikipedia détaillée n'existe (vérifié : "Postal codes in
     Montenegro" est un lien rouge sur la page générale "List of postal codes", DBpedia n'a qu'une
     version archivée d'un article depuis supprimé). Reconstruit à la place depuis
     [postanskibroj.cu.rs/crnagora/](https://postanskibroj.cu.rs/crnagora/), un annuaire tiers
     indépendant de codes postaux serbo-monténégrins (136 entrées, système hérité de la Yougoslavie,
     stable depuis 1971) — PAS une source officielle ni sous licence ouverte claire comme Wikipedia,
     un choix de dernier recours par manque d'alternative, à documenter comme tel plutôt qu'à
     présenter comme une source aussi solide que les autres pays. 94 des 136 codes postaux rapprochés
     d'une commune GeoNames par nom (`scripts/build-me-communes.js`), 6 écartés pour ambiguïté (nom
     partagé par plusieurs lieux distincts, même règle que la Bosnie), 42 sans commune correspondante.
   - Pour le **Kosovo**, un article Wikipedia "Postal codes in Kosovo" existe bien, mais ne liste QUE
     des plages par district (ex. "100xx" pour Prishtinë), jamais le détail par lieu. Source utilisée
     à la place : [postakosoves.com](https://postakosoves.com), le site officiel de la poste kosovare
     (Posta e Kosovës) elle-même — sa page de recherche de codes postaux embarque directement, dans le
     HTML de la page, un tableau JavaScript complet de 133 entrées {région, sous-région, code}, extrait
     via l'API REST publique de son WordPress (`wp-json/wp/v2/pages/962`) plutôt que scrapé au
     navigateur — une bien meilleure source que celle utilisée pour le Monténégro (directement la
     poste nationale, pas un annuaire tiers). Piège rencontré : la source postale utilise
     systématiquement les formes albanaises DÉFINIES (Prishtina, Mitrovica, Peja, Gjakova — suffixe
     "-a" — et Prizreni, Gjilani, Ferizaji — suffixe "-i"), alors que GeoNames utilise les formes
     albanaises INDÉFINIES pour ces mêmes villes (Prishtinë, Mitrovicë, Pejë, Gjakovë, Prizren,
     Gjilan, Ferizaj) — un écart purement grammatical réglé par une heuristique de "dédéfinition"
     (suffixe "-a" -> "-ë", suffixe "-i" retiré) essayée en repli lors du rapprochement par nom,
     jamais appliquée au nom canonique affiché. Plus significatif encore : au-delà de la capitale
     (stockée "Pristina", orthographe serbe/yougoslave sans le "h" albanais, corrigée en "Prishtinë"),
     GeoNames stocke plusieurs villes MOYENNES du Kosovo sous leur nom SERBE plutôt qu'albanais
     (Glogovac/Drenas, Suva Reka/Suharekë, Orahovac/Rahovec, Kamenica/Kamenicë, Vitina/Viti,
     Štrpce/Shtërpcë, Klina/Klinë, Mališevo/Malishevë, Srbica/Skenderaj, Zvečan/Zveçan, Klokot/Kllokot,
     Mamuša/Mamushë) — corrigées vers la forme albanaise utilisée par la Poste du Kosovo elle-même,
     l'albanais étant la langue très largement majoritaire du pays (~92%). 40 codes postaux au total
     rapprochés d'une commune GeoNames sur 133 entrées sources (`scripts/build-xk-communes.js`) — le
     reste étant soit des zones postales numérotées internes à une ville ("Prishtina 3", "Peja 8"...),
     soit des centres de tri/transit ("Qendra tranzite postare", "Tuneli i parë"), soit de très petits
     hameaux absents du gazetteer GeoNames sous ce nom précis.
   **La Serbie et la Macédoine du Nord**, ajoutées ensuite, reviennent toutes les deux au
   pipeline STANDARD (contrairement à leurs trois voisines balkaniques précédentes) : GeoNames publie
   un vrai fichier de codes postaux pour chacune, vérifié avant de commencer. **Serbie** : 9 256
   communes retenues sur 9 489 lieux bruts. Deux corrections `NAME_OVERRIDES` (échantillon des 400
   plus grandes communes du pays, reste déjà bon y compris č/ć/š/ž/đ) : "Belgrade" (exonyme anglais,
   remplacé par le serbe "Beograd" — déjà la forme utilisée par le reste du dump, ex. "Novi Beograd")
   et "Knjazevac" (diacritique manquant dans le champ `name` lui-même, repéré par recoupement avec la
   liste des noms alternatifs de cette même entrée — corrigé en "Knjaževac"). **Macédoine du Nord** :
   2 508 communes retenues sur 2 529 lieux bruts, mais avec une particularité inédite parmi tous les
   pays ci-dessus : 75 communes (sur 2 529) ont leur champ `name` GeoNames en CYRILLIQUE BRUT alors
   que l'écrasante majorité du pays (2 454 communes) est déjà en latin dans ce même champ — une
   incohérence de SAISIE côté GeoNames plutôt qu'un choix éditorial (rien ne distingue ces 75 communes
   des autres pour justifier un script différent, et le reste de l'app suppose un script unique par
   pays). Le champ `asciiname`, calculé par GeoNames pour chaque entrée et jamais vide ni lui-même
   cyrillique ici, sert de source de repli pour ces 75 seules communes (ex. Арачиново -> Arachinovo,
   déjà cohérent avec les digrammes sh/ch/zh utilisés ailleurs dans le pays — Shtip, Kochani,
   Delcevo...) — un alias `mk` (cyrillique -> latin canonique) est synthétisé pour chacune quand le
   fichier `alternateNamesV2` n'en fournit aucun pour son propre geonameid (30 des 75 cas), sans quoi
   ces communes deviendraient introuvables en tapant leur vrai nom macédonien alors même que c'est ce
   nom-là que GeoNames leur donnait à l'origine.
   **La Grèce, la Bulgarie et la Roumanie**, ajoutées ensuite, se répartissent en deux cas très
   différents. **La Bulgarie et la Roumanie** reviennent au pipeline STANDARD (comme la Serbie/la
   Macédoine du Nord juste avant) : GeoNames publie un vrai fichier de codes postaux pour chacune.
   **Bulgarie** : 6 047 communes retenues, AUCUNE correction `NAME_OVERRIDES` nécessaire (échantillon
   des 30 plus grandes communes déjà bon) — contrairement à la Macédoine du Nord voisine, le dump
   GeoNames bulgare est déjà entièrement en transcription latine BGN/PCGN sans diacritique dans son
   champ `name` (Kardzhali, Varshets...), cohérente avec la signalisation routière officielle du pays,
   sans la moindre incohérence cyrillique/latin à corriger. **Roumanie** : 15 418 communes retenues,
   une seule correction `NAME_OVERRIDES` ("Bucharest", exonyme anglais, remplacé par le roumain
   "Bucureşti" — cédille ş/ţ cohérente avec le reste du dump roumain). **La Grèce**, elle, casse ce
   schéma : AUCUN fichier de codes postaux GeoNames n'existe pour ce pays (`export/zip/GR.zip` -> 404,
   vérifié) — et, à la différence de la Bosnie-Herzégovine/du Monténégro/du Kosovo plus haut, aucune
   liste Wikipedia détaillée par lieu n'existe non plus ("Postal codes in Greece" reste un simple
   tableau de PLAGES par préfecture, jamais le détail par commune). Reconstruite à la place depuis
   [MentatInnovations/grpostcodes](https://github.com/MentatInnovations/grpostcodes) (licence Apache
   2.0), un jeu de données tiers d'environ 1 250 codes postaux grecs — mais, fait notable, AVEC
   coordonnées GPS pour chaque entrée, contrairement à toutes les sources tierces utilisées pour la
   série balkanique précédente (Monténégro, Kosovo — rapprochées par NOM faute de coordonnées). Ceci a
   permis un rapprochement par COORDONNÉE LA PLUS PROCHE (`scripts/build-gr-communes.js`, rayon
   30 km — plus large que le rayon standard de 15 km utilisé ailleurs dans le projet, la source tierce
   étant plus clairsemée que les postaux officiels des autres pays), une méthode plus fiable que le
   rapprochement par nom puisqu'elle ne dépend d'aucune orthographe partagée entre les deux sources.
   14 220 communes grecques retenues au final. Huit corrections `NAME_OVERRIDES` (échantillon des plus
   grandes villes/îles du pays) remplacent l'exonyme anglais ou la transcription GeoNames par la forme
   grecque translittérée usuelle : Athens -> Athína, Piraeus -> Peiraiás, Volos -> Vólos, Sparta ->
   Spárti, Mytilene -> Mytilíni, Zakynthos -> Zákynthos, Rhodes -> Ródos, Corfu -> Kérkyra.
   **La Lettonie, la Lituanie et l'Estonie**, ajoutées ensuite, reviennent toutes les trois au
   pipeline STANDARD (comme la Bulgarie/la Roumanie juste avant) : GeoNames publie un vrai fichier
   de codes postaux pour chacune. **Lettonie** : 7 585 communes retenues, une seule correction
   `NAME_OVERRIDES` — mais la capitale elle-même : "Riga", champ `name` GeoNames SANS le macron sur
   le I long (échantillon des 140 plus grandes communes du pays déjà bon par ailleurs, macron
   compris — Liepāja, Jūrmala, Rēzekne, Cēsis...), une contradiction interne au dump lui-même
   (l'entrée administrative de Riga, elle, porte bien le macron) corrigée en "Rīga". **Lituanie** :
   19 948 communes retenues, ONZE corrections `NAME_OVERRIDES` — de loin le plus gros total de
   corrections de toute cette série pour un seul pays, chacune vérifiée par recoupement avec
   l'entrée de municipalité de district correspondante dans le même dump (Ukmergė, Telšiai,
   Tauragė, Šilutė, Radviliškis, Plungė, Naujoji Akmenė, Mažeikiai, Kupiškis, Biržai, Vilkaviškis —
   ce dernier sans entrée de district dans cet extrait précis, retenu malgré tout sur la seule foi
   de sa liste de noms alternatifs). **Estonie** : 6 916 communes retenues, AUCUNE correction
   nécessaire (échantillon des 100 plus grandes communes du pays déjà bon, diacritiques compris —
   Tallinn, Tartu, Pärnu, Kohtla-Järve, Rakvere, Kuressaare, Sillamäe, Võru, Jõhvi...).
   **Le Vatican, l'Islande et les îles Féroé**, ajoutés ensuite, reviennent eux aussi tous les
   trois au pipeline STANDARD : GeoNames publie un vrai fichier de codes postaux pour chacun, y compris
   pour le Vatican malgré sa taille minuscule. **Vatican** : une seule commune retenue (le pays tout
   entier n'en compte qu'une, code postal 00120) — une correction `NAME_OVERRIDES` malgré tout, la
   plus insolite de toute cette série : le champ `name` de GeoNames utilise l'exonyme anglais "Vatican
   City", tandis que son propre fichier de codes postaux (un produit GeoNames distinct) porte "Citta'
   Del Vaticano" — la forme italienne, mais avec une apostrophe droite en lieu et place de l'accent
   grave manquant. Corrigée en "Città del Vaticano", l'italien étant la langue de travail quotidienne
   du Vatican (voir "Langues" ci-dessous) — même logique que Bucharest -> Bucureşti ou Riga -> Rīga
   plus haut : préférer le vrai nom local à l'exonyme anglais. **Islande** : 96 communes retenues,
   AUCUNE correction nécessaire (échantillon exhaustif des 96 communes déjà bon, diacritiques islandais
   þ/ð/ö compris — Reykjavík, Kópavogur, Akureyri, Þingeyjarsveit...). **Îles Féroé** : 180 communes
   retenues, AUCUNE correction nécessaire non plus (échantillon exhaustif des 180 communes déjà bon,
   diacritiques féroïens ø/á/í/ú compris — Tórshavn, Klaksvík, Runavík, Tvøroyri...).
   **Gibraltar, la Moldavie, la Biélorussie et l'Ukraine**, ajoutés ensuite (les quatre en une
   seule fois plutôt qu'un à la fois, exception au principe énoncé en tête de cette section — choix
   explicite de l'utilisateur), reviennent tous les quatre au pipeline STANDARD : GeoNames publie un
   vrai fichier de codes postaux pour chacun, vérifié avant de commencer, y compris pour Gibraltar
   malgré sa taille minuscule (49,9 km² — 6,7 km² pour le territoire lui-même). **Gibraltar** : cas le
   plus simple de toute cette série avec le Vatican — UN SEUL code postal (GX11 1AA) couvre tout le
   territoire, et seulement 2 communes retenues sur 10 lieux bruts du dump (les 8 autres, tous en
   `PPLX`, sont des quartiers d'une même agglomération déjà comptée — Waterport, Rosia, Reclamation
   Areas... — exclus par le filtre `KEEP_FEATURE_CODES` habituel, aucun traitement spécial requis) :
   Gibraltar (la ville elle-même) et Catalan Bay (le seul village distinct du territoire). Aucune
   correction `NAME_OVERRIDES` nécessaire. **La Moldavie** : 1 797 communes retenues, une seule
   correction — mais la capitale elle-même : "Chisinau", champ `name` GeoNames sans diacritique
   (échantillon des 100 plus grandes communes du pays par ailleurs déjà bon, diacritiques compris —
   Bălţi, Durleşti, Dubăsari, Căuşeni, Hînceşti, Floreşti... — y compris de nombreuses localités
   transnistriennes conservées telles quelles, GeoNames rattachant tout le territoire à la Moldavie
   internationalement reconnue, aucune exclusion ni renommage éditorial ici). Corrigée en "Chişinău"
   (cédille ş/ţ plutôt que la variante à virgule souscrite ș/ț, pour la même raison que
   "Bucureşti"/la Roumanie plus haut : cohérence avec l'écrasante majorité du reste du dump moldave
   lui-même — 1 959 caractères ş/ţ contre seulement 237 ș/ț dénombrés dans le fichier brut). **La
   Biélorussie** : 25 147 communes retenues, aucun exonyme anglais identifié parmi les plus grandes
   villes (Minsk, Homyel', Hrodna, Vitebsk, Mahilyow, Brest, Bobruysk... déjà telles quelles) — mais
   un cas de nom MALFORMÉ inédit parmi tous les pays couverts jusqu'ici : l'entrée 814990 porte
   "Ryasno, Рясно, Расна" comme champ `name` (trois translittérations différentes du même nom
   concaténées par des virgules DANS le champ lui-même, plutôt que dans la liste de noms alternatifs
   prévue à cet effet), corrigée en "Ryasno" (le premier segment, seule vraie forme latine usuelle).
   Note transparente sur le reste du dump biélorusse : contrairement au Kosovo (formes serbes
   corrigées en formes albanaises, la langue très majoritaire du pays), le dump biélorusse mélange
   sans cohérence apparente des translittérations à base RUSSE et à base BIÉLORUSSE pour différentes
   villes du même pays — mais aucune de ces deux formes n'est un exonyme étranger comparable à
   "Vienna"/"Prague" (les deux restent des lectures phonétiques directes du nom local), et aucune
   source faisant autorité comparable à la Poste du Kosovo n'a été identifiée pour trancher
   systématiquement en faveur de l'une ou l'autre : laissé tel quel, comme le reste du dump GeoNames
   utilisé sans retouche ailleurs dans ce projet. 14 communes biélorusses (dont Ryasno) restent aussi
   en cyrillique brut dans le champ `name` — même mécanisme de repli sur `asciiname` que la Macédoine
   du Nord (voir plus haut), étendu à ce pays. **L'Ukraine** : 30 044 communes retenues, AUCUNE
   correction `NAME_OVERRIDES` nécessaire (échantillon des 150 plus grandes villes du pays déjà bon —
   Kyiv, Kharkiv, Odesa, Dnipro, Zaporizhzhya, Lviv..., déjà la translittération ukrainienne moderne
   post-2018/BGN-PCGN, PAS les anciens exonymes issus du russe "Kiev"/"Kharkov"/"Odessa"/"Dnepr" — la
   réforme officielle de romanisation ukrainienne de 2010, largement adoptée à l'international depuis
   l'initiative #KyivNotKiev de 2018, est déjà celle utilisée par ce dump GeoNames). Trois communes
   ukrainiennes utilisent le même mécanisme de repli sur `asciiname`, mais pour une raison différente
   de la Macédoine du Nord/la Biélorussie : pas un nom entièrement cyrillique laissé tel quel, mais un
   caractère cyrillique CONFUSABLE isolé glissé au milieu d'un nom sinon déjà latin — "Antonіvka" (le
   troisième caractère est le cyrillique ukrainien "і", U+0456, visuellement indiscernable du "i"
   latin U+0069) et "Storozhevoнe" (l'avant-dernier caractère est le cyrillique "н" au lieu du latin
   "n") — même famille de bug que la confusion Ð/Đ déjà rencontrée pour la Croatie, mais lettre par
   lettre plutôt que systématique. Kherson, Saky, Alushta (villes de Crimée) restent rattachées au
   code pays "UA" par GeoNames, comme la quasi-totalité des bases de données et organisations
   internationales qui ne reconnaissent pas l'annexion russe de 2014 — utilisées telles quelles, sans
   exclusion ni retouche éditoriale, même logique que les localités transnistriennes conservées sous
   "MD" plus haut.
   **La Turquie**, ajoutée ensuite — exceptionnellement seule plutôt qu'en groupe de plusieurs
   pays comme les ajouts précédents, mais le plus gros pays traité par ce script à ce jour (~52 800
   lieux bruts, contre ~45 400 pour l'Ukraine, le précédent record) — revient elle aussi au pipeline
   STANDARD, GeoNames publiant un vrai fichier de codes postaux pour ce pays. 52 620 communes
   retenues sur 52 793 lieux bruts (99,8 % de jointure avec un code postal, un taux exceptionnellement
   élevé pour un pays de cette taille). Contrairement à la Macédoine du Nord/la Biélorussie/l'Ukraine,
   aucun problème de SCRIPT à gérer (le turc s'écrit nativement en alphabet latin depuis la réforme de
   1928) — seulement des diacritiques turcs (ç/ğ/ı/İ/ö/ş/ü) manquants sur huit entrées, détectées
   systématiquement plutôt qu'à l'œil (vérification manuelle irréaliste à cette échelle) par un script
   dédié comparant, pour chaque commune d'au moins 1 000 habitants, son nom sans diacritique à celui de
   toute autre entrée du même département administratif partageant le même nom une fois les
   diacritiques neutralisés — ne retient que les cas où une autre entrée existe avec STRICTEMENT PLUS
   de diacritiques, écartant les doublons dans l'autre sens (une grande ville déjà correcte, comme
   İzmir, n'est jamais signalée simplement parce qu'un homonyme mineur existe ailleurs sans
   diacritique). "Istanbul" (la plus grande ville du pays, 15,7 millions d'habitants) manque le İ
   majuscule pointé initial — présent dans sa propre liste de noms alternatifs GeoNames (qui liste
   aussi bien "Istanbul" qu'"İstanbul" pour cette même entrée, incohérence interne au dump).
   "Umraniye" (district d'Istanbul, 573 265 habitants) manque le Ü — confirmé par deux autres entrées
   GeoNames du même lieu exact, toutes deux déjà "Ümraniye". "İnegol" (district de Bursa, 133 959
   habitants) manque le ö final — confirmé par sa propre liste de noms alternatifs ET par l'entité
   administrative correspondante. Trois derniers cas sous le seuil des 1 000 habitants (Kütüklü,
   Karaburçak, Alaçami), trouvés par le même script abaissé à 200 habitants puis vérifiés un par un
   plutôt qu'ajoutés automatiquement — un seuil plus bas rend plus probable une coïncidence entre deux
   villages homonymes sans rapport plutôt qu'un vrai diacritique manquant, mais chacun de ces trois cas
   a bien été confirmé par une entrée jumelle exacte ou un homonyme dans la même province partageant la
   même orthographe correcte en turc réel. Deux vraies îles reliées par ferry pour véhicules détectées
   via le champ "dept" (littéralement le nom de l'île pour ces deux-là dans GeoNames — voir "Ferries"
   plus bas) : Bozcaada et Gökçeada, dans le détroit des Dardanelles.
   **La Géorgie**, ajoutée ensuite — comme la Grèce/le Monténégro/le Kosovo/la Bosnie-
   Herzégovine, GeoNames ne publie AUCUN fichier de codes postaux pour ce pays (téléchargement
   export/zip/GE.zip -> 404, vérifié), et contrairement à la Grèce (jeu de données tiers déjà
   géolocalisé) aucune source de ce genre n'a été trouvée : reconstruit à la place par rapprochement
   de NOM depuis yell.ge, un annuaire géorgien qui publie les codes postaux de chaque commune par
   municipalité (`scripts/build-ge-communes.js`, dernier recours documenté comme tel). Particularité
   propre à ce pays : l'annuaire liste les noms en écriture géorgienne (მხედრული) alors que GeoNames
   stocke le nom canonique en translittération latine — rapprochement via le nom géorgien
   ALTERNATIF de chaque lieu GeoNames plutôt que son nom principal, complété par le fichier
   `alternateNames` dédié (nettement plus riche que les seuls noms alternatifs du dump principal :
   4 926 lieux avec un nom géorgien identifié contre 4 143). 2 366 communes retenues, dont Tbilissi en
   cas particulier (seule ville dont l'annuaire détaille des RUES individuelles plutôt qu'une liste de
   localités — un unique code réel est utilisé à la place, "0100", l'adresse officielle du siège de la
   Poste géorgienne). Cinq écarts confirmés entre le nom géorgien réellement utilisé par l'annuaire et
   celui du fichier `alternateNames` (absent ou trompeur pour ces entrées précises) : Samtredia,
   Baghdati, Akhalkalaki, Kareli, Kharagauli — chacun confirmé par le nom propre de sa municipalité.
   Conséquence attendue de ce rapprochement par nom géorgien : l'Abkhazie et l'Ossétie du Sud
   (territoires séparatistes non contrôlés par le gouvernement géorgien, où la Poste géorgienne
   n'opère pas) n'ont aucun code postal dans la source et sont de fait automatiquement exclues, comme
   n'importe quel lieu sans correspondance dans ce pipeline.
2. **Un réglage péage** (`TOLL_RATE_BY_COUNTRY` dans `public/js/trip-data.js` — un pays sans réseau autoroutier à
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
   repasse plusieurs fois (`shownVignetteCountries` dans `renderDays`, web et PDF). Saint-Marin et
   le Liechtenstein sont les cas les plus simples de tous : `hasToll:false` sans aucune des raisons
   ci-dessus — ni l'un ni l'autre n'a la moindre autoroute (Saint-Marin : 292 km de routes, aucune
   à péage ; le Liechtenstein n'a même pas de vignette propre — la vignette suisse, union douanière
   oblige, y reste valable mais n'y est jamais obligatoire, donc aucun rappel n'est affiché pour ce
   pays contrairement à la Suisse/l'Autriche). Monaco, Malte, Guernesey et Jersey rejoignent ce même
   groupe des cas les plus simples : aucun des quatre n'a de réseau autoroutier à péage ni de
   vignette (Malte a bien une redevance de congestion à Valette aux heures de bureau, mais ce n'est
   pas un péage routier — non modélisée, comme les ouvrages isolés ci-dessus). La République tchèque,
   elle, rejoint le groupe Suisse/Autriche : vignette électronique obligatoire depuis 2021
   (e-dálniční známka, SFDI/edalnice.gov.cz) plutôt qu'un péage au trajet — 1/10/30 jours ou 1 an à
   prix fixe en CZK, `hasToll:false`, même rappel « pensez à la commander » que pour la Suisse/
   l'Autriche (`vignette.url` pointant vers edalnice.gov.cz/en/simple-purchase, la boutique
   officielle du SFDI). Aucun ouvrage isolé à péage identifié en plus de la vignette tchèque,
   contrairement à la Suisse/l'Autriche — cas plus simple sur ce point précis. La Pologne, elle, est
   un cas à part entre tous les précédents : depuis 2021 la quasi-totalité du réseau autoroutier
   d'Etat est gratuite pour les voitures/vans/motos, MAIS trois sections concédées à des opérateurs
   privés restent à péage réel pour ces mêmes véhicules — A1 Gdańsk-Toruń (AmberOne), A2
   Świecko-Konin (Autostrada Wielkopolska) et A4 Katowice-Kraków (Stalexport), ~467 km à elles trois
   sur ~1 700 km de réseau national. `hasToll:false` malgré tout, et sans vignette non plus : ce ne
   sont, comme le Kiltunnel néerlandais ou les tunnels alpins suisses/autrichiens, que TROIS
   itinéraires précis parmi des centaines de trajets possibles — rien ne dit qu'un trajet tiré au
   hasard les emprunterait plutôt qu'un chemin gratuit, le même raisonnement que pour un ouvrage
   isolé mais à l'échelle de trois corridors entiers plutôt que de quelques kilomètres. La
   Slovaquie, elle, rejoint le groupe à vignette (Suisse/Autriche/République tchèque) : vignette
   électronique obligatoire (e-známka, Národná diaľničná spoločnosť/NDS, eznamka.sk) sur toutes les
   autoroutes (D) et voies express (R) du pays — 1/10/30/365 jours à prix fixe en euros (8,10/10,80/
   17,10/90 € 2026 pour un véhicule léger), `hasToll:false`, aucun ouvrage isolé à péage identifié en
   plus de la vignette — cas simple, sans les tunnels alpins de la Suisse/l'Autriche. La Hongrie
   rejoint elle aussi ce groupe : vignette électronique obligatoire (e-matrica, NÚSZ Zrt./Nemzeti
   Útdíjfizetési Szolgáltató, ematrica.nemzetiutdij.hu) sur autoroutes et voies rapides — catégorie
   D1 (voiture ≤3,5 t) : 1 jour 5 550 Ft, 10 jours 6 900 Ft, 1 mois 11 170 Ft, 1 an national
   61 760 Ft (2026), `hasToll:false`, aucun ouvrage isolé identifié en plus. Piège évité en
   recherchant l'URL officielle : e-autopalyamatrica.hu, à l'apparence tout aussi officielle,
   s'est révélé être un revendeur privé tiers (Biorobotok Informatikai és Adatfeldolgozási Kft.) —
   écarté au profit du vrai portail d'Etat. La Slovénie rejoint elle aussi le même groupe : e-vinjeta
   obligatoire (DARS, société publique gestionnaire du réseau autoroutier slovène,
   evinjeta.dars.si) sur autoroutes et voies express — 100 % numérique depuis 2022 (fin de la
   vignette autocollante), 7 jours 16 €, 1 mois 32 €, 1 an 117,50 € (2026) pour un véhicule léger,
   `hasToll:false`, aucun ouvrage isolé identifié en plus de la vignette. La Croatie ROMPT ce groupe
   à vignette et rejoint plutôt la France/l'Espagne/l'Italie : un vrai péage FERMÉ au trajet (ticket à
   l'entrée, paiement à la sortie selon la distance), géré par HAC/Bina-Istra/AZM — PAS de vignette.
   Barème calculé sur Zagreb-Split/Dugopolje (A1, ~410 km, mojkalkulator.com.hr agrégeant les tarifs
   HAC 2026) : catégorie I (voiture) 24,50 €, IA (moto) 12,30 €, II (van/remorque) 36,70 € — soit
   0,060/0,090/0,030 €/km, des ratios ×1,5/×0,5 exacts par rapport à la classe 1 (pas une
   extrapolation comme pour l'Italie/l'Espagne/le Portugal, de VRAIS ratios officiels). `hasToll:true`.
   La Bosnie-Herzégovine rejoint elle aussi ce groupe à péage fermé, mais avec un réseau bien plus
   jeune et court (~200 km, corridor Vc encore en construction par tronçons) et DEUX gestionnaires
   sans grille tarifaire unique publiée (JP Autoceste FBiH côté Fédération, AD Autoputevi RS côté
   Republika Srpska). Six tronçons réels retenus (tolls.eu 2026), de 0,09 à 0,29 KM/km selon le
   tronçon (les plus courts coûtant proportionnellement plus cher), moyenne ~0,19 KM/km — converti
   au taux de caisse d'émission FIXE (1 EUR = 1,95583 KM depuis 1997, jamais dévalué en 28 ans, voir
   point 3 ci-dessous) plutôt qu'à un taux flottant : ~0,097 €/km, classes 2/5 extrapolées au ratio
   France/Espagne/Italie (×1,55/×0,58) faute de grille par catégorie ici. `hasToll:true`. Le
   Royaume-Uni, lui, REJOINT le groupe "entièrement gratuit" (Belgique/Pays-Bas/Luxembourg/Allemagne/
   Saint-Marin/Liechtenstein/Monaco/Malte/Guernesey/Jersey) plutôt que le groupe à péage fermé de sa
   voisine croato-bosnienne : son réseau autoroutier (motorways) est intégralement gratuit, comme
   l'Autobahn allemande. Seuls trois ouvrages isolés restent payants — le M6 Toll près de Birmingham
   (National Highways/Midland Expressway), le Dartford Crossing sur la Tamise à l'est de Londres, et
   le Mersey Gateway près de Liverpool — le même cas que le Kiltunnel néerlandais ou les tunnels
   alpins suisses/autrichiens : non modélisés, un trajet aléatoire ne les traverse pas nécessairement.
   `hasToll:false`, aucune vignette non plus. L'Irlande, elle, POURRAIT sembler rejoindre le groupe
   à péage fermé de sa voisine croato-bosnienne (M50 autour de Dublin, M1/M3/M4/M6/M7-M8/N25 vers les
   autres grandes villes) — mais son système est en réalité un ensemble de BARRIÈRES PONCTUELLES à
   tarif FIXE (ex. M50 : 3,10 € par passage, quel que soit le trajet parcouru sur cette autoroute),
   pas un système fermé proportionnel à la distance comme HAC en Croatie — encore plus ponctuel qu'un
   corridor polonais entier, jamais garanti par un trajet aléatoire. `hasToll:false`, même
   raisonnement que les ouvrages isolés britanniques/néerlandais/suisses/autrichiens, à une échelle
   plus fine encore. L'île de Man, elle, est le cas le plus simple de toute cette série : AUCUNE
   autoroute ni voie rapide sur toute l'île (réseau routier local, y compris le célèbre circuit du TT
   sur route ouverte) — `hasToll:false` sans la moindre exception à modéliser, comme Saint-Marin/le
   Liechtenstein. Le Danemark, lui, est le cas le plus DISCUTABLE de toute la série : `hasToll:false`
   comme le groupe des ouvrages isolés (Irlande/Pays-Bas/Royaume-Uni/Suisse ci-dessus), mais pour une
   raison plus fragile ici. Le pays a deux VRAIS ponts à péage — le Storebæltsbroen/Great Belt entre la
   Fionie et le Sjælland (205-235 DKK selon le mode de paiement, storebaelt.dk) et l'Øresundsbron vers
   la Suède (465-470 DKK, oresundsbron.com) — mais tous deux à tarif FIXE par passage, jamais
   proportionnel à la distance parcourue : la même règle "péage ponctuel à tarif fixe -> hors modèle"
   qui a écarté le M50 irlandais/le Kiltunnel néerlandais/le M6 Toll et le Dartford Crossing
   britanniques/le tunnel du Grand-Saint-Bernard suisse s'applique donc ici aussi, pour rester cohérent
   plutôt que d'inventer un nouveau mécanisme de péage au franchissement rien que pour ce pays.
   Contrairement à ces exemples, cependant, le Storebælt est une traversée bien plus difficile à éviter
   pour un trajet Jylland/Fionie <-> Sjælland/Copenhague — aucun pont ni tunnel alternatif gratuit
   n'existe entre les deux : un choix plus discutable, assumé comme tel plutôt que dissimulé. La
   Norvège, elle, `hasToll:false` aussi mais pour une raison inverse de celle du Danemark : pas trop
   peu d'ouvrages à péage pour en tirer un tarif national, mais bien trop — environ 190-200 postes de
   péage électronique (bomstasjoner, système AutoPASS) répartis sur tout le pays et gérés par des
   dizaines de sociétés régionales distinctes (Fjellinjen à Oslo, à elle seule 83 postes sur trois
   anneaux ; Ferde à Bergen/côte ouest ; Vegamot à Trondheim...). Système strictement au passage
   (point-based), jamais un barème €/km unique ni une vignette à prix fixe national : aucun montant
   représentatif du pays entier n'en dérive, contrairement à la France/l'Espagne/la Croatie (barème)
   ou la Suisse/l'Autriche/la République tchèque (vignette). La Suède, elle, est le cas le plus simple
   des trois pays nordiques ajoutés jusqu'ici : réseau autoroutier réellement gratuit dans son ensemble
   (transportstyrelsen.se : "aucune vignette, aucune barrière de péage sur route ouverte", l'un des
   réseaux les moins taxés d'Europe). Seules Stockholm et Göteborg appliquent une taxe d'encombrement
   urbain (trängselskatt, 6h-18h29 en semaine, jusqu'à 135 SEK/jour) à l'entrée/sortie du centre-ville —
   pas un péage routier au sens de cette app, même raisonnement que la redevance de congestion de
   La Valette (Malte, déjà non modélisée) : ni l'une ni l'autre n'est un péage autoroutier
   proportionnel à la distance parcourue. La Finlande, elle, rejoint le groupe le plus simple de
   tous : réseau autoroutier entièrement gratuit, aucune vignette, aucun péage ponctuel, aucune taxe
   de congestion urbaine (contrairement à sa voisine suédoise) — "l'un des rares pays de l'UE
   entièrement libre de péages routiers pour les véhicules privés" (travelinformation.eu/
   suomiguide.fi). Les îles Åland suivent le même régime `hasToll:false`, sans exception propre.
   Retour aux Balkans : le **Monténégro** a bien un VRAI péage — l'autoroute A1 Bar-Boljare (tronçon
   achevé Smokovac-Mateševo, ~41 km) et le tunnel de Sozina, tarifs par catégorie de véhicule
   (tolls.eu 2026) — mais `hasToll:false` malgré tout : un seul tronçon isolé sur un réseau
   autoroutier encore embryonnaire (le reste du projet Bar-Boljare, bien plus long, reste en
   construction), jamais garanti par un trajet aléatoire — même raisonnement que les trois sections
   polonaises concédées ou le M50 irlandais, à l'échelle d'un pays entier plutôt que de quelques
   kilomètres. **L'Albanie** aussi `hasToll:false`, mais pour une raison différente : des
   infrastructures de péage existent bien sur l'autoroute A1 (Milot-Morinë et Thumanë-Kashar) mais la
   perception n'a, à ce jour (2026), jamais commencé (tolls.eu, onyxtms.com) — concrètement gratuit
   pour l'instant, à réévaluer si la perception démarre réellement. **Le Kosovo** rejoint le même
   groupe : les sources sur un éventuel péage aux autoroutes R6/R7 sont contradictoires, mais la
   majorité des sources récentes (fuel-prices.eu 2026, rks-gov.net) le décrivent comme gratuit —
   choix retenu par prudence plutôt que de modéliser un montant incertain.
   **La Serbie et la Macédoine du Nord**, elles, cassent la série "hasToll:false" ouverte par le
   Monténégro/l'Albanie/le Kosovo : les DEUX ont un vrai réseau autoroutier à péage PROPORTIONNEL à la
   distance parcourue, `hasToll:true` comme la France/l'Espagne/l'Italie/la Croatie/la
   Bosnie-Herzégovine. **Serbie** : péage FERMÉ (ticket à l'entrée, paiement à la sortie, comme la
   France/la Croatie), un seul gestionnaire national (Putevi Srbije, 938 km, 77 gares automatiques).
   Cinq liaisons réelles retenues (tolls.eu 2026) — Beograd-Preševo (350 km), Beograd-Subotica
   (132 km), Beograd-Požega (123 km), Beograd-Šid (76 km), Pojate-Vrba (71 km) — médiane
   ~6,44 din/km pour une voiture, convertie au taux de référence indiqué par tolls.eu (117 RSD =
   1 EUR) : ~0,055 €/km. La classe moto n'est pas extrapolée mais dérivée du RATIO réel observé sur
   les cinq liaisons (très exactement ×0,5 à chaque fois) ; la classe van/remorque, elle, faute de
   grille officielle trouvée malgré une recherche directe sur putevi-srbije.rs, reprend le ratio ×1,5
   croate (le seul ratio RÉEL confirmé dans la région pour cette catégorie). **Macédoine du Nord** :
   péage aux gares plutôt qu'un ticket unique, mais bien proportionnel une fois les gares d'un trajet
   cumulées (Entreprise publique des routes d'État, roads.org.mk). Tarif retenu sur l'A1
   Skopje-Gevgelija (123 km, corridor principal vers la Grèce, 360 MKD catégorie 1B) -> 2,93 MKD/km,
   converti au cours cible OFFICIEL de la Banque nationale (ancrage de facto depuis 1997, ~61,5 MKD =
   1 EUR) : ~0,048 €/km. Contrairement à la Serbie, un vrai barème officiel par catégorie A été trouvé
   (roads.org.mk, quatre gares) : ratios moto/van réels ×0,60/×1,42, retenus tels quels plutôt que le
   ratio croate.
   **La Grèce** rejoint elle aussi le groupe `hasToll:true` proportionnel à la distance (péage FERMÉ,
   comme la France/la Croatie/la Serbie) : trois liaisons réelles retenues (mydiodia.gr 2026) —
   Athènes-Patras, Athènes-Thessalonique et Thessalonique-Alexandroúpoli (corridor Egnatia Odos) —
   gérées par plusieurs concessionnaires distincts (Olympia Odos, Egnatia Odos, cités toutes les deux
   dans le crédit péage plutôt qu'un seul nom nationalisé comme Putevi Srbije). La classe moto reprend
   le ratio réel ×0,5 observé sur l'Attiki Odos (même ratio que la Serbie/la Croatie, cette fois
   confirmé par un vrai barème par catégorie plutôt que par simple analogie régionale) ; la classe
   van/remorque, faute de grille officielle distincte, extrapole le même ratio ×1,5 croate déjà
   repris pour la Serbie. **La Bulgarie et la Roumanie**, elles, rejoignent le groupe à vignette
   (Suisse/Autriche/République tchèque/Slovaquie/Hongrie/Slovénie) plutôt que le péage proportionnel :
   **Bulgarie**, vignette électronique obligatoire depuis 2019 (BGTOLL, bgtoll.bg) sur tout le réseau
   autoroutier et national — `hasToll:false`, `vignette.url` pointant vers la boutique officielle.
   **Roumanie**, vignette autoroutière classique (rovinietă, e-rovinieta.ro) depuis 2002 — même
   principe, `hasToll:false`, `vignette.url` pointant vers la boutique officielle e-rovinieta.ro.
   Aucun ouvrage isolé à péage identifié pour l'une ou l'autre en plus de la vignette.
   **La Lettonie, la Lituanie et l'Estonie**, elles, rejoignent le groupe `hasToll:false` SANS
   vignette pour véhicule léger (même groupe que l'Allemagne/l'Andorre/le Luxembourg, pas celui de
   la Suisse/l'Autriche/la Bulgarie/la Roumanie) : les trois pays baltes ont un réseau autoroutier
   entièrement gratuit pour les voitures/vans/motos (tolls.eu/fuel-prices.eu/vintrica.com 2026,
   vérifié pour les trois) — seuls les poids lourds (plus de 3 ou 3,5 t selon le pays) ont besoin
   d'une vignette électronique, hors du périmètre de cette app qui ne modélise que des véhicules
   légers.
   **Le Vatican**, lui, est le cas le plus simple de toute la série : 121 hectares, aucune route
   digne de ce nom en dehors de ses propres allées internes — `hasToll:false` sans la moindre
   exception à modéliser, comme Saint-Marin/le Liechtenstein/l'île de Man. **L'Islande**, elle,
   REJOINT malgré tout le groupe `hasToll:false` bien qu'ayant désormais deux vrais péages en 2026 :
   le tunnel de Vaðlaheiðargöng (nord du pays, près d'Akureyri, en service depuis 2018) et une toute
   nouvelle section du Ring Road près de Höfn (ouverte le 1er septembre 2026) — mais, comme le
   Monténégro/les trois sections polonaises/le M50 irlandais plus haut, ce sont deux ouvrages ISOLÉS
   sur un réseau routier par ailleurs entièrement gratuit, jamais garantis par un trajet aléatoire.
   **Les îles Féroé**, elles, ont QUATRE vrais péages — les tunnels sous-marins à péage
   (Vágatunnilin, Norðoyatunnilin, Eysturoyartunnilin, Sandoyartunnilin), une infrastructure
   nettement plus centrale que les deux ouvrages isolés islandais puisqu'elle relie les principales
   îles de l'archipel entre elles — mais chacun facture un tarif FIXE au franchissement, jamais
   proportionnel à la distance parcourue : le même mécanisme "péage ponctuel à tarif fixe -> hors du
   modèle €/km" qui a déjà écarté les ponts danois du Storebælt/de l'Øresund plus haut s'applique donc
   ici aussi, à l'échelle de quatre ouvrages plutôt que deux. `hasToll:false`, ces quatre péages réels
   restant documentés comme une limite assumée dans le commentaire de `COUNTRIES.FO` plutôt que
   silencieusement omis.
   **Gibraltar et l'Ukraine**, ajoutés ensuite, rejoignent le groupe `hasToll:false` mais pour deux
   raisons distinctes. **Gibraltar** : aucun réseau autoroutier à péage ni vignette — cas le plus
   simple de toute cette table avec Monaco/Malte/Guernesey/Jersey (49,9 km de route au total,
   vérifié). **L'Ukraine** : AUCUN péage routier n'existe à ce jour (2026) dans le pays — le projet
   de système de péage national est à l'étude depuis plus de 20 ans (coût estimé ~7 milliards UAH
   rien que pour l'infrastructure de perception), et la première concession envisagée
   (Krakovets-Lviv, à la frontière polonaise) reste à l'état de projet depuis plus de 30 ans ;
   contrairement à Gibraltar, aucune vignette non plus. **La Moldavie et la Biélorussie**, elles,
   rejoignent plutôt le groupe à vignette (Suisse/Autriche/République tchèque/Slovaquie/Hongrie/
   Slovénie/Bulgarie/Roumanie) : `hasToll:false` avec un champ `vignette`. Pour la **Moldavie**
   (e-vinieta, portail officiel evinieta.gov.md), particularité par rapport aux vignettes déjà
   couvertes : elle ne s'applique en pratique qu'aux véhicules immatriculés à l'ÉTRANGER — les
   véhicules moldaves paient une taxe routière distincte, hors du périmètre de cette app qui modélise
   un trajet depuis la France, donc un visiteur français en aurait bien besoin, exactement comme pour
   les vignettes tchèque/slovaque/hongroise déjà modélisées. Pour la **Biélorussie** (système
   BelToll, ev.beltoll.by) : un vrai tarif au kilomètre existe bien, mais UNIQUEMENT pour les poids
   lourds ≥3,5 t (0,117-0,176 €/km selon le nombre d'essieux, hors du périmètre de cette app) — pour
   les véhicules légers modélisés ici (voiture/van/moto), c'est une vignette électronique à prix fixe
   par période (15 jours/30 jours/1 an) qui s'applique, rejoignant donc le même groupe que la
   Moldavie plutôt que celui de la France/l'Italie/la Croatie (barème €/km réel pour les voitures).
   **La Turquie**, ajoutée ensuite, rejoint plutôt le groupe France/Espagne/Italie/Croatie/Bosnie-
   Herzégovine/Serbie/Macédoine du Nord/Grèce : un vrai réseau d'autoroutes (otoyol) à péage
   électronique proportionnel à la distance (HGS, paiement automatique par plaque), `hasToll:true`.
   Barème dérivé de l'autoroute Gebze-Orhangazi-İzmir (O-5, 384 km de section réellement autoroutière
   hors bretelles de raccordement, ozaltin.com), en retirant le tarif du pont d'Osmangazi qui la
   traverse — une structure isolée à péage FIXE au franchissement, jamais proportionnel à la distance,
   même limite déjà acceptée pour le Storebælt danois/le tunnel sous la Manche/le tunnel du
   Mont-Blanc : non modélisée en tant que telle, simplement exclue du calcul plutôt que traitée comme
   un ouvrage séparé. Tarifs au 1er juillet 2026 (plusieurs sources convergentes) : trajet complet
   catégorie 1 (voiture) 2 525 TL dont pont 1 170 TL → partie autoroutière seule 1 355 TL / 384 km ≈
   3,53 TL/km ; catégorie 2 (véhicule léger utilitaire) 4 040 TL dont pont 1 870 TL → 2 170 TL /
   384 km ≈ 5,65 TL/km ; catégorie 6 (motocyclette) 1 795 TL dont pont 820 TL → 975 TL / 384 km ≈
   2,54 TL/km — convertis au taux ~56,3 TRY/EUR retenu pour `COUNTRIES.TR.currency`. Opérateur crédité
   dans les mentions légales : Otoyol A.Ş., le concessionnaire BOT (Build-Operate-Transfer) de cette
   autoroute précise pour le compte de la Karayolları Genel Müdürlüğü (KGM, direction générale des
   routes turque) — même logique que HAC/Putevi Srbije/JP za državni patišta ailleurs dans cette
   table, l'opérateur réellement responsable du barème utilisé pour le calcul plutôt que l'autorité
   nationale générale.
   **La Géorgie**, ajoutée ensuite, a `hasToll:false` — comme l'Ukraine/Gibraltar, aucun péage
   routier n'existe à ce jour pour les véhicules particuliers ; la seule route à péage du pays (rocade
   de contournement de Tbilissi, TBTR) est encore en construction et vise le fret de transit, et la
   Direction des routes a explicitement écarté toute extension aux grands axes nationaux
   (georgiatoday.ge, juin 2026) — aucune vignette non plus.
3. **Une devise** (`currency` dans `COUNTRIES`, `app.js` — EUR par défaut si absent). La Suisse et le
   Liechtenstein en ont besoin (`CHF` — le Liechtenstein utilise le franc suisse par union monétaire,
   pas l'euro), Guernesey et Jersey aussi (`GBP` — chacune a sa propre livre locale à parité fixe
   avec la livre sterling, jamais l'euro malgré la proximité géographique avec la France ; Airbnb/
   Booking n'ayant pas de sélecteur pour ces deux monnaies locales, GBP est la devise réellement
   utilisée pour les prix affichés), et la République tchèque, elle aussi hors zone euro malgré son
   appartenance à l'UE (`CZK`, la couronne tchèque — contrairement à la Suisse, un pays moins cher
   que la zone euro : les paliers `BUDGET_PRICE_MAX.CZK` sont légèrement EN DESSOUS de l'équivalent
   EUR converti, pas au-dessus), et la Pologne encore (`PLN`, le złoty — même profil que la
   République tchèque, un pays moins cher que la zone euro), et la Hongrie enfin (`HUF`, le forint —
   même profil, paliers `BUDGET_PRICE_MAX.HUF` calés sous la médiane Airbnb de Budapest). Monaco et
   Malte, eux, sont bien en zone euro (pas de champ `currency`, EUR par défaut) — la Slovaquie aussi,
   seule exception d'Europe centrale parmi ses voisins couverts (Autriche, République tchèque,
   Pologne, Hongrie, tous hors zone euro) : seul pays de la région à avoir adopté l'euro (2009), pas
   de champ `currency` non plus. La Slovénie non plus : premier des pays entrés dans l'UE en 2004 à
   avoir adopté l'euro (dès 2007), et seule des quatre voisines directes de l'Italie/l'Autriche ici
   couvertes (avec la Slovaquie) à être en zone euro — absente elle aussi de `COUNTRIES.SI.currency`.
   La Croatie non plus : adoption la plus RÉCENTE de tous les pays ici couverts (1er janvier 2023,
   remplaçant la kuna croate/HRK) — absente elle aussi de `COUNTRIES.HR.currency`. La
   Bosnie-Herzégovine, elle, A besoin du champ (`BAM`, le mark convertible, symbole KM) : hors zone
   euro (candidate à l'UE depuis 2022 seulement, hors zone euro ET hors MCE II) mais à PARITÉ FIXE
   avec l'euro depuis 1997 via caisse d'émission (currency board) — 1 EUR = 1,95583 KM exactement,
   jamais dévalué en 28 ans, le même taux que le deutsche mark avait avec l'euro. Paliers
   `BUDGET_PRICE_MAX.BAM` calés à ~70% de cette conversion fixe (même profil "moins cher que la zone
   euro" que CZK/PLN/HUF — moyenne Airbnb à Sarajevo ~56-65 €/nuit, chambres privées hors centre
   ~20-36 €/nuit). Le Royaume-Uni, lui, rejoint Guernesey/Jersey (`GBP`) : la livre sterling, jamais
   l'euro — même choix que pour les deux baillages, "GBP" est aussi la devise réellement proposée par
   Airbnb/Booking pour ce pays (pas de sélecteur séparé). L'Irlande, elle, contrairement à son voisin
   britannique, EST en zone euro (depuis 1999/2002 comme la France) : aucun champ nécessaire. L'île de
   Man rejoint à son tour le groupe `GBP` (Royaume-Uni/Guernesey/Jersey) : la livre mannoise existe
   mais reste à parité fixe avec la livre sterling, jamais utilisée séparément par Airbnb/Booking. Le
   Danemark, lui, a besoin du champ (`DKK`, la couronne danoise) : hors zone euro malgré l'appartenance
   à l'UE (opt-out danois depuis le traité de Maastricht, 1992) mais à parité quasi fixe avec l'euro
   depuis 1982 (ERM II, bande étroite ±2,25% — 1 EUR ≈ 7,46 DKK, jamais réajustée depuis l'entrée dans
   le mécanisme en 1999). Contrairement à CZK/PLN/HUF/BAM ci-dessus (tous des pays MOINS chers que la
   zone euro), le Danemark est PLUS cher — même profil que la Suisse (`CHF`) : loyer Airbnb médian à
   Copenhague ~1150-1250 DKK/nuit (~155-170 €, airroi.com 2026), fourchette usuelle ~800-1800 DKK
   couvrant ~80% des annonces. Paliers `BUDGET_PRICE_MAX.DKK` calés pour que ce prix médian tombe dans
   la tranche "moyen" plutôt qu'en dessous, comme pour les autres devises. La Norvège a besoin du
   même genre de champ (`NOK`, la couronne norvégienne) — même profil "plus cher que la zone euro"
   qu'avec le Danemark/la Suisse (Oslo : loyer Airbnb médian ~140 $/~130 €, airroi/airbtics 2026), mais
   contrairement à la couronne danoise (parité FIXE avec l'euro), la couronne norvégienne est
   FLOTTANTE — 1 EUR ≈ 10,85 NOK début septembre 2026 (xe.com/ecb.europa.eu), à réévaluer
   périodiquement si le taux dérive significativement. La Suède a besoin du même genre de champ
   (`SEK`, la couronne suédoise) — même profil "plus cher que la zone euro" (Stockholm : loyer Airbnb
   médian ~159 $/~142 €, airroi 2026), couronne elle aussi FLOTTANTE (comme la norvégienne,
   contrairement à la danoise) — 1 EUR ≈ 11,15 SEK début septembre 2026 (xe.com). La Finlande et les
   îles Åland, elles, N'ONT PAS besoin de ce champ : seul pays nordique de cette série EN zone euro
   (depuis 1999, comme l'Irlande) — aucun champ `currency` sur `COUNTRIES.FI` ni `COUNTRIES.AX`. Le
   Monténégro et le Kosovo, eux non plus, n'ont besoin d'aucun champ `currency` : les DEUX ont adopté
   l'euro UNILATÉRALEMENT en 2002 (jamais membres de la BCE ni de l'UE, contrairement à la Finlande) —
   remplaçant le mark allemand pour le Monténégro, le mark allemand et le dinar yougoslave pour le
   Kosovo. L'Albanie, elle, A besoin du champ (`ALL`, le lek albanais, hors zone euro, flottant) — pays
   MOINS cher que la zone euro, même profil que la République tchèque/la Pologne/la Hongrie/la
   Bosnie-Herzégovine : loyer Airbnb médian à Tirana ~55-60 $/~52-56 € (airdna/airroi 2026), 1 EUR ≈ 93
   ALL début septembre 2026 (bankofalbania.org/wise.com). La Serbie, elle, A besoin du champ (`RSD`,
   le dinar serbe, hors zone euro) : cours étroitement géré par la Banque nationale de Serbie autour
   de ~117,4 RSD pour 1 EUR depuis des années (tolls.eu 2026, xe.com), sans être un régime de caisse
   d'émission à parité fixe légale comme le mark convertible bosnien — pays moins cher que la zone
   euro, même profil que la Bosnie-Herzégovine voisine (loyer Airbnb médian à Belgrade ~6 700
   RSD/nuit, ~57 €, airdna.co/investropa.com 2026), paliers `BUDGET_PRICE_MAX.RSD` calés à ~75% de la
   conversion EUR->RSD. La Macédoine du Nord, elle aussi, A besoin du champ (`MKD`, le denar
   macédonien, hors zone euro) : ancré DE FACTO à l'euro par la Banque nationale depuis 1997 (~61,5
   MKD = 1 EUR, cible officielle de politique de change — mappr.co, fxrate.io 2026), un régime proche
   sans en être formellement un de la caisse d'émission bosnienne — pays encore moins cher que la
   Serbie/la Bosnie-Herzégovine (loyer Airbnb moyen à Skopje ~42-55 $/nuit, ~39-51 €, airdna.co 2026),
   paliers `BUDGET_PRICE_MAX.MKD` calés à ~55-60% de la conversion EUR->MKD, un cran sous la Serbie.
   **La Grèce n'a besoin d'aucun champ `currency`** : en zone euro depuis 2001, comme la France. **La
   Bulgarie non plus**, mais pour une raison inédite dans cette série — elle A adopté l'euro le 1er
   janvier 2026 (le lev bulgare/BGN a cessé d'avoir cours légal le 1er février 2026, fin de la période
   de double circulation), l'ajout de ce pays intervenant après cette bascule : `COUNTRIES.BG` reste
   donc sans champ `currency`, une simplification qui n'aurait pas été possible un an plus tôt (le lev
   était, jusque-là, ancré au deutsche mark puis à l'euro par caisse d'émission depuis 1997 — même
   régime que le mark convertible bosnien — mais restait une devise distincte). **La Roumanie, elle, A
   besoin du champ** (`RON`, le leu roumain — symbole décoratif "lei" au pluriel dans le sélecteur de
   devise, `CURRENCY_GLYPH.RON`) : hors zone euro, sans date d'adoption fixée officiellement à ce jour
   malgré l'appartenance à l'UE depuis 2007, cours flottant — 1 EUR ≈ 5,08 RON début septembre 2026
   (bnr.ro/xe.com). Pays moins cher que la zone euro, même profil que la Bulgarie/la Serbie/la
   Macédoine du Nord (loyer Airbnb médian à Bucarest ~35-45 €/nuit, airdna.co/investropa.com 2026),
   paliers `BUDGET_PRICE_MAX.RON` calés à ~55-60% de la conversion EUR->RON.
   **La Lettonie, la Lituanie et l'Estonie n'ont besoin d'aucun champ `currency`** : en zone euro
   depuis 2014, 2015 et 2011 respectivement — les trois adoptions les plus rapprochées dans le temps
   de tous les pays ici couverts (2011-2015), la dernière (Lituanie) restant tout de même antérieure
   à celle de la Croatie (2023), l'adoption la plus récente de la liste.
   **Le Vatican n'a besoin d'aucun champ `currency`** : bien hors UE, mais en euro depuis son
   origine (2002) via une convention monétaire directe avec l'Union européenne (comme Monaco/
   Saint-Marin déjà couverts), avec même le droit d'émettre ses propres pièces à l'effigie du pape —
   une monnaie réellement propre, mais dans la même devise que la zone euro, donc sans le moindre
   impact sur ce champ. **L'Islande, elle, A besoin du champ** (`ISK`, la couronne islandaise) : hors
   UE et hors zone euro (deux référendums d'adhésion abandonnés avant leur terme, en 2013 puis en
   2015), cours flottant — 1 EUR ≈ 140,8 ISK début septembre 2026 (xe.com/sedlabanki.is, la banque
   centrale islandaise). Pays PLUS cher que la zone euro, même profil que la Suisse/le Danemark/la
   Norvège/la Suède (loyer Airbnb médian à Reykjavík ~198 €/nuit, airdna.co/airroi.com 2026), paliers
   `BUDGET_PRICE_MAX.ISK` calés sur les mêmes ratios que ces quatre devises déjà couvertes.
   `CURRENCY_GLYPH.ISK` réutilise le symbole "kr" — DÉJÀ partagé par le DKK/le NOK/le SEK depuis les
   passages précédents, un quatrième pays nordique reprenant donc le même glyphe plutôt que d'en
   introduire un nouveau (les quatre couronnes scandinaves/nordiques s'écrivent toutes "kr" dans leur
   propre pays). **Les îles Féroé, elles, réutilisent explicitement `DKK`** (déjà couvert par le
   Danemark) plutôt que d'introduire un nouveau code : la couronne féroïenne (føroyskar krónur)
   n'a, à ce jour, aucun code ISO 4217 distinct — elle circule à parité stricte avec la couronne
   danoise dont elle n'est, monétairement, qu'une émission billet locale (les pièces restent
   exclusivement danoises), le territoire faisant partie du royaume du Danemark tout en étant hors UE.
   **Gibraltar, la Moldavie, la Biélorussie et l'Ukraine**, ajoutés ensuite, ont chacun besoin du
   champ. **Gibraltar** (`GIP`, la livre de Gibraltar) : parité FIXE 1:1 avec la livre sterling
   (billets/pièces britanniques ayant cours légal sur le territoire, l'inverse n'étant PAS vrai) mais
   un vrai code ISO 4217 propre malgré cette parité, contrairement à la couronne féroïenne — pays
   plus cher que le Royaume-Uni lui-même plutôt qu'un simple alignement sur `GBP` : logement vacances
   ~£103/nuit en moyenne (rentgibraltar.com/momondo.co.uk 2026), contre £120 pour le palier "moyen"
   déjà retenu pour `GBP` — paliers `BUDGET_PRICE_MAX.GIP` propres (75/105/200) plutôt que réutilisés
   tels quels. **La Moldavie** (`MDL`, le leu moldave, hors zone euro, flottant — 1 EUR ≈ 20,1 MDL
   début septembre 2026, xe.com/wise.com) : pays moins cher que la zone euro, profil proche de la
   Roumanie/la Serbie voisines (loyer vacances moyen à Chişinău ~47-51 €/nuit, airroi.com 2026),
   paliers `BUDGET_PRICE_MAX.MDL` calés à ~0,55×/2× le palier moyen. **La Biélorussie** (`BYN`, le
   rouble biélorusse, redénominé en 2016 après une forte inflation historique, hors zone euro,
   flottant — 1 EUR ≈ 3,4 BYN début septembre 2026) : Minsk, loyer vacances très variable selon le
   quartier (~$41-125/nuit, expedia.com/cozycozy.com 2026, pas de repère Airbnb natif publié
   directement en BYN), paliers `BUDGET_PRICE_MAX.BYN` calés sur le milieu de fourchette centre-ville.
   **L'Ukraine** (`UAH`, la hryvnia, hors zone euro, régime de change GÉRÉ plutôt que librement
   flottant depuis le début de la guerre — 1 EUR ≈ 51,9 UAH début septembre 2026, xe.com/
   investing.com) : Kyiv (ville la plus chère du pays, largement représentative), loyer vacances
   moyen ~35-38 €/nuit (airroi.com 2026), paliers `BUDGET_PRICE_MAX.UAH` calés au même ratio que la
   Moldavie/la Biélorussie. `CURRENCY_SYMBOL` reste au code ISO pour les quatre (même règle que
   `GBP`/`CZK`/`PLN`... — aucun symbole assez universellement reconnaissable pour éviter toute
   ambiguïté) ; `CURRENCY_GLYPH` (affichage du sélecteur de devise uniquement) réutilise "£" pour
   `GIP` (même symbole que la livre sterling), "L" pour `MDL` (comme `ALL`, le lek albanais — une
   simple lettre plutôt qu'un symbole dédié), "Br" pour `BYN` (abréviation latine officielle adoptée
   par la Banque nationale de Biélorussie en 2005 — un nouveau symbole graphique, un "Б" cyrillique
   stylisé façon signe rouble russe "₽", a bien été retenu par un nouveau concours officiel en
   janvier 2026, mais un symbole de monnaie tout juste adopté met en pratique plusieurs années à
   obtenir un point de code Unicode propre — le "₽" russe, adopté en 2013, n'a été normalisé qu'en
   2014 — l'utiliser maintenant afficherait très probablement un caractère manquant, même risque de
   rendu déjà rencontré et évité une fois dans ce projet pour les émojis drapeau du sélecteur de
   langue, voir "Langues" plus bas ; "Br", encore officiellement en usage, reste le choix fiable) et
   "₴" pour `UAH` (signe monétaire dédié de la hryvnia, U+20B4, normalisé de longue date et
   largement pris en charge — un vrai symbole comme "€"/"£" plutôt qu'une abréviation, contrairement
   aux trois précédents).
   **La Turquie**, ajoutée ensuite, a besoin du champ (`TRY`, la livre turque, hors zone euro, flottante
   — 1 EUR ≈ 56,3 TRY début septembre 2026, xe.com/ecb.europa.eu). Istanbul (ville la plus chère du
   pays) : loyer vacances médian ~74-75 $/nuit (~70 €, airroi.com/investropa.com 2026, premier
   semestre), quartiers premium (Galata/Cihangir à Beyoğlu) ~95-160 $/nuit, quartiers plus abordables
   ~50-70 $/nuit. Palier "moyen" calé sur ce loyer médian (~70 €) converti au taux ci-dessus (~4000
   TRY), mêmes ratios 0,55×/2× que la Moldavie/la Biélorussie/l'Ukraine ci-dessus.
   `CURRENCY_SYMBOL.TRY` reste au code ISO comme le reste de la table, malgré un vrai symbole reconnu
   ("₺") suffisamment établi pour ne poser aucun risque — cohérence avec le reste de la table plutôt
   qu'une exception. `CURRENCY_GLYPH.TRY` (sélecteur de devise uniquement) utilise justement ce "₺" :
   contrairement au "Б" biélorusse tout juste choisi par un concours officiel en 2026 (voir plus haut),
   un symbole ADOPTÉ EN 2012 et normalisé Unicode depuis la même année (v6.2) — plus de dix ans de
   recul, largement pris en charge par toutes les polices système courantes, aucun risque de caractère
   manquant comparable.
   **La Géorgie**, ajoutée ensuite, a besoin du champ (`GEL`, le lari géorgien, hors zone euro,
   flottante — 1 EUR ≈ 3,04 GEL début septembre 2026, xe.com/valutafx.com). Tbilissi (ville la plus
   chère du pays) : loyer vacances médian ~$49-58/nuit (airdna.co/airroi.com 2026), soit ~45 € aux
   taux courants. Palier "moyen" calé sur ce loyer médian converti au taux ci-dessus (~130 GEL), mêmes
   ratios 0,55×/2× que la Moldavie/la Biélorussie/l'Ukraine/la Turquie ci-dessus. `CURRENCY_GLYPH.GEL`
   utilise le vrai symbole "₾" : adopté par la Banque nationale de Géorgie en 2014, normalisé Unicode
   dès 2015 (v8.0) — plus de dix ans de recul, même niveau de sécurité que le "₺" turc ci-dessus.
   La devise détermine le plafond de prix affiché pour le logement
   (`BUDGET_PRICE_MAX`, un jeu de valeurs par devise, pas une simple conversion au taux de change) et
   la devise des liens de recherche Airbnb/Booking générés — jamais le péage, toujours affiché en
   euros quelle que soit la devise du pays (voir `toll.enabled`/`toll.disabled` dans `i18n.js`, non
   paramétrées par devise) ; la Bosnie-Herzégovine fut le premier pays `hasToll:true` hors zone euro
   ici couvert, rejointe depuis par la Serbie et la Macédoine du Nord — leur péage reste affiché en €
   comme celui de la France ou de la Croatie, jamais en RSD/MKD/KM.

**L'Arménie, l'Azerbaïdjan, la Syrie et Chypre**, ajoutés ensuite (les quatre en une seule fois,
choix explicite de l'utilisateur comme pour Gibraltar/la Moldavie/la Biélorussie/l'Ukraine plus haut).
**L'Arménie** : GeoNames n'a AUCUN fichier de codes postaux pour ce pays (export/zip/AM.zip -> 404,
comme la Géorgie/le Monténégro/le Kosovo) — reconstruit depuis la liste officielle des 775 bureaux de
poste d'Haypost (la poste nationale arménienne elle-même, une source plus directe encore que yell.ge
pour la Géorgie), rapprochée par nom (`scripts/build-am-communes.js`, 458 communes retenues sur 775
bureaux, dont Erevan renommée depuis "Etchmiadzin"/"Echmiadzin" vers son nom officiel actuel
"Vagharshapat"). `hasToll:false` (aucun péage réel — le seul dispositif ayant existé, un droit d'usage
pour véhicules étrangers, a été aboli en 2018). Devise `AMD` (dram arménien), `CURRENCY_GLYPH` utilise
le vrai symbole "֏" (U+058F, normalisé Unicode 6.1/2012). Pas de fichier alias pour cet ajout (comme
la France). **L'Azerbaïdjan** : pipeline standard, GeoNames publie un vrai fichier de codes postaux —
4 277 communes retenues sur 5 018 dédoublonnées, treize corrections `NAME_OVERRIDES` parmi les plus
grandes villes du pays (alphabet latin azerbaïdjanais officiel depuis 1991 — "Baku"->"Bakı",
"Ganja"->"Gəncə"... voir `scripts/build-country-communes.js`). `hasToll:true` : un vrai péage
proportionnel à la distance existe (route M-1 Bakou-Quba, 129 km, barème officiel AAYDA). Devise
`AZN` (manat azerbaïdjanais), symbole "₼" (U+20BC, normalisé Unicode 7.0/2014, aucune ambiguïté avec
le manat turkmène). **Limite importante documentée par transparence** : les frontières terrestres de
l'Azerbaïdjan sont fermées à l'entrée des voyageurs depuis mars 2020 (prolongé sans interruption
depuis, dernière échéance connue le 1er octobre 2026, motif désormais sécuritaire selon le président
Aliyev) — un road trip y entrant en voiture n'est donc pas physiquement réalisable aujourd'hui ; pays
ajouté malgré cette limite (choix explicite de l'utilisateur), à surveiller plutôt qu'à considérer
comme définitif. **La Syrie** : ni fichier GeoNames ni source tierce fiable identifiée pour les codes
postaux — et, à la différence des trois cas ci-dessus, la Syrie n'a tout simplement AUCUN système de
codes postaux en usage réel (courrier distribué par gouvernorat/district/sous-district, sans code
numérique). PREMIER CAS DE CE GENRE dans ce projet : le champ "cp" utilise le code de gouvernorat ISO
3166-2:SY (14 gouvernorats, ex. "SY-DI" Damas) plutôt qu'un vrai code postal (`scripts/
build-sy-communes.js`), couverture volontairement limitée aux localités d'au moins 1 000 habitants
(126 communes, champ population très lacunaire dans le dump syrien) — quatre corrections
`NAME_OVERRIDES` parmi les plus grandes villes ("Aleppo"->"Halab", "Damascus"->"Damashq",
"Homs"->"Hims", "Latakia"->"Al Ladhiqiyah", translittérations arabes déjà présentes dans les noms
alternatifs GeoNames). `hasToll:false` (aucun péage en vigueur ; des corridors à péage sous concession
privée sont à l'étude mi-2026, rien de construit). Devise `SYP` (nouvelle livre syrienne, introduite
le 1er/3 janvier 2026, 100 anciennes livres = 1 nouvelle) — `CURRENCY_GLYPH` utilise l'abréviation
arabe "ل.س" (aucun symbole Unicode dédié n'existe pour cette devise) ; palier `BUDGET_PRICE_MAX.SYP`
documenté comme une estimation TRÈS prudente faute de taux de change ou de marché du logement
touristique vérifiable après la guerre civile. Aucun ferry pour véhicule de tourisme identifié (la
ligne Mersin-Lattaquié est un cargo Ro-Ro pour remorques, pas un ferry touristique). **Chypre** :
pipeline standard, GeoNames publie un vrai fichier de codes postaux couvrant l'île entière (nord
compris, mêmes coordonnées exactes entre le dump et le fichier de codes postaux pour Kyrénia/
Famagouste/Morphou — repris tel quel, sans exclusion ni retouche éditoriale politique, même principe
déjà appliqué au Kosovo/à la Crimée/à la Transnistrie/à l'Abkhazie). Trois corrections
`NAME_OVERRIDES` limitées aux villes SANS ambiguïté de contrôle territorial (Limassol->Lemesos,
Larnaca->Larnaka, Paphos->Pafos) ; Nicosie/Kyrénia/Famagouste ne sont PAS corrigées (Nicosie reste le
nom utilisé jusque dans les communications officielles anglophones de la République de Chypre
elle-même ; Kyrénia/Famagouste sont administrées de facto par la partie chypriote turque, non reconnue
internationalement — y substituer la forme grecque trancherait éditorialement une question politique
disputée). `hasToll:false`, aucune vignette. Chypre n'a PAS besoin de son propre `landmassOf` par
accident : sans lui, l'île retombait sur "continental" comme tout pays non listé et un trajet aurait
pu "rouler" jusqu'en Turquie/en Grèce à travers la mer — bug détecté et corrigé pendant les tests de
cet ajout (voir `landmassOf` dans `lib/trip-engine.js`). Une vraie ligne de ferry pour véhicules
Limassol-Le Pirée existe et opère à nouveau depuis 2022 (soutien du conseil des ministres chypriote
prolongé jusqu'en 2027), mais saisonnière (fin mai-début septembre) et portée par un unique opérateur
privé ayant déjà changé de nom plusieurs fois depuis la reprise — faute de durée/tarif par véhicule
vérifiés avec la même rigueur que le reste de `FERRY_ROUTES`, elle n'a pas été ajoutée à cette table
plutôt que d'inventer un chiffre : Chypre reste pour l'instant un îlot autonome, comme l'Islande ou
les îles Féroé. Devise : euro (zone euro depuis 2008), aucun champ `currency` nécessaire.

**Le Liban, Israël, la Palestine, la Jordanie, l'Égypte et la Libye**, ajoutés ensuite (les six
en une seule fois, choix explicite de l'utilisateur). AUCUN des six n'a de fichier de codes postaux
GeoNames (`export/zip/{LB,IL,PS,JO,EG,LY}.zip` -> 404, vérifié pour chacun) — mais contrairement à la
Syrie, la plupart ont un VRAI système de codes postaux, simplement sans source ouverte exploitable
commune par commune (voir `scripts/build-govfallback-communes.js`, qui traite les six ensemble). Le
champ "cp" retombe donc sur un code de gouvernorat/district ISO 3166-2 (ou une étiquette informelle
documentée comme telle quand aucun code ISO officiel ne correspond au découpage que GeoNames
distingue réellement) :
- **Liban** : système LibanPost à 4(+4) chiffres réel mais sans liste exhaustive par localité
  trouvée (site officiel non accessible en automatisé). 41 communes retenues (population ≥500, champ
  très lacunaire dans le dump libanais — seulement 41 lieux sur 3 309 candidats ont une population
  enregistrée, pour un pays de ~5,5 millions d'habitants). Quatre corrections `NAME_OVERRIDES`
  confirmées par la liste de noms alternatifs GeoNames de chaque entrée : Beirut->Beyrouth,
  Tripoli->Trâblous, Sidon->Saïda, Tyre->Soûr (formes francophones, cohérentes avec le statut réel du
  français au Liban — voir "Langues" plus bas). `hasToll:false` (aucun péage n'a jamais existé, aucun
  projet identifié). Devise `LBP` — dollarisation de facto de l'économie depuis la crise de 2019-2020
  largement documentée, mais LBP reste la devise légale ; taux stabilisé ~89 500 LBP/USD début 2026
  (Sayrafa/officiel unifiés fin 2023).
- **Israël** : système à 7 chiffres réel, mais calé au niveau de la RUE plutôt que de la commune —
  cas inédit parmi tous les pays de ce projet. La seule source tierce exploitable identifiée
  (odata.org.il, extraction ~09/2020) est protégée par un CAPTCHA Cloudflare, jamais contourné par
  principe : repli sur le district (6 districts + "Judea and Samaria Area", 4 lieux seulement dans le
  dump israélien lui-même sous ce dernier libellé, repris tel quel sans retouche éditoriale — même
  principe que pour le nord de Chypre/le Kosovo/la Crimée ailleurs dans ce projet). 407 communes
  retenues (population ≥1000). Quatre corrections confirmées : Jerusalem->Yerushalayim,
  Tel Aviv->Tel Aviv-Yafo, Jaffa->Yafo, Beersheba->Be'er Sheva. `hasToll:true` — deux vrais ouvrages
  réels (route 6/Derech Eretz, tunnels du Carmel/Carmelton) mais tarifés AU TRONÇON plutôt qu'au
  kilomètre : barème approximatif dérivé du tarif occasionnel "tous tronçons" rapporté à la longueur
  usuelle de la route 6 (~150 km) — précision plus faible que pour la Turquie/la Bosnie-Herzégovine
  (voir `TOLL_RATE_BY_COUNTRY.IL` dans `trip-data.js` pour le détail complet du calcul). Devise `ILS`
  — symbole dédié "₪" (U+20AA, normalisé Unicode dès 1993).
- **Palestine** (code GeoNames "PS", Cisjordanie + bande de Gaza) : codes lancés par l'Autorité
  palestinienne en 2021, qualifiés "plus symboliques que pratiques" par un employé postal cité dans
  la presse — aucune liste exploitable, repli sur "PS-WBK"/"PS-GZA" (étiquettes informelles, GeoNames
  ne distinguant que ces deux zones dans son propre champ admin1, plus grossier que le vrai découpage
  ISO 3166-2:PS à 16 gouvernorats). 337 communes retenues (population ≥1000), dont Hebron->Al Khalil
  (seule correction de nom nécessaire). `hasToll:false`. Aucun champ `currency` propre (le Protocole
  de Paris de 1994 n'a désigné aucune monnaie unique, mais le shekel — déjà couvert par Israël
  ci-dessus — domine largement les transactions quotidiennes, même logique que Chypre/l'euro plus
  haut). **Situation actuelle documentée par transparence** (choix explicite de l'utilisateur
  d'inclure les deux zones malgré cela) : Gaza traverse une catastrophe humanitaire active malgré le
  cessez-le-feu du 10 octobre 2025 (plus de 1300 morts rapportés depuis cette date jusqu'à début
  septembre 2026, infrastructures d'eau très largement hors service, Etats-Unis niveau 4
  "Do Not Travel") ; la Cisjordanie connaît une situation sécuritaire grave et distincte (82
  Palestiniens tués janvier-août 2026, zones d'interdiction ponctuelles selon le FCDO britannique,
  niveau 3 "Reconsider Travel" côté américain) — sources : OCHA oPt, France Diplomatie, gov.uk,
  travel.state.gov, toutes datées de 2026.
- **Jordanie** : système à 5 chiffres réel, mais sans liste exhaustive par localité en source
  ouverte (site officiel protégé Cloudflare, bases tierces commerciales incomplètes/payantes). 90
  communes retenues (population ≥1000), une seule correction (Amman->'Amman, apostrophe confirmée
  dans les noms alternatifs GeoNames). `hasToll:false` (projet à l'étude, "Economic Modernization
  Vision", rien de construit). Devise `JOD` — arrimée au dollar depuis 1995, devise "forte"
  contrairement à la plupart des autres devises de cette table (1 JOD ≈ 1,22 EUR mi-septembre 2026).
  Une vraie ligne de ferry pour véhicules Aqaba-Nuweiba existe vers l'Égypte (Arab Bridge Maritime,
  ~2-3h, tarifs officiels ~250 $ voiture) — voir le paragraphe Égypte ci-dessous pour l'explication
  détaillée de son absence délibérée de `FERRY_ROUTES`.
- **Égypte** : système à 5 chiffres réel, annuaires tiers gratuits (Egyxa) montrant des exemples
  authentiques mais sans garantie de couverture pour un pays de ~100 millions d'habitants — repli sur
  le gouvernorat par prudence plutôt qu'un rapprochement par nom non vérifiable à cette échelle
  (contrairement à la Géorgie/au Monténégro, où la taille bien plus modeste du pays limitait le risque
  d'une erreur silencieuse). 251 communes retenues (population ≥1000, sur 11 646 lieux candidats —
  champ population très lacunaire malgré la taille du pays). Cinq corrections confirmées :
  Cairo->Al Qahirah, Alexandria->Al Iskandariyah, Port Said->Bur Sa'id, Suez->As Suways,
  Luxor->Al Uqsur. `hasToll:false` — un vrai réseau de péages existe mais à tarif FIXE par poste
  ("بوابة رسوم"), sans barème origine-destination cohérent, même traitement que le pont du Storebælt
  danois/le M50 irlandais déjà écartés du modèle ailleurs dans ce projet. Devise `EGP` — plusieurs
  dévaluations majeures depuis 2016 puis 2022-2024, ~59,5 EGP/EUR mi-septembre 2026.
  **Ferry Aqaba (Jordanie) – Nuweiba (Égypte) : réel, mais DÉLIBÉRÉMENT PAS ajouté à `FERRY_ROUTES`.**
  La Jordanie et l'Égypte partagent déjà, via Israël (les trois pays "continental" au sens de
  `landmassOf`), un vrai itinéraire terrestre alternatif — contrairement à Malte ou aux îles
  grecques, qui elles n'ont AUCUNE alternative terrestre et ont donc besoin d'un vrai ferry pour être
  atteignables. Donner à la Jordanie et à l'Égypte leur propre "landmass" rien que pour activer cette
  ligne casserait la connectivité terrestre réelle déjà correcte entre les trois pays.
- **Libye** : aucun système exploitable identifié, cas le plus proche de la Syrie stricto sensu (pas
  de page Wikipedia "Postal codes in Libya", aucune liste officielle Libya Post Company trouvée,
  plusieurs agrégateurs tiers repérés comme peu fiables — même piège déjà écarté pour la Syrie). 119
  communes retenues (population ≥1000). Trois corrections confirmées : Tripoli->Tarabulus,
  Benghazi->Banghazi, Tobruk->Tubruq — piège détecté en cours de route : "Tripoli" est le nom brut à
  la fois d'une ville libanaise ET de la capitale libyenne dans leurs dumps GeoNames respectifs ; une
  première version de la table de correction, globale plutôt que par pays, avait appliqué par erreur
  la forme libanaise "Trâblous" à la Tripoli libyenne aussi — détecté en relisant le résultat avant de
  committer, corrigé en séparant la table par pays (voir `NAME_OVERRIDES_BY_COUNTRY` dans
  `build-govfallback-communes.js`). `hasToll:false` (absence de preuve plutôt que preuve d'absence
  explicite, nuance documentée par honnêteté). Devise `LYD` — double taux marqué : officiel ≈6,30
  LYD/USD (dévaluation du 18 janvier 2026), marché parallèle ≈10 LYD/USD (écart &gt;50%). **Limite
  importante documentée par transparence** (choix explicite de l'utilisateur d'ajouter le pays malgré
  cela, comme pour l'Azerbaïdjan plus haut) : la quasi-totalité du territoire est sous le niveau de
  déconseil le plus élevé des autorités occidentales au moment de cet ajout — Etats-Unis niveau 4
  "Do Not Travel" (mise à jour du 31 août 2026 ; mines et engins non explosés non signalés de façon
  fiable sur l'ensemble du territoire, recommandation officielle de laisser un testament et un
  échantillon ADN avant le voyage), France Diplomatie déconseille formellement tout le pays sauf
  Misrata/Benghazi. Pays toujours divisé de facto entre deux autorités rivales sans réunification
  effective à ce jour.

**Adjacence réelle entre pays, nouveau mécanisme introduit par cet ajout** (`reallyAdjacent()` dans
`lib/trip-engine.js`) : le modèle "même masse continentale = joignable" (voir `landmassOf` plus haut)
ne vérifiait jusqu'ici jamais l'adjacence RÉELLE entre deux pays — sans conséquence pratique tant que
l'Europe/le Caucase déjà couverts formaient une chaîne de vraies frontières communes. Découvert en
testant cet ajout : un trajet généré depuis Beyrouth proposait une étape en Israël (frontière fermée
depuis des décennies, état de guerre non résolu, "ligne bleue" ONU sans aucun point de passage civil),
PUIS un autre trajet une étape directement en Cisjordanie (le Liban et la Palestine ne partagent
tout simplement AUCUNE frontière) — même famille de bug que Chypre lors de l'ajout précédent, mais une
question d'adjacence terrestre plutôt qu'une mer à traverser. Corrigé par une liste BLANCHE de paires
réellement adjacentes (poste-frontière ouvert identifié : Masnaa Liban-Syrie, Nasib/Jaber
Syrie-Jordanie, Sheikh Hussein/Allenby/Wadi Araba Israël-Jordanie, Taba Israël-Égypte, checkpoints
Israël-Palestine, Allenby Jordanie-Palestine, Amsaad/Ras Jdir Égypte-Libye, Rafah Égypte-Palestine —
depuis, la liste retient toute frontière franchie par une route, Liban-Israël et Syrie-Israël compris,
voir « Zones à tension et frontières »),
appliquée UNIQUEMENT quand au moins un des deux pays fait partie de cet ajout — jamais aux
paires ne concernant que des pays déjà couverts avant lui (l'Arménie et la Syrie, par exemple, ne sont
pas non plus adjacentes, mais ce cas reste hors du périmètre de ce correctif). Un second bug, plus
subtil, a été détecté par un test automatisé de 180 trajets générés plutôt qu'en relisant le code :
la variable suivant le pays de l'étape COURANTE n'était en fait mise à jour qu'une seule fois, au
départ, jamais après chaque nouvelle étape choisie (contrairement à la masse continentale, elle bien
mise à jour) — un trajet Amman -> Syrie -> Israël passait ainsi le second saut avec succès, comparé
à tort à "Jordanie" (adjacente à Israël) plutôt qu'à "Syrie" (qui, elle, ne l'est pas).

### Maghreb : Maroc, Algérie, Tunisie, Sahara occidental (septembre 2026)

Quatre territoires ajoutés en une fois, chacun avec une stratégie de code postal DIFFÉRENTE — établie
en inspectant les sources avant d'écrire la moindre ligne, et non en appliquant le pipeline standard
par défaut. Script dédié : `scripts/build-maghreb-communes.js`, qui porte le détail en commentaire.

**L'Algérie** est la seule des quatre avec un fichier GeoNames de codes postaux réellement
utilisable : 15 951 entrées, 3 162 codes distincts, toutes géolocalisées, et surtout CONTENANT les
codes des grandes villes (16000 Alger, 31000 Oran, 25000 Constantine, 09000 Blida — vérifiés un par
un). Rapprochement par coordonnée la plus proche comme pour la Grèce, avec un garde-fou en plus :
le point postal retenu doit appartenir à la même WILAYA que le lieu. Sans ce contrôle Blida héritait
du code 35012 de Boumerdès, le point le plus proche à vol d'oiseau se trouvant de l'autre côté d'une
limite de wilaya. **Piège majeur rencontré** : les deux fichiers n'utilisent pas le même référentiel
admin1 malgré une apparence identique — le dump porte le code interne GeoNames ("01" = Alger), le
fichier postal le numéro officiel de wilaya ("01" = Adrar). La première version comparait les deux
directement et écartait 7 293 lieux sur 8 139 ; la comparaison se fait donc par NOM de wilaya, via
`admin1CodesASCII.txt`. Deux exonymes divergents ont demandé un alias explicite (GeoNames écrit
"Algiers" et "El Tarf" là où le fichier postal écrit "Alger" et "El-Taref"), et les **dix wilayas
créées par la réforme de 2019** (Timimoun, Bordj Badji Mokhtar, Béni Abbès, In Salah, In Guezzam,
Djanet, El Menia, Touggourt, El M'Ghair, Ouled Djellal) n'existent pas dans le fichier postal, plus
ancien : le contrôle de wilaya y est désactivé plutôt que d'affirmer une filiation non sourcée, le
plafond de 15 km restant seul en vigueur — 360 lieux concernés, tous sahariens, là où les points
postaux sont de toute façon très espacés. **7 784 communes** retenues, une seule correction de nom
(Algiers->Alger).

**Le Maroc** a bien un fichier `export/zip/MA.zip`, mais il est INUTILISABLE : 1 325 entrées
exclusivement rurales, dont AUCUN code de grande ville — 20000 Casablanca, 10000 Rabat, 40000
Marrakech, 90000 Tanger, 30000 Fès, 80000 Agadir, 50000 Meknès, 14000 Kénitra : tous absents,
vérifiés un par un. Un rapprochement par coordonnée a été essayé puis abandonné parce qu'il produit
des codes FAUX exactement là où ça compte (Casablanca ressortait avec 29640, le code de Mediouna ;
Kénitra avec 12122, celui de Skhirate-Temara). Publier ces codes aurait été une erreur silencieuse.
Le champ `cp` retombe donc sur le code de RÉGION ISO 3166-2:MA — 12 régions depuis la réforme de
2015, dont la numérotation GeoNames coïncide exactement avec la numérotation ISO — comme pour
l'Égypte et les autres pays du lot précédent, et documenté comme n'étant PAS un code postal.
**46 020 communes**, le plus gros fichier du lot ; quatre lieux isolés portant un admin1 hors plage
(51, 57, 59 et un vide, un seul lieu chacun) sont écartés faute de correspondance ISO. Cinq
corrections d'exonymes vérifiées dans les noms alternatifs de chaque entrée : Fes->Fès,
Tangier->Tanger, Marrakesh->Marrakech, Meknes->Meknès, Kenitra->Kénitra.

**La Tunisie** n'a aucun fichier GeoNames de codes postaux (404), alors qu'elle a un vrai système à
4 chiffres en usage depuis le 20 mars 1980. La Poste Tunisienne n'est pas joignable en automatisé et
ne publie pas de jeu ouvert ; l'article Wikipedia ne donne que des PRÉFIXES par gouvernorat, comme
pour le Kosovo. Un jeu tiers a donc été retenu en dernier recours, exactement comme yell.ge pour la
Géorgie et postanskibroj pour le Monténégro, et avec la même réserve explicite :
[mn-youssef/state-municipality-tunisia](https://github.com/mn-youssef/state-municipality-tunisia),
4 788 localités avec code à 4 chiffres ET coordonnées, couvrant les 24 gouvernorats — **PAS une
source officielle, AUCUNE licence déclarée sur le dépôt**. Contrôles passés avant adoption : 100 %
des codes au format 4 chiffres, 0 point hors des limites de la Tunisie, 97 % des lieux GeoNames à
moins de 15 km d'un point du jeu. **1 615 communes**, aucune correction de nom nécessaire.
Les **îles Kerkennah** sont exclues par boîte de coordonnées (depuis : réintégrées, 16 lieux et une liaison
de ferry, voir « Kerkennah, Dalma, Coron et Busuanga ») : archipel sans aucune liaison routière
avec le continent, aucun tarif de ferry par véhicule vérifié pour la ligne de Sfax, et le moteur
traite toute la Tunisie comme une seule masse continentale — les laisser aurait recréé le bug de la
traversée maritime "par la route" corrigé pour Ceuta/Melilla dans ce même lot. Djerba, elle, RESTE
continentale, et c'est correct : elle est reliée à la terre ferme par la chaussée romaine d'El
Kantara.

**Le Sahara occidental** est un territoire non autonome selon l'ONU, repris TEL QUEL depuis GeoNames
qui lui attribue un code pays "EH" distinct — même principe de non-retouche que pour le nord de
Chypre, le Kosovo et la Crimée, et qui ne constitue une prise de position d'aucune sorte. Toujours
sans retouche : GeoNames répartit lui-même le territoire entre "EH" (49 lieux) et les régions
marocaines MA-11/MA-12 (12 lieux), les deux sont repris tels qu'ils viennent. Ni codes postaux (404),
ni subdivision exploitable : le champ admin1 ne contient que "00" (20 lieux), "CE" (1 lieu, Dakhla)
et du vide (29 lieux, dont Laâyoune la plus peuplée), et EH n'apparaît pas du tout dans
`admin1CodesASCII`. ISO 3166-2:EH n'a par ailleurs aucune subdivision. Le champ `cp` porte donc une
étiquette unique "EH", informelle et documentée comme telle — même solution que les étiquettes
"PS-WBK"/"PS-GZA" du lot précédent. **49 communes**, une correction (Laayoune->Laâyoune).

**Péages** : le Maroc et la Tunisie ont `hasToll:true`, l'Algérie et le Sahara occidental non.
L'autoroute Est-Ouest algérienne (1 216 km) et tout le réseau sont gratuits : 48 postes de péage ont
été construits physiquement vers 2010 sans jamais être mis en service, et la mise en péage a été
explicitement écartée par le président Tebboune en février 2026 — traité comme un projet abandonné,
pas comme un péage à venir. Au Sahara occidental, la voie express Tiznit-Dakhla relève du ministère
de l'Équipement et non d'ADM, et le réseau concédé s'arrête à Agadir. Les barèmes marocain et
tunisien, leur dérivation et les liaisons de référence retenues sont détaillés dans
`TOLL_RATE_BY_COUNTRY` (`public/js/trip-data.js`). À noter pour les deux : ni ADM ni la STA ne
publient de classe MOTO — une motocyclette relève de leur classe 1 par la définition même de cette
classe (deux essieux, moins de 1,30 m pour ADM ; "véhicules légers" pour la STA), ce qui est une
lecture du barème et non un tarif inventé.

**Devises** : `MAD` (Maroc et Sahara occidental, 2 décimales), `DZD` (Algérie, 2 décimales — et non
3, les centimes étant sortis de l'usage), `TND` (Tunisie, **3 décimales**, le millime valant 1/1000
de dinar). Aucune des trois n'a de point de code Unicode dédié : `CURRENCY_GLYPH` utilise les
abréviations arabes usuelles "د.م." / "د.ج" / "د.ت". **Réserve importante pour l'Algérie** : le taux
officiel de la Banque d'Algérie (~154 DZD pour 1 EUR le 15/09/2026) est celui utilisé ici, faute de
source officielle possible pour l'autre, mais le marché parallèle s'échangeait autour de 276 DZD pour
1 EUR début septembre 2026 — un budget converti en euros au taux officiel est donc surestimé d'environ
80 %.

**Adjacence réelle** : les quatre territoires rejoignent `NEW_BATCH_COUNTRIES` (voir
`lib/trip-engine.js`), avec les frontières terrestres Libye-Tunisie, Tunisie-Algérie, Algérie-Libye,
Maroc-Sahara occidental et Algérie-Sahara occidental. **Maroc-Algérie n'y figure PAS** : la frontière
terrestre est fermée depuis 1994 et l'Algérie a rompu ses relations diplomatiques avec le Maroc en
août 2021 — aucun passage civil. Vérifié au tirage : un trajet partant d'Alger visite l'Algérie et la
Tunisie, jamais le Maroc. (Depuis : la paire Maroc-Algérie figure dans `ADJACENT_PAIRS` — une route
franchit la frontière — et la fermeture relève des zones à tension, voir « Zones à tension et frontières ».)

### Afrique de l'Ouest : treize pays d'un coup (septembre 2026)

Mauritanie, Mali, Sénégal, Gambie, Cap-Vert, Guinée, Guinée-Bissau, Sierra Leone, Liberia, Burkina
Faso, Côte d'Ivoire, Ghana et Togo — **105 373 communes**, le plus gros ajout du projet. Script
dédié : `scripts/build-westafrica-communes.js`.

**Aucun code postal, pour aucun des treize.** Vérifié un par un : `export/zip/XX.zip` renvoie 404
pour les treize. C'est le premier lot de cette ampleur sans la moindre source postale, et
contrairement au Maghreb aucun jeu tiers n'a été retenu : à cette échelle, valider la couverture et
la fiabilité de treize jeux non officiels aurait demandé autant de travail que le reste du lot pour
un risque d'erreur silencieuse bien plus élevé. Le champ `cp` porte donc partout une étiquette
"XX-<code admin1 GeoNames>", **qui n'est PAS un code ISO 3166-2** et c'est délibéré : les codes
GeoNames coïncident avec l'ISO pour certains pays (Burkina 01-13) mais pas pour d'autres (le Ghana
utilise des lettres en ISO là où GeoNames numérote). Construire treize tables de correspondance à la
main aurait multiplié les occasions de se tromper sans rien apporter au visiteur, à qui le NOM de la
région est montré à côté.

**Lieux sans division administrative : écartés.** Mesuré avant de trancher, pour vérifier que cela ne
coûtait rien de réel — les lieux concernés n'ont, à une poignée près, aucune population renseignée :
Mali 1 157 lieux sans admin1 dont 0 avec population, Togo 3 443 dont 0, Guinée-Bissau 3 182 dont 7.
Partout ailleurs le trou est négligeable (0 à 94 lieux). Ce sont des hameaux, pas des destinations.

**Le Cap-Vert est le premier pays entièrement insulaire du projet.** Neuf îles habitées, chacune sa
masse terrestre, reliées par huit liaisons de ferry — voir la section "Ferries" pour le détail des
tarifs, tous officiels. Le rattachement d'une commune à son île se fait par le CODE de concelho et
jamais par nom (deux concelhos s'appellent presque pareil sur deux îles : Santa Catarina sur
Santiago, Santa Catarina do Fogo sur Fogo) ni par coordonnées — une anomalie GeoNames a été repérée
en cours de route, la localité de Ponta Verde étant rattachée au concelho de São Filipe, sur Fogo,
tout en portant des coordonnées situées sur Santiago.

**Péages : un seul pays sur treize est modélisable.** Le Sénégal a un système FERMÉ sur
Mbour-Fatick-Kaolack (3 000 FCFA pour 100 km, chiffre de la Société nationale Autoroutes du Sénégal
du 24 août 2026), recoupé par Dakar-Kaolack (6 500 FCFA / 184 km) et Ila Touba (2 500 FCFA / 113 km).
Partout ailleurs le péage existe mais il est **forfaitaire par barrière** — 500 FCFA au Togo, 200 au
Burkina, 500 au Mali, 1 000 sur l'Autoroute du Nord ivoirienne, 20 000 GNF au pont guinéen de Tanéné,
NLe 10 en Sierra Leone — et le convertir en €/km supposerait de connaître l'espacement réel des
postes, que personne ne publie. `hasToll:false` avec la raison écrite est préféré à un chiffre dérivé
d'une hypothèse : le coût réel est donc sous-estimé pour ces pays, et c'est assumé. Cas particulier
du **Ghana**, où `hasToll:false` décrit la réalité et non un repli : les péages ont été supprimés le
18 novembre 2021, et la concession électronique approuvée par le Parlement le 31 juillet 2026 n'a
pas encore de tarif publié.

**Monnaies : sept pour treize pays.** Six utilisent le franc CFA ouest-africain (XOF, parité FIXE de
655,957 pour 1 EUR, **zéro décimale**) — Mali, Sénégal, Guinée-Bissau, Burkina, Côte d'Ivoire, Togo.
S'y ajoutent MRU (Mauritanie), GMD (Gambie), CVE (Cap-Vert, parité FIXE de 110,265 depuis l'accord de
coopération de change avec le Portugal de 1998), GNF (Guinée, **zéro décimale** également), SLE
(Sierra Leone — le leone redénominé, code SLL retiré de l'ISO en décembre 2023), LRD (Liberia) et GHS
(Ghana, seule du lot à avoir un vrai symbole Unicode, ₵ U+20B5). Deux cas à connaître : l'ouguiya se
divise réellement en **5 khoums** alors que l'ISO lui attribue 2 décimales ; et le cifrão capverdien
s'écrit en **séparateur décimal** (« 2$50 ») sans point de code Unicode propre, d'où l'affichage du
code ISO plutôt qu'un symbole ambigu.

**Adjacence réelle.** Le bloc ouest-africain ne rejoint le reste du réseau que par un seul point :
**Guerguerat**, entre la Mauritanie et le Sahara occidental. Deux frontières sont volontairement
absentes : **Mali-Mauritanie**, que le Mali a FERMÉE en octobre 2025 pour motif sécuritaire, coupant
2 337 km d'un des principaux axes du Sahel vers l'Atlantique ; et les frontières sahariennes
**Mauritanie-Algérie** et **Mali-Algérie**, dont l'ouverture effective au trafic civil n'a pas pu être
établie. Vérifié au tirage : un trajet depuis Bamako visite le Mali et la Côte d'Ivoire, jamais la
Mauritanie ; un trajet depuis Laâyoune atteint bien le Maroc et la Mauritanie.

**Deux pays sous déconseil formel de voyage**, documentés comme la Libye et l'Azerbaïdjan avant eux.
Le **Mali** : France Diplomatie classe au 15 septembre 2026 l'ensemble du territoire en zone rouge et
précise que « les attaques fréquentes sur les axes routiers interdisent toute circulation par la
route en dehors de Bamako » ; s'y ajoutent un blocus du carburant depuis septembre 2025 et un siège
de Bamako annoncé fin avril 2026. Le **Burkina Faso** : tout déplacement formellement déconseillé
(10 septembre 2026), ambassade de France fermée après rupture des relations diplomatiques, et le
Royaume-Uni déconseille également tout voyage.

### Sahel, Afrique centrale et Corne de l'Afrique : onze pays (septembre 2026)

Niger, Bénin, Nigeria, Tchad, République centrafricaine, Soudan, Soudan du Sud, Érythrée, Éthiopie,
Djibouti et Somalie — **125 381 communes**, nouveau plus gros ajout du projet (Nigeria à lui seul :
60 817 ; Djibouti : 64). Script dédié : `scripts/build-sahel-corne-communes.js`, même méthode que le
lot ouest-africain.

**Aucun code postal, pour aucun des onze** (`export/zip/XX.zip` renvoie 404 partout) : le champ `cp`
porte l'étiquette informelle "XX-<code admin1 GeoNames>", jamais présentée comme un code ISO.
**GeoNames est repris tel quel, y compris quand il retarde sur la réalité administrative** — c'est
écrit dans l'en-tête du script plutôt que corrigé à la main : l'Éthiopie y garde un ancien découpage
(les régions Sidama, South West Ethiopia, Central Ethiopia et South Ethiopia issues des réformes de
2020, 2021 et 2023 n'y existent pas) ; le Soudan y garde des codes d'États antérieurs ; le Somaliland,
indépendant de fait depuis 1991 et non reconnu, reste rangé sous la Somalie, comme GeoNames le fait.

**Péages : aucun modélisable.** Nigeria, Bénin, Niger et Tchad ont des péages **forfaitaires par
barrière** (500 ₦ par barrière fédérale au Nigeria, 300 à 1 000 FCFA au Bénin), même raisonnement que
pour l'Afrique de l'Ouest. L'**Éthiopie** est le seul vrai péage kilométrique du lot, mais son dernier
barème au kilomètre publié date de 2019 (0,77 Br/km) : la révision d'août 2026 n'est pas détaillée et
le birr a perdu l'essentiel de sa valeur depuis la libéralisation du change de juillet 2024.
Appliquer le tarif de 2019 serait un faux chiffre — `hasToll:false`, raison écrite.

**Monnaies : huit nouvelles.** XAF (franc CFA d'Afrique centrale, Tchad et Centrafrique — distinct du
XOF mais même parité fixe de 655,957 pour 1 EUR, zéro décimale), NGN (₦), SDG, SSP, ERN (nakfa arrimé
à 15 pour 1 USD), ETB, DJF (caisse d'émission à 177,721 pour 1 USD, zéro décimale) et SOS ; le Niger
et le Bénin utilisent le XOF déjà présent. Les plafonds de budget sont la gamme euro convertie au taux
comptable InforEuro de septembre 2026 — **aucune statistique publique de prix hôtelier n'existe pour
aucun des onze pays**. Deux devises n'ont qu'une valeur indicative, et c'est écrit dans le code : la
**livre soudanaise**, dont le marché parallèle (6 350-6 400 SDG pour 1 USD fin août 2026) s'écarte
fortement du cours officiel ; et le **shilling somalien**, dans une économie dollarisée de fait où
aucun billet n'a été imprimé depuis 1991.

**Adjacence : le lot le plus fermé du projet.** Seules cinq frontières sont DOCUMENTÉES comme ouvertes
au passage civil et retenues : **Niger-Nigeria** (rouverte en mars 2024), **Bénin-Togo**
(Hillacondji), **Bénin-Nigeria** (Sèmè-Kraké), **Éthiopie-Djibouti** (Galafi) et **Soudan-Égypte**
(Argeen, entièrement routier par la rive ouest du lac Nasser). Tout le reste est écarté, avec la
raison dans `lib/trip-engine.js` :
- **fermées** — Niger-Bénin (par le Niger depuis 2023), Tchad-Soudan (23 février 2026, Adré rouvert
  pour l'humanitaire seulement), Centrafrique-Soudan (juillet 2026), Tchad-Libye (zone militaire
  depuis 2017), et **toutes** les frontières de l'Érythrée ;
- **sans poste routier** — Nigeria-Tchad (la frontière commune est dans le lac Tchad) ;
- **ouverture non établie** — Niger avec Mali, Burkina, Algérie, Libye et Tchad ; Tchad-Centrafrique ;
  Centrafrique-Soudan du Sud ; Soudan avec Libye, Soudan du Sud et Éthiopie ; Soudan du Sud-Éthiopie ;
  Éthiopie-Somalie ; Djibouti-Somalie. Dans des zones de conflit, « aucune fermeture trouvée » n'est
  pas une preuve d'ouverture.

(Depuis : toutes ces frontières, sauf Nigeria-Tchad, sans route, figurent dans `ADJACENT_PAIRS` ;
fermetures et avis de sécurité relèvent des zones à tension, voir « Zones à tension et frontières ».)

Conséquence visible et voulue : **le Tchad, la Centrafrique, le Soudan du Sud, l'Érythrée et la
Somalie sont des îlots** — un trajet qui en part y reste. Vérifié au tirage (6 trajets de 7 jours,
rayon 1 500 km, par capitale) : Niamey visite Niger, Nigeria et Bénin ; Cotonou Bénin, Togo et Nigeria ;
Khartoum Soudan et Égypte ; Addis-Abeba et Djibouti l'Éthiopie et Djibouti ; N'Djamena, Bangui, Juba,
Asmara et Mogadiscio ne quittent jamais leur pays. Aucun ferry n'est nécessaire (voir "Ferries").

**Sécurité : le lot le plus exposé du projet**, documenté comme le Mali et le Burkina avant lui. Au 15
septembre 2026, France Diplomatie déconseille formellement **tout le territoire** du Niger, du Soudan
(en guerre depuis avril 2023) et de la Somalie, Somaliland compris ; en Centrafrique seule
l'agglomération de Bangui-Bimbo échappe à la zone rouge, et le Soudan du Sud est de fait entièrement
déconseillé. Le Tchad, le Nigeria (nord-est et nord-ouest), le Bénin (nord), l'Éthiopie (Tigré,
Amhara, une large part de l'Oromia et des régions frontalières), l'Érythrée et Djibouti ont des zones
rouges étendues. L'application tire des lieux réels ; elle ne dit pas qu'y aller est raisonnable.

### Afrique orientale, centrale et australe, océan Indien : vingt-quatre pays (septembre 2026)

Kenya, Ouganda, Tanzanie, Rwanda, Burundi, RD Congo, Congo, Gabon, Guinée équatoriale, Sao Tomé-et-
Principe, Angola, Zambie, Malawi, Mozambique, Zimbabwe, Botswana, Namibie, Afrique du Sud, Eswatini,
Lesotho, Comores, Madagascar, Maurice et Seychelles — **198 287 lieux**, le plus gros ajout du projet
(RD Congo 37 126, Madagascar 24 112 ; Seychelles 45). Script : `scripts/build-afrique-australe-communes.js`.
**La Réunion et Mayotte**, également demandées, sont des départements français : leurs communes
étaient déjà servies par geo.api.gouv.fr avec leurs vrais codes postaux (974xx, 976xx) et le restent.

**Codes postaux : trois fichiers GeoNames existent, tous trois mesurés puis écartés.** L'Afrique du
Sud en a 3 920, mais pour seulement 906 coordonnées distinctes (les 135 codes de Johannesburg
partagent un même point) : rattacher un lieu au « code le plus proche » serait un tirage arbitraire,
et 6 171 lieux sur 12 613 n'ont aucun point postal à moins de 15 km. Ceux du Kenya (890) et du Malawi
(491) sont des codes de bureaux de poste. Le champ `cp` suit donc partout la règle des lots africains
précédents : étiquette informelle "XX-<code admin1 GeoNames>".

**Lieux sans région : gardés cette fois**, avec l'étiquette pays seule et une région vide, comme le
Sahara occidental. Les écarter aurait vidé des pays entiers — mesuré : Guinée équatoriale 1 965 lieux
sur 2 045 (il en serait resté 80), Lesotho 239 sur 393 dont des bourgs de 5 000 à 9 000 habitants.

**Îles : toutes isolées, aucune liaison maritime ni lacustre modélisée.** Aucune ligne de la zone n'a
de grille tarifaire publiée et vérifiable (voir "Ferries"). Les îles sont reconnues par boîte de
coordonnées (`ISLAND_BOXES` dans `trip-data.js`), chaque boîte vérifiée contre les lieux réellement
publiés : Unguja et Pemba (Zanzibar, qui coïncident exactement avec les régions GeoNames), Mafia,
Ukerewe, Lamu, Mfangano, les Ssese, Likoma, Chizumulu, Idjwi, Nosy Be, Sainte-Marie, Bioko, Annobón,
Corisco, les trois îles des Comores, São Tomé et Príncipe, Maurice et Rodrigues, Mahé, Praslin et La
Digue. **L'enclave angolaise de Cabinda** est traitée de la même façon : aucune route ne la relie au
reste de l'Angola sans traverser la RD Congo. Au départ d'une très petite île (Petite-Terre à Mayotte,
Likoma, Rodrigues), le trajet se limite à quelques kilomètres grâce au dernier recours ajouté avec le
lot suivant (voir ci-dessous) ; La Digue, dont les lieux sont à moins de 2 km, reste sans trajet.
(Depuis : Unguja, Pemba, Ukerewe, les Ssese, Mfangano, Likoma, Nosy Be, Bioko, Rodrigues et Petite-Terre sont
reliées par ferry — `FERRY_ROUTES`, voir « Liaisons sans tarif fixe publié » — et Cabinda par la route via la RD Congo,
voir « Zones à tension et frontières ». Les autres îles citées restent isolées.)

**Deux bugs corrigés en chemin, antérieurs à ce lot :**
- Les départements d'outre-mer étaient tous rangés dans la masse terrestre "continental", comme la
  métropole. Invisible tant qu'aucun voisin n'était couvert ; faux dès que Maurice (220 km de La
  Réunion) et les Comores (70 km de Mayotte) arrivent. Chaque DOM a désormais la sienne, et
  Petite-Terre est séparée de Grande-Terre. Au passage, **le péage kilométrique de la métropole était
  appliqué aux trajets de La Réunion et de Mayotte**, qui n'ont aucune autoroute à péage (`tollCountryOf`).
- **`/api/pois` refusait tout lieu hors d'une boîte européenne** (lat. 35,7-61, long. -10,5-24,2),
  élargie pays par pays au fil des ajouts européens mais jamais au-delà. L'Islande, les Féroé, la
  Turquie, le Caucase, le Proche-Orient, le Maghreb et toute l'Afrique recevaient un 400 silencieux,
  donc **aucune activité réelle**, sans erreur visible. Découvert en testant un trajet kényan dans le
  navigateur ; le contrôle porte désormais sur le code pays couvert et la validité des coordonnées.

**Péages : aucun modélisable.** Afrique du Sud (SANRAL et concessionnaires, Government Gazette
n° 54087/54088 du 5 février 2026), Zambie, Zimbabwe, Malawi, Mozambique, Ouganda et Angola ont des
péages FORFAITAIRES par barrière. Le seul tarif fonction du trajet, la Nairobi Expressway, ne couvre
que 27 km urbains. L'e-toll du Gauteng est désactivé depuis le 11 avril 2024. Eswatini (E150) et le
Lesotho (R80) perçoivent une taxe d'entrée des véhicules étrangers, qui n'est pas un péage routier.

**Monnaies : vingt et une nouvelles** (KES, UGX, TZS, RWF, BIF, CDF, STN, AOA, ZMW, MWK, MZN, ZWG, BWP,
NAD, ZAR, SZL, LSL, KMF, MGA, MUR, SCR ; XAF et EUR déjà présents). Aucune n'a de symbole Unicode
dédié : abréviations d'usage (KSh, FRw, Kz, ZiG, N$, Ar…). Budgets : gamme euro convertie au taux
InforEuro de septembre 2026, parité officielle pour le franc comorien (491,96775). **L'Afrique du Sud
est le seul pays du lot à publier un prix hôtelier officiel** (Stats SA, P6410, juin 2026 : R1 446,7
par nuitée à l'hôtel) — il tombe dans la tranche "moyen" issue de la conversion, qui n'a donc pas été
retouchée. Indicatifs seulement, et écrit dans le code : le kwacha malawite (≈ 1 740 MWK/USD officiel
contre ≈ 4 000 au marché parallèle en mai 2026), le ZiG zimbabwéen (dollar d'usage courant) et le
franc congolais (économie dollarisée).

**Frontières : 26 retenues.** Règle : poste documenté comme en service par une source datée de moins
de deux ans, aucune fermeture signalée, hors zone formellement déconseillée. Une vérification ciblée
a été faite pour les postes d'Afrique australe d'abord classés « ouverts présumés » (BMA, ZIMRA,
MINICOM, presse 2026). Exclues, avec leur raison dans `lib/trip-engine.js` : **fermées** — Ouganda-RDC
(Ebola, 27 mai 2026), Rwanda-Burundi (depuis janvier 2024), Kenya-Somalie ; **sans route** —
Kinshasa-Brazzaville (le fleuve, pont prévu pour 2028), Zongo-Bangui, Tanzanie-RDC (lac Tanganyika) ;
**zones rouges** — frontières orientales de la RDC (M23/AFC, Ebola), Cabinda, Unity Bridge vers le
Cabo Delgado, Moyale, frontières du Soudan du Sud ; **non établies** — Congo-Gabon, Gabon-Guinée
équatoriale, Angola-Zambie. Le Congo, le Gabon et la Guinée équatoriale sont donc des îlots routiers,
la RD Congo n'est reliée qu'à la Zambie et l'Angola qu'à la Namibie. Vérifié au tirage (8 trajets de 7
jours par capitale) : Nairobi visite Kenya, Ouganda, Tanzanie ; Lusaka Zambie, RDC, Zimbabwe, Mozambique,
Botswana ; Brazzaville, Libreville, Malabo, Moroni, Antananarivo, Port-Louis, Victoria, Saint-Denis et
Mamoudzou ne quittent jamais leur territoire ; aucun péage à La Réunion ni à Mayotte.
(Depuis : les frontières « fermées », « zones rouges » et « non établies » ci-dessus figurent dans `ADJACENT_PAIRS` ;
seules les trois frontières sans route restent absentes, et le Congo, le Gabon et la Guinée équatoriale ne sont
plus des îlots routiers — voir « Zones à tension et frontières ».)

**Sécurité** (France Diplomatie, avis valides au 15 septembre 2026) : tourisme déconseillé dans toute
la RD Congo, où une épidémie d'Ebola (souche Bundibugyo) touche sept provinces depuis mi-mai 2026 et
où Goma et Bukavu sont tenues par le M23/AFC ; zones rouges au Cabo Delgado et dans l'est du Niassa
(Mozambique), dans les Lunda et au Cabinda (Angola), le long de la Somalie et des frontières du Soudan
du Sud et de l'Éthiopie (Kenya), des frontières de la RDC (Ouganda, Burundi, Congo), et à Mtwara
(Tanzanie). Mayotte, sans fiche France Diplomatie, reste marquée par la reconstruction lente après le
cyclone Chido et les coupures d'eau.

### Cameroun, Sainte-Hélène/Ascension/Tristan da Cunha, îles Glorieuses et Juan de Nova (septembre 2026)

**Cameroun** — 14 314 lieux, 269 alias (`scripts/build-cameroun-communes.js`, même règle que le lot
précédent : pas de fichier postal GeoNames, étiquette "CM-<admin1>"). **Aucune frontière retenue** :
tous les postes vers le Nigeria, le Tchad et la Centrafrique sont dans la zone formellement déconseillée
par France Diplomatie (bande de 30 km, Extrême-Nord et Nord-Ouest entiers, Garoua-Boulaï et Touboro
nommés) — y compris Ekok-Mfum, pourtant en service ; vers le Congo, le Gabon et la Guinée équatoriale,
aucune source de moins de deux ans sur le passage des voyageurs, et le pont Campo-Río Campo n'est pas
signalé en service. Le Cameroun est donc un îlot routier. Péages forfaitaires (500 FCFA par passage,
décret 93/034/PM ; Kribi-Lolabé 1 200 FCFA en voiture) : `hasToll:false`. Monnaie : XAF, déjà présent.
Aucun prix hôtelier officiel publié (l'annuaire statistique du tourisme 2020 de l'INS est introuvable,
celui de 2016 n'a pas de tableau de prix).

**Sainte-Hélène, Ascension et Tristan da Cunha** — 20 lieux habités GeoNames, et pour la première fois
depuis les communes françaises un **vrai code postal** dans le champ `cp` : un par île, STHL 1ZZ (fiche
UPU de la Royal Mail, 2005), ASCN 1ZZ (sources secondaires seulement, signalé), TDCU 1ZZ (bureau de
poste de Tristan). Trois îles séparées par des milliers de kilomètres, chacune isolée. Nouvelle monnaie
**SHP** (livre de Sainte-Hélène, symbole £), à parité avec la livre sterling — InforEuro de septembre
2026 donne 0,8572 pour les deux ; Tristan utilise la livre sterling elle-même. Aucune liaison modélisée :
le cargo mixte vers Sainte-Hélène (MV Karoline) n'a pas de tarif publié, les navires vers Tristan (tarifs
publiés, 500 US$ l'aller au tarif touriste) ne prennent pas de véhicule et partent du Cap. Accès réel :
permis d'entrée à Sainte-Hélène, e-visa et aucun droit de résidence à Ascension, autorisation du Conseil
de l'île à Tristan (FCDO, 10 septembre 2026).

**Îles Glorieuses et Juan de Nova** — **recherchables, sans trajet possible**, choix explicite de
l'utilisateur. Aucun habitant permanent (un gendarme et quatorze militaires par île, relevés par avion
militaire), aucune route, aucun hébergement, débarquement soumis à l'autorisation du préfet des TAAF, et
réserve naturelle nationale aux Glorieuses (décret 2021-734). GeoNames n'y recense aucun lieu habité :
les trois entrées sont les îles elles-mêmes (Île Glorieuse, Île du Lys, Île Juan de Nova), population 0,
avec 20 alias tirés des noms alternatifs GeoNames pour qu'on les trouve en tapant « Juan de Nova » ou
« Glorieuses ». Revendiquées par Madagascar (résolution 34/91 de l'Assemblée générale de l'ONU, 1979) :
reprises telles que GeoNames les range, sous TF.

**Petites îles : dernier recours ajouté au moteur.** La première étape d'un trajet exigeait au moins 15 km,
si bien que tout départ d'une île plus petite (Sainte-Hélène, Brava, Petite-Terre, Likoma, Rodrigues…)
répondait « itinéraire impossible » alors que d'autres lieux réels existaient à quelques kilomètres. Un
troisième essai, tenté seulement quand les deux premiers échouent, accepte désormais une étape dès 2 km.
Restent sans trajet les îles qui n'ont qu'un lieu, ou des lieux à moins de 2 km les uns des autres
(Tristan da Cunha, La Digue, les îles Éparses).

### Russie, Svalbard et Jan Mayen (septembre 2026)

**Russie — 173 493 lieux, retour au pipeline standard** : GeoNames publie un vrai fichier de codes
postaux russes (43 538 codes), chaque lieu reçoit celui du point postal le plus proche à moins de 15 km
(`scripts/build-russie-svalbard-communes.js`). Mesures faites avant de trancher, et écrites dans le
script : 16 529 points postaux ne sont qu'estimés (précision GeoNames 1) mais les garder ne change
presque rien ; 16 villes de plus de 10 000 habitants restaient sans point à moins de 15 km — un
rapprochement par nom russe exact, à moins de 60 km, en rattache 4 (dont Noïabrsk, 110 000 hab.),
les 12 autres (Kogalym, Monchegorsk, Nadym…) sont absentes du fichier postal ou géolocalisées à plus de
60 km de leur position réelle et restent écartées. Régions en latin (admin1 GeoNames), pour ne pas
mélanger les écritures avec les noms de lieux translittérés. **124 199 alias**, dont 87 023 en russe
cyrillique : sans eux, taper « Москва » ne trouvait rien. Crimée : quelques lieux et Sébastopol que
GeoNames range sous RU sont repris tels quels.

**Aucune frontière routière retenue.** France Diplomatie déconseille formellement tout déplacement
dans l'ensemble de la Russie (fiche du 10 septembre 2026) : toutes ses frontières tombent sous la règle
« zone formellement déconseillée », quel que soit leur état (depuis : ces frontières figurent dans
`ADJACENT_PAIRS` et l'avis relève des zones à tension, voir « Zones à tension et frontières ») — Finlande fermée depuis décembre 2023,
Narva ouverte aux seuls piétons, Ukraine fermée, Azerbaïdjan fermée à l'entrée ; Norvège, Estonie,
Lettonie, Lituanie, Pologne, Biélorussie et Géorgie ouvertes sous restrictions (voitures immatriculées
en Russie interdites dans l'UE et en Norvège). La Russie est un réseau fermé ; vérifié au tirage : aucun
trajet depuis Helsinki, Tallinn, Vilnius ou Minsk n'y entre.

**Kaliningrad** est une ZONE à part (comme Ceuta et Melilla), reliée au reste de la Russie par la
seule traversée **Oust-Louga-Baltiïsk**, et **Sakhaline** une masse terrestre reliée par
**Vanino-Kholmsk** — les deux avec grille officielle, voir "Ferries". Isolés, faute de route : le
**Kamtchatka**, la **Tchoukotka**, **Norilsk-Doudinka**, les **îles Solovetski**, les **Kouriles**, les
îles du Commandeur et la Nouvelle-Zemble. Limites écrites : Iakoutsk (rive gauche de la Lena, sans pont
avant 2028 ; bac à tarif réglementé non modélisé), Vorkouta et Naryan-Mar restent rattachées au réseau.

**Péages** : `hasToll:false`, et pas faute de données — la grille Avtodor du 2 mars 2026 donne 0,062 €/km
sur la M-11 et 0,071 €/km sur la M-12, mais les ~3 600 km d'autoroutes à péage représentent ~5 % des
routes fédérales : appliquer ce tarif à tout trajet russe le surestimerait presque toujours.
**Monnaie : RUB (₽).** Budgets calés sur la statistique OFFICIELLE Rosstat (prix moyens août 2026 :
hôtel 3* 2 665,48 ₽ par personne et par nuit, 4-5* 4 088,59 ₽), doublée pour deux adultes.
**Hébergement : limite majeure, écrite dans le code** — Booking.com et Airbnb ont cessé toute activité
en Russie en 2022 et les cartes Visa ou Mastercard étrangères n'y fonctionnent pas : les liens de
réservation générés pour un lieu russe n'aboutiront pas.

**Svalbard et Jan Mayen** — 8 lieux avec leurs vrais codes postaux norvégiens (9170 Longyearbyen, 9178
Barentsburg, 9173 Ny-Ålesund, 8099 Jan Mayen). **Aucune route ne relie les localités du Svalbard** :
seul le secteur de Longyearbyen (Nybyen, Haugen) permet un trajet, les autres lieux sont isolés ;
aucune liaison régulière vers Barentsburg en 2026, aucun ferry pour véhicules depuis le continent.
Couronne norvégienne ; le Svalbard est bien plus cher que la moyenne norvégienne sur laquelle sont calés
les plafonds NOK (Statistics Norway : 2 885 NOK par chambre en juillet 2026 contre 1 602). **Jan
Mayen** est recherchable SANS trajet (`NO_TRIP_LANDMASSES`), même choix que pour les îles Éparses :
personnel militaire et météorologique seulement, piste fermée aux vols civils, ni port ni hébergement,
autorisation préalable obligatoire. France Diplomatie : vigilance normale pour le Svalbard.

### Péninsule Arabique, Irak et Iran (septembre 2026)

Arabie saoudite, Bahreïn, Émirats arabes unis, Irak, Iran, Koweït, Oman, Qatar et Yémen — **183 088 lieux**
(Iran 72 830, Yémen 78 214, Koweït 79) et **168 175 alias**, en grande partie arabes et persans, GeoNames
rangeant les noms en translittération latine (`scripts/build-golfe-communes.js`). Aucun code postal : le
seul fichier « postal » GeoNames du lot, celui des Émirats, contient 178 171 numéros d'adresse de bâtiments
de Dubaï (système Makani), pas des codes postaux — les Émirats n'en ont pas.

**Frontières** (toutes celles qu'une route franchit) : Arabie saoudite avec la Jordanie, l'Irak, le Koweït,
le Qatar, les Émirats, Oman, le Yémen et Bahreïn (chaussée du roi Fahd) ; Émirats-Oman ; Oman-Yémen ; Irak
avec la Jordanie, la Syrie, la Turquie, l'Iran et le Koweït ; Iran avec la Turquie, l'Arménie et
l'Azerbaïdjan. Musandam, exclave omanaise, est reliée au reste d'Oman par la route à travers les Émirats.

**Îles isolées**, boîtes vérifiées contre les lieux publiés : Qeshm, Hormuz, Larak, Kish, Kharg, Lavan et la
Grande Tomb (Iran), Abou Moussa (rangée sous les Émirats par GeoNames, reprise telle quelle), Socotra, Abd
al-Kuri et Kamaran (Yémen), Farasan (Arabie saoudite), Failaka (Koweït), Sir Bani Yas (Émirats). Masirah
(Oman) est reliée par ferry (voir "Ferries"). (Depuis : Qeshm, Kish, Hormuz, Farasan, Failaka et Dalma le sont
aussi — `FERRY_ROUTES` ; les autres îles citées restent isolées.)

**Péages : aucun modélisé.** Salik (Dubaï) et Darb (Abou Dhabi) sont des portiques urbains à forfait par
passage ; la chaussée du roi Fahd un forfait de 35 SAR ; les autoroutes iraniennes un forfait par tronçon
de l'ordre d'un millième d'euro par kilomètre ; les autres pays n'ont pas de route à péage.

**Monnaies : neuf nouvelles** (SAR, AED, QAR, BHD, OMR, KWD, IQD, IRR, YER), avec les abréviations arabes en
usage (ر.س, د.إ…) et le signe du rial ﷼ pour l'Iran. Les nouveaux signes dédiés du riyal saoudien (U+20C1,
Unicode 17.0) et du dirham émirien (U+20C3, Unicode 18.0, publié le jour même de cet ajout) ne sont PAS
utilisés : encore absents de la plupart des polices système. Budgets : gamme euro convertie au taux
InforEuro de septembre 2026, contrôlée contre les prix moyens OFFICIELS — GASTAT (Arabie saoudite, T1 2026,
423 SAR) et NCSI (Oman, T1 2026, 57,5 OMR) tombent dans la tranche "moyen". Montants indicatifs, écrit dans le
code : rial iranien (taux InforEuro 1,6 million pour 1 €, marché libre ~2,55 millions ; suppression de quatre
zéros votée en 2025, non appliquée), rial yéménite (deux monnaies de fait, Sanaa et Aden), dinar irakien
(officiel 1 300 pour 1 USD, parallèle ~1 570).

**Hébergement en Iran** : Booking.com (retiré en 2018) et Airbnb n'y opèrent pas, et les cartes bancaires
étrangères n'y fonctionnent pas — les liens de réservation générés n'aboutiront pas.

**Zones à tension** (31 règles de plus, voir "Zones à tension et frontières") : Iran et Yémen entièrement en
rouge ; Irak largement en rouge et orange ; Bahreïn et Koweït entièrement en orange ; bande de 100 km le
long du Yémen en rouge en Arabie saoudite ; Musandam, Dhofar et frontière yéménite en orange à Oman ; îles
d'Abou Moussa et des Tomb en rouge ; Qatar sans zone. Contexte : crise du détroit d'Ormuz depuis février 2026.

La carte du parcours (Leaflet + tuiles OpenStreetMap, voir plus bas) n'a besoin d'aucun réglage par
pays : les tuiles couvrent nativement le monde entier, il suffit que les nouvelles communes aient
des coordonnées valides.

Optionnel : **des alias multilingues** pour saisir une ville dans une autre langue que son nom
local (voir "Langues" ci-dessous, `scripts/build-aliases.js`), puis `scripts/build-all-aliases.js`,
qui complète tous les pays dans toutes les langues d'interface — France comprise : ses communes viennent
de geo.api.gouv.fr, sans identifiant GeoNames, et sont donc rattachées aux noms alternatifs par nom et
proximité (voir "Noms alternatifs dans toutes les langues, pour tous les pays").

### Asie : trente-cinq pays et territoires (septembre 2026)

Afghanistan, Kazakhstan, Kirghizstan, Ouzbékistan, Tadjikistan, Turkménistan, Bangladesh, Bhoutan, Inde, Maldives,
Népal, Pakistan, Sri Lanka, Territoire britannique de l'océan Indien (Chagos), Chine, Hong Kong, Macao, Corée du
Nord, Corée du Sud, Japon, Mongolie, Taïwan, Brunei, Cambodge, Indonésie, Laos, Malaisie, Myanmar, Philippines,
Singapour, Thaïlande, Timor oriental, Viêt Nam, île Christmas et îles Cocos — **2 462 559 lieux**
(`scripts/build-asie-communes.js`) : Chine 895 953, Inde 534 318, Indonésie 247 167, Pakistan 145 654, Thaïlande
86 982, Népal 86 699, Corée du Sud 61 685… jusqu'aux îles Cocos (2). **765 214 alias** (`scripts/build-asie-aliases.js`)
dans les écritures de chaque pays (hanzi, kana/kanji, hangeul, devanagari, thaï…), indispensables : GeoNames range
les noms en translittération latine.

**Volume — choix explicite de l'utilisateur : tous les lieux sont gardés.** Le site passe à ~4 millions de lieux
(bundle communes 187 Mo bruts, 48 Mo en Brotli ; alias 36 Mo, 10 Mo). Le serveur occupe **~2,8 à 3,4 Go de
mémoire** une fois chargé ; `npm start` lance désormais Node avec `--max-old-space-size=8192` (tas par défaut de
~4 Go trop juste). Un tirage prend ~0,7 s. **Un hébergement mutualisé limité à 1-2 Go de mémoire ne peut plus faire
tourner l'application** (voir "Déployer sur un serveur privé").

**Codes postaux** (règle unique : au moins 90 % des lieux à moins de 15 km d'un point postal GeoNames → vrais codes,
sinon étiquette de région `XX-<admin1>`) : Inde 97,8 %, Indonésie 97,5 %, Japon 98,2 %, Corée du Sud 100 %,
Philippines 93,7 %, Bangladesh 93,0 %, Sri Lanka 96,0 %, Singapour 100 % ont leurs codes ; Chine (14,8 %), Thaïlande
(68,8 %), Pakistan (70,6 %) et Malaisie (81,8 %) prennent l'étiquette de région, comme tous les pays sans fichier.
Code unique réel : BBND 1ZZ (Chagos), 6798 (Christmas), 6799 (Cocos). Les codes 999077/999078 de Hong Kong et Macao
sont des valeurs de remplissage (aucun des deux n'a de codes postaux) : écartés.

**Frontières** (toute frontière franchie par une route) : Kazakhstan avec la Russie, la Chine, le Kirghizstan,
l'Ouzbékistan et le Turkménistan ; Kirghizstan-Ouzbékistan, Kirghizstan-Tadjikistan, Kirghizstan-Chine ;
Ouzbékistan-Tadjikistan, -Turkménistan, -Afghanistan ; Tadjikistan-Afghanistan, -Chine ; Turkménistan-Afghanistan,
-Iran ; Afghanistan-Iran, -Pakistan ; Pakistan-Iran, -Inde, -Chine ; Inde-Chine, -Népal, -Bhoutan, -Bangladesh,
-Myanmar ; Népal-Chine ; Chine avec la Mongolie, la Russie, la Corée du Nord, le Viêt Nam, le Laos, le Myanmar, Hong
Kong et Macao ; Hong Kong-Macao (pont HZMB) ; Mongolie-Russie ; Corée du Nord-Russie et -Corée du Sud ; Viêt
Nam-Laos, -Cambodge ; Laos-Thaïlande, -Cambodge, -Myanmar ; Thaïlande-Myanmar, -Cambodge, -Malaisie ;
Malaisie-Singapour, -Brunei, -Indonésie (Bornéo) ; Indonésie-Timor oriental. **Sans route, donc fermées** :
Afghanistan-Chine (col du Wakhjir), Bhoutan-Chine, Bangladesh-Myanmar.

**Îles** : règles génériques `ISLAND_RULES` (trip-data.js, construites par `scripts/build-island-rules.js` depuis
`scripts/iles/*.js`), vérifiées lieu par lieu — voir "Ferries" pour le détail et les liaisons.

**Péages : Japon et Taïwan seulement.** Japon : barème NEXCO publié par le ministère (MLIT), 24,6 JPY/km + taxe
(≈ 0,146 €/km), coefficients officiels 1,2 (véhicule moyen) et 0,8 (deux-roues). Taïwan : péage électronique au
kilomètre du Freeway Bureau, 1,20 TWD/km (≈ 0,0325 €/km), motos interdites sur autoroute ; les 20 km quotidiens
gratuits et la part fixe japonaise de 165 JPY ne sont pas modélisés. Ailleurs, forfaits par gare ou par tronçon (Inde,
Pakistan, Indonésie, Kazakhstan, Hong Kong, Bangladesh…) ou barèmes kilométriques connus seulement par la presse
(Chine, Corée du Sud, Malaisie, Viêt Nam) : aucun péage modélisé.

**Monnaies : 33 nouvelles** (AFN, KZT, KGS, UZS, TJS, TMT, BDT, BTN, INR, MVR, NPR, PKR, LKR, USD, CNY, HKD, MOP, KPW,
KRW, JPY, MNT, TWD, BND, KHR, IDR, LAK, MYR, MMK, PHP, SGD, THB, VND, AUD), chacune avec son signe usuel (₹, ¥, ₩, ฿,
₫, ₱, ៛, ₭, ₮, ₸, ৳, ؋…). Dollar américain pour les Chagos et le Timor oriental, dollar australien pour Christmas et
Cocos. Budgets : gamme euro (70 / 130 / 260) au taux InforEuro de septembre 2026, contrôlée contre les prix moyens
OFFICIELS publiés — Hong Kong (Tourism Commission) et Taïwan (Administration du tourisme) tombent dans "moyen", la
Chine (ministère de la Culture et du Tourisme) dans "economique", Singapour (SingStat) au-dessus de "moyen".
Montants indicatifs, écrits dans le code : won nord-coréen au taux de marché (aucun taux officiel publié), manat
turkmène (marché parallèle ~5,5 fois le taux officiel), kyat birman (trois taux).

**Hébergement** : Booking.com et Airbnb n'opèrent pas en Corée du Nord ; offre quasi inexistante en Afghanistan et au
Turkménistan ; Airbnb a quitté la Chine intérieure en 2022 — les liens de réservation peuvent ne rien donner.

**Zones à tension** (52 règles de plus) : Afghanistan et Corée du Nord entièrement en rouge ; Pakistan largement en
rouge et orange ; Myanmar en rouge (États et régions en conflit) et orange ailleurs ; Bangladesh orange avec zones
rouges vers la Birmanie ; Cachemire et abords de la ligne de contrôle en rouge en Inde ; bandes frontalières en
Ouzbékistan, au Tadjikistan, au Turkménistan, au Cambodge, en Thaïlande, au Laos et en Malaisie ; sud de la Thaïlande,
ouest de Mindanao et archipel de Sulu, est du Sabah, Papouasie indonésienne ; DMZ coréenne en orange ; zone
interdite de Fukushima-1 en rouge ; ancien polygone de Semipalatinsk en rouge.

### Océanie : vingt-quatre pays et territoires (septembre 2026)

Australie, Nouvelle-Zélande, Papouasie-Nouvelle-Guinée, Îles Salomon, Vanuatu, Fidji, Samoa, Tonga, Tuvalu, Kiribati,
Nauru, Îles Marshall, États fédérés de Micronésie, Palaos, Niue, Îles Cook, Tokelau, Guam, Îles Mariannes du Nord,
Samoa américaines, îles mineures éloignées des États-Unis, Pitcairn, île Norfolk, îles Heard-et-MacDonald — **35 618
lieux** (`scripts/build-oceanie-communes.js`) : Australie 13 409, Papouasie-Nouvelle-Guinée 11 470, Îles Salomon 2 527,
Nouvelle-Zélande 2 385, Fidji 2 212, Vanuatu 1 905… Pitcairn 1. **~2 800 alias** (`scripts/build-oceanie-aliases.js`),
notamment en māori, samoan, fidjien et français.

**Codes postaux** (même règle des 90 %) : Australie (90,9 % — les 1 347 lieux sans point postal à moins de 15 km,
surtout dans l'outback, sont écartés), Nouvelle-Zélande (94,5 %, 140 écartés) et Guam (100 %) ont leurs codes. Codes
ZIP de l'USPS par île ou par État : Mariannes du Nord (Saipan 96950, Rota 96951, Tinian 96952 ; les Northern Islands
rangées sous 96950, rattachement non vérifié dans un texte), Micronésie (un code par État), Îles Marshall (Kwajalein
96970, reste 96960). Code unique : Palaos 96940, Samoa américaines 96799, Niue 9974, Nauru NRU68, Pitcairn PCRN 1ZZ,
Norfolk 2899, Heard 7151. La ligne unique du fichier GeoNames de Samoa porte le code des Samoa AMÉRICAINES : écartée.
Ailleurs, étiquette de région (la Papouasie-Nouvelle-Guinée a des codes postaux, absents de GeoNames).

**Heard-et-MacDonald et îles mineures éloignées** : territoires inhabités ou fermés au public (permis de la division
antarctique australienne ; Midway fermé, Wake sur permis). Heard n'a aucun lieu habité : seules les deux îles
(GeoNames 1547315 et 1547301) sont reprises. Recherchables ; chaque lieu y étant isolé, aucun trajet n'est proposé.

**Frontière** : une seule dans tout le lot, Papouasie-Nouvelle-Guinée ↔ Indonésie à Wutung–Skouw (route
Vanimo–Jayapura) ; en Nouvelle-Guinée, la clé de masse `newGuinea` est commune aux deux pays.

**Îles** : chaque pays a ses règles (voir "Ferries") ; aucun lieu d'Océanie n'est rattaché à la masse continentale
eurasiatique.

**Péages : aucun modélisé.** Aucun barème officiel au kilomètre : Sydney (Westlink M7 et WestConnex, publiés par
entrée/sortie avec plafond), Melbourne (CityLink, EastLink par zones, West Gate Tunnel), Brisbane (Gateway, Logan,
Clem7…) et Nouvelle-Zélande (Northern Gateway, Tauranga Eastern Link, Takitimu Drive) sont des forfaits par tronçon
ou par passage.

**Monnaies : sept nouvelles** — NZD (NZ$), PGK (K), SBD (SI$), VUV (VT, sans subdivision), FJD (FJ$), WST (WS$), TOP
(T$) ; dollar australien à Tuvalu, Kiribati, Nauru, Norfolk et Heard ; dollar américain en Micronésie, aux Palaos,
aux Marshall et dans les territoires américains ; dollar néo-zélandais à Niue, Tokelau, Pitcairn et aux Îles Cook (où
le dollar des îles Cook, sans code ISO, circule à parité). Budgets : gamme euro au taux InforEuro de septembre 2026 ;
seuls prix moyens officiels trouvés : Victoria (A$213,6 à Melbourne, juillet 2025, Visit Victoria) dans "moyen" et
Guam (205,93 US$ en 2025, Guam Visitors Bureau) au-dessus.

**Hébergement** : pas d'offre Booking.com à Tuvalu, Tokelau, Pitcairn ni dans les territoires fermés ; offre très
réduite en Micronésie, aux Samoa américaines, à Niue, aux Marshall et à Nauru (visa difficile). Tokelau n'a ni route
ni véhicule ; Pitcairn une seule route, sur licence de visiteur.

**Zones à tension** (5 règles) : Papouasie-Nouvelle-Guinée seulement — province d'Enga en rouge ; Hautes-Terres,
Sepik, bande frontalière avec l'Indonésie et abords de Madang, Lae, Rabaul et Alotau en orange. Australie,
Nouvelle-Zélande, Fidji, Samoa, Tonga, Salomon, Vanuatu, Cook et Palaos : aucune zone rouge ou orange. Pas de fiche
France Diplomatie pour Tuvalu, Kiribati, Nauru, Marshall, Micronésie, Niue, Tokelau et les territoires américains,
australiens et britannique.

### Amériques : cinquante pays et territoires (septembre 2026)

États-Unis, Canada, Mexique, Groenland, Bermudes, Guatemala, Belize, Salvador, Honduras, Nicaragua, Costa Rica, Panama,
Cuba, Jamaïque, Haïti, République dominicaine, Bahamas, Saint-Kitts-et-Nevis, Antigua-et-Barbuda, Dominique,
Sainte-Lucie, Saint-Vincent-et-les-Grenadines, Barbade, Grenade, Trinité-et-Tobago, Porto Rico, îles Vierges
américaines et britanniques, Turques-et-Caïques, Caïmans, Anguilla, Montserrat, Aruba, Curaçao, Sint Maarten,
Pays-Bas caribéens, Colombie, Venezuela, Guyana, Suriname, Équateur, Pérou, Bolivie, Brésil, Paraguay, Uruguay,
Argentine, Chili, Malouines, Géorgie du Sud-et-les îles Sandwich du Sud — **763 003 lieux**
(`scripts/build-ameriques-communes.js`) : Mexique 256 393, États-Unis 162 937, Brésil 66 533, Pérou 46 394, Colombie
33 884, Bolivie 25 597, Venezuela 23 225, Canada 19 687… ; **~80 000 alias** (`scripts/build-ameriques-aliases.js`). Le
site compte désormais **~4,8 millions de lieux** (bundle communes 227 Mo bruts ; index de recherche 16,4 millions
d'entrées à l'époque, 17,65 millions aujourd'hui ; serveur ~2,4 Go, tirages prêts en ~14 s en local).

**Codes postaux** (règle des 90 %) : États-Unis 96,6 %, Mexique 97,5 %, Bermudes, Costa Rica, Panama, Haïti, Porto Rico,
îles Vierges américaines, Équateur, Pérou et Uruguay ont leurs codes ; code unique pour Turques-et-Caïques (TKCA 1ZZ),
Anguilla (AI-2640), Malouines (FIQQ 1ZZ), Géorgie du Sud (SIQQ 1ZZ) ; étiquette de région ailleurs (Canada 44 % — le
fichier GeoNames ne donne que les trois premiers caractères —, Brésil 69 %, Colombie 70 %…). **Équateur** : sans point
postal à moins de 15 km, le lieu prend le point le plus proche de son canton (codes de division identiques, vérifiés) —
plusieurs points des Galápagos sont mal placés, et 34 des 51 lieux de l'archipel, dont le chef-lieu, étaient écartés.

**Frontières** (routes) : Canada–États-Unis, États-Unis–Mexique, Mexique–Guatemala et Belize, toute l'Amérique centrale
jusqu'au Panama, Haïti–République dominicaine, Sint Maarten–Saint-Martin, Colombie–Venezuela, –Équateur, –Brésil
(Leticia–Tabatinga, enclave), Venezuela–Brésil, Guyana–Brésil, Brésil–Guyane française (pont de l'Oyapock), Équateur–Pérou,
Pérou–Brésil, –Bolivie, –Chili, Bolivie–Brésil, –Paraguay, –Argentine, –Chili, Brésil–Paraguay, –Argentine, –Uruguay,
Argentine–Uruguay, –Paraguay, –Chili. **Sans route** : Panama–Colombie (Darién), Venezuela–Guyana, Colombie–Pérou,
Canada–Groenland ; bacs seulement : Guyana–Suriname, Suriname–Guyane française (voir "Ferries").

**Péages : aucun modélisé.** Barèmes officiels au kilomètre seulement sur quelques axes isolés — 407 ETR (Ontario, selon
zone et heure), Costanera Norte (Santiago), Pennsylvania Turnpike, Via Dutra en flux libre — sans tarif national ;
ailleurs, forfaits par barrière (CAPUFE au Mexique, Colombie, Pérou, Brésil, Argentine…).

**Monnaies : 32 nouvelles** (CAD, MXN, BMD, GTQ, BZD, HNL, NIO, CRC, PAB, CUP, JMD, HTG, DOP, BSD, XCD, BBD, TTD, KYD, AWG, XCG,
COP, VES, GYD, SRD, PEN, BOB, BRL, PYG, UYU, ARS, CLP, FKP), avec leur signe usuel ; le córdoba s'affiche « C$ (NIO) » pour
ne pas le confondre avec le dollar canadien ; florin caribéen XCG (Curaçao, Sint Maarten, depuis 2025). Dollar
américain au Salvador, en Équateur, aux Pays-Bas caribéens, à Porto Rico, aux îles Vierges et aux Turques-et-Caïques.
**Taux** : InforEuro de septembre 2026, sauf **Cuba** (taux flottant de la Banque centrale, 764 CUP/€ — InforEuro retient
24 CUP/USD, ~27 fois sous le taux de guichet) et **Venezuela** (Banque centrale, 977,68 Bs/€, InforEuro en retard). Seul prix
moyen officiel d'hébergement trouvé : Chili, 76 104 CLP par chambre occupée (juin 2026, INE), dans "economique".

**Hébergement et circulation** : Booking.com absent de Cuba, Airbnb très restreint ; paiements difficiles au Venezuela ;
aucun hébergement à terre en Géorgie du Sud ; pas de location de voiture aux Galápagos ; visiteurs limités aux
mini-voitures et scooters aux Bermudes.

**Zones à tension** (65 règles) : Haïti rouge en entier ; Venezuela orange en entier avec frontières et arc minier en
rouge ; Cuba orange en entier (crise énergétique) ; Mexique (Tamaulipas, Guerrero, Colima, sud du Michoacán, Tijuana,
Culiacán… en rouge ; bande frontalière, Basse-Californie, Chihuahua, Sinaloa… en orange) ; Colombie (frontières, Arauca,
Catatumbo, Chocó, Cauca, Nariño, Putumayo en rouge) ; Honduras orange sauf îles de la Baie, Valle et Copán ; Équateur,
Pérou (VRAEM), Brésil (frontière vénézuélienne rouge, bandes frontalières orange), Bolivie, Paraguay, Panama (Darién),
Nicaragua (Bluefields), Jamaïque (Spanish Town), Trinité-et-Tobago. États-Unis, Canada, Argentine, Chili, Uruguay et la
plupart des Petites Antilles : aucune zone rouge ou orange.

### Antarctique, île Bouvet et toutes les TAAF (septembre 2026)

Ajoutés « quand même », à la demande de l'utilisateur, alors qu'aucun n'a d'habitant permanent ni de route : **recherchables,
sans trajet possible** (`ISLAND_ONLY_COUNTRIES` : chaque lieu est une masse terrestre à lui seul, un départ y aboutit à
« itinéraire impossible »). Script : `scripts/build-antarctique-communes.js`. Aucun fichier postal GeoNames pour AQ, BV et TF :
le champ `cp` porte une étiquette (`TF-0x` = division GeoNames, `AQ`, `BV`), jamais un code postal.

**Antarctique (AQ)** — **88 lieux, 784 alias**. GeoNames n'y range presque rien en classe P : les bases sont des stations
scientifiques (STNB) ou, dans ses entrées récentes, des PPL/PPLL. Sont repris toutes les PPL/PPLL (dont Villa Las Estrellas,
seul village où vivent des familles) et toutes les STNB, sauf celles que GeoNames marque historiques (« (historical) »,
suffixes « /USA/ », « /Brit./ », « /SSSR/ »). Écartés : Port-Martin (PPLQ, base détruite en 1952), un refuge détruit (PPLW),
les stations météo automatiques (STNM), sauf Jubany (base Carlini, seule entrée de cette base habitée). **Doublons** : une
même base apparaît souvent deux ou trois fois ; deux entrées sont fusionnées si elles sont à moins de 3 km ET partagent un
mot du nom, ou à moins de 100 m (Faraday = Vernadsky). La distance seule ne suffit pas : Progress, Zhongshan, Bharati et
Law-Racoviță sont quatre bases distinctes à moins de 3 km l'une de l'autre. 26 fusions ; les noms des entrées fusionnées
deviennent des alias. **Limite** : GeoNames ne signale pas toutes les bases fermées ou saisonnières (Byrd, Svea, Wasa…), reprises
telles quelles, avec la population GeoNames (effectif d'hivernage ou d'été, selon l'entrée). **Monnaie** : aucune (traité sur
l'Antarctique, aucune souveraineté reconnue) — EUR, monnaie de référence de l'application, sans effet puisqu'aucun budget n'y est
calculé.

**Île Bouvet (BV)** — inhabitée, aucune entrée de classe P : seule l'île elle-même (Bouvetøya), 40 alias. Réserve naturelle
norvégienne, débarquement sur autorisation. Monnaie : NOK, déjà présente.

**Terres australes et antarctiques françaises (TF)** — le code TF couvrait jusqu'ici les seules îles Glorieuses et Juan de Nova ;
il couvre désormais tout le territoire, **10 lieux, 192 alias** : les îles Éparses Europa, Bassas da India et Tromelin (les îles
elles-mêmes, population 0 — postes militaires ou météo, aucun habitant permanent ; Tromelin, rangée « 00 » par GeoNames, est
rattachée aux îles Éparses par sa division de second niveau), et une base par district : **Port-aux-Français** (Kerguelen),
**Alfred Faure** (Crozet), **Martin-de-Viviès** (Saint-Paul-et-Amsterdam) et **Dumont d'Urville** (Terre-Adélie, sans division
dans GeoNames, rattachée par sa longitude). Les noms des archipels, des îles et des districts sont des alias de leur base : taper
« Kerguelen », « Crozet », « Amsterdam » ou « Terre Adélie » la trouve. Saint-Paul (inhabitée, sans base) n'a pas d'entrée propre.
Tromelin est revendiquée par Maurice, les Glorieuses, Juan de Nova, Europa et Bassas da India par Madagascar : reprises sous TF,
comme GeoNames. Le script des îles Glorieuses et Juan de Nova (`build-sainte-helene-eparses-communes.js`) ne produit plus que
Sainte-Hélène.

**Langues** : aucune à ajouter. L'Antarctique n'a aucune langue officielle ; le français (TAAF) et le norvégien (Bouvet) sont
déjà gérés, et aucune langue régionale n'y a de statut. **Zones à tension** : aucune fiche France Diplomatie. **Ferries** : aucun
(voir la section Ferries).

## Zones à tension et frontières (septembre 2026)

**Changement de règle, à la demande de l'utilisateur : les règles politiques ne ferment plus aucune
frontière.** Jusqu'ici, une frontière n'était franchie par un trajet que si elle était documentée comme
ouverte ET hors des zones formellement déconseillées par France Diplomatie. Désormais :

- **Frontières** (`ADJACENT_PAIRS`, lib/trip-engine.js) : une paire est ouverte dès qu'une ROUTE franchit
  physiquement la frontière. Les fermetures décidées par un État (Finlande-Russie, Maroc-Algérie,
  Rwanda-Burundi, Azerbaïdjan à l'entrée, Ouganda-RDC pour Ebola…), les avis de sécurité et les frontières
  dont l'ouverture n'était « pas établie » faute de source récente ne ferment plus rien. Restent fermées les
  seules frontières sans route : RD Congo-Congo (fleuve Congo), RD Congo-Centrafrique (Oubangui),
  Tanzanie-RD Congo (lac Tanganyika), Nigeria-Tchad (lac Tchad). L'isolement de l'enclave de Cabinda, qui ne
  venait que des exclusions, est supprimé. Les sections par pays ci-dessus qui décrivent des frontières
  « non retenues » gardent leurs constats (état réel des postes, sources), mais ces frontières sont
  aujourd'hui ouvertes dans le modèle.
- **Zones à tension** (`TENSION_ZONES`, public/js/trip-data.js, construit par
  `scripts/build-tension-zones.js` depuis `scripts/tension-zones/*.js`) : **359 règles pour 94 pays**,
  relevées sur les fiches « Sécurité » de France Diplomatie, consultées jusqu'au 15 septembre 2026 — chaque règle porte
  sa propre date (195 sur 359 au 15 septembre, les autres de mars à juillet 2026), qui n'a pas le même sens partout :
  date de mise à jour de la fiche pour `asie-centre-sud`, `mena`, `oceanie`, `ouest` et `sud`, « dernière
  actualisation » de la rubrique Zones de vigilance pour `ameriques`, `centre` et `europe`, non précisé pour
  `asie-est`, `asie-sud-est` et `golfe` ; ces dates ne se comparent donc pas d'un pays à l'autre — zones
  **rouges** (« formellement déconseillé ») et **orange** (« déconseillé sauf raison impérative »), le jaune
  étant ignoré. Découpage au plus juste : pays entier quand il est tout rouge (Russie, Ukraine,
  Biélorussie, Syrie, Soudan, Mali, Niger, Burkina Faso), sinon régions administratives, codes ISO de
  gouvernorat, bandes frontalières (`borderKm` : lieux à moins de N km d'un lieu du pays voisin) ou
  cercles autour de villes et de parcs. Chaque règle porte sa source et sa date.
- **Filtre** : « Exclure les zones déconseillées », **coché par défaut**. Il écarte des tirages tout lieu
  rouge ou orange ; décoché, ces lieux peuvent être tirés. Un départ situé dans une telle zone reste
  possible : les étapes sont alors cherchées hors zone, plus loin si nécessaire. Si seul le filtre rend le
  tirage impossible, un message dédié le dit (`tensionBlocked`).
- **Avertissement** : toute étape en zone rouge ou orange, et le point de départ lui-même, affichent un
  bandeau « Sécurité » coloré, traduit dans les 161 langues, avec un lien vers la fiche officielle.

**Approximations assumées, et écrites dans chaque règle** (champ `label`) : les fiches ne donnent presque
jamais la largeur des bandes frontalières, estimée sur les cartes ; les limites tracées « entre deux villes »
ou par district sont rendues par des régions entières ou des cercles ; `borderKm` mesure la distance au
lieu voisin le plus proche, pas à la ligne de frontière, ce qui la rend imprécise dans les déserts
(Algérie-Mali et Algérie-Niger ne sont pas couvertes faute de lieux proches) ; les camps palestiniens au
Liban et les zones maritimes (piraterie) ne correspondent à aucun lieu. Deux codes postaux faux repérés en
chemin (Antalya classée sous Gaziantep, Yeghvard sous le Syunik) sont neutralisés par une exception.
Pas de fiche France Diplomatie : France, La Réunion, Mayotte, Liechtenstein, Vatican, dépendances de la
Couronne, Gibraltar, Féroé, Åland, Svalbard et Jan Mayen, Sainte-Hélène, îles Éparses.
**À relancer** à chaque mise à jour des fiches : éditer `scripts/tension-zones/*.js`, puis
`node scripts/build-tension-zones.js` (qui vérifie chaque région et chaque préfixe) et redémarrer le serveur.

## Langues

Interface traduite en français, anglais, espagnol, portugais, néerlandais, allemand, luxembourgeois,
italien, romanche, bas-allemand, sorabe, frison du Nord, sarde, frioulan, ladin, maltais, monégasque,
jèrriais, guernésiais, kachoube, rusyn/lemko et istro-roumain (`public/js/i18n.js` — dictionnaire à
plat par langue + petit moteur `t(clé, variables)`/`tl(clé)` pour les listes) — auxquelles se sont
ajoutées, au fil des passages suivants, le catalan/le basque/le galicien/l'occitan/le breton/le
corse/le mirandais (rattrapage régional France/Espagne/Portugal/Andorre), l'irlandais/le mannois/le
gallois/le gaélique écossais/le cornique/le scots (Royaume-Uni, Irlande, île de Man), puis huit
langues nationales de pays déjà couverts par ailleurs — tchèque, polonais, slovaque, hongrois,
slovène, croate, bosniaque et serbe — dans un rattrapage détaillé plus bas, et enfin le danois, le
norvégien, le suédois et le finnois, arrivés respectivement avec le Danemark, la Norvège, la Suède et
la Finlande (voir "Pays couverts" et plus bas, série des pays nordiques), et enfin le monténégrin et
l'albanais, arrivés avec le Monténégro et l'Albanie — le kosovar n'existe pas en tant que langue
distincte, le Kosovo héritant automatiquement de l'albanais (langue nationale des deux pays) et du
serbe (déjà couvert), voir plus bas. Le
luxembourgeois est arrivé avec le Luxembourg (voir "Pays couverts") : c'est sa 3ᵉ langue officielle,
aux côtés du français et de l'allemand déjà couverts. L'italien et le romanche sont arrivés avec la
Suisse, ses 3ᵉ et 4ᵉ langues officielles (français et allemand déjà couverts) — le romanche
(~40 000 locuteurs, Grisons) est traduit en rumantsch grischun (forme écrite standardisée).

**Sélecteur de langue** : le bouton n'affiche plus un code à deux lettres (« FR », « MK »...) mais
un drapeau — essayé d'abord en émoji Unicode, abandonné (aucune police d'émoji couleur fiable sur
toutes les plateformes, Windows en particulier affiche souvent les deux lettres du code régional au
lieu du drapeau fusionné) au profit de vraies images SVG hébergées localement
(`public/img/flags/XX.svg`, une seule fois chacune même si plusieurs langues la réutilisent —
55 fichiers au total pour 69 langues, plusieurs langues partageant le même fichier). Association LANGUE -> code de fichier dans `LANG_FLAGS`
(`public/js/i18n.js`). Priorité à un vrai drapeau RÉGIONAL reconnaissable quand le jeu d'icônes
utilisé ([circle-flags](https://github.com/HatScripts/circle-flags)) en propose un dédié à l'aire
linguistique exacte (demande explicite de l'utilisateur, "pour faciliter la lecture") — treize
langues concernées : Écosse (gaélique écossais/scots), pays de Galles (gallois), Catalogne
(catalan — la Senyera, bien plus reconnaissable comme « drapeau catalan » que celui de l'Andorre
retenu avant cette demande), Pays basque/Ikurriña (basque), Galice (galicien), Bretagne/Gwenn ha Du
(breton), Corse/tête de Maure (corse), Occitanie/croix occitane (occitan), Sardaigne/quatre Maures
(sarde), Frioul-Vénétie julienne (frioulan), Trentin-Haut-Adige (ladin, la région des Dolomites),
Grisons (romanche — le seul canton suisse à avoir un drapeau propre dans circle-flags, plus juste
que le drapeau suisse générique pour une langue qui n'y est même pas majoritaire). Pour toutes les
AUTRES langues régionales, aucun drapeau dédié n'existe dans ce jeu d'icônes (aucune illustration
pour le bas-allemand, le sorabe, le frison du Nord, le kachoube, le rusyn, le mirandais, le
cornique...) : chacune retombe alors sur le drapeau national le plus directement associé à son aire
linguistique, au prix d'un même drapeau parfois partagé par plusieurs langues d'un même pays (les
trois langues régionales allemandes nds/hsb/frr affichent toutes le drapeau allemand, par exemple)
— un vrai drapeau distinct par langue impliquerait de commander des illustrations infra-nationales
sur mesure, hors du périmètre de ce passage.

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
ladin n'est pas possible (comme alors pour la France, qui n'avait aucun alias — depuis : `aliases-fr.txt`
existe, voir "Noms alternatifs dans toutes les langues, pour tous les pays").

L'Autriche, elle, n'a apporté aucune nouvelle langue : ses 6 langues minoritaires reconnues
(Volksgruppengesetz — croate du Burgenland, tchèque, hongrois, romani, slovaque, slovène) sont
toutes déjà des langues nationales d'un pays voisin non encore couvert (croate, tchèque, hongrois,
slovaque, slovène), sauf le romani qui n'a pas de forme écrite standard unique — exactement les deux
mêmes motifs d'exclusion déjà appliqués aux 9 langues minoritaires italiennes ci-dessus. L'allemand,
déjà couvert (voir le Luxembourg et l'Allemagne plus haut), reste sa seule langue officielle.

Saint-Marin et le Liechtenstein n'apportent, eux non plus, aucune nouvelle langue : ni l'un ni
l'autre n'a de langue régionale ou minoritaire reconnue officiellement (le dialecte romagnol parlé
informellement à Saint-Marin, ou l'alémanique parlé au Liechtenstein, n'ont ni statut officiel ni
forme écrite standardisée distincte — même situation que l'allemand autrichien, jamais traité comme
une langue à part). L'italien (déjà couvert) et l'allemand (déjà couvert) restent leurs seules
langues officielles respectives.

Malte apporte le maltais (malti, code ISO 639-1 `mt`) : seule langue officielle sémitique du site
(les 18 autres sont toutes romanes ou germaniques), co-officielle avec l'anglais (déjà couvert).
Bien dotée en ressources numériques — niveau de confiance comparable au reste des langues déjà
couvertes, pas de réserve particulière à signaler.

Monaco, Guernesey et Jersey apportent chacun une langue bien plus délicate à traiter : le monégasque
(munegascu, un dialecte ligure intémélien SANS code ISO 639-3 propre — utilisé ici sous le code de
repli `lij`, celui du ligure) pour Monaco ; le jèrriais et le guernésiais (deux variétés du normand,
codées `nrf-je`/`nrf-gg` — GeoNames et l'ISO 639-3 ne leur attribuent qu'un seul code commun, `nrf`,
la RA ISO les ayant fusionnées faute de les distinguer assez ; le sous-tag régional IETF, celui-là
même utilisé par Wikipédia pour ce même besoin, permet de les garder séparées ici) pour
Guernesey/Jersey respectivement. Les trois sont réellement parlées, institutionnellement reconnues
(Monaco : Comité national des traditions monégasques, orthographe codifiée depuis 1976 ; Jersey :
Office du Jèrriais, panneaux routiers bilingues ; Guernesey : Guernsey Language Commission) et
dotées d'un dictionnaire/d'une grammaire — donc incluses, contrairement au romanche/romagnol de
Saint-Marin ou à l'alémanique du Liechtenstein, qui n'ont ni statut officiel ni forme écrite
standardisée. Mais AUCUNE des trois n'a d'édition Wikipédia dédiée ni de corpus numérique
significatif (quelques centaines à quelques milliers de locuteurs, transmission essentiellement
orale) : le niveau de confiance de ces trois blocs de traduction est nettement plus faible que pour
toutes les autres langues du site, y compris le sorabe/frison du Nord/ladin déjà signalés
ci-dessus — approximées à partir du français (jèrriais/guernésiais) ou de l'italien (monégasque)
avec les dérivations phonétiques les plus documentées de chaque langue plutôt qu'un vocabulaire
vérifié mot à mot. Choix assumé avec l'utilisateur avant de les ajouter quand même plutôt que de les
omettre (voir le commentaire au-dessus des blocs `lij`/`nrf-je`/`nrf-gg` dans `public/js/i18n.js`) —
une relecture par un locuteur natif reste largement recommandée avant de considérer ces trois blocs
comme définitifs.

La République tchèque n'apporte, elle, aucune nouvelle langue — exactement comme l'Autriche
ci-dessus, et pour les mêmes deux motifs d'exclusion. Elle a ratifié la Charte européenne des
langues régionales ou minoritaires pour cinq langues : l'allemand (déjà couvert, voir le Luxembourg/
la Suisse/l'Allemagne/l'Autriche plus haut), le polonais (dialecte de Cieszyn/Zaolzie, région
frontalière polonaise — déjà langue nationale d'un pays voisin non encore couvert, comme le tchèque
l'était pour l'Autriche ci-dessus), le slovaque (même motif — langue nationale de la Slovaquie, non
encore couverte), le croate morave (jihomoravští Chorvati, quelques centaines de locuteurs dans deux
villages de Moravie du Sud, descendants de réfugiés du XVIe siècle — classé comme une variété du
croate, donc soumis au même motif que le polonais/slovaque : déjà langue nationale d'un pays voisin
non couvert, même s'il s'agit ici d'une communauté implantée depuis des siècles plutôt que du
standard national lui-même — traitement cohérent avec le croate du Burgenland autrichien ci-dessus,
qui n'a pas non plus été distingué du croate standard pour cette même raison) et le romani (comme
pour l'Autriche/l'Italie, aucune forme écrite standard unique). Aucune de ces cinq ne rejoint donc
l'interface pour l'instant — chacune pourrait, en théorie, redevenir éligible le jour où son pays
d'origine (Pologne, Slovaquie, Croatie) serait lui-même ajouté. Le polonais est d'ailleurs devenu
langue officielle de l'interface entre-temps (voir juste en dessous) — mais comme langue NATIONALE
de la Pologne elle-même, pas au titre de la minorité polonaise tchèque, qui reste hors périmètre
pour les mêmes raisons que les quatre autres.

La Pologne, elle, apporte DEUX nouvelles langues régionales — un cas contraire à celui de
l'Autriche/la République tchèque ci-dessus. Sur les cinq langues protégées par la loi polonaise de
2005 sur les minorités nationales et ethniques et la langue régionale, deux sont retenues : le
kachoube (kaszëbsczi jãzëk, code ISO 639-2/3 `csb`) — seule langue à statut RÉGIONAL en Pologne
(distinct des langues minoritaires, depuis 2005), ~87 600 locuteurs recensés (2021), Poméranie,
dotée d'une édition Wikipédia (csb.wikipedia.org) ; et le lemko (nom utilisé en Pologne pour une
variété du rusyn, code ISO 639-3 `rue`) — minorité ETHNIQUE reconnue distincte de la minorité
ukrainienne par cette même loi de 2005 (contrairement au croate morave tchèque ci-dessus, resté
classé comme une simple variété du croate), quelques milliers de locuteurs dans le sud-est du pays,
descendants des populations déplacées par l'Opération Vistule (1947) — écrit en alphabet cyrillique,
avec des lettres historiques ("ы"/"ъ") abandonnées par l'ukrainien moderne mais conservées par la
norme lemko de Pologne (voir `aliases-pl.txt`). Niveau de confiance comparable au sorabe/frison du
Nord ci-dessus pour les deux : des langues réellement officielles et documentées, mais nettement
moins consultables que les grandes langues déjà couvertes — le rusyn/lemko, en plus, en alphabet
cyrillique approximé à partir de l'ukrainien plutôt que d'une langue que je maîtrise directement,
une réserve supplémentaire par rapport au kachoube (alphabet latin, dérivé du polonais). Une
relecture par un locuteur natif reste recommandée pour ces deux blocs. Les trois autres langues
protégées restent hors périmètre : l'allemand (déjà couvert), le biélorusse/lituanien/russe/
ukrainien/slovaque/arménien (déjà langues nationales de pays voisins non encore couverts — même
motif que pour l'Autriche/la République tchèque) et le rom (aucune forme écrite standard unique,
même motif que partout ailleurs) ; le yiddish, lui aussi protégé par la loi, reste hors périmètre
pour la même raison que le rom/l'arménien (langue diasporique sans ancrage territorial polonais
propre, quasiment éteinte dans le pays aujourd'hui). Cas à part, volontairement écarté : le silésien
(śląski, ~460 000 locuteurs recensés — bien plus que le kachoube), dont la reconnaissance comme
deuxième langue régionale du pays a été votée par le Sejm et le Sénat début janvier 2026 puis
VETÉE par le président Karol Nawrocki le 13 février 2026 (second veto après celui du président Duda
en 2024) : à ce jour (voir la date de ce commit), il n'a donc PAS de statut de langue régionale ou
minoritaire officiel — non retenu, cohérent avec la politique du projet de ne couvrir que les
langues effectivement reconnues, jamais un statut en cours de débat politique. Le karaïm, enfin,
protégé lui aussi par la loi de 2005, est écarté pour une raison différente : il ne reste plus
qu'UNE seule locutrice native en Pologne (les autres communautés vivant en Lituanie/Crimée) —
une langue déjà pratiquement éteinte sur le territoire polonais, un cas encore plus extrême que
le romanche/le sorabe déjà signalés comme peu dotés en ressources.

La Slovaquie, comme l'Autriche et la République tchèque avant elle, n'apporte aucune nouvelle
langue — mais avec une nuance intéressante. La loi slovaque n°184/1999 sur l'usage des langues
minoritaires en reconnaît neuf : le bulgare, le tchèque, le croate, le polonais, le hongrois,
l'allemand, le rom et l'ukrainien sont tous écartés pour les motifs déjà établis (tchèque/polonais/
allemand déjà couverts ; bulgare/croate/hongrois/ukrainien déjà langues nationales de pays voisins
non encore couverts ; rom sans forme écrite standard unique). La neuvième, le ruthène (rusyn), n'a,
elle, PAS besoin d'être ajoutée : c'est très exactement la même langue que le lemko déjà couvert
avec la Pologne (code ISO 639-3 `rue` commun aux deux noms), et sa communauté slovaque — surtout
dans la région de Prešov, où existe d'ailleurs la norme littéraire codifiée la plus reconnue du
rusyn (1995) — profite donc automatiquement de la traduction déjà en place, sans aucune modification
de code nécessaire. Les 18 alias `rue` réels que la Slovaquie apporte à `aliases-sk.txt` (contre 16
pour la Pologne) en sont la meilleure preuve concrète.

La Hongrie, comme l'Autriche/la République tchèque/la Slovaquie avant elle, n'apporte elle non plus
aucune nouvelle langue. La loi hongroise de 2011 sur les droits des nationalités en reconnaît treize :
l'allemand/le polonais/le slovaque sont déjà couverts ; le bulgare/le grec/le croate/l'arménien/le
roumain/le serbe/le slovène/l'ukrainien sont déjà langues nationales de pays voisins non encore
couverts (même motif qu'ailleurs — le hongrois lui-même, exclu pour cette raison au tour de la
Slovaquie ci-dessus, est bien sûr devenu sans objet : il rejoint l'interface comme langue nationale
de la Hongrie, exactement comme le polonais l'avait fait pour la minorité polonaise de République
tchèque) ; le rom (romani ET beás) est écarté sans forme écrite standard unique pour le romani, et
pour une raison différente pour le beás (langue des Roms Boyash de Hongrie) — ce n'est en réalité
PAS une variété du romani du tout, mais un dialecte archaïque du ROUMAIN (aucun code ISO 639-3
propre, seul un Glottocode existe), donc soumis au même motif que le roumain lui-même : déjà langue
nationale d'un pays voisin non couvert, malgré des siècles d'isolement dialectal — le même
raisonnement déjà appliqué au croate morave de République tchèque et au polonais de Cieszyn en
Pologne. Le ruthène (rusyn), enfin, n'a une fois de plus pas besoin d'ajout : même langue que le
lemko polonais et le rusyn slovaque déjà couverts (code `rue` commun), la petite communauté hongroise
en profitant automatiquement sans le moindre changement de code.

La Slovénie, elle, est le cas le plus simple de tous : ses DEUX SEULES langues minoritaires reconnues
par la loi (statut constitutionnel spécial pour les communautés autochtones, article 64 de la
Constitution slovène) sont l'italien, bien établi le long de la côte istrienne (Koper/Izola/Piran/
Ankaran — d'où les 289 alias `it` de `aliases-si.txt`, la majorité écrasante), et le hongrois, dans
la région du Prekmurje (Lendava/Murska Sobota) — les deux déjà des langues nationales pleinement
couvertes par l'application, donc aucune traduction supplémentaire à écrire. Le slovène de Prekmurje
(prekmurščina), parfois cité comme variété distincte, n'a lui PAS de statut légal propre : simple
registre du patrimoine culturel immatériel slovène, sans reconnaissance ni comme langue régionale
ni comme langue minoritaire au sens de la Charte européenne des langues régionales ou minoritaires —
même motif d'exclusion que le silésien en Pologne (statut culturel/dialectal reconnu, mais pas de
statut légal de langue).

La Croatie, elle, apporte UNE nouvelle langue d'interface — l'istro-roumain (voir plus loin) — mais
ferme surtout une longue série de callbacks laissés en suspens par les tours précédents. La Charte
européenne des langues régionales ou minoritaires s'applique en Croatie à sept langues en Partie III
(protection pleine) : le serbe, l'italien, le hongrois, le tchèque, le slovaque, le ruthène (rusyn) et
l'ukrainien. Italien/hongrois/tchèque/slovaque/ruthène sont déjà couverts (le ruthène profitant une
fois de plus automatiquement de la Pologne/la Slovaquie/la Hongrie, sans changement de code) ; le
serbe et l'ukrainien sont écartés pour le motif habituel — déjà langues nationales de pays voisins non
couverts (Serbie, Ukraine), malgré le poids réel de la minorité serbe en Croatie (environ 4% de la
population, la plus importante minorité nationale du pays). C'est là que se referment les callbacks :
le croate du Burgenland autrichien (voir plus haut, "L'Autriche"), le croate morave tchèque (voir plus
haut, "République tchèque"), et les communautés croates de Slovaquie/Hongrie mentionnées en passant
dans leurs tours respectifs, étaient TOUS exclus pour la même raison — "déjà langue nationale d'un
pays voisin non encore couvert" — devenue sans objet main­tenant que la Croatie rejoint l'application :
le croate lui-même est désormais la langue nationale d'un pays couvert, exactement le même
raisonnement de bouclage déjà vu pour le polonais (minorité polonaise de République tchèque) et le
hongrois (minorité hongroise de Slovaquie). Aucun changement de code n'est nécessaire pour ces
communautés croates hors de Croatie : le croate profite automatiquement d'être devenu une langue
nationale pleinement traduite.

Reste l'istro-roumain (vlaški/žejanski, ISO 639-3 `ruo`) : une langue romane à part, PAS une simple
variété du roumain standard (contrairement au beás hongrois, dialecte archaïque du roumain écarté au
tour de la Hongrie) — séparée du tronc commun il y a environ un millénaire, parlée aujourd'hui par
moins de cent locuteurs natifs dans six villages de l'intérieur de l'Istrie (Žejane, Šušnjevica,
Nova Vas, Jesenovik, Kostrčani, Brdo). Reconnaissance officielle réelle mais partielle : inscrite au
patrimoine culturel immatériel protégé de Croatie depuis 2007, et couverte par la Charte européenne
des langues régionales ou minoritaires en Partie II (protection allégée, simples principes généraux)
depuis 2010 — mais les Istro-Roumains ne sont PAS reconnus comme minorité nationale à part entière.
Un niveau de confiance plus bas que toute autre langue déjà ajoutée, y compris le monégasque/
jèrriais/guernésiais (qui, eux, n'ont simplement aucune langue proche à grande échelle sur laquelle
s'appuyer ; l'istro-roumain, lui, a le roumain standard comme parent vivant le plus proche, mais
aucune ressource lexicale dédiée moderne, aucune édition Wikipédia, deux variétés orthographiées
différemment selon les sources). Question posée explicitement à l'utilisateur (voir historique des
commits) : ajouter quand même, avec une confiance plus faible documentée dans le code
(`public/js/i18n.js`, commentaire au-dessus du bloc `ruo`), ou s'en tenir aux langues mieux établies.
Réponse : ajouter quand même — même choix que pour Monaco/Jersey/Guernesey.

La Bosnie-Herzégovine, elle, n'apporte AUCUNE nouvelle langue — mais pour une raison différente de
tous les pays précédents, propre à ce pays. Elle a trois langues officielles constitutionnelles à
l'échelle du pays (bosnien, croate, serbe — les langues des trois peuples constitutifs), aucune
minoritaire ou régionale au sens habituel : exactement le même traitement que pour chaque pays
depuis la République tchèque (jamais la langue nationale elle-même du pays ajouté, quel que soit son
nombre — un seul comme le tchèque/le polonais/le slovaque/le hongrois/le slovène/le croate, ou trois
comme ici) reste hors périmètre de ce sélecteur, qui ne couvre que des langues RÉGIONALES ou
minoritaires. Traitement volontairement symétrique entre les trois — aucune des trois n'est ajoutée,
aucune des trois n'est favorisée. La Charte européenne des langues régionales ou minoritaires
s'applique en Bosnie-Herzégovine (depuis 2011) à quinze langues : l'allemand, l'italien et le ruthène
(rusyn) sont déjà couverts et en profitent automatiquement, sans changement de code (même mécanisme
que pour la Croatie) ; l'albanais, le tchèque, le hongrois, le polonais, le roumain, le slovaque, le
slovène, le turc et l'ukrainien sont écartés pour le motif habituel — langues nationales d'Etats
souverains, qu'ils soient déjà couverts comme pays (République tchèque, Pologne, Slovaquie, Slovénie)
ou non (Albanie, Roumanie, Turquie, Ukraine) ; le romani, comme partout ailleurs dans ce projet, n'a
pas de forme écrite standard unique. Restent le ladino (judéo-espagnol) et le yiddish, les deux
seules langues de la liste sans Etat souverain propre — mais toutes deux pratiquement éteintes en
Bosnie-Herzégovine spécifiquement : la communauté séfarade de Sarajevo, qui parlait le ladino depuis
l'expulsion d'Espagne à la fin du XVe siècle (encore langue maternelle de 10 000 des 70 000 habitants
de Sarajevo au recensement de 1921), a été décimée pendant la Shoah — il n'en reste aujourd'hui que
2 locuteurs couramment (jta.org, voanews.com, échantillon 2022-2023), un ordre de grandeur comparable
au karaïm de Pologne (1 locutrice, écarté au tour de la Pologne) plutôt qu'à l'istro-roumain
ci-dessus (moins de cent). Le yiddish, langue de la minorité ashkénaze du pays, toujours restée bien
plus petite que la majorité séfarade (2 000 contre 12 000 Juifs à Sarajevo avant-guerre, sur une
communauté totale d'environ 500 personnes aujourd'hui — worldjewishcongress.org, balkandiskurs.com)
n'a pas de décompte de locuteurs précis trouvé, mais un profil au moins aussi marginal que le ladino
dans un pays où même celui-ci ne compte plus que deux locuteurs courants. Écartées toutes les deux
pour ce motif, cohérent avec le précédent karaïm.
d'autres langues sans devenir illisible) ; le choix est mémorisé (`localStorage`, comme le thème)
et, à défaut, détecté depuis la langue du navigateur. Un changement de langue en cours de session
retraduit aussi bien le formulaire qu'un itinéraire déjà affiché, sans le retirer au sort (voir
l'écouteur `i18n:langchange` dans `app.js`) — un `leg.__poiUpgradeStarted` (même principe que
`leg.__hikePromise`, déjà utilisé pour les randonnées) garantit qu'aucun ré-affichage ne redemande
Overpass/Visorando ni ne reconsomme la file de points d'intérêt partagée entre les jours d'un même
séjour.

### Rattrapage France/Espagne/Portugal/Andorre

Quatre des tout premiers pays ajoutés au projet — avant que l'audit systématique "quelles langues
régionales ce pays apporte-t-il ?" ne devienne la pratique standard à partir de la République
tchèque — n'avaient JAMAIS eu leurs propres langues régionales évaluées. Demande explicite de
l'utilisateur : vérifier et corriger. Sept langues ajoutées, toutes avec un statut officiel réel et
une tradition écrite établie — le niveau de confiance le plus élevé de tout ce lot, comparable au
luxembourgeois/au maltais plutôt qu'à l'istro-roumain :

- **Catalan** (`ca`) : SEULE langue officielle d'Andorre — jamais ajoutée non plus à l'époque (même
  traitement qu'aurait dû recevoir n'importe quelle langue nationale d'un petit pays non encore
  représentée ailleurs, comme le maltais/le luxembourgeois). Co-officiel en Catalogne, au Pays
  valencien (sous le nom de "valencien", la même langue) et aux Baléares côté espagnol — statut
  constitutionnel, ~9 millions de locuteurs. Langue régionale en Catalogne Nord (Pyrénées-Orientales)
  côté français.
- **Basque** (`eu`) : co-officiel au Pays basque et en Navarre espagnols (statut constitutionnel,
  ~1,2 million de locuteurs) ; langue régionale au Pays basque nord (Iparralde) côté français.
  Isolat linguistique, sans parenté connue avec aucune autre langue.
- **Galicien** (`gl`) : co-officiel en Galice (statut constitutionnel, ~2 millions de locuteurs) —
  très proche du portugais (origine galaïco-portugaise médiévale commune).
- **Occitan** (`oc`, norma classica) : l'aranais, variété gasconne parlée dans le Val d'Aran, est
  CO-OFFICIEL en Catalogne aux côtés du catalan et du castillan — l'occitan est par ailleurs la
  langue régionale historiquement la plus parlée du sud de la France (tradition littéraire des
  troubadours, mouvement félibrige), reconnue "langue de France" par le ministère de la Culture
  (DGLFLF) mais SANS statut co-officiel : la France n'a jamais ratifié la Charte européenne des
  langues régionales ou minoritaires (le Conseil constitutionnel s'y est opposé en 1999), contrairement
  à tous les autres pays déjà couverts ici qui l'ont ratifiée.
- **Breton** (`br`) : reconnu "langue de France" (DGLFLF), écoles immersives Diwan, ~200 000
  locuteurs, Bretagne. Langue celtique (mutations consonantiques) structurellement bien plus éloignée
  du français que les cinq langues romanes de ce lot — niveau de confiance un cran en dessous,
  comparable au sorabe/au frison du Nord : une relecture par un locuteur natif y serait plus utile
  qu'ailleurs dans ce lot.
- **Corse** (`co`) : reconnu "langue de France" (DGLFLF), ~100 000-200 000 locuteurs, statut proche
  du sarde italien déjà couvert.
- **Mirandais** (`mwl`) : SEULE langue du lot reconnue en dehors de la France/l'Espagne/l'Andorre —
  reconnaissance officielle réelle au Portugal pour les affaires locales depuis la loi 7/99
  (29 janvier 1999), Terra de Miranda (Miranda do Douro/Mogadouro/Vimioso), ~10 000-15 000 locuteurs.
  Langue astur-léonaise, PAS une variété du portugais.

Écartées à ce stade (voir aussi `scripts/build-aliases.js` pour le détail) : l'alsacien/le francique
mosellan (dialectes alémaniques sans orthographe standard unique), le francoprovençal/arpitan
(continuum dialectal trop fragmenté, aucune norme unique), le flamand occidental de France (quelques
milliers de locuteurs, même aire dialectale que le flamand occidental belge), et les langues d'oïl
(picard, normand continental, gallo, poitevin-saintongeais...) — aucune de ce dernier groupe
n'atteint le niveau de norme écrite ou de vitalité du breton/de l'occitan/du corse.

Alias multilingues (voir plus bas) régénérés pour l'Andorre/l'Espagne/le Portugal avec ce nouvel
ensemble de langues (`scripts/build-aliases.js` relancé pour ces trois pays SEULEMENT — leurs
`communes-XX.txt` restent inchangés, seuls leurs `aliases-XX.txt` ont été reconstruits) : 465 alias
basques et 422 catalans apparaissent désormais pour l'Espagne (contre 1 700 alias au total avant ce
rattrapage, tous langues déjà couvertes), 118 alias au Portugal (dont 14 mirandais), 19 alias en
Andorre (dont 5 catalans — ex. "San Julià" pour "Sant Julià de Lòria"). La France, elle, n'avait
alors aucun alias (voir plus bas "Saisir une ville dans une autre langue") : ses communes
viennent de geo.api.gouv.fr, pas de GeoNames, aucun geonameid disponible pour les relier aux noms
alternatifs — le catalan/l'occitan/le breton/le corse y servaient donc uniquement à traduire
l'interface, pas à chercher une ville par son nom régional. (Depuis : `aliases-fr.txt`, rattaché par
nom et proximité, voir "Noms alternatifs dans toutes les langues, pour tous les pays".)

L'irlandais (Gaeilge) est arrivé avec l'Irlande, mais PAS pour la même raison que toutes les langues
ci-dessus : c'est la PREMIÈRE langue officielle de la République d'Irlande à parts égales avec
l'anglais (Bunreacht na hÉireann, art. 8), donc en principe exclue par la règle "pas de langue
nationale d'un pays déjà couvert par un autre biais" qui a écarté le tchèque/le polonais/le
slovaque/le hongrois/le slovène/le croate/le bosniaque à chaque fois que l'un de ces pays a été
ajouté. Exception délibérée, choix explicite de l'utilisateur : contrairement à ces langues slaves
parlées dans plusieurs grands pays voisins, l'irlandais n'est langue nationale QUE de l'Irlande — même
logique que le maltais/le luxembourgeois/le catalan (langue nationale d'un petit territoire non
encore représentée ailleurs au moment de son ajout). 1 108 alias irlandais générés automatiquement
depuis GeoNames (`aliases-ie.txt`) — dont certains sont en réalité devenus le nom CANONIQUE de leur
commune plutôt qu'un simple alias : six villes irlandaises repérées avec un nom irlandais comme nom
primaire GeoNames alors que l'anglais reste, même localement, la forme la plus utilisée pour CES villes
précises (ex. "An Muileann gCearr" -> "Mullingar", "Cluain Meala" -> "Clonmel" — voir
`NAME_OVERRIDES` dans `scripts/build-country-communes.js`) ; leur nom irlandais reste bien sûr
disponible comme alias de recherche.

Le mannois (Gaelg) est arrivé avec l'île de Man : contrairement à l'irlandais, ce n'est PAS une
exception à la règle "pas de langue nationale d'un pays déjà couvert" — c'est la langue HISTORIQUE
propre à l'île, relancée après la mort du dernier locuteur natif traditionnel en 1974 (vrai soutien
institutionnel actuel, Bunscoill Ghaelgagh — école primaire en immersion mannoise), ~1 800 personnes
déclarant une connaissance de la langue (recensement 2011). Même logique que le maltais/le
luxembourgeois : la langue propre d'un petit territoire. Niveau de confiance plus faible que la
moyenne du fait du nombre de locuteurs, comparable à l'istro-roumain — choix déjà tranché plusieurs
fois par l'utilisateur (traduire quand même), appliqué ici sans nouvelle question.

Quatre dernières langues, toutes arrivées avec le Royaume-Uni mais ajoutées dans un commit séparé
(voir plus haut le séquençage en quatre temps) : le gallois (Cymraeg, "cy") est officiel au pays de
Galles (Welsh Language (Wales) Measure 2011), Charte Partie III, ~880 000 locuteurs — confiance
haute, comparable au sarde/au frioulan. Le gaélique écossais (Gàidhlig, "gd") est officiel en Écosse
(Gaelic Language (Scotland) Act 2005), Charte Partie III, ~57 000-87 000 locuteurs — confiance haute
également. Le cornique (Kernewek, "kw") a un statut Charte Partie II depuis ~2010 et le Royaume-Uni a
reconnu les Cornouaillais comme minorité nationale (Framework Convention, 2014), mais ne compte plus
que ~500-3 000 locuteurs, surtout de seconde langue — confiance basse, même palier que
l'istro-roumain/le mannois (forme écrite : Kernewek Standard, 2008). Le scots ("sco", ISO 639-2/3 —
pas de code 639-1) a un statut Charte Partie II, ~1,5 million de locuteurs déclarés à des degrés
divers et une vraie tradition littéraire (Robert Burns) — confiance moyenne ; l'ulster-scots (variante
nord-irlandaise) est délibérément FONDU dans cet ajout plutôt qu'ajouté à part, faute de norme écrite
vraiment distincte (même logique que le rusyn/lemko, traité comme une seule langue malgré ses
variantes régionales). `scripts/build-aliases.js` a été relancé une seconde fois pour le Royaume-Uni
avec ces quatre langues nouvellement débloquées dans `SUPPORTED_LANGS` — l'occasion de découvrir et
corriger un bug de qualité de données GeoNames plus large que celui trouvé au premier passage (voir
commit Royaume-Uni) : des centaines de noms gallois/gaéliques-écossais/corniques/irlandais dupliqués
sous des étiquettes de langue CELTIQUES sans rapport entre elles (ex. le gaélique-écossais "Y
Trallwng" pour Welshpool, une ville GALLOISE) — un angle mort du filtre `CELTIC_PROBE_LANGS` existant,
qui ne détectait que les doublons vers une langue hors-probe, jamais entre deux probe langs. Corrigé
par une restriction géographique par langue (`GB_REGION_RESTRICTED_LANGS` : gallois limité aux régions
galloises, gaélique-écossais aux régions écossaises, cornique aux Cornouailles, irlandais à l'Irlande
du Nord), vérifiée exhaustivement sur les 117 régions distinctes du fichier de communes.

### Rattrapage des langues nationales (tchèque, polonais, slovaque, hongrois, slovène, croate,
### bosniaque, serbe)

Huit langues supplémentaires, ajoutées dans un unique commit à la demande explicite de l'utilisateur :
*"pour les précédents pays, rajoute les langues nationales si elles ne sont pas déjà prises en
charge"*. C'est une inversion DÉLIBÉRÉE de la règle "pas de langue nationale d'un grand pays voisin
déjà couvert par ailleurs" appliquée jusque-là (voir plus haut, à propos du kachoube/du bas-sorabe/de
l'irlandais) — règle qui avait explicitement écarté le tchèque, le polonais, le slovaque, le hongrois,
le slovène, le croate et le bosniaque à chaque fois que l'un de ces pays avait été ajouté comme
destination. Pur ajout de packs d'interface (`public/js/i18n.js`, 207 clés STRINGS + 10 clés LISTS
chacun) : aucune nouvelle donnée de pays, de péage, de devise ou de ferry n'était nécessaire, ces sept
pays étant déjà couverts depuis les commits précédents.

Le tchèque (čeština), le polonais (polski), le slovaque (slovenčina), le hongrois (magyar) et le
slovène (slovenščina) sont chacun la langue nationale unique de leur pays, confiance haute (ressources
abondantes). Le croate (hrvatski) est arrivé de la même façon — la Croatie ayant un vrai péage fermé
(HAC), son nom figurait dans la clause de citation des péages du texte de pied de page plutôt que
dans les listes gratuit/vignette (clause depuis retirée, voir "Pied de page sans énumération"). Pour la Bosnie-Herzégovine, dont les trois langues constitutionnelles
sont le bosniaque, le croate et le serbe à parts égales, l'utilisateur a choisi explicitement d'ajouter
le bosniaque (bosanski) ET le serbe (српски) — le croate étant déjà couvert par le pack ajouté pour la
Croatie elle-même, nul besoin d'un second pack croate distinct pour la Bosnie. Le bosniaque, très
proche du croate, reprend le même vocabulaire de base avec quelques choix lexicaux distinctement
bosniaques (« stanica » plutôt que « postaja », « historijski » plutôt que « povijesni », « server »
plutôt que « poslužitelj »). Le serbe est écrit en alphabet cyrillique serbe (norme ékavienne de
Belgrade, comme pour le rusyn/lemko plus haut qui utilise aussi le cyrillique) : rédigé d'abord en
latin ékavien puis translittéré automatiquement par un script dédié qui protège de la translittération
les toponymes et noms de marque sans forme cyrillique établie (Airbnb, Booking.com, Chargemap, GPS,
PDF, GeoNames, geo.api.gouv.fr…) ainsi que les variables `{xxx}` du moteur de traduction.

Un piège récurrent repéré en cours de rédaction : en adaptant la longue phrase de crédits du pied de
page depuis le français, il est facile d'oublier d'insérer le PROPRE pays de la langue qu'on est en
train d'écrire dans la liste des pays crédités et/ou dans la bonne sous-liste péage gratuit /
vignette — trouvé et corrigé pour le slovaque, le hongrois et le slovène avant leur insertion
définitive (la Slovaquie, la Hongrie et la Slovénie manquaient chacune de leur propre nom dans leur
propre pied de page). **Ce piège n'existe plus** : voir "Pied de page sans énumération" ci-dessous.

### Pied de page sans énumération (septembre 2026)

`footer.text` réénumérait à la main, dans CHAQUE bloc de langue, les 62 pays crédités, les exploitants
de péage, les pays à autoroutes gratuites et ceux à vignette — environ 1 850 caractères dupliqués 75
fois. Conséquence mécanique : à chaque nouveau pays il aurait fallu insérer son nom à trois endroits
dans 75 langues, ce qui n'a jamais été fait intégralement. Mesure avant correction : **73 des 75 blocs
étaient périmés** — 21 langues ne mentionnaient toujours pas la Turquie (ajoutée plusieurs lots plus
tôt), 68 ignoraient l'Arménie, 73 le Liban et la Libye. Seuls le français et l'anglais étaient à jour.

Les énumérations ont donc été RETIRÉES de `footer.text` dans les 75 langues. Le texte conserve
l'accroche, le crédit « IGN / geo.api.gouv.fr (Etalab) pour la France, GeoNames (licence CC-BY) » et
le crédit OpenStreetMap/ODbL — soit exactement ce qu'exigent les licences — et passe de ~1 850 à ~250
caractères. Le détail exhaustif (62 pays, sources postales tierces, douze exploitants de péage,
vignettes, ferries, circle-flags) vit désormais en un seul endroit, `public/mentions-legales.html`,
dont le lien est déjà affiché juste sous le pied de page.

Point de méthode : la réécriture n'a introduit AUCUNE prose nouvelle dans les 74 langues où la
structure le permettait. Un script (`scratchpad`, non versionné) a découpé chaque texte existant en
trois phrases, gardé la première et la troisième telles quelles, et tronqué la deuxième juste après la
parenthèse de licence GeoNames — en réutilisant le terminateur propre à chaque écriture (le point
arménien « ։ » pour `hy`) et en préservant les apostrophes échappées (`sc`, `fur`, `lld`). Seuls le
turc et l'azerbaïdjanais, qui placent l'énumération AVANT « GeoNames » par postposition (« … için
GeoNames »), ont demandé une phrase reconstruite à la main, avec la seule locution « pour les autres
pays » ajoutée dans chacune des deux langues.

### Danemark (premier pays nordique)

Le danois (dansk) est arrivé avec le Danemark lui-même — premier des quatre pays nordiques prévus
dans cette série (Danemark, Norvège, Suède, Finlande), langue nationale unique du pays, confiance
haute. Contrairement au tchèque/polonais/slovaque/hongrois/slovène/croate/bosniaque/serbe ci-dessus
(rattrapage sur des pays DÉJÀ couverts), le danois arrive ici en même temps que son pays — le cas
normal pour cette app, pas une exception à documenter. Une nouvelle clé d'interface,
`ferry.route.bornholm` (voir "Ferries" ci-dessus), a dû être ajoutée non seulement en danois mais dans
les 43 langues DÉJÀ prises en charge : réutilisation automatique, pour chacune, du mot "continent" déjà
traduit dans une clé existante similaire (`ferry.route.rab`, une île mineure jamais renommée d'une
langue à l'autre — vérifié) plutôt qu'une retraduction manuelle à 43 reprises ; "Bornholm" lui-même
reste inchangé dans toutes les langues à alphabet latin (comme "Rab"/"Jersey" dans la quasi-totalité
des langues déjà couvertes), les deux langues cyrilliques (rusyn/lemko, serbe) recevant une
translittération phonétique dédiée écrite à la main (Борнгольм, Борнхолм).

### Norvège (deuxième pays nordique)

Le norvégien (norsk), macro-code ISO 639-1 "no", est arrivé avec la Norvège elle-même — rédigé en
bokmål (norme écrite dominante, ~85-90% des Norvégiens), sans pack séparé pour le nynorsk, même
logique d'unification que pour le rusyn/lemko ou le scots/ulster-scots. GeoNames tague d'ailleurs la
quasi-totalité de ses noms alternatifs norvégiens sous ce même macro-code générique "no" plutôt que
"nb"/"nn" distinctement (595 761 entrées "no" contre 1 108 "nb" et 1 275 "nn" dans le dump
alternateNamesV2 norvégien), cohérent avec ce choix. Le same du Nord (davvisámegiella), langue sâme la
plus parlée et officielle dans plusieurs communes du nord du pays, est très largement documenté dans
ce même dump (plus de 30 000 noms alternatifs, code "se") — un signal fort de sa légitimité comme
langue régionale au sens plein du terme, comparable au gallois/au gaélique écossais pour le
Royaume-Uni. Il n'est PAS ajouté dans ce passage malgré ce statut réel : c'est une langue ouralienne
sans parenté avec aucune des 45 déjà couvertes, contrairement au danois/norvégien/suédois (germaniques,
proches de l'anglais/l'allemand déjà couverts) — confiance de traduction jugée trop faible pour un
premier jet fiable sans relecture native, laissé de côté explicitement plutôt que tenté à l'aveugle. Le
kven (finnois de Norvège, code "fkv", ~2 200 noms alternatifs), minorité linguistique elle aussi
officiellement reconnue mais nettement plus modeste, est laissé de côté pour la même raison. Les deux
restent à reconsidérer dans un passage dédié si demandé.

### Suède (troisième pays nordique)

Le suédois (svenska) est arrivé avec la Suède elle-même — troisième des quatre pays nordiques. Une
nouvelle clé d'interface, `ferry.route.gotland` (voir "Ferries" ci-dessus), a été ajoutée aux 45
langues déjà prises en charge, exactement selon la même méthode que `ferry.route.bornholm` lors de
l'ajout du Danemark : réutilisation automatique du mot "continent" de chaque langue (via
`ferry.route.rab`), "Gotland" laissé inchangé dans les langues à alphabet latin, translittéré à la
main dans les deux langues cyrilliques (rusyn/lemko : Ґотланд — avec le Ґ ukrainien/rusyn dédié au "g"
dur étranger, déjà utilisé ailleurs dans ce même bloc pour "Gozo" ; serbe : Готланд). Comme pour la
Norvège, le same du Nord et le meänkieli (minorités linguistiques elles aussi officiellement reconnues
en Suède) sont volontairement laissés de côté, même raisonnement de confiance de traduction. Un cas
particulier positif : le finnois, minorité reconnue en Suède ET langue nationale à part entière de la
Finlande, sera automatiquement disponible comme langue d'interface pour la Suède dès l'ajout de la
Finlande elle-même (pack de langue partagé, sans travail supplémentaire).

### Finlande et îles Åland (quatrième et dernier pays nordique)

Le finnois (suomi) est arrivé avec la Finlande elle-même — dernier des quatre pays nordiques de cette
série, langue ouralienne sans parenté avec aucune des 46 autres déjà couvertes (contrairement au
danois/norvégien/suédois, tous trois germaniques) mais suffisamment documentée et répandue
internationalement pour une confiance de traduction raisonnable, contrairement au same/au kven
volontairement laissés de côté (voir plus haut, à propos de la Norvège/la Suède). Le suédois, déjà
disponible depuis l'ajout de la Suède, est AUSSI langue officielle à part entière de la Finlande (à
parts égales avec le finnois, constitution finlandaise) — automatiquement utilisable ici sans le
moindre travail supplémentaire, exactement comme anticipé lors de l'ajout de la Suède. Same du Nord,
same d'Inari et same skolt (trois langues sâmes reconnues en Finlande, les deux dernières UNIQUES au
pays, sans équivalent ni en Norvège ni en Suède) restent volontairement laissées de côté, même
raisonnement que pour les deux pays précédents. Une nouvelle clé d'interface, `ferry.route.aland`
(voir "Ferries" ci-dessus), a été ajoutée aux 46 langues déjà prises en charge selon la même méthode
automatisée que `ferry.route.bornholm`/`ferry.route.gotland` — "Åland" inchangé dans les langues à
alphabet latin, translittéré à la main dans les deux langues cyrilliques (rusyn/lemko et serbe :
toutes deux Оланд, aucune complication de "g" dur ou de "h" étranger cette fois contrairement à
Bornholm/Gotland). 47 langues au total désormais.

### Monténégro, Albanie et Kosovo (série balkanique)

Le monténégrin (crnogorski, ISO 639-3 "cnr" — pas de code 639-1, même situation que le scots) est
arrivé avec le Monténégro lui-même. Très proche du bosniaque/croate/serbe déjà couverts (même
continuum linguistique serbo-croate) : écrit en alphabet latin ijékavien comme le bosniaque, avec deux
choix lexicaux distinctement monténégrins par rapport au pack bosniaque ("putarina"/"auto-put" plutôt
que "cestarina"/"autocesta"). Les deux lettres supplémentaires de la norme orthographique officielle
de 2009 (ś/ź, pour des sons palatalisés non distingués dans les standards voisins) sont volontairement
PAS utilisées : leur usage reste minoritaire y compris au Monténégro même dans l'écrit officiel,
l'écrasante majorité des textes réels (presse, réseaux sociaux, administration courante) s'en passe —
choix qui reflète l'usage réel plutôt que la norme la plus stricte, à reconsidérer si demandé. Le
bosniaque et le serbe (déjà couverts) restent les deux autres langues significativement parlées au
Monténégro (~8% et ~29% de la population, recensement) ; l'albanais (~5%, sud du pays) est lui aussi
couvert automatiquement dès l'ajout de l'Albanie, dans ce même passage.

L'albanais (shqip, ISO 639-1 "sq") est arrivé avec l'Albanie elle-même. Écrit en albanais standard
(basé sur le tosque, norme unifiée depuis 1972, utilisée aussi bien en Albanie qu'au Kosovo — aucun
pack séparé pour le guègue du nord, même logique d'unification que pour le rusyn/lemko ou le
scots/ulster-scots). Cette même langue devient AUTOMATIQUEMENT disponible pour le Kosovo dès son
propre ajout, dans ce même passage (langue nationale des deux pays, ~92% de la population kosovare) —
aucun travail supplémentaire nécessaire, même logique que le suédois pour la Finlande. Langue isolée
de la famille indo-européenne, sans parenté avec aucune des 47 langues déjà couvertes — confiance de
traduction plus prudente que pour les langues romanes/germaniques/slaves déjà maîtrisées dans ce
projet, une relecture native reste recommandée. La minorité grecque d'Albanie (~0,9%, sud du pays
autour de Sarandë/Himarë), reconnue officiellement, est volontairement laissée de côté dans ce
passage — nouvel alphabet, nouvelle famille de langue, effort disproportionné pour cette étape, à
reconsidérer si demandé.

**Le Kosovo, lui, n'apporte AUCUNE nouvelle langue** : ses deux langues officielles (albanais et
serbe) sont toutes deux déjà couvertes — l'albanais par le passage Albanie de ce même commit, le serbe
depuis le rattrapage tchèque/polonais/slovaque/hongrois/slovène/croate/bosniaque/serbe. Cas le plus
simple de toute la série balkanique sur ce plan précis, symétrique à celui du Kosovo pour les données
(le plus compliqué des trois, voir "Pays couverts").

49 langues au total désormais.

Les pages de mentions légales et de politique de confidentialité restent pour l'instant uniquement
en français (texte juridique dense, hors du périmètre de ce premier passage).

**Avertissement de traduction** : le pied de page affiche, dans les langues couvertes (47 au moment de
son ajout, 49 depuis la série balkanique), une courte phrase
prévenant que l'interface a été traduite et peut contenir des erreurs, avec une invitation à les
signaler à `contact@lume419.fr` (clé `footer.translationDisclaimer`, `public/js/i18n.js`) — ajoutée
à la demande explicite de l'utilisateur une fois la série des pays nordiques terminée. Contrairement
aux clés `ferry.route.*` (voir plus haut), chaque traduction ici est une vraie phrase écrite par
langue plutôt qu'une réutilisation mécanique d'un mot déjà traduit ailleurs — y compris pour les
langues à faible niveau de confiance (haut-sorabe/frison du Nord/rusyn-vlaški/mannois/cornique/
mirandais...), au même niveau d'effort que le reste de leur pack respectif.

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
restaient, elles, propres à la France (depuis : Visorando dans neuf pays et itinéraires OpenStreetMap
ailleurs, voir "Randonnées dans le monde entier").

### Serbie et Macédoine du Nord (suite de la série balkanique)

Le macédonien (makedonski, ISO 639-1 "mk") est arrivé avec la Macédoine du Nord elle-même. Langue
slave méridionale écrite en cyrillique, proche du bulgare et, dans une moindre mesure, du serbe déjà
couvert (même sous-groupe slave du sud, mais deux langues distinctes reconnues séparément, pas un
dialecte l'une de l'autre). L'albanais (~25% de la population, co-officiel dans les communes où il
dépasse 20% des habitants depuis la loi de 2019) est lui-même déjà couvert depuis l'ajout de
l'Albanie ; aucune autre langue minoritaire du pays (turc, rom, serbe, aroumain — chacune co-officielle
seulement dans une poignée de communes) n'a été ajoutée séparément, le seuil de reconnaissance restant
très local contrairement à l'albanais.

Le roumain standard (ISO 639-1 "ro") est arrivé avec la Serbie plutôt qu'avec un pays roumanophone
(aucun n'est couvert par cette app) : langue co-officielle de la province autonome de Voïvodine (nord
de la Serbie), aux côtés du serbe déjà couvert et du hongrois/slovaque/rusyn/croate ajoutés à
différents moments de cette même série — statut confirmé dans les alias générés pour la Serbie (27
correspondances "ro"). À distinguer du "ruo" déjà présent (Vlaški-Žejanski/istro-roumain, langue
distincte parlée en Istrie croate, pas en Serbie) : les deux langues sont apparentées (branche romane
orientale) mais n'ont pas la même aire linguistique ni le même statut officiel dans ce projet. Le
serbe lui-même (déjà couvert depuis le rattrapage tchèque/polonais/slovaque/hongrois/slovène/croate/
bosniaque/serbe) n'a demandé aucun travail supplémentaire pour la Serbie — même logique que le
Kosovo pour l'albanais/le serbe dans le passage précédent.

51 langues au total désormais.

**Alias cyrilliques macédoniens** : contrairement aux 49 autres alias de communes déjà générés
(rapprochements purs entre langues), la Macédoine du Nord ajoute un cas inédit — 30 alias `mk`
synthétisés directement par `scripts/build-aliases.js` plutôt qu'extraits du fichier `alternateNamesV2`
(voir "Pays couverts" plus haut pour le détail des 75 communes concernées par la bascule
cyrillique -> latin). Sans cette synthèse, ces communes resteraient trouvables par leur nom latin
affiché mais PAS par leur vrai nom macédonien tapé au clavier — un angle mort découvert en testant ce
rattrapage précis (recherche de "Арачиново" restant vide malgré la commune "Arachinovo" bien présente
dans `communes-mk.txt`).

### Grèce et Bulgarie

Le grec (ISO 639-1 "el") est arrivé avec la Grèce elle-même. Aucune langue régionale ou minoritaire
n'a été ajoutée séparément : la Grèce ne reconnaît officiellement aucune langue régionale (contrairement
à la Macédoine du Nord/l'albanais dans le passage précédent) — les langues minoritaires réellement
parlées (arvanite, pontique, aroumain/vlach, macédonien slave localement) n'ont ni statut officiel ni
forme écrite standardisée largement utilisée. Le bulgare (ISO 639-1 "bg") est arrivé avec la
Bulgarie elle-même — langue slave méridionale écrite en cyrillique, proche du macédonien déjà couvert
(même sous-groupe slave du sud) mais reconnue comme langue distincte, pas un dialecte l'une de
l'autre. Là non plus, aucune langue régionale ajoutée séparément : le turc (~9% de la population,
sud-est du pays) n'a aucun statut officiel en Bulgarie (contrairement à l'albanais en Macédoine du
Nord). **La Roumanie, elle, n'apporte AUCUNE nouvelle langue** : le roumain (`ro`) et le hongrois
(`hu`) sont déjà couverts depuis l'ajout de la Serbie/du rattrapage régional Europe centrale — les
deux langues officielles/co-officielles du pays existaient donc déjà avant même que la Roumanie
rejoigne `COUNTRIES`.

53 langues au total désormais.

**Alias cyrilliques et grecs synthétisés en nombre** : contrairement au cas isolé de la Macédoine du
Nord ci-dessus (30 alias `mk` synthétisés pour 75 communes en rupture de script), la Grèce synthétise
un alias `el` (grec, translittéré depuis `asciiname` vers le grec) pour la quasi-totalité de ses
14 220 communes — le fichier `alternateNamesV2` de GeoNames, contrairement au cas macédonien, ne
fournit quasiment aucun nom alternatif grec pour les communes de ce pays alors que `communes-gr.txt`
lui-même stocke déjà les noms en grec translittéré (voir "Pays couverts") : sans cette synthèse,
taper le nom grec réel d'une commune n'aurait presque jamais fonctionné. Résultat : 17 075 alias
générés pour la Grèce, dont 13 750 rien que pour `el` — de très loin le plus gros contingent d'alias
pour un seul pays de toute cette série, la Bulgarie (5 784 alias) et la Roumanie (1 199 alias) restant,
elles, dans la fourchette habituelle des pays au pipeline standard.

### Lettonie, Lituanie et Estonie

Trois langues nationales arrivées avec leurs pays respectifs : le letton (ISO 639-1 "lv"), le
lituanien ("lt") et l'estonien ("et"). Chacune des trois a aussi apporté une langue RÉGIONALE
distincte, contrairement à la Grèce/la Bulgarie du passage précédent (aucune ajoutée) — un cas de
figure plus proche de la série Serbie/Macédoine du Nord ou du rattrapage régional
France/Espagne/Portugal :

- **Le latgalien** (letton : *latgaliešu*, ISO 639-3 "ltg") est explicitement nommé et protégé par
  l'article 3 de la loi lettone sur la langue officielle, en tant que "variante historique de la
  langue lettone" — un statut de protection réel mais distinct d'une reconnaissance comme langue
  officielle à part entière (le débat sur son vrai statut linguistique reste ouvert en Lettonie
  même). Langue bien vivante (~150 000 locuteurs, région de Latgale à l'est du pays), sa propre
  édition Wikipédia (ltg.wikipedia.org).
- **Le võro** (estonien : *võro kiil*, ISO 639-3 "vro") est une langue sud-estonienne parlée dans la
  région de Võrumaa (~75 000 locuteurs), avec son propre standard écrit, sa propre édition
  Wikipédia et un institut public dédié (Võru Instituut) — mais SANS statut de langue régionale
  officielle à ce jour : une tentative de 2004 de modifier la loi sur la langue a échoué faute de
  consensus, même si la législation récente autorise un usage public plus large des variantes
  régionales.
- **Le samogitien/žemaitien** (lituanien : *žemaitiu kalba*, ISO 639-3 "sgs") est classé comme une
  langue distincte plutôt qu'un simple dialecte du lituanien standard par l'ISO 639-3, du fait d'un
  écart phonétique/lexical suffisamment important pour rendre les deux difficilement
  intercompréhensibles sans habitude. Sa présence dans les données GeoNames est d'ailleurs la plus
  visible des trois langues régionales de ce passage : 101 alias `sgs` générés pour la Lituanie
  (voir plus bas), le deuxième contingent le plus important après le lituanien lui-même.

Le russe, bien que largement parlé dans les trois pays (environ 25% en Lettonie et en Estonie,
moins en Lituanie), n'a de statut officiel dans aucun des trois — un référendum letton de 2012 a
explicitement rejeté son statut de seconde langue officielle. Non ajouté, même logique que le turc
en Bulgarie ou le polonais/le russe en Lituanie.

**Qualité des trois traductions régionales** : contrairement au letton/lituanien/estonien
eux-mêmes (langues nationales bien dotées en ressources), le vocabulaire technique/d'interface du
latgalien, du võro et du samogitien n'est pas largement standardisé (aucun terme "officiel" pour
"export PDF" ou "GPS" dans aucune des trois) — chaque traduction part donc du texte de la langue
nationale apparentée, avec les différences les plus solidement attestées appliquées
systématiquement (letton *valoda* -> latgalien *volūda*, *diena* -> *dīna* ; estonien *keel* ->
võro *kiil*, *või* -> *vai* ; lituanien *kaip* -> samogitien *kap*), plutôt qu'une forme "complète"
inventée mot à mot pour chaque terme technique — plus proche de la pratique réelle de ces langues à
l'écrit dans un contexte technique, documenté comme tel dans le commentaire de chaque bloc de
`i18n.js`.

59 langues au total désormais.

**Alias `sgs` et `ltg`** : la Lituanie synthétise 101 alias `sgs` (samogitien) directement depuis le
champ de noms alternatifs de GeoNames — une vraie étiquette de langue déjà présente dans les
données tierces, contrairement aux alias `mk`/`el` synthétisés à la main pour la Macédoine du Nord/
la Grèce plus haut. La Lettonie fait de même avec 10 alias `ltg` (latgalien) et même 1 alias `vro`
isolé (nom d'une localité proche de la frontière estonienne). 304 alias au total pour la Lettonie,
664 pour la Lituanie, 431 pour l'Estonie — dans la fourchette habituelle des pays au pipeline
standard, sans le pic observé pour la Grèce (voir ci-dessus).

### Vatican, Islande et Îles Féroé

**Le Vatican n'apporte AUCUNE nouvelle langue** — cas inédit dans cette série, plus radical encore
que la Roumanie plus haut (qui, elle, n'ajoutait aucune langue mais restait un pays de taille
normale) : l'italien, sa langue de travail quotidienne réelle (Curie romaine, Gouvernorat, Garde
suisse, signalisation), est déjà couvert depuis l'ajout de l'Italie. Le latin, seule langue
OFFICIELLE au sens strict de l'État de la Cité du Vatican, n'a volontairement pas été ajouté : une
langue liturgique et juridique, jamais parlée au quotidien ni utilisée par aucune interface
numérique moderne pour ce genre d'usage — même raisonnement que pour le kosovar plus haut (aucune
langue distincte à créer là où aucun besoin réel n'existe), plutôt appliqué ici à une langue
classique qu'à une langue nationale déjà couverte ailleurs.

**L'Islande apporte l'islandais** (íslenska, ISO 639-1 "is") — langue nationale unique du pays,
sans langue régionale ou minoritaire reconnue à ajouter séparément (contrairement à la Lettonie/la
Lituanie/l'Estonie dans le passage précédent) : l'Islande est linguistiquement l'un des pays les
plus homogènes d'Europe, sans minorité linguistique autochtone comparable au latgalien/au võro/au
samogitien. Langue germanique du nord, restée exceptionnellement proche du vieux norrois écrit
(un locuteur islandais moderne peut encore lire les sagas médiévales dans le texte, contrairement
au danois/au norvégien/au suédois déjà couverts) — vocabulaire technique/d'interface entièrement
disponible malgré cette conservation archaïque, grâce à une politique linguistique active de
néologismes islandais plutôt que d'emprunts (Íslensk málnefnd, le comité de la langue islandaise) :
niveau de confiance comparable au danois/au norvégien/au suédois, pas aux langues régionales à
faibles ressources comme le bas-allemand/le sorabe.

**Les îles Féroé apportent le féroïen** (føroyskt, ISO 639-1 "fo") — également langue germanique du
nord, proche de l'islandais et du norvégien de l'ouest (vieux norrois), co-officielle avec le danois
sur l'archipel (déjà couvert depuis l'ajout du Danemark) : le danois reste utilisé dans
l'administration/l'enseignement supérieur, mais le féroïen est la langue de tous les jours et la
seule vraiment "propre" à l'archipel, ce qui justifie son ajout séparé plutôt qu'une simple
réutilisation du danois — même logique que le luxembourgeois pour le Luxembourg (langue nationale
distincte d'un territoire déjà couvert par ses voisins). Aucune langue régionale supplémentaire à
ajouter : l'archipel, 18 îles pour à peine 55 000 habitants, ne présente aucune fragmentation
dialectale reconnue comparable au frison du Nord allemand.

61 langues au total désormais.

**Alias** : le Vatican, une seule commune, ne génère par nature aucun alias significatif (16 au
total, tous des variantes orthographiques mineures du même nom). L'Islande synthétise 288 alias,
dont 163 auto-référencés `is` (le nom islandais d'une commune listé comme son propre alias,
utile pour la recherche insensible aux diacritiques þ/ð/ö). Les îles Féroé synthétisent 113 alias,
dont 3 auto-référencés `fo` — et, fait notable, 46 alias étiquetés `lt` (lituanien) par
`alternateNamesV2` : une coïncidence orthographique probable entre certains noms de lieux féroïens
et des mots lituaniens plutôt qu'une vraie communauté lituanienne locale (aucune ressource ne
corrobore un lien réel), non retirée pour rester fidèle à la donnée brute GeoNames comme pour
toutes les autres tables d'alias de ce projet.

**Gibraltar, la Moldavie, la Biélorussie et l'Ukraine**, ajoutés ensuite, apportent CINQ
nouvelles langues — plus que le nombre de pays lui-même, chacune décidée d'après le statut légal
réel du pays concerné plutôt qu'un choix éditorial, même règle que pour la Finlande/l'Irlande/la
Bosnie-Herzégovine plus haut. **Gibraltar n'apporte aucune langue** : l'anglais (déjà couvert) est
la seule langue officielle du territoire, et le llanito vernaculaire local (mélange d'espagnol
andalou et d'anglais, très largement parlé au quotidien) n'a ni statut officiel, ni code ISO 639,
ni orthographe standardisée — une proposition de Wikipédia en llanito a d'ailleurs été rejetée
précisément pour absence de code ISO 639-3 (meta.wikimedia.org). **La Moldavie** : le roumain,
langue d'Etat, reste couvert via "ro"/la Roumanie (pas de doublon nécessaire) — apporte en revanche
**le gagaouze** (Gagauzça, ISO 639-2/3 "gag", pas de code 639-1), seule langue à statut officiel
PROPRE au pays : co-officielle avec le roumain et le russe dans l'autonomie territoriale de
Gagaouzie (loi de 1994 sur son statut juridique spécial). Alphabet latin (réforme de 1996,
influencée par le turc et le roumain) — confiance de traduction plus faible que la moyenne du fait
du faible nombre de locuteurs (~150 000), même palier que l'istro-roumain/le cornique/le mannois
déjà traduits malgré ce même genre de réserve, choix explicite de l'utilisateur reconduit ici.
**La Biélorussie** apporte à la fois **le biélorusse** (Беларуская, ISO 639-1 "be") et **le russe**
(Русский, ISO 639-1 "ru") : les deux sont langues d'Etat à parts STRICTEMENT égales (art. 17 de la
Constitution biélorusse, révision de 1996) — même cas de figure que l'irlandais/l'anglais en
République d'Irlande, aucune des deux n'étant à exclure au nom de la règle "pas de langue nationale
d'un pays déjà couvert par un autre biais" puisque ni l'une ni l'autre n'est la langue nationale
d'un AUTRE pays déjà couvert par cette app (la Russie elle-même n'est pas un pays couvert ici — son
ajout éventuel resterait donc sans redondance avec ce choix). **L'Ukraine** apporte **l'ukrainien**
(Українська, ISO 639-1 "uk"), seule langue d'Etat depuis la loi du 25 avril 2019 "Sur le
fonctionnement de l'ukrainien en tant que langue d'Etat" (entrée en vigueur le 16 juillet 2019) —
ainsi que **le tatar de Crimée** (Qırımtatarca, ISO 639-2/3 "crh", pas de code 639-1) : contrairement
au russe, RETIRÉ par le Parlement ukrainien lui-même de la liste des langues minoritaires protégées
par la Charte européenne en décembre 2025 (Kyiv Independent), le tatar de Crimée, lui, y reste bien
présent (avec le hongrois/le roumain/le polonais/le biélorusse..., 18 langues au total sur la liste
mise à jour) — ajouté sur ce fondement précis (statut légal ukrainien ACTUEL, jamais un jugement
indépendant sur une langue autrement hors du périmètre déjà couvert par ce projet). Alphabet latin
(réintroduit en 1997, toujours en usage concurrent avec le cyrillique hérité de la période
soviétique) — même réserve de confiance que le gagaouze du fait du nombre de locuteurs plus modeste
(~500 000) et de ressources d'apprentissage plus rares que pour l'ukrainien/le russe/le biélorusse,
traduit malgré tout par cohérence avec l'istro-roumain/le cornique/le mannois/le gagaouze déjà
couverts. Le hongrois et le roumain, déjà couverts (Hongrie/Roumanie), ne reçoivent volontairement
AUCUNE mention séparée pour l'Ukraine bien qu'ils figurent eux aussi sur la liste des 18 langues
protégées — leurs locuteurs disposent déjà d'une interface complète par un autre biais, seuls leurs
alias de ville profitent automatiquement de cet ajout (voir juste en dessous).

66 langues au total désormais.

**Alias** : contrairement aux ajouts précédents, ce passage régénère aussi bien les fichiers de
communes que d'alias des QUATRE nouveaux pays d'un coup — mais, comme pour chaque ajout antérieur,
les fichiers alias des pays DÉJÀ couverts (Espagne, Allemagne...) ne sont PAS régénérés : un
visiteur cherchant une ville allemande en russe ne trouvera donc de résultat que si "ru" figurait
déjà dans l'ensemble de langues utilisé lors de la dernière génération d'`aliases-de.txt`, ce qui
n'est pas le cas ici (limite assumée, cohérente avec le principe déjà en place — voir le commentaire
`COUNTRIES` en tête de `scripts/build-aliases.js`, "pas la peine de retélécharger leurs sources pour
les régénérer à l'identique à chaque nouvel ajout"). Pour les QUATRE nouveaux pays eux-mêmes, en
revanche, la couverture est complète dès ce passage : `aliases-gi.txt` (9 alias, dont un anglais
"East Side" pour Catalan Bay), `aliases-md.txt` (1 784 alias, dont 1 529 russes, 63 ukrainiens, 13
biélorusses et 3 gagaouzes — la faible proportion gagaouze reflète la petite taille de l'autonomie
de Gagaouzie face au reste du pays), `aliases-by.txt` (24 550 alias, dont 17 523 russes et 5 425
biélorusses), `aliases-ua.txt` (50 964 alias, dont 22 139 ukrainiens et 20 661 russes — cette
proportion russe élevée reflète des noms alternatifs historiques hérités de la période soviétique/
prérévolutionnaire déjà présents dans `alternateNamesV2`, une simple possibilité de RECHERCHE
supplémentaire qui ne change rien au nom CANONIQUE affiché, resté ukrainien pour les 30 044 communes
du pays — même logique que les alias serbes conservés pour des communes kosovares au nom canonique
albanais).

**La Turquie**, ajoutée ensuite — exceptionnellement seule plutôt qu'en groupe, mais le pays le
plus peuplé jamais ajouté à ce projet (~85 millions d'habitants) — apporte **UNE SEULE** nouvelle
langue : **le turc** (Türkçe, ISO 639-1 "tr"), SEULE langue d'Etat au titre de l'article 3 de la
Constitution turque. Contrairement à tous les pays couverts jusqu'ici, la Turquie n'a ni signé ni
ratifié la Charte européenne des langues régionales ou minoritaires (vérifié, coe.int) et n'accorde
de statut CO-officiel à aucune langue régionale nulle part sur son territoire, y compris au kurde
(kurmandji/zazaki, malgré une population de locuteurs importante — dizaines de millions) : l'article
42 de la Constitution interdit explicitement tout enseignement d'une langue maternelle autre que le
turc, un assouplissement partiel depuis 2012 (kurde en option à partir de la 5ᵉ année) restant loin
d'un statut officiel ou co-officiel. Les quatre seules minorités protégées par un texte légal (traité
de Lausanne, 1923 — arménien, bulgare, grec, hébreu) le sont au titre de droits COMMUNAUTAIRES
(écoles, culte) et non d'un statut de langue officielle ou régionale comparable à celui qui a
justifié chaque ajout précédent de ce projet (le finnois-suédois, le trilinguisme bosnien,
l'autonomie gagaouze...) — aucune de ces quatre langues n'est donc ajoutée ici, cohérent avec la même
règle "statut légal réel du pays, jamais un jugement indépendant" déjà appliquée pour le
Kosovo/l'Ukraine plus haut.

67 langues au total désormais.

**Alias** : `aliases-tr.txt`, 5 202 alias, dont 2 571 turcs (variantes orthographiques/noms anciens
du même lieu), 1 318 russes (importants malgré l'absence du russe comme langue d'interface pour ce
pays précis — simple sous-produit technique du fait que "ru" est déjà une langue prise en charge
depuis l'ajout de la Biélorussie, aucune décision éditoriale propre à la Turquie), et une longue
traîne d'autres langues déjà couvertes (anglais, grec, bulgare...).

**Ferries** : deux vraies traversées pour véhicules dans le détroit des Dardanelles, toutes deux
opérées par GESTAŞ (seul opérateur, quasi-monopole historique comme Île de Man Steam Packet/
Bornholmslinjen/Destination Gotland déjà rencontrés plus haut) — voir "Ferries" plus bas pour le
détail complet des tarifs.

**La Géorgie**, ajoutée ensuite, apporte **DEUX** nouvelles langues : **le géorgien** (ქართული,
ISO 639-1 "ka"), seule langue d'Etat sur l'ensemble du territoire (article 8 de la Constitution
géorgienne), et **l'abkhaze** (Аҧсшәа, ISO 639-1 "ab") — le MÊME article 8 dispose que "la langue
officielle de la République autonome d'Abkhazie est également l'abkhaze", un statut co-officiel
accordé par la Géorgie ELLE-MÊME dans un texte constitutionnel toujours en vigueur, même s'il ne
s'applique plus dans les faits depuis que l'Abkhazie est de facto hors du contrôle du gouvernement
géorgien — exactement le même raisonnement que le tatar de Crimée pour l'Ukraine (le statut légal que
le pays revendique lui-même, jamais une réalité territoriale de facto). L'ossète n'est PAS ajouté :
contrairement à l'abkhaze, aucun texte géorgien ne lui accorde de statut officiel ou co-officiel — son
statut de langue officielle en Ossétie du Sud ne vient QUE de la propre constitution de ce territoire
séparatiste (non reconnu par la Géorgie ni par la majorité de la communauté internationale), jamais de
la Géorgie elle-même. Aucune autre langue régionale : la Géorgie n'a ni signé ni ratifié la Charte
européenne des langues régionales ou minoritaires (engagement pris dès son adhésion au Conseil de
l'Europe en 1999, toujours non tenu en mars 2025 d'après coe.int) — ni le mingrélien/svane (langues
kartvéliennes proches du géorgien, aucun statut légal propre), ni l'arménien/l'azéri (minorités
numériquement importantes mais sans statut officiel ou régional), ne remplissent le critère "statut
légal réel du pays" déjà appliqué à chaque ajout précédent.

L'abkhaze est traduit avec une réserve de confiance plus forte que toute autre langue de ce projet :
contrairement au gagaouze/au tatar de Crimée (langues turques, traduisibles en s'appuyant sur le turc
déjà présent dans l'app), l'abkhaze est une langue isolée (caucasienne du nord-ouest, système verbal
polysynthétique parmi les plus complexes au monde) sans aucune langue apparentée déjà couverte pour
servir de base — traduit malgré tout à la demande explicite de l'utilisateur, avec cette réserve
clairement signalée plutôt que tue.

69 langues au total désormais.

**Alias** : `aliases-ge.txt`, 5 579 alias, dont 2 638 géorgiens (le nom local en écriture მხედრული,
utile puisque le nom canonique affiché par l'app reste la translittération latine GeoNames), 2 366
russes (héritage soviétique, quasi une entrée par commune) et une longue traîne d'autres langues déjà
couvertes (anglais, ukrainien, turc...).

Aucun ferry supplémentaire : la Géorgie n'a pas d'île habitée nécessitant une traversée en propre.

**L'Arménie, l'Azerbaïdjan, la Syrie et Chypre**, ajoutés ensuite, apportent **SIX** nouvelles
langues au total (Chypre elle-même n'en ajoute aucune : le grec et le turc, ses deux langues
officielles, sont déjà couverts depuis respectivement la Grèce et la Turquie — voir "Pays couverts"
ci-dessus). **L'arménien** (Հայերեն, ISO 639-1 "hy") depuis l'ajout de l'Arménie, seule langue d'Etat.
**L'azerbaïdjanais** (Azərbaycanca, ISO 639-1 "az") depuis l'ajout de l'Azerbaïdjan, seule langue
d'Etat (article 21 de la Constitution) — le talysh et le lezguien, les deux principales minorités du
pays, ne sont PAS ajoutés : ni l'un ni l'autre n'a de statut légal accordé par l'Azerbaïdjan lui-même
(qui n'a signé la Charte européenne des langues régionales ou minoritaires qu'à son adhésion au
Conseil de l'Europe, jamais ratifiée depuis) — même critère "statut légal réel du pays" déjà appliqué
au kurde de Turquie/au mingrélien-svane de Géorgie plus haut, malgré une forme écrite bien identifiée
pour les deux (latin pour le talysh, cyrillique pour le lezguien).

**La Syrie**, avec la couverture la plus large de ce passage (choix explicite de l'utilisateur),
apporte quatre langues. **L'arabe** (العربية, ISO 639-1 "ar") — seule langue nationale historique, et
PREMIÈRE langue à écriture arabe/RTL de ce projet (`dir="rtl"` appliqué dynamiquement sur `<html>`
via `applyDirection()` dans `i18n.js`, voir plus bas). **Le kurde/kurmandji** (Kurdî, ISO 639-1 "ku")
— reconnu "langue nationale" de Syrie par le décret présidentiel n°13 du 16 janvier 2026 (Ahmed
al-Sharaa), première reconnaissance officielle depuis l'indépendance de 1946 (institutkurde.org, Al
Jazeera) : même critère "statut légal réel du pays" déjà appliqué au tatar de Crimée/à l'abkhaze,
alphabet latin (Bedirxan) standardisé de longue date, 1,6 à 2,5 millions de locuteurs en Syrie. **Le
touroyo/araméen central** (Ṣuryoyo, ISO 639-3 "tru" — pas de code 639-1) — langue des communautés
syriaques/assyriennes du nord-est (Hassaké/Qamichli), orthographe standardisée en 2015-2017 (projet
Erasmus+ "Aramaic Online", conférence de Cambridge, scripts syriaque et latin). Préférée à l'araméen
occidental de Maaloula (la forme la plus emblématique, "dernière langue araméenne parlée nativement"),
délibérément ÉCARTÉE : aucune forme écrite consensuelle à ce jour (trois systèmes concurrents — un
alphabet "Maalouli" créé en 2006, le script syriaque Serto, un alphabet latin modifié depuis 2016 —
la langue elle-même le confirme, "no agreed-upon writing system exists to date") — même règle
d'exclusion "pas de norme écrite" déjà appliquée à l'alsacien/au francoprovençal en France. **Le
circassien/adyguéen** (Адыгэбзэ, ISO 639-1 "ady") — communauté circassienne de Syrie (Damas, région
du Golan/Qunaitra, environs d'Alep, ~30 000-35 000 personnes aujourd'hui contre 100 000-130 000 avant
2011), alphabet cyrillique standardisé depuis 1938.

75 langues au total désormais.

**Confiance** : "hy"/"az"/"ar"/"ku" sont traduites avec le même niveau de confiance que la majorité
des langues de ce projet. "tru"/"ady", en revanche, sont documentées avec une réserve plus forte —
langues nettement plus rarement disponibles dans les ressources habituelles de traduction, à
considérer comme une approximation de bonne foi plutôt qu'une traduction certifiée par un locuteur
natif, même réserve déjà appliquée au rusyn/au kachoube/au monégasque ailleurs dans ce fichier.

**RTL (lecture droite-à-gauche)** : l'arabe est la première langue RTL jamais ajoutée à ce projet —
jusqu'ici jamais nécessaire, même pour les langues à écriture non latine déjà couvertes (géorgien,
abkhaze, russe, grec...), toutes des écritures gauche-à-droite. `dir="rtl"` sur l'élément `<html>`
suffit à inverser la mise en page entière (marges, alignement du texte, ordre visuel des contrôles)
sans toucher au balisage lui-même — comportement natif du navigateur, appliqué au chargement et à
chaque changement de langue (`applyDirection()`, appelée aux côtés d'`applyStaticTranslations()`).

**Alias** : pas de fichier alias pour l'Arménie ni pour la Syrie (comme la France) à ce stade (depuis :
`aliases-am.txt`, `aliases-sy.txt` et `aliases-fr.txt` existent, voir "Noms alternatifs dans toutes les
langues, pour tous les pays"). `aliases-az.txt`,
10 623 alias (dont un correctif notable détecté en testant cet ajout : le nom "Baku" n'était d'abord
rattaché qu'au nom canonique NON corrigé, laissant la recherche "Baku" introuvable après le
renommage en "Bakı" — corrigé en répercutant les mêmes `NAME_OVERRIDES` dans `build-aliases.js`,
qui maintient sa propre copie de cette table indépendamment de `build-country-communes.js`).
`aliases-cy.txt`, 973 alias.

**Drapeaux** : "hy"->"am" et "az"->"az" (drapeau national du pays qui a introduit la langue, même
logique que "ka"/"ab"->"ge" plus haut). "ar"/"ku"/"tru"/"ady" retombent tous les quatre sur le
drapeau syrien ("sy") : aucun des trois derniers n'a de drapeau propre dans circle-flags (le kurde
n'a pas d'Etat, le touroyo/le circassien encore moins), et l'arabe lui-même retombe sur la Syrie
plutôt qu'un autre pays arabophone puisque c'est l'ajout de la Syrie qui a introduit cette langue
dans l'interface — même mécanisme de repli que nds/hsb/frr vers l'Allemagne plus haut.

**Le Liban, Israël, la Palestine, la Jordanie, l'Égypte et la Libye**, ajoutés ensuite,
N'APPORTENT AUCUNE NOUVELLE LANGUE à l'interface — l'arabe, déjà couvert depuis la Syrie, reste la
seule langue de ces six pays à remplir le critère "statut légal réel accordé par le pays lui-même"
déjà appliqué à chaque ajout précédent. Revue systématique effectuée pour chacun, même méthode que
pour le talysh/le lezguien d'Azerbaïdjan ou le mingrélien/le svane de Géorgie plus haut :
- **Liban** : le français a un statut plus faible qu'il n'y paraît — l'article 11 de la Constitution
  de 1926 (amendée 1943) délègue seulement à une loi ordinaire "les cas dans lesquels [il] peut être
  utilisé", sans le désigner officiel ou co-officiel au sens strict (contrairement au luxembourgeois
  au Luxembourg ou au romanche en Suisse). L'arménien (communauté ~4% de la population) n'a aucun
  statut légal ou constitutionnel trouvé.
- **Israël** : l'hébreu est bien "langue de l'Etat" (article 4a de la Loi fondamentale "Israël,
  Etat-nation du peuple juif", 2018) ; l'arabe s'est vu retirer son statut de langue officielle par ce
  même texte au profit d'un "statut spécial" (article 4b) — mais aucun impact pratique ici, l'arabe
  étant déjà langue d'interface depuis la Syrie et l'hébreu n'apportant, lui, aucune minorité propre
  remplissant le critère du projet.
- **Palestine** : l'arabe est la seule langue officielle de la Loi fondamentale palestinienne
  (article 4, amendée 2003/2005).
- **Jordanie** : les Circassiens/Tchétchènes disposent de 3 sièges réservés au Parlement (loi
  électorale), mais c'est une reconnaissance ethnique/de représentation, pas un statut accordé à leur
  LANGUE — ne remplit pas le critère du projet, même distinction déjà appliquée ailleurs.
- **Égypte** : ni le nubien (Nobiin/Kenzi — Constitution de 2014, reconnaissance ethnique avec "droit
  au retour" jamais mis en œuvre, mais rien pour la langue elle-même ; aucune écriture standardisée
  en usage réel non plus, même défaut disqualifiant que l'araméen occidental de Maaloula en Syrie) ni
  le siwi berbère (aucun statut, "definitely endangered" UNESCO) ne remplissent le critère.
- **Libye** : la loi n°18 de 2013 reconnaît le tamazight/le tergui/le tebou comme "composantes
  culturelles et linguistiques", un statut culturel/éducatif optionnel, PAS un statut de langue
  officielle ou co-officielle ; une déclaration unilatérale de 2017 du Conseil suprême amazigh
  libyen proclamant le tamazight officiel dans les municipalités à majorité amazighe n'est,
  elle, pas un texte adopté par l'Etat libyen lui-même.

**Alias** : construits par un script dédié (`scripts/build-govfallback-aliases.js`, les six pays
n'ayant pas de fichier de codes postaux standard pour rejoindre un geonameid à la méthode habituelle
de `build-aliases.js`) — SURTOUT utile ici puisque plusieurs grandes villes ont été renommées vers
leur nom local (Cairo->Al Qahirah, Beirut->Beyrouth, Jerusalem->Yerushalayim...) : sans alias, taper
le nom anglais usuel de ces villes ne les aurait plus fait apparaître du tout dans la recherche.
178 alias pour le Liban, 1 876 pour Israël, 488 pour la Palestine, 175 pour la Jordanie, 554 pour
l'Égypte, 297 pour la Libye — langues de recherche : les dix déjà utilisées ailleurs dans ce fichier
(fr/en/es/pt/nl/de/it/ar/ru/el/tr) plus l'hébreu ("he", langue de RECHERCHE seulement ici, jamais
langue d'INTERFACE puisqu'aucune minorité israélienne ne remplit par ailleurs le critère du projet —
même distinction "recherche vs interface" déjà appliquée au russe pour la Turquie/l'Ukraine avant que
la Biélorussie n'en fasse aussi une langue d'interface).

### Maghreb : amazighe standard marocain et kabyle (septembre 2026)

L'arabe, déjà couvert depuis la Syrie, est la langue officielle des quatre territoires de ce lot. Deux
langues amazighes s'y ajoutent, portant l'interface à **77 langues**.

**L'amazighe standard marocain (`zgh`, ⵜⴰⵎⴰⵣⵉⵖⵜ)** remplit le critère du projet sans la moindre
ambiguïté : il est **langue officielle de l'État** au Maroc depuis l'article 5 de la Constitution de
2011 ("l'amazigh est également une langue officielle de l'État, en tant que patrimoine commun de tous
les Marocains sans exception"), avec une loi organique d'application — la loi 26-16, promulguée par
le dahir du 12 septembre 2019 — qui en fixe les étapes de mise en œuvre. L'État a retenu une forme
standardisée unique élaborée par l'IRCAM par convergence du tachelhit, du tamazight du Moyen Atlas et
du tarifit ; son code ISO 639-3 `zgh` a été adopté le 21 novembre 2012. Il n'existe AUCUN code ISO
639-1 à deux lettres pour le berbère sous quelque forme que ce soit.

**Le tifinagh est la première écriture de ce projet qu'aucun système courant ne sait afficher.** C'est
la graphie officielle de l'amazighe au Maroc — néo-tifinagh IRCAM à 33 caractères, retenu en février
2003 par le conseil d'administration de l'IRCAM contre le latin et l'arabe, entériné par le roi le 10
février 2003 — mais presque aucun système d'exploitation ne fournit de police pour le bloc Unicode
U+2D30–U+2D7F : sans police embarquée, toute l'interface s'afficherait en carrés vides. D'où la
PREMIÈRE police web du projet : **Noto Sans Tifinagh** (licence SIL Open Font License 1.1, ~39 ko),
hébergée localement comme Leaflet et les drapeaux, jamais chargée depuis un service tiers. La règle
`@font-face` porte un `unicode-range` limité au bloc tifinagh, si bien que le navigateur ne télécharge
le fichier que s'il a réellement des caractères tifinagh à rendre ; elle se déclenche sur
`html[lang="zgh"]`, attribut désormais posé par `i18n.js` (`applyDirection`, qui ne posait jusqu'ici
que `dir`). Nuance sourcée et notée par honnêteté : la loi organique 26-16 ne mentionne PAS le
tifinagh — la graphie officielle repose sur la décision royale de 2003, pas sur la loi de 2019.

**Le kabyle (`kab`, Taqbaylit)** est le cas le plus délicat de ce lot, et il a fait l'objet d'un
arbitrage explicite de l'utilisateur. Le tamazight EST bien langue officielle en Algérie — nationale
depuis la révision constitutionnelle du 10 avril 2002, officielle depuis celle du 6 mars 2016,
aujourd'hui article 4 de la Constitution de 2020. Mais l'État le désigne de façon **générique**,
"dans toutes ses variétés linguistiques en usage sur le territoire national", sans en nommer aucune ;
aucune graphie n'a jamais été fixée par un texte officiel (latin, tifinagh et arabe coexistent, le
latin dominant dans l'enseignement) ; et il n'existe **aucun code ISO pour un "berbère standard
algérien"**. Écrire une interface impose pourtant de choisir une variété et une écriture. Le kabyle a
été retenu comme la variété la plus écrite du pays, en alphabet latin berbère usuel, et il est
étiqueté honnêtement comme une VARIÉTÉ et non comme le standard d'État — ce qu'aucune source ne
permettrait d'affirmer. Le choix est documenté ici précisément parce qu'il n'est pas déductible d'un
texte officiel, contrairement à tous les autres de ce projet.

**Langues explicitement écartées**, chacune pour une raison sourcée : le **hassanya** (cité à
l'article 5 de la Constitution marocaine, mais comme "composante de l'identité à préserver", pas comme
langue officielle — et la constitution de la RASD ne le cite pas davantage) ; l'**espagnol** au Sahara
occidental (largement utilisé dans les faits par l'administration de la RASD et les camps, mais absent
de sa constitution, qui ne déclare officielle que la langue arabe) ; le **tamazight en Tunisie**
(aucune mention dans les constitutions de 2014 ni de 2022, aucune loi) ; et le **français**, sans
statut officiel dans aucun des quatre.

**Drapeau** : les deux langues partagent le **drapeau amazigh** (trois bandes bleu/vert/jaune, yaz
rouge), absent de circle-flags — 645 drapeaux vérifiés, aucun berbère. Il a été repris depuis
Wikimedia Commons (`File:Berber flag.svg`, **domaine public**), recadré en cercle comme les autres,
et sa géométrie n'a pas été redessinée mais simplement mise à l'échelle pour respecter le tracé
d'origine. Partager un même drapeau entre deux langues suit le comportement déjà en place pour les
langues sans drapeau régional dédié.

**Alias** : script dédié `scripts/build-maghreb-aliases.js`, les quatre territoires ne passant pas par
le pipeline standard. Plutôt que de dupliquer leur logique de sélection — et de risquer qu'elle diverge
silencieusement —, il repart du fichier `communes-xx.txt` DÉJÀ GÉNÉRÉ et retrouve le geonameid de
chaque commune en la rapprochant du dump par nom + coordonnées arrondies : l'ensemble des alias
correspond donc, par construction, à ce qui est réellement publié. 339 alias pour le Maroc, 674 pour
l'Algérie, 281 pour la Tunisie, 60 pour le Sahara occidental. Langues de recherche : les formes
latines usuelles plus l'arabe, `zgh`, `kab` et `ber` — ce dernier étant le code COLLECTIF ISO
639-2/639-5 des langues berbères, sous lequel GeoNames range une partie des noms en tifinagh sans
préciser la variété, retenu pour la RECHERCHE uniquement et jamais comme langue d'interface (le projet
n'affiche pas de famille de langues). Utile surtout pour les noms corrigés vers leur forme locale :
sans alias, taper "Algiers", "Tangier" ou "Marrakesh" ne trouverait plus ces villes du tout.

### Afrique de l'Ouest : pourquoi aucune langue n'est ajoutée (septembre 2026)

C'est le seul lot du projet où des langues remplissent le critère juridique sans être ajoutées à
l'interface, et la raison mérite d'être écrite parce qu'elle est inhabituelle : **la plupart de ces
langues n'ont pas d'orthographe officielle à respecter.**

Ce que le statut juridique donne, pays par pays, après vérification des textes :
- **Mali** — l'article 31 de la Constitution du 22 juillet 2023 fait des **treize langues nationales
  les langues officielles** du pays, le français devenant simple « langue de travail ».
- **Burkina Faso** — la loi n° 045-2023/ALT du 30 décembre 2023 fait de même : les langues nationales
  officialisées par la loi sont les langues officielles, le français et l'anglais des langues de
  travail. Mais la loi d'officialisation langue par langue reste à prendre.
- **Guinée** — l'article 5 de la Constitution du 26 septembre 2025 dispose que « les langues
  nationales et le français sont les langues officielles ». **Aucun texte en vigueur ne dit
  lesquelles** : les « huit langues de Sékou Touré » relèvent de décisions administratives de 1965-68
  jamais retrouvées sous forme de texte numéroté.
- **Sénégal** — le français est officiel, et la Constitution nomme une catégorie de langues
  nationales codifiées (dix-sept aujourd'hui).
- **Mauritanie** — l'article 6 fait du poular, du soninké et du wolof des **langues nationales
  constitutionnelles**, avec des alphabets latins fixés par le décret 81-072 du 15 juillet 1981.
- **Gambie, Cap-Vert, Côte d'Ivoire, Ghana, Togo, Guinée-Bissau, Sierra Leone, Liberia** — aucune
  langue africaine n'y a de statut. Plus surprenant : **ni la Gambie, ni le Ghana, ni la Sierra
  Leone, ni le Liberia, ni la Guinée-Bissau ne désignent de langue officielle dans leur
  constitution**, pas même l'anglais ou le portugais, qui n'y sont officiels que de fait. Au Ghana
  les onze *government-sponsored languages* relèvent du Bureau of Ghana Languages et du programme
  scolaire, pas d'un texte. Au Togo, l'idée très répandue que l'éwé et le kabiyè seraient « langues
  nationales » par un texte est contredite : la seule trace est l'article 7 d'une ordonnance de 1975
  évoquant « les langues nationales et africaines » sans en nommer aucune. Le créole capverdien, lui,
  a un **alphabet officiel** (ALUPEC, décret-loi 8/2009) mais **pas** le statut de langue officielle —
  exactement l'inverse du tifinagh marocain.

Le blocage est ailleurs. Écrire une interface exige une norme orthographique, et **aucune n'a pu être
établie** : en Mauritanie le décret de 1981 fixe des alphabets mais aucun texte ne fixe les règles
d'orthographe ; en Guinée, l'ordonnance 019/PRG/SGG/89 renvoyait cette fixation à un arrêté du
Secrétariat d'État à la Recherche scientifique — **supprimé par décret sept jours avant la
promulgation de l'ordonnance**, et l'arrêté n'a jamais existé ; au Mali et au Burkina les lois
d'application ne sont pas prises. Rédiger 254 chaînes d'interface reviendrait à inventer une norme
que l'État lui-même n'a pas arrêtée — précisément ce que ce projet refuse. Ces langues sont donc
retenues comme langues de RECHERCHE (voir les alias ci-dessous), jamais comme langues d'interface.

**Alias** : script dédié `scripts/build-westafrica-aliases.js`, même méthode que pour le Maghreb —
il repart du fichier de communes déjà publié et retrouve le geonameid par nom et coordonnées, si bien
que les alias correspondent par construction à ce qui est réellement servi. 5 200 alias au total, du
Mali (1 426) et du Ghana (1 308) jusqu'à la Guinée-Bissau (5). Langues de recherche : les quatre
langues officielles du lot (français, anglais, portugais, arabe) et les grandes langues régionales
sous lesquelles GeoNames range des noms de lieux — wolof, peul, bambara, soninké, songhay, tamasheq,
mooré, haoussa, éwé, twi, mandingue, dioula, krio, hassanya.

### Sahel et Corne de l'Afrique : six langues ajoutées (septembre 2026)

Contrairement au lot ouest-africain, ici le critère du projet — **statut juridique réel ET
orthographe officielle utilisable** — est rempli par six langues, ajoutées à l'interface avec toutes
leurs chaînes (83 langues au total) :
- **Haoussa** (`ha`, drapeau du **Niger**) — langue nationale du Niger (charte de la refondation du 26
  mars 2025, art. 12), orthographe fixée par l'arrêté n° 0212/MEN/SP-CNRE d'octobre 1999.
- **Sango** (`sg`, drapeau de la **Centrafrique**) — langue co-officielle avec le français
  (Constitution du 30 août 2023, art. 1), orthographe officielle du décret 84-025 rectifié par le
  décret 85-004.
- **Somali** (`so`, drapeau de la **Somalie**) — langue officielle (Constitution provisoire de 2012,
  art. 5), alphabet latin officiel depuis le 21 octobre 1972.
- **Amharique** (`am`, drapeau de l'**Éthiopie**) — langue de travail fédérale (Constitution de 1995,
  art. 5), écriture guèze.
- **Oromo** (`om`, drapeau RÉGIONAL de l'**Oromia**) — langue de travail de l'État régional d'Oromia,
  alphabet latin *Qubee* adopté en 1991. L'annonce de 2020 d'en faire une langue de travail fédérale
  n'a pas été suivie d'effet juridique : le statut retenu est le statut régional, d'où le drapeau.
- **Tigrinya** (`ti`, drapeau RÉGIONAL du **Tigré**) — langue de travail de l'État régional du Tigré,
  écriture guèze. Langue nationale de fait en Érythrée, mais l'Érythrée n'a aucune langue officielle
  constitutionnelle : le statut juridique vient d'Éthiopie.

**Deuxième police embarquée : Noto Sans Ethiopic** (SIL OFL 1.1, ~377 ko), pour l'écriture guèze de
l'amharique et du tigrinya — Windows, Android et la plupart des Linux ne fournissent aucune police
couvrant ce bloc par défaut. Même dispositif que pour le tifinagh : hébergée localement,
`unicode-range` limité aux blocs éthiopiens (U+1200–139F, U+2D80–2DDF, U+AB00–AB2F), activée par
`html[lang="am"]` et `html[lang="ti"]`.

**Écartées, avec leur raison :**
- **Yoruba, igbo** (Nigeria) — la Constitution de 1999 (s. 55) ne les cite que comme langues possibles
  des débats de l'Assemblée nationale « quand les dispositions nécessaires auront été prises » ;
  aucun texte n'en fixe l'orthographe. Le haoussa du Nigeria est couvert par l'entrée nigérienne.
- **Zarma, peul, kanouri, tamasheq** (Niger) — une orthographe officielle existe (même arrêté de 1999),
  mais la charte de 2025 ne leur laisse que le rang de « langues parlées » ; seul le haoussa est
  nommé langue nationale.
- **Afar** (Éthiopie, Djibouti, Érythrée) — langue de travail de l'État régional Afar, mais aucune
  orthographe officielle retrouvée sous forme de texte.
- **Djibouti** — la Constitution cite des langues nationales sans les nommer ; **Érythrée** — aucune
  langue officielle ; **Bénin, Tchad, Soudan, Soudan du Sud** — seuls le français, l'arabe ou l'anglais
  (déjà présents) ont un statut officiel.

**Alias** : `scripts/build-sahel-corne-aliases.js`, même méthode que les deux lots précédents —
2 344 alias, du Nigeria (785) au Niger (31). Langues de recherche : français, anglais, arabe et les
langues sous lesquelles GeoNames range des noms de lieux du lot (amharique, tigrinya, oromo, somali,
afar, haoussa, yoruba, igbo, kanouri, peul, sango, zarma, guèze). On peut ainsi taper « አዲስ አበባ » pour
trouver Addis-Abeba.

**Bug corrigé au passage, commun aux trois scripts d'alias africains** (Maghreb, Afrique de l'Ouest,
ce lot). Le rapprochement commune-dump se faisait sur des coordonnées arrondies à 2 décimales — mais
les deux côtés n'arrondissaient pas la même valeur : 9,0250 (déjà arrondi à 4 décimales dans le
fichier publié) donne 9,03, alors que 9,02497 (valeur brute du dump) donne 9,02. Addis-Abeba perdait
ainsi ses 68 noms alternatifs, sans aucune erreur. Pire, dans l'autre sens, l'arrondi à 2 décimales
confondait parfois deux lieux voisins de noms différents (au Liberia, « Wari Village Number One »
renvoyait vers « Wari Village Number Two »). La clé utilise désormais 4 décimales, la précision
exacte du fichier publié : **79 alias retrouvés et 4 fausses correspondances supprimées** sur les
trois lots, les comptes ci-dessus étant à jour.

### Afrique orientale et australe, océan Indien : quinze langues ajoutées (septembre 2026)

Quinze langues remplissent le critère **statut juridique réel ET orthographe officielle** (98 langues
au total) :
- **Kiswahili** (`sw`, drapeau de la **Tanzanie**) — officiel ou national au Kenya (Constitution de
  2010, art. 7), en Ouganda (art. 6), au Rwanda (loi organique 02/2017), en RDC (art. 1) et en Tanzanie ;
  mais seule la Tanzanie a une autorité d'orthographe créée par la loi (BAKITA, loi n° 27 de 1967) et
  en a fait la langue des lois et des tribunaux (loi n° 1 de 2021). Le conseil kényan (BAKIKE) n'existe
  toujours pas juridiquement, le projet ougandais a été retiré en octobre 2024.
- **Ikinyarwanda** (`rw`, **Rwanda**) — Constitution, art. 8 ; orthographe fixée par les Instructions
  du Ministre n° 001/2014 du 8 octobre 2014 (JO n° 41 bis).
- **Malagasy** (`mg`, **Madagascar**) — Constitution du 11 décembre 2010, art. 4 ; norme de l'Akademia
  Malagasy.
- **Kreol Seselwa** (`crs`, **Seychelles**) — langue nationale (Constitution de 1993, art. 4) ;
  orthographe gouvernementale de 1981, gérée par Lenstiti Kreol (Creole Institute of Seychelles Act 2014).
- **Les dix langues officielles sud-africaines autres que l'anglais** (drapeau de l'**Afrique du Sud**) :
  afrikaans (`af`), isiZulu (`zu`), isiXhosa (`xh`), Sepedi (`nso`), Sesotho (`st`), Setswana
  (`tn`), isiNdebele du Sud (`nr`), Tshivenḓa (`ve`), Xitsonga (`ts`) — Constitution, s. 6 ; règles
  d'orthographe du PanSALB, rendues contraignantes pour l'État par la Board Notice 464 de 2023
  (Government Gazette n° 49028) ; pour l'afrikaans, l'AWS 2017 de la Taalkommissie. Deux choix
  explicites : le **sesotho** suit l'orthographe SUD-AFRICAINE (« dumela », « setjhaba »), celle du
  Lesotho — d'origine missionnaire — n'étant fixée par aucun texte ; le **setswana** porte le drapeau
  sud-africain, le Botswana ne lui donnant aucun statut constitutionnel.
- **siSwati** (`ss`, drapeau d'**Eswatini**) — langue officielle d'Eswatini (Constitution de 2005,
  s. 3) et d'Afrique du Sud, à l'orthographe identique (règles PanSALB de 2024).
- **chiShona** (`sn`, **Zimbabwe**) — langue officielle (Constitution de 2013, s. 6) ; orthographe
  standard de 1967 approuvée par le gouvernement.

**Écartées, avec leur raison :**
- **Kirundi** — statut réel (Constitution de 2018, loi n° 1/31 de 2014) et Académie rundi restructurée
  en 2021, mais aucune norme orthographique publiée n'a été trouvée.
- **Lingala, kikongo, tshiluba** (RDC) et **lingala, kituba** (Congo) — nommés par les constitutions,
  mais la seule orthographe est celle d'un séminaire de linguistes (Lubumbashi, 1974), jamais officialisée.
- **Ndébélé du Nord** (Zimbabwe) — règles de 1970 connues par une seule source secondaire.
- **Chichewa** (Malawi : statut seulement politique), **langues de Zambie, du Mozambique, de Namibie,
  d'Angola, du Gabon et de Guinée équatoriale** (constitutions qui ne les nomment pas — la loi
  angolaise sur les langues de 2025 n'est pas adoptée), **créoles de São Tomé** (alphabet officiel
  ALUSTP de 2013, mais aucun statut).
- **Comorien** — langue officielle (Constitution de 2018) mais orthographe de 2009 introuvable, et
  quatre variétés sans code commun.
- **Créole mauricien** — orthographe officielle de 2011, mais aucun statut : la Constitution (s. 49)
  ne connaît que l'anglais et le français, un comité parlementaire examine la question en septembre 2026.
- **Créole réunionnais, shimaore, kibushi** — aucun n'est nommé par un texte de droit français ;
  l'alphabet mahorais adopté par le Conseil départemental en 2020 ne suffit pas au critère juridique.

**Traductions** : produites sans relecture par des locuteurs natifs. Plusieurs termes sans équivalent
établi (vignette, yourte, péage à flux libre) sont rendus par périphrase ; une relecture native reste
souhaitable, en particulier pour l'isiNdebele, le siSwati et le Tshivenḓa.

**Alias** : `scripts/build-afrique-australe-aliases.js`, 1 771 alias (Kenya 246, Afrique du Sud 190,
Madagascar 172…), dans les langues ci-dessus et les langues régionales sous lesquelles GeoNames range
des noms de lieux (luganda, lingala, kikongo, chichewa, kikuyu, tumbuka, ndébélé du Nord…).

### Cameroun, Sainte-Hélène, îles Éparses : aucune langue ajoutée (septembre 2026)

- **Cameroun** — la Constitution (art. 1er) et la loi n° 2019/019 ne nomment que le français et l'anglais,
  déjà présents. Les « langues nationales » sont protégées sans être désignées (Constitution, loi
  d'orientation de l'éducation de 1998, Code des collectivités de 2019, dont le statut spécial du
  Nord-Ouest et du Sud-Ouest ne nomme aucune langue). L'Alphabet général des langues camerounaises (1979)
  est une norme universitaire, adoptée par aucun texte. Fulfulde, ewondo, duala, basaa, pidgin camerounais
  et camfranglais : écartés.
- **Sainte-Hélène, Ascension, Tristan da Cunha** — anglais seulement ; les parlers locaux n'ont ni statut
  ni orthographe.
- **Îles Éparses** — aucune population.

### Russie : sept langues d'État ajoutées (septembre 2026)

Le russe était déjà présent. Parmi les langues d'État des républiques de la Fédération, sept ont à la
fois un statut constitutionnel ET un acte officiel identifié fixant leur orthographe (105 langues au
total), chacune avec le drapeau de sa république :
- **Tatar** (`tt`, **Tatarstan**) — loi n° 1-ЗРТ du 12 janvier 2013 (alphabet cyrillique, normes
  approuvées par le Cabinet des ministres, décret n° 833 du 1er novembre 2014).
- **Bachkir** (`ba`, **Bachkortostan**) — orthographe fixée en 1981 par le Présidium du Soviet suprême de
  la RSSA bachkire, jamais remplacée ; **retenu avec réserve**, l'acte n'ayant pu être lu.
- **Iakoute** (`sah`, **Sakha**) — règles d'orthographe et de ponctuation, décret du gouvernement
  n° 501 du 22 décembre 2015.
- **Tchétchène** (`ce`, **Tchétchénie**) — Свод основных орфографических правил, указ n° 83 du 29 avril
  2020 ; palotchka (Ӏ) vérifiée dans toutes les chaînes.
- **Erzya** (`myv`) et **moksha** (`mdf`), drapeau de la **Mordovie** — normes du mordve littéraire,
  décret n° 422 du 1er novembre 2010.
- **Oudmourte** (`udm`, **Oudmourtie**) — règles approuvées par le gouvernement en mai 2025 (numéro de
  l'acte non retrouvé).

Les drapeaux de Sakha et de Mordovie, absents de circle-flags, sont recadrés en cercle depuis Wikimedia
Commons (domaine public), sans modifier leur tracé.

**Écartées, avec leur raison** (deux recherches successives, plusieurs portails juridiques russes
injoignables) :
- **Orthographe officielle non établie** : tchouvache (acte de 1994 connu seulement par résumé), ossète
  iron et digor, kabarde-tcherkesse, karatchaï-balkar, ingouche, abaza, nogaï, kalmouk (réforme de 2000
  rejetée), bouriate (procédure confiée au gouvernement, décret introuvable), touvain, khakasse, altaï,
  mari des prairies et des montagnes, komi (oukase de 1938 cité mais non lu), langues du Nord en Iakoutie.
- **Aucun statut** : langues du Daghestan (la Constitution de 2003 ne les nomme pas), carélien et vepse
  (le russe est la seule langue d'État de Carélie), komi-permiak, yiddish, nénètse.

**Traductions** sans relecture native ; plusieurs termes techniques sont des emprunts au russe, comme
dans l'usage courant de ces langues. Aucune langue n'est ajoutée pour le Svalbard (norvégien déjà présent).

### Péninsule Arabique, Irak et Iran : persan et kurde sorani (septembre 2026)

L'arabe, seule langue officielle des sept pays arabes du lot, était déjà présent. Deux langues ajoutées
(107 au total), toutes deux **écrites de droite à gauche** (`RTL_LANGS`) :
- **Persan** (`fa`, drapeau de l'**Iran**) — langue et écriture officielles (Constitution de 1979, art. 15) ;
  orthographe « دستور خط فارسی » adoptée par l'Académie de la langue et de la littérature persanes (2001,
  nouvelle édition 2023). Traduction vérifiée : ی et ک persans, demi-espaces (ZWNJ) là où l'orthographe les exige.
- **Kurde sorani** (`ckb`, drapeau de la **Région du Kurdistan**) — langue officielle de l'Irak avec l'arabe
  (Constitution de 2005, art. 4 ; loi n° 7 de 2014) ; orthographe kurde unifiée approuvée à Erbil en 2001 et
  appliquée par l'Académie kurde. **Retenu avec réserve** : aucun acte rendant cette orthographe obligatoire
  n'a été trouvé. Le kurde kurmandji en alphabet latin (`ku`) reste une langue distincte.

**Écartées** : turkmène irakien (statut local, mais écrit en turc standard sans orthographe officielle ni
code ISO propre), syriaque/soureth (statut local sans norme orthographique publique), arménien (droit à
l'enseignement seulement), langues régionales d'Iran (autorisées sans être nommées par l'art. 15), mehri,
soqotri et shehri (ni statut ni orthographe), baloutchi et swahili à Oman (aucun statut). Traductions sans
relecture native.

### Asie : trente-trois langues ajoutées (septembre 2026)

**140 langues au total.** Même double critère : statut légal nommant la langue ET orthographe fixée par un texte ou une
autorité publique. Drapeau de l'État ou de la région dont le texte fonde le statut (détail dans `LANG_FLAGS`) :
- **Asie centrale et Mongolie** : kazakh (`kk`, cyrillique), kirghize (`ky`), tadjik (`tg`), ouzbek latin (`uz`,
  alphabet de 1995), turkmène (`tk`), **karakalpak** (`kaa`, République du Karakalpakstan, alphabet latin de 2016 —
  avec réserve ; drapeau recadré depuis Wikimedia Commons, domaine public), mongol cyrillique (`mn`).
- **Asie de l'Est** : chinois simplifié (`zh`, loi sur la langue commune de 2000), **chinois traditionnel**
  (`zh-Hant`, drapeau de Taïwan, formes standard du ministère de l'Éducation ; choisi automatiquement pour un
  navigateur réglé sur zh-TW, zh-HK ou zh-MO), hakka de Taïwan (`hak`, loi sur les langues nationales de 2019),
  zhuang (`za`, Guangxi, orthographe de 1982, drapeau chinois), coréen (`ko`), japonais (`ja`).
- **Asie du Sud** : hindi (`hi`), marathi (`mr`), tamoul (`ta`), malayalam (`ml`), népalais (`ne`), bengali (`bn`,
  Bangladesh), ourdou (`ur`, Pakistan) et divehi (`dv`, Maldives) — **tous deux écrits de droite à gauche** —,
  cinghalais (`si`, avec réserve), dzongkha (`dz`).
- **Asie du Sud-Est** : birman (`my`), thaï (`th`), lao (`lo`) et khmer (`km`) — ces trois derniers avec réserve,
  l'autorité de l'orthographe n'ayant pas été retrouvée dans un texte —, vietnamien (`vi`), tétoum (`tet`),
  indonésien (`id`, EYD V 2022), malais (`ms`), javanais (`jv`, langue officielle régionale de Yogyakarta, Perda
  DIY 2/2021 ; drapeau indonésien faute de drapeau régional vérifié), filipino (`fil`, Ortograpiyang Pambansa 2013).

**Polices embarquées** : Noto Serif Tibetan (~610 ko, dzongkha) et Noto Sans Thaana (~27 ko, divehi), SIL OFL 1.1,
chargées seulement si la page contient ces écritures. Les autres écritures sont fournies par les systèmes courants.
L'ourdou s'affiche en naskh avec les polices système (le nastaliq demanderait une police de plusieurs centaines de ko).

**Écartées** :
- **Yi (nuosu)** : statut (préfecture de Liangshan) et syllabaire standard de 1980 réels, mais la traduction produite
  n'était pas fiable (surtout des emprunts chinois transcrits) — écarté alors, ajouté depuis en traduction tentée (voir
  « Traductions tentées : onze langues »).
- **Langues indiennes à l'orthographe non établie par un texte** (vérification ciblée) : kannada, odia, sindhi,
  assamais (non) ; télougou, pendjabi, gujarati, konkani, manipuri (incertain) ; sanskrit, maïthili, bodo, dogri,
  santali, cachemiri (pas d'autorité orthographique).
- Pachto et dari (Afghanistan : aucune autorité publique en fonction), tibétain et ouïghour (orthographe non
  vérifiée), mongol en écriture traditionnelle (verticale), minnan de Taïwan (Tâi-lô publié mais langue non nommée
  par la loi), min de l'Est, aïnou, langues aborigènes de Taïwan (non nommées individuellement), langues régionales
  indonésiennes autres que le javanais (soundanais, balinais, acehnais : textes non vérifiés), langues régionales
  philippines, langues ethniques du Myanmar, malais en jawi (Brunei), malais des Cocos.

Traductions sans relecture native ; les moins sûres, signalées par leurs traducteurs : karakalpak, hakka, dzongkha,
divehi, zhuang.

### Océanie : māori, samoan et tahitien (septembre 2026)

**143 langues au total.** Même double critère (statut légal ET orthographe fixée par un texte ou une autorité publique) :
- **Māori** (`mi`, drapeau de la **Nouvelle-Zélande**) — Te Ture mō Te Reo Māori 2016, s. 5 (langue officielle depuis
  1987) ; conventions orthographiques de Te Taura Whiri i te Reo Māori (2012 : macrons, pas de voyelles doublées).
- **Samoan** (`sm`, drapeau de **Samoa**) — Samoan Language Commission Act 2014, s. 5. **Avec réserve** : aucun acte ne
  fixe l'orthographe (diacritiques réintroduits par le ministère de l'Éducation en 2012).
- **Tahitien** (`ty`, drapeau de la **Polynésie française**) — loi organique 2004-192, art. 57 (langue reconnue, le
  français restant seul officiel) ; Académie tahitienne – Fare Vānaʻa. Traduction jugée fiable à 55-65 % par son auteur :
  **relecture native conseillée**.

**Retenues mais d'abord NON ajoutées, faute de traduction utilisable** (ajoutées depuis en traduction tentée, voir
« Traductions tentées : onze langues ») : chamorro (`ch`, Guam et Mariannes du Nord — statut et orthographe réels, traduction estimée à ~50 %),
paluan (`pau`, Palaos, ~15 %), marquisien (`mrq`, Polynésie française, ~20 %), marshallais (`mh`, orthographe fixée par
la loi P.L. 2010-45, statut indirect, ~20 %). À reprendre avec un traducteur humain.

**Écartées** : niuéen, carolinien, fidjien, paumotu et norfuk (statut ou orthographe non vérifiables dans un texte) ;
langues aborigènes et du détroit de Torres, tok pisin, hiri motu, pijin, tongien, tuvaluan, gilbertin, nauruan,
tokelauan, pitkern, langues de Yap, langues kanak (reconnues collectivement), wallisien et futunien (aucun texte ne
leur donne de statut) ; bichelamar, chuuk, pohnpei, kosrae, maori des îles Cook, mangarévien et hindi fidjien (statut
sans orthographe fixée). Le drapeau Tino Rangatiratanga (`maori.svg` de circle-flags) n'est pas un drapeau d'État :
non utilisé.

### Amériques : sept langues ajoutées (septembre 2026)

**150 langues au total.** Même double critère (statut légal ET orthographe fixée par un texte ou une autorité publique),
et même exigence de traduction utilisable (seuil de fiabilité ~55 % estimé par le traducteur, comme pour le yi) :
- **Hawaïen** (`haw`, drapeau d'**Hawaï**) — Constitution d'Hawaï, art. XV §4 ; ʻokina et kahakō (loi HRS §1-13.5). ~60 %.
- **Créole haïtien** (`ht`, **Haïti**) — Constitution de 1987, art. 5 ; orthographe officielle (décret du 31 janvier 1980),
  Akademi Kreyòl Ayisyen. ~75 %.
- **Papiamento d'Aruba** (`pap-AW`, **Aruba**) — AB 2003 n° 38 ; orthographe étymologique (AB 2018 n° 68). ~58 %.
- **Papiamentu de Curaçao** (`pap-CW`, **Curaçao**) — P.B. 2007 n° 39 ; orthographe phonologique de la Fundashon pa
  Planifikashon di Idioma (2008), aussi en usage à Bonaire. ~65 %. Les deux orthographes étant officiellement différentes,
  ce sont deux langues d'interface ; un navigateur réglé sur « pap » reçoit celle de Curaçao, « pap-AW » celle d'Aruba.
- **Quechua du Sud** (`qu`, **Pérou**) — Constitution art. 48, loi 29735 ; alphabet officiel RM 1218-85-ED (1985), commun
  avec la Bolivie (DS 20227, 1984). ~60 %.
- **Kichwa d'Équateur** (`qu-EC`, **Équateur**) — Constitution de 2008, art. 2 ; alphabet unifié (Acuerdo Ministerial 244,
  2004). ~55 %.
- **Guarani** (`gn`, **Paraguay**) — Constitution de 1992, art. 140 ; Academia de la Lengua Guaraní (loi 4251/2010),
  alphabet 2015 et règles d'orthographe 2016. ~60 %.

Toutes les traductions sont à faire relire par des locuteurs natifs.

**Retenues selon le critère mais d'abord NON ajoutées, faute de traduction utilisable** (les six premières ajoutées depuis en
traduction tentée, voir « Traductions tentées : onze langues ») : groenlandais (~35-40 %), maya yucatèque
(~45 %), aymara (~45 %), k'iche', kaqchikel et q'eqchi' (20-40 %) ; et, sans tentative de traduction, les 16 autres langues
du Mexique dotées d'une norme d'écriture de l'INALI (tseltal, tsotsil, ch'ol, otomí…), les 18 autres langues mayas du
Guatemala (alphabets de l'ALMG, 1987), 9 langues du Venezuela (Ley de Idiomas Indígenas 2008 ; Resolución 83 de 1982) et
les langues amazoniennes du Pérou (alphabets officialisés en 2015). À reprendre avec des traducteurs humains.

**Avec réserve ou écartées** : inuktitut et inuinnaqtun (Nunavut : orthographe fixée par un organisme non public),
langues des Territoires du Nord-Ouest, de l'Alaska, navajo, cherokee, mi'kmaw (orthographe sans acte), langues de Panama
(simplement « reconnues »), shuar et rapa nui (alphabet non prouvé par un acte), langues de Bolivie autres que quechua et
aymara (alphabets non vérifiés un par un) ; lakota, langues du Nicaragua, sranan tongo, créole de San Andrés, nheengatu
et langues co-officielles municipales du Brésil, langues du Chaco argentin, mapudungun (statut ou orthographe manquant) ;
kriol bélizien, patwa jamaïcain, kwéyòl de Dominique et de Sainte-Lucie (aucun statut).

### Traductions tentées : onze langues (septembre 2026)

Onze langues remplissaient le double critère (statut légal ET orthographe fixée par un texte ou une autorité publique) mais
avaient été laissées sans interface parce que leur traducteur estimait sa fiabilité sous ~55 %. À la demande de l'utilisateur,
elles sont désormais **ajoutées quand même**, l'avertissement du pied de page (« l'interface a été traduite dans de nombreuses
langues et peut contenir des erreurs ») couvrant ce risque. **161 langues au total.** Fiabilité estimée par le traducteur,
à faire relire par des locuteurs natifs en priorité :

| Langue | Code | Drapeau | Statut et orthographe | Fiabilité |
|---|---|---|---|---|
| Yi (nuosu) | `ii` | Chine | préfecture autonome de Liangshan ; syllabaire standard de 1980 | faible (~30 %) |
| Chamorro | `ch` | Guam | loi de Guam ; Kumisión i Fino' CHamoru | ~50 % |
| Paluan | `pau` | Palaos | Constitution, art. XIII ; Palau Orthography Committee (1972) | ~30-35 % |
| Marshallais | `mh` | Îles Marshall | P.L. 2010-45 ; nouvelle orthographe (1976) | ~40 % |
| Marquisien (Nord) | `mrq` | Polynésie française | Académie marquisienne (Tuhuna ʻEo ʻEnana) | ~35 % |
| Groenlandais | `kl` | Groenland | loi d'autonomie 2009, §20 ; Oqaasileriffik (1973) | ~55 % |
| Aymara | `ay` | Bolivie | Constitution 2009, art. 5 ; alphabet unifié (DS 20227, 1984) | ~50 % |
| Maya yucatèque | `yua` | Mexique | loi générale des droits linguistiques (2003) ; norme INALI (2014) | ~45 % |
| K'iche' | `quc` | Guatemala | décret 19-2003 ; alphabet ALMG (AG 1046-87) | ~50 % |
| Kaqchikel | `cak` | Guatemala | idem | ~45 % |
| Q'eqchi' | `kek` | Guatemala | idem | ~40 % |

**Choix communs** : emprunts adaptés là où la langue n'a pas de terme courant (espagnol pour l'aymara et les langues mayas,
japonais ou anglais pour le paluan, anglais pour le marshallais) ; apostrophe droite pour la glottalisation de l'aymara, comme
pour le quechua déjà en ligne ; k'iche' écrit avec cinq voyelles, kaqchikel avec ä ë ï ö ü (normes ALMG en usage). Drapeau
national pour le maya yucatèque (le drapeau dit « de la République du Yucatán » n'a pas de statut officiel) et chinois pour le
yi (la préfecture de Liangshan n'a pas de drapeau). **Police** : le syllabaire yi est absent de macOS et d'iOS — Noto Sans Yi
(~180 ko, SIL OFL 1.1) est hébergée localement et téléchargée seulement pour cette écriture (`unicode-range`).

Restent sans tentative : les autres langues du Mexique dotées d'une norme INALI, les autres langues mayas du Guatemala, les
langues du Venezuela et les langues amazoniennes du Pérou (ressources trop rares pour une interface même approximative).

### Dates dans la langue choisie et liste des langues triée (septembre 2026)

**Dates** : l'horloge et les dates des étapes passaient par une table de 15 langues ; les 146 autres affichaient leurs dates
en français. `I18N.localeTag()` (i18n.js) construit désormais l'étiquette depuis le code de langue et la région de son drapeau
(`kl` + Groenland → `kl-GL`) et vérifie que le navigateur possède ces données (`Intl.DateTimeFormat.supportedLocalesOf`).
Sinon, repli sur la **langue de contact officielle du territoire** (`LOCALE_FALLBACK` : espagnol du Guatemala pour le k'iche',
danois du Groenland pour le groenlandais, russe pour les langues des républiques de Russie, allemand pour le bas-allemand…) ;
le français n'est plus qu'un dernier recours. Les navigateurs n'embarquent pas tous les mêmes données (une vue web intégrée n'a
ni le basque ni l'islandais, que Chrome et Firefox ont) : les langues nationales ont donc aussi une langue de repli. L'horloge
est aussi recalculée à chaque changement de langue (elle revenait à « — à remplir — » jusqu'au rechargement).

**Liste des langues** : triée par ordre alphabétique des noms affichés (collation Unicode multilingue, sans tenir compte de la
casse, des accents ni de la ponctuation ; ʻokina et apostrophes ignorés, « ʻŌlelo Hawaiʻi » se range à O), les écritures non
latines après l'alphabet latin, et **la langue active toujours en tête**, y compris dans une recherche.

## Démarrer en local

```bash
npm install
npm start
```

Puis ouvrez `http://localhost:3000`. Le port peut être changé via la variable d'environnement `PORT`.

**Versions des dépendances** (relevé du 18/09/2026, 7e audit — à revérifier à chaque mise à jour) :

- **Express 4** (`^4.19.2`) : la branche 4 ne reçoit plus que des correctifs de sécurité depuis la sortie d'Express 5
  (septembre 2024) ; elle reste maintenue, mais le passage à Express 5 est à prévoir. Points d'attention pour cette
  migration : la gestion des erreurs asynchrones (Express 5 les transmet automatiquement au gestionnaire d'erreurs),
  la syntaxe des routes (`path-to-regexp` v6 : plus de `*` nu) et `req.query` en lecture seule. Le serveur n'utilise
  aucune API retirée en 5 hors ces points.
- **Leaflet 1.9.4** (hébergé localement, `public/vendor/leaflet/`) : version figée volontairement, aucune mise à jour
  automatique n'est possible puisque le fichier est servi depuis le dépôt. À comparer aux versions publiées sur
  [leafletjs.com](https://leafletjs.com) lors des audits, en même temps que les autres dépendances.

**Mémoire** : avec ~4 millions de lieux (lot Asie), le serveur occupe ~3 Go une fois chargé (~1,8 Go quand l'index de
recherche sur disque est utilisé, voir plus bas) ; `npm start` passe `--max-old-space-size=8192` à Node. Prévoir au
moins 4 Go de mémoire libre. Un lancement direct (`node server.js`, Passenger) n'applique PAS cette option : voir
`NODE_OPTIONS` dans "Déployer sur un serveur privé".

## Déployer sur un serveur privé

N'importe quelle méthode standard de déploiement Node.js convient, par exemple :

**Avec PM2** (garde le process vivant, redémarre au reboot) :
```bash
npm install -g pm2
pm2 start server.js --name cap-sur-linconnu --node-args="--max-old-space-size=8192"
pm2 save
pm2 startup
```

**Avec un reverse proxy** (nginx ou Caddy) devant Express, pour le HTTPS et le nom de domaine — le
serveur Express écoute sur le port `3000` (ou le `PORT` choisi) de **toutes** les interfaces (`app.listen(PORT)`
sans adresse) : fermer ce port au pare-feu pour que seul le proxy l'atteigne. Sous Passenger, c'est Passenger qui
fournit la socket d'écoute.

Un simple serveur de fichiers statiques (nginx seul, Caddy seul, etc.) pointé sur `public/` ne suffit **pas** : la
recherche de ville, le tirage, les photos, les activités, les randonnées et l'export PDF passent tous par les routes
`/api/` de `server.js`, et le navigateur ne lit plus aucune donnée de `public/data/`.

**Sur hébergement mutualisé avec Apache/cPanel** (ex. o2switch, "Setup Node.js App" via Passenger) — **attention :
depuis le lot Asie, le process a besoin d'~3 Go de mémoire ; vérifier la limite de l'offre avant de déployer** :
Apache expose alors généralement la racine du projet, pas seulement `public/` — `server.js`,
`package.json` et `package-lock.json` deviennent consultables publiquement en clair si rien ne les
bloque explicitement (vérifiable avec `curl -I https://votre-domaine/server.js` : un `200` confirme
le problème). Voir `.htaccess-security-block.txt` à la racine du dépôt pour un bloc de règles à
ajouter — **pas à copier en écrasant** — au `.htaccess` généré par cPanel (qui contient les
directives Passenger nécessaires au fonctionnement de l'app). Depuis l'audit du 17/09/2026, ce bloc
couvre aussi `lib/`, `scripts/`, `cache/` (index de recherche), `tmp/`, `public/` et `data/`, tous
constatés téléchargeables en production : le navigateur n'utilise aucune de ces URL (pages et scripts
servis par Node à la racine du site, données lues sur le disque par le serveur).

**Sécurité côté Node (audit du 17/09/2026)** : en-têtes HTTP (CSP stricte — le script inline de thème
est autorisé par son empreinte SHA-256, à recalculer s'il change —, HSTS, `nosniff`, `frame-ancestors
'none'`), `X-Powered-By` retiré ; limitation de débit par IP et par minute (tirages 20, export PDF 10,
recherche 60, photos 400, activités et randonnées 120, autres API 120, gros fichiers statiques 30 ; réponse 429 —
valeurs relues sur `server.js` au 7e audit, la recherche y était annoncée à 180) ; `/data/` en 404
(les bundles de 226 Mo n'y sont plus servis) ; caches en mémoire bornés à 5 000 entrées ; distances
reçues plafonnées à 3 000 km ; noms venus d'OpenStreetMap/Wikipédia échappés avant insertion HTML et
liens limités à http(s) ; erreurs internes non renvoyées au client ; `/api/status` sans version de Node
ni mémoire. Second audit (même jour) : quotas appliqués sur le chemin normalisé (casse, barres multiples) ;
blocage de `/data/` sur le chemin décodé (`/%64ata/…`) ; paramètres de requête réduits à des chaînes ;
gestionnaire d'erreurs final en JSON ; avertissements du PDF dédoublonnés ; délais sur les appels Wikipédia ;
verrou de construction de l'index orphelin ignoré ; échecs réseau non mémorisés côté navigateur.

**Mémoire sous Passenger (o2switch, « Setup Node.js App »)** : Passenger lance `server.js` directement, sans
`npm start` — l'option `--max-old-space-size=8192` de `package.json` n'est donc pas appliquée et Node garde son
plafond de tas par défaut. Dans « Setup Node.js App », ajouter la variable d'environnement **`NODE_OPTIONS`** avec la
valeur **`--max-old-space-size=4096`**, enregistrer, puis **"Restart"**. Pourquoi : le moteur occupe ~1,8 Go quand
l'index de recherche sur disque est utilisé, ~3 Go sans lui (alias chargés en mémoire, voir "Index de recherche
précalculé sur disque") ; sans marge suffisante, le chargement s'arrête sur « JavaScript heap out of memory » et les
tirages restent indisponibles. Le processus enfant qui construit l'index garde sa propre limite
(`--max-old-space-size=1024` sur sa ligne de commande, prioritaire sur `NODE_OPTIONS`). La limite de mémoire de l'offre
d'hébergement doit rester au-dessus de ces valeurs.

Après un `git pull` sur ce type d'hébergement, cliquer sur **"Run NPM Install"** dans l'interface
cPanel (pas un simple `npm install` en SSH — l'environnement Node de Passenger est isolé de celui
du système), puis **"Restart"** — un `git pull` seul ou un redémarrage seul ne suffisent pas,
Passenger continue de servir l'ancien code tant que ce bouton n'a pas été cliqué. "Run NPM Install"
lance aussi le `postinstall` de `package.json` : bundles texte `public/data/*-bundle.txt`
(`scripts/build-data-bundles.js`, quelques secondes) puis index de recherche (`scripts/build-search-index.js`,
~95 s en local). Ces deux étapes sont non bloquantes et, constaté sur testroad.lume419.fr, peuvent ne pas
s'exécuter ou échouer sur l'hébergement mutualisé (voir "Serveur autonome" plus bas) : le serveur s'en passe — il
concatène lui-même les fichiers de données et construit l'index dans un processus enfant au premier démarrage. Aucune
étape manuelle supplémentaire après un ajout de pays ; seul le premier démarrage qui suit peut être long (plusieurs
minutes).

### Dépannage de l'hébergement

`GET /api/status` donne l'état à distance : index de recherche (`searchIndex`), dernière construction (`build`),
moteur (`engine`), recherche et tirages disponibles (`searchReady`, `tripsReady`), bornes chargées (`chargers`) ; le
détail des erreurs est dans le journal du serveur seulement.

| Symptôme ou fichier absent | Produit par | Effet et remède |
|---|---|---|
| `public/data/*-bundle.txt` absent ou plus ancien que les données | `scripts/build-data-bundles.js` (postinstall) | le serveur concatène les fichiers de données au démarrage : plus lent, fonctionnel |
| `cache/search-index/` absent ou périmé | `scripts/build-search-index.js` (postinstall) ou le serveur lui-même | construction dans un processus enfant au démarrage (plusieurs minutes en mutualisé), recherche en 503 pendant ce temps ; en cas d'échec, recherche en mémoire une fois le moteur chargé (~3 Go au lieu de ~1,8 Go) |
| `cache/search-index.lock` resté après un arrêt brutal | — | ignoré si le processus dont il contient le PID n'existe plus ; sinon attente (30 min au plus). `scripts/build-search-index.js` sort sans rien faire tant qu'une construction est en cours |
| `lib/land-grid.bin` (commité) | `scripts/build-land-grid.js` | plus aucun contrôle de mer : toutes les positions comptent comme « terre », des étapes par la route peuvent de nouveau traverser la mer |
| `lib/ferry-ports.js` (commité) | `scripts/build-ferry-ports.js` | traversées estimées sans ports : partie par la route = distance à vol d'oiseau moins celle du ferry |
| `data/charging-stations.txt` (commité) | `scripts/fetch-charging-stations.js` | voiture électrique : estimation par l'autonomie seule, signalée sur chaque étape (`chargers: 0`) |
| « JavaScript heap out of memory » dans le journal, tirages indisponibles | — | `NODE_OPTIONS=--max-old-space-size=4096` (voir ci-dessus) |
| Ancien code toujours servi après `git pull` | — | "Run NPM Install" puis "Restart" dans cPanel |

## Performance : bundles `/data/` précompilés

**Mise à jour** : depuis le passage "Recherche et tirage aléatoire côté serveur" (section
suivante), les bundles décrits ici ne sont plus jamais téléchargés par le NAVIGATEUR — ils
alimentent uniquement `lib/trip-engine.js`, en interne au process serveur. Le diagnostic qui suit
(les trois problèmes de performance identifiés) reste vrai ; la compression précalculée du point 3
a depuis été retirée (voir la fin de ce point).

Avec la croissance du nombre de pays couverts (45 à l'époque de ce diagnostic, 239 aujourd'hui), le
chargement initial des données (`public/data/`) est devenu, dans l'ordre, trois problèmes
distincts — chacun diagnostiqué en conditions réelles sur `testroad.lume419.fr` (l'hébergement
mutualisé o2switch de ce projet, PAS reproductible en local où le réseau sans latence masque
entièrement ces effets) plutôt que supposé depuis un bac à sable local :

1. **~91 requêtes séparées** (un fichier `communes-XX.txt` + un `aliases-XX.txt` par pays) : mesuré
   en conditions réelles, ce nombre de requêtes prenait ~2,3 s de façon quasi incompressible, quelle
   que soit la concurrence demandée au navigateur (2, 6, 40 ou 92 connexions simultanées donnaient
   quasiment le MÊME temps total) ou la taille/compression des fichiers demandés — signature d'un
   débit plafonné à ~40-45 requêtes/seconde côté hébergeur (protection anti-flood typique d'un
   hébergement mutualisé), pas un problème de bande passante. **Corrigé** en regroupant tous les
   fichiers communes (resp. tous les alias) en une seule réponse chacun côté serveur — deux routes,
   `/data/communes-bundle.txt` et `/data/aliases-bundle.txt` (voir `server.js`), chaque fichier
   d'origine précédé d'un marqueur `###XX###` (code pays en majuscules) trivial à re-découper côté
   client (`splitBundle` dans `app.js`). ~91 requêtes redescendent à 2 (+ `featured.txt`, inchangé).
2. **Compression à la volée plus faible qu'attendu** : le bundle communes (26,8 Mo bruts) compressait
   à 8,9 Mo (-66,7 %) en local via `compression()` (niveau par défaut) mais seulement à 13,5 Mo
   (-49,5 %) une fois déployé — l'hébergement mutualisé semble limiter l'effort de compression en
   temps réel pour préserver son CPU partagé, cohérent avec le point précédent. Une première
   tentative de correction (compresser une seule fois par bundle, en tâche de fond ASYNCHRONE au
   premier accès plutôt qu'à chaque requête) a paradoxalement RALENTI le premier chargement en
   conditions réelles (~8 s au lieu de ~4-5 s) : sur un CPU partagé déjà limité, lancer gzip et
   brotli en parallèle pour les deux bundles (4 tâches à la fois, pile la taille par défaut du
   threadpool libuv de Node) s'est mis à concurrencer le même CPU limité, ralentissant même le gzip
   dont dépendait la réponse — l'asynchrone évite bien de BLOQUER le process (voir point 3), mais ne
   change rien à la contention CPU réelle.
3. **Solution retenue à l'époque : compression précalculée au DÉPLOIEMENT, jamais au moment d'une requête.**
   `scripts/build-data-bundles.js` écrivait `communes-bundle.txt`/`.txt.gz`/`.txt.br` (et l'équivalent
   pour `aliases-bundle`) dans `public/data/`. Mesuré en local sur le bundle communes : 26,8 Mo -> 8,87 Mo
   en gzip (-67 %), 6,80 Mo en brotli qualité 11 (-75 %) ; la qualité 11 ayant fait échouer "Run NPM Install"
   sur l'hébergement mutualisé, le script était ensuite passé à la qualité 9 (8,07 Mo). `server.js` servait ces
   fichiers selon l'en-tête `Accept-Encoding`, sans calculer de compression pendant qu'un visiteur attendait.
   **Retiré depuis (septembre 2026)** : le navigateur ne télécharge plus les bundles, les routes
   `/data/*-bundle.txt` ont été supprimées (`/data/` répond 404) et plus aucun code ne lisait les `.gz`/`.br`
   (~105 s et ~880 Mo de mémoire à chaque "Run NPM Install" pour rien). Le script n'écrit plus que le texte
   brut, lu par le serveur pour initialiser le moteur, par écriture atomique (fichier `.tmp` puis renommage : un
   processus tué ne laisse jamais un bundle tronqué plus récent que les données) ; il efface les anciens
   `.gz`/`.br`. Si le bundle est absent ou plus ancien que les fichiers de données (ex. un environnement de
   développement où `npm install` n'a jamais tourné), `server.js` concatène lui-même ces fichiers, de façon
   asynchrone (jamais Sync — un calcul
   de cette taille en bloquant gèlerait tout le process Node, mono-thread pour le JavaScript, pour
   TOUTES les requêtes en cours, pas seulement la sienne, un piège rencontré et corrigé pendant ce
   même travail).

**Une donnée technique à retenir pour la suite du projet** : `zlib`/`fs` ont chacun une variante
Sync et une variante async — la version Sync bloque tout le process Node le temps de son exécution,
pas seulement la requête qui l'a déclenchée. Avec des volumes de données appelés à grandir encore
(nouveaux pays), toute future opération lourde sur `/data/` devra continuer à privilégier soit un
calcul déporté au déploiement (comme ici), soit au minimum une variante asynchrone plutôt que Sync.

## Recherche et tirage aléatoire côté serveur

Malgré les trois correctifs ci-dessus (moins de requêtes, meilleure compression, plus aucun calcul
au moment de répondre), le plancher réel sur `testroad.lume419.fr` restait ~7 s au premier
chargement / ~2 s ensuite — désormais dominé par le volume de données lui-même (~27 Mo bruts,
~12 Mo compressés sur cet hébergement précisément, voir la section précédente) et la bande passante
réelle de l'hébergement mutualisé (~3,7 Mo/s mesurés). Avec l'intention de continuer à ajouter des
pays, ce volume ne pouvait que grandir : plutôt que de continuer à optimiser le TRANSPORT d'une
base de communes toujours plus grosse, ce passage retire cette base du navigateur — la recherche de
ville et le tirage aléatoire de destination tournent désormais entièrement côté serveur, qui ne
renvoie plus que le strict résultat (quelques suggestions de recherche, ou l'itinéraire déjà tiré).

**Ce qui a rendu ça possible sans devoir porter les 61 langues côté serveur** : le moteur de tirage
(`buildItinerary` et tout ce qu'il appelle — ferries, péages, masses continentales, nuits,
activités) était déjà presque entièrement indépendant de la traduction. Seuls le libellé du jour
("Jour 3", "Retour"...) et la catégorie de logement affichée étaient résolus en texte AU MOMENT du
tirage ; tout le reste (nom des lignes de ferry, types d'activité) stockait déjà une simple CLÉ,
résolue seulement au rendu — un mécanisme qui existait déjà pour permettre à un changement de
langue en cours de session de retraduire un itinéraire déjà affiché sans le retirer au sort. Il a
suffi de généraliser ce même mécanisme à 100 % des cas (le serveur ne renvoie plus que `labelKind`/
`dayNum` par étape, jamais de texte déjà traduit ; la catégorie de logement n'est plus renvoyée du
tout, le client la recalcule lui-même à partir de `budgetKey`/`avoidTent`, qu'il connaît déjà) pour
que le moteur de tirage devienne totalement agnostique à la langue — `lib/trip-engine.js` n'a
besoin de charger ni `i18n.js` (1,14 Mo, 61 langues) ni quoi que ce soit qui en dépende.

**`public/js/trip-data.js`** (nouveau) porte les tables dont le moteur a besoin — pays, ferries,
péages, budget, détection de masse continentale par pays — dans un fichier UMD minimal chargé à la
fois par le navigateur (`<script>`) et par le serveur (`require()`). Ces tables étaient auparavant
déclarées uniquement dans `app.js` ; les dupliquer côté serveur aurait créé un risque de
désynchronisation à chaque futur ajout de pays (le genre de duplication déjà surveillée "à la main"
entre `build-country-communes.js`/`build-aliases.js`, ici évité pour ces tables précises).

**`lib/trip-engine.js`** (nouveau) est un port direct des fonctions de tirage/recherche de
`app.js` (mêmes commentaires de sourcing conservés) — construit UNE SEULE FOIS en mémoire au tout
premier démarrage du process (communes/alias parsés, index spatial construit), à partir du même
texte brut déjà lu pour les bundles `/data/` ci-dessus (aucune double lecture de fichier). Exposé
via deux routes dans `server.js` :

- `GET /api/search-city?q=...&limit=...` — remplace l'ancienne recherche locale `searchCommunes`
  (même comportement : préfixe de nom local, de code postal, ou d'alias multilingue).
- `POST /api/generate-trip` — remplace l'appel local à `buildItinerary`. Revalide intégralement
  les paramètres reçus (coordonnées, nombre de jours, clés de budget/transport...) : cette route
  devient la vraie frontière de confiance, ce que le formulaire validait déjà côté client mais
  qu'une requête directe pourrait contourner. La devise préférée du visiteur (mémorisée en
  `localStorage`, inaccessible côté serveur) est transmise en paramètre explicite plutôt que
  supposée.

**Côté client**, `app.js` perd environ 100 Ko (le tiers du fichier) : tout le pipeline de
chargement des bundles (fetch, cache IndexedDB, découpage, construction des alias, grille spatiale)
et le moteur de tirage lui-même disparaissent, remplacés par deux appels `fetch()`. Le champ
"ville de départ" s'active immédiatement au chargement de la page — plus aucune donnée à attendre.
`buildActivityOptions`/`diversityGroup` restent côté client (dépendance à double usage : aussi
utilisées pour rafraîchir les suggestions d'activité une fois de vrais points d'intérêt reçus via
`/api/pois`, après le tirage) ; `countryCurrency`/`lodgingCategoryLabel` aussi (rendu de l'indice de
budget et du texte de logement, respectivement, tous deux calculés côté client à partir de données
qu'il connaît déjà). L'exemple de ville du placeholder (auparavant tiré au hasard dans toute la
base) vient désormais d'une petite liste fixe (`PLACEHOLDER_EXAMPLES`) — un simple exemple de
saisie, pas besoin de charger quoi que ce soit pour ça.

Testé en direct dans le navigateur après ce passage : plus aucune requête `/data/communes-bundle.txt`
ni `/data/aliases-bundle.txt` ni `featured.txt` au chargement (vérifié dans l'onglet réseau),
recherche par nom local et par alias fonctionnelles, génération complète d'un itinéraire (Croatie,
péage correctement affiché), changement de langue APRÈS le tirage suivi d'un export PDF réussi
(vérifié que les libellés de jour restent corrects dans la nouvelle langue — l'effet de bord attendu
du passage à `labelKind`/`dayNum`, qui corrige au passage un détail resté figé dans l'ancienne
langue jusqu'ici), et un second tirage consécutif confirmant qu'une destination déjà proposée n'est
pas immédiatement retirée.

### Démarrage du moteur avec ~4 millions de lieux (septembre 2026)

**Symptôme signalé** : « l'autocomplétion semble ne plus fonctionner ». Cause : après le lot Asie et l'Océanie, `init()`
(lib/trip-engine.js) mettait **~113 s** au repos (235 s mesurées sur la machine de développement chargée) avant que
`/api/search-city` ne réponde ; pendant ce temps le serveur renvoyait 503 et la liste de suggestions restait vide, sans
aucun message. Corrections :
- **Bandes frontalières des zones à tension** (88 s → ~7 s) : chaque lieu d'un pays à règle `borderKm` parcourait tous
  les lieux des cases voisines. La grille retient maintenant les pays présents dans chaque case (clé numérique) et, pour
  chaque couple (pays voisin, distance), la zone de cases atteignable, calculée une seule fois : un lieu hors de cette
  zone est écarté sans calcul de distance.
- **Lecture des lieux** : `concat` recopiait tout le tableau déjà construit à chaque pays (remplacé par `push`), et la
  normalisation Unicode (`normalize('NFD')`) est sautée pour les noms en ASCII — résultat identique. Mémoire du tas
  ramenée de ~4,0 à ~3,0 Go.
- **Durée de chaque étape dans les journaux** : `[trip-engine] lieux et alias … · grille … · zones à tension … · index de
  recherche …`. Mesure au repos après correction : ~28 s au total.
- **Côté navigateur** : pendant le chargement, la liste affiche « Chargement des communes… » (chaîne déjà traduite dans
  les 143 langues) et relance la même recherche toutes les 2 s tant que la saisie ne change pas.
- **Démarrage progressif (second correctif, même jour)** : sur l'hébergement en ligne, « Chargement des communes… »
  restait affiché très longtemps après chaque relance du serveur. `init()` renvoie maintenant une promesse et rend la
  main au serveur entre chaque pays (le serveur répond pendant tout le chargement au lieu de rester figé) ; la
  recherche est ouverte dès que les noms et codes postaux sont indexés, **avant** la lecture des alias multilingues
  (ajoutés quelques secondes plus tard) et avant la grille des tirages (`isSearchReady` / `isReady`) ; le niveau de
  tension n'est plus calculé pour tous les lieux au démarrage mais à la première demande, pour les seuls lieux
  examinés par un tirage. Mesure locale : recherche disponible en ~15 s (au lieu de ~45 s), tirages en ~40 s.
- **Hébergement mutualisé** : Passenger arrête l'application après une période sans visite ; le visiteur suivant
  repaie le démarrage. Depuis l'index de recherche sur disque (ci-dessous), la recherche de ville n'est plus
  concernée ; seuls les tirages attendent le chargement des lieux. Une tâche cron ou un service de surveillance
  externe qui interroge le site toutes les 5 minutes évite quand même cet arrêt, si on le souhaite.
- **Noms idéographiques de deux caractères** (北京, 東京, 서울) : jamais trouvés jusqu'ici, la recherche exigeant 3
  caractères. Les noms et alias en hanzi/kanji, kana et hangeul sont aussi indexés sous leurs 2 premiers caractères, et
  une saisie de 2 caractères idéographiques est acceptée.

### Index de recherche précalculé sur disque (septembre 2026)

Pour que la recherche de ville réponde **dès le démarrage** du serveur, sans attendre le chargement du moteur, un
index est construit au déploiement et lu directement sur le disque (`lib/search-index.js`,
`scripts/build-search-index.js`).

- **Construction** : lancée par `npm install` (postinstall) et `npm run build-bundles`, juste après les bundles. Les
  lieux et alias sont lus pays par pays, ligne par ligne, avec la même normalisation que le moteur ; les entrées sont
  réparties dans des fichiers temporaires selon les deux premiers octets de leur clé, triées lot par lot puis
  assemblées. Mesure locale : 4 035 073 lieux, 13 313 257 entrées (noms, codes postaux, alias), ~95 s, **~640 Mo de
  mémoire au plus haut** (le script tourne avec `--max-old-space-size=1024`, et a été vérifié sous 700 Mo).
  Résultat : `cache/search-index/`, ~900 Mo sur le disque (mesuré en septembre 2026), jamais commité (`.gitignore`).
- **Lecture** : aucune donnée chargée en mémoire. Deux dichotomies sur les clés triées (octets UTF-8) donnent toutes
  les entrées commençant par la saisie ; les meilleures par population sont sélectionnées (tas), puis les 8 lieux
  affichés sont lus. Mesure locale : 4 à 12 ms par saisie, y compris pour « san » ou « par ».
- **Mêmes résultats que la recherche en mémoire** (comparaison sur 124 saisies en 20 écritures : noms, codes postaux,
  alias chinois, japonais, coréens, arabes, cyrilliques, grecs, thaïs…) : identiques, y compris l'ordre des ex æquo,
  à une exception assumée — quand plusieurs lieux homonymes partagent le même code de région (« Al Qāhirah » au
  Yémen), l'ancienne recherche gardait le premier du fichier, souvent un hameau sans habitants ; l'index garde le plus
  peuplé.
- **Sécurité** : l'index enregistre la taille et la date de chaque fichier de données. S'il ne correspond plus (pays
  ajouté sans relancer `npm run build-bundles`, index absent ou construction échouée), le serveur l'ignore et revient
  à la recherche en mémoire, disponible une fois le moteur chargé (message dans les journaux).
- **Effet sur le moteur** : quand l'index est utilisé, le moteur ne charge plus les alias ni son propre index de
  recherche — tirages prêts en ~24 s au lieu de ~40 s en local, et mémoire réduite d'autant.

**Après tout ajout de pays** : `npm run build-bundles` (bundles + index), puis redémarrer le serveur.

**Serveur autonome (correctif du même jour)** : sur testroad.lume419.fr, « Run NPM Install » a été rapide et
l'attente persistait. Diagnostic à distance : le bundle servi faisait 71 Mo en brotli contre 49 Mo pour la version
précompilée — l'étape de construction de l'installation ne s'exécute pas (ou échoue) sur l'hébergement ; ni
bundles précompilés ni index, et à chaque démarrage le serveur recompressait ~190 Mo avant même de charger le
moteur. Désormais :
- le moteur lit le **texte brut** (bundle précompilé s'il est plus récent que les fichiers de données, sinon simple
  concaténation) — les données de lieux ne sont jamais compressées ; les routes `/data/*-bundle.txt` ont depuis été retirées ;
- si l'index de recherche est absent ou périmé, **le serveur le construit lui-même** dans un processus enfant
  (`--max-old-space-size=1024`), AVANT de charger le moteur pour ne pas additionner les deux pics de mémoire ; l'index
  est gardé dans `cache/` pour les démarrages suivants ; un verrou (`cache/search-index.lock`, contenant le PID du
  constructeur, également pris par `scripts/build-search-index.js` lancé par `npm install`) évite deux constructions
  simultanées ; en cas d'échec, le moteur assure la recherche en mémoire ;
- **`GET /api/status`** : état de l'index, résultat et durée de la dernière construction, état du moteur, recherche et
  tirages disponibles, nombre de bornes de recharge — sans mémoire ni version de Node ni détail d'erreur depuis l'audit
  du 17/09/2026 (dernières lignes de sortie de la construction dans le journal du serveur).

Mesures locales en reproduisant la situation en ligne (index supprimé) : construction 88 s pendant laquelle la
recherche répond 503 (liste « Chargement des communes… ») ; puis recherche immédiate et tirages prêts 11 s plus tard,
avec ~1,8 Go de mémoire au lieu de ~3 Go (le moteur ne charge plus les alias). Démarrages suivants : recherche
disponible en ~2 s, tirages en ~12 s. Le premier démarrage après chaque déploiement de nouvelles données reconstruit
l'index (plusieurs minutes sur l'hébergement mutualisé).

### Villes du pays de la langue en tête des suggestions (septembre 2026)

Les suggestions de ville de départ (**20** au plus, liste qui défile) montrent d'abord **tous** les lieux du **pays associé à la
langue d'interface**, puis — seulement s'il reste de la place — ceux des autres pays, chaque groupe par population décroissante
(`mergePreferred`, lib/search-index.js). En allemand, « san » ne propose que des lieux allemands (Sankt Augustin, Sankt
Ingbert…), l'Allemagne en ayant plus de 20 ; « berlin » en français propose Berling (Moselle), seul lieu français, puis Berlin
et les autres ; « mosk » en allemand, sans lieu allemand, propose directement Moscou.
(Première version : 8 suggestions dont 3 réservées aux autres pays ; mesure du coût : 20 résultats = ~3 Ko et quelques ms.) Le pays vient du drapeau de la langue (`I18N.country()` : `de` → DE, `ca` → ES,
`haw` → US ; marquisien et tahitien → FR, les collectivités d'outre-mer étant rangées sous FR ; occitan → FR, amazighe → MA),
envoyé dans `/api/search-city?country=XX`. Un lieu du pays passe devant ceux des autres pays, même tout petit : en français,
« berlin » propose Berling (Moselle) puis Berlin.

**Index disque inchangé** (pas de reconstruction) : les lieux d'un pays y occupent des numéros consécutifs, un fichier de pays
étant traité à la fois ; la plage de chaque pays est retrouvée par dichotomie au premier besoin (quelques centaines de lectures
de 2 octets). La recherche en mémoire du moteur (repli) applique le même ordre.

### Nom alternatif affiché entre parenthèses (septembre 2026)

La recherche porte aussi sur les noms alternatifs multilingues (alias GeoNames), si bien que « san » proposait Xanten,
Shanghai ou São Paulo sans qu'on voie pourquoi. Quand un lieu est trouvé **par un nom alternatif** (et non par son nom ni son
code), ce nom est renvoyé (`matchedName`) et affiché entre parenthèses : « Xanten (Santen) » (bas-allemand), « Shanghai
(Şanghay) » (turc), « São Paulo (San Paolo) » (italien). Si plusieurs noms alternatifs du lieu correspondent, **celui de la
langue d'interface** est préféré (`/api/search-city?lang=`) : « Saint Petersburg (Sankt Petersburg) » en allemand, « (San
Petersburgo) » en espagnol. Rien n'est ajouté quand le nom alternatif figure déjà dans le nom (« Donostia / San Sebastián »).

**Index disque en version 3** : le texte des alias n'y était pas (seule sa forme normalisée, sans accents ni majuscules, servait
de clé) ; deux fichiers s'ajoutent, `aliases.dat` (« langue 	 alias » par rang global d'alias) et `aliasoff.bin` (~130 Mo à
eux deux). Le changement de version rend l'ancien index périmé : **au premier démarrage après la mise à jour, le serveur le
reconstruit seul** (~2 min en ligne, recherche servie par le moteur en mémoire entre-temps). La recherche en mémoire du moteur
(repli) renvoie les mêmes noms.

**Liste des suggestions** : sur écran large (≥ 700 px), elle fait au moins 24 rem au lieu de la largeur du champ (~200 px), où
les noms étaient coupés (« Sankt Wen… ») ; les noms longs passent à la ligne au lieu d'être tronqués. Sur mobile, elle garde la
largeur du champ, qui occupe déjà tout l'écran.

### Noms alternatifs dans toutes les langues, pour tous les pays (septembre 2026)

Chaque lot de pays avait son script d'alias, avec la liste des langues gérées au moment de son ajout ; les langues ajoutées
ensuite n'étaient jamais reportées. Berlin n'avait que 3 noms alternatifs (Berlino, Berlijn, Berlim) : « Берлин » ou
« ベルリン » ne trouvaient rien. La France, l'Arménie et la Syrie n'avaient aucun fichier (« Parigi », « Երևան » introuvables),
et 15 langues d'interface aucun nom alternatif.

`scripts/build-all-aliases.js` complète désormais **tous** les fichiers `aliases-xx.txt`, de façon **additive** (lignes
existantes gardées, avec leurs filtres propres), avec les noms alternatifs GeoNames de chaque lieu publié dans toute langue
d'interface ou déjà acceptée par un script d'alias (variantes zh-TW, yue, nb, quz…) :
- **rattachement** lieu publié → entrée GeoNames : mêmes coordonnées à 4 décimales (même nom, ou unique lieu habité à ce
  point), sinon même nom à moins de 10 km (France : communes IGN ; Arménie, Syrie) — au moins 90 % des lieux rattachés dans
  chaque pays, 97 % en France ;
- **filtres** : noms historiques et familiers (« Ville-Lumière ») exclus, nom identique au nom publié exclu ; sorabe dsb → hsb,
  normand nrf → nrf-je / nrf-gg, papiamento pap → pap-AW / pap-CW ; noms celtiques recopiés sous une autre langue et aires du
  gallois, du gaélique, du cornique et de l'irlandais au Royaume-Uni (repris de `build-aliases.js`).

**+404 553 noms alternatifs** (1,31 → 1,72 million), bundle d'alias 38,7 → 51,6 Mo (13,97 Mo en brotli), index de recherche
16,4 → 17,6 millions d'entrées (construction : mémoire max 648 Mo, inchangée). Les plus nombreux : russe, persan, ukrainien,
serbe, chinois, tatar, kazakh, tchétchène, ourdou, bulgare, japonais. Exemples : « Берлин » → Berlin, « Parigi » → Paris,
« Marsylia » → Marseille, « Estrasburgo » → Strasbourg, « Երևան » → Yerevan, « Münih » → München. Les fichiers GeoNames des
33 pays européens (`scripts/dump`, `scripts/altnames`, non commités) ont été retéléchargés pour l'occasion.

**Limite** : un nom alternatif est rattaché au NOM canonique (format `langue;alias;nom`) : dans un pays, il s'applique à tous
les lieux homonymes, comme avant.

**Lignes orphelines réparées** : 55 lignes héritées des premiers scripts visaient un nom absent des lieux publiés
(« Copenhagen », « Gothenburg », « Sibbo », « Tirana » alors que les lieux s'appellent København, Göteborg, Sipoo, Tiranë) ou
étaient mal formées : 25 rattachées au bon nom (« Copenaghen » retrouve København), 30 écartées.

**Nom affiché entre parenthèses** — parmi les noms alternatifs d'un lieu qui correspondent à la saisie, choix dans cet ordre :
langue d'interface, nom tapé tel quel, nom tapé sans accents (« Münih » affiche « Münih » et non « Munîh », de même forme sans
accents). Codes GeoNames équivalents aux langues d'interface (`aliasLangRank`, lib/search-index.js) : zh-TW, zh-HK, yue →
chinois traditionnel ; zh-Hans, zh-CN → chinois ; nb, nn → norvégien ; pap → papiamento d'Aruba et de Curaçao ; qu, qug →
kichwa ; quz → quechua ; tl → filipino ; nrf → jèrriais et guernésiais ; kmr → kurde ; prs → persan ; dsb → sorabe ; sr-Latn,
hbs → serbe, monténégrin, bosnien, croate. Aucune parenthèse quand le nom choisi figure déjà dans le nom du lieu (« Juan de
Nova » pour « Île Juan de Nova »), plutôt qu'un nom d'une autre langue à sa place.

**Contrôle automatique** : `node scripts/check-alias-languages.js [N]` tire N noms alternatifs de chaque langue d'interface,
les tape dans la recherche (index disque, pays du lieu prioritaire, langue d'interface correspondante) et vérifie que le lieu
est trouvé et que la parenthèse est dans cette langue. Résultat (septembre 2026, N = 100) : **151 langues sur 161 testées,
12 146 lieux trouvés sur 12 223, parenthèse dans la bonne langue 12 146 fois sur 12 146**. Les 77 lieux non trouvés portent un
nom très répandu dans leur pays (« Krajan », « San Jose », « Ban Mai », « Campo »…) : des centaines de lieux passent avant eux
au classement par population — limite du classement, pas de la langue. **10 langues n'ont aucun nom alternatif** dans GeoNames
(guernésiais, vlaški, touroyo, créole seychellois, ndébélé, marquisien, maya yucatèque, k'iche', kaqchikel, q'eqchi') : leurs
locuteurs utilisent en pratique les noms de la langue officielle (espagnol, français, anglais…), trouvés et affichés comme
tels. Recherche en mémoire du moteur (repli) : mêmes résultats que l'index disque sur les cas testés.

### Kerkennah, Dalma, Coron et Busuanga : lieux ajoutés (septembre 2026)

Trois îles sans aucun lieu dans les données, pour trois raisons différentes :
- **Kerkennah (Tunisie)** : exclues volontairement lors du lot Maghreb (le moteur ne savait pas encore séparer une île
  du continent). Exclusion levée dans `scripts/build-maghreb-communes.js` : **16 lieux**. Au passage, la source tunisienne
  donnant les mêmes coordonnées à tous les codes d'une délégation, chaque lieu recevait le premier code de la liste
  (3045 pour tout l'archipel) : quand un code porte le nom de la localité du lieu, il est désormais choisi
  (**91 codes corrigés** dans toute la Tunisie ; Mellita 3015, Ouled Kacem 3025, Kellabine 3070…). Les variantes
  d'orthographe (« El Ataya » / « El Attaya ») gardent le code par défaut.
- **Dalma (Abou Dhabi)** : GeoNames n'y décrit aucun lieu habité ordinaire, seulement trois quartiers (type PPLX, non
  importé) et la division administrative de l'île. Ces **4 entrées** sont reprises telles quelles
  (`scripts/build-golfe-communes.js`) ; « Dalma Island » rend l'île trouvable en tapant « Dalma ».
- **Coron, Busuanga, Culion (Philippines)** : le fichier postal GeoNames place les trois codes (5315, 5316, 5317) à
  ~150 km de leurs îles, si bien que tous leurs lieux étaient écartés par la règle « point postal à moins de 15 km ».
  Quand aucun point n'est assez proche, le code est désormais pris par **municipalité** (nom de la division ADM3
  GeoNames du lieu identique à une localité du fichier postal, même province) : **1 873 lieux philippins
  récupérés**, dont 135 à Coron, Busuanga et Culion (`scripts/build-asie-communes.js`).

**Îles** (`scripts/iles/iles-corrections.js`) : `kerkennah` (16 lieux), `dalma` (4), `busuanga` (79 : municipalités
de Busuanga et de Coron, dont la ville de Coron), `culion` (42), `cuyo` (34, Cuyo et Magsaysay) ; île de Coron, Calauit,
îlots du sud de Coron, Balabac, Agutaya, Cagayancillo et Kalayaan isolés lieu par lieu. Limites de Culion et
Busuanga approchées par boîtes (baie de Gutob).

**Liaisons** :
- **Sfax ↔ Sidi Youssef** (SONOTRAK) — grille officielle (communiqué du 4 juillet 2022, décision des ministres du
  Commerce et du Transport, toujours en vigueur) : voiture 6 TND (1,78 €), camionnette 7,5 TND, moto 1,5 TND, passager
  1 TND ; 10 départs par jour, 1 h à 1 h 20.
- **Jebel Al Dhanna ↔ Dalma** (Abu Dhabi Maritime) — grille officielle : voiture ou 4x4 100 AED (23,36 €), camping-car
  100 AED, adulte 20 AED ; moto absente de la grille (tarif non communiqué) ; 2 à 3 allers-retours par jour.
- **Manille ↔ Coron** (2GO) — une rotation par semaine, véhicules en fret roulant sur devis : tarif variable.
- **Non modélisées** : Coron ↔ Culion (vedettes pour passagers seulement), Coron ↔ San Jose de Mindoro (transport de
  voitures non prouvé), Atienza Interisland (tarif et transport de véhicules non établis).

### Tawau, Long Island et Rum Cay : trois îles mal délimitées (septembre 2026)

Relevées en listant les masses terrestres sans liaison (script de contrôle qui applique `landmassOf` à tous les lieux) :
- **Tawau (Malaisie, 372 615 hab.)** était rangée sur l'île de **Sebatik** : la boîte de l'île (4,05–4,30 N, 117,76–118,0 E)
  débordait sur le continent, de l'autre côté de Cowie Harbour, et coupait la ville du reste de Sabah. Deux boîtes suivent
  désormais la côte nord de Sebatik ; Wallace Bay et Mantadok, bien sur l'île mais auparavant rangés à Bornéo, la rejoignent.
- **Long Island des Bahamas et Long Island de Papouasie-Nouvelle-Guinée** partageaient la clé `longIsland` et formaient une
  seule masse terrestre : clés `longIslandBS` et `longIslandPG`.
- **Rum Cay** : Port Nelson tombait dans la boîte de Long Island (évaluée avant celle de Rum Cay) ; la boîte est scindée.

Contrôle fait à la même occasion : les clés encore communes à plusieurs pays sont toutes voulues (Hispaniola, Timor, Bornéo,
Sebatik, Nouvelle-Guinée, Terre de Feu, Saint-Martin, Leticia-Tabatinga, Guyane-Oiapoque, continents).

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
- **Vérification géographique des sources (septembre 2026)** : une recherche par le seul nom tombait sur l'homonyme le
  plus connu — « Madonna » (statue de la Madone près d'Ajaccio) → la chanteuse, « Statue de la Liberté » (réplique de
  Roybon) → New York, « Monument aux morts » → Armentières, « Milano » → un rappeur, « Menago » → une rivière,
  « Château de Montfalcon » près de Roybon → celui de Savoie. Un article n'est désormais retenu (photo ET lien) que s'il
  est géolocalisé près du lieu : 5 km d'un lieu OpenStreetMap (ses coordonnées sont transmises par `/api/pois`), 15 km
  de la commune pour un lieu connu seulement par elle (section « Lieux et monuments », lieux mis en avant), 20 km pour
  l'étape elle-même. Sans coordonnées (personne, notion générale), rien n'est affiché. La section « Lieux et monuments »
  n'est lue que si l'article est bien celui de la commune. Repli pour un nom local : même nom sur Wikipédia en anglais
  (position vérifiée), puis article de la langue du visiteur via Wikidata (« Milano » → Milan, « Kraków » → Cracovie).
  Mesuré sur 62 lieux réels et 40 étapes : toutes les photos écartées étaient fausses.
- **Lieux tirés de la section « Lieux et monuments »** (`monumentName` dans server.js) : le nom est le texte AFFICHÉ de
  la puce (et non la cible du premier lien, qui donnait « Église (édifice) » pour « [[Église (édifice)|église]] de… »),
  coupé avant les précisions (« édifiée en… », « attesté dès… », « se dresse sur… », « au cœur de… »), et retenu seulement
  s'il contient un mot désignant un lieu (église, chapelle, château, pont, moulin, dolmen…) sans formulation générique
  (« Sur l'ensemble de la commune », « Sites médiévaux nombreux », « L'un des Plus beaux villages de France », noms de
  personnes, « Climatologie »…). Vérifié sur 26 communes : faux lieux supprimés, noms nettoyés (« Chapelle Sainte-Croix
  de Saint-Cirq-Lapopie » au lieu de « Sainte Croix », « Dolmen d'Horaste » sans balises), vrais lieux conservés.
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
  photos) — voir `fetchVisorandoHikes` (et `fetchVisorandoHikeList`, qui gère le cache) dans `server.js`.
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

### Randonnées dans le monde entier (septembre 2026)

Jusqu'ici, la recherche interrogeait Visorando pour TOUTES les communes, par leur seul nom, quel que soit le pays : ailleurs
qu'en France, résultats vides ou randonnées d'un homonyme (le client ne l'appelait d'ailleurs que pour la France).

- **Visorando seulement là où il couvre réellement le terrain** : ses 45 056 randonnées ont été rattachées au pays de la
  commune la plus proche — **France (~35 190), Royaume-Uni (~3 610), Allemagne (~1 500), Belgique (~1 380), Espagne (~950),
  Suisse (~620), Italie (~580), Autriche (~156), Portugal (~132)**, seuil de 100 (Grèce 78, Luxembourg 70, Norvège 55… en
  dessous). **Contrôle géographique** : la page Visorando d'un nom peut être celle d'un homonyme (« brugge » = Brügge dans le
  Schleswig-Holstein, pas Bruges) ; sa position (balises meta) doit être à moins de 25 km de l'étape, sinon elle est ignorée
  — correction valable aussi pour les homonymes français.
- **Itinéraires balisés OpenStreetMap partout ailleurs** (ou si Visorando ne trouve rien) : relations `route=hiking`/`foot`
  nommées à moins de 15 km (Overpass), nom dans la langue d'interface quand il existe, distance, lien vers Waymarked Trails,
  mention « Source : OpenStreetMap ». Une journée = une randonnée : itinéraires de plus de 40 km et grands réseaux
  européens/nationaux sans distance écartés ; tri par proximité, léger avantage aux boucles locales. Cache 14 jours par
  point, échecs réseau non mis en cache. Couverture OSM inégale (rien autour de Hakone au Japon, par exemple).
- **Portails de randonnée de référence** (`scripts/hiking/hiking-europe.js`, `hiking-monde.js` → `scripts/build-hiking-data.js`
  → `data/hiking.json`) : **79 portails dans 70 pays**, officiels de préférence (Suisse Rando, Wanderbares Deutschland,
  alpenvereinaktiv, Mapy.com, National Trails, Recreation.gov, Parcs Canada, DOC Nouvelle-Zélande, sentiers longue distance
  du ministère japonais de l'Environnement, Durunubi, SANParks, Jordan Trail…), affichés une fois par étape sous la forme
  « Plus de randonnées : … ↗ » (traduit dans les 161 langues) ; 22 acceptent une recherche pré-remplie (ville ou
  coordonnées), les autres renvoient vers une page nationale. Portails bloqués par des contrôles anti-robots non retenus.
- **Une randonnée par jour, jamais deux fois la même** : une seule case « randonnée » par journée (inchangé) ; file de
  randonnées par étape, et désormais registre des liens déjà proposés sur TOUT le voyage (`usedHikeUrls`), remis à zéro à
  chaque tirage — deux étapes voisines qui trouvent le même sentier ne le proposent qu'une fois. Test : 5 jours à Avekapelle
  (Belgique), 5 randonnées OpenStreetMap différentes, lien « Grote Routepaden » affiché une fois.
- « Source : {source} » dans les 161 langues (Visorando ou OpenStreetMap) ; export PDF : source réelle de chaque randonnée.

## Ferries

### Charge, budget de temps et protections (audit complet du 17 septembre 2026)

- **Budget de temps d'un tirage** : le moteur est synchrone ; un tirage ne dépasse pas ~4 s (`TRIP_TIME_BUDGET_MS`).
  Au-delà, plus aucun candidat n'est tiré et un chemin par la terre non encore trouvé compte comme absent (trajet refusé) :
  l'itinéraire est renvoyé s'il est déjà valide, sinon `{ legs: [], timedOut: true }` (message dédié côté client). Avant
  ce budget, certains réglages extrêmes (3 000 km d'éloignement depuis Moscou, Nuuk, l'Ukraine…) bloquaient le process 20 à
  107 s pour tous les visiteurs. Un départ isolé sans liaison ferry renvoie immédiatement un tirage vide.
- **Budget de calcul global** (`CPU_BUDGETS`, server.js) : tirages, exports PDF et recherches lentes (> 50 ms) partagent
  au plus 25 s de calcul par minute et 7,5 s par 10 s, toutes IP confondues ; au-delà, `503 {"error":"busy"}` avec
  `Retry-After`. Un seul export PDF à la fois, 20 lignes au plus par étape, liens limités aux hôtes connus de
  l'application (https) ; avertissements des zones déconseillées (départ et étapes) repris dans le PDF.
- **Appels sortants** limités : Overpass 2 simultanés (25 s au total pour les trois miroirs), Wikipédia 6, Visorando 2,
  Wikidata 2 ; un échec ou une saturation n'est jamais mis en cache. Recherche de ville : 60 requêtes par minute par IP.
- **Compression** : les données de lieux ne sont jamais compressées par le serveur. Les gros fichiers statiques du
  navigateur (`js/i18n.js`, `js/trip-data.js`, `js/app.js`, `css/style.css`) sont compressés une seule fois en
  mémoire (brotli qualité 9 et gzip) une fois le moteur prêt, puis servis sans recalcul (i18n.js : ~775 Ko en brotli au
  lieu de 11 Mo) ; avant, ou si un fichier change sans redémarrage, compression à la volée. `/api/status` l'indique
  (`precompressed`).
- **Règles du moteur** : avec une distance d'éloignement, le premier trajet (et le retour d'un séjour à une seule
  étape) peut dépasser la distance max entre étapes jusqu'à 1,4 × la distance d'éloignement, plus au-delà ; la ville de
  départ n'est jamais tirée comme étape (même nom normalisé ou lieu à moins de 2 km) ; les parties par la route d'un
  trajet avec ferry sont contrôlées comme un trajet ordinaire (eau, frontière, bornes ; pays du port = lieu le plus proche
  de la même masse terrestre à moins de 40 km) ; le retour d'une excursion d'un jour est contrôlé ; recherche de lieux,
  grille terre/eau et bornes fonctionnent autour de l'antiméridien (Fidji, Tchoukotka) ; `tripStart` doit être une date
  réelle AAAA-MM-JJ entre l'année précédente et trois ans plus tard (sinon aujourd'hui) ; une devise préférée sans barème
  se replie sur celle du pays puis l'euro.
- **Recherche sur disque** : `cache/search-index/countries.json` (facultatif) contient les plages de lieux par pays,
  écrit à la construction ou calculé à l'ouverture d'un index plus ancien.
- **Péages sur les îles** : le barème kilométrique d'un pays s'appliquait à toutes ses îles (un trajet en Corse affichait
  ~13 € de péage « évités »). Il ne s'applique plus qu'aux masses terrestres dotées d'autoroutes à péage
  (`TOLL_LANDMASSES`, trip-data.js) : France métropolitaine, péninsules espagnole et portugaise, Italie continentale et
  Sicile, Grèce continentale (la Crète n'a aucun poste de péage en service en 2026), Honshū/Hokkaidō/Okinawa, île de
  Taïwan, et le continent pour la Croatie, la Turquie, la Tunisie et le Sénégal. Sources dans le commentaire.
- **Données** : la liaison Esashi–Okushiri était inutilisable, aucun lieu d'Okushiri dans les données japonaises —
  corrigé, voir « Lieux japonais sans point postal proche » plus bas.

### Seconde passe d'audit (17 septembre 2026)

- **Budget de calcul par IP** (`CPU_BUDGETS_PER_IP`) : 10 s par minute et 4 s par 10 s par adresse, au-delà 429 pour elle
  seule. Mesuré avant : deux tirages de 4 s d'une même IP suffisaient à faire répondre « busy » à tous les visiteurs. La
  recherche de ville n'est plus refusée pour cause de charge globale (budget de l'IP seulement).
- **Appels tiers par IP** : au plus 2 requêtes `/api/pois` + `/api/hike` et 4 `/api/photo` en cours par adresse, les
  suivantes attendent leur tour (file bornée, puis 429) — une adresse ne peut plus occuper seule les créneaux Overpass.
- **Wikitexte** : titres contenant « : » refusés (pages utilisateur, discussions), article géolocalisé vérifié AVANT le
  téléchargement du wikitexte, analyse bornée (600 Ko de page, 40 Ko de section, puces de 400 caractères) ; une puce
  piégée de 60 Ko bloquait le serveur 5 s.
- **`/data`** : filtre sur le chemin normalisé (`/./data/…`, `/%2e/data/…`, `/js/../data/…` servaient les fichiers côté
  Node ; Apache les bloquait déjà en production). Nom de fichier PDF rendu bien formé (`toWellFormed`), pays de
  `/api/photo` limité à deux lettres, `TRUST_PROXY` configurable, verrou d'index retiré par renommage atomique.
- **Moteur** : un tirage interrompu ne renvoie plus une dernière étape hors du rayon de retour (Moscou, rayon 50 km :
  étape à 1 000 km) ; itinéraire incomplet faute de temps → `timedOut` ; une étape unique (aller-retour) respecte le
  rayon ; distance minimale introuvable → `minDistanceNotFound` (message dédié) au lieu d'un itinéraire de secours qui
  l'ignorait ; minimum > maximum refusé ; nom de la ville de départ transmis aux règles d'îles (Galatás classé sur Póros) ;
  codes postaux `__proto__`/`constructor` sans effet ; paramètres non textuels refusés.
- **Client** : boutons de tirage bloqués jusqu'à l'affichage du voyage (un tirage relancé pendant la roulette puis
  refusé laissait l'écran bloqué) ; changement de langue pendant la roulette sans libellés de l'ancien voyage ; date de
  fin du PDF = fin réelle du séjour plafonné ; `selected_currency` sur les liens Booking ; montants au format de la
  langue ; nom du pays des suggestions traduit ; champs numériques nommés pour les lecteurs d'écran ; messages 429/503 à
  l'export PDF ; politique de confidentialité complétée (limitation de débit en mémoire, liste des liens tiers).
- **Limites connues** (toutes corrigées depuis : sections suivantes) : durées « 2h46 » non localisées, photos redemandées
  à chaque changement de langue, PDF en français.

### Durées et photos dans la langue du visiteur (17 septembre 2026)

- **Durées** : « 2h46 » et « 45 min » s'affichaient tels quels dans toutes les langues (écran et PDF). Le moteur renvoie
  désormais aussi `travelMin` (et `roadMin` pour la partie par la route d'une traversée) ; le navigateur les formate
  avec `Intl.DurationFormat` (« 2 h et 46 min », « 2 時間 46 分 », « 2 ч 46 мин », « 2 س و46 د »), sinon les unités
  d'`Intl.NumberFormat`, sinon l'ancien libellé — sans nouvelle traduction, avec la même langue de repli que les dates
  (`localeTag`). Forme compacte (« 4h 30min ») dans le champ du rayon exprimé en heures. `travelTime`/`roadTime` restent
  pour les calculs du moteur et les anciens clients (relus si les minutes manquent).
- **Photos au changement de langue** : le cache des photos du navigateur ne dépend plus de la langue. Les photos déjà
  affichées restent ; en arrière-plan, deux requêtes à la fois, chaque lieu est redemandé dans la nouvelle langue pour
  mettre à jour le lien Wikipédia (article dans la langue s'il existe, sinon lien précédent conservé) et l'image quand
  il n'y en avait pas. Un seul redessin du journal de bord une fois la file vidée ; une langue rechangée entre-temps
  abandonne les requêtes devenues inutiles. Avant : jusqu'à ~90 requêtes simultanées et images rechargées sous les yeux.

### Lieux écartés à tort faute de point postal (17-18 septembre 2026)

`build-asie-communes.js` rattache chaque lieu au point postal GeoNames le plus proche à moins de 15 km, et écarte les
autres. Deux défauts, corrigés en deux temps :

1. **Points postaux mal placés.** Le fichier postal (données Japan Post) place tous les codes de certaines municipalités
   au même point, parfois très loin : les 13 codes d'Okushiri (043-1400 à 043-1525) sont à 41,9076 N ; 140,2695 E, sur le
   continent à ~70 km de l'île. Aucune localité de l'île n'était publiée, et la liaison ferry Esashi–Okushiri ne pouvait
   jamais servir. Faute de point assez proche, le code est désormais pris par LOCALITÉ (mêmes codes administratifs
   GeoNames — préfecture, district, municipalité — et nom identique à celui d'une seule ligne postale), sinon par
   MUNICIPALITÉ (règle qui n'existait que pour les Philippines). Les deux règles valent pour les huit pays à codes
   postaux du lot (IN, ID, JP, KR, PH, BD, LK, SG).
2. **Fenêtre de recherche trop étroite** (3e audit du 17/09/2026) : la grille du plus proche point (cellules de 0,1°)
   n'était parcourue que sur ±1 cellule, ce qui ne couvre pas 15 km ; 1 760 lieux étaient déclarés « sans point à moins
   de 15 km » alors qu'il en existait un (Sirajganj, 127 481 habitants, point à 12,0 km), et d'autres rattachés à un
   point plus éloigné que le plus proche réel. La fenêtre est maintenant calculée depuis le rayon demandé et la latitude.

Résultat : **3 069 lieux retrouvés, aucun lieu existant perdu**, 738 codes postaux corrigés — Inde 1 525 (dont Virār,
1,2 M d'habitants, Verāval, Zahirābād), Bangladesh 940 (dont Mymensingh, 225 000), Japon 349 (Okushiri, Tsushima, Izena,
Iheya, péninsule de Shimokita, Erimo, côte de Namie…), Indonésie 206 (Papouasie : Timika, Wamena), Philippines 31,
Sri Lanka 18 (péninsule de Jaffna), Corée 1. Les noms alternatifs correspondants ont été ajoutés aux fichiers
`aliases-*.txt` **sans les régénérer** : le script officiel écraserait les langues fournies par d'autres scripts (1 499
lignes pour le seul Japon). Reconstruction d'un seul pays : `ONLY_COUNTRY=JP node scripts/build-asie-communes.js`.
Mesuré : départ d'Okushiri, circuit sur l'île sans ferry ou voyage par la traversée ; départ d'Esashi, l'île peut être
tirée.

### Troisième passe d'audit (17-18 septembre 2026)

Quatre audits en lecture seule (chaîne PDF, sécurité du serveur, interface et traductions, moteur et données), puis
correction. Les points les plus lourds ont leur propre section ci-dessus ou ci-dessous ; le reste :

- **Polices du site cassées par une règle du `.htaccess`** : le dossier des polices du PDF, ajouté à la racine sous le nom
  `fonts/`, occupait la même adresse que `public/fonts/` (polices d'affichage du tifinagh, de l'éthiopien, du tibétain,
  du thâna et du yi, servies par Node à `/fonts/…`). Bloquer `fonts` chez Apache les redirigeait toutes : ces écritures
  s'affichaient en carrés. Dossier renommé `pdf-fonts/`, règle corrigée.
- **Files d'attente par IP** (appels vers Overpass, Wikipédia, Visorando) : plafond par adresse ramené à une fraction du
  plafond global (1 sur 2 Overpass, 3 sur 6 Wikipédia — une seule adresse pouvait les occuper entièrement) ; place rendue
  à la FIN du traitement et non à la fermeture de la connexion (des requêtes abandonnées volontairement annulaient la
  limite) ; attente en file plafonnée à 20 s. Mesuré : un voyage de 21 jours / 15 villes obtient ses 56 requêtes sans
  aucun refus, en une trentaine de secondes au lieu d'une dizaine.
- **`/api/hike`** exige désormais un pays connu et des coordonnées valides (sans pays, la route appelait Visorando pour
  n'importe quel nom : relais ouvert, et cache pollué par des recherches sans résultat).
- **Fichiers statiques volumineux** : 30 requêtes par minute et par IP sur `i18n.js`, `trip-data.js`, `app.js` et
  `style.css` — un client refusant la compression pouvait tirer 11 Mo par requête sans aucun quota.
- **Recherche de ville** soumise aussi au budget de calcul global (une recherche à froid lit l'index de façon synchrone :
  jusqu'à ~1 s) ; réponses d'API marquées `Cache-Control: no-store`.
- **Moteur** : un minimum de jours par ville supérieur au nombre de nuits du séjour est ramené au maximum possible (il
  donnait silencieusement moins de nuits que demandé).
- **Interface** : durées en heures pleines affichées « 4 h et 0 min » au lieu de « 4 h » ; libellé du rayon en heures
  réduit jusqu'à tenir dans le champ (tamoul, swahili, ourdou : valeur illisible car coupée) ; boutons de tirage
  visiblement désactivés pendant la roulette ; unité annoncée aux lecteurs d'écran en mode heures ; statistiques au
  singulier selon la langue (« 1 jour · 1 ville · 0 nuitée », « 0 nights » en anglais, formes russes correctes) via
  `Intl.PluralRules` ; plafonds de budget au format de la langue ; caches du navigateur bornés ; une erreur d'affichage
  ne laisse plus les statistiques du voyage précédent à l'écran ; annonce vocale retraduite ; `aria-describedby` mort
  retiré.
- **Dépendance `fontkit`** déclarée explicitement (elle n'était disponible que par héritage de `pdfkit`).

### Trois îles japonaises mal classées (18 septembre 2026)

Les 3 069 lieux retrouvés ci-dessus ont mis en lumière un défaut plus ancien des règles d'îles japonaises
(`ISLAND_RULES.JP`) : une île habitée absente des règles est rattachée à la masse terrestre voisine, et le garde-fou
« pas de route à travers la mer » ne rattrape rien en deçà de 25 km d'eau (`WATER_CHECK_KM`). Mesuré avant correction :
3 tirages sur 25 au départ de Nago plaçaient une étape sur **Izena** atteinte PAR LA ROUTE (22 km de mer).

- **Izena** et **Iheya** ont désormais leur propre masse terrestre, reliées à Okinawa par leurs vraies liaisons :
  ferries municipaux au départ d'Unten (Nakijin), tarifs fixés par arrêté (pas de grille saisonnière ni de surcharge
  carburant) — Izena : adulte 1 840 JPY, voiture 4-5 m 8 480 (conducteur inclus), van 6-7 m 13 880, moto 2 250, 55 min
  ([village d'Izena](https://vill.izena.okinawa.jp/about/access/)) ; Iheya : adulte 2 480, voiture 10 340, van 22 640,
  moto 4 150, 80 min ([village d'Iheya](https://www.vill.iheya.okinawa.jp/soshiki/9/1144.html)). Conversion à
  185,92 JPY pour 1 EUR (InforEuro, septembre 2026), comme les autres liaisons japonaises. **Noho-jima** est reliée à
  Iheya par le pont Noho Ōhashi (320 m) : même masse terrestre, sans traversée.
- **Iwaishima** (Yamaguchi) est **isolée** : la liaison Yanai ↔ Iwaishima est assurée par un navire à passagers de 43
  tonneaux sans pont-garage — aucun tarif véhicule n'existe, les automobilistes laissent leur voiture à quai
  ([mairie de Kaminoseki](https://www.town.kaminoseki.lg.jp/), grille officielle sans ligne « 自動車航送 »). L'île n'est
  donc jamais proposée à un road trip, plutôt que d'inventer une traversée.
- Les 6 lieux d'Iheya, jusque-là chacun sur sa propre « île » (règle par défaut d'Okinawa), donnaient des tirages vides ;
  ils forment maintenant une vraie masse terrestre. Mesuré après correction : Izena et Iheya sont atteintes **par le
  ferry**, 0 saut de masse terrestre sans traversée sur 40 tirages au départ de Nago.

### Ce que le péage ne dit pas (18 septembre 2026)

À lire avec la section ci-dessous. Le montant affiché n'est une estimation que pour les **17 pays** dont un barème
kilométrique a pu être sourcé : France, Espagne, Portugal, Italie, Croatie, Bosnie-Herzégovine, Serbie, Macédoine du
Nord, Grèce, Turquie, Azerbaïdjan, Israël, Japon, Taïwan, Maroc, Tunisie, Sénégal. Partout ailleurs, l'application
n'affiche **aucun** montant de péage — y compris dans des pays qui en ont un, bien réel :

- **Amérique du Nord** : autoroutes à péage des États-Unis (turnpikes du New Jersey, de Pennsylvanie, de Floride…),
  autoroutes 407 ETR en Ontario, réseau *cuotas* mexicain — l'un des plus chers au monde rapporté au kilomètre.
- **Amérique du Sud** : *pedágios* brésiliens, *peajes* chiliens et argentins, très présents sur les grands axes.
- **Asie** : réseau chinois (le plus étendu du monde), Inde (*NHAI*), Indonésie, Malaisie, Corée du Sud, Philippines,
  Vietnam, Thaïlande.
- **Europe** : sections concédées en Pologne (A1, A2, A4), en Irlande (M50 et axes vers le sud), en Norvège
  (~190 postes AutoPASS), au Royaume-Uni (M6 Toll, traversées de la Tamise), plus les grands ouvrages payants
  scandinaves et danois.

Ce silence est un **choix assumé** : aucun de ces réseaux n'a de barème kilométrique national publié qui puisse être
cité, et la règle du projet est de ne jamais afficher un chiffre qu'on ne peut pas justifier. Il vaut mieux ne rien
annoncer que d'annoncer un montant inventé — mais un voyageur qui prépare un trajet en Californie, au Brésil ou en
Chine doit savoir que l'absence de ligne « péage » ne veut PAS dire que la route est gratuite. Les vignettes
(Suisse, Autriche, Slovénie, Tchéquie, Hongrie, Slovaquie, Bulgarie, Roumanie…) sont, elles, traitées à part et bien
affichées, avec le lien officiel d'achat : voir la section « Pays couverts » ci-dessus.

### Septième passe d'audit (18 septembre 2026)

Septième relecture complète, en lecture seule d'abord, puis correction. Cinq constats de fond : trois portent sur des chiffres que
l'application affichait comme des faits sans pouvoir les justifier, le quatrième est un défaut de mise en page
découvert en vérifiant l'export PDF de bout en bout, le cinquième une poignée d'îles que le moteur croyait joignables
par la route.

**1. Le péage était inventé deux fois.** Le tarif français (0,148 €/km en classe 1) était tiré des 24 lignes étiquetées
« Cofiroute » de `public/data/toll-reference.json`, dont **22 ne correspondent à aucun barème publié** : cinq doublons
gonflés d'une liaison VINCI, et un Paris → Reims à 57,60 € quand la grille Sanef affiche **12,60 €** (4,6 fois trop).
Ces lignes sont supprimées. Le fichier ne contient plus que 38 liaisons vérifiées une à une dans les grilles officielles au 1er février
2026 — « Tarifs des principales liaisons » de VINCI Autoroutes (ASF, Cofiroute, Escota), grilles Sanef (A1, A4, A26) et
APRR (A6, A36, A39). Médiane prix ÷ kilomètres : **0,104 €/km** en classe 1 (étendue 0,067 à 0,139), et les classes 2 et
5 suivent les rapports officiels mesurés sur ces mêmes grilles (×1,535 et ×0,604). Le libellé « barème ASF » était faux
même pour les lignes correctes : la grille VINCI couvre trois concessionnaires.

Surtout, le péage était facturé **partout** dans un pays « à péage », dès 60 km, sur la totalité de la distance.
Bastia → Porto-Vecchio (aucune autoroute en Corse), Brest → Quimper (Bretagne gratuite) ou une étape de l'est anatolien
recevaient une facture. Désormais, `scripts/build-toll-grid.js` interroge OpenStreetMap (voies `toll=yes`) et enregistre
dans `data/toll-grid.json` les cases de 0,25° (~28 km) où une voie à péage existe réellement, avec le pays. Le moteur
échantillonne le trait de chaque étape tous les 10 km et ne facture que les kilomètres dont la case porte une voie à
péage, **au barème du pays de cette case**. Ces kilomètres sont d'abord ramenés à l'échelle autoroutière
(`TOLL_ROAD_FACTOR` = 1,17) : les corridors autoroutiers sont plus droits que la moyenne des routes (1,170 mesuré sur
les 38 liaisons de référence, 1,165 mesuré indépendamment avec OSRM), et appliquer un tarif au kilomètre d'autoroute
réelle à une distance estimée avec le facteur général aurait surfacturé le péage d'environ 10 % partout. Vérification
finale sur les 38 liaisons de référence : le montant que l'application afficherait pour chacune, comparé à son prix
officiel, donne un rapport **médian de 0,97** (étendue 0,61 à 1,61 selon les concessions — d'où la mention
« estimation au kilomètre » affichée avec le montant) — ce qui règle du même coup les étapes transfrontalières, jusque-là facturées
en entier au tarif du pays d'arrivée (Suisse → France : 371 km au tarif français, alors que la Suisse n'a aucun péage
kilométrique). Sans le fichier, aucun péage n'est estimé : plutôt rien qu'un montant inventé.
Une case VOISINE compte aussi, soit une tolérance d'environ 28 km autour du trait : le moteur ne calcule pas
d'itinéraire, et la ligne droite s'écarte de l'autoroute réelle (entre Lyon et Marseille, elle passe 20 km à l'est de
l'A7). Sans cette tolérance, le rapport montant estimé / prix officiel des 38 liaisons de référence tombe à une médiane
de **0,54** (le péage était sous-estimé de moitié) ; avec elle, il remonte à **0,97** (q25 0,86 ; q75 1,07). Exemples
mesurés avec le code actuel (9e audit du 18/09/2026) : Lyon → Marseille 33,9 € pour 28,10 € réels, Paris → Lille 24,8 € pour
18,90 €, Toulouse → Bordeaux 26,0 € pour 22,90 €. La contrepartie est assumée : un trajet gratuit qui longe une
autoroute payante peut se voir attribuer quelques kilomètres (mesuré : 7,1 € sur Rennes → Nantes, gratuite, dont le tracé passe à portée de l'A11 et de l'A83).
En revanche, une région sans aucune autoroute à péage — Corse, pointe bretonne, La Réunion — reste bien à 0 €.
La grille complète compte **1 699 cases (28 Ko)** et couvre les 17 pays à barème : FR 426, JP 374, IT 256, TR 115,
ES 95, GR 88, HR 84, MA 76, PT 58, RS 52, TW 28, MK 13, BA 12, TN 8, IL 6, AZ 5, SN 3. Aucun pays à barème n'est
resté vide. À noter : seule la FRANCE a été recalibrée et validée liaison par liaison au 7e audit ; les seize autres
barèmes au kilomètre restent ceux des audits précédents, avec leurs sources, et n'ont pas été revérifiés ici. L'affichage le dit
maintenant (`toll.estimateNote`, traduite dans les 161 langues) : « Estimation au kilomètre : le montant réel dépend des
sections réellement empruntées. »

Deux données tirées au sort dans le moteur ont disparu au passage : le TYPE de péage (« flux libre » / « à barrière »,
choisi à pile ou face avec 25 % de chances) et le « vous gagnez environ N min », issu d'un pourcentage aléatoire entre
15 et 30 % — qui, en prime, RACCOURCISSAIT la durée annoncée du trajet. Le manat azerbaïdjanais était converti à 1,85
AZN/EUR (relevé xe.com périmé) au lieu de **1,9493** (taux officiel de la Banque centrale d'Azerbaïdjan au 17/09/2026) :
les trois classes étaient surestimées d'environ 5 %.

**2. Distances et durées : deux constantes jamais mesurées.** Le facteur routier (`ROAD_FACTOR`, distance par la route =
vol d'oiseau × 1,17) et les vitesses par mode (82 / 81 / 78 / 70 / 85 / 17 km/h) n'étaient sourcés nulle part. Ils le
sont maintenant :

- `scripts/measure-road-factor.js` calcule de VRAIS itinéraires routiers avec OSRM (profil voiture, données
  OpenStreetMap) entre villes de plus de 20 000 habitants tirées des données du projet. Relevé du 17/09/2026, conservé
  dans `data/road-factor-osrm.json` : **128 itinéraires, 16 pays, étapes de 80 à 500 km** — facteur médian **1,287**
  (q25 1,216 ; q75 1,399 ; moyenne 1,327), vitesse moyenne médiane **79,4 km/h** (Europe 85,9). La valeur 1,17
  sous-estimait donc toutes les distances — et donc les durées et le budget carburant — d'environ 10 %. `ROAD_FACTOR`
  passe à **1,287**.
- Les vitesses passent toutes à **80 km/h** pour les véhicules motorisés. Le code de la route ne distingue pas la
  motorisation, et l'article R413-2 (Legifrance, LEGIARTI000042240048) fixe les mêmes limites — 130 / 110 / 80 — pour
  tous les véhicules de moins de 3,5 t, **motos comprises** : rien ne justifiait de faire rouler une moto plus vite
  qu'une voiture, une hybride moins vite qu'une thermique, ni une électrique moins vite encore (son temps de recharge
  est déjà compté à part). Un fourgon aménagé conduit avec le permis B a un PTAC de 3,5 t au plus
  (service-public.gouv.fr F2827) : régime voiture lui aussi. Le vélo passe de 17 à **15 km/h** : « un cycliste standard
  parcourt environ 50 à 60 km par jour à une vitesse moyenne de 15 km/h sans pause » (EuroVelo / European Cyclists'
  Federation, consulté le 18/09/2026), cohérent avec les 65 km/jour d'un itinérant relevés par France Vélo Tourisme.

Mesuré après ces changements, sur 1 140 tirages (5 par pays, 4 modes de transport) : **0 traversée maritime par la
route, 0 saut de masse terrestre sans ferry**, 28 tirages vides sur 1 140 (2,5 %, contre 27 avant), 341 ms au maximum
par tirage.

**3. Robustesse du serveur et deux régressions des audits précédents.**

- L'index de recherche sur disque était lu sans aucune vérification : un index tronqué (disque plein, copie
  interrompue, construction tuée) donnait des lieux vides ou des noms coupés, sans la moindre erreur. Les sept fichiers
  sont désormais vérifiés à l'ouverture (tailles croisées avec `meta.json`, dernier décalage comparé à la taille réelle
  des fichiers de données) et toute lecture courte lève une erreur. Sa construction écrit par boucle
  (`fs.writeSync` peut n'écrire qu'une partie du tampon, et sa valeur de retour était ignorée).
- La grille terre/mer (`lib/land-grid.bin`) échouait à la PREMIÈRE vérification de mer, pas au chargement, et un
  fichier absent ne disait rien du tout — alors que sans elle, plus aucune traversée maritime n'est détectée. En-tête,
  dimensions et longueur de chaque ligne sont vérifiés une fois pour toutes, et l'état des deux grilles (terre/mer et
  voies à péage) est exposé par `GET /api/status`.
- Verrou de construction de l'index : il ne portait que le PID du serveur. Si celui-ci mourait pendant la construction,
  un autre démarrage jugeait le verrou orphelin et lançait une seconde construction dans le même dossier. Le verrou
  porte maintenant les deux PID (serveur puis enfant) et reste « vivant » tant que l'un des deux l'est.
- Arrêt propre ajouté : `SIGTERM`/`SIGINT` laissent finir les réponses en cours (un export PDF de plusieurs secondes
  était coupé net par un redémarrage cPanel), `server.on('error')` donne un message clair si le port est pris, et une
  promesse rejetée sans `catch` ne tue plus le process (~40 s de rechargement pour une simple erreur d'appel sortant).
- **Régression du 3e audit corrigée** : la place dans la file des appels sortants n'était rendue qu'à la fin du
  traitement. Un visiteur qui changeait de page bloquait sa propre IP jusqu'à 30 s (mesuré : 429 au bout de 20,02 s).
  Elle est maintenant rendue 5 s après la fermeture de la connexion — assez pour que l'appel sortant déjà lancé se
  termine, sans qu'une connexion coupée annule la limite. Mesuré après correction : 200 en 4,6 s au lieu d'un refus.
- **Régression du 3e audit corrigée** : le quota des gros fichiers statiques était déclaré APRÈS le service des
  fichiers précompressés, donc les réponses brotli/gzip — le cas normal — n'étaient jamais comptées. Mesuré avant :
  35 requêtes brotli d'affilée toutes servies ; après : 30 servies, puis 429.

**4. Un PDF de 36 pages pour trois jours de voyage.** Découvert en vérifiant l'export de bout en bout : un itinéraire
de 3 jours sortait en **36 à 45 pages**, presque toutes vides, avec une ligne par page et des liens dont le rectangle
cliquable débordait de la feuille (`/Rect [94 -570.11 274.88 791.89]`). La cause est dans `lib/pdf-text.js` : la
fonction qui MESURE la largeur d'un texte le fait à la taille 1000 (largeur par unité, réutilisable à toutes les
tailles) et ne remettait pas la taille d'origine dans pdfkit. L'appelant demandait juste après `doc.currentLineHeight()`
et obtenait **~1 362 points au lieu de 13,6** : chaque ligne « dépassait le bas de page » et déclenchait un saut. Le
défaut ne se produisait qu'à la PREMIÈRE mesure d'un texte donné — ensuite le cache des largeurs répondait sans toucher
au document — d'où un comportement en apparence aléatoire, et une reproduction impossible sans mesurer. La fonction
restaure désormais la police et la taille. Mesuré après correction : le même itinéraire tient sur **1 page**, 21 Ko au
lieu de 37 Ko.

**5. Huit lieux insulaires accessibles par la route.** Vérification lieu par lieu (recensements officiels, longueurs
de voirie mesurées dans OpenStreetMap, recherche d'un ferry transportant les VÉHICULES) : les huit étaient rattachés à
une grande île ou au continent, donc joignables par un trait de route à travers la mer.

| lieu | était rattaché à | réalité | désormais |
| --- | --- | --- | --- |
| Xiaochangshan et 70 autres lieux de l'archipel de Changshan (Dalian) | `continental` | pont de Changshan entre Dachangshan et Xiaochangshan (3 450 m, 2014), mais rien vers le continent : un client-roulier Pikou ↔ Yuanyang dont aucun tarif officiel n'est publié | masse `changshan`, sans liaison |
| Islas de Gigantes, Norte et Sur (Iloilo) | `panay` (code postal 5019) | 13 000 habitants, aucune route entre les deux îles, seulement des pump boats | deux masses distinctes, sans liaison |
| Hagdan et Waga, île de Kinatarkan (Cebu) | `cebu` (code 6047, partagé avec le nord continental de Cebu) | 23,5 km de routes sur l'île, bangkas seulement — le RoRo Hagnaya ↔ Santa Fe dessert Bantayan, 12 km plus loin | masse `kinatarkan` |
| San Vicente (Northern Samar) | `leyteSamar` (code 6419) | municipalité insulaire de 6 928 habitants, un bateau à moteur quotidien, aucun RoRo | masse `sanVicenteSamar` |
| Ko Tarutao (Satun) | `continental` | 18 km de piste du parc national, vedettes à passagers depuis Pak Bara, véhicules du parc seulement | masse `koTarutao` |
| Dahlak Kebir et 20 lieux des Dahlak (Érythrée) | `continental` (aucune règle d'île pour l'Érythrée) | pistes sur place, aucune liaison véhicule publiée depuis Massaoua | masse `dahlakKebir` + îlots isolés |
| Mas et 10 lieux de l'île de Karas (Fakfak) | `newGuinea` | aucune route cartographiée sur l'île, desserte perintis toutes les deux semaines | chaque lieu isolé |
| Chrysí, au sud de la Crète | `crete` (code 72200) | île **inhabitée** (2 habitants en 2011), aucune route, débarquement réglementé (Natura 2000) | lieu isolé |

Aucune liaison n'a été inventée pour autant : là où le seul tarif trouvé venait d'un portail d'information local et non
de l'opérateur (Changshan), la règle du projet s'applique — pas de tarif officiel publié, pas de liaison. Ces îles ne
sont donc plus proposées comme étape d'un road trip, ce qui est la vérité du terrain.

Effet de bord découvert au passage, et corrigé : les règles d'Izena, d'Iheya et d'Iwaishima ajoutées la veille (voir
« Trois îles japonaises mal classées ») avaient été écrites directement dans `public/js/trip-data.js` au lieu des
fichiers sources `scripts/iles/` — la première régénération des règles les a effacées, liaisons comprises. Elles
vivent désormais dans `scripts/iles/iles-audit7.js`, avec le reste. Contrôle après régénération : 128 pays,
621 liaisons, 704 liaisons de ports vérifiées.

**Drapeaux des suggestions de villes.** La liste de suggestions affichait un émoji drapeau devant chaque commune,
pour distinguer d'un coup d'œil deux homonymes de pays différents (le San Marino saint-marinais des sept villages
italiens du même nom). Sous Windows, cet émoji ne s'affiche pas : le système ne fournit aucune image pour les paires
d'indicateurs régionaux et le navigateur retombe sur deux lettres encadrées. Les suggestions utilisent désormais les
mêmes images SVG locales que le sélecteur de langue (circle-flags, licence MIT) : 133 drapeaux manquants ont été
ajoutés, plus 6 codes qui n'existaient chez circle-flags que sous forme d'alias (Sainte-Hélène, Svalbard, îles
mineures américaines, Heard-et-MacDonald, Pays-Bas caribéens, Bouvet), soit **264 fichiers pour 169 Ko** couvrant les
239 pays et territoires. Un fichier manquant ferait revenir l'émoji (repli sur l'événement `error` de l'image).

**Interface, accessibilité et mentions légales.** Les libellés d'unité (`km autour du départ`…) ne pouvaient pas revenir
à la ligne et débordaient dans les langues à formulation longue. La page d'accueil affichait « Tirage en cours… » avant
tout tirage. Les erreurs d'export PDF n'étaient annoncées à aucun lecteur d'écran (`role="status"`, `aria-busy`, et le
focus clavier rendu au bouton). Les couleurs ont été mesurées et corrigées : `--ink-faint` (2,5 à 3,0 alors qu'il sert à
du vrai texte) passe à 4,54-5,38 ; `--tension-orange`, `--accent-2` (icônes) et `--line-strong` (contours de champs,
seuil 3:1 de la règle WCAG 1.4.11) atteignent leur seuil ; l'orange de marque reste inchangé pour les boutons, avec une
variante `--accent-text` lisible quand il sert de couleur de texte. Les grilles passent en `minmax(min(200px, 100%), 1fr)`
(à 200 % de zoom, une colonne de 200 px minimum débordait). Cinq règles `[dir="rtl"]` remettent à l'endroit la flèche
entre les deux dates, le chevron des menus déroulants, la pastille des interrupteurs et la croix de la visionneuse de
photos. Le tracé de la carte reprend les couleurs du thème quand on en change (elles étaient lues au moment du dessin).
Une feuille d'impression a été ajoutée : imprimer la page donnait le formulaire, la roulette et la carte interactive.
Enfin les mentions légales portent le **téléphone de l'hébergeur** (obligatoire, article 6-III-1 de la LCEN), la
politique de confidentialité identifie le **responsable du traitement** (article 13.1.a du RGPD) et ne dit plus que
l'export PDF est envoyé « à votre serveur ». Le pied de page annonce désormais qu'aucune donnée personnelle n'est
**conservée** (et non « collectée ») : l'adresse IP est bien vue par le serveur, une minute au plus, en mémoire vive,
pour limiter le débit — c'est écrit noir sur blanc dans la politique de confidentialité.

**Zones à tension : deux alertes infirmées, une confirmée.** Vérification faite sur les fiches « Conseils aux
voyageurs » de France Diplomatie (consultées le 18/09/2026) : le classement de **Cuba** (orange sur toute l'île) et du
**Honduras** (orange, sauf îles de la Baie, Valle et Copán) est exactement celui de la source — rien à corriger. En
revanche l'exception mexicaine « Ixtapa-Zihuatanejo », un cercle de 12 km, neutralisait le rouge de l'État de Guerrero
sur **53 lieux**, dont une cinquantaine de hameaux de l'arrière-pays que la fiche laisse en rouge. Elle est ramenée aux
deux localités de la station balnéaire (5 et 4 km, 13 lieux), et le libellé rappelle que France Diplomatie ne reconnaît
ces exceptions qu'« à la condition expresse de s'y rendre par la voie aérienne » — condition qu'un itinéraire routier
ne remplit jamais.

### Huitième passe d'audit (18 septembre 2026)

Huitième relecture complète en lecture seule, puis correction de ses six constats. Chaque correction a été mesurée avant
et après, et la non-régression contrôlée sur l'ensemble : 1 140 tirages (5 par pays, 4 modes) donnent toujours
**28 tirages vides, 0 traversée maritime par la route, 0 saut de masse terrestre sans ferry** ; 120 tirages sous
contraintes (distance max entre étapes, rayon, jours) donnent 0 dépassement ; les 161 langues ont toutes leurs clés.

**1. Péage facturé dans des pays qui n'en ont pas** (correction trop stricte, reprise au 9e audit ci-dessous). La tolérance d'une case voisine (voir « Septième passe d'audit »)
ne regardait pas le pays : une étape suisse, slovène ou autrichienne longeant une frontière héritait des cases à péage
françaises ou italiennes d'à côté, au barème de ces pays. Mesuré sur le vrai moteur : **100 % des étapes slovènes et
90 % des étapes suisses** tirées recevaient un péage. Désormais chaque point échantillonné n'est facturé que si le
pays du lieu le plus proche (`countryAtPoint`) est celui de la case, ET que ce pays est l'un des deux pays de l'étape
(départ ou arrivée). Mesuré après : **0 étape facturée à tort sur 1 760 tirages dans 22 pays sans péage kilométrique** ;
les 38 liaisons françaises de référence gardent leur rapport médian estimé / officiel (0,968 ; q25 0,86, q75 1,07) et
les corridors ne bougent pas (Lyon → Marseille 33,7 €, Milan → Bologne 20,2 €, Tokyo → Nagoya 44,1 €, Chambéry → Turin
17,0 € répartis FR + IT, Genève → Lyon 11,6 € côté français seulement, Genève → Lausanne 0 €, Corse et pointe
bretonne 0 €).

**2. Trois générateurs effaçaient des corrections.** Même piège qu'aux îles japonaises : l'exception mexicaine
Ixtapa-Zihuatanejo du 7e audit et six adresses de sources (Donostia, Bergame, Alpe di Siusi, Shanghai, All India
Radio, Cubacasas) n'existaient que dans `public/js/trip-data.js`, pas dans leurs fichiers sources
(`scripts/tension-zones/ameriques.js`, `scripts/transport/van-rules.js`, `scripts/transport/moto-rules.js`,
`scripts/lodging/lodging-afrique-ameriques-oceanie.js`). Sources mises à jour ; preuve : les quatre générateurs
(zones à tension, transport, hébergement, îles) relancés reproduisent `trip-data.js` **à l'octet près**.

**3. 39 déclarations CSS ignorées par le navigateur.** `font: 800 .92rem/1 var(--font-body)` est invalide : un
raccourci `font` ne peut pas contenir un autre raccourci (`--font-body` vaut lui-même « 400 1em/1.55 … »). Le
navigateur rejetait la déclaration entière : boutons, sur-titres et libellés n'avaient jamais la graisse, la taille ni
l'interligne prévus. Remplacées par `font-style` / `font-weight` / `font-size` / `line-height` séparées, SANS
`font-family` — la police reste héritée comme avant, ce qui préserve les polices propres au yi, au tibétain, à
l'éthiopien et au tifinagh. Le seul cas en police manuscrite utilise une nouvelle variable `--font-hand-family`.
Contrôlé à 320 px de large en français, allemand, finnois, tamoul, birman et arabe : aucun débordement.

**4. Verrou de l'index : 30 minutes, puis plus rien.** Un verrou de plus de 30 minutes était jugé orphelin même si sa
construction vivait encore ; sur un hébergement lent, un second démarrage lançait une seconde construction dans le
même dossier. La date du verrou est désormais rafraîchie chaque minute par le serveur et à chaque fichier de pays par
la construction elle-même : « plus de 30 minutes » veut dire « 30 minutes sans signe de vie ». Le serveur ne supprime
plus le verrou que s'il porte encore son propre PID. Testé en conditions réelles (reconstruction complète de 178 s) :
verrou rafraîchi en continu, retiré à la fin par son propriétaire, index identique (17 653 343 entrées).

**5. La mer d'Åland traversée par la route.** Comme au Kvarken, l'archipel de Turku et les Åland forment une chaîne
d'îlots continue sur la grille terre/mer, jusqu'à la côte suédoise : des étapes Turku → Suède passaient « par la
route ». Trois segments de barrière, tracés entièrement en mer (0 point de terre vérifié), coupent désormais
Turku ↔ Suède et Stockholm ↔ Helsinki sans toucher Stockholm ↔ Uppsala ni Turku ↔ Helsinki. Mesuré sur 240 tirages
ciblés (Turku, Helsinki, Rauma, Stockholm, Uppsala, Norrtälje) : 2 traversées avant, **0 après**, aucun tirage vide.

**6. Distance max entre étapes dépassée sans rien dire.** Avec un éloignement minimum renseigné, le premier trajet
(et le retour d'un séjour à une étape) pouvait aller jusqu'à 1,4 fois cet éloignement, au-delà de la distance max
entre étapes — même quand des étapes respectant les deux existaient. Le moteur cherche maintenant d'abord sous la
distance max, et n'élargit qu'en dernier recours ; un dépassement restant est signalé sur le trajet concerné, à
l'écran et dans le PDF (`leg.overMaxLeg`, traduit dans les 161 langues). Mesuré sur 60 tirages par cas :

| distance max / éloignement | trajets au-delà du max, avant | après | dont signalés |
| --- | --- | --- | --- |
| 150 km / 110 km (voiture, 5 jours) | 7 | **0** | — |
| 80 km / 60 km (vélo, 6 jours) | 8 | **0** | — |
| 100 km / 90 km (moto, 5 jours) | 32 | **0** | — |
| 150 km / 110 km (aller-retour dans la journée) | 6 | **0** | — |
| 100 km / 110 km (moto : le max est plus court que l'éloignement) | 53 | 47 | 47 sur 47 |

Aucun tirage vide dans aucun cas, avant comme après, et des temps de calcul inchangés. Seul le dernier cas, où les
deux réglages sont contradictoires, garde des dépassements — tous annoncés au voyageur.

### Neuvième passe d'audit (18 septembre 2026)

Cinq relectures indépendantes (moteur, serveur, interface, données, relecture des deux derniers commits), puis
correction. Quatre constats étaient des **régressions introduites par les corrections du 8e audit** ; les autres
existaient avant. Non-régression contrôlée comme au 8e audit : 1 140 tirages donnent toujours **28 tirages vides,
0 traversée maritime par la route, 0 saut sans ferry** ; 0 dépassement de contrainte sur 120 tirages ; mer d'Åland
toujours 0 traversée sur 240 tirages ; 161 langues complètes et empreintes CSP inchangées.

**Régressions du 8e audit, corrigées.**

- **Péage des pays traversés.** Le 8e audit ne facturait plus que les pays du départ et de l'arrivée : Luxembourg →
  Genève (≈ 430 km d'autoroutes françaises) sortait à 0 €, Barcelone → Gênes oubliait 278 km français. Un pays
  seulement traversé est de nouveau facturé, à deux conditions qui évitent de refacturer la Suisse ou la Slovénie : il
  est traversé sur au moins 30 km d'affilée, et au moins un de ces points est franchement à l'intérieur (sa case de la
  grille des lieux et ses 8 voisines ne contiennent que des lieux de ce pays, `insideCountry`). La seule condition de
  longueur ne suffisait pas : le trait de Genève → Lausanne suit le Léman, dont le lieu le plus proche est sur la rive
  française, et recevait 3,2 €. Mesuré : Luxembourg → Genève 39,8 €, Bâle → Luxembourg 21,1 €, Barcelone → Gênes
  44,1 € (ES + FR + IT), Belgrade → Thessalonique 29,9 € (RS + MK + GR) ; **0 trajet facturé à tort sur 1 760 dans
  22 pays sans péage** ; les 38 liaisons de référence et les corridors inchangés. Limites connues, dues au trait à vol
  d'oiseau : Genève → Aoste ne compte pas la traversée française du Mont-Blanc (trop près de deux frontières), et
  Zagreb → Umag ou Nazareth → Arad sous-estiment le péage, le trait coupant la Slovénie ou la Cisjordanie que la
  route réelle évite.
- **Police des champs de formulaire.** Le remplacement des raccourcis `font` invalides avait laissé les champs en
  Arial (dates en police à chasse fixe) : les navigateurs ne font pas hériter la famille aux `input`/`select`, les
  anciennes déclarations invalides le faisaient par accident. Règle `input,select,textarea{font-family:inherit}`.
- **Passe stricte sautée avec un ferry.** Le raccourci « distance max plus courte que l'éloignement : aucune étape ne
  peut respecter les deux » est faux avec un ferry, où seule la partie routière compte : de Calais (50 km max, 80 km
  d'éloignement), 29 premiers trajets sur 30 dépassaient alors que Whitstable respecte les deux. Mesuré après : Calais
  0 sur 30 à 1 et 3 jours, Bastia (100 / 150 km) 0 sur 30 au lieu de 12 et 18.
- **Journées sur place signalées à tort.** Le petit trajet local d'une journée passée dans la même ville (3 à 14 km)
  déclenchait « imposé par l'éloignement minimum ». Ces journées sont exclues du signalement, et ce trajet local ne
  dépasse plus la distance max entre étapes (24 dépassements silencieux sur 30 tirages à 10 km max avant, 0 après).

**Défauts antérieurs, corrigés.**

- **Quota des gros fichiers contourné par une URL encodée** (`/js/%6918n.js`, `/js//i18n.js`, `/css/../js/i18n.js`,
  constaté au 8e audit) : le quota teste désormais le chemin décodé et normalisé, sans tenir compte de la casse, et une
  telle variante est redirigée (301) vers le chemin normal, précompressé, au lieu d'être recompressée à la volée
  (~1 s de calcul par réponse de 11 Mo). Mesuré en local : 429 à partir de la 31e requête de la minute.
- **Verrou de l'index laissé par une construction orpheline.** Si le serveur mourait pendant la construction, l'enfant
  terminait sans retirer le verrou (réservé au serveur), et un serveur relancé attendait jusqu'à 30 minutes sans moteur.
  L'enfant retire désormais le verrou quand son parent est mort, et le serveur en attente revérifie toutes les 10 s que
  le verrou est vivant (`searchIndexLockAlive`). Bac à sable : le serveur relancé repart à la fin de la construction
  (20 s) au lieu de 30 minutes.
- **Faux message « zones déconseillées ».** Un premier tirage vide suivi d'un second tirage réussi sans filtre suffisait
  à accuser le filtre, même sans aucune zone à la ronde (Lyon, réglages serrés : 6 faux messages et 10 tirages vides sur
  40). Le filtre n'est mis en cause que si le second tirage passe réellement par une zone ; sinon ce second tirage, qui
  respecte le filtre, est proposé. Mesuré : 0 faux message et 2 tirages vides sur 40 ; un départ réellement en zone
  (Acapulco, Maiduguri) reste signalé 40 fois sur 40.
- **Export PDF monopolisé.** Le créneau unique n'était rendu qu'à la fin de l'ENVOI : un client qui ne lisait pas sa
  réponse le gardait 5 s, et recommençait. Il est rendu dès la fin du calcul (`doc.end()`, synchrone). Mesuré : un
  second client obtient son export tout de suite au lieu de 503 pendant 5 s.
- **Budget de mise en page du PDF dépassé de 45 %** : plus aucun texte n'est préparé une fois le budget épuisé (la
  mention « document tronqué » et le pied de page s'écrivent toujours). Un objet forgé en guise de libellé ne coupe plus
  le document, et les motifs `$'`, `$&` d'un texte client ne sont plus interprétés par `replace`.
- **Maximum de jours par ville dépassé sans le dire** (21 jours avec 1 jour par ville : 20 nuits pour 15 villes au
  plus) : avis `days.overMaxPerCity`, affiché à l'écran et dans le PDF, traduit dans les 161 langues (vérifié : avis
  présent exactement quand une ville dépasse le maximum).
- **Mise en page** : barre des avertissements du côté du début de ligne en arabe, persan, ourdou, sorani et divehi
  (`border-inline-start`) ; titre, bouton de lancement et contenu des étapes coupés plutôt que de déborder (malayalam
  à 375 px, basque, shona, xhosa, groenlandais à 320 px — vérifié : aucun débordement à 320 px).
- **Documentation** : exemples de péage du 7e audit recalculés avec le code actuel, rapport médian unique (0,97,
  étendue 0,61 à 1,61), taille de l'index, nombre de règles moto indiennes, et sens variable des dates des zones à
  tension.

**Laissé en l'état, volontairement.** Les deux voies rapides indiennes interdites aux motos sans zone précise
produisent le même avertissement générique (« certaines autoroutes ou voies rapides… ») : il n'est affiché qu'une fois
par pays. Avec un rayon de 3 000 km, environ un tirage sur six atteint le budget de temps de 4 s et le dit
(`timedOut`) : c'est le garde-fou prévu, sans dégradation par rapport aux versions précédentes.

### Dixième passe d'audit et suite de tests (18 septembre 2026)

Six relectures indépendantes (relecture adversariale du commit précédent ; moteur testé par invariants sur ~8 600 tirages ;
serveur route par route ; interface parcours par parcours dans les 161 langues ; données et documentation ; réalisme
des chiffres confrontés aux sources officielles), puis correction. Pour la première fois, les CHIFFRES affichés ont été
vérifiés contre le monde réel, et plus seulement la cohérence du code.

**Suite de tests permanente** (`tests/`, voir `tests/README.md`) : `npm run test:quick` (~2 min), `npm test`
(~5 min), `npm run test:full` (générateurs et 3 000 tirages compris). Elle reprend les vérifications de toutes les
passes d'audit — invariants du moteur (jours, nuits par ville, distance max ou `overMaxLeg` justifié, éloignement,
mer et frontières, ferries, zones à tension, péage, valeurs, retour, état), péage (pays sans barème jamais facturés,
transits, 38 liaisons de référence), performances, serveur réel avec services tiers simulés (en-têtes, quotas, PDF,
file des appels sortants, entrées forgées), 161 langues et empreintes CSP, générateurs reproduits à l'octet près. Elle
a trouvé elle-même deux défauts pendant cette passe (transit alsacien, avertissement de borne après un ferry). Les
passes précédentes corrigeaient avec des scripts écrits pour l'occasion, qui ne testaient que ce qu'ils corrigeaient :
d'où les régressions des 8e et 9e audits.

**Régressions du 9e audit, corrigées.**
- Passe stricte avec ferry : la masse « continental » compte 253 liaisons, si bien que la passe tournait partout —
  échecs faute de temps de 1 à 16 sur 50 tirages intérieurs. Elle n'est plus tentée que si un port est à moins de la
  distance max par la route (`ferryPossibleFrom`) : 0 échec, et Calais ou Bastia gardent 0 dépassement évitable.
- Péage de transit : un trajet intérieur ne traverse jamais un pays tiers (Osijek → Split au barème bosnien : 55
  trajets croates sur 300), ni un trajet entre deux pays voisins (Saarbrücken → Bâle au barème français, 15,9 €).
  Luxembourg → Genève, Barcelone → Gênes, Belgrade → Thessalonique restent facturés sur leur transit réel.
- `overflow-wrap:anywhere` coupait des mots qui tenaient (« GENERATO / R ») : remplacé par `break-word`.
- Pied de page du PDF : il pouvait encore disparaître sans la mention « document tronqué ».

**Chiffres inventés ou faux, remplacés par des valeurs sourcées.**
- Journées sur place : leur « petit trajet local » de 3 à 14 km était TIRÉ AU HASARD, affiché comme une vraie distance
  et compté dans le kilométrage du voyage. Ces journées n'ont plus de trajet.
- Recharge électrique : 25 à 40 min TIRÉES AU HASARD par arrêt → 28 min (médiane ev-database.org de quatre modèles
  récents, recharge de 10 à 80 %, plage de référence de l'ADAC) ; marge 0,75 sans source → 0,70 (10 → 80 %) ; autonomie
  320 km confirmée (ev-database.org). Sources détaillées dans `public/js/trip-data.js`.
- Moto privée d'autoroute : 0,8 sans source → facteur mesuré par pays (`scripts/measure-moto-no-motorway.js`, relevé
  Valhalla/OpenStreetMap dans `data/moto-no-motorway-valhalla.json`) : Corée 0,68, Taïwan 0,58, Viêt Nam 0,85,
  Pakistan 0,87, Thaïlande, Indonésie et Sri Lanka 1,00. Limite : 5 trajets par pays.
- Péage des 17 pays : barèmes recalculés sur les grilles officielles 2026 (sources et liaisons dans
  `TOLL_RATE_BY_COUNTRY`), classes van et moto propres à chaque pays. Écarts corrigés : Portugal ×2,8 (le taux venait
  de l'A22, gratuite depuis 2025), Turquie ÷4,4 (le taux venait d'une autoroute privée ; KGM retenu, autoroutes privées
  désormais sous-estimées), Israël ×1,75, Bosnie-Herzégovine ÷1,7, Macédoine du Nord, Sénégal, Croatie, Japon ; moto au
  tarif voiture en Espagne et en Italie, fourgon au tarif voiture au Japon, en Espagne, en Israël et en Azerbaïdjan,
  fourgon ×2,5 à ×2,8 en Grèce et en Macédoine du Nord. Mesuré : Istanbul → Edirne 3,6 € (officiel ≈ 3 €, 15,9 € avant),
  Lisbonne → Porto 32,1 € (25,05 €, 11,6 € avant), Tokyo → Nagoya 39,7 € (≈ 40 €), Belgrade → Niš 11,8 € (10,05 €).
- Seuil « pas de péage sous 60 km », sans source : remplacé par une longueur facturée minimale d'une case de la grille
  d'affilée (~28 km). Espagne : case exacte seulement (réseau payant clairsemé, bordé d'autovías gratuites) —
  Madrid → Séville 15,3 → 8,6 €, Málaga → Grenade 7,3 → 0 €. Erreurs résiduelles connues, dues au trait à vol d'oiseau
  (le moteur ne calcule pas d'itinéraire) : Madrid → Barcelone 20,3 € (A-2 gratuite réelle), Limoges → Brive 8,4 €
  (A20 gratuite), Zagreb → Split et Athènes → Thessalonique sous-estimés ; AP-68 gratuite en Aragon et Navarre à partir
  du 11/11/2026 non modélisée.
- Hébergement : base 70/130/260 € sans source → 100/150/340 € (INE espagnol ramené à la moyenne de l'UE par l'indice
  Eurostat « restaurants et hôtels »), ajustée au pays de l'étape dans la zone euro ; le plafond ne dépend plus de la
  devise choisie (20 000 HUF ≈ 55 € ou 250 CHF ≈ 264 € pour une même nuit en France) : il est calculé pour le pays de
  l'étape puis converti aux taux de la BCE (`lodgingPriceCap`, partagé par le serveur et le navigateur).
- Ferries : aucun prix affiché sans grille officielle datée de l'exploitant. Prix sourcés ajoutés (Jadrolinija, Gozo
  Channel, Caronte & Tourist, TESO, Doeksen, Wagenborg, Levante, Saronic Ferries, Skyros Shipping, GESTAŞ…) ; tarifs à
  la réservation (Corse, Baléares, Sardaigne, Manche, Pirée, Ceuta, Melilla, Bornholm, Gotland…) : « tarif non
  communiqué ». Plus aucune classe déduite d'une autre par un ratio. Vlieland et Schiermonnikoog, interdites aux
  voitures des visiteurs, n'ont plus de liaison. Distances aberrantes corrigées (Corfou, Céphalonie, Ithaque, Andros,
  Jersey). 25 bacs norvégiens gratuits l'hiver mais payants l'été : « tarif non communiqué ».
- Données de lieux : 25 lieux rangés dans le mauvais pays, 132 lieux disparus « (historical) », 32 bases antarctiques
  rangées en Argentine, Sercq, 7 fiches dont le nom était un commentaire d'éditeur, 8 noms indiens aux caractères perdus
  (4 corrigés d'après GeoNames, 4 retirés) — corrigés dans les générateurs (`scripts/communes-corrections.js`) ;
  alias nettoyés (caractères de direction invisibles, ponctuation parasite).

**Serveur.** Jetons de statistiques, sous-titre et bandeau des pages du PDF soumis au budget (8 statistiques
tibétaines gelaient le process 5 à 10 s) ; objets forgés neutralisés dans tout le corps de l'export ; requête
abandonnée pendant son attente retirée de la file (elle bloquait son adresse 20 à 30 s) ; réponses tierces bornées à
8 Mo ; refus 403 de Wikipédia et pages Visorando inattendues jamais mis en cache ; délais de connexion (en-têtes 15 s,
requête 30 s, inactivité 2 min) ; verrou d'index illisible de nouveau récupérable ; recherches mises en cache ; codes
postaux à tiret (« cn-110000 ») de nouveau trouvés ; crédit photo (auteur, licence) fourni par `/api/photo` ;
entités HTML robustes. Limite assumée : le moteur est synchrone et tient ~3 Go en mémoire, il ne peut pas être isolé
dans des workers sur l'hébergement mutualisé — quelques adresses qui enchaînent des tirages lourds peuvent encore
occuper le process.

**Moteur.** Budget de 4 s tenu (6,5 s mesurées avant) ; diagnostic « éloignement introuvable » conservé ; entrées
typées strictement ; moto sur les îles taïwanaises ; avertissement de borne après un ferry ; zones à faibles émissions
et à trafic limité rattachées à leur ville (10 zones sur 133 n'étaient jamais signalées ; ZBE d'Ourense placée à 30 km
de la ville).

**Interface.** Suggestion périmée sélectionnable, panneaux hors écran sur mobile, année des dates coupée, validation
native du navigateur remplacée par une validation traduite, crédit photo complet, contrastes (bouton principal 4,77:1),
devise sans stockage local, recherche de randonnée sans fin, nombres et duel arabe localisés, liens Airbnb et Booking
dans la langue de l'interface, textes de carte traduits, accessibilité (dialogues, boutons ±, champs en erreur),
impression, textes indicatifs trop longs. 12 nouvelles clés dans les 161 langues ; le yi reçoit le chinois pour ces
clés, faute de traduction fiable.

### PDF traduit dans les 161 langues (17 septembre 2026)

Le PDF mélangeait le français du serveur et la langue de l'interface, avec les 14 polices standard PDF (Helvetica,
Times) incapables d'afficher le cyrillique, le grec, l'arabe, les écritures d'Asie ou même « ł ».

- **Textes** : le navigateur envoie chaque ligne déjà traduite (`texts` du document et de chaque étape), composée avec
  les mêmes clés que le journal de bord, plus deux clés propres au PDF (`pdf.subtitle`, `pdf.generated`) ; le serveur
  ne traduit rien, garde le français en repli (texte absent ou non textuel) et contrôle toujours lui-même liens (hôtes
  autorisés), montants, avertissements et nombre de lignes. Langue du document : `lang`, validée contre la liste des
  langues de l'interface. Noms propres (« CAP SUR L'INCONNU », sources) identiques partout.
- **Polices** : Noto embarquées dans `pdf-fonts/` (≈ 26 Mo, licence SIL OFL 1.1, détail et sources dans `pdf-fonts/README.md`) —
  latin/grec/cyrillique (normal et gras), arabe, hébreu, thâna, devanagari, bengali, tamoul, malayalam, cingalais, thaï,
  lao, khmer, birman, géorgien, arménien, éthiopien, tibétain, yi, et CJK japonais / chinois simplifié / chinois
  traditionnel / coréen. Seuls les glyphes utilisés sont incorporés (PDF de 30 à 80 Ko).
- **Mise en page** (`lib/pdf-text.js`) : police choisie caractère par caractère (ponctuation rattachée à la police
  voisine), algorithme bidirectionnel Unicode (`bidi-js`) avec page entière en miroir pour l'arabe, le persan, l'ourdou,
  le kurde sorani et le divehi (frise, puces, alignement), coupure des lignes par `Intl.Segmenter` (chinois, japonais,
  thaï, lao, khmer, birman sans espaces). Ordre visuel vérifié contre l'implémentation de référence de `bidi-js`.
- **Contournements de bibliothèques** : fontkit plantait sur les ancres nulles du khmer (autorisées par OpenType) ;
  pdfkit mettait en forme chaque mot séparément (mots arabes et hébreux dans le désordre, espaces perdues) et, avec
  `lineBreak: false`, créait un lien de largeur NaN qui laissait le document inachevé (réponse HTTP sans fin) — liens et
  soulignements sont donc posés par `drawText`, et une réponse PDF non terminée est coupée après 15 s.
- **Performance** : polices lues et analysées une fois au démarrage (`/api/status` → `pdfFonts`), puis partagées entre
  documents (sans cela, arabe ~3 s et hindi ~1,8 s par export) ; largeurs de texte mémorisées par document (sans ce
  cache, chaque caractère était mis en forme quatre fois). Un export réel coûte 0,1 à 1,3 s selon l'écriture (dzongkha
  puis bengali les plus lents), compté dans le budget de calcul. Empreinte mémoire des polices : ~140 Mo résidents
  (26 Mo de fichiers plus les tables OpenType analysées), sur un process qui atteint ~2,3 Go avec les lieux.
- **Déploiement** : `npm install` (dépendances `bidi-js` et `fontkit` — cette dernière n'était disponible que par
  héritage de `pdfkit`), et règle `pdf-fonts` ajoutée au bloc `.htaccess-security-block.txt` (Apache sert la racine du
  dépôt : sans elle, les 26 Mo de polices seraient téléchargeables). **Ne pas bloquer `fonts`** : `/fonts/…` est servi
  par Node depuis `public/fonts/` pour l'affichage du site (tifinagh, éthiopien, tibétain, thâna, yi).
- **Limites** : pas de gras hors latin/grec/cyrillique (Noto gras non embarqué pour les autres écritures) ; noms de lieux
  dans une écriture non couverte (ex. syriaque, n'ko, gurmukhi, gujarati, oriya, telugu, kannada) affichés en carrés ;
  la qualité des traductions de `pdf.subtitle` / `pdf.generated` est faible pour les langues rares (liste de l'agent).
- **Protections de l'export** (3e audit du 17/09/2026) : corps limité à 32 ko (un corps de 109 ko en hindi, sous
  l'ancienne limite de 128 ko, demandait 20 s de mise en page — process bloqué pour tous pendant ce temps) ; budget de
  mise en page de 3,5 s (`PDF_BUILD_BUDGET_MS`) au-delà duquel le document s'arrête avec la mention « document tronqué »
  (clé `pdf.truncated`) ; plafond de puces par étape renommé `PDF_MAX_BULLETS_PER_LEG` (il ne bornait que leur nombre,
  jamais leur longueur) ; pagination des paragraphes longs (des lignes s'écrivaient sous le bas de page et étaient
  perdues) ; mot plus large que la colonne coupé par graphèmes même en milieu de ligne ; caractères miroirs remplacés
  dans tous les segments de droite à gauche (« (20000) » sortait « (20000( » en divehi) ; police tifinagh ajoutée
  (l'amazighe `zgh` sortait entièrement en carrés) ; lien Airbnb restreint à l'hôte exact produit par le moteur
  (`airbnb.zip`, `airbnb.top`… étaient acceptés).

### Pas de route à travers la mer (septembre 2026)

Le moteur mesure les distances à vol d'oiseau × 1,17 (depuis : × 1,287, `ROAD_FACTOR`, voir « Septième passe d'audit ») et ne connaît que les masses terrestres : deux pays de la même masse
(Croatie et Italie, Estonie et Finlande, Danemark et Allemagne…) étaient reliés PAR LA ROUTE à travers la mer. Mesuré le
17/09/2026 sur 1 140 tirages réels (5 par pays) : 3,5 % des voyages contenaient une telle étape (Split → Pescara,
Tallinn → Helsinki, Rostock → Zélande, Dahab → Ras Gharib, Dhahran → Qatar, lac Malawi…).

- **Grille terre/eau** `lib/land-grid.bin` (223 Ko, pas de 0,05°) construite par `scripts/build-land-grid.js` depuis
  [Natural Earth](https://www.naturalearthdata.com) 1:10m (domaine public) : terres + petites îles − lacs ; une case
  traversée par un trait de côte compte comme terre (anneaux d'atolls, flèches). Reconstruction : télécharger
  ne_10m_land, ne_10m_lakes et ne_10m_minor_islands (naciscdn.org), puis `node scripts/build-land-grid.js <dossier>`.
- **Règle** (`roadCrossesWater`, `lib/trip-engine.js`) : une étape par la route dont le trait passe au moins 25 km
  d'affilée sur l'eau (ou coupe une barrière) n'est acceptée que s'il existe sur la grille un chemin par la terre d'au
  plus 1,8 fois la distance (A*, `landPathKm` dans `lib/land-grid.js`). Les contournements courts restent permis
  (lagune de Bardawil entre Gaza et Le Caire, lacs finlandais, estuaires du Sénégal) ; les vraies traversées sont refusées.
- **Ponts et chaussées longs** (`FIXED_LINKS`, extrémités relevées sur OpenStreetMap) : Hong Kong–Zhuhai–Macao, baie de
  Hangzhou, Lake Pontchartrain, Chesapeake Bay, baie de Jiaozhou, Donghai, Øresund, Grand Belt, Confédération, Penang
  (deux ponts), Rio–Niterói, Vasco de Gama, roi Fahd, Cheikh Jaber. **Barrières** (`BARRIERS`) : Kvarken, dont les îlots
  forment une chaîne sur la grille alors qu'aucune route ne relie Umeå à Vaasa (ferry Wasaline) ; mer d'Åland (8e audit),
  dont l'archipel de Turku et les Åland forment de même une chaîne continue jusqu'à la Suède.
- **Retour d'un tirage interrompu** : `legAllowed` vérifie désormais aussi la masse terrestre, la frontière réelle et
  l'option ferry — le retour vers le départ pouvait sinon relier deux masses sans ferry (Calabre → Gozo).
- **Limites** : la grille ignore les rivières sans pont et les reliefs ; un chemin terrestre n'est pas forcément une route
  (désert, forêt) ; un bras de mer de moins de ~5 km sans pont reste franchissable.

### Ports géolocalisés et distance maximale entre étapes (septembre 2026)

Un trajet avec traversée compte aussi sa **partie par la route** dans la distance maximale entre étapes (80 km par
défaut à vélo) : du point de départ au port le plus proche de sa rive, puis du port le plus proche de l'arrivée jusqu'à
celle-ci (paires de ports réellement desservies quand elles sont connues). Avant, n'importe quel lieu de l'autre rive était accepté (à vélo : Sapporo → Yokohama, Lyon → Corse en une
journée).

- **Données** : `FERRY_PORTS` dans `lib/ferry-ports.js` (réservé au serveur, jamais livré au navigateur), construit par `scripts/build-ferry-ports.js` depuis
  `scripts/ferry-ports/ports-*.js` puis `scripts/ferry-ports/corrections.js` — les 702 liaisons (699 de `FERRY_ROUTES`
  et 3 de `SEA_CROSSINGS`), 1 559 ports (comptés par rive de liaison ; 1 154 emplacements distincts) au 18/09/2026, chacun avec
  la source qui établit que la ligne le dessert (URL des commentaires de FERRY_ROUTES, sites des opérateurs). Recherche
  d'un lieu : `node scripts/ferry-ports/find-port.js <PAYS> "<nom>"` (ou `--near lat,lon`).
- **Coordonnées** : celles des données de lieux du projet (GeoNames et sources nationales), ou du **quai OpenStreetMap**
  (terminal `amenity=ferry_terminal`, extrémité d'une `route=ferry` ou quai nommé, identifiant d'élément cité) pour les
  57 ports dont la localité était loin du quai ou absente des données (Okushiri, Valdez, K'gari, Olkhon, Landeyjahöfn,
  Punta Delgada, Lifou, Maré, Île des Pins, Chiloé…). Le constructeur refuse un lieu introuvable, ambigu, situé sur une
  autre masse terrestre (`landmassOf`, ou `zoneOf` pour Ceuta, Melilla et Kaliningrad) ou un quai à plus de 60 km de sa
  localité ; un quai que les règles d'îles rangent sur l'autre rive (règles trop grossières à cet endroit) doit être
  justifié (`sideNote`).
- **Paires desservies** : pour les 19 liaisons à plusieurs ports sur chaque rive (Corse, Sardaigne, Sicile, Baléares,
  Manche, mer d'Irlande, Åland, îles grecques et croates…), seules les paires de ports réellement exploitées en 2026 sont
  envisagées (ex. plus de Nice ↔ Porto-Vecchio fictif) ; ports retirés faute de ligne (Calvi, Reggio de Calabre pour les
  véhicules) et ajoutés (Sète, Civitavecchia, Toulon ↔ Alcúdia, Rotterdam ↔ Hull, Tallinn ↔ Mariehamn), sources à l'appui.
- **Voiture électrique, péages, moto** : chaque partie routière (jusqu'au port, depuis le port) est traitée comme une
  étape ordinaire — bornes de recharge réelles exigées et arrêts affichés, péages comptés, vitesse réduite de la moto sans
  autoroute ; la nuit de repos du premier trajet compte ses heures de route (hors traversée).
- **Affichage** : une étape avec ferry montre la partie par la route puis la traversée (« ~ 2h13 de route · 38 km + ~ 8h30
  de traversée · 250 km »), sur le site comme dans le PDF, avec les libellés déjà traduits ; le total du voyage l'inclut.
- **Limites** : Saint-Laurent-du-Maroni (lieu = centre de la vaste commune, quai à 61 km) et Surumatra (Kurupukari, quai
  à 71 km) gardent le centre de leur localité, cohérent avec les coordonnées des étapes ; une liaison regroupant plusieurs
  lignes (ex. Continent ↔ Grande-Bretagne) affiche le nom, la durée et le prix de sa ligne de référence (Douvres ↔ Calais)
  même quand la partie par la route est estimée via une autre paire réellement desservie (Rotterdam ↔ Hull) ; la partie
  par la route est estimée à vol d'oiseau × 1,287 (`ROAD_FACTOR`) comme le reste du moteur ; `build-island-rules.js` vérifie à la fin que
  toutes les liaisons ont leurs ports.
- **Règles d'îles recalées sur les contours OpenStreetMap** (bandes de 0,01° de latitude, marge ~300 m) pour Olkhon
  (relation/2734482), K'gari (relation/6661024) et la Grande Île de Chiloé (relation/2711509) : les boîtes uniques
  d'avant englobaient la rive continentale d'en face (quais de MRS/Sakhiurta et de Pargua) ou laissaient la pointe sud
  de K'gari (Hook Point) sur le continent. Aucun lieu existant ne change de masse ; les justifications `sideNote` de ces
  trois quais ne sont plus nécessaires.
- **Corrigé au passage** : Roomassaare ↔ Abruka part de Saaremaa et Småge ↔ Finnøya de Gossa, pas du continent ;
  Storstein ↔ Nikkeby dessert Laukøya et Storstein ↔ Lauksundskaret Arnøya (liaisons et libellés inversés) ; Pärnäs est
  côté Nagu et Retais côté Korpo ; Batulicin ↔ Garongkong fait au moins 413 km (écart entre les terminaux OpenStreetMap),
  pas 242 (`scripts/iles/iles-baltique.js`, `scripts/iles/ferries-asie.js`) ; îles Wadden : durée propre à chaque ligne
  (Vlieland ~1 h 35, Terschelling ~2 h, Ameland ~50 min, Schiermonnikoog ~45 min, sources Doeksen et Wagenborg) au lieu
  des 20 min et 5 km de Texel pour toutes ; Dyrøy ↔ Sørburøy (27 km) et Kilboghamn ↔ Nordnesøy (28 km) au lieu de 8 et
  7 km (durées non vérifiées) ; ports recalés sur leur quai pour Nagu (Prostvik), Arnö et Olkhon ; libellé de la liaison
  Continent ↔ Ikaria ajouté dans les 161 langues (il manquait partout).

Une île n'est jamais reliée au continent par la route : le moteur de distance (vol d'oiseau × 1,287,
`ROAD_FACTOR` — voir `roadDistanceKm` dans `lib/trip-engine.js` ; 1,17 n'est plus que le facteur des corridors
autoroutiers, `TOLL_ROAD_FACTOR`, pour le péage) n'a par nature aucune idée de la mer. Sans ce qui suit, un
trajet pouvait "traverser" la Méditerranée ou l'Atlantique comme une route normale, silencieusement
faux. Décoché par défaut (comme "Autoroutes à péage autorisées", juste au-dessus dans le
formulaire) — le tirage au sort reste alors confiné à la même masse continentale du début à la fin.

- **Coché**, le tirage peut inclure la **Corse**, les **Baléares**, les **Canaries**, les **îles
  Wadden** (Pays-Bas — Texel, Vlieland, Terschelling, Ameland, Schiermonnikoog), la **Sardaigne**,
  la **Sicile**, **Malte**, **Gozo**, **Jersey** ou **Guernesey**, reliées au continent (ou, pour
  Gozo/les îles Anglo-Normandes entre elles, à leur île voisine) par une vraie ligne de ferry réelle
  (durée et tarif fixes par ligne, voir `FERRY_ROUTES` dans `app.js` — pas un calcul au km/heure
  comme la route, un ferry ne va pas plus vite avec un moteur plus puissant). Fonctionne pour tous
  les modes de transport, y compris le vélo (tarif piéton avec vélo, moins cher qu'une place
  véhicule) — contrairement au péage autoroutier, qui lui reste interdit au vélo. Pour les îles
  Wadden spécifiquement, un seul tarif (celui de TESO/Texel, la ligne la plus "classique" en
  voiture) est réutilisé pour les quatre autres — leurs traversées réelles (Doeksen, Wagenborg) sont
  nettement plus chères et l'accès en voiture souvent plus restreint en pratique : approximation
  plus grossière que pour la Corse/les Baléares/les Canaries sur ces quatre-là spécifiquement. La
  Sicile est un cas à part parmi les traversées longues : le détroit de Messine ne fait que ~3 km,
  une traversée courte (~20-25 min) bien plus proche du profil des îles Wadden que de la Corse —
  aucun pont routier n'existe à ce jour (2026), le projet "ponte sullo Stretto di Messina" étant
  encore au stade de l'autorisation administrative (mise en service visée au plus tôt 2033-2034).
  Malte se décompose en DEUX masses distinctes — l'île principale et Gozo, séparées par le canal de
  Gozo (traversée très courte, ~25 min, Gozo Channel Line) — reliée elle-même au continent via
  Pozzallo (Sicile), seul opérateur (Virtu Ferries, quasi-monopole, tarifs plus élevés que les
  liaisons méditerranéennes concurrentielles malgré une traversée bien plus courte). Jersey et
  Guernesey sont, elles aussi, deux masses distinctes reliées chacune au continent (Saint-Malo,
  Condor Ferries) ET reliées entre elles par une ligne inter-îles. Condor Ferries dessert aussi
  Jersey/Guernesey depuis Poole/Portsmouth, au Royaume-Uni (désormais couvert, voir "Pays couverts")
  — liaison non modélisée pour l'instant, limitation assumée plutôt qu'un oubli : hors du périmètre
  explicite de l'ajout du Royaume-Uni (Douvres-Calais, voir plus bas), à ajouter séparément si besoin.
  Sercq (Sark), dépendance du bailliage de Guernesey, est explicitement EXCLUE de
  `communes-gg.txt` — d'abord par nom (`SARK_EXCLUDE_NAMES` dans `scripts/build-country-communes.js`), ce qui
  laissait passer 14 hameaux de l'île, puis, depuis le 18/09/2026, par zone : la boîte de la règle d'île « sark »
  (`SARK_BOX`, `scripts/communes-corrections.js`) : l'île est
  un site sans voiture (aucune liaison en ferry pour véhicules n'existe, pour personne), une
  destination réellement impossible pour tous les modes de transport couverts ici — contrairement
  aux îles Wadden, dont l'accès en voiture reste restreint en pratique mais bien réel.
- **Croatie** : le plus gros ajout en nombre de lignes jusqu'ici — **onze îles** habitées, chacune sa
  propre masse continentale (Cres+Lošinj, Rab, Ugljan+Pašman, Dugi otok, Brač, Šolta, Hvar, Vis,
  Korčula, Mljet, Lastovo), desservies par Jadrolinija (Rab par Rapska Plovidba), tarifs officiels
  haute saison 2026. Quand une île est desservie par plusieurs lignes réelles, la plus COURTE est
  retenue plutôt que la plus longue au départ direct de Split/Zadar (même logique que le détroit de
  Messine pour la Sicile) — notamment pour Korčula/Hvar/Mljet, désormais accessibles par un court saut
  depuis la presqu'île de Pelješac, elle-même reliée au continent par un vrai pont routier depuis 2022
  (pont de Pelješac) et donc déjà "continent" dans ce modèle. Cres/Lošinj et Ugljan/Pašman sont, comme
  Jersey/Guernesey, deux îles reliées entre elles par un pont mais formant chacune une seule masse
  avec sa voisine (Cres↔Lošinj à Osor, Ugljan↔Pašman à Ždrelac) : une seule ligne de ferry à modéliser
  par paire. Krk/Pag/Vir/Čiovo, elles, sont déjà reliées au continent par un vrai pont routier —
  correctement traitées comme "continent", sans entrée dédiée.
- **Royaume-Uni** : contrairement à toutes les îles ci-dessus, ce n'est pas ici une île secondaire qui
  se détache d'un pays par ailleurs "continent" — le pays TOUT ENTIER est la masse insulaire
  (`greatBritain`), reliée au continent par la ligne réelle la plus courte et la plus empruntée
  d'Europe : **Douvres-Calais** (DFDS/P&O Ferries/Irish Ferries, ~34 km, ~1h30, voiture dès ~94 €).
  Seule exception géographique à l'intérieur même du Royaume-Uni : l'**Irlande du Nord**, dont les
  six comtés sont sur l'île d'IRLANDE et non sur celle de Grande-Bretagne (aucune route ne relie les
  deux à travers la mer d'Irlande) — identifiés par leur préfixe de code postal `BT` (zone de
  Belfast, exclusif à l'Irlande du Nord, vérifié sur les 651 communes concernées) et étiquetés
  `ireland` par anticipation de l'ajout de la République d'Irlande (même île, aucune mer entre les
  deux). En attendant cet ajout, ces communes restent temporairement injoignables depuis le reste du
  Royaume-Uni plutôt que faussement reliées par la route — même principe que les Açores/Madère ou
  Sercq ci-dessus : rester silencieux plutôt qu'afficher un trajet inventé.
- **Irlande** : rejoint elle aussi la masse `ireland` (voir ci-dessus) SANS aucune subdivision interne
  — contrairement au Royaume-Uni voisin, tout le pays tient sur une seule île, aucun cas particulier à
  gérer. Reliée à la Grande-Bretagne (pas directement au continent) par **Holyhead-Dublin**
  (Stena Line/Irish Ferries, ~110 km, ~3h15, voiture dès ~179,50 €) — préférée à Fishguard-Rosslare
  (plus longue et plus chère), même logique que "choisir la traversée la plus courte" déjà appliquée
  au détroit de Messine ou aux ponts-relais de Pelješac. Un trajet France → Irlande passe donc par
  DEUX traversées distinctes (Douvres-Calais puis Holyhead-Dublin), chacune un jour différent —
  cohérent avec le moteur d'étapes existant, chaque traversée reste indépendante.
- **Île de Man** : troisième et dernière île britannique de cette série (avec la Grande-Bretagne/
  l'Irlande du Nord et la République d'Irlande) à tenir sur une seule masse `isleOfMan`, sans
  subdivision interne. Reliée elle aussi à la Grande-Bretagne (pas au continent) par
  **Heysham-Douglas** (Isle of Man Steam Packet Company — seul opérateur, quasi-monopole depuis
  1830 — MV Manxman, fast-craft, ~130 km, ~3h45, voiture dès ~98,50 £/~117 €).
- **Danemark** : une seule île concernée, **Bornholm** — le Jylland/la Fionie/le Sjælland (avec
  Copenhague) forment eux une seule masse `continental`, reliés entre eux par de VRAIS ponts routiers
  (voir "Pays couverts" ci-dessus). Bornholm, elle, n'a AUCUN pont : seule liaison réelle pour
  véhicules aujourd'hui, **Ystad (Suède) ↔ Rønne** (Bornholmslinjen, seul opérateur, ~1h20, 4
  rotations/jour, voiture dès 599 DKK/~80 € au tarif "Flex" standard modifiable — pas le tarif
  "Lowprice" promotionnel non remboursable à 99 DKK). L'ancienne ligne directe Køge-Rønne depuis le
  Sjælland a fermé au trafic véhicules. Identifiée par le préfixe de code postal danois `37`
  (3700-3790), exclusif aux 9 codes postaux de la commune de Bornholm (vérifié sur l'ensemble de
  `communes-dk.txt`). Autres îles danoises sans pont (Ærø, Samsø, Fanø, Læsø…) volontairement laissées
  de côté pour l'instant — même limite assumée que pour la douzaine de petits îlots croates non
  modélisés, voir plus haut.
- **Norvège** : AUCUNE nouvelle ligne modélisée dans ce passage, un choix délibéré plutôt qu'un oubli.
  Son littoral fjordé compte d'innombrables traversées réelles, mais la plupart sont des prolongements
  fonctionnels du réseau routier national (ex. les ferries de la E39, la "route côtière sans ferry" en
  projet) plutôt que de vraies escapades insulaires comparables à la Corse/aux Baléares/à Bornholm ; les
  rares îles véritablement significatives (Lofoten, Senja, Hitra/Frøya...) sont aujourd'hui reliées par
  pont ou tunnel plutôt que par ferry. Toute la Norvège reste donc `continental` dans ce modèle — à
  reconsidérer si une ligne précise s'avère pertinente dans un passage futur.
- **Suède** : une seule île concernée, **Gotland** — Öland, elle, est reliée au continent par un vrai
  pont routier depuis 1972 (Ölandsbron), déjà `continental` sans entrée dédiée. Gotland n'a AUCUN pont :
  seule liaison réelle pour véhicules, **Nynäshamn ↔ Visby** (Destination Gotland, seul opérateur,
  ~3h15, voiture jusqu'à 5 passagers dès 1250 SEK/~112 € au tarif standard "Alla+bilen" sur départs
  sélectionnés, destinationgotland.se/priser-bokningsinfo ; passager seul dès 399 SEK/~36 €, repris ici
  comme tarif "foot"). Identifiée par le préfixe de code postal suédois `62` (620-624), exclusif à la
  région Gotland (les codes postaux suédois s'écrivent "XXX XX" avec un espace — le préfixe testé porte
  sur les trois premiers chiffres). Testé en direct : un trajet Visby → continent a bien déclenché la
  ligne de ferry avec le bon tarif/la bonne durée affichés.
- **Finlande** : contrairement au Danemark/à la Suède, ce n'est pas une île secondaire qui se
  détache d'un pays par ailleurs continental — les **îles Åland**, tout comme Guernesey/Jersey/l'île
  de Man pour le Royaume-Uni, sont un PAYS distinct dans ce modèle (`AX`, voir "Pays couverts"), donc
  déjà une masse continentale à part entière (`aland`) sans le moindre calcul de préfixe ou de
  coordonnées nécessaire — tout `AX` est `aland`, un cas encore plus simple que Guernesey/Jersey (un
  seul opérateur, une seule ligne). Seule liaison réelle pour véhicules : **Turku ↔ Mariehamn**
  (Viking Line, seul opérateur avec ligne directe régulière — Tallink Silja dessert Mariehamn mais
  uniquement en escale sur sa ligne Helsinki-Stockholm), MS Viking Grace (motorisation GNL), ~5h,
  2 rotations/jour toute l'année. Viking Line ne publie pas de grille tarifaire simple pour les
  véhicules (renvoie vers son moteur de réservation) : voiture estimée ~150 €, passager seul ~19 €
  (agrégateurs 2026) — échantillon moins précis que pour les autres lignes de cette section, à
  affiner si un barème officiel devient disponible. La Finlande elle-même n'a aucune autre île sans
  pont significative, aucun autre cas `landmassOf` nécessaire. Testé en direct : un trajet
  Mariehamn → continent a bien déclenché la ligne avec le bon tarif/la bonne durée affichés.
- **Monténégro, Albanie, Kosovo** : AUCUNE nouvelle ligne modélisée. Les deux premiers ont bien une
  façade adriatique, avec de vraies liaisons ferry vers l'Italie (Bar-Bari/Ancône pour le Monténégro,
  Durrës-Bari/Ancône pour l'Albanie) — mais ces liaisons relient deux points déjà `continental` (la
  masse continentale européenne connectée par la route couvre déjà l'Italie ET les Balkans via la
  Croatie/la Bosnie-Herzégovine/la Serbie/la Macédoine du Nord), pas une île détachée : hors du
  périmètre de ce mécanisme, comme n'importe quel autre ferry international non modélisé entre deux
  pays du continent. Ni le Monténégro ni l'Albanie n'ont d'île habitée significative sans pont/route
  (Sveti Stefan, au Monténégro, est un îlot-presqu'île relié par une digue, pas un vrai détachement
  insulaire). Le Kosovo, lui, est un pays entièrement sans littoral.
- **Serbie, Macédoine du Nord** : AUCUNE nouvelle ligne non plus, pour la raison la plus simple qui
  soit — les deux sont des pays entièrement sans littoral, comme le Kosovo.
- **Bulgarie, Roumanie** : AUCUNE nouvelle ligne — la Bulgarie a bien une façade sur la mer Noire mais
  aucune île détachée à relier, la Roumanie de même (delta du Danube compris, accessible par route).
- **Grèce : le plus gros ajout de toute cette section, 30 vraies lignes.** Le réseau d'îles grecques
  reliées par ferry-voiture est, de très loin, le plus dense de tous les pays couverts ici — modélisé
  à cette échelle plutôt que reporté (voir la demande explicite de l'utilisateur à ce sujet). Trois
  masses continentales, PORTS DE DÉPART DISTINCTS selon la région plutôt qu'un unique aller-retour
  Le Pirée générique : Le Pirée (Crète, Dodécanèse — Rhodes/Kos/Kálymnos/Léros/Pátmos/Kárpathos —,
  Cyclades — Sýros/Tínos/Náxos/Páros/Ándros/Mýkonos/Santorin/Mílos/Íos/Amorgós —, Égée du Nord —
  Lésvos/Chíos/Sámos/Ikaría —, golfe Saronique — Égine/Póros), Igoumenitsa (Corfou), Patras/Kyllíni
  (Céphalonie/Ithaque/Zante, Ionienne), Néapoli en Laconie (Cythère), Vólos (Skiáthos/Skópelos/
  Alónnisos, Sporades) et Kými en Eubée (Skýros, seule île des Sporades sans ligne directe régulière
  depuis Le Pirée). Chaque ligne a un vrai port, un vrai opérateur, une vraie durée et un vrai tarif
  "voiture" sourcés (Blue Star Ferries/Minoan Lines/Seajets/ANEK-Superfast pour Le Pirée, Levante
  Ferries pour l'Ionienne, KerkyraLines/Kerkyra Seaways pour Corfou, Triton Ferries pour Cythère,
  Hellenic Seaways/Alonissos Skopelos Skiathos Shipping Company pour les Sporades — agrégées via
  ferryhopper.com/ferryscanner.com/directferries.com, tarifs basse saison 2026 ; voir
  `public/js/app.js`, section "Ferries : Grèce" au-dessus de `FERRY_ROUTES`, pour le détail ligne par
  ligne). Système de détection par PRÉFIXE de code postal (`GR_ISLAND_PATTERNS`) plutôt que code exact
  un par un comme la Croatie — le découpage postal grec s'y prête, sauf deux exceptions documentées en
  code : Skýros (34007) et Póros (18020, filtré par nom) partagent leur bloc postal avec une zone
  continentale voisine (Eubée, Trézène/Galatás).
  **Trois destinations reconnues mais volontairement SANS ligne** (même traitement que les Açores/
  Madère ci-dessus — l'absence d'entrée dans `FERRY_ROUTES` suffit à les exclure comme étape reliée,
  sans code spécifique) : **Hydra**, dont la circulation automobile est interdite sur l'île elle-même
  (âne et à pied seulement, aucune ligne voiture ne peut donc exister) ; **Spetses**, qui n'a pas non
  plus de ligne voiture directe régulière ; **Límnos**, dont la ligne directe au départ du Pirée
  n'embarque pas de véhicules à ce jour (2026) — à ne pas confondre avec Ikaría, correctement reliée,
  elle, par une vraie ligne voiture. Une trentaine de petites îles/îlots grecs restent, comme pour la
  Croatie, volontairement LAISSÉS DE CÔTÉ (limite assumée, pas un oubli, même logique que les îlots
  croates) : Cyclades mineures (Sífnos, Sérifos, Kýthnos, Kéa, Antíparos, Anáfi, Síkinos, Folégandros,
  Kímolos), Dodécanèse mineur (Lipsí, Tílos, Sými, Kásos, Astypálaia, Kastellórizo), mer Égée du Nord
  (Ágios Efstrátios, Foúrnoi) et petites îles ioniennes (Paxoí, Meganísi, Kálamos) — toutes restent
  accessibles comme point de départ (recherche manuelle) mais jamais comme étape reliée. Leucade, elle,
  n'a besoin d'aucun traitement particulier : reliée au continent par une digue routière depuis les
  années 1980, jamais par ferry, déjà `continental` sans exception à coder — comme Eubée (pont de
  Chalcis) ou Öland pour la Suède plus haut.
  **Noms d'îles dans le sélecteur de langue** : mêmes principes que pour la Croatie/le Danemark/la
  Suède plus haut (Cres/Mljet/Bornholm/Gotland) — le nom natif translittéré de chaque île reste
  IDENTIQUE dans les 53 langues (Ródos, Kérkyra, Zákynthos, Mýkonos...), jamais traduit, sauf la Crète
  qui reçoit une vraie traduction par langue (même traitement que la Corse/la Sardaigne/la Sicile/
  Malte — un exonyme réel existe dans la plupart des langues pour cette île majeure).
- **Vatican** : AUCUNE ligne modélisée, pour la raison la plus simple qui soit — 121 hectares en
  plein cœur de Rome, aucune mer à traverser. **Îles Féroé** : UNE seule ligne, pour **Suðuroy**,
  la plus méridionale des îles principales de l'archipel — les quatre autres (Streymoy avec
  Tórshavn, Eysturoy, Vágar, Sandoy) sont, elles, déjà `continental` : reliées entre elles par de
  VRAIS tunnels sous-marins routiers (voir "Pays couverts" ci-dessus, les quatre péages non
  modélisés) plutôt que par ferry. Suðuroy, elle, n'a AUCUN tunnel à ce jour : le
  Suðuroyartunnilin, un projet réel mais encore à l'étude, n'est pas attendu avant 2036 au plus tôt
  — seule liaison actuelle pour véhicules, **Tórshavn ↔ Tvøroyri** (SSL/Strandfaraskip Landsins,
  opérateur public unique — la même société qui gère aussi les tunnels à péage ci-dessus —, ligne 7,
  ~2h05, tarifs officiels non promotionnels 2026 : voiture 229 DKK, camping-car/van 344 DKK, moto
  92 DKK, piéton 109 DKK, ssl.fo/prices — **convertis en euros en septembre 2026** (31 / 46 / 12 / 15 €) :
  ces montants étaient jusque-là saisis tels quels en DKK dans une table en euros, et s'affichaient donc
  « ~229 € », environ 7,5 fois trop cher). Identifiée par le préfixe de code postal féroïen `8`/`9`
  (800-970, exclusif à Suðuroy, vérifié exhaustivement sur les 180 communes de `communes-fo.txt`) —
  avec un piège de nom évité : une autre localité s'appelle elle aussi "Vágur", mais au nord de
  l'archipel (code 700, sur Eysturoy) ; la détection par PRÉFIXE de code postal, pas par nom, l'écarte
  correctement de Suðuroy sans ambiguïté. **Isolement corrigé en septembre 2026** : l'Islande et le reste
  de l'archipel féroïen étaient rangés dans la masse terrestre "continental" — un trajet depuis Reykjavík
  ou Tórshavn pouvait « rouler » jusqu'au Royaume-Uni ou au continent (mesuré : 25 étapes hors d'Islande et
  57 hors des Féroé sur 15 tirages chacun). Chacun a désormais sa masse terrestre ("iceland", "faroe"),
  et la ligne Smyril Line (Hirtshals-Tórshavn-Seyðisfjörður) n'est PAS modélisée : aucune grille
  officielle 2026, tarification dynamique selon le remplissage. **Même correction pour les Orcades et les
  Shetland** (codes postaux KW15-17 et ZE), qui étaient rattachées à la Grande-Bretagne par la route —
  elles sont maintenant reliées par les vraies traversées NorthLink Ferries (grille officielle 2026,
  moyenne saison, prix véhicule seul convertis à 0,8572 GBP/€) : Scrabster ↔ Stromness (voiture £74),
  Aberdeen ↔ Lerwick (£149, 12 h 30) et Kirkwall ↔ Lerwick (£98). **Islande** : AUCUNE ligne modélisée non plus — le pays
  entier forme une seule masse continentale reliée par la route (Ring Road/Route 1), sans île
  périphérique habitée nécessitant un vrai ferry-voiture pour ce genre de trajet (Vestmannaeyjar,
  la plus notable, reste desservie mais hors du périmètre volontairement retenu ici, comme les
  Açores/Madère ci-dessous).
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
  deux pays n'étant pas exploitable pour ça — voir "Pays couverts" ci-dessus) et pour Malte (seuil de
  latitude à 36,00° entre l'île principale et Gozo, vérifié exhaustivement sur `communes-mt.txt` —
  Comino, l'îlot minuscule entre les deux, rejoint la masse "gozo" par ce même seuil faute d'étiquette
  dédiée). Guernesey et Jersey n'ont, elles, besoin d'aucune subdivision : le pays lui-même EST la
  masse continentale (`c.country === 'GG'`/`'JE'`), chacune une île à part entière. La Croatie, elle,
  ne peut utiliser NI un simple rectangle lat/lon NI le nom de comté (`dept`) : le littoral dalmate
  est bien trop découpé pour ça — vérifié qu'un comté croate (ex. Splitsko-Dalmatinska) couvre à la
  fois des îles ET la côte continentale en face, et que Brač/Hvar/Vis partagent presque exactement la
  même bande de latitude que la côte de Makarska (un rectangle y attraperait la mauvaise moitié).
  Seul le CODE POSTAL, distinct par île dans les données GeoNames, sépare correctement les deux —
  `HR_POSTCODE_TO_ISLAND` dans `app.js`, une table de correspondance construite une fois à partir de
  onze listes de codes postaux exacts (ex. `21400`-`21425` pour Brač, `20260`-`20274` pour Korčula).
  La Grèce, elle aussi, utilise le code postal — mais par PRÉFIXE (`GR_ISLAND_PATTERNS`, une liste de
  paires regex/étiquette testées dans l'ordre) plutôt que par code exact un par un : le découpage
  postal grec regroupe déjà chaque île (ou groupe d'îles) dans son propre bloc de préfixes régionaux,
  suffisamment propre pour qu'un simple test `/^85[0-9]/` (Dodécanèse) ou `/^84[0-9]/` (Cyclades)
  suffise la plupart du temps — vérifié exhaustivement, préfecture par préfecture, sur les ~14 220
  communes de `communes-gr.txt`. Deux exceptions ponctuelles, filtrées à la main : Skýros (`34007`)
  est un code isolé au sein du bloc plus large de l'Eubée (`34001`-`34019`, resté `continental`, relié
  par le pont de Chalcis) ; Póros (`18020`) partage son bloc avec Galatás/Troizína, sur le continent
  (péninsule de Trézène, en face de l'île) — filtré par NOM (toute commune contenant "Troizín" ou
  "Galatás" reste `continental`) plutôt que par code, seul cas de ce genre dans toute cette table.
  Le Royaume-Uni, lui, n'a besoin que d'un seul test — le préfixe de code postal `BT` (Irlande du
  Nord, voir plus haut) — le reste du pays (`c.country === 'GB'` sans ce préfixe) formant une seule
  masse `greatBritain`, aucune île secondaire à distinguer en son sein pour cette app. La République
  d'Irlande (`c.country === 'IE'`) et l'île de Man (`c.country === 'IM'`) sont, elles, les cas les
  plus simples de toute cette série : un simple test de pays suffit, chaque territoire tenant sur une
  seule masse (`ireland`/`isleOfMan`) sans la moindre subdivision interne à gérer. Les îles Féroé,
  elles, rejoignent le groupe "détection par préfixe de code postal" (Danemark/Suède/Grèce ci-dessus)
  plutôt que le groupe "un seul test de pays" : `/^[89]/` isole Suðuroy (codes 800-970) du reste de
  l'archipel (`c.country === 'FO'`), avec le même type de piège nominal que Póros/Skýros pour la
  Grèce — une localité appelée "Vágur" existe aussi au nord, sur Eysturoy (code 700), mais la
  détection par préfixe plutôt que par nom l'écarte sans ambiguïté (voir "Ferries" ci-dessus). Le
  Vatican, lui, n'a besoin d'aucune subdivision : il tient sur sa seule commune. L'Islande forme sa
  propre masse `iceland` (et non `continental`), dont se détachent trois îles périphériques
  modélisées depuis : Vestmannaeyjar, Grímsey et Hrísey (`landmassOf`, vérifié le 18/09/2026).
- Limite levée depuis : les petites îles françaises sans pont ni département propre (Belle-Île,
  Ouessant, Groix, Batz, Bréhat…) étaient d'abord traitées comme le continent le plus proche ; elles
  ont aujourd'hui chacune leur masse (`belleIle`, `groix`, `ouessant`… via `ISLAND_RULES` dans
  `public/js/trip-data.js`). De même, les 9 îles de l'archipel des Açores, d'abord regroupées sous
  une seule étiquette, sont désormais 9 masses distinctes (`azores` pour São Miguel, `terceira`,
  `faial`, `pico`, `saoJorge`, `graciosaAzores`, `santaMaria`, `floresAzores`, `corvo` —
  vérifié avec `landmassOf` le 18/09/2026) ; seules Faial, Pico, São Jorge, Terceira et Graciosa sont
  reliées entre elles par ferry (voir "Îles d'Europe et corrections"), les autres restent isolées. Limite similaire, plus étendue, pour la Croatie : une
  bonne douzaine de très petites îles à liaison locale réduite et population quasi nulle dans les
  données ne sont volontairement PAS modélisées (archipel de Zadar : Molat/Ist/Premuda/Silba/Olib/
  Iž/Rava/Zverinac ; archipel de Šibenik : Kaprije/Zlarin/Žirje/Prvić/Krapanj ; îles Élaphites près
  de Dubrovnik : Koločep/Lopud/Šipan ; Susak/Unije/Ilovik près de Lošinj ; Drvenik Veli/Mali près de
  Trogir ; Biševo/Palagruža au large de Vis) — même logique que les Açores/Madère : ces communes
  restent accessibles comme point de départ (recherche manuelle) mais jamais comme étape reliée au
  reste d'un itinéraire, traitées par défaut comme le continent (limite assumée, pas un oubli — voir
  le commentaire au-dessus de `HR_ISLAND_POSTCODES` dans `app.js`). La Grèce reprend exactement cette
  même limite assumée, à plus grande échelle (voir "Ferries" ci-dessus pour la liste complète des
  îles volontairement laissées de côté) — et y ajoute trois destinations RECONNUES comme îles à part
  (donc jamais faussement reliées par la route) mais SANS aucune ligne de ferry-voiture modélisée,
  faute de service réel : Hydra (circulation automobile interdite sur l'île elle-même), Spetses et
  Límnos (pas de ligne voiture directe régulière à ce jour) — voir le commentaire au-dessus de
  `FERRY_ROUTES` dans `app.js`.

**La Turquie**, ajoutée ensuite, apporte deux vraies traversées pour véhicules dans le détroit
des Dardanelles, toutes deux opérées par GESTAŞ (seul opérateur, quasi-monopole historique comme Île
de Man Steam Packet/Bornholmslinjen/Destination Gotland déjà rencontrés plus haut) — détectées via le
champ "dept" de `communes-tr.txt` (littéralement le nom de l'île pour ces deux-là, voir `landmassOf`
dans `lib/trip-engine.js`) plutôt qu'un préfixe de code postal comme pour la Croatie/le Danemark/la
Suède. **Geyikli-Bozcaada** : 12 km, ~35 min, voiture 2 365 TL aller-retour soit ~21 € l'aller (taux
~56,3 TRY/EUR début septembre 2026) — feribotseferleri.com.tr/canakkaleyiseviyoruz.com 2026 ; classe
2 (véhicule "moyen") directement tarifée séparément par l'opérateur (2 665 TL AR, ~24 €/aller) plutôt
qu'un ratio appliqué, contrairement à la plupart des lignes de cette table où seul le tarif "voiture"
est publié. **Kabatepe-Gökçeada** : 30 km, 1h15, voiture 1 400 TL aller-retour soit ~12 € l'aller —
même source/même taux ; classe 2/5 estimées au même ratio que Bozcaada (même opérateur, même type de
navire), faute de tarif "véhicule moyen" publié séparément pour cette ligne précise. Les îles du sud
de la mer de Marmara (Avşa, Marmara, Paşalimanı, Ekinlik — réseau GESTAŞ depuis Erdek) ne sont PAS
modélisées ici — même limite assumée que pour les Açores/Madère portugaises ou les petites îles
croates/grecques ci-dessus : un archipel secondaire moins fréquenté par un vrai road trip que
Bozcaada/Ténédos et Gökçeada/Imbros, bien plus connues. Anomalie GeoNames connue et non corrigée
(hors périmètre de cet ajout) : une poignée de hameaux quasi inhabités de Gökçeada (Paşaçayırı,
Gürçeşme...) portent des coordonnées manifestement erronées, placées sur le continent proche plutôt
que sur l'île elle-même — sans effet pratique réel, aucun n'ayant de population significative.

### Liaisons sans tarif fixe publié : 156 lignes ajoutées (septembre 2026)

**Changement de règle, à la demande de l'utilisateur.** Jusqu'ici, une ligne de ferry n'était modélisée que si une grille
tarifaire officielle fixe était publiée ; les listes « non retenues » des sections précédentes en témoignent. Désormais,
**toute ligne qui existe en 2026 et transporte des véhicules est modélisée**, avec un avertissement quand son prix n'est
pas connu :
- `priceStatus: 'variable'` — prix calculé à la réservation, selon la date ou la demande : « Tarif variable, vérifiez
  avant votre voyage. »
- `priceStatus: 'unknown'` — aucun tarif lisible (pas de grille publiée, site derrière une vérification anti-robot non
  contournée, tarif au fret, portail hors service) : « Tarif non communiqué, renseignez-vous avant votre trajet. »

Même traitement pour une classe de véhicule absente d'une grille par ailleurs publiée (motos sur le MV Manu'atele).
Affichage : la traversée garde sa durée sans montant, suivie d'un bandeau orange ; le total ferry du récapitulatif ne
compte que les traversées tarifées et ajoute « N traversée(s) au tarif à vérifier » ; le PDF reprend l'avertissement.
Les 4 chaînes sont traduites dans les 143 langues (sans relecture native). Restent exclues : les lignes passagers
seulement, les lignes suspendues en 2026, les simples affrètements et les liaisons entre deux lieux d'une même masse.

Fichiers `scripts/iles/ferries-*.js` (même constructeur `scripts/build-island-rules.js`, qui reconnaît maintenant aussi
les masses du code historique et refuse une paire déjà écrite à la main) :

| Région | Lignes | Variable | Non communiqué | Grille trouvée |
|---|---|---|---|---|
| Europe | 41 | 38 | 3 | 0 |
| Afrique, Moyen-Orient | 15 | 1 | 14 | 0 |
| Asie | 76 | 0 | 55 | 21 |
| Océanie | 24 | 7 | 13 | 4 |

- **Europe** : Rosslare ↔ Cherbourg, Poole ↔ Guernesey et Jersey, Larne ↔ Douglas, Hirtshals ↔ Tórshavn ↔ Seyðisfjörður
  (Smyril Line : l'Islande et les Féroé sont enfin reliées), Bonifacio ↔ Santa Teresa Gallura, Cagliari ↔ Palerme, Vela
  Luka ↔ Ubli, Taşucu ↔ Girne (Chypre), Quiberon ↔ Belle-Île et Lorient ↔ Groix (BreizhGo), et 29 liaisons entre îles
  grecques (Crète–Santorin, Rhodes–Kos, Lesbos–Lemnos, Kavala–Lemnos, Cyclades, Sporades, Ioniennes…). Écartées : Madère
  et Açores (aucun service en 2026), Ouessant, Molène et Sein (véhicules des résidents seulement), Houat, Hœdic, Hydra.
- **Afrique et Moyen-Orient** : Mamoudzou ↔ Dzaoudzi (barge du Département), Dar es Salaam ↔ Zanzibar ↔ Pemba (Azam),
  Ankify ↔ Nosy Be, Port-Louis ↔ Rodrigues, bacs d'Ukerewe, des Ssese, de Mfangano et de Likoma, Malabo ↔ Bata, Bandar
  Pol ↔ Qeshm, Charak ↔ Kish, Bandar Abbas ↔ Hormuz, Jazan ↔ Farasan, Ras Al Ard ↔ Failaka (ces deux dernières sur des
  sources plus faibles). Écartées : Mafia (navire en panne depuis mai 2026), Comores, Annobón, São Tomé ↔ Príncipe
  (service 2026 non confirmé), Sainte-Hélène (cargo), Seychelles, Lamu, Solovki (passagers).
- **Asie** : grilles officielles trouvées pour Sado, Oki, Tsushima, Iki, Gotō, Yakushima, Tanegashima, Shōdoshima,
  Rishiri, Rebun, Okushiri, Kumejima, Ulleungdo, Batam ↔ Bintan, Tarakan, Seram, Buru, Phú Quốc ; sans tarif : Wando ↔
  Jeju, Xuwen ↔ Haikou (Hainan), 25 lignes rouliers philippines (Matnog ↔ Allen, Toledo ↔ San Carlos, Dumaguete ↔
  Siquijor, Zamboanga ↔ Jolo, Manille ↔ Puerto Princesa… — matrice MARINA de mars 2026, FastCat hors ligne, Montenegro
  Lines derrière un CAPTCHA), 22 lignes indonésiennes (Weh, Simeulue, Nias, Mentawai, Bengkalis, Rupat, Nusa Penida,
  Kalimantan, Selayar, Kupang ↔ Flores/Alor/Rote/Sabu…), Menumbok ↔ Labuan, Ko Chang, Ko Lanta, Cát Bà, Bhola, Sandwip.
- **Océanie** : Geelong ↔ Devonport (Spirit of Tasmania), Wellington ↔ Picton (Interislander : **l'île du Nord et l'île
  du Sud sont enfin reliées**), Kangaroo Island, Bruny, Magnetic Island (nouvelle masse), Moreton, Stradbroke, K'gari,
  French Island, Flinders, Curtis, Waiheke, Great Barrier, D'Urville, Viti Levu ↔ Vanua Levu/Ovalau, Vanua Levu ↔
  Taveuni, Tongatapu ↔ 'Eua/Ha'apai ↔ Vava'u ; grille Betico trouvée pour Nouméa ↔ île des Pins, Maré et Lifou.

**Corrections faites en chemin** : la liaison Pozzallo ↔ La Valette était rangée « continent ↔ Malte » alors que Pozzallo
est en Sicile (clé corrigée en `malta|sicily`) ; la boîte de l'île d'Ukerewe englobait Kisorya et d'autres villages du
continent (limite est ramenée à 33,205° E).

**Limites signalées lors de ce passage** : plusieurs îles n'étaient pas des masses séparées (Canaries et Baléares entre
elles, Açores, Elbe, Hébrides, île de Wight, Saaremaa, Föhr, îles norvégiennes, Marmara, Olkhon, Bijagós, Ko Phaluai…)
et quelques boîtes étaient fausses (Kupang, Sadai, Liang) — **corrigé dans la section suivante**. Restent isolées lieu
par lieu, faute de voitures sur place ou de bac à véhicules : Ko Phi Phi (aucune route carrossable) et les petites îles
des Maldives (ferries publics pour passagers seulement) ; Kerkennah, Dalma et Coron n'ont aucun lieu dans les données
(depuis : lieux ajoutés, voir « Kerkennah, Dalma, Coron et Busuanga »).

**Matsu et Phú Quý (correction)** : Matsu était isolée lieu par lieu ; elle a désormais une masse par île ou groupe relié
par la route — `nangan` (18 lieux), `beigan` (10), `xiju` (6), `dongju` (3), `dongyin` (Dongyin et Xiyin, reliées par
la chaussée de Zhongzhu). Liaisons ajoutées avec la grille du New Taima (All Ports Navigation, navire roulier de 45
voitures ; tarifs approuvés par le comté de Lienchiang, publiés par l'agence de l'exploitant) : Keelung ↔ Fu'ao
(Nangan) et Keelung ↔ Zhongzhu (Dongyin), voiture 2 000 TWD (54,16 €), piéton 630 TWD, sens Keelung → Matsu ; Fu'ao ↔
Zhongzhu, voiture 640 TWD. Nangan ↔ Beigan et les bateaux de Juguang ne prennent ni voitures ni grosses motos : Beigan,
Xiju et Dongju restent sans liaison. Phú Quý reçoit sa masse `phuQuy`, sans liaison : les navires depuis Phan Thiết
(Superdong, Phú Quý Express…) ne prennent que passagers, motos et marchandises.

### Îles d'Europe et corrections : 258 liaisons de plus (septembre 2026)

Jusqu'ici, la logique historique de `landmassOf` ne séparait en Europe que les grandes îles desservies par une ligne
modélisée : les autres étaient rangées avec leur continent ou avec l'île voisine (Ténérife « roulait » jusqu'à
Lanzarote, l'île de Wight jusqu'à Londres, Saaremaa jusqu'à Tallinn). Nouveaux fichiers `scripts/iles/iles-sud-europe.js`,
`iles-atlantique-nord.js`, `iles-baltique.js`, `iles-mediterranee-est.js` et `iles-corrections.js`. Pour les pays à
logique historique, les règles sont en `fallthrough` : évaluées d'abord, elles laissent les autres lieux à leur
rangement actuel ; les clés des liaisons existantes gardent leur île (`canary` = Gran Canaria, `balearic` = Majorque,
`azores` = São Miguel, `madeira` = Madère). Chaque île a été vérifiée contre les lieux publiés (contours
OpenStreetMap pour la Baltique, la Scandinavie et l'Afrique), ponts, chaussées et tunnels routiers compris.

| Fichier | Liaisons | Grille fixe | Gratuites | Variable | Non communiqué |
|---|---|---|---|---|---|
| Espagne, Portugal, Italie, Malte | 36 | 14 | 0 | 16 | 6 |
| Royaume-Uni, Irlande, Islande, Féroé, Guernesey | 37 | 35 | 0 | 1 | 1 |
| Danemark, Allemagne, Pays-Bas, Estonie, Lituanie, Finlande, Suède, Norvège | 123 | 33 | 75 | 1 | 14 |
| Grèce, Croatie, Turquie | 58 | 23 | 0 | 29 | 6 |
| Corrections hors Europe | 3 | 0 | 1 | 0 | 2 |

- **Espagne** : Canaries île par île (Ténérife, Gran Canaria, Lanzarote, Fuerteventura, La Palma, La Gomera, El Hierro,
  La Graciosa) et Baléares (Majorque, Minorque, Ibiza, Formentera) reliées par Fred. Olsen, Naviera Armas et Baleària
  (tarifs variables) ; autorisation obligatoire l'été pour entrer à Formentera ; La Graciosa sans voitures de visiteurs.
- **Portugal** : Açores île par île, Horta ↔ Madalena et Pico ↔ Velas toute l'année, Terceira l'été (Atlânticoline,
  tarif non communiqué) ; São Miguel et Santa Maria sans ferry en 2026 ; Funchal ↔ Porto Santo (grille 2026, voiture
  115,25 € hors surtaxe carburant).
- **Italie** : Elbe, Giglio, Capraia, Ischia, Procida, Capri, Ponza, îles Éoliennes, Égades, San Pietro, La Maddalena,
  Tremiti, Lido et Pellestrina (Venise)… ; grilles Caremar, Laziomar, Siremar, Delcomar, ACTV. **Capri et Procida
  restent isolées** (voitures des non-résidents interdites en saison), comme Panarea, Stromboli et Tremiti ; les
  restrictions d'Ischia, Lipari, Vulcano, Filicudi et Favignana sont notées dans les fiches. Comino (Malte) isolée.
- **Royaume-Uni** : île de Wight (Wightlink, tarif variable), Arran, Bute, Cumbrae, Mull, Islay, Jura, Coll, Tiree,
  Colonsay, Gigha, Lismore, Luing, Raasay, Lewis-Harris, Uist, Barra (grilles CalMac et Argyll & Bute), îles des
  Orcades et des Shetland (grilles des conseils). Isolées : Scilly, Iona, Kerrera, Small Isles (véhicules sur permis ou
  passagers seulement). Corrections : Burwick rangé aux Orcades, Drimnin et Bonnavoulin remis sur le continent.
- **Aurigny, Sercq, Herm** séparées de Guernesey (sans voitures de visiteurs) ; **Islande** : Vestmannaeyjar (Herjólfur,
  grille 2026), Grímsey (tarif non communiqué), Hrísey isolée ; **Féroé** : Kalsoy et Nólsoy reliées, Skúvoy, Hestur,
  Svínoy, Fugloy, Mykines et Koltur isolées.
- **Danemark** : Ærø, Samsø, Læsø, Fanø, Anholt et une vingtaine de petites îles (grilles communales 2026). **Allemagne** :
  Sylt (train-auto), Pellworm, Borkum, Föhr, Amrum, Norderney ; îles sans voitures isolées (Hiddensee, Juist, Baltrum,
  Langeoog, Spiekeroog, Wangerooge, Helgoland, Halligen). **Estonie** : Saaremaa-Muhu, Hiiumaa (TS Laevad), Vormsi,
  Kihnu, Ruhnu. **Lituanie** : isthme de Courlande (bac Klaipėda ↔ Smiltynė). **Finlande** : archipel de Turku (bacs
  routiers publics gratuits). **Suède** : Fårö, Visingsö, Ven (isolée), Gräsö, Ljusterö, Ornö, Öckerö… (bacs
  Trafikverket gratuits). **Norvège** : 61 îles reliées par bac routier (grille nationale AutoPASS : Tysnes, Austevoll ;
  bacs gratuits : Solund, Værøy, Røst, Sørøya…), 162 lieux d'îles sans bac isolés — **relecture conseillée**,
  plusieurs rattachements reposant sur une vérification incomplète.
- **Grèce** : 44 lieux remis sur le continent et une soixantaine rangés sur leur vraie île (codes postaux partagés) ;
  nouvelles masses Salamine, Thasos, Samothrace, Kéa, Kýthnos, Sérifos, Sífnos, Folégandros, Donoúsa, Koufonísia,
  Paxos, Symi, Tilos, Kastellorizo… ; Samothrace en tarif non communiqué (prix seulement dans un guide local).
  **Croatie** : Drvenik, Ist, Olib, Premuda, Molat, Iž, Žirje, Šipan… (grilles Jadrolinija 2026) ; Silba, Susak, Unije,
  Zlarin, Koločep, Lopud isolées ; 15 lieux de l'arrière-pays de Vrgorac retirés de Vis. **Turquie** : Avşa, Marmara,
  Paşalimanı, Ekinlik (GESTAŞ, 1 400 TRY la voiture) ; îles des Princes isolées (voitures interdites).
- **Hors Europe** : Olkhon (bac gratuit), Kounachir et Itouroup (Korsakov, tarif non communiqué), Kizhi et Valaam
  isolées (Russie) ; Bolama, Bubaque (Guinée-Bissau) ; Inhaca, Bazaruto, Ibo, Quirimbas (Mozambique) ; Gorée et îles du
  Saloum (Sénégal) ; Sherbro et Banana Islands (Sierra Leone) ; îles de Loos (Guinée) ; Ko Phaluai (Raja Ferry) ;
  boîtes indonésiennes corrigées (Uihainmumu remis sur Timor, Sadai sur Bangka, Liang sur Ambon).

Les bacs gratuits ont un prix de 0 € ; les autres restent affichés avec leur prix ou avec l'avertissement « tarif
variable » ou « tarif non communiqué ».

### Cap-Vert : neuf îles, huit liaisons (septembre 2026)

Premier pays du projet dont **tout** le territoire est insulaire : sans ferry, chacune des neuf îles
habitées serait un cul-de-sac. C'est aussi, de tout le lot ouest-africain, le **seul** jeu de données
à satisfaire le critère du projet — un vrai prix par catégorie de véhicule, publié et daté.

Exploitant : **CV Interilhas**, concession de service public de vingt ans signée en 2019 (la seule
liaison à deux opérateurs est Mindelo-Porto Novo, où Nôs Ferry opère aussi mais ne publie aucun tarif
véhicule). Base légale des tarifs : **Despacho n.º 01/2024, publié au Boletim Oficial du 11 janvier
2024**, en vigueur depuis le 1er février 2024. Les matrices île par île ont été lues directement dans
les grilles PDF de l'exploitant : `tariff_mercadorias.pdf` pour les véhicules et
`tariff_passageiros.pdf` pour les passagers. **Aucune classe n'est extrapolée** — les quatre du
projet sont publiées pour les huit liaisons : « automóvel ligeiro » (classe 1), « furgoneta »
(classe 2), « moto/jetski » (classe 5) et tarif passager national (piéton/vélo). Conversion à la
parité fixe de 110,265 escudos pour 1 EUR.

| Liaison | Durée | Distance | Voiture |
|---|---|---|---|
| Santo Antão ↔ São Vicente | 1 h | 15 km | 31 € |
| São Vicente ↔ São Nicolau | 5 h | 81 km | 84 € |
| São Nicolau ↔ Sal | 8 h | 159 km | 147 € |
| Sal ↔ Boa Vista | 3 h | 69 km | 84 € |
| Boa Vista ↔ Santiago | 7 h | 154 km | 147 € |
| Santiago ↔ Maio | 2 h | 39 km | 75 € |
| Santiago ↔ Fogo | 4 h | 113 km | 96 € |
| Fogo ↔ Brava | 1 h | 19 km | 37 € |

Ces huit liaisons forment une chaîne qui connecte les neuf îles ; les autres paires de la matrice
existent aussi au tarif, mais passent par ces mêmes escales. Deux faits qui expliquent l'importance
du ferry ici : **Santo Antão et Brava n'ont aucun aéroport commercial** — celui de Santo Antão a
fermé après le crash du vol TACV 5002 en 1999, celui de Brava en 2004 pour vents dangereux — et
**aucune liaison, même maritime, ne relie le Cap-Vert au continent**.

**Rien d'autre n'est modélisé dans ce lot, et c'est documenté plutôt que passé sous silence.** Trois
traversées que l'on s'attendrait à trouver ont disparu d'elles-mêmes : le **pont de la Senegambia**
(21 janvier 2019) a rendu le bac de Banjul-Barra facultatif et fait passer Dakar-Ziguinchor d'une
journée à cinq heures ; le **pont Nelson Mandela** (2022) a remplacé le bac de Foundiougne ; et
Freetown-Lungi dispose d'une route de contournement. Les traversées réellement obligatoires qui
subsistent — Dakar-Ziguinchor, Bissau-Enxudé, Rosso, Bafoulabé, Korioumé vers Tombouctou, le bac de
Sanouna vers Djenné, les cinq bacs du lac Volta au Ghana, Grand-Lahou en Côte d'Ivoire — **ne
publient aucun tarif par véhicule**, ou franchissent un lac que l'on peut contourner par la route,
donc sans séparation de masse terrestre à modéliser. Le **pont de Rosso** entre le Sénégal et la
Mauritanie n'est pas ouvert (50 % des travaux en mai 2026, inauguration visée mars 2027) : la
frontière reste franchissable par le barrage de Diama, qui porte une vraie chaussée.

### Ceuta et Melilla : traversées entre ZONES, et un bug corrigé (septembre 2026)

Jusqu'ici, une liaison ferry se déduisait d'un changement de MASSE TERRESTRE (`landmassOf`, table
`FERRY_ROUTES`). Ceuta et Melilla ne rentrent pas dans ce moule : ce sont des villes espagnoles bâties
sur le CONTINENT AFRICAIN, séparées de l'Espagne péninsulaire par la mer ET frontalières du Maroc par
la terre. Leur donner une masse terrestre propre aurait fait disparaître la frontière marocaine ; les
laisser "continentales" — ce qu'elles étaient — laissait le moteur traverser le détroit de Gibraltar
par la route.

**C'était un vrai bug, présent avant ce lot et mesuré avant d'être corrigé** : sur 100 trajets tirés
depuis Algésiras, l'un passait par Ceuta sans le moindre segment de ferry. Même famille que le bug
chypriote du lot précédent, mais qu'aucun code pays ne pouvait attraper : `reallyAdjacent` renvoie
vrai quand les deux côtés sont identiques, et Ceuta est espagnole comme Algésiras.

D'où deux ajouts. `zoneOf()` renvoie le code pays pour tout le monde, sauf deux zones dédiées
détectées par préfixe de code postal (51xxx Ceuta, 52xxx Melilla, exclusifs à ces deux villes
autonomes) — même méthode de détection que pour Bornholm, Gotland ou l'Irlande du Nord. Et
`SEA_CROSSINGS` (dans `trip-data.js`) décrit une traversée obligatoire ENTRE DEUX ZONES d'une même
masse terrestre, consultée avant la logique de masse terrestre partout où une étape est évaluée ou
un segment finalisé. Tout le contrôle d'adjacence raisonne désormais en zones plutôt qu'en pays.

Résultat vérifié au tirage : depuis Algésiras, plus AUCUNE étape à Ceuta par la route (0 sur 60
trajets) ; à rayon réduit, 12 étapes à Ceuta sur 120 trajets, **toutes avec leur segment de ferry** ;
depuis Ceuta sans ferry, uniquement le Maroc par la frontière terrestre ; depuis Ceuta avec ferry, le
Maroc ET l'Espagne péninsulaire. Les deux liens coexistent, ce qui était le but.

Les deux liaisons retenues sont précisément les seules de toute la Méditerranée occidentale dont le
tarif PAR VÉHICULE soit publié plutôt que dynamique. **Algésiras-Ceuta** : 1h30 en ferry conventionnel
(1h en navire rapide), 31,5 km, plus de 10 départs par jour toute l'année, deux opérateurs solides
(Baleària et DFDS) ; tarifs publiés par Baleària — passager 35 €, voiture 50 €, caravane 99 €.
**Málaga-Melilla** : 6h30, 210 km, 6 rotations hebdomadaires toute l'année (ligne d'intérêt public) ;
tarifs MAXIMAUX CONTRACTUELS garantis jusqu'au 31/12/2027 — fauteuil standard 50 €, véhicule de
tourisme jusqu'à 5,5 × 2,2 × 2 m à 40 €. **Limite assumée, choix explicite de l'utilisateur** : aucun
opérateur ne publie de tarif moto sur ces deux lignes, ni de tarif utilitaire sur Melilla (le plafond
contractuel ne couvre que le "véhicule de tourisme") ; ces classes reprennent le tarif voiture — un
choix de modélisation, pas un tarif réel, dont l'erreur va toujours vers la surestimation.

**Ce qui n'est PAS modélisé, et pourquoi.** Les traversées Espagne-Maroc (Algésiras-Tanger Med est
l'une des plus fréquentées au monde), France/Italie-Tunisie et Europe-Algérie existent bel et bien.
Elles ne sont pas ajoutées pour une raison structurelle : toute l'Afrique du Nord partage la masse
continentale eurasiatique via le Sinaï, si bien qu'y ouvrir une liaison maritime rendrait du même coup
possible un trajet ROUTIER fictif à travers la Méditerranée. S'y ajoute que ces lignes sont en
tarification dynamique, sans grille par véhicule vérifiable — même motif de non-inclusion que pour
Limassol-Le Pirée. Enfin, **aucun ferry pour véhicule n'existe vers le Sahara occidental**, depuis
nulle part : la seule ligne ayant existé, Tarfaya-Fuerteventura, a fonctionné cinq mois en 2007-2008
avant le naufrage de l'*Assalama*, et sa réouverture était encore bloquée en mai 2025 faute de poste
d'inspection frontalier.

### Sahel et Corne de l'Afrique : aucun ferry nécessaire (septembre 2026)

Vérifié plutôt que supposé : les onze pays sont continentaux, et les trois traversées d'eau qui
auraient pu compter ont toutes une alternative routière. Le ferry du lac Nasser (Wadi Halfa-Assouan)
est contourné par la route d'Argeen, sur la rive ouest ; ceux du golfe de Tadjourah à Djibouti par les
routes nationales RN9 et RN14 ; le Niger et le Chari sont franchis par des ponts à Niamey et à
N'Djamena. Aucune île habitée de ces pays n'a de liaison régulière à tarif publié qui justifierait
une masse terrestre séparée.

### Afrique orientale, centrale et australe, océan Indien : aucune liaison modélisable (septembre 2026)

Une vingtaine de liaisons examinées, **aucune n'a de grille tarifaire publiée et vérifiable** :
- **Kinshasa-Brazzaville** : pas de pont (projet route-rail visé pour 2028), canots et bac sans grille
  officielle. **Zongo-Bangui** : pirogues et bac irrégulier.
- **Mayotte, barge Mamoudzou-Dzaoudzi** : tarif piéton connu (1 € depuis le 20 août 2026), mais tarifs
  véhicules contradictoires selon la presse et aucune délibération trouvée. **Mayotte-Anjouan** : passagers
  seulement, sans grille. **Comores inter-îles** : vedettes et kwassa-kwassa, sans grille.
- **Maurice-Rodrigues** (MSCL) : départs publiés, tarifs non ; véhicules en fret sur devis.
  **Maurice-La Réunion** : plus de passagers, fret seulement.
- **Seychelles** : catamarans pour piétons, prix visibles seulement dans le moteur de réservation.
- **Zanzibar** : tarifs résidents rapportés par la presse, véhicules sur devis ; bac de **Mafia** hors
  service depuis le 12 mai 2026. **Lamu** : piétons, sans grille.
- **Madagascar** (Nosy Be, Sainte-Marie), **Malabo-Bata**, **São Tomé-Príncipe** : chiffres de presse
  ou anciens, service 2026 non confirmé.
- **Lacs** : Ukerewe et Ssese sans grille officielle (la gratuité de Bukakata-Luku arrivait à échéance
  en juillet 2026), MV Ilala et MV Liemba sans tarif véhicule, Mbita-Mfangano avec une grille d'opérateur
  non datée et contredite par la presse.
- **Inutiles**, une route existe : Likoni (contournement de Dongo Kundu depuis 2024), Kazungula (pont,
  2021), Kigongo-Busisi (pont JP Magufuli, 2025), Kigamboni, Maputo-Catembe, Mohembo, Sendelingsdrift
  (pont d'Alexander Bay).

Conséquence : toutes ces îles sont isolées (voir "Pays couverts"), et les deux Congo ne sont pas reliés.

### Cameroun, Sainte-Hélène : aucune liaison modélisable (septembre 2026)

- **Calabar-Limbe** (SeaExpress Transit, reprise fin mai 2026) : piétons seulement, tarif affiché
  incohérent. **Idenau-Oron** : bateaux informels. **Douala-Malabo** (Viteoca, 2024) : tarifs passagers de
  2024, activité 2025-2026 non confirmée, aucun tarif véhicule. **Manoka** : pirogues sans opérateur.
- **Sainte-Hélène** : MV Karoline (MACS) sans tarif publié ; **Tristan da Cunha** : tarifs publiés mais
  aucun véhicule, départ du Cap. **Îles Éparses** : aucune liaison civile.

### Russie : deux traversées officielles (septembre 2026)

- **Oust-Louga ↔ Baltiïsk (Kaliningrad)** — Oboronlogistika, ordre n° 219 du 8 juillet 2026 : voiture
  jusqu'à 5 m 27 040 ₽ HT, utilitaire jusqu'à 6 m 31 930 ₽, moto 8 000 ₽, passager en cabine 9 420 ₽,
  TVA de 22 % ajoutée (≈ 328 / 387 / 97 / 114 €). ~38 h. Traversée entre ZONES (`SEA_CROSSINGS`), comme
  Ceuta. Surcharge carburant mensuelle non modélisée.
- **Vanino ↔ Kholmsk (Sakhaline)** — SASCO : 6 811,26 ₽ par mètre de véhicule plus l'arrimage (grille du
  1er juillet 2026), calculé pour une voiture de 5 m (≈ 341 €) et un van de 6 m (≈ 409 €) — la longueur est
  un choix de modélisation ; moto 7 776,28 ₽ (≈ 77 €) ; passager en cabine 1 432 ₽ (≈ 14 €). 18-20 h.
- Distances non publiées par les opérateurs : orthodromies calculées (757 et 264 km).
- **Non modélisées** : Korsakov-Kouriles (grilles inaccessibles, zone frontière), Kem-Solovetski (passagers
  seulement), bac de la Lena à Iakoutsk (tarif réglementé, mais sa modélisation supposerait de découper le
  réseau routier iakoute, non fait). **Svalbard** : aucune liaison régulière en 2026.

### Péninsule Arabique et Iran : Masirah seulement (septembre 2026)

- **Shannah ↔ Masirah (Oman)** — Mwasalat, grille publiée : voiture 8,400 OMR (≈ 18,70 €), 4x4 10,500 (classe
  van), moto 4,200, passager 3,600 ; 1 h, 4 départs par jour.
- **Non modélisées** : Shinas ↔ Khasab (inutile, Musandam étant accessible par la route, et plus d'horaire fixe
  depuis la crise d'Ormuz) ; Jizan ↔ Farasan (gratuité officielle connue seulement jusqu'en 2024) ; toutes les
  liaisons iraniennes (tarifs révisés plusieurs fois par an sans grille 2026, suspension le 13 septembre 2026)
  et Iran-Émirats (commerce suspendu en août 2026) ; Dalma (grille partielle) ; Failaka (grille de 2016) ;
  Socotra et Kamaran (aucune liaison régulière).

### Asie : trente liaisons, îles isolées ailleurs (septembre 2026)

**Masses terrestres** (`scripts/iles/*.js` → `ISLAND_RULES`), règles par région, préfixe postal, boîte ou cercle,
vérifiées contre les lieux publiés (comptage par masse, lieux proches des limites). Une île sans pont ni tunnel
ROUTIER est une masse à part ; les petites îles (clé `*`) forment chacune une masse à elles seules, et en Indonésie
tout lieu qu'aucune règle ne range est isolé (`default: '*'`, 2 550 lieux). Principales masses : Japon (Honshu-Shikoku-
Kyushu reliés ; Hokkaido séparé, le tunnel du Seikan est ferroviaire ; Okinawa, Amami, Sado, Tsushima…), Corée du Sud
(Jeju, Ulleungdo, 608 lieux d'îles sans pont), Chine (Hainan, Zhoushan et Pingtan reliés), Taïwan (Penghu, Kinmen,
Matsu), Indonésie (Java 156 760, Sumatra, Sulawesi, Bornéo partagé avec la Malaisie et Brunei, Timor partagé avec le
Timor oriental, Nouvelle-Guinée, Bali, Lombok, Flores… et une cinquantaine d'autres), Philippines (37 masses dont
Luzon, Mindanao, Panay, Cebu, Negros, Leyte-Samar), Malaisie (péninsule reliée à Singapour et à la Thaïlande ;
Langkawi, Labuan, Tioman…), Inde (Andaman du Sud, Andaman du Milieu et du Nord, Car Nicobar, Lakshadweep, Sagar),
Sri Lanka (île entière), Maldives (îles isolées, sauf groupes reliés par pont : Malé-Hulhumalé, Addu…), Thaïlande (Ko
Samui, Ko Pha Ngan, Ko Chang, Ko Lanta…), Viêt Nam (Phú Quốc, Cát Bà, Côn Đảo…), Myanmar, Bangladesh, Cambodge,
Chagos, Christmas, Cocos.

**Liaisons retenues** (grille officielle de l'opérateur ou d'une autorité, prix du véhicule en euros au taux
InforEuro de septembre 2026) :
- **Japon** : Aomori ↔ Hakodate (Tsugaru Kaikyo Ferry, voiture 116,88 €) ; Kagoshima ↔ Naha, Naze, Kametoku et
  Wadomari (A-Line, grille du 1er septembre 2026 « en cours d'autorisation », 277 à 464 €).
- **Corée du Sud ↔ Japon** : Busan ↔ Shimonoseki (Kampu Ferry, 137,16 € ; aller-retour du véhicule obligatoire et
  frais de douane de 6 000 JPY non inclus).
- **Taïwan** : Kaohsiung ↔ Magong (Taiwan Navigation, 60,77 €).
- **Indonésie** : Merak ↔ Bakauheni (décret KM 61/2023, communiqué ASDP), Ketapang ↔ Gilimanuk (KM 61/2023),
  Padangbai ↔ Lembar (grille de la capitainerie de Lembar), Kayangan ↔ Poto Tano (arrêté du gouverneur de NTB), Sape
  ↔ Labuan Bajo et Tanjung Api-Api ↔ Tanjung Kalian (tarifs du décret relayés par la presse, écart signalé pour le
  second). **Le billet véhicule indonésien inclut ses occupants** : le prix affiché couvre donc tout l'équipage.
- **Malaisie** : Kuala Perlis ↔ Langkawi (grille RoRo d'avril 2026, 33,07 €).
- **Philippines** : Starlite (Batangas ↔ Calapan, Roxas ↔ Caticlan, Batangas ↔ Caticlan, Batangas ↔ Romblon, Romblon
  ↔ Magdiwang, Romblon ↔ Roxas City, Batangas ↔ Magdiwang), Trans-Asia (Cebu ↔ Tagbilaran, Masbate, Iloilo, Cagayan
  de Oro ; Tagbilaran ↔ Cagayan de Oro), Balingoan ↔ Benoni (grille de l'autorité portuaire PPA, 2021-2023).
- **Thaïlande** : Don Sak ↔ Ko Samui et Don Sak ↔ Ko Pha Ngan (Raja Ferry, grille de la province de Surat Thani,
  indexée sur le gazole ; conducteur déduit).
- **Inde** : Middle Strait ↔ Nilambur aux Andaman (arrêté n° 216 du 26/02/2026 ; à retirer à l'ouverture du pont).

Durées et distances : horaires relevés quand ils sont publiés, sinon ordres de grandeur et distances à vol d'oiseau
(signalés dans chaque note). Noms de liaisons en écriture latine, sauf en japonais, coréen, chinois, hakka et thaï
pour les liaisons de leur pays.

**Non retenues, faute de grille officielle lisible** — les îles concernées restent sans trajet par la mer : Jeju
(tarifs véhicules seulement dans la réservation en ligne), détroit de Qiongzhou vers Hainan (portails locaux
seulement), Sado, Oki, Tsushima, Iki, Gotō, Tanegashima, Yakushima, Shōdoshima, Rishiri, Rebun, Kinmen, Matsu (non
recherchées) ; Negros, Leyte-Samar, Siquijor, Guimaras, Palawan, Siargao, Sulu (FastCat hors ligne, Montenegro Lines
derrière un CAPTCHA, non contourné) ; Batam ↔ Bintan, Nias, Weh, Selayar, les liaisons de Kupang, Sumba, Kalimantan ;
Menumbok ↔ Labuan ; Ko Chang (grille reprise seulement par des sites d'information) ; Phú Quốc et Cát Bà (revendeurs
seulement) ; ferries publics du Bangladesh (portail BIWTC hors ligne) ; Nagapattinam ↔ Kankesanthurai (passagers
seulement). Les ferries de la Caspienne (Kazakhstan/Turkménistan ↔ Azerbaïdjan) relient deux points de la masse
continentale : le modèle ne peut pas les représenter.

### Océanie et collectivités françaises : sept liaisons (septembre 2026)

**Collectivités françaises et îles de métropole — correction.** Jusqu'ici, les lieux de Saint-Pierre-et-Miquelon,
Saint-Barthélemy, Saint-Martin, Wallis-et-Futuna, de la Polynésie française, de la Nouvelle-Calédonie et de Clipperton
étaient rangés dans la masse continentale, comme la métropole : un trajet pouvait « rouler » d'une île à l'autre. Ils
ont désormais leurs masses (règles `FR` avec `fallthrough` dans `scripts/iles/iles-france.js` : les autres lieux
français gardent la logique existante) : Saint-Pierre, Miquelon, Saint-Barthélemy, Saint-Martin, Wallis, Futuna,
Tahiti, Moorea, Raiatea, Tahaa, Huahine, Bora-Bora, Maupiti (les autres communes polynésiennes isolées), Grande Terre,
Lifou, Maré, Ouvéa, île des Pins, Belep, Clipperton. Même correction pour les **dépendances de la Guadeloupe**
(Marie-Galante, Terre-de-Haut, Terre-de-Bas, La Désirade) et **treize îles de métropole sans pont** : Yeu, Aix,
Belle-Île, Groix, Houat, Hœdic, Île-aux-Moines, Arz, Ouessant, Molène, Sein, Batz, Bréhat. Les îles reliées par pont
(Ré, Oléron, Noirmoutier) et les îles de communes dont la mairie est sur le continent (Porquerolles, Chausey, Lérins,
Frioul…) restent continentales.

**Liaisons retenues** (grille officielle, prix du véhicule en euros) :
- **Saint-Pierre ↔ Miquelon** — SPM Ferries (Collectivité territoriale) : voiture 40 €, camping-car 70 €, moto 25 €,
  passager 16 € (grille véhicules au 26 mai 2026 ; prix supposé par traversée).
- **Papeete ↔ Vaiare (Moorea)** — Aremiti, au 19 juillet 2026 : voiture 5 940 XPF (49,77 €), véhicule long 7 740 XPF,
  moto 1 480 XPF, adulte 2 350 XPF.
- **Fromentine ↔ Île d'Yeu** — Yeu Continent, recueil tarifaire 2026 : voiture 344,15 €, camping-car 777,35 €, moto
  84,50 €, passager 20 € par traversée.
- **Paynesville ↔ Raymond Island** (Victoria) — East Gippsland Shire Council, au 1er juillet 2026 : 9 AUD par véhicule
  (5,56 €), moto 2,78 €, piétons gratuits.
- **Mulifanua ↔ Salelologa** (Upolu ↔ Savai'i) — Samoa Shipping Corporation : voiture 95 WST (30,24 €), van 100 WST,
  moto 30 WST, passager 10 WST.
- **Pago Pago ↔ Ta'u** et **Pago Pago ↔ Ofu** (Samoa américaines) — administration portuaire, MV Manu'atele : voiture
  250 USD, véhicule large 500 USD, adulte 30 USD. Aucun tarif moto publié (prix `null` dans la grille) : à l'époque,
  ces deux liaisons n'étaient pas proposées à moto (depuis : elles le sont, sans prix et avec l'avertissement « tarif
  non communiqué », voir `priceStatus` dans « Liaisons sans tarif fixe publié »).

**Non retenues** — les îles concernées restent sans trajet par la mer :
- **Australie** : Spirit of Tasmania (prix selon la demande) ; SeaLink (Kangaroo Island, Bruny, K'gari, Stradbroke) et
  Manta Ray, sites derrière une vérification anti-robot, non contournée ; Micat, Magnetic Island, French Island,
  Furneaux (pas de grille véhicules publiée).
- **Nouvelle-Zélande** : Interislander et Bluebridge (prix seulement à la réservation) — **l'île du Nord et l'île du Sud
  ne sont donc pas reliées** ; Waiheke, Great Barrier, D'Urville (pas de grille par véhicule) ; Stewart Island et Kawau
  (passagers seulement).
- **Mélanésie** : Fidji (la commission de la concurrence fixe des tarifs passagers maximums mais facture les véhicules
  au fret, à la tonne ou au m³), Papouasie-Nouvelle-Guinée, Vanuatu et Salomon (aucune grille véhicules publiée).
- **Pacifique** : Tonga, Palaos, Chuuk, Marshall, Kiribati, Tuvalu, Cook, Tokelau (aucune grille véhicules) ; Apia ↔
  Pago Pago (passagers seulement) ; Saipan ↔ Tinian (pas de ligne régulière).
- **France** : Belle-Île et Groix (sites BreizhGo derrière une vérification anti-robot), Ouessant (véhicule sur l'île
  deux mois minimum), Marie-Galante et les Saintes (plus de transport de véhicules publié), îles Loyauté et îles
  Sous-le-Vent (passagers seulement ou pas de grille véhicules), Tahiti ↔ Moorea par Tauati (une seule liaison par
  paire : Aremiti retenue).

### Amériques : 162 liaisons (septembre 2026)

**Masses terrestres** (`scripts/iles/iles-nord.js`, `iles-centre.js`, `iles-caraibes.js`, `iles-sud-amerique.js`) : clés
partagées `northAmerica` (du Canada et de l'Alaska au Panama), `southAmerica` (de la Colombie à la Patagonie ; le bouchon
du Darién sépare les deux), `hispaniola`, `tierraDelFuego`, `saintMartinFR` (Sint Maarten rejoint la partie française).
Au-delà des îles, les **zones sans route** sont des masses à part : Hawaï (une par île), localités d'Alaska hors réseau
(Juneau, Ketchikan, Sitka, Kodiak, Nome, Bethel…), Nunavut, Nunavik, nord du Manitoba et des Territoires du Nord-Ouest,
toutes les localités du Groenland, Leticia–Tabatinga, Iquitos et l'Amazonie péruvienne, colombienne et brésilienne sans
route (Parintins, Tefé…), côte pacifique et Chocó colombiens, Mosquitia hondurienne, Darién panaméen au-delà de Yaviza,
Galápagos (une par île). **La Guyane française n'est pas reliée au reste du continent** : avec l'Amapá brésilien (pont de
l'Oyapock), elle forme la masse `guyane`, qu'aucune route ne relie au Pará ni au Suriname.

**Liaisons à grille officielle** (exemples) : BC Ferries (33 lignes, dont Tsawwassen ↔ Swartz Bay), Marine Atlantic (North
Sydney ↔ Port aux Basques), SPM Ferries (Fortune ↔ Saint-Pierre, 75 € la voiture), CTMA (Îles-de-la-Madeleine), traversiers
de Terre-Neuve, du Nouveau-Brunswick, de Nouvelle-Écosse et de l'Ontario (Wolfe Island gratuit), Steamship Authority
(Martha's Vineyard, Nantucket), Maine State Ferry Service, Washington State Ferries, Hatteras ↔ Ocracoke (gratuit), îles
des Grands Lacs ; Transcaribe (Calica ↔ Cozumel), UltraCarga (Punta Sam ↔ Isla Mujeres), Ferry Bocas (Almirante ↔ Isla
Colón) ; Ferries del Caribe (Santo Domingo ↔ San Juan), TTIT (Port of Spain ↔ Scarborough), Love City Car Ferries (Red Hook
↔ Cruz Bay), Bequia Express (Grenadines) ; Transmarchilay (Pargua ↔ Chacao), TABSA (Punta Delgada ↔ Bahía Azul), Caleta La
Arena ↔ Caleta Puelche, bacs gratuits de la Carretera Austral, New Haven ↔ Port Howard (Malouines), Conferry (Puerto La Cruz
↔ Margarita), DER-SP (São Sebastião ↔ Ilhabela), Henvil (Marajó).
**Sans tarif fixe lisible** (`unknown`) : Alaska Marine Highway (27 lignes, prix au moteur de réservation), Relais Nordik
(Anticosti, Basse-Côte-Nord), Sea Bridge (Saint-Kitts ↔ Nevis), Tyrrel Bay Express (Carriacou), Batabanó ↔ Nueva Gerona
(Cuba), La Ceiba ↔ Roatán, San Jorge ↔ Ometepe, Dalcahue ↔ Quinchao, Saint-Laurent-du-Maroni ↔ Albina (reprise partielle
en juillet 2026), bacs du Guyana (Moleson Creek ↔ South Drain, Parika ↔ Supenaam, Kurupukari…).
**Sans liaison** : Bahamas (véhicules sur cargos sans passagers), Caïmans, Turques-et-Caïques, Culebra (véhicules des
résidents), Saint-Croix, îles ABC, Galápagos, San Andrés, île de Pâques, Groenland (Arctic Umiaq Line : passagers), Hawaï
(aucun ferry pour voitures entre îles), Catalina et Mackinac (voitures interdites), Iquitos et Amazonie (barges de fret).

**Correction du moteur faite en chemin** : pour les pays ajoutés depuis 2025, deux pays devaient être déclarés
frontaliers (`ADJACENT_PAIRS`) pour qu'un trajet passe de l'un à l'autre, **même par ferry** : Busan ↔ Shimonoseki
(Corée ↔ Japon) n'était donc jamais proposé. Une liaison ferry entre deux masses terrestres suffit désormais ; la liste
des frontières ne vaut plus que pour la route.

### Antarctique, Bouvet et TAAF : aucune liaison modélisable (septembre 2026)

Aucun ferry pour véhicules. Le **Marion Dufresne** ravitaille Crozet, Kerguelen et Amsterdam depuis La Réunion et embarque
quelques passagers par rotation, sans véhicule ; **L'Astrolabe** dessert Dumont d'Urville depuis Hobart pour le personnel des
expéditions ; les îles Éparses sont relevées par avion ou bâtiment militaire ; les croisières antarctiques (Ushuaïa, Punta
Arenas) ne prennent pas de voiture et ne desservent pas les bases ; Bouvet n'a aucune desserte. Aucune route ne relie une base
à une autre. D'où aucune entrée dans `FERRY_ROUTES`, et aucun trajet (voir « Antarctique, île Bouvet et toutes les TAAF »).

## Modes de transport : distances, bornes, vans et motos (septembre 2026)

Un contrôle des 6 modes dans les 239 pays (2 868 tirages) avait montré que seuls la vitesse et les classes de péage et de ferry
changeaient d'un mode à l'autre : étapes de 131 km en moyenne à vélo comme en voiture (jusqu'à 1 075 km en une étape), recharges
calculées sur une autonomie fixe sans aucune borne réelle, rien pour les vans ni pour les motos.

**Distance max entre les étapes** — nouveau champ du formulaire, **80 km à vélo** et **400 km** pour les autres modes par défaut
(la valeur suit le mode tant que le visiteur ne l'a pas modifiée), de 10 à 3 000 km dans le formulaire (`min="10"`,
`max="3000"` dans `public/index.html` ; le serveur ramène toute valeur reçue entre 5 et 3 000 km). Chaque trajet entre deux étapes ET le retour au
départ restent sous cette distance routière (`LEG_CONSTRAINTS`, `legAllowed` dans lib/trip-engine.js) ; les traversées en ferry n'y
sont pas soumises. Quand le tirage s'interrompt faute de candidat, les dernières étapes sont retirées tant que le retour dépasse la
limite (c'était la source des étapes de plus de 1 000 km). Contrôle mondial après correction : **0 étape au-delà du maximum**
sur 3 192 par mode, 80 km au plus à vélo.

**Premier trajet et distance d'éloignement** (choix de l'utilisateur) : quand une distance d'éloignement est renseignée, le
**premier trajet peut dépasser la distance max entre étapes** (ex. 1 000 km d'éloignement avec 400 km max : premier trajet de
1 040 km, puis tous les trajets suivants et le retour ≤ 400 km) — pour bien commencer un voyage. Les bornes restent exigées en
voiture électrique. Exception inévitable : un séjour à une seule étape (ou d'une journée) revient par la même distance.
**Premier trajet de plus de 6 h de route** (hors traversée en ferry) : au moins **2 nuits à la première étape**, pour visiter le
lendemain de l'arrivée — nuit prise à l'étape qui en a le plus, sinon retrait de la dernière étape (ou d'une étape
intermédiaire) si le trajet qui la contourne reste permis ; sans effet sur un séjour d'une nuit ou si le maximum de jours par
ville est 1.

**Retour depuis un premier trajet lointain** : après un premier trajet de 1 000 km, les étapes suivantes étaient tirées au hasard
sans se rapprocher du départ — le séjour retombait sur une étape unique avec un retour de 1 310 km, au-delà du rayon et de la
distance max. Désormais : assez d'étapes pour revenir (`stopsForReturn`), chaque étape doit laisser un retour possible avec les
sauts restants (`canStillReturn`), jusqu'à 5 essais de construction avant l'itinéraire de secours, et l'exception du retour ne
vaut que pour un séjour PRÉVU à une seule étape.

**Éloignement impossible à concilier avec le retour** (ex. 1 000 km, 300 km max entre étapes, 3 jours) : il faudrait plus
d'étapes pour revenir que le séjour n'a de nuits. Le moteur faisait alors 5 essais sur un rayon de 1 400 km (~7 s) avant un
itinéraire de secours qui ignorait l'éloignement sans le dire. Ce cas est désormais détecté d'emblée (`LAST_TRIP_DIAGNOSTIC`,
réponse en moins de 0,1 s) et le formulaire affiche le message existant « Impossible : avec seulement 3 jours (2 nuits), on ne
peut pas s'éloigner d'au moins 1000 km puis revenir dans le rayon/temps de retour choisi (300 km)… », la valeur citée étant la
plus petite du rayon et de la distance max entre étapes.

**Performance des bornes** : vérifier les bornes de milliers de candidats (balayage de toutes les bornes à ~200 km) rendait un
tirage électrique de 76 à 93 s. Le plan de recharge échantillonne désormais la ligne directe tous les 10 km (bornes à moins de
15 km de chaque point) et n'est vérifié qu'au tirage, candidat par candidat dans un ordre aléatoire (`pickCandidate`) :
**0,2 à 0,7 s** par tirage.

**Tests** (15 scénarios × 10 tirages depuis Paris, Berlin, Madrid : 1 000 / 800 km d'éloignement en voiture, 200 km à vélo avec
80 km de rayon, 700 km en électrique) : aucun retour au-delà du rayon, aucun trajet suivant au-delà de la distance max ;
éloignement obtenu dans 70 à 100 % des tirages à vélo, 90 à 100 % en voiture. **Limite** : sur un séjour court et lointain
(5 jours, 800 km, rayon 300 km), la 2e nuit n'est possible que dans 20 à 70 % des tirages — les 4 nuits servent aux étapes du
retour, et retirer une étape ferait dépasser la distance max ou le rayon. Contrôle mondial (239 pays × 6 modes) inchangé :
0 étape au-delà du maximum.

**Voiture électrique : recharges sur bornes réelles** — `data/charging-stations.txt`, **222 512 bornes dans 121 pays** tirées de
l'export public d'**Open Charge Map** (`scripts/fetch-charging-stations.js`, archive lue en flux). OpenStreetMap était la
première source visée : instances Overpass publiques saturées (504, « server too busy »), extraction impossible dans des délais
raisonnables. Filtres : fournisseurs sous licence ouverte réutilisable sans clause non commerciale (contributeurs OCM CC BY 4.0,
NREL domaine public, UK National Charge Point Registry OGL, NOBIL CC BY, Bundesnetzagentur CC BY, data.gouv.fr, opérateurs CC0…),
fiche publiée, borne en service, accès public ou inconnu. Un trajet plus long que l'autonomie utile (320 km × 75 %) n'est retenu
que si une suite de bornes existe **à moins de 15 km de la ligne directe**, chaque arrêt étant la borne atteignable la plus
avancée (`evPlan`) ; l'étape affiche le nombre d'arrêts, leur durée et le lieu habité le plus proche de chaque borne (lien vers
la carte). Sans borne publique connue à moins de 20 km de l'arrivée : avertissement « prévoyez de recharger à l'hébergement ».
Avertissement général sur la couverture. **Limites** : couverture très inégale (États-Unis 75 339, Royaume-Uni 25 466, Allemagne
20 859, France 15 431… mais Pays-Bas 979, les données d'Oplaadpalen.nl étant sous licence non commerciale, et presque rien en
Chine et en Afrique) ; puissance, connecteurs et disponibilité non pris en compte ; départ de chaque étape supposé batterie pleine.

**Van : restrictions sourcées** — `scripts/transport/van-rules.js`, **152 règles** : 115 zones à faibles émissions (ZFE France,
Umweltzonen, ZBE Espagne, LEZ Belgique, milieuzones, ULEZ/CAZ, miljøzoner, Séoul, Tokyo, Mexico…), 18 zones à trafic limité
(Florence, Paris Centre…), 6 tunnels (Rotherhithe à Londres interdit au-delà de 2 m, Fréjus tarif au-delà de 3 m, Zion, Needles
Eye…), 3 cols, 10 routes (côte amalfitaine, Going-to-the-Sun Road, Formentor…). Sources officielles (sites des villes, gis.uba.de,
mieuxrespirerenville.gouv.fr, TfL, lez.brussels, gestionnaires de tunnels, parcs nationaux américains), presse reconnue à défaut,
signalée dans le fichier. Une étape dans une zone ou un trajet passant près d'un tunnel, col ou route restreint affiche un
avertissement orange avec le lien vers la source ; avertissement général sur le gabarit et les vignettes pour tout trajet en van.
**Limites** : l'accès aux ZFE dépend de la norme du véhicule (non modélisée), zones temporaires (pics de pollution) et petites ZTL
non listées, plusieurs pays sans entrée faute de règle ou de source.

**Moto : interdictions sourcées** — `scripts/transport/moto-rules.js`, **28 règles dans 20 pays** : réseau autoroutier interdit
(Corée du Sud, Taïwan, Viêt Nam, Thaïlande, Indonésie, Pakistan, Sri Lanka), seuil de cylindrée (Japon ≥ 126 cm³, Philippines
≥ 400 cm³), voies rapides interdites localement (Inde ×6 — un seul avertissement par pays, le texte étant le même —, Chine, Cambodge, Laos, Bangladesh, Kenya, Ouganda, Mexico, São Paulo,
Lima), villes (Yangon, Pékin pour les plaques extérieures, Canton, Shenzhen). Moto de tourisme supposée ≥ 500 cm³ : dans un pays
dont le réseau est entièrement interdit, trajet calculé par les routes secondaires (vitesse × 0,8) et sans péage ; sinon simple
avertissement (nom du pays dans la langue d'interface). `scripts/build-transport-rules.js` valide les deux fichiers et les injecte
dans trip-data.js (marqueurs AUTO TRANSPORT RULES).

19 nouvelles chaînes traduites dans les 161 langues ; PDF (français) : recharges réelles, avertissements et notes générales.

## Hébergement : plateformes locales là où Airbnb ou Booking manquent (septembre 2026)

Chaque étape proposait une recherche Airbnb et Booking.com partout, y compris là où ces services sont indisponibles.
Recherche sourcée par région (`scripts/lodging/lodging-europe-mena.js`, `lodging-asie.js`,
`lodging-afrique-ameriques-oceanie.js`), injectée par `scripts/build-lodging-rules.js` (`LODGING_RULES` dans trip-data.js) :
**39 pays**, pour chacun le statut d'Airbnb et de Booking.com (`ok` / `limited` / `absent`, source obligatoire) et des
plateformes locales réelles avec un modèle d'URL de recherche **vérifié sur une vraie ville**.

- **Absents** (lien retiré) : Russie et Biélorussie (retraits de 2022), Iran et Syrie (sanctions), Corée du Nord (embargo),
  Cuba (Booking suspendu depuis 2019), Chine continentale et Myanmar (Airbnb retiré en 2022 et 2023).
- **Limités** (lien gardé, plateformes locales ajoutées) : Airbnb au Japon, en Corée du Sud, à Hong Kong, Macao, Taïwan et
  Singapour (lois sur les locations courtes), Booking en Chine et en Turquie (interdit pour les réservations depuis la
  Turquie), petites îles et pays à très faible offre (Tuvalu, Tokelau, Pitcairn, Kiribati, Nauru, Sainte-Hélène, Malouines,
  Érythrée, Soudan, Tchad…).
- **Plateformes locales (37)** : Sutochno et Ostrovok (Russie, Biélorussie), Jajiga, Alibaba.ir et SnappTrip (Iran),
  HalaSyria (Syrie), TatilBudur et Jolly (Turquie), Gathern (Arabie saoudite), Trip.com (Chine, Hong Kong, Macao), Jalan et
  Rakuten Travel (Japon), Yeogi Eottae et NOL/Yanolja (Corée du Sud), AsiaYo (Taïwan), OYO et MakeMyTrip (Inde), Traveloka
  et tiket.com (Indonésie), Homestay.com et CubaCasas.net (Cuba), LekkeSlaap (Afrique du Sud), Hotels.ng (Nigeria), Stayz
  (Australie), Bookabach et Holiday Houses (Nouvelle-Zélande), sites officiels du tourisme des petites îles.
- Recherche pré-remplie (ville, et dates quand le site les accepte) pour Sutochno, Jajiga, Jalan, Rakuten, Yeogi Eottae,
  AsiaYo, OYO, LekkeSlaap, Hotels.ng, Stayz, Bookabach, Holiday Houses ; page de recherche ou liste nationale pour les
  autres (identifiant de ville interne, formulaire non transposable).
- Aucune plateforme connue (Corée du Nord) : message traduit dans les 161 langues invitant à contacter directement les
  hébergements ou l'office du tourisme ; PDF : liens locaux et même message.

**Limites** : noms de lieux romanisés — Yeogi Eottae ne trouve que les grandes villes en lettres latines (Séoul, Busan), Jalan
et Rakuten cherchent dans les noms d'hôtels (petits villages parfois sans résultat), OYO renvoie une page 404 là où il n'a pas
d'hôtel ; sites iraniens surtout en persan et paiement par carte iranienne ; en Russie, Ostrovok n'accepte pas Visa ; sources
faibles pour la Syrie (témoignages) et la Corée du Nord (embargo et constat). Plateformes écartées : Yandex Travel et Etstur
(contrôles anti-robots, non contournés), Avito, Agoda, Ctrip.com (connexion exigée), Goibibo, GoZayaan, iVIVU, Jabama,
Eghamat24, Otaghak, Cuba Junky…

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

## Devise

Le sélecteur de devise (bouton juste à côté du sélecteur de langue, en haut de la page) laisse le
visiteur figer une seule devise pour tout le site — par défaut ("Automatique"), chaque étape de
l'itinéraire affiche sa PROPRE devise selon son pays (voir `countryCurrency` dans `app.js`, ex. un
budget affiché en DKK pour une étape danoise puis en RSD pour une étape serbe le lendemain) ; un
choix explicite remplace ce comportement par une seule devise fixe partout, sur le plafond de prix
budget/logement affiché ET sur les liens Airbnb/Booking générés (jamais sur le péage, toujours
affiché en euros quelle que soit la devise choisie ou le pays traversé — voir "Pays couverts").
Mémorisé dans le `localStorage` du navigateur (`js/app.js`, clé `currency`, même mécanique que
`lang`/`theme`) ; la devise choisie accompagne la requête de tirage (`preferredCurrency`, pour les plafonds de prix
et les liens d'hébergement calculés côté serveur), sans y être conservée. La liste proposée est RECONSTRUITE depuis `COUNTRIES`
plutôt que codée à la main (`CURRENCY_OPTIONS`) : 152 devises au 18/09/2026 (EUR + toutes les devises des pays
couverts, les mêmes que les clés de `BUDGET_PRICE_MAX` dans `public/js/trip-data.js`), un nouveau pays avec une nouvelle devise y apparaît automatiquement.
Chaque entrée affiche son vrai symbole/abréviation d'usage courant (`CURRENCY_GLYPH`, ex. « CZK Kč »,
« RSD дин. ») en plus du code ISO — un symbole SEUL resterait ambigu pour les trois couronnes
nordiques qui partagent toutes « kr » (DKK/NOK/SEK) ou pour BAM/CHF, d'où le code toujours présent à
côté ; ce glyphe reste propre à l'affichage du sélecteur, jamais utilisé pour le montant affiché
dans le formulaire (`CURRENCY_SYMBOL`, resté au code ISO pour la même raison déjà documentée plus
haut — éviter l'ambiguïté GBP/Guernesey-Jersey).

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
- Communes andorranes/espagnoles/portugaises/belges/néerlandaises/luxembourgeoises/suisses/allemandes/italiennes/autrichiennes/saint-marinaises/liechtensteinoises/monégasques/maltaises/guernesiaises/jersiaises/tchèques/polonaises/slovaques/hongroises/slovènes/croates/bosniennes/britanniques/irlandaises/mannoises/danoises/norvégiennes/suédoises/finlandaises/ålandaises/albanaises/serbes/macédoniennes/bulgares/roumaines/lettonnes/lituaniennes/estoniennes/vaticanes/islandaises/féroïennes/gibraltariennes/moldaves/biélorusses/ukrainiennes/turques/monténégrines/kosovares/grecques/géorgiennes/arméniennes/azerbaïdjanaises/syriennes/chypriotes/libanaises/israéliennes/palestiniennes/jordaniennes/égyptiennes/libyennes/marocaines/algériennes/tunisiennes/sahraouies/mauritaniennes/maliennes/sénégalaises/gambiennes/capverdiennes/guinéennes/bissau-guinéennes/sierra-léonaises/libériennes/burkinabè/ivoiriennes/ghanéennes/togolaises/nigériennes/béninoises/nigérianes/tchadiennes/centrafricaines/soudanaises/sud-soudanaises/érythréennes/éthiopiennes/djiboutiennes/somaliennes/kényanes/ougandaises/tanzaniennes/rwandaises/burundaises/congolaises/gabonaises/équato-guinéennes/santoméennes/angolaises/zambiennes/malawites/mozambicaines/zimbabwéennes/botswanaises/namibiennes/sud-africaines/eswatiniennes/lésothiennes/comoriennes/malgaches/mauriciennes/seychelloises/camerounaises, de Sainte-Hélène, d'Ascension, de Tristan da Cunha et des Terres australes et antarctiques françaises/russes/du Svalbard et de Jan Mayen/saoudiennes/bahreïniennes/émiriennes/irakiennes/iraniennes/koweïtiennes/omanaises/qatariennes/yéménites/afghanes/kazakhes/kirghizes/ouzbèkes/tadjikes/turkmènes/bangladaises/bhoutanaises/indiennes/maldiviennes/népalaises/pakistanaises/srilankaises, du Territoire britannique de l'océan Indien/chinoises/hongkongaises/macanaises/nord-coréennes/sud-coréennes/japonaises/mongoles/taïwanaises/brunéiennes/cambodgiennes/indonésiennes/laotiennes/malaisiennes/birmanes/philippines/singapouriennes/thaïlandaises/est-timoraises/vietnamiennes, de l'île Christmas et des îles Cocos (`scripts/build-asie-communes.js`)/australiennes/néo-zélandaises/papouasiennes/salomonaises/vanuataises/fidjiennes/samoanes/tonguiennes/tuvaluanes/kiribatiennes/nauruanes/marshallaises/micronésiennes/paluanes/niuéennes/cookiennes/tokelauanes/guamiennes/mariannaises/samoanes américaines, des îles mineures éloignées des États-Unis, de Pitcairn, de l'île Norfolk et des îles Heard-et-MacDonald (`scripts/build-oceanie-communes.js`)/états-uniennes/canadiennes/mexicaines/groenlandaises/bermudiennes/guatémaltèques/béliziennes/salvadoriennes/honduriennes/nicaraguayennes/costaricaines/panaméennes/cubaines/jamaïcaines/haïtiennes/dominicaines/bahaméennes/kittitiennes/antiguaises/dominiquaises/saint-luciennes/vincentaises/barbadiennes/grenadiennes/trinidadiennes/portoricaines, des îles Vierges américaines et britanniques, des îles Turques-et-Caïques et Caïmans, d'Anguilla, de Montserrat, d'Aruba, de Curaçao, de Sint Maarten et des Pays-Bas caribéens/colombiennes/vénézuéliennes/guyaniennes/surinamaises/équatoriennes/péruviennes/boliviennes/brésiliennes/paraguayennes/uruguayennes/argentines/chiliennes, des Malouines et de la Géorgie du Sud-et-les îles Sandwich du Sud (`scripts/build-ameriques-communes.js`), bases scientifiques de l'Antarctique et île Bouvet (`scripts/build-antarctique-communes.js`) : [GeoNames](https://www.geonames.org)
  (licence [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/)) — voir "Pays couverts" ci-dessus.
- Codes postaux géorgiens (absents de GeoNames pour ce pays, voir "Pays couverts") : annuaire tiers
  [yell.ge](https://www.yell.ge) — PAS une source officielle ni sous licence ouverte explicite, choix
  de dernier recours documenté comme tel, rapproché par nom (écriture géorgienne) des communes
  GeoNames ci-dessus.
- Codes postaux bosniens (absents de GeoNames pour ce pays, voir "Pays couverts") : liste
  [Wikipedia "Postal codes in Bosnia and Herzegovina"](https://en.wikipedia.org/wiki/Postal_codes_in_Bosnia_and_Herzegovina)
  (licence [CC-BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)), rapprochée par nom des
  communes GeoNames ci-dessus.
- Codes postaux monténégrins (absents de GeoNames ET d'aucune liste Wikipedia détaillée, voir "Pays
  couverts") : annuaire tiers [postanskibroj.cu.rs/crnagora/](https://postanskibroj.cu.rs/crnagora/)
  (136 entrées) — PAS une source officielle ni sous licence ouverte explicite, choix de dernier
  recours documenté comme tel, rapproché par nom des communes GeoNames ci-dessus.
- Codes postaux kosovars (absents de GeoNames, l'article Wikipedia correspondant ne liste que des
  plages par district) : [Posta e Kosovës](https://postakosoves.com) elle-même, la poste nationale
  officielle du Kosovo (133 entrées extraites du tableau JavaScript embarqué dans sa page de
  recherche de codes postaux), rapproché par nom des communes GeoNames ci-dessus.
- Codes postaux grecs (absents de GeoNames ET d'aucune liste Wikipedia détaillée par lieu, voir "Pays
  couverts") : jeu de données tiers [MentatInnovations/grpostcodes](https://github.com/MentatInnovations/grpostcodes)
  (licence [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0), ~1 250 entrées AVEC coordonnées
  GPS), rapproché par coordonnée la plus proche (et non par nom) des communes GeoNames ci-dessus.
- Codes postaux arméniens (absents de GeoNames pour ce pays, voir "Pays couverts") : liste officielle
  des 775 bureaux de poste d'[Haypost](https://www.haypost.am), la poste nationale arménienne
  elle-même — source plus directe que yell.ge/postanskibroj ci-dessus, rapprochée par nom des communes
  GeoNames (`scripts/build-am-communes.js`, 458 communes retenues).
- Codes postaux tunisiens (absents de GeoNames pour ce pays, voir "Pays couverts") : jeu tiers
  [mn-youssef/state-municipality-tunisia](https://github.com/mn-youssef/state-municipality-tunisia)
  (4 788 localités AVEC coordonnées, 24 gouvernorats) — PAS une source officielle et AUCUNE licence
  déclarée sur le dépôt, choix de dernier recours documenté comme tel au même titre que yell.ge et
  postanskibroj ci-dessus, rapproché par coordonnée la plus proche des communes GeoNames.
- Maroc et Sahara occidental : le champ affiché n'est PAS un code postal mais le code de RÉGION
  [ISO 3166-2:MA](https://www.iso.org/iso-3166-country-codes.html) pour le Maroc (le fichier de codes
  postaux GeoNames marocain ne contient aucune grande ville, démonstration chiffrée dans
  `scripts/build-maghreb-communes.js`), et une étiquette informelle "EH" pour le Sahara occidental,
  dépourvu de toute subdivision exploitable.
- Les TREIZE pays d'Afrique de l'Ouest (Mauritanie, Mali, Sénégal, Gambie, Cap-Vert, Guinée,
  Guinée-Bissau, Sierra Leone, Liberia, Burkina Faso, Côte d'Ivoire, Ghana, Togo) : aucun fichier
  GeoNames de codes postaux, aucun jeu tiers retenu. Le champ affiché est le code de division
  administrative de GeoNames lui-même, repris tel quel et étiqueté comme informel.
- Les ONZE pays du Sahel, d'Afrique centrale et de la Corne (Niger, Bénin, Nigeria, Tchad,
  Centrafrique, Soudan, Soudan du Sud, Érythrée, Éthiopie, Djibouti, Somalie) : même situation, même
  choix — code de division administrative GeoNames, repris tel quel, y compris là où il retarde sur
  les réformes territoriales récentes (Éthiopie, Soudan).
- Les VINGT-QUATRE pays d'Afrique orientale, centrale et australe et de l'océan Indien : même règle.
  Les fichiers postaux GeoNames du Kenya, du Malawi et d'Afrique du Sud existent mais ont été mesurés et
  écartés (codes superposés, bureaux de poste) — voir "Pays couverts".
- Cameroun : même règle. Sainte-Hélène, Ascension, Tristan da Cunha : VRAIS codes postaux, un par île —
  STHL 1ZZ et TDCU 1ZZ ([fiches UPU](https://www.upu.int/UPU/media/upu/PostalEntitiesFiles/addressingUnit/shnEn.pdf),
  [poste de Tristan](https://www.tristandc.com/postoffice.php)), ASCN 1ZZ (sources secondaires).
- Russie, Svalbard et Jan Mayen : fichiers de codes postaux GeoNames (pipeline standard), voir "Pays couverts".
- Prix hôteliers russes : [Rosstat, prix moyens à la consommation](https://rosstat.gov.ru/statistics/price) (août 2026).
- Tarifs de ferry russes : [Oboronlogistika](https://obl.ru/services/sea/parom/) (Oust-Louga-Baltiïsk), [SASCO](https://www.sasco.ru/service/ferry/) (Vanino-Kholmsk).
- Prix hôtelier sud-africain de contrôle : [Stats SA, Tourist accommodation P6410](https://www.statssa.gov.za/publications/P6410/P6410June2026.pdf) (juin 2026).
- Tarifs de ferry capverdiens : grilles officielles de [CV Interilhas](https://www.cvinterilhas.cv/tariffs)
  (Despacho n.º 01/2024, Boletim Oficial du 11 janvier 2024) — voir "Ferries" ci-dessus.
- Syrie, Liban, Israël, Palestine, Jordanie, Égypte, Libye : AUCUNE source de codes postaux, ni
  GeoNames ni tierce, n'a été trouvée pour ces sept pays — et la Syrie n'a tout simplement pas de
  système de codes postaux en usage. Le champ `cp` n'y contient donc PAS un code postal mais le code
  de gouvernorat/district/province [ISO 3166-2](https://www.iso.org/iso-3166-country-codes.html)
  (norme publique), voire une étiquette régionale informelle là où la norme ne descend pas assez
  finement — voir "Pays couverts" pour le détail pays par pays.
- Alias multilingues de ces mêmes communes : GeoNames `alternateNamesV2` (même licence CC-BY 4.0) —
  voir "Langues" ci-dessus.
- Points d'intérêt : [OpenStreetMap](https://www.openstreetmap.org) via l'API Overpass — figés dans
  `featured.txt` pour ~300 communes françaises, interrogés en direct via `/api/pois` pour les autres
  (voir "Activités réelles" ci-dessus), dans tous les pays couverts — © les contributeurs
  d'OpenStreetMap, licence [ODbL](https://opendatacommons.org/licenses/odbl/).
- Fond de carte : tuiles [OpenStreetMap](https://www.openstreetmap.org) standard, chargées via
  [Leaflet](https://leafletjs.com) (licence BSD-2-Clause, hébergé localement) — © les contributeurs
  d'OpenStreetMap, licence ODbL.
- Drapeaux du sélecteur de langue : [circle-flags](https://github.com/HatScripts/circle-flags) par
  HatScripts (licence MIT, hébergé localement — `public/img/flags/`, 264 fichiers SVG (169 Ko), dont dix-neuf
  drapeaux RÉGIONAUX — Tatarstan, Bachkortostan, Sakha, Tchétchénie, Mordovie et Oudmourtie ajoutés en dernier) — voir "Langues" ci-dessus. **Exception** : le drapeau amazigh
  (`amazigh.svg`), absent de circle-flags, vient de
  [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Berber_flag.svg) (**domaine public**),
  simplement recadré en cercle sans redessiner sa géométrie. Même traitement pour les drapeaux de
  [Sakha](https://commons.wikimedia.org/wiki/File:Flag_of_Sakha.svg) et de
  [Mordovie](https://commons.wikimedia.org/wiki/File:Flag_of_Mordovia.svg) (`ru-sa.svg`, `ru-mo.svg`,
  domaine public sur Commons).
- Police tifinagh : [Noto Sans Tifinagh](https://fonts.google.com/noto/specimen/Noto+Sans+Tifinagh)
  (licence [SIL Open Font License 1.1](https://openfontlicense.org), hébergée localement —
  `public/fonts/`, ~39 ko), nécessaire à l'affichage de l'amazighe standard marocain — voir "Langues"
  ci-dessus.
- Polices tibétaine et thâna : [Noto Serif Tibetan](https://fonts.google.com/noto/specimen/Noto+Serif+Tibetan) et
  [Noto Sans Thaana](https://fonts.google.com/noto/specimen/Noto+Sans+Thaana) (SIL OFL 1.1, hébergées localement,
  ~610 ko et ~27 ko), pour le dzongkha et le divehi.
- Drapeau du Karakalpakstan : [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Flag_of_Karakalpakstan.svg)
  (domaine public), recadré en cercle (`uz-qr.svg`).
- Police guèze : [Noto Sans Ethiopic](https://fonts.google.com/noto/specimen/Noto+Sans+Ethiopic)
  (même licence SIL OFL 1.1, hébergée localement, ~377 ko), nécessaire à l'affichage
  de l'amharique et du tigrinya.
- Tarifs de péage (le libellé « Péage (barème …) » de chaque étape nomme désormais le barème du pays appliqué — `TOLL_SOURCE`
  dans trip-data.js, ex. « Autostrade per l'Italia 2026 » en Italie — au lieu d'« ASF 2026 » pour tous les pays ; même
  mention dans le PDF) : guides tarifaires officiels [VINCI Autoroutes](https://www.vinci-autoroutes.com/fr/)
  (France — voir `public/data/toll-reference.json` pour le détail des 38 liaisons utilisées),
  [Autopistas/Abertis](https://www.autopistas.com) (Espagne), [Ascendi](https://www.ascendi.pt) /
  [Via Verde](https://www.vialivre.pt) (Portugal), [Autostrade per l'Italia](https://www.autostrade.it)
  (Italie), [HAC](https://www.hac.hr) (Croatie — via mojkalkulator.com.hr pour l'agrégation des
  tarifs 2026), JP Autoceste FBiH / AD Autoputevi RS (Bosnie-Herzégovine — via tolls.eu pour
  l'agrégation des tarifs 2026), [Putevi Srbije](https://www.putevi-srbije.rs) (Serbie — via tolls.eu
  pour l'agrégation des tarifs 2026), [Entreprise publique des routes d'État](https://roads.org.mk)
  (Macédoine du Nord — via fuel-prices.eu/tolls.eu pour l'agrégation des tarifs 2026), [Olympia
  Odos](https://www.olympiaodos.gr) / [Egnatia Odos](https://egnatia.eu/) (Grèce — via mydiodia.gr
  pour l'agrégation des tarifs 2026), [Otoyol A.Ş.](https://isletme.otoyolas.com.tr/gecis-ucreti-hesapla/) (Turquie — via
  plusieurs sources convergentes début septembre 2026 pour les tarifs 1er juillet 2026 de
  l'autoroute Gebze-Orhangazi-İzmir/O-5), [AAYDA / Agence d'État des routes](https://www.aayda.gov.az)
  (Azerbaïdjan — barème officiel de l'unique route à péage du pays, la M-1 Bakou-Quba),
  Derech Eretz Highways (Israël — route 6/Kvish Sderot Yisrael, via kvish6.co.il) et Carmelton
  (tunnels du Carmel à Haïfa), ces deux derniers tarifés AU TRONÇON et non au kilomètre, donc
  convertis en €/km avec une précision plus faible que les autres pays (voir `trip-data.js`),
  [ADM](https://www.adm.co.ma) (Maroc — grille tarifaire en ligne, liaison Casablanca-Rabat rapportée
  aux 62 km publiés par ADM ; attention, le PDF téléchargeable depuis cette même page est périmé et
  affiche encore les tarifs de janvier 2024, seul le tableau HTML est à jour),
  [Société Tunisie Autoroutes](https://www.tunisieautoroutes.tn) (Tunisie — calculateur officiel,
  barème du décret du 15 juillet 2025, liaison M'saken-Sfax rapportée aux PK publiés par la STA),
  [Société nationale Autoroutes du Sénégal](https://autoroutesdusenegal.sn) et [SECAA/Eiffage](https://www.autoroutedelavenir.sn)
  (Sénégal — tronçon fermé Mbour-Kaolack pour le tarif kilométrique, grille de la gare de Thiaroye
  pour les rapports entre catégories) —
  [MLIT / NEXCO](https://www.mlit.go.jp) (Japon — barème kilométrique des autoroutes nationales),
  [Freeway Bureau](https://www.freeway.gov.tw) (Taïwan — péage électronique au kilomètre) —
  voir "Pays couverts" pour la méthode de calcul hors de France (échantillon plus restreint que
  pour la France).
- Vignettes annuelles : boutiques officielles [via.admin.ch](https://via.admin.ch) (Suisse),
  [asfinag.at](https://www.asfinag.at) (Autriche), [edalnice.gov.cz](https://edalnice.gov.cz)
  (République tchèque), [eznamka.sk](https://eznamka.sk) (Slovaquie), [e-matrica.hu](https://nemzetiutdij.hu)
  (Hongrie), [evinjeta.dars.si](https://evinjeta.dars.si) (Slovénie),
  [bgtoll.bg](https://www.bgtoll.bg) (Bulgarie), [e-rovinieta.ro](https://www.erovinieta.ro)
  (Roumanie), [evinieta.gov.md](https://evinieta.gov.md) (Moldavie),
  [ev.beltoll.by](https://ev.beltoll.by) (Biélorussie) — voir "Pays couverts" ci-dessus.
- Tarifs de ferry croates : [Jadrolinija](https://www.jadrolinija.hr) pour dix des onze lignes,
  [Rapska Plovidba](https://www.rapska-plovidba.hr) pour Rab (Stinica-Mišnjak) — voir "Ferries"
  ci-dessus.
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
  (Sardaigne), [Caronte & Tourist](https://www.carontetourist.it) (Sicile, détroit de Messine),
  [Virtu Ferries](https://www.virtuferries.com) (Malte ↔ Sicile), [Gozo
  Channel](https://www.gozochannel.com) (Malte ↔ Gozo), [Condor
  Ferries](https://www.condorferries.co.uk) (Jersey/Guernesey ↔ Saint-Malo, et la ligne inter-îles),
  [Bornholmslinjen](https://www.bornholmslinjen.com) (Ystad ↔ Rønne, Bornholm), [Destination
  Gotland](https://www.destinationgotland.se) (Nynäshamn ↔ Visby, Gotland), [Viking
  Line](https://www.vikingline.fi) (Turku ↔ Mariehamn, Åland), [Blue Star
  Ferries](https://www.bluestarferries.com)/[Minoan Lines](https://www.minoan.gr)/[Seajets](https://www.seajets.gr)/
  ANEK-Superfast (Le Pirée ↔ Crète/Dodécanèse/Cyclades/Égée du Nord/golfe Saronique),
  [Levante Ferries](https://www.levanteferries.com) (Ionienne — Patras/Kyllíni), KerkyraLines/Kerkyra
  Seaways (Igoumenitsa ↔ Corfou), [Triton Ferries](https://tritonferries.gr/) (Néapoli ↔ Cythère),
  Hellenic Seaways/Alonissos Skopelos Skiathos Shipping Company (Vólos/Kými ↔ Sporades) — agrégées via
  [ferryhopper.com](https://www.ferryhopper.com)/[ferryscanner.com](https://www.ferryscanner.com/en/ferry)/
  [directferries.com](https://www.directferries.com), tarifs basse saison 2026 —, [SSL/Strandfaraskip
  Landsins](https://www.ssl.fo) (Tórshavn ↔ Tvøroyri, Suðuroy, îles Féroé — tarifs officiels non
  promotionnels 2026, ssl.fo/prices)
  — voir "Ferries" ci-dessus pour la méthode (un ordre de grandeur indicatif par ligne, comme pour
  les péages, pas un tarif garanti).

Toutes ces données sont figées au moment de la génération de ce projet (2026). Pour les rafraîchir,
relancez les mêmes sources et remplacez les fichiers dans `public/data/`.
