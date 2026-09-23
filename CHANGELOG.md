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
- **Six îles rendues au site par des liaisons sans véhicules.** Le champ `passengerOnly` ouvert pour Hrísey
  vaut pour toute une classe d'îles que le projet écartait faute de ferry *voiture*. Six sont ajoutées, avec
  des distances mesurées entre les deux lieux publiés : **Capri** (Naples ⇔ Capri, 50 min, 34 km, 21,50 €) et
  **Procida** (35 min, 24 km, 17,40 €), source [caremar.it](https://mobile.caremar.it/it/tariffe/) ;
  **Huahine, Raiatea, Taha'a et Bora-Bora** par l'Apetahi Express (Tahiti ⇔ Huahine 3 h / 177 km,
  Huahine ⇔ Raiatea 1 h / 49 km, Raiatea ⇔ Taha'a 45 min / 14 km, Taha'a ⇔ Bora-Bora 1 h / 35 km), tarif
  unique 7 000 XPF le segment soit 58,65 €, source [tuateaferries.com](https://tuateaferries.com/en/fares/).
  Aucune des deux grilles ne comporte de ligne véhicule, là où celle du Tauati Ferry (même groupe) en a une :
  les sept liaisons sont donc `passengerOnly`, proposées à tous les modes au tarif piéton.
- **Avertissement « ce ferry n'embarque pas de véhicules », dans les 161 langues.** Proposer l'île sans le dire
  aurait envoyé quelqu'un au port avec sa voiture. La phrase s'affiche sous la traversée, dans le bandeau orange
  des zones à tension, et dans le PDF — y compris dans le texte de secours du serveur. Elle est tue pour le vélo :
  sa classe de ferry est déjà `foot`, la phrase y serait fausse. Six mutants (drapeau ignoré, classe inversée,
  ligne retirée, phrase vidée, phrase retirée du PDF, drapeau retiré du corps envoyé) sont tous tués par les tests.
- **Lot de couverture, passe 4 : 47 liaisons, 51 masses reliées — la passe la plus faible du lot, et elle le dit.**
  - Les six îles féroïennes desservies par Strandfaraskip Landsins (Svínoy, Skúvoy, Hestur, Fugloy, Mykines,
    Koltur), Rakiura/Stewart Island, Mackinac Island, Fire Island, Asinara, Naissaar, Kiji, Valaam, Solovki,
    Anegada, Dokós, Trizonía, Canna, Gröde, Koh Samet, l'Île-aux-Moines, Larak, Gaua, Sebatik, Bacan, Ibo,
    Sherbro, Daru, Dahlak Kebir, la Mosquitia, cinq îles mexicaines et panaméennes, quatre des Bahamas,
    Kinmen, Tinian, Peleliu, Babeldaob, Weno, Saint-Barthélemy et le Calha Norte amazonien.
  - **Ce qui change par rapport aux passes 1 à 3, et qui est écrit dans chaque note :** les paires ne sont plus
    trouvées à la lecture d'un opérateur, elles sont **proposées automatiquement** — pour chaque masse habitée
    sans liaison, la rive publiée la plus proche sur une autre masse, à 40 km au plus. Aucune source propre à la
    liaison n'a été lue. La durée reste déduite de la distance entre les deux lieux publiés, à la vitesse médiane
    du projet, et reste marquée estimée ; aucun prix n'est écrit. **Cette passe se reprend ou se retire d'un bloc**,
    et ses 47 entrées portent toutes le suffixe `P4`.
  - **95 paires proposées, 47 retenues.** Écartées avec leur raison : le Kamtchatka et la Tchoukotka (les greffer
    au réseau routier eurasien par une traversée de baie serait faux), Curaçao et Aruba (aucun ferry vers le
    Venezuela), Molokai (la ligne a cessé en 2016), Montserrat (le service n'a pas encore ouvert), Kharg et la
    Grande Tunb (accès restreint ou disputé), Cayman Brac (avion), Mustique (île privée, avion), Milingimbi
    (avion et barge de fret), onze localités arctiques ou alaskiennes desservies par avion, et 26 paires dont la
    contrepartie est une masse synthétique, sans clé stable.
  - **Un cas écarté vaut signalement :** la paire proposée pour `capeVerdeOther` reliait deux lieux distants de
    2 km **à l'intérieur de Santiago**. Ce n'est pas une traversée, c'est un classement de masse à revoir.
  - Le contrôle des rives n'a rien arrêté cette fois : les 47 paires résolvent leurs deux ports et leurs homonymes
    du premier coup, chaque port portant sa position.
  - **Les cinq médianes ne bougent pas** (12,00 / 20,00 / 23,00 / 28,25 / 27,12 km/h) : les 47 durées étant
    estimées, elles sont exclues du calcul par construction.
  - `compare-engine` remonte **6 tirages changés sur 380**, tous en Thaïlande, en Italie, en Grèce et aux
    États-Unis — les quatre pays où cette passe ajoute une île (Koh Samet, Asinara, Trizonía et Dokós, Fire
    Island et Mackinac). Aucun pays non touché ne bouge, aucune paire de ferry ne change, aucun plafond
    d'hébergement non plus. Suite complète : **291 tests, 0 échec, 521 s.**
  - **Ce que la passe ne prouve pas.** Une sonde de 36 tirages par île ne voit la traversée empruntée que sur
    7 des 47 (les six féroïennes et l'Île-aux-Moines) ; ailleurs le tirage reste sur l'île, et 17 îles ne rendent
    aucun trajet. Ce n'est pas une régression — Stornoway, reliée depuis l'origine par CalMac, se comporte
    pareil — mais la liaison ajoutée ouvre la couverture sans garantir qu'un tirage donné la prenne.
- **Les impasses réelles sont enfin comptées : 42.** La mesure tentée le 23/09/2026 avait été faussée par la
  limitation de débit du serveur, qui répond 429 et fait passer pour mortes des masses jamais interrogées. La
  sonde tourne maintenant **en direct dans le moteur, sans HTTP donc sans quota** : pour chacune des 232 masses
  nommées sans liaison, jusqu'à trois départs (les lieux les plus peuplés) × trois durées × trois tirages.
  - **174 rendent un trajet** de l'intérieur : le message « réessayez, ou élargissez le rayon » y est juste.
  - **16 sont refusées au départ par la règle des zones à tension** — Kamtchatka, Norilsk, Tchoukotka, Socotra,
    l'Île de la Tortue… Ce ne sont pas des impasses, et elles ont déjà leur propre message, vérifié : filtre
    décoché, les 27 tirages de chacune rendent un trajet.
  - **42 sont de vraies impasses** : 95 lieux publiés, 68 792 habitants. Wallis, Futuna, Maupiti, Tristan da
    Cunha, Fernando de Noronha, Ilulissat, Utqiagvik, Batanes, cinq atolls de Tuvalu. Là, et là seulement,
    le message affiché est faux : rien ne marchera jamais.
- **Lot de couverture, passe 3 : 39 liaisons, 41 masses reliées.**
  - Quatre du Vanuatu (Malekula, Tanna, Ambrym, Vanua Lava), Ouvéa et Belep, deux des Galápagos, **sept des
    Bahamas** (Eleuthera, Exuma, Abaco, Andros, Cat Island, Long Island, San Salvador), Grand Turk et South
    Caicos, Izu Ōshima, quatre d'Australie du Nord (Rottnest, Melville, Elcho, Groote Eylandt), Catalina,
    Tioman, Ko Tao, Ko Tarutao, Coche, Manus, Lihir, Chizumulu, La Gonâve, trois philippines, Addu, Mafia,
    Bubaque, Bolama et Karimun. Même règle, même fichier source, qui compte désormais 118 liaisons.
  - **Izu Ōshima entre enfin.** Elle avait été écartée deux fois : les durées trouvées donnaient 63 km/h, au-dessus
    du plafond, et rien ne permettait de choisir entre deux chiffres qui se contredisaient. La règle du lot —
    durée déduite de la médiane du projet — résout le problème par construction, sans arbitrage arbitraire.
  - Le contrôle des rives a arrêté quatre entrées : deux homonymes (Long Beach, Catarman) et deux masses
    attendues fausses — **Port-au-Prince est sur `hispaniola`** et **Lae sur `newGuinea`**.
  - `compare-engine` remonte 5 tirages changés sur 380 (Tokyo pour Izu Ōshima, Kuala Lumpur et Kota Bharu pour
    Tioman), aucune médiane ne bougeant.
  - **La suite complète repasse à 291 tests, 0 échec, en 637 s.** Le contrôle PDF « fil de travail contre repli
    interne », qui échouait depuis plusieurs lots, repasse au vert dès que la machine retrouve sa vitesse :
    c'était bien le budget de temps de mise en page, jamais le code.
- **Lot de couverture, passe 2 : 42 liaisons hors d'Europe, 49 masses reliées.**
  - Les trois Comores, les Seychelles (Mahé, Praslin, La Digue), Lamu, Sainte-Marie, San Andrés ⇔ Providencia,
    cinq liaisons des Salomon, deux de Papouasie, neuf indonésiennes (Pelni et ASDP), Iriomote, Changshan,
    Cheduba, neuf philippines, Malé ⇔ Eydhafushi, Lívingston, Holbox, Culebra, Ko Kood et Pangkor.
    Même règle que la passe 1, même fichier source : durée déduite de la médiane du projet, aucun prix.
  - **Trois candidates écartées faute de pouvoir les attester** : São Tomé ⇔ Príncipe (aucune liaison
    régulière de passagers, déjà cherchée plus haut), Malé ⇔ Addu et Tarawa ⇔ Butaritari, aériennes en pratique.
  - Le contrôle des rives a arrêté huit entrées de plus : sept homonymes de ports (Kokopo, Dalian, Kyaukpyu,
    Estancia deux fois, Ceiba…) et un `near` mal placé — **Waisai était à 30 km de la coordonnée donnée**.
  - `compare-engine` remonte 11 tirages changés sur 380, tous dans les régions touchées (Kuala Lumpur et Kota
    Bharu pour Pangkor, Antananarivo pour Sainte-Marie, Nanma pour Changshan, Cebu pour les Philippines), et
    aucune médiane de vitesse ne bouge.
- **Lot de COUVERTURE : 37 îles d'un coup, à barre volontairement abaissée.**
  - Douze croates (Prvić, Zlarin, Kaprije, Krapanj, Vrgada, Silba, Lopud, Koločep, Susak, Unije, Ilovik,
    Biševo), cinq grecques (Spétses, Hydra, Kálamos, Kastós, Télendos), trois écossaises (Iona, Eigg, Rum),
    quatre des Scilly (Tresco, St Martin's, Bryher, St Agnes), trois allemandes (Langeneß, Hooge, Baltrum),
    deux françaises (Sein, Hœdic), quatre italiennes (Monte Isola, Tremiti, Stromboli, Panarea), deux
    açoriennes (Flores, Corvo), plus Ven et Prangli. Toutes `passengerOnly`.
  - **La règle du lot, écrite dans chaque note et dans un fichier source à part** (`iles-couverture.js`) : la
    liaison publique est attestée et ses deux rives sont des lieux publiés, mais **aucune durée ni aucun tarif
    n'a pu être lu à la source**. La durée n'est donc pas un chiffre trouvé quelque part : elle est **déduite de
    la distance mesurée entre les deux lieux publiés, à la vitesse médiane que le projet observe lui-même sur
    cette classe de distance** (`ferryMedianSpeed`), et marquée estimée. Aucun prix n'est écrit.
  - **Pourquoi ce lot existe.** Les lots précédents avançaient de deux à huit îles à la fois parce que chaque
    liaison attendait qu'un armateur publie sa grille. La plupart des armateurs restants ne publient rien de
    lisible. Ce lot troque la précision tarifaire contre la couverture, le dit, et se range dans son propre
    fichier pour qu'on puisse le reprendre ou le retirer d'un bloc.
  - **Ce que le lot ne fait PAS** : inventer une durée, inventer un prix, ou affirmer qu'un navire refuse les
    véhicules sans raison. Chaque `coversSource` dit laquelle : île sans voitures, absence de rampe, ou navire
    de passagers.
  - Le contrôle des rives du générateur a encore arrêté sept entrées : six ports homonymes (Šibenik ×3,
    Brodarica, Mýtikas ×2) et une rive attendue fausse — **Milazzo est en Sicile, pas sur le continent**.
    Santa Maria est restée dehors, faute de pouvoir départager les trois Ponta Delgada.
  - `compare-engine` remonte **16 tirages changés sur 380**, le plus gros écart du chantier, tous dans les
    régions touchées : Sarajevo, Ljubljana, Vienne, Munich et Bratislava pour l'Adriatique, Brest trois fois
    pour Sein et Molène, Rome et Cagliari pour l'Italie, Héraklion pour la Grèce. **Aucune médiane de vitesse
    ne bouge** : les 37 durées étant estimées, elles sont exclues du calcul.
- **Huit îles sans voitures en une passe : sept françaises et La Graciosa.**
  - Vannes ⇔ Île-d'Arz (30 min, 9 km), Roscoff ⇔ Île-de-Batz (15 min, 4 km), l'Arcouest ⇔ Bréhat (10 min,
    6 km), Quiberon ⇔ Houat (45 min, 15 km), Le Conquet ⇔ Molène (30 min, 7 km), Fouras ⇔ Île-d'Aix (20 min,
    8 km), Saint-François ⇔ La Désirade (45 min, 19 km), Órzola ⇔ Caleta de Sebo (25 min, 6 km).
    Toutes `passengerOnly`, aucune avec un tarif : les compagnies de ces navettes ne publient pas de grille
    lisible automatiquement.
  - **Méthode assumée pour ce lot** : la durée vient de l'armateur ou de la commune, en minutes rondes et sans
    horaire d'arrivée, donc marquée `durationEstimated` — sauf Bréhat, dont les 10 min figurent sur la page de
    la traversée directe chez l'armateur. C'est un lot de COUVERTURE : il rend des îles au site sans prétendre
    à la précision tarifaire des lots précédents, et chaque note le dit.
  - **Deux îles cherchées puis écartées, sur un chiffre.** Île-aux-Moines : le quai de Port-Blanc n'est pas
    publié et Baden, le lieu le plus proche, est à 4,6 km — la traversée de 5 min y roulerait à **60,2 km/h**,
    au-dessus du plafond. Stromboli : les 1 h 05 annoncées par un revendeur donnent **60,2 km/h** sur les 65 km
    mesurés, et la durée voisine de Panarea trouvée au même endroit est incohérente avec elle. Aucune des deux
    n'est écrite.
  - Un contrôle du générateur a encore servi : « Vannes : 2 homonymes sur cette rive, préciser near ».
- **Cinq îles sans voitures d'Europe du Nord, et un prix existant corrigé.**
  - **Harlingen ⇔ Vlieland** (1 h 35, 27 km, **22,14 €**), **Lauwersoog ⇔ Schiermonnikoog** (45 min, 10 km,
    **7,95 €**), **Le Conquet ⇔ Ouessant** (1 h 30, 19 km), **Harlesiel ⇔ Wangerooge** (1 h, 12 km, **39 €**)
    et **Schaprode ⇔ Hiddensee** (45 min, 8 km). Toutes `passengerOnly`, toutes dites telles par leur source :
    « Vlieland is autovrij, het is dan ook niet toegestaan uw auto mee te nemen naar het eiland » ;
    « Da Wangerooge für Privatfahrzeuge gesperrt ist, müssen Autos am Festland bleiben » ; Ouessant où
    « la voiture reste sur le continent » ; Hiddensee « eine der wenigen autofreien Inseln Deutschlands » ;
    Schiermonnikoog fermée aux véhicules des non-résidents depuis 1968.
  - **Le projet avait déjà écrit pourquoi il les excluait.** Le commentaire des traversées Wadden disait :
    « Vlieland et Schiermonnikoog : AUCUNE liaison […] Sans entrée FERRY_ROUTES, leurs masses restent isolées :
    leurs lieux ne sont plus proposés en road trip. » C'était la description exacte du trou que `passengerOnly`
    a été fait pour combler ; il ne restait qu'à l'appliquer.
  - **Un prix déjà publié était faux, et la même page le prouve.** Le tarif piéton de Terschelling avait été
    obtenu en divisant le retour par deux (36,90 → 18,45 €). Or Rederij Doeksen écrit sur cette même page
    « Het tarief voor een enkele reis is 60% van de retourprijs » : l'aller simple vaut **22,14 €**, pas 18,45 €
    — une sous-estimation de 17 %, corrigée. Wagenborg, lui, vend l'aller simple à 44 % du retour (7,95 € pour
    18,24 € à Schiermonnikoog) : le tarif piéton d'**Ameland**, obtenu de la même façon en divisant par deux,
    reste **à vérifier** — c'est écrit dans le commentaire du bloc.
  - Schiermonnikoog ne se vend en aller simple que **depuis l'île** (7,95 €) ; depuis le continent, seul le
    retour existe (18,24 €). C'est l'aller simple publié qui est retenu.
  - Ouessant et Hiddensee restent sans prix : Penn Ar Bed **répond 403 à toute lecture automatique**, page des
    tarifs comme PDF, et les montants d'Hiddensee ne viennent que de comparateurs.
- **Les Saintes rendues au site, sur la troisième page d'armateur à dire non aux véhicules.**
  - **Trois-Rivières ⇔ Terre-de-Haut** (25 min, 17 km) et **⇔ Terre-de-Bas** (35 min, 16 km), FRS Express des
    Îles, sans prix. « VEHICLE TRANSPORT: Not available » : après Marie-Galante (« NOT AVAILABLE ») et la
    Dominique (« Not available »), c'est la troisième fois que le même armateur écrit lui-même ce que
    `passengerOnly` modélise.
  - Terre-de-Bas met **plus longtemps pour moins de distance** : sa traversée passe par Terre-de-Haut
    (« with stopover at Terre-de-Haut »), ce que les 35 min publiées contre 25 reflètent.
  - La même compagnie dessert aussi Les Saintes depuis Pointe-à-Pitre en 1 h, avec la même mention
    « VEHICLE TRANSPORT: NO » : c'est la traversée la plus courte qui est modélisée.
  - Un tirage au départ de Terre-de-Haut enchaîne la Guadeloupe, la Martinique — par la seule traversée du lot
    qui embarque les véhicules — puis Sainte-Lucie.
- **Makana Ferry : Saba et Sint Eustatius, trois traversées d'un même catamaran.**
  - **Fort Bay ⇔ Philipsburg** (1 h 15, 50 km), **Philipsburg ⇔ Oranjestad** (1 h 25, 61 km) et
    **Fort Bay ⇔ Oranjestad** (45 min, 33 km), sans prix : les tarifs ne sont publiés qu'en image sur le site
    de l'armateur. Saba (4 468 habitants publiés) et Sint Eustatius (1 971) se raccordent à Saint-Martin,
    reliée au lot précédent.
  - **Les durées se recoupent avec la vitesse du navire.** L'armateur annonce un « 72' Sabre catamaran fast
    ferry » à 23 nœuds, soit 42,6 km/h ; les trois durées publiées, rapportées aux distances mesurées, donnent
    40,0, 43,0 et 44,0 km/h. Deux sources indépendantes du même site qui s'accordent à moins de 4 % : c'est le
    seul contrôle croisé qu'on ait pu faire sur une durée de tout ce chantier.
  - Un tirage au départ d'Oranjestad enchaîne Saba, Sint Maarten puis Anguilla par Marigot : tout le nord des
    îles Sous-le-Vent forme désormais un réseau continu, entièrement sans véhicules.
- **Virgin Gorda et Guanaja : deux tarifs publiés, deux durées qui ne le sont pas.**
  - **Road Town ⇔ Spanish Town**, Speedy's, 36 min (estimée), 20 km, **25,77 €** (« \$30 » l'aller simple
    adulte, 40 \$ l'aller-retour). Virgin Gorda rejoint le réseau des îles Vierges par Tortola, reliée la veille.
  - **Roatán ⇔ Guanaja**, Galaxy Wave, 2 h (estimée), 77 km, **30,06 €** (« Regular US\$ 35.00 »), deux départs
    par semaine seulement. Roatán était déjà reliée au continent.
  - **Comment ces deux durées ont été posées, faute d'être publiées.** Speedy's ne donne que des heures de
    départ : la durée est déduite de la seule vitesse que l'armateur annonce, sur sa ligne de Saint-Thomas
    (« St. Thomas to Virgin Gorda in 90 minutes » pour une cinquantaine de kilomètres, soit ~37 km/h), ce qui
    donne une demi-heure ici — portée à 36 min pour rester sous le plafond de 35 km/h des durées estimées.
    Galaxy Wave n'annonce rien : deux heures sont retenues comme ordre de grandeur. Les deux sont marquées
    `durationEstimated` et le disent dans leur note.
  - **Montserrat écartée, et pourquoi** : le service n'existe pas encore. Montserrat Ferry Services écrit
    « Our detailed schedule and fare structure for the Montserrat–Antigua route are currently being finalized ».
- **Les trois autres îles des Princes, par la même ligne que Büyükada.**
  - **İstanbul ⇔ Heybeliada** (20 km), **⇔ Burgazada** (18 km) et **⇔ Kınalıada** (15 km), Şehir Hatları,
    40 min (estimée), sans prix. Même armateur, même source et **même obstacle** que Büyükada : la grille est
    derrière une vérification anti-robot et le tableau « Adalar » du barème İBB ne survit pas à l'extraction du
    PDF. Les véhicules à moteur y sont interdits comme sur toute l'archipel — « motorized vehicles – except
    service vehicles – are forbidden ».
  - Burgazada ne figurait pas dans la liste des sept repérées : elle est venue avec les deux autres, son lieu
    publié (« Burgaz ») étant sur la même ligne et à la même escale près.
  - Un tirage au départ de Heybeliada enchaîne d'ailleurs sur Lesbos, en avertissant sur la traversée des
    Princes et pas sur celle de Lesbos, qui embarque les voitures.
  - **Quatre des sept restent.** Hydra et Spétses : la politique véhicules est solide — les hydroglisseurs et
    navires rapides du golfe Saronique **n'ont pas de garage** et Hydra est sans voitures — mais Hellenic
    Seaways n'a plus de page de ligne, seulement une billetterie, donc ni durée ni tarif citables. Virgin Gorda,
    Montserrat et Guanaja : pas encore cherchées.
- **Lot 2 (rangs 112 à 222), début : Scilly et Juist.**
  - **Penzance ⇔ St Mary's**, Isles of Scilly Travel (Scillonian III), 2 h 45, 60 km, sans prix. « Dogs allowed »
    est la seule mention, sur la page de la ligne, de ce qui embarque à côté des passagers ; aucun tarif n'y est
    chiffré. De mars à novembre, six jours sur sept et sept en haute saison.
  - **Norddeich ⇔ Juist**, Reederei Norden-Frisia, 1 h 30, 13 km, sans prix. **La meilleure source de tout le
    chantier** pour `passengerOnly` : « Juist ist eine autofreie Insel. Daher werden keine PKW transportiert und
    dein Auto bleibt sicher auf einem der Langzeitparkplätze des INSELPARKERS zurück » — l'armateur décrit mot
    pour mot le cas que ce champ modélise, voiture laissée au port comprise.
  - **Une grille lisible, et pourtant aucun prix écrit.** Norden-Frisia publie adulte 24,30 € au guichet et
    22,80 € en ligne, enfant 12,15 € et 11,40 €, chien 10,20 € — mais **la page ne dit nulle part si ces
    montants valent l'aller simple ou l'aller-retour**, et les mots « einfache Fahrt » comme
    « Hin- und Rückfahrt » en sont absents. Écrire l'un ou l'autre serait un chiffre sur deux faux.
  - Effet de bord mesuré, une seule médiane bouge : Scilly (21,8 km/h) est plus lente que la médiane de sa
    classe, qui redescend de **23,00 à 22,69 km/h** pour les 45-100 km ; Juist ne déplace pas celle des moins de
    15 km. `compare-engine` remonte un seul tirage changé sur 380 (Ajaccio, une minute et un kilomètre d'écart).
  - **Le lot 2 est bien moins peuplé que le lot 1** : il s'ouvre à 5 656 habitants (Ascension) et descend sous
    2 000 dès le rang 160. Les candidats repérés qui se raccordent à une masse DÉJÀ reliée : Virgin Gorda
    (depuis Tortola), Montserrat (depuis Antigua), Guanaja (depuis Roatán), Hydra et Spétses (depuis le
    continent grec), Heybeliada et Kınalıada (même ligne Adalar que Büyükada). Catalina a été cherchée puis
    écartée : Catalina Express ne publie ni durée ni tarif, tout passe par sa billetterie.
- **Les trois dernières liaisons cherchées du lot 1.**
  - **Port-Vila ⇔ Luganville**, Big Sista, 24 h (estimée), 276 km, sans prix. Seul lien maritime régulier entre
    les deux principales îles du Vanuatu : « a 33 metre passenger vessel […] stopping at Epi and Malekula along
    the way », départ le lundi soir, retour le jeudi (office du tourisme de Vanuatu). L'armateur n'a **pas de
    site**, seulement une page Facebook et deux guichets : le seul montant trouvé (10 000 VUV l'aller) vient
    d'un guide tiers et n'est donc pas écrit comme prix. Efate (38 386 habitants publiés) et Espiritu Santo
    (15 697) entrent ensemble dans la couverture.
  - **Providenciales ⇔ Sandy Point (North Caicos)**, Caribbean Cruisin' (TCI Ferry), 30 min, 25 km, **34,36 €**
    (« Single Adult: \$40 one-way », grille du 1er juin 2025). **Une approximation est dite plutôt que cachée** :
    le quai de Heaving Down Rock, à la pointe est de Providenciales, n'a aucun lieu publié à moins de 18 km, si
    bien que la distance modélisée (25 km) dépasse la vraie traversée (une douzaine de kilomètres) et que la
    vitesse apparente est trop élevée.
  - **Charlotte-Amalie ⇔ Road Town**, Road Town Fast Ferry, 50 min, 35 km, sans prix : la grille existe sur le
    site de l'armateur mais chaque montant y est affiché « Not Available Yet ». Tortola rejoint le réseau déjà
    relié des îles Vierges — un tirage au départ de Road Town enchaîne Charlotte-Amalie, Cruz Bay et
    Christiansted, en avertissant sur les traversées sans véhicules et pas sur le bac de Red Hook.
- **Suite du lot 1 : deux liaisons de plus sur les huit repérées.**
  - **Marigot ⇔ Blowing Point**, navettes du port de Marigot, 20 min, 15 km, **37 €** : « \$30/30 € » l'aller
    simple adulte payable en espèces à bord, plus « 7 € » de droit de passager à partir de 4 ans, payable
    seulement en euros ou par carte. Dix départs par jour dans chaque sens, sept jours sur sept.
    `passengerOnly` : la grille du port ne comporte que des tarifs par personne. Saint-Martin (65 328 habitants
    publiés) et Anguilla entrent ensemble dans la couverture.
  - **Sóc Trăng (Trần Đề) ⇔ Bến Đầm (Côn Đảo)**, Superdong, 2 h 30 (estimée), 104 km, sans prix — même armateur
    et même situation que Phan Thiết ⇔ Phú Quý : l'horaire officiel donne les navires, les départs et la vitesse
    (26 à 28 nœuds), jamais les tarifs.
  - **Un test a corrigé une estimation.** La durée d'abord écrite, 2 h 15, donnait 46 km/h sur les 104 km
    mesurés, au-dessus du plafond de 45 km/h que `data.test.js` impose aux durées ESTIMÉES : `data.test.js` a
    refusé la ligne. La durée retenue est 2 h 30, la plus lente des deux annoncées sur cette traversée.
  - **Six des huit restent à faire, avec leur obstacle nommé.** Saint-Martin ⇔ Saint-Barthélemy : la page
    d'horaires de Great Bay Express rend 404 et l'accueil ne chiffre rien. Flores ⇔ Faial : Atlânticoline
    confirme la ligne mais ses tarifs et durées sont derrière un moteur de recherche. Kinmen ⇔ Xiamen : les deux
    « Xiamen » publiés dans les données sont au Shanxi et au Zhejiang, à des centaines de kilomètres du vrai port
    du Fujian — la rive continentale serait fausse. Restent Port-Vila ⇔ Luganville, Providenciales ⇔ North
    Caicos et Tortola ⇔ Saint-Thomas, non encore cherchées.
- **Tri des 111 masses les plus peuplées sans liaison (lot 1 sur 4), et deux liaisons de plus.**
  - **Gallows Bay ⇔ Charlotte-Amalie**, QE IV Ferry, 2 h 10, 71 km, **60,12 €** (« One-way: \$70 »,
    « Round trip: \$60 » : l'aller simple est retenu, une traversée valant un trajet). `passengerOnly` :
    la grille ne comporte que des tarifs par personne. Sainte-Croix (52 995 habitants publiés) était isolée
    alors que Saint-Thomas est déjà reliée.
  - **Fort Lauderdale ⇔ Freeport**, Baleària Caribbean (Jaume II), 3 h, 151 km, sans prix : la page annonce
    « From 235 \$ » **sans dire si c'est un aller simple ou un aller-retour**, et sa rubrique « I Travel with a
    Car » est un gabarit générique, repris mot pour mot pour les animaux et l'accessibilité — elle ne prouve
    rien sur les véhicules. Grand Bahama : 89 903 habitants.
  - **Ce que le tri a montré.** Sur les 111, une douzaine seulement ont un armateur qui publie ses tarifs.
    Le gros du reste se répartit en trois familles : **aucun service maritime à modéliser** (Hawaï depuis
    l'arrêt du Superferry en 2009, Jamaïque, Bermudes, Guam, Saipan, Grand Cayman, Cayman Brac, Curaçao,
    Aruba, Bonaire, Barbade, La Réunion, Kamtchatka, Norilsk, Tchoukotka) ; **service réel mais sans source
    lisible** (Cat Cocos aux Seychelles, ASDP et Pelni en Indonésie, matrice MARINA aux Philippines, vedettes
    des Galápagos, chaloupes de l'Amazone, Comores) ; **liaisons internes à une masse déjà nommée**, qui ne
    relient donc rien (Atlânticoline aux Açores, MTCC aux Maldives). La suite du lot 1 est une liste courte et
    nommée : Saint-Martin ⇔ Anguilla, Saint-Martin ⇔ Saint-Barthélemy, Port-Vila ⇔ Luganville, Sóc Trăng ⇔
    Côn Đảo, Providenciales ⇔ North Caicos, Tortola ⇔ Saint-Thomas, Flores ⇔ Faial, Kinmen ⇔ Xiamen.
  - Même effet de bord que le lot précédent, mesuré : les deux nouvelles distances déplacent deux médianes de
    vitesse, celle de la classe 45-100 km de **22,69 à 23,00 km/h** et celle de la classe 100-300 km de
    **26,67 à 28,25 km/h**. `compare-engine` remonte deux tirages changés (Dublin à vélo, Ajaccio à moto).
  - **Izu Ōshima mise de côté, et pourquoi** : le jetfoil de Tōkai Kisen fait les 110 km en 1 h 45, soit
    63 km/h — au-dessus du plafond de 60 km/h que `data.test.js` impose aux ferries. La modéliser demande une
    exception écrite pour les engins à grande vitesse, et la durée du grand navire, celui qui embarque les
    véhicules, n'a pas pu être lue de façon fiable.
- **Deux liaisons de plus, quatre masses rendues au site — et trois pistes écartées faute de source.**
  - **Mā'alaea (Maui) ⇔ Mānele (Lāna'i)**, Lāna'i Expeditions, 1 h 10, 44 km, **34,36 €**. L'armateur titre
    « Maui to Lāna'i Passenger Ferry » : `passengerOnly`. Le départ était à Lahaina, transféré à Mā'alaea après
    les incendies de Maui d'août 2023. Tarif : hausse autorisée par la Public Utilities Commission d'Hawaï
    (dossier 2023-0204), applicable au 5 octobre 2024, « adult fares that range between \$40.00 and \$66.00 » —
    le tarif adulte le moins cher est retenu, comme partout ici. Maui : 168 146 habitants publiés.
  - **Saint John's ⇔ Codrington (Barbuda)**, Sea Bridge Ferries, 1 h 30, 59 km, **55,83 €** pour l'adulte.
    Ses navires « carry both passengers and large cargo » : la liaison n'est donc PAS déclarée sans véhicules,
    mais aucun tarif véhicule n'étant publié, les classes motorisées restent sans prix — une voiture traverse
    avec l'avertissement « tarif non communiqué », un vélo au tarif adulte publié. Antigua : 120 870 habitants.
  - **Trois pistes écartées, et pourquoi.** *Sri Lanka* (4 455 053 habitants publiés, la plus grosse masse sans
    liaison) : le ferry Nagapattinam ⇔ Kankesanthurai a ouvert en 2023, s'est interrompu, a repris en août 2024,
    et le domaine de l'armateur (indsri.com) est aujourd'hui **parqué chez un revendeur** — aucune source vivante
    ne dit qu'il navigue, les tarifs trouvés se contredisent (₹7 670 chez Wikipédia, ₹5 000 à 7 500 ailleurs).
    *São Tomé ⇔ Príncipe* : aucune liaison régulière de passagers documentée, le lien courant est aérien.
    *Seychelles (Cat Cocos)* : la ligne existe et est quotidienne, mais horaires et tarifs ne sont publiés qu'en
    images et derrière la réservation — à reprendre avec une source lisible.
- **Sept liaisons de plus, six masses terrestres rendues au site, les plus peuplées d'abord.**
  - **Ligne internationale FRS Express des Îles** : Guadeloupe – Dominique – Martinique – Sainte-Lucie, quatre
    traversées d'un seul armateur. Pointe-à-Pitre ⇔ Fort-de-France (4 h 45 avec escale en Dominique, 184 km),
    Pointe-à-Pitre ⇔ Roseau (2 h 30, 106 km), Fort-de-France ⇔ Roseau (2 h 15, 81 km), Fort-de-France ⇔ Castries
    (1 h 30, 73 km). L'armateur écrit « VEHICLE TRANSPORT : Available only between Guadeloupe and Martinique » :
    **une seule des quatre embarque des véhicules**, les trois autres sont `passengerOnly`. Vérifié : un tirage au
    départ de Fort-de-France enchaîne les trois îles et n'avertit que sur les traversées sans véhicules.
    Martinique (360 630 habitants publiés) et Sainte-Lucie (130 166) étaient les deux plus grosses masses reliables
    encore isolées.
  - **Bo Hengy III (Bahamas Ferries)** : Nassau ⇔ Spanish Wells (2 h 10, 80 km, **119,39 €**), Spanish Wells ⇔
    Harbour Island (45 min, 14 km, **40,37 €**), Nassau ⇔ Harbour Island (3 h 10, 87 km, même tarif que Spanish
    Wells). Grille publiée TVA comprise, convertie au taux InforEuro de septembre 2026 (1 EUR = 1,1643 USD, le
    dollar bahaméen étant au pair). Le projet **connaissait déjà cette ligne** et rangeait ses deux escales en îles
    isolées « passagers seulement » : elles reçoivent une clé nommée (`spanishWells`, `harbourIsland`) et New
    Providence (245 619 habitants) cesse d'être une impasse.
  - Les tarifs sont publiés pour les trois liaisons des Bahamas ; les quatre antillaises portent
    `priceStatus: 'unknown'`, leurs montants n'existant que dans le tunnel de réservation.
  - **Effet de bord voulu, et mesuré** : la vitesse médiane qui sert aux traversées ESTIMÉES est calculée sur
    toutes les liaisons publiées. Trois des nouvelles tombent dans la classe 45-100 km et sont rapides, ce qui
    fait passer la médiane de cette classe de **21,43 à 22,69 km/h** ; les quatre autres classes ne bougent pas.
    Les traversées estimées de 45 à 100 km raccourcissent donc d'environ 6 % partout — c'est ce que
    `compare-engine` remonte sur deux tirages (Dublin, Ajaccio), et non un changement de route.
- **Six îles de plus, toutes par des liaisons de passagers.** Marie-Galante, Ambergris Caye, Büyükada, Boracay,
  Phú Quý et Lý Sơn étaient hors de la couverture faute de ferry *voiture*. Leurs masses terrestres étaient déjà
  déclarées : il ne manquait que la liaison. Distances mesurées entre les deux lieux publiés.
  - **Pointe-à-Pitre ⇔ Grand-Bourg**, FRS Express des Îles, 1 h, 45 km. La page de la ligne, chez l'armateur, porte
    « VEHICLE TRANSPORT: NOT AVAILABLE » — c'est la source la plus nette de tout le lot. Val'Ferry, qui embarquait des
    véhicules, ne dessert plus l'île.
  - **Belize City ⇔ San Pedro**, San Pedro Belize Express Water Taxi, 1 h 30, 52 km.
  - **İstanbul ⇔ Büyükada**, Şehir Hatları, 40 min (estimée), 22 km : « motorized vehicles – except service
    vehicles – are forbidden » à Büyükada.
  - **Caticlan ⇔ Cagban**, CBTMPC, 10 à 15 min, 2 km, d'après le portail officiel Boracay iPass : la voiture reste
    à Caticlan.
  - **Phan Thiết ⇔ Phú Quý**, Superdong, 2 h 30 (estimée), 102 km : l'horaire officiel ne donne qu'une capacité en
    passagers (306 et 246) et une vitesse de 26 à 28 nœuds, aucun pont véhicules.
  - **Sa Kỳ ⇔ Bến Đình (Lý Sơn)**, 35 min, 28 km, **180 000 VND soit 5,93 €** — le seul tarif du lot qui soit
    réellement publié (grille du Ban Quản lý cảng Sa Kỳ du 16/04/2026, TVA, assurance et droit de pont compris).
- **Cinq de ces six liaisons n'ont pas de prix, et c'est écrit comme tel.** Pour chacune, ce qui a bloqué est nommé
  dans la note : tarif adulte visible seulement dans le tunnel de réservation (Marie-Galante, Belize, Superdong),
  sommes officiellement nommées mais jamais chiffrées (Boracay iPass), grille de l'armateur derrière une vérification
  anti-robot non contournée et tableau « Adalar » du barème İBB dont les libellés de lignes ne survivent pas à
  l'extraction du PDF (Büyükada). `priceStatus: 'unknown'` plutôt qu'un chiffre deviné.
- Le contrôle des rives, dans le générateur de ports, a arrêté deux erreurs avant qu'elles n'entrent dans les données :
  le seul lieu publié sur Büyükada s'appelle **Adalar** (le « Büyükada » des données est un homonyme de la mer Noire,
  à 761 km), et **Caticlan est sur `panay`, pas sur `luzon`** — la liaison aurait relié Boracay à la mauvaise rive.
- Uturoa ⇔ Taha'a annonçait 10 km pour 14,2 km mesurés, et une route déjà publiée (Gladstone ⇔ Curtis Island)
  avait été modifiée par erreur : un script de correction remplaçait la **première** occurrence d'un motif
  présent deux fois. Les deux valeurs sont rétablies d'après les coordonnées publiées.
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
- **232 masses terrestres nommées n'ont aucune liaison modélisée** — Wallis, Futuna, Corvo, Tristan da
  Cunha, Maupiti, Hœdic, l'Île-de-Sein. Méthode, écrite : on range chaque lieu publié par
  `landmassOf`, on écarte les masses synthétiques (règles `'*'`, une par lieu, isolées par construction), et on
  garde les clés nommées qui n'apparaissent dans aucune clé de `FERRY_ROUTES` ni de `SEA_CROSSINGS`.
  **Toutes ne sont pas des impasses**, et le compte est désormais fait (24/09/2026, sonde en direct dans le
  moteur, sans HTTP donc sans quota — trois départs × trois durées × trois tirages par masse) :
  - **174 rendent un trajet** de l'intérieur — Sri Lanka (17 740 lieux publiés), la Jamaïque (3 199) se visitent
    très bien sans jamais embarquer. Le message « réessayez, ou élargissez le rayon » y est juste.
  - **16 sont refusées au départ par la règle des zones à tension** (Kamtchatka, Norilsk, Tchoukotka, Socotra,
    Île de la Tortue, Idjwi…), et non faute de liaison. Elles reçoivent déjà leur propre message, traduit dans les
    161 langues : « Aucune étape possible hors des zones déconseillées autour de ce point de départ : décochez
    "Exclure les zones déconseillées" pour les inclure. » Le conseil a été VÉRIFIÉ le 24/09/2026 sur les seize :
    filtre décoché, **les 27 tirages de chacune rendent un trajet**. Rien à corriger — la première rédaction de
    cette ligne annonçait un message trompeur, déduit d'un tirage vide sans lire la branche cliente qui traite
    déjà `tensionBlocked` (`public/js/app.js:4589`).
  - **42 sont de vraies impasses** : 95 lieux publiés, 68 792 habitants — Wallis, Futuna, Maupiti, Tristan da
    Cunha, Fernando de Noronha, Ilulissat, Utqiagvik, Batanes, cinq atolls de Tuvalu, Corvo ou Hœdic à un seul
    lieu. Là, et là seulement, « réessayez, ou élargissez le rayon » est FAUX : rien ne marchera jamais.
  La mesure du 23/09/2026 (184 masses, 386 lieux) avait été écrite sans sa méthode ; celle tentée le même jour
  par l'API a été faussée par la limitation de débit, qui répond 429 et fait passer pour mortes des masses
  jamais interrogées. Les deux sont remplacées par celle-ci.
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
