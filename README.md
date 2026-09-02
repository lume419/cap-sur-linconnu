# Cap sur l'Inconnu

Générateur de road trip mystère : tirage au sort d'un itinéraire réel (jusqu'à 21 jours, 15 villes),
avec de vraies communes (France, Andorre, Espagne, Portugal, Belgique, Pays-Bas, Luxembourg, Suisse,
Allemagne, Italie, Autriche, Saint-Marin, Liechtenstein, Monaco, Malte, Guernesey, Jersey, République
tchèque, Pologne, Slovaquie, Hongrie, Slovénie, Croatie, Bosnie-Herzégovine, Royaume-Uni, Irlande,
île de Man — voir "Pays couverts" plus bas pour l'ajout d'un nouveau pays), de vrais points
d'intérêt (OpenStreetMap), de vrais tarifs de péage, de vraies traversées en ferry pour la Corse/les
Baléares/les Canaries/la Sardaigne/la Sicile/Malte/Gozo/les îles Anglo-Normandes/onze îles croates/la
Manche (Douvres-Calais)/la mer d'Irlande (Holyhead-Dublin)/la mer d'Irlande encore (Heysham-Douglas)
(voir "Ferries" plus bas) et une carte interactive (Leaflet + tuiles OpenStreetMap). Interface
disponible en français, anglais, espagnol, portugais, néerlandais, allemand, luxembourgeois, italien,
romanche, bas-allemand, sorabe, frison du Nord, sarde, frioulan, ladin, maltais, monégasque, jèrriais,
guernésiais, kachoube, rusyn/lemko, istro-roumain, catalan, basque, galicien, occitan, breton, corse,
mirandais, irlandais, mannois, gallois, gaélique écossais, cornique et scots (voir "Langues" plus bas).

Anciennement un artefact Claude autonome (un seul fichier HTML) ; ce dossier est la même application
restructurée en petit projet Node.js statique, prête à héberger sur un serveur privé.

## Structure

```
cap-sur-linconnu/
├── package.json
├── server.js              # Express : sert public/ tel quel + une route GET /api/photo
├── scripts/
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
│       │                        # (19 alias, dont 5 catalans — rattrapage catalan/basque/galicien/
│       │                        # occitan, voir "Langues")
│       ├── aliases-es.txt      # idem pour l'Espagne (2 815 alias, dont 465 basques et 422 catalans
│       │                        # depuis le rattrapage — 1 700 avant)
│       ├── aliases-pt.txt      # idem pour le Portugal (118 alias, dont 14 mirandais depuis le
│       │                        # rattrapage)
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
│       ├── communes-gg.txt     # 260 lieux guernesiais, même format (Sercq exclue, voir "Ferries")
│       ├── aliases-gg.txt      # idem pour Guernesey
│       ├── communes-je.txt     # 84 lieux jersiais, même format
│       ├── aliases-je.txt      # idem pour Jersey (alias FR/EN/DE/NRF-JE/...)
│       ├── communes-cz.txt     # ~16 400 lieux tchèques, même format (Prague/Plzeň corrigés)
│       ├── aliases-cz.txt      # idem pour la République tchèque (817 alias, dont 751 en allemand)
│       ├── communes-pl.txt     # ~45 400 lieux polonais, même format (Warszawa/Łódź/Bielsko-Biała corrigés)
│       ├── aliases-pl.txt      # idem pour la Pologne (alias FR/EN/DE/CSB/RUE/..., 1 360 au total)
│       ├── communes-sk.txt     # ~4 985 lieux slovaques, même format (aucune correction nécessaire)
│       ├── aliases-sk.txt      # idem pour la Slovaquie (86 alias, dont 18 en rusyn — Prešov)
│       ├── communes-hu.txt     # ~10 050 lieux hongrois, même format (aucune correction nécessaire)
│       ├── aliases-hu.txt      # idem pour la Hongrie (333 alias, dont 323 en allemand)
│       ├── communes-si.txt     # ~6 559 lieux slovènes, même format (aucune correction nécessaire)
│       ├── aliases-si.txt      # idem pour la Slovénie (461 alias, dont 289 en italien — côte istrienne)
│       ├── communes-hr.txt     # ~11 323 lieux croates, même format (48 noms corrigés Ð->Đ, voir
│       │                        # scripts/build-country-communes.js, confusion de caractère GeoNames)
│       ├── aliases-hr.txt      # idem pour la Croatie (116 alias, dont 82 en italien — Istrie/Dalmatie)
│       ├── communes-ba.txt     # 374 lieux bosniens SEULEMENT (codes postaux Wikipedia, pas GeoNames
│       │                        # — voir "Pays couverts" et scripts/build-ba-communes.js)
│       ├── aliases-ba.txt      # idem pour la Bosnie-Herzégovine (12 alias)
│       ├── communes-gb.txt     # 34 196 lieux britanniques, même format (codes postaux "outward"
│       │                        # GeoNames — districts, pas des codes complets, voir "Pays couverts")
│       ├── aliases-gb.txt      # idem pour le Royaume-Uni (384 alias — 156 doublons gallois/gaéliques/
│       │                        # corniques mal étiquetés "br"/"ca"/"eu"/... écartés, voir le
│       │                        # commentaire CELTIC_PROBE_LANGS dans scripts/build-aliases.js)
│       ├── communes-ie.txt     # 7 181 lieux irlandais, même format (codes postaux GeoNames très
│       │                        # grossiers pour l'Irlande — 139 "routing keys" Eircode nationaux
│       │                        # seulement, contre 27 450 districts au Royaume-Uni ; huit exonymes
│       │                        # anglais corrigés, voir NAME_OVERRIDES dans build-country-communes.js)
│       ├── aliases-ie.txt      # idem pour l'Irlande (1 225 alias, dont 1 108 en irlandais/Gaeilge)
│       ├── communes-im.txt     # 43 lieux mannois, même format (le plus petit pays couvert avec
│       │                        # Monaco — aucune correction de nom nécessaire)
│       ├── aliases-im.txt      # idem pour l'île de Man (19 alias, dont 13 en mannois/Gaelg)
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
Luxembourg, Suisse, Allemagne, Italie, Autriche, Saint-Marin, Liechtenstein, Monaco, Malte, Guernesey,
Jersey, République tchèque, Pologne, Slovaquie, Hongrie, Slovénie, Croatie, Bosnie-Herzégovine,
Royaume-Uni, Irlande, île de Man et Danemark pour l'instant (Norvège/Suède/Finlande à venir dans la même
série). Chaque pays
ajoute deux à trois choses, indépendamment des autres :

1. **Un fichier `public/data/communes-XX.txt`** (même format compact que `communes.txt` — voir
   `scripts/build-country-communes.js`, qui télécharge et convertit les données publiques
   [GeoNames](https://www.geonames.org) — licence CC-BY 4.0 — pour le pays demandé : population,
   coordonnées, codes postaux, nom de région). Chargé au démarrage de l'app comme les autres
   (`COUNTRIES` dans `app.js`), fusionné dans le même tableau de communes que la France — une ville
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
   n'existe entre les deux : un choix plus discutable, assumé comme tel plutôt que dissimulé.
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
   la tranche "moyen" plutôt qu'en dessous, comme pour les autres devises.
   La devise détermine le plafond de prix affiché pour le logement
   (`BUDGET_PRICE_MAX`, un jeu de valeurs par devise, pas une simple conversion au taux de change) et
   la devise des liens de recherche Airbnb/Booking générés — jamais le péage, toujours affiché en
   euros quelle que soit la devise du pays (voir `toll.enabled`/`toll.disabled` dans `i18n.js`, non
   paramétrées par devise) ; la Bosnie-Herzégovine est le premier pays `hasToll:true` hors zone euro
   ici couvert, son péage reste donc affiché en € comme celui de la France ou de la Croatie, jamais
   en KM.

La carte du parcours (Leaflet + tuiles OpenStreetMap, voir plus bas) n'a besoin d'aucun réglage par
pays : les tuiles couvrent nativement le monde entier, il suffit que les nouvelles communes aient
des coordonnées valides.

Optionnel : **des alias multilingues** pour saisir une ville dans une autre langue que son nom
local (voir "Langues" ci-dessous, `scripts/build-aliases.js`) — non disponible pour la France (ses
communes viennent de geo.api.gouv.fr, pas de GeoNames, aucun identifiant commun pour les relier aux
noms alternatifs GeoNames).

## Langues

Interface traduite en français, anglais, espagnol, portugais, néerlandais, allemand, luxembourgeois,
italien, romanche, bas-allemand, sorabe, frison du Nord, sarde, frioulan, ladin, maltais, monégasque,
jèrriais, guernésiais, kachoube, rusyn/lemko et istro-roumain (`public/js/i18n.js` — dictionnaire à
plat par langue + petit moteur `t(clé, variables)`/`tl(clé)` pour les listes) — auxquelles se sont
ajoutées, au fil des passages suivants, le catalan/le basque/le galicien/l'occitan/le breton/le
corse/le mirandais (rattrapage régional France/Espagne/Portugal/Andorre), l'irlandais/le mannois/le
gallois/le gaélique écossais/le cornique/le scots (Royaume-Uni, Irlande, île de Man), puis huit
langues nationales de pays déjà couverts par ailleurs — tchèque, polonais, slovaque, hongrois,
slovène, croate, bosniaque et serbe — dans un rattrapage détaillé plus bas, et enfin le danois, arrivé
avec le Danemark (voir "Pays couverts" et plus bas, série des pays nordiques). Le
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
Andorre (dont 5 catalans — ex. "San Julià" pour "Sant Julià de Lòria"). La France, elle, n'a et
n'aura jamais d'alias (voir plus bas "Saisir une ville dans une autre langue") : ses communes
viennent de geo.api.gouv.fr, pas de GeoNames, aucun geonameid disponible pour les relier aux noms
alternatifs — le catalan/l'occitan/le breton/le corse y servent donc uniquement à traduire
l'interface, pas à chercher une ville par son nom régional.

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
(HAC), son nom y figure dans la clause de citation des péages du texte de pied de page plutôt que
dans les listes gratuit/vignette. Pour la Bosnie-Herzégovine, dont les trois langues constitutionnelles
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

Un piège récurrent repéré en cours de rédaction, à surveiller pour toute langue future : en adaptant
la longue phrase de crédits du pied de page depuis le français, il est facile d'oublier d'insérer le
PROPRE pays de la langue qu'on est en train d'écrire dans la liste des pays crédités et/ou dans la
bonne sous-liste péage gratuit / vignette — trouvé et corrigé pour le slovaque, le hongrois et le
slovène avant leur insertion définitive (la Slovaquie, la Hongrie et la Slovénie manquaient chacune de
leur propre nom dans leur propre pied de page).

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
  `communes-gg.txt` (voir `SARK_EXCLUDE_NAMES` dans `scripts/build-country-communes.js`) : l'île est
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
  Le Royaume-Uni, lui, n'a besoin que d'un seul test — le préfixe de code postal `BT` (Irlande du
  Nord, voir plus haut) — le reste du pays (`c.country === 'GB'` sans ce préfixe) formant une seule
  masse `greatBritain`, aucune île secondaire à distinguer en son sein pour cette app. La République
  d'Irlande (`c.country === 'IE'`) et l'île de Man (`c.country === 'IM'`) sont, elles, les cas les
  plus simples de toute cette série : un simple test de pays suffit, chaque territoire tenant sur une
  seule masse (`ireland`/`isleOfMan`) sans la moindre subdivision interne à gérer.
- Limite connue : les petites îles françaises sans pont ni département propre (Belle-Île, Ouessant,
  Groix...) ne sont pas détectées individuellement et restent traitées comme le continent le plus
  proche — un cas rare (quelques dizaines de communes sur ~35 000) laissé de côté pour l'instant.
  De même, les 9 îles de l'archipel des Açores sont regroupées sous une seule étiquette : un trajet
  qui resterait entièrement dans les Açores pourrait proposer un trajet routier entre deux îles
  différentes de l'archipel, alors qu'il faudrait en réalité un bateau/avion inter-îles — un cas
  qui ne peut survenir qu'en partant soi-même d'une commune des Açores (jamais depuis le continent,
  voir plus haut), donc rare en pratique. Limite similaire, plus étendue, pour la Croatie : une
  bonne douzaine de très petites îles à liaison locale réduite et population quasi nulle dans les
  données ne sont volontairement PAS modélisées (archipel de Zadar : Molat/Ist/Premuda/Silba/Olib/
  Iž/Rava/Zverinac ; archipel de Šibenik : Kaprije/Zlarin/Žirje/Prvić/Krapanj ; îles Élaphites près
  de Dubrovnik : Koločep/Lopud/Šipan ; Susak/Unije/Ilovik près de Lošinj ; Drvenik Veli/Mali près de
  Trogir ; Biševo/Palagruža au large de Vis) — même logique que les Açores/Madère : ces communes
  restent accessibles comme point de départ (recherche manuelle) mais jamais comme étape reliée au
  reste d'un itinéraire, traitées par défaut comme le continent (limite assumée, pas un oubli — voir
  le commentaire au-dessus de `HR_ISLAND_POSTCODES` dans `app.js`).

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
- Communes andorranes/espagnoles/portugaises/belges/néerlandaises/luxembourgeoises/suisses/allemandes/italiennes/autrichiennes/saint-marinaises/liechtensteinoises/monégasques/maltaises/guernesiaises/jersiaises/tchèques/polonaises/slovaques/hongroises/slovènes/croates/bosniennes/britanniques/irlandaises/mannoises/danoises : [GeoNames](https://www.geonames.org)
  (licence [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/)) — voir "Pays couverts" ci-dessus.
- Codes postaux bosniens (absents de GeoNames pour ce pays, voir "Pays couverts") : liste
  [Wikipedia "Postal codes in Bosnia and Herzegovina"](https://en.wikipedia.org/wiki/Postal_codes_in_Bosnia_and_Herzegovina)
  (licence [CC-BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)), rapprochée par nom des
  communes GeoNames ci-dessus.
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
  (Italie), [HAC](https://www.hac.hr) (Croatie — via mojkalkulator.com.hr pour l'agrégation des
  tarifs 2026), JP Autoceste FBiH / AD Autoputevi RS (Bosnie-Herzégovine — via tolls.eu pour
  l'agrégation des tarifs 2026) — voir "Pays couverts" pour la méthode de calcul hors de France
  (échantillon plus restreint que pour la France).
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
  [Bornholmslinjen](https://www.bornholmslinjen.com) (Ystad ↔ Rønne, Bornholm)
  — voir "Ferries" ci-dessus pour la méthode (un ordre de grandeur indicatif par ligne, comme pour
  les péages, pas un tarif garanti).

Toutes ces données sont figées au moment de la génération de ce projet (2026). Pour les rafraîchir,
relancez les mêmes sources et remplacez les fichiers dans `public/data/`.
