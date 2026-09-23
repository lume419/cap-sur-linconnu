# Tests de non-régression

À lancer avant chaque commit. **Aucune dépendance npm propre aux tests** : `node:test`, `node:assert`, `fetch` intégré (Node ≥ 20 ; développé sous Node 24). Les tests utilisent en revanche les dépendances de l'application elle-même — `bidi-js` (ordre visuel), `pdfkit` (documents), et `server.test.js` démarre le vrai serveur Express. **Préalable** : `public/data/communes-bundle.txt` et `aliases-bundle.txt` doivent exister (`npm run build-bundles`) — cinq fichiers de test les lisent sans repli, alors que le serveur, lui, sait s'en passer.
Aucun service externe n'est sollicité, et jamais la production : le serveur de test tourne en local avec un `fetch` simulé.

| Commande | Contenu | Durée indicative |
|---|---|---|
| `npm run test:quick` | i18n, péages, invariants du moteur (100 tirages) | ~1 min (56 s mesurées le 20/09/2026 ; la ligne annonçait ~2 min, `tests/run.js` ~3 min) |
| `npm test` | tout sauf les générateurs, tailles par défaut | ~7 à 9 min (**282 tests en 439 à 668 s** — 282 depuis le 23/09/2026, mesurés sur plusieurs passages de la même machine (l'écart d'un passage à l'autre atteint 6 %, selon la charge) ; 448 s au 19e ; le chiffre de 314 s qui figurait ici datait d'avant `search.test.js`, les bornes de données et les exports PDF ; + 2 à 5 min si le serveur doit reconstruire son index de recherche) |
| `npm run test:full` | tout, tailles complètes, générateurs compris | 30 à 60 min |
| `node tests/run.js toll server` | seulement les fichiers dont le nom contient `toll` ou `server` | — |

Durées mesurées (`npm test`, relevé du 18/09/2026) : i18n < 1 s ; péages ~40 s ; invariants ~2,5 min ; performances ~2 min ; serveur ~1 min de démarrage + ~1 min de tests. Ajouté le 20/09/2026 : données ~45 s (~20 s de plus qu'au 16e audit, bornes de données) ; recherche ~35 s. Les générateurs (~35 s) ne sont PAS dans `npm test` : ce sont ses 5 tests sautés, ils ne tournent qu'avec `test:full` ou `TEST_GENERATORS=1` — la ligne mélangeait les deux commandes (18e audit).

Les fichiers s'exécutent l'un après l'autre. Ceux qui ont besoin du moteur le chargent une fois par processus (~30 s, ~4,4 Go avec les alias ; `--max-old-space-size=8192` est posé par `tests/run.js`) : invariants, régressions, péages, performances, recherche. `i18n`, `ui`, `data` et `generators` ne le chargent pas (18e audit : la phrase l'affirmait de tous).

## Fichiers

- `engine-invariants.test.js` (contre-épreuve depuis le 15e audit : chaque aller-retour « hors de portée, X km » est rejoué à X km, même graine ; un itinéraire ou, filtre actif, « zones à tension » est attendu ; le vérificateur recalcule aussi les traversées estimées d'après la paire de ports) : tirages à graine (départs spéciaux : îles, enclaves, zones à tension, antiméridien, grand Nord ; paramètres aléatoires), un test par famille d'invariants (jours, nuits par ville ou avis `days.overMaxPerCity`, `maxLegKm` ou `overMaxLeg` justifié, éloignement et rayon, mer et frontières, ferry, zones à tension, péage, valeurs, retour, doublons, état remis à zéro), plus déterminisme, entrées invalides, départs forgés et cas ciblés (mer d'Åland, point 6, Acapulco/Maiduguri…). Un auto-test vérifie que le vérificateur détecte des défauts injectés, **dans la bonne famille** : 23 des 32 familles qu'il sait lever sont éprouvées par une injection, et les 9 autres sont listées dans le test avec la raison de leur absence (trois ne décrivent pas un tirage mais la campagne : exception, état non remis à zéro, contre-épreuve). Un test vérifie aussi que chaque départ « particulier » de la campagne existe bien dans les données publiées — trois n'existaient plus depuis la 10e passe et étaient donc silencieusement sautés (20e audit du 21/09/2026).
- `toll.test.js` : modèle en FOURCHETTE depuis le 11e audit (`amountMin` = borne basse « probable », `amount` = borne haute « possible ») — pays sans barème jamais facturés (intérieur et transfrontalier ; un transit par un pays à péage peut apparaître dans la borne haute, jamais dans la borne basse), transit par l'Alsace (DE, CH) et autour de la Bosnie (HR↔HR), 38 liaisons françaises de référence (médiane dans [0,85 ; 1,15], prix officiel dans la fourchette à −20 % / +25 % près pour 80 % des liaisons au moins), autoroutes gratuites longeant des autoroutes payantes (FR, PT, IT, ES, IL : borne basse à 0 €), grands corridors payants (borne basse > 0 €), témoins facturés au bon barème / non facturés, vélo et péage décoché. Le test des autoroutes gratuites suppose la couche `freeCells` de `data/toll-grid.json` complète (`node scripts/build-toll-grid.js --free`).
- `perf.test.js` : durées de tirage et part de `timedOut` comparées aux seuils de `LIMITS` en tête du fichier. À lancer sur une machine peu chargée.
- `server.test.js` : `server.js` réel sur un port libre (`PORT`) : en-têtes de sécurité, `/data`, fichiers sources et dépôt jamais servis (réponse 4xx, quelle que soit l'écriture du chemin), quota des gros fichiers, export PDF (valide, budget de temps, écritures complexes, objets forgés → PDF complet avec pied de page), créneau PDF, file des appels sortants, `generate-trip` avec entrées forgées (jamais 500). Ajouté au 17e audit : **export PDF d'un voyage MAXIMAL** (21 journées, 15 villes, électrique avec recharges, ferry, péage, vignettes, restrictions, zone à tension, randonnées, hébergement) construit avec les vraies traductions — 26 langues par défaut, **les 161 avec `--full`** (280 s) : statut 200, document complet, pied de page présent, aucun glyphe manquant, et **aucune langue écourtée** (le voyage doit tenir en entier ; ce contrôle dépend de la vitesse de la machine, comme `perf.test.js`) ; la **recherche de ville en POST** rend exactement ce que rend le GET sur douze saisies (latin, accents, arabe, persan avec liant, cyrillique, idéogrammes, grec, codes postaux à tiret) et refuse les corps aberrants (non-objet, `q` absente, vide, non-chaîne, 121 caractères, corps de 4 ko) avec les mêmes quotas que le GET — le cas « tableau » y figure aussi, mais il réussit parce que `q` y est absente, pas parce que c'est un tableau : la garde `Array.isArray` n'est donc pas éprouvée (18e audit) ; le serveur **répond pendant un export** (sondes sur `/api/status` : au moins trois réponses, la pire sous 200 ms — 391 ms et deux réponses seulement quand la mise en page tourne dans le processus principal) ; le **fil de travail et le repli interne rendent le même document** (octet pour octet, hors date et identifiant), le repli étant obtenu comme en vrai — en laissant expirer le délai de réponse du fil (18e audit ; il l'était par `stop()`, c'est-à-dire par un arrêt propre, alors que les chemins réellement empruntés en panne n'étaient jamais exercés) ; **la faille de déni de service du 18e audit** : une rafale de 40 exports abandonnés ne retarde pas l'export suivant, un travail sans destinataire est abandonné sans être mis en page, la file bornée refuse en 503 plutôt que d'empiler, et la perte du fil ne rejette que le travail en cours ; l'**ordre visuel** des écritures de droite à gauche, sur `_visualLines` et sur le document réellement dessiné, contre bidi-js pris comme oracle indépendant ; deux contrôles de la mise en forme mémorisée (`memoiseLayout`) : chaque appel reçoit une COPIE — un appelant qui modifie ce qu'il reçoit, comme pdfkit le fait, ne doit pas abîmer le suivant, et la copie garde le prototype de `GlyphRun` pour que `advanceWidth` reste un accesseur — et le tracé du cache chaud est identique à celui du cache froid ; plus la taille du corps acceptée, le comptage des caractères distincts, les deux clés de cache, le plafond du cache des randonnées, les titres d'espace de noms précédés d'un souligné, `Sec-Fetch-Site` en casse mêlée, `/api/photo` sans coordonnées, la borne de distance affichée et le nom de fichier sans marque bidi. Le serveur est arrêté à la fin, même en cas d'échec.
- `i18n.test.js` : 161 langues, clés et `{paramètres}` du français, pas de HTML ni de guillemet double, listes, empreinte CSP des scripts inline. Ajouté au 17e audit : `error.network` suit le registre dominant de son dictionnaire (mesuré sur ses impératifs) et la ponctuation de son écriture, les pourcentages des six langues que ces contrôles sautaient, et un seul motif ARIA pour le sélecteur de langue.
- `engine-regressions.test.js` (12e audit) : un test par défaut corrigé — vitesse du continent jamais appliquée aux îles et à l'outre-mer (≤ 80 km/h de moyenne, témoin continental), aller-retour dans la journée à la vitesse du pays (Lyon 380 km, plafond annoncé, Oulan-Bator diagnostiqué), diagnostic « éloignement introuvable » conservé quand un nouvel essai manque de temps (horloge simulée), pays traversés par les parties routières d'un ferry, moto dans un pays seulement traversé, borne haute du péage jamais « ~0 € » ; puis (13e audit) vélo à 15 km/h en aller-retour partout (plafond 67 km), îles des pays lents jamais plus rapides que leur continent, aller-retour Paris calculé en moins de 600 ms, électrique et moto « hors de portée » sans nouveaux essais, moto en trajet intérieur sans transit (Kangar → Melor) et en vrai transit ralentie (Nanning → Luang Prabang par le Viêt Nam). Puis (14e audit) : distance annoncée « hors de portée » = plus lointain lieu atteignable (Bamako, près de la Guinée), aller-retour avec distance ou étape max sous 15 km (Lyon), moto vers un port du même pays sans transit. Puis (15e audit) : chaque « hors de portée, X km » faisable à X km (Lewe, Xarardheere, Jasdan, Lyon, Paris à vélo, Bamako), zones à tension (Moscou 600 km « hors de portée », Sharm el-Sheikh jamais « hors de portée » quand seul le filtre bloque). Puis (22/09/2026) : **« décochez les zones déconseillées » n'est conseillé que si le filtre bloque vraiment** — 260 tirages à graine, et pour chaque annonce le tirage est rejoué au plafond AVEC le filtre : s'il rend un itinéraire, le conseil était faux et le test tombe. Contrôle indépendant du correctif, qui ne regarde pas les zones traversées mais seulement le résultat, très petite île en aller-retour (Jamestown), traversée estimée quand la paire de ports s'éloigne de la ligne de référence (Gênes → Palerme) avec témoin sur la ligne de référence (Messine). Les tirages à graine y tournent sous une horloge ralentie ×10 : le résultat ne dépend pas de la charge de la machine.
- `ui.test.js` (12e audit) : fonctions d'`app.js` exécutées avec le vrai `i18n.js`, sans navigateur — plages de dates en droite-à-gauche, « 21 jours max » et pluriels (1, 2, 5, 21, 22 en ru, uk, pl, cs, lt, ar), total ferry sans train-auto ni « ~0 € », tarif par personne, route vide dans les 161 langues, pas de vignette à vélo, plage de prix en japonais, liste des devises, `badge` des étapes du PDF. Ajoutés le 23/09/2026, tous éprouvés par mutation : un lieu-dit affiche la COMMUNE qui le porte (« Belzaises · Saint-Sulpice-sur-Risle », fiche réellement publiée), une commune n'affiche rien, et un lieu dont la commune porte son nom ne se répète pas ; **`selectCommune`** n'ajoute pas de parenthèse vide quand le lieu n'a pas de code postal (98 910 lieux publiés sont dans ce cas, et cette fonction n'était exercée par aucun test) ; « Aucune ville trouvée » est ANNONCÉE aux lecteurs d'écran, sans se répéter à chaque frappe et sans s'écrire après coup quand des résultats arrivent ; **deux suggestions au rendu identique reçoivent ce qui les distingue** — région, sinon population, sinon coordonnée — sur les trois cas réellement mesurés (les deux Robīt d'Éthiopie, les Kārēz d'Afghanistan à région et population identiques, deux Springfield de régions différentes), plus une fiche seule qui ne doit porter aucune mention. Ajouté au 17e audit : flèche « départ → étape » dans le bon sens en écriture de droite à gauche (isolats bidi), noms de pays en touroyo et en adyguéen, message dédié du refus 413, corps de l'export allégé sans perte d'information, tirage raté qui rend les boutons et vide l'annonce, et sélecteur de DEVISE monté dans un DOM factice pour vérifier son motif ARIA (bouton -> listbox, panneau sans rôle ni étiquette, une seule option sélectionnée) et rejouer son clavier (↓ ↑ Fin Début, Échap qui rend le focus, Entrée qui choisit) — pendant du contrôle posé sur le sélecteur de LANGUE dans `i18n.test.js`.
- `data.test.js` (12e audit, ~45 s, sans moteur) : aucune marque d'absence de nom (« Ninguno », « Sin Nombre »…) ni nom corrigé encore publié, exceptions « en attente » (HR, ES : fichiers postaux absents du disque) toujours justifiées, aucun « _ », parenthèse ou crochet non apparié, « * », nom réduit à un nombre, mélange latin + CJK, fête népalaise ni bloc de développement indien (13e audit), aucun alias orphelin ni refusé par `isJunkName` (14e audit), doublons en écriture locale écartés avec leur double romanisé publié (14e audit) ; ferries ≤ 60 km/h (hors train-auto et exception documentée), durées estimées ≤ 35 km/h jusqu'à 45 km et ≤ 45 km/h au-delà (`FAST_ESTIMATED_OK`, 13e audit), alias réparés publiés et lignes mal rattachées toujours écartées, aucune espace double ni en tête ou en fin, doublons au même point écartés avec leur nom trouvable comme alias, paires de ports non documentées absentes, mentions légales citant OpenStreetMap (quais, contours d'îles) et Natural Earth (15e audit) ; cohérence ferries ↔ ports (14e audit : distance > 1,5 × l'orthodromie, note « orthodromique » fausse de plus de 15 %, ports éloignés de plus de 1,5 × la distance + 5 km, paire de ports trop courte ; exceptions `DISTANCE_DETOUR_OK`, `ORTHO_CLAIM_OK`, `PORTS_FAR_OK`, `PAIR_SHORT_OK` qui doivent rester nécessaires) ; le contrôle des bundles se DÉCLARE sauté quand ils manquent (23/09/2026 : il comptait pour une réussite sans rien vérifier) ; reproduction de `lib/ferry-ports.js` avec `TEST_GENERATORS=1` ou `test:full` — **ce contrôle était rouge sur le dépôt** jusqu'au 22/09/2026, sans que personne le voie puisqu'il est désactivé par défaut : deux villes portuaires homonymes (Manila aux Philippines, Banshbaria au Bangladesh) faisaient refuser le générateur, le fichier livré restant juste mais plus régénérable. Depuis le 22/09/2026 également : **un alias est publié pour CHAQUE fiche écartée par une fusion**, homonymes compris (le test verrouillait l'inverse jusque-là), avec une seule exception écrite et fermée dont le test exige qu'elle reste introuvable autrement.
- `search.test.js` (17e audit, ~35 s) : **la recherche de ville de bout en bout**, c'est-à-dire qu'une saisie retrouve LE BON LIEU — ce qu'aucun test ne vérifiait avant. Quatre parties : (1) un index disque RÉDUIT est construit dans un dossier temporaire à partir de huit petits pays (GE, AM, IS, MT, CY, ME, XK, SM), ce qui exerce `build` / `open` / `search` de `lib/search-index.js` sans dépendre de `cache/`, absent d'un dépôt neuf ; (2) ce même index doit être REFUSÉ si le normalisateur de noms change (`meta.normSignature`) ou si un fichier de données change après la construction — c'est exactement la régression de la 16e passe, où 3 416 alias persans et ourdous étaient devenus introuvables parce que l'index gardait les clés d'avant ; (3) une table de 45 saisies réelles → lieu attendu (nom exact, sans accent, partiel, tirets et apostrophes, codes postaux dont les formes à tiret « cn-22 », « 100-0002 », alias en arabe, cyrillique, grec, chinois, japonais, coréen, hindi, thaï, géorgien, arménien, hébreu, amharique, persan et ourdou **avec et sans ZWNJ**, langue d'interface qui choisit le nom affiché entre parenthèses, pays prioritaire, homonymes classés par population), jouée par les DEUX chemins — `lib/search-index.js` sur disque et `engine.searchCity` en mémoire — qui doivent rendre le même lieu ; (4) un balayage de 1 000 alias tirés au hasard (reproductible) dans tous les fichiers, chacun devant retrouver son lieu (2,2 % d'échecs légitimes dus aux homonymes, 8 % tolérés ; sans les alias le taux monte à ~100 %). Ajouté le 23/09/2026 : **les lieux-dits français rattachés à leur commune** — 40 lieux tirés au hasard parmi ceux dont le nom ne désigne qu un seul lieu, chacun devant être rendu par les DEUX chemins avec le NOM DE SA COMMUNE et l un des codes postaux de cette commune (éprouvé par mutation : retirer le champ du moteur fait relever 116 rattachements perdus). Le moteur y est chargé AVEC ses 1,7 million d'alias (~30 s, ~4,4 Go) : c'est le seul moyen de tester `searchCity` tel que le serveur l'emploie en repli.
- `generators.test.js` (désactivé par défaut, `TEST_GENERATORS=1` ou `test:full`) : `build-tension-zones`, `build-transport-rules`, `build-lodging-rules`, `build-island-rules` reproduisent `public/js/trip-data.js` à l'octet près. Ils tournent dans une copie temporaire ; le dépôt n'est jamais modifié.
- Le vérificateur d'invariants ne demande plus au moteur si la moto est interdite sur autoroute : l'attente est recalculée depuis `MOTO_RULES`, comme celle du van depuis `VAN_RULES` (23/09/2026 — supprimer l'interdiction du moteur laissait les 42 tests verts). Les contrôles du chemin de recherche sur DISQUE signalent désormais qu'ils n'ont pas tourné quand `cache/search-index` manque, et un index présent mais refusé est distingué d'un index absent : trois tests restaient verts en ne contrôlant qu'une voie sur deux.
- `helpers/` : chargement du moteur avec accès à ses fonctions internes (compilation en mémoire, sans modifier `lib/`), `compare.js` (le plus gros fichier de `tests/`, moteur de l'outil de comparaison décrit plus bas) et vérificateur d'invariants (aligné sur le 11e audit : vitesse par pays `countrySpeedFactor`, devise des liens d'hébergement `LODGING_LINK_CURRENCIES`, cohérence de la fourchette de péage, ZFE rattachées à leur ville, point de départ compris), client HTTP brut, `fetch` simulé, démarrage du serveur, extraction du texte d'un PDF.

## Variables d'environnement

| Variable | Effet | Défaut |
|---|---|---|
| `TEST_FULL=1` | tailles complètes partout (posée par `--full`) | — |
| `TEST_TRIPS` | tirages de la campagne d'invariants | 300 (3000 en complet, 100 en rapide) |
| `TEST_SEED` | graine de la campagne (autre graine = autres départs et paramètres) | 1 |
| `TEST_TOLL_PAIRS` | paires aléatoires par pays pour les péages | 40 (300) |
| `TEST_PERF_REP` | tirages par départ et par cas de performance | 4 (10) |
| `TEST_SEARCH_SAMPLE` | alias tirés au hasard dans le balayage de `search.test.js` | 1000 (10000 en complet) |
| `TEST_GENERATORS=1` | active `generators.test.js` | — |
| `TEST_VERBOSE=1` | durée de chargement du moteur | — |

Réglages du SERVEUR et du service PDF qui n'existent que pour éprouver des chemins autrement inatteignables. Chacun est
borné dans le code : une valeur absurde retombe sur le défaut, elle n'affaiblit rien (20e audit du 21/09/2026 — ils
n'étaient documentés nulle part).

| Variable | Effet | Défaut |
|---|---|---|
| `BIG_STATIC_BYTES_MAX` | plafond d'octets par minute et par adresse sur les quatre gros fichiers statiques — l'éprouver au plafond réel demanderait d'envoyer 220 Mio | 220 Mio (bornes 64 Kio – 4 Gio) |
| `PDF_FILE_MAX` | longueur de la file d'attente du service d'export | 4 (1 – 64) |
| `PDF_REPONSE_MAX_MS` | délai de réponse d'un travail envoyé au fil : seul moyen d'exercer la perte du fil en vol | 15 000 ms (50 – 120 000) |
| `PDF_REDEMARRAGE_MS` | délai de garde avant de relancer un fil qui vient de mourir | 5 000 ms (50 – 60 000) |
| `PDF_DEMARRAGE_MAX_MS` | délai laissé au fil pour annoncer ses polices | 15 000 ms (50 – 120 000) |
| `PDF_FIL_ECHECS_MAX` | échecs de démarrage consécutifs avant de servir en repli | 3 (1 – 100) |
| `PDF_RECONSIDERATION_MS` | délai après lequel un fil condamné est retenté | 60 000 ms (100 – 3 600 000) |
| `PDF_FIL_CASSE` | `mort` : fil qui s'arrête aussitôt chargé ; `muet` : fil qui n'annonce jamais ses polices. Aucun chemin de fichier n'est accepté — la variable ne choisit qu'entre deux programmes d'une ligne écrits dans `lib/pdf-service.js` | — |
| `ONLY_COUNTRY` | générateurs de lieux : régénère cette liste de pays seulement (`ONLY_COUNTRY=ID,KR,PH`). Un code inconnu, ou la variable vide, sort en erreur plutôt que de ne rien faire en silence | — |

**17e audit du 20/09/2026 — le trou de couverture principal était la recherche elle-même.** Vider
`addAliasesToSearchIndex` (donc retirer les 1,7 million de noms alternatifs de la recherche) ne faisait échouer aucun
test : tous ne contrôlaient que la FORME des fichiers publiés. `search.test.js` (ci-dessus) comble ce trou ; la même
mutation y fait maintenant échouer trois tests sur six. Si `cache/search-index` est absent ou périmé, le test le dit
sur la sortie d'erreur et n'exerce que le chemin en mémoire — l'index réduit couvre alors le chemin disque.

**Bornes de données ajoutées au 17e audit dans `data.test.js`** (~20 s de plus, un seul parcours des 4,8 millions de
lignes) : latitude et longitude bien formées et dans les bornes du globe ; population entière d'au plus 40 millions
(Shanghai, le plus peuplé publié, en compte 24,9) ; aucune ligne de lieu dupliquée ; code postal bien formé, sans
séparateur en tête, en fin ni doublé, et jamais préfixé du code d'un AUTRE pays ; aucun lieu isolé de son pays (sa case
de 1° contient au plus trois lieux et la case occupée la plus proche du même pays est à plus de 400 km) — c'est le
contrôle « coordonnées hors du pays déclaré », avec 24 exceptions vérifiées une à une (Clipperton, Kerguelen, Agaléga,
Fernando de Noronha…). Il a trouvé **trois vrais défauts de coordonnées** — `PG|Katingan` (à Bornéo), `BH|Magsha`
(40,0000 / 26,0000, en Arabie saoudite) et `GT|Todos Santos Cuchumantan` (en plein Pacifique) — depuis écartés à la
source et les trois fichiers de pays régénérés ; une exception devenue inutile fait échouer le test, ce qui force à la
retirer quand la donnée est réparée ;
aucun alias identique au nom publié de son lieu ; code de langue d'alias non vide et pris dans une liste FERMÉE de
251 codes, entièrement utilisée. Côté ferries et péages : vitesse implicite d'au moins 10 km/h au-delà de 20 km de
traversée (seule la borne haute de 60 km/h existait) ; prix voiture d'au plus 500 € et au plus 15 × la médiane du prix
au kilomètre de sa classe de distance, camping-car jamais moins cher qu'une voiture et moto jamais plus chère ; barème
de péage de CHAQUE pays dans une fourchette (0,005–0,30 €/km en classe 1, 0,005–0,60 en classe 2, 0–0,30 en classe 5),
avec source déclarée et pays réellement à péage — jusqu'ici seule la France était ancrée. Ajoutées au 18e audit : aucune coordonnée « bouchon » (latitude ET longitude à l'entier exact — 139 lieux dans 55 pays), aucun « code postal » qui soit un identifiant interne GeoNames (1 592 lieux), et les pays soustraits au contrôle d'isolement doivent tous en avoir besoin (la liste en comptait 16, dont 11 inutiles et un pays inexistant). Chaque borne a été prouvée
par mutation — d'une VALEUR fausse ; aucune ne réagit en revanche à un fichier de pays **absent** (18e audit : avec `public/data` vide, les cinq bornes s'exécutent sur zéro ligne et passent). Réparé au passage : la boucle des alias de fusion codait « `ja;` » en dur (elle ne pouvait donc rien
détecter pour un nom chinois ou coréen) et le relevé des homonymes s'écrasait d'une table à l'autre, ce qui laissait
2 lignes sur 85 hors contrôle.

Trois contrôles permanents ajoutés au 16e audit dans `data.test.js` : aucun alias ne contient de caractère invisible (U+200B, U+00AD, U+2060, U+180E, U+FEFF, marques de direction), les ZWNJ/ZWJ devant au contraire rester ; aucun alias lao, khmer, birman ou thaï n'est déclaré dans une autre de ces quatre écritures ; un alias de fusion n'est publié que si le nom gardé est porté par un seul lieu du pays. `engine-regressions.test.js` ajoute : distance annoncée = la PLUS GRANDE faisable, aucune paire de ports de route comparable plus rapide au total, péage d'une étape avec traversée cohérent avec ses kilomètres ; la contre-épreuve de `engine-invariants.test.js` vérifie aussi que X est maximal (X + 5 km ne doit donner aucun itinéraire ; 15 km annoncés ici pour 25 testés jusqu'au 17e audit du 20/09/2026, le balayage est depuis exhaustif et la marge n'est plus qu'une tolérance d'arrondi). Ce contrôle n'est exigé que lorsque le moteur affirme avoir conclu (`returnCapExact`) : si son budget de temps tombe au milieu du balayage, X n'est qu'un minorant et le cas est compté à part dans la ligne de diagnostic de la campagne — sinon la campagne échouerait sur la charge de la machine. Les deux branches du drapeau sont verrouillées par un test de `engine-regressions.test.js` (horloge à bond), prouvé par mutation dans les deux sens.

**19e et 20e audits du 21/09/2026 — ce fichier n'avait pas été mis à jour par la 19e passe.** Ce qu'elle et la 20e ont
ajouté, et qui manquait ici :

- `engine-invariants.test.js` : la zone à tension, l'adjacence des frontières et la proximité des bornes de recharge
  sont **recalculées** par le vérificateur à partir des données, au lieu d'être demandées au moteur qu'il vérifie —
  remplacer `tensionOf` par `return null` laissait 67 tests sur 67 au vert, et en produit 581 depuis, avec quatre tests
  en échec (remesuré au 20e audit sur l'état final, graine 1, 300 tirages). L'auto-test du vérificateur déclare la
  famille attendue de chaque injection et vérifie sa couverture ; les dates des tirages sont relatives à l'année en
  cours.
- `server.test.js` : file d'attente du service PDF éprouvée **sur le module** et non à travers le créneau d'export (le
  test précédent restait vert avec une file infinie) ; le plafond d'octets des gros fichiers tient désormais face à des
  requêtes **enchaînées** (pipelining, serveur dédié avec `BIG_STATIC_BYTES_MAX` abaissé) ; un fil de travail qui meurt
  au chargement ou qui n'annonce jamais ses polices doit quand même rendre un document, par le repli
  (`tests/helpers/pdf-fil-casse.js`, processus à part, `PDF_FIL_CASSE`).
- `search.test.js` : l'index sur disque est refusé quand le normalisateur **ajoute** un caractère, pas seulement quand
  il cesse d'en traiter un — le test compile une copie de `lib/trip-engine.js` avec un caractère de plus dans
  `NORM_DROP_RE` après avoir vérifié que les échantillons seuls ne voient aucune différence ; et, sur tous les groupes
  d'homonymes de même code postal où le choix se voit, les deux chemins de recherche rendent le **même** lieu, le plus
  peuplé.
- `i18n.test.js` : l'annonce du sélecteur de langue n'écrit pas après coup et ne se répète pas à chaque frappe (faux
  minuteurs pilotés à la main) ; chaque langue se retrouve en tapant son nom sans les signes qu'aucun clavier ne donne ;
  les cinq polices embarquées s'appliquent au nom de la langue dans le sélecteur, pas seulement à la page entière.
- `ui.test.js` : le bouton de devise porte `dir="ltr"` comme les options de la liste, et le perd quand la devise
  redevient « automatique ».
- `data.test.js` : les coordonnées à deux entiers admises sont listées une par une avec leur preuve (13 depuis le 20e
  audit, 63 au 19e) ; la politique de confidentialité doit décrire les requêtes que le site fait **vraiment** (méthode
  comprise).

**21/09/2026 — le code postal devient facultatif.** `data.test.js` ajoute « aucun lieu réel écarté faute de code
postal » : pour un échantillon de quatorze pays couvrant les six familles de générateurs, il relit le dump GeoNames
et vérifie qu'aucun lieu éligible (bon code de lieu habité, nom exploitable, non écarté par `excludePlace`) ne
manque au fichier publié. Les trois exclusions qui ne tiennent PAS à un code — la France publie la liste IGN des
communes, sept pays du Levant appliquent un seuil de population, la Géorgie exige un nom en écriture géorgienne —
sont déclarées dans le test, et il échoue si l'une d'elles se retrouve aussi dans l'échantillon. Le contrôle ne
tourne que si `scripts/dump/` est présent (non commité, comme `scripts/postal/`). Prouvé par mutation : remettre
`return null` dans le générateur bulgare le fait échouer. Le contrôle de forme des codes accepte désormais un champ
VIDE, et ce champ vide ne rentre ni dans l'index de recherche en mémoire ni dans celui sur disque.

Chacun de ces contrôles a été prouvé par mutation : le défaut d'origine remis en place, le test échoue.

## Comparer deux versions du moteur (`npm run test:compare`)

Ajouté au 13e audit (19/09/2026). Aux 12e et 13e audits, des corrections du moteur ont changé des chemins voisins
(aller-retour à vélo, pays lents, voiture électrique, îles, temps de calcul ×7) sans qu'aucun test ne le voie : les tests
vérifient la cohérence d'un tirage et le cas corrigé, pas ce qui a **changé**. `tests/compare-engine.js` joue le même jeu
de tirages avec l'ancien et le nouveau moteur et liste chaque différence.

**Règle : tout changement listé doit être voulu et expliqué (message de commit ou commentaire daté) avant un commit.**
Un changement inattendu est une régression jusqu'à preuve du contraire.

| Commande | Ancien | Nouveau |
|---|---|---|
| `npm run test:compare` | `HEAD` | répertoire de travail |
| `npm run test:compare -- 3d53524` | `3d53524` | répertoire de travail |
| `node tests/compare-engine.js 3d53524 a8aa4bc` | `3d53524` | `a8aa4bc` |

Options : `--fail-on-diff` (code de sortie 1 si un tirage, un trajet direct, un plafond d'hébergement ou le temps global a
changé ; le temps réel n'y entre pas), `--sequential` / `--parallel` (par défaut en parallèle si plus de 20 Go sont
libres), `--all` (résumé sans filtrage), `--temps-reel` (voir plus bas), `--clean` (nettoyage seul ; `--clean --force` supprime aussi les extractions récentes), `--aide`. Variables :
`COMPARE_TIRAGES` (380 par défaut, dont 248 cas ciblés toujours joués), `COMPARE_GARDER_JOURS` (7),
`COMPARE_GARDER_RAPPORTS` (10).
Durée : ~105 s en parallèle avec `--temps-reel`, ~60 à 70 s sans (mesuré le 19/09/2026) ; ~3,5 Go de mémoire par moteur.

Nettoyage (14e audit) : à chaque lancement, et seul avec `--clean`, sont supprimés les extractions `<commit>\` inutilisées
depuis plus de `COMPARE_GARDER_JOURS` jours (fichier `.dernier-usage` ; jamais une extraction utilisée depuis moins d'une
heure), les dossiers `run-*\` de plus d'un jour et les rapports au-delà des `COMPARE_GARDER_RAPPORTS` plus récents. La
taille du dossier est affichée avant et après, et en fin de rapport.

Fonctionnement : l'ancien moteur est extrait par `git show` (jamais de checkout, le répertoire de travail n'est pas
touché) dans `%TEMP%\cap-sur-linconnu-compare\<commit>\` : `lib/`, `public/js/trip-data.js` et `data/*.json` toujours
(petits, lus par le moteur à côté de son code) ; `public/data/communes*.txt`, `featured.txt` et
`data/charging-stations.txt` seulement s'ils diffèrent du répertoire de travail, sinon ceux du dépôt sont relus. Les
deux bundles de lieux sont reconstruits de la même façon à partir des `communes*.txt` (un `communes-bundle.txt`
périmé ne fausse donc rien). Chaque moteur tourne dans son propre processus et écrit ses résultats en JSON.
Le dossier `%TEMP%\cap-sur-linconnu-compare\` peut être effacé à tout moment (copies reconstruites au besoin).

Ce qui est comparé :
- **Tirages** (`generateTrip`), jeu FIXE : 74 départs et plus (pays rapides et lents, îles mesurées ou non, frontières,
  grand Nord, antiméridien, pays à péage et sans péage) × 6 modes × 16 profils, chaque tirage à graine fixe sous une
  horloge ralentie ×10 (budget de 4 s → 40 s réelles). Étiquette « moto-interdite » calculée avec `motoMotorwayBan` du
  moteur (interdiction nationale totale : KR, TW, VN, TH, ID, PK, LK ; pas la Malaisie). 248 cas ciblés (16e audit du
  20/09/2026 : cette ligne disait 228 ; `TARGETED` de `tests/helpers/compare.js` en compte 248, comme la ligne
  `COMPARE_TIRAGES` plus haut), dont (14e audit) :
  - moto en vrai transit : Viêt Nam entre la Chine et le Laos (Nanning, Kunming, Luang Prabang), Thaïlande entre la
    Birmanie et le Laos (Myawaddy), plus un témoin intérieur (Kota Bharu) ;
  - aller-retour près d'un pays plus rapide : Bamako, Kayes, Sarajevo, Bihać, 250 à 370 km, voiture et moto ;
  - petites distances : Lyon, max 10 km, étape max 5 km ;
  - cas de production Mutang, Bella Vista et Nanma, 5 jours, éloignement 649 km.
- **Trajets directs** : paires nommées (48), frontalières (9), moto en transit (11, par VN, TH, PK) et 29 étapes avec
  traversée (`PAIRS_FERRY` ; 16e audit du 20/09/2026 : cette ligne disait 22, avant les 7 paires ajoutées à la 15e passe), jouées
  comme `finalizeHop` du moteur (`directHop`). Six modes plus « voiture-thermique sans péage ». Sont comparés : durée,
  partie routière, péage (avec `enabled`), recharge (bornes, arrêts, minutes), traversée (`priceCovers`, `footAmount`,
  `durationEstimated`, `mode`), pays traversés, restrictions.
- **Hébergement** : `lodgingPriceCap` et liens `buildLodgingLinks` (devise, plafond, plateformes) pour chaque pays × palier
  × devise (aucune, EUR, USD, JPY, XOF). Dans les tirages : dates et liens de chaque étape.

Lire le rapport (sortie standard, recopié avec le JSON détaillé dans `%TEMP%\cap-sur-linconnu-compare\rapport-*.txt|json`) :
- **Tirages : n / N changés, par nature** : `diagnostic` (tirage vide ou non, `minDistanceUnreachable` + `returnCapKm`,
  `minDistanceNotFound`, `timedOut`, `tensionBlocked`), `nbEtapes`, `etapes` (villes différentes : seuls les totaux sont
  alors comparés), et, à étapes identiques, `distances`, `durees` (`travelMin`, `roadMin`), `peages` (`amountMin`,
  `amount`, pays), `ferries`, `recharge`, `avertissements` (restrictions van/moto, `overMaxLeg`, avis), `pays` (pays
  traversés), `tension`.
- **Temps de calcul** : médiane et maximum des deux moteurs (temps réel), liste des tirages ralentis de plus de ×1,5 ET
  de plus de 200 ms. Deux lancements successifs du même moteur donnent des écarts de ±20 % : seul un écart net et
  répété compte.
- **Résumé par catégorie** (mode, classe de durée, cas ciblé, étiquette du départ, pays) : « ← TOUS changés » signale une
  catégorie entièrement touchée (« tous les vélos ont changé »), « ← plus lent / plus rapide » un temps médian qui dérive.
- **Trajets directs** : par groupe et mode, nombre de durées changées et rapport nouveau/ancien (« ×0,850 plus rapide » :
  îles d'un pays lent passées à la vitesse du mode, par exemple), péages et recharges changés, puis le détail.
- **Détail des tirages changés** : pour chacun, l'identifiant (`départ|mode|profil|paramètres|graine`) et les lignes
  « ancien → nouveau ».
- **Fichiers lus par le moteur qui diffèrent** (en tête) : code (`lib/`, `trip-data.js`) et données (`communes*.txt`,
  `featured.txt`, `data/*.json`, bornes), avec +/− lignes ; les `aliases-*.txt`, non lus par l'outil, sont mis à part.
  Distingue un changement de code d'un changement de données.
- **Couverture** : tirages moto en vrai transit, avec traversée, avec bornes réelles, et trajets directs moto-transit ou
  avec traversée, pour chaque moteur. « AUCUN » veut dire que les cas ciblés ne couvrent plus le chemin.
- **Transitions de diagnostic** : le plafond annoncé est joint quand il change (« bamako 1j min 330 (plafond 196→263) »).
- **Tension au départ** : comparée seulement si les deux résultats la portent ; un diagnostic devenu itinéraire est compté
  dans « diagnostic ».
- **Temps de calcul global** (14e audit) : en plus du seuil par tirage, médiane, p90 et total, sur tous les tirages et sur
  ceux au résultat inchangé. « !!! RALENTISSEMENT GÉNÉRAL » si la médiane ou le p90 augmente d'au moins 25 % (et de plus de
  5 ms / 20 ms), ou le total d'au moins 20 % (et de plus de 2 s) ; par catégorie (au moins 8 tirages) : +30 %. Même version
  des deux côtés : médiane ×1,00, p90 ×0,96, total ×1,01, aucune alerte (19/09/2026).
- **TEMPS RÉEL** (`--temps-reel`) : 24 cas ciblés rejoués avec l'horloge normale et le budget de 4 s de la production. Ce
  résultat **dépend de la machine et de sa charge** : section séparée, hors de `--fail-on-diff`.

Validation (13e audit) : `node tests/compare-engine.js 3d53524 a8aa4bc` fait apparaître les régressions du 12e audit —
allers-retours à vélo dont le plafond ou le diagnostic change selon le pays, îles de pays lents plus rapides (Cebu, Bali),
temps de calcul des allers-retours depuis Paris, allers-retours électriques/moto passant de `minDistanceUnreachable` à
`minDistanceNotFound`. Validation (14e audit) : `node tests/compare-engine.js a8aa4bc --temps-reel` montre 12 tirages moto
en vrai transit, 168 trajets directs avec traversée, aucune « tension au départ » parasite, les plafonds d'aller-retour de
Bamako, Kayes, Sarajevo et Bihać et les petites distances de Lyon. Pour rejouer un tirage : `runSteady(moteur, paramètres, graine)` (`tests/helpers/compare.js`).

**15e audit (19/09/2026).** Trois régressions de la 14e passe avaient échappé à l'outil (distance « hors de portée, X km »
infaisable, départs dans un pays couvert par le filtre des zones à tension répondant « introuvable », Sharm el-Sheikh
« hors de portée » alors que seul le filtre bloquait), plus un défaut ancien (une traversée recevait la durée, la distance
et le prix de la ligne de référence quelle que soit la paire de ports). Ajouts :
- **Contre-épreuve** : chaque tirage « hors de portée » (`returnCapKm = X`) est rejoué à `minDistanceKm = X`, même graine
  et même horloge, pour chaque moteur. Réussite : un itinéraire, ou (filtre des zones actif) « zones à tension » — X vient
  alors du second tirage sans filtre, départ dans une zone déconseillée (Moscou, Kyiv, Mogadiscio). Section « !!!
  CONTRE-ÉPREUVES » en tête ; un échec du NOUVEAU moteur compte dans `--fail-on-diff` (défaut, pas changement).
- **Cas ciblés** : zones à tension, filtre actif (Moscou 600, Kyiv, Téhéran, Kharkiv, Caracas 500, Kaboul 400, Brouta 300,
  Sharm el-Sheikh moto 190) ; distance annoncée (Lewe, Xarardheere, Calumboyan, Leganes, Jasdan) ; très petites îles
  (Jamestown, Longyearbyen, Parintins) ; Lyon avec une distance max de 1 et 3 km.
- **Traversées** : distance, durée, prix et marque d'estimation de chaque traversée (`pairEstimated` du moteur, `pairEst`
  déduit par l'outil) ; section « Traversées estimées d'après la paire de ports » ; trajets Gênes → Palerme, Santander →
  Portsmouth, Astakós → Sámi, Kyllíni → Póros, Thessalonique → Skiathos, témoins Villa San Giovanni → Messine et Douvres →
  Calais (inchangés attendus).
- **Rapports** horodatés en heure locale (fuseau indiqué), élagage après l'écriture du nouveau.

## En cas d'échec

Le message donne la graine et les paramètres du tirage fautif ; pour le rejouer :
`withSeed(graine, () => engine.generateTrip(paramètres))` (voir `tests/helpers/engine.js`).
Détails complets (violations en JSONL, journal du serveur, appels sortants simulés) dans le dossier temporaire
`%TEMP%\cap-sur-linconnu-tests` (`/tmp/cap-sur-linconnu-tests` ailleurs).

Remarque : au démarrage, `server.js` reconstruit son index de recherche (`cache/`, non versionné) s'il le juge périmé,
exactement comme `npm start`.
