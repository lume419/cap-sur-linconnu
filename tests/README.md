# Tests de non-régression

À lancer avant chaque commit. Aucune dépendance npm : `node:test`, `node:assert`, `fetch` intégré (Node ≥ 20 ; développé sous Node 24).
Aucun service externe n'est sollicité, et jamais la production : le serveur de test tourne en local avec un `fetch` simulé.

| Commande | Contenu | Durée indicative |
|---|---|---|
| `npm run test:quick` | i18n, péages, invariants du moteur (100 tirages) | ~2 min |
| `npm test` | tout sauf les générateurs, tailles par défaut | ~5 à 7 min (314 s mesurées le 19/09/2026 ; + 2 à 5 min si le serveur doit reconstruire son index de recherche) |
| `npm run test:full` | tout, tailles complètes, générateurs compris | 30 à 60 min |
| `node tests/run.js toll server` | seulement les fichiers dont le nom contient `toll` ou `server` | — |

Durées mesurées (`npm test`, relevé du 18/09/2026) : i18n < 1 s ; péages ~40 s ; invariants ~2,5 min ; performances ~2 min ; serveur ~1 min de démarrage + ~1 min de tests ; générateurs ~35 s.

Les fichiers s'exécutent l'un après l'autre : chaque processus charge le moteur une fois (~30 s, ~3 Go ; `--max-old-space-size=8192` est posé par `tests/run.js`).

## Fichiers

- `engine-invariants.test.js` (contre-épreuve depuis le 15e audit : chaque aller-retour « hors de portée, X km » est rejoué à X km, même graine ; un itinéraire ou, filtre actif, « zones à tension » est attendu ; le vérificateur recalcule aussi les traversées estimées d'après la paire de ports) : tirages à graine (départs spéciaux : îles, enclaves, zones à tension, antiméridien, grand Nord ; paramètres aléatoires), un test par famille d'invariants (jours, nuits par ville ou avis `days.overMaxPerCity`, `maxLegKm` ou `overMaxLeg` justifié, éloignement et rayon, mer et frontières, ferry, zones à tension, péage, valeurs, retour, doublons, état remis à zéro), plus déterminisme, entrées invalides, départs forgés et cas ciblés (mer d'Åland, point 6, Acapulco/Maiduguri…). Un auto-test vérifie que le vérificateur détecte des défauts injectés.
- `toll.test.js` : modèle en FOURCHETTE depuis le 11e audit (`amountMin` = borne basse « probable », `amount` = borne haute « possible ») — pays sans barème jamais facturés (intérieur et transfrontalier ; un transit par un pays à péage peut apparaître dans la borne haute, jamais dans la borne basse), transit par l'Alsace (DE, CH) et autour de la Bosnie (HR↔HR), 38 liaisons françaises de référence (médiane dans [0,85 ; 1,15], prix officiel dans la fourchette à −20 % / +25 % près pour 80 % des liaisons au moins), autoroutes gratuites longeant des autoroutes payantes (FR, PT, IT, ES, IL : borne basse à 0 €), grands corridors payants (borne basse > 0 €), témoins facturés au bon barème / non facturés, vélo et péage décoché. Le test des autoroutes gratuites suppose la couche `freeCells` de `data/toll-grid.json` complète (`node scripts/build-toll-grid.js --free`).
- `perf.test.js` : durées de tirage et part de `timedOut` comparées aux seuils de `LIMITS` en tête du fichier. À lancer sur une machine peu chargée.
- `server.test.js` : `server.js` réel sur un port libre (`PORT`) : en-têtes de sécurité, `/data`, fichiers sources et dépôt jamais servis (réponse 4xx, quelle que soit l'écriture du chemin), quota des gros fichiers, export PDF (valide, budget de temps, écritures complexes, objets forgés → PDF complet avec pied de page), créneau PDF, file des appels sortants, `generate-trip` avec entrées forgées (jamais 500). Le serveur est arrêté à la fin, même en cas d'échec.
- `i18n.test.js` : 161 langues, clés et `{paramètres}` du français, pas de HTML ni de guillemet double, listes, empreinte CSP des scripts inline.
- `engine-regressions.test.js` (12e audit) : un test par défaut corrigé — vitesse du continent jamais appliquée aux îles et à l'outre-mer (≤ 80 km/h de moyenne, témoin continental), aller-retour dans la journée à la vitesse du pays (Lyon 380 km, plafond annoncé, Oulan-Bator diagnostiqué), diagnostic « éloignement introuvable » conservé quand un nouvel essai manque de temps (horloge simulée), pays traversés par les parties routières d'un ferry, moto dans un pays seulement traversé, borne haute du péage jamais « ~0 € » ; puis (13e audit) vélo à 15 km/h en aller-retour partout (plafond 67 km), îles des pays lents jamais plus rapides que leur continent, aller-retour Paris calculé en moins de 600 ms, électrique et moto « hors de portée » sans nouveaux essais, moto en trajet intérieur sans transit (Kangar → Melor) et en vrai transit ralentie (Nanning → Luang Prabang par le Viêt Nam). Puis (14e audit) : distance annoncée « hors de portée » = plus lointain lieu atteignable (Bamako, près de la Guinée), aller-retour avec distance ou étape max sous 15 km (Lyon), moto vers un port du même pays sans transit. Puis (15e audit) : chaque « hors de portée, X km » faisable à X km (Lewe, Xarardheere, Jasdan, Lyon, Paris à vélo, Bamako), zones à tension (Moscou 600 km « hors de portée », Sharm el-Sheikh jamais « hors de portée » quand seul le filtre bloque), très petite île en aller-retour (Jamestown), traversée estimée quand la paire de ports s'éloigne de la ligne de référence (Gênes → Palerme) avec témoin sur la ligne de référence (Messine). Les tirages à graine y tournent sous une horloge ralentie ×10 : le résultat ne dépend pas de la charge de la machine.
- `ui.test.js` (12e audit) : fonctions d'`app.js` exécutées avec le vrai `i18n.js`, sans navigateur — plages de dates en droite-à-gauche, « 21 jours max » et pluriels (1, 2, 5, 21, 22 en ru, uk, pl, cs, lt, ar), total ferry sans train-auto ni « ~0 € », tarif par personne, route vide dans les 161 langues, pas de vignette à vélo, plage de prix en japonais, liste des devises, `badge` des étapes du PDF.
- `data.test.js` (12e audit, ~15 s, sans moteur) : aucune marque d'absence de nom (« Ninguno », « Sin Nombre »…) ni nom corrigé encore publié, exceptions « en attente » (HR, ES : fichiers postaux absents du disque) toujours justifiées, aucun « _ », parenthèse ou crochet non apparié, « * », nom réduit à un nombre, mélange latin + CJK, fête népalaise ni bloc de développement indien (13e audit), aucun alias orphelin ni refusé par `isJunkName` (14e audit), doublons en écriture locale écartés avec leur double romanisé publié (14e audit) ; ferries ≤ 60 km/h (hors train-auto et exception documentée), durées estimées ≤ 35 km/h jusqu'à 45 km et ≤ 45 km/h au-delà (`FAST_ESTIMATED_OK`, 13e audit), alias réparés publiés et lignes mal rattachées toujours écartées, aucune espace double ni en tête ou en fin, doublons au même point écartés avec leur nom trouvable comme alias, paires de ports non documentées absentes, mentions légales citant OpenStreetMap (quais, contours d'îles) et Natural Earth (15e audit) ; cohérence ferries ↔ ports (14e audit : distance > 1,5 × l'orthodromie, note « orthodromique » fausse de plus de 15 %, ports éloignés de plus de 1,5 × la distance + 5 km, paire de ports trop courte ; exceptions `DISTANCE_DETOUR_OK`, `ORTHO_CLAIM_OK`, `PORTS_FAR_OK`, `PAIR_SHORT_OK` qui doivent rester nécessaires) ; reproduction de `lib/ferry-ports.js` avec `TEST_GENERATORS=1` ou `test:full`.
- `generators.test.js` (désactivé par défaut, `TEST_GENERATORS=1` ou `test:full`) : `build-tension-zones`, `build-transport-rules`, `build-lodging-rules`, `build-island-rules` reproduisent `public/js/trip-data.js` à l'octet près. Ils tournent dans une copie temporaire ; le dépôt n'est jamais modifié.
- `helpers/` : chargement du moteur avec accès à ses fonctions internes (compilation en mémoire, sans modifier `lib/`) et vérificateur d'invariants (aligné sur le 11e audit : vitesse par pays `countrySpeedFactor`, devise des liens d'hébergement `LODGING_LINK_CURRENCIES`, cohérence de la fourchette de péage, ZFE rattachées à leur ville, point de départ compris), client HTTP brut, `fetch` simulé, démarrage du serveur, extraction du texte d'un PDF.

## Variables d'environnement

| Variable | Effet | Défaut |
|---|---|---|
| `TEST_FULL=1` | tailles complètes partout (posée par `--full`) | — |
| `TEST_TRIPS` | tirages de la campagne d'invariants | 300 (3000 en complet, 100 en rapide) |
| `TEST_SEED` | graine de la campagne (autre graine = autres départs et paramètres) | 1 |
| `TEST_TOLL_PAIRS` | paires aléatoires par pays pour les péages | 40 (300) |
| `TEST_PERF_REP` | tirages par départ et par cas de performance | 4 (10) |
| `TEST_GENERATORS=1` | active `generators.test.js` | — |
| `TEST_VERBOSE=1` | durée de chargement du moteur | — |

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
  moteur (interdiction nationale totale : KR, TW, VN, TH, ID, PK, LK ; pas la Malaisie). 228 cas ciblés, dont (14e audit) :
  - moto en vrai transit : Viêt Nam entre la Chine et le Laos (Nanning, Kunming, Luang Prabang), Thaïlande entre la
    Birmanie et le Laos (Myawaddy), plus un témoin intérieur (Kota Bharu) ;
  - aller-retour près d'un pays plus rapide : Bamako, Kayes, Sarajevo, Bihać, 250 à 370 km, voiture et moto ;
  - petites distances : Lyon, max 10 km, étape max 5 km ;
  - cas de production Mutang, Bella Vista et Nanma, 5 jours, éloignement 649 km.
- **Trajets directs** : paires nommées, frontalières, moto en transit (par VN, TH, PK) et 22 étapes avec traversée, jouées
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
