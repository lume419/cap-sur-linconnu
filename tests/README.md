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

## En cas d'échec

Le message donne la graine et les paramètres du tirage fautif ; pour le rejouer :
`withSeed(graine, () => engine.generateTrip(paramètres))` (voir `tests/helpers/engine.js`).
Détails complets (violations en JSONL, journal du serveur, appels sortants simulés) dans le dossier temporaire
`%TEMP%\cap-sur-linconnu-tests` (`/tmp/cap-sur-linconnu-tests` ailleurs).

Remarque : au démarrage, `server.js` reconstruit son index de recherche (`cache/`, non versionné) s'il le juge périmé,
exactement comme `npm start`.
