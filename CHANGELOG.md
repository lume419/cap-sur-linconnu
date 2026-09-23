# Changelog

Cap sur l'inconnu — générateur de road-trips mystère.
Pas de numéro de version : les lots sont datés d'après les commits. Le plus récent en haut.

Les chiffres sont mesurés. Ceux qui n'ont pas pu être revérifiés sur l'état actuel du dépôt sont
marqués `[à vérifier]` et listés en fin de fichier.

---

## 2026-09-23

### Données

- Rattachement des lieux-dits français à leur commune : **45 134** lieux portent le nom et les codes
  postaux de leur commune, dans un 6e champ facultatif du format. `2dcd2d5`
- Commune de rattachement lue dans les enregistrements `ADM4` du dump. La première version prenait le
  premier lieu habité dont le nom correspondait à une commune du même département : **997 lieux
  étaient rattachés à la mauvaise commune**, donc publiés avec un code postal faux, jusqu'à 122 km de
  distance. Remesuré après correction : **0**.
- Département lu dans la source (colonne `admin2`) au lieu d'être déduit de la commune la plus
  proche : **943 lieux sur 46 654 (2,0 %)** en portaient un faux, dont neuf des vingt arrondissements
  de Paris, rangés en Seine-Saint-Denis, Hauts-de-Seine ou Val-de-Marne. `9edad70`
- Fiches dont la commune n'existe plus retirées : **1 328**.
- 187 doublons retirés : Arles et Aix-en-Provence étaient publiées deux fois, le centre publié par
  l'IGN étant celui de la *surface* (Arles fait 759 km²). `2dcd2d5`
- Six limites d'audit traitées : +76 370 lieux, +32 827 alias. `bc2521a`
- Homonymes de même code postal fusionnés seulement s'ils sont à moins de 10 km : **635 715 → 94 977**
  lieux masqués (13,0 % → 1,94 %). Les deux Ganta du Liberia et les deux Robīt d'Éthiopie sont
  désormais proposés tous les deux. `bc2521a`
- Exclusions sans rapport avec un code postal levées : Liban 41 → 3 300, Syrie 126 → 10 793, Égypte
  251 → 11 634, Jordanie 90 → 1 309, Israël 407 → 1 227, Libye 119 → 820, Palestine 337 → 828,
  Géorgie 4 147 → 5 329. `bc2521a`
- Nouveau `scripts/build-france-lieux.js` : lieux-dits, hameaux, anciennes communes et arrondissements
  (20 à Paris, 16 à Marseille, aucun à Lyon — GeoNames les classe `PPLX`). `bc2521a`
- Fiche fausse démasquée : « Maqhaka », rangée en Égypte, est au Lesotho. `bc2521a`
- **État publié : 4 982 745 lieux, 1 792 776 alias, index de 18 201 075 entrées. France : 80 098 lieux
  (34 964 communes IGN + 45 134 lieux rattachés).**

### Corrigé

- **Compression à la volée sans quota sur les fichiers statiques.** Seuls quatre fichiers étaient
  précompressés et protégés ; les autres repassaient par la compression à chaque requête, sans quota,
  sans contrôle d'origine et hors budget CPU. Mesuré : 2 000 requêtes sur `/vendor/leaflet/leaflet.js.map`
  en brotli, depuis une seule adresse et en `Sec-Fetch-Site: cross-site`, rendaient 2 000 réponses 200
  et consommaient 53,4 s de processeur. Les 13 fichiers concernés sont désormais précompressés une
  fois au démarrage et soumis au même quota ; un contrôle de démarrage signale tout nouveau fichier
  oublié. Une navigation de premier niveau reste acceptée, pour ne pas refuser les liens entrants.
  **Portée réelle en production, vérifiée après déploiement :** les 53,4 s ont été mesurées sur une
  instance LOCALE. Chez o2switch, `leaflet.js.map` et les polices `.ttf` sont servis directement
  depuis le disque par le frontal, sans passer par Node — ils reviennent non compressés, avec
  `Accept-Ranges: bytes` et sans `Vary`, deux signatures que le serveur ne produit jamais, alors que
  le même code rend bien du brotli en local. Ces deux types ne coûtaient donc aucun CPU à
  l'application en production. Le coût réellement supprimé porte sur les fichiers que Node sert :
  `leaflet.js` (148 ko), `leaflet.css`, `index.html` et `mentions-legales.html`, désormais
  précompressés au lieu d'être recompressés à chaque requête. Le contrôle d'origine, lui, s'applique
  bien à tous — un `Sec-Fetch-Site: cross-site` sur le `.map` ou sur une police rend « Cross-site
  request », donc la réponse de l'application.
- Écart de casse entre le quota, le calcul de taille et la voie de service : sur un système de
  fichiers insensible à la casse, `/js/I18N.js` passait le quota en réservant zéro octet et se faisait
  recompresser. Les trois emploient la même clé, et une variante de casse est redirigée.
- **Suggestions indiscernables.** Lever la fusion des homonymes avait échangé « introuvable » contre
  « trouvable mais indésignable » : **238 081 groupes rendaient au moins deux lignes au rendu
  identique — 789 210 lignes** avec le même drapeau, le même nom, le même code postal et rien
  d'autre. « Xincun », code CN-30 : 512 fiches, 287 suggestions, dont 20 affichées, toutes pareilles ;
  les deux Robīt d'Éthiopie, 20 679 habitants et population inconnue à 227 km l'un de l'autre,
  s'affichaient à l'identique. Chaque ligne porte désormais ce qui la distingue de ses homonymes, et
  seulement quand elle en a : la **région** si elle diffère, sinon la **population**, sinon la
  **coordonnée**. Remesuré sur toutes les données : **0 groupe reste identique** — 5 019 distingués
  par la région, 5 217 par la population, 227 845 par la coordonnée.
  Les deux nombres d'une coordonnée sont séparés par « / » et non par une virgule : en français celle-ci
  sert déjà de séparateur décimal, et « 31,23, 119,20 » aligne trois virgules qui font deux métiers
  différents — constaté à l'écran en production, dans la langue par défaut du site. Le repli est peu lisible mais il
  désigne toujours, et la région comme la population sont identiques dans les cas de masse (les 287
  Xincun sont tous en Guangdong et tous à population inconnue). Aucune recherche spatiale n'est faite :
  un « près de telle ville » serait plus lisible mais demanderait une requête de voisinage par
  suggestion, à chaque frappe, sur le chemin le plus chaud du moteur.
- **Ligatures introuvables.** « œ », « æ », « ß », « ĳ » valent DEUX lettres, mais la décomposition NFD ne
  les touche pas — elle sépare une lettre de son accent, pas une ligature de ses composantes. Un nom qui en
  portait une ne se trouvait donc qu'en tapant exactement ce caractère, qu'aucun clavier français ou anglais
  ne produit simplement. **5 584 lieux et 2 209 alias** en portent une : ß 4 857 (« Große », « Straß »),
  æ 1 813 (« Æðuvík »), œ 1 068 (« Belœil »), Æ 50, Œ 11, ĳ 1. Mesuré sur 206 de ces lieux tirés au hasard :
  **11 seulement (5 %) se retrouvaient en tapant la forme dépliée**. Après correction : **205 sur 206
  (100 %)** — le seul manquant, « Straß » en Allemagne, est chassé des vingt premiers résultats par ses
  homonymes autrichiens. Le dépliage réunit en outre **69 groupes de noms (140 graphies)** qui coexistaient
  sans être reconnus comme le même nom (« Größing » et « Grössing », « Nußberg » et « Nussberg »).
  Les lettres à barre ou à panse (ø, ð, þ, đ, ł) ne sont PAS dépliées : ce sont des lettres à part entière,
  et les déplier demanderait un choix par langue (þ vaut « th » en islandais, ð « d » ou « dh »). Un test
  le vérifie, pour que personne ne les ajoute par symétrie sans le décider.
- **Hrísey (Islande) était hors de la couverture, et les liaisons sans véhicules n'existaient pas.**
  `landmassOf` distinguait l'île, mais aucune liaison ne la desservait : aucun itinéraire n'en partait, quel
  que soit le mode, et le site conseillait « réessayez, ou élargissez le rayon » — un conseil faux, rien
  n'aurait jamais marché. La liaison **Árskógssandur ↔ Hrísey** (Sævar, Almenningssamgöngur ehf.) est ajoutée :
  15 min, 3,9 km mesurés entre les deux lieux publiés, adulte 1 500 ISK, neuf départs par jour l'été. Source :
  [vegagerdin.is](https://www.vegagerdin.is/en/the-transportation-system/public-transport/ferries/saevar-hrisey).
  Mais ce bateau **n'embarque aucun véhicule** — Hrísey est sans voitures, et sa grille ne comporte que des
  tarifs passagers. Or un prix de classe absent voulait dire « tarif non publié », jamais « véhicule refusé » :
  toute liaison était proposée à tous les modes. Nouveau champ `passengerOnly`. Deux façons de se tromper ont
  été écartées : faire traverser une voiture sur un bateau qui la refuse aurait publié une donnée fausse ;
  interdire la liaison aux modes motorisés aurait retiré l'île de la couverture mondiale, alors qu'on la visite
  très bien en laissant sa voiture au port. Le trajet est donc proposé à tous, **toujours au tarif piéton**, et
  marqué comme tel. `fareClass` était lu par l'interface sans que rien ne le pose jamais : il sert enfin, et
  le prix s'affiche « par personne » — chaîne déjà traduite dans les 161 langues, aucune n'a été ajoutée.
  Vérifié : les quatre modes partent désormais de Hrísey, au tarif passager publié.
- Parenthèse vide dans le champ de ville après avoir choisi un lieu sans code postal (« Hrazdan () ») :
  98 910 lieux publiés n'en ont pas.
- « Aucune ville trouvée. » n'était pas annoncée aux lecteurs d'écran, alors que « Aucune langue
  trouvée » l'est depuis le 21/09. Région vivante dédiée, sans répétition à chaque frappe.
- `tensionBlocked` posé seulement après un tirage de vérification au plafond : **3 annonces à tort sur
  90 → 0 sur 87**. `bc2521a`
- **Les deux chemins de recherche rendaient des résultats différents.** Le regroupement des homonymes à
  10 km est glouton et non transitif : le résultat dépend de l'ordre dans lequel les candidats sont
  examinés. L'index sur disque les parcourt par population décroissante et ne déplace jamais l'ancre d'un
  groupe ; la recherche en mémoire — celle qui sert tant que l'index n'est pas construit, donc sur tout
  déploiement neuf — les prenait dans l'ordre des fichiers ET remplaçait l'ancre dès qu'un lieu plus
  peuplé tombait à moins de 10 km, ce qui déplaçait le point de référence en cours de route. « Cuitaca »
  (Mexique) rendait **1 résultat en mémoire et 2 sur disque** : la même saisie, sur les mêmes données,
  donnait une réponse différente selon que l'index était construit ou non.
  Le balayage en mémoire ne décide plus rien : il empile ses candidats, et les réduit une fois tous
  connus, avec EXACTEMENT l'algorithme du disque — tri par population décroissante, regroupement au plus
  proche, ancre jamais déplacée, puis même ordre global de sortie. Le tri portant sur la donnée et non sur
  l'ordre d'arrivée, le résultat ne dépend plus du chemin. Mesuré sur 4 487 saisies : **9 divergentes
  avant, 0 après**.
  Le chemin en mémoire y gagne **3 à 8 fois en vitesse**, parce qu'il emploie désormais la sélection
  bornée du disque (`topK`, les 160 meilleurs candidats) au lieu de regrouper les dizaines de milliers
  que ramène un préfixe courant : « san » **1 278 → 150 ms**, « xia » 127 → 30 ms, « xin » 74 → 22 ms,
  « don » 122 → 28 ms — par frappe, en calcul synchrone.
- Générateur France redevenu idempotent : donner leur code postal aux lieux rattachés lui faisait
  prendre ses propres ajouts pour des lignes IGN, et une relance faisait passer 34 964 communes à
  74 914. `2dcd2d5`
- Index de recherche sur disque en version 4 : un index v3 est refusé et reconstruit. `2dcd2d5`
- Test « `build-ferry-ports` reproduit `lib/ferry-ports.js` à l'octet près » : **déjà rouge sur le
  dépôt** sans que personne le voie, le test étant désactivé par défaut. Manila et Banshbaria ont
  chacune une homonyme ; neuf ports reçoivent un `near`, le fichier régénéré est identique. `bc2521a`
- 3 037 alias orphelins écartés, 345 rattachés. `2dcd2d5`

### Ajouté

- « Aucune ville trouvée » dans les 161 langues. `bc2521a`
- Tous les homonymes reçoivent leur alias, y compris quand le nom conservé en a d'autres : **+732
  alias**, dont 24 formes de recherche perdues la veille. `bc2521a`

### Tests

- **Couverture de `public/js/app.js` : 114 fonctions non testées ramenées à 86.** Six tests neufs,
  choisis par le risque et non pour atteindre un chiffre — construction d'URL et d'HTML à partir de
  données distantes, accessibilité du formulaire et de la liste de suggestions, argent des liens
  d'hébergement, dates et tirage au sort. **Seize mutations éprouvées, seize détectées** : `safeHref`
  qui n'écarte plus `javascript:`, `photoFilePage` qui accepte n'importe quel hôte, `removeDescribedBy`
  qui ne retire rien, `showFieldError` qui marque tous les champs, `linkLodgingCap` qui laisse une
  devise refusée par les plateformes, `lodgingUrlWithCurrency` qui réécrit un hôte inconnu, `shuffle`
  qui perd un élément ou modifie son entrée, `addDays` qui décale du mauvais côté, `hikeCardHtml` qui
  n'échappe plus le nom, `updateActiveSuggest` qui laisse `aria-activedescendant` derrière lui.
- Tautologie fermée : le vérificateur d'invariants demandait au moteur si la moto est interdite sur
  autoroute, c'est-à-dire à la fonction même qu'il contrôle. Supprimer l'interdiction laissait les
  42 tests verts ; l'attente est maintenant recalculée depuis `MOTO_RULES`, comme pour le van.
- Le contrôle des bundles comptait pour une réussite sans rien vérifier quand les bundles manquaient :
  il se déclare sauté.
- Les contrôles du chemin de recherche sur disque le disaient en silence quand l'index manquait : ils
  le signalent, et un index présent mais refusé est distingué d'un index absent.
- Les deux chemins de recherche doivent rendre la MÊME LISTE, identité des lieux et ordre compris, sur
  les huit cas historiques plus un balayage à graine. Le contrôle voisin ne regardait que les groupes
  dont une fiche dépasse 10 000 habitants, et seulement la PRÉSENCE d'une fiche attendue : il était
  structurellement aveugle à cette divergence.
- Nouveaux tests : rattachement traversant les deux chemins de recherche, affichage de la commune,
  parenthèse vide, annonce aux lecteurs d'écran — tous éprouvés par mutation.

### Documentation

- README refait : présentation courte, chiffres mesurés, sources, format des données.
- Ce CHANGELOG remplace les ~6 900 lignes de récit de l'ancien README.
- Neuf chiffres faux corrigés en le rédigeant (voir la table en fin de fichier).
- L'exemple « Le Marchais Vert », cité partout pour illustrer le rattachement, **n'existe pas dans
  GeoNames** : remplacé par des fiches réellement publiées. `336746f`

### Non appliqué, et pourquoi

- « Un hameau sans population n'est pas un lieu habité » : chez GeoNames la population est *inconnue*,
  pas nulle. 509 chefs-lieux sont à 0 dans les dumps du dépôt, dont Le Vigan, sous-préfecture du Gard.
  Le critère supprimerait **4 504 522 lieux sur 4 982 745 — 90 % du site**.

### Limites mesurées, écrites, non corrigées

- **Le démasquage ne s'applique pas à la recherche par code postal.** Les deux chemins ne gardent qu'un
  lieu par couple (pays, nom) atteint par un code : « Robit » rend deux suggestions, « ET-46 » une seule.
  Comportement inchangé et identique des deux côtés, mais l'objectif « dans les deux chemins » n'est
  atteint que sur deux des trois voies d'accès.
- **355 lieux français sont leur propre commune sous un nom abrégé** (« Abriès » à côté d'« Abriès-Ristolas »,
  même population, même point). Conservés sur décision : les retirer ferait perdre le nom abrégé comme
  terme de recherche.
- **`tensionBlocked` peut manquer** quand le budget de 4 s est épuisé avant le tirage de vérification :
  le conseil « décochez les zones déconseillées » disparaît alors, sans que la réponse le signale.
- **52 lieux français ne sont pas publiés** : leur commune est nommée en abrégé par GeoNames (« Louhans »
  pour Louhans-Châteaurenaud), et les rapprocher demanderait l'approximation qui a produit les 997
  rattachements faux.
- **365 traversées sont annoncées plus courtes que la ligne droite entre leurs ports**, dont 194 de plus
  d'un kilomètre : le port est pris au centre de la localité faute de quai relevé.
- **184 masses terrestres (386 lieux publiés) n'ont aucune liaison modélisée** — Bora-Bora,
  Saint-Barthélemy, Corvo, Tristan da Cunha, Ouvéa, Hœdic, l'Île-de-Sein, les îles aux Princes. Un départ de
  là ne rend aucun itinéraire, et le message affiché conseille alors « réessayez, ou élargissez le rayon »,
  ce qui est FAUX : rien ne marchera jamais. Le corriger demande soit la liaison réelle de chacune, soit un
  message neuf dans les 161 langues, sans vocabulaire réutilisable. Mesuré le 23/09/2026, Hrísey déduite.
- **86 des 244 fonctions de `public/js/app.js` ne sont exercées par aucun test** (114 au matin du
  23/09/2026). Ce qui reste : le rendu du voyage à l'écran (19), l'orchestration asynchrone des photos,
  points d'intérêt et randonnées (18), les erreurs de formulaire encore non couvertes (14), la carte
  Leaflet (5). La visionneuse d'images, en particulier, demande un DOM qui analyse `innerHTML` : le
  projet s'interdit une dépendance de test, et le DOM factice ne le fait pas.
- **Le taux d'échec toléré du balayage d'alias est de 8 % pour un taux réel de 2,2 %** : une régression
  perdant jusqu'à 100 000 alias passerait au vert.

---

## 2026-09-21

### Ajouté
- Code postal devenu facultatif : **+106 327 lieux réels** (4 801 562 → 4 907 889), alias 1 718 520 → 1 759 644 (**+41 124**). Bengaluru, Nouakchott, Virār, Tiruppur, Sevastopol, Iligan City, Mymensingh. `18c72ae`
- 63 lieux réels restitués, effacés par la règle « coordonnée à deux entiers » de la 18e passe ; 76 restent écartés. `b7d493b`

### Corrigé
- Mesure refaite sur les 139 fiches à coordonnée entière : 13 restituées, 50 retirées. `c651c0d`
- 572 doublons de graphie retirés (dédoublonnage aligné sur la normalisation du moteur). `b7d493b`
- 7 fiches aux coordonnées fausses écartées à la source (Inarizako, Sasovo, Zeelandia, Agbatopé, Naam, Faraksika, Figuiratomo). `18c72ae`
- +980 alias rattachés aux fiches fusionnées (71 formes de recherche perdues, dont le nom grec de Pólis). `c651c0d`
- Un fil PDF mort déversait toute la file dans le processus principal : accueil à 3 101 ms au lieu de 13 ms. `b7d493b`
- Plafond d'octets contourné en pipelining : 30 réponses et 9,7 Mio contre 4 et 1,3 Mio attendues. `c651c0d`
- Export PDF : repli et minuteur ajoutés (aucune réponse après 30 s auparavant) ; document rendu en 868 et 1 704 ms. `c651c0d`
- Les deux chemins de recherche gardent désormais le lieu le plus peuplé (7 divergences sur 10 saisies). `c651c0d`
- Diagnostic « hors de portée, X km » calculé sans le filtre de zones à tension (10,4 % des annonces). `b7d493b`
- Le vérificateur d'invariants comparait le moteur à lui-même (la même mutation donne 124 violations). `b7d493b`
- Interface : `dir="ltr"` sur le bouton de devise (84 étiquettes sur 152), apostrophes repliées à la recherche (8 langues introuvables par leur propre nom), polices embarquées appliquées au nom de langue. `c651c0d`
- `searchCrumbs` purgée chaque minute, comme la politique de confidentialité l'annonce. `b7d493b`

### Modifié
- Documentation : huit chiffres faux de la 18e passe corrigés (dont « 14 335 lieux » qui en vaut 3 351), six de la 19e remesurés. `b7d493b`, `c651c0d`
- Suite de tests : 262 → 274 tests, 0 échec. `b7d493b`, `c651c0d`

---

## 2026-09-20

### Ajouté
- Export PDF : mise en forme OpenType mémorisée (`lib/pdf-text.js`) et mise en page déportée dans un fil de travail (`lib/trip-pdf.js`, `lib/pdf-worker.js`, `lib/pdf-service.js`). Pire temps 3,9 s → 1,1 s ; pendant un export, `/api/status` rend 10 réponses en 18 ms au pire, contre 2 en 391 ms. `4b07ffe`
- Recherche de ville en POST : le pare-feu de l'hébergeur répondait 404 sur certaines URL en écriture arabe (7 des 25 plus grandes villes concernées). `4c7eb3e`
- File d'export bornée, délai de réponse et abandon détecté : 200 exports coupés gelaient le site 39 515 ms. `e466662`

### Corrigé
- Normalisation élargie (apostrophes, tirets, point médian, harakat) : 40 696 lieux et 17 004 alias n'étaient trouvables qu'au caractère exact. `e466662`
- L'index sur disque porte l'empreinte du normalisateur (3 416 alias persans, ourdous et bengalis introuvables en production). `b93832c`
- 139 coordonnées bouchon (latitude ET longitude entières) écartées dans 55 pays ; 1 592 faux codes postaux (identifiant GeoNames affiché comme code). `e466662`
- « Hors de portée, X km » balayé exhaustivement (jusqu'à 71 km d'écart auparavant), le moteur dit s'il a conclu (`returnCapExact`). `b93832c`
- Antiméridien : `countriesAlong` inventait pays et restrictions sur Anadyr – Alaska. `e466662`
- `ferryRoadParts` choisit la paire de ports à la vitesse du mode (Valletta – Catania : 112 km de route à vélo au lieu de 0). `e466662`
- Calcul des ferries 1,7 à 3 fois plus rapide (régression de la 16e passe). `b93832c`
- `trimGlyphCaches` : 54 Mo retenus après 30 exports. `e466662`
- Limite du corps de l'export PDF 32 ko → 256 ko (un voyage pèse 61 à 118 ko). `b93832c`
- Cache des randonnées 1 056 → 72 Mo. `b93832c`
- Trois coordonnées fausses écartées (PG Katingan, BH Magsha, GT Todos Santos Cuchumantan). `b93832c`
- Plafond d'octets (220 Mo/min/adresse) étendu aux gros fichiers statiques (6 ko à 11 Mo). `e466662`

### Ajouté (tests)
- `tests/search.test.js` : une saisie retrouve le bon lieu — ce qu'aucun test ne vérifiait. `b93832c`
- Suite : 229 → 253 tests, durée 30 → 19 min. `4b07ffe`, `e466662`

---

## 2026-09-19

### Modifié
- 11e passe : péage annoncé en fourchette (borne basse « probable » via `freeCells` OSM, borne haute « possible ») ; vitesse mesurée par pays sur 887 itinéraires OSRM dans 150 pays ; hébergement unifié pour 239 pays et 152 devises. `3d53524`
- 13e passe : outil `npm run test:compare` (mêmes tirages sur deux versions du moteur) ; unité en miles selon la langue (Royaume-Uni, États-Unis), traduite dans les 161 langues ; ~1 390 noms de liaisons corrigés. `fdd68aa`
- 14e passe : « hors de portée » = plus lointain lieu atteignable (Bamako 196 → 263 km) ; durée de l'aller-retour contrôlée (≤ 9 h) ; 20 distances et 3 durées de ferry corrigées ; 115 alias et 138 doublons retirés. `f624b64`
- 15e passe : paire de ports éloignée de la ligne de référence estimée au lieu d'hériter durée et prix d'une autre ligne ; contre-épreuve à X ajoutée ; 101 alias réparés, 7 doublons au même point retirés. `60d0b50`

### Corrigé
- 12e passe : vitesse du pays limitée aux masses terrestres mesurées ; 322 lieux « Ninguno », « Sin Nombre »… retirés ou renommés ; noms d'îles traduits dans ~77 langues. `a8aa4bc`
- 13e passe : aller-retour ×7 plus rapide (masse terrestre du départ mémorisée) ; vélo à 15 km/h partout. `fdd68aa`

---

## 2026-09-18

### Ajouté
- Suite de tests permanente `tests/` (`npm test`, `test:quick`, `test:full`) : invariants du moteur, péage, performances, serveur réel, 161 langues, CSP, générateurs reproduits à l'octet près. `60adc38`
- Grille OpenStreetMap des autoroutes à péage réelles (`data/toll-grid.json`, 1 699 cases, 17 pays) : seuls les kilomètres près d'une voie payante sont facturés. `e529157`
- 139 drapeaux SVG (264 fichiers, 169 Ko) : les suggestions affichaient des émojis, invisibles sous Windows. `e529157`

### Corrigé
- 22 des 24 lignes « Cofiroute » de `toll-reference.json` ne correspondaient à aucun barème publié (Paris → Reims à 57,60 € contre 12,60 €) : supprimées. Tarif recalibré sur 38 liaisons vérifiées, 0,148 → 0,104 €/km ; rapport médian estimé/réel 0,97. `e529157`
- `ROAD_FACTOR` 1,17 → **1,287**, mesuré sur 128 itinéraires OSRM. `e529157`
- Vitesses toutes ramenées à 80 km/h (art. R413-2), vélo à 15 km/h. `e529157`
- PDF : la police restait à la taille 1000 dans pdfkit — un itinéraire de 3 jours sortait en 36 à 45 pages presque vides, il tient sur 1 page. `e529157`
- 8 lieux insulaires étaient joignables par la route (archipel de Changshan, Islas de Gigantes, Ko Tarutao, Dahlak Kebir…). `e529157`
- Manat azerbaïdjanais au taux de la banque centrale (1,85 → 1,9493). `e529157`
- Péage : un kilomètre facturé seulement si la case est dans le pays du point ET dans un pays de l'étape (0 étape facturée à tort sur 1 760 tirages, 22 pays sans péage). `050fbc0`, `5b6c892`
- Chiffres sourcés : recharge 28 min et marge 0,70 (ADAC, ev-database), facteur moto mesuré par pays (Valhalla), barèmes officiels 2026 de 17 pays, plafonds d'hébergement convertis aux taux BCE. `60adc38`
- Barrière de la mer d'Åland : 2 traversées par la route → 0. `050fbc0`
- 39 raccourcis `font` CSS invalides remplacés. `050fbc0`
- Dossier `tests/` bloqué côté Apache (servi en 200 en production). `519a929`

---

## 2026-09-17

### Ajouté
- Grille terre/eau Natural Earth (`lib/land-grid.bin`, 223 Ko, pas de 0,05°) : une étape routière dont le trait passe ≥ 25 km sur l'eau exige un chemin terrestre ≤ 1,8 × la distance. Sur 1 140 tirages, 3,5 % des voyages traversaient la mer par la route avant, 0 après. `6a2e7d0`
- PDF traduit dans les 161 langues, polices Noto embarquées, mise en page multi-écritures, page en miroir pour le RTL. `85ef93b`
- Budget de calcul de 4 s par tirage (`timedOut`), budget global du serveur (503 busy), file des appels sortants. `87690c6`
- Randonnées dans le monde entier : Visorando ciblé, itinéraires OSM, portails par pays. `1fbba6c`
- Hébergement : plateformes locales là où Airbnb ou Booking manquent. `81f56d4`
- Modes de transport réalistes : distance max par étape, bornes de recharge réelles, vans et motos. `234fc8f`
- Quais OpenStreetMap pour 57 ports mal placés : les 702 liaisons ont leurs ports. `67f07f3`
- 11 langues en traduction tentée → **161 langues**. `08ecd62`

### Corrigé
- Photos Wikipédia : article retenu seulement s'il est géolocalisé près du lieu (5/15/20 km) — fini « Madonna » → la chanteuse, « Milano » → un rappeur. `ff28e1d`
- Péage appliqué seulement aux masses terrestres à péage (`TOLL_LANDMASSES`) : plus de péage en Corse, Sardaigne, Baléares, Canaries, Madère, Crète. `87690c6`
- Barème de péage par pays (`TOLL_SOURCE`) au lieu d'ASF pour tous. `e24e5a5`
- 3 069 lieux retrouvés et 738 codes corrigés (fenêtre de recherche du point postal, 8 pays à codes postaux). `d713346`
- Okushiri et 109 autres lieux japonais rattachés par localité. `85ef93b`
- Trois îles mal délimitées (Tawau, Long Island, Rum Cay). `f3675e6`
- Audit de sécurité de la production : durcissement serveur, XSS, fichiers exposés ; `fonts/` renommé `pdf-fonts/` (la règle `.htaccess` bloquait les polices du site). `3520a8f`, `d713346`
- Quotas contournables, erreurs et bugs d'activités, ferry à vélo. `e9aa706`
- Démarrage en production réparé, randonnées qui disparaissaient. `f987a6d`
- Distance d'éloignement impossible détectée immédiatement, avec message explicite. `fe4cc21`

---

## 2026-09-16

### Ajouté (couverture mondiale, en neuf lots)
- Maghreb : Maroc, Algérie, Tunisie, Sahara occidental — 55 468 communes ; amazighe standard et kabyle (77 langues). `04334d2`
- Afrique de l'Ouest : 13 pays + Cap-Vert — 105 373 communes, 5 165 alias, 8 liaisons de ferry ; aucune langue ajoutée (orthographe non normée). `19da372`
- Arménie, Azerbaïdjan, Syrie, Chypre + 6 langues (dont l'arabe, première langue RTL). `8a21e8b`
- Liban, Israël, Palestine, Jordanie, Égypte, Libye — aucune nouvelle langue. `0005b1d`
- Afrique entière, Russie, Svalbard — 105 langues ; les fermetures politiques deviennent des zones à tension (206 règles France Diplomatie, 52 pays). `a465632`
- Péninsule Arabique, Irak, Iran — 183 088 lieux, 168 175 alias ; persan et kurde sorani ; 237 règles de tension pour 60 pays. `861984a`
- Asie : 35 pays et territoires — 2 462 559 lieux, 765 214 alias, 30 ferries, 33 langues (140 au total). `93830e1`
- Océanie et collectivités françaises : 24 territoires, 35 618 lieux, 454 liaisons de ferry (143 langues). `436bca3`
- Amériques : 50 pays et territoires — 763 003 lieux et alias, 32 monnaies, 162 liaisons de ferry, 65 zones à tension, 7 langues (150 au total). `5c741a1`
- Antarctique, île Bouvet et toutes les TAAF : recherchables, sans trajet (88 bases et lieux habités à l'époque ; 98 aujourd'hui). `b7209bb`
- Sélecteur min/max de jours par ville (défaut 1 à 3) : le moteur pouvait assigner plus de 10 nuits d'affilée. `eb6573c`

### Modifié (performance de démarrage)
- Index de recherche précalculé sur disque (`lib/search-index.js`, `scripts/build-search-index.js`) : recherche dès le démarrage. `7f36b7c`
- Serveur autonome : index construit dans un processus enfant s'il manque ou est périmé, avec verrou et repli ; plus de recompression de ~190 Mo à chaque démarrage. `f94204f`
- Démarrage progressif : recherche disponible en ~15 s au lieu de ~45 s. `e5e0660`
- Zones à tension pré-calculées : étape ramenée de ~88 s à ~7 s ; tas ~4,0 → ~3,0 Go. `9fe52ed`
- Noms idéographiques de 2 caractères (北京, 東京, 서울) indexés. `9fe52ed`

---

## 2026-09-06
### Ajouté
- Géorgie, géorgien et abkhaze (69 langues) : 2 366 communes, 5 579 alias, codes postaux reconstruits par nom depuis yell.ge. `62e7c1d`

---

## 2026-09-05
### Ajouté
- Turquie et turc, plus deux traversées de ferry des Dardanelles. `7e780e3`

---

## 2026-09-04
### Corrigé
- Modèles wikitexte bruts (`{{s-|XIX}}`) qui s'affichaient tels quels dans les activités : retirés, puis résolus en « XIXe siècle ». `50558ed`, `b7c06e8`
- Vivier de communes proches restauré pour la roulette de révélation. `b1c84f9`

---

## 2026-09-03

### Modifié
- Moteur de tirage et recherche portés côté serveur en trois phases : tables extraites dans un module partagé, routes `/api/search-city` et `/api/generate-trip`, client rebranché. Le navigateur ne télécharge plus jamais la base de communes (`app.js` : −943 lignes, ~100 Ko). `d215953`, `826a51f`, `26ee0c9`
- Les ~91 requêtes `/data/*` regroupées en 2 : l'hébergeur plafonne à ~40-45 requêtes/s (92 requêtes = 2,3 s, contre 0,07 s pour une). `593f3f9`
- Recherche de ville indexée par préfixe : fin du scan linéaire sur 562 k + 87 k entrées. `ab3b4dd`
- Compression gzip/brotli sur toutes les réponses, puis précompilation des bundles au déploiement. `2457b05`, `ee8d9e9`, `7fefb70`
- Cache local IndexedDB du résultat déjà parsé. `19c7c82`

### Ajouté
- Gibraltar, Moldavie, Biélorussie, Ukraine + 5 langues (gagaouze, biélorusse, russe, ukrainien, tatar de Crimée). `246f758`
- Grèce, Bulgarie, Roumanie ; Lettonie, Lituanie, Estonie ; Vatican, Islande, Féroé. `06d10a9`, `9500422`, `8ec2428`
- Réseau de ferries des îles grecques : 30 lignes, 53 langues. `bf0f506`

### Corrigé
- L'affirmation « aucune donnée n'est envoyée » du pied de page, devenue inexacte depuis le tirage côté serveur, corrigée dans les 61 langues. `c5b738a`

---

## 2026-09-02

### Ajouté
- Danemark, Norvège, Suède, Finlande et îles Åland (données, péage, devise, ferry, 4 langues). `c45db09`, `71095bf`, `d4a4f9d`, `91fc28e`
- Monténégro, Albanie, Kosovo ; Serbie et Macédoine du Nord. `2ab452a`, `1ea066e`
- Royaume-Uni, Irlande, île de Man + gallois, gaélique écossais, cornique, scots. `edec396`, `00dffa3`, `4270e3d`, `ad88e8d`
- République tchèque, Pologne, Slovaquie, Hongrie, Slovénie, Croatie, Bosnie-Herzégovine. `83c0f88`, `1262bcf`, `4281892`, `38aeac8`, `7127553`, `9d1b302`, `fb02d99`
- Rattrapage des langues nationales (tchèque, polonais, slovaque, hongrois, slovène, croate, bosniaque, serbe) et régionales France/Espagne/Portugal/Andorre (7 langues). `64b24d4`, `1cfa17f`
- Sélecteur de devise, drapeaux SVG à la place des émojis, symboles monétaires, drapeaux régionaux. `6d55c87`, `03cc9f6`, `29c2e87`
- Avertissement de traduction dans le pied de page (47 langues). `3b4eaa0`

### Corrigé
- Pied de page `footer.text` obsolète dans 46 langues sur 49. `4d141ec`
- Sélecteur de devise qui apparaissait en retard au chargement. `8e9592b`

---

## 2026-09-01

### Ajouté
- Luxembourg, Suisse, Allemagne, Italie, Autriche, Saint-Marin, Liechtenstein, Monaco, Malte, Guernesey, Jersey. `c52f2e3`, `7efa752`, `917e3ab`, `1babca2`, `cee96d4`, `63ed4c8`, `701d366`
- Langues régionales : luxembourgeois, italien, romanche, bas-allemand, sorabe, frison du Nord, sarde, frioulan, ladin. 
- Rappel de vignette (Suisse/Autriche) avec lien vers la boutique officielle. `3f4f0da`
- Pays affiché dans les suggestions de ville. `701d366`

### Modifié
- Texte d'intro raccourci (liste des pays et de la liste à emporter retirées). `784ee07`

---

## 2026-08-31

### Ajouté
- Belgique, Pays-Bas, Andorre, Espagne, Portugal. `ac3561d`, `a5b398d`, `83c4652`
- Interface multilingue (fr/en/es/pt/nl/de). `3c80e3e`
- Traversées en ferry (Corse, Baléares, Canaries). `d4185f7`
- Carte OpenStreetMap (Leaflet) à la place de la carte SVG maison. `1e9bec9`

### Corrigé
- Source d'activité erronée ; liens Wikipédia ajoutés sur les titres. `d25850e`

---

## 2026-08-23

### Modifié
- Jours d'une même ville regroupés en une seule case, activités par jour. `7f6c3a4`
- Une seule recherche de logement par séjour, pas une par nuit. `4339394`

---

## 2026-08-20

### Ajouté
- Export PDF de l'itinéraire : bouton, téléchargement direct, habillage aux couleurs du site, nom horodaté avec la première destination. `4a9dbb8`, `d28f65e`, `431511d`, `f2a2a47`
- Mentions légales et politique de confidentialité. `c8c9a51`, `0b91334`
- Bouton de thème clair/sombre/auto, puis bouton unique qui fait tourner le thème. `0ff156b`, `a0abe8b`
- Carte de partage Open Graph / Twitter Card. `8c76e32`
- `robots.txt`, `sitemap.xml` et données structurées (SEO). `ccfab62`
- Placeholder de ville : une vraie commune aléatoire, limitée à 16 caractères. `ed3a638`, `70c5ec6`

---

## 2026-08-19

### Ajouté
- Vraies activités via OpenStreetMap au lieu d'activités inventées. `514454a`
- Section « Lieux et monuments » de Wikipédia en complément d'Overpass. `8e716b9`
- Randonnées Visorando pour la balade du jour. `231ed20`
- Code postal des villes tirées affiché (plusieurs communes partagent le même nom). `a675b6b`
- Photos et points d'intérêt préchargés pendant l'animation de la roulette. `8e87c0b`

### Corrigé
- Overpass expirait silencieusement (HTTP 200) sur toute grande ville ; un échec restait en cache comme « rien trouvé » pendant 14 jours. `a19e7bd`, `d7504a3`
- Activités jusqu'à +1 h de route de l'étape. `9167184`
- Maximum 1 activité par catégorie ; « monument » et « mémorial » comptent pour une seule. `e99c66e`, `1a4bc3a`

---

## 2026-08-18

### Ajouté
- Version initiale : générateur de road-trip mystère (Node.js/Express). `347b69f`
- Vraies photos via l'API Wikipédia côté serveur, pop-up plein écran. `666adad`, `9a3f60d`
- Distance minimale, distance maximale entre étapes, crans de 10 km, boutons +/− pour le rayon. `dce6ecc`, `6063ab7`, `b6b4399`, `e09260f`
- 11 plus grandes villes de France affichées sur la carte comme repères. `8209ec5`
- Bloc `.htaccess` documenté pour sécuriser `server.js` et `package.json`. `e2466f0`

### Corrigé
- Biais géographique : la Bretagne et 88 autres départements n'étaient quasi jamais tirés ; tirage rendu purement aléatoire, la taille de la commune n'avantage plus rien. `40cdbca`, `8f80e3a`, `0e8670a`
- Calcul des durées, cache des photos, flou des photos (vignette 330 px remplacée par l'image d'origine). `dce6ecc`, `be89749`
- Débordement horizontal jusqu'à 30 px hors carte sur petits écrans ; doublon de flèches sous Firefox et Chromium. `3576085`, `9ac3370`, `b5d2dfe`
- Champ de durée en mode heures : curseur mal positionné, saisie clavier, sélection visible. `d057e5d`, `6602a5b`, `cb3e122`

### Modifié
- Séjour par défaut : 3 jours / 2 nuits. Date de départ par défaut : aujourd'hui. Péages décochés par défaut. `59eda27`, `c8d3515`, `9ac3370`
- Fourchette de prix du budget sélectionné affichée. `23aaad4`

---

## Chiffres que je n'ai pas pu vérifier

Vérifiés par mes soins dans le dépôt : totaux de lieux par pays (`public/data/communes-*.txt`, `communes.txt`),
total d'alias, entrées de l'index (`cache/search-index/meta.json`), nombre de langues (`LANG_NAMES`),
arrondissements publiés, occurrences de « Fontaine », taille de `lib/land-grid.bin`, nombre de drapeaux SVG.

Restent invérifiables sans exécuter les générateurs, les tests ou le serveur — repris tels quels des messages de commit :

- Tous les comptes de tests (229, 253, 262, 274, 275, 276, 278 tests) et les campagnes de tirages (1 140, 3 000 tirages, 380 comparaisons). `[à vérifier]`
- Toutes les durées et mesures de performance : 3 101 ms → 13 ms, 39 515 ms, 3,9 s → 1,1 s, ~88 s → ~7 s, ~45 s → ~15 s, 111 s de reconstruction d'index, 30 → 19 min de suite de tests. `[à vérifier]`
- Les états intermédiaires de données, écrasés depuis : 4 801 562 → 4 907 889 → 4 984 259 lieux, 1 718 520 → 1 759 644 → 1 792 471 alias, France 34 964 → 81 612 → 74 914. Seul l'état final (4 977 561 / 1 789 434 / 74 914) est vérifié. `[à vérifier]`
- Les comptes « avant » des exclusions levées (Liban 41, Syrie 126, Égypte 251, Jordanie 90, Israël 407, Libye 119, Palestine 337, Géorgie 4 147). Seuls les comptes « après » sont vérifiés. `[à vérifier]`
- Les mesures de correction ponctuelles : 943 lieux sur 46 654, 635 715 → 94 977 masqués, 572 doublons, 106 327 lieux rendus, 40 696 lieux et 17 004 alias introuvables, 3 416 alias, 1 592 faux codes, 139 coordonnées bouchon, 322 lieux « Ninguno », 3 069 lieux retrouvés, 738 codes corrigés. `[à vérifier]`
- Les chiffres des lots de couverture mondiale (55 468, 105 373, 183 088, 2 462 559, 763 003, 35 618 lieux ; 5 165, 168 175, 765 214 alias) : ces fichiers ont été régénérés plusieurs fois depuis. `[à vérifier]`
- Les comptes de ferries par lot (162, 454, 30 liaisons) : seuls les totaux actuels sont vérifiés — 699 liaisons `FERRY_ROUTES`, 3 `SEA_CROSSINGS`, 702 clés de ports. `[à vérifier]`
- Le compte de « 239 pays » pour l'hébergement : `public/data/` contient 238 fichiers `communes-XX.txt` plus `communes.txt` (France), soit 239 jeux de données — cohérent, mais ce n'est pas la même grandeur que le nombre de pays du moteur (`COUNTRIES`). `[à vérifier]`
- Les barèmes, taux et constantes sourcés hors dépôt : 0,104 €/km, rapport médian 0,97 sur 38 liaisons, `ROAD_FACTOR` 1,287 sur 128 itinéraires OSRM, 887 itinéraires OSRM sur 150 pays, recharge 28 min / marge 0,70, manat 1,9493. `[à vérifier]`

### Chiffres corrigés par rapport aux messages de commit

| Écrit dans le commit / README | Valeur mesurée | Source de la mesure |
|---|---|---|
| 39 955 lieux rattachés | **39 950** | lignes à 6 champs de `public/data/communes.txt` |
| Jordanie 1 310 | **1 309** | `communes-jo.txt` |
| Palestine 837 | **828** | `communes-ps.txt` |
| Géorgie 5 336 | **5 329** | `communes-ge.txt` |
| « les seize arrondissements de Lyon et Marseille » | **20 à Paris, 16 à Marseille, 0 à Lyon** | `communes.txt` |
| Fontaine publiée 19 fois | **18** | `communes.txt` |
| index 17,65 millions d'entrées | **18 183 652** | `cache/search-index/meta.json` |
| +41 128 alias | **+41 124** | 1 759 644 − 1 718 520 (arithmétique du commit lui-même) |
| alias publiés 1 792 471 | **1 789 434** | somme des `aliases-XX.txt` (hors bundle) |
