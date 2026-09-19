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

- `engine-invariants.test.js` : tirages à graine (départs spéciaux : îles, enclaves, zones à tension, antiméridien, grand Nord ; paramètres aléatoires), un test par famille d'invariants (jours, nuits par ville ou avis `days.overMaxPerCity`, `maxLegKm` ou `overMaxLeg` justifié, éloignement et rayon, mer et frontières, ferry, zones à tension, péage, valeurs, retour, doublons, état remis à zéro), plus déterminisme, entrées invalides, départs forgés et cas ciblés (mer d'Åland, point 6, Acapulco/Maiduguri…). Un auto-test vérifie que le vérificateur détecte des défauts injectés.
- `toll.test.js` : modèle en FOURCHETTE depuis le 11e audit (`amountMin` = borne basse « probable », `amount` = borne haute « possible ») — pays sans barème jamais facturés (intérieur et transfrontalier ; un transit par un pays à péage peut apparaître dans la borne haute, jamais dans la borne basse), transit par l'Alsace (DE, CH) et autour de la Bosnie (HR↔HR), 38 liaisons françaises de référence (médiane dans [0,85 ; 1,15], prix officiel dans la fourchette à −20 % / +25 % près pour 80 % des liaisons au moins), autoroutes gratuites longeant des autoroutes payantes (FR, PT, IT, ES, IL : borne basse à 0 €), grands corridors payants (borne basse > 0 €), témoins facturés au bon barème / non facturés, vélo et péage décoché. Le test des autoroutes gratuites suppose la couche `freeCells` de `data/toll-grid.json` complète (`node scripts/build-toll-grid.js --free`).
- `perf.test.js` : durées de tirage et part de `timedOut` comparées aux seuils de `LIMITS` en tête du fichier. À lancer sur une machine peu chargée.
- `server.test.js` : `server.js` réel sur un port libre (`PORT`) : en-têtes de sécurité, `/data`, fichiers sources et dépôt jamais servis (réponse 4xx, quelle que soit l'écriture du chemin), quota des gros fichiers, export PDF (valide, budget de temps, écritures complexes, objets forgés → PDF complet avec pied de page), créneau PDF, file des appels sortants, `generate-trip` avec entrées forgées (jamais 500). Le serveur est arrêté à la fin, même en cas d'échec.
- `i18n.test.js` : 161 langues, clés et `{paramètres}` du français, pas de HTML ni de guillemet double, listes, empreinte CSP des scripts inline.
- `engine-regressions.test.js` (12e audit) : un test par défaut corrigé — vitesse du continent jamais appliquée aux îles et à l'outre-mer (≤ 80 km/h de moyenne, témoin continental), aller-retour dans la journée à la vitesse du pays (Lyon 380 km, plafond annoncé, Oulan-Bator diagnostiqué), diagnostic « éloignement introuvable » conservé quand un nouvel essai manque de temps (horloge simulée), pays traversés par les parties routières d'un ferry, moto dans un pays seulement traversé, borne haute du péage jamais « ~0 € » ; puis (13e audit) vélo à 15 km/h en aller-retour partout (plafond 67 km), îles des pays lents jamais plus rapides que leur continent, aller-retour Paris calculé en moins de 600 ms, électrique et moto « hors de portée » sans nouveaux essais, moto en trajet intérieur sans transit (Kangar → Melor) et en vrai transit ralentie (Nanning → Luang Prabang par le Viêt Nam). Les tirages à graine y tournent sous une horloge ralentie ×10 : le résultat ne dépend pas de la charge de la machine.
- `ui.test.js` (12e audit) : fonctions d'`app.js` exécutées avec le vrai `i18n.js`, sans navigateur — plages de dates en droite-à-gauche, « 21 jours max » et pluriels (1, 2, 5, 21, 22 en ru, uk, pl, cs, lt, ar), total ferry sans train-auto ni « ~0 € », tarif par personne, route vide dans les 161 langues, pas de vignette à vélo, plage de prix en japonais, liste des devises, `badge` des étapes du PDF.
- `data.test.js` (12e audit, ~15 s, sans moteur) : aucune marque d'absence de nom (« Ninguno », « Sin Nombre »…) ni nom corrigé encore publié, exceptions « en attente » (HR, ES : fichiers postaux absents du disque) toujours justifiées, aucun « _ » final ni mélange latin + CJK, aucun alias orphelin, ferries ≤ 60 km/h (hors train-auto et exception documentée) ; reproduction de `lib/ferry-ports.js` avec `TEST_GENERATORS=1` ou `test:full`.
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

Options : `--fail-on-diff` (code de sortie 1 s'il y a une différence ; sinon toujours 0, c'est un outil de revue),
`--sequential` / `--parallel` (par défaut les deux moteurs tournent en parallèle si plus de 20 Go de mémoire sont libres),
`--all` (résumé sans filtrage). `COMPARE_TIRAGES` : nombre de tirages (300 par défaut, dont 161 cas ciblés toujours joués).
Durée : ~70 s en parallèle (mesuré le 19/09/2026), ~2 min l'un après l'autre ; ~3,5 Go de mémoire par moteur.

Fonctionnement : l'ancien moteur est extrait par `git show` (jamais de checkout, le répertoire de travail n'est pas
touché) dans `%TEMP%\cap-sur-linconnu-compare\<commit>\` : `lib/`, `public/js/trip-data.js` et `data/*.json` toujours
(petits, lus par le moteur à côté de son code) ; `public/data/communes*.txt`, `featured.txt` et
`data/charging-stations.txt` seulement s'ils diffèrent du répertoire de travail, sinon ceux du dépôt sont relus. Les
deux bundles de lieux sont reconstruits de la même façon à partir des `communes*.txt` (un `communes-bundle.txt`
périmé ne fausse donc rien). Chaque moteur tourne dans son propre processus et écrit ses résultats en JSON.
Le dossier `%TEMP%\cap-sur-linconnu-compare\` peut être effacé à tout moment (copies reconstruites au besoin).

Ce qui est comparé :
- **Tirages** (`generateTrip`), jeu FIXE : 74 départs (pays rapides FR/DE/ES/IT, pays lents MN/ML/BA/MG/PH/NP, îles
  mesurées ou non — Corse, Mayotte, La Réunion, Cebu, Mindanao, Bali, Okinawa, Hokkaido, Majorque, Sardaigne, Crète,
  Tasmanie, Hawaï —, autoroutes interdites aux motos KR/TW/TH/VN/MY/ID/PK, zones à tension, frontières, grand Nord,
  antiméridien Fidji/Tonga/Tchoukotka, pays à péage et sans péage) × 6 modes × 16 profils (1 jour avec ou sans
  rayon/éloignement min/max, 2-3, 7, 14 et 21 jours, étapes max, ferries et zones à tension décochés, péage décoché), plus
  161 cas ciblés (aller-retour Paris, vélo avec éloignement dans des pays rapides et lents, électrique et moto au-delà de
  180 et 360 km, îles de pays lents, moto dans un pays seulement traversé, ferry avec parties routières, Puli). Chaque tirage a une
  graine fixe et tourne sous une horloge ralentie ×10 (budget de 4 s → 40 s réelles) : le résultat ne dépend pas de la charge.
- **Trajets directs** (`finalizeLeg`) : 190 paires de lieux (57 paires nommées — îles, outre-mer, frontières, moto interdite —
  et paires des plus grandes villes de 54 pays) × 6 modes : durée, péage, recharges, sans l'aléa du tirage.

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

Validation (13e audit) : `node tests/compare-engine.js 3d53524 a8aa4bc` fait apparaître les régressions du 12e audit —
allers-retours à vélo dont le plafond ou le diagnostic change selon le pays, îles de pays lents plus rapides (Cebu, Bali),
temps de calcul des allers-retours depuis Paris, allers-retours électriques/moto passant de `minDistanceUnreachable` à
`minDistanceNotFound`. Pour rejouer un tirage : `runSteady(moteur, paramètres, graine)` (`tests/helpers/compare.js`).

## En cas d'échec

Le message donne la graine et les paramètres du tirage fautif ; pour le rejouer :
`withSeed(graine, () => engine.generateTrip(paramètres))` (voir `tests/helpers/engine.js`).
Détails complets (violations en JSONL, journal du serveur, appels sortants simulés) dans le dossier temporaire
`%TEMP%\cap-sur-linconnu-tests` (`/tmp/cap-sur-linconnu-tests` ailleurs).

Remarque : au démarrage, `server.js` reconstruit son index de recherche (`cache/`, non versionné) s'il le juge périmé,
exactement comme `npm start`.
